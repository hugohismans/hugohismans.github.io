/**
 * Vol de caméra piloté par le défilement natif : une « image clé » par section,
 * placée à partir des positions mesurées du DOM, interpolées en coordonnées
 * cylindriques autour du centre. Version calme : caméra fixe.
 */
import { Vector3 } from 'three';
import { S, clamp, lerp, smooth } from '../core';
import { cyl, type Cluster, type Star } from './layout';

export interface CamState { pos: Vector3; target: Vector3; sx: number; sy: number; fov: number; dim: number; lens: number; hi: number; hiAmt: number }
const ORIGIN = new Vector3(0, 0, 0);
const state = (pos: Vector3, target: Vector3, sx: number, sy: number, fov: number, dim: number, extra: Partial<CamState> = {}): CamState => {
  const st = { pos, target, sx, sy, fov, dim, lens: 1, hi: -1, hiAmt: 0, ...extra };
  st.hiAmt = st.hi >= 0 ? 1 : 0;
  return st;
};

export function createCamera(clusters: Cluster[], stars: Star[], starIdx: Map<string, number>, catIdx: Map<string, number>) {
  const m = () => S.mobile;
  const hero = () => (m() ? state(cyl(1.25, 62, 42), ORIGIN, 0, 0.36, 50, 0) : state(cyl(1.25, 52, 31), ORIGIN, 0.3, 0.06, 42, 0));
  const about = () => (m() ? state(cyl(2.3, 44, 16), ORIGIN, 0, 0.3, 52, 0.4) : state(cyl(2.3, 34, 9), ORIGIN, 0.36, 0.02, 44, 0.24));
  function station(slug: string | undefined, side: number) {
    const i = slug != null ? starIdx.get(slug) : undefined;
    if (i == null) return about();
    const s = stars[i];
    const th = Math.atan2(s.pos.z, s.pos.x), r = Math.hypot(s.pos.x, s.pos.z);
    const pos = cyl(th + 0.22, r + 9.5, s.pos.y + 2.4);
    return m() || S.carousel
      ? state(pos, s.pos.clone(), 0, m() ? 0.42 : 0.3, 52, 0.3, { hi: i })
      : state(pos, s.pos.clone(), 0.5 * side, 0.02, 40, 0.08, { hi: i });
  }
  function atlas() {
    const ci = catIdx.get(S.filter);
    if (ci == null) return state(cyl(1.6, 12, m() ? 135 : 105), ORIGIN, m() ? 0 : 0.28, m() ? 0.2 : 0.1, 50, 0.45, { lens: 0.8 });
    const cl = clusters[ci];
    return state(cyl(cl.th + 0.15, cl.r + 14, m() ? 50 : 36), cl.pos.clone(), m() ? 0 : 0.42, m() ? 0.25 : 0.12, 48, 0.45, { lens: 0.8 });
  }
  const horizon = () => state(cyl(1.9, 7.6, 1.6), ORIGIN, 0, 0, 46, 0.1, { lens: m() ? 1.25 : 1.6 });

  let keys: { y: number; f: () => CamState }[] = [];
  function build() {
    const L = S.L, vh = S.vh;
    if (!L.hero || !L.apropos || !L.atlas) return;
    const at = (top: number, h: number) => clamp(top + h / 2 - vh / 2, 0, S.maxScroll);
    keys = [{ y: 0, f: hero }, { y: at(L.apropos.top, L.apropos.h), f: about }];
    if (S.carousel) keys.push({ y: at(L.phares.top, L.phares.h), f: () => station(S.stations[S.activeStation]?.slug, 0) });
    else S.stations.forEach((st) => keys.push({ y: at(st.top, st.h), f: () => station(st.slug, st.side) }));
    keys.push({ y: clamp(L.atlas.top - vh * 0.2, 0, S.maxScroll), f: atlas });
    keys.push({ y: clamp(L.atlas.top + L.atlas.h - vh * 1.1, 0, S.maxScroll), f: atlas });
    keys.push({ y: S.maxScroll, f: horizon });
    keys.sort((a, b) => a.y - b.y);
  }
  const lerpCyl = (a: Vector3, b: Vector3, t: number) => {
    const ta = Math.atan2(a.z, a.x), tb = Math.atan2(b.z, b.x);
    let d = tb - ta; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    return cyl(ta + d * t, lerp(Math.hypot(a.x, a.z), Math.hypot(b.x, b.z), t), lerp(a.y, b.y, t));
  };
  function desired(y: number): CamState {
    if (!keys.length) return hero();
    if (!S.motion) { // calme : caméra fixe, seule la pénombre suit la section
      const h = hero(), L = S.L, c = y + S.vh / 2;
      h.dim = c > L.atlas.top && c < L.horizon.top ? 0.45 : c > L.apropos.top && c < L.horizon.top ? 0.25 : 0;
      return h;
    }
    let i = 0; while (i < keys.length - 1 && keys[i + 1].y <= y) i++;
    const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
    const A = a.f();
    if (a === b || b.y - a.y < 1) return A;
    const B = b.f();
    const t = smooth(clamp((y - a.y) / (b.y - a.y), 0, 1));
    const hiA = A.hi >= 0 ? 1 - t : 0, hiB = B.hi >= 0 ? t : 0;
    return {
      pos: lerpCyl(A.pos, B.pos, t), target: A.target.clone().lerp(B.target, t),
      sx: lerp(A.sx, B.sx, t), sy: lerp(A.sy, B.sy, t), fov: lerp(A.fov, B.fov, t), dim: lerp(A.dim, B.dim, t), lens: lerp(A.lens, B.lens, t),
      hi: hiA >= hiB ? A.hi : B.hi, hiAmt: Math.pow(Math.max(hiA, hiB), 2.5) * (A.hi >= 0 || B.hi >= 0 ? 1 : 0),
    };
  }
  return { build, desired, hero };
}
