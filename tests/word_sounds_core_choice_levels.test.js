// Core logic behind the 2026-11-09 answer-card pass: rhyme foils by difficulty,
// difficulty hysteresis + the "more support" signal, and the small helpers that
// pick how many choices, which numbers and which sound position a level gets.
// Every new parameter is optional: the pins below are the results of the core
// as it was before this pass (sha256 of the JSON, taken from the old file).
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { core } from './helpers/word_sounds_core.js';

const P = { cat: ['k', 'a', 't'], hat: ['h', 'a', 't'], dog: ['d', 'o', 'g'], log: ['l', 'o', 'g'], sun: ['s', 'u', 'n'], fun: ['f', 'u', 'n'], pig: ['p', 'i', 'g'], big: ['b', 'i', 'g'], bed: ['b', 'e', 'd'], red: ['r', 'e', 'd'], map: ['m', 'a', 'p'], cap: ['k', 'a', 'p'], can: ['k', 'a', 'n'], cot: ['k', 'o', 't'], cut: ['k', 'u', 't'], ship: ['sh', 'i', 'p'], fish: ['f', 'i', 'sh'] };
const pool = [...Object.entries(P).map(([word, phonemes]) => ({ word, phonemes })), ...core.knownWords];
const pairs = [['cat', 'hat'], ['dog', 'log'], ['sun', 'fun'], ['pig', 'big'], ['bed', 'red'], ['map', 'cap'], ['hat', 'cat']];
const sha = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const board = (word, answer, extra = {}) => core.buildRhymeBoard({ word, answer, phonemes: P[word], answerPhonemes: P[answer], pool, ...extra });
const foils = (b) => b.options.filter((option) => option !== b.answer);
const vowel = (word) => (P[word] ? P[word].find((s) => 'aeiou'.includes(s)) : (word.match(/[aeiouy]+/) || [''])[0]);
const words = ['cat', 'dog', 'sun', 'pig', 'map', 'bed', 'hat', 'log'];
const row = (word, correct, difficulty, attempts = 1) => ({ activity: 'blending', word, correct, attempts, difficulty });

describe('results without the new parameters are byte-identical to before', () => {
  it('buildRhymeBoard and buildSessionRhymeBoard', () => {
    const boards = [];
    for (const [word, answer] of pairs) for (const count of [undefined, 2, 3, 5]) for (const distractors of [[], ['dog', 'sun', 'bed', 'leg', 'cup']]) {
      boards.push(core.buildRhymeBoard({ word, answer, phonemes: P[word], answerPhonemes: P[answer], pool, distractors, ...(count ? { count } : {}) }));
    }
    const session = core.createRhymeSession();
    for (let i = 0; i < 6; i++) boards.push(core.buildSessionRhymeBoard({ session, occurrenceId: 'cat' + i, word: 'cat', answer: 'hat', phonemes: P.cat, answerPhonemes: P.hat, pool }));
    expect(boards.length).toBe(62);
    expect(boards[0]).toEqual({ answer: 'hat', options: ['cap', 'cup', 'cab', 'hat', 'can'], pronunciations: { targetWord: 'cat', answer: 'hat', targetPhonemes: ['k', 'a', 't'], answerPhonemes: ['h', 'a', 't'] } });
    expect(sha(boards)).toBe('880f43c0111796a78a2665d29a6f423f0a6d42395e6947095f7a8a5cff6d8582');
  });
  it('difficultyDecision', () => {
    const decisions = [];
    let seed = 7; const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (const rate of [1, 0.9, 0.6, 0.33, 0]) {
      let hist = [], band = 'easy';
      for (let i = 0; i < 80; i++) {
        hist.push({ activity: 'blending', word: words[i % 8], correct: rnd() < (band === 'easy' ? Math.max(rate, 0.95 * (rate > 0)) : rate), attempts: 1 + (i % 5 === 0), difficulty: band });
        const d = core.difficultyDecision(hist, 'blending');
        decisions.push(d); band = d.difficulty;
      }
      decisions.push(core.difficultyDecision(hist, 'blending', { mode: 'sound_only' }), core.difficultyDecision(hist, 'blending', { aacAssisted: true }), core.difficultyDecision(hist, 'counting'));
    }
    expect(decisions.length).toBe(415);
    expect(new Set(decisions.map((d) => d.reason)), 'the matrix reaches every old branch').toEqual(new Set(['starting', 'practice', 'advance', 'step_back']));
    expect(decisions.every((d) => Object.keys(d).join() === 'difficulty,reason,items,distinctWords,changes')).toBe(true);
    expect(sha(decisions)).toBe('f1aa5a240c1321ae62d4e27242ce5ad3ef4752cfd0694ea1e5b64e3a81db97d7');
  });
  it("difficulty 'hard' is the same board as no difficulty", () => {
    for (const [word, answer] of pairs) expect(board(word, answer, { difficulty: 'hard' })).toEqual(board(word, answer));
  });
});

