// Stage D (2026-11-04): independent bug hunt. Each test reproduces a defect
// found by driving the tool, and fails on the stage C file.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
const SOURCE = process.env.SKATELAB_SRC || 'stem_lab/stem_tool_skatelab.js';

let toolConfig;
let physics;
let container;
let root;
let originals;

function seed(overrides = {}) {
  return {
    skatelab: {
      mode: 'halfpipe', viewMode: '2d', vehicle: 'skate', gravity: 9.81, surfaceId: 'standard', windId: 'calm',
      riderMassKg: 62, rampDepthM: 2.4, dropHeightM: 2.4, pumpTimingId: 'bottom', landingCompressionM: 0.45,
      bodyPositionId: 'neutral', airDrag: true, pumps: 3, rotationTarget: 180, spinRate: 210, speedMph: 17,
      angleDeg: 35, gapFt: 15, pushForceN: 200, cameraAzimuth: 38, showVectors: true, showTrail: true, showEnergy: true,
      estimateChallenge: true,
      _predictDefaultV: 2,
      estimateValue: '', experiments: [], stats: { runs: 0, successful: 0, withinTen: 0 },
      ...overrides,
    },
  };
}

function makeCanvasContext() {
  const gradient = { addColorStop: vi.fn() };
  const base = {
    setTransform: vi.fn(), createLinearGradient: vi.fn(() => gradient), fillRect: vi.fn(), clearRect: vi.fn(),
    save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), closePath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), translate: vi.fn(), rotate: vi.fn(), setLineDash: vi.fn(),
    fillText: vi.fn(), measureText: vi.fn(() => ({ width: 40 })),
  };
  return new Proxy(base, {
    get(target, property) { return property in target ? target[property] : undefined; },
    set(target, property, value) { target[property] = value; return true; },
  });
}

function setControlValue(control, value) {
  const proto = control.tagName === 'SELECT' ? window.HTMLSelectElement.prototype
    : (control.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(control, String(value));
  control.dispatchEvent(new window.Event('input', { bubbles: true }));
  control.dispatchEvent(new window.Event('change', { bubbles: true }));
}

async function mount(initial, ctxOverrides = {}) {
  const state = { latest: null };
  function Host() {
    const [toolData, setToolData] = React.useState(initial);
    state.latest = toolData;
    return toolConfig.render(makeCtx({ toolData, setToolData, ...ctxOverrides }));
  }
  await act(async () => { root.render(React.createElement(Host)); });
  return state;
}

async function remount(initial, ctxOverrides) {
  await act(async () => { root.unmount(); });
  root = ReactDOMClient.createRoot(container);
  return mount(initial, ctxOverrides);
}

const click = (element) => act(async () => { element.click(); });
const launch = () => click(container.querySelector('[data-skatelab-launch="true"]'));
const announcer = () => container.querySelector('[data-skatelab-announcer]').textContent;
const typeEstimate = (value) => act(async () => { setControlValue(container.querySelector('#sk-estimate'), value); });
const xpIds = (spy, pattern) => spy.mock.calls.map((call) => call[0]).filter((id) => pattern.test(id));

beforeEach(() => {
  resetStemLab();
  toolConfig = loadTool(SOURCE, 'skatelab');
  physics = window.__alloSkatePhysicsPure;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  originals = {
    getContext: HTMLCanvasElement.prototype.getContext,
    rect: HTMLCanvasElement.prototype.getBoundingClientRect,
    matchMedia: window.matchMedia,
  };
  HTMLCanvasElement.prototype.getContext = vi.fn(() => makeCanvasContext());
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({ width: 800, height: 450, top: 0, left: 0, right: 800, bottom: 450 }));
  // Reduced motion: every run finishes at once.
  window.matchMedia = vi.fn(() => ({ matches: true, media: '(prefers-reduced-motion: reduce)', addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  if (container) container.remove();
  HTMLCanvasElement.prototype.getContext = originals.getContext;
  HTMLCanvasElement.prototype.getBoundingClientRect = originals.rect;
  window.matchMedia = originals.matchMedia;
  vi.restoreAllMocks();
});

describe('D1: XP credits are never forgotten', () => {
  it('a one-time award earned long ago stays credited after 80 more ids', async () => {
    const awardXP = vi.fn();
    // A long-time learner: the trick award first, then 79 capped per-setup ids.
    const filler = [];
    for (let i = 0; i < 25; i++) filler.push('skatelab_predict_p' + i);
    for (let i = 0; i < 30; i++) filler.push('skatelab_setup_s' + i);
    for (let i = 0; i < 20; i++) filler.push('skatelab_estimate_e' + i);
    filler.push('skatelab_gap_landing', 'skatelab_half_turn', 'skatelab_mission_spin_540', 'skatelab_inv_pe_height');
    const credits = ['skatelab_trick_landed'].concat(filler);
    expect(credits).toHaveLength(80);
    const state = await mount(seed({ mode: 'flat', estimateChallenge: false, xpCredits: credits }), { awardXP });
    await launch();
    expect(xpIds(awardXP, /^skatelab_flat_stop$/)).toHaveLength(1);
    const saved = state.latest.skatelab.xpCredits;
    expect(saved).toContain('skatelab_trick_landed');
    expect(saved).toContain('skatelab_flat_stop');
    expect(new Set(saved).size).toBe(saved.length);

    // Reload and land a trick: the old one-time award must not pay again.
    const reloaded = JSON.parse(JSON.stringify(state.latest));
    reloaded.skatelab.mode = 'halfpipe';
    // Engagement pass: the untouched default no longer pays the trick award,
    // so land a learner-changed spin rate to keep this check meaningful.
    reloaded.skatelab.spinRate = 220;
    await remount(reloaded, { awardXP });
    awardXP.mockClear();
    await launch();
    expect(physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 220 }).runSuccessful).toBe(true);
    expect(physics.trickSetupChanged(physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 220 }))).toBe(true);
    expect(xpIds(awardXP, /^skatelab_trick_landed$/)).toHaveLength(0);
    // The capped per-setup families stay capped.
    expect(xpIds(awardXP, /^skatelab_setup_/)).toHaveLength(0);
  });
});

