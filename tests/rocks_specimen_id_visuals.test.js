// Specimen ID visuals for the rocks & minerals tool.
//
// WHY: the rocks grid, the Mystery Rock guess grid and the quiz all drew a
// specimen as its ROCK-TYPE emoji, so all 20 rocks rendered as one of only
// three pictures. An identification activity whose options are visually
// identical is not an identification activity. Minerals showed a flat colour
// dot — nothing about lustre or crystal habit, the two properties a mineral
// key actually leads with.
//
// These tests execute the tool and assert on real rendered SVG.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

function renderRocks(rocksState, extras) {
  const store = { rocks: Object.assign({}, rocksState), rockCycle: {} };
  const ctx = makeCtx(Object.assign({
    toolData: store,
    setToolData: (fnOrObj) => {
      const next = typeof fnOrObj === 'function' ? fnOrObj(store) : fnOrObj;
      Object.assign(store, next);
    },
  }, extras || {}));
  const markup = ReactDOMServer.renderToStaticMarkup(
    React.createElement(() => window.StemLab._registry.rocks.render(ctx))
  );
  return { store, markup, ctx };
}

function treeFor(store, extras) {
  const ctx = makeCtx(Object.assign({
    toolData: store,
    setToolData: (fnOrObj) => {
      const next = typeof fnOrObj === 'function' ? fnOrObj(store) : fnOrObj;
      Object.assign(store, next);
    },
  }, extras || {}));
  return window.StemLab._registry.rocks.render(ctx);
}

function findAll(node, predicate, acc = []) {
  if (node == null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, predicate, acc)); return acc; }
  if (predicate(node)) acc.push(node);
  const kids = node.props && node.props.children;
  if (kids != null) findAll(kids, predicate, acc);
  return acc;
}

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
  vi.useFakeTimers();
});
afterEach(() => { vi.useRealTimers(); });

describe('catalog identity', () => {
  // Both tools registered with `label` set to the raw id and an empty `desc`,
  // so the STEM Lab tool browser listed them as "rocks" and "rockCycle" with no
  // blurb — 87 of the other 90 tools carry a proper name and description, and
  // the repo's own a11y audit raised it as a catalog/context notice on each.
  it('gives both tools a human name and a real description', () => {
    resetStemLab();
    loadTool(ROCKS_FILE, 'rocks');
    const reg = window.StemLab._registry;

    [['rocks', 'Rocks & Minerals Explorer'], ['rockCycle', 'Rock Cycle']].forEach(([id, label]) => {
      const cfg = reg[id];
      expect(cfg, id).toBeTruthy();
      expect(cfg.label, `${id} label`).toBe(label);
      expect(cfg.label, `${id} label must not be the raw id`).not.toBe(id);
      // The audit's threshold for a usable catalog blurb.
      expect((cfg.desc || '').length, `${id} desc`).toBeGreaterThan(20);
    });
  });

  it('does not give the two sibling tools the same catalog icon', () => {
    resetStemLab();
    loadTool(ROCKS_FILE, 'rocks');
    const reg = window.StemLab._registry;
    expect(reg.rocks.icon).toBeTruthy();
    expect(reg.rockCycle.icon).toBeTruthy();
    expect(reg.rockCycle.icon).not.toBe(reg.rocks.icon);
  });
});

