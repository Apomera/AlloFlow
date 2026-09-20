import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const view = readFileSync('view_pdf_audit_source.jsx', 'utf8');
const pipe = readFileSync('doc_pipeline_source.jsx', 'utf8');
const between = (source, start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error('Missing production code: ' + start);
  return source.slice(a, b);
};
const clickSource = 'async () => {' + between(view.slice(view.indexOf('<button data-help-key="pdf_audit_view_make_accessible_btn"')),
  'onClick={async () => {', '\n                  }} className=').slice('onClick={async () => {'.length) + '\n}';
const clean = () => ({ accessibleHtml: '<main><h1>Document</h1><p>Content</p></main>', afterScore: 100,
  axeAudit: { score: 100, totalViolations: 0 }, secondEngineAudit: { score: 100, failViolations: 0, fails: [] },
  verificationAudit: { score: 100, issues: [], chunksAudited: 1 },
  verificationState: 'complete', afterScoreVerified: true, requiresManualReview: false });

function makeClick(initial, loop) {
  const ref = { current: null }, stop = { current: false }, lock = { current: false };
  const deps = {
    _oneClickGateBlockers: () => [], _oneClickGateLog: vi.fn(), _auditGateLog: vi.fn(),
    pdfDocumentEpoch: 4, capturePdfDocumentIntakeEpoch: () => 4, isPdfDocumentIntakeCurrent: e => e === 4,
    addToast: vi.fn(), t: () => '', _oneClickRemediationBusyRef: lock, setOneClickRemediationBusy: vi.fn(),
    pdfAuditResult: { _choosing: true }, _requireRemediationReady: () => true, pdfAutoContinueAbortRef: stop,
    setLastTaggedValidation: vi.fn(), setVeraPdfResult: vi.fn(), setVeraPdfAutoSkipped: vi.fn(), _selectTaggedArtifact: vi.fn(),
    pendingPdfBase64: 'data', pendingPdfFile: { name: 'document.docx' }, _inputIsPdf: false, _inputMimeType: '',
    pdfAutoVeraPdf: false, setPdfFixMode: vi.fn(), _beginVisibleAuditRun: () => 1, pdfDiagnosticFreshRun: false,
    runPdfAccessibilityAudit: vi.fn(async () => ({ score: 70 })), _settleVisibleAuditRun: vi.fn(),
    _awaitVisibleAuditRun: (_seq, promise) => promise, _visibleAuditRunIsCurrent: () => true,
    _restoreVisibleAuditAfterFailure: vi.fn(), _viewAuditCanStartRemediation: () => true,
    fixAndVerifyPdf: vi.fn(async () => initial), pdfFixResultRef: ref,
    setPdfFixResult: v => { ref.current = v; }, _docPipeline: { logHostDiagnostic: vi.fn() }, warnLog: vi.fn(),
    pdfTargetScore: 95, runAutoFixLoop: vi.fn(async () => loop(ref, stop)),
    _reauditAndScore: vi.fn(async () => {}), pdfAutoSaveProject: true, saveProjectToFile: vi.fn(),
  };
  const click = new Function(...Object.keys(deps), 'return (' + clickSource + ');')(...Object.values(deps));
  return { click, deps, ref, stop, lock };
}

afterEach(() => { vi.useRealTimers(); delete window.__docPipelineState; });

it.each(['Equal Access', 'AI', 'missing evidence'])('one-click continues above target with %s findings and finalizes its first cycle', async (kind) => {
  vi.useFakeTimers();
  const initial = clean();
  if (kind === 'Equal Access') initial.secondEngineAudit = { score: 97, failViolations: 1, fails: [{ message: 'Missing label' }] };
  if (kind === 'AI') initial.verificationAudit.issues = [{ issue: 'Missing heading' }];
  if (kind === 'missing evidence') initial.verificationState = 'partial';
  const h = makeClick(initial, ref => { ref.current = clean(); });
  const run = h.click(); await vi.runAllTimersAsync(); await run;
  expect(h.deps.runAutoFixLoop).toHaveBeenCalledTimes(1);
  expect(h.deps._reauditAndScore).toHaveBeenCalledTimes(1);
  expect(h.deps.saveProjectToFile).toHaveBeenCalledTimes(1);
  expect(h.lock.current).toBe(false);
});

