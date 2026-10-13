import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let FS, host, root, tool, latest;

const row = (patch = {}) => ({ airspeed: 130, altitude: 5000, aoa: 8, ...patch });
const evidence = () => [row(), row({ aoa: 20 }), row({ airspeed: 80, aoa: 20 })];
const completeRecord = (patch = {}) => ({
  phase: 'review', prediction: 'speed', hypothesis: 'I expected speed alone to determine a stall.',
  observations: evidence(), explanation: 'Trials 1 and 2 changed angle alone; trials 2 and 3 held angle fixed.',
  transferChoice: 'stall', transferAnswer: 'stall', transferAttempts: 2,
  completedAt: '2026-10-10T12:00:00.000Z', ...patch,
});
const record = () => latest.stallInvestigation;
const panel = () => host.querySelector('section[aria-label="Compare recorded trials"]');
const firstSelect = () => host.querySelector('#stall-compare-first');
const secondSelect = () => host.querySelector('#stall-compare-second');

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  delete window.__RR_TEST_EXPORTS__;
});

async function mount(investigation = {}, extra = {}) {
  if (root) await act(async () => { root.unmount(); });
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'stallHunt', stallInvestigation: investigation, ...extra } });
    latest = data.flightSim;
    return tool.render(makeCtx({
      toolData: data, setToolData: updateData,
      update: (toolId, key, value) => updateData(previous => ({ ...previous, [toolId]: { ...previous[toolId], [key]: value } })),
      updateMulti: (toolId, patch) => updateData(previous => ({ ...previous, [toolId]: { ...previous[toolId], ...patch } })),
    }));
  }
  await act(async () => { root.render(React.createElement(App)); });
}