describe('rhyme foils by difficulty', () => {
  it('today (and hard) prefers near foils: same onset and vowel as the target', () => {
    expect(foils(board('cat', 'hat'))).toEqual(['cap', 'cup', 'cab', 'can']);
  });
  it('easy keeps only clearly different words: another vowel and another final sound', () => {
    for (const [word, answer] of pairs) {
      const b = board(word, answer, { difficulty: 'easy', count: 2 });
      expect(b.answer).toBe(answer);
      expect(b.options).toContain(answer);
      expect(foils(b).length, word).toBe(2);
      for (const foil of foils(b)) {
        expect(vowel(foil), `${word}: ${foil} shares the vowel`).not.toBe(vowel(word));
        expect(core.edgeSound(foil, 'last', P[foil]), `${word}: ${foil} shares the final sound`).not.toBe(core.edgeSound(word, 'last', P[word]));
        expect(foil.slice(-1)).not.toBe(word.slice(-1));
      }
    }
  });
  it('medium has one near foil at most', () => {
    for (const [word, answer] of pairs) {
      const b = board(word, answer, { difficulty: 'medium', count: 3 });
      expect(foils(b).length, word).toBe(3);
      const near = foils(b).filter((foil) => vowel(foil) === vowel(word) || foil.slice(-1) === word.slice(-1) ||
        core.edgeSound(foil, 'last', P[foil]) === core.edgeSound(word, 'last', P[word]));
      expect(near.length, `${word}: ${foils(b)}`).toBeLessThanOrEqual(1);
    }
  });
  it('no level offers a second rhyme, or the target, as a foil', () => {
    for (const difficulty of ['easy', 'medium', 'hard', undefined]) for (const [word, answer] of pairs) {
      const b = board(word, answer, { difficulty, distractors: ['bat', 'mat', 'fog', 'bun', 'wig', 'fed', 'tap', 'one'] });
      for (const foil of foils(b)) {
        expect(foil).not.toBe(word);
        expect(core.rhymePairStatus({ word, answer: foil, phonemes: P[word], pool }).rhymes, `${word}/${foil}`).not.toBe(true);
      }
      expect(new Set(b.options).size).toBe(b.options.length);
    }
  });
  it('a saved board is returned as saved at every level', () => {
    const prepared = { answer: 'hat', options: ['hat', 'dog', 'sun', 'bed'] };
    for (const difficulty of ['easy', 'medium', 'hard']) {
      expect(core.buildRhymeBoard({ word: 'cat', answer: 'hat', phonemes: P.cat, answerPhonemes: P.hat, pool, prepared, difficulty, count: 2 }).options).toEqual(prepared.options);
    }
  });
  it('a session does not hand an easy board back when the level changes', () => {
    const session = core.createRhymeSession();
    const args = { session, occurrenceId: 'one', word: 'cat', answer: 'hat', phonemes: P.cat, answerPhonemes: P.hat, pool };
    const easy = core.buildSessionRhymeBoard({ ...args, difficulty: 'easy', count: 2 });
    expect(core.buildSessionRhymeBoard({ ...args, difficulty: 'easy', count: 2 })).toEqual(easy);
    expect(core.buildSessionRhymeBoard(args).options.length).toBe(5);
  });
});

