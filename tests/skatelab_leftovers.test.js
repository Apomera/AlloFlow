// Sports-labs pass, leftovers round (2026-11-23): Skate Lab. The free-body diagram's names for equal forces (mg and
// ΣF at the peak) no longer sit on each other; the timeline's phase names move to a second row instead of
// overlapping; the printable report rounds measured air and names the Runs and Missions tables once; the teacher
// lock boxes line up with their text; and the phone 3D gap rider is readable with arrow names kept off the body.
// Fail-first: SKATELAB_SRC=C:/tmp/sports_labs_1123/skatelab/start_r3.js.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
const SOURCE = process.env.SKATELAB_SRC || 'stem_lab/stem_tool_skatelab.js';

let toolConfig;
let physics;
let container;
let root;
let originals;
let texts;
let canvasRect;

const BASE = {
  mode: 'halfpipe', viewMode: '2d', vehicle: 'skate', gravity: 9.81, surfaceId: 'standard', windId: 'calm',
  riderMassKg: 62, rampDepthM: 2.4, dropHeightM: 2.4, pumpTimingId: 'bottom', landingCompressionM: 0.45,
  bodyPositionId: 'neutral', airDrag: true, pumps: 3, rotationTarget: 180, spinRate: 210, speedMph: 17,
  angleDeg: 35, gapFt: 15, pushForceN: 200, cameraAzimuth: 38, showVectors: true, showTrail: true, showEnergy: true,
};

function seed(overrides = {}) {
  return {
    skatelab: {
      ...BASE, estimateChallenge: true, _predictDefaultV: 2, estimateValue: '', experiments: [],
      stats: { runs: 0, successful: 0, withinTen: 0 }, ...overrides,
    },
  };
}

function makeCanvasContext() {
  const gradient = { addColorStop() {} };
  const base = {
    setTransform() {}, createLinearGradient: () => gradient, createRadialGradient: () => gradient, clearRect() {}, save() {}, restore() {},
    closePath() {}, fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, fill() {}, arc() {}, ellipse() {},
    rotate() {}, translate() {}, scale() {}, setLineDash() {}, strokeText() {}, stroke() {},
    fillText(text, x, y) { texts.push({ text: String(text), x, y }); },
    measureText: (text) => ({ width: String(text).length * 7 }),
  };
  return new Proxy(base, {
    get(target, property) { return property in target ? target[property] : undefined; },
    set(target, property, value) { target[property] = value; return true; },
  });
}

async function mount(initial, ctxOverrides = {}) {
  const state = { latest: null };
  function Host() {
    const [toolData, setToolData] = React.useState(initial);
    state.latest = toolData;
    return toolConfig.render(makeCtx({ toolData, setToolData, ...ctxOverrides }));
  }
  await act(async () => { root.render(React.createElement(Host)); });
  return state;
}

const click = (element) => act(async () => { element.click(); });
const launch = () => click(container.querySelector('[data-skatelab-launch="true"]'));
const chooseFirstAnswer = () => click(container.querySelector('[data-skatelab-predict] input[type="radio"]'));
const overlaps = (a, b, gap = 0) => a.left < b.right + gap && b.left < a.right + gap && a.top < b.bottom + gap && b.top < a.bottom + gap;
const nameRect = (spot, w) => ({ left: spot.x, right: spot.x + w, top: spot.y - 11, bottom: spot.y + 3 });

