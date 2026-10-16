import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

function loaderSection(file = 'AlloFlowANTI.txt') {
  const source = readFileSync(file, 'utf8');
  const start = source.indexOf('let _CACHE_WORD_AUDIO_BANK = null;');
  const marker = 'window.loadWordAudioBank = loadWordAudioBank;';
  const end = source.indexOf(marker, start);
  if (start < 0 || end < 0) throw new Error('Word-bank loader boundary missing: ' + file);
  return source.slice(start, end + marker.length);
}
const section = loaderSection();
const clip = 'data:audio/webm;base64,GkXfo3Rlc3Q=';
const success = body => ({ ok: true, status: 200, json: async () => body });
function harness(fetchImpl) {
  const fetch = vi.fn(fetchImpl), schedule = vi.fn(), window = {};
  const api = new Function('_AUDIO_BANK_URLS', 'fetch', 'window', 'console', 'setTimeout', section + `
    return { load: loadWordAudioBank, state: () => ({ cache: _CACHE_WORD_AUDIO_BANK, pending: _wordAudioBankLoad, retryAt: _wordAudioBankRetryAt }) };
  `)(['https://first.test/audio_bank.json', 'https://second.test/audio_bank.json'], fetch, window,
    { log: vi.fn(), warn: vi.fn() }, schedule);
  return { ...api, fetch, schedule, window };
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-14T12:00:00Z')); });
afterEach(() => vi.useRealTimers());

describe('recorded word-bank download recovery', () => {
  it('retries immediately on an explicit request after all sources were temporarily unavailable', async () => {
    let online = false;
    const h = harness(async () => { if (!online) throw new Error('offline'); return success({ words: { sun: clip } }); });
    await h.load();
    expect(h.fetch).toHaveBeenCalledTimes(2);
    expect(h.state().cache).toBeNull();
    expect(h.state().pending).toBeNull();
    expect(h.window._CACHE_WORD_AUDIO_BANK).toBeNull();
    online = true;
    await h.load({ retry: true });
    expect(h.fetch).toHaveBeenCalledTimes(3);
    expect(h.state()).toEqual({ cache: { sun: clip }, pending: null, retryAt: 0 });
    expect(h.window._CACHE_WORD_AUDIO_BANK).toEqual({ sun: clip });
  });

  it('suppresses repeated passive calls during cooldown and never schedules an automatic retry loop', async () => {
    let online = false;
    const h = harness(async () => online ? success({ words: { sun: clip } }) : { ok: false, status: 503 });
    await h.load();
    online = true;
    await Promise.all(Array.from({ length: 30 }, () => h.load()));
    expect(h.fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(9999);
    await h.load();
    expect(h.fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(h.fetch).toHaveBeenCalledTimes(2);
    await h.load();
    expect(h.fetch).toHaveBeenCalledTimes(3);
    expect(h.state().cache).toEqual({ sun: clip });
    expect(h.schedule).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent normal and explicit retry calls, then keeps the successful cache', async () => {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const h = harness(() => gate);
    const first = h.load();
    const others = Array.from({ length: 8 }, (_, index) => h.load(index % 2 ? { retry: true } : undefined));
    expect(h.fetch).toHaveBeenCalledTimes(1);
    release(success({ words: { sun: clip } }));
    await Promise.all([first, ...others]);
    expect(h.state().pending).toBeNull();
    await h.load(); await h.load({ retry: true });
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.state().cache).toEqual({ sun: clip });
  });

  it.each([
    null, {}, { words: {} }, { words: [] }, { words: { sun: null } },
    { words: { sun: 'not-audio' } }, { words: { sun: 'data:text/html;base64,QQ==' } },
    { words: { sun: clip, moon: 'broken' } },
  ])('does not permanently cache an empty or malformed response: %j', async malformed => {
    let recovered = false;
    const h = harness(async () => success(recovered ? { words: { sun: clip } } : malformed));
    await h.load();
    expect(h.fetch).toHaveBeenCalledTimes(2);
    expect(h.state().cache).toBeNull();
    expect(h.state().pending).toBeNull();
    recovered = true;
    await h.load({ retry: true });
    expect(h.state().cache).toEqual({ sun: clip });
  });

  it('continues to the fallback host when the first response is not JSON', async () => {
    const h = harness(async url => url.includes('first.test')
      ? { ok: true, json: async () => { throw new SyntaxError('bad JSON'); } }
      : success({ words: { sun: clip } }));
    await h.load();
    expect(h.fetch).toHaveBeenCalledTimes(2);
    expect(h.state().cache).toEqual({ sun: clip });
  });

  it('accepts the complete shipped word bank and exposes it for existing consumers', async () => {
    const bank = JSON.parse(readFileSync('word_audio_kokoro_bank.json', 'utf8'));
    const h = harness(async () => success(bank));
    await h.load();
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.window._CACHE_WORD_AUDIO_BANK).toBe(bank.words);
  });

  it('keeps the generated desktop host loaders identical to the canonical loader', () => {
    for (const file of ['desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt']) expect(loaderSection(file), file).toBe(section);
  });
});
