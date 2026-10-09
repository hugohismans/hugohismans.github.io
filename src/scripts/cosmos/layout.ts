/**
 * Placement des amas et des étoiles-projets, calculé depuis les données uniquement.
 * Les amas sont posés sur les bras spiraux (angle = bras + rayon·TWIST), du centre
 * vers l'extérieur dans l'ordre des catégories ; une catégorie peut imposer sa
 * position via `amas: { angle, rayon }` dans le catalogue. Une 8e catégorie ou
 * davantage de phares n'exigent aucun changement de code.
 */
import { Color, Vector3 } from 'three';
import type { SceneData } from '../core';

export const R = 60, TWIST = 0.075;
export const cyl = (th: number, r: number, y = 0) => new Vector3(Math.cos(th) * r, y, Math.sin(th) * r);

export function hashStr(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function rng(seed: number) {
  let a = seed;
  const rnd = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  return { rnd, gauss };
}

export interface Cluster { id: string; color: Color; th: number; r: number; pos: Vector3; label: string; letter: string; css: string }
export interface Star { slug: string; title: string; n: string; cat: number; color: string; pos: Vector3; size: number; related: string[] }

const ARMS = [0, Math.PI, Math.PI / 2, Math.PI * 1.5];
const R_MIN = 12, R_MAX = 46;

export function layoutClusters(data: SceneData): Cluster[] {
  const n = data.cats.length;
  return data.cats.map((c, i) => {
    const r = c.amas?.rayon ?? (n > 1 ? R_MIN + ((R_MAX - R_MIN) * i) / (n - 1) : 24);
    const arm = c.amas ? (c.amas.angle * Math.PI) / 180 : ARMS[i % ARMS.length];
    const th = c.amas ? arm : arm + r * TWIST;
    return { id: c.id, color: new Color(c.color), th, r, pos: cyl(th, r, 0), label: c.label, letter: c.l, css: c.color };
  });
}

/** Étoiles-projets en phyllotaxie autour de leur amas ; les plus brillantes au centre. */
export function layoutStars(data: SceneData, clusters: Cluster[]): Star[] {
  const stars: Star[] = [];
  clusters.forEach((cl, ci) => {
    const weight = (p: SceneData['projects'][number]) => (p.f ? 20 - p.f : 0) + p.k;
    const members = data.projects.filter((p) => p.c === ci).sort((a, b) => weight(b) - weight(a));
    const spread = 2.4 + 1.25 * Math.sqrt(members.length);
    members.forEach((p, k) => {
      const h = hashStr(p.s);
      const rad = spread * Math.sqrt((k + 0.6) / members.length);
      const a = k * 2.39996 + (h % 628) / 100;
      const y = (((h >>> 10) % 1000) / 1000 - 0.5) * 2.4;
      const pos = cl.pos.clone().add(new Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad));
      stars.push({ slug: p.s, title: p.t, n: p.n, cat: ci, color: cl.css, pos, size: 0.55 + Math.pow(p.k / 10, 2) * 1.25 + (p.f ? 0.35 : 0), related: p.r });
    });
  });
  return stars;
}
