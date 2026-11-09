import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));
const ids = ['gain', 'limit', 'sensor'];
const titles = { gain: 'Small input, larger current', limit: 'Find the limit', sensor: 'Make a night light' };
const plans = [
  { id: 'gain', project: 'manual', change: { key: 'input', before: 1, after: 1.5 } },
  { id: 'limit', project: 'manual', change: { key: 'input', before: 3.3, after: 5 } },
  { id: 'sensor', project: 'dark', change: { key: 'light', before: 80, after: 20 } }
];
const saved = (choice = null, tested = false, explanation = '') => ({ choice, tested, explanation });
const phaseLabels = { start: 'Not started', predict: 'Prediction needed', test: 'Prediction saved', explain: 'Result saved \u00b7 explanation needed', review: 'Explanation saved' };
const actionLabels = { start: 'Open experiment', predict: 'Resume prediction', test: 'Continue to test', explain: 'Review result and explain', review: 'Review saved experiment' };
let api, config;
beforeEach(() => { resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; });
const seed = () => ({ ...api.circuitActiveDesign({ project: 'dark', light: 37, input: 4.2, supply: 12, baseResistance: 33000, loadResistance: 680, beta: 240 }), view: 'schematic', probeRed: 'drive', probeBlack: 'base', observations: [api.circuitActiveObservation({ input: .8 }, 'Keep this observation.')], reference: { version: 1, design: api.circuitActiveDesign({ input: .9 }) }, reflection: 'My independent notebook.', investigationTitle: 'A tuned circuit', undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })] });
const protectedWork = state => clone({ design: api.circuitActiveDesign(state), undo: state.undo, redo: state.redo, view: state.view, observations: state.observations, reference: state.reference, reflection: state.reflection, investigationTitle: state.investigationTitle, probeRed: state.probeRed, probeBlack: state.probeBlack });

describe('A fixed experiment map derived from saved work', () => {
  it('returns exactly three setup-only rows in curriculum order, with no selected state or outcome data', () => {
    expect(api.circuitActiveLessonMap({})).toEqual(plans.map(plan => ({ ...plan, phase: 'start', explanationSaved: false })));
    expect(JSON.stringify(api.circuitActiveLessonMap({}))).not.toMatch(/Current|Voltage|region|answer|reason|brightness|selected|constants/);
  });
  it('uses each lesson record independently instead of the selected lesson or tuned live circuit', () => {
    const state = { ...seed(), lessonId: 'limit', lessonRecords: { gain: saved('less', false, 'A draft'), limit: saved('same', true, ' '), sensor: saved('more', true, 'Evidence from the sensor.') } };
    expect(api.circuitActiveLessonMap(state)).toEqual(plans.map((plan, i) => ({ ...plan, phase: ['test', 'explain', 'review'][i], explanationSaved: i === 2 })));
    expect(api.circuitActiveLessonMap({ ...state, ...api.circuitActiveDesign({ input: 0 }), lessonId: 'unknown' })).toEqual(api.circuitActiveLessonMap(state));
  });
  it('includes normalized legacy progress while respecting explicit records', () => {
    const state = { challenge: { id: 'sensor', choice: 'more', tested: true }, lessonRecords: { gain: saved(), limit: saved('same', true, 'My result.') } };
    expect(api.circuitActiveLessonMap(state).map(row => row.phase)).toEqual(['predict', 'review', 'explain']);
    expect(api.circuitActiveLessonMap({ ...state, lessonRecords: { ...state.lessonRecords, sensor: saved() } }).map(row => row.phase)).toEqual(['predict', 'review', 'predict']);
  });
  it('does not mutate state and returns fresh nested changes on every read', () => {
    const state = { ...seed(), lessonRecords: { gain: saved('less', true, 'Saved writing') } }, before = JSON.stringify(state), first = api.circuitActiveLessonMap(state);
    first[0].change.after = 999; first[1].phase = 'review'; first.push({ id: 'invented' });
    expect(JSON.stringify(state)).toBe(before); expect(api.circuitActiveLessonMap(state)[0].change).toEqual(plans[0].change); expect(api.circuitActiveLessonMap(state).map(row => row.id)).toEqual(ids);
  });
  it('updates only the affected saved phase after a real prediction, Test, and explanation', () => {
    let state = api.circuitActiveLessonUpdate(seed(), 'sensor', 'start');
    expect(api.circuitActiveLessonMap(state).map(row => row.phase)).toEqual(['start', 'start', 'predict']);
    state = api.circuitActiveLessonUpdate(state, 'sensor', 'predict', 'less'); expect(api.circuitActiveLessonMap(state)[2].phase).toBe('test');
    state = api.circuitActiveLessonUpdate(state, 'sensor', 'test'); expect(api.circuitActiveLessonMap(state)[2].phase).toBe('explain');
    state = api.circuitActiveLessonUpdate(state, 'sensor', 'explain', 'I revised my prediction using the saved readings.');
    expect(api.circuitActiveLessonMap(state).map(row => row.phase)).toEqual(['start', 'start', 'review']);
  });
});

