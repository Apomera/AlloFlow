import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_anxietytoolkit.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_anxietytoolkit.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Anxiety Toolkit control accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('associates both Worry Tree branch headings with their textareas', () => {
    const text = source();
    expect(text).toContain("h('label', { htmlFor: 'a-worry-action'");
    expect(text).toContain("h('textarea', { id: 'a-worry-action'");
    expect(text).toContain("h('label', { htmlFor: 'a-worry-redirect'");
    expect(text).toContain("h('textarea', { id: 'a-worry-redirect'");
  });

  it('gives remove actions contextual names and 24-pixel targets', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Remove worry: ' + w.text");
    expect(text).toContain("'aria-label': 'Remove grounding item: ' + s");
    expect((text.match(/minWidth: 24, minHeight: 24/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('adapts overview and support language by grade band', () => {
    const text = source();
    expect(text).toContain('var ANXIETY_GUIDANCE = {');
    expect(text).toContain('elementary:');
    expect(text).toContain('middle:');
    expect(text).toContain("var _anxBand = (ctx && ctx.gradeBand) || 'high';");
    expect(text).toContain('_anxGuidance.homeIntro');
    expect(text).toContain('_anxGuidance.support');
    expect(text).toContain('is a practical CBT tool for sorting worry.');
    expect(text).not.toContain('most useful CBT tools for adolescent anxiety');
  });
});
