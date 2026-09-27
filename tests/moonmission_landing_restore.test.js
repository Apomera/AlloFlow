import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const found = find(child, predicate); if (found) return found; } return null; }
  return predicate(node) ? node : find(node.props && node.props.children, predicate);
}

function mount(result, extra = {}) {
  const store = newStore({ moonMission: Object.assign({ missionPhase: 5, descentStarted: true, landingResult: result,
    landingAttempts: [result], missionXP: 140, missionLog: [], animPaused: false }, extra) });
  const awardXP = vi.fn();
  const tree = () => window.StemLab._registry.moonMission.render(makeCtx({ toolData: store.toolData, awardXP }, store));
  const initial = tree();
  document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(initial);
  const canvas = document.querySelector('[data-descent-canvas]');
  const text = [];
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, { get: (target, key) => key in target ? target[key]
    : key === 'fillText' ? (value) => text.push(String(value))
    : key === 'measureText' ? (value) => ({ width: String(value).length * 6 })
    : key === 'createLinearGradient' || key === 'createRadialGradient' ? () => gradient : () => {},
    set: (target, key, value) => { target[key] = value; return true; } });
  canvas.getContext = () => ctx;
  const ref = find(initial, (node) => node.type === 'canvas' && node.props['data-descent-canvas']).ref;
  ref(canvas);
  return { store, canvas, text, awardXP, tree, ref,
    value: (key) => document.querySelector('[data-flight-value="' + key + '"]').textContent,
    retry() { find(tree(), (node) => node.type === 'button' && node.props['aria-label'] === 'Retry the powered descent from the start').props.onClick(); } };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  resetStemLab();
  loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission');
});
afterEach(() => { document.body.innerHTML = ''; vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('completed landing restoration', () => {
  it('keeps legacy grade and percent fuel without inventing recorded flight measurements or new rewards', () => {
    const result = { crashed: false, score: 88, grade: 'A', vVel: 1.2, hVel: 0.8, fuel: 22 };
    const app = mount(result);
    expect(app.text).toContain('Landing score 88/100 (grade A)');
    expect(app.text).toContain('22%');
    expect(app.text.join(' ')).toContain('22% fuel left');
    expect(app.text.join(' ')).not.toMatch(/22 s|Fuel reserve \+|Soft touch \+/);
    for (const key of ['mass', 'propellant', 'hover', 'deltaV', 'brake', 'time', 'track']) expect(app.value(key), key).toBe('Not recorded');
    expect(app.value('vertical')).toBe('1.2 m/s down');
    expect(app.value('lateral')).toBe('0.8 m/s');
    expect(document.querySelector('[data-descent-guidance]').textContent).toMatch(/older save.*fuel percentage/);
    expect(app.canvas.dataset.descentMass).toBe('');
    expect(app.canvas.dataset.descentFuel).toBe('');
    expect(app.canvas.dataset.descentFuelPercent).toBe('22');
    expect(app.canvas.dataset.descentFuelUnit).toBe('%');
    expect(app.canvas.dataset.descentElapsed).toBe('');
    const before = JSON.stringify(app.store.toolData.moonMission);
    app.ref(app.canvas); // React reattaches its inline ref after a state render.
    vi.advanceTimersByTime(1100);
    expect(JSON.stringify(app.store.toolData.moonMission)).toBe(before);
    expect(app.awardXP).not.toHaveBeenCalled();
  });

  it('preserves a seconds-based grade when rounded saved fuel crosses a scoring boundary', () => {
    // The original 29.7 s scores 69. Its persisted 30 s would recompute to 80.
    const P = window.MoonMissionPure;
    expect(P.landingScore(1.2, 0.8, 29.7, false).total).toBe(69);
    expect(P.landingScore(1.2, 0.8, 30, false).total).toBe(80);
    const app = mount({ crashed: false, score: 69, grade: 'C', vVel: 1.2, hVel: 0.8, fuel: 30, fuelUnit: 's' });
    expect(app.text).toContain('Landing score 69/100 (grade C)');
    expect(app.text).toContain('30 s');
    expect(app.value('time')).toBe('Not recorded');
    expect(app.value('track')).toBe('Not recorded');
    expect(Number(app.canvas.dataset.descentMass)).toBeGreaterThan(7000);
    expect(app.text.join(' ')).not.toContain('Fuel reserve +');
  });

  it('restores recorded endpoint telemetry without recalculating the saved score', () => {
    const recording = { version: 1, samples: [
      { t: 0, alt: 300, v: -12, h: 4, fuel: 100, throttle: 0, tilt: 0, x: 0 },
      { t: 72.5, alt: 0, v: -0.8, h: -0.2, fuel: 29.7, throttle: 0.5, tilt: -0.1, x: -80.4 }
    ] };
    const app = mount({ crashed: false, score: 79, grade: 'B', vVel: 0.8, hVel: 0.2, fuel: 30, fuelUnit: 's', recording });
    expect(app.text).toContain('Landing score 79/100 (grade B)');
    expect(app.value('time')).toBe('72.5 s');
    expect(app.value('track')).toBe('80.4 m left');
    expect(app.value('lateral')).toBe('0.2 m/s left');
    expect(Number(app.canvas.dataset.descentMass)).toBeCloseTo(window.MoonMissionPure.descentMass(29.7), 2);
    expect(app.canvas.dataset.descentFuelUnit).toBe('s');
    expect(document.querySelector('[data-landing-recorder]')).not.toBeNull();
    expect(app.awardXP).not.toHaveBeenCalled();
    expect(app.store.toolData.moonMission.landingAttempts).toHaveLength(1);
  });

  it('carries the previously earned legacy landing reward into a retry without awarding XP again', () => {
    const result = { crashed: false, score: 88, grade: 'A', vVel: 1.2, hVel: 0.8, fuel: 22 };
    const app = mount(result);
    app.retry();
    expect(app.store.toolData.moonMission.landingRewarded).toBe(true);
    expect(app.store.toolData.moonMission.missionXP).toBe(140);
    expect(app.store.toolData.moonMission.landingResult).toBeNull();
    expect(app.store.toolData.moonMission.descentStarted).toBe(false);
    expect(app.store.toolData.moonMission.landingAttempts).toEqual([result]);
    expect(app.awardXP).not.toHaveBeenCalled();
  });

  it.each([undefined, []])('preserves the only legacy result when retry starts with history %j', (landingAttempts) => {
    const result = { crashed: false, score: 88, grade: 'A', vVel: 1.2, hVel: 0.8, fuel: 22 };
    const app = mount(result, { landingAttempts });
    const retry = find(app.tree(), (node) => node.type === 'button' && node.props['aria-label'] === 'Retry the powered descent from the start').props.onClick;
    retry();
    retry(); // A second click before React commits must not duplicate the legacy record.
    const state = app.store.toolData.moonMission;
    expect(state.landingAttempts).toHaveLength(1);
    expect(state.landingAttempts[0]).toMatchObject(result);
    expect(state.landingResult).toBeNull();
    expect(state.descentStarted).toBe(false);
    expect(state.landingRewarded).toBe(true);
    expect(state.missionXP).toBe(140);
    expect(app.awardXP).not.toHaveBeenCalled();
  });

  it('leaves the A-grade reward available after retrying a lower-scoring landing', () => {
    const app = mount({ crashed: false, score: 69, grade: 'C', vVel: 1.2, hVel: 0.8, fuel: 30, fuelUnit: 's' });
    app.retry();
    expect(app.store.toolData.moonMission.landingRewarded).not.toBe(true);
    expect(app.store.toolData.moonMission.missionXP).toBe(140);
    expect(app.awardXP).not.toHaveBeenCalled();
  });
});