it('one-click finalizes an executed plateau cycle, but does not finalize a declined cycle', async () => {
  vi.useFakeTimers();
  for (const declined of [false, true]) {
    const initial = { ...clean(), afterScore: 70, verificationState: 'partial' };
    const h = makeClick(initial, () => declined ? { started: false, reason: 'already-running' } : undefined);
    const run = h.click(); await vi.runAllTimersAsync(); await run;
    expect(h.deps.runAutoFixLoop).toHaveBeenCalledTimes(1);
    expect(h.deps._reauditAndScore).toHaveBeenCalledTimes(declined ? 0 : 1);
  }
});

it('Stop remains durable at the continuation/final-audit boundary', async () => {
  vi.useFakeTimers();
  const h = makeClick({ ...clean(), afterScore: 70 }, (_ref, stop) => { stop.current = true; });
  const run = h.click(); await vi.runAllTimersAsync(); await run;
  expect(h.deps.runAutoFixLoop).toHaveBeenCalledTimes(1);
  expect(h.deps._reauditAndScore).not.toHaveBeenCalled();
  expect(h.deps.saveProjectToFile).toHaveBeenCalledTimes(1);
  expect(h.lock.current).toBe(false);
});

beforeAll(() => loadAlloModule('misc_handlers_module.js'));
beforeEach(() => {
  window.__alloPdfRunGen = 0; window.__alloPdfAbortSignal = null;
  window.__alloActivePdfRemediation = null; window.__alloPdfDocumentEpoch = 4;
});

it.each(['AI', 'Equal Access', 'clean', 'still unavailable'])('direct continuation handles recovered %s evidence without an extra user click', async (kind) => {
  const initial = { ...clean(), verificationState: 'partial', afterScoreVerified: false, _aiVerificationIncomplete: true };
  const resultRef = { current: initial }, ctrlRef = { current: null }, revision = { current: 0 };
  let auditCalls = 0;
  const audit = vi.fn(async () => {
    auditCalls++;
    return { score: kind === 'AI' && auditCalls === 1 ? 75 : 100,
      issues: kind === 'AI' && auditCalls === 1 ? [{ issue: 'Missing heading' }] : [] };
  });
  const aiFix = vi.fn(async html => html.replace('Content', 'Accessible content'));
  const ea = vi.fn(async () => ({ score: kind === 'Equal Access' && auditCalls === 1 ? 75 : 100,
    failViolations: kind === 'Equal Access' && auditCalls === 1 ? 1 : 0,
    fails: kind === 'Equal Access' && auditCalls === 1 ? [{ message: 'Missing label' }] : [] }));
  const deps = {
    pdfAutoContinueAbortCtrlRef: ctrlRef, pdfAutoContinueAbortRef: { current: false }, pdfFixResultRef: resultRef,
    pdfHtmlRevisionRef: revision, setPdfAutoContinueRunning: vi.fn(), setPdfFixLoading: vi.fn(),
    setPdfFixResult: next => { if (resultRef.current.accessibleHtml !== next.accessibleHtml) revision.current++; resultRef.current = next; },
    setPdfFixStep: vi.fn(), pdfFixLoading: false, pdfTargetScore: 95, pdfAutoFixPasses: 2,
    autoFixAxeViolations: vi.fn(), aiFixChunked: aiFix, waitForGeminiCalm: async () => ({ calm: true }),
    runAxeAudit: async () => ({ score: 100, totalViolations: 0 }), runEqualAccessAudit: ea,
    isLiveVerificationHtmlBound: () => true, enforceVerificationHtmlBinding: v => v, formatVerificationReason: String,
    auditOutputAccessibility: audit, recomputeIssueResolution: () => null,
    _docPipeline: { equalAccessUnavailable: () => false, finalizeRemediationRound: async (previous, round) => ({
      ...previous, accessibleHtml: round.html, axeAudit: round.axeAudit, secondEngineAudit: round.eaAudit,
      verificationAudit: round.aiAudit, afterScore: Math.min(round.aiAudit.score, round.eaAudit.score),
      _detScore: round.eaAudit.score, verificationState: kind === 'still unavailable' ? 'partial' : 'complete',
      afterScoreVerified: kind !== 'still unavailable', _aiVerificationIncomplete: kind === 'still unavailable',
    }) },
    sanitizeStyleForWCAG: html => ({ html }), attachVerificationHtmlProof: () => true,
    saveProjectToFile: vi.fn(), addToast: vi.fn(), pdfAutoSaveProject: true, t: () => '', warnLog: vi.fn(),
  };
  await window.AlloModules.MiscHandlers.runAutoFixLoop(3, deps);
  const hasIssues = kind === 'AI' || kind === 'Equal Access';
  expect(aiFix).toHaveBeenCalledTimes(hasIssues ? 1 : 0);
  expect(audit).toHaveBeenCalledTimes(hasIssues ? 2 : 1);
  expect(resultRef.current.afterScore).toBe(100);
  expect(ctrlRef.current).toBeNull();
  expect(deps.setPdfFixLoading).toHaveBeenLastCalledWith(false);
  expect(deps.setPdfAutoContinueRunning).toHaveBeenLastCalledWith(false);
});

