// Sports-labs pass (2026-11-23): what a student sees and does in Skate Lab.
// Visuals: the ramp surface is stroked (a stray cross-brace was), the gap rider is on the canvas for the whole
// run-up, the energy HUD clears the fullscreen button, the rider's pose follows the model and the drag handle sits
// beside the rider. Pedagogy: the answer choices are not always in the same place, and every verdict gives a
// reason. Engagement: one "More controls" disclosure, the guess and Run under the ride on a phone, and a result
// card with one-change next steps. Fail-first: SKATELAB_SRC=C:/tmp/sports_labs_1123/skatelab/start.js.
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
let strokes;
let fills;
let texts;
let translates;
let canvasRect;

const BASE = {
  mode: 'halfpipe', viewMode: '2d', vehicle: 'skate', gravity: 9.81, surfaceId: 'standard', windId: 'calm',
  riderMassKg: 62, rampDepthM: 2.4, dropHeightM: 2.4, pumpTimingId: 'bottom', landingCompressionM: 0.45,
  bodyPositionId: 'neutral', airDrag: true, pumps: 3, rotationTarget: 180, spinRate: 210, speedMph: 17,
  angleDeg: 35, gapFt: 15, pushForceN: 200, cameraAzimuth: 38, showVectors: true, showTrail: true, showEnergy: true,
};
const HP_INPUTS = { pumps: 3, rotationTarget: 180, spinRate: 210, vehicle: 'skate', gravity: 9.81, surfaceId: 'standard', riderMassKg: 62, rampDepthM: 2.4, dropHeightM: 2.4, pumpTimingId: 'bottom', bodyPositionId: 'neutral' };
const GAP_INPUTS = { speedMph: 17, angleDeg: 35, gapFt: 15, riderMassKg: 62, vehicle: 'skate', gravity: 9.81, windId: 'calm', airDrag: true, landingCompressionM: 0.45 };
const FLAT_INPUTS = { pushForceN: 200, surfaceId: 'standard', riderMassKg: 62, vehicle: 'skate', gravity: 9.81 };

function seed(overrides = {}) {
  return {
    skatelab: {
      ...BASE, estimateChallenge: true, _predictDefaultV: 2, estimateValue: '', experiments: [],
      stats: { runs: 0, successful: 0, withinTen: 0 }, ...overrides,
    },
  };
}

