// Companion Planting round 5 (2026-11-24): the day engine agrees with the tool's own sourced text.
// - Ladybug Colony: sourced flowers (aster family for lady beetles, dill for parasitic wasps) and a model effect
//   (wild helper units at the shared eat rate) instead of a flat -15 pests on every plot.
// - Neem / hand-pick / row covers: directions from UC IPM, UMN and UW-Madison; sizes labelled as model guesses;
//   covers keep NEW pests out, keep old ones in, and block bees for crops that flower under them.
// - Garden-wide pest repel follows each plant's evidence grade (garlic/nasturtium = tradition = 0; basil/marigold = mixed).
// - Ladybug release is predict-first: choices from the model, rotating positions, verdict after the next day.
// - The unused dpr variable in the Sisters canvas is gone.
// Fail-first check: CP_TOOL_FILE=C:/tmp/sports_labs_1123/companionplanting/start_r5.js npx vitest run <this file>
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab, newStore, makeCtx, React } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.CP_TOOL_FILE || 'stem_lab/stem_tool_companionplanting.js';
const TOOL_ID = 'companionPlanting';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const CODE = SOURCE.split('\n').filter((line) => !/^\s*\/\//.test(line)).join('\n');

function emptyGrid() {
  return Array.from({ length: 16 }, () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }));
}
function garden(overrides = {}, extra = {}) {
  const grid = emptyGrid();
  grid[0] = { plantId: 'corn', growthDay: 10, health: 95, watered: false, pests: 20 };
  grid[1] = { plantId: 'beans', growthDay: 10, health: 95, watered: false, pests: 20 };
  grid[4] = { plantId: 'squash', growthDay: 10, health: 95, watered: false, pests: 20 };
  Object.keys(extra).forEach((k) => { grid[k] = Object.assign({ growthDay: 10, health: 95, watered: false, pests: 20 }, extra[k]); });
  return { grid, phase: 'grow', day: 0, budget: 20, moisture: 60, pestPop: 30, beneficialPop: 6, playView: 'workshop', ...overrides };
}
function harness(seed) {
  resetStemLab();
  const config = loadTool(FILE, TOOL_ID);
  const store = newStore({ companionPlanting: { gardenMode: 'community', communityGarden: seed } });
  const state = () => store.toolData.companionPlanting.communityGarden;
  const tree = () => config.render(makeCtx({ toolData: store.toolData, awardXP: vi.fn(), saveSnapshot: vi.fn() }, store));
  function find(key, value = true) {
    const visit = (node) => {
      if (Array.isArray(node)) { for (const child of node) { const m = visit(child); if (m) return m; } return null; }
      if (!React.isValidElement(node)) return null;
      if (node.props[key] === value) return node;
      return visit(node.props.children);
    };
    const node = visit(tree());
    if (!node) throw new Error(`Control not found: ${key}=${value}`);
    return node;
  }
  const has = (key, value = true) => { try { find(key, value); return true; } catch (e) { return false; } };
  const click = (key, value = true) => find(key, value).props.onClick({ currentTarget: null, stopPropagation() {}, preventDefault() {} });
  const runDay = () => { Object.assign(state(), { showAdvanceReview: true }); click('data-community-run-day'); };
  return { state, find, has, click, runDay, patch: (p) => Object.assign(state(), p) };
}
function render(data) {
  resetStemLab();
  loadTool(FILE, TOOL_ID);
  return renderTool(TOOL_ID, { companionPlanting: data || {} });
}
function model() {
  const start = SOURCE.indexOf('  var CP_PREDATOR_EAT_RATE');
  const end = SOURCE.indexOf('  function companionWeakestEvidence');
  if (start < 0 || end < start) throw new Error('model block missing');
  // eslint-disable-next-line no-new-func
  return new Function(SOURCE.slice(start, end) + '\nreturn { CP_PREDATOR_EAT_RATE, CP_LADYBUG_RELEASE, CP_LADYBUG_COLONY, CP_IPM_MODEL, CP_REPEL_BY_EVIDENCE, companionReleasedBeetlesStep, companionLadybugColonyEffect, companionIPMEffect, companionLadybugPredictionOptions, companionRepelGrade, companionRepelShare };')();
}
function extractArray(name) {
  const start = SOURCE.indexOf('var ' + name + ' = [');
  if (start < 0) throw new Error('missing ' + name);
  let depth = 0, i = SOURCE.indexOf('[', start), end = -1;
  for (; i < SOURCE.length; i++) {
    const ch = SOURCE[i];
    if (ch === '\'' || ch === '"') { const q = ch; i++; while (i < SOURCE.length && SOURCE[i] !== q) { if (SOURCE[i] === '\\') i++; i++; } continue; }
    if (ch === '[') depth++;
    if (ch === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  // eslint-disable-next-line no-new-func
  return new Function('__alloT', 'return ' + SOURCE.slice(SOURCE.indexOf('[', start), end + 1))((k, t) => t);
}
const releaseWith = (app, id) => { app.click('aria-label', 'Release ladybugs ($1.50)'); app.click('data-ladybug-predict-choice', id); };

afterEach(() => { vi.restoreAllMocks(); });

describe('Ladybug Colony follows the Penn State source and the shared predator model', () => {
  it('cites Penn State for aster-family flowers (lady beetles) and the carrot family (parasitic wasps)', () => {
    expect(SOURCE).toContain('attractive to larger predators such as lady');
    expect(SOURCE).toContain('"signet marigold"');
    expect(SOURCE).toContain('"especially attractive to small parasitic wasps and flies."');
  });

  it('event lesson, visitor clue, visitor evidence and dill text no longer say dill (or nasturtium) draws ladybugs', () => {
    const ev = SOURCE.slice(SOURCE.indexOf('var CG_GOOD_EVENTS'), SOURCE.indexOf("{ id: 'rain'"));
    expect(ev).not.toMatch(/dill and yarrow give them/);
    expect(ev).toContain('Flowers in the aster family, such as yarrow, sunflower, and marigold, draw lady beetles (Penn State Extension).');
    expect(CODE).not.toContain('Grow dill, yarrow, marigold, or nasturtium.');
    expect(CODE).toContain("clue: 'Grow yarrow, sunflower, or marigold (aster-family flowers).'");
    expect(CODE).not.toContain('Dill, yarrow, marigold, and nasturtium provide food and shelter for aphid predators.');
    expect(CODE).toContain("['yarrow','sunflower','marigold'].indexOf(cell.plantId)");
    expect(CODE).not.toContain("'Attracts ladybugs, lacewings, parasitic wasps.'");
    expect(CODE).toContain("attracts_ladybugs_lacewings_parasitic__v2', 'Its flowers draw tiny parasitic wasps and flies that attack pests.'");
  });

  it('the colony is 5 wild helper units eating at CP_PREDATOR_EAT_RATE, not a flat -15 per plot', () => {
    const m = model();
    expect(m.CP_LADYBUG_COLONY.units).toBe(5);
    expect(m.companionLadybugColonyEffect(30)).toEqual({ units: 5, eatenPerDay: 0.75, eatenToday: 0.75, plotShare: 0.025 });
    expect(m.companionLadybugColonyEffect(0.5)).toMatchObject({ eatenToday: 0.5, plotShare: 1 });
    expect(m.companionLadybugColonyEffect(0).plotShare).toBe(0);
    expect(CODE).not.toContain('pests: Math.max(0, c.pests - 15)');
  });

  it('a colony day adds 5 helpers, eats 0.75 more pests, trims plots by the same share, and shows the model note', () => {
    const control = harness(garden({ day: 10 }));
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    control.runDay();
    vi.restoreAllMocks();
    const colony = harness(garden({ day: 10 }));
    vi.spyOn(Math, 'random').mockReturnValue(0.05); // event fires, good event, index 0 = Ladybug Colony
    colony.runDay();
    vi.restoreAllMocks();
    const c = colony.state(), k = control.state();
    expect(c.activeEvent && c.activeEvent.label).toBe('Ladybug Colony!');
    expect(k.activeEvent).toBeFalsy();
    expect(Math.round((c.beneficialPop - k.beneficialPop) * 10) / 10).toBe(5);
    expect(k.pestPop - c.pestPop).toBeGreaterThan(0.6);
    expect(k.pestPop - c.pestPop).toBeLessThan(0.9);
    const drop = k.grid[0].pests - c.grid[0].pests;
    expect(drop).toBeGreaterThan(0.4); // about (20 + growth) x 2.5% + 0.75 x 0.05
    expect(drop).toBeLessThan(0.7);
    const html = render({ gardenMode: 'community', communityGarden: c });
    expect(html).toContain('data-event-model-note');
    expect(html).toContain('Model: 5 wild helper units join your Beneficials meter. Each helper eats 0.15 pest units a day, so together they eat about 0.75 a day. Wild beetles with flowers nearby stay.');
  });
});

describe('Neem, hand-picking and row covers: sourced directions, labelled model sizes', () => {
  it('quotes UC IPM (neem contact-only, harms beneficials it hits), UMN (hand-picking), UW-Madison (covers)', () => {
    expect(SOURCE).toContain('kill only aphids present on the day they are sprayed');
    expect(SOURCE).toContain('present on the plant and hit by the spray');
    expect(SOURCE).toContain("migrate in after the spray.");
    expect(SOURCE).toContain('"This is the most effective means of managing them."');
    expect(SOURCE).toContain('"Row covers exclude insects');
    expect(SOURCE).toContain('squash, need to be removed"');
    expect(SOURCE).toContain('actually increase crop damage');
  });

  it('companionIPMEffect: neem 30% pests and 10% helpers, hand-pick up to 20 units', () => {
    const m = model();
    expect(m.companionIPMEffect('neem', 30, 6)).toMatchObject({ pests: 21, removed: 9, plotShare: 0.3 });
    expect(m.companionIPMEffect('neem', 30, 6).helpers).toBeCloseTo(5.4, 9);
    expect(m.companionIPMEffect('handpick', 30, 6)).toMatchObject({ pests: 10, helpers: 6, removed: 20 });
    expect(m.companionIPMEffect('handpick', 12, 6)).toMatchObject({ pests: 0, removed: 12, plotShare: 1 });
  });

  it('neem and hand-pick change garden and plots by the same share and say "Model guess" on screen', () => {
    const neem = harness(garden());
    neem.click('aria-label', 'Neem spray ($1.00)');
    expect(neem.state()).toMatchObject({ pestPop: 21, beneficialPop: 5.4, budget: 19 });
    expect(neem.state().grid[0].pests).toBeCloseTo(14, 9);
    expect(neem.state().lastCareAction.effect).toContain('Model guess: it kills 30% of the pests and 10% of the helpers it hits.');
    expect(neem.find('data-ipm-model-note', 'neem').props.role).toBe('status');
    const pick = harness(garden());
    pick.click('aria-label', 'Hand-pick pests (free)');
    expect(pick.state()).toMatchObject({ pestPop: 10, beneficialPop: 6, budget: 20 });
    expect(pick.state().grid[0].pests).toBeCloseTo(20 / 3, 9);
    expect(pick.state().lastCareAction.effect).toContain('Hand-picked 20 pest units. Model guess: one session removes up to 20.');
    expect(CODE).not.toContain('-30% all pests, -10% beneficials');
    expect(CODE).not.toContain('-20 pest population');
  });

  it('row covers do not remove pests already there; the button toggles them off for free', () => {
    const app = harness(garden());
    app.click('aria-label', 'Row covers ($2.00)');
    expect(app.state()).toMatchObject({ rowCovers: true, pestPop: 30, budget: 18 });
    expect(app.state().grid[0].pests).toBe(20);
    expect(app.find('data-row-cover-note').props.role).toBe('status');
    expect(CODE).not.toContain('-40% current pests');
    app.click('aria-label', 'Remove row covers (free)');
    expect(app.state()).toMatchObject({ rowCovers: false, budget: 18 });
    expect(app.state().lastCareAction.label).toBe('Removed row covers');
  });

  it('covers cut new pests on each plot to 40% and the garden-wide arrivals to 40%', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const open = harness(garden({ pestPop: 0, beneficialPop: 0 }));
    open.runDay();
    const covered = harness(garden({ pestPop: 0, beneficialPop: 0, rowCovers: true }));
    covered.runDay();
    const rise = (app) => app.state().grid[0].pests - 20;
    expect(rise(open)).toBeGreaterThan(0);
    expect(rise(covered) / rise(open)).toBeCloseTo(0.4, 6);
    // Six crops: arrivals 0.3 x 0.5 = 0.15 open, 0.06 covered.
    const six = { 2: { plantId: 'carrot' }, 3: { plantId: 'pepper' }, 5: { plantId: 'potato' } };
    const open6 = harness(garden({ pestPop: 0, beneficialPop: 0 }, six));
    open6.runDay();
    const cov6 = harness(garden({ pestPop: 0, beneficialPop: 0, rowCovers: true }, six));
    cov6.runDay();
    expect(open6.state().pestPop).toBe(0.2);
    expect(cov6.state().pestPop).toBe(0.1);
  });

  it('a bee crop that flowers under covers is flagged, warned about, and harvested as not pollinated', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const days = Number(SOURCE.match(/squash: +\{[^}]*?days: (\d+)/)[1]);
    const soon = harness(garden({ rowCovers: true }, { 4: { plantId: 'squash', growthDay: days * 0.5 } }));
    expect(soon.find('data-bloom-soon', 1)).toBeTruthy();
    const app = harness(garden({ rowCovers: true }, { 4: { plantId: 'squash', growthDay: days * 0.6 } }));
    app.runDay();
    expect(app.state().grid[4].bloomCovered).toBe(true);
    expect(app.state().grid[0].bloomCovered).toBeUndefined(); // corn does not need bees
    const ctl = harness(garden({}, { 4: { plantId: 'squash', growthDay: days * 0.6 } }));
    ctl.runDay();
    expect(ctl.state().grid[4].bloomCovered).toBeUndefined();
    // The note stays after covers come off, so the half harvest is never a surprise.
    const html = render({ gardenMode: 'community', communityGarden: Object.assign({}, app.state(), { rowCovers: false }) });
    expect(html).toContain('1 crop flowered under covers. In the model it counts as not pollinated: half harvest.');
    expect(CODE).toContain('if (cell.bloomCovered) hasNearbyPollinator = false;');
    // Harvest: same mature squash beside yarrow; the one that flowered under covers earns half.
    const harvest = (flag) => {
      const grid = emptyGrid();
      grid[4] = Object.assign({ plantId: 'squash', growthDay: days, health: 100, watered: false, pests: 0 }, flag ? { bloomCovered: true } : {});
      grid[5] = { plantId: 'yarrow', growthDay: 10, health: 100, watered: false, pests: 0 };
      const h = harness({ grid, phase: 'grow', day: 30, budget: 20, revenue: 0 });
      h.click('data-play-primary');
      return h.state().revenue;
    };
    const full = harvest(false), half = harvest(true);
    expect(full).toBeGreaterThan(0);
    expect(half).toBeCloseTo(full / 2, 1);
  });
});