it('pipeline state and document epoch stay bound to their initiating host', () => {
  let ownState = { pendingPdfFile: { name: 'own.pdf' } }, ownEpoch = 4;
  window.__docPipelineState = { pendingPdfFile: { name: 'foreign.pdf' } };
  window.__alloPdfDocumentEpoch = 99;
  const getStateCode = between(pipe, '  var _injectedState = deps && deps.state;', '  // Re-expose state vars');
  const epochCode = between(pipe, '  var _normalizeDocumentEpoch = function', '  // First-class remediation image inputs.');
  const make = new Function('deps', getStateCode + epochCode + '; return { state: _s, epoch: _readCurrentDocumentEpoch };');
  const own = make({ getState: () => ownState, getDocumentEpoch: () => ownEpoch });
  expect(own.state().pendingPdfFile.name).toBe('own.pdf');
  expect(own.epoch()).toBe(4);
  ownState = { pendingPdfFile: { name: 'next.pdf' } }; ownEpoch++;
  expect(own.state().pendingPdfFile.name).toBe('next.pdf');
  expect(own.epoch()).toBe(5);
  ownState = null; ownEpoch = null;
  expect(own.state()).toEqual({});
  expect(own.epoch()).toBeNull();
  expect(make({ state: { test: true } }).state()).toEqual({ test: true });
  expect(make({}).state().pendingPdfFile.name).toBe('foreign.pdf');
});

it.each(['one-click', 'batch action', 'pipeline', 'web', 'operation', 'render flag', 'idle'])('modal close honors the live %s owner', kind => {
  const body = between(view, '  const _modalHasActiveWork = () =>', '  // A stray Escape');
  const close = vi.fn();
  const requestClose = new Function('_modalWorkBusy', '_batchActionBusyRef', '_oneClickRemediationBusyRef', '_pipelineIsRemediating',
    '_viewDocumentJobIsActive', '_remediationOperationOwnerRef', 'safeCloseAudit', body + '; return _requestCloseAudit;')(
    kind === 'render flag', { current: kind === 'batch action' }, { current: kind === 'one-click' }, () => kind === 'pipeline', () => kind === 'web',
    { current: { getCurrent: () => kind === 'operation' ? {} : null } }, close);
  requestClose(); expect(close).toHaveBeenCalledTimes(kind === 'idle' ? 1 : 0);
});

it('another host cannot shorten this pipeline\'s rate-limit waiting budget', () => {
  let state = { pdfStormBudgetMinutes: 30 };
  window.__docPipelineState = { pdfStormBudgetMinutes: 1 };
  const code = between(pipe, '  var _GEMINI_STORM_BUDGET_DEFAULT_MS =', '  var _geminiStormBudget =');
  const readBudget = new Function('_s', code + '; return _geminiStormBudgetMs;')(() => state);
  expect(readBudget()).toBe(30 * 60000);
  state = { pdfStormBudgetMinutes: 0 };
  expect(readBudget()).toBe(0);
});
