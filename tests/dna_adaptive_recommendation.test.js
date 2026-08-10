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

describe('DNA Lab adaptive recommendations', () => {
  it('gives a clear first move to a fresh learner', () => {
    const html = renderDNA({ tab: 'build' });
    expect(html).toContain('data-dna-recommendation="true"');
    expect(html).toContain('Suggested next move');
    expect(html).toContain('Build the DNA strand');
    expect(html).toContain('Open Build');
  });

  it('turns repeated guided errors into a targeted review recommendation', () => {
    const html = renderDNA({
      tab: 'build',
      guidedStarted: true,
      guidedStep: 0,
      guidedAnswers: {
        pairing: { attempts: 2, answer: 'G', correct: false }
      }
    });
    expect(html).toContain('Review Base-pairing check');
    expect(html).toContain('multiple attempts');
    expect(html).toContain('Review checkpoint');
  });

  it('prioritizes comparing multiple saved experiments', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaExperimentHistory: [
        { id: 'a', label: 'Experiment 1', dnaSequence: 'ATGACGTACCTGAAACTGA', mutationLog: [] },
        { id: 'b', label: 'Experiment 2', dnaSequence: 'ATGACGTACCTGAAACTGA', mutationLog: [] }
      ]
    });
    expect(html).toContain('Compare your saved experiments');
    expect(html).toContain('Open comparison');
  });

  it('calls attention to the evidence after a frameshift mutation', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGACGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }]
    });
    expect(html).toContain('Review the frameshift evidence');
    expect(html).toContain('Review mutation');
  });

  it('keeps the recommendation logic in the source tool', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8');
    expect(source).toContain('function buildDnaRecommendation');
    expect(source).toContain('data-dna-recommendation');
  });
});
