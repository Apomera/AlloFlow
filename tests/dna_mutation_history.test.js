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

describe('DNA Lab mutation history', () => {
  it('exposes undo and save controls after a mutation', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGACGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }]
    });
    expect(html).toContain('Undo last');
    expect(html).toContain('Save experiment');
    expect(html).toContain('data-dna-mutation-comparison="true"');
  });

  it('renders saved experiments with restore controls', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaExperimentHistory: [{
        id: 'dna-experiment-1',
        label: 'Experiment 1',
        dnaSequence: 'ATGCGTACCTGAAACTGA',
        mutationLog: []
      }]
    });
    expect(html).toContain('data-dna-experiment-history="true"');
    expect(html).toContain('Experiment history');
    expect(html).toContain('Experiment 1');
    expect(html).toContain('Restore');
  });

  it('defines reversible mutation and checkpoint operations', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8');
    expect(source).toContain('function undoLatestMutation');
    expect(source).toContain('function saveDnaExperiment');
    expect(source).toContain('function restoreDnaExperiment');
    expect(source).toContain("slice(-8)");
  });
});