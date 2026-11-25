// An open dialog hides the page behind it, but not the app's announcement and toast regions.
//
// WHY (2026-11-16): each dialog walks up from itself and marks every sibling
// inert and aria-hidden. The app's screen-reader announcement regions
// (#allo-live-polite, #allo-live-assertive) and its toast region sit beside the
// dialogs in the same container, so they were hidden too. Anything announced
// while a dialog was open (the prompt dialog's own "please enter a value", a
// toast saying a save failed) never reached a screen reader. The walkers now
// leave [aria-live], [role=status], [role=alert] and [data-toast-region] alone.
//
// The first part mounts shipped dialogs in that layout. The second reads every
// dialog source with such a walker, so a new copy cannot miss the skip.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, M;
let root = null;
let host = null;
const noop = () => {};

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  for (const f of ['view_confirm_dialog_module.js', 'view_prompt_dialog_module.js', 'view_end_session_preview_module.js',
    'view_info_modal_module.js', 'view_session_modal_module.js', 'view_xp_modal_module.js', 'view_hints_modal_module.js',
    'view_study_timer_modal_module.js', 'view_visual_supports_modal_module.js']) loadAlloModule(f);
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
const DIALOGS = {
  Confirm: (close) => React.createElement(M.ConfirmDialog.ConfirmDialog, { confirmDialog: { title: 'Sure?', message: 'Really?', confirmText: 'Yes', cancelText: 'No', onConfirm: noop }, setConfirmDialog: close, t: () => '' }),
  Prompt: (close) => React.createElement(M.PromptDialog.PromptDialog, { promptDialog: { title: 'Name?', label: 'Name', defaultValue: '', onSubmit: noop }, setPromptDialog: close, t: () => '' }),
  EndSessionPreview: (close) => React.createElement(M.EndSessionPreview.EndSessionPreview, { preview: previewObj, note: '', canSaveSummary: true, groupNamesById: {}, copyToClipboard: noop, getConnectedCount: () => 0, onFollowUpResourceChange: noop, onSendCohort: noop, onNoteChange: noop, onKeepOpen: close, onComplete: noop }),
  Info: (close) => React.createElement(M.InfoModal.InfoModal, { handleSetInfoModalTabToAbout: noop, handleSetInfoModalTabToAtlas: noop, handleSetInfoModalTabToFeatures: noop, handleSetInfoModalTabToPrivacy: noop, handleSetInfoModalTabToOpenSource: noop, handleSetShowInfoModalToFalse: close, infoModalTab: 'about', safeRemoveItem: noop, setShowInfoModal: noop, setShowWizard: noop, t: (k) => k }),
  Session: (close) => React.createElement(M.SessionModal.SessionModal, { activeSessionCode: 'ABC123', activeSessionAppId: 'app-1', addToast: noop, appId: 'app-1', copyToClipboard: noop, connectedStudentCount: 0, handleSetShowGroupModalToTrue: noop, handleSetShowSessionModalToFalse: close, sessionData: { isLocalOnly: true, mode: 'sync' }, setConfirmDialog: noop, setShowSessionModal: noop, t: (k) => k, toggleSessionMode: noop }),
  XP: (close) => React.createElement(M.XPModal.XPModal, { currentLevelXP: 10, globalLevel: 2, globalPoints: 110, globalProgress: 10, globalXPNext: 100, handleSetShowXPModalToFalse: close, pointHistory: [], t: (k) => k }),
  Hints: (close) => React.createElement(M.HintsModal.HintsModal, { handleApplyHint: noop, handleGenerateLessonIdeas: noop, handleSaveExtensionToHistory: noop, handleSetShowHintsModalToFalse: close, hintHistory: [], history: [], isGeneratingExtension: false, renderFormattedText: (x) => x, t: (k) => k, toastHistory: [], onClearToastHistory: noop, initialTab: 'hints' }),
  StudyTimer: (close) => React.createElement(M.StudyTimerModal.StudyTimerModal, { ConfettiExplosion: () => null, customTimerMinutes: 5, formatTime: (x) => String(x), handleSetShowStudyTimerModalToFalse: close, isStudyTimerRunning: false, setCustomTimerMinutes: noop, setIsStudyTimerRunning: noop, setStudyDuration: noop, setStudyTaskLabel: noop, setStudyTimeLeft: noop, showStudyTimerModal: true, showTimerConfetti: false, studyDuration: 300, studyTaskLabel: '', studyTimeLeft: 300, studyTimerRef: { current: null }, t: (k) => k }),
  VisualSupports: (close) => React.createElement(M.VisualSupportsModal.VisualSupportsModal, { setShowVisualSupports: (v) => { if (!v) close(); }, setVsTab: noop, showVisualSupports: true, vsTab: 'schedule', t: (k) => k }),
};

