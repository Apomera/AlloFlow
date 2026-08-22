import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const pipeline = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const traverse = typeof traverseModule === 'function' ? traverseModule : traverseModule.default;
const OWNED_CHUNK_EVENT = /^alloflow:chunk-(?:session-start|start|progress|fixed|session-complete|refixed|resume-available|resume-accept|resume-decline|resume-settled)$/;

const collectOwnedChunkEvents = (source, sourceName) => {
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
  const events = [];
  traverse(ast, {
    NewExpression(path) {
      const node = path.node;
      if (node.callee?.type !== 'Identifier' || node.callee.name !== 'CustomEvent') return;
      const eventName = node.arguments[0];
      if (eventName?.type !== 'StringLiteral' || !OWNED_CHUNK_EVENT.test(eventName.value)) return;
      const outer = path.get('arguments')[1];
      let detailPath = null;
      if (outer?.isObjectExpression()) {
        for (const property of outer.get('properties')) {
          const key = property.node?.key;
          if (property.isObjectProperty() && ((key.type === 'Identifier' && key.name === 'detail') || (key.type === 'StringLiteral' && key.value === 'detail'))) {
            detailPath = property.get('value');
            break;
          }
        }
      }
      const keys = new Set();
      const seen = new Set();
      const collectKeys = (valuePath) => {
        if (!valuePath?.node || seen.has(valuePath.node)) return;
        seen.add(valuePath.node);
        if (valuePath.isObjectExpression()) {
          for (const property of valuePath.get('properties')) {
            if (property.isObjectProperty()) {
              const key = property.node.key;
              if (key.type === 'Identifier') keys.add(key.name);
              else if (key.type === 'StringLiteral') keys.add(key.value);
            } else if (property.isSpreadElement()) collectKeys(property.get('argument'));
          }
        } else if (valuePath.isCallExpression()) {
          const callee = valuePath.node.callee;
          if (callee?.type === 'MemberExpression' && !callee.computed
              && callee.object?.type === 'Identifier' && callee.object.name === 'Object'
              && callee.property?.type === 'Identifier' && callee.property.name === 'assign') {
            for (const argument of valuePath.get('arguments')) collectKeys(argument);
          }
        } else if (valuePath.isIdentifier()) {
          const binding = valuePath.scope.getBinding(valuePath.node.name);
          if (binding?.path?.isVariableDeclarator()) collectKeys(binding.path.get('init'));
        }
      };
      collectKeys(detailPath);
      events.push({ sourceName, type: eventName.value, keys });
    },
  });
  return events;
};

