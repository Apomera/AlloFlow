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

describe('DNA Lab saved experiment comparison', () => {
  it('compares selected checkpoints across sequence, codons, and protein evidence', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaCompareLeft: 'exp-a',
      dnaCompareRight: 'exp-b',
      dnaCompareReflection: 'The substitution keeps the amino acid unchanged.',
      dnaExperimentHistory: [
        { id: 'exp-a', label: 'Experiment 1', dnaSequence: 'ATGCGTACCTGAAACTGA', mutationLog: [] },
        { id: 'exp-b', label: 'Experiment 2', dnaSequence: 'ATGCGCACCTGAAACTGA', mutationLog: [{ type: 'Substitution', pos: 5, from: 'T', to: 'C' }] }
      ]
    });
    expect(html).toContain('data-dna-experiment-compare="true"');
    expect(html).toContain('data-dna-experiment-comparison-result="true"');
    expect(html).toContain('Compare saved experiments');
    expect(html).toContain('Difference summary');
    expect(html).toContain('Amino acid A');
    expect(html).toContain('Amino acid B');
    expect(html).toContain('Comparison reflection');
    expect(html).toContain('The substitution keeps the amino acid unchanged.');
  });

  it('keeps the comparison prompt available until two different checkpoints are chosen', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaExperimentHistory: [
        { id: 'exp-a', label: 'Experiment 1', dnaSequence: 'ATGCGTACCTGAAACTGA', mutationLog: [] },
        { id: 'exp-b', label: 'Experiment 2', dnaSequence: 'ATGCGCACCTGAAACTGA', mutationLog: [] }
      ]
    });
    expect(html).toContain('Choose two different saved experiments');
    expect(html).not.toContain('data-dna-experiment-comparison-result="true"');
  });

  it('keeps comparison state in the DNA tool implementation', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8');
    expect(source).toContain('function buildExperimentComparison');
    expect(source).toContain('dnaCompareReflection');
    expect(source).toContain('nextState.dnaCompareLeft');
  });
});