/**
 * Scène 3D : galaxie, étoiles-projets, lentille gravitationnelle de Sgr A*.
 * Chargée par import() dynamique après le premier rendu, jamais en mode calme.
 * Ne lit que les données (SceneData) : aucune table de projets ou d'amas ici.
 */
import {
  ColorManagement, HalfFloatType, LinearSRGBColorSpace, MirroredRepeatWrapping, PerspectiveCamera, Scene,
  UnsignedByteType, Vector3, WebGLRenderTarget, WebGLRenderer,
} from 'three';
import { S, root, addTask, holdLoop, kick, lerp, clamp, finePointer, type SceneData } from '../core';
import { layoutClusters, layoutStars, rng } from './layout';
import { buildGalaxy } from './galaxy';
import { buildStars } from './stars';
import { buildLens } from './lens';
import { createCamera } from './camera';
import { createLabels } from './labels';
import { quality } from './quality';

export interface CosmosApi {
  relayout(): void;
  focus(cat: string): void;
  select(slug: string | null): void;
  dispose(): void;
}
export interface CosmosOpts {
  lite: boolean;
  forceHQ: boolean;
  still: boolean;
  onOpen: (slug: string) => void;
  /** Appelé après quelques images rendues sans erreur. */
  onHealthy: () => void;
  /** Appelé si la scène doit être abandonnée (contexte perdu, trop lente). */
  onFail: (reason: string) => void;
}

