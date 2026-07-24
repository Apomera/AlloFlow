// End-to-end-ish test for Throughline's "View in 3D" entry point.
//
// Pre-loads the engine + 3D modules (so ensureConceptGraph() finds them present and
// no real <script> CDN load is needed in jsdom), mounts Throughline with a populated
// unit, clicks "View in 3D", and asserts the 3D overlay opens and renders the
// reading-order outline with resolved lesson titles (jsdom has no WebGL, so the
// renderer degrades to the outline — which is exactly the a11y contract).

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import {
  setupThroughline, seedStorage, clearStorage,
  sampleUnit, sampleHistory, sampleUnits, React,
} from './helpers/throughline_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'concept_graph_engine_module.js'), 'utf8'))();
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'concept_graph_3d_module.js'), 'utf8'))();
  window.React = React;
});
beforeEach(() => clearStorage());

const noop = () => {};
function baseProps(over) {
  return Object.assign({ isOpen: true, onClose: noop, addToast: noop, studentNickname: '', t: (k) => k }, over || {});
}
function btn(host, needle) {
  return Array.prototype.slice.call(host.querySelectorAll('button')).find((b) => (b.textContent || '').includes(needle));
}

describe('Throughline — View in 3D entry point', () => {
  it('shows the button for a populated unit and opens a 3D overlay (outline fallback under jsdom)', async () => {
    seedStorage(sampleUnit());
    const C = setupThroughline();
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(C, baseProps({ history: sampleHistory(), units: sampleUnits(), onOpenLesson: noop })));
    });

    const viewBtn = btn(host, 'throughline.view_3d');
    expect(viewBtn).toBeTruthy();

    viewBtn.focus();
    expect(document.activeElement).toBe(viewBtn);
    await act(async () => { viewBtn.click(); });
    await act(async () => { await Promise.resolve(); });   // flush ensureConceptGraph() + the View effect

    const dialog = Array.prototype.slice.call(host.querySelectorAll('[role="dialog"]'))
      .find((d) => (d.getAttribute('aria-label') || '').includes('throughline.view_3d'));
    expect(dialog).toBeTruthy();
    expect(dialog.contains(document.activeElement)).toBe(true);
    // sampleUnit n1→h1 ("Source Intro"): the 3D overlay's accessible outline names lessons by resolved title
    expect(dialog.textContent).toMatch(/Source Intro/);

    const closeBtn = Array.prototype.slice.call(dialog.querySelectorAll('button'))
      .find((b) => (b.getAttribute('aria-label') || '').includes('close') || b.textContent === '✕');
    await act(async () => { if (closeBtn) closeBtn.click(); });
    expect(Array.prototype.slice.call(host.querySelectorAll('[role="dialog"]'))
      .some((d) => (d.getAttribute('aria-label') || '').includes('throughline.view_3d'))).toBe(false);
    expect(document.activeElement).toBe(viewBtn);

    try { act(() => root.unmount()); } catch (_) {}
    host.remove();
  });

  it('hides the "View in 3D" button when the unit is empty', () => {
    const C = setupThroughline();
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    act(() => { root.render(React.createElement(C, baseProps({ history: sampleHistory(), onOpenLesson: noop }))); });
    expect(btn(host, 'throughline.view_3d')).toBeFalsy();   // empty canvas → no 3D entry
    try { act(() => root.unmount()); } catch (_) {}
    host.remove();
  });
});
