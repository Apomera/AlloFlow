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

  it('provides expansive function, structure, and connection details for every structure', () => {
    Object.values(C.CELL_ORGANELLES).forEach((organelle) => {
      expect(organelle.fn.length).toBeGreaterThan(120);
      expect(organelle.structure.length).toBeGreaterThan(100);
      expect(organelle.connections.length).toBeGreaterThan(100);
    });
  });
  it('provides a concise visual feature key for every selectable structure', () => {
    Object.keys(C.CELL_ORGANELLES).forEach((key) => {
      expect(C.CELL_ULTRASTRUCTURE[key], key).toBeTypeOf('string');
      expect(C.CELL_ULTRASTRUCTURE[key].length, key).toBeGreaterThan(16);
    });
  });

  it('places the added ultrastructure in biologically appropriate cell types', () => {
    ['animal', 'plant'].forEach((type) => {
      expect(C.interiorHas(type, 'peroxisome')).toBe(true);
      expect(C.interiorHas(type, 'cytoskeleton')).toBe(true);
    });
    expect(C.interiorHas('bacterium', 'peroxisome')).toBe(false);
    expect(C.interiorHas('bacterium', 'cytoskeleton')).toBe(false);
    expect(C.interiorHas('plant', 'plasmodesmata')).toBe(true);
    expect(C.interiorHas('animal', 'plasmodesmata')).toBe(false);
    expect(C.interiorHas('bacterium', 'capsule')).toBe(true);
    expect(C.interiorHas('bacterium', 'pili')).toBe(true);
    expect(C.CELL_ORGANELLES.capsule.bust).toMatch(/not all|some bacteria/i);
    expect(C.CELL_ORGANELLES.pili.bust).toMatch(/not bacterial flagella|shorter/i);
  });
  it('uses shared display geometry for accurate bacterial proportions and click targeting', () => {
    const animal = C.interiorGeometry(760, 440, 'animal');
    const bacterium = C.interiorGeometry(760, 440, 'bacterium');
    expect(bacterium.RX).toBeLessThan(animal.RX);
    expect(bacterium.RY).toBeLessThan(animal.RY);

    const plasmidX = (bacterium.cx + (0.74 - 0.5) * 2 * bacterium.RX) / 760;
    const plasmidY = (bacterium.cy + (0.34 - 0.5) * 2 * bacterium.RY) / 440;
    expect(C.interiorHitTest('bacterium', plasmidX, plasmidY, 760, 440)).toBe('plasmid');
  });
  it('draws labeled cell identity, selection, section, stage, and stain annotations', () => {
    const labels = [];
    const noop = () => {};
    const context = {
      clearRect: noop, fillRect: noop, save: noop, restore: noop, beginPath: noop, closePath: noop,
      ellipse: noop, arc: noop, fill: noop, stroke: noop, clip: noop, moveTo: noop, lineTo: noop,
      bezierCurveTo: noop, quadraticCurveTo: noop, translate: noop, rotate: noop, setLineDash: noop,
      fillText(value) { labels.push(value); },
      createRadialGradient() { return { addColorStop: noop }; },
    };

    C.drawCellMicrodissection(context, 760, 440, 'plant', 0, 'cellWall', true, 4, 'laser', 62, 'fluorescence');

    expect(labels).toContain('PLANT CELL');
    expect(labels).toContain('EUKARYOTE');
    expect(labels).toContain('SCHEMATIC • NOT TO SCALE');
    expect(labels).toContain('SELECTED STRUCTURE');
    expect(labels).toContain('Cell wall');
    expect(labels).toContain('SECTION PLANE • DEPTH 62%');
    expect(labels).toContain('MICRODISSECTION PROTOCOL');
    expect(labels).toContain('STEP 5/5 • RECORD');
    expect(labels).toContain('CONTRAST LABEL • FLUORESCENCE');
    expect(labels).toContain('WALL • MEMBRANE • PLASMODESMATA');
    expect(labels).toContain('PROCESS LENS');
    expect(labels).toContain('WATER, TURGOR + CELL-TO-CELL FLOW');
    expect(labels).toContain('SUPPORTING MATRIX \u2022 POROUS LAYER');

    labels.length = 0;
    C.drawCellMicrodissection(context, 760, 440, 'bacterium', 0, 'capsule', true, 2, 'microtome', 38, 'none');
    expect(labels).toContain('BACTERIAL CELL');
    expect(labels).toContain('PROKARYOTE');
    expect(labels).toContain('CAPSULE • WALL • MEMBRANE');
    expect(labels).toContain('Capsule (some bacteria)');
    expect(labels).toContain('ENVELOPE, ATTACHMENT + MOTILITY');
    expect(labels).toContain('HYDRATED MATRIX \u2022 EXTERNAL PROTECTION');
  });
  it('the misconception-busts are present on the right organelles', () => {
    expect(C.CELL_ORGANELLES.nucleoid.bust).toMatch(/nucleus|prokaryote|bacteria/i);
    expect(C.CELL_ORGANELLES.mitochondria.bust).toMatch(/energy|ATP|plant/i);
    expect(C.CELL_ORGANELLES.ribosomes.bust).toMatch(/all cells|every/i);
    expect(C.CELL_ORGANELLES.chloroplast.bust).toMatch(/plant|mitochondria/i);
  });
});
