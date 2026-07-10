// Fault-injection run goldens (deep dive 2026-07-09, goldens item 4).
//
// The deepest previously-uncovered class: what a WHOLE fixAndVerifyPdf run produces when the model
// fails in a specific way. The corpus golden runs the real pipeline end-to-end but its scripted
// Gemini always succeeds — so the honesty machinery for failure paths (degraded flags, withheld
// scores, throttle attribution, retry bounds) had no executable spec. M1 (a NULL final audit under
// storm shipped degraded instantly with the whole wait budget unused) lived exactly here.
//
// Three scheduled-failure scenarios against the REAL module in Chromium (fresh createDocPipeline per
// scenario — the gate/breaker is a factory singleton and must not leak between scenarios):
//
//   A. per-day quota kills every HTML audit  → run COMPLETES, honestly degraded, and FAST
//      (H2: explicit per-day is permanent — no retry grind, no breaker trip, no circle-back wait)
//   B. every HTML audit returns non-JSON     → run completes, degraded honestly, bounded calls
//      (genuine content failure: the circle-back's calm stop-improving guard must not loop)
//   C. ONE transient timeout blip, then fine → retry recovers; the run is NOT flagged degraded
//      (the honesty flags must not false-positive on a recovered blip)
//
// Each scenario asserts the result's honesty invariants + call-count/elapsed bounds (a retry storm
// or an unbounded circle-back fails the golden even if the run eventually "works").
import { test, expect } from '@playwright/test';
import * as path from 'path';

const MODULE_PATH = path.resolve(__dirname, '../../doc_pipeline_module.js');
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

test.describe.configure({ mode: 'serial' });
test.setTimeout(300000);

let page: any = null;
let textB64 = '';

