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
  });
});
