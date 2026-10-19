import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); });

describe('beehive causal evidence chain', () => {
  it('links field evidence to command and flight handoffs', () => {
    const html = renderTool('beehive', {
      beehive: {
        viewMode: 'queen',
        day: 12,
        honey: 18,
        colonyHealth: 82,
        varroaLevel: 12,
        queen: { active: true, paused: true },
      },
    });

    expect(html).toContain('data-beehive-causal-chain="true"');
    expect(html).toContain('data-causal-step="field"');
    expect(html).toContain('data-causal-step="command"');
    expect(html).toContain('data-causal-step="flight"');
    // 79e3e5eae rewrote the chain as "Evidence across roles": each card states
    // what its evidence can and cannot cause (old copy: "Feeds Queen start",
    // "does not alter route physics", "Feeds Notebook").
    expect(html).toContain('Inspect colony condition before choosing a network opening or launching a flight.');
    expect(html).toContain('Flight launch reserve comes from colony condition; a network victory does not set flight energy.');
    expect(html).toContain('Record the conditions and compare one control choice on another attempt.');
    expect(html).toContain('data-beehive-handoff="queen"');
    expect(html).toContain('Open Drone Flight');
  });
});
