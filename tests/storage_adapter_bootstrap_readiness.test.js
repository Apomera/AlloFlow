import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
const start = '  useEffect(() => {\n    let cancelled = false;\n    let initInFlight = null;';
const from = source.indexOf(start), to = source.indexOf('  const adventureImageDB = React.useMemo', from);
if (from < 0 || to < from || source.indexOf(start, from + start.length) >= 0) throw Error('Missing or ambiguous storage bootstrap effect');
const effect = source.slice(from, to);
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

function fixture({ vendorsReady = true } = {}) {
  const adapter = deferred(), vendors = { LZString: deferred(), idbKeyval: deferred() }, events = new EventTarget(), updates = [];
  const window = { location: { pathname: '/app/', hostname: '127.0.0.1' }, addEventListener: vi.fn((...args) => events.addEventListener(...args)), removeEventListener: vi.fn((...args) => events.removeEventListener(...args)) };
  if (vendorsReady) { window.LZString = {}; window.idbKeyval = {}; }
  let cleanup;
  const env = {
    window, document: { body: {} }, useEffect: work => { cleanup = work(); },
    _alloAwaitModules: vi.fn(() => adapter.promise),
    _alloLoadScriptGlobal: vi.fn((url, check, options) => {
      const key = options.cacheKey;
      return vendors[key].promise.then(value => { window[key] = value; return value; });
    }),
    ALLO_STORAGE_SCRIPT_TIMEOUT_MS: 10000,
    setLzLoaded: vi.fn(value => updates.push(['loaded', value])),
    setIsStorageDisabled: vi.fn(value => updates.push(['disabled', value])),
    warnLog: vi.fn(), debugLog: vi.fn(), addToastRef: { current: vi.fn() }, t: key => key,
  };
  const scope = new Proxy(env, { has: () => true, get: (target, key) => key === Symbol.unscopables ? undefined : key in target ? target[key] : globalThis[key] });
  new Function('scope', 'with(scope) {' + effect + '}')(scope);
  return { env, adapter, vendors, updates, online: () => events.dispatchEvent(new Event('online')), unmount: () => cleanup() };
}

describe('storage bootstrap waits for the actual saved-work adapter', () => {
  it('keeps local hydration and saving blocked until the adapter replaces its placeholder', async () => {
    const f = fixture(); await flush();
    expect(f.env._alloAwaitModules).toHaveBeenCalledExactlyOnceWith([['UtilsPure', 'UtilsPure']], 'saved work storage');
    expect(f.env.setLzLoaded).not.toHaveBeenCalled(); expect(f.env.setIsStorageDisabled).not.toHaveBeenCalled();
    f.adapter.resolve(); await flush();
    expect(f.updates).toEqual([['loaded', true], ['disabled', false]]); f.unmount();
  });
  it('also waits for both real vendor globals when the adapter is already available', async () => {
    const f = fixture({ vendorsReady: false }); f.adapter.resolve(); await flush();
    expect(f.env._alloLoadScriptGlobal).toHaveBeenCalledTimes(2); expect(f.env.setLzLoaded).not.toHaveBeenCalled();
    f.vendors.LZString.resolve({}); await flush(); expect(f.env.setLzLoaded).not.toHaveBeenCalled();
    f.vendors.idbKeyval.resolve({}); await flush(); expect(f.updates).toEqual([['loaded', true], ['disabled', false]]); f.unmount();
  });
  it('disables persistence before publishing a failed adapter bootstrap', async () => {
    const f = fixture(); f.adapter.reject(Error('Storage adapter failed')); await flush();
    expect(f.updates).toEqual([['disabled', true], ['loaded', true]]);
    expect(f.env.addToastRef.current).toHaveBeenCalledExactlyOnceWith('toasts.storage_disabled', 'error'); f.unmount();
  });
  it('recovers through the existing explicit Retry hook after an adapter failure', async () => {
    const f = fixture(); f.adapter.reject(Error('Storage adapter failed')); await flush();
    const retry = deferred(); f.env._alloAwaitModules.mockImplementation(() => retry.promise);
    f.env.window.__alloRetryStorageBootstrap(); await flush(); expect(f.env._alloAwaitModules).toHaveBeenCalledTimes(2);
    retry.resolve(); await flush(); expect(f.updates.slice(-2)).toEqual([['loaded', true], ['disabled', false]]); f.unmount();
  });
  it('coalesces retries while the same adapter bootstrap is still in flight', async () => {
    const f = fixture(); f.online(); f.env.window.__alloRetryStorageBootstrap(); await flush();
    expect(f.env._alloAwaitModules).toHaveBeenCalledOnce(); f.adapter.resolve(); await flush();
    expect(f.env.setLzLoaded).toHaveBeenCalledOnce(); f.unmount();
  });
  it('recovers on reconnect after a settled adapter failure', async () => {
    const f = fixture(); f.adapter.reject(Error('Disconnected')); await flush();
    f.env._alloAwaitModules.mockResolvedValue(undefined); f.online(); await flush();
    expect(f.updates.slice(-2)).toEqual([['loaded', true], ['disabled', false]]); f.unmount();
  });
  it.each(['resolve', 'reject'])('does not publish storage state after unmount when loading settles with %s', async outcome => {
    const f = fixture(); await flush(); const retry = f.env.window.__alloRetryStorageBootstrap; f.unmount();
    f.adapter[outcome](Error('Settled after unmount')); await flush(); retry(); f.online(); await flush();
    expect(f.updates).toEqual([]); expect(f.env.warnLog).not.toHaveBeenCalled();
    expect(f.env.addToastRef.current).not.toHaveBeenCalled(); expect(f.env._alloAwaitModules).toHaveBeenCalledOnce();
    expect(f.env.window.__alloRetryStorageBootstrap).toBeUndefined();
  });
});
