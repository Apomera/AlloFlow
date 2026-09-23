// Prior evaluations and IEPs as case documents.
//
// WHY (2026-09-23): a reevaluation report leans on the student's records, but
// the Report Writer had no place for them, and they are the most identifying
// text in the whole workflow. So a case document:
//   - lives in memory for the session only: never in a saved report, the draft
//     store, an export or an imported JSON;
//   - reaches the AI only after the clinician turns it on, only while a student
//     name is set to redact, and only as passages indexed from REDACTED text;
//   - lets the verifier accept a prior score the draft gives as a PAST result,
//     but only when the record really holds that number. A wrong current score
//     called "previous" with no record behind it is still a mismatch.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let U, PC;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('stem_lab/stem_lumen_evidence.js');
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
  U = window.AlloModules.ReportWriterUtils;
  PC = window.AlloPsycheck;
});

const CURRENT = [{ assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 75, score_type: 'standard' }];
const RECORD = { title: '2022 evaluation', text: 'WISC-V results (2022)\nFull Scale IQ (FSIQ): 82, Low Average\nProcessing Speed: 79' };
const kinds = (r) => r.discrepancies.map(d => d.kind);

describe('a prior score is checked against the case record it came from', () => {
  const PAST = 'A 2022 evaluation reported a Full Scale IQ of 82 on the WISC-V.';
  it('given as a past result and found in a record: matched to that record, not flagged', () => {
    const r = PC.verifyDraft(CURRENT, PAST, { caseRecords: [RECORD] });
    expect(r.discrepancies).toHaveLength(0);
    expect(r.historical_matches.map(h => [h.subtest, h.value, h.record])).toEqual([['Full Scale IQ', 82, '2022 evaluation']]);
  });
  it('with no record behind it, the same sentence is still a mismatch', () => {
    expect(kinds(PC.verifyDraft(CURRENT, PAST))).toContain('score_mismatch');
    expect(kinds(PC.verifyDraft(CURRENT, PAST, { caseRecords: [] }))).toContain('score_mismatch');
  });
  it('a sentence that does not say the score is past cannot borrow the record', () => {
    const r = PC.verifyDraft(CURRENT, 'On the WISC-V, the Full Scale IQ was 82.', { caseRecords: [RECORD] });
    expect(kinds(r)).toContain('score_mismatch');
  });
  it('the record must hold THAT number for THAT subtest', () => {
    const other = { title: 'x', text: 'Full Scale IQ: 85. Processing Speed: 82. Sum of scaled scores 182.' };
    expect(kinds(PC.verifyDraft(CURRENT, PAST, { caseRecords: [other] }))).toContain('score_mismatch');
  });
  it('a scaled score at the end of a sentence is checked (a trailing period read as a decimal hid it)', () => {
    const src = [{ assessment: 'WISC-V', subtest: 'Block Design', score: 9, score_type: 'scaled' }];
    expect(kinds(PC.verifyDraft(src, 'Block Design was 6.'))).toContain('score_mismatch');
    expect(PC.verifyDraft(src, 'Block Design was 9.').verified).toHaveLength(1);
    expect(PC.verifyDraft(src, 'Block Design was 6.5 on a practice item.').discrepancies).toHaveLength(0);
  });
  it('a prior subtest scaled score is matched the same way', () => {
    const src = [{ assessment: 'WISC-V', subtest: 'Block Design', score: 9, score_type: 'scaled' }];
    const text = 'In 2021, Block Design was 6.';
    expect(kinds(PC.verifyDraft(src, text))).toContain('score_mismatch');
    expect(PC.verifyDraft(src, text, { caseRecords: [{ title: 'r', text: 'Block Design 6' }] }).discrepancies).toHaveLength(0);
  });
  it('draft selection gives a draft citing a recorded prior score no penalty', () => {
    const draft = { text: PAST, usedChunks: [] };
    const sources = U.psycheckSources([{ assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 75, scoreType: 'standard' }]);
    expect(U.rankGenerationPasses([draft], [], sources, [RECORD])[0].psycheckFindings).toBe(0);
    expect(U.rankGenerationPasses([draft], [], sources)[0].psycheckFindings).toBeGreaterThan(0);
  });
});

describe('case documents are session-only', () => {
  it('an imported report JSON cannot carry case documents in', () => {
    const data = U.validateReportPayload({ schemaVersion: 1, caseDocuments: [{ id: 'x', title: 'IEP', text: 'secret record text' }] });
    expect('caseDocuments' in data).toBe(false);
  });
});

// ── The workflow, rendered ──
const CASE_TEXT = 'Jane Doe reevaluation, 2023. WISC-V Full Scale IQ 82. Reading fluency was a relative weakness across all probes. '
  + 'Mrs. Smith, the reading specialist, can be reached at 555-123-4567.';
