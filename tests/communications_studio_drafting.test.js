// Communications Studio drafting behaviour, driven through the SHIPPED module
// with real React and a mocked model (2026-09-23).
//
// Each block pins a defect found by running the tool, not by reading it:
//   - every call used JSON mode, so letters and translations came back as JSON;
//   - a 120-student grid sent 40 students and nothing said the rest were gone,
//     and a reply that skipped or renamed a student was not noticed;
//   - a Spanish translation was copied under a "Somali" heading after the
//     language changed, and a translation of an older draft was still copied;
//   - peeking at another template erased the draft, and closing discarded
//     everything with no question asked (nothing in the studio is saved).

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
let calls;
let copied;

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

const PROSE = 'Dear families, this week we learned fractions.';
const SPANISH = 'Estimadas familias: esta semana aprendimos fracciones.';
const codenamesIn = (prompt) => Array.from(prompt.matchAll(/^(S\d+) \|/gm), (m) => m[1]);

function mockModel(respond) {
  calls = [];
  window.callGemini = vi.fn(async (prompt, jsonMode) => { calls.push({ prompt, json: jsonMode }); return respond(prompt, jsonMode); });
}
const plainModel = () => mockModel((prompt, json) => {
  if (json) return JSON.stringify(codenamesIn(prompt).map((c) => ({ codename: c, comment: `${c} comment` })));
  return prompt.startsWith('Translate') ? SPANISH : PROSE;
});

