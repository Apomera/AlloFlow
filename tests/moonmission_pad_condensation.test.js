/** Deterministic residual pad condensation and its layered Canvas drawing. */
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

const geometry = (time = -1, width = 1014, height = 400, altitude = 0) =>
  P.launchPadCondensationGeometry(time, width, height, altitude);
const copy = value => JSON.parse(JSON.stringify(value));
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function finite(value) {
  if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
  else if (value && typeof value === 'object') Object.values(value).forEach(finite);
}
const rgba = value => /^rgba\((\d+),(\d+),(\d+),([\d.e+-]+)\)$/.exec(value).slice(1).map(Number);
const puffAt = (id, time) => geometry(time).puffs.find(puff => puff.id === id);

function recorder(alpha = 0.37, radial = true) {
  let state = { globalAlpha: alpha, fillStyle: '#123456', strokeStyle: '#654321', lineWidth: 2.3,
    lineCap: 'round', lineJoin: 'bevel', globalCompositeOperation: 'source-over',
    transform: [2, 0, 0, 3, 13, 7], clips: ['caller-clip'] };
  let path = [], stack = [];
  const paints = [], calls = [], gradients = [];
  const snapshot = () => ({ ...state, transform: [...state.transform], clips: [...state.clips] });
  const initial = snapshot();
  const gradient = (...args) => {
    const result = { args, stops: [], addColorStop: (offset, color) => result.stops.push({ offset, color }) };
    gradients.push(result); return result;
  };
  const methods = {
    save() { stack.push(snapshot()); calls.push('save'); }, restore() { state = stack.pop(); calls.push('restore'); },
    beginPath() { path = []; }, moveTo: (x, y) => path.push(['move', x, y]), lineTo: (x, y) => path.push(['line', x, y]),
    closePath: () => path.push(['close']), arc: (...args) => path.push(['arc', ...args]),
    clip() { state.clips.push(copy(path)); calls.push('clip'); },
    fill() { paints.push({ kind: 'fill', path: copy(path), state: snapshot() }); },
    stroke() { paints.push({ kind: 'stroke', path: copy(path), state: snapshot() }); },
    fillRect(x, y, width, height) { paints.push({ kind: 'rect', path: [['rect', x, y, width, height]], state: snapshot() }); },
    fillText() {}, measureText: value => ({ width: String(value).length * 5 }),
    translate(x, y) {
      const [a, b, c, d] = state.transform;
      state.transform[4] += a * x + c * y; state.transform[5] += b * x + d * y;
    },
    scale(x, y) { state.transform[0] *= x; state.transform[1] *= x; state.transform[2] *= y; state.transform[3] *= y; },
    createLinearGradient: gradient, createConicGradient: gradient, createRadialGradient: radial ? gradient : undefined,
  };
  const ctx = new Proxy({}, {
    get: (_, key) => key in methods ? methods[key] : state[key],
    set: (_, key, value) => { state[key] = value; return true; },
  });
  return { ctx, paints, calls, gradients, initial, state: snapshot, depth: () => stack.length };
}
const serialPaints = rec => rec.paints.map(paint => ({ path: paint.path, alpha: paint.state.globalAlpha,
  transform: paint.state.transform, style: typeof paint.state.fillStyle === 'string' ? paint.state.fillStyle :
    { args: paint.state.fillStyle.args, stops: paint.state.fillStyle.stops } }));

