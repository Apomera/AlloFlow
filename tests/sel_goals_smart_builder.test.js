import { beforeAll, describe, expect, it } from 'vitest';
import { loadSelTool, renderSelTool } from './helpers/sel_tool_harness.js';

const goal = (smart = {}) => ({
  id: 'goal-smart-1',
  text: 'Read more often',
  category: 'academic',
  smart: { S: '', M: '', A: '', R: '', T: '', ...smart },
  steps: [],
  progress: 0,
  completed: false,
  createdAt: 1,
  difficulty: 1,
  reflections: [],
});

const renderBuilder = (overrides = {}, smart = {}) => renderSelTool('goals', {
  gradeLevel: '7',
  toolData: {
    goals_tool: {
      tab: 'smart',
      editingGoal: 'goal-smart-1',
      goals: [goal(smart)],
      ...overrides,
    },
  },
});

describe('Goal Setter guided SMART builder', () => {
  beforeAll(() => loadSelTool('sel_tool_goals.js'));

  it('defaults legacy data to one guided question at a time', () => {
    const html = renderBuilder();
    expect(html).toContain('Step 1 of 5');
    expect(html).toContain('SMART builder position');
    expect(html).toContain('aria-valuenow="1"');
    expect(html.match(/<textarea/g)).toHaveLength(1);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Guided steps/);
  });

  it('renders all five labelled fields in overview mode', () => {
    const html = renderBuilder({ smartBuildMode: 'all' });
    expect(html.match(/<textarea/g)).toHaveLength(5);
    expect(html).toContain('for="smart-field-goal-smart-1-S"');
    expect(html).toContain('aria-describedby="smart-field-goal-smart-1-S-help"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>All fields/);
  });

  it('clamps an invalid saved step to the final SMART question', () => {
    const html = renderBuilder({ smartStep: 99 });
    expect(html).toContain('Step 5 of 5');
    expect(html).toContain('aria-valuenow="5"');
    expect(html).toContain('Review all fields');
  });

  it('offers a concrete next action when every field is complete', () => {
    const html = renderBuilder({ smartBuildMode: 'all' }, {
      S: 'Read ten pages each school night.',
      M: 'Track pages in my planner.',
      A: 'Keep the book beside my bed.',
      R: 'Reading supports my English class.',
      T: 'Practice for four weeks.',
    });
    expect(html).toContain('SMART goal complete!');
    expect(html).toContain('Add the first action step');
  });
});
