/* Shaders GLSL de la scène (Three.js r169, WebGL2). */

/** Points génériques : galaxie, nébuleuses, lueur du bulbe. */
export const pointVS = /* glsl */ `
  attribute vec3 aColor; attribute float aSize; attribute float aAlpha; attribute float aSeed;
  uniform float uTime; uniform float uPR; uniform float uK; uniform float uTwinkle; uniform float uMaxS;
  varying vec3 vColor; varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float s = SIZE_EXPR;
    float a = aAlpha * smoothstep(2.5, 11.0, -mv.z);
    float minS = 1.4 * uPR;
    if (s < minS) { a *= (s / minS) * (s / minS); s = minS; }
    if (s > uMaxS * uPR) { a *= (uMaxS * uPR) / s; s = uMaxS * uPR; }
    gl_PointSize = s;
    float tw = 1.0 + uTwinkle * 0.45 * sin(uTime * (0.7 + aSeed * 2.6) + aSeed * 61.0);
    vColor = aColor; vAlpha = a * tw;
  }`;
/** Taille en perspective (galaxie) ou fixe (étoiles lointaines). */
export const SIZE_PERSPECTIVE = 'aSize * uK * uPR / max(0.1, -mv.z)';
export const SIZE_FIXED = 'aSize * uPR';

export const pointFS = /* glsl */ `
  varying vec3 vColor; varying float vAlpha; uniform float uOpacity;
  void main() {
    vec2 c = gl_PointCoord - 0.5; float d = length(c) * 2.0;
    float a = exp(-d * d * 4.5) * smoothstep(1.0, 0.75, d);
    gl_FragColor = vec4(vColor, a * vAlpha * uOpacity);
  }`;

/** Disque d'accrétion : rotation képlérienne et effet Doppler relativiste. */
export const diskVS = /* glsl */ `
  attribute float aR; attribute float aA; attribute float aH; attribute float aSeed;
  uniform float uTime; uniform float uPR; uniform float uSpin;
  varying vec3 vColor; varying float vA;
  void main() {
    float om = 0.9 * pow(aR / 2.3, -1.5);
    float ang = aA + uTime * om * uSpin;
    vec3 p = vec3(cos(ang) * aR, aH, sin(ang) * aR);
    vec4 w = modelMatrix * vec4(p, 1.0);
    vec3 vel = normalize((modelMatrix * vec4(-sin(ang), 0.0, cos(ang), 0.0)).xyz);
    vec3 toCam = normalize(cameraPosition - w.xyz);
    float dop = clamp(1.0 + 0.75 * dot(vel, toCam), 0.25, 1.9);
    vec4 mv = viewMatrix * w;
    gl_Position = projectionMatrix * mv;
    float t = clamp((aR - 2.3) / 6.5, 0.0, 1.0);
    vec3 hot = mix(vec3(1.0, 0.93, 0.8), vec3(1.0, 0.42, 0.12), pow(t, 0.7));
    vColor = hot * dop * dop * (1.25 - t * 0.6);
    float s = (0.9 + aSeed * 1.6) * 60.0 * uPR / max(0.1, -mv.z);
    vA = 0.7 * smoothstep(1.0, 4.0, -mv.z);
    float minS = 1.3 * uPR; if (s < minS) { vA *= (s / minS); s = minS; }
    gl_PointSize = min(s, 40.0 * uPR);
  }`;
export const diskFS = /* glsl */ `
  varying vec3 vColor; varying float vA;
  void main() { vec2 c = gl_PointCoord - 0.5; float d = length(c) * 2.0; float a = exp(-d * d * 4.0) * smoothstep(1.0, 0.7, d); gl_FragColor = vec4(vColor, a * vA); }`;

/** Étoiles-projets : pointes de diffraction façon JWST. */
export const starVS = /* glsl */ `
  attribute vec3 aColor; attribute float aSize; attribute float aIdx; attribute float aCat;
  uniform float uPR; uniform float uFocus; uniform float uHover; uniform float uSel; uniform float uTime; uniform float uPulse;
  varying vec3 vColor; varying float vBoost; varying float vHot;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float inFocus = (uFocus < -0.5 || abs(aCat - uFocus) < 0.5) ? 1.0 : 0.22;
    float hot = (abs(aIdx - uHover) < 0.5 || abs(aIdx - uSel) < 0.5) ? 1.0 : 0.0;
    float pulse = 1.0 + uPulse * 0.08 * sin(uTime * 1.7 + aIdx * 1.3);
    float s = aSize * (1.0 + 0.9 * hot) * pulse * 300.0 * uPR / max(0.1, -mv.z);
    gl_PointSize = clamp(s, 10.0 * uPR, 150.0 * uPR);
    vColor = aColor; vBoost = inFocus * (1.0 + 0.6 * hot); vHot = hot;
  }`;
