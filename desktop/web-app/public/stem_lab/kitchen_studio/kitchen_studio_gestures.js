/* Pointer travel previews a technique; the host commits the engine action on release. */
(function (root) {
  'use strict';
  var heat = ['low', 'medium', 'high'];
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function point(value) { return !!value && Number.isFinite(value.x) && Number.isFinite(value.y); }
  function begin(kind, at, options) {
    if (['cut', 'pour', 'dial', 'dry', 'grip'].indexOf(kind) === -1 || !point(at)) return null;
    options = options || {};
    var unit = Number.isFinite(options.unit) && options.unit > 0 ? clamp(options.unit, .5, 2) : 1;
    var level = Number.isFinite(options.level) ? clamp(Math.round(options.level), 1, 3) : 1;
    return {
      kind: kind, unit: unit, start: { x: at.x, y: at.y }, current: { x: at.x, y: at.y },
      phase: kind === 'cut' ? 'down' : kind === 'dry' ? 'rub' : 'adjust', invalid: false, depth: 0,
      cutReached: false, action: options.action === 'largeDice' ? 'largeDice' : 'dice',
      initialLevel: level, level: level, delta: 0, travel: 0,
      passes: 0, rubDirection: 0, rubEdge: 0, passTravel: 0,
      initialCurl: options.claw === true ? 1 : 0, curl: options.claw === true ? 1 : 0, gripAction: null
    };
  }
  function move(trace, at) {
    if (!trace || trace.invalid) return trace;
    if (!point(at)) return Object.assign({}, trace, { invalid: true, phase: 'retry' });
    var next = Object.assign({}, trace, { current: { x: at.x, y: at.y } });
    var dx = (at.x - trace.start.x) / trace.unit, dy = (at.y - trace.start.y) / trace.unit;
    next.travel = Math.abs(dy);
    if (trace.kind === 'grip') {
      if (Math.abs(dx) > 35) return Object.assign(next, { invalid: true, phase: 'retry' });
      next.curl = clamp(trace.initialCurl - dy / 40, 0, 1);
      next.gripAction = dy <= -28 ? 'claw' : dy >= 28 ? 'flat' : null;
      next.phase = next.gripAction ? 'ready' : 'adjust';
    } else if (trace.kind === 'dry') {
      if (Math.abs(dy) > 40) return Object.assign(next, { invalid: true, phase: 'retry' });
      // Each pass starts at the previous extreme, not the most recent event.
      // Small reversals cannot accumulate into a pass, and a long sweep counts once.
      if (!trace.rubDirection) {
        next.passTravel = Math.abs(dx);
        if (next.passTravel >= 24) { next.passes = 1; next.rubDirection = Math.sign(dx); next.rubEdge = dx; next.passTravel = 0; }
      } else if (trace.passes < 3) {
        if ((dx - trace.rubEdge) * trace.rubDirection > 0) next.rubEdge = dx;
        next.passTravel = Math.max(0, (next.rubEdge - dx) * trace.rubDirection);
        if (next.passTravel >= 24) { next.passes = trace.passes + 1; next.rubDirection = -trace.rubDirection; next.rubEdge = dx; next.passTravel = 0; }
      }
      next.phase = next.passes === 3 ? 'ready' : 'rub';
    } else if (trace.kind === 'cut') {
      if (Math.abs(dx) > 45) return Object.assign(next, { invalid: true, phase: 'retry' });
      next.depth = clamp(dy / 45, 0, 1);
      next.cutReached = trace.cutReached || dy >= 45;
      next.phase = next.cutReached ? (dy <= 14 ? 'ready' : 'up') : 'down';
    } else if (trace.kind === 'pour') {
      next.delta = dy <= -30 ? 50 : dy >= 30 ? -50 : 0;
      next.phase = next.delta ? 'ready' : 'adjust';
    } else if (trace.kind === 'dial') {
      next.level = clamp(trace.initialLevel + Math.round(-dy / 20), 1, 3);
      next.phase = Math.abs(dy) >= 12 ? 'ready' : 'adjust';
    }
    return next;
  }
  function finish(trace) {
    if (!trace || trace.invalid) return { complete: false, action: null, message: trace && trace.kind === 'dry' ? 'Contact lost. Keep the towel level and rub steadily from side to side.' : 'Movement stopped. Start again with a steady vertical motion.' };
    if (trace.kind === 'grip') return trace.gripAction
      ? { complete: true, action: trace.gripAction, message: trace.gripAction === 'claw' ? 'Release to tuck fingertips into a claw grip.' : 'Release to extend the fingers.' }
      : { complete: false, action: null, message: 'Drag up to tuck the fingertips, or down to extend them, then release.' };
    if (trace.kind === 'dry') return trace.passes === 3
      ? { complete: true, action: 'dry', message: 'Three passes complete. Release to finish drying.' }
      : { complete: false, action: null, message: 'Rub the towel back and forth: ' + trace.passes + ' of 3 passes.' };
    if (trace.kind === 'cut') return trace.phase === 'ready'
      ? { complete: true, action: trace.action, message: 'Knife pass complete.' }
      : { complete: false, action: null, message: trace.cutReached ? 'Lift the knife back before releasing.' : 'Pull the knife down through the carrot, then lift it back.' };
    if (trace.kind === 'pour') return trace.delta
      ? { complete: true, action: trace.delta > 0 ? 'add50' : 'remove50', message: trace.delta > 0 ? 'Add 50 mL of stock.' : 'Remove 50 mL of stock.' }
      : { complete: false, action: null, message: 'Drag up to add 50 mL, or down to remove 50 mL, then release.' };
    if (trace.kind === 'dial') return trace.phase === 'ready'
      ? { complete: true, action: heat[trace.level - 1], message: 'Set heat to ' + heat[trace.level - 1] + '.' }
      : { complete: false, action: null, message: 'Drag up for more heat or down for less, then release.' };
    return { complete: false, action: null, message: 'Choose a kitchen tool to begin.' };
  }
  function progress(trace) {
    if (!trace || trace.invalid) return 0;
    if (trace.kind === 'grip') return clamp(trace.travel / 28, 0, 1);
    if (trace.kind === 'dry') return clamp((trace.passes + clamp(trace.passTravel / 24, 0, 1)) / 3, 0, 1);
    if (trace.kind === 'cut') {
      if (trace.phase === 'ready') return 1;
      return trace.cutReached ? .5 + .5 * (1 - trace.depth) : .5 * trace.depth;
    }
    return clamp(trace.travel / (trace.kind === 'pour' ? 30 : 12), 0, 1);
  }
  var api = { begin: begin, move: move, finish: finish, progress: progress };
  root.KitchenStudioGestures = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
