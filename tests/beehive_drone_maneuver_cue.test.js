import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
});

describe('Beehive Drone actionable spatial cue', () => {
  it('renders a direct control recommendation beside relative-position telemetry', () => {
    const html = renderTool('beehive', { beehive: {
      viewMode: 'drone',
      drone: { active: true, paused: true, difficulty: 'easy' }
    } });

    expect(html).toContain('data-beehive-flight-spatial-maneuver-card="true"');
    expect(html).toContain('Recommended correction');
    expect(html).toContain('data-flight-spatial-maneuver="true"');
    expect(html).toContain('aria-label="Recommended flight correction"');
  });

  it('derives the recommendation from the same 3D vector used for depth labels', () => {
    expect(source).toContain('function maneuverFor(cue, avoid, reached)');
    expect(source).toContain("return 'Hold position - DCA volume reached'");
    expect(source).toContain("var maneuver = spatialState === 'danger'");
    expect(source).toContain("spatialManeuver.textContent = spatial.maneuver");
    expect(source).toContain("'aria-describedby': 'beehive-flight-spatial-summary beehive-flight-spatial-maneuver'");
  });
});
