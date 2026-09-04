import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab'); });
function finish(round, wrong = []) {
  const core = window.__FisherLabCore;
  while (round.phase !== 'results') {
    const index = round.indices[round.cursor];
    const q = core.getCoreQuizQuestion(index);
    round = core.answerCoreQuizRound(round, wrong.includes(index) ? (q.correct + 1) % q.a.length : q.correct);
    round = core.advanceCoreQuizRound(round);
  }
  return round;
}
describe('Fisher Lab finite quiz rounds', () => {
  it('creates bounded quick and full rounds and wraps without duplicate questions', () => {
    const core = window.__FisherLabCore, total = core.getCoreQuizAnswerDistribution().total;
    expect(core.createCoreQuizRound('quick', 0).indices).toEqual([0, 1, 2, 3, 4]);
    expect(core.createCoreQuizRound('quick', total - 2).indices).toEqual([total - 2, total - 1, 0, 1, 2]);
    const full = core.createCoreQuizRound('full', 3);
    expect(full.indices).toHaveLength(total);
    expect(new Set(full.indices).size).toBe(total);
    expect(core.createCoreQuizRound('invalid', Infinity).indices).toHaveLength(5);
  });
  it('locks the first answer, rejects invalid options, and advances only after answering', () => {
    const core = window.__FisherLabCore;
    const round = core.createCoreQuizRound('quick');
    expect(core.advanceCoreQuizRound(round)).toBe(round);
    for (const invalid of [-1, 99, 1.5, '1', NaN]) expect(core.answerCoreQuizRound(round, invalid)).toBe(round);
    const answered = core.answerCoreQuizRound(round, 0);
    expect(round.answers).toEqual({});
    expect(core.answerCoreQuizRound(answered, 1)).toBe(answered);
    const next = core.advanceCoreQuizRound(answered);
    expect(next.cursor).toBe(1);
    expect(core.advanceCoreQuizRound(next)).toBe(next);
  });
  it('retries only missed questions and preserves the original score across repeated retries', () => {
    const core = window.__FisherLabCore;
    const original = finish(core.createCoreQuizRound('quick'), [1, 3]);
    expect(core.summarizeCoreQuizRound(original)).toMatchObject({ correct: 3, total: 5, missed: [1, 3] });
    let retry = core.retryCoreQuizRound(original);
    expect(retry.indices).toEqual([1, 3]);
    expect(retry.answers).toEqual({});
    retry = finish(retry, [3]);
    expect(retry.firstPass).toEqual({ correct: 3, total: 5 });
    const again = finish(core.retryCoreQuizRound(retry));
    expect(again.indices).toEqual([3]);
    expect(again.firstPass).toEqual({ correct: 3, total: 5 });
    expect(core.summarizeCoreQuizRound(again).correct).toBe(1);
    expect(core.retryCoreQuizRound(again)).toBe(again);
    expect(core.createCoreQuizRound('quick', again.nextStart).indices).toEqual([5, 6, 7, 8, 9]);
  });
  it('does not accept answers or advance a completed round', () => {
    const core = window.__FisherLabCore;
    const done = finish(core.createCoreQuizRound('quick'));
    expect(core.answerCoreQuizRound(done, 0)).toBe(done);
    expect(core.advanceCoreQuizRound(done)).toBe(done);
    expect(core.retryCoreQuizRound(core.createCoreQuizRound('quick')).phase).toBe('question');
  });
  it('returns detached question options and source-backed, unambiguous opening questions', () => {
    const core = window.__FisherLabCore;
    const buoy = core.getCoreQuizQuestion(0);
    expect(buoy.q).toContain('side of your boat');
    expect(buoy.a[buoy.correct]).toBe('Starboard (right)');
    buoy.a[buoy.correct] = 'modified';
    expect(core.getCoreQuizQuestion(0).a).not.toContain('modified');
    const slack = core.getCoreQuizQuestion(4);
    expect(slack.a[slack.correct]).toBe('A period when tidal current is weak or near zero');
    expect(slack.sourceUrl).toContain('oceanservice.noaa.gov');
    expect(slack.explain).not.toContain('best fishing');
    expect(core.getCoreQuizQuestion(-1)).toBeNull();
  });
});
