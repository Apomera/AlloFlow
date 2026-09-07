// Two defects found by screenshotting all seven Geology Explorer scenes in real WebGL
// (headless Chromium + SwiftShader), neither of which any assertion could have seen:
//
//  1. Crystal cavern and Deep Earth keep their ENTIRE teaching payload inside the block,
//     so both opened as a featureless cube. They now arrive part-cut at the mid-plane.
//  2. Boosting a molten voxel with multiplyScalar clips the red channel first, so a
//     saturated orange slid toward cream: the LIQUID outer core and the SOLID inner core
//     rendered the same colour, in the one scene built to tell them apart. The glow now
//     raises lightness in HSL, and the scene light no longer sits in the ACES shoulder.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const deployPath = path.join(root, 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_geologyexplorer.js');
const source = fs.readFileSync(sourcePath, 'utf8');

let P;
beforeAll(() => {
  window.StemLab = { registerTool() {}, isRegistered() { return false; } };
  delete window.__alloGeologyPure;
  // eslint-disable-next-line no-new-func
  new Function(source)();
  P = window.__alloGeologyPure;
  if (!P) throw new Error('geology pure hook not exposed');
});
beforeEach(() => { P.setScene('crust'); P.setGrid('standard'); });

const INTERIOR = ['geode', 'deepEarth'];

describe('Geology Explorer — scenes whose science is inside the block open part-cut', () => {
  it('opens only the two interior scenes, and leaves every cross-section scene whole', () => {
    P.scenes().forEach((id) => {
      const cut = P.sceneOpeningCutaway(id, P.grid().NZ);
      if (INTERIOR.includes(id)) expect(cut, id).toBeGreaterThan(0);
      else expect(cut, id).toBe(0);
    });
  });

  it('cuts just past the middle at every detail level, so the cross-section is the widest one', () => {
    ['low', 'standard', 'high'].forEach((res) => {
      P.setGrid(res);
      const depth = P.grid().NZ;
      INTERIOR.forEach((id) => {
        const cut = P.sceneOpeningCutaway(id, depth);
        expect(cut, id + '/' + res).toBe(Math.floor((depth - 1) / 2));
        expect(cut).toBeLessThan(depth);
      });
    });
  });

  it('★never cuts past the centre plane — a hidden voxel is not solid ground, and the walker is seeded there', () => {
    ['low', 'standard', 'high'].forEach((res) => {
      P.setGrid(res);
      const { NZ } = P.grid();
      // The engine keeps a voxel when z < NZ - sliceZ.
      const centreZ = P.fpWorldToVoxel(0, 0, 0).z;
      INTERIOR.forEach((id) => {
        expect(centreZ, id + '/' + res).toBeLessThan(NZ - P.sceneOpeningCutaway(id, NZ));
      });
    });
  });

  it('is defensive about junk input', () => {
    expect(P.sceneOpeningCutaway('crust', 14)).toBe(0);
    expect(P.sceneOpeningCutaway(null, 14)).toBe(0);
    expect(P.sceneOpeningCutaway('geode', 0)).toBe(0);
    expect(P.sceneOpeningCutaway('geode', NaN)).toBe(0);
    expect(P.sceneOpeningCutaway('geode', 1)).toBe(0);
  });

  it('is applied on arrival and on a scene switch, but never over a cut the learner made', () => {
    expect(source).toContain('var openingCutaway = sliceRef.current ? sliceRef.current : sceneOpeningCutaway(scene, NZ);');
    expect(source).toContain('if (openingCutaway !== sliceRef.current) setSlice(openingCutaway);');
    expect(source).toContain('setSlice(sceneOpeningCutaway(sid, NZ));');
    expect(source).toContain('var sliceRef = React.useRef(0); sliceRef.current = slice;');
    // the reset button still returns the block to whole
    expect(source).toContain("'↺ ' + t('stem.geology.reset', 'Reset')");
  });
});

