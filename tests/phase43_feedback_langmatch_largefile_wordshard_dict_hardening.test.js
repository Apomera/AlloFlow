import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { JSDOM, VirtualConsole } from 'jsdom';

const require = createRequire(import.meta.url);
const manifestTool = require('../dev-tools/build_browser_delivery_manifest.cjs');

const PHASE43_DELIVERABLES = [
  'translation_feedback_module.js',
  'language_matcher_module.js',
  'large_file_module.js',
  'word_audio_shard_client.js',
  'dictionary_loader.js',
];

const MIRROR_DIRS = [
  '.',
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

const HOSTS = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

const domWindows = [];
function makeDom(url = 'https://alloflow.example/') {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url,
    runScripts: 'outside-only',
    virtualConsole: new VirtualConsole(),
  });
  domWindows.push(dom.window);
  return dom.window;
}

afterEach(() => {
  while (domWindows.length) {
    try { domWindows.pop().close(); } catch (_) {}
  }
  vi.restoreAllMocks();
});

describe('Phase 43: mirror parity & 3-host SRI integrity', () => {
  it('keeps all 5 Phase 43 deliverables byte-identical across all 4 mirror trees and synced in 3 hosts', () => {
    const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
    const sha384 = (buf) => 'sha384-' + createHash('sha384').update(buf).digest('base64');

    const rootMeta = {};
    for (const file of PHASE43_DELIVERABLES) {
      const rootBuf = readFileSync(file);
      const rootHash = sha256(rootBuf);
      rootMeta[file] = { bytes: rootBuf.length, integrity: sha384(rootBuf) };
      for (const dir of MIRROR_DIRS) {
        const targetBuf = readFileSync(dir === '.' ? file : `${dir}/${file}`);
        expect(sha256(targetBuf), `${dir}/${file}`).toBe(rootHash);
      }
    }

    const releaseIds = new Set();
    for (const host of HOSTS) {
      const embedded = manifestTool.readEmbeddedManifest(readFileSync(host, 'utf8'));
      expect(embedded?.assets, host).toBeTruthy();
      releaseIds.add(embedded.releaseId);
      for (const file of PHASE43_DELIVERABLES) {
        if (embedded.assets[file]) {
          expect(embedded.assets[file].bytes, `${host} bytes ${file}`).toBe(rootMeta[file].bytes);
          expect(embedded.assets[file].integrity, `${host} sri ${file}`).toBe(rootMeta[file].integrity);
        }
      }
    }
    expect(releaseIds.size).toBe(1);
  });
});

describe('Phase 43: translation_feedback_module.js hardening', () => {
  const src = readFileSync('translation_feedback_module.js', 'utf8');

  it('blocks offerFor and modal submission in QR student and offline-only modes', () => {
    for (const flag of ['__alloQrStudentMode', '_alloQrBlocked', '__alloOfflineOnly']) {
      const w = makeDom();
      w[flag] = true;
      w.fetch = vi.fn();
      w.eval(src);

      const api = w.AlloModules.TranslationFeedback;
      expect(Object.isFrozen(api)).toBe(true);
      api.offerFor({ key: 'k', current: 'Hola', language: 'Spanish' });
      expect(w.document.getElementById('allo-tfb-pill')).toBeNull();

      api.openModal({ key: 'k', current: 'Hola', language: 'Spanish' });
      expect(w.document.getElementById('allo-tfb-send').disabled).toBe(true);
      w.document.getElementById('allo-tfb-suggest').value = 'Buenos dias';
      w.document.getElementById('allo-tfb-send').onclick();
      expect(w.fetch).not.toHaveBeenCalled();
    }
  });

  it('guards against prototype pollution in cached ui_strings, double-submit, and stale modal responses', async () => {
    const w = makeDom();
    w.localStorage.setItem(
      'alloflow_ui_strings_cache',
      '{"__proto__":{"polluted43":"yes"},"nav":{"home":"Home"}}'
    );
    let resolveFirst;
    w.fetch = vi.fn(() => new Promise((res) => { resolveFirst = res; }));
    w.eval(src);
    const api = w.AlloModules.TranslationFeedback;

    api.offerFor({ key: 'nav.home', current: 'Inicio', language: 'Spanish' });
    expect(({}).polluted43).toBeUndefined();

    api.openModal({ key: 'nav.home', current: 'Inicio', language: 'Spanish\u0000\u0007' });
    expect(w.document.getElementById('allo-tfb-lang').getAttribute('maxlength')).toBe('60');
    w.document.getElementById('allo-tfb-suggest').value = 'Inicio mejorado\u0000';
    const sendBtn = w.document.getElementById('allo-tfb-send');
    sendBtn.onclick();
    sendBtn.onclick(); // second click while in-flight must be ignored
    expect(w.fetch).toHaveBeenCalledTimes(1);
    const sentBody = JSON.parse(w.fetch.mock.calls[0][1].body);
    expect(sentBody.suggested).toBe('Inicio mejorado');
    expect(sentBody.language).toBe('Spanish');

    // Reopen a fresh modal before the first fetch settles; stale response must not clobber the new modal
    api.openModal({ key: 'nav.other', current: 'Otro', language: 'French' });
    resolveFirst({ ok: true, json: async () => ({ ok: true, storage: 'private' }) });
    await new Promise((r) => setTimeout(r, 0));
    expect(w.document.getElementById('allo-tfb-title').textContent).toContain('Suggest a translation fix');
    expect(w.document.getElementById('allo-tfb-suggest')).not.toBeNull();
  });
});

