import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function canvasRecorder() {
  const calls = [];
  let nextGradient = 0;
  const gradient = () => ({ gradientId: ++nextGradient, addColorStop: (...args) => calls.push(['stop', ...args]) });
  const known = {
    createLinearGradient: gradient,
    createRadialGradient: gradient,
    measureText: (text) => ({ width: String(text).length * 5 }),
  };
  const ctx = new Proxy({}, {
    get: (target, key) => known[key] || target[key] || ((...args) => {
      for (const value of args) if (typeof value === 'number') expect(Number.isFinite(value), String(key)).toBe(true);
      calls.push([key, ...args]);
    }),
    set: (target, key, value) => { target[key] = value; calls.push(['set', key, value && value.gradientId ? 'gradient:' + value.gradientId : value]); return true; },
  });
  return { ctx, calls };
}

let P;
beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

describe('lunar ascent physical visual contract', () => {
  it('draws deterministic snapshots with thrust only during the measured powered flight', () => {
    const profile = P.ascentProfile();
    for (const time of [-3, 0, 12, 200, profile.summary.duration]) {
      const sample = P.ascentSample(profile, time);
      const first = canvasRecorder(), second = canvasRecorder();
      const a = P.drawAscentScene(first.ctx, 390, 320, sample, profile, { time, view: 'surface' });
      const b = P.drawAscentScene(second.ctx, 390, 320, sample, profile, { time, view: 'surface' });
      expect(first.calls).toEqual(second.calls);
      expect(a).toEqual(b);
      expect(a.engineVisible).toBe(time >= 0 && sample.engineOn && sample.thrust > 0);
      expect(a.plumeVisible).toBe(a.engineVisible);
      expect(a.craftX).toBeGreaterThan(0);
      expect(a.craftX).toBeLessThan(390);
      expect(a.craftY).toBeGreaterThan(0);
      expect(a.craftY).toBeLessThan(320);
    }
  });

  it('draws a finite insertion ellipse in narrow and wide orbit views without changing the flight state', () => {
    const profile = P.ascentProfile();
    const sample = P.ascentSample(profile, profile.summary.duration);
    const original = JSON.stringify(sample);
    for (const width of [280, 390, 1100]) {
      const recorder = canvasRecorder();
      const result = P.drawAscentScene(recorder.ctx, width, 320, sample, profile, { view: 'orbit' });
      expect(result.engineVisible).toBe(false);
      expect(result.craftX).toBeGreaterThan(0);
      expect(result.craftX).toBeLessThan(width);
      expect(recorder.calls.some((row) => row[0] === 'fillText' && /Altitude.*6/.test(row[1]))).toBe(true);
      expect(JSON.stringify(sample)).toBe(original);
    }
  });

  it('keeps docking coordinates equally scaled and meets at the ports instead of craft centers', () => {
    for (const width of [390, 1100]) {
      const initial = { time: 0, x: 8, y: -120, vx: 0, vy: 0.55, propellant: 10, status: 'flying', ax: 0, ay: 0 };
      const draw = (state) => P.drawDockingPractice(canvasRecorder().ctx, width, 320, state);
      const start = draw(initial);
      expect((start.eaglePortX - start.portX) / start.pictureScale).toBeCloseTo(initial.y, 10);
      expect((start.portY - start.eaglePortY) / start.pictureScale).toBeCloseTo(initial.x, 10);
      expect(start.corridorHalfWidth / start.pictureScale).toBeCloseTo(P.docking.portTolerance, 10);
      expect(start.engineVisible).toBe(false);
      expect(start.rcsVisible).toBe(false);
      expect(draw({ ...initial, ax: 0.03 }).rcsVisible).toBe(true);
      expect(draw({ ...initial, ax: 0.03, propellant: 0 }).rcsVisible).toBe(false);
      const dock = draw({ ...initial, x: 0, y: 0, vx: 0, vy: 0, status: 'docked' });
      expect(dock.eaglePortX).toBe(dock.portX);
      expect(dock.eaglePortY).toBe(dock.portY);
      expect(dock.rcsVisible).toBe(false);
    }
  });
});
