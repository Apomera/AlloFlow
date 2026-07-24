import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_sociallab.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_sociallab.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Social Skills Lab chat control accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('names the response field and arrow-only send action', () => {
    const text = source();
    expect(text).toContain("h('input', { type: 'text', 'aria-label': 'Your response'");
    expect(text).toContain("'aria-label': 'Send social skills response'");
  });

  it('does not suppress the input focus outline', () => {
    expect(source()).not.toContain("fontSize: '14px', outline: 'none'");
  });
});