async function mount(callGemini) {
  const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const React = window.React;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const act = (fn) => React.act(async () => { await fn(); });
  const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  const typeInto = (el, value) => act(() => {
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  localStorage.clear();
  await act(() => root.render(React.createElement(window.AlloModules.ReportWriter, {
    onClose() {}, callGemini, addToast() {}, t: key => key,
    studentNickname: '', behaviorLensData: null, longitudinalData: null, dashboardData: [],
  })));
  const steps = () => Array.from(host.querySelectorAll('nav[aria-label="Report Writer steps"] button'));
  // Replacing unsaved work, or regenerating a written report, asks first.
  const confirmIfAsked = async (label) => {
    const dialog = host.querySelector('[role="alertdialog"][aria-labelledby="rw-confirm-title"]');
    if (dialog) await click(Array.from(dialog.querySelectorAll('button')).find(b => b.textContent === label));
  };
  const importSnapshot = async (snapshot) => {
    await click(steps()[9]);
    await typeInto(host.querySelector('#rw-import-area'), JSON.stringify(snapshot));
    await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Import Data')));
    await confirmIfAsked('Replace it');
  };
  const addCase = async (title, text) => {
    await click(steps()[1]);
    await typeInto(host.querySelector('input[aria-label="Case document name"]'), title);
    await typeInto(host.querySelector('textarea[aria-label="Case document text"]'), text);
    await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Add Case Document')));
  };
  const generate = async () => {
    await click(steps()[7]);
    await click(host.querySelector('button[aria-label="Generate report"]'));
    await confirmIfAsked('Generate again');
    for (let i = 0; i < 300 && host.querySelector('button[aria-label="Generate report"]').getAttribute('aria-busy') === 'true'; i++) {
      await act(() => new Promise(r => setTimeout(r, 10)));
    }
  };
  const unmount = async () => { await React.act(async () => root.unmount()); host.remove(); };
  return { host, act, click, steps, importSnapshot, addCase, generate, unmount };
}
const SNAPSHOT = (name) => ({
  schemaVersion: 2, reportTitle: 'Case test', manualStudentName: name, studentAge: '10',
  scoreEntries: [{ id: 's1', assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 75, scoreType: 'standard' }],
  factChunks: [{ id: 'c1', type: 'score', source: 'WISC-V', field: 'Full Scale IQ', value: 75, verified: true, immutable: true }],
  blueprint: [{ id: 'b1', name: 'Background', notes: 'reading fluency history', enabled: true }],
  reportGenPasses: 1,
});

describe('case documents in the workflow', () => {
  it('cannot be used with the AI while no student name is set, and are never written to device storage', async () => {
    const ui = await mount(async () => '{"errors":[]}');
    try {
      await ui.importSnapshot(SNAPSHOT(''));
      await ui.addCase('Jane Doe reevaluation 2023', CASE_TEXT);
      const toggle = ui.host.querySelector('input[id^="rw-case-ai-"]');
      expect(toggle.checked).toBe(false);
      expect(toggle.disabled).toBe(true);
      expect(ui.host.textContent).toContain('Set the student name in Step 1');
      // Turning on device storage writes the draft; the case text is not in it.
      await ui.click(ui.steps()[9]);
      await ui.click(ui.host.querySelector('#rw-persist-device'));
      const stored = Object.keys(localStorage).map(k => localStorage.getItem(k)).join('\n');
      expect(stored).toContain('Case test');
      expect(stored).not.toContain('relative weakness');
      // Opening another report (likely another student) clears them.
      await ui.importSnapshot(SNAPSHOT('Student B'));
      await ui.click(ui.steps()[1]);
      expect(ui.host.querySelector('input[id^="rw-case-ai-"]')).toBeNull();
    } finally { await ui.unmount(); }
  }, 30000);

  it('reach a prompt only when turned on, and then only redacted', async () => {
    const prompts = [];
    const callGemini = async (prompt) => {
      if (String(prompt).includes('You are writing the "Background" section')) {
        prompts.push(String(prompt));
        const caseId = (String(prompt).match(/\[(case:ev_\w+)\]/) || [])[1];
        return 'A 2023 reevaluation noted reading fluency as a relative weakness.\nUSED_CHUNKS: c1' + (caseId ? ', ' + caseId : '');
      }
      return '{"errors":[]}';
    };
    const ui = await mount(callGemini);
    try {
      await ui.importSnapshot(SNAPSHOT('Jane Doe'));
      await ui.addCase('Jane Doe reevaluation 2023', CASE_TEXT);
      // What redaction will miss is shown before the clinician opts in.
      expect(ui.host.textContent).toContain('Other people named: Smith.');
      const toggle = ui.host.querySelector('input[id^="rw-case-ai-"]');
      expect(toggle.disabled).toBe(false);
      expect(toggle.checked).toBe(false);

      await ui.generate();
      expect(prompts).toHaveLength(1);
      expect(prompts[0]).not.toContain('relative weakness');
      expect(prompts[0]).not.toContain('CASE RECORD PASSAGES');

      await ui.click(ui.steps()[1]);
      await ui.click(ui.host.querySelector('input[id^="rw-case-ai-"]'));
      await ui.generate();
      expect(prompts).toHaveLength(2);
      const p = prompts[1];
      expect(p).toContain('CASE RECORD PASSAGES');
      expect(p).toContain('relative weakness');
      expect(p).toContain('[Student]');
      expect(p).not.toMatch(/Jane|Doe/);
      expect(p).not.toContain('555-123-4567');
      // The model cited the passage: it shows as case evidence, listed by its redacted title.
      expect(ui.host.textContent).toContain('📁 [Student] reevaluation 2023');
      const caseId = p.match(/\[(case:ev_\w+)\]/)[1];
      const consulted = U.referencesConsulted({ Background: [caseId] });
      expect(consulted.map(d => d.title)).toEqual(['Case record: [Student] reevaluation 2023']);

      // With the name cleared nothing can be redacted, so an enabled document
      // drops back out of the prompt.
      await ui.click(ui.steps()[0]);
      const nameBox = ui.host.querySelector('input[aria-label="Student code name"]');
      await ui.act(() => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(nameBox, '');
        nameBox.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await ui.generate();
      expect(prompts).toHaveLength(3);
      expect(prompts[2]).not.toContain('CASE RECORD PASSAGES');
      expect(prompts[2]).not.toContain('relative weakness');
    } finally { await ui.unmount(); }
  }, 30000);
});