describe('Garden-wide pest repel follows the evidence grade', () => {
  it('grades come from CG_COMPANIONS: onion tested, basil and marigold mixed, garlic and nasturtium tradition', () => {
    const m = model();
    const pairs = extractArray('CG_COMPANIONS');
    const grade = (id) => m.companionRepelGrade(id, pairs);
    expect(['onion', 'basil', 'marigold', 'garlic', 'nasturtium'].map(grade)).toEqual(['tested', 'mixed', 'mixed', 'tradition', 'tradition']);
    expect(['onion', 'basil', 'marigold', 'garlic', 'nasturtium', 'mint'].map((id) => m.companionRepelShare(id, pairs))).toEqual([0.08, 0.04, 0.04, 0, 0, 0]);
    expect(CODE).not.toContain("c.plantId === 'garlic' || c.plantId === 'basil')) companionRepel += 0.08");
  });

  it('in the day engine garlic changes nothing, basil cuts about 4% and onion about 8% of pest growth', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const run = (plantId) => { const app = harness(garden({}, { 8: { plantId } })); app.runDay(); return app.state().pestPop; };
    const lettuce = run('lettuce');
    expect(run('garlic')).toBe(lettuce);
    expect(lettuce - run('basil')).toBeCloseTo(1.2, 0);
    expect(lettuce - run('onion')).toBeCloseTo(2.4, 0);
    expect(Math.abs(lettuce - run('basil') - 1.2)).toBeLessThan(0.15);
    expect(Math.abs(lettuce - run('onion') - 2.4)).toBeLessThan(0.15);
  });
});

