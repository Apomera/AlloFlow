import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_careconstellations.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_careconstellations.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Care Constellations reflection labels', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('associates every visible reflection prompt with its textarea', () => {
    const text = source();
    expect(text).toContain("h('label', { htmlFor: 'cc-reflection-' + p.id");
    expect(text).toContain("h('textarea', { id: 'cc-reflection-' + p.id");
    expect(text).not.toContain("h('textarea', { value: current");
  });
});
