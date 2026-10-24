// Math review 3 (ratios lane): from grade 6 up, a $ or % that is not the unit the
// question asks for is not graded correct ("84%" for "What is 35% of 240?", "$25"
// for "45 is what percent of 180?"), and the feedback names the expected unit.
// Below grade 6 the sign is ignored, as before. Grades are read from the
// host's ctx.gradeLevel strings ("Kindergarten", "5th Grade", "College"...).
// MATH_REVIEW3_RATIOS points the suite at another copy (mutation checks).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MATH_REVIEW3_RATIOS || 'stem_lab/stem_tool_ratios.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const MODE_OF = {
  'ratio-paint': 'ratioTable', 'ratio-scale': 'ratioTable',
  'line-tickets': 'numberLine', 'line-running': 'numberLine',
  'unit-speed': 'unitRates',
  'percent-part': 'percent', 'percent-rate': 'percent', 'percent-whole': 'percent',
};

let tool;
let root = null;
beforeEach(() => { resetStemLab(); tool = loadTool(FILE, 'ratioLab'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; });

// Type an answer into one challenge, press "Check answer", return what the student sees.
async function check(gradeLevel, challengeId, answer) {
  const mode = MODE_OF[challengeId];
  const awardXP = vi.fn();
  let latest;
  function App() {
    const [state, setState] = React.useState({
      _ratioLab: {
        mode, challengeId, challengeCursorByMode: { [mode]: challengeId },
        challengeAnswer: answer, challengeAnswerId: challengeId,
      },
    });
    latest = state;
    return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP, gradeLevel }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  const button = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Check answer');
  expect(button, 'Check answer button').toBeTruthy();
  await React.act(async () => { button.click(); });
  const shown = document.getElementById('ratio-challenge-feedback');
  const out = {
    correct: latest._ratioLab.challengeFeedback && latest._ratioLab.challengeFeedback.correct,
    message: shown ? shown.textContent : '',
    solved: !!(latest._ratioLab.solvedChallenges || {})[challengeId],
    paid: awardXP.mock.calls.length,
  };
  await React.act(async () => root.unmount());
  root = null;
  return out;
}

describe('grade 6 and up: the unit sign must fit the question', () => {
  it('"84%" is not accepted for "What is 35% of 240?" and the message asks for a plain number', async () => {
    const r = await check('7th Grade', 'percent-part', '84%');
    expect(r.correct).toBe(false);
    expect(r.solved).toBe(false);
    expect(r.paid).toBe(0);
    expect(r.message).toContain('Check the unit: this question asks for a plain number, not a percent.');
    // The number is right, so the message is about the unit only, not the hint.
    expect(r.message.includes('Write 35% as 0.35'), r.message).toBe(false);
  });

  it('"$25" is not accepted for a percent question and the message asks for a percent', async () => {
    const r = await check('8th Grade', 'percent-rate', '$25');
    expect(r.correct).toBe(false);
    expect(r.paid).toBe(0);
    expect(r.message).toContain('this question asks for a percent, not dollars.');
  });

  it('a percent sign on a dollar question is rejected and names dollars', async () => {
    const r = await check('6th Grade', 'line-tickets', '24%');
    expect(r.correct).toBe(false);
    expect(r.message).toContain('this question asks for dollars, not a percent.');
  });

  it('a labelled quantity names its label ("cups", "mph")', async () => {
    const cups = await check('9th Grade', 'ratio-paint', '$12');
    expect(cups.correct).toBe(false);
    expect(cups.message).toContain('this question asks for cups, not dollars.');
    const mph = await check('College', 'unit-speed', '60%');
    expect(mph.correct).toBe(false);
    expect(mph.message).toContain('this question asks for mph, not a percent.');
  });

  it('the right unit, or no sign at all, is still correct and pays once', async () => {
    for (const [id, typed] of [['percent-part', '84'], ['percent-rate', '25%'], ['percent-rate', '25'],
      ['line-tickets', '$24'], ['line-tickets', '24'], ['ratio-paint', '12'], ['percent-whole', '150']]) {
      const r = await check('7th Grade', id, typed);
      expect(r.correct, id + ' ' + typed).toBe(true);
      expect(r.solved, id + ' ' + typed).toBe(true);
      expect(r.paid, id + ' ' + typed).toBe(1);
    }
  });

  it('a wrong number with a wrong unit gets the unit note and the usual help', async () => {
    const r = await check('7th Grade', 'percent-part', '80%');
    expect(r.correct).toBe(false);
    expect(r.message).toContain('asks for a plain number, not a percent.');
    expect(r.message).toContain('Write 35% as 0.35');
    // The additive-reasoning diagnosis still reaches a student who also typed a unit.
    const additive = await check('7th Grade', 'ratio-paint', '$18');
    expect(additive.message).toContain('asks for cups, not dollars.');
    expect(additive.message).toContain('added 15 to both');
  });

  it('applies at every grade from 6th up, including College and Graduate Level', async () => {
    for (const g of ['6th Grade', '9th Grade', '10th Grade', '12th Grade', 'College', 'Graduate Level']) {
      const r = await check(g, 'percent-part', '84%');
      expect(r.correct, g).toBe(false);
    }
  });
});

describe('below grade 6: unchanged, the sign is ignored', () => {
  it('accepts "84%" and "$25" as before', async () => {
    for (const g of ['Kindergarten', '1st Grade', '3rd Grade', '5th Grade']) {
      const part = await check(g, 'percent-part', '84%');
      expect(part.correct, g + ' 84%').toBe(true);
      expect(part.paid, g + ' 84%').toBe(1);
      const rate = await check(g, 'percent-rate', '$25');
      expect(rate.correct, g + ' $25').toBe(true);
    }
  });
});

describe('reading the grade', () => {
  it('parses every host grade choice and common variants', () => {
    const pure = window.RatioLabPure;
    const choices = ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade',
      '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade', 'College', 'Graduate Level'];
    expect(choices.map((g) => pure.gradeNumberFromLevel(g))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 13]);
    expect(choices.map((g) => pure.strictUnitsForGrade(g))).toEqual(choices.map((g, i) => i >= 6));
    expect(pure.gradeNumberFromLevel('K')).toBe(0);
    expect(pure.gradeNumberFromLevel('Grade 8')).toBe(8);
    expect(pure.gradeNumberFromLevel(7)).toBe(7);
    expect(pure.gradeNumberFromLevel('  6TH GRADE ')).toBe(6);
    // No grade string: fall back to the host band; nothing at all stays lenient.
    expect(pure.strictUnitsForGrade('', 'g68')).toBe(true);
    expect(pure.strictUnitsForGrade(undefined, 'g35')).toBe(false);
    expect(pure.strictUnitsForGrade(undefined, undefined)).toBe(false);
    expect(pure.strictUnitsForGrade('not a grade')).toBe(false);
  });

  it('the pure grader stays lenient unless asked to be strict', () => {
    const pure = window.RatioLabPure;
    const part = pure.challenges.percent.find((c) => c.id === 'percent-part');
    expect(pure.challengeIsCorrect(part, '84%')).toBe(true);
    expect(pure.challengeIsCorrect(part, '84%', { strictUnits: true })).toBe(false);
    expect(pure.challengeIsCorrect(part, '84', { strictUnits: true })).toBe(true);
    expect(pure.challengeUnitProblem(part, '84')).toBeNull();
    expect(pure.challengeUnitProblem(part, '84%')).toEqual({ expected: 'number', typed: 'percent', unit: '' });
  });
});
