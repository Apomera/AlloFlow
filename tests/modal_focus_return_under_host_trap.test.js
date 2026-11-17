// Closing Info, Study Timer, Visual Supports, Session, XP or Hints puts focus back on the button that opened it.
//
// WHY (2026-11-16): each of these dialogs carries its own focus trap, and the
// app shell also wraps it in the host's useFocusTrap. The host hook's effect
// runs after the dialog's, so it sits on top of the shared trap stack and
// records an element INSIDE the dialog as "where focus was". At close the
// dialog saw it was not the top trap and did nothing, the host tried to focus
// an element that no longer existed, and keyboard focus fell to the page body.
// The dialogs' own tests mount them without the host hook, so they stayed green.
//
// These tests mount the shipped modules under the real host hook, cut out of
// AlloFlowANTI.txt, in the same shape the host renders them.

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, M, useFocusTrap;
let root = null;
let host = null;
const noop = () => {};

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_info_modal_module.js');
  loadAlloModule('view_study_timer_modal_module.js');
  loadAlloModule('view_visual_supports_modal_module.js');
  loadAlloModule('view_session_modal_module.js');
  loadAlloModule('view_xp_modal_module.js');
  loadAlloModule('view_hints_modal_module.js');
  M = window.AlloModules;
  const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
  const from = anti.indexOf('const useFocusTrap = (ref, isOpen, onEscape) => {');
  const to = anti.indexOf('window.__alloHooks = { useFocusTrap };', from);
  expect(from).toBeGreaterThan(0);
  expect(to).toBeGreaterThan(from);
  // eslint-disable-next-line no-new-func
  useFocusTrap = new Function('useRef', 'useEffect', anti.slice(from, to) + '\nreturn useFocusTrap;')(React.useRef, React.useEffect);
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

// How AlloFlowANTI.txt renders each one: Info and Visual Supports inside a
// <div ref={...}>, Study Timer with the ref handed in as a prop.
const DIALOGS = {
  Info: {
    wrap: true,
    element: (close) => React.createElement(M.InfoModal.InfoModal, {
      handleSetInfoModalTabToAbout: noop, handleSetInfoModalTabToAtlas: noop, handleSetInfoModalTabToFeatures: noop,
      handleSetInfoModalTabToPrivacy: noop, handleSetInfoModalTabToOpenSource: noop, handleSetShowInfoModalToFalse: close,
      infoModalTab: 'about', safeRemoveItem: noop, setShowInfoModal: noop, setShowWizard: noop, t: (k) => k,
    }),
  },
  'Study Timer': {
    wrap: false,
    element: (close, ref) => React.createElement(M.StudyTimerModal.StudyTimerModal, {
      ConfettiExplosion: () => null, customTimerMinutes: 5, formatTime: (x) => String(x),
      handleSetShowStudyTimerModalToFalse: close, isStudyTimerRunning: false, setCustomTimerMinutes: noop,
      setIsStudyTimerRunning: noop, setStudyDuration: noop, setStudyTaskLabel: noop, setStudyTimeLeft: noop,
      showStudyTimerModal: true, showTimerConfetti: false, studyDuration: 300, studyTaskLabel: '', studyTimeLeft: 300,
      studyTimerRef: ref, t: (k) => k,
    }),
  },
  'Visual Supports': {
    wrap: true,
    element: (close) => React.createElement(M.VisualSupportsModal.VisualSupportsModal, {
      setShowVisualSupports: (v) => { if (!v) close(); }, setVsTab: noop, showVisualSupports: true, vsTab: 'schedule', t: (k) => k,
    }),
  },
  // Session, XP and Hints lost focus the same way, from before the other three
  // (fixed in a second pass the same day). All are rendered inside <div ref={...}>.
  Session: {
    wrap: true,
    element: (close) => React.createElement(M.SessionModal.SessionModal, {
      activeSessionCode: 'ABC123', activeSessionAppId: 'app-1', addToast: noop, appId: 'app-1', copyToClipboard: noop,
      connectedStudentCount: 0, handleSetShowGroupModalToTrue: noop, handleSetShowSessionModalToFalse: close,
      sessionData: { isLocalOnly: true, mode: 'sync' }, setConfirmDialog: noop, setShowSessionModal: noop, t: (k) => k,
      toggleSessionMode: noop,
    }),
  },
  XP: {
    wrap: true,
    element: (close) => React.createElement(M.XPModal.XPModal, {
      currentLevelXP: 10, globalLevel: 2, globalPoints: 110, globalProgress: 10, globalXPNext: 100,
      handleSetShowXPModalToFalse: close, pointHistory: [], t: (k) => k,
    }),
  },
  Hints: {
    wrap: true,
    element: (close) => React.createElement(M.HintsModal.HintsModal, {
      handleApplyHint: noop, handleGenerateLessonIdeas: noop, handleSaveExtensionToHistory: noop,
      handleSetShowHintsModalToFalse: close, hintHistory: [], history: [], isGeneratingExtension: false,
      renderFormattedText: (x) => x, t: (k) => k, toastHistory: [], onClearToastHistory: noop, initialTab: 'hints',
    }),
  },
};

