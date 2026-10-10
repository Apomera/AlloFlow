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
let host, root, build, state, patch;
const scenes = [];

function mount(seed = {}) {
  function Harness() {
    const [data, setData] = React.useState({ consentAccepted: true, view: 'body3d', b3dTab: 'depth', ...seed });
    state = data;
    patch = value => setData(prev => ({ ...prev, ...value }));
    return window.StemLab._registry.firstResponse.render({ React, toolData: { firstResponse: data },
      update: (_, key, value) => patch({ [key]: value }), updateMulti: (_, value) => patch(value),
      t: (_, fallback) => fallback, addToast: () => {}, gradeBand: 'g68' });
  }
  act(() => root.render(React.createElement(Harness)));
}

function click(text) {
  const button = [...host.querySelectorAll('button')].find(el => el.textContent === text);
  expect(button, text).toBeTruthy();
  act(() => button.click());
}

function model(age) {
  const scene = new THREE.Scene();
  scenes.push(scene);
  const content = build(THREE, { scene, phase: 0, dark: true, contrast: false, wantShadow: false,
    trim: color => new THREE.MeshPhongMaterial({ color }), sceneProps: { tab: 'depth', age } });
  return (settings, tick = 0, reduced = false) => {
    content.frame(tick, { depthLab: { age, rate: 120, ...settings } }, reduced);
    return {
      arrow: scene.getObjectByName('fr-depth-direction'),
      markerY: scene.getObjectByName('fr-depth-marker').position.y,
      handY: scene.getObjectByName('fr-depth-hands').position.y,
      chestY: scene.getObjectByName('fr-depth-chest').position.y,
      chestScale: scene.getObjectByName('fr-depth-chest').scale.y
    };
  };
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  delete window.__alloflowFirstResponse;
  window.StemLab = { _registry: {}, isRegistered: () => false,
    makeBayViewer(config) {
      build = config.buildScene;
      return { attach() {}, sync() {}, nudge() {}, zoom() {}, reset() {}, status: () => 'failed' };
    },
    registerTool(id, config) { this._registry[id] = config; }
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
    if (object.geometry) object.geometry.dispose();
    if (object.material) object.material.dispose();
  });
});

describe('compression explorer zero movement', () => {
  it.each(['adult', 'child', 'infant'])('keeps %s stationary with no direction arrow throughout inspected and animated cycles', age => {
    const sample = model(age);
    // An overspecified saved lean is normalized to peak depth by the real builder.
    for (const [depth, lean] of [[1, 1], [2, 2], [1, 2]]) {
      const reference = sample({ depth, lean, motion: 'inspect', phase: 0 });
      for (const phase of [0, 25, 50, 75, 100]) {
        const frame = sample({ depth, lean, motion: 'inspect', phase }, 125, true);
        expect(frame.arrow.visible).toBe(false);
        expect(frame.markerY).toBe(reference.markerY);
        expect(frame.handY).toBe(reference.handY);
        expect(frame.chestY).toBe(reference.chestY);
        expect(frame.chestScale).toBe(reference.chestScale);
      }
      for (const tick of [0, 125, 250, 375, 500]) {
        const frame = sample({ depth, lean, motion: 'cycle' }, tick);
        expect(frame.arrow.visible).toBe(false);
        expect(frame.markerY).toBe(reference.markerY);
        expect(frame.handY).toBe(reference.handY);
      }
    }
    const down = sample({ depth: 2, lean: 1, motion: 'inspect', phase: 25 });
    expect(down.arrow.visible).toBe(true);
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(down.arrow.quaternion).y).toBeCloseTo(-1, 8);
    const up = sample({ depth: 2, lean: 1, motion: 'inspect', phase: 75 });
    expect(up.arrow.visible).toBe(true);
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(up.arrow.quaternion).y).toBeCloseTo(1, 8);
    expect(up.markerY).toBeCloseTo(down.markerY, 8);
  });

  it.each(['adult', 'child', 'infant'])('explains the stationary %s curve and retains A/B work when changing cycle positions', age => {
    const signature = JSON.stringify([age, 2, 0, 2, 2]);
    const inquiry = { signature, peak: 'same', release: 'b', reviewed: true,
      peakSeen: true, releaseSeen: true, explanation: 'A moves; B stays at its peak height.' };
    mount({ b3dAge: age, b3dDepthLab: { age, depth: 2, lean: 2, motion: 'inspect', phase: 25 },
      b3dDepthReference: { age, depth: 2, lean: 0 }, b3dDepthInquiry: inquiry });
    for (const phase of [25, 75, 50, 100]) {
      click(phase + '%No movement');
      expect(host.querySelector('#fr-depth-phase').getAttribute('aria-valuetext')).toBe(phase + '% · No movement');
      const note = host.querySelector('.fr-depth-inspection-note').textContent;
      expect(note).toContain('The peak and released heights match');
      expect(note).toContain('stays 2.0 cm below rest');
      expect(note).toContain('Movement per push is 0.0 cm');
      expect(note).toContain('no direction arrow is shown');
      expect(note).not.toContain('chest is moving');
      expect(note).not.toContain('returning upward');
      expect(state.b3dDepthInquiry).toEqual(inquiry);
      expect(host.querySelector('#fr-depth-explanation').value).toBe(inquiry.explanation);
      expect(host.querySelector('.fr-depth-prediction-result').textContent).toContain('2 of 2');
    }
    click('Animate cycle');
    expect(host.querySelector('.fr-depth-inspection-note').textContent).toContain('Movement per push is 0.0 cm');
    expect(state.b3dDepthInquiry).toEqual(inquiry);
    click('Show compression');
    expect(host.querySelector('.fr-depth-inspection-note strong').textContent).toBe('No movement');
    click('Show release');
    expect(host.querySelector('.fr-depth-inspection-note strong').textContent).toBe('No movement');
    // A changed physical setting brings the direction-specific explanations back.
    act(() => patch({ b3dDepthLab: { age, depth: 2, lean: 1, motion: 'inspect', phase: 25 } }));
    expect(host.querySelector('.fr-depth-inspection-note strong').textContent).toBe('Pressing down');
    expect(host.querySelector('.fr-depth-inspection-note').textContent).toContain('chest is moving');
    click('75%Releasing');
    expect(host.querySelector('.fr-depth-inspection-note').textContent).toContain('returning upward');
    expect(host.querySelector('#fr-depth-phase').getAttribute('aria-valuetext')).toBe('75% · Releasing');
  });
});

