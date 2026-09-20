import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('view_pdf_audit_source.jsx', 'utf8');
const start = source.indexOf('  const _visibleAuditRunSeqRef = useRef(0);');
const end = source.indexOf('  const _remediationDependencies =', start);
const body = source.slice(start, end);
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
function harness(canStop = true) {
  const chooser = { _choosing: true, fileName: 'lesson.pdf' };
  const state = { result: chooser, loading: false };
  const deps = {
    useRef: value => ({current:value}), useEffect: () => {},
    _auditGateLog: vi.fn(), setPdfAuditLoading: value => {state.loading=value;},
    setPdfAuditResult: value => {state.result=typeof value==='function'?value(state.result):value;},
    _viewAuditFallbackResult: value => value || chooser, pendingPdfFile: { name: 'lesson.pdf' },
    pdfAuditResult: chooser, pdfAuditLoading: false, oneClickRemediationBusy: true,
    _docPipeline: { stopPdfAccessibilityAudit: vi.fn(() => canStop) }, pdfDocumentEpoch: 7,
    pdfAutoContinueAbortRef: {current:false}, addToast: vi.fn(), t: () => '',
    _pdfWorkspaceText: (_t, _key, fallback) => fallback,
  };
  const api = new Function(...Object.keys(deps), body + '\nreturn { begin: _beginVisibleAuditRun, wait: _awaitVisibleAuditRun, stop: _stopVisibleAuditRun, current: _visibleAuditRunIsCurrent, settle: _settleVisibleAuditRun };')(...Object.values(deps));
  return { ...api, deps, state, chooser };
}
describe('visible audit cancellation', () => {
  it('stops promptly even when underlying work ignores abort and retains the attached document', async () => {
    const h=harness(), pending=deferred(), seq=h.begin('start');
    const waiting=h.wait(seq,pending.promise);
    expect(h.state.loading).toBe(true);
    h.stop();
    expect(await waiting).toBeNull();
    expect(h.deps._docPipeline.stopPdfAccessibilityAudit).toHaveBeenCalledWith(7);
    expect(h.current(seq)).toBe(false);
    expect(h.state).toEqual({loading:false,result:h.chooser});
    expect(h.deps.pdfAutoContinueAbortRef.current).toBe(true);
    pending.resolve({score:98}); await Promise.resolve();
    expect(h.settle(seq,{score:98},'late')).toBe(false);
    expect(h.state.result).toBe(h.chooser);
  });
  it('a stopped run cannot overwrite or release a restarted audit', async () => {
    const h=harness(), old=deferred(), next=deferred();
    const a=h.begin('first'), first=h.wait(a,old.promise);h.stop();await first;
    const b=h.begin('retry'), second=h.wait(b,next.promise);
    old.resolve({score:99});await Promise.resolve();
    expect(h.settle(a,{score:99},'stale')).toBe(false);
    expect(h.state.loading).toBe(true);expect(h.current(b)).toBe(true);
    next.resolve({score:78});const result=await second;
    expect(h.settle(b,result,'retry')).toBe(true);
    expect(h.state).toEqual({loading:false,result:{score:78}});
  });
  it('does not report success or release an audit when its controller rejects a stale Stop', async () => {
    const h=harness(false), pending=deferred(), seq=h.begin('start');
    const waiting=h.wait(seq,pending.promise);h.stop();
    expect(h.state.loading).toBe(true);expect(h.current(seq)).toBe(true);
    expect(h.deps.addToast).not.toHaveBeenCalled();
    pending.resolve({score:75});expect(await waiting).toEqual({score:75});
  });
  it('consumes a late rejection after cancellation without changing the retry state', async () => {
    const h=harness(), pending=deferred(), seq=h.begin('start');
    const waiting=h.wait(seq,pending.promise);h.stop();expect(await waiting).toBeNull();
    pending.reject(new Error('late network failure'));await Promise.resolve();
    expect(h.state).toEqual({loading:false,result:h.chooser});
  });
});
