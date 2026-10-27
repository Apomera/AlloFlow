// WCAG 2.5.7 Dragging Movements: the cloze word bank chips were drag-only
// (typing into the blank was the only other path). Now a tap on a chip picks
// it up and a tap on a blank places it. Driven with real clicks across the two
// real modules: the bank (view_cloze_interaction_panel_module.js) and the
// blanks (ClozeInput in misc_components_module.js).
//
// ALLO_MISC_CANDIDATE / ALLO_CLOZE_PANEL_CANDIDATE load other copies (used to
// prove the test fails on the pre-fix files).
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, Panel, Cloze, root, host;

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloLanguageContext = React.createContext({ t: (key) => key });
  window.CheckCircle2 = () => null;
  ['Globe', 'RefreshCw', 'X'].forEach((n) => { window[n] = () => null; });
  loadAlloModule(process.env.ALLO_MISC_CANDIDATE || 'misc_components_module.js');
  loadAlloModule(process.env.ALLO_CLOZE_PANEL_CANDIDATE || 'view_cloze_interaction_panel_module.js');
  Cloze = window.AlloModules.ClozeInput;
  Panel = window.AlloModules.ClozeInteractionPanel.ClozeInteractionPanel;
});

afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; });

const GLOSSARY = [{ term: 'cell' }, { term: 'nucleus' }, { term: 'membrane' }];

function mount() {
  const solved = [];
  // Like the reader host: onCorrect marks the blank solved (isSolved), which
  // the blank needs to keep its accepted word.
  function Reader() {
    const [done, setDone] = React.useState(() => new Set());
    const blank = (word) => React.createElement(Cloze, {
      key: word, targetWord: word, acceptedAnswers: [word], passageWord: word, isSolved: done.has(word),
      onCorrect: (w) => { solved.push(w); setDone((prev) => new Set(prev).add(w)); },
    });
    return React.createElement('div', null,
      React.createElement('p', null, 'The ', blank('nucleus'), ' sits inside the ', blank('cell'), '.'),
      React.createElement(Panel, {
        activeView: 'simplified', interactionMode: 'cloze', handleBankMouseDown: () => {},
        handleSetInteractionModeToRead: () => {}, latestGlossary: GLOSSARY, leveledTextLanguage: 'English',
        playSound: () => {}, setClozeCompletedSet: () => {}, setClozeInstanceSet: () => {},
        t: (k) => k, wordBankPosition: null, wordBankRef: { current: null },
      }));
  }
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(Reader)));
  return solved;
}

const chip = (label) => [...host.querySelectorAll('span[draggable="true"]')].find((s) => s.textContent === label);
const blanks = () => [...host.querySelectorAll('[data-cloze-blank]')];
const click = (el) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); });

describe('cloze word bank: tap-to-place alternative to dragging (2.5.7)', () => {
  it('tap a chip, then tap the matching blank, fills and solves that blank', () => {
    const solved = mount();
    click(chip('cell'));
    expect(chip('cell').getAttribute('aria-pressed')).toBe('true');
    click(blanks()[1].querySelector('input'));
    expect(blanks()[1].getAttribute('data-cloze-solved')).toBe('true');
    expect(blanks()[1].querySelector('input').value).toBe('cell');
    expect(blanks()[0].getAttribute('data-cloze-solved')).toBe('false');
    expect(solved).toEqual(['cell']);
    // Placing clears the pick in the bank.
    expect(chip('cell').getAttribute('aria-pressed')).toBe('false');
  });

  it('a wrong blank rejects the word and keeps the pick for another try', () => {
    const solved = mount();
    click(chip('nucleus'));
    click(blanks()[1]);
    expect(blanks()[1].getAttribute('data-cloze-solved')).toBe('false');
    expect(chip('nucleus').getAttribute('aria-pressed')).toBe('true');
    click(blanks()[0]);
    expect(blanks()[0].getAttribute('data-cloze-solved')).toBe('true');
    expect(solved).toEqual(['nucleus']);
  });

  it('tapping the picked chip again drops the pick, and a blank tap then does nothing', () => {
    const solved = mount();
    click(chip('cell'));
    click(chip('cell'));
    expect(chip('cell').getAttribute('aria-pressed')).toBe('false');
    click(blanks()[1]);
    expect(blanks()[1].getAttribute('data-cloze-solved')).toBe('false');
    expect(solved).toEqual([]);
  });

  it('drag-and-drop still fills a blank', () => {
    mount();
    let payload = '';
    const fire = (el, type) => {
      const ev = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'dataTransfer', { value: { setData: (_t, v) => { payload = v; }, getData: () => payload } });
      act(() => { el.dispatchEvent(ev); });
    };
    fire(chip('cell'), 'dragstart');
    fire(blanks()[1], 'drop');
    expect(blanks()[1].getAttribute('data-cloze-solved')).toBe('true');
  });
});
