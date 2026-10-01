import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_quiz_source.jsx', 'utf8');

function extractHelpers(startMarker, endMarker, names) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end <= start) throw new Error('Could not extract Assess helpers');
  return new Function(source.slice(start, end) + '\nreturn {' + names.join(',') + '};')();
}

const numeric = extractHelpers(
  'function _quizParseIntegerWords',
  'function _quizNormalizeUnit',
  ['_quizParseIntegerWords', '_quizParseSpokenNumber', '_quizParseNumericResponse'],
);
const drafts = extractHelpers(
  "var _QUIZ_DRAFT_STORAGE_PREFIX",
  'function _quizUseDraftField',
  ['_quizDraftNamespace', '_quizReadDraft', '_quizReadDraftField', '_quizWriteDraftField'],
);

describe('Assess draft persistence and spoken numeric responses', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('normalizes common dictated number forms while preserving units', () => {
    expect(numeric._quizParseNumericResponse('negative three point five meters')).toEqual({ value: -3.5, unit: 'meters' });
    expect(numeric._quizParseNumericResponse('twenty-five kilograms')).toEqual({ value: 25, unit: 'kilograms' });
    expect(numeric._quizParseNumericResponse('two and a half cups')).toEqual({ value: 2.5, unit: 'cups' });
    expect(numeric._quizParseNumericResponse('three quarters inch')).toEqual({ value: 0.75, unit: 'inch' });
    expect(numeric._quizParseNumericResponse('1/4 liter')).toEqual({ value: 0.25, unit: 'liter' });
    expect(numeric._quizParseNumericResponse('not a number')).toBeNull();
  });

  it('scopes resumable drafts to the assessment and live session', () => {
    const assessment = {
      title: 'Matter check',
      questions: [{ type: 'numeric-response', question: 'How many?', correctValue: 4 }],
      reflections: ['What helped?'],
    };
    const localKey = drafts._quizDraftNamespace(assessment, '');
    const liveKey = drafts._quizDraftNamespace(assessment, 'ROOM1');
    expect(localKey).not.toBe(liveKey);
    expect(drafts._quizWriteDraftField(localKey, 'q-0', 'response', 'four')).toBe(true);
    expect(drafts._quizReadDraftField(localKey, 'q-0', 'response')).toEqual({ found: true, value: 'four' });
    expect(drafts._quizReadDraftField(liveKey, 'q-0', 'response').found).toBe(false);
  });

  it('expires stale local drafts instead of restoring old student work', () => {
    const key = drafts._quizDraftNamespace({ questions: [{ question: 'Old?' }] }, '');
    window.localStorage.setItem(key, JSON.stringify({
      version: 1,
      updatedAt: Date.now() - (8 * 24 * 60 * 60 * 1000),
      items: { root: { mcqAnswers: { 0: 1 } } },
    }));
    expect(drafts._quizReadDraft(key)).toBeNull();
    expect(window.localStorage.getItem(key)).toBeNull();
  });
});
