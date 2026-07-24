import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (name) => readFileSync(resolve(process.cwd(), name), 'utf8');
const view = read('view_pdf_audit_source.jsx');
const host = read('AlloFlowANTI.txt');
const pipeline = read('doc_pipeline_source.jsx');

const extract = (source, startNeedle, endNeedle) => {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  if (start < 0 || end <= start) {
    throw new Error(`Could not extract ${startNeedle}`);
  }
  return source.slice(start, end);
};

const createOperationOwner = new Function(
  `${extract(
    view,
    'function _alloCreateRemediationOperationOwner(options)',
    'function _ensureDocxLib()',
  )}
  return _alloCreateRemediationOperationOwner;`,
)();

const createRefixChunkStateLease = new Function(
  `${extract(
    pipeline,
    'const _createRefixChunkStateLease = (options) => {',
    'const _docFingerprint = (html)',
  )}
  return _createRefixChunkStateLease;`,
)();

const makeCommitGate = ({
  epochRef,
  commitPdfFixResultIfCurrent,
  addToast = vi.fn(),
}) => {
  const body = extract(
    host,
    '  const commitOrRevertPdfFix = (prev, candidate, extras, label, expectedOwner) => {',
    '  const [liveChunkStream, setLiveChunkStream]',
  );
  const commit = new Function(
    'pdfDocumentSelectionEpochRef',
    'commitPdfFixResultIfCurrent',
    'blendAiAxe',
    'addToast',
    't',
    'PDF_REGRESSION_TOLERANCE',
    `${body}
    return commitOrRevertPdfFix;`,
  )(
    epochRef,
    commitPdfFixResultIfCurrent,
    (ai, axe) => (ai == null ? axe : axe == null ? ai : Math.min(ai, axe)),
    addToast,
    () => '',
    5,
  );
  return { commit, addToast };
};

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe('remediation operation ownership', () => {
  it('prevents a deferred operation A from completing or clearing operation B', async () => {
    let documentEpoch = 7;
    let html = '<main>A</main>';
    const owner = createOperationOwner({
      getDocumentEpoch: () => documentEpoch,
      isDocumentCurrent: (epoch) => epoch === documentEpoch,
      captureHtmlToken: () => ({ documentEpoch, html }),
    });
    const operationA = owner.begin({ kind: 'refix', ownsPdfFixLoading: true });
    const gate = deferred();
    let loadingOwner = operationA;
    const lateA = (async () => {
      await gate.promise;
      if (owner.complete(operationA)) loadingOwner = null;
    })();

    html = '<main>B</main>';
    const operationB = owner.begin({ kind: 'reaudit', ownsPdfFixLoading: true });
    loadingOwner = operationB;
    gate.resolve();
    await lateA;

    expect(operationA.controller.signal.aborted).toBe(true);
    expect(owner.isCurrent(operationA)).toBe(false);
    expect(owner.getCurrent()).toBe(operationB);
    expect(loadingOwner).toBe(operationB);
    expect(owner.isCurrent(operationB)).toBe(true);

    documentEpoch += 1;
    expect(owner.isCurrent(operationB)).toBe(false);
    expect(owner.complete(operationB)).toBe(false);
  });

  it('rejects stale host commits and stale revert metadata without toasts', () => {
    const epochRef = { current: 2 };
    let state = {
      accessibleHtml: '<main>current</main>',
      afterScore: 90,
      axeAudit: { score: 90 },
    };
    const commitCas = vi.fn((_token, updater) => {
      state = updater(state);
      return true;
    });
    const { commit, addToast } = makeCommitGate({
      epochRef,
      commitPdfFixResultIfCurrent: commitCas,
    });
    const staleOwner = {
      documentEpoch: 1,
      htmlToken: { documentEpoch: 1, html: '<main>old</main>' },
    };
    const previous = {
      html: '<main>old</main>',
      afterScore: 90,
      axe: { score: 90 },
    };

    expect(commit(
      previous,
      { html: '<main>late</main>', ai: { score: 100 }, axe: { score: 100 }, chars: 17 },
      {},
      'Late commit',
      staleOwner,
    )).toBe(false);
    expect(commit(
      previous,
      { html: '<main>regressed</main>', ai: { score: 10 }, axe: { score: 10 }, chars: 22 },
      { preserveOnRevert: { late: true } },
      'Late revert',
      staleOwner,
    )).toBe(false);
    expect(commitCas).not.toHaveBeenCalled();
    expect(addToast).not.toHaveBeenCalled();
    expect(state).toEqual({
      accessibleHtml: '<main>current</main>',
      afterScore: 90,
      axeAudit: { score: 90 },
    });
  });

  it('commits only the current host owner and compares axe-only candidates to prev.axe', () => {
    const epochRef = { current: 3 };
    let state = {
      accessibleHtml: '<main>old</main>',
      afterScore: 50,
      axeAudit: { score: 90 },
    };
    const commitCas = vi.fn((token, updater) => {
      if (token.documentEpoch !== epochRef.current || token.html !== state.accessibleHtml) return false;
      state = updater(state);
      return true;
    });
    const { commit, addToast } = makeCommitGate({
      epochRef,
      commitPdfFixResultIfCurrent: commitCas,
    });
    const owner = {
      documentEpoch: 3,
      htmlToken: { documentEpoch: 3, html: '<main>old</main>' },
    };
    const previous = {
      html: '<main>old</main>',
      afterScore: 50,
      axe: { score: 90 },
    };

    expect(commit(
      previous,
      { html: '<main>worse axe</main>', ai: null, axe: { score: 80 }, chars: 21 },
      { preserveOnRevert: { passes: 1 } },
      'Axe-only',
      owner,
    )).toBe(false);
    expect(state.accessibleHtml).toBe('<main>old</main>');
    expect(state.passes).toBe(1);
    expect(addToast).toHaveBeenCalledWith(expect.any(String), 'warning');

    addToast.mockClear();
    expect(commit(
      previous,
      { html: '<main>better</main>', ai: { score: 96 }, axe: { score: 94 }, chars: 19 },
      {},
      'Current commit',
      owner,
    )).toBe(true);
    expect(state.accessibleHtml).toBe('<main>better</main>');
    expect(state.afterScore).toBeNull();
    expect(state.afterScoreVerified).toBe(false);
    expect(state.verificationState).toBe('partial');
    expect(state.requiresManualReview).toBe(true);
    expect(state.secondEngineAudit).toBeNull();
    expect(state.verificationReasons).toContain('secondary-action-requires-canonical-verification');

    const canonicalOwner = {
      documentEpoch: 3,
      htmlToken: { documentEpoch: 3, html: '<main>better</main>' },
    };
    expect(commit(
      { html: '<main>better</main>', afterScore: null, axe: { score: 94 } },
      {
        html: '<main>verified</main>',
        ai: { score: 96 },
        axe: { score: 94 },
        equalAccess: { score: 88 },
        verificationState: 'complete',
        afterScoreVerified: true,
        verificationHtmlBinding: { algorithm: 'SHA-256', digest: 'a'.repeat(64) },
        chars: 21,
      },
      {},
      'Canonical commit',
      canonicalOwner,
    )).toBe(true);
    expect(state.accessibleHtml).toBe('<main>verified</main>');
    expect(state.afterScore).toBe(88);
    expect(state.afterScoreVerified).toBe(true);
    expect(state.verificationState).toBe('complete');
    expect(state.secondEngineAudit.score).toBe(88);
    expect(addToast).not.toHaveBeenCalled();
  });
});

