import fs from 'node:fs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

let THREE, React, ReactDOM, gl, scene, camera, canvas, frameId = 0, signature = 0, renders = 0;
const frames = new Map(), mounted = [], canvasContexts = new WeakMap();
beforeAll(() => {
  window.HTMLCanvasElement.prototype.getContext = function () {
    if (canvasContexts.has(this)) return canvasContexts.get(this);
    const target = { commands: [], measureText: text => ({ width: String(text).length * 23 }),
      createLinearGradient: () => ({ stops: [], addColorStop(position, color) { this.stops.push({ position, color }); } }),
      fillRect(x, y, width, height) { this.commands.push({ kind: 'fillRect', x, y, width, height, style: this.fillStyle }); },
      arc(x, y, radius) { this.commands.push({ kind: 'arc', x, y, radius, style: this.fillStyle }); }
    };
    const context = new Proxy(target, { get: (target, key) => key in target ? target[key] : () => ({ addColorStop() {} }), set: (target, key, value) => { target[key] = value; return true; } });
    canvasContexts.set(this, context); return context;
  };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  globalThis.ResizeObserver = window.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.requestAnimationFrame = window.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame = id => frames.delete(id);
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'vendor/three-r128/three.min.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; THREE = window.THREE;
  THREE.WebGLRenderer = class {
    constructor(options) { this.domElement = options.canvas; }
    setClearColor() {} setPixelRatio() {} setSize() {} dispose() {}
    getContext() { return { isContextLost: () => false }; }
    render(nextScene, nextCamera) { renders++; scene = nextScene; camera = nextCamera; scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }
  };
  (0, eval)(fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8'));
  window.StemLab.ensureThree = () => Promise.resolve(THREE);
  (0, eval)(fs.readFileSync(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js', 'utf8'));
  gl = window.__alloTectGL;
});
afterEach(() => {
  while (mounted.length) { const host = mounted.pop(); ReactDOM.unmountComponentAtNode(host); host.remove(); }
  gl?.unmount(); canvas?.remove(); frames.clear(); canvas = scene = camera = null;
});
function frame(count = 1) { for (let i = 0; i < count; i++) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(performance.now())); } }
async function mountModel(mode = 'convergent', extra = {}) {
  canvas = document.createElement('canvas'); document.body.appendChild(canvas);
  Object.defineProperty(canvas, 'clientWidth', { value: 366 }); Object.defineProperty(canvas, 'clientHeight', { value: 340 });
  let model = { mode, mountainHeight: 7000, rift: 180, offset: 192, quakes: [], rotX: -22, rotY: -38, scale: 1, cut: 0, showScale: true, surfaceView: false, sig: String(++signature), ...extra };
  gl.submit(model); gl.mount(canvas); await Promise.resolve(); await Promise.resolve(); frame();
  expect(gl.debug().state).toBe('ready');
  return patch => { model = { ...model, ...patch, sig: String(++signature) }; gl.submit(model); frame(); };
}
function outline() { return scene.getObjectByName('boundary-feature-outline'); }
function coordinates() { const object = outline(); return Array.from(object.geometry.attributes.position.array).slice(0, object.geometry.drawRange.count * 3); }
function expectRealAnchor() {
  const debug = gl.debug().inspection, values = coordinates();
  expect(debug.anchor).toHaveLength(3); expect(debug.segments).toBeGreaterThan(0);
  // The hollow marker is an actual retained edge midpoint, independent of
  // arbitrary screen coordinates or a generic model bounding rectangle.
  let found = false;
  for (let i = 0; i < values.length; i += 6) if (debug.anchor.every((v, axis) => Math.abs(v - (values[i + axis] + values[i + axis + 3]) / 2) < 0.00001)) found = true;
  expect(found).toBe(true);
}

describe('Boundary feature highlights follow the current clipped geometry', () => {
  it('starts without a selection and never repaints an unchanged idle model', async () => {
    await mountModel(); expect(gl.debug().inspection.id).toBeNull(); expect(outline().visible).toBe(false);
    const rendered = renders; frame(80); expect(renders).toBe(rendered);
  });
  it('traces the dipping slab and real cut face without rebuilding rock, labels or arrows', async () => {
    const update = await mountModel(), builds = gl.debug().geometryBuilds, arrowObjects = [], rockObjects = [];
    scene.traverse(o => { if (o.userData.feature === 'plate-motion') arrowObjects.push(o); if (o.userData.feature === 'overriding-plate') rockObjects.push(o); });
    const oldCamera = { ...gl.debug().camera };
    update({ inspectionId: 'slab' }); const pooled = outline().geometry;
    expectRealAnchor(); expect(coordinates().filter((_, i) => i % 3 === 2).every(z => z <= 0.00001)).toBe(true);
    expect(gl.debug().geometryBuilds).toBe(builds); expect(gl.debug().camera).toEqual(oldCamera);
    update({ inspectionId: 'trench' }); expect(outline().geometry).toBe(pooled); expectRealAnchor();
    expect(gl.debug().geometryBuilds).toBe(builds);
    for (const arrow of arrowObjects) expect(arrow.parent).not.toBeNull(); for (const rock of rockObjects) expect(rock.parent).not.toBeNull();
  });
  it('keeps trench origin precise and derives volcanic outlines from retained edifices', async () => {
    const update = await mountModel('convergent', { inspectionId: 'trench' });
    const trench = coordinates(); for (let i = 0; i < trench.length; i += 3) { expect(trench[i]).toBe(0); expect(trench[i + 1]).toBeCloseTo(0.08); }
    update({ inspectionId: 'arc' }); expectRealAnchor(); expect(gl.debug().inspection.objects).toBeGreaterThan(0);
    expect(Math.max(...coordinates().filter((_, i) => i % 3 === 2))).toBeLessThanOrEqual(0.00001);
    update({ cut: -25 }); expect(gl.debug().inspection.reason).toBe('clipped'); expect(gl.debug().inspection.visible).toBe(false); expect(outline().geometry.drawRange.count).toBe(0);
  });
  it('explains the slab below a top view instead of drawing a false surface highlight', async () => {
    const update = await mountModel('convergent', { inspectionId: 'slab' });
    expect(gl.debug().inspection.visible).toBe(true);
    update({ cut: null, rotX: -88, rotY: 0, surfaceView: true }); expect(gl.debug().inspection.reason).toBe('depth-view'); expect(outline().visible).toBe(false);
    update({ cut: 0, rotX: 0, rotY: 0, surfaceView: false }); expect(gl.debug().inspection.visible).toBe(true); expectRealAnchor();
  });
  it('retains the crater contour when the centre slice crosses exact mesh vertices', async () => {
    await mountModel('convergent', { inspectionId: 'arc', cut: 0 }); const values = coordinates(), craterSegments = [];
    for (let i = 0; i < values.length; i += 6) {
      const a = values.slice(i, i + 3), b = values.slice(i + 3, i + 6);
      if (Math.abs(a[1] - 4.4 * 0.86) < 0.00001 && Math.abs(b[1] - 4.4 * 0.86) < 0.00001 && Math.abs(a[2]) < 0.00001 && Math.abs(b[2]) < 0.00001 && Math.abs(a[0] - b[0]) > 0.1) craterSegments.push([a[0], b[0]]);
    }
    expect(craterSegments.length).toBeGreaterThanOrEqual(2);
    const allX = craterSegments.flat(); expect(Math.max(...allX) - Math.min(...allX)).toBeCloseTo(2.4 * 0.14 * 2, 4);
  });
  it('distinguishes the narrow melt fissure from the actual wider cooling-crust mesh', async () => {
    const update = await mountModel('divergent', { inspectionId: 'ridge' });
    expectRealAnchor(); const fissureX = coordinates().filter((_, i) => i % 3 === 0), narrow = Math.max(...fissureX) - Math.min(...fissureX);
    update({ inspectionId: 'crust' }); expectRealAnchor(); const crustX = coordinates().filter((_, i) => i % 3 === 0), wider = Math.max(...crustX) - Math.min(...crustX);
    expect(wider).toBeGreaterThan(narrow * 5);
    update({ rift: 18 }); const smaller = coordinates().filter((_, i) => i % 3 === 0); expect(Math.max(...smaller) - Math.min(...smaller)).toBeCloseTo(1.6, 3);
  });
  it('clips matching marker pieces at their displaced plate coordinates and follows the fault', async () => {
    const update = await mountModel('transform', { inspectionId: 'markers' }); expectRealAnchor();
    expect(Math.max(...coordinates().filter((_, i) => i % 3 === 2))).toBeLessThanOrEqual(0.00001);
    const before = coordinates(); update({ offset: 260 }); expect(coordinates()).not.toEqual(before); expectRealAnchor();
    update({ inspectionId: 'fault' }); expectRealAnchor();
    const x = coordinates().filter((_, i) => i % 3 === 0); expect(Math.min(...x)).toBeCloseTo(-0.35); expect(Math.max(...x)).toBeCloseTo(0.35);
  });
  it('rejects a feature from another boundary and suppresses repeated availability notifications', async () => {
    const onInspection = vi.fn(), update = await mountModel('divergent', { inspectionId: 'slab', onInspection });
    expect(gl.debug().inspection.id).toBeNull(); const notified = onInspection.mock.calls.length;
    frame(50); update({ rotY: 42 }); expect(onInspection).toHaveBeenCalledTimes(notified);
    update({ inspectionId: 'ridge' }); expect(onInspection).toHaveBeenCalledTimes(notified + 1);
    update({ rift: 25 }); frame(50); expect(onInspection).toHaveBeenCalledTimes(notified + 1);
  });
  it('uses contrasting solid motion arrows without moving their true origins, tips or directions', async () => {
    const update = await mountModel('convergent', { darkMode: false }), arrows = [];
    scene.traverse(object => { if (object.userData.feature === 'plate-motion') arrows.push(object); });
    const original = arrows.map(arrow => ({ origin: arrow.position.toArray(), rotation: arrow.quaternion.toArray() })), builds = gl.debug().geometryBuilds;
    function luminance(hex) { const channels = [16, 8, 0].map(shift => ((hex >> shift) & 255) / 255).map(value => value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)); return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722; }
    function contrast(a, b) { const values = [luminance(a), luminance(b)].sort((a, b) => a - b); return (values[1] + 0.05) / (values[0] + 0.05); }
    for (const darkMode of [false, true]) for (const [rotX, rotY] of [[-22, -38], [-67, 2], [-88, 0]]) {
      update({ darkMode, rotX, rotY });
      arrows.forEach((arrow, index) => {
        const shaft = arrow.getObjectByName('plate-motion-shaft'), halo = arrow.getObjectByName('plate-motion-shaft-halo'), head = arrow.getObjectByName('plate-motion-head-halo');
        expect(arrow.position.toArray()).toEqual(original[index].origin); expect(arrow.quaternion.toArray()).toEqual(original[index].rotation);
        expect(arrow.cone.position.y).toBe(17); expect(head.position.y).toBe(17); expect(shaft.scale.y + arrow.cone.scale.y).toBeCloseTo(17);
        expect(shaft.material.color.getHex()).toBe(darkMode ? 0xf8fafc : 0x0f172a);
        expect(halo.material.color.getHex()).toBe(darkMode ? 0x0f172a : 0xf8fafc);
        expect(halo.material.side).toBe(THREE.BackSide); expect(halo.scale.x).toBeGreaterThan(shaft.scale.x);
        for (const surface of [0xffffff, 0x0f172a, 0x1f3f66, 0x7a5f1c, 0x657985]) expect(Math.max(contrast(surface, shaft.material.color.getHex()), contrast(surface, halo.material.color.getHex()))).toBeGreaterThan(3);
      });
      expect(gl.debug().geometryBuilds).toBe(builds);
    }
  });
});

