// Unit tests for the extracted codingPlayground interpreter (roadmap C1).
//
// CodingInterp (parser / serializer / conditions / pure simulate) lives at module
// scope in stem_lab/stem_tool_coding.js between sentinel comments. It has no
// closure dependencies, so we extract it by sentinel and eval it in isolation —
// the executor's first real characterization net (the SSR golden only pins the
// default closed state and would stay green even if execution were broken).

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadInterp() {
  const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_coding.js'), 'utf8');
  const a = src.indexOf('/* __CODING_INTERP_START__ */');
  const b = src.indexOf('/* __CODING_INTERP_END__ */');
  if (a < 0 || b < 0) throw new Error('CodingInterp sentinels not found');
  const block = src.slice(a, b);
  const eq = block.indexOf('var CodingInterp =');
  // eslint-disable-next-line no-eval
  return eval('(function(){ ' + block.slice(eq).replace(/^var CodingInterp =/, 'return') + ' })()');
}

const START = { x: 250, y: 250, angle: -90, penDown: true, color: '#6366f1', width: 2 };

describe('CodingInterp pure helpers', () => {
  let CI;
  beforeAll(() => { CI = loadInterp(); });

  it('resolveVal resolves $vars and passes numbers', () => {
    expect(CI.resolveVal(50, {})).toBe(50);
    expect(CI.resolveVal('$n', { n: 12 })).toBe(12);
    expect(CI.resolveVal('$missing', {})).toBe(0);
  });

  it('evalCondition truth table', () => {
    const t = { x: 300, y: 100, angle: 0, penDown: true };
    expect(CI.evalCondition('x > 250', t, {})).toBe(true);
    expect(CI.evalCondition('x < 250', t, {})).toBe(false);
    expect(CI.evalCondition('y >= 100', t, {})).toBe(true);
    expect(CI.evalCondition('y <= 99', t, {})).toBe(false);
    expect(CI.evalCondition('$n == 5', t, { n: 5 })).toBe(true);
    expect(CI.evalCondition('$n != 5', t, { n: 5 })).toBe(false);
    expect(CI.evalCondition('penDown == true', t, {})).toBe(true);
    expect(CI.evalCondition('garbage', t, {})).toBe(false);
  });

  it('getEndpoints detects a closed shape', () => {
    expect(CI.getEndpoints([]).segments).toBe(0);
    const square = [
      { x1: 0, y1: 0, x2: 10, y2: 0 }, { x1: 10, y1: 0, x2: 10, y2: 10 },
      { x1: 10, y1: 10, x2: 0, y2: 10 }, { x1: 0, y1: 10, x2: 0, y2: 0 },
    ];
    expect(CI.getEndpoints(square).closed).toBe(true);
    expect(CI.getEndpoints(square).segments).toBe(4);
  });
});

describe('CodingInterp serialize/parse round-trip', () => {
  let CI;
  beforeAll(() => { CI = loadInterp(); });

  it('serializes control structures to the parser-accepted brace forms', () => {
    expect(CI.blocksToText([{ type: 'ifelse', condition: 'x > 250', children: [{ type: 'forward', distance: 10 }], elseChildren: [] }]))
      .toContain('if (x > 250) {');
    expect(CI.blocksToText([{ type: 'while', condition: 'x < 400', children: [] }])).toContain('while (x < 400) {');
    expect(CI.blocksToText([{ type: 'function', funcName: 'box', children: [] }])).toContain('function box() {');
  });

  it('parses what it serializes (forward/right/repeat)', () => {
    const blocks = [{ type: 'repeat', times: 4, children: [{ type: 'forward', distance: 100 }, { type: 'right', degrees: 90 }] }];
    const text = CI.blocksToText(blocks);
    const reparsed = CI.textToBlocks(text);
    expect(reparsed[0].type).toBe('repeat');
    expect(reparsed[0].times).toBe(4);
    expect(reparsed[0].children.map((b) => b.type)).toEqual(['forward', 'right']);
  });

  it('serializes 3D ops and is total (A3 guard, single-sourced)', () => {
    expect(CI.blocksToText([{ type: 'forward3D', distance: 50 }])).toBe('forward3D(50)');
    expect(CI.blocksToText([{ type: 'wat' }])).toBe('// unsupported: wat');
  });
});

