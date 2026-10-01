import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); });

describe('Colony-to-Drone causal carryover', () => {
  it('uses a well-provisioned colony to set launch reserve without changing route physics', () => {
    const html = renderTool('beehive', {
      beehive: { viewMode: 'drone', colonyHealth: 90, varroaLevel: 5, honey: 100, queen: { result: 'victory' } },
    });

    expect(html).toContain('data-drone-carryover-brief="true"');
    expect(html).toContain('Colony condition carried forward');
    expect(html).toContain('Well-fed launch condition');
    expect(html).toContain('DCA geometry unchanged');
    expect(html).toContain('Standard flight window');
    expect(html).toContain('Scenario hazards unchanged');
  });

  it('shows colony stress as a fuel-reserve constraint instead of inventing a route penalty', () => {
    const html = renderTool('beehive', {
      beehive: { viewMode: 'drone', colonyHealth: 35, varroaLevel: 45, honey: 2, queen: { result: 'defeat' } },
    });

    expect(html).toContain('Stressed launch condition');
    expect(html).toContain('DCA geometry unchanged');
    expect(html).toContain('Standard flight window');
    expect(html).toContain('Scenario hazards unchanged');
    expect(html).toContain('there is no feeding at flowers');
    expect(html).not.toContain('Victory route');
    expect(html).not.toContain('Recovery route');
  });
});
