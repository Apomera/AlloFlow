// Stage C: missions (P4-1), grade bands (P4-2), teacher controls (P4-3),
// non-visual access (P5-1), i18n (P5-2) and the two stage B leftovers.
// Spec: C:/tmp/stem_math_depth_review_2026-11-03/skatelab_report.md, phases 4-5.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
const SOURCE = process.env.SKATELAB_SRC || 'stem_lab/stem_tool_skatelab.js';

let toolConfig;
let physics;
let container;
let root;
let canvasText;
let originals;

function seed(overrides = {}) {
  return {
    skatelab: {
      mode: 'halfpipe', viewMode: '2d', vehicle: 'skate', gravity: 9.81, surfaceId: 'standard', windId: 'calm',
      riderMassKg: 62, rampDepthM: 2.4, dropHeightM: 2.4, pumpTimingId: 'bottom', landingCompressionM: 0.45,
      bodyPositionId: 'neutral', airDrag: true, pumps: 3, rotationTarget: 180, spinRate: 210, speedMph: 17,
      angleDeg: 35, gapFt: 15, pushForceN: 200, cameraAzimuth: 38, showVectors: true, showTrail: true, showEnergy: true,
      estimateChallenge: false,
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
    fillText: (text) => { canvasText.push(String(text)); }, measureText: vi.fn(() => ({ width: 40 })),
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
const launchButton = () => container.querySelector('[data-skatelab-launch="true"]');
const launch = () => click(launchButton());
const buttonByText = (text) => [...container.querySelectorAll('button')].find((button) => button.textContent === text);
const key = (element, name, extra = {}) => act(async () => {
  element.dispatchEvent(new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...extra }));
});
const announcer = () => container.querySelector('[data-skatelab-announcer]').textContent;
const missionCalls = (spy) => spy.mock.calls.filter((call) => /^skatelab_mission_/.test(call[0]));

beforeEach(() => {
  resetStemLab();
  toolConfig = loadTool(SOURCE, 'skatelab');
  physics = window.__alloSkatePhysicsPure;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  canvasText = [];
  originals = {
    getContext: HTMLCanvasElement.prototype.getContext,
    rect: HTMLCanvasElement.prototype.getBoundingClientRect,
    matchMedia: window.matchMedia,
    open: window.open,
    print: window.print,
  };
  HTMLCanvasElement.prototype.getContext = vi.fn(() => makeCanvasContext());
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({ width: 800, height: 450, top: 0, left: 0, right: 800, bottom: 450 }));
  // Reduced motion: every run finishes at once, and step-through is shown.
  window.matchMedia = vi.fn(() => ({ matches: true, media: '(prefers-reduced-motion: reduce)', addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  if (container) container.remove();
  HTMLCanvasElement.prototype.getContext = originals.getContext;
  HTMLCanvasElement.prototype.getBoundingClientRect = originals.rect;
  window.matchMedia = originals.matchMedia;
  window.open = originals.open;
  window.print = originals.print;
  delete window._alloGlobalMute;
  delete window.StemLab.audioContext;
  delete window.speechSynthesis;
  delete window.SpeechSynthesisUtterance;
  vi.restoreAllMocks();
});

describe('Stage B leftovers', () => {
  it('(a) no alert on open: calm text first, role=alert only after Run is pressed without a prediction', async () => {
    const state = await mount(seed({ estimateChallenge: true }));
    expect(container.querySelector('[role="alert"]')).toBeNull();
    const calm = container.querySelector('#sk-predict-needed');
    expect(calm).not.toBeNull();
    expect(calm.textContent).toMatch(/Before you run/);
    expect(launchButton().disabled).toBe(false);
    expect(launchButton().getAttribute('aria-disabled')).toBe('true');
    expect(container.querySelector('#sk-estimate').getAttribute('aria-invalid')).toBeNull();

    await launch();
    expect(state.latest.skatelab.stats.runs).toBe(0);
    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert.id).toBe('sk-estimate-error');
    expect(alert.textContent).toContain('Make a prediction first');
    expect(container.querySelector('#sk-estimate').getAttribute('aria-invalid')).toBe('true');

    await click(container.querySelector('#sk-predict-hp_moon-same'));
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(launchButton().getAttribute('aria-disabled')).toBeNull();
    await launch();
    expect(state.latest.skatelab.stats.runs).toBe(1);
  });

  it('(b) an old save with estimateChallenge:false is turned to predict-first once, then the choice is respected', async () => {
    const old = seed({ estimateChallenge: false });
    delete old.skatelab._predictDefaultV;
    const state = await mount(old);
    expect(container.querySelector('[data-skatelab-predict]')).not.toBeNull();
    expect(state.latest.skatelab.estimateChallenge).toBe(true);
    expect(state.latest.skatelab._predictDefaultV).toBe(2);

    await act(async () => {
      [...container.querySelectorAll('.sk-check input')].find((input) => input.parentElement.textContent === 'Predict before each run').click();
    });
    expect(state.latest.skatelab.estimateChallenge).toBe(false);
    const saved = JSON.parse(JSON.stringify(state.latest));
    await remount(saved);
    expect(container.querySelector('[data-skatelab-predict]')).toBeNull();
    expect(launchButton().getAttribute('aria-disabled')).toBeNull();
  });

  it('(b) a fresh learner gets the flag with the defaults', async () => {
    const state = await mount({});
    expect(state.latest.skatelab._predictDefaultV).toBe(2);
    expect(state.latest.skatelab.estimateChallenge).toBe(true);
  });
});

describe('P4-1 missions are checked from the model', () => {
  it('each mission passes and fails on real model runs', () => {
    const check = (id, sim, info) => physics.checkMission(id, sim, info);
    const hp = (patch) => physics.simHalfpipe({ pumps: 3, ...patch });
    expect(physics.missions.map((mission) => mission.id)).toEqual([
      'spin_540', 'tuck_360', 'fewest_pumps', 'small_drop_air', 'moon_hang', 'flat_target', 'rough_stop', 'gap_drag', 'soft_landing', 'crosswind_lane',
    ]);
    expect(check('spin_540', hp({ rotationTarget: 540, spinRate: 620 })).done).toBe(true);
    expect(check('spin_540', hp({ rotationTarget: 540, spinRate: 300 })).done).toBe(false);
    expect(check('tuck_360', hp({ rotationTarget: 360, spinRate: 300, bodyPositionId: 'tuck' })).done).toBe(true);
    expect(check('tuck_360', hp({ rotationTarget: 360, spinRate: 400 })).reason).toBe('too_fast');
    // 2 pumps from 2.4 m give 0.61 m; 1 pump only 0.31 m.
    expect(check('fewest_pumps', hp({ pumps: 2, rotationTarget: 0, spinRate: 0 })).done).toBe(true);
    expect(check('fewest_pumps', hp({ pumps: 3, rotationTarget: 0, spinRate: 0 })).reason).toBe('fewer_possible');
    expect(physics.missionMinPumps(hp({ pumps: 6, rotationTarget: 0, spinRate: 0 }), 0.5)).toBe(2);
    expect(check('small_drop_air', hp({ pumps: 4, rampDepthM: 1.2, dropHeightM: 1.2, rotationTarget: 0, spinRate: 0 })).done).toBe(true);
    expect(check('small_drop_air', hp({ pumps: 6, dropHeightM: 1.2, rotationTarget: 0, spinRate: 0 })).done).toBe(false);
    const flat = (patch) => physics.simFlatGround({ pushForceN: 200, ...patch });
    expect(check('flat_target', flat({ pushForceN: 160 })).done).toBe(true);
    expect(check('flat_target', flat({ pushForceN: 300 })).done).toBe(false);
    expect(check('rough_stop', flat({ pushForceN: 150, surfaceId: 'rough' })).done).toBe(true);
    expect(check('rough_stop', flat({ pushForceN: 100, surfaceId: 'rough' })).done).toBe(false);
    expect(check('rough_stop', flat({ pushForceN: 150 })).done).toBe(false);
    const gap = (patch) => physics.simGapJump({ speedMph: 17, angleDeg: 35, gapFt: 15, ...patch });
    expect(check('gap_drag', gap({ speedMph: 18, gapFt: 20 })).done).toBe(true);
    expect(check('gap_drag', gap({ speedMph: 18, gapFt: 20, airDrag: false })).done).toBe(false);
    expect(check('soft_landing', gap({ speedMph: 19, angleDeg: 30, gapFt: 20, landingCompressionM: 0.5 })).done).toBe(true);
    expect(check('soft_landing', gap({ speedMph: 19, angleDeg: 30, gapFt: 20, landingCompressionM: 0.1 })).done).toBe(false);
    expect(check('crosswind_lane', gap({ speedMph: 16, angleDeg: 40, windId: 'cross_right' })).done).toBe(true);
    expect(check('crosswind_lane', gap({ speedMph: 16, angleDeg: 40 })).done).toBe(false);
    const moon = hp({ gravity: 1.62 });
    expect(check('moon_hang', moon, { guess: moon.airTime * 1.05 }).done).toBe(true);
    expect(check('moon_hang', moon, { guess: moon.airTime * 1.3 }).reason).toBe('guess_off');
    expect(check('moon_hang', moon, {}).reason).toBe('no_guess');
    expect(check('moon_hang', hp({}), { guess: 2 }).reason).toBe('not_moon');
    expect(check('spin_540', flat({})).reason).toBe('mode');
  });

  it('cannot be completed without a genuine run; a real run earns the XP once', async () => {
    const awardXP = vi.fn();
    const state = await mount(seed(), { awardXP });
    const board = container.querySelector('[data-skatelab-missions]');
    expect(board.querySelector('summary').textContent).toBe('Missions (0 of 10 complete)');
    await click(container.querySelector('[aria-label="Set up the attempt: Land a 540"]'));
    let saved = state.latest.skatelab;
    expect(saved.activeMission).toBe('spin_540');
    expect(saved.rotationTarget).toBe(540);
    // The helper opens the scene but leaves the solving setting alone.
    expect(saved.spinRate).toBe(210);
    expect(container.querySelector('[data-skatelab-active-mission="spin_540"]')).not.toBeNull();
    // Changing controls is not a run.
    await act(async () => { setControlValue(container.querySelector('#sk-spin-rate'), 620); });
    expect(state.latest.skatelab.missions || {}).toEqual({});
    expect(missionCalls(awardXP)).toHaveLength(0);

    await act(async () => { setControlValue(container.querySelector('#sk-spin-rate'), 300); });
    await launch();
    saved = state.latest.skatelab;
    expect(saved.missions.spin_540).toMatchObject({ done: false, tries: 1 });
    expect(missionCalls(awardXP)).toHaveLength(0);
    expect(container.querySelector('[data-skatelab-mission="spin_540"] .sk-mission-status').textContent).toMatch(/Runs tried: 1\. Not yet/);

    await act(async () => { setControlValue(container.querySelector('#sk-spin-rate'), 620); });
    await launch();
    saved = state.latest.skatelab;
    expect(saved.missions.spin_540).toMatchObject({ done: true, tries: 2 });
    expect(missionCalls(awardXP)).toEqual([['skatelab_mission_spin_540', 20, 'Skate Lab mission complete: Land a 540']]);
    expect(saved.xpCredits).toContain('skatelab_mission_spin_540');
    expect(announcer()).toContain('Mission “Land a 540”: Mission complete!');
    await launch();
    expect(missionCalls(awardXP)).toHaveLength(1);
    expect(board.querySelector('summary').textContent).toBe('Missions (1 of 10 complete)');
    expect(JSON.stringify(saved.missions).length).toBeLessThan(400);
  });

  it('a replay of a successful run does not count', async () => {
    const awardXP = vi.fn();
    const good = physics.simHalfpipe({ pumps: 3, rotationTarget: 540, spinRate: 620 });
    expect(physics.checkMission('spin_540', good).done).toBe(true);
    const state = await mount(seed({ lastSim: physics.simRecord(good), activeMission: 'spin_540' }), { awardXP });
    await click(buttonByText('Replay'));
    expect(state.latest.skatelab.missions || {}).toEqual({});
    expect(missionCalls(awardXP)).toHaveLength(0);
  });

  it('hints come one at a time, and the Moon guess only counts before that setup is revealed', async () => {
    const awardXP = vi.fn();
    const state = await mount(seed({ gravity: 1.62, activeMission: 'moon_hang' }), { awardXP });
    const card = () => container.querySelector('[data-skatelab-mission="moon_hang"]');
    await click(card().querySelector('[aria-label="Show hint 1 of 2 for Moon hang time"]'));
    expect(card().querySelectorAll('.sk-mission-hints li')).toHaveLength(1);
    await click(card().querySelector('[aria-label="Show hint 2 of 2 for Moon hang time"]'));
    expect(card().querySelectorAll('.sk-mission-hints li')).toHaveLength(2);

    // Run first without a guess: the setup is now revealed.
    await launch();
    expect(state.latest.skatelab.missions.moon_hang.reason).toBe('no_guess');
    const moon = physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210, gravity: 1.62 });
    await act(async () => { setControlValue(container.querySelector('#sk-mission-guess-banner'), moon.airTime.toFixed(2)); });
    expect(container.querySelector('#sk-mission-guess-banner-help').textContent).toContain('already been run');
    await launch();
    expect(state.latest.skatelab.missions.moon_hang.done).toBe(false);

    // A new Moon setup with the guess typed first counts.
    await act(async () => { setControlValue(container.querySelector('#sk-pumps'), 4); });
    const fresh = physics.simHalfpipe({ pumps: 4, rotationTarget: 180, spinRate: 210, gravity: 1.62 });
    await act(async () => { setControlValue(container.querySelector('#sk-mission-guess-banner'), (fresh.airTime * 0.95).toFixed(2)); });
    await launch();
    expect(state.latest.skatelab.missions.moon_hang.done).toBe(true);
    expect(missionCalls(awardXP)).toHaveLength(1);
  });
});

