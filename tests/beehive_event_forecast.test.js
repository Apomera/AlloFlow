import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
});

describe('Beehive Beekeeper event impact forecast', () => {
  it('renders applied event changes as an accessible visual prediction check', () => {
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
    expect(html).toContain('Observed event impact');
    expect(html).toContain('These modeled changes were applied when the event fired');
    expect(html).toContain('data-event-impact="workers"');
    expect(html).toContain('data-event-impact="honey"');
    expect(html).toContain('data-event-impact="morale"');
    expect(html).toContain('Risk / cost');
    expect(html).toContain('Prediction check: what mechanism explains the largest worker force change?');
  });

  it('keeps the impact metrics labelled for screen readers', () => {
    expect(source).toContain("'aria-label': 'Observed event impact metrics'");
    expect(source).toContain("'aria-labelledby': 'beehive-event-forecast-title'");
    expect(source).toContain("'aria-describedby': 'beehive-event-forecast-prompt'");
    expect(source).toContain("'data-beehive-event-prompt': 'true'");
  });
});
