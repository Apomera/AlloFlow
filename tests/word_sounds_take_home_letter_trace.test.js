// Take-home Letter Trace (2026-11-07): the file can carry Letter Trace, recorded as practice ("traced" or
// "skipped"), never scored, and read back that way. A real-browser trace is in
// C:\tmp\release_2026-11-07\ws_present\trace_e2e.cjs (writes the file this test saves).
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore();')();
const loadLoader = () => { delete window.AlloWordSoundsTakeHome; new Function(readFileSync('word_sounds_take_home_loader.js', 'utf8'))(); return window.AlloWordSoundsTakeHome; };
const TH = loadLoader();
const wav = (tag) => { const b = Buffer.alloc(64); b.write('RIFF'); b.write('WAVE', 8); b.write(String(tag).slice(0, 8), 44); return b.toString('base64'); };
const word = (w, board) => ({ word: w, targetWord: w, term: w, _ttsAssets: { [w]: { mime: 'audio/wav', base64: wav(w) } }, activityItems: { letter_tracing: board } });
const BANKS = { instructions: { fb_great_job: 'data:audio/wav;base64,' + wav('gj'), fb_try_again_listen: 'data:audio/wav;base64,' + wav('ta') } };

describe('take-home Letter Trace', () => {
  it('is offered, uses the word\'s own first letter, and skips a board copied from another word', () => {
    const { lesson } = TH.lessonFromPack([word('cat', { letter: 'c' }), word('hat', { letter: 'c' }), word('sun', { letter: 's' })], { core, banks: BANKS, activities: ['letter_tracing'] });
    const items = lesson.blocks.flatMap((b) => b.items);
    expect(items.map((i) => i.letter)).toEqual(['c', 's']);
    mkdirSync('C:/tmp/release_2026-11-07/ws_present/trace', { recursive: true });
    writeFileSync('C:/tmp/release_2026-11-07/ws_present/trace/lesson.html', TH.buildHtml(lesson, { core }));
  });

  it('reads practice back as practice, never as right or wrong', () => {
    const file = { kind: 'alloflow-take-home-result', schemaVersion: 2, lessonId: 'L', items: [
      { activity: 'letter_tracing', word: 'cat', done: true, practice: 'traced' },
      { activity: 'letter_tracing', word: 'sun', done: true, practice: 'skipped' },
      { activity: 'isolation', word: 'map', done: true, firstTry: true, correct: true },
    ] };
    const { result } = TH.parseResult(file);
    expect(result.summary).toEqual({ items: 1, done: 1, firstTry: 1, afterRetry: 0, missed: 0, practised: 2 });
    expect(result.items.map((i) => i.practice)).toEqual(['traced', 'skipped', null]);
    expect(result.byActivity.letter_tracing).toEqual({ items: 0, done: 0, firstTry: 0, afterRetry: 0, missed: 0, practised: 2 });
  });

  it('a forged practice value is dropped', () => {
    const { result } = TH.parseResult({ kind: 'alloflow-take-home-result', schemaVersion: 2, lessonId: 'L', items: [{ activity: 'isolation', word: 'x', done: true, practice: '<b>pwned</b>' }] });
    expect(result.items[0].practice).toBeNull();
  });
});
