import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, axe, Lingua, root, host;
const AXE_OPTIONS = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, rules: { 'color-contrast': { enabled: false }, region: { enabled: false }, 'page-has-heading-one': { enabled: false }, 'landmark-one-main': { enabled: false }, 'scrollable-region-focusable': { enabled: false } } };
const now = 1_700_000_000_000;
const lesson = {
  title: 'French forms', goal: 'Use forms in context.', scenario: 'A conversation.',
  vocabulary: [{ id: 'word-bonjour', term: 'bonjour', meaning: 'hello', forms: [{ id: 'form-bonjours', label: 'plural', form: 'bonjours', includeInPractice: true }] }],
  phrases: [{ target: 'Bonjour tout le monde.', translation: 'Hello everyone.' }], conversation: [],
};
const setEntry = { id: 'set-french', language: 'French', name: 'French forms', lesson, level: 'Beginner', createdAt: now - 10_000, updatedAt: now - 10_000 };

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('lingua_practice_module.js');
  Lingua = window.AlloModules.LinguaPractice;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
});

function fixtureProgress(scope = {}) {
  const formItem = Lingua._formPracticeItems(lesson, [], 'French', now)[0];
  const formId = Lingua._formReviewId('French', formItem);
  const sourceId = Lingua._pronunciationSourceId({ language: 'French', practiceSetId: setEntry.id, target: lesson.phrases[0].target, ...scope });
  return {
    saved: [{ id: 'French::bonjour', language: 'French', term: 'bonjour', meaning: 'hello', nextReviewAt: now - 500, lastRating: 'again', reviewStage: 0, reviews: 1 }],
    formReviews: [{ id: formId, kind: 'form', language: 'French', wordId: formItem.wordId, formId: formItem.formId, base: formItem.base, meaning: formItem.meaning, label: formItem.label, form: formItem.form, practiceSetId: setEntry.id, nextReviewAt: now - 400, lastRating: 'again', ...scope }],
    pronunciationEvidence: [
      { id: 'speech-2', language: 'French', practiceSetId: setEntry.id, sourceId, focusUnits: ['Bonjour'], evidenceLevel: 'transcript-only', at: now - 100, transcript: 'private transcript', recognizer: { confidence: 0.2 }, ...scope },
      { id: 'speech-1', language: 'French', practiceSetId: setEntry.id, sourceId, focusUnits: ['bonjour'], evidenceLevel: 'transcript-only', at: now - 200, transcript: 'private transcript', ...scope },
    ],
  };
}

describe('Lingua privacy-safe continuity suggestions', () => {
  it('returns at most one resolvable suggestion per evidence kind without raw recognition data', () => {
    const progress = fixtureProgress();
    progress.formReviews.unshift({ ...progress.formReviews[0], id: 'stale', practiceSetId: 'deleted-set', nextReviewAt: 0 });
    progress.pronunciationEvidence.unshift({ ...progress.pronunciationEvidence[0], id: 'archived', practiceSetId: 'archived-set' });
    const archived = { ...setEntry, id: 'archived-set', archived: true };
    const suggestions = Lingua._practiceContinuitySuggestions(progress, [setEntry, archived], 'French', now, {});
    expect(suggestions.map((item) => item.kind)).toEqual(['word-review', 'form-review', 'speech-retry']);
    expect(suggestions).toHaveLength(3);
    const currentSet = Lingua._normalizePracticeSets([setEntry])[0];
    expect(suggestions[1].itemId).toBe(Lingua._formPracticeItems(currentSet.lesson, [], 'French', now)[0].reviewId);
    expect(suggestions[2]).toMatchObject({ practiceSetId: 'set-french', focus: 'Bonjour' });
    expect(JSON.stringify(suggestions)).not.toMatch(/private transcript|rawTranscript|confidence|score/i);
  });

  it('keeps assignment evidence on the exact assignment revision and excludes personal word review', () => {
    const exact = { assignmentId: 'assignment-a', assignmentRevision: 3 };
    const progress = fixtureProgress(exact);
    progress.pronunciationEvidence.push({ ...progress.pronunciationEvidence[0], id: 'wrong-revision', assignmentRevision: 2, at: now });
    const suggestions = Lingua._practiceContinuitySuggestions(progress, [setEntry], 'French', now, { practiceSetId: setEntry.id, ...exact });
    expect(suggestions.map((item) => item.kind)).toEqual(['form-review', 'speech-retry']);
    expect(JSON.stringify(suggestions)).not.toContain('wrong-revision');
  });

  it('renders an honest accessible Progress queue and opens its resolved form activity', async () => {
    localStorage.setItem('allo_lingua_profile_v1', JSON.stringify({ known: 'English', target: 'French', level: 'Beginner', topic: 'Forms' }));
    localStorage.setItem('allo_lingua_sets_v1', JSON.stringify([setEntry]));
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify(fixtureProgress()));
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Lingua, { isOpen: true, onClose: () => {} })); });
    const progressButton = Array.from(host.querySelectorAll('button')).find((node) => node.textContent.includes('Progress'));
    await act(async () => { progressButton.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('Ready for another look');
    expect(host.textContent).toContain('not a score or a claim about ability');
    expect(host.querySelectorAll('[data-continuity-kind]')).toHaveLength(3);
    expect(host.textContent).not.toContain('private transcript');
    expect((await axe.run(host, AXE_OPTIONS)).violations).toEqual([]);
    const openForm = host.querySelector('[data-continuity-kind="form-review"]');
    await act(async () => { openForm.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    expect(host.textContent).toContain('Grammar and word forms');
    expect(host.textContent).toContain('Write the form labeled plural');
  }, 90000);
});