describe('Residual pad condensation geometry', () => {
  it('rejects malformed inputs and bounds the supported viewport, time and altitude', () => {
    const values = [-1, 1014, 400, 0];
    for (let i = 0; i < values.length; i++) for (const bad of [undefined, null, NaN, Infinity, -Infinity, '1']) {
      const args = [...values]; args[i] = bad; expect(P.launchPadCondensationGeometry(...args)).toBeNull();
    }
    for (const [i, values] of [[0, [-5.001, 10000.001]], [1, [0, 0.999, -1, 16385, Number.MIN_VALUE]],
      [2, [0, 0.999, -1, 16385, Number.MIN_VALUE]], [3, [-0.01, 100000001]]]) {
      for (const bad of values) { const args = [-1, 1014, 400, 0]; args[i] = bad; expect(P.launchPadCondensationGeometry(...args)).toBeNull(); }
    }
    for (const args of [[-5, 1, 1, 0], [10000, 16384, 16384, 100000000]]) {
      const field = P.launchPadCondensationGeometry(...args); expect(field).not.toBeNull(); finite(field);
    }
  });

  it('places three sources just outside the actual standing tank sections', () => {
    const field = geometry(-2, 1014, 400, 20);
    const rocket = P.saturnV(recorder().ctx, 1014 / 2, 400 * 0.22 + field.lift, 400 * 0.58, 1);
    expect(field.sources.map(source => source.id)).toEqual(['s1', 's2', 's4b']);
    expect(field.sources.map(source => source.side)).toEqual([-1, 1, -1]);
    expect(field.sources.map(source => source.fraction)).toEqual([0.18, 0.78, 0.72]);
    expect(field.k).toBeCloseTo(400 * 0.58 / P.saturnVHeight(), 14);
    field.sources.forEach(source => {
      const section = rocket.sections.find(part => part.id === source.id);
      const fraction = (source.y - section.y0) / (section.y1 - section.y0);
      expect(fraction).toBeCloseTo(source.fraction, 12);
      const halfWidth = (section.w0 + (section.w1 - section.w0) * fraction) / 2;
      const distance = (source.x - 1014 / 2) * source.side;
      expect(distance).toBeGreaterThan(halfWidth);
      expect(distance - halfWidth).toBeCloseTo(0.3 * field.k, 12);
    });
  });

  it('includes prehistory at T−5 and staggers source emission schedules', () => {
    const field = geometry(-5);
    expect(field.visible).toBe(true); expect(field.puffs.length).toBeGreaterThan(20);
    expect(field.sources.map(source => source.phase)).toEqual([0, 0.11, 0.22]);
    for (const source of field.sources) {
      const puffs = field.puffs.filter(puff => puff.sourceId === source.id);
      expect(puffs.length).toBeGreaterThan(5);
      for (const puff of puffs) {
        expect(puff.born).toBeLessThan(-5); expect(puff.age).toBeGreaterThan(0); expect(puff.age).toBeLessThan(4.2);
        const ordinal = (puff.born - source.phase) / 0.32;
        expect(ordinal).toBeCloseTo(Math.round(ordinal), 12);
      }
    }
  });

  it('tapers new emission before liftoff and never emits at or after T0', () => {
    const field = geometry(0);
    expect(field.visible).toBe(true);
    const ordered = [...field.puffs].sort((a, b) => a.born - b.born);
    let previous = 1;
    for (const puff of ordered) {
      expect(puff.born).toBeLessThan(0); expect(puff.emission).toBeGreaterThan(0); expect(puff.emission).toBeLessThanOrEqual(previous + 1e-14);
      if (puff.born <= -2) expect(puff.emission).toBe(1);
      else expect(puff.emission).toBeLessThan(1);
      previous = puff.emission;
    }
    for (const time of [0.01, 1, 2, 4]) geometry(time).puffs.forEach(puff => expect(puff.born).toBeLessThan(0));
  });

  it('carries residual puffs continuously through liftoff', () => {
    const before = geometry(-0.000001), after = geometry(0.000001);
    expect(before.visible).toBe(true); expect(after.visible).toBe(true);
    expect(after.puffs.map(puff => puff.id)).toEqual(before.puffs.map(puff => puff.id));
    before.puffs.forEach((puff, index) => {
      const next = after.puffs[index];
      expect(Math.abs(next.opacity - puff.opacity)).toBeLessThan(0.00001);
      expect(Math.abs(next.x - puff.x)).toBeLessThan(0.0001);
      expect(Math.abs(next.y - puff.y)).toBeLessThan(0.0001);
      expect(Math.abs(next.radius - puff.radius)).toBeLessThan(0.0001);
    });
  });

  it('introduces each puff with a continuous fade instead of an opacity step', () => {
    const id = 's1:-12', born = -12 * 0.32;
    expect(puffAt(id, born - 0.000001)).toBeUndefined();
    const newborn = puffAt(id, born + 0.000001);
    expect(newborn).toBeTruthy(); expect(newborn.opacity).toBeGreaterThan(0); expect(newborn.opacity).toBeLessThan(1e-8);
    const halfway = puffAt(id, born + 0.09), full = puffAt(id, born + 0.18);
    expect(halfway.opacity / full.opacity).toBeCloseTo(0.5, 12);
    expect(full.opacity).toBeGreaterThan(newborn.opacity);
  });

  it('fades parcel deaths smoothly and leaves no stale cloud after its lifetime', () => {
    const id = 's1:-5', born = -5 * 0.32;
    const plateau = puffAt(id, born + 2.5), halfway = puffAt(id, born + 3.35);
    expect(halfway.opacity / plateau.opacity).toBeCloseTo(0.5, 12);
    const dying = puffAt(id, born + 4.2 - 0.000001);
    expect(dying.opacity).toBeGreaterThan(0); expect(dying.opacity).toBeLessThan(1e-10);
    expect(puffAt(id, born + 4.2 + 0.000001)).toBeUndefined();
    for (const time of [4.2, 10, 10000]) {
      const field = geometry(time); expect(field.visible).toBe(false); expect(field.puffs).toEqual([]); expect(field.sources).toHaveLength(3);
    }
  });

  it('advects existing parcels left and down while their radii grow', () => {
    const id = 's2:-10', source = geometry(-2).sources.find(source => source.id === 's2');
    const born = -10 * 0.32 + source.phase;
    const puffs = [0.05, 0.25, 0.7, 1.5, 2.5, 4].map(age => puffAt(id, born + age));
    puffs.slice(1).forEach((puff, i) => {
      expect(puff.x).toBeLessThan(puffs[i].x); expect(puff.y).toBeGreaterThan(puffs[i].y);
      expect(puff.radius).toBeGreaterThan(puffs[i].radius);
    });
    expect(puffs.at(-1).x).toBeLessThan(source.x); expect(puffs.at(-1).y).toBeGreaterThan(source.y);
  });

  it('keeps condensation in the ground frame as camera altitude changes', () => {
    const lower = geometry(1, 390, 400, 10), higher = geometry(1, 390, 400, 110), shift = 100 * 1.2 / 9.25;
    expect(higher.lift - lower.lift).toBeCloseTo(shift, 12);
    expect(higher.puffs.map(puff => puff.id)).toEqual(lower.puffs.map(puff => puff.id));
    for (const key of ['sources', 'puffs']) lower[key].forEach((point, i) => {
      expect(higher[key][i].x).toBe(point.x); expect(higher[key][i].y - point.y).toBeCloseTo(shift, 11);
    });
    lower.puffs.forEach((puff, i) => {
      expect(higher.puffs[i].radius).toBe(puff.radius); expect(higher.puffs[i].opacity).toBe(puff.opacity);
    });
    const offscreen = geometry(-1, 390, 400, 400 * 9.25 / 1.2 + 1);
    expect(offscreen.visible).toBe(false); expect(offscreen.puffs).toEqual([]); expect(offscreen.sources).toHaveLength(3);
  });

  it('scales the complete cloud consistently and only translates it under width changes', () => {
    const a = geometry(-1, 600, 400, 20), factor = 1.8, b = geometry(-1, 600 * factor, 400 * factor, 20 * factor);
    expect(b.k).toBeCloseTo(a.k * factor, 12);
    for (const key of ['sources', 'puffs']) a[key].forEach((point, i) => {
      expect(b[key][i].x).toBeCloseTo(point.x * factor, 10); expect(b[key][i].y).toBeCloseTo(point.y * factor, 10);
    });
    a.puffs.forEach((puff, i) => {
      expect(b.puffs[i].radius).toBeCloseTo(puff.radius * factor, 11); expect(b.puffs[i].opacity).toBe(puff.opacity);
      puff.lobes.forEach((lobe, j) => {
        for (const key of ['x', 'y', 'rx', 'ry']) expect(b.puffs[i].lobes[j][key]).toBeCloseTo(lobe[key] * factor, 10);
      });
    });
    const wide = geometry(-1, 1000, 400, 20);
    a.puffs.forEach((puff, i) => {
      expect(wide.puffs[i].x - puff.x).toBeCloseTo(200, 12); expect(wide.puffs[i].y).toBe(puff.y);
      expect(wide.puffs[i].radius).toBe(puff.radius);
    });
  });

  it('replays reverse seeks exactly with fixed bounded history', () => {
    const original = geometry(-2.137), serialized = JSON.stringify(original);
    for (const time of [-5, -3.7, -1, 0, 0.75, 2.5, 4.2, 10000, -2.137]) {
      const field = geometry(time); expect(field.puffs.length).toBeLessThanOrEqual(42);
      expect(new Set(field.puffs.map(puff => puff.id)).size).toBe(field.puffs.length);
      expect(field.visible).toBe(field.puffs.length > 0);
      for (const source of field.sources) expect(field.puffs.filter(puff => puff.sourceId === source.id).length).toBeLessThanOrEqual(14);
    }
    expect(geometry(-2.137)).toEqual(original); expect(JSON.stringify(original)).toBe(serialized);
    original.puffs[0].lobes[0].x = Infinity;
    expect(JSON.stringify(geometry(-2.137))).toBe(serialized);
  });

  it('keeps lobe sizes and opacity finite, positive and bounded', () => {
    for (const time of [-5, -2, -0.001, 0, 1, 3.5]) {
      const field = geometry(time); finite(field);
      for (const puff of field.puffs) {
        expect(puff.radius).toBeGreaterThan(0); expect(puff.opacity).toBeGreaterThan(0); expect(puff.opacity).toBeLessThanOrEqual(0.16);
        expect(puff.lobes).toHaveLength(3);
        puff.lobes.forEach(lobe => {
          expect(lobe.rx).toBeGreaterThan(0); expect(lobe.ry).toBeGreaterThan(0);
          expect(lobe.rx).toBeLessThanOrEqual(puff.radius * 1.2); expect(lobe.ry).toBeLessThan(puff.radius);
          expect(lobe.opacity).toBeGreaterThan(0); expect(lobe.opacity).toBeLessThan(puff.opacity);
        });
      }
    }
  });
});

