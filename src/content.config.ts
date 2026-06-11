import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// HTB / CTF writeups — the primary content of the site.
const writeups = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writeups' }),
  schema: z.object({
    machine: z.string(),
    platform: z.string().default('Hack The Box'),
    // primary grouping shown on the site (filters + colored badge)
    category: z.enum(['Linux', 'Windows', 'AD', 'Other']),
    // underlying OS — optional extra detail (AD boxes are os: Windows)
    os: z.enum(['Linux', 'Windows', 'Other']).optional(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard', 'Insane']),
    points: z.number().optional(),
    // freeform technique tags: web, priv-esc, RCE, AD, smb, ...
    tags: z.array(z.string()).default([]),
    date: z.coerce.date(),
    status: z.enum(['active', 'retired']).default('retired'),
    rating: z.number().min(0).max(5).optional(),
    // optional path to a machine avatar image; falls back to a generated badge
    avatar: z.string().optional(),
    summary: z.string(),
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tech: z.array(z.string()).default([]),
    github: z.string().url().optional(),
    demo: z.string().url().optional(),
    date: z.coerce.date(),
    featured: z.boolean().default(false),
    // GitHub stars (populated by scripts/scrape-github.mjs)
    stars: z.number().optional(),
  }),
});

export const collections = { writeups, projects };
