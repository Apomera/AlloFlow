/* Physical destinations express the learner's choice; the studio engine judges it. */
(function (root) {
  'use strict';
  var storageTargets = [
    { id: 'fridge', x: 3.65, z: -.98, radius: .36, action: 'chill', message: 'Release to refrigerate the container.' },
    { id: 'shallowTray', x: 2.78, z: .28, radius: .30, action: 'shallow', message: 'Release to divide the food into shallow containers.' },
    { id: 'wasteBin', x: 4.14, z: .45, radius: .28, action: 'discard', message: 'Release to discard the leftovers.' }
  ];
  var labelTargets = [
    { id: 'container', x: 3.35, z: -.37, radius: .30, action: 'label', message: 'Release to label the food and preparation date.' }
  ];
  function valid(point) { return !!point && Number.isFinite(point.x) && Number.isFinite(point.z); }
  function destination(kind, point, start) {
    var targets = kind === 'store' ? storageTargets : kind === 'label' ? labelTargets : null;
    if (!targets) return { action: null, target: null, message: 'Choose the leftovers container or a label to move.' };
    if (!valid(point) || !valid(start)) return { action: null, target: null, message: 'Carry the object back onto the workspace.' };
    var chosen = null, nearest = Infinity;
    targets.forEach(function (candidate) {
      var distance = Math.hypot(point.x - candidate.x, point.z - candidate.z);
      // The tiny tolerance preserves inclusive boundaries after decimal projection.
      if (distance <= candidate.radius + 1e-9 && distance < nearest) { chosen = candidate; nearest = distance; }
    });
    if (!chosen) return { action: null, target: null, message: kind === 'store' ? 'Carry the container to the shallow tray, refrigerator, or waste bin.' : 'Carry the label onto the leftovers container.' };
    if (Math.hypot(point.x - start.x, point.z - start.z) + 1e-9 < .12) return { action: null, target: chosen.id, message: 'Lift and carry the object before releasing.' };
    return { action: chosen.action, target: chosen.id, message: chosen.message };
  }
  var api = { destination: destination };
  root.KitchenStudioStorage = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
