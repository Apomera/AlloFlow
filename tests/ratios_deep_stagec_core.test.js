// Ratios Lab stage C (2026-11-03): pure checks of the learning path, the band
// tab order, the wrapped tape labels and the retired wrapper translators.
// RATIOS_DEEP_FILE points the suite at another copy (e.g. the stage B file).
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.RATIOS_DEEP_FILE || 'stem_lab/stem_tool_ratios.js';
let P;
let tool;
beforeAll(() => { resetStemLab(); tool = loadTool(FILE, 'ratioLab'); P = window.RatioLabPure; });

const MODES = ['ratioTable', 'numberLine', 'unitRates', 'percent', 'proportional'];

describe('learning path per band', () => {
  it('has 3 to 6 steps per band, with the named core activities in order', () => {
    const ids = (band) => P.learningPathFor(band).map((s) => s.id);
    for (const band of P.bands) {
      const path = P.learningPathFor(band);
      expect(path.length).toBeGreaterThanOrEqual(3);
      expect(path.length).toBeLessThanOrEqual(6);
    }
    // 4-5: times as many, then the tape diagram.
    expect(P.learningPathFor('g45').slice(0, 2).map((s) => s.kinds[0])).toEqual(['multCompare', 'multCompareDivide']);
    expect(P.learningPathFor('g45')[1].openModel).toBe(true);
    // 6: ratio tables, unit rates, percents, mixtures.
    expect(P.learningPathFor('g6').map((s) => s.mode || 'mission:' + s.mission)).toEqual(['ratioTable', 'unitRates', 'percent', 'mission:mixture']);
    // 7: detective, percent change, scale drawings, recipes.
    expect(ids('g7')).toEqual(['detective', 'percentChange', 'scaleDrawings', 'recipes']);
    expect(P.learningPathFor('g7')[1].kinds).toEqual(['percentChange']);
    // 8: slope as rate first.
    expect(P.learningPathFor('g8')[0].kinds).toEqual(['slope']);
    // Unknown band falls back to grade 6; callers cannot mutate the table.
    expect(ids('zz')).toEqual(ids('g6'));
    P.learningPathFor('g6')[0].id = 'mutated';
    expect(ids('g6')[0]).toBe('ratioTables');
  });

  it('every practice step can open a generated problem of its first kind at its band', () => {
    for (const band of P.bands) {
      for (const step of P.learningPathFor(band)) {
        if (step.mission) { expect(P.missionIds).toContain(step.mission); continue; }
        expect(P.practiceKinds[step.mode][band], band + ' ' + step.id).toContain(step.kinds[0]);
        const seed = P.seedForKind(step.mode, band, step.kinds[0], 12345, {});
        expect(seed, band + ' ' + step.id).toBeGreaterThanOrEqual(1);
        expect(P.generateProblem(step.mode, band, seed).kind).toBe(step.kinds[0]);
      }
    }
  });

  it('seedForKind skips problems already solved', () => {
    const first = P.seedForKind('percent', 'g7', 'percentChange', 99, {});
    const solved = { ['gen-percent-g7-' + first]: true };
    const next = P.seedForKind('percent', 'g7', 'percentChange', 99, solved);
    expect(next).not.toBe(first);
    expect(P.generateProblem('percent', 'g7', next).kind).toBe('percentChange');
    expect(P.seedForKind('percent', 'g7', 'noSuchKind', 99, {})).toBeNull();
  });

  it('ticks come only from credited kindStats and finished missions, and survive hostile data', () => {
    const [ratioStep, , , mixStep] = P.learningPathFor('g6');
    expect(P.pathStepDone(ratioStep, {})).toBe(false);
    expect(P.pathStepDone(ratioStep, { kindStats: { missingValue: { correct: 0, attempts: 4 } } })).toBe(false);
    expect(P.pathStepDone(ratioStep, { kindStats: { simplify: { correct: 1, attempts: 1 } } })).toBe(true);
    expect(P.pathStepDone(mixStep, { missionsDone: { 'mixture:5': true } })).toBe(true);
    expect(P.pathStepDone(mixStep, { missionsDone: { 'scale:5': true, 'mixtureX:1': true } })).toBe(false);
    for (const bad of [null, 'x', 7, [], { kindStats: 'x', missionsDone: 3 }, { kindStats: { missingValue: 'y' } }, { kindStats: { missingValue: { correct: 'NaN' } } }]) {
      expect(P.pathStepDone(ratioStep, bad)).toBe(false);
      expect(P.pathStepDone(mixStep, bad)).toBe(false);
    }
  });
});

