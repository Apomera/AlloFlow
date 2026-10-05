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
const completed = ['check', 'arm', 'hand', 'knee', 'roll', 'airway', 'stable', 'watch'];
const cases = ages.flatMap(age => Array.from({ length: 7 }, (_, i) => i + 2).flatMap(phase =>
  [false, true].map(guides => ({ age, phase, guides }))));
const scenes = [];
let build, viewer, config, viewerStatus, focus, reset, nudge, host, root, state, patch, lastSync;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  delete window.__alloflowFirstResponse;
  viewerStatus = 'ready';
  focus = vi.fn(() => true); reset = vi.fn(); nudge = vi.fn();
  lastSync = null;
  window.StemLab = {
    _registry: {}, isRegistered: () => false,
    makeBayViewer(options) {
      config = options; build = options.buildScene;
      return viewer = {
        attach() {}, sync(props) { lastSync = props; }, focus, reset, nudge, zoom() {}, status: () => viewerStatus,
      };
    },
    registerTool(id, tool) { this._registry[id] = tool; },
  };
  new Function(source)();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount()); host.remove(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  for (const scene of scenes.splice(0)) scene.traverse(object => {
    object.geometry?.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) material?.dispose();
  });
});

function mount(seed = {}) {
  function Harness() {
    const [data, setData] = React.useState({ consentAccepted: true, view: 'body3d', b3dTab: 'recovery', b3dStatus: 'ready', b3dRec: completed, b3dRecView: 4, ...seed });
    state = data; patch = values => setData(previous => ({ ...previous, ...values }));
    return window.StemLab._registry.firstResponse.render({
      React, toolData: { firstResponse: data }, update: (_, key, value) => patch({ [key]: value }),
      updateMulti: (_, values) => patch(values), t: (_, fallback) => fallback, addToast() {}, gradeBand: 'g68',
    });
  }
  act(() => root.render(React.createElement(Harness)));
}
function button(label) {
  const found = [...host.querySelectorAll('button')].find(element => element.textContent === label);
  expect(found, label).toBeTruthy(); return found;
}
function click(label) { act(() => button(label).click()); }
function model(age = 'adult', phase = 4, guides = false, tab = 'recovery') {
  const scene = new THREE.Scene(); scenes.push(scene);
  const content = build(THREE, {
    scene, phase, dark: true, contrast: false, wantShadow: false,
    trim: color => new THREE.MeshPhongMaterial({ color }), sceneProps: { tab, age, recoveryGuides: guides },
  });
  const sample = () => { content.frame(0, {}, true); scene.updateMatrixWorld(true); };
  sample(); return { scene, content, sample };
}
function object(scene, name) {
  const found = scene.getObjectByName(name); expect(found, name).toBeTruthy(); return found;
}
function inspectedMeshes(scene, guides) {
  const found = [];
  object(scene, 'fr-patient-left-hand').traverse(mesh => { if (mesh.geometry) found.push(mesh); });
  if (guides) for (const name of ['fr-recovery-palm-arrow-stem', 'fr-recovery-palm-arrow-tip']) found.push(object(scene, name));
  return found;
}
function worldVertices(mesh) {
  return Array.from({ length: mesh.geometry.attributes.position.count }, (_, i) =>
    new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i).applyMatrix4(mesh.matrixWorld));
}
function inspectedSphere(meshes) {
  const bounds = new THREE.Box3();
  for (const mesh of meshes) bounds.union(new THREE.Box3().setFromObject(mesh));
  return bounds.getBoundingSphere(new THREE.Sphere());
}
function assertMetadata(scene, content, guides) {
  const target = content.meshes.nearPalm;
  expect(target, 'near palm target').toBeTruthy();
  const info = target.userData.inspection;
  expect(info, 'numeric palm inspection metadata').toBeTruthy();
  for (const field of ['center', 'normal', 'forward']) {
    expect(info[field]).toHaveLength(3);
    expect(info[field].every(value => typeof value === 'number' && Number.isFinite(value))).toBe(true);
  }
  expect(typeof info.radius).toBe('number'); expect(Number.isFinite(info.radius)).toBe(true); expect(info.radius).toBeGreaterThan(0);
  const hand = object(scene, 'fr-patient-left-hand');
  const normal = new THREE.Vector3().fromArray(info.normal), forward = new THREE.Vector3().fromArray(info.forward);
  expect(normal.length()).toBeCloseTo(1, 8); expect(forward.length()).toBeCloseTo(1, 8); expect(normal.dot(forward)).toBeCloseTo(0, 8);
  expect(normal.distanceTo(new THREE.Vector3(0, 1, 0).transformDirection(hand.matrixWorld))).toBeLessThan(1e-8);
  expect(forward.distanceTo(new THREE.Vector3(0, 0, 1).transformDirection(hand.matrixWorld))).toBeLessThan(1e-8);
  const sphere = inspectedSphere(inspectedMeshes(scene, guides));
  expect(new THREE.Vector3().fromArray(info.center).distanceTo(sphere.center)).toBeLessThan(1e-7);
  expect(Math.abs(info.radius - sphere.radius)).toBeLessThan(1e-7);
  expect(target.visible).toBe(false); expect(target.userData.partId).toBeUndefined(); expect(content.picks.includes(target)).toBe(false);
  for (const mesh of inspectedMeshes(scene, guides)) expect(content.picks.includes(mesh)).toBe(false);
  return info;
}

