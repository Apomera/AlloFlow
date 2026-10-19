import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

// Language packs are cached on the device under allo_lang_<language>_v1, and TRANSLATION_VERSION
// never changes, so a cached pack used to apply forever: a family that opened Somali once never
// received a corrected or newly translated string again. Now, once per release, the cached pack
// is re-checked against the CDN copy in the background and replaced only when it differs.
// Languages that have no CDN pack (packs the AI built on the device) must never be touched, and
// a network failure must not be mistaken for "this language has no pack".
const ANTI = readFileSync(resolve(process.cwd(), process.env.PACK_REFRESH_ANTI || 'AlloFlowANTI.txt'), 'utf8');
const HELPERS = sliceBetween(ANTI, 'function _translationAbortError(', 'function _alloQueueSequencedWrite(', { file: 'AlloFlowANTI.txt' });
const PARSER = sliceBetween(ANTI, '// __ALLO_UNTRUSTED_PARSE_BEGIN__', '// __ALLO_UNTRUSTED_PARSE_END__', { file: 'AlloFlowANTI.txt' });
// eslint-disable-next-line no-new-func
const { refresh, urlsFor } = new Function(PARSER + '\n' + HELPERS + '\nreturn { refresh: _alloRefreshCachedLanguagePack, urlsFor: _alloLanguagePackUrls };')();

const packOf = (word) => Object.fromEntries(Array.from({ length: 12 }, (_, i) => ['ns' + i, { greeting: word + i }]));
const OLD = packOf('Salaan');
const NEW = packOf('Salaan!');

function device({ meta, release = 'r2', responses, slug = { slug: 'somali', trusted: true } }) {
  const store = new Map([['allo_lang_Somali_v1', OLD]]);
  if (meta) store.set('allo_lang_Somali_v1_meta', meta);
  const fetched = [];
  const apply = vi.fn();
  const controller = new AbortController();
  const options = {
    storageKey: 'allo_lang_Somali_v1',
    cachedPack: OLD,
    signal: controller.signal,
    release: () => release,
    resolveSlug: vi.fn(async () => slug),
    read: async (key) => store.get(key),
    write: async (key, value) => { store.set(key, value); },
    fetchPack: async (url) => {
      fetched.push(url);
      const r = responses ? responses(url) : { status: 200, body: JSON.stringify(NEW) };
      if (r instanceof Error) throw r;
      return { ok: r.status === 200, status: r.status, text: async () => r.body };
    },
    apply,
    wait: vi.fn(async () => {}),
  };
  return { options, store, fetched, apply, controller };
}

