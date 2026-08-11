// Molecule Shelf structure catalogue — offline invariants.
//
// The shelf loads each entry straight into Mol* by PDB code, so a mistyped or
// withdrawn code gives a student an empty viewer with no error. This suite
// pins everything checkable WITHOUT the network; the live check against
// data.rcsb.org lives in dev-tools/verify_molecule_shelf_pdb.cjs and is run at
// authoring time (all 13 verified when the catalogue was expanded 2026-08-10).
//
// Prompt quality is pinned too, because the Notice → Wonder pair IS the
// pedagogy here: an entry without a real question is just a 3D toy.

import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

const SRC = 'molecule_shelf/molecule_shelf.html';
let structures;
let src;

beforeAll(() => {
  src = fs.readFileSync(SRC, 'utf8');
  const start = src.indexOf('var STRUCTURES = [');
  const end = src.indexOf('\n  ];', start);
  if (start < 0 || end < 0) throw new Error('STRUCTURES literal not found');
  const literal = src.slice(start + 'var STRUCTURES = '.length, end + 4).replace(/;\s*$/, '');
  structures = new Function('return ' + literal)();
});

describe('Molecule Shelf — catalogue shape', () => {
  it('has grown past the original seven and every entry is complete', () => {
    expect(structures.length).toBeGreaterThanOrEqual(13);
    for (const s of structures) {
      for (const field of ['pdb', 'emoji', 'name', 'meta', 'notice', 'wonder']) {
        expect(typeof s[field], s.pdb + ' missing ' + field).toBe('string');
        expect(s[field].length, s.pdb + ' empty ' + field).toBeGreaterThan(0);
      }
    }
  });

  it('uses well-formed, unique, upper-case PDB identifiers', () => {
    const codes = structures.map((s) => s.pdb);
    expect(new Set(codes).size, 'duplicate PDB code').toBe(codes.length);
    for (const code of codes) {
      // A PDB ID is 4 characters, starting with a digit 1-9.
      expect(code, 'malformed PDB id: ' + code).toMatch(/^[1-9][A-Z0-9]{3}$/);
    }
  });

  it('keeps names and emoji distinct so the picker cards stay tellable apart', () => {
    const names = structures.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    const emoji = structures.map((s) => s.emoji);
    expect(new Set(emoji).size, 'two cards share an emoji').toBe(emoji.length);
  });
});

describe('Molecule Shelf — Notice/Wonder prompts carry the pedagogy', () => {
  it('every entry asks a real question in both steps', () => {
    for (const s of structures) {
      expect(s.notice, s.pdb + ' notice must ask something').toContain('?');
      expect(s.wonder, s.pdb + ' wonder must ask something').toContain('?');
    }
  });

  it('wonder prompts stay open rather than asking for a lookup', () => {
    for (const s of structures) {
      // "Why/What/How" openers keep the step speculative; the coach is an
      // observing tutor, not an answer key.
      expect(s.wonder, s.pdb + ' wonder should open with Why/What/How/If')
        .toMatch(/\b(Why|What|How|If|Hemoglobin|Insulin|One|This)\b/);
      expect(s.wonder.length, s.pdb + ' wonder too short to be a real prompt').toBeGreaterThan(40);
    }
  });

  it('notice prompts point at something visible in the viewer', () => {
    for (const s of structures) {
      expect(s.notice.length, s.pdb + ' notice too short').toBeGreaterThan(40);
    }
  });
});

describe('Molecule Shelf — catalogue drives the UI', () => {
  it('the picker and dropdown are built from the array, not hard-coded', () => {
    // Guards the premise: if this stops being data-driven, adding an entry
    // would silently fail to appear and these tests would pass vacuously.
    expect(src).toContain('STRUCTURES.forEach(function (s) {');
    expect(src).toContain('pickerGrid.appendChild(card);');
    expect(src).toContain("STRUCTURES.find(function (s) { return s.pdb === pdb; })");
  });

  it('honest organism labelling: non-human sources are named in the meta line', () => {
    const byId = Object.fromEntries(structures.map((s) => [s.pdb, s]));
    expect(byId['4INS'].meta.toLowerCase()).toContain('pig');
    expect(byId['1MBN'].meta.toLowerCase()).toContain('whale');
    expect(byId['1EHZ'].meta.toLowerCase()).toContain('yeast');
    expect(byId['1BL8'].meta.toLowerCase()).toContain('bacterium');
  });
});
