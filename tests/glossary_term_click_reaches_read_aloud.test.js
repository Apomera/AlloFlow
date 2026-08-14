// Adapted Text: "pressing sentences often does not initiate TTS" (2026-08-14).
//
// Every sentence in the Adapted Text / FAQ / Adventure / Persona readers is an
// element whose onClick calls handleSpeak. Glossary terms inside that sentence
// are rendered by highlightGlossaryTerms as GlossaryTermSpan, and that span
// carried `onClick={(e) => e.stopPropagation()}` — nothing else. Its tooltip is
// driven by hover/focus, so the handler existed ONLY to swallow the click.
//
// Result: tapping a glossary term did nothing at all — no synthesis request, no
// console error — while tapping a plain word two characters away read the
// sentence. It looked random because it tracked the glossary: a passage with no
// terms never showed it, and terms are exactly the words a struggling reader
// reaches for. Learners' taps must reach the sentence's read handler.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React;
let createRoot;
let TextUtilityHelpers;

beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  const ReactDOM = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom'));
  ({ createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client')));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = globalThis.React = React;
  window.ReactDOM = globalThis.ReactDOM = ReactDOM;
  loadAlloModule('text_utility_helpers_module.js');
  TextUtilityHelpers = window.AlloModules.TextUtilityHelpers;
  if (!TextUtilityHelpers) throw new Error('TextUtilityHelpers failed to register');
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const GLOSSARY = [{ term: 'mitochondria', def: 'The part of a cell that makes energy.' }];

// highlightGlossaryTerms takes a large deps bag; only a handful matter here.
const makeDeps = () => ({
  leveledTextLanguage: 'English',
  isLineFocusMode: false,
  clozeInstanceSet: new Set(),
  setClozeInstanceSet: vi.fn(),
  handleScoreUpdate: vi.fn(),
  playSound: vi.fn(),
  addToast: vi.fn(),
  t: (key, fallback) => fallback || key,
  warnLog: vi.fn(),
  debugLog: vi.fn(),
  ClozeInput: () => null,
});

// The shape every sentence reader uses: a clickable ancestor wrapping the
// glossary-highlighted text.
const renderSentence = (onSentenceClick) => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const children = TextUtilityHelpers.highlightGlossaryTerms(
    'The mitochondria releases energy.', GLOSSARY, false, false, makeDeps(),
  );
  React.act(() => {
    root.render(
      React.createElement(
        'span',
        { id: 'sentence-0', onClick: onSentenceClick, role: 'button' },
        children,
      ),
    );
  });
  return host;
};

describe('A glossary term inside a sentence does not swallow the read-aloud click', () => {
  it('clicking the term reaches the sentence handler', () => {
    const onSentenceClick = vi.fn();
    const host = renderSentence(onSentenceClick);

    const term = host.querySelector('.allo-glossary-term');
    expect(term, 'the glossary term should be highlighted').toBeTruthy();
    expect(term.textContent).toBe('mitochondria');

    React.act(() => {
      term.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    // Before the fix this was 0: the term's own handler stopped propagation and
    // the learner's tap simply vanished.
    expect(onSentenceClick).toHaveBeenCalledTimes(1);
  });

  it('clicking a plain word in the same sentence also reaches the handler', () => {
    const onSentenceClick = vi.fn();
    const host = renderSentence(onSentenceClick);

    React.act(() => {
      host.querySelector('#sentence-0')
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    // This half always worked — it is the contrast that made the bug look random.
    expect(onSentenceClick).toHaveBeenCalledTimes(1);
  });

  it('the term still shows its definition when clicked, for touch users with no hover', () => {
    const host = renderSentence(vi.fn());
    const term = host.querySelector('.allo-glossary-term');

    expect(document.body.textContent).not.toContain('The part of a cell that makes energy.');
    React.act(() => {
      term.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip, 'a tap should surface the definition, not just a hover').toBeTruthy();
    expect(tooltip.textContent).toContain('The part of a cell that makes energy.');
  });
});
