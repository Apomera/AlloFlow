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

describe('DNA Lab visual evidence chain', () => {
  it('traces an insertion from DNA through mRNA to protein', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGACGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }]
    });
    expect(html).toContain('data-dna-evidence-chain="true"');
    expect(html).toContain('Follow the molecular change');
    expect(html).toContain('data-dna-evidence-stage="dna"');
    expect(html).toContain('data-dna-evidence-stage="mrna"');
    expect(html).toContain('data-dna-evidence-stage="protein"');
    expect(html).toContain('DNA change');
    expect(html).toContain('mRNA codon');
    expect(html).toContain('Protein effect');
    expect(html).toContain('changed codon');
  });

  it('makes a silent substitution visually explicit', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGCGCACCTGAAACTGA',
      mutationLog: [{ type: 'Substitution', pos: 5, from: 'T', to: 'C' }]
    });
    expect(html).toContain('Amino acid unchanged');
    expect(html).toContain('The codon changed, but this amino acid stayed the same.');
    expect(html).toContain('Predicted coding effect');
    expect(html).toContain('Silent');
  });

  it('shows Predict, Run, and Explain as a semantic progress strip', () => {
    const initial = renderDNA({ tab: 'build' });
    expect(initial).toContain('data-dna-scenario-steps="true"');
    expect(initial).toContain('Current · Choose an effect');

    const complete = renderDNA({
      tab: 'mutate',
      dnaScenarioId: 'frameshift_insertion',
      dnaScenarioPrediction: 'Frameshift',
      dnaScenarioRun: true,
      dnaEvidenceScore: 3,
      dnaSequence: 'ATGACGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }]
    });
    expect(complete).toContain('Predict');
    expect(complete).toContain('Run');
    expect(complete).toContain('Explain');
    expect((complete.match(/data-state="complete"/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it('keeps the evidence chain accessible and code-native', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8');
    expect(source).toContain('function renderDnaEvidenceChain');
    expect(source).toContain('DNA to protein evidence stages');
    expect(source).toContain('aria-label": chainLabel');
  });
});
