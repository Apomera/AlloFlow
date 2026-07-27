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

  it('names the right cause when the HOST is too old, not the network', () => {
    // Two failures need two answers. A blocked CDN is something a school can
    // fix; a host module older than the tool — its deploy mirror can lag the
    // root, which is exactly the situation in the current build — is a deploy
    // problem no amount of network access helps with. Simulate the stale host
    // by removing makeBayViewer BEFORE the tool module evaluates, since that is
    // when the tool decides.
    resetStemLab();
    delete window.StemLab.makeBayViewer;
    loadTool(ROCKS_FILE, 'rocks');

    const store = { rocks: { mode: 'minerals', selectedMineral: 'halite' }, rockCycle: {} };
    const ctx = makeCtx({ toolData: store, setToolData: () => {} });
    const m = ReactDOMServer.renderToStaticMarkup(
      React.createElement(() => window.StemLab._registry.rocks.render(ctx))
    );

    expect(m).toContain('3D unavailable');
    expect(m).toContain('host is older than this tool');
    // ...and it must NOT blame the network in that case.
    expect(m).not.toContain('a CDN your network may block');
  });

  it('still blames the network when the host is fine', () => {
    // The harness provides makeBayViewer, so this is the healthy-host path:
    // 3D may still fail because the engine itself is CDN-served.
    const m = render('halite');
    expect(m).toContain('a CDN your network may block');
    expect(m).not.toContain('3D unavailable');
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
    // Garnet, magnetite and topaz have genuinely complex structures;
    // drawing an invented one would look authoritative and be wrong.
    ['garnet', 'magnetite', 'topaz'].forEach((id) => {
      const m = render(id);
      expect(m, id).toContain('Model limit');
      expect(m, id).toContain('not this mineral');
      expect(m, id).toContain('unit cell');
    });
  });

  it('draws the real structure wherever one is simple and well known', () => {
    // These four moved off the generic unit cell once their real arrangements
    // turned out to be both drawable and diagnostic.
    ['sulfur', 'olivine', 'corundum', 'hematite', 'feldspar'].forEach((id) => {
      const m = render(id);
      expect(m, id).toContain('how the atoms are actually stacked');
      expect(m, id).not.toContain('Model limit');
    });
  });

  it('ties each new structure to the property it explains', () => {
    // Sulfur: strong bonds inside an S8 crown, almost nothing between crowns.
    expect(render('sulfur')).toContain('Mohs 2');
    expect(render('sulfur')).toContain('115');
    // Olivine: island tetrahedra, so no cleavage plane and fast weathering.
    expect(render('olivine')).toContain('no good cleavage');
    expect(render('olivine')).toContain('weathers away faster');
    // Corundum and hematite share an architecture but differ in bond strength —
    // the instructive pair, like halite/galena.
    expect(render('corundum')).toContain('Mohs 9');
    expect(render('hematite')).toContain('same close-packed architecture');
    expect(render('hematite')).toContain('Mohs 6');
  });

  it('draws the generic cell as a box, not a scribble', () => {
    // Bonding every pair within a cutoff is right for an atomic structure and
    // wrong for a unit cell: it drew the face and body diagonals too, which hid
    // the one thing this fallback exists to show. A cubic cell and a sheared
    // monoclinic one were indistinguishable. Corners now connect along the
    // twelve EDGES only — neighbours differing in exactly one axis index.
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src).toContain('sp: \'X\', cell: true, i: i, j: j, k: k');
      expect(src).toContain('if (steps !== 1) continue;');
    });
  });

  it('makes the crystal systems visually distinguishable', () => {
    // Real axis ratios differ by a few percent, which at this view's auto-fit
    // scale renders every system as the same cube. The claim is equal-vs-unequal
    // and right-angled-vs-inclined, so those are drawn legibly.
    const src = readFileSync(PATHS[0], 'utf8');
    const block = src.slice(src.indexOf('var RK_CELL_GEOMETRY = {'), src.indexOf('function rkCellGeometryFor'));
    const row = (name) => {
      const m = new RegExp("'" + name + "':\\s*\\{ ax: \\[([\\d.]+), ([\\d.]+), ([\\d.]+)\\],\\s*shear: ([\\d.]+)").exec(block);
      expect(m, name).toBeTruthy();
      return { ax: [+m[1], +m[2], +m[3]], shear: +m[4] };
    };
    const cubic = row('cubic');
    const ortho = row('orthorhombic');
    const mono = row('monoclinic');
    const rhomb = row('rhombohedral');

    // Cubic: equal axes, no shear.
    expect(new Set(cubic.ax).size).toBe(1);
    expect(cubic.shear).toBe(0);
    // Orthorhombic: unequal axes, still square corners — and the spread has to
    // be big enough to actually see.
    expect(new Set(ortho.ax).size).toBe(3);
    expect(ortho.shear).toBe(0);
    expect(Math.max(...ortho.ax) / Math.min(...ortho.ax)).toBeGreaterThan(2);
    // Monoclinic: unequal AND inclined.
    expect(mono.shear).toBeGreaterThan(0.3);
    // Rhombohedral: three EQUAL axes, none at right angles — that is its
    // definition, so equal lengths with a shear.
    expect(new Set(rhomb.ax).size).toBe(1);
    expect(rhomb.shear).toBeGreaterThan(0.3);
  });

  it('keeps sulfur rings unbonded to each other', () => {
    // The bond cutoff has to sit above the S-S distance inside a crown and below
    // the gap between crowns. If rings bond to each other the picture says the
    // opposite of the caption, which is the entire molecular-crystal lesson.
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src).toContain("spec.kind === 'rings' ? 1.15");
      expect(src).toContain('these offsets keep the closest inter-ring pair near 1.9');
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
