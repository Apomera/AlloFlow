import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab IEP planning notes accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalIEPTracker(props) {');
  const end = source.indexOf('  function PersonalSubjectMastery(props) {', start);
  const tracker = source.slice(start, end);

  it('uses individualized, non-coercive participation and accurate scope language', () => {
    expect(tracker).toContain('These are personal planning notes, not the official IEP.');
    expect(tracker).toContain('Participation can be individualized.');
    expect(tracker).toContain('There is no required level or pace of participation in this tool.');
    expect(tracker).not.toContain('By high school you should');
    expect(tracker).not.toContain('Your IEP. Your control.');
  });

  it('explains sensitive-data boundaries without claiming automatic FERPA coverage', () => {
    expect(tracker).toContain('This app does not automatically share or monitor these entries.');
    expect(tracker).toContain('approved-app and privacy procedures');
    expect(tracker).toContain('Avoid names, student IDs, and unnecessary details');
    expect(tracker).not.toMatch(/FERPA protected|FERPA compliant/i);
  });

  it('uses native forms, select, checkboxes, and conditional alerts', () => {
    expect(tracker).toContain("hh('form', { id: 'learning-lab-iep-goal-form'");
    expect(tracker).toContain("hh('form', { id: 'learning-lab-iep-meeting-form'");
    expect(tracker).toContain("hh('select', { id: 'learning-lab-iep-area'");
    expect(tracker).toContain("hh('input', { type: 'checkbox', checked: !!subgoal.done");
    expect(tracker).not.toContain("role: 'checkbox'");
    expect(tracker).toContain("goalError ? hh('div', { id: 'learning-lab-iep-goal-error', role: 'alert'");
  });

  it('bounds sensitive narrative fields and removes blank sub-goals before saving', () => {
    expect(tracker.match(/maxLength: 4000/g)?.length).toBeGreaterThanOrEqual(4);
    expect(tracker).toContain('maxLength: 500');
    expect(tracker).toContain("filter(function(s) { return s.text; })");
  });

  it('provides semantic goal, progress, and meeting histories with robust dates', () => {
    expect(tracker).toContain("'aria-label': 'Personal IEP goal notes'");
    expect(tracker).toContain("'aria-labelledby': 'learning-lab-iep-progress-heading-' + goal.id");
    expect(tracker).toContain("'aria-label': 'Personal IEP meeting notes'");
    expect(tracker).toContain("hh('time', { dateTime: meeting.date }");
    expect(tracker).toContain("hh('dl'");
  });

  it('supports deletion of every sensitive record type', () => {
    expect(tracker).toContain('async function removeGoal(id)');
    expect(tracker).toContain('async function removeProgress(goalId, progressId, legacyEntry)');
    expect(tracker).toContain('async function removeMeeting(id)');
    expect(tracker).toContain("title: 'Delete progress entry?', confirmText: 'Delete entry'");
    expect(tracker).toContain("title: 'Delete meeting note?', confirmText: 'Delete meeting note'");
  });

  it('restores focus after view changes, additions, saves, and deletions', () => {
    expect(tracker).toContain('var pendingFocusRef = R.useRef(null);');
    expect(tracker).toContain('R.useLayoutEffect(function()');
    expect(tracker).toContain("requestFocus('learning-lab-iep-goal-editor-heading')");
    expect(tracker).toContain("requestFocus('learning-lab-iep-meeting-editor-heading')");
    expect(tracker).toContain("requestFocus('learning-lab-iep-add-subgoal')");
    expect(tracker).toContain("requestFocus('learning-lab-iep-goals-heading')");
  });

  it('preserves existing creation dates and sibling data during updates', () => {
    expect(tracker).toContain('createdAt: existing && existing.createdAt ? existing.createdAt : todayISO()');
    expect(tracker).toContain("setData(Object.assign({}, data, { goals: goals }))");
    expect(tracker).toContain("setData(Object.assign({}, data, { meetings:");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
