// Prior scores for a reevaluation.
//
// WHY (2026-09-23): most evaluations are reevaluations, and the report compares
// current results with the last evaluation's. There was nowhere to record a
// prior score, so the score table could not show one, the AI was never told
// which numbers were past results, and the checker flagged any prior score in
// a draft as a wrong current score. Now each row can carry the prior score and
// where it came from (typed in, or found in a case document), the table shows
// it, the prompts mark it as a past result, and the checker accepts it in a
// sentence that says it is past. A prior given as a current score is still an
// error.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let U, PC, React, createRoot;
beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
  U = window.AlloModules.ReportWriterUtils;
  PC = window.AlloPsycheck;
});

const ROW = { assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 88, scoreType: 'standard', classification: 'Low Average', percentile: 21, priorScore: 82, priorLabel: '2021 evaluation' };
const src = (row = ROW) => U.psycheckSources([row]);
const kinds = (r) => r.discrepancies.map(d => d.kind);

describe('the checker and a recorded prior score', () => {
  it('a prior given as a past result is matched to the record, next to the current score', () => {
    const r = PC.verifyDraft(src(), "On the WISC-V, [Student]'s Full Scale IQ of 88 is up from 82 in the 2021 evaluation.");
    expect(r.discrepancies).toHaveLength(0);
    expect(r.verified.map(v => v.value)).toEqual([88]);
    expect(r.historical_matches.map(h => [h.value, h.record])).toEqual([[82, '2021 evaluation']]);
  });
  it('a prior given as a current score is still an error', () => {
    expect(kinds(PC.verifyDraft(src(), 'On the WISC-V, the Full Scale IQ was 82.'))).toContain('score_mismatch');
  });
  it('a past score that is not the recorded prior is an error', () => {
    expect(kinds(PC.verifyDraft(src(), 'In the 2021 evaluation, the Full Scale IQ was 80.'))).toContain('score_mismatch');
  });
  it('with no prior recorded, a past score has nothing to match', () => {
    const { priorScore, priorLabel, ...none } = ROW;
    expect(kinds(PC.verifyDraft(src(none), 'In the 2021 evaluation, the Full Scale IQ was 82.'))).toContain('score_mismatch');
  });
});

describe('what the AI and the reader are given', () => {
  it('the score fact marks the prior as a past result from records', () => {
    expect(U.scoreFactText({ ...ROW, value: 88 })).toBe('88 (standard score; Low Average; 21st percentile; prior score 82 (2021 evaluation), from records)');
  });
  it('the Summary of Scores shows a Prior column and says what it is, only when there is one', () => {
    expect(U.scoreTableText([ROW])).toMatch(/Full Scale IQ: 88 SS;.*; prior 82 \(2021 evaluation\)/);
    expect(U.scoreTableText([ROW])).toMatch(/Prior = the score from an earlier evaluation/);
    const html = U.buildReportPrintHtml({ title: 'T', sections: {}, scoreEntries: [ROW] });
    expect(html).toContain('<th scope="col">Prior</th>');
    expect(html).toContain('<td>82 (2021 evaluation)</td>');
    const { priorScore, priorLabel, ...none } = ROW;
    expect(U.buildReportPrintHtml({ title: 'T', sections: {}, scoreEntries: [none] })).not.toContain('>Prior<');
  });
  it('a saved report keeps a valid prior and drops an invalid one', () => {
    const data = U.validateReportPayload({ schemaVersion: 1, scoreEntries: [
      { assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 88, scoreType: 'standard', priorScore: 82, priorLabel: '  2021 evaluation  ' },
      { assessment: 'WISC-V', subtest: 'Working Memory', score: 90, scoreType: 'standard', priorScore: 'eighty', priorLabel: 7 },
    ] });
    expect(data.scoreEntries.map(r => [r.priorScore, r.priorLabel])).toEqual([[82, '2021 evaluation'], [null, '']]);
  });
});

