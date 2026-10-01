/**
 * Piper voice-ID validity — regression guard for the 2026-08-16 incident.
 *
 * Seven of the 29 configured voice IDs were not keys of the PATH_MAP that
 * @mintplex-labs/piper-tts-web ships. The library turns an unknown ID into the
 * literal URL ".../resolve/main/undefined", Hugging Face answers 404 with the
 * body "Entry not found", and the library's fetchBlob() does not check
 * response.ok — so the error page was written into OPFS as the voice model and
 * every later predict() ran JSON.parse("Entry not found"). Users saw
 *   SyntaxError: Unexpected token 'E', "Entry not found" is not valid JSON
 * permanently, for Spanish among others.
 *
 * The fixture is the real PATH_MAP key list from
 * @mintplex-labs/piper-tts-web@1.0.4. If the pinned library version in
 * piper_tts_loader.js changes, re-extract it:
 *   curl -s https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@<v>/dist/piper-tts-web.js
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const piperSource = readFileSync(resolve(process.cwd(), 'piper_tts_loader.js'), 'utf8');
const REAL_PATH_MAP_KEYS = JSON.parse(
    readFileSync(resolve(process.cwd(), 'tests/fixtures/piper_path_map_keys.json'), 'utf8')
);

function loadPiper(lib) {
    delete window._piperTTS;
    window.__piperTestLib = lib;
    const importStatement = 'const lib = await import(/* webpackIgnore: true */ PIPER_CDN);';
    const testSource = piperSource.replace(importStatement, 'const lib = window.__piperTestLib;');
    if (testSource === piperSource) throw new Error('Piper dynamic import test seam did not match');
    // eslint-disable-next-line no-new-func
    new Function(testSource)();
    return window._piperTTS;
}

function makeLib(pathMapKeys, overrides = {}) {
    const PATH_MAP = {};
    pathMapKeys.forEach((key) => { PATH_MAP[key] = 'x/' + key + '.onnx'; });
    return {
        PATH_MAP,
        HF_BASE: 'https://huggingface.co/diffusionstudio/piper-voices/resolve/main',
        download: vi.fn(async () => {}),
        predict: vi.fn(async ({ text }) => new Blob([text], { type: 'audio/wav' })),
        remove: vi.fn(async () => {}),
        flush: vi.fn(async () => {}),
        ...overrides,
    };
}

let originalFetch;
let originalCreate;
let originalRevoke;

beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalCreate = URL.createObjectURL;
    originalRevoke = URL.revokeObjectURL;
    let n = 0;
    URL.createObjectURL = vi.fn(() => 'blob:piper-test-' + (++n));
    URL.revokeObjectURL = vi.fn();
    // Every voice config fetch succeeds and parses, unless a test overrides it.
    globalThis.fetch = vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ audio: { sample_rate: 22050 } }),
    }));
});

afterEach(() => {
    globalThis.fetch = originalFetch;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    delete window._piperTTS;
    delete window.__piperTestLib;
});

describe('Piper voice IDs', () => {
    it('every configured voiceId is a real PATH_MAP key in the pinned library', () => {
        const api = loadPiper(makeLib(REAL_PATH_MAP_KEYS));
        const configured = Object.entries(api.voiceMap);
        expect(configured.length).toBeGreaterThan(0);

        const real = new Set(REAL_PATH_MAP_KEYS);
        const bogus = configured
            .filter(([, info]) => !real.has(info.voiceId))
            .map(([lang, info]) => lang + ' -> ' + info.voiceId);

        // A failure here means a language will fetch ".../undefined", cache the
        // 404 body as its voice model, and read aloud will be dead in that
        // language forever. Fix the ID; do not relax this test.
        expect(bogus).toEqual([]);
    });

    it('pins the library version the fixture was taken from', () => {
        expect(piperSource).toContain('@mintplex-labs/piper-tts-web@1.0.4');
    });

    it('never hands the library a voiceId that is missing from its PATH_MAP', async () => {
        // Library dropped the Spanish model we configured but still ships another.
        const keys = REAL_PATH_MAP_KEYS.filter((k) => k !== 'es_MX-ald-medium');
        const lib = makeLib(keys);
        const api = loadPiper(lib);

        const url = await api.speak('Hola, vamos a leer.', 'es', 1);
        expect(url).toBeTruthy();

        expect(lib.download).toHaveBeenCalled();
        const usedForDownload = lib.download.mock.calls[0][0];
        expect(Object.keys(lib.PATH_MAP)).toContain(usedForDownload);

        const usedForPredict = lib.predict.mock.calls[0][0].voiceId;
        expect(Object.keys(lib.PATH_MAP)).toContain(usedForPredict);
    });

    it('goes quiet for a language with no usable model instead of poisoning the cache', async () => {
        const keys = REAL_PATH_MAP_KEYS.filter((k) => !k.startsWith('es_'));
        const lib = makeLib(keys);
        const api = loadPiper(lib);

        expect(api.supportsLanguage('es')).toBe(true); // table still lists it

        const url = await api.speak('Hola.', 'es', 1);
        expect(url).toBeNull();
        expect(lib.download).not.toHaveBeenCalled();
        expect(lib.predict).not.toHaveBeenCalled();
        // Proven unusable, so the cascade stops offering Piper this language
        // and the sentence goes to the next engine.
        expect(api.supportsLanguage('es')).toBe(false);
    });

    it('refuses to download when the voice config is an HTTP error page', async () => {
        const lib = makeLib(REAL_PATH_MAP_KEYS);
        globalThis.fetch = vi.fn(async () => ({
            ok: false,
            status: 404,
            text: async () => 'Entry not found',
        }));
        const api = loadPiper(lib);

        const url = await api.speak('Hola.', 'es', 1);
        expect(url).toBeNull();
        // This is the whole incident: download() must not run, because the
        // library would cache the error body as the model.
        expect(lib.download).not.toHaveBeenCalled();
    });

    it('refuses to download when the voice config is 200 but unparseable', async () => {
        const lib = makeLib(REAL_PATH_MAP_KEYS);
        globalThis.fetch = vi.fn(async () => ({
            ok: true,
            status: 200,
            text: async () => '<!doctype html><title>error</title>',
        }));
        const api = loadPiper(lib);

        expect(await api.speak('Hola.', 'es', 1)).toBeNull();
        expect(lib.download).not.toHaveBeenCalled();
    });

    it('treats a JSON parse failure from predict as a corrupt cached model and repairs once', async () => {
        let attempt = 0;
        const lib = makeLib(REAL_PATH_MAP_KEYS, {
            predict: vi.fn(async ({ text }) => {
                attempt += 1;
                if (attempt === 1) {
                    // Exactly what a poisoned OPFS config produced in the field.
                    throw new SyntaxError('Unexpected token \'E\', "Entry not found" is not valid JSON');
                }
                return new Blob([text], { type: 'audio/wav' });
            }),
        });
        const api = loadPiper(lib);

        const url = await api.speak('Hola.', 'es', 1);
        expect(url).toBeTruthy();
        expect(lib.remove).toHaveBeenCalled();   // evicted the bad cache entry
        expect(lib.predict).toHaveBeenCalledTimes(2); // retried once, succeeded
    });

    it('exposes a per-language readiness signal distinct from table support', async () => {
        const api = loadPiper(makeLib(REAL_PATH_MAP_KEYS));
        expect(api.supportsLanguage('es')).toBe(true);
        expect(api.isLanguageReady('es')).toBe(false);
        await api.speak('Hola.', 'es', 1);
        expect(api.isLanguageReady('es')).toBe(true);
    });
});
