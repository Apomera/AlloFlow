import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const lanes = { source: fs.readFileSync('word_practice_core.js', 'utf8'), runtime: fs.readFileSync('word_practice_module.js', 'utf8') };
const liveSource = fs.readFileSync('word_sounds_core.js', 'utf8');
const makeWav = marker => 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + marker + '\0'.repeat(40)).toString('base64');
const englishAudio = makeWav('english'), frenchAudio = makeWav('french');
function load(lane) { const window = {}; vm.runInNewContext(lanes[lane], { window, atob, btoa, setTimeout, clearTimeout, AbortController, Uint8Array, DataView, Intl }); return window.AlloWordPracticeCore; }
function asset(audio, language) { return { mime: 'audio/wav', base64: audio.split(',')[1], provenance: { language, provider: 'fixture', resolvedVoice: 'same-voice', source: 'synthesized' } }; }
const reimport = (core, pack) => core.normalizeInput(JSON.parse(core.serializePack(pack)));

describe.each(Object.keys(lanes))('Word Practice stable portable contract (%s)', lane => {
  it('preserves distinct same-language authored homonyms and their stable identities through save/reordering', () => {
    const core = load(lane), words = [
      { entryId: 'bank-financial', term: 'bank', def: 'A financial institution.', termLanguage: 'English', definitionLanguage: 'English', wordAudio: englishAudio },
      { entryId: 'bank-river', term: 'bank', def: 'The land beside a river.', termLanguage: 'English', definitionLanguage: 'English', wordAudio: frenchAudio }
    ];
    const pack = core.normalizeInput({ words });
    expect(pack.items.map(item => [item.id, item.entryId, item.definition, item.wordAudio])).toEqual([
      ['entry:bank-financial', 'bank-financial', words[0].def, englishAudio], ['entry:bank-river', 'bank-river', words[1].def, frenchAudio]
    ]);
    expect(reimport(core, pack).items).toEqual(pack.items);
    expect(core.normalizeInput({ items: pack.items.slice().reverse() }).items.map(item => item.id)).toEqual(pack.items.map(item => item.id).reverse());
    expect(core.createSequence(pack, { repetitions: 1, shuffle: false }).map(frame => frame.itemId)).toEqual(pack.items.map(item => item.id));
  });
  it('keeps mixed-language homographs separate and selects each own asset before a shared word bucket', () => {
    const core = load(lane), pack = core.normalizeInput({ language: 'English', words: [
      { entryId: 'pain-en', term: 'pain', termLanguage: 'English', _ttsAssets: { pain: asset(englishAudio, 'English') } },
      { entryId: 'pain-fr', term: 'pain', termLanguage: 'French', _ttsAssets: { pain: asset(frenchAudio, 'French') } }
    ] });
    expect(pack.items.map(item => [item.termLanguage, item.wordAudio, item.wordAudioStatus])).toEqual([['English', englishAudio, 'ready'], ['French', frenchAudio, 'ready']]);
    expect(core.audioIssueCounts(pack)).toEqual({ staleLanguage: 0 });
  });
  it('still deduplicates the same authored entry and repeated plain words', () => {
    const core = load(lane), pack = core.normalizeInput({ words: [{ entryId: 'one', word: 'bank' }, { entryId: 'one', word: 'BANK', definition: 'One meaning.' }, 'ship', 'Ship'] });
    expect(pack.items).toHaveLength(2); expect(pack.items[0]).toMatchObject({ id: 'entry:one', entryId: 'one', definition: 'One meaning.' });
  });
  it('reserves existing portable IDs before assigning new IDs and rejects ambiguous authored identities', () => {
    const core = load(lane), pack = core.normalizeInput({ words: ['new', { id: 'w1', word: 'kept' }, { id: 'saved-sense', word: 'kept' }] });
    expect(pack.items.map(item => item.id)).toEqual(['w2', 'w1', 'saved-sense']); expect(reimport(core, pack).items).toEqual(pack.items);
    expect(() => core.normalizeInput({ words: [{ entryId: 'same', word: 'one' }, { entryId: 'same', word: 'two' }] })).toThrow(/ID refers to different words/);
    expect(() => core.normalizeInput({ words: [{ entryId: 'one', word: 'one' }, { id: 'entry:one', word: 'two' }] })).toThrow(/distinct practice entry.*stable ID/);
    expect(() => core.normalizeInput({ words: [{ entryId: 'x'.repeat(161), word: 'one' }] })).toThrow(/IDs.*160/);
  });
  it('preserves item and field languages across normalization and saved sets with defined legacy fallbacks', () => {
    const core = load(lane), pack = core.normalizeInput({ language: 'Spanish', words: [{ entryId: 'ship', term: 'سفينة', termLanguage: 'Arabic', def: 'A vessel.', definitionLanguage: 'English', example: 'Un navire.', exampleLanguage: 'French', sentenceActivity: { prompt: 'Das ____ ist groß.', choices: ['سفينة','anderes'], answer: 'سفينة', language: 'German' } }, 'Hoja'] });
    const item = pack.items[0];
    expect(['term','definition','example','sentence'].map(field => core.fieldLanguage(item, field, pack.language))).toEqual(['Arabic','English','French','German']);
    expect(reimport(core, pack).items[0]).toEqual(item);
    expect(pack.items[1]).toMatchObject({ termLanguage: 'Spanish', definitionLanguage: 'Spanish', exampleLanguage: 'Spanish' });
    expect(core.fieldLanguage({ termLanguage: 'Arabic' }, 'sentence', 'Spanish')).toBe('Arabic');
    expect(core.fieldLanguage({ definitionLanguage: 'English' }, 'example', 'Spanish')).toBe('English');
  });
  it.each(['English','en','EN_us','en-GB','French','fr','fr-CA','French (Canadian)','french\u241ffr-ca\u241fcanadian','en-us\u241fsouthern','Navajo'])('aligns saved recording identity with live Word Sounds for %s', language => {
    const core = load(lane), sandbox = { window: {}, atob, btoa, Intl };
    vm.runInNewContext(liveSource + '\nthis.liveCore = createWordSoundsCore();', sandbox);
    expect(core.audioLanguageKey(language)).toBe(sandbox.liveCore.packAudioLanguageKey(language));
  });
  it('omits known stale audio from playable fields while preserving original bytes and bounded metadata', () => {
    const core = load(lane), original = { targetWord: 'pain', _ttsAssets: { pain: { ...asset(englishAudio, 'English'), provenance: { ...asset(englishAudio, 'English').provenance, secret: 'do not export' } } } };
    const snapshot = JSON.stringify(original), pack = core.normalizeInput({ language: 'French', words: [original] }), item = pack.items[0];
    expect(item.wordAudio).toBe(''); expect(item.wordAudioStatus).toBe('stale-language'); expect(item.wordAudioOriginal.audio).toBe(englishAudio);
    expect(item.wordAudioOriginal.provenance.language).toBe('English'); expect(item.wordAudioOriginal.provenance).not.toHaveProperty('secret');
    expect(core.audioIssueCounts(pack)).toEqual({ staleLanguage: 1 }); expect(reimport(core, pack).items[0]).toEqual(item); expect(JSON.stringify(original)).toBe(snapshot);
  });
  it('checks actual provenance against each term rather than treating requested language as actual language', () => {
    const core = load(lane);
    expect(core.audioCompatibility(englishAudio, 'French', { language: 'English', requestedLanguage: 'French' })).toMatchObject({ status: 'stale-language', audio: englishAudio, sourceLanguage: 'English', expectedLanguage: 'French' });
    expect(core.normalizeInput({ language: 'French', words: [{ word: 'pain', termLanguage: 'English', wordAudio: englishAudio, wordAudioProvenance: { language: 'English' } }] }).items[0]).toMatchObject({ wordAudio: englishAudio, wordAudioStatus: 'ready' });
    expect(core.audioCompatibility(englishAudio, 'French', { requestedLanguage: 'French', source: 'synthesized' }).status).toBe('legacy');
  });
  it('keeps the defined legacy lane but excludes explicit regional/script mismatches', () => {
    const core = load(lane);
    expect(core.normalizeInput({ language: 'French', words: [{ word: 'ami', wordAudio: englishAudio }] }).items[0]).toMatchObject({ wordAudio: englishAudio, wordAudioStatus: 'legacy' });
    expect(core.audioCompatibility(asset(englishAudio, 'en-US'), 'English').status).toBe('ready');
    expect(core.audioCompatibility(asset(englishAudio, 'en-US'), 'en-GB').status).toBe('stale-language');
    expect(core.audioCompatibility(asset(englishAudio, 'ar'), 'ar-Latn').status).toBe('stale-language');
  });
  it('gates phonemes and preserves their stale original across repeated normalization', () => {
    const core = load(lane), pack = core.normalizeInput({ language: 'French', words: [{ word: 'ami', phonemes: [{ label: 'm', audio: englishAudio, provenance: { language: 'English' } }] }] });
    const sound = pack.items[0].phonemes[0];
    expect(sound.audio).toBe(''); expect(sound.audioStatus).toBe('stale-language'); expect(sound.audioOriginal.audio).toBe(englishAudio);
    expect(reimport(core, pack).items[0].phonemes[0]).toEqual(sound); expect(core.audioIssueCounts(pack)).toEqual({ staleLanguage: 1 });
  });
  it('retains old audio after a fresh compatible replacement and restores compatible originals when their language returns', () => {
    const core = load(lane), pack = core.normalizeInput({ language: 'French', words: [{ word: 'pain', wordAudio: englishAudio, wordAudioProvenance: { language: 'English' } }] });
    const replaced = core.normalizeInput({ ...pack, items: [{ ...pack.items[0], wordAudio: frenchAudio, wordAudioProvenance: { language: 'French' } }] });
    expect(replaced.items[0]).toMatchObject({ wordAudio: frenchAudio, wordAudioStatus: 'ready', wordAudioOriginal: { audio: englishAudio } }); expect(core.audioIssueCounts(replaced)).toEqual({ staleLanguage: 0 });
    expect(core.normalizeInput({ ...pack, items: [{ ...pack.items[0], termLanguage: 'English' }] }).items[0]).toMatchObject({ wordAudio: englishAudio, wordAudioStatus: 'ready' });
  });
  it('scopes bank clips by item language and stamps a known bank language before saving', () => {
    const core = load(lane), words = [{ entryId: 'en', word: 'one', termLanguage: 'English', phonemes: ['m'] }, { entryId: 'fr', word: 'deux', termLanguage: 'French', phonemes: ['m'] }];
    const pack = core.normalizeInput({ language: 'English', words, phonemeBank: { m: englishAudio }, phonemeBanks: { French: { m: frenchAudio } } });
    expect(pack.items.map(item => item.phonemes[0].audio)).toEqual([englishAudio, frenchAudio]);
    expect(pack.items[0].phonemes[0].provenance.language).toBe('English');
    const changed = core.normalizeInput({ ...pack, items: [{ ...pack.items[0], termLanguage: 'French' }] });
    expect(changed.items[0].phonemes[0]).toMatchObject({ audio: '', audioStatus: 'stale-language', audioOriginal: { audio: englishAudio } });
    expect(core.normalizeInput({ language: 'English', words: [words[1]], phonemeBank: { m: asset(frenchAudio, 'French') } }).items[0].phonemes[0].audio).toBe(frenchAudio);
  });
  it('counts retained stale payloads toward the existing portable audio budget', () => {
    const core = load(lane), bytes = Buffer.alloc(2304 * 1024); bytes.write('RIFF'); bytes.write('WAVE', 8);
    const audio = 'data:audio/wav;base64,' + bytes.toString('base64');
    const words = Array.from({ length: 9 }, (_, i) => ({ word: 'word' + i, wordAudio: audio, wordAudioProvenance: { language: 'English' } }));
    expect(() => core.normalizeInput({ language: 'French', words })).toThrow(/too much audio/);
  });
});
