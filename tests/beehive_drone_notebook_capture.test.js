import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});
const reading = (capture, id) => capture.readings.find(item => item.id === id)?.value;
const runtime = (patch = {}) => ({
  phase: 'flight', pacing: 'live', energy: 62.5, y: 42, maxAlt: 96, distance: 140,
  routeMarkersPassed: 2, reachedDca: false, nearQueens: [{ caught: false }],
  simulationClock: 12.5, courseSeed: 31, difficulty: 'easy', scenario: 'crosswind', routePlan: 'balanced', ...patch
});
const capture = (patch = {}) => BH.bhDroneNotebookCapture({ active: true, paused: false, runtime: runtime(), reserve: 125, ...patch });

describe('Drone Notebook capture source and units', () => {
  it.each([undefined, {}, { active: false }, { active: false, runtime: { phase: 'launch', energy: 100, maxAlt: 80, distance: 0 }, reserve: 105 }])('does not capture dormant runtime defaults as a flight (%j)', (input) => {
    const result = BH.bhDroneNotebookCapture(input);
    expect(result).toMatchObject({ available: false, source: 'setup', state: 'setup', readings: [], text: '' });
    expect(result.context).toContain('Launch a flight');
  });

  it.each([{ paused: true }, { runtime: runtime({ pacing: 'steps' }) }])('identifies paused readings, current altitude, and the difficulty reserve (%j)', (patch) => {
    const result = capture(patch);
    expect(result).toMatchObject({ available: true, source: 'current', state: 'paused' });
    expect(reading(result, 'energy')).toBe('50% of difficulty reserve');
    expect(reading(result, 'altitude')).toBe('42 model ft');
    expect(reading(result, 'peak')).toBeUndefined();
    expect(reading(result, 'distance')).toBe('140 model m');
    expect(reading(result, 'dca')).toBe('Not reached yet');
    expect(reading(result, 'result')).toBeUndefined();
    expect(result.context).toContain('Elapsed 12.5 model s');
    expect(result.text).toContain('Course 31');
    expect(result.text.length).toBeLessThan(1000);
  });

  it('uses this ended runtime before an older saved result and keeps peak separate from final height', () => {
    const result = capture({ paused: true, runtime: runtime({ phase: 'end', energy: 0, y: 11, maxAlt: 122, nearQueens: [{ caught: true }] }), lastRun: { success: false, energyLeft: 98, maxAlt: 999, courseSeed: 777, scenario: 'old-scenario' } });
    expect(result).toMatchObject({ source: 'current', state: 'final' });
    expect(reading(result, 'peak')).toBe('122 model ft');
    expect(reading(result, 'altitude')).toBeUndefined();
    expect(reading(result, 'energy')).toBe('0% of difficulty reserve');
    expect(reading(result, 'result')).toBe('Intercept recorded');
    expect(result.text).not.toMatch(/777|999|98%|old-scenario/);
  });

  it('does not fill missing current readings or conditions from an older saved flight', () => {
    const result = capture({ runtime: { phase: 'flight', energy: NaN, y: Infinity, distance: '10' }, lastRun: { energyLeft: 80, maxAlt: 400, routeMarkers: 9, success: true, reachedDca: true, courseSeed: 777, difficulty: 'hard', scenario: 'clear', routePlan: 'balanced' } });
    expect(result).toMatchObject({ available: true, source: 'current', state: 'live' });
    expect(result.readings.every(item => item.value === 'Not recorded')).toBe(true);
    expect(result.context).toContain('Course Not recorded');
    expect(result.text).not.toMatch(/777|hard|clear|balanced|80%|400/);
  });

  it('uses saved values and saved conditions while the next flight has different settings', () => {
    const result = capture({ active: false, runtime: runtime({ courseSeed: 444, difficulty: 'easy', scenario: 'crosswind', routePlan: 'new-route' }), lastRun: { energyLeft: 25, energyUnits: 'percent-of-difficulty-reserve', maxAlt: 141, distance: 500, routeMarkers: 4, reachedDca: true, success: false, courseSeed: 12, difficulty: 'hard', scenario: 'clear', routePlan: 'thermal-first', timeRemaining: 0 } });
    expect(result).toMatchObject({ source: 'saved', state: 'saved' });
    expect(reading(result, 'energy')).toBe('25% of difficulty reserve');
    expect(reading(result, 'peak')).toBe('141 model ft');
    expect(reading(result, 'result')).toBe('No intercept');
    expect(result.context).toBe('Last saved flight · Time remaining 0 model s · Course 12 · Difficulty hard · Scenario clear · Route thermal-first');
    expect(result.title).toBe('Use the revised route as evidence');
    expect(result.guide).toContain('controllable choice');
    expect(result.text).not.toMatch(/444|easy|crosswind|new-route|Elapsed/);
  });

  it.each([undefined, '', 'model-units'])('does not relabel saved legacy energy as a percentage (%s)', (energyUnits) => {
    const result = capture({ active: false, lastRun: { energyLeft: 17.26, energyUnits } });
    expect(reading(result, 'energy')).toBe('17.3 (units not recorded)');
    expect(result.text).not.toContain('%');
    expect(result.context).toContain('Difficulty Not recorded');
    expect(result.context).not.toContain('easy');
  });

  it('preserves measured zero and distinguishes it from absent, nonnumeric, or nonfinite values', () => {
    const zero = capture({ active: false, lastRun: { energyLeft: 0, maxAlt: 0, distance: 0, routeMarkers: 0, nectar: 9, reachedDca: false, success: false, courseSeed: 0 } });
    expect(zero.available).toBe(true);
    expect(reading(zero, 'energy')).toBe('0 (units not recorded)');
    expect(reading(zero, 'peak')).toBe('0 model ft');
    expect(reading(zero, 'distance')).toBe('0 model m');
    expect(reading(zero, 'markers')).toBe('0');
    expect(reading(zero, 'dca')).toBe('Not reached');
    expect(reading(zero, 'result')).toBe('No intercept');
    expect(zero.context).toContain('Course 0');
    for (const value of [undefined, null, '0', NaN, Infinity]) {
      const missing = capture({ active: false, lastRun: { energyLeft: value, maxAlt: value, distance: value, routeMarkers: value, success: value, reachedDca: value } });
      expect(missing.available).toBe(true);
      expect(missing.readings.every(item => item.value === 'Not recorded')).toBe(true);
    }
  });

  it.each([
    [{ routeMarkersPassed: 0, nectarCollected: 8, pollenCollected: 9 }, '0'],
    [{ routeMarkersPassed: NaN, nectarCollected: 0, pollenCollected: 9 }, '0'],
    [{ routeMarkersPassed: null, nectarCollected: undefined, pollenCollected: 3 }, '3'],
    [{ routeMarkersPassed: undefined, nectarCollected: undefined, pollenCollected: undefined }, 'Not recorded']
  ])('uses the first finite marker counter without replacing zero (%j)', (patch, expected) => {
    expect(reading(capture({ runtime: runtime(patch) }), 'markers')).toBe(expected);
  });

  it.each([0, -1, NaN, Infinity, undefined])('keeps a known raw energy reading when reserve is unavailable (%s)', (reserve) => {
    const result = capture({ reserve });
    expect(reading(result, 'energy')).toBe('62.5 model units (reserve not recorded)');
    expect(result.text).not.toContain('%');
  });

  it('does not infer DCA entry or an outcome from geometry, an end phase, or a separate checkpoint', () => {
    const unknown = capture({ runtime: runtime({ phase: 'end', x: 0, y: 115, z: -600, reachedDca: undefined, reachedQueen: true, nearQueens: undefined }) });
    expect(reading(unknown, 'dca')).toBe('Not recorded');
    expect(reading(unknown, 'result')).toBe('Not recorded');
    const recorded = capture({ runtime: runtime({ phase: 'end', nearQueens: [{ caught: false }], reachedDca: true }) });
    expect(reading(recorded, 'dca')).toBe('Recorded');
    expect(reading(recorded, 'result')).toBe('No intercept');
  });

  it.each([[0, 0, '0'], [1, 2, '3'], [0, undefined, 'Not recorded'], [NaN, 2, 'Not recorded']])('adds conflict counts only when both were recorded (%s, %s)', (obstacleHits, trafficHits, expected) => {
    const result = capture({ active: false, lastRun: { obstacleHits, trafficHits } });
    expect(reading(result, 'conflicts')).toBe(expected);
  });

  it('reads deterministically without mutating the source or adding a synthetic timestamp', () => {
    const flight = runtime({ nearQueens: Object.freeze([Object.freeze({ caught: false })]) });
    const prior = Object.freeze({ success: true, energyLeft: 30 });
    const input = Object.freeze({ active: true, paused: false, runtime: Object.freeze(flight), lastRun: prior, reserve: 125 });
    const before = JSON.stringify(input);
    const first = BH.bhDroneNotebookCapture(input);
    expect(first.state).toBe('live');
    expect(first).toEqual(BH.bhDroneNotebookCapture(input));
    expect(JSON.stringify(input)).toBe(before);
    expect(first.guide).toContain('do not establish a cause');
    expect(first.guide).toContain('markers are not food');
    expect(first.text).not.toMatch(/capturedAt|timestamp/);
  });
});
