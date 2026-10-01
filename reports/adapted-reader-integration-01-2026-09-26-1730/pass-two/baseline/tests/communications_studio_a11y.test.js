// Communications Studio passes axe in the states a teacher actually reaches
// (2026-09-23): the empty studio, a drafted report-card batch with its
// per-student list and report, a family reply showing the safety and name
// flags with the confirm bar open, and a translation with its back-check and
// stale notice. The shipped module, real React, jsdom.
//
// color-contrast and region are disabled as in every axe test in this repo:
// jsdom computes no real colours, and the dialog is not a page.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const require2 = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let axe;
let Panel;
let root;
let host;

const SERIOUS = (results) => results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 80)).join(' | ')}`);
const AXE_OPTS = { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } };
// axe's first run in a fresh jsdom takes seconds on a loaded machine.
const AXE_TIMEOUT_MS = 30000;

beforeAll(() => {
  React = require2(resolve(modulesDir, 'react'));
  ReactDOMClient = require2(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require2(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require2(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.CommunicationsStudio;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'communications_studio_module.js'), 'utf8'))();
  Panel = window.AlloModules.CommunicationsStudio.CommunicationsStudioPanel;
});

beforeEach(() => {
  window.alloCopyText = async () => true;
  window.__alloAddToast = () => {};
  window.callGemini = async (prompt, json) => {
    if (json) {
      const names = Array.from(prompt.matchAll(/^(S\d+) \|/gm), (m) => m[1]);
      return JSON.stringify(names.filter((c) => c !== 'S3').map((c) => ({ codename: c, comment: c === 'S2' ? 'S2 demonstrates considerable metacognitive sophistication, articulating interdisciplinary connections.' : `${c} reads with care.` })));
    }
    if (prompt.includes('back into English')) return 'Dear families: we learned fractions.';
    return prompt.startsWith('Translate') ? 'Estimadas familias: aprendimos fracciones.' : 'Dear families, we learned fractions.';
  };
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  host?.remove();
  host = null;
  window.__alloFocusTrapStack = [];
  delete window.callGemini;
  vi.restoreAllMocks();
  localStorage.clear();
});

function mount(props = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  act(() => root.render(React.createElement(Panel, { isOpen: true, t: (k) => k, onClose: () => {}, ...props })));
  return host.querySelector('[role="dialog"]');
}
const click = (el) => act(async () => { el.click(); });
const setValue = (el, value) => act(async () => {
  const proto = { SELECT: window.HTMLSelectElement, INPUT: window.HTMLInputElement }[el.tagName] || window.HTMLTextAreaElement;
  Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new window.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
});
const field = (dialog, label) => Array.from(dialog.querySelectorAll('label')).find((l) => l.textContent.trim().startsWith(label)).querySelector('textarea, select');
const tab = (dialog, name) => Array.from(dialog.querySelectorAll('[role="tab"]')).find((b) => b.textContent === name);
const button = (dialog, text) => Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent.trim().startsWith(text));

async function scan(dialog) {
  const results = await axe.run(dialog, AXE_OPTS);
  // A scan of an empty or unrendered node passes vacuously; require real work.
  expect(results.passes.length).toBeGreaterThan(10);
  return SERIOUS(results);
}

describe('Communications Studio passes axe', () => {
  it('when it opens', async () => {
    const dialog = mount();
    expect(await scan(dialog)).toEqual([]);
  }, AXE_TIMEOUT_MS);

  it('with a drafted batch: per-student list, flags, report, retry', async () => {
    const dialog = mount();
    await click(tab(dialog, 'Report-card comments (batch)'));
    await setValue(dialog.querySelector('[data-comms-char-limit]'), '60');
    await setValue(field(dialog, 'One student per line'), 'S1 | a | b | c\nS2 | a | b | c\nS3 | a | b | c');
    await click(button(dialog, 'Draft from my notes'));
    expect(dialog.querySelectorAll('[data-comms-row]')).toHaveLength(2);
    expect(dialog.querySelector('[data-comms-retry-missing]')).toBeTruthy();
    expect(dialog.querySelector('[data-comms-simplify-row="S2"]')).toBeTruthy();
    await setValue(field(dialog, 'Also in'), 'Spanish');
    await click(dialog.querySelector('[data-comms-translate-rows]'));
    expect(dialog.querySelectorAll('[data-comms-row-translation]')).toHaveLength(2);
    await setValue(dialog.querySelector('[data-comms-row="S1"] > textarea'), 'S1 new words.');
    expect(dialog.querySelector('[data-comms-row-translation-stale="S1"]')).toBeTruthy();
    expect(await scan(dialog)).toEqual([]);
  }, AXE_TIMEOUT_MS);

  it('with a family message raising safety, legal and name flags, and the close confirmation open', async () => {
    const dialog = mount();
    await click(tab(dialog, 'Reply to a family message'));
    await setValue(field(dialog, 'Their message'), "This is Jayden's mom. He said a boy threatened him; our lawyer is involved.\nThanks,\nRosa");
    expect(dialog.querySelector('[data-comms-sensitive]')).toBeTruthy();
    expect(dialog.querySelector('[data-comms-name-warning]')).toBeTruthy();
    await click(button(dialog, 'Close'));
    expect(dialog.querySelector('[data-comms-confirm]')).toBeTruthy();
    expect(await scan(dialog)).toEqual([]);
  }, AXE_TIMEOUT_MS);

  it('with a translation, its back-check, and the stale notice', async () => {
    const dialog = mount();
    await setValue(field(dialog, 'What we learned'), 'Fractions.');
    await click(button(dialog, 'Draft from my notes'));
    await setValue(field(dialog, 'Also in'), 'Spanish');
    await click(button(dialog, 'Draft in Spanish'));
    await click(dialog.querySelector('[data-comms-back-translate]'));
    expect(dialog.querySelector('[data-comms-back-check]')).toBeTruthy();
    await setValue(dialog.querySelector('[data-comms-output]'), 'Dear families, we learned fractions and decimals.');
    expect(dialog.querySelector('[data-comms-translation-stale]')).toBeTruthy();
    expect(await scan(dialog)).toEqual([]);
  }, AXE_TIMEOUT_MS);

  it('with earlier drafts listed and open, and the evidence check on the draft', async () => {
    const dialog = mount();
    await setValue(field(dialog, 'What we learned'), 'Fractions.');
    await click(button(dialog, 'Draft from my notes'));
    await setValue(dialog.querySelector('[data-comms-output]'), 'Dear families, 25 of us learned fractions and she helped.');
    await click(button(dialog, 'Draft from my notes'));
    await setValue(dialog.querySelector('[data-comms-output]'), 'Dear families, 30 students learned fractions.');
    const versions = dialog.querySelector('[data-comms-versions]');
    expect(versions).toBeTruthy();
    versions.open = true;
    expect(dialog.querySelector('[data-comms-draft-gaps]')).toBeTruthy();
    expect(await scan(dialog)).toEqual([]);
  }, AXE_TIMEOUT_MS);
});