describe('in the workflow', () => {
  let mounted = null;
  afterEach(async () => { if (mounted) { await React.act(async () => mounted.root.unmount()); mounted.host.remove(); mounted = null; } });
  const act = (fn) => React.act(async () => { await fn(); });
  const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  const setValue = (el, value) => {
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  };
  const typeInto = (el, value) => act(() => { setValue(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
  const blurWith = (el, value) => act(() => { setValue(el, value); el.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });
  const rows = (host) => Array.from(host.querySelectorAll('button[aria-label^="Remove score entry:"]')).map(b => b.parentElement.textContent);
  async function mount(callGemini = async () => '{"errors":[]}', snapshot) {
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
    if (snapshot) {
      await click(steps()[9]);
      await typeInto(host.querySelector('#rw-import-area'), JSON.stringify(snapshot));
      await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Import Data')));
    }
    return { host, addToast, steps };
  }

  it('a prior score is typed in Step 4, checked against the scale, and shown on the row', async () => {
    const { host, addToast, steps } = await mount();
    await click(steps()[3]);
    host.querySelector('input[aria-label="Score for Full Scale IQ"]').value = '88';
    await click(host.querySelector('#rw-sub-Full-Scale-IQ-add'));
    await click(host.querySelector('button[aria-controls^="rw-score-details-"]'));
    await blurWith(host.querySelector('input[id^="rw-prior-"]:not([id^="rw-prior-label-"])'), '5');
    expect(addToast.mock.calls.map(c => String(c[0])).join(' ')).toMatch(/prior score as the earlier report gives it \(20-200\)/);
    await blurWith(host.querySelector('input[id^="rw-prior-"]:not([id^="rw-prior-label-"])'), '82');
    await blurWith(host.querySelector('input[id^="rw-prior-label-"]'), '2021 evaluation');
    expect(rows(host).join('|')).toMatch(/Full Scale IQ.*88.*prior 82 \(2021 evaluation\)/);
  }, 60000);

  it('prior scores are found in a case document and recorded on the matching rows', async () => {
    const { host, steps } = await mount(undefined, {
      schemaVersion: 2, reportTitle: 'Prior test', manualStudentName: 'Student A', studentAge: '11',
      scoreEntries: [
        { id: 's1', assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 88, scoreType: 'standard' },
        { id: 's2', assessment: 'WISC-V', subtest: 'Verbal Comprehension', score: 95, scoreType: 'standard' },
      ],
    });
    await click(steps()[1]);
    await typeInto(host.querySelector('input[aria-label="Case document name"]'), 'Reevaluation 2021');
    await typeInto(host.querySelector('textarea[aria-label="Case document text"]'),
      'Born 2013. Composite scores\nVerbal Comprehension VCI 16 90 25 83-98 Average\nFull Scale IQ FSIQ 70 82 12 77-88 Low Average\nWorking Memory WMI 14 84 14 78-92 Low Average');
    await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Add Case Document')));
    await click(host.querySelector('button[id^="rw-case-prior-"]'));
    // Working Memory is not entered in Step 4, so it is not offered.
    const found = Array.from(host.querySelectorAll('input[id^="rw-prior-find-"][type="checkbox"]'));
    expect(found.map(b => document.querySelector(`label[for="${b.id}"]`).textContent)).toEqual(['WISC-V — Verbal Comprehension: 90', 'WISC-V — Full Scale IQ: 82']);
    // The label comes from the document's title, not the birth year in its text.
    expect(host.querySelector('#rw-prior-find-label').value).toBe('2021 evaluation');
    const results = await axe.run(host, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'] }, rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.map(v => v.id)).toEqual([]);
    await click(Array.from(host.querySelectorAll('button')).find(b => /^Record 2 prior/.test(b.textContent)));
    await click(steps()[3]);
    const text = rows(host).join('|');
    expect(text).toMatch(/Full Scale IQ.*prior 82 \(2021 evaluation\)/);
    expect(text).toMatch(/Verbal Comprehension.*prior 90 \(2021 evaluation\)/);
  }, 60000);

  it('the section prompt and the generation check both see the prior as a past result', async () => {
    const prompts = [];
    const callGemini = async (prompt) => {
      prompts.push(String(prompt));
      if (String(prompt).includes('You are writing the "Summary" section')) return "[Student]'s Full Scale IQ of 88 is up from 82 in the 2021 evaluation.\nUSED_CHUNKS: c1";
      return '{"errors":[]}';
    };
    const { host, steps } = await mount(callGemini, {
      schemaVersion: 2, reportTitle: 'Prior prompt', manualStudentName: 'Student A',
      scoreEntries: [{ id: 's1', ...ROW }],
      factChunks: [{ id: 'c1', type: 'score', source: 'WISC-V', field: 'Full Scale IQ', value: 88, scoreType: 'standard', priorScore: 82, priorLabel: '2021 evaluation', verified: true, immutable: true }],
      blueprint: [{ id: 'b1', name: 'Summary', notes: '', enabled: true }], reportGenPasses: 1,
    });
    await click(steps()[7]);
    await click(host.querySelector('button[aria-label="Generate report"]'));
    for (let i = 0; i < 300 && host.querySelector('button[aria-label="Generate report"]').getAttribute('aria-busy') === 'true'; i++) {
      await act(() => new Promise(r => setTimeout(r, 10)));
    }
    const section = prompts.find(p => p.includes('You are writing the "Summary" section'));
    expect(section).toContain('prior score 82 (2021 evaluation), from records');
    expect(section).toMatch(/9\. A "prior score \.\.\. from records" is a PAST result/);
    const check = prompts.find(p => p.includes('ACTUAL INPUT SCORES'));
    expect(check).toContain('prior score 82 (2021 evaluation), from records');
    expect(check).toContain('citing it as a past result is NOT an error');
  }, 60000);
});
