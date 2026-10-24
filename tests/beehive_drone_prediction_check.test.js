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
    // f7b4d993f moved the brief into a labelled note inside a disclosure; the
    // prediction is now named by its own heading instead of an ARIA group.
    expect(stressed).toContain('<section data-drone-carryover-brief="true" role="note" aria-label="Colony Network colony field evidence carried into Drone Flight">');
    expect(stressed).toMatch(/<div data-drone-carryover-hypothesis="true"><h4>Prediction to test<\/h4><p>A stressed colony should launch a drone with less usable energy/);
    expect(source.includes("h('div', { 'data-drone-carryover-hypothesis': 'true' }, h('h4', null, 'Prediction to test'), h('p', null, droneCarryoverBrief.hypothesis)"), 'heading names the prediction').toBe(true);
  });
});
