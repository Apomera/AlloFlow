import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); });

describe('Beekeeper intervention evidence', () => {
  it('renders persisted before-and-after management evidence', () => {
    const html = renderTool('beehive', {
      beehive: {
        viewMode: 'beekeeper',
        lastManagement: {
          kind: 'intervention',
          label: 'Feed Bees',
          cost: '1 AP',
          day: 4,
          summary: 'Fed the colony and replenished emergency reserves.',
          changes: [{ label: 'Honey', before: 5, after: 10, delta: 5, suffix: ' lb' }],
        },
      },
    });

    expect(html).toContain('data-beehive-management-evidence="true"');
    expect(html).toContain('Latest intervention');
    expect(html).toContain('Feed Bees');
    expect(html).toContain('Observed intervention metric changes');
    expect(html).toContain('5 lb');
    expect(html).toContain('10 lb');
    expect(html).toContain('which biological mechanism links this intervention');
  });
});
