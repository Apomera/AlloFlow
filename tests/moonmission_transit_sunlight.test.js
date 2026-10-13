import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const EARTH = 6371000, MOON = 1737400;
const SUN = Math.asin(695700000 / 149597870700);
let P;
beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  resetStemLab(); loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});
afterAll(() => vi.restoreAllMocks());

// Position each physical body from independently chosen apparent angular discs.
// Circle centers below are signed angles from the parallel +Y Sun.
function observer(earthRadius, earthCenter, moonRadius = SUN, moonCenter = Math.PI / 2) {
  const earthDistance = EARTH / Math.sin(earthRadius), moonDistance = MOON / Math.sin(moonRadius);
  const x = -earthDistance * Math.sin(earthCenter), y = -earthDistance * Math.cos(earthCenter);
  return { x, y, moonX: x + moonDistance * Math.sin(moonCenter), moonY: y + moonDistance * Math.cos(moonCenter) };
}

// Independent midpoint strip integration. This uses sampled silhouettes and
// never computes circle intersections, antiderivatives or analytic lens areas.
function stripFraction(discs, strips = 40000) {
  const step = 2 * SUN / strips;
  let obscured = 0;
  for (let index = 0; index < strips; index++) {
    const x = -SUN + (index + 0.5) * step;
    const solar = Math.sqrt(Math.max(0, SUN * SUN - x * x));
    let body = 0;
    for (const [radius, center] of discs) body = Math.max(body, Math.sqrt(Math.max(0, radius * radius - (x - center) ** 2)));
    obscured += Math.min(solar, body) * 2 * step;
  }
  return Math.max(0, Math.min(1, 1 - obscured / (Math.PI * SUN * SUN)));
}

function finiteTree(value) {
  for (const field of Object.values(value)) {
    if (typeof field === 'number') expect(Number.isFinite(field)).toBe(true);
    else if (field && typeof field === 'object') finiteTree(field);
  }
}

function recorder() {
  const calls = [];
  let nextGradient = 0;
  const gradient = (...args) => {
    calls.push(['gradient', ...args]);
    return { id: ++nextGradient, addColorStop: (...values) => calls.push(['stop', ...values]) };
  };
  const known = { createLinearGradient: gradient, createRadialGradient: gradient,
    measureText: text => ({ width: String(text).length * 5 }) };
  const ctx = new Proxy({}, {
    get: (target, key) => known[key] || target[key] || ((...args) => calls.push([String(key), ...args])),
    set: (target, key, value) => {
      target[key] = value; calls.push(['set', key, value && value.id ? 'gradient:' + value.id : value]); return true;
    },
  });
  return { ctx, calls };
}
function sceneFixture(position) {
  const sample = { ...position, time: 100000, vx: 900, vy: 700, moonVx: -400, moonVy: 850,
    moonDistance: Math.hypot(position.x - position.moonX, position.y - position.moonY),
    earthDistance: Math.hypot(position.x, position.y), thrust: 0, thrustX: 0, thrustY: 0, engineOn: false, phase: 'coast' };
  return { sample, profile: { samples: [{ ...sample, time: 0 }, sample], events: {}, summary: { actualBurn: 0 } } };
}

