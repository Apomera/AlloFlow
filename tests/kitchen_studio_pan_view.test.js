import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const PanView = require('../stem_lab/kitchen_studio/kitchen_studio_pan_view.js');
const mounted = [];
const controlKeys = [
  'enabled', 'enableRotate', 'enableZoom', 'enablePan', 'enableDamping',
  'dampingFactor', 'autoRotate', 'minDistance', 'maxDistance',
  'minPolarAngle', 'maxPolarAngle', 'minAzimuthAngle', 'maxAzimuthAngle'
];

function fixture(aspect = 16 / 9) {
  document.body.innerHTML = `
    <canvas id="panCanvas"></canvas>
    <section id="studioPanView" hidden>
      <button type="button" id="studioPanOpen" aria-expanded="false">Inspect pan</button>
      <div id="studioPanPanel" hidden>
        <label for="studioPanAngle" id="studioPanAngleLabel">Pan angle</label>
        <input id="studioPanAngle" type="range" min="0" max="100" value="60">
        <p id="studioPanReadout" aria-live="polite"></p>
        <button type="button" id="studioPanClose">Return to kitchen</button>
      </div>
    </section>`;
  const camera = new THREE.PerspectiveCamera(42, aspect, .23, 345);
  camera.position.set(7, 8, 9);
  camera.zoom = 1.3;
  camera.updateProjectionMatrix();
  const controls = {
    target: new THREE.Vector3(.4, 1.3, -.2),
    enabled: true, enableRotate: true, enableZoom: true, enablePan: true,
    enableDamping: true, dampingFactor: .13, autoRotate: false,
    minDistance: .9, maxDistance: 21, minPolarAngle: .15,
    maxPolarAngle: 1.4, minAzimuthAngle: -.7, maxAzimuthAngle: .8,
    update: vi.fn(() => {
      camera.lookAt(controls.target);
      camera.updateMatrixWorld(true);
    })
  };
  controls.update();
  const canvas = document.getElementById('panCanvas');
  const host = { THREE, camera, controls, canvas, cancel: vi.fn(), draw: vi.fn(), onViewChange: vi.fn() };
  const view = PanView.mount(host);
  mounted.push(view);
  const values = { heat: 'medium', dry: true, spread: true, brown: 0, seconds: 0 };
  const state = { active: true, visible: true, values, historical: false, revision: 'attempt-1:0' };
  view.update(state);
  return { view, host, camera, controls, canvas, state, values,
    opener: document.getElementById('studioPanOpen'),
    panel: document.getElementById('studioPanPanel'),
    section: document.getElementById('studioPanView'),
    angle: document.getElementById('studioPanAngle'),
    readout: document.getElementById('studioPanReadout') };
}

function snapshot({ camera, controls }) {
  return {
    position: camera.position.toArray(), quaternion: camera.quaternion.toArray(),
    up: camera.up.toArray(), zoom: camera.zoom, fov: camera.fov, near: camera.near, far: camera.far,
    target: controls.target.toArray(),
    controls: Object.fromEntries(controlKeys.map(key => [key, controls[key]]))
  };
}

function inputAngle(f, value) {
  f.angle.value = String(value);
  f.angle.dispatchEvent(new Event('input', { bubbles: true }));
}

function assertPanFits(camera) {
  camera.updateMatrixWorld(true);
  const points = [];
  for (const [x, z, radius, y] of [[.1, -.85, .43, 1.65], [-.29, -.42, .27, 1.54], [.1, -.02, .39, 1.49]]) {
    for (let i = 0; i < 32; i++) points.push(new THREE.Vector3(x + Math.cos(i * Math.PI / 16) * radius, y, z + Math.sin(i * Math.PI / 16) * radius));
  }
  points.push(new THREE.Vector3(.79, 1.39, -.32), new THREE.Vector3(.72, 1.43, .12), new THREE.Vector3(.95, 1.54, -.85), new THREE.Vector3(-.38, 1.65, -1.3));
  for (const point of points) {
    const projected = point.project(camera);
    expect(Math.abs(projected.x)).toBeLessThanOrEqual(.880001);
    expect(Math.abs(projected.y)).toBeLessThanOrEqual(.840001);
    expect(projected.z).toBeGreaterThan(-1);
    expect(projected.z).toBeLessThan(1);
  }
}

