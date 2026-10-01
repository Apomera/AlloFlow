import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderDNA(state = {}) {
  return renderTool('dnaLab', { dnaLab: state });
}

const frameTwoSequence = 'AATGAAATAA';
const frameTwoEvidence = 'Reading frame +2 groups codons beginning at base 2. Complete ORF: AUG starts at base 2; UAA stops translation at bases 8-10; protein Met-Lys (2 aa).';
const frameTwoSequenceKey = 'AATGAAATAA|0|';

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_dna.js', 'dnaLab');
});

describe('DNA Lab Reading Frame Explorer', () => {
  it('compares all three forward frames and identifies the default complete ORF', () => {
    const html = renderDNA({ tab: 'translate' });
    expect(html).toContain('data-dna-reading-frame-explorer="true"');
    expect(html).toContain('One mRNA, three possible groupings');
    expect(html).toContain('data-dna-reading-frame="1"');
    expect(html).toContain('data-dna-reading-frame="2"');
    expect(html).toContain('data-dna-reading-frame="3"');
    expect(html).toContain('data-dna-reading-frame-detail="true" data-frame="1" data-frame-status="complete"');
    expect(html).toContain('Translation begins at AUG at base 1');
    expect(html).toContain('data-codon-state="start"');
    expect(html).toContain('data-codon-state="stop"');
    expect(html).toContain('Met-Arg-Thr');
  });

  it('finds a complete ORF that exists only in frame +2', () => {
    const html = renderDNA({
      tab: 'translate',
      dnaSequence: frameTwoSequence,
      dnaReadingFrame: 2
    });
    expect(html).toContain('data-dna-reading-frame-detail="true" data-frame="2" data-frame-status="complete"');
    expect(html).toContain('Translation begins at AUG at base 2');
    expect(html).toContain('UAA stop codon at bases 8-10');
    expect(html).toContain('Protein preview');
    expect(html).toContain('Met-Lys');
    expect(html).toContain('Translate frame +2');
    expect(html).toContain('Codons in reading frame plus 2');
  });

  it('prevents a ribosome run when the selected frame has no AUG', () => {
    const html = renderDNA({ tab: 'translate', dnaReadingFrame: 2 });
    expect(html).toContain('data-frame="2" data-frame-status="no-start"');
    expect(html).toContain('This frame has no AUG start codon');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>No AUG in frame \+2<\/button>/);
  });

  it('labels an AUG-led fragment without a downstream stop as an open ORF', () => {
    const html = renderDNA({
      tab: 'translate',
      dnaSequence: 'ATGAAAGGG',
      dnaReadingFrame: 1
    });
    expect(html).toContain('data-frame="1" data-frame-status="open"');
    expect(html).toContain('Open ORF');
    expect(html).toContain('this fragment ends before an in-frame stop codon appears');
    expect(html).toContain('Met-Lys-Gly');
    expect(html).toContain('Translate frame +1');
  });

  it('shows exact frame evidence as current in the student report', () => {
    const html = renderDNA({
      tab: 'translate',
      dnaSequence: frameTwoSequence,
      dnaReadingFrame: 2,
      dnaReportOpen: true,
      dnaEvidenceCitation: 'frame',
      dnaEvidenceCitationDetail: frameTwoEvidence,
      dnaEvidenceCitationSequenceKey: frameTwoSequenceKey
    });
    expect(html).toContain('data-dna-evidence-citation-detail="true"');
    expect(html).toContain('data-evidence-source="frame"');
    expect(html).toContain('data-stale="false"');
    expect(html).toContain('Current sequence');
    expect(html).toContain(frameTwoEvidence);
    expect(html).toContain('Added to report');
    expect(html).toMatch(/data-dna-use-frame-evidence="true"[^>]*aria-pressed="true"/);
  });

  it('flags frame evidence after the sequence changes and routes refresh guidance to Translate', () => {
    const html = renderDNA({
      tab: 'translate',
      dnaSequence: frameTwoSequence,
      dnaReadingFrame: 2,
      dnaReportOpen: true,
      dnaEvidenceCitation: 'frame',
      dnaEvidenceCitationDetail: frameTwoEvidence,
      dnaEvidenceCitationSequenceKey: 'earlier-sequence'
    });
    expect(html).toContain('data-evidence-source="frame"');
    expect(html).toContain('data-stale="true"');
    expect(html).toContain('Earlier sequence');
    expect(html).toContain('Refresh from frame explorer');
    expect(html).toContain('Refresh your cited reading frame evidence');
  });

  it('keeps ORF analysis, frame-aware translation, and export wiring in source', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8');
    expect(source).toContain('function analyzeReadingFrame');
    expect(source).toContain('dnaTranslationCodons[transStep]');
    expect(source).toContain('function useSelectedDnaFrameAsEvidence');
    expect(source).toContain('Reading-frame evidence:');
  });
});
