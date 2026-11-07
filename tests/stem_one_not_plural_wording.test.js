// "1 dots", "1 rows are" (2026-11-06). Every tool's own sentence filler runs its text through __alloOneWord, so a sentence with
// a count of one reads right without a second key for every plural. STEM_ONE_DIR runs another copy of the tools (fail-first).
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

const DIR = process.env.STEM_ONE_DIR || 'stem_lab';
const FILLERS = {
  multtable: ['function fmt(s, vals)'],
  // The plain fill in dataplot and coordgrid belongs to the alloGraphAccess block, which must stay byte-identical to Graphing Calculator.
  dataplot: ['function fillT(s, map)'],
  arithmetic: ['function fill(str, vals)'],
  numberline: ['function fill(s, map)'],
  areamodel: ['function fill(str, vars)'],
  areaperimeter: ['function fill(template, vars)'],
  ratios: ['function fill(template, values)'],
  coordgrid: ['var fill = function (s, map)'],
  unitconvert: ['function fill(text, params)'],
  angles: ['var fill = function(s, o)'],
  cellular: ['function fmt(template, values)'],
  citylab: ['function fmt(s, vals)'],
  calculus: ['var fillT = function(s, map)'],
  printingpress: ['var __alloFill = function (template, values)'],
  beehive: ['var __alloFill = function (template, values)'],
  evolab: ['var __alloFill = function (template, values)'],
  scaleexplorer: ['function fmt(s, vars)'],
};
// Left out on purpose: their tests pin exact file bytes or load a slice of the file, so the helper line breaks them.
const NOT_SWEPT = ['firstresponse', 'dinolab', 'lumen', 'magnetism', 'nuclearlab', 'roadready', 'watercycle', 'weldlab', 'echolocation', 'geosandbox'];
// The filler itself, cut out of the tool by matching braces.
function cut(src, head) {
  const at = src.indexOf(head);
  if (at < 0) throw new Error('no filler: ' + head);
  const open = src.indexOf('{', src.indexOf(')', at));
  let depth = 0, i = open;
  // Braces inside its regex and strings balance, so a plain count finds the end.
  for (; i < src.length; i++) { if (src[i] === '{') depth++; else if (src[i] === '}' && --depth === 0) break; }
  return src.slice(src.indexOf('function', at), i + 1);
}
function load(tool, head) {
  const src = readFileSync(DIR + '/stem_tool_' + tool + '.js', 'utf8');
  const a = src.indexOf('function __alloOneWord(');
  const helper = a < 0 ? 'function __alloOneWord(s) { return s; }' : src.slice(a, src.indexOf('\n', a));
  return new Function(helper + ';return (' + cut(src, head) + ');')();
}

describe('a count of one reads as one', () => {
  for (const [tool, heads] of Object.entries(FILLERS)) {
    for (const head of heads) {
      it(tool + ' / ' + head, () => {
        const fill = load(tool, head);
        expect(fill('{a} rows of {b} make {p} dots.', { a: 1, b: 1, p: 1 })).toBe('1 row of 1 makes 1 dot.');
        expect(fill('{n} squares are counted.', { n: 1 })).toBe('1 square is counted.');
        expect(fill('{n} cells were left.', { n: 1 })).toBe('1 cell was left.');
        expect(fill('Count them: there are {n} values.', { n: 1 })).toBe('Count them: there is 1 value.');
      });
      it(tool + ' / ' + head + ' leaves every other count alone', () => {
        const fill = load(tool, head);
        expect(fill('{n} dots', { n: 2 })).toBe('2 dots');
        expect(fill('{n} dots', { n: 11 })).toBe('11 dots');
        expect(fill('{n} dots', { n: 0.1 })).toBe('0.1 dots');
        expect(fill('{n} dots', { n: 2.1 })).toBe('2.1 dots');
        expect(fill('{a} times {b}', { a: 1, b: 5 })).toBe('1 times 5');
        expect(fill('{n} puntos', { n: 1 })).toBe('1 puntos');
      });
    }
  }
});