describe('rock specimen ID visuals', () => {
  it('draws a distinct swatch per specimen in the rocks grid, not a shared type emoji', () => {
    const { markup } = renderRocks({ mode: 'rocks' });

    // Real SVG art, one swatch per specimen.
    const svgCount = (markup.match(/<svg/g) || []).length;
    expect(svgCount).toBeGreaterThanOrEqual(20);

    // Each rock gets its own clip id — proof the tiles are per-specimen.
    ['granite', 'basalt', 'obsidian', 'pumice', 'shale', 'marble'].forEach((id) => {
      expect(markup, id).toContain('rkclip-' + id);
    });
  });

  it('gives every rock tile an accessible label carrying the diagnostic texture', () => {
    const { markup } = renderRocks({ mode: 'rocks' });
    // Screen-reader users must get the same information the picture carries.
    expect(markup).toContain('coarse interlocking crystals you can see without a lens');
    expect(markup).toContain('smooth volcanic glass with curved, shell-like fracture');
    expect(markup).toContain('full of frozen gas bubbles');
  });

  it('renders visibly different art for two rocks of the SAME type', () => {
    // granite (coarse-grained) vs basalt (fine-grained) are both igneous — under
    // the old type-emoji tiles these were pixel-identical.
    const { markup } = renderRocks({ mode: 'rocks' });
    const grab = (id) => {
      const start = markup.indexOf('rkclip-' + id);
      return markup.slice(start, start + 1200);
    };
    expect(grab('granite')).not.toEqual(grab('basalt'));
    // Coarse-grained draws polygons; fine-grained draws many small circles.
    expect(grab('granite')).toContain('<polygon');
    expect(grab('basalt')).toContain('<circle');
  });

  it('is deterministic — the same rock draws identically across renders', () => {
    // Patterns come from a seeded LCG, never Math.random(), so a student can
    // learn a specimen's look and goldens stay stable.
    const a = renderRocks({ mode: 'rocks' }).markup;
    const b = renderRocks({ mode: 'rocks' }).markup;
    expect(a).toEqual(b);
  });

  it('never calls Math.random inside the swatch renderers', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      const art = src.slice(src.indexOf('function rkRockSwatch'), src.indexOf('var RK_TEXTURE_GLOSS'));
      expect(art, p).not.toContain('Math.random');
      expect(art, p).toContain('rkSeed(');
    });
  });

  it('covers every texture in the ROCKS data with a gloss', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      const rocksData = src.slice(src.indexOf('const ROCKS = ['), src.indexOf('const MINERALS = ['));
      const textures = [...new Set([...rocksData.matchAll(/texture: '([^']+)'/g)].map((m) => m[1]))];
      expect(textures.length).toBeGreaterThan(8);
      const gloss = src.slice(src.indexOf('var RK_TEXTURE_GLOSS'), src.indexOf('var RK_TEXTURE_GLOSS') + 2000);
      textures.forEach((tex) => {
        expect(gloss, `no gloss for texture "${tex}"`).toContain("'" + tex + "'");
      });
    });
  });

  it('gives specimens volume: silhouette, shading and a contact shadow', () => {
    const { markup } = renderRocks({ mode: 'rocks' });
    // Modelled with gradients rather than drawn as flat pattern tiles.
    expect(markup).toContain('rkshade-granite');
    expect(markup).toContain('linearGradient');
    expect(markup).toContain('radialGradient');
    // Each specimen sits on a contact shadow.
    expect((markup.match(/<ellipse[^>]*opacity="0\.22"/g) || []).length).toBeGreaterThan(10);
  });

  it('shapes the outline by how the rock breaks', () => {
    const { markup } = renderRocks({ mode: 'rocks' });
    const grab = (id) => {
      const i = markup.indexOf('rkclip-' + id);
      return markup.slice(i, i + 900);
    };
    // Angular fracture (granite, crystalline) → straight-edged path.
    expect(grab('granite')).toMatch(/<path d="M[\d.,\sL]+Z"/);
    // Rounded weathering (sandstone, clastic) → quadratic curves.
    expect(grab('sandstone')).toMatch(/<path d="M[^"]*Q[^"]*"/);
    // Tabular splitting (slate, foliated) → wide, shallow outline.
    expect(grab('slate')).toBeTruthy();
  });

  it('adapts lighting so pale specimens do not blow out', () => {
    // A fixed white highlight turned chalk, marble and quartzite into
    // featureless white blobs. Light specimens are modelled mostly by shadow.
    const { markup } = renderRocks({ mode: 'rocks' });
    const shadeOf = (id) => {
      const i = markup.indexOf('rkshade-' + id);
      const chunk = markup.slice(i, i + 420);
      const stops = [...chunk.matchAll(/stop-opacity="([\d.]+)"/g)].map((m) => parseFloat(m[1]));
      return { hi: stops[0], lo: stops[2] };
    };
    const chalk = shadeOf('chalk');       // near-white rock
    const obsidian = shadeOf('obsidian'); // near-black rock
    expect(chalk.hi).toBeLessThan(obsidian.hi);   // less highlight on pale rock
    expect(chalk.lo).toBeGreaterThan(obsidian.lo); // more shadow on pale rock
  });

  it('draws minerals by crystal habit and lustre, not a flat colour dot', () => {
    const { markup } = renderRocks({ mode: 'minerals' });
    expect((markup.match(/<svg/g) || []).length).toBeGreaterThanOrEqual(6);
    // Habit outlines are polygons; the old tile was a rounded div.
    expect(markup).toContain('<polygon');
    // Labels expose habit + lustre + hardness to assistive tech.
    expect(markup).toContain('Cubic (Isometric) crystal');
    expect(markup).toContain('Metallic lustre');
  });
});

