import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab personal Sleep Log accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalSleepLog(props) {');
  const end = source.indexOf('  function PersonalLearningJournal(props) {', start);
  const sleepLog = source.slice(start, end);

  it('starts health-related fields unselected and makes quality optional', () => {
    expect(sleepLog).toContain("var EMPTY_FORM = { bedtime: '', waketime: '', quality: '', factors: [] }");
    expect(sleepLog).toContain("hh('option', { value: '' }, 'Not rated')");
    expect(sleepLog).not.toContain("bedtime: '22:30'");
    expect(sleepLog).not.toContain('quality: 4');
  });

  it('states measurement, medical, safety, sharing, and privacy limits', () => {
    expect(sleepLog).toContain('does not measure time asleep');
    expect(sleepLog).toContain('does not diagnose a sleep condition or decide whether an amount is enough');
    expect(sleepLog).toContain('Sleep needs vary with age and individual circumstances');
    expect(sleepLog).toContain('not automatically shared with a clinician');
    expect(sleepLog).toContain('Do not drive or operate equipment when too sleepy');
  });

  it('does not average ordinal quality ratings or classify hours as good or bad', () => {
    expect(sleepLog).not.toContain('avgQuality');
    expect(sleepLog).not.toContain('hours >= 8');
    expect(sleepLog).not.toContain('hours >= 7');
    expect(sleepLog).toContain('No duration is categorized as good or bad.');
    expect(sleepLog).toContain('Average entered interval across ');
  });

  it('uses a native form with conditional errors and post-render focus', () => {
    expect(sleepLog).toContain("onSubmit: save, 'aria-labelledby': 'learning-lab-sleep-form-heading'");
    expect(sleepLog).toContain('var pendingFocusRef = R.useRef(null);');
    expect(sleepLog).toContain('R.useLayoutEffect(function()');
    expect(sleepLog).toContain("timeError ? hh('div', { id: 'learning-lab-sleep-time-error', role: 'alert'");
    expect(sleepLog).toContain("requestFocus(!form.bedtime ? 'learning-lab-sleep-bedtime' : 'learning-lab-sleep-waketime')");
    expect(sleepLog).not.toContain('setTimeout(function()');
  });

  it('associates required time fields with the explicit interval assumption', () => {
    expect(sleepLog).toContain("htmlFor: 'learning-lab-sleep-bedtime'");
    expect(sleepLog).toContain("id: 'learning-lab-sleep-bedtime', type: 'time'");
    expect(sleepLog).toContain("htmlFor: 'learning-lab-sleep-waketime'");
    expect(sleepLog).toContain("id: 'learning-lab-sleep-waketime', type: 'time'");
    expect(sleepLog).toContain("'learning-lab-sleep-interval-note'");
  });

  it('uses native checkboxes with neutral, non-causal factor language', () => {
    expect(sleepLog).toContain("hh('input', { type: 'checkbox', checked: checked");
    expect(sleepLog).toContain('These labels record context only.');
    expect(sleepLog).not.toContain("good: true");
    expect(sleepLog).not.toContain("good: false");
    expect(sleepLog).not.toContain("'aria-pressed': on");
  });

  it('uses semantic summary, calendar table, complete history, and robust times', () => {
    expect(sleepLog).toContain("hh('dl'");
    expect(sleepLog).toContain("hh('table'");
    expect(sleepLog).toContain("hh('th', { scope: 'col'");
    expect(sleepLog).toContain("'aria-label': 'All personal sleep logs'");
    expect(sleepLog).toContain('entries.map(function(entry, index)');
    expect(sleepLog).not.toContain('entries.slice(0, 14)');
    expect(sleepLog).toContain("hh('time', { dateTime: safeDateTime(entry.date) }");
  });

  it('confirms deletion, restores focus, and preserves sibling data', () => {
    expect(sleepLog).toContain("title: 'Delete this sleep log?', confirmText: 'Delete log'");
    expect(sleepLog).toContain('async function remove(id, legacyEntry)');
    expect(sleepLog).toContain('item !== legacyEntry');
    expect(sleepLog).toContain("requestFocus(removedToday || !remaining.length ? 'learning-lab-sleep-form-heading' : 'learning-lab-sleep-history-heading')");
    expect(sleepLog).toContain("setData(Object.assign({}, data, { entries:");
    expect(sleepLog).not.toContain('setData({ entries:');
  });

  it('updates catalog copy without diagnostic or chart claims', () => {
    expect(source).toContain('Optional start/end times, how-it-felt rating, and context observations; not diagnostic.');
    expect(source).not.toContain('8 sleep-factor check-ins + trend chart');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
