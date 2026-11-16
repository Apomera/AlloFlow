import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'packets_vocab_media.js'), 'utf8');
const CLIP_URI = 'data:audio/webm;base64,' + Buffer.from('GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibQ==').toString('base64');
const WAV_URI = 'data:audio/wav;base64,' + Buffer.from('RIFF\x00\x00\x00\x00WAVE').toString('base64');

describe('packets_vocab_media bounded parallel shard loading and safe clip lookup', () => {
  beforeEach(() => {
    delete window.AlloVocabMedia;
    new Function(source)();
  });

  afterEach(() => {
    delete window.AlloVocabMedia;
    vi.restoreAllMocks();
  });

  it('downloads needed word shards with bounded concurrency (<= 6), reports progress, and caches across calls', async () => {
    const words = Array.from({ length: 15 }, (_, i) => `word${i}`);
    const shards = {};
    const indexWords = {};
    const shardPayloads = {};
    for (let i = 0; i < 15; i++) {
      const id = `s-${String(i).padStart(2, '0')}`;
      shards[id] = { file: `${id}.json`, bytes: 100 };
      indexWords[`word${i}`] = id;
      shardPayloads[`word_audio_shards/${id}.json`] = {
        _meta: { shard: id },
        [`word${i}`]: CLIP_URI,
      };
    }

    let inFlight = 0;
    let maxInFlight = 0;
    const shardFetches = [];
    window.fetch = vi.fn(async (url) => {
      const u = String(url);
      if (u === 'word_audio_shards/index.json') {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ format: 'alloflow-word-audio-index/1', shards, words: indexWords }),
        };
      }
      inFlight += 1;
      if (inFlight > maxInFlight) maxInFlight = inFlight;
      shardFetches.push(u);
      await new Promise((r) => setTimeout(r, 15));
      inFlight -= 1;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(shardPayloads[u]),
      };
    });

    const loader = {
      portableAudio: vi.fn(async (todo) => {
        for (const k of Object.keys(todo.audio)) todo.audio[k] = WAV_URI;
      }),
    };
    const progress = [];
    const first = await window.AlloVocabMedia.clips(words, loader, (msg) => progress.push(msg));

    expect(maxInFlight).toBe(6);
    expect(shardFetches).toHaveLength(15);
    expect(Object.keys(first)).toHaveLength(15);
    expect(first.word0).toBe(WAV_URI);
    expect(progress).toContain('Getting the recordings: 1 of 15 small files.');
    expect(progress).toContain('Getting the recordings: 15 of 15 small files.');

    // Repeat call uses cached shards and converted WAVs with 0 new fetches
    const callsBeforeRepeat = window.fetch.mock.calls.length;
    loader.portableAudio.mockClear();
    const second = await window.AlloVocabMedia.clips(words, loader);
    expect(window.fetch.mock.calls.length).toBe(callsBeforeRepeat);
    expect(loader.portableAudio).not.toHaveBeenCalled();
    expect(second).toEqual(first);
  });

  it('safely handles flat and { words } shards without Object.prototype collisions (constructor / toString)', async () => {
    window.fetch = vi.fn(async (url) => {
      if (url === 'word_audio_shards/index.json') {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            format: 'alloflow-word-audio-index/1',
            shards: {
              flat: { file: 'flat.json', bytes: 100 },
              nested: { file: 'nested.json', bytes: 100 },
            },
            words: {
              constructor: 'flat',
              toString: 'nested',
              habitat: 'nested',
            },
          }),
        };
      }
      if (url === 'word_audio_shards/flat.json') {
        return {
          ok: true,
          status: 200,
          // Deliberately lacks an own 'constructor' key
          text: async () => JSON.stringify({ _meta: {}, other: CLIP_URI }),
        };
      }
      return {
        ok: true,
        status: 200,
        // Nested { words: ... } shape with habitat present and toString absent
        text: async () => JSON.stringify({ format: 'alloflow-word-audio-shard/1', words: { habitat: CLIP_URI } }),
      };
    });

    const loader = {
      portableAudio: vi.fn(async (todo) => {
        for (const k of Object.keys(todo.audio)) todo.audio[k] = WAV_URI;
      }),
    };

    const out = await window.AlloVocabMedia.clips(['constructor', 'toString', 'habitat'], loader);
    expect(out).toEqual({ habitat: WAV_URI });
    expect(loader.portableAudio).toHaveBeenCalledTimes(1);
    expect(Object.keys(loader.portableAudio.mock.calls[0][0].audio)).toEqual(['habitat']);
  });
});
