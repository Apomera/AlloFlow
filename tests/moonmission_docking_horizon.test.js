import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
const RADIUS = 1737400, ALTITUDE = 110000;
const DIMENSIONS = [[250, 280], [320, 320], [670, 360], [1100, 320]];

function recorder() {
  const calls = [], paths = [];
  let path = [], gradientId = 0;
  const gradient = (...args) => {
    args.forEach(value => expect(Number.isFinite(value)).toBe(true));
    calls.push(['gradient', ...args]);
    return { gradientId: ++gradientId, addColorStop: (...stops) => calls.push(['stop', ...stops]) };
  };
  const known = {
    createLinearGradient: gradient,
    createRadialGradient: gradient,
    measureText: text => ({ width: String(text).length * 5 }),
  };
  const ctx = new Proxy({}, {
    get: (target, key) => known[key] || target[key] || ((...args) => {
      for (const value of args) if (typeof value === 'number') expect(Number.isFinite(value), String(key)).toBe(true);
      calls.push([key, ...args]);
      if (key === 'beginPath') path = [];
      else if (['moveTo', 'lineTo', 'arc', 'rect', 'closePath', 'quadraticCurveTo', 'bezierCurveTo'].includes(key)) path.push([key, ...args]);
      else if (['clip', 'stroke', 'fill'].includes(key)) paths.push({ operation: key, path: path.map(row => [...row]) });
    }),
    set: (target, key, value) => {
      if (typeof value === 'number') expect(Number.isFinite(value), String(key)).toBe(true);
      target[key] = value;
      calls.push(['set', key, value?.gradientId ? 'gradient:' + value.gradientId : value]);
      return true;
    },
  });
  return { ctx, calls, paths };
}

// Camera at (0,0,d), looking along local horizontal +Y with vertical screen
// displacement pointing toward -Z. Normalize lengths by the lunar radius so
// cancellation in the ray/sphere quadratic remains well conditioned.
function sphereRay(x, y, W, H) {
  const focal = H / (2 * Math.tan(Math.PI / 6));
  const vx = x - W / 2, vy = focal, vz = -(y - H / 2);
  const length = Math.hypot(vx, vy, vz), uz = vz / length;
  const d = (RADIUS + ALTITUDE) / RADIUS;
  const b = 2 * d * uz, c = d * d - 1;
  return { discriminant: b * b - 4 * c, closestDistance: d * Math.sqrt(1 - uz * uz), closestForward: -b / 2 };
}

function expectTangent(x, y, W, H) {
  const ray = sphereRay(x, y, W, H);
  expect(Math.abs(ray.discriminant)).toBeLessThan(2e-14);
  expect(ray.closestDistance).toBeCloseTo(1, 13);
  expect(ray.closestForward).toBeGreaterThan(0);
  expect(sphereRay(x, y - 0.25, W, H).discriminant).toBeLessThan(0);
  expect(sphereRay(x, y + 0.25, W, H).discriminant).toBeGreaterThan(0);
}

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

