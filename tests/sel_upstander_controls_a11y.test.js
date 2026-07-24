import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_upstander.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_upstander.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Upstander control accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('retains scoped focus styling without suppressing the native pledge outline', () => {
    const text = source();
    expect(text).toContain('.us-root textarea:focus-visible,');
    expect(text).toContain('outline: 3px solid #2563eb;');
    expect(text).not.toContain("boxSizing: 'border-box', outline: 'none'");
  });

  it('names coach and role-play controls and sizes the remove action', () => {
    const text = source();
    expect(text).toContain("h('input', { type: 'text', 'aria-label': 'Share your experience'");
    expect(text).toContain("'aria-label': coachLoad ? 'Upstander coach is responding' : 'Send message to upstander coach'");
    expect(text).toContain("'aria-label': 'Your upstander role-play response'");
    expect(text).toContain('minWidth: 24, minHeight: 24');
  });
});
