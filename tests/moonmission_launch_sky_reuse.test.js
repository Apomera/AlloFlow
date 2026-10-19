/**
 * Below 20 km the launch loop holds its sky raster until the change would be visible:
 * the limb moves half a pixel or a sampled color moves more than one level. Rebuilding
 * every frame cost 4-9 ms at desktop width in the slowest part of the climb.
 * These fly the loop's cache rule over the low climb and compare every held frame with
 * a fresh build, so the saving can never become a visible error, and pin that the rule
 * really skips rebuilds and stops at its ceiling.
 */
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

// What the canvas composites: color weighted by opacity, and opacity, on 0-255.
const composited = (p, i, c) => (c === 3 ? p[i + 3] : p[i + c] * p[i + 3] / 255);

// Fly from liftoff to 25 km at 60 frames a second and a playback rate, using the
// loop's rule: rebuild when nothing is cached or the cached raster is not reusable.
function fly(width, rate) {
  const profile = P.launchProfile(), dt = rate / 60;
  let cached = null, builds = 0, held = 0, lowFrames = 0, lowBuilds = 0, worst = 0;
  for (let t = 0; t <= profile.summary.duration; t += dt) {
    const h = P.launchSample(profile, t).altitude;
    if (h >= 25000) break;
    const low = h < P.launchSkyReuseTop;
    if (low) lowFrames++;
    if (!cached || (cached.altitude !== h && !P.launchSkyReusable(cached.altitude, h, width, 400))) {
      cached = P.launchAtmosphereGeometry(h, width, 400); builds++; if (low) lowBuilds++;
      continue;
    }
    if (cached.altitude === h) continue;
    held++;
    const exact = P.launchAtmosphereGeometry(h, width, 400);
    for (let i = 0; i < exact.pixels.length; i += 4) {
      for (let c = 0; c < 4; c++) worst = Math.max(worst, Math.abs(composited(cached.pixels, i, c) - composited(exact.pixels, i, c)));
    }
  }
  return { builds, held, lowFrames, lowBuilds, worst };
}

describe('launch sky reuse below 20 km', () => {
  it('never composites a held sky more than 3 levels from a fresh build, at phone and desktop width', () => {
    for (const width of [390, 1100]) {
      for (const rate of [10, 30, 60]) {
        const run = fly(width, rate);
        expect(run.held, width + 'px ' + rate + 'x held frames').toBeGreaterThan(0);
        expect(run.worst, width + 'px ' + rate + 'x').toBeLessThanOrEqual(3);
      }
    }
  }, 120_000);   // a fresh comparison build for every held frame

  it('skips most low-altitude rebuilds at the default playback rate', () => {
    const run = fly(1100, 30);
    expect(run.lowFrames).toBeGreaterThan(100);
    expect(run.lowBuilds / run.lowFrames, 'share of low frames that rebuild').toBeLessThan(0.75);
  }, 60_000);

  it('rebuilds at its 20 km ceiling, after half a pixel of limb motion, and for unusable input', () => {
    const top = P.launchSkyReuseTop;
    expect(top).toBe(20000);
    expect(P.launchSkyReusable(top - 1, top - 0.5, 1100, 400), 'just below the ceiling').toBe(true);
    expect(P.launchSkyReusable(top - 1, top, 1100, 400), 'reaching the ceiling').toBe(false);
    expect(P.launchSkyReusable(top, top + 1, 1100, 400), 'above the ceiling').toBe(false);
    // Find the first altitude whose limb sits half a pixel below the cached one.
    const base = 8000, limb = P.launchSkyLimbY(base, 1100, 400);
    let h = base;
    while (Math.abs(P.launchSkyLimbY(h, 1100, 400) - limb) < 0.5) h += 1;
    expect(P.launchSkyReusable(base, h, 1100, 400), 'limb moved half a pixel').toBe(false);
    expect(P.launchSkyReusable(base, base, 1100, 400), 'same altitude').toBe(true);
    for (const bad of [NaN, Infinity, -1, '5000', null, undefined]) {
      expect(P.launchSkyReusable(bad, 5000, 1100, 400), 'cached ' + String(bad)).toBe(false);
      expect(P.launchSkyReusable(5000, bad, 1100, 400), 'current ' + String(bad)).toBe(false);
    }
    expect(P.launchSkyReusable(5000, 5001, 0, 400), 'no canvas').toBe(false);
  });
});
