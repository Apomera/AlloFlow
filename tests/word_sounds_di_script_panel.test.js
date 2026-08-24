/**
 * word_sounds_di_script_panel.test.js
 *
 * The generator itself is covered by word_sounds_di_script.test.js. This file
 * covers the part that test cannot see: the button really exists in the player,
 * clicking it really produces the panel, and the panel is really gated away
 * from student and probe devices.
 *
 * This mounts the live component with real React and dispatches a real click,
 * rather than asserting on source text. Source-shape assertions have passed in
 * this repo while the feature was dead on arrival.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupWordSounds, baseProps, React } from './helpers/word_sounds_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

let WordSoundsModal;
let container;
let root;

// An r-controlled word pack, the same shape the setup screen hands the player.
const PACK = [
  { word: 'corn', targetWord: 'corn', phonemes: ['k', 'or', 'n'], graphemes: ['c', 'or', 'n'], syllables: ['corn'], rhymeWord: 'horn', familyEnding: '-orn', sentence: 'I can see the corn.' },
  { word: 'horn', targetWord: 'horn', phonemes: ['h', 'or', 'n'], graphemes: ['h', 'or', 'n'], syllables: ['horn'], rhymeWord: 'corn', familyEnding: '-orn' },
  { word: 'fork', targetWord: 'fork', phonemes: ['f', 'or', 'k'], graphemes: ['f', 'or', 'k'], syllables: ['fork'] },
  { word: 'storm', targetWord: 'storm', phonemes: ['s', 't', 'or', 'm'], graphemes: ['s', 't', 'or', 'm'], syllables: ['storm'] },
];

const LESSON_PLAN = {
  masteryMode: 'consecutive',
  masteryThreshold: 3,
  activities: [{ id: 'counting', count: 2 }, { id: 'mapping', count: 2 }],
  order: ['counting', 'mapping'],
  totalItems: 4,
  estimatedMinutes: 2,
};

function props(overrides) {
  return Object.assign(baseProps('counting'), {
    isTeacherMode: true,
    isProbeMode: false,
    wsPreloadedWords: PACK,
    lessonPlanConfig: LESSON_PLAN,
    wordSoundsLanguage: 'en',
  }, overrides || {});
}

function mount(p) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  act(() => { root.render(React.createElement(WordSoundsModal, p)); });
  return container;
}

// The harness translator resolves to the English fallback, so the rendered
// aria-label is the fallback string rather than the key.
function scriptButton() {
  return container.querySelector('[aria-label="Open the lesson script"]');
}
function byText(tag, text) {
  return [...container.querySelectorAll(tag)].find((el) => el.textContent.trim() === text) || null;
}

beforeAll(() => {
  const H = setupWordSounds();
  WordSoundsModal = H.WordSoundsModal;
  // The player lazy-loads the generator through window.__alloLoadPlugin. Here
  // it is pre-installed, which is exactly the branch a second open takes in a
  // real session, and keeps the test off the network.
  window.AlloWordSoundsDI = require(resolve(process.cwd(), 'word_sounds_di_loader.js'));
});

afterEach(() => {
  if (root) act(() => { root.unmount(); });
  if (container && container.parentNode) container.parentNode.removeChild(container);
  root = null;
  container = null;
});

describe('the lesson script button', () => {
  it('is offered to a teacher with a loaded pack', () => {
    mount(props());
    expect(scriptButton()).toBeTruthy();
  });

  it('is hidden on a student device', () => {
    // Same gate as Review Words: the script prints every answer in the set.
    mount(props({ isTeacherMode: false }));
    expect(scriptButton()).toBeNull();
  });

  it('is hidden during a probe', () => {
    mount(props({ isProbeMode: true }));
    expect(scriptButton()).toBeNull();
  });

  it('is hidden when there are no words to build from', () => {
    mount(props({ wsPreloadedWords: [] }));
    expect(scriptButton()).toBeNull();
  });
});

describe('clicking it produces the script', () => {
  function open() {
    mount(props());
    const btn = scriptButton();
    expect(btn, 'the lesson script button should be present').toBeTruthy();
    act(() => { btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    return container.textContent;
  }

  it('renders the panel, not the game', () => {
    const text = open();
    expect(container.querySelector('#ws-di-print'), 'the printable region should exist').toBeTruthy();
    expect(text).toContain('Direct Instruction lesson script');
  });

  it('names the focus pattern in the objective', () => {
    expect(open()).toContain('/or/');
  });

  it('includes the model, lead and correction sections', () => {
    const text = open();
    expect(text).toContain('My turn');
    expect(text).toContain('Together');
    expect(text).toContain('Correction procedure');
    expect(text).toContain('Delayed test');
  });

  it('honours the lesson plan order and counts', () => {
    const text = open();
    expect(text).toContain('Sound Counting');
    expect(text).toContain('Sound Mapping');
    expect(text.indexOf('Sound Counting')).toBeLessThan(text.indexOf('Sound Mapping'));
    expect(text).toContain('3 consecutive correct');
  });

  it('prints the word list with sounds', () => {
    const text = open();
    PACK.forEach((w) => expect(text).toContain(w.word));
    expect(text).toContain('/k/ /or/ /n/');
  });

  it('leaves no unfilled template blanks in the taught wording', () => {
    // The correction procedure is the one place a blank belongs: nobody knows
    // in advance which item a child will miss, so "Listen. This one is ___."
    // is the script, not a generator failure. Everywhere else a blank means
    // the generator could not fill in the word and the teacher has to
    // improvise at the table.
    open();
    const correction = [...container.querySelectorAll('section')]
      .find((el) => el.textContent.includes('Correction procedure'));
    expect(correction, 'the correction procedure should be on the page').toBeTruthy();
    expect(correction.textContent).toContain('___');

    const taught = [...container.querySelectorAll('section')]
      .filter((el) => el !== correction)
      .map((el) => el.textContent)
      .join(' ');
    expect(taught).not.toContain('___');
    expect(taught).not.toContain('/_/');
  });

  it('carries a print stylesheet that hides everything but the script', () => {
    open();
    const style = container.querySelector('style');
    expect(style, 'a print stylesheet should be present').toBeTruthy();
    expect(style.textContent).toContain('@media print');
    expect(style.textContent).toContain('#ws-di-print');
    expect(style.textContent).toContain('.ws-di-no-print');
  });

  it('closes back to the game', () => {
    open();
    const close = byText('button', 'Close');
    expect(close, 'a close control should be present').toBeTruthy();
    act(() => { close.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    expect(container.querySelector('#ws-di-print')).toBeNull();
  });
});

describe('language gating at the button', () => {
  it('refuses a non-English pack instead of machine-translating a teacher script', () => {
    const toasts = [];
    mount(props({ wordSoundsLanguage: 'es', addToast: (m, kind) => toasts.push({ m, kind }) }));
    const btn = scriptButton();
    expect(btn).toBeTruthy();
    act(() => { btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    expect(container.querySelector('#ws-di-print')).toBeNull();
    expect(toasts.map((x) => x.m).join(' ')).toMatch(/English word sets only/i);
  });
});