// A canvas context that remembers each stroked path with the ink it was stroked in.
function makeCanvasContext() {
  const gradient = { addColorStop() {} };
  let path = [];
  const base = {
    setTransform() {}, createLinearGradient: () => gradient, clearRect() {}, save() {}, restore() {}, closePath() {},
    fillRect(x, y, w, h) { fills.push({ x, y, w, h }); },
    beginPath() { path = []; },
    moveTo(x, y) { path.push([x, y]); },
    lineTo(x, y) { path.push([x, y]); },
    stroke() { strokes.push({ style: String(base.strokeStyle), width: base.lineWidth, points: path.slice() }); },
    fill() {}, arc() {}, rotate() {}, setLineDash() {},
    translate(x, y) { translates.push([x, y]); },
    fillText(text, x, y) { texts.push({ text: String(text), x, y }); },
    measureText: () => ({ width: 40 }),
  };
  return new Proxy(base, {
    get(target, property) { return property in target ? target[property] : undefined; },
    set(target, property, value) { target[property] = value; return true; },
  });
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

const click = (element) => act(async () => { element.click(); });
const launchButton = () => container.querySelector('[data-skatelab-launch="true"]');
const launch = () => click(launchButton());
// Round 2 (2026-11-23): a new learner's first question is about the run they are about to watch
// (hp_run). A test about another question moves to it the way a student does: "Ask me a different question".
const toPrompt = async (promptId) => {
  for (let i = 0; i < 8 && !container.querySelector('[id^="sk-predict-' + promptId + '-"]'); i++) {
    const ask = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Ask me a different question');
    await act(async () => { ask.click(); });
  }
};
const resetInk = () => { strokes = []; fills = []; texts = []; translates = []; };

beforeEach(() => {
  resetStemLab();
  toolConfig = loadTool(SOURCE, 'skatelab');
  physics = window.__alloSkatePhysicsPure;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  resetInk();
  canvasRect = { width: 800, height: 450, top: 0, left: 0, right: 800, bottom: 450 };
  originals = {
    getContext: HTMLCanvasElement.prototype.getContext,
    rect: HTMLCanvasElement.prototype.getBoundingClientRect,
    scroll: window.HTMLElement.prototype.scrollIntoView,
    matchMedia: window.matchMedia,
  };
  HTMLCanvasElement.prototype.getContext = vi.fn(() => makeCanvasContext());
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({ ...canvasRect }));
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  // Reduced motion: every run finishes at once.
  window.matchMedia = vi.fn(() => ({ matches: true, media: '(prefers-reduced-motion: reduce)', addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  if (container) container.remove();
  HTMLCanvasElement.prototype.getContext = originals.getContext;
  HTMLCanvasElement.prototype.getBoundingClientRect = originals.rect;
  window.HTMLElement.prototype.scrollIntoView = originals.scroll;
  window.matchMedia = originals.matchMedia;
  vi.restoreAllMocks();
});

describe('visuals: what the canvas draws', () => {
  it('the halfpipe riding surface is stroked along the whole ramp (not one cross-brace)', async () => {
    await mount(seed({ estimateChallenge: false }));
    const heavy = strokes.filter((s) => s.width === 3 && s.points.length >= 60);
    expect(heavy.length, 'a 3 px stroke that follows the ramp').toBeGreaterThan(0);
    const ramp = heavy[heavy.length - 1].points;
    const xs = ramp.map((p) => p[0]);
    const ys = ramp.map((p) => p[1]);
    // From lip to lip, symmetric about the middle of the canvas, lowest in the middle.
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(400, 0);
    expect(ys[0]).toBeCloseTo(ys[ys.length - 1], 3);
    expect(Math.max(...ys)).toBeCloseTo(ys[Math.floor(ys.length / 2)], 3);
    expect(Math.max(...ys) - ys[0]).toBeGreaterThan(80);
  });

  it('the gap rider is on the canvas from the first frame of the run-up, at every speed and width', async () => {
    expect(typeof physics.gapSceneFrame).toBe('function');
    for (const width of [330, 520, 815]) {
      for (const speedMph of [8, 17, 32]) {
        const sim = physics.runSimulation('gap', { ...GAP_INPUTS, speedMph });
        const start = physics.sampleGapJump(sim, 0);
        expect(start.x).toBeLessThan(-1);
        const frame = physics.gapSceneFrame(sim, width, Math.max(sim.rangeM, sim.gapM + sim.landingZoneM + 0.7, 5));
        const riderX = frame.left + start.x * frame.sx;
        expect(riderX, width + ' px, ' + speedMph + ' mph').toBeGreaterThanOrEqual(20);
        expect(frame.left).toBeLessThan(frame.right);
        expect(frame.approachM).toBeCloseTo(sim.speedMps * sim.approachTime, 6);
      }
    }
    // And on the real canvas: the rider is drawn (translated) inside the frame at the start.
    resetInk();
    await mount(seed({ mode: 'gap', estimateChallenge: false }));
    const rider = translates[translates.length - 1];
    expect(rider[0]).toBeGreaterThanOrEqual(20);
    expect(rider[0]).toBeLessThan(800);
  });

  it('3D gap: the rider is inside the canvas at the start of the run-up too', async () => {
    await mount(seed({ mode: 'gap', viewMode: '3d', estimateChallenge: false }));
    // The 3D rider's head is the last filled arc; its board is the last 4 px amber stroke.
    const board = strokes.filter((s) => s.style === '#f8c55c' && s.points.length === 2).pop();
    expect(board).toBeTruthy();
    for (const [x, y] of board.points) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(800);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(450);
    }
  });

  it('the energy HUD stops short of the fullscreen button on a wide canvas', async () => {
    await mount(seed({ estimateChallenge: false }));
    const title = texts.filter((t) => t.text === 'LIVE ENERGY').pop();
    expect(title).toBeTruthy();
    // The HUD panel is the 48 px tall box that starts 9 px left of its title.
    const panel = fills.filter((f) => f.h === 48 && Math.abs(f.x - (title.x - 9)) < 0.001).pop();
    expect(panel).toBeTruthy();
    // The button is 34 px wide, 14 px in from the top right corner.
    expect(panel.x + panel.w).toBeLessThanOrEqual(800 - 48);
  });

  it('the drag handle sits beside the start point, not on the rider', async () => {
    await mount(seed());
    const marker = container.querySelector('canvas.sk-canvas').__skStartMarker;
    const rider = translates[translates.length - 1];
    expect(rider[0] - marker.x).toBeGreaterThanOrEqual(20);
    expect(marker.x).toBeGreaterThanOrEqual(22);
    expect(marker.y).toBeCloseTo(rider[1], 6);
  });

  it('the pose follows the model: knees bend under load, tuck is small and open is wide in the air only', () => {
    const pose = physics.riderPose;
    expect(typeof pose).toBe('function');
    expect(pose('neutral', 0, false).legReach).toBeGreaterThan(pose('neutral', 0.5, false).legReach);
    expect(pose('neutral', 0.5, false).legReach).toBeGreaterThan(pose('neutral', 1, false).legReach);
    const tuck = pose('tuck', 0, true);
    const neutral = pose('neutral', 0, true);
    const open = pose('open', 0, true);
    expect(tuck.reach).toBeLessThan(neutral.reach);
    expect(neutral.reach).toBeLessThan(open.reach);
    expect(tuck.height).toBeLessThan(neutral.height);
    expect(neutral.height).toBeLessThan(open.height);
    // On the ramp the body-position choice does not change the stance.
    expect(pose('tuck', 0.3, false)).toEqual(pose('open', 0.3, false));
    expect(pose('neutral', 0, false, true).pushing).toBe(true);
    expect(pose('neutral', 0, true, true).pushing).toBe(false);
    // Size follows the scene scale and stays readable.
    expect(physics.riderScaleFor(60, false)).toBeGreaterThan(physics.riderScaleFor(30, false));
    expect(physics.riderScaleFor(5, true) * 56).toBeGreaterThanOrEqual(38);
    expect(physics.riderScaleFor(500, false) * 56).toBeLessThanOrEqual(84);
  });
});

describe('pedagogy: the predict-first choices and the reason', () => {
  const defaults = () => Object.keys(physics.predictionPrompts).map((id) => {
    const mode = id.startsWith('hp_') ? 'halfpipe' : (id.startsWith('gap_') ? 'gap' : 'flat');
    const sim = physics.runSimulation(mode, mode === 'halfpipe' ? HP_INPUTS : (mode === 'gap' ? GAP_INPUTS : FLAT_INPUTS));
    return { id, sim, correct: physics.evaluatePrediction(id, sim).correct, signature: physics.simulationSignature(sim) };
  });

  it('the answer the model gives is not always in the same position', () => {
    expect(typeof physics.predictionOptionOrder).toBe('function');
    const rows = defaults();
    const positions = rows.map((row) => physics.predictionOptionOrder(row.id, row.signature).indexOf(row.correct));
    expect(positions.every((p) => p >= 0)).toBe(true);
    // The four halfpipe questions (the mode the tool opens in) do not share one position.
    expect(new Set(positions.slice(0, 4)).size).toBeGreaterThanOrEqual(3);
    // No position holds the answer for more than half of the default questions.
    for (const p of [0, 1, 2]) expect(positions.filter((x) => x === p).length).toBeLessThanOrEqual(5);
    // Across many setups every position is used for one question.
    const seen = new Set();
    for (let drop = 0.5; drop <= 2.41; drop += 0.1) {
      const sim = physics.runSimulation('halfpipe', { ...HP_INPUTS, dropHeightM: Math.round(drop * 10) / 10 });
      seen.add(physics.predictionOptionOrder('hp_moon', physics.simulationSignature(sim)).indexOf(physics.evaluatePrediction('hp_moon', sim).correct));
    }
    expect([...seen].sort()).toEqual([0, 1, 2]);
  });

  it('the order is a stable shuffle of the same choices, and the screen uses it', async () => {
    for (const row of defaults()) {
      const order = physics.predictionOptionOrder(row.id, row.signature);
      expect(order.slice().sort()).toEqual(physics.predictionPrompts[row.id].options.slice().sort());
      expect(physics.predictionOptionOrder(row.id, row.signature)).toEqual(order);
    }
    await mount(seed());
    const sim = physics.runSimulation('halfpipe', HP_INPUTS);
    const shown = [...container.querySelectorAll('[data-skatelab-predict] input[type="radio"]')].map((input) => input.value);
    expect(shown).toEqual(physics.predictionOptionOrder('hp_run', physics.simulationSignature(sim)));
  });

  it('every question has a plain reason for the answer the model gives', () => {
    for (const row of defaults()) {
      const why = physics.predictionWhyText(row.id, row.correct);
      expect(why.length, row.id).toBeGreaterThan(40);
      expect(why.split(/[.!?]\s/).length, row.id + ' is short').toBeLessThanOrEqual(4);
    }
    // Other answers the model can give for other setups are covered too.
    expect(physics.predictionWhyText('gap_safe', 'safe')).not.toBe('');
    expect(physics.predictionWhyText('gap_safe', 'miss')).not.toBe('');
    expect(physics.predictionWhyText('gap_mass', 'same')).not.toBe('');
    expect(physics.predictionWhyText('flat_stop', 'still')).not.toBe('');
  });

  it('a correct guess and an unexplained wrong answer both get the reason; a named misconception keeps its own note', async () => {
    await mount(seed());
    await toPrompt('hp_moon');
    await click(container.querySelector('#sk-predict-hp_moon-same'));
    await launch();
    let card = container.querySelector('[data-skatelab-predict-feedback="match"]');
    expect(card.querySelector('[data-skatelab-predict-why]').textContent).toContain('Weaker gravity');

    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(container);
    await mount(seed());
    await toPrompt('hp_moon');
    await click(container.querySelector('#sk-predict-hp_moon-lower'));
    await launch();
    card = container.querySelector('[data-skatelab-predict-feedback="miss"]');
    expect(card.querySelector('[data-skatelab-predict-why]').textContent).toContain('Weaker gravity');

    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(container);
    await mount(seed());
    await toPrompt('hp_moon');
    await click(container.querySelector('#sk-predict-hp_moon-higher'));
    await launch();
    card = container.querySelector('[data-skatelab-predict-feedback="miss"]');
    expect(card.querySelector('[data-skatelab-predict-why]')).toBeNull();
    expect(card.textContent).toContain('Lower gravity means higher air from the same drop.');
  });
});

describe('engagement: fewer controls in view, nothing removed', () => {
  it('halfpipe: two key sliders stay in view and ONE disclosure holds every other control', async () => {
    await mount(seed());
    const more = container.querySelector('details[data-skatelab-more-controls]');
    expect(more).not.toBeNull();
    expect(more.open).toBe(false);
    expect(container.querySelectorAll('.sk-controls details').length).toBe(1);
    for (const id of ['sk-drop-height', 'sk-pumps']) {
      expect(container.querySelector('#' + id), id).not.toBeNull();
      expect(more.contains(container.querySelector('#' + id)), id + ' stays in view').toBe(false);
    }
    for (const id of ['sk-gravity', 'sk-rotation-target', 'sk-spin-rate', 'sk-rider-mass', 'sk-ramp-depth', 'sk-vehicle-bmx',
      'sk-pump-timing-wall', 'sk-surface-wax', 'sk-body-position-tuck']) {
      expect(more.querySelector('#' + id), id + ' is kept, inside More controls').not.toBeNull();
    }
    expect(more.textContent).toContain('Predict before each run');
    expect(more.textContent).toContain('Advanced physics');
    // Run and the guess still come before every control.
    const before = (a, b) => !!(a.compareDocumentPosition(b) & window.Node.DOCUMENT_POSITION_FOLLOWING);
    expect(before(launchButton(), container.querySelector('#sk-drop-height'))).toBe(true);
    expect(before(container.querySelector('#sk-pumps'), more)).toBe(true);
  });

  it('gap and flat keep their main variables in view', async () => {
    await mount(seed({ mode: 'gap' }));
    let more = container.querySelector('details[data-skatelab-more-controls]');
    for (const id of ['sk-speed', 'sk-angle', 'sk-gap']) expect(more.contains(container.querySelector('#' + id)), id).toBe(false);
    for (const id of ['sk-air-drag', 'sk-wind-tail', 'sk-landing-compression', 'sk-gravity']) expect(more.querySelector('#' + id), id).not.toBeNull();
    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(container);
    await mount(seed({ mode: 'flat' }));
    more = container.querySelector('details[data-skatelab-more-controls]');
    for (const id of ['sk-push-force', 'sk-surface-rough']) {
      expect(container.querySelector('#' + id), id).not.toBeNull();
      expect(more.contains(container.querySelector('#' + id)), id).toBe(false);
    }
    expect(more.querySelector('#sk-rider-mass')).not.toBeNull();
  });

  it('the disclosure opens by itself for a mission (which needs those controls) and for the teacher', async () => {
    await mount(seed({ activeMission: 'spin_540', rotationTarget: 540 }));
    expect(container.querySelector('details[data-skatelab-more-controls]').open).toBe(true);
    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(container);
    await mount(seed(), { isTeacherMode: true });
    expect(container.querySelector('details[data-skatelab-more-controls]').open).toBe(true);
  });

  it('one column (a phone): the guess and Run sit in the stage under the ride, once', async () => {
    const real = window.getComputedStyle;
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el, ps) => {
      if (el && el.classList && el.classList.contains('sk-workbench')) return { gridTemplateColumns: '320px' };
      return real.call(window, el, ps);
    });
    await mount(seed());
    expect(container.querySelectorAll('[data-skatelab-quickstart]').length).toBe(1);
    expect(container.querySelectorAll('[data-skatelab-launch]').length).toBe(1);
    const quick = container.querySelector('[data-skatelab-quickstart]');
    expect(quick.closest('.sk-stage')).not.toBeNull();
    expect(quick.closest('.sk-controls')).toBeNull();
    expect(quick.querySelector('[data-skatelab-predict]')).not.toBeNull();
    const before = (a, b) => !!(a.compareDocumentPosition(b) & window.Node.DOCUMENT_POSITION_FOLLOWING);
    expect(before(container.querySelector('canvas.sk-canvas'), quick)).toBe(true);
    expect(before(quick, container.querySelector('.sk-timeline'))).toBe(true);
  });
});

