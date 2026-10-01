import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_restorativecircle.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_restorativecircle.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Restorative Circle field label accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('connects each harm-reflection step title, subtitle, and guidance to its response', () => {
    const text = source();
    expect(text).toContain("'aria-labelledby': 'rc-harm-step-title'");
    expect(text).toContain("'aria-describedby': 'rc-harm-step-subtitle rc-harm-step-guidance'");
  });

  it('connects agreement, roots, and empathy prompts to their fields', () => {
    const text = source();
    expect(text).toContain("'aria-labelledby': 'rc-custom-agreement-label'");
    expect(text).toContain("'aria-labelledby': 'rc-roots-reflection-label'");
    expect(text).toContain("'aria-describedby': 'rc-roots-reflection-prompt'");
    expect(text).toContain("'aria-labelledby': 'rc-empathy-' + activePerson + '-' + quad.id + '-label'");
  });

  it('keeps the conditional comparison reflection explicitly named', () => {
    expect(source()).toContain("h('textarea', {\n                        'aria-label': 'Comparison reflection'");
  });it('surfaces the active session phase and live role-play updates', () => {
    const text = source();
    expect(text).toContain("role: 'progressbar'");
    expect(text).toContain("'aria-valuetext': 'Step ' + (harmStep + 1) + ' of ' + HARM_REPAIR_STEPS.length");
    expect(text).toContain("role: 'log'");
    expect(text).toContain("'aria-label': 'Your next response'");
    expect(text).toContain("'aria-label': 'Restorative role-play conversation'");
  });

  it('uses task-specific names for phase and choice controls', () => {
    const text = source();
    expect(text).toContain("'aria-label': labels[t]");
    expect(text).toContain("'aria-label': secLabels[sec]");
    expect(text).toContain("'aria-label': (isAdded ? 'Added agreement: ' : 'Add agreement: ') + sug");
    expect(text).not.toContain("'aria-label': 'Choose the type of circle you want to facilitate today.'");
    expect(text).not.toContain("'aria-label': 'Next',");
  });
});
