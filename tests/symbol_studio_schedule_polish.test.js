import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const source = read('symbol_studio_module.js');
const scheduleStart = source.indexOf('function renderScheduleTab()');
const scheduleEnd = source.indexOf('function renderStoriesTab()', scheduleStart);
const schedule = source.slice(scheduleStart, scheduleEnd);

describe('Symbol Studio visual schedule polish', () => {
  it('uses ordered list semantics without nested pseudo-buttons', () => {
    expect(schedule).toContain("role: 'list'");
    expect(schedule).toContain("role: 'listitem'");
    expect(schedule).toContain("'aria-current': isNow ? 'step' : undefined");
    expect(schedule).toContain("'aria-labelledby': 'ss-schedule-step-' + item.id");
    expect(schedule).not.toContain("role: 'button', tabIndex: 0, 'aria-pressed': isDone");
  });

  it('provides explicit completion, current-step, reorder, and remove controls', () => {
    expect(schedule).toContain("'aria-pressed': isDone");
    expect(schedule).toContain("'Move ' + item.label + ' earlier'");
    expect(schedule).toContain("'Move ' + item.label + ' later'");
    expect(schedule).toContain("'Remove ' + item.label + ' from schedule'");
    expect(schedule).toContain("minHeight: '44px', minWidth: '44px'");
    expect(schedule).toContain("id: 'ss-schedule-reorder-help'");
  });

  it('announces and restores focus after schedule reordering', () => {
    expect(source).toContain('var announceScheduleChange = function (message)');
    expect(source).toContain("document.querySelectorAll('[data-schedule-move-id]')");
    expect(source).toContain("focusScheduleMoveControl(moved.id)");
    expect(source).toContain("' moved to step ' + (to + 1) + ' of ' + next.length");
  });

  it('advances to unfinished work and clears Now when every step is complete', () => {
    expect(source).toContain("nextItems.find(function (item, index) { return index > currentIndex && !item.complete; })");
    expect(source).toContain("|| nextItems.find(function (item) { return !item.complete; })");
    expect(source).toContain("setSchedNowId(next ? next.id : null)");
    expect(source).toContain("if (changed && !changed.complete && !schedNowId) setSchedNowId(changed.id)");
  });

  it('isolates drafts and stale image generations across student profiles', () => {
    expect(source).toContain('schedGenerationEpochRef.current += 1');
    expect(source).toContain("setBoardTopic(''); setBoardWords([]); setBoardPages(null)");
    expect(source).toContain("setSchedItems([]); setSchedInput(''); setSchedTitle(''); setSchedNowId(null)");
    expect(source).toContain('if (generationEpoch !== schedGenerationEpochRef.current) return');
  });

  it('normalizes loaded schedules and reports storage failures truthfully', () => {
    expect(source).toContain('sched && Array.isArray(sched.items) ? sched.items : []');
    expect(source).toContain("'Unlabeled step ' + (index + 1)");
    expect(source.indexOf('var saveOk = store(scopedKey(STORAGE_SCHEDULES), updated)')).toBeLessThan(source.indexOf('setSavedSchedules(updated)', source.indexOf('var saveOk = store(scopedKey(STORAGE_SCHEDULES), updated)')));
    expect(source).toContain('notifyVisualSupportsUpdated()');
    expect(source).toContain('Could not save the schedule - device storage is full.');
  });

  it('keeps the deployment mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/symbol_studio_module.js'));
  });
});
