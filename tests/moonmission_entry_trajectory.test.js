import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});

describe('Moon Mission measured entry trajectory diagram', () => {
  it('uses the same physical scale on both diagram axes at desktop and phone sizes', () => {
    const profile = P.entryProfile(-6.5);
    for (const [width, height] of [[600, 240], [320, 240], [160, 200]]) {
      const geometry = P.entryTrajectoryGeometry(profile, width, height);
      const point = P.entryTrajectoryPoint(geometry, profile.samples[0]);
      const horizontal = P.entryTrajectoryPoint(geometry, { ...profile.samples[0], downrange: 1000 });
      const vertical = P.entryTrajectoryPoint(geometry, { ...profile.samples[0], altitude: profile.samples[0].altitude + 1000 });
      expect(geometry.metersPerPixel).toBeGreaterThan(0);
      expect(Math.hypot(horizontal.px - point.px, horizontal.py - point.py) * geometry.metersPerPixel)
        .toBeCloseTo(Math.hypot(horizontal.x - point.x, horizontal.y - point.y), 6);
      expect(Math.hypot(vertical.px - point.px, vertical.py - point.py) * geometry.metersPerPixel).toBeCloseTo(1000, 6);
      expect(geometry.spanX / width).toBe(geometry.metersPerPixel);
      expect(geometry.spanY / height).toBe(geometry.metersPerPixel);
      for (const plotted of [...geometry.points, ...geometry.surface, ...geometry.interface]) {
        expect(Number.isFinite(plotted.px)).toBe(true);
        expect(Number.isFinite(plotted.py)).toBe(true);
        expect(plotted.px).toBeGreaterThanOrEqual(geometry.padding - 1e-8);
        expect(plotted.px).toBeLessThanOrEqual(width - geometry.padding + 1e-8);
        expect(plotted.py).toBeGreaterThanOrEqual(geometry.padding - 1e-8);
        expect(plotted.py).toBeLessThanOrEqual(height - geometry.padding + 1e-8);
      }
    }
  });

  it('draws curved Earth and interface arcs at their actual radii', () => {
    const geometry = P.entryTrajectoryGeometry(P.entryProfile(-6.5), 600, 240);
    for (const point of geometry.surface) expect(Math.hypot(point.x, point.y + P.entry.radius)).toBeCloseTo(P.entry.radius, 7);
    for (const point of geometry.interface) expect(Math.hypot(point.x, point.y + P.entry.radius)).toBeCloseTo(P.entry.radius + P.entry.interfaceAltitude, 7);
    expect(geometry.surface[0].x).toBe(0);
    expect(geometry.surface[0].y).toBe(0);
    expect(geometry.surface.at(-1).y).toBeLessThan(0);
  });

  it('preserves measured position and both local velocity components', () => {
    const profile = P.entryProfile(-6.5), geometry = P.entryTrajectoryGeometry(profile, 600, 240);
    for (const fraction of [0, 0.1, 0.35, 0.65, 1]) {
      const sample = P.entrySample(profile, profile.summary.duration * fraction);
      const point = P.entryTrajectoryPoint(geometry, sample);
      const radius = Math.hypot(point.x, point.y + P.entry.radius);
      const rx = point.x / radius, ry = (point.y + P.entry.radius) / radius;
      expect(radius - P.entry.radius).toBeCloseTo(sample.altitude, 7);
      expect(Math.atan2(point.x, point.y + P.entry.radius) * P.entry.radius).toBeCloseTo(sample.downrange, 6);
      expect(Math.hypot(point.vx, point.vy)).toBeCloseTo(sample.speed, 9);
      expect(point.vx * rx + point.vy * ry).toBeCloseTo(sample.speed * Math.sin(sample.gamma), 9);
      expect(point.vx * ry - point.vy * rx).toBeCloseTo(sample.speed * Math.cos(sample.gamma), 9);
      expect(point.verticalSpeed).toBeCloseTo(sample.speed * Math.sin(sample.gamma), 10);
    }
  });

  it('preserves actual milestones and never adds chute or splash events to a skip', () => {
    const nominal = P.entryProfile(-6.5), skip = P.entryProfile(-4.5);
    const nominalGeometry = P.entryTrajectoryGeometry(nominal, 600, 240);
    const skipGeometry = P.entryTrajectoryGeometry(skip, 600, 240);
    expect(nominalGeometry.events.map((event) => event.key)).toEqual(['interface', 'drogue', 'main', 'splash']);
    expect(skipGeometry.events.map((event) => event.key)).toEqual(['interface', 'skip']);
    for (const event of nominalGeometry.events.filter((event) => event.key !== 'interface')) {
      expect(event.point.time).toBe(nominal.events[event.key].time);
      expect(event.point.altitude).toBe(nominal.events[event.key].altitude);
      expect(nominalGeometry.points.some((point) => point.time === event.point.time)).toBe(true);
    }
    const end = skipGeometry.points.at(-1);
    expect(end.time).toBe(skip.summary.duration);
    expect(end.altitude).toBe(P.entry.interfaceAltitude);
    expect(end.stage).toBe('skip');
    expect(end.gamma).toBeGreaterThan(0);
    expect(end.verticalSpeed).toBeGreaterThan(0);
    expect(skipGeometry.events.at(-1).point).toEqual(end);
  });

  it('keeps geometry detached and frozen across inspection and resize', () => {
    const profile = P.entryProfile(-6.5), geometry = P.entryTrajectoryGeometry(profile, 600, 240);
    expect(P.entryTrajectoryGeometry(profile, 600, 240)).toBe(geometry);
    expect(P.entryTrajectoryGeometry(profile, 320, 240)).not.toBe(geometry);
    expect(Object.isFrozen(geometry)).toBe(true);
    for (const key of ['points', 'events', 'surface', 'interface']) {
      expect(Object.isFrozen(geometry[key])).toBe(true);
      expect(geometry[key].every((point) => Object.isFrozen(point))).toBe(true);
    }
    expect(geometry.events.every((event) => Object.isFrozen(event.point))).toBe(true);
    const endpoint = { ...profile.samples.at(-1) }, point = P.entryTrajectoryPoint(geometry, endpoint);
    endpoint.altitude = 1000;
    expect(Object.isFrozen(point)).toBe(true);
    expect(point.altitude).toBe(0);
  });

  it('distinguishes the selected guidance and retains fractional bank angles in text', () => {
    expect(P.entryPlanLabel({ version: 2, mode: 'guided', bank: 0 })).toBe('Guided lift');
    expect(P.entryPlanLabel({ version: 2, mode: 'ballistic', bank: 0 })).toBe('Ballistic — no lift');
    expect(P.entryPlanLabel({ version: 2, mode: 'bank', bank: 60 })).toBe('Fixed bank 60°');
    expect(P.entryPlanLabel({ version: 2, mode: 'bank', bank: 62.5 })).toBe('Fixed bank 62.5°');
  });
});
