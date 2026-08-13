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

describe('DNA Lab reading-frame visual refinement', () => {
  it('renders a three-row triplet alignment ruler with a concise legend', () => {
    const html = renderDNA({ tab: 'translate' });
    expect(html).toContain('data-dna-frame-alignment="true"');
    expect(html).toContain('Triplet alignment ruler');
    expect(html).toContain('Reading frame color legend');
    expect(html).toContain('AUG start');
    expect(html).toContain('Coding ORF');
    expect(html).toContain('Outside ORF');
    expect(html).toContain('data-dna-frame-alignment-row="1"');
    expect(html).toContain('data-dna-frame-alignment-row="2"');
    expect(html).toContain('data-dna-frame-alignment-row="3"');
  });

  it('visually links the selected frame card, alignment row, and detail panel', () => {
    const html = renderDNA({
      tab: 'translate',
      dnaSequence: 'AATGAAATAA',
      dnaReadingFrame: 2
    });
    expect(html).toMatch(/data-dna-reading-frame="2"[^>]*data-frame-selected="true"/);
    expect(html).toMatch(/data-dna-frame-alignment-row="2"[^>]*data-frame-selected="true"/);
    expect(html).toContain('data-dna-reading-frame-detail="true" data-frame="2"');
    expect(html).toContain('data-frame-codon-state="start"');
    expect(html).toContain('data-frame-codon-state="stop"');
  });

  it('uses horizontal rails for dense frame cards and codon evidence', () => {
    const html = renderDNA({ tab: 'translate' });
    expect(html).toContain('snap-mandatory');
    expect(html).toContain('Scrollable codon rail for reading frame plus 1');
    expect(html).toContain('min-w-max');
    expect(html).toContain('Swipe or use Shift + mouse wheel');
  });

  it('gives the ribosome simulator a distinct final-stage treatment', () => {
    const html = renderDNA({ tab: 'translate' });
    expect(html).toContain('data-dna-ribosome-stage="true"');
    expect(html).toContain('Run the selected ORF from its first AUG');
    expect(html).toContain('Frame +1 · Complete ORF');
    const source = fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8');
    expect(source).toContain('data-dna-frame-alignment');
    expect(source).toContain('data-dna-ribosome-stage');
  });
});