function mountUnderHost(name, { withHostTrap = true, second = null } = {}) {
  const spec = DIALOGS[name];
  let api;
  function App() {
    const [show, setShow] = React.useState(false);
    const [showSecond, setShowSecond] = React.useState(false);
    api = { setShow, setShowSecond };
    const ref = React.useRef(null);
    const unused = React.useRef(null);
    useFocusTrap(withHostTrap ? ref : unused, show, () => setShow(false));
    const close = () => setShow(false);
    const modal = spec.element(close, ref);
    return React.createElement('div', { id: 'app-shell' },
      React.createElement('main', null,
        React.createElement('button', { id: 'opener', type: 'button' }, 'open'),
        React.createElement('button', { id: 'other', type: 'button' }, 'other')),
      show ? (spec.wrap ? React.createElement('div', { ref }, modal) : modal) : null,
      showSecond && second ? second(() => setShowSecond(false)) : null);
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  act(() => root.render(React.createElement(App)));
  const dialog = () => host.querySelector('[role="dialog"],[role="alertdialog"]');
  const opener = () => document.getElementById('opener');
  return { api: () => api, dialog, opener };
}
const pressEscape = (target) => act(() => { target.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });

describe.each(Object.keys(DIALOGS))('%s under the host focus trap', (name) => {
  it('returns focus to the opener when it is closed with its own close action', () => {
    const ui = mountUnderHost(name);
    ui.opener().focus();
    act(() => ui.api().setShow(true));
    expect(ui.dialog()).not.toBeNull();
    // Both traps are registered, the host's on top: the arrangement that lost focus.
    expect(window.__alloFocusTrapStack.length).toBe(2);
    expect(ui.dialog().contains(document.activeElement)).toBe(true);
    act(() => ui.api().setShow(false));
    expect(ui.dialog()).toBeNull();
    expect(document.activeElement).toBe(ui.opener());
    expect(window.__alloFocusTrapStack.length).toBe(0);
  });

  it('returns focus to the opener when it is closed with Escape', () => {
    const ui = mountUnderHost(name);
    ui.opener().focus();
    act(() => ui.api().setShow(true));
    pressEscape(ui.dialog());
    expect(ui.dialog()).toBeNull();
    expect(document.activeElement).toBe(ui.opener());
  });

  it('still returns focus when mounted without the host trap', () => {
    const ui = mountUnderHost(name, { withHostTrap: false });
    ui.opener().focus();
    act(() => ui.api().setShow(true));
    act(() => ui.api().setShow(false));
    expect(document.activeElement).toBe(ui.opener());
  });

  it('does not pull focus out of a different dialog that is still open above it', () => {
    // A second, unrelated dialog opened later owns focus. Closing the first one
    // underneath must leave focus where it is.
    function Upper({ onClose }) {
      const ref = React.useRef(null);
      useFocusTrap(ref, true, onClose);
      return React.createElement('div', { ref, role: 'dialog', 'aria-modal': 'true', id: 'upper' },
        React.createElement('button', { id: 'upper-button', type: 'button' }, 'upper'));
    }
    const ui = mountUnderHost(name, { second: (close) => React.createElement(Upper, { onClose: close }) });
    ui.opener().focus();
    act(() => ui.api().setShow(true));
    act(() => ui.api().setShowSecond(true));
    const upperButton = document.getElementById('upper-button');
    act(() => upperButton.focus());
    act(() => ui.api().setShow(false));
    expect(document.activeElement).toBe(upperButton);
  });
});
