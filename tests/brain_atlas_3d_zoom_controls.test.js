import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { mountZoomScene, THREE, SELECTED, NEIGHBOR } from './helpers/brain_atlas_3d_zoom_scene.js';

let scene, frames;
beforeEach(() => {
  resetStemLab();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  frames = new Map(); let frameId = 0;
  vi.stubGlobal('requestAnimationFrame', callback => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', id => frames.delete(id));
});
afterEach(async () => {
  await scene?.cleanup(); scene = null;
  for (const key of Object.keys(window).filter(key => key.startsWith('__alloBrainAtlas3D'))) delete window[key];
  document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
function draw(now = performance.now()) {
  const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now));
}
async function mount(options = {}) { scene = await mountZoomScene(options); draw(); return scene; }
const distance = () => scene.state.camera.position.distanceTo(scene.state.controls.target);
const closeVector = (actual, expected) => expect(actual.distanceTo(expected)).toBeLessThan(1e-8);
function poseAt(distanceValue, target = new THREE.Vector3(.7, -.25, .3)) {
  const { state } = scene;
  state.controls.target.copy(target);
  state.camera.up.set(.18, .95, .12).normalize();
  state.camera.position.copy(target).add(new THREE.Vector3(1.2, .7, 4).normalize().multiplyScalar(distanceValue));
  state.controls.update(); state.updateFeedback(); draw();
}

describe('Candidate Brain Atlas visible 3D zoom', () => {
  it('renders translated native controls and routes their actual click handlers through bounded zoom', async () => {
    const announceToSR = vi.fn();
    await mount({ context: { announceToSR, t: (key, fallback) => key.startsWith('stem.brainatlas.d3_zoom') ? 'Traduit: ' + fallback : fallback || key } });
    poseAt(4);
    const inward = scene.button('in'), outward = scene.button('out');
    expect(inward.tagName).toBe('BUTTON'); expect(outward.tagName).toBe('BUTTON');
    expect(inward.closest('[data-brainatlas-3d-zoom-controls]')).not.toBeNull();
    expect(inward.closest('.brainatlas-canvas-header')).not.toBeNull();
    expect(outward.closest('.brainatlas-canvas-header')).toBe(inward.closest('.brainatlas-canvas-header'));
    expect(inward.getAttribute('aria-label')).toBe('Traduit: Zoom in');
    expect(outward.getAttribute('aria-label')).toBe('Traduit: Zoom out');
    expect(inward.closest('[role="group"]').getAttribute('aria-label')).toBe('Traduit: Zoom the 3D model');
    const zoom = vi.spyOn(scene.state, 'zoomBy'); announceToSR.mockClear();
    await scene.click('in');
    expect(zoom).toHaveBeenLastCalledWith(.9, true); expect(distance()).toBeCloseTo(3.6, 8);
    await scene.click('out');
    expect(zoom).toHaveBeenLastCalledWith(1.1, true); expect(distance()).toBeCloseTo(3.96, 8);
    expect(announceToSR.mock.calls.map(call => call[0])).toEqual(['Traduit: Zoomed in on the 3D model.', 'Traduit: Zoomed out from the 3D model.']);
  });

  it('scales around a translated focus while preserving direction, up vector and anatomical context', async () => {
    await mount({ initialState: { selected3DStructure: SELECTED, selectedRegion: 'hippocampus', brain3DLayer: 'left', brain3DFocus: 'fade', brain3DSliceAxis: 'coronal', brain3DSlicePosition: 35, brain3DSliceFlip: true } });
    poseAt(5);
    const { state } = scene, target = state.controls.target.clone(), up = state.camera.up.clone();
    const direction = state.camera.position.clone().sub(target).normalize();
    const context = [state.selectedStructure, state.selectedRegion, state.layer, state.focus, state.sliceAxis, state.slicePosition, state.sliceFlip];
    const matrices = state.meshes.map(mesh => mesh.matrixWorld.toArray());
    expect(state.zoomBy(.9, false)).toBe(true);
    expect(distance()).toBeCloseTo(4.5, 9);
    closeVector(state.controls.target, target); closeVector(state.camera.up, up);
    closeVector(state.camera.position.clone().sub(target).normalize(), direction);
    expect([state.selectedStructure, state.selectedRegion, state.layer, state.focus, state.sliceAxis, state.slicePosition, state.sliceFlip]).toEqual(context);
    expect(state.meshes.map(mesh => mesh.matrixWorld.toArray())).toEqual(matrices);
    expect(scene.store.toolData.brainAtlas).toMatchObject({ selected3DStructure: SELECTED, brain3DLayer: 'left', brain3DSliceAxis: 'coronal', brain3DSlicePosition: 35, brain3DSliceFlip: true });
  });

  it('clamps to live orbit limits and updates disabled buttons without a React rerender', async () => {
    await mount(); const { state } = scene;
    state.controls.minDistance = .65; state.controls.maxDistance = 6.5; poseAt(3);
    expect(state.zoomBy(.00001, false)).toBe(true); expect(distance()).toBeCloseTo(.65, 9);
    expect(scene.button('in').disabled).toBe(true); expect(scene.button('out').disabled).toBe(false);
    draw(); const renders = state.renderer.render.mock.calls.length;
    expect(state.zoomBy(.9, false)).toBe(false); expect(frames.size).toBe(0);
    expect(state.renderer.render).toHaveBeenCalledTimes(renders);
    expect(state.zoomBy(100000, false)).toBe(true); expect(distance()).toBeCloseTo(6.5, 9);
    expect(scene.button('in').disabled).toBe(false); expect(scene.button('out').disabled).toBe(true);
    draw(); expect(state.zoomBy(1.1, false)).toBe(false); expect(frames.size).toBe(0);
    expect(state.controls.minDistance).toBe(.65); expect(state.controls.maxDistance).toBe(6.5);
  });

  it('uses portrait-aware fallback distances when live orbit bounds are invalid', async () => {
    await mount(); const { state } = scene;
    state.controls.minDistance = NaN; state.controls.maxDistance = NaN;
    state.camera.aspect = .5; state.camera.updateProjectionMatrix(); poseAt(4);
    expect(state.zoomBy(100, false)).toBe(true); expect(distance()).toBeCloseTo(18, 8);
    expect(scene.button('out').disabled).toBe(true);
    expect(state.zoomBy(.00001, false)).toBe(true); expect(distance()).toBeCloseTo(.35, 8);
    expect(scene.button('in').disabled).toBe(true);
  });

  it.each([NaN, Infinity, -Infinity, 0, -1, 1, undefined, null, '0.9'])('rejects invalid or identity factor %s without changing the view', async factor => {
    await mount(); const { state } = scene, position = state.camera.position.clone(), target = state.controls.target.clone();
    expect(state.zoomBy(factor, false)).toBe(false);
    closeVector(state.camera.position, position); closeVector(state.controls.target, target); expect(frames.size).toBe(0);
  });

  it('keeps loading controls disabled and enables them only when the model becomes ready', async () => {
    await mount({ deferred: true }); const { state } = scene;
    expect(state.ready).toBe(false); expect(scene.button('in').disabled).toBe(true); expect(scene.button('out').disabled).toBe(true);
    const position = state.camera.position.clone(); expect(state.zoomBy(.9, true)).toBe(false); closeVector(state.camera.position, position);
    await scene.resolveModel(); draw();
    expect(state.ready).toBe(true); expect(scene.button('in').disabled).toBe(false); expect(scene.button('out').disabled).toBe(false);
    const before = distance(); await scene.click('in'); expect(distance()).toBeCloseTo(before * .9, 8);
  });

  it('keeps model failure unavailable instead of moving an unready camera', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await mount({ deferred: true }); await scene.rejectModel(); const { state } = scene;
    expect(error).toHaveBeenCalled(); expect(state.ready).toBe(false);
    expect(scene.stage.querySelector('.brainatlas-3d-loading').dataset.state).toBe('error');
    expect(scene.button('in').disabled).toBe(true); expect(scene.button('out').disabled).toBe(true);
    const position = state.camera.position.clone(); expect(state.zoomBy(1.1, true)).toBe(false); closeVector(state.camera.position, position);
  });

  it.each([['+', .9], ['=', .9], ['-', 1.1], ['_', 1.1]])('routes canvas %s through the same zoom operation', async (key, factor) => {
    await mount(); poseAt(4);
    const zoom = vi.spyOn(scene.state, 'zoomBy');
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    scene.canvas.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true); expect(zoom).toHaveBeenCalledOnce(); expect(zoom.mock.calls[0][0]).toBe(factor);
    expect(distance()).toBeCloseTo(4 * factor, 8);
  });

  it('cancels an in-progress reveal and hover so later frames cannot snap the camera back', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    await mount({ initialState: { selected3DStructure: SELECTED } }); const { state } = scene;
    const started = performance.now(); expect(state.revealStructure(SELECTED, 'hippocampus', false, true)).toBe(true);
    draw(started + 160); expect(state.cameraTween).toBeTruthy();
    state.setHover(NEIGHBOR, { x: 200, y: 150 }); expect(state.hoveredStructure).toBe(NEIGHBOR);
    expect(state.zoomBy(.9, false)).toBe(true); expect(state.cameraTween).toBeNull(); expect(state.hoveredStructure).toBe('');
    expect(scene.stage.querySelector('[data-brainatlas-hover-label]').hidden).toBe(true);
    const position = state.camera.position.clone(), target = state.controls.target.clone();
    for (const elapsed of [300, 700, 1100]) draw(started + elapsed);
    closeVector(state.camera.position, position); closeVector(state.controls.target, target); expect(frames.size).toBe(0);
  });

  it.each([['selected', {}], ['pathway', { brain3DPathway: 'papez', brain3DPathwayStep: 0 }]])('reprojects the cached %s marker to its true surface anchor after zoom', async (kind, settings) => {
    await mount({ initialState: { selected3DStructure: SELECTED, ...settings } });
    const { state, stage } = scene; state.setPreset('front', false); draw();
    const cache = kind === 'selected' ? state.selectedMarker : state.pathwayMarker;
    expect(cache).toBeTruthy(); expect(cache.badge.hidden).toBe(false);
    const anchor = cache.anchor, key = state.selectedStructure;
    for (const factor of [.9, 1.1]) {
      expect(state.zoomBy(factor, false)).toBe(true); draw();
      expect((kind === 'selected' ? state.selectedMarker : state.pathwayMarker).anchor).toBe(anchor);
      expect(cache.badge.hidden).toBe(false); state.camera.updateMatrixWorld(true);
      const projected = anchor.clone().project(state.camera);
      expect(Number(cache.dot.getAttribute('cx'))).toBeCloseTo((projected.x + 1) * stage.clientWidth / 2, 7);
      expect(Number(cache.dot.getAttribute('cy'))).toBeCloseTo((1 - projected.y) * stage.clientHeight / 2, 7);
      expect(state.selectedStructure).toBe(key);
    }
    if (kind === 'pathway') expect(stage.querySelector('[data-brainatlas-selected-marker]')).toBeNull();
  });

  it('coalesces requested GPU work and leaves no idle or after-cleanup rendering', async () => {
    await mount(); const { state } = scene, renderer = state.renderer;
    const before = renderer.render.mock.calls.length;
    expect(state.zoomBy(.9, false)).toBe(true); expect(state.zoomBy(1.1, false)).toBe(true);
    expect(frames.size).toBe(1); draw(); expect(renderer.render).toHaveBeenCalledTimes(before + 1); expect(frames.size).toBe(0);
    draw(); expect(renderer.render).toHaveBeenCalledTimes(before + 1);
    expect(state.zoomBy(.9, false)).toBe(true); expect(frames.size).toBe(1);
    state.cleanup(); expect(frames.size).toBe(0); expect(renderer.dispose).toHaveBeenCalledOnce();
    const position = state.camera.position.clone(); expect(state.zoomBy(.9, false)).toBe(false); closeVector(state.camera.position, position);
    draw(); expect(renderer.render).toHaveBeenCalledTimes(before + 1);
  });
});
