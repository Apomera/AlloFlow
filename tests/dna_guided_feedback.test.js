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

describe('DNA Lab misconception feedback', () => {
  it('keeps targeted feedback visible for an incorrect direction choice', () => {
    const html = renderDNA({
      tab: 'transcribe',
      guidedStarted: true,
      guidedStep: 1,
      guidedSelectedAnswer: "5' -> 3'",
      guidedFeedback: "↻ Not yet. 5' -> 3' is the direction RNA polymerase builds RNA; it reads the template 3' -> 5'."
    });
    expect(html).toContain('RNA polymerase builds RNA');
    expect(html).toContain('guided');
  });

  it('defines distractor-specific explanations for each guided checkpoint', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8');
    expect(source).toContain('function guidedMisconceptionHint');
    expect(source).toContain('G pairs with C; compare the two DNA pairs');
    expect(source).toContain('RNA is made before protein');
    expect(source).toContain('downstream triplet grouping');
    expect(source).toContain('var feedbackHint = guidedMisconceptionHint(current, answer);');
  });
});