beforeEach(() => {
  resetStemLab();
  toolConfig = loadTool(SOURCE, 'skatelab');
  physics = window.__alloSkatePhysicsPure;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  texts = [];
  canvasRect = { width: 800, height: 450, top: 0, left: 0, right: 800, bottom: 450 };
  originals = {
    getContext: HTMLCanvasElement.prototype.getContext,
    rect: HTMLCanvasElement.prototype.getBoundingClientRect,
    scroll: window.HTMLElement.prototype.scrollIntoView,
    matchMedia: window.matchMedia,
    open: window.open,
  };
  HTMLCanvasElement.prototype.getContext = vi.fn(() => makeCanvasContext());
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({ ...canvasRect }));
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.matchMedia = vi.fn(() => ({ matches: true, media: '(prefers-reduced-motion: reduce)', addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  if (container) container.remove();
  HTMLCanvasElement.prototype.getContext = originals.getContext;
  HTMLCanvasElement.prototype.getBoundingClientRect = originals.rect;
  window.HTMLElement.prototype.scrollIntoView = originals.scroll;
  window.matchMedia = originals.matchMedia;
  window.open = originals.open;
  vi.restoreAllMocks();
});

describe('1: free-body diagram names for equal forces do not overlap', () => {
  it('two equal, parallel arrows get separate name spots', () => {
    const spots = physics.fbdLabelLayout([
      { id: 'weight', label: 'mg', dx: 0, dy: 60 },
      { id: 'net', label: 'ΣF', dx: 0, dy: 60 },
    ], 100);
    const half = (label) => Math.max(8, label.length * 5) + 3;
    const apartX = Math.abs(spots[0].x - spots[1].x) >= half('mg') + half('ΣF');
    const apartY = Math.abs(spots[0].y - spots[1].y) >= 14;
    expect(apartX || apartY).toBe(true);
    // A lone arrow keeps its usual spot past the tip.
    expect(physics.fbdLabelLayout([{ id: 'weight', label: 'mg', dx: 0, dy: 60 }], 100)[0]).toEqual({ x: 110, y: 176 });
  });

  it('in the panel, at the apex (in the air), mg and ΣF are written apart', async () => {
    await mount(seed());
    await chooseFirstAnswer();
    await launch();
    const apex = container.querySelector('.sk-phase-jumps button:nth-child(4)');
    expect(apex.textContent).toBe('apex');
    await click(apex);
    const labels = [...container.querySelectorAll('svg.sk-fbd text.sk-fbd-label')]
      .map((node) => ({ text: node.textContent, x: Number(node.getAttribute('x')), y: Number(node.getAttribute('y')) }));
    const mg = labels.find((label) => label.text === 'mg');
    const net = labels.find((label) => label.text === 'ΣF');
    expect(mg && net).toBeTruthy();
    expect(Math.abs(mg.x - net.x) >= 26 || Math.abs(mg.y - net.y) >= 14).toBe(true);
  });
});

describe('2: timeline phase names never overlap', () => {
  it('crowded names (lip, apex, re-entry, return) move to a second row; none overlap on a row', () => {
    const left = 0;
    const right = 580;
    const ticks = [{ x: 0, w: 35 }, { x: 80, w: 50 }, { x: 465, w: 17 }, { x: 497, w: 29 }, { x: 526, w: 56 }, { x: 580, w: 46 }];
    const spans = physics.phaseTickSpans(ticks, left, right);
    expect(spans[0]).toMatchObject({ left: 0, align: 'start' });
    expect(spans[5]).toMatchObject({ right: 580, align: 'end' });
    const rows = physics.phaseTickRows(spans, 6);
    for (const row of [0, 1]) {
      const onRow = spans.filter((span, index) => rows[index] === row);
      for (let i = 1; i < onRow.length; i++) expect(onRow[i].left).toBeGreaterThanOrEqual(onRow[i - 1].right + 6);
    }
    expect(rows).toContain(1);
    // Every name stays inside the track.
    spans.forEach((span) => { expect(span.left).toBeGreaterThanOrEqual(left); expect(span.right).toBeLessThanOrEqual(right); });
  });

  it('a name near the start that would run off the left end is pinned to its tick', () => {
    const spans = physics.phaseTickSpans([{ x: 0, w: 35 }, { x: 20, w: 66 }, { x: 580, w: 30 }], 0, 580);
    expect(spans[1]).toMatchObject({ left: 20, align: 'start' });
    expect(physics.phaseTickRows(spans, 6)).toEqual([0, 1, 0]);
  });

  it('spread-out names stay on one row', () => {
    const spans = physics.phaseTickSpans([{ x: 0, w: 35 }, { x: 150, w: 34 }, { x: 320, w: 30 }, { x: 580, w: 40 }], 0, 580);
    expect(physics.phaseTickRows(spans, 6)).toEqual([0, 0, 0, 0]);
  });
});

describe('3: printable report', () => {
  it('rounds measured air to 2 decimals and names the Runs and Missions tables once', async () => {
    const state = await mount(seed());
    await chooseFirstAnswer();
    await launch();
    const saved = state.latest.skatelab;
    const entry = saved.experiments[saved.experiments.length - 1];
    expect(Number.isFinite(entry.measured)).toBe(true);
    const html = physics.reportHtml(saved, {});
    expect(html).toContain('<td>' + entry.measured.toFixed(2) + '</td>');
    // No printed number in the runs table carries more than 2 decimals.
    const runsTable = html.slice(html.indexOf('id="sk-report-runs"'), html.indexOf('</table>'));
    expect(runsTable).not.toMatch(/<td>-?\d+\.\d{3,}<\/td>/);
    expect(html.match(/>Runs</g)).toHaveLength(1);
    expect(html.match(/>Missions</g)).toHaveLength(1);
    expect(html).toContain('<table aria-labelledby="sk-report-runs">');
    expect(html).toContain('<table aria-labelledby="sk-report-missions">');
    // The CSV keeps the full value for analysis.
    expect(physics.reportCsv(saved)).toContain(String(Number(entry.measured.toPrecision(6))));
  });
});

describe('4: teacher lock boxes line up with their text', () => {
  it('the lock rows center the box on the text and keep a 44 px row', async () => {
    await mount(seed(), { isTeacherMode: true });
    expect(container.querySelectorAll('.sk-teacher-locks .sk-check input[type="checkbox"]').length).toBeGreaterThan(3);
    const css = [...document.querySelectorAll('style')].map((node) => node.textContent).join('\n');
    expect(css).toContain('.sk-rubric.sk-teacher-locks .sk-check{align-items:center;min-height:44px}');
  });
});

describe('5: phone 3D gap rider and arrow names', () => {
  it('a far rider on a phone gets a readable floor height; without it the shared size rule holds', () => {
    const floor = physics.gap3dPhoneRiderPx();
    expect(floor).toBeGreaterThanOrEqual(56);
    expect(physics.riderFigure3D(8, true, 'skate', 'neutral', 0, true, false, floor).heightPx).toBeCloseTo(floor, 6);
    expect(physics.riderFigure3D(8, true, 'skate', 'neutral', 0, true, false).heightPx).toBeCloseTo(physics.riderScaleFor(8, true) * 56, 6);
    // A near rider already bigger than the floor keeps its size.
    expect(physics.riderFigure3D(200, true, 'skate', 'neutral', 0, true, false, floor).heightPx).toBeCloseTo(physics.riderScaleFor(200, true) * 56, 6);
  });

  it('arrow names whose tips land on the body move off it and off each other, inside the canvas', () => {
    const box = { left: 150, right: 180, top: 100, bottom: 150 };
    const names = [
      { text: 'v', tipX: 190, tipY: 115, w: 7 },
      { text: 'mg', tipX: 165, tipY: 140, w: 16 },
      { text: 'F_air', tipX: 160, tipY: 104, w: 30 },
    ];
    const spots = physics.arrowNameSpots(names, box, 330, 330);
    const rects = spots.map((spot, index) => nameRect(spot, names[index].w));
    rects.forEach((rect) => {
      expect(overlaps(rect, box)).toBe(false);
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.right).toBeLessThanOrEqual(330);
    });
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) expect(overlaps(rects[i], rects[j])).toBe(false);
    // A name already clear of the body stays at its tip.
    expect(physics.arrowNameSpots([{ text: 'N', tipX: 165, tipY: 40, w: 9 }], box, 330, 330)[0]).toEqual({ x: 171, y: 35, moved: false });
  });

  it('the 3D gap view on a phone still names v and mg after a run', async () => {
    canvasRect = { width: 330, height: 330, top: 0, left: 0, right: 330, bottom: 330 };
    await mount(seed({ mode: 'gap', viewMode: '3d' }));
    await chooseFirstAnswer();
    await launch();
    expect(texts.some((entry) => entry.text === 'mg')).toBe(true);
    expect(texts.some((entry) => entry.text === 'v')).toBe(true);
  });
});
