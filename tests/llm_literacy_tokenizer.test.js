// AI Literacy Lab — the teaching tokenizer.
//
// The affix rules were the only thing that could split a word, and they fired
// on any accidental substring match. So the widget produced splits that are
// not morphology at all — Emily became Emi|ly, Christopher became Christoph|er,
// Xiaoming became Xiaom|ing — while Nguyen, Oyelaran, Krzyzewski and Rodriguez
// each came out as a single clean token.
//
// That mattered beyond tidiness, because the tool prescribes a classroom
// activity built on this widget: "names of students from non-English-speaking
// backgrounds often tokenize worse — open a conversation about whose language
// the model was trained on." Run in the room, it demonstrated the reverse of
// its own point, in front of the students it was meant to be about.
//
// A letter-pattern rarity model was tried as a fix and REJECTED: it scored
// Rodriguez, Adeyemi and Oyelaran as maximally English, because they are built
// from ordinary English letter pairs. Real BPE splits on training-corpus
// frequency, which spelling cannot recover. So the widget now does the honest
// thing — real morphology on ordinary words, one token for proper nouns — and
// says in the UI that it is not a real token count. These tests hold that
// line, including the part where it declines to guess.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = fs.readFileSync(path.join(process.cwd(), 'stem_lab', 'stem_tool_llm_literacy.js'), 'utf8');

/** Run the shipped tokenizer, not a copy of it. */
const tokenize = (() => {
  const pre = SRC.slice(SRC.indexOf('var COMMON_WORDS'), SRC.indexOf('function pseudoTokenize'));
  const a = SRC.indexOf('function pseudoTokenize(');
  expect(a, 'pseudoTokenize not found').toBeGreaterThan(-1);
  const b = SRC.indexOf('\n  }', a);
  return new Function(pre + SRC.slice(a, b + 4) + '\nreturn pseudoTokenize;')();
})();

const pieces = (s) => tokenize(s).filter((t) => t.kind !== 'space').map((t) => t.tok);

describe('it does not invent morphology that is not there', () => {
  // Each of these was a real split the widget produced.
  const REGRESSIONS = [
    ['Emily', 'Emi|ly'],
    ['Christopher', 'Christoph|er'],
    ['Xiaoming', 'Xiaom|ing'],
  ];

  it.each(REGRESSIONS)('keeps %s whole (was %s)', (name) => {
    expect(pieces(name)).toEqual([name]);
  });

  it('treats capitalised non-dictionary words as proper nouns', () => {
    for (const n of ['Sarah', 'Smith', 'Johnson', 'Nguyen', 'Krzyzewski', 'Rodriguez', 'Adeyemi', 'Siddharth']) {
      expect(pieces(n), n + ' should be one token').toEqual([n]);
    }
  });

  it('does not quietly advantage one group of names over another', () => {
    // The specific harm: the old widget split common Anglo names and left
    // others whole, so a class comparing token counts drew a false — and
    // pointed — conclusion. Whatever the rule is, it must land the same way
    // on both groups.
    const anglo = ['Emily', 'Michael', 'Sarah', 'Christopher', 'Smith', 'Jessica'];
    const other = ['Nguyen', 'Oyelaran', 'Krzyzewski', 'Rodriguez', 'Adeyemi', 'Aaliyah'];
    const count = (n) => pieces(n).length;
    const avg = (xs) => xs.reduce((a, b) => a + count(b), 0) / xs.length;
    expect(avg(anglo)).toBe(avg(other));
  });
});

describe('real morphology still works', () => {
  it('splits genuine affixes on ordinary lower-case words', () => {
    expect(pieces('unhappiness')).toEqual(['un', 'happi', 'ness']);
    expect(pieces('rethinking')).toEqual(['re', 'think', 'ing']);
    expect(pieces('disagreement')).toEqual(['dis', 'agree', 'ment']);
  });

  it('leaves short and common words alone', () => {
    expect(pieces('the quick brown fox')).toEqual(['the', 'quick', 'brown', 'fox']);
  });

  it('still separates punctuation and marks spaces', () => {
    const all = tokenize('Hi, there!');
    expect(all.some((t) => t.kind === 'punct' && t.tok === ',')).toBe(true);
    expect(all.some((t) => t.kind === 'space')).toBe(true);
  });

  it('produces a token for every character of input', () => {
    // Nothing may be silently dropped — a chunking bug would show up here.
    for (const s of ['unhappiness', 'The cat sat on the mat.', 'Krzyzewski', 'pre-processing']) {
      expect(tokenize(s).map((t) => t.tok).join('').replace(/[␣⏎]/g, ' '), s).toBe(s);
    }
  });
});

describe('it tells the truth about what it is', () => {
  it('carries the approximation notice in the UI, not just in a comment', () => {
    expect(SRC).toMatch(/This is an approximation\./);
    expect(SRC).toMatch(/not real token counts/i);
    expect(SRC).toMatch(/do not read anything into how your own name comes out here/i);
  });

  it('declines to model rarity rather than faking it', () => {
    // If someone reintroduces a spelling-based rarity score, the widget goes
    // back to making claims it cannot support.
    expect(SRC).not.toMatch(/function englishness/);
    expect(SRC).not.toMatch(/rarityChunks/);
    expect(SRC).toMatch(/not recoverable from spelling/i);
  });

  it('no longer asks a class to compare their own names in this widget', () => {
    expect(SRC).not.toMatch(/Names of students from non-English-speaking backgrounds often tokenize worse/);
    expect(SRC).toMatch(/Do NOT try to show it in the tokenizer on this page/);
  });

  it('keeps the real inequity on the page, pointed at a real tokenizer', () => {
    // The lesson is true and worth teaching — it just cannot be demonstrated
    // here. Losing it entirely would be its own regression.
    expect(SRC).toMatch(/overwhelmingly English/);
    expect(SRC).toMatch(/two or three times as many tokens/);
    expect(SRC).toMatch(/live tokenizer tool/);
    expect(SRC, 'handle names with care').toMatch(/nobody should feel their name is being scored/i);
  });
});
