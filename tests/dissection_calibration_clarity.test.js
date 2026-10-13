import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

// Run the production functions. Missing or ambiguous declarations fail instead
// of substituting test-owned formatting, stepping, or scoring behavior.
function loadProductionFunction(name, bindings = {}) {
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw new Error('Expected one production function: ' + name);
  const match = matches[0];
  const start = match.index + match[1].length;
  const ending = '\n' + match[1] + '}';
  const end = source.indexOf(ending, start);
  if (end < start) throw new Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), '"use strict"; return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

const normalizeToolCalibration = loadProductionFunction('normalizeToolCalibration');
const calibrationControlDefinition = loadProductionFunction('calibrationControlDefinition');
const calibrationValueText = loadProductionFunction('calibrationValueText');
const calibrationRangeScore = loadProductionFunction('calibrationRangeScore');
const toolCalibrationScore = loadProductionFunction('toolCalibrationScore', { normalizeToolCalibration, calibrationRangeScore });
const instrumentCalibrationAssessment = loadProductionFunction('instrumentCalibrationAssessment', { toolCalibrationScore, calibrationControlDefinition });
const tools = [
  ['scalpel', 'bladeAngle', 25, '25°', '25 degrees'],
  ['scissors', 'scissorsAperture', 35, '35%', '35 percent'],
  ['forceps', 'forcepsGrip', 40, '40%', '40 percent'],
  ['pin', 'pinAngle', 65, '65°', '65 degrees'],
  ['probe', 'probePressure', 30, '30%', '30 percent'],
  ['dropper', 'salineDose', 2, '2 drops', '2 drops'],
];
const initialCalibration = Object.freeze({
  bladeAngle: 25, scissorsAperture: 35, forcepsGrip: 40,
  pinAngle: 65, probePressure: 30, salineDose: 2,
});

function stepping(toolId, values = {}) {
  const toolCalibration = Object.freeze({ ...initialCalibration, ...values });
  const savedWork = Object.freeze({
    activeInstrument: toolId,
    procedureByLayer: Object.freeze({ skin: Object.freeze({ inspected: true, actionLog: Object.freeze([]) }) }),
    organNotes: Object.freeze({ heart: 'Retain this observation' }),
    visualEvidence: Object.freeze([Object.freeze({ id: 'saved-capture' })]),
  });
  const before = JSON.stringify({ toolCalibration, savedWork });
  const forbidden = vi.fn(() => { throw new Error('Calibration steps must only update the selected setting.'); });
  const normalize = vi.fn(normalizeToolCalibration);
  const upd = vi.fn();
  const activeCalibrationControl = calibrationControlDefinition(toolId);
  const step = loadProductionFunction('stepInstrumentCalibration', {
    activeCalibrationControl, toolCalibration, normalizeToolCalibration: normalize, upd,
    d: savedWork, currentProcedure: savedWork.procedureByLayer.skin,
    updMany: forbidden, updateProcedure: forbidden, setProcedureFeedback: forbidden,
    selectProcedureInstrument: forbidden, runProcedureAction: forbidden,
    setTimeout: forbidden, clearTimeout: forbidden, scheduleDissectionCanvasTimer: forbidden,
  });
  function expectPreserved() {
    expect(JSON.stringify({ toolCalibration, savedWork })).toBe(before);
    expect(forbidden).not.toHaveBeenCalled();
  }
  return { toolCalibration, activeCalibrationControl, normalize, upd, forbidden, step, expectPreserved };
}

describe('dissection calibration value descriptions', () => {
  it.each(tools)('formats visible and spoken units for %s', (tool, _key, value, visible, spoken) => {
    const control = Object.freeze(calibrationControlDefinition(tool));
    expect(calibrationValueText(control, value, false)).toBe(visible);
    expect(calibrationValueText(control, value, true)).toBe(spoken);
    expect(calibrationValueText(control, value)).toBe(visible);
  });

  it.each([
    [1, '1 drop'], [2, '2 drops'], [3, '3 drops'],
  ])('uses correct drop wording at dose %s', (value, expected) => {
    const control = calibrationControlDefinition('dropper');
    expect(calibrationValueText(control, value, false)).toBe(expected);
    expect(calibrationValueText(control, value, true)).toBe(expected);
  });
});

