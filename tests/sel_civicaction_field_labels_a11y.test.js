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
  });it('surfaces planner and service-learning progress states', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Civic action plan progress'");
    expect(text).toContain("'aria-label': 'Service learning phase progress'");
    expect(text).toContain("'aria-current': isActive ? 'step' : undefined");
    expect(text).toContain("'aria-labelledby': 'cv-planner-step-label'");
    expect(text).toContain("'aria-labelledby': 'cv-service-phase-label'");
  });

  it('names the next and completion transitions in both project paths', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Next civic action plan step'");
    // The completion buttons are named by their visible text (WCAG 2.5.3, Label in
    // Name): an aria-label that does not contain "Complete My Plan" would override
    // what a voice-control user can see and say.
    expect(text).toContain("'\\u2728 Complete My Plan'");
    expect(text).not.toContain("'aria-label': 'Complete civic action plan'");
    expect(text).toContain("'aria-label': 'Next service-learning phase'");
    expect(text).toContain("'\\u2728 Complete Project Plan'");
    expect(text).not.toContain("'aria-label': 'Complete service-learning project plan'");
    expect(text).toContain("announceToSR('Civic action plan complete')");
    expect(text).toContain("announceToSR('Service-learning project plan complete')");
  });
});
