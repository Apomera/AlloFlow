// EvoLab reads a saved project file straight out of toolData, and a project file is
// INPUT: a student can hand-edit it, copy it between tool versions, or carry one made
// by an older build. The shell's error boundary is unkeyed, so one throw blanks the
// whole lab (see memory: reference_hostile_toolData_sweep, 2026-09-07, when EvoLab was
// one of six tools that crashed). These sweeps re-run that audit over every view and
// every key the tool reads, including the state added through 2026-09-15.
//
// The third block is the regression: the capstone's signal-vs-noise check grouped runs
// by "designKey || settings" but re-looked-up its representative run with a filter on
// a DIFFERENT property, so a run whose designKey was null matched nothing and the [0]
// dereference threw. Keep the hostile numbers: infinities, NaN, huge precision and
// malformed factor entries all reach the same arithmetic.
import { describe, expect, it, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Every view, against malformed values for every key EvoLab reads out of toolData.
const VIEWS = ['menu','predatorVision','mateChoice','climatePressure','selectionSandbox','beakLab','speciation','phyloBuilder','hardyWeinberg','geneticDrift','commonAncestry','antibioticLab','coevolution','discoveryTimeline','misconceptions','selectionSleuth','homologySleuth','capstone','termSprint','classSnapshot','journal','pressureHunt'];
const BAD = ['abc', 9999, -1, 1.5, {}, [], null, true];
const KEYS = ['evoProgress','evoCapstone','evoBadges','misconAnswers','misconQuizBest','evoClimateBest','view','sleuthState','homologyState','timelineState'];

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_evolab.js', 'evoLab'); });

describe('EvoLab survives malformed saved state', () => {
  it('renders every view with each key set to each malformed value', { timeout: 120000 }, () => {
    const failures = [];
    for (const view of VIEWS) {
      for (const key of KEYS) {
        for (const bad of BAD) {
          const state = { view };
          state[key] = bad;
          try { renderTool('evoLab', { evoLab: state }); } catch (e) { failures.push(`${view} / ${key} = ${JSON.stringify(bad)} → ${e.message}`); }
        }
      }
    }
    if (failures.length) console.log(failures.slice(0, 20).join('\n'));
    expect(failures).toEqual([]);
  });

  it('renders every view with a progress object whose sub-objects are malformed', { timeout: 120000 }, () => {
    const SUB = ['completed','experiments','predictions','checks','challenges','records','notes','exitTickets','quiz'];
    const failures = [];
    for (const view of VIEWS) {
      for (const sub of SUB) {
        for (const bad of BAD) {
          const prog = { completed: {}, experiments: {}, predictions: {}, checks: {}, challenges: {}, records: {}, notes: {}, exitTickets: {} };
          prog[sub] = bad;
          try { renderTool('evoLab', { evoLab: { view, evoProgress: prog } }); } catch (e) { failures.push(`${view} / progress.${sub} = ${JSON.stringify(bad)} → ${e.message}`); }
        }
      }
    }
    if (failures.length) console.log(failures.slice(0, 20).join('\n'));
    expect(failures).toEqual([]);
  });
});


describe('EvoLab survives deeply malformed structures', () => {
  it('capstone: runs/notebook/predictions of the wrong shape', () => {
    const failures = [];
    const shapes = [
      { runs: 'abc' }, { runs: [null] }, { runs: [{}] }, { runs: [{ comparison: 'abc' }] },
      { runs: [{ comparison: { primaryValue: 'abc', factors: 'abc' } }] },
      { runs: [{ comparison: { primaryValue: NaN, factors: [null] } }] },
      { runs: [{ comparison: { designKey: {}, primaryValue: 1, factors: [{}] } }, { comparison: { designKey: {}, primaryValue: 2, factors: [{}] } }, { comparison: { designKey: [], primaryValue: 3, factors: [] } }] },
      { predictions: 'abc' }, { predictions: [null, 9999] }, { reflections: {} },
      { notebook: 'abc' }, { notebook: [] }, { step: 'abc' }, { step: 99 }, { step: -5 },
      { trialPlan: 'abc' }, { trialPlan: { strategy: 9999, factorId: {} } }, { evidenceVerdict: {} }
    ];
    for (const s of shapes) {
      try { renderTool('evoLab', { evoLab: { view: 'capstone', evoCapstone: s } }); } catch (e) { failures.push(JSON.stringify(s).slice(0, 80) + ' → ' + e.message); }
    }
    if (failures.length) console.log(failures.join('\n'));
    expect(failures).toEqual([]);
  });

  it('progress: records/quiz/notes entries of the wrong shape', { timeout: 60000 }, () => {
    const failures = [];
    const progs = [
      { records: { termSprint: 'abc' } }, { records: { termSprint: { best: 'abc' } } },
      { records: { termSprint: { best: { value: 'abc' } } } }, { records: { geneticDrift: [null] } },
      { quiz: 'abc' }, { quiz: { passes: 'abc' } }, { quiz: { first: 'abc', latest: {} } },
      { quiz: { first: { missed: 'abc', score: 'x' }, latest: { missed: [999], score: null }, passes: 2 } },
      { notes: { beakLab: 'abc' } }, { notes: { beakLab: { text: 9999, cer: 'abc' } } },
      { checks: { hardyWeinberg: 'abc' } }, { checks: { 'hardyWeinberg:balance': { choice: {} } } },
      { experiments: { beakLab: 'abc' } }, { challenges: { beakLab: [null] } },
      { exitTickets: { 1: 'abc' } }, { completed: { beakLab: 'abc' } }
    ];
    for (const view of VIEWS) {
      for (const p of progs) {
        const prog = Object.assign({ completed: {}, experiments: {}, predictions: {}, checks: {}, challenges: {}, records: {}, notes: {}, exitTickets: {} }, p);
        try { renderTool('evoLab', { evoLab: { view, evoProgress: prog } }); } catch (e) { failures.push(view + ' / ' + JSON.stringify(p).slice(0, 70) + ' → ' + e.message); }
      }
    }
    if (failures.length) console.log(failures.slice(0, 15).join('\n'));
    expect(failures).toEqual([]);
  });
});


const cmp = (o) => Object.assign({ designKey: 'k', designLabel: 'L', primaryLabel: 'out', primaryValue: 1, primaryDisplay: '1', precision: 3, unit: '', factors: [] }, o);
const run = (c) => ({ id: 'r' + Math.random(), moduleId: 'geneticDrift', moduleLabel: 'M', capturedAt: '', baseline: '', settings: '', outcome: '', comparison: c, metrics: [] });

describe('new cards survive hostile numbers', () => {
  it('signal-vs-noise: infinities, huge precision, identical and missing values', () => {
    const cases = [
      [cmp({ primaryValue: Infinity }), cmp({ primaryValue: 1 }), cmp({ designKey: 'z', primaryValue: 2 })],
      [cmp({ primaryValue: 1e308 }), cmp({ primaryValue: -1e308 }), cmp({ designKey: 'z', primaryValue: 0 })],
      [cmp({ precision: 99 }), cmp({ precision: -5 }), cmp({ designKey: 'z', precision: 'abc' })],
      [cmp({ primaryValue: 0 }), cmp({ primaryValue: 0 }), cmp({ designKey: 'z', primaryValue: 0 })],
      [cmp({ factors: [{ id: 'a', label: null, value: {} }] }), cmp({ factors: [{ id: 'a', label: null, value: [] }] }), cmp({ designKey: 'z', factors: [{ id: 'a', label: 9, value: 'x' }] })],
      [cmp({ designKey: null }), cmp({ designKey: undefined }), cmp({ designKey: 'z' })],
      [cmp({ unit: {} }), cmp({ unit: [] }), cmp({ designKey: 'z', unit: null })]
    ];
    const failures = [];
    for (const c of cases) {
      const project = { step: 2, scenarioId: 'island', module: 'geneticDrift', moduleLabel: 'M', predictions: ['a', 'b', 'c'], reflections: ['', '', ''], notebook: {}, runs: c.map(run), nextRunId: 4, dataMission: [] };
      try { renderTool('evoLab', { evoLab: { view: 'capstone', evoCapstone: project } }); } catch (e) { failures.push(e.message); }
    }
    if (failures.length) console.log(failures.join('\n'));
    expect(failures).toEqual([]);
  });

  it('then-vs-now: missed indexes out of range, wrong types, huge passes', () => {
    const quizzes = [
      { passes: 2, first: { missed: [99, -1, 'x', null], score: 5 }, latest: { missed: [0], score: 11 } },
      { passes: 1e9, first: { missed: [], score: -5 }, latest: { missed: [], score: 999 } },
      { passes: 2, first: { missed: {}, score: 0 }, latest: { missed: null, score: 0 } },
      { passes: 2, first: { missed: [0, 0, 0], score: 12 }, latest: { missed: [0, 0], score: 12 } },
      { passes: '2', first: { missed: [1], score: '9' }, latest: { missed: [1], score: '9' } }
    ];
    const failures = [];
    for (const quiz of quizzes) {
      const prog = { completed: {}, experiments: {}, predictions: {}, checks: {}, challenges: {}, records: {}, notes: {}, exitTickets: {}, quiz };
      for (const view of ['misconceptions', 'journal', 'classSnapshot']) {
        try { renderTool('evoLab', { evoLab: { view, evoProgress: prog } }); } catch (e) { failures.push(view + ' → ' + e.message); }
      }
    }
    if (failures.length) console.log(failures.join('\n'));
    expect(failures).toEqual([]);
  });
});
