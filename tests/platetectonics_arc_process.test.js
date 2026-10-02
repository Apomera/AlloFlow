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
