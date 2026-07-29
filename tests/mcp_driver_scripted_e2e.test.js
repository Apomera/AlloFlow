// Behavioral e2e for the remediation MCP driver — a REAL remediate + auto-continue run in
// headless Chromium against a SCRIPTED loopback Gemini (no key, no quota, no live model).
//
// This is the driver-level analogue of tests/e2e/remediation_fault_injection_golden.spec.ts:
// the same real modules and the same real fixAndVerifyPdf, but reached through everything the
// protocol smoke CANNOT see — the Node fetch transport (via ALLOFLOW_MCP_GEMINI_BASE), the
// exposeFunction bridge, page boot, the primary pass, and the v1.5 auto-continue loop with its
// canonical-reducer merges and stagnation stop.
//
// Determinism: the pipeline's scoring is deduction-grounded (it derives scores from the issue
// lists and IGNORES the AI's claimed number — the 2026-06-21 honesty redesign), so exact
// scores are the pipeline's business, not this script's. We pin the target at 100 instead:
// the weak audit's standing issue keeps every round below target, both auto-continue rounds
// always fire (AI-fix branch), each merge goes through finalizeRemediationRound, and the
// two-stall guard ends the loop. Score-improvement paths are covered by the reducer's own
// unit/parity suites — this proves the loop machinery end-to-end.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

vi.setConfig({ testTimeout: 360000, hookTimeout: 60000 });

const requireCjs = createRequire(import.meta.url);

let server = null;
let driver = null;
const calls = { total: 0, htmlAudits: 0, chunkish: 0, probes: 0 };

// These stubs must emit what the pipeline's own prompts INSTRUCT a model to emit — the audit
// replies are strict-parsed (_parseStrictInitialAudit / _requireStrictOutputAudit) and a reply
// that misses the contract is discarded as "no usable evidence" (score -1), which the baseline
// gate then correctly refuses to remediate from. Contract source of truth: the JSON skeletons in
// doc_pipeline_source.jsx (initial audit ~L13962, output audit ~L15704). Required per issue:
// ruleId (canonical enum), claimKind, count. Required per reply: confidence, pageCount,
// hasSearchableText, hasImages, hasTables, hasForms, documentLanguage.
const AUDIT_PDF = JSON.stringify({
  score: 55, summary: 'scripted PDF audit', confidence: 'high', documentLanguage: 'en',
  pageCount: 1, hasSearchableText: true, hasImages: true, hasTables: false, hasForms: false,
  critical: [],
  serious: [{ ruleId: 'image-alt', claimKind: 'absence', issue: 'Images without alternative text', wcag: '1.1.1', count: 1, location: 'page 1' }],
  moderate: [], minor: [], passes: ['document has a title'],
});
const AUDIT_HTML_WEAK = JSON.stringify({
  score: 70, summary: 'scripted weak audit',
  issues: [{ ruleId: 'heading-order', claimKind: 'structure', issue: 'Heading structure is unclear', wcag: '1.3.1', count: 1 }],
  passes: ['lang present'],
});

const promptHeads = [];
function dispatch(prompt) {
  calls.total++;
  promptHeads.push(String(prompt).replace(/\s+/g, ' ').slice(0, 110));
  if (/Reply with exactly: OK/.test(prompt)) { calls.probes++; return 'OK'; }
  if (/accessibility auditor for educational documents/i.test(prompt) || /SLICE CONTEXT/i.test(prompt)) return AUDIT_PDF;
  if (/auditor\. Audit this HTML|Audit this HTML/i.test(prompt)) { calls.htmlAudits++; return AUDIT_HTML_WEAK; }
  if (/Return ONLY a JSON array/i.test(prompt)) {
    return JSON.stringify([
      { type: 'h1', text: 'Photosynthesis Study Guide', id: 'photosynthesis-study-guide' },
      { type: 'p', text: 'Plants convert light energy into chemical energy stored as glucose.' },
    ]);
  }
  if (/Extract ALL text content/i.test(prompt)) return '# Photosynthesis Study Guide\nPlants convert light energy into chemical energy stored as glucose.';
  // Chunk fixer + anything else: a benign fragment. aiFixChunked fail-safes to the original
  // chunk on an unusable reply — either way the scripted audits drive this scenario.
  calls.chunkish++;
  return '<p>Plants convert light energy into chemical energy stored as glucose.</p>';
}

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let prompt = '';
      try {
        const j = JSON.parse(body);
        prompt = (((j.contents || [])[0] || {}).parts || []).map((p) => p.text || '').join('\n');
      } catch (_) {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: dispatch(String(prompt)) }] }, finishReason: 'STOP' }] }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  process.env.GEMINI_API_KEY = 'scripted-loopback-key';
  process.env.ALLOFLOW_MCP_GEMINI_BASE = 'http://127.0.0.1:' + server.address().port + '/v1beta/models';
  const Driver = requireCjs(resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs'));
  driver = Driver.createDriver({ log: () => {} });
});

