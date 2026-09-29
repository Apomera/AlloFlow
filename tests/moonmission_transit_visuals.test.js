import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';

function recorder() {
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

function sample(time, x, y, moonX, moonY) {
  return { time, x, y, moonX, moonY, vx: 900, vy: 700, moonVx: -400, moonVy: 850,
    moonDistance: Math.hypot(x - moonX, y - moonY), earthDistance: Math.hypot(x, y),
    thrust: 0, thrustX: 0, thrustY: 0, engineOn: false, phase: 'coast' };
}

let P, profile;
beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
  const rows = [sample(0, 10000000, 5000000, 350000000, 160000000),
    sample(86400, 200000000, 80000000, 330000000, 190000000),
    sample(220000, 330000000, 200000000, 310000000, 228000000)];
  profile = { samples: rows, events: { ignition: null, cutoff: null, closest: rows[2] }, summary: { actualBurn: 0 } };
});
afterEach(() => vi.restoreAllMocks());

describe('trans-lunar coast physical visual contract', () => {
  it('keeps body centers and craft position fixed when the body-size exaggeration changes', () => {
    const state = profile.samples[1];
    for (const width of [280, 320, 1100]) {
      const actual = P.drawTransitScene(recorder().ctx, width, 340, state, profile, { view: 'system', trueScale: true });
      const enlarged = P.drawTransitScene(recorder().ctx, width, 340, state, profile, { view: 'system', trueScale: false });
      for (const key of ['earthX', 'earthY', 'moonX', 'moonY', 'craftX', 'craftY', 'pictureScale']) expect(actual[key]).toBe(enlarged[key]);
      expect((actual.moonX - actual.earthX) / actual.pictureScale).toBeCloseTo(state.moonX, 4);
      expect((actual.earthY - actual.moonY) / actual.pictureScale).toBeCloseTo(state.moonY, 4);
      expect((actual.craftX - actual.earthX) / actual.pictureScale).toBeCloseTo(state.x, 4);
      expect(actual.earthRadius / actual.pictureScale).toBeCloseTo(P.transit.earthRadius, 4);
      expect(actual.moonRadius / actual.pictureScale).toBeCloseTo(P.transit.moonRadius, 4);
    }
  });

  it('uses the simultaneous lunar position for every point in the Moon-relative history', () => {
    const state = profile.samples[1], first = profile.samples[0], canvas = recorder();
    const view = P.drawTransitScene(canvas.ctx, 390, 340, state, profile, { view: 'moon', trueScale: true });
    expect((view.craftX - view.moonX) / view.pictureScale).toBeCloseTo(state.x - state.moonX, 4);
    expect((view.moonY - view.craftY) / view.pictureScale).toBeCloseTo(state.y - state.moonY, 4);
    const historicalX = view.moonX + (first.x - first.moonX) * view.pictureScale;
    const historicalY = view.moonY - (first.y - first.moonY) * view.pictureScale;
    expect(canvas.calls.some((row) => row[0] === 'moveTo' && Math.abs(row[1] - historicalX) < 1e-9 && Math.abs(row[2] - historicalY) < 1e-9)).toBe(true);
  });

  it('points the nozzle opposite actual MCC thrust and draws no plume during coasting', () => {
    const state = { ...profile.samples[1], thrust: 500, thrustX: 300, thrustY: -400, engineOn: true };
    const a = recorder(), b = recorder();
    const first = P.drawTransitScene(a.ctx, 390, 340, state, profile);
    const second = P.drawTransitScene(b.ctx, 390, 340, state, profile);
    expect(first).toEqual(second);
    expect(a.calls).toEqual(b.calls);
    expect(Math.cos(first.craftAngle) * state.thrustX + Math.sin(first.craftAngle) * -state.thrustY).toBeCloseTo(-state.thrust, 8);
    expect(first.plumeVisible).toBe(true);
    expect(P.drawTransitScene(recorder().ctx, 390, 340, profile.samples[1], profile).plumeVisible).toBe(false);
  });

  it('only reveals closest approach once observed or explicitly previewed', () => {
    expect(P.drawTransitScene(recorder().ctx, 390, 340, profile.samples[1], profile).closestShown).toBe(false);
    expect(P.drawTransitScene(recorder().ctx, 390, 340, profile.samples[1], profile, { preview: true }).closestShown).toBe(true);
    expect(P.drawTransitScene(recorder().ctx, 390, 340, profile.samples[2], profile).closestShown).toBe(true);
  });
});
