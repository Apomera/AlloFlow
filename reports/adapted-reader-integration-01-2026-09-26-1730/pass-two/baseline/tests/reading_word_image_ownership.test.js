import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { applyImageOwnership } = require('../dev-tools/prepare_reading_lookup_enhancements.cjs');
const source = process.env.ALLO_LOOKUP_HOST_CANDIDATE ? readFileSync(process.env.ALLO_LOOKUP_HOST_CANDIDATE, 'utf8') : applyImageOwnership(readFileSync('host_handlers_source.jsx', 'utf8').replace(/\r\n/g, '\n'));
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
afterEach(() => { delete window.__alloStudentAiDisabled; vi.restoreAllMocks(); });

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
