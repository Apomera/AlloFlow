import fs from 'node:fs';
import crypto from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = 'stem_lab/stem_tool_dna.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_dna.js';

function renderDNA(state = {}) {
  return renderTool('dnaLab', { dnaLab: state });
}

beforeEach(() => {
  resetStemLab();
  loadTool(sourcePath, 'dnaLab');
});

describe('DNA Lab inheritance handoff', () => {
  it('renders a compact handoff instead of duplicating the Punnett calculator', () => {
    const html = renderDNA({ tab: 'learn' });
    expect(html).toContain('data-dna-inheritance-handoff="true"');
    expect(html).toContain('DNA');
    expect(html).toContain('inheritance handoff');
    expect(html).toContain('Open Punnett Square Lab');
    expect(html).toContain('dedicated Punnett Square Lab');
    expect(html).not.toContain('data-dna-punnett="true"');
    expect(html).not.toContain('data-dna-punnett-simulation="true"');
    expect(html).not.toContain('Parent 1 genotype');
    expect(html).not.toContain('Simulate 10 offspring');
  });

  it('carries the latest molecular finding into the handoff', () => {
    const html = renderDNA({
      tab: 'learn',
      dnaSequence: 'ATGCGTACCTGAAACTGAA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }]
    });
    expect(html).toContain('Insertion at base 4');
    expect(html).toContain('Predicted coding effect: Frameshift');
    expect(html).toContain('Review mutation');
  });

  it('routes to the dedicated Punnett tool and preserves source/public parity', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const html = renderDNA({ tab: 'learn' });
    expect(source).toContain("setStemLabTool('punnett')");
    expect(html).toContain('Continue in Punnett Lab');
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
    expect(crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex'))
      .toBe(crypto.createHash('sha256').update(fs.readFileSync(publicPath)).digest('hex'));
  });
});