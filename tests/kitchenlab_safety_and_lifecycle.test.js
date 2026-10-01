// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, ReactDOMServer, loadTool, makeCtx, newStore, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Seven defects from the 2026-09-27 Kitchen Lab review, each pinned by what a
// student or teacher would see:
//   1. one egg-safety rule (160°F unless pasteurised) across every egg recipe,
//   2. competition bonuses cannot lift food the judge would not serve,
//   3. every cook start resets the whole cook, the AI critique included,
//   4. progress survives a reload, and a bad saved value cannot blank a screen,
//   5. °C mode shows a temperature difference as a difference,
//   6. a cook nobody is watching pauses instead of burning,
//   7. no developer notes on student screens.
const require = createRequire(import.meta.url);
const source = readFileSync('stem_lab/stem_tool_kitchenlab.js', 'utf8');
const act = React.act;
vi.setConfig({ testTimeout: 30000 });   // full-tool renders and bench runs; slow on a loaded machine

let E, cfg;
beforeAll(() => {
  resetStemLab();
  cfg = loadTool('stem_lab/stem_tool_kitchenlab.js', 'kitchenLab');
  E = cfg.engine;
});

const labels = (j) => j.notes.map((n) => n.label);
const has = (j, text) => labels(j).some((l) => l.includes(text));
const strip = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
// A failing toContain on the whole tool source or page makes vitest diff the
// entire string and hang; name what was missing instead.
const mustContain = (s, x) => expect(s.includes(x), 'missing: ' + x).toBe(true);
const mustNotContain = (s, x) => expect(s.includes(x), 'unexpected: ' + x).toBe(false);

describe('Kitchen Lab egg safety: one rule for every egg recipe', () => {
  const eggSnap = (peakF, options = {}) => ({
    maxPanTempF: 270, activeTimeSec: 75, options,
    itemAddTimes: { butter: 1000, eggs: 5000, saltPepper: 90000 },
    heatRemovedAt: 54000, lastTickAt: 95000,
    doneness: { browning: 0.05, foodPeakF: peakF, secAboveOverF: 0, setAt: 56000, set: peakF >= 145, simElapsedSec: 95, stirCount: 6, unattendedSec: 0 }
  });

  it('names the safe minimum per recipe, lifted only by pasteurised eggs', () => {
    expect(E.safetyFloorF(E.RECIPES.scrambledEggs, {})).toBe(160);
    expect(E.safetyFloorF(E.RECIPES.scrambledEggs, { eggs: 'pasteurised' })).toBeNull();
    expect(E.safetyFloorF(E.RECIPES.omelet, {})).toBe(160);
    expect(E.safetyFloorF(E.RECIPES.friedEgg, { eggs: 'regular' })).toBe(160);
    expect(E.safetyFloorF(E.RECIPES.friedEgg, { eggs: 'pasteurised' })).toBeNull();
    expect(E.safetyFloorF(E.RECIPES.panSeared, {})).toBe(165);
    expect(E.safetyFloorF(E.RECIPES.roastChicken, {})).toBe(165);
    expect(E.safetyFloorF(E.RECIPES.steak, {})).toBe(145);
    expect(E.safetyFloorF(E.RECIPES.stirFry, {})).toBeNull();
    expect(E.safetyFloorF(E.RECIPES.freeCook, {}, { sandboxFood: 'eggs' })).toBe(160);
    expect(E.safetyFloorF(E.RECIPES.freeCook, {}, { sandboxFood: 'chicken' })).toBe(165);
  });

  it('fails soft scrambled eggs from regular eggs on safety, and passes them from pasteurised eggs', () => {
    for (const peak of [146, 150, 155, 159]) {
      const j = E.RECIPES.scrambledEggs.judge(eggSnap(peak));
      expect(j.score, 'regular ' + peak).toBeLessThanOrEqual(49);
      expect(has(j, 'FOOD SAFETY'), 'regular ' + peak).toBe(true);
      expect(has(j, '✓ Timing') || has(j, 'Carryover'), 'no praise beside a safety fail ' + peak).toBe(false);
      expect(j.verdict).toMatch(/not safe/i);
      const p = E.RECIPES.scrambledEggs.judge(eggSnap(peak, { eggs: 'pasteurised' }));
      expect(p.grade, 'pasteurised ' + peak).toBe('A');
      expect(has(p, 'FOOD SAFETY')).toBe(false);
    }
    expect(E.RECIPES.scrambledEggs.judge(eggSnap(163)).grade).toBe('A');
  });

  it('holds the omelet to the same 160°F', () => {
    const snap = (peak, options = {}) => ({ maxPanTempF: 360, activeTimeSec: 50, options, itemAddTimes: { butter: 1000, eggs: 4000, roll: 60000 },
      doneness: { browning: 0.3, foodPeakF: peak, secAboveOverF: 0, set: peak >= 145, stirCount: 5, unattendedSec: 0 } });
    const j = E.RECIPES.omelet.judge(snap(152));
    expect(j.score).toBeLessThanOrEqual(49);
    expect(has(j, 'FOOD SAFETY')).toBe(true);
    expect(has(j, '✓ Speed')).toBe(false);
    expect(E.RECIPES.omelet.judge(snap(152, { eggs: 'pasteurised' })).grade).toBe('A');
    expect(E.RECIPES.omelet.judge(snap(170)).grade).toBe('A');
  });

  it('fails the review’s case through the engine: the textbook scramble pulled 10°F early', () => {
    const early = E.runBench(E.RECIPES.scrambledEggs, 'pull', '-10').result;
    expect(early.snapshot.doneness.foodPeakF).toBeLessThan(160);
    expect(early.judgement.score).toBeLessThanOrEqual(49);
    expect(has(early.judgement, 'FOOD SAFETY')).toBe(true);
    const textbook = E.runBench(E.RECIPES.scrambledEggs, 'opt:eggs', 'regular').result;
    expect(textbook.snapshot.doneness.foodPeakF).toBeGreaterThanOrEqual(160);
    expect(textbook.judgement.grade).toBe('A');
  });

  it('marks 160°F as the safe point in the forecast for regular eggs only', () => {
    const base = Object.assign(E.defaultState(), { recipeActiveId: 'scrambledEggs', recipeItemsInPan: ['butter', 'eggs'], recipeBurnerLevel: 3, recipePanTempF: 270, recipeFoodInternalF: 100, recipeLastTickAt: 1_000_000, recipeCurrentStep: 3 });
    const reg = E.forecast(E.RECIPES.scrambledEggs, Object.assign({}, base, { recipeOptions: {} })).marks.map((m) => m.label);
    mustContain(reg, 'centre 160°F (safe)');
    expect(reg.indexOf('centre 160°F (safe)')).toBeLessThan(reg.indexOf('centre 175°F (overdone)'));
    const past = E.forecast(E.RECIPES.scrambledEggs, Object.assign({}, base, { recipeOptions: { eggs: 'pasteurised' } })).marks.map((m) => m.label);
    mustNotContain(past, 'centre 160°F (safe)');
    mustContain(past, 'centre 145°F (set)');
  });
});