// The host's own layout (AlloFlowANTI.txt): page content, the toast region, the
// two announcement regions and the dialogs are all children of one container.
function mount(name) {
  let api;
  function App() {
    const [open, setOpen] = React.useState(false);
    api = { setOpen };
    return React.createElement('div', { id: 'app-shell' },
      React.createElement('main', { id: 'bg-main' }, 'page'),
      React.createElement('div', { id: 'toasts', 'data-toast-region': '' }, 'Save failed'),
      React.createElement('div', { id: 'allo-live-polite', role: 'status', 'aria-live': 'polite' }),
      React.createElement('div', { id: 'allo-live-assertive', role: 'alert', 'aria-live': 'assertive' }),
      open ? DIALOGS[name](() => setOpen(false)) : null);
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  act(() => root.render(React.createElement(App)));
  return api;
}
const hidden = (id) => {
  const el = document.getElementById(id);
  return el.hasAttribute('inert') || el.getAttribute('aria-hidden') === 'true';
};
const REGIONS = ['toasts', 'allo-live-polite', 'allo-live-assertive'];
// XP hides only the direct children of <body>, so in the app's single container
// it hides nothing (finding 8 of the dialog review, not fixed here). Only the
// regions are checked for it.
const BODY_CHILDREN_ONLY = new Set(['XP']);

describe.each(Object.keys(DIALOGS))('%s dialog', (name) => {
  it('hides the page but leaves the announcement and toast regions, and restores everything on close', () => {
    const api = mount(name);
    act(() => api.setOpen(true));
    expect(document.querySelector('[role="dialog"],[role="alertdialog"]')).not.toBeNull();
    if (!BODY_CHILDREN_ONLY.has(name)) expect(hidden('bg-main'), 'the page behind is hidden').toBe(true);
    for (const id of REGIONS) expect(hidden(id), id + ' stays audible').toBe(false);
    act(() => api.setOpen(false));
    expect(hidden('bg-main')).toBe(false);
    for (const id of REGIONS) expect(hidden(id), id).toBe(false);
  });
});

// Every dialog source whose walker hides its siblings must skip the live regions.
const WALKER = /\/\^\((?:\?:)?SCRIPT\|STYLE\|LINK\|TEMPLATE\)\$\/i\.test\(([A-Za-z_$][\w$]*)\.tagName\)([^\n]{0,200})/g;

describe('every dialog walker in the sources', () => {
  const sources = readdirSync(process.cwd()).filter(f => f.endsWith('_source.jsx'));
  const walkers = [];
  for (const f of sources) {
    const text = readFileSync(resolve(process.cwd(), f), 'utf8');
    // Walkers may name the selector once as `liveSel` and test it on the same or the next line.
    const liveSel = (text.match(/\bliveSel = '([^']*)'/) || [])[1] || '';
    for (const m of text.matchAll(WALKER)) {
      const lineEnd = text.indexOf('\n', m.index + m[0].length);
      const nextEnd = lineEnd < 0 ? -1 : text.indexOf('\n', lineEnd + 1);
      const nextLine = lineEnd < 0 ? '' : text.slice(lineEnd + 1, nextEnd < 0 ? undefined : nextEnd);
      walkers.push({ file: f, rest: m[2], nextLine, liveSel });
    }
  }

  it('finds the dialogs it is meant to check', () => {
    expect(walkers.length).toBeGreaterThanOrEqual(30);
  });

  it('skips the announcement and toast regions in every one', () => {
    const LITERAL = /matches\('\[aria-live\], \[role="status"\], \[role="alert"\], \[data-toast-region\](?:, [^']*)?'\)/;
    const VIA_VAR = /\.matches(?:\?\.)?\(liveSel\)/;
    const coversRegions = (sel) => ['[aria-live]', '[role="status"]', '[role="alert"]', '[data-toast-region]'].every(part => sel.split(', ').includes(part));
    const skips = (w) => [w.rest, w.nextLine].some(code => LITERAL.test(code) || (VIA_VAR.test(code) && coversRegions(w.liveSel)));
    const missing = walkers.filter(w => !skips(w)).map(w => w.file);
    expect(missing).toEqual([]);
  });

  it('and so does each built module', () => {
    const stale = [...new Set(walkers.map(w => w.file))].filter((f) => {
      // walkthrough_copilot_source.jsx builds walkthrough_copilot_cdn_module.js
      // (walkthrough_copilot_module.js is the separate headless core).
      const builtName = f === 'walkthrough_copilot_source.jsx' ? 'walkthrough_copilot_cdn_module.js' : f.replace(/_source\.jsx$/, '_module.js');
      const built = readFileSync(resolve(process.cwd(), builtName), 'utf8');
      return !built.includes('[data-toast-region]');
    });
    expect(stale).toEqual([]);
  });
});
