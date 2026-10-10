/**
 * Réglages de qualité. Trois profils :
 * - full (ordinateur) : proche du prototype (52 000 particules, HalfFloat, flou de vitesse) ;
 * - mid (téléphone costaud, choisi après une visite fluide en « lite ») : DPR jusqu'à 2,
 *   ~26 000 particules, quelques nébuleuses, toujours sans HalfFloat ;
 * - lite (téléphone par défaut) : DPR 1, moins de 8 000 particules, pas de nébuleuses,
 *   toile plafonnée, GPU basse consommation.
 * Si un profil rame ou plante, gl.ts redescend d'un cran (mid → lite → ciel CSS).
 */
export type Tier = 'full' | 'mid' | 'lite';
export interface Quality {
  tier: Tier;
  /** vrai sur téléphone (mid ou lite) */
  lite: boolean;
  dpr: number; maxDpr: number; minDpr: number;
  maxPixels: number;
  galaxy: number; disk: number; background: number; nebula: number; glow: number; glowMax: number; pointK: number;
  halfFloat: boolean; warp: boolean; adapt: boolean;
  power: WebGLPowerPreference;
  exposure: number;
}

export function quality(tier: Tier, forceHQ: boolean): Quality {
  const dev = window.devicePixelRatio || 1;
  if (tier === 'mid') {
    const d = Math.min(dev, 2);
    return {
      tier, lite: true, dpr: d, maxDpr: d, minDpr: 1, maxPixels: 1.8e6,
      galaxy: 22000, disk: 6000, background: 1500, nebula: 180, glow: 10, glowMax: 420, pointK: 118,
      halfFloat: false, warp: false, adapt: true, power: 'high-performance', exposure: 1.85,
    };
  }
  if (tier === 'lite') {
    return {
      tier, lite: true, dpr: 1, maxDpr: 1, minDpr: 0.75, maxPixels: 1280 * 900,
      galaxy: 5600, disk: 1700, background: 600, nebula: 0, glow: 6, glowMax: 260, pointK: 125,
      halfFloat: false, warp: false, adapt: false, power: 'low-power', exposure: 2.1,
    };
  }
  const maxDpr = Math.min(dev, 1.75);
  return {
    tier, lite: false, dpr: forceHQ ? maxDpr : Math.min(maxDpr, 1.5), maxDpr, minDpr: 0.75, maxPixels: 3840 * 2400,
    galaxy: 52000, disk: 14000, background: 3200, nebula: 640, glow: 14, glowMax: 700, pointK: 110,
    halfFloat: true, warp: true, adapt: !forceHQ, power: 'high-performance', exposure: 1.6,
  };
}
