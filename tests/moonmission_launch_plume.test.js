/** Pressure-driven illustrative exhaust, anchored to the rendered Saturn V bells. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const invalid = [undefined, null, NaN, Infinity, -Infinity, '1'];
let P;
beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

function sample(stage = 1, overrides = {}) {
  const engines = P.launch.stages[stage - 1].engines;
  return { stage, pressure: 101325, thrust: P.launch.stages[stage - 1].vacuumThrust,
    engineCount: engines, engineOn: true, altitude: 0, speed: 408, ...overrides };
}
function canvas(mode = 'native', alpha = 0.37) {
  const calls = [], fills = [], gradients = [], stack = [];
  let path = [];
  const state = { globalAlpha: alpha, fillStyle: '#123456', globalCompositeOperation: 'multiply',
    lineWidth: 7, shadowBlur: 3 };
  const ctx = new Proxy(state, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'createLinearGradient' || key === 'createRadialGradient') {
        if (mode === 'missing') return undefined;
        return (...args) => {
          calls.push([key, ...args]);
          if (mode === 'null') return null;
          const gradient = { args, stops: [], addColorStop(position, color) { this.stops.push([position, color]); } };
          gradients.push(gradient);
          return gradient;
        };
      }
      if (key === 'measureText') return value => ({ width: String(value).length * 6 });
      return (...args) => {
        calls.push([key, ...args]);
        if (key === 'save') stack.push({ ...state });
        if (key === 'restore') Object.assign(state, stack.pop());
        if (key === 'beginPath') path = [];
        if (['moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'closePath'].includes(key)) path.push([key, ...args]);
        if (key === 'fill') fills.push({ ...state, path: path.map(point => [...point]) });
      };
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { ctx, calls, fills, gradients, stack, state };
}
const alphaOf = color => Number(color.slice(color.lastIndexOf(',') + 1, -1));

describe('Launch plume geometry', () => {
  it('rejects invalid samples, pressure, thrust, scale and time before drawing', () => {
    for (const value of invalid) {
      expect(P.launchPlumeGeometry(value, 1, 10)).toBeNull();
      expect(P.launchPlumeGeometry(sample(1, { pressure: value }), 1, 10)).toBeNull();
      expect(P.launchPlumeGeometry(sample(1, { thrust: value }), 1, 10)).toBeNull();
      expect(P.launchPlumeGeometry(sample(), value, 10)).toBeNull();
      expect(P.launchPlumeGeometry(sample(), 1, value)).toBeNull();
    }
    for (const value of [-1, -0.01]) {
      expect(P.launchPlumeGeometry(sample(1, { pressure: value }), 1, 10)).toBeNull();
      expect(P.launchPlumeGeometry(sample(1, { thrust: value }), 1, 10)).toBeNull();
      expect(P.launchPlumeGeometry(sample(), value, 10)).toBeNull();
    }
    expect(P.launchPlumeGeometry(sample(), 0, 10)).toBeNull();
  });

  it('accepts only the supported stages and physically represented engine counts', () => {
    for (const stage of [...invalid, 0, 4, 1.5]) expect(P.launchPlumeGeometry({ ...sample(), stage }, 1, 10)).toBeNull();
    for (const stage of [1, 2, 3]) {
      const accepted = stage === 3 ? [0, 1] : [0, 3, 4, 5];
      for (const engines of [...invalid, -1, 0.5, 1, 2, 3, 4, 5, 6]) {
        const g = P.launchPlumeGeometry(sample(stage, { engineCount: engines }), 1, 10);
        if (!accepted.includes(engines)) expect(g).toBeNull();
        else {
          expect(g).not.toBeNull();
          expect(g.jets.reduce((sum, jet) => sum + jet.weight, 0)).toBe(engines);
          g.jets.forEach(jet => expect(jet.weight).toBeGreaterThan(0));
        }
      }
    }
  });

  it('stays silent during countdown or any engine-off condition', () => {
    for (const [row, time] of [[sample(), -0.001], [sample(1, { engineOn: false }), 10],
      [sample(1, { engineCount: 0 }), 10], [sample(1, { thrust: 0 }), 10]]) {
      const g = P.launchPlumeGeometry(row, 1.5, time), recorder = canvas();
      expect(g.active).toBe(false);
      expect(g.engineCount).toBe(0);
      expect(g.jets).toEqual([]);
      expect(g.length).toBe(0);
      expect(g.trailOpacity).toBe(0);
      expect(P.drawLaunchPlume(recorder.ctx, 100, 150, g)).toBe(g);
      expect(recorder.calls).toEqual([]);
    }
  });

  it('expands with falling measured ambient pressure, bounded at vacuum', () => {
    let previousWidth = 0, previousOpacity = Infinity;
    for (const pressure of [202650, 101325, 54048, 22632, 5475, 100, 0]) {
      const g = P.launchPlumeGeometry(sample(1, { pressure }), 1, 20);
      const ratio = Math.min(1, pressure / 101325);
      expect(g.ambientRatio).toBe(ratio);
      expect(g.expansion).toBeCloseTo(1 + 2.5 * (1 - Math.sqrt(ratio)), 12);
      expect(g.tailHalfWidth).toBeGreaterThanOrEqual(previousWidth);
      expect(g.singleOpacity).toBeLessThanOrEqual(previousOpacity);
      previousWidth = g.tailHalfWidth; previousOpacity = g.singleOpacity;
    }
    expect(P.launchPlumeGeometry(sample(1, { pressure: 0 }), 1, 20).expansion).toBe(3.5);
  });

  it('does not invent exhaust changes from vehicle altitude or speed', () => {
    const physical = sample(2, { pressure: 57 });
    const a = P.launchPlumeGeometry(physical, 1.7, 240);
    const b = P.launchPlumeGeometry({ ...physical, altitude: 500000, speed: 12000, airSpeed: 9900,
      radialSpeed: -500, tangentialSpeed: 1800 }, 1.7, 240);
    expect(b).toEqual(a);
  });

  it('projects each stage onto its actual drawn bell exits', () => {
    const center = 173, recorder = canvas();
    for (const stage of [1, 2, 3]) {
      const rocket = P.saturnV(recorder.ctx, center, 20, 180, stage);
      const g = P.launchPlumeGeometry(sample(stage), rocket.k, 70);
      const bell = stage === 1 ? 3.7 : 2.1;
      const last = rocket.sections[rocket.sections.length - 1];
      const expectedOffsets = stage === 3 ? [0] : [-0.33 * last.w1, 0, 0.33 * last.w1];
      expect(g.jets.length).toBe(expectedOffsets.length);
      g.jets.forEach((jet, index) => {
        expect(jet.x).toBeCloseTo(expectedOffsets[index], 12);
        expect(jet.mouthHalfWidth).toBeCloseTo(bell * rocket.k / 2, 12);
      });
      const exhaust = canvas();
      P.drawLaunchPlume(exhaust.ctx, center, rocket.nozzle, g);
      const outerFans = exhaust.fills.filter(fill => fill.fillStyle.stops?.[0]?.[1].startsWith(
        stage === 1 ? 'rgba(255,120,0,' : 'rgba(172,205,255,'));
      expect(outerFans.length).toBe(g.jets.length);
      outerFans.forEach((fill, index) => {
        expect(fill.path[0][0]).toBe('moveTo');
        expect(fill.path[0][1]).toBeCloseTo(center + expectedOffsets[index] - bell * rocket.k / 2, 12);
        expect(fill.path[0][2]).toBe(rocket.nozzle);
        expect(fill.path[1][1]).toBeCloseTo(center + expectedOffsets[index] + bell * rocket.k / 2, 12);
        expect(fill.path[1][2]).toBe(rocket.nozzle);
      });
    }
  });

  it('keeps the remaining engine power and jet dimensions at center-engine cutoff', () => {
    for (const stage of [1, 2]) {
      const nominal = P.launch.stages[stage - 1].vacuumThrust;
      const five = P.launchPlumeGeometry(sample(stage, { pressure: 40, thrust: nominal * 0.91 }), 1.5, 130);
      const four = P.launchPlumeGeometry(sample(stage, { pressure: 40, thrust: nominal * 0.91 * 4 / 5, engineCount: 4 }), 1.5, 130);
      expect(four.power).toBeCloseTo(five.power, 12);
      expect(four.length).toBeCloseTo(five.length, 12);
      expect(four.tailHalfWidth).toBe(five.tailHalfWidth);
      expect(five.jets.map(jet => jet.weight)).toEqual([1, 3, 1]);
      expect(four.jets.map(jet => jet.weight)).toEqual([1, 2, 1]);
      expect(four.jets[0].opacity).toBeCloseTo(five.jets[0].opacity, 12);
      expect(four.jets[2].opacity).toBeCloseTo(five.jets[2].opacity, 12);
      expect(four.jets[1].opacity).toBeLessThan(five.jets[1].opacity);
    }
  });

  it('combines projected engine opacity without multiplying brightness beyond one', () => {
    const g = P.launchPlumeGeometry(sample(), 1, 10);
    for (const jet of g.jets) {
      let remaining = 1, coreRemaining = 1;
      for (let engine = 0; engine < jet.weight; engine++) {
        remaining *= 1 - g.singleOpacity;
        coreRemaining *= 1 - g.coreSingleOpacity;
      }
      expect(jet.opacity).toBeCloseTo(1 - remaining, 12);
      expect(jet.coreOpacity).toBeCloseTo(1 - coreRemaining, 12);
      expect(jet.opacity).toBeGreaterThan(0);
      expect(jet.coreOpacity).toBeLessThanOrEqual(1);
    }
  });

  it('shows fainter hydrogen exhaust and no upper-stage atmospheric trail', () => {
    const lower = P.launchPlumeGeometry(sample(1, { pressure: 1000 }), 1, 200);
    for (const stage of [2, 3]) {
      const upper = P.launchPlumeGeometry(sample(stage, { pressure: 1000 }), 1, 200);
      expect(upper.fuel).toBe('hydrogen');
      expect(upper.singleOpacity).toBeLessThan(lower.singleOpacity);
      expect(upper.coreSingleOpacity).toBeLessThan(lower.coreSingleOpacity);
      expect(upper.length).toBeLessThan(lower.length);
      expect(upper.trailOpacity).toBe(0);
    }
    expect(lower.fuel).toBe('kerosene');
    expect(lower.trailOpacity).toBeGreaterThan(0);
    expect(P.launchPlumeGeometry(sample(1, { pressure: 0 }), 1, 200).trailOpacity).toBe(0);
  });

  it('scales all geometry without changing pressure, power or opacity', () => {
    const row = sample(1, { pressure: 5000 }), base = P.launchPlumeGeometry(row, 1, 80);
    for (const factor of [0.1, 0.5, 2, 5]) {
      const scaled = P.launchPlumeGeometry(row, factor, 80);
      for (const key of ['expansion', 'ambientRatio', 'power', 'singleOpacity', 'coreSingleOpacity', 'trailOpacity']) expect(scaled[key]).toBe(base[key]);
      for (const key of ['length', 'tailHalfWidth', 'mouthHalfWidth']) expect(scaled[key]).toBeCloseTo(base[key] * factor, 12);
      scaled.jets.forEach((jet, index) => {
        expect(jet.x).toBeCloseTo(base.jets[index].x * factor, 12);
        expect(jet.opacity).toBe(base.jets[index].opacity);
      });
    }
  });

  it('repeats a selected time exactly and keeps variation bounded through the physical flight', () => {
    const profile = P.launchProfile();
    for (let index = 0; index < profile.samples.length; index += 47) {
      const row = profile.samples[index], g = P.launchPlumeGeometry(row, 1.8, row.time);
      expect(g).toEqual(P.launchPlumeGeometry(row, 1.8, row.time));
      expect(g).not.toBeNull();
      for (const value of Object.values(g)) if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
      expect(g.power).toBeGreaterThanOrEqual(0);
      expect(g.power).toBeLessThanOrEqual(1);
      expect(g.length).toBeGreaterThanOrEqual(0);
      expect(g.length).toBeLessThan(75 * 1.8);
      expect(g.tailHalfWidth).toBeLessThan(15 * 1.8);
    }
    const row = sample(), a = P.launchPlumeGeometry(row, 1, 30), b = P.launchPlumeGeometry(row, 1, 30.1);
    expect(a.length).not.toBe(b.length);
    expect(Math.abs(a.length - b.length)).toBeLessThan(a.length * 0.07);
    expect(a.jets.map(jet => jet.x)).toEqual(b.jets.map(jet => jet.x));
  });

  it('turns exhaust off across real staging gaps and final insertion cutoff', () => {
    const profile = P.launchProfile();
    for (const time of [profile.events.stage1.time, profile.events.stage2.time, profile.summary.duration]) {
      const row = P.launchSample(profile, time), g = P.launchPlumeGeometry(row, 1.5, time), recorder = canvas();
      expect(row.engineOn).toBe(false);
      expect(g.active).toBe(false);
      P.drawLaunchPlume(recorder.ctx, 150, 200, g);
      expect(recorder.calls).toEqual([]);
    }
    for (const event of [profile.events.stage1, profile.events.stage2]) {
      const time = event.time + P.launch.stages[event.stage - 1].ignitionDelay + 0.1;
      expect(P.launchPlumeGeometry(P.launchSample(profile, time), 1.5, time).active).toBe(true);
    }
  });
});

describe('Launch plume painting', () => {
  it.each(['native', 'missing', 'null'])('preserves caller alpha, compositing and state with %s gradients', mode => {
    for (const inheritedAlpha of [0, 0.37, 1]) {
      const recorder = canvas(mode, inheritedAlpha), original = { ...recorder.state };
      const g = P.launchPlumeGeometry(sample(), 1.5, 60);
      expect(P.drawLaunchPlume(recorder.ctx, 150, 220, g)).toBe(g);
      expect(recorder.state).toEqual(original);
      expect(recorder.stack).toEqual([]);
      expect(recorder.calls.filter(call => call[0] === 'save')).toHaveLength(1);
      expect(recorder.calls.filter(call => call[0] === 'restore')).toHaveLength(1);
      expect(recorder.fills).toHaveLength(1 + g.jets.length * 2);
      recorder.fills.forEach(fill => {
        expect(fill.globalAlpha).toBe(inheritedAlpha);
        expect(fill.globalCompositeOperation).toBe(original.globalCompositeOperation);
        fill.path.forEach(call => call.slice(1).forEach(value => expect(Number.isFinite(value)).toBe(true)));
        const stops = typeof fill.fillStyle === 'string' ? [[0, fill.fillStyle]] : fill.fillStyle.stops;
        stops.forEach(([position, color]) => {
          expect(position).toBeGreaterThanOrEqual(0);
          expect(position).toBeLessThanOrEqual(1);
          expect(alphaOf(color)).toBeGreaterThanOrEqual(0);
          expect(alphaOf(color)).toBeLessThanOrEqual(1);
        });
      });
      expect(recorder.calls.some(call => ['translate', 'rotate', 'scale', 'transform', 'setTransform', 'clip'].includes(call[0]))).toBe(false);
    }
  });

  it('fades each native exhaust fan to transparent across a finite-width tail', () => {
    const recorder = canvas(), g = P.launchPlumeGeometry(sample(3, { pressure: 0 }), 1.5, 580);
    P.drawLaunchPlume(recorder.ctx, 100, 150, g);
    expect(recorder.gradients).toHaveLength(2);
    recorder.gradients.forEach(gradient => {
      expect(gradient.stops[0][0]).toBe(0);
      expect(gradient.stops[gradient.stops.length - 1][0]).toBe(1);
      expect(alphaOf(gradient.stops[gradient.stops.length - 1][1])).toBe(0);
    });
    const fan = recorder.fills[0].path, tip = 150 + g.length;
    const tail = fan.filter(call => call[call.length - 1] === tip);
    expect(tail.some(call => Math.abs(call[call.length - 2] - (100 + g.tailHalfWidth)) < 1e-9)).toBe(true);
    expect(tail.some(call => Math.abs(call[call.length - 2] - (100 - g.tailHalfWidth)) < 1e-9)).toBe(true);
  });

  it('rejects absent geometry, contexts and invalid origins without Canvas work', () => {
    const g = P.launchPlumeGeometry(sample(), 1, 50), recorder = canvas();
    expect(P.drawLaunchPlume(null, 100, 150, g)).toBeNull();
    expect(P.drawLaunchPlume(recorder.ctx, 100, 150, null)).toBeNull();
    for (const value of invalid) {
      expect(P.drawLaunchPlume(recorder.ctx, value, 150, g)).toBeNull();
      expect(P.drawLaunchPlume(recorder.ctx, 100, value, g)).toBeNull();
    }
    expect(recorder.calls).toEqual([]);
  });
});
