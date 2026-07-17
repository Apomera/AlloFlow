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

  it('uses named forms for starting and completing an estimate', () => {
    expect(estimator).toContain("'aria-labelledby': 'learning-lab-time-new-heading'");
    expect(estimator).toContain("'aria-labelledby': 'learning-lab-time-review-heading'");
    expect(estimator).toContain("onSubmit: function(event) { event.preventDefault(); startTimer(); }");
    expect(estimator).toContain("onSubmit: function(event) { event.preventDefault(); logComplete(); }");
  });

  it('associates task, predicted, actual, and notes fields with labels', () => {
    for (const field of ['task', 'predicted', 'actual', 'notes']) {
      expect(estimator).toContain(`htmlFor: 'learning-lab-time-${field}'`);
      expect(estimator).toContain(`id: 'learning-lab-time-${field}'`);
    }
  });

  it('reports and focuses a missing task without a browser alert', () => {
    expect(estimator).toContain("setTaskError('Enter a task name before starting the timer.')");
    expect(estimator).toContain("focusById('learning-lab-time-task')");
    expect(estimator).toContain("id: 'learning-lab-time-task-error', role: 'alert'");
    expect(estimator).toContain("'aria-invalid': taskError ? 'true' : undefined");
    expect(estimator).not.toContain("alert('Need a task name.')");
  });

  it('exposes the predicted duration with a labeled range and live output', () => {
    expect(estimator).toContain("id: 'learning-lab-time-predicted', type: 'range'");
    expect(estimator).toContain("id: 'learning-lab-time-predicted-output', htmlFor: 'learning-lab-time-predicted', 'aria-live': 'polite'");
    expect(estimator).toContain("'aria-describedby': 'learning-lab-time-predicted-help'");
  });

  it('uses explicit stopping state instead of inferring it from a duration', () => {
    expect(estimator).toContain("var ss = R.useState(false); var isStopping = ss[0]; var setIsStopping = ss[1];");
    expect(estimator).toContain('setIsStopping(true);');
    expect(estimator).toContain("isStopping ? hh('form'");
    expect(estimator).not.toContain('endForm.actualMin !== 30');
  });

  it('validates actual minutes and focuses the invalid field', () => {
    expect(estimator).toContain("actual < 1 || actual > 1440");
    expect(estimator).toContain("setActualError('Enter an actual time from 1 to 1,440 minutes.')");
    expect(estimator).toContain("focusById('learning-lab-time-actual')");
    expect(estimator).toContain("id: 'learning-lab-time-actual-error', role: 'alert'");
  });

  it('moves focus after starting and stopping', () => {
    expect(estimator).toContain("focusById('learning-lab-time-active-heading')");
    expect(estimator).toContain("id: 'learning-lab-time-active-heading', tabIndex: -1");
    expect(estimator).toContain("focusById('learning-lab-time-actual')");
  });

  it('announces timer and record state changes', () => {
    expect(estimator).toContain("llAnnounce('Timer started for '");
    expect(estimator).toContain("llAnnounce('Timer stopped. Review and log the actual time.')");
    expect(estimator).toContain("llAnnounce('Time estimate logged for '");
    expect(estimator).toContain("llAnnounce('Timer canceled for '");
    expect(estimator).toContain("llAnnounce('Time estimate deleted.')");
  });

  it('preserves unrelated section data when saving and deleting', () => {
    expect(estimator).toContain("setData(Object.assign({}, data, { predictions: [prediction].concat(data.predictions || []) }))");
    expect(estimator).toContain("setData(Object.assign({}, data, { predictions: (data.predictions || []).filter");
  });

  it('confirms timer cancellation and estimate deletion in app dialogs', () => {
    expect(estimator).toContain("title: 'Cancel this timer?', confirmText: 'Cancel timer'");
    expect(estimator).toContain("title: 'Delete this time estimate?', confirmText: 'Delete estimate'");
    expect(estimator).not.toContain('confirm(');
  });

  it('uses semantic labeled sections, lists, and history articles', () => {
    expect(estimator).toContain("'aria-labelledby': 'learning-lab-time-calibration-heading'");
    expect(estimator).toContain("'aria-labelledby': 'learning-lab-time-history-heading'");
    expect(estimator).toContain("hh('ul', { style:");
    expect(estimator).toContain("return hh('li', { key: 'pr-' + prediction.id");
    expect(estimator).toContain("hh('article', { 'aria-label': prediction.task");
  });

  it('does not rely on color alone for estimate accuracy', () => {
    expect(estimator).toContain("'close estimate' : Math.abs(diffPct) <= 30 ? 'moderate difference' : 'large difference'");
    expect(estimator).toContain("+ diffPct + '% (' + accuracyLabel + ')'");
    expect(estimator).toContain('calibrationText');
  });

  it('provides named 44-pixel controls and fields', () => {
    expect(estimator).toContain("'aria-label': 'Delete time estimate for ' + prediction.task");
    expect(estimator).toContain('minWidth: 44, minHeight: 44');
    expect(estimator).toContain("minHeight: 44, padding: '9px 14px'");
    expect(estimator).toContain("width: '100%', minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