describe('D2: an estimate earns credit only while the answer is hidden', () => {
  it('no credit when "Predict before each run" is off and the measurement is on screen', async () => {
    const awardXP = vi.fn();
    const sim = physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210 });
    const state = await mount(seed({ estimateChallenge: false }), { awardXP });
    // The answer is visible before the run.
    const metrics = [...container.querySelectorAll('.sk-metric-value')].map((node) => node.textContent);
    expect(metrics).toContain(sim.hFt.toFixed(1) + ' ft');
    await typeEstimate(sim.hFt.toFixed(1));
    await launch();
    expect(state.latest.skatelab.stats.runs).toBe(1);
    expect(state.latest.skatelab.stats.withinTen).toBe(0);
    expect(xpIds(awardXP, /^skatelab_estimate_/)).toHaveLength(0);
  });

  it('no credit for copying the revealed result into a re-run of the same setup', async () => {
    const awardXP = vi.fn();
    const sim = physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210 });
    const state = await mount(seed(), { awardXP });
    await typeEstimate('0.5');
    await launch();
    expect(state.latest.skatelab.stats.withinTen).toBe(0);
    await typeEstimate(sim.hFt.toFixed(2));
    await launch();
    expect(state.latest.skatelab.stats.runs).toBe(2);
    expect(state.latest.skatelab.stats.withinTen).toBe(0);
    expect(xpIds(awardXP, /^skatelab_estimate_/)).toHaveLength(0);
  });

  it('no credit for a setup whose measurement is already in the experiment log', async () => {
    const awardXP = vi.fn();
    const a = physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210 });
    const state = await mount(seed(), { awardXP });
    await typeEstimate('0.5');
    await launch();
    // Run a different setup, then go back to the first one: its result is hidden
    // again, but run #1 in the log shows the answer.
    await act(async () => { setControlValue(container.querySelector('#sk-pumps'), 4); });
    await typeEstimate('1');
    await launch();
    await act(async () => { setControlValue(container.querySelector('#sk-pumps'), 3); });
    expect(container.querySelector('[data-skatelab-prediction-locked="true"]')).not.toBeNull();
    await typeEstimate(a.hFt.toFixed(2));
    await launch();
    expect(state.latest.skatelab.stats.runs).toBe(3);
    expect(state.latest.skatelab.stats.withinTen).toBe(0);
  });

  it('a genuine blind estimate still counts', async () => {
    const awardXP = vi.fn();
    const sim = physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210 });
    const state = await mount(seed(), { awardXP });
    await typeEstimate((sim.hFt * 1.05).toFixed(2));
    await launch();
    expect(state.latest.skatelab.stats.withinTen).toBe(1);
    expect(xpIds(awardXP, /^skatelab_estimate_/)).toHaveLength(1);
  });
});

