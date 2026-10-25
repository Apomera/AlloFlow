// Lane H (2026-10-25): the views for two generator fields lane D1 added.
// 1. KWL: the outline generator marks Know / Want as teacher examples
//    (branch.teacherExample, content.kwlTeacherExamples) and empties Learned.
//    Students must not see those examples as answers; teachers see them labelled.
//    A KWL without the flags renders exactly as before.
// 2. Glossary: an optional contextSentence quoted from the source shows under the
//    definition ("In the text:") in the word list (teacher and student) and on the
//    flashcard back, as escaped text.
// Both run the BUILT modules under real react-dom.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  window.React = React;
  window.AlloIcons = window.AlloIcons || new Proxy({}, { get: () => () => null, has: () => true });
  if (!window.AlloLanguageContext) window.AlloLanguageContext = React.createContext({ t: (key) => key });
  const renderers = process.env.H_RENDERERS_MODULE;
  if (renderers) new Function(readFileSync(renderers, 'utf8'))(); else loadAlloModule('view_renderers_module.js');
  const glossary = process.env.H_GLOSSARY_MODULE;
  if (glossary) new Function(readFileSync(glossary, 'utf8'))(); else loadAlloModule('view_glossary_module.js');
});

const cleanups = [];
afterEach(() => {
  cleanups.splice(0).reverse().forEach((fn) => fn());
  vi.restoreAllMocks();
  try { window.localStorage.clear(); } catch (_) {}
});

function mount(element) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = ReactDOMClient.createRoot(host);
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
  act(() => root.render(element));
  cleanups.push(() => { act(() => root.unmount()); host.remove(); quiet.mockRestore(); });
  return host;
}

// ---------------------------------------------------------------- KWL
const KNOW = 'Plants need sunlight to grow';
const WANT = 'How do roots find water?';
const LEARNED = 'Leaves make sugar from light';
const newKwl = () => ({
  main: 'Plant needs', structureType: 'KWL Chart', kwlTeacherExamples: true,
  branches: [
    { title: 'Know', items: [KNOW], teacherExample: true },
    { title: 'Want to Know', items: [WANT], teacherExample: true },
    { title: 'Learned', items: [] },
  ],
});
const legacyKwl = () => ({
  main: 'Plant needs', structureType: 'KWL Chart',
  branches: [
    { title: 'Know', items: [KNOW] },
    { title: 'Want to Know', items: [WANT] },
    { title: 'Learned', items: [] },
  ],
});
const kwlView = (data, isTeacherMode) => {
  const renderOutlineContent = window.AlloModules.ViewRenderers.renderOutlineContent;
  const Outline = () => renderOutlineContent({
    t: () => '', generatedContent: { type: 'outline', id: 'kwl-1', data }, isTeacherMode,
    isEditingOutline: false, isProcessing: false, ErrorBoundary: ({ children }) => children,
    handleGenerate: vi.fn(), handleToggleIsEditingOutline: vi.fn(), setIsInteractiveMap: vi.fn(),
    setIsInteractiveVenn: vi.fn(), setIsVennPlaying: vi.fn(), setMapAddInput: vi.fn(), addToast: vi.fn(),
  });
  return React.createElement(Outline);
};
// The three chart columns (the reflection board below the chart is a separate section).
const columns = (host) => [...host.querySelectorAll('h4')].filter((h) => ['Know', 'Want to Know', 'Learned'].includes(h.textContent.trim())).map((h) => h.parentElement);

describe('KWL teacher examples', () => {
  it('student mode hides the generated Know / Want examples and shows a writing prompt in every column', () => {
    const host = mount(kwlView(newKwl(), false));
    const cols = columns(host);
    expect(cols).toHaveLength(3);
    expect(host.textContent.includes(KNOW), 'Know example must not reach students').toBe(false);
    expect(host.textContent.includes(WANT), 'Want example must not reach students').toBe(false);
    expect(cols[0].textContent).toContain('What do you already know?');
    expect(cols[1].textContent).toContain('What do you want to know?');
    expect(cols[2].textContent).toContain('What did you learn?');
    expect(host.textContent.includes('Teacher examples')).toBe(false);
    // The prompts point at the writing surface, which is on the page.
    expect(host.querySelector('[data-organizer-activity-ready="true"]')).not.toBeNull();
    expect(host.querySelectorAll('textarea').length).toBe(3);
  });

  it('teacher mode shows the examples under a "hidden from students" label', () => {
    const host = mount(kwlView(newKwl(), true));
    const cols = columns(host);
    expect(cols[0].textContent).toContain(KNOW);
    expect(cols[1].textContent).toContain(WANT);
    const labels = [...host.querySelectorAll('[data-kwl-teacher-example-label]')];
    expect(labels).toHaveLength(2);
    for (const label of labels) expect(label.textContent).toBe('Teacher examples (hidden from students)');
    expect(cols[2].textContent).toContain('(students fill this in after the lesson)');
    expect(cols[2].querySelector('[data-kwl-teacher-example-label]')).toBeNull();
    expect(host.textContent.includes('What do you already know?')).toBe(false);
  });

  it('a teacher-added Learned item on a flagged KWL still reaches students', () => {
    const data = newKwl();
    data.branches[2].items = [LEARNED];
    const host = mount(kwlView(data, false));
    expect(columns(host)[2].textContent).toContain(LEARNED);
    expect(host.textContent.includes(KNOW)).toBe(false);
  });

  it('a legacy KWL (no flags) renders the same in student and teacher mode, items and all', () => {
    const student = mount(kwlView(legacyKwl(), false));
    const teacher = mount(kwlView(legacyKwl(), true));
    for (const host of [student, teacher]) {
      const cols = columns(host);
      expect(cols[0].textContent).toBe('Know●' + KNOW);
      expect(cols[1].textContent).toBe('Want to Know●' + WANT);
      expect(cols[2].textContent).toBe('Learned(students fill this in after the lesson)');
      expect(host.querySelector('[data-kwl-teacher-example-label]')).toBeNull();
      expect(host.querySelector('[data-kwl-student-prompt]')).toBeNull();
    }
    expect(columns(student).map((c) => c.innerHTML)).toEqual(columns(teacher).map((c) => c.innerHTML));
  });
});

