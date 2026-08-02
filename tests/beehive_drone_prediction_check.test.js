import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
});

describe('Queen-to-Drone prediction check', () => {
  it('turns inherited route modifiers into a testable flight hypothesis', () => {
    const html = renderTool('beehive', {
      beehive: { viewMode: 'drone', queen: { result: 'victory' } },
    });

    expect(html).toContain('data-drone-carryover-hypothesis="true"');
    expect(html).toContain('Prediction to test');
    expect(html).toContain('A victory route should preserve more energy');
    expect(html).toContain('Measure: DCA arrival energy and predator encounters.');
  });

  it('provides distinct predictions for recovery and baseline routes', () => {
    const recovery = renderTool('beehive', {
      beehive: { viewMode: 'drone', queen: { result: 'defeat' } },
    });
    const baseline = renderTool('beehive', {
      beehive: { viewMode: 'drone', queen: {} },
    });

    expect(recovery).toContain('energy budgeting the limiting factor');
    expect(baseline).toContain('Use this baseline route as a control');
    expect(source).toContain("'aria-labelledby': 'drone-carryover-hypothesis-title'");
    expect(source).toContain("'aria-describedby': 'drone-carryover-hypothesis-text'");
  });
});
