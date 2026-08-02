import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); });

describe('Beekeeper-to-Queen causal carryover', () => {
  it('shows prepared field evidence and its opening modifiers', () => {
    const html = renderTool('beehive', {
      beehive: {
        viewMode: 'queen', colonyHealth: 92, varroaLevel: 8, honey: 34,
        queen: { active: false },
      },
    });

    expect(html).toContain('data-queen-field-brief="true"');
    expect(html).toContain('Field evidence carried forward');
    expect(html).toContain('Prepared field report');
    expect(html).toContain('Opening modifiers');
    expect(html).toContain('+5 nectar');
    expect(html).toContain('Colony health');
  });

  it('turns stressed field evidence into defensive guidance', () => {
    const html = renderTool('beehive', {
      beehive: {
        viewMode: 'queen', colonyHealth: 35, varroaLevel: 46, honey: 6,
        queen: { active: false },
      },
    });

    expect(html).toContain('Stressed field report');
    expect(html).toContain('5 nectar');
    expect(html).toContain('protect brood');
  });
});
