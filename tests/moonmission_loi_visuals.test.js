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

describe('lunar orbit insertion visual contract', () => {
  it('keeps equal distance axes and truncates a blocked Earth ray at the physical lunar limb', () => {
    for (const width of [280, 320, 1100]) {
      for (const x of [-2 * P.loi.radius, 2 * P.loi.radius]) {
        const sample = { time: 0, x, y: P.loi.radius * 0.25, vx: 0, vy: 2000,
          engineOn: false, thrust: 0, radioVisible: x < 0 };
        const profile = { samples: [sample], events: {} };
        const result = P.drawLOIScene(canvasRecorder().ctx, width, 340, sample, profile);
        expect((result.craftX - result.moonX) / result.pictureScale).toBeCloseTo(sample.x, 5);
        expect((result.moonY - result.craftY) / result.pictureScale).toBeCloseTo(sample.y, 5);
        expect(result.moonRadius / result.pictureScale).toBeCloseTo(P.loi.radius, 5);
        expect(result.radioVisible).toBe(sample.radioVisible);
        if (sample.radioVisible) expect(result.radioEndX).toBeLessThan(result.craftX);
        else expect((result.radioEndX - result.moonX) / result.pictureScale).toBeCloseTo(Math.sqrt(P.loi.radius ** 2 - sample.y ** 2), 5);
      }
    }
  });

  it('repaints identical powered snapshots and removes the SPS plume when thrust stops', () => {
    const radius = P.loi.radius;
    const sample = { time: 100, x: radius * 1.1, y: 0, vx: -200, vy: 2200,
      engineOn: true, thrust: 91000, radioVisible: false };
    const profile = { samples: [sample], events: {} };
    const first = canvasRecorder(), second = canvasRecorder();
    const a = P.drawLOIScene(first.ctx, 390, 340, sample, profile);
    const b = P.drawLOIScene(second.ctx, 390, 340, sample, profile);
    expect(first.calls).toEqual(second.calls);
    expect(a).toEqual(b);
    expect(a.plumeVisible).toBe(true);
    expect(P.drawLOIScene(canvasRecorder().ctx, 390, 340, { ...sample, engineOn: false, thrust: 0 }, profile).plumeVisible).toBe(false);
    expect(P.drawLOIScene(canvasRecorder().ctx, 390, 340, { ...sample, thrust: 0 }, profile).plumeVisible).toBe(false);
  });

  it('renders the measured capture, flyby and impact profiles without altering their state', () => {
    for (const plan of [{}, { burnDuration: 0 }, { burnDuration: 600 }]) {
      const profile = P.loiProfile(plan);
      for (const time of [profile.events.ignition.time, profile.summary.duration]) {
        const sample = P.loiSample(profile, time), original = JSON.stringify(sample);
        const result = P.drawLOIScene(canvasRecorder().ctx, 320, 340, sample, profile);
        expect(result.plumeVisible).toBe(sample.engineOn && sample.thrust > 0);
        expect(result.radioVisible).toBe(sample.radioVisible);
        expect(result.craftX).toBeGreaterThan(0);
        expect(result.craftX).toBeLessThan(320);
        expect(result.craftY).toBeGreaterThan(0);
        expect(result.craftY).toBeLessThan(340);
        expect(JSON.stringify(sample)).toBe(original);
      }
    }
  });

  it('keeps the near-side atlas separate and positions Tranquility Base using geographic coordinates', () => {
    for (const width of [280, 320, 1100]) {
      const recorder = canvasRecorder();
      const result = P.drawLunarAtlas(recorder.ctx, width, 260, { labels: true });
      const expected = P.moonProject(23.473, 0.674, result.moonX, result.moonY, result.moonRadius);
      expect(result.siteX).toBeCloseTo(expected[0], 9);
      expect(result.siteY).toBeCloseTo(expected[1], 9);
      const labels = recorder.calls.filter((row) => row[0] === 'fillText').map((row) => row[1]);
      expect(labels).toContain('NEAR-SIDE LUNAR ATLAS');
      expect(labels).toContain('Tranquility Base');
      for (const site of ['12', '14', '15', '16', '17']) expect(labels).toContain(site);
      const footer = recorder.calls.filter((row) => row[0] === 'fillText' && (String(row[1]).startsWith('Green:') || String(row[1]).includes('landing sites.')));
      expect(footer.length).toBeGreaterThan(0);
      for (const row of footer) expect(row[3]).toBeLessThan(260 - 3);
    }
  });
});
