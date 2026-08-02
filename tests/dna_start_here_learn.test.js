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

describe('DNA Lab orientation and progressive disclosure', () => {
  it('gives a fresh learner a clear first station', () => {
    const html = renderDNA({ tab: 'build' });
    expect(html).toContain('data-dna-start-here="true"');
    expect(html).toContain('Start with the core workflow');
    expect(html).toContain('Next station: Build');
    expect(html).toContain('Open Build');
    expect(html).toContain('First step');
    expect(html).toContain('data-dna-start-sequence="true"');
    expect(html).toContain('Build');
    expect(html).toContain('Replicate');
    expect(html).toContain('Transcribe');
    expect(html).toContain('Translate');
    expect(html).toContain('Mutate');
    expect(html).toContain('data-state="current"');
  });

  it('points an active guided learner to the next checkpoint station', () => {
    const html = renderDNA({
      tab: 'transcribe',
      guidedStarted: true,
      guidedStep: 1,
      guidedAnswers: { pairing: { attempts: 1, answer: 'T', correct: true } }
    });
    expect(html).toContain('Resume your guided investigation');
    expect(html).toContain('Checkpoint 2/4');
    expect(html).toContain('Next station: Transcribe');
    expect(html).toContain('Resume checkpoint');
  });

  it('renders Learn topics as native disclosure sections', () => {
    const html = renderDNA({ tab: 'learn' });
    expect(html).toContain('Choose one topic to reveal a focused explainer');
    expect(html).toContain('data-dna-learn-topic="build"');
    expect(html).toContain('data-dna-learn-topic="transcribe"');
    expect(html).toContain('Start here');
    expect(html).toContain('Open');
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
    expect(crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex'))
      .toBe(crypto.createHash('sha256').update(fs.readFileSync(publicPath)).digest('hex'));
  });
});