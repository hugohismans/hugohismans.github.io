/**
 * Fiche projet dans une <dialog> sur l'accueil.
 * Le contenu est celui de la page projet (/projets/<slug>/), chargé puis extrait :
 * aucune donnée de fiche n'est embarquée dans l'accueil. L'URL devient celle de
 * la page (pushState) : le bouton Retour ferme la fiche. Sans JavaScript, ou en
 * cas d'échec, les liens mènent simplement à la page.
 */
import { $, S, kick, isLite, fill, type SceneData } from './core';

interface Opts {
  data: SceneData;
  order: () => string[];
  onSelect: (slug: string | null) => void;
}
type VTDoc = Document & { startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void> } };

export function initFiche({ data, order, onSelect }: Opts) {
  const dlg = $<HTMLDialogElement>('#fiche');
  // sans <dialog> (vieux navigateurs) : les liens mènent simplement aux pages projet
  if (!dlg || typeof dlg.showModal !== 'function') return { open: (s: string) => { const p = data.projects.find((q) => q.s === s); if (p) location.assign(p.u); } };
  const panel = $('.fiche__panel', dlg)!;
  const slot = $('.fiche__slot', dlg)!;
  const langLink = $<HTMLAnchorElement>('[data-lang-switch]');
  const langHref = langLink?.getAttribute('href') || '';
  const byslug = new Map(data.projects.map((p) => [p.s, p]));
  const cache = new Map<string, Promise<HTMLElement>>();
  const doc = document as VTDoc;
  let current: string | null = null, opener: HTMLElement | null = null, pushed = false;

  /* ---------- chargement et extraction de la fiche */
  function load(slug: string): Promise<HTMLElement> {
    let pr = cache.get(slug);
    if (!pr) {
      const url = byslug.get(slug)!.u;
      pr = fetch(url, { credentials: 'same-origin' })
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
        .then((html) => {
          const d = new DOMParser().parseFromString(html, 'text/html');
          const sheet = d.querySelector<HTMLElement>('article.sheet');
          if (!sheet) throw new Error('fiche introuvable');
          return document.importNode(sheet, true);
        });
      pr.catch(() => cache.delete(slug));
      cache.set(slug, pr);
    }
    return pr.then((el) => el.cloneNode(true) as HTMLElement);
  }
  /* dans la modale, la fiche est un sous-titre de la page : h1 → h2, h2 → h3 */
  function demote(root: HTMLElement) {
    for (const h of [...root.querySelectorAll('h2')].concat([...root.querySelectorAll('h1')])) {
      const n = document.createElement(h.tagName === 'H1' ? 'h2' : 'h3');
      for (const a of [...h.attributes]) n.setAttribute(a.name, a.value);
      n.append(...h.childNodes);
      h.replaceWith(n);
    }
  }
  /* précédent / suivant : dans l'ordre affiché par l'atlas (filtré et trié) */
  function navList() {
    const vis = order();
    return current && vis.includes(current) ? vis : data.projects.map((p) => p.s);
  }
  function fill_(sheet: HTMLElement, slug: string) {
    demote(sheet);
    current = slug;
    const list = navList(), i = list.indexOf(slug), n = list.length;
    const prev = byslug.get(list[(i - 1 + n) % n])!, next = byslug.get(list[(i + 1) % n])!;
    const setNav = (a: HTMLAnchorElement | null, p: typeof prev, tpl: string) => {
      if (!a) return;
      a.href = p.u; a.dataset.slug = p.s; a.setAttribute('aria-label', fill(tpl, { t: p.t }));
      const l = a.querySelector('.lbl'); if (l) l.textContent = p.t;
    };
    setNav(sheet.querySelector('[data-step="-1"]'), prev, data.i18n.prev);
    setNav(sheet.querySelector('[data-step="1"]'), next, data.i18n.next);
    const pos = sheet.querySelector('.sheet__pos');
    if (pos) pos.textContent = `${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
    panel.style.setProperty('--cat', sheet.style.getPropertyValue('--cat'));
    slot.replaceChildren(sheet);
    panel.scrollTop = 0;
    const body = sheet.querySelector('.sheet__body'); if (body) body.scrollTop = 0;
    if (langLink && sheet.dataset.alt) langLink.href = sheet.dataset.alt;
    onSelect(slug);
  }
  function showLoading() {
    const p = document.createElement('p');
    p.className = 'fiche__loading'; p.textContent = data.i18n.loading;
    slot.replaceChildren(p);
  }
  function lock(on: boolean) {
    S.modal = on;
    document.documentElement.style.overflow = on ? 'hidden' : '';
    kick();
  }

  /* ---------- ouverture */
  async function open(slug: string, originImg: HTMLImageElement | null = null, mode: 'push' | 'replace' | 'none' = 'push') {
    const p = byslug.get(slug);
    if (!p) return;
    const wasOpen = dlg!.open;
    if (!wasOpen) { opener = document.activeElement as HTMLElement | null; }
    if (mode === 'push' && !wasOpen) { history.pushState({ fiche: slug }, '', p.u); pushed = true; }
    else if (mode !== 'none') history.replaceState({ fiche: slug }, '', p.u);

    const pending = load(slug);
    const quick = await Promise.race([pending.then(() => true, () => true), new Promise<boolean>((r) => setTimeout(() => r(false), 260))]);
    let sheet: HTMLElement;
    if (!quick && !wasOpen) { showLoading(); dlg!.classList.add('no-vt'); dlg!.showModal(); lock(true); }
    try { sheet = await pending; }
    catch { location.assign(p.u); return; }
    if (current === slug && dlg!.open && slot.firstElementChild?.matches('.sheet')) return;

    const img = originImg && originImg.complete && originImg.naturalWidth ? originImg : null;
    const canVT = quick && !wasOpen && S.motion && !!doc.startViewTransition && !!img && !isLite();
    dlg!.classList.toggle('no-vt', !canVT);
    const go = () => { fill_(sheet, slug); if (!dlg!.open) { dlg!.showModal(); lock(true); } };
    if (canVT) {
      img!.style.viewTransitionName = 'fiche-shot';
      const vt = doc.startViewTransition!(async () => {
        img!.style.viewTransitionName = '';
        go();
        const shot = slot.querySelector<HTMLImageElement>('.sheet__shot img, img.sheet__shot');
        if (shot) {
          shot.style.viewTransitionName = 'fiche-shot';
          await Promise.race([shot.decode().catch(() => {}), new Promise((r) => setTimeout(r, 400))]);
        }
        panel.style.viewTransitionName = 'fiche-panel';
      });
      vt.finished.finally(() => {
        panel.style.viewTransitionName = '';
        const shot = slot.querySelector<HTMLImageElement>('.sheet__shot img, img.sheet__shot');
        if (shot) shot.style.viewTransitionName = '';
      });
    } else go();
  }

  /* ---------- fermeture */
  let closing = false;
  function cleanup() {
    lock(false);
    if (langLink) langLink.href = langHref;
    current = null; onSelect(null);
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  }
  function closeUI() {
    if (!dlg!.open) return;
    const card = current ? document.querySelector<HTMLImageElement>(`.card[data-slug="${CSS.escape(current)}"]:not([hidden]) img`) : null;
    const r = card?.getBoundingClientRect();
    const onScreen = !!r && r.bottom > 0 && r.top < innerHeight;
    const done = () => { closing = true; dlg!.close(); closing = false; cleanup(); };
    const shot = slot.querySelector<HTMLImageElement>('.sheet__shot img, img.sheet__shot');
    if (S.motion && doc.startViewTransition && onScreen && shot && !isLite()) {
      shot.style.viewTransitionName = 'fiche-shot';
      panel.style.viewTransitionName = 'fiche-panel';
      const vt = doc.startViewTransition(() => {
        shot.style.viewTransitionName = ''; panel.style.viewTransitionName = '';
        done();
        card!.style.viewTransitionName = 'fiche-shot';
      });
      vt.finished.finally(() => { card!.style.viewTransitionName = ''; });
    } else done();
  }
  /* fermeture décidée par le navigateur (Échap répété, geste « retour » d'Android…) : on remet tout en ordre */
  dlg.addEventListener('close', () => {
    if (closing) return;
    cleanup();
    if (pushed && history.state?.fiche) { pushed = false; history.back(); }
    else if (history.state?.fiche) history.replaceState(null, '', homePath + returnSearch);
  });
  const homePath = new URL(document.querySelector<HTMLLinkElement>('link[rel=canonical]')?.href || location.href).pathname;
  let returnSearch = location.search + location.hash;
  function close() {
    if (!dlg!.open) return;
    if (pushed && history.state?.fiche) { pushed = false; history.back(); return; } // popstate fermera la fiche
    history.replaceState(null, '', homePath + returnSearch);
    closeUI();
  }

  addEventListener('popstate', (e) => {
    const slug = (e.state && e.state.fiche) as string | undefined;
    if (slug && byslug.has(slug)) { open(slug, null, 'none'); }
    else { pushed = false; closeUI(); }
  });

  /* ---------- interactions */
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const t = e.target as Element;
    const step = t.closest<HTMLAnchorElement>('#fiche [data-step]');
    if (step?.dataset.slug) { e.preventDefault(); open(step.dataset.slug, null, 'replace'); return; }
    const b = t.closest<HTMLElement>('[data-open]');
    if (b?.dataset.open && byslug.has(b.dataset.open)) {
      e.preventDefault();
      if (!dlg!.open) returnSearch = location.search + location.hash;
      const host = b.closest('.card, .station');
      open(b.dataset.open, dlg!.open ? null : host?.querySelector('img') ?? null, dlg!.open ? 'replace' : 'push');
      return;
    }
    if (t.closest('#fiche [data-close]')) close();
  });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener('keydown', (e) => {
    if ((e.target as Element).closest('input, textarea, select')) return;
    const dir = e.key === 'ArrowRight' ? '1' : e.key === 'ArrowLeft' ? '-1' : null;
    if (!dir) return;
    const a = dlg.querySelector<HTMLAnchorElement>(`[data-step="${dir}"]`);
    if (a?.dataset.slug) { e.preventDefault(); open(a.dataset.slug, null, 'replace'); }
  });

  /* ---------- préchargement au survol ou au focus (sauf économie de données) */
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (!saveData) {
    let timer = 0;
    const pre = (e: Event) => {
      const b = (e.target as Element).closest?.<HTMLElement>('[data-open]');
      if (!b?.dataset.open || !byslug.has(b.dataset.open)) return;
      clearTimeout(timer);
      timer = window.setTimeout(() => { load(b.dataset.open!).catch(() => {}); }, 90);
    };
    document.addEventListener('pointerover', pre, { passive: true });
    document.addEventListener('focusin', pre);
  }

  return { open: (slug: string) => open(slug, null, 'push') };
}
