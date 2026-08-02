import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
});

describe('Queen RTS next-cycle economy forecast', () => {
  it('shows deterministic resource deltas alongside current stockpiles', () => {
    const html = renderTool('beehive', {
      beehive: { viewMode: 'queen', queen: { active: true, paused: true } },
    });

    expect(html).toContain('data-rts-next-cycle-economy="true"');
    expect(html).toContain('Next-cycle forecast');
    expect(html).toContain('data-rts-next-cycle-resource="nectar"');
    expect(html).toContain('data-rts-next-cycle-delta="wax"');
    expect(html).toContain('Worker throughput, structures, season, and upkeep are projected from the current state.');
  });

  it('labels the forecast as a baseline and exposes the explanation to assistive technology', () => {
    const html = renderTool('beehive', {
      beehive: { viewMode: 'queen', queen: { active: true, paused: true, difficulty: 'standard', opening: 'balanced', scenario: 'field_report', rival: { name: 'Rival hive', health: 100, strength: 100, stores: 10, structures: 2, pressure: 72, intel: 0 } } },
    });

    expect(html).toContain('data-rts-economy-watch="true"');
    expect(html).toContain('Raid pressure is high; a rival strike can steal nectar beyond this baseline.');
    expect(source).toContain("'aria-labelledby': 'rts-next-cycle-title'");
    expect(source).toContain("'aria-describedby': 'rts-next-cycle-note'");
  });
});
