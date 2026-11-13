// 2026-11-13: in the app's Finish the Sentence and Read the Story, a name keeps its capital when it fills the blank
// ("I saw Sam at the park."), as the take-home files already do. The chips stay lowercase: they are the board's
// lowercase keys, so no capital gives the answer away.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync('word_sounds_module.js', 'utf8');
const start = src.indexOf('      const wsNameAsWritten = (text, word) => {');
const end = src.indexOf('\n      };', start) + '\n      };'.length;
const nameAsWritten = new Function(src.slice(start, end) + '\nreturn wsNameAsWritten;')();

describe('a name keeps its capital in a filled blank', () => {
  it('finds a capital in mid-sentence, and nothing else', () => {
    expect(nameAsWritten('I saw Sam at the park.', 'sam')).toBe('Sam');
    expect(nameAsWritten('Look, Sam!', 'sam')).toBe('Sam');
    expect(nameAsWritten('Sam ran fast.', 'sam')).toBe('');        // sentence start: the old rule capitalizes it
    expect(nameAsWritten('We met. Sam waved.', 'sam')).toBe('');   // a new sentence, the same
    expect(nameAsWritten('The cat sat on a mat.', 'cat')).toBe(''); // a lowercase word stays as it was
    expect(nameAsWritten('', 'sam')).toBe('');
    expect(nameAsWritten('I saw Sam.', '')).toBe('');
  });
  it('is used by both blanks, and the chips stay lowercase', () => {
    expect(src).toContain('rsSolved ? (wsNameAsWritten(rsBoard.sentence, rsWord) || ');
    expect(src).toContain('rpSolved ? ((!capitalize && wsNameAsWritten(rpBoard && rpBoard.story, rpWord)) || ');
    expect((src.match(/text-slate-800 lowercase hover:border-violet-400/g) || []).length).toBe(2);
  });
  it('is the same in every copy of the module', () => {
    for (const copy of ['desktop/web-app/public/word_sounds_module.js', 'desktop/app-build/word_sounds_module.js', 'desktop/web-app/build/word_sounds_module.js']) {
      expect(readFileSync(copy, 'utf8') === src, copy).toBe(true);
    }
  });
});
