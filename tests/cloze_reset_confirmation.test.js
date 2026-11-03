import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
let Panel, Blank, root, host, update, resetCompleted, resetInstances, currentDone;
const t = key => key;
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t });
  window.AlloIcons = {}; window.CheckCircle2 = () => null;
  loadAlloModule('misc_components_module.js'); Blank = window.AlloModules.ClozeInput;
  loadAlloModule(process.env.ALLO_PANEL_CANDIDATE || 'view_cloze_interaction_panel_module.js');
  Panel = window.AlloModules.ClozeInteractionPanel.ClozeInteractionPanel;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
});
async function mount(initial = {}) {
  resetCompleted = vi.fn(); resetInstances = vi.fn();
  function Reader() {
    const [props, setProps] = React.useState({ activityScope: 'passage-one', language: 'English', ...initial });
    const [done, setDone] = React.useState(new Set(initial.empty ? [] : ['cell']));
    update = setProps; currentDone = done;
    return React.createElement('div', null,
      React.createElement(Blank, { targetWord: 'cell', isSolved: done.has('cell'), onCorrect: () => setDone(new Set(['cell'])) }),
      React.createElement(Panel, {
        t, activeView: 'simplified', interactionMode: 'cloze', latestGlossary: [{ term: 'cell' }], leveledTextLanguage: props.language,
        activityScope: props.activityScope, completedBlankCount: props.unknown ? undefined : done.size,
        setClozeCompletedSet: resetCompleted,
        setClozeInstanceSet: value => { resetInstances(value); setDone(value); },
        playSound: () => {}, handleBankMouseDown: () => {}, handleSetInteractionModeToRead: () => {},
        wordBankPosition: null, wordBankRef: React.createRef(),
      }));
  }
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Reader)));
}
const reset = () => host.querySelector('[data-cloze-reset]');
const group = () => host.querySelector('[data-cloze-reset-confirmation]');
const blank = () => host.querySelector('[data-cloze-blank] input');
const cancel = () => [...group().querySelectorAll('button')].find(button => button.textContent === 'Cancel');
async function click(node) { node.focus(); await act(async () => node.click()); }
async function escape(options = {}) {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...options });
  await act(async () => document.activeElement.dispatchEvent(event)); return event;
}

describe('Cloze reset protects completed answers', () => {
  it('opens on Cancel and leaves completed answers unchanged until confirmation', async () => {
    await mount(); await click(reset());
    expect(document.activeElement).toBe(cancel()); expect(blank().value).toBe('cell');
    expect(resetCompleted).not.toHaveBeenCalled(); expect(resetInstances).not.toHaveBeenCalled();
    expect(group().getAttribute('aria-labelledby')).toBeTruthy(); expect(group().getAttribute('aria-describedby')).toBeTruthy();
  });
  it('Cancel preserves completed answers and the selected bank word, then returns focus', async () => {
    await mount(); await click(host.querySelector('[data-cloze-bank-chip]')); await click(reset()); await click(cancel());
    expect(group()).toBeNull(); expect(document.activeElement).toBe(reset()); expect(blank().value).toBe('cell');
    expect(window.__alloClozeBankPick).toBe('cell'); expect(resetInstances).not.toHaveBeenCalled();
  });
  it('Escape cancels without clearing, while composition Escape remains untouched', async () => {
    await mount(); await click(reset());
    expect((await escape({ isComposing: true })).defaultPrevented).toBe(false);
    expect((await escape({ keyCode: 229 })).defaultPrevented).toBe(false); expect(group()).toBeTruthy();
    expect((await escape()).defaultPrevented).toBe(true);
    expect(group()).toBeNull(); expect(document.activeElement).toBe(reset()); expect(resetInstances).not.toHaveBeenCalled();
  });
  it('confirmation clears actual solved blanks, both completion sets, and the bank pick once', async () => {
    await mount(); await click(host.querySelector('[data-cloze-bank-chip]')); await click(reset());
    await click(host.querySelector('[data-cloze-reset-confirm]'));
    expect(resetCompleted).toHaveBeenCalledTimes(1); expect(resetCompleted.mock.calls[0][0].size).toBe(0);
    expect(resetInstances).toHaveBeenCalledTimes(1); expect(currentDone.size).toBe(0);
    expect(blank().value).toBe(''); expect(window.__alloClozeBankPick).toBeNull(); expect(reset().disabled).toBe(true);
    expect(document.activeElement).toBe(host.querySelector('h4'));
    expect(host.querySelector('[data-cloze-reset-status]').textContent).toBe('Completed answers cleared.');
  });
  it('disables reset when no completed answers exist', async () => {
    await mount({ empty: true }); expect(reset().disabled).toBe(true);
    await act(async () => reset().click()); expect(group()).toBeNull(); expect(resetInstances).not.toHaveBeenCalled();
  });
  it.each([{ activityScope: 'passage-two' }, { language: 'Spanish' }])('closes stale confirmation when activity context changes: %j', async patch => {
    await mount(); await click(reset()); const oldConfirm = host.querySelector('[data-cloze-reset-confirm]');
    await act(async () => update(old => ({ ...old, ...patch })));
    expect(group()).toBeNull(); await act(async () => oldConfirm.click()); expect(resetInstances).not.toHaveBeenCalled();
  });
  it('keeps confirmation across equivalent parent rerenders', async () => {
    await mount(); await click(reset()); const active = document.activeElement;
    await act(async () => update(old => ({ ...old })));
    expect(group()).toBeTruthy(); expect(document.activeElement).toBe(active);
  });
  it('requires confirmation for legacy consumers with unknown progress', async () => {
    await mount({ unknown: true }); await click(reset()); expect(group()).toBeTruthy(); expect(resetInstances).not.toHaveBeenCalled();
  });
  it('does not steal unrelated focus when a programmatic Cancel closes the group', async () => {
    await mount(); await click(reset()); const outside = document.createElement('button'); host.append(outside); outside.focus();
    await act(async () => cancel().click()); expect(document.activeElement).toBe(outside);
  });
});
