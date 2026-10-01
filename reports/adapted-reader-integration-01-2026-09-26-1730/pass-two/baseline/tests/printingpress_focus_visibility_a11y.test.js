import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_printingpress.js';
const DEPLOY = 'desktop/web-app/public/stem_lab/stem_tool_printingpress.js';

beforeEach(() => {
  resetStemLab();
  document.getElementById('printingpress-print-css')?.remove();
  loadTool(SOURCE, 'printingPress');
});

describe('Printing Press focus visibility', () => {
  it('installs a durable focus-visible outline and offset for interactive tiles', () => {
    const css = document.getElementById('printingpress-print-css')?.textContent || '';
    const focusRule =
      css.match(/\.printingpress-tile:focus-visible\s*\{([^}]*)\}/)?.[1] || '';

    expect(focusRule).toContain('outline: 3px solid #f5d77e');
    expect(focusRule).toContain('outline-offset: 2px');
    expect(focusRule).toContain('box-shadow:');
    expect(focusRule).not.toMatch(/outline\s*:\s*none/);
  });

  it('does not suppress outlines elsewhere and preserves deploy parity', () => {
    const source = readFileSync(SOURCE, 'utf8');

    expect(source).not.toMatch(/outline\s*:\s*['"]?none/);
    expect(readFileSync(DEPLOY, 'utf8')).toBe(source);
  });
});