describe('P4-2 grade bands and vocabulary', () => {
  it('maps the host gradeBand values to Simple, Standard and Extended', () => {
    const level = physics.scaffoldLevelFor;
    expect(level('g68', '7th Grade')).toBe('simple');
    expect(level('g35', '5th Grade')).toBe('simple');
    expect(level('g912', '9th Grade')).toBe('standard');
    expect(level('g912', '10th Grade')).toBe('standard');
    expect(level('g912', '11th Grade')).toBe('extended');
    expect(level('g912', 'College')).toBe('extended');
    expect(level(undefined, '5th Grade')).toBe('standard');
    expect(level('g68', '7th Grade', 'extended')).toBe('extended');
  });

  it('Simple (6-8): plain words first and the equations under "Show the maths"', async () => {
    const sim = physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210 });
    await mount(seed({ lastResult: physics.simRecord(sim), lastSim: physics.simRecord(sim) }), { gradeBand: 'g68', gradeLevel: '7th Grade' });
    expect(container.querySelector('.skatelab-shell').getAttribute('data-skatelab-level')).toBe('simple');
    const plain = container.querySelector('[data-skatelab-plain]').textContent;
    expect(plain).toContain('energy stored by height');
    expect(plain).toContain(Math.round(sim.startPotentialJ) + ' J');
    const maths = container.querySelector('[data-skatelab-maths]');
    expect(maths.tagName).toBe('DETAILS');
    expect(maths.querySelector('summary').textContent).toBe('Show the maths');
    expect(maths.querySelector('.sk-equation').textContent).toContain('PE = m·g·h');
    expect(container.querySelector('[data-skatelab-extended]')).toBeNull();
  });

  it('Extended (11-12/AP): vector components and calculus notes from the model at the cursor', async () => {
    const state = await mount(seed({ mode: 'gap', lastResult: physics.simRecord(physics.simGapJump({})) }), { gradeBand: 'g912', gradeLevel: '12th Grade' });
    await act(async () => { setControlValue(container.querySelector('#sk-playhead'), 40); });
    const sim = physics.simGapJump({});
    const sample = physics.sampleGapJump(sim, 0.4);
    const text = container.querySelector('[data-skatelab-extended]').textContent;
    expect(text).toContain('vₓ = ' + sample.vx.toFixed(3) + ' m/s');
    expect(text).toContain('v₀ₓ = v₀·cos θ = ' + (sim.speedMps * Math.cos(35 * Math.PI / 180)).toFixed(3));
    expect(text).toContain('J = ∫(N − m·g) dt');
    expect(container.querySelector('[data-skatelab-maths]')).toBeNull();
    // Manual override wins and is saved.
    await act(async () => { setControlValue(container.querySelector('#sk-level'), 'simple'); });
    expect(state.latest.skatelab.scaffoldLevel).toBe('simple');
    expect(container.querySelector('[data-skatelab-plain]')).not.toBeNull();
  });

  it('vocabulary pop-overs open by keyboard-reachable buttons and close with Escape', async () => {
    await mount(seed(), { gradeBand: 'g68' });
    const term = container.querySelector('#sk-vocab-kinetic');
    expect(term.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('#sk-vocab-def').hidden).toBe(true);
    await click(term);
    expect(term.getAttribute('aria-expanded')).toBe('true');
    const def = container.querySelector('#sk-vocab-def');
    expect(def.hidden).toBe(false);
    expect(def.textContent).toContain('Energy of motion. The faster something moves');
    await key(term, 'Escape');
    expect(term.getAttribute('aria-expanded')).toBe('false');
    expect(physics.vocabulary('extended').find((item) => item.id === 'kinetic').text).toContain('ΔKE = ∫ΣF·ds');
  });
});

