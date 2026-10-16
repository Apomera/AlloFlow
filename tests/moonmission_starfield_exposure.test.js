/** Stable space stars respect scene exposure and the launch atmosphere fade. */
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

// Integer arithmetic makes this oracle independent of the runtime generator.
function catalogueOracle(width, height, count) {
  const modulus = 2147483647n;
  let seed = (7919n * 16807n + 1n) % modulus;
  const next = () => {
    seed = (seed * 16807n) % modulus;
    return Number(seed - 1n) / Number(modulus - 1n);
  };
  const colors = ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff',
    '#b8c8ff', '#b8c8ff', '#fff5d0', '#ffd8b0'];
  return Array.from({ length: count }, () => {
    const x = next() * width, y = next() * height, strength = next();
    return { x, y, radius: 0.3 + strength * 1.5,
      color: colors[Math.floor(next() * colors.length)], brightness: 0.22 + 0.78 * strength * strength };
  });
}

// Model save/restore, including caller styles, transform and clipping metadata.
// Recording alpha at fill time detects the previous overwritten launch exposure.
function canvas({ alpha = 1, gradient = true } = {}) {
  const state = {
    globalAlpha: alpha, fillStyle: '#123456', strokeStyle: '#abcdef',
    globalCompositeOperation: 'source-over', shadowBlur: 7, shadowColor: '#002244',
    lineWidth: 3, transform: [1.2, 0, 0, 1.2, 5, 7], clip: 'caller-clip',
  };
  const initial = { ...state, transform: [...state.transform] };
  const stack = [], calls = [], fills = [], gradients = [];
  let path = [];
  const methods = {
    save() { stack.push({ ...state, transform: [...state.transform] }); calls.push('save'); },
    restore() {
      const saved = stack.pop();
      if (!saved) throw new Error('Unbalanced restore');
      Object.assign(state, saved); calls.push('restore');
    },
    beginPath() { path = []; },
    arc(...args) { path.push(['arc', ...args]); },
    fill() { fills.push({ alpha: state.globalAlpha, style: state.fillStyle, path: path.map(p => [...p]) }); },
  };
  if (gradient) methods.createRadialGradient = (...args) => {
    const result = { coordinates: args, stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } };
    gradients.push(result);
    return result;
  };
  const ctx = new Proxy(state, {
    get(target, key) { return key in methods ? methods[key] : target[key]; },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { ctx, state, initial, stack, calls, fills, gradients };
}
function draw({ width = 480, height = 270, tick = 0, count = 25, opacity = 1, ...options } = {}) {
  const rec = canvas(options);
  P.drawStarfield(rec.ctx, width, height, tick, count, opacity);
  return rec;
}
function fillSignature(rec) {
  return rec.fills.map(fill => ({
    alpha: fill.alpha, path: fill.path,
    style: typeof fill.style === 'string' ? fill.style : {
      coordinates: fill.style.coordinates, stops: fill.style.stops,
    },
  }));
}

describe('Space star catalogue', () => {
  it('preserves the original four-draw seeded positions, radii and colors', () => {
    const actual = P.starfieldPoints(917, 563, 128), expected = catalogueOracle(917, 563, 128);
    expect(actual).toHaveLength(expected.length);
    for (let i = 0; i < actual.length; i++) {
      for (const key of ['x', 'y', 'radius', 'brightness']) expect(actual[i][key]).toBeCloseTo(expected[i][key], 12);
      expect(actual[i].color).toBe(expected[i].color);
    }
  });

  it('keeps the same catalogue prefix as scene star counts change', () => {
    const first = P.starfieldPoints(800, 450, 17);
    const all = P.starfieldPoints(800, 450, 1000);
    expect(all.slice(0, 17)).toEqual(first);
    expect(P.starfieldPoints(800, 450, 83)).toEqual(all.slice(0, 83));
    expect(P.starfieldPoints(800, 450, 17)).toEqual(first);
  });

  it('scales positions with the viewport while retaining point size and brightness', () => {
    const base = P.starfieldPoints(320, 200, 100), wide = P.starfieldPoints(960, 100, 100);
    for (let i = 0; i < base.length; i++) {
      expect(wide[i].x).toBeCloseTo(base[i].x * 3, 12);
      expect(wide[i].y).toBeCloseTo(base[i].y / 2, 12);
      for (const key of ['radius', 'color', 'brightness']) expect(wide[i][key]).toBe(base[i][key]);
    }
  });

  it('does not expose mutable cached records to callers', () => {
    const expected = P.starfieldPoints(600, 300, 6);
    const mutable = P.starfieldPoints(600, 300, 6);
    expect(mutable).not.toBe(expected);
    expect(mutable[0]).not.toBe(expected[0]);
    Object.assign(mutable[0], { x: -1, y: -1, radius: 99, color: 'red', brightness: 0 });
    mutable.pop();
    expect(P.starfieldPoints(600, 300, 6)).toEqual(expected);
  });

  it('defaults invalid counts and bounds finite counts without treating zero as default', () => {
    for (const count of [undefined, NaN, Infinity, -Infinity, null, '30']) expect(P.starfieldPoints(40, 30, count)).toHaveLength(100);
    for (const count of [0, -1, -1000, 0.99]) expect(P.starfieldPoints(40, 30, count)).toEqual([]);
    expect(P.starfieldPoints(40, 30, 12.9)).toHaveLength(12);
    expect(P.starfieldPoints(40, 30, 1001)).toHaveLength(1000);
  });

  it('rejects invalid viewport dimensions before returning any points', () => {
    for (const invalid of [0, -1, NaN, Infinity, -Infinity, null, '300', undefined]) {
      expect(P.starfieldPoints(invalid, 200, 4)).toEqual([]);
      expect(P.starfieldPoints(300, invalid, 4)).toEqual([]);
    }
    expect(P.starfieldPoints(0.01, 0.02, 1)).toHaveLength(1);
  });

  it('keeps the full catalogue finite, within the viewport and varied in brightness', () => {
    const points = P.starfieldPoints(1024, 768, 1000);
    for (const point of points) {
      expect(point.x).toBeGreaterThanOrEqual(0); expect(point.x).toBeLessThan(1024);
      expect(point.y).toBeGreaterThanOrEqual(0); expect(point.y).toBeLessThan(768);
      expect(point.radius).toBeGreaterThanOrEqual(0.3); expect(point.radius).toBeLessThan(1.8);
      expect(point.brightness).toBeGreaterThanOrEqual(0.22); expect(point.brightness).toBeLessThan(1);
    }
    expect(new Set(points.map(p => p.color)).size).toBe(4);
    expect(Math.max(...points.map(p => p.brightness)) - Math.min(...points.map(p => p.brightness))).toBeGreaterThan(0.7);
  });
});

describe('Star exposure and optical points', () => {
  it('multiplies caller alpha, scene exposure and individual brightness at fill time', () => {
    const rec = draw({ alpha: 0.08, opacity: 0.6, count: 60 });
    const points = P.starfieldPoints(480, 270, 60);
    expect(rec.fills).toHaveLength(points.length);
    rec.fills.forEach((fill, i) => {
      expect(fill.alpha).toBeCloseTo(0.08 * 0.6 * points[i].brightness, 14);
      expect(fill.alpha).toBeLessThanOrEqual(0.048);
    });
  });

  it('restores the complete caller state with a balanced save and restore', () => {
    const rec = draw({ alpha: 0.37, opacity: 0.8 });
    expect(rec.state).toEqual(rec.initial);
    expect(rec.stack).toEqual([]);
    expect(rec.calls).toEqual(['save', 'restore']);
    expect(rec.fills).toHaveLength(25);
  });

  it('does not scintillate or drift when simulation time changes', () => {
    const expected = fillSignature(draw({ tick: 0, count: 100 }));
    for (const tick of [-1e6, 1, 500, 9e9, NaN, Infinity]) {
      expect(fillSignature(draw({ tick, count: 100 }))).toEqual(expected);
    }
  });

  it('draws centered soft footprints that fade continuously to a transparent rim', () => {
    const rec = draw({ count: 30 });
    const points = P.starfieldPoints(480, 270, 30);
    expect(rec.gradients).toHaveLength(points.length);
    rec.gradients.forEach((glow, i) => {
      const p = points[i];
      expect(glow.coordinates).toEqual([p.x, p.y, 0, p.x, p.y, p.radius]);
      expect(rec.fills[i].path).toEqual([['arc', p.x, p.y, p.radius, 0, 2 * Math.PI]]);
      expect(rec.fills[i].style).toBe(glow);
      expect(glow.stops).toHaveLength(4);
      expect(glow.stops[0]).toEqual([0, p.color]);
      expect(glow.stops.at(-1)).toEqual([1, p.color + '00']);
      let offset = -1, alpha = 256;
      for (const [position, color] of glow.stops) {
        expect(position).toBeGreaterThan(offset);
        expect(color.slice(0, 7)).toBe(p.color);
        const nextAlpha = color.length === 7 ? 255 : parseInt(color.slice(7), 16);
        expect(nextAlpha).toBeLessThanOrEqual(alpha);
        offset = position; alpha = nextAlpha;
      }
    });
  });

  it('renders usable colored points when radial gradients are unavailable', () => {
    const rec = draw({ alpha: 0.5, opacity: 0.7, gradient: false, count: 40 });
    const points = P.starfieldPoints(480, 270, 40);
    expect(rec.gradients).toEqual([]);
    expect(rec.fills).toHaveLength(40);
    rec.fills.forEach((fill, i) => {
      expect(fill.style).toBe(points[i].color);
      expect(fill.alpha).toBeCloseTo(0.35 * points[i].brightness, 14);
      expect(fill.path).toEqual([['arc', points[i].x, points[i].y, points[i].radius, 0, 2 * Math.PI]]);
    });
    expect(rec.state).toEqual(rec.initial);
  });

  it('does no drawing for zero exposure, zero caller alpha, no points or invalid viewports', () => {
    for (const options of [{ opacity: 0 }, { alpha: 0 }, { count: 0 }, { count: -1 },
      { width: 0 }, { height: NaN }]) {
      const rec = draw(options);
      expect(rec.fills).toEqual([]); expect(rec.gradients).toEqual([]); expect(rec.calls).toEqual([]);
      expect(rec.state).toEqual(rec.initial);
    }
  });

  it('clamps explicit opacity into the valid scene exposure range', () => {
    expect(fillSignature(draw({ opacity: 3 }))).toEqual(fillSignature(draw({ opacity: 1 })));
    expect(draw({ opacity: -0.2 }).fills).toEqual([]);
    const half = draw({ opacity: 0.5 }), full = draw({ opacity: 1 });
    half.fills.forEach((fill, i) => expect(fill.alpha).toBe(full.fills[i].alpha / 2));
  });

  it('uses full scene exposure for missing or nonfinite opacity', () => {
    const expected = fillSignature(draw({ opacity: 1 }));
    for (const opacity of [NaN, Infinity, -Infinity, null, '0.1']) {
      expect(fillSignature(draw({ opacity }))).toEqual(expected);
    }
    const rec = canvas();
    P.drawStarfield(rec.ctx, 480, 270, 0, 25);
    expect(fillSignature(rec)).toEqual(expected);
  });

  it('increases the launch sky star exposure monotonically as the air thins', () => {
    let prior = 0;
    for (let altitude = 0; altitude <= 120; altitude += 0.5) {
      const exposure = P.skyAt(altitude).stars;
      expect(exposure).toBeGreaterThanOrEqual(prior);
      expect(exposure).toBeLessThanOrEqual(1);
      prior = exposure;
    }
    expect(P.skyAt(0).stars).toBe(0);
    expect(P.skyAt(10).stars).toBe(0);
    expect(P.skyAt(120).stars).toBe(1);
  });

  it('preserves the gradual launch-sky fade instead of replacing it with bright stars', () => {
    const altitudes = [15, 20, 25, 30, 35, 45];
    const frames = altitudes.map(altitude => {
      const exposure = P.skyAt(altitude).stars;
      const rec = draw({ alpha: exposure, count: 50 });
      if (exposure > 0) {
        const points = P.starfieldPoints(480, 270, 50);
        rec.fills.forEach((fill, i) => expect(fill.alpha).toBeCloseTo(exposure * points[i].brightness, 14));
      } else expect(rec.fills).toEqual([]);
      return { exposure, energy: rec.fills.reduce((sum, fill) => sum + fill.alpha, 0) };
    });
    expect(frames.some(frame => frame.exposure > 0 && frame.exposure < 1)).toBe(true);
    for (let i = 1; i < frames.length; i++) expect(frames[i].energy).toBeGreaterThanOrEqual(frames[i - 1].energy);
    expect(frames.at(-1).energy).toBeGreaterThan(frames[0].energy);
  });
});
