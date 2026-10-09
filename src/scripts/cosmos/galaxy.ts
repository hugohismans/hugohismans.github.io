/**
 * Galaxie procédurale : bras spiraux, bulbe, halo, nébuleuses par amas,
 * lueur du bulbe, fond d'étoiles lointaines et disque d'accrétion de Sgr A*.
 */
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, Points, ShaderMaterial, Vector3,
} from 'three';
import { pointVS, pointFS, SIZE_PERSPECTIVE, SIZE_FIXED, diskVS, diskFS } from './shaders';
import { R, TWIST, cyl, type Cluster } from './layout';
import type { Quality } from './quality';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
type Fill = (i: number, pos: Float32Array, col: Float32Array, size: Float32Array, alpha: Float32Array, seed: Float32Array) => void;
export type U = Record<string, { value: any }>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function makePoints(n: number, fill: Fill, uniforms: U = {}, fixed = false) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) fill(i, pos, col, size, alpha, seed);
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aColor', new BufferAttribute(col, 3));
  g.setAttribute('aSize', new BufferAttribute(size, 1));
  g.setAttribute('aAlpha', new BufferAttribute(alpha, 1));
  g.setAttribute('aSeed', new BufferAttribute(seed, 1));
  const m = new ShaderMaterial({
    vertexShader: pointVS.replace('SIZE_EXPR', fixed ? SIZE_FIXED : SIZE_PERSPECTIVE), fragmentShader: pointFS,
    transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: 1 }, uK: { value: 110 }, uTwinkle: { value: 1 }, uOpacity: { value: 1 }, uMaxS: { value: 26 }, ...uniforms },
  });
  const pts = new Points(g, m); pts.frustumCulled = false;
  return pts;
}

