/* Placement expresses a kitchen decision; the host commits it on release. */
(function (root) {
  'use strict';
  // Preserve inclusive world-space edges after decimal projection arithmetic.
  var tolerance = 1e-9;
  function valid(point) {
    return !!point && typeof point === 'object' && !Array.isArray(point) &&
      Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z);
  }
  function empty(message) { return { action: null, target: null, message: message }; }
  function destination(kind, point, start) {
    if (kind !== 'mat' && kind !== 'spatula') return empty('Choose the nonslip mat or spatula to move.');
    if (!valid(point) || !valid(start)) return empty('Carry the tool back onto the workspace.');
    if (Math.hypot(point.x - start.x, point.z - start.z) + tolerance < .12) {
      return empty('Lift and move the tool before releasing.');
    }
    if (kind === 'mat') {
      return Math.abs(point.x + 1.5) <= .42 + tolerance && Math.abs(point.z + .85) <= .28 + tolerance
        ? { action: 'secure', target: 'boardMat', message: 'Release to secure the board on its nonslip mat.' }
        : empty('Carry the nonslip mat beneath the cutting board.');
    }
    var radius = Math.hypot(point.x - .1, point.z + .85);
    if (radius <= .16 + tolerance) return { action: 'crowd', target: 'panCenter', message: 'Release to gather the mushrooms together.' };
    if (radius >= .25 - tolerance && radius <= .41 + tolerance) return { action: 'spread', target: 'panEdge', message: 'Release to spread the mushrooms apart.' };
    return empty('Move the spatula to the center to gather, or toward the pan edge to spread the mushrooms.');
  }
  var api = { destination: destination };
  root.KitchenStudioPlacement = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