describe('Geology Explorer — a landmark the learner picks is actually on screen', () => {
  // The crust's pluton lives only in the middle z-slices, so the "Cross-cutting pluton"
  // beacon switched to the front view and highlighted a face with no pluton in it.
  const Z_UNIFORM = ['subduction', 'ridge', 'hotspot', 'collision'];

  it('leaves every z-uniform cross-section scene uncut — their materials already reach the front face', () => {
    ['low', 'standard', 'high'].forEach((res) => {
      P.setGrid(res);
      Z_UNIFORM.forEach((id) => {
        P.setScene(id);
        P.sceneVoxelKeys(id).forEach((key) => {
          expect(P.revealCutawayFor(id, key), id + '/' + key + '/' + res).toBe(0);
        });
      });
    });
  });

  it('cuts back for the crust features that are interior-only, and not for the layers that are not', () => {
    P.setScene('crust');
    ['intrusion', 'marble', 'hornfels'].forEach((key) => {
      expect(P.revealCutawayFor('crust', key), key).toBeGreaterThan(0);
    });
    ['soil', 'sandstone', 'shale', 'limestone', 'basement', 'magma'].forEach((key) => {
      expect(P.revealCutawayFor('crust', key), key).toBe(0);
    });
  });

  it('★the cut it chooses really does expose the material on the front face', () => {
    ['low', 'standard', 'high'].forEach((res) => {
      P.setGrid(res);
      const { NX, NY, NZ } = P.grid();
      P.scenes().forEach((id) => {
        P.setScene(id);
        const gen = { crust: P.rockKeyAt, geode: P.geodeKeyAt, deepEarth: P.deepEarthKeyAt, subduction: P.subductionKeyAt, ridge: P.ridgeKeyAt, hotspot: P.hotspotKeyAt, collision: P.collisionKeyAt }[id];
        P.sceneVoxelKeys(id).forEach((key) => {
          const cut = P.revealCutawayFor(id, key);
          const frontVisibleZ = NZ - cut - 1;          // the engine keeps voxels with z < NZ - sliceZ
          let found = false;
          for (let x = 0; x < NX && !found; x++) for (let y = 0; y < NY; y++) if (gen(x, y, frontVisibleZ) === key) { found = true; break; }
          expect(found, id + '/' + key + '/' + res + ' cut=' + cut).toBe(true);
        });
      });
    });
  });

  it('never cuts past the centre plane, so the first-person walker keeps its ground', () => {
    ['low', 'standard', 'high'].forEach((res) => {
      P.setGrid(res);
      const { NZ } = P.grid();
      const centreZ = P.fpWorldToVoxel(0, 0, 0).z;
      P.scenes().forEach((id) => {
        P.setScene(id);
        P.sceneVoxelKeys(id).forEach((key) => {
          expect(centreZ, id + '/' + key).toBeLessThan(NZ - P.revealCutawayFor(id, key));
        });
      });
    });
  });

  it('is defensive, and only ever opens the block further', () => {
    expect(P.revealCutawayFor('crust', null)).toBe(0);
    expect(P.revealCutawayFor('nope', 'intrusion')).toBe(0);
    expect(P.revealCutawayFor('crust', 'not-a-material')).toBe(0);
    expect(source).toContain('beaconReveal = revealCutawayFor(SCENE.id, beacon.key);');
    expect(source).toContain('if (beaconReveal > sliceRef.current) {');
    // The announcement now routes through the translator, so a screen reader speaks it in
    // the user's language. What this test cares about is unchanged: the "cut back" sentence
    // is appended only when the cutaway actually moved.
    expect(source).toContain("cut: beaconReveal ? ' ' + t('stem.geology.sr.cut_back_to_expose', 'Cut back to expose it.') : ''");
    expect(source).toContain("tf('stem.geology.sr.beacon_focus', '{label}. {detail}{cut}'");
  });
});

