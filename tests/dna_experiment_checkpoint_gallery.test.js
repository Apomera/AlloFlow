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

const BASELINE = {
  id: 'exp-a',
  label: 'Experiment 1',
  dnaSequence: 'ATGCGTACCTGAAACTGA',
  mutationLog: []
};

const SILENT = {
  id: 'exp-b',
  label: 'Experiment 2',
  dnaSequence: 'ATGCGCACCTGAAACTGA',
  mutationLog: [{ type: 'Substitution', pos: 5, from: 'T', to: 'C' }]
};

describe('DNA Lab experiment checkpoint gallery', () => {
  it('turns each saved experiment into a visual sequence-and-metrics card', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaExperimentHistory: [BASELINE]
    });
    expect(html).toContain('data-dna-experiment-history="true"');
    expect(html).toContain('Saved sequence checkpoints');
    expect(html).toContain('data-dna-checkpoint-gallery="true"');
    expect(html).toContain('data-dna-experiment-card="true"');
    expect(html).toContain('data-dna-checkpoint-fingerprint="true"');
    expect(html).toContain('data-dna-checkpoint-metrics="true"');
    expect(html).toContain('data-checkpoint-length="18"');
    expect(html).toContain('data-checkpoint-gc="44"');
    expect(html).toContain('data-checkpoint-protein="3"');
    expect(html).toContain('data-checkpoint-mutations="0"');
    expect(html).toContain('data-latest-effect="baseline"');
    expect(html).toContain('Restore checkpoint');
  });

  it('makes the selected A and B checkpoints visually explicit', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaCompareLeft: 'exp-a',
      dnaCompareRight: 'exp-b',
      dnaExperimentHistory: [BASELINE, SILENT]
    });
    expect(html).toMatch(/data-checkpoint-id="exp-a"[^>]*data-comparison-slot="a"/);
    expect(html).toMatch(/data-checkpoint-id="exp-b"[^>]*data-comparison-slot="b"/);
    expect(html).toContain('data-checkpoint-selected="a"');
    expect(html).toContain('data-checkpoint-selected="b"');
    expect(html).toContain('A selected');
    expect(html).toContain('B selected');
    expect(html).toContain('data-comparison-state="ready"');
    expect(html).toContain('Ready to compare');
    expect(html).toContain('Experiment 1 ↔ Experiment 2');
  });

  it('summarizes the latest isolated effect for each checkpoint', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaExperimentHistory: [
        SILENT,
        {
          id: 'exp-c',
          label: 'Experiment 3',
          dnaSequence: 'ATGACGTACCTGAAACTGA',
          mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }]
        }
      ]
    });
    expect(html).toMatch(/data-checkpoint-id="exp-b"[^>]*data-latest-effect="silent"/);
    expect(html).toMatch(/data-checkpoint-id="exp-c"[^>]*data-latest-effect="frameshift"/);
    expect(html).toContain('data-checkpoint-length="19"');
    expect(html).toContain('Latest effect');
    expect(html).toContain('Silent');
    expect(html).toContain('Frameshift');
  });

  it('keeps direct A/B actions keyboard-accessible alongside the selectors', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaExperimentHistory: [BASELINE, SILENT]
    });
    expect(html).toContain('data-dna-checkpoint-gallery="true" tabindex="0"');
    expect(html).toContain('Saved DNA experiment checkpoints. Swipe horizontally or use arrow keys');
    expect(html).toContain('data-comparison-slot-action="a"');
    expect(html).toContain('data-comparison-slot-action="b"');
    expect(html).toContain('Use as A');
    expect(html).toContain('Use as B');
    expect(html).toContain('Choose first saved experiment');
    expect(html).toContain('Choose second saved experiment');
  });

  it('stays absent without saved checkpoints and retains assignment helpers', () => {
    const html = renderDNA({ tab: 'mutate' });
    expect(html).not.toContain('data-dna-checkpoint-gallery="true"');
    const source = fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8');
    expect(source).toContain('function assignDnaExperimentCompareSlot');
    expect(source).toContain('function buildDnaExperimentCheckpoint');
    expect(source).toContain('dnaExperimentCheckpoints');
  });
});