describe('Ladybug release is predict-first', () => {
  it('the button opens a prediction; nothing is released or spent until a choice is made', () => {
    const app = harness(garden());
    app.click('aria-label', 'Release ladybugs ($1.50)');
    expect(app.state()).toMatchObject({ ladybugPredictOpen: true, budget: 20, pestPop: 30 });
    expect(app.state().releasedBeetles || 0).toBe(0);
    expect(app.find('data-ladybug-predict').props.role).toBe('group');
    app.click('data-ladybug-predict-cancel');
    expect(app.state().ladybugPredictOpen).toBe(false);
    expect(app.state().budget).toBe(20);
  });

  it('choices come from the model (30% stay), and the right one moves between positions', () => {
    const m = model();
    const values = (opts) => opts.map((o) => o.value).sort((a, b) => a - b);
    expect(values(m.companionLadybugPredictionOptions(10, 0))).toEqual([0, 3, 7, 10]);
    expect(values(m.companionLadybugPredictionOptions(13, 0))).toEqual([0, 3.9, 9.1, 13]);
    const answerAt = new Set([0, 1, 2, 3].map((k) => m.companionLadybugPredictionOptions(10, k).findIndex((o) => o.id === 'model')));
    expect(answerAt.size).toBe(4);
    m.companionLadybugPredictionOptions(10, 0).forEach((o) => { if (o.id === 'model') expect(o.value).toBe(m.companionReleasedBeetlesStep(10).left); });
  });

  it('a right prediction is checked the next day against the engine count', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const app = harness(garden());
    releaseWith(app, 'model');
    expect(app.state()).toMatchObject({ releasedBeetles: 10, budget: 18.5, ladybugPredictOpen: false });
    expect(app.state().ladybugPrediction).toMatchObject({ day: 0, total: 10, guess: 3, answer: 3, optionId: 'model' });
    let html = render({ gardenMode: 'community', communityGarden: app.state() });
    expect(html).toContain('Your prediction: 3 helper units still here tomorrow. Run a day to check.');
    expect(html).not.toContain('Today 3 are still here');
    app.runDay();
    html = render({ gardenMode: 'community', communityGarden: app.state() });
    expect(app.state().releasedBeetles).toBe(3);
    expect(html).toContain('You predicted 3. Today 3 are still here. Right! The model keeps 30% of bought beetles each day');
    expect(html).toContain('data-ladybug-predict-result="correct"');
    app.runDay();
    expect(render({ gardenMode: 'community', communityGarden: app.state() })).not.toContain('data-ladybug-predict-result');
  });

  it('each wrong choice explains its misconception', () => {
    const cases = { all: 'purchased Hippodamia inherently disperse', most: 'That is the 70% that LEAVE each day in the model.', none: 'Close: most leave, but UC IPM says within 1 or 2 days' };
    for (const [id, why] of Object.entries(cases)) {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      const app = harness(garden());
      releaseWith(app, id);
      app.runDay();
      vi.restoreAllMocks();
      const html = render({ gardenMode: 'community', communityGarden: app.state() });
      expect(html).toContain('Today 3 are still here.');
      expect(html).toContain(why);
      expect(html).toContain('data-ladybug-predict-result="' + id + '"');
    }
  });
});

describe('Small cleanups', () => {
  it('the Sisters canvas has no unused dpr variable', () => {
    expect(CODE).not.toMatch(/var dpr = 2;/);
  });
  it('the four IPM buttons are at least 44 px tall', () => {
    const html = render({ gardenMode: 'community', communityGarden: garden() });
    for (const label of ['Release ladybugs ($1.50)', 'Neem spray ($1.00)', 'Hand-pick pests (free)', 'Row covers ($2.00)']) {
      const at = html.indexOf('aria-label="' + label + '"');
      expect(at).toBeGreaterThan(0);
      const tag = html.slice(html.lastIndexOf('<button', at), html.indexOf('>', at));
      expect(tag).toContain('min-h-[44px]');
    }
  });
});
