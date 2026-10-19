import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let H, handler;
const base = extra => ({ id: 'one', target: 'Water cycle', mode: 'generated', type: 'story-chain', essentialFacts: ['Water evaporates when heated.'], factLocked: true, factVerified: true, aiExample: 'A sunny stair carries water upward.', mapping: 'The sunny stair means water evaporates when heated.', ...extra });
beforeAll(() => {
  global.React = window.React = require(resolve('desktop/web-app/node_modules/react'));
  loadAlloModule('memory_aid_module.js'); H = window.AlloModules.MemoryAid._testing;
  const source = readFileSync('view_export_preview_source.jsx', 'utf8');
  const marker = source.indexOf('// Send to NotebookLM:');
  const start = source.lastIndexOf('if (altExportBusy) return;', marker), end = source.indexOf('}} className=', marker);
  expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  handler = new AsyncFunction('window', 'history', 'exportConfig', 'exportPreviewRef', 'beginAlternativeExport', 'finishAlternativeExport', 'downloadBuilderBlob', 'addToast', 't', 'altExportBusy', 'Blob', source.slice(start, end));
});
afterEach(() => vi.restoreAllMocks());
async function notebook(card) {
  class CaptureBlob { constructor(parts) { this.text = parts.join(''); } }
  const download = vi.fn(), toast = vi.fn(), finish = vi.fn();
  await handler(window, [{ id: 'notebook-integrity', type: 'memory-aid', title: 'Water cycle', data: { cards: [card], sourceExcerpt: 'PRIVATE_SOURCE', lessonRef: { sourceTextSnippet: 'PRIVATE_SNIPPET' } } }], {}, { current: null }, () => true, finish, download, toast, key => key, false, CaptureBlob);
  expect(toast.mock.calls.some(call => call[1] === 'error')).toBe(false);
  expect(download).toHaveBeenCalledOnce(); expect(finish).toHaveBeenCalledOnce();
  return download.mock.calls[0][0].text;
}

describe('NotebookLM uses only current Memory Aid explanations', () => {
  it('omits a held old cue and mapping while retaining current facts and a review notice', async () => {
    const original = H.normalizeMemoryAidCard(base(), 0, {});
    let revised = H.applyMemoryAidCardPatch(original, { essentialFacts: ['Water condenses when cooled.'] });
    revised = H.applyMemoryAidCardPatch(revised, { factVerified: true });
    const md = await notebook(revised);
    expect(md).toContain('Water condenses when cooled.');
    expect(md).toContain('Cue review required'); expect(md).toContain('waiting for teacher review');
    expect(md).not.toContain(original.aiExample); expect(md).not.toContain(original.mapping);
  });
  it('directs a learner-only hold to reviewing their own cue', async () => {
    const md = await notebook(base({ studentDraft: 'My old cue.', cueNeedsReview: true, studentCueNeedsReview: true, teacherCueNeedsReview: false }));
    expect(md).toContain('Check your earlier cue against the current facts');
    expect(md).not.toContain('waiting for teacher review'); expect(md).not.toContain('My old cue.');
  });
  it('keeps a personalized cue without appending its archived teacher mapping', async () => {
    const c = H.applyMemoryAidCardPatch(H.normalizeMemoryAidCard(base(), 0, {}), { studentDraft: 'My elevator lifts water.' });
    const md = await notebook(c);
    expect(md).toContain(c.studentDraft); expect(md).not.toContain(c.mapping);
  });
  it('exports current learner connections instead of the original mapping', async () => {
    let c = H.applyMemoryAidCardPatch(H.normalizeMemoryAidCard(base(), 0, {}), { studentDraft: 'My elevator lifts water.' });
    c = { ...c, studentConnections: [{ factKey: H.memoryAidConnectionFactKeys(c)[0], cueKey: H.memoryAidConnectionKey(c), cue: 'Elevator', explanation: 'Heat carries water upward as vapor.' }] };
    const md = await notebook(c);
    expect(md).toContain('**Elevator**: Water evaporates when heated. Heat carries water upward as vapor.');
    expect(md).not.toContain(c.mapping);
  });
  it('omits connections saved for an earlier personalized cue', async () => {
    let c = H.normalizeMemoryAidCard(base({ studentDraft: 'My elevator lifts water.' }), 0, {});
    c = { ...c, studentConnections: [{ factKey: H.memoryAidConnectionFactKeys(c)[0], cueKey: 'earlier-cue', cue: 'OLD_CONNECTION', explanation: 'OLD_EXPLANATION' }] };
    const md = await notebook(c); expect(md).not.toContain('OLD_'); expect(md).not.toContain(c.mapping);
  });
  it('preserves a mapping still attached to the current teacher cue', async () => {
    const c = H.normalizeMemoryAidCard(base(), 0, {}), md = await notebook(c);
    expect(md).toContain(c.aiExample); expect(md).toContain(c.mapping);
  });
  it('withholds held cues and mappings when the shared helpers are unavailable', async () => {
    const c = base({ cueNeedsReview: true }), memory = window.AlloModules.MemoryAid;
    try {
      delete window.AlloModules.MemoryAid;
      const md = await notebook(c); expect(md).toContain('Cue review required');
      expect(md).not.toContain(c.aiExample); expect(md).not.toContain(c.mapping);
    } finally { window.AlloModules.MemoryAid = memory; }
  });
  it('keeps private source, practice evidence and feedback out of the notebook', async () => {
    const md = await notebook(base({ practiceAttempts: [{ response: 'PRIVATE_ATTEMPT' }], feedback: { strength: 'PRIVATE_FEEDBACK' } }));
    expect(md).not.toContain('PRIVATE_');
  });
});