describe('Phase 43: language_matcher_module.js hardening', () => {
  const src = readFileSync('language_matcher_module.js', 'utf8');

  it('skips remote CDN manifest fetches in desktop, offline, and QR student modes', async () => {
    for (const flag of ['_isDesktopBundledApp', '__alloOfflineOnly', '__alloQrStudentMode', '_alloQrBlocked']) {
      const w = makeDom();
      w[flag] = true;
      w.fetch = vi.fn();
      w.eval(src);
      const M = w.AlloLangMatcher;
      expect(Object.isFrozen(M)).toBe(true);
      expect(Object.isFrozen(M._ALIASES)).toBe(true);
      const slugs = await M.availableSlugs();
      expect(slugs).toEqual([]);
      const fuzzy = await M.match('frenchh');
      expect(fuzzy?.display).toBe('French');
      expect(w.fetch).not.toHaveBeenCalled();
    }
  });

  it('bounds huge adversarial strings in match() and _lev() and strips prototype keys from manifest', async () => {
    const w = makeDom();
    w.fetch = vi.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({
        available: [
          { slug: '__proto__', display: 'Evil' },
          { slug: 'constructor', display: 'Evil2' },
          { slug: 'esperanto_custom', display: 'Esperanto Custom\u0000' },
        ],
      }),
    }));
    w.eval(src);
    const M = w.AlloLangMatcher;

    const huge = 'x'.repeat(50000);
    const t0 = Date.now();
    expect(M._lev(huge, 'y'.repeat(50000))).toBe(120);
    expect(await M.match(huge)).toBeNull();
    expect(Date.now() - t0).toBeLessThan(2000);

    const slugs = await M.availableSlugs();
    expect(slugs).toEqual(['esperanto_custom']);
    const hit = await M.match('esperanto_custom');
    expect(hit).toMatchObject({ slug: 'esperanto_custom', display: 'Esperanto Custom', source: 'manifest-exact' });
  });
});

describe('Phase 43: large_file_module.js hardening', () => {
  const src = readFileSync('large_file_module.js', 'utf8');

  it('guards null/non-finite inputs in LargeFileHandler and sanitizes extracted filenames', async () => {
    const w = makeDom();
    w.React = { memo: (c) => c, useRef: (v) => ({ current: v }), useEffect: () => {}, createElement: () => null, Fragment: Symbol('Fragment') };
    w.eval(src);
    const H = w.AlloModules.LargeFileHandler;

    expect(H.needsChunking(null)).toBe(false);
    expect(H.needsChunking({ size: NaN })).toBe(false);
    expect(H.needsChunking({ size: 20 * 1024 * 1024 })).toBe(true);

    expect(H.getFileType(null)).toBe('unknown');
    expect(H.getFileType({})).toBe('unknown');
    expect(H.getFileType({ name: 'noext' })).toBe('unknown');
    expect(H.getFileType({ name: 'clip.mp4' })).toBe('video');

    expect(H.formatDuration(NaN)).toBe('0s');
    expect(H.formatDuration(Infinity)).toBe('0s');
    expect(H.formatDuration(-10)).toBe('0s');
    expect(H.formatDuration(125)).toBe('2m 5s');

    expect(() => H.audioBufferToWav(null)).toThrow(/Invalid audio buffer/);
    expect(() => H.audioBufferToWav({ sampleRate: 0, length: 10, numberOfChannels: 1, getChannelData: () => new Float32Array(10) }))
      .toThrow(/Unsupported audio sample rate/);
    await expect(H.blobToBase64(null)).rejects.toThrow(/No blob provided/);
    await expect(H.readFileAsArrayBuffer(null)).rejects.toThrow(/No media file/);
  });
});

