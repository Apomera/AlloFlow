// brainAtlas — CSS custom properties must not be stored as DATA colours.
//
// Canvas 2D cannot parse var(--x): `ctx.fillStyle = 'var(--allo-stem-text-soft)'`
// is silently IGNORED and the previous fill persists — no error is raised. The
// same string also breaks alpha concatenation (`colour + '20'` -> invalid CSS,
// declaration dropped).
//
// Two records were affected and are pinned here:
//   stageLabels "Awake"  -> drawn with ctx.fillStyle / ctx.strokeStyle + '20'
//   FM_REGIONS "Brainstem" -> bg = r.color + '12', border = r.color + '60'
//
// var() inside a DOM style object is valid CSS and is NOT a defect: this file
// legitimately uses eight of those, so the test targets the data records rather
// than banning the string outright.
//
// Source-literal extraction — brainAtlas is ~1MB, too slow for loadTool.

import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

const SRC_PATH = 'stem_lab/stem_tool_brainatlas.js';
let src;
let lines;

beforeAll(() => {
  src = fs.readFileSync(SRC_PATH, 'utf8');
  lines = src.split(/\r?\n/);
});

function hexish(value) {
  return /^#[0-9a-fA-F]{3,8}$/.test(value) || /^(rgb|hsl)a?\(/.test(value);
}

describe('brainAtlas — canvas-drawn data colours are concrete', () => {
  it('every sleep-stage label carries a canvas-parsable colour', () => {
    const start = src.indexOf('var stageLabels');
    expect(start, 'stageLabels not found').toBeGreaterThan(-1);
    const end = src.indexOf('];', start);
    const block = src.slice(start, end);
    const colours = [...block.matchAll(/color:\s*'([^']+)'/g)].map((m) => m[1]);
    expect(colours.length).toBeGreaterThanOrEqual(5);
    colours.forEach((c) => {
      expect(c, 'stage colour must not be a CSS var(): ' + c).not.toMatch(/^var\(/);
      expect(hexish(c), 'stage colour must be canvas-parsable: ' + c).toBe(true);
    });
  });

  it('the hypnogram really does feed these colours to canvas', () => {
    // guards the premise: if the drawing changes, this test should be revisited
    expect(src).toContain('ctx.fillStyle = sl.color;');
    expect(src).toMatch(/ctx\.strokeStyle = sl\.color \+ '20'/);
  });
});

describe('brainAtlas — concatenated data colours are concrete', () => {
  it('every FM_REGIONS colour survives an alpha suffix', () => {
    const start = src.indexOf('var FM_REGIONS');
    expect(start, 'FM_REGIONS not found').toBeGreaterThan(-1);
    const end = src.indexOf('];', start);
    const block = src.slice(start, end);
    const colours = [...block.matchAll(/color:\s*'([^']+)'/g)].map((m) => m[1]);
    expect(colours.length).toBeGreaterThanOrEqual(7);
    colours.forEach((c) => {
      expect(c, 'region colour must not be a CSS var(): ' + c).not.toMatch(/^var\(/);
      expect(hexish(c), 'region colour must be concrete: ' + c).toBe(true);
    });
  });

  it('the region buttons really do concatenate an alpha suffix', () => {
    expect(src).toMatch(/bg = r\.color \+ '12'/);
    expect(src).toMatch(/border = r\.color \+ '60'/);
  });
});

describe('brainAtlas — DOM styling may still use theme variables', () => {
  it('leaves the legitimate style-object var() colours in place', () => {
    const domVars = lines.filter((l) => /style:\s*\{/.test(l) && /color:\s*'var\(--/.test(l));
    expect(domVars.length, 'DOM style var() usage should not have been stripped').toBeGreaterThan(0);
  });
});
