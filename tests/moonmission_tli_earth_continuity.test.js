/** Earth rotation and the physical atmosphere stay continuous through departure. */
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const EARTH = 6371000;
const SIDEREAL_DAY = 86164;
const SUN = Math.asin(695700000 / 149597870700);
let P;
beforeAll(() => {
  resetStemLab();
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});

function recordingCtx() {
  const commands = [], properties = { globalAlpha: 1 };
  const ctx = new Proxy(properties, {
    get(target, key) {
      if (/^create(?:Linear|Radial|Conic)Gradient$/.test(String(key))) return (...coords) => ({
        addColorStop(offset, color) { commands.push(['stop', key, ...coords, offset, color]); },
      });
      if (key === 'measureText') return text => ({ width: String(text).length * 6 });
      return key in target ? target[key] : (...args) => commands.push(['call', key, ...args]);
    },
    set(target, key, value) { target[key] = value; commands.push(['set', key, value]); return true; },
  });
  return { ctx, commands };
}

// Integrate the solar disc in angular strips. The center separation comes from
// the physical surface-normal/Sun dot product, independently of the helper's
// conversion to its eclipse coordinate system and analytic lens formula.
function sunlightOracle(height, nx, ny, sunAngle) {
  const length = Math.hypot(nx, ny);
  const dot = (nx * Math.cos(sunAngle) + ny * Math.sin(sunAngle)) / length;
  const separation = Math.acos(Math.max(-1, Math.min(1, -dot)));
  const earthAngle = Math.asin(EARTH / (EARTH + height));
  const count = 20000, width = 2 * SUN / count;
  let hiddenArea = 0;
  for (let i = 0; i < count; i++) {
    const x = -SUN + (i + 0.5) * width;
    const solarHalfHeight = Math.sqrt(Math.max(0, SUN * SUN - x * x));
    const earthHalfHeight = Math.sqrt(Math.max(0, earthAngle * earthAngle - (x - separation) ** 2));
    hiddenArea += 2 * Math.min(solarHalfHeight, earthHalfHeight) * width;
  }
  return Math.max(0, Math.min(1, 1 - hiddenArea / (Math.PI * SUN * SUN)));
}

describe('Earth rotation clock', () => {
  it('advances a quarter turn each quarter sidereal day and wraps after a full day', () => {
    for (const fraction of [0, 0.125, 0.25, 0.5, 0.75, 0.999]) {
      expect(P.earthRotationTick(SIDEREAL_DAY * fraction) * 0.0458).toBeCloseTo(360 * fraction, 10);
    }
    expect(P.earthRotationTick(SIDEREAL_DAY)).toBe(0);
    for (const seconds of [0, 13.5, 1835, 9245.011304324662, 85000]) {
      for (const days of [1, 2, 1000]) {
        expect(P.earthRotationTick(seconds + SIDEREAL_DAY * days)).toBeCloseTo(P.earthRotationTick(seconds), 7);
      }
    }
  });

  it('continues beyond the parking clock cap and keeps all finite positive times bounded', () => {
    const rate = 360 / SIDEREAL_DAY / 0.0458;
    const atCap = P.earthRotationTick(1000000);
    expect(P.earthRotationTick(1000342) - atCap).toBeCloseTo(342 * rate, 10);
    for (const seconds of [1000001, 1e12, Number.MAX_VALUE]) {
      const tick = P.earthRotationTick(seconds);
      expect(Number.isFinite(tick)).toBe(true);
      expect(tick).toBeGreaterThanOrEqual(0);
      expect(tick).toBeLessThan(360 / 0.0458);
    }
    // The numeric tick wraps, but the rendered geographic orientation is continuous.
    const before = P.earthRotationTick(SIDEREAL_DAY - 0.001) * 0.0458 * Math.PI / 180;
    const after = P.earthRotationTick(SIDEREAL_DAY + 0.001) * 0.0458 * Math.PI / 180;
    expect(Math.hypot(Math.cos(before) - Math.cos(after), Math.sin(before) - Math.sin(after))).toBeLessThan(2e-7);
  });

  it('normalizes negative, missing, nonnumeric, and nonfinite times to zero', () => {
    for (const seconds of [undefined, null, false, true, '', '1835', {}, [], NaN, Infinity, -Infinity, -1]) {
      expect(P.earthRotationTick(seconds)).toBe(0);
    }
  });
});

describe('TLI Earth clock continuity', () => {
  it('starts at the saved parking orientation and advances through burn and cutoff in either camera', () => {
    const profile = P.tliProfile({ duration: 342 });
    for (const orbitTime of [0, 1835, 9245.011304324662, 999900, 1000000]) {
      for (const time of [0, 171, 342]) {
        const sample = Object.freeze(P.tliSample(profile, time));
        for (const view of ['burn', 'orbit']) {
          const record = recordingCtx();
          const scene = P.drawTliScene(record.ctx, 984, 360, sample, profile, { orbitTime, view });
          expect(scene.earthTick).toBeCloseTo(P.earthRotationTick(orbitTime + time), 12);
          if (time === 0) expect(scene.earthTick).toBe(P.earthRotationTick(P.orbitSnapshot(orbitTime).time));
          for (const command of record.commands) for (const arg of command) {
            if (typeof arg === 'number') expect(Number.isFinite(arg)).toBe(true);
          }
        }
      }
    }
  });

  it('normalizes the parking and elapsed clocks separately before adding them', () => {
    const profile = P.tliProfile({ duration: 342 }), base = P.tliSample(profile, 171);
    for (const orbitTime of [undefined, '1835', -1, Infinity, 1000500]) {
      for (const time of [undefined, '171', -1, Infinity, 171, 1000342]) {
        const sample = Object.freeze({ ...base, time }), before = JSON.stringify(sample);
        const scene = P.drawTliScene(recordingCtx().ctx, 390, 360, sample, profile, { orbitTime, view: 'burn' });
        const elapsed = Number.isFinite(time) && time >= 0 ? time : 0;
        expect(scene.earthTick).toBe(P.earthRotationTick(P.orbitSnapshot(orbitTime).time + elapsed));
        expect(JSON.stringify(sample)).toBe(before);
      }
    }
  });
});

