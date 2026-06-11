// Central site config + non-collection data (certs, socials, profile).
// Edit this file to update identity, links, and certifications.

export const profile = {
  handle: 'fletcher',
  name: 'James Weaver',
  role: 'Cybersecurity Graduate Student',
  tagline: 'CTF player · offensive security',
  bio: `Graduate cybersecurity student who spends entirely too much time on Hack The Box.
I write up the machines I root, build tooling when a workflow gets repetitive, and chase
the next certification. Mostly offensive security, with forensics and incident response close behind.`,
  email: 'jamesweavercs@gmail.com',
  location: 'United States',
};

export const socials = {
  github: 'https://github.com/FletcherSec',
  hackthebox: 'https://app.hackthebox.com/users/1639899',
  tryhackme: 'https://tryhackme.com/p/fletched',
  linkedin: 'https://www.linkedin.com/in/james-weaver-cs/',
  email: 'jamesweavercs@gmail.com',
};

// --- LinkedIn "latest posts" -----------------------------------------------
// FALLBACK ONLY. Live posts are pulled by `npm run scrape:linkedin` (see
// scripts/scrape-linkedin.mjs — needs LINKEDIN_RSS_URL or LI_AT) into
// src/data/linkedin.json; this list renders only until a scrape succeeds.
export type Post = { date: string; text: string; url: string };

export const linkedinPosts: Post[] = [
  {
    date: '2026-05-10',
    text: "AI has changed the way people study. But most students are only scratching the surface of what's possible.The common workflow: record a lecture, paste the topic into an AI, get a generic summary. It works. Until you realize the AI's version",
    url: 'https://www.linkedin.com/feed/update/urn:li:activity:7459070527429783552/',
  },
  {
    date: '2026-04-14',
    text: "Another top 500 finish in the National Cyber League Spring 2026 Individual Game! 🏆Placed 299th out of 6,976 competitors this season and I'm proud of the progress. Scored 2,740 out of 3,000 points, up ~150 from my last competition, with 95.",
    url: 'https://www.linkedin.com/feed/update/urn:li:activity:7449901870204039169/',
  },
  {
    date: '2026-03-07',
    text: "I've recently taken a short break from my goal of spending a few hours a day doing TryHackMe. While I have learned a ton from TryHackMe so far and plan to continue it in the future, sometimes it's nice to change up the format and delve into",
    url: 'https://www.linkedin.com/feed/update/urn:li:activity:7436109117787881472/',
  },
];

// Hand-assigned topic tags, keyed by the activity id at the end of a post URL.
// Kept here (not in linkedin.json) so a re-scrape can't wipe them; a post with
// no entry simply renders untagged. Three tags per post, summarizing the FULL
// post body (not just the truncated card blurb), shaped the same way:
// domain · activity · theme.
export const postTags: Record<string, string[]> = {
  '7459070527429783552': ['ai', 'edtech', 'open-source'],
  '7449901870204039169': ['ctf', 'competition', 'achievement'],
  '7436109117787881472': ['pwn', 'binary-exploitation', 'pwntools'],
};

export type Cert = {
  name: string;
  issuer: string;
  abbr: string;
  date: string; // ISO-ish; display only
  url?: string;
  blurb: string;
  icon?: string; // local badge image; falls back to the abbr monogram
};

export const certs: Cert[] = [
  {
    name: 'eLearnSecurity Junior Penetration Tester',
    abbr: 'eJPT',
    issuer: 'INE Security',
    date: '2025',
    url: 'https://certs.ine.com/401a9255-b6aa-4ee5-9233-30b65045de8c#acc.jZ2blNDK',
    blurb: 'Hands-on entry pentest cert — host/network enumeration, exploitation, and pivoting in a live lab exam.',
    icon: '/certs/ejpt.svg',
  },
  {
    name: 'CompTIA Security+',
    abbr: 'Sec+',
    issuer: 'CompTIA',
    date: '2024',
    url: 'https://www.linkedin.com/in/james-weaver-cs/overlay/Certifications/1009084667/treasury?profileId=ACoAAFGBgssBseixWDAv_hG6VEeHUqeryeu_RSc',
    blurb: 'Foundational security cert covering threats, cryptography, IAM, and risk — the industry baseline.',
    icon: '/certs/security-plus.png',
  },
  {
    name: 'AWS Certified Cloud Practitioner',
    abbr: 'AWS CCP',
    issuer: 'Amazon Web Services',
    date: '2024',
    url: 'https://www.credly.com/badges/bbbf51a7-50ac-4896-90a2-37d94b9f015b/public_url',
    blurb: 'Cloud fundamentals — core AWS services, the shared-responsibility model, billing, and security basics.',
    icon: '/certs/aws-ccp.png',
  },
];
