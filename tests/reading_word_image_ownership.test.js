import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync(process.env.ALLO_LOOKUP_HOST_CANDIDATE || 'host_handlers_source.jsx', 'utf8');
const start = source.indexOf('const handleFetchWordImage = async (word) => {'), end = source.indexOf('const _legacyResolveReadAloudAudio =', start);
if (start < 0 || end < 0) throw Error('Image handler extraction failed');
const createHandler = new Function('__d', source.slice(start, end) + '\nreturn handleFetchWordImage;');
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const popup = (passage = 'The river bank is steep.', language = 'English', text = 'The edge of a river.') => ({ word: 'bank', text, language, lookupRequest: Object.freeze({ language, grade: '3', passageText: passage, selectionStart: passage.indexOf('bank') }) });
function fixture(batched = false) {
  const state = { definitionData: popup(), generatedContent: { id: 'saved', data: 'Saved passage' }, activeView: 'simplified' }, queue = [];
  const requests = [], cache = new Map();
  const deps = { get definitionData() { return state.definitionData; }, get generatedContent() { return state.generatedContent; }, get activeView() { return state.activeView; },
    wordImageCacheRef: { current: cache }, warnLog: vi.fn(), callImagen: vi.fn(() => { const request = deferred(); requests.push(request); return request.promise; }),
    setDefinitionData: update => { if (batched) queue.push(update); else state.definitionData = update(state.definitionData); } };
  return { state, deps, requests, cache, run: word => createHandler(deps)(word), flush: () => queue.splice(0).forEach(update => { state.definitionData = update(state.definitionData); }) };
}
afterEach(() => { delete window.__alloStudentAiDisabled; delete window.AlloFlowConfig; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('reading word image ownership and context', () => {
  it.each(['different word', 'same word', 'changed meaning', 'close', 'resource', 'edited text', 'navigation'])('ignores stale success after %s', async change => {
    const f = fixture(), pending = f.run('bank');
    if (change === 'different word') f.state.definitionData = { ...popup(), word: 'tree' };
    if (change === 'same word') f.state.definitionData = popup('The bank lends money.', 'English', 'A financial institution.');
    if (change === 'changed meaning') f.state.definitionData = { ...f.state.definitionData, text: 'A revised explanation.' };
    if (change === 'close') f.state.definitionData = null;
    if (change === 'resource') f.state.generatedContent = { id: 'other', data: 'Saved passage' };
    if (change === 'edited text') f.state.generatedContent = { id: 'saved', data: 'Edited passage' };
    if (change === 'navigation') f.state.activeView = 'history';
    const current = f.state.definitionData;
    f.requests[0].resolve('stale.png'); await pending;
    if (change === 'changed meaning') expect(f.state.definitionData).toMatchObject({ text: current.text, imageLoading: false, imageError: false });
    else expect(f.state.definitionData).toBe(current);
    expect(f.state.definitionData?.imageUrl).toBeUndefined(); expect(f.cache.size).toBe(0);
  });
  it('ignores failure after a same-word popup was reopened through a new host factory', async () => {
    const f = fixture(), pending = f.run('bank'); f.state.definitionData = popup();
    const next = f.run('bank'); f.requests[1].resolve('new.png'); await next;
    f.requests[0].reject(new Error('Late error')); await pending;
    expect(f.state.definitionData).toMatchObject({ imageUrl: 'new.png', imageLoading: false, imageError: false });
  });
  it('uses the saved language and passage meaning in both prompt and cache identity', async () => {
    const f = fixture(); f.cache.set('bank', 'legacy-ambiguous.png');
    const first = f.run('bank');
    expect(f.deps.callImagen.mock.calls[0][0]).toContain('The river bank is steep.'); expect(f.state.definitionData.imageUrl).toBeUndefined();
    f.requests[0].resolve('river.png'); await first;
    f.state.definitionData = popup('The bank lends money.', 'English', 'A financial institution.');
    const second = f.run('bank'); f.requests[1].resolve('money.png'); await second;
    f.state.definitionData = popup('The river bank is steep.', 'Spanish');
    const third = f.run('bank'); expect(f.deps.callImagen.mock.calls[2][0]).toContain('"language":"Spanish"'); f.requests[2].resolve('spanish.png'); await third;
    f.state.definitionData = popup(); await f.run('bank');
    expect(f.state.definitionData).toMatchObject({ imageUrl: 'river.png', imageLoading: false, imageError: false }); expect(f.deps.callImagen).toHaveBeenCalledTimes(3);
  });
  it('retries an image failure without reselecting and clears the old error', async () => {
    const f = fixture(), request = f.state.definitionData.lookupRequest, pending = f.run('bank');
    f.requests[0].reject(new Error('Offline')); await pending; expect(f.state.definitionData.imageError).toBe(true);
    const retry = f.run('bank'); expect(f.state.definitionData.imageError).toBe(false);
    f.requests[1].resolve('ready.png'); await retry;
    expect(f.state.definitionData.lookupRequest).toBe(request); expect(f.state.definitionData.imageUrl).toBe('ready.png');
  });
  it('commits an immediate result correctly when React batches the loading and result setters', async () => {
    const f = fixture(true), pending = f.run('bank'); f.requests[0].resolve('fast.png'); await pending; f.flush();
    expect(f.state.definitionData).toMatchObject({ imageUrl: 'fast.png', imageLoading: false });
  });
  it('allows cached help with AI disabled but makes no new image request', async () => {
    const f = fixture(), pending = f.run('bank'); f.requests[0].resolve('cached.png'); await pending;
    window.__alloStudentAiDisabled = true; f.state.definitionData = popup(); await f.run('bank');
    expect(f.state.definitionData.imageUrl).toBe('cached.png');
    f.state.definitionData = popup('Another bank.', 'Spanish'); await f.run('bank');
    expect(f.state.definitionData.imageError).toBe(true); expect(f.deps.callImagen).toHaveBeenCalledTimes(1);
  });
});

describe('reading word image deadline and lookup lifetime', () => {
  it('times out a hung provider, keeps useful help, and retries without accepting the late result', async () => {
    vi.useFakeTimers(); const f = fixture();
    f.state.definitionData.preparedText = 'The land beside water.';
    f.state.definitionData.dictionary = { word: 'bank' };
    const request = f.state.definitionData.lookupRequest, first = f.run('bank');
    const signal = f.deps.callImagen.mock.calls[0][3].signal;
    await vi.advanceTimersByTimeAsync(59999); expect(f.state.definitionData.imageLoading).toBe(true);
    await vi.advanceTimersByTimeAsync(1); await first;
    expect(signal.aborted).toBe(true); expect(vi.getTimerCount()).toBe(0);
    expect(f.state.definitionData).toMatchObject({ imageLoading: false, imageError: true, imageErrorReason: 'timeout', preparedText: 'The land beside water.', dictionary: { word: 'bank' } });
    const retry = f.run('bank'); expect(f.state.definitionData.imageErrorReason).toBeNull();
    expect(f.deps.callImagen.mock.calls[1][0]).toBe(f.deps.callImagen.mock.calls[0][0]);
    f.requests[0].resolve('stale.png'); await Promise.resolve(); await Promise.resolve();
    expect(f.cache.size).toBe(0); expect(f.state.definitionData.imageLoading).toBe(true);
    f.requests[1].resolve('ready.png'); await retry;
    expect(f.state.definitionData.lookupRequest).toBe(request); expect(f.state.definitionData.imageUrl).toBe('ready.png'); expect(vi.getTimerCount()).toBe(0);
  });
  it('settles an ignored provider on popup lifetime cancellation and detaches its listener', async () => {
    vi.useFakeTimers(); const f = fixture(), controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    f.state.definitionData.lookupRequest = { ...f.state.definitionData.lookupRequest, signal: controller.signal };
    const pending = f.run('bank'), signal = f.deps.callImagen.mock.calls[0][3].signal;
    f.state.definitionData = null; controller.abort(); await pending;
    expect(signal.aborted).toBe(true); expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0); expect(f.cache.size).toBe(0); expect(f.state.definitionData).toBeNull();
  });
  it('launches no work for an already cancelled popup', async () => {
    vi.useFakeTimers(); const f = fixture(), controller = new AbortController(); controller.abort();
    f.state.definitionData.lookupRequest = { ...f.state.definitionData.lookupRequest, signal: controller.signal };
    await f.run('bank'); expect(f.deps.callImagen).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it('reports a timeout when the provider rejects in response to abort', async () => {
    vi.useFakeTimers(); const f = fixture();
    f.deps.callImagen.mockImplementation((_, width, quality, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Aborted')))));
    const pending = f.run('bank'); await vi.advanceTimersByTimeAsync(60000); await pending;
    expect(f.state.definitionData.imageErrorReason).toBe('timeout'); expect(vi.getTimerCount()).toBe(0);
  });
  it('discards and does not cache new pictures if AI is turned off while waiting', async () => {
    const f = fixture(), pending = f.run('bank'); window.__alloStudentAiDisabled = true;
    f.requests[0].resolve('late-disabled.png'); await pending;
    expect(f.state.definitionData).toMatchObject({ imageLoading: false, imageErrorReason: 'disabled' }); expect(f.state.definitionData.imageUrl).toBeUndefined(); expect(f.cache.size).toBe(0);
  });
  it('creates no new provider wait for a cached picture', async () => {
    vi.useFakeTimers(); const f = fixture(), first = f.run('bank'); f.requests[0].resolve('cached.png'); await first;
    f.state.definitionData = popup(); window.__alloStudentAiDisabled = true; await f.run('bank');
    expect(f.state.definitionData.imageUrl).toBe('cached.png'); expect(f.deps.callImagen).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
  });
  it.each([[1, 1000], [2000, 2000], [999999, 180000], [0, 60000], ['bad', 60000]])('bounds picture timeout %s at %s ms', async (configured, expected) => {
    vi.useFakeTimers(); window.AlloFlowConfig = { timeouts: { readingPictureMs: configured } }; const f = fixture(), pending = f.run('bank');
    await vi.advanceTimersByTimeAsync(expected - 1); expect(f.state.definitionData.imageLoading).toBe(true);
    await vi.advanceTimersByTimeAsync(1); await pending;
    expect(f.state.definitionData.imageErrorReason).toBe('timeout'); expect(vi.getTimerCount()).toBe(0);
  });
  it('keeps the deadline and stale-result guard when AbortController is unavailable', async () => {
    vi.useFakeTimers(); vi.stubGlobal('AbortController', undefined); const f = fixture(), pending = f.run('bank');
    expect(f.deps.callImagen.mock.calls[0][3].signal).toBeNull();
    await vi.advanceTimersByTimeAsync(60000); await pending; f.requests[0].resolve('late.png'); await Promise.resolve(); await Promise.resolve();
    expect(f.state.definitionData.imageUrl).toBeUndefined(); expect(f.cache.size).toBe(0); expect(f.state.definitionData.imageErrorReason).toBe('timeout');
  });
});
