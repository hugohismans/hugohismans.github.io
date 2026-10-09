/**
 * Accueil : branche les modules. Tout le contenu est déjà dans le HTML ;
 * ces scripts ajoutent les filtres, la fiche en modale, les effets et la 3D.
 */
import { $, $$, S, readData, kick } from './core';
import { initMotion, onMotion } from './motion';
import { initHeaderScroll, initReadout, initAnchors } from './header';
import { initTitle, initCounters, initReveal, initCards, initMagnetic } from './effects';
import { initAtlas } from './atlas';
import { initFiche } from './fiche';
import { initCarousel } from './phares';
import { initGL } from './gl';
import type { CosmosApi } from './cosmos/index';

const data = readData();
let cosmos: CosmosApi | null = null;

initMotion();
initHeaderScroll();
initAnchors();
initTitle();
initCounters(S.lang);
initReveal();
initCards();
initMagnetic();
const atlas = initAtlas();
initCarousel(() => { measure(); });

/* ------------------------------------------------ mesures (hors boucle) */
const sections = ['hero', 'apropos', 'phares', 'atlas', 'horizon'].map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
const stationEls = $$('.station');
let queued = false;
function measure() {
  queued = false;
  S.vw = innerWidth; S.vh = innerHeight; S.mobile = S.vw < 760;
  S.carousel = matchMedia('(max-width: 900px)').matches;
  const y = scrollY;
  S.maxScroll = Math.max(1, document.documentElement.scrollHeight - S.vh);
  for (const el of sections) { const r = el.getBoundingClientRect(); S.L[el.id] = { top: r.top + y, h: r.height }; }
  S.stations = stationEls.map((el) => { const r = el.getBoundingClientRect(); return { slug: el.dataset.slug!, top: r.top + y, h: r.height, side: el.classList.contains('station--left') ? -1 : 1 }; });
  const hi = $('.hero__inner')?.getBoundingClientRect(), hf = $('.hero__foot')?.getBoundingClientRect();
  S.safe = hi && hf ? [{ l: hi.left - 30, t: hi.top + y - 20, r: hi.right + 10, b: hi.bottom + y + 10 }, { l: hf.left - 20, t: hf.top + y - 30, r: hf.right + 20, b: hf.bottom + y + 20 }] : [];
  cosmos?.relayout();
  kick();
}
const queueMeasure = () => { if (!queued) { queued = true; requestAnimationFrame(measure); } };
addEventListener('resize', queueMeasure);
new ResizeObserver(queueMeasure).observe(document.body);
addEventListener('load', queueMeasure);
document.fonts?.ready.then(queueMeasure);
measure();

if (data) {
  initReadout(data);
  const fiche = initFiche({
    data,
    order: () => atlas?.order() ?? data.projects.map((p) => p.s),
    onSelect: (slug) => cosmos?.select(slug),
  });
  atlas?.onChange((f) => cosmos?.focus(f));
  initGL({
    onOpen: (slug) => fiche.open(slug),
    onReady: (api) => { cosmos = api; api.focus(S.filter); measure(); },
  });
}
onMotion(() => cosmos?.relayout());
