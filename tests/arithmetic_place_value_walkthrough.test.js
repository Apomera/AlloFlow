import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// The place-value model's FINAL total was always correct, so every existing
// test passed while the intermediate steps — the part a student actually reads
// — showed a place holding 13 disks and an exchange that appeared to jump
// backwards. This suite pins the walkthrough itself, not just its answer.

const src = fs.readFileSync('stem_lab/stem_tool_arithmetic.js', 'utf8');
const win = {};
// eslint-disable-next-line no-new-func
new Function('window', src)(win);
const { placeValueStages, calculate } = win.ArithmeticStrategyPure;

// Shipped practice operands, so a bank edit cannot quietly dodge this gate.
// Read from the source rather than duplicated here: a test holding its own copy
// of the bank would keep passing after the bank changed underneath it.
const PRACTICE = (() => {
  // Parsed from the source, not duplicated here: a test holding its own copy
  // of the bank keeps passing after the bank changes underneath it.
  const re = /id: .(s\d+)., op: .subtract.[^}]*?a: (\d+), b: (\d+)/g;
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) out.push({ id: m[1], a: Number(m[2]), b: Number(m[3]) });
  return out;
})();

function valueOf(counts) {
  return counts.reduce((sum, n, i) => sum + n * Math.pow(10, i), 0);
}

describe('subtraction walkthrough', () => {
  it('finds the shipped subtraction problems to test against', () => {
    expect(PRACTICE.length).toBeGreaterThan(0);
    // 12003 - 4786 is the operand that exposed the original defect.
    expect(PRACTICE.some((p) => p.a === 12003 && p.b === 4786)).toBe(true);
  });

  it('settles each place before moving left, and never revisits one', () => {
    for (const { id, a, b } of PRACTICE) {
      const removes = placeValueStages('subtract', a, b).stages
        .filter((s) => s.kind === 'remove').map((s) => s.place);
      // Right to left, strictly increasing: a place is finished once passed.
      expect(removes, id).toEqual([...removes].sort((x, y) => x - y));
      expect(new Set(removes).size, id).toBe(removes.length);
    }
  });

  it('never exchanges into a place that is already settled', () => {
    for (const { id, a, b } of PRACTICE) {
      const settled = new Set();
      for (const s of placeValueStages('subtract', a, b).stages) {
        if (s.kind === 'remove') settled.add(s.place);
        // The original model borrowed into the ones place AFTER removing from
        // it, which is what made the walkthrough look like it ran backwards.
        if (s.kind === 'exchange') expect(settled.has(s.place), `${id} place ${s.place}`).toBe(false);
      }
    }
  });

  it('conserves value across every exchange, and only removes on a remove step', () => {
    for (const { id, a, b } of PRACTICE) {
      const { stages } = placeValueStages('subtract', a, b);
      for (let i = 1; i < stages.length; i++) {
        const before = valueOf(stages[i - 1].counts), after = valueOf(stages[i].counts);
        if (stages[i].kind === 'exchange' || stages[i].kind === 'summary') {
          expect(after, `${id} step ${i} (${stages[i].kind})`).toBe(before);
        } else {
          // A remove step takes exactly this place's digit, never the whole
          // subtrahend — the comparison panel prints this difference.
          const digit = Math.floor(b / Math.pow(10, stages[i].place)) % 10;
          expect(before - after, `${id} step ${i}`).toBe(digit * Math.pow(10, stages[i].place));
        }
      }
    }
  });

  it('ends at the true difference for every shipped problem', () => {
    for (const { id, a, b } of PRACTICE) {
      expect(placeValueStages('subtract', a, b).total, id).toBe(calculate('subtract', a, b).answer);
    }
  });

  it('holds no more disks than real regrouping requires', () => {
    // A place legitimately reaches 9 + 10 = 19 while being worked on. More than
    // that means a cascade stacked exchanges into one place.
    for (let a = 0; a <= 3000; a += 7) {
      for (let b = 0; b <= a; b += 13) {
        for (const s of placeValueStages('subtract', a, b).stages) {
          expect(Math.max(...s.counts), `${a}-${b}`).toBeLessThanOrEqual(19);
        }
      }
    }
  });

  it('agrees with plain subtraction across a wide sweep', () => {
    for (let a = 0; a <= 2000; a += 3) {
      for (let b = 0; b <= a; b += 11) {
        expect(placeValueStages('subtract', a, b).total, `${a}-${b}`).toBe(a - b);
      }
    }
  });

  it('still carries correctly for addition', () => {
    for (let a = 0; a <= 900; a += 7) {
      for (let b = 0; b <= 900; b += 11) {
        const { stages, total } = placeValueStages('add', a, b);
        expect(total, `${a}+${b}`).toBe(a + b);
        // Carrying resolves every place below the top one.
        const last = stages[stages.length - 1].counts;
        expect(last.slice(0, -1).every((n) => n < 10), `${a}+${b}`).toBe(true);
      }
    }
  });

  it('leaves a zero-subtrahend walkthrough with nothing to exchange', () => {
    const { stages, total } = placeValueStages('subtract', 405, 0);
    expect(total).toBe(405);
    expect(stages.filter((s) => s.kind === 'exchange')).toHaveLength(0);
    expect(stages.filter((s) => s.kind === 'remove')).toHaveLength(0);
  });

  it('ships the same walkthrough in the public mirror', () => {
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_arithmetic.js', 'utf8')).toBe(src);
  });
});