describe('the wider word list', () => {
  const src = readFileSync(DIR + '/stem_tool_numberline.js', 'utf8');
  const a = src.indexOf('function __alloOneWord(');
  const one = new Function(src.slice(a, src.indexOf('\n', a)) + ';return __alloOneWord;')();
  it.each([
    ['1 square units', '1 square unit'],
    ['1 live neighbours', '1 live neighbour'],
    ['1 spaceship rules', '1 spaceship rule'],
    ['Moves 1 rows and 1 columns every 1 generations.', 'Moves 1 row and 1 column every 1 generation.'],
    ['1 births, 1 survivors and 1 deaths', '1 birth, 1 survivor and 1 death'],
    ['1 inches', '1 inch'],
    ['1 boxes', '1 box'],
    ['1 feet', '1 foot'],
    ['1 groups fit', '1 group fits'],
    ['There are 1 equal groups', 'There is 1 equal group'],
    ['You visited 1 airports.', 'You visited 1 airport.'],
  ])('%s', (input, want) => { expect(one(input)).toBe(want); });
  it.each([
    'Grade 1 students', 'Row 1 cells', 'Player 1 points', '3:1 cups', '3/1 cups', '2 × 1 rows', '1 squares to 1', '1 cubes to 1', '1 rounds up',
    '11 dots', '0.1 dots', '-1 degrees', '1 times 5', '1 ones', '1 million years',
  ])('leaves %s alone', (text) => { expect(one(text)).toBe(text); });
});

describe('every tool that carries the helper', () => {
  const canonical = (() => { const s = readFileSync(DIR + '/stem_tool_numberline.js', 'utf8'), i = s.indexOf('function __alloOneWord('); return s.slice(i, s.indexOf('\n', i)); })();
  const tools = readdirSync(DIR).filter((f) => /^stem_tool_.*\.js$/.test(f)).filter((f) => readFileSync(DIR + '/' + f, 'utf8').includes('__alloOneWord('));
  it('carries the same text and calls it', () => {
    expect(tools.length).toBeGreaterThan(40);
    for (const t of NOT_SWEPT) expect(tools.includes('stem_tool_' + t + '.js'), t).toBe(false);
    for (const f of tools) {
      const s = readFileSync(DIR + '/' + f, 'utf8');
      const copies = s.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('function __alloOneWord('));
      expect(copies.length, f).toBeGreaterThan(0);
      for (const copy of copies) expect(copy === canonical, f).toBe(true);
      expect(s.split('__alloOneWord(').length, f).toBeGreaterThan(2);
    }
  });
  it('the shared graph block reads a count of one correctly, the same in all five tools', () => {
    const blocks = ['coordgrid', 'dataplot', 'calculus', 'graphcalc', 'funcgrapher'].map((t) => {
      const s = readFileSync(DIR + '/stem_tool_' + t + '.js', 'utf8');
      return s.slice(s.indexOf('== alloGraphAccess core v2'), s.indexOf('== end alloGraphAccess core v2'));
    });
    expect(blocks[0].length).toBeGreaterThan(1000);
    for (const b of blocks) expect(b === blocks[0]).toBe(true);
    const a = blocks[0].indexOf('function __alloOneWord('), helper = blocks[0].slice(a, blocks[0].indexOf('\n', a));
    const head = 'function fill(s, map)', c = blocks[0].indexOf(head), fill = blocks[0].slice(c, blocks[0].indexOf('\n', c));
    const f = new Function(helper + ';' + fill + ';return fill;')();
    expect(f('the graph moves {dir} {n} units.', { dir: 'up', n: 1 })).toBe('the graph moves up 1 unit.');
    expect(f('(and again every {p} units along x)', { p: 1 })).toBe('(and again every 1 unit along x)');
    expect(f('the graph moves {dir} {n} units.', { dir: 'up', n: 2 })).toBe('the graph moves up 2 units.');
    expect(f('Playing the graph in {s} seconds.', { s: 1 })).toBe('Playing the graph in 1 second.');
  });
  it('wraps sentences that fill their number with replace()', () => {
    const heat = readFileSync(DIR + '/stem_tool_heatlab.js', 'utf8');
    expect(heat).toMatch(/__alloOneWord\(t\('stem\.heatlab\.sr_trial_recorded'/);
    const plates = readFileSync(DIR + '/stem_tool_platetectonics.js', 'utf8');
    expect(plates).toMatch(/__alloOneWord\((?:t|__alloT)\('stem\.platetectonics\.[\w.]+', ['"][^'"]*\{n\} earthquakes/);
  });
});