export function buildGalaxy(q: Quality, clusters: Cluster[], rnd: () => number, gauss: () => number) {
  const galaxy = new Group();
  const twinkling: U[] = []; // uniformes qui scintillent (uTime, uTwinkle)
  const prUniforms: U[] = []; // uniformes qui suivent le ratio de pixels

  /* ---------- bras, bulbe, halo */
  const cIn = new Color('#ffd9a8'), cMid = new Color('#e9b9d8'), cOut = new Color('#7f95ff'), cHII = new Color('#ff6fa8'), cBlue = new Color('#9fd0ff'), cBulge = new Color('#fff1dc');
  const tmp = new Color();
  const gal = makePoints(q.galaxy, (i, pos, col, size, alpha, seed) => {
    const kind = rnd();
    let x: number, y: number, z: number, r: number;
    if (kind < 0.1) {
      r = Math.abs(gauss()) * 6 + 1.0;
      const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1);
      x = r * Math.sin(ph) * Math.cos(th); z = r * Math.sin(ph) * Math.sin(th); y = r * Math.cos(ph) * 0.55;
      tmp.copy(cIn).lerp(cBulge, rnd() * 0.5);
      alpha[i] = 0.55 + rnd() * 0.35; size[i] = 0.7 + Math.pow(rnd(), 5) * 2.5;
    } else if (kind < 0.27) {
      r = 3 + Math.sqrt(rnd()) * R * 1.05;
      const th = rnd() * Math.PI * 2;
      x = Math.cos(th) * r; z = Math.sin(th) * r; y = gauss() * (0.5 + 2.2 * Math.exp(-r / 8));
      tmp.copy(cIn).lerp(cOut, smooth(clamp(r / R, 0, 1)));
      alpha[i] = 0.2 + rnd() * 0.25; size[i] = 0.6 + Math.pow(rnd(), 6) * 2;
    } else {
      const arm = i % 4, major = arm % 2 === 0;
      r = 2.5 + Math.pow(rnd(), 1.25) * R;
      const th = (arm / 4) * Math.PI * 2 + r * TWIST + (major ? 0 : 0.35);
      const sc = (0.25 + 0.75 * (r / R)) * (major ? 4.4 : 6.8);
      x = Math.cos(th) * r + Math.pow(rnd(), 3) * (rnd() < 0.5 ? -1 : 1) * sc;
      z = Math.sin(th) * r + Math.pow(rnd(), 3) * (rnd() < 0.5 ? -1 : 1) * sc;
      y = gauss() * (0.35 + 2.4 * Math.exp(-r / 7)) * 0.6;
      const t = smooth(clamp(r / R, 0, 1));
      tmp.copy(cIn).lerp(cMid, clamp(t * 1.8, 0, 1)).lerp(cOut, clamp(t * 1.4 - 0.25, 0, 1));
      if (major && rnd() < 0.06) tmp.copy(cHII);
      else if (rnd() < 0.05) tmp.copy(cBlue);
      alpha[i] = (major ? 0.62 : 0.4) + rnd() * 0.4; size[i] = 0.75 + Math.pow(rnd(), 7) * 4.5;
    }
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    const b = 0.65 + rnd() * 0.5;
    col[i * 3] = tmp.r * b; col[i * 3 + 1] = tmp.g * b; col[i * 3 + 2] = tmp.b * b;
    seed[i] = rnd();
  }, { uK: { value: q.pointK } });
  galaxy.add(gal);
  twinkling.push(gal.material.uniforms); prUniforms.push(gal.material.uniforms);

  /* ---------- lueur du bulbe : grands voiles chauds, que la lentille change en anneau d'Einstein */
  if (q.glow > 0) {
    const glow = makePoints(q.glow, (i, pos, col, size, alpha, seed) => {
      const r = Math.abs(gauss()) * 2.2 + 0.6, th = rnd() * Math.PI * 2;
      pos[i * 3] = Math.cos(th) * r; pos[i * 3 + 1] = gauss() * 0.5; pos[i * 3 + 2] = Math.sin(th) * r;
      const c = new Color(rnd() < 0.5 ? '#ffb070' : '#ffd6a0');
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      size[i] = 60 + rnd() * 90; alpha[i] = 0.06 + rnd() * 0.05; seed[i] = rnd();
    }, { uTwinkle: { value: 0 }, uMaxS: { value: q.glowMax } });
    galaxy.add(glow); prUniforms.push(glow.material.uniforms);
  }

  /* ---------- nébuleuses : voiles colorés autour des amas et le long des bras */
  if (q.nebula > 0) {
    const perCluster = Math.floor((q.nebula * 0.5) / Math.max(1, clusters.length));
    const neb = makePoints(q.nebula, (i, pos, col, size, alpha, seed) => {
      let p: Vector3, c: Color;
      if (i < clusters.length * perCluster) {
        const cl = clusters[i % clusters.length];
        const sp = 3 + rnd() * 6;
        p = cl.pos.clone().add(new Vector3(gauss() * sp, gauss() * 1.2, gauss() * sp));
        c = cl.color.clone().lerp(new Color('#ffffff'), 0.1);
        alpha[i] = 0.05 + rnd() * 0.05; size[i] = 10 + rnd() * 26;
      } else {
        const arm = (i % 2) * 2, r = 6 + rnd() * R * 0.9, th = (arm / 4) * Math.PI * 2 + r * TWIST + gauss() * 0.12;
        p = cyl(th, r + gauss() * 2, gauss() * 0.8);
        c = new Color(rnd() < 0.5 ? '#c86cff' : rnd() < 0.5 ? '#ff7aa2' : '#5aa7ff');
        alpha[i] = 0.025 + rnd() * 0.04; size[i] = 12 + rnd() * 30;
      }
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; seed[i] = rnd();
    }, { uTwinkle: { value: 0 }, uMaxS: { value: 220 } });
    galaxy.add(neb); prUniforms.push(neb.material.uniforms);
  }

  /* ---------- fond d'étoiles lointaines (taille fixe) */
  const white = new Color('#ffffff');
  const bg = makePoints(q.background, (i, pos, col, size, alpha, seed) => {
    const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1), r = 600 + rnd() * 300;
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(ph); pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    const c = rnd() < 0.15 ? cIn : rnd() < 0.2 ? cBlue : white;
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    size[i] = 1.2 + Math.pow(rnd(), 8) * 3.2; alpha[i] = 0.25 + rnd() * 0.6; seed[i] = rnd();
  }, { uK: { value: 1 }, uMaxS: { value: 8 } }, true);
  twinkling.push(bg.material.uniforms); prUniforms.push(bg.material.uniforms);

  /* ---------- disque d'accrétion */
  const ND = q.disk;
  const dR = new Float32Array(ND), dA = new Float32Array(ND), dH = new Float32Array(ND), dS = new Float32Array(ND);
  for (let i = 0; i < ND; i++) { const t = Math.pow(rnd(), 1.5); dR[i] = 2.3 + t * 6.5; dA[i] = rnd() * Math.PI * 2; dH[i] = gauss() * 0.06 * (1 + t); dS[i] = rnd(); }
  const dG = new BufferGeometry();
  dG.setAttribute('position', new BufferAttribute(new Float32Array(ND * 3), 3));
  dG.setAttribute('aR', new BufferAttribute(dR, 1)); dG.setAttribute('aA', new BufferAttribute(dA, 1));
  dG.setAttribute('aH', new BufferAttribute(dH, 1)); dG.setAttribute('aSeed', new BufferAttribute(dS, 1));
  const diskM = new ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: 1 }, uSpin: { value: 1 } },
    vertexShader: diskVS, fragmentShader: diskFS,
  });
  const disk = new Points(dG, diskM); disk.frustumCulled = false;
  const bhGroup = new Group(); bhGroup.rotation.set(0.2, 0, 0.12); bhGroup.add(disk); galaxy.add(bhGroup);
  prUniforms.push(diskM.uniforms);

  return { galaxy, background: bg, twinkling, prUniforms, diskUniforms: diskM.uniforms };
}
