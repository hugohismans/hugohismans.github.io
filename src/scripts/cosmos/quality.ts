/**
 * Réglages de qualité. Deux profils :
 * - bureau : proche du prototype (52 000 particules, HalfFloat, flou de vitesse) ;
 * - léger (tactile ou écran étroit) : DPR 1, moins de 8 000 particules, pas de
 *   HalfFloat, pas de nébuleuses, toile plafonnée, GPU basse consommation.
 */
export interface Quality {
  lite: boolean;
  dpr: number; maxDpr: number; minDpr: number;
  maxPixels: number;
  galaxy: number; disk: number; background: number; nebula: number; glow: number; glowMax: number; pointK: number;
  halfFloat: boolean; warp: boolean; adapt: boolean;
  power: WebGLPowerPreference;
  exposure: number;
}

export function quality(lite: boolean, forceHQ: boolean): Quality {
  const dev = window.devicePixelRatio || 1;
  if (lite) {
    return {
      lite: true, dpr: 1, maxDpr: 1, minDpr: 0.75, maxPixels: 1280 * 900,
      galaxy: 5600, disk: 1700, background: 600, nebula: 0, glow: 6, glowMax: 260, pointK: 125,
      halfFloat: false, warp: false, adapt: false, power: 'low-power', exposure: 2.1,
    };
  }
  const maxDpr = Math.min(dev, 1.75);
  return {
    lite: false, dpr: forceHQ ? maxDpr : Math.min(maxDpr, 1.5), maxDpr, minDpr: 0.75, maxPixels: 3840 * 2400,
    galaxy: 52000, disk: 14000, background: 3200, nebula: 640, glow: 14, glowMax: 700, pointK: 110,
    halfFloat: true, warp: true, adapt: !forceHQ, power: 'high-performance', exposure: 1.6,
  };
}
