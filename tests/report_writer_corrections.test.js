// Automated corrections edit the section's text; they do not rewrite it blind.
//
// WHY (2026-09-23): the accuracy audit and the generation-time score check
// "fixed" a flagged claim by calling the section prompt again with a list of
// corrections and the words "keep the rest of the section intact", without
// ever showing the model the section. The model wrote the section from
// scratch, so one flagged claim replaced a clinician's edited text, and nothing
// said which sections the audit had rewritten. A failed score-check call also
// escaped the helper and skipped the "not verified" banner entirely.

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
const wait = () => act(() => new Promise(r => setTimeout(r, 10)));
const EDITED = "The clinician's careful summary of reading. The Full Scale IQ was 97.";
const SNAP = (sections = {}) => ({
  schemaVersion: 2, reportTitle: 'Corrections', manualStudentName: 'Student A',
  scoreEntries: [{ id: 's1', assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 88, scoreType: 'standard' }],
  factChunks: [{ id: 'c1', type: 'score', source: 'WISC-V', field: 'Full Scale IQ', value: 88, scoreType: 'standard', verified: true, immutable: true }],
  blueprint: [{ id: 'b1', name: 'Summary', notes: '', enabled: true }], reportGenPasses: 1, reportSections: sections,
});
async function mount(callGemini, snapshot) {
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
  await click(steps()[9]);
  await act(() => {
    const area = host.querySelector('#rw-import-area');
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(area, JSON.stringify(snapshot));
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Import Data')));
  return { host, steps, toasts: () => addToast.mock.calls.map(c => String(c[0])) };
}

describe('the accuracy audit', () => {
  it('corrects the section\'s own text, says which sections it changed, and can be undone', async () => {
    let fixed = false;
    const fixPrompts = [];
    const ui = await mount(async (p) => {
      const prompt = String(p);
      if (prompt.includes('You are a clinical accuracy auditor')) {
        return fixed
          ? '{"results":[{"claim":"The Full Scale IQ was 88.","status":"verified","chunkId":"c1","explanation":"ok","confidence":"high"}]}'
          : '{"results":[{"claim":"The Full Scale IQ was 97.","status":"contradicts","chunkId":"c1","explanation":"The data shows 88.","confidence":"needs-review"}]}';
      }
      if (prompt.includes('You are writing the "Summary" section')) {
        fixPrompts.push(prompt);
        fixed = true;
        return "The clinician's careful summary of reading. The Full Scale IQ was 88.\nUSED_CHUNKS: c1";
      }
      return '{"errors":[]}';
    }, SNAP({ Summary: EDITED }));
    await click(ui.steps()[8]);
    await click(ui.host.querySelector('button[aria-label="Run accuracy check"]'));
    for (let i = 0; i < 300 && !ui.toasts().some(m => /audit corrected/.test(m)); i++) await wait();
    expect(fixPrompts).toHaveLength(1);
    expect(fixPrompts[0]).toContain('CURRENT TEXT OF THIS SECTION (revise it; do not write a new section)');
    expect(fixPrompts[0]).toContain(EDITED);
    expect(fixPrompts[0]).toContain('Make the smallest changes that fix these issues');
    expect(ui.toasts().join(' ')).toMatch(/The audit corrected Summary\./);
    await click(ui.steps()[7]);
    expect(ui.host.textContent).toContain('The Full Scale IQ was 88.');
    await click(ui.host.querySelector('button[aria-label="Undo the last change to Summary (corrected by the audit)"]'));
    expect(ui.host.textContent).toContain(EDITED);
  }, 90000);
});

describe('generation', () => {
  it('a score correction during generation is an edit of the draft just written', async () => {
    const prompts = [];
    let drafted = false;
    const ui = await mount(async (p) => {
      const prompt = String(p);
      if (prompt.includes('You are writing the "Summary" section')) {
        prompts.push(prompt);
        if (!drafted) { drafted = true; return 'A first draft of the summary. The Full Scale IQ was 97.\nUSED_CHUNKS: c1'; }
        return 'A first draft of the summary. The Full Scale IQ was 88.\nUSED_CHUNKS: c1';
      }
      if (prompt.includes('You are a clinical data verification specialist')) {
        return prompts.length === 1 ? '{"errors":[{"claim":"The Full Scale IQ was 97","actual":"88","severity":"critical"}]}' : '{"errors":[]}';
      }
      return '{"errors":[]}';
    }, SNAP());
    await click(ui.steps()[7]);
    await click(ui.host.querySelector('button[aria-label="Generate report"]'));
    for (let i = 0; i < 300 && ui.host.querySelector('button[aria-label="Generate report"]').getAttribute('aria-busy') === 'true'; i++) await wait();
    expect(prompts.length).toBeGreaterThan(1);
    expect(prompts[1]).toContain('CURRENT TEXT OF THIS SECTION');
    expect(prompts[1]).toContain('A first draft of the summary. The Full Scale IQ was 97.');
  }, 90000);

  it('a score check that fails is reported as not checked', async () => {
    const ui = await mount(async (p) => {
      const prompt = String(p);
      if (prompt.includes('You are writing the "Summary" section')) return 'The Full Scale IQ was 88.\nUSED_CHUNKS: c1';
      if (prompt.includes('You are a clinical data verification specialist')) throw new Error('network');
      return '{"errors":[]}';
    }, SNAP());
    await click(ui.steps()[7]);
    await click(ui.host.querySelector('button[aria-label="Generate report"]'));
    for (let i = 0; i < 300 && ui.host.querySelector('button[aria-label="Generate report"]').getAttribute('aria-busy') === 'true'; i++) await wait();
    expect(ui.host.textContent).toMatch(/Score citations were NOT automatically checked in: Summary/);
  }, 90000);
});
