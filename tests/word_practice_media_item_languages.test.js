import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const lanes = {
  source: ['word_practice_core.js', 'word_practice_media.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n'),
  runtime: fs.readFileSync('word_practice_module.js', 'utf8')
};
const recording = marker => 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + marker + '\0'.repeat(48)).toString('base64');
const english = recording('English'), french = recording('French'), spanish = recording('Spanish'), arabic = recording('Arabic');
const asset = (audio, language, extra = {}) => ({ audio, provenance: { language, source: 'teacher_recording', ...extra } });
const flatten = value => Array.isArray(value) ? value.map(run => run.text).join('') : value;
class Presentation {
  constructor() { this.slides = []; }
  addSlide() {
    const slide = { texts: [], sounds: [], addText(text, options) { this.texts.push({ text, options }); }, addMedia(options) { this.sounds.push(options); }, addNotes() {} };
    this.slides.push(slide); return slide;
  }
}
function load(lane) {
  const root = {};
  vm.runInNewContext(lanes[lane], { window: root, atob, btoa, setTimeout, clearTimeout, AbortController, Uint8Array, DataView, Intl });
  return { root, core: root.AlloWordPracticeCore, media: root.AlloWordPracticeMedia };
}
const context = { PptxGenJS: Presentation };
const opts = mode => ({ mode, repetitions: 1, shuffle: false, includeAudio: false });

