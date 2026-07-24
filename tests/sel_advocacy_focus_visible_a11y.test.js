import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_advocacy.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_advocacy.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Advocacy field focus visibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('does not suppress native outlines on shared text fields', () => {
    const text = source();
    expect(text).not.toContain("outline: 'none'");
    expect(text).toContain("'.selh-advocacy input:focus-visible,'");
    expect(text).toContain("'.selh-advocacy textarea:focus-visible,'");
    expect(text).toContain('outline: 3px solid #a5b4fc !important');
  });
});
