/**
 * Atlas : filtres par amas (écrits dans l'URL, ?amas=…), recherche multi-mots
 * insensible aux accents, tri, état annoncé (role=status), transitions de vue
 * limitées aux cartes à l'écran.
 */
import { $, $$, S, isLite, fill } from './core';

export interface AtlasApi { order(): string[]; onChange(f: (filter: string) => void): void }

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function initAtlas(): AtlasApi | null {
  const grid = $('#grid');
  const controls = $('.atlas__controls');
  if (!grid || !controls) return null;
  const chips = $$<HTMLButtonElement>('.chip');
  const q = $<HTMLInputElement>('#q')!, sort = $<HTMLSelectElement>('#sort')!;
  const status = $('#atlas-status')!, empty = $('.atlas__empty')!;
  const msgs = JSON.parse(status.dataset.msgs || '{}') as Record<string, string>;
  const clusters = JSON.parse(status.dataset.clusters || '{}') as Record<string, { l: string; c: string; i: string }>;
  const cards = $$<HTMLLIElement>('.card', grid);
  const listeners = new Set<(f: string) => void>();
  const collator = new Intl.Collator(S.lang, { sensitivity: 'base' });
  const cmp: Record<string, (a: HTMLElement, b: HTMLElement) => number> = {
    eclat: (a, b) => Number(a.dataset.rank) - Number(b.dataset.rank),
    recent: (a, b) => (b.dataset.last || '').localeCompare(a.dataset.last || '') || Number(a.dataset.rank) - Number(b.dataset.rank),
    az: (a, b) => collator.compare(a.dataset.title || '', b.dataset.title || ''),
  };

  /* hauteur de la barre collante : sert de marge au focus clavier dans la grille */
  new ResizeObserver(() => document.documentElement.style.setProperty('--bar-h', `${Math.round(controls.offsetHeight)}px`)).observe(controls);

  /* cartes à l'écran : seules elles reçoivent un nom de transition */
  const onScreen = new Set<Element>();
  const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target))), { rootMargin: '120px 0px' });
  cards.forEach((c) => io.observe(c));
  const nameVisible = () => {
    let n = 0;
    for (const c of cards) {
      let on = false;
      if (!c.hidden && n < 24) { const r = c.getBoundingClientRect(); on = r.bottom > -120 && r.top < innerHeight + 120; }
      c.classList.toggle('vt-named', on);
      if (on) n++;
    }
  };

  function apply() {
    const words = fold(q.value.trim()).split(/\s+/).filter(Boolean);
    const sorted = [...cards].sort(cmp[sort.value] || cmp.eclat);
    const cur = [...grid!.children];
    if (sorted.some((c, i) => c !== cur[i])) sorted.forEach((c) => grid!.appendChild(c));
    let n = 0;
    for (const c of cards) {
      const hay = c.dataset.hay || '';
      const ok = (S.filter === 'all' || c.dataset.cat === S.filter) && words.every((w) => hay.includes(w));
      c.hidden = !ok;
      if (ok) n++;
    }
    const cl = clusters[S.filter];
    const strong = document.createElement('strong');
    strong.textContent = fill(n > 1 ? msgs.many : msgs.one, { n });
    const intro = document.createElement('span');
    intro.className = 'intro';
    intro.textContent = cl ? fill(msgs.cluster, cl) : words.length ? fill(msgs.query, { q: q.value.trim() }) : msgs.all;
    status.replaceChildren(strong, intro);
    empty.hidden = n > 0;
    listeners.forEach((f) => f(S.filter));
  }

  function withTransition(fn: () => void) {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
    if (!S.motion || !doc.startViewTransition || isLite()) { fn(); return; }
    nameVisible();
    grid!.classList.add('vt-on');
    const vt = doc.startViewTransition(() => { fn(); nameVisible(); });
    vt.finished.finally(() => { grid!.classList.remove('vt-on'); cards.forEach((c) => c.classList.remove('vt-named')); });
  }

  function setFilter(id: string, push = true) {
    if (id !== 'all' && !chips.some((c) => c.dataset.filter === id)) id = 'all';
    S.filter = id;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filter === id)));
    if (push) {
      const u = new URL(location.href);
      if (id === 'all') u.searchParams.delete('amas'); else u.searchParams.set('amas', id);
      history.replaceState(history.state, '', u.pathname + u.search + u.hash);
    }
  }

  chips.forEach((b) => b.addEventListener('click', () => { setFilter(b.dataset.filter || 'all'); withTransition(apply); }));
  let timer = 0;
  q.addEventListener('input', () => { clearTimeout(timer); timer = window.setTimeout(apply, 140); });
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); apply(); } });
  sort.addEventListener('change', () => withTransition(apply));

  /* état initial depuis l'URL */
  const fromUrl = new URLSearchParams(location.search).get('amas');
  if (fromUrl) { setFilter(fromUrl, false); apply(); }
  else if (q.value || sort.value !== 'eclat') apply(); // champs restaurés par le navigateur

  return {
    order: () => [...grid.children].filter((c) => !(c as HTMLElement).hidden).map((c) => (c as HTMLElement).dataset.slug!),
    onChange: (f) => { listeners.add(f); },
  };
}
