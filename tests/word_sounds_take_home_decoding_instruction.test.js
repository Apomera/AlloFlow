// @vitest-environment jsdom
// Take-home Read & Match (2026-11-08): the bank has no recording of its instruction, so a file only spoke it
// when the lesson happened to hold a clip. The download now makes that clip once, in the lesson's voice, and
// hands it to the file; every other take-home activity already requires its spoken instruction.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + ';return createWordSoundsCore();')();
delete window.AlloWordSoundsTakeHome;
new Function(readFileSync('word_sounds_take_home_loader.js', 'utf8'))();
const TH = window.AlloWordSoundsTakeHome;
const MODULE = readFileSync('word_sounds_module.js', 'utf8');

const wav = (tag) => { const b = Buffer.alloc(64); b.write('RIFF'); b.write('WAVE', 8); b.write(String(tag).slice(0, 8), 44); return b.toString('base64'); };
const asset = (tag) => ({ mime: 'audio/wav', base64: wav(tag) });
// 2026-11-14 (R3 answer-audit wrap-up): decoding.js prepare() drops wrong choices whose picture bytes match the
// answer's picture or an earlier choice, so each distinct fixture word needs distinct stand-in image bytes.
const png = (tag) => 'data:image/png;base64,' + Buffer.from('PNG-' + tag).toString('base64');
const PROMPT = 'Read the word, then tap its picture!';
const pack = (extra = {}, assets = { cat: png('cat'), dog: png('dog'), sun: png('sun') }) => [{
  word: 'cat', targetWord: 'cat', term: 'cat', image: assets.cat,
  _ttsAssets: { cat: asset('cat'), ...extra },
  _decodingAssets: assets,
  activityItems: { decoding: { choices: ['cat', 'dog', 'sun'] } },
}];
const build = (words) => TH.lessonFromPack(words, { core, banks: { instructions: {} }, activities: ['decoding'] });
const firstItem = (built) => built.lesson.blocks[0].items[0];

describe('take-home Read & Match instruction', () => {
  it('has no spoken instruction when the lesson holds no clip of it', () => {
    expect(firstItem(build(pack())).introAudio).toEqual([]);
  });
  it('speaks the clip handed in the way the download adds it', () => {
    const item = firstItem(build(pack({ [core.packAudioKey(PROMPT)]: asset('prompt') })));
    expect(item.introAudio).toHaveLength(1);
    expect(item.prompt).toBe(item.introAudio[0]);
  });
  it('drops duplicate picture choices and refuses a board whose choices share one picture', () => {
    const partial = firstItem(build(pack({}, { cat: png('cat'), dog: png('cat'), sun: png('sun') })));
    expect(partial.choices.map((c) => c.text)).toEqual(['cat', 'sun']);
    const allSame = build(pack({}, { cat: png('same'), dog: png('same'), sun: png('same') }));
    expect(allSame.lesson.blocks).toEqual([]);
    expect(allSame.exceptions[0].missing).toContain('the pictures to choose from are one picture');
  });
  it('the download makes the clip only when Read & Match is chosen and the lesson lacks it, and never blocks the file', () => {
    const at = MODULE.indexOf('const decodingPrompt = "Read the word, then tap its picture!";');
    expect(at).toBeGreaterThan(0);
    const block = MODULE.slice(at, at + 1400);
    expect(block).toContain('takeHomeChosen(lib.activities()).includes("decoding")');
    expect(block).toContain('!portableTtsSrcFor(decodingPrompt)');
    expect(block).toContain('resolveWordSoundsReplacement(decodingPrompt, selectedVoice, wordSoundsLanguage, callTTS');
    expect(block).toContain('} catch (_) { takeHomeWords = null; }');
    expect(block).toContain('const built = submit || takeHomeWords ? await takeHomeLesson(lib, submit, takeHomeWords) : check;');
  });
});