// ---------------------------------------------------------------- Glossary
const HOSTILE = 'The <img src=x onerror="window.__hPwned=1"> leaf & its "veins" carry water.';
const glossaryData = () => [
  { entryId: 'leaf', term: 'Leaf', def: 'A plant part that captures sunlight.', tier: 'Domain-Specific', contextSentence: HOSTILE },
  { entryId: 'root', term: 'Root', def: 'The part of a plant under the ground.', tier: 'Domain-Specific' },
];
const glossaryProps = (extra = {}) => {
  const data = glossaryData();
  return glossaryMediaProps({
    generatedContent: { id: 'g-h', type: 'glossary', language: 'English', data },
    filteredGlossaryData: data.map((item, i) => ({ ...item, _originalIdx: i })),
    ...extra,
  });
};
const row = (host, id) => host.querySelector('tr[data-glossary-entry-key="entry:' + id + '"]');

describe('glossary contextSentence', () => {
  it.each([[true, 'teacher'], [false, 'student']])('word list shows "In the text:" under the definition (%s / %s view)', (isTeacherMode) => {
    delete window.__hPwned;
    const host = mount(React.createElement(window.AlloModules.GlossaryView, glossaryProps({ isTeacherMode })));
    const leaf = row(host, 'leaf');
    expect(leaf).not.toBeNull();
    const context = leaf.querySelector('[data-glossary-context-sentence]');
    expect(context, 'context sentence rendered').not.toBeNull();
    expect(context.textContent).toBe('In the text: ' + HOSTILE);
    // Escaped: the quoted markup is text, not an element.
    expect(context.querySelector('img')).toBeNull();
    expect(leaf.querySelector('img[src="x"]')).toBeNull();
    expect(window.__hPwned).toBeUndefined();
    // It sits in the definition cell, after the definition.
    const cell = context.closest('td');
    expect(cell.textContent.indexOf('A plant part that captures sunlight.')).toBeLessThan(cell.textContent.indexOf('In the text:'));
  });

  it('a term without contextSentence renders no context line', () => {
    const host = mount(React.createElement(window.AlloModules.GlossaryView, glossaryProps()));
    expect(row(host, 'root').querySelector('[data-glossary-context-sentence]')).toBeNull();
    expect(row(host, 'root').textContent.includes('In the text:')).toBe(false);
  });

  it('a blank or non-string contextSentence renders nothing', () => {
    const data = [{ entryId: 'a', term: 'A', def: 'Def A', contextSentence: '   ' }, { entryId: 'b', term: 'B', def: 'Def B', contextSentence: { text: 'x' } }];
    const host = mount(React.createElement(window.AlloModules.GlossaryView, glossaryMediaProps({
      generatedContent: { id: 'g-blank', type: 'glossary', language: 'English', data },
      filteredGlossaryData: data.map((item, i) => ({ ...item, _originalIdx: i })),
    })));
    expect(host.querySelector('[data-glossary-context-sentence]')).toBeNull();
    expect(host.textContent.includes('[object Object]')).toBe(false);
  });

  it('the flashcard back shows the context sentence; a card without one shows none', () => {
    const flash = (flashcardIndex) => mount(React.createElement(window.AlloModules.GlossaryView, glossaryProps({
      isInteractiveFlashcards: true, isFlashcardFlipped: true, flashcardMode: 'standard', standardDeckLang: 'English Only', flashcardIndex,
    })));
    const withContext = flash(0).querySelector('[data-flashcard-face="back"]');
    expect(withContext).not.toBeNull();
    const line = withContext.querySelector('[data-glossary-context-sentence]');
    expect(line, 'flashcard context line').not.toBeNull();
    expect(line.textContent).toBe('In the text: ' + HOSTILE);
    expect(line.querySelector('img')).toBeNull();
    const without = flash(1).querySelector('[data-flashcard-face="back"]');
    expect(without.querySelector('[data-glossary-context-sentence]')).toBeNull();
  });
});