describe('Kitchen Lab competition cannot rescue unsafe food', () => {
  const thermo = () => E.COMPETITION_CONSTRAINTS.find((c) => c.id === 'thermometerTruth');

  it('knows a cook the judge failed on safety', () => {
    const failed = { score: 49, notes: [{ neg: true, label: '☣️ FOOD SAFETY: undercooked' }] };
    expect(E.isUnsafeCook(E.RECIPES.roastChicken, { options: {}, doneness: { foodPeakF: 170 } }, failed)).toBe(true);
    expect(E.isUnsafeCook(E.RECIPES.scrambledEggs, { options: {}, doneness: { foodPeakF: 150 } }, { score: 90, notes: [] })).toBe(true);
    expect(E.isUnsafeCook(E.RECIPES.scrambledEggs, { options: { eggs: 'pasteurised' }, doneness: { foodPeakF: 150 } }, { score: 100, notes: [] })).toBe(false);
    expect(E.isUnsafeCook(E.RECIPES.panSeared, { options: {}, doneness: { foodPeakF: 167 } }, { score: 100, notes: [] })).toBe(false);
    expect(E.isUnsafeCook(E.RECIPES.freeCook, { options: {}, doneness: { foodPeakF: 100 } }, { score: null, notes: [] })).toBe(false);
  });

  it('aims Thermometer Truth at the student’s target or the safe minimum, whichever is higher', () => {
    const t = thermo();
    const egg = (peak, options) => t.check({ options, doneness: { foodPeakF: peak } }, E.RECIPES.friedEgg);
    expect(egg(152, { eggs: 'regular', yolk: 'runny' }).passed).toBe(false);
    expect(egg(152, { eggs: 'regular', yolk: 'runny' }).resultText).toMatch(/under the 160°F safe minimum/);
    expect(egg(152, { eggs: 'pasteurised', yolk: 'runny' }).passed).toBe(true);
    expect(egg(172, { eggs: 'regular', yolk: 'firm' }).passed).toBe(true);
    expect(t.check({ options: { target: 'well' }, doneness: { foodPeakF: 162 } }, E.RECIPES.steak).passed).toBe(true);
    expect(t.check({ options: {}, doneness: { foodPeakF: 212 } }, E.RECIPES.caramelisedOnions).resultText).toMatch(/automatic pass/);
    expect(t.check({ options: {}, doneness: { foodPeakF: 150 } }, E.RECIPES.scrambledEggs).resultText).toMatch(/automatic pass/);
  });

  it('withholds every constraint bonus from an unsafe dish, and keeps the penalties', () => {
    mustContain(source, 'var unsafe = isUnsafeCook(rec, snapshot, judgement, prior);');
    mustContain(source, 'if (r.passed) { if (!unsafe) bonusTotal += c.bonus; }');
    mustContain(source, 'points: r.passed ? (unsafe ? 0 : c.bonus) : c.penalty,');
    mustContain(source, 'bonusWithheld: unsafe,');
  });
});

// Mount the tool for real and click through it; the store plays the host.
function mount(kitchenLab) {
  const store = newStore({ kitchenLab: kitchenLab });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const draw = () => act(() => { root.render(cfg.render(makeCtx({ toolData: store.toolData }, store))); });
  draw();
  const button = (re) => [...host.querySelectorAll('button')].find((b) => re.test(b.textContent || ''));
  return { store, host, root, draw, button, kl: () => store.toolData.kitchenLab };
}

describe('Kitchen Lab starts every cook clean', () => {
  const results = (over) => Object.assign(E.defaultState(), {
    activeSection: 'recipe', recipeActiveId: 'scrambledEggs', recipePhase: 'done', recipeStartedAt: 1000,
    recipeJudgement: { score: 90, grade: 'A', verdict: 'Well done.', notes: [] },
    aiCritique: 'A CRITIQUE OF THE LAST COOK', aiCritiqueRequestedFor: 1000,
    potState: 'drained', potPastaSec: 560, twoStepHeatAchieved: true, coldDipAfterFood: true
  }, over);

  it('drops the last cook’s critique and competition flags on Cook again', () => {
    const m = mount(results({ competitionActive: true, competitionConstraints: ['speedDemon'], competitionDeadline: 5000 }));
    act(() => { m.button(/Cook again/).click(); });
    const kl = m.kl();
    expect(kl.recipePhase).toBe('cooking');
    expect(kl.aiCritique).toBeNull();
    expect(kl.aiCritiqueRequestedFor).toBeNull();
    expect(kl.competitionActive).toBe(false);
    expect(kl.competitionDeadline).toBeNull();
    act(() => m.root.unmount());
  });

  it('drops the leftover pot and constraint trackers on Next challenge', () => {
    const m = mount(results({ competitionActive: true, recipeJudgement: { score: 90, grade: 'A', verdict: 'ok', notes: [], compResult: { baseScore: 90, bonusTotal: 0, penaltyTotal: 0, finalScore: 90, constraints: [] } } }));
    act(() => { m.button(/Next challenge/).click(); });
    const kl = m.kl();
    expect(kl.competitionActive).toBe(true);
    expect(kl.potState).toBe('cold');
    expect(kl.potPastaSec).toBe(0);
    expect(kl.twoStepHeatAchieved).toBe(false);   // the two-step bonus was handed out for free
    expect(kl.coldDipAfterFood).toBe(false);      // and the cold-dip penalty charged unearned
    expect(kl.aiCritique).toBeNull();
    act(() => m.root.unmount());
  });

  it('accepts an AI critique only for the cook it was asked for', () => {
    mustContain(source, 'setKL(function(prior) { return prior.recipeStartedAt === runId ? { aiCritique: text, aiCritiqueLoading: false } : {}; });');
  });
});

describe('Kitchen Lab pauses a cook nobody is watching', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps cooking while the cockpit draws, and pauses within seconds once it stops', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const store = newStore({ kitchenLab: Object.assign(E.defaultState(), E.freshCookState('scrambledEggs', Date.now()), { activeSection: 'recipe', recipeBurnerLevel: 3 }) });
    const draw = () => { const ctx = makeCtx({ toolData: store.toolData }, store); ReactDOMServer.renderToStaticMarkup(React.createElement(function () { return cfg.render(ctx); })); };
    draw();
    for (let i = 0; i < 8; i++) { vi.advanceTimersByTime(500); draw(); }
    expect(store.toolData.kitchenLab.recipePhase).toBe('cooking');
    const simAtLeave = store.toolData.kitchenLab.recipeSimElapsedSec;
    expect(simAtLeave).toBeGreaterThan(3);
    vi.advanceTimersByTime(5000);   // the student is on another tab or tool: no draws
    const kl = store.toolData.kitchenLab;
    expect(kl.recipePhase).toBe('paused');
    expect(kl.recipeAutoPaused).toBe(true);
    expect(kl.recipeSimElapsedSec - simAtLeave).toBeLessThanOrEqual(2.5);
    vi.advanceTimersByTime(5000);
    expect(store.toolData.kitchenLab.recipeSimElapsedSec).toBe(kl.recipeSimElapsedSec);   // the interval stopped
  });
});

