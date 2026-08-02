import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
});

describe('Beehive Beekeeper causal pathway feedback', () => {
  it('renders intervention, mechanism, and observed signal as a visual learning path', () => {
    const html = renderTool('beehive', { beehive: {
      viewMode: 'beekeeper',
      lastManagement: {
        kind: 'intervention',
        label: 'Oxalic Acid Dribble',
        cost: '1 AP',
        day: 8,
        summary: 'Treatment applied. Compare mite reduction and colony stress.',
        changes: [
          { label: 'Varroa', before: 34, after: 14, delta: -20, suffix: ' pt' },
          { label: 'Morale', before: 80, after: 77, delta: -3, suffix: ' pt' }
        ]
      }
    } });

    expect(html).toContain('data-management-causal-path="true"');
    expect(html).toContain('Action → biology → evidence');
    expect(html).toContain('data-management-causal-step="1"');
    expect(html).toContain('data-management-causal-step="2"');
    expect(html).toContain('data-management-causal-step="3"');
    expect(html).toContain('Mite treatment lowers Varroa pressure');
    expect(html).toContain('Varroa -20 pt');
    expect(html).toContain('data-management-causal-prompt="true"');
  });

  it('keeps the mechanism mapping and accessible pathway semantics in the source', () => {
    expect(source).toContain('function managementCausalPath(label, changes)');
    expect(source).toContain("'aria-label': 'Intervention causal pathway'");
    expect(source).toContain("'aria-labelledby': 'beehive-management-causal-title'");
    expect(source).toContain('Name the metric you expect to move first');
  });
});
