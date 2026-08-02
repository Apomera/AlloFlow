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
  });it('surfaces the scenario and dialogue state as a coherent learning flow', () => {
    const text = source();
    expect(text).toContain("role: 'progressbar'");
    expect(text).toContain("'aria-label': 'Choice ' + String.fromCharCode(65 + idx) + ': ' + ch.text");
    expect(text).toContain("role: 'log'");
    expect(text).toContain("'aria-label': 'Socratic dialogue history'");
    expect(text).toContain("'aria-labelledby': 'ethical-branch-reflection-label'");
  });

  it('keeps decision-tree navigation and completion controls descriptive', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Next: ' + steps[step + 1].label");
    expect(text).toContain("'aria-label': 'Complete ethical decision tree'");
    expect(text).toContain("'aria-describedby': 'ethical-tree-step-prompt'");
    expect(text).not.toContain("'aria-label': ') +'");
  });
});
