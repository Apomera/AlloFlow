// BirdLab field notebook conditions: each sighting keeps the light and weather
// it was recorded in, as field checklists do, and the notebook shows them.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const { act } = React;
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_engine.js', 'utf8');
const toolSource = readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
const componentSource = sliceBetween(toolSource, '  function BirdlabResidentStudio(', '  // ── Reduced motion CSS', { file: 'stem_tool_birdlab.js' });
// The display names live beside the call helpers, outside the component slice.
const lightNames = sliceBetween(toolSource, '  var BIRDLAB_LIGHT_NAMES', '  function birdLabCallLevel(', { file: 'stem_tool_birdlab.js' });
const state = { ready: true, paused: false, camera: 'orbit', lighting: 'daylight', speed: 1, phase: 'gliding', label: 'Gliding', altitude: 6, airspeed: 8.3, wingbeat: 0, time: 12 };
let root, host, previousMedia;
function runtime(isBlocked = () => false, focus = new THREE.Vector3(1,.2,0), withMammals = false) {
  const frames = new Map(), calls = [], modes = [], listeners = []; let serial = 0, stamp = 0, disposed = 0;
  class Renderer {
    constructor() { this.shadowMap = {}; this.info = { render: { calls: 1, triangles: 1 } }; }
    setPixelRatio() {} setSize() {} render() {} dispose() { disposed++; } forceContextLoss() {}
  }
  const terrain = (x, z) => x * .02 + z * .01;
  const local = {
    THREE: { ...THREE, WebGLRenderer: Renderer }, innerWidth: 900, devicePixelRatio: 1,
    requestAnimationFrame(callback) { const id = ++serial; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    addEventListener(...args) { listeners.push(args); window.addEventListener(...args); },
    removeEventListener(...args) { window.removeEventListener(...args); },
    AvianWoodlandBirds: { create() {}, supports: () => true },
    BirdLab3DBird: { create() { return { root: new THREE.Group(), footOffsetY: -.18, update() {}, dispose() {} }; } },
    BirdLab3DHabitat: { create() { return { root: new THREE.Group(), perch: new THREE.Vector3(0, 3.2, 0),
      perches: [new THREE.Vector3(0, 3.2, 0), new THREE.Vector3(-5.7, 2.8, -4.4), new THREE.Vector3(6.3, 3.1, -5.8)],
      groundHeight: terrain, groundSurfaceHeight: terrain, isBlocked, update() {}, dispose() {} }; } },
    BirdLab3DWildlife: { create(T, scene, options) { return {
      root: new THREE.Group(),
      setMode(mode) { modes.push(mode); }, update(time, dt, observer) { calls.push({ time, dt, observer, position: observer?.position.toArray(), collider: options.isBlocked }); },
      snapshot() { return [{ id: 'blueJay', heading: .2, name: 'Blue jay', behavior: 'Scanning' }]; },
      getFocus(id, out) { return out.copy(focus); }, dispose() {}
    }; } }
  };
  let mammals;
  if (withMammals) {
    Function('window', readFileSync('stem_lab/birdlab_3d_mammals.js','utf8'))(local);
    const create=local.BirdLab3DMammals.create;
    local.BirdLab3DMammals.create=(...args)=>(mammals=create(...args));
  }
  Function('window', source)(local);
  const canvas = document.createElement('canvas'); canvas.tabIndex = 0;
  canvas.getBoundingClientRect = () => ({ width: 800, height: 500 }); canvas.requestPointerLock = vi.fn();
  document.body.appendChild(canvas);
  const controller = local.BirdLab3D.mount(canvas, { quality: 'low', reducedMotion: true });
  return { controller, canvas, frames, calls, modes, terrain, mammals,
    step(seconds = .05) { stamp += seconds * 1000; const queued = [...frames.values()]; frames.clear(); queued.forEach(callback => callback(stamp)); },
    run(seconds) { for (let i = 0; i < seconds * 20; i++) this.step(); },
    dispose() { controller.dispose(); canvas.remove(); listeners.forEach(args => window.removeEventListener(...args)); }, get disposed() { return disposed; }
  };
}
function uiController() {
  return Object.fromEntries(['pinResidentShape', 'clearResidentShape', 'setResidentFrozenSurface', 'setResidentFrozenOpacity', 'setResidentPart', 'setResidentView', 'setStudyOverlay', 'setPaused', 'setSpeed', 'setCamera', 'setLighting', 'setRepeatFlights', 'setMode', 'setBinoculars', 'setCrouching', 'recordSighting', 'lockPointer', 'setMove', 'stepMove', 'seek', 'resetView', 'restart', 'dispose', 'getState'].map(name => [name, vi.fn()]));
}
function uiButton(label) { return [...host.querySelectorAll('button')].find(el => el.textContent === label); }
async function mount(load, props = {}) {
  const View = new Function('loadBirdlab3D', lightNames + componentSource + '\nreturn Birdlab3DObservatory;')(load);
  await act(async () => root.render(React.createElement(View, { React, onBack: vi.fn(), onMenu: vi.fn(), ...props })));
  return View;
}


beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; previousMedia = window.matchMedia;
  window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host.remove(); window.matchMedia = previousMedia; delete window.BirdLab3D; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('BirdLab notebook conditions', () => {
  it('records the light and weather at the moment of the sighting', () => {
    const yaw = Math.atan2(1.8, 4.8), focus = new THREE.Vector3(1.8, 1.734, 4.8).add(new THREE.Vector3(-Math.sin(yaw) * Math.cos(.2), -Math.sin(.2), -Math.cos(yaw) * Math.cos(.2)).multiplyScalar(4));
    const test = runtime(() => false, focus), c = test.controller;
    try {
      c.setLighting('dawn'); c.setWeather('rain');
      c.setMode('free'); c.setBinoculars(true); test.run(3);
      expect(c.recordSighting()).toBe(true);
      expect(c.getState().sightings[0].conditions).toEqual({ light: 'dawn', weather: 'rain' });
      // Later changes leave the entry as it was recorded.
      c.setLighting('golden'); c.setWeather('clear');
      expect(c.getState().sightings[0].conditions).toEqual({ light: 'dawn', weather: 'rain' });
    } finally { test.dispose(); }
  });

  it('shows the conditions on each notebook entry, with why they matter', async () => {
    let publish;
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { publish = options.onState; options.onState(state); return uiController(); }) };
    await mount(() => Promise.resolve());
    expect(host.querySelector('[data-birdlab-conditions-hint]')).toBeNull();
    const entry = (id, name, conditions) => ({ id, name, scientificName: 'x', category: 'bird', behavior: 'Scanning', distance: 4, time: 30, conditions });
    await act(async () => publish({ mode: 'free', sightings: [entry('robin', 'American robin', { light: 'dawn', weather: 'rain' }), entry('blueJay', 'Blue jay', { light: 'golden', weather: 'clear' }), entry('grouse', 'Ruffed grouse')] }));
    const lines = [...host.querySelectorAll('[data-birdlab-sighting-conditions]')].map(n => n.textContent);
    expect(lines).toEqual(['Conditions · Dawn, light rain', 'Conditions · Golden hour, clear']);
    expect(host.querySelector('[data-birdlab-conditions-hint]').textContent).toMatch(/light and weather/);
  });
});
