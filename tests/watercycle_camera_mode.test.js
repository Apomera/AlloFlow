import { it as test } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const source = fs.readFileSync(path.resolve(process.cwd(), 'stem_lab/stem_tool_watercycle.js'), 'utf8');
function sliceBetween(start, end) {
  const from = source.indexOf(start);
  assert.ok(from >= 0, start);
  const to = source.indexOf(end, from);
  assert.ok(to > from, end);
  return source.slice(from, to);
}
const helper = sliceBetween('            var controls3d = null;\n            var userOrbit3d = false;', '\n            var branchRaycaster3d');
const bridge = sliceBetween('            canvasEl._wc3dCameraModeChanged = function(mode)', '\n            if (canvasEl._wc3dInit)');
function instance() {
  const events = {};
  const pending = new Map();
  let tick = 0;
  const calls = [];
  const context = {
    canvasEl: { dataset: {}, isConnected: true, _wc3dCameraModeChanged: mode => calls.push(mode) },
    camera: {}, alive3d: true,
    setTimeout: fn => { pending.set(++tick, fn); return tick; },
    clearTimeout: id => pending.delete(id),
    THREE: { OrbitControls: function() { this.addEventListener = (name, fn) => { events[name] = fn; }; } },
  };
  vm.createContext(context); vm.runInContext(helper, context);
  return { context, events, pending, calls, flush() { const batch = [...pending.values()]; pending.clear(); batch.forEach(fn => fn()); } };
}
test('a fresh renderer publishes follow even before a journey begins', () => {
  const target = instance();
  assert.equal(target.context.canvasEl.dataset.cameraMode, 'follow');
  assert.equal(target.pending.size, 1);
  assert.deepEqual(target.calls, []);
  target.flush(); assert.deepEqual(target.calls, ['follow']);
});
test('native OrbitControls start enters orbit and repeated input sends one deferred observation', () => {
  const target = instance(); target.flush();
  target.events.start(); target.events.start(); target.events.start();
  assert.equal(target.context.userOrbit3d, true);
  assert.equal(target.context.canvasEl.dataset.cameraMode, 'orbit');
  assert.equal(target.pending.size, 1);
  target.flush(); assert.deepEqual(target.calls, ['follow', 'orbit']);
});
test('F/follow reset restores guided mode without touching playback', () => {
  const target = instance(); target.flush();
  target.context.canvasEl.dataset.journeyPaused = 'true';
  target.events.start(); target.flush();
  target.context.canvasEl._wc3dResetCamera();
  assert.equal(target.context.userOrbit3d, false);
  assert.equal(target.context.canvasEl.dataset.cameraMode, 'follow');
  assert.equal(target.context.canvasEl.dataset.journeyPaused, 'true');
  target.flush(); assert.deepEqual(target.calls, ['follow', 'orbit', 'follow']);
});
test('rapid orbit and follow events coalesce to the actual final mode', () => {
  const target = instance(); target.flush();
  target.events.start(); target.context.canvasEl._wc3dResetCamera();
  assert.equal(target.pending.size, 1); target.flush();
  assert.deepEqual(target.calls, ['follow', 'follow']);
});
test('ref reuse publishes to the refreshed host callback', () => {
  const target = instance(); target.flush();
  const refreshed = [];
  target.context.canvasEl._wc3dCameraModeChanged = mode => refreshed.push(mode);
  target.events.start(); target.flush();
  assert.deepEqual(target.calls, ['follow']); assert.deepEqual(refreshed, ['orbit']);
});
test('a detached or disposed renderer cannot update host state', () => {
  for (const condition of ['detached', 'disposed']) {
    const target = instance();
    if (condition === 'detached') target.context.canvasEl.isConnected = false;
    else target.context.alive3d = false;
    target.flush(); assert.deepEqual(target.calls, [], condition);
  }
});
test('the React bridge observes status immutably, leaves unrelated state intact, and skips equal updates', () => {
  let state = { waterCycle: { journeyPaused: true, journeyState: 'plant_absorb', wc3dCameraMode: 'orbit' }, unrelated: { retained: true } };
  const first = state;
  const context = { canvasEl: {}, setLabToolData: fn => { state = fn(state); } };
  vm.createContext(context); vm.runInContext(bridge, context);
  context.canvasEl._wc3dCameraModeChanged('follow');
  assert.notEqual(state, first); assert.notEqual(state.waterCycle, first.waterCycle);
  assert.equal(state.waterCycle.wc3dCameraMode, 'follow');
  assert.equal(state.waterCycle.journeyPaused, true); assert.equal(state.waterCycle.journeyState, 'plant_absorb');
  assert.equal(state.unrelated, first.unrelated);
  const changed = state;
  context.canvasEl._wc3dCameraModeChanged('follow'); assert.equal(state, changed);
});
test('restoring a stale observed orbit field reconciles to a new renderer without restoring camera behavior', () => {
  const target = instance();
  let state = { waterCycle: { wc3dCameraMode: 'orbit', journeyPaused: true } };
  target.context.setLabToolData = fn => { state = fn(state); };
  vm.runInContext(bridge, target.context); target.flush();
  assert.equal(target.context.userOrbit3d, false);
  assert.equal(state.waterCycle.wc3dCameraMode, 'follow');
  assert.equal(state.waterCycle.journeyPaused, true);
});
test('disposal cancels the actual pending observer and clears host bridges', () => {
  const target = instance();
  const cleanupHead = sliceBetween('            function cleanupJourney3d() {', '              if (frame3d) cancelAnimationFrame(frame3d);');
  vm.runInContext(cleanupHead + '\n}', target.context);
  target.context.cleanupJourney3d();
  assert.equal(target.pending.size, 0);
  assert.equal(target.context.alive3d, false);
  assert.equal(target.context.canvasEl._wc3dCameraModeChanged, null);
  assert.equal(target.context.canvasEl._wc3dSyncCameraMode, null);
  target.flush(); assert.deepEqual(target.calls, []);
});
test('source and public camera implementations stay identical', () => {
  const mirror = fs.readFileSync(path.resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'), 'utf8');
  assert.equal(source, mirror);
});