describe('mystery rock identification', () => {
  it('shows a per-specimen swatch on every guess option', () => {
    const store = {
      rocks: { mode: 'mystery', mystery: { rockId: 'granite', clues: ['a', 'b', 'c'], cluesShown: 1, revealed: false, solved: false } },
      rockCycle: {},
    };
    const ctx = makeCtx({ toolData: store, setToolData: () => {} });
    const markup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(() => window.StemLab._registry.rocks.render(ctx))
    );

    // 20 guess options, each with its own art.
    expect((markup.match(/rkclip-/g) || []).length).toBeGreaterThanOrEqual(20);
    // And the label tells a screen-reader user what the picture shows.
    // (Rock names render as raw i18n keys here — the smoke harness's `t` returns
    // the key when a call passes no fallback. That is a harness artifact.)
    expect(markup).toMatch(/Guess .+? — .+?crystals|Guess .+? — .+?grain/);
  });

  it('shows the specimen art when the answer is revealed', () => {
    const store = {
      rocks: { mode: 'mystery', mystery: { rockId: 'obsidian', clues: ['a'], cluesShown: 1, revealed: true, solved: false } },
      rockCycle: {},
    };
    const ctx = makeCtx({ toolData: store, setToolData: () => {} });
    const markup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(() => window.StemLab._registry.rocks.render(ctx))
    );
    expect(markup).toContain('rkclip-obsidian');
    // The reveal now names the texture and explains it.
    expect(markup).toContain('smooth volcanic glass with curved, shell-like fracture');
  });
});

