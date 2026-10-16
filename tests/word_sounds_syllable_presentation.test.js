import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('word_sounds_module.js', 'utf8');
const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore;')()({ pronunciations: { lookup: () => [] } });
function between(startMarker, endMarker) {
  const start = source.indexOf(startMarker), end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error('Missing production boundary: ' + startMarker);
  return source.slice(start, end);
}
const fallbackSource = between('      const generateFallbackData =', '      React.useEffect');
const makeFallback = estimator => new Function('estimatePhonemesBasic', fallbackSource + '\nreturn generateFallbackData;')(estimator);
const asset = { mime: 'audio/wav', base64: (() => { const bytes = Buffer.alloc(80); bytes.write('RIFF'); bytes.write('WAVE', 8); return bytes.toString('base64'); })(), decoded: true, durationSeconds: 0.4 };
const audioContext = core.createSyllableCountAudioContext({ language: 'en', asset });
function preparedWord() {
  const count = core.createReviewedSyllableCount({ targetWord: 'quuxzz', language: 'en', count: 2, reviewed: true, revision: 3, audioContext });
  const recording = core.createReviewedSyllableTask({ targetWord: 'quuxzz', language: 'en', syllables: ['quux', 'zz'], assets: [asset, asset], reviewed: true, revision: 2 });
  return { word: 'quuxzz', phonemes: [], image: 'data:image/png;base64,test', _preparedActivities: ['syllable_counting'],
    activityItems: { syllable_counting: count, syllable_blending: recording }, _ttsAssets: { quuxzz: asset }, _ttsManifest: { revision: 7 } };
}
const resolveCount = item => core.resolveSyllableCount(item.word, { language: 'en', prepared: item.activityItems?.syllable_counting,
  recordedTask: item.activityItems?.syllable_blending, audioContext });

describe('prepared syllable presentation survives phoneme fallback', () => {
  it('fills missing phonemes without dropping or mutating reviewed boards, assets or metadata', () => {
    const original = preparedWord(), fallback = makeFallback(() => ['k', 's']);
    const repaired = fallback(original.word, original);
    expect(original.phonemes).toEqual([]);
    expect(repaired.phonemes).toEqual(['k', 's']);
    for (const key of ['activityItems', '_ttsAssets', '_ttsManifest', '_preparedActivities', 'image']) expect(repaired[key]).toBe(original[key]);
    expect(resolveCount(repaired)).toMatchObject({ supported: true, count: 2 });
    expect(fallback(original.word, repaired)).toBe(repaired);
  });

  it('never attaches another word’s review to a fallback target', () => {
    const repaired = makeFallback(word => word.split(''))('differentword', preparedWord());
    expect(repaired.word).toBe('differentword');
    expect(repaired.activityItems).toBeUndefined();
    expect(repaired._ttsAssets).toBeUndefined();
    expect(resolveCount(repaired).supported).toBe(false);
  });

  it.each([
    ['retryTargetWord', 'retryPreloaded', 'retryWord'],
    ['targetWord', 'preloadedWord', 'word'],
    ['targetWord', 'preloadedMatch', 'word'],
    ['target', 'refillPreloaded', 'retryWord'],
  ])('preserves the prepared item in the production %s/%s fallback path', (targetName, preloadName, queueName) => {
    const statement = source.match(new RegExp('const fallback = generateFallbackData\\(' + targetName + ', ' + preloadName + ' \\|\\| ' + queueName + '\\);'))?.[0];
    expect(statement).toBeTruthy();
    for (const usePreload of [true, false]) {
      const item = preparedWord();
      const repaired = new Function(targetName, preloadName, queueName, 'generateFallbackData', statement + '\nreturn fallback;')(
        item.word, usePreload ? item : null, usePreload ? { word: item.word } : item, makeFallback(() => ['k']),
      );
      expect(repaired.activityItems).toBe(item.activityItems);
      expect(repaired._ttsAssets).toBe(item._ttsAssets);
      expect(resolveCount(repaired)).toMatchObject({ supported: true, count: 2 });
    }
  });
});

describe('syllable prompt uses the correct unit', () => {
  const promptSource = between('      const renderPrompt =', '      const playSegmentationSequence =');
  const nodes = node => node && typeof node === 'object' ? [node, ...node.children.flat(Infinity).flatMap(nodes)] : [];
  const React = { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) };
  function render(activity) {
    const env = { React, wordSoundsActivity: activity, currentWordImage: 'cat.png', currentWordSoundsWord: 'cat',
      wordSoundsPhonemes: { word: 'cat', phonemes: ['k', 'a', 't'], phonemeCount: 3 },
      getEffectiveImageMode: () => 'alwaysOn', getEffectiveTextMode: () => 'off', showImageForCurrentWord: true, showWordText: false,
      isPlayingAudio: false, isProbeMode: false, ts: () => '', t: () => '', Volume2: 'volume-icon', Ear: 'ear-icon',
      handleAudio: vi.fn(), playBlending: vi.fn(), submissionLockRef: { current: false } };
    return new Function(...Object.keys(env), promptSource + '\nreturn renderPrompt();')(...Object.values(env));
  }
  const phonemeBoxes = tree => nodes(tree).filter(node => node.props.className === 'w-8 h-8 bg-slate-100 rounded-lg animate-pulse motion-reduce:animate-none');

  it.each(['syllable_counting', 'syllable_blending', 'counting'])('does not show phoneme-number boxes in %s', activity => {
    const tree = render(activity);
    expect(nodes(tree).some(node => node.type === 'img')).toBe(true);
    expect(phonemeBoxes(tree)).toHaveLength(0);
  });

  it('keeps the existing phoneme support for segmentation', () => {
    expect(phonemeBoxes(render('segmentation'))).toHaveLength(3);
  });
});
