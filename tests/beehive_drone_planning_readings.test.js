import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
const state = (patch = {}) => ({ x: 0, y: 115, z: -500, energy: 105, difficulty: 'normal', reachedDca: false, nearQueens: [], ...patch });
const readings = patch => BH.bhDronePlanningReadings(state(patch));
const queen = (patch = {}) => ({ x: 30, y: 145, z: -540, caught: false, ...patch });

describe('Drone planning instrument readings', () => {
  it('keeps the displayed values, references, and raw condition meanings separate', () => {
    const result = readings();
    expect(result.targetLabel).toBe('DCA');
    expect(result.range).toEqual({ value: 100, text: '100 model m', reference: 'To DCA center', detail: 'Move 28 model m closer to the DCA boundary.', status: 'outside' });
    expect(result.altitude).toMatchObject({ value: 115, text: '115 model ft', reference: 'DCA entry band: 100–130 model ft', detail: 'Within the DCA height band.', status: 'within', kind: 'dca', offScale: false, referencePct: null });
    expect(result.altitude.markerPct).toBeCloseTo(115 / 3);
    expect(result.altitude.bandStartPct).toBeCloseTo(100 / 3);
    expect(result.altitude.bandWidthPct).toBe(10);
    expect(result.energy).toEqual({ value: 100, text: '100%', detail: 'of this difficulty’s full reserve', fillPct: 100, low: false });
    expect(result.roundingNote).toBe('Values are rounded; condition labels use unrounded readings.');
  });

  it('uses the exact horizontal boundary even when both sides round to 72', () => {
    for (const [x, status] of [[71.99, 'within'], [72, 'within'], [72.01, 'outside']]) {
      const result = readings({ x, z: -600 });
      expect(result.range.value).toBe(72);
      expect(result.range.status).toBe(status);
      expect(result.range.detail).toBe(status === 'within' ? 'Within the 72 model m horizontal boundary.' : 'Move <1 model m closer to the DCA boundary.');
    }
  });

  it('calculates horizontal range from both planar axes without including height', () => {
    const result = readings({ x: 3, z: -596, y: 280 });
    expect(result.range).toMatchObject({ value: 5, status: 'within' });
    expect(result.altitude.status).toBe('above');
    expect(readings({ x: 72.1, z: -600 }).range.detail).toBe('Move <1 model m closer to the DCA boundary.');
    expect(readings({ x: 73.1, z: -600 }).range.detail).toBe('Move 2 model m closer to the DCA boundary.');
  });

  it('compares raw height against both inclusive DCA band boundaries', () => {
    for (const [y, status] of [[99.99, 'below'], [100, 'within'], [100.01, 'within'], [129.99, 'within'], [130, 'within'], [130.01, 'above']]) {
      const result = readings({ y });
      expect(result.altitude.value).toBe(Math.round(y));
      expect(result.altitude.status).toBe(status);
      expect(result.altitude.detail).toBe(status === 'below' ? 'Climb <1 model ft to the band.' : status === 'above' ? 'Descend <1 model ft to the band.' : 'Within the DCA height band.');
    }
    expect(readings({ y: 98.9 }).altitude.detail).toBe('Climb 2 model ft to the band.');
    expect(readings({ y: 131.1 }).altitude.detail).toBe('Descend 2 model ft to the band.');
  });

  it('retains valid altitude and energy when horizontal position is missing', () => {
    const result = readings({ x: undefined, z: null, y: 101.2, energy: 52.5 });
    expect(result.range).toMatchObject({ value: null, text: 'Unavailable', status: 'unknown', detail: 'Horizontal range unavailable.' });
    expect(result.altitude).toMatchObject({ value: 101, status: 'within' });
    expect(result.energy).toMatchObject({ value: 50, fillPct: 50 });
  });

  it('never converts absent or malformed numeric fields into zero readings', () => {
    for (const value of [undefined, null, NaN, Infinity, -Infinity, '0', false, {}, []]) {
      const result = readings({ x: value, y: value, energy: value });
      expect(result.range).toMatchObject({ value: null, text: 'Unavailable', status: 'unknown' });
      expect(result.altitude).toMatchObject({ value: null, text: 'Unavailable', status: 'unknown', markerPct: null, offScale: false });
      expect(result.energy).toMatchObject({ value: null, text: 'Unavailable', fillPct: null, low: false, detail: 'Energy reserve unavailable.' });
    }
  });

  it('preserves measured zero values and handles wholly missing state', () => {
    const result = readings({ x: 0, z: -600, y: 0, energy: 0 });
    expect(result.range).toMatchObject({ value: 0, text: '0 model m', status: 'within' });
    expect(result.altitude).toMatchObject({ value: 0, text: '0 model ft', markerPct: 0, status: 'below', offScale: false });
    expect(result.energy).toMatchObject({ value: 0, text: '0%', fillPct: 0, low: true });
    for (const input of [undefined, null, false, 7, 'state', []]) {
      const unknown = BH.bhDronePlanningReadings(input);
      expect([unknown.range.value, unknown.altitude.value, unknown.energy.value]).toEqual([null, null, null]);
    }
  });

  it('uses each difficulty reserve and retains the normal fallback', () => {
    for (const [difficulty, energy] of [['easy', 125], ['normal', 105], ['hard', 82], ['unknown', 105], [undefined, 105]]) {
      expect(readings({ difficulty, energy }).energy).toMatchObject({ value: 100, fillPct: 100, low: false });
      expect(readings({ difficulty, energy: energy / 2 }).energy).toMatchObject({ value: 50, fillPct: 50 });
    }
  });

  it('marks a raw reserve below 25 percent as low even if its display rounds to 25', () => {
    const low = readings({ difficulty: 'easy', energy: 31.125 });
    expect(low.energy).toMatchObject({ value: 25, text: '25%', low: true, fillPct: 24.9, detail: 'of this difficulty’s full reserve' });
    expect(readings({ difficulty: 'easy', energy: 31.25 }).energy).toMatchObject({ value: 25, low: false, fillPct: 25 });
    expect(readings({ difficulty: 'easy', energy: 31.375 }).energy).toMatchObject({ value: 25, low: false, fillPct: 25.1 });
  });

  it('clamps the reserve bar only, while keeping an above-full number readable', () => {
    expect(readings({ difficulty: 'easy', energy: 150 }).energy).toMatchObject({ value: 120, text: '120%', fillPct: 100, low: false });
    expect(readings({ energy: -8 }).energy).toMatchObject({ value: 0, text: '0%', fillPct: 0, low: true });
  });

  it('selects the canonical uncaught queen cue after recording the DCA', () => {
    const caught = queen({ x: 300, y: 80, z: 0, caught: true });
    const next = queen();
    const input = state({ reachedDca: true, nearQueens: [caught, next] });
    expect(BH.bhDroneNavigationTarget(input).label).toBe('Queen cue');
    const result = BH.bhDronePlanningReadings(input);
    expect(result.targetLabel).toBe('Queen cue');
    expect(result.range).toEqual({ value: 50, text: '50 model m', reference: 'To queen cue', detail: 'Horizontal gap; the queen cue can move.', status: 'available' });
    expect(result.altitude).toMatchObject({ kind: 'queen', reference: 'Queen cue height: 145 model ft', status: 'below', detail: 'Below cue height; check horizontal range.' });
    expect(result.altitude.referencePct).toBeCloseTo(145 / 3);
    expect(result.range).not.toHaveProperty('fillPct');
  });

  it('keeps the canonical intercepted cue when the completed state makes it selectable', () => {
    const result = readings({ reachedDca: true, reachedQueen: true, nearQueens: [queen({ caught: true }), queen({ x: 100 })] });
    expect(result.targetLabel).toBe('Queen intercepted');
    expect(result.range).toMatchObject({ value: 50, reference: 'To queen cue', status: 'available' });
    expect(result.altitude.reference).toBe('Queen cue height: 145 model ft');
  });

  it('compares raw current height with the queen cue without claiming interception', () => {
    for (const [y, status, prefix] of [[144.99, 'below', 'Below'], [145, 'aligned', 'At'], [145.01, 'above', 'Above']]) {
      const result = readings({ y, reachedDca: true, nearQueens: [queen()] });
      expect(result.altitude).toMatchObject({ value: 145, status, detail: prefix + ' cue height; check horizontal range.' });
      expect(result.range.status).toBe('available');
      expect(JSON.stringify(result)).not.toMatch(/entry conditions met|intercepted|success|checkpoint awarded/i);
    }
  });

  it('retains the chosen cue when its coordinates are incomplete instead of substituting DCA readings', () => {
    const result = readings({ reachedDca: true, nearQueens: [queen({ x: null, y: undefined })] });
    expect(result.targetLabel).toBe('Queen cue');
    expect(result.range).toMatchObject({ value: null, reference: 'To queen cue', status: 'unknown' });
    expect(result.altitude).toMatchObject({ value: 115, reference: 'Queen cue height unavailable', referencePct: null, markerPct: 115 / 3, status: 'unknown', kind: 'queen' });
    expect(result.altitude.detail).toBe('Queen cue height unavailable; height comparison unavailable.');
  });

  it('retains a known cue height even when the current altitude is unavailable', () => {
    const result = readings({ y: undefined, reachedDca: true, nearQueens: [queen()] });
    expect(result.altitude).toMatchObject({ value: null, markerPct: null, status: 'unknown', reference: 'Queen cue height: 145 model ft', detail: 'Altitude unavailable.' });
    expect(result.altitude.referencePct).toBeCloseTo(145 / 3);
    expect(result.range.value).toBe(50);
  });

  it('handles invalid queen collections and leaves unrecorded DCA navigation canonical', () => {
    for (const nearQueens of [null, {}, 'queen', 12, [null, false, 8, [], 'cue']]) {
      const result = readings({ reachedDca: true, nearQueens });
      expect(result.targetLabel).toBe('DCA');
      expect(result.range.detail).toContain('DCA already recorded.');
    }
    const result = readings({ nearQueens: [queen()], reachedDca: false });
    expect(result.targetLabel).toBe('DCA');
    expect(result.altitude.kind).toBe('dca');
  });

  it('does not instruct a return to DCA when the checkpoint is recorded and no queen is available', () => {
    const result = readings({ reachedDca: true, x: 900, y: 240, z: 0, nearQueens: [queen({ caught: true })] });
    expect(result.targetLabel).toBe('DCA');
    expect(result.range.status).toBe('outside');
    expect(result.altitude.status).toBe('above');
    expect(result.range.detail).toBe('DCA already recorded. This is a reference reading; returning is not required.');
    expect(result.altitude.detail).toBe('DCA already recorded. This height band is a reference; returning is not required.');
    expect(result.range.detail + result.altitude.detail).not.toMatch(/Move |Climb |Descend /);
  });

  it('clamps only the current altitude marker and explicitly identifies off-scale readings', () => {
    for (const [y, markerPct] of [[-4, 0], [340, 100]]) {
      const result = readings({ y });
      expect(result.altitude).toMatchObject({ value: y, markerPct, offScale: true });
      expect(result.altitude.detail).toContain('Your altitude is outside the 0–300 model ft scale.');
    }
    for (const y of [0, 300]) expect(readings({ y }).altitude.offScale).toBe(false);
  });

  it('clamps only the cue reference marker and names the off-scale cue separately', () => {
    const result = readings({ reachedDca: true, y: 400, nearQueens: [queen({ y: -5 })] });
    expect(result.altitude).toMatchObject({ value: 400, markerPct: 100, referencePct: 0, reference: 'Queen cue height: -5 model ft', status: 'above', offScale: true });
    expect(result.altitude.detail).toContain('Your altitude is outside the 0–300 model ft scale.');
    expect(result.altitude.detail).toContain('The queen cue height is outside the 0–300 model ft scale.');
    expect(readings({ reachedDca: true, nearQueens: [queen({ y: 350 })] }).altitude).toMatchObject({ referencePct: 100, offScale: true, reference: 'Queen cue height: 350 model ft' });
  });

  it('does not expose nonfinite range or reserve percentages after arithmetic overflow', () => {
    const result = readings({ x: Number.MAX_VALUE, reachedDca: true, nearQueens: [queen({ x: -Number.MAX_VALUE })], difficulty: 'hard', energy: Number.MAX_VALUE });
    expect(result.range).toMatchObject({ value: null, text: 'Unavailable', status: 'unknown' });
    expect(result.energy).toMatchObject({ value: null, text: 'Unavailable', fillPct: null, low: false });
  });

  it('does not mutate frozen run state, award checkpoints, or share result objects', () => {
    const cue = Object.freeze(queen()), input = Object.freeze(state({ x: 30, z: -540, y: 145, reachedDca: true, nearQueens: Object.freeze([cue]) }));
    const before = JSON.stringify(input), first = BH.bhDronePlanningReadings(input);
    first.altitude.reference = 'edited';
    first.energy.value = 0;
    const second = BH.bhDronePlanningReadings(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(input).not.toHaveProperty('reachedQueen');
    expect(second.altitude.reference).toBe('Queen cue height: 145 model ft');
    expect(second.energy.value).toBe(100);
    expect(first.altitude).not.toBe(second.altitude);
    expect(second.range.value).toBe(0);
  });
});