// Emulate the shared viewer's public reset/nudge/focus contract. This uses its
// legacy home offset, rather than duplicating the product's fitting formula.
function detailCamera(aspect) {
  const [id, options] = focus.mock.calls.at(-1);
  expect(id).toBe('nearPalm'); expect(options.immediate).toBe(true); expect(options.padding).toBeUndefined();
  expect(Number.isFinite(options.distance)).toBe(true); expect(options.distance).toBeGreaterThanOrEqual(.8 - 1e-9);
  expect(options.distance).toBeLessThanOrEqual(config.home.dist);
  const [yawDelta, pitchDelta] = nudge.mock.calls.at(-1);
  const yaw = config.home.yaw + yawDelta;
  const minPitch = typeof config.minPitch === 'number' ? Math.max(-1.35, Math.min(.12, config.minPitch)) : .12;
  const pitch = Math.max(minPitch, Math.min(1.35, config.home.pitch + pitchDelta));
  const distance = Math.max(config.minDistance, Math.min(config.home.dist, options.distance));
  const target = new THREE.Vector3(options.target.x, options.target.y, options.target.z);
  const home = new THREE.Vector3(config.home.target.x, config.home.target.y, config.home.target.z);
  const camera = new THREE.PerspectiveCamera(42, aspect, .1, 100);
  camera.position.copy(target).sub(home).add(new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch) * distance, Math.sin(pitch) * distance, Math.cos(yaw) * Math.cos(pitch) * distance));
  camera.lookAt(target); camera.updateMatrixWorld(true);
  return { camera, target };
}
function assertVisiblePalm(scene, content, guides, aspect) {
  const info = content.meshes.nearPalm.userData.inspection;
  const { camera, target } = detailCamera(aspect);
  expect(target.distanceTo(new THREE.Vector3().fromArray(info.center))).toBeLessThan(1e-7);
  const direction = camera.position.clone().sub(target).normalize();
  expect(direction.dot(new THREE.Vector3().fromArray(info.normal)), 'camera views the palm side').toBeGreaterThan(.8);
  expect(direction.dot(new THREE.Vector3().fromArray(info.forward)), 'camera looks along the fingers').toBeGreaterThan(.1);
  for (const mesh of inspectedMeshes(scene, guides)) for (const point of worldVertices(mesh)) {
    const cameraPoint = point.clone().applyMatrix4(camera.matrixWorldInverse);
    expect(cameraPoint.z, mesh.name + ' near-plane clearance').toBeLessThan(-.105);
    const projected = point.clone().project(camera);
    expect(Math.abs(projected.x), mesh.name + ' horizontal framing').toBeLessThan(.94);
    expect(Math.abs(projected.y), mesh.name + ' vertical framing').toBeLessThan(.94);
    expect(projected.z).toBeGreaterThan(-1); expect(projected.z).toBeLessThan(1);
  }
}

