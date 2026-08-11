// ecosystem — CSS custom properties must not be stored as DATA colours.
//
// Three renderers in this file cannot resolve var():
//   canvas 2D   ctxC.fillStyle = part2.color   -> assignment silently IGNORED,
//               the previous fill persists
//   SVG attrs   stroke={sp.color} / fill={sp.color} -> presentation attributes
//               do not accept var()
//   concat      '1px solid ' + s.color + '88'  -> invalid CSS, declaration dropped
//
// Two records were affected and are pinned here:
//   MAINE_SPECIES "grayWolf"  -> SVG population line + species button border
//   the starved-fish puff     -> canvas particle whose own comment says it must be
//                                "distinct from kill puff"
//
// var() inside a DOM style object is valid and common (38 such uses remain), so
// the test targets the data records rather than banning the string.

import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

const SRC_PATH = 'stem_lab/stem_tool_ecosystem.js';
let src;

beforeAll(() => { src = fs.readFileSync(SRC_PATH, 'utf8'); });

const CONCRETE = /^(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()/;

describe('ecosystem — species colours are concrete', () => {
  it('every MAINE_SPECIES colour can be used as an SVG attribute and concatenated', () => {
    const start = src.indexOf('var MAINE_SPECIES = [');
    expect(start, 'MAINE_SPECIES not found').toBeGreaterThan(-1);
    const block = src.slice(start, start + 20000);
    const entries = [...block.matchAll(/id:\s*'([^']+)'[^\n]*?color:\s*'([^']+)'/g)];
    expect(entries.length).toBeGreaterThanOrEqual(5);
    entries.forEach(([, id, colour]) => {
      expect(colour, id + ' colour must not be a CSS var()').not.toMatch(/^var\(/);
      expect(CONCRETE.test(colour), id + ' colour must be concrete: ' + colour).toBe(true);
    });
  });

  it('guards the premise: species colours really do feed SVG attributes and concatenation', () => {
    expect(src).toMatch(/stroke:\s*sp\.color/);
    expect(src).toMatch(/\+\s*s\.color\s*\+\s*'88'/);
  });
});

describe('ecosystem — canvas particle colours are concrete', () => {
  it('every catchParticles push uses a canvas-parsable colour', () => {
    const pushes = [...src.matchAll(/catchParticles\.push\(\{[\s\S]{0,400}?\}\)/g)].map((m) => m[0]);
    expect(pushes.length).toBeGreaterThanOrEqual(3);
    pushes.forEach((block, i) => {
      const colour = (block.match(/color:\s*'([^']+)'/) || [])[1];
      if (!colour) return;
      expect(colour, 'particle push #' + i + ' must not be a CSS var()').not.toMatch(/^var\(/);
      expect(CONCRETE.test(colour), 'particle push #' + i + ' colour: ' + colour).toBe(true);
    });
  });

  it('guards the premise: particles really are drawn on canvas', () => {
    expect(src).toContain('ctxC.fillStyle = part2.color;');
  });
});

describe('ecosystem — DOM styling may still use theme variables', () => {
  it('leaves the legitimate style-object var() colours in place', () => {
    const domVars = src.split(/\r?\n/).filter((l) => /style:\s*\{/.test(l) && /var\(--allo-stem/.test(l));
    expect(domVars.length, 'DOM style var() usage should not have been stripped').toBeGreaterThan(5);
  });
});
