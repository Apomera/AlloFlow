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
let build, viewer, viewerConfig, viewerStatus, focus, reset, host, root, state, patch, lastSync;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  delete window.__alloflowFirstResponse;
  viewerStatus = 'ready';
  focus = vi.fn(); reset = vi.fn();
  lastSync = null;
  window.StemLab = {
    _registry: {}, isRegistered: () => false,
    makeBayViewer(config) {
      viewerConfig = config;
      build = config.buildScene;
      return viewer = {
        attach() {}, sync(props) { lastSync = props; }, nudge() {}, zoom() {}, reset, focus,
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
function object(scene, name) {
  const found = scene.getObjectByName(name);
  expect(found, name).toBeTruthy();
  return found;
}
function handMeshes(scene, side) {
  const prefix = 'fr-rescuer-' + side + '-';
  const found = [];
  scene.traverse(mesh => {
    if (!mesh.geometry || !mesh.name.startsWith(prefix)) return;
    if (/^(palm|heel|wrist-bridge|finger-[0-3]-surface|thumb-surface|nail-[0-3]|thumb-nail)$/.test(mesh.name.slice(prefix.length))) found.push(mesh);
  });
  expect(found, prefix + ' contact surfaces').toHaveLength(13);
  return found;
}
function vertices(mesh) {
  return Array.from({ length: mesh.geometry.attributes.position.count }, (_, index) =>
    new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, index).applyMatrix4(mesh.matrixWorld));
}
function targetBounds(content) {
  expect(content.meshes.handContact, 'hand contact camera target').toBeTruthy();
  return new THREE.Box3().setFromObject(content.meshes.handContact);
}
function assertIncludesHands(scene, bounds) {
  const padded = bounds.clone().expandByScalar(1e-6);
  for (const side of ['lower', 'upper']) {
    const hand = scene.getObjectByName('fr-rescuer-' + side);
    if (!hand || !hand.visible) continue;
    for (const mesh of handMeshes(scene, side)) {
      for (const point of vertices(mesh)) expect(padded.containsPoint(point), mesh.name + ' camera bounds').toBe(true);
    }
  }
}
function assertBoundsEqual(actual, expected) {
  expect(actual.min.distanceTo(expected.min)).toBeLessThan(1e-8);
  expect(actual.max.distanceTo(expected.max)).toBeLessThan(1e-8);
}

describe('First Response hand camera targets', () => {
  it.each(ages)('bounds actual visible hand surfaces while excluding the tall arms for %s', age => {
    for (const tab of ['place', 'depth', 'coach']) {
      const { scene, content, sample } = model(age, tab);
      sample({ motion: 'release' }, { childHands: 'two', placed: 'correct' });
      const bounds = targetBounds(content);
      assertIncludesHands(scene, bounds);
      for (const side of age === 'infant' ? ['lower'] : ['lower', 'upper']) {
        const upperArm = object(scene, 'fr-rescuer-' + side + '-upper-arm');
        const sleeve = object(scene, 'fr-rescuer-' + side + '-sleeve');
        expect(bounds.max.y, 'upper arm excluded from hand close-up').toBeLessThan(new THREE.Box3().setFromObject(upperArm).min.y);
        expect(bounds.max.y, 'sleeve excluded from hand close-up').toBeLessThan(new THREE.Box3().setFromObject(sleeve).min.y);
      }
    }
  });

  // Preserve every mesh/phase assertion on Windows CI, where this CPU sweep can exceed 5 seconds.
  it.each(ages)('keeps a stable envelope around moving hands throughout an inspected cycle for %s', { timeout: 15000 }, age => {
    const { scene, content, sample } = model(age);
    for (const [depth, lean] of [[2.5, 0], [age === 'infant' ? 4 : 5.5, 1]]) {
      sample({ depth, lean, motion: 'inspect', phase: 0 }, { childHands: 'two' });
      const before = targetBounds(content);
      const target = content.meshes.handContact;
      const releaseY = object(scene, 'fr-rescuer-lower').getWorldPosition(new THREE.Vector3()).y;
      for (let phase = 0; phase <= 100; phase += 10) {
        sample({ depth, lean, motion: 'inspect', phase }, { childHands: 'two' });
        expect(content.meshes.handContact).toBe(target);
        assertBoundsEqual(targetBounds(content), before);
        assertIncludesHands(scene, before);
        if (phase === 50) expect(object(scene, 'fr-rescuer-lower').getWorldPosition(new THREE.Vector3()).y).toBeLessThan(releaseY);
      }
    }
  });

  it('updates a child hand envelope in place when the illustrated arrangement changes', () => {
    const { scene, content, sample } = model('child');
    const target = content.meshes.handContact;
    const lowerPalm = object(scene, 'fr-rescuer-lower-palm');
    sample({ motion: 'release' }, { childHands: 'one' });
    const one = targetBounds(content);
    expect(object(scene, 'fr-rescuer-upper').visible).toBe(false);
    const upperPoints = handMeshes(scene, 'upper').flatMap(vertices);
    expect(upperPoints.some(point => !one.clone().expandByScalar(1e-6).containsPoint(point))).toBe(true);
    sample({ motion: 'release' }, { childHands: 'two' });
    const two = targetBounds(content);
    expect(object(scene, 'fr-rescuer-upper').visible).toBe(true);
    expect(two.getSize(new THREE.Vector3()).length()).toBeGreaterThan(one.getSize(new THREE.Vector3()).length());
    assertIncludesHands(scene, two);
    sample({ motion: 'release' }, { childHands: 'one' });
    assertBoundsEqual(targetBounds(content), one);
    expect(content.meshes.handContact).toBe(target);
    expect(object(scene, 'fr-rescuer-lower-palm')).toBe(lowerPalm);
  });

  it.each(ages)('keeps the camera proxy invisible, separate from the moving rig and outside pick targets for %s', age => {
    const { scene, content } = model(age);
    const target = content.meshes.handContact;
    expect(target).toBe(object(scene, 'fr-hand-contact-focus'));
    expect(target.isGroup).toBe(true);
    expect(target.parent).toBe(scene);
    expect(target.visible).toBe(false);
    expect(target.children).toHaveLength(1);
    expect(target.children[0].name).toBe('fr-hand-contact-bounds');
    expect(target.children[0].isMesh).toBe(true);
    const before = targetBounds(content); target.scale.setScalar(1);
    scene.updateMatrixWorld(true); assertBoundsEqual(targetBounds(content), before);
    expect(target.userData.partId).toBeUndefined();
    expect(content.picks.includes(target)).toBe(false);
    expect(viewerConfig.parts.some(part => part.id === 'handContact')).toBe(true);
    let matches = 0;
    scene.traverse(mesh => { if (mesh.name === target.name) matches++; });
    expect(matches).toBe(1);
  });

  // Each age, guide setting and pose has an independent scene and assertion budget.
  it.each(ages.flatMap(age => [false, true].flatMap(recoveryGuides =>
    Array.from({ length: 9 }, (_, phase) => ({ age, recoveryGuides, phase }))
  )))('fits the near hand and enabled palm arrow: $age, guides $recoveryGuides, pose $phase', ({ age, recoveryGuides, phase }) => {
      const { scene, content } = model(age, 'recovery', phase, { recoveryGuides });
      if (phase < 2) { expect(content.meshes.nearPalm).toBeUndefined(); return; }
      const target = content.meshes.nearPalm;
      expect(target).toBe(object(scene, 'fr-palm-focus'));
      expect(target.isGroup).toBe(true); expect(target.visible).toBe(false);
      expect(target.parent).toBe(scene); expect(target.scale.toArray()).toEqual([1, 1, 1]);
      expect(target.children).toHaveLength(1); expect(target.children[0].name).toBe('fr-palm-bounds');
      expect(content.picks.includes(target)).toBe(false);
      const hand = object(scene, 'fr-patient-left-hand');
      const expected = new THREE.Box3().setFromObject(hand);
      if (recoveryGuides) for (const name of ['fr-recovery-palm-arrow-stem', 'fr-recovery-palm-arrow-tip']) {
        const arrow = object(scene, name);
        expected.union(new THREE.Box3().setFromObject(arrow));
      }
      const before = new THREE.Box3().setFromObject(target);
      assertBoundsEqual(before, expected);
      target.scale.setScalar(1); scene.updateMatrixWorld(true);
      assertBoundsEqual(new THREE.Box3().setFromObject(target), before);
      hand.traverse(mesh => {
        if (mesh.geometry) for (const point of vertices(mesh)) expect(before.clone().expandByScalar(1e-6).containsPoint(point), mesh.name).toBe(true);
      });
  });

  it('allows camera fitting to reach the new hand close-ups', () => {
    expect(viewerConfig.minDistance).toBe(.8);
  });
});

describe('First Response hand inspection controls', () => {
  it.each(['place', 'depth', 'coach'])('offers an accessible hand contact close-up on %s', tab => {
    mount({ b3dTab: tab, b3dPlaced: 'correct' });
    const inspection = host.querySelector('.fr-hand-inspection');
    expect(inspection).toBeTruthy();
    const label = inspection.getAttribute('aria-labelledby');
    expect(label).toBeTruthy();
    expect(host.querySelector('#' + label)?.textContent).toBeTruthy();
    expect(button('Hand contact close-up').disabled).toBe(false);
    const before = state;
    click('Hand contact close-up');
    expect(focus).toHaveBeenLastCalledWith('handContact', { padding: 1.14, immediate: true });
    expect(state).toBe(before);
  });

  it('keeps palm inspection gated to the completed near-arm pose without changing progress', () => {
    const completed = ['check', 'arm', 'hand', 'knee', 'roll', 'airway', 'stable', 'watch'];
    mount({ b3dTab: 'recovery', b3dRec: completed, b3dRecView: 1 });
    expect(button('Palm close-up').disabled).toBe(true);
    act(() => patch({ b3dRecView: 2 }));
    expect(button('Palm close-up').disabled).toBe(false);
    click('Palm close-up');
    expect(focus).toHaveBeenLastCalledWith('nearPalm', { padding: 1.12, immediate: true });
    expect(state.b3dRec).toBe(completed);
    expect(state.b3dRecView).toBe(2);
    expect(lastSync.phase).toBe(2);
    act(() => patch({ b3dRecView: 0 }));
    expect(button('Palm close-up').disabled).toBe(true);
  });

  it.each(['failed', 'idle', 'loading'])('keeps hand camera controls disabled when the viewer is %s', status => {
    viewerStatus = status === 'failed' ? 'failed' : 'ready';
    mount({ b3dStatus: status });
    expect(button('Hand contact close-up').disabled).toBe(true);
    click('Hand contact close-up');
    expect(focus).not.toHaveBeenCalled();
    expect(host.querySelector('.fr-hand-inspection').textContent).toBeTruthy();
  });

  it('disables the contact camera while depth hands are hidden and preserves model settings', () => {
    const settings = { age: 'adult', depth: 5.5, lean: 1, motion: 'inspect', phase: 50, hands: false, rate: 120 };
    mount({ b3dDepthLab: settings });
    expect(button('Hand contact close-up').disabled).toBe(true);
    click('Hand contact close-up');
    expect(focus).not.toHaveBeenCalled();
    expect(state.b3dDepthLab).toBe(settings);
    expect(host.querySelector('.fr-hand-inspection').textContent).toMatch(/turn on|show rescuer hands/i);
    act(() => patch({ b3dDepthLab: { ...settings, hands: true } }));
    expect(button('Hand contact close-up').disabled).toBe(false);
  });

  it('reveals the contact camera only after the supported placement is located', () => {
    mount({ b3dTab: 'place' });
    expect(button('Hand contact close-up').disabled).toBe(true);
    click('Hand contact close-up');
    expect(focus).not.toHaveBeenCalled();
    act(() => patch({ b3dPlaced: 'high' }));
    expect(button('Hand contact close-up').disabled).toBe(true);
    act(() => patch({ b3dPlaced: 'correct' }));
    expect(button('Hand contact close-up').disabled).toBe(false);
  });

  it.each(['gate', 'aed', 'call'])('keeps hand-specific inspection out of the %s activity', tab => {
    mount({ b3dTab: tab });
    expect(host.querySelector('.fr-hand-inspection')).toBeNull();
    expect([...host.querySelectorAll('button')].some(element => element.textContent === 'Hand contact close-up' || element.textContent === 'Palm close-up')).toBe(false);
  });
});

describe('hand inspection comparisons and camera lifetime', () => {
  it('changes only the inspected moment while preserving depth, leaning, rate and inquiry', () => {
    const settings = { age: 'adult', depth: 5.6, lean: .8, rate: 118, hands: true, anatomy: false, measure: true, motion: 'cycle', phase: 25 };
    const inquiry = { peak: 'a', release: 'b' };
    mount({ b3dDepthLab: settings, b3dDepthInquiry: inquiry, b3dChildHands: 'two' });
    click('Inspect released contact');
    expect(state.b3dDepthLab).toMatchObject({ ...settings, motion: 'inspect', phase: 0 });
    expect(state.b3dDepthInquiry).toBe(inquiry); expect(state.b3dChildHands).toBe('two');
    expect(button('Inspect released contact').getAttribute('aria-pressed')).toBe('true');
    click('Inspect deepest contact');
    expect(state.b3dDepthLab).toMatchObject({ ...settings, motion: 'inspect', phase: 50 });
    expect(state.b3dDepthInquiry).toBe(inquiry);
    expect(button('Inspect deepest contact').getAttribute('aria-pressed')).toBe('true');
    expect(button('Inspect released contact').getAttribute('aria-pressed')).toBe('false');
  });

  it('refits changed hand bounds but keeps the camera fixed when only cycle phase changes', () => {
    mount({ b3dAge: 'child' });
    const { sample } = model('child'); click('Hand contact close-up');
    const calls = focus.mock.calls.length;
    sample({ motion: 'inspect', phase: 50 }, { childHands: 'one' });
    expect(focus).toHaveBeenCalledTimes(calls);
    sample({ motion: 'inspect', phase: 50 }, { childHands: 'two' });
    expect(focus).toHaveBeenCalledTimes(calls + 1);
    sample({ depth: 6, lean: 1, motion: 'inspect', phase: 50 }, { childHands: 'two' });
    expect(focus).toHaveBeenCalledTimes(calls + 2);
    sample({ depth: 6, lean: 1, motion: 'inspect', phase: 100 }, { childHands: 'two' });
    expect(focus).toHaveBeenCalledTimes(calls + 2);
    sample({ depth: 6, lean: 1, hands: false }, { childHands: 'two' });
    expect(reset).toHaveBeenCalledTimes(2);
    sample({ depth: 3, lean: 0, hands: true }, { childHands: 'one' });
    expect(focus).toHaveBeenCalledTimes(calls + 2);
  });

  it.each(['contact', 'palm'])('refits %s inspection after a mount resize without changing learner state', kind => {
    const palm = kind === 'palm';
    mount(palm ? { b3dTab: 'recovery', b3dRec: ['check','arm'], b3dRecView: 2 } : {});
    const { sample } = model('adult', palm ? 'recovery' : 'depth', palm ? 2 : 0);
    const node = { clientWidth: 560, clientHeight: 420 };
    viewer.attach(node);
    click(palm ? 'Palm close-up' : 'Hand contact close-up');
    const before = state;
    sample(); const calls = focus.mock.calls.length;
    sample(); expect(focus).toHaveBeenCalledTimes(calls);
    node.clientWidth = 290; node.clientHeight = 280;
    sample(); expect(focus).toHaveBeenCalledTimes(calls + 1);
    expect(focus).toHaveBeenLastCalledWith(palm ? 'nearPalm' : 'handContact', { padding: palm ? 1.12 : 1.14, immediate: true });
    sample(); expect(focus).toHaveBeenCalledTimes(calls + 1);
    expect(state).toBe(before);
    viewer.attach(null); node.clientWidth = 180; viewer.attach(node); sample();
    expect(focus).toHaveBeenCalledTimes(calls + 1);
  });

  it('clears contact focus across activities rather than reviving a stale request', () => {
    mount(); model('adult'); click('Hand contact close-up');
    const calls = focus.mock.calls.length;
    const unsupported = model('adult', 'aed');
    expect(unsupported.content.meshes.handContact).toBeUndefined();
    expect(reset).toHaveBeenCalledTimes(2);
    const { sample } = model('adult');
    sample({ depth: 8, lean: 2 });
    expect(focus).toHaveBeenCalledTimes(calls);
  });

  it('clears palm focus when reviewing a pose before the near arm was positioned', () => {
    mount({ b3dTab: 'recovery', b3dRec: ['check','arm'], b3dRecView: 2 });
    model('adult', 'recovery', 2); click('Palm close-up');
    model('adult', 'recovery', 0);
    expect(reset).toHaveBeenCalledTimes(2);
    expect(focus).toHaveBeenLastCalledWith('nearPalm', { padding: 1.12, immediate: true });
  });

  it.each(ages)('keeps compression and raised rescue-breath hands inside the coach envelope for %s', age => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(10000);
    try {
      const { scene, content, sample } = model(age, 'coach');
      const bounds = targetBounds(content);
      for (const props of [
        { coach: { phase: 'compressions', lastCompressionAt: 10000 }, childHands: 'two' },
        { coach: { phase: 'breaths', lastBreathAt: 10000 }, childHands: 'two' },
        { coach: { phase: 'breathRecovery', lastBreathAt: 9000 }, childHands: 'two' },
      ]) { sample({}, props, 0, false); assertIncludesHands(scene, targetBounds(content)); }
      expect(bounds.min.y).toBeLessThan(bounds.max.y);
    } finally { now.mockRestore(); }
  });
});
