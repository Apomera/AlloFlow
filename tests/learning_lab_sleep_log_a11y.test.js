import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Sleep Logger accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalSleepLog(props) {');
  const end = source.indexOf('  function PersonalLearningJournal(props) {', start);
  const sleepLog = source.slice(start, end);

  it('uses a labeled form with Enter submission', () => {
    expect(sleepLog).toContain("onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(sleepLog).toContain("'aria-labelledby': 'learning-lab-sleep-form-heading'");
    expect(sleepLog).toContain("hh('button', { type: 'submit'");
  });

  it('associates required bedtime and wake-time controls', () => {
    expect(sleepLog).toContain("htmlFor: 'learning-lab-sleep-bedtime'");
    expect(sleepLog).toContain("id: 'learning-lab-sleep-bedtime', type: 'time'");
    expect(sleepLog).toContain("htmlFor: 'learning-lab-sleep-waketime'");
    expect(sleepLog).toContain("id: 'learning-lab-sleep-waketime', type: 'time'");
    expect(sleepLog.match(/required: true, 'aria-invalid': timeError/g)?.length).toBe(2);
  });

  it('reports invalid sleep periods inline and focuses the relevant field', () => {
    expect(sleepLog).toContain("'Bedtime and wake time are required.'");
    expect(sleepLog).toContain("'Bedtime and wake time must describe a sleep period longer than zero hours.'");
    expect(sleepLog).toContain("id: 'learning-lab-sleep-time-error', role: 'alert'");
    expect(sleepLog).toContain("document.getElementById(!form.bedtime ? 'learning-lab-sleep-bedtime' : 'learning-lab-sleep-waketime')");
  });

  it('announces the calculated sleep duration', () => {
    expect(sleepLog).toContain("role: 'status', 'aria-live': 'polite'");
    expect(sleepLog).toContain("'Calculated total:'");
    expect(sleepLog).toContain("totalHours() + ' hours'");
  });

  it('labels sleep quality and exposes an understandable slider value', () => {
    expect(sleepLog).toContain("htmlFor: 'learning-lab-sleep-quality'");
    expect(sleepLog).toContain("id: 'learning-lab-sleep-quality', type: 'range'");
    expect(sleepLog).toContain("'aria-valuetext': form.quality + ' out of 5'");
    expect(sleepLog).toContain("minHeight: 44, accentColor: '#3b82f6'");
  });

  it('exposes sleep factors as a named multi-select group', () => {
    expect(sleepLog).toContain("role: 'group', 'aria-labelledby': 'learning-lab-sleep-factors-label'");
    expect(sleepLog).toContain("'aria-pressed': on ? 'true' : 'false'");
    expect(sleepLog).toContain("minHeight: 44, padding: '6px 10px'");
  });

  it('provides a text alternative for the seven-night chart', () => {
    expect(sleepLog).toContain("var chartSummary = chartDays.map");
    expect(sleepLog).toContain("role: 'img', 'aria-label': 'Sleep hours for the last seven nights. ' + chartSummary");
    expect(sleepLog).toContain("'aria-hidden': 'true'");
    expect(sleepLog).toContain("toLocaleDateString('en-US', { weekday: 'short' })");
  });

  it('uses semantic history with named 44-pixel deletion', () => {
    expect(sleepLog).toContain("'aria-labelledby': 'learning-lab-sleep-history-heading'");
    expect(sleepLog).toContain("id: 'learning-lab-sleep-history-heading'");
    expect(sleepLog).toContain("return hh('li', { key: 'le-' + entry.id");
    expect(sleepLog).toContain("'aria-label': 'Delete sleep log from ' + entry.date");
    expect(sleepLog).toContain("minWidth: 44, minHeight: 44");
  });

  it('confirms deletion through the app dialog', () => {
    expect(sleepLog).toContain("title: 'Delete this sleep log?', confirmText: 'Delete log'");
    expect(sleepLog).not.toContain("confirm('");
  });

  it('announces successful save and deletion', () => {
    expect(sleepLog).toContain("llAnnounce('Sleep log saved. '");
    expect(sleepLog).toContain("llAnnounce('Sleep log deleted.')");
  });

  it('preserves unrelated section data when updating entries', () => {
    expect(sleepLog).toContain("setData(Object.assign({}, data, { entries:");
    expect(sleepLog).not.toContain("setData({ entries:");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
