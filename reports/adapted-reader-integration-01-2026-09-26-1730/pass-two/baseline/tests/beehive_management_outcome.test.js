import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); });

describe('Beehive Beekeeper outcome-quality feedback', () => {
  it('labels a protective intervention and explains the observed mechanism prompt', () => {
    const html = renderTool('beehive', {
      beehive: {
        viewMode: 'beekeeper',
        lastManagement: {
          kind: 'intervention', label: 'Feed Bees', cost: '1 AP', day: 4,
          summary: 'Fed the colony and replenished emergency reserves.',
          changes: [{ label: 'Honey', before: 5, after: 10, delta: 5, suffix: ' lb' }],
        },
      },
    });

    expect(html).toContain('data-management-outcome="protective"');
    expect(html).toContain('Protective outcome');
    expect(html).toContain('1 beneficial change recorded');
    expect(html).toContain('data-management-outcome-detail="true"');
  });

  it('makes metric direction and trade-offs explicit for a treatment', () => {
    const html = renderTool('beehive', {
      beehive: {
        viewMode: 'beekeeper',
        lastManagement: {
          kind: 'intervention', label: 'Oxalic Acid Dribble', cost: '1 AP', day: 8,
          summary: 'Treatment reduced mites but stressed the colony slightly.',
          changes: [
            { label: 'Varroa', before: 32, after: 12, delta: -20, suffix: ' pt' },
            { label: 'Morale', before: 80, after: 77, delta: -3, suffix: ' pt' },
          ],
        },
      },
    });

    expect(html).toContain('data-management-outcome="mixed"');
    expect(html).toContain('Mixed trade-off');
    expect(html).toContain('1 intended benefit and 1 trade-off');
    expect(html).toContain('Varroa');
  });
});
