/**
 * Socle partagé des scripts : sélecteurs, état, boucle d'animation unique.
 * La boucle ne tourne en continu que si les animations sont actives ;
 * en mode calme, chaque défilement ou redimensionnement demande une seule image.
 */
export const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
export const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
export const root = document.documentElement;
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const mq = (q: string) => { try { return matchMedia(q).matches; } catch { return false; } };
/** Pointeur fin (souris, stylet) : effets au survol. */
export const finePointer = mq('(hover: hover) and (pointer: fine)');
/** Appareil tactile ou écran étroit : version allégée (voir styles/lite.css). */
export const isLite = () => mq('(hover: none), (pointer: coarse), (max-width: 760px)');

export interface Box { top: number; h: number }
export interface StationBox extends Box { slug: string; side: number }

/** État partagé, lu par l'en-tête, l'atlas, la fiche et la scène. */
export const S = {
  motion: root.dataset.motion !== 'reduce',
  lang: (root.lang || 'fr') as 'fr' | 'en',
  vw: innerWidth, vh: innerHeight, scroll: scrollY, maxScroll: 1, vel: 0,
  px: innerWidth / 2, py: innerHeight / 2, nx: 0, ny: 0, pointerIn: false,
  filter: 'all', hoverSlug: null as string | null, modal: false, mobile: innerWidth < 760,
  L: {} as Record<string, Box>, stations: [] as StationBox[], carousel: false, activeStation: 0,
  safe: [] as { l: number; t: number; r: number; b: number }[],
  idle: false,
};

/* ------------------------------------------------ boucle unique */
export type Task = (dt: number, now: number) => void;
const tasks = new Set<Task>();
let running = false, lastT = 0, lastScroll = scrollY, pending = 0, continuous = 0;
export function addTask(t: Task) { tasks.add(t); kick(); return () => tasks.delete(t); }
/** Une tâche qui anime en continu (la scène 3D) garde la boucle éveillée tant que les animations sont actives. */
export function holdLoop(on: boolean) { continuous = Math.max(0, continuous + (on ? 1 : -1)); kick(); }

function frame(now: number) {
  const dt = Math.min(0.25, Math.max(0.001, (now - lastT) / 1000));
  lastT = now;
  const y = scrollY;
  S.vel = lerp(S.vel, (y - lastScroll) / dt, 1 - Math.exp(-dt * 10));
  lastScroll = y; S.scroll = y;
  for (const t of tasks) t(dt, now);
  if (pending > 0) pending--;
  if ((S.motion && continuous > 0 && !document.hidden) || pending > 0) requestAnimationFrame(frame);
  else running = false;
}
/** Demande des images (au moins `frames`) ; relance la boucle si elle dort. */
export function kick(frames = 3) {
  pending = Math.max(pending, frames);
  if (running) return;
  running = true; lastT = performance.now();
  requestAnimationFrame(frame);
}
addEventListener('scroll', () => kick(), { passive: true });
addEventListener('resize', () => kick());
document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });

/* ------------------------------------------------ inactivité : après 8 s sans geste, on ralentit */
let idleTimer = 0;
function wake() {
  if (S.idle) { S.idle = false; root.classList.remove('is-idle'); kick(); }
  clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => { S.idle = true; root.classList.add('is-idle'); }, 8000);
}
for (const ev of ['scroll', 'pointermove', 'keydown', 'pointerdown']) addEventListener(ev, wake, { passive: true });
wake();

/* ------------------------------------------------ pointeur */
addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
  S.px = e.clientX; S.py = e.clientY; S.pointerIn = true;
  S.nx = (e.clientX / S.vw) * 2 - 1; S.ny = (e.clientY / S.vh) * 2 - 1;
  if (S.motion) kick();
}, { passive: true });
root.addEventListener('pointerleave', () => { S.pointerIn = false; });
addEventListener('blur', () => { S.pointerIn = false; });

/* ------------------------------------------------ stockage tolérant (navigation privée, données bloquées) */
export const store = {
  get(k: string, session = false) { try { return (session ? sessionStorage : localStorage).getItem(k); } catch { return null; } },
  set(k: string, v: string, session = false) { try { (session ? sessionStorage : localStorage).setItem(k, v); } catch { /* indisponible */ } },
  del(k: string, session = false) { try { (session ? sessionStorage : localStorage).removeItem(k); } catch { /* indisponible */ } },
};

/** Données de la page (scène, textes), sérialisées au build. */
export interface SceneData {
  lang: 'fr' | 'en';
  cats: { id: string; l: string; color: string; label: string; amas: { angle: number; rayon: number } | null }[];
  projects: { s: string; t: string; n: string; c: number; k: number; f: number; r: string[]; u: string }[];
  i18n: { cluster: string; unit: string; zones: Record<'orion' | 'sagittarius' | 'cluster' | 'phares' | 'polar' | 'horizon', string>; loading: string; prev: string; next: string };
}
export function readData(): SceneData | null {
  const el = document.getElementById('cosmos-data');
  if (!el) return null;
  try { return JSON.parse(el.textContent || '') as SceneData; } catch { return null; }
}
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => (k in v ? String(v[k]) : ''));
