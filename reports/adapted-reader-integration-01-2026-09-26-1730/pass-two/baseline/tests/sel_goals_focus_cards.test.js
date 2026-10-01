import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadSelTool, renderSelTool } from './helpers/sel_tool_harness.js';

const makeGoal = (id, text, steps) => ({
  id,
  text,
  category: 'academic',
  smart: { S: '', M: '', A: '', R: '', T: '' },
  steps,
  progress: 0,
  completed: false,
  createdAt: 1,
  difficulty: 1,
  reflections: [],
});

const goals = [
  makeGoal('goal-a', 'Finish the book report', [
    { text: 'Choose a book', done: true },
    { text: 'Draft the outline', done: false },
  ]),
  makeGoal('goal-b', 'Plan the presentation', []),
];

describe('Goal Setter focused goal cards', () => {
  beforeAll(() => loadSelTool('sel_tool_goals.js'));

  it('keeps summaries visible while exposing only the selected detail region', () => {
    const html = renderSelTool('goals', {
      gradeLevel: '7',
      toolData: { goals_tool: { tab: 'goals', goals, expandedGoalId: 'goal-b' } },
    });

    expect(html.match(/id="goal-disclosure-/g)).toHaveLength(2);
    expect(html.match(/aria-expanded="true"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Expand goal details: Finish the book report"');
    expect(html).toContain('aria-label="Collapse goal details: Plan the presentation"');
    expect(html).toMatch(/id="goal-details-goal-a"[^>]*hidden=""/);
    expect(html).toMatch(/id="goal-details-goal-b"[^>]*role="region"[^>]*aria-labelledby="goal-disclosure-goal-b"/);
  });

  it('shows semantic progress and the next unfinished action on every summary', () => {
    const html = renderSelTool('goals', {
      gradeLevel: '7',
      toolData: { goals_tool: { tab: 'goals', goals } },
    });

    expect(html).toContain('aria-label="Progress for Finish the book report"');
    expect(html).toContain('aria-valuenow="50"');
    expect(html).toContain('aria-valuetext="1 of 2 steps complete"');
    expect(html).toContain('Next: Draft the outline');
    expect(html).toContain('Next: add a first step.');
  });

  it('keeps disclosure, renaming, and SMART selection state independent', () => {
    const source = readFileSync(resolve(process.cwd(), 'sel_hub/sel_tool_goals.js'), 'utf8');
    const toggleStart = source.indexOf('var toggleGoalDetails = function');
    const toggleEnd = source.indexOf('var openGoalForEditing = function');
    const toggleBlock = source.slice(toggleStart, toggleEnd);

    expect(source).toContain('var isExpanded = expandedGoalId === goal.id;');
    expect(source).toContain('var isEditing = renamingGoalId === goal.id && isExpanded;');
    expect(toggleBlock).toContain('expandedGoalId: opening ? goalId : null');
    expect(toggleBlock).not.toContain('editingGoal');
    expect(source).toContain('editingGoal: newGoal.id, expandedGoalId: newGoal.id, renamingGoalId: newGoal.id');
    expect(source).toContain('editingGoal: editGoal.id, expandedGoalId: editGoal.id, renamingGoalId: null');
    expect(source).toContain('focusGoalStepInput(editGoal.id)');
  });
});
