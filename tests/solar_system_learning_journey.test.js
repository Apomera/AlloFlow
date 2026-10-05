import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';

// Use the existing SSR store so production callbacks can be exercised without
// mounting canvas effects. The added attribute only connects rendered controls
// to the event handlers supplied by the tool's real React elements.
function renderSolarSystem(seed = {}, overrides = {}) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true,
    solarMissionDashboardOpen: false,
    orreryMode: true,
    orr_tab: 0,
    orr_sel: 'mercury',
    orr_paused: true,
    orr_time: 0,
    orr_zoom: 'inner',
    orr_snapshots: {},
    missionLog: [],
    journalEntries: [],
    ...seed,
  } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (typeof type === 'string' && props &&
        (typeof props.onClick === 'function' || typeof props.onChange === 'function')) {
      const id = String(callbacks.size);
      callbacks.set(id, props);
      return React.createElement(type, { ...props, 'data-journey-callback': id }, ...children);
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map();
      store.dirty = false;
      const ctx = makeCtx({ ...overrides, React: callbackReact }, store);
      markup = ReactDOMServer.renderToStaticMarkup(
        React.createElement(() => config.render(ctx)),
      );
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  function button(name, scope = document) {
    return [...scope.querySelectorAll('button')].find((control) => {
      const label = (control.getAttribute('aria-label') || control.textContent).replace(/\s+/g, ' ').trim();
      return typeof name === 'string' ? label === name : name.test(label);
    });
  }
  function invoke(control, eventName, value) {
    expect(control, 'The production control must be rendered').toBeTruthy();
    expect(control.disabled, 'Only an enabled control can be activated').toBe(false);
    const handler = callbacks.get(control.dataset.journeyCallback)?.[eventName];
    expect(handler, 'The rendered control must retain its production callback').toBeTypeOf('function');
    handler({ target: value === undefined ? control : { value }, currentTarget: control, preventDefault() {} });
    render();
  }
  render();
  return {
    get state() { return store.toolData.solarSystem; },
    get evidence() { return document.querySelector('.orr-evidence'); },
    get guide() { return document.getElementById('orrery-guided-mission'); },
    button,
    click(control) { invoke(control, 'onClick'); },
    change(control, value) { invoke(control, 'onChange', value); },
  };
}

function reading(patch = {}) {
  return { bodyId: 'mercury', bodyName: 'Mercury', time: 0, distance: 0.31, speed: 59,
    phase: 'Near perihelion', ...patch };
}

function staleSuccess() {
  return { choice: 'faster', actual: 'faster', correct: true, speedDelta: 999, distanceDelta: -999 };
}

function expectUnavailableEvidence(env) {
  const quality = document.getElementById('orrery-evidence-quality');
  expect(quality).not.toBeNull();
  expect(quality.textContent.trim()).not.toBe('');
  expect(env.evidence.textContent).not.toMatch(/\b(?:NaN|Infinity|undefined)\b/);
  expect(env.evidence.querySelector('.orr-evidence-result')).toBeNull();
  const record = env.button(/^Record orbital speed observation/, env.evidence);
  expect(!record || record.disabled).toBe(true);
  expect(env.state.missionLog).toEqual([]);
}

function retainedLearningState(state) {
  return structuredClone({
    time: state.orr_time, paused: state.orr_paused, selected: state.orr_sel,
    compare: state.orr_compare, follow: state.orr_follow, snapshots: state.orr_snapshots,
    progress: state.orr_mission_progress, missionLog: state.missionLog,
    journalEntries: state.journalEntries,
  });
}

