// A student typing a big number or a big repeat could freeze the whole browser tab.
// Found by the freeze hunt on 2026-11-05 and reproduced in Chromium:
//   Coding Playground: repeat(1000000, ...) was still frozen after 30 s.
//   Number Line: Plot decimal 100000 was still frozen after 30 s.
//   Money Math: Loan term 1000000000 was still frozen after 30 s, inside render.
//   Fraction Lab: Probe count 999999999 was still frozen after 30 s.
//
// Each test runs the shipped code under a vm timeout, so a freeze is a failure and not a hung run.
// FREEZE_SRC_DIR points the suite at start copies for the fail-first check.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const DIR = process.env.FREEZE_SRC_DIR || path.join(process.cwd(), 'stem_lab');
const PREFIX = process.env.FREEZE_SRC_DIR ? 'start_' : '';
const read = (f) => fs.readFileSync(path.join(DIR, PREFIX + f), 'utf8').replace(/\r\n/g, '\n');
const LIMIT_MS = 4000;

/** The real coding engine: the CodingInterp block, taken whole from the tool file. */
const ENGINE = (() => {
  const src = read('stem_tool_coding.js');
  const a = src.indexOf('var CodingInterp = (function () {');
  const ret = src.indexOf('return { resolveVal: resolveVal', a);
  const b = src.indexOf('})();', ret);
  expect(a, 'CodingInterp not found').toBeGreaterThan(-1);
  return src.slice(a, b + 5);
})();

function simulate(blocks) {
  const script = ENGINE + "\nvar r = CodingInterp.simulate(BLOCKS, { x: 250, y: 250, angle: -90, penDown: true, color: '#000', width: 2 }, {});" +
    '\nJSON.stringify({ capped: r.diagnostics.cappedSteps, frames: r.frames.length });';
  return JSON.parse(vm.runInNewContext(script, { BLOCKS: blocks }, { timeout: LIMIT_MS }));
}
/** What a student actually types, through the tool's own parser. */
function runTyped(code) {
  const script = ENGINE + "\nvar r = CodingInterp.simulate(CodingInterp.textToBlocks(CODE), { x: 250, y: 250, angle: -90, penDown: true, color: '#000', width: 2 }, {});" +
    '\nJSON.stringify({ capped: r.diagnostics.cappedSteps, frames: r.frames.length });';
  return JSON.parse(vm.runInNewContext(script, { CODE: code }, { timeout: LIMIT_MS }));
}
const fwd = { type: 'forward', distance: 1 };

describe('Coding Playground finishes on any repeat a student can type', () => {
  it('repeat(1000000) of one step stops, and says it stopped', () => {
    const r = simulate([{ type: 'repeat', times: 1000000, children: [fwd] }]);
    expect(r.capped).toBe(true);
  });

  it('the exact text from the hunt stops, through the real parser', () => {
    expect(runTyped('repeat(1000000, function() {\n  forward(1);\n});').capped).toBe(true);
  });

  it('nested repeats stop', () => {
    simulate([{ type: 'repeat', times: 100000, children: [{ type: 'repeat', times: 100000, children: [fwd] }] }]);
  });

  it('a repeat with an empty body does not spin', () => {
    simulate([{ type: 'repeat', times: 1e12, children: [] }]);
    simulate([{ type: 'repeat', times: 1e12, children: [{ type: 'repeat', times: 1e12, children: [] }] }]);
  });

  it('an if inside a big repeat does not copy the program a hundred thousand times', () => {
    simulate([{ type: 'repeat', times: 100000, children: [{ type: 'ifelse', condition: 'x > 0', children: [fwd], elseChildren: [] }] }]);
  });

  it('forty stamps do not double the drawing forty times', () => {
    simulate([{ type: 'repeat', times: 40, children: [fwd, { type: 'stamp' }] }]);
  });

  it('an ordinary program still runs in full and is not flagged', () => {
    const r = simulate([{ type: 'repeat', times: 4, children: [fwd, { type: 'right', degrees: 90 }] }]);
    expect(r.capped).toBe(false);
    expect(r.frames).toBeGreaterThanOrEqual(8);
  });
});