export const starFS = /* glsl */ `
  varying vec3 vColor; varying float vBoost; varying float vHot;
  void main() {
    vec2 p = (gl_PointCoord - 0.5) * 2.0; float r = length(p);
    float core = exp(-r * r * 90.0) * 1.8;
    float halo = exp(-r * 6.0) * 0.5;
    float fade = 1.0 - smoothstep(0.2, 1.0, r);
    float sx = exp(-abs(p.y) * 55.0) * fade, sy = exp(-abs(p.x) * 55.0) * fade;
    vec2 q = vec2(p.x * 0.5 - p.y * 0.866, p.x * 0.866 + p.y * 0.5);
    vec2 q2 = vec2(p.x * 0.5 + p.y * 0.866, -p.x * 0.866 + p.y * 0.5);
    float d1 = exp(-abs(q.x) * 70.0) * fade * 0.55, d2 = exp(-abs(q2.x) * 70.0) * fade * 0.55;
    float spikes = (sy * 1.0 + sx * 0.35 + d1 + d2) * 0.9;
    float ring = vHot * exp(-pow((r - 0.62) * 18.0, 2.0)) * 0.7;
    float a = (core + halo + spikes + ring) * vBoost;
    vec3 col = mix(vColor, vec3(1.0), clamp(core * 0.6, 0.0, 0.85));
    gl_FragColor = vec4(col, a);
  }`;

/** Halo de sélection (billboard à six branches). */
export const flareVS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
export const flareFS = /* glsl */ `
  varying vec2 vUv; uniform vec3 uColor; uniform float uOpacity; uniform float uTime;
  float spike(vec2 p, float ang, float w) { vec2 d = vec2(cos(ang), sin(ang)); float along = abs(dot(p, d)); float perp = abs(dot(p, vec2(-d.y, d.x))); return exp(-perp * w) * pow(max(0.0, 1.0 - along), 2.2); }
  void main() {
    vec2 p = (vUv - 0.5) * 2.0; float r = length(p);
    float s = spike(p, 1.5708, 220.0) + spike(p, 1.5708 + 1.0472, 220.0) + spike(p, 1.5708 - 1.0472, 220.0) + 0.5 * spike(p, 0.0, 300.0);
    float halo = exp(-r * 9.0) * 0.5 + exp(-r * 30.0) * 1.1;
    float ring = exp(-pow((r - 0.2 - 0.015 * sin(uTime * 2.0)) * 60.0, 2.0)) * 0.25;
    vec3 col = mix(uColor, vec3(1.0), 0.35);
    gl_FragColor = vec4(col, (s * 1.3 + halo + ring) * uOpacity);
  }`;

/** Passe finale : lentille gravitationnelle (β = θ − θE²/θ), flou de vitesse, tonemapping, vignettage, grain. */
export const postVS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
export const postFS = /* glsl */ `
  uniform sampler2D tScene; uniform vec2 uRes; uniform vec2 uBH; uniform float uRe; uniform float uAspect;
  uniform float uWarp; uniform float uTime; uniform float uDim; uniform float uFade; uniform float uExposure; uniform float uGrain;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec2 d = vUv - uBH; d.x *= uAspect; float r = length(d);
    vec2 suv = vUv; float shadow = 1.0; float ring = 0.0;
    if (uRe > 0.0005) {
      float rr = max(r, 1e-4);
      float beta = rr - uRe * uRe / rr;
      vec2 sp = (d / rr) * beta; sp.x /= uAspect;
      suv = uBH + sp;
      shadow = smoothstep(uRe * 0.585, uRe * 0.64, r);
      ring = exp(-pow((r - uRe * 0.655) / (uRe * 0.028), 2.0)) + 0.35 * exp(-pow((r - uRe * 0.69) / (uRe * 0.07), 2.0));
    }
    vec3 col;
#ifdef WARP
    if (uWarp > 0.02) {
      vec2 c = vec2(0.5); vec2 tc = suv - c; col = vec3(0.0);
      for (int i = 0; i < 10; i++) {
        float t = float(i) / 9.0; float s = 1.0 - uWarp * 0.11 * t;
        col.r += texture2D(tScene, c + tc * (s - uWarp * 0.006)).r;
        col.g += texture2D(tScene, c + tc * s).g;
        col.b += texture2D(tScene, c + tc * (s + uWarp * 0.006)).b;
      }
      col /= 10.0;
    } else col = texture2D(tScene, suv).rgb;
#else
    col = texture2D(tScene, suv).rgb;
#endif
    col = 1.0 - exp(-col * uExposure);
    col *= shadow;
    col += vec3(1.0, 0.68, 0.38) * ring * 0.5 * smoothstep(0.004, 0.03, uRe);
    vec2 vv = vUv - 0.5; vv.x *= uAspect * 0.75;
    col *= 1.0 - smoothstep(0.38, 1.0, length(vv)) * 0.6;
    col *= 1.0 - uDim;
    col += (hash(vUv * uRes + fract(uTime * 7.0) * 91.0) - 0.5) * uGrain;
    gl_FragColor = vec4(max(col * uFade, 0.0), 1.0);
  }`;
