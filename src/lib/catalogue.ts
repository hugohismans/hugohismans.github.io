/**
 * Lecture et validation du catalogue (data/catalogue.json), au build uniquement.
 * Tout ce que le site affiche sur les projets passe par ici : visibilité, tri,
 * textes localisés (repli sur le français), chiffres calculés.
 */
import { z } from 'astro/zod';
import raw from '../../data/catalogue.json';
import { SITE, SOUND_TECH, SPECTRUM_SIZE, TECH_FAMILIES, VISIBLE_STATES } from '../config/site';
import type { Lang } from '../i18n/ui';
import { typo } from './typo';

/* ------------------------------------------------------------------ schéma */
const L10n = z.object({ fr: z.string(), en: z.string().optional().default('') });
const L10nList = z.object({ fr: z.array(z.string()), en: z.array(z.string()).optional().default([]) });
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const CategorySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  lettre: z.string().optional(),
  label: L10n,
  intro: L10n,
  couleur: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  filtre: z.string().optional(),
  ordre: z.number(),
  /** Position facultative de l'amas dans la galaxie (sinon placement procédural). */
  amas: z.object({ angle: z.number(), rayon: z.number() }).optional(),
});

const ProjectSchema = z.object({
  slug: z.string().regex(/^[A-Za-z0-9_-]+$/),
  hh: z.number().int().positive(),
  titre: z.string(),
  accroche: L10n,
  description: L10n,
  categorie: z.string(),
  tags: z.array(z.string()).default([]),
  tech: z.array(z.string()).default([]),
  tech_courtes: z.array(z.string()).default([]),
  statut: z.enum(['abouti', 'en-cours', 'prototype', 'inacheve']),
  cadre: z.string().optional(),
  langues: z.array(z.string()).default([]),
  premier_commit: date,
  dernier_commit: date,
  commits: z.number().int().nonnegative(),
  depot: z.object({ nom: z.string(), chemin: z.string().nullable().optional(), branche: z.string().optional(), public: z.boolean().default(true) }),
  liens: z.object({ live: z.string().url().nullish().transform((v) => v ?? undefined) }).passthrough().default({}),
  points_forts: L10nList,
  mode_emploi: L10n.optional(),
  lies: z.array(z.string()).default([]),
  versions_precedentes: z.array(z.string()).default([]),
  visuel: z.object({ mobile: z.enum(['portrait', 'paysage', 'aucun']).default('aucun') }).passthrough(),
  mise_en_avant: z.object({ score: z.number(), phare: z.number().nullable().optional(), pourquoi: L10n.optional() }),
  visibilite: z.enum(['public', 'a-valider', 'masque']),
});

const OldVersionSchema = z.object({
  slug: z.string(),
  titre: z.string(),
  de: z.string(),
  live: z.string().nullish().transform((v) => v ?? undefined),
  depot: z.object({ nom: z.string(), chemin: z.string().nullable().optional() }).optional(),
});

const CatalogueSchema = z.object({
  categories: z.array(CategorySchema).min(1),
  projets: z.array(ProjectSchema).min(1),
  anciennes_versions: z.array(OldVersionSchema).default([]),
});

export type Category = z.infer<typeof CategorySchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type OldVersion = z.infer<typeof OldVersionSchema>;

