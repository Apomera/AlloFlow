import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';
import { Blob } from 'node:buffer';
import { ReadableStream } from 'node:stream/web';
import { setTimeout as realSetTimeout } from 'node:timers';

const source = fs.readFileSync('runtime_graph_delivery_policy.js', 'utf8');
const entry = Buffer.from('export const answer=42;');
const wasm = Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]);
const descriptor = (kind, path, bytes) => ({ kind, path, bytes: bytes.length, sha384: createHash('sha384').update(bytes).digest('hex'), mirrors: [], ...(kind === 'module' ? { closed: true } : {}) });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const turn = () => new Promise(resolve => realSetTimeout(resolve, 0));

function setup(options = {}) {
  const wasmFile = options.wasm || wasm;
  const manifest = { schemaVersion: 1, assets: { entry: { ...descriptor('module', 'runtime/entry.js', entry), dependencies: ['wasm'] }, wasm: descriptor('wasm', 'runtime/engine.wasm', wasmFile) },
    graphs: { fixture: { assets: ['entry', 'wasm'], entry: 'entry', configureExport: 'configure' } } };
  const events = [], revoked = [], blobs = new Map(), calls = [];
  const configure = vi.fn(options.configure || (() => {}));
  const namespace = { configure, answer: 42 };
  const importModule = vi.fn(options.importModule || (async () => namespace));
  const response = (bytes, settings = {}) => ({ status: settings.status ?? 200, body: new ReadableStream({
    start(controller) { if (bytes) controller.enqueue(new Uint8Array(bytes)); if (settings.close !== false) controller.close(); },
    cancel(reason) { events.push('cancel:' + (settings.label || 'body')); return settings.cancel?.(reason); },
  }) });
  const fetch = vi.fn(async (url, request) => {
    calls.push({ url, request }); events.push('fetch:' + url);
    request.signal?.addEventListener('abort', () => events.push('abort:' + url));
    if (options.fetch) return options.fetch(url, request, { response, events, calls });
    return response(url.endsWith('.wasm') ? wasmFile : entry);
  });
  const context = vm.createContext({ URL }); vm.runInContext(source, context);
  const policy = context._alloCreateRuntimeGraphDeliveryPolicy(manifest, {
    baseUrl: 'https://school.example/app/', fetch, crypto: { subtle: { digest: options.digest || webcrypto.subtle.digest.bind(webcrypto.subtle) } }, Blob,
    URL: { createObjectURL(blob) { const url = 'blob:fixture/' + (blobs.size + revoked.length + 1); blobs.set(url, blob); return url; }, revokeObjectURL(url) { revoked.push(url); blobs.delete(url); } },
    AbortController, setTimeout, clearTimeout, importModule,
  });
  return { policy, fetch, events, revoked, blobs, calls, configure, importModule, namespace, response };
}

afterEach(() => vi.useRealTimers());

