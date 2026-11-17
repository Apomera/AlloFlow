import { beforeEach as beforeEachProtectedWorkspace } from 'vitest';
import { installReportWriterWorkspaceFixture } from './helpers/report_writer_workspace_fixture.js';
beforeEachProtectedWorkspace(() => installReportWriterWorkspaceFixture(React));

// A clinician can set aside a blocking finding from the non-AI checks, with a reason.
//
// WHY (2026-11-16): a blocking audit finding could only be cleared by rewording
// the report. The non-AI checks (dates, score labels) are pattern matches that
// give the same answer on every run, so when one is wrong for a given sentence
// (it can read "ages 8-12" as a date) formal export was locked for good unless
// correct text was changed. The clinician can now set such a finding aside by
// typing why. The reason stays on the finding and goes into the audit summary.
// A contradiction found by the AI passes cannot be set aside.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { actWithSensitivePromptReview } from './helpers/sensitive_prompt_review_user.js';

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
afterEach(async () => {
  if (mounted) { await React.act(async () => mounted.root.unmount()); mounted.host.remove(); mounted = null; }
  if (window.AlloModules) delete window.AlloModules.PyodideRuntime;
});
const act = (fn) => actWithSensitivePromptReview(React, fn);
const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const wait = () => act(() => new Promise(r => setTimeout(r, 10)));
const until = async (fn) => { for (let i = 0; i < 300 && !fn(); i++) await wait(); expect(fn()).toBeTruthy(); };
const type = (el, value) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});

// The interval is wrong on purpose: 9/2 to 9/20 is 18 days, not 4 weeks.
const WRONG_INTERVAL = 'Testing began on 9/2/2026 and ended 4 weeks later on 9/20/2026.';
const ok = (claim) => `{"results":[{"claim":"${claim}","status":"verified","chunkId":"c1","explanation":"ok"}]}`;

async function mount(sections, callGemini) {
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
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(area, JSON.stringify({
      schemaVersion: 2, reportTitle: 'Set aside', manualStudentName: 'Student A', scoreEntries: [],
      factChunks: [{ id: 'c1', type: 'background', source: 'Referral', field: 'Reason', value: 'Referred in March.', verified: true, immutable: true }],
      blueprint: Object.keys(sections).map((name, i) => ({ id: 'b' + i, name, notes: '', enabled: true })),
      reportGenPasses: 1, reportSections: sections,
    }));
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Import Data')));
  const toasts = () => addToast.mock.calls.map(c => String(c[0]));
  const audit = async (label = 'Run accuracy check') => {
    const before = toasts().length;
    await click(steps()[8]);
    await click(host.querySelector(`button[aria-label="${label}"]`));
    await until(() => toasts().slice(before).some(m => /^Accuracy audit/.test(m)));
    return toasts().filter(m => /^Accuracy audit/.test(m)).pop();
  };
  const attest = () => host.querySelector('input[aria-describedby="rw-attestation-help"]');
  return { host, steps, toasts, audit, attest };
}

const allVerified = async (p) => (String(p).includes('You are a clinical accuracy auditor') ? ok('a claim') : '{"errors":[]}');

