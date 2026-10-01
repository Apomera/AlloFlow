// Execute the shipped follow-up loop directly; mock only its injected services.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
const source = fs.readFileSync(path.resolve('misc_handlers_source.jsx'), 'utf8');
const start = source.indexOf('async function runAutoFixLoop(maxRounds, deps)');
if (start < 0) throw new Error('Missing auto-continue source');
const runAutoFixLoop = new Function('return ' + source.slice(start))();
const HTML = '<!DOCTYPE html><html lang="en"><body><main><p>Original content.</p></main></body></html>';
const prior = { pass: 2, chunkId: '1', phase: 'single', reason: 'table-cell-transposition' };
const rejected = { chunkId: '2', phase: 'image-retry', reason: 'image-reference-changed' };
function harness(kind = 'AI', overrides = {}) {
  const initial = { accessibleHtml: HTML, afterScore: 70,
    verificationAudit: { issues: kind === 'AI' ? [{ issue: 'Repair heading levels' }] : [] },
    axeAudit: { totalViolations: kind === 'axe' ? 1 : 0, score: 90 },
    secondEngineAudit: { score: 90, failViolations: kind === 'EA' ? 1 : 0,
      fails: kind === 'EA' ? [{ ruleId: 'heading-level', message: 'Repair heading levels' }] : [] },
    candidateRejectionCount: 3, candidateRejections: [prior], ...overrides };
  const ref = { current: initial }, revision = { current: 7 }, saved = [], published = [];
  const deps = {
    pdfAutoContinueAbortCtrlRef: { current: null }, pdfAutoContinueAbortRef: { current: false },
    pdfFixResultRef: ref, pdfHtmlRevisionRef: revision, pdfTargetScore: 100, pdfAutoFixPasses: 2,
    setPdfAutoContinueRunning: vi.fn(), setPdfFixLoading: vi.fn(), setPdfFixStep: vi.fn(),
    setPdfFixResult: vi.fn(value => { if (value.accessibleHtml !== ref.current.accessibleHtml) revision.current++; ref.current = value; published.push(value); }),
    aiFixChunked: vi.fn(async (html, instruction, label, routing, controls) => {
      controls.onPassEvidence({ candidateRejectionCount: 1, candidateRejections: [rejected] });
      return html;
    }),
    autoFixAxeViolations: vi.fn(async (html, axe, passes, controls) => {
      controls.onPassEvidence({ candidateRejectionCount: 1, candidateRejections: [rejected] });
      return { html, axe, passes: 1 };
    }),
    waitForGeminiCalm: vi.fn(async () => ({ calm: true })),
    runAxeAudit: vi.fn(async () => initial.axeAudit),
    runEqualAccessAudit: vi.fn(async () => initial.secondEngineAudit),
    auditOutputAccessibility: vi.fn(async () => null),
    isLiveVerificationHtmlBound: () => false, formatVerificationReason: value => value,
    recomputeIssueResolution: () => null, attachVerificationHtmlProof: () => true,
    enforceVerificationHtmlBinding: value => value,
    _docPipeline: { finalizeRemediationRound: vi.fn(async (base, round) => ({ ...base, accessibleHtml: round.html, _detScore: 90 })) },
    saveProjectToFile: vi.fn(() => saved.push(ref.current)), pdfAutoSaveProject: true,
    addToast: vi.fn(), t: () => '', warnLog: vi.fn(),
  };
  return { deps, ref, revision, saved, published, initial, run: (rounds = 1) => runAutoFixLoop(rounds, deps) };
}
beforeEach(() => vi.stubGlobal('window', { __alloPdfRunGen: 4, __alloPdfDocumentEpoch: 2 }));
afterEach(() => vi.unstubAllGlobals());
describe('auto-continue candidate rejection persistence', () => {
  it.each(['AI', 'EA', 'axe'])('retains prior and %s follow-up reasons when original HTML ships and verification fails', async kind => {
    const h = harness(kind);
    await h.run();
    expect(h.deps.auditOutputAccessibility).toHaveBeenCalledOnce();
    expect(h.ref.current.accessibleHtml).toBe(HTML);
    expect(h.revision.current).toBe(7);
    expect(h.ref.current.candidateRejectionCount).toBe(4);
    expect(h.ref.current.candidateRejections).toEqual([prior, { pass: 1, ...rejected }]);
    expect(h.saved).toEqual([h.ref.current]);
    expect(h.initial.candidateRejections).toEqual([prior]);
  });
  it('retains candidate reasons when re-verification rejects a round as a regression', async () => {
    const h = harness();
    h.deps.auditOutputAccessibility.mockResolvedValue({ issues: [{ issue: 'Existing' }, { issue: 'New' }] });
    h.deps._docPipeline.finalizeRemediationRound.mockImplementation(async base => ({ ...base, accessibleHtml: HTML.replace('Original', 'Candidate'), _detScore: 80 }));
    await h.run();
    expect(h.deps._docPipeline.finalizeRemediationRound).toHaveBeenCalledOnce();
    expect(h.ref.current.accessibleHtml).toBe(HTML);
    expect(h.ref.current.candidateRejectionCount).toBe(4);
    expect(h.saved[0].candidateRejections[1]).toEqual({ pass: 1, ...rejected });
  });
  it('retains reasons when a provider throttle pauses the pass before verification', async () => {
    const h = harness('EA');
    h.deps.aiFixChunked.mockImplementation(async (html, instruction, label, routing, controls) => {
      controls.onPassEvidence({ candidateRejectionCount: 2, candidateRejections: [rejected] });
      controls.onThrottleDeferred();
      return html;
    });
    await h.run();
    expect(h.deps.auditOutputAccessibility).not.toHaveBeenCalled();
    expect(h.ref.current.candidateRejectionCount).toBe(5);
    expect(h.ref.current._remediationThrottlePaused).toBe(true);
    expect(h.saved[0].candidateRejectionCount).toBe(5);
  });
  it('bounds records while accumulating total attempts and omits non-schema data', async () => {
    const h = harness('AI', { candidateRejectionCount: 99, candidateRejections: Array.from({ length: 99 }, (_, i) => ({ ...prior, chunkId: String(i) })) });
    h.deps.aiFixChunked.mockImplementation(async (html, instruction, label, routing, controls) => {
      controls.onPassEvidence({ candidateRejectionCount: 5, candidateRejections: [
        { ...rejected, reason: 'x'.repeat(200), html: '<p>private candidate text</p>' }, rejected,
      ] });
      controls.onPassEvidence({ candidateRejectionCount: 2, candidateRejections: [rejected] });
      return html;
    });
    await h.run();
    expect(h.ref.current.candidateRejectionCount).toBe(106);
    expect(h.ref.current.candidateRejections).toHaveLength(100);
    expect(h.ref.current.candidateRejections.slice(0, 99)).toEqual(h.initial.candidateRejections);
    expect(h.ref.current.candidateRejections[99]).toEqual({ pass: 1, chunkId: '2', phase: 'image-retry', reason: 'x'.repeat(120) });
  });
  it.each(['generation', 'controller', 'html-revision'])('does not publish late evidence after %s changes', async change => {
    const h = harness();
    const replacement = { ...h.initial, accessibleHtml: HTML.replace('Original', 'Human edited') };
    h.deps.aiFixChunked.mockImplementation(async (html, instruction, label, routing, controls) => {
      if (change === 'generation') window.__alloPdfRunGen++;
      if (change === 'controller') h.deps.pdfAutoContinueAbortCtrlRef.current = new AbortController();
      if (change === 'html-revision') h.revision.current++;
      h.ref.current = replacement;
      controls.onPassEvidence({ candidateRejectionCount: 1, candidateRejections: [rejected] });
      return html;
    });
    await h.run();
    expect(h.published).toEqual([]);
    expect(h.ref.current).toBe(replacement);
    expect(h.ref.current.candidateRejectionCount).toBe(3);
  });
  it('does not publish an evidence-only update for an accepted candidate', async () => {
    const h = harness();
    h.deps.aiFixChunked.mockImplementation(async (html, instruction, label, routing, controls) => {
      controls.onPassEvidence({ candidateRejectionCount: 0, candidateRejections: [] }); return html;
    });
    await h.run();
    expect(h.published).toEqual([]);
    expect(h.ref.current).toBe(h.initial);
  });
});