describe('bounded executable acquisition cleanup', () => {
  it.each(['resolve', 'reject', 'never'])('cancels an HTTP error body and aborts before fallback even when cleanup will %s', async mode => {
    const f = setup({ fetch(url, _, { response }) {
      if (url === 'https://school.example/app/runtime/entry.js') return response(Buffer.from('error'), { status: 503, close: false, label: 'primary',
        cancel: () => mode === 'reject' ? Promise.reject(Error('cancel rejected')) : mode === 'never' ? new Promise(() => {}) : undefined });
      return response(url.endsWith('.wasm') ? wasm : entry);
    } });
    const pending = f.policy.prepare('fixture'); pending.catch(() => {});
    const outcome = await Promise.race([pending.then(() => 'prepared'), new Promise(resolve => realSetTimeout(() => resolve('cleanup hung'), 2000))]);
    expect(outcome).toBe('prepared');
    const fallback = f.events.indexOf('fetch:https://school.example/runtime/entry.js');
    expect(f.events.indexOf('cancel:primary')).toBeGreaterThanOrEqual(0);
    expect(f.events.indexOf('cancel:primary')).toBeLessThan(fallback);
    expect(f.events.indexOf('abort:https://school.example/app/runtime/entry.js')).toBeGreaterThanOrEqual(0);
    expect(f.events.indexOf('abort:https://school.example/app/runtime/entry.js')).toBeLessThan(fallback);
    (await pending).dispose();
  });

  it('a stalled fetch has a hard deadline and its late response cannot execute or poison a retry', async () => {
    vi.useFakeTimers(); const first = deferred(); let stalled = true;
    const f = setup({ fetch(url, _, { response }) { if (stalled) return first.promise; return response(url.endsWith('.wasm') ? wasm : entry); } });
    const pending = f.policy.prepare('fixture'); pending.catch(() => {});
    await vi.advanceTimersByTimeAsync(60000);
    // A deadline is terminal for this graph; only an explicit caller retry
    // may select the reviewed sources again.
    stalled = false;
    await vi.runAllTimersAsync();
    await expect(pending).rejects.toMatchObject({ code: 'ALLO_RUNTIME_INTEGRITY' });
    expect(f.fetch).toHaveBeenCalledTimes(1);
    expect(f.importModule).not.toHaveBeenCalled(); expect(f.blobs.size).toBe(0);
    first.resolve(f.response(entry)); await turn();
    expect(f.importModule).not.toHaveBeenCalled(); expect(f.blobs.size).toBe(0);
    const fresh = await f.policy.prepare('fixture'); await fresh.load();
    expect(f.importModule).toHaveBeenCalledTimes(1); fresh.dispose();
  });

  it('a stalled response reader cannot hold the deadline or cleanup open', async () => {
    vi.useFakeTimers();
    const f = setup({ fetch(_url, _request, { response }) { return response(null, { close: false, cancel: () => new Promise(() => {}) }); } });
    const pending = f.policy.prepare('fixture'); pending.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(pending).rejects.toMatchObject({ code: 'ALLO_RUNTIME_INTEGRITY' });
    expect(f.importModule).not.toHaveBeenCalled(); expect(f.blobs.size).toBe(0);
    expect(f.events.some(event => event.startsWith('abort:'))).toBe(true);
    expect(f.events.some(event => event.startsWith('cancel:'))).toBe(true);
  });

  it('a stalled digest is bounded and late hash completion cannot revive the failed acquisition', async () => {
    vi.useFakeTimers(); const first = deferred(); let calls = 0;
    const f = setup({ digest: (...args) => ++calls === 1 ? first.promise : webcrypto.subtle.digest(...args) });
    const pending = f.policy.prepare('fixture'); pending.catch(() => {});
    await turn(); expect(calls).toBe(1);
    await vi.runAllTimersAsync();
    await expect(pending).rejects.toMatchObject({ code: 'ALLO_RUNTIME_INTEGRITY' });
    first.resolve(await webcrypto.subtle.digest('SHA-384', entry)); await turn();
    expect(f.importModule).not.toHaveBeenCalled(); expect(f.blobs.size).toBe(0);
    const fresh = await f.policy.prepare('fixture'); await fresh.load(); expect(f.importModule).toHaveBeenCalledTimes(1); fresh.dispose();
  });
});

