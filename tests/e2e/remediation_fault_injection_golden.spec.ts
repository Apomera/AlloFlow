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
//
// HOST DECLARATION (2026-09-22): every run passes extraRequestPacing: false, the per-run option the
// batch path passes from the teacher's setting. The scripted model has no provider quota, so this
// harness is a direct-API host. Undeclared, it inherited the Canvas default, whose rolling budget
// (5 call starts per 180s for a "scanned" doc; this 94-character fixture qualifies) idled every
// scenario ~180s; once the run gained a call (2026-09-15), C's retry became a sixth start, waited a
// second window (~6.3 min) and hit the 300s timeout as "Target page... closed" in every CI run.
// Given time, the product recovered correctly under pacing too. The gate is covered by the unit
// suites (gemini_pacing_stagger, remediation_pacing_preference); each scenario asserts pacing off.
import { test, expect } from '@playwright/test';
import * as path from 'path';

const VERIFICATION_POLICY_PATH = path.resolve(__dirname, '../../verification_policy_module.js');
const RENDERER_MODULE_PATH = path.resolve(__dirname, '../../doc_builder_renderer_module.js');
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
    await page.addScriptTag({ path: VERIFICATION_POLICY_PATH });
    await page.addScriptTag({ path: RENDERER_MODULE_PATH });
    await page.addScriptTag({ path: MODULE_PATH });
    await page.waitForFunction(() => !!(window as any).AlloModules?.VerificationPolicy && !!(window as any).AlloModules?.DocBuilderRenderer && !!(window as any).AlloModules?.createDocPipeline, null, { timeout: 20000 });

    // Scenario runner: builds a FRESH pipeline with a scheduled dispatcher, runs audit + fix,
    // returns the result's honesty-relevant fields + call/elapsed accounting.
    await page.evaluate(() => {
      const w = window as any;
      w.__runScenario = async (b64: string, mode: string) => {
        const calls: any[] = [];
        let blipped = false;
        // _parseStrictInitialAudit (2026-08) requires full metadata (pageCount, has* booleans)
        // and canonical issue records (ruleId + claimKind + count) — mirror the real contract.
        const auditPdfJson = JSON.stringify({ score: 55, summary: 'scripted audit', confidence: 'high', documentLanguage: 'en', pageCount: 1, hasSearchableText: true, hasImages: true, hasTables: false, hasForms: false, critical: [], serious: [{ issue: 'Images without alternative text', wcag: '1.1.1', location: 'page 1', ruleId: 'image-alt', claimKind: 'absence', count: 1 }], moderate: [], minor: [], passes: ['document has a title', 'searchable text present', 'reading order is linear', 'language is declared'] });
        const auditHtmlJson = JSON.stringify({ score: 88, summary: 'scripted html audit', issues: [], passes: ['lang present', 'headings are hierarchical', 'landmarks present', 'link text is descriptive', 'contrast passes AA'] });
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
          // Classified on the FULL prompt: every prompt now opens with a security-boundary
          // preamble, so the first 50 characters never reach the auditor instruction.
          calls.push({ kind, htmlAudit: /accessibility auditor\. Audit this HTML/i.test(String(prompt)) });
          return dispatch(String(prompt));
        };
        const pipeline = w.AlloModules.createDocPipeline({
          callGemini: mk('text'), callGeminiVision: mk('vision'), callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false,
          updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
        });
        w.__activePipeline = pipeline; // read by the scenario-budget diagnostic if this run hangs
        const t0 = Date.now();
        const audit = await pipeline.runPdfAccessibilityAudit(b64, { skipUiUpdates: true, skipCache: true, fileName: 'fault-' + mode + '.pdf', extraRequestPacing: false });
        let result: any = null, runError: string | null = null;
        try {
          // documentEpoch: production callers always stamp the run's ownership epoch
          // (2026-08-03 fail-closed guard); the harness stamps one the same way.
          result = await pipeline.fixAndVerifyPdf({
            documentEpoch: 1,
            base64: b64, fileName: 'fault-' + mode + '.pdf', auditResult: audit,
            targetScore: 80, autoFixPasses: 1, polishPasses: 0, onProgress: () => {},
            extraRequestPacing: false,
          });
        } catch (e: any) { runError = String((e && e.message) || e); }
        const elapsedMs = Date.now() - t0;
        const htmlAuditCalls = calls.filter((c) => c.htmlAudit).length;
        // The pipeline's own per-call ledger: one record per LOGICAL call, with how many transport
        // attempts it took and how it ended. This is what proves a retry recovered the SAME call,
        // rather than some later call happening to succeed.
        const snap = pipeline.getDiagnosticSnapshot() || {};
        const ledger = (snap.calls || []).map((r: any) => ({ route: r.route, operation: r.operation, attempts: r.attempts, outcome: r.outcome }));
        const wait = (pipeline.geminiThrottleInfo() || {}).wait || {};
        return {
          blipped, ledger, pacingWaitMs: wait.pacingMs, extraRequestPacing: wait.extraRequestPacing,
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

  // A hung run used to surface only as "Target page, context or browser has been closed" once the
  // test timeout tore the page down. Bound each run below that timeout and, on expiry, report what
  // the gate was waiting on, so the failure names its cause.
  const SCENARIO_BUDGET_MS = 240000;
  const runScenario = async (mode: string) => {
    let timer: any;
    const expired = new Promise((resolve) => { timer = setTimeout(() => resolve('__expired__'), SCENARIO_BUDGET_MS); });
    const out: any = await Promise.race([page.evaluate(({ b64, m }: any) => (window as any).__runScenario(b64, m), { b64: textB64, m: mode }), expired]);
    clearTimeout(timer);
    if (out === '__expired__') {
      const gate = await page.evaluate(() => {
        const p = (window as any).__activePipeline;
        const calls = ((p && p.getDiagnosticSnapshot() || {}).calls || []).slice(-4);
        return { wait: p && p.geminiThrottleInfo().wait, lastCalls: calls.map((r: any) => [r.route, r.operation, r.attempts, r.outcome]) };
      });
      throw new Error('scenario ' + mode + ' did not finish within ' + (SCENARIO_BUDGET_MS / 1000) + 's; gate state: ' + JSON.stringify(gate));
    }
    // The host declaration took effect: no call ever waited on Canvas pacing.
    expect(out.extraRequestPacing).toBe(false);
    expect(out.pacingWaitMs).toBe(0);
    return out;
  };

  test('A: per-day quota on every HTML audit → completes, honestly degraded, NO retry grind', async () => {
    const out = await runScenario('quota-perday');
    expect(out.runError).toBeNull();                     // the run never throws at the teacher
    expect(out.hasHtml).toBe(true);                      // the document itself survived
    expect(out.htmlHasSourceText).toBe(true);
    expect(out.aiIncomplete).toBe(true);                 // honesty flag SET — no fake verified score
    // H2: explicit per-day quota is PERMANENT — no retries, no breaker cooldowns, no circle-back
    // waiting. The ledger shows it directly: every logical call took exactly one attempt.
    expect(out.ledger.length).toBeGreaterThan(0);
    expect(out.ledger.filter((r: any) => r.attempts !== 1)).toEqual([]);
    // The bounds catch multi-minute retry grinds / a spent wait budget, not the happy path. Measured
    // ~21s locally with pacing off (the old ~186s was one idle Canvas pacing window, not a slow
    // runner); 120s is ~6x headroom, and below SCENARIO_BUDGET_MS so it can still fail.
    // totalCalls is the precise grind detector:
    expect(out.elapsedMs).toBeLessThan(120000);
    expect(out.totalCalls).toBeLessThan(40);
  });

  test('B: every HTML audit returns non-JSON → completes, degraded honestly, bounded (calm ⇒ no circle-back loop)', async () => {
    const out = await runScenario('garbage');
    expect(out.runError).toBeNull();
    expect(out.hasHtml).toBe(true);
    expect(out.htmlHasSourceText).toBe(true);
    expect(out.aiIncomplete).toBe(true);                 // a parse-failed audit must not masquerade as verified
    // Genuine content failure with a CALM gate: the circle-back's stop-improving guard must end it —
    // the run may retry within each audit's self-heal but must not spiral. Same headroom
    // rationale as scenario A (measured ~21s locally).
    expect(out.elapsedMs).toBeLessThan(120000);
    expect(out.totalCalls).toBeLessThan(60);
  });

  test('C: one transient timeout blip → retry recovers; the run is NOT flagged degraded', async () => {
    const out = await runScenario('blip-once');
    expect(out.blipped).toBe(true);                      // the scripted fault actually fired
    // Exactly one logical call needed a second attempt, and that SAME call ended in success: the
    // retry recovered it. Without this, a run whose retry was removed could still pass, because a
    // later audit succeeding would leave the honesty flags just as clean.
    const retried = out.ledger.filter((r: any) => r.attempts > 1);
    expect(retried).toHaveLength(1);
    expect(retried[0].route).toBe('text');
    expect(retried[0].outcome).toBe('success');
    expect(out.runError).toBeNull();
    expect(out.hasHtml).toBe(true);
    expect(out.htmlHasSourceText).toBe(true);
    expect(out.aiIncomplete).toBe(false);                // honesty flags must not false-positive on a recovered blip
    expect(typeof out.afterScore).toBe('number');        // a real verified headline shipped
    expect(out.afterScore).toBeGreaterThan(0);
  });
});
