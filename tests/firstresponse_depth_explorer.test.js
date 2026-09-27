import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const modules = ['desktop/web-app/node_modules', 'node_modules'].map(p => resolve(p)).find(p => existsSync(resolve(p, 'react')));
const React = require(resolve(modules, 'react'));
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { act } = require(resolve(modules, 'react-dom/test-utils'));
const source = readFileSync('stem_lab/stem_tool_firstresponse.js', 'utf8');
const THREE = {};
new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
let host, root, state, patch, build;
const scenes = [];
function mount(seed = {}) {
  function Harness() {
    const [data, setData] = React.useState({ consentAccepted: true, view: 'body3d', b3dTab: 'depth', ...seed });
    state = data; patch = value => setData(prev => ({ ...prev, ...value }));
    return window.StemLab._registry.firstResponse.render({ React, toolData: { firstResponse: data },
      update: (_, key, value) => patch({ [key]: value }), updateMulti: (_, value) => patch(value),
      t: (_, fallback) => fallback, addToast: () => {}, gradeBand: 'g68' });
  }
  act(() => root.render(React.createElement(Harness)));
}
function click(text) {
  const b = [...host.querySelectorAll('button')].find(el => el.textContent === text);
  expect(b, text).toBeTruthy(); act(() => b.click());
}
function model(age = 'adult') {
  const scene = new THREE.Scene(); scenes.push(scene);
  const content = build(THREE, { scene, phase: 0, dark: true, contrast: false, wantShadow: false,
    trim: color => new THREE.MeshPhongMaterial({ color }), sceneProps: { tab: 'depth', age } });
  return (settings, tick = 0, reduced = false) => {
    content.frame(tick, { depthLab: { age, ...settings } }, reduced);
    const chest = scene.getObjectByName('fr-depth-chest');
    const hands = scene.getObjectByName('fr-depth-hands');
    const marker = scene.getObjectByName('fr-depth-marker');
    const reference = scene.getObjectByName('fr-depth-reference');
    return { chest, hands, marker, reference, anatomy: scene.getObjectByName('fr-depth-anatomy'),
      top: chest.position.y + 0.25 * chest.scale.y,
      bottom: chest.position.y - 0.25 * chest.scale.y,
      handY: hands.position.y, markerY: marker.position.y };
  };
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear(); delete window.__alloflowFirstResponse;
  window.StemLab = { _registry: {}, isRegistered: () => false,
    makeBayViewer(config) { build = config.buildScene; return { attach() {}, sync() {}, nudge() {}, zoom() {}, reset() {}, status: () => 'failed' }; },
    registerTool(id, config) { this._registry[id] = config; } };
  new Function(source)();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount()); host.remove(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  for (const scene of scenes.splice(0)) scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
});

describe('3D compression explorer — actual Three.js geometry', () => {
  it.each([['adult', 5.5], ['child', 5], ['infant', 4]])('keeps the back fixed and the hand on the chest for %s', (age, depth) => {
    const sample = model(age);
    const release = sample({ depth, lean: 0, motion: 'release' });
    const restTop = release.top, restHand = release.handY, marker = release.markerY;
    const press = sample({ depth, lean: 0, motion: 'press' });
    expect(press.top).toBeLessThan(restTop);
    expect(press.bottom).toBeCloseTo(-0.25, 9);
    expect(press.handY).toBeLessThan(restHand);
    expect(press.handY - press.markerY).toBeCloseTo(0.036, 9);
    expect(press.markerY).toBeCloseTo(press.reference.position.y, 9);
    expect(sample({ depth, lean: 0, motion: 'release' }).markerY).toBeCloseTo(marker, 9);
  });
  it('distinguishes the same peak depth with full versus incomplete recoil', () => {
    const sample = model();
    const full = sample({ depth: 5.5, lean: 0, motion: 'release' }).markerY;
    const lean = sample({ depth: 5.5, lean: 1, motion: 'release' }).markerY;
    expect(lean).toBeLessThan(full);
    const peakA = sample({ depth: 5.5, lean: 0, motion: 'press' }).markerY;
    const peakB = sample({ depth: 5.5, lean: 1, motion: 'press' }).markerY;
    expect(peakA).toBeCloseTo(peakB, 9);
  });
  it('uses the selected cycle rate and holds release in reduced motion', () => {
    const sample = model();
    const settings = { depth: 5.5, lean: 0.5, motion: 'cycle', rate: 120 };
    const start = sample(settings, 0).markerY;
    const peak = sample(settings, 250).markerY;
    expect(peak).toBeLessThan(start);
    expect(sample(settings, 500).markerY).toBeCloseTo(start, 9);
    expect(sample(settings, 250, true).markerY).toBeCloseTo(start, 9);
    expect(sample({ ...settings, motion: 'press' }, 250, true).markerY).toBeCloseTo(peak, 9);
  });
  it('clamps malformed settings and changes the anatomy layer without rebuilding', () => {
    const sample = model();
    const a = sample({ depth: Infinity, lean: -5, rate: NaN, motion: 'unknown', anatomy: false });
    expect(Number.isFinite(a.top)).toBe(true); expect(a.bottom).toBeCloseTo(-0.25); expect(a.anatomy.visible).toBe(false);
    const chest = a.chest;
    const b = sample({ depth: 200, lean: 200, motion: 'press', anatomy: true });
    expect(b.chest).toBe(chest); expect(b.top).toBeGreaterThan(0); expect(b.anatomy.visible).toBe(true);
    expect(b.bottom).toBeCloseTo(-0.25);
  });
});

