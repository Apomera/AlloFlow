import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE_PATH = resolve(process.cwd(), 'stem_lab/stem_tool_watercycle.js');
const MIRROR_PATH = resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js');
const source = readFileSync(SOURCE_PATH, 'utf8');

// Execute the drawing helpers themselves. A predictable font lets these tests exercise the
// available-space decisions without depending on a machine's installed canvas fonts.
function createLayout({ width = 1040, height = 520, dpr = 1, glyphWidth = 8, overlays = [] } = {}) {
  const start = source.indexOf('            var wcLabelRects2d = [];');
  const end = source.indexOf('            function evidenceLabel2d(', start);
  expect(start, 'label registry exists').toBeGreaterThan(-1);
  expect(end, 'layout helpers are bounded before drawing').toBeGreaterThan(start);
  const cssWidth = width / dpr;
  const cssHeight = height / dpr;
  const ctx = {
    font: '',
    measureText: (text) => ({ width: Array.from(String(text)).length * glyphWidth * dpr }),
  };
  const canvasEl = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: cssWidth, height: cssHeight }),
    parentElement: { querySelectorAll: () => overlays.map((rect) => ({ getBoundingClientRect: () => rect })) },
  };
  // eslint-disable-next-line no-new-func
  const api = new Function('cW', 'cH', 'dpr', 'tick', 'canvasEl', 'ctx', source.slice(start, end) + `
    return { wrap: wcWrapEvidenceText2d, layout: wcEvidenceLabelLayout2d,
      overlap: wcRectsOverlap2d, reserve: wcReserveLabelRect2d,
      rects: wcLabelRects2d, chrome: wcCanvasChromeRects2d };`)(width, height, dpr, 0, canvasEl, ctx);
  return { ...api, ctx, width, height, dpr };
}

const callouts = [
  ['LATENT HEAT IN', 0.035, 0.35],
  ['INVISIBLE VAPOR — PATH SHOWN', 0.12, 0.28],
  ['LATENT HEAT OUT', 0.47, 0.13],
  ['DROPLETS / ICE ON NUCLEI', 0.29, 0.255],
  ['GRAVITY — FALLING TRANSPORT', 0.20, 0.46],
  ['RUNOFF → SURFACE STORAGE', 0.07, 0.73],
  ['SCHEMATIC SURFACE STORE', 0.07, 0.73],
  ['ROOT → XYLEM', 0.51, 0.54],
  ['XYLEM → LEAF', 0.51, 0.54],
  ['LIMITED VEGETATION / STOMATA CLOSED', 0.58, 0.24],
  ['STOMATA → INVISIBLE VAPOR', 0.58, 0.24],
  ['GROUNDWATER → DISCHARGE', 0.49, 0.87],
  ['SELECTED DEEP RECHARGE', 0.49, 0.87],
  ['SOIL PORE WATER (VADOSE ZONE)', 0.49, 0.81],
];

function expectInsideCanvas(api, label) {
  const inset = 6 * api.dpr;
  expect(label.x).toBeGreaterThanOrEqual(inset);
  expect(label.y).toBeGreaterThanOrEqual(inset);
  expect(label.x + label.w).toBeLessThanOrEqual(api.width - inset + 0.001);
  expect(label.y + label.h).toBeLessThanOrEqual(api.height - inset + 0.001);
  expect(label.w).toBeLessThanOrEqual(Math.min(280 * api.dpr, api.width - 16 * api.dpr) + 0.001);
  expect(label.lines.length).toBeGreaterThan(0);
  for (const line of label.lines) {
    expect(api.ctx.measureText(line).width).toBeLessThanOrEqual(label.w - 2 * label.paddingX + 0.001);
  }
}

