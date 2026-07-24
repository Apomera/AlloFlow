import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_compassion.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_compassion.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Compassion coach field accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('defines the coach input with its accessible name at the control', () => {
    expect(source()).toContain("h('input', { 'aria-label': 'Share your inner critic thought', type: 'text'");
  });
});
