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

describe('DNA Lab student report preview', () => {
  it('renders an evidence-backed report with a reflection field', () => {
    const html = renderDNA({
      tab: 'mutate',
      dnaReportOpen: true,
      dnaReportNote: 'The insertion changed the downstream reading frame.',
      dnaSequence: 'ATGACGTACCTGAAACTGA',
      mutationLog: [{ type: 'Insertion', pos: 3, to: 'A' }],
      guidedAnswers: { pairing: { correct: true } }
    });
    expect(html).toContain('data-dna-lab-report="true"');
    expect(html).toContain('Student DNA lab report');
    expect(html).toContain('Evidence to cite');
    expect(html).toContain('Guided knowledge checks');
    expect(html).toContain('Reflection / claim');
    expect(html).toContain('The insertion changed the downstream reading frame.');
    expect(html).toContain('Download report');
  });

  it('keeps the report closed by default and includes reflection in exported evidence', () => {
    const html = renderDNA({ tab: 'build' });
    expect(html).not.toContain('data-dna-lab-report="true"');
    const source = fs.readFileSync('stem_lab/stem_tool_dna.js', 'utf8');
    expect(source).toContain('function toggleDnaReport');
    expect(source).toContain("dnaReportNote || 'Not entered'");
  });
});