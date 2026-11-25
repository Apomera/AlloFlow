// Sports-labs pass, round 2 (2026-11-23): Skate Lab. The first question is about the run the learner is about to
// watch; the untouched Gap default no longer pays the landing award or completes its quest; "Skip to the air" moves
// the playback only; the rider stands ready at the lip before the first run; the 3D rider uses the 2D rider's size
// rule and parts; the Simple level gets plain stage labels; a day scene follows the app's light theme; and narrow
// canvases move numbers off the rider. Fail-first: SKATELAB_SRC=C:/tmp/sports_labs_1123/skatelab/start_r2.js.
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
let texts;
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

// A canvas context that remembers each stroke's ink and each text with its place.
function makeCanvasContext() {
  const gradient = { addColorStop() {} };
  const base = {
    setTransform() {}, createLinearGradient: () => gradient, createRadialGradient: () => gradient, clearRect() {}, save() {}, restore() {},
    closePath() {}, fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, fill() {}, arc() {}, ellipse() {},
    rotate() {}, translate() {}, scale() {}, setLineDash() {}, strokeText() {},
    stroke() { strokes.push(String(base.strokeStyle)); },
    fillText(text, x, y) { texts.push({ text: String(text), x, y }); },
    measureText: (text) => ({ width: String(text).length * 7 }),
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
const launch = () => click(container.querySelector('[data-skatelab-launch="true"]'));
const chooseFirstAnswer = () => click(container.querySelector('[data-skatelab-predict] input[type="radio"]'));
const xpIds = (spy) => spy.mock.calls.map((call) => call[0]);
const textOf = (needle) => texts.filter((entry) => entry.text.indexOf(needle) !== -1);

beforeEach(() => {
  resetStemLab();
  toolConfig = loadTool(SOURCE, 'skatelab');
  physics = window.__alloSkatePhysicsPure;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  strokes = [];
  texts = [];
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
  // Reduced motion: every run finishes at once (the skip tests switch it off).
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

describe('item 4: the first question is about the run the learner is about to watch', () => {
  it('hp_run leads the halfpipe questions and the Moon question stays in the rotation', () => {
    const prompts = physics.predictionPromptsFor('halfpipe', true);
    expect(prompts[0]).toBe('hp_run');
    expect(prompts).toContain('hp_moon');
    expect(prompts).toContain('hp_friction');
  });

  it('its answer comes from the run itself: the highest pass after the drop against the starting height', () => {
    const positions = new Set();
    for (const patch of [{}, { pumps: 0 }, { pumps: 1 }, { pumps: 6 }, { surfaceId: 'rough', pumps: 0 }, { pumps: 2, pumpTimingId: 'lip' }, { dropHeightM: 1.2 }]) {
      const sim = physics.runSimulation('halfpipe', { ...HP_INPUTS, ...patch });
      const top = Math.max(0, ...(sim.passPeaks || []).map((peak) => peak.heightM));
      const expected = Math.abs(top - sim.dropHeightM) / sim.dropHeightM <= 0.0001 ? 'same' : (top > sim.dropHeightM ? 'higher' : 'lower');
      const evaluation = physics.evaluatePrediction('hp_run', sim);
      expect(evaluation.correct, JSON.stringify(patch)).toBe(expected);
      expect(physics.predictionWhyText('hp_run', evaluation.correct).length).toBeGreaterThan(40);
      positions.add(physics.predictionOptionOrder('hp_run', physics.simulationSignature(sim)).indexOf(evaluation.correct));
    }
    // Pumping adds energy (higher); no pumps leaves only friction (lower).
    expect(physics.evaluatePrediction('hp_run', physics.runSimulation('halfpipe', HP_INPUTS)).correct).toBe('higher');
    expect(physics.evaluatePrediction('hp_run', physics.runSimulation('halfpipe', { ...HP_INPUTS, pumps: 0 })).correct).toBe('lower');
    // The model's answer is not always in the same place.
    expect(positions.size).toBeGreaterThanOrEqual(2);
  });

  it('a new learner sees it first, with the drop and pump count of the setup on screen', async () => {
    await mount(seed());
    const question = container.querySelector('#sk-predict-question').textContent;
    expect(question).toContain('Watch this run.');
    expect(question).toContain('2.4 m up');
    expect(question).toContain('pumps 3 times');
    expect(container.querySelector('#sk-predict-hp_run-higher')).not.toBeNull();
  });

  it('the reveal gives the model numbers and the reason, and the ghost is the same ride with no pumps', async () => {
    await mount(seed());
    await click(container.querySelector('#sk-predict-hp_run-same'));
    await launch();
    const sim = physics.runSimulation('halfpipe', HP_INPUTS);
    const top = Math.max(...sim.passPeaks.map((peak) => peak.heightM));
    const card = container.querySelector('[data-skatelab-predict-feedback="miss"]');
    expect(card.textContent).toContain('highest point after the drop was ' + top.toFixed(2) + ' m');
    expect(card.querySelector('[data-skatelab-predict-why]').textContent).toContain('Each pump is work');
    expect(container.querySelector('.sk-ghost-note').textContent).toContain('the same ride with no pumps');
  });
});

describe('item 3: the gap landing award and quest need a changed setup', () => {
  async function runGap(overrides) {
    const awardXP = vi.fn();
    const state = await mount(seed({ mode: 'gap', ...overrides }), { awardXP });
    await chooseFirstAnswer();
    await launch();
    return { awardXP, state };
  }

  it('the untouched default lands but pays no landing award and leaves the quest pending', async () => {
    expect(physics.runSimulation('gap', GAP_INPUTS).runSuccessful).toBe(true);
    const { awardXP, state } = await runGap({});
    expect(state.latest.skatelab.stats.successful).toBe(1);
    expect(xpIds(awardXP)).not.toContain('skatelab_gap_landing');
    expect(physics.gapQuestDone(state.latest.skatelab)).toBe(false);
  });

  it('a changed setup that lands pays 10 XP once and completes the quest', async () => {
    const { awardXP, state } = await runGap({ speedMph: 16 });
    const award = awardXP.mock.calls.find((call) => call[0] === 'skatelab_gap_landing');
    expect(award && award[1]).toBe(10);
    expect(physics.gapQuestDone(state.latest.skatelab)).toBe(true);
  });

  it('a teacher-locked starting setup run unchanged does not count either', async () => {
    // Rider mass is a lockable setting; the locked start differs from the default but is not the learner's own.
    const locks = { riderMassKg: 50 };
    const { awardXP, state } = await runGap({ riderMassKg: 50, teacher: { locks } });
    expect(state.latest.skatelab.stats.successful).toBe(1);
    expect(xpIds(awardXP)).not.toContain('skatelab_gap_landing');
    expect(physics.gapQuestDone(state.latest.skatelab)).toBe(false);
    const changed = physics.runSimulation('gap', { ...GAP_INPUTS, riderMassKg: 50, angleDeg: 33 });
    expect(changed.runSuccessful).toBe(true);
    expect(physics.gapSetupChanged(changed, locks)).toBe(true);
    expect(physics.gapSetupChanged(physics.runSimulation('gap', { ...GAP_INPUTS, riderMassKg: 50 }), locks)).toBe(false);
  });

  it('log rows saved before setup hashes still count; the flat 5 XP award is unchanged', async () => {
    expect(physics.gapQuestDone({ experiments: [{ mode: 'gap', runSuccessful: true }] })).toBe(true);
    expect(physics.gapQuestDone({ experiments: [{ mode: 'gap', runSuccessful: false }] })).toBe(false);
    const awardXP = vi.fn();
    await mount(seed({ mode: 'flat' }), { awardXP });
    await chooseFirstAnswer();
    await launch();
    expect(awardXP.mock.calls.find((call) => call[0] === 'skatelab_flat_stop')[1]).toBe(5);
  });
});

describe('item 5: "Skip to the air" moves the playback only', () => {
  it('jumps to a little before takeoff on a long wait, and is not offered elsewhere', () => {
    const hp = physics.runSimulation('halfpipe', HP_INPUTS);
    const target = physics.skipToAirProgress(hp);
    expect(target).toBeGreaterThan(0);
    expect(target * hp.motionDuration).toBeLessThan(hp.rollTime);
    expect(hp.rollTime - target * hp.motionDuration).toBeCloseTo(0.8, 6);
    expect(physics.skipToAirProgress(physics.runSimulation('halfpipe', { ...HP_INPUTS, pumps: 0 }))).toBeNull();
    expect(physics.skipToAirProgress(physics.runSimulation('gap', GAP_INPUTS))).toBeNull();
    expect(physics.skipToAirProgress(physics.runSimulation('flat', FLAT_INPUTS))).toBeNull();
  });

  async function playRun(useSkip) {
    window.matchMedia = vi.fn(() => ({ matches: false, media: '', addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const frames = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { frames.push(callback); return frames.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const step = async (time) => { const callback = frames.pop(); frames.length = 0; await act(async () => { callback(time); }); };
    const awardXP = vi.fn();
    const state = await mount(seed({ playbackSpeed: 1 }), { awardXP });
    await click(container.querySelector('#sk-predict-hp_run-higher'));
    await launch();
    await step(0);
    await step(500);
    const button = container.querySelector('[data-skatelab-skip-air]');
    let skipped = null;
    if (useSkip) {
      expect(button).not.toBeNull();
      await click(button);
      skipped = Number(container.querySelector('#sk-playhead').value);
      expect(container.querySelector('[data-skatelab-skip-air]')).toBeNull();
      expect(state.latest.skatelab.experiments.length, 'nothing is logged by the skip').toBe(0);
    }
    await step(1000);
    await step(10 * 60 * 1000);
    return { state, awardXP, skipped };
  }

  it('the skipped run plays on to its end, then logs and scores exactly as the full run does', async () => {
    const hp = physics.runSimulation('halfpipe', HP_INPUTS);
    const full = await playRun(false);
    const fullIds = xpIds(full.awardXP).slice().sort();
    const fullRows = full.state.latest.skatelab.experiments.length;
    const fullResult = full.state.latest.skatelab.predictionResult;
    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(container);
    vi.restoreAllMocks();
    const skip = await playRun(true);
    expect(skip.skipped).toBe(Math.round(physics.skipToAirProgress(hp) * 100));
    expect(skip.state.latest.skatelab.experiments.length).toBe(fullRows);
    expect(skip.state.latest.skatelab.stats.runs).toBe(1);
    expect(xpIds(skip.awardXP).slice().sort()).toEqual(fullIds);
    expect(skip.state.latest.skatelab.predictionResult.correct).toBe(fullResult.correct);
    expect(skip.state.latest.skatelab.predictionResult.matched).toBe(fullResult.matched);
  });
});

describe('item 1: the ready pose before the first run (display only)', () => {
  it('stands at the lip only before a lip start has run', () => {
    const hp = physics.runSimulation('halfpipe', HP_INPUTS);
    const first = physics.sampleModel(hp, 0);
    const pose = physics.halfpipeReadyPose(hp, first, { readyPose: true, progress: 0 });
    expect(pose).toMatchObject({ x: -4, y: hp.rampDepthM, rotation: 0 });
    expect(physics.halfpipeReadyPose(hp, first, { readyPose: false, progress: 0 })).toBeNull();
    expect(physics.halfpipeReadyPose(hp, physics.sampleModel(hp, 0.1), { readyPose: true, progress: 0.1 })).toBeNull();
    const low = physics.runSimulation('halfpipe', { ...HP_INPUTS, dropHeightM: 1.2 });
    expect(physics.halfpipeReadyPose(low, physics.sampleModel(low, 0), { readyPose: true, progress: 0 })).toBeNull();
    // The model's own first frame is unchanged: the board is on the vertical wall.
    expect(Math.abs(first.rotation)).toBeGreaterThan(45);
  });

  it('the start label moves clear of the standing rider', () => {
    const ctx = { save() {}, restore() {}, measureText: (text) => ({ width: text.length * 7 }) };
    expect(physics.readyStartLabelSpot(ctx, 'start 2.4 m', 83, 253, 0)).toEqual({ x: 49, y: 223 });
    for (const [handleX, riderPx] of [[83, 75], [22, 40], [300, 75]]) {
      const spot = physics.readyStartLabelSpot(ctx, 'start 2.4 m', handleX, 253, riderPx);
      const box = { left: spot.x - 5, right: spot.x - 5 + Math.max(48, 11 * 7 + 12), top: spot.y - 13, bottom: spot.y + 5 };
      // The rider stands right of the handle, from the lip (y 253) up riderPx.
      const rider = { left: handleX + 10, right: handleX + 10 + riderPx * 0.6, top: 253 - riderPx, bottom: 253 };
      const overlaps = box.left < rider.right && box.right > rider.left && box.top < rider.bottom && box.bottom > rider.top;
      expect(overlaps, handleX + '/' + riderPx).toBe(false);
    }
  });
});

describe('item 2: the 3D rider uses the 2D rider rule', () => {
  it('same height rule, helmet and nose; BMX has a frame; the pose follows the model', () => {
    for (const ppm of [20, 45, 61, 90]) {
      for (const compact of [false, true]) {
        const fig = physics.riderFigure3D(ppm, compact, 'skate', 'neutral', 0, false, false);
        expect(fig.heightPx).toBeCloseTo(physics.riderScaleFor(ppm, compact) * 56, 6);
        expect(fig.heightPx).toBeGreaterThanOrEqual(compact ? 38 : 48);
      }
    }
    const skate = physics.riderFigure3D(61, false, 'skate', 'neutral', 0, false, false);
    expect(skate.parts).toEqual(expect.arrayContaining(['deck', 'nose', 'legs', 'helmet']));
    expect(physics.riderFigure3D(61, false, 'bmx', 'neutral', 0, false, false).parts).toEqual(expect.arrayContaining(['frame', 'wheels', 'helmet']));
    const squat = physics.riderFigure3D(61, false, 'skate', 'neutral', 1, false, false);
    expect(squat.pose.legReach).toBeLessThan(skate.pose.legReach);
    expect(physics.riderFigure3D(61, false, 'skate', 'tuck', 0, true, false).pose.reach)
      .toBeLessThan(physics.riderFigure3D(61, false, 'skate', 'open', 0, true, false).pose.reach);
  });
});

describe('item 6: plain words at the Simple level', () => {
  it('Simple gets new plain labels; Standard keeps the physics terms', () => {
    const ids = ['trace_halfpipe', 'trace_gap', 'phase_evidence', 'insight_locked', 'spin_rate', 'camera', 'telemetry_load'];
    for (const id of ids) {
      expect(physics.stageLabel(id, 'simple'), id).not.toBe(physics.stageLabel(id, 'standard'));
      expect(physics.stageLabel(id, 'extended')).toBe(physics.stageLabel(id, 'standard'));
    }
    expect(physics.stageLabel('trace_halfpipe', 'standard')).toBe('Transition normal load (g)');
    expect(physics.stageLabel('spin_rate', 'standard')).toBe('Takeoff angular speed');
    expect(physics.stageLabel('phase_evidence', 'simple')).not.toMatch(/phase/i);
  });

  it('the screen follows the grade band', async () => {
    await mount(seed({ estimateChallenge: false }), { gradeBand: 'g68', gradeLevel: '7th Grade' });
    await launch();
    expect(container.textContent).toContain('Ramp push on the rider (g)');
    expect(container.textContent).not.toContain('Transition normal load (g)');
    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(container);
    await mount(seed({ estimateChallenge: false }), { gradeBand: 'g912', gradeLevel: '10th Grade' });
    await launch();
    expect(container.textContent).toContain('Transition normal load (g)');
  });
});

describe('item 7: the day scene follows the app light theme', () => {
  it('maps the host theme to a look; high contrast always wins', async () => {
    expect(physics.sceneLook(false, false)).toBe('day');
    expect(physics.sceneLook(true, false)).toBe('night');
    expect(physics.sceneLook(undefined, undefined)).toBe('night');
    expect(physics.sceneLook(false, true)).toBe('contrast');
    expect(physics.sceneLook(undefined, undefined, 'contrast')).toBe('contrast');
    for (const [ctx, look] of [[{ isDark: false }, 'day'], [{ isDark: true }, 'night'], [{}, 'night'], [{ isDark: false, isContrast: true }, 'contrast']]) {
      await mount(seed(), ctx);
      expect(container.querySelector('.skatelab-shell').getAttribute('data-skatelab-look'), JSON.stringify(ctx)).toBe(look);
      await act(async () => { root.unmount(); });
      root = ReactDOMClient.createRoot(container);
    }
  });

  it('every day ink reads on the white label chips (4.5:1) and shows on the sky and ground (3:1)', () => {
    const colors = physics.sceneDayColors();
    const lum = (rgb) => rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const ratio = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    // Chip and 3D-solid fills (dark at night, light by day) are surfaces, not inks.
    const surfaces = ['5,13,25', '52,68,90', '61,79,103', '46,63,84'];
    // Faint grid and tick strokes: their words sit on chips.
    const faint = ['115,136,163', '179,194,212'];
    const backgrounds = colors.sky.concat(colors.ground).map(hex);
    for (const [night, day] of Object.entries(colors.tones)) {
      if (surfaces.includes(night)) continue;
      const ink = day.split(',').map(Number);
      expect(ratio(ink, [255, 255, 255]), night + ' on a white chip').toBeGreaterThanOrEqual(4.5);
      if (faint.includes(night)) continue;
      for (const background of backgrounds) expect(ratio(ink, background), night + ' on ' + background).toBeGreaterThanOrEqual(3);
    }
  });

  it('a day frame paints the day inks; a night frame keeps the night ones', async () => {
    await mount(seed({ estimateChallenge: false }), { isDark: false });
    await launch();
    expect(strokes).toContain('rgb(21,94,117)');
    expect(strokes).not.toContain('#4ed7e8');
    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(container);
    strokes = [];
    await mount(seed({ estimateChallenge: false }), { isDark: true });
    await launch();
    expect(strokes).toContain('#4ed7e8');
    expect(strokes).not.toContain('rgb(21,94,117)');
  });
});

describe('report check: a run from a result-card next step is told apart in the log, report and CSV', () => {
  it('names gravity, the BMX and the rider mass when they are not the defaults', async () => {
    const state = await mount(seed({ estimateChallenge: false }));
    await launch();
    expect(state.latest.skatelab.experiments[0].setup).not.toMatch(/gravity|BMX|kg rider/);
    await click(container.querySelector('[data-skatelab-idea="moon"]'));
    await launch();
    const rows = state.latest.skatelab.experiments;
    expect(rows.length).toBe(2);
    const moonRow = rows.find((row) => /Moon gravity/.test(row.setup));
    expect(moonRow).toBeTruthy();
    expect(physics.reportCsv ? physics.reportCsv(state.latest.skatelab) : moonRow.setup).toContain('Moon gravity');
    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(container);
    const gap = await mount(seed({ mode: 'gap', vehicle: 'bmx', riderMassKg: 70, gravity: 3.71, estimateChallenge: false }));
    await launch();
    expect(gap.latest.skatelab.experiments[0].setup).toMatch(/Mars gravity · BMX · 70 kg rider$/);
  });
});

describe('item 8: narrow canvases keep numbers off the rider', () => {
  it('a long coasting ghost draws only the diamonds inside the shown run, plus its highest', () => {
    const hp = physics.runSimulation('halfpipe', HP_INPUTS);
    const ghost = physics.ghostSimFor(hp, 'hp_run').sim;
    const shown = physics.ghostPeaksToDraw(ghost, hp.motionDuration);
    const highest = ghost.passPeaks.reduce((best, peak) => (peak.heightM > best.heightM ? peak : best));
    expect(ghost.passPeaks.length).toBeGreaterThan(shown.length * 2);
    expect(shown).toContain(highest);
    expect(shown.every((peak) => peak === highest || peak.t <= hp.motionDuration + 1e-6)).toBe(true);
    expect(physics.ghostPeaksToDraw(ghost, 0).length).toBe(ghost.passPeaks.length);
  });

  it('the halfpipe air-height label sits inside the ramp where there is no room beside the wall', async () => {
    // A phone, and a narrow tablet whose label would be pushed back over the wall by the edge clamp.
    for (const [width, limit] of [[360, 0.72], [600, 0.8]]) {
      canvasRect = { width, height: 360, top: 0, left: 0, right: width, bottom: 360 };
      texts = [];
      await mount(seed({ estimateChallenge: false }));
      await launch();
      const apex = textOf(' ft').filter((entry) => /^\+\d/.test(entry.text));
      expect(apex.length, String(width)).toBeGreaterThan(0);
      // The trick wall is the right one; the label ends well inside it.
      for (const entry of apex) expect(entry.x + entry.text.length * 7, String(width)).toBeLessThan(width * limit);
      await act(async () => { root.unmount(); });
      root = ReactDOMClient.createRoot(container);
    }
  });

  it('after a 3D gap landing on a phone the lane drift is in the footer, not on the rider', async () => {
    canvasRect = { width: 360, height: 360, top: 0, left: 0, right: 360, bottom: 360 };
    await mount(seed({ mode: 'gap', viewMode: '3d', estimateChallenge: false }));
    // Only the frames drawn from here on: the run ends at once (reduced motion) on its last frame.
    texts = [];
    await launch();
    const last = texts.map((entry) => entry.text);
    expect(last.length).toBeGreaterThan(0);
    expect(last.some((text) => /LANDING ZONE\s+\|\s+lane \d+\.\d ft/.test(text))).toBe(true);
    expect(last.some((text) => /^lane \d+\.\d ft$/.test(text))).toBe(false);
  });
});
