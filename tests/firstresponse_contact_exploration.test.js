import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modules = ['desktop/web-app/node_modules', 'node_modules'].map(path => resolve(path)).find(path => existsSync(resolve(path, 'react')));
const React = require(resolve(modules, 'react'));
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { act } = require(resolve(modules, 'react-dom/test-utils'));
const source = readFileSync('stem_lab/stem_tool_firstresponse.js', 'utf8');
const THREE = {};
new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
const ages = ['adult', 'child', 'infant'];
const scenes = [];
let build, viewer, viewerConfig, viewerStatus, focus, reset, nudge, host, root, state, patch, lastSync;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  delete window.__alloflowFirstResponse;
  viewerStatus = 'ready';
  focus = vi.fn(); reset = vi.fn(); nudge = vi.fn();
  lastSync = null;
  window.StemLab = {
    _registry: {}, isRegistered: () => false,
    makeBayViewer(config) {
      viewerConfig = config;
      build = config.buildScene;
      return viewer = {
        attach() {}, sync(props) { lastSync = props; }, nudge, zoom() {}, reset, focus,
        status: () => viewerStatus,
      };
    },
    registerTool(id, config) { this._registry[id] = config; },
  };
  new Function(source)();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  for (const scene of scenes.splice(0)) scene.traverse(object => {
    object.geometry?.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) material?.dispose();
  });
});

function mount(seed = {}) {
  function Harness() {
    const [data, setData] = React.useState({ consentAccepted: true, view: 'body3d', b3dTab: 'depth', b3dStatus: 'ready', ...seed });
    state = data;
    patch = values => setData(previous => ({ ...previous, ...values }));
    return window.StemLab._registry.firstResponse.render({
      React, toolData: { firstResponse: data }, update: (_, key, value) => patch({ [key]: value }),
      updateMulti: (_, values) => patch(values), t: (_, fallback) => fallback, addToast() {}, gradeBand: 'g68',
    });
  }
  act(() => root.render(React.createElement(Harness)));
}
function button(label) {
  const found = [...host.querySelectorAll('button')].find(element => element.textContent === label);
  expect(found, label).toBeTruthy();
  return found;
}
function click(label) { act(() => button(label).click()); }
function model(age = 'adult', tab = 'depth', phase = 0, sceneProps = {}) {
  const scene = new THREE.Scene();
  scenes.push(scene);
  const content = build(THREE, {
    scene, phase, dark: true, contrast: false, wantShadow: false,
    trim: color => new THREE.MeshPhongMaterial({ color }), sceneProps: { age, tab, ...sceneProps },
  });
  const sample = (settings = {}, props = {}, tick = 0, reduced = true) => {
    content.frame(tick, { depthLab: { age, ...settings }, ...props }, reduced);
    scene.updateMatrixWorld(true);
    return scene;
  };
  sample();
  return { scene, content, sample };
}

