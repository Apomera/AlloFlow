// The writing-style sample, and the student's age and grade in the draft.
//
// WHY (2026-09-23):
//   - The style sample (a report about ANOTHER student) went into every section
//     prompt. The scrubber only knows THIS student's names, so the sample's
//     student, family, teacher and school were sent to the AI as written, and
//     the model could copy the sample's names, ages or scores into this report.
//     Only its wording matters, so its proper nouns become [Name] and its
//     numbers [#] before it is sent, and the clinician is shown which names.
//   - Nothing checked the age or grade a draft gives the student. Statements of
//     the CURRENT age or grade are now compared with Step 1 (advisory).

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

const SAMPLE = "Jordan Smith is a 10-year-old fifth grader at Lincoln Elementary. Mrs. Garcia, his teacher, reported that Jordan's "
  + 'Full Scale IQ of 112 fell in the High Average range. Results indicate relative strengths in Verbal Comprehension.';

describe('the style sample sent to the AI', () => {
  it('loses the other student\'s names, school and numbers, and keeps the wording', () => {
    const { text, names } = U.styleSampleForAI(SAMPLE);
    expect(text).not.toMatch(/Jordan|Smith|Lincoln|Garcia|112|10-year/);
    expect(text).toContain('[Name]\'s Full Scale IQ of [#] fell in the High Average range');
    expect(text).toContain('Mrs. [Name], his teacher');
    expect(text).toContain('Results indicate relative strengths in Verbal Comprehension.');
    expect(names.sort()).toEqual(['Elementary', 'Garcia', 'Jordan', 'Lincoln', 'Smith']);
  });
  it('a word the sample also uses in lower case is ordinary, not a name', () => {
    // "Homework" is in no report vocabulary; the lower-case use alone keeps it.
    expect(U.styleSampleForAI('Homework took hours. His homework was often late.').names).toEqual([]);
    expect(U.styleSampleForAI('Homework took hours.').names).toEqual(['Homework']);
  });

  it('end to end: the section prompt carries the processed sample, framed as another student\'s', async () => {
    const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const React = window.React;
    const prompts = [];
    const callGemini = async (prompt) => {
      if (String(prompt).includes('You are writing the "Summary" section')) { prompts.push(String(prompt)); return '[Student] earned a Full Scale IQ of 88.\nUSED_CHUNKS: c1'; }
      return '{"errors":[]}';
    };
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const act = (fn) => React.act(async () => { await fn(); });
    const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    try {
      localStorage.clear();
      await act(() => root.render(React.createElement(window.AlloModules.ReportWriter, {
        onClose() {}, callGemini, addToast() {}, t: key => key,
        studentNickname: 'Student A', behaviorLensData: null, longitudinalData: null, dashboardData: [],
      })));
      const steps = () => Array.from(host.querySelectorAll('nav[aria-label="Report Writer steps"] button'));
      await click(steps()[9]);
      const area = host.querySelector('#rw-import-area');
      await act(() => {
        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(area, JSON.stringify({
          schemaVersion: 2, reportTitle: 'Style test', manualStudentName: 'Student A', studentAge: '8', studentGrade: '3',
          scoreEntries: [{ id: 's1', assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 88, scoreType: 'standard' }],
          factChunks: [{ id: 'c1', type: 'score', source: 'WISC-V', field: 'Full Scale IQ', value: 88, verified: true, immutable: true }],
          blueprint: [{ id: 'b1', name: 'Summary', notes: '', enabled: true }], reportGenPasses: 1, styleProfile: SAMPLE,
        }));
        area.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Import Data')));
      // The clinician is told which names will be replaced.
      await click(steps()[6]);
      expect(host.textContent).toMatch(/these names become \[Name\]: Jordan, Smith, Lincoln, Elementary, Garcia/);
      await click(steps()[7]);
      await click(host.querySelector('button[aria-label="Generate report"]'));
      for (let i = 0; i < 300 && host.querySelector('button[aria-label="Generate report"]').getAttribute('aria-busy') === 'true'; i++) {
        await act(() => new Promise(r => setTimeout(r, 10)));
      }
      expect(prompts).toHaveLength(1);
      expect(prompts[0]).toContain('a report about ANOTHER student');
      expect(prompts[0]).toContain('fell in the High Average range');
      expect(prompts[0]).not.toMatch(/Jordan|Garcia|Lincoln|112/);
    } finally {
      await React.act(async () => root.unmount());
      host.remove();
    }
  }, 60000);
});

describe('age and grade in the draft', () => {
  const facts = { age: '8', grade: '3' };
  const kinds = (text, f = facts) => U.identityNotes(text, f).map(n => n.kind);
  it('a current age or grade that differs from Step 1 is noted', () => {
    expect(kinds('[Student] is a 10-year-old fifth grader.')).toEqual(['age_mismatch', 'grade_mismatch']);
    expect(kinds('[Student] is currently in the fifth grade.')).toEqual(['grade_mismatch']);
    expect(kinds('[Student] is in kindergarten.')).toEqual(['grade_mismatch']);
    expect(U.identityNotes('[Student] is a 10-year-old.', facts)[0].detail).toBe('The draft calls [Student] a 10-year-old; Step 1 records age 8.');
  });
  it('the right age and grade, however written, pass', () => {
    expect(kinds('[Student] is an 8-year-old third grader who is currently in the third grade.')).toEqual([]);
    expect(kinds('[Student] is an 8-year-old 3rd-grade student.')).toEqual([]);
    expect(kinds('[Student] is a 10-year-old.', { age: '10 years, 4 months', grade: '5th' })).toEqual([]);
    expect(kinds('[Student] is a kindergartner.', { age: '5', grade: 'K' })).toEqual([]);
  });
  it('another person\'s age, a comparison group and the past are not the student\'s current age or grade', () => {
    expect(kinds('Her 12-year-old brother and 10-year-old sister live at home.')).toEqual([]);
    expect(kinds('Compared with other 10-year-old students, [Student] read slowly.')).toEqual([]);
    expect(kinds('As a 3-year-old, [Student] began speech therapy. She was a 2nd grader when she was retained.')).toEqual([]);
    expect(kinds('[Student] was retained in 1st grade.')).toEqual([]);
  });
  it('nothing is checked when Step 1 has no age or grade', () => {
    expect(kinds('[Student] is a 10-year-old fifth grader.', {})).toEqual([]);
  });

  it('Verify shows them beside the score findings', async () => {
    const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const React = window.React;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const act = (fn) => React.act(async () => { await fn(); });
    const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    try {
      localStorage.clear();
      await act(() => root.render(React.createElement(window.AlloModules.ReportWriter, {
        onClose() {}, callGemini: async () => '{}', addToast() {}, t: key => key,
        studentNickname: 'Student A', behaviorLensData: null, longitudinalData: null, dashboardData: [],
      })));
      const steps = () => Array.from(host.querySelectorAll('nav[aria-label="Report Writer steps"] button'));
      await click(steps()[9]);
      const area = host.querySelector('#rw-import-area');
      await act(() => {
        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(area, JSON.stringify({
          schemaVersion: 2, reportTitle: 'Age test', manualStudentName: 'Student A', studentAge: '8', studentGrade: '3',
          scoreEntries: [{ id: 's1', assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 88, scoreType: 'standard' }],
          factChunks: [{ id: 'c1', type: 'score', source: 'WISC-V', field: 'Full Scale IQ', value: 88, verified: true, immutable: true }],
          blueprint: [{ id: 'b1', name: 'Summary', notes: '', enabled: true }],
          reportSections: { Summary: '[Student] is a 10-year-old third grader. On the WISC-V, the Full Scale IQ was 88.' },
        }));
        area.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Import Data')));
      await click(steps()[7]);
      await click(host.querySelector('button[aria-label="Verify the current report against the structured scores using the inline psycheck port"]'));
      expect(host.textContent).toContain('1 age or grade statement(s) that differ from Step 1, not blocking:');
      expect(host.textContent).toContain('The draft calls [Student] a 10-year-old; Step 1 records age 8.');
    } finally {
      await React.act(async () => root.unmount());
      host.remove();
    }
  }, 60000);
});
