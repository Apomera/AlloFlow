import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Progress Dashboard accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalProgressDashboard(props) {');
  const end = source.indexOf('  function PersonalChallengeBoard(props) {', start);
  const dashboard = source.slice(start, end);

  it('frames the dashboard as optional, self-entered, and non-evaluative', () => {
    expect(dashboard).toContain('A neutral summary of selected information you chose to save');
    expect(dashboard).toContain('not grades, diagnoses, comparisons, productivity scores, or judgments about progress');
    expect(dashboard).toContain('no action is required from this summary');
  });

  it('warns that the combined view can expose sensitive personal records', () => {
    expect(dashboard).toContain('This view combines potentially sensitive records');
    expect(dashboard).toContain('does not itself notify a teacher, school, counselor, clinician, or family member');
    expect(dashboard).toContain('edit or delete records in their source tool');
  });

  it('uses a semantic definition list without score-like progress bars', () => {
    expect(dashboard).toContain("'aria-labelledby': 'learning-lab-progress-summary-heading'");
    expect(dashboard).toContain("hh('dl'");
    expect(dashboard).toContain("hh('dt'");
    expect(dashboard).toContain("hh('dd'");
    expect(dashboard).not.toContain("role: 'progressbar'");
  });

  it('does not average unlike goal or executive-function ratings', () => {
    expect(dashboard).not.toContain('avgGoalProgress');
    expect(dashboard).not.toContain('efAvg');
    expect(dashboard).not.toContain('Average goal progress');
    expect(dashboard).not.toContain('Executive function average');
    expect(dashboard).toContain("bigStat('Executive-function reflections'");
  });

  it('does not infer sleep quality or apply a duration threshold', () => {
    expect(dashboard).toContain("bigStat('Sleep logs saved'");
    expect(dashboard).toContain('No duration threshold or health judgment is applied.');
    expect(dashboard).not.toContain('Sleep average');
    expect(dashboard).not.toContain('below seven');
    expect(dashboard).not.toContain('shift earlier tonight');
  });

  it('removes coercive recommendation rules', () => {
    expect(dashboard).toContain('It does not recommend a sleep duration, habit target, task count, or reflection schedule.');
    expect(dashboard).not.toContain('Habits left to check today');
    expect(dashboard).not.toContain('Consider closing one or two');
    expect(dashboard).not.toContain('No weekly reflections yet');
    expect(dashboard).not.toContain('What might be useful right now');
  });

  it('normalizes numeric focus data and open task plans', () => {
    expect(dashboard).toContain('var minutes = Number(session.workMin);');
    expect(dashboard).toContain('Number.isFinite(minutes) && minutes > 0');
    expect(dashboard).toContain('if (steps.length === 0) return true;');
    expect(dashboard).toContain('steps.some(function(step) { return !step || !step.done; })');
  });

  it('renders every activity date and description visibly with time semantics', () => {
    expect(dashboard).toContain("'Saved activity by date: last 14 calendar days'");
    expect(dashboard).toContain('activityDays.map(function(day)');
    expect(dashboard).toContain("hh('time', { dateTime: day.iso");
    expect(dashboard).toContain("day.activities.join(', ')");
    expect(dashboard).toContain("'No recognized activity'");
    expect(dashboard).toContain("activities.push('appreciation note')");
    expect(dashboard).not.toContain("'aria-hidden': 'true', style: { height: 32");
  });

  it('uses local calendar dates rather than UTC slicing', () => {
    expect(dashboard).toContain('function localIso(date)');
    expect(dashboard).toContain("activityDate.setHours(12, 0, 0, 0)");
    expect(dashboard).not.toContain("activityDate.toISOString().slice(0, 10)");
  });

  it('updates the catalog to describe selected rather than every tool', () => {
    expect(source).toContain("desc: 'Optional summary of selected personal tracker data'");
    expect(source).toContain("'Neutral summary of selected personal tracker counts and 14-day saved activity.'");
    expect(source).not.toContain('Single overview of every toolkit tool');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
