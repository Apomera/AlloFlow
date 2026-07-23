import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_chembalance.js';
const DEPLOY =
  'prismflow-deploy/public/stem_lab/stem_tool_chembalance.js';

function renderSubtool(subtool, data = {}) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('chemBalance', {
    chemBalance: { subtool, _everPicked: true, ...data },
  });
  return container;
}

beforeEach(() => {
  window.localStorage.clear();
  resetStemLab();
  loadTool(SOURCE, 'chemBalance');
});

describe('ChemBalance SVG alternatives', () => {
  it('describes the live balance state and both atom totals', () => {
    const diagram = renderSubtool('balance').querySelector('svg[role="img"]');
    const label = diagram.getAttribute('aria-label');

    expect(label).toContain('Balance scale comparing reactant and product atom counts');
    expect(label).toMatch(/(?:Balanced|Not balanced)\./);
    expect(label).toContain('Reactant atoms:');
    expect(label).toContain('Product atoms:');
  });

  it('describes the selected molecular structure', () => {
    const diagram = renderSubtool('molecular').querySelector('svg[role="img"]');
    const label = diagram.getAttribute('aria-label');

    expect(label).toContain('Molecular structure diagram for');
    expect(label).toContain('formula');
    expect(label).toContain('shape');
    expect(label).toMatch(/with \d+ atoms and \d+ bonds\./);
  });

  it('names both SVG declarations explicitly in source', () => {
    const lines = readFileSync(SOURCE, 'utf8').split(/\r?\n/);
    const declarations = lines.filter((line) => /h\(\s*['"]svg['"]/.test(line));

    expect(declarations).toHaveLength(2);
    for (const declaration of declarations) {
      expect(declaration).toMatch(/role:\s*['"]img['"]/);
      expect(declaration).toContain('aria-label');
    }
  });

  it('preserves byte-for-byte deploy parity', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
