import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_digitalwellbeing.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_digitalwellbeing.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Digital Wellbeing result ring accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('hides only decorative ring geometry, not the visible result text', () => {
    const text = source();
    expect((text.match(/h\('svg', \{ width: 100, height: 100, viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false'/g) || []).length).toBe(2);
    expect(text).not.toContain("h('div', { 'aria-hidden': 'true', style: { position: 'relative', width: 100, height: 100");
    expect(text).toContain("overallPct + '%'");
    expect(text).toContain("aicPctText + '%'");
  });
});