describe('Robot repeat in the Coding Playground', () => {
  const src = read('stem_tool_coding.js');
  const a = src.indexOf('function flattenRobot(bArr');
  const b = src.indexOf('var flat = flattenRobot(rBlocks);', a);
  const run = (blocks) => JSON.parse(vm.runInNewContext(
    `var maxSteps = 500, ROBOT_FLAT_LIMIT = maxSteps * 2;\n${src.slice(src.lastIndexOf('\n', a), b)}\nJSON.stringify(flattenRobot(BLOCKS).length);`,
    { BLOCKS: blocks }, { timeout: LIMIT_MS }));

  it('stops expanding what could never run', () => {
    const mv = { type: 'moveR' };
    expect(run([{ type: 'repeatR', times: 1e9, children: [mv] }])).toBeLessThanOrEqual(1001);
    run([{ type: 'whileNotGoal', children: [{ type: 'whileNotGoal', children: [{ type: 'whileNotGoal', children: [mv] }] }] }]);
    run([{ type: 'repeatR', times: 1e12, children: [] }]);
  });

  it('keeps a small program intact', () => {
    expect(run([{ type: 'repeatR', times: 3, children: [{ type: 'moveR' }, { type: 'moveR' }] }])).toBe(6);
  });
});

describe('Number Line, Fractions and Decimals', () => {
  const src = read('stem_tool_numberline.js');
  const a = src.indexOf('if (fracTicksDrawn) {');
  const b = src.indexOf('var mx = X(fdValue);', a);
  const ticksFor = (fdMin, fdMax, narrow = false) => JSON.parse(vm.runInNewContext(
    `var n = [], fdDen = 4, fracTicksDrawn = false, pushTick = function (k, v) { n.push(v); };\n${src.slice(a, b)}\nJSON.stringify(n);`,
    { fdMin, fdMax, narrow }, { timeout: LIMIT_MS }));

  it('draws a readable number of round ticks on a long line', () => {
    const t = ticksFor(0, 100000);
    expect(t.length).toBeLessThanOrEqual(13);
    expect(t).toContain(0);
    expect(t).toContain(100000);
    expect(ticksFor(0, 100000, true).length).toBeLessThanOrEqual(7);
  });

  it('still finishes at the largest range it allows, positive and negative', () => {
    expect(ticksFor(0, 1e12).length).toBeLessThanOrEqual(13);
    expect(ticksFor(-1e12, 1e12).length).toBeLessThanOrEqual(13);
    expect(ticksFor(1e12 - 40, 1e12).length).toBeLessThanOrEqual(13);
  });

  it('keeps every whole number on a short line', () => {
    expect(ticksFor(0, 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(ticksFor(-3, 3)).toEqual([-3, -2, -1, 0, 1, 2, 3]);
    expect(ticksFor(0.5, 3.5)).toEqual([1, 2, 3]);
  });

  it('refuses a number past the limit and repairs a saved line past it', () => {
    expect(src.match(/stem\.numberline\.fd_too_big/g).length).toBe(2);
    expect(src).toContain('Math.abs(fdMax) > FD_MAX_ABS');
    expect(src).toContain('if (Math.abs(fdValue) > FD_MAX_ABS) fdValue = 0.5;');
  });
});

describe('Money Math loan term', () => {
  const src = read('stem_tool_money.js');
  const a = src.indexOf('var loanAmt = typeof d.loanAmt');
  const b = src.indexOf('loanAmort.push', a);
  const end = src.indexOf('}\n', src.indexOf('}\n', b) + 2);
  const run = (loanTerm) => JSON.parse(vm.runInNewContext(
    `var __alloT = function (k, s) { return s; };\n${src.slice(a, end + 1)}\nJSON.stringify({ term: loanTerm, rows: loanAmort.length });`,
    { d: { loanTerm } }, { timeout: LIMIT_MS }));

  it('a saved or typed huge term cannot freeze render', () => {
    expect(run(1000000000).term).toBe(1200);
    expect(run(1e308).term).toBe(1200);
  });

  it('a real mortgage term is untouched', () => {
    expect(run(360).term).toBe(360);
  });

  it('typing is capped too, not only the display', () => {
    expect(src).toContain("'loanTerm', e.target.value, { min: 1, max: 1200, integer: true });");
    expect(src).toContain("'loanTerm', e.target.value, { min: 1, max: 1200, integer: true }, 60);");
  });
});

describe('Fraction Lab teacher generators', () => {
  const src = read('stem_tool_fractions.js');

  it('holds both counts to the 50 the boxes promise, on typing and on a saved value', () => {
    expect(src).toContain('count: Math.min(50, parseInt(e.target.value) || 10)');
    expect(src).toContain('probeCount: Math.min(50, parseInt(e.target.value) || 30)');
    expect(src).toContain('var probeCount = Math.min(50, _f.probeCount || 30);');
    expect(src).toContain('if (ws.count > 50) ws = Object.assign({}, ws, { count: 50 });');
  });
});
