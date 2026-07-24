import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_costbenefit.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_costbenefit.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Cost-Benefit grid table accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('names the table and associates column and row headers', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Short-term and long-term pros and cons'");
    expect(text).toContain("scope: 'col', 'aria-label': 'Time frame'");
    expect((text.match(/h\('th', \{ scope: 'col'/g) || []).length).toBe(3);
    expect((text.match(/h\('th', \{ scope: 'row'/g) || []).length).toBe(2);
  });
});