function attachViewport(width = 560, height = 420) {
  const node = { clientWidth: width, clientHeight: height };
  viewer.attach(node);
  return node;
}
// Reconstruct the shared viewer's public reset/nudge/focus contract, including
// its legacy home-target offset. Do not repeat the product's fitting formula.
function focusedCamera(aspect) {
  const [id, options] = focus.mock.lastCall;
  expect(id).toBe('handContact'); expect(options.immediate).toBe(true);
  expect(options.padding).toBeUndefined(); expect(Number.isFinite(options.distance)).toBe(true);
  expect(options.distance).toBeGreaterThanOrEqual(viewerConfig.minDistance - 1e-9);
  expect(options.distance).toBeLessThanOrEqual(viewerConfig.home.dist);
  const [yawDelta, pitchDelta] = nudge.mock.lastCall;
  const yaw = viewerConfig.home.yaw + yawDelta;
  const pitch = Math.max(.12, Math.min(1.35, viewerConfig.home.pitch + pitchDelta));
  const distance = Math.max(viewerConfig.minDistance, Math.min(viewerConfig.home.dist, options.distance));
  const target = new THREE.Vector3(options.target.x, options.target.y, options.target.z);
  const home = new THREE.Vector3(viewerConfig.home.target.x, viewerConfig.home.target.y, viewerConfig.home.target.z);
  const camera = new THREE.PerspectiveCamera(42, aspect, .1, 100);
  camera.position.copy(target).sub(home).add(new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch) * distance,
    Math.sin(pitch) * distance,
    Math.cos(yaw) * Math.cos(pitch) * distance));
  camera.lookAt(target); camera.updateMatrixWorld(true);
  expect(nudge.mock.invocationCallOrder.at(-1)).toBeGreaterThan(reset.mock.invocationCallOrder.at(-1));
  expect(focus.mock.invocationCallOrder.at(-1)).toBeGreaterThan(nudge.mock.invocationCallOrder.at(-1));
  return { camera, target };
}
function inspectFit(scene, content, node) {
  scene.updateMatrixWorld(true);
  const proxy = content.meshes.handContact, bounds = new THREE.Box3().setFromObject(proxy);
  const sphere = bounds.getBoundingSphere(new THREE.Sphere()), info = proxy.userData.inspection;
  expect(info).toBeTruthy(); expect(info.center).toHaveLength(3); expect(info.center.every(Number.isFinite)).toBe(true);
  expect(new THREE.Vector3().fromArray(info.center).distanceTo(sphere.center)).toBeLessThan(1e-7);
  expect(info.radius).toBeCloseTo(sphere.radius, 7); expect(info.radius).toBeGreaterThan(0);
  expect(proxy.visible).toBe(false); expect(content.picks.includes(proxy)).toBe(false);
  const { camera, target } = focusedCamera(node.clientWidth / node.clientHeight);
  expect(target.distanceTo(sphere.center)).toBeLessThan(1e-7);
  // Every proxy corner fits. The real hand surfaces remain inside this proxy,
  // so this also covers parts hidden by another hand from the chosen view.
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const point = new THREE.Vector3(x, y, z).project(camera);
    expect(point.toArray().every(Number.isFinite)).toBe(true);
    expect(Math.abs(point.x)).toBeLessThan(.99); expect(Math.abs(point.y)).toBeLessThan(.99);
    expect(point.z).toBeGreaterThan(-1); expect(point.z).toBeLessThan(1);
  }
  const padded = bounds.clone().expandByScalar(1e-6);
  for (const side of ['lower', 'upper']) {
    const hand = scene.getObjectByName('fr-rescuer-' + side);
    if (!hand || !hand.visible) continue;
    hand.traverse(mesh => {
      if (mesh.isMesh && /^fr-rescuer-(lower|upper)-(palm|heel|wrist-bridge|finger-[0-3]-surface|thumb-surface|nail-[0-3]|thumb-nail)$/.test(mesh.name)) {
        expect(padded.containsBox(new THREE.Box3().setFromObject(mesh)), mesh.name + ' within fitted proxy').toBe(true);
      }
    });
  }
  const direction = camera.getWorldDirection(new THREE.Vector3());
  const intended = new THREE.Vector3(-Math.sin(.25) * Math.cos(.28), -Math.sin(.28), -Math.cos(.25) * Math.cos(.28));
  expect(direction.distanceTo(intended), 'actual world view stays at the authored heel-side angle').toBeLessThan(1e-7);
  return { camera, direction, info };
}