describe('Kitchen Lab °C mode keeps a temperature difference a difference', () => {
  it('writes every small °F difference in the dual form localizeTemps keeps', () => {
    const acorn = require('acorn');
    const bad = [];
    acorn.parse(source, { ecmaVersion: 2020, onToken: (t) => {
      if (t.type.label !== 'string' && t.type.label !== 'template') return;
      const re = /(^|[^\d.\-−])(\d{1,2}(?:\.\d)?)(?:[-–]\d{1,2})?\s*°F(?!\s*\()/g; let m;
      while ((m = re.exec(t.value))) { const n = +m[2]; if (n > 0 && n < 32) bad.push(t.value.slice(0, 90)); }
    } });
    expect(bad).toEqual([]);   // a positive number under freezing is a difference: 5°F converts to -15°C
  });

  it('shows the steak pull, the bench pull and the browning rate as differences in °C', () => {
    expect(E.localizeTemps('Pull 5°F (3°C) before the target')).toBe('Pull 3°C before the target');
    const pull = E.benchVariables(E.RECIPES.steak).find((v) => v.id === 'pull');
    expect(pull.choices.map((c) => E.localizeTemps(c.label))).toEqual(['6°C early', 'On the number', '8°C late']);
    const maillard = strip(renderTool('kitchenLab', { kitchenLab: { klUnits: 'C', activeSection: 'maillard' } }));
    mustContain(maillard, 'doubles every 22°C');
    expect(maillard).not.toMatch(/(^|[^\d])-\d+°C/);   // a minus sign, not a range's hyphen
  });

  it('reports how far past the target in the dual form', () => {
    mustContain(source, "'Peak ' + peakF + '°F, ' + fmtDeltaT(peakF - target) + ' over.");
    expect(E.localizeTemps('Peak 175°F, 30°F (17°C) over.')).toBe('Peak 79°C, 17°C over.');
  });
});

describe('Kitchen Lab progress survives a reload', () => {
  const mod = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
  const block = (name) => {
    const start = mod.indexOf('// ' + name + '_START'), end = mod.indexOf('// ' + name + '_END', start);
    if (start < 0 || end < 0) throw new Error('Missing block: ' + name);
    return mod.slice(start, end);
  };
  const payload = () => Function('window', 'document', 'localStorage', 'JSON',
    block('BEEHIVE_PERSISTENCE_HELPER') + block('STEM_AUTOSAVE') + '\nreturn _stemPersistencePayload;')(window, document, { getItem: () => null }, JSON);
  const progress = {
    recipeHistory: { steak: { attempts: 3, bestScore: 92, bestGrade: 'A', lastScore: 88, lastGrade: 'B', lastIssue: 'Short rest', competitionRuns: 0 } },
    recipeCompletedIds: ['steak'], aGradedRecipeIds: ['steak'], klUnlockedAchievements: ['firstCook'],
    klUnits: 'C', klAltitudeFt: 5280, klIndependent: true, klViewedSafety: true, klDetectiveSolved: 4, klDetectiveCases: 5,
    maillardHunt: { tempF: 400, aminoPct: 60, sugarPct: 40, hypothesis: 'more sugar, more brown', stuckRevealed: false, understood: true, explanation: 'Amino acids and sugars react.', log: [] }
  };

  it('saves progress and preferences, never a live cook, a timer or a dialog', () => {
    const live = Object.assign(E.defaultState(), E.freshCookState('steak', 5), progress, { aiCritique: 'old', suggesterOpen: true, pendingConfirmation: 'recipe', recipeTempHistory: [{ t: 0, pan: 70, food: 40 }] });
    const saved = payload()({ kitchenLab: live }).kitchenLab;
    expect(Object.keys(saved).sort()).toEqual(Object.keys(progress).concat(['competitionBests', 'tournamentBestTotal', 'tournamentLastTotal', 'tournamentsCompleted']).sort());
    expect(saved.recipePhase).toBeUndefined();
    expect(saved.recipeTempHistory).toBeUndefined();
    expect(saved.aiCritique).toBeUndefined();
  });

  it('restores into a working tool: defaults filled in, the history on the recipe cards', () => {
    const restored = JSON.parse(JSON.stringify(payload()({ kitchenLab: Object.assign(E.defaultState(), progress) }).kitchenLab));
    const d = E.klCleanState(restored);
    expect(d.recipePhase).toBe('idle');
    expect(d.recipeHistory.steak.attempts).toBe(3);
    expect(d.klUnits).toBe('C');
    expect(d.maillardHunt.explanation).toBe('Amino acids and sugars react.');
    const html = renderTool('kitchenLab', { kitchenLab: Object.assign({}, restored, { activeSection: 'recipe' }) });
    mustContain(html, 'data-kl-history');
  });

  it('survives a bad save: every saved field, eight bad values, no screen blanks', () => {
    const HOSTILE = ['abc', 9999, -1, 1.5, {}, [], null, 0];
    const fields = Object.keys(progress).concat(['competitionBests', 'tournamentBestTotal', 'klPanMaterial', 'sandboxFood', 'klRealKitchen', 'klBenchRuns', 'klHandwashCompleted']);
    for (const f of fields) for (const v of HOSTILE) {
      const saved = { [f]: v };
      const section = f === 'maillardHunt' ? 'maillardHunt' : f === 'klHandwashCompleted' || f === 'klViewedSafety' ? 'safety' : 'recipe';
      expect(() => renderTool('kitchenLab', { kitchenLab: Object.assign({ activeSection: section }, saved) }), f + '=' + JSON.stringify(v)).not.toThrow();
      const d = E.klCleanState(saved);
      expect(Array.isArray(d.recipeCompletedIds) && Array.isArray(d.aGradedRecipeIds) && Array.isArray(d.klUnlockedAchievements), f).toBe(true);
    }
  });
});

describe('Kitchen Lab shows students no developer notes', () => {
  it('keeps version notes and design notes off the recipe picker and the Browning Lab', () => {
    const picker = strip(renderTool('kitchenLab', { kitchenLab: { activeSection: 'recipe', aGradedRecipeIds: ['scrambledEggs', 'omelet'], recipeCompletedIds: ['scrambledEggs', 'omelet', 'steak', 'rice', 'pancakes'] } }));
    for (const dev of ['v0.5', 'v0.6', 'Success unlocks', 'unhurried run']) expect(picker, dev).not.toContain(dev);
    const open = E.RECIPE_CATALOG.filter((r) => r.unlocked).length;
    expect(picker).toMatch(new RegExp('(^|[^\\d])2 / ' + open + '(?!\\d)'));   // mastered = A grades, not completions ("12 / 12" contains "2 / 12")
    mustNotContain(picker, open + ' unlocked');
    const lab = strip(renderTool('kitchenLab', { kitchenLab: { activeSection: 'maillardHunt' } }));
    for (const dev of ['Design note', 'No score, no reveal', 'by design']) expect(lab, dev).not.toContain(dev);
    mustContain(lab, 'Move the three sliders');
  });
});
