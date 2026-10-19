import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sliceBetween } from './helpers/anchored_slice.js';

// Every memory trick the Multiplication Table shows must be TRUE for its fact.
//
// MR_NUMBERSENSE_MULTTABLE_SRC points the suite at another copy of the tool
// (mutation check: the pre-fix copy must turn this red).

const FILE = process.env.MR_NUMBERSENSE_MULTTABLE_SRC || 'stem_lab/stem_tool_multtable.js';
const src = fs.readFileSync(FILE, 'utf8');
// eslint-disable-next-line no-new-func
const TRICKS = new Function(sliceBetween(src, 'var MEMORY_TRICKS = {', '// ── Adaptive engine', { file: FILE }) + '\nreturn MEMORY_TRICKS;')();
const digitSum = (n) => String(n).split('').reduce((s, d) => s + Number(d), 0);

describe('memory tricks', () => {
  it('state the right product for their own fact', () => {
    for (const [key, { trick }] of Object.entries(TRICKS)) {
      const [a, b] = key.split('x').map(Number);
      const m = /(\d+)\s*(?:×|times)\s*(\d+)\s*(?:=|is)\s*(\d+)/.exec(trick);
      expect(m, key + ': ' + trick).not.toBeNull();
      expect([Number(m[1]), Number(m[2])].sort((x, y) => x - y), key).toEqual([a, b].sort((x, y) => x - y));
      expect(Number(m[3]), key).toBe(a * b);
    }
  });

  it('only claim "digits sum to 9" where they do', () => {
    // 9x11 = 99 claimed "9s digits sum to 9" (9 + 9 = 18).
    for (const [key, { trick }] of Object.entries(TRICKS)) {
      if (!/digits sum to 9|Digits \d\+\d=9/i.test(trick)) continue;
      const [a, b] = key.split('x').map(Number);
      expect(digitSum(a * b), key + ': ' + trick).toBe(9);
    }
  });
});
