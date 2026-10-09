/** Plan du site, généré au build (accueil et fiches, en français et en anglais). */
import type { APIRoute } from 'astro';
import { SITE } from '../config/site';
import { projects } from '../lib/catalogue';
import { ROUTES } from '../i18n/ui';

export const GET: APIRoute = () => {
  const abs = (p: string) => new URL(p, SITE.url).href;
  const pairs: [string, string, string?][] = [[ROUTES.home.fr, ROUTES.home.en]];
  for (const p of projects) pairs.push([ROUTES.project(p.slug, 'fr'), ROUTES.project(p.slug, 'en'), p.dernier_commit]);
  const url = (loc: string, fr: string, en: string, mod?: string) => `  <url>
    <loc>${abs(loc)}</loc>${mod ? `\n    <lastmod>${mod}</lastmod>` : ''}
    <xhtml:link rel="alternate" hreflang="fr" href="${abs(fr)}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${abs(en)}"/>
  </url>`;
  const body = pairs.flatMap(([fr, en, mod]) => [url(fr, fr, en, mod), url(en, fr, en, mod)]).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`, { headers: { 'Content-Type': 'application/xml' } });
};
