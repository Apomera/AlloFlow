import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';

let model;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission');
  model = window.MoonMissionPure.ascentDemoState;
});

describe('scripted ascent and rendezvous state', () => {
  it('keeps range consistent with altitude and along-track separation', () => {
    for (let tick = 0; tick <= 800; tick += 5) {
      const s = model(tick);
      expect(s.rangeKm).toBeCloseTo(Math.hypot(s.alongTrackKm, s.csmAltitudeKm - s.altitudeKm), 10);
      expect(s.rangeKm).toBeGreaterThanOrEqual(Math.abs(s.csmAltitudeKm - s.altitudeKm));
    }
  });

  it('closes continuously through ascent and rendezvous, with zero range only at docking', () => {
    let previous = model(0);
    for (let tick = 1; tick <= 800; tick++) {
      const next = model(tick);
      expect(next.rangeKm).toBeLessThanOrEqual(previous.rangeKm);
      expect(next.altitudeKm).toBeGreaterThanOrEqual(previous.altitudeKm);
      expect(Math.abs(next.rangeKm - previous.rangeKm)).toBeLessThan(1);
      if (tick < 780) expect(next.rangeKm).toBeGreaterThan(0);
      previous = next;
    }
    expect(model(780)).toMatchObject({ phase: 'docked', rangeKm: 0, altitudeKm: 110, alongTrackKm: 0 });
    expect(model(2000)).toEqual(model(780));
  });

  it('gains on the command module while lower, then climbs at the end', () => {
    const beginning = model(450);
    const coast = model(680);
    expect(beginning.altitudeKm).toBe(83);
    expect(coast.altitudeKm).toBe(83);
    expect(coast.rangeKm).toBeLessThan(beginning.rangeKm * 0.75);
    expect(model(750).altitudeKm).toBeGreaterThan(coast.altitudeKm);
    expect(model(-100)).toEqual(model(0));
    expect(model(NaN)).toEqual(model(0));
  });

  it('states the illustrative range and timing assumptions beside the demonstration', () => {
    const html = renderTool('moonMission', { moonMission: { missionPhase: 7 } });
    expect(html).toContain('data-ascent-model-note="true"');
    expect(html).toContain('Scripted rendezvous demonstration');
    expect(html).toContain('initial 200 km along-track gap');
  });
});
