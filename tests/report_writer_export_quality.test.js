// What reaches the finished report.
//
// WHY (2026-09-23), from an audit of the Report Writer:
//   - Redaction replaces names with role tokens ([Mother], [Teacher]) and
//     identifiers with [DATE], [EMAIL]... before any AI call, and the AI writes
//     from that text. Only [Student] was ever put back, so a signed report could
//     read "[Mother] reported..." or "evaluated on [DATE]". The model's citation
//     line also survived when written "**USED_CHUNKS:**" or on the prose line.
//   - Sections were exported in the order they were written, including sections
//     since disabled or removed from the blueprint.
//   - Copy produced plain text only; pasted into Word it lost every heading and
//     the score table.
//   - Translation redacted its own date to [DATE], never asked the model to keep
//     [Student] as written, and a stale translation could still be copied.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, T;
beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
  T = window.AlloReportWriterTesting;
});

describe('the model\'s citation line never stays in the text', () => {
  it('in any common form, with the ids kept intact', () => {
    const cases = [
      'The summary.\nUSED_CHUNKS: c1, ref:ev_ab12',
      'The summary.\n**USED_CHUNKS:** c1, ref:ev_ab12',
      'The summary. USED_CHUNKS: c1, ref:ev_ab12',
      'The summary.\nused_chunks: c1, ref:ev_ab12',
    ];
    for (const raw of cases) {
      const r = T.parseEvidenceResponse(raw);
      expect(r.text, raw).toBe('The summary.');
      expect(r.usedChunks, raw).toEqual(['c1', 'ref:ev_ab12']);
    }
  });
});

describe('placeholders and the export gate', () => {
  it('role and identifier tokens and generation leftovers are found; [Student] and ordinary brackets are not', () => {
    const U = window.AlloModules.ReportWriterUtils;
    const found = U.leftoverPlaceholders({
      Background: '[Student] lives with [Mother]. [Mother] reported concerns on [DATE] [sic].',
      Summary: 'Reading is a strength [ref:ev_ab12].\n**USED_CHUNKS:** c1',
    }, [{ name: 'Maria Lopez', role: 'Mother' }]);
    expect(found.map(f => [f.section, f.token, f.count, f.machine])).toEqual([
      ['Background', '[Mother]', 2, false], ['Background', '[DATE]', 1, false],
      ['Summary', '[ref:ev_ab12]', 1, true], ['Summary', 'USED_CHUNKS', 1, true]]);
  });
  it('a report with placeholders cannot be attested', () => {
    const ok = { hasSections: true, auditStatus: 'passed', auditIsCurrent: true, psycheckIsCurrent: true, clinicianAttested: true };
    expect(T.evaluateExportGate(ok).ready).toBe(true);
    const gate = T.evaluateExportGate({ ...ok, placeholderCount: 1 });
    expect([gate.ready, gate.canAttest, gate.reasons]).toEqual([false, false, ['placeholders']]);
  });
  it('the export follows the blueprint and leaves out disabled sections', () => {
    const U = window.AlloModules.ReportWriterUtils;
    const ordered = U.orderedSections({ Summary: 's', Background: 'b', Recommendations: 'r', Old: 'o' },
      [{ name: 'Background', enabled: true }, { name: 'Recommendations', enabled: false }, { name: 'Summary', enabled: true }]);
    expect(ordered.map(([k]) => k)).toEqual(['Background', 'Summary']);
  });
});