describe('D3: a prediction is counted once', () => {
  it('re-running the same setup does not count the same prediction again', async () => {
    const state = await mount(seed());
    await click(container.querySelector('#sk-predict-hp_moon-higher'));
    await launch();
    expect(state.latest.skatelab.predictionStats).toEqual({ made: 1, matched: 0 });
    expect(state.latest.skatelab.misconceptionTally).toEqual({ low_gravity_higher: 1 });
    await launch();
    await launch();
    expect(state.latest.skatelab.stats.runs).toBe(3);
    expect(state.latest.skatelab.predictionStats).toEqual({ made: 1, matched: 0 });
    expect(state.latest.skatelab.misconceptionTally).toEqual({ low_gravity_higher: 1 });
    // The verdict for the original prediction stays on screen.
    expect(container.querySelector('[data-skatelab-predict-feedback="miss"]')).not.toBeNull();
  });
});

describe('D4: the Moon hang-time guess must be made blind', () => {
  it('does not complete the mission when the hang time was on screen', async () => {
    const awardXP = vi.fn();
    const moon = physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210, gravity: 1.62 });
    const state = await mount(seed({ gravity: 1.62, activeMission: 'moon_hang', estimateChallenge: false }), { awardXP });
    const metrics = [...container.querySelectorAll('.sk-metric-value')].map((node) => node.textContent);
    expect(metrics).toContain(moon.airTime.toFixed(2) + ' s');
    await act(async () => { setControlValue(container.querySelector('#sk-mission-guess-banner'), moon.airTime.toFixed(2)); });
    await launch();
    expect(state.latest.skatelab.missions.moon_hang.done).toBe(false);
    expect(xpIds(awardXP, /^skatelab_mission_/)).toHaveLength(0);
  });
});

describe('D5: teacher locks and missions', () => {
  it('a mission the locks rule out says so instead of announcing a set-up that did not happen', async () => {
    const state = await mount(seed({ teacher: { locks: { gravity: 9.81 } } }));
    const card = container.querySelector('[data-skatelab-mission="moon_hang"]');
    const setup = card.querySelector('[aria-label="Set up the attempt: Moon hang time"]');
    expect(setup.disabled).toBe(true);
    expect(card.textContent).toContain('locked');
    await click(setup);
    expect(announcer()).not.toContain('Mission set up');
    // Missions the locks allow are unaffected.
    expect(container.querySelector('[aria-label="Set up the attempt: Land a 540"]').disabled).toBe(false);
    expect(state.latest.skatelab.activeMission == null).toBe(true);
  });

  it('a locked mode rules out the other experiments\' missions and plan steps', async () => {
    await mount(seed({ teacher: { locks: { mode: 'flat' } }, mode: 'flat', activeInvestigation: 'pe_height' }));
    expect(container.querySelector('[aria-label="Set up the attempt: Land a 540"]').disabled).toBe(true);
    expect(container.querySelector('[aria-label="Set up the attempt: Stop on the mark"]').disabled).toBe(false);
    const step = container.querySelector('.sk-inv-plan li button');
    expect(step.disabled).toBe(true);
  });

  it('the teacher is warned when the assignment conflicts with the locks', async () => {
    await mount(seed({ teacher: { locks: { gravity: 9.81 }, assign: { kind: 'mission', id: 'moon_hang' } } }), { isTeacherMode: true });
    const warning = container.querySelector('[data-skatelab-assign-conflict]');
    expect(warning).not.toBeNull();
    expect(warning.textContent).toContain('Gravity');
    // In teacher mode every control stays free.
    expect(container.querySelector('[aria-label="Set up the attempt: Moon hang time"]').disabled).toBe(false);
  });

  it('the conflict model matches searches of the model', () => {
    const c = physics.missionLockConflicts;
    expect(c('moon_hang', {})).toEqual([]);
    expect(c('moon_hang', { gravity: 1.62 })).toEqual([]);
    expect(c('moon_hang', { estimateChallenge: false })).toEqual(['estimateChallenge']);
    expect(c('gap_drag', { airDrag: false })).toEqual(['airDrag']);
    expect(c('soft_landing', { airDrag: false })).toEqual([]);
    expect(c('crosswind_lane', { windId: 'calm' })).toEqual(['windId']);
    expect(c('crosswind_lane', { windId: 'cross_left' })).toEqual([]);
    expect(c('spin_540', { mode: 'gap' })).toEqual(['mode']);
    expect(c('spin_540', { mode: 'bogus' })).toEqual([]);
    // Flat missions are searched with the closed-form model.
    expect(c('rough_stop', { gravity: 1.62 })).toEqual(['gravity']);
    expect(c('rough_stop', { gravity: 3.71 })).toEqual([]);
    expect(c('rough_stop', { riderMassKg: 35 })).toEqual(['riderMassKg']);
    expect(c('flat_target', { surfaceId: 'rough', gravity: 1.62 })).toEqual([]);
    // Halfpipe limits found by search: rough concrete kills the small-drop air.
    expect(c('small_drop_air', { surfaceId: 'rough' })).toEqual(['surfaceId']);
    let best = 0;
    for (const depth of [1.2, 1.5, 2]) {
      for (let pumps = 0; pumps <= 6; pumps++) {
        const s = physics.simHalfpipe({ pumps, rampDepthM: depth, dropHeightM: 1.2, surfaceId: 'rough', rotationTarget: 0, spinRate: 0, _skipNumericalCheck: true });
        best = Math.max(best, s.hAir);
      }
    }
    expect(best).toBeLessThan(0.8);
    // A null lock (a damaged save) is not a lock.
    expect(c('moon_hang', { gravity: null })).toEqual([]);
    expect(physics.planStepLockConflicts(physics.investigations[1].steps[0], { gravity: 1.62 })).toEqual(['gravity']);
    expect(physics.planStepLockConflicts(physics.investigations[1].steps[0], { gravity: 9.81, airDrag: false })).toEqual([]);
  });
});

