import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const ContainerView = require('../stem_lab/kitchen_studio/kitchen_studio_container_view.js');
const mounted = [];
const controlKeys = ['enabled', 'enableRotate', 'enableZoom', 'enablePan', 'enableDamping', 'dampingFactor', 'autoRotate', 'minDistance', 'maxDistance', 'minPolarAngle', 'maxPolarAngle', 'minAzimuthAngle', 'maxAzimuthAngle'];

function bounds(x = 3.2, y = 1.54, z = -.37, width = 1.0, height = .65, depth = .6) {
  const target = new THREE.Vector3(x, y, z), points = [];
  for (const dx of [-width / 2, width / 2]) for (const dy of [-height / 2, height / 2]) for (const dz of [-depth / 2, depth / 2]) points.push(new THREE.Vector3(x + dx, y + dy, z + dz));
  return { target, points };
}
function fixture(aspect = 16 / 9) {
  document.body.innerHTML = `<canvas id="containerCanvas"></canvas><section id="studioContainerView" hidden>
    <button type="button" id="studioContainerInspect" aria-expanded="false">Look inside containers</button>
    <div id="studioContainerPanel" hidden><button type="button" id="studioContainerClose">Move containers</button></div></section>`;
  const camera = new THREE.PerspectiveCamera(42, aspect, .23, 345);
  camera.position.set(7, 8, 9); camera.zoom = 1.3; camera.updateProjectionMatrix();
  const controls = {
    target: new THREE.Vector3(.4, 1.3, -.2), enabled: true, enableRotate: true, enableZoom: true, enablePan: false,
    enableDamping: false, dampingFactor: .13, autoRotate: false, minDistance: .9, maxDistance: 21,
    minPolarAngle: .15, maxPolarAngle: 1.4, minAzimuthAngle: -.7, maxAzimuthAngle: .8,
    update: vi.fn(() => { camera.lookAt(controls.target); camera.updateMatrixWorld(true); })
  };
  controls.update();
  const canvas = document.getElementById('containerCanvas');
  let framing = bounds();
  const host = { THREE, camera, controls, canvas, cancel: vi.fn(), draw: vi.fn(), onViewChange: vi.fn(), getFrame: vi.fn(() => framing) };
  const view = ContainerView.mount(host); mounted.push(view);
  const state = { active: true, visible: true, available: true, revision: 'attempt:0' };
  view.update(state);
  return { view, host, camera, controls, canvas, state,
    setFrame: value => { framing = value; }, getFrame: () => framing,
    opener: document.getElementById('studioContainerInspect'), closer: document.getElementById('studioContainerClose'),
    panel: document.getElementById('studioContainerPanel'), section: document.getElementById('studioContainerView') };
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
    expect(Math.abs(p.x)).toBeLessThanOrEqual(.860001); expect(Math.abs(p.y)).toBeLessThanOrEqual(.800001);
    expect(p.z).toBeGreaterThan(-1); expect(p.z).toBeLessThan(1);
  }
  expect(f.camera.zoom).toBeGreaterThan(0); expect(f.camera.zoom).toBeLessThanOrEqual(3.6);
}
afterEach(() => { mounted.splice(0).forEach(v => v.dispose()); vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('Kitchen container inspection camera', () => {
  it.each([{ active: false }, { visible: false }, { available: false }])('does not open in a disabled context %j', patch => {
    const f = fixture(), original = snapshot(f); f.view.update(patch); f.view.open();
    expect(f.view.isOpen()).toBe(false); expect(f.opener.disabled).toBe(true); expect(f.panel.hidden).toBe(true); expect(snapshot(f)).toEqual(original);
    expect(f.host.cancel).not.toHaveBeenCalled(); expect(f.host.getFrame).not.toHaveBeenCalled();
  });
  it('exposes an available inspection without hiding the unavailable station controls', () => {
    const f = fixture(); f.view.update({ available: false }); expect(f.section.hidden).toBe(false);
    f.view.update({ available: true }); f.opener.click();
    expect(f.view.isOpen()).toBe(true); expect(f.panel.hidden).toBe(false); expect(f.opener.getAttribute('aria-expanded')).toBe('true');
    expect(f.canvas.dataset.containerInspection).toBe('true'); expect(f.host.onViewChange).toHaveBeenLastCalledWith(true);
  });
  it.each([16 / 9, 390 / 450, 320 / 500, 2.4])('fits deep and shallow containers including raised lids at aspect %s', aspect => {
    const f = fixture(aspect);
    for (const framing of [bounds(3.35, 1.56, -.37, .56, .68, .58), bounds(3.12, 1.55, -.37, 1.03, .54, .6), bounds(3.58, 1.56, -1.33, .85, .58, .60)]) {
      f.setFrame(framing); f.view.open(); f.view.update({ revision: framing }); assertFits(f);
      expect(f.controls.target.toArray()).toEqual(framing.target.toArray());
      const offset = f.camera.position.clone().sub(framing.target).toArray();
      for (const [index, expected] of [.18, 1.05, 1.8].entries()) expect(offset[index]).toBeCloseTo(expected, 12);
      expect(Number(f.canvas.dataset.containerViewZoom)).toBe(f.camera.zoom);
    }
  });
  it('cancels held movement before saving its camera and enabled state', () => {
    const f = fixture(); let original;
    f.controls.enabled = false;
    f.host.cancel.mockImplementationOnce(() => { f.controls.enabled = true; f.camera.position.set(-4, 5, 6); f.controls.target.set(.1, .2, .3); f.controls.update(); original = snapshot(f); });
    f.view.open(); expect(f.host.cancel).toHaveBeenCalledTimes(1); f.view.close(); expect(snapshot(f)).toEqual(original);
  });
  it('frames after the host has exposed or repositioned the containers', () => {
    const f = fixture(), later = bounds(-2, 2, -3, .8, .6, .7);
    f.host.onViewChange.mockImplementation(open => { if (open) f.setFrame(later); });
    f.view.open(); expect(f.controls.target.toArray()).toEqual(later.target.toArray()); assertFits(f);
  });
  it('preserves a disabled enabled flag across close cancellation', () => {
    const f = fixture(); f.controls.enabled = false; const original = snapshot(f);
    f.view.open(); expect(f.controls.enabled).toBe(false);
    f.host.cancel.mockImplementation(() => { f.controls.enabled = true; }); f.view.close(); expect(snapshot(f)).toEqual(original);
  });
  it('restores the exact camera and controls once after repeated open and refit requests', () => {
    const f = fixture(), original = snapshot(f); f.view.open(); f.view.open(); f.view.update({ revision: 'attempt:1' }); f.view.close();
    expect(snapshot(f)).toEqual(original); expect(f.host.onViewChange.mock.calls).toEqual([[true], [false]]);
    const cancels = f.host.cancel.mock.calls.length, draws = f.host.draw.mock.calls.length;
    f.view.close(); expect(f.host.cancel).toHaveBeenCalledTimes(cancels); expect(f.host.draw).toHaveBeenCalledTimes(draws);
  });
  it('disables rotation and zoom without changing unrelated control preferences', () => {
    const f = fixture(), original = snapshot(f); f.view.open();
    expect(f.controls.enableRotate).toBe(false); expect(f.controls.enableZoom).toBe(false); expect(f.controls.minDistance).toBe(0); expect(f.controls.maxDistance).toBe(Infinity);
    for (const key of ['enabled', 'enablePan', 'enableDamping', 'dampingFactor', 'autoRotate', 'minAzimuthAngle', 'maxAzimuthAngle']) expect(f.controls[key]).toBe(original.controls[key]);
  });
  it('cancels a stale gesture and refits the current container revision without replacing its return camera', () => {
    const f = fixture(), original = snapshot(f); f.view.open(); f.host.cancel.mockClear();
    f.setFrame(bounds(5, 1.6, -2, 1.2, .8, .8)); f.view.update({ revision: 'attempt:1' });
    expect(f.host.cancel).toHaveBeenCalledTimes(1); expect(f.view.isOpen()).toBe(true); assertFits(f); f.view.close(); expect(snapshot(f)).toEqual(original);
  });
  it('refreshes supplied framing without cancelling when the revision is unchanged', () => {
    const f = fixture(); f.view.open(); f.host.cancel.mockClear(); f.setFrame(bounds(4, 1.7, -1)); f.view.update({ revision: f.state.revision });
    expect(f.host.cancel).not.toHaveBeenCalled(); expect(f.controls.target.toArray()).toEqual([4, 1.7, -1]); assertFits(f);
  });
  it('refits a narrow resized canvas and restores the original camera with the new aspect', () => {
    const f = fixture(), original = snapshot(f); f.view.open(); f.camera.aspect = 320 / 500; f.camera.updateProjectionMatrix(); f.host.cancel.mockClear(); f.view.resize();
    expect(f.host.cancel).toHaveBeenCalledTimes(1); assertFits(f); f.view.close(); expect(snapshot(f)).toEqual(original); expect(f.camera.aspect).toBe(320 / 500);
  });
  it('does not request framing or cancel while closed', () => {
    const f = fixture(); f.view.resize(); f.view.update({ revision: 'attempt:1' }); expect(f.host.cancel).not.toHaveBeenCalled(); expect(f.host.getFrame).not.toHaveBeenCalled();
  });
  it.each([{ active: false }, { visible: false }, { available: false }])('closes and restores when context changes %j', patch => {
    const f = fixture(), original = snapshot(f); f.view.open(); f.view.update(patch); expect(f.view.isOpen()).toBe(false); expect(snapshot(f)).toEqual(original); expect(f.canvas.dataset.containerInspection).toBe('false');
  });
  it('allows a recorded inspection without requesting or modifying evidence', () => {
    const f = fixture(), record = Object.freeze({ values: Object.freeze({ shallow: true, chilled: true }), log: Object.freeze(['shallow', 'label', 'chill']) });
    f.view.update({ historical: true, locked: true, revision: record }); f.view.open(); expect(f.view.isOpen()).toBe(true); assertFits(f); expect(record.log).toEqual(['shallow', 'label', 'chill']);
  });
  it('lets a held gesture consume first Escape and closes on the next Escape', () => {
    const f = fixture(); f.view.open();
    const first = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); first.preventDefault(); document.dispatchEvent(first); expect(f.view.isOpen()).toBe(true);
    const second = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); document.dispatchEvent(second); expect(second.defaultPrevented).toBe(true); expect(f.view.isOpen()).toBe(false); expect(document.activeElement).toBe(f.opener);
  });
  it('returns focus from the explicit close control', () => {
    const f = fixture(); f.view.open(); f.closer.focus(); f.closer.click(); expect(f.view.isOpen()).toBe(false); expect(document.activeElement).toBe(f.opener);
  });
  it.each(['visibilitychange', 'pagehide'])('restores the room camera on %s', event => {
    const f = fixture(), original = snapshot(f); f.view.open();
    if (event === 'visibilitychange') { vi.spyOn(document, 'hidden', 'get').mockReturnValue(true); document.dispatchEvent(new Event(event)); } else window.dispatchEvent(new Event(event));
    expect(f.view.isOpen()).toBe(false); expect(snapshot(f)).toEqual(original);
  });
  it('ignores visible-document notifications', () => {
    const f = fixture(); f.view.open(); vi.spyOn(document, 'hidden', 'get').mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange')); expect(f.view.isOpen()).toBe(true);
  });
  it('removes listeners and rejects further changes after disposal', () => {
    const f = fixture(), original = snapshot(f); f.view.open(); f.view.dispose(); expect(snapshot(f)).toEqual(original); const calls = f.host.draw.mock.calls.length;
    f.view.open(); f.opener.click(); f.view.update({ revision: 'later' }); f.view.resize(); f.view.dispose(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(f.view.isOpen()).toBe(false); expect(f.host.draw).toHaveBeenCalledTimes(calls); expect(snapshot(f)).toEqual(original);
  });
});