describe('P4-3 teacher controls', () => {
  it('teacher mode shows the panel; locks persist in toolData and bind the learner view', async () => {
    const state = await mount(seed(), { isTeacherMode: true });
    expect(container.querySelector('[data-skatelab-teacher]')).not.toBeNull();
    await act(async () => { setControlValue(container.querySelector('#sk-gravity'), 1.62); });
    await click(container.querySelector('#sk-teacher-lock-gravity'));
    expect(state.latest.skatelab.teacher.locks).toEqual({ gravity: 1.62 });
    await act(async () => { setControlValue(container.querySelector('#sk-teacher-assign'), 'mission:soft_landing'); });
    await click(container.querySelector('#sk-teacher-hide'));
    expect(state.latest.skatelab.teacher).toMatchObject({ assign: { kind: 'mission', id: 'soft_landing' }, hideAnswers: true });
    // The teacher can still change a locked control.
    expect(container.querySelector('#sk-gravity').disabled).toBe(false);

    const saved = JSON.parse(JSON.stringify(state.latest));
    saved.skatelab.gravity = 9.81;
    const student = await remount(saved, { isTeacherMode: false });
    expect(container.querySelector('[data-skatelab-teacher]')).toBeNull();
    expect(container.querySelector('#sk-gravity').disabled).toBe(true);
    expect(container.querySelector('#sk-gravity').value).toBe('1.62');
    expect(container.textContent).toContain('Locked by your teacher.');
    await launch();
    expect(student.latest.skatelab.experiments[0].values.gravity).toBe(1.62);
    // Assignment banner sets the mission up.
    const banner = container.querySelector('[data-skatelab-assignment="mission:soft_landing"]');
    expect(banner.textContent).toContain('Soft landing');
    await click(banner.querySelector('button'));
    expect(student.latest.skatelab.activeMission).toBe('soft_landing');
    expect(student.latest.skatelab.mode).toBe('gap');
  });

  it('hide answers: the learner sees the choice and results but no verdict or misconception', async () => {
    const state = await mount(seed({ estimateChallenge: true, teacher: { locks: {}, assign: null, hideAnswers: true } }));
    await click(container.querySelector('#sk-predict-hp_moon-higher'));
    await launch();
    expect(state.latest.skatelab.predictionResult.misconception).toBe('low_gravity_higher');
    const feedback = container.querySelector('[data-skatelab-predict-feedback]');
    expect(feedback.getAttribute('data-skatelab-predict-feedback')).toBe('hidden');
    expect(feedback.textContent).toContain('saved for your teacher');
    expect(feedback.textContent).not.toContain('Lower gravity means higher air');
    expect(announcer()).not.toMatch(/disagrees|matches the model/);
  });

  it('exports the report as CSV and as a printable page in a new window (never window.print on the app)', async () => {
    const written = [];
    const fakeWindow = { document: { open: vi.fn(), write: (html) => written.push(html), close: vi.fn() } };
    window.open = vi.fn(() => fakeWindow);
    window.print = vi.fn();
    const created = [];
    URL.createObjectURL = vi.fn((blob) => { created.push(blob); return 'blob:sk'; });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const cer = { net_force: { claim: 'More net force <b>gives</b> more acceleration.', evidence: '92 N gave 1.39 m/s²', reasoning: 'ΣF = m·a', checks: [true, true] } };
    const state = await mount(seed({
      estimateChallenge: true, cer, misconceptionTally: { low_gravity_higher: 2 }, predictionStats: { made: 3, matched: 1 },
      missions: { spin_540: { done: true, tries: 2, last: 540 } },
    }), { isTeacherMode: true, studentNickname: 'Ava' });
    // predictionStats.made = 3 rotates the question to hp_spin, whose model answer is 'same'.
    await click(container.querySelector('#sk-predict-hp_spin-same'));
    await launch();
    await click(buttonByText('Printable report'));
    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(window.print).not.toHaveBeenCalled();
    const html = written.join('');
    expect(html).toContain('<title>Skate Lab report</title>');
    expect(html).toContain('Learner: Ava');
    expect(html).toContain(state.latest.skatelab.experiments[0].setup.replace(/&/g, '&amp;'));
    expect(html).toContain('Predictions checked: 4. Matched the model: 2.');
    expect(html).toContain('Lower gravity means higher air from the same drop.');
    expect(html).toContain('Land a 540');
    expect(html).toContain('More net force &lt;b&gt;gives&lt;/b&gt; more acceleration.');
    expect(html).toContain('onclick="window.print()"');
    await click(buttonByText('Report as CSV'));
    expect(created).toHaveLength(1);
    expect(created[0].type).toBe('text/csv;charset=utf-8');
    const csv = physics.reportCsv(state.latest.skatelab);
    const blocks = csv.split('\r\n\r\n');
    expect(blocks).toHaveLength(5);
    expect(blocks[0].split('\r\n')[0]).toBe('Runs,mode,setup,measured_ft,estimate_ft,estimate_error_pct,outcome,investigation');
    expect(blocks[3]).toContain('Land a 540,1,2,540° of spin');
    expect(blocks[4]).toContain('Net force and acceleration');
  });

  it('falls back to saving the printable page when pop-ups are blocked', async () => {
    window.open = vi.fn(() => null);
    const created = [];
    URL.createObjectURL = vi.fn((blob) => { created.push(blob); return 'blob:sk'; });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await mount(seed(), { isTeacherMode: true });
    await click(buttonByText('Printable report'));
    expect(created).toHaveLength(1);
    expect(created[0].type).toBe('text/html;charset=utf-8');
    expect(announcer()).toContain('skate-lab-report.html');
  });
});