// A flat 60 s per file meant the 20.6 MB Kokoro engine needed 2.75 Mbps sustained, and the
// no-store fetch restarts from zero, so a slow school network could never finish. Now a file
// ends after 60 s WITHOUT DATA (a stall is still found in a minute), or at a ceiling of
// 30 s + the file at 0.25 Mbps (never under 60 s) so a trickle cannot hold the runtime open.
describe('executable download deadline: stall check plus a size-scaled ceiling', () => {
  const big = Buffer.concat([wasm, Buffer.alloc(20_600_000 - wasm.length)]);
  const CEILING = (bytes) => Math.max(60000, 30000 + Math.ceil(bytes / 31));
  // Delivers `bytes` in `chunks` pieces, `gapMs` apart (fake time), then goes silent after `stopAfter` pieces.
  const slowBody = (bytes, chunks, gapMs, stopAfter = chunks, events = []) => {
    let sent = 0, live = true; const size = Math.ceil(bytes.length / chunks);
    return new ReadableStream({
      async pull(controller) {
        if (sent >= stopAfter) return new Promise(() => {});
        await new Promise(resolve => setTimeout(resolve, gapMs));
        if (!live) return;
        controller.enqueue(new Uint8Array(bytes.subarray(sent * size, (sent + 1) * size))); sent++;
        if (sent >= chunks) controller.close();
      },
      cancel() { live = false; events.push('cancel:slow'); },
    });
  };
  // One byte every `gapMs`, forever: progress that never completes.
  const dripBody = (gapMs, events = []) => {
    let live = true;
    return new ReadableStream({
      async pull(controller) { await new Promise(resolve => setTimeout(resolve, gapMs)); if (live) controller.enqueue(new Uint8Array(1)); },
      cancel() { live = false; events.push('cancel:drip'); },
    });
  };
  // The first file's hash runs in real time; fake time must not move until the big file's own timers have started.
  const untilSecondFetch = async f => { for (let i = 0; i < 400 && f.fetch.mock.calls.length < 2; i++) await turn(); };
  const settledState = promise => { const state = { done: false, error: null }; promise.then(() => { state.done = true; }, error => { state.done = true; state.error = error; }); return state; };
  const bigGraph = body => setup({ wasm: big, fetch(url, _, { response, events }) { return url.endsWith('.wasm') ? { status: 200, body: body(events) } : response(entry); } });

  it.each([[8000, 'about 1 Mbps, 160 s in all'], [15000, 'about 0.55 Mbps, 300 s in all']])(
    'a 20 MB file still arriving long after the old 60 s limit is accepted while data keeps coming (a chunk every %i ms: %s)', async gap => {
      vi.useFakeTimers();
      const f = bigGraph(() => slowBody(big, 20, gap));
      const pending = f.policy.prepare('fixture'); const state = settledState(pending); await untilSecondFetch(f);
      await vi.advanceTimersByTimeAsync(20 * gap + 5000);
      const session = await pending;
      expect(state.error).toBeNull();
      expect(f.fetch).toHaveBeenCalledTimes(2);
      expect(f.events.some(event => event.startsWith('abort:'))).toBe(false);
      session.dispose();
    });

  it('a 20 MB file that goes silent is ended 60 s after its last data, not at the ceiling, and nothing from it can run', async () => {
    vi.useFakeTimers();
    const f = bigGraph(events => slowBody(big, 20, 8000, 3, events));
    const events = f.events;
    const pending = f.policy.prepare('fixture'); const state = settledState(pending); await untilSecondFetch(f);
    await vi.advanceTimersByTimeAsync(24000 + 59000 - 1000); await turn(); // last chunk at 24 s; 59 s of silence so far
    expect(state.done).toBe(false);
    await vi.advanceTimersByTimeAsync(3000); await turn();
    expect(state.done).toBe(true);
    expect(state.error).toMatchObject({ code: 'ALLO_RUNTIME_INTEGRITY', message: expect.stringContaining('timed out') });
    expect(f.importModule).not.toHaveBeenCalled(); expect(f.blobs.size).toBe(0);
    expect(events.some(event => event.startsWith('abort:'))).toBe(true);
    expect(events).toContain('cancel:slow');
  });

  it('a trickle that never finishes is ended at the size ceiling even though data keeps arriving', async () => {
    vi.useFakeTimers();
    const f = bigGraph(events => dripBody(50000, events));
    const pending = f.policy.prepare('fixture'); const state = settledState(pending); await untilSecondFetch(f);
    await vi.advanceTimersByTimeAsync(CEILING(big.length) - 5000); await turn();
    expect(state.done).toBe(false); // a byte every 50 s keeps the stall check satisfied
    await vi.advanceTimersByTimeAsync(10000); await turn();
    expect(state.done).toBe(true);
    expect(state.error).toMatchObject({ code: 'ALLO_RUNTIME_INTEGRITY', message: expect.stringContaining('timed out') });
    expect(f.importModule).not.toHaveBeenCalled(); expect(f.blobs.size).toBe(0);
  });

  it('a small file keeps the 60 s floor: still waiting at 59 s, ended by 61 s', async () => {
    vi.useFakeTimers(); const never = deferred();
    const f = setup({ fetch() { return never.promise; } });
    const pending = f.policy.prepare('fixture'); const state = settledState(pending);
    await vi.advanceTimersByTimeAsync(59000); await turn();
    expect(state.done).toBe(false);
    await vi.advanceTimersByTimeAsync(2000); await turn();
    expect(state.done).toBe(true);
    expect(state.error).toMatchObject({ code: 'ALLO_RUNTIME_INTEGRITY' });
  });

  it('the ceiling grows with the file: 60 s for a tiny one, then 5 MB and 20 MB trickles end later and later', async () => {
    vi.useFakeTimers();
    const seen = [];
    for (const size of [wasm.length, 5_000_000, 20_600_000]) {
      const file = Buffer.concat([wasm, Buffer.alloc(size - wasm.length)]);
      const f = setup({ wasm: file, fetch(url, _, { response }) { return url.endsWith('.wasm') ? { status: 200, body: dripBody(50000) } : response(entry); } });
      const pending = f.policy.prepare('fixture'); const state = settledState(pending); await untilSecondFetch(f);
      let elapsed = 0; while (!state.done && elapsed < 800000) { await vi.advanceTimersByTimeAsync(1000); elapsed += 1000; await turn(); }
      seen.push(elapsed);
    }
    expect(seen).toEqual([60000, 192000, 695000]);
    expect(seen[0]).toBeLessThan(seen[1]); expect(seen[1]).toBeLessThan(seen[2]);
  }, 120000);
});

