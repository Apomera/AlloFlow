import { describe, expect, it, beforeEach } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync('word_practice_core.js', 'utf8');
let core;
beforeEach(() => {
  const sandbox = { atob, globalThis: {} }; vm.runInNewContext(source, sandbox);
  core = sandbox.globalThis.AlloWordPracticeCore;
});
const wav = 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(40)).toString('base64');
describe('shared word practice contract', () => {
  it('preserves the teaching word and vocabulary while dropping unrelated learner data', () => {
    const pack = core.normalizeInput({ title: 'Weekly words', words: [{ targetWord: 'ship', definition: 'A large boat', translations: { Spanish: { word: 'barco' } }, phonemes: ['sh', 'i', 'p'], _ttsAssets: { ship: { mime: 'audio/wav', base64: wav.split(',')[1] } }, learnerId: 'private', score: 97 }], phonemeBank: { sh: wav } });
    expect(pack.items[0]).toMatchObject({ word: 'ship', definition: 'A large boat', wordAudio: wav, translations: [{ language: 'Spanish', text: 'barco' }] });
    expect(pack.items[0].phonemes[0].audio).toBe(wav);
    expect(core.serializePack(pack)).not.toMatch(/private|learnerId|score/);
  });
  it('merges duplicate words without removing phrases or altering case', () => {
    expect(core.parseWords('New York\nI, ship\r\n')).toEqual(['New York', 'I', 'ship']);
    const pack = core.normalizeInput({ words: ['Ship', { word: 'ship', definition: 'Boat' }, 'I'] });
    expect(pack.items.map(item => item.word)).toEqual(['Ship', 'I']);
    expect(pack.items[0].definition).toBe('Boat');
  });
  it('retains glossary definitions and resolves sounds independently of displayed spellings', () => {
    const pack = core.normalizeInput({ words: [{ term: 'city', def: 'A large town.', phonemes: [{ grapheme: 'c', ipa: 's' }] }], phonemeBank: { s: wav } });
    expect(pack.items[0].definition).toBe('A large town.');
    expect(pack.items[0].phonemes[0]).toEqual({ label: 'c', soundKey: 's', audio: wav, provenance: { language: 'en', source: 'recorded_bank' }, audioStatus: 'ready' });
    expect(core.normalizeInput(JSON.parse(core.serializePack(pack))).items[0].phonemes[0].soundKey).toBe('s');
  });
  it('never imports active URLs, markup as markup, or malformed audio', () => {
    expect(core.safeAudio('https://example.com/a.mp3')).toBe('');
    expect(core.safeAudio('data:audio/wav;base64,' + btoa('<script>alert(1)</script>'))).toBe('');
    const serialized = core.serializePack(core.normalizeInput({ words: ['</script><script>alert(1)</script>'], title: '</script>' }));
    expect(serialized).not.toContain('<');
    expect(JSON.parse(serialized).items[0].word).toBe('</script><script>alert(1)</script>');
  });
  it('gives every word the chosen number of repetitions, with no adjacent duplicates', () => {
    const pack = core.normalizeInput({ words: ['cat', 'ship', 'rain'] });
    let n = 13;
    const sequence = core.createSequence(pack, { repetitions: 10, shuffle: true, varyPosition: true, varySize: true }, () => ((n = (n * 16807) % 2147483647) / 2147483647));
    expect(sequence).toHaveLength(30);
    for (const item of pack.items) expect(sequence.filter(card => card.itemId === item.id)).toHaveLength(10);
    for (let i = 1; i < sequence.length; i++) expect(sequence[i].itemId).not.toBe(sequence[i - 1].itemId);
    expect(sequence.every(card => ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(card.position))).toBe(true);
  });
  it('uses predictable large centered cards by default and handles one word safely', () => {
    const pack = core.normalizeInput({ words: ['cat'] });
    expect(core.createSequence(pack, { repetitions: 3 })).toEqual(Array.from({ length: 3 }, () => ({ itemId: 'w1', position: 'center', scale: 1 })));
    expect(core.normalizeOptions({ mode: 'invented', repetitions: Infinity, intervalSeconds: -100 })).toMatchObject({ mode: 'popup', repetitions: 3, intervalSeconds: 1, autoAdvance: false });
  });
  it('rejects oversized lists rather than silently losing instructional words', () => {
    expect(() => core.normalizeInput({ words: Array.from({ length: 201 }, (_, n) => 'word' + n) })).toThrow(/200/);
    expect(() => core.normalizeInput({ words: ['x'.repeat(121)] })).toThrow(/120/);
  });
  it('reports partial sound coverage honestly and retains exported settings', () => {
    const pack = core.normalizeInput({ words: [{ word: 'cat', wordAudio: wav, phonemes: [{ label: 'k', audio: wav }, { label: 'a' }, { label: 't' }] }], options: { mode: 'blend', repetitions: 2, includeAudio: false } });
    expect(core.audioCoverage(pack)).toMatchObject({ words: 1, totalWords: 1, phonemes: 1, totalPhonemes: 3, completePhonemeWords: 0 });
    expect(JSON.parse(core.serializePack(pack)).options).toMatchObject({ mode: 'blend', repetitions: 2, includeAudio: false });
  });
  it('exports prepared sentence activities without inventing boards for other words', () => {
    const pack = core.normalizeInput({ words: [{ word: 'ship', activityItems: { read_sentence: { sentence: 'The ship is big.', before: 'The ', after: ' is big.', options: ['rain', 'ship', 'light'] } } }, 'rain'] });
    expect(pack.items[0].sentenceActivity).toEqual({ prompt: 'The ____ is big.', choices: ['rain', 'ship', 'light'], answer: 'ship', language: 'en' });
    expect(pack.items[1].sentenceActivity).toBe(null);
    const sequence = core.createSequence(pack, { mode: 'sentence', repetitions: 2 });
    expect(sequence.map(card => card.itemId)).toEqual(['w1', 'w1']);
    expect(core.normalizeInput(JSON.parse(core.serializePack(pack))).items[0].sentenceActivity).toEqual(pack.items[0].sentenceActivity);
    expect(() => core.createSequence(core.normalizeInput(['rain']), { mode: 'sentence' })).toThrow(/Prepare/);
  });
  it('joins the trimmed sentence fragments produced by Word Sounds', () => {
    const pack = core.normalizeInput([{ word: 'ship', activityItems: { read_sentence: { sentence: 'The ship is big.', before: 'The', after: 'is big.', options: ['rain', 'ship'] } } }, { word: 'cat', activityItems: { read_sentence: { sentence: 'Look at the cat!', before: 'Look at the', after: '!', options: ['cat', 'dog'] } } }]);
    expect(pack.items[0].sentenceActivity.prompt).toBe('The ____ is big.');
    expect(pack.items[1].sentenceActivity.prompt).toBe('Look at the ____!');
  });
  it('rejects a stale or unanswerable sentence board', () => {
    expect(core.normalizeInput([{ word: 'ship', activityItems: { read_sentence: { sentence: 'The cat is big.', before: 'The ', after: ' is big.', options: ['cat', 'ship'] } } }]).items[0].sentenceActivity).toBe(null);
    expect(core.normalizeInput([{ word: 'ship', sentenceActivity: { prompt: 'The ____ is big.', choices: ['rain', 'light'], answer: 'ship' } }]).items[0].sentenceActivity).toBe(null);
    expect(core.normalizeInput([{ word: 'ship', sentenceActivity: { prompt: 'The ____ is big.', choices: ['rain', 'ship'], answer: 'rain' } }]).items[0].sentenceActivity).toBe(null);
  });
});
