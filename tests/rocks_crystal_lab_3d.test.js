// 3D crystal structure lab (minerals mode).
//
// The tool teaches crystal habit and lets students test hardness, streak and
// cleavage — all consequences of how the atoms are stacked, which was never
// shown. This renders the arrangement itself.
//
// Two things matter beyond "it draws": it must degrade cleanly when the 3D
// engine cannot load (school networks block CDNs, and these tests run with no
// THREE at all), and it must say plainly when it is showing a crystal SYSTEM's
// unit cell rather than that mineral's real atomic structure.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  React,
  ReactDOMServer,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const ROCKS_FILE = 'stem_lab/stem_tool_rocks.js';
const PATHS = [
  'stem_lab/stem_tool_rocks.js',
  'desktop/web-app/public/stem_lab/stem_tool_rocks.js',
];

function render(mineralId) {
  const store = { rocks: { mode: 'minerals', selectedMineral: mineralId }, rockCycle: {} };
  const ctx = makeCtx({
    toolData: store,
    setToolData: (fnOrObj) => {
      const next = typeof fnOrObj === 'function' ? fnOrObj(store) : fnOrObj;
      Object.assign(store, next);
    },
  });
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(() => window.StemLab._registry.rocks.render(ctx))
  );
}

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
});

describe('crystal lab — offline / no-WebGL behaviour', () => {
  it('renders every mineral without throwing when THREE never loads', () => {
    // The smoke harness's loader returns a forever-pending promise, which is
    // exactly a blocked CDN. Nothing here may depend on THREE existing.
    const ids = ['quartz', 'feldspar', 'mica', 'calcite', 'halite', 'pyrite', 'talc',
      'diamond', 'magnetite', 'hematite', 'garnet', 'olivine', 'fluorite', 'galena',
      'gypsum', 'sulfur', 'corundum', 'topaz'];
    ids.forEach((id) => {
      // One render per mineral, not two — this rendered the whole tool 36 times
      // and blew the default 5s timeout when the suite ran alongside others.
      let markup;
      expect(() => { markup = render(id); }, id).not.toThrow();
      expect(markup, id).toContain('3D crystal structure');
    });
  }, 20000);

  it('tells the student what to do if the view stays blank', () => {
    expect(render('halite')).toContain('served from a CDN your network may block');
  });

  it('degrades through the host shell rather than its own loader', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      // Reuses the tested lifecycle (CDN load, context-loss retry, teardown).
      expect(src).toContain('window.StemLab && window.StemLab.makeBayViewer');
      expect(src).toContain('var RK_CRYSTAL_NULL = {');
      // No second Three.js loader hand-rolled in this file.
      expect(src).not.toContain('three.min.js');
    });
  });
});

describe('crystal lab — honesty about what is drawn', () => {
  it('draws the real arrangement for minerals whose structure is simple and known', () => {
    const halite = render('halite');
    expect(halite).toContain('how the atoms are actually stacked');
    expect(halite).not.toContain('Model limit');
    // And explains the property the structure causes.
    expect(halite).toContain('cleaves into perfect cubes');
  });

  it('says so when it is showing the system cell, not the mineral structure', () => {
    // Garnet and olivine have genuinely complex structures; drawing an invented
    // one would look authoritative and be wrong.
    ['garnet', 'olivine', 'corundum'].forEach((id) => {
      const m = render(id);
      expect(m, id).toContain('Model limit');
      expect(m, id).toContain('not this mineral');
      expect(m, id).toContain('unit cell');
    });
  });

  it('connects structure to the property it explains', () => {
    expect(render('diamond')).toContain('hardest mineral at Mohs 10');
    expect(render('talc')).toContain('softest mineral at Mohs 1');
    expect(render('mica')).toContain('peels into transparent flakes');
    expect(render('galena')).toContain('also breaks into cubes');
    // Fluorite is the instructive counter-case to halite: same cubic system,
    // different cleavage.
    expect(render('fluorite')).toContain('octahedra, not cubes');
  });
});

describe('crystal lab — interaction and labelling', () => {
  it('is drivable without a mouse', () => {
    const m = render('halite');
    ['Rotate left', 'Rotate right', 'Tilt up', 'Tilt down', 'Zoom in', 'Zoom out', 'Reset view']
      .forEach((label) => expect(m, label).toContain(label));
  });

  it('labels the atoms, so the spheres mean something', () => {
    expect(render('halite')).toContain('Sodium (Na⁺)');
    expect(render('halite')).toContain('Chloride (Cl⁻)');
    expect(render('calcite')).toContain('Carbon (C)');
    expect(render('pyrite')).toContain('Iron (Fe)');
  });

  it('describes the structure for screen readers', () => {
    expect(render('halite')).toContain('atomic structure');
    expect(render('garnet')).toContain('unit cell');
  });

  it('rebuilds when the mineral changes', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      // The host viewer builds its scene once per attach, so the container is
      // re-keyed to force React to remount it on a new mineral.
      expect(src).toContain("key: 'crystal-' + selMineral.id");
    });
  });

  it('hands the viewer an identity-stable ref', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src).toContain('function rkCrystalRef(node)');
      expect(src).toContain('ref: rkCrystalRef');
    });
  });
});

describe('crystal lab — structure data', () => {
  it('every species referenced by a structure has an atom definition', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const atomBlock = src.slice(src.indexOf('var RK_ATOM = {'), src.indexOf('var RK_LATTICE = {'));
    const known = new Set([...atomBlock.matchAll(/^\s{4}(\w+):\s*\{/gm)].map((m) => m[1]));
    expect(known.size).toBeGreaterThan(8);

    const latticeBlock = src.slice(src.indexOf('var RK_LATTICE = {'), src.indexOf('var RK_CELL_GEOMETRY'));
    [...latticeBlock.matchAll(/a:\s*'(\w+)',\s*b:\s*'(\w+)'/g)].forEach((m) => {
      expect(known.has(m[1]), `species ${m[1]} has no RK_ATOM entry`).toBe(true);
      expect(known.has(m[2]), `species ${m[2]} has no RK_ATOM entry`).toBe(true);
    });
  });

  it('covers each crystal system present in the mineral data', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const minerals = src.slice(src.indexOf('const MINERALS = ['), src.indexOf('const QUIZ_BANK'));
    const systems = [...new Set([...minerals.matchAll(/crystal:\s*'([^']+)'/g)].map((m) => m[1]))];
    const geoBlock = src.slice(src.indexOf('var RK_CELL_GEOMETRY = {'), src.indexOf('function rkCellGeometryFor'));
    systems.forEach((sys) => {
      // The resolver lower-cases and substring-matches, so at least one keyword
      // from each system string must be present.
      const hit = sys.toLowerCase().split(/[^a-z]+/).filter(Boolean)
        .some((word) => geoBlock.indexOf("'" + word + "'") !== -1);
      expect(hit, `no cell geometry matches crystal system "${sys}"`).toBe(true);
    });
  });

  it('is deterministic — no random atom placement', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const scene = src.slice(src.indexOf('function rkLatticeAtoms'), src.indexOf('var RK_CRYSTAL_NULL'));
    expect(scene).not.toContain('Math.random');
  });
});
