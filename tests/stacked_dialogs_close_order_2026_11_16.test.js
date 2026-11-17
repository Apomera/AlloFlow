// Two dialogs open at once, closed in every order (2026-11-16).
//
// Each dialog makes the page behind it inert and hidden from screen readers, and
// locks scrolling. Each used to snapshot that state at open and write the snapshot
// back at close. The upper dialog's snapshot said "already inert" (the lower one did
// that), so when the lower one cleaned up first the upper one re-applied it and
// nothing removed it again: the whole app stayed frozen, hidden and unscrollable.
// Ending a live session did exactly this (Session window + End session preview closed
// in one step), and so did any confirmation that also closed the window under it.
//
// The rule now: at close a dialog undoes only what it changed itself. These tests
// mount the shipped modules, never the source text.

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, M;
let root = null;
let host = null;
let hadInertIdl = true;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  // jsdom has no `inert` property. Browsers reflect it to the attribute, and the bug
  // only shows with that behaviour, so install the same reflection for these tests.
  hadInertIdl = 'inert' in window.HTMLElement.prototype;
  if (!hadInertIdl) {
    Object.defineProperty(window.HTMLElement.prototype, 'inert', {
      configurable: true,
      get() { return this.hasAttribute('inert'); },
      set(v) { if (v) this.setAttribute('inert', ''); else this.removeAttribute('inert'); },
    });
  }
  loadAlloModule('view_confirm_dialog_module.js');
  loadAlloModule('view_end_session_preview_module.js');
  loadAlloModule('view_prompt_dialog_module.js');
  M = window.AlloModules;
}, 60000);

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  if (host) host.remove();
  host = null;
  document.body.style.overflow = '';
  delete window.__alloFocusTrapStack;
  delete window.__alloScrollLockState;
});

const previewObj = { summary: { participants: { 'Azure Fox': {} }, absentCodenames: [], unmatchedCodenames: [] }, busy: false, followUpBusy: '', followUpResourceId: '', followUpResources: [], followUpSent: false };
const noop = () => {};

// name -> element factory. `close` is what the dialog calls to close itself.
const DIALOGS = {
  confirm: (close) => React.createElement(M.ConfirmDialog.ConfirmDialog, {
    confirmDialog: { title: 'Sure?', message: 'Really?', confirmText: 'Yes', cancelText: 'No', onConfirm: noop },
    setConfirmDialog: close, t: () => '',
  }),
  endPreview: (close) => React.createElement(M.EndSessionPreview.EndSessionPreview, {
    preview: previewObj, note: '', canSaveSummary: true, groupNamesById: {}, copyToClipboard: noop,
    getConnectedCount: () => 0, onFollowUpResourceChange: noop, onSendCohort: noop, onNoteChange: noop,
    onKeepOpen: close, onComplete: noop,
  }),
};

function mount(firstInTree, secondInTree) {
  let api;
  function App() {
    const [open, setOpen] = React.useState({});
    api = { set: (patch) => setOpen((cur) => ({ ...cur, ...patch })) };
    return React.createElement('div', { id: 'app-shell' },
      React.createElement('main', { id: 'bg-main' }, React.createElement('button', { id: 'opener', type: 'button' }, 'Open')),
      // A panel the app itself keeps inert, and one it marks aria-hidden="false":
      // neither belongs to a dialog, so both must come back exactly as they were.
      React.createElement('aside', { id: 'bg-own-inert', inert: '', 'aria-hidden': 'true' }, 'collapsed panel'),
      React.createElement('section', { id: 'bg-shown', 'aria-hidden': 'false' }, 'shown panel'),
      open[firstInTree] ? DIALOGS[firstInTree](() => api.set({ [firstInTree]: false })) : null,
      open[secondInTree] ? DIALOGS[secondInTree](() => api.set({ [secondInTree]: false })) : null);
  }
  host = document.createElement('div');
  host.id = 'root';
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  act(() => root.render(React.createElement(App)));
  return api;
}

const el = (id) => document.getElementById(id);
function pageState() {
  return {
    mainInert: el('bg-main').hasAttribute('inert'),
    mainAriaHidden: el('bg-main').getAttribute('aria-hidden'),
    ownInertKept: el('bg-own-inert').hasAttribute('inert') && el('bg-own-inert').getAttribute('aria-hidden') === 'true',
    shownAriaHidden: el('bg-shown').getAttribute('aria-hidden'),
    overflow: document.body.style.overflow,
    lockCount: window.__alloScrollLockState ? window.__alloScrollLockState.count : 0,
    trapStack: (window.__alloFocusTrapStack || []).length,
  };
}
const CLEAN = { mainInert: false, mainAriaHidden: null, ownInertKept: true, shownAriaHidden: 'false', overflow: '', lockCount: 0, trapStack: 0 };

const CLOSE_ORDERS = {
  'the upper dialog closes first': (api, lower, upper) => { act(() => api.set({ [upper]: false })); act(() => api.set({ [lower]: false })); },
  'the lower dialog closes first': (api, lower, upper) => { act(() => api.set({ [lower]: false })); act(() => api.set({ [upper]: false })); },
  'both close in one step': (api, lower, upper) => { act(() => api.set({ [lower]: false, [upper]: false })); },
};

describe('two stacked dialogs leave the page usable in every closing order', () => {
  // [opened first (lower), opened second (upper)] x which one sits first in the tree.
  const STACKS = [
    ['endPreview', 'confirm', ['endPreview', 'confirm']],
    ['endPreview', 'confirm', ['confirm', 'endPreview']],
    ['confirm', 'endPreview', ['confirm', 'endPreview']],
    ['confirm', 'endPreview', ['endPreview', 'confirm']],
  ];
  for (const [lower, upper, tree] of STACKS) {
    for (const [orderName, closeBoth] of Object.entries(CLOSE_ORDERS)) {
      it(`${upper} over ${lower} (tree order ${tree.join(', ')}): ${orderName}`, () => {
        const api = mount(tree[0], tree[1]);
        act(() => api.set({ [lower]: true }));
        expect(pageState().mainInert, 'the first dialog isolates the page').toBe(true);
        act(() => api.set({ [upper]: true }));
        expect(pageState().trapStack).toBe(2);
        expect(pageState().overflow).toBe('hidden');
        closeBoth(api, lower, upper);
        expect(pageState()).toEqual(CLEAN);
      });
    }
  }

  it('a single dialog still isolates the page and puts everything back', () => {
    for (const name of Object.keys(DIALOGS)) {
      const api = mount(name, 'unused');
      act(() => api.set({ [name]: true }));
      const open = pageState();
      expect(open.mainInert, name).toBe(true);
      expect(open.mainAriaHidden, name).toBe('true');
      expect(open.shownAriaHidden, name).toBe('true');
      expect(open.overflow, name).toBe('hidden');
      act(() => api.set({ [name]: false }));
      expect(pageState(), name).toEqual(CLEAN);
      act(() => root.unmount());
      root = null;
      host.remove();
      host = null;
    }
  });
});
