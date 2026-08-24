// Printing Press quiz answer placement (2026-08-23).
//
// The tool's 254 inline quiz questions (miniQuizBlock opts/ans +
// scenarioCard choices/correct) put 71% of correct answers at index 1 -
// and both catalog scanners were blind to the bank because `ans:` was not in
// their answer-field alternations, while the position scanner's arithmetic
// recipe phantom-cleared the file on CSS rotate() calls. The fix is render-
// time: ppPlaceAnswer() hashes the question text to a target slot and rotates
// the options onto it, deterministically, inside both components.
//
// These tests run the SHIPPED function over the SHIPPED banks. One regression
// is pinned by name: the hash's final XOR leaves the seed SIGNED in JS, and a
// signed seed % n is negative - the uppercase/lowercase question really
// produced target -2 before the (seed >>> 0) guard. If someone "simplifies"
// that guard away, this fails on the exact question that caught it.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const PATHS = [
  'stem_lab/stem_tool_printingpress.js',
  'desktop/web-app/public/stem_lab/stem_tool_printingpress.js',
];
const src = readFileSync(PATHS[0], 'utf8');

const start = src.indexOf('function ppPlaceAnswer(');
const place = new Function('return ' + src.slice(start, src.indexOf('\n      }', start) + 8))();

function strs(raw) {
  const out = []; let i = 0;
  while (i < raw.length) {
    const c = raw[i];
    if (c === "'" || c === '"') {
      const q = c; i++; let t = '';
      while (i < raw.length && raw[i] !== q) { if (raw[i] === '\\') { t += raw[i + 1]; i += 2; } else t += raw[i++]; }
      i++; out.push(t);
    } else if (' \n\r\t,'.includes(c)) i++;
    else return null;
  }
  return out;
}

const bank = [];
for (const m of src.matchAll(/q:\s*'((?:[^'\\]|\\.)*)'\s*,\s*opts:\s*\[([^\]]{4,900})\]\s*,\s*ans:\s*(\d+)/g)) {
  const opts = strs(m[2]);
  if (opts && +m[3] < opts.length) bank.push({ q: m[1].replace(/\\'/g, "'"), opts, ans: +m[3] });
}
for (const m of src.matchAll(/prompt:\s*__alloT\('[^']*',\s*'((?:[^'\\]|\\.)*)'\)\s*,\s*choices:\s*\[([^\]]{4,1200})\]\s*,\s*correct:\s*(\d+)/g)) {
  const opts = strs(m[2]);
  if (opts && +m[3] < opts.length) bank.push({ q: m[1].replace(/\\'/g, "'"), opts, ans: +m[3] });
}

describe('printingpress answer placement', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(PATHS[1], 'utf8')).toBe(src);
  });

  it('extraction reaches the bulk of the catalog and the authored bank really is biased (calibration)', () => {
    expect(bank.length).toBeGreaterThanOrEqual(200);
    const authored = [0, 0, 0, 0];
    for (const b of bank) authored[b.ans]++;
    expect(authored[1] / bank.length).toBeGreaterThan(0.6);
  });

  it('placement is a valid rotation for every question: answer text preserved, index in range', () => {
    for (const b of bank) {
      const r = place(b.q, b.opts, b.ans);
      expect(r.ans, b.q).toBeGreaterThanOrEqual(0);
      expect(r.ans, b.q).toBeLessThan(b.opts.length);
      expect(r.opts[r.ans], b.q).toBe(b.opts[b.ans]);
      expect([...r.opts].sort(), b.q).toEqual([...b.opts].sort());
    }
  });

  it('placed positions are spread: no slot above 35%, no dead slot', () => {
    const placed = [0, 0, 0, 0];
    let four = 0;
    for (const b of bank) {
      if (b.opts.length !== 4) continue;
      placed[place(b.q, b.opts, b.ans).ans]++; four++;
    }
    expect(Math.max(...placed) / four, placed.join('/')).toBeLessThan(0.35);
    expect(placed.filter((c) => c === 0).length).toBe(0);
  });

  it('the signed-hash question stays fixed (regression pin)', () => {
    // This exact text hashes to a negative signed seed; without (seed >>> 0)
    // the target slot was -2 and the answer landed nowhere.
    const q = 'The terms "uppercase" and "lowercase" come from:';
    const r = place(q, ['a', 'b', 'c', 'd'], 1);
    expect(r.ans).toBeGreaterThanOrEqual(0);
    expect(src).toContain('(seed >>> 0) % opts.length');
  });

  it('placement is applied in BOTH components, not merely defined', () => {
    expect(src).toContain('ppPlaceAnswer(scenario.prompt, scenario.choices, scenario.correct)');
    expect(src).toContain('ppPlaceAnswer(qq.q, qq.opts, qq.ans)');
  });
});
