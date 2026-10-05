import fs from 'node:fs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

let THREE, React, ReactDOM, gl, scene, camera, canvas, frameId = 0, signature = 0, renders = 0;
const frames = new Map(), mounted = [], contexts = new WeakMap();
beforeAll(() => {
  window.HTMLCanvasElement.prototype.getContext = function () {
    if (contexts.has(this)) return contexts.get(this);
    const target = { canvas: this, commands: [], path: [], measureText: text => ({ width: String(text).length * 23 }),
      createLinearGradient: () => ({ stops: [], addColorStop(position, color) { this.stops.push({ position, color }); } }),
      createRadialGradient: () => ({ stops: [], addColorStop(position, color) { this.stops.push({ position, color }); } }),
      beginPath() { this.path = []; }, moveTo(x, y) { this.path.push({ kind: 'move', x, y }); }, lineTo(x, y) { this.path.push({ kind: 'line', x, y }); },
      quadraticCurveTo(cx, cy, x, y) { this.path.push({ kind: 'quadratic', cx, cy, x, y }); },
      ellipse(x, y, rx, ry) { this.path.push({ kind: 'ellipse', x, y, rx, ry }); },
      arc(x, y, radius) { this.path.push({ kind: 'arc', x, y, radius }); },
      setLineDash(values) { this.dash = [...values]; },
      stroke() { this.commands.push({ kind: 'stroke', style: this.strokeStyle, width: this.lineWidth, dash: this.dash || [], path: [...this.path] }); },
      fill() { this.commands.push({ kind: 'fill', style: this.fillStyle, path: [...this.path] }); },
      fillText(text, x, y) { this.commands.push({ kind: 'text', text, x, y, font: this.font }); },
      fillRect(x, y, width, height) { this.commands.push({ kind: 'rect', x, y, width, height, style: this.fillStyle }); }
    };
    const context = new Proxy(target, { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
    contexts.set(this, context); return context;
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
async function mountModel(extra = {}, width = 366, height = 340) {
  canvas = document.createElement('canvas'); document.body.appendChild(canvas);
  Object.defineProperty(canvas, 'clientWidth', { value: width }); Object.defineProperty(canvas, 'clientHeight', { value: height });
  let model = { mode: 'convergent', mountainHeight: 7000, rift: 180, offset: 192, quakes: [], rotX: 0, rotY: 0, scale: 1, cut: 0, showScale: true, surfaceView: false, sig: String(++signature), ...extra };
  gl.submit(model); gl.mount(canvas); await Promise.resolve(); await Promise.resolve(); frame();
  expect(gl.debug().state).toBe('ready');
  return patch => { model = { ...model, ...patch, sig: String(++signature) }; gl.submit(model); frame(); };
}
function part(id) { return scene.getObjectByName('arc-process-' + id); }
function descendants(object, predicate) { const list = []; object.traverse(child => { if (predicate(child)) list.push(child); }); return list; }
function endpoints(mesh) {
  return [-0.5, 0.5].map(y => new THREE.Vector3(0, y, 0).applyMatrix4(mesh.matrixWorld).toArray());
}
async function mountUI(props = {}) {
  const host = document.createElement('div'); document.body.appendChild(host); mounted.push(host);
  ReactDOM.render(React.createElement(window.AlloTectonicsInteractive, { t: (_, fallback) => fallback, ...props }), host);
  const section = host.querySelector('[data-tect-section]');
  section.getBoundingClientRect = () => ({ top: 0, bottom: 300, left: 0, right: 540, width: 540, height: 300 });
  await new Promise(resolve => setTimeout(resolve, 0)); frame();
  return host;
}

describe('Arc process annotation follows a real exposed cut face', () => {
  it('starts hidden and keeps an unchanged idle model settled', async () => {
    await mountModel(); expect(gl.debug().arcProcess).toEqual({ step: null, visible: false, reason: 'none', cut: null });
    expect(scene.getObjectByName('arc-process-annotation').visible).toBe(false);
    const before = renders; frame(100); expect(renders).toBe(before);
  });
  it('places every partial-melt patch vertex in mantle above the slab and below Plate B', async () => {
    await mountModel({ arcProcessStep: 'melt' }); const patch = descendants(part('melt'), child => child.userData.feature === 'partial-mantle-melt')[0];
    const positions = patch.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const p = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(patch.matrixWorld);
      expect(p.y, 'patch is below the150km upper-plate base').toBeLessThan(-15);
      expect(p.x + p.y, 'patch is above the45-degree descending slab').toBeGreaterThan(0);
      expect(p.z).toBeCloseTo(-0.02);
    }
    expect(patch.material.opacity).toBeLessThan(0.3); expect(descendants(part('melt'), child => child.geometry?.type === 'CircleGeometry')).toHaveLength(3);
  });
  it('distinguishes dashed water, a small speckled patch and a narrow solid magma route', async () => {
    const update = await mountModel({ arcProcessStep: 'water' });
    const water = descendants(part('water'), child => child.userData.arcPipe && !child.userData.arcHalo);
    expect(water).toHaveLength(3); expect(water.every(pipe => pipe.material.color.getHex() === 0x7dd3fc)).toBe(true);
    const ys = water.flatMap(mesh => endpoints(mesh).map(point => point[1])).sort((a, b) => a - b);
    expect(ys[2] - ys[1]).toBeGreaterThan(0.1); expect(ys[4] - ys[3]).toBeGreaterThan(0.1);
    update({ arcProcessStep: 'magma' }); const magma = descendants(part('magma'), child => child.userData.arcPipe && !child.userData.arcHalo);
    expect(magma).toHaveLength(3); expect(magma.every(pipe => pipe.material.color.getHex() === 0xfb923c)).toBe(true);
    expect(endpoints(magma[0])[0].slice(0, 2)).toEqual([20, -17]);
    expect(endpoints(magma[2])[1][0]).toBeCloseTo(10); expect(endpoints(magma[2])[1][1]).toBeCloseTo(3.6);
    expect(part('water').visible).toBe(false); expect(part('magma').visible).toBe(true);
  });
  it.each([-24.8, -14, 0, 11, 24.8])('retains the annotation and clips it just inside an arbitrary cut at%s', async cut => {
    await mountModel({ arcProcessStep: 'water', cut });
    expect(gl.debug().arcProcess.visible).toBe(true); expect(gl.debug().visibleCutFaces).toBeGreaterThan(0);
    for (const mesh of descendants(part('water'), child => child.userData.arcPipe)) {
      expect(mesh.getWorldPosition(new THREE.Vector3()).z).toBeCloseTo(cut - 0.02);
      expect(mesh.material.clippingPlanes[0].constant).toBe(cut); expect(mesh.material.depthTest).toBe(false);
    }
  });
  it('hides the trace without pretending uncut, discarded or rear rock is a visible cut face', async () => {
    const update = await mountModel({ arcProcessStep: 'magma' });
    for (const patch of [{ cut: null }, { cut: 25 }, { cut: -25 }, { cut: 0, rotY: 130 }, { rotY: 0, rotX: -88 }]) {
      update(patch); expect(gl.debug().arcProcess.visible).toBe(false);
      expect(scene.getObjectByName('arc-process-annotation').visible).toBe(false);
      expect(descendants(scene, child => child.userData.feature === 'arc-process-number')).toHaveLength(0);
    }
    update({ cut: 0, rotY: 0, rotX: 0 }); expect(gl.debug().arcProcess.visible).toBe(true);
  });
  it('preserves camera, arc position and rock while switching steps and clears through boundary changes', async () => {
    const update = await mountModel({ arcProcessStep: 'water' }), group = scene.getObjectByName('arc-process-annotation'), builds = gl.debug().geometryBuilds;
    const slab = descendants(scene, child => child.isMesh && child.rotation.z < -0.5)[0], geometry = slab.geometry, oldCamera = gl.debug().camera;
    const arcPositions = descendants(scene, child => child.userData.feature === 'volcanic-arc-edifice').map(child => child.position.toArray());
    for (const arcProcessStep of ['melt', 'magma', null, 'water']) {
      update({ arcProcessStep }); expect(gl.debug().geometryBuilds).toBe(builds); expect(scene.getObjectByName('arc-process-annotation')).toBe(group);
      expect(slab.geometry).toBe(geometry); expect(gl.debug().camera).toEqual(oldCamera);
      expect(descendants(scene, child => child.userData.feature === 'volcanic-arc-edifice').map(child => child.position.toArray())).toEqual(arcPositions);
    }
    update({ mode: 'divergent' }); expect(gl.debug().arcProcess.step).toBeNull(); expect(group.visible).toBe(false);
  });
  it('keeps numbered labels legible and separated from existing labels after camera turns', async () => {
    const update = await mountModel({ arcProcessStep: 'magma' }, 300, 300);
    for (const [rotX, rotY] of [[0, 0], [-22, -38], [-37, -58], [-50, 50]]) {
      update({ rotX, rotY }); const labels = gl.debug().labelRects, number = labels.find(label => label.text === '3');
      expect(number).toBeTruthy(); expect(number.height).toBeGreaterThanOrEqual(20);
      expect(number.x).toBeGreaterThanOrEqual(0); expect(number.x + number.width).toBeLessThanOrEqual(300);
      for (const other of labels.filter(label => label !== number)) {
        const x = Math.min(number.x + number.width, other.x + other.width) - Math.max(number.x, other.x);
        const y = Math.min(number.y + number.height, other.y + other.height) - Math.max(number.y, other.y);
        expect(x > 0.01 && y > 0.01, 'number overlaps ' + other.text).toBe(false);
      }
    }
  });
});

describe('Arc process controls explain distinct processes without changing an investigation', () => {
  it('opens with no selected trace and connects every keyboard button to its own explanation', async () => {
    const host = await mountUI(), panel = host.querySelector('[data-pt-arc-process-panel]');
    expect(panel.open).toBe(false); expect(panel.querySelector('[data-pt-arc-step="none"]').getAttribute('aria-pressed')).toBe('true');
    for (const id of ['water', 'melt', 'magma']) {
      const button = panel.querySelector('[data-pt-arc-step="' + id + '"]'); expect(button.type).toBe('button');
      expect(host.querySelector('#' + button.getAttribute('aria-describedby')).hidden).toBe(true);
      expect(button.style.minHeight).toBe('44px'); expect(button.getAttribute('aria-controls')).toBe('pt-boundary-section');
    }
  });
  it('keeps paused time, rate, feature and saved data stable through process selection and idle frames', async () => {
    const onRecordSlab = vi.fn(), onRecordDepths = vi.fn(), onRecordBoundaryInquiry = vi.fn(), awardXP = vi.fn(), beep = vi.fn(), announceToSR = vi.fn();
    const host = await mountUI({ onRecordSlab, onRecordDepths, onRecordBoundaryInquiry, awardXP, beep, announceToSR });
    host.querySelector('[data-pt-boundary-feature-select="slab"]').click();
    const time = host.querySelector('[data-pt-model-reading="time"]').textContent, rate = host.querySelector('input[aria-label="Plate movement rate in centimeters per year"]').value;
    for (const id of ['water', 'melt', 'magma', 'none']) host.querySelector('[data-pt-arc-step="' + id + '"]').click();
    frame(300);
    expect(host.querySelector('[data-pt-model-reading="time"]').textContent).toBe(time); expect(host.querySelector('input[aria-label="Plate movement rate in centimeters per year"]').value).toBe(rate);
    expect(host.querySelector('[data-pt-boundary-feature-select="slab"]').getAttribute('aria-pressed')).toBe('true');
    for (const callback of [onRecordSlab, onRecordDepths, onRecordBoundaryInquiry, awardXP, beep, announceToSR]) expect(callback).not.toHaveBeenCalled();
  });
  it('puts the 2D magma origin and whole melt patch outside the actual drawn slab, keeping the arc fixed', async () => {
    const host = await mountUI(), section = host.querySelector('[data-tect-section]'), context = contexts.get(section);
    host.querySelector('[data-pt-arc-step="melt"]').click(); context.commands.length = 0; frame();
    const slab = context.commands.find(command => command.kind === 'fill' && command.style?.stops?.some(stop => stop.color === '#0f2138'));
    expect(slab).toBeTruthy(); const [a, b, c, d] = slab.path, topAt = y => a.x + (y - a.y) / (b.y - a.y) * (b.x - a.x);
    const inlandAt = y => d.x + (y - d.y) / (c.y - d.y) * (c.x - d.x);
    const patch = context.commands.find(command => command.kind === 'fill' && command.path[0]?.kind === 'ellipse').path[0];
    for (let i = 0; i < 36; i++) {
      const theta = i / 36 * Math.PI * 2, x = patch.x + Math.cos(theta) * patch.rx, y = patch.y + Math.sin(theta) * patch.ry;
      expect(x - inlandAt(y)).toBeGreaterThan(0); expect(y).toBeGreaterThan(174);
    }
    const path = context.commands.find(command => command.kind === 'stroke' && command.style === '#fb923c' && command.path.some(point => point.kind === 'quadratic'));
    expect(path.path[0].x).toBe(patch.x); expect(path.path[0].y).toBe(patch.y);
    const oldArc = Math.min(480, topAt(patch.y) + 28.08 * 0.5 + 26);
    expect(path.path[1].x).toBeCloseTo(oldArc); expect(path.path[1].y).toBe(118);
  });
  it('draws real dashed water and numbered steps in2D, keeps partial melt separate from magma', async () => {
    const host = await mountUI(), context = contexts.get(host.querySelector('[data-tect-section]'));
    for (const [id, number] of [['water', '1'], ['melt', '2'], ['magma', '3']]) {
      host.querySelector('[data-pt-arc-step="' + id + '"]').click(); context.commands.length = 0; frame();
      expect(context.commands.some(command => command.kind === 'text' && command.text === number)).toBe(true);
      if (id === 'water') expect(context.commands.some(command => command.kind === 'stroke' && command.style === '#7dd3fc' && command.dash.length)).toBe(true);
      if (id === 'melt') expect(host.querySelector('[data-pt-arc-process-explanation]').textContent).toContain('remain mostly solid');
      if (id === 'magma') expect(host.querySelector('[data-pt-arc-process-explanation]').textContent).toContain('different parts of the process');
    }
  });
  it('keeps every 2D process number at least 14 CSS pixels even in a scaled host', async () => {
    const host = await mountUI(), section = host.querySelector('[data-tect-section]'), context = contexts.get(section);
    Object.defineProperty(section, 'clientWidth', { configurable: true, value: 280 });
    for (const [id, number] of [['water', '1'], ['melt', '2'], ['magma', '3']]) {
      host.querySelector('[data-pt-arc-step="' + id + '"]').click(); context.commands.length = 0; frame();
      const badge = context.commands.find(command => command.kind === 'text' && command.text === number);
      expect(badge).toBeTruthy();
      expect(parseFloat(badge.font.match(/([\d.]+)px/)[1]) * 280 / 540).toBeGreaterThanOrEqual(14);
    }
  });
  it('puts the number in clear mantle space outside the slab and below the plate identity', async () => {
    const host = await mountUI(), context = contexts.get(host.querySelector('[data-tect-section]'));
    for (const [id, number] of [['water', '1'], ['melt', '2'], ['magma', '3']]) {
      host.querySelector('[data-pt-arc-step="' + id + '"]').click(); context.commands.length = 0; frame();
      const slab = context.commands.find(command => command.kind === 'fill' && command.style?.stops?.some(stop => stop.color === '#0f2138'));
      const [a, b, c, d] = slab.path, inlandAt = y => d.x + (y - d.y) / (c.y - d.y) * (c.x - d.x);
      const badge = context.commands.find(command => command.kind === 'text' && command.text === number);
      const chip = context.commands.filter(command => command.kind === 'rect' && command.style === 'rgba(12,10,9,0.94)').pop();
      expect(chip.y).toBeGreaterThan(174);
      expect(chip.x).toBeGreaterThan(inlandAt(chip.y + chip.height));
      expect(badge.y).toBeGreaterThan(190);
    }
  });
  it('reveals the 3D canvas after a sideways section pan while keeping the experiment in place', async () => {
    const host = await mountUI(), frameNode = host.querySelector('.pt-tect-frame'); frameNode.scrollLeft = 210;
    const time = host.querySelector('[data-pt-model-reading="time"]').textContent;
    const rate = host.querySelector('input[aria-label="Plate movement rate in centimeters per year"]').value;
    host.querySelector('[data-tect-view="2d"]').click(); expect(frameNode.scrollLeft).toBe(210);
    host.querySelector('[data-tect-view="3d"]').click(); expect(frameNode.scrollLeft).toBe(0);
    expect(host.querySelector('[data-pt-model-reading="time"]').textContent).toBe(time);
    expect(host.querySelector('input[aria-label="Plate movement rate in centimeters per year"]').value).toBe(rate);
  });
  it('resets the optional trace after leaving convergence and after closing its disclosure', async () => {
    const host = await mountUI(), panel = host.querySelector('[data-pt-arc-process-panel]'); panel.open = true;
    host.querySelector('[data-pt-arc-step="magma"]').click(); panel.open = false; panel.dispatchEvent(new Event('toggle')); await Promise.resolve();
    expect(host.querySelector('[data-pt-arc-step="none"]').getAttribute('aria-pressed')).toBe('true');
    host.querySelector('[data-pt-arc-step="water"]').click(); host.querySelector('[data-tect-mode="transform"]').click(); await Promise.resolve();
    expect(host.querySelector('[data-pt-arc-process-panel]')).toBeNull(); host.querySelector('[data-tect-mode="convergent"]').click(); await Promise.resolve();
    expect(host.querySelector('[data-pt-arc-step="none"]').getAttribute('aria-pressed')).toBe('true');
  });
});


describe('Nearby arc reveal actions expose the chosen process without changing evidence', () => {
  const saved = { version: 1, angle: 42, points: Array.from({ length: 8 }, (_, index) => ({ x: 100 + index * 45, z: 100 + index * 40, m: 4 })) };
  function effects() { return Object.fromEntries(['onRecordSlab', 'onRecordDepths', 'onRecordBoundaryInquiry', 'onRecordBoundaryDraft', 'awardXP', 'beep', 'announceToSR'].map(key => [key, vi.fn()])); }
  async function ready(host) {
    const log = host.querySelector('[data-pt-quake-log]'); log.open = true; log.dispatchEvent(new Event('toggle', { bubbles: true }));
    host.querySelector('[data-tect-view="3d"]').click(); const block = host.querySelector('[data-tect-gl]');
    Object.defineProperty(block, 'clientWidth', { value: 366 }); Object.defineProperty(block, 'clientHeight', { value: 300 });
    await Promise.resolve(); await Promise.resolve(); frame(); expect(gl.debug().state).toBe('ready');
  }
  function state(host) { return {
    time: host.querySelector('[data-pt-model-reading="time"]').textContent, movement: host.querySelector('[data-pt-model-reading="movement"]').textContent,
    rate: host.querySelector('input[aria-label="Plate movement rate in centimeters per year"]').value,
    paused: !host.querySelector('[data-pt-model-step]').disabled, checked: host.querySelector('[data-pt-quake-fit]')?.textContent,
    feature: host.querySelector('[data-pt-boundary-feature-select][aria-pressed="true"]').dataset.ptBoundaryFeatureSelect,
    process: host.querySelector('[data-pt-arc-step][aria-pressed="true"]').dataset.ptArcStep
  }; }
  function clear(callbacks) { for (const callback of Object.values(callbacks)) callback.mockClear(); }
  function quiet(callbacks) { for (const callback of Object.values(callbacks)) expect(callback).not.toHaveBeenCalled(); }

  it('offers no view action for 2D, no process or an already exposed cut face', async () => {
    const host = await mountUI(); host.querySelector('[data-pt-arc-step="water"]').click(); expect(host.querySelector('[data-pt-arc-reveal]')).toBeNull();
    await ready(host); expect(host.querySelector('[data-pt-arc-reveal="section"]')).not.toBeNull();
    host.querySelector('[data-pt-arc-step="none"]').click(); expect(host.querySelector('[data-pt-arc-reveal]')).toBeNull();
    host.querySelector('[data-tect-preset="section"]').click(); host.querySelector('[data-pt-arc-step="melt"]').click(); frame();
    expect(gl.debug().arcProcess.visible).toBe(true); expect(host.querySelector('[data-pt-arc-reveal]')).toBeNull();
  });

  it.each(['water', 'melt', 'magma'])('reveals %s from an overhead view and preserves focus, scale preference and checked sample', async id => {
    const callbacks = effects(), host = await mountUI({ ...callbacks, savedSlab: saved }); await ready(host);
    const panel = host.querySelector('[data-pt-arc-process-panel]'); panel.open = true;
    host.querySelector('[data-pt-boundary-feature-select="slab"]').click(); host.querySelector('[data-tect-scale-toggle]').click();
    host.querySelector('[data-tect-preset="surface"]').click(); host.querySelector('[data-pt-arc-step="' + id + '"]').click(); frame(); clear(callbacks);
    const before = state(host), builds = gl.debug().geometryBuilds, action = host.querySelector('[data-pt-arc-reveal="section"]');
    expect(before.checked).toBeTruthy();
    expect(action.type).toBe('button'); expect(action.style.minHeight).toBe('44px'); expect(action.getAttribute('aria-describedby')).toBe('pt-arc-process-status');
    const cameraBefore = gl.debug().camera; frame(1200); expect(gl.debug().camera).toEqual(cameraBefore); expect(gl.debug().arcProcess.visible).toBe(false); quiet(callbacks);
    action.focus(); action.click(); await new Promise(resolve => setTimeout(resolve, 0)); frame();
    expect(host.querySelector('[data-tect-gl]').dataset.tectView).toBe('0,0,1.00'); expect(gl.debug().clipConstant).toBe(0);
    expect(gl.debug().arcProcess.step).toBe(id); expect(gl.debug().arcProcess.visible).toBe(true); expect(gl.debug().arcProcess.cut).toBe(0);
    expect(gl.debug().inspection.id).toBe('slab'); expect(host.querySelector('[data-tect-scale-toggle]').getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelector('[data-pt-arc-reveal]')).toBeNull(); expect(panel.contains(document.activeElement)).toBe(true);
    expect(state(host)).toEqual(before); expect(gl.debug().geometryBuilds).toBe(builds); quiet(callbacks);
    const rendersBefore = renders; frame(1200); expect(renders).toBe(rendersBefore); expect(state(host)).toEqual(before); quiet(callbacks);
  });

  it('recovers a selected trace from a rear cut face without automatic camera movement', async () => {
    const callbacks = effects(), host = await mountUI(callbacks); await ready(host);
    host.querySelector('[data-tect-preset="section"]').click(); host.querySelector('[data-pt-arc-step="water"]').click();
    const block = host.querySelector('[data-tect-gl]');
    for (let index = 0; index < 6; index++) block.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }));
    frame(); clear(callbacks); const before = state(host), viewBefore = block.dataset.tectView;
    expect(gl.debug().arcProcess.visible).toBe(false); expect(host.querySelector('[data-pt-arc-reveal="section"]')).not.toBeNull();
    frame(1200); expect(block.dataset.tectView).toBe(viewBefore); expect(state(host)).toEqual(before); quiet(callbacks);
    host.querySelector('[data-pt-arc-reveal="section"]').click(); frame(); expect(block.dataset.tectView).toBe('0,0,1.00'); expect(gl.debug().arcProcess.visible).toBe(true);
    expect(state(host)).toEqual(before); quiet(callbacks);
  });
});

describe('Whole arc process connects three distinct annotations in one optional view', () => {
  const ids = ['water', 'melt', 'magma'];
  const saved = { version: 1, angle: 42, points: Array.from({ length: 8 }, (_, index) => ({ x: 100 + index * 45, z: 100 + index * 40, m: 4 })) };
  function effects() { return Object.fromEntries(['onRecordSlab', 'onRecordDepths', 'onRecordBoundaryInquiry', 'onRecordBoundaryDraft', 'awardXP', 'beep', 'announceToSR'].map(key => [key, vi.fn()])); }
  function clear(callbacks) { for (const callback of Object.values(callbacks)) callback.mockClear(); }
  function quiet(callbacks) { for (const callback of Object.values(callbacks)) expect(callback).not.toHaveBeenCalled(); }
  function choose(host, id) { const button = host.querySelector('[data-pt-arc-step="' + id + '"]'); expect(button).not.toBeNull(); button.click(); return button; }
  function state(host) { return {
    time: host.querySelector('[data-pt-model-reading="time"]').textContent,
    movement: host.querySelector('[data-pt-model-reading="movement"]').textContent,
    rate: host.querySelector('input[aria-label="Plate movement rate in centimeters per year"]').value,
    paused: !host.querySelector('[data-pt-model-step]').disabled,
    checked: host.querySelector('[data-pt-quake-fit]')?.textContent,
    feature: host.querySelector('[data-pt-boundary-feature-select][aria-pressed="true"]').dataset.ptBoundaryFeatureSelect
  }; }
  async function ready(host) {
    host.querySelector('[data-tect-view="3d"]').click(); const block = host.querySelector('[data-tect-gl]');
    Object.defineProperty(block, 'clientWidth', { value: 366 }); Object.defineProperty(block, 'clientHeight', { value: 300 });
    await Promise.resolve(); await Promise.resolve(); frame(); expect(gl.debug().state).toBe('ready');
    return block;
  }
  function numberLabels() { return gl.debug().labelRects.filter(label => ['1', '2', '3'].includes(label.text)); }
  function expectSeparate(rects) {
    for (let a = 0; a < rects.length; a++) for (let b = a + 1; b < rects.length; b++) {
      const x = Math.min(rects[a].x + rects[a].width, rects[b].x + rects[b].width) - Math.max(rects[a].x, rects[b].x);
      const y = Math.min(rects[a].y + rects[a].height, rects[b].y + rects[b].height) - Math.max(rects[a].y, rects[b].y);
      expect(x > 0.01 && y > 0.01, 'numbered labels overlap').toBe(false);
    }
  }

  it('shows all three retained process geometries together, then isolates each single step without changing the rock or camera', async () => {
    const update = await mountModel({ arcProcessStep: 'all' }), group = scene.getObjectByName('arc-process-annotation');
    const beforeCamera = gl.debug().camera, builds = gl.debug().geometryBuilds;
    const retained = ids.map(id => ({ id, object: part(id), meshes: descendants(part(id), object => !!object.geometry).map(object => ({ object, geometry: object.geometry })) }));
    const rock = descendants(scene, object => object.isMesh && object.rotation.z < -0.5)[0], rockGeometry = rock.geometry;
    expect(gl.debug().arcProcess).toEqual({ step: 'all', visible: true, reason: 'exposed', cut: 0 });
    for (const id of ids) expect(part(id).visible).toBe(true);
    expect(numberLabels().map(label => label.text).sort()).toEqual(['1', '2', '3']);
    for (const step of ['water', 'all', 'melt', 'all', 'magma', null, 'all']) {
      update({ arcProcessStep: step });
      expect(scene.getObjectByName('arc-process-annotation')).toBe(group);
      expect(group.visible).toBe(!!step); expect(gl.debug().arcProcess.step).toBe(step);
      for (const item of retained) {
        expect(part(item.id)).toBe(item.object); expect(item.object.visible).toBe(step === 'all' || step === item.id);
        for (const mesh of item.meshes) expect(mesh.object.geometry).toBe(mesh.geometry);
      }
      expect(numberLabels().map(label => label.text).sort()).toEqual(step === 'all' ? ['1', '2', '3'] : step ? [String(ids.indexOf(step) + 1)] : []);
      expect(rock.geometry).toBe(rockGeometry); expect(gl.debug().geometryBuilds).toBe(builds); expect(gl.debug().camera).toEqual(beforeCamera);
    }
    const beforeRenders = renders; frame(80); expect(renders).toBe(beforeRenders);
  });

  it('clips all three traces to an exposed slice and hides the whole process on covered, discarded, rear and non-convergent faces', async () => {
    const update = await mountModel({ arcProcessStep: 'all' });
    for (const cut of [-14, 0, 11]) {
      update({ cut }); expect(gl.debug().arcProcess.visible).toBe(true);
      for (const id of ids) {
        expect(part(id).visible).toBe(true);
        for (const mesh of descendants(part(id), child => child.userData.arcPipe)) {
          expect(mesh.getWorldPosition(new THREE.Vector3()).z).toBeCloseTo(cut - 0.02);
          expect(mesh.material.clippingPlanes[0].constant).toBe(cut);
        }
      }
      expect(numberLabels()).toHaveLength(3);
    }
    for (const patch of [{ cut: null }, { cut: 25 }, { cut: -25 }, { cut: 0, rotY: 130 }, { rotY: 0, rotX: -88 }]) {
      update(patch); expect(gl.debug().arcProcess.step).toBe('all'); expect(gl.debug().arcProcess.visible).toBe(false);
      expect(scene.getObjectByName('arc-process-annotation').visible).toBe(false);
      for (const id of ids) expect(part(id).visible).toBe(false);
      expect(numberLabels()).toHaveLength(0);
    }
    update({ cut: 0, rotX: 0, rotY: 0 }); expect(gl.debug().arcProcess.visible).toBe(true);
    for (const mode of ['divergent', 'transform']) {
      update({ mode }); expect(gl.debug().arcProcess.step).toBeNull(); expect(gl.debug().arcProcess.visible).toBe(false); expect(numberLabels()).toHaveLength(0);
    }
  });

  it('keeps all three 3D numbers readable and separated as the exposed cut face turns', async () => {
    const update = await mountModel({ arcProcessStep: 'all' }, 300, 300);
    const front = numberLabels().sort((a, b) => Number(a.text) - Number(b.text));
    expect(front).toHaveLength(3); expect(front[0].y).toBeGreaterThan(front[1].y); expect(front[1].y).toBeGreaterThan(front[2].y);
    for (const [rotX, rotY] of [[0, 0], [-22, -38], [-37, -58], [-50, 50]]) {
      update({ rotX, rotY }); const allLabels = gl.debug().labelRects, numbers = numberLabels();
      expect(numbers.map(label => label.text).sort()).toEqual(['1', '2', '3']); expectSeparate(numbers);
      for (const number of numbers) {
        expect(number.height).toBeGreaterThanOrEqual(20); expect(number.x).toBeGreaterThanOrEqual(0); expect(number.y).toBeGreaterThanOrEqual(0);
        expect(number.x + number.width).toBeLessThanOrEqual(300); expect(number.y + number.height).toBeLessThanOrEqual(300);
        for (const other of allLabels.filter(label => label !== number)) expectSeparate([number, other]);
      }
    }
  });

  it('offers an explicit whole-process button and distinguishes each process with an accessible button and decorative visual key', async () => {
    const host = await mountUI(), panel = host.querySelector('[data-pt-arc-process-panel]');
    expect(panel.open).toBe(false); expect(panel.querySelector('[data-pt-arc-step="none"]').getAttribute('aria-pressed')).toBe('true');
    const all = panel.querySelector('[data-pt-arc-step="all"]'); expect(all).not.toBeNull(); expect(all.type).toBe('button');
    expect(all.textContent).toContain('Whole process'); expect(all.getAttribute('aria-pressed')).toBe('false'); expect(all.style.minHeight).toBe('44px');
    expect(all.getAttribute('aria-controls')).toBe('pt-boundary-section');
    for (const id of all.getAttribute('aria-describedby').split(' ')) expect(host.querySelector('#' + id)).not.toBeNull();
    expect([...panel.querySelectorAll('[data-pt-arc-step]')].map(button => button.dataset.ptArcStep)).toEqual(['none', 'all', ...ids]);
    const keys = panel.querySelectorAll('[data-pt-arc-key]'); expect(keys).toHaveLength(3);
    for (const id of ids) {
      const button = panel.querySelector('[data-pt-arc-step="' + id + '"]'), key = button.querySelector('[data-pt-arc-key="' + id + '"]');
      expect(key).not.toBeNull(); expect(key.tagName.toLowerCase()).toBe('svg'); expect(key.getAttribute('aria-hidden')).toBe('true'); expect(key.getAttribute('focusable')).toBe('false');
      expect(button.textContent).toContain(String(ids.indexOf(id) + 1));
    }
    const water = panel.querySelector('[data-pt-arc-key="water"]'), melt = panel.querySelector('[data-pt-arc-key="melt"]'), magma = panel.querySelector('[data-pt-arc-key="magma"]');
    expect(water.querySelector('[stroke-dasharray]')).not.toBeNull(); expect(melt.querySelectorAll('circle').length).toBeGreaterThanOrEqual(2);
    expect(magma.querySelector('path, line, polyline')).not.toBeNull(); expect(magma.querySelector('[stroke-dasharray]')).toBeNull();
    choose(host, 'all');
    expect(all.getAttribute('aria-pressed')).toBe('true'); expect(panel.querySelectorAll('[data-pt-arc-step][aria-pressed="true"]')).toHaveLength(1);
    const explanation = panel.querySelector('[data-pt-arc-process-explanation="all"]'); expect(explanation).not.toBeNull();
    expect(explanation.textContent.toLowerCase()).toMatch(/water/); expect(explanation.textContent.toLowerCase()).toMatch(/melt/); expect(explanation.textContent.toLowerCase()).toMatch(/magma/);
  });

  it('draws dashed water, speckled melt and solid magma together with three separate readable 2D numbers', async () => {
    const host = await mountUI(), section = host.querySelector('[data-tect-section]'), context = contexts.get(section);
    for (const width of [540, 280]) {
      Object.defineProperty(section, 'clientWidth', { configurable: true, value: width }); choose(host, 'all'); context.commands.length = 0; frame();
      const numbers = context.commands.filter(command => command.kind === 'text' && ['1', '2', '3'].includes(command.text));
      expect(numbers.map(command => command.text).sort()).toEqual(['1', '2', '3']);
      for (const number of numbers) expect(parseFloat(number.font.match(/([\d.]+)px/)[1]) * width / 540).toBeGreaterThanOrEqual(14);
      const chips = context.commands.filter(command => command.kind === 'rect' && command.style === 'rgba(12,10,9,0.94)');
      expect(chips).toHaveLength(3); expectSeparate(chips);
      expect(context.commands.some(command => command.kind === 'stroke' && command.style === '#7dd3fc' && command.dash.length)).toBe(true);
      expect(context.commands.some(command => command.kind === 'fill' && command.style === 'rgba(251,146,60,0.25)' && command.path.some(point => point.kind === 'ellipse'))).toBe(true);
      expect(context.commands.filter(command => command.kind === 'fill' && command.style === '#ffd0a8' && command.path.some(point => point.kind === 'arc' && point.radius === 1)).length).toBeGreaterThanOrEqual(3);
      expect(context.commands.some(command => command.kind === 'stroke' && command.style === '#ffd0a8' && command.dash.length === 0 && command.path.some(point => point.kind === 'quadratic'))).toBe(true);
    }
    choose(host, 'water'); context.commands.length = 0; frame();
    expect(context.commands.filter(command => command.kind === 'text' && ['1', '2', '3'].includes(command.text)).map(command => command.text)).toEqual(['1']);
    choose(host, 'none'); context.commands.length = 0; frame();
    expect(context.commands.filter(command => command.kind === 'text' && ['1', '2', '3'].includes(command.text))).toHaveLength(0);
  });

  it('keeps time, rate, highlighted feature and saved sample unchanged during quiet whole/single selection in both views', async () => {
    const callbacks = effects(), host = await mountUI({ ...callbacks, savedSlab: saved }), originalSaved = JSON.stringify(saved);
    const log = host.querySelector('[data-pt-quake-log]'); log.open = true; log.dispatchEvent(new Event('toggle', { bubbles: true }));
    host.querySelector('[data-pt-arc-process-panel]').open = true; host.querySelector('[data-pt-boundary-feature-select="slab"]').click();
    const before = state(host); expect(before.checked).toBeTruthy(); clear(callbacks);
    for (const id of ['all', 'melt', 'all', 'none']) { choose(host, id); frame(20); expect(state(host)).toEqual(before); }
    quiet(callbacks); expect(host.querySelector('[data-tect-view="2d"]').getAttribute('aria-pressed')).toBe('true');
    const block = await ready(host); host.querySelector('[data-tect-preset="section"]').click(); frame(); clear(callbacks);
    const cameraBefore = gl.debug().camera, viewBefore = block.dataset.tectView, cutBefore = gl.debug().clipConstant;
    for (const id of ['all', 'water', 'all', 'magma', 'all']) { choose(host, id); frame(20); expect(state(host)).toEqual(before); }
    expect(block.dataset.tectView).toBe(viewBefore); expect(gl.debug().camera).toEqual(cameraBefore); expect(gl.debug().clipConstant).toBe(cutBefore);
    expect(JSON.stringify(saved)).toBe(originalSaved); quiet(callbacks);
    const beforeRenders = renders; frame(80); expect(renders).toBe(beforeRenders); expect(state(host)).toEqual(before); quiet(callbacks);
  });

  it('keeps a whole-process selection behind an occluded view until the learner explicitly reveals the cut face', async () => {
    const callbacks = effects(), host = await mountUI(callbacks), block = await ready(host);
    const panel = host.querySelector('[data-pt-arc-process-panel]'); panel.open = true;
    host.querySelector('[data-tect-preset="surface"]').click(); frame(); clear(callbacks);
    const before = state(host), viewBefore = block.dataset.tectView, cameraBefore = gl.debug().camera;
    const all = host.querySelector('[data-pt-arc-step="all"]'); expect(all).not.toBeNull(); all.focus(); all.click(); frame(80);
    expect(document.activeElement).toBe(all); expect(block.dataset.tectView).toBe(viewBefore); expect(gl.debug().camera).toEqual(cameraBefore);
    expect(gl.debug().arcProcess.step).toBe('all'); expect(gl.debug().arcProcess.visible).toBe(false); expect(numberLabels()).toHaveLength(0);
    expect(state(host)).toEqual(before); quiet(callbacks);
    const reveal = host.querySelector('[data-pt-arc-reveal="section"]'); expect(reveal).not.toBeNull(); reveal.focus(); reveal.click();
    await new Promise(resolve => setTimeout(resolve, 0)); frame();
    expect(block.dataset.tectView).toBe('0,0,1.00'); expect(gl.debug().arcProcess).toEqual({ step: 'all', visible: true, reason: 'exposed', cut: 0 });
    for (const id of ids) expect(part(id).visible).toBe(true); expect(numberLabels()).toHaveLength(3);
    expect(document.activeElement).toBe(host.querySelector('#pt-arc-process-status')); expect(host.querySelector('[data-pt-arc-reveal]')).toBeNull();
    expect(host.querySelector('[data-pt-arc-step="all"]').getAttribute('aria-pressed')).toBe('true'); expect(state(host)).toEqual(before); quiet(callbacks);
  });

  it('clears the whole-process trace when its disclosure closes or the boundary changes', async () => {
    const host = await mountUI(), panel = host.querySelector('[data-pt-arc-process-panel]'); panel.open = true;
    choose(host, 'all'); panel.open = false; panel.dispatchEvent(new Event('toggle')); await Promise.resolve(); frame();
    expect(host.querySelector('[data-pt-arc-step="none"]').getAttribute('aria-pressed')).toBe('true'); expect(host.querySelector('[data-pt-arc-process-explanation="all"]')).toBeNull();
    panel.open = true; choose(host, 'all'); host.querySelector('[data-tect-mode="transform"]').click(); await Promise.resolve();
    expect(host.querySelector('[data-pt-arc-process-panel]')).toBeNull(); host.querySelector('[data-tect-mode="convergent"]').click(); await Promise.resolve();
    expect(host.querySelector('[data-pt-arc-step="none"]').getAttribute('aria-pressed')).toBe('true'); expect(host.querySelector('[data-pt-arc-step="all"]').getAttribute('aria-pressed')).toBe('false');
  });
});
