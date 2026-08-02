import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); });

describe('Beekeeper forecast response controls', () => {
  it('makes projected risks jump to the intervention controls', () => {
    const html = renderTool('beehive', {
      beehive: {
        viewMode: 'beekeeper',
        day: 90,
        honey: 5,
        pollen: 2,
        varroaLevel: 42,
        diseaseRisk: 58,
        forecastDays: 30,
      },
    });

    expect(html).toContain('id="beehive-colony-interventions"');
    expect(html).toContain('data-forecast-response="honey"');
    expect(html).toContain('data-forecast-response="varroa"');
    expect(html).toContain('Open response controls');
    expect(html).toContain('Open intervention controls for');
  });
});