function createEvidenceDrawing() {
  const start = source.indexOf('            function drawMatterEnergyEvidence2d(');
  const end = source.indexOf('            function draw(forceRender)', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const labels = [], arrows = [], operations = [];
  const ctx = new Proxy({}, {
    get: (target, key) => key in target ? target[key] : (...args) => operations.push({ name: key, args }),
    set: (target, key, value) => { target[key] = value; return true; },
  });
  // eslint-disable-next-line no-new-func
  const draw = new Function('cW', 'cH', 'dpr', 'ctx', 'canvasEl', 'evidenceLabel2d',
    'evidenceArrow2d', 'drawPhysicalTimeGlyph2d', source.slice(start, end) + '\nreturn drawMatterEnergyEvidence2d;')(
    1040, 520, 1, ctx, { dataset: {} },
    (...args) => labels.push(args), (...args) => arrows.push(args), () => {},
  );
  return { draw, labels, arrows, operations };
}

describe('Water Cycle evidence callout layout', () => {
  for (const dimensions of [
    { name: 'desktop', width: 1040, height: 520, dpr: 1 },
    { name: '272px canvas', width: 272, height: 322, dpr: 1 },
    { name: '272px canvas at double density', width: 544, height: 644, dpr: 2 },
  ]) {
    describe(dimensions.name, () => {
      it.each(callouts)('keeps "%s" readable and inside the canvas', (text, x, y) => {
        const api = createLayout(dimensions);
        const label = api.layout(text, api.width * x, api.height * y);
        expectInsideCanvas(api, label);
        // Wrapping may split a token, but it must retain every character in its original order.
        expect(label.lines.join('').replace(/\s/gu, '')).toBe(text.replace(/\s/gu, ''));
      });
    });
  }

  it('wraps at word boundaries when a whole word fits', () => {
    const api = createLayout({ glyphWidth: 8 });
    const lines = api.wrap('INVISIBLE VAPOR PATH SHOWN', 80);
    expect(lines).toEqual(['INVISIBLE', 'VAPOR PATH', 'SHOWN']);
    for (const line of lines) expect(api.ctx.measureText(line).width).toBeLessThanOrEqual(80);
  });

  it('splits a long token without breaking Unicode characters or dropping text', () => {
    const api = createLayout({ glyphWidth: 8 });
    const token = '蒸発🌧️💧🌊蒸発🌧️💧🌊蒸発🌧️💧🌊';
    const lines = api.wrap(token, 32);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join('')).toBe(token);
    for (const line of lines) {
      expect(api.ctx.measureText(line).width).toBeLessThanOrEqual(32);
      // An orphaned high or low surrogate would render a replacement glyph in the diagram.
      expect(line).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u);
    }
  });

  it('clamps a callout requested beyond each edge without losing its label', () => {
    for (const [x, y] of [[-100, -100], [2000, 2000]]) {
      const api = createLayout();
      const label = api.layout('LATENT HEAT IN', x, y);
      expectInsideCanvas(api, label);
      expect(label.lines.join(' ')).toBe('LATENT HEAT IN');
    }
  });

  it.each([1, 2])('clears both wrapped corner overlays at density %s', (dpr) => {
    const api = createLayout({
      width: 272 * dpr, height: 322 * dpr, dpr,
      overlays: [
        { left: 8, top: 8, width: 122, height: 68 },
        { left: 143, top: 8, width: 121, height: 60 },
      ],
    });
    const label = api.layout('LATENT HEAT OUT', api.width * 0.47, api.height * 0.13);
    expectInsideCanvas(api, label);
    for (const chrome of api.chrome()) expect(api.overlap(label, chrome)).toBe(false);
  });

  it('reserves distinct callouts before subsequent labels choose their space', () => {
    const api = createLayout({ width: 272, height: 322 });
    const first = api.layout('INVISIBLE VAPOR — PATH SHOWN', 30, 90);
    const second = api.layout('DROPLETS / ICE ON NUCLEI', 30, 90);
    expectInsideCanvas(api, first);
    expectInsideCanvas(api, second);
    expect(api.overlap(first, second)).toBe(false);
    expect(api.rects).toEqual(expect.arrayContaining([
      { x: first.x, y: first.y, w: first.w, h: first.h },
      { x: second.x, y: second.y, w: second.w, h: second.h },
    ]));
  });

  it('keeps the bottom callout within the canvas when its text wraps', () => {
    const api = createLayout({ width: 272, height: 322, glyphWidth: 12 });
    const label = api.layout('SOIL PORE WATER (VADOSE ZONE)', 260, 321);
    expect(label.lines.length).toBeGreaterThan(1);
    expectInsideCanvas(api, label);
    expect(label.lines.join('').replace(/\s/gu, '')).toBe('SOILPOREWATER(VADOSEZONE)');
  });

  it('ships the same helpers in the source and public runtime', () => {
    expect(readFileSync(SOURCE_PATH, 'utf8')).toBe(readFileSync(MIRROR_PATH, 'utf8'));
  });
});

describe('Water Cycle plant evidence stages', () => {
  const metrics = { timeRole: 'transfer', timeRank: 1, transpiration: 0.62 };

  it('shows root uptake before drawing a leaf vapor path', () => {
    const api = createEvidenceDrawing();
    api.draw('transpiration', 'plant_absorb', metrics);
    expect(api.labels.map(([text]) => text)).toEqual(['ROOT → XYLEM']);
    expect(api.operations.filter(({ name }) => name === 'bezierCurveTo')).toHaveLength(0);
    expect(api.arrows).toHaveLength(1);
    // Its single transfer arrow climbs from below the plant towards the xylem.
    const [startX, startY, endX, endY] = api.arrows[0];
    expect(startX).toBeLessThan(endX);
    expect(startY).toBeGreaterThan(endY);
  });

  it.each(['transpiring', 'idle'])('shows leaf transfer and the invisible vapor path for %s', (state) => {
    const api = createEvidenceDrawing();
    api.draw('transpiration', state, metrics);
    expect(api.labels.map(([text]) => text)).toEqual(['XYLEM → LEAF', 'STOMATA → INVISIBLE VAPOR']);
    expect(api.operations.filter(({ name }) => name === 'bezierCurveTo')).toHaveLength(1);
    expect(api.operations.some(({ name, args }) => name === 'setLineDash' && args[0].length === 2)).toBe(true);
  });

  it('keeps root uptake direction marks on the root to stem transfer', () => {
    const start = source.indexOf('            function drawFlowChevrons2d(');
    const end = source.indexOf('            function drawPhysicalTimeGlyph2d(', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const translations = [];
    const ctx = new Proxy({}, {
      get: (target, key) => key in target ? target[key] : (...args) => {
        if (key === 'translate') translations.push(args);
      },
      set: (target, key, value) => { target[key] = value; return true; },
    });
    // eslint-disable-next-line no-new-func
    const draw = new Function('cW', 'cH', 'dpr', 'tick', 'wcMotionReduced', 'ctx', 'canvasEl',
      source.slice(start, end) + '\nreturn drawFlowChevrons2d;')(1040, 520, 1, 0, true, ctx, { dataset: {} });
    draw('transpiration', 'plant_absorb');
    expect(translations).toHaveLength(3);
    for (const [x, y] of translations) {
      expect(x).toBeCloseTo(1040 * 0.61);
      expect(y).toBeGreaterThanOrEqual(520 * 0.51);
      expect(y).toBeLessThanOrEqual(520 * 0.70);
    }
  });
});
