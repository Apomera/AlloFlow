import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab IEP Tracker accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalIEPTracker(props) {');
  const end = source.indexOf('  function PersonalSubjectMastery(props) {', start);
  const tracker = source.slice(start, end);

  it('reports a missing annual goal inline and focuses its field', () => {
    expect(tracker).toContain("setGoalError('Annual goal statement is required.')");
    expect(tracker).toContain("document.getElementById('learning-lab-iep-annual-goal')");
    expect(tracker).toContain("id: 'learning-lab-iep-goal-error', role: 'alert'");
    expect(tracker).not.toContain("alert('Need an annual goal statement.')");
  });

  it('associates the required annual goal and clears its error on input', () => {
    expect(tracker).toContain("htmlFor: 'learning-lab-iep-annual-goal'");
    expect(tracker).toContain("id: 'learning-lab-iep-annual-goal', 'data-ll-focusable': true, required: true");
    expect(tracker).toContain("'aria-invalid': goalError ? 'true' : undefined");
    expect(tracker).toContain("if (goalError) setGoalError('')");
  });

  it('associates measurement and service fields with their labels', () => {
    expect(tracker).toContain("htmlFor: 'learning-lab-iep-measurement'");
    expect(tracker).toContain("id: 'learning-lab-iep-measurement', 'data-ll-focusable': true");
    expect(tracker).toContain("htmlFor: 'learning-lab-iep-services'");
    expect(tracker).toContain("id: 'learning-lab-iep-services', 'data-ll-focusable': true");
  });

  it('exposes the goal area as a named group with selected state', () => {
    expect(tracker).toContain("role: 'group', 'aria-labelledby': 'learning-lab-iep-area-label'");
    expect(tracker).toContain("'aria-pressed': goalForm.area === a.id ? 'true' : 'false'");
    expect(tracker).toContain("minHeight: 44, padding: '6px 10px'");
  });

  it('provides named, focus-visible sub-goal form controls', () => {
    expect(tracker).toContain("'aria-labelledby': 'learning-lab-iep-subgoals-label'");
    expect(tracker).toContain("'aria-label': 'Sub-goal ' + (i + 1)");
    expect(tracker).toContain("'aria-label': 'Remove sub-goal ' + (i + 1)");
    expect(tracker).toContain("minWidth: 44, minHeight: 44");
  });

  it('reports a missing meeting date inline and focuses its field', () => {
    expect(tracker).toContain("setMeetingError('Meeting date is required.')");
    expect(tracker).toContain("document.getElementById('learning-lab-iep-meeting-date')");
    expect(tracker).toContain("id: 'learning-lab-iep-meeting-error', role: 'alert'");
    expect(tracker).not.toContain("alert('Need a meeting date.')");
  });

  it('associates the meeting date and narrative fields', () => {
    expect(tracker).toContain("htmlFor: 'learning-lab-iep-meeting-date'");
    expect(tracker).toContain("id: 'learning-lab-iep-meeting-date', type: 'date'");
    expect(tracker).toContain("htmlFor: 'learning-lab-iep-meeting-' + f.id");
    expect(tracker).toContain("id: 'learning-lab-iep-meeting-' + f.id, 'data-ll-focusable': true");
    expect(tracker).toContain("if (meetingError) setMeetingError('')");
  });

  it('provides named 44-pixel goal edit and delete actions', () => {
    expect(tracker).toContain("'aria-label': 'Edit IEP goal: ' + g.annual");
    expect(tracker).toContain("'aria-label': 'Delete IEP goal: ' + g.annual");
    expect(tracker.match(/minWidth: 44, minHeight: 44/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('exposes sub-goal completion as checkbox state', () => {
    expect(tracker).toContain("role: 'checkbox', 'aria-checked': sg.done ? 'true' : 'false'");
    expect(tracker).toContain("'aria-label': (sg.done ? 'Mark sub-goal incomplete: ' : 'Mark sub-goal complete: ') + sg.text");
  });

  it('names progress controls and exposes the latest update as status', () => {
    expect(tracker).toContain("'aria-label': 'Record progress for ' + g.annual");
    expect(tracker).toContain("lastProgress ? hh('div', { role: 'status'");
    expect(tracker.match(/minHeight: 44, padding: '4px 10px'/g)?.length).toBe(3);
  });

  it('confirms goal deletion and announces state-changing actions', () => {
    expect(tracker).toContain("title: 'Delete this IEP goal?', confirmText: 'Delete goal'");
    expect(tracker).not.toContain("confirm('Delete this IEP goal");
    expect(tracker).toContain("llAnnounce('IEP goal saved.')");
    expect(tracker).toContain("llAnnounce('IEP meeting log saved.')");
    expect(tracker).toContain("llAnnounce('Goal progress updated: '");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