describe('CodingInterp.simulate geometry', () => {
  let CI;
  beforeAll(() => { CI = loadInterp(); });

  it('forward(100) draws one segment and moves the turtle', () => {
    const sim = CI.simulate([{ type: 'forward', distance: 100 }], START);
    expect(sim.finalLines.length).toBe(1);
    expect(Math.round(sim.finalTurtle.x)).toBe(250);
    expect(Math.round(sim.finalTurtle.y)).toBe(150); // angle -90 points up
    expect(sim.frames.length).toBe(1);
  });

  it('a repeat(4){forward right} draws a closed square', () => {
    const square = [{ type: 'repeat', times: 4, children: [{ type: 'forward', distance: 100 }, { type: 'right', degrees: 90 }] }];
    const sim = CI.simulate(square, START);
    expect(sim.finalLines.length).toBe(4);          // 4 forwards draw, 4 rights don't
    expect(sim.frames.length).toBe(8);              // 8 flattened steps
    expect(CI.getEndpoints(sim.finalLines).closed).toBe(true);
    expect(Math.round(sim.finalTurtle.x)).toBe(250);
    expect(Math.round(sim.finalTurtle.y)).toBe(250);
  });

  it('penup suppresses drawing', () => {
    const sim = CI.simulate([{ type: 'penup' }, { type: 'forward', distance: 100 }], START);
    expect(sim.finalLines.length).toBe(0);
  });

  it('circle emits 36 segments', () => {
    const sim = CI.simulate([{ type: 'circle', radius: 30 }], START);
    expect(sim.finalLines.length).toBe(36);
  });

  it('ifelse takes the true branch on a satisfied condition', () => {
    // start x=250; condition x > 200 is true -> draw forward
    const sim = CI.simulate([{ type: 'ifelse', condition: 'x > 200', children: [{ type: 'forward', distance: 50 }], elseChildren: [{ type: 'backward', distance: 50 }] }], START);
    expect(sim.finalLines.length).toBe(1);
    expect(Math.round(sim.finalTurtle.y)).toBe(200); // moved up 50 (forward), not down
  });

  it('a function definition + call executes the body', () => {
    const prog = [
      { type: 'function', funcName: 'tri', children: [{ type: 'forward', distance: 30 }] },
      { type: 'callFunction', funcName: 'tri' },
    ];
    const sim = CI.simulate(prog, START);
    expect(sim.finalLines.length).toBe(1);
  });

  it('while loop honors the 1000-iteration safety cap', () => {
    // x starts 250; "x > 0" is always true (x only grows) -> must cap, not hang
    const sim = CI.simulate([{ type: 'while', condition: 'x > 0', children: [{ type: 'forward', distance: 1 }] }], START);
    // each iteration: 1 forward (draws) + the re-evaluated while marker. capped at 1000.
    expect(sim.finalLines.length).toBe(1000);
    expect(sim.frames.length).toBeLessThan(2100); // 1000 forwards + ~1001 while markers
  });

  it('frame add-deltas reconstruct the full final line list (replay invariant)', () => {
    const prog = [{ type: 'repeat', times: 3, children: [{ type: 'forward', distance: 40 }, { type: 'right', degrees: 120 }, { type: 'circle', radius: 10 }] }];
    const sim = CI.simulate(prog, START);
    let rebuilt = [];
    sim.frames.forEach((f) => { if (f.add && f.add.length) rebuilt = rebuilt.concat(f.add); });
    expect(rebuilt.length).toBe(sim.finalLines.length);
    expect(rebuilt).toEqual(sim.finalLines);
  });

  it('forward3D records a 3D segment (add3D) without a projector', () => {
    const sim = CI.simulate([{ type: 'forward3D', distance: 50 }], START);
    expect(sim.finalLines3D.length).toBe(1);
    expect(sim.frames[0].add3D.length).toBe(1);
    expect(sim.finalLines.length).toBe(0); // no project3D supplied -> no 2D projection
  });
});

describe('CodingInterp diagnostics (B1)', () => {
  let CI;
  beforeAll(() => { CI = loadInterp(); });

  it('parseWithErrors flags unrecognized lines with a line number', () => {
    const r = CI.parseWithErrors('forward(50)\nwiggle(3)\nright(90)');
    expect(r.blocks.map((b) => b.type)).toEqual(['forward', 'right']); // garbage dropped
    expect(r.errors.length).toBe(1);
    expect(r.errors[0].line).toBe(2);
    expect(r.errors[0].text).toBe('wiggle(3)');
  });

  it('parseWithErrors reports the wrong-conditional-syntax misconception', () => {
    // the A5 lesson: students who copy the old "if(cond, a, b)" form get told
    const r = CI.parseWithErrors('if(x > 5, forward, back)');
    expect(r.errors.length).toBe(1);
  });

  it('clean code produces zero errors', () => {
    const r = CI.parseWithErrors('repeat(4){\nforward(100)\nright(90)\n}');
    expect(r.errors.length).toBe(0);
    expect(r.blocks[0].type).toBe('repeat');
  });

  it('simulate flags an undefined function call', () => {
    const sim = CI.simulate([{ type: 'callFunction', funcName: 'ghost' }], START);
    expect(sim.diagnostics.unknownCalls).toContain('ghost');
  });

  it('simulate flags a while loop that hits the safety cap', () => {
    const sim = CI.simulate([{ type: 'while', condition: 'x > 0', children: [{ type: 'forward', distance: 1 }] }], START);
    expect(sim.diagnostics.cappedWhile).toBe(true);
  });

  it('a normal program reports no diagnostics', () => {
    const sim = CI.simulate([{ type: 'forward', distance: 50 }], START);
    expect(sim.diagnostics.cappedWhile).toBe(false);
    expect(sim.diagnostics.cappedSteps).toBe(false);
    expect(sim.diagnostics.unknownCalls.length).toBe(0);
  });
});