describe('Phase 43: word_audio_shard_client.js hardening', () => {
  const ShardClient = require('../word_audio_shard_client.js');

  it('suppresses remote CDN in offline/QR modes, validates override URLs, and rejects poisoned/oversized JSON', async () => {
    expect(Object.isFrozen(ShardClient)).toBe(true);

    for (const flag of ['__alloOfflineOnly', '__alloQrStudentMode', '_alloQrBlocked']) {
      const urls = ShardClient.resolveBaseUrls({
        envRoot: { [flag]: true, location: { href: 'https://alloflow.org/', hostname: 'alloflow.org' } },
      });
      expect(urls).toEqual(['word_audio_shards/']);
    }

    // Unsafe CDN override schemes must be ignored
    const urlsUnsafe = ShardClient.resolveBaseUrls({
      envRoot: {
        location: { href: 'https://alloflow.org/', hostname: 'alloflow.org' },
        _ALLOFLOW_CDN_BASE: 'javascript:alert(1)',
      },
    });
    expect(urlsUnsafe).toEqual(['word_audio_shards/', ShardClient.CDN_BASE]);

    // Overly long word rejected immediately
    expect(ShardClient.normalizeWord('a'.repeat(300))).toBe('');

    // Prototype pollution in index JSON stripped cleanly
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '{"format":"' + ShardClient.FORMAT + '","__proto__":{"shardPolluted":1},"shards":{},"words":{}}',
    }));
    const client = ShardClient.createWordAudioShardClient({
      baseUrls: ['https://safe.example/'],
      fetch: fetchMock,
      autoWavForSafari: false,
    });
    expect(Object.isFrozen(client)).toBe(true);
    const idx = await client.loadIndex();
    expect(idx).toBeTruthy();
    expect(({}).shardPolluted).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://safe.example/index.json',
      expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' })
    );

    // Non-iterable prefetchWords input must not crash
    const res = await client.prefetchWords(12345);
    expect(res).toMatchObject({ loaded: 0, missing: 0, ok: true });
  });
});

describe('Phase 43: dictionary_loader.js hardening', () => {
  const src = readFileSync('dictionary_loader.js', 'utf8');

  it('blocks external dictionaryapi.dev requests in offline-only and QR student modes', async () => {
    for (const flag of ['__alloOfflineOnly', '__alloQrStudentMode', '_alloQrBlocked']) {
      const w = makeDom();
      w[flag] = true;
      w.fetch = vi.fn();
      w.eval(src);
      expect(Object.isFrozen(w.AlloDictionary)).toBe(true);
      const out = await w.AlloDictionary.lookupDetailed('habitat');
      expect(out).toEqual({ entry: null, reason: 'not_available' });
      expect(w.fetch).not.toHaveBeenCalled();
    }
  });

  it('strips unsafe audio URL schemes and blocks prototype pollution from tampered localStorage cache', () => {
    const w = makeDom();
    w.eval(src);

    const poisoned = JSON.stringify({
      word: 'bank',
      audio: 'javascript:alert(1)',
      pronunciations: [
        { phonetic: '/bæŋk/', audio: 'javascript:alert(1)' },
        { phonetic: '/bæŋk/', audio: 'data:text/html,<script>alert(1)</script>' },
        { phonetic: '/bæŋk/', audio: 'file:///etc/passwd' },
        { phonetic: '/bæŋk/', audio: 'https://media.example/bank.mp3' },
      ],
      meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'Edge of a river.\u0000' }] }],
    }).replace('"word":', '"__proto__":{"dictPolluted":true},"word":');

    w.localStorage.setItem('allo_dict_bank', poisoned);
    const entry = w.AlloDictionary.getCached('bank');
    expect(({}).dictPolluted).toBeUndefined();
    expect(entry).toBeTruthy();
    expect(entry.audio).toBe('https://media.example/bank.mp3');
    expect(entry.meanings[0].definitions[0].definition).toBe('Edge of a river.');
    expect(entry.pronunciations.some((p) => /javascript:|data:text\/html|file:/i.test(p.audio))).toBe(false);
  });
});
