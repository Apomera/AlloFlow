// Thin section under a polarizing microscope.
//
// The tool had a hand-specimen view and an atomic-scale view and nothing in
// between — but the gap it skipped is where petrology actually happens. A 30 µm
// slice under crossed polars is how the minerals IN a rock get identified, and
// it is what ties the rocks mode and the minerals mode together.
//
// The physics that has to hold, or the simulation teaches the wrong thing:
//   * Isotropic and opaque grains stay black under crossed polars at EVERY
//     stage angle. That is diagnostic on its own.
//   * Anisotropic grains go dark four times per full rotation (extinction), so
//     rotating the stage MUST change the image.
//   * Plane light and crossed polars must look different — that contrast is the
//     entire reason the instrument has two modes.

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

function render(rockId, thinSection) {
  const store = {
    rocks: Object.assign({ mode: 'rocks', selectedRock: rockId }, thinSection ? { thinSection } : {}),
    rockCycle: {},
  };
  const ctx = makeCtx({ toolData: store, setToolData: () => {} });
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(() => window.StemLab._registry.rocks.render(ctx))
  );
}

/** The <svg> for the section only, so assertions are not fooled by page chrome. */
function section(markup) {
  const i = markup.indexOf('rkts-');
  if (i < 0) return '';
  const start = markup.lastIndexOf('<svg', i);
  return markup.slice(start, markup.indexOf('</svg>', start));
}

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
});

describe('thin section — coverage', () => {
  it('every rock in the tool has a section', () => {
    // conglomerate silently had none: its rock id is `conglom` but the section
    // table was keyed `conglomerate`, so the panel just never rendered for it.
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const keys = [...src.slice(src.indexOf('var RK_THIN_SECTION = {'), src.indexOf('function rkThinSectionSvg'))
      .matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]);
    const rocks = [...src.slice(src.indexOf('var RK_ROCKS = ['), src.indexOf('function rkRockSwatch('))
      .matchAll(/\{ id: '(\w+)'/g)].map((m) => m[1]);

    expect(rocks.length).toBe(20);
    rocks.forEach((id) => {
      expect(keys, `${id} has no thin section`).toContain(id);
    });
  });

  it('modal proportions add up', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const block = src.slice(src.indexOf('var RK_THIN_SECTION = {'), src.indexOf('function rkThinSectionSvg'));
    // `fabric` sits between mag and parts, so do not assume they are adjacent.
    const rows = [...block.matchAll(/(\w+):\s*\{ mag: \d+,[^[]*parts: \[([\s\S]*?)\],\s*look:/g)];
    expect(rows.length).toBe(20);
    rows.forEach((r) => {
      const fracs = [...r[2].matchAll(/,\s*([\d.]+)\]/g)].map((m) => parseFloat(m[1]));
      const sum = fracs.reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - 1), `${r[1]} proportions sum to ${sum.toFixed(2)}`).toBeLessThan(0.02);
    });
  });

  it('every mineral named in a section has optical properties', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const optics = new Set([...src.slice(src.indexOf('var RK_OPTICS = {'), src.indexOf('var RK_THIN_SECTION'))
      .matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]));
    const used = new Set([...src.slice(src.indexOf('var RK_THIN_SECTION = {'), src.indexOf('function rkThinSectionSvg'))
      .matchAll(/\['(\w+)',\s*[\d.]+\]/g)].map((m) => m[1]));
    expect(used.size).toBeGreaterThan(8);
    used.forEach((m) => expect(optics.has(m), `${m} has no RK_OPTICS entry`).toBe(true));
  });
});