describe('difficulty hysteresis and the support signal (opt-in)', () => {
  const play = (hysteresis, items = 90) => {
    let hist = [], band = 'easy'; const changes = [];
    for (let i = 0; i < items; i++) {
      hist.push(row(words[i % 8], band === 'easy' ? true : i % 3 === 0, band));
      const next = core.difficultyDecision(hist, 'blending', hysteresis ? { hysteresis: true } : {});
      if (next.difficulty !== band) { changes.push((i + 1) + ':' + next.difficulty); band = next.difficulty; }
    }
    return { changes, last: core.difficultyDecision(hist, 'blending', hysteresis ? { hysteresis: true } : {}) };
  };
  it('without it, perfect on easy and a third on medium flips every six items', () => {
    expect(play(false).changes.slice(0, 6)).toEqual(['6:medium', '12:easy', '18:medium', '24:easy', '30:medium', '36:easy']);
  });
  it('with it, each step back makes the way up longer', () => {
    // First climb: one window. After one step back: two windows. After two: three.
    expect(play(true).changes).toEqual(['6:medium', '12:easy', '24:medium', '30:easy', '48:medium', '54:easy', '72:medium', '78:easy']);
  });
  it('reports the held windows and keeps every old field', () => {
    const hist = [...words.slice(0, 6).map((w) => row(w, true, 'easy')), ...words.slice(0, 6).map((w) => row(w, false, 'medium')), ...words.slice(0, 6).map((w) => row(w, true, 'easy'))];
    const held = core.difficultyDecision(hist, 'blending', { hysteresis: true });
    expect(held).toMatchObject({ difficulty: 'easy', reason: 'holding', changes: 2, windowsHeld: 1, windowsNeeded: 2, support: 'none' });
    expect(core.difficultyDecision(hist, 'blending').difficulty, 'the old rule would already be back on medium').toBe('medium');
    // The second window has to qualify too; a weak one starts the count again.
    const weak = [...hist, ...words.slice(0, 6).map((w, i) => row(w, i < 3, 'easy'))];
    expect(core.difficultyDecision(weak, 'blending', { hysteresis: true })).toMatchObject({ difficulty: 'easy', windowsHeld: 0 });
    const strong = [...hist, ...words.slice(0, 6).map((w) => row(w, true, 'easy'))];
    expect(core.difficultyDecision(strong, 'blending', { hysteresis: true })).toMatchObject({ difficulty: 'medium', reason: 'advance', changes: 3 });
  });
  it('a first climb is not slowed', () => {
    const hist = words.slice(0, 6).map((w) => row(w, true, 'easy'));
    expect(core.difficultyDecision(hist, 'blending', { hysteresis: true })).toMatchObject({ difficulty: 'medium', reason: 'advance', windowsNeeded: 1 });
  });
  it("signals support:'more' on the lowest band under 40% over six or more items", () => {
    const misses = (n) => Array.from({ length: n }, (_, i) => row(words[i % 8], false, 'easy'));
    expect(core.difficultyDecision(misses(20), 'blending', { hysteresis: true })).toMatchObject({ difficulty: 'easy', support: 'more' });
    expect(core.difficultyDecision(misses(5), 'blending', { hysteresis: true }).support, 'five items are not enough').toBe('none');
    const half = Array.from({ length: 10 }, (_, i) => row(words[i % 8], i % 2 === 0, 'easy'));
    expect(core.difficultyDecision(half, 'blending', { hysteresis: true }).support).toBe('none');
    // Right only on the retry counts half: four of ten such answers is 20%.
    const retries = Array.from({ length: 10 }, (_, i) => row(words[i % 8], i < 4, 'easy', 2));
    expect(core.difficultyDecision(retries, 'blending', { hysteresis: true }).support).toBe('more');
    expect('support' in core.difficultyDecision(misses(20), 'blending')).toBe(false);
  });
  it('gives no support signal above the lowest band', () => {
    const hist = [...words.slice(0, 6).map((w) => row(w, true, 'easy')), ...words.slice(0, 5).map((w) => row(w, false, 'medium'))];
    expect(core.difficultyDecision(hist, 'blending', { hysteresis: true })).toMatchObject({ difficulty: 'medium', support: 'none' });
  });
});

