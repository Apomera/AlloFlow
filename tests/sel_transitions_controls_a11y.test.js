import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_transitions.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_transitions.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Transitions control accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('exposes explicit names on all three text inputs', () => {
    const text = source();
    expect(text).toContain("h('input', { 'aria-label': 'Add an anchor'");
    expect(text).toContain("h('input', { 'aria-label': 'Add a plan step'");
    expect(text).toContain("h('input', { 'aria-label': 'Message the transition coach'");
  });

  it('keeps remove controls at least 24 pixels and names the coach state', () => {
    const text = source();
    expect((text.match(/minWidth: 24, minHeight: 24/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(text).toContain("'aria-label': coachLoading ? 'Transition coach is responding' : 'Send message to transition coach'");
  });
});
