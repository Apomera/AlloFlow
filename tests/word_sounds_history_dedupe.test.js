import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const hostFiles = [
  ['main host', 'AlloFlowANTI.txt'],
  ['deploy host', 'desktop/web-app/src/AlloFlowANTI.txt'],
];

function loadWordSoundsHistoryUpdater(relativePath) {
  const source = readFileSync(resolve(process.cwd(), relativePath), 'utf8');
  const wordSoundsStart = source.indexOf('let _wsFingerprint');
  const updaterStart = source.indexOf('setHistory(prev => {', wordSoundsStart);
  const updaterEnd = source.indexOf('\n                   setWsPreloadedWords(words);', updaterStart);

  if (wordSoundsStart < 0 || updaterStart < 0 || updaterEnd < 0) {
    throw new Error(`Unable to extract Word Sounds history updater from ${relativePath}`);
  }

  const updaterStatement = source.slice(updaterStart, updaterEnd);
  return (setHistory, fingerprint, resource) => {
    new Function(
      'setHistory',
      '_wsFingerprint',
      'wordSoundsResource',
      updaterStatement,
    )(setHistory, fingerprint, resource);
  };
}

describe('Word Sounds resource history duplicate guard', () => {
  it.each(hostFiles)('%s atomically collapses two queued completions for the same pack', (_name, relativePath) => {
    const queueHistoryUpdate = loadWordSoundsHistoryUpdater(relativePath);
    const queuedUpdaters = [];
    const fingerprint = 'same-prepared-pack';
    const unrelated = { id: 'other', type: 'quiz' };
    const firstCompletion = { id: 'ws-first', type: 'word-sounds', _fingerprint: fingerprint, timestamp: 1 };
    const secondCompletion = { id: 'ws-second', type: 'word-sounds', _fingerprint: fingerprint, timestamp: 2 };

    // Both callbacks queue before React commits either state update, reproducing
    // the stale-render race that previously inserted two history entries.
    queueHistoryUpdate((updater) => queuedUpdaters.push(updater), fingerprint, firstCompletion);
    queueHistoryUpdate((updater) => queuedUpdaters.push(updater), fingerprint, secondCompletion);

    const finalHistory = queuedUpdaters.reduce((history, updater) => updater(history), [unrelated]);
    const matchingResources = finalHistory.filter(
      (resource) => resource.type === 'word-sounds' && resource._fingerprint === fingerprint,
    );

    expect(matchingResources).toEqual([secondCompletion]);
    expect(finalHistory).toHaveLength(2);
    expect(finalHistory).toContain(unrelated);
  });
});
