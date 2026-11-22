/**
 * AlloFlow — Label Positions Module
 *
 * LABEL_POSITIONS lookup: 9 named CSS-position styles (top-left, center,
 * bottom-right, etc.) used by the Visual Panel grid for absolute label
 * placement. Pure data, single consumer.
 *
 * Extracted verbatim from AlloFlowANTI.txt lines 1137-1147 (May 2026).
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.AlloModules && window.AlloModules.LabelPositions) {
    console.log('[CDN] LabelPositionsModule already loaded, skipping');
    return;
  }

  const LABEL_POSITIONS = Object.freeze(Object.assign(Object.create(null), {
    'top-left': Object.freeze({ position: 'absolute', top: '6%', left: '6%', zIndex: 4 }),
    'top-center': Object.freeze({ position: 'absolute', top: '6%', left: '50%', transform: 'translateX(-50%)', zIndex: 4 }),
    'top-right': Object.freeze({ position: 'absolute', top: '6%', right: '6%', zIndex: 4 }),
    'center-left': Object.freeze({ position: 'absolute', top: '50%', left: '6%', transform: 'translateY(-50%)', zIndex: 4 }),
    'center': Object.freeze({ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 4 }),
    'center-right': Object.freeze({ position: 'absolute', top: '50%', right: '6%', transform: 'translateY(-50%)', zIndex: 4 }),
    'bottom-left': Object.freeze({ position: 'absolute', top: '85%', left: '6%', zIndex: 4 }),
    'bottom-center': Object.freeze({ position: 'absolute', top: '85%', left: '50%', transform: 'translateX(-50%)', zIndex: 4 }),
    'bottom-right': Object.freeze({ position: 'absolute', top: '85%', right: '6%', zIndex: 4 }),
  }));

  window.LABEL_POSITIONS = LABEL_POSITIONS;

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.LabelPositions = Object.freeze({ LABEL_POSITIONS: LABEL_POSITIONS });

  if (typeof window._upgradeLabelPositions === 'function') {
    try { window._upgradeLabelPositions(); } catch (e) { console.warn('[LabelPositions] upgrade hook failed:', e && e.message ? e.message : String(e)); }
  }

  console.log('[CDN] LabelPositionsModule loaded — ' + Object.keys(LABEL_POSITIONS).length + ' positions');
})();