describe('3D compression explorer — controls and fallback', () => {
  it('keeps a useful complete explorer when WebGL is unavailable', () => {
    mount();
    expect(host.textContent).toContain('3D view unavailable');
    expect(host.querySelectorAll('.fr-depth-controls input[type="range"]')).toHaveLength(3);
    expect(host.querySelector('.fr-depth-profile').textContent).toContain('0.0 cm');
    click('Show compression'); expect(state.b3dDepthLab.motion).toBe('press');
    click('Animate cycle'); expect(state.b3dDepthLab.motion).toBe('cycle');
    click('Show release'); expect(state.b3dDepthLab.motion).toBe('release');
  });
  it('switches examples, retains peak depth for leaning, and resets settings', () => {
    mount(); click('Try a leaning example');
    expect(state.b3dDepthLab).toMatchObject({ depth: 5.5, lean: 1, motion: 'release' });
    expect(host.querySelector('.fr-depth-readout').textContent).toContain('leaning keeps the chest');
    click('Try a shallow example'); expect(state.b3dDepthLab.depth).toBe(2.5);
    expect(host.querySelector('.fr-depth-readout').textContent).toContain('below the adult');
    click('Reset model settings'); expect(state.b3dDepthLab).toMatchObject({ depth: 5.5, lean: 0, rate: 110 });
  });
  it('adapts the reference to age without carrying adult centimetres into the infant', () => {
    mount(); click('Try a leaning example');
    act(() => patch({ b3dAge: 'infant' }));
    expect(host.querySelector('#fr-depth-depth').value).toBe('4');
    expect(host.querySelector('#fr-depth-depth').max).toBe('5.5');
    click('Reset model settings'); expect(state.b3dDepthLab).toMatchObject({ age: 'infant', reference: 4, depth: 4, lean: 0 });
    expect(host.querySelector('.fr-depth-readout').textContent).toContain('one-third');
    expect(host.querySelector('.fr-depth-readout').textContent).not.toContain('adult 5');
  });
  it('preserves settings across tab navigation and keeps other activities available', () => {
    mount(); click('Try a leaning example');
    act(() => patch({ b3dTab: 'place' })); expect(host.querySelector('.fr-depth-lab')).toBeNull();
    act(() => patch({ b3dTab: 'depth' })); expect(host.querySelector('#fr-depth-lean').value).toBe('1');
    act(() => patch({ view: 'firstAction' })); expect(host.textContent).toContain('Find the clue.');
  });
  it('keeps both copies and the new English strings aligned', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js', 'utf8')).toBe(source);
    const delta = JSON.parse(readFileSync('reports/firstresponse-3d-explorer/ui-strings.delta.json', 'utf8'));
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
      const catalog = JSON.parse(readFileSync(file, 'utf8')).stem.firstresponse;
      for (const [key, value] of Object.entries(delta)) expect(catalog[key], key).toBe(value);
    }
    expect(source).not.toContain('depthT(');
  });
});
