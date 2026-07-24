import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Challenge Board accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalChallengeBoard(props) {');
  const end = source.indexOf('  function PersonalTimeEstimator(props) {', start);
  const board = source.slice(start, end);

  it('frames check-ins as optional and non-evaluative', () => {
    expect(board).toContain('Check-ins are optional records, not proof of completion, consistency, motivation, or success.');
    expect(board).toContain('Missing days do not indicate failure.');
    expect(board).toContain('does not use streaks or assume that daily repetition is appropriate');
    expect(board).not.toContain('marked complete for today');
  });

  it('provides privacy and data-control guidance', () => {
    expect(board).toContain('Entries can reveal goals, health information, beliefs, or identity.');
    expect(board).toContain('does not itself notify a teacher, school, coach, clinician, or family member');
    expect(board).toContain('Edit or delete records you no longer want stored');
  });

  it('uses blank optional defaults with only the name required', () => {
    expect(board).toContain("var EMPTY_FORM = { title: '', dailyAction: '', why: '', startDate: '', days: '' }");
    expect(board).toContain('Only the name is required.');
    expect(board).toContain("'Optional recurring reminder'");
    expect(board).toContain("'Reference start date (optional)'");
    expect(board).toContain("'Reference duration in days (optional)'");
    expect(board).not.toContain('Daily action is required.');
    expect(board).not.toContain('days: 30');
  });

  it('uses a named form, bounded fields, and conditional validation', () => {
    expect(board).toContain("'aria-labelledby': 'learning-lab-challenge-editor-heading'");
    for (const field of ['title', 'action', 'why', 'start', 'days']) {
      expect(board).toContain("htmlFor: 'learning-lab-challenge-" + field + "'");
      expect(board).toContain("id: 'learning-lab-challenge-" + field + "'");
    }
    expect(board).toContain('maxLength: 2000');
    expect(board).toContain('max: 365');
    expect(board).toContain("titleError ? hh('p', { id: 'learning-lab-challenge-title-error', role: 'alert'");
  });

  it('confirms dirty cancellation and restores meaningful focus', () => {
    expect(board).toContain("title: 'Discard unsaved changes?', confirmText: 'Discard changes'");
    expect(board).toContain("focusTargetRef.current = 'learning-lab-challenge-add'");
    expect(board).toContain("focusTargetRef.current = 'learning-lab-challenge-entry-heading-' + challenge.id");
    expect(board).toContain("focusTargetRef.current = 'learning-lab-challenge-list-heading'");
    expect(board).toContain('R.useLayoutEffect(function()');
  });

  it('supports editing and preserves legacy records and logs', () => {
    expect(board).toContain('var index = editing ? nextChallenges.indexOf(editing.challenge) : -1;');
    expect(board).toContain('logs: Array.isArray(existing && existing.logs) ? existing.logs : []');
    expect(board).toContain('challenges.filter(function(item) { return item !== challenge; })');
    expect(board).toContain('var index = challenges.indexOf(challenge);');
  });

  it('uses neutral check-in text instead of percentage completion', () => {
    expect(board).toContain("' saved check-in' + (logs.length === 1 ? '' : 's')");
    expect(board).toContain("'Record today’s optional check-in'");
    expect(board).toContain("'aria-pressed': todayRecorded ? 'true' : 'false'");
    expect(board).not.toContain("role: 'progressbar'");
    expect(board).not.toContain('days complete');
  });

  it('renders visible, semantic, robust check-in dates', () => {
    expect(board).toContain("'View saved check-ins (' + logs.length + ')'");
    expect(board).toContain("'aria-label': 'Saved check-ins for ' + title");
    expect(board).toContain("hh('time', { dateTime: date.dateTime }");
    expect(board).toContain("'Date not recorded'");
    expect(board).not.toContain('role: \'img\', \'aria-label\': \'Daily completion history');
  });

  it('uses semantic lists, articles, headings, and 44-pixel actions', () => {
    expect(board).toContain("'aria-label': 'Saved challenges and practices'");
    expect(board).toContain("hh('article', { 'aria-labelledby': headingId }");
    expect(board).toContain("hh('h4', { id: headingId, tabIndex: -1");
    expect(board).toContain("'aria-label': 'Edit challenge or practice: ' + title");
    expect(board).toContain("'aria-label': 'Delete challenge or practice: ' + title");
    expect(board.match(/minWidth: 44, minHeight: 44/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('removes the causal Tiny Habits claim from the component and catalog', () => {
    expect(board).not.toContain('BJ Fogg');
    expect(board).not.toContain('easier to sustain');
    expect(source).toContain("desc: 'Optional challenges or practices with neutral check-ins'");
    expect(source).toContain("'Optional challenge or practice notes with editable, neutral check-ins.'");
  });

  it('preserves unrelated section data and mirror parity', () => {
    expect(board).toContain('setData(Object.assign({}, data, { challenges:');
    expect(board).not.toContain('setData({ challenges:');
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
