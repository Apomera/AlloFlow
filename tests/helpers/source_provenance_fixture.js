import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { expect } from 'vitest';
import { loadAlloModule } from '../setup.js';
import { React, ReactDOMClient, act } from './games_live_harness.js';

const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./glossary_media_fixture.cjs');
export const labels = {
  legacy: "Provenance: generated from this lesson's source text and selected grade level.",
  words: 'Provenance: started from a supplied word list.',
  blank: 'Provenance: started as a blank draft.',
  independent: 'Provenance: started without a source passage.',
};
export const privatePlanning = {
  parents: ['PRIVATE_PROVENANCE_PARENT_SENTINEL'],
  roles: { teacher: 'PRIVATE_PROVENANCE_ROLE_SENTINEL' },
  note: 'PRIVATE_PROVENANCE_NOTE_SENTINEL',
};

export function resource(kind, marker = 'root') {
  const seed = kind === 'word-list'
    ? { kind, terms: ['Leaf'], termLanguage: 'English' }
    : { kind };
  const item = {
    id: 'provenance-' + kind + '-' + marker,
    type: 'glossary', title: 'Synthetic leaf glossary', language: 'English',
    config: { language: 'English', baseLanguage: 'English' },
    data: [{ entryId: 'leaf', term: 'Leaf', def: 'A plant part that captures sunlight.', tier: 'Domain-Specific' }],
    lessonPath: { seed, ...privatePlanning },
  };
  if (marker === 'root' || marker === 'both') item.sourceSelection = 'seed';
  if (marker === 'config' || marker === 'both') item.config.sourceSelection = 'seed';
  return item;
}

export function loadRealSerializationAndViews() {
  window.React = React;
  for (const name of ['instructional_context_module.js', 'text_pipeline_helpers_module.js', 'allo_data_module.js',
    'generate_dispatcher_module.js', 'live_aac_module.js', 'firestore_sync_module.js']) loadAlloModule(name);
  expect(typeof window.AlloModules.LiveAac.serializeResourceForStudentPack).toBe('function');
  expect(typeof window.prepareSessionResourcesForWrite).toBe('function');
  expect(typeof window.sanitizeHistoryForCloud).toBe('function');
  expect(typeof window.stripUndefined).toBe('function');
  expect(typeof window.AlloModules.GenDispatcher.hasMinimumContent).toBe('function');
  const views = {};
  const paths = {
    canonical: process.env.ALLO_PROVENANCE_CANONICAL_MODULE || 'view_glossary_module.js',
    packaged: process.env.ALLO_PROVENANCE_PACKAGED_MODULE || 'desktop/app-build/view_glossary_module.js',
  };
  for (const [lane, file] of Object.entries(paths)) {
    delete window.AlloModules.GlossaryView;
    delete window.AlloModules.ViewGlossaryModule;
    new Function(readFileSync(resolve(file), 'utf8'))();
    views[lane] = window.AlloModules.GlossaryView;
    expect(typeof views[lane], lane + ' must expose the actual compiled GlossaryView').toBe('function');
  }
  return views;
}

export const boundaries = [
  {
    name: 'student pack',
    send(item) {
      return window.AlloModules.LiveAac.serializeResourceForStudentPack(item, {
        sanitizeHistoryForCloud: window.sanitizeHistoryForCloud,
        stripUndefined: window.stripUndefined,
      });
    },
  },
  {
    name: 'live session',
    send(item) {
      const prepared = window.prepareSessionResourcesForWrite([item], { maxBytes: 200000 });
      expect(Array.isArray(prepared.resources)).toBe(true);
      return prepared.resources.find(entry => entry.id === item.id) || null;
    },
  },
];

export function mountBack(View, item, translate = key => key) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const noop = () => {};
  const props = glossaryMediaProps({
    generatedContent: item,
    filteredGlossaryData: item.data.map((row, index) => ({ ...row, _originalIdx: index })),
    t: translate, selectedLanguages: [], displayLanguages: [], history: [],
    isTeacherMode: false, isInteractiveFlashcards: true, isFlashcardFlipped: true,
    flashcardMode: 'standard', standardDeckLang: 'English Only', flashcardLang: '',
    isFlashcardQuizMode: false, flashcardOptions: [], flashcardScore: 0,
    flashcardFeedback: null, quizSelectedOption: null, showFlashcardImages: false,
    flashcardCorrectAnswer: row => row.def, closeInteractiveFlashcards: noop,
    handleToggleIsFlashcardFlipped: noop, ErrorBoundary: ({ children }) => children,
  });
  for (const name of ['FlashcardOptions', 'FlashcardIndex', 'IsFlashcardFlipped', 'FlashcardMode',
    'StandardDeckLang', 'FlashcardLang', 'IsFlashcardQuizMode', 'FlashcardScore',
    'FlashcardFeedback', 'QuizSelectedOption']) props['set' + name] = noop;
  act(() => root.render(React.createElement(View, props)));
  const back = host.querySelector('[data-flashcard-face="back"]');
  expect(back, 'the actual standard flashcard back must be rendered').toBeTruthy();
  expect(back.style.display, 'the standard back must be the visible face').not.toBe('none');
  return { host, back, destroy() { act(() => root.unmount()); host.remove(); } };
}

export function assertPrivatePlanningRemoved(item) {
  expect(item).toBeTruthy();
  expect(Object.prototype.hasOwnProperty.call(item, 'lessonPath')).toBe(false);
  const serialized = JSON.stringify(item);
  for (const marker of Object.values(privatePlanning).flatMap(value => typeof value === 'string' ? [value] : Array.isArray(value) ? value : Object.values(value))) {
    expect(serialized).not.toContain(marker);
  }
}
