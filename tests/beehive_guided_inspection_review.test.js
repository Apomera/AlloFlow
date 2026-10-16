import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.BEEHIVE_TEST_SOURCE || 'stem_lab/stem_tool_beehive.js';
let BH;
let previousExports;
beforeAll(() => {
  previousExports = window.__RR_TEST_EXPORTS__;
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});
afterAll(() => {
  if (previousExports === undefined) delete window.__RR_TEST_EXPORTS__;
  else window.__RR_TEST_EXPORTS__ = previousExports;
});

const review = record => BH.bhGuidedInspectionReview(record);
const reading = (record, id) => review(record).readings.find(item => item.id === id);
const unknown = (id, answer = 'Not recorded') => ({
  id, label: id === 'brood' ? 'Brood pattern' : 'Queen cells', answer,
  expected: 'Not recorded', result: 'unknown', resultLabel: 'Comparison not recorded'
});
function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

describe('guided inspection review preserves the recorded model answer', () => {
  // The original record saves a binary answer and its grade, not a model snapshot.
  // Each row therefore has one historical answer regardless of the colony now.
  it.each([
    ['brood', 'solid', true, 'Solid, mostly continuous', 'Solid, mostly continuous'],
    ['brood', 'solid', false, 'Solid, mostly continuous', 'Spotty, with gaps'],
    ['brood', 'spotty', true, 'Spotty, with gaps', 'Spotty, with gaps'],
    ['brood', 'spotty', false, 'Spotty, with gaps', 'Solid, mostly continuous'],
    ['cells', 'yes', true, 'Yes', 'Yes'],
    ['cells', 'yes', false, 'Yes', 'No'],
    ['cells', 'no', true, 'No', 'No'],
    ['cells', 'no', false, 'No', 'Yes']
  ])('%s answer %s with grade %s retains its historical comparison', (id, answer, correct, answerLabel, expected) => {
    const record = { day: 40, [id]: answer, [id + 'Correct']: correct };
    expect(reading(record, id)).toEqual({
      id, label: id === 'brood' ? 'Brood pattern' : 'Queen cells',
      answer: answerLabel, expected,
      result: correct ? 'match' : 'review',
      resultLabel: correct ? 'Matches model' : 'Review answer'
    });
    const otherId = id === 'brood' ? 'cells' : 'brood';
    expect(reading(record, otherId)).toEqual(unknown(otherId));
  });

  it.each([undefined, null, 0, 1, 'true', 'false', []])
    ('does not invent a model answer from a non-boolean grade %j', grade => {
      const result = review({ day: 40, brood: 'solid', cells: 'no', broodCorrect: grade, cellsCorrect: grade });
      expect(result.readings).toEqual([
        unknown('brood', 'Solid, mostly continuous'), unknown('cells', 'No')
      ]);
    });

  it.each([
    ['', ''], ['Solid, wall to wall', 'Yes'], ['SOLID', 'YES'],
    [null, null], [1, true], [{}, []]
  ])('does not infer an answer from unsupported stored values %j / %j', (brood, cells) => {
    for (const correct of [true, false]) {
      expect(review({ day: 40, brood, cells, broodCorrect: correct, cellsCorrect: correct }).readings)
        .toEqual([unknown('brood'), unknown('cells')]);
    }
  });

  it.each([undefined, null, [], false, 0, 'solid', () => ({ brood: 'solid' })])
    ('handles a missing or malformed record %j without a verdict', record => {
      expect(review(record)).toEqual({ day: null, readings: [unknown('brood'), unknown('cells')] });
    });

  it('does not accept a decorated array as an inspection record', () => {
    const record = Object.assign([], { day: 40, brood: 'solid', broodCorrect: true, cells: 'no', cellsCorrect: true });
    expect(review(record)).toEqual({ day: null, readings: [unknown('brood'), unknown('cells')] });
  });

  it.each([0, 1, 40, Number.MAX_SAFE_INTEGER])('retains valid recorded day %s', day => {
    expect(review({ day }).day).toBe(day);
  });

  it.each([-1, 1.5, '40', null, undefined, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
    ('does not fabricate a recorded day from %j', day => {
      const result = review({ day, brood: 'solid', broodCorrect: true });
      expect(result.day).toBeNull();
      expect(result.readings[0]).toMatchObject({ answer: 'Solid, mostly continuous', expected: 'Solid, mostly continuous', result: 'match' });
    });

  it('grades the two saved observations independently', () => {
    const record = { day: 40, brood: 'spotty', broodCorrect: true, cells: 'no', cellsCorrect: false };
    expect(review(record).readings).toEqual([
      { id: 'brood', label: 'Brood pattern', answer: 'Spotty, with gaps', expected: 'Spotty, with gaps', result: 'match', resultLabel: 'Matches model' },
      { id: 'cells', label: 'Queen cells', answer: 'No', expected: 'Yes', result: 'review', resultLabel: 'Review answer' }
    ]);
    delete record.broodCorrect;
    expect(reading(record, 'brood')).toEqual(unknown('brood', 'Spotty, with gaps'));
    expect(reading(record, 'cells')).toMatchObject({ expected: 'Yes', result: 'review' });
  });

  it('neither changes saved work nor shares mutable review output between calls', () => {
    const record = freezeDeep({ day: 40, brood: 'spotty', broodCorrect: false, cells: 'yes', cellsCorrect: true,
      framesRead: 6, queenFound: true, retained: { notes: ['Keep this observation'] } });
    const saved = structuredClone(record);
    const first = review(record);
    const expected = structuredClone(first);
    first.day = 99;
    first.readings[0].expected = 'Changed by a caller';
    first.readings.push({ id: 'extra' });
    expect(record).toEqual(saved);
    expect(review(record)).toEqual(expected);
  });
});

function renderReview(record, changes = {}) {
  const toolData = { beehive: {
    viewMode: 'beekeeper', tutorialDone: true, motionPaused: true, soundOn: false,
    autoAdvance: false, day: 40, workers: 24000, queenHealth: 30, capacity: 80,
    honey: 60, pollen: 20, brood: 8000, morale: 80, varroaLevel: 5, actionPoints: 3,
    simulationSeed: 2468, randomState: 1357, seededFromDay: 0, colonySurvived: true,
    lastInspection: record, inspectionDraft: {}, inspectionsDone: 7,
    beekeeperNotebook: { prediction: 'Keep my prediction', evidence: 'Keep my evidence', explanation: 'Keep my explanation' },
    ...changes
  } };
  const before = structuredClone(toolData);
  const callbacks = { setToolData: vi.fn(), setLabToolData: vi.fn(), update: vi.fn(), updateMulti: vi.fn(), awardXP: vi.fn() };
  const markup = renderTool('beehive', toolData, callbacks);
  const template = document.createElement('template');
  template.innerHTML = markup;
  const feedback = template.content.querySelector('[data-inspection-feedback="true"]');
  expect(feedback).toBeTruthy();
  expect(feedback.getAttribute('role')).toBe('status');
  expect(feedback.textContent).toContain('Recorded inspection');
  expect(feedback.textContent).toContain('Day 40');
  expect(toolData).toEqual(before);
  for (const callback of Object.values(callbacks)) expect(callback).not.toHaveBeenCalled();
  return feedback;
}

function assertRenderedReading(feedback, id, answer, expected, result, resultLabel) {
  const card = feedback.querySelector('[data-inspection-result="' + id + '"]');
  expect(card).toBeTruthy();
  expect(card.getAttribute('data-result')).toBe(result);
  expect(card.textContent).toContain(id === 'brood' ? 'Brood pattern' : 'Queen cells');
  expect(card.querySelector('[data-inspection-answer]').textContent).toBe(answer);
  expect(card.querySelector('[data-inspection-expected]').textContent).toBe(expected);
  expect(card.querySelector('[data-inspection-verdict]').textContent).toBe(resultLabel);
  expect(Array.from(card.querySelectorAll('dt'), item => item.textContent))
    .toEqual(['Your answer', 'Model answer when recorded']);
}

describe('rendered inspection feedback keeps recorded evidence separate from live readings', () => {
  it.each([
    ['spotty', 'yes', true, 'Spotty, with gaps', 'Yes', 'match', 'Matches model'],
    ['solid', 'no', false, 'Solid, mostly continuous', 'No', 'review', 'Review answer']
  ])('keeps %s / %s feedback after queen and capacity readings change', (brood, cells, correct, broodLabel, cellsLabel, result, resultLabel) => {
    const record = freezeDeep({ day: 40, framesRead: 6, queenFound: true, brood, cells,
      broodCorrect: correct, cellsCorrect: correct });
    const variations = [{}, { queenHealth: 100 }, { queenHealth: 100, capacity: 200 }];
    const feedbackText = variations.map(changes => {
      const feedback = renderReview(record, changes);
      assertRenderedReading(feedback, 'brood', broodLabel, 'Spotty, with gaps', result, resultLabel);
      assertRenderedReading(feedback, 'cells', cellsLabel, 'Yes', result, resultLabel);
      return feedback.textContent;
    });
    expect(new Set(feedbackText).size).toBe(1);
  });

  it('shows missing comparisons explicitly instead of grading an incomplete old record from the colony now', () => {
    const record = freezeDeep({ day: 40, brood: 'solid', cells: 'no', broodCorrect: 'true', cellsCorrect: null });
    const feedback = renderReview(record, { queenHealth: 100, capacity: 200 });
    assertRenderedReading(feedback, 'brood', 'Solid, mostly continuous', 'Not recorded', 'unknown', 'Comparison not recorded');
    assertRenderedReading(feedback, 'cells', 'No', 'Not recorded', 'unknown', 'Comparison not recorded');
    expect(feedback.textContent).not.toContain('Matches model');
    expect(feedback.textContent).not.toContain('Review answer');
  });
});
