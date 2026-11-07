// A class report's "last practiced" has to find a sound's history rows by the
// same key its mastery row uses. Rows now carry those keys; rows saved earlier
// are still read the old way, because they sit beside mastery keys of that era.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const analytics = readFileSync('student_analytics_module.js', 'utf8');
const between = (source, start, end) => {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error(`Missing source boundary: ${start} / ${end}`);
  return source.slice(from, to);
};
const { _acWordSoundsResults } = new Function(
  'const _acWsSoundMastered = () => false;\n' +
  between(analytics, 'function _acLocalDate(', '// One row per student x sound') +
  between(analytics, 'function _acWordSoundsResults(', '\n  function ', ) +
  '\n;return { _acWordSoundsResults };',
)();
const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + ';return createWordSoundsCore();')();

const results = (mastery, history) => _acWordSoundsResults([{ name: 'A', nickname: 'A', data: { wordSoundsState: { phonemeMastery: mastery, history } } }]);
const rowFor = (out, sound) => out.rows.find((r) => r.sound === sound);
const CAT = [{ ipa: 'k', grapheme: 'c' }, { ipa: 'æ', grapheme: 'a' }, { ipa: 't', grapheme: 't' }];
const STAMP = new Date(2026, 10, 3, 12).getTime();

describe('matching history to the sound a report shows', () => {
  it('finds a sound-keyed mastery row through the labels a new history row carries', () => {
    const labels = core.phonemeLabels(CAT);
    expect(labels).toContain('k');
    expect(labels).not.toContain('c');
    const out = results({ k: { total: 3, correct: 3 } }, [{ timestamp: STAMP, phonemes: CAT, soundLabels: labels }]);
    expect(rowFor(out, 'k').lastPracticed).toBe('2026-11-03');
  });

  it('still dates a spelling-keyed mastery row from an older history row', () => {
    const out = results({ c: { total: 3, correct: 3 } }, [{ timestamp: STAMP, phonemes: CAT }]);
    expect(rowFor(out, 'c').lastPracticed).toBe('2026-11-03');
  });
});
