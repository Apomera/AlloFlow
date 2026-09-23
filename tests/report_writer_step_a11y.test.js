// Report Writer steps and item buttons for keyboard and screen reader users.
//
// WHY (2026-09-23): a step that was not available yet was a disabled button,
// so it could not be focused and its reason lived only in a hover title.
// Moving to a step left focus on the step bar. Remove, move, load and delete
// buttons were all named the same ("Remove score entry" on every row), the
// observation sources did not say which one was selected, and the psycheck
// discrepancy import was a label around a hidden input that the keyboard
// could not reach.

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
afterEach(async () => { if (mounted) { await React.act(async () => mounted.root.unmount()); mounted.host.remove(); mounted = null; } vi.restoreAllMocks(); });
const act = (fn) => React.act(async () => { await fn(); });
const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const wait = (ms = 10) => act(() => new Promise(r => setTimeout(r, ms)));
const SNAP = {
  schemaVersion: 2, reportTitle: 'Steps', manualStudentName: 'Student A',
  scoreEntries: [{ id: 's1', assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 97, scoreType: 'standard' }],
  factChunks: [{ id: 'c1', type: 'score', source: 'WISC-V', field: 'Full Scale IQ', value: 97, scoreType: 'standard', verified: true, immutable: true }],
  clinicalObs: { parentInterview: { text: 'Sleeps well.', source: 'Parent Interview' } },
  hypotheses: ['No Diagnosis / Does Not Qualify', 'Specific Learning Disability'],
  blueprint: [{ id: 'b1', name: 'Background', notes: '', enabled: true }, { id: 'b2', name: 'Summary', notes: '', enabled: true }],
  reportGenPasses: 1, reportSections: { Summary: 'The Full Scale IQ was 97.' },
};
async function mount(snapshot) {
  localStorage.clear();
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  mounted = { host, root };
  await act(() => root.render(React.createElement(window.AlloModules.ReportWriter, {
    onClose() {}, callGemini: async () => '{}', addToast() {}, t: key => key,
    studentNickname: 'Student A', behaviorLensData: null, longitudinalData: null, dashboardData: [],
  })));
  const steps = () => Array.from(host.querySelectorAll('nav[aria-label="Report Writer steps"] button'));
  if (snapshot) {
    await click(steps()[9]);
    await act(() => {
      const area = host.querySelector('#rw-import-area');
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(area, JSON.stringify(snapshot));
      area.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Import Data')));
  }
  const byLabel = (label) => host.querySelector(`button[aria-label="${label}"]`);
  return { host, steps, byLabel };
}

describe('the step bar', () => {
  it('a step that is not available yet can be focused and says what it needs', async () => {
    const ui = await mount(null);
    const [, , , , five, six, , , nine] = ui.steps();
    for (const b of [five, six, nine]) {
      expect(b.disabled).toBe(false);
      expect(b.getAttribute('aria-disabled')).toBe('true');
    }
    expect(five.getAttribute('aria-label')).toBe('Step 5: Fact Chunk Review. Not available yet: Add scores, background or observations first.');
    expect(six.getAttribute('aria-label')).toMatch(/Not available yet: Verify at least one fact in Fact Review first\.$/);
    expect(nine.getAttribute('aria-label')).toMatch(/Not available yet: Generate the report first\.$/);
    expect(ui.steps()[0].getAttribute('aria-disabled')).toBeNull();

    await click(six);
    await wait(60);
    expect(ui.steps()[0].getAttribute('aria-current')).toBe('step');
    expect(ui.steps()[5].getAttribute('aria-current')).toBeNull();
    expect(document.getElementById('allo-live-report-writer').textContent).toBe('Verify at least one fact in Fact Review first.');
  }, 90000);

  it('moving to a step puts focus on its heading, and opening the panel does not', async () => {
    const ui = await mount(null);
    // Opening the panel does not pull focus to the first step's heading.
    expect(document.activeElement.hasAttribute('data-rw-step-heading')).toBe(false);
    await wait(); // the panel's own open-time focus on its close button
    expect(document.activeElement.getAttribute('aria-label')).toBe('toasts.close_report_writer');
    await click(ui.steps()[1]);
    expect(document.activeElement.tagName).toBe('H3');
    expect(document.activeElement.hasAttribute('data-rw-step-heading')).toBe(true);
    expect(document.activeElement.textContent).toMatch(/Background/);
    await click(ui.steps()[3]);
    expect(document.activeElement.textContent).toMatch(/Score/);
  }, 90000);
});

describe('buttons name what they act on', () => {
  it('scores, sections, hypotheses and demo cases', async () => {
    const ui = await mount(SNAP);
    await click(ui.steps()[3]);
    expect(ui.byLabel('Remove score entry: WISC-V — Full Scale IQ')).toBeTruthy();
    await click(ui.steps()[5]);
    expect(ui.byLabel('Remove hypothesis: Specific Learning Disability')).toBeTruthy();
    await click(ui.steps()[6]);
    expect(ui.byLabel('Move Summary up')).toBeTruthy();
    expect(ui.byLabel('Move Background down')).toBeTruthy();
    expect(ui.byLabel('Remove report section: Summary')).toBeTruthy();
    await click(ui.steps()[0]);
    expect(ui.host.querySelector('button[aria-label^="Load demo case: Case A"]')).toBeTruthy();
    expect(ui.host.querySelector('button[aria-label="Load demo case"]')).toBeNull();
  }, 90000);

  it('observation sources say which one is shown and which have notes', async () => {
    const ui = await mount(SNAP);
    await click(ui.steps()[2]);
    const parent = ui.byLabel('Parent Interview (has notes)');
    expect(parent).toBeTruthy();
    expect(parent.getAttribute('aria-pressed')).toBe('false');
    expect(ui.byLabel('Test Session').getAttribute('aria-pressed')).toBe('true');
    await click(parent);
    expect(ui.byLabel('Parent Interview (has notes)').getAttribute('aria-pressed')).toBe('true');
    expect(ui.byLabel('Test Session').getAttribute('aria-pressed')).toBe('false');
  }, 90000);

  it('the discrepancy report import is a button that opens the file picker', async () => {
    const ui = await mount(SNAP);
    await click(ui.steps()[7]);
    const button = ui.byLabel('Import psycheck JSON discrepancy report');
    expect(button && button.tagName).toBe('BUTTON');
    const input = ui.host.querySelector('#rw-psycheck-import');
    expect(input.tabIndex).toBe(-1);
    expect(input.closest('label')).toBeNull();
    const picker = vi.spyOn(input, 'click').mockImplementation(() => {});
    await click(button);
    expect(picker).toHaveBeenCalledTimes(1);
  }, 90000);
});
