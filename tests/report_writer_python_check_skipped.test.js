import { beforeEach as beforeEachProtectedWorkspace } from 'vitest';
import { installReportWriterWorkspaceFixture } from './helpers/report_writer_workspace_fixture.js';
beforeEachProtectedWorkspace(() => installReportWriterWorkspaceFixture(React));

// The accuracy audit must not pass off a check that never ran.
//
// WHY (2026-11-16): the audit ends with a second, non-AI check (Python, loaded
// on demand). On the desktop app that runtime refuses to load, and in the
// browser it was only requested by "Generate", so a report that was imported
// or reopened never had it. Either way the failure was swallowed with a
// console warning and the audit announced "completed ... no blocking
// contradictions remain" exactly as if both halves had run.

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
  delete window._isDesktopBundledApp;
  delete window.__alloLazyPyodide;
  if (window.AlloModules) delete window.AlloModules.PyodideRuntime;
});
const act = (fn) => actWithSensitivePromptReview(React, fn);
const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const wait = () => act(() => new Promise(r => setTimeout(r, 10)));
const until = async (fn) => { for (let i = 0; i < 300 && !fn(); i++) await wait(); expect(fn()).toBeTruthy(); };

const REPORT = { Alpha: 'The student was referred in March.', Beta: 'The student reads well.' };
// No score rows, so the separate inline score verifier has nothing to do and
// the Export step shows the audit's own verdict.
const SNAPSHOT = {
  schemaVersion: 2, reportTitle: 'Skipped check', manualStudentName: 'Student A',
  scoreEntries: [],
  factChunks: [{ id: 'c1', type: 'background', source: 'Referral', field: 'Reason', value: 'Referred in March.', verified: true, immutable: true }],
  blueprint: ['Alpha', 'Beta'].map((name, i) => ({ id: 'b' + i, name, notes: '', enabled: true })),
  reportGenPasses: 1, reportSections: REPORT,
};
const ok = (claim) => `{"results":[{"claim":"${claim}","status":"verified","chunkId":"c1","explanation":"ok"}]}`;
const everyClaimVerified = async (p) => {
  const prompt = String(p);
  if (prompt.includes('You are a clinical accuracy auditor')) {
    return prompt.includes('REPORT SECTION: Alpha') ? ok(REPORT.Alpha) : ok(REPORT.Beta);
  }
  return '{"errors":[]}';
};