describe('Geology Explorer — every scene is whole at every detail level', () => {
  // ★Found by the exposure test above: the mid-ocean ridge's axial zone (d < 0.045) and vent
  // band (0.09 < d < 0.14) are fractions of world WIDTH, and at Low detail the column spacing
  // is 1/9 = 0.111 — wider than either window — so no column landed inside them. The scene
  // had no magma lens and no black smoker on a low-end device, which is exactly where its own
  // mission step 1, its axis-melt beacon and its sequence challenge all point.
  const GEN = (P_, id) => ({ crust: P_.rockKeyAt, geode: P_.geodeKeyAt, deepEarth: P_.deepEarthKeyAt, subduction: P_.subductionKeyAt, ridge: P_.ridgeKeyAt, hotspot: P_.hotspotKeyAt, collision: P_.collisionKeyAt }[id]);

  it('generates every material it declares, in every scene, at every detail level', () => {
    ['low', 'standard', 'high'].forEach((res) => {
      P.setGrid(res);
      const { NX, NY, NZ } = P.grid();
      P.scenes().forEach((id) => {
        P.setScene(id);
        const gen = GEN(P, id);
        const seen = new Set();
        for (let x = 0; x < NX; x++) for (let y = 0; y < NY; y++) for (let z = 0; z < NZ; z++) seen.add(gen(x, y, z));
        P.sceneVoxelKeys(id).forEach((key) => {
          expect(seen.has(key), 'missing ' + id + '/' + key + ' at ' + res).toBe(true);
        });
      });
    });
  });

  it('keeps every material a mission, beacon or field run names inside its own scene', () => {
    // Sequence challenges deliberately use narrative ids in places (crust 'pluton'/'rim',
    // geode 'cavity'), so they are not checked here — these three are material keys by contract.
    P.setGrid('low');
    const missions = P.missions(), runs = P.fieldExpeditions();
    let checked = 0;
    P.scenes().forEach((id) => {
      P.setScene(id);
      const keys = new Set(P.sceneVoxelKeys(id));
      (missions[id].signal ? missions[id].signal.steps : []).forEach((step) => {
        checked++; expect(keys.has(step.key), id + ' signal step ' + step.key).toBe(true);
      });
      P.sceneBeacons(id).forEach((b) => { checked++; expect(keys.has(b.key), id + ' beacon ' + b.key).toBe(true); });
      (runs[id] || []).forEach((run) => run.targets.forEach((k) => { checked++; expect(keys.has(k), id + ' field run ' + k).toBe(true); }));
    });
    expect(checked).toBeGreaterThan(50);   // the gate is worthless if it silently checks nothing
  });

  it('the ridge axis and vent are at least one column wide, so a coarse grid cannot step over them', () => {
    ['low', 'standard', 'high'].forEach((res) => {
      P.setGrid(res); P.setScene('ridge');
      const { NX, NY, NZ } = P.grid();
      const cols = { axialMagma: new Set(), vent: new Set() };
      for (let x = 0; x < NX; x++) for (let y = 0; y < NY; y++) for (let z = 0; z < NZ; z++) {
        const k = P.ridgeKeyAt(x, y, z);
        if (cols[k]) cols[k].add(x);
      }
      expect(cols.axialMagma.size, 'axis columns at ' + res).toBeGreaterThanOrEqual(1);
      expect(cols.vent.size, 'vent columns at ' + res).toBeGreaterThanOrEqual(1);
      // the axis straddles the centre; the vent sits off-axis on the right flank
      [...cols.axialMagma].forEach((x) => expect(Math.abs(x - (NX - 1) / 2), res).toBeLessThanOrEqual(1));
      [...cols.vent].forEach((x) => expect(x, res).toBeGreaterThan((NX - 1) / 2));
    });
    expect(source).toContain('var axialHalfWidth = Math.max(0.045, columnStep * 0.55);');
    expect(source).toContain('var ventInner = 0.09, ventOuter = Math.max(0.14, ventInner + columnStep * 1.05);');
  });
});

