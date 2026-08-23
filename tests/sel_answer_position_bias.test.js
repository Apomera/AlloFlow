// SEL Hub — a quiz whose answer is always in the same slot is not a quiz.
//
// `sel_tool_civicaction.js` shipped 24 questions authored with `answer: 1` —
// every single one. A student could score 100% by choosing the second option
// without reading a word. `community` sat at 62% and `selfadvocacy` at 58%.
//
// dev-tools/scan_answer_position_bias.cjs is STATIC: it reads the authored
// literals, so a module-level rotation satisfies it without the tester ever
// seeing the distribution a student actually meets. This suite instead
// EXECUTES each bank together with its de-biasing block and measures the real
// post-rotation spread.
//
// True/False items are excluded on purpose: rotating two options does not
// change a 50/50 guess and only breaks the convention that True comes first.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');

// Find a `var NAME = ...` declaration and the balanced literal that follows it.
function declaration(src, decl) {
  const i = src.indexOf(decl);
  if (i < 0) return null;
  const open = src.slice(i).search(/[[{]/) + i;
  let depth = 0;
  for (let k = open; k < src.length; k++) {
    const c = src[k];
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') {
      depth--;
      if (depth === 0) return { start: i, end: k };
    }
  }
  return null;
}

// Execute the bank plus the de-biasing IIFE that follows it, and hand back the
// bank as a student would meet it.
function realBank(file, decl, name) {
  const src = read(file);
  const d = declaration(src, decl);
  expect(d, `${name}: declaration not found in ${file}`).toBeTruthy();
  const after = src.slice(d.end);
  const open = after.indexOf('(function () {');
  const close = after.indexOf('})();', open);
  expect(open, `${name}: no de-biasing block follows the declaration`).toBeGreaterThan(-1);
  expect(close, `${name}: de-biasing block is not closed`).toBeGreaterThan(-1);
  const code = src.slice(d.start, d.end + 1) + ';\n' + after.slice(open, close + 5) + '\nreturn ' + name + ';';
  // eslint-disable-next-line no-new-func
  return new Function(code)();
}

const CASES = [
  { name: 'CIVIC_QUIZ', file: 'sel_hub/sel_tool_civicaction.js', decl: 'var CIVIC_QUIZ = ', key: 'answer', banded: true, maxShare: 0.35 },
  { name: 'CULTURE_QUIZ', file: 'sel_hub/sel_tool_community.js', decl: 'var CULTURE_QUIZ = ', key: 'a', banded: true, maxShare: 0.4 },
  { name: 'QUIZ_QUESTIONS', file: 'sel_hub/sel_tool_selfadvocacy.js', decl: 'var QUIZ_QUESTIONS = ', key: 'correct', banded: false, maxShare: 0.5 },
];

function positions(bank, c) {
  const items = c.banded
    ? Object.keys(bank).reduce((a, k) => a.concat(bank[k] || []), [])
    : bank;
  const counts = [0, 0, 0, 0, 0, 0];
  let n = 0;
  items.forEach((it) => {
    if (!it || !Array.isArray(it.options) || it.options.length < 3) return;   // skip true/false
    const idx = c.key === 'a' ? it.options.indexOf(it.a) : it[c.key];
    if (typeof idx !== 'number' || idx < 0) return;
    counts[idx]++; n++;
  });
  return { counts, n };
}

describe('SEL Hub · quiz answers are spread across the options', () => {
  it.each(CASES)('$name is not answerable by always picking one slot', (c) => {
    const { counts, n } = positions(realBank(c.file, c.decl, c.name), c);
    expect(n, `${c.name}: no measurable questions found — the extraction is broken, not the bank`).toBeGreaterThan(8);
    const worst = Math.max(...counts);
    const share = worst / n;
    expect(
      share,
      `${c.name}: ${Math.round(share * 100)}% of ${n} answers sit in one position (${counts.slice(0, 4).join('/')})`,
    ).toBeLessThanOrEqual(c.maxShare);
  });

  it.each(CASES)('$name keeps every answer inside its own options', (c) => {
    // The rotation moves options and index together. If they ever drift, a
    // question silently marks the wrong option correct — worse than the bias.
    const bank = realBank(c.file, c.decl, c.name);
    const items = c.banded
      ? Object.keys(bank).reduce((a, k) => a.concat(bank[k] || []), [])
      : bank;
    const broken = [];
    items.forEach((it, i) => {
      if (!it || !Array.isArray(it.options)) return;
      if (c.key === 'a') {
        if (it.options.indexOf(it.a) < 0) broken.push(`#${i}: answer "${it.a}" is not among its options`);
      } else {
        const idx = it[c.key];
        if (typeof idx !== 'number' || idx < 0 || idx >= it.options.length) {
          broken.push(`#${i}: ${c.key}=${idx} is outside 0..${it.options.length - 1}`);
        }
      }
    });
    expect(broken, `${c.name}: rotation broke the answer mapping:\n  ${broken.join('\n  ')}`).toEqual([]);
  });

  it('the rotation is deterministic, not random', () => {
    // A random shuffle would make the bank differ between two students, between
    // a session and its export, and between a test run and the next.
    CASES.forEach((c) => {
      const src = read(c.file);
      const d = declaration(src, c.decl);
      const after = src.slice(d.end, d.end + 2000);
      expect(after, `${c.name}: de-biasing must not use Math.random`).not.toMatch(/Math\.random/);
    });
  });

  it('the extraction really does execute the rotation (calibration)', () => {
    // If the IIFE were not being run, CIVIC_QUIZ would still be 24/24 at slot 1.
    const { counts } = positions(realBank(CASES[0].file, CASES[0].decl, CASES[0].name), CASES[0]);
    expect(counts[1], 'all 24 answers still at slot 1 — the rotation is not executing').toBeLessThan(20);
  });
});