export function createCosmos(data: SceneData, opts: CosmosOpts): CosmosApi {
  ColorManagement.enabled = false;
  const q = quality(opts.lite, opts.forceHQ);
  const canvas = document.getElementById('cosmos') as HTMLCanvasElement;
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, depth: false, powerPreference: q.power, preserveDrawingBuffer: false });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setClearColor(0x04050b, 1);
  let dpr = q.dpr;
  const halfOK = q.halfFloat && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
  const rt = new WebGLRenderTarget(4, 4, { type: halfOK ? HalfFloatType : UnsignedByteType, depthBuffer: false, stencilBuffer: false, wrapS: MirroredRepeatWrapping, wrapT: MirroredRepeatWrapping });

  const { rnd, gauss } = rng(20260809);
  const scene = new Scene();
  const camera = new PerspectiveCamera(42, S.vw / S.vh, 0.1, 2000);
  const clusters = layoutClusters(data);
  const stars = layoutStars(data, clusters);
  const G = buildGalaxy(q, clusters, rnd, gauss);
  scene.add(G.galaxy, G.background);
  const ST = buildStars(G.galaxy, clusters, stars);
  scene.add(ST.flare);
  const lens = buildLens(rt.texture, q.warp, q.exposure);
  const catIdx = new Map(data.cats.map((c, i) => [c.id, i]));
  const cam = createCamera(clusters, stars, ST.index, catIdx);
  const labels = createLabels({ clusters, stars, clusterTpl: data.i18n.cluster, onOpen: opts.onOpen });
  const prU = [...G.prUniforms, ST.starM.uniforms];

  /* ---------- taille : sur mobile, on ignore les variations de hauteur dues à la barre d'adresse */
  let W = 0, H = 0;
  function resize(force = false) {
    const w = canvas.clientWidth || S.vw, h = canvas.clientHeight || S.vh;
    if (!force && q.lite && w === W && Math.abs(h - H) < 160) return;
    W = w; H = h;
    let d = dpr;
    if (w * h * d * d > q.maxPixels) d = Math.sqrt(q.maxPixels / (w * h));
    renderer.setPixelRatio(d);
    renderer.setSize(w, h, false);
    rt.setSize(Math.max(2, Math.floor(w * d)), Math.max(2, Math.floor(h * d)));
    camera.aspect = w / h;
    lens.u.uRes.value.set(w * d, h * d);
    lens.u.uAspect.value = w / h;
    for (const u of prU) u.uPR.value = d;
    needRender = true;
  }

  /* ---------- qualité adaptative (bureau) */
  let ft = 0, fc = 0, adapted = 0;
  function adapt(dt: number) {
    if (!q.adapt) return;
    ft += dt; fc++;
    if (fc < 90) return;
    const avg = ft / fc; ft = 0; fc = 0;
    if (avg > 0.028 && dpr > q.minDpr) { dpr = Math.max(q.minDpr, dpr - 0.25); resize(true); adapted++; }
    else if (avg < 0.012 && dpr < q.maxDpr && adapted < 2) { dpr = Math.min(q.maxDpr, dpr + 0.25); resize(true); }
  }

  const tmpV = new Vector3(), tmpV2 = new Vector3(), world = new Vector3(), right = new Vector3();
  function project(v: Vector3, out: number[]) {
    tmpV.copy(v).applyMatrix4(G.galaxy.matrixWorld);
    tmpV2.copy(tmpV).applyMatrix4(camera.matrixWorldInverse);
    const behind = tmpV2.z > -0.1;
    tmpV.project(camera);
    out[0] = (tmpV.x * 0.5 + 0.5) * W; out[1] = (-tmpV.y * 0.5 + 0.5) * H; out[2] = behind ? -1 : -tmpV2.z;
    return out;
  }

  /* ---------- état amorti */
  const H0 = cam.hero();
  const fly = S.motion && !opts.still;
  const cur = { pos: fly ? new Vector3(Math.cos(1.1) * 170, 110, Math.sin(1.1) * 170) : H0.pos.clone(), target: new Vector3(), sx: H0.sx, sy: H0.sy, fov: H0.fov, dim: 0, lens: 1, hiAmt: 0, hi: -1, fade: opts.still ? 1 : 0 };
  let time = 0, introT = 0, focusCat = -1, selIdx = -1, needRender = true, lastDim = -1, frames = 0, healthy = false, disposed = false;
  let slowFrames = 0, odd = false;
  const o3 = [0, 0, 0];

  resize(true);
  cam.build();

  const onLost = (e: Event) => { e.preventDefault(); opts.onFail('context-lost'); };
  canvas.addEventListener('webglcontextlost', onLost);

  const removeTask = addTask((dt) => {
    if (disposed || document.hidden) return;
    const moving = S.motion;
    // après 8 s d'inactivité : une image sur deux
    if (moving && S.idle && !S.modal) { odd = !odd; if (odd) return; dt *= 2; }
    if (moving) { time += dt; introT += dt; }
    const D = cam.desired(S.scroll);
    if (moving && finePointer && S.pointerIn && !S.modal) {
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      D.pos = D.pos.clone().addScaledVector(right, S.nx * 1.8).add(tmpV2.set(0, -S.ny * 1.2, 0));
    }
    const k = moving && !opts.still ? 1 - Math.exp(-dt * (introT < 3 ? 1.6 : 3.4)) : 1;
    cur.pos.lerp(D.pos, k); cur.target.lerp(D.target, k);
    cur.sx = lerp(cur.sx, D.sx, k); cur.sy = lerp(cur.sy, D.sy, k); cur.fov = lerp(cur.fov, D.fov, k);
    cur.dim = lerp(cur.dim, S.modal ? 0.5 : D.dim, moving ? 1 - Math.exp(-dt * 4) : 1);
    cur.lens = lerp(cur.lens, D.lens, k);
    cur.hiAmt = lerp(cur.hiAmt, D.hiAmt || 0, moving ? 1 - Math.exp(-dt * 5) : 1);
    if ((D.hi ?? -1) >= 0) cur.hi = D.hi;
    cur.fade = moving && !opts.still ? Math.min(1, cur.fade + dt / 1.6) : 1;

    G.galaxy.rotation.y = moving ? -time * 0.006 : 0;
    G.galaxy.updateMatrixWorld();
    world.copy(cur.pos).applyMatrix4(G.galaxy.matrixWorld);
    camera.position.copy(world);
    camera.lookAt(tmpV2.copy(cur.target).applyMatrix4(G.galaxy.matrixWorld));
    camera.fov = cur.fov; camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[8] = -cur.sx; camera.projectionMatrix.elements[9] = -cur.sy;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.updateMatrixWorld();

    // trou noir : position à l'écran et rayon d'Einstein apparent
    const bh = project(new Vector3(), o3).slice();
    const u = lens.u;
    if (bh[2] > 0) {
      u.uBH.value.set(bh[0] / W, 1 - bh[1] / H);
      u.uRe.value = (3.1 * cur.lens * camera.projectionMatrix.elements[5]) / (2 * bh[2]);
    } else u.uRe.value = 0;
    const warp = q.warp && moving && !S.modal ? clamp((Math.abs(S.vel) - 900) / 6000, 0, 1) : 0;
    u.uWarp.value = lerp(u.uWarp.value, warp, 1 - Math.exp(-dt * 8));
    u.uTime.value = time; u.uDim.value = cur.dim; u.uFade.value = cur.fade;
    u.uGrain.value = moving ? 0.035 : 0.02;
    for (const uu of G.twinkling) { uu.uTime.value = time; uu.uTwinkle.value = moving ? 1 : 0; }
    G.diskUniforms.uTime.value = time; G.diskUniforms.uSpin.value = moving ? 1 : 0;
    const sm = ST.starM.uniforms;
    sm.uTime.value = time; sm.uPulse.value = moving ? 1 : 0; sm.uFocus.value = focusCat;
    sm.uHover.value = S.hoverSlug ? ST.index.get(S.hoverSlug) ?? -1 : labels.hoverIdx();
    sm.uSel.value = selIdx;
    ST.lineMats.forEach((m, i) => { if (m) m.opacity = lerp(m.opacity, focusCat < 0 ? 0.2 : focusCat === i ? 0.6 : 0.05, moving ? 1 - Math.exp(-dt * 5) : 1); });
    ST.relM.opacity = focusCat < 0 ? 0.12 : 0.05;

    // halo de l'escale courante ou de la fiche ouverte
    const fIdx = selIdx >= 0 ? selIdx : cur.hi, fAmt = selIdx >= 0 ? 1 : cur.hiAmt;
    if (fIdx >= 0 && fAmt > 0.01) {
      const s = stars[fIdx];
      ST.flare.position.copy(s.pos).applyMatrix4(G.galaxy.matrixWorld);
      ST.flare.quaternion.copy(camera.quaternion);
      ST.flare.scale.setScalar(camera.position.distanceTo(ST.flare.position) * (S.mobile ? 1.6 : 1.75));
      ST.flareM.uniforms.uColor.value.set(s.color);
      ST.flareM.uniforms.uOpacity.value = fAmt;
      ST.flare.visible = true;
    } else ST.flare.visible = false;
    ST.flareM.uniforms.uTime.value = time;

    labels.update(project, bh, u.uRe.value, cur.fade, W, H);

    // rendu (à la demande en mode calme ou derrière la fiche)
    const dimNow = Math.round(cur.dim * 100);
    if (S.modal && Math.abs(cur.dim - 0.5) < 0.01 && !needRender) return;
    if (!moving && !needRender && dimNow === lastDim) return;
    lastDim = dimNow; needRender = false;
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(lens.scene, lens.camera);
    frames++;
    if (frames === 2) root.classList.add('gl-on');
    if (!healthy && frames >= 30) { healthy = true; opts.onHealthy(); }
    if (moving) {
      adapt(dt);
      // version légère : si la 3D rame vraiment (moins de 12 i/s pendant 3 s), on rend la main au ciel CSS
      if (q.lite && !opts.forceHQ && introT > 1.5 && introT < 8) { slowFrames = dt > 0.085 ? slowFrames + 1 : Math.max(0, slowFrames - 1); if (slowFrames > 36) opts.onFail('slow'); }
    }
  });
  holdLoop(true);
  if (!S.motion) kick(4);

  return {
    relayout() { resize(); cam.build(); needRender = true; kick(); },
    focus(cat) { focusCat = cat === 'all' ? -1 : catIdx.get(cat) ?? -1; needRender = true; kick(); },
    select(slug) { selIdx = slug ? ST.index.get(slug) ?? -1 : -1; needRender = true; kick(); },
    dispose() {
      if (disposed) return;
      disposed = true;
      removeTask(); holdLoop(false);
      canvas.removeEventListener('webglcontextlost', onLost);
      labels.dispose();
      root.classList.remove('gl-on');
      scene.traverse((o) => {
        const m = o as unknown as { geometry?: { dispose(): void }; material?: { dispose(): void } };
        m.geometry?.dispose(); m.material?.dispose();
      });
      lens.mat.dispose(); rt.dispose();
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch { /* déjà perdu */ }
    },
  };
}
