// Escape pressed while a Japanese, Chinese or Korean keyboard is composing a character does not close the dialog.
//
// WHY (2026-11-16): on those keyboards Escape cancels the character being
// composed. The host's useFocusTrap and its global Escape safety net both
// treated that key as "close", so a teacher typing a name in a dialog lost the
// dialog and what they had typed. The dialogs' own traps already ignored it.
//
// Both pieces are cut out of AlloFlowANTI.txt and run as shipped.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, useFocusTrap, netSource;
let root = null;
let host = null;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.IS_REACT_ACT_ENVIRONMENT = true;
  // FOCUS_TRAP_ANTI points the test at another copy of the host file (to see it fail on an old one).
  const anti = readFileSync(resolve(process.cwd(), process.env.FOCUS_TRAP_ANTI || 'AlloFlowANTI.txt'), 'utf8');
  const from = anti.indexOf('const useFocusTrap = (ref, isOpen, onEscape) => {');
  const to = anti.indexOf('window.__alloHooks = { useFocusTrap };', from);
  expect(from).toBeGreaterThan(0);
  expect(to).toBeGreaterThan(from);
  // eslint-disable-next-line no-new-func
  useFocusTrap = new Function('useRef', 'useEffect', anti.slice(from, to) + '\nreturn useFocusTrap;')(React.useRef, React.useEffect);
  const netFrom = anti.indexOf("if (typeof window !== 'undefined' && !window.__alloEscapeNetInstalled) {", to);
  const netTo = anti.indexOf('window.UiLanguageSelector = UiLanguageSelector;', netFrom);
  expect(netFrom).toBeGreaterThan(0);
  expect(netTo).toBeGreaterThan(netFrom);
  netSource = anti.slice(netFrom, netTo);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  if (host) host.remove();
  host = null;
  delete window.__alloFocusTrapStack;
  vi.useRealTimers();
});

function mountDialog(onEscape) {
  function Dialog() {
    const ref = React.useRef(null);
    useFocusTrap(ref, true, onEscape);
    return React.createElement('div', { ref, role: 'dialog', 'aria-modal': 'true' },
      React.createElement('input', { id: 'name-box', 'aria-label': 'Name' }),
      React.createElement('button', { type: 'button' }, 'Save'));
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  act(() => root.render(React.createElement(Dialog)));
  return document.getElementById('name-box');
}

// What browsers send for a key the input method handles: isComposing true, or
// (older Chrome and Safari) keyCode 229 on the keydown.
const key = (init) => {
  const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...init });
  if (init && init.keyCode) Object.defineProperty(e, 'keyCode', { value: init.keyCode });
  return e;
};

describe('host useFocusTrap', () => {
  it('closes on a plain Escape', () => {
    const onEscape = vi.fn();
    const box = mountDialog(onEscape);
    act(() => { box.dispatchEvent(key()); });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('leaves Escape to the keyboard while a character is being composed', () => {
    const onEscape = vi.fn();
    const box = mountDialog(onEscape);
    const composing = key({ isComposing: true });
    act(() => { box.dispatchEvent(composing); });
    expect(onEscape).not.toHaveBeenCalled();
    expect(composing.defaultPrevented).toBe(false);
  });

  it('leaves Escape to the keyboard when the browser reports keyCode 229', () => {
    const onEscape = vi.fn();
    const box = mountDialog(onEscape);
    act(() => { box.dispatchEvent(key({ keyCode: 229 })); });
    expect(onEscape).not.toHaveBeenCalled();
  });
});

describe('global Escape safety net', () => {
  // The net is installed once per window, so one install serves these tests.
  let clicks = 0;
  let dialog = null;
  beforeAll(() => {
    delete window.__alloEscapeNetInstalled;
    // eslint-disable-next-line no-new-func
    new Function(netSource)();
  });
  const open = () => {
    dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.getBoundingClientRect = () => ({ width: 300, height: 200 });
    const close = document.createElement('button');
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', () => { clicks++; });
    dialog.appendChild(close);
    document.body.appendChild(dialog);
    clicks = 0;
  };
  afterEach(() => { if (dialog) dialog.remove(); dialog = null; });

  it('clicks the dialog close button on a plain Escape nothing else handled', () => {
    vi.useFakeTimers();
    open();
    dialog.dispatchEvent(key());
    vi.advanceTimersByTime(60);
    expect(clicks).toBe(1);
  });

  it('does nothing for Escape during composition', () => {
    vi.useFakeTimers();
    open();
    dialog.dispatchEvent(key({ isComposing: true }));
    dialog.dispatchEvent(key({ keyCode: 229 }));
    vi.advanceTimersByTime(60);
    expect(clicks).toBe(0);
  });
});
