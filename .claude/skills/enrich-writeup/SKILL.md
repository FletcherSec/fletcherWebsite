---
name: enrich-writeup
description: >-
  Enrich a raw HTB/CTF writeup for the fletcher portfolio — add/complete frontmatter,
  syntax-highlight code fences, normalize formatting, and fix typos so it matches the
  house "terminal-dark" aesthetic, WITHOUT changing the author's prose phrasing, section
  structure, or the contents of any code block. Use when importing real writeups into
  src/content/writeups/ (replacing the placeholder seed files).
---

# Enrich Writeup

Turn a raw, human-written HTB/CTF writeup into a polished entry for this Astro site —
**enhancing only aesthetics, colors, and typos** while leaving the author's voice, flow,
and commands exactly as written.

## ⛔ Prime directive (hard rules — never break these)

1. **Never change code content.** Every character of the author's commands, output,
   payloads, IPs, and hashes stays **identical** — never add, remove, or edit a token. You
   may add a language tag to a fence's opening line (` ``` ` → ` ```bash `).
   - **Formatting-only exception (reforming a fence):** when a *single inline* command/line
     is so long it wrecks the page flow (e.g. a multi-KB `echo '<hash>' > crackme`), you may
     **relocate it verbatim into a fenced ```` ```bash ```` block** — fences wrap
     (`shikiConfig.wrap`), so the long line renders cleanly. You're only moving it: the code
     characters must be byte-identical (no inserted `\` continuations, no split tokens).
     Merging/splitting fences is allowed solely to fix egregious formatting, never to change
     content. The verifier enforces this — it permits relocation but FAILS if any code line
     is added or removed.
2. **Never reword prose.** Keep the author's sentences, phrasing, and tone. Do not
   "improve," summarize, expand, or reorder explanations. The human flow is the point.
3. **Preserve the author's content and order.** Keep every sentence, command, and step in
   the same order and meaning — don't add, remove, reword, or reorder the *substance*. You
   MAY **segment the existing flow with milestone headings** (see "Milestone headings"
   below) and fix heading levels/casing. You may NOT add new explanatory prose or steps to
   "fill" a section — headings only label content the author already wrote.
4. **Don't invent technical facts.** If you can't determine `os`/`difficulty`/`points`
   from the writeup, infer conservatively and **flag it for the user** rather than
   fabricate. Leave optional fields out instead of guessing.

If a change isn't "frontmatter, code-fence language tag, whitespace/heading formatting,
or a genuine typo," **don't make it.**

## ✅ What "enrich" means here (the only allowed edits)

| Category | Allowed | Example |
|---|---|---|
| **Frontmatter** | Add the full metadata block (drives the gallery cards, badges, colors) | add `os: Linux`, `difficulty: Medium`, `tags`, `summary` |
| **Colors / highlighting** | Add a language to untagged code fences (Shiki colors by language) | ` ``` ` → ` ```bash ` / ` ```powershell ` / ` ```python ` |
| **Formatting** | Blank lines around fences/headings, consistent `##` heading level & casing, tidy list markers | `#recon` → `## Recon` |
| **Bullet → prose flow** | Reflow cramped `- ` step lists into flowing prose **(every word & inline-code preserved verbatim)** | three `- cmd …` lines → one sentence that runs the same commands |
| **Typos** | Fix clear spelling/obvious grammar slips in prose | `enumarate` → `enumerate` |

Everything else is off-limits.

## Frontmatter schema

Authoritative source: **`src/content.config.ts`** (Zod `writeups` collection). Mirror it —
if it changes, that file wins. Current shape:

```yaml
---
machine: <string>            # box name, e.g. Forest
platform: Hack The Box       # default; override for other platforms
category: Linux | Windows | AD | Other      # REQUIRED — primary site filter/badge
os: Linux | Windows | Other  # optional — real OS (AD boxes are os: Windows)
difficulty: Easy | Medium | Hard | Insane   # REQUIRED enum
points: <number>             # optional — omit if unknown, do NOT guess
tags: [web, priv-esc, smb]   # technique tags (lowercase); fuels search + filters
date: YYYY-MM-DD             # REQUIRED — use the writeup's date if present, else ask
status: retired | active     # default retired
rating: <0-5>                # optional — omit unless the author rated it
summary: <non-spoiler abstract>   # REQUIRED — what the box TESTS, not how it's solved
draft: false                 # set true to keep it out of the listing
---
```

Deriving fields from a raw writeup:
- **machine** — the box name (also used for the slug + avatar initials).
- **category** — the box's lane on the site: `AD` for Active Directory boxes (domain
  controllers, Kerberos, BloodHound, DCSync — even though their OS is Windows), else the OS
  (`Linux`/`Windows`). Mirrors the `HTB/Challenge Boxes/{AD,Linux,Windows}/` folders.
- **os** — the underlying OS (Windows artifacts: `winrm`, `smb`, `.exe`; Linux: `bash`,
  `sudo`, cron). For AD boxes set `os: Windows`. Optional; omit if it equals category.
- **difficulty** — use the author's stated rating; otherwise infer from chain complexity and
  **flag for confirmation**.
