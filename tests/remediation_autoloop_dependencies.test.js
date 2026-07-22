import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let runAutoFixLoop;

beforeAll(() => {
  loadAlloModule('misc_handlers_module.js');
  runAutoFixLoop = window.AlloModules.MiscHandlers.runAutoFixLoop;
});

beforeEach(() => {
  window.__alloPdfRunGen = 0;
  window.__alloPdfAbortSignal = null;
});

describe('extracted auto-remediation dependency contract', () => {
  it('completes a real AI/contrast round, binds its proof, and autosaves', async () => {
    const initialHtml = '<main><h1>Source</h1><p style="color:#aaa">Low contrast</p></main>';
    const aiFixedHtml = '<main><h1>Source</h1><p style="color:#888">Improved</p></main>';
    const sanitizedHtml = '<main><h1>Source</h1><p style="color:#111">Improved</p></main>';
    const initial = {
      accessibleHtml: initialHtml,
      sourceText: 'Source Low contrast',
      afterScore: 72,
      afterScoreVerified: false,
      verificationState: 'partial',
      requiresManualReview: true,
      axeAudit: { score: 100, totalViolations: 0, violations: [] },
      secondEngineAudit: { score: 100, failViolations: 0, fails: [] },
      verificationAudit: {
        score: 72,
        issues: [{ wcag: '1.4.3', issue: 'Text contrast is too low.' }],
      },
      issueResolution: { baseline: [], remaining: [] },
    };
    const pdfFixResultRef = { current: initial };
    const pdfAutoContinueAbortCtrlRef = { current: null };
    const pdfAutoContinueAbortRef = { current: false };
    const pdfHtmlRevisionRef = { current: 0 };
    const setPdfFixResult = vi.fn((next) => {
      pdfFixResultRef.current = typeof next === 'function' ? next(pdfFixResultRef.current) : next;
    });
    const setPdfAutoContinueRunning = vi.fn();
    const setPdfFixLoading = vi.fn();
    const setPdfFixStep = vi.fn();
    const aiFixChunked = vi.fn(async () => aiFixedHtml);
    const sanitizeStyleForWCAG = vi.fn(() => ({ html: sanitizedHtml, fixCount: 1 }));
    const freshAxe = { score: 100, totalViolations: 0, violations: [] };
    const freshEqualAccess = { score: 100, failViolations: 0, fails: [] };
    const freshAi = { score: 100, issues: [], summary: 'No remaining issues.' };
    const runAxeAudit = vi.fn(async () => freshAxe);
    const runEqualAccessAudit = vi.fn(async () => freshEqualAccess);
    const auditOutputAccessibility = vi.fn(async () => freshAi);
    const attachVerificationHtmlProof = vi.fn(() => true);
    const saveProjectToFile = vi.fn(() => true);
    const finalizeRemediationRound = vi.fn(async (_previous, round) => ({
      ...initial,
      accessibleHtml: round.html,
      afterScore: 100,
      afterScoreVerified: true,
      verificationState: 'complete',
      requiresManualReview: false,
      needsExpertReview: false,
      fidelityLimited: false,
      verificationReasons: [],
      verificationReviewCount: 0,
      verificationHtmlBinding: { algorithm: 'sha256', digest: 'sha256:round' },
      axeAudit: round.axeAudit,
      secondEngineAudit: round.eaAudit,
      verificationAudit: round.aiAudit,
      _detScore: 100,
    }));

    await runAutoFixLoop(1, {
      pdfAutoContinueAbortCtrlRef,
      pdfAutoContinueAbortRef,
      pdfFixResultRef,
      pdfHtmlRevisionRef,
      setPdfAutoContinueRunning,
      setPdfFixLoading,
      setPdfFixResult,
      setPdfFixStep,
      pdfFixLoading: false,
      pdfTargetScore: 95,
      pdfAutoFixPasses: 2,
      autoFixAxeViolations: vi.fn(),
      aiFixChunked,
      waitForGeminiCalm: vi.fn(async () => {}),
      runAxeAudit,
      runEqualAccessAudit,
      deriveVerificationState: vi.fn(),
      createVerificationHtmlBinding: vi.fn(),
      applyVerificationHtmlBinding: vi.fn(),
      isLiveVerificationHtmlBound: vi.fn(() => true),
      enforceVerificationHtmlBinding: vi.fn((value) => value),
      formatVerificationReason: vi.fn((reason) => String(reason || '')),
      auditOutputAccessibility,
      recomputeIssueResolution: vi.fn((value) => value),
      recomputeContentFidelity: vi.fn(),
      _docPipeline: {
        equalAccessUnavailable: vi.fn(() => false),
        finalizeRemediationRound,
      },
      sanitizeStyleForWCAG,
      attachVerificationHtmlProof,
      saveProjectToFile,
      addToast: vi.fn(),
      pdfAutoSaveProject: true,
      t: (key) => key,
      warnLog: vi.fn(),
    });

    expect(aiFixChunked).toHaveBeenCalledWith(initialHtml, expect.stringContaining('contrast'), 'auto-continue-ai-round-1');
    expect(sanitizeStyleForWCAG).toHaveBeenCalledWith(aiFixedHtml);
    expect(runAxeAudit).toHaveBeenCalledWith(sanitizedHtml);
    expect(auditOutputAccessibility).toHaveBeenCalledWith(sanitizedHtml);
    expect(runEqualAccessAudit).toHaveBeenCalledWith(sanitizedHtml);
    expect(finalizeRemediationRound).toHaveBeenCalledWith(initial, expect.objectContaining({
      html: sanitizedHtml,
      aiAudit: freshAi,
      axeAudit: freshAxe,
      eaAudit: freshEqualAccess,
    }));
    expect(attachVerificationHtmlProof).toHaveBeenCalledWith(expect.objectContaining({ accessibleHtml: sanitizedHtml }), sanitizedHtml);
    expect(setPdfFixResult).toHaveBeenCalledWith(expect.objectContaining({
      accessibleHtml: sanitizedHtml,
      verificationState: 'complete',
      afterScoreVerified: true,
    }));
    expect(pdfFixResultRef.current.accessibleHtml).toBe(sanitizedHtml);
    expect(saveProjectToFile).toHaveBeenCalledWith(true);
    expect(setPdfAutoContinueRunning).toHaveBeenNthCalledWith(1, true);
    expect(setPdfAutoContinueRunning).toHaveBeenLastCalledWith(false);
    expect(pdfAutoContinueAbortCtrlRef.current).toBeNull();
  });
});
