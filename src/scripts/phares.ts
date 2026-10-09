/**
 * Phares en carrousel horizontal (scroll-snap natif) sous 900 px :
 * boutons précédent/suivant, position « 03 / 09 », escale active pour la caméra.
 */
import { $, $$, S, kick } from './core';

export function initCarousel(onChange: () => void) {
  const track = $('.stations');
  const ctl = $('.stations__ctl');
  if (!track || !ctl) return;
  const items = $$('.station', track);
  const pos = $('.stations__pos', ctl)!;
  const [prev, next] = $$<HTMLButtonElement>('button', ctl);
  const pad = (n: number) => String(n).padStart(2, '0');
  let active = -1;
  const update = () => {
    if (!S.carousel) return;
    const x = track.scrollLeft;
    let best = 0, bd = Infinity;
    const x0 = items[0].offsetLeft;
    items.forEach((el, i) => { const d = Math.abs(el.offsetLeft - x0 - x); if (d < bd) { bd = d; best = i; } });
    if (best === active) return;
    active = best; S.activeStation = best;
    pos.textContent = `${pad(best + 1)} / ${pad(items.length)}`;
    prev.disabled = best === 0; next.disabled = best === items.length - 1;
    onChange(); kick();
  };
  let t = 0;
  track.addEventListener('scroll', () => { cancelAnimationFrame(t); t = requestAnimationFrame(update); }, { passive: true });
  const go = (d: number) => {
    const i = Math.max(0, Math.min(items.length - 1, active + d));
    track.scrollTo({ left: items[i].offsetLeft - items[0].offsetLeft, behavior: S.motion ? 'smooth' : 'auto' });
  };
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  // une escale qui reçoit le focus clavier est amenée à l'écran par le navigateur ; on suit
  track.addEventListener('focusin', () => requestAnimationFrame(update));
  addEventListener('resize', () => { active = -1; update(); });
  requestAnimationFrame(update);
}
