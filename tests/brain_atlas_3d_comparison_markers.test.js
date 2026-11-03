import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { resetStemLab, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';
import { mountBrainAtlasScene, THREE } from './helpers/brain_atlas_3d_scene.js';

const A = 'Allen_body_of_hippocampus_L', B = 'Allen_amygdaloid_complex_R';
let state, frames;
beforeEach(() => {
  resetStemLab();
  frames = new Map();
  let id = 0;
  vi.stubGlobal('requestAnimationFrame', callback => { frames.set(++id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', frame => frames.delete(frame));
});
afterEach(() => {
  state?.cleanup();
  state = null;
  for (const key of Object.keys(window).filter(key => key.startsWith('__alloBrainAtlas3D'))) delete window[key];
  document.body.replaceChildren();
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

function draw() {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach(callback => callback(performance.now()));
}
function vertex(mesh, index) {
  return new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, index).applyMatrix4(mesh.matrixWorld);
}
function project(point, stage) {
  const ndc = point.clone().project(state.camera);
  return [(ndc.x + 1) * stage.clientWidth / 2, (1 - ndc.y) * stage.clientHeight / 2];
}
function readMarker(stage, index) {
  const dot = stage.querySelector(`[data-brainatlas-comparison-anchor="${index}"]`);
  const line = stage.querySelector(`[data-brainatlas-comparison-leader="${index}"]`);
  const badge = stage.querySelector(`[data-brainatlas-comparison-marker="${index}"]`);
  expect(dot.hasAttribute('hidden')).toBe(badge.hidden);
  expect(line.hasAttribute('hidden')).toBe(badge.hidden);
  const anchor = [Number(dot.getAttribute('cx')), Number(dot.getAttribute('cy'))];
  const center = [parseFloat(badge.style.left), parseFloat(badge.style.top)];
  if (!badge.hidden) {
    expect([Number(line.getAttribute('x1')), Number(line.getAttribute('y1'))]).toEqual(anchor);
    expect([Number(line.getAttribute('x2')), Number(line.getAttribute('y2'))]).toEqual(center);
  }
  return { hidden: badge.hidden, anchor, center };
}
function expectPoint(actual, expected) {
  expect(actual[0]).toBeCloseTo(expected[0], 6);
  expect(actual[1]).toBeCloseTo(expected[1], 6);
}

async function setup({ reduce = true } = {}) {
  vi.stubGlobal('matchMedia', () => ({ matches: reduce }));
  const root = new THREE.Group();
  function triangle(key, positions) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mesh = new THREE.Mesh(geometry); mesh.name = key; root.add(mesh); return mesh;
  }
  // A has two disjoint pieces; its union's center lies in the empty gap.
  triangle(A, [-2.5, 0, 0, -2.2, .3, .15, -2.3, -.1, .03]);
  const a = triangle(A, [-.75, 0, 0, -.55, .55, .2, -.35, -.3, -.12]);
  const b = triangle(B, [.5, .1, -.15, .8, .65, .2, .95, -.3, -.12]);
  const s = await mountBrainAtlasScene(root, { width: 400, height: 300, initialState: { brain3DCompareActive: true, brain3DCompareStructures: [A, B] } });
  state = s.state;
  const stage = s.canvas.parentNode;
  const rect = { left: 80, top: 40, width: 400, height: 300 };
  vi.spyOn(stage, 'getBoundingClientRect').mockImplementation(() => rect);
  const overlay = s.nodes().find(node => node.props?.['data-brainatlas-comparison-markers'] === 'true');
  stage.insertAdjacentHTML('beforeend', ReactDOMServer.renderToStaticMarkup(overlay));
  const refresh = updates => {
    Object.assign(s.store.toolData.brainAtlas, updates);
    const tree = s.nodes();
    tree.find(node => node.props?.['data-brainatlas-3d-canvas'] === 'true').ref(s.canvas);
    return tree;
  };
  draw();
  return { ...s, stage, rect, a, b, refresh };
}

describe('Brain Atlas comparison markers', () => {
  it('projects a retained vertex instead of the gap between two matching pieces, without rescanning on camera movement', async () => {
    const s = await setup();
    const layer = s.stage.querySelector('[data-brainatlas-comparison-markers]');
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(layer.querySelector('button, [tabindex]')).toBeNull();
    const anchor = vertex(s.a, 0);
    expectPoint(readMarker(s.stage, 0).anchor, project(anchor, s.stage));
    const scan = vi.spyOn(s.a.geometry.attributes.position, 'getX');
    state.camera.position.set(1.2, 1.4, 3.2);
    state.controls.target.set(-.1, .1, 0); state.controls.update();
    state.requestRender(); draw();
    expectPoint(readMarker(s.stage, 0).anchor, project(anchor, s.stage));
    expect(scan).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });

  it('separates aligned badges at a window edge while keeping both leader origins on the pointer-independent anatomical positions', async () => {
    const s = await setup();
    const near = vertex(s.a, 0);
    // Identify B's current surface vertex from its projected dot, then put
    // the camera on the line between both real vertices for an end-on view.
    const initialB = readMarker(s.stage, 1).anchor;
    const far = [0, 1, 2].map(i => vertex(s.b, i)).find(v => {
      const p = project(v, s.stage); return Math.hypot(p[0] - initialB[0], p[1] - initialB[1]) < .0001;
    });
    expect(far).toBeDefined();
    state.controls.target.copy(near);
    state.camera.position.copy(near).addScaledVector(far.clone().sub(near).normalize(), 5);
    state.controls.update(); state.requestRender(); draw();
    const position = state.camera.position.clone(), target = state.controls.target.clone();
    const renders = state.renderer.render.mock.calls.length;
    s.rect.left = -198;
    window.dispatchEvent(new Event('scroll'));
    const a = readMarker(s.stage, 0), b = readMarker(s.stage, 1);
    expect(a.hidden || b.hidden).toBe(false);
    expectPoint(a.anchor, b.anchor);
    expectPoint(a.anchor, project(near, s.stage));
    expect(Math.hypot(a.center[0] - b.center[0], a.center[1] - b.center[1])).toBeGreaterThanOrEqual(36);
    for (const { center } of [a, b]) {
      expect(center[0] + s.rect.left - 14).toBeGreaterThanOrEqual(4);
      expect(center[1] - 14).toBeGreaterThanOrEqual(4);
    }
    expect(state.renderer.render).toHaveBeenCalledTimes(renders);
    expect(state.camera.position.equals(position)).toBe(true);
    expect(state.controls.target.equals(target)).toBe(true);
    expect(frames.size).toBe(0);
  });

  it('updates retained anchors after a cut and hides only the clipped, hidden, or missing member', async () => {
    const s = await setup();
    const original = vertex(s.a, 0);
    const range = state.modelBounds;
    function depthBeyond(x) { return Math.ceil((x - range.min.x) * 100 / (range.max.x - range.min.x)) + 1; }
    s.refresh({ brain3DSliceAxis: 'sagittal', brain3DSlicePosition: depthBeyond(original.x) }); draw();
    const a = readMarker(s.stage, 0);
    expect(a.hidden).toBe(false);
    expect(state.clipPlane.distanceToPoint(original)).toBeLessThan(0);
    const retained = [0, 1, 2].map(i => vertex(s.a, i)).filter(v => state.clipPlane.distanceToPoint(v) >= 0);
    expect(retained.some(v => {
      const p = project(v, s.stage); return Math.hypot(p[0] - a.anchor[0], p[1] - a.anchor[1]) < .0001;
    })).toBe(true);
    s.refresh({ brain3DSlicePosition: depthBeyond(vertex(s.a, 2).x) }); draw();
    expect(readMarker(s.stage, 0).hidden).toBe(true);
    expect(readMarker(s.stage, 1).hidden).toBe(false);
    s.refresh({ brain3DSliceAxis: 'off', brain3DLayer: 'left' }); draw();
    expect(readMarker(s.stage, 0).hidden).toBe(false);
    expect(readMarker(s.stage, 1).hidden).toBe(true);
    s.refresh({ brain3DLayer: 'all', brain3DCompareStructures: ['absent', B] }); draw();
    expect(readMarker(s.stage, 0).hidden).toBe(true);
    expect(readMarker(s.stage, 1).hidden).toBe(false);
  });

  it('hides offscreen and behind-camera anchors instead of pinning them to a false edge position', async () => {
    const s = await setup();
    for (const [position, target] of [[[8, 0, 3], [8, 0, 0]], [[0, 0, -4], [0, 0, -6]]]) {
      state.camera.position.fromArray(position); state.controls.target.fromArray(target);
      state.controls.update(); state.requestRender(); draw();
      expect(readMarker(s.stage, 0).hidden).toBe(true);
      expect(readMarker(s.stage, 1).hidden).toBe(true);
    }
  });

  it('updates during reveal tween draws as the camera moves', async () => {
    const s = await setup({ reduce: false });
    const start = performance.now(), anchor = vertex(s.a, 0);
    const initial = readMarker(s.stage, 0).anchor;
    expect(state.revealStructure(A, null, false, true)).toBe(true);
    // Execute the reveal frame independently of the coalesced requestRender callback.
    const tween = frames.get(state.cameraTween);
    frames.delete(state.cameraTween);
    tween(start + 180);
    const middle = readMarker(s.stage, 0);
    expect(middle.hidden).toBe(false);
    expectPoint(middle.anchor, project(anchor, s.stage));
    expect(Math.hypot(middle.anchor[0] - initial[0], middle.anchor[1] - initial[1])).toBeGreaterThan(1);
  });

  it.each(['brain3DChallengeActive', 'brain3DSavedQuizActive'])('removes markers on %s and clears them immediately on cleanup', async mode => {
    const s = await setup();
    const tree = s.refresh({ [mode]: true });
    expect(tree.some(node => node.props?.['data-brainatlas-comparison-markers'])).toBe(false);
    for (const i of [0, 1]) expect(readMarker(s.stage, i).hidden).toBe(true);
    s.refresh({ [mode]: false, brain3DCompareStructures: [A] }); draw();
    expect(readMarker(s.stage, 0).hidden).toBe(false);
    expect(readMarker(s.stage, 1).hidden).toBe(true);
    state.cleanup();
    expect(readMarker(s.stage, 0).hidden).toBe(true);
    expect(frames.size).toBe(0);
  });
});
