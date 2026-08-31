#!/usr/bin/env node
/**
 * scrape-profiles.mjs — pull TryHackMe + Hack The Box profile numbers into
 * src/data/profiles.json, which the site renders at build time.
 *
 * History: this used to drive a headless Playwright browser and capture the
 * SPAs' own XHRs. That broke — TryHackMe now sits behind a Vercel bot
 * challenge and Hack The Box's profile SPA is auth-gated — so a headless,
 * logged-out browser on a CI runner captured nothing and the data silently
 * froze while the daily job kept committing a `scrapedAt` bump. We now call
 * the JSON endpoints directly with browser-ish headers instead:
 *
 *   TryHackMe : GET tryhackme.com/api/v2/public-profile?username=<user>
 *               -> public, returns level/points/rooms/badges/streak/rank/%
 *   Hack The Box (owns + ranks):
 *               GET labs.hackthebox.com/api/v4/profile/<numericId>
 *               -> public, returns name/user_owns/system_owns/rank/ranking/…
 *   Hack The Box (XP / level / weekly streak):
 *               only served to the logged-in user for themselves. Set
 *               HTB_SESSION to the `hackthebox_session` cookie value to fetch
 *               it; without it those fields keep their last-known values.
 *
 * Usage:
 *   node scripts/scrape-profiles.mjs            # refresh, write the data file
 *   node scripts/scrape-profiles.mjs --debug    # also dump every raw payload
 *
 * On failure: a side that returns nothing fresh keeps its last-known values
 * (logged as ::warning::). If BOTH THM and HTB core come back empty, the file
 * is left byte-identical (no hollow commit) and the process exits 1 so the
 * GitHub Actions run goes red.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/data/profiles.json');
const ASSET_DIR = resolve(__dirname, '../public/profiles'); // served at /profiles/*
const DEBUG = process.argv.includes('--debug');

const THM_USER = 'fletched';
const HTB_ID = '019d01a2-fe18-71a5-a7a7-b0a37312b859'; // account uuid (profile.hackthebox.com)
const HTB_USER_ID = '1639899'; // numeric id for the v4 API
const THM_URL = `https://tryhackme.com/p/${THM_USER}`;
const HTB_PROFILE_URL = `https://app.hackthebox.com/users/${HTB_USER_ID}`; // shown on the site

// Optional. HTB_SESSION = the `hackthebox_session` cookie from a logged-in
// browser (DevTools > Application > Cookies > https://profile.hackthebox.com).
// Only used to read the XP / level / weekly-streak fields, which HTB serves
// only to the authenticated user. Expires every few weeks — refresh when the
// XP numbers stop moving.
const HTB_SESSION = process.env.HTB_SESSION;
// Optional legacy: an HTB App Token still works as a fallback source for the
// owns + ranking numbers via the authed v4 endpoint.
const HTB_TOKEN = process.env.HTB_TOKEN;

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
    level: p.level,
    points: p.totalPoints,
    rooms: p.completedRoomsNumber,
    badges: p.badgesNumber,
    streak: p.streak,
    rank: Number.isFinite(p.rank) ? `#${p.rank.toLocaleString('en-US')}` : undefined,
    topPercent: Number.isFinite(p.topPercentage) ? `Top ${p.topPercentage}%` : undefined,
    avatar,
  });
}

async function scrapeHTB() {
  // 1) public: owns + classic rank + global ranking + respects.
  const pub = (await getJson(`https://labs.hackthebox.com/api/v4/profile/${HTB_USER_ID}`))?.profile;

  // 1b) fallback for the same fields via the authed v4 endpoint, if a token is set
  //     and the public call came back empty.
  let basic;
  if (!pub && HTB_TOKEN) {
    basic = (
      await getJson(`https://labs.hackthebox.com/api/v4/user/profile/basic/${HTB_USER_ID}`, {
        headers: { Authorization: `Bearer ${HTB_TOKEN}` },
      })
    )?.profile;
  }
  const core = pub ?? basic;

  // 2) XP / level / weekly streak — only readable while logged in as this user.
  let xp;
  if (HTB_SESSION) {
    const me = await getJson('https://profile.hackthebox.com/api/v1/user', {
      referer: `https://profile.hackthebox.com/profile/${HTB_ID}`,
      headers: { Cookie: `hackthebox_session=${HTB_SESSION}` },
    });
    // be liberal about field names — log the raw body with --debug to adjust.
    const d = me?.data ?? me?.user ?? me ?? {};
    const streak = d.streakData ?? d.streak ?? {};
    xp = clean({
      level: d.level ?? d.experienceLevel,
      levelTitle: d.levelTitle ?? d.experienceLevelTitle ?? d.title,
      xp: d.totalExperiencePoints ?? d.experiencePoints ?? d.xp,
      streakWeeks: streak.counter ?? streak.current ?? d.currentStreak,
      maxStreakWeeks: streak.maxStreak ?? streak.max ?? d.maxStreak,
      rankImage: d.rankImage ?? d.levelImage,
    });
    if (!xp.level && !xp.xp) {
      console.warn('::warning::HTB: session set but no XP fields recognised — run with --debug and adjust mapping');
      xp = undefined;
    }
  } else {
    console.warn('::warning::HTB_SESSION not set — XP / level / weekly streak keep their last-known values');
  }

  if (!core && !xp) {
    console.warn('::warning::HTB: nothing fetched — kept last-known');
    return undefined;
  }

  const rankIcon = xp?.rankImage ? ((await saveAsset(xp.rankImage, 'htb-rank.svg')) ?? xp.rankImage) : undefined;

  return clean({
    handle: core?.name ?? 'fletched',
    url: HTB_PROFILE_URL,
    level: xp?.level,
    levelTitle: xp?.levelTitle,
    xp: xp?.xp,
    streakWeeks: xp?.streakWeeks,
    maxStreakWeeks: xp?.maxStreakWeeks,
    rankIcon,
    userOwns: core?.user_owns,
    systemOwns: core?.system_owns,
    globalRanking: Number.isFinite(core?.ranking) ? `#${core.ranking.toLocaleString('en-US')}` : undefined,
    classicRank: core?.rank, // Noob / Script Kiddie / Hacker / Pro Hacker / …
    respects: core?.respects,
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
  // A scrape "counts" only if it returned more than just handle/url.
  const fresh = (next) => !!next && Object.keys(next).length > 2;
  // Merge new-over-old per field so a partial refresh never wipes good data
  // (e.g. no HTB_SESSION -> XP fields fall through to the last-known values).
  const merge = (next, last) => (fresh(next) ? { ...last, ...next } : last);

  const thmOk = fresh(thm);
  const htbOk = fresh(htb);

  const out = {
    tryhackme: merge(thm, prev.tryhackme),
    hackthebox: merge(htb, prev.hackthebox),
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
