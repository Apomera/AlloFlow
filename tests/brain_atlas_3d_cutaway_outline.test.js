import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { THREE, mountBrainAtlasScene } from './helpers/brain_atlas_3d_scene.js';

let state, frames;
beforeEach(() => {
  resetStemLab();
  frames = new Map(); let id = 0;
  vi.stubGlobal('requestAnimationFrame', callback => { frames.set(++id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', frame => frames.delete(frame));
});
afterEach(() => {
  state?.cleanup(); state = null;
  for (const key of Object.keys(window).filter(key => key.startsWith('__alloBrainAtlas3D'))) delete window[key];
  document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

function draw() {
  const pending = [...frames.values()]; frames.clear();
  pending.forEach(callback => callback(performance.now()));
}
async function mount() {
  const root = new THREE.Group();
  const left = new THREE.Mesh(new THREE.BoxGeometry(.7, 1.4, .5));
  left.name = 'Allen_body_of_hippocampus_L'; left.position.set(-.7, .4, .1);
  const right = new THREE.Mesh(new THREE.BoxGeometry(1.1, .7, 2.2));
  right.name = 'Allen_precentral_gyrus_R'; right.position.set(.8, -.2, .5);
  root.add(left, right);
  const scene = await mountBrainAtlasScene(root); state = scene.state;
  expect(state.ready).toBe(true); draw();
  const change = (axis, depth, flip) => {
    Object.assign(scene.store.toolData.brainAtlas, { brain3DSliceAxis: axis, brain3DSlicePosition: depth, brain3DSliceFlip: flip });
    const nodes = scene.nodes();
    nodes.find(node => node.props?.['data-brainatlas-3d-canvas'] === 'true').ref(scene.canvas);
    draw(); return nodes;
  };
  return { ...scene, left, right, change };
}

describe('Brain Atlas cut plane outline', () => {
  it.each([
    ['sagittal', 'x', 'Left', 'Right'], ['coronal', 'z', 'Posterior', 'Anterior'], ['axial', 'y', 'Inferior', 'Superior']
  ])('shows the %s plane and its retained side consistently in the model and navigator', async (axis, coordinate, lowName, highName) => {
    const s = await mount();
    let outline, unflippedCorners;
    for (const depth of [0, 27, 100]) for (const flip of [false, true]) {
      const nodes = s.change(axis, depth, flip);
      const guide = state.cutawayOutline;
      if (outline) expect(guide).toBe(outline);
      outline = guide;
      expect(guide.isLineLoop).toBe(true);
      expect(guide.visible).toBe(true);
      expect(guide.parent).toBe(state.scene);
      expect(guide.material.color.getHex()).toBe(flip ? 0xfbbf24 : 0x5eead4);
      guide.updateMatrixWorld(true);
      const positions = guide.geometry.attributes.position;
      expect(positions.count).toBe(4);
      const corners = Array.from({ length: 4 }, (_, i) => new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(guide.matrixWorld));
      for (const corner of corners) expect(state.clipPlane.distanceToPoint(corner)).toBeCloseTo(0, 7);
      if (flip) expect(corners.map(corner => corner.toArray())).toEqual(unflippedCorners);
      else unflippedCorners = corners.map(corner => corner.toArray());
      const bounds = new THREE.Box3().setFromPoints(corners);
      for (const direction of ['x', 'y', 'z'].filter(value => value !== coordinate)) {
        const margin = (state.modelBounds.max[direction] - state.modelBounds.min[direction]) * .06;
        expect(bounds.min[direction]).toBeCloseTo(state.modelBounds.min[direction] - margin, 7);
        expect(bounds.max[direction]).toBeCloseTo(state.modelBounds.max[direction] + margin, 7);
      }
      const side = flip ? lowName : highName;
      const readout = nodes.find(node => node.props?.['data-brainatlas-retained-side'] !== undefined);
      expect(readout.props.children).toContain(side);
      const canvas = nodes.find(node => node.props?.['data-brainatlas-3d-canvas'] === 'true');
      expect(canvas.props['aria-label']).toContain(`Depth ${depth}% · retained toward ${side}`);
      const flipButton = nodes.find(node => node.props?.['data-brainatlas-3d-slice-flip'] === 'true');
      expect(flipButton.props.children).toBe('Flip side');
      expect(flipButton.props['aria-pressed']).toBe(flip);
      const map = nodes.find(node => node.props?.className === 'brainatlas-3d-slice-map');
      expect(map.props['aria-label']).toContain('Retained: ' + side);
      const region = nodes.find(node => node.props?.['data-brainatlas-retained-region'] !== undefined).props;
      const vertical = axis === 'axial';
      const start = Number(region[vertical ? 'y' : 'x']);
      const extent = Number(region[vertical ? 'height' : 'width']);
      const trackStart = vertical ? 29 : 32, trackLength = vertical ? 54 : 136;
      expect(start).toBeGreaterThanOrEqual(trackStart);
      expect(start + extent).toBeLessThanOrEqual(trackStart + trackLength + 1e-7);
      for (const fraction of [.05, .21, .41, .72, .95]) {
        const point = new THREE.Vector3();
        point[coordinate] = state.modelBounds.min[coordinate] + fraction * (state.modelBounds.max[coordinate] - state.modelBounds.min[coordinate]);
        const mapPosition = trackStart + fraction * trackLength;
        const shaded = mapPosition >= start && mapPosition <= start + extent;
        expect(shaded).toBe(state.clipPlane.distanceToPoint(point) > 0);
      }
      expect(frames.size).toBe(0);
    }
  });

  it('keeps the guide separate from anatomy and picking, reuses it on reopen, and disposes it exactly once', async () => {
    const s = await mount();
    const geometry = s.left.geometry;
    const vertices = Array.from(geometry.attributes.position.array);
    const normals = Array.from(geometry.attributes.normal.array);
    s.change('coronal', 31, false);
    const guide = state.cutawayOutline;
    expect(state.meshes).toEqual([s.left, s.right]);
    expect(state.root.children).not.toContain(guide);
    vi.spyOn(s.canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 800, height: 620 });
    const intersect = vi.spyOn(state.raycaster, 'intersectObjects');
    state.pickAt(400, 310);
    expect(intersect.mock.lastCall[0]).toEqual([s.left, s.right]);
    s.change('off', 31, false);
    expect(guide.visible).toBe(false);
    s.change('axial', 84, true);
    expect(state.cutawayOutline).toBe(guide);
    expect(guide.visible).toBe(true);
    expect(s.left.geometry).toBe(geometry);
    expect(Array.from(geometry.attributes.position.array)).toEqual(vertices);
    expect(Array.from(geometry.attributes.normal.array)).toEqual(normals);
    const disposeGeometry = vi.spyOn(guide.geometry, 'dispose');
    const disposeMaterial = vi.spyOn(guide.material, 'dispose');
    state.cleanup(); state.cleanup();
    expect(guide.parent).toBeNull();
    expect(disposeGeometry).toHaveBeenCalledOnce();
    expect(disposeMaterial).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
  });
});