describe('setting aside a blocking finding', () => {
  it('a non-AI finding can be set aside with a typed reason, which unlocks the attestation and is kept in the audit summary', async () => {
    const ui = await mount({ Alpha: WRONG_INTERVAL, Beta: 'The student reads well.' }, allVerified);
    expect(await ui.audit()).toMatch(/^Accuracy audit completed with 1 blocking issue\(s\)/);

    // Locked: the finding blocks export.
    await click(ui.steps()[9]);
    expect(ui.host.textContent).toContain('1 blocking finding(s) remain');
    await click(ui.host.querySelector('input[data-rw-second-check-ack]'));
    expect(ui.attest().disabled).toBe(true);

    // Set it aside. A reason is required.
    await click(ui.steps()[8]);
    await click(ui.host.querySelector('button[data-rw-set-aside="open"]'));
    const confirm = () => ui.host.querySelector('button[data-rw-set-aside="confirm"]');
    expect(confirm().disabled).toBe(true);
    await type(ui.host.querySelector('textarea[data-rw-set-aside-reason]'), 'too short');
    expect(confirm().disabled).toBe(true);
    const reason = 'The second date is the report date, not the end of testing.';
    await type(ui.host.querySelector('textarea[data-rw-set-aside-reason]'), reason);
    expect(confirm().disabled).toBe(false);
    await click(confirm());
    expect(ui.host.querySelector('[data-rw-set-aside-note]').textContent).toContain(reason);

    // Unlocked, and the page says a finding was set aside, not that there were none.
    await click(ui.steps()[9]);
    expect(ui.host.textContent).not.toContain('blocking finding(s) remain');
    expect(ui.host.querySelector('[data-rw-set-aside-count]').textContent).toMatch(/1 non-AI finding\(s\) set aside/);
    // The "second check not run" box was ticked above and stays ticked.
    expect(ui.host.querySelector('input[data-rw-second-check-ack]').checked).toBe(true);
    expect(ui.attest().disabled).toBe(false);

    // The reason travels with the audit summary a supervisor is sent.
    const copied = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { copied.push(String(text)); } } });
    await click(ui.steps()[8]);
    await click(ui.host.querySelector('button[aria-label="Copy audit summary"]'));
    await until(() => copied.length > 0);
    expect(copied[0]).toContain('SET ASIDE BY CLINICIAN: ' + reason);
    expect(copied[0]).toMatch(/Set aside by clinician: 1/);

    // Undo puts the lock back.
    await click(ui.host.querySelector('button[data-rw-set-aside="undo"]'));
    expect(ui.host.querySelector('[data-rw-set-aside-note]')).toBeNull();
    await click(ui.steps()[9]);
    expect(ui.host.textContent).toContain('1 blocking finding(s) remain');
  }, 90000);

  it('running the audit again clears it: the finding blocks again until set aside again', async () => {
    const ui = await mount({ Alpha: WRONG_INTERVAL, Beta: 'The student reads well.' }, allVerified);
    await ui.audit();
    await click(ui.host.querySelector('button[data-rw-set-aside="open"]'));
    await type(ui.host.querySelector('textarea[data-rw-set-aside-reason]'), 'The second date is the report date.');
    await click(ui.host.querySelector('button[data-rw-set-aside="confirm"]'));
    expect(ui.host.querySelector('[data-rw-set-aside-note]')).not.toBeNull();

    expect(await ui.audit('Re-check accuracy')).toMatch(/^Accuracy audit completed with 1 blocking issue\(s\)/);
    expect(ui.host.querySelector('[data-rw-set-aside-note]')).toBeNull();
    expect(ui.host.querySelector('button[data-rw-set-aside="open"]')).not.toBeNull();
  }, 90000);

  it('a contradiction found by the AI passes cannot be set aside', async () => {
    const ui = await mount({ Alpha: 'The Full Scale IQ was 97.', Beta: 'The student reads well.' }, async (p) => {
      const prompt = String(p);
      if (prompt.includes('You are a clinical accuracy auditor')) {
        return prompt.includes('REPORT SECTION: Alpha')
          ? '{"results":[{"claim":"The Full Scale IQ was 97.","status":"contradicts","chunkId":"c1","explanation":"Wrong."}]}'
          : ok('The student reads well.');
      }
      if (prompt.includes('You are writing the "Alpha" section')) throw new Error('network');
      return '{"errors":[]}';
    });
    expect(await ui.audit()).toMatch(/^Accuracy audit completed with 1 blocking issue\(s\)/);
    expect(ui.host.querySelector('button[data-rw-set-aside="open"]')).toBeNull();
    await click(ui.steps()[9]);
    expect(ui.host.textContent).toContain('1 blocking finding(s) remain');
  }, 90000);
});
