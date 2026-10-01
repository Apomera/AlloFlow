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

describe('DNA Lab translation', () => {
  it('does not count a stop codon as an amino acid', () => {
    const html = renderDNA({ dnaSequence: 'ATGCGTACCTGA', tab: 'build' });
    expect(html).toContain('3 aa');
    expect(html).not.toContain('4 aa');
    expect(html).toContain('tabindex="0"');
  });

  it('uses coding-strand stop codons for generated DNA', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8');
    expect(source).toContain("var stops = ['TAA', 'TAG', 'TGA'];");
    expect(source).not.toContain("var stops = ['TAC', 'ATT', 'ACT'];");
  });
});

describe('DNA Lab CRISPR schematic', () => {
  it('places the SpCas9 cut about three bases upstream of NGG', () => {
    const html = renderDNA({ tab: 'crispr', dnaSequence: 'ATGAAACCCAGGTTT' });
    expect(html).toContain('Schematic guide window: pos 4-9');
    expect(html).toContain('cut near pos 7');
    expect(html).toContain('PAM: AGG at pos 10');
    expect(html).toContain('gRNA: UUUGGG');
  });

  it('falls back to a valid PAM when a previous selection is stale', () => {
    const html = renderDNA({
      tab: 'crispr',
      dnaSequence: 'ATGAAACCCAGGTTT',
      crisprTargetPAM: 99
    });
    expect(html).toContain('Schematic guide window: pos 4-9');
    expect(html).toContain('aria-pressed="true"');
  });

  it('discloses the shortened guide window', () => {
    const html = renderDNA({ tab: 'crispr', dnaSequence: 'ATGAAACCCAGGTTT' });
    expect(html).toContain('six-base guide window is schematic');
    expect(html).toContain('real SpCas9 spacers are typically 20 nt');
  });

  it('exposes a labeled donor-base control during repair', () => {
    const html = renderDNA({
      tab: 'crispr',
      dnaSequence: 'ATGAAACCCAGGTTT',
      crisprPhase: 'cut'
    });
    expect(html).toContain('Choose the donor-template base for the HDR model');
    expect(html).toContain('HDR donor base:');
    expect(html).toContain('aria-pressed="true"');
  });
});

describe('DNA Lab forensics model', () => {
  it('states its evidence limitations and exposes table headers', () => {
    const html = renderDNA({ tab: 'forensics', forensicGelRun: true });
    expect(html).toContain('Real evidence may be partial, degraded, contaminated, or mixed');
    expect((html.match(/scope="col"/g) || []).length).toBe(3);
    expect(html).toContain('Choose the comparison sample');
  });
});