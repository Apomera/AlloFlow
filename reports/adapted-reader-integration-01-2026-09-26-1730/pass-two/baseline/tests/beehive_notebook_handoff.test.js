import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); });

describe('Drone-to-Notebook evidence handoff', () => {
  it('turns a successful flight into concrete synthesis evidence', () => {
    const html = renderTool('beehive', {
      beehive: {
        viewMode: 'drone', notebookOpen: true,
        drone: { lastRun: { success: true, maxAlt: 180, distance: 720, energyLeft: 42, obstacleHits: 1, trafficHits: 2 } },
      },
    });

    expect(html).toContain('data-beehive-notebook-handoff="true"');
    expect(html).toContain('Flight evidence');
    expect(html).toContain('Notebook synthesis');
    expect(html).toContain('Use the successful flight as evidence');
    expect(html).toContain('180 ft');
    expect(html).toContain('720 m');
    expect(html).toContain('Hazard conflicts');
    expect(html).toContain('3');
  });

  it('frames an unsuccessful flight as a revision claim', () => {
    const html = renderTool('beehive', {
      beehive: {
        viewMode: 'drone', notebookOpen: true,
        drone: { lastRun: { success: false, maxAlt: 84, distance: 410, energyLeft: 8, obstacleHits: 0, trafficHits: 1 } },
      },
    });

    expect(html).toContain('Use the revised route as evidence');
    expect(html).toContain('410 m');
    expect(html).toContain('controllable choice');
  });
});