describe('Solar System saved evidence and guided learning journey', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'solarSystem');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('keeps incomplete saved pairs visible without NaN, grading, or recording', () => {
    const saved = { mercury: { a: { time: 0, speed: 59 },
      b: reading({ time: 0.12, distance: 0.45, speed: 42 }),
      prediction: 'slower', predictionResult: staleSuccess() } };
    const before = structuredClone(saved);
    const env = renderSolarSystem({ orr_snapshots: saved });
    expectUnavailableEvidence(env);
    expect(env.evidence.textContent).toContain('Not recorded');
    expect(env.state.orr_snapshots).toEqual(before);
    const saveB = env.button(/snapshot B for Mercury/, env.evidence);
    expect(saveB?.disabled).toBe(true);
  });

  it('rejects nonfinite and nonphysical readings in either saved slot', () => {
    const invalidReadings = [
      { slot: 'a', patch: { speed: NaN } },
      { slot: 'a', patch: { distance: 0 } },
      { slot: 'a', patch: { time: Infinity } },
      { slot: 'b', patch: { speed: -1 } },
      { slot: 'b', patch: { distance: -Infinity } },
    ];
    for (const { slot, patch } of invalidReadings) {
      const pair = { a: reading(), b: reading({ time: 0.12, distance: 0.45, speed: 42 }),
        prediction: 'slower', predictionResult: staleSuccess() };
      pair[slot] = reading(patch);
      const env = renderSolarSystem({ orr_snapshots: { mercury: pair } });
      expectUnavailableEvidence(env);
      expect(env.evidence.textContent).toContain('Not recorded');
    }
  });

  it('withholds comparison results when a saved reading belongs to another world', () => {
    const saved = { mercury: { a: reading({ bodyId: 'earth', bodyName: 'Earth' }),
      b: reading({ time: 0.12, distance: 0.45, speed: 42 }),
      prediction: 'slower', predictionResult: staleSuccess() } };
    const before = structuredClone(saved);
    const env = renderSolarSystem({ orr_snapshots: saved });
    expectUnavailableEvidence(env);
    expect(env.state.orr_snapshots).toEqual(before);
  });

  it('recomputes a complete legacy pair and records the measured result only once', () => {
    const a = { time: 1, distance: 0.31, speed: 59 };
    const b = { time: 0, distance: 0.45, speed: 42 };
    const env = renderSolarSystem({ orr_snapshots: { mercury: {
      a, b, prediction: 'faster', predictionResult: staleSuccess(),
    } } });
    const result = env.evidence.querySelector('.orr-evidence-result');
    expect(result).not.toBeNull();
    expect(result.getAttribute('data-supported')).toBe('false');
    expect(result.textContent).toContain('slower');
    expect(result.textContent).not.toContain('999');
    expect(env.evidence.textContent).not.toMatch(/\b(?:NaN|undefined)\b/);
    env.click(env.button(/^Record orbital speed observation/, env.evidence));
    expect(env.state.missionLog).toHaveLength(1);
    expect(JSON.stringify(env.state.missionLog)).toContain('slower');
    expect(JSON.stringify(env.state.missionLog)).not.toContain('999');
    expect(env.state.orr_snapshots.mercury.a).toEqual(a);
    expect(env.state.orr_snapshots.mercury.b).toEqual(b);
    expect(env.state.orr_snapshots.mercury.observationLogged).toBe(true);
    const recorded = env.button(/Observation already recorded for Mercury/, env.evidence);
    expect(recorded?.disabled).toBe(true);
    expect(env.state.missionLog).toHaveLength(1);
  });

  it('does not grade a valid pair using an unrecognized restored prediction', () => {
    const env = renderSolarSystem({ orr_snapshots: { mercury: {
      a: reading(), b: reading({ time: 0.12, distance: 0.45, speed: 42 }),
      prediction: 'guaranteed-fastest', predictionResult: staleSuccess(),
    } } });
    expect(env.evidence.querySelector('table')).not.toBeNull();
    expect(env.evidence.querySelector('.orr-evidence-result')).toBeNull();
    expect(env.evidence.textContent).not.toContain('guaranteed-fastest');
    expect(env.state.missionLog).toEqual([]);
    const record = env.button(/^Record orbital speed observation/, env.evidence);
    expect(!record || record.disabled).toBe(true);
  });

  it('exports incomplete evidence honestly without inventing values or a result', () => {
    vi.useFakeTimers();
    const blobs = [];
    vi.stubGlobal('Blob', class {
      constructor(parts, options) { this.parts = parts; this.type = options.type; blobs.push(this); }
    });
    const OriginalURL = globalThis.URL;
    const createObjectURL = vi.fn(() => 'blob:orbital-evidence-test');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', class extends OriginalURL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    });
    vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const saved = { mercury: { a: { time: 0, speed: 59 },
      b: reading({ time: 0.12, distance: 0.45, speed: 42 }),
      prediction: 'slower', predictionResult: staleSuccess() } };
    const before = structuredClone(saved);
    const env = renderSolarSystem({ orr_snapshots: saved });
    env.click(env.button(/^Export orbital evidence for Mercury$/, env.evidence));
    expect(blobs).toHaveLength(1);
    const text = blobs[0].parts.join('');
    expect(text).toContain('Snapshot A');
    expect(text).toContain('Snapshot B');
    expect(text).toMatch(/not recorded/i);
    expect(text).toContain('59.0');
    expect(text).not.toMatch(/\b(?:NaN|Infinity|undefined)\b/);
    expect(text).not.toContain('999');
    expect(createObjectURL).toHaveBeenCalledWith(blobs[0]);
    expect(env.state.orr_snapshots).toEqual(before);
    expect(env.state.missionLog).toHaveLength(1);
    expect(env.state.missionLog[0].text).toContain('Exported orbital evidence');
    vi.runOnlyPendingTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:orbital-evidence-test');
  });

  it('repairs an incomplete A only through explicit recapture and restores the prediction gate', () => {
    const earth = { a: { time: 0, speed: 29.8, distance: 1 } };
    const env = renderSolarSystem({ orr_paused: false, orr_snapshots: {
      earth, mercury: { a: { time: 0, speed: 59 }, b: reading(),
        prediction: 'slower', predictionResult: staleSuccess(), observationLogged: true },
    } });
    env.click(env.button(/snapshot A for Mercury/, env.evidence));
    const repaired = env.state.orr_snapshots.mercury;
    expect(repaired.a.bodyId).toBe('mercury');
    expect(repaired.a.time).toBe(0);
    expect(Number.isFinite(repaired.a.distance) && repaired.a.distance > 0).toBe(true);
    expect(Number.isFinite(repaired.a.speed) && repaired.a.speed > 0).toBe(true);
    expect(repaired.b).toBeNull();
    expect(repaired.prediction).toBe('');
    expect(repaired.predictionResult).toBeNull();
    expect(repaired.observationLogged).toBe(false);
    expect(env.state.orr_paused).toBe(true);
    expect(env.state.orr_snapshots.earth).toEqual(earth);
    expect(env.state.missionLog).toEqual([]);
    const prediction = document.getElementById('orrery-prediction-speed');
    expect(prediction?.disabled).toBe(false);
    expect(env.button(/snapshot B for Mercury/, env.evidence)?.disabled).toBe(true);
    env.change(prediction, 'about the same');
    env.click(env.button(/snapshot B for Mercury/, env.evidence));
    expect(env.evidence.querySelector('.orr-evidence-result')?.getAttribute('data-supported')).toBe('true');
    expect(env.evidence.querySelector('.orr-evidence-result')?.textContent).toContain('about the same');
  });

  it('continues to an unfinished mission instead of declaring out-of-order completion', () => {
    const progress = { mercury_speed: { started: true, correct: true, detail: 'Saved Mercury reasoning' },
      longer_year: { started: true, correct: true, detail: 'Saved Mars reasoning' } };
    const env = renderSolarSystem({ orr_mission_idx: 2, orr_mission_progress: progress,
      orr_time: 0.37, orr_paused: false, orr_sel: 'mars', orr_compare: 'earth', orr_follow: 'mars' });
    const before = retainedLearningState(env.state);
    expect(env.guide.textContent).not.toContain('All guided missions complete');
    expect(env.guide.textContent).toMatch(/2\s*\/\s*3\s+complete/);
    env.click(env.button('Continue unfinished mission', env.guide));
    expect(env.state.orr_mission_idx).toBe(0);
    expect(retainedLearningState(env.state)).toEqual(before);
    expect(document.getElementById('orrery-guided-mission-title')?.textContent).toContain('Earth live orbit');
  });

  it('allows repeated roadmap review without restarting the clock or awarding progress', () => {
    const awardXP = vi.fn();
    const tryAward = vi.fn();
    const progress = Object.fromEntries(['earth_distance', 'mercury_speed', 'longer_year'].map((id) =>
      [id, { started: true, correct: true, detail: 'Retained explanation for ' + id }]));
    const env = renderSolarSystem({ orr_mission_idx: 1, orr_mission_progress: progress,
      orr_time: 3.7, orr_paused: false, orr_sel: 'halley', orr_compare: 'earth', orr_follow: 'halley',
      orr_snapshots: { mercury: { a: reading() } }, missionLog: [{ text: 'Retain observation' }],
      journalEntries: [{ observation: 'Retain journal evidence' }],
    }, { awardXP, tryAward });
    const before = retainedLearningState(env.state);
    for (const [title, index] of [['Earth live orbit', 0], ['Longer year', 2], ['Earth live orbit', 0], ['Longer year', 2]]) {
      env.click(env.button('Open mission: ' + title, env.guide));
      expect(env.state.orr_mission_idx).toBe(index);
      expect(retainedLearningState(env.state)).toEqual(before);
    }
    expect(env.guide.textContent).toContain('All guided missions complete');
    expect(awardXP).not.toHaveBeenCalled();
    expect(tryAward).not.toHaveBeenCalled();
  });

  it('refocuses a started mission without erasing attempts, evidence, or simulation time', () => {
    const progress = { longer_year: { started: true, choice: 'earth', correct: false } };
    const snapshots = { mercury: { a: reading() } };
    const env = renderSolarSystem({ orr_mission_idx: 2, orr_mission_progress: progress,
      orr_time: 0.37, orr_paused: false, orr_sel: 'mercury', orr_compare: 'venus',
      orr_follow: 'mercury', orr_snapshots: snapshots });
    const beforeProgress = structuredClone(progress);
    const beforeSnapshots = structuredClone(snapshots);
    const options = [...env.guide.querySelectorAll('button[aria-describedby*="orrery-guided-objective"]')];
    expect(options).toHaveLength(2);
    expect(options.every((option) => option.disabled)).toBe(true);
    env.click(env.button('Focus Mars and pause', env.guide));
    expect(env.state.orr_sel).toBe('mars');
    expect(env.state.orr_compare).toBe('earth');
    expect(env.state.orr_follow).toBeNull();
    expect(env.state.orr_paused).toBe(true);
    expect(env.state.orr_time).toBe(0.37);
    expect(env.state.orr_mission_progress).toEqual(beforeProgress);
    expect(env.state.orr_snapshots).toEqual(beforeSnapshots);
    expect(env.state.missionLog).toEqual([]);
    const readyOptions = [...env.guide.querySelectorAll('button[aria-describedby*="orrery-guided-objective"]')];
    expect(readyOptions).toHaveLength(2);
    expect(readyOptions.every((option) => !option.disabled)).toBe(true);
    expect(document.getElementById('orrery-guided-feedback')?.textContent).toContain('Not quite');
  });
});
