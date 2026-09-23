// Quotations in a Report Writer draft must come from something the clinician
// supplied. A model puts plausible words in quotation marks; a fabricated quote
// in a signed report is worse than a paraphrase. psycheck lists quotes of six or
// more words that appear in no background note, observation, verified fact or
// reference. The note is advisory and never blocks export.

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

const NOTES = ['Parent interview: she said "He just does not like reading very much at all" and asked for help.'];

describe('quotation check', () => {
  it('a quote found in the clinician\'s notes passes, whatever the quote marks, case and spacing', () => {
    expect(U.unsourcedQuotes('His mother said, “he just does NOT like  reading very much at all.”', NOTES)).toEqual([]);
  });
  it('a quote found nowhere is listed', () => {
    const notes = U.unsourcedQuotes('His teacher wrote that "he rarely completes independent reading assignments without adult support".', NOTES);
    expect(notes).toHaveLength(1);
    expect(notes[0].quote).toMatch(/rarely completes/);
  });
  it('short quoted terms are not treated as quotations', () => {
    expect(U.unsourcedQuotes('A "strengths-based" approach and "Tier 2" support were used.', NOTES)).toEqual([]);
  });
  it('a quote from a reference passage passes', () => {
    const reg = 'The team may determine that a child has a specific learning disability if the child does not achieve adequately.';
    expect(U.unsourcedQuotes('The regulation states that "the child does not achieve adequately" in reading.', [reg])).toEqual([]);
  });
});

describe('the Verify button reports unsourced quotations without blocking', () => {
  it('lists the fabricated quote and not the real one', async () => {
    const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const React = window.React;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const act = (fn) => React.act(async () => { await fn(); });
    const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    try {
      await act(() => root.render(React.createElement(window.AlloModules.ReportWriter, {
        onClose() {}, callGemini: async () => "{}", addToast: (m, l) => { globalThis.__rwToasts = (globalThis.__rwToasts || []).concat([l + ": " + m]); }, t: key => key,
        studentNickname: 'Student A', behaviorLensData: null, longitudinalData: null, dashboardData: [],
      })));
      const steps = () => Array.from(host.querySelectorAll('nav[aria-label="Report Writer steps"] button'));
      await click(steps()[9]);
      const area = host.querySelector('#rw-import-area');
      await act(() => {
        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(area, JSON.stringify({
          schemaVersion: 2, reportTitle: 'Quote test', manualStudentName: 'Student A',
          scoreEntries: [{ id: 's1', assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 102, scoreType: 'standard' }],
          bgSections: { social: NOTES[0] },
          blueprint: [{ id: 'b1', name: 'Summary', notes: '', enabled: true }],
          factChunks: [{ id: 'c1', type: 'score', source: 'WISC-V', field: 'Full Scale IQ', value: 102, verified: true, immutable: true }],
          reportSections: { Summary: 'On the WISC-V, the Full Scale IQ was 102. His mother said "he just does not like reading very much at all". His teacher wrote that "he rarely completes independent reading assignments without adult support".' },
        }));
        area.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Import Data')));
      await click(steps()[7]);
      await click(host.querySelector('button[aria-label="Verify the current report against the structured scores using the inline psycheck port"]'));
      const panel = host.textContent;
      expect(panel).toMatch(/1 quotation\(s\) with no source found, not blocking/);
      expect(panel).toMatch(/rarely completes independent reading/);
      expect(panel).toMatch(/0 discrepancy\(ies\)/);
    } finally {
      await React.act(async () => root.unmount());
      host.remove();
    }
  }, 30000);
});