describe('visual ID drill', () => {
  it('offers an offline drill that needs no AI', () => {
    const { markup } = renderRocks({ mode: 'rocks' });
    expect(markup).toContain('Visual ID drill');
    expect(markup).toContain('Start drill');
  });

  it('starts a round with 4 options including the answer', () => {
    const store = { rocks: { mode: 'rocks' }, rockCycle: {} };
    const start = findAll(treeFor(store), (n) =>
      n.type === 'button' && JSON.stringify(n.props.children || '').includes('Start drill'))[0];
    expect(start).toBeTruthy();
    start.props.onClick();

    const vid = store.rocks.visualId;
    expect(vid).toBeTruthy();
    expect(vid.options).toHaveLength(4);
    expect(vid.options).toContain(vid.rockId);
    expect(new Set(vid.options).size).toBe(4); // no duplicate options
    expect(vid.answered).toBe(false);
    expect(vid.asked).toBe(1);
  });

  it('scores a correct answer and explains a wrong one', () => {
    const store = { rocks: { mode: 'rocks' }, rockCycle: {} };
    findAll(treeFor(store), (n) => n.type === 'button' && JSON.stringify(n.props.children || '').includes('Start drill'))[0]
      .props.onClick();

    const answerId = store.rocks.visualId.rockId;

    // Option buttons are the drill's own: left-aligned, bordered, enabled.
    const optButtons = findAll(treeFor(store), (n) =>
      n.type === 'button' && n.props.disabled === false &&
      typeof n.props.className === 'string' && n.props.className.includes('text-left'));
    expect(optButtons).toHaveLength(4);

    optButtons[0].props.onClick();
    expect(store.rocks.visualId.answered).toBe(true);
    expect(store.rocks.visualId.chosen).toBeTruthy();

    // Score increments only when the pick matched the specimen.
    const wasRight = store.rocks.visualId.chosen === answerId;
    expect(store.rocks.visualId.score).toBe(wasRight ? 1 : 0);

    // The UI disables the options once answered...
    const afterButtons = findAll(treeFor(store), (n) =>
      n.type === 'button' && typeof n.props.className === 'string' && n.props.className.includes('text-left'));
    afterButtons.forEach((b) => expect(b.props.disabled).toBe(true));

    // ...and a stale handler firing again cannot score the round twice.
    optButtons.forEach((b) => b.props.onClick());
    expect(store.rocks.visualId.score).toBe(wasRight ? 1 : 0);
    expect(store.rocks.visualId.chosen).toBe(optButtons[0].props['aria-label'] ? store.rocks.visualId.chosen : null);
  });

  it('draws the specimen large enough to judge texture', () => {
    const store = { rocks: { mode: 'rocks' }, rockCycle: {} };
    findAll(treeFor(store), (n) => n.type === 'button' && JSON.stringify(n.props.children || '').includes('Start drill'))[0]
      .props.onClick();

    const ctx = makeCtx({ toolData: store, setToolData: () => {} });
    const markup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(() => window.StemLab._registry.rocks.render(ctx))
    );
    expect(markup).toContain('Which specimen is this?');
    expect(markup).toContain('width="96"');
  });

  it('prefers same-type distractors so the drill tests texture, not colour', () => {
    // Run several rounds; at least one same-type distractor should appear each
    // time (that is where real identification confusion lives).
    const src = readFileSync(ROCKS_FILE, 'utf8');
    expect(src).toContain('var sameType = ROCKS.filter(function (r) { return r.type === answer.type && r.id !== answer.id; });');
    expect(src).toContain('while (picks.length < 2 && sameType.length) picks.push(pickFrom(sameType));');
  });
});

