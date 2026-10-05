import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
});

describe('Beehive Beekeeper event impact forecast', () => {
  it('distinguishes preset effects from unavailable daily readings in an older event', () => {
    const html = renderTool('beehive', { beehive: {
      viewMode: 'beekeeper',
      activeEvent: {
        id: 'heatwave',
        emoji: '☀️',
        label: 'Heatwave',
        desc: 'A hot spell is stressing the colony.',
        effect: { workers: -800, honey: -3, morale: -8 },
        lesson: 'Heat changes the colony energy budget.'
      }
    } });

    expect(html).toContain('data-beehive-event-forecast="true"');
    expect(html).toContain('Recorded day change');
    expect(html).toContain('Daily readings were not recorded for this event');
    expect(html).toContain('These are model inputs, not measured changes');
    expect(html).toContain('data-event-impact="workers"');
    expect(html).toContain('data-event-impact="honey"');
    expect(html).toContain('data-event-impact="morale"');
    expect(html).toContain('Evidence check:');
    expect(html).not.toContain('largest worker force change');
  });

  it('keeps the impact metrics labelled for screen readers', () => {
    expect(source).toContain("'aria-label': 'Preset event effects'");
    expect(source).toContain("'aria-labelledby': titleId");
    expect(source).toContain("'aria-describedby': promptId");
    expect(source).toContain("'data-beehive-event-prompt': 'true'");
  });
});