describe('choices a level gets', () => {
  it('choiceLimit: easy 3, medium 4, hard as built, 2 with more support on easy', () => {
    expect([core.choiceLimit('easy', 6), core.choiceLimit('medium', 6), core.choiceLimit('hard', 6), core.choiceLimit(undefined, 5), core.choiceLimit('sequential', 6)]).toEqual([3, 4, 6, 5, 6]);
    expect(core.choiceLimit('easy', 6, 'more')).toBe(2);
    expect(core.choiceLimit('medium', 6, 'more')).toBe(4);
    expect(core.choiceLimit('easy', 2)).toBe(2);
  });
  it('trimChoices keeps the answer, the order and the clearly different foils', () => {
    const sounds = ['b', 'k', 't', 's', 'c', 'm'];
    const same = (a, b) => core.soundKey(a) === core.soundKey(b) || (['c', 'k'].includes(a) && ['c', 'k'].includes(b));
    const easy = core.trimChoices({ options: sounds, answer: 'k', count: 3, difficulty: 'easy', same, closeness: core.soundCloseness });
    expect(easy).toEqual(['b', 'k', 's']); // /t/ is a neighbour of /k/, "c" is the same sound
    expect(sounds, 'the board itself is not changed').toEqual(['b', 'k', 't', 's', 'c', 'm']);
    const medium = core.trimChoices({ options: ['cap', 'dog', 'cat', 'can', 'sun', 'mat'], answer: 'cat', count: 4, difficulty: 'medium', closeness: core.wordCloseness });
    expect(medium).toContain('cat');
    expect(medium.length).toBe(4);
    expect(medium).toEqual(['dog', 'cat', 'sun', 'mat']);
    expect(medium.filter((w) => w !== 'cat' && core.wordCloseness(w, 'cat') >= 3), 'one near foil').toEqual(['mat']);
    expect(core.trimChoices({ options: ['cap', 'dog', 'cat', 'can', 'sun', 'mat'], answer: 'cat', count: 3, difficulty: 'easy', closeness: core.wordCloseness })).toEqual(['dog', 'cat', 'sun']);
  });
  it('trimChoices leaves a board alone when it fits, has no count, or has no answer on it', () => {
    const options = ['cap', 'dog', 'cat'];
    expect(core.trimChoices({ options, answer: 'cat', count: 6 })).toEqual(options);
    expect(core.trimChoices({ options, answer: 'cat' })).toEqual(options);
    expect(core.trimChoices({ options, answer: 'zebra', count: 2 })).toEqual(options);
    expect(core.trimChoices({ options, answer: 'cat', count: 2 })).toEqual(['cap', 'cat']);
    expect(core.trimChoices()).toEqual([]);
  });
  it('for every size and level the answer survives a trim', () => {
    const options = ['k', 'a', 't', 'm', 's', 'b'];
    for (const answer of options) for (const difficulty of ['easy', 'medium', 'hard']) for (const support of ['none', 'more']) {
      const count = core.choiceLimit(difficulty, options.length, support);
      const shown = core.trimChoices({ options, answer, count, difficulty, closeness: core.soundCloseness });
      expect(shown).toContain(answer);
      expect(shown.length).toBe(count);
      expect(shown).toEqual(options.filter((option) => shown.includes(option)));
    }
  });
  it('countingChoices: easy is the count with two either side inside 1-6, medium 1-8, hard the full row', () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => core.countingChoices(n, 'easy'))).toEqual([[1, 2, 3], [1, 2, 3, 4], [1, 2, 3, 4, 5], [2, 3, 4, 5, 6], [3, 4, 5, 6], [4, 5, 6]]);
    for (let n = 1; n <= 10; n++) {
      const easy = core.countingChoices(n, 'easy');
      expect(easy, 'never without the answer').toContain(n);
      expect(easy.length).toBeGreaterThanOrEqual(3);
      expect(easy).toEqual([...easy].sort((a, b) => a - b));
    }
    expect(core.countingChoices(3, 'medium')).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(core.countingChoices(9, 'medium'), 'a count past 8 needs the full row').toBeNull();
    expect(core.countingChoices(3, 'hard')).toBeNull();
    expect(core.countingChoices(3)).toBeNull();
    expect(core.countingChoices(11, 'easy')).toBeNull();
    expect(core.countingChoices(0, 'easy')).toBeNull();
  });
  it('isolationPositions: easy first, medium first or last, otherwise any', () => {
    expect(core.isolationPositions('easy', 4)).toEqual([0]);
    expect(core.isolationPositions('medium', 4)).toEqual([0, 3]);
    expect(core.isolationPositions('medium', 1)).toEqual([0]);
    expect(core.isolationPositions('hard', 4)).toEqual([0, 1, 2, 3]);
    expect(core.isolationPositions(undefined, 0)).toEqual([0]);
  });
});
