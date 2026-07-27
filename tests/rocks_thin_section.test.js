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
    const rocks = [...src.slice(src.indexOf('const ROCKS = ['), src.indexOf('const MINERALS = ['))
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
      expect(['interlocking', 'clastic', 'foliated'], `${r[1]}`).toContain(r[2]);
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
    expect(src).toContain("sides: fabric === 'clastic' ? 9 :");
    expect(src).toContain('var rough = gr.sides > 8 ? 0.10 : 0.42;');
  });

  it('aligns foliated grains into one plane', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    // Grains scatter only slightly around a shared foliation direction, and are
    // stretched along it — that alignment is what the cleavage IS.
    expect(src).toContain("rot: fabric === 'foliated' ? FOLIATION + (rnd() - 0.5) * 26 : rnd() * 180");
    expect(src).toContain("elong: fabric === 'foliated' ? 1.75 + rnd() * 0.6 : 1");
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
});