describe('band tab order', () => {
  it('puts the band core first and keeps every mode and mission reachable', () => {
    expect(P.modeOrderFor('g45')[0]).toBe('ratioTable');
    expect(P.modeOrderFor('g6').slice(0, 3)).toEqual(['ratioTable', 'unitRates', 'percent']);
    expect(P.modeOrderFor('g7')[0]).toBe('proportional');
    expect(P.modeOrderFor('g8')[0]).toBe('proportional');
    expect(P.missionOrderFor('g6')[0]).toBe('mixture');
    expect(P.missionOrderFor('g7')[0]).toBe('detective');
    for (const band of P.bands.concat(['nope'])) {
      expect(P.modeOrderFor(band).slice().sort()).toEqual(MODES.slice().sort());
      expect(P.missionOrderFor(band).slice().sort()).toEqual(P.missionIds.slice().sort());
    }
  });
});

describe('tape labels wrap instead of being cut at 12 characters', () => {
  it('wraps words onto two lines of at most 14 characters, and marks a cut with an ellipsis', () => {
    expect(P.wrapTapeLabel('Blue ribbon', 14, 2)).toEqual({ lines: ['Blue ribbon'], truncated: false });
    expect(P.wrapTapeLabel('Orange juice concentrate', 14, 2)).toEqual({ lines: ['Orange juice', 'concentrate'], truncated: false });
    const long = P.wrapTapeLabel('Sparkling water from the second bottle', 14, 2);
    expect(long.truncated).toBe(true);
    expect(long.lines.length).toBe(2);
    expect(long.lines[1].endsWith('…')).toBe(true);
    const word = P.wrapTapeLabel('Fruchtsaftkonzentrat', 14, 2);
    expect(word.lines[0]).toBe('Fruchtsaftkon-');
    expect(word.lines.join('').replace('-', '')).toBe('Fruchtsaftkonzentrat');
    for (const label of ['A', 'Sparkling water from the second bottle', 'Fruchtsaftkonzentratmischung', '  spaced   out  ', '', null]) {
      for (const line of P.wrapTapeLabel(label, 14, 2).lines) expect(line.length, String(label)).toBeLessThanOrEqual(14);
    }
  });
});

describe('literal translator calls only', () => {
  it('the source has no T(...) or questText(...) wrapper calls left', () => {
    const src = readFileSync(FILE, 'utf8');
    expect((src.match(/(?<![\w.$])T\(\s*'stem\./g) || []).length).toBe(0);
    expect((src.match(/(?<![\w.$])questText\(/g) || []).length).toBe(0);
    expect((src.match(/(?<![\w.$])t\('stem\.ratios\./g) || []).length).toBeGreaterThan(1300);
  });

  it('quest labels read the translator of the last render', () => {
    tool.render(makeCtx({ toolData: { _ratioLab: {} }, setToolData: () => {}, t: (key, fallback) => (key.startsWith('stem.ratios.quest_') ? '[fr] ' + fallback : fallback) }));
    expect(tool.questHooks[0].label).toBe('[fr] Explore all 5 representations');
    expect(tool.questHooks[1].progress({ solvedChallenges: {} })).toBe('[fr] 0/5 solved');
    expect(tool.questHooks[2].progress({})).toBe('[fr] Not yet');
  });
});
