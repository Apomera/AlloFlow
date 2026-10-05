import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const originalMatchMedia = window.matchMedia;

// Keep a drawing log for both the visible and exported canvases. This checks
// the actual export action without requiring jsdom to implement rasterization.
function drawingContext() {
  const context = { drawings: [], path: [], fillStyle: '', strokeStyle: '' };
  for (const method of ['save', 'restore', 'clearRect', 'arc', 'ellipse', 'translate', 'rotate']) context[method] = vi.fn();
  context.beginPath = vi.fn(() => { context.path = []; });
  context.moveTo = context.lineTo = vi.fn((x, y) => context.path.push([x, y]));
  context.closePath = vi.fn();
  context.fillRect = vi.fn((x, y, width, height) => {
    if (x === 0 && y === 0 && width === 512 && height === 512) context.drawings = [];
    context.drawings.push({ rectangle: [x, y, width, height], fill: context.fillStyle });
  });
  context.fill = vi.fn(() => context.drawings.push({ points: context.path.map(p => [...p]), fill: context.fillStyle }));
  context.stroke = vi.fn(() => context.drawings.push({ points: context.path.map(p => [...p]), stroke: context.strokeStyle, width: context.lineWidth }));
  return context;
}

function svgPolygons(markup) {
  const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml');
  expect(parsed.querySelector('parsererror')).toBeNull();
  return [...parsed.querySelectorAll('polygon')].map(node => {
    const points = node.getAttribute('points').split(' ').map(pair => pair.split(',').map(Number));
    return { fill: node.getAttribute('fill'), points, center: points.reduce((sum, p) => [sum[0] + p[0] / points.length, sum[1] + p[1] / points.length], [0, 0]) };
  });
}

