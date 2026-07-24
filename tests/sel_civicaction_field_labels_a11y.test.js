import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_civicaction.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_civicaction.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Civic Action field label accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('connects changing planner and service prompts to their response fields', () => {
    const text = source();
    expect(text).toContain("'aria-labelledby': 'cv-planner-step-label'");
    expect(text).toContain("'aria-describedby': 'cv-planner-step-prompt'");
    expect(text).toContain("'aria-labelledby': 'cv-service-phase-label'");
    expect(text).toContain("'aria-describedby': 'cv-service-task'");
  });

  it('names and describes every community budget slider with formatted value text', () => {
    const text = source();
    expect(text).toContain("id: 'cv-budget-' + cat.id");
    expect(text).toContain("'aria-labelledby': 'cv-budget-label-' + cat.id");
    expect(text).toContain("'aria-describedby': 'cv-budget-desc-' + cat.id");
    expect(text).toContain("'aria-valuetext': '$' + val.toLocaleString() + ', ' + pct + ' percent of budget'");
  });

  it('associates custom, rights, scenario, and vision prompts with their text fields', () => {
    const text = source();
    for (const id of [
      'cv-custom-question-heading',
      'cv-rights-prompt-heading',
      'cv-right-scenario-heading',
      'cv-vision-heading',
    ]) {
      expect(text).toContain(`'aria-labelledby': '${id}'`);
    }
    for (const id of [
      'cv-rights-prompt-text',
      'cv-right-scenario-text',
      'cv-vision-prompt',
    ]) {
      expect(text).toContain(`'aria-describedby': '${id}'`);
    }
  });
});
