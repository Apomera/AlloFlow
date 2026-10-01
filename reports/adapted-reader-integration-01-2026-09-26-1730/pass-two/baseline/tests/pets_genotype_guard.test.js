// Pets Lab — the Punnett square must survive a malformed saved genotype.
//
// The Genetics view reads each parent genotype as four letters (val[0]..val[3])
// and calls .toUpperCase() on every one to decide dominant vs recessive. It used
// to seed them with a falsy-only guard:
//
//     var pa1 = d.geneP1 || 'BbEe';
//
// so a saved 'B', 42, {} or ['B'] passed straight through, val[2] came back
// undefined, and renderAlleleLocus threw "Cannot read properties of undefined
// (reading 'toUpperCase')". Pets Lab catches its own render errors, so the
// student saw a fallback screen instead of Genetics — and the hostile-toolData
// sweep reported ZERO crashes, because nothing escaped to be counted. It only
// surfaced as 12 swallowed "[Pets] render error" lines once the sweep was made
// to enter all 29 modules (it had been routing to 8: Pets dispatches with
// `switch (view) { case ... }`, which the sweep's view discovery did not read).
//
// The guard is now a pattern that accepts EXACTLY the 9 genotypes the parent
// <select> can write. It cannot simply check membership in GENOTYPE_OPTIONS:
// that array is a `var` declared further down the same function, so at the
// guard it is hoisted but still undefined, and reading it would throw on EVERY
// render — a worse bug than the one being fixed.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const ROOT = process.cwd();
const PETS = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_pets.js'), 'utf8');
const MIRROR = fs.readFileSync(path.join(ROOT, 'desktop/web-app/public/stem_lab/stem_tool_pets.js'), 'utf8');

const GUARD = sliceBetween(PETS, 'var PETS_GENOTYPE_RE =', '// Generate gametes from a 2-locus genotype', {
  label: 'Punnett parent genotype guard',
});

// The ids the parent <select> offers — read from the tool, not retyped here.
const OPTION_IDS = (() => {
  const block = sliceBetween(PETS, 'var GENOTYPE_OPTIONS = [', '];', { label: 'GENOTYPE_OPTIONS' });
  return [...block.matchAll(/\{\s*id:\s*'([A-Za-z]+)'/g)].map((m) => m[1]);
})();

function seed(d) {
  // eslint-disable-next-line no-new-func
  return new Function('d', GUARD + '\nreturn [pa1, pa2];')(d);
}

describe('Pets Punnett parent genotype guard', () => {
  it('reads the nine option ids from the tool', () => {
    expect(OPTION_IDS).toHaveLength(9);
    expect(new Set(OPTION_IDS).size).toBe(9);
  });

  it('keeps every genotype the <select> can write', () => {
    for (const id of OPTION_IDS) {
      expect(seed({ geneP1: id, geneP2: id })).toEqual([id, id]);
    }
  });

  it('accepts exactly the option ids, nothing wider', () => {
    // Every arrangement of B/b and E/e in four positions (16). Only the nine
    // canonical, uppercase-first ones are options; 'bBEe' has no <option>, so
    // letting it through would leave the select showing a value it cannot
    // represent.
    const all = [];
    for (const a of 'Bb') for (const b of 'Bb') for (const c of 'Ee') for (const e of 'Ee') all.push(a + b + c + e);
    const kept = all.filter((g) => seed({ geneP1: g })[0] === g).sort();
    expect(kept).toEqual(OPTION_IDS.slice().sort());
  });

  it.each([
    ['a one-letter string', 'B'],
    ['a five-letter string', 'BbEeX'],
    ['a non-canonical order', 'bBEe'],
    ['lowercase garbage', 'zzzz'],
    ['an empty string', ''],
    ['a number', 42],
    ['an object', {}],
    ['an array of letters', ['B', 'b', 'E', 'e']],
    // The case that makes the typeof check load-bearing: RegExp#test coerces
    // its argument, so ['BbEe'] stringifies to "BbEe" and PASSES the pattern.
    // Without typeof it became pa1, val[0] was the whole string, val[1] was
    // undefined, and .toUpperCase() threw — the original crash again.
    ['a one-element array holding a valid genotype', ['BbEe']],
    ['true', true],
    ['null', null],
    ['undefined', undefined],
  ])('falls back to BbEe for %s', (_label, bad) => {
    const [pa1, pa2] = seed({ geneP1: bad, geneP2: bad });
    expect(pa1).toBe('BbEe');
    expect(pa2).toBe('BbEe');
  });

  it('leaves a value the render path can index and upper-case', () => {
    // The exact operations that threw: val[0]..val[3] and .toUpperCase().
    for (const bad of ['B', 42, {}, ['B'], ['BbEe'], true, null]) {
      const [val] = seed({ geneP1: bad });
      for (let i = 0; i < 4; i += 1) {
        expect(typeof val[i]).toBe('string');
        expect(() => val[i].toUpperCase()).not.toThrow();
      }
    }
  });

  it('does not read GENOTYPE_OPTIONS, which is still undefined at the guard', () => {
    expect(GUARD).not.toContain('GENOTYPE_OPTIONS');
    const guardAt = PETS.indexOf('var PETS_GENOTYPE_RE =');
    const optionsAt = PETS.indexOf('var GENOTYPE_OPTIONS = [');
    expect(guardAt).toBeGreaterThan(-1);
    expect(optionsAt).toBeGreaterThan(guardAt);
  });

  it('no longer seeds a parent with a falsy-only guard', () => {
    expect(PETS).not.toContain("d.geneP1 || 'BbEe'");
    expect(PETS).not.toContain("d.geneP2 || 'BbEe'");
  });

  it('ships the same guard in the public mirror', () => {
    expect(sliceBetween(MIRROR, 'var PETS_GENOTYPE_RE =', '// Generate gametes from a 2-locus genotype', {
      label: 'mirror genotype guard',
    })).toBe(GUARD);
  });
});