function mountUI(extra = {}) {
  const host = document.createElement('div'); document.body.appendChild(host); mounted.push(host);
  ReactDOM.render(React.createElement(window.AlloTectonicsInteractive, { t: (_, fallback) => fallback, ...extra }), host);
  return host;
}
describe('Accessible feature selection preserves the boundary investigation', () => {
  it('provides real pressed buttons with connected descriptions and starts unselected', () => {
    const host = mountUI(), section = host.querySelector('[data-pt-boundary-inspector]');
    expect(section.dataset.ptBoundaryInspector).toBe('convergent');
    const all = section.querySelector('[data-pt-boundary-feature-select="all"]'); expect(all.getAttribute('aria-pressed')).toBe('true');
    for (const button of section.querySelectorAll('button')) {
      expect(button.type).toBe('button'); expect(button.getAttribute('aria-controls')).toBe('pt-boundary-section');
      for (const id of button.getAttribute('aria-describedby').split(' ')) expect(host.querySelector('#' + id)).not.toBeNull();
    }
  });
  it('selects a geological feature while retaining time, rate, pause and saved sample', () => {
    const onRecordSlab = vi.fn(), awardXP = vi.fn(), beep = vi.fn(), host = mountUI({ onRecordSlab, awardXP, beep });
    const time = host.querySelector('[data-pt-model-reading="time"]').textContent, rate = host.querySelector('input[aria-label="Plate movement rate in centimeters per year"]').value;
    host.querySelector('[data-pt-boundary-feature-select="slab"]').click();
    expect(host.querySelector('[data-pt-boundary-feature-select="slab"]').getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-tect-section]').dataset.ptBoundaryFeature).toBe('slab');
    expect(host.querySelector('#pt-boundary-inspector-detail').textContent).toContain('same rock from the trench');
    expect(host.querySelector('[data-pt-model-reading="time"]').textContent).toBe(time); expect(host.querySelector('input[aria-label="Plate movement rate in centimeters per year"]').value).toBe(rate);
    expect(host.querySelector('[data-pt-model-step]').disabled).toBe(false); frame(30);
    expect(onRecordSlab).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled(); expect(beep).not.toHaveBeenCalled();
  });
  it('describes each focused feature accurately before it is selected', () => {
    const host = mountUI(); host.querySelector('[data-pt-boundary-feature-select="slab"]').click();
    const trench = host.querySelector('[data-pt-boundary-feature-select="trench"]'); trench.focus();
    const description = host.querySelector('#' + trench.getAttribute('aria-describedby'));
    expect(description.textContent).toContain('marks where the oceanic plate bends down');
    expect(description.textContent).not.toContain('earthquake band traces the slab');
    expect(description.hidden).toBe(true); expect(trench.getAttribute('aria-pressed')).toBe('false');
    trench.click(); expect(trench.getAttribute('aria-describedby')).toContain('pt-boundary-inspector-status');
  });
  it('directs learners to the overhead view when top-face markers are covered in Cut face', async () => {
    const host = mountUI(); host.querySelector('[data-tect-mode="transform"]').click(); host.querySelector('[data-tect-view="3d"]').click();
    const block = host.querySelector('[data-tect-gl]'); Object.defineProperty(block, 'clientWidth', { value: 366 }); Object.defineProperty(block, 'clientHeight', { value: 300 });
    await Promise.resolve(); await Promise.resolve(); frame();
    host.querySelector('[data-pt-boundary-feature-select="markers"]').click(); host.querySelector('[data-tect-preset="section"]').click(); frame();
    expect(host.querySelector('#pt-boundary-inspector-status').textContent).toContain('marker pairs are on the top faces');
    expect(host.querySelector('#pt-boundary-inspector-status').textContent).toContain('Choose From above');
    host.querySelector('[data-tect-preset="surface"]').click(); frame();
    expect(host.querySelector('#pt-boundary-inspector-status').textContent).toContain('Pale edges outline the exposed shape');
  });
  it('uses mode-specific features, remembers each selection and clearly identifies missing 2D bands', () => {
    const host = mountUI(); host.querySelector('[data-pt-boundary-feature-select="trench"]').click(); host.querySelector('[data-tect-mode="divergent"]').click();
    expect(host.querySelector('[data-pt-boundary-feature-select="slab"]')).toBeNull(); host.querySelector('[data-pt-boundary-feature-select="crust"]').click();
    expect(host.querySelector('#pt-boundary-inspector-status').textContent).toContain('has not opened enough');
    host.querySelector('[data-tect-mode="transform"]').click(); host.querySelector('[data-pt-boundary-feature-select="markers"]').click();
    expect(host.querySelector('#pt-boundary-inspector-status').textContent).toContain('outlined stream in the map inset');
    host.querySelector('[data-tect-mode="convergent"]').click(); expect(host.querySelector('[data-pt-boundary-feature-select="trench"]').getAttribute('aria-pressed')).toBe('true');
    host.querySelector('[data-pt-boundary-feature-select="all"]').click(); expect(host.querySelector('[data-tect-section]').dataset.ptBoundaryFeature).toBe('none');
  });
  it('draws widening solid crust around a narrow melt fissure using the same unchanged plate clock', () => {
    const host = mountUI(); host.querySelector('[data-tect-mode="divergent"]').click();
    for (let i = 0; i < 40; i++) host.querySelector('[data-pt-model-step]').click();
    const time = host.querySelector('[data-pt-model-reading="time"]').textContent, movement = host.querySelector('[data-pt-model-reading="movement"]').textContent;
    expect(movement).toContain('120');
    host.querySelector('[data-pt-boundary-feature-select="crust"]').click();
    const sectionCanvas = host.querySelector('[data-tect-section]');
    sectionCanvas.getBoundingClientRect = () => ({ top: 0, bottom: 300, left: 0, right: 540, width: 540, height: 300 });
    const context = canvasContexts.get(sectionCanvas); context.commands.length = 0; frame();
    const gradients = context.commands.filter(command => command.kind === 'fillRect' && command.style?.stops);
    const cooling = gradients.find(command => command.style.stops.some(stop => stop.color === '#657985'));
    const melt = gradients.find(command => command.style.stops.some(stop => stop.color === '#f97316'));
    expect(cooling.width).toBe(120); expect(cooling.x).toBe(210); expect(melt.width).toBe(6); expect(melt.x).toBe(267);
    expect(cooling.height).toBe(melt.height);
    const fountains = context.commands.filter(command => command.kind === 'arc' && String(command.style).startsWith('rgba(252,165,165,'));
    expect(fountains).toHaveLength(3); for (const fountain of fountains) expect(Math.abs(fountain.x - 270)).toBeLessThanOrEqual(3);
    expect(host.querySelector('#pt-boundary-inspector-status').textContent).toContain('most of the widening band is solid');
    expect(host.querySelector('[data-pt-model-reading="time"]').textContent).toBe(time); expect(host.querySelector('[data-pt-model-reading="movement"]').textContent).toBe(movement);
  });
});


