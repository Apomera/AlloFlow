import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_friendship.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_friendship.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Friendship Builder control names', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('names journal and coach text inputs at their control definitions', () => {
    const text = source();
    expect(text).toContain("h('input', { 'aria-label': 'Friendship journal entry'");
    expect(text).toContain("h('input', { 'aria-label': 'Friendship practice message'");
  });

  it('names icon-only actions and the role-play response field', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Add friendship journal entry'");
    expect(text).toContain("'aria-label': coachLoading ? 'Friendship coach is responding' : 'Send message to friendship coach'");
    expect(text).toContain("'aria-label': 'Your friendship role-play response'");
  });
});
