import fs from 'node:fs';
import crypto from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = 'stem_lab/stem_tool_dna.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_dna.js';

function renderDNA(state = {}) {
  return renderTool('dnaLab', { dnaLab: state });
}

beforeEach(() => {
  resetStemLab();
  loadTool(sourcePath, 'dnaLab');
});

describe('DNA Lab guided investigation', () => {
  it('renders the guided investigation and evidence action on a fresh lab', () => {
    const html = renderDNA({ tab: 'build' });
    expect(html).toContain('data-dna-guided="true"');
    expect(html).toContain('Guided DNA investigation');
    expect(html).toContain('Begin investigation');
    expect(html).toContain('Export DNA evidence summary');
  });

  it('renders the active checkpoint and persists progress state', () => {
    const html = renderDNA({
      tab: 'build',
      guidedStarted: true,
      guidedStep: 0,
      guidedSelectedAnswer: 'T',
      guidedAnswers: { pairing: { attempts: 1, answer: 'T', correct: true } },
      guidedActions: { pairing: true },
      guidedFeedback: 'Correct.'
    });
    expect(html).toContain('Checkpoint 1 of 4');
    expect(html).toContain('Which DNA base pairs with adenine');
    expect(html).toContain('Continue');
    expect(html).toContain('aria-checked="true"');
  });

  it('requires the matching lab action before the guided investigation can continue', () => {
    const pairingBlocked = renderDNA({
      tab: 'build',
      guidedStarted: true,
      guidedStep: 0,
      guidedSelectedAnswer: 'T',
      guidedAnswers: { pairing: { attempts: 1, answer: 'T', correct: true } }
    });
    expect(pairingBlocked).toContain('Confirm base pairing');
    expect(pairingBlocked).not.toContain('bg-emerald-600');

    const pairingReady = renderDNA({
      tab: 'build',
      guidedStarted: true,
      guidedStep: 0,
      guidedSelectedAnswer: 'T',
      guidedAnswers: { pairing: { attempts: 1, answer: 'T', correct: true } },
      guidedActions: { pairing: true }
    });
    expect(pairingReady).toContain('Continue');

    const transcriptionBlocked = renderDNA({
      tab: 'transcribe',
      dnaSequence: 'ATGC',
      guidedStarted: true,
      guidedStep: 1,
      guidedSelectedAnswer: "3' -> 5'",
      guidedAnswers: { orientation: { attempts: 1, answer: "3' -> 5'", correct: true } }
    });
    expect(transcriptionBlocked).toContain('Run the Transcribe activity below to unlock Continue.');
    expect(transcriptionBlocked).not.toContain('bg-emerald-600');

    const transcriptionReady = renderDNA({
      tab: 'transcribe',
      dnaSequence: 'ATGC',
      mRNA: 'UACG',
      guidedStarted: true,
      guidedStep: 1,
      guidedSelectedAnswer: "3' -> 5'",
      guidedAnswers: { orientation: { attempts: 1, answer: "3' -> 5'", correct: true } }
    });
    expect(transcriptionReady).toContain('Continue');

    const translationBlocked = renderDNA({
      tab: 'translate',
      guidedStarted: true,
      guidedStep: 2,
      guidedSelectedAnswer: 'DNA -> RNA -> protein',
      guidedAnswers: { centralDogma: { attempts: 1, answer: 'DNA -> RNA -> protein', correct: true } },
      protein: []
    });
    expect(translationBlocked).toContain('Run the Translate activity below to unlock Continue.');

    const translationReady = renderDNA({
      tab: 'translate',
      guidedStarted: true,
      guidedStep: 2,
      guidedSelectedAnswer: 'DNA -> RNA -> protein',
      guidedAnswers: { centralDogma: { attempts: 1, answer: 'DNA -> RNA -> protein', correct: true } },
      protein: [{ aa: 'Met', codon: 'AUG', pos: 0 }]
    });
    expect(translationReady).toContain('Continue');

    const mutationBlocked = renderDNA({
      tab: 'mutate',
      guidedStarted: true,
      guidedStep: 3,
      guidedSelectedAnswer: 'A frameshift',
      guidedAnswers: { mutation: { attempts: 1, answer: 'A frameshift', correct: true } },
      mutationLog: []
    });
    expect(mutationBlocked).toContain('Apply a one-base insertion in the Mutate activity below to unlock Continue.');

    const mutationReady = renderDNA({
      tab: 'mutate',
      guidedStarted: true,
      guidedStep: 3,
      guidedSelectedAnswer: 'A frameshift',
      guidedAnswers: { mutation: { attempts: 1, answer: 'A frameshift', correct: true } },
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }]
    });
    expect(mutationReady).toContain('Finish investigation');
  });

  it('labels the latest mutation with its predicted coding effect', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaSequence: 'ATGCGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }]
    });
    expect(html).toContain('Predicted coding effect: Frameshift');
  });
  it('exposes both strand orientations and a template-strand readout', () => {
    const html = renderDNA({ tab: 'build', dnaStrandView: 'template', dnaSequence: 'ATGC' });
    expect(html).toContain('Template strand (3&#x27; -&gt; 5&#x27;)');
    expect(html).toContain('Coding 5&#x27; -&gt; 3&#x27;');
    expect(html).toContain('Template 3&#x27; -&gt; 5&#x27;');
    expect(html).toContain('Editable Template strand');
    expect(html).toContain('TACG');
  });

  it('shows the transcription direction relationship explicitly', () => {
    const html = renderDNA({ tab: 'transcribe', dnaSequence: 'ATGC' });
    expect(html).toContain('Template 3&#x27; -&gt; 5&#x27;');
    expect(html).toContain('mRNA 5&#x27; -&gt; 3&#x27;');
    expect(html).toContain('The template strand is read');
  });

  it('renders a completed investigation state and keeps source/public mirrors identical', () => {
    const html = renderDNA({
      tab: 'mutate',
      guidedComplete: true,
      guidedFeedback: 'Investigation complete.'
    });
    expect(html).toContain('Complete');
    expect(html).toContain('Investigation complete.');
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
    expect(crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex'))
      .toBe(crypto.createHash('sha256').update(fs.readFileSync(publicPath)).digest('hex'));
  });
});