describe('thin section — the optics have to be right', () => {
  it('an all-glass rock stays completely black under crossed polars', () => {
    // Obsidian is 100% volcanic glass. Glass is not crystalline, so it is
    // isotropic: no light gets through crossed polars at ANY stage angle. This
    // is the cleanest possible check that isotropy is modelled and not faked.
    for (const stage of [0, 17, 45, 68, 90]) {
      const svg = section(render('obsidian', { xpl: true, stage }));
      expect(svg, `stage ${stage}`).toBeTruthy();
      // No interference colours anywhere — every grain fill is the dark field.
      const fills = [...svg.matchAll(/<polygon[^>]*fill="([^"]+)"/g)].map((m) => m[1]);
      fills.forEach((f) => {
        expect(['#07070a'], `stage ${stage} produced ${f}`).toContain(f);
      });
    }
  });

  it('the same rock is NOT black in plane light', () => {
    // Isotropic under crossed polars is a property of the polarizers, not of the
    // grain being invisible — plane light must still show it.
    const svg = section(render('obsidian', { xpl: false, stage: 0 }));
    expect(svg).toContain('#d9d5cc');
  });

  it('rotating the stage changes the crossed-polars image', () => {
    // Extinction only exists if turning the stage does something. If these
    // matched, the stage control would be decoration.
    const a = section(render('granite', { xpl: true, stage: 0 }));
    const b = section(render('granite', { xpl: true, stage: 30 }));
    expect(a).toBeTruthy();
    expect(a).not.toEqual(b);
  });

  it('rotating the stage does NOT change the plane-light image', () => {
    // In plane light there is no analyser, so stage angle changes nothing about
    // which grains transmit.
    const a = section(render('granite', { xpl: false, stage: 0 }));
    const b = section(render('granite', { xpl: false, stage: 30 }));
    expect(a).toEqual(b);
  });

  it('plane light and crossed polars look different', () => {
    const ppl = section(render('granite', { xpl: false, stage: 0 }));
    const xpl = section(render('granite', { xpl: true, stage: 0 }));
    expect(ppl).not.toEqual(xpl);
  });

  it('is deterministic — the same section on every visit', () => {
    expect(section(render('granite', { xpl: true, stage: 15 })))
      .toEqual(section(render('granite', { xpl: true, stage: 15 })));
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const fn = src.slice(src.indexOf('function rkThinSectionSvg'), src.indexOf('function rkThinSectionSvg') + 4200);
    expect(fn).not.toContain('Math.random');
  });
});

describe('thin section — the texture has to match the caption', () => {
  // Every rock originally got the same jittered interlocking mosaic, so
  // sandstone rendered identically to granite while its own caption promised
  // "rounded grains with cement between them", and slate's grains pointed every
  // which way under a caption saying the micas are all rotated into one plane.
  // Texture is half of what a thin section tells you.
  it('tags every section with a fabric', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const block = src.slice(src.indexOf('var RK_THIN_SECTION = {'), src.indexOf('function rkThinSectionSvg'));
    const rows = [...block.matchAll(/^\s{4}(\w+):\s*\{ mag: \d+, fabric: '(\w+)'/gm)];
    expect(rows.length).toBe(20);
    rows.forEach((r) => {
      // 'shards' is fragmental like clastic but keeps angular edges — ash was
      // never transported, so nothing rounded it. 'plates' is fragmental and
      // ROUNDED, but rounded by growth rather than by transport.
      expect(['interlocking', 'clastic', 'shards', 'plates', 'foliated'], `${r[1]}`).toContain(r[2]);
    });
  });

  it('gives clastic rocks a cement matrix their grains sit in', () => {
    // The gaps between grains ARE the diagnostic that this was once loose sand.
    // Assert on the rendered cement colour, not a React key — keys never reach
    // the DOM, so keying off one silently passes nothing.
    const CEMENT = '#efe9dd';
    const sand = section(render('sandstone', { xpl: false, stage: 0 }));
    expect(sand).toContain(CEMENT);
    // An igneous rock has no cement at all — its grains interlock directly.
    expect(section(render('granite', { xpl: false, stage: 0 }))).not.toContain(CEMENT);
  });

  it('rounds clastic grains and keeps crystallised ones angular', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    // Rounding is driven by side count: transport wears corners off.
    expect(src).toContain("(fabric === 'clastic' || fabric === 'plates') ? 9 :");
    expect(src).toContain('var rough = gr.sides > 8 ? 0.10 : 0.42;');
  });

  it('aligns foliated grains into one plane', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    // Grains scatter only slightly around a shared foliation direction, and are
    // stretched along it — that alignment is what the cleavage IS.
    expect(src).toContain("rot: fabric === 'foliated' ? FOLIATION + (rnd() - 0.5) * 26 : rnd() * 180");
    expect(src).toContain("elong: fabric === 'foliated' ? 1.75 + rnd() * 0.6 : 1");
  });

  it('draws pumice as mostly holes, because that is what it is', () => {
    // Its caption already said "mostly holes" while the render showed a solid
    // mass indistinguishable from obsidian. The voids are the whole identity of
    // the rock — they are why it floats.
    const pum = section(render('pumice', { xpl: false, stage: 0 }));
    const obs = section(render('obsidian', { xpl: false, stage: 0 }));
    const vesicles = (pum.match(/<ellipse/g) || []).length;
    expect(vesicles).toBeGreaterThan(12);
    // Obsidian is the same glass with no bubbles — the contrast is the point.
    expect((obs.match(/<ellipse/g) || []).length).toBe(0);
  });

  it('keeps ash shards angular — they were never transported', () => {
    // Tuff is fragmental, but tagging it clastic gave it a rounding history it
    // never had. Sandstone's grains were rounded by transport; ash shards were
    // blown out of a vent and welded where they fell.
    const src = readFileSync(ROCKS_FILE, 'utf8');
    expect(src).toContain("fabric: 'shards'");
    expect(src).toContain("? 9 : fabric === 'shards' ? 4 :");
    // Both are fragmental, so both get a matrix...
    const CEMENT = '#efe9dd';
    expect(section(render('tuff', { xpl: false, stage: 0 }))).toContain(CEMENT);
    // ...but they must not look the same.
    expect(section(render('tuff', { xpl: false, stage: 0 })))
      .not.toEqual(section(render('sandstone', { xpl: false, stage: 0 })));
  });

  it('makes the three fabrics visibly different from each other', () => {
    const gran = section(render('granite', { xpl: false, stage: 0 }));   // interlocking
    const sand = section(render('sandstone', { xpl: false, stage: 0 })); // clastic
    const slate = section(render('slate', { xpl: false, stage: 0 }));    // foliated
    [gran, sand, slate].forEach((s) => expect(s.length).toBeGreaterThan(400));
    expect(gran).not.toEqual(sand);
    expect(sand).not.toEqual(slate);
    expect(gran).not.toEqual(slate);
  });
});

describe('thin section — what the student is told', () => {
  it('labels the magnification and gives a scale bar', () => {
    const m = render('granite');
    expect(m).toContain('≈40×');
    expect(m).toMatch(/[\d.]+ mm/);
  });

  it('names the minerals present with their proportions', () => {
    const m = render('granite');
    ['quartz', 'feldspar', 'mica', 'biotite'].forEach((x) => expect(m).toContain(x));
    expect(m).toContain('32%');
  });

  it('explains what the texture means, not just what it is', () => {
    expect(render('granite')).toContain('crystallised slowly from a melt');
    expect(render('sandstone')).toContain('rounding happened during transport');
    expect(render('slate')).toContain('alignment IS the cleavage');
  });

  it('describes the whole field for screen readers', () => {
    const m = render('granite', { xpl: true, stage: 0 });
    expect(m).toContain('under crossed polars');
    expect(m).toContain('Minerals present');
    const ppl = render('granite', { xpl: false, stage: 0 });
    expect(ppl).toContain('plane-polarized light');
  });

  it('tells the student what the stage control is for', () => {
    expect(render('granite', { xpl: true, stage: 0 })).toContain('extinction');
    expect(render('granite', { xpl: false, stage: 0 })).toContain('relief and cleavage');
  });

  it('pauses the no-op stage control in plane light and activates it under crossed polars', () => {
    const ppl = render('granite', { xpl: false, stage: 37 });
    const pplStage = /<input\b[^>]*id="rk-stage"[^>]*>/.exec(ppl)?.[0] || '';
    expect(pplStage).toMatch(/\sdisabled(?:=""|(?=\s|\/>))/);
    expect(ppl).toContain('choose Crossed polars');
    expect(ppl).toContain('0° to 90°');

    const xpl = render('granite', { xpl: true, stage: 37 });
    const xplStage = /<input\b[^>]*id="rk-stage"[^>]*>/.exec(xpl)?.[0] || '';
    expect(xplStage).not.toMatch(/\sdisabled(?:=""|(?=\s|\/>))/);
    expect(xpl).toContain('Why rotate?');
    expect(xpl).toContain('reaches extinction when it turns black');
  });
});

