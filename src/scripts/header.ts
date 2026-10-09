/**
 * En-tête : fond au défilement, relevé « distance à Sgr A* », navigation active,
 * ancres internes (défilement natif + focus déplacé sur la cible).
 */
import { $, $$, S, addTask, clamp, fill, type SceneData } from './core';

export function initHeaderScroll() {
  const top = $('.top');
  if (!top) return;
  let on: boolean | null = null;
  const up = () => { const v = scrollY > 40; if (v !== on) { on = v; top.classList.toggle('is-scrolled', v); } };
  addEventListener('scroll', up, { passive: true });
  up();
}

export function initReadout(data: SceneData) {
  const val = $('.readout__val'), zone = $('.readout__zone');
  const navLinks = $$<HTMLAnchorElement>('.nav a');
  const Z = data.i18n.zones;
  const fmt = (n: number) => new Intl.NumberFormat(data.lang === 'fr' ? 'fr-FR' : 'en-GB').format(n).replace(/[  \s]/g, data.lang === 'fr' ? ' ' : ',');
  let lastV = '', lastZ = '', lastNav = '';
  const zoneFor = (y: number): [string, string] => {
    const c = y + S.vh * 0.5, L = S.L;
    if (!L.hero || c < L.apropos.top) return [Z.orion, 'hero'];
    if (c < L.phares.top) return [Z.sagittarius, 'apropos'];
    if (c < L.atlas.top) {
      let k = 0;
      if (S.carousel) k = S.activeStation;
      else for (let i = 0; i < S.stations.length; i++) if (c >= S.stations[i].top) k = i;
      const p = data.projects.find((q) => q.s === S.stations[k]?.slug);
      const cat = p ? data.cats[p.c] : null;
      return [cat ? fill(Z.cluster, { l: cat.l, c: cat.label }) : Z.phares, 'phares'];
    }
    if (c < L.horizon.top) return [Z.polar, 'atlas'];
    return [Z.horizon, 'horizon'];
  };
  addTask(() => {
    const p = clamp(S.scroll / S.maxScroll, 0, 1);
    const d = 26700 * Math.pow(1 - p, 1.35);
    const txt = d < 5 ? `0 ${data.i18n.unit}` : `${fmt(Math.round(d / 10) * 10)} ${data.i18n.unit}`;
    if (val && txt !== lastV) { val.textContent = txt; lastV = txt; }
    const [z, sec] = zoneFor(S.scroll);
    if (zone && z !== lastZ) { zone.textContent = z; lastZ = z; }
    if (sec !== lastNav) {
      lastNav = sec;
      navLinks.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + sec)));
    }
  });
}

/** Ancres internes : défilement natif (doux si les animations sont actives) et focus sur la cible. */
export function initAnchors() {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href')!.slice(1);
    const el = id === 'top' ? null : document.getElementById(id);
    if (id !== 'top' && !el) return;
    e.preventDefault();
    const behavior: ScrollBehavior = S.motion ? 'smooth' : 'auto';
    if (!el) window.scrollTo({ top: 0, behavior });
    else el.scrollIntoView({ behavior, block: 'start' });
    const target = el ?? document.getElementById('hero-title');
    if (target) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
    history.replaceState(history.state, '', id === 'top' ? location.pathname + location.search : '#' + id);
  });
}