describe('Art Studio editable illusion patterns', () => {
  let host, root, config, latest, editSaved, frames, contexts;

  beforeEach(() => {
    resetStemLab();
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: false })) });
    contexts = new WeakMap();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      if (!contexts.has(this)) contexts.set(this, drawingContext());
      return contexts.get(this);
    });
    frames = new Map(); let frameId = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++frameId, callback); return frameId; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks();
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: originalMatchMedia });
  });

  async function mount(initial = {}) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ artStudio: { tab: 'opArt', studioStarted: true, studioHome: false, ...initial } });
      latest = toolData;
      editSaved = values => setToolData(previous => ({ ...previous, artStudio: { ...previous.artStudio, ...values } }));
      return config.render(makeCtx({ toolData, setToolData, activeProfileId: 'pattern-learner' }));
    }
    await act(async () => root.render(React.createElement(Harness)));
  }
  const canvas = () => host.querySelector('#opArtCanvas');
  const snapshot = () => canvas()._captureArtStudioState();
  async function click(selector) { const button = host.querySelector(selector); expect(button).not.toBeNull(); await act(async () => button.click()); }
  async function change(key, value) {
    const input = host.querySelector('#artstudio-' + key); expect(input).not.toBeNull();
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, String(value));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  function centerSwatches(markup) { return svgPolygons(markup).filter(p => {
    const width = Math.max(...p.points.map(point => point[0])) - Math.min(...p.points.map(point => point[0]));
    const height = Math.max(...p.points.map(point => point[1])) - Math.min(...p.points.map(point => point[1]));
    return Math.abs(width - height) < 0.001 && Math.abs(p.center[1] - 256) < 0.001 && (Math.abs(p.center[0] - 128) < 0.001 || Math.abs(p.center[0] - 384) < 0.001);
  }); }

  it.each(['cafeWall', 'colorContrast'])('keeps %s static even when an imported state requests playback', async style => {
    await mount({ opStyle: style, opPaused: false, opPhase: 83 });
    expect(snapshot()).toMatchObject({ opStyle: style, opPaused: true, opPhase: 83 });
    expect(frames.size).toBe(0);
    expect(host.querySelector('#artstudio-opSpeed')).toBeNull();
    expect(host.querySelector('#artstudio-opPhase')).toBeNull();
    expect(host.querySelector('#artstudio-op-motion-status').textContent).toContain('still pattern');
    expect(canvas().getAttribute('aria-label')).toContain('Still');
    const svg = canvas()._opSVG();
    await act(async () => editSaved({ opPhase: 231, opPaused: false }));
    expect(canvas()._opSVG()).toBe(svg);
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(frames.size).toBe(0);
  });

  it.each([['cafeWall', 'Café wall'], ['colorContrast', 'Color context']])('stops a running pattern when selecting %s', async (style, label) => {
    await mount({ opStyle: 'concentric', opPaused: false });
    expect(frames.size).toBe(1);
    const obsoleteCallback = [...frames.values()][0];
    const button = [...host.querySelectorAll('[aria-labelledby="artstudio-op-style-label"] button')].find(node => node.textContent.includes(label));
    await act(async () => button.click());
    expect(snapshot()).toMatchObject({ opStyle: style, opPaused: true });
    expect(frames.size).toBe(0);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    const svg = canvas()._opSVG();
    await act(async () => obsoleteCallback(1000));
    expect(canvas()._opSVG()).toBe(svg);
    expect(frames.size).toBe(0);
  });

  it('edits mortar, offset and guides through associated cafe controls', async () => {
    await mount({ opStyle: 'cafeWall', opColorMode: 'mono', opDensity: 8 });
    const before = canvas()._opSVG();
    for (const [key, value] of [['opCafeOffset', 27], ['opCafeMortar', 12], ['opCafeMortarLit', 35]]) {
      const control = host.querySelector('#artstudio-' + key);
      expect(host.querySelector('label[for="' + control.id + '"]')).not.toBeNull();
      await change(key, value);
    }
    expect(snapshot()).toMatchObject({ opCafeOffset: 27, opCafeMortar: 12, opCafeMortarLit: 35 });
    expect(canvas()._opSVG()).not.toBe(before);
    await click('#artstudio-op-reveal');
    expect(latest.artStudio.opReveal).toBe(true);
    expect(host.querySelector('#artstudio-op-reveal').getAttribute('aria-pressed')).toBe('true');
    expect(canvas().getAttribute('aria-label')).toContain('guides shown');
  });

  it('edits one shared center color while leaving the two surroundings independent', async () => {
    await mount({ opStyle: 'colorContrast', opColorMode: 'custom', opHueA: 210, opHueB: 30, opLitA: 25, opLitB: 75 });
    const surrounds = svgPolygons(canvas()._opSVG()).filter(p => p.points[0][1] === 0).map(p => p.fill);
    await change('opCenterHue', 142); await change('opCenterSat', 58); await change('opCenterLit', 43); await change('opCenterSize', 60);
    const squares = centerSwatches(canvas()._opSVG());
    expect(squares).toHaveLength(2);
    expect(new Set(squares.map(p => p.fill)).size).toBe(1);
    expect(svgPolygons(canvas()._opSVG()).filter(p => p.points[0][1] === 0).map(p => p.fill)).toEqual(surrounds);
    expect(snapshot()).toMatchObject({ opCenterHue: 142, opCenterSat: 58, opCenterLit: 43, opCenterSize: 60 });
    expect(host.querySelector('#artstudio-opDensity')).toBeNull();
    expect(canvas().getAttribute('aria-label')).toContain('saturation 58%');
  });

  it.each(['cafeWall', 'colorContrast'])('captures and restores all new fields for %s', async style => {
    const settings = { opStyle: style, opPaused: false, opCafeOffset: 38, opCafeMortar: 11, opCafeMortarLit: 66, opCenterHue: 267, opCenterSat: 47, opCenterLit: 39, opCenterSize: 55, opReveal: true, opPhase: 17, opDensity: 9, opRotation: 23 };
    await mount(settings);
    const saved = snapshot(), svg = canvas()._opSVG(), original = canvas();
    expect(saved).toMatchObject({ ...settings, opPaused: true });
    await act(async () => editSaved({ opCafeOffset: 0, opCafeMortar: 0, opCenterLit: 90, opCenterSize: 10, opReveal: false }));
    expect(canvas()._opSVG()).not.toBe(svg);
    await act(async () => editSaved({ ...saved, opRestoreToken: 'restored-pattern' }));
    expect(canvas()).not.toBe(original);
    expect(snapshot()).toEqual(saved);
    expect(canvas()._opSVG()).toBe(svg);
    expect(frames.size).toBe(0);
  });

  it.each([{ opCenterHue: 0, opCenterSat: 0, opCenterLit: 0, opCenterSize: 10 }, { opCenterHue: 145, opCenterSat: 100, opCenterLit: 100, opCenterSize: 70 }, { opCenterHue: 359, opCenterSat: 63, opCenterLit: 31, opCenterSize: 45 }])('reveals center equivalence without recoloring or moving either swatch: %o', async settings => {
    await mount({ opStyle: 'colorContrast', opPaused: true, ...settings });
    const before = centerSwatches(canvas()._opSVG());
    expect(before).toHaveLength(2); expect(before[0].fill).toBe(before[1].fill);
    await click('#artstudio-op-reveal');
    expect(centerSwatches(canvas()._opSVG())).toEqual(before);
    const joined = svgPolygons(canvas()._opSVG());
    expect(joined).toHaveLength(3);
    expect(joined.every(p => p.fill === before[0].fill)).toBe(true);
    expect(joined.some(p => p.points.some(([x]) => x === 128) && p.points.some(([x]) => x === 384))).toBe(true);
    await click('#artstudio-op-reveal');
    expect(centerSwatches(canvas()._opSVG())).toEqual(before);
  });

  it.each([0, 23, 90])('exports mutually parallel cafe guides at rotation %s', async rotation => {
    await mount({ opStyle: 'cafeWall', opPaused: true, opDensity: 8, opCafeOffset: 41, opCafeMortar: 9, opRotation: rotation });
    const tiles = svgPolygons(canvas()._opSVG());
    await click('#artstudio-op-reveal');
    expect(svgPolygons(canvas()._opSVG())).toEqual(tiles);
    const parsed = new DOMParser().parseFromString(canvas()._opSVG(), 'image/svg+xml');
    const guides = [...parsed.querySelectorAll('polyline')].map(line => line.getAttribute('points').split(' ').map(pair => pair.split(',').map(Number)));
    expect(guides.length).toBeGreaterThan(2);
    const vector = points => [points[1][0] - points[0][0], points[1][1] - points[0][1]], first = vector(guides[0]);
    for (const guide of guides.slice(1)) { const next = vector(guide); expect(Math.abs(first[0] * next[1] - first[1] * next[0])).toBeLessThan(0.02); }
  });

  it.each(['cafeWall', 'colorContrast'])('renders %s exports from the same composition as the visible canvas', async style => {
    await mount({ opStyle: style, opPaused: false, opReveal: true, opCafeOffset: 23, opCafeMortar: 12, opCenterHue: 90, opCenterSat: 57, opCenterLit: 44 });
    const current = canvas(), before = current._opSVG(), captured = snapshot();
    const exported = current._opExportCanvas();
    expect(exported.width).toBe(512); expect(exported.height).toBe(512);
    expect(contexts.get(exported).drawings).toEqual(contexts.get(current).drawings);
    expect(current._opSVG()).toBe(before); expect(snapshot()).toEqual(captured); expect(frames.size).toBe(0);
  });

  it('bounds malformed new saved values before drawing finite geometry', async () => {
    await mount({ opStyle: 'cafeWall', opCafeOffset: Infinity, opCafeMortar: 200, opCafeMortarLit: -5, opCenterHue: NaN, opCenterSat: -2, opCenterLit: 900, opCenterSize: Infinity, opReveal: 'yes' });
    expect(snapshot()).toMatchObject({ opCafeOffset: 50, opCafeMortar: 30, opCafeMortarLit: 0, opCenterHue: 35, opCenterSat: 0, opCenterLit: 100, opCenterSize: 40, opReveal: false });
    expect(canvas()._opSVG()).not.toMatch(/NaN|Infinity/);
  });
});