describe.each(Object.keys(lanes))('Word Practice media item languages (%s)', lane => {
  it('requests each source word language and keeps actual resolved synthesis provenance through Save/Open normalization', async () => {
    const { core, media } = load(lane);
    const callTTS = vi.fn(async (word, voice, speed, options) => {
      options.onResolvedProfile({ language: options.language, provider: 'gemini', resolvedVoice: 'Kore', model: 'tts-model' });
      return word === 'hoja' ? spanish : arabic;
    });
    const original = { language: 'Spanish', words: [
      { entryId: 'leaf', term: 'hoja', termLanguage: 'Spanish', def: 'A plant part.', definitionLanguage: 'English' },
      { entryId: 'ship', term: 'سفينة', termLanguage: 'Arabic', def: 'A vessel.', definitionLanguage: 'English' }
    ] };
    const before = JSON.stringify(original);
    const prepared = await media.prepareAudio(original, { callTTS, selectedVoice: 'Kore' });
    expect(callTTS.mock.calls.map(call => [call[0], call[3].language])).toEqual([['hoja', 'Spanish'], ['سفينة', 'Arabic']]);
    const saved = JSON.parse(core.serializePack(prepared));
    expect(saved.items.map(item => [item.termLanguage, item.definitionLanguage])).toEqual([['Spanish', 'English'], ['Arabic', 'English']]);
    expect(saved.items.map(item => item.wordAudio)).toEqual([spanish, arabic]);
    saved.items.forEach((item, index) => expect(item.wordAudioProvenance).toMatchObject({ language: index ? 'Arabic' : 'Spanish', requestedLanguage: index ? 'Arabic' : 'Spanish', source: 'synthesized', provider: 'gemini', resolvedVoice: 'Kore', model: 'tts-model' }));
    expect(core.normalizeInput(saved).items.map(item => item.wordAudio)).toEqual([spanish, arabic]);
    expect(JSON.stringify(original)).toBe(before);
  });

  it('uses the default English word and phoneme banks per item rather than the pack language', async () => {
    const { root, media } = load(lane);
    root._CACHE_WORD_AUDIO_BANK = { pan: english };
    root.__ALLO_PHONEME_AUDIO_BANK = { p: english };
    const callTTS = vi.fn(async () => spanish);
    const pack = await media.prepareAudio({ language: 'Spanish', words: [
      { entryId: 'pan-es', word: 'pan', termLanguage: 'Spanish', phonemes: ['p'] },
      { entryId: 'pan-en', word: 'pan', termLanguage: 'English', phonemes: ['p'] }
    ] }, { callTTS });
    expect(pack.items.map(item => item.wordAudio)).toEqual([spanish, english]);
    expect(pack.items.map(item => item.phonemes[0].audio)).toEqual(['', english]);
    expect(callTTS.mock.calls.map(call => call[3].language)).toEqual(['Spanish']);
    expect(pack.items[1].wordAudioProvenance).toMatchObject({ source: 'recorded_bank', language: 'en-US', provider: 'kokoro', resolvedVoice: 'af_heart' });
  });

  it('does not relabel the US bank as a different explicit English locale', async () => {
    const { root, media } = load(lane);
    root._CACHE_WORD_AUDIO_BANK = { bath: english }; root.__ALLO_PHONEME_AUDIO_BANK = { a: english };
    const callTTS = vi.fn(async () => french);
    const pack = await media.prepareAudio({ language: 'English', words: [{ word: 'bath', termLanguage: 'en-GB', phonemes: ['a'] }] }, { callTTS });
    expect(callTTS.mock.calls[0][3].language).toBe('en-GB');
    expect(pack.items[0].wordAudio).toBe(french); expect(pack.items[0].phonemes[0].audio).toBe('');
  });

  it('scopes legacy flat caller banks to their declared language and prepares the other item independently', async () => {
    const { media } = load(lane);
    const callTTS = vi.fn(async () => arabic);
    const pack = await media.prepareAudio({ language: 'Spanish', words: [
      { word: 'pan', termLanguage: 'Spanish', phonemes: ['p'] },
      { word: 'سفينة', termLanguage: 'Arabic', phonemes: ['p'] }
    ] }, { wordBank: { pan: spanish, 'سفينة': spanish }, phonemeBank: { p: spanish }, callTTS });
    expect(pack.items.map(item => item.wordAudio)).toEqual([spanish, arabic]);
    expect(pack.items.map(item => item.phonemes[0].audio)).toEqual([spanish, '']);
    expect(callTTS.mock.calls.map(call => [call[0], call[3].language])).toEqual([['سفينة', 'Arabic']]);
  });

  it('honors bankLanguage independently from the imported pack language', async () => {
    const { media } = load(lane);
    const callTTS = vi.fn(async () => french);
    const pack = await media.prepareAudio({ language: 'French', words: [
      { entryId: 'pain-fr', word: 'pain', termLanguage: 'French' },
      { entryId: 'pain-en', word: 'pain', termLanguage: 'English' }
    ] }, { bankLanguage: 'English', wordBank: { pain: english }, callTTS });
    expect(pack.items.map(item => item.wordAudio)).toEqual([french, english]);
    expect(callTTS.mock.calls.map(call => call[3].language)).toEqual(['French']);
  });

  it('chooses distinct homograph recordings and sounds from explicitly language-keyed caller banks', async () => {
    const { media, core } = load(lane), callTTS = vi.fn();
    const pack = await media.prepareAudio({ language: 'English', words: [
      { entryId: 'pain-fr', word: 'pain', termLanguage: 'French', phonemes: ['p'] },
      { entryId: 'pain-en', word: 'pain', termLanguage: 'English', phonemes: ['p'] }
    ] }, { wordBanks: { 'fr-FR': { pain: french }, English: { pain: english } }, phonemeBanks: { French: { p: french }, 'en-US': { p: english } }, callTTS });
    expect(pack.items.map(item => item.wordAudio)).toEqual([french, english]);
    expect(pack.items.map(item => item.phonemes[0].audio)).toEqual([french, english]);
    expect(callTTS).not.toHaveBeenCalled();
    const saved = core.normalizeInput(JSON.parse(core.serializePack(pack)));
    expect(saved.items.map(item => item.wordAudioProvenance.language)).toEqual(['fr-FR', 'English']);
    expect(saved.items.map(item => item.phonemes[0].provenance.language)).toEqual(['French', 'en-US']);
  });

  it('warns about excluded known mismatches, retains their original bytes and never mutates the caller', async () => {
    const { media, core } = load(lane);
    const input = { language: 'French', words: [{ word: 'pain', wordAudio: english, wordAudioProvenance: { language: 'English', source: 'synthesized' }, phonemes: [{ label: 'p', audio: english, provenance: { language: 'English', source: 'teacher_recording' } }] }] };
    const before = JSON.stringify(input);
    const pack = await media.prepareAudio(input);
    expect(pack.items[0].wordAudio).toBe(''); expect(pack.items[0].phonemes[0].audio).toBe('');
    expect(pack.audioStatus.errors.join(' ')).toContain('language no longer matches');
    const saved = JSON.parse(core.serializePack(pack));
    expect(saved.items[0].wordAudioOriginal.audio).toBe(english); expect(saved.items[0].phonemes[0].audioOriginal.audio).toBe(english);
    expect(JSON.stringify(input)).toBe(before);
    const pptx = await media.buildPptx(pack, { repetitions: 1 }, undefined, context);
    expect(pptx.slides.flatMap(slide => slide.sounds)).toHaveLength(0);
    expect(pptx.wordPracticeWarnings.join(' ')).toContain('language no longer matches');
  });

  it('keeps an excluded original when a compatible resolved TTS recording replaces it', async () => {
    const { media, core } = load(lane);
    const callTTS = vi.fn(async (word, voice, speed, options) => { options.onResolvedProfile({ language: 'fr-FR', provider: 'gemini', resolvedVoice: 'Kore' }); return french; });
    const pack = await media.prepareAudio({ language: 'French', words: [{ word: 'pain', wordAudio: english, wordAudioProvenance: { language: 'English' } }] }, { callTTS });
    expect(pack.items[0].wordAudio).toBe(french); expect(pack.items[0].wordAudioStatus).toBe('ready');
    expect(pack.items[0].wordAudioOriginal.audio).toBe(english);
    const reopened = core.normalizeInput(JSON.parse(core.serializePack(pack)));
    expect(reopened.items[0].wordAudio).toBe(french); expect(reopened.items[0].wordAudioOriginal.audio).toBe(english);
  });

  it.each(['word', 'sound', 'tts'])('rejects a known wrong-language %s result despite a matching caller bank/request scope', async kind => {
    const { media } = load(lane);
    const input = { language: 'French', words: [{ word: 'pain', ...(kind === 'sound' ? { wordAudio: french, phonemes: ['p'] } : {}) }] };
    const options = kind === 'word' ? { wordBank: { pain: asset(english, 'English') } }
      : kind === 'sound' ? { phonemeBank: { p: asset(english, 'English') } }
        : { callTTS: async (word, voice, speed, request) => { request.onResolvedProfile({ language: 'English', provider: 'example' }); return english; } };
    const pack = await media.prepareAudio(input, options);
    expect(kind === 'sound' ? pack.items[0].phonemes[0].audio : pack.items[0].wordAudio).toBe('');
    expect(pack.audioStatus.errors.join(' ')).toContain('language no longer matches');
    expect(kind === 'sound' ? pack.items[0].phonemes[0].audioOriginal.audio : pack.items[0].wordAudioOriginal.audio).toBe(english);
  });

  it('preserves the explicit legacy policy when TTS does not report a resolved language', async () => {
    const { media } = load(lane);
    const pack = await media.prepareAudio({ language: 'French', words: ['pain'] }, { callTTS: async () => french });
    expect(pack.items[0].wordAudio).toBe(french); expect(pack.items[0].wordAudioStatus).toBe('legacy');
    expect(pack.items[0].wordAudioProvenance).toMatchObject({ source: 'synthesized', requestedLanguage: 'French' });
    expect(pack.items[0].wordAudioProvenance.language).toBeUndefined();
  });

  it('localizes the explicit mismatch warning in preparation and PowerPoint', async () => {
    const { media } = load(lane);
    const input = { language: 'French', words: [{ word: 'pain', wordAudio: english, wordAudioProvenance: { language: 'English' } }] };
    const translation = key => key === 'word_practice.audio_language_stale' ? 'La langue de «{word}» a changé.' : key;
    const pack = await media.prepareAudio(input, { t: translation });
    expect(pack.audioStatus.errors).toContain('La langue de «pain» a changé.');
    const pptx = await media.buildPptx(input, { repetitions: 1 }, undefined, { ...context, t: translation });
    expect(pptx.wordPracticeWarnings).toContain('La langue de «pain» a changé.');
  });

  it.each(['popup', 'blend', 'vocabulary', 'spelling', 'sentence'])('tags each %s word and answer with its own source language and direction', async mode => {
    const { media } = load(lane);
    const pack = { language: 'Spanish', words: [
      { word: 'hoja', termLanguage: 'Spanish', definition: 'A plant part.', definitionLanguage: 'English', sentenceActivity: { prompt: 'La ____ es verde.', choices: ['hoja', 'mesa'], answer: 'hoja', language: 'Spanish' } },
      { word: 'سفينة', termLanguage: 'Arabic', definition: 'A vessel.', definitionLanguage: 'English', phonemes: ['s'], sentenceActivity: { prompt: 'هذه ____ كبيرة.', choices: ['سفينة', 'شجرة'], answer: 'سفينة', language: 'Arabic' } }
    ] };
    const pptx = await media.buildPptx(pack, opts(mode), undefined, context);
    const texts = pptx.slides.flatMap(slide => slide.texts);
    for (const [word, lang, rtlMode] of [['hoja', 'es', false], ['سفينة', 'ar', true]]) {
      expect(texts.find(entry => entry.text === word).options).toMatchObject({ lang, rtlMode });
    }
    if (mode === 'blend') expect(texts.find(entry => entry.text === 's').options).toMatchObject({ lang: 'ar', rtlMode: true });
  });

  it('tags definition, example and sentence prompt separately from their word and from UI labels', async () => {
    const { media } = load(lane);
    const input = { language: 'Spanish', words: [{ word: 'سفينة', termLanguage: 'ar', definition: 'A vessel.', definitionLanguage: 'en', example: 'Un grand bateau.', exampleLanguage: 'fr-CA', sentenceActivity: { prompt: 'La ____ est grande.', choices: ['سفينة', 'شجرة'], answer: 'سفينة', language: 'fr' } }] };
    const vocabulary = await media.buildPptx(input, opts('vocabulary'), undefined, context);
    const texts = vocabulary.slides.flatMap(slide => slide.texts);
    expect(texts.find(entry => entry.text === 'A vessel.').options).toMatchObject({ lang: 'en', rtlMode: false });
    const example = texts.find(entry => flatten(entry.text) === 'Example: Un grand bateau.');
    expect(example.options).toMatchObject({ lang: 'fr-CA', rtlMode: false });
    expect(example.text[0].options.lang).toBe('en'); expect(example.text[1].options.lang).toBe('fr-CA');
    const sentence = await media.buildPptx(input, opts('sentence'), undefined, context);
    expect(sentence.slides[0].texts.find(entry => entry.text === 'La ____ est grande.').options).toMatchObject({ lang: 'fr', rtlMode: false });
    expect(sentence.slides[0].texts.find(entry => flatten(entry.text).startsWith('A. ')).options).toMatchObject({ lang: 'ar', rtlMode: true });
    expect(sentence.slides[1].texts.find(entry => entry.text === 'سفينة').options).toMatchObject({ lang: 'ar', rtlMode: true });
  });
});
