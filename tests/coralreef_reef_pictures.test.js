import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';

// Lane G3: the illustrated pictures that sum up a reef. "The reef in year N"
// (and the dive site cards drawn with it) must draw what the model year says:
// more coral colonies for more cover, bleached colonies white, seaweed, rubble
// and Reef Stars where the numbers put them, and the fish the teaching rules
// give. The belt map's bottom is drawn hazy, below a measured contrast cap,
// so the fish stand out from it.

const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let X;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef; });

const parse = (html) => new DOMParser().parseFromString('<!doctype html><body>' + html + '</body>', 'text/html');
const ALGAE = () => Object.assign(X.scenarioSettings('warmer'), { scenarioId: 'custom', herbivores: 'low', nutrients: 'high' });
function settingsOf(id) { return id === 'algae' ? ALGAE() : X.scenarioSettings(id); }
function yearArt(id, year, theme) {
  const model = settingsOf(id);
  const doc = parse(renderTool('coralReef', { coralReef: { section: 'model', model, modelRevealedFor: { [id]: true }, modelSurveyYear: year } }, { theme }));
  return doc.querySelector('svg[data-year-art]');
}
const LIVE = ['hard_coral', 'bleached_coral'];
const spotsOf = (art, cat) => [...art.querySelectorAll('[data-spot-cat="' + cat + '"]')];
function lum(hex) {
  const p = parseInt(hex.slice(1), 16);
  return [16, 8, 0].map((s) => { const v = ((p >> s) & 255) / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
}
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const chroma = (hex) => { const p = parseInt(hex.slice(1), 16), c = [16, 8, 0].map((s) => (p >> s) & 255); return Math.max(...c) - Math.min(...c); };
function colorsIn(el, attrs) {
  const out = new Set();
  [el, ...el.querySelectorAll('*')].forEach((n) => (attrs || ['fill', 'stroke']).forEach((a) => { const v = n.getAttribute(a); if (v && /^#[0-9a-f]{6}$/i.test(v)) out.add(v.toLowerCase()); }));
  return [...out];
}

describe('the reef in year N', () => {
  const CASES = [['recent', [0, 3, 12, 30]], ['reserve', [10, 30]], ['warmer', [18, 29, 30]], ['cooler', [15, 30]], ['rubble', [0, 4, 30]], ['algae', [0, 30]]];

  it('draws coral colonies only on coral spots, in the state of their spot, and more of them for more cover', () => {
    const seen = [];
    for (const [id, years] of CASES) {
      const rows = X.runScenario(settingsOf(id), 11);
      for (const year of years) {
        const art = yearArt(id, year), where = id + ' year ' + year;
        const live = +art.getAttribute('data-live-spots');
        expect(Math.abs(live - rows[year].coral * 24), where).toBeLessThanOrEqual(1);
        // Every coral spot carries colonies of its own state, and no other spot carries any.
        for (const cat of ['hard_coral', 'bleached_coral', 'recently_dead_coral']) {
          for (const sp of spotsOf(art, cat)) {
            const cols = [...sp.querySelectorAll('[data-colony]')];
            expect(cols.length, where + ' ' + cat + ' spot ' + sp.getAttribute('data-spot')).toBeGreaterThan(0);
            cols.forEach((c) => expect(c.getAttribute('data-colony'), where).toBe(cat));
          }
        }
        for (const cat of ['macroalgae', 'rock', 'rubble', 'sand']) spotsOf(art, cat).forEach((sp) => expect(sp.querySelector('[data-colony]'), where + ' ' + cat).toBeNull());
        const liveColonies = art.querySelectorAll(LIVE.map((c) => '[data-colony="' + c + '"]').join(',')).length;
        expect(liveColonies, where).toBeGreaterThanOrEqual(live);
        expect(liveColonies, where).toBeLessThanOrEqual(2 * live);
        seen.push([live, liveColonies, where]);
        // Living colonies show polyps; recently dead ones show empty cups and a turf film.
        art.querySelectorAll('[data-colony="hard_coral"],[data-colony="bleached_coral"]').forEach((c) => {
          expect(c.querySelector('[data-part="polyps"]').getAttribute('d').length, where).toBeGreaterThan(20);
          expect(c.querySelector('[data-part="cups"],[data-part="turf"]'), where).toBeNull();
        });
        art.querySelectorAll('[data-colony="recently_dead_coral"]').forEach((c) => {
          expect(c.querySelector('[data-part="cups"]'), where).toBeTruthy();
          expect(c.querySelector('[data-part="turf"]'), where).toBeTruthy();
          expect(c.querySelector('[data-part="polyps"]'), where).toBeNull();
        });
      }
    }
    // More live spots never means fewer live colonies drawn (Reef Star
    // spots carry their planted thicket alone, so restoration years are
    // compared among themselves), and the reefs with the most coral carry
    // several times the colonies of the barest.
    for (const group of [seen.filter((q) => !/^rubble/.test(q[2])), seen.filter((q) => /^rubble/.test(q[2]))]) {
      group.sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < group.length; i++) if (group[i][0] > group[i - 1][0]) expect(group[i][1], group[i][2] + ' vs ' + group[i - 1][2]).toBeGreaterThan(group[i - 1][1]);
      expect(group[group.length - 1][1], group[0][2]).toBeGreaterThanOrEqual(4 * Math.max(1, group[0][1]));
    }
  }, 120000);

  it('shows the bleached share as stark white colonies and healthy ones in tissue colour', () => {
    const rows = X.runScenario(X.scenarioSettings('warmer'), 11);
    for (const year of rows.filter((r) => r.year > 0 && r.dhw >= 8 && r.coral > 0.15).map((r) => r.year)) {
      const art = yearArt('warmer', year), live = +art.getAttribute('data-live-spots'), white = +art.getAttribute('data-bleached-spots');
      expect(Math.abs(white - live * rows[year].bleached), 'year ' + year).toBeLessThanOrEqual(1.5);
      expect(spotsOf(art, 'bleached_coral').length).toBe(white);
      const tissue = (cat) => [...art.querySelectorAll('[data-colony="' + cat + '"] [data-part="tissue"]')].map((p) => p.getAttribute('fill'));
      expect(tissue('bleached_coral').length).toBeGreaterThanOrEqual(white);
      tissue('bleached_coral').forEach((f) => expect(lum(f), 'bleached tissue ' + f).toBeGreaterThan(0.85));
      tissue('hard_coral').forEach((f) => expect(lum(f), 'healthy tissue ' + f).toBeLessThan(0.45));
      // Bleached colonies keep their polyps: they are still alive.
      art.querySelectorAll('[data-colony="bleached_coral"]').forEach((c) => expect(c.querySelector('[data-part="polyps"]')).toBeTruthy());
    }
    // A year with no heat has no white colonies at all.
    for (const id of ['recent', 'cooler']) expect(yearArt(id, 0).querySelectorAll('[data-spot-cat="bleached_coral"],[data-colony="bleached_coral"]').length, id).toBe(0);
  }, 60000);

  it('puts seaweed and rubble where the numbers put them', () => {
    const check = (id, year) => {
      const rows = X.runScenario(settingsOf(id), 11), site = X.siteFromModelYear(rows[year], settingsOf(id), 0), art = yearArt(id, year), where = id + ' ' + year;
      for (const cat of ['macroalgae', 'rubble', 'sand']) {
        const n = spotsOf(art, cat).length;
        expect(Math.abs(n - site.cover[cat] * 24), where + ' ' + cat).toBeLessThanOrEqual(1);
      }
      spotsOf(art, 'macroalgae').forEach((sp) => expect(sp.querySelector('[data-part="seaweed"]'), where).toBeTruthy());
      spotsOf(art, 'rubble').forEach((sp) => expect(sp.querySelector('[data-part="rubble"]'), where).toBeTruthy());
      return { weed: art.querySelectorAll('[data-part="seaweed"]').length, rubble: art.querySelectorAll('[data-part="rubble"]').length };
    };
    const a0 = check('algae', 0), a30 = check('algae', 30);
    expect(a30.weed).toBeGreaterThan(a0.weed + 8);
    const r0 = check('rubble', 0), r30 = check('rubble', 30);
    expect(r0.rubble).toBeGreaterThanOrEqual(18);
    expect(r30.rubble).toBeLessThan(r0.rubble / 4);
    check('recent', 30); check('warmer', 30);
  }, 60000);

  it('draws Reef Stars only in the restoration scenario, with corals on them', () => {
    for (const id of ['recent', 'reserve', 'warmer', 'cooler', 'algae']) for (const year of [0, 15, 30]) expect(yearArt(id, year).querySelectorAll('[data-frame]').length, id + ' ' + year).toBe(0);
    expect(yearArt('rubble', 0).querySelectorAll('[data-frame]').length).toBe(0);
    for (const year of [4, 12, 30]) {
      const art = yearArt('rubble', year), frames = [...art.querySelectorAll('[data-frame]')];
      expect(frames.length, 'rubble ' + year).toBe(+art.getAttribute('data-frames'));
      expect(frames.length).toBeGreaterThan(0);
      const onFrames = frames.map((f) => f.closest('[data-spot]')).filter((sp) => sp.querySelector('[data-colony="hard_coral"],[data-colony="bleached_coral"]'));
      expect(onFrames.length, 'corals growing on frames in year ' + year).toBeGreaterThan(0);
      onFrames.forEach((sp) => sp.querySelectorAll('[data-colony]').forEach((c) => expect(c.getAttribute('data-form')).toBe('branching')));
    }
  }, 60000);

  it('draws the fish the teaching rules give, deterministically and within a sane node count', () => {
    for (const [id, year] of [['recent', 30], ['reserve', 30], ['rubble', 0], ['rubble', 30], ['warmer', 30], ['algae', 30]]) {
      const rows = X.runScenario(settingsOf(id), 11), site = X.siteFromModelYear(rows[year], settingsOf(id), 0), art = yearArt(id, year);
      for (const fam of ['parrotfish', 'surgeonfish', 'butterflyfish', 'grouper', 'snapper']) {
        expect(art.querySelectorAll('[data-fish="' + fam + '"]').length, id + ' ' + year + ' ' + fam).toBe(site.fish[fam]);
      }
      expect(art.querySelectorAll('*').length, id + ' ' + year + ' nodes').toBeLessThan(700);
      expect(yearArt(id, year, 'dark').innerHTML.replace(/crb-year-[a-z0-9]+/gi, 'U')).toBe(art.innerHTML.replace(/crb-year-[a-z0-9]+/gi, 'U'));
    }
    // More protection, more grazers and predators.
    const reserve = yearArt('reserve', 30), recent = yearArt('recent', 30);
    expect(reserve.querySelectorAll('[data-fish="parrotfish"]').length).toBeGreaterThan(recent.querySelectorAll('[data-fish="parrotfish"]').length);
    expect(/Math\.random\(/.test(readFileSync(TOOL, 'utf8'))).toBe(false);
  }, 60000);

  it('draws the dive site cards with the same picture, each a few hundred nodes', () => {
    const doc = parse(renderTool('coralReef', { coralReef: { section: 'explore' } }));
    const art = (id) => doc.querySelector('button[data-site="' + id + '"] svg.crf-site-art');
    for (const id of ['healthy', 'restoration', 'heatwave', 'damaged']) {
      expect(art(id).querySelectorAll('*').length, id).toBeLessThan(700);
      expect(art(id).querySelectorAll('[data-colony]').length, id).toBeGreaterThan(0);
    }
    const liveCol = (id) => art(id).querySelectorAll('[data-colony="hard_coral"],[data-colony="bleached_coral"]').length;
    expect(liveCol('healthy')).toBeGreaterThan(3 * liveCol('damaged'));
    expect(art('heatwave').querySelectorAll('[data-colony="bleached_coral"]').length).toBeGreaterThan(art('heatwave').querySelectorAll('[data-colony="hard_coral"]').length);
    expect(art('damaged').querySelectorAll('[data-part="seaweed"]').length).toBeGreaterThan(3 * Math.max(1, art('healthy').querySelectorAll('[data-part="seaweed"]').length));
  });
});

describe('belt map bottom', () => {
  // Measured on five reefs: before this lane the bottom spanned 10 to 12:1
  // (dark seaweed and coral outlines next to white tips and sticks) with
  // colour (chroma) up to 141 of 255, and the fish outlines cleared its
  // darkest areas by only 1.9 to 2.2:1. The haze brings the bottom to 3.0 to
  // 3.3:1 and chroma 64 or less, and the fish outlines to 3.4:1 or more.
  const CAP_CONTRAST = 3.4, CAP_CHROMA = 75;
  const FISH = { parrotfish: '#0b3d35', surgeonfish: '#0f1f4a', butterflyfish: '#4a3a07', grouper: '#2b190d', snapper: '#4a1410' };

  it('is hazy and low in contrast while every fish keeps a strong outline against it', () => {
    for (const id of ['reserve', 'harbor', 'restored', 'heatwave', 'rubble']) {
      const map = parse(renderTool('coralReef', { coralReef: { section: 'survey', surveySiteId: id, surveyStage: 'fish' } })).querySelector('svg[data-belt-map]');
      const bottom = map.querySelector('[data-belt-bottom]');
      expect(bottom, id).toBeTruthy();
      const cols = colorsIn(bottom);
      expect(cols.length, id).toBeGreaterThan(8);
      let worst = 1;
      for (const a of cols) for (const b of cols) worst = Math.max(worst, ratio(a, b));
      expect(worst, id + ' bottom contrast').toBeLessThan(CAP_CONTRAST);
      expect(Math.max(...cols.map(chroma)), id + ' bottom colour').toBeLessThan(CAP_CHROMA);
      // The fish are drawn above the bottom, unchanged, with dark outlines
      // that clear 3:1 against every area of the bottom, more than any two
      // of those areas differ from each other.
      const fills = colorsIn(bottom, ['fill']);
      let worstFill = 1;
      for (const a of fills) for (const b of fills) worstFill = Math.max(worstFill, ratio(a, b));
      const fish = [...map.querySelectorAll('g[data-fish]')];
      expect(fish.length, id).toBeGreaterThan(5);
      expect(bottom.querySelector('[data-fish]')).toBeNull();
      for (const g of fish) {
        const fam = g.getAttribute('data-fish'), ink = FISH[fam];
        expect(colorsIn(g), fam).toContain(ink);
        const least = Math.min(...fills.map((c) => ratio(ink, c)));
        expect(least, id + ' ' + fam + ' outline').toBeGreaterThan(3);
        expect(least, id + ' ' + fam + ' stands out more than any two bottom areas').toBeGreaterThan(worstFill);
        expect(Math.min(...cols.map((c) => ratio(ink, c))), id + ' ' + fam + ' outline against the finest bottom lines').toBeGreaterThan(2.2);
      }
    }
  });

  it('keeps the kinds of bottom telling apart: sand light, rubble and rock darker, bleached coral lighter than live, seaweed green', () => {
    const map = parse(renderTool('coralReef', { coralReef: { section: 'survey', surveySiteId: 'reserve', surveyStage: 'fish' } })).querySelector('[data-belt-bottom]');
    const sand = map.querySelector('rect').getAttribute('fill');
    const doc = parse(renderTool('coralReef', { coralReef: { section: 'survey', surveySiteId: 'reserve', surveyStage: 'fish' } }));
    const tiles = [...doc.querySelectorAll('[aria-label="What the bottom drawings show"] li svg')];
    expect(tiles.length).toBe(7);
    const ground = (i) => tiles[i].querySelector('rect').getAttribute('fill');
    // Tiles in CATEGORY_IDS order: hard, bleached, dead, seaweed, rock, rubble, sand.
    expect(ground(6)).toBe(sand);
    expect(lum(ground(6))).toBeGreaterThan(lum(ground(5)));
    expect(lum(ground(5))).toBeGreaterThan(lum(ground(4)));
    const tissue = (i) => tiles[i].querySelectorAll('path')[1].getAttribute('fill');
    expect(lum(tissue(1))).toBeGreaterThan(lum(tissue(2)));
    expect(lum(tissue(2))).toBeGreaterThan(lum(tissue(0)));
    const weed = tiles[3].querySelector('path').getAttribute('fill'), p = parseInt(weed.slice(1), 16);
    expect(((p >> 8) & 255) > (p >> 16) && ((p >> 8) & 255) > (p & 255), 'seaweed reads green: ' + weed).toBe(true);
    // Each tile is the map's own drawing: its colours all occur on some map.
    const all = new Set();
    for (const id of ['reserve', 'harbor', 'restored', 'heatwave', 'rubble']) colorsIn(parse(renderTool('coralReef', { coralReef: { section: 'survey', surveySiteId: id, surveyStage: 'fish' } })).querySelector('[data-belt-bottom]')).forEach((c) => all.add(c));
    tiles.forEach((t, i) => colorsIn(t).filter((c) => c !== '#8fd0de').forEach((c) => expect(all.has(c), 'tile ' + i + ' colour ' + c).toBe(true)));
  });
});
