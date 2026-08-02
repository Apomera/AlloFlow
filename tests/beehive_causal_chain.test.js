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
    expect(html).toContain('Feeds Queen start');
    expect(html).toContain('Feeds Drone start');
    expect(html).toContain('Feeds Notebook');
  });
});