test.describe('remediation fault injection — scheduled model failures, honest results', () => {
  test.beforeAll(async ({ browser }) => {
    // Fixture-builder page (pdf-lib only here; the pipeline page self-loads its own).
    const builder = await browser.newPage();
    await builder.goto('about:blank');
    await builder.addScriptTag({ url: PDFLIB_CDN });
    await builder.waitForFunction(() => !!(window as any).PDFLib?.PDFDocument, null, { timeout: 30000 });
    textB64 = await builder.evaluate(async () => {
      const { PDFDocument, StandardFonts } = (window as any).PDFLib;
      const t = await PDFDocument.create();
      const font = await t.embedFont(StandardFonts.Helvetica);
      const p1 = t.addPage([612, 792]);
      p1.drawText('Photosynthesis Study Guide', { x: 50, y: 740, size: 22, font });
      p1.drawText('Plants convert light energy into chemical energy stored as glucose.', { x: 50, y: 700, size: 12, font });
      const bytes = await t.save();
      let bin = ''; const CH = 0x8000;
      for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CH)) as any);
      return btoa(bin);
    });
    await builder.close();

    page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ path: MODULE_PATH });
    await page.waitForFunction(() => !!(window as any).AlloModules?.createDocPipeline, null, { timeout: 20000 });

    // Scenario runner: builds a FRESH pipeline with a scheduled dispatcher, runs audit + fix,
    // returns the result's honesty-relevant fields + call/elapsed accounting.
    await page.evaluate(() => {
      const w = window as any;
      w.__runScenario = async (b64: string, mode: string) => {
        const calls: any[] = [];
        let blipped = false;
        const auditPdfJson = JSON.stringify({ score: 55, summary: 'scripted audit', confidence: 'high', documentLanguage: 'en', critical: [], serious: [{ issue: 'Images without alternative text', wcag: '1.1.1', location: 'page 1' }], moderate: [], minor: [], passes: ['document has a title'] });
        const auditHtmlJson = JSON.stringify({ score: 88, summary: 'scripted html audit', issues: [], passes: ['lang present'] });
        const dispatch = (prompt: string) => {
          // PDF (Vision) audit — the pre-remediation baseline must succeed in every scenario so
          // fixAndVerifyPdf has an auditResult to start from.
          if (/accessibility auditor for educational documents/i.test(prompt) || /SLICE CONTEXT/i.test(prompt)) return auditPdfJson;
          // HTML audits (fix-loop verify + final authoritative audit) — the fault target.
          if (/accessibility auditor\. Audit this HTML/i.test(prompt)) {
            if (mode === 'quota-perday') {
              const e: any = new Error('API_QUOTA_EXHAUSTED');
              e.isQuota = true; e.classification = { kind: 'quota', perMinute: false, perDay: true };
              throw e;
            }
            if (mode === 'garbage') return 'I refuse to answer in the requested format.';
            if (mode === 'blip-once' && !blipped) { blipped = true; throw new Error('Timeout after 1ms (scripted blip)'); }
            return auditHtmlJson;
          }
          if (/Return ONLY a JSON array/i.test(prompt)) return JSON.stringify([
            { type: 'h1', text: 'Photosynthesis Study Guide', id: 'photosynthesis-study-guide' },
            { type: 'p', text: 'Plants convert light energy into chemical energy stored as glucose.' },
          ]);
          if (/Extract ALL text content/i.test(prompt)) return '# Photosynthesis Study Guide\nPlants convert light energy into chemical energy stored as glucose.';
          return '{}';
        };
        const mk = (kind: string) => async (prompt: string) => {
          calls.push({ kind, head: String(prompt).slice(0, 50) });
          return dispatch(String(prompt));
        };
        const pipeline = w.AlloModules.createDocPipeline({
          callGemini: mk('text'), callGeminiVision: mk('vision'), callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false,
          updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
        });
        const t0 = Date.now();
        const audit = await pipeline.runPdfAccessibilityAudit(b64, { skipUiUpdates: true, skipCache: true, fileName: 'fault-' + mode + '.pdf' });
        let result: any = null, runError: string | null = null;
        try {
          result = await pipeline.fixAndVerifyPdf({
            base64: b64, fileName: 'fault-' + mode + '.pdf', auditResult: audit,
            targetScore: 80, autoFixPasses: 1, polishPasses: 0, onProgress: () => {},
          });
        } catch (e: any) { runError = String((e && e.message) || e); }
        const elapsedMs = Date.now() - t0;
        const htmlAuditCalls = calls.filter((c) => /auditor\. Audit this HTML|Audit this HTML/i.test(c.head) || /WCAG 2\.1 AA accessibility auditor/i.test(c.head)).length;
        return {
          runError, elapsedMs, totalCalls: calls.length, htmlAuditCalls,
          hasHtml: !!(result && typeof result.accessibleHtml === 'string' && result.accessibleHtml.length > 50),
          htmlHasSourceText: !!(result && /Photosynthesis|light energy/i.test(result.accessibleHtml || '')),
          aiIncomplete: !!(result && result._aiVerificationIncomplete),
          afterScore: result ? result.afterScore : undefined,
          estMin: result ? result._estimatedMinimumScore : undefined,
          estBasis: result ? result._estimatedScoreBasis : undefined,
          scoreSource: result ? result._scoreSource : undefined,
        };
      };
    });
  });

  test.afterAll(async () => { if (page) await page.close(); });

  test('A: per-day quota on every HTML audit → completes, honestly degraded, NO retry grind', async () => {
    const out = await page.evaluate(({ b64 }: any) => (window as any).__runScenario(b64, 'quota-perday'), { b64: textB64 });
    expect(out.runError).toBeNull();                     // the run never throws at the teacher
    expect(out.hasHtml).toBe(true);                      // the document itself survived
    expect(out.htmlHasSourceText).toBe(true);
    expect(out.aiIncomplete).toBe(true);                 // honesty flag SET — no fake verified score
    // H2: explicit per-day quota is PERMANENT — no retries, no breaker cooldowns, no circle-back
    // waiting. The bounds exist to catch multi-minute retry grinds / a spent 10-minute wait budget,
    // not to time the happy path (measured ~66s incl. real pdf.js extraction; headroom for CI):
    expect(out.elapsedMs).toBeLessThan(150000);
    expect(out.totalCalls).toBeLessThan(40);
  });

  test('B: every HTML audit returns non-JSON → completes, degraded honestly, bounded (calm ⇒ no circle-back loop)', async () => {
    const out = await page.evaluate(({ b64 }: any) => (window as any).__runScenario(b64, 'garbage'), { b64: textB64 });
    expect(out.runError).toBeNull();
    expect(out.hasHtml).toBe(true);
    expect(out.htmlHasSourceText).toBe(true);
    expect(out.aiIncomplete).toBe(true);                 // a parse-failed audit must not masquerade as verified
    // Genuine content failure with a CALM gate: the circle-back's stop-improving guard must end it —
    // the run may retry within each audit's self-heal but must not spiral.
    expect(out.elapsedMs).toBeLessThan(120000);
    expect(out.totalCalls).toBeLessThan(60);
  });

  test('C: one transient timeout blip → retry recovers; the run is NOT flagged degraded', async () => {
    const out = await page.evaluate(({ b64 }: any) => (window as any).__runScenario(b64, 'blip-once'), { b64: textB64 });
    expect(out.runError).toBeNull();
    expect(out.hasHtml).toBe(true);
    expect(out.htmlHasSourceText).toBe(true);
    expect(out.aiIncomplete).toBe(false);                // honesty flags must not false-positive on a recovered blip
    expect(typeof out.afterScore).toBe('number');        // a real verified headline shipped
    expect(out.afterScore).toBeGreaterThan(0);
  });
});