describe('Geology Explorer — a label on a material swatch is readable', () => {
  // The accessible cross-section is what carries the tool when WebGL is off, and it chose its
  // label ink by ROW INDEX. Four of six labels were unreadable: dark ink on dark brown soil
  // (1.93:1) and mid-grey shale (3.18:1), white ink on pale pink granite (2.38:1) and orange
  // magma (2.60:1). Measured by dev-tools/pixel_contrast_probe.cjs, not by eye.
  const ratio = (lumA, lumB) => (Math.max(lumA, lumB) + 0.05) / (Math.min(lumA, lumB) + 0.05);

  it('picks whichever ink actually has more contrast, for every material in every scene', () => {
    let checked = 0;
    P.scenes().forEach((id) => {
      P.setScene(id);
      P.sceneVoxelKeys(id).forEach((key) => {
        const swatch = P.rockFacts(key, 1).R.color;
        const ink = P.readableInkOn(swatch);
        expect(['#0f172a', '#ffffff'], id + '/' + key).toContain(ink);
        const measured = ratio(P.relativeLuminance(swatch), P.relativeLuminance(parseInt(ink.slice(1), 16)));
        expect(measured, id + '/' + key + ' on ' + ink).toBeGreaterThanOrEqual(4.5);
        checked++;
      });
    });
    expect(checked).toBeGreaterThan(50);
  });

  it('agrees with hand-computed luminance at the ends of the range', () => {
    expect(P.readableInkOn(0xffffff)).toBe('#0f172a');
    expect(P.readableInkOn(0x000000)).toBe('#ffffff');
    expect(P.readableInkOn(0x6b4f2a)).toBe('#ffffff');   // soil: was dark ink at 1.93:1
    expect(P.readableInkOn(0xff7a33)).toBe('#0f172a');   // magma: was white ink at 2.60:1
    expect(P.relativeLuminance(0xffffff)).toBeCloseTo(1, 5);
    expect(P.relativeLuminance(0x000000)).toBeCloseTo(0, 5);
  });

  it('no longer keys the cross-section ink off the row index', () => {
    expect(source).not.toContain("fill: i >= 4 ? '#fff' : '#1e293b'");
    expect(source).toContain('fill: readableInkOn(ROCKS[k].color)');
  });
});

describe('Geology Explorer — evidence-map labels do not collide', () => {
  // Rendering all six maps found two overlaps that only a screenshot shows: the geode's
  // "Open center" sat on top of "Center later" (reading as "Centerlatecenter") and
  // subduction's "Trench" sat on top of "Oceanic plate". Both are hand-placed diagrams, so
  // the guard has to be geometric rather than a pin on the coordinates I happened to choose.
  const FONT = 13;                 // textNode() in sceneSchematicSVG
  const CHAR = 0.55 * FONT;        // conservative average advance for this face and size
  const BAND = FONT;               // lines closer than this share a row

  function labelsIn(diagramName) {
    const start = source.indexOf('function ' + diagramName + '(v) {');
    expect(start, diagramName).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf('\n      }', start));
    const out = [];
    const re = /v\.text\('([^']*)',\s*(-?[\d.]+),\s*(-?[\d.]+)(?:,\s*'(\w+)')?\)/g;
    let m;
    while ((m = re.exec(body))) {
      const [, text, xRaw, yRaw, anchor] = m;
      const x = Number(xRaw), y = Number(yRaw), width = text.length * CHAR;
      const left = anchor === 'end' ? x - width : (anchor === 'middle' ? x - width / 2 : x);
      out.push({ text, y, left, right: left + width });
    }
    return out;
  }

  it.each([
    ['geodeSchematicDiagram'],
    ['deepEarthSchematicDiagram'],
    ['subductionSchematicDiagram'],
    ['ridgeSchematicDiagram'],
    ['hotspotSchematicDiagram'],
    ['collisionSchematicDiagram'],
  ])('%s places every label clear of the others', (diagramName) => {
    const labels = labelsIn(diagramName);
    expect(labels.length).toBeGreaterThanOrEqual(4);
    for (let a = 0; a < labels.length; a++) {
      for (let b = a + 1; b < labels.length; b++) {
        const sameRow = Math.abs(labels[a].y - labels[b].y) < BAND;
        const sideBySide = labels[a].right <= labels[b].left || labels[b].right <= labels[a].left;
        expect(sameRow && !sideBySide, `"${labels[a].text}" overlaps "${labels[b].text}" in ${diagramName}`).toBe(false);
      }
    }
  });

  it('the guard is calibrated: it fails on the geometry that shipped broken', () => {
    // the geode pair as it was — same row, boxes overlapping between x278 and x323
    const openCenter = { text: 'Open center', y: 158, left: 350 - 11 * CHAR, right: 350 };
    const centerLater = { text: 'Center later', y: 160, left: 248, right: 248 + 12 * CHAR };
    expect(Math.abs(openCenter.y - centerLater.y) < BAND).toBe(true);
    expect(openCenter.right > centerLater.left && centerLater.right > openCenter.left).toBe(true);
  });
});