describe('D6: "hide answers" also hides the verdict tallies', () => {
  it('the prediction record and the learner report show no matched count or named idea', async () => {
    const state = await mount(seed({ teacher: { hideAnswers: true } }));
    await click(container.querySelector('#sk-predict-hp_moon-higher'));
    await launch();
    expect(state.latest.skatelab.misconceptionTally).toEqual({ low_gravity_higher: 1 });
    const record = container.querySelector('.sk-prediction-record').textContent;
    expect(record).toContain('Predictions saved for your teacher: 1.');
    expect(record).not.toContain('Matched the model');
    expect(container.querySelector('.sk-tally')).toBeNull();
    expect(container.querySelector('[data-skatelab-predict-feedback="hidden"]')).not.toBeNull();
    const html = physics.reportHtml(state.latest.skatelab, { hideVerdicts: true });
    expect(html).not.toContain('Matched the model');
    expect(html).not.toContain('Lower gravity means higher air');
    // The teacher's copy keeps both.
    const full = physics.reportHtml(state.latest.skatelab, {});
    expect(full).toContain('Matched the model: 0');
  });
});

describe('D7: damaged saves', () => {
  it('a log holding null or text rows still mounts, and the quests read it safely', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const data = seed({ experiments: [null, 1, 'x', [], { id: 7, n: 1, mode: 'gap', runSuccessful: true, values: { range: 5 } }] });
    const state = await mount(data);
    expect(container.querySelector('[data-skatelab-launch="true"]')).not.toBeNull();
    expect(container.textContent).not.toMatch(/undefined|NaN/);
    // Only the test harness's own act() notices are allowed.
    expect(errors.mock.calls.map((call) => String(call[0]).slice(0, 200)).filter((text) => !/\bact\b/.test(text))).toEqual([]);
    const gapQuest = toolConfig.questHooks.find((hook) => hook.id === 'sk_clear_gap');
    expect(gapQuest.check(data.skatelab)).toBe(true);
    expect(state.latest.skatelab.experiments).toBeDefined();
    errors.mockRestore();
  });
});

