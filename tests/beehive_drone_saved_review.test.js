import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const source = fs.readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');
const coachStart = source.indexOf('        function droneRecordedValue(');
const coachEnd = source.indexOf('        var droneDebrief =', coachStart);
const { droneRecordedValue, droneDebriefCoach } = new Function('DRONE_FLIGHT_PARAMS', 'DRONE_ROUTE_PLANS',
  source.slice(coachStart, coachEnd) + '\nreturn { droneRecordedValue, droneDebriefCoach };')(
  { dcaMinFt: 100, dcaMaxFt: 130, dcaDistanceM: 600 },
  { balanced: { label: 'Balanced' }, 'thermal-first': { label: 'Updraft-first' }, 'boost-first': { label: 'Marker-first' } });

describe('Recorded Drone coaching', () => {
  it('preserves actual zero and rejects nonnumeric substitutes', () => {
    expect(droneRecordedValue(0, '%')).toBe('0%');
    for (const value of [undefined, null, '0', NaN, Infinity]) expect(droneRecordedValue(value, '%')).toBe('Not recorded');
  });

  it('does not diagnose energy depletion or failure from missing readings', () => {
    const run = Object.freeze({ maxAlt: 108 });
    const result = droneDebriefCoach(run);
    expect(result.id).toBe('incomplete-evidence');
    expect(result.evidence.find(item => item.label === 'Energy reserve').value).toBe('Not recorded');
    expect(result.evidence.find(item => item.label === 'Hazard conflicts').value).toBe('Not recorded');
    expect(result.consequence).toContain('outcome was not recorded');
    expect(droneDebriefCoach({ energyLeft: 0 }).id).toBe('incomplete-evidence');
  });

  it('uses a recorded zero reserve to coach a recorded unsuccessful flight', () => {
    expect(droneDebriefCoach({ success: false, energyLeft: 0 }).id).toBe('energy-budget');
  });

  it('keeps a recorded intercept successful without inventing separation measurements', () => {
    const result = droneDebriefCoach({ success: true, energyLeft: 50 });
    expect(result.id).toBe('intercept-refine');
    expect(result.summary).toContain('readings are unavailable');
    expect(result.summary).not.toContain('full separation');
    expect(result.consequence).toContain('dies immediately afterward');
  });

  it('explains a thin final-approach reserve without suggesting a mating drone returns home', () => {
    const result = droneDebriefCoach({ success: true, energyLeft: 4, energyUnits: 'percent-of-difficulty-reserve', obstacleHits: 0, trafficHits: 0 });
    expect(result.summary).toContain('thin margin for the final approach');
    expect(result.summary).not.toContain('fly home');
    expect(result.consequence).toContain('dies immediately afterward');
  });

  it('respects actual zero marker totals over older alternate totals', () => {
    expect(droneDebriefCoach({ success: false, energyLeft: 50, reachedDca: true, obstacleHits: 0, trafficHits: 0,
      routeMarkers: 0, routeMarkerGoal: 0, nectar: 10, nectarGoal: 20 }).id).toBe('queen-tracking');
  });

  it('does not apply percentage thresholds to a positive legacy energy value', () => {
    for (const energyUnits of [undefined, '', 'model-units']) {
      const failed = droneDebriefCoach({ success: false, energyLeft: 4, energyUnits });
      expect(failed.id).toBe('incomplete-evidence');
      expect(failed.evidence.find(item => item.label === 'Energy reserve')).toMatchObject({ value: '4 (units not recorded)', state: 'unknown' });
      const success = droneDebriefCoach({ success: true, energyLeft: 4, energyUnits, obstacleHits: 0, trafficHits: 0 });
      expect(success.id).toBe('intercept-refine');
      expect(success.summary).not.toMatch(/4%|thin margin/);
      expect(droneDebriefCoach({ success: true, energyLeft: 60, energyUnits, obstacleHits: 0, trafficHits: 0 }).id).toBe('intercept-refine');
    }
  });

  it('uses the exact percent marker for low and healthy reserve comparisons', () => {
    const energyUnits = 'percent-of-difficulty-reserve';
    const low = droneDebriefCoach({ success: false, energyLeft: 4, energyUnits });
    expect(low.id).toBe('energy-budget');
    expect(low.title).toBe('Review the low final reserve');
    expect(low.summary).toContain('low recorded percentage');
    expect(droneDebriefCoach({ success: true, energyLeft: 60, energyUnits, obstacleHits: 0, trafficHits: 0 }).id).toBe('repeatable-success');
  });

  it('reports a raw zero without inventing percentage units or a causal diagnosis', () => {
    const result = droneDebriefCoach({ success: false, energyLeft: 0 });
    expect(result.id).toBe('energy-budget');
    expect(result.summary).toContain('zero recorded energy');
    expect(result.summary).toContain('before attributing');
    expect(result.evidence[0]).toMatchObject({ value: '0 (units not recorded)', state: 'unknown' });
  });

  it('does not mistake peak altitude and total travel for a measured DCA approach', () => {
    const result = droneDebriefCoach({ success: false, reachedDca: false, maxAlt: 120, distance: 800 });
    expect(result.id).toBe('range-gate');
    expect(result.summary).toContain('do not show where');
    expect(result.summary).not.toContain('forward progress did not reach');
    expect(result.evidence.find(item => item.label === 'DCA gate').value).toBe('Not reached');
  });
});

