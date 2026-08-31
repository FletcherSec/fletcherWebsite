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
 *   node scripts/scrape-profiles.mjs --debug    # also log EVERY JSON endpoint
 *                                               # the two profile pages call
 *
 * Behaviour on failure:
 *   - A partial scrape (e.g. THM ok, HTB blocked) keeps the last-known values
 *     for the missing side and still writes the file — but logs a ::warning::.
 *   - If BOTH sides come back with nothing fresh, profiles.json is left byte
 *     for byte unchanged (not even the date bumps, so no hollow commit) and
 *     the process exits 1 so the GitHub Actions run goes red instead of
 *     silently "succeeding" with stale numbers.
 */
import { chromium } from 'playwright';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/data/profiles.json');
const ASSET_DIR = resolve(__dirname, '../public/profiles'); // served at /profiles/*
const DEBUG = process.argv.includes('--debug');

// A real desktop Chrome UA + a full browser context (locale, timezone,
// viewport). Cloudflare in front of THM/HTB is quick to challenge a bare
// headless browser coming from a datacenter IP; looking like a normal client
// gets us the SPA instead of a "Just a moment…" interstitial more often.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

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
 *
 * We wait for `domcontentloaded` (not `networkidle` — a Cloudflare challenge or
 * a chatty SPA can keep the network busy forever), then explicitly wait for the
 * endpoint we actually want, then give sibling XHRs a short grace period. One
 * retry, because the first hit sometimes only gets the CF challenge.
 */
async function collectJson(page, url, keep) {
  const captured = {};
  const seenJson = [];
  page.on('response', async (res) => {
    const u = res.url();
    const ct = res.headers()['content-type'] || '';
    const looksJson = ct.includes('json') || /\.json(\?|$)/.test(u);
    if (DEBUG && looksJson) seenJson.push(`${res.status()} ${u}`);
    if (!keep.test(u)) return;
    try {
      // don't gate on content-type — some of these endpoints mislabel the body
      captured[u] = await res.json();
    } catch {
      /* non-JSON or already consumed — ignore */
    }
  });

  for (let attempt = 1; attempt <= 2; attempt++) {
    await page
      .goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
      .catch((e) => console.warn(`goto ${url} (attempt ${attempt}) failed:`, e.message));
    if (!Object.keys(captured).length) {
      await page.waitForResponse((r) => keep.test(r.url()), { timeout: 15000 }).catch(() => {});
    }
    await page.waitForTimeout(2500); // let sibling XHRs resolve
    if (Object.keys(captured).length) break;
    if (attempt === 1) console.warn(`no matching JSON from ${url} yet — retrying once`);
  }

  if (DEBUG) {
    console.log(`[debug] JSON responses seen at ${url}:`);
    seenJson.forEach((s) => console.log('  ', s));
  }
  console.log(`captured ${Object.keys(captured).length} matching JSON payload(s) from ${url}`);
  return captured;
}

const find = (caps, re) => Object.entries(caps).find(([u]) => re.test(u))?.[1];

async function scrapeTHM(ctx) {
  const page = await ctx.newPage();
  const caps = await collectJson(page, THM_URL, /public-profile|users\/badges/);
  if (DEBUG) Object.keys(caps).forEach((u) => console.log('[THM]', u));
  await page.close();

  const p = find(caps, /public-profile\??/)?.data;
  if (!p) {
    console.warn('THM: no public-profile payload captured (page blocked or endpoint changed)');
    return undefined;
  }
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

async function scrapeHTB(ctx) {
  const page = await ctx.newPage();
  // The public profile SPA fetches its rank/XP from the "experience" service.
  const caps = await collectJson(page, HTB_URL, /experience\/v1\/account/);
  if (DEBUG) Object.keys(caps).forEach((u) => console.log('[HTB]', u));
  await page.close();

  const x = find(caps, /experience\/v1\/account/);
  if (!x) {
    console.warn('HTB: no experience/v1/account payload captured (page blocked or endpoint changed)');
    return undefined;
  }
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
        console.warn(`::warning::HTB basic profile: HTTP ${res.status} (token expired? owns/ranking kept stale)`);
      }
    } catch (e) {
      console.warn('::warning::HTB basic profile failed:', e.message);
    }
  } else {
    console.warn('HTB_TOKEN not set — machine owns + global ranking will keep their last-known values');
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
  const browser = await chromium.launch({
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const ctx = await browser.newContext({
    userAgent: UA,
    locale: 'en-US',
    timezoneId: 'Europe/London',
    viewport: { width: 1280, height: 800 },
  });

  let thm, htb;
  try {
    thm = await scrapeTHM(ctx);
  } catch (e) {
    console.error('THM scrape failed:', e.message);
  }
  try {
    htb = await scrapeHTB(ctx);
  } catch (e) {
    console.error('HTB scrape failed:', e.message);
  }
  await ctx.close();
  await browser.close();

  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
  // A scrape "succeeded" only if it came back with more than just handle/url.
  const fresh = (next) => !!next && Object.keys(next).length > 2;
  // Merge new-over-old per field so a partial scrape never wipes good data:
  // a run without HTB_TOKEN (no machine owns / global ranking) keeps the last
  // known values for those fields instead of dropping them.
  const merge = (next, last) => (fresh(next) ? { ...last, ...next } : last);

  const thmOk = fresh(thm);
  const htbOk = fresh(htb);

  const out = {
    tryhackme: merge(thm, prev.tryhackme),
    hackthebox: merge(htb, prev.hackthebox),
    // Only advance the date when at least one side actually refreshed. A fully
    // blocked run therefore leaves the file identical -> no hollow daily commit.
    scrapedAt: thmOk || htbOk ? new Date().toISOString().slice(0, 10) : (prev.scrapedAt ?? null),
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log('wrote', OUT);
  console.log(JSON.stringify(out, null, 2));

  if (!thmOk && !htbOk) {
    console.error(
      '::error::both THM and HTB scrapes returned no fresh data — profiles.json left unchanged. ' +
        'Re-run with --debug to see which JSON endpoints the pages actually call.',
    );
    process.exit(1);
  }
  if (!thmOk) console.warn('::warning::THM scrape returned no fresh data — kept last-known values');
  if (!htbOk) console.warn('::warning::HTB scrape returned no fresh data — kept last-known values');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