describe('palm detail geometry and camera', () => {
  it.each(cases)('shows the complete $age palm at pose $phase with guides=$guides on desktop and phone', ({ age, phase, guides }) => {
    const inquiry = { peak: 'same', release: 'b' }, depth = { age: 'adult', depth: 5.6, lean: .8, motion: 'inspect', phase: 50 };
    mount({ b3dAge: age, b3dRecView: phase, b3dRecoveryGuides: guides, b3dDepthInquiry: inquiry, b3dDepthLab: depth });
    const node = { clientWidth: 560, clientHeight: 420 }; viewer.attach(node);
    const { scene, content, sample } = model(age, phase, guides);
    assertMetadata(scene, content, guides);
    const before = state;
    click('Palm detail view');
    expect(reset).toHaveBeenCalledTimes(1); expect(nudge).toHaveBeenCalledTimes(1); expect(focus).toHaveBeenCalledTimes(1);
    expect(reset.mock.invocationCallOrder[0]).toBeLessThan(nudge.mock.invocationCallOrder[0]);
    expect(nudge.mock.invocationCallOrder[0]).toBeLessThan(focus.mock.invocationCallOrder[0]);
    assertVisiblePalm(scene, content, guides, node.clientWidth / node.clientHeight);
    expect(state).toBe(before); expect(state.b3dRec).toBe(completed); expect(state.b3dDepthInquiry).toBe(inquiry); expect(state.b3dDepthLab).toBe(depth);
    sample(); sample(); expect(focus).toHaveBeenCalledTimes(1);
    node.clientWidth = 290; node.clientHeight = 280;
    sample(); expect(focus).toHaveBeenCalledTimes(2);
    assertVisiblePalm(scene, content, guides, node.clientWidth / node.clientHeight);
    sample(); expect(focus).toHaveBeenCalledTimes(2); expect(state).toBe(before);
  });

  it('refits once after a new posed build and once after an actual resize', () => {
    mount(); const node = { clientWidth: 560, clientHeight: 420 }; viewer.attach(node);
    const initial = model(); click('Palm detail view'); const first = focus.mock.calls.length;
    initial.sample(); initial.sample(); expect(focus).toHaveBeenCalledTimes(first);
    act(() => patch({ b3dRecView: 5, b3dRecoveryGuides: true }));
    const next = model('adult', 5, true);
    expect(focus).toHaveBeenCalledTimes(first + 1);
    next.sample(); next.sample(); expect(focus).toHaveBeenCalledTimes(first + 1);
    node.clientWidth = 260; next.sample(); expect(focus).toHaveBeenCalledTimes(first + 2);
    assertVisiblePalm(next.scene, next.content, true, node.clientWidth / node.clientHeight);
    next.sample(); expect(focus).toHaveBeenCalledTimes(first + 2);
  });

  it('clears a detail request when the new pose lacks its target', () => {
    mount(); viewer.attach({ clientWidth: 560, clientHeight: 420 }); model(); click('Palm detail view');
    const count = focus.mock.calls.length;
    const missing = model('adult', 1); expect(missing.content.meshes.nearPalm).toBeUndefined();
    const next = model('child', 5, true); next.sample();
    expect(focus).toHaveBeenCalledTimes(count);
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it.each(['reset', 'detach'])('clears active detail fitting on %s without reviving it on later frames', kind => {
    mount(); const node = { clientWidth: 560, clientHeight: 420 }; viewer.attach(node);
    const current = model(); click('Palm detail view'); const count = focus.mock.calls.length;
    if (kind === 'reset') viewer.reset(); else { viewer.attach(null); viewer.attach(node); }
    node.clientWidth = 220; current.sample();
    const later = model('adult', 5, true); later.sample();
    expect(focus).toHaveBeenCalledTimes(count);
    expect(state.b3dRec).toBe(completed);
  });

  it('drops metadata when the mounted viewer node changes', () => {
    mount(); viewer.attach({ clientWidth: 560, clientHeight: 420 }); model();
    viewer.attach({ clientWidth: 290, clientHeight: 280 });
    click('Palm detail view'); expect(focus).not.toHaveBeenCalled(); expect(nudge).not.toHaveBeenCalled();
  });

  it.each([
    { radius: 0 }, { radius: Infinity }, { center: [NaN, 0, 0] }, { normal: [0, 0, 0], forward: [0, 0, 0] },
  ])('rejects malformed inspection metadata without moving the camera: %j', invalid => {
    mount(); viewer.attach({ clientWidth: 560, clientHeight: 420 });
    const current = model(); Object.assign(current.content.meshes.nearPalm.userData.inspection, invalid);
    click('Palm detail view');
    expect(focus).not.toHaveBeenCalled(); expect(nudge).not.toHaveBeenCalled(); expect(reset).not.toHaveBeenCalled();
  });

  it('retains the original Palm close-up fitting when switching away from detail', () => {
    mount(); const node = { clientWidth: 560, clientHeight: 420 }; viewer.attach(node);
    const current = model(); click('Palm detail view'); click('Palm close-up');
    expect(focus).toHaveBeenLastCalledWith('nearPalm', { padding: 1.12, immediate: true });
    const count = focus.mock.calls.length; node.clientWidth = 280; current.sample();
    expect(focus).toHaveBeenCalledTimes(count + 1);
    expect(focus).toHaveBeenLastCalledWith('nearPalm', { padding: 1.12, immediate: true });
  });
});

describe('palm detail review controls', () => {
  it('enables detail only for the positioned near arm and keeps the legacy view available', () => {
    mount({ b3dRecView: 1 });
    expect(button('Palm detail view').disabled).toBe(true); expect(button('Palm close-up').disabled).toBe(true);
    act(() => patch({ b3dRecView: 2 }));
    expect(button('Palm detail view').disabled).toBe(false); expect(button('Palm close-up').disabled).toBe(false);
    act(() => patch({ b3dRecView: 0 })); expect(button('Palm detail view').disabled).toBe(true);
  });

  it.each(['failed', 'idle', 'loading'])('keeps the detail camera disabled while completed-pose review works with viewer=%s', status => {
    viewerStatus = status === 'failed' ? 'failed' : 'ready'; mount({ b3dStatus: status });
    expect(button('Palm detail view').disabled).toBe(true);
    expect(button('Inspect before the turn').disabled).toBe(false); expect(button('Inspect after the turn').disabled).toBe(false);
    click('Inspect after the turn'); expect(state.b3dRecView).toBe(5);
    expect(state.b3dRec).toBe(completed); expect(focus).not.toHaveBeenCalled();
  });

  it('gates the two shortcuts to completed poses without completing any new step', () => {
    const firstThree = completed.slice(0, 3); mount({ b3dRec: firstThree, b3dRecView: 3 });
    expect(button('Inspect before the turn').disabled).toBe(true); expect(button('Inspect after the turn').disabled).toBe(true);
    click('Inspect before the turn'); expect(state.b3dRec).toBe(firstThree); expect(state.b3dRecView).toBe(3);
    const firstFour = completed.slice(0, 4); act(() => patch({ b3dRec: firstFour, b3dRecView: 4 }));
    expect(button('Inspect before the turn').disabled).toBe(false); expect(button('Inspect after the turn').disabled).toBe(true);
    click('Inspect after the turn'); expect(state.b3dRec).toBe(firstFour); expect(state.b3dRecView).toBe(4);
    const firstFive = completed.slice(0, 5); act(() => patch({ b3dRec: firstFive, b3dRecView: 5 }));
    expect(button('Inspect after the turn').disabled).toBe(false); click('Inspect before the turn');
    expect(state.b3dRec).toBe(firstFive); expect(state.b3dRecView).toBe(4);
  });

  it('compares poses 4 and 5 while preserving completion, depth settings and inquiry', () => {
    const depth = { age: 'adult', depth: 5.5, lean: 1, motion: 'inspect', phase: 50 };
    const inquiry = { peak: 'same', release: 'b' }, reference = { age: 'adult', depth: 5.5, lean: 0 };
    mount({ b3dRecView: 8, b3dDepthLab: depth, b3dDepthInquiry: inquiry, b3dDepthReference: reference });
    click('Inspect before the turn');
    expect(state.b3dRecView).toBe(4); expect(lastSync.phase).toBe(4);
    expect(button('Inspect before the turn').getAttribute('aria-pressed')).toBe('true');
    expect(button('Inspect after the turn').getAttribute('aria-pressed')).toBe('false');
    click('Inspect after the turn');
    expect(state.b3dRecView).toBe(5); expect(lastSync.phase).toBe(5);
    expect(button('Inspect after the turn').getAttribute('aria-pressed')).toBe('true');
    expect(button('Inspect before the turn').getAttribute('aria-pressed')).toBe('false');
    expect(state.b3dRec).toBe(completed); expect(state.b3dDepthLab).toBe(depth); expect(state.b3dDepthInquiry).toBe(inquiry); expect(state.b3dDepthReference).toBe(reference);
    expect(focus).not.toHaveBeenCalled();
  });

  it('offers the new detail control only in recovery', () => {
    mount({ b3dTab: 'depth' });
    for (const tab of ['depth', 'place', 'coach', 'gate', 'aed', 'call']) {
      act(() => patch({ b3dTab: tab }));
      expect([...host.querySelectorAll('button')].some(element => element.textContent === 'Palm detail view')).toBe(false);
    }
  });
});
