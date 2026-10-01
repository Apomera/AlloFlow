import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_goals.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_goals.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Goal Setter control accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('uses meaningful labels for tabs, templates, and goal actions', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Goal Setter sections'");
    expect(text).toContain("'aria-label': tb.label");
    expect(text).toContain("'aria-label': 'Add goal template: ' + tmpl.text");
    expect(text).toContain("'aria-label': 'Category for goal: ' + (goal.text || 'unnamed goal')");
    expect(text).toContain("'aria-label': 'Share goal: ' + goalLabel");
    expect(text).toContain("'aria-label': 'Delete goal: ' + goalLabel");
    expect(text).not.toContain("'aria-label': 'nowrap'");
    expect(text).not.toContain("'aria-label': 'Difficulty:'");
  });

  it('targets add-step actions to their own goal card', () => {
    const text = source();
    expect(text).toContain("var stepInputId = 'goal-step-input-' + goalDomId;");
    expect(text).toContain("id: stepInputId");
    expect(text).toContain('document.getElementById(stepInputId)');
    expect(text).not.toContain('document.querySelector(\'[placeholder*="step"]\')');
  });
});
