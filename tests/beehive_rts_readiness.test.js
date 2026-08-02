import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); });

describe('Queen RTS resource readiness feedback', () => {
  it('explains exact resource deficits for locked commands and structures', () => {
    const html = renderTool('beehive', {
      beehive: {
        viewMode: 'queen',
        queen: { active: true, paused: true, resources: { nectar: 0, pollen: 0, wax: 0, royalJelly: 0 } },
      },
    });

    expect(html).toContain('Nectar short');
    expect(html).toContain('have 0 / need');
    expect(html).toContain('data-command-ready="false"');
    expect(html).toContain('data-structure-ready="false"');
    expect(html).toContain('Royal jelly short');
  });
});
