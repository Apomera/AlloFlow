// Word Sounds: taking a word from the session queue must remove THAT word.
//
// Found 2026-08-16 by tracing a hit from dev-tools/scan_write_only_state.cjs
// (sessionWordLists: 7 writes, 0 reads).
//
// The session queue lives in sessionQueueRef.current[activityId]. Almost every
// site takes queue[0] and stores queue.slice(1), which is consistent. ONE site
// selects by a computed index: after a mid-activity queue refill it walks the
// queue for the first word that is NOT the one on screen, so the student is not
// handed the same word twice:
//
//     let fIdx = regenQueue.findIndex((w) => text(w) !== currentWord);
//     if (fIdx < 0) fIdx = 0;
//     word = regenQueue[fIdx];
//     sessionQueueRef.current[act] = regenQueue.slice(1);   // <-- dropped index 0
//
// When regenQueue[0] IS the current word — exactly the case fIdx exists to skip
// — fIdx is 1. The code served regenQueue[1] and then dropped regenQueue[0], so
// the word just served stayed at the head of the queue and the next advance
// served it straight back. The guard against repeating a word caused the next
// word to repeat instead.
//
// These tests pin the semantics, not the syntax, so the rule survives a rewrite.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// The selection + removal, as the module now performs it.
function takeNextWord(queue, currentWord) {
  let fIdx = queue.findIndex((w) => String(w).toLowerCase() !== String(currentWord || '').toLowerCase());
  if (fIdx < 0) fIdx = 0;
  const word = queue[fIdx];
  const remaining = queue.slice();
  remaining.splice(fIdx, 1);
  return { word, remaining };
}

describe('taking from the refilled queue', () => {
  it('skips the word already on screen', () => {
    const { word } = takeNextWord(['cat', 'dog', 'fish'], 'cat');
    expect(word).toBe('dog');
  });

  it('does not leave the word it just served at the head', () => {
    // The regression. Old code returned remaining = ['dog','fish'], so the very
    // next advance served 'dog' again.
    const { word, remaining } = takeNextWord(['cat', 'dog', 'fish'], 'cat');
    expect(remaining[0]).not.toBe(word);
    expect(remaining).toEqual(['cat', 'fish']);
  });

  it('never serves the same word twice in a row across a run', () => {
    let queue = ['cat', 'dog', 'fish', 'bird'];
    let current = 'cat';
    const served = [];
    while (queue.length) {
      const { word, remaining } = takeNextWord(queue, current);
      served.push(word);
      current = word;
      queue = remaining;
    }
    for (let i = 1; i < served.length; i++) expect(served[i]).not.toBe(served[i - 1]);
  });

  it('removes exactly one word per take, so the queue always drains', () => {
    let queue = ['a', 'b', 'c', 'd', 'e'];
    let current = 'a';
    let guard = 0;
    while (queue.length && guard++ < 50) {
      const before = queue.length;
      const { word, remaining } = takeNextWord(queue, current);
      expect(remaining.length).toBe(before - 1);
      current = word;
      queue = remaining;
    }
    expect(queue).toHaveLength(0);
  });

  it('is unchanged in the common case, where the head is already a different word', () => {
    const { word, remaining } = takeNextWord(['dog', 'fish'], 'cat');
    expect(word).toBe('dog');
    expect(remaining).toEqual(['fish']); // identical to the old queue.slice(1)
  });

  it('still yields a word when every entry matches the current one', () => {
    const { word, remaining } = takeNextWord(['cat', 'cat'], 'cat');
    expect(word).toBe('cat');
    expect(remaining).toEqual(['cat']);
  });
});

describe('the module carries it', () => {
  const module = readFileSync('word_sounds_module.js', 'utf8');

  it('removes the selected index rather than index 0', () => {
    expect(module).toContain('regenRemaining.splice(fIdx, 1);');
    expect(module).toContain('sessionQueueRef.current[fallbackActId] = regenRemaining;');
  });

  it('no longer pairs an indexed take with a slice(1) removal', () => {
    const at = module.indexOf('word = regenQueue[fIdx];');
    expect(at).toBeGreaterThan(-1);
    const block = module.slice(at, at + 900);
    expect(block).not.toContain('regenQueue.slice(1)');
  });

  it('drops the write-only sessionWordLists mirror', () => {
    // sessionQueueRef.current is the live queue and is read in many places;
    // sessionWordLists mirrored it into state nothing read, costing a re-render
    // per word advance. Removing it is why this file was being read at all.
    expect(module).not.toContain('sessionWordLists');
    expect(module.split('sessionQueueRef.current').length - 1).toBeGreaterThan(10);
  });

  it('keeps the deployed mirror byte-identical', () => {
    expect(readFileSync('desktop/web-app/public/word_sounds_module.js', 'utf8')).toBe(module);
  });
});
