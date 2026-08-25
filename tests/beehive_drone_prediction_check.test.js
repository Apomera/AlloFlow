import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
});

describe('Colony-to-Drone prediction check', () => {
  it('turns colony condition into a controlled flight hypothesis', () => {
    const html = renderTool('beehive', {
      beehive: { viewMode: 'drone', colonyHealth: 90, varroaLevel: 5, honey: 100 },
    });

    expect(html).toContain('data-drone-carryover-hypothesis="true"');
    expect(html).toContain('Prediction to test');
    expect(html).toContain('A well-provisioned colony should launch a drone with more usable energy');
    expect(html).toContain('Measure: Launch energy, DCA arrival energy, and route efficiency.');
  });

  it('provides distinct predictions for stressed and watch-list launch conditions', () => {
    const stressed = renderTool('beehive', {
      beehive: { viewMode: 'drone', colonyHealth: 35, varroaLevel: 45, honey: 2 },
    });
    const watch = renderTool('beehive', {
      beehive: { viewMode: 'drone', colonyHealth: 60, varroaLevel: 25, honey: 20 },
    });

    expect(stressed).toContain('A stressed colony should launch a drone with less usable energy');
    expect(watch).toContain('Changing colony condition should change launch energy');
    expect(source).toContain("'aria-labelledby': 'drone-carryover-hypothesis-title'");
    expect(source).toContain("'aria-describedby': 'drone-carryover-hypothesis-text'");
  });
});
