// Protecting the clinician's work in the report.
//
// WHY (2026-09-23), from an audit of the Report Writer:
//   - Generate rewrote every section, discarding edits and imported drafts, with
//     no question; a section whose generation failed became the text
//     "[Error generating …]" and the toast still said the draft was generated.
//   - Adapt Level asked the AI for JSON (it wanted prose), replaced the
//     professional section with the reply, and ran as soon as a level was picked
//     in a dropdown (arrow keys included). Nothing could be undone.
//   - The audit wrote its copy of the report back when it finished, so anything
//     changed meanwhile was lost; edits during a run were possible.
//   - Clear All scores, loading a demo or saved report, importing, deleting a
//     saved report, switching the report type, removing a section and turning
//     device storage off all acted without asking.
//   - New Report kept the previous case's family and staff names.
// Now every rewrite keeps the earlier text for Undo, destructive actions ask,
// one lock covers everything that rewrites sections, and the audit refuses to
// overwrite a report that changed while it ran.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
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
});

let mounted = null;
afterEach(async () => { if (mounted) { await React.act(async () => mounted.root.unmount()); mounted.host.remove(); mounted = null; } });
const act = (fn) => React.act(async () => { await fn(); });
const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const setValue = (el, value) => {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
};
const typeInto = (el, value) => act(() => { setValue(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
const choose = (el, value) => act(() => { setValue(el, value); el.dispatchEvent(new Event('change', { bubbles: true })); });
const wait = (ms = 10) => act(() => new Promise(r => setTimeout(r, ms)));

const SNAPSHOT = (sections = { Summary: 'The original summary, as the clinician wrote it.' }, extra = {}) => ({
  schemaVersion: 2, reportTitle: 'Safety test', manualStudentName: 'Student A',
  scoreEntries: [{ id: 's1', assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 88, scoreType: 'standard' }],
  factChunks: [{ id: 'c1', type: 'score', source: 'WISC-V', field: 'Full Scale IQ', value: 88, scoreType: 'standard', verified: true, immutable: true }],
  blueprint: [{ id: 'b1', name: 'Summary', notes: '', enabled: true }], reportGenPasses: 1, reportSections: sections, ...extra,
});

async function mount(callGemini) {
  localStorage.clear();
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const addToast = vi.fn();
  mounted = { host, root };
  await act(() => root.render(React.createElement(window.AlloModules.ReportWriter, {
    onClose() {}, callGemini, addToast, t: key => key,
    studentNickname: 'Student A', behaviorLensData: null, longitudinalData: null, dashboardData: [],
  })));
  const steps = () => Array.from(host.querySelectorAll('nav[aria-label="Report Writer steps"] button'));
  const button = (text) => Array.from(host.querySelectorAll('button')).find(b => b.textContent.trim() === text || b.textContent.includes(text));
  const ask = () => host.querySelector('[role="alertdialog"][aria-labelledby="rw-confirm-title"]');
  const answer = async (label) => click(Array.from(ask().querySelectorAll('button')).find(b => b.textContent === label));
  const importSnapshot = async (snapshot) => {
    await click(steps()[9]);
    await typeInto(host.querySelector('#rw-import-area'), JSON.stringify(snapshot));
    await click(button('Import Data'));
    if (ask()) await answer('Replace it');
  };
  const summary = () => {
    const block = Array.from(host.querySelectorAll('h4')).find(h4 => h4.textContent === 'Summary');
    return block ? block.closest('div.bg-slate-50').textContent : '';
  };
  const toasts = () => addToast.mock.calls.map(c => String(c[0]));
  return { host, steps, button, ask, answer, importSnapshot, summary, toasts };
}
const sectionPrompt = (p) => String(p).includes('You are writing the "Summary" section');

describe('every rewrite of a section can be undone', () => {
  it('an edit, then Undo', async () => {
    const ui = await mount(async () => '{"errors":[]}');
    await ui.importSnapshot(SNAPSHOT());
    await click(ui.steps()[7]);
    await click(ui.host.querySelector('button[aria-label="Edit section"]'));
    await typeInto(ui.host.querySelector('textarea[aria-label="Edit section text"]'), 'A careless rewrite.');
    await click(Array.from(ui.host.querySelectorAll('button')).find(b => b.textContent.trim() === '✅ Save'));
    expect(ui.summary()).toContain('A careless rewrite.');
    await click(ui.host.querySelector('button[aria-label="Undo the last change to Summary (edited)"]'));
    expect(ui.summary()).toContain('The original summary, as the clinician wrote it.');
    expect(ui.host.querySelector('button[aria-label^="Undo the last change to Summary"]')).toBeNull();
  }, 60000);

  it('Generate asks before rewriting a written report, and the old text can be restored', async () => {
    const calls = [];
    const ui = await mount(async (p) => { if (sectionPrompt(p)) { calls.push(p); return 'A freshly generated summary.\nUSED_CHUNKS: c1'; } return '{"errors":[]}'; });
    await ui.importSnapshot(SNAPSHOT());
    await click(ui.steps()[7]);
    await click(ui.host.querySelector('button[aria-label="Generate report"]'));
    expect(ui.ask().textContent).toMatch(/Generate the whole report again\?/);
    await ui.answer('Cancel');
    expect(calls).toHaveLength(0);
    await click(ui.host.querySelector('button[aria-label="Generate report"]'));
    await ui.answer('Generate again');
    for (let i = 0; i < 300 && ui.host.querySelector('button[aria-label="Generate report"]').getAttribute('aria-busy') === 'true'; i++) await wait();
    expect(ui.summary()).toContain('A freshly generated summary.');
    await click(ui.host.querySelector('button[aria-label="Undo the last change to Summary (report generated again)"]'));
    expect(ui.summary()).toContain('The original summary, as the clinician wrote it.');
  }, 60000);

  it('a section that fails to generate keeps its text, and the toast says so', async () => {
    const ui = await mount(async (p) => { if (sectionPrompt(p)) throw new Error('quota'); return '{"errors":[]}'; });
    await ui.importSnapshot(SNAPSHOT());
    await click(ui.steps()[7]);
    await click(ui.host.querySelector('button[aria-label="Generate report"]'));
    await ui.answer('Generate again');
    for (let i = 0; i < 300 && ui.host.querySelector('button[aria-label="Generate report"]').getAttribute('aria-busy') === 'true'; i++) await wait();
    expect(ui.summary()).toContain('The original summary, as the clinician wrote it.');
    expect(ui.host.textContent).not.toMatch(/Error generating/);
    expect(ui.toasts().join(' ')).toMatch(/1 section\(s\) could not be written: Summary/);
    expect(ui.toasts().join(' ')).not.toMatch(/Report draft generated/);
  }, 60000);

  it('Adapt Level: choosing a level does nothing until Adapt; it asks for prose; Undo restores', async () => {
    const calls = [];
    const ui = await mount(async (p, jsonMode) => { if (String(p).includes('Adapt the following report section')) { calls.push(jsonMode); return 'A plainer summary for families.'; } return '{"errors":[]}'; });
    await ui.importSnapshot(SNAPSHOT());
    await click(ui.steps()[7]);
    await choose(ui.host.querySelector('select[aria-label="Adapt grade level for Summary"]'), 'Parent-Friendly');
    expect(calls).toHaveLength(0);
    await click(ui.host.querySelector('button[aria-label="Adapt Summary"]'));
    for (let i = 0; i < 100 && calls.length && ui.summary().includes('original'); i++) await wait();
    expect(calls).toEqual([false]);
    expect(ui.summary()).toContain('A plainer summary for families.');
    await click(ui.host.querySelector('button[aria-label="Undo the last change to Summary (adapted)"]'));
    expect(ui.summary()).toContain('The original summary, as the clinician wrote it.');
  }, 60000);
});

describe('one change at a time', () => {
  it('while a section regenerates, nothing else can rewrite sections', async () => {
    let release;
    const ui = await mount((p) => (String(p).includes('You are writing the "Summary" section') ? new Promise(r => { release = r; }) : Promise.resolve('{"errors":[]}')));
    await ui.importSnapshot(SNAPSHOT());
    await click(ui.steps()[7]);
    await click(ui.host.querySelector('button[aria-label="Show regeneration options"]'));
    await click(ui.button('Regenerate'));
    expect(ui.host.querySelector('button[aria-label="Generate report"]').disabled).toBe(true);
    expect(ui.host.querySelector('button[aria-label="Edit section"]').disabled).toBe(true);
    expect(ui.host.querySelector('select[aria-label="Adapt grade level for Summary"]').disabled).toBe(true);
    await act(async () => { release('A regenerated summary.\nUSED_CHUNKS: c1'); });
    for (let i = 0; i < 100 && ui.host.querySelector('button[aria-label="Generate report"]').disabled; i++) await wait();
    expect(ui.host.querySelector('button[aria-label="Generate report"]').disabled).toBe(false);
  }, 60000);

  it('the audit does not overwrite a report that changed while it ran', async () => {
    let release;
    const ui = await mount((p) => (String(p).includes('You are a clinical accuracy auditor') && !release
      ? new Promise(r => { release = r; }) : Promise.resolve('{"results":[{"claim":"x","status":"verified","chunkId":"c1","explanation":"ok","confidence":"high"}]}')));
    await ui.importSnapshot(SNAPSHOT());
    await click(ui.steps()[8]);
    await click(ui.host.querySelector('button[aria-label="Run accuracy check"]'));
    for (let i = 0; i < 100 && !release; i++) await wait();
    // Meanwhile another report is opened.
    await ui.importSnapshot(SNAPSHOT({ Summary: 'A different report opened mid-audit.' }));
    await act(async () => { release('{"results":[{"claim":"x","status":"verified","chunkId":"c1","explanation":"ok","confidence":"high"}]}'); });
    for (let i = 0; i < 200 && !ui.toasts().some(m => /changed while the audit was running/.test(m)); i++) await wait();
    expect(ui.toasts().join(' ')).toMatch(/changed while the audit was running/);
    await click(ui.steps()[7]);
    expect(ui.summary()).toContain('A different report opened mid-audit.');
  }, 60000);
});

describe('destructive actions ask first', () => {
  it('Clear All scores', async () => {
    const ui = await mount(async () => '{}');
    await ui.importSnapshot(SNAPSHOT());
    await click(ui.steps()[3]);
    await click(ui.host.querySelector('button[aria-label="Clear All"]'));
    expect(ui.ask().textContent).toMatch(/Remove all scores\?/);
    await ui.answer('Cancel');
    expect(ui.host.querySelectorAll('button[aria-label^="Remove score entry:"]')).toHaveLength(1);
    await click(ui.host.querySelector('button[aria-label="Clear All"]'));
    await ui.answer('Remove all scores');
    expect(ui.host.querySelectorAll('button[aria-label^="Remove score entry:"]')).toHaveLength(0);
  }, 60000);

  it('a demo case over a report in progress, and turning device storage off', async () => {
    const ui = await mount(async () => '{}');
    await ui.importSnapshot(SNAPSHOT());
    await click(ui.steps()[0]);
    await click(ui.host.querySelector('button[aria-label^="Load demo case:"]'));
    expect(ui.ask().textContent).toMatch(/Replace the current report\?/);
    await ui.answer('Cancel');
    await click(ui.steps()[9]);
    await click(ui.host.querySelector('#rw-persist-device'));
    expect(ui.host.querySelector('#rw-persist-device').checked).toBe(true);
    await click(ui.host.querySelector('#rw-persist-device'));
    expect(ui.ask().textContent).toMatch(/Stop storing on this device\?/);
    await ui.answer('Cancel');
    expect(ui.host.querySelector('#rw-persist-device').checked).toBe(true);
  }, 60000);

  it('switching the report type or removing a section that has notes', async () => {
    const ui = await mount(async () => '{}');
    await ui.importSnapshot(SNAPSHOT({}, { blueprint: [{ id: 'b1', name: 'Summary', notes: 'Stress the reading plan.', enabled: true }] }));
    await click(ui.steps()[6]);
    await choose(ui.host.querySelector('select[aria-label="Report type"]'), Array.from(ui.host.querySelector('select[aria-label="Report type"]').options).map(o => o.value).find(v => v !== 'Psychoeducational'));
    expect(ui.ask().textContent).toMatch(/Switch to the .* blueprint\?/);
    await ui.answer('Cancel');
    expect(ui.host.querySelectorAll('button[aria-label^="Remove report section:"]')).toHaveLength(1);
    await click(ui.host.querySelector('button[aria-label^="Remove report section:"]'));
    expect(ui.ask().textContent).toMatch(/Remove "Summary"\?/);
  }, 60000);

  it('opening another report over unsaved work, and deleting a saved report', async () => {
    const ui = await mount(async () => '{}');
    await ui.importSnapshot(SNAPSHOT());
    await click(ui.steps()[9]);
    await typeInto(ui.host.querySelector('#rw-import-area'), JSON.stringify(SNAPSHOT({ Summary: 'Another report.' })));
    await click(ui.button('Import Data'));
    expect(ui.ask().textContent).toMatch(/Replace the current report\?/);
    await ui.answer('Cancel');
    await click(ui.steps()[7]);
    expect(ui.summary()).toContain('The original summary');
    await click(ui.steps()[9]);
    await click(ui.button('Save Report'));
    await click(ui.host.querySelector('button[aria-label^="Delete saved report:"]'));
    expect(ui.ask().textContent).toMatch(/Delete ".*"\?/);
    await ui.answer('Cancel');
    expect(ui.host.querySelectorAll('button[aria-label^="Delete saved report:"]')).toHaveLength(1);
  }, 60000);

  it('New Report forgets the previous case\'s family and staff names', async () => {
    const ui = await mount(async () => '{}');
    // The people list shows once there is background text to redact.
    await ui.importSnapshot(SNAPSHOT({}, { reportPeople: [{ name: 'Maria Lopez', role: 'Mother' }], bgSections: { referralReason: 'Maria Lopez reports reading concerns.' } }));
    await click(ui.steps()[1]);
    expect(Array.from(ui.host.querySelectorAll('input')).some(i => i.value === 'Maria Lopez')).toBe(true);
    await click(ui.steps()[9]);
    await click(ui.host.querySelector('button[aria-label="Start a new report"]'));
    await ui.answer('Start new report');
    await click(ui.steps()[1]);
    // New background text, so the people list is on screen again.
    await typeInto(ui.host.querySelector('textarea[aria-label="Reason for Referral"]'), 'Concerns about reading.');
    expect(ui.host.querySelector('[data-redaction-disclosure]')).toBeTruthy();
    expect(Array.from(ui.host.querySelectorAll('input')).some(i => i.value === 'Maria Lopez')).toBe(false);
  }, 60000);
});
