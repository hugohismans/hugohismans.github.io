/**
 * Étiquettes HTML ancrées dans la 3D (amas, « Vous êtes ici », anneau autour de
 * Sgr A*) et survol des étoiles-projets dans le hero (bulle + clic vers la fiche).
 * Aucune lecture de mise en page dans la boucle : positions projetées, transforms écrites.
 */
import { $, S, fill } from '../core';
import { cyl, type Cluster, type Star } from './layout';
import type { Vector3 } from 'three';

type Project = (v: Vector3, out: number[]) => number[];

export function createLabels(opts: { clusters: Cluster[]; stars: Star[]; clusterTpl: string; onOpen: (slug: string) => void }) {
  const { clusters, stars } = opts;
  const overlay = $('.overlay3d')!;
  const hero = $('#hero')!;
  const tip = $('.star-tip')!;
  const here = $('.here-label')!;
  const ring = $('.orbit-ring')!;
  const labels = clusters.map((cl) => {
    const d = document.createElement('div');
    d.className = 'cl-label'; d.style.setProperty('--c', cl.css);
    const sm = document.createElement('small'); sm.textContent = fill(opts.clusterTpl, { l: cl.letter });
    d.append(sm, cl.label); overlay.append(d);
    return d;
  });
  // « Vous êtes ici » : le Système solaire, sur un bras à 40 unités du centre, posé là où aucun amas ne le masque
  let SUN = cyl(5.05, 40, 0.6);
  for (let k = 0; k <= 32; k++) {
    const th = 5.05 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.05;
    const p = cyl(th, 40, 0.6);
    if (Math.min(...clusters.map((c) => c.pos.distanceTo(p))) > 10) { SUN = p; break; }
  }
  const proj = new Float32Array(stars.length * 3);
  const o3 = [0, 0, 0];
  let tipIdx = -1, off = false;

  /* ---------- survol des étoiles dans le hero */
  const isBare = (t: EventTarget | null) => t === hero || t === hero.querySelector('.hero__inner') || (t as Element | null)?.classList?.contains('hero__foot');
  function pick(x: number, y: number) {
    let best = -1, bd = 26 * 26;
    for (let i = 0; i < stars.length; i++) {
      if (proj[i * 3 + 2] < 0) continue;
      const dx = proj[i * 3] - x, dy = proj[i * 3 + 1] - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || S.scroll > S.vh * 0.6) return;
    const i = isBare(e.target) ? pick(e.clientX, e.clientY) : -1;
    if (i !== tipIdx) {
      tipIdx = i;
      hero.style.cursor = i >= 0 ? 'pointer' : '';
      if (i >= 0) {
        const s = stars[i], sm = document.createElement('small');
        sm.textContent = `${s.n} · ${clusters[s.cat].label}`;
        tip.style.setProperty('--c', s.color);
        tip.replaceChildren(sm, s.title);
      }
      tip.classList.toggle('is-on', i >= 0);
    }
    if (i >= 0) tip.style.transform = `translate3d(${e.clientX + 18}px, ${e.clientY - 46}px, 0)`;
  };
  const onLeave = () => { tipIdx = -1; tip.classList.remove('is-on'); hero.style.cursor = ''; };
  const onClick = (e: MouseEvent) => { if (tipIdx >= 0 && isBare(e.target)) opts.onOpen(stars[tipIdx].slug); };
  hero.addEventListener('pointermove', onMove, { passive: true });
  hero.addEventListener('pointerleave', onLeave);
  hero.addEventListener('click', onClick);

  const inSafe = (x: number, y: number, pad: number) => S.safe.some((z) => x > z.l - pad && x < z.r && y + S.scroll > z.t && y + S.scroll < z.b);

  function update(project: Project, bh: number[], re: number, fade: number, vw: number, vh: number) {
    if (S.scroll >= S.vh * 1.1) {
      if (!off) { off = true; labels.forEach((l) => (l.style.opacity = '0')); here.style.opacity = '0'; ring.style.opacity = '0'; }
      return;
    }
    off = false;
    for (let i = 0; i < stars.length; i++) { project(stars[i].pos, o3); proj[i * 3] = o3[0]; proj[i * 3 + 1] = o3[1]; proj[i * 3 + 2] = o3[2]; }
    const fadeH = Math.min(1, Math.max(0, 1 - S.scroll / (S.vh * 0.55))) * fade;
    const ringR = re * vh * 4.6 * 0.5; // rayon de l'anneau de texte autour de Sgr A*
    clusters.forEach((cl, i) => {
      project(cl.pos, o3);
      const lab = labels[i];
      const flip = o3[0] > vw - 170;
      lab.classList.toggle('is-flip', flip);
      const nearBH = bh[2] > 0 && Math.hypot(o3[0] - bh[0], o3[1] - bh[1]) < ringR + 34;
      if (o3[2] > 0 && fadeH > 0.01 && !nearBH && !inSafe(o3[0], o3[1], 120) && o3[0] > 8 && o3[0] < vw - 8 && o3[1] > 70 && o3[1] < vh - 20) {
        lab.style.transform = `translate3d(${(o3[0] + (flip ? -10 : 10)).toFixed(1)}px, ${o3[1].toFixed(1)}px, 0)`;
        lab.style.opacity = (fadeH * 0.95).toFixed(3);
      } else lab.style.opacity = '0';
    });
    project(SUN, o3);
    const hereFlip = o3[0] > vw - 150;
    here.style.transform = `translate3d(${(o3[0] - 5).toFixed(1)}px, ${(o3[1] - 5).toFixed(1)}px, 0)${hereFlip ? ' translateX(calc(-100% + 10px))' : ''}`;
    const hereOut = o3[2] <= 0 || o3[0] < 8 || o3[0] > vw - 8 || o3[1] < 70 || o3[1] > vh - 20;
    here.style.opacity = hereOut || inSafe(o3[0], o3[1], 140) ? '0' : (fadeH * 0.9).toFixed(3);
    if (bh[2] > 0) {
      const px = re * vh * 4.6;
      ring.style.transform = `translate3d(${bh[0].toFixed(1)}px, ${bh[1].toFixed(1)}px, 0) scale(${(px / 200).toFixed(3)})`;
      ring.style.opacity = (fadeH * 0.9).toFixed(3);
    } else ring.style.opacity = '0';
  }

  function dispose() {
    hero.removeEventListener('pointermove', onMove);
    hero.removeEventListener('pointerleave', onLeave);
    hero.removeEventListener('click', onClick);
    labels.forEach((l) => l.remove());
    onLeave();
  }
  return { update, dispose, hoverIdx: () => tipIdx };
}
