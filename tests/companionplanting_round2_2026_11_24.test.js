// Companion Planting round 2 (2026-11-24): XP only for evidence, sourced or cut garden tips, evidence grades in the
// experiment bench and the Companions garden view, dead tables removed, 12 px text and 44 px target floors.
// Fail-first check: CP_TOOL_FILE=C:/tmp/sports_labs_1123/companionplanting/start_r2.js npx vitest run <this file>
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab, newStore, makeCtx, React } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.CP_TOOL_FILE || 'stem_lab/stem_tool_companionplanting.js';
const TOOL_ID = 'companionPlanting';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');
// Student-facing code only: whole-line comments quote the old claims on purpose.
const CODE = SOURCE.split('\n').filter((line) => !/^\s*\/\//.test(line)).join('\n');

function emptyGrid() {
  return Array.from({ length: 16 }, () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }));
}
function render(data) {
  resetStemLab();
  loadTool(FILE, TOOL_ID);
  return renderTool(TOOL_ID, { companionPlanting: data || {} });
}
// Element-tree harness: clicks call the real handlers against a live store.
function app(seed) {
  resetStemLab();
  const config = loadTool(FILE, TOOL_ID);
  const store = newStore({ companionPlanting: seed });
  const awardXP = vi.fn(), saveSnapshot = vi.fn();
  const tree = () => config.render(makeCtx({ toolData: store.toolData, awardXP, saveSnapshot }, store));
  const findBy = (pred) => {
    const visit = (node) => {
      if (Array.isArray(node)) { for (const child of node) { const hit = visit(child); if (hit) return hit; } return null; }
      if (!React.isValidElement(node)) return null;
      if (pred(node)) return node;
      return visit(node.props.children);
    };
    const hit = visit(tree());
    if (!hit) throw new Error('element not found');
    return hit;
  };
  const find = (key, value = true) => findBy((n) => n.props[key] === value);
  const cp = () => store.toolData.companionPlanting;
  const cg = () => cp().communityGarden;
  return { store, awardXP, find, findBy, cp, cg, click: (key, value = true) => find(key, value).props.onClick(),
    patch: (p) => Object.assign(cp(), p), patchGarden: (p) => Object.assign(cg(), p),
    ids: () => awardXP.mock.calls.map((c) => c[0]) };
}
function extractArray(name) {
  const start = SOURCE.indexOf('var ' + name + ' = [');
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

afterEach(() => { vi.restoreAllMocks(); });

describe('Companion Planting round 2: XP comes from evidence, not routine clicks', () => {
  it('removes every routine-action award from the source', () => {
    for (const id of ['companion_garden_plant', 'companion_garden_water', 'companion_garden_weed', 'companion_garden_compost',
      'companion_garden_ipm', 'companion_garden_event', 'companion_garden_harvest', 'companion_garden_grow', 'companion_garden_starter',
      'companion_visitor_', 'companion_planting_corn', 'companion_planting_beans', 'companion_planting_squash', 'companion_planting_grow',
      'companion_action_']) expect(CODE).not.toContain("'" + id);
    expect(CODE).not.toMatch(/\+[358] XP/);
    expect(CODE).not.toContain('Observe +8 XP');
  });

  it('plants a starter, starts growing, waters, weeds, composts, and harvests without awarding XP', () => {
    const grid = emptyGrid();
    const a = app({ gardenMode: 'community', communityGarden: { grid, budget: 50 } });
    a.click('data-play-primary'); // starter plan
    a.click('data-play-primary'); // start growing
    expect(a.cg().phase).toBe('grow');
    a.patchGarden({ moisture: 20 });
    a.click('data-play-water');
    a.patchGarden({ grid: a.cg().grid.map((c) => (c.plantId ? Object.assign({}, c, { pests: 40 }) : c)) });
    a.click('data-play-weed');
    a.click('data-play-compost');
    a.patchGarden({ grid: a.cg().grid.map((c) => (c.plantId ? Object.assign({}, c, { growthDay: 999, health: 90, pests: 0 }) : c)), moisture: 60 });
    a.click('data-play-primary'); // harvest ready crops
    expect(a.cg().totalHarvested).toBeGreaterThan(0);
    expect(a.awardXP).not.toHaveBeenCalled();
  });

  it('gives no XP for planting the Three Sisters or pressing Grow, and pays the season award only for the first season', () => {
    const a = app({});
    for (const label of ['Corn', 'Beans', 'Squash']) a.find('aria-label', label).props.onClick();
    a.find('aria-label', 'Grow!').props.onClick();
    expect(a.awardXP).not.toHaveBeenCalled();
    a.patch({ phase: 'harvest', growthTime: 100, harvestCount: 0, seasonScore: 10 });
    a.find('aria-label', 'Harvest and start next season').props.onClick();
    expect(a.ids()).toEqual(['companion_planting_harvest']);
    a.patch({ phase: 'harvest', growthTime: 100, cornPlanted: true, beansPlanted: true, squashPlanted: true });
    a.find('aria-label', 'Harvest and start next season').props.onClick();
    expect(a.awardXP).toHaveBeenCalledTimes(1);
  });

  it('awards quiz XP once per question, not again when the question cycles back', () => {
    const a = app({ gardenWorkspace: 'science', quizActive: true, quizQ: 0 });
    a.find('aria-label', 'Select answer: Beans').props.onClick();
    expect(a.ids()).toEqual(['companion_planting_quiz']);
    a.patch({ quizAnswer: '', quizFeedback: '', quizQ: extractArray('quizzes').length }); // wraps to the same question
    a.find('aria-label', 'Select answer: Beans').props.onClick();
    expect(a.awardXP).toHaveBeenCalledTimes(1);
  });

  it('awards food-miles XP only for a first prediction that matches the cited evidence', () => {
    const a = app({ gardenWorkspace: 'systems', showFoodMiles: true });
    a.click('data-food-miles-choice', 'kind');
    expect(a.ids()).toEqual(['companion_food_miles_prediction']);
    a.patch({ foodMilesPrediction: null });
    a.click('data-food-miles-choice', 'kind');
    expect(a.awardXP).toHaveBeenCalledTimes(1);
    const b = app({ gardenWorkspace: 'systems', showFoodMiles: true });
    b.click('data-food-miles-choice', 'distance');
    b.patch({ foodMilesPrediction: null });
    b.click('data-food-miles-choice', 'kind');
    expect(b.awardXP).not.toHaveBeenCalled();
  });

  it('awards pair-guess XP only for a correct evidence guess, one guess per pair', () => {
    const pairs = extractArray('COMPANION_PAIRS');
    const firstKey = pairs[0].plant1 + '+' + pairs[0].plant2;
    const a = app({ gardenWorkspace: 'reference', showPairs: true, pairGuessMode: true });
    a.click('data-pair-guess', pairs[0].evidence);
    expect(a.cp().pairGuesses[firstKey]).toBe(pairs[0].evidence);
    expect(a.ids()).toEqual(['companion_pair_evidence_guess']);
    const wrong = ['tested', 'mixed', 'tradition'].find((g) => g !== pairs[0].evidence);
    const b = app({ gardenWorkspace: 'reference', showPairs: true, pairGuessMode: true });
    b.click('data-pair-guess', wrong);
    expect(b.awardXP).not.toHaveBeenCalled();
  });

  it('locks the first soil-trial prediction and awards XP only when it matches the model', () => {
    const grid = emptyGrid();
    grid[0] = { plantId: 'tomato', growthDay: 15, health: 95, watered: true, pests: 0 };
    const seed = () => ({ gardenMode: 'community', communityGarden: { phase: 'grow', grid: structuredClone(grid), soilTrial: 'lime', nitrogen: 30, phosphorus: 20, potassium: 25, pH: 5.8, organicMatter: 2.4, budget: 10 } });
    // The model's direction for this setup (pinned by the soil chemistry suite) is "improves".
    const modeled = render(Object.assign(seed(), { communityGarden: Object.assign(seed().communityGarden, { soilTrialPrediction: 'same' }) })).match(/data-soil-trial-result="(\w+)"/)[1];
    expect(modeled).toBe('improves');
    const a = app(seed());
    a.click('data-soil-trial-prediction', 'improves');
    expect(a.ids()).toEqual(['companion_soil_trial_prediction']);
    expect(a.find('data-soil-trial-prediction', 'worsens').props.disabled).toBe(true);
    const b = app(seed());
    b.click('data-soil-trial-prediction', 'worsens');
    b.click('data-soil-trial-prediction', 'improves'); // changing the answer after seeing the evidence is blocked
    expect(b.cg().soilTrialPrediction).toBe('worsens');
    expect(b.awardXP).not.toHaveBeenCalled();
  });

  it('awards bench XP for a saved trial with a written prediction and conclusion, once per run', () => {
    const grid = emptyGrid();
    grid[0].plantId = 'corn'; grid[1].plantId = 'beans'; grid[4].plantId = 'squash';
    const a = app({ gardenMode: 'community', communityGarden: { grid, phase: 'grow', day: 0, budget: 41, moisture: 60 } });
    a.click('data-experiment-capture');
    a.find('data-experiment-prediction').props.onChange({ target: { value: 'I predict layout B will grow faster' } });
    a.click('data-experiment-run');
    a.click('data-experiment-save');
    expect(a.awardXP).not.toHaveBeenCalled(); // no conclusion yet
    a.find('data-experiment-conclusion').props.onChange({ target: { value: 'In this model the two layouts matched exactly.' } });
    a.click('data-experiment-save');
    a.click('data-experiment-save');
    expect(a.ids()).toEqual(['companion_bench_trial']);
  });
});

describe('Companion Planting round 2: evidence grades in the bench and the Companions view', () => {
  const GRADES = { tested: 'Tested', mixed: 'Mixed results', tradition: 'Garden tradition' };
  const RANK = { tested: 3, mixed: 2, tradition: 1 };
  const pairs = extractArray('CG_COMPANIONS');
  const relation = (a, b) => pairs.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a));
  const neighbors = (i) => Array.from({ length: 16 }, (_, j) => j).filter((j) => j !== i && Math.abs(j % 4 - i % 4) <= 1 && Math.abs(Math.floor(j / 4) - Math.floor(i / 4)) <= 1);

  it('labels each plot in the Companions view with the weakest grade among its modeled pairs', () => {
    const grid = emptyGrid();
    [[5, 'tomato'], [4, 'basil'], [6, 'potato'], [1, 'carrot'], [9, 'clover'], [10, 'dill'], [0, 'corn'], [2, 'beans'], [8, 'squash']]
      .forEach(([i, id]) => { grid[i] = { plantId: id, growthDay: 30, health: 95, watered: false, pests: 0 }; });
    const html = render({ gardenMode: 'community', communityGarden: { phase: 'grow', grid, playShowPlots: true, playGardenLens: 'companions', playCompanionFocus: 5 } });
    let checked = 0;
    grid.forEach((cell, i) => {
      if (!cell.plantId) return;
      const grades = neighbors(i).map((j) => grid[j].plantId && relation(cell.plantId, grid[j].plantId)).filter(Boolean).map((p) => p.evidence);
      const weakest = grades.sort((x, y) => RANK[x] - RANK[y])[0];
      const tile = html.split('data-play-plot="' + i + '"')[1].split('data-play-plot="')[0];
      if (weakest) { expect(tile).toContain('data-plot-evidence="' + weakest + '"'); expect(tile).toContain('>' + GRADES[weakest] + '<'); checked++; }
      else expect(tile).not.toContain('data-plot-evidence=');
    });
    expect(checked).toBeGreaterThan(4);
    // Pair explorer buttons carry the grade of each neighbor pair too.
    expect(html).toContain('data-companion-pair-evidence="' + relation('tomato', 'basil').evidence + '"');
  });

  it('lists the graded pairs that touch the tracked crop in both experiment layouts', () => {
    const grid = emptyGrid();
    grid[0].plantId = 'corn'; grid[1].plantId = 'beans'; grid[4].plantId = 'squash';
    const a = app({ gardenMode: 'community', communityGarden: { grid, phase: 'grow', day: 0, budget: 41, moisture: 60 } });
    a.click('data-experiment-capture');
    const html = render({ gardenMode: 'community', communityGarden: a.cg() });
    const sideA = html.split('data-experiment-pairs="a"')[1].split('data-experiment-pairs="b"')[0];
    for (const other of ['beans', 'squash']) {
      const grade = relation('corn', other).evidence;
      expect(sideA).toContain('data-experiment-pair-evidence="' + grade + '"');
      expect(sideA).toContain(GRADES[grade]);
    }
    expect(html).toContain('data-experiment-pairs="b"');
  });
});