describe('selective chunk-state compare-and-swap lease', () => {
  it('does not let deferred chunk A overwrite replacement state B', async () => {
    let documentEpoch = 11;
    const stateA = {
      fixedChunks: ['a'],
      originalChunks: ['A'],
      chunkResults: [{ score: 70 }],
      violationInstructions: 'fix A',
      timestamp: 1,
    };
    const stateB = {
      fixedChunks: ['b'],
      originalChunks: ['B'],
      chunkResults: [{ score: 99 }],
      violationInstructions: 'fix B',
      timestamp: 2,
    };
    let liveState = stateA;
    const leaseA = createRefixChunkStateLease({
      getState: () => liveState,
      setState: (next) => { liveState = next; },
      documentEpoch,
      getDocumentEpoch: () => documentEpoch,
    });
    const gate = deferred();
    const lateCommit = (async () => {
      await gate.promise;
      return leaseA.commit({ ...stateA, fixedChunks: ['late A'] });
    })();

    liveState = stateB;
    gate.resolve();
    expect(await lateCommit).toBe(false);
    expect(liveState).toBe(stateB);

    const leaseB = createRefixChunkStateLease({
      getState: () => liveState,
      setState: (next) => { liveState = next; },
      documentEpoch,
      getDocumentEpoch: () => documentEpoch,
    });
    const nextB = { ...stateB, fixedChunks: ['fixed B'] };
    expect(leaseB.commit(nextB)).toBe(true);
    expect(liveState).toBe(nextB);

    const leaseBeforeEpochChange = createRefixChunkStateLease({
      getState: () => liveState,
      setState: (next) => { liveState = next; },
      documentEpoch,
      getDocumentEpoch: () => documentEpoch,
    });
    documentEpoch += 1;
    expect(leaseBeforeEpochChange.commit({ ...nextB, fixedChunks: ['wrong doc'] })).toBe(false);
    expect(liveState).toBe(nextB);
  });
});
