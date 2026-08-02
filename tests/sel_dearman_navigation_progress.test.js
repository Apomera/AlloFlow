import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_dearman.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_dearman.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('DEAR MAN navigation and progress', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('provides roving tabs and labelled panels', () => {
    const text = source();
    expect(text).toContain("role: 'tablist', 'aria-label': 'DEAR MAN sections'");
    expect(text).toContain("id: 'dearman-tab-' + t.id");
    expect(text).toContain("'aria-controls': 'dearman-panel-' + t.id");
    expect(text).toContain('tabIndex: active ? 0 : -1');
    expect(text).toContain("event.key === 'ArrowRight' || event.key === 'ArrowDown'");
    expect(text).toContain("event.key === 'Home'");
    expect(text).toContain("event.key === 'End'");
    expect(text).toContain("id: 'dearman-panel-' + view, role: 'tabpanel'");
    expect(text).toContain("'aria-labelledby': 'dearman-tab-' + view");
  });

  it('announces seven-step drafting progress', () => {
    const text = source();
    expect(text).toContain('var draftedSteps = LETTERS.filter');
    expect(text).toContain('var dearManProgressText = draftedSteps === 0');
    expect(text).toContain("'aria-label': 'DEAR MAN progress'");
    expect(text).toContain("draftedSteps + ' of ' + LETTERS.length + ' DEAR MAN steps drafted.'");
  });
});