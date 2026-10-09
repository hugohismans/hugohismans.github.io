/** Passe finale plein écran : lentille gravitationnelle de Sgr A* et tonemapping. */
import { Camera, Mesh, PlaneGeometry, Scene, ShaderMaterial, Vector2, type Texture } from 'three';
import { postVS, postFS } from './shaders';

export function buildLens(tex: Texture, warp: boolean, exposure: number) {
  const mat = new ShaderMaterial({
    depthTest: false, depthWrite: false,
    defines: warp ? { WARP: 1 } : {},
    uniforms: {
      tScene: { value: tex }, uRes: { value: new Vector2(1, 1) }, uBH: { value: new Vector2(0.5, 0.5) },
      uRe: { value: 0 }, uAspect: { value: 1 }, uWarp: { value: 0 }, uTime: { value: 0 }, uDim: { value: 0 }, uFade: { value: 0 }, uExposure: { value: exposure }, uGrain: { value: 0.035 },
    },
    vertexShader: postVS, fragmentShader: postFS,
  });
  const scene = new Scene();
  const quad = new Mesh(new PlaneGeometry(2, 2), mat); quad.frustumCulled = false; scene.add(quad);
  return { scene, camera: new Camera(), mat, u: mat.uniforms };
}
