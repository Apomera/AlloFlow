import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
const maneuver = (patch = {}) => ({ turn: 3, action: 'Powered climb', seconds: 1, altitudeBefore: 40, altitude: 46, energyBefore: 80, energy: 78, rangeBefore: 210, range: 198, targetBefore: 'DCA', target: 'DCA', ...patch });
const evidence = patch => BH.bhDroneManeuverEvidence(maneuver(patch));
const row = (result, id) => result.rows.find(item => item.id === id);

describe('Drone recorded maneuver evidence', () => {
  it('rejects absent, nonrecord, empty, and unrelated values', () => {
    for (const entry of [undefined, null, false, 3, 'record', [], [{}], {}, { phase: 'flight' }]) expect(BH.bhDroneManeuverEvidence(entry)).toBeNull();
  });

  it('presents recorded altitude, energy reserve, and target range in a stable order', () => {
    const result = evidence();
    expect(result.title).toBe('Maneuver 3 · Powered climb');
    expect(result.context).toBe('1 model second recorded · Readings rounded to whole units.');
    expect(result.rows.map(item => item.id)).toEqual(['altitude', 'energy', 'range']);
    expect(row(result, 'altitude')).toEqual({ id: 'altitude', label: 'Altitude', before: 40, after: 46, beforeText: '40 model ft', afterText: '46 model ft', deltaText: '6 model ft higher', trend: 'up' });
    expect(row(result, 'energy')).toMatchObject({ label: 'Energy reserve', beforeText: '80%', afterText: '78%', deltaText: '2 percentage points lower', trend: 'down' });
    expect(row(result, 'range')).toMatchObject({ label: 'Horizontal range', beforeText: '210 model m to DCA', afterText: '198 model m to DCA', deltaText: '12 model m closer', trend: 'down' });
    expect(result.rangeNote).toBe('');
  });

  it('preserves measured zero readings and a zero recorded duration', () => {
    const result = evidence({ seconds: 0, altitudeBefore: 0, altitude: 0, energyBefore: 0, energy: 0, rangeBefore: 0, range: 0 });
    expect(result.context).toBe('0 model seconds recorded · Readings rounded to whole units.');
    for (const item of result.rows) expect(item).toMatchObject({ before: 0, after: 0, deltaText: 'No rounded change', trend: 'same' });
    expect(row(result, 'energy').beforeText).toBe('0%');
    expect(row(result, 'range').afterText).toBe('0 model m to DCA');
  });

  it('uses recorded partial durations rather than the nominal action duration', () => {
    for (const seconds of [.2, .5, 1.7, 2]) expect(evidence({ action: 'Follow navigation cue', seconds }).context).toBe(seconds + ' model seconds recorded · Readings rounded to whole units.');
  });

  it('does not invent unavailable durations or interpret numeric-looking strings as evidence', () => {
    for (const seconds of [undefined, null, NaN, Infinity, -Infinity, -1, '0.2', false]) expect(evidence({ seconds }).context).toBe('Duration not recorded · Readings rounded to whole units.');
  });

  it('uses the recorded action and valid positive whole maneuver number without guessing', () => {
    expect(evidence({ turn: 12, action: '  Turn left  ' }).title).toBe('Maneuver 12 · Turn left');
    expect(evidence({ turn: 2, action: null }).title).toBe('Maneuver 2');
    for (const turn of [0, -1, 1.5, NaN, Infinity, '2', undefined]) expect(evidence({ turn, action: ' ' }).title).toBe('Recorded maneuver');
    expect(evidence({ turn: undefined, action: 'Ease thrust' }).title).toBe('Recorded maneuver · Ease thrust');
  });

  it('keeps a partial legacy record readable without fabricating missing measurements', () => {
    const result = BH.bhDroneManeuverEvidence({ action: 'Climb', altitudeBefore: 10, altitude: 108 });
    expect(row(result, 'altitude')).toMatchObject({ beforeText: '10 model ft', afterText: '108 model ft', deltaText: '98 model ft higher', trend: 'up' });
    expect(row(result, 'energy')).toMatchObject({ before: null, after: null, beforeText: 'Not recorded', afterText: 'Not recorded', deltaText: 'Comparison unavailable', trend: 'unknown' });
    expect(row(result, 'range')).toMatchObject({ beforeText: 'Not recorded · target not recorded', afterText: 'Not recorded · target not recorded', deltaText: 'Comparison unavailable', trend: 'unknown' });
  });

  it('requires finite numeric readings for each side of a comparison', () => {
    for (const value of [undefined, null, NaN, Infinity, -Infinity, '20', '', false, {}]) {
      const result = evidence({ altitudeBefore: value, energy: value, rangeBefore: value });
      expect(row(result, 'altitude')).toMatchObject({ before: null, after: 46, deltaText: 'Comparison unavailable', trend: 'unknown' });
      expect(row(result, 'energy')).toMatchObject({ before: 80, after: null, deltaText: 'Comparison unavailable', trend: 'unknown' });
      expect(row(result, 'range')).toMatchObject({ before: null, after: 198, deltaText: 'Comparison unavailable', trend: 'unknown' });
    }
  });

  it('compares displayed rounded values and never claims that equal readings mean no energy was spent', () => {
    const result = evidence({ altitudeBefore: 40.1, altitude: 40.4, energyBefore: 80.4, energy: 79.6, rangeBefore: 210.4, range: 209.6 });
    for (const item of result.rows) expect(item).toMatchObject({ deltaText: 'No rounded change', trend: 'same' });
    expect(row(result, 'energy')).toMatchObject({ before: 80, after: 80, beforeText: '80%', afterText: '80%' });
    expect(JSON.stringify(result)).not.toMatch(/no energy|zero energy|no change occurred/i);
    expect(row(evidence({ energyBefore: 80.49, energy: 79.49 }), 'energy').deltaText).toBe('1 percentage point lower');
  });

  it('expresses direction without marking increases or decreases as success or failure', () => {
    const result = evidence({ altitude: 31, energy: 81, range: 230 });
    expect(row(result, 'altitude')).toMatchObject({ deltaText: '9 model ft lower', trend: 'down' });
    expect(row(result, 'energy')).toMatchObject({ deltaText: '1 percentage point higher', trend: 'up' });
    expect(row(result, 'range')).toMatchObject({ deltaText: '20 model m farther', trend: 'up' });
    for (const item of result.rows) expect(item).not.toHaveProperty('tone');
  });

  it('retains finite recorded values without adding new percentage or altitude bounds', () => {
    const result = evidence({ altitudeBefore: -3, altitude: -1, energyBefore: 103, energy: 101 });
    expect(row(result, 'altitude')).toMatchObject({ before: -3, after: -1, deltaText: '2 model ft higher' });
    expect(row(result, 'energy')).toMatchObject({ beforeText: '103%', afterText: '101%', deltaText: '2 percentage points lower' });
  });

  it('does not compare a DCA range with a queen range when the target changes', () => {
    const result = evidence({ targetBefore: 'DCA', target: 'Queen cue', rangeBefore: 7, range: 61 });
    expect(row(result, 'range')).toMatchObject({ before: 7, after: 61, beforeText: '7 model m to DCA', afterText: '61 model m to Queen cue', deltaText: 'Comparison unavailable', trend: 'unknown' });
    expect(result.rangeNote).toBe('Target label changed from DCA to Queen cue. Range comparison is unavailable across this transition.');
    expect(row(result, 'energy').deltaText).toBe('2 percentage points lower');
  });

  it('also suppresses the range delta when a queen target label changes at interception', () => {
    const result = evidence({ targetBefore: 'Queen cue', target: 'Queen intercepted', rangeBefore: 12, range: 3 });
    expect(row(result, 'range')).toMatchObject({ deltaText: 'Comparison unavailable', trend: 'unknown' });
    expect(result.rangeNote).toBe('Target label changed from Queen cue to Queen intercepted. Range comparison is unavailable across this transition.');
  });

  it('keeps legacy range numbers but identifies each missing target instead of inferring it', () => {
    const priorMissing = evidence({ targetBefore: undefined });
    expect(row(priorMissing, 'range')).toMatchObject({ beforeText: '210 model m · target not recorded', afterText: '198 model m to DCA', deltaText: 'Comparison unavailable', trend: 'unknown' });
    expect(priorMissing.rangeNote).toBe('The earlier target was not recorded. These ranges cannot be compared.');
    expect(evidence({ target: undefined }).rangeNote).toBe('The later target was not recorded. These ranges cannot be compared.');
    for (const missing of [null, '', ' ', {}, 0]) {
      const result = evidence({ targetBefore: missing, target: missing });
      expect(row(result, 'range')).toMatchObject({ deltaText: 'Comparison unavailable', trend: 'unknown' });
      expect(result.rangeNote).toBe('The range targets were not recorded. These ranges cannot be compared.');
    }
  });

  it('compares matching normalized target labels and leaves moving-target interpretation to the UI footer', () => {
    const result = evidence({ targetBefore: ' Queen cue ', target: 'Queen cue' });
    expect(row(result, 'range')).toMatchObject({ beforeText: '210 model m to Queen cue', afterText: '198 model m to Queen cue', deltaText: '12 model m closer', trend: 'down' });
    expect(result.rangeNote).toBe('');
  });

  it('does not mutate frozen inputs or share mutable result rows across calls', () => {
    const input = Object.freeze(maneuver()), before = { ...input };
    const first = BH.bhDroneManeuverEvidence(input);
    first.rows[0].afterText = 'changed by caller';
    const next = BH.bhDroneManeuverEvidence(input);
    expect(input).toEqual(before);
    expect(row(next, 'altitude').afterText).toBe('46 model ft');
    expect(first.rows).not.toBe(next.rows);
  });

  it('preserves saved targetBefore evidence and intact notebook work by identity', () => {
    const entry = maneuver(), state = { drone: { lastRun: { decisionLog: [entry] } }, notebook: { drone: { explanation: 'I compared altitude and energy.' } } };
    const result = BH.bhRecoverBeehiveState(state);
    expect(result.state).toBe(state);
    expect(result.state.drone.lastRun.decisionLog[0]).toBe(entry);
    expect(result.state.drone.lastRun.decisionLog[0].targetBefore).toBe('DCA');
    expect(result.repairs).toEqual([]);
  });

  it('removes malformed saved targetBefore values without dropping measurements or altering the source', () => {
    for (const targetBefore of [null, {}, [], 12, false]) {
      const entry = maneuver({ targetBefore }), state = { drone: { lastRun: { decisionLog: [entry] } }, notebook: { drone: { evidence: 'Keep this observation.' } } };
      const result = BH.bhRecoverBeehiveState(state), recovered = result.state.drone.lastRun.decisionLog[0];
      expect(recovered).not.toHaveProperty('targetBefore');
      expect(recovered).toMatchObject({ altitudeBefore: 40, altitude: 46, rangeBefore: 210, range: 198, target: 'DCA' });
      expect(result.state.notebook).toBe(state.notebook);
      expect(entry.targetBefore).toBe(targetBefore);
      expect(row(BH.bhDroneManeuverEvidence(recovered), 'range').trend).toBe('unknown');
    }
  });
});
