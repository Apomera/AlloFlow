// Generation, the accuracy audit and translation can be stopped.
//
// WHY (2026-09-23): these runs make one AI request per section (per pass, per
// audit half) and could take minutes with no way to stop them short of
// closing the panel. A failed request inside the audit ended the whole audit
// and threw away every part already checked, and the progress bar under
// Generate sat at 60% whatever the progress.

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
const until = async (fn) => { for (let i = 0; i < 300 && !fn(); i++) await wait(); expect(fn()).toBeTruthy(); };
const SNAP = (sections) => ({
  schemaVersion: 2, reportTitle: 'Stop', manualStudentName: 'Student A',
  scoreEntries: [{ id: 's1', assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 97, scoreType: 'standard' }],
  factChunks: [{ id: 'c1', type: 'score', source: 'WISC-V', field: 'Full Scale IQ', value: 97, scoreType: 'standard', verified: true, immutable: true }],
  blueprint: ['Alpha', 'Beta', 'Gamma'].map((name, i) => ({ id: 'b' + i, name, notes: '', enabled: true })),
  reportGenPasses: 1, reportSections: sections,
});
// A request that only ends when its run is stopped, the way the host's fetch
// does: it rejects with AbortError when the signal (6th argument) aborts.
const hangUntilAborted = (signal) => new Promise((_, reject) => {
  if (!signal) return;
  signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; reject(e); });
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
  const button = (text) => Array.from(host.querySelectorAll('button')).find(b => b.textContent.trim() === text);
  const confirmIfAsked = async (label) => { const b = button(label); if (b) await click(b); };
  return { host, steps, button, confirmIfAsked, toasts: () => addToast.mock.calls.map(c => String(c[0])) };
}