// ── Specimen art vs. the words next to it ───────────────────────────────────
//
// Every specimen swatch was rendered and compared against its own description.
// The same failure the thin sections had turned up here: features a description
// NAMES were either not drawn at all, or drawn in a colour so close to the rock
// that they could not be seen.
//
// `texture` is user-facing — glossed in the detail panel, read to screen
// readers, used by the quizzes — so these features are carried in a separate
// `art` field rather than by inventing new texture words.
describe('specimen art — the picture shows what the words promise', () => {
  /** Each rock's swatch <svg>, keyed by id, from the rocks grid. */
  function swatches() {
    const { markup } = renderRocks({ mode: 'rocks' });
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const block = src.slice(src.indexOf('const ROCKS = ['), src.indexOf('const MINERALS = ['));
    const ids = [...block.matchAll(/\{ id: '(\w+)', type: '/g)]
      .filter((m) => block.slice(m.index, block.indexOf('\n', m.index)).includes('desc:'))
      .map((m) => m[1]);
    const found = [];
    let i = 0;
    while ((i = markup.indexOf('<svg', i)) >= 0) {
      const end = markup.indexOf('</svg>', i);
      found.push(markup.slice(i, end + 6));
      i = end + 6;
    }
    const out = {};
    ids.forEach((id, n) => { out[id] = found[n] || ''; });
    return out;
  }

  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };

  it('draws four different pictures for the four foliated grades', () => {
    // slate -> phyllite -> schist -> gneiss IS the metamorphic grade sequence,
    // and the differences between them are the entire lesson. Three of them
    // carried texture 'foliated' and so drew the identical wavy lozenge,
    // differing only in colour.
    const s = swatches();
    const grades = ['slate', 'phyllite', 'schist', 'gneiss'];
    grades.forEach((g) => expect(s[g], `${g} swatch missing`).toBeTruthy());
    for (let a = 0; a < grades.length; a++) {
      for (let b = a + 1; b < grades.length; b++) {
        expect(s[grades[a]], `${grades[a]} and ${grades[b]} draw the same picture`)
          .not.toBe(s[grades[b]]);
      }
    }
  });

  it('gives obsidian nested conchoidal ripples, not parallel arcs', () => {
    // Conchoidal fracture is why obsidian is on a rock chart at all, and the
    // description says so. The art drew five arcs straight across the body,
    // which reads as a highlight on a black pebble.
    const svg = swatches().obsidian;
    const circles = [...svg.matchAll(/<circle[^>]*cx="([\d.]+)"[^>]*cy="([\d.]+)"[^>]*r="([\d.]+)"[^>]*>/g)]
      .map((m) => ({ cx: m[1], cy: m[2], r: parseFloat(m[3]) }));
    // Ripples nest: many circles, one shared centre, increasing radii.
    const byCentre = {};
    circles.forEach((c) => { (byCentre[c.cx + ',' + c.cy] = byCentre[c.cx + ',' + c.cy] || []).push(c.r); });
    const nest = Object.values(byCentre).find((rs) => rs.length >= 6);
    expect(nest, 'no nested ripple set').toBeTruthy();
    const sorted = [...nest].sort((x, y) => x - y);
    expect(new Set(sorted).size).toBe(sorted.length);   // no two the same radius
  });

  it('makes diorite a fine intermix rather than two big zones', () => {
    // "Salt and pepper" is fine speckle. Diorite listed its darkest colour
    // first, so that became the entire body with a few large pale blocks over
    // it — the specimen read as a cow.
    const svg = swatches().diorite;
    const polys = [...svg.matchAll(/<polygon[^>]*fill="(#[0-9a-fA-F]{6})"/g)].map((m) => m[1]);
    expect(polys.length).toBeGreaterThanOrEqual(40);
    const lums = polys.map(lum);
    // Both ends of the range have to be present, and in comparable numbers —
    // that is what makes it salt AND pepper.
    const dark = lums.filter((l) => l < 0.35).length;
    const light = lums.filter((l) => l > 0.65).length;
    expect(dark).toBeGreaterThan(8);
    expect(light).toBeGreaterThan(8);
    expect(Math.abs(dark - light)).toBeLessThan(Math.max(dark, light));
  });

  it('keeps a texture mark visible against its own rock', () => {
    // Pale rocks picked their texture marks from the same near-white palette as
    // the body, so chalk's plankton shells, limestone's fossils and marble's
    // sugary crystals were all rendered and none of them could be seen.
    const src = readFileSync(ROCKS_FILE, 'utf8');
    expect(src).toContain('var MIN_SEP = 0.12;');
    expect(src).toContain('var pick = function (n) { return separate(cols[n % cols.length]); };');

    const s = swatches();
    ['chalk', 'limestone', 'marble'].forEach((id) => {
      const body = /<path[^>]*fill="(#[0-9a-fA-F]{6})"/.exec(s[id]);
      expect(body, `${id} has no body fill`).toBeTruthy();
      const marks = [...s[id].matchAll(/stroke="(#[0-9a-fA-F]{6})"/g)].map((m) => m[1])
        .concat([...s[id].matchAll(/<polygon[^>]*fill="(#[0-9a-fA-F]{6})"/g)].map((m) => m[1]));
      expect(marks.length, `${id} draws no texture marks`).toBeGreaterThan(0);
      // Every mark separated from the body by at least the threshold.
      marks.forEach((m) => {
        expect(Math.abs(lum(m) - lum(body[1])), `${id}: mark ${m} invisible on body ${body[1]}`)
          .toBeGreaterThanOrEqual(0.115);
      });
    });
  });

  it('places schist mica flakes inside the specimen, not outside the clip', () => {
    // A foliated silhouette is a flat lozenge filling only the middle of the
    // box. Scattering flakes over the whole square clipped most of them away
    // and schist came back nearly bare — slate and phyllite hid the same bug
    // because lines drawn clear across still read as banding after clipping.
    const svg = swatches().schist;
    // Require whitespace before the y: a greedy [^>]*y=" happily matches the
    // tail of opacit|y="0.92" and reports the opacity as a coordinate.
    const ys = [...svg.matchAll(/<rect[^>]*\sy="([\d.]+)"/g)].map((m) => parseFloat(m[1]));
    expect(ys.length).toBeGreaterThan(20);
    // The grid swatch is 54 units; the lozenge spans roughly 0.30-0.70 of it.
    ys.forEach((y) => {
      expect(y).toBeGreaterThan(54 * 0.26);
      expect(y).toBeLessThan(54 * 0.74);
    });
  });

  it('tags exactly the rocks whose descriptions name an undrawn feature', () => {
    // Guards against the tag landing on the wrong row: an earlier pass anchored
    // on "{ id: x, type: y" and hit a compact id/type lookup list elsewhere in
    // the file, tagging eight unrelated entries one position off.
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const block = src.slice(src.indexOf('const ROCKS = ['), src.indexOf('const MINERALS = ['));
    const tagged = {};
    [...block.matchAll(/\{ id: '(\w+)', type: '\w+', art: '(\w+)'/g)].forEach((m) => { tagged[m[1]] = m[2]; });
    expect(tagged).toEqual({
      obsidian: 'conchoidal',
      diorite: 'saltpepper',
      tuff: 'shards',
      rhyolite: 'flowbanded',
      travertine: 'bandedporous',
      slate: 'slaty',
      phyllite: 'crenulated',
      schist: 'schistose',
    });
    // And nowhere else in the file.
    expect([...src.matchAll(/art: '/g)].length).toBe(8);
  });

  it('keeps sandstone and tuff in the buff range instead of traffic-cone orange', () => {
    // grainColors is decorative paint only, so this is not a contrast bug — but
    // an ID tool that renders sandstone in saturated orange and tuff in canary
    // yellow trains the wrong search image.
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const block = src.slice(src.indexOf('const ROCKS = ['), src.indexOf('const MINERALS = ['));
    const sat = (hex) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const mx = Math.max(...c), mn = Math.min(...c);
      return mx === 0 ? 0 : (mx - mn) / mx;
    };
    ['sandstone', 'tuff'].forEach((id) => {
      const at = block.indexOf("{ id: '" + id + "',");
      const row = block.slice(at, block.indexOf('\n', at));
      const cols = [...(/grainColors:\s*\[([^\]]*)\]/.exec(row)[1]).matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => m[0]);
      expect(cols.length).toBeGreaterThan(2);
      cols.forEach((c) => {
        // The bound that matters is the one separating a buff rock from paint:
        // the colours this replaced ran 0.95-0.97.
        expect(sat(c), `${id} colour ${c} is too saturated for a rock`).toBeLessThan(0.45);
      });
    });
  });

  it('keeps the art field out of the user-facing texture vocabulary', () => {
    // The whole reason for a separate field: texture strings are glossed,
    // announced and quizzed, so adding art words there would have changed what
    // the tool SAYS as a side effect of changing what it DRAWS.
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const gloss = src.slice(src.indexOf('var RK_TEXTURE_GLOSS = {'), src.indexOf('}', src.indexOf('var RK_TEXTURE_GLOSS = {')));
    ['conchoidal', 'saltpepper', 'slaty', 'crenulated', 'schistose', 'bandedporous', 'flowbanded']
      .forEach((a) => expect(gloss, `${a} leaked into the texture vocabulary`).not.toContain("'" + a + "'"));
  });

  it('ships the same art in both copies', () => {
    const [a, b] = PATHS.map((p) => readFileSync(p, 'utf8'));
    expect(a).toBe(b);
  });
});
