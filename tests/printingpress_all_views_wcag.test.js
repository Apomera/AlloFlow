// Every Printing Press view, rendered in its default state, must pass axe's
// WCAG 2.2 A/AA rules (contrast is checked elsewhere: jsdom has no layout) and
// render without React warnings. Before 2026-11-03, 53 views failed
// nested-interactive (a Print control inside the Teacher Notes <summary>),
// the cumulative quiz carried an aria-label on a role-less div, and the
// broadside view logged an unkeyed-children warning.
// PP_SRC points the suite at another copy (used to confirm it fails pre-fix).
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

const SOURCE = process.env.PP_SRC || 'stem_lab/stem_tool_printingpress.js';
const source = readFileSync(SOURCE, 'utf8');
const VIEWS = [...source.matchAll(/view === '([A-Za-z0-9]+)'\)\s+content = h\(_ViewWrapper/g)].map((m) => m[1]);

function renderView(view) {
  const warnings = [];
  const original = console.error;
  console.error = (...args) => { warnings.push(args.map(String).join(' ').slice(0, 300)); };
  try {
    return { html: renderTool('printingPress', { printingPress: { view } }), warnings };
  } finally {
    console.error = original;
  }
}

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'printingPress');
});

describe('Printing Press: every view passes automated WCAG checks', () => {
  it('finds the whole view dispatch (an empty list would make this suite vacuous)', () => {
    expect(VIEWS.length).toBeGreaterThanOrEqual(100);
    expect(VIEWS).toContain('menu');
    expect(VIEWS).toContain('pressMechanism');
    expect(VIEWS).toContain('cumulative');
  });

  for (const view of VIEWS) {
    it('renders "' + view + '" with no axe violations and no React warnings', async () => {
      const { html, warnings } = renderView(view);
      expect(html.length, view + ' rendered nothing').toBeGreaterThan(2000);
      expect(warnings, view + ' logged during render').toEqual([]);
      const result = await runIsolatedAxe(html);
      const found = result.violations.map((v) => v.id + ' x' + v.nodes.length + ': ' + v.nodes[0].html.slice(0, 160));
      expect(found, view).toEqual([]);
    }, 30000);
  }
});
