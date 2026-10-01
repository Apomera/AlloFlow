import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_execfunction.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_execfunction.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Executive Function control accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('hides the decorative timer ring while leaving its text readout available', () => {
    const text = source();
    expect(text).toContain("h('svg', { width: ringSize, height: ringSize, 'aria-hidden': 'true', focusable: 'false'");
    expect(text).toContain("(mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss");
  });

  it('names the coach input at its definition', () => {
    expect(source()).toContain("h('input', { 'aria-label': 'Tell the coach what is hard',");
  });
});
