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

describe('DNA Lab codon impact map', () => {
  it('shows the downstream cascade created by a one-base insertion', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGACGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }]
    });
    expect(html).toContain('data-dna-codon-impact-map="true"');
    expect(html).toContain('Mutation impact map');
    expect(html).toContain('Cascade pattern');
    expect(html).toContain('Impact begins');
    expect(html).toContain('data-state="same"');
    expect(html).toContain('data-state="changed"');
    expect(html).toContain('changed codons');
  });

  it('makes a silent codon change explicit without implying protein change', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGCGCACCTGAAACTGA',
      mutationLog: [{ type: 'Substitution', pos: 5, from: 'T', to: 'C' }]
    });
    expect(html).toContain('Silent pattern');
    expect(html).toContain('The codon changed, but the amino-acid output stayed the same.');
    expect(html).toContain('AA Arg');
    expect(html).toContain('1 of 6 codons changed');
  });

  it('includes text, progress semantics, and keyboard-scroll support', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGACGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }]
    });
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-label="Changed codon footprint"');
    expect(html).toContain('aria-label="Codon impact map.');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('Same');
    expect(html).toContain('Changed');
  });

  it('keeps the impact map absent until a mutation creates comparison evidence', () => {
    const html = renderDNA({ tab: 'mutate' });
    expect(html).not.toContain('data-dna-codon-impact-map="true"');
    const source = fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8');
    expect(source).toContain('function renderDnaCodonImpactMap');
    expect(source).toContain('changedPercent');
  });
});
