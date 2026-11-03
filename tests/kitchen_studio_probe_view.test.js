import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const ProbeView = require('../stem_lab/kitchen_studio/kitchen_studio_probe_view.js');
const mounted = [];
const controlKeys = ['enabled', 'enableRotate', 'enableZoom', 'enablePan', 'enableDamping', 'dampingFactor', 'autoRotate', 'minDistance', 'maxDistance', 'minPolarAngle', 'maxPolarAngle', 'minAzimuthAngle', 'maxAzimuthAngle'];

function fixture(aspect = 16 / 9) {
  document.body.innerHTML = `<canvas id="probeCanvas"></canvas><section id="studioProbeView" hidden>
    <button id="studioProbeOpen" type="button" aria-expanded="false">Work closer</button><div id="studioProbePanel" hidden>
      <label for="studioProbeDepth">Depth <output id="studioProbeDepthLabel"></output></label>
      <input id="studioProbeDepth" type="range" min="0" max="100" step="1" value="0">
      <button id="studioProbePlace" type="button">Place sensing tip here</button><button id="studioProbeReset" type="button">Reset preview</button>
      <p id="studioProbeDepthReadout"></p><button id="studioProbeClose" type="button">Return</button></div></section>`;
  const camera = new THREE.PerspectiveCamera(42, aspect, .23, 345);
  camera.position.set(7, 8, 9); camera.zoom = 1.3; camera.updateProjectionMatrix();
  const controls = {
    target: new THREE.Vector3(.4, 1.3, -.2), enabled: true, enableRotate: true, enableZoom: true, enablePan: false,
    enableDamping: false, dampingFactor: .13, autoRotate: false, minDistance: .9, maxDistance: 21,
    minPolarAngle: .15, maxPolarAngle: 1.4, minAzimuthAngle: -.7, maxAzimuthAngle: .8,
    update: vi.fn(() => { camera.lookAt(controls.target); camera.updateMatrixWorld(true); })
  };
  controls.update();
  const canvas = document.getElementById('probeCanvas');
  const host = { THREE, camera, controls, canvas, cancel: vi.fn(), draw: vi.fn(), onViewChange: vi.fn(), onDepthPreview: vi.fn(), place: vi.fn() };
  const view = ProbeView.mount(host); mounted.push(view);
  const state = { active: true, visible: true, available: true, locked: false, historical: false, values: {}, revision: 'attempt:0' };
  view.update(state);
  return { view, host, camera, controls, canvas, state,
    section: document.getElementById('studioProbeView'), opener: document.getElementById('studioProbeOpen'),
    panel: document.getElementById('studioProbePanel'), closer: document.getElementById('studioProbeClose'),
    input: document.getElementById('studioProbeDepth'), label: document.getElementById('studioProbeDepthLabel'),
    place: document.getElementById('studioProbePlace'), reset: document.getElementById('studioProbeReset'), readout: document.getElementById('studioProbeDepthReadout') };
}
function snapshot(f) {
  return { position: f.camera.position.toArray(), quaternion: f.camera.quaternion.toArray(), zoom: f.camera.zoom,
    target: f.controls.target.toArray(), up: f.camera.up.toArray(), fov: f.camera.fov, near: f.camera.near, far: f.camera.far,
    controls: Object.fromEntries(controlKeys.map(key => [key, f.controls[key]])) };
}
function input(f, value) { f.input.value = String(value); f.input.dispatchEvent(new Event('input', { bubbles: true })); }
function escape(prevented = false) { const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); if (prevented) event.preventDefault(); document.dispatchEvent(event); return event; }
function assertFits(f) {
  f.camera.updateMatrixWorld(true);
  for (const x of [1.12, 2.30]) for (const y of [1.35, 2.33]) for (const z of [-1.33, -.30]) {
    const p = new THREE.Vector3(x, y, z).project(f.camera);
    expect(Math.abs(p.x)).toBeLessThanOrEqual(.840001); expect(Math.abs(p.y)).toBeLessThanOrEqual(.800001);
    expect(p.z).toBeGreaterThan(-1); expect(p.z).toBeLessThan(1);
  }
  expect(f.camera.zoom).toBeGreaterThan(0); expect(f.camera.zoom).toBeLessThanOrEqual(3.6);
}
afterEach(() => { mounted.splice(0).forEach(view => view.dispose()); vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('Kitchen probe insertion view', () => {
  it.each([{ active: false }, { visible: false }, { available: false }])('does not open when unavailable %j', patch => {
    const f = fixture(), original = snapshot(f); f.view.update(patch); f.view.open();
    expect(f.view.isOpen()).toBe(false); expect(f.opener.disabled).toBe(true); expect(snapshot(f)).toEqual(original); expect(f.host.cancel).not.toHaveBeenCalled();
  });
  it('opens and exposes an unplaced baseline without placing or reading', () => {
    const f = fixture(); f.opener.click();
    expect(f.view.isOpen()).toBe(true); expect(f.panel.hidden).toBe(false); expect(f.opener.getAttribute('aria-expanded')).toBe('true');
    expect(f.canvas.dataset.probeInspection).toBe('true'); expect(f.view.getDepth()).toBe(0); expect(f.view.isPreviewing()).toBe(false);
    expect(f.readout.textContent).toMatch(/Probe: Not placed/); expect(f.host.onDepthPreview).toHaveBeenLastCalledWith(0, false); expect(f.host.place).not.toHaveBeenCalled();
  });
  it.each([16 / 9, 390 / 450, 320 / 500, 2.4])('fits the chicken, resting display and full insertion path at aspect %s', aspect => {
    const f = fixture(aspect); f.view.open(); assertFits(f);
    expect(f.controls.target.toArray()).toEqual([1.65, 1.79, -.85]);
    expect(f.camera.position.x).toBeCloseTo(1.4, 12); expect(f.camera.position.y).toBeCloseTo(2.39, 12); expect(f.camera.position.z).toBeCloseTo(1.35, 12);
  });
  it('cancels before saving the return camera and enabled control state', () => {
    const f = fixture(); let original; f.controls.enabled = false;
    f.host.cancel.mockImplementationOnce(() => { f.controls.enabled = true; f.camera.position.set(-4, 5, 6); f.controls.target.set(.1, .2, .3); f.controls.update(); original = snapshot(f); });
    f.view.open(); f.view.close(); expect(snapshot(f)).toEqual(original);
  });
  it('restores every camera/control field exactly after repeated opening and previews', () => {
    const f = fixture(), original = snapshot(f); f.view.open(); f.view.open(); f.view.preview(.5); f.view.close();
    expect(snapshot(f)).toEqual(original); expect(f.host.onViewChange.mock.calls).toEqual([[true], [false]]);
    const count = f.host.cancel.mock.calls.length; f.view.close(); expect(f.host.cancel).toHaveBeenCalledTimes(count);
  });
  it('restores the enabled flag after close cancellation enables orbit', () => {
    const f = fixture(); f.controls.enabled = false; const original = snapshot(f); f.view.open(); f.host.cancel.mockImplementation(() => { f.controls.enabled = true; }); f.view.close(); expect(snapshot(f)).toEqual(original);
  });
  it('locks only camera rotation and zoom, leaving unrelated controls alone', () => {
    const f = fixture(), original = snapshot(f); f.view.open();
    expect(f.controls.enableRotate).toBe(false); expect(f.controls.enableZoom).toBe(false);
    for (const key of ['enabled', 'enablePan', 'enableDamping', 'dampingFactor', 'autoRotate', 'minAzimuthAngle', 'maxAzimuthAngle']) expect(f.controls[key]).toBe(original.controls[key]);
  });
  it('offers middle-depth preview without an engine action or enabled placement', () => {
    const f = fixture(); f.view.open(); f.host.cancel.mockClear(); input(f, 50);
    expect(f.host.cancel).toHaveBeenCalledTimes(1); expect(f.view.getDepth()).toBe(.5); expect(f.view.isPreviewing()).toBe(true);
    expect(f.place.disabled).toBe(true); expect(f.reset.disabled).toBe(false); expect(f.canvas.dataset.probeDepthPreview).toBe('true');
    expect(f.readout.textContent).toMatch(/Placement preview.*Between/); expect(f.input.getAttribute('aria-valuetext')).toMatch(/50 of 100/);
    f.place.click(); expect(f.host.place).not.toHaveBeenCalled(); expect(f.host.onDepthPreview).toHaveBeenLastCalledWith(.5, true);
  });
  it.each([[0, 'surface'], [8, 'surface'], [92, 'thick'], [100, 'thick']])('requires explicit placement at depth %s for %s', (value, action) => {
    const f = fixture(); f.view.open(); input(f, value); expect(f.place.disabled).toBe(false); expect(f.host.place).not.toHaveBeenCalled();
    f.place.click(); expect(f.host.place).toHaveBeenCalledExactlyOnceWith(action); expect(f.view.isPreviewing()).toBe(false); expect(f.place.disabled).toBe(true); expect(f.host.onDepthPreview).toHaveBeenLastCalledWith(0, false);
  });
  it('keeps the chosen placement when cancelling a held gesture clears preview', () => {
    const f = fixture(); f.view.open(); f.view.preview(1); f.host.cancel.mockImplementation(() => f.view.preview(null)); f.place.click(); expect(f.host.place).toHaveBeenCalledExactlyOnceWith('thick');
  });
  it('supports programmatic pointer previews without cancelling their held gesture', () => {
    const f = fixture(); f.view.open(); f.host.cancel.mockClear(); f.view.preview(.63);
    expect(f.host.cancel).not.toHaveBeenCalled(); expect(f.view.getDepth()).toBe(.63); expect(f.host.onDepthPreview).toHaveBeenLastCalledWith(.63, true);
    f.view.preview(null); expect(f.view.getDepth()).toBe(0); expect(f.view.isPreviewing()).toBe(false); expect(f.host.onDepthPreview).toHaveBeenLastCalledWith(0, false);
  });
  it.each([undefined, NaN, Infinity, -Infinity, -.01, 1.01, '1', {}, []])('rejects malformed pointer preview %j', value => {
    const f = fixture(); f.view.open(); f.view.preview(.5); expect(f.view.preview(value)).toBe(false); expect(f.view.getDepth()).toBe(.5);
  });
  it('does not prepare pointer previews while closed', () => {
    const f = fixture(); expect(f.view.preview(1)).toBe(false); expect(f.view.isPreviewing()).toBe(false); expect(f.host.onDepthPreview).not.toHaveBeenCalled();
  });
  it.each([['thick', 1], ['surface', 0], [undefined, 0]])('restores baseline %s after Reset', (probe, depth) => {
    const f = fixture(); f.view.update({ values: { probe } }); f.view.open(); input(f, 50); f.reset.click(); expect(f.view.getDepth()).toBe(depth); expect(f.view.isPreviewing()).toBe(false); expect(f.reset.disabled).toBe(true); expect(f.host.onDepthPreview).toHaveBeenLastCalledWith(depth, false);
  });
  it('resets stale preview on a new displayed revision without closing the inspection', () => {
    const f = fixture(); f.view.open(); f.view.preview(.5); f.host.cancel.mockClear();
    const values = Object.freeze({ probe: 'thick', reading: null }); f.view.update({ revision: 'attempt:1', values });
    expect(f.host.cancel).toHaveBeenCalledTimes(1); expect(f.view.isOpen()).toBe(true); expect(f.view.getDepth()).toBe(1); expect(f.view.isPreviewing()).toBe(false); expect(f.host.onDepthPreview).toHaveBeenLastCalledWith(1, false); expect(values).toEqual({ probe: 'thick', reading: null });
  });
  it('keeps a slider preview when updating the same revision', () => {
    const f = fixture(); f.view.open(); f.view.preview(.5); f.host.cancel.mockClear(); f.view.update({ revision: f.state.revision }); expect(f.host.cancel).not.toHaveBeenCalled(); expect(f.view.getDepth()).toBe(.5);
  });
  it('inspects recorded geometry without enabling insertion or placement', () => {
    const f = fixture(), values = Object.freeze({ probe: 'surface', reading: 190 }); f.view.update({ values, locked: true, historical: true }); f.view.open();
    expect(f.view.isOpen()).toBe(true); expect(f.input.disabled).toBe(true); expect(f.place.disabled).toBe(true); expect(f.readout.textContent).toMatch(/^Recorded probe: Placed at the surface/);
    expect(f.view.preview(1)).toBe(false); input(f, 100); f.place.click(); expect(f.host.place).not.toHaveBeenCalled(); expect(f.view.getDepth()).toBe(0); expect(values).toEqual({ probe: 'surface', reading: 190 });
  });
  it('clears a pending preview when the displayed state becomes locked', () => {
    const f = fixture(); f.view.open(); f.view.preview(1); f.view.update({ locked: true }); expect(f.view.isPreviewing()).toBe(false); expect(f.input.disabled).toBe(true); expect(f.place.disabled).toBe(true);
  });
  it('refits after resize and clears held or slider previews before drawing', () => {
    const f = fixture(), original = snapshot(f); f.view.open(); f.view.preview(.5); f.camera.aspect = 320 / 500; f.camera.updateProjectionMatrix(); f.host.cancel.mockClear();
    f.view.resize(); expect(f.host.cancel).toHaveBeenCalledTimes(1); expect(f.view.isPreviewing()).toBe(false); assertFits(f); f.view.close(); expect(snapshot(f)).toEqual(original); expect(f.camera.aspect).toBe(320 / 500);
  });
  it.each([{ active: false }, { visible: false }, { available: false }])('closes and restores after context change %j', patch => {
    const f = fixture(), original = snapshot(f); f.view.open(); f.view.preview(1); f.view.update(patch); expect(f.view.isOpen()).toBe(false); expect(f.view.isPreviewing()).toBe(false); expect(snapshot(f)).toEqual(original); expect(f.canvas.dataset.probeDepthPreview).toBe('false');
  });
  it('consumes a preview-reset Escape before closing on the next Escape', () => {
    const f = fixture(); f.view.open(); input(f, 50); expect(escape().defaultPrevented).toBe(true); expect(f.view.isPreviewing()).toBe(false); expect(f.view.isOpen()).toBe(true);
    expect(escape().defaultPrevented).toBe(true); expect(f.view.isOpen()).toBe(false); expect(document.activeElement).toBe(f.opener);
  });
  it('respects an Escape already consumed by the held gesture', () => {
    const f = fixture(); f.view.open(); f.view.preview(.5); escape(true); expect(f.view.isOpen()).toBe(true); expect(f.view.isPreviewing()).toBe(true);
  });
  it('returns focus from the close button and notifies baseline after leaving the view', () => {
    const f = fixture(); f.view.open(); f.view.preview(.5); const calls = []; f.host.onViewChange.mockImplementation(value => calls.push(['view', value])); f.host.onDepthPreview.mockImplementation((value, preview) => calls.push(['depth', value, preview]));
    f.closer.click(); expect(document.activeElement).toBe(f.opener); expect(calls).toEqual([['view', false], ['depth', 0, false]]);
  });
  it.each(['visibilitychange', 'pagehide'])('restores and clears preview on %s', event => {
    const f = fixture(), original = snapshot(f); f.view.open(); f.view.preview(.5); if (event === 'visibilitychange') vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    (event === 'pagehide' ? window : document).dispatchEvent(new Event(event)); expect(f.view.isOpen()).toBe(false); expect(f.view.isPreviewing()).toBe(false); expect(snapshot(f)).toEqual(original);
  });
  it('disposes once and removes all native handlers', () => {
    const f = fixture(); f.view.open(); f.view.preview(.5); f.view.dispose(); const count = f.host.cancel.mock.calls.length; f.opener.click(); input(f, 100); f.place.click(); f.view.open(); f.view.preview(1); f.view.resize();
    expect(f.view.isOpen()).toBe(false); expect(f.host.cancel).toHaveBeenCalledTimes(count); expect(f.host.place).not.toHaveBeenCalled();
  });
});
