/**
 * Audio-bank split (2026-08-23 perf pass).
 *
 * audio_bank.json (~15 MB, one 10.8 MB 'words' category) used to download and
 * parse on every boot. It is now ALSO published per-category under
 * audio_bank/ with an index; the runtime loader in AlloFlowANTI.txt fetches a
 * category on the first getAudio() miss that names it and falls back to the
 * legacy whole-file fetch when the split index is unreachable. These tests
 * execute the REAL loader section extracted from the monolith against stubbed
 * fetches, and pin the generated artifacts and the deferred strings refresh.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const ANTI = readFileSync(resolve(ROOT, 'AlloFlowANTI.txt'), 'utf8');

function extractLoaderSection() {
  const start = ANTI.indexOf('let _AUDIO_BANK = null;');
  const endMarker = 'window.loadWordAudioBank = loadWordAudioBank;';
  const end = ANTI.indexOf(endMarker);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return ANTI.slice(start, end + endMarker.length);
}

function makeHarness(routes) {
  const events = [];
  const idleCallbacks = [];
  const fetches = [];
  const windowStub = {
    dispatchEvent: (event) => { events.push(event.type); },
    addEventListener: () => {},
  };
  const fetchStub = async (url) => {
    fetches.push(url);
    for (const [pattern, body] of routes) {
      if (url.includes(pattern)) {
        if (body === null) return { ok: false, status: 404 };
        return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(body)) };
      }
    }
    return { ok: false, status: 404 };
  };
  const section = extractLoaderSection();
  // eslint-disable-next-line no-new-func
  const factory = new Function(
    'window', 'document', 'fetch', 'console', 'Event', 'setTimeout', 'requestIdleCallback',
    section + '\nreturn { getAudio, _loadAudioBankIndex, _requestAudioCategory };'
  );
  const api = factory(
    windowStub,
    { readyState: 'complete' },
    fetchStub,
    { log: () => {}, warn: () => {} },
    class { constructor(type) { this.type = type; } },
    (fn) => { idleCallbacks.push(fn); return 0; },
    (fn) => { idleCallbacks.push(fn); return 0; }
  );
  return { api, events, fetches, idleCallbacks };
}

const settle = async () => { for (let i = 0; i < 20; i += 1) await Promise.resolve(); };

describe('split-bank runtime loader (extracted from the monolith)', () => {
  const INDEX = { generatedFrom: 'audio_bank.json', categories: { words: { keys: 1, bytes: 10 }, letters: { keys: 1, bytes: 10 } } };

  it('loads one category on first demand and announces it', async () => {
    const { api, events, fetches } = makeHarness([
      ['audio_bank/index.json', INDEX],
      ['audio_bank/words.json', { cat: 'data:audio/webm;base64,QQ==' }],
    ]);
    expect(api.getAudio('words', 'cat')).toBeNull();
    await settle();
    expect(api.getAudio('words', 'cat')).toBe('data:audio/webm;base64,QQ==');
    expect(events).toContain('audio_bank_loaded');
    // Only the index and the demanded category were fetched — never the 15 MB file.
    expect(fetches.some((url) => url.endsWith('audio_bank.json'))).toBe(false);
    expect(fetches.some((url) => url.includes('audio_bank/letters.json'))).toBe(false);
  });

  it('falls back to the legacy whole-file fetch when the split index is unreachable', async () => {
    const { api, events } = makeHarness([
      ['audio_bank/index.json', null],
      ['audio_bank.json', { words: { cat: 'legacy-clip' } }],
    ]);
    expect(api.getAudio('words', 'cat')).toBeNull();
    await settle();
    expect(api.getAudio('words', 'cat')).toBe('legacy-clip');
    expect(events).toContain('audio_bank_loaded');
  });

  it('a total category failure clears the pending flag so a later call retries', async () => {
    const routes = [
      ['audio_bank/index.json', INDEX],
      ['audio_bank/words.json', null],
    ];
    const { api, fetches } = makeHarness(routes);
    api.getAudio('words', 'cat');
    await settle();
    const firstAttempts = fetches.filter((url) => url.includes('audio_bank/words.json')).length;
    expect(firstAttempts).toBeGreaterThan(0);
    routes[1][1] = { cat: 'recovered-clip' };
    api.getAudio('words', 'cat');
    await settle();
    expect(api.getAudio('words', 'cat')).toBe('recovered-clip');
  });

  it('an unknown category is terminal and never refetched', async () => {
    const { api, fetches } = makeHarness([['audio_bank/index.json', INDEX]]);
    api.getAudio('nope', 'x');
    await settle();
    api.getAudio('nope', 'x');
    await settle();
    expect(fetches.filter((url) => url.includes('audio_bank/nope.json'))).toHaveLength(0);
  });
});

describe('split artifacts', () => {
  it('exist in both trees, mirror byte-identically, and reassemble to the source bank', () => {
    const master = JSON.parse(readFileSync(resolve(ROOT, 'audio_bank.json'), 'utf8'));
    const index = JSON.parse(readFileSync(resolve(ROOT, 'audio_bank', 'index.json'), 'utf8'));
    expect(Object.keys(index.categories).sort()).toEqual(Object.keys(master).sort());
    for (const category of Object.keys(master)) {
      const rootBody = readFileSync(resolve(ROOT, 'audio_bank', category + '.json'), 'utf8');
      const mirrorBody = readFileSync(resolve(ROOT, 'desktop', 'web-app', 'public', 'audio_bank', category + '.json'), 'utf8');
      expect(mirrorBody, category).toBe(rootBody);
      expect(JSON.parse(rootBody), category).toEqual(master[category]);
      expect(index.categories[category].keys).toBe(Object.keys(master[category]).length);
    }
    expect(existsSync(resolve(ROOT, 'desktop', 'web-app', 'public', 'audio_bank', 'index.json'))).toBe(true);
  });
});

describe('deferred, CDN-first strings refresh', () => {
  it('never cache-busts with Date.now() and prefers the app CDN over raw GitHub', () => {
    expect(ANTI).not.toContain('ui_strings.js?v=" + Date.now()');
    expect(ANTI).not.toContain('help_strings.js?v=" + Date.now()');
    expect(ANTI).toContain("stringsBase + 'ui_strings.js' + stringsPin");
    expect(ANTI).toContain("stringsBase + 'help_strings.js' + stringsPin");
    expect(ANTI).toContain('_scheduleRemoteStringsRefresh');
    expect(ANTI).toContain("window.addEventListener('load', _scheduleRemoteStringsRefresh");
    // The cached copies still apply synchronously at boot.
    const cacheApply = ANTI.indexOf('const cachedUiStrings = localStorage.getItem("alloflow_ui_strings_cache")');
    const refreshFn = ANTI.indexOf('const _refreshRemoteStrings');
    expect(cacheApply).toBeGreaterThan(-1);
    expect(cacheApply).toBeLessThan(refreshFn);
  });
});
