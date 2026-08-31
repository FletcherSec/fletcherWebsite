#!/usr/bin/env node
/**
 * scrape-profiles.mjs — pull TryHackMe + Hack The Box profile numbers into
 * src/data/profiles.json, which the site renders at build time.
 *
 * History: this used to drive a headless Playwright browser and capture the
 * profile SPAs' own XHRs. That broke — TryHackMe went behind a Vercel bot
 * challenge and Hack The Box's "advanced profile" service is auth-gated — so a
 * headless, logged-out browser on a CI runner captured nothing and the numbers
 * silently froze while the daily job kept committing a `scrapedAt` bump. We now
 * hit the public JSON endpoints directly with browser-ish headers:
 *
 *   TryHackMe : GET tryhackme.com/api/v2/public-profile?username=<user>
 *               -> public; level / points / rooms / badges / streak / rank / %
 *   Hack The Box : GET labs.hackthebox.com/api/v4/profile/<numericId>
 *               -> public; handle / owns / classic rank + progress / ranking
 *
 * Note: HTB's XP-system numbers (experience level, total XP, weekly streak) are
 * only served to the logged-in user for themselves, behind a session cookie
 * that rotates every few days, so they can't be refreshed unattended. The card
 * uses the classic rank + rank progress instead.
 *
 * Usage:
 *   node scripts/scrape-profiles.mjs            # refresh, write the data file
 *   node scripts/scrape-profiles.mjs --debug    # also dump every raw payload
 *
 * On failure: a side that returns nothing keeps its last-known values (logged
 * as ::warning::). If BOTH sides come back empty, profiles.json is left
 * byte-identical (no hollow commit) and the process exits 1 so the GitHub
 * Actions run goes red.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/data/profiles.json');
const ASSET_DIR = resolve(__dirname, '../public/profiles'); // served at /profiles/*
const DEBUG = process.argv.includes('--debug');

const THM_USER = 'fletched';
const HTB_USER_ID = '1639899';
const THM_URL = `https://tryhackme.com/p/${THM_USER}`;
const HTB_PROFILE_URL = `https://app.hackthebox.com/users/${HTB_USER_ID}`; // link shown on the site

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

/**
 * GET a JSON endpoint with browser-ish headers. Returns the parsed body, or
 * undefined if the request failed / got a bot-challenge HTML page back. One
 * retry after a short pause (these hosts rate-limit bursts into a challenge).
 */
async function getJson(url, { headers = {}, referer } = {}) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(20000),
        redirect: 'follow',
        headers: {
          'User-Agent': UA,
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'sec-ch-ua': '"Chromium";v="128", "Not(A:Brand";v="24", "Google Chrome";v="128"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          ...(referer ? { Referer: referer } : {}),
          ...headers,
        },
      });
      const text = await res.text();
      const ct = res.headers.get('content-type') || '';
      if (!res.ok) {
        console.warn(`GET ${url} -> HTTP ${res.status}`);
      } else if (!ct.includes('json') && text.trimStart().startsWith('<')) {
        console.warn(`GET ${url} -> HTML (bot challenge / rate limit), not JSON`);
      } else {
        const body = JSON.parse(text);
        if (DEBUG) console.log(`[debug] ${url}\n${JSON.stringify(body, null, 2)}`);
        return body;
      }
    } catch (e) {
      console.warn(`GET ${url} failed:`, e.message);
    }
    if (attempt === 1) await new Promise((r) => setTimeout(r, 6000));
  }
  return undefined;
}

/**
 * Download a remote asset into public/profiles/ so the site is self-contained.
 * Returns the site-absolute path, or undefined (caller keeps the previous value).
 */
async function saveAsset(url, name) {
  if (!url) return undefined;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return undefined;
    mkdirSync(ASSET_DIR, { recursive: true });
    writeFileSync(resolve(ASSET_DIR, name), Buffer.from(await res.arrayBuffer()));
    return `/profiles/${name}`;
  } catch {
    return undefined;
  }
}

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ''));
const num = (n) => (Number.isFinite(n) ? n : undefined);

async function scrapeTHM() {
  const body = await getJson(`https://tryhackme.com/api/v2/public-profile?username=${THM_USER}`, {
    referer: THM_URL,
  });
  const p = body?.data;
  if (!p || p.username == null) {
    console.warn('::warning::THM: no public-profile data (Vercel challenge or endpoint change) — kept last-known');
    return undefined;
  }
  const avatar = (await saveAsset(p.avatar, 'thm-avatar.png')) ?? p.avatar;
  return clean({
    handle: p.username ?? THM_USER,
    url: THM_URL,
    level: num(p.level),
    points: num(p.totalPoints),
    rooms: num(p.completedRoomsNumber),
    badges: num(p.badgesNumber),
    streak: num(p.streak),
    rank: num(p.rank) != null ? `#${p.rank.toLocaleString('en-US')}` : undefined,
    topPercent: num(p.topPercentage) != null ? `Top ${p.topPercentage}%` : undefined,
    avatar,
  });
}

async function scrapeHTB() {
  const p = (await getJson(`https://labs.hackthebox.com/api/v4/profile/${HTB_USER_ID}`))?.profile;
  if (!p || p.name == null) {
    console.warn('::warning::HTB: no profile data from the public v4 endpoint — kept last-known');
    return undefined;
  }
  return clean({
    handle: p.name,
    url: HTB_PROFILE_URL,
    classicRank: p.rank, // Noob / Script Kiddie / Hacker / Pro Hacker / Elite / Guru / Omniscient
    rankProgress: num(p.current_rank_progress), // % toward the next classic rank
    nextRank: p.next_rank,
    userOwns: num(p.user_owns), // machines with the user flag
    systemOwns: num(p.system_owns), // machines rooted
    globalRanking: num(p.ranking) != null ? `#${p.ranking.toLocaleString('en-US')}` : undefined,
    respects: num(p.respects),
  });
}

async function main() {
  let thm, htb;
  try {
    thm = await scrapeTHM();
  } catch (e) {
    console.error('THM scrape failed:', e.message);
  }
  try {
    htb = await scrapeHTB();
  } catch (e) {
    console.error('HTB scrape failed:', e.message);
  }

  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
  const fresh = (next) => !!next && Object.keys(next).length > 2;
  // Replace, don't merge: each endpoint returns its whole field set, so a fresh
  // result fully supersedes the last one (and drops fields we've stopped using).
  const pick = (next, last) => (fresh(next) ? next : last);

  const thmOk = fresh(thm);
  const htbOk = fresh(htb);

  const out = {
    tryhackme: pick(thm, prev.tryhackme),
    hackthebox: pick(htb, prev.hackthebox),
    // Only advance the date when something actually refreshed, so a fully
    // blocked run leaves the file identical and produces no commit.
    scrapedAt: thmOk || htbOk ? new Date().toISOString().slice(0, 10) : (prev.scrapedAt ?? null),
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log('wrote', OUT);
  console.log(JSON.stringify(out, null, 2));

  if (!thmOk && !htbOk) {
    console.error('::error::neither THM nor HTB returned fresh data — profiles.json left unchanged');
    process.exit(1);
  }
  if (!thmOk) console.warn('::warning::THM not refreshed this run');
  if (!htbOk) console.warn('::warning::HTB not refreshed this run');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
