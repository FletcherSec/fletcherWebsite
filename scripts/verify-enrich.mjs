#!/usr/bin/env node
/**
 * verify-enrich.mjs — guardrail for the enrich-writeup skill.
 *
 * Enforces the prime directive: enrichment may polish AESTHETICS (frontmatter,
 * code-fence language tags, formatting) and fix typos — but must NOT change the
 * author's code blocks, and must keep the prose substantially intact.
 *
 * Usage:
 *   node scripts/verify-enrich.mjs <original.md> <enriched.md>
 *
 * Exits non-zero (FAIL) when:
 *   - the set of code-block BODIES differs (content inside ``` fences changed)
 *   - required frontmatter is missing/invalid in the enriched file
 * Prints WARNINGS (does not fail) for large prose word-changes — review by eye.
 */
import { readFileSync } from 'node:fs';

const RED = '\x1b[31m', GREEN = '\x1b[32m', YEL = '\x1b[33m', DIM = '\x1b[2m', RST = '\x1b[0m';
const ok = (m) => console.log(`${GREEN}✓${RST} ${m}`);
const warn = (m) => console.log(`${YEL}⚠${RST} ${m}`);
const fail = (m) => console.log(`${RED}✗${RST} ${m}`);

const [, , origPath, enrichPath] = process.argv;
if (!origPath || !enrichPath) {
  console.error('usage: node scripts/verify-enrich.mjs <original.md> <enriched.md>');
  process.exit(2);
}

const original = readFileSync(origPath, 'utf8');
const enriched = readFileSync(enrichPath, 'utf8');

const CATEGORY = ['Linux', 'Windows', 'AD', 'Other'];
const OS = ['Linux', 'Windows', 'Other'];
const DIFF = ['Easy', 'Medium', 'Hard', 'Insane'];

let failed = false;

// --- split frontmatter / body -------------------------------------------------
function split(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  return m ? { fm: m[1], body: m[2] } : { fm: '', body: md };
}
const oBody = split(original).body;
const eParts = split(enriched);

// --- extract fenced code-block BODIES (ignore the ```lang fence line) ----------
function codeBlocks(md) {
  const re = /```[^\n]*\n([\s\S]*?)```/g;
  const out = [];
  let m;
  while ((m = re.exec(md)) !== null) out.push(m[1].replace(/\n$/, ''));
  return out;
}
// every meaningful code LINE: fenced lines + inline `spans`, trimmed, non-empty.
// A multiset, so relocating a command (inline → fenced) or splitting/merging fences is
// allowed — but adding or removing any code line is not.
function codeLines(md) {
  const lines = [];
  for (const b of codeBlocks(md)) for (const l of b.split('\n')) { const t = l.trim(); if (t) lines.push(t); }
  const noFence = md.replace(/```[\s\S]*?```/g, ' ');
  let im;
  const ir = /`([^`\n]+)`/g;
  while ((im = ir.exec(noFence)) !== null) { const t = im[1].trim(); if (t) lines.push(t); }
  return lines;
}
function msDiff(a, b) {
  const ma = multiset(a), mb = multiset(b), removed = [], added = [];
  for (const [w, n] of ma) { if (n - (mb.get(w) || 0) > 0) removed.push(w); }
  for (const [w, n] of mb) { if (n - (ma.get(w) || 0) > 0) added.push(w); }
  return { removed, added };
}

const oCode = codeBlocks(oBody);
const eCode = codeBlocks(eParts.body);

console.log(`\n${DIM}— code blocks —${RST}`);
const strictSame = oCode.length === eCode.length && oCode.every((c, i) => c === eCode[i]);
if (strictSame) {
  ok(`all ${oCode.length} code blocks byte-identical`);
} else {
  // not identical per-fence — allowed ONLY if it's a pure reformat (no code line added/removed)
  const { removed, added } = msDiff(codeLines(oBody), codeLines(eParts.body));
  if (removed.length === 0 && added.length === 0) {
    warn(`code fences reformatted (${oCode.length} → ${eCode.length} blocks) — every code line preserved, OK`);
  } else {
    fail('code content changed — these lines were added/removed (not allowed):');
    removed.forEach((l) => console.log(`${RED}  - ${RST}${l.slice(0, 100)}`));
    added.forEach((l) => console.log(`${GREEN}  + ${RST}${l.slice(0, 100)}`));
    failed = true;
  }
}

// --- frontmatter validation (lightweight, line-based) -------------------------
console.log(`\n${DIM}— frontmatter —${RST}`);
if (!eParts.fm) {
  fail('enriched file has no frontmatter block');
  failed = true;
} else {
  const get = (k) => {
    const m = eParts.fm.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'));
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
  };
  const required = ['machine', 'category', 'difficulty', 'date', 'summary'];
  for (const k of required) {
    if (!get(k)) { fail(`missing required frontmatter: ${k}`); failed = true; }
  }
  const cat = get('category');
  if (cat && !CATEGORY.includes(cat)) { fail(`category "${cat}" not one of ${CATEGORY.join('|')}`); failed = true; }
  const os = get('os');
  if (os && !OS.includes(os)) { fail(`os "${os}" not one of ${OS.join('|')}`); failed = true; }
  const diff = get('difficulty');
  if (diff && !DIFF.includes(diff)) { fail(`difficulty "${diff}" not one of ${DIFF.join('|')}`); failed = true; }
  if (!failed) ok('required frontmatter present and valid');
}

// --- prose drift (WARNING only) ----------------------------------------------
console.log(`\n${DIM}— prose drift (review, not enforced) —${RST}`);
function proseWords(md) {
  const noCode = md
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/^#{1,6}\s.*$/gm, ' '); // ATX headings (milestones are intentionally added)
  return noCode.toLowerCase().match(/[a-z0-9']+/g) || [];
}
function multiset(arr) {
  const m = new Map();
  for (const w of arr) m.set(w, (m.get(w) || 0) + 1);
  return m;
}
const oW = multiset(proseWords(oBody));
const eW = multiset(proseWords(eParts.body));
const removed = [], added = [];
for (const [w, n] of oW) { const d = n - (eW.get(w) || 0); if (d > 0) removed.push(`${w}${d > 1 ? '×' + d : ''}`); }
for (const [w, n] of eW) { const d = n - (oW.get(w) || 0); if (d > 0) added.push(`${w}${d > 1 ? '×' + d : ''}`); }
const totalProse = [...oW.values()].reduce((a, b) => a + b, 0) || 1;
const drift = ((removed.length + added.length) / totalProse) * 100;

console.log(`  prose words: ${totalProse} · removed: ${removed.length} · added: ${added.length} · drift ${drift.toFixed(1)}%`);
if (removed.length) console.log(`  ${DIM}removed:${RST} ${removed.slice(0, 40).join(', ')}${removed.length > 40 ? ' …' : ''}`);
if (added.length) console.log(`  ${DIM}added:  ${RST} ${added.slice(0, 40).join(', ')}${added.length > 40 ? ' …' : ''}`);
if (drift > 8) warn(`prose drift ${drift.toFixed(1)}% is high — confirm you only fixed typos, not rewording`);
else ok('prose drift within typo-fix range');

console.log('');
if (failed) { console.log(`${RED}FAIL${RST} — enrichment violates a hard rule (see ✗ above).`); process.exit(1); }
console.log(`${GREEN}PASS${RST} — code preserved, frontmatter valid. Eyeball the prose-drift list above.`);
