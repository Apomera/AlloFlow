import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const OvenView = require('../stem_lab/kitchen_studio/kitchen_studio_oven_view.js');
const mounted = [];
const controlKeys = ['enabled', 'enableRotate', 'enableZoom', 'enablePan', 'enableDamping', 'dampingFactor', 'autoRotate', 'minDistance', 'maxDistance', 'minPolarAngle', 'maxPolarAngle', 'minAzimuthAngle', 'maxAzimuthAngle'];

function bounds(x = 1.65, y = .78, z = -.20, width = 1.12, height = 1.0, depth = 1.20) {
  const target = new THREE.Vector3(x, y, z), points = [];
  for (const dx of [-width / 2, width / 2]) for (const dy of [-height / 2, height / 2]) for (const dz of [-depth / 2, depth / 2]) points.push(new THREE.Vector3(x + dx, y + dy, z + dz));
  return { target, points };
}
function fixture(aspect = 16 / 9, beforeOpen) {
  document.body.innerHTML = `<canvas id="ovenCanvas"></canvas><section id="studioOvenView" hidden>
    <button type="button" id="studioOvenInspect" aria-expanded="false">Work closer at the oven</button>
    <div id="studioOvenPanel" hidden><button type="button" id="studioOvenClose">Return to previous view</button></div></section>`;
  const camera = new THREE.PerspectiveCamera(42, aspect, .23, 345);
  camera.position.set(7, 8, 9); camera.zoom = 1.3; camera.updateProjectionMatrix();
  const controls = {
    target: new THREE.Vector3(.4, 1.3, -.2), enabled: true, enableRotate: true, enableZoom: true, enablePan: false,
    enableDamping: false, dampingFactor: .13, autoRotate: false, minDistance: .9, maxDistance: 21,
    minPolarAngle: .15, maxPolarAngle: 1.4, minAzimuthAngle: -.7, maxAzimuthAngle: .8,
    update: vi.fn(() => { camera.lookAt(controls.target); camera.updateMatrixWorld(true); })
  };
  controls.update();
  const canvas = document.getElementById('ovenCanvas');
  let framing = bounds();
  const host = { THREE, camera, controls, canvas, cancel: vi.fn(), draw: vi.fn(), onViewChange: vi.fn(), getFrame: vi.fn(() => framing) };
  if (beforeOpen) host.beforeOpen = beforeOpen;
  const view = OvenView.mount(host); mounted.push(view);
  const state = { active: true, visible: true, revision: { attempt: 0 } };
  view.update(state);
  return { view, host, camera, controls, canvas, state,
    setFrame: value => { framing = value; }, getFrame: () => framing,
    opener: document.getElementById('studioOvenInspect'), closer: document.getElementById('studioOvenClose'),
    panel: document.getElementById('studioOvenPanel'), section: document.getElementById('studioOvenView') };
}
function snapshot(f) {
  return { position: f.camera.position.toArray(), quaternion: f.camera.quaternion.toArray(), zoom: f.camera.zoom,
    up: f.camera.up.toArray(), fov: f.camera.fov, near: f.camera.near, far: f.camera.far,
    target: f.controls.target.toArray(), controls: Object.fromEntries(controlKeys.map(k => [k, f.controls[k]])) };
}
function assertFits(f) {
  f.camera.updateMatrixWorld(true);
  for (const point of f.getFrame().points) {
    const p = point.clone().project(f.camera);
    expect(Math.abs(p.x)).toBeLessThanOrEqual(.840001); expect(Math.abs(p.y)).toBeLessThanOrEqual(.780001);
    expect(p.z).toBeGreaterThan(-1); expect(p.z).toBeLessThan(1);
  }
  expect(f.camera.zoom).toBeGreaterThan(0); expect(f.camera.zoom).toBeLessThanOrEqual(3.6);
}
afterEach(() => { mounted.splice(0).forEach(v => v.dispose()); vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('Kitchen oven inspection camera', () => {
  it.each([{ active: false }, { visible: false }])('cannot open in an inactive context %j', patch => {
    const f = fixture(), original = snapshot(f); f.host.beforeOpen = vi.fn(); f.view.update(patch); f.view.open();
    expect(f.view.isOpen()).toBe(false); expect(f.section.hidden).toBe(true); expect(f.opener.disabled).toBe(true); expect(f.panel.hidden).toBe(true); expect(snapshot(f)).toEqual(original);
    expect(f.host.beforeOpen).not.toHaveBeenCalled(); expect(f.host.cancel).not.toHaveBeenCalled(); expect(f.host.getFrame).not.toHaveBeenCalled();
  });
  it('exposes the inspection from its native control and publishes its view state', () => {
    const f = fixture(); expect(f.section.hidden).toBe(false); expect(f.canvas.dataset.ovenInspection).toBe('false'); f.opener.click();
    expect(f.view.isOpen()).toBe(true); expect(f.panel.hidden).toBe(false); expect(f.opener.getAttribute('aria-expanded')).toBe('true');
    expect(f.canvas.dataset.ovenInspection).toBe('true'); expect(f.host.onViewChange).toHaveBeenLastCalledWith(true);
  });
  it.each([16 / 9, 390 / 270, 320 / 270, 320 / 500, 2.4])('fits closed and fully open door bounds at aspect %s', aspect => {
    const f = fixture(aspect);
    for (const framing of [bounds(), bounds(1.65, .78, -.25, 1.12, .9, 1.5), bounds(1.65, .7, -.2, 1.2, 1.1, 1.65)]) {
      f.setFrame(framing); f.view.open(); f.view.update({ revision: f.state.revision }); assertFits(f);
      expect(f.controls.target.toArray()).toEqual(framing.target.toArray());
      const offset = f.camera.position.clone().sub(framing.target).toArray();
      for (const [index, expected] of [.18, .22, 2.2].entries()) expect(offset[index]).toBeCloseTo(expected, 12);
      expect(Number(f.canvas.dataset.ovenViewZoom)).toBe(f.camera.zoom);
    }
  });
  it('runs beforeOpen before cancellation and saves the restored previous view', () => {
    const f = fixture(), order = []; let restored;
    f.host.beforeOpen = vi.fn(() => { order.push('before'); f.camera.position.set(-4, 3, 5); f.controls.target.set(.1, .2, .3); f.controls.update(); });
    f.controls.enabled = false;
    f.host.cancel.mockImplementationOnce(() => { order.push('cancel'); f.controls.enabled = true; restored = snapshot(f); });
    f.host.onViewChange.mockImplementation(open => { order.push(open ? 'open' : 'close'); });
    f.view.open(); expect(order).toEqual(['before', 'cancel', 'open']); f.view.close(); expect(snapshot(f)).toEqual(restored);
  });
  it.each([{ active: false }, { visible: false }])('revalidates context changed by beforeOpen %j', patch => {
    const f = fixture(), original = snapshot(f); f.host.beforeOpen = vi.fn(() => f.view.update(patch));
    f.view.open(); expect(f.view.isOpen()).toBe(false); expect(f.host.cancel).not.toHaveBeenCalled(); expect(f.host.getFrame).not.toHaveBeenCalled(); expect(snapshot(f)).toEqual(original);
  });
  it('does not continue opening after beforeOpen disposes the view', () => {
    const f = fixture(), original = snapshot(f); f.host.beforeOpen = vi.fn(() => f.view.dispose());
    f.view.open(); expect(f.view.isOpen()).toBe(false); expect(f.host.cancel).not.toHaveBeenCalled(); expect(snapshot(f)).toEqual(original);
  });
  it('rejects recursive open requests from the host hook', () => {
    const f = fixture(); f.host.beforeOpen = vi.fn(() => f.view.open()); f.view.open();
    expect(f.host.beforeOpen).toHaveBeenCalledTimes(1); expect(f.host.onViewChange.mock.calls).toEqual([[true]]); expect(f.view.isOpen()).toBe(true);
  });
  it('revalidates context after cancellation before changing camera state', () => {
    const f = fixture(), original = snapshot(f); f.host.cancel.mockImplementationOnce(() => f.view.update({ active: false }));
    f.view.open(); expect(f.view.isOpen()).toBe(false); expect(f.host.getFrame).not.toHaveBeenCalled(); expect(snapshot(f)).toEqual(original);
  });
  it('fits only after the host has exposed the oven geometry', () => {
    const f = fixture(), later = bounds(-2, 1, -3, 1.3, 1.0, 1.1);
    f.host.onViewChange.mockImplementation(open => { if (open) f.setFrame(later); }); f.view.open();
    expect(f.controls.target.toArray()).toEqual(later.target.toArray()); assertFits(f);
  });
  it('restores every saved camera/control value exactly and only once', () => {
    const f = fixture(); f.camera.quaternion.setFromEuler(new THREE.Euler(.2, -.7, .11)); const original = snapshot(f);
    f.view.open(); f.view.open(); f.view.resize(); f.view.close(); expect(snapshot(f)).toEqual(original); expect(f.host.onViewChange.mock.calls).toEqual([[true], [false]]);
    const calls = [f.host.cancel.mock.calls.length, f.host.draw.mock.calls.length]; f.view.close(); expect([f.host.cancel.mock.calls.length, f.host.draw.mock.calls.length]).toEqual(calls);
  });
  it('restores a saved disabled flag even when close cancellation enables orbit', () => {
    const f = fixture(); f.controls.enabled = false; const original = snapshot(f); f.view.open();
    expect(f.controls.enabled).toBe(false); f.host.cancel.mockImplementation(() => { f.controls.enabled = true; }); f.view.close(); expect(snapshot(f)).toEqual(original);
  });
  it('limits camera movement without changing unrelated orbit preferences', () => {
    const f = fixture(), original = snapshot(f); f.view.open();
    expect(f.controls.enableRotate).toBe(false); expect(f.controls.enableZoom).toBe(false); expect(f.controls.minDistance).toBe(0); expect(f.controls.maxDistance).toBe(Infinity);
    expect(f.controls.minPolarAngle).toBe(0); expect(f.controls.maxPolarAngle).toBe(Math.PI / 2);
    for (const key of ['enabled', 'enablePan', 'enableDamping', 'dampingFactor', 'autoRotate', 'minAzimuthAngle', 'maxAzimuthAngle']) expect(f.controls[key]).toBe(original.controls[key]);
  });
  it('closes a changed source revision before applying any new context', () => {
    const f = fixture(), original = snapshot(f), next = { attempt: 1 }; let sectionHiddenDuringClose;
    f.view.open(); f.host.onViewChange.mockImplementation(open => { if (!open) sectionHiddenDuringClose = f.section.hidden; }); f.host.cancel.mockClear();
    f.view.update({ revision: next, active: false });
    expect(f.host.cancel).toHaveBeenCalledTimes(1); expect(sectionHiddenDuringClose).toBe(false); expect(f.view.isOpen()).toBe(false); expect(f.section.hidden).toBe(true); expect(snapshot(f)).toEqual(original);
    expect(f.host.onViewChange.mock.calls).toEqual([[true], [false]]);
  });
  it('uses revision identity rather than equality of contents to cancel a historical stage', () => {
    const f = fixture(), original = snapshot(f); f.view.open(); f.view.update({ revision: { attempt: 0 } });
    expect(f.view.isOpen()).toBe(false); expect(snapshot(f)).toEqual(original);
  });
  it('refreshes current bounds without cancelling or replacing the return camera for an unchanged revision', () => {
    const f = fixture(), original = snapshot(f); f.view.open(); f.host.cancel.mockClear(); f.setFrame(bounds(4, .9, -1)); f.view.update({ revision: f.state.revision });
    expect(f.host.cancel).not.toHaveBeenCalled(); expect(f.controls.target.toArray()).toEqual([4, .9, -1]); assertFits(f); f.view.close(); expect(snapshot(f)).toEqual(original);
  });
  it('refits a resized canvas and keeps its current aspect after restoring the old camera', () => {
    const f = fixture(), original = snapshot(f); f.view.open(); f.camera.aspect = 320 / 500; f.camera.updateProjectionMatrix(); f.host.cancel.mockClear(); f.view.resize();
    expect(f.host.cancel).toHaveBeenCalledTimes(1); assertFits(f); f.view.close(); expect(snapshot(f)).toEqual(original); expect(f.camera.aspect).toBe(320 / 500);
  });
  it('does not request framing or cancel movement while closed', () => {
    const f = fixture(); f.view.resize(); f.view.update({ revision: { attempt: 1 } }); expect(f.host.cancel).not.toHaveBeenCalled(); expect(f.host.getFrame).not.toHaveBeenCalled();
  });
  it.each([{ active: false }, { visible: false }])('restores the room when the visible context changes %j', patch => {
    const f = fixture(), original = snapshot(f); f.view.open(); f.view.update(patch); expect(f.view.isOpen()).toBe(false); expect(snapshot(f)).toEqual(original); expect(f.canvas.dataset.ovenInspection).toBe('false');
  });
  it('allows completed and historical views without an evidence or door mutation API', () => {
    const f = fixture(), record = Object.freeze({ values: Object.freeze({ reading: 165 }), done: true, log: Object.freeze(['thick', 'read']) });
    f.view.update({ historical: true, locked: true, done: true, revision: record }); f.view.open(); expect(f.view.isOpen()).toBe(true); assertFits(f);
    expect(record.values.reading).toBe(165); expect(record.log).toEqual(['thick', 'read']); expect(Object.keys(f.host)).not.toContain('act'); expect(Object.keys(f.host)).not.toContain('setDoor');
  });
  it('lets a held tool consume the first Escape, then restores focus on the second', () => {
    const f = fixture(); f.view.open();
    const first = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); first.preventDefault(); document.dispatchEvent(first); expect(f.view.isOpen()).toBe(true);
    const focus = vi.spyOn(f.opener, 'focus'), second = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); document.dispatchEvent(second);
    expect(second.defaultPrevented).toBe(true); expect(f.view.isOpen()).toBe(false); expect(document.activeElement).toBe(f.opener); expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
  it('ignores unrelated keys and Escape while already closed', () => {
    const f = fixture(); const first = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); document.dispatchEvent(first); expect(first.defaultPrevented).toBe(false);
    f.view.open(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); expect(f.view.isOpen()).toBe(true);
  });
  it('returns focus without scrolling from the explicit close control', () => {
    const f = fixture(), focus = vi.spyOn(f.opener, 'focus'); f.view.open(); f.closer.focus(); f.closer.click();
    expect(f.view.isOpen()).toBe(false); expect(document.activeElement).toBe(f.opener); expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
  it.each(['visibilitychange', 'pagehide'])('restores the previous view on %s', event => {
    const f = fixture(), original = snapshot(f); f.view.open();
    if (event === 'visibilitychange') { vi.spyOn(document, 'hidden', 'get').mockReturnValue(true); document.dispatchEvent(new Event(event)); } else window.dispatchEvent(new Event(event));
    expect(f.view.isOpen()).toBe(false); expect(snapshot(f)).toEqual(original);
  });
  it('keeps inspection open on visible-document notifications', () => {
    const f = fixture(); f.view.open(); vi.spyOn(document, 'hidden', 'get').mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange')); expect(f.view.isOpen()).toBe(true);
  });
  it('removes listeners and refuses subsequent work after idempotent disposal', () => {
    const f = fixture(), original = snapshot(f); f.view.open(); f.view.dispose(); expect(snapshot(f)).toEqual(original); const calls = f.host.draw.mock.calls.length;
    f.view.open(); f.opener.click(); f.closer.click(); f.view.update({ revision: 'later' }); f.view.resize(); f.view.dispose(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); window.dispatchEvent(new Event('pagehide'));
    expect(f.view.isOpen()).toBe(false); expect(f.host.draw).toHaveBeenCalledTimes(calls); expect(snapshot(f)).toEqual(original);
  });
});
