// Word Sounds reuse fixes (2026-11-07):
// - teachers' previews, Repair and saved clips follow the voice the lesson's clips were made with;
// - "Regenerate all" really clears the host's cached clips (it called the helper with no word, which did nothing);
// - a lesson saved with both word layouts is charged once against the student audio budget.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const MODULE = readFileSync('word_sounds_module.js', 'utf8');
const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore();')();

describe('one voice per lesson', () => {
  const start = MODULE.indexOf('    const wsLessonVoice = (words) => {');
  const wsLessonVoice = new Function('WS_CORE', MODULE.slice(start, MODULE.indexOf('    // A clip the teacher already heard', start)) + '\nreturn wsLessonVoice;')(core);
  const clip = (voice, source = 'synthesized') => ({ mime: 'audio/mpeg', base64: 'SUQzAwAA', provenance: { version: 1, source, provider: 'gemini', voice } });

  it('picks the voice most generated clips were made with, ignoring recordings', () => {
    const words = [{ targetWord: 'cat', _ttsAssets: { cat: clip('af_heart'), hat: clip('af_heart'), bat: clip('Kore'), mat: clip('Puck', 'recorded_bank') } }];
    expect(wsLessonVoice(words)).toBe('af_heart');
  });
  it('says nothing for a lesson without generated clips', () => {
    expect(wsLessonVoice([{ targetWord: 'cat' }])).toBeNull();
    expect(wsLessonVoice([])).toBeNull();
  });
  it('applies to teachers only, and never swaps a Kokoro choice for a cloud voice', () => {
    expect(MODULE).toContain('selectedVoice: hostSelectedVoice,');
    expect(MODULE).toContain('const selectedVoice = isTeacherMode && lessonVoice && !hostVoiceIsKokoro ? lessonVoice : hostSelectedVoice;');
    // A clip made in another voice (a cloud fallback) is never saved into the lesson.
    expect(MODULE).toContain('if (profile.voice && wanted && profile.voice !== wanted) return;');
    // Repair and the review inventory read selectedVoice, so they follow the lesson voice too.
    expect(MODULE).toContain('resolveWordSoundsReplacement(row.text, selectedVoice, wordSoundsLanguage, callTTS, clipController.signal)');
  });
});

describe('clearing the host clip cache', () => {
  const ANTI = readFileSync('AlloFlowANTI.txt', 'utf8');
  const start = ANTI.indexOf('  window.__clearAlloTtsCacheForWord = function(word) {');
  const body = ANTI.slice(start, ANTI.indexOf('\n  };', start) + 5);
  const load = (keys) => {
    const cache = new Map(keys.map((key) => [key, 'https://clip/' + key.length]));
    const window = {};
    new Function('window', 'globalTtsUrlCache', 'URL', body)(window, cache, { revokeObjectURL() {} });
    return { clear: window.__clearAlloTtsCacheForWord, cache };
  };
  const key = (text, voice) => JSON.stringify([text, voice, 'en', 'natural-rate-v1', 'model']);

  it('with no word clears every cached clip (Regenerate all calls it this way)', () => {
    const { clear, cache } = load([key('cat', 'Kore'), key('dog', 'Kore')]);
    expect(clear()).toBe(2);
    expect(cache.size).toBe(0);
  });
  it('with a word clears that word in every voice, and nothing else', () => {
    const { clear, cache } = load([key('Cat', 'Kore'), key('cat', 'Puck'), key('catalog', 'Kore'), 'cat__legacy', 'dog__legacy']);
    expect(clear(' cat ')).toBe(3);
    expect([...cache.keys()]).toEqual([key('catalog', 'Kore'), 'dog__legacy']);
  });
  it('the Word Sounds caller still asks for a full clear', () => {
    expect(MODULE).toContain('window.__clearAlloTtsCacheForWord();');
  });
});

describe('student audio budget', () => {
  const source = readFileSync('word_sounds_readiness_contract.js', 'utf8');
  const module = { exports: {} };
  new Function('globalThis', 'module', source)({ window: {} }, module);
  const api = module.exports;
  // 8 clips of ~480 KB of base64: 3.75 MB, inside the 6 MB budget once, over it if counted twice.
  const clips = () => {
    const out = {};
    for (let i = 0; i < 8; i++) {
      const bytes = Buffer.alloc(360 * 1024, i + 1);
      bytes.write('ID3', 0);
      out['word ' + i] = { mime: 'audio/mpeg', base64: bytes.toString('base64') };
    }
    return out;
  };
  it('keeps every clip when the same lesson is saved in both layouts', () => {
    const assets = clips();
    const words = () => [{ word: 'cat', targetWord: 'cat', _ttsAssets: assets }];
    const packed = api.portable({ type: 'word-sounds', data: words(), wsPreloadedWords: words() });
    expect(Object.keys(packed.data[0]._ttsAssets)).toHaveLength(8);
    expect(Object.keys(packed.wsPreloadedWords[0]._ttsAssets), 'the second copy used to lose clips').toHaveLength(8);
    expect(packed.wsPreloadedWords[0]._ttsOmittedKeys).toBeUndefined();
  });
  it('still stops at 6 MB of distinct audio', () => {
    const many = {};
    for (let i = 0; i < 16; i++) {
      const bytes = Buffer.alloc(360 * 1024, i + 1);
      bytes.write('ID3', 0);
      many['word ' + i] = { mime: 'audio/mpeg', base64: bytes.toString('base64') };
    }
    const packed = api.portable({ type: 'word-sounds', data: [{ word: 'cat', _ttsAssets: many }] });
    const kept = Object.keys(packed.data[0]._ttsAssets).length;
    expect(kept).toBeLessThan(16);
    expect(packed.data[0]._ttsOmittedKeys.length).toBe(16 - kept);
  });
});
