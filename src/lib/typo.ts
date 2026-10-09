import type { Lang } from '../i18n/ui';

const NNBSP = ' ';

/**
 * Typographie française : espace fine insécable avant « : ; ! ? » et à l'intérieur
 * des guillemets. Appliquée au build sur les textes en français uniquement.
 */
export function typo(s: string, lang: Lang): string {
  if (lang !== 'fr' || !s) return s;
  return s
    .replace(/[  ]+([:;!?»])/g, `${NNBSP}$1`)
    .replace(/«[  ]+/g, `«${NNBSP}`)
    .replace(/([«])(?=[^\s ])/g, `$1${NNBSP}`)
    .replace(/([^\s (])(»)/g, `$1${NNBSP}$2`);
}

/** Minuscules sans accents, pour la recherche. */
export const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
