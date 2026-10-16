/** Deterministic launch cumulus with a continuous, Sun-lit cloud envelope. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
let P;
beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

const invalid = [undefined, null, NaN, Infinity, -Infinity, '1'];

function canvas({ alpha = 0.37, gradient = 'native' } = {}) {
  const state = {
    globalAlpha: alpha, fillStyle: '#123456', strokeStyle: '#abcdef', lineWidth: 7,
    globalCompositeOperation: 'multiply', shadowBlur: 3, shadowColor: '#223344', lineJoin: 'bevel',
    transform: [1.3, 0, 0, 1.3, 17, 29], clip: 'caller-clip',
  };
  const copyState = () => ({ ...state, transform: [...state.transform] });
  const initial = copyState(), stack = [], calls = [], fills = [], strokes = [], gradients = [];
  let path = [];
  const methods = {
    save() { stack.push(copyState()); calls.push(['save']); },
    restore() {
      const saved = stack.pop();
      if (!saved) throw new Error('Unbalanced restore');
      Object.assign(state, saved); calls.push(['restore']);
    },
    beginPath() { path = []; calls.push(['beginPath']); },
    fill() { fills.push({ ...copyState(), path: path.map(p => [...p]) }); calls.push(['fill']); },
    fillRect(...args) { fills.push({ ...copyState(), path: [['rect', ...args]] }); calls.push(['fillRect', ...args]); },
    stroke() { strokes.push({ ...copyState(), path: path.map(p => [...p]) }); calls.push(['stroke']); },
    clip() { state.clip = path.map(p => [...p]); calls.push(['clip']); },
    translate(x, y) {
      const m = state.transform;
      m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y;
      calls.push(['translate', x, y]);
    },
    scale(x, y) {
      const m = state.transform;
      m[0] *= x; m[1] *= x; m[2] *= y; m[3] *= y;
      calls.push(['scale', x, y]);
    },
  };
  for (const name of ['moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'ellipse', 'closePath', 'rect']) {
    methods[name] = (...args) => { path.push([name, ...args]); calls.push([name, ...args]); };
  }
  for (const name of ['createLinearGradient', 'createRadialGradient']) {
    if (gradient === 'missing') continue;
    methods[name] = (...coordinates) => {
      calls.push([name, ...coordinates]);
      const result = { kind: name, coordinates, stops: [] };
      if (gradient !== 'malformed') result.addColorStop = function(offset, color) { this.stops.push([offset, color]); };
      gradients.push(result);
      return gradient === 'null' ? null : result;
    };
  }
  const ctx = new Proxy(state, {
    get(target, key) { return key in methods ? methods[key] : target[key]; },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { ctx, state, initial, stack, calls, fills, strokes, gradients };
}

function draw(seed = 3, light, options = {}) {
  const rec = canvas(options);
  rec.result = P.drawLaunchCloud(rec.ctx, 170, 130, 48, seed, light);
  return rec;
}

function signature(rec) {
  return rec.fills.map(fill => ({
    alpha: fill.globalAlpha, path: fill.path, transform: fill.transform,
    style: typeof fill.fillStyle === 'string' ? fill.fillStyle : {
      kind: fill.fillStyle.kind, coordinates: fill.fillStyle.coordinates, stops: fill.fillStyle.stops,
    },
  }));
}

describe('Launch cloud envelopes', () => {
  it('rejects missing, nonfinite, fractional, negative and unsupported seeds', () => {
    for (const seed of [...invalid, -1, 0.5, 2147483648]) expect(P.launchCloudGeometry(seed)).toBeNull();
    for (const seed of [0, 1, 2147483647]) expect(P.launchCloudGeometry(seed)).not.toBeNull();
  });

  it('has five deterministic variants while keeping the cache bounded', () => {
    const variants = new Set(), profiles = new Set();
    for (let seed = 0; seed < 100; seed++) {
      const geometry = P.launchCloudGeometry(seed);
      variants.add(geometry);
      profiles.add(JSON.stringify(geometry.top));
      expect(P.launchCloudGeometry(seed)).toBe(geometry);
      expect(P.launchCloudGeometry(seed + 500)).toBe(geometry);
    }
    expect(variants.size).toBe(5);
    expect(profiles.size).toBe(5);
  });

  it('freezes the cached envelope, its lobes and every point', () => {
    const geometry = P.launchCloudGeometry(2);
    for (const value of [geometry, geometry.lobes, geometry.top, geometry.bottom,
      ...geometry.lobes, ...geometry.top, ...geometry.bottom]) expect(Object.isFrozen(value)).toBe(true);
    expect(() => { geometry.top[1].y = 900; }).toThrow(TypeError);
    expect(() => { geometry.lobes.push({}); }).toThrow(TypeError);
    expect(P.launchCloudGeometry(2)).toBe(geometry);
  });

  it('keeps continuous finite profiles inside the stated bounds with no crossed envelope', () => {
    for (let seed = 0; seed < 5; seed++) {
      const g = P.launchCloudGeometry(seed);
      expect(g.top.length).toBe(g.bottom.length);
      expect(g.top.length).toBeGreaterThan(50);
      expect(g.minX).toBeLessThan(0); expect(g.maxX).toBeGreaterThan(0);
      expect(g.minY).toBeLessThan(0); expect(g.maxY).toBe(g.baseY);
      g.top.forEach((top, index) => {
        const bottom = g.bottom[index];
        expect([top.x, top.y, bottom.x, bottom.y].every(Number.isFinite)).toBe(true);
        expect(top.x).toBe(bottom.x);
        expect(top.x).toBeGreaterThanOrEqual(g.minX); expect(top.x).toBeLessThanOrEqual(g.maxX);
        expect(top.y).toBeGreaterThanOrEqual(g.minY); expect(top.y).toBeLessThanOrEqual(bottom.y);
        expect(bottom.y).toBeLessThanOrEqual(g.maxY);
        if (index) {
          expect(top.x).toBeGreaterThan(g.top[index - 1].x);
          expect(Math.abs(top.y - g.top[index - 1].y)).toBeLessThan(0.2);
          expect(Math.abs(bottom.y - g.bottom[index - 1].y)).toBeLessThan(0.2);
        }
      });
      expect(g.top[0].x).toBe(g.minX);
      expect(g.top.at(-1).x).toBe(g.maxX);
      expect(Math.min(...g.top.map(point => point.y))).toBe(g.minY);
    }
  });

  it('shares a flat base across the middle while rounding the cloud edges', () => {
    for (let seed = 0; seed < 5; seed++) {
      const g = P.launchCloudGeometry(seed);
      const middle = g.bottom.filter(point => Math.abs(point.x) <= 1.5);
      expect(middle.length).toBeGreaterThan(g.bottom.length / 2);
      middle.forEach(point => expect(point.y).toBe(g.baseY));
      expect(g.bottom[0].y).toBeLessThan(g.baseY);
      expect(g.bottom.at(-1).y).toBeLessThan(g.baseY);
      expect(g.top[0].y).toBe(g.bottom[0].y);
      expect(g.top.at(-1).y).toBe(g.bottom.at(-1).y);
    }
  });
});

describe('Launch cloud rendering', () => {
  it('rejects invalid placement, size, seed and light before touching Canvas', () => {
    const rec = canvas();
    for (const value of invalid) {
      expect(P.drawLaunchCloud(rec.ctx, value, 20, 40, 0)).toBeNull();
      expect(P.drawLaunchCloud(rec.ctx, 20, value, 40, 0)).toBeNull();
      expect(P.drawLaunchCloud(rec.ctx, 20, 20, value, 0)).toBeNull();
    }
    for (const size of [0, -1, Number.MAX_VALUE]) expect(P.drawLaunchCloud(rec.ctx, 20, 20, size, 0)).toBeNull();
    for (const seed of [...invalid, -1, 0.5, 2147483648]) expect(P.drawLaunchCloud(rec.ctx, 20, 20, 40, seed)).toBeNull();
    for (const light of [{}, { x: 0, y: 0 }, { x: 1 }, { y: 1 }, { x: NaN, y: 1 },
      { x: 1, y: Infinity }, { x: '1', y: 1 }, { x: Number.MAX_VALUE, y: Number.MAX_VALUE }]) {
      expect(P.drawLaunchCloud(rec.ctx, 20, 20, 40, 0, light)).toBeNull();
    }
    expect(P.drawLaunchCloud(null, 20, 20, 40, 0)).toBeNull();
    expect(rec.calls).toEqual([]);
  });

  it('does no Canvas work at zero caller opacity', () => {
    const rec = draw(4, undefined, { alpha: 0 });
    expect(rec.result.geometry).toBe(P.launchCloudGeometry(4));
    expect(rec.calls).toEqual([]);
    expect(rec.state).toEqual(rec.initial);
  });

  it('preserves caller transform, clip, alpha, compositing and paint state', () => {
    const rec = draw();
    expect(rec.state).toEqual(rec.initial);
    expect(rec.stack).toEqual([]);
    expect(rec.calls.filter(call => call[0] === 'save').length).toBe(1);
    expect(rec.calls.filter(call => call[0] === 'restore').length).toBe(1);
    for (const paint of [...rec.fills, ...rec.strokes]) {
      expect(paint.globalAlpha).toBe(rec.initial.globalAlpha);
      expect(paint.globalCompositeOperation).toBe(rec.initial.globalCompositeOperation);
    }
  });

  it('paints one closed cloud body and clips every interior highlight to that body', () => {
    const rec = draw(), body = rec.fills.filter(fill => fill.path.at(-1)?.[0] === 'closePath');
    expect(body.length).toBe(1);
    expect(body[0].path[0][0]).toBe('moveTo');
    expect(body[0].path.some(command => command[0] === 'arc' || command[0] === 'ellipse')).toBe(false);
    expect(rec.calls.filter(call => call[0] === 'clip').length).toBe(1);
    rec.fills.filter(fill => fill !== body[0]).forEach(fill => expect(fill.clip).toEqual(body[0].path));
    expect(rec.strokes.length).toBe(1);
    expect(rec.strokes[0].path).toEqual(body[0].path);
  });

  it('uses the fixed launch Sun by default and normalizes explicit light', () => {
    const rec = draw(), sunlight = P.launchSunlight(0);
    expect(rec.result.light.x).toBeCloseTo(sunlight.x, 14);
    expect(rec.result.light.y).toBeCloseTo(sunlight.y, 14);
    const explicit = draw(3, { x: 6, y: -8 });
    expect(explicit.result.light).toEqual({ x: 0.6, y: -0.8 });
    expect(explicit.result).toMatchObject({ x: 170, y: 130, size: 48 });
    expect(explicit.result.geometry).toBe(P.launchCloudGeometry(3));
  });

  it('moves the bright side and lobe highlights toward the supplied Sun', () => {
    for (const light of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0.6, y: -0.8 }]) {
      const rec = draw(2, light), body = rec.gradients.find(g => g.kind === 'createLinearGradient');
      const [x0, y0, x1, y1] = body.coordinates;
      expect((x0 - x1) * light.x + (y0 - y1) * light.y).toBeGreaterThan(0);
      expect((x0 - x1) * light.y - (y0 - y1) * light.x).toBeCloseTo(0, 12);
      const lobes = rec.result.geometry.lobes.slice(1);
      const highlights = rec.gradients.filter(g => g.kind === 'createRadialGradient');
      expect(highlights.length).toBe(lobes.length);
      highlights.forEach((gradient, index) => {
        const [hx, hy] = gradient.coordinates, lobe = lobes[index];
        expect((hx - lobe.x) * light.x + (hy - lobe.y) * light.y).toBeGreaterThan(0);
        expect(gradient.stops.at(-1)[1]).toMatch(/,0\)$/);
      });
    }
  });

  it('keeps the silhouette fixed when the light direction changes', () => {
    const a = draw(1, { x: 1, y: 0 }), b = draw(1, { x: -1, y: 0 });
    expect(a.result.geometry).toBe(b.result.geometry);
    expect(a.fills[0].path).toEqual(b.fills[0].path);
    expect(a.gradients[0].coordinates).not.toEqual(b.gradients[0].coordinates);
  });

  it('renders the same cloud again without clock or draw-order variation', () => {
    const a = draw(3);
    for (let seed = 0; seed < 5; seed++) draw(seed);
    const b = draw(3);
    expect(signature(b)).toEqual(signature(a));
  });

  it('keeps paths and gradients finite for varied valid placements and scales', () => {
    for (const size of [0.01, 1, 48, 10000]) {
      const rec = canvas();
      expect(P.drawLaunchCloud(rec.ctx, -120, 0, size, 2147483647)).not.toBeNull();
      for (const call of rec.calls) {
        expect(call.slice(1).filter(value => typeof value === 'number').every(Number.isFinite)).toBe(true);
      }
      for (const gradient of rec.gradients) {
        expect(gradient.coordinates.every(Number.isFinite)).toBe(true);
        gradient.stops.forEach(([offset, color]) => {
          expect(offset).toBeGreaterThanOrEqual(0); expect(offset).toBeLessThanOrEqual(1);
          expect(color).not.toMatch(/NaN|Infinity/);
        });
      }
      expect(rec.state).toEqual(rec.initial);
    }
  });

  for (const gradient of ['missing', 'null', 'malformed']) {
    it(`retains a coherent cloud body and caller state with ${gradient} gradients`, () => {
      const rec = draw(1, undefined, { gradient });
      expect(rec.result).not.toBeNull();
      expect(rec.fills.length).toBe(2);
      expect(rec.fills[0].path.at(-1)[0]).toBe('closePath');
      rec.fills.forEach(fill => {
        expect(typeof fill.fillStyle).toBe('string');
        expect(fill.fillStyle.length).toBeGreaterThan(0);
      });
      expect(rec.state).toEqual(rec.initial);
      expect(rec.stack).toEqual([]);
    });
  }
});