const parsed = CatalogueSchema.safeParse(raw);
if (!parsed.success) {
  throw new Error('data/catalogue.json invalide :\n' + parsed.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n'));
}
const DATA = parsed.data;

/* ------------------------------------------------------------------ cohérence */
{
  const errs: string[] = [];
  const cats = new Set(DATA.categories.map((c) => c.id));
  const slugs = new Set<string>();
  const hhs = new Set<number>();
  for (const p of DATA.projets) {
    if (slugs.has(p.slug)) errs.push(`slug en double : ${p.slug}`);
    if (hhs.has(p.hh)) errs.push(`hh en double : ${p.hh}`);
    slugs.add(p.slug); hhs.add(p.hh);
    if (!cats.has(p.categorie)) errs.push(`${p.slug} : catégorie inconnue « ${p.categorie} »`);
  }
  if (errs.length) throw new Error('data/catalogue.json incohérent :\n' + errs.join('\n'));
}

/* ------------------------------------------------------------------ helpers */
/** Texte localisé : la langue demandée, sinon le français. Typographie française appliquée. */
export function loc(v: { fr: string; en?: string } | undefined, lang: Lang): string {
  if (!v) return '';
  const useEn = lang === 'en' && !!v.en && !!v.en.trim();
  return typo(useEn ? v.en! : v.fr, useEn ? 'en' : 'fr');
}
export function locList(v: { fr: string[]; en?: string[] } | undefined, lang: Lang): string[] {
  if (!v) return [];
  const useEn = lang === 'en' && !!v.en && v.en.length > 0;
  return (useEn ? v.en! : v.fr).map((s) => typo(s, useEn ? 'en' : 'fr'));
}

/**
 * Attribut `lang` à poser sur un texte localisé quand il retombe sur le français
 * dans une page anglaise (lecteurs d'écran). `undefined` si rien à signaler.
 */
export function fallbackLang(v: { fr: string | string[]; en?: string | string[] } | undefined, lang: Lang): 'fr' | undefined {
  if (!v || lang === 'fr') return undefined;
  const en = v.en;
  const has = Array.isArray(en) ? en.length > 0 : !!(en && en.trim());
  return has ? undefined : 'fr';
}

export const hhCode = (n: number) => `HH·${String(n).padStart(3, '0')}`;

/* ------------------------------------------------------------------ catégories */
export const categories: Category[] = [...DATA.categories].sort((a, b) => a.ordre - b.ordre);
const GREEK = 'αβγδεζηθικλμνξοπρστυφχψω';
export const catLetter = (c: Category) => c.lettre || GREEK[categories.indexOf(c) % GREEK.length];
export const catById = new Map(categories.map((c) => [c.id, c]));

/* ------------------------------------------------------------------ projets publiés */
const VISIBLE = new Set<string>(VISIBLE_STATES);
export const allProjects = DATA.projets;
/** Projets publiés, triés « par éclat » : phares d'abord (par rang), puis score, puis activité récente. */
export const projects: Project[] = DATA.projets
  .filter((p) => VISIBLE.has(p.visibilite))
  .sort((a, b) => {
    const pa = a.mise_en_avant.phare ?? Infinity, pb = b.mise_en_avant.phare ?? Infinity;
    if (pa !== pb) return pa - pb;
    if (b.mise_en_avant.score !== a.mise_en_avant.score) return b.mise_en_avant.score - a.mise_en_avant.score;
    return b.dernier_commit.localeCompare(a.dernier_commit) || a.hh - b.hh;
  });
export const bySlug = new Map(projects.map((p) => [p.slug, p]));
export const rankOf = new Map(projects.map((p, i) => [p.slug, i]));

/** Phares publiés, dans l'ordre de `mise_en_avant.phare`. */
export const phares = projects.filter((p) => p.mise_en_avant.phare != null);

export const catCount = (id: string) => projects.filter((p) => p.categorie === id).length;
/** Amas qui ont au moins un projet publié. */
export const activeCategories = categories.filter((c) => catCount(c.id) > 0);

/** Liens « Dans la même constellation » restreints aux projets publiés. */
export const relatedOf = (p: Project) => p.lies.filter((s) => s !== p.slug && bySlug.has(s)).map((s) => bySlug.get(s)!);

/** Versions précédentes (anciens doublons rattachés au projet). */
export const versionsOf = (p: Project): OldVersion[] => DATA.anciennes_versions.filter((v) => v.de === p.slug);

/** Précédent / suivant dans l'ordre par éclat (boucle). */
export function neighbours(p: Project) {
  const i = rankOf.get(p.slug)!;
  const n = projects.length;
  return { prev: projects[(i - 1 + n) % n], next: projects[(i + 1) % n], index: i, total: n };
}

/* ------------------------------------------------------------------ liens */
export function repoUrl(depot: { nom: string; chemin?: string | null; branche?: string }) {
  const base = `https://github.com/${SITE.githubUser}/${depot.nom}`;
  return depot.chemin ? `${base}/tree/${depot.branche || SITE.defaultBranch}/${depot.chemin}` : base;
}
export const sourceUrl = (p: Project) => (p.depot.public ? repoUrl(p.depot) : null);

/* ------------------------------------------------------------------ dates et libellés */
const LOCALE: Record<Lang, string> = { fr: 'fr-FR', en: 'en-GB' };
const d = (s: string) => new Date(`${s}T12:00:00Z`);
export function dateRange(a: string, b: string, lang: Lang) {
  const da = d(a), db = d(b);
  const sameYear = da.getUTCFullYear() === db.getUTCFullYear();
  const f = (x: Date, withYear: boolean) => new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: lang === 'fr' ? 'long' : 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' }).format(x);
  if (a === b) return f(da, true);
  return `${f(da, !sameYear)} → ${f(db, true)}`;
}
export const year = (s: string) => s.slice(0, 4);
export function monthYear(s: string, lang: Lang) {
  return new Intl.DateTimeFormat(LOCALE[lang], { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d(s));
}
export function fmtNumber(n: number, lang: Lang) {
  // espace fine insécable comme séparateur de milliers en français
  return new Intl.NumberFormat(LOCALE[lang]).format(n).replace(/[  \s]/g, lang === 'fr' ? ' ' : ',');
}

/* ------------------------------------------------------------------ chiffres calculés */
/**
 * Commits dédoublonnés par dépôt : chaque `depot.nom` compte une fois.
 * Pour un dépôt, on prend la fiche racine (chemin nul) si elle existe : son total
 * inclut déjà les sous-dossiers. Sinon, le maximum des fiches de ce dépôt.
 * Calculé sur tout le catalogue (y compris les projets non publiés) : c'est le
 * travail réel, pas seulement la vitrine.
 */
function dedupCommits() {
  const perRepo = new Map<string, number>();
  for (const p of allProjects) {
    const prev = perRepo.get(p.depot.nom);
    const isRoot = !p.depot.chemin;
    if (isRoot) perRepo.set(p.depot.nom, Math.max(p.commits, prev ?? 0));
    else if (prev == null) perRepo.set(p.depot.nom, p.commits);
    else perRepo.set(p.depot.nom, Math.max(prev, p.commits));
  }
  return { total: [...perRepo.values()].reduce((a, b) => a + b, 0), repos: perRepo.size };
}

function monthsBetween(a: string, b: string) {
  const [ya, ma] = a.split('-').map(Number), [yb, mb] = b.split('-').map(Number);
  return (yb - ya) * 12 + (mb - ma) + 1;
}

export const stats = (() => {
  const { total, repos } = dedupCommits();
  const first = projects.map((p) => p.premier_commit).sort()[0];
  const last = projects.map((p) => p.dernier_commit).sort().at(-1)!;
  const sound = projects.filter((p) => p.tech.some((t) => SOUND_TECH.test(t))).length;
  const spectrum = TECH_FAMILIES
    .map((f) => ({ ...f, n: projects.filter((p) => p.tech.some((t) => f.match.test(t))).length }))
    .filter((f) => f.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, SPECTRUM_SIZE);
  return {
    projects: projects.length,
    clusters: activeCategories.length,
    commits: total,
    repos,
    first,
    last,
    months: monthsBetween(first, last),
    sound,
    spectrum,
    maxHH: Math.max(...allProjects.map((p) => p.hh)),
  };
})();

/* ------------------------------------------------------------------ décor */
/** Petit hachage stable (FNV-1a), partagé avec la scène 3D. */
export function hashStr(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
/** Coordonnées célestes décoratives, stables pour un slug. */
export function skyCoords(slug: string, lang: Lang) {
  const h = hashStr(slug);
  const ra = h % (24 * 60);
  const dec = ((h >>> 11) % 150) - 75;
  const sign = dec < 0 ? '−' : '+';
  const k = lang === 'fr' ? ['AD', 'Déc.'] : ['RA', 'Dec.'];
  return `${k[0]} ${String(Math.floor(ra / 60)).padStart(2, '0')}h ${String(ra % 60).padStart(2, '0')}m · ${k[1]} ${sign}${Math.abs(dec)}°`;
}

/** Nombres en toutes lettres pour les petits nombres (style éditorial). */
export function numberWord(n: number, lang: Lang, capital = false) {
  const W = {
    fr: ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze'],
    en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'],
  }[lang];
  const w = n >= 0 && n < W.length ? W[n] : String(n);
  return capital ? w.charAt(0).toUpperCase() + w.slice(1) : w;
}
