/**
 * Petits effets de l'interface : graisse du titre au pointeur, compteurs,
 * repli « reveal », cartes inclinables, boutons magnétiques.
 * Tous sont décoratifs et coupés en mode calme ; la plupart seulement au pointeur fin.
 */
import { $, $$, S, root, addTask, kick, finePointer } from './core';
import { onMotion } from './motion';

/* ------------------------------------------------ titre : graisse de Fraunces qui gonfle près du pointeur
   (aucune vague automatique : sans pointeur, les lettres reviennent au repos et la tâche ne fait plus rien) */
export function initTitle() {
  if (!finePointer) return;
  const letters = $$('.hero__line .ch').map((el) => ({ el, x: 0, y: 0, w: 400, tw: 400 }));
  if (!letters.length) return;
  const measure = () => {
    const y = scrollY;
    for (const L of letters) {
      const r = L.el.getBoundingClientRect();
      L.x = r.left + r.width / 2; L.y = r.top + y + r.height / 2;
    }
  };
  addEventListener('resize', measure);
  document.fonts?.ready.then(measure);
  setTimeout(measure, 2200); // après l'entrée animée des lettres
  addTask((dt) => {
    if (!S.motion || S.scroll > S.vh) return;
    let moving = false;
    for (const L of letters) {
      let target = 400;
      if (S.pointerIn) {
        const dx = S.px - L.x, dy = (S.py + S.scroll - L.y) * 0.7;
        target = 300 + 560 * Math.exp(-(dx * dx + dy * dy) / (2 * 150 * 150));
      }
      L.w += (target - L.w) * (1 - Math.exp(-dt * 7));
      const w = Math.round(L.w);
      if (Math.abs(target - L.w) > 0.5) moving = true;
      if (w !== L.tw) { L.tw = w; L.el.style.setProperty('--w', String(w)); L.el.style.setProperty('--soft', String(Math.round(100 - (w - 300) / 6))); }
    }
    if (moving) kick(2);
  });
  onMotion((full) => { if (!full) letters.forEach((L) => { L.el.style.removeProperty('--w'); L.el.style.removeProperty('--soft'); L.tw = 0; L.w = 400; }); });
}

/* ------------------------------------------------ compteurs « À propos » */
export function initCounters(lang: 'fr' | 'en') {
  const fmt = (n: number) => new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB').format(Math.round(n)).replace(/[  \s]/g, lang === 'fr' ? ' ' : ',');
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      io.unobserve(en.target);
      const el = en.target as HTMLElement, n = Number(el.dataset.count);
      if (!S.motion) continue;
      const t0 = performance.now(), dur = 1600;
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(2, -10 * k);
        el.textContent = fmt(k >= 1 ? n : n * e);
        if (k < 1) requestAnimationFrame(step);
      };
      el.textContent = '0';
      requestAnimationFrame(step);
    }
  }, { threshold: 0.6 });
  $$('.stat__n').forEach((el) => io.observe(el));
}

/* ------------------------------------------------ repli quand les animations pilotées par le défilement manquent */
export function initReveal() {
  if (!root.classList.contains('no-sda')) return;
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  $$('.station, .card').forEach((el) => io.observe(el));
}

/* ------------------------------------------------ cartes : inclinaison 3D et reflet ; étoile survolée */
export function initCards() {
  const grid = $('#grid');
  if (!grid) return;
  grid.addEventListener('pointerover', (e) => { const c = (e.target as Element).closest<HTMLElement>('.card'); S.hoverSlug = c ? c.dataset.slug! : null; kick(); });
  grid.addEventListener('pointerleave', () => { S.hoverSlug = null; kick(); });
  grid.addEventListener('focusin', (e) => { const c = (e.target as Element).closest<HTMLElement>('.card'); S.hoverSlug = c ? c.dataset.slug! : null; kick(); });
  grid.addEventListener('focusout', () => { S.hoverSlug = null; kick(); });
  if (!finePointer) return;
  let el: HTMLElement | null = null, rect: DOMRect | null = null, queued = false, tx = 0, ty = 0;
  const reset = (c: HTMLElement) => { c.classList.remove('is-tilting'); c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); };
  grid.addEventListener('pointermove', (e) => {
    const c = (e.target as Element).closest<HTMLElement>('.card__in');
    if (!c || !S.motion) return;
    if (c !== el) { if (el) reset(el); el = c; rect = c.getBoundingClientRect(); c.classList.add('is-tilting'); }
    tx = (e.clientX - rect!.left) / rect!.width; ty = (e.clientY - rect!.top) / rect!.height;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (!el) return;
      el.style.setProperty('--ry', `${((tx - 0.5) * 10).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${((0.5 - ty) * 8).toFixed(2)}deg`);
      el.style.setProperty('--gx', `${(tx * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${(ty * 100).toFixed(1)}%`);
    });
  }, { passive: true });
  grid.addEventListener('pointerleave', () => { if (el) reset(el); el = null; });
  addEventListener('scroll', () => { if (el) { reset(el); el = null; } }, { passive: true });
}

/* ------------------------------------------------ boutons magnétiques (pointeur fin) */
export function initMagnetic() {
  if (!finePointer) return;
  document.addEventListener('pointermove', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('.btn');
    if (!b || !S.motion) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--mx', `${((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1)}px`);
    b.style.setProperty('--my', `${((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1)}px`);
  }, { passive: true });
  document.addEventListener('pointerout', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('.btn');
    if (b && !b.contains(e.relatedTarget as Node)) { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); }
  });
}
