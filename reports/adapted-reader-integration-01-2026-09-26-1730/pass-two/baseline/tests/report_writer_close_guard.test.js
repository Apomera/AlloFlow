// Closing the Report Writer with unsaved work.
//
// WHY (2026-09-23): Escape anywhere in the dialog, a click on the backdrop and
// the close button all closed the Report Writer at once. In the default
// session-only mode nothing is stored on the device, so a stray Escape (to
// dismiss an autocomplete list, say) discarded an evaluation's scores, notes
// and draft. Case documents are never stored, even with device storage on.
// Closing now asks first when something would be lost, and the browser warns
// on reload or tab close.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot;
beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
  URL.createObjectURL = URL.createObjectURL || (() => 'blob:test');
  URL.revokeObjectURL = URL.revokeObjectURL || (() => {});
});

let mounted = null;
afterEach(async () => { if (mounted) { await React.act(async () => mounted.root.unmount()); mounted.host.remove(); mounted = null; } });
const act = (fn) => React.act(async () => { await fn(); });
const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const escape = (el) => act(() => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));

async function open(persist = false) {
  localStorage.clear();
  if (persist) localStorage.setItem('allo_rw_persist_enabled', 'true');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const onClose = vi.fn();
  mounted = { host, root };
  await act(() => root.render(React.createElement(window.AlloModules.ReportWriter, {
    onClose, callGemini: vi.fn(async () => '{}'), addToast: vi.fn(), t: key => key,
    studentNickname: 'Student A', behaviorLensData: null, longitudinalData: null, dashboardData: [],
  })));
  const steps = () => Array.from(host.querySelectorAll('nav[aria-label="Report Writer steps"] button'));
  const addScore = async () => {
    await click(steps()[3]);
    host.querySelector('input[aria-label="Score for Full Scale IQ"]').value = '88';
    await click(host.querySelector('#rw-sub-Full-Scale-IQ-add'));
  };
  return { host, onClose, steps, addScore, dialog: () => host.querySelector('#rw-dialog-surface'), ask: () => host.querySelector('[role="alertdialog"][aria-labelledby="rw-close-title"]') };
}
const unloadBlocked = () => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; };

describe('closing the Report Writer', () => {
  it('with nothing entered, closes at once', async () => {
    const ui = await open();
    await escape(ui.dialog());
    expect(ui.onClose).toHaveBeenCalledTimes(1);
    expect(unloadBlocked()).toBe(false);
  });

  it('with unsaved work, Escape, the backdrop and the close button all ask first', async () => {
    const ui = await open();
    await ui.addScore();
    expect(unloadBlocked()).toBe(true);
    await escape(ui.host.querySelector('input[aria-label="Custom subtest name"]'));
    expect(ui.onClose).not.toHaveBeenCalled();
    expect(ui.ask()).toBeTruthy();
    expect(ui.ask().textContent).toMatch(/kept only while the Report Writer is open/);
    expect(document.activeElement.textContent).toBe('Keep working');
    expect(ui.dialog().hasAttribute('inert')).toBe(true);
    const results = await axe.run(ui.host, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'] }, rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.map(v => v.id)).toEqual([]);
    // Escape inside the question keeps working; so does its button.
    await escape(ui.ask());
    expect(ui.ask()).toBeNull();
    expect(ui.dialog().hasAttribute('inert')).toBe(false);
    await click(ui.host.firstChild);
    expect(ui.ask()).toBeTruthy();
    await click(Array.from(ui.ask().querySelectorAll('button')).find(b => b.textContent === 'Keep working'));
    // The close button (named by the host's translator, so found by position).
    await click(ui.dialog().querySelector(':scope > button'));
    expect(ui.onClose).not.toHaveBeenCalled();
    await click(Array.from(ui.ask().querySelectorAll('button')).find(b => b.textContent === 'Close and discard'));
    expect(ui.onClose).toHaveBeenCalledTimes(1);
  }, 60000);

  it('after Save JSON the work counts as saved, until something changes', async () => {
    const ui = await open();
    await ui.addScore();
    await click(ui.steps()[9]);
    await click(ui.host.querySelector('button[aria-label="Export as JSON"]'));
    expect(unloadBlocked()).toBe(false);
    await escape(ui.dialog());
    expect(ui.onClose).toHaveBeenCalledTimes(1);
    // A change after saving is unsaved again.
    await click(ui.steps()[3]);
    ui.host.querySelector('input[aria-label="Score for Working Memory"]').value = '90';
    await click(ui.host.querySelector('#rw-sub-Working-Memory-add'));
    expect(unloadBlocked()).toBe(true);
  }, 60000);

  it('with device storage on, only case documents (never stored) make it ask', async () => {
    const ui = await open(true);
    await ui.addScore();
    await escape(ui.dialog());
    expect(ui.onClose).toHaveBeenCalledTimes(1);
    ui.onClose.mockClear();
    await click(ui.steps()[1]);
    await act(() => {
      const box = ui.host.querySelector('textarea[aria-label="Case document text"]');
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(box, 'Prior evaluation text.');
      box.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click(Array.from(ui.host.querySelectorAll('button')).find(b => b.textContent.includes('Add Case Document')));
    await escape(ui.dialog());
    expect(ui.onClose).not.toHaveBeenCalled();
    expect(ui.ask().textContent).toMatch(/case documents never are/);
  }, 60000);
});
