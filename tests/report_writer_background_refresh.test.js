// Background facts can be extracted again after Steps 2 and 3 change.
//
// WHY (2026-09-23): background and observation facts were extracted once,
// when Step 5 was first opened, and the Extract button only appeared while
// there were no facts at all. Text typed into Steps 2 or 3 afterwards never
// reached the report, and nothing said so. A case that brought in Dynamic
// Assessment or RTI facts first never had its background extracted at all.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, U;
beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
  U = window.AlloModules.ReportWriterUtils || window.AlloModules.ReportWriter.utils;
});

const VERIFIED_FACT = { id: 'bg1', type: 'background', source: 'medical', field: 'Vision', value: 'Wears glasses for reading.', verified: true, immutable: true, origin: 'extracted' };
const DA_FACT = { id: 'da1', type: 'da-summary', source: 'Dynamic Assessment Probe', field: 'Modifiability', value: 'High', verified: true, immutable: false, origin: 'ingested' };
const RTI_LEGACY = { id: 'rti1', type: 'background', source: 'AssessmentCenter (RTI)', field: 'RTI / CBM', value: 'Tier 2 since fall.', verified: true, immutable: false };

describe('merging a new extraction into the facts', () => {
  it('keeps an unchanged fact with its id and verification, adds new ones unverified, and never drops brought-in facts', () => {
    const stale = { id: 'bg2', type: 'background', source: 'social', field: 'Peers', value: 'Few friends.', verified: false, immutable: false };
    const score = { id: 's1', type: 'score', source: 'WISC-V', field: 'Full Scale IQ', value: 97, verified: true, immutable: true };
    const extracted = [
      { id: 'n1', type: 'background', source: 'medical', field: 'vision', value: 'Wears glasses for reading.', verified: false, origin: 'extracted' },
      { id: 'n2', type: 'background', source: 'medical', field: 'Hearing', value: 'Passed hearing screening.', verified: false, origin: 'extracted' },
    ];
    const observation = { id: 'ob1', type: 'observation', source: 'Parent Interview', field: 'Sleep', value: 'Sleeps well.', verified: false, origin: 'extracted' };
    const merged = U.mergeBackgroundFacts([score, VERIFIED_FACT, stale, DA_FACT, observation, RTI_LEGACY], extracted);
    const ids = merged.chunks.map(c => c.id);
    expect(ids).toEqual(['s1', 'da1', 'rti1', 'bg1', 'n2']);
    expect(merged.chunks.find(c => c.id === 'bg1').verified).toBe(true);
    expect(merged.chunks.find(c => c.id === 'n2').verified).toBe(false);
    expect({ kept: merged.kept, added: merged.added, removed: merged.removed }).toEqual({ kept: 1, added: 1, removed: 2 });
  });

  it('reads the source text the way extraction does, skipping empty fields', () => {
    const text = U.backgroundSourceText(
      { referralReason: 'Reading concerns.', medical: '  ' },
      { parentInterview: { text: 'Sleeps well.', source: 'Parent Interview' }, testSession: { text: '', source: 'Test Session Observations' } });
    expect(text).toBe('referralReason: Reading concerns.\n\n[Source: Parent Interview]\nSleeps well.');
  });
});

let mounted = null;
afterEach(async () => { if (mounted) { await React.act(async () => mounted.root.unmount()); mounted.host.remove(); mounted = null; } });
const act = (fn) => React.act(async () => { await fn(); });
const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const wait = () => act(() => new Promise(r => setTimeout(r, 10)));
const typeInto = (el, value) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
const SNAP = (extra = {}) => ({
  schemaVersion: 2, reportTitle: 'Background refresh', manualStudentName: 'Student A',
  bgSections: { medical: 'Wears glasses for reading.' },
  factChunks: [VERIFIED_FACT, DA_FACT],
  blueprint: [{ id: 'b1', name: 'Summary', notes: '', enabled: true }], reportGenPasses: 1, reportSections: {},
  ...extra,
});
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
  const button = (text) => Array.from(host.querySelectorAll('button')).find(b => b.textContent.trim() === text);
  return { host, steps, button, toasts: () => addToast.mock.calls.map(c => String(c[0])) };
}