describe('P5-1 sound, speech, shortcuts and step-through', () => {
  it('sonification plan: pitch follows height, pan follows x, clicks at the model landing times', () => {
    const plan = physics.sonifyPlan;
    const settings = physics.sonifySettings;
    const gap = physics.simGapJump({});
    const p = plan(gap, { speed: 0.5 });
    expect(p.pitchFollows).toBe('height');
    expect(p.duration).toBeCloseTo(gap.motionDuration / 0.5, 9);
    for (let i = 1; i < p.samples.length; i += 1) expect(p.samples[i].t).toBeGreaterThan(p.samples[i - 1].t);
    p.samples.forEach((s) => {
      expect(s.freq).toBeGreaterThanOrEqual(settings.fMin - 1e-9);
      expect(s.freq).toBeLessThanOrEqual(settings.fMax + 1e-9);
      expect(Math.abs(s.pan)).toBeLessThanOrEqual(settings.panMax + 1e-9);
    });
    // Highest pitch at the apex of the flight; pan rises left to right.
    const top = p.samples.reduce((best, s) => (s.freq > best.freq ? s : best));
    expect(Math.abs(top.modelT - (gap.approachTime + gap.peakTime))).toBeLessThan(gap.motionDuration / (p.samples.length - 1) + 1e-9);
    expect(p.samples[0].pan).toBeLessThan(p.samples[p.samples.length - 1].pan);
    const landing = p.cues.find((cue) => cue.kind === 'landing');
    expect(landing.t).toBeCloseTo((gap.approachTime + gap.airTime) / 0.5, 9);
    // Higher sample means higher pitch (log scale is monotonic).
    const byHeight = p.samples.map((s) => ({ y: physics.sampleModel(gap, s.modelT / gap.motionDuration).y, f: s.freq })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < byHeight.length; i += 1) expect(byHeight[i].f).toBeGreaterThanOrEqual(byHeight[i - 1].f - 1e-9);

    const hp = physics.simHalfpipe({ pumps: 3 });
    const hpPlan = plan(hp, { speed: 1 });
    expect(hpPlan.cues.filter((cue) => cue.kind === 'landing').map((cue) => cue.t))
      .toEqual(hp.airs.filter((air) => Number.isFinite(air.landT)).map((air) => air.landT));
    hpPlan.samples.forEach((s) => {
      const x = physics.sampleModel(hp, s.modelT / hp.motionDuration).x;
      if (Math.abs(x) > 0.05) expect(Math.sign(s.pan)).toBe(Math.sign(x));
    });
    const tail = plan(hp, { speed: 2, fromProgress: 0.5 });
    expect(tail.duration).toBeCloseTo(hp.motionDuration * 0.5 / 2, 9);
    expect(tail.cues.every((cue) => cue.modelT >= hp.motionDuration * 0.5 - 1e-9)).toBe(true);
    const flatPlan = plan(physics.simFlatGround({}), {});
    expect(flatPlan.pitchFollows).toBe('speed');
    expect(flatPlan.cues.map((cue) => cue.kind)).toEqual(['stop']);
  });

  it('plays through StemLab.audioContext(), can be stopped, respects mute, and keeps audio out of toolData', async () => {
    const started = [];
    const node = () => ({
      connect: vi.fn(), disconnect: vi.fn(), start: (at) => started.push(at), stop: vi.fn(),
      type: 'sine', frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() },
      pan: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    });
    const ac = { currentTime: 0, state: 'running', destination: {}, createOscillator: vi.fn(node), createGain: vi.fn(node), createStereoPanner: vi.fn(node) };
    window.StemLab.audioContext = vi.fn(() => ac);
    const sim = physics.simGapJump({});
    const state = await mount(seed({ mode: 'gap', lastResult: physics.simRecord(sim) }));
    await click(buttonByText('Hear this run as sound'));
    expect(window.StemLab.audioContext).toHaveBeenCalledTimes(1);
    expect(ac.createOscillator).toHaveBeenCalled();
    expect(started.length).toBeGreaterThan(1);
    expect(announcer()).toContain('higher pitch means higher up');
    expect(buttonByText('Stop the sound').getAttribute('aria-pressed')).toBe('true');
    await click(buttonByText('Stop the sound'));
    expect(buttonByText('Hear this run as sound')).toBeTruthy();
    expect(JSON.stringify(state.latest)).not.toMatch(/AudioContext|createOscillator|currentTime/);

    window._alloGlobalMute = true;
    ac.createOscillator.mockClear();
    await click(buttonByText('Hear this run as sound'));
    expect(ac.createOscillator).not.toHaveBeenCalled();
    expect(announcer()).toContain('Sound is muted');
  });

  it('the sound is hidden while the prediction is locked (it would reveal the path)', async () => {
    await mount(seed({ estimateChallenge: true }));
    expect(buttonByText('Hear this run as sound')).toBeUndefined();
  });

  it('narrates each step with energy values through ctx.callTTS, falls back to speechSynthesis, and honours mute', async () => {
    const callTTS = vi.fn(() => Promise.resolve('blob:voice'));
    const sim = physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210 });
    // A full model object is accepted as a legacy lastResult, so the result counts as revealed.
    const state = await mount(seed({ lastResult: sim, narrate: true }), { callTTS });
    expect(container.querySelector('#sk-narrate').checked).toBe(true);
    await click(buttonByText('Next phase →'));
    expect(callTTS).toHaveBeenCalledTimes(1);
    const spoken = callTTS.mock.calls[0][0];
    expect(spoken).toMatch(/^Step 2 of \d+\. bottom|^Step 2 of \d+\. /);
    expect(spoken).toMatch(/Kinetic energy \d+ joules, potential energy \d+ joules, heat \d+ joules/);
    expect(callTTS.mock.calls[0][3]).toEqual({ force: true });
    expect(announcer()).toContain('Step 2 of');
    await click(buttonByText('Read the result aloud'));
    expect(callTTS).toHaveBeenCalledTimes(2);
    expect(callTTS.mock.calls[1][0]).toContain('Target met');

    window._alloGlobalMute = true;
    await click(buttonByText('Next phase →'));
    expect(callTTS).toHaveBeenCalledTimes(2);
    delete window._alloGlobalMute;

    const speakSpy = vi.fn();
    window.speechSynthesis = { speak: speakSpy, cancel: vi.fn() };
    window.SpeechSynthesisUtterance = function(text) { this.text = text; };
    await remount(JSON.parse(JSON.stringify(state.latest)), { callTTS: null });
    await click(buttonByText('Next phase →'));
    expect(speakSpy).toHaveBeenCalledTimes(1);
    expect(speakSpy.mock.calls[0][0].text).toContain('joules');
  });

  it('keyboard shortcuts: Space runs or pauses, arrows scrub, P goes to the prediction, R replays; typing is never hijacked', async () => {
    const state = await mount(seed());
    const title = container.querySelector('.sk-title');
    await key(title, ' ');
    expect(state.latest.skatelab.stats.runs).toBe(1);
    const before = container.querySelector('#sk-playhead').value;
    await key(title, 'ArrowLeft');
    expect(Number(container.querySelector('#sk-playhead').value)).toBe(Number(before) - 1);
    await key(title, 'ArrowRight', { shiftKey: true });
    expect(Number(container.querySelector('#sk-playhead').value)).toBe(Math.min(100, Number(before) + 9));
    await key(title, 'r');
    expect(state.latest.skatelab.stats.runs).toBe(1);
    expect(state.latest.skatelab.experiments).toHaveLength(1);

    const notes = container.querySelector('#sk-hypothesis');
    await key(notes, ' ');
    await key(notes, 'r');
    await key(notes, 'ArrowLeft');
    expect(state.latest.skatelab.stats.runs).toBe(1);

    await act(async () => {
      [...container.querySelectorAll('.sk-check input')].find((input) => input.parentElement.textContent === 'Predict before each run').click();
    });
    await act(async () => { setControlValue(container.querySelector('#sk-pumps'), 4); });
    await key(title, 'p');
    expect(document.activeElement && document.activeElement.name).toBe('sk-predict-choice');
    // Space without a prediction raises the alert instead of running.
    await key(title, ' ');
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(state.latest.skatelab.stats.runs).toBe(1);

    const help = container.querySelector('.sk-shortcuts');
    expect(help.querySelector('summary').textContent).toBe('Keyboard shortcuts');
    expect([...help.querySelectorAll('kbd')].map((k) => k.textContent)).toEqual(['Space', 'R', '← →', 'P']);
    expect(launchButton().getAttribute('aria-keyshortcuts')).toBe('Space');
  });

  it('step-through (shown under reduced motion) moves phase by phase with a full description', async () => {
    const sim = physics.simGapJump({});
    await mount(seed({ mode: 'gap', lastResult: physics.simRecord(sim) }));
    const panel = container.querySelector('.sk-step-panel');
    expect(panel).not.toBeNull();
    await act(async () => { setControlValue(container.querySelector('#sk-playhead'), 0); });
    expect(buttonByText('← Previous phase').disabled).toBe(true);
    await click(buttonByText('Next phase →'));
    expect(Number(container.querySelector('#sk-playhead').value)).toBe(Math.round(sim.approachTime / sim.motionDuration * 100));
    expect(panel.querySelector('.sk-step-text').textContent).toMatch(/^Step 2 of 5\. approaching the ramp|^Step 2 of 5\. /);
    expect(announcer()).toMatch(/Step 2 of 5\..*Kinetic energy \d+ joules/);
  });
});

