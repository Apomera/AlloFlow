import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_teamwork.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_teamwork.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Teamwork clipboard fallback accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('labels the temporary textarea and keeps it out of sequential focus', () => {
    const text = source();
    expect(text).toContain("textarea.setAttribute('aria-label', 'Team retrospective text for copying');");
    expect(text).toContain("textarea.setAttribute('readonly', '');");
    expect(text).toContain('textarea.tabIndex = -1;');
    expect(text).toContain("textarea.style.left = '-9999px';");
  });
});
