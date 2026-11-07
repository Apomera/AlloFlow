// AI Literacy Lab: the teaching tokenizer froze the whole browser tab.
//
// pseudoTokenize read a run of [A-Za-z0-9'] and then `if (!word) continue`,
// without moving forward. Any other character looped forever. That included the
// tool's own Code, URL and Emoji sample buttons, and any accented name, such as
// the ones the tool's classroom activity asks students to type.
//
// vm's timeout makes the old loop a failure here, not a hung test run.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const SRC_PATH = process.env.LLM_TOKENIZER_SRC || path.join(process.cwd(), 'stem_lab', 'stem_tool_llm_literacy.js');
const SRC = fs.readFileSync(SRC_PATH, 'utf8');

function run(text) {
  const pre = SRC.slice(SRC.indexOf('var COMMON_WORDS'), SRC.indexOf('function pseudoTokenize'));
  const a = SRC.indexOf('function pseudoTokenize(');
  const b = SRC.indexOf('\n  }', a);
  const script = pre + SRC.slice(a, b + 4) + '\nJSON.stringify(pseudoTokenize(INPUT));';
  return JSON.parse(vm.runInNewContext(script, { INPUT: text }, { timeout: 1500 }));
}
const pieces = (s) => run(s).filter((t) => t.kind !== 'space').map((t) => t.tok);

describe('it finishes on anything a student can type', () => {
  // The tool's own sample buttons, then the characters that were reported.
  const INPUTS = [
    'function hello(name) {\n  return "Hi, " + name + "!";\n}',
    'https://www.example.com/path/to/resource?id=42&view=full',
    'I had pizza 🍕 and ice cream 🍨 at the park 🏞️ today!',
    '{', 'a+b', 'café', '100%', '#tag', '@you', 'a_b', '$5', '\\', '<>', '~`^|=*',
    '你好', 'مرحبا', 'привет',
    '​', '\uD83D', '\uDC00', '️', 'é', '́',
  ];

  it.each(INPUTS)('tokenizes %j', (s) => {
    const toks = run(s);
    expect(toks.length).toBeGreaterThan(0);
  });

  it('loses no character: the tokens add back up to the input', () => {
    for (const s of INPUTS) {
      // Space tokens are shown as visible symbols, so compare without them.
      const joined = run(s).filter((t) => t.kind !== 'space').map((t) => t.tok).join('');
      expect(joined, JSON.stringify(s)).toBe(s.replace(/[ \n\t]/g, ''));
    }
  });
});

describe('names and words outside ASCII get the same treatment', () => {
  // The widget's point is that it does not treat some names as worse than
  // others, so an accented name must stay whole just as Rodriguez does.
  it.each(['José', 'Zoë', 'Nguyễn', 'Björk', 'Émilie', 'Óscar', 'François', 'José'])('keeps %s as one token', (name) => {
    expect(pieces(name)).toEqual([name]);
  });

  it('a capital accented first letter is a proper noun too, so affix rules leave it alone', () => {
    // "Émilie" and "Ángeling" must not be split like lower-case English words.
    expect(pieces('Ángeling')).toEqual(['Ángeling']);
  });

  it('keeps a word in another script whole', () => {
    expect(pieces('привет')).toEqual(['привет']);
    expect(pieces('你好')).toEqual(['你好']);
  });

  it('keeps an emoji as one token, not two broken halves', () => {
    expect(pieces('🍕')).toEqual(['🍕']);
    expect(pieces('🏞️')).toEqual(['🏞️']);
  });

  it('shows a symbol as its own token, in a kind the legend explains', () => {
    const t = run('a+b');
    expect(t.map((x) => x.tok)).toEqual(['a', '+', 'b']);
    expect(t[1].kind).toBe('punct');
  });

  it('ordinary English still splits as before', () => {
    expect(pieces('unhappy')).toEqual(['un', 'happy']);
    expect(pieces("it's")).toEqual(["it's"]);
  });
});