- **tags** — pull the actual techniques used (e.g. `eternalblue`, `as-rep-roasting`, `xxe`,
  `lxd`, `cron`). Lowercase, hyphenated. These power the archive filters, so be accurate.
- **summary** — a short, **non-spoiler** abstract of what the box *tests*: its architecture
  / technology and the *categories* of skill and technique involved, so a reader can tell
  whether it covers something they want to learn — WITHOUT revealing the attack chain.
  - ✅ Name technique *families* and tech: "Active Directory enumeration", "a vulnerable
    CMS", "web file-upload", "Kerberos credential attacks", "a sudo misconfiguration".
  - ⛔ Do NOT reveal the *solution*: no specific exploit/CVE-as-the-answer, no credentials,
    usernames, hostnames, share/file names, payloads, or the exact step order.
  - One or two sentences, neutral voice. Think "back-of-the-box blurb," not a spoiler.
  - Renders on the writeup page under a bold **`Summary:`** label.

## Code-fence language map (for highlighting)

Add the language to the opening fence only; never touch the body.

- shell / `nmap` / `bash` / `smbclient` / `curl` → ` ```bash `
- Windows `cmd` → ` ```cmd ` · PowerShell → ` ```powershell `
- Python → ` ```python ` · HTTP request → ` ```http ` · SQL → ` ```sql `
- XML/JSON/PHP/etc. → the matching language
- Pure program **output** (not a command) → leave untagged or ` ```text ` (don't force a
  language that miscolors it)

When unsure, prefer leaving it untagged over guessing wrong — wrong highlighting looks worse
than none.

## House formatting conventions (match the seed writeups)

- Top-level milestones as `##` — **always mark `## Foothold` and `## Privilege Escalation`**
  (the two anchors every box has), plus any other real milestones the box contains
  (`## Recon` / `## Enumeration`, `## Lateral Movement`, `## Loot`, `## Beyond Root`, …).
  Segment the author's existing content under these — never invent content to fill a section,
  and don't over-segment a short box. These headings power the side index (see below).
- One blank line above and below every heading and every code fence.
- Inline commands/paths/flags in `` `backticks` ``.
- Keep the author's "Takeaways"/conclusion if present; don't add one if absent.
- **Favor prose flow over dense bullets.** A long run of short `- ` bullets (each holding
  a command or one clause) reads cramped — reflow it into prose paragraphs, keeping **every
  word and all inline `` `code` `` verbatim** (only the `- ` markers and line breaks go away).
  Reserve real bullet lists for genuinely enumerable items (a set of findings, a Takeaways
  list). Inline commands embedded mid-sentence still render fine. Because no words change,
  the verifier's prose-drift stays ~0. (James's note on the *Active* writeup: too many
  bullets felt cramped — this is the fix, applied wherever a writeup over-bullets steps.)

## Milestone headings & the side index

The writeup page renders a **sticky side index (table of contents)** — a 0xdf-style jump
list auto-built from the `##`/`###` headings, so a reader can hop straight to a milestone.
That means **headings are the navigation**: label the real milestones clearly and you get a
good index for free.

Rules:
- **Always include `## Foothold` and `## Privilege Escalation`.** These are the two anchors
  every box has (Foothold = first access/shell; Privilege Escalation = path to root /
  Administrator / SYSTEM).
- Add other milestones the box actually has: `## Recon`, `## Enumeration`, `## Lateral
  Movement`, `## Loot` / `## Credentials`, `## Beyond Root`. Use `###` for sub-steps under a
  milestone if the box is long (e.g. `### Kerberoasting` under Privilege Escalation).
- **Segment, don't rewrite.** A heading is inserted *above existing prose* to label it — you
  never move, add, or reword the prose beneath it. If the author already wrote a heading,
  keep their wording (just normalize the level/casing).
- Don't over-segment: a 15-line box might only need Enumeration / Foothold / Privilege
  Escalation. Match heading density to the box's real length.

(Heading text is excluded from the verifier's prose-drift count, so adding milestones won't
trip the drift warning.)

## Workflow

1. **Inbox.** Put the raw originals in `writeups-inbox/` (create it; it's git-ignored
   working space). One file per box.