describe('Geology Explorer — the default scene\'s accessible cross-section', () => {
  // The crust is the scene every learner opens first, and its 2D fallback was the weakest of
  // the seven: an <svg> is a flex item like any other, so beside the teaching paragraph it was
  // squeezed from 150px to roughly a third of that, and its cross-cutting pluton — the feature
  // the mission, the quest hook and the quiz all turn on — was an unlabelled triangle.
  let svg;
  beforeAll(async () => {
    const harness = await import('./helpers/stem_widgets_smoke_harness.js');
    harness.resetStemLab();
    harness.loadTool('stem_lab/stem_tool_geologyexplorer.js', 'geologyExplorer');
    const html = harness.renderTool('geologyExplorer', {});
    const start = html.indexOf('<svg', html.indexOf('Cross-section: sedimentary layers') - 400);
    svg = html.slice(start, html.indexOf('</svg>', start) + 6);
    expect(svg).toContain('Soil / Regolith');
  });

  it('holds its intrinsic width instead of shrinking beside the paragraph', () => {
    expect(svg).toMatch(/flex:\s*0 0 auto/);
    expect(svg).toContain('width="150"');
  });

  it('names the pluton, and paints the label over the pluton rather than under it', () => {
    expect(svg).toContain('Pluton');
    const polygon = svg.indexOf('<polygon');
    const label = svg.indexOf('data-geology-cross-label="intrusion"');
    expect(polygon).toBeGreaterThan(-1);
    expect(label).toBeGreaterThan(polygon);   // later in document order = painted on top
  });

  it('inks every band from its own colour, so all six labels are readable', () => {
    const inks = [...svg.matchAll(/<text[^>]*fill="(#[0-9a-f]{6})"/g)].map((m) => m[1]);
    expect(inks.length).toBeGreaterThanOrEqual(6);
    inks.forEach((ink) => expect(['#0f172a', '#ffffff']).toContain(ink));
    expect(new Set(inks).size).toBe(2);       // both inks are in use — not one blanket choice
  });

  it('Reset returns the block to how the scene STARTS, not to a featureless cube', () => {
    // for the two interior scenes "cut = 0" is worse than the arrival state
    expect(source).toContain('var resetCut = sceneOpeningCutaway(SCENE.id, NZ); setSlice(resetCut);');
    expect(source).toContain('if (resetCut) window[ENGINE_KEY].setSlice(resetCut);');
  });
});