describe('structured remediation progress', () => {
  it('emits a versioned, run-scoped event with terminal success and failure states', () => {
    expect(pipeline).toContain("new CustomEvent('alloflow:remediation-progress'");
    expect(pipeline).toContain("if (!runId || !_activeRemediationProgress || _activeRemediationProgress.runId !== runId) return;");
    expect(pipeline).toMatch(/status: 'complete'[\s\S]*?overallPercent: 100/);
    expect(pipeline).toMatch(/status: 'failed'[\s\S]*?Remediation stopped before completion/);
  });

  it('does not resurrect a retired progress slot when a late callback arrives', () => {
    const start = pipeline.indexOf('var _emitRemediationProgress = function');
    const end = pipeline.indexOf('// The current run', start);
    const emitterSource = pipeline.slice(start, end);
    const makeHarness = new Function('window', 'CustomEvent', 'performance',
      'var _activeRemediationProgress = { version: 1, runId: \'run-a\', documentEpoch: 4 };' +
      'var _pipelineStats = { runId: \'run-a\', apiCalls: 0, visionCalls: 0, totalApiMs: 0, startTime: 1 };' +
      emitterSource +
      'return { emit: _emitRemediationProgress, retire: function () { _activeRemediationProgress = null; }, current: function () { return _activeRemediationProgress; } };');
    const events = [];
    class EventStub { constructor(type, init) { this.type = type; this.detail = init.detail; } }
    const windowLike = { dispatchEvent: (event) => events.push(event) };
    const harness = makeHarness(windowLike, EventStub, { now: () => 10 });

    harness.emit('run-a', { status: 'running' });
    expect(events).toHaveLength(1);
    harness.retire();
    harness.emit('run-a', { status: 'throttled' });
    expect(harness.current()).toBeNull();
    expect(events).toHaveLength(1);
  });

  it('keeps the legacy progress callback while publishing structured detail', () => {
    expect(pipeline).toMatch(/const derived = _deriveProgress\(step, detail\);[\s\S]*?_emitRemediationProgress\(_runId/);
    expect(pipeline).toContain("if (_silentMode) { _onProgress(step, msg); } else { setPdfFixStep(msg); }");
  });

  it('shows truthful estimated progress and observable quota telemetry', () => {
    expect(view).toContain("% estimated");
    expect(view).toContain("Throttle signals");
    expect(view).toContain("Waiting safely:");
    expect(view).toContain("remediationProgress?.activity?.message");
  });
});

describe('safe live agent trace', () => {
  it('streams lifecycle metadata without placing unaccepted HTML in chunk-progress events', () => {
    const start = pipeline.indexOf('const emitChunkProgress =');
    const end = pipeline.indexOf('// Per-chunk SOURCE fingerprint', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const helper = pipeline.slice(start, end);
    expect(helper).toContain("new CustomEvent('alloflow:chunk-progress'");
    expect(helper).not.toMatch(/originalHtml|fixedHtml|innerHTML|dangerouslySetInnerHTML/);
  });

  it('traces validation before acceptance or fallback', () => {
    const rules = pipeline.indexOf("emitChunkProgress(chi, 'rules'");
    const integrity = pipeline.indexOf("emitChunkProgress(chi, 'integrity'");
    const verifying = pipeline.indexOf("emitChunkProgress(chi, 'verifying'");
    const scoring = pipeline.indexOf("emitChunkProgress(chi, 'scoring'");
    const accepted = pipeline.indexOf("emitChunkProgress(chi, accepted.usedOriginal");
    expect(rules).toBeGreaterThan(-1);
    expect(integrity).toBeGreaterThan(rules);
    expect(verifying).toBeGreaterThan(integrity);
    expect(scoring).toBeGreaterThan(verifying);
    expect(accepted).toBeGreaterThan(scoring);
  });

  it('copies an allowlisted metadata shape into UI trace state', () => {
    const start = view.indexOf('const appendTrace =');
    const end = view.indexOf('const onProgress =', start);
    const allowlist = view.slice(start, end);
    expect(allowlist).toContain("phase: String(detail.phase");
    expect(allowlist).toContain("label: String(detail.label");
    expect(allowlist).toContain("integrityPassed: detail.integrityPassed === true");
    expect(allowlist).not.toMatch(/originalHtml|fixedHtml|innerHTML|dangerouslySetInnerHTML/);
  });

  it('makes the trace opt-in and explains the isolation boundary', () => {
    expect(view).toContain("const [showAgentTrace, setShowAgentTrace] = useState(false)");
    expect(view).toContain("Show live agent trace");
    expect(view).toContain("Read-only safety view: intermediate AI HTML is isolated; code appears only after validation.");
    expect(view).toContain("Read-only agent trace");
  });
});
describe('remediation ownership and lifecycle regressions', () => {
  it('normalizes epochs as non-negative safe integers without null coercion', () => {
    const start = pipeline.indexOf('var _normalizeDocumentEpoch =');
    const end = pipeline.indexOf('var _readCurrentDocumentEpoch =', start);
    const normalizer = pipeline.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(normalizer).toContain('Number.isSafeInteger(epoch) && epoch >= 0');
    expect(normalizer).toContain("if (value == null) return null;");
    expect(normalizer).not.toContain('Number.isFinite(Number(value))');
    const normalize = new Function(`${normalizer}\nreturn _normalizeDocumentEpoch;`)();
    expect(normalize(null)).toBeNull();
    expect(normalize(undefined)).toBeNull();
    expect(normalize('   ')).toBeNull();
    expect(normalize(false)).toBeNull();
    expect(normalize(1.5)).toBeNull();
    expect(normalize(-1)).toBeNull();
    expect(normalize(0)).toBe(0);
    expect(normalize('7')).toBe(7);
    expect(normalize(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('passes the captured epoch through every remediation entry point', () => {
    expect(view).toContain('documentEpoch: _oneClickDocumentEpoch');
    expect(view).toContain('documentEpoch: _fixDocumentEpoch');
    expect(view).toContain('documentEpoch: _rescanDocumentEpoch');
    expect(pipeline).toContain('documentEpoch: owner.documentEpoch');
    expect(pipeline).toContain('documentEpoch: _experimentDocumentEpoch');
    expect(pipeline).toContain("ownershipError.code = 'ALLO_DOCUMENT_EPOCH_REQUIRED'");
    expect(pipeline).toContain("staleError.code = 'ALLO_STALE_DOCUMENT'");
    expect(pipeline).toContain('const _hasExplicitDocumentEpoch = !!(batchOverrides');
    expect(pipeline).toContain('? _normalizeDocumentEpoch(batchOverrides.documentEpoch) : _run.documentEpoch;');
    expect(view).toContain('const _oneClickDocumentIsCurrent = () => Number.isInteger(_oneClickDocumentEpoch)');
  });

  it('hydrates a mounted view and rejects superseded same-document run IDs', () => {
    expect(pipeline).toContain('window.__alloRemediationProgress = next;');
    expect(view).toContain('const remediationProgressOwnerRef = useRef');
    expect(view).toContain('if (owner.runId !== detail.runId) return;');
    // Replayed history is now tagged { hydration: true } so a consumer can tell
    // a rehydrated detail from a live tick rather than treating both as progress.
    expect(view).toContain('if (latest) onProgress({ detail: latest }, { hydration: true });');
    expect(view).toContain('remediationProgressOwnerRef.current = { documentEpoch: pdfDocumentEpoch, runId: null, runSequence: 0, startedAt: 0 };');
    expect(pipeline).toContain('var _remediationRunSequence = 0;');
    expect(pipeline).toContain('const _runSequence = ++_remediationRunSequence;');
    expect(view).toContain('eventRunSequence <= owner.runSequence');
    expect(view).toContain('setRemediationProgress(null);');
  });

  it('binds every chunk lifecycle and resume choice to one monotonic session owner', () => {
    const events = [
      ...collectOwnedChunkEvents(pipeline, 'doc_pipeline_source.jsx'),
      ...collectOwnedChunkEvents(view, 'view_pdf_audit_source.jsx'),
    ];
    const emittedTypes = new Set(events.map((event) => event.type));
    const requiredTypes = ['session-start', 'start', 'progress', 'fixed', 'session-complete', 'refixed', 'resume-available', 'resume-accept', 'resume-decline', 'resume-settled'];
    expect(events.length).toBeGreaterThanOrEqual(requiredTypes.length);
    for (const type of requiredTypes) {
      expect(emittedTypes.has('alloflow:chunk-' + type)).toBe(true);
    }
    for (const event of events) {
      expect(Array.from(event.keys)).toEqual(expect.arrayContaining(['documentEpoch', 'runId', 'runSequence']));
    }
    expect(pipeline).toContain('const _chunkRunSequence = _requestedChunkRunSequence || ++_remediationRunSequence;');
    expect(pipeline).toContain('detail.runId === _chunkRunId');
    expect(pipeline).toContain('detail.runSequence === _chunkRunSequence');
    expect(pipeline).toContain('runId: _refixRunId');
    expect(pipeline).toContain('runSequence: _refixRunSequence');
    expect(pipeline).toContain('const _controlRunId = _controlOwner && _controlOwner.runId;');

    expect(host).toContain('const liveChunkSessionOwnerRef = useRef');
    expect(host).toContain('owner.runId === next.runId');
    expect(host).toContain('owner.runSequence === next.runSequence');
    expect(host).toContain('if (!chunkEventIsCurrent(e)) return;');
    expect(view).toContain('const chunkTraceOwnerRef = useRef');
    expect(view).toContain('if (!_chunkEventIsForActiveSession(e)) return;');
    expect(view).toContain('alloflow:chunk-resume-accept');
    expect(view).toContain('alloflow:chunk-resume-decline');
    expect(view).toContain('runSequence: chunkResumePrompt.runSequence');
  });

  it('settles resume prompts and publishes completion only after accepted final state', () => {
    const autoStart = pipeline.indexOf('const autoFixAxeViolations = async');
    const autoEnd = pipeline.indexOf('// ── Re-fix a single chunk', autoStart);
    const autoFix = pipeline.slice(autoStart, autoEnd);
    const postCleanup = autoFix.indexOf('catch(postErr)');
    const statePublish = autoFix.indexOf('_autoFixChunkStateCoordinator.publish(_chunkStateOwner, _stateToPublish)');
    const progressClear = autoFix.indexOf('clearChunkProgress(_pendingChunkSessionId)', statePublish);
    const completion = autoFix.indexOf('alloflow:chunk-session-complete', statePublish);
    expect(autoFix).toContain('alloflow:chunk-resume-settled');
    expect(autoFix).toContain('_finishResumeChoice(false');
    expect(autoFix).toContain('timeout');
    expect(autoFix).toContain('if (_reassemblyAccepted) {');
    expect(autoFix).toContain('if (_stateReassembledHtml !== currentHtml) {');
    expect(autoFix).not.toContain('_chunkState = _pendingChunkState;');
    expect(statePublish).toBeGreaterThan(postCleanup);
    expect(progressClear).toBeGreaterThan(statePublish);
    expect(completion).toBeGreaterThan(progressClear);
    expect(host).toContain('const onResumeSettled = (e) =>');
    expect(host).toContain('chunk-resume-settled');

    const traceReset = view.indexOf('chunkTraceOwnerRef.current = { documentEpoch: pdfDocumentEpoch');
    expect(view.slice(traceReset, traceReset + 260)).toContain('setLiveChunkTrace({});');
    expect(view).toContain('const onChunkRefixed = onChunkFixed;');
    expect(view).toMatch(/removeEventListener\('alloflow:chunk-refixed', onChunkRefixed\)/);
  });

  it('dedupes exact rerenders without collapsing distinct run IDs', () => {
    expect(host).toContain("const _historyRunId = cur.runId || (cur.pipelineStats && cur.pipelineStats.runId) || null;");
    expect(host).toContain("const key = _historyRunId ? ('run:' + _historyRunId + ':' + _historyStateKey) : _historyStateKey;");
    expect(host).toContain('runId: _historyRunId');
    expect(host).not.toContain("const key = (pendingPdfFile?.name || '?') + ':' + (cur.afterScore || 0) + ':' + (cur.accessibleHtml.length || 0);");
  });

  it('retires terminal progress and stamps log/heartbeat events with ownership', () => {
    expect(pipeline).toContain("runId: _logRunId, documentEpoch: _logDocumentEpoch");
    expect(pipeline).toContain("detail: { ts: ts, tag: 'Throttle'");
    expect(pipeline).toContain('documentEpoch: documentEpoch');
    expect(pipeline).toContain('if (_activeRemediationProgress && _activeRemediationProgress.runId === _runId) _activeRemediationProgress = null;');
    expect(pipeline).toContain('window.__alloActivePdfRemediation = null;');
    expect(pipeline).toContain('err.pipelineStats = _failurePipelineStats');
    expect(pipeline).toContain("outcome: _runWasCancelled ? 'cancelled' : 'failed'");
    expect(pipeline).toContain("status: 'cancelled', stepName: 'Remediation cancelled'");
    expect(host).toContain("err && err.pipelineStats && typeof err.pipelineStats === 'object'");
    expect(host).toContain("_st && _st.outcome === 'cancelled'");
    // The run-history guard flipped from _cancelled to _neverStarted, and that
    // is the point rather than a rename. Two audit findings drove it:
    //   M6  a CANCELLED run is now recorded, with outcome 'cancelled'. Stalls,
    //       aborts and superseded runs used to vanish from BOTH the numerator
    //       and the denominator of the success rate, so that figure was
    //       structurally incapable of showing the failure mode it most needed to.
    //   M5  a run that NEVER STARTED (double-click, pre-flight refusal) is not a
    //       failure of anything, and recording it punished the rate unfairly.
    // So: skip only never-started; record cancelled as its own outcome.
    expect(host).toContain('if (!_neverStarted) setPdfRunHistory');
    expect(host).toMatch(/const _neverStarted = !!\(err && \(err\.isAlreadyRunning/);
    expect(host).toContain("outcome: _cancelled ? 'cancelled' : 'failed'");
    // the incomplete-project save also now covers a cancelled run holding banked work
    expect(host).toContain('if (!_cancelled || _stalledBank) _maybeSaveIncompleteProject();');
  });

  it('feeds structured data logs through the in-app diagnostics sink', () => {
    const start = pipeline.indexOf('var _pipeLog =');
    const end = pipeline.indexOf('var _pipeStepStart =', start);
    const logger = pipeline.slice(start, end);
    expect(logger).toContain('if (data) warnLog(prefix + msg, data);');
    expect(logger).not.toContain('console.groupCollapsed');
  });

  it('keeps one pipeline instance across renders with live dependency proxies', () => {
    expect(host).toContain('const _docPipelineInstanceRef = React.useRef(null);');
    expect(host).toContain('_docPipelineFactoryRef.current !== _createDocPipeline');
    expect(host).toContain("Object.defineProperty(proxy, '_alloflowBackend'");
    expect(host).not.toContain('? _createDocPipeline({ callGemini, callGeminiVision');
  });

  it('filters watchdog heartbeats and aborts the owned primary controller', () => {
    expect(host).toContain('detail.documentEpoch !== watchdogEpoch || !detail.runId');
    expect(host).toContain('if (detail.runId !== watchdogRunId) return;');
    expect(host).toContain('window.__alloPdfFixAbortCtrl.abort();');
    expect(pipeline).toContain('window.__alloPdfFixAbortOwner = { runId: _runId, documentEpoch: _runDocumentEpoch };');
  });
});
