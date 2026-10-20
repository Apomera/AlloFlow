// The shared STEM grading core (dev-tools/stem_grading_core_block.js).
//
// The 10-18 math review fixed the same three bug families tool by tool: a grader
// that read "2.5" as 2 (parseInt) or rejected "−3", a solved item that paid again
// on every re-click, and credit after a reveal. Tools load on their own (a Canvas
// paste carries one tool, not the hub), so the helper is a small block copied
// VERBATIM into each tool that grades. This pins its behavior, and pins every
// copy to the canonical block so the copies cannot drift apart.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const ROOT = process.cwd();
const BLOCK_FILE = process.env.STEM_GRADING_CORE_BLOCK || 'dev-tools/stem_grading_core_block.js';
const canonical = readFileSync(resolve(ROOT, BLOCK_FILE), 'utf8').replace(/\r\n/g, '\n').trim();
const BEGIN = '// STEM_GRADING_CORE_BEGIN';
const END = '// STEM_GRADING_CORE_END';

let G;
beforeAll(() => {
  window.StemLab = {};
  new Function(canonical)();
  G = window.StemLab.grading;
});

describe('toNumber', () => {
  it('reads the forms students type', () => {
    expect(G.toNumber('2.5')).toBe(2.5);
    expect(G.toNumber(' -3 ')).toBe(-3);
    expect(G.toNumber('−3')).toBe(-3);
    expect(G.toNumber('1,000')).toBe(1000);
    expect(G.toNumber('3/4')).toBe(0.75);
    expect(G.toNumber('-1 1/2')).toBe(-1.5);
    expect(G.toNumber('.5')).toBe(0.5);
    expect(G.toNumber(7)).toBe(7);
  });

  it('refuses what is not a plain number, so callers can say so', () => {
    for (const bad of ['', '5 cm', 'abc', '1/0', '1,00', '2..5', '12 apples', null, undefined, NaN, Infinity, '1 1/0']) {
      expect(Number.isNaN(G.toNumber(bad)), String(bad)).toBe(true);
    }
  });
});

describe('sameNumber', () => {
  it('compares value, not text, and never truncates', () => {
    expect(G.sameNumber('22.5', 22.5)).toBe(true);
    expect(G.sameNumber('22', 22.5)).toBe(false);
    expect(G.sameNumber('24.7', 24)).toBe(false);
    expect(G.sameNumber('1/2', '0.5')).toBe(true);
    expect(G.sameNumber(0.1 + 0.2, 0.3)).toBe(true);
  });

  it('honors absolute and relative tolerances', () => {
    expect(G.sameNumber('3.14', Math.PI, { tolerance: 0.01 })).toBe(true);
    expect(G.sameNumber('3.1', Math.PI, { tolerance: 0.01 })).toBe(false);
    expect(G.sameNumber('101', 100, { relative: 0.02 })).toBe(true);
    expect(G.sameNumber('0', 0.004)).toBe(false);
  });

  it('a non-number never matches', () => {
    expect(G.sameNumber('', 0)).toBe(false);
    expect(G.sameNumber('abc', NaN)).toBe(false);
  });
});

describe('creditOnce', () => {
  it('credits a key once and never mutates the stored map', () => {
    const first = G.creditOnce(undefined, 'q1');
    expect(first.isNew).toBe(true);
    const second = G.creditOnce(first.seen, 'q1');
    expect(second.isNew).toBe(false);
    const third = G.creditOnce(second.seen, 'q2');
    expect(third.isNew).toBe(true);
    expect(first.seen).toEqual({ q1: true });
    expect(third.seen).toEqual({ q1: true, q2: true });
  });

  it('alternating answers cannot re-earn credit', () => {
    let seen = {};
    let paid = 0;
    for (const key of ['A', 'B', 'A', 'B', 'A']) {
      const r = G.creditOnce(seen, key);
      if (r.isNew) paid++;
      seen = r.seen;
    }
    expect(paid).toBe(2);
  });

  it('survives hostile saved state', () => {
    for (const bad of [null, 'x', 42, ['q1']]) expect(G.creditOnce(bad, 'q1').isNew).toBe(true);
  });
});

describe('every tool copy is the canonical block', () => {
  it('copies are verbatim and newer copies win', () => {
    const dir = resolve(ROOT, 'stem_lab');
    const copies = [];
    for (const name of readdirSync(dir).filter((n) => /\.js$/.test(n))) {
      const text = readFileSync(resolve(dir, name), 'utf8').replace(/\r\n/g, '\n');
      if (!text.includes(BEGIN)) continue;
      expect(text.split(BEGIN).length - 1, name + ' carries two copies').toBe(1);
      // Throws naming the file if the END marker is missing.
      copies.push([name, sliceBetween(text, BEGIN, END, { file: name, label: 'grading core', includeEnd: true })]);
    }
    for (const [name, block] of copies) expect(block === canonical, name + ' grading core differs from ' + BLOCK_FILE).toBe(true);
    window.StemLab = { grading: { version: 99 } };
    new Function(canonical)();
    expect(window.StemLab.grading.version).toBe(99);
    // Reads every stem_lab tool (tens of MB): seconds on a busy or synced disk.
  }, 60000);
});
