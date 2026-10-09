/**
 * Réglages du site, réunis à un seul endroit.
 * Rien ici ne décrit un projet en particulier : les projets et les amas
 * viennent tous de data/catalogue.json.
 */

/** Visibilités publiées. « masque » n'est jamais généré. */
export const VISIBLE_STATES = ['public', 'a-valider'] as const;

export const SITE = {
  url: 'https://hugohismans.github.io',
  author: 'Hugo Hismans',
  githubUser: 'hugohismans',
  /** Branche par défaut des dépôts, si `depot.branche` n'est pas précisé. */
  defaultBranch: 'main',
  themeColor: '#04050b',
} as const;

/**
 * Projet mis en avant par le bouton « Voir le vrai trou noir » de l'horizon.
 * Si ce slug n'est pas publié, le bouton disparaît simplement.
 */
export const HORIZON_PROJECT = 'periastre';

/**
 * Familles de technos du « spectre d'émission » (À propos).
 * Une techno du catalogue compte pour une famille si elle correspond à l'expression.
 * Chaque projet compte au plus une fois par famille. Les 12 familles les plus
 * fréquentes sont affichées, triées par nombre de projets.
 */
export const TECH_FAMILIES: { id: string; label: { fr: string; en: string }; match: RegExp }[] = [
  { id: 'vanilla', label: { fr: 'JS sans framework', en: 'Framework-free JS' }, match: /(javascript|js)\b.*(vanilla|sans framework|sans build|sans bundler|sans dépendance)|vanilla/i },
  { id: 'webaudio', label: { fr: 'Web Audio', en: 'Web Audio' }, match: /web audio/i },
  { id: 'canvas', label: { fr: 'Canvas 2D', en: 'Canvas 2D' }, match: /canvas 2d/i },
  { id: 'webgl', label: { fr: 'WebGL / GLSL', en: 'WebGL / GLSL' }, match: /webgl|glsl/i },
  { id: 'firebase', label: { fr: 'Firebase', en: 'Firebase' }, match: /firebase/i },
  { id: 'vite', label: { fr: 'Vite', en: 'Vite' }, match: /\bvite\b/i },
  { id: 'three', label: { fr: 'Three.js', en: 'Three.js' }, match: /three\.?js|globe\.gl/i },
  { id: 'ts', label: { fr: 'TypeScript', en: 'TypeScript' }, match: /typescript/i },
  { id: 'svelte', label: { fr: 'Svelte', en: 'Svelte' }, match: /svelte/i },
  { id: 'pwa', label: { fr: 'PWA hors ligne', en: 'Offline PWA' }, match: /\bpwa\b|service worker/i },
  { id: 'sensors', label: { fr: 'Capteurs du téléphone', en: 'Phone sensors' }, match: /device(motion|orientation)|vibration api|geolocation|getusermedia/i },
  { id: 'workers', label: { fr: 'Cloudflare Workers', en: 'Cloudflare Workers' }, match: /cloudflare workers/i },
  { id: 'p5', label: { fr: 'p5.js', en: 'p5.js' }, match: /p5\.js/i },
  { id: 'phaser', label: { fr: 'Phaser', en: 'Phaser' }, match: /phaser/i },
  { id: 'playwright', label: { fr: 'Playwright', en: 'Playwright' }, match: /playwright/i },
];

/** Nombre de raies affichées dans le spectre. */
export const SPECTRUM_SIZE = 12;

/** Techno qui définit la 4e statistique (« projets qui composent leur propre son »). */
export const SOUND_TECH = /web audio/i;
