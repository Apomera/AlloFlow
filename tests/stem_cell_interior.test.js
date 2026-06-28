// Pure-biology tests for the cell tool's "Inside the Cell" interior view. The animated
// cross-section is Canvas-smoke-only, but the organelle catalogue that drives it (and the
// misconceptions it busts) is exact, checkable biology: bacteria have NO nucleus and no
// membrane-bound organelles but DO have ribosomes; both plant AND animal cells have
// mitochondria; only plants have chloroplasts + a cell wall; every cell has ribosomes.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let C;
beforeAll(() => {
  window.StemLab = { registerTool: function () {}, isRegistered: function () { return false; }, getRegisteredTools: function () { return []; } };
  delete window.__alloCellPure;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_cell.js'), 'utf8'))();
  C = window.__alloCellPure;
  if (!C) throw new Error('cell interior hook not exposed (window.__alloCellPure)');
});

describe('Cell — interior organelle catalogue (the biology behind the visual)', () => {
  it('bacteria (prokaryotes) have NO nucleus and no membrane-bound organelles — but DO have ribosomes', () => {
    expect(C.interiorHas('bacterium', 'nucleus')).toBe(false);       // the headline prokaryote fact
    ['mitochondria', 'chloroplast', 'roughER', 'golgi', 'lysosome', 'vacuole', 'nucleolus'].forEach((k) =>
      expect(C.interiorHas('bacterium', k)).toBe(false));
    expect(C.interiorHas('bacterium', 'ribosomes')).toBe(true);      // they still build protein
    expect(C.interiorHas('bacterium', 'nucleoid')).toBe(true);       // free DNA, not a nucleus
    expect(C.interiorHas('bacterium', 'cellWall')).toBe(true);
    expect(C.interiorHas('bacterium', 'cellMembrane')).toBe(true);
  });

  it('chloroplasts and a cell wall are PLANT-only; animal cells have neither', () => {
    expect(C.interiorHas('plant', 'chloroplast')).toBe(true);
    expect(C.interiorHas('plant', 'cellWall')).toBe(true);
    expect(C.interiorHas('plant', 'vacuole')).toBe(true);
    expect(C.interiorHas('animal', 'chloroplast')).toBe(false);
    expect(C.interiorHas('animal', 'cellWall')).toBe(false);
  });

  it('mitochondria are in BOTH plant and animal cells (not animal-only)', () => {
    expect(C.interiorHas('animal', 'mitochondria')).toBe(true);
    expect(C.interiorHas('plant', 'mitochondria')).toBe(true);
  });

  it('every cell type has ribosomes, a cell membrane and cytoplasm', () => {
    ['animal', 'plant', 'bacterium'].forEach((t) => {
      expect(C.interiorHas(t, 'ribosomes')).toBe(true);
      expect(C.interiorHas(t, 'cellMembrane')).toBe(true);
      expect(C.interiorHas(t, 'cytoplasm')).toBe(true);
    });
  });

  it('eukaryote-defining + animal-specific organelles are placed correctly', () => {
    ['nucleus', 'roughER', 'smoothER', 'golgi'].forEach((k) => {
      expect(C.interiorHas('animal', k)).toBe(true);
      expect(C.interiorHas('plant', k)).toBe(true);
      expect(C.interiorHas('bacterium', k)).toBe(false);
    });
    expect(C.interiorHas('animal', 'centriole')).toBe(true);
    expect(C.interiorHas('plant', 'centriole')).toBe(false);
    expect(C.interiorHas('animal', 'lysosome')).toBe(true);
  });

  it('interiorOrganelles + interiorLayout only ever reference organelles the cell type has', () => {
    ['animal', 'plant', 'bacterium'].forEach((t) => {
      const valid = new Set(C.interiorOrganelles(t));
      expect(valid.size).toBeGreaterThan(3);
      C.interiorLayout(t).forEach((inst) => {
        expect(C.interiorHas(t, inst.key)).toBe(true);   // no layout instance for an absent organelle
      });
    });
  });

  it('hit-testing maps a click to the organelle under it', () => {
    expect(C.interiorHitTest('animal', 0.62, 0.44)).toBe('nucleus');   // animal nucleus centre
    expect(C.interiorHitTest('bacterium', 0.5, 0.5)).toBe('nucleoid'); // bacterial DNA loop
    expect(C.interiorHitTest('plant', 0.02, 0.5)).toBe('cellWall');    // far edge → the wall
    expect(C.interiorHitTest('animal', 0.02, 0.5)).toBe('cellMembrane'); // animal has no wall → membrane
  });

  it('the misconception-busts are present on the right organelles', () => {
    expect(C.CELL_ORGANELLES.nucleoid.bust).toMatch(/nucleus|prokaryote|bacteria/i);
    expect(C.CELL_ORGANELLES.mitochondria.bust).toMatch(/energy|ATP|plant/i);
    expect(C.CELL_ORGANELLES.ribosomes.bust).toMatch(/all cells|every/i);
    expect(C.CELL_ORGANELLES.chloroplast.bust).toMatch(/plant|mitochondria/i);
  });
});