describe('Geology Explorer — no flattened separators in the interface copy', () => {
  // The three PRIMARY mode tabs read "Explore ? Select and orient": a literal ASCII question
  // mark where the middle dot used everywhere else in this tool belongs, so the tool's main
  // navigation looked like a broken question. The lesson-guide header had the same. Almost
  // certainly a casualty of an earlier encoding round-trip that flattened '·' to '?'.
  it('joins label halves with a middle dot, never a bare question mark', () => {
    expect(source.split("+ ' ? ' +").length - 1).toBe(0);
    expect(source.split("+ ' · ' +").length - 1).toBeGreaterThanOrEqual(23);
  });

  it('uses the real arrow in direction copy, not an ASCII substitute', () => {
    // Same flattening class, and the giveaway was two forms of the same character in the SAME
    // field on adjacent rocks: marble read '(contact metamorphism) -> recrystallised' while
    // basalt read 'at the surface → crystals too tiny to see'.
    const displayArrows = (source.match(/'[^'\n]*->[^'\n]*'/g) || [])
      .filter((s) => !/calc\(|min\(|\d\s*-\s*\d/.test(s));
    expect(displayArrows, 'ASCII arrows left in display text: ' + displayArrows.join(' | ')).toEqual([]);
    expect(source.split('→').length - 1).toBeGreaterThanOrEqual(80);
    ['Surface → depth', 'Cavity wall → center', 'Foreland → summit → plateau'].forEach((copy) => {
      expect(source, copy).toContain(copy);
    });
  });

  // The strongest evidence in this whole flattening class: a ternary whose two branches
  // are IDENTICAL. Nobody writes `x ? '?' : '?'` — two different glyphs were there and an
  // encoding round-trip collapsed both. Three of these were shipping: the quiz feedback
  // marker, the mission checklist and the CER rubric, each rendering '?' either way.
  it('has no ternary whose branches are the same flattened glyph', () => {
    const dead = source.match(/\?\s*('[^'\n]{0,3}')\s*:\s*\1/g) || [];
    expect(dead, 'dead ternaries: ' + dead.join(' | ')).toEqual([]);
  });

  it('marks pass/fail state with real glyphs, not question marks', () => {
    // The file's own convention, established at the journey list and phase list.
    expect(source).toContain("item.complete ? '✓' : '○'");
    expect(source).toContain("criterion.met ? '✓' : '○'");
    expect(source).toContain("quizAns === Q.correct ? '✓ ' : '✗ '");
    expect(source).toContain("'Next question →'");
    // A bare '? ' prefix on a list item is a flattened bullet.
    const stubBullets = (source.match(/h\('li',[^\n]{0,60}'\? '/g) || []);
    expect(stubBullets, 'flattened bullets: ' + stubBullets.join(' | ')).toEqual([]);
  });

  it('uses an em dash in the schematic caption every scene shows', () => {
    expect(source).toContain('Schematic model — not to scale.');
    expect(source).not.toContain('Schematic model - not to scale.');
  });

  it('renders the mode tabs and lesson-guide header with the dot', async () => {
    const harness = await import('./helpers/stem_widgets_smoke_harness.js');
    harness.resetStemLab();
    harness.loadTool('stem_lab/stem_tool_geologyexplorer.js', 'geologyExplorer');
    const html = harness.renderTool('geologyExplorer', {});
    ['Explore', 'Investigate', 'Assess'].forEach((mode) => {
      expect(html, mode + ' tab').toContain(mode + ' · ');
    });
    expect(html).not.toMatch(/(Explore|Investigate|Assess) \? /);
  });
});

describe('Geology Explorer — molten layers keep their hue', () => {
  it('raises glow in HSL instead of multiplying, which clipped red and washed orange to cream', () => {
    expect(source).not.toContain('col.multiplyScalar(1.5)');
    expect(source).toContain('col.getHSL(glowHsl3d);');
    expect(source).toContain('col.setHSL(glowHsl3d.h, Math.min(1, glowHsl3d.s * 1.04), Math.min(0.64, glowHsl3d.l * 1.5));');
    expect(source).toContain('var glowHsl3d = { h: 0, s: 0, l: 0 };');
  });

  it('keeps total scene light out of the tone-mapping shoulder, where the curve desaturates', () => {
    const intensity = (re) => { const m = source.match(re); if (!m) throw new Error('light not found: ' + re); return Number(m[1]); };
    const ambient = intensity(/AmbientLight\(0xffffff, ([\d.]+)\)/);
    const hemisphere = intensity(/HemisphereLight\(0xbcd4ff, 0x6b5640, ([\d.]+)\)/);
    const key = intensity(/DirectionalLight\(0xfff1d0, ([\d.]+)\)/);
    const fill = intensity(/DirectionalLight\(0x90b4ff, ([\d.]+)\)/);
    const exposure = intensity(/toneMappingExposure = SCENE\.id === 'geode' \? [\d.]+ : ([\d.]+)/);
    expect(ambient + hemisphere + key + fill).toBeLessThan(1.7);
    expect(ambient + hemisphere + key + fill).toBeGreaterThan(1.2);   // still lit, not murky
    expect(exposure).toBeLessThanOrEqual(1);
    // the four lights keep their original ratios, so the modelling is unchanged
    expect(key / ambient).toBeCloseTo(2.36, 1);
    expect(hemisphere / ambient).toBeCloseTo(1.36, 1);
  });

  it('ships the same bytes to the bundled desktop copy', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
