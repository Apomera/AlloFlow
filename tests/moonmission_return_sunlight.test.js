import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const EARTH = 6371000;
const SUN = Math.asin(695700000 / 149597870700);
let P;
beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  resetStemLab(); loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});
afterAll(() => vi.restoreAllMocks());

function observer(earthAngle, separation) {
  const radius = EARTH / Math.sin(earthAngle);
  return { x: radius * Math.sin(separation), y: -radius * Math.cos(separation) };
}
// Independent midpoint integration of the intersecting angular-disc strips.
// The implementation uses the analytic lens area; this oracle never does.
function stripFraction(earthAngle, separation, strips = 16000) {
  const width = 2 * SUN / strips;
  let obscured = 0;
  for (let index = 0; index < strips; index++) {
    const x = -SUN + (index + 0.5) * width;
    const solarHeight = Math.sqrt(Math.max(0, SUN * SUN - x * x));
    const earthHeight = Math.sqrt(Math.max(0, earthAngle * earthAngle - (x - separation) ** 2));
    obscured += 2 * Math.min(solarHeight, earthHeight) * width;
  }
  return Math.max(0, Math.min(1, 1 - obscured / (Math.PI * SUN * SUN)));
}
function recorder() {
  const calls = [];
  let gradientId = 0;
  const gradient = (...args) => {
    calls.push(['gradient', ...args]);
    return { id: ++gradientId, addColorStop: (...values) => calls.push(['stop', ...values]) };
  };
  const known = { createLinearGradient: gradient, createRadialGradient: gradient,
    measureText: value => ({ width: String(value).length * 6 }) };
  const ctx = new Proxy({}, {
    get: (target, key) => known[key] || target[key] || ((...args) => calls.push([String(key), ...args])),
    set: (target, key, value) => {
      target[key] = value;
      calls.push(['set', key, value && value.id ? 'gradient:' + value.id : value]);
      return true;
    },
  });
  return { ctx, calls };
}
// One assertion per scene: an expect() per number made the camera test exceed 5 s.
function finiteCalls(calls) {
  expect(calls.filter(row => row.some(value => typeof value === 'number' && !Number.isFinite(value))), 'Canvas calls with non-finite numbers').toEqual([]);
}
const geometry = calls => calls.filter(row => !['set', 'gradient', 'stop'].includes(row[0]));
const alpha = calls => calls.filter(row => row[0] === 'set' && ['globalAlpha', 'globalCompositeOperation'].includes(row[1]));
function paints(calls) {
  return calls.flatMap(row => row[0] === 'stop' ? [row[2]] : row[0] === 'set' &&
    ['fillStyle', 'strokeStyle'].includes(row[1]) && !String(row[2]).startsWith('gradient:') ? [row[2]] : []);
}
function channels(value) {
  expect(value).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
  return value.slice(4, -1).split(',').map(Number);
}
function draw(cmOnly, fraction, angle = 0.71) {
  const record = recorder();
  record.result = P.drawReturnCraft(record.ctx, 200, 140, 0.52, angle, cmOnly,
    { directionX: 0, directionY: 1, fraction });
  return record;
}

