import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderDNA(state = {}) {
  return renderTool('dnaLab', { dnaLab: state });
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_dna.js', 'dnaLab');
});

describe('DNA Lab interactive codon spotlight', () => {
  it('opens the first affected codon by default', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGACGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }]
    });
    expect(html).toContain('data-dna-codon-spotlight="true"');
    expect(html).toContain('Codon spotlight');
    expect(html).toContain('Codon 2');
    expect(html).toContain('bases 4');
    expect(html).toContain('The changed codon now specifies');
    expect(html).toContain('data-dna-impact-selected="true"');
  });

  it('renders a persisted downstream codon selection', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaImpactCodonIndex: 3,
      dnaSequence: 'ATGACGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }]
    });
    expect(html).toContain('Codon 3');
    expect(html).toContain('bases 7');
    expect(html).toContain('This codon is downstream of the shifted reading frame.');
    expect(html).toContain('data-selected="true"');
    expect(html).toContain('aria-current="true"');
  });

  it('explains a silent selected codon without implying amino-acid change', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGCGCACCTGAAACTGA',
      mutationLog: [{ type: 'Substitution', pos: 5, from: 'T', to: 'C' }]
    });
    expect(html).toContain('The codon changed, but the genetic code still produced the same amino acid.');
    expect(html).toContain('Reading frame');
    expect(html).toContain('Aligned');
  });

  it('keeps codon cards as accessible controls linked to source state', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGACGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }]
    });
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Codon 2. Changed.');
    const source = fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8');
    expect(source).toContain('dnaImpactCodonIndex');
    expect(source).toContain('dnaImpactSelectedCodon');
    expect(source).toContain('spotlight selected.');
  });
});