describe('Nearby feature reveal actions keep the investigation in place', () => {
  const saved = { version: 1, angle: 42, points: Array.from({ length: 8 }, (_, index) => ({ x: 100 + index * 45, z: 100 + index * 40, m: 4 })) };
  function effects() { return Object.fromEntries(['onRecordSlab', 'onRecordDepths', 'onRecordBoundaryInquiry', 'onRecordBoundaryDraft', 'awardXP', 'beep', 'announceToSR'].map(key => [key, vi.fn()])); }
  async function ready(host) {
    const log = host.querySelector('[data-pt-quake-log]'); log.open = true; log.dispatchEvent(new Event('toggle', { bubbles: true }));
    host.querySelector('[data-tect-view="3d"]').click(); const block = host.querySelector('[data-tect-gl]');
    Object.defineProperty(block, 'clientWidth', { value: 366 }); Object.defineProperty(block, 'clientHeight', { value: 300 });
    await Promise.resolve(); await Promise.resolve(); frame(); expect(gl.debug().state).toBe('ready');
  }
  function state(host) { return {
    time: host.querySelector('[data-pt-model-reading="time"]').textContent,
    movement: host.querySelector('[data-pt-model-reading="movement"]').textContent,
    rate: host.querySelector('input[aria-label="Plate movement rate in centimeters per year"]').value,
    paused: !host.querySelector('[data-pt-model-step]').disabled,
    checked: host.querySelector('[data-pt-quake-fit]')?.textContent,
    selected: host.querySelector('[data-pt-boundary-feature-select][aria-pressed="true"]').dataset.ptBoundaryFeatureSelect
  }; }
  function quiet(callbacks) { for (const callback of Object.values(callbacks)) expect(callback).not.toHaveBeenCalled(); }
  function clear(callbacks) { for (const callback of Object.values(callbacks)) callback.mockClear(); }

  it('offers only a relevant explicit reveal action and leaves a hidden slab view unchanged until activation', async () => {
    const callbacks = effects(), host = mountUI({ ...callbacks, savedSlab: saved });
    host.querySelector('[data-pt-boundary-feature-select="slab"]').click(); expect(host.querySelector('[data-pt-boundary-reveal]')).toBeNull();
    await ready(host); host.querySelector('[data-tect-preset="surface"]').click(); frame(); clear(callbacks);
    const before = state(host), cameraBefore = gl.debug().camera;
    const action = host.querySelector('[data-pt-boundary-reveal="section"]'); expect(action).not.toBeNull();
    expect(action.type).toBe('button'); expect(action.style.minHeight).toBe('44px');
    expect(action.getAttribute('aria-describedby')).toBe('pt-boundary-inspector-status');
    frame(1200); expect(gl.debug().camera).toEqual(cameraBefore); expect(gl.debug().inspection.visible).toBe(false);
    expect(state(host)).toEqual(before); quiet(callbacks);
    host.querySelector('[data-pt-boundary-feature-select="trench"]').click(); frame(); expect(host.querySelector('[data-pt-boundary-reveal]')).toBeNull();
    host.querySelector('[data-pt-boundary-feature-select="all"]').click(); frame(); expect(host.querySelector('[data-pt-boundary-reveal]')).toBeNull();
  });

  it('reveals the slab using the exact cut-face preset, retains checked evidence and keeps focus in its panel', async () => {
    const callbacks = effects(), host = mountUI({ ...callbacks, savedSlab: saved }); await ready(host);
    host.querySelector('[data-tect-scale-toggle]').click(); frame();
    host.querySelector('[data-pt-boundary-feature-select="slab"]').click(); host.querySelector('[data-tect-preset="surface"]').click(); frame(); clear(callbacks);
    const before = state(host), builds = gl.debug().geometryBuilds, action = host.querySelector('[data-pt-boundary-reveal="section"]'); expect(before.checked).toBeTruthy(); action.focus(); action.click(); await new Promise(resolve => setTimeout(resolve, 0)); frame();
    expect(host.querySelector('[data-tect-gl]').dataset.tectView).toBe('0,0,1.00'); expect(gl.debug().clipConstant).toBe(0);
    expect(gl.debug().inspection.id).toBe('slab'); expect(gl.debug().inspection.visible).toBe(true); expect(gl.debug().inspection.segments).toBeGreaterThan(0);
    expect(host.querySelector('[data-tect-scale-toggle]').getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelector('[data-pt-boundary-reveal]')).toBeNull(); expect(host.querySelector('[data-pt-boundary-inspector]').contains(document.activeElement)).toBe(true);
    expect(state(host)).toEqual(before); expect(gl.debug().geometryBuilds).toBe(builds); quiet(callbacks);
    const rendersBefore = renders; frame(1200); expect(renders).toBe(rendersBefore); expect(state(host)).toEqual(before); quiet(callbacks);
  });

  it('reveals matching markers from above while preserving the full offset and boundary choice', async () => {
    const callbacks = effects(), host = mountUI(callbacks); host.querySelector('[data-tect-mode="transform"]').click();
    for (let index = 0; index < 3; index++) host.querySelector('[data-pt-model-step]').click();
    await ready(host); host.querySelector('[data-pt-boundary-feature-select="markers"]').click(); host.querySelector('[data-tect-preset="section"]').click(); frame(); clear(callbacks);
    const before = state(host), builds = gl.debug().geometryBuilds, action = host.querySelector('[data-pt-boundary-reveal="surface"]'); expect(action).not.toBeNull();
    action.focus(); action.click(); await new Promise(resolve => setTimeout(resolve, 0)); frame();
    expect(host.querySelector('[data-tect-gl]').dataset.tectView).toBe('-88,0,1.00'); expect(gl.debug().inspection.id).toBe('markers'); expect(gl.debug().inspection.visible).toBe(true);
    expect(host.querySelector('[data-tect-preset="surface"]').getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-pt-boundary-reveal]')).toBeNull(); expect(host.querySelector('[data-pt-boundary-inspector]').contains(document.activeElement)).toBe(true);
    expect(state(host)).toEqual(before); expect(gl.debug().geometryBuilds).toBe(builds); quiet(callbacks);
  });

  it('keeps a running model running when explicitly revealing its slab', async () => {
    const callbacks = effects(), host = mountUI(callbacks); await ready(host);
    host.querySelector('[data-pt-boundary-feature-select="slab"]').click(); host.querySelector('[data-tect-preset="surface"]').click(); frame();
    host.querySelector('[data-pt-model-play]').click(); clear(callbacks); const before = state(host);
    host.querySelector('[data-pt-boundary-reveal="section"]').click();
    expect(state(host)).toEqual(before); expect(host.querySelector('[data-pt-model-step]').disabled).toBe(true); quiet(callbacks);
  });
});