describe('Earth return sunlight and opaque spacecraft materials', () => {
  it('uses the fixed parallel +Y Sun and Earth angular radius, independently of Earth phase', () => {
    for (const [sample, phase, fraction] of [
      [{ x: 0, y: EARTH * 2 }, 'sunlit', 1],
      [{ x: 0, y: -EARTH * 2 }, 'total', 0],
      [{ x: EARTH * 2, y: 0 }, 'sunlit', 1],
    ]) {
      const before = JSON.stringify(sample), result = P.returnSunlight(sample);
      expect(result.phase).toBe(phase); expect(result.fraction).toBe(fraction);
      expect(result.directionX).toBe(0); expect(result.directionY).toBe(1);
      expect(result.sunAngularRadius).toBeCloseTo(SUN, 14);
      expect(result.earthAngularRadius).toBeCloseTo(Math.PI / 6, 14);
      expect(result.partialMargin).toBeCloseTo(result.separation - Math.PI / 6 - SUN, 14);
      expect(result.totalMargin).toBeCloseTo(result.separation - Math.PI / 6 + SUN, 14);
      expect(JSON.stringify(sample)).toBe(before);
    }
    // Earth phase describes its visible hemisphere, not the light at the craft.
    expect(P.returnSunlight({ x: EARTH * 2, y: 0 }).fraction).toBe(1);
  });

  it('agrees with independent angular-disc strip integration across large and small occultors', () => {
    for (const earthAngle of [0.8, 0.05, SUN * 2, SUN, SUN * 0.7, SUN * 0.25]) {
      for (const offset of [-0.8, -0.35, 0, 0.35, 0.8]) {
        const separation = Math.max(0, earthAngle + SUN * offset);
        const sample = observer(earthAngle, separation), result = P.returnSunlight(sample);
        expect(Math.abs(result.fraction - stripFraction(earthAngle, separation))).toBeLessThan(0.00003);
        expect(result.fraction).toBeGreaterThanOrEqual(0); expect(result.fraction).toBeLessThanOrEqual(1);
        expect(result.separation).toBeCloseTo(separation, 12);
        expect(result.earthAngularRadius).toBeCloseTo(earthAngle, 12);
      }
    }
  });

  it('is continuous across outer and inner contacts with the expected phase on either side', () => {
    const earthAngle = 0.02, epsilon = 1e-7;
    const outerInside = P.returnSunlight(observer(earthAngle, earthAngle + SUN - epsilon));
    const outerOutside = P.returnSunlight(observer(earthAngle, earthAngle + SUN + epsilon));
    expect(outerInside.phase).toBe('partial'); expect(outerOutside.phase).toBe('sunlit');
    expect(outerInside.partialMargin).toBeLessThan(0); expect(outerOutside.partialMargin).toBeGreaterThan(0);
    expect(Math.abs(outerOutside.fraction - outerInside.fraction)).toBeLessThan(0.00001);
    const innerInside = P.returnSunlight(observer(earthAngle, earthAngle - SUN - epsilon));
    const innerOutside = P.returnSunlight(observer(earthAngle, earthAngle - SUN + epsilon));
    expect(innerInside.phase).toBe('total'); expect(innerOutside.phase).toBe('partial');
    expect(innerInside.totalMargin).toBeLessThan(0); expect(innerOutside.totalMargin).toBeGreaterThan(0);
    expect(Math.abs(innerOutside.fraction - innerInside.fraction)).toBeLessThan(0.00001);
  });

  it('handles concentric annular occultation and its containment boundary without a zero divisor', () => {
    for (const ratio of [0.1, 0.3, 0.7]) {
      const earthAngle = SUN * ratio, limit = SUN - earthAngle;
      for (const separation of [0, limit / 2, limit - 1e-8]) {
        const result = P.returnSunlight(observer(earthAngle, separation));
        expect(result.phase).toBe('partial'); expect(result.fraction).toBeCloseTo(1 - ratio * ratio, 10);
        for (const value of Object.values(result)) if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
      }
      const firstLens = P.returnSunlight(observer(earthAngle, limit + 1e-7));
      expect(Math.abs(firstLens.fraction - (1 - ratio * ratio))).toBeLessThan(0.00001);
      expect(Math.abs(firstLens.fraction - stripFraction(earthAngle, limit + 1e-7))).toBeLessThan(0.00003);
    }
  });

  it('is reflection-symmetric, deterministic and monotonically reveals the solar disc', () => {
    for (const earthAngle of [0.02, SUN * 0.4]) {
      let previous = -1;
      for (let step = 0; step <= 50; step++) {
        const separation = (earthAngle + SUN * 1.2) * step / 50;
        const sample = Object.freeze(observer(earthAngle, separation));
        const actual = P.returnSunlight(sample), reflection = P.returnSunlight({ x: -sample.x, y: sample.y });
        expect(reflection).toEqual(actual); expect(P.returnSunlight(sample)).toEqual(actual);
        expect(actual.fraction).toBeGreaterThanOrEqual(previous - 1e-12); previous = actual.fraction;
      }
    }
  });

  it('rejects malformed positions, points on or below Earth and overflowing radii', () => {
    const invalid = [undefined, null, false, true, '', '1', {}, [], new Number(1), NaN, Infinity, -Infinity];
    for (const value of invalid) {
      expect(P.returnSunlight({ x: value, y: EARTH * 2 })).toBeNull();
      expect(P.returnSunlight({ x: EARTH * 2, y: value })).toBeNull();
    }
    for (const sample of [null, undefined, {}, [], { x: 0, y: 0 }, { x: EARTH, y: 0 },
      { x: 0, y: -EARTH }, { x: EARTH * 0.5, y: EARTH * 0.5 },
      { x: Number.MAX_VALUE, y: Number.MAX_VALUE }]) expect(P.returnSunlight(sample)).toBeNull();
    for (const sample of [{ x: 0, y: EARTH + 1 }, { x: 0, y: -EARTH - 1 }, { x: 1e12, y: -1e12 }]) {
      const result = P.returnSunlight(sample);
      expect(result).not.toBeNull(); expect(result.fraction).toBeGreaterThanOrEqual(0); expect(result.fraction).toBeLessThanOrEqual(1);
    }
  });

  it('reprojects both spacecraft stage frames into the same physical Sun and preserves art placement', () => {
    for (const cmOnly of [false, true]) for (const velocityAngle of [-2.4, -0.3, 0, 0.71, Math.PI]) {
      const record = draw(cmOnly, 0.37, velocityAngle), result = record.result;
      const angle = velocityAngle + (cmOnly ? 0 : Math.PI), c = Math.cos(angle), s = Math.sin(angle);
      expect(result.centerX).toBe(200); expect(result.centerY).toBe(140); expect(result.scale).toBe(0.52);
      expect(result.angle).toBe(angle); expect(result.cmOnly).toBe(cmOnly); expect(result.plumeVisible).toBe(false);
      expect(result.sunlight.x * c - result.sunlight.y * s).toBeCloseTo(0, 13);
      expect(result.sunlight.x * s + result.sunlight.y * c).toBeCloseTo(-1, 13);
      expect(result.sunlight.fraction).toBe(0.37);
      expect(record.calls).toContainEqual(['translate', 200, 140]);
      expect(record.calls).toContainEqual(['rotate', angle]);
      expect(record.calls).toContainEqual(['translate', (cmOnly ? -17 : -38) * 0.52, 0]);
      expect(record.calls).toContainEqual(['scale', 0.52, 0.52]);
      finiteCalls(record.calls);
    }
  });

  it('changes only opaque material colors through eclipse while retaining every hull path and alpha operation', () => {
    for (const cmOnly of [false, true]) for (const angle of [-1.1, 0.71]) {
      const full = draw(cmOnly, 1, angle), dark = draw(cmOnly, 0, angle), partial = draw(cmOnly, 0.4, angle);
      expect(geometry(dark.calls)).toEqual(geometry(full.calls)); expect(geometry(partial.calls)).toEqual(geometry(full.calls));
      expect(alpha(dark.calls)).toEqual(alpha(full.calls)); expect(alpha(partial.calls)).toEqual(alpha(full.calls));
      expect(alpha(full.calls)).toEqual([]);
      const fullColors = paints(full.calls).map(channels), darkColors = paints(dark.calls).map(channels), middleColors = paints(partial.calls).map(channels);
      expect(darkColors).toHaveLength(fullColors.length); expect(middleColors).toHaveLength(fullColors.length);
      expect(darkColors).not.toEqual(fullColors);
      for (let index = 0; index < fullColors.length; index++) for (let channel = 0; channel < 3; channel++) {
        expect(middleColors[index][channel]).toBeGreaterThanOrEqual(darkColors[index][channel]);
        expect(middleColors[index][channel]).toBeLessThanOrEqual(fullColors[index][channel]);
      }
      expect(full.calls.filter(row => row[0] === 'drawImage')).toEqual([]);
      expect([...paints(full.calls), ...paints(dark.calls), ...paints(partial.calls)].some(value => String(value).includes('rgba'))).toBe(false);
    }
  });

  it('requires explicit CM separation and retains the legacy opaque drawing when Sun data is absent', () => {
    const unlit = recorder();
    const result = P.drawReturnCraft(unlit.ctx, 10, 20, 1, 0.3, false, null);
    expect(result.sunlight).toBeNull(); expect(result.plumeVisible).toBe(false);
    for (const invalidSun of [undefined, {}, { directionX: 0, directionY: 0, fraction: 1 }]) {
      const record = recorder();
      expect(P.drawReturnCraft(record.ctx, 10, 20, 1, 0.3, false, invalidSun)).toEqual(result);
      expect(record.calls).toEqual(unlit.calls);
    }
    for (const value of [undefined, null, 0, 1, 'true', {}]) {
      const record = recorder(), actual = P.drawReturnCraft(record.ctx, 10, 20, 1, 0.3, value, null);
      expect(actual.cmOnly).toBe(false); expect(actual.angle).toBe(0.3 + Math.PI);
      expect(record.calls).toEqual(unlit.calls);
    }
    const capsule = recorder(); P.drawReturnCraft(capsule.ctx, 10, 20, 1, 0.3, true, null);
    expect(capsule.calls.filter(row => row[0] === 'bezierCurveTo')).toEqual([]);
    // The only Bezier geometry in Columbia is its SPS bell; the separated CM omits it.
    expect(unlit.calls.some(row => row[0] === 'bezierCurveTo')).toBe(true);
  });

  it('rejects invalid craft geometry before drawing anything', () => {
    expect(P.drawReturnCraft(null, 0, 0, 1, 0, false, null)).toBeNull();
    for (const invalid of [undefined, null, false, '1', NaN, Infinity, -Infinity]) for (const index of [0, 1, 2, 3]) {
      const args = [10, 20, 1, 0.3]; args[index] = invalid;
      const record = recorder();
      expect(P.drawReturnCraft(record.ctx, ...args, false, null)).toBeNull(); expect(record.calls).toEqual([]);
    }
    for (const scale of [0, -1, Number.MAX_VALUE]) {
      const record = recorder();
      expect(P.drawReturnCraft(record.ctx, 10, 20, scale, 0.3, false, null)).toBeNull(); expect(record.calls).toEqual([]);
    }
  });

  it('shares sunlight across equal-scale return cameras through separation without changing trajectory records', () => {
    for (const angle of [-4, -6.5, -9]) {
      const profile = P.returnProfile(angle), profileBefore = JSON.stringify(profile);
      for (const time of [0, profile.summary.separationTime - 0.001, profile.summary.separationTime, profile.summary.duration]) {
        const sample = P.returnSample(profile, time), sampleBefore = JSON.stringify(sample);
        for (const [view, width] of [['system', 1000], ['approach', 300]]) {
          const record = recorder(), result = P.drawReturnScene(record.ctx, width, 400, sample, profile, { view });
          expect(result.sunlight).toEqual(P.returnSunlight(sample));
          expect(result.spacecraft.sunlight.fraction).toBe(result.sunlight.fraction);
          expect(result.spacecraft.centerX).toBe(result.craft.x); expect(result.spacecraft.centerY).toBe(result.craft.y);
          expect(result.scaleX).toBe(result.scaleY); expect(result.earthRadius).toBeCloseTo(EARTH * result.scaleX, 10);
          expect((result.craft.x - result.earth.x) / result.scaleX).toBeCloseTo(sample.x, 4);
          expect((result.earth.y - result.craft.y) / result.scaleY).toBeCloseTo(sample.y, 4);
          expect(result.cmOnly).toBe(time >= profile.summary.separationTime);
          expect(result.spacecraft.cmOnly).toBe(result.cmOnly); expect(result.plumeVisible).toBe(false);
          expect(result.velocityAngle).toBe(Math.atan2(-sample.vy, sample.vx)); finiteCalls(record.calls);
        }
        expect(JSON.stringify(sample)).toBe(sampleBefore);
      }
      expect(JSON.stringify(profile)).toBe(profileBefore);
    }
  });

  it('keeps crew-camera drawing separate from spacecraft shading and reports the same local Sun', () => {
    const profile = P.returnProfile();
    for (const width of [300, 1000]) for (const time of [0, profile.summary.separationTime, profile.summary.duration]) {
      const sample = P.returnSample(profile, time), before = JSON.stringify(sample);
      const direct = recorder(), routed = recorder();
      P.drawReturnCrewScene(direct.ctx, width, 400, sample);
      const result = P.drawReturnScene(routed.ctx, width, 400, sample, profile, { view: 'crew' });
      expect(routed.calls).toEqual(direct.calls); expect(result.sunlight).toEqual(P.returnSunlight(sample));
      expect(result.spacecraft).toBeNull(); expect(result.view).toBe('crew'); expect(result.plumeVisible).toBe(false);
      expect(result.angularRadius).toBeCloseTo(Math.asin(EARTH / sample.radius) * 180 / Math.PI, 10);
      expect(result.cmOnly).toBe(sample.serviceModuleSeparated); expect(JSON.stringify(sample)).toBe(before);
      finiteCalls(routed.calls);
    }
  });
});
