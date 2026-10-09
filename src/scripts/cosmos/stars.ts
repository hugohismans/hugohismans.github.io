/**
 * Étoiles-projets (pointes de diffraction), constellations (arbre couvrant
 * minimal par amas + traits pointillés entre projets liés) et halo de sélection.
 */
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, LineBasicMaterial, LineDashedMaterial, LineSegments,
  Mesh, PlaneGeometry, Points, ShaderMaterial, type Group, type Vector3,
} from 'three';
import { starVS, starFS, flareVS, flareFS } from './shaders';
import type { Cluster, Star } from './layout';

export function buildStars(galaxy: Group, clusters: Cluster[], stars: Star[]) {
  const n = stars.length;
  const sp = new Float32Array(n * 3), sc = new Float32Array(n * 3), ss = new Float32Array(n), si = new Float32Array(n), scat = new Float32Array(n);
  stars.forEach((s, i) => {
    sp.set([s.pos.x, s.pos.y, s.pos.z], i * 3);
    const c = new Color(s.color); sc.set([c.r, c.g, c.b], i * 3);
    ss[i] = s.size; si[i] = i; scat[i] = s.cat;
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(sp, 3)); g.setAttribute('aColor', new BufferAttribute(sc, 3));
  g.setAttribute('aSize', new BufferAttribute(ss, 1)); g.setAttribute('aIdx', new BufferAttribute(si, 1)); g.setAttribute('aCat', new BufferAttribute(scat, 1));
  const starM = new ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: 1 }, uFocus: { value: -1 }, uHover: { value: -1 }, uSel: { value: -1 }, uPulse: { value: 1 } },
    vertexShader: starVS, fragmentShader: starFS,
  });
  const pts = new Points(g, starM); pts.frustumCulled = false; galaxy.add(pts);

  /* constellations : arbre couvrant minimal (Prim) des projets de chaque amas */
  const lineMats: (LineBasicMaterial | null)[] = clusters.map((cl, ci) => {
    const P = stars.filter((s) => s.cat === ci).map((s) => s.pos);
    if (P.length < 2) return null;
    const used = [0], seg: Vector3[] = [];
    while (used.length < P.length) {
      let best: [number, number, number] | null = null;
      for (const a of used) for (let b = 0; b < P.length; b++) if (!used.includes(b)) { const d = P[a].distanceToSquared(P[b]); if (!best || d < best[2]) best = [a, b, d]; }
      used.push(best![1]); seg.push(P[best![0]], P[best![1]]);
    }
    const m = new LineBasicMaterial({ color: cl.color, transparent: true, opacity: 0.22, depthWrite: false, depthTest: false, blending: AdditiveBlending });
    galaxy.add(new LineSegments(new BufferGeometry().setFromPoints(seg), m));
    return m;
  });

  /* projets liés : traits pointillés */
  const idx = new Map(stars.map((s, i) => [s.slug, i]));
  const rel: Vector3[] = [], seen = new Set<string>();
  for (const s of stars) for (const r of s.related) {
    const j = idx.get(r); if (j == null) continue;
    const k = [s.slug, r].sort().join('|'); if (seen.has(k)) continue;
    seen.add(k); rel.push(s.pos, stars[j].pos);
  }
  const relM = new LineDashedMaterial({ color: 0xbdb7d4, transparent: true, opacity: 0.1, dashSize: 0.8, gapSize: 0.8, depthWrite: false, depthTest: false, blending: AdditiveBlending });
  const relLines = new LineSegments(new BufferGeometry().setFromPoints(rel), relM); relLines.computeLineDistances(); galaxy.add(relLines);

  /* halo de sélection */
  const flareM = new ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending,
    uniforms: { uColor: { value: new Color('#ffffff') }, uOpacity: { value: 0 }, uTime: { value: 0 } },
    vertexShader: flareVS, fragmentShader: flareFS,
  });
  const flare = new Mesh(new PlaneGeometry(1, 1), flareM); flare.frustumCulled = false;

  return { starM, lineMats, relM, flare, flareM, index: idx };
}
