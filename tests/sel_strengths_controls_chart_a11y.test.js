import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_strengths.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_strengths.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Strengths Finder coach and chart accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('names the coach field and its loading-aware action', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Ask the strengths coach'");
    expect(text).toContain("'aria-label': aiLoading ? 'Strengths coach is responding' : 'Send question to strengths coach'");
  });

  it('exposes the radar chart as an image with its category values', () => {
    const text = source();
    expect(text).toContain("role: 'img', 'aria-label': 'Strengths radar chart. '");
    expect(text).toContain("catCounts.map(function(c) { return c.label + ': ' + c.count; }).join(', ')");
  });
});