describe('Residual pad condensation rendering', () => {
  it('draws each local lobe through an elliptical transform and soft radial gradient', () => {
    const field = geometry(), rec = recorder();
    expect(P.drawLaunchPadCondensation(rec.ctx, field)).toEqual(field);
    const lobes = field.puffs.flatMap(puff => puff.lobes);
    expect(rec.paints).toHaveLength(lobes.length); expect(rec.gradients).toHaveLength(lobes.length);
    rec.paints.forEach((paint, i) => {
      const lobe = lobes[i];
      expect(paint.path).toEqual([['arc', 0, 0, 1, 0, Math.PI * 2]]);
      expect(paint.state.transform).toEqual([2 * lobe.rx, 0, 0, 3 * lobe.ry, 13 + 2 * lobe.x, 7 + 3 * lobe.y]);
      const stops = paint.state.fillStyle.stops;
      expect(stops.map(stop => stop.offset)).toEqual([0, 0.45, 1]);
      expect(rgba(stops[0].color)[3]).toBe(lobe.opacity);
      expect(rgba(stops[1].color)[3]).toBeCloseTo(lobe.opacity / 2, 14);
      expect(rgba(stops[2].color)[3]).toBe(0);
    });
  });

  it('preserves caller alpha, clip, transform and composite state across all lobes', () => {
    const rec = recorder(), field = geometry(); P.drawLaunchPadCondensation(rec.ctx, field, P.launchSunlight(0));
    const count = field.puffs.length * 3;
    expect(rec.calls.filter(call => call === 'save')).toHaveLength(count + 1);
    expect(rec.calls.filter(call => call === 'restore')).toHaveLength(count + 1);
    expect(rec.calls).not.toContain('clip'); expect(rec.depth()).toBe(0); expect(rec.state()).toEqual(rec.initial);
    rec.paints.forEach(paint => {
      expect(paint.state.globalAlpha).toBe(0.37); expect(paint.state.clips).toEqual(['caller-clip']);
      expect(paint.state.globalCompositeOperation).toBe('source-over');
    });
  });

  it('moves the radial highlight with normalized sunlight and safely falls back on invalid light', () => {
    const field = geometry(), right = recorder(), up = recorder(), dim = recorder();
    P.drawLaunchPadCondensation(right.ctx, field, { x: 4, y: 0, fraction: 1 });
    P.drawLaunchPadCondensation(up.ctx, field, { x: 0, y: -3, fraction: 1 });
    P.drawLaunchPadCondensation(dim.ctx, field, { x: 4, y: 0, fraction: 0.25 });
    expect(right.gradients[0].args).toEqual([0.2, 0, 0, 0, 0, 1]);
    expect(up.gradients[0].args).toEqual([0, -0.2, 0, 0, 0, 1]);
    expect(dim.gradients[0].args).toEqual([0.05, 0, 0, 0, 0, 1]);
    expect(right.paints.map(paint => paint.state.transform)).toEqual(up.paints.map(paint => paint.state.transform));
    const neutral = recorder(); P.drawLaunchPadCondensation(neutral.ctx, field);
    for (const light of [{ x: 0, y: 0, fraction: 1 }, { x: NaN, y: 1, fraction: 1 },
      { x: Number.MAX_VALUE, y: Number.MAX_VALUE, fraction: 1 }]) {
      const invalid = recorder(); P.drawLaunchPadCondensation(invalid.ctx, field, light);
      expect(serialPaints(invalid)).toEqual(serialPaints(neutral));
    }
  });

  it('rebuilds bounded scalar geometry instead of trusting edited puff diagnostics', () => {
    const field = freeze(geometry()), altered = copy(field), normal = recorder(), tampered = recorder();
    altered.sources = null; altered.puffs = [{ x: Infinity, radius: -1, lobes: [{ rx: NaN }] }];
    altered.visible = false; altered.lift = Infinity; altered.lifetime = 100000;
    P.drawLaunchPadCondensation(normal.ctx, field);
    expect(P.drawLaunchPadCondensation(tampered.ctx, altered)).toEqual(field);
    expect(serialPaints(tampered)).toEqual(serialPaints(normal));
  });

  it('rejects invalid scalars and skips invisible or fully transparent fields', () => {
    const field = geometry(), rec = recorder();
    for (const bad of [null, {}, { ...field, time: -6 }, { ...field, width: 0 }, { ...field, altitude: Infinity }]) {
      expect(P.drawLaunchPadCondensation(rec.ctx, bad)).toBeNull();
    }
    expect(P.drawLaunchPadCondensation(null, field)).toBeNull();
    for (const inactive of [geometry(4.2), geometry(-1, 1014, 400, 100000)]) {
      expect(P.drawLaunchPadCondensation(rec.ctx, inactive)).toEqual(inactive);
    }
    expect(rec.calls).toEqual([]); expect(rec.paints).toEqual([]);
    const hidden = recorder(0); expect(P.drawLaunchPadCondensation(hidden.ctx, field)).toEqual(field);
    expect(hidden.calls).toEqual([]); expect(hidden.paints).toEqual([]);
  });

  it('retains bounded translucency when radial gradients are unavailable', () => {
    const field = geometry(), rec = recorder(0.37, false); P.drawLaunchPadCondensation(rec.ctx, field);
    const lobes = field.puffs.flatMap(puff => puff.lobes);
    expect(rec.paints).toHaveLength(lobes.length); expect(rec.gradients).toEqual([]);
    rec.paints.forEach((paint, i) => {
      const opacity = rgba(paint.state.fillStyle)[3];
      expect(opacity).toBeGreaterThan(0); expect(opacity).toBeLessThan(lobes[i].opacity);
      expect(paint.state.globalAlpha).toBe(0.37);
    });
    expect(rec.state()).toEqual(rec.initial);
  });
});