describe('Sunlit atmospheric limb', () => {
  it('has a finite 60 km extent and rejects malformed coordinates without inventing light', () => {
    for (const height of [undefined, null, false, true, '', '8500', {}, [], NaN, Infinity, -Infinity, -1, 0, 60000.1]) {
      expect(P.earthLimbAtmosphere(height, 1, 0, 0)).toBeNull();
    }
    for (const invalid of [undefined, null, false, true, '', '1', {}, [], NaN, Infinity, -Infinity]) {
      expect(P.earthLimbAtmosphere(8500, invalid, 1, 0)).toBeNull();
      expect(P.earthLimbAtmosphere(8500, 1, invalid, 0)).toBeNull();
      expect(P.earthLimbAtmosphere(8500, 1, 0, invalid)).toBeNull();
    }
    expect(P.earthLimbAtmosphere(8500, 0, 0, 0)).toBeNull();
    expect(P.earthLimbAtmosphere(60000, 1, 0, 0).alpha).toBeGreaterThan(0);
  });

  it('falls by one e-fold per 8.5 km in daylight and has no glowing nightside floor', () => {
    let previous = Infinity;
    for (const height of [1, 2000, 4000, 8500, 17000, 25500, 34000, 46000, 60000]) {
      const day = P.earthLimbAtmosphere(height, 1, 0, 0);
      const night = P.earthLimbAtmosphere(height, -1, 0, 0);
      expect(day.height).toBe(height); expect(day.fraction).toBe(1);
      expect(day.alpha).toBeCloseTo(0.68 * Math.exp(-height / 8500), 12);
      expect(day.alpha).toBeLessThan(previous); previous = day.alpha;
      expect(day.alpha).toBeLessThanOrEqual(0.68);
      expect(day.color).toMatch(/^rgba\(\d+,\d+,\d+,[\d.e+-]+\)$/);
      const [red, green, blue, alpha] = day.color.slice(5, -1).split(',').map(Number);
      expect(red).toBeGreaterThanOrEqual(53); expect(red).toBeLessThanOrEqual(114);
      expect(green).toBeGreaterThan(red); expect(blue).toBeGreaterThan(green);
      expect(alpha).toBeCloseTo(day.alpha, 4);
      expect(night.fraction).toBe(0); expect(night.alpha).toBe(0);
    }
    expect(P.earthLimbAtmosphere(17000, 1, 0, 0).alpha / P.earthLimbAtmosphere(8500, 1, 0, 0).alpha).toBeCloseTo(1 / Math.E, 12);
    expect(P.earthLimbAtmosphere(60000, 1, 0, 0).alpha).toBeLessThan(0.001);
  });

  it('rotates the Sun and normal together and normalizes the surface direction', () => {
    for (const height of [1000, 8500, 60000]) for (const angle of [0, 0.73, Math.PI / 2, Math.PI, -2.1]) {
      for (const theta of [0, Math.PI / 2, Math.PI / 2 + 0.06, Math.PI]) {
        const baseline = P.earthLimbAtmosphere(height, Math.cos(theta), Math.sin(theta), 0);
        for (const size of [0.01, 1, 234]) {
          const actual = P.earthLimbAtmosphere(height, size * Math.cos(theta + angle), size * Math.sin(theta + angle), angle);
          expect(actual.fraction).toBeCloseTo(baseline.fraction, 7);
          expect(actual.alpha).toBeCloseTo(baseline.alpha, 7);
        }
      }
    }
  });

  it('matches independent solar-disc integration on both sides of the twilight limb', () => {
    for (const height of [1000, 8500, 34000]) {
      const earthAngle = Math.asin(EARTH / (EARTH + height));
      for (const offset of [-0.8, -0.3, 0, 0.4, 0.8]) for (const side of [-1, 1]) {
        const theta = side * (Math.PI - earthAngle - SUN * offset), sunAngle = 0.71;
        const nx = Math.cos(theta + sunAngle), ny = Math.sin(theta + sunAngle);
        const actual = P.earthLimbAtmosphere(height, nx, ny, sunAngle);
        const expected = sunlightOracle(height, nx, ny, sunAngle);
        expect(actual.fraction).toBeGreaterThan(0); expect(actual.fraction).toBeLessThan(1);
        expect(Math.abs(actual.fraction - expected)).toBeLessThan(0.00003);
        expect(actual.alpha).toBeCloseTo(actual.fraction * 0.68 * Math.exp(-height / 8500), 12);
      }
    }
  });

  it('keeps high atmosphere illuminated after the lower limb enters Earth shadow', () => {
    const theta = Math.PI / 2 + 0.05, nx = Math.cos(theta), ny = Math.sin(theta);
    const low = P.earthLimbAtmosphere(1000, nx, ny, 0);
    const high = P.earthLimbAtmosphere(34000, nx, ny, 0);
    expect(low.fraction).toBe(0); expect(low.alpha).toBe(0);
    expect(high.fraction).toBe(1); expect(high.alpha).toBeGreaterThan(0);
  });
});
