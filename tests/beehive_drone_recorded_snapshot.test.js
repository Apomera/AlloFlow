import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
const snapshot = run => BH.bhDroneRecordedSnapshot(run);
const row = (result, id) => result.metrics.concat(result.extras).find(item => item.id === id);
const percent = 'percent-of-difficulty-reserve';

describe('Recorded Drone flight snapshot', () => {
  it('distinguishes the two recorded milestones from measurements', () => {
    const result = snapshot({ reachedDca: true, success: false, maxAlt: 200, distance: 900 });
    expect(result.milestones).toEqual([
      { id: 'dca', label: 'DCA entry', value: 'Reached', status: 'recorded' },
      { id: 'queen', label: 'Queen intercept', value: 'Not intercepted', status: 'not-reached' },
    ]);
    expect(row(result, 'peak')).toMatchObject({ label: 'Peak altitude', value: '200 model ft', known: true });
    expect(row(result, 'peak').detail).toContain('not the height at the finish');
    expect(row(result, 'distance')).toMatchObject({ label: 'Distance traveled', value: '900 model m' });
    expect(row(result, 'distance').detail).toContain('Accumulated horizontal travel');
    expect(result.note).toContain('do not establish DCA entry');
  });

  it('does not infer a missing DCA record from interception, peak height, or distance', () => {
    const result = snapshot({ success: true, maxAlt: 115, distance: 9000 });
    expect(result.milestones[0]).toMatchObject({ value: 'Not recorded', status: 'unknown' });
    expect(result.milestones[1]).toMatchObject({ value: 'Intercepted', status: 'recorded' });
  });

  it('retains explicit negative milestone records even if other fields look successful', () => {
    const result = snapshot({ reachedDca: false, success: false, maxAlt: 115, distance: 600, phase: 'mating' });
    expect(result.milestones.every(item => item.status === 'not-reached')).toBe(true);
  });

  it('requires strict boolean outcome flags', () => {
    for (const value of [undefined, null, 0, 1, '', 'true', 'false', [], {}]) {
      expect(snapshot({ reachedDca: value, success: value }).milestones.every(item => item.status === 'unknown' && item.value === 'Not recorded')).toBe(true);
    }
  });

  it('retains actual zeros for all measurements and legacy-sensitive marker fields', () => {
    const result = snapshot({ score: 0, maxAlt: 0, distance: 0, energyLeft: 0, energyUnits: percent,
      routeMarkers: 0, routeMarkerGoal: 0, nectar: 99, nectarGoal: 100, facts: 0, obstacleHits: 0, trafficHits: 0 });
    expect(row(result, 'peak').value).toBe('0 model ft');
    expect(row(result, 'distance').value).toBe('0 model m');
    expect(row(result, 'energy')).toMatchObject({ value: '0%', known: true, meterPct: 0 });
    expect(row(result, 'markers')).toMatchObject({ value: '0 / 0', known: true });
    for (const id of ['score', 'facts', 'conflicts']) expect(row(result, id)).toMatchObject({ value: '0', known: true });
  });

  it('displays percentages only with the exact saved energy unit marker', () => {
    const energy = row(snapshot({ energyLeft: 42.26, energyUnits: percent }), 'energy');
    expect(energy).toMatchObject({ value: '42.3%', meterPct: 42.26, known: true });
    expect(energy.detail).toContain('full energy reserve');
  });

  it.each([undefined, null, '', 'percent', 'model-units', 'Percent-of-difficulty-reserve'])('keeps unrecognized energy units explicit (%s)', energyUnits => {
    const energy = row(snapshot({ energyLeft: 42.26, energyUnits }), 'energy');
    expect(energy).toMatchObject({ value: '42.3', meterPct: null, known: true });
    expect(energy.detail).toContain('units were not recorded');
    expect(energy.detail).toContain('cannot be read as a percentage');
    expect(energy.value).not.toContain('%');
  });

  it('does not create a percentage meter by clamping an out-of-range saved value', () => {
    for (const energyLeft of [-1, 100.01, 180]) {
      const energy = row(snapshot({ energyLeft, energyUnits: percent }), 'energy');
      expect(energy.known).toBe(true);
      expect(energy.value).toContain('%');
      expect(energy.meterPct).toBeNull();
    }
    expect(row(snapshot({ energyLeft: 100, energyUnits: percent }), 'energy').meterPct).toBe(100);
  });

  it('rejects missing, nonfinite, and nonnumeric values without displaying a zero', () => {
    for (const value of [undefined, null, NaN, Infinity, -Infinity, '', '0', false, [], {}]) {
      const result = snapshot({ maxAlt: value, distance: value, energyLeft: value, energyUnits: percent, score: value, facts: value, obstacleHits: value, trafficHits: value });
      for (const id of ['peak', 'distance', 'energy', 'score', 'facts', 'conflicts']) expect(row(result, id)).toMatchObject({ value: 'Not recorded', known: false });
      expect(row(result, 'energy').meterPct).toBeNull();
    }
  });

  it('falls back to legacy marker count and goal independently', () => {
    expect(row(snapshot({ routeMarkers: 0, nectar: 9, nectarGoal: 10 }), 'markers')).toMatchObject({ value: '0 / 10', known: true });
    expect(row(snapshot({ nectar: 9, routeMarkerGoal: 0, nectarGoal: 10 }), 'markers')).toMatchObject({ value: '9 / 0', known: true });
    expect(row(snapshot({ routeMarkers: '9', nectar: 3, routeMarkerGoal: NaN, nectarGoal: 8 }), 'markers').value).toBe('3 / 8');
  });

  it('shows which half of a marker record is missing', () => {
    expect(row(snapshot({ routeMarkers: 3 }), 'markers')).toMatchObject({ value: '3 / Not recorded', known: false });
    expect(row(snapshot({ routeMarkerGoal: 8 }), 'markers')).toMatchObject({ value: 'Not recorded / 8', known: false });
    expect(row(snapshot({}), 'markers')).toMatchObject({ value: 'Not recorded / Not recorded', known: false });
  });

  it('separates obstacle and drone conflicts while combining only complete counts', () => {
    expect(row(snapshot({ obstacleHits: 2, trafficHits: 3 }), 'conflicts')).toMatchObject({ value: '5', known: true, detail: 'Obstacle conflicts: 2. Drone conflicts: 3. Combined recorded total.' });
    expect(row(snapshot({ obstacleHits: 0 }), 'conflicts')).toMatchObject({ value: 'Not recorded', known: false, detail: 'Obstacle conflicts: 0. Drone conflicts: Not recorded. A combined total requires both counts.' });
    expect(row(snapshot({ trafficHits: 0 }), 'conflicts').detail).toContain('Obstacle conflicts: Not recorded. Drone conflicts: 0.');
  });

  it('does not fabricate a finite conflict total if two finite values overflow', () => {
    const conflicts = row(snapshot({ obstacleHits: Number.MAX_VALUE, trafficHits: Number.MAX_VALUE }), 'conflicts');
    expect(conflicts).toMatchObject({ value: 'Not recorded', known: false });
    expect(conflicts.detail).not.toMatch(/Infinity|NaN/);
  });

  it('handles absent or malformed records with all readings unknown', () => {
    for (const run of [undefined, null, false, 0, '', 'run', []]) {
      const result = snapshot(run);
      expect(result.milestones.every(item => item.status === 'unknown')).toBe(true);
      expect(result.metrics.concat(result.extras).every(item => item.known === false)).toBe(true);
    }
  });

  it('keeps input records immutable and outputs independent', () => {
    const run = Object.freeze({ reachedDca: true, success: true, energyLeft: 60, energyUnits: percent, maxAlt: 120, distance: 700, facts: 2 });
    const first = snapshot(run), second = snapshot(run);
    expect(first).toEqual(second);
    first.milestones[0].value = 'changed'; first.metrics[0].value = 'changed'; first.extras[0].value = 'changed';
    expect(snapshot(run)).toEqual(second);
    expect(run.maxAlt).toBe(120);
  });
});