describe('module operation leases and closing-state checks', () => {
  it('disposal before the import microtask prevents the native import entirely', async () => {
    const f = setup(), session = await f.policy.prepare('fixture');
    const pending = session.load(); session.dispose();
    await expect(pending).rejects.toMatchObject({ code: 'ALLO_RUNTIME_INTEGRITY' });
    expect(f.importModule).not.toHaveBeenCalled(); expect(f.configure).not.toHaveBeenCalled(); expect(f.blobs.size).toBe(0);
  });

  it('disposal during import holds resource URLs until import settles and never configures a closed namespace', async () => {
    const started = deferred(), finish = deferred();
    const f = setup({ importModule: async () => { started.resolve(); return finish.promise; } }), session = await f.policy.prepare('fixture');
    const pending = session.load(); pending.catch(() => {}); await started.promise; session.dispose();
    expect(f.revoked).toHaveLength(0); expect(f.blobs.size).toBe(2);
    finish.resolve(f.namespace);
    await expect(pending).rejects.toMatchObject({ code: 'ALLO_RUNTIME_INTEGRITY' });
    expect(f.configure).not.toHaveBeenCalled(); expect(f.blobs.size).toBe(0);
  });

  it('concurrent loads import and configure once, while disposal rejects their closed result', async () => {
    const configuring = deferred(), finish = deferred();
    const f = setup({ configure: async () => { configuring.resolve(); await finish.promise; } }), session = await f.policy.prepare('fixture');
    const one = session.load(), two = session.load(); one.catch(() => {}); two.catch(() => {});
    await configuring.promise; expect(f.importModule).toHaveBeenCalledTimes(1); expect(f.configure).toHaveBeenCalledTimes(1);
    session.dispose(); expect(f.revoked).toHaveLength(0); finish.resolve();
    await expect(one).rejects.toMatchObject({ code: 'ALLO_RUNTIME_INTEGRITY' });
    await expect(two).rejects.toMatchObject({ code: 'ALLO_RUNTIME_INTEGRITY' });
    expect(f.blobs.size).toBe(0); expect(new Set(f.revoked).size).toBe(f.revoked.length);
  });

  it('an independent asset lease survives a closing import until that consumer releases it', async () => {
    const started = deferred(), finish = deferred();
    const f = setup({ importModule: async () => { started.resolve(); return finish.promise; } }), session = await f.policy.prepare('fixture'), asset = session.asset('wasm');
    const pending = session.import('entry'); pending.catch(() => {}); await started.promise; session.dispose();
    finish.resolve(f.namespace); await expect(pending).rejects.toMatchObject({ code: 'ALLO_RUNTIME_INTEGRITY' });
    expect(f.blobs.has(asset.url)).toBe(true); expect(f.revoked).toHaveLength(0);
    asset.revoke(); asset.revoke(); expect(f.blobs.size).toBe(0);
  });
});
