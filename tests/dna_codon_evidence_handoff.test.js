import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderDNA(state = {}) {
  return renderTool('dnaLab', { dnaLab: state });
}

const insertionState = {
  tab: 'mutate',
  dnaSequence: 'ATGACGTACCTGAAACTGA',
  mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }],
  dnaImpactCodonIndex: 2
};

const codonEvidenceDetail = 'Codon 2 (bases 4-6): mRNA CGU -> ACG; amino acid Arg -> Thr; predicted effect Frameshift.';
const currentSequenceKey = 'ATGACGTACCTGAAACTGA|1|Insertion:3::A';

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_dna.js', 'dnaLab');
});

describe('DNA Lab codon evidence handoff', () => {
  it('offers the selected codon as report-ready evidence', () => {
    const html = renderDNA(insertionState);
    expect(html).toContain('data-dna-use-codon-evidence="true"');
    expect(html).toContain('Use as evidence');
    expect(html).toMatch(/data-dna-use-codon-evidence="true"[^>]*aria-pressed="false"/);
  });

  it('shows exact saved codon evidence as current in the report', () => {
    const html = renderDNA({
      ...insertionState,
      dnaReportOpen: true,
      dnaEvidenceCitation: 'codon',
      dnaEvidenceCitationDetail: codonEvidenceDetail,
      dnaEvidenceCitationSequenceKey: currentSequenceKey
    });
    expect(html).toContain('data-dna-evidence-citation-detail="true"');
    expect(html).toContain('data-stale="false"');
    expect(html).toContain('Current sequence');
    expect(html).toContain(codonEvidenceDetail.replaceAll('>', '&gt;'));
    expect(html).toContain('Added to report');
    expect(html).toMatch(/data-dna-use-codon-evidence="true"[^>]*aria-pressed="true"/);
  });

  it('flags saved codon evidence after the DNA sequence changes', () => {
    const html = renderDNA({
      ...insertionState,
      dnaReportOpen: true,
      dnaEvidenceCitation: 'codon',
      dnaEvidenceCitationDetail: codonEvidenceDetail,
      dnaEvidenceCitationSequenceKey: 'earlier-sequence'
    });
    expect(html).toContain('data-stale="true"');
    expect(html).toContain('Earlier sequence');
    expect(html).toContain('The DNA changed after this codon was saved.');
    expect(html).toContain('Refresh from spotlight');
    expect(html).toContain('Refresh your cited codon evidence');
  });

  it('keeps freshness checks and export details in the source tool', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8');
    expect(source).toContain('function useSelectedDnaCodonAsEvidence');
    expect(source).toContain('dnaEvidenceCitationStale');
    expect(source).toContain('Evidence detail:');
    expect(source).toContain('Evidence freshness:');
  });
});
