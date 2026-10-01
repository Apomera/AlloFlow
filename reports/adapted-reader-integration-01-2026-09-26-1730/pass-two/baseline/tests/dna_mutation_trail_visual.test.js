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

describe('DNA Lab mutation trail visual refinement', () => {
  it('shows multiple edits in chronological order and marks the current one', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGACGCACCTGAAACTGA',
      mutationLog: [
        { type: 'Substitution', pos: 5, from: 'T', to: 'C' },
        { type: 'Insertion', pos: 3, to: 'A' }
      ]
    });
    expect(html).toContain('data-dna-mutation-trail="true"');
    expect(html).toContain('Mutation trail');
    expect(html).toMatch(/data-dna-mutation-step="1"[\s\S]*data-dna-mutation-step="2"/);
    expect(html).toContain('data-mutation-current="false"');
    expect(html).toContain('data-mutation-current="true"');
    expect(html).toContain('data-mutation-effect="silent"');
    expect(html).toContain('data-mutation-effect="frameshift"');
  });

  it('reconstructs sequence-length changes for substitutions, insertions, and deletions', () => {
    const insertionHtml = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGACGCACCTGAAACTGA',
      mutationLog: [
        { type: 'Substitution', pos: 5, from: 'T', to: 'C' },
        { type: 'Insertion', pos: 3, to: 'A' }
      ]
    });
    expect(insertionHtml).toMatch(/data-dna-mutation-step="1"[^>]*data-length-before="18" data-length-after="18"/);
    expect(insertionHtml).toMatch(/data-dna-mutation-step="2"[^>]*data-length-before="18" data-length-after="19"/);
    expect(insertionHtml).toContain('18 → 19 bp');

    const deletionHtml = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGGTACCTGAAACTGA',
      mutationLog: [{ type: 'Deletion', pos: 3, from: 'C' }]
    });
    expect(deletionHtml).toContain('data-mutation-type="deletion"');
    expect(deletionHtml).toContain('data-length-before="18" data-length-after="17"');
    expect(deletionHtml).toContain('−C');
    expect(deletionHtml).toContain('data-base-state="gap"');
  });

  it('uses a keyboard-scrollable semantic timeline with a visible legend', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGACGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }]
    });
    expect(html).toContain('<ol class="mt-3 flex min-w-0 snap-x snap-mandatory');
    expect(html).toContain('tabindex="0" aria-label="Mutation trail with 1 edit.');
    expect(html).toContain('data-dna-mutation-trail-legend="true"');
    expect(html).toContain('Mutation trail color legend');
    expect(html).toContain('Substitution');
    expect(html).toContain('Insertion');
    expect(html).toContain('Deletion');
  });

  it('visually distinguishes edit history from saved experiment checkpoints', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGACGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }],
      dnaExperimentHistory: [{
        id: 'exp-1',
        label: 'Experiment 1',
        dnaSequence: 'ATGACGTACCTGAAACTGA',
        mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }]
      }]
    });
    expect(html).toContain('data-dna-history-distinction="true"');
    expect(html).toContain('individual edits in this active experiment');
    expect(html).toContain('whole sequence checkpoints you saved for comparison');
    expect(html).toContain('data-dna-experiment-history="true"');
  });

  it('stays absent before the first edit and retains reconstruction helpers', () => {
    const html = renderDNA({ tab: 'mutate' });
    expect(html).not.toContain('data-dna-mutation-trail="true"');
    const source = fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8');
    expect(source).toContain('function classifyDnaMutationStep');
    expect(source).toContain('function buildDnaMutationTrail');
    expect(source).toContain('function renderDnaMutationTrail');
  });
});
