import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Machine verification for the Coordinate Grid tool: slope/distance/midpoint
// math, quadrant classification, and the function plotter's compiler.

const sourcePath = 'stem_lab/stem_tool_coordgrid.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_coordgrid.js';
const src = fs.readFileSync(sourcePath, 'utf8');

// Execute a run of the tool's own var declarations. Single-line markers
// only — the file on disk is CRLF.
function extractScope(startMarker, endMarker, returns) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  expect(start, startMarker).toBeGreaterThan(-1);
  expect(end, endMarker + ' bounds ' + startMarker).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(src.slice(start, end) + '\nreturn { ' + returns.join(', ') + ' };')();
}

const math = extractScope('var calcSlope = function', 'var processClick', [
  'calcSlope', 'calcLineEq', 'calcDistance', 'calcMidpoint', 'getQuadrant'
]);
const plotter = extractScope('var compileFunc = function', 'var addFunc', ['compileFunc']);

beforeEach(() => {
  resetStemLab();
  loadTool(sourcePath, 'coordinate');
});

describe('slope', () => {
  it('reduces to lowest terms with the sign in the numerator', () => {
    expect(math.calcSlope({ x: 0, y: 0 }, { x: 2, y: 4 }).display).toBe('2');
    expect(math.calcSlope({ x: 0, y: 0 }, { x: 4, y: 2 }).display).toBe('1/2');
    expect(math.calcSlope({ x: 0, y: 0 }, { x: -4, y: 2 }).display).toBe('-1/2');
    expect(math.calcSlope({ x: 0, y: 0 }, { x: 6, y: -4 }).display).toBe('-2/3');
    expect(math.calcSlope({ x: 1, y: 1 }, { x: 5, y: 1 }).display).toBe('0');
  });

  it('a whole-number slope reached through a negative run displays without /1 (regression pin)', () => {
    // dy=4, dx=-2 reduces to -2/1; the old code printed exactly that.
    const s = math.calcSlope({ x: 0, y: 0 }, { x: -2, y: 4 });
    expect(s.display).toBe('-2');
    expect(s.value).toBe(-2);
  });

  it('vertical segments report an undefined slope and a vertical line equation', () => {
    const s = math.calcSlope({ x: 3, y: 1 }, { x: 3, y: 5 });
    expect(s.display).toBe('undefined');
    expect(s.run).toBe(0);
    expect(math.calcLineEq({ x: 3, y: 1 }, s)).toBe('x = 3');
  });

  it('line equations carry the correct intercept', () => {
    const s = math.calcSlope({ x: 0, y: 2 }, { x: 1, y: 4 });
    expect(math.calcLineEq({ x: 0, y: 2 }, s)).toBe('y = 2x + 2');
    const s2 = math.calcSlope({ x: 0, y: 0 }, { x: 1, y: 2 });
    expect(math.calcLineEq({ x: 0, y: 0 }, s2)).toBe('y = 2x');
    const s3 = math.calcSlope({ x: 0, y: -1 }, { x: 1, y: 1 });
    expect(math.calcLineEq({ x: 0, y: -1 }, s3)).toBe('y = 2x − 1');
  });
});

describe('distance, midpoint, quadrants', () => {
  it('distance is Euclidean (3-4-5) and midpoint averages coordinates', () => {
    expect(math.calcDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(math.calcDistance({ x: -1, y: -1 }, { x: 2, y: 3 })).toBe(5);
    expect(math.calcMidpoint({ x: -2, y: 6 }, { x: 4, y: -2 })).toEqual({ x: 1, y: 2 });
  });

  it('classifies all four quadrants, both axes, and the origin', () => {
    expect(math.getQuadrant(3, 2)).toBe('Q I');
    expect(math.getQuadrant(-3, 2)).toBe('Q II');
    expect(math.getQuadrant(-3, -2)).toBe('Q III');
    expect(math.getQuadrant(3, -2)).toBe('Q IV');
    expect(math.getQuadrant(0, 5)).toBe('Y-axis');
    expect(math.getQuadrant(5, 0)).toBe('X-axis');
    expect(math.getQuadrant(0, 0)).toBe('Origin');
  });

  it('reflection formulas flip the correct signs (source pins)', () => {
    expect(src).toContain('var ref_x = { x: qtPointX,  y: -qtPointY };');
    expect(src).toContain('var ref_y = { x: -qtPointX, y: qtPointY };');
    expect(src).toContain('var ref_o = { x: -qtPointX, y: -qtPointY };');
  });
});

describe('function plotter compiler', () => {
  it('accepts every syntax its own error message suggests (regression pin)', () => {
    // The toast says: Try 2x+1, -x+3, x^2, 0.5x-2 — all of which failed
    // before implicit multiplication was inserted.
    expect(plotter.compileFunc('2x+1')(3)).toBe(7);
    expect(plotter.compileFunc('-x+3')(1)).toBe(2);
    expect(plotter.compileFunc('x^2')(3)).toBe(9);
    expect(plotter.compileFunc('0.5x-2')(4)).toBe(0);
  });

  it('handles parenthesized and chained implicit products', () => {
    expect(plotter.compileFunc('2(x+1)')(3)).toBe(8);
    expect(plotter.compileFunc('x(x+1)')(3)).toBe(12);
    expect(plotter.compileFunc('(x+1)(x-1)')(4)).toBe(15);
    expect(plotter.compileFunc('2*x+1')(3)).toBe(7);
    expect(plotter.compileFunc('x^2 + 2x + 1')(3)).toBe(16);
  });

  it('strips unsafe characters and rejects empty or unparseable input', () => {
    expect(plotter.compileFunc('')).toBeNull();
    expect(plotter.compileFunc('hello')).toBeNull();
    // Letters vanish before eval, so attempted code comes out as arithmetic
    // or nothing — never executable identifiers.
    const f = plotter.compileFunc('x; alert(1)');
    if (f) expect(Number.isFinite(f(2))).toBe(true);
    expect(src).toContain("replace(/[^0-9.+\\-*\\/()xX^ ]/g, '')");
  });
});

describe('render and deployment', () => {
  it('renders with challenge buttons present', () => {
    const html = renderTool('coordinate', { _coordGrid: {} });
    expect(html).toContain('Plot a Point');
    expect(html).toContain('Find Slope');
    expect(html).toContain('Find Distance');
  });

  it('public mirror is byte-identical to the root copy', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(src);
  });
});