describe('P5-2 every visible string goes through the translator', () => {
  it('a full translation replaces the formerly hard-coded labels, outcome words, log headers and canvas text', async () => {
    const t = (k, fallback) => (/^stem\.skatelab\./.test(k) ? '⟦' + k.slice(14) + '⟧' : fallback);
    const sim = physics.simGapJump({});
    const experiments = [{ id: 5, n: 1, mode: 'gap', setup: 'x', measured: 1, unit: 'ft', errorPct: null, runSuccessful: true, values: { range: 1, angle: 35 } },
      { id: 6, n: 2, mode: 'halfpipe', setup: 'y', measured: 1, unit: 'ft', errorPct: null, runSuccessful: false, outcome: 'unsafe-contact', values: {} }];
    await mount(seed({ mode: 'gap', lastResult: physics.simRecord(sim), lastSim: physics.simRecord(physics.simGapJump({ windId: 'tail' })), experiments }), { t, gradeBand: 'g912', gradeLevel: '11th Grade', isTeacherMode: true });
    container.querySelectorAll('details').forEach((details) => { details.open = true; });
    const text = container.textContent;
    for (const english of ['Energy ledger', 'What should you test next?', 'Target met', 'Recent Skate Lab experiments', 'Launch Jump', 'Horizontal range',
      'Gap projectile', 'Halfpipe energy', 'Rider setup', 'Earth · 9.81', 'Quadratic air drag', 'Cause-and-effect check', 'Motion timeline', 'Replay',
      'Landing zone reached', 'unsafe contact', 'Platform contact creates', 'Live motion telemetry', 'Missions (', 'Teacher controls', 'Keyboard shortcuts',
      'Extended maths', 'Advanced physics', 'Reset setup', 'Tailwind', 'Calm']) {
      expect(text.includes(english), english).toBe(false);
    }
    expect(text).toContain('⟦log_col_mode⟧');
    expect(text).toContain('⟦log_outcome_met⟧');
    expect(text).toContain('⟦outcome_unsafe_contact⟧');
    expect(text).toContain('⟦mission_540_title⟧');
    expect(container.querySelector('canvas').getAttribute('aria-label')).toContain('⟦canvas_label_gap⟧');
    expect(canvasText.some((value) => value.includes('⟦canvas_gap_title⟧'))).toBe(true);
    expect(canvasText.some((value) => /SIDE ELEVATION|LANDING ZONE|LIVE ENERGY/.test(value))).toBe(false);
  });

  it('the same English is shown when there is no translation (fallbacks unchanged)', () => {
    const html = renderTool('skatelab', seed({ mode: 'gap' }));
    for (const english of ['Energy ledger', 'What should you test next?', 'Launch Jump', 'Gap projectile', 'Earth · 9.81 m/s²', 'Missions (0 of 10 complete)']) {
      expect(html).toContain(english);
    }
  });
});
