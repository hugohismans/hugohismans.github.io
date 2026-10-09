/**
 * Captures d'écran trouvées par convention à partir du slug :
 *   src/assets/captures/<slug>.webp          (bureau, 16:10)
 *   src/assets/captures/<slug>-mobile.webp   (téléphone, facultative)
 */
import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/captures/*.{webp,png,jpg,jpeg,avif}', { eager: true });

const byName = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(files)) {
  const name = path.split('/').pop()!.replace(/\.[a-z]+$/i, '');
  byName.set(name, mod.default);
}

export function desktopShot(slug: string): ImageMetadata {
  const img = byName.get(slug);
  if (!img) throw new Error(`Capture manquante : src/assets/captures/${slug}.webp`);
  return img;
}

export function mobileShot(slug: string, declared: string): ImageMetadata | null {
  if (declared === 'aucun') return null;
  return byName.get(`${slug}-mobile`) ?? null;
}

/** Largeurs générées (AVIF + WebP). */
export const SHOT_WIDTHS = [480, 960, 1440];
export const MOBILE_WIDTHS = [360, 780];
