// Inline monoline SVG icons (24×24, stroke = currentColor) so they inherit the
// terminal palette and add zero network requests. Rendered via set:html.
// Keep them stroke-based and consistent — the line-art look suits the theme
// better than full-color brand logos.

const wrap = (inner: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;

export const icons: Record<string, string> = {
  email: wrap('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),

  github: wrap(
    '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
  ),

  linkedin: wrap(
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 0 1 4 0v4M11 17v-7"/>',
  ),

  // Hack The Box — the hexagon "cube" mark.
  hackthebox: wrap(
    '<path d="M12 2.5 20 7v10l-8 4.5L4 17V7z"/><path d="m4 7 8 4.5L20 7M12 11.5V21"/>',
  ),

  // TryHackMe — a stylized shield/terminal prompt.
  tryhackme: wrap(
    '<path d="M12 2.5 20 5v6c0 5-3.4 8.3-8 10.5C7.4 19.3 4 16 4 11V5z"/><path d="m9.5 9.5 2.5 2.5-2.5 2.5M13 15h2.5"/>',
  ),

  external: wrap('<path d="M7 17 17 7M9 7h8v8"/>'),

  // shield-check — used on the cert "verify" chips
  verified: wrap('<path d="M12 3 4 6v5c0 5 3.4 8.3 8 10 4.6-1.7 8-5 8-10V6z"/><path d="m9 12 2 2 4-4"/>'),
};