describe('stopping generation', () => {
  it('keeps the sections already written, leaves the rest as they were, and says which were not checked', async () => {
    const signals = [];
    let betaAsked = false;
    const ui = await mount(async (p, json, search, temp, query, signal) => {
      const prompt = String(p);
      signals.push(signal);
      if (prompt.includes('You are writing the "Alpha" section')) return 'New alpha text about the student.\nUSED_CHUNKS: c1';
      if (prompt.includes('You are writing the "Beta" section')) { betaAsked = true; return hangUntilAborted(signal); }
      if (prompt.includes('You are writing')) return 'Should not be reached.\nUSED_CHUNKS: c1';
      return '{"errors":[]}';
    }, SNAP({ Beta: 'Old beta text.', Gamma: 'Old gamma text.' }));
    await click(ui.steps()[7]);
    await click(ui.host.querySelector('button[aria-label="Generate report"]'));
    await ui.confirmIfAsked('Generate again');
    await until(() => ui.button('Stop generating'));
    await until(() => betaAsked);
    await wait();
    // Seven steps for three sections (write, check, then one consistency
    // pass): Alpha is written and Beta is being written.
    expect(ui.host.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('14');
    expect(signals[0]).toBeInstanceOf(AbortSignal);
    await click(ui.button('Stop generating'));
    await until(() => ui.toasts().some(m => /Generation stopped/.test(m)));
    expect(ui.toasts().join(' ')).toMatch(/Generation stopped\. 1 section\(s\) were written \(Alpha\); the others kept their earlier text\./);
    const text = ui.host.textContent;
    expect(text).toContain('New alpha text about the student.');
    expect(text).toContain('Old beta text.');
    expect(text).toContain('Old gamma text.');
    expect(text).not.toContain('Should not be reached.');
    expect(text).toMatch(/Score citations were NOT automatically checked in: Alpha\./);
    expect(ui.button('Stop generating')).toBeFalsy();
    expect(ui.host.querySelector('button[aria-label="Generate report"]').getAttribute('aria-busy')).not.toBe('true');
  }, 90000);

  it('a provider that ignores the signal is stopped when its answer arrives', async () => {
    let release;
    const ui = await mount(async (p) => {
      const prompt = String(p);
      if (prompt.includes('You are writing the "Alpha" section')) return new Promise(r => { release = () => r('Late alpha text.\nUSED_CHUNKS: c1'); });
      if (prompt.includes('You are writing')) return 'Should not be reached.\nUSED_CHUNKS: c1';
      return '{"errors":[]}';
    }, SNAP({}));
    await click(ui.steps()[7]);
    await click(ui.host.querySelector('button[aria-label="Generate report"]'));
    await until(() => typeof release === 'function');
    await click(ui.button('Stop generating'));
    expect(ui.button('Stopping...')).toBeTruthy();
    await act(() => release());
    await until(() => ui.toasts().some(m => /Generation stopped/.test(m)));
    expect(ui.toasts().join(' ')).toMatch(/Generation stopped before any section was written\. The report was not changed\./);
    expect(ui.host.textContent).not.toContain('Late alpha text.');
  }, 90000);
});

describe('the accuracy audit', () => {
  const REPORT = { Alpha: 'The Full Scale IQ was 97.', Beta: 'The student reads well.' };
  const ok = (claim) => `{"results":[{"claim":"${claim}","status":"verified","chunkId":"c1","explanation":"ok"}]}`;

  it('can be stopped, and leaves the report as it was', async () => {
    const ui = await mount(async (p, json, search, temp, query, signal) => {
      if (String(p).includes('You are a clinical accuracy auditor')) return hangUntilAborted(signal);
      return '{"errors":[]}';
    }, SNAP(REPORT));
    await click(ui.steps()[8]);
    await click(ui.host.querySelector('button[aria-label="Run accuracy check"]'));
    await until(() => ui.button('Stop the accuracy check'));
    expect(ui.host.textContent).toMatch(/Auditing Alpha \(1\/2\)/);
    await click(ui.button('Stop the accuracy check'));
    await until(() => ui.toasts().some(m => /accuracy check was stopped/.test(m)));
    expect(ui.toasts().join(' ')).not.toMatch(/toasts\.accuracy_check_failed/);
    await click(ui.steps()[7]);
    expect(ui.host.textContent).toContain('The Full Scale IQ was 97.');
    expect(ui.host.textContent).toContain('The student reads well.');
  }, 90000);

  it('a failed request leaves that part inconclusive and keeps the findings for the rest', async () => {
    const ui = await mount(async (p) => {
      const prompt = String(p);
      if (prompt.includes('You are a clinical accuracy auditor')) {
        if (prompt.includes('REPORT SECTION: Beta') && prompt.includes('Pass A')) throw new Error('network');
        return prompt.includes('REPORT SECTION: Alpha') ? ok('The Full Scale IQ was 97.') : ok('The student reads well.');
      }
      return '{"errors":[]}';
    }, SNAP(REPORT));
    await click(ui.steps()[8]);
    await click(ui.host.querySelector('button[aria-label="Run accuracy check"]'));
    await until(() => ui.toasts().some(m => /Accuracy audit inconclusive/.test(m)));
    expect(ui.toasts().join(' ')).toMatch(/Accuracy audit inconclusive: 1 of 2 part\(s\) of the report could not be checked because the AI request failed\./);
    expect(ui.toasts().join(' ')).not.toMatch(/toasts\.accuracy_check_failed/);
    expect(ui.host.textContent).toContain('The Full Scale IQ was 97.');
  }, 90000);

  it('a failed correction does not end the audit', async () => {
    const ui = await mount(async (p) => {
      const prompt = String(p);
      if (prompt.includes('You are a clinical accuracy auditor')) {
        return prompt.includes('REPORT SECTION: Alpha')
          ? '{"results":[{"claim":"The Full Scale IQ was 97.","status":"contradicts","chunkId":"c1","explanation":"Wrong."}]}'
          : ok('The student reads well.');
      }
      if (prompt.includes('You are writing the "Alpha" section')) throw new Error('network');
      return '{"errors":[]}';
    }, SNAP(REPORT));
    await click(ui.steps()[8]);
    await click(ui.host.querySelector('button[aria-label="Run accuracy check"]'));
    await until(() => ui.toasts().some(m => /Accuracy audit completed/.test(m)));
    expect(ui.toasts().join(' ')).toMatch(/Accuracy audit completed with 1 blocking issue\(s\)/);
    expect(ui.toasts().join(' ')).not.toMatch(/toasts\.accuracy_check_failed/);
  }, 90000);
});

describe('translation', () => {
  it('can be stopped', async () => {
    const ui = await mount(async (p, json, search, temp, query, signal) => {
      if (String(p).startsWith('Translate the following')) return hangUntilAborted(signal);
      return '{"errors":[]}';
    }, SNAP({ Alpha: 'The Full Scale IQ was 97.' }));
    await click(ui.steps()[9]);
    await click(ui.host.querySelector('button[aria-label="Translate report"]'));
    await until(() => ui.button('Stop translating'));
    await click(ui.button('Stop translating'));
    await until(() => ui.toasts().some(m => /Translation stopped/.test(m)));
    expect(ui.toasts().join(' ')).not.toMatch(/toasts\.translation_failed/);
    expect(ui.button('Stop translating')).toBeFalsy();
  }, 90000);
});
