import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let inboxMeta;

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('view_submission_inbox_module.js');
  inboxMeta = window.AlloModules.SubmissionInbox._meta;
});

describe('submission response manifest', () => {
  it('resolves choice values into readable labels and keeps structured items out of AI grading', () => {
    const payload = {
      schemaVersion: 3,
      responses: {
        'allo-response:quiz:q0:mcq': '1',
        'allo-response:quiz:q1:multi': '["0","2"]',
        'allo-response:quiz:q2:short': 'Because the evidence supports the claim.',
      },
      responseManifest: {
        schemaVersion: 1,
        entries: [
          { key: 'allo-response:quiz:q0:mcq', question: 'Choose one.', responseType: 'mcq', partLabel: 'Answer', valueLabels: { 0: 'First', 1: 'Second' }, manualReview: true },
          { key: 'allo-response:quiz:q1:multi', question: 'Choose two.', responseType: 'multi-select', partLabel: 'Selected answers', valueLabels: { 0: 'Alpha', 1: 'Beta', 2: 'Gamma' }, manualReview: true },
          { key: 'allo-response:quiz:q2:short', question: 'Explain your choice.', responseType: 'short-answer', partLabel: 'Short answer', valueLabels: {}, manualReview: false },
        ],
      },
    };

    const entries = inboxMeta.responseEntryModels(payload);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({ question: 'Choose one.', displayValue: 'Second', requiresManualReview: true, aiGradable: false });
    expect(entries[1]).toMatchObject({ displayValue: 'Alpha, Gamma', requiresManualReview: true, aiGradable: false });
    expect(entries[2]).toMatchObject({ question: 'Explain your choice.', displayValue: 'Because the evidence supports the claim.', requiresManualReview: false, aiGradable: true });
  });

  it('does not let manifest metadata disguise structured suffixes as free responses', () => {
    const [entry] = inboxMeta.responseEntryModels({
      responses: { 'allo-response:quiz:q0:mcq': '0' },
      responseManifest: { schemaVersion: 1, entries: [{ key: 'allo-response:quiz:q0:mcq', responseType: 'short-answer', manualReview: false }] },
    });
    expect(entry.requiresManualReview).toBe(true);
    expect(entry.aiGradable).toBe(false);
  });

  it('keeps schema-v2 submissions backward-compatible', () => {
    const entries = inboxMeta.responseEntryModels({ schemaVersion: 2, responses: {
      'allo-ta:legacy:abc': 'Legacy written answer',
      'allo-bx:legacy:def': 'Legacy fill blank',
      'allo-response:legacy:q1:short': 'Older named written answer',
      'allo-mcq:legacy-q2': '1',
    } });
    expect(entries[0]).toMatchObject({ question: 'Response 1', responseType: 'legacy-response', displayValue: 'Legacy written answer', aiGradable: true });
    expect(entries[1]).toMatchObject({ aiGradable: false, requiresManualReview: true });
    expect(entries[2]).toMatchObject({ aiGradable: true, requiresManualReview: false });
    expect(entries[3]).toMatchObject({ aiGradable: false, requiresManualReview: true });
  });

  it('fails closed for schema-v3 rows with a missing, incomplete, or unsupported manifest', () => {
    const cases = [
      { schemaVersion: 3, responses: { 'allo-response:quiz:q2:short': 'Text' } },
      { schemaVersion: 3, responses: { 'allo-response:quiz:q2:short': 'Text' }, responseManifest: { schemaVersion: 99, entries: [] } },
      { schemaVersion: 3, responses: { 'allo-response:quiz:q2:short': 'Text' }, responseManifest: { schemaVersion: 1, entries: [] } },
    ];
    cases.forEach((payload) => {
      const [entry] = inboxMeta.responseEntryModels(payload);
      expect(entry).toMatchObject({ aiGradable: false, requiresManualReview: true });
    });
  });

  it('includes unanswered expected controls in review coverage models', () => {
    const entries = inboxMeta.responseEntryModels({
      schemaVersion: 3,
      responses: { 'allo-response:quiz:q0:mcq': '1' },
      responseManifest: {
        schemaVersion: 1,
        entries: [
          { key: 'allo-response:quiz:q0:mcq', question: 'First', responseType: 'mcq', partLabel: 'Answer' },
          { key: 'allo-response:quiz:q1:short', question: 'Second', responseType: 'short-answer', partLabel: 'Short answer' },
        ],
      },
    });
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ answered: true, expectedCountKnown: true });
    expect(entries[1]).toMatchObject({ answered: false, expectedFromManifest: true, requiresManualReview: true, aiGradable: false });
  });

  it('keeps student-file labels out of AI context and exposes auditable manual scoring', () => {
    const source = readFileSync(resolve(process.cwd(), 'view_submission_inbox_source.jsx'), 'utf8');
    expect(source).toContain('.filter(entry => entry.rawText && entry.aiGradable');
    expect(source).toContain('const itemContext = contextText;');
    expect(source).not.toContain("contextText || row.payload.docTitle");
    expect(source).not.toContain("entry.question ? ('Question: ' + entry.question)");
    expect(source).toContain("React.createElement('details'");
    expect(source).toContain("tr('Stored value:')");
    expect(source).toContain("tr('Score manually')");
    expect(source).toContain("origin: 'teacher-edit'");
    expect(source).toContain("summary.expectedCountKnown ? 'expected' : 'captured'");
    expect(source).toContain("grade.origin === 'teacher-edit'");
    expect(source).toContain('const remapRowIndexState');
    expect(source).toContain('setGrades(prev => remapRowIndexState(prev, idx))');
    expect(source).toContain('const savedGrades = Object.create(null)');
    expect(source).toContain("const scoreText = String(pendingAnchor.score");
    expect(source).not.toContain('Object.entries(row.payload.responses).map(([k, v]');
  });
});
