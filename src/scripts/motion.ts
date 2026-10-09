/**
 * Mode calme : bouton « Réduire les animations » (aria-pressed), mémorisé,
 * synchronisé avec le réglage système tant que la personne n'a rien choisi.
 * La préférence est déjà appliquée avant le premier rendu (script en ligne du <head>).
 */
import { $$, root, S, kick, store } from './core';

type Listener = (full: boolean) => void;
const listeners = new Set<Listener>();
export const onMotion = (f: Listener) => listeners.add(f);

export function setMotion(full: boolean, persist: boolean) {
  S.motion = full;
  root.dataset.motion = full ? 'full' : 'reduce';
  for (const b of $$<HTMLButtonElement>('.motion-toggle')) {
    b.setAttribute('aria-pressed', String(!full));
    const txt = b.querySelector('.motion-toggle__txt');
    if (txt) txt.textContent = (full ? b.dataset.labelFull : b.dataset.labelReduced) || '';
  }
  if (persist) store.set('hh-motion', full ? 'full' : 'reduce');
  listeners.forEach((f) => f(full));
  kick();
}

export function initMotion() {
  for (const b of $$<HTMLButtonElement>('.motion-toggle')) b.addEventListener('click', () => setMotion(!S.motion, true));
  setMotion(S.motion, false);
  try {
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      if (!store.get('hh-motion')) setMotion(!e.matches, false);
    });
  } catch { /* vieux navigateurs */ }
  if (!CSS.supports('animation-timeline: view()')) root.classList.add('no-sda');
}