describe('Companion Planting round 2: accuracy (sourced or cut)', () => {
  it('no longer states the unsourced tips found in the round-2 pass', () => {
    const banned = [/3 parts Brown/, /golden ratio/i, /every 2-3 weeks/, /Morning watering prevents/, /Never repeat a family/,
      /two years in a row/, /3-year rotation minimum/, /Rotate every 2 years/, /2-3 year rotation/, /causes forking/,
      /need calcium and sulfur/, /Very acidic and low in minerals/, /sand for drainage/, /Add sulfur to lower pH, lots of organic matter/,
      /Ambush predator/, /20 crop species/, /most productive zone/, /support the most biodiversity/, /works automatically/,
      /\(1-14\)/, /open for only one morning/, /3-cell radius/, /Harvest daily/, /always plant mint/, /well established by about 1300/,
      /sand barriers/, /Row covers \(most effective\)/, /Free water from the sky/];
    expect(banned.filter((re) => re.test(CODE)).map(String)).toEqual([]);
  });

  it('cites a source for each kept tip', () => {
    for (const url of ['extension.psu.edu/high-tunnel-soil-test-report-soil-ph', 'yardandgarden.extension.iastate.edu/how-to/crop-rotation-vegetable-garden',
      'yardandgarden.extension.iastate.edu/how-to/watering-home-vegetable-garden', 'extension.umd.edu/resource/planting-vegetables-succession',
      'mulching-for-soil-and-garden-health', 'composting-basics', 'extension.colostate.edu/resource/soil-ph',
      'extensionpubs.unl.edu/publication/g1754', 'ipm.ucanr.edu/natural-enemies/mantids', 'ipm.ucanr.edu/home-and-landscape/carrot-rust-fly',
      'extension.illinois.edu/herbs/mint', 'permacultureprinciples.com', 'commercial-blueberry-production-minnesota-and-wisconsin']) {
      expect(SOURCE).toContain(url);
    }
  });

  it('draws the reference pH bars from the simulation ranges (PLANT_NPK idealPH)', () => {
    const html = render({ gardenWorkspace: 'reference', showPH: true });
    const rows = [...html.matchAll(/data-ph-plant="(\w+)" data-ph-range="([\d.]+)-([\d.]+)"/g)];
    expect(rows.length).toBeGreaterThan(8);
    for (const [, id, lo, hi] of rows) {
      const m = SOURCE.match(new RegExp('\\n\\s+' + id + ': \\{ n: [^}]*idealPH: \\[([\\d.]+), ([\\d.]+)\\]'));
      expect(m, id).toBeTruthy();
      expect([Number(lo), Number(hi)]).toEqual([Number(m[1]), Number(m[2])]);
    }
    expect(html).toContain('0 to 14');
  });

  it('describes the bee hotel the way the harvest model treats it: anywhere in the garden', () => {
    expect(CODE).toMatch(/one bee hotel anywhere in the garden counts as pollinator habitat/);
    const harvest = (withHotel) => {
      const grid = emptyGrid();
      grid[0] = { plantId: 'cucumber', growthDay: 999, health: 100, watered: false, pests: 0 };
      if (withHotel) grid[15] = { plantId: 'bee_hotel', growthDay: 20, health: 100, watered: false, pests: 0 };
      const a = app({ gardenMode: 'community', communityGarden: { grid, phase: 'grow', budget: 10, moisture: 60 } });
      a.click('data-play-primary');
      return Math.round((a.cg().budget - 10) * 100) / 100;
    };
    const far = harvest(true), none = harvest(false);
    expect(far).toBeGreaterThan(0);
    expect(none).toBeCloseTo(far / 2, 2); // a hotel in the far corner still gives full pollination
  });
});

