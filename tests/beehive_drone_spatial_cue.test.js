import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
});

describe('Beehive Drone spatial perspective cue', () => {
  it('renders an accessible depth strip beside the live route instruments', () => {
    const html = renderTool('beehive', { beehive: {
      viewMode: 'drone',
      drone: { active: true, paused: true, difficulty: 'easy' }
    } });

    expect(html).toContain('data-beehive-flight-spatial="true"');
    expect(html).toContain('3D perspective cue');
    expect(html).toContain('Closest obstacle');
    expect(html).toContain('Nearest traffic');
    expect(html).toContain('DCA volume');
    expect(html).toContain('Depth to DCA');
    expect(html).toContain('aria-label="Depth progress toward the DCA"');
    expect(html).toContain('Cockpit view');
  });

  it('derives ahead/behind, lateral, and vertical labels from the shared 3D model', () => {
    expect(source).toContain('function droneSpatialReadout(state)');
    expect(source).toContain("var lateral = Math.abs(right) < 8 ? 'centerline'");
    expect(source).toContain("var depth = Math.round(Math.abs(forward)) + ' m ' + (forward >= 0 ? 'ahead' : 'behind')");
    expect(source).toContain("var vertical = Math.abs(dy) < 8 ? 'level'");
    expect(source).toContain("'data-flight-spatial-route-meter': 'true'");
    expect(source).toContain("Spatial cue ' + spatial.primary");
  });
});