describe('dissection calibration step controls', () => {
  it.each(tools)('steps only the %s setting in either direction', (tool, key, value) => {
    for (const direction of [-1, 1]) {
      const h = stepping(tool);
      h.step(direction);
      const expected = { ...initialCalibration, [key]: value + direction };
      expect(h.normalize).toHaveBeenCalledExactlyOnceWith(expected);
      expect(h.normalize.mock.calls[0][0]).not.toBe(h.toolCalibration);
      expect(h.upd).toHaveBeenCalledExactlyOnceWith('toolCalibration', expected);
      expect(h.upd.mock.calls[0][1]).not.toBe(h.toolCalibration);
      h.expectPreserved();
    }
  });

  it.each(tools)('honors both endpoints for %s without redundant updates', (tool, key) => {
    const control = calibrationControlDefinition(tool);
    for (const [value, outward, inward] of [[control.min, -1, 1], [control.max, 1, -1]]) {
      const h = stepping(tool, { [key]: value });
      h.step(outward);
      expect(h.normalize).not.toHaveBeenCalled();
      expect(h.upd).not.toHaveBeenCalled();
      h.step(inward);
      expect(h.upd).toHaveBeenCalledExactlyOnceWith('toolCalibration', {
        ...initialCalibration, [key]: value + inward * control.step,
      });
      h.expectPreserved();
    }
  });

  it('clamps a fractional final step at the numeric control bounds', () => {
    for (const [value, direction, expected] of [[10.5, -1, 10], [59.5, 1, 60]]) {
      const h = stepping('scalpel', { bladeAngle: value });
      h.step(direction);
      expect(h.upd).toHaveBeenCalledExactlyOnceWith('toolCalibration', { ...initialCalibration, bladeAngle: expected });
      h.expectPreserved();
    }
  });

  it('ignores directions other than the explicit numeric backward and forward steps', () => {
    const h = stepping('probe');
    for (const direction of [undefined, null, 0, 2, -2, '1', '-1', true, false, NaN, Infinity, {}, []]) h.step(direction);
    expect(h.normalize).not.toHaveBeenCalled();
    expect(h.upd).not.toHaveBeenCalled();
    h.expectPreserved();
  });

  it('does nothing for tools without a calibration control', () => {
    for (const tool of ['wick', 'ruler', 'unknown']) {
      const h = stepping(tool);
      expect(h.activeCalibrationControl).toBeNull();
      h.step(-1);
      h.step(1);
      expect(h.normalize).not.toHaveBeenCalled();
      expect(h.upd).not.toHaveBeenCalled();
      h.expectPreserved();
    }
  });
});

describe('dissection calibration score preservation', () => {
  it.each([
    [18, 84, 'Adjust', 'adjust'],
    [19, 92, 'Calibrated', 'ready'],
    [20, 100, 'Calibrated', 'ready'],
    [35, 100, 'Calibrated', 'ready'],
    [39, 87, 'Calibrated', 'ready'],
    [40, 84, 'Adjust', 'adjust'],
    [47, 62, 'Adjust', 'adjust'],
    [48, 58, 'Caution', 'caution'],
  ])('retains the scalpel assessment at %s degrees', (bladeAngle, score, label, tone) => {
    const calibration = Object.freeze({ ...initialCalibration, bladeAngle });
    expect(toolCalibrationScore('scalpel', calibration)).toBe(score);
    expect(instrumentCalibrationAssessment('scalpel', calibration)).toMatchObject({ score, label, tone });
    expect(calibration.bladeAngle).toBe(bladeAngle);
  });

  it.each([
    ['scalpel', 'bladeAngle', 20, 35],
    ['scissors', 'scissorsAperture', 25, 45],
    ['forceps', 'forcepsGrip', 25, 50],
    ['pin', 'pinAngle', 55, 75],
    ['probe', 'probePressure', 18, 38],
  ])('retains full calibration credit at both recommended %s boundaries', (tool, key, low, high) => {
    for (const value of [low, high]) {
      expect(toolCalibrationScore(tool, { ...initialCalibration, [key]: value })).toBe(100);
    }
  });

  it.each([
    [1, 100, 'Calibrated', 'ready'],
    [2, 72, 'Adjust', 'adjust'],
    [3, 45, 'Caution', 'caution'],
  ])('keeps the existing dose-%s calibration score', (salineDose, score, label, tone) => {
    expect(instrumentCalibrationAssessment('dropper', { ...initialCalibration, salineDose }))
      .toMatchObject({ score, label, tone });
  });

  it('retains the neutral assessment for a tool with no calibration setting', () => {
    expect(instrumentCalibrationAssessment('wick', initialCalibration)).toEqual({
      score: 100, label: 'Ready', tone: 'ready', detail: 'No additional calibration is needed.',
    });
  });
});
