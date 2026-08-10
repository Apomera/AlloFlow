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

describe('DNA Lab Evidence & Reasoning mode', () => {
  it('adds a claim-evidence-reasoning workflow to the student report', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaReportOpen: true,
      dnaSequence: 'ATGACGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }]
    });
    expect(html).toContain('data-dna-evidence-mode="true"');
    expect(html).toContain('Evidence &amp; Reasoning mode');
    expect(html).toContain('Explain how the insertion or deletion affected downstream codons.');
    expect(html).toContain('Evidence citation');
    expect(html).toContain('Check reasoning');
    expect(html).toContain('Codon');
  });

  it('retains learner selections, reasoning, feedback, and score', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaReportOpen: true,
      dnaSequence: 'ATGACGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }],
      dnaEvidenceClaim: 'frameshift',
      dnaEvidenceCitation: 'codon',
      dnaEvidenceReasoning: 'The changed codon shows that the insertion shifted downstream reading.',
      dnaEvidenceFeedback: 'Strong claim-evidence-reasoning link.',
      dnaEvidenceScore: 3
    });
    expect(html).toContain('Check: 3/3');
    expect(html).toContain('The changed codon shows that the insertion shifted downstream reading.');
    expect(html).toContain('Strong claim-evidence-reasoning link.');
    expect(html).toContain('aria-label="Explain how the evidence supports the claim"');
  });

  it('adapts the prompt to base pairing when no mutation is present', () => {
    const html = renderDNA({ tab: 'build', dnaReportOpen: true });
    expect(html).toContain('Connect complementary base pairing to the DNA evidence.');
    expect(html).toContain('Base-pair rule: A-T and G-C');
    expect(html).toContain('Complementary base pairing keeps the two DNA strands matched.');
  });

  it('keeps the rubric and exported evidence fields in the source tool', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8');
    expect(source).toContain('function buildDnaEvidenceRubric');
    expect(source).toContain('function checkDnaEvidence');
    expect(source).toContain('Evidence check score:');
  });
});