describe('Companion Planting round 2: cleanup and readability floors', () => {
  it('removes the unreferenced _EVENTS / _ACTIONS tables and their helpers', () => {
    expect(SOURCE).not.toMatch(/var _EVENTS = \[|var _ACTIONS = \[|function doAction\(|function applyEffects\(/);
  });

  it('applies a 12 px text floor and 44 px target floor in both garden modes', () => {
    for (const html of [render({}), render({ gardenMode: 'community' })]) {
      expect(html).toContain('data-cp-floor="true"');
      for (const size of ['0.5rem', '0.5625rem', '0.625rem', '0.6875rem']) expect(html).toContain('[class~=&quot;text-[' + size + ']&quot;]');
      expect(html).toContain('{font-size:.75rem;line-height:1rem}');
      expect(html).toContain('[data-cp-floor] button{min-height:44px;min-width:44px}');
    }
    expect(SOURCE).not.toMatch(/font-size:\s?(8|9|10|10\.5|11)px/);
    expect(CODE).not.toMatch(/className: "transition-colors text-\[0\.6875rem\]/);
  });

  it('gives the reference Hide / Explore toggles 44 px targets and an expanded state', () => {
    const html = render({ gardenWorkspace: 'reference', showPairs: true });
    const toggle = html.match(/<button[^>]*aria-expanded="true"[^>]*>Hide<\/button>/);
    expect(toggle).toBeTruthy();
    expect(toggle[0]).toContain('min-h-[44px]');
  });
});
