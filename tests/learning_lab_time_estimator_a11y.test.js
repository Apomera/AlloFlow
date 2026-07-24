import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Time Estimator accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalTimeEstimator(props) {');
  const end = source.indexOf('  function PersonalDistractionLog(props) {', start);
  const estimator = source.slice(start, end);

  it('frames comparisons as optional, neutral, and non-diagnostic', () => {
    expect(estimator).toContain('Differences are neutral observations, not scores');
    expect(estimator).toContain('Tasks are not assumed to be comparable.');
    expect(estimator).not.toContain('ADHD students typically under-estimate');
    expect(estimator).not.toContain('Calibration improves with practice');
  });

  it('provides privacy and data-control guidance', () => {
    expect(estimator).toContain('Task names and notes can reveal schedules, work, health information, or identity.');
    expect(estimator).toContain('does not itself notify a teacher, school, employer, clinician, or family member');
    expect(estimator).toContain('delete entries you no longer want stored');
  });

  it('requires a deliberate native number prediction with no default', () => {
    expect(estimator).toContain("R.useState({ task: '', predictedMin: '' })");
    expect(estimator).toContain("id: 'learning-lab-time-predicted', type: 'number'");
    expect(estimator).toContain('min: 1, max: 1440');
    expect(estimator).toContain('No value is selected for you.');
    expect(estimator).not.toContain("type: 'range'");
    expect(estimator).not.toContain('predictedMin: 30');
  });

  it('uses named forms and conditionally rendered errors', () => {
    expect(estimator).toContain("'aria-labelledby': 'learning-lab-time-new-heading'");
    expect(estimator).toContain("'aria-labelledby': 'learning-lab-time-review-heading'");
    expect(estimator).toContain("startErrors.task ? hh('p', { id: 'learning-lab-time-task-error', role: 'alert'");
    expect(estimator).toContain("startErrors.predicted ? hh('p', { id: 'learning-lab-time-predicted-error', role: 'alert'");
    expect(estimator).toContain("actualError ? hh('p', { id: 'learning-lab-time-actual-error', role: 'alert'");
  });

  it('associates task, predicted, actual, and notes fields', () => {
    for (const field of ['task', 'predicted', 'actual', 'notes']) {
      expect(estimator).toContain("htmlFor: 'learning-lab-time-" + field + "'");
      expect(estimator).toContain("id: 'learning-lab-time-" + field + "'");
    }
    expect(estimator).toContain('maxLength: 2000');
  });

  it('manages focus after validation, start, stop, save, cancel, and deletion', () => {
    expect(estimator).toContain("nextErrors.task ? 'learning-lab-time-task' : 'learning-lab-time-predicted'");
    expect(estimator).toContain("queueFocus('learning-lab-time-active-heading')");
    expect(estimator).toContain("queueFocus('learning-lab-time-review-heading')");
    expect(estimator).toContain("queueFocus('learning-lab-time-entry-heading-' + prediction.id)");
    expect(estimator).toContain("queueFocus('learning-lab-time-task')");
    expect(estimator).toContain("queueFocus('learning-lab-time-history-heading')");
  });

  it('returns task and prediction to the form after confirmed cancellation', () => {
    expect(estimator).toContain("title: 'Cancel this timer?', confirmText: 'Cancel timer'");
    expect(estimator).toContain("setForm({ task: task, predictedMin: String(predicted) })");
    expect(estimator).toContain('The task and prediction remain in the form.');
  });

  it('uses neutral per-task minute differences without aggregate scoring', () => {
    expect(estimator).toContain("'Recorded and predicted durations are the same.'");
    expect(estimator).toContain("' longer' : ' shorter'");
    expect(estimator).toContain("'Difference not available.'");
    expect(estimator).not.toContain('avgRatio');
    expect(estimator).not.toContain('calibrationText');
    expect(estimator).not.toContain('close estimate');
    expect(estimator).not.toContain('large difference');
  });

  it('renders every history record with semantic headings and robust dates', () => {
    expect(estimator).toContain("'aria-label': 'All saved time comparisons'");
    expect(estimator).toContain('predictions.map(function(prediction, index)');
    expect(estimator).not.toContain('predictions.slice(0, 15)');
    expect(estimator).toContain("hh('article', { 'aria-labelledby': headingId }");
    expect(estimator).toContain("hh('time', { dateTime: date.dateTime }");
    expect(estimator).toContain("'Date not recorded'");
  });

  it('deletes legacy records by reference and preserves unrelated data', () => {
    expect(estimator).toContain('predictions.filter(function(item) { return item !== prediction; })');
    expect(estimator).toContain("title: 'Delete this time comparison?', confirmText: 'Delete comparison'");
    expect(estimator).toContain('setData(Object.assign({}, data, { predictions:');
    expect(estimator).not.toContain('setData({ predictions:');
  });

  it('updates the catalog without a calibration score claim', () => {
    expect(source).toContain("desc: 'Optional predicted and recorded task-duration comparisons'");
    expect(source).toContain("'Compare a predicted task duration with a recorded duration; no score.'");
    expect(source).not.toContain('see your calibration percentage');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
