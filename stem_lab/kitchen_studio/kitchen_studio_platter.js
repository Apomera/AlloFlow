/* A platter drop expresses a decision; the studio engine checks its evidence. */
(function (root) {
  'use strict';
  function valid(point) { return !!point && Number.isFinite(point.x) && Number.isFinite(point.y); }
  function destination(point, start, hit) {
    if (!valid(point) || !valid(start)) return { action: null, target: null, message: 'Carry the platter back into the kitchen.' };
    if (hit !== 'oven' && hit !== 'serve') return { action: null, target: null, message: 'Carry the platter to the oven or serving place.' };
    if (Math.hypot(point.x - start.x, point.y - start.y) < 10) return { action: null, target: hit, message: 'Lift and carry the platter before releasing.' };
    return hit === 'oven'
      ? { action: 'cook', target: hit, message: 'Release to continue cooking one simulated step.' }
      : { action: 'serve', target: hit, message: 'Release to serve the chicken.' };
  }
  var api = { destination: destination };
  root.KitchenStudioPlatter = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
