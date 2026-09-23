// Score facts that no longer match Step 4.
//
// WHY (2026-09-23): the report is written from fact chunks, which copy each
// Step 4 score when facts are extracted. A percentile, interval, prior score or
// the score itself changed afterwards left the prompts writing from the OLD fact
// while the checker judged the draft against the NEW score, so the clinician
// got findings for text written exactly as instructed. The only way out was to
// re-extract everything, which re-runs the AI on the background and discards all
// verification. Now the mismatch is shown in Step 5 and before generating, and
// "Update score facts" refreshes only the score facts that changed.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let U, React, createRoot;
beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
  U = window.AlloModules.ReportWriterUtils;
});

const entry = (subtest, score, extra = {}) => ({ id: 's-' + subtest, assessment: 'WISC-V', subtest, score, scoreType: 'standard', classification: 'Average', percentile: 50, ...extra });
const chunk = (subtest, value, extra = {}) => ({ id: 'c-' + subtest, type: 'score', source: 'WISC-V', field: subtest, value, scoreType: 'standard', classification: 'Average', percentile: 50, verified: true, ...extra });

describe('which score facts are stale', () => {
  it('a changed value, percentile, interval or prior; a row added; a row removed', () => {
    const r = U.staleScoreFacts(
      [chunk('Full Scale IQ', 100), chunk('Verbal Comprehension', 100), chunk('Working Memory', 100), chunk('Fluid Reasoning', 100)],
      [entry('Full Scale IQ', 100, { percentile: 50 }), entry('Verbal Comprehension', 100, { percentile: 52, percentileSource: 'manual' }),
        entry('Working Memory', 100, { priorScore: 92 }), entry('Processing Speed', 100)]);
    expect(r.changed.map(x => x.chunk.field)).toEqual(['Verbal Comprehension', 'Working Memory']);
    expect(r.added.map(e => e.subtest)).toEqual(['Processing Speed']);
    expect(r.removed.map(c => c.field)).toEqual(['Fluid Reasoning']);
    expect(r.count).toBe(4);
  });
  it('nothing is stale before the first extraction, and facts from other tools are not Step 4 rows', () => {
    expect(U.staleScoreFacts([], [entry('Full Scale IQ', 100)]).count).toBe(0);
    const da = { id: 'da1', type: 'score', source: 'Dynamic Assessment', field: 'Modifiability', value: 3, verified: true };
    expect(U.staleScoreFacts([chunk('Full Scale IQ', 100), da], [entry('Full Scale IQ', 100)]).count).toBe(0);
  });
  it('a corrected score alone makes its fact stale', () => {
    expect(U.staleScoreFacts([chunk('Full Scale IQ', 100)], [entry('Full Scale IQ', 105)]).changed).toHaveLength(1);
  });
  it('a blank and a missing value are the same', () => {
    expect(U.staleScoreFacts([chunk('Full Scale IQ', 100, { ciLow: '' })], [entry('Full Scale IQ', 100, { ciLow: null })]).count).toBe(0);
  });
});

describe('in the workflow', () => {
  let mounted = null;
  afterEach(async () => { if (mounted) { await React.act(async () => mounted.root.unmount()); mounted.host.remove(); mounted = null; } });
  const act = (fn) => React.act(async () => { await fn(); });
  const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));

  it('a percentile corrected after extraction is flagged, and updating refreshes only that fact', async () => {
    const prompts = [];
    const callGemini = async (prompt) => {
      if (String(prompt).includes('You are writing the "Summary" section')) { prompts.push(String(prompt)); return '[Student] earned 88.\nUSED_CHUNKS: c1'; }
      return '{"errors":[]}';
    };
    localStorage.clear();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    mounted = { host, root };
    await act(() => root.render(React.createElement(window.AlloModules.ReportWriter, {
      onClose() {}, callGemini, addToast() {}, t: key => key,
      studentNickname: 'Student A', behaviorLensData: null, longitudinalData: null, dashboardData: [],
    })));
    const steps = () => Array.from(host.querySelectorAll('nav[aria-label="Report Writer steps"] button'));
    await click(steps()[9]);
    const area = host.querySelector('#rw-import-area');
    await act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(area, JSON.stringify({
        schemaVersion: 2, reportTitle: 'Stale test', manualStudentName: 'Student A',
        scoreEntries: [{ id: 's1', assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 88, scoreType: 'standard' }],
        factChunks: [
          { id: 'c1', type: 'score', source: 'WISC-V', field: 'Full Scale IQ', value: 88, scoreType: 'standard', percentile: 21, verified: true, immutable: true },
          { id: 'b1', type: 'background', field: 'Referral', value: 'reading concerns', verified: true, immutable: true },
        ],
        blueprint: [{ id: 'b1', name: 'Summary', notes: '', enabled: true }], reportGenPasses: 1,
      }));
      area.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Import Data')));
    await click(steps()[4]);
    expect(host.textContent).not.toMatch(/no longer match Step 4/);
    // The clinician copies the report's percentile in Step 4 after extracting.
    await click(steps()[3]);
    await click(host.querySelector('button[aria-controls^="rw-score-details-"]'));
    await act(() => {
      const pct = host.querySelector('input[id^="rw-pct-"]');
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(pct, '23');
      pct.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });
    await click(steps()[4]);
    expect(host.textContent).toMatch(/1 score fact\(s\) no longer match Step 4/);
    const results = await axe.run(host, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'] }, rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.map(v => v.id)).toEqual([]);
    await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent === 'Update score facts'));
    expect(host.textContent).not.toMatch(/no longer match Step 4/);
    // The refreshed fact must be verified again; the background fact keeps its verification.
    expect(host.querySelectorAll('button[aria-label="Verify and lock this fact chunk"]')).toHaveLength(1);
    expect(host.textContent).toContain('reading concerns');
    await click(host.querySelector('button[aria-label="Verify and lock this fact chunk"]'));
    await click(steps()[7]);
    await click(host.querySelector('button[aria-label="Generate report"]'));
    for (let i = 0; i < 300 && host.querySelector('button[aria-label="Generate report"]').getAttribute('aria-busy') === 'true'; i++) {
      await act(() => new Promise(r => setTimeout(r, 10)));
    }
    expect(prompts[0]).toContain('[c1] WISC-V — Full Scale IQ: 88 (standard score; Low Average; 23rd percentile (from the score report))');
  }, 60000);
});