describe('D8: the CER self-check needs evidence from the logged runs', () => {
  function plannedRuns(id) {
    const investigation = physics.investigations.find((item) => item.id === id);
    return investigation.steps.map((step, index) => ({
      id: 10 + index, n: index + 1, mode: step.patch.mode, setup: 'x', measured: 1, unit: 'ft', errorPct: null, runSuccessful: true,
      values: physics.runValues(physics.runSimulation(step.patch.mode, step.patch)), inv: id, step: index,
    }));
  }

  it('sentence frames with every blank filled by a made-up number no longer pass', () => {
    for (const investigation of physics.investigations) {
      const text = physics.investigationText(investigation.id);
      const fill = (frame) => frame.replace(/___/g, '7');
      const runs = physics.investigationRunNumbers(investigation, plannedRuns(investigation.id));
      const result = physics.checkCer({ claim: fill(text.claim), evidence: fill(text.evidence), reasoning: fill(text.reasoning) }, text.keywords, runs);
      expect(result.find((item) => item.id === 'numbers').ok, investigation.id).toBe(false);
    }
  });

  it('real numbers from two runs pass, and the XP is not paid for the frame trick', async () => {
    const awardXP = vi.fn();
    const experiments = plannedRuns('pe_height');
    const v = experiments.map((entry) => entry.values);
    const text = physics.investigationText('pe_height');
    const fill = (frame) => frame.replace(/___/g, '7');
    const fake = { claim: fill(text.claim), evidence: fill(text.evidence), reasoning: fill(text.reasoning), checks: [true, true, true, true, true] };
    await mount(seed({ activeInvestigation: 'pe_height', experiments, cer: { pe_height: fake } }), { awardXP });
    await click([...container.querySelectorAll('button')].find((button) => button.textContent === 'Check my writing'));
    expect(container.querySelector('.sk-cer-feedback').textContent).toContain('at least two numbers from your runs');
    expect(xpIds(awardXP, /^skatelab_inv_/)).toHaveLength(0);

    const real = {
      claim: 'When the drop height doubles, the starting PE doubles too.',
      evidence: 'From ' + v[0].dropHeight + ' m the PE was ' + Math.round(v[0].startPE) + ' J; from ' + v[3].dropHeight + ' m it was ' + Math.round(v[3].startPE) + ' J.',
      reasoning: 'PE = m·g·h, so PE grows in step with the height.',
      checks: [true, true, true, true, true],
    };
    await remount(seed({ activeInvestigation: 'pe_height', experiments, cer: { pe_height: real } }), { awardXP });
    await click([...container.querySelectorAll('button')].find((button) => button.textContent === 'Check my writing'));
    expect(container.querySelector('.sk-cer-feedback.is-complete')).not.toBeNull();
    expect(xpIds(awardXP, /^skatelab_inv_pe_height$/)).toHaveLength(1);
  });
});
describe('D9: best-fit line text', () => {
  it('writes a negative intercept as "− 0.050", and a positive one with "+"', async () => {
    const rows = (points) => points.map(([x, y], index) => ({
      id: 100 + index, n: index + 1, mode: 'halfpipe', setup: 'run ' + (index + 1), measured: y, unit: 'ft', errorPct: null,
      runSuccessful: true, values: { dropHeight: x, startPE: y },
    })).reverse();
    const view = { x: 'dropHeight', y: 'startPE', group: 'none', sort: 'id', dir: 'desc' };
    await mount(seed({ experiments: rows([[1, 2], [2, 4.1], [3, 5.9], [4, 8.2]]), logView: view }));
    let fits = container.querySelector('.sk-scatter-fits').textContent;
    expect(fits).toContain('y = 2.0400·x − 0.050');
    expect(fits).not.toMatch(/\+ [−-]/);
    await remount(seed({ experiments: rows([[1, 3], [2, 5], [3, 7]]), logView: view }));
    fits = container.querySelector('.sk-scatter-fits').textContent;
    expect(fits).toContain('y = 2.0000·x + 1.000');
  });
});
describe('D10: no untranslated English in the landing telemetry and standard labels', () => {
  it('every visible word comes through ctx.t', async () => {
    const t = (key) => '⟦' + key + '⟧';
    await mount(seed({ mode: 'gap', estimateChallenge: false }), { t });
    await launch();
    const text = container.textContent;
    expect(text).toContain('⟦stem.skatelab.telemetry_com_drop⟧');
    expect(text).toContain('⟦stem.skatelab.inv_ngss_range_angle⟧');
    expect(text).not.toMatch(/COM|projectile/);
  });
});