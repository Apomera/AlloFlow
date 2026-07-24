import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_ethicalreasoning.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_ethicalreasoning.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Ethical Reasoning field accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('defines each Socratic input with its accessible name at the control', () => {
    const text = source();
    expect(text).toContain("h('input', { 'aria-label': 'Your response to Socratic dialogue', type: 'text'");
    expect(text).toContain("h('input', { 'aria-label': 'Socratic dialogue input for case study', type: 'text'");
  });
});