describe('outbound parallel sunlight and Earth/Moon occultation union', () => {
  it('uses actual body radii, a fixed one-au Sun and physical +Y direction', () => {
    const sample = { x: 0, y: EARTH * 2, moonX: MOON * 3, moonY: EARTH * 2 };
    const before = JSON.stringify(sample), result = P.transitSunlight(sample);
    expect(result.directionX).toBe(0); expect(result.directionY).toBe(1);
    expect(result.sunAngularRadius).toBeCloseTo(SUN, 15);
    expect(result.earth.bodyAngularRadius).toBeCloseTo(Math.PI / 6, 14);
    expect(result.moon.bodyAngularRadius).toBeCloseTo(Math.asin(1 / 3), 14);
    expect(result.earth.separation).toBe(Math.PI);
    expect(result.moon.angularCenter).toBe(Math.PI / 2);
    expect(result.phase).toBe('sunlit'); expect(result.fraction).toBe(1);
    expect(JSON.stringify(sample)).toBe(before); finiteTree(result);
  });

  it('matches independent strips for single-body partial occultation across near and distant observers', () => {
    for (const radius of [1.5, 0.2, 0.02, SUN * 2, SUN * 0.7, SUN * 0.15]) {
      for (const offset of [-0.8, -0.25, 0.25, 0.8]) {
        const center = Math.max(0, radius + offset * SUN);
        const result = P.transitSunlight(observer(radius, center));
        expect(Math.abs(result.fraction - stripFraction([[radius, center]]))).toBeLessThan(0.000025);
        expect(result.earth.fraction).toBe(result.fraction); expect(result.moon.fraction).toBe(1);
        expect(result.earth.partialMargin).toBeCloseTo(center - radius - SUN, 12);
        finiteTree(result);
      }
    }
  });

  it('integrates overlapping occultors as a union instead of multiplying or choosing their fractions', () => {
    const cases = [[0.72, -0.38, 0.67, 0.32], [1.3, -0.95, 1.1, 0.83],
      [0.45, -0.2, 0.6, 0.25], [2.5, -2.2, 0.5, 0.65], [0.7, -0.3, 0.7, 0.3]];
    for (const [er, ec, mr, mc] of cases) {
      const result = P.transitSunlight(observer(er * SUN, ec * SUN, mr * SUN, mc * SUN));
      const oracle = stripFraction([[er * SUN, ec * SUN], [mr * SUN, mc * SUN]]);
      expect(Math.abs(result.fraction - oracle)).toBeLessThan(0.000025);
      expect(result.fraction).toBeLessThanOrEqual(Math.min(result.earth.fraction, result.moon.fraction) + 1e-10);
      expect(result.phase).toBe('partial'); finiteTree(result);
    }
    const sample = P.transitSunlight(observer(SUN * 0.7, -SUN * 0.3, SUN * 0.7, SUN * 0.3));
    expect(Math.abs(sample.fraction - sample.earth.fraction * sample.moon.fraction)).toBeGreaterThan(0.005);
    expect(Math.min(sample.earth.fraction, sample.moon.fraction) - sample.fraction).toBeGreaterThan(0.1);
  });

  it('adds disjoint silhouettes and avoids counting a contained silhouette twice', () => {
    const disjoint = P.transitSunlight(observer(SUN * 0.2, -SUN * 0.55, SUN * 0.3, SUN * 0.5));
    expect(disjoint.fraction).toBeCloseTo(1 - 0.2 ** 2 - 0.3 ** 2, 11);
    const contained = P.transitSunlight(observer(SUN * 0.7, 0, SUN * 0.2, SUN * 0.25));
    expect(contained.fraction).toBeCloseTo(1 - 0.7 ** 2, 11);
    expect(contained.fraction).toBeCloseTo(contained.earth.fraction, 11);
    const identical = P.transitSunlight(observer(SUN * 0.7, SUN * 0.25, SUN * 0.7, SUN * 0.25));
    expect(identical.fraction).toBeCloseTo(1 - 0.7 ** 2, 11);
  });

  it('handles concentric annular and total eclipses with exact endpoint fractions', () => {
    for (const radius of [SUN * 0.2, SUN * 0.7]) {
      const result = P.transitSunlight(observer(radius, 0, radius * 0.5, 0));
      expect(result.phase).toBe('partial'); expect(result.fraction).toBeCloseTo(1 - (radius / SUN) ** 2, 11);
    }
    for (const radius of [SUN, SUN * 3, 1.5]) {
      const result = P.transitSunlight(observer(radius, 0));
      expect(result.phase).toBe('total'); expect(result.fraction).toBe(0);
      expect(result.earth.phase).toBe('total'); expect(result.earth.fraction).toBe(0);
      finiteTree(result);
    }
    const moonOnly = P.transitSunlight(observer(SUN, Math.PI / 2, SUN * 2, 0));
    expect(moonOnly.phase).toBe('total'); expect(moonOnly.fraction).toBe(0);
    expect(moonOnly.earth.fraction).toBe(1); expect(moonOnly.moon.fraction).toBe(0);
  });

  it('detects total coverage assembled from two individually partial eclipses', () => {
    const result = P.transitSunlight(observer(2 * SUN, -1.5 * SUN, 2 * SUN, 1.5 * SUN));
    expect(result.earth.phase).toBe('partial'); expect(result.moon.phase).toBe('partial');
    expect(result.earth.fraction).toBeGreaterThan(0); expect(result.moon.fraction).toBeGreaterThan(0);
    expect(result.phase).toBe('total'); expect(result.fraction).toBe(0);
  });

  it('changes continuously at both solar contacts and preserves geometric phase', () => {
    const radius = SUN * 3, epsilon = 1e-7;
    const first = P.transitSunlight(observer(radius, radius + SUN + epsilon));
    const entered = P.transitSunlight(observer(radius, radius + SUN - epsilon));
    const total = P.transitSunlight(observer(radius, radius - SUN - epsilon));
    const leaving = P.transitSunlight(observer(radius, radius - SUN + epsilon));
    expect(first.phase).toBe('sunlit'); expect(first.fraction).toBe(1);
    expect(entered.phase).toBe('partial'); expect(total.phase).toBe('total'); expect(leaving.phase).toBe('partial');
    expect(first.fraction - entered.fraction).toBeLessThan(0.00001);
    expect(leaving.fraction - total.fraction).toBeLessThan(0.00001);
    expect(entered.earth.partialMargin).toBeLessThan(0); expect(leaving.earth.totalMargin).toBeGreaterThan(0);
  });

  it('is reflection-symmetric and symmetric when apparent Earth and Moon discs exchange', () => {
    const values = [[0.5, -0.8, 0.9, 0.25], [1.8, -1.4, 1.2, 0.8], [0.2, 0, 0.7, 0.1]];
    for (const [er, ec, mr, mc] of values) {
      const sample = observer(er * SUN, ec * SUN, mr * SUN, mc * SUN), result = P.transitSunlight(sample);
      const reflected = P.transitSunlight({ ...sample, x: -sample.x, moonX: -sample.moonX });
      const exchanged = P.transitSunlight(observer(mr * SUN, mc * SUN, er * SUN, ec * SUN));
      expect(reflected.fraction).toBeCloseTo(result.fraction, 11); expect(reflected.phase).toBe(result.phase);
      expect(exchanged.fraction).toBeCloseTo(result.fraction, 11); expect(exchanged.phase).toBe(result.phase);
      expect(reflected.earth.angularCenter).toBeCloseTo(-result.earth.angularCenter, 12);
      expect(reflected.moon.angularCenter).toBeCloseTo(-result.moon.angularCenter, 12);
    }
  });

  it('monotonically restores sunlight as a single shadow moves off the solar disc', () => {
    for (const radius of [SUN * 0.4, SUN * 2, 0.2]) {
      let previous = -1;
      for (let step = 0; step <= 50; step++) {
        const result = P.transitSunlight(observer(radius, (radius + SUN * 1.1) * step / 50));
        expect(result.fraction).toBeGreaterThanOrEqual(previous - 1e-10); previous = result.fraction;
      }
    }
  });

  it('ignores camera, scale, velocity and engine choices and leaves frozen samples unchanged', () => {
    const sample = Object.freeze({ ...observer(SUN * 1.2, -SUN, SUN * 0.7, SUN * 0.3),
      time: 120000, vx: 100, vy: -70, moonVx: -900, moonVy: 600, engineOn: false, thrust: 0 });
    const before = JSON.stringify(sample), result = P.transitSunlight(sample);
    for (const view of ['system', 'moon']) for (const trueScale of [false, true]) {
      expect(P.transitSunlight({ ...sample, view, trueScale, pictureScale: 123, engineOn: true, thrust: 90000, vx: -400, vy: 900 })).toEqual(result);
    }
    expect(P.transitSunlight(sample)).toEqual(result); expect(JSON.stringify(sample)).toBe(before);
  });

  it('rejects malformed coordinates, surface and interior positions, and overflowing displacements', () => {
    const valid = observer(SUN, Math.PI / 2);
    for (const key of ['x', 'y', 'moonX', 'moonY']) for (const value of [undefined, null, false, true, '', '1', {}, [], NaN, Infinity, -Infinity]) {
      expect(P.transitSunlight({ ...valid, [key]: value })).toBeNull();
    }
    for (const sample of [null, undefined, {}, [], { ...valid, phase: 'impact' }, { ...valid, x: 0, y: 0 }, { ...valid, x: EARTH, y: 0 },
      { ...valid, x: EARTH * 0.5, y: 0 }, { ...valid, moonX: valid.x, moonY: valid.y },
      { ...valid, moonX: valid.x + MOON, moonY: valid.y },
      { ...valid, moonX: valid.x + MOON * 0.5, moonY: valid.y },
      { ...valid, x: Number.MAX_VALUE, y: Number.MAX_VALUE },
      { ...valid, x: Number.MAX_VALUE, moonX: -Number.MAX_VALUE }]) expect(P.transitSunlight(sample)).toBeNull();
    for (const sample of [{ x: 0, y: -EARTH - 1, moonX: 384400000, moonY: 0 },
      { x: -384400000, y: -MOON - 1, moonX: -384400000, moonY: 0 },
      { x: 1e12, y: -1e12, moonX: 384400000, moonY: 0 }]) {
      const result = P.transitSunlight(sample); expect(result).not.toBeNull(); finiteTree(result);
      expect(result.fraction).toBeGreaterThanOrEqual(0); expect(result.fraction).toBeLessThanOrEqual(1);
    }
  });

  it('produces finite visibility from measured outbound samples without mutating trajectories', () => {
    for (const plan of [{}, { speedError: -5 }, { angleError: 0.05 }, { radialDeltaV: -6.1058696657419205 }]) {
      const profile = P.transitProfile(plan);
      for (const portion of [0, 0.2, 0.5, 0.8]) {
        const sample = P.transitSample(profile, profile.summary.duration * portion), before = JSON.stringify(sample);
        const result = P.transitSunlight(sample);
        expect(result).not.toBeNull(); finiteTree(result);
        expect(result.fraction).toBeGreaterThanOrEqual(0); expect(result.fraction).toBeLessThanOrEqual(1);
        expect(JSON.stringify(sample)).toBe(before);
      }
    }
  });

  it('preserves illumination across both cameras and size choices and reconstructs the same world Sun', () => {
    const { sample, profile } = sceneFixture(observer(SUN * 1.2, -SUN, SUN * 0.7, SUN * 0.3));
    const expected = P.transitSunlight(sample), before = JSON.stringify({ sample, profile });
    for (const width of [280, 390, 1100]) for (const view of ['system', 'moon']) for (const trueScale of [false, true]) {
      for (const firing of [false, true]) {
        const state = firing ? { ...sample, engineOn: true, thrust: 500, thrustX: 300, thrustY: -400 } : sample;
        const record = recorder(), result = P.drawTransitScene(record.ctx, width, 340, state, profile, { view, trueScale });
        expect(result.sunAngle).toBe(90); expect(result.sunlight).toEqual(expected);
        expect(result.craftSunlight.fraction).toBe(expected.fraction);
        const c = Math.cos(result.craftAngle), s = Math.sin(result.craftAngle);
        expect(result.craftSunlight.x * c - result.craftSunlight.y * s).toBeCloseTo(0, 13);
        expect(result.craftSunlight.x * s + result.craftSunlight.y * c).toBeCloseTo(-1, 13);
        expect(result.plumeVisible).toBe(firing);
        expect(result.craftAngle).toBeCloseTo(firing ? Math.atan2(state.thrustY, -state.thrustX) : Math.atan2(-state.vy, state.vx) + Math.PI, 13);
        for (const row of record.calls) for (const value of row) if (typeof value === 'number') expect(Number.isFinite(value), row[0]).toBe(true);
      }
    }
    expect(JSON.stringify({ sample, profile })).toBe(before);
  });

  it('renders finite fallback materials at impact or inside a body without inventing solar visibility', () => {
    for (const position of [{ x: 0, y: EARTH - 1, moonX: 384400000, moonY: 0 }, observer(SUN, Math.PI / 2)]) {
      const { sample, profile } = sceneFixture(position);
      sample.phase = 'impact';
      const record = recorder(), result = P.drawTransitScene(record.ctx, 390, 340, sample, profile, { view: 'system' });
      expect(result.sunlight).toBeNull(); expect(result.craftSunlight).toBeNull(); expect(result.plumeVisible).toBe(false);
      for (const row of record.calls) for (const value of row) if (typeof value === 'number') expect(Number.isFinite(value), row[0]).toBe(true);
    }
  });

  it('keeps the vacuum starfield steady when inspecting different mission times', () => {
    const { sample, profile } = sceneFixture(observer(SUN, Math.PI / 2));
    const first = recorder(), second = recorder();
    P.drawTransitScene(first.ctx, 390, 340, { ...sample, time: 0 }, profile);
    P.drawTransitScene(second.ctx, 390, 340, { ...sample, time: 200000 }, profile);
    function starPrefix(record) {
      const title = record.calls.findIndex(row => row[0] === 'fillText' && row[1] === 'TRANS-LUNAR COAST');
      expect(title).toBeGreaterThan(0);
      const prefix = record.calls.slice(0, title);
      expect(prefix.filter(row => row[0] === 'arc')).toHaveLength(90);
      return prefix;
    }
    expect(starPrefix(second)).toEqual(starPrefix(first));
  });
});