2. **Enrich.** For each `writeups-inbox/<name>.md`, write the enriched version alongside it
   as `writeups-inbox/<name>_enriched.md` (append `_enriched` — per James's convention).
   Apply ONLY the allowed edits above.
3. **Verify (mechanical guardrail).** Run the checker — it FAILS if any code block changed
   or required frontmatter is missing, and reports prose drift:
   ```bash
   node scripts/verify-enrich.mjs writeups-inbox/<name>.md writeups-inbox/<name>_enriched.md
   ```
   Do not proceed unless it prints **PASS**. Eyeball the prose-drift word list — it should
   contain only typo corrections, nothing reworded.
4. **Place into the site.** Stage as `<name>_enriched.md` in the inbox, but **publish with a
   clean slug**: copy it to `src/content/writeups/<name>.md` (drop the `_enriched` suffix).
   Decided 2026-06-05 → URLs are `/writeups/<name>/`, not `/writeups/<name>_enriched/`.
5. **Placeholders.** The 8 fake seed writeups (`lame, blue, bashed, cronos, jeeves, forest,
   redcross, fulcrum`) were all deleted on 2026-06-05 — the collection starts empty and is
   filled only with James's real, enriched writeups.
6. **Build = final validation.** `npm run build` — the Zod schema validates every
   frontmatter block; a bad enum or missing field fails the build with a clear message.
7. **Eyeball it.** Start the dev server and screenshot the writeup page + the gallery row
   to confirm badges/colors/highlighting render (see the project's screenshot loop, or use
   the Playwright MCP once loaded).
8. **Verify every count/index that correlates with writeups — every time, no exceptions.**
   These are all computed dynamically from `getCollection('writeups')` (see
   `src/pages/index.astro`, `src/pages/writeups/index.astro`, `src/components/Nav.astro`,
   `src/components/WriteupsGallery.astro`) so nothing needs manual editing — but "it's
   dynamic" is not the same as "I checked it." After every batch of writeups, actually run
   the dev/preview server and confirm, don't assume:
   - **Archive per-platform counts** (`/writeups` header, e.g. "35 Proving Grounds · 22 Hack
     The Box") went up by exactly the number of boxes you added, split correctly by platform.
   - **Homepage rooms-completed counter** (`src/pages/index.astro` — HTB `systemOwns` + THM
     `rooms` + count of `platform: Proving Grounds` writeups) increased by the number of PG
     writeups added (HTB/THM boxes don't move this; only PG writeups do, since those two
     other numbers come from `profiles.json`, not the collection).
   - **Terminal tab-completion / `cd`/`cat` indexing** (`Nav.astro`'s `data-slugs`) — grep the
     built HTML for each new slug to confirm it's present, then actually exercise it: `cat
     <new-slug>` should tab-complete and open the page; a truncated prefix should narrow to
     it uniquely or list it among the candidates. This is automatic (no per-writeup wiring),
     but "automatic" has failed silently before via unrelated bugs (see the `.gitignore` note
     below) — check it, don't assume it.
   - **Images.** If a writeup embeds screenshots, copy the source PNGs into `public/media/`
     and convert any Obsidian `![[name.png]]` wikilink syntax to real markdown image syntax
     with descriptive alt text: `![alt text](/media/name%20with%20spaces%20url-encoded.png)`
     — Obsidian embeds are not valid Markdown and render as literal text, not images.
     **Then confirm the images are actually tracked by git** (`git status --short
     public/media/` should show them, not silence) before committing — `public/media/` was
     silently swallowed by an overly broad `.gitignore` pattern once before (fixed
     2026-08-24: `media/` → `/media/`), which meant every writeup screenshot rendered fine
     locally from untracked files but 404'd in production. Don't assume a git-ignored
     directory issue can't recur elsewhere; a plain `git status --short` after staging is
     the cheap check that catches it.

## Definition of done (per writeup)

- [ ] `verify-enrich.mjs` prints **PASS** (code identical, frontmatter valid)
- [ ] Prose drift is typos-only (reviewed the word list)
- [ ] Code fences have appropriate language tags; bodies untouched
- [ ] `npm run build` succeeds
- [ ] Renders correctly (badges, difficulty/OS colors, highlighted code)
- [ ] Replaced the corresponding placeholder seed (if applicable)
- [ ] Images (if any): copied to `public/media/`, wikilinks converted to real markdown
      image syntax with alt text, and confirmed tracked by git (not silently ignored)
- [ ] Archive per-platform counts increased correctly for what was added
- [ ] Homepage rooms-completed counter increased correctly (PG writeups only move it)
- [ ] New slug(s) confirmed present in the terminal's `data-slugs` and actually
      tab-complete / `cat` successfully in a running preview — not just assumed dynamic

## Examples

**Allowed**
~~~diff
- ---
- machine: Forest
- ---
+ ---
+ machine: Forest
+ platform: Hack The Box
+ os: Windows
+ difficulty: Medium
+ tags: [active-directory, as-rep-roasting, bloodhound, dcsync]
+ date: 2025-03-15
+ status: retired
+ summary: A classic Active Directory box exercising domain enumeration, Kerberos credential attacks, and ACL-based privilege escalation — a tidy intro to mapping and abusing AD trust relationships.
+ ---

- ```
- GetNPUsers.py htb.local/ -usersfile users.txt -no-pass -dc-ip 10.10.10.161
- ```
+ ```bash
+ GetNPUsers.py htb.local/ -usersfile users.txt -no-pass -dc-ip 10.10.10.161
+ ```

- ## enumaration
+ ## Enumeration
~~~

**Forbidden**
~~~diff
# rewording prose — NO
- I grabbed the hash and cracked it offline.
+ I exfiltrated the credential hash and performed an offline dictionary attack.

# editing inside a code block (even "cleanup") — NO
- evil-winrm -i 10.10.10.161 -u svc-alfresco -p s3rvice
+ evil-winrm -i 10.10.10.161 -u svc-alfresco -p 's3rvice'

# adding a step the author didn't write — NO
+ ## Persistence
+ I then added a scheduled task to maintain access.
~~~
