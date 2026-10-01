// Communications Studio renders as its own modal (2026-09-22).
//
// The panel shipped as a bare flex column, so the host's CDNModuleGate dropped
// it at the bottom of the main UI instead of over it. Every sibling Educator Hub
// tool draws its own fixed overlay + role="dialog" shell; this pins that the
// studio does too, in the SHIPPED module rendered with real React.
//
// Two behaviours are specific to this tool: nothing typed is persisted, so a
// backdrop click must NOT close it, and the host passes a fresh onClose arrow
// every render, so a host re-render must not re-run the focus trap and pull
// focus out of the textarea the teacher is typing in.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const require2 = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let Panel;
let root;
let host;
let opener;

beforeAll(() => {
  React = require2(resolve(modulesDir, 'react'));
  ReactDOMClient = require2(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require2(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.CommunicationsStudio;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'communications_studio_module.js'), 'utf8'))();
  Panel = window.AlloModules.CommunicationsStudio.CommunicationsStudioPanel;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  for (const node of [host, opener]) node?.remove();
  host = opener = null;
  window.__alloFocusTrapStack = [];
  vi.restoreAllMocks();
  localStorage.clear();
});

function render(props) {
  act(() => root.render(React.createElement(Panel, { isOpen: true, t: (k) => k, ...props })));
}

function mount(props) {
  opener = document.createElement('button');
  opener.type = 'button';
  document.body.appendChild(opener);
  opener.focus();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  render(props);
  return host.querySelector('[role="dialog"]');
}

const escape = () => act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });

describe('Communications Studio modal shell', () => {
  it('renders over the page as a labelled modal dialog, not inline content', () => {
    const dialog = mount({ onClose: () => {} });
    const overlay = host.firstElementChild;
    expect(overlay.className).toMatch(/\bfixed\b/);
    expect(overlay.className).toMatch(/\binset-0\b/);
    expect(overlay.contains(dialog)).toBe(true);
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('data-communications-studio')).toBe('true');
    const title = document.getElementById(dialog.getAttribute('aria-labelledby'));
    expect(title?.textContent).toBe('Communications Studio');
    expect(dialog.contains(title)).toBe(true);
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('closes on Escape and on the Close button, but not on a backdrop click', () => {
    const onClose = vi.fn();
    const dialog = mount({ onClose });
    act(() => { host.firstElementChild.click(); });
    expect(onClose).not.toHaveBeenCalled();
    escape();
    expect(onClose).toHaveBeenCalledTimes(1);
    const close = Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent === 'Close');
    act(() => { close.click(); });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('a host re-render with a new onClose keeps focus where the teacher is typing', () => {
    const first = vi.fn();
    const dialog = mount({ onClose: first });
    const textarea = dialog.querySelector('textarea');
    textarea.focus();
    const second = vi.fn();
    render({ onClose: second });
    expect(document.activeElement).toBe(textarea);
    escape();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('returns focus to the opener when it unmounts', () => {
    mount({ onClose: () => {} });
    expect(document.activeElement).not.toBe(opener);
    act(() => root.unmount());
    root = null;
    expect(document.activeElement).toBe(opener);
  });
});