afterEach(() => {
  mounted.splice(0).forEach(view => view.dispose());
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('Kitchen pan close-up camera', () => {
  it('opens only when active and visible, using the native button', () => {
    const f = fixture();
    f.view.update({ active: false });
    f.view.open();
    expect(f.panel.hidden).toBe(true);
    expect(f.section.hidden).toBe(true);
    f.view.update({ active: true, visible: false });
    f.view.open();
    expect(f.panel.hidden).toBe(true);
    f.view.update({ visible: true });
    f.opener.click();
    expect(f.panel.hidden).toBe(false);
    expect(f.section.hidden).toBe(false);
    expect(f.opener.getAttribute('aria-expanded')).toBe('true');
    expect(f.host.onViewChange).toHaveBeenLastCalledWith(true);
  });

  it('cancels a held gesture before taking the return-camera snapshot', () => {
    const f = fixture();
    let afterCancel;
    f.host.cancel.mockImplementationOnce(() => {
      f.camera.position.set(-4, 5, 6);
      f.controls.target.set(.1, .2, .3);
      f.controls.update();
      afterCancel = snapshot(f);
    });
    f.view.open();
    expect(f.host.cancel).toHaveBeenCalledTimes(1);
    expect(snapshot(f).position).not.toEqual(afterCancel.position);
    f.view.close();
    expect(snapshot(f)).toEqual(afterCancel);
  });

  it('restores the original view once after repeated open and angle changes', () => {
    const f = fixture();
    const before = snapshot(f);
    f.view.open();
    inputAngle(f, 0);
    f.view.open();
    inputAngle(f, 100);
    f.view.close();
    expect(snapshot(f)).toEqual(before);
    expect(f.panel.hidden).toBe(true);
    expect(f.opener.getAttribute('aria-expanded')).toBe('false');
    expect(f.host.onViewChange.mock.calls).toEqual([[true], [false]]);
    const cancels = f.host.cancel.mock.calls.length;
    const draws = f.host.draw.mock.calls.length;
    f.view.close();
    expect(f.host.cancel).toHaveBeenCalledTimes(cancels);
    expect(f.host.draw).toHaveBeenCalledTimes(draws);
    expect(snapshot(f)).toEqual(before);
  });

  it.each([16 / 9, 360 / 600, 320 / 500, 2.4])('keeps pan, handle and spatula bounds in view at aspect %s', aspect => {
    const f = fixture(aspect);
    f.view.open();
    const firstPosition = f.camera.position.clone();
    for (const value of [0, 1, 25, 50, 75, 99, 100]) {
      inputAngle(f, value);
      assertPanFits(f.camera);
      expect(f.angle.getAttribute('aria-valuetext')).toBeTruthy();
    }
    expect(f.camera.position.equals(firstPosition)).toBe(false);
  });

  it('cancels and refits after a resize while preserving the original return view', () => {
    const f = fixture();
    const before = snapshot(f);
    f.view.open();
    inputAngle(f, 30);
    f.camera.aspect = 320 / 600;
    f.camera.updateProjectionMatrix();
    f.host.cancel.mockClear();
    f.view.resize();
    expect(f.host.cancel).toHaveBeenCalledTimes(1);
    expect(f.panel.hidden).toBe(false);
    assertPanFits(f.camera);
    f.view.close();
    expect(snapshot(f)).toEqual(before);
    expect(f.camera.aspect).toBe(320 / 600);
  });
});

describe('Kitchen pan close-up state and lifecycle', () => {
  it('keeps replay inspection operable and describes historical values without modifying them', () => {
    const f = fixture();
    const values = Object.freeze({ heat: 'high', dry: false, spread: false, brown: 5, seconds: 90 });
    f.view.update({ historical: true, values, revision: 'replay:3' });
    expect(f.opener.disabled).toBe(false);
    f.opener.click();
    expect(f.panel.hidden).toBe(false);
    expect(f.angle.disabled).toBe(false);
    inputAngle(f, 25);
    expect(f.readout.textContent).toMatch(/recorded|historical/i);
    expect(f.readout.textContent).toMatch(/high/i);
    expect(f.readout.textContent).toMatch(/burn/i);
    expect(values).toEqual({ heat: 'high', dry: false, spread: false, brown: 5, seconds: 90 });
  });

  it('refreshes cooking evidence and cancels a changed revision without closing the heat view', () => {
    const f = fixture();
    f.view.open();
    const original = f.readout.textContent;
    f.host.cancel.mockClear();
    f.view.update({ values: { heat: 'high', dry: true, spread: true, brown: 3, seconds: 60 }, revision: 'attempt-1:1' });
    expect(f.host.cancel).toHaveBeenCalledTimes(1);
    expect(f.panel.hidden).toBe(false);
    expect(f.readout.textContent).not.toBe(original);
    expect(f.readout.textContent).toMatch(/high/i);
    expect(f.readout.textContent).toMatch(/golden/i);
    expect(f.readout.textContent).toMatch(/60/);
    f.host.cancel.mockClear();
    f.view.update({ revision: 'attempt-1:1' });
    expect(f.host.cancel).not.toHaveBeenCalled();
  });

  it.each([
    [{ heat: null, dry: false, spread: false, brown: 0, seconds: 0 }, ['Pale', 'Wet surface', 'crowded', 'off', '0 simulated seconds']],
    [{ heat: 'low', dry: true, spread: true, brown: 1, seconds: 30 }, ['Beginning to brown', 'Dry surface', 'space between', 'low', '30 simulated seconds']],
    [{ heat: 'medium', dry: true, spread: true, brown: 4, seconds: 120 }, ['Golden', 'Dry surface', 'space between', 'medium', '120 simulated seconds']]
  ])('reports the displayed evidence accurately for %j', (values, terms) => {
    const f = fixture();
    Object.freeze(values);
    f.view.update({ values });
    f.view.open();
    for (const term of terms) expect(f.readout.textContent).toContain(term);
    expect(f.readout.textContent).not.toMatch(/recorded|historical/i);
  });

  it.each([{ active: false }, { visible: false }])('restores the room when state becomes %j', next => {
    const f = fixture();
    const before = snapshot(f);
    f.view.open();
    f.view.update(next);
    expect(f.panel.hidden).toBe(true);
    expect(f.section.hidden).toBe(true);
    expect(snapshot(f)).toEqual(before);
  });

  it('leaves a consumed Escape to the held gesture, then closes and returns focus on the next Escape', () => {
    const f = fixture();
    f.view.open();
    f.angle.focus();
    const consumed = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    consumed.preventDefault();
    document.dispatchEvent(consumed);
    expect(f.panel.hidden).toBe(false);
    expect(document.activeElement).toBe(f.angle);
    const close = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.dispatchEvent(close);
    expect(close.defaultPrevented).toBe(true);
    expect(f.panel.hidden).toBe(true);
    expect(document.activeElement).toBe(f.opener);
  });

  it('returns keyboard focus when the visible close button is used', () => {
    const f = fixture();
    f.view.open();
    document.getElementById('studioPanClose').click();
    expect(f.panel.hidden).toBe(true);
    expect(document.activeElement).toBe(f.opener);
  });

  it.each(['visibilitychange', 'pagehide'])('restores the camera when the page exits through %s', name => {
    const f = fixture();
    const before = snapshot(f);
    f.view.open();
    if (name === 'visibilitychange') {
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
      document.dispatchEvent(new Event(name));
    } else window.dispatchEvent(new Event(name));
    expect(f.panel.hidden).toBe(true);
    expect(snapshot(f)).toEqual(before);
  });

  it('restores on disposal and detaches all document, page and element behavior', () => {
    const added = vi.spyOn(EventTarget.prototype, 'addEventListener');
    const removed = vi.spyOn(EventTarget.prototype, 'removeEventListener');
    const windowAdded = vi.spyOn(window, 'addEventListener');
    const windowRemoved = vi.spyOn(window, 'removeEventListener');
    const f = fixture();
    const nodes = [document, window, f.opener, f.angle, document.getElementById('studioPanClose')];
    const types = ['click', 'input', 'keydown', 'visibilitychange', 'pagehide'];
    const listeners = added.mock.calls.map((args, index) => ({ node: added.mock.contexts[index], args }))
      .filter(({ node, args }) => nodes.includes(node) && types.includes(args[0]));
    expect(listeners).toHaveLength(5);
    const pagehide = windowAdded.mock.calls.find(args => args[0] === 'pagehide');
    expect(pagehide).toBeDefined();
    const before = snapshot(f);
    f.view.open();
    f.view.dispose();
    for (const { node, args } of listeners) {
      expect(removed.mock.calls.some((removedArgs, index) => removed.mock.contexts[index] === node
        && removedArgs[0] === args[0] && removedArgs[1] === args[1])).toBe(true);
    }
    expect(windowRemoved).toHaveBeenCalledWith('pagehide', pagehide[1]);
    expect(snapshot(f)).toEqual(before);
    f.host.cancel.mockClear();
    f.host.draw.mockClear();
    f.host.onViewChange.mockClear();
    f.opener.click();
    inputAngle(f, 0);
    document.getElementById('studioPanClose').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pagehide'));
    f.view.open();
    f.view.update({ active: true, visible: true });
    f.view.resize();
    f.view.dispose();
    expect(f.panel.hidden).toBe(true);
    expect(snapshot(f)).toEqual(before);
    expect(f.host.cancel).not.toHaveBeenCalled();
    expect(f.host.draw).not.toHaveBeenCalled();
    expect(f.host.onViewChange).not.toHaveBeenCalled();
  });
});


describe('Kitchen pan close-up controlled plating', () => {
  function assertPlatingFits(camera) {
    assertPanFits(camera);
    for (const x of [-.36, .34, 1.04]) for (const y of [1.48, 1.895, 2.31]) for (const z of [-.70, -.20, .30]) {
      const point = new THREE.Vector3(x, y, z).project(camera);
      expect(Math.abs(point.x)).toBeLessThanOrEqual(.860001);
      expect(Math.abs(point.y)).toBeLessThanOrEqual(.800001);
      expect(point.z).toBeGreaterThan(-1);
      expect(point.z).toBeLessThan(1);
    }
  }

  it.each([16 / 9, 320 / 500, 360 / 600, 2.4])('keeps a raised, tilted pan and plate reachable at aspect %s', aspect => {
    const f = fixture(aspect);
    f.view.update({ plating: true });
    f.view.open();
    for (const angle of [0, 65, 100]) {
      inputAngle(f, angle);
      assertPlatingFits(f.camera);
    }
  });

  it('cancels and refits once when switching plating mode, then restores the default framing exactly', () => {
    const f = fixture(320 / 500);
    f.view.open();
    const normal = snapshot(f);
    f.host.cancel.mockClear();
    f.host.draw.mockClear();
    f.view.update({ plating: true, revision: 'attempt-1:1' });
    expect(f.host.cancel).toHaveBeenCalledTimes(1);
    expect(f.host.draw).toHaveBeenCalledTimes(1);
    assertPlatingFits(f.camera);
    expect(snapshot(f).position).not.toEqual(normal.position);
    f.host.cancel.mockClear();
    f.host.draw.mockClear();
    f.view.update({ plating: true, revision: 'attempt-1:1' });
    expect(f.host.cancel).not.toHaveBeenCalled();
    expect(f.host.draw).not.toHaveBeenCalled();
    f.view.update({ plating: false });
    expect(f.host.cancel).toHaveBeenCalledTimes(1);
    expect(snapshot(f)).toEqual(normal);
  });

  it('leaves the original return camera and recorded evidence unchanged through plating framing changes', () => {
    const f = fixture();
    const original = snapshot(f);
    const values = Object.freeze({ heat: 'medium', dry: true, spread: true, brown: 3, seconds: 90 });
    f.view.update({ historical: true, values, revision: 'recorded:3' });
    f.view.open();
    f.view.update({ plating: true });
    inputAngle(f, 100);
    assertPlatingFits(f.camera);
    expect(f.readout.textContent).toMatch(/^Recorded pan: Golden/);
    expect(values).toEqual({ heat: 'medium', dry: true, spread: true, brown: 3, seconds: 90 });
    f.view.update({ plating: false });
    f.view.update({ plating: true });
    f.view.close();
    expect(snapshot(f)).toEqual(original);
  });

  it('uses default framing for omitted or non-boolean plating values and does not refit a closed camera', () => {
    const f = fixture();
    f.view.open();
    const normal = snapshot(f);
    f.host.cancel.mockClear();
    f.host.draw.mockClear();
    f.view.update({ plating: 'true' });
    expect(snapshot(f)).toEqual(normal);
    expect(f.host.cancel).not.toHaveBeenCalled();
    expect(f.host.draw).not.toHaveBeenCalled();
    f.view.close();
    const original = snapshot(f);
    f.host.cancel.mockClear();
    f.host.draw.mockClear();
    f.view.update({ plating: true });
    expect(snapshot(f)).toEqual(original);
    expect(f.host.cancel).not.toHaveBeenCalled();
    expect(f.host.draw).not.toHaveBeenCalled();
    f.view.open();
    assertPlatingFits(f.camera);
  });
});
