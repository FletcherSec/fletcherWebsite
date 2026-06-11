#!/usr/bin/env node
/**
 * scrape-linkedin.mjs — pull the 3 most recent LinkedIn activity posts into
 * src/data/linkedin.json, which <LinkedInFeed /> renders at build time.
 *
 * LinkedIn has NO public API or RSS for personal profile posts (the official
 * API is OAuth/partner-gated). Sources, in priority order:
 *
 *   1. LINKEDIN_RSS_URL — an RSS bridge feed for your profile (e.g. create
 *      one at https://rss.app/rss-feed/linkedin from your public profile URL,
 *      or any self-hosted bridge). We fetch + parse it directly.
 *
 *   2. LI_AT — your own LinkedIn session cookie (DevTools → Application →
 *      Cookies → li_at on linkedin.com). We drive a headless browser to your
 *      /recent-activity/ page, exactly like scrape-profiles.mjs does for
 *      HTB/THM, and capture the voyager JSON the SPA fetches for itself.
 *      Only use your own cookie on your own profile.
 *
 *   3. (default, no config) GUEST VIEW — the logged-out public profile shows
 *      the latest activity posts. We browse to it headlessly and parse the
 *      activity cards. CAVEAT: LinkedIn rations guest views per IP and blocks
 *      ones it suspects are bots, so this works *sometimes* — on an authwall
 *      we keep the last-known-good snapshot and you can simply retry later.
 *      (There's also scripts/linkedin-grab.console.js to pull the posts from
 *      your own browser, where the guest view always renders.)
 *
 * Env vars can live in .env (gitignored — see .env.example). Re-run whenever
 * you post. If the source fails, the existing linkedin.json is left untouched
 * so the site keeps building with the last-known-good posts.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/data/linkedin.json');
const DEBUG = process.argv.includes('--debug');

// read .env (KEY=value) so the feed URL / cookie only has to be pasted once —
// see .env.example. Real env vars still win over the file.
const ENV_FILE = resolve(__dirname, '../.env');
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2');
  }
}

const PROFILE = 'james-weaver-cs';
const PROFILE_URL = `https://www.linkedin.com/in/${PROFILE}/`;
const ACTIVITY_URL = `https://www.linkedin.com/in/${PROFILE}/recent-activity/all/`;
const RSS_URL = process.env.LINKEDIN_RSS_URL;
const LI_AT = process.env.LI_AT ?? process.env.LINKEDIN_LI_AT;
const KEEP = 3;
const MAX_TEXT = 240; // card blurb length; full post is one click away

// ---------------------------------------------------------------- helpers --

const decodeEntities = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');

const stripHtml = (s) => decodeEntities(s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

const truncate = (s) => (s.length <= MAX_TEXT ? s : s.slice(0, MAX_TEXT).replace(/\s+\S*$/, '') + ' …');

const isoDate = (d) => (Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10));

// ------------------------------------------------------------- source: RSS --

/** Minimal RSS 2.0 / Atom parser — enough for bridge feeds, no dependency. */
function parseFeed(xml) {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/g) ?? [];
  const tag = (block, name) => {
    const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
    if (!m) return undefined;
    return m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1').trim();
  };
  const attrLink = (block) => block.match(/<link[^>]*href="([^"]+)"/i)?.[1]; // Atom-style <link href=.../>
  return blocks.map((b) => {
    const text = stripHtml(tag(b, 'description') ?? tag(b, 'content') ?? tag(b, 'summary') ?? tag(b, 'title') ?? '');
    const url = tag(b, 'link') || attrLink(b) || tag(b, 'guid');
    const when = tag(b, 'pubDate') ?? tag(b, 'published') ?? tag(b, 'updated') ?? tag(b, 'dc:date');
    return { text, url, date: when ? isoDate(new Date(when)) : undefined, ts: when ? Date.parse(when) : 0 };
  });
}

async function fromRss() {
  const res = await fetch(RSS_URL, { headers: { 'User-Agent': 'jweaver-portfolio feed sync' } });
  if (!res.ok) throw new Error(`feed fetch: HTTP ${res.status}`);
  const items = parseFeed(await res.text())
    .filter((p) => p.text && p.url)
    .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
    .slice(0, KEEP);
  return items.map(({ text, url, date }) => ({ date: date ?? 'recent', text: truncate(text), url }));
}

// --------------------------------------------------- source: voyager scrape --

/**
 * LinkedIn post/activity ids embed their creation time: the first 41 bits of
 * the numeric id are unix epoch milliseconds.
 */
function dateFromActivityId(id) {
  const ms = parseInt(BigInt(id).toString(2).slice(0, 41), 2);
  return isoDate(new Date(ms));
}

/**
 * Walk any captured voyager JSON and collect { activityId -> post text }.
 * The exact GraphQL shape shifts, but a post is always an object carrying a
 * `commentary` text near an `urn:li:activity:<id>` — match on that instead of
 * a brittle response schema.
 */
function harvestPosts(node, out) {
  if (!node || typeof node !== 'object') return;
  const text = node.commentary?.text?.text ?? (typeof node.commentary?.text === 'string' ? node.commentary.text : undefined);
  if (typeof text === 'string' && text.trim()) {
    const id = JSON.stringify(node).match(/urn:li:activity:(\d+)/)?.[1];
    if (id && !out.has(id)) out.set(id, text.trim());
  }
  for (const v of Object.values(node)) harvestPosts(v, out);
}

