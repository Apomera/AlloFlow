import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '..');
const ShardClient = require('../word_audio_shard_client.js');

const SAMPLE_WEBM_URI = 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibQ==';
const SAMPLE_WEBM_URI_2 = 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibTI=';

function makeMockIndex(overrides = {}) {
  return {
    format: ShardClient.FORMAT,
    shards: {
      'a-01': { file: 'a-01.json', words: 2, bytes: 120 },
      'c-01': { file: 'c-01.json', words: 2, bytes: 120 },
      'z-01': { file: 'z-01.json', words: 1, bytes: 80 },
    },
    words: {
      apple: 'a-01',
      ant: 'a-01',
      cat: 'c-01',
      cup: 'c-01',
      zebra: 'z-01',
    },
    ...overrides,
  };
}

function makeResponse(body, ok = true, status = 200, asText = true) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok,
    status,
    text: async () => raw,
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
    ...(asText ? {} : { text: undefined }),
  };
}

describe('word_audio_shard_client', () => {
  it('stays byte-identical with desktop/web-app/public/word_audio_shard_client.js', () => {
    const rootBytes = readFileSync(path.join(ROOT, 'word_audio_shard_client.js'));
    const mirrorBytes = readFileSync(path.join(ROOT, 'desktop', 'web-app', 'public', 'word_audio_shard_client.js'));
    expect(Buffer.compare(rootBytes, mirrorBytes)).toBe(0);
  });

  it('normalizes valid single words and rejects multi-word or invalid tokens', () => {
    expect(ShardClient.normalizeWord('  Hello! ')).toBe('hello');
    expect(ShardClient.normalizeWord("Don\u2019t,")).toBe("don't");
    expect(ShardClient.normalizeWord('co-op')).toBe('co-op');
    expect(ShardClient.normalizeWord('hello!', { stripPunctuation: false })).toBe('');
    expect(ShardClient.normalizeWord('hello world')).toBe('');
    expect(ShardClient.normalizeWord('123')).toBe('');
    expect(ShardClient.normalizeWord('')).toBe('');
    expect(ShardClient.normalizeWord(null)).toBe('');
  });

  it('resolves base URLs cleanly across standard, Canvas, override, and local-box offline hosts', () => {
    expect(
      ShardClient.resolveBaseUrls({
        envRoot: { location: { href: 'https://alloflow.org/', hostname: 'alloflow.org' } },
      })
    ).toEqual(['word_audio_shards/', ShardClient.CDN_BASE]);

    expect(
      ShardClient.resolveBaseUrls({
        envRoot: {
          location: { href: 'https://abc.googleusercontent.com/user/', hostname: 'abc.googleusercontent.com' },
          _ALLOFLOW_CDN_BASE: 'https://mirror.example.com/cdn',
        },
      })
    ).toEqual(['https://mirror.example.com/cdn/word_audio_shards/', ShardClient.CDN_BASE]);

    expect(
      ShardClient.resolveBaseUrls({
        envRoot: {
          location: { href: 'blob:https://gemini.google.com/123', hostname: 'gemini.google.com' },
        },
      })
    ).toEqual([ShardClient.CDN_BASE]);

    expect(
      ShardClient.resolveBaseUrls({
        offlineOnly: true,
        envRoot: {
          __ALLO_LOCAL_BOX: true,
          location: { href: 'http://localhost:8080/', hostname: 'localhost' },
        },
      })
    ).toEqual(['word_audio_shards/']);

    expect(
      ShardClient.resolveBaseUrls({
        baseUrls: ['https://a.example/shards', 'https://a.example/shards/', 'http://localhost:3000/s'],
      })
    ).toEqual(['https://a.example/shards/', 'http://localhost:3000/s/']);
  });

  it('strips UTF-8 BOM, falls back across base URLs, deduplicates in-flight index fetches, and honors cooldown/retry', async () => {
    const idx = makeMockIndex();
    const fetchMock = vi.fn(async (url) => {
      if (url === 'https://bad.example/index.json') {
        return makeResponse('Not Found', false, 404);
      }
      if (url === 'https://good.example/index.json') {
        return makeResponse('\uFEFF' + JSON.stringify(idx));
      }
      throw new Error('Unexpected URL: ' + url);
    });

    const client = ShardClient.createWordAudioShardClient({
      baseUrls: ['https://bad.example/', 'https://good.example/'],
      fetch: fetchMock,
      failCooldownMs: 10000,
    });

    expect(client.hasWordSync('apple')).toBeNull();
    const [i1, i2] = await Promise.all([client.loadIndex(), client.loadIndex()]);
    expect(i1).toEqual(idx);
    expect(i2).toEqual(idx);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(client.hasWordSync('Apple!')).toBe(true);
    expect(client.hasWordSync('constructor')).toBe(false);
    expect(await client.hasWord('zebra')).toBe(true);

    // Verify failure cooldown and { retry: true } bypass
    let failAttempts = 0;
    const failFetch = vi.fn(async () => {
      failAttempts += 1;
      if (failAttempts === 1) return makeResponse({}, false, 503);
      return makeResponse(idx);
    });
    const cooldownClient = ShardClient.createWordAudioShardClient({
      baseUrls: ['https://retry.example/'],
      fetch: failFetch,
      failCooldownMs: 60000,
    });
    expect(await cooldownClient.loadIndex()).toBeNull();
    expect(await cooldownClient.loadIndex()).toBeNull(); // skipped due to cooldown
    expect(failFetch).toHaveBeenCalledTimes(1);

    const recovered = await cooldownClient.loadIndex({ retry: true });
    expect(recovered).toEqual(idx);
    expect(failFetch).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent same-shard fetches and enforces LRU shard eviction', async () => {
    const idx = makeMockIndex();
    const shards = {
      'a-01.json': { _meta: {}, apple: SAMPLE_WEBM_URI, ant: SAMPLE_WEBM_URI_2 },
      'c-01.json': { _meta: {}, cat: SAMPLE_WEBM_URI, cup: SAMPLE_WEBM_URI_2 },
      'z-01.json': { _meta: {}, zebra: SAMPLE_WEBM_URI },
    };
    const fetchMock = vi.fn(async (url) => {
      const file = url.split('/').pop();
      if (file === 'index.json') return makeResponse(idx);
      if (Object.prototype.hasOwnProperty.call(shards, file)) {
        await new Promise((r) => setTimeout(r, 10));
        return makeResponse(shards[file]);
      }
      return makeResponse({}, false, 404);
    });

    const client = ShardClient.createWordAudioShardClient({
      baseUrls: ['https://cdn.example/shards/'],
      fetch: fetchMock,
      maxShards: 2,
      autoWavForSafari: false,
    });

    // Both words live in a-01.json -> single fetch
    const [appleClip, antClip] = await Promise.all([
      client.getWordClip('apple'),
      client.getWordClip('ant'),
    ]);
    expect(appleClip).toBe(SAMPLE_WEBM_URI);
    expect(antClip).toBe(SAMPLE_WEBM_URI_2);
    expect(client.stats().shardFetches).toBe(1);

    // Load c-01.json (cache = [a-01, c-01]), touch a-01 (cache = [c-01, a-01]), then load z-01 (evicts c-01!)
    expect(await client.getWordClip('cat')).toBe(SAMPLE_WEBM_URI);
    expect(await client.getWordClip('apple')).toBe(SAMPLE_WEBM_URI); // promotes a-01 -> cache hit
    expect(client.stats().shardHits).toBe(1);
    expect(await client.getWordClip('zebra')).toBe(SAMPLE_WEBM_URI);
    expect(client.stats().cachedShards).toBe(2);

    // a-01 should still be cached (hit #2), while cat was evicted (fetch #4)
    expect(await client.getWordClip('ant')).toBe(SAMPLE_WEBM_URI_2);
    expect(client.stats().shardHits).toBe(2);
    expect(await client.getWordClip('cup')).toBe(SAMPLE_WEBM_URI_2);
    expect(client.stats().shardFetches).toBe(4);
  });

  it('rejects path traversal filenames, prototype keys, and non-audio data URIs', async () => {
    const idx = makeMockIndex({
      shards: {
        badpath: { file: '../secret.json', words: 1 },
        'b-01': { file: 'b-01.json', words: 1 },
      },
      words: {
        evil: 'badpath',
        broken: 'b-01',
      },
    });
    const fetchMock = vi.fn(async (url) => {
      if (url.endsWith('index.json')) return makeResponse(idx);
      if (url.endsWith('b-01.json')) return makeResponse({ broken: 'https://evil.example/a.mp3' });
      throw new Error('Must not fetch traversed path: ' + url);
    });

    const client = ShardClient.createWordAudioShardClient({
      baseUrls: ['https://safe.example/'],
      fetch: fetchMock,
      autoWavForSafari: false,
    });

    expect(await client.hasWord('__proto__')).toBe(false);
    expect(await client.hasWord('toString')).toBe(false);
    expect(await client.hasWord('evil')).toBe(false);
    expect(await client.getWordClip('evil')).toBeNull();
    expect(await client.getWordClip('broken')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2); // index.json + b-01.json only
  });

  it('transcodes WebM to 16-bit mono PCM WAV on Safari / ensureWav and manages blob: URLs cleanly', async () => {
    const idx = makeMockIndex();
    const fetchMock = vi.fn(async (url) => {
      if (url.endsWith('index.json')) return makeResponse(idx);
      return makeResponse({ apple: SAMPLE_WEBM_URI });
    });

    const ch0 = new Float32Array([0, 0.5, -0.5, 1]);
    const ch1 = new Float32Array([0, 0.5, -0.5, -1]);
    const decodeSpy = vi.fn(async () => ({
      sampleRate: 24000,
      numberOfChannels: 2,
      length: 4,
      getChannelData: (c) => (c === 0 ? ch0 : ch1),
    }));

    class FakeOfflineAudioContext {
      decodeAudioData(buf) {
        return decodeSpy(buf);
      }
    }

    let blobSeq = 0;
    const revoked = [];
    const createdBlobs = [];
    const fakeEnv = {
      OfflineAudioContext: FakeOfflineAudioContext,
      Audio: function FakeSafariAudio() {
        this.canPlayType = () => '';
      },
      Blob: function FakeBlob(parts, opts) {
        this.parts = parts;
        this.type = opts.type;
        createdBlobs.push(this);
      },
      URL: {
        createObjectURL: () => `blob:mock/${++blobSeq}`,
        revokeObjectURL: (u) => revoked.push(u),
      },
    };

    const client = ShardClient.createWordAudioShardClient({
      baseUrls: ['https://cdn.example/'],
      fetch: fetchMock,
      envRoot: fakeEnv,
    });

    const wavUri = await client.getWordClip('apple');
    expect(wavUri.startsWith('data:audio/wav;base64,')).toBe(true);
    expect(decodeSpy).toHaveBeenCalledTimes(1);

    // Parse RIFF/WAVE header & PCM samples
    const wavBytes = Buffer.from(wavUri.slice('data:audio/wav;base64,'.length), 'base64');
    expect(wavBytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wavBytes.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wavBytes.readUInt16LE(20)).toBe(1); // PCM
    expect(wavBytes.readUInt16LE(22)).toBe(1); // Mono
    expect(wavBytes.readUInt32LE(24)).toBe(24000);
    expect(wavBytes.readUInt16LE(34)).toBe(16);
    expect(wavBytes.readUInt32LE(40)).toBe(8);
    expect(wavBytes.readInt16LE(44)).toBe(0);
    expect(wavBytes.readInt16LE(46)).toBe(Math.round(0.5 * 0x7fff));
    expect(wavBytes.readInt16LE(48)).toBe(Math.round(-0.5 * 0x8000));
    expect(wavBytes.readInt16LE(50)).toBe(0); // (+1 + -1) / 2 === 0

    // Blob URL reuse + revocation on clearCache
    const b1 = await client.getWordClip('apple', { asBlobUrl: true });
    const b2 = await client.getWordClip('apple', { asBlobUrl: true });
    expect(b1).toBe('blob:mock/1');
    expect(b2).toBe('blob:mock/1');
    expect(client.stats().wavTranscodes).toBe(1);
    expect(client.stats().blobHits).toBe(1);
    expect(createdBlobs[0].type).toBe('audio/wav');

    client.clearCache();
    expect(revoked).toEqual(['blob:mock/1']);
  });

  it('supports AbortSignal and deduped concurrent prefetchWords', async () => {
    const idx = makeMockIndex();
    const fetchMock = vi.fn(async (url) => {
      if (url.endsWith('index.json')) return makeResponse(idx);
      if (url.endsWith('a-01.json')) return makeResponse({ apple: SAMPLE_WEBM_URI, ant: SAMPLE_WEBM_URI_2 });
      if (url.endsWith('c-01.json')) return makeResponse({ cat: SAMPLE_WEBM_URI, cup: SAMPLE_WEBM_URI_2 });
      return makeResponse({}, false, 404);
    });

    const client = ShardClient.createWordAudioShardClient({
      baseUrls: ['https://cdn.example/'],
      fetch: fetchMock,
      autoWavForSafari: false,
    });

    const ac = new AbortController();
    ac.abort();
    await expect(client.getWordClip('apple', { signal: ac.signal })).rejects.toMatchObject({ name: 'AbortError' });

    const slowFetch = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 80));
      return makeResponse(idx);
    });
    const slowClient = ShardClient.createWordAudioShardClient({
      baseUrls: ['https://slow.example/'],
      fetch: slowFetch,
      autoWavForSafari: false,
    });
    const acMid = new AbortController();
    setTimeout(() => acMid.abort(), 10);
    await expect(slowClient.loadIndex({ signal: acMid.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(slowClient.stats().lastIndexFailAt).toBe(0);
    expect(await slowClient.loadIndex()).toEqual(idx);

    const summary = await client.prefetchWords(['apple', 'ant', 'cat', 'nonexistent', '  '], { concurrency: 2 });
    expect(summary).toEqual({
      loaded: 3,
      missing: 2,
      shardsFetched: 2,
      totalShardsNeeded: 2,
      ok: true,
    });
    expect(await client.getWordClip('cat')).toBe(SAMPLE_WEBM_URI);
    expect(client.stats().shardHits).toBe(1);
  });

  it('loads real on-disk word_audio_shards/index.json and resolves real K-8 Math & ELA audio clips', async () => {
    const shardsDir = path.join(ROOT, 'word_audio_shards');
    const diskFetch = async (url) => {
      const fileName = url.replace(/^disk:\/\/shards\//, '');
      const fullPath = path.join(shardsDir, fileName);
      return makeResponse(readFileSync(fullPath, 'utf8'));
    };

    const client = ShardClient.createWordAudioShardClient({
      baseUrls: ['disk://shards/'],
      fetch: diskFetch,
      autoWavForSafari: false,
    });

    const idx = await client.loadIndex();
    expect(idx.format).toBe(ShardClient.FORMAT);
    // 2026-11-16: 32134 words in 820 files. (The pins said 31973 and 815 while the store already held 32023 and 817; then
    // 111 basic words were copied in from word_audio_kokoro_bank.json as basic-01.json to basic-03.json.)
    // Then 19 more (basic-04.json), when those words entered the word list: 32153 words in 821 files.
    // Then 51 words voiced on 2026-11-16 (basic-05.json, basic-06.json): 32204 words in 823 files.
    expect(Object.keys(idx.words).length).toBe(32204);
    expect(Object.keys(idx.shards).length).toBe(823);

    for (const w of ['numerator', 'denominator', 'personification', 'protagonist']) {
      const clip = await client.getWordClip(w);
      expect(clip, w).toMatch(/^data:audio\/webm;base64,[A-Za-z0-9+/=]+$/);
      expect(clip.length, w).toBeGreaterThan(500);
    }
  });
});