describe('cached language packs refresh once per release', () => {
  it('a pack already checked this release costs nothing', async () => {
    const d = device({ meta: { source: 'cdn', slug: 'somali', release: 'r2' } });
    expect(await refresh(d.options)).toBe('current');
    expect(d.fetched, 'it downloaded the pack again in the same release').toEqual([]);
    expect(d.options.wait, 'an already-checked pack still queued a background wait').not.toHaveBeenCalled();
  });

  it('a changed CDN pack replaces the cached one and is applied', async () => {
    const d = device({ meta: { source: 'cdn', slug: 'somali', release: 'r1' } });
    expect(await refresh(d.options)).toBe('updated');
    expect(d.apply).toHaveBeenCalledWith(NEW);
    expect(d.store.get('allo_lang_Somali_v1'), 'the device kept the stale pack').toEqual(NEW);
    expect(d.store.get('allo_lang_Somali_v1_meta')).toEqual({ source: 'cdn', slug: 'somali', release: 'r2' });
  });

  it('an unchanged pack is not re-applied (no re-render, no repeated announcements)', async () => {
    const d = device({ meta: { source: 'cdn', slug: 'somali', release: 'r1' }, responses: () => ({ status: 200, body: JSON.stringify(OLD) }) });
    expect(await refresh(d.options)).toBe('unchanged');
    expect(d.apply).not.toHaveBeenCalled();
    expect(d.store.get('allo_lang_Somali_v1_meta').release).toBe('r2');
  });

  it('a pack cached before this change (no record) is checked once, through the language matcher', async () => {
    const d = device({});
    expect(await refresh(d.options)).toBe('updated');
    expect(d.options.resolveSlug).toHaveBeenCalledTimes(1);
    expect(d.fetched[0]).toBe(urlsFor('somali')[0]);
  });

  it('a language with no CDN pack (built on the device) is left alone and not probed again this release', async () => {
    const d = device({ responses: () => ({ status: 404, body: '' }) });
    expect(await refresh(d.options)).toBe('missing');
    expect(d.apply).not.toHaveBeenCalled();
    expect(d.store.get('allo_lang_Somali_v1'), 'the AI-built pack was touched').toBe(OLD);
    expect(d.store.get('allo_lang_Somali_v1_meta')).toEqual({ source: 'none', slug: 'somali', release: 'r2' });
    d.fetched.length = 0;
    expect(await refresh(d.options)).toBe('current');
    expect(d.fetched).toEqual([]);
  });

  it('a 404 on a guessed slug (matcher not loaded) is retried next visit, not recorded as "no pack"', async () => {
    const d = device({ slug: { slug: 'somali_raw', trusted: false }, responses: () => ({ status: 404, body: '' }) });
    expect(await refresh(d.options)).toBe('missing');
    expect(d.store.has('allo_lang_Somali_v1_meta'), 'an untrusted slug wrote a "no pack" record').toBe(false);
  });

  it('a network failure changes nothing and is retried next visit', async () => {
    const d = device({ meta: { source: 'cdn', slug: 'somali', release: 'r1' }, responses: () => new TypeError('Failed to fetch') });
    expect(await refresh(d.options)).toBe('missing');
    expect(d.apply).not.toHaveBeenCalled();
    expect(d.store.get('allo_lang_Somali_v1_meta').release, 'a failed check was recorded as done').toBe('r1');
  });

  it('a broken or truncated CDN copy is never applied', async () => {
    const d = device({ meta: { source: 'cdn', slug: 'somali', release: 'r1' }, responses: () => ({ status: 200, body: '{"ns0": {"greeting": "x"}}' }) });
    await refresh(d.options);
    expect(d.apply).not.toHaveBeenCalled();
    expect(d.store.get('allo_lang_Somali_v1')).toBe(OLD);
  });

  it('a fetched pack is parsed, never evaluated', async () => {
    globalThis.__packEvaluated = false;
    const d = device({ meta: { source: 'cdn', slug: 'somali', release: 'r1' }, responses: () => ({ status: 200, body: '(globalThis.__packEvaluated = true, ' + JSON.stringify(NEW) + ')' }) });
    await refresh(d.options);
    expect(globalThis.__packEvaluated).toBe(false);
    expect(d.apply).not.toHaveBeenCalled();
  });

  it('switching language mid-check abandons it without writing', async () => {
    const d = device({ meta: { source: 'cdn', slug: 'somali', release: 'r1' } });
    d.options.wait = async () => { d.controller.abort(); throw Object.assign(new Error('cancelled'), { name: 'AbortError' }); };
    await expect(refresh(d.options)).rejects.toMatchObject({ name: 'AbortError' });
    expect(d.apply).not.toHaveBeenCalled();
    expect(d.store.get('allo_lang_Somali_v1')).toBe(OLD);
  });

  it('with no release id yet it waits and skips rather than guessing', async () => {
    const d = device({ meta: { source: 'cdn', slug: 'somali', release: 'r1' }, release: '' });
    expect(await refresh(d.options)).toBe('skipped');
    expect(d.fetched).toEqual([]);
  });
});

describe('the host wires it in', () => {
  const hook = sliceBetween(ANTI, 'const useTranslation = (targetLanguage, apiKey) => {', '  return { t, isTranslating', { file: 'AlloFlowANTI.txt' });
  it('starts the background check right after applying a cached pack', () => {
    const hit = sliceBetween(hook, 'if (cachedPack) {', 'return;', { label: 'cache-hit branch' });
    expect(hit, 'the cache-hit branch no longer refreshes').toMatch(/\n\s*_alloRefreshCachedLanguagePack\(\{/);
    expect(hit).toContain('write: setOwnedStorage');
    expect(hit, 'a refreshed pack must go through the sanitizer like every other').toContain('apply: pack => setLanguagePack(sanitizeLanguagePack(pack)),');
    expect(hit, 'the background check must not hold the app').toMatch(/\}\)\.catch\(e =>/);
  });
  it('records the release when a pack is downloaded fresh', () => {
    expect(hook).toContain("await setOwnedStorage(storageKey + '_meta', { source: 'cdn', slug: langSlug, release: packRelease() });");
  });
});
