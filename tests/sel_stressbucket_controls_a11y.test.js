import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_stressbucket.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_stressbucket.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Stress Bucket control accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('names each dynamic remove action with the item it changes', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Remove stressor: ' + s.label");
    expect(text).toContain("'aria-label': 'Remove tap: ' + t.label");
    expect(text).toContain("'aria-label': 'Remove overflow sign: ' + s");
    expect((text.match(/minWidth: 24, minHeight: 24/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it('announces balance changes and labels new-entry controls', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Stress bucket balance'");
    expect(text).toContain("'aria-live': 'polite'");
    expect(text).toContain("'aria-label': 'Weight for new stressor'");
    expect(text).toContain("'aria-label': 'Capacity for new tap'");
  });
});