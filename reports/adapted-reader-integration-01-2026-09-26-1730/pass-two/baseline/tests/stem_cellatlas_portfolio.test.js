import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_cellatlas.js';

describe('Cell Atlas persistent revision portfolio', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'cellAtlasLab');
  });

  it('renders the evidence map and portfolio controls in Methods + sources', () => {
    const rendered = renderTool('cellAtlasLab', { cellAtlasLab: { tissue: 'pancreas', view: 'source' } });
    expect(rendered).toContain('Claim to evidence map');
    expect(rendered).toContain('Revision portfolio');
    expect(rendered).toContain('Save portfolio attempt');
    expect(rendered).toContain('Download snapshot (.json)');
    expect(rendered).toContain('Learner self-check');
    expect(rendered).toContain('Confidence level');
    expect(rendered).toContain('Strongest evidence I used');
    expect(rendered).toContain('not part of the rubric score');
    expect(rendered).toContain('aria-label=\"Claim to evidence map\"');
    expect(rendered).toContain('scope=\"col\"');
    expect(rendered).toContain('No saved attempts yet.');
  });

  it('renders bounded saved attempts and revision status', () => {
    const rendered = renderTool('cellAtlasLab', {
      cellAtlasLab: {
        tissue: 'pancreas',
        view: 'source',
        crossNotebook: { vascular: { claim: 'Support job differs by tissue.', evidence: 'INS and SFTPC are displayed anchors.', reasoning: 'The markers support comparison, not identity.' } },
        cautionAnswer: 'cautious',
        cellAtlasPortfolio: {
          schemaVersion: 'cell-atlas-portfolio/v1',
          activeAttemptId: 'attempt-2',
          attempts: [
            {
              schemaVersion: 'cell-atlas-portfolio/v1',
              id: 'attempt-1',
              createdAt: '2026-07-01T00:00:00.000Z',
              tissue: { id: 'pancreas', label: 'Pancreas', lens: 'vascular' },
              rubric: [
                { label: 'Evidence route', score: 2, detail: 'route', nextMove: 'continue' },
                { label: 'Claim + limitation', score: 2, detail: 'claim', nextMove: 'revise' },
                { label: 'Source provenance', score: 3, detail: 'source', nextMove: 'cite' },
                { label: 'Portfolio evidence', score: 1, detail: 'packet', nextMove: 'save' }
              ],
              total: 8,
              route: { completedCount: 1, total: 5 },
              nextMove: { label: 'Portfolio evidence', action: 'Save a packet.' },
              evidenceMap: { claim: 'claim', evidence: 'evidence', reasoning: 'reasoning', limitation: 'limit', markers: ['Beta cell / INS'] },
              provenance: { sources: [] },
              teacherFeedback: 'Try one more revision.',
              revision: { previousAttemptId: '', scoreDelta: 0 }
            },
            {
              schemaVersion: 'cell-atlas-portfolio/v1',
              id: 'attempt-2',
              createdAt: '2026-07-02T00:00:00.000Z',
              tissue: { id: 'pancreas', label: 'Pancreas', lens: 'vascular' },
              rubric: [
                { label: 'Evidence route', score: 3, detail: 'route', nextMove: 'continue' },
                { label: 'Claim + limitation', score: 3, detail: 'claim', nextMove: 'revise' },
                { label: 'Source provenance', score: 4, detail: 'source', nextMove: 'cite' },
                { label: 'Portfolio evidence', score: 2, detail: 'packet', nextMove: 'save' }
              ],
              total: 12,
              route: { completedCount: 3, total: 5 },
              nextMove: { label: 'Portfolio evidence', action: 'Save a packet.' },
              evidenceMap: { claim: 'claim', evidence: 'evidence', reasoning: 'reasoning', limitation: 'limit', markers: ['Beta cell / INS'] },
              provenance: { sources: [] },
              teacherFeedback: 'Better limitation.',
              revision: { previousAttemptId: 'attempt-1', scoreDelta: 4 }
            }
          ]
        }
      }
    });
    expect(rendered).toContain('2/8 attempts saved');
    expect(rendered).toContain('aria-label=\"Saved revision attempts\"');
    expect(rendered).toContain('+4 rubric points');
    expect(rendered).toContain('2026-07-02');
    expect(rendered).toContain('12/16');
  });

  it('keeps portfolio imports bounded and sequence-free', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    expect(source).toContain("var PORTFOLIO_SCHEMA_VERSION = 'cell-atlas-portfolio/v1'");
    expect(source).toContain('function sanitizePortfolioAttempt(raw)');
    expect(source).toContain('function cellAtlasLearnerReflection()');
    expect(source).toContain('Strongest evidence reflection:');
    expect(source).toContain('Remaining uncertainty reflection:');
    expect(source).toContain('cal-self-check-evidence');
    expect(source).toContain('cal-self-check-uncertainty');
    expect(source).toContain("allowed.push('teacher-review-portfolio')");
    expect(source).toContain("replace(/\\s+/g, ' ')");
    expect(source).toContain("replace(/\\b[ACGTN]{16,}\\b/gi, '[sequence omitted]')");
    expect(source).toContain('.slice(-8)');
    expect(source).toContain('[sequence omitted]');
    expect(source).toContain('No raw donor rows, sequences, clinical data');
  });

  it('keeps the portfolio implementation mirrored in the public bundle', () => {
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_cellatlas.js', 'utf8'))
      .toBe(fs.readFileSync(SOURCE, 'utf8'));
  });
});
