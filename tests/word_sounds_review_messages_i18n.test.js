import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('misc_components_source.jsx', 'utf8');
const between = (a, b) => source.slice(source.indexOf(a), source.indexOf(b, source.indexOf(a)));
function formatter(t) {
  return new Function('t', between('    const reviewText =', '    React.useEffect(() => {') + between('    const describeGapFix =', '    const runGapFixes =') + '\nreturn { reviewText, describeGapFix };')(t);
}
describe('live WordSounds review-message localization', () => {
  it('uses translated outcomes and passes exact counts to the translator', () => {
    const calls = [];
    const f = formatter((key, params) => { calls.push([key, params]); return ({ 'word_sounds.review_fix_fixed': 'Corriges : {{count}}', 'word_sounds.review_fix_unchanged': 'Inchanges : {count}', 'word_sounds.review_fix_retry': '{summary} Reessayez.' })[key] || key; });
    expect(f.describeGapFix({ fixed: 2, unchanged: 1, requested: 0, stalled: false })).toBe('Corriges : 2, Inchanges : 1. Reessayez.');
    expect(calls).toContainEqual(['word_sounds.review_fix_fixed', { count: 2 }]);
  });
  it.each([undefined, () => '', key => key])('keeps English outcomes for a missing translator/key', t => {
    const f = formatter(t);
    expect(f.describeGapFix({ fixed: 0, unchanged: 0, requested: 3, stalled: false })).toBe('audio requested for 3 (arrives in the background).');
    expect(f.describeGapFix({ fixed: 0, unchanged: 0, requested: 0, stalled: false })).toBe('Nothing to do.');
  });
  it('retains unchanged and stalled outcomes without claiming success', () => {
    const f = formatter(key => key);
    expect(f.describeGapFix({ fixed: 0, unchanged: 3, requested: 0, stalled: true })).toBe('3 unchanged. Stopped early after several words stayed unchanged. Try again later, or edit those words by hand.');
  });
  it('interpolates authored words literally and preserves unknown placeholders', () => {
    const f = formatter(() => '{{words}} / {count} / {unknown}');
    expect(f.reviewText('review_gap_unverified', '', { words: '$& {count}', count: 2 })).toBe('$& {count} / 2 / {unknown}');
  });
});