async function fromVoyager() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext();
    await ctx.addCookies([{ name: 'li_at', value: LI_AT, domain: '.www.linkedin.com', path: '/', httpOnly: true, secure: true }]);
    const page = await ctx.newPage();

    const captured = [];
    page.on('response', async (res) => {
      const ct = res.headers()['content-type'] || '';
      if (!ct.includes('json') || !/voyager\/api/.test(res.url())) return;
      try {
        captured.push(await res.json());
        if (DEBUG) console.log('[voyager]', res.url().slice(0, 120));
      } catch {
        /* non-JSON or already consumed — ignore */
      }
    });
    await page.goto(ACTIVITY_URL, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(3000); // let late XHRs resolve

    if (/authwall|login|checkpoint/.test(page.url())) {
      throw new Error(`redirected to ${page.url()} — li_at cookie expired or rejected`);
    }

    const found = new Map();
    captured.forEach((c) => harvestPosts(c, found));
    return [...found.entries()]
      .sort(([a], [b]) => (BigInt(a) < BigInt(b) ? 1 : -1)) // newest first: ids are time-ordered
      .slice(0, KEEP)
      .map(([id, text]) => ({
        date: dateFromActivityId(id) ?? 'recent',
        text: truncate(text.replace(/\s+/g, ' ')),
        url: `https://www.linkedin.com/feed/update/urn:li:activity:${id}/`,
      }));
  } finally {
    await browser.close();
  }
}

// ----------------------------------------------- source: guest (no login) --

/**
 * The logged-out public profile renders an "Activity" section whose cards link
 * to /posts/…-activity-<id>-…. No credentials needed, but LinkedIn rations
 * guest views per IP/fingerprint — an authwall here is throttling, not an
 * error in this script; retry later or use one of the other sources.
 */
async function fromGuest() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  try {
    const ctx = await browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 850 },
      locale: 'en-US',
      timezoneId: 'America/Chicago',
    });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    const page = await ctx.newPage();
    // land on the homepage first to pick up guest cookies — going straight to
    // the profile authwalls far more often
    await page.goto('https://www.linkedin.com/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);
    if (/authwall|checkpoint|signup|login/.test(page.url())) {
      throw new Error('authwalled — LinkedIn is rationing guest views from this IP; retry later or set LINKEDIN_RSS_URL / LI_AT in .env');
    }

    // a card holds several text nodes (author name, headline, timestamp, post
    // body) — the post body is reliably the LONGEST candidate, so rank by length
    const anchors = await page.$$eval('a[href*="-activity-"]', (as) =>
      as.map((a) => {
        const card = a.closest('li, article') ?? a;
        const candidates = [
          ...card.querySelectorAll('.update-components-text, .feed-shared-update-v2__description, .attributed-text-segment-list__content, p, h3, span[dir]'),
          a,
        ].map((el) => (el.textContent || '').replace(/\s+/g, ' ').replace(/…?\s*(see more|show more).*$/i, '').trim());
        return { href: a.href, text: candidates.sort((x, y) => y.length - x.length)[0] || '' };
      })
    );
    const seen = new Map(); // id -> longest text seen for that post
    for (const { href, text } of anchors) {
      const id = href.match(/-activity-(\d+)/)?.[1];
      if (!id) continue;
      if (!seen.has(id) || text.length > seen.get(id).length) seen.set(id, text);
    }
    if (!seen.size) throw new Error('guest profile rendered but no activity cards found — markup may have changed (run with --debug ideas: dump page.content())');
    return [...seen.entries()]
      .sort(([a], [b]) => (BigInt(a) < BigInt(b) ? 1 : -1)) // newest first: ids are time-ordered
      .slice(0, KEEP)
      .map(([id, text]) => ({
        date: dateFromActivityId(id) ?? 'recent',
        text: truncate(text || 'view post'),
        url: `https://www.linkedin.com/feed/update/urn:li:activity:${id}/`,
      }));
  } finally {
    await browser.close();
  }
}

// ------------------------------------------------------------------- main --

async function main() {
  let posts = [];
  let source;
  try {
    if (RSS_URL) {
      source = 'rss';
      posts = await fromRss();
    } else if (LI_AT) {
      source = 'voyager';
      posts = await fromVoyager();
    } else {
      source = 'guest';
      posts = await fromGuest();
    }
  } catch (e) {
    console.error(`LinkedIn scrape via ${source} failed:`, e.message);
    posts = [];
  }

  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
  if (!posts.length) {
    if (prev.posts?.length) {
      console.log('Keeping last-known-good posts from', prev.scrapedAt ?? 'a previous run');
      return;
    }
    console.log('No posts captured and no previous snapshot — the site falls back to linkedinPosts in src/data/site.ts.');
    if (!existsSync(OUT)) writeFileSync(OUT, JSON.stringify({ posts: [] }, null, 2) + '\n');
    return;
  }

  const out = { posts, source, scrapedAt: new Date().toISOString().slice(0, 10) };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log('wrote', OUT);
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