describe('Fact Chunk Review', () => {
  it('says when Steps 2 and 3 changed after extraction, and extracting again keeps what was verified', async () => {
    const callGemini = vi.fn(async () => JSON.stringify([
      { type: 'background', source: 'medical', field: 'Vision', value: 'Wears glasses for reading.', category: 'medical' },
      { type: 'background', source: 'medical', field: 'Hearing', value: 'Failed a hearing screening in May.', category: 'medical' },
    ]));
    const ui = await mount(callGemini, SNAP());
    await click(ui.steps()[4]);
    // A report saved before the fingerprint existed is taken as in step.
    expect(ui.host.textContent).not.toMatch(/changed after the facts were extracted|have not been extracted/);
    expect(callGemini).not.toHaveBeenCalled();

    await click(ui.steps()[1]);
    await typeInto(ui.host.querySelector('textarea[aria-label="Medical History"]'), 'Wears glasses for reading. Failed a hearing screening in May.');
    await click(ui.steps()[4]);
    expect(ui.host.textContent).toMatch(/changed after the facts were extracted, so the report would not include the changes/);

    await click(ui.button('Extract background facts again'));
    for (let i = 0; i < 100 && !ui.toasts().some(m => /extracted again/.test(m)); i++) await wait();
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(String(callGemini.mock.calls[0][0])).toContain('Failed a hearing screening in May.');
    expect(ui.toasts().join(' ')).toMatch(/Background facts extracted again: 1 new \(verify them below\), 1 unchanged, 0 no longer in the text\./);
    expect(ui.host.textContent).not.toMatch(/changed after the facts were extracted/);
    // The verified fact is still verified; the new one is pending; the DA fact stayed.
    expect(ui.host.textContent).toContain('Wears glasses for reading.');
    expect(ui.host.textContent).toContain('Failed a hearing screening in May.');
    expect(ui.host.textContent).toContain('Dynamic Assessment Probe');
    expect(ui.host.textContent).toMatch(/2 verified/);
    expect(ui.host.textContent).toMatch(/1 pending/);
  }, 90000);

  it('the first extraction is not reported as out of date', async () => {
    const ui = await mount(vi.fn(async () => JSON.stringify([{ type: 'background', source: 'medical', field: 'Vision', value: 'Wears glasses.' }])),
      SNAP({ factChunks: [] }));
    await click(ui.steps()[4]);
    for (let i = 0; i < 100 && !ui.toasts().some(m => /Extracted/.test(m)); i++) await wait();
    expect(ui.host.textContent).toContain('Wears glasses.');
    expect(ui.host.textContent).not.toMatch(/changed after the facts were extracted|have not been extracted/);
  }, 90000);

  it('offers extraction when only brought-in facts exist', async () => {
    const ui = await mount(vi.fn(async () => '[]'), SNAP({ factChunks: [DA_FACT] }));
    await click(ui.steps()[4]);
    expect(ui.host.textContent).toMatch(/Facts have not been extracted from the background or observations/);
    expect(ui.button('Extract background facts')).toBeTruthy();
  }, 90000);

  it('a saved fingerprint that no longer matches the text is reported after loading', async () => {
    const ui = await mount(vi.fn(async () => '[]'), SNAP({ bgExtractedHash: 'deadbeef:3' }));
    await click(ui.steps()[4]);
    expect(ui.host.textContent).toMatch(/changed after the facts were extracted/);
  }, 90000);

  it('keeps the old facts when every part of the extraction fails', async () => {
    const ui = await mount(vi.fn(async () => { throw new Error('network'); }), SNAP({ bgExtractedHash: 'deadbeef:3' }));
    await click(ui.steps()[4]);
    await click(ui.button('Extract background facts again'));
    for (let i = 0; i < 100 && !ui.toasts().some(m => /extraction failed/.test(m)); i++) await wait();
    expect(ui.toasts().join(' ')).toMatch(/Background fact extraction failed on 1 of 1 part/);
    expect(ui.host.textContent).toContain('Wears glasses for reading.');
    expect(ui.host.textContent).toMatch(/changed after the facts were extracted/);
  }, 90000);
});
