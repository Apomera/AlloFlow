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

describe('DNA Lab mutation comparison', () => {
  it('shows before and after codons for an insertion', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGACGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }]
    });
    expect(html).toContain('data-dna-mutation-comparison="true"');
    expect(html).toContain('Before / after mutation');
    expect(html).toContain('mRNA before');
    expect(html).toContain('Amino acid after');
    expect(html).toContain('Frameshift');
    expect(html).toContain('Inserted base: A at position 4.');
  });

  it('classifies a codon-preserving substitution through the comparison', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGCGCACCTGAAACTGA',
      mutationLog: [{ type: 'Substitution', pos: 5, from: 'T', to: 'C' }]
    });
    expect(html).toContain('Silent');
    expect(html).toContain('Changed base: T → C at position 6.');
  });

  it('reconstructs the removed base for a deletion comparison', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGGTACCTGAAACTGA',
      mutationLog: [{ type: 'Deletion', pos: 3, from: 'C' }]
    });
    expect(html).toContain('Deleted base: C at position 4.');
    expect(html).toContain('Frameshift');
    expect(fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8')).toContain('buildMutationComparison');
  });
});