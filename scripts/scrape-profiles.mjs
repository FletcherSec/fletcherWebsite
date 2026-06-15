#!/usr/bin/env node
/**
 * scrape-profiles.mjs — "recreate the API" for TryHackMe + Hack The Box.
 *
 * Neither THM nor HTB expose a clean public, key-free JSON API for a profile.
 * Their public profile pages are single-page apps that fetch their own internal
 * JSON endpoints in the browser. So we drive a real headless browser with
 * Playwright, let the SPA make its own authenticated-by-cookie/public calls,
 * and capture the JSON responses as they fly by. We then distill the bits we
 * care about into src/data/profiles.json, which the site renders at build time.
 *
 * Usage:
 *   node scripts/scrape-profiles.mjs            # scrape both, write the data file
 *   node scripts/scrape-profiles.mjs --debug    # also dump every captured JSON
 *
 * Re-run whenever you want to refresh the numbers. If the scrape fails (network,
 * markup change, rate-limit), the existing src/data/profiles.json is left
 * untouched so the site keeps building with the last-known-good snapshot.
 */
import { chromium } from 'playwright';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/data/profiles.json');
const ASSET_DIR = resolve(__dirname, '../public/profiles'); // served at /profiles/*
const DEBUG = process.argv.includes('--debug');

/**
 * Download a remote asset into public/profiles/ so the site is self-contained
 * (no hotlinking gravatar/S3 at runtime). Returns the site-absolute path, or
 * undefined if the fetch fails (caller then keeps the previous value).
 */
async function saveAsset(url, name) {
  if (!url) return undefined;
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    mkdirSync(ASSET_DIR, { recursive: true });
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(resolve(ASSET_DIR, name), buf);
    return `/profiles/${name}`;
  } catch {
    return undefined;
  }
}

const THM_USER = 'fletched';
const HTB_ID = '019d01a2-fe18-71a5-a7a7-b0a37312b859';
const HTB_USER_ID = '1639899'; // numeric id for the authed v4 API
const THM_URL = `https://tryhackme.com/p/${THM_USER}`;
const HTB_URL = `https://profile.hackthebox.com/profile/${HTB_ID}`; // scraped (SPA exposes the experience API)
const HTB_PROFILE_URL = `https://app.hackthebox.com/users/${HTB_USER_ID}`; // public-facing link shown on the site
// Optional: set HTB_TOKEN (HTB → Settings → App Tokens) to enrich the HTB card
// with real machine owns + global ranking. Without it we fall back to the
// public "experience" data (level/XP/streak) only.
const HTB_TOKEN = process.env.HTB_TOKEN;

/**
 * Drive a page, collect JSON response bodies whose URL matches `keep`.
 * Returns a map of url -> parsed body (last write wins for duplicate calls).
 */
async function collectJson(page, url, keep) {
  const captured = {};
  page.on('response', async (res) => {
    const ct = res.headers()['content-type'] || '';
    if (!ct.includes('application/json') || !keep.test(res.url())) return;
    try {
      captured[res.url()] = await res.json();
    } catch {
      /* non-JSON or already consumed — ignore */
    }
  });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000); // let late XHRs resolve
  return captured;
}

const find = (caps, re) => Object.entries(caps).find(([u]) => re.test(u))?.[1];

async function scrapeTHM(browser) {
  const page = await browser.newPage();
  const caps = await collectJson(page, THM_URL, /public-profile|users\/badges/);
  if (DEBUG) Object.keys(caps).forEach((u) => console.log('[THM]', u));
  await page.close();

  const p = find(caps, /public-profile\?/)?.data;
  if (!p) return undefined;
  const avatar = (await saveAsset(p.avatar, 'thm-avatar.png')) ?? p.avatar;
  return clean({
    handle: p.username ?? THM_USER,
    url: THM_URL,
    level: p.level,
    points: p.totalPoints,
    rooms: p.completedRoomsNumber,
    badges: p.badgesNumber,
    streak: p.streak,
    rank: Number.isFinite(p.rank) ? `#${p.rank.toLocaleString('en-US')}` : undefined,
    topPercent: Number.isFinite(p.topPercentage) ? `Top ${p.topPercentage}%` : undefined,
    league: p.leagueTier, // bronze / silver / gold ...
    avatar, // local /profiles/thm-avatar.png (falls back to remote gravatar)
  });
}

async function scrapeHTB(browser) {
  const page = await browser.newPage();
  // The public profile SPA fetches its rank/XP from the "experience" service.
  const caps = await collectJson(page, HTB_URL, /experience\/v1\/account/);
  if (DEBUG) Object.keys(caps).forEach((u) => console.log('[HTB]', u));
  await page.close();

  const x = find(caps, /experience\/v1\/account/);
  if (!x) return undefined;
  const rankIcon = (await saveAsset(x.rankImage, 'htb-rank.svg')) ?? x.rankImage;

  // With a token, enrich with the real machine owns + global ranking from the
  // authed v4 user-profile API (these aren't exposed on the public profile).
  let owns = {};
  if (HTB_TOKEN) {
    try {
      const res = await fetch(`https://labs.hackthebox.com/api/v4/user/profile/basic/${HTB_USER_ID}`, {
        headers: { Authorization: `Bearer ${HTB_TOKEN}`, Accept: 'application/json' },
      });
      if (res.ok) {
        const p = (await res.json()).profile ?? {};
        owns = {
          handle: p.name,
          userOwns: p.user_owns, // machines with the user flag
          systemOwns: p.system_owns, // machines rooted
          globalRanking: Number.isFinite(p.ranking) ? `#${p.ranking.toLocaleString('en-US')}` : undefined,
          classicRank: p.rank, // Noob / Script Kiddie / Hacker / Pro Hacker / ...
          respects: p.respects,
        };
      } else {
        console.warn('HTB basic profile: HTTP', res.status);
      }
    } catch (e) {
      console.warn('HTB basic profile failed:', e.message);
    }
  }

  return clean({
    handle: owns.handle ?? 'fletcher',
    url: HTB_PROFILE_URL,
    level: x.level,
    levelTitle: x.levelTitle, // experience rank: ... / Skilled / Pro / Elite / Guru
    xp: x.totalExperiencePoints,
    streakWeeks: x.streakData?.counter, // HTB's experience streak is counted in weeks
    maxStreakWeeks: x.streakData?.maxStreak,
    rankIcon, // local /profiles/htb-rank.svg (falls back to remote S3 SVG)
    userOwns: owns.userOwns,
    systemOwns: owns.systemOwns,
    globalRanking: owns.globalRanking,
    classicRank: owns.classicRank,
    respects: owns.respects,
  });
}

function clean(o) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ''));
}

async function main() {
  const browser = await chromium.launch();
  let thm, htb;
  try {
    thm = await scrapeTHM(browser);
  } catch (e) {
    console.error('THM scrape failed:', e.message);
  }
  try {
    htb = await scrapeHTB(browser);
  } catch (e) {
    console.error('HTB scrape failed:', e.message);
  }
  await browser.close();

  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
  // Merge new-over-old per field so a partial scrape never wipes good data:
  // a run without HTB_TOKEN (no machine owns / global ranking) keeps the last
  // known values for those fields instead of dropping them. A scrape that came
  // back empty (<=2 keys = just handle/url) falls back to the previous snapshot.
  const merge = (next, last) =>
    next && Object.keys(next).length > 2 ? { ...last, ...next } : last;
  const out = {
    tryhackme: merge(thm, prev.tryhackme),
    hackthebox: merge(htb, prev.hackthebox),
    scrapedAt: new Date().toISOString().slice(0, 10),
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log('wrote', OUT);
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
