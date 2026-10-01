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

describe('DNA Lab mutation alignment ribbon', () => {
  it('pins an insertion to an explicit gap and exposes the downstream shift', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGACGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }]
    });
    expect(html).toContain('data-dna-mutation-alignment="true"');
    expect(html).toContain('Locate the exact edit');
    expect(html).toContain('Insertion · +A at base 4');
    expect(html).toContain('data-alignment-state="inserted"');
    expect(html).toContain('data-base-state="gap"');
    expect(html).toContain('data-frame-region="shifted"');
    expect(html).toContain('Reading frame shifted after base 4');
  });

  it('shows a deletion as a gap in the after row', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGGTACCTGAAACTGA',
      mutationLog: [{ type: 'Deletion', pos: 3, from: 'C' }]
    });
    expect(html).toContain('Deletion · −C at base 4');
    expect(html).toContain('data-alignment-state="deleted"');
    expect(html).toMatch(/data-dna-mutation-alignment-row="after"[\s\S]*?data-base-state="gap"/);
    expect(html).toContain('Reading frame shifted after base 4');
  });

  it('keeps substitution rows aligned while isolating the edited column', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGCGCACCTGAAACTGA',
      mutationLog: [{ type: 'Substitution', pos: 5, from: 'T', to: 'C' }]
    });
    expect(html).toContain('Substitution · T → C at base 6');
    expect(html).toContain('data-alignment-state="changed"');
    expect(html).toContain('data-frame-status="preserved"');
    expect(html).toContain('Reading frame preserved');
    expect(html).not.toContain('data-frame-region="shifted"');
  });

  it('provides row labels, codon guides, and a keyboard-scrollable text equivalent', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGACGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }]
    });
    expect(html).toContain('data-dna-mutation-alignment-row="before"');
    expect(html).toContain('data-dna-mutation-alignment-row="after"');
    expect(html).toContain('data-codon-start="true"');
    expect(html).toContain('role="img" tabindex="0" aria-label="Nucleotide alignment.');
    expect(html).toContain('Nucleotide alignment legend');
  });

  it('stays absent until mutation comparison evidence exists', () => {
    const html = renderDNA({ tab: 'mutate' });
    expect(html).not.toContain('data-dna-mutation-alignment="true"');
    const source = fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8');
    expect(source).toContain('function buildDnaMutationAlignment');
    expect(source).toContain('function renderDnaMutationAlignmentRibbon');
  });
});