async function mount(sections = REPORT) {
  localStorage.clear();
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const addToast = vi.fn();
  mounted = { host, root };
  await act(() => root.render(React.createElement(window.AlloModules.ReportWriter, {
    onClose() {}, callGemini: everyClaimVerified, addToast, t: key => key,
    studentNickname: 'Student A', behaviorLensData: null, longitudinalData: null, dashboardData: [],
  })));
  const steps = () => Array.from(host.querySelectorAll('nav[aria-label="Report Writer steps"] button'));
  await click(steps()[9]);
  await act(() => {
    const area = host.querySelector('#rw-import-area');
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(area, JSON.stringify({ ...SNAPSHOT, reportSections: sections }));
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Import Data')));
  const toasts = () => addToast.mock.calls.map(c => String(c[0]));
  const audit = async () => {
    await click(steps()[8]);
    await click(host.querySelector('button[aria-label="Run accuracy check"]'));
    await until(() => toasts().some(m => /^Accuracy audit/.test(m)));
    return toasts().filter(m => /^Accuracy audit/.test(m)).pop();
  };
  return { host, steps, toasts, audit };
}

const SAYS_NOT_RUN = /non-AI check did not run/;
const PLAIN_PASS = /^Accuracy audit completed across 2 full-report unit\(s\); no blocking contradictions remain\.$/;

describe('the non-AI check at the end of the accuracy audit', () => {
  it('on the desktop app, where the real runtime refuses to load, the audit says the check did not run', async () => {
    window._isDesktopBundledApp = true;
    loadAlloModule('pyodide_runtime_module.js');
    // The shipped runtime really does refuse here; this is not a stand-in.
    await expect(window.AlloModules.PyodideRuntime.runAudit({})).rejects.toThrow(/disabled in offline or desktop mode/);

    const ui = await mount();
    const verdict = await ui.audit();
    expect(verdict).not.toMatch(PLAIN_PASS);
    expect(verdict).toMatch(SAYS_NOT_RUN);
    // It stays on screen after the toast has gone, on the dashboard ...
    expect(ui.host.querySelector('[data-rw-python-check="skipped"]')?.textContent).toMatch(SAYS_NOT_RUN);
    // ... and beside the verdict the clinician attests against.
    await click(ui.steps()[9]);
    expect(ui.host.textContent).not.toContain('Accuracy audit passed. Complete the clinician attestation');
    expect(ui.host.querySelector('[data-rw-python-check="skipped"]')?.textContent).toMatch(SAYS_NOT_RUN);
    // The clinician cannot attest until they tick that they have seen it.
    const attest = () => ui.host.querySelector('input[aria-describedby="rw-attestation-help"]');
    expect(attest().disabled).toBe(true);
    await click(ui.host.querySelector('input[data-rw-second-check-ack]'));
    expect(attest().disabled).toBe(false);
  }, 90000);

  it('the export lock itself asks for that tick', () => {
    const gate = window.AlloReportWriterTesting.evaluateExportGate;
    const ready = { hasSections: true, auditStatus: 'passed', auditIsCurrent: true, psycheckIsCurrent: true, clinicianAttested: true };
    expect(gate(ready)).toMatchObject({ ready: true, canAttest: true });
    expect(gate({ ...ready, secondCheckSkipped: true })).toMatchObject({ ready: false, canAttest: false, reasons: ['second-check-unacknowledged'] });
    expect(gate({ ...ready, secondCheckSkipped: true, secondCheckSkipAcknowledged: true })).toMatchObject({ ready: true, canAttest: true });
  });

  it('without the Python check, the app itself still catches an interval that does not match its dates', async () => {
    const ui = await mount({ Alpha: 'Testing began on 9/2/2026 and ended 4 weeks later on 9/20/2026.', Beta: REPORT.Beta });
    const verdict = await ui.audit();
    expect(verdict).toMatch(/^Accuracy audit completed with 1 blocking issue\(s\)/);
    expect(verdict).toMatch(/date and citation checks were run in the app/);
    expect(ui.host.textContent).toContain("Stated as '4 weeks' (28 days) but actual span is 18 days.");
    expect(ui.host.textContent).toContain('In-app check');
  }, 90000);

  it('in the browser, a report that was imported asks for the runtime itself and uses it', async () => {
    const runAudit = vi.fn(async () => []);
    // The host's on-demand loader; the runtime registers a moment later.
    window.__alloLazyPyodide = vi.fn(() => { setTimeout(() => { window.AlloModules.PyodideRuntime = { runAudit }; }, 60); });
    const ui = await mount();
    const verdict = await ui.audit();
    expect(window.__alloLazyPyodide).toHaveBeenCalled();
    expect(runAudit).toHaveBeenCalledTimes(1);
    // The check compares the report with the facts as text; it was sent none.
    expect(runAudit.mock.calls[0][0].factChunks[0].text).toBe('Referral Reason Referred in March.');
    expect(verdict).toMatch(PLAIN_PASS);
    expect(ui.host.querySelector('[data-rw-python-check="skipped"]')).toBeNull();
    await click(ui.steps()[9]);
    expect(ui.host.textContent).toContain('Accuracy audit passed. Complete the clinician attestation');
  }, 90000);

  it('says so when the runtime is not there at all', async () => {
    const ui = await mount();
    const verdict = await ui.audit();
    expect(verdict).not.toMatch(PLAIN_PASS);
    expect(verdict).toMatch(SAYS_NOT_RUN);
    expect(ui.host.querySelector('[data-rw-python-check="skipped"]')).not.toBeNull();
  }, 90000);

  it('a finding from the check still blocks, and the summary a supervisor is sent names a skipped check', async () => {
    window.AlloModules.PyodideRuntime = { runAudit: async () => [{ claim: 'SS 88 (Average)', status: 'discrepancy', severity: 'high', finding: 'SS 88 is Low Average.', section: 'Alpha' }] };
    let ui = await mount();
    expect(await ui.audit()).toMatch(/^Accuracy audit completed with 1 blocking issue\(s\)/);
    expect(ui.host.querySelector('[data-rw-python-check="skipped"]')).toBeNull();
    await React.act(async () => mounted.root.unmount()); mounted.host.remove(); mounted = null;

    delete window.AlloModules.PyodideRuntime;
    const copied = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { copied.push(String(text)); } } });
    ui = await mount();
    await ui.audit();
    await click(ui.host.querySelector('button[aria-label="Copy audit summary"]'));
    await until(() => copied.length > 0 || ui.toasts().some(m => /summary/i.test(m)));
    expect(copied.join('\n')).toMatch(/Non-AI \(Python\) checks: NOT RUN/);
  }, 90000);
});