// A rock whose caption promises a feature the drawing does not show teaches the
// student to stop trusting the drawing. Three rocks were doing exactly that,
// and in each case the missing feature was the single thing that identifies it.
describe('thin section — the layered rocks are drawn layered', () => {
  it('travertine no longer renders as marble', () => {
    // Both are 100% calcite at the same magnification, so they came out
    // pixel-identical while travertine's caption said "banded ... often with
    // open cavities". Neither the bands nor the cavities existed.
    const trav = section(render('travertine', { xpl: false, stage: 0 }));
    const marb = section(render('marble', { xpl: false, stage: 0 }));
    expect(trav).not.toBe(marb);

    // Cavities: empty space, so it reads bright white in plane light.
    const cavity = /<ellipse[^>]*fill="#ffffff"/;
    expect(cavity.test(trav)).toBe(true);
    expect(cavity.test(marb)).toBe(false);

    // Layers: precipitated flat, so they run horizontally, NOT along a
    // metamorphic foliation.
    const bandLine = /<line[^>]*stroke="rgba\(120,95,60,0\.34\)"/;
    expect(bandLine.test(trav)).toBe(true);
    expect(bandLine.test(marb)).toBe(false);
  });

  it('gneiss segregates light and dark minerals into separate bands', () => {
    // This is the whole difference between gneiss and schist. Without it the
    // two sections were the same picture under different captions.
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const row = src.slice(src.indexOf('    gneiss:'), src.indexOf('\n', src.indexOf('    gneiss:')));
    expect(row).toMatch(/banded:\s*\d+/);
    expect(row).toContain("fabric: 'foliated'");

    const gneiss = section(render('gneiss', { xpl: false, stage: 0 }));
    const schist = section(render('schist', { xpl: false, stage: 0 }));
    expect(gneiss).not.toBe(schist);
    const bandLine = /<line[^>]*stroke="rgba\(120,95,60,0\.34\)"/;
    expect(bandLine.test(gneiss)).toBe(true);
    expect(bandLine.test(schist)).toBe(false);
  });

  it('bands follow the foliation in a metamorphic rock and lie flat in a precipitate', () => {
    // A horizontal band line has equal y at both ends; a foliated one does not.
    // Pull each band <line> out whole and read its own attributes, rather than
    // assuming an attribute order the renderer never promised.
    const drops = (svg) => [...svg.matchAll(/<line\b[^>]*>/g)]
      .map((m) => m[0])
      .filter((tag) => tag.includes('stroke="rgba(120,95,60,0.34)"'))
      .map((tag) => {
        const y1 = /\by1="([-\d.]+)"/.exec(tag);
        const y2 = /\by2="([-\d.]+)"/.exec(tag);
        return Math.abs(parseFloat(y1[1]) - parseFloat(y2[1]));
      });

    const trav = drops(section(render('travertine', { xpl: false, stage: 0 })));
    const gneiss = drops(section(render('gneiss', { xpl: false, stage: 0 })));
    expect(trav.length).toBeGreaterThan(0);
    expect(gneiss.length).toBeGreaterThan(0);
    // Travertine's layers were laid down flat out of water — every one of them.
    expect(trav.every((d) => d < 0.5)).toBe(true);
    // Gneiss's bands were tilted into the foliation, so none of them are flat.
    expect(gneiss.every((d) => d > 0.5)).toBe(true);
  });

  it('chalk resolves into separate plates, not an interlocking mosaic', () => {
    // At 400x the caption promises "countless plates from single-celled
    // plankton". It was drawing a fine-grained marble — an interlocking mosaic,
    // which is the one texture chalk definitely is not.
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const row = src.slice(src.indexOf('    chalk:'), src.indexOf('\n', src.indexOf('    chalk:')));
    expect(row).toContain("fabric: 'plates'");

    // Fragmental fabrics paint a matrix first; a mosaic has nothing between the
    // grains because the grains meet.
    const chalk = section(render('chalk', { xpl: false, stage: 0 }));
    const marble = section(render('marble', { xpl: false, stage: 0 }));
    const matrix = /<circle[^>]*r="124"[^>]*fill="#efe9dd"/;
    expect(matrix.test(chalk)).toBe(true);
    expect(matrix.test(marble)).toBe(false);

    // Plates grew as discs, so they are rounded — 9-sided, like the rounded
    // clastic grains and unlike the 5-to-7-sided interlocking crystals.
    const sides = [...chalk.matchAll(/<polygon points="([^"]+)"/g)]
      .map((m) => m[1].trim().split(/\s+/).length);
    expect(sides.length).toBeGreaterThan(20);
    expect(sides.every((n) => n === 9)).toBe(true);
  });

  it('a plate is rounded because it GREW round, not because it was transported', () => {
    // The rounding comment used to say transport did it, which would have been
    // a false history for a coccolith. Chalk is not a clastic rock.
    const src = readFileSync(ROCKS_FILE, 'utf8');
    expect(src).toContain('a coccolith plate simply grew as a disc');
    const row = src.slice(src.indexOf('    chalk:'), src.indexOf('\n', src.indexOf('    chalk:')));
    expect(row).not.toContain("fabric: 'clastic'");
  });
});
