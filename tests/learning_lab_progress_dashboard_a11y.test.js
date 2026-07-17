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

  it('uses definition-list structure for progress statistics', () => {
    expect(dashboard).toContain("hh('dl', { 'aria-label': 'Progress summary'");
    expect(dashboard).toContain("hh('dt'");
    expect(dashboard).toContain("hh('dd'");
  });

  it('hides decorative statistic icons', () => {
    expect(dashboard).toContain("'aria-hidden': 'true'");
    expect(dashboard).toContain("fontSize: 22, marginBottom: 4");
  });

  it('gives goal and habit visual bars progress semantics', () => {
    expect(dashboard).toContain("role: 'progressbar'");
    expect(dashboard).toContain("'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': progress");
    expect(dashboard).toContain("bigStat('Average goal progress'");
    expect(dashboard).toContain("bigStat('Habits today'");
  });

  it('exposes completed-goal celebration as status', () => {
    expect(dashboard).toContain("role: 'status', 'aria-label': doneGoals.length + ' goals completed total'");
    expect(dashboard).toContain("'You have done this before. You can do it again.'");
  });

  it('builds a text description for every activity day', () => {
    expect(dashboard).toContain("activities.push('focus session')");
    expect(dashboard).toContain("activities.push('habit')");
    expect(dashboard).toContain("activities.push('reflection')");
    expect(dashboard).toContain("activities.push('gratitude log')");
    expect(dashboard).toContain("activities.push('journal entry')");
    expect(dashboard).toContain("'aria-label': dayDescription");
  });

  it('does not rely on color alone in the activity strip', () => {
    expect(dashboard).toContain("hasActivity ? '✓' : '—'");
    expect(dashboard).toContain("'✓ tracked activity · — no tracked activity · outlined square is today'");
    expect(dashboard).not.toContain("title: iso");
  });

  it('uses a semantic heading and list for recent activity', () => {
    expect(dashboard).toContain("'aria-labelledby': 'learning-lab-progress-activity-heading'");
    expect(dashboard).toContain("id: 'learning-lab-progress-activity-heading'");
    expect(dashboard).toContain("activityDays.map(function(day)");
  });

  it('uses a semantic heading and populated list for suggestions', () => {
    expect(dashboard).toContain("'aria-labelledby': 'learning-lab-progress-suggestions-heading'");
    expect(dashboard).toContain("id: 'learning-lab-progress-suggestions-heading'");
    expect(dashboard).toContain("if (suggestions.length === 0) suggestions.push");
    expect(dashboard).toContain("suggestions.map(function(suggestion, index)");
  });

  it('uses readable full labels instead of abbreviation-only names', () => {
    expect(dashboard).toContain("'Sleep average, 7 days'");
    expect(dashboard).toContain("'Executive function average'");
    expect(dashboard).toContain("'Open brain dumps'");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
