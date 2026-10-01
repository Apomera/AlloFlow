// Wave 9 of the answer-position-bias sweep (2026-08-25): sel_tool_social.
//
// Both body-language banks store the answer as a STRING id (`answer: 'closed'`,
// `answer: 'el_crossed'`) rather than an index, a schema neither catalog
// scanner could see until schema D was added. Once visible, 16 of 34 answers
// sat at slot A (16/9/6/3 = 47%) and NEITHER bank shuffles: BL_QUIZ and
// BL_READER_QUIZ both render `options` in declared order on every render, so
// "always pick the first option" scored 47% blind.
//
// Grading is by string (`opt === currentQuiz.answer` / `optId === blrQ.answer`),
// so the load-time rotation permutes `options` only - there is no answer index
// to remap, and that is exactly what makes this bank safe to rotate.
//
// Executes the SHIPPED banks + the SHIPPED IIFE: the existence of a rotation
// proves nothing on its own (the orphan-setter lesson).
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => fs.readFileSync(p, 'utf8');
const SRC = 'sel_hub/sel_tool_social.js';

function literal(src, decl) {
  const i = src.indexOf(decl);
  expect(i, decl).toBeGreaterThan(-1);
  const open = src.indexOf(decl.trim().endsWith('[') ? '[' : '{', i + decl.length - 1);
  let depth = 0;
  let q = null;
  let j = open;
  for (; j < src.length; j++) {
    const ch = src[j];
    if (q) {
      if (ch === '\\') { j++; continue; }
      if (ch === q) q = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') q = ch;
    else if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') { depth--; if (depth === 0) break; }
  }
  return src.slice(open, j + 1);
}

function evalBanks() {
  const src = read(SRC);
  const start = src.indexOf('  (function () {');
  expect(start).toBeGreaterThan(-1);
  const iife = src.slice(start, src.indexOf('})();', start) + 5);
  expect(iife).toContain('spread(BL_QUIZ);');
  expect(iife).toContain('BL_READER_QUIZ[band]');
  const run = new Function(
    'var BL_QUIZ = ' + literal(src, '  var BL_QUIZ = [') + ';\n'
    + 'var BL_READER_QUIZ = ' + literal(src, '  var BL_READER_QUIZ = {') + ';\n'
    + iife + '\n'
    + 'return [].concat(BL_QUIZ, ...Object.keys(BL_READER_QUIZ).map((b) => BL_READER_QUIZ[b]));',
  );
  return run();
}

describe('sel social body-language banks (string-answer schema)', () => {
  const bank = evalBanks();

  it('reaches both banks and keeps every answer present in its own options', () => {
    expect(bank.length).toBeGreaterThanOrEqual(30);
    for (const q of bank) {
      expect(Array.isArray(q.options), q.answer).toBe(true);
      expect(q.options, q.answer).toContain(q.answer);
    }
  });

  it('the authored 47%-at-A pile-up is gone: no slot above 33%, no dead slot', () => {
    const placed = [0, 0, 0, 0];
    let n = 0;
    for (const q of bank) {
      if (q.options.length !== 4) continue;
      placed[q.options.indexOf(q.answer)]++;
      n++;
    }
    expect(n).toBeGreaterThanOrEqual(30);
    expect(Math.max(...placed) / n, placed.join('/')).toBeLessThan(0.33);
    expect(placed.filter((c) => c === 0).length).toBe(0);
  });

  it('grading stays by answer TEXT, so no index needed remapping', () => {
    const src = read(SRC);
    expect(src).toContain('var correct = opt === currentQuiz.answer;');
    expect(src).toContain('var correct = optId === blrQ.answer;');
  });

  it('public mirror is byte-identical to the root copy', () => {
    expect(read('desktop/web-app/public/sel_hub/sel_tool_social.js')).toBe(read(SRC));
  });
});