describe('Discoverable boundary zoom preserves the investigation', () => {
  const saved = { version: 1, angle: 42, points: Array.from({ length: 8 }, (_, index) => ({ x: 100 + index * 45, z: 100 + index * 40, m: 4 })) };
  function callbacks() { return Object.fromEntries(['onRecordSlab', 'onRecordDepths', 'onRecordBoundaryInquiry', 'onRecordBoundaryDraft', 'awardXP', 'beep', 'announceToSR'].map(key => [key, vi.fn()])); }
  function clear(effects) { for (const callback of Object.values(effects)) callback.mockClear(); }
  function quiet(effects) { for (const callback of Object.values(effects)) expect(callback).not.toHaveBeenCalled(); }
  function view(host) { return host.querySelector('[data-tect-gl]').dataset.tectView.split(',').map(Number); }
  function invariant(host) { return {
    angles: view(host).slice(0, 2), cut: host.querySelector('#tect-cut').value,
    scalePreference: host.querySelector('[data-tect-scale-toggle]').getAttribute('aria-pressed'),
    time: host.querySelector('[data-pt-model-reading="time"]').textContent,
    movement: host.querySelector('[data-pt-model-reading="movement"]').textContent,
    rate: host.querySelector('input[aria-label="Plate movement rate in centimeters per year"]').value,
    playing: host.querySelector('[data-pt-model-play]').textContent,
    paused: !host.querySelector('[data-pt-model-step]').disabled,
    fit: host.querySelector('[data-pt-quake-fit]')?.textContent,
    points: [...host.querySelectorAll('[data-pt-quake-point]')].map(point => [point.dataset.distanceKm, point.dataset.depthKm]),
    selection: host.querySelector('[data-pt-boundary-feature-select][aria-pressed="true"]').dataset.ptBoundaryFeatureSelect
  }; }
  async function ready(host) {
    const log = host.querySelector('[data-pt-quake-log]'); log.open = true; log.dispatchEvent(new Event('toggle', { bubbles: true }));
    host.querySelector('[data-tect-view="3d"]').click(); const block = host.querySelector('[data-tect-gl]');
    Object.defineProperty(block, 'clientWidth', { value: 366 }); Object.defineProperty(block, 'clientHeight', { value: 300 });
    await Promise.resolve(); await Promise.resolve(); frame(); expect(gl.debug().state).toBe('ready');
  }
  function zoom(host, direction) { host.querySelector('[data-tect-zoom="' + direction + '"]').click(); }

  it('offers named native buttons linked to the 3D block and a quiet visible zoom value', async () => {
    const effects = callbacks(), host = mountUI({ ...effects, savedSlab: saved });
    expect(host.querySelector('[data-tect-zoom]')).toBeNull(); await ready(host); clear(effects);
    for (const direction of ['in', 'out']) {
      const button = host.querySelector('[data-tect-zoom="' + direction + '"]');
      expect(button.type).toBe('button'); expect(button.textContent).toBe(direction === 'in' ? 'Zoom in' : 'Zoom out');
      expect(button.getAttribute('aria-controls')).toBe('pt-boundary-3d'); expect(button.disabled).toBe(false);
      expect(button.style.minHeight).toBe('44px');
    }
    const level = host.querySelector('[data-tect-zoom-level]'); expect(level.textContent).toBe('View zoom: 100%');
    expect(level.getAttribute('aria-live')).toBe('off');
    frame(1200); expect(level.textContent).toBe('View zoom: 100%'); quiet(effects);
  });

  it('changes only zoom by the keyboard-sized increment while retaining the cut, scale preference and checked sample', async () => {
    const effects = callbacks(), host = mountUI({ ...effects, savedSlab: saved }); await ready(host);
    host.querySelector('[data-tect-preset="section"]').click(); host.querySelector('[data-tect-scale-toggle]').click();
    host.querySelector('[data-pt-boundary-feature-select="slab"]').click(); frame(); clear(effects);
    const before = invariant(host), builds = gl.debug().geometryBuilds; expect(before.fit).toBeTruthy();
    zoom(host, 'in'); frame(); expect(view(host)[2]).toBeCloseTo(1.15); expect(host.querySelector('[data-tect-zoom-level]').textContent).toBe('View zoom: 115%');
    expect(invariant(host)).toEqual(before); expect(gl.debug().inspection.id).toBe('slab'); expect(gl.debug().geometryBuilds).toBe(builds); quiet(effects);
    zoom(host, 'out'); frame(); expect(view(host)[2]).toBe(1); expect(invariant(host)).toEqual(before); quiet(effects);
  });

  it('clamps repeated requests, disables the exhausted direction and never repeats idle effects at either bound', async () => {
    const effects = callbacks(), host = mountUI({ ...effects, savedSlab: saved }); await ready(host); clear(effects);
    const before = invariant(host);
    for (let index = 0; index < 20; index++) zoom(host, 'out'); frame();
    expect(view(host)[2]).toBe(0.4); expect(host.querySelector('[data-tect-zoom-level]').textContent).toBe('View zoom: 40%');
    expect(host.querySelector('[data-tect-zoom="out"]').disabled).toBe(true); expect(host.querySelector('[data-tect-zoom="in"]').disabled).toBe(false);
    const atMinimum = host.querySelector('[data-tect-gl]').dataset.tectView, minRenders = renders;
    for (let index = 0; index < 20; index++) zoom(host, 'out'); frame(1200);
    expect(host.querySelector('[data-tect-gl]').dataset.tectView).toBe(atMinimum); expect(renders).toBe(minRenders); expect(invariant(host)).toEqual(before); quiet(effects);
    for (let index = 0; index < 30; index++) zoom(host, 'in'); frame();
    expect(view(host)[2]).toBe(2.6); expect(host.querySelector('[data-tect-zoom-level]').textContent).toBe('View zoom: 260%');
    expect(host.querySelector('[data-tect-zoom="in"]').disabled).toBe(true); expect(host.querySelector('[data-tect-zoom="out"]').disabled).toBe(false);
    const atMaximum = host.querySelector('[data-tect-gl]').dataset.tectView, maxRenders = renders;
    for (let index = 0; index < 20; index++) zoom(host, 'in'); frame(1200);
    expect(host.querySelector('[data-tect-gl]').dataset.tectView).toBe(atMaximum); expect(renders).toBe(maxRenders); expect(invariant(host)).toEqual(before); quiet(effects);
  });

  it('shares its visible zoom value with keyboard and wheel changes and resets it with existing presets and Home', async () => {
    const effects = callbacks(), host = mountUI({ ...effects, savedSlab: saved }); await ready(host); clear(effects);
    const block = host.querySelector('[data-tect-gl]');
    block.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true, cancelable: true })); expect(view(host)[2]).toBe(1.15); expect(host.querySelector('[data-tect-zoom-level]').textContent).toBe('View zoom: 115%');
    block.dispatchEvent(new WheelEvent('wheel', { deltaY: -1, bubbles: true })); expect(view(host)[2]).toBe(1.25); expect(host.querySelector('[data-tect-zoom-level]').textContent).toBe('View zoom: 125%'); quiet(effects);
    for (const id of ['section', 'surface', 'oblique']) {
      zoom(host, 'in'); host.querySelector('[data-tect-preset="' + id + '"]').click(); expect(view(host)[2]).toBe(1); expect(host.querySelector('[data-tect-zoom-level]').textContent).toBe('View zoom: 100%');
    }
    zoom(host, 'in'); [...host.querySelectorAll('button')].find(button => button.textContent === 'Reset view').click(); expect(view(host)[2]).toBe(1); quiet(effects);
    zoom(host, 'in'); block.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })); expect(view(host)).toEqual([-22, -38, 1]); expect(host.querySelector('[data-tect-zoom-level]').textContent).toBe('View zoom: 100%');
    expect(effects.announceToSR).toHaveBeenCalledTimes(1); effects.announceToSR.mockClear(); frame(1200); quiet(effects);
  });

  it('keeps playback running when zoom changes without creating sample writes or learner rewards', async () => {
    const effects = callbacks(), host = mountUI({ ...effects, savedSlab: saved }); await ready(host);
    host.querySelector('[data-pt-boundary-feature-select="trench"]').click(); host.querySelector('[data-pt-model-play]').click(); clear(effects);
    const before = invariant(host); expect(before.paused).toBe(false); zoom(host, 'in'); zoom(host, 'out');
    expect(invariant(host)).toEqual(before); expect(view(host)[2]).toBe(1); quiet(effects);
  });

  it('moves keyboard focus to the enabled opposite action at each bound without scrolling or changing the investigation', async () => {
    const effects = callbacks(), host = mountUI({ ...effects, savedSlab: saved }); await ready(host); clear(effects);
    const zoomIn = host.querySelector('[data-tect-zoom="in"]'), zoomOut = host.querySelector('[data-tect-zoom="out"]');
    const inFocus = vi.spyOn(zoomIn, 'focus'), outFocus = vi.spyOn(zoomOut, 'focus');
    const before = invariant(host), scroll = { x: window.scrollX, y: window.scrollY };
    zoomOut.focus(); inFocus.mockClear();
    for (let index = 0; index < 20; index++) zoom(host, 'out');
    await new Promise(resolve => setTimeout(resolve, 0)); frame();
    expect(zoomOut.disabled).toBe(true); expect(zoomIn.disabled).toBe(false); expect(document.activeElement).toBe(zoomIn);
    expect(inFocus).toHaveBeenLastCalledWith({ preventScroll: true }); expect({ x: window.scrollX, y: window.scrollY }).toEqual(scroll);
    expect(invariant(host)).toEqual(before); quiet(effects);
    zoomIn.focus(); outFocus.mockClear();
    for (let index = 0; index < 30; index++) zoom(host, 'in');
    await new Promise(resolve => setTimeout(resolve, 0)); frame();
    expect(zoomIn.disabled).toBe(true); expect(zoomOut.disabled).toBe(false); expect(document.activeElement).toBe(zoomOut);
    expect(outFocus).toHaveBeenLastCalledWith({ preventScroll: true }); expect({ x: window.scrollX, y: window.scrollY }).toEqual(scroll);
    expect(invariant(host)).toEqual(before); quiet(effects); inFocus.mockRestore(); outFocus.mockRestore();
  });
});


