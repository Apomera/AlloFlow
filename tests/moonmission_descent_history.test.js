import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission'); P = window.MoonMissionPure; });
const state = extra => ({ alt: 250, vVel: -8, hVel: 2, fuel: 100, thrust: .65, tilt: -.2, x: 8, elapsed: 4, ...extra });
const row = (t, extra = {}) => ({ t, alt: 300 - 10 * t, v: -9 - t, h: 4, fuel: 110 - t, throttle: 0, tilt: 0, x: 4 * t, ...extra });
const rec = (rows = [row(0), row(1), row(2), row(4), row(8)]) => ({ version: 1, samples: rows });
function frozenTree(value) {
  if (!value || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true); Object.values(value).forEach(frozenTree);
}
function view(raw = state(), recording = rec(), context = {}) {
  const host = document.createElement('div'); host.innerHTML = ReactDOMServer.renderToStaticMarkup(P.descentHistoryView(React.createElement));
  host.querySelector('[data-descent-history]').open = true; P.updateDescentHistory(host, raw, recording, context); return host;
}
const val = (host, key) => host.querySelector('[data-descent-history-value="' + key + '"]').textContent;

describe('measured piloted descent history', () => {
  it('requires a measured time, ground position, valid state and bounded recorder', () => {
    const bad = [null, {}, state({ elapsed: undefined }), state({ x: undefined }), state({ vVel: NaN }),
      state({ alt: -1 }), state({ contact: true }), state({ tilt: Infinity })];
    for (const raw of bad) expect(P.descentHistory(raw, rec())).toBeNull();
    for (const recording of [null, {}, { version: 2, samples: [row(0)] }, rec([]), rec(Array.from({ length: 361 }, (_, i) => row(i)))]) {
      expect(P.descentHistory(state(), recording)).toBeNull();
    }
  });

  it('rejects malformed, incomplete, duplicate and decreasing samples before inspection', () => {
    for (const rows of [[row(0), row(1, { v: '2' })], [row(0), row(1, { fuel: -1 })],
      [row(0), row(1, { throttle: 2 })], [row(0), row(1, { tilt: .6 })], [row(0), row(0)],
      [row(1), row(.5)], [row(-1)], [row(0), { t: 1 }]]) expect(P.descentHistory(state(), rec(rows))).toBeNull();
  });

  it('freezes detached history and geometry while preserving source state and recording', () => {
    const s = state(), r = rec(), before = JSON.stringify([s, r]);
    const history = P.descentHistory(s, r); frozenTree(history); frozenTree(P.descentHistoryGeometry(history));
    expect(JSON.stringify([s, r])).toBe(before); expect(history.samples[0]).not.toBe(r.samples[0]);
  });

  it('shows a waiting state for a single initial measurement', () => {
    const h = P.descentHistory(state({ elapsed: 0 }), rec([row(0)]));
    expect(h.samples).toHaveLength(1); expect(h.hasHistory).toBe(false); expect(P.descentHistoryGeometry(h)).toBeNull();
  });

  it('does not fabricate an earlier history from entirely future samples', () => {
    expect(P.descentHistory(state({ elapsed: 1 }), rec([row(2), row(4)]))).toBeNull();
  });

  it('uses only stored samples through inspection and appends the measured endpoint', () => {
    const h = P.descentHistory(state({ elapsed: 3 }), rec());
    expect(h.samples.map(p => p.time)).toEqual([0, 1, 2, 3]); expect(h.storedCount).toBe(3);
    expect(h.current.vertical).toBe(-8); expect(h.current.throttle).toBe(65); expect(h.current.time).toBe(3);
  });

  it('replaces the detached endpoint at the same timestamp with the currently inspected state', () => {
    const r = rec(), before = JSON.stringify(r), h = P.descentHistory(state({ thrust: 0 }), r);
    expect(h.samples.map(p => p.time)).toEqual([0, 1, 2, 4]); expect(h.current.throttle).toBe(0);
    expect(JSON.stringify(r)).toBe(before); expect(r.samples[3].v).toBe(-13);
  });

  it('keeps future values out of scales, curves and measurements', () => {
    const r = rec(), other = rec(r.samples.map(p => p.t > 4 ? { ...p, v: -5000, h: 5000, throttle: 1, tilt: .35 } : p));
    const h = P.descentHistory(state(), r), changed = P.descentHistory(state(), other);
    expect(changed).toEqual(h); expect(P.descentHistoryGeometry(changed)).toEqual(P.descentHistoryGeometry(h));
    other.samples[4].v = NaN; expect(P.descentHistory(state(), other)).toEqual(h);
  });

  it('uses zero engine output for exhausted propellant despite stale throttle', () => {
    const h = P.descentHistory(state({ fuel: 0, thrust: 1 }), rec([row(0, { fuel: 0, throttle: 1 }), row(2)]));
    expect(h.samples[0].throttle).toBe(0); expect(h.current.throttle).toBe(0);
  });

  it.each([-.35, .35])('preserves measured attitude sign at %s radians', tilt => {
    const h = P.descentHistory(state({ tilt }), rec()); expect(h.current.tilt).toBeCloseTo(tilt * 180 / Math.PI, 12);
  });

  it('preserves upward motion and leftward drift rather than converting them to magnitudes', () => {
    const h = P.descentHistory(state({ vVel: 5, hVel: -3 }), rec());
    expect(h.current.vertical).toBe(5); expect(h.current.lateral).toBe(-3);
    expect(h.delta).toEqual({ vertical: 14, lateral: -7 });
  });

  it('computes signed changes from the first measured point without inventing a zero-time point', () => {
    const h = P.descentHistory(state(), rec([row(2, { v: -12, h: -1 })]));
    expect(h.firstTime).toBe(2); expect(h.duration).toBe(2); expect(h.delta).toEqual({ vertical: 4, lateral: 3 });
  });

  it('maps irregular sample spacing to physical time on every chart', () => {
    const h = P.descentHistory(state({ elapsed: 10 }), rec([row(0), row(1), row(10)])), g = P.descentHistoryGeometry(h);
    for (const [name, key] of [['velocity', 'vertical'], ['throttle', 'throttle'], ['tilt', 'tilt']]) {
      expect(g[name].curves[key].points.map(p => p.x)).toEqual([20, 60, 420]);
      expect(g[name].curves[key].points.map(p => p.time)).toEqual([0, 1, 10]);
    }
  });

  it('uses separate physical units, signed velocity bounds and fixed engine/attitude bounds', () => {
    const g = P.descentHistoryGeometry(P.descentHistory(state(), rec()));
    expect(g.velocity.min).toBe(-20); expect(g.velocity.max).toBe(20);
    expect(g.throttle.min).toBe(0); expect(g.throttle.max).toBe(100);
    expect(g.tilt.min).toBe(-25); expect(g.tilt.max).toBe(25);
    expect(g.velocity.curves.vertical.end.y).toBeCloseTo(146, 12);
    expect(g.throttle.curves.throttle.end.y).toBeCloseTo(83, 12);
  });

  it('keeps a five m/s minimum signed velocity range for slow motion', () => {
    const s = state({ vVel: 1, hVel: -.2 }), r = rec([row(0, { v: 0, h: 0 })]);
    const g = P.descentHistoryGeometry(P.descentHistory(s, r)); expect(g.velocity.max).toBe(5);
  });

  it('keeps bounded large-speed samples fully inside their own plots', () => {
    const g = P.descentHistoryGeometry(P.descentHistory(state({ vVel: 5000, hVel: -5000 }), rec()));
    for (const name of ['velocity', 'throttle', 'tilt']) for (const curve of Object.values(g[name].curves)) for (const p of curve.points) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
      expect(p.x).toBeGreaterThanOrEqual(20); expect(p.x).toBeLessThanOrEqual(420);
      expect(p.y).toBeGreaterThanOrEqual(20); expect(p.y).toBeLessThanOrEqual(200);
    }
  });

  it('retains all 360 bounded stored points and one intervening measured endpoint', () => {
    const rows = Array.from({ length: 360 }, (_, i) => row(i, { alt: 300, fuel: 110, v: -9 }));
    const h = P.descentHistory(state({ elapsed: 360 }), rec(rows)); expect(h.samples).toHaveLength(361);
    expect(P.descentHistoryGeometry(h).velocity.curves.vertical.points).toHaveLength(361);
  });

  it('ends at contact with preserved impact velocity and no further time', () => {
    const h = P.descentHistory(state({ alt: 0, contact: true, elapsed: 3, vVel: -30, thrust: 0 }), rec());
    expect(h.contact).toBe(true); expect(h.current.vertical).toBe(-30); expect(h.lastTime).toBe(3);
    const g = P.descentHistoryGeometry(h); expect(g.velocity.curves.vertical.end.x).toBe(420);
    expect(g.timeTicks.map(t => t.value)).toEqual([0, .75, 1.5, 2.25, 3]);
  });

  it('rejects malformed geometry input instead of emitting nonfinite coordinates', () => {
    for (const h of [null, {}, { version: 1, hasHistory: true, samples: [null, null], duration: 2, firstTime: 0, lastTime: 2 }]) {
      expect(P.descentHistoryGeometry(h)).toBeNull();
    }
  });

  it('does no calculations or presentation work when the native disclosure is closed', () => {
    const host = document.createElement('div'); host.innerHTML = ReactDOMServer.renderToStaticMarkup(P.descentHistoryView(React.createElement));
    const before = host.innerHTML;
    P.updateDescentHistory(host, { get elapsed() { throw Error('closed panel read'); } }, rec());
    expect(host.innerHTML).toBe(before);
  });

  it('has distinct native source markers and a 44 px summary target', () => {
    const host = view(); expect(host.querySelectorAll('[data-descent-history]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-descent-history-source-kind]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-descent-history-source-label]')).toHaveLength(1);
    expect(host.querySelector('summary').style.minHeight).toBe('44px');
    expect(host.querySelectorAll('svg text')).toHaveLength(0);
  });

  it('updates measured readings and current markers without mutating state or receipts', () => {
    const s = state(), r = rec(), before = JSON.stringify([s, r]), host = view(s, r, { recorded: true, paused: true });
    const root = host.querySelector('[data-descent-history]'); expect(root.dataset.descentHistoryAvailable).toBe('true');
    expect(root.dataset.descentHistoryTime).toBe('4'); expect(val(host, 'throttle')).toBe('65.0%');
    expect(val(host, 'vertical')).toBe('8.00 m/s down'); expect(val(host, 'deltaVertical')).toBe('1.00 m/s up');
    expect(host.querySelector('[data-descent-history-source-label]').textContent).toContain('Recorded measurements');
    const g = P.descentHistoryGeometry(P.descentHistory(s, r));
    expect(host.querySelector('[data-descent-history-path="vertical"]').getAttribute('points')).toBe(g.velocity.curves.vertical.line);
    expect(host.querySelector('[data-descent-history-marker="tilt"]').getAttribute('d')).toBe(g.tilt.curves.tilt.dot);
    expect(JSON.stringify([s, r])).toBe(before);
  });

  it('uses the recorder-selected time immediately and removes later measurements from charts', () => {
    const host = view(state(), rec());
    P.updateDescentHistory(host, state({ elapsed: 2 }), rec(), { recorded: true });
    expect(host.querySelector('[data-descent-history]').dataset.descentHistoryPoints).toBe('3');
    for (const chart of host.querySelectorAll('[data-descent-history-chart]')) expect(chart.dataset.timeLast).toBe('2');
    expect(host.querySelector('[data-descent-history-ruler="velocity-time-4"]').dataset.value).toBe('2');
  });

  it('clears stale measurements, curves, rulers and ranges when legacy data is unavailable', () => {
    const host = view(); P.updateDescentHistory(host, null, null, { unavailable: 'No recorded state.' });
    expect(host.querySelector('[data-descent-history-content]').hidden).toBe(true);
    expect(host.querySelector('[data-descent-history]').dataset.descentHistoryTime).toBe('');
    expect(val(host, 'throttle')).toBe('—');
    for (const path of host.querySelectorAll('[data-descent-history-path]')) expect(path.getAttribute('points')).toBe('');
    for (const tick of host.querySelectorAll('[data-descent-history-ruler]')) { expect(tick.textContent).toBe('—'); expect(tick.dataset.value).toBeUndefined(); }
    for (const chart of host.querySelectorAll('[data-descent-history-chart]')) expect(chart.dataset.valueMax).toBeUndefined();
  });

  it('returns to a truthful waiting state at the first recorded sample', () => {
    const host = view(); P.updateDescentHistory(host, state({ elapsed: 0 }), rec(), { recorded: true });
    expect(host.querySelector('[data-descent-history-content]').hidden).toBe(true);
    expect(host.querySelector('[data-descent-history-source-label]').textContent).toContain('first recorded sample');
    expect(host.querySelector('[data-descent-history]').dataset.descentHistoryPoints).toBe('1');
  });

  it('ignores requested controls when displaying actual engine and attitude history', () => {
    const s = state(), requested = { ...s, targetThrottle: 1, right: true, left: false };
    expect(P.descentHistory(requested, rec())).toEqual(P.descentHistory(s, rec()));
  });
});
