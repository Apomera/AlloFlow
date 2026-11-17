// PoetTree's syllable check counts the way a dictionary does.
//
// WHY (2026-11-16): the live check beside the editor and "Verify with CMU"
// both counted vowel groups by rule. A review ran 75 common words through it
// and 29 came out wrong (poem 1, science 1, beautiful 4, evening 3), so a
// correct haiku was marked wrong. The app already ships a word table built
// from the CMU Pronouncing Dictionary for Word Sounds; PoetTree now reads it,
// and only estimates a word the table does not have.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import fs from 'node:fs';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, PoetTree, root, host;

// The reviewer's 75 words with their syllable counts.
const WORDS = {
  the: 1, quiet: 2, poem: 2, fire: 1, people: 2, little: 2, table: 2, beautiful: 3, every: 2, evening: 2, ocean: 2,
  idea: 3, create: 2, science: 2, lion: 2, being: 2, purple: 2, apple: 2, family: 3, different: 3, flower: 2, hour: 1,
  our: 1, chocolate: 2, business: 2, area: 3, video: 3, radio: 3, orange: 2, something: 2, loved: 1, wanted: 2,
  horses: 2, makes: 1, smile: 1, here: 1, machine: 2, cafe: 2, recipe: 3, maybe: 2, eye: 1, you: 1, yellow: 2,
  rhythm: 2, hello: 2, giant: 2, diary: 3, riot: 2, naive: 2, poetry: 3, snow: 1, falling: 2, softly: 2, morning: 2,
  whispers: 2, autumn: 2, leaves: 1, dance: 1, blue: 1, frog: 1, water: 2, silence: 2, temple: 2, old: 1, pond: 1,
  jumped: 1, played: 1, ended: 2, middle: 2, able: 2, simple: 2, circle: 2, candle: 2,
};
// Every line here is a correct 5-7-5 and every line held a word the old rule got wrong.
const HAIKU = ['A quiet evening', 'Science and poetry meet', 'Rhythm of being'].join('\n');
const HAIKU_FORM = { id: 'haiku', name: 'Haiku', lineCount: 3, syllablesPerLine: [5, 7, 5], rhymeScheme: null };

// The table exactly as the app delivers it: the shipped file, evaluated.
const tableSource = fs.readFileSync(resolve(process.cwd(), 'word_sounds_pronunciations.js'), 'utf8');
const loadShippedTable = () => {
  delete window.AlloModules.WordSoundsPronunciations;
  // eslint-disable-next-line no-new-func
  new Function(tableSource)();
  expect(window.AlloModules.WordSoundsPronunciations.wordCount).toBeGreaterThan(100000);
};
const wrongWords = () => Object.keys(WORDS).filter(w => !window.AlloModules.PoetTreeSyllables.options(w).counts.includes(WORDS[w]));