describe('First Response heel-side exploration', () => {
  it.each(['place', 'depth', 'coach'])('offers an independent heel-side camera in %s without saving a learning action', tab => {
    mount({ b3dTab: tab, b3dPlaced: 'correct', b3dRec: ['check','arm'] });
    const node = attachViewport(), { scene, content, sample } = model('adult', tab);
    sample({}, { placed: 'correct', childHands: 'two' });
    const before = state;
    expect(button('Heel side view').disabled).toBe(false);
    click('Heel side view');
    inspectFit(scene, content, node);
    expect(state).toBe(before);
    click('Hand contact close-up');
    expect(nudge.mock.lastCall[0]).toBeCloseTo(-1, 7);
    expect(nudge.mock.lastCall[1]).toBeCloseTo(-.21, 7);
    expect(state).toBe(before);
  });

  it.each(['failed','idle','loading'])('disables the new view while the viewer is %s', status => {
    viewerStatus = status === 'failed' ? 'failed' : 'ready';
    mount({ b3dStatus: status });
    expect(button('Heel side view').disabled).toBe(true);
    click('Heel side view'); expect(focus).not.toHaveBeenCalled();
  });

  it.each([
    { b3dDepthLab: { age: 'adult', hands: false } },
    { b3dTab: 'place' },
    { b3dTab: 'place', b3dPlaced: 'high' },
  ])('gates the view and observation to a visible supported hand arrangement: %j', seed => {
    mount(seed); expect(button('Heel side view').disabled).toBe(true);
    click('Heel side view'); expect(focus).not.toHaveBeenCalled();
    expect(host.querySelector('.fr-contact-observation')).toBeNull();
  });

  it.each(['aed','gate','call','recovery'])('keeps heel inspection out of %s', tab => {
    mount({ b3dTab: tab, b3dRec: ['check','arm'] });
    expect([...host.querySelectorAll('button')].some(node => node.textContent === 'Heel side view')).toBe(false);
    expect(host.querySelector('.fr-contact-observation')).toBeNull();
  });

  it.each([
    ['adult', 'two', true], ['child', 'two', true], ['child', 'one', false], ['infant', 'one', false],
  ])('describes the actual %s / %s arrangement without grading or changing progress', (age, hands, stacked) => {
    mount({ b3dAge: age, b3dChildHands: hands, b3dRec: ['check','arm'], b3dDepthInquiry: { explanation: 'Keep this thought.' } });
    const before = state, details = host.querySelector('.fr-contact-observation');
    expect(details).toBeTruthy(); expect(details.open).toBe(false);
    expect(details.querySelector('summary').textContent).toBe('Check your observation');
    expect(details.textContent.includes('upper hand')).toBe(stacked);
    expect(details.textContent).toContain('heel'); expect(details.textContent).toContain('fingers');
    act(() => details.querySelector('summary').click());
    expect(details.open).toBe(true); expect(state).toBe(before);
    expect(host.querySelector('[data-marker="rest"]').textContent).toContain('side marks');
    expect(host.querySelector('[data-marker="rest"] path').getAttribute('d')).toBe('M2 9H11M21 9H30');
  });

  it('refits the side view for a changed hand arrangement and depth range, but not cycle phase', () => {
    mount({ b3dAge: 'child' });
    const node = attachViewport(), { scene, content, sample } = model('child'); click('Heel side view');
    const calls = focus.mock.calls.length, angles = nudge.mock.calls.length;
    const initial = inspectFit(scene, content, node), info = initial.info;
    sample({ motion: 'inspect', phase: 50 }, { childHands: 'one' });
    expect(focus).toHaveBeenCalledTimes(calls);
    const phaseOnly = inspectFit(scene, content, node);
    expect(phaseOnly.camera.position.toArray()).toEqual(initial.camera.position.toArray());
    sample({ motion: 'inspect', phase: 50 }, { childHands: 'two' });
    expect(focus).toHaveBeenCalledTimes(calls + 1);
    const stacked = inspectFit(scene, content, node);
    expect(stacked.info).toBe(info); expect(stacked.direction.distanceTo(initial.direction)).toBeLessThan(1e-7);
    expect(stacked.camera.position.distanceTo(initial.camera.position)).toBeGreaterThan(.001);
    sample({ depth: 6, lean: 1, motion: 'inspect', phase: 50 }, { childHands: 'two' });
    expect(focus).toHaveBeenCalledTimes(calls + 2);
    const range = inspectFit(scene, content, node);
    expect(range.info).toBe(info); expect(range.direction.distanceTo(initial.direction)).toBeLessThan(1e-7);
    expect(range.camera.position.distanceTo(stacked.camera.position)).toBeGreaterThan(.001);
    sample({ depth: 6, lean: 1, motion: 'inspect', phase: 100 }, { childHands: 'two' });
    expect(focus).toHaveBeenCalledTimes(calls + 2);
    expect(inspectFit(scene, content, node).camera.position.toArray()).toEqual(range.camera.position.toArray());
    expect(nudge).toHaveBeenCalledTimes(angles + 2);
    const resets = reset.mock.calls.length;
    sample({ hands: false }, { childHands: 'two' });
    expect(reset).toHaveBeenCalledTimes(resets + 1);
    sample({ hands: true, depth: 3 }, { childHands: 'one' });
    expect(focus).toHaveBeenCalledTimes(calls + 2);
  });

  it('refits on resize, then releases the side-view request on detach', () => {
    mount(); const node = attachViewport(), { scene, content, sample } = model();
    click('Heel side view'); const before = state;
    const desktop = inspectFit(scene, content, node);
    sample(); const calls = focus.mock.calls.length;
    sample(); expect(focus).toHaveBeenCalledTimes(calls);
    node.clientWidth = 260; node.clientHeight = 420;
    sample(); expect(focus).toHaveBeenCalledTimes(calls + 1);
    const phone = inspectFit(scene, content, node);
    expect(phone.direction.distanceTo(desktop.direction)).toBeLessThan(1e-7);
    expect(phone.camera.position.distanceTo(desktop.camera.position)).toBeGreaterThan(.001);
    sample(); expect(focus).toHaveBeenCalledTimes(calls + 1); expect(state).toBe(before);
    viewer.attach(null); node.clientWidth = 180; viewer.attach(node); sample();
    expect(focus).toHaveBeenCalledTimes(calls + 1);
  });

  it('clears the side-view target across unsupported activities', () => {
    mount(); attachViewport(); model(); click('Heel side view');
    const calls = focus.mock.calls.length, resets = reset.mock.calls.length;
    const unsupported = model('adult', 'aed');
    expect(unsupported.content.meshes.handContact).toBeUndefined();
    expect(reset).toHaveBeenCalledTimes(resets + 1);
    model().sample({ depth: 7, lean: 2 });
    expect(focus).toHaveBeenCalledTimes(calls);
  });

  it('preserves A/B inquiry, hand choice and prior recovery progress through camera and phase inspection', () => {
    const settings = { age: 'child', depth: 5, lean: 1, rate: 115, hands: true, anatomy: false, measure: true, motion: 'inspect', phase: 25 };
    const reference = { age: 'child', depth: 4.5, lean: 0 }, inquiry = { peak: 'same', explanation: 'Reason already saved.' }, recovery = ['check','arm','hand'];
    mount({ b3dAge: 'child', b3dChildHands: 'two', b3dDepthLab: settings, b3dDepthReference: reference, b3dDepthInquiry: inquiry, b3dRec: recovery });
    const node = attachViewport(), { scene, content, sample } = model('child'); sample(settings, { childHands: 'two' });
    const before = state; click('Heel side view'); expect(state).toBe(before);
    inspectFit(scene, content, node);
    click('Inspect released contact'); click('Inspect deepest contact');
    expect(state.b3dDepthLab).toMatchObject({ ...settings, phase: 50 });
    expect(state.b3dDepthReference).toBe(reference); expect(state.b3dDepthInquiry).toBe(inquiry);
    expect(state.b3dChildHands).toBe('two'); expect(state.b3dRec).toBe(recovery);
    expect(button('Inspect deepest contact').getAttribute('aria-pressed')).toBe('true');
  });

  it('refits the active side view to rebuilt age geometry without another camera action or learner-state change', () => {
    mount({ b3dAge: 'adult', b3dDepthInquiry: { explanation: 'Keep my comparison.' }, b3dRec: ['check', 'arm'] });
    const node = attachViewport(260, 420), adult = model('adult');
    const before = state;
    click('Heel side view');
    let previous = inspectFit(adult.scene, adult.content, node);
    for (const age of ['child', 'infant']) {
      const calls = focus.mock.calls.length;
      // The first frame of a rebuilt scene supplies its new hand envelope.
      // No button click or manual camera reset occurs between these ages.
      const next = model(age);
      expect(focus).toHaveBeenCalledTimes(calls + 1);
      const fitted = inspectFit(next.scene, next.content, node);
      expect(fitted.info).not.toBe(previous.info);
      expect(new THREE.Vector3().fromArray(fitted.info.center).distanceTo(new THREE.Vector3().fromArray(previous.info.center))).toBeGreaterThan(.01);
      const target = focus.mock.lastCall[1].target;
      expect([target.x, target.y, target.z]).toEqual(fitted.info.center);
      expect(fitted.camera.position.distanceTo(previous.camera.position)).toBeGreaterThan(.01);
      expect(fitted.direction.distanceTo(previous.direction)).toBeLessThan(1e-7);
      next.sample({ motion: 'inspect', phase: 50 });
      expect(focus).toHaveBeenCalledTimes(calls + 1);
      expect(inspectFit(next.scene, next.content, node).camera.position.toArray()).toEqual(fitted.camera.position.toArray());
      expect(state).toBe(before);
      previous = fitted;
    }
  });

  it.each(ages)('fits the complete %s hand envelope at narrow and wide aspect ratios with the same actual view direction', age => {
    mount({ b3dAge: age, b3dChildHands: 'two' });
    const node = attachViewport(1160, 600), { scene, content, sample } = model(age);
    const maximum = age === 'infant' ? 5.5 : age === 'child' ? 6.5 : 7;
    sample({ depth: maximum, lean: 0, motion: 'inspect', phase: 0 }, { childHands: 'two' });
    const before = state;
    click('Heel side view');
    const desktop = inspectFit(scene, content, node);
    for (const [width, height] of [[290, 280], [260, 420], [560, 420]]) {
      node.clientWidth = width; node.clientHeight = height;
      sample({ depth: maximum, lean: 0, motion: 'inspect', phase: 50 }, { childHands: 'two' });
      const fitted = inspectFit(scene, content, node);
      expect(fitted.direction.distanceTo(desktop.direction)).toBeLessThan(1e-7);
      const calls = focus.mock.calls.length;
      sample({ depth: maximum, lean: 0, motion: 'inspect', phase: 100 }, { childHands: 'two' });
      expect(focus).toHaveBeenCalledTimes(calls);
      expect(inspectFit(scene, content, node).camera.position.toArray()).toEqual(fitted.camera.position.toArray());
    }
    expect(state).toBe(before);
  });
});
