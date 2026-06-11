#!/usr/bin/env node
/**
 * scrape-github.mjs — turn real GitHub repos into project entries.
 *
 * Fetches each repo's metadata + language breakdown from the public GitHub API
 * and (re)generates a markdown file under src/content/projects/ that matches the
 * `projects` collection schema. Re-run to refresh descriptions/stars/tech.
 *
 * Usage:
 *   node scripts/scrape-github.mjs
 *   GITHUB_TOKEN=ghp_... node scripts/scrape-github.mjs   # higher rate limit
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../src/content/projects');

const OWNER = 'FletcherSec';
const REPOS = ['contextTutor', 'EzRotate', 'My-CTF-Challenges'];

// curated, tile-sized descriptions that win over the (often terse) GitHub one
const DESC_OVERRIDE = {
  contextTutor:
    "AI tutoring wrapper that learns from a SKILL.md and your lecture transcripts to tutor in your professor's style, citing the source material.",
  EzRotate:
    'PowerShell tool that auto-rotates local Windows account passwords on a schedule for NIST 800-63B compliance.',
  'My-CTF-Challenges':
    "Capture-the-flag challenges I've authored — sources, configs, and solution notes.",
};
// hand-written fallbacks for repos with a thin/missing GitHub description
const FALLBACK_DESC = {
  'My-CTF-Challenges':
    "A collection of capture-the-flag challenges I've authored and hosted — source, configs, and solution notes across web, pwn, and forensics.",
};
const FALLBACK_TECH = {
  'My-CTF-Challenges': ['CTF', 'Docker'],
};

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'fletcher-portfolio',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

const get = async (url) => {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return r.json();
};

// first sentence (or a hard cap) so cards stay tidy; full text lives on GitHub
function tease(desc) {
  const s = desc.trim();
  const dot = s.indexOf('. ');
  const first = dot > 40 ? s.slice(0, dot + 1) : s;
  return first.length > 200 ? first.slice(0, 197).trimEnd() + '…' : first;
}

function frontmatter(obj, body) {
  const yaml = Object.entries(obj)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.map((x) => JSON.stringify(x)).join(', ')}]`;
      if (typeof v === 'string') return `${k}: ${JSON.stringify(v)}`;
      return `${k}: ${v}`;
    })
    .join('\n');
  return `---\n${yaml}\n---\n\n${body}\n`;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const repo of REPOS) {
    try {
      const r = await get(`https://api.github.com/repos/${OWNER}/${repo}`);
      const langs = await get(`https://api.github.com/repos/${OWNER}/${repo}/languages`);

      const tech = Object.keys(langs).sort((a, b) => langs[b] - langs[a]).slice(0, 4);
      const description =
        DESC_OVERRIDE[repo] || (r.description ? tease(r.description) : FALLBACK_DESC[repo] || '');
      const data = {
        title: r.name,
        description,
        tech: tech.length ? tech : FALLBACK_TECH[repo] || [],
        github: r.html_url,
        ...(r.homepage ? { demo: r.homepage } : {}),
        date: (r.pushed_at || r.created_at).slice(0, 10),
        featured: (r.stargazers_count || 0) > 0,
        stars: r.stargazers_count || 0,
      };
      // body = full GitHub description (kept for reference; cards show `description`)
      const body = (r.description || description || '').trim();
      const slug = repo.toLowerCase();
      writeFileSync(resolve(OUT_DIR, `${slug}.md`), frontmatter(data, body));
      console.log(`✓ ${repo} → ${slug}.md  [${tech.join(', ') || 'no langs'}]  ★${data.stars}`);
    } catch (e) {
      console.warn(`· skip ${repo}: ${e.message}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