beforeAll(() => {
  React = require(resolve(md, 'react'));
  ReactDOMClient = require(resolve(md, 'react-dom/client'));
  ({ act } = require(resolve(md, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('poet_tree_module.js');
  loadAlloModule('pyodide_runtime_module.js');
  PoetTree = window.AlloModules.PoetTree;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
  delete window.AlloModules.WordSoundsPronunciations;
  delete window.__alloLoadPlugin;
});

describe('PoetTree syllable counts', () => {
  it('gets all 75 of the reviewed words right with the shipped word table', () => {
    loadShippedTable();
    expect(wrongWords()).toEqual([]);
    // A word said two ways is allowed either way; a line passes if a reading fits.
    expect(window.AlloModules.PoetTreeSyllables.options('fire')).toMatchObject({ counts: [1, 2], known: true });
    expect(window.AlloModules.PoetTreeSyllables.options('every').counts).toEqual([2, 3]);
    // "Every poem is a fire" can be read as 7, 8 or 9 syllables.
    expect(window.AlloModules.PoetTreeSyllables.line('Every poem is a fire', 7)).toMatchObject({ count: 7, match: true, estimated: false });
    expect(window.AlloModules.PoetTreeSyllables.line('Every poem is a fire', 9)).toMatchObject({ count: 9, match: true });
    expect(window.AlloModules.PoetTreeSyllables.line('Every poem is a fire', 5)).toMatchObject({ count: 7, match: false });
  });

  it('estimates better than the old rule when the table has not loaded, and says it is an estimate', () => {
    expect(window.AlloModules.WordSoundsPronunciations).toBeUndefined();
    const wrong = wrongWords();
    // The old rule got 29 of these wrong. The estimate is a fallback only.
    expect(wrong.length).toBeLessThanOrEqual(8);
    expect(window.AlloModules.PoetTreeSyllables.options('poem')).toEqual({ counts: [2], known: false });
    expect(window.AlloModules.PoetTreeSyllables.line('A quiet evening', 5).estimated).toBe(true);
  });

  it('a word the table lacks is estimated and flagged, never dropped', () => {
    loadShippedTable();
    const info = window.AlloModules.PoetTreeSyllables.line('The zorblax sings', null);
    expect(info.estimated).toBe(true);
    expect(info.unknown).toEqual(['zorblax']);
    expect(info.count).toBe(4);
  });

  it('"Verify" passes a correct haiku and no longer reports false syllable findings', async () => {
    loadShippedTable();
    const result = await window.AlloModules.PyodideRuntime.runPoetryCheck({ form: HAIKU_FORM, poemText: HAIKU, offlineOnly: true });
    expect(result.findings).toEqual([]);
    expect(result.overall_match).toBe(true);
    expect(result.lines.map(l => l.syllables_actual)).toEqual([5, 7, 5]);
    expect(result.lines.every(l => l.unknown_words.length === 0)).toBe(true);
    // The check still finds a real miscount.
    const short = await window.AlloModules.PyodideRuntime.runPoetryCheck({ form: HAIKU_FORM, poemText: 'A quiet evening\nScience and poetry\nRhythm of being', offlineOnly: true });
    expect(short.findings.map(f => f.message)).toEqual(['Line 2: 6 syllables (expected 7).']);
  });

  it('"Verify" asks the app for the word table itself', async () => {
    const asked = [];
    window.__alloLoadPlugin = async (file) => { asked.push(file); loadShippedTable(); return true; };
    const result = await window.AlloModules.PyodideRuntime.runPoetryCheck({ form: HAIKU_FORM, poemText: HAIKU, offlineOnly: true });
    expect(asked).toEqual(['word_sounds_pronunciations.js']);
    expect(result.overall_match).toBe(true);
  });

  it('the live check beside the editor loads the table and marks the correct haiku correct', async () => {
    const asked = [];
    window.__alloLoadPlugin = async (file) => { asked.push(file); loadShippedTable(); return true; };
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(PoetTree, {
        isOpen: true, onClose: () => {}, onCallGemini: async () => JSON.stringify({}), onCallTTS: async () => null,
        onCallImagen: async () => null, addToast: () => {}, gradeLevel: '7th Grade', selectedVoice: 'Kore',
        handleScoreUpdate: () => {}, initialConfig: { formId: 'haiku' },
      }));
      await new Promise(r => setTimeout(r, 5));
    });
    await act(async () => {
      host.querySelector('#pt-tab-write').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise(r => setTimeout(r, 5));
    });
    const editor = host.querySelector('#pt-editor');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(editor, HAIKU);
    await act(async () => {
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 30));
    });
    expect(asked).toContain('word_sounds_pronunciations.js');
    const marks = Array.from(host.querySelectorAll('[data-pt-syllable-status]')).map(el => el.textContent);
    expect(marks).toEqual(['✓', '✓', '✓']);
  });

  it('the Python path has no dictionary either, so its syllable counts are replaced too', async () => {
    loadShippedTable();
    // What poetry_checks.verify_form answers today for this haiku: with no
    // `pronouncing` package it counts by rule and reports three false misses.
    const fromPython = {
      form_id: 'haiku', line_count: { expected: 3, actual: 3, match: true },
      lines: [[1, 'A quiet evening', 6, 5], [2, 'Science and poetry meet', 5, 7], [3, 'Rhythm of being', 3, 5]].map(([n, text, actual, expected]) => ({
        line_num: n, text, syllables_actual: actual, syllables_expected: expected, syllables_match: false,
        method: 'cmu+heuristic', unknown_words: text.split(' '), stress_pattern: null, rhyme_class: null,
      })),
      rhyme: null, extra_findings: [],
      findings: [
        { severity: 'medium', kind: 'syllables', line_num: 1, message: 'Line 1: 6 syllables, expected 5. "A quiet evening"' },
        { severity: 'medium', kind: 'syllables', line_num: 2, message: 'Line 2: 5 syllables, expected 7. "Science and poetry meet"' },
        { severity: 'medium', kind: 'syllables', line_num: 3, message: 'Line 3: 3 syllables, expected 5. "Rhythm of being"' },
        { severity: 'medium', kind: 'structural', message: 'A structural note that must survive.' },
      ],
      overall_match: false, pronouncing_loaded: false,
    };
    // A stand-in for the Python interpreter only; everything around it is the shipped runtime.
    window.loadPyodide = async () => ({
      runPython: (code) => (String(code).includes('verify_form') ? JSON.stringify(fromPython) : undefined),
      FS: { writeFile() {} }, globals: { set() {} },
    });
    try {
      const result = await window.AlloModules.PyodideRuntime.runPoetryCheck({ form: HAIKU_FORM, poemText: HAIKU });
      expect(result.lines.map(l => [l.syllables_actual, l.syllables_match])).toEqual([[5, true], [7, true], [5, true]]);
      expect(result.findings).toEqual([{ severity: 'medium', kind: 'structural', message: 'A structural note that must survive.' }]);
      expect(result.overall_match).toBe(false);
    } finally { delete window.loadPyodide; }
  });

  it('the Verify button loads its own verifier and checks in the page, with no Python download', async () => {
    // PoetTree never asked for the verifier, so unless Report Writer had loaded
    // it earlier in the session the button only said it was not available.
    const verifier = window.AlloModules.PyodideRuntime;
    delete window.AlloModules.PyodideRuntime;
    window.__alloLazyPyodide = vi.fn(() => { setTimeout(() => { window.AlloModules.PyodideRuntime = verifier; }, 40); });
    window.__alloLoadPlugin = async () => { loadShippedTable(); return true; };
    window.loadPyodide = vi.fn();
    const addToast = vi.fn();
    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(PoetTree, {
          isOpen: true, onClose: () => {}, onCallGemini: async () => JSON.stringify({}), onCallTTS: async () => null,
          onCallImagen: async () => null, addToast, gradeLevel: '7th Grade', selectedVoice: 'Kore',
          handleScoreUpdate: () => {}, initialConfig: { formId: 'haiku' },
        }));
        await new Promise(r => setTimeout(r, 5));
      });
      await act(async () => {
        host.querySelector('#pt-tab-write').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise(r => setTimeout(r, 5));
      });
      const editor = host.querySelector('#pt-editor');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(editor, HAIKU);
      await act(async () => {
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 30));
      });
      const verify = Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Verify with CMU'));
      await act(async () => {
        verify.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise(r => setTimeout(r, 400));
      });
      expect(window.__alloLazyPyodide).toHaveBeenCalledTimes(1);
      expect(addToast.mock.calls.map(c => String(c[0])).join(' ')).not.toMatch(/verifier/i);
      expect(host.textContent).toContain('All structural checks pass for this form.');
      expect(window.loadPyodide).not.toHaveBeenCalled();
    } finally {
      window.AlloModules.PyodideRuntime = verifier;
      delete window.__alloLazyPyodide;
      delete window.loadPyodide;
    }
  });

  it('the Verify button says so plainly when the verifier cannot be loaded', async () => {
    const verifier = window.AlloModules.PyodideRuntime;
    delete window.AlloModules.PyodideRuntime;
    const addToast = vi.fn();
    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(PoetTree, {
          isOpen: true, onClose: () => {}, onCallGemini: async () => JSON.stringify({}), onCallTTS: async () => null,
          onCallImagen: async () => null, addToast, gradeLevel: '7th Grade', selectedVoice: 'Kore',
          handleScoreUpdate: () => {}, initialConfig: { formId: 'haiku' },
        }));
        await new Promise(r => setTimeout(r, 5));
      });
      await act(async () => {
        host.querySelector('#pt-tab-write').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise(r => setTimeout(r, 5));
      });
      const editor = host.querySelector('#pt-editor');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(editor, HAIKU);
      await act(async () => { editor.dispatchEvent(new Event('input', { bubbles: true })); await new Promise(r => setTimeout(r, 30)); });
      const verify = Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Verify with CMU'));
      await act(async () => { verify.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise(r => setTimeout(r, 60)); });
      expect(addToast.mock.calls.map(c => String(c[0])).join(' ')).toMatch(/verifier could not load/i);
      expect(verify.disabled).toBe(false);
    } finally {
      window.AlloModules.PyodideRuntime = verifier;
    }
  });

  it('ships the same PoetTree and verifier files in every copy', () => {
    for (const file of ['poet_tree_module.js', 'pyodide_runtime_module.js']) {
      const rootBytes = fs.readFileSync(resolve(process.cwd(), file));
      for (const dir of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
        const copy = resolve(process.cwd(), dir, file);
        if (fs.existsSync(copy)) expect(fs.readFileSync(copy).equals(rootBytes), dir + '/' + file).toBe(true);
      }
    }
  });
});