describe('Nearby 3D inspection starts only on the learner’s explicit choice', () => {
  const saved = { version: 1, angle: 42, points: Array.from({ length: 8 }, (_, index) => ({ x: 100 + index * 45, z: 100 + index * 40, m: 4 })) };
  function callbacks() { return Object.fromEntries(['onRecordSlab', 'onRecordDepths', 'onRecordBoundaryInquiry', 'onRecordBoundaryDraft', 'awardXP', 'beep', 'announceToSR'].map(key => [key, vi.fn()])); }
  function clear(effects) { for (const callback of Object.values(effects)) callback.mockClear(); }
  function quiet(effects) { for (const callback of Object.values(effects)) expect(callback).not.toHaveBeenCalled(); }
  function noWritesOrRewards(effects) { for (const [key, callback] of Object.entries(effects)) if (key !== 'announceToSR') expect(callback).not.toHaveBeenCalled(); }
  function evidence(host) { return {
    time: host.querySelector('[data-pt-model-reading="time"]').textContent,
    movement: host.querySelector('[data-pt-model-reading="movement"]').textContent,
    rate: host.querySelector('input[aria-label="Plate movement rate in centimeters per year"]').value,
    playing: host.querySelector('[data-pt-model-play]').textContent,
    paused: !host.querySelector('[data-pt-model-step]').disabled,
    fit: host.querySelector('[data-pt-quake-fit]')?.textContent,
    points: [...host.querySelectorAll('[data-pt-quake-point]')].map(point => [point.dataset.distanceKm, point.dataset.depthKm]),
    selection: host.querySelector('[data-pt-boundary-feature-select][aria-pressed="true"]').dataset.ptBoundaryFeatureSelect
  }; }
  function sizeBlock(host) {
    const block = host.querySelector('[data-tect-gl]');
    Object.defineProperty(block, 'clientWidth', { value: 366 }); Object.defineProperty(block, 'clientHeight', { value: 300 });
    return block;
  }
  async function settleReady(host) { sizeBlock(host); await Promise.resolve(); await Promise.resolve(); frame(); expect(gl.debug().state).toBe('ready'); }
  async function flushEffects() { await new Promise(resolve => setTimeout(resolve, 0)); }

  it('keeps a selected 2D feature and checked evidence quiet until the nearby 3D action is chosen', () => {
    const effects = callbacks(), loader = vi.spyOn(window.StemLab, 'ensureThree'), host = mountUI({ ...effects, savedSlab: saved });
    try {
      expect(host.querySelector('[data-pt-inspect-in-3d]')).toBeNull();
      host.querySelector('[data-pt-boundary-feature-select="slab"]').click();
      const action = host.querySelector('[data-pt-inspect-in-3d]'), before = evidence(host);
      expect(before.points).toHaveLength(8); expect(before.fit).toBeTruthy();
      expect(action.type).toBe('button'); expect(action.textContent).toBe('Inspect this feature in 3D'); expect(action.style.minHeight).toBe('44px');
      for (const id of action.getAttribute('aria-describedby').split(' ')) expect(host.querySelector('#' + id)).not.toBeNull();
      expect(host.querySelector('#' + action.getAttribute('aria-controls'))).not.toBeNull();
      expect(host.querySelectorAll('[data-tect-view="3d"]')).toHaveLength(1);
      frame(1200);
      expect(host.querySelector('[data-tect-gl]')).toBeNull(); expect(loader).not.toHaveBeenCalled();
      expect(host.querySelector('[data-tect-section]').getAttribute('aria-hidden')).toBe('false');
      expect(host.querySelector('[data-tect-section]').dataset.ptBoundaryFeature).toBe('slab'); expect(evidence(host)).toEqual(before); quiet(effects);
      host.querySelector('[data-pt-boundary-feature-select="all"]').click(); expect(host.querySelector('[data-pt-inspect-in-3d]')).toBeNull();
      expect(loader).not.toHaveBeenCalled(); quiet(effects);
    } finally { loader.mockRestore(); }
  });

  it('opens 3D explicitly, recenters a scrolled section and focuses its explanation while preserving the checked sample', async () => {
    const effects = callbacks(), host = mountUI({ ...effects, savedSlab: saved });
    host.querySelector('[data-pt-boundary-feature-select="slab"]').click();
    const action = host.querySelector('[data-pt-inspect-in-3d]'), status = host.querySelector('#pt-boundary-inspector-status'), focus = vi.spyOn(status, 'focus');
    const frameElement = host.querySelector('[data-tect-section]').parentElement; frameElement.scrollLeft = 135;
    const before = evidence(host);
    try {
      action.focus(); action.click(); await flushEffects(); await settleReady(host);
      expect(host.querySelector('[data-pt-inspect-in-3d]')).toBeNull(); expect(frameElement.scrollLeft).toBe(0);
      expect(document.activeElement).toBe(status); expect(focus).toHaveBeenCalledTimes(1); expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
      expect(host.querySelector('[data-tect-section]').getAttribute('aria-hidden')).toBe('true');
      expect(host.querySelector('[data-tect-gl]').getAttribute('aria-hidden')).toBe('false'); expect(gl.debug().inspection.id).toBe('slab');
      expect(evidence(host)).toEqual(before); noWritesOrRewards(effects);
      expect(effects.announceToSR.mock.calls.map(call => call[0])).toEqual(['Switched to the 3D block view.', '3D block view ready.']);
      clear(effects); const rendered = renders; frame(1200);
      expect(renders).toBe(rendered); expect(evidence(host)).toEqual(before); expect(document.activeElement).toBe(status); expect(focus).toHaveBeenCalledTimes(1); quiet(effects);
    } finally { focus.mockRestore(); }
  });

  it('retains the learner’s camera, slice, zoom, depth preference and running choice through a 2D inspection round trip', async () => {
    const effects = callbacks(), host = mountUI({ ...effects, savedSlab: saved });
    host.querySelector('[data-pt-boundary-feature-select="slab"]').click(); host.querySelector('[data-pt-inspect-in-3d]').click(); await settleReady(host);
    host.querySelector('[data-tect-preset="section"]').click(); host.querySelector('[data-tect-scale-toggle]').click();
    const cut = host.querySelector('#tect-cut'); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(cut, '25'); cut.dispatchEvent(new Event('input', { bubbles: true }));
    host.querySelector('[data-tect-gl]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    host.querySelector('[data-tect-zoom="in"]').click(); frame();
    const beforeView = host.querySelector('[data-tect-gl]').dataset.tectView, beforeCut = cut.value, beforeScale = host.querySelector('[data-tect-scale-toggle]').getAttribute('aria-pressed');
    expect(beforeView).toBe('0,8,1.15'); expect(beforeCut).toBe('25'); expect(beforeScale).toBe('false');
    host.querySelector('[data-pt-model-play]').click(); const before = evidence(host); expect(before.paused).toBe(false);
    host.querySelector('[data-tect-view="2d"]').click();
    expect(host.querySelector('[data-pt-inspect-in-3d]')).not.toBeNull(); expect(host.querySelector('[data-tect-gl]')).toBeNull();
    clear(effects); host.querySelector('[data-pt-inspect-in-3d]').click();
    expect(evidence(host)).toEqual(before); expect(host.querySelector('[data-pt-model-step]').disabled).toBe(true);
    expect(host.querySelector('[data-tect-gl]').dataset.tectView).toBe(beforeView); expect(host.querySelector('#tect-cut').value).toBe(beforeCut);
    expect(host.querySelector('[data-tect-scale-toggle]').getAttribute('aria-pressed')).toBe(beforeScale);
    expect(host.querySelector('[data-pt-inspect-in-3d]')).toBeNull(); expect(host.querySelectorAll('[data-tect-view="3d"]')).toHaveLength(1);
    noWritesOrRewards(effects); expect(effects.announceToSR.mock.calls.map(call => call[0])).toEqual(['Switched to the 3D block view.']);
  });

  it('keeps the 2D fallback accessible and local focus stable while the explicitly requested block loads', async () => {
    let resolveEngine;
    const deferred = new Promise(resolve => { resolveEngine = resolve; });
    const loader = vi.spyOn(window.StemLab, 'ensureThree').mockReturnValue(deferred), effects = callbacks(), host = mountUI({ ...effects, savedSlab: saved });
    host.querySelector('[data-pt-boundary-feature-select="slab"]').click();
    const before = evidence(host), status = host.querySelector('#pt-boundary-inspector-status'), focus = vi.spyOn(status, 'focus');
    try {
      host.querySelector('[data-pt-inspect-in-3d]').focus(); host.querySelector('[data-pt-inspect-in-3d]').click(); sizeBlock(host); await flushEffects();
      expect(gl.debug().state).toBe('loading'); expect(status.textContent).toContain('3D block is loading'); expect(document.activeElement).toBe(status);
      expect(focus).toHaveBeenCalledTimes(1); expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
      expect(host.querySelector('[data-tect-section]').getAttribute('aria-hidden')).toBe('false'); expect(host.querySelector('[data-tect-section]').tabIndex).toBe(0);
      expect(host.querySelector('[data-tect-gl]').getAttribute('aria-hidden')).toBe('true'); expect(host.querySelector('[data-tect-gl]').tabIndex).toBe(-1);
      expect(host.querySelector('[data-pt-boundary-feature-select="slab"]').getAttribute('aria-controls')).toBe('pt-boundary-section'); expect(host.querySelector('[data-pt-inspect-in-3d]')).toBeNull();
      expect(effects.announceToSR.mock.calls.map(call => call[0])).toEqual(['Switched to the 3D block view.']); clear(effects);
      frame(1200); expect(loader).toHaveBeenCalledTimes(1); expect(evidence(host)).toEqual(before); quiet(effects);
      resolveEngine(THREE); await Promise.resolve(); await Promise.resolve(); frame();
      expect(gl.debug().state).toBe('ready'); expect(host.querySelector('[data-tect-section]').getAttribute('aria-hidden')).toBe('true');
      expect(host.querySelector('[data-pt-boundary-feature-select="slab"]').getAttribute('aria-controls')).toBe('pt-boundary-3d');
      expect(status.textContent).not.toContain('loading'); expect(document.activeElement).toBe(status); expect(focus).toHaveBeenCalledTimes(1);
      expect(evidence(host)).toEqual(before); noWritesOrRewards(effects); expect(effects.announceToSR.mock.calls.map(call => call[0])).toEqual(['3D block view ready.']);
      clear(effects); const rendered = renders; frame(1200); expect(renders).toBe(rendered); quiet(effects);
    } finally { loader.mockRestore(); focus.mockRestore(); }
  });

  it('restores an actionable 2D inspection after loading fails without losing focus, checked evidence or quiet idle', async () => {
    let rejectEngine;
    const deferred = new Promise((resolve, reject) => { rejectEngine = reject; });
    const loader = vi.spyOn(window.StemLab, 'ensureThree').mockReturnValue(deferred), effects = callbacks(), host = mountUI({ ...effects, savedSlab: saved });
    host.querySelector('[data-pt-boundary-feature-select="slab"]').click();
    const before = evidence(host), status = host.querySelector('#pt-boundary-inspector-status'), focus = vi.spyOn(status, 'focus');
    try {
      host.querySelector('[data-pt-inspect-in-3d]').focus(); host.querySelector('[data-pt-inspect-in-3d]').click(); sizeBlock(host); await flushEffects();
      expect(document.activeElement).toBe(status); rejectEngine(new Error('simulated unavailable engine')); await Promise.resolve(); await Promise.resolve(); await flushEffects();
      expect(host.querySelector('[data-tect-gl]')).toBeNull(); expect(host.querySelector('[data-tect-view="2d"]').getAttribute('aria-pressed')).toBe('true');
      expect(host.querySelector('[data-tect-section]').getAttribute('aria-hidden')).toBe('false'); expect(host.querySelector('[data-tect-section]').tabIndex).toBe(0);
      expect(host.querySelector('[data-pt-inspect-in-3d]')).not.toBeNull(); expect(host.querySelectorAll('[data-tect-view="3d"]')).toHaveLength(1);
      expect(host.querySelector('[data-pt-boundary-feature-select="slab"]').getAttribute('aria-controls')).toBe('pt-boundary-section'); expect(status.textContent).not.toContain('loading');
      expect(document.activeElement).toBe(status); expect(focus).toHaveBeenCalledTimes(1); expect(evidence(host)).toEqual(before); noWritesOrRewards(effects);
      expect(effects.announceToSR.mock.calls.map(call => call[0])).toEqual(['Switched to the 3D block view.', 'The 3D block could not load. Showing the 2D cross-section.']);
      clear(effects); frame(1200); expect(loader).toHaveBeenCalledTimes(1); expect(evidence(host)).toEqual(before); expect(document.activeElement).toBe(status); quiet(effects);
    } finally { loader.mockRestore(); focus.mockRestore(); }
  });
});
