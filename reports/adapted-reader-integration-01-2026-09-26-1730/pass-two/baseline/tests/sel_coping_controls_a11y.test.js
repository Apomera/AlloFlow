import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_coping.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_coping.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Coping Skills control accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('names both searches and the role-play response', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Search coping skills library'");
    expect(text).toContain("'aria-label': 'Search sample plans and guided scripts'");
    expect(text).toContain("'aria-label': 'Your coping role-play response'");
  });

  it('accurately names remove actions and provides 24-pixel targets', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Remove warning sign: ' + sign");
    expect(text).toContain("'aria-label': 'Remove coping step: ' + step");
    expect(text).toContain("'aria-label': 'Remove trusted adult: ' + adult");
    expect((text.match(/minWidth: 24, minHeight: 24/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(text).not.toContain("'aria-label': 'Add a warning sign...'");
    expect(text).not.toContain("'aria-label': 'Add a step...'");
  });
});
