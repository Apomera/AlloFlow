// Output-audit storm/recover golden (2026-07-03) — real doc_pipeline_module.js, scripted Gemini.
// Proves the SUBSTRATE that throttle-resilience fix B relies on, on the actual module:
//   (1) a THROWN "Empty response body" (a real transient/throttle error, NOT an empty string) on one
//       audit section makes auditOutputAccessibility return a PARTIAL result (chunksAudited < requested)
//       — this is the exact "2/3 sections audited" condition from the reported run.
//   (2) once the failing condition clears, a SECOND audit of the same HTML restores FULL coverage while
//       only actually calling Gemini for the previously-failed section — the temp-0 chunk memo serves
//       the already-succeeded sections for free. This is why B's deferred re-audit costs ~1 call.
// B's wrapper logic (cooldown wait + adopt-if-coverage-increased), A's predicate, and D's reframe are
// pinned/mirrored in tests/output_audit_storm_resilience.test.js (they live inside fixAndVerifyPdf /
// _runMainFixLoop, which need axe/EA/pdf — the documented headless boundary).

import { test, expect } from '@playwright/test';
import * as path from 'path';

const MODULE_PATH = path.resolve(__dirname, '../../doc_pipeline_module.js');

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

let page: any = null;

// Build a >32 KB HTML so auditOutputAccessibility splits it into 3 chunks (stride 15 200). The unique
// FAIL marker sits past ~33 KB so it lands ONLY in chunk 3 (chunk 2 ends ~31.2 KB).
const FAIL_MARKER = 'ZZZ_FAIL_SECTION_THREE_MARKER';
function bigHtml(): string {
  const block = '<p>Assessment procedures and background information paragraph with enough words to size the chunk boundaries deterministically for this golden. </p>\n';
  let h = '<!DOCTYPE html>\n<html lang="en"><head><title>Storm Golden</title></head><body><main>\n';
  for (let i = 0; i < 240; i++) h += block; // ~33 KB before the marker
  h += `<p>${FAIL_MARKER} section three content that fails under the scripted storm.</p>\n`;
  for (let i = 0; i < 40; i++) h += block; // pad chunk 3
  h += '</main></body></html>';
  return h;
}

test.describe('output audit — storm partial + memo-cheap recovery (real module)', () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ path: MODULE_PATH });
    await page.waitForFunction(() => !!(window as any).AlloModules?.createDocPipeline, null, { timeout: 20000 });
    await page.evaluate(() => {
      const w = window as any;
      w.__realCalls = 0;
      w.__mode = 'throw'; // 'throw' | 'parsemiss' | 'ok'  (controls how the FAIL chunk behaves)
      const auditJson = JSON.stringify({ score: 90, summary: 'scripted audit', confidence: 'high', issues: [], passes: ['document has a title', 'lang present'] });
      const callGemini = async (prompt: string) => {
        w.__realCalls++;
        const isFailChunk = String(prompt).includes('ZZZ_FAIL_SECTION_THREE_MARKER');
        if (isFailChunk && w.__mode === 'throw') throw new Error('Empty response body from Gemini');
        if (isFailChunk && w.__mode === 'parsemiss') return 'not-json-at-all <<<'; // parse miss → chunk fails, no breaker trip
        return auditJson;
      };
      w.__pipeline = w.AlloModules.createDocPipeline({
        callGemini,
        callGeminiVision: async () => auditJson,
        callImagen: async () => null,
        addToast: () => {}, t: (k: string) => k, isRtlLang: () => false,
        updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
      });
    });
  });

  test.afterAll(async () => { if (page) await page.close(); });

  test('a THROWN empty-body on one section → PARTIAL audit (the 2/3 condition)', async () => {
    const out = await page.evaluate(async (html: string) => {
      const w = window as any;
      w.__mode = 'throw';
      const res = await w.__pipeline.auditOutputAccessibility(html);
      return { partial: res && res._partialAudit, audited: res && res.chunksAudited, requested: res && res.chunksRequested, score: res && res.score };
    }, bigHtml());
    expect(out.requested).toBe(3);              // >32KB → 3 chunks
    expect(out.partial).toBe(true);             // one section could not be audited
    expect(out.audited).toBe(2);                // exactly the reported "2/3"
    expect(typeof out.score).toBe('number');    // kept + scored (1/3-failed is not nulled)
  });

  test('re-audit after the failure clears → FULL coverage, only +1 real Gemini call (memo proof)', async () => {
    const out = await page.evaluate(async (html: string) => {
      const w = window as any;
      // First audit fails the 3rd section via a parse miss (no breaker/cooldown → fast + deterministic),
      // memoizing sections 1 & 2. Then clear the failure and re-audit.
      w.__mode = 'parsemiss';
      const first = await w.__pipeline.auditOutputAccessibility(html);
      const callsAfterFirst = w.__realCalls;
      w.__mode = 'ok';                          // the rate-limit "eased"
      const second = await w.__pipeline.auditOutputAccessibility(html);
      const delta = w.__realCalls - callsAfterFirst;
      return {
        firstPartial: first && first._partialAudit, firstAudited: first && first.chunksAudited,
        secondPartial: second && second._partialAudit, secondAudited: second && second.chunksAudited,
        secondRequested: second && second.chunksRequested, reCallDelta: delta,
      };
    }, bigHtml());
    expect(out.firstPartial).toBe(true);
    expect(out.firstAudited).toBe(2);
    // recovery:
    expect(out.secondPartial).toBeFalsy();      // full coverage restored
    expect(out.secondAudited).toBe(3);
    expect(out.secondAudited).toBe(out.secondRequested);
    // THE POINT of B being cheap: the two already-good sections are served from the memo, so the
    // re-audit calls Gemini for exactly the ONE previously-failed section.
    expect(out.reCallDelta).toBe(1);
  });
});