describe('in the workflow', () => {
  let mounted = null;
  afterEach(async () => { if (mounted) { await React.act(async () => mounted.root.unmount()); mounted.host.remove(); mounted = null; } });
  const act = (fn) => React.act(async () => { await fn(); });
  const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  const typeInto = (el, value) => act(() => {
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const wait = () => act(() => new Promise(r => setTimeout(r, 10)));
  const VERIFIED = '{"results":[{"claim":"x","status":"verified","chunkId":"c1","explanation":"ok","confidence":"high"}]}';
  async function mount(callGemini, snapshot) {
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
    await typeInto(host.querySelector('#rw-import-area'), JSON.stringify(snapshot));
    await click(Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Import Data')));
    return { host, steps, addToast };
  }
  const SNAP = (sections, extra = {}) => ({
    schemaVersion: 2, reportTitle: 'Export test', manualStudentName: 'Jordan Lee', studentAge: '10',
    scoreEntries: [{ id: 's1', assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 88, scoreType: 'standard' }],
    factChunks: [{ id: 'c1', type: 'score', source: 'WISC-V', field: 'Full Scale IQ', value: 88, scoreType: 'standard', verified: true, immutable: true }],
    blueprint: [{ id: 'b1', name: 'Background', notes: '', enabled: true }, { id: 'b2', name: 'Summary', notes: '', enabled: true }, { id: 'b3', name: 'Old Notes', notes: '', enabled: false }],
    reportSections: sections, ...extra,
  });

  it('Export & Save lists placeholders and the sections left out, and fills a role with its one person', async () => {
    const ui = await mount(async () => VERIFIED, SNAP({
      Background: '[Student] lives with [Mother]. [Mother] reported reading concerns.',
      Summary: '[Student] earned a Full Scale IQ of 88 on the WISC-V.',
      'Old Notes': 'Disabled section text.',
    }, { reportPeople: [{ name: 'Maria Lopez', role: 'Mother' }] }));
    await click(ui.steps()[9]);
    const panel = () => ui.host.querySelector('[aria-labelledby="rw-placeholders-title"]');
    expect(panel().textContent).toMatch(/\[Mother\] in Background \(2\)/);
    expect(ui.host.textContent).toMatch(/Written but not in the export .*: Old Notes\./);
    await click(Array.from(panel().querySelectorAll('button')).find(b => b.textContent === 'Use Maria Lopez'));
    expect(panel()).toBeNull();
    await click(ui.steps()[7]);
    expect(ui.host.textContent).toContain('Maria Lopez reported reading concerns.');
    expect(ui.host.querySelector('button[aria-label="Undo the last change to Background (edited)"]')).toBeTruthy();
  }, 60000);

  it('a formal copy keeps its formatting, follows the blueprint and has no placeholders', async () => {
    const writes = [];
    const originalClipboard = navigator.clipboard;
    const originalItem = window.ClipboardItem;
    window.ClipboardItem = function ClipboardItem(items) { this.items = items; };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write: async (items) => { writes.push(items); }, writeText: async () => {} } });
    try {
      const ui = await mount(async (p) => (String(p).includes('You are a clinical accuracy auditor') ? VERIFIED : '{"errors":[]}'), SNAP({
        Summary: '[Student] earned a Full Scale IQ of 88 on the WISC-V.',
        Background: '[Student] was referred for reading concerns.',
        'Old Notes': 'Disabled section text.',
      }));
      await click(ui.steps()[8]);
      await click(ui.host.querySelector('button[aria-label="Run accuracy check"]'));
      for (let i = 0; i < 200 && !ui.host.querySelector('button[aria-label="Re-check accuracy"]'); i++) await wait();
      await click(ui.steps()[7]);
      await click(ui.host.querySelector('button[aria-label="Verify the current report against the structured scores using the inline psycheck port"]'));
      await click(ui.steps()[9]);
      const attest = ui.host.querySelector('input[aria-describedby="rw-attestation-help"]');
      expect(attest.disabled).toBe(false);
      await click(attest);
      await click(ui.host.querySelector('button[aria-label="Copy reviewed report to clipboard"]'));
      for (let i = 0; i < 50 && !writes.length; i++) await wait();
      expect(writes).toHaveLength(1);
      const item = writes[0][0].items;
      const html = await item['text/html'].text();
      const plain = await item['text/plain'].text();
      expect(html).toMatch(/<h2[^>]*>Background<\/h2>[\s\S]*<h2[^>]*>Summary<\/h2>/);
      expect(html).toContain('Jordan Lee earned a Full Scale IQ of 88');
      expect(html).not.toContain('Disabled section text');
      expect(plain.indexOf('BACKGROUND')).toBeLessThan(plain.indexOf('SUMMARY'));
      expect(plain).not.toContain('OLD NOTES');
    } finally {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
      window.ClipboardItem = originalItem;
    }
  }, 90000);

  it('translation keeps its date and the [Student] token, and goes stale when the report changes', async () => {
    const prompts = [];
    const ui = await mount(async (p) => { if (String(p).startsWith('Translate the following')) { prompts.push(String(p)); return 'Resumen: [Student] obtuvo 88.'; } return '{"errors":[]}'; },
      SNAP({ Summary: '[Student] earned a Full Scale IQ of 88 on the WISC-V.' }));
    await click(ui.steps()[9]);
    await click(ui.host.querySelector('button[aria-label="Translate report"]'));
    for (let i = 0; i < 100 && !prompts.length; i++) await wait();
    await wait();
    expect(prompts[0]).toContain('Date: ' + new Date().toLocaleDateString());
    expect(prompts[0]).not.toContain('[DATE]');
    expect(prompts[0]).toMatch(/Copy every token in square brackets, such as \[Student\], exactly as written/);
    const copyButton = () => ui.host.querySelector('button[aria-label="Copy unreviewed translated draft"]');
    expect(copyButton().disabled).toBe(false);
    await click(ui.steps()[7]);
    await click(ui.host.querySelector('button[aria-label="Edit section"]'));
    await typeInto(ui.host.querySelector('textarea[aria-label="Edit section text"]'), 'A corrected summary.');
    await click(Array.from(ui.host.querySelectorAll('button')).find(b => b.textContent.trim() === '✅ Save'));
    await click(ui.steps()[9]);
    expect(copyButton().disabled).toBe(true);
    expect(ui.host.textContent).toMatch(/translated draft is of an earlier version/);
  }, 60000);
});
