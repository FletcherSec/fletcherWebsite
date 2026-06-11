// linkedin-grab.console.js — pull your 3 newest activity posts out of YOUR
// browser, where the profile always renders (logged in or out — no cookie or
// API needed because the page is already in front of you).
//
//   1. Open https://www.linkedin.com/in/james-weaver-cs/ (the Activity section
//      must be visible — or use /recent-activity/all/ when logged in)
//   2. F12 → Console → paste this whole file → Enter
//   3. It prints + copies the JSON — paste it over src/data/linkedin.json
//
// Post dates are exact: the first 41 bits of a LinkedIn activity id are the
// creation time in epoch milliseconds.
(() => {
  const seen = new Map(); // id -> longest text found for that post
  for (const a of document.querySelectorAll('a[href*="-activity-"], [data-urn*="urn:li:activity:"] a, a[href*="urn:li:activity:"]')) {
    const id = ((a.href || '') + (a.closest('[data-urn]')?.dataset.urn || '')).match(/activity[:-](\d{15,})/)?.[1];
    if (!id) continue;
    const card = a.closest('li, article') ?? a;
    // a card holds several text nodes (author name, headline, timestamp, post
    // body) — the post body is reliably the LONGEST candidate, so rank by length
    const candidates = [
      ...card.querySelectorAll('.update-components-text, .feed-shared-update-v2__description, .attributed-text-segment-list__content, p, h3, span[dir]'),
      a,
    ].map((el) => (el.textContent || '').replace(/\s+/g, ' ').replace(/…?\s*(see more|show more).*$/i, '').trim());
    const text = candidates.sort((x, y) => y.length - x.length)[0] || '';
    if (!seen.has(id) || text.length > (seen.get(id) || '').length) seen.set(id, text);
  }
  const posts = [...seen.entries()]
    .sort(([a], [b]) => (BigInt(a) < BigInt(b) ? 1 : -1))
    .slice(0, 3)
    .map(([id, text]) => ({
      date: new Date(parseInt(BigInt(id).toString(2).slice(0, 41), 2)).toISOString().slice(0, 10),
      text: text.slice(0, 240),
      url: `https://www.linkedin.com/feed/update/urn:li:activity:${id}/`,
    }));
  const json = JSON.stringify({ posts, source: 'console', scrapedAt: new Date().toISOString().slice(0, 10) }, null, 2) + '\n';
  console.log(json);
  try { copy(json); console.log('✓ copied to clipboard — paste into src/data/linkedin.json'); }
  catch { console.log('(clipboard copy unavailable — select the JSON above manually)'); }
})();