function button(text) {
  const match = [...host.querySelectorAll('button')].find(element => element.textContent === text);
  expect(match, `Button: ${text}`).toBeTruthy();
  return match;
}
async function click(text) { await act(async () => { button(text).click(); }); }
async function choose(element, value) {
  expect(element).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(element, String(value));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
function withoutControls(investigation) {
  const saved = JSON.parse(JSON.stringify(investigation));
  delete saved.airspeed; delete saved.altitude; delete saved.aoa;
  return saved;
}

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  root = null;
  if (host) host.remove();
  host = null;
  delete window.__testHooks;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SkySchool recorded-trial comparison calculations', () => {
  it('identifies a normal/stall angle comparison using model results instead of spoofed saved results', () => {
    const rows = [row({ state: 'stall', lift: 1 }), row({ aoa: 20, state: 'normal', lift: 999999 })];
    const before = JSON.stringify(rows);
    const comparison = FS.stallTrialComparison(rows, 0, 1);
    expect(comparison).toMatchObject({
      firstIndex: 0, secondIndex: 1, changed: ['aoa'], held: ['airspeed', 'altitude'],
      kind: 'angle', qualifies: 'angle', angleDelta: 12, speedDelta: 0, altitudeDelta: 0,
    });
    expect(comparison.first).toEqual(FS.sampleStallInvestigation(130, 5000, 8));
    expect(comparison.second).toEqual(FS.sampleStallInvestigation(130, 5000, 20));
    expect(comparison.first.state).toBe('normal');
    expect(comparison.second.state).toBe('stall');
    expect(comparison.liftDelta).toBe(comparison.second.lift - comparison.first.lift);
    expect(JSON.stringify(rows)).toBe(before);
  });

  it('keeps comparison category separate from whether that pair supplies the required evidence', () => {
    const cases = [
      { a: row(), b: row({ aoa: 10 }), kind: 'angle', qualifies: null },
      { a: row({ aoa: 14 }), b: row({ aoa: 20 }), kind: 'angle', qualifies: null },
      { a: row(), b: row({ airspeed: 100 }), kind: 'speed', qualifies: 'speed' },
      { a: row(), b: row({ airspeed: 105 }), kind: 'speed', qualifies: null },
      { a: row({ aoa: 20 }), b: row({ aoa: 20, airspeed: 80 }), kind: 'speed', qualifies: 'speed' },
      { a: row(), b: row({ altitude: 10000 }), kind: 'altitude', qualifies: null },
      { a: row(), b: row({ airspeed: 80, aoa: 20 }), kind: 'mixed', qualifies: null },
      { a: row(), b: row({ airspeed: 80, altitude: 10000, aoa: 20 }), kind: 'mixed', qualifies: null },
    ];
    for (const { a, b, kind, qualifies } of cases) {
      expect(FS.stallTrialComparison([a, b], 0, 1)).toMatchObject({ kind, qualifies });
    }
  });

  it('distinguishes one recorded trial selected twice from repeated identical conditions', () => {
    const rows = [row(), row()];
    expect(FS.stallTrialComparison(rows, 0, 0)).toMatchObject({
      kind: 'same_trial', qualifies: null, changed: [], held: ['airspeed', 'altitude', 'aoa'], liftDelta: 0,
    });
    expect(FS.stallTrialComparison(rows, 0, 1)).toMatchObject({
      kind: 'repeat', qualifies: null, changed: [], held: ['airspeed', 'altitude', 'aoa'], liftDelta: 0,
    });
  });

  it('retains signed lift differences at negative angles and reverses all deltas when A and B swap', () => {
    const rows = [row({ airspeed: 80, aoa: -5 }), row({ airspeed: 130, aoa: -5 })];
    const forward = FS.stallTrialComparison(rows, 0, 1);
    const backward = FS.stallTrialComparison(rows, 1, 0);
    expect(forward).toMatchObject({ kind: 'speed', qualifies: 'speed', speedDelta: 50 });
    expect(forward.first.lift).toBeLessThan(0);
    expect(forward.second.lift).toBeLessThan(forward.first.lift);
    expect(forward.liftDelta).toBeLessThan(0);
    for (const key of ['liftDelta', 'speedDelta', 'angleDelta', 'altitudeDelta']) {
      expect(backward[key]).toBeCloseTo(-forward[key], 8);
    }
  });

  it('rejects missing, out-of-range, noninteger indices and invalid selected conditions without substituting evidence', () => {
    for (const indices of [[-1, 1], [0, 2], [0.5, 1], [0, NaN], ['0', 1], [0, null]]) {
      expect(FS.stallTrialComparison(evidence().slice(0, 2), ...indices)).toBeNull();
    }
    for (const invalid of [null, {}, row({ airspeed: '130' }), row({ airspeed: 39 }), row({ airspeed: 251 }),
      row({ altitude: -1 }), row({ altitude: 20001 }), row({ aoa: -6 }), row({ aoa: 26 }), row({ aoa: Infinity })]) {
      expect(FS.stallTrialComparison([row(), invalid], 0, 1)).toBeNull();
    }
    expect(FS.stallTrialComparison(null, 0, 1)).toBeNull();
    expect(FS.stallTrialComparison([], 0, 1)).toBeNull();
  });

  it('prepares an opposite flow-state angle trial while holding speed and altitude fixed', () => {
    for (const angle of [-5, 8, 11.5, 12, 14, 15, 20, 25]) {
      const baseline = Object.freeze(row({ airspeed: 175, altitude: 12000, aoa: angle }));
      const prepared = FS.prepareStallComparisonTrial(baseline, 'angle');
      const nextAngle = FS.sampleStallInvestigation(175, 12000, angle).state === 'normal' ? 20 : 8;
      expect(prepared).toEqual(FS.sampleStallInvestigation(175, 12000, nextAngle));
      expect(baseline.aoa).toBe(angle);
    }
  });

  it('prepares a 50-knot speed change throughout the allowed range and preserves signed model lift', () => {
    for (const speed of [40, 80, 89.5, 90, 100, 200, 250]) {
      const baseline = Object.freeze(row({ airspeed: speed, altitude: 8000, aoa: -5 }));
      const prepared = FS.prepareStallComparisonTrial(baseline, 'speed');
      const nextSpeed = speed >= 90 ? speed - 50 : speed + 50;
      expect(prepared).toEqual(FS.sampleStallInvestigation(nextSpeed, 8000, -5));
      expect(Math.abs(prepared.airspeed - baseline.airspeed)).toBe(50);
      expect(prepared.airspeed).toBeGreaterThanOrEqual(40);
      expect(prepared.airspeed).toBeLessThanOrEqual(250);
      expect(prepared.lift).toBeLessThan(0);
      expect(baseline.airspeed).toBe(speed);
    }
  });

  it('cannot prepare an invalid condition or an unsupported variable', () => {
    for (const baseline of [null, {}, row({ airspeed: NaN }), row({ airspeed: '130' }), row({ altitude: 21000 }), row({ aoa: 26 })]) {
      expect(FS.prepareStallComparisonTrial(baseline, 'angle')).toBeNull();
      expect(FS.prepareStallComparisonTrial(baseline, 'speed')).toBeNull();
    }
    for (const kind of [undefined, null, 'altitude', 'aoa', 'mixed']) {
      expect(FS.prepareStallComparisonTrial(row(), kind)).toBeNull();
    }
  });
});

