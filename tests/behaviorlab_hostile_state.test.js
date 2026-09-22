import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => resetStemLab());

// toolData is PERSISTED. Every value here is one a real save can hold: written
// by an older build, left behind by a level the learner abandoned, or produced
// by a key whose shape changed. A tool that throws on its own restored save
// blanks the lab, and the failure looks like "the tool is broken" rather than
// "one key is stale".
//
// Two crash classes this repo has shipped before are represented directly:
// a persisted index pointing past the end of its array, and `{}` reaching a
// React child slot ("Objects are not valid as a React child").
const render = (data) => {
  loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
  return renderTool('behaviorLab', data);
};

describe('Behavior Lab survives a hostile persisted state', () => {
  it('survives an unknown level id', () => {
    // A save from a build with more levels, or a hand-edited store.
    for (const blLevel of [0, -1, 99, 4.5]) {
      const html = render({ blLevel, blPhase: 'running' });
      expect(html.length, `level ${blLevel} blanked the lab`).toBeGreaterThan(2000);
    }
  });

  it('survives indices pointing past the end of their arrays', () => {
    const html = render({
      blLevel: 1, blPhase: 'running',
      blShowGlossary: true, blGlossaryIdx: 9999,
      blShowMeasurement: true, blMeasurementIdx: 9999,
      blShowSleuth: true, blSleuthIdx: 9999,
    });
    expect(html.length).toBeGreaterThan(2000);
  });

  it('survives a cumulative record with missing and malformed points', () => {
    // The description helper reads .tick and .cum off every entry.
    const html = render({
      blLevel: 1, blPhase: 'running',
      blCumRecord: [
        { tick: 0, cum: 0 },
        { tick: null, cum: null },
        {},
        { tick: 5 },
        { cum: 3 },
        { tick: 'x', cum: 'y' },
        { tick: 9, cum: 4 },
      ],
    });
    expect(html.length).toBeGreaterThan(2000);
    // It must not print NaN at the reader.
    const desc = html.match(/id="bl-cumrecord-desc"[^>]*>([\s\S]*?)<\/p>/);
    expect(desc).toBeTruthy();
    expect(desc[1]).not.toContain('NaN');
    expect(desc[1]).not.toContain('undefined');
  });

  it('survives a cumulative record that runs backwards', () => {
    // Cumulative records cannot fall; a corrupted save can still say they do.
    const html = render({
      blLevel: 1, blPhase: 'running',
      blCumRecord: [{ tick: 0, cum: 50 }, { tick: 10, cum: 20 }, { tick: 20, cum: 5 }],
    });
    expect(html.length).toBeGreaterThan(2000);
    const desc = html.match(/id="bl-cumrecord-desc"[^>]*>([\s\S]*?)<\/p>/);
    expect(desc[1]).not.toContain('NaN');
    expect(desc[1]).not.toContain('-');
  });

  it('survives an unknown extinction prediction token', () => {
    const html = render({
      blLevel: 3, blPhase: 'complete', blExtPrediction: 'not-an-option',
    });
    expect(html.length).toBeGreaterThan(2000);
    expect(html).toContain('You predicted:');
  });

  it('survives objects and arrays where scalars are expected', () => {
    // The "Objects are not valid as a React child" blanking class.
    const html = render({
      blLevel: 1, blPhase: 'running',
      blLevelScore: {}, blReinforcements: [], blTick: {},
      blSandboxTarget: {}, blExtPrediction: {},
    });
    expect(html.length).toBeGreaterThan(2000);
  });

  it('survives a completed run whose counters are absent', () => {
    // The completion screen divides by blTick for the star rating and rate.
    const html = render({ blLevel: 1, blPhase: 'complete' });
    expect(html.length).toBeGreaterThan(2000);
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
  });
});
