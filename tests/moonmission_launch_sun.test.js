/** The launch Sun keeps a physical disc and a screen-fixed light direction. */
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

const invalid = [undefined, null, NaN, Infinity, -Infinity, '400'];
const tau = 2 * Math.PI;

// A right triangle from the observer to the solar limb supplies an independent
// angular oracle, without using the renderer's inverse-sine expression.
function angularOracle() {
  const { sunRadius: radius, sunDistance: distance } = P.lunarEnvironment;
  return Math.atan2(radius, Math.sqrt((distance - radius) * (distance + radius)));
}
function screenDirection(local, rotation) {
  return {
    x: Math.cos(rotation) * local.x - Math.sin(rotation) * local.y,
    y: Math.sin(rotation) * local.x + Math.cos(rotation) * local.y,
  };
}

function canvas({ alpha = 0.37, gradient = 'native' } = {}) {
  const state = {
    globalAlpha: alpha, fillStyle: '#123456', strokeStyle: '#abcdef', lineWidth: 7,
    globalCompositeOperation: 'source-over', shadowBlur: 3, shadowColor: '#223344',
    transform: [1.3, 0, 0, 1.3, 17, 29], clip: 'caller-clip',
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
  if (gradient !== 'missing') methods.createRadialGradient = (...coordinates) => {
    const result = { coordinates, stops: [] };
    if (gradient === 'native') result.addColorStop = function(offset, color) { this.stops.push([offset, color]); };
    gradients.push(result);
    return gradient === 'null' ? null : result;
  };
  const ctx = new Proxy(state, {
    get(target, key) { return key in methods ? methods[key] : target[key]; },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { ctx, state, initial, stack, calls, fills, gradients };
}
function draw(haze = 0, options = {}, width = 640, height = 400) {
  const rec = canvas(options);
  rec.geometry = P.drawLaunchSun(rec.ctx, width, height, haze);
  return rec;
}
function signature(rec) {
  return rec.fills.map(fill => ({ alpha: fill.alpha, path: fill.path,
    style: typeof fill.style === 'string' ? fill.style : {
      coordinates: fill.style.coordinates, stops: fill.style.stops,
    } }));
}
function discFill(rec) {
  const { x, y, discRadius } = rec.geometry;
  return rec.fills.find(fill => fill.path.length === 1 && fill.path[0][0] === 'arc' &&
    fill.path[0][1] === x && fill.path[0][2] === y && fill.path[0][3] === discRadius);
}
function opaqueColor(color) {
  return typeof color === 'string' && (/^#[0-9a-f]{6}$/i.test(color) ||
    /^#[0-9a-f]{6}ff$/i.test(color) || /^rgb\([^)]*\)$/.test(color) ||
    /^rgba\([^)]*,\s*1(?:\.0+)?\)$/.test(color));
}

describe('Launch solar geometry', () => {
  it('projects the angular solar disc through the stated vertical field of view', () => {
    const geometry = P.launchSunGeometry(960, 400, 0);
    const halfAngle = angularOracle();
    const radius = 400 * Math.tan(halfAngle) * Math.sqrt(3) / 2;
    expect(geometry.angularDiameter).toBeCloseTo(2 * halfAngle, 14);
    expect(geometry.angularDiameter * 180 / Math.PI).toBeGreaterThan(0.53);
    expect(geometry.angularDiameter * 180 / Math.PI).toBeLessThan(0.54);
    expect(geometry.fieldDegrees).toBe(60);
    expect(geometry.discRadius).toBeCloseTo(radius, 12);
    expect(geometry.opticalRadius).toBeCloseTo(radius * 4, 12);
  });

  it('scales the disc with height and keeps the same screen direction on narrow canvases', () => {
    const base = P.launchSunGeometry(1000, 400, 0.5);
    const phone = P.launchSunGeometry(310, 400, 0.5);
    expect(base.x - 500).toBe(80); expect(base.y).toBe(52);
    expect(phone.x - 155).toBe(80); expect(phone.y).toBe(52);
    expect(phone.discRadius).toBe(base.discRadius);
    const doubled = P.launchSunGeometry(2000, 800, 0.5);
    for (const key of ['x', 'y', 'discRadius', 'opticalRadius', 'haloRadius']) {
      expect(doubled[key]).toBeCloseTo(base[key] * 2, 12);
    }
    expect(doubled.angularDiameter).toBe(base.angularDiameter);
    expect(doubled.haloOpacity).toBe(base.haloOpacity);
  });

  it('removes the atmospheric halo in vacuum and grows it monotonically with haze', () => {
    let previous = null;
    for (const haze of [0, 0.1, 0.25, 0.5, 0.75, 1]) {
      const geometry = P.launchSunGeometry(800, 400, haze);
      expect(geometry.haze).toBe(haze);
      expect(geometry.haloRadius - geometry.discRadius).toBeCloseTo(88 * haze, 12);
      expect(geometry.haloOpacity).toBeCloseTo(0.36 * haze * haze, 14);
      if (previous) {
        expect(geometry.haloRadius).toBeGreaterThan(previous.haloRadius);
        expect(geometry.haloOpacity).toBeGreaterThan(previous.haloOpacity);
        expect(geometry.discRadius).toBe(previous.discRadius);
      }
      previous = geometry;
    }
    expect(P.launchSunGeometry(800, 400, -4)).toEqual(P.launchSunGeometry(800, 400, 0));
    expect(P.launchSunGeometry(800, 400, 4)).toEqual(P.launchSunGeometry(800, 400, 1));
  });

  it('defaults missing and nonnumeric haze to a clear vacuum view', () => {
    const expected = P.launchSunGeometry(640, 400, 0);
    for (const haze of invalid) expect(P.launchSunGeometry(640, 400, haze)).toEqual(expected);
  });

  it('rejects nonpositive and nonfinite dimensions without emitting invalid geometry', () => {
    for (const value of [...invalid, 0, -1]) {
      expect(P.launchSunGeometry(value, 400, 0.5)).toBeNull();
      expect(P.launchSunGeometry(640, value, 0.5)).toBeNull();
    }
    for (const [width, height] of [[0.01, 0.02], [310, 400], [1920, 1080]]) {
      const geometry = P.launchSunGeometry(width, height, 0.7);
      expect(Object.values(geometry).every(Number.isFinite)).toBe(true);
      expect(geometry.discRadius).toBeGreaterThan(0);
    }
  });
});

describe('Launch sunlight in rocket coordinates', () => {
  it('points toward the fixed upper-right Sun with unit length and full illumination', () => {
    const light = P.launchSunlight(0);
    expect(light.x / light.y).toBeCloseTo(0.2 / -0.37, 14);
    expect(light.x).toBeGreaterThan(0); expect(light.y).toBeLessThan(0);
    expect(Math.hypot(light.x, light.y)).toBeCloseTo(1, 14);
    expect(light.fraction).toBe(1);
  });

  it('recovers the same screen direction through gravity turns and tumbling rotations', () => {
    const expected = { x: 0.2 / Math.hypot(0.2, 0.37), y: -0.37 / Math.hypot(0.2, 0.37) };
    for (const rotation of [-4.7, -Math.PI, -Math.PI / 2, -0.3, 0, 0.6, Math.PI / 2, 5.2]) {
      const light = P.launchSunlight(rotation), screen = screenDirection(light, rotation);
      expect(Math.hypot(light.x, light.y)).toBeCloseTo(1, 13);
      expect(light.fraction).toBe(1);
      expect(screen.x).toBeCloseTo(expected.x, 13);
      expect(screen.y).toBeCloseTo(expected.y, 13);
    }
  });

  it('returns to the same local illumination after complete turns', () => {
    for (const rotation of [-2.2, 0, 0.9, 2.8]) {
      const original = P.launchSunlight(rotation);
      for (const turns of [-5, -1, 1, 7]) {
        const repeated = P.launchSunlight(rotation + turns * tau);
        expect(repeated.x).toBeCloseTo(original.x, 12);
        expect(repeated.y).toBeCloseTo(original.y, 12);
      }
    }
  });

  it('uses the upright light direction for invalid rotations', () => {
    const expected = P.launchSunlight(0);
    for (const rotation of invalid) expect(P.launchSunlight(rotation)).toEqual(expected);
  });
});

describe('Launch solar rendering', () => {
  it('returns its geometry and finishes with a uniform opaque disc at the caller exposure', () => {
    const rec = draw(0.4);
    expect(rec.geometry).toEqual(P.launchSunGeometry(640, 400, 0.4));
    const disc = discFill(rec);
    expect(disc).toBeDefined();
    expect(opaqueColor(disc.style)).toBe(true);
    expect(disc.alpha).toBe(0.37);
    expect(disc).toBe(rec.fills.at(-1));
    expect(disc.path[0].slice(4)).toEqual([0, tau]);
  });

  it('keeps the vacuum optical glare compact without drawing a broad atmospheric halo', () => {
    const rec = draw(0);
    expect(rec.gradients).toHaveLength(1);
    const gradient = rec.gradients[0], geometry = rec.geometry;
    expect(gradient.coordinates[5]).toBeCloseTo(geometry.opticalRadius, 12);
    for (const fill of rec.fills) for (const arc of fill.path) {
      expect(arc[3]).toBeLessThanOrEqual(geometry.opticalRadius);
    }
    expect(geometry.haloOpacity).toBe(0);
    expect(discFill(rec)).toBeDefined();
  });

  it('draws a broader atmospheric glow only when haze is present', () => {
    const rec = draw(0.7), geometry = rec.geometry;
    expect(rec.gradients).toHaveLength(2);
    const radii = rec.gradients.map(gradient => gradient.coordinates[5]).sort((a, b) => a - b);
    expect(radii[0]).toBeCloseTo(geometry.opticalRadius, 12);
    expect(radii[1]).toBeCloseTo(geometry.haloRadius, 12);
    for (const gradient of rec.gradients) {
      expect(gradient.coordinates.slice(0, 2)).toEqual([geometry.x, geometry.y]);
      expect(gradient.coordinates.slice(3, 5)).toEqual([geometry.x, geometry.y]);
      expect(gradient.stops.length).toBeGreaterThanOrEqual(2);
      expect(gradient.stops.at(-1)[0]).toBe(1);
    }
    expect(discFill(rec).alpha).toBe(0.37);
  });

  it('preserves inherited exposure throughout every solar component', () => {
    for (const haze of [0, 0.25, 1]) {
      const dim = draw(haze, { alpha: 0.2 }), full = draw(haze, { alpha: 1 });
      expect(dim.fills.length).toBe(full.fills.length);
      dim.fills.forEach((fill, index) => {
        expect(fill.alpha).toBeCloseTo(full.fills[index].alpha * 0.2, 14);
        expect(fill.alpha).toBeGreaterThanOrEqual(0);
        expect(fill.alpha).toBeLessThanOrEqual(0.2);
      });
    }
  });

  it('restores caller styles, transform, clipping and alpha with balanced save and restore', () => {
    for (const haze of [0, 0.5, 1]) {
      const rec = draw(haze);
      expect(rec.state).toEqual(rec.initial);
      expect(rec.stack).toEqual([]);
      expect(rec.calls).toEqual(['save', 'restore']);
    }
  });

  it('retains the opaque disc when the gradient factory or color-stop API is absent', () => {
    for (const gradient of ['missing', 'null', 'incomplete']) {
      const rec = draw(0.8, { gradient });
      const disc = discFill(rec);
      expect(disc).toBeDefined();
      expect(opaqueColor(disc.style)).toBe(true);
      expect(disc.alpha).toBe(0.37);
      expect(rec.state).toEqual(rec.initial);
      expect(rec.stack).toEqual([]);
    }
  });

  it('does no Canvas work for invalid dimensions and leaves the caller untouched', () => {
    for (const [width, height] of [[0, 400], [640, -1], [NaN, 400], [640, Infinity]]) {
      const rec = draw(0.5, {}, width, height);
      expect(rec.geometry).toBeNull();
      expect(rec.calls).toEqual([]); expect(rec.fills).toEqual([]); expect(rec.gradients).toEqual([]);
      expect(rec.state).toEqual(rec.initial);
    }
  });

  it('applies the same clamped haze to rendering as to geometry', () => {
    expect(signature(draw(-1))).toEqual(signature(draw(0)));
    expect(signature(draw(2))).toEqual(signature(draw(1)));
    for (const haze of invalid) expect(signature(draw(haze))).toEqual(signature(draw(0)));
  });
});

describe('Launch rocket material', () => {
  it('moves cylinder illumination with the local Sun and recovers it after a complete turn', () => {
    function material(rotation) {
      const ctx = { createLinearGradient: (...coordinates) => ({ coordinates, stops: [],
        addColorStop(offset, color) { this.stops.push([offset, color]); } }) };
      return P.saturnMaterialGradient(ctx, 0, 0, 100, 10, 10, '#ffffff', P.launchSunlight(rotation));
    }
    const upright = material(0), inverted = material(Math.PI), complete = material(tau);
    expect(upright.stops).toEqual(complete.stops);
    expect(upright.stops).not.toEqual(inverted.stops);
    const channel = color => Number(color.match(/^rgb\((\d+),/)[1]);
    expect(channel(upright.stops.at(-1)[1])).toBeGreaterThan(channel(upright.stops[0][1]));
    expect(channel(inverted.stops.at(-1)[1])).toBeLessThan(channel(inverted.stops[0][1]));
    upright.stops.forEach(([offset, color], index) => {
      expect(inverted.stops.at(-index - 1)[0]).toBeCloseTo(1 - offset, 14);
      expect(inverted.stops.at(-index - 1)[1]).toBe(color);
    });
  });
});