afterAll(async () => {
  delete process.env.ALLOFLOW_MCP_GEMINI_BASE;
  if (driver) await driver.close();
  if (server) server.close();
});

describe('driver behavioral e2e (scripted loopback Gemini)', () => {
  it('remediates the fixture end-to-end; auto-continue rounds merge through the canonical reducer and stop on stagnation', async () => {
    const out = await driver.remediate({
      filePath: resolve(process.cwd(), 'tests/e2e/artifacts/remediation-e2e.source.pdf'),
      targetScore: 100, fixPasses: 1, polishPasses: 0, taggedPdf: false,
      autoContinue: true, autoContinueRounds: 2,
    });

    console.log('[scripted-e2e] prompt heads:\n' + promptHeads.map((h, i) => '  ' + (i + 1) + '. ' + h).join('\n'));
    // The document itself survived the full trip through the real pipeline.
    expect(typeof out.accessibleHtml).toBe('string');
    expect(out.accessibleHtml).toMatch(/Photosynthesis|light energy/i);
    // Deduction-grounded: the audit's one serious issue produces a real sub-100 number
    // (the AI's claimed 55 is deliberately not trusted — that's the honesty redesign).
    expect(typeof out.beforeScore).toBe('number');
    expect(out.beforeScore).toBeGreaterThan(0);
    expect(out.beforeScore).toBeLessThan(100);

    // Both rounds fired (score stayed below target by construction) and the loop's
    // two-stall guard ended it — the log records each round's accept/revert decision.
    expect(out.autoContinue).toBeTruthy();
    expect(out.autoContinue.roundsRun).toBe(2);
    expect(Array.isArray(out.autoContinue.log)).toBe(true);
    expect(out.autoContinue.log.length).toBeGreaterThanOrEqual(2);
    expect(out.autoContinue.log.join('\n')).toMatch(/round 1 (accepted|REVERTED)/);

    // The reducer governed the headline: the weak audit's standing issue keeps it sub-100
    // (min-governing means the deterministic layer can never raise it above the AI layer).
    expect(typeof out.afterScore).toBe('number');
    expect(out.afterScore).toBeLessThan(100);

    // Honesty surfaces are present and coherent for a below-target result.
    expect(out.verdict).toBeTruthy();
    expect(out.verificationState).toBeTruthy();
    expect(out.stats && typeof out.stats.apiCalls === 'number').toBe(true);

    // Primary-pass audits hit the model. The rounds' re-verifies can legitimately be served
    // from the pipeline's audit CACHE when a round's HTML is unchanged (fail-safed fixes
    // return the original) — that is the Phase-1 audit-cache doing its job, not a skipped
    // verification, so the model-call count only pins the primary pass.
    expect(calls.htmlAudits).toBeGreaterThanOrEqual(2);
    expect(calls.total).toBeGreaterThanOrEqual(7); // vision audit + extraction + audits + fixes
  }, 360000);

  // The connector ships its own runtime canary (`remediation_selftest`), whose scripted replies
  // must satisfy the same strict-parse contract this file's fixtures do. Two hand-maintained
  // encodings of one contract is exactly the drift that produced the 2026-07-28 bugs, so CI runs
  // the REAL canary rather than a second copy of it: if the pipeline hardens again, this goes red
  // here before a user ever sees it fail on their machine. It brings its own loopback model and
  // generated PDF, so it is independent of the scripted server above.
  it('the shipped self-test canary is green against this pipeline build', async () => {
    const report = await driver.selfTest({});
    expect(report.error).toBeUndefined();
    expect(report.stage).toBe('complete');
    expect(report.ok).toBe(true);
    expect(report.checks).toEqual({
      browserLaunched: true, modulesBooted: true,
      auditAccepted: true, remediationStarted: true, contentPreserved: true,
    });
    // A canary that never calls the model would pass while proving nothing.
    expect(report.modelCalls).toBeGreaterThan(0);
  }, 180000);
});