describe('Moon Mission spherical docking horizon', () => {
  it('uses the Columbia reference altitude and the geometric central horizon dip', () => {
    const g = P.dockingHorizonGeometry(670, 360);
    const dip = Math.acos(RADIUS / (RADIUS + ALTITUDE));
    expect(P.ascent.radius).toBe(RADIUS);
    expect(P.docking.altitude).toBe(ALTITUDE);
    expect(g.radius).toBe(RADIUS);
    expect(g.altitude).toBe(ALTITUDE);
    expect(g.centerX).toBe(335);
    expect(g.eyeY).toBe(180);
    expect(g.fieldDegrees).toBe(60);
    expect(g.focal).toBeCloseTo(180 / Math.tan(Math.PI / 6), 12);
    expect(g.dipDegrees).toBeCloseTo(dip * 180 / Math.PI, 12);
    expect(g.tangent).toBeCloseTo(Math.tan(dip), 13);
    const centerY = P.dockingHorizonAt(g, g.centerX);
    expect(Math.atan2(centerY - g.eyeY, g.focal)).toBeCloseTo(dip, 13);
    expect(centerY).toBeGreaterThan(g.eyeY);
  });

  it('places every sampled horizon ray tangent to the Moon with sky above and surface below', () => {
    for (const [W, H] of DIMENSIONS) {
      const g = P.dockingHorizonGeometry(W, H);
      expect(g.points).toHaveLength(49);
      for (const point of g.points) expectTangent(point.x, point.y, W, H);
    }
  });

  it('keeps the sampled curve symmetric, smoothly convex and bounded in complexity', () => {
    for (const [W, H] of DIMENSIONS) {
      const g = P.dockingHorizonGeometry(W, H), points = g.points;
      expect(points[0].x).toBe(-10);
      expect(points.at(-1).x).toBe(W + 10);
      expect(points[24].x).toBeCloseTo(W / 2, 12);
      for (let i = 0; i < points.length; i++) {
        expect(points[i].x + points[48 - i].x).toBeCloseTo(W, 11);
        expect(points[i].y).toBeCloseTo(points[48 - i].y, 11);
        expect(points[i].y).toBeGreaterThanOrEqual(points[24].y);
        if (i > 0) expect(points[i].x).toBeGreaterThan(points[i - 1].x);
        if (i > 0 && i < 48) expect(points[i - 1].y - 2 * points[i].y + points[i + 1].y).toBeGreaterThan(0);
      }
    }
  });

  it('preserves a 60 degree vertical field and scale under resizing without flattening wide views', () => {
    const narrow = P.dockingHorizonGeometry(320, 320);
    const wide = P.dockingHorizonGeometry(1100, 320);
    const doubled = P.dockingHorizonGeometry(640, 640);
    expect(narrow.focal).toBe(wide.focal);
    expect(narrow.eyeY).toBe(wide.eyeY);
    expect(P.dockingHorizonAt(narrow, 160)).toBe(P.dockingHorizonAt(wide, 550));
    expect(P.dockingHorizonAt(wide, 0) - wide.eyeY).toBeGreaterThan(P.dockingHorizonAt(narrow, 0) - narrow.eyeY);
    for (const x of [0, 31.25, 160, 257.5, 320]) {
      expect(P.dockingHorizonAt(doubled, 2 * x)).toBeCloseTo(2 * P.dockingHorizonAt(narrow, x), 11);
    }
    expect(2 * Math.atan((320 / 2) / narrow.focal) * 180 / Math.PI).toBeCloseTo(60, 12);
  });

  it('evaluates tangent rays between sampled points and beyond the crop independently of tessellation', () => {
    for (const [W, H] of DIMENSIONS) {
      const g = P.dockingHorizonGeometry(W, H);
      for (const x of [-W, -1.234, W * 0.12345, W * 0.61789, W + 1.234, 2 * W]) {
        const y = P.dockingHorizonAt(g, x);
        expect(Number.isFinite(y)).toBe(true);
        expectTangent(x, y, W, H);
      }
      const original = P.dockingHorizonAt(g, W * 0.341);
      g.points.length = 0;
      expect(P.dockingHorizonAt(g, W * 0.341)).toBe(original);
    }
  });

  it('rejects invalid dimensions, malformed geometry and nonfinite query coordinates', () => {
    const bad = [undefined, null, false, true, '', '320', {}, [], NaN, Infinity, -Infinity];
    for (const value of [...bad, 0, -1]) {
      expect(P.dockingHorizonGeometry(value, 320)).toBeNull();
      expect(P.dockingHorizonGeometry(320, value)).toBeNull();
    }
    const valid = P.dockingHorizonGeometry(320, 320);
    for (const value of bad) expect(P.dockingHorizonAt(valid, value)).toBeNull();
    for (const value of [undefined, null, false, {}, { focal: 1 }]) expect(P.dockingHorizonAt(value, 0)).toBeNull();
    for (const field of ['centerX', 'eyeY', 'focal', 'tangent']) {
      expect(P.dockingHorizonAt({ ...valid, [field]: NaN }, 0)).toBeNull();
      expect(P.dockingHorizonAt({ ...valid, [field]: Infinity }, 0)).toBeNull();
    }
  });

  it('returns detached deterministic geometry that cannot alter later camera calculations', () => {
    const expected = P.dockingHorizonGeometry(320, 320), first = P.dockingHorizonGeometry(320, 320);
    expect(first).toEqual(expected);
    first.points[0].x = 999;
    first.points[0].y = 999;
    first.altitude = 999;
    first.focal = 999;
    expect(P.dockingHorizonGeometry(320, 320)).toEqual(expected);
    expect(P.docking.altitude).toBe(ALTITUDE);
    expect(P.ascent.radius).toBe(RADIUS);
  });

  it('bounds the surface fill by the measured limb and viewport with a sharp edge and balanced context state', () => {
    for (const [W, H] of DIMENSIONS) {
      const draw = recorder(), expected = P.dockingHorizonGeometry(W, H);
      const actual = P.drawDockingHorizon(draw.ctx, W, H);
      expect(actual).toEqual(expected);
      const measuredEdge = expected.points.map((point, i) => [i === 0 ? 'moveTo' : 'lineTo', point.x, point.y]);
      const surface = draw.paths.find(entry => entry.operation === 'fill');
      expect(surface).toBeDefined();
      expect(surface.path.slice(0, 49)).toEqual(measuredEdge);
      const [rightBottom, leftBottom, close] = surface.path.slice(49);
      expect(rightBottom[0]).toBe('lineTo');
      expect(leftBottom[0]).toBe('lineTo');
      expect(rightBottom[1]).toBe(expected.points.at(-1).x);
      expect(leftBottom[1]).toBe(expected.points[0].x);
      expect(rightBottom[2]).toBe(leftBottom[2]);
      expect(rightBottom[2]).toBeGreaterThanOrEqual(Math.max(H, ...expected.points.map(point => point.y)));
      expect(close).toEqual(['closePath']);
      expect(surface.path).toHaveLength(52);
      const viewportClip = draw.paths.findIndex(entry => entry.operation === 'clip' &&
        entry.path.some(row => row[0] === 'rect' && row[1] === 0 && row[2] === 0 && row[3] === W && row[4] === H));
      expect(viewportClip).toBeGreaterThanOrEqual(0);
      expect(viewportClip).toBeLessThan(draw.paths.indexOf(surface));
      expect(draw.paths.find(entry => entry.operation === 'stroke').path).toEqual(measuredEdge);
      expect(draw.calls).toContainEqual(['set', 'lineWidth', 1]);
      expect(draw.calls.filter(row => row[0] === 'save').length).toBe(draw.calls.filter(row => row[0] === 'restore').length);
      expect(draw.calls.length).toBeLessThan(2000);
    }
  });

  it('does no drawing for an unavailable context or invalid viewport', () => {
    expect(P.drawDockingHorizon(null, 320, 320)).toBeNull();
    for (const [W, H] of [[0, 320], [320, 0], [-1, 320], [320, NaN], [Infinity, 320]]) {
      const draw = recorder();
      expect(P.drawDockingHorizon(draw.ctx, W, H)).toBeNull();
      expect(draw.calls).toEqual([]);
    }
  });

  it('keeps a frozen docking scene identical across animation timestamps without mutating its state or receipt', () => {
    const state = Object.freeze({ ...P.dockingState(), x: 0.4, y: -20, ax: 0, ay: 0, time: 47 });
    const before = { ...state }, receipt = P.cleanDockingPlayback({ dockingRun: state });
    const early = recorder(), late = recorder();
    const a = P.drawDockingPractice(early.ctx, 670, 360, state, { time: 0 });
    const b = P.drawDockingPractice(late.ctx, 670, 360, state, { time: 200 });
    expect(a).toEqual(b);
    expect(early.calls).toEqual(late.calls);
    expect(a.horizon).toEqual(P.dockingHorizonGeometry(670, 360));
    expect(state).toEqual(before);
    expect(P.cleanDockingPlayback({ dockingRun: state })).toEqual(receipt);
  });

  it('retains measured overview port positions, equal physical axes and contact clearance', () => {
    for (const [W, H] of DIMENSIONS) {
      for (const [x, y] of [[8, -120], [0.4, -1.5], [-3, -20], [0, 0]]) {
        const state = Object.freeze({ ...P.dockingState(), x, y });
        const draw = P.drawDockingPractice(recorder().ctx, W, H, state);
        const k = Math.min(1.3, Math.max(0.72, W / 670));
        expect(draw.portX).toBe(W - 88 * k - 20);
        expect(draw.portY).toBe(H * 0.51);
        expect((draw.eaglePortX - draw.portX) / draw.pictureScale).toBeCloseTo(y, 10);
        expect((draw.portY - draw.eaglePortY) / draw.pictureScale).toBeCloseTo(x, 10);
        expect(draw.corridorHalfWidth / draw.pictureScale).toBeCloseTo(P.docking.portTolerance, 12);
        expect(draw.horizon).toEqual(P.dockingHorizonGeometry(W, H));
        expect(draw.engineVisible).toBe(false);
        expect(draw.plumeVisible).toBe(false);
      }
    }
  });

  it('keeps the docking close-up on its existing measured port geometry without a distant horizon', () => {
    for (const [W, H] of DIMENSIONS) {
      const state = Object.freeze({ ...P.dockingState(), x: 0.4, y: -1.5 });
      const early = recorder(), late = recorder();
      const a = P.drawDockingPractice(early.ctx, W, H, state, { view: 'closeup', time: 0 });
      const b = P.drawDockingPractice(late.ctx, W, H, state, { view: 'closeup', time: 200 });
      expect(a).toEqual(P.dockingCloseupGeometry(W, H, state));
      expect(a).not.toHaveProperty('horizon');
      expect(b).toEqual(a);
      expect(early.calls).toEqual(late.calls);
      const horizon = P.dockingHorizonGeometry(W, H);
      expect(early.paths.some(entry => horizon.points.every(point => entry.path.some(row =>
        (row[0] === 'moveTo' || row[0] === 'lineTo') && row[1] === point.x && row[2] === point.y)))).toBe(false);
    }
  });
});
