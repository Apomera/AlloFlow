import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_goals.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_goals.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Goal Setter navigation and progress', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('provides roving tabs and a labelled tab panel', () => {
    const text = source();
    expect(text).toContain('var goalTabs = [');
    expect(text).toContain("id: 'goal-tab-' + tb.id");
    expect(text).toContain("'aria-controls': 'goal-panel-' + tb.id");
    expect(text).toContain('tabIndex: active ? 0 : -1');
    expect(text).toContain("event.key === 'ArrowRight' || event.key === 'ArrowDown'");
    expect(text).toContain("event.key === 'Home'");
    expect(text).toContain("id: 'goal-panel-' + tab, role: 'tabpanel'");
  });

  it('uses contextual labels for habit and SMART filters', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Add suggested habit: ' + sug.n");
    expect(text).toContain("'aria-label': 'Filter suggested habits by ' + hc.label");
    expect(text).toContain("'aria-label': 'Filter SMART examples by ' + cat.label");
    expect(text).not.toContain("'aria-label': '4px 10px'");
    expect(text).not.toContain("'aria-label': '44'");
  });

  it('announces goal progress as text', () => {
    const text = source();
    expect(text).toContain('var goalProgressText =');
    expect(text).toContain("'aria-label': 'Goal progress summary'");
    expect(text).toContain("completedSteps + ' of ' + totalSteps + ' steps complete.'");
  });
});