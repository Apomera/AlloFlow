// Differences called significant.
//
// WHY (2026-09-23): AI drafts write "Processing Speed was significantly lower
// than Verbal Comprehension" or "a significant discrepancy between the VCI and
// the PSI". Whether a difference is statistically significant, and how unusual
// it is, comes from the manual's critical values and base rates, which the
// model is never given, so such a claim is unsupported. The prompt now forbids
// it unless the data says so, and Verify lists any that remain (advisory).
// "Clinically Significant" is a BASC-3 band name, not a claim about a difference.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let PC;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
  PC = window.AlloPsycheck;
});

const SRC = [{ assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 88, score_type: 'standard' }];
const claims = (text) => PC.verifyDraft(SRC, text).significance_notes.length;

describe('claims of a significant difference', () => {
  it('are listed, however phrased', () => {
    expect(claims('Processing Speed was significantly lower than Verbal Comprehension.')).toBe(1);
    expect(claims('There is a statistically significant discrepancy between the VCI and the PSI.')).toBe(1);
    expect(claims('The scores were not significantly different.')).toBe(1);
    expect(claims('She has a significant relative weakness in phonological processing.')).toBe(1);
  });
  it('a band name or an ordinary use of the word is not one', () => {
    expect(claims('Anxiety was in the Clinically Significant range.')).toBe(0);
    expect(claims('Attention Problems was a clinically significant weakness on the BASC-3.')).toBe(0);
    expect(claims('A significant number of errors occurred.')).toBe(0);
  });
  it('they are advisory: nothing blocks export', () => {
    const r = PC.verifyDraft(SRC, 'On the WISC-V, the Full Scale IQ was 88. Processing Speed was significantly lower than Verbal Comprehension.');
    expect(r.discrepancies).toHaveLength(0);
    expect(r.significance_notes[0].detail).toMatch(/critical values/);
  });
});

describe('in the workflow', () => {
  it('the prompt forbids the claim, and Verify lists one that got through', async () => {
    const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const React = window.React;
    const prompts = [];
    const callGemini = async (prompt) => {
      if (String(prompt).includes('You are writing the "Summary" section')) {
        prompts.push(String(prompt));
        return 'On the WISC-V, the Full Scale IQ was 88. Processing Speed was significantly lower than Verbal Comprehension.\nUSED_CHUNKS: c1';
      }
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
          schemaVersion: 2, reportTitle: 'Significance', manualStudentName: 'Student A',
          scoreEntries: [{ id: 's1', assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 88, scoreType: 'standard' }],
          factChunks: [{ id: 'c1', type: 'score', source: 'WISC-V', field: 'Full Scale IQ', value: 88, scoreType: 'standard', verified: true, immutable: true }],
          blueprint: [{ id: 'b1', name: 'Summary', notes: '', enabled: true }], reportGenPasses: 1,
        }));
        area.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Import Data')));
      await click(steps()[7]);
      await click(host.querySelector('button[aria-label="Generate report"]'));
      for (let i = 0; i < 300 && host.querySelector('button[aria-label="Generate report"]').getAttribute('aria-busy') === 'true'; i++) {
        await act(() => new Promise(r => setTimeout(r, 10)));
      }
      expect(prompts[0]).toMatch(/10\. Do not call a difference between scores significant/);
      await click(host.querySelector('button[aria-label="Verify the current report against the structured scores using the inline psycheck port"]'));
      expect(host.textContent).toContain('1 difference(s) called significant, to confirm against the score report, not blocking:');
    } finally {
      await React.act(async () => root.unmount());
      host.remove();
    }
  }, 60000);
});
