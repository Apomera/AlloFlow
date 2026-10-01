import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_growthmindset.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_growthmindset.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Growth Mindset field accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('associates the growth-goal field with its visible sentence prompt', () => {
    const text = source();
    expect(text).toContain("h('label', { htmlFor: 'gm-new-goal'");
    expect(text).toContain("id: 'gm-new-goal'");
  });

  it('names the coach and future-letter fields at their definitions', () => {
    const text = source();
    expect(text).toContain("h('input', {\n              'aria-label': 'Message the growth coach'");
    expect(text).toContain("h('textarea', {\n              'aria-label': 'Write a letter to your future self'");
  });

  it('does not suppress the future-letter textarea focus outline', () => {
    expect(source()).not.toContain("outline: 'none'");
  });
});
