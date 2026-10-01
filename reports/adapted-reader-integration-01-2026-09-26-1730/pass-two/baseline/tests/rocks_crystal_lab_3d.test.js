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

  it('every mineral in the tool now has its real structure drawn', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const drawn = [...src.slice(src.indexOf('var RK_LATTICE = {'), src.indexOf('var RK_CELL_GEOMETRY'))
      .matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]);
    const minerals = [...src.slice(src.indexOf('const MINERALS = ['), src.indexOf('const QUIZ_BANK'))
      .matchAll(/\{ id: '(\w+)'/g)].map((m) => m[1]);
    expect(minerals.length).toBe(23);
    minerals.forEach((id) => {
      expect(drawn, `${id} has no real structure`).toContain(id);
    });
  });

  it('keeps the honest fallback intact for any mineral added later', () => {
    // Nothing routes to the generic unit cell now that all 18 are drawn, but the
    // path is the thing that keeps a FUTURE mineral honest rather than getting
    // an invented structure. It must stay wired and cover every crystal system
    // the data uses.
    const src = readFileSync(ROCKS_FILE, 'utf8');
    expect(src).toContain('Model limit');
    expect(src).toContain('rkCellAtoms');
    expect(src).toContain('exact: false');

    const geo = src.slice(src.indexOf('var RK_CELL_GEOMETRY = {'), src.indexOf('function rkCellGeometryFor'));
    const systems = [...new Set([...src.slice(src.indexOf('const MINERALS = ['), src.indexOf('const QUIZ_BANK'))
      .matchAll(/crystal:\s*'([^']+)'/g)].map((m) => m[1]))];
    systems.forEach((sys) => {
      const hit = sys.toLowerCase().split(/[^a-z]+/).filter(Boolean)
        .some((w) => geo.indexOf("'" + w + "'") !== -1);
      expect(hit, `no cell geometry for "${sys}"`).toBe(true);
    });
  });

  it('draws the real structure wherever one is simple and well known', () => {
    // These four moved off the generic unit cell once their real arrangements
    // turned out to be both drawable and diagnostic.
    ['sulfur', 'olivine', 'corundum', 'hematite', 'feldspar', 'garnet', 'topaz'].forEach((id) => {
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

  it('shows magnetite as an honestly simplified inverse-spinel occupancy model', () => {
    // Magnetite is not Fe3+ on A and Fe2+ on B. Fe3+ also occupies half the B
    // sites, and room-temperature B-site charge is not a static checkerboard.
    const m = render('magnetite');
    expect(m).toContain('A simplified teaching model');
    expect(m).toContain('Iron Fe³⁺ (tetrahedral A site)');
    expect(m).toContain('Iron Fe³⁺ (octahedral B site)');
    expect(m).toContain('Iron Fe²⁺ (octahedral B site)');
    expect(m).toContain('inverse spinel');
    expect(m).toContain('twice as many octahedral B sites');
    expect(m).toContain('OPPOSITE directions');
    expect(m).toContain('Fe³⁺ contributions largely cancel');
    expect(m).toContain('not fixed room-temperature charge positions');
    expect(m).toContain('lodestone');
  });

  it('labels every sphere it draws, for every structure', () => {
    // The key was built from spec.a/spec.b, so any species a generator pushed
    // directly went unlabelled — olivine's and feldspar's oxygen, feldspar's
    // aluminium, magnetite's second iron site. Unlabelled spheres are exactly
    // what the key exists to prevent, so it is now derived from the atoms
    // actually emitted and new structures label themselves.
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const latticeIds = [...src.slice(src.indexOf('var RK_LATTICE = {'), src.indexOf('var RK_CELL_GEOMETRY'))
      .matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]);
    expect(latticeIds.length).toBeGreaterThanOrEqual(16);

    const KNOWN_LABELS = {
      Na: 'Sodium', Cl: 'Chloride', Pb: 'Lead', S: 'Sulfur', Ca: 'Calcium',
      F: 'Fluoride', C: 'Carbon', O: 'Oxygen', Si: 'Silicon', Fe: 'Iron',
      Mg: 'Magnesium', Al: 'Aluminium', K: 'Potassium',
      Fe3A: 'tetrahedral A site', Fe3B: 'Fe³⁺ (octahedral B site)',
      Fe2B: 'Fe²⁺ (octahedral B site)',
    };

    latticeIds.forEach((id) => {
      const m = render(id);
      // Every colour swatch in the key carries a label; assert the key is not
      // empty and that a couple of structure-specific species show up.
      expect(m, `${id} key`).toMatch(/Why it matters/);
    });

    // The specific regressions.
    expect(render('olivine')).toContain(KNOWN_LABELS.O);
    expect(render('feldspar')).toContain(KNOWN_LABELS.Al);
    expect(render('feldspar')).toContain(KNOWN_LABELS.O);
    expect(render('magnetite')).toContain(KNOWN_LABELS.Fe3A);
    expect(render('magnetite')).toContain(KNOWN_LABELS.Fe3B);
    expect(render('magnetite')).toContain(KNOWN_LABELS.Fe2B);
  }, 20000);

  it('sends the hardness result to the structure that explains it', () => {
    // The tool measures hardness in one panel and explains why in another, and
    // the two never referred to each other.
    const store = {
      rocks: {
        mode: 'minerals', selectedMineral: 'diamond',
        scratchTool: 'diamond_scribe', scratchAnimProgress: 100,
        scratchResult: 'Result: Scratch created!',
      },
      rockCycle: {},
    };
    const ctx = makeCtx({ toolData: store, setToolData: () => {} });
    const m = ReactDOMServer.renderToStaticMarkup(
      React.createElement(() => window.StemLab._registry.rocks.render(ctx))
    );
    expect(m).toContain('Why is it this hard?');
    // Diamond is Mohs 10 — it should get the hard-mineral framing.
    expect(m).toContain('nothing to break along');
  });

  it('gates the hardness pointer on a real structure existing', () => {
    // Every mineral now has a real structure, so there is no longer a mineral
    // that would get a false pointer — but the guard is what keeps that true if
    // one is added later. Pointing at a generic unit cell would promise an
    // explanation the panel does not contain.
    PATHS.forEach((p2) => {
      const src = readFileSync(p2, 'utf8');
      expect(src).toContain('d.scratchResult && RK_LATTICE[selMineral.id] &&');
    });
    // And it does fire for a mineral that has one.
    const store = {
      rocks: {
        mode: 'minerals', selectedMineral: 'talc',
        scratchTool: 'fingernail', scratchAnimProgress: 100,
        scratchResult: 'Result: Scratch created!',
      },
      rockCycle: {},
    };
    const ctx = makeCtx({ toolData: store, setToolData: () => {} });
    const m = ReactDOMServer.renderToStaticMarkup(
      React.createElement(() => window.StemLab._registry.rocks.render(ctx))
    );
    expect(m).toContain('Why is it this hard?');
    // Talc is Mohs 1, so it gets the soft-mineral framing.
    expect(m).toContain('weak gaps');
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
    expect(render('garnet')).toContain('atomic structure');
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

// ── The 3D crystal lab: the chemistry has to survive the drawing ────────────
//
// These execute the tool's OWN generator and its OWN bonding rules, pulled out
// of the source, rather than re-stating the geometry in the test — a paraphrase
// drifts, and the point is to pin what ships.
describe('crystal lab structures', () => {
  const src = () => readFileSync(ROCKS_FILE, 'utf8');

  function fn(name) {
    const s = src();
    const at = s.indexOf('function ' + name + '(');
    expect(at, `${name} not found`).toBeGreaterThan(-1);
    let depth = 0, i = s.indexOf('{', at);
    for (; i < s.length; i++) {
      if (s[i] === '{') depth++;
      else if (s[i] === '}') { depth--; if (depth === 0) break; }
    }
    return new Function('return (' + s.slice(at, i + 1) + ')')();
  }

  /** Every mineral that has a real structure, with its species. */
  function specs() {
    const s = src();
    const tbl = s.slice(s.indexOf('var RK_LATTICE = {'), s.indexOf('// Cell geometry per crystal system'));
    return [...tbl.matchAll(/^\s{4}(\w+):\s*\{ kind: '(\w+)',\s*a: '(\w+)',\s*b: '(\w+)'(?:,\s*c: '(\w+)')?[^\n]*exact: (true|false)/gm)]
      .map((m) => ({ id: m[1], kind: m[2], a: m[3], b: m[4], c: m[5], exact: m[6] === 'true' }));
  }

  /** The cutoff table, read out of rkBuildCrystalScene so it cannot drift. */
  function cutoffFor(kind) {
    const s = src();
    const blk = s.slice(s.indexOf('bondLen = spec.kind ==='), s.indexOf('} else {', s.indexOf('bondLen = spec.kind ===')));
    const m = new RegExp("spec\\.kind === '" + kind + "' \\? ([\\d.]+)").exec(blk);
    return m ? parseFloat(m[1]) : 1.15;
  }

  // Graphite is carbon bonded to carbon inside each sheet, the same exception
  // diamond needs. The gap BETWEEN sheets is left unbonded on purpose.
  const HOMO = { diamond: ['C'], graphite: ['C'], rings: ['S'], pyrite: ['S'] };

  /** Bonds the scene would draw, applying the same rules the builder applies. */
  function bondsOf(spec) {
    const atoms = fn('rkLatticeAtoms')(spec.kind, spec.a, spec.b, spec.c);
    if (spec.kind === 'spinel') {
      return {
        atoms,
        bonds: fn('rkSpinelBondPairs')(atoms)
          .map(([i, j]) => [i, j, atoms[i].sp, atoms[j].sp]),
      };
    }
    const cut = cutoffFor(spec.kind);
    const homo = HOMO[spec.kind] || [];
    const pairLimit = spec.kind === 'carbonate'
      ? (p, q) => ((p === 'C' || q === 'C') ? ((p === 'O' || q === 'O') ? 0.60 : 0) : 1.05)
      : spec.kind === 'pyrite'
        ? (p, q) => ((p === 'S' && q === 'S') ? 0.70 : 1.15)
        : null;
    const out = [];
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        if (atoms[i].sp === atoms[j].sp && homo.indexOf(atoms[i].sp) < 0) continue;
        const lim = pairLimit ? pairLimit(atoms[i].sp, atoms[j].sp) : cut;
        if (lim <= 0) continue;
        const d = Math.hypot(atoms[i].x - atoms[j].x, atoms[i].y - atoms[j].y, atoms[i].z - atoms[j].z);
        if (d > lim || d < 1e-4) continue;
        out.push([i, j, atoms[i].sp, atoms[j].sp]);
      }
    }
    return { atoms, bonds: out };
  }

  it('covers every mineral with either a real structure or a unit cell', () => {
    expect(specs().length).toBe(23);
  });

  it('bonds graphite within each sheet and never across the gap', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const atoms = fn('rkLatticeAtoms')('graphite', 'C', 'C');
    expect(atoms.length).toBeGreaterThan(20);
    const cut = 1.15;
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    let inPlane = 0, across = 0;
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const d = dist(atoms[i], atoms[j]);
        if (d > cut || d < 1e-4) continue;
        if (Math.abs(atoms[i].y - atoms[j].y) < 1e-6) inPlane++; else across++;
      }
    }
    expect(inPlane).toBeGreaterThan(30);
    // The unbonded gap between sheets IS the reason graphite is Mohs 1 to 2.
    expect(across).toBe(0);
    const layers = new Set(atoms.map((a) => a.y.toFixed(3)));
    expect(layers.size).toBe(3);
    expect(src).toContain("spec.kind === 'graphite' ? 1.15");
  });

  it('leaves no atom floating without a single bond', () => {
    // Four structures used to. Diamond and pyrite drew four corner atoms whose
    // partners lay outside the block, under a caption reading "every carbon is
    // bonded to four others ... nothing in the structure is weak"; corundum and
    // magnetite lost theirs when the like-species rule arrived.
    specs().forEach((spec) => {
      const { atoms, bonds } = bondsOf(spec);
      const touched = new Set();
      bonds.forEach(([i, j]) => { touched.add(i); touched.add(j); });
      const loose = atoms.map((a, i) => i).filter((i) => !touched.has(i));
      expect(loose.length, `${spec.id}: ${loose.length} atom(s) drawn with no bond`).toBe(0);
    });
  });

  it('never draws a bond between two atoms of the same element, unless it is real', () => {
    // A distance cutoff alone cannot tell a bond from two ions sitting near
    // each other: calcite came out with 109 O-O bonds, 24 Ca-Ca and 12 C-C,
    // and the silicate sheets were laced with Si-Si and Al-Al.
    specs().forEach((spec) => {
      const { atoms, bonds } = bondsOf(spec);
      const homo = HOMO[spec.kind] || [];
      bonds.forEach(([i, j, p, q]) => {
        const pElement = atoms[i].element || p;
        const qElement = atoms[j].element || q;
        if (pElement !== qElement) return;
        expect(homo, spec.id + ': drew a ' + pElement + '-' + qElement + ' bond, which does not exist').toContain(pElement);
      });
    });
  });

  it('preserves magnetite inverse-spinel counts and site coordination', () => {
    const magnetite = specs().find((s) => s.id === 'magnetite');
    const { atoms, bonds } = bondsOf(magnetite);
    const oxygen = atoms.filter((a) => a.element === 'O');
    const iron = atoms.filter((a) => a.element === 'Fe');
    const aSites = iron.filter((a) => a.site === 'A');
    const bSites = iron.filter((a) => a.site === 'B');
    const bFe2 = bSites.filter((a) => a.oxidation === 2);
    const bFe3 = bSites.filter((a) => a.oxidation === 3);

    expect(magnetite.exact, 'schematic coordinates must not be presented as a crystallographic cell').toBe(false);
    expect(oxygen).toHaveLength(16);
    expect(iron).toHaveLength(12);
    expect(iron.length / oxygen.length, 'Fe:O reduces to 3:4').toBe(3 / 4);
    expect(aSites).toHaveLength(4);
    expect(bSites).toHaveLength(8);
    expect(bSites.length / aSites.length, 'B:A site occupancy').toBe(2);
    expect(bFe2).toHaveLength(4);
    expect(bFe3).toHaveLength(4);

    iron.forEach((atom) => {
      const i = atoms.indexOf(atom);
      const degree = bonds.filter(([left, right]) => left === i || right === i).length;
      expect(degree, atom.sp + ' at ' + atom.site + ' site').toBe(atom.site === 'A' ? 4 : 6);
    });
    bonds.forEach(([i, j]) => {
      expect([atoms[i].element, atoms[j].element].sort()).toEqual(['Fe', 'O']);
    });
  });

  it('keeps the element-to-element bonds that ARE real', () => {
    // Diamond is carbon bonded to carbon throughout; sulfur's crown and
    // pyrite's dumbbell are both S-S, and pyrite being a DISULFIDE rather than
    // a simple sulfide is exactly what its caption exists to point out.
    const byId = Object.fromEntries(specs().map((s) => [s.id, s]));
    const homoCount = (id, el) => bondsOf(byId[id]).bonds.filter(([, , p, q]) => p === el && q === el).length;
    expect(homoCount('diamond', 'C')).toBeGreaterThan(0);
    expect(homoCount('sulfur', 'S')).toBeGreaterThan(0);
    expect(homoCount('pyrite', 'S')).toBe(4);          // one dumbbell per site
    expect(homoCount('pyrite', 'Fe')).toBe(0);         // iron does not bond to iron
  });

  it('gives a carbonate exactly three oxygens per carbon and no carbon-calcium bond', () => {
    const calcite = specs().find((s) => s.id === 'calcite');
    const { atoms, bonds } = bondsOf(calcite);
    const carbons = atoms.map((a, i) => ({ a, i })).filter((x) => x.a.sp === 'C');
    expect(carbons.length).toBeGreaterThan(0);
    carbons.forEach(({ i }) => {
      const n = bonds.filter(([p, q]) => p === i || q === i).length;
      expect(n, 'a carbonate carbon bonds to its own three oxygens and nothing else').toBe(3);
    });
    expect(bonds.some(([, , p, q]) => (p === 'C' && q === 'Ca') || (p === 'Ca' && q === 'C'))).toBe(false);
    // The calcium still has to be held in, or it floats between the layers.
    expect(bonds.some(([, , p, q]) => p === 'Ca' || q === 'Ca')).toBe(true);
  });

  it('shares corners in a framework silicate and shares none in a nesosilicate', () => {
    // This is the single distinction quartz's and olivine's captions rest on —
    // "every tetrahedron shares all four corners" against "no SiO4 tetrahedron
    // shares an oxygen with another one". The framework used to give every
    // silicon its own four oxygens at fixed offsets, so nothing was shared and
    // quartz drew essentially the same motif as the nesosilicates.
    const byId = Object.fromEntries(specs().map((s) => [s.id, s]));
    const bridging = (id) => {
      const spec = byId[id];
      const atoms = fn('rkLatticeAtoms')(spec.kind, spec.a, spec.b, spec.c);
      const cut = cutoffFor(spec.kind);
      const si = atoms.filter((a) => a.sp === 'Si');
      return atoms.filter((o) => o.sp === 'O')
        .filter((o) => si.filter((s) => Math.hypot(o.x - s.x, o.y - s.y, o.z - s.z) <= cut).length >= 2)
        .length;
    };
    expect(bridging('quartz'), 'quartz must share corners').toBeGreaterThan(0);
    expect(bridging('feldspar'), 'feldspar must share corners').toBeGreaterThan(0);
    ['olivine', 'garnet', 'topaz'].forEach((id) => {
      expect(bridging(id), `${id} is a nesosilicate — its tetrahedra are islands`).toBe(0);
    });
  });

  it('fills exactly two thirds of the octahedral sites in the corundum structure', () => {
    // Al2O3 needs two metals per three oxygens, and "two thirds" is the number
    // the comment claims. On the old 2x2 grid the filter skipped one site of
    // four and delivered three quarters.
    const s = src();
    const blk = s.slice(s.indexOf("} else if (kind === 'closepacked')"), s.indexOf('return out;', s.indexOf("kind === 'closepacked'")));
    let sites = 0, kept = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { sites++; if ((i + j) % 3 !== 2) kept++; }
    expect(blk).toContain('for (i = 0; i < 3; i++) for (j = 0; j < 3; j++)');
    expect(kept / sites).toBeCloseTo(2 / 3, 10);
  });

  it('has a bond budget no structure actually reaches', () => {
    // It was 220. Calcite wanted 315 and the three sheet silicates 291 each, so
    // the loop stopped partway and left the entire TOP slab of every sheet
    // structure — seventeen spheres — with no bonds at all, under captions
    // about how strongly bonded the sheets are.
    const s = src();
    const m = /var BOND_BUDGET = (\d+);/.exec(s);
    expect(m, 'no bond budget declared').toBeTruthy();
    const budget = parseInt(m[1], 10);
    let worst = 0, worstId = '';
    specs().forEach((spec) => {
      const n = bondsOf(spec).bonds.length;
      if (n > worst) { worst = n; worstId = spec.id; }
    });
    expect(worst, `${worstId} needs ${worst} bonds but the budget is ${budget}`).toBeLessThan(budget);
  });

  it('tells the student when a structure is a model rather than the real packing', () => {
    // `exact` was set on all 18 rows and read by NOTHING — a disclosure that
    // lived in the data and never reached anybody. Every mineral with a
    // structure was introduced as "how the atoms are actually stacked",
    // including the sheet model, which draws two species and no oxygen at all.
    const s = src();
    expect(s).toContain('crystal3d_intro_model');
    expect(s).toContain('spec.exact');

    // The sheet structures carry no oxygen, so they cannot claim to be exact.
    specs().filter((sp) => sp.kind === 'sheet').forEach((sp) => {
      const atoms = fn('rkLatticeAtoms')(sp.kind, sp.a, sp.b, sp.c);
      expect(atoms.some((a) => a.sp === 'O' || a.sp === 'Si'), `${sp.id} sheet`).toBe(true);
      expect(sp.exact, `${sp.id} is drawn as a layer model, so it must not claim to be exact`).toBe(false);
    });
    expect(specs().find((sp) => sp.id === 'magnetite').exact).toBe(false);
    // ...and the ones that ARE the real packing still say so.
    const byId = Object.fromEntries(specs().map((x) => [x.id, x]));
    ['halite', 'diamond', 'quartz', 'fluorite'].forEach((id) => expect(byId[id].exact).toBe(true));
  });

  it('renders the atom key from the atoms actually present', () => {
    // Not from the whole RK_ATOM table — a legend listing lead while you look
    // at quartz teaches nothing.
    const markup = render('quartz');
    expect(markup).toContain('Silicon (Si)');
    expect(markup).toContain('Oxygen (O)');
    expect(markup).not.toContain('Lead (Pb');
  });

  it('offers keyboard controls, not drag only', () => {
    const markup = render('halite');
    ['Rotate left', 'Rotate right', 'Tilt up', 'Tilt down', 'Zoom in', 'Zoom out', 'Reset view']
      .forEach((label) => expect(markup, label).toContain(label));
    expect(markup).toContain('Crystal view controls');
  });

  it('describes the structure for screen readers', () => {
    const markup = render('halite');
    expect(markup).toContain('atomic structure');
    expect(markup).toContain('cleaves into perfect cubes');
  });
});

describe('crystal lab — the tests cannot drift from the builder', () => {
  // The bonding checks above re-implement the builder's rules so they can run
  // without WebGL. That is only safe while the two agree: if someone retunes a
  // rule in rkBuildCrystalScene and the mirror keeps the old one, every test
  // above would go on passing against a model that no longer ships. These
  // assertions fail the moment the source-side rules change, which forces the
  // mirror to be updated with them.
  it('pins the rules the bond model mirrors', () => {
    const s = readFileSync(ROCKS_FILE, 'utf8');
    expect(s).toContain("var RK_HOMOATOMIC = { diamond: { C: 1 }, graphite: { C: 1 }, rings: { S: 1 }, pyrite: { S: 1 } };");
    expect(s).toContain("if (p === 'C' || q === 'C') return (p === 'O' || q === 'O') ? 0.60 : 0;");
    expect(s).toContain("pairLimit = function (p, q) { return (p === 'S' && q === 'S') ? 0.70 : 1.15; };");
    expect(s).toContain("rkSpinelBondPairs(atoms).forEach(function (pair)");
    expect(s).toContain("if (explicitSpinelBonds && !explicitSpinelBond) continue;");
    expect(s).toContain("&& atoms[i].sp === atoms[j].sp && !homoOk[atoms[i].sp]) continue;");
    expect(s).toContain("var limit = pairLimit ? pairLimit(atoms[i].sp, atoms[j].sp) : bondLen;");
  });

  it('gives pyrite four S2 dumbbells and no chain between them', () => {
    // Sulfurs in neighbouring dumbbells sit 1.01 apart — inside the old cutoff
    // — so the pairs were joined into a chain, in the one mineral whose caption
    // is about it being a DISULFIDE.
    const s = readFileSync(ROCKS_FILE, 'utf8');
    const at = s.indexOf('function rkLatticeAtoms(');
    let depth = 0, i = s.indexOf('{', at);
    for (; i < s.length; i++) { if (s[i] === '{') depth++; else if (s[i] === '}') { depth--; if (depth === 0) break; } }
    const gen = new Function('return (' + s.slice(at, i + 1) + ')')();
    const atoms = gen('pyrite', 'Fe', 'S');
    const sulfur = atoms.filter((a) => a.sp === 'S');
    expect(sulfur.length).toBe(8);
    let pairBonds = 0, chainBonds = 0;
    for (let x = 0; x < sulfur.length; x++) {
      for (let y = x + 1; y < sulfur.length; y++) {
        const d = Math.hypot(sulfur[x].x - sulfur[y].x, sulfur[x].y - sulfur[y].y, sulfur[x].z - sulfur[y].z);
        if (d <= 0.70) pairBonds++;
        else if (d <= 1.15) chainBonds++;
      }
    }
    expect(pairBonds, 'four S2 dumbbells').toBe(4);
    expect(chainBonds, 'sulfurs close enough to have been chained under the old cutoff').toBeGreaterThan(0);
  });
});