beforeEach(() => {
  copied = [];
  window.alloCopyText = vi.fn(async (text) => { copied.push(text); return true; });
  window.__alloAddToast = vi.fn();
  plainModel();
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
}

const dialog = () => host.querySelector('[role="dialog"]');
const q = (sel) => dialog().querySelector(sel);
const control = (label) => {
  const el = Array.from(dialog().querySelectorAll('label')).find((l) => l.textContent.trim().startsWith(label));
  if (!el) throw new Error(`no field labelled ${label}`);
  return el.querySelector('textarea, select');
};
const button = (text) => {
  const el = Array.from(dialog().querySelectorAll('button')).find((b) => b.textContent.trim().startsWith(text));
  if (!el) throw new Error(`no button ${text}`);
  return el;
};
const tab = (name) => Array.from(dialog().querySelectorAll('[role="tab"]')).find((b) => b.textContent === name);
const click = (el) => act(async () => { el.click(); });
const setValue = (el, value) => act(async () => {
  const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLTextAreaElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new window.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
});
const escape = () => act(async () => { document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
const draftBox = () => q('[data-comms-output]');
const grid = (n) => Array.from({ length: n }, (_, i) => `S${i + 1} | reads carefully | fractions | Perseverance 3`).join('\n');

async function draftFamilyUpdate() {
  await setValue(control('What we learned'), 'Fractions on a number line.');
  await click(button('Draft from my notes'));
}

describe('JSON mode', () => {
  it('is used only for the report-card batch; letters, replies and translations ask for plain text', async () => {
    mount();
    await draftFamilyUpdate();
    expect(draftBox().value).toBe(PROSE);
    await setValue(control('Also in'), 'Spanish');
    await click(button('Draft in Spanish'));
    await click(tab('Recommendation letter'));
    await click(button('Draft from my notes'));
    await click(tab('Reply to a family message'));
    await click(button('Draft from my notes'));
    await click(tab('Report-card comments (batch)'));
    await setValue(control('One student per line'), 'S1 | reads | rushing | Perseverance 3');
    await click(button('Draft from my notes'));
    expect(calls.map((c) => c.json)).toEqual([false, false, false, false, true]);
    expect(draftBox().value).toBe('S1: S1 comment');
  });
});

describe('batch report cards', () => {
  it('drafts a 120-student grid in chunks, reports the skipped and renamed students, and retries only those', async () => {
    mockModel((prompt) => {
      const names = codenamesIn(prompt);
      const firstPass = calls.length <= 3;
      return JSON.stringify(names
        .filter((c) => !(firstPass && c === 'S57'))
        .map((c) => ({ codename: firstPass && c === 'S80' ? 'Student S80' : c, comment: `${c} comment` })));
    });
    mount();
    await click(tab('Report-card comments (batch)'));
    await setValue(control('One student per line'), grid(120));
    await click(button('Draft from my notes'));
    expect(calls.map((c) => [c.json, codenamesIn(c.prompt).length])).toEqual([[true, 40], [true, 40], [true, 40]]);
    const report = q('[data-comms-batch-report]');
    expect(report.textContent).toContain('118 of 120');
    expect(report.textContent).toContain('No comment came back for: S57, S80');
    expect(report.textContent).toContain('Student S80');
    expect(draftBox().value.split('\n\n')).toHaveLength(118);
    expect(draftBox().value).not.toContain('S57:');

    await click(q('[data-comms-retry-missing]'));
    expect(calls).toHaveLength(4);
    expect(codenamesIn(calls[3].prompt)).toEqual(['S57', 'S80']);
    expect(q('[data-comms-batch-report]').textContent).toContain('120 of 120');
    expect(q('[data-comms-retry-missing]')).toBeNull();
    expect(draftBox().value).toContain('S57: S57 comment');
    expect(draftBox().value.split('\n\n')).toHaveLength(120);
  });

  it('refuses a grid over the limit instead of drafting part of it', async () => {
    mount();
    await click(tab('Report-card comments (batch)'));
    await setValue(control('One student per line'), grid(251));
    await click(button('Draft from my notes'));
    expect(calls).toHaveLength(0);
    expect(window.__alloAddToast.mock.calls.map((c) => c[0]).join(' ')).toContain('251');
  });
});

describe('translations', () => {
  it('changing the language drops the old translation instead of relabelling it', async () => {
    mount();
    await draftFamilyUpdate();
    await setValue(control('Also in'), 'Spanish');
    await click(button('Draft in Spanish'));
    expect(q('[data-comms-translation]').value).toBe(SPANISH);
    await setValue(control('Also in'), 'Somali');
    expect(q('[data-comms-translation]')).toBeNull();
    await click(button('Copy all'));
    expect(copied[0]).not.toContain('Somali');
    expect(copied[0]).not.toContain(SPANISH);
  });

  it('asks before discarding a translation the teacher edited', async () => {
    mount();
    await draftFamilyUpdate();
    await setValue(control('Also in'), 'Spanish');
    await click(button('Draft in Spanish'));
    await setValue(q('[data-comms-translation]'), `${SPANISH} (revisado)`);
    await setValue(control('Also in'), 'Somali');
    expect(q('[data-comms-confirm]')).not.toBeNull();
    expect(q('[data-comms-translation]').value).toContain('(revisado)');
    await click(button('Keep editing'));
    expect(control('Also in').value).toBe('Spanish');
  });

  it('a translation of an older draft is left out of Copy until retranslated or confirmed', async () => {
    mount();
    await draftFamilyUpdate();
    await setValue(control('Also in'), 'Spanish');
    await click(button('Draft in Spanish'));
    await click(button('Copy all'));
    expect(copied[0]).toContain(`--- Spanish (machine draft; have a bilingual colleague check) ---\n${SPANISH}`);
    await setValue(draftBox(), `${PROSE} Next week: decimals.`);
    expect(q('[data-comms-translation-stale]')).not.toBeNull();
    await click(button('Copy all'));
    expect(copied[1]).not.toContain(SPANISH);
    await click(button('It still matches'));
    await click(button('Copy all'));
    expect(copied[2]).toContain(SPANISH);
  });
});

describe('work is not lost', () => {
  it('each template keeps its own draft while the studio is open', async () => {
    mount();
    await draftFamilyUpdate();
    await click(tab('Recommendation letter'));
    expect(draftBox().value).toBe('');
    await click(tab('Family update'));
    expect(draftBox().value).toBe(PROSE);
  });

  it('closing asks when something would be lost, and not after it was copied', async () => {
    const onClose = vi.fn();
    mount({ onClose });
    await setValue(control('What we learned'), 'Fractions.');
    await escape();
    expect(onClose).not.toHaveBeenCalled();
    expect(q('[data-comms-confirm]')).not.toBeNull();
    expect(document.activeElement).toBe(button('Keep editing'));
    await escape();
    expect(q('[data-comms-confirm]')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    await click(button('Close'));
    await click(button('Discard and close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes straight away once the draft was copied, but asks about a parked draft on another template', async () => {
    const onClose = vi.fn();
    mount({ onClose });
    await draftFamilyUpdate();
    await click(button('Copy all'));
    await click(button('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);

    await click(tab('Recommendation letter'));
    await click(button('Draft from my notes'));
    await click(tab('Family update'));
    await click(button('Close'));
    expect(q('[data-comms-confirm]')).not.toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('asks before a new draft replaces an edited one, not before replacing an untouched one', async () => {
    mount();
    await draftFamilyUpdate();
    await click(button('Draft from my notes'));
    expect(calls).toHaveLength(2);
    expect(q('[data-comms-confirm]')).toBeNull();
    await setValue(draftBox(), `${PROSE} My own sentence.`);
    await click(button('Draft from my notes'));
    expect(calls).toHaveLength(2);
    expect(q('[data-comms-confirm]')).not.toBeNull();
    await click(button('Replace it'));
    expect(calls).toHaveLength(3);
    expect(draftBox().value).toBe(PROSE);
  });

  it('asks before Fill from roster replaces a grid the teacher typed', async () => {
    mount({ roster: { students: { S1: '', S2: '' } } });
    await click(tab('Report-card comments (batch)'));
    const gridBox = () => control('One student per line');
    await setValue(gridBox(), 'X | typed by hand');
    await click(button('Fill from roster'));
    await click(button('Keep editing'));
    expect(gridBox().value).toBe('X | typed by hand');
    await click(button('Fill from roster'));
    await click(button('Replace it'));
    expect(gridBox().value).toMatch(/^S1 \|/);
    await click(button('Fill from roster'));
    expect(q('[data-comms-confirm]')).toBeNull();
  });
});
