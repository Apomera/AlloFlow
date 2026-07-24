import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_sleep.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_sleep.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Sleep diary table accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('names the table and associates each value with column and date headers', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Sleep diary entries'");
    expect((text.match(/h\('th', \{ scope: 'col'/g) || []).length).toBe(6);
    expect(text).toContain("h('th', { scope: 'row'");
    expect(text).not.toContain("h('td', { style: { padding: 5, fontFamily: 'ui-monospace, monospace' } }, e.date)");
  });
});
