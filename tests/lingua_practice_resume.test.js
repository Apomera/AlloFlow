import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, axe, Lingua, root, host;
const now = 1_700_000_000_000;
const lesson = {
  title: 'French checkpoint', goal: 'Continue a lesson.', scenario: 'Everyday practice.',
  vocabulary: [{ id: 'word-1', term: 'bonjour', meaning: 'hello', forms: [{ id: 'form-1', label: 'plural', form: 'bonjours' }] }],
  phrases: [{ target: 'Bonjour.', translation: 'Hello.' }, { target: 'Au revoir.', translation: 'Goodbye.' }],
  conversation: [{ coach: 'Bonjour.', translation: 'Hello.', sample: 'Bonjour !' }, { coach: 'Au revoir.', translation: 'Goodbye.', sample: 'Au revoir !' }],
};
const setEntry = { id: 'set-french', language: 'French', name: 'French checkpoint', lesson, level: 'Beginner', archived: false, createdAt: now - 1000, updatedAt: now - 1000 };

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
  vi.restoreAllMocks();
});

describe('Lingua privacy-minimal activity checkpoints', () => {
  it('whitelists only route metadata, resolves exact items, and drops stale scope/content', () => {
    const normalizedEntry = Lingua._normalizePracticeSets([setEntry])[0];
    const form = Lingua._formPracticeItems(normalizedEntry.lesson, [], 'French', now)[0];
    const phraseId = Lingua._pronunciationSourceId({ language: 'French', practiceSetId: setEntry.id, target: lesson.phrases[1].target });
    let store = Lingua._savePracticeCheckpoint({ version: 1, items: [] }, {
      language: 'French', practiceSetId: setEntry.id, assignmentId: '', assignmentRevision: 0,
      tab: 'speak', itemId: phraseId, index: 1, updatedAt: now,
      answer: 'private answer', typedRecall: 'private recall', transcript: 'private transcript',
      feedback: 'private feedback', chat: ['private'], sourceText: 'private source', audio: 'data:audio', image: 'data:image', recognizer: { confidence: 1 },
    });
    expect(store.items).toEqual([{ language: 'French', practiceSetId: setEntry.id, assignmentId: '', assignmentRevision: 0, tab: 'speak', updatedAt: now, itemId: phraseId, index: 1 }]);
    expect(JSON.stringify(store)).not.toMatch(/private|transcript|recognizer|audio|image|feedback|answer|recall|chat|sourceText/i);
    expect(Lingua._normalizePracticeCheckpoints({ version: 1, items: [{ language: 'French', practiceSetId: setEntry.id, assignmentId: 'assignment-1', assignmentRevision: Infinity, tab: 'chat', updatedAt: now }] }).items[0].assignmentRevision).toBe(0);
    expect(Lingua._resolvePracticeCheckpoint(store, [setEntry], {}, { language: 'French' }, now)).toMatchObject({ tab: 'speak', resolvedIndex: 1 });

    const staleExact = { version: 1, items: [{ language: 'French', practiceSetId: setEntry.id, assignmentId: '', assignmentRevision: 0, tab: 'speak', itemId: 'speech-missing', index: 1, updatedAt: now }] };
    expect(Lingua._resolvePracticeCheckpoint(staleExact, [setEntry], {}, { language: 'French' }, now)).toBeNull();
    const legacyIndexOnly = { version: 1, items: [{ language: 'French', practiceSetId: setEntry.id, assignmentId: '', assignmentRevision: 0, tab: 'speak', index: 1, updatedAt: now }] };
    expect(Lingua._resolvePracticeCheckpoint(legacyIndexOnly, [setEntry], {}, { language: 'French' }, now)).toMatchObject({ tab: 'speak', resolvedIndex: 1 });
    expect(Lingua._normalizePracticeCheckpoints({ version: 1, items: [{ language: 'French', practiceSetId: setEntry.id, tab: 'speak', itemId: '', index: 1, updatedAt: now }] }).items).toEqual([]);

    const conversationId = Lingua._conversationTurnId(lesson.conversation[1]);
    const reorderedEntry = { ...setEntry, lesson: { ...lesson, conversation: [lesson.conversation[1], lesson.conversation[0]] } };
    const conversationCheckpoint = { version: 1, items: [{ language: 'French', practiceSetId: setEntry.id, assignmentId: '', assignmentRevision: 0, tab: 'conversation', itemId: conversationId, index: 1, updatedAt: now }] };
    expect(Lingua._resolvePracticeCheckpoint(conversationCheckpoint, [reorderedEntry], {}, { language: 'French' }, now)).toMatchObject({ tab: 'conversation', resolvedIndex: 0 });
    expect(Lingua._resolvePracticeCheckpoint({ version: 1, items: [{ ...conversationCheckpoint.items[0], itemId: 'turn-missing' }] }, [reorderedEntry], {}, { language: 'French' }, now)).toBeNull();

    store = Lingua._savePracticeCheckpoint(store, { language: 'French', practiceSetId: setEntry.id, assignmentId: 'assignment-1', assignmentRevision: 2, tab: 'forms', itemId: form.reviewId, index: 0, updatedAt: now + 1 });
    expect(Lingua._resolvePracticeCheckpoint(store, [setEntry], {}, { language: 'French', practiceSetId: setEntry.id, assignmentId: 'assignment-1', assignmentRevision: 2 }, now)).toMatchObject({ tab: 'forms', resolvedIndex: 0 });
    expect(Lingua._resolvePracticeCheckpoint(store, [setEntry], {}, { language: 'French', practiceSetId: setEntry.id, assignmentId: 'assignment-1', assignmentRevision: 3 }, now)).toBeNull();
    expect(Lingua._prunePracticeCheckpoints(store, [{ ...setEntry, archived: true }], {}, {}, now).items).toEqual([]);
    expect(Lingua._prunePracticeCheckpoints(store, [], {}, {}, now).items).toEqual([]);
  });

  it('drops typed recall while retaining privacy-safe review session metadata', () => {
    const safe = Lingua._normalizeReviewSnapshot({
      language: 'French', tag: 'greetings', order: 'term', size: '5', skippedIds: ['word-1'],
      session: { total: 1, know: 1 }, recall: 'my private typed answer', updatedAt: now,
    }, 'French');
    expect(safe).toEqual({
      language: 'French', tag: 'greetings', order: 'term', size: '5', skippedIds: ['word-1'],
      session: { total: 1, again: 0, hard: 0, learning: 0, know: 1 }, updatedAt: now,
    });
    expect(JSON.stringify(safe)).not.toContain('private typed answer');
    expect(Lingua._normalizeReviewSnapshotStore({ French: { language: 'French', recall: 'answer only', updatedAt: now } })).toEqual({});
    expect(Lingua._normalizeReviewSnapshotStore({ French: { ...safe, recall: 'legacy answer' } }).French).toEqual(safe);
  });

  it('bounds automatic checkpoint retries and flushes the latest safe route on pagehide', async () => {
    const nativeSetItem = Storage.prototype.setItem;
    let attempts = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'allo_lingua_practice_state_v1') {
        attempts += 1;
        if (attempts <= 2) throw new Error('temporary storage failure');
      }
      return nativeSetItem.call(this, key, value);
    });
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Lingua, { isOpen: true, initialConfig: { practiceSet: setEntry }, onClose() {} })); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 1100)); });
    expect(attempts).toBe(2);
    await act(async () => { window.dispatchEvent(new Event('pagehide')); });
    expect(attempts).toBe(3);
    const saved = JSON.parse(localStorage.getItem('allo_lingua_practice_state_v1'));
    expect(saved.items[0]).toMatchObject({ language: 'French', practiceSetId: setEntry.id, tab: 'vocabulary' });
    expect(JSON.stringify(saved)).not.toMatch(/answer|recall|transcript|feedback|chat/i);
  }, 90000);

  it('offers an axe-clean explicit choice and does not overwrite it before Resume', async () => {
    const phraseId = Lingua._pronunciationSourceId({ language: 'French', practiceSetId: setEntry.id, target: lesson.phrases[1].target });
    const checkpoint = { version: 1, items: [{ language: 'French', practiceSetId: setEntry.id, assignmentId: '', assignmentRevision: 0, tab: 'speak', updatedAt: now, itemId: phraseId, index: 1 }] };
    localStorage.setItem('allo_lingua_profile_v1', JSON.stringify({ known: 'English', target: 'French', level: 'Beginner', topic: 'Greetings' }));
    localStorage.setItem('allo_lingua_sets_v1', JSON.stringify([setEntry]));
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({ saved: [], formReviews: [] }));
    localStorage.setItem('allo_lingua_practice_state_v1', JSON.stringify(checkpoint));
    localStorage.setItem('allo_lingua_review_v1', JSON.stringify({ French: {
      language: 'French', tag: 'all', order: 'due', size: 'all', skippedIds: [], session: { total: 1, know: 1 },
      recall: 'legacy private typed answer', updatedAt: now,
    } }));
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Lingua, { isOpen: true, onClose() {} })); });
    expect(host.textContent).toContain('Pick up where you left off');
    expect(host.textContent).toContain('Resume practice');
    expect(host.textContent).toContain('Start fresh');
    expect(JSON.parse(localStorage.getItem('allo_lingua_practice_state_v1'))).toEqual(checkpoint);
    expect(JSON.stringify(JSON.parse(localStorage.getItem('allo_lingua_review_v1')))).not.toMatch(/recall|legacy private typed answer/i);
    expect((await axe.run(host, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false }, 'page-has-heading-one': { enabled: false }, 'landmark-one-main': { enabled: false }, 'scrollable-region-focusable': { enabled: false } } })).violations).toEqual([]);
    const resume = [...host.querySelectorAll('button')].find(button => button.textContent.includes('Resume practice'));
    await act(async () => { resume.click(); await new Promise(resolve => setTimeout(resolve, 5)); });
    expect(host.textContent).toContain('Au revoir.');
    expect(host.textContent).not.toContain('Pick up where you left off');
    expect(document.activeElement?.textContent).toBe('Au revoir.');
  }, 90000);
});
