// Choosing among the parallel drafts of a report section.
//
// WHY (2026-09-23): the Report Writer writes each section 3 times by default
// and keeps one. It chose by a heuristic (chunks cited, length, coverage) and
// never ran the deterministic score verifier on the candidates, so the kept
// draft could misquote a score that a discarded draft had right. Now the
// verifier decides first and the heuristic only breaks ties.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let U;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
  U = window.AlloModules.ReportWriterUtils;
});

const CHUNKS = [
  { id: 'c1', type: 'score', source: 'WISC-V', field: 'Full Scale IQ', value: 102 },
  { id: 'c2', type: 'score', source: 'WISC-V', field: 'Working Memory', value: 85 },
  { id: 'c3', type: 'background', field: 'Referral', value: 'reading concerns' },
  { id: 'c4', type: 'background', field: 'History', value: 'no retention' },
];
const SCORES = [
  { assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 102, scoreType: 'standard', classification: 'Average', percentile: 55 },
  { assessment: 'WISC-V', subtest: 'Working Memory', score: 85, scoreType: 'standard', classification: 'Low Average', percentile: 16 },
];
// Cites more evidence and is longer, but misquotes the Full Scale IQ.
const RICH_BUT_WRONG = {
  text: 'On the WISC-V, [Student] earned a Full Scale IQ of 97. Working Memory was 85, a relative weakness. ' + 'Referral concerns centred on reading. '.repeat(20),
  usedChunks: ['c1', 'c2', 'c3', 'c4'],
};
const LEAN_BUT_RIGHT = {
  text: 'On the WISC-V, [Student] earned a Full Scale IQ of 102. Working Memory was 85.',
  usedChunks: ['c1', 'c2'],
};

describe('draft selection', () => {
  it('prefers the draft the verifier finds no discrepancy in, even if the other cites more', () => {
    const ranked = U.rankGenerationPasses([RICH_BUT_WRONG, LEAN_BUT_RIGHT], CHUNKS, U.psycheckSources(SCORES));
    expect(ranked[0].text).toBe(LEAN_BUT_RIGHT.text);
    expect(ranked[0].psycheckFindings).toBe(0);
    expect(ranked[1].psycheckFindings).toBeGreaterThan(0);
    // The old heuristic alone would have kept the wrong draft.
    expect(ranked[1].qualityScore).toBeGreaterThan(ranked[0].qualityScore);
  });

  it('among equally clean drafts, the heuristic still picks the better-evidenced one', () => {
    const richAndRight = { ...RICH_BUT_WRONG, text: RICH_BUT_WRONG.text.replace('IQ of 97', 'IQ of 102') };
    const ranked = U.rankGenerationPasses([LEAN_BUT_RIGHT, richAndRight], CHUNKS, U.psycheckSources(SCORES));
    expect(ranked[0].text).toBe(richAndRight.text);
  });

  it('if the verifier cannot run, no draft is treated as verified and the heuristic decides', () => {
    const saved = window.AlloPsycheck;
    try {
      Object.defineProperty(window, 'AlloPsycheck', { value: { verifyDraft() { throw new Error('down'); } }, configurable: true, writable: true });
      const ranked = U.rankGenerationPasses([LEAN_BUT_RIGHT, RICH_BUT_WRONG], CHUNKS, U.psycheckSources(SCORES));
      expect(ranked.map(r => r.psycheckFindings)).toEqual([null, null]);
      expect(ranked[0].text).toBe(RICH_BUT_WRONG.text);
    } finally {
      Object.defineProperty(window, 'AlloPsycheck', { value: saved, configurable: true, writable: true });
    }
  });

  it('the Generate button keeps the correct draft end to end (3 passes, 2 of them wrong)', async () => {
    const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const React = window.React;
    const drafts = [
      RICH_BUT_WRONG.text + '\nUSED_CHUNKS: c1, c2, c3, c4',
      LEAN_BUT_RIGHT.text + '\nUSED_CHUNKS: c1, c2',
      RICH_BUT_WRONG.text + '\nUSED_CHUNKS: c1, c2, c3, c4',
    ];
    let draftCalls = 0;
    const callGemini = async (prompt) => {
      if (String(prompt).includes('You are writing the "Summary" section')) return drafts[draftCalls++ % drafts.length];
      return '{"errors":[]}';
    };
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const act = (fn) => React.act(async () => { await fn(); });
    const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    try {
      await act(() => root.render(React.createElement(window.AlloModules.ReportWriter, {
        onClose() {}, callGemini, addToast() {}, t: key => key,
        studentNickname: 'Student A', behaviorLensData: null, longitudinalData: null, dashboardData: [],
      })));
      const steps = () => Array.from(host.querySelectorAll('nav[aria-label="Report Writer steps"] button'));
      await click(steps()[9]);
      const snapshot = {
        schemaVersion: 2, reportTitle: 'Selection test', manualStudentName: 'Student A', studentAge: '10', studentGrade: '5',
        scoreEntries: SCORES.map((s, i) => ({ id: 's' + i, ...s })),
        factChunks: CHUNKS.map(c => ({ ...c, verified: true, immutable: true })),
        blueprint: [{ id: 'b1', name: 'Summary', notes: '', enabled: true }],
        reportGenPasses: 3,
      };
      const area = host.querySelector('#rw-import-area');
      await act(() => {
        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(area, JSON.stringify(snapshot));
        area.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Import Data')));
      await click(steps()[7]);
      await click(host.querySelector('button[aria-label="Generate report"]'));
      for (let i = 0; i < 200 && host.querySelector('button[aria-label="Generate report"]').getAttribute('aria-busy') === 'true'; i++) {
        await act(() => new Promise(r => setTimeout(r, 10)));
      }
      expect(draftCalls).toBe(3);
      expect(host.textContent).toContain('Full Scale IQ of 102');
      expect(host.textContent).not.toContain('Full Scale IQ of 97');
    } finally {
      await React.act(async () => root.unmount());
      host.remove();
    }
  }, 30000);

  it('psycheck sources skip malformed rows and normalise the score type', () => {
    const rows = U.psycheckSources([...SCORES, { assessment: '', subtest: 'x', score: 1 }, { assessment: 'BASC-3 (Teacher)', subtest: 'Anxiety', score: 66, scoreType: 'T-score' }]);
    expect(rows).toHaveLength(3);
    expect(rows[2].scoreType).toBe('t_score');
  });
});
