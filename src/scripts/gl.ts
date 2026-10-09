/**
 * Démarrage prudent de la scène 3D.
 *
 * Garde-fou contre les plantages (vécu sur iPhone : « Impossible d'ouvrir cette page ») :
 * 1. Le ciel CSS est toujours affiché d'abord, avec tout le contenu.
 * 2. Juste avant de créer le contexte WebGL, on pose le drapeau « hh-gl-boot »
 *    (localStorage + sessionStorage).
 * 3. Il est effacé quand les premières images sont rendues sans erreur (puis ~4 s),
 *    ou quand la page est quittée normalement (pagehide).
 * 4. Si une page se charge alors que le drapeau est encore là, c'est que le
 *    chargement précédent a planté pendant le démarrage : le script du <head>
 *    pose « hh-gl-off » et la 3D n'est plus jamais tentée sur cet appareil
 *    (#avec3d dans l'URL réinitialise ; #sans3d force le ciel CSS).
 */
import { root, S, isLite, store, readData } from './core';
import { onMotion } from './motion';
import type { CosmosApi } from './cosmos/index';

const BOOT = 'hh-gl-boot', OFF = 'hh-gl-off';
const params = new URLSearchParams(location.search);

const markBoot = () => { const v = String(Date.now()); store.set(BOOT, v); store.set(BOOT, v, true); };
const clearBoot = () => { store.del(BOOT); store.del(BOOT, true); };
addEventListener('pagehide', clearBoot);

function allowed() {
  if (root.dataset.gl === 'off' || location.hash === '#sans3d' || params.has('nogl')) return false;
  if (store.get(OFF)) return false;
  if (!S.motion) return false; // jamais de Three.js en mode calme
  return 'WebGL2RenderingContext' in window;
}

export interface GlHooks { onOpen: (slug: string) => void; onReady: (api: CosmosApi) => void }

export function initGL(hooks: GlHooks) {
  const data = readData();
  if (!data || !document.getElementById('cosmos')) return;
  let api: CosmosApi | null = null, booting = false;

  const fail = (reason: string, permanent: boolean) => {
    if (permanent) store.set(OFF, reason);
    clearBoot();
    api?.dispose(); api = null;
    root.classList.remove('gl-on');
  };

  async function boot() {
    if (api || booting || !allowed()) return;
    booting = true;
    const lite = isLite();
    try {
      const mod = await import('./cosmos/index');
      if (!allowed()) return;
      markBoot();
      api = mod.createCosmos(data!, {
        lite,
        forceHQ: params.get('q') === 'high',
        still: params.has('still'),
        onOpen: hooks.onOpen,
        onHealthy: () => { setTimeout(clearBoot, 4000); },
        // trop lent ou contexte perdu : retour au ciel CSS pour cette visite seulement
        onFail: (reason) => fail(reason, false),
      });
      hooks.onReady(api);
    } catch (e) {
      console.warn('3D indisponible, ciel CSS conservé.', e);
      fail('error', false);
    } finally {
      booting = false;
    }
  }

  // Après le premier rendu ; sur mobile, seulement une fois la page chargée et posée.
  const lite = isLite();
  const later = (fn: () => void, ms: number) => ('requestIdleCallback' in window ? requestIdleCallback(() => setTimeout(fn, ms), { timeout: ms + 1500 }) : setTimeout(fn, ms + 200));
  const start = () => later(boot, lite ? 1200 : 60);
  if (document.readyState === 'complete' || !lite) requestAnimationFrame(() => requestAnimationFrame(start));
  else addEventListener('load', start, { once: true });

  onMotion((full) => { if (full) boot(); else api?.relayout(); });
  addEventListener('hashchange', () => {
    if (location.hash === '#sans3d') fail('hash', false);
    if (location.hash === '#avec3d') { store.del(OFF); clearBoot(); root.dataset.gl = 'ok'; boot(); }
  });
  return { get api() { return api; } };
}
