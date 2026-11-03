import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let root, host, Panel, Cloze;
const glossary = () => [
  { term: 'cell', translations: { Spanish: 'célula: unidad básica', French: 'cellule: unité de base' } },
  { term: 'nucleus', translations: { Spanish: 'núcleo', French: 'noyau' } },
];

beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloLanguageContext = React.createContext({ t: key => key });
  window.CheckCircle2 = () => null;
  ['Globe', 'RefreshCw', 'X'].forEach(name => { window[name] = () => null; });
  loadAlloModule('misc_components_module.js');
  Cloze = window.AlloModules.ClozeInput;
  if (process.env.ALLO_CLOZE_PANEL_SOURCE) {
    const source = readFileSync(process.env.ALLO_CLOZE_PANEL_SOURCE, 'utf8');
    const { transformSync } = require('@babel/core');
    const compiled = transformSync(source, { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
    Panel = new Function('React', 'window', compiled + '\nreturn ClozeInteractionPanel;')(React, window);
  } else {
    loadAlloModule(process.env.ALLO_CLOZE_CONTINUITY_MODULE || process.env.ALLO_CLOZE_PANEL_CANDIDATE || 'view_cloze_interaction_panel_module.js');
    Panel = window.AlloModules.ClozeInteractionPanel.ClozeInteractionPanel;
  }
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null; vi.restoreAllMocks();
});

async function mount(extra = {}) {
  let props = { activityScope: 'passage-one', latestGlossary: glossary(), leveledTextLanguage: 'Spanish', ...extra };
  const onCorrect = vi.fn();
  function Reader({ current }) {
    const [done, setDone] = React.useState(new Set());
    React.useEffect(() => { setDone(new Set()); }, [current.activityScope]);
    const item = current.latestGlossary[0];
    const translation = current.leveledTextLanguage !== 'English' && item.translations?.[current.leveledTextLanguage];
    const passageWord = translation ? translation.split(':')[0].trim() : item.term;
    return React.createElement('div', null,
      React.createElement(Cloze, {
        key: JSON.stringify([current.activityScope, current.leveledTextLanguage, item.term]),
        targetWord: item.term, acceptedAnswers: [item.term, passageWord], passageWord,
        isSolved: done.has(item.term),
        onCorrect: word => { onCorrect(word); setDone(previous => new Set(previous).add(word)); },
      }),
      React.createElement(Panel, {
        ...current, activeView: 'simplified', interactionMode: 'cloze',
        handleBankMouseDown() {}, handleSetInteractionModeToRead() {}, playSound() {},
        setClozeCompletedSet() {}, setClozeInstanceSet: setDone,
        t: key => key, wordBankPosition: null, wordBankRef: React.createRef(),
      }));
  }
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const render = () => root.render(React.createElement(Reader, { current: props }));
  await act(async () => render());
  return {
    onCorrect,
    rerender: async update => { props = { ...props, ...update }; await act(async () => render()); },
  };
}
const chips = () => [...host.querySelectorAll('[data-cloze-bank-chip]')];
const input = () => host.querySelector('[data-cloze-blank] input');
const pressed = () => chips().filter(chip => chip.getAttribute('aria-pressed') === 'true');
const click = async element => { expect(element).toBeTruthy(); await act(async () => element.click()); };
async function assertUnarmed(view) {
  expect(pressed()).toHaveLength(0);
  expect(window.__alloClozeBankPick).toBeNull();
  await click(input());
  expect(input().getAttribute('aria-invalid')).toBe('false');
  expect(input().value).toBe('');
  expect(view.onCorrect).not.toHaveBeenCalled();
}

describe('Cloze word-bank selection belongs to the current activity', () => {
  it('clears the old payload when the passage language changes and places the new word correctly', async () => {
    const view = await mount(); await click(chips()[0]);
    expect(window.__alloClozeBankPick).toBe('célula');
    await view.rerender({ leveledTextLanguage: 'French' });
    expect(chips()[0].textContent).toBe('cellule'); await assertUnarmed(view);
    await click(chips()[0]); await click(input());
    expect(input().value).toBe('cellule'); expect(view.onCorrect).toHaveBeenCalledOnce();
    expect(pressed()).toHaveLength(0); expect(window.__alloClozeBankPick).toBeNull();
  });
  it('does not transfer selection to a replacement term at the same index', async () => {
    const view = await mount({ leveledTextLanguage: 'English' }); await click(chips()[0]);
    await view.rerender({ latestGlossary: [{ term: 'tree' }] });
    expect(chips()[0].textContent).toBe('tree'); await assertUnarmed(view);
  });
  it('clears selection when glossary terms are reordered', async () => {
    const terms = glossary(), view = await mount({ latestGlossary: terms }); await click(chips()[0]);
    await view.rerender({ latestGlossary: terms.slice().reverse() });
    expect(chips()[0].textContent).toBe('núcleo'); await assertUnarmed(view);
  });
  it('clears a pick in a new passage even when its glossary and language are unchanged', async () => {
    const view = await mount(); await click(chips()[0]);
    await view.rerender({ activityScope: 'passage-two' }); await assertUnarmed(view);
    await click(chips()[0]); await click(input());
    expect(input().value).toBe('célula'); expect(view.onCorrect).toHaveBeenCalledOnce();
  });
  it('preserves selection across equivalent glossary arrays and unrelated metadata changes', async () => {
    const terms = glossary(), view = await mount({ latestGlossary: terms }); await click(chips()[0]);
    await view.rerender({ latestGlossary: terms.map(item => ({ ...item, definition: 'Updated explanation', translations: { ...item.translations } })) });
    expect(pressed()).toEqual([chips()[0]]); expect(window.__alloClozeBankPick).toBe('célula');
    await click(input()); expect(input().value).toBe('célula'); expect(view.onCorrect).toHaveBeenCalledOnce();
  });
  it('preserves a pick when only a translated definition changes after its colon', async () => {
    const terms = glossary(), view = await mount({ latestGlossary: terms }); await click(chips()[0]);
    await view.rerender({ latestGlossary: [{ ...terms[0], translations: { ...terms[0].translations, Spanish: 'célula: explicación nueva' } }, terms[1]] });
    expect(pressed()).toEqual([chips()[0]]); expect(window.__alloClozeBankPick).toBe('célula');
  });
  it('clears selection when the visible translation changes within the same glossary array', async () => {
    const terms = glossary(), view = await mount({ latestGlossary: terms }); await click(chips()[0]);
    terms[0].translations.Spanish = 'celdilla: otra forma';
    await view.rerender({ latestGlossary: terms });
    expect(chips()[0].textContent).toBe('celdilla'); await assertUnarmed(view);
  });
  it('continues clearing selection when the learner changes the bank language mode', async () => {
    const view = await mount(); await click(chips()[0]);
    await click([...host.querySelectorAll('button')].find(button => button.textContent === 'simplified.word_bank_english'));
    expect(chips()[0].textContent).toBe('cell'); await assertUnarmed(view);
    await click(chips()[0]); await click(input());
    expect(input().value).toBe('cell'); expect(view.onCorrect).toHaveBeenCalledOnce();
  });
  it('supports consumers without an activityScope while still clearing changed banks', async () => {
    const view = await mount({ activityScope: undefined, leveledTextLanguage: 'English' }); await click(chips()[0]);
    await view.rerender({ latestGlossary: [{ term: 'root' }] }); await assertUnarmed(view);
  });
  it('clears the shared pick on unmount', async () => {
    await mount(); await click(chips()[0]); await act(async () => root.unmount()); root = null;
    expect(window.__alloClozeBankPick).toBeNull();
  });
});
