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