describe('Saved Drone review at preflight', () => {
  let config, host, root, latest, setLatest;

  async function mount(drone) {
    const Component = () => {
      const [toolData, setToolData] = React.useState({
        otherTool: { value: 'retained' },
        beehive: { viewMode: 'drone', day: 0, soundOn: false, drone },
      });
      latest = toolData;
      setLatest = setToolData;
      return config.render(makeCtx({ toolData, setToolData }));
    };
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); await Promise.resolve(); });
  }

  function panel() { return host.querySelector('[data-drone-saved-review-panel]'); }
  function moment() { return panel().querySelector('[data-flight-replay-moment]').textContent; }
  async function bookmark(id) {
    const button = panel().querySelector('[data-flight-replay-bookmark="' + id + '"]');
    expect(button).toBeTruthy();
    await act(async () => { button.click(); await Promise.resolve(); });
  }

  beforeEach(() => {
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); vi.restoreAllMocks(); });

  it('reveals persisted flight decisions and replay after interrupted-session recovery without launching', async () => {
    const run = { success: false, score: 0, courseSeed: 0,
      telemetry: [{ t: 0, altitude: 10, energy: 80, wind: 0, phase: 'launch' }, { t: 4, altitude: 108 }, { t: 10, altitude: 80, energy: 0, wind: 2, phase: 'end' }],
      decisionLog: [{ turn: 1, action: 'Climb', altitudeBefore: 10, altitude: 108 }] };
    await mount({ active: true, paused: true, attempts: 3, successes: 1, highScore: 275, lastRun: run });
    const before = structuredClone(latest);
    const review = host.querySelector('[data-drone-saved-review]');
    expect(review).toBeTruthy();
    expect(review.open).toBe(false);
    await act(async () => { host.querySelector('[data-drone-saved-review-toggle]').click(); await Promise.resolve(); });
    expect(review.open).toBe(true);
    expect(latest).toEqual(before);
    expect(panel().textContent).toContain('Course 0');
    expect(panel().textContent).toContain('Your flight decisions');
    expect(panel().textContent).not.toContain('undefined');
    expect(panel().textContent).not.toContain('NaN');
    expect(host.querySelector('[data-beehive-drone-canvas]')).toBeNull();
    await bookmark('peak-altitude');
    expect(moment()).toContain('Energy Not recorded');
    expect(moment()).toContain('Wind Not recorded');
    expect(moment()).toContain('Phase not recorded');
    expect(moment()).toContain('Energy change not recorded');
    expect(moment()).not.toContain('Energy warning');
    expect(moment()).not.toContain('Taking off');
    expect(panel().querySelector('[data-flight-replay-range]').getAttribute('aria-valuetext')).toContain('energy Not recorded');
    expect(latest).toEqual({ ...before, beehive: { ...before.beehive, drone: { ...before.beehive.drone, replayIndex: 1 } } });
  });

  it('draws gaps for missing readings and places irregular samples by recorded time', async () => {
    await mount({ lastRun: { energyUnits: 'percent-of-difficulty-reserve', telemetry: [{ t: 0, altitude: 10, energy: 80 }, { t: 2, altitude: 100 }, { t: 10, altitude: 80, energy: 0 }] } });
    const energyTraces = panel().querySelectorAll('[data-flight-replay-trace="energy"]');
    expect(energyTraces).toHaveLength(2);
    expect([...energyTraces].every(node => node.tagName.toLowerCase() === 'circle')).toBe(true);
    expect(panel().querySelector('[data-flight-replay-trace="wind"]')).toBeNull();
    const altitudePoints = panel().querySelector('polyline[data-flight-replay-trace="altitude"]').getAttribute('points').split(' ').map(point => Number(point.split(',')[0]));
    expect((altitudePoints[1] - altitudePoints[0]) / (altitudePoints[2] - altitudePoints[0])).toBeCloseTo(0.2, 3);
    await bookmark('finish');
    expect(moment()).toContain('Energy 0%');
    expect(moment()).toContain('Energy change not recorded');
  });

  it('keeps legacy altitude-only records honest and avoids invented launch or end bookmarks', async () => {
    await mount({ lastRun: { telemetry: [{ t: 4, altitude: 108 }] } });
    expect(moment()).toContain('108 model ft');
    expect(moment()).toContain('Energy Not recorded');
    expect(moment()).toContain('Wind Not recorded');
    expect(panel().querySelector('[data-flight-replay-bookmark="launch"]').textContent).toBe('First sample');
    expect(panel().querySelector('[data-drone-saved-coach="incomplete-evidence"]')).toBeTruthy();
    expect(panel().querySelector('[data-flight-replay-trace="energy"]')).toBeNull();
    expect(panel().textContent).not.toContain('0%');
    const handoff = host.querySelector('[data-beehive-notebook-handoff]');
    expect(panel().querySelector('[data-drone-saved-coach="incomplete-evidence"]').textContent).toContain('mating outcome was not recorded');
    const result = handoff.querySelector('[data-capture-reading="result"]');
    expect(result.querySelector('dt').textContent).toBe('Result');
    expect(result.querySelector('[data-capture-value]').textContent).toBe('Not recorded');
    expect(handoff.querySelector('[data-capture-text]').textContent).toContain('Result: Not recorded');
    expect(latest.beehive.drone.lastRun).not.toHaveProperty('success');
    expect(handoff.textContent).toContain('Not recorded');
    expect(handoff.textContent).not.toContain('0%');
  });

  it('calculates recorded consecutive energy changes and retains a measured zero wind', async () => {
    await mount({ lastRun: { energyUnits: 'percent-of-difficulty-reserve', telemetry: [{ t: 0, altitude: 10, energy: 20, wind: 0 }, { t: 2, altitude: 90, energy: 0, wind: 0, phase: 'end' }] } });
    await bookmark('peak-altitude');
    expect(moment()).toContain('Energy 0%');
    expect(moment()).toContain('Energy change: 20 percentage points lower');
    expect(moment()).toContain('Wind 0 m/s');
    expect(moment()).toContain('Energy warning');
  });

  it('marks sample order when saved timestamps are unordered instead of inventing elapsed spacing', async () => {
    await mount({ lastRun: { telemetry: [{ t: 8, altitude: 40 }, { t: 2, altitude: 60 }] } });
    expect(panel().textContent).toContain('timestamps unavailable or unordered');
    expect(panel().querySelector('svg desc').textContent).toContain('sample order');
  });

  it('makes a completed flight hydrated after mount reviewable while retaining unrelated data', async () => {
    await mount({ active: false, attempts: 1 });
    expect(panel()).toBeNull();
    await act(async () => {
      setLatest(prev => ({ ...prev, beehive: { ...prev.beehive, drone: { ...prev.beehive.drone, active: true, lastRun: { score: 50, success: true, telemetry: [{ t: 0, altitude: 10 }] } } } }));
      await Promise.resolve(); await Promise.resolve();
    });
    expect(panel()).toBeTruthy();
    expect(latest.beehive.drone.active).toBe(false);
    expect(latest.beehive.drone.attempts).toBe(1);
    expect(latest.otherTool).toEqual({ value: 'retained' });
    expect(panel().textContent).toContain('Queen intercepted');
  });

  it('preserves concurrent Drone changes when a retained replay control is used', async () => {
    await mount({ attempts: 2, lastRun: { telemetry: [{ t: 0, altitude: 10 }, { t: 2, altitude: 90 }] } });
    const retainedBookmark = panel().querySelector('[data-flight-replay-bookmark="peak-altitude"]');
    await act(async () => {
      setLatest(prev => ({ ...prev, beehive: { ...prev.beehive, drone: { ...prev.beehive.drone, attempts: 3, cameraMode: 'chase' } } }));
      retainedBookmark.click();
      await Promise.resolve();
    });
    expect(latest.beehive.drone).toMatchObject({ attempts: 3, cameraMode: 'chase', replayIndex: 1 });
  });

  it('safely bounds a fractional replay preference to a recorded sample', async () => {
    await mount({ replayIndex: 0.5, lastRun: { telemetry: [{ t: 0, altitude: 10 }, { t: 2, altitude: 90 }] } });
    expect(moment()).toContain('Altitude 10 model ft');
    expect(panel().querySelector('[data-flight-replay-range]').value).toBe('0');
  });
});
