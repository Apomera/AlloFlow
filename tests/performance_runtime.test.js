import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parse } from '@babel/parser';

const source = readFileSync('AlloFlowANTI.txt', 'utf8');
const start = source.indexOf('  useEffect(() => {', source.indexOf('const [moduleLoadInfo, setModuleLoadInfo]'));
const end = source.indexOf('  // The initial audit only needs', start);
const effect = source.slice(start, end).trim().replace(/^useEffect\(/, '').replace(/, \[\]\);$/, '');
function harness(initial) {
  vi.useFakeTimers();
  let current = initial;
  const target = new EventTarget();
  const publish = vi.fn();
  const snapshot = vi.fn(() => Object.fromEntries(Object.entries(current).map(([key, value]) => [key, [...value]])));
  const retry = vi.fn();
  const cleanup = vm.runInNewContext('(' + effect + ')()', {
    window: { __alloModuleSnapshot: snapshot, __alloRetryFailedModules: retry,
      addEventListener: target.addEventListener.bind(target), removeEventListener: target.removeEventListener.bind(target) },
    moduleAutoRetryRef: { current: false }, setModuleLoadInfo: publish,
    setInterval, clearInterval, setTimeout, clearTimeout, Promise,
  });
  return { publish, snapshot, retry, cleanup, set: value => { current = value; },
    event: () => target.dispatchEvent(new Event('alloflow:module-registry-changed')) };
}
const empty = () => ({ pending: [], failed: [], queued: [] });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
describe('module readiness subscription', () => {
  it('does not rerender or keep polling an initially settled registry', async () => {
    const h = harness(empty());
    await vi.advanceTimersByTimeAsync(20000);
    expect(h.publish).not.toHaveBeenCalled();
    expect(h.snapshot).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    h.cleanup();
  });
  it('skips unchanged snapshots, coalesces events, and stops polling after completion', async () => {
    const h = harness({ pending: ['ReportWriter'], failed: [], queued: [] });
    expect(h.publish).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(6000);
    expect(h.publish).toHaveBeenCalledTimes(1);
    const calls = h.snapshot.mock.calls.length;
    h.set(empty()); for (let i = 0; i < 10; i++) h.event();
    await Promise.resolve();
    expect(h.snapshot).toHaveBeenCalledTimes(calls + 1);
    await vi.advanceTimersByTimeAsync(1200);
    expect(h.publish).toHaveBeenCalledTimes(2);
    expect(h.publish).toHaveBeenLastCalledWith(empty());
    expect(vi.getTimerCount()).toBe(0);
    h.set({ pending: ['MathFluency'], failed: [], queued: [] }); h.event(); await Promise.resolve();
    expect(h.publish).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(1);
    h.cleanup();
  });
  it('keeps queued work visible and cancels a stale hide on a new load', async () => {
    const h = harness({ pending: [], failed: [], queued: ['MathFluency'] });
    expect(h.publish).toHaveBeenCalledTimes(1);
    h.set(empty()); h.event(); await Promise.resolve();
    h.set({ pending: ['MathFluency'], failed: [], queued: [] }); h.event(); await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1500);
    expect(h.publish.mock.calls.at(-1)[0].pending).toEqual(['MathFluency']);
    h.cleanup();
  });
  it('cleans up queued microtasks, retry timers, and event subscriptions', async () => {
    const h = harness({ pending: [], failed: ['ReportWriter'], queued: [] });
    h.event(); h.cleanup(); await Promise.resolve(); await vi.advanceTimersByTimeAsync(10000);
    expect(h.retry).not.toHaveBeenCalled();
    expect(h.snapshot).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('retries failures once and never repeats unchanged failure publications', async () => {
    const h = harness({ pending: [], failed: ['ReportWriter'], queued: [] });
    await vi.advanceTimersByTimeAsync(4000); h.event(); await Promise.resolve();
    await vi.advanceTimersByTimeAsync(8000);
    expect(h.retry).toHaveBeenCalledTimes(1);
    expect(h.publish).toHaveBeenCalledTimes(1);
    h.cleanup();
  });
});

function visit(node, callback) {
  if (!node || typeof node !== 'object') return;
  callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'comments', 'leadingComments', 'trailingComments', 'innerComments'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(item => visit(item, callback));
    else if (value && typeof value === 'object') visit(value, callback);
  }
}
const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
describe('feature loading and command render boundaries', () => {
  it.each(['ReportWriter', 'MathFluency', 'LivePolling', 'DirectionsComposer'])('%s loads only when its lazy entry is called and can be retried', name => {
    let assignment;
    visit(ast, node => { if (node.type === 'AssignmentExpression' && node.left.object?.name === 'window' && node.left.property?.name === '__alloLazy' + name) assignment = node; });
    expect(assignment).toBeTruthy();
    const load = vi.fn(), window = {};
    vm.runInNewContext(source.slice(assignment.start, assignment.end), { window, loadModule: load });
    expect(load).not.toHaveBeenCalled();
    window['__alloLazy' + name](); window['__alloLazy' + name]();
    expect(load).toHaveBeenCalledTimes(2); // registry owns in-flight dedup, not a sticky boolean
    expect(load.mock.calls[0][0]).toBe(name);
  });
  it('loads polling for joined students too and shares the command context', () => {
    expect(source).toContain('if (isAppReady && activeSessionCode) window.__alloLazyLivePolling?.();');
    expect(source).toContain("if (isAppReady && mathMode === 'Fluency Probes') window.__alloLazyMathFluency?.();");
    expect(source).toContain('if (isAppReady && showReportWriter) window.__alloLazyReportWriter?.();');
    expect(source).toContain('AlloCommandPalette, { ctx: _alloRenderCommandContext }');
    expect(source).toContain('AlloCommandProgress, { ctx: _alloRenderCommandContext }');
    expect(readFileSync('allo_commands_source.jsx', 'utf8')).toContain('open && ctx ? buildAlloCommands');
  });
});