describe('SkySchool recorded-trial comparison interaction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStemLab();
    window.__testHooks = {};
    tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  it('shows an honest empty comparison and makes the first recorded row available as a baseline', async () => {
    await mount({ phase: 'experiment', prediction: 'angle' });
    expect(panel()).toBeTruthy();
    expect(firstSelect()).toBeNull();
    expect(secondSelect()).toBeNull();
    await click('Record observation');
    expect(firstSelect().value).toBe('0');
    expect(record().observations).toHaveLength(1);
    await click('Prepare angle trial from A');
    expect(record()).toMatchObject({ airspeed: 130, altitude: 5000, aoa: 20 });
    expect(record().observations).toHaveLength(1);
  });

  it('starts with a qualifying angle pair and provides the comparison in Trials, Explanation, and Review', async () => {
    for (const phase of ['experiment', 'explain', 'review']) {
      await mount(completeRecord({ phase }));
      expect(firstSelect().value).toBe('0');
      expect(secondSelect().value).toBe('1');
      expect(panel().textContent).toContain('Changed:');
      expect(panel().textContent).toContain('Held fixed:');
      expect(panel().textContent).toContain('Trial B minus Trial A');
    }
  });

  it('uses the newest two rows when no qualifying angle pair exists', async () => {
    await mount({ phase: 'experiment', prediction: 'angle', observations: [row(), row({ airspeed: 100 }), row({ airspeed: 70 })] });
    expect(firstSelect().value).toBe('1');
    expect(secondSelect().value).toBe('2');
  });

  it('changes only selection state while preserving writing, archives, completion, and keyboard focus', async () => {
    await mount(completeRecord({ attempts: [completeRecord({ hypothesis: 'An earlier idea' })] }), { unrelatedSetting: 'keep' });
    const before = JSON.parse(JSON.stringify(record()));
    const select = secondSelect();
    select.focus();
    await choose(select, 2);
    expect(document.activeElement).toBe(select);
    expect(panel().textContent).toContain('More than one variable changed');
    expect(latest.stallCompareSecond).toBe(2);
    expect(record()).toEqual(before);
    expect(latest.unrelatedSetting).toBe('keep');
    firstSelect().focus();
    await choose(firstSelect(), 1);
    expect(document.activeElement).toBe(firstSelect());
    expect(latest.stallCompareFirst).toBe(1);
    expect(record()).toEqual(before);
  });

  it('does not mistake selecting the same row twice for new controlled evidence', async () => {
    await mount({ phase: 'experiment', prediction: 'angle', observations: [row(), row({ aoa: 20 })] });
    await choose(secondSelect(), 0);
    expect(panel().textContent).toContain('Same recorded trial');
    expect(button('Continue to explanation').disabled).toBe(true);
    expect(record().observations).toHaveLength(2);
  });

  it('restores selection after remount and phase changes without replacing the submitted investigation', async () => {
    await mount(completeRecord());
    await choose(firstSelect(), 1);
    await choose(secondSelect(), 2);
    const saved = JSON.parse(JSON.stringify(latest));
    await mount(saved.stallInvestigation, saved);
    expect(firstSelect().value).toBe('1');
    expect(secondSelect().value).toBe('2');
    expect(record()).toEqual(saved.stallInvestigation);
    await click('Review trials');
    expect(firstSelect().value).toBe('1');
    expect(secondSelect().value).toBe('2');
    await click('Continue to explanation');
    expect(firstSelect().value).toBe('1');
    expect(secondSelect().value).toBe('2');
    expect(record().completedAt).toBe(saved.stallInvestigation.completedAt);
  });

  it('prepares a trial from A rather than the current sliders without recording or invalidating completion', async () => {
    await mount(completeRecord({ phase: 'experiment', airspeed: 200, altitude: 10000, aoa: 14 }), { stallCompareFirst: 0, stallCompareSecond: 1 });
    const submitted = FS.stallInvestigationRecord(record());
    await click('Prepare angle trial from A');
    expect(record()).toMatchObject({ airspeed: 130, altitude: 5000, aoa: 20, completedAt: submitted.completedAt });
    expect(withoutControls(record())).toEqual(withoutControls(submitted));
    await choose(firstSelect(), 2);
    await click('Prepare speed trial from A');
    expect(record()).toMatchObject({ airspeed: 130, altitude: 5000, aoa: 20, completedAt: submitted.completedAt });
    expect(withoutControls(record())).toEqual(withoutControls(submitted));
    await click('Record observation');
    expect(record().observations).toHaveLength(4);
    expect(record().completedAt).toBeNull();
    expect(latest.stallCompareFirst).toBe(2);
    expect(latest.stallCompareSecond).toBe(3);
  });

  it('keeps the speed-only shortcut useful for custom conditions and the angle shortcut clear of the boundary band', async () => {
    await mount({ phase: 'experiment', prediction: 'angle', airspeed: 100, altitude: 10000, aoa: 14 });
    await click('Change speed only');
    expect(record()).toMatchObject({ airspeed: 50, altitude: 10000, aoa: 14 });
    await click('Change angle only');
    expect(record()).toMatchObject({ airspeed: 50, altitude: 10000, aoa: 8 });
    expect(record().observations).toHaveLength(0);
  });

  it('resets selection to the newest actual pair after dropping the oldest of 24 retained rows', async () => {
    const observations = [...evidence(), ...Array.from({ length: 21 }, () => row())];
    await mount({ phase: 'experiment', prediction: 'angle', observations, airspeed: 130, altitude: 5000, aoa: 20 }, { stallCompareFirst: 0, stallCompareSecond: 1 });
    await click('Record observation');
    expect(record().observations).toHaveLength(24);
    expect(record().observations[22]).toMatchObject({ airspeed: 130, altitude: 5000, aoa: 8 });
    expect(record().observations[23]).toMatchObject({ airspeed: 130, altitude: 5000, aoa: 20 });
    expect(latest.stallCompareFirst).toBe(22);
    expect(latest.stallCompareSecond).toBe(23);
    expect(firstSelect().value).toBe('22');
    expect(secondSelect().value).toBe('23');
  });

  it('clears selections for a new investigation and retains the archived evidence and explanation', async () => {
    await mount(completeRecord(), { stallCompareFirst: 1, stallCompareSecond: 2 });
    await click('Start a new investigation');
    expect(latest.stallCompareFirst).toBeNull();
    expect(latest.stallCompareSecond).toBeNull();
    expect(record()).toMatchObject({ phase: 'predict', observations: [], completedAt: null });
    expect(record().attempts).toHaveLength(1);
    expect(record().attempts[0].observations).toHaveLength(3);
    expect(record().attempts[0].explanation).toContain('Trials 1 and 2');
  });
});