describe('engagement and pedagogy: the result card', () => {
  it('no card before the run; after it, the outcome, the model numbers and a reason', async () => {
    const awardXP = vi.fn();
    const state = await mount(seed(), { awardXP });
    expect(container.querySelector('[data-skatelab-result-card]')).toBeNull();
    await toPrompt('hp_moon');
    await click(container.querySelector('#sk-predict-hp_moon-same'));
    await launch();
    const sim = physics.runSimulation('halfpipe', HP_INPUTS);
    const card = container.querySelector('[data-skatelab-result-card="good"]');
    expect(card).not.toBeNull();
    expect(card.querySelector('h3').textContent).toBe('Landed it!');
    const text = card.textContent;
    expect(text).toContain(sim.hFt.toFixed(1) + ' ft of air');
    expect(text).toContain(Math.round(sim.completed) + '° of spin');
    expect(text).toContain(Math.round(sim.startPotentialJ) + ' J from the drop height');
    expect(text).toContain(Math.round(sim.riderWorkJ) + ' J from pumping');
    expect(text).toContain(Math.round(sim.thermalJ) + ' J of it into heat');
    // It sits in the stage, after the canvas.
    expect(card.closest('.sk-stage')).not.toBeNull();

    // One-change next steps: at most three, each changing exactly one setting.
    const chips = [...card.querySelectorAll('[data-skatelab-idea]')];
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.length).toBeLessThanOrEqual(3);
    const xpBefore = awardXP.mock.calls.length;
    const runsBefore = state.latest.skatelab.stats.runs;
    await click(card.querySelector('[data-skatelab-idea="moon"]'));
    expect(state.latest.skatelab.gravity).toBe(1.62);
    expect(state.latest.skatelab.pumps).toBe(3);
    // A new setup: the card is gone, the guess comes first again, and nothing was paid or logged for the click.
    expect(container.querySelector('[data-skatelab-result-card]')).toBeNull();
    expect(container.querySelector('[data-skatelab-predict]')).not.toBeNull();
    expect(awardXP.mock.calls.length).toBe(xpBefore);
    expect(state.latest.skatelab.stats.runs).toBe(runsBefore);
  });

  it('the card numbers come from the model for a bail, a missed target, no air, a short jump and a flat stop', () => {
    const bail = physics.runSimulation('halfpipe', { ...HP_INPUTS, spinRate: 300 });
    expect(bail.outcome).toBe('unsafe-contact');
    let card = physics.runResultCard(bail);
    expect(card.tone).toBe('miss');
    expect(card.title).toContain('Bail');
    expect(card.why).toContain(Math.round(bail.airSpinRate) + '°/s × ' + bail.airTime.toFixed(2) + ' s = ' + Math.round(bail.airSpinRate * bail.airTime) + '°');
    expect(Math.round(bail.airSpinRate * bail.airTime)).toBe(Math.round(bail.completed));

    const missed = physics.runSimulation('halfpipe', { ...HP_INPUTS, rotationTarget: 360 });
    expect(missed.outcome).toBe('trick-missed');
    card = physics.runResultCard(missed);
    expect(card.tone).toBe('miss');
    expect(card.detail).toContain('the target was 360°');

    const noAir = physics.runSimulation('halfpipe', { ...HP_INPUTS, pumps: 0 });
    card = physics.runResultCard(noAir);
    expect(card.title).toContain('No air');
    expect(card.why).toContain(Math.round(noAir.thermalJ) + ' J into heat');

    const short = physics.runSimulation('gap', { ...GAP_INPUTS, speedMph: 12 });
    expect(short.outcome).toBe('fell-short');
    card = physics.runResultCard(short);
    expect(card.tone).toBe('miss');
    expect(card.detail).toContain(short.rangeFt.toFixed(1) + ' ft jump');

    const flat = physics.runSimulation('flat', FLAT_INPUTS);
    card = physics.runResultCard(flat);
    expect(card.title).toContain(flat.stopDistanceM.toFixed(1) + ' m');
    expect(card.why).toContain(Math.round(flat.topKineticJ) + ' J of motion energy');
  });

  it('every next step changes ONE setting, and differs from the run it follows', () => {
    const runs = [
      physics.runSimulation('halfpipe', HP_INPUTS),
      physics.runSimulation('halfpipe', { ...HP_INPUTS, pumps: 0, dropHeightM: 1 }),
      physics.runSimulation('halfpipe', { ...HP_INPUTS, spinRate: 300 }),
      physics.runSimulation('halfpipe', { ...HP_INPUTS, rotationTarget: 360 }),
      physics.runSimulation('gap', GAP_INPUTS),
      physics.runSimulation('gap', { ...GAP_INPUTS, speedMph: 12 }),
      physics.runSimulation('gap', { ...GAP_INPUTS, speedMph: 26 }),
      physics.runSimulation('flat', FLAT_INPUTS),
    ];
    for (const sim of runs) {
      const ideas = physics.nextStepIdeas(sim);
      expect(ideas.length, sim.mode + ' ' + sim.outcome).toBeGreaterThan(0);
      for (const idea of ideas) {
        const keys = Object.keys(idea.patch);
        expect(keys.length, idea.id).toBe(1);
        expect(idea.label.length).toBeGreaterThan(3);
        const before = sim.inputs && sim.inputs[keys[0]];
        if (before !== undefined) expect(idea.patch[keys[0]], idea.id + ' changes the value').not.toEqual(before);
      }
      expect(new Set(ideas.map((idea) => idea.id)).size).toBe(ideas.length);
    }
    // A missed 360 target after 182 degrees of spin suggests the half-turn the model actually made.
    const missed = physics.nextStepIdeas(runs[3]).find((idea) => idea.id === 'target_match');
    expect(missed.patch).toEqual({ rotationTarget: 180 });
  });

  it('a teacher lock removes the next steps it rules out', async () => {
    await mount(seed({ teacher: { locks: { gravity: 9.81 } } }));
    await toPrompt('hp_moon');
    await click(container.querySelector('#sk-predict-hp_moon-same'));
    await launch();
    const card = container.querySelector('[data-skatelab-result-card]');
    expect(card).not.toBeNull();
    expect(card.querySelector('[data-skatelab-idea="moon"]')).toBeNull();
    expect(card.querySelectorAll('[data-skatelab-idea]').length).toBeGreaterThan(0);
  });

  it('missions form a path: every mission once, this mode first, done ones skipped; the card starts the next one', async () => {
    const ids = physics.missions.map((mission) => mission.id);
    expect(physics.missionPath().sort()).toEqual(ids.slice().sort());
    expect(physics.nextMissionId('halfpipe', {})).toBe('fewest_pumps');
    expect(physics.nextMissionId('halfpipe', { fewest_pumps: { done: true } })).toBe('small_drop_air');
    expect(physics.nextMissionId('gap', {})).toBe('gap_drag');
    expect(physics.nextMissionId('flat', { flat_target: { done: true }, rough_stop: { done: true } })).toBe('fewest_pumps');
    expect(physics.nextMissionId('flat', Object.fromEntries(ids.map((id) => [id, { done: true }])))).toBeNull();
    expect(physics.nextMissionId('halfpipe', {}, (id) => id === 'fewest_pumps')).toBe('small_drop_air');

    const state = await mount(seed());
    await toPrompt('hp_moon');
    await click(container.querySelector('#sk-predict-hp_moon-same'));
    await launch();
    const next = container.querySelector('[data-skatelab-result-card] [data-skatelab-next-mission]');
    expect(next.getAttribute('data-skatelab-next-mission')).toBe('fewest_pumps');
    await click(next);
    expect(state.latest.skatelab.activeMission).toBe('fewest_pumps');
    expect(container.querySelector('details[data-skatelab-more-controls]').open).toBe(true);
  });

  it('slow motion covers the air (or the jump) only, is not offered under reduced motion, and never logs', async () => {
    const hp = physics.runSimulation('halfpipe', HP_INPUTS);
    const air = physics.slowReplayWindow(hp);
    expect(air.from).toBeLessThan(hp.rollTime / hp.motionDuration);
    expect(air.to).toBeGreaterThan(hp.airLandingTime / hp.motionDuration);
    expect(air.to - air.from).toBeLessThan(0.3);
    const gap = physics.slowReplayWindow(physics.runSimulation('gap', GAP_INPUTS));
    expect(gap.to).toBe(1);
    expect(physics.slowReplayWindow(physics.runSimulation('flat', FLAT_INPUTS))).toBeNull();
    expect(physics.slowReplayWindow(physics.runSimulation('halfpipe', { ...HP_INPUTS, pumps: 0 }))).toBeNull();

    // Reduced motion (this file's default): no slow-motion button.
    await mount(seed());
    await toPrompt('hp_moon');
    await click(container.querySelector('#sk-predict-hp_moon-same'));
    await launch();
    expect(container.querySelector('[data-skatelab-result-card]')).not.toBeNull();
    expect(container.querySelector('[data-skatelab-slow-replay]')).toBeNull();
  });

  it('with motion on, the slow clip plays from before the lip to after the landing and leaves the log alone', async () => {
    window.matchMedia = vi.fn(() => ({ matches: false, media: '', addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const frames = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { frames.push(callback); return frames.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const awardXP = vi.fn();
    const state = await mount(seed({ estimateChallenge: false }), { awardXP });
    const step = async (time) => { const callback = frames.pop(); frames.length = 0; await act(async () => { callback(time); }); };
    await launch();
    await step(0);
    await step(10 * 60 * 1000);
    expect(state.latest.skatelab.stats.runs).toBe(1);
    const logged = state.latest.skatelab.experiments.length;
    const paid = awardXP.mock.calls.length;

    const slow = container.querySelector('[data-skatelab-slow-replay]');
    expect(slow).not.toBeNull();
    const hp = physics.runSimulation('halfpipe', HP_INPUTS);
    const air = physics.slowReplayWindow(hp);
    await click(slow);
    expect(launchButton().getAttribute('aria-disabled')).toBe('true');
    expect(Number(container.querySelector('#sk-playhead').value)).toBe(Math.round(air.from * 100));
    await step(0);
    await step(10 * 60 * 1000);
    expect(launchButton().getAttribute('aria-disabled')).not.toBe('true');
    expect(Number(container.querySelector('#sk-playhead').value)).toBe(Math.round(air.to * 100));
    expect(state.latest.skatelab.experiments.length).toBe(logged);
    expect(state.latest.skatelab.stats.runs).toBe(1);
    expect(awardXP.mock.calls.length).toBe(paid);
    // The card is still there, so the button that started the clip kept its place.
    expect(container.querySelector('[data-skatelab-slow-replay]')).not.toBeNull();
  });
});