describe('compression explorer interactive graph', () => {
  function graph() { return host.querySelector('.fr-depth-plot-control'); }
  function key(name, modifiers = {}) {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...modifiers });
    act(() => graph().dispatchEvent(event));
    return event;
  }
  function expectPhase(phase) {
    expect(state.b3dDepthLab).toMatchObject({ motion: 'inspect', phase });
    expect(graph().getAttribute('aria-valuenow')).toBe(String(phase));
    expect(host.querySelector('#fr-depth-phase').value).toBe(String(phase));
    expect(Number(host.querySelector('.fr-depth-cursor circle').getAttribute('cx'))).toBeCloseTo(25 + phase * 3.8, 8);
  }

  it.each([
    ['adult', ['0.0', '3.5', '7.0']],
    ['child', ['0.0', '3.25', '6.5']],
    ['infant', ['0.0', '2.75', '5.5']]
  ])('labels the actual %s graph scale and exposes the selected cycle position', (age, labels) => {
    mount({ b3dAge: age, b3dDepthLab: { age, motion: 'inspect', phase: 25 } });
    expect(graph().getAttribute('role')).toBe('slider');
    expect(graph().tabIndex).toBe(0);
    expect(graph().getAttribute('aria-label')).toBe('Inspect cycle on graph');
    expect(graph().getAttribute('aria-valuemin')).toBe('0');
    expect(graph().getAttribute('aria-valuemax')).toBe('100');
    expect(graph().getAttribute('aria-valuenow')).toBe('25');
    expect(graph().getAttribute('aria-valuetext')).toContain('25% · Pressing down');
    expect([...host.querySelectorAll('.fr-depth-scale span')].map(el => el.textContent)).toEqual(labels);
    expect(host.querySelector('.fr-depth-scale-title').textContent).toBe('Chest depression (cm)');
    const help = document.getElementById(graph().getAttribute('aria-describedby'));
    expect(help.textContent).toContain('Home and End');
    expect(host.querySelector('.fr-depth-scale-note').textContent).toContain('0 cm is the resting height');
    expect(host.textContent).toContain('3D view unavailable');
  });

  it('supports bounded keyboard inspection and keeps prediction notes and recovery progress', () => {
    const inquiry = { signature: JSON.stringify(['adult', 6, 0, 6, 1]), peak: 'same', release: 'b', reviewed: true,
      peakSeen: true, releaseSeen: true, explanation: 'The peak matches, while the released heights differ.' };
    const progress = ['check', 'arm', 'hand'];
    mount({ b3dAge: 'adult', b3dDepthLab: { age: 'adult', depth: 6, lean: 1, motion: 'inspect', phase: 25 },
      b3dDepthReference: { age: 'adult', depth: 6, lean: 0 }, b3dDepthInquiry: inquiry, b3dRec: progress });
    for (const [name, phase] of [
      ['ArrowRight', 26], ['ArrowUp', 27], ['ArrowLeft', 26], ['ArrowDown', 25],
      ['PageUp', 35], ['PageDown', 25], ['Home', 0], ['ArrowLeft', 0], ['PageDown', 0],
      ['End', 100], ['ArrowRight', 100], ['PageUp', 100]
    ]) {
      expect(key(name).defaultPrevented).toBe(true);
      expectPhase(phase);
      expect(state.b3dDepthInquiry).toEqual(inquiry);
      expect(state.b3dRec).toEqual(progress);
      expect(host.querySelector('#fr-depth-explanation').value).toBe(inquiry.explanation);
    }
    for (const [name, modifiers] of [['Tab', {}], ['ArrowLeft', { ctrlKey: true }], ['Home', { altKey: true }], ['End', { metaKey: true }]]) {
      expect(key(name, modifiers).defaultPrevented).toBe(false);
      expectPhase(100);
    }
  });

  it('synchronizes the graph with existing stage and static controls and resumes inspection after animation', () => {
    mount();
    click('25%Pressing down');
    expectPhase(25);
    expect(graph().getAttribute('aria-valuetext')).toContain('2.8 cm depressed');
    key('PageUp');
    expectPhase(35);
    click('Show compression');
    expect(graph().getAttribute('aria-valuenow')).toBe('50');
    expect(graph().getAttribute('aria-valuetext')).toContain('5.5 cm depressed');
    click('Show release');
    expect(graph().getAttribute('aria-valuenow')).toBe('100');
    expect(graph().getAttribute('aria-valuetext')).toContain('0.0 cm depressed');
    click('75%Releasing');
    expectPhase(75);
    click('Animate cycle');
    expect(host.querySelector('.fr-depth-cursor')).toBeNull();
    key('ArrowLeft');
    expectPhase(74);
    expect(host.querySelector('.fr-depth-height-guide')).toBeTruthy();
  });
});
