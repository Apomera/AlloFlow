import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeAll(() => { resetStemLab(); loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission'); P = window.MoonMissionPure; });
function context() {
  const calls = [], gradient = () => ({ addColorStop(...args) { calls.push(['addColorStop', ...args]); } });
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key === 'measureText') return text => ({ width: text.length * 6 });
      if (/^create.*Gradient$/.test(key)) return (...args) => { calls.push([key, ...args]); return gradient(); };
      return target[key] || ((...args) => { calls.push([key, ...args]); });
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { ctx, calls };
}
function stack({ x = 200, y = 180, heading = 0, length = 78, thrust = P.tliPhysics.thrust } = {}) {
  const c = context(); return { ...c, g: P.drawTliStack(c.ctx, x, y, heading, length, thrust) };
}
function closePoint(point, x, y) { expect(point.x).toBeCloseTo(x, 10); expect(point.y).toBeCloseTo(y, 10); }

describe('proportioned retained TLI assembly', () => {
  it('retains the CSM, closed SLA, instrument unit and S-IVB with one centered engine bell', () => {
    const { g } = stack({ length: 81 });
    expect(g.sections).toEqual(['cm', 'sm', 'sla', 'iu', 's4b']);
    // The retained body is 29 model metres; its J-2 bell adds 3.4 metres.
    expect(g.k).toBeCloseTo(81 / 32.4, 12);
    expect(Math.hypot(g.nose.x - g.nozzle.x, g.nose.y - g.nozzle.y)).toBeCloseTo(81, 10);
    closePoint(g.nose, 240.5, 180); closePoint(g.nozzle, 159.5, 180);
    expect(g.plumeHalfWidth).toBeGreaterThan(2.1 * g.k / 2);
  });

  it('rotates the hardware and exhaust together around the measured craft position', () => {
    for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.71]) {
      const { g } = stack({ x: 143, y: 97, heading, length: 64 });
      closePoint(g.nose, 143 + 32 * Math.cos(heading), 97 + 32 * Math.sin(heading));
      closePoint(g.nozzle, 143 - 32 * Math.cos(heading), 97 - 32 * Math.sin(heading));
      closePoint(g.plumeTip, g.nozzle.x - g.plumeLength * Math.cos(heading), g.nozzle.y - g.plumeLength * Math.sin(heading));
      expect((g.nose.x + g.nozzle.x) / 2).toBeCloseTo(143, 10);
      expect((g.nose.y + g.nozzle.y) / 2).toBeCloseTo(97, 10);
    }
  });

  it('bounds drawing size and rejects non-finite dimensions', () => {
    for (const [input, length] of [[-100, 24], [0, 24], [24, 24], [54, 54], [120, 120], [9999, 120], [NaN, 72], [Infinity, 72], [-Infinity, 72]]) {
      const { g } = stack({ length: input });
      expect(g.length).toBe(length);
      expect(Number.isFinite(g.k + g.nose.x + g.nose.y + g.nozzle.x + g.nozzle.y)).toBe(true);
    }
  });

  it('gates exhaust on valid positive thrust and caps its illustrative intensity', () => {
    for (const thrust of [0, -1, NaN, Infinity, -Infinity]) {
      const { g } = stack({ thrust });
      expect(g.plume).toBe(false); expect(g.thrustFraction).toBe(0);
      expect(g.plumeLength).toBe(0); expect(g.plumeHalfWidth).toBe(0);
      expect(g.plumeTip).toEqual(g.nozzle);
    }
    const full = stack().g, quarter = stack({ thrust: P.tliPhysics.thrust / 4 }).g;
    expect(full.plume).toBe(true); expect(full.thrustFraction).toBe(1);
    expect(quarter.plume).toBe(true); expect(quarter.thrustFraction).toBe(.25);
    expect(quarter.plumeLength).toBeCloseTo(full.plumeLength / 2, 12);
    expect(stack({ thrust: P.tliPhysics.thrust * 2 }).g).toEqual(full);
  });

  it('keeps constant-thrust exhaust steady as acceleration rises and switches it off at every plan cutoff', () => {
    for (const duration of [300, 342, 350]) {
      const profile = P.tliProfile({ duration });
      const initial = P.tliSample(profile, 0), late = P.tliSample(profile, duration - .1);
      expect(late.mass).toBeLessThan(initial.mass); expect(late.properAcceleration).toBeGreaterThan(initial.properAcceleration);
      const startGeometry = stack({ thrust: initial.thrust }).g, lateGeometry = stack({ thrust: late.thrust }).g;
      expect(startGeometry.plume).toBe(true); expect(lateGeometry).toEqual(startGeometry);
      for (const time of [duration, duration + 10]) {
        const sample = P.tliSample(profile, time), cutoff = stack({ thrust: sample.thrust }).g;
        expect(sample.thrust).toBe(0); expect(cutoff.plume).toBe(false); expect(cutoff.plumeLength).toBe(0);
      }
    }
  });

  it('centers the stack on the unchanged trajectory point with equal scene axes in either camera', () => {
    for (const duration of [300, 342, 350]) {
    const profile = P.tliProfile({ duration });
    for (const view of ['burn', 'orbit']) for (const width of [204, 288, 500, 984]) for (const time of [0, duration / 2, duration - .1, duration]) {
      const sample = P.tliSample(profile, time), before = JSON.stringify(sample);
      const g = P.drawTliScene(context().ctx, width, 360, sample, profile, { view, orbitTime: 9245.011304324662 });
      expect(g.scaleX).toBe(g.scaleY); expect(g.stack.length).toBeGreaterThanOrEqual(54); expect(g.stack.length).toBeLessThanOrEqual(78);
      expect(g.plume).toBe(time < duration); expect(g.stack.plume).toBe(g.plume);
      closePoint({ x: (g.stack.nose.x + g.stack.nozzle.x) / 2, y: (g.stack.nose.y + g.stack.nozzle.y) / 2 }, g.craftX, g.craftY);
      closePoint(g.stack.nose, g.craftX + Math.cos(g.heading) * g.stack.length / 2, g.craftY + Math.sin(g.heading) * g.stack.length / 2);
      const tips = [-1, 1].map(sign => ({ x: g.stack.plumeTip.x - sign * Math.sin(g.heading) * g.stack.plumeHalfWidth, y: g.stack.plumeTip.y + sign * Math.cos(g.heading) * g.stack.plumeHalfWidth }));
      const arrow = { x: g.craftX + Math.cos(g.heading) * (g.stack.length / 2 + 25), y: g.craftY + Math.sin(g.heading) * (g.stack.length / 2 + 25) };
      for (const point of [g.stack.nose, g.stack.nozzle, g.stack.plumeTip, ...tips, arrow]) {
        expect(point.x).toBeGreaterThan(0); expect(point.x).toBeLessThan(width);
        expect(point.y).toBeGreaterThan(35); expect(point.y).toBeLessThan(320);
      }
      expect(JSON.stringify(sample)).toBe(before);
    }
    }
  });

  it('redraws deterministically with finite path coordinates and balanced canvas saves', () => {
    const a = stack({ heading: .83 }), b = stack({ heading: .83 });
    expect(a.g).toEqual(b.g); expect(a.calls).toEqual(b.calls);
    const pathCalls = a.calls.filter(call => ['moveTo', 'lineTo', 'rect', 'fillRect', 'translate', 'rotate'].includes(call[0]));
    expect(pathCalls.length).toBeGreaterThan(20);
    expect(pathCalls.every(call => call.slice(1).every(Number.isFinite))).toBe(true);
    expect(a.calls.filter(call => call[0] === 'save').length).toBe(a.calls.filter(call => call[0] === 'restore').length);
  });
});
