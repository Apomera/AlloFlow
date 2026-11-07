// Cellular Automaton Lab stage C (2026-11-03): the pure pieces behind the
// learning path, the tab order, the ant sonification and the Langton's-ant
// "jump to 11,000" check, run directly.
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const TOOL_FILE = process.env.CELLULAR_TOOL_FILE || 'stem_lab/stem_tool_cellular.js';
let P;
beforeEach(() => { resetStemLab(); loadTool(TOOL_FILE, 'cellularLab'); P = window.__alloCellularPure; });

describe('learning path', () => {
  it('has 3 to 6 ordered steps per band, each pointing at a real section', () => {
    for (const band of ['k5', 'g68', 'g912']) {
      const s = P.pathSteps(band, {}, {});
      expect(s.length).toBeGreaterThanOrEqual(3);
      expect(s.length).toBeLessThanOrEqual(6);
      for (const st of s) { expect(P.TAB_ORDERS[band]).toContain(st.tab); expect(st.done).toBe(false); }
    }
  });
  it('ticks come only from saved progress, with the stated thresholds', () => {
    const k5 = (p, x) => P.pathSteps('k5', p, x).map((s) => s.done);
    expect(k5({ drew: true, maxGen: 9 }, {})).toEqual([false, false, false]);
    expect(k5({ drew: true, maxGen: 10 }, { notice: 2, gliderDone: true })).toEqual([true, true, true]);
    expect(k5({ drew: 'yes', maxGen: 50 }, { notice: 1 })).toEqual([false, false, false]);
    const g68 = P.pathSteps('g68', {}, { challenges: 1, ngSolved: 3, cerDone: 1, missionsDone: 0 });
    expect(g68.map((s) => [s.id, s.done, s.have])).toEqual([['challenges', false, 1], ['practice', true, 3], ['cer', true, undefined], ['missions', false, undefined]]);
    const g912 = P.pathSteps('g912', { exploredRule: true }, { classSolved: 7, huntCompared: true, ffDone: false });
    expect(g912.map((s) => s.done)).toEqual([false, true, true, false]);
    expect(g912[1].have).toBe(3);
    // Hostile input never throws and never ticks.
    expect(P.pathSteps('g912', 'junk', null).every((s) => s.done === false)).toBe(true);
  });
  it('every band keeps every section in its order, with Life first', () => {
    const all = ['life', 'rules', 'patterns', 'worlds', 'practice', 'investigate', 'missions', 'learn', 'teacher'];
    for (const band of ['k5', 'g68', 'g912']) {
      expect([...P.TAB_ORDERS[band]].sort()).toEqual([...all].sort());
      expect(P.TAB_ORDERS[band][0]).toBe('life');
    }
  });
});

describe('Langton’s ant', () => {
  it('the note rises one octave every 20 squares from the start, capped at 3 octaves', () => {
    expect(P.antPitch({ r: 0, c: 0 })).toBe(220);
    expect(P.antPitch({ r: 12, c: 16 })).toBeCloseTo(440, 9);
    expect(P.antPitch({ r: 500, c: 500 })).toBe(1760);
    // On the highway the distance keeps growing, so the note climbs.
    const a = P.antPitch(P.antAt(10400)), b = P.antPitch(P.antAt(11000));
    expect(b).toBeGreaterThan(a);
  });
  it('jumping straight to step 11,000 lands exactly where stepping one at a time does, and is fast', () => {
    const one = P.antInit();
    for (let i = 0; i < 11000; i++) P.antAdvance(one, 1);
    const t0 = performance.now();
    const jump = P.antAdvance(P.antInit(), 11000);
    const ms = performance.now() - t0;
    const st = jump && jump.step != null ? jump : P.antAt(11000);
    expect([st.step, st.r, st.c, st.dir, st.blackCount]).toEqual([one.step, one.r, one.c, one.dir, one.blackCount]);
    expect(ms).toBeLessThan(1000);
    expect(P.antHighway().onset).toBeLessThan(11000);
  });
});
