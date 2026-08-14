import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_header_source.jsx', 'utf8');
const builder = fs.readFileSync('_build_view_header_module.js', 'utf8');

describe('header narrow-viewport reflow', () => {
  it('does not impose a max-content minimum width on the banner', () => {
    expect(source).toContain('w-full min-w-0 overflow-x-clip');
    expect(source).not.toContain('w-full min-w-max');
  });
  it('lets settings and utility groups wrap within the viewport', () => {
    expect(source).toContain('id="tour-header-settings" className={`relative z-[60] w-full sm:w-auto flex flex-wrap');
    expect(source).toContain('id="tour-header-utils" className={`relative z-[100] w-full sm:w-auto flex flex-wrap');
    expect(source).toContain('justify-start sm:justify-end relative min-w-0');
    expect(source).toContain('id="tour-header-actions" className={`w-full flex flex-wrap');
    expect(source).toContain('max-w-full scale-90 origin-left');
  });
  it('keeps teacher utilities together without hiding them in an overflow menu', () => {
    const start = source.indexOf('data-header-utility-cluster="teacher"');
    // Bound the slice on the nav row that follows the cluster. The old anchor
    // ({!isTeacherMode) sits at the very END of #tour-header-actions, so once
    // the cluster moved above the nav buttons that slice swallowed every button
    // in the box and the assertions below stopped saying anything about it.
    const end = source.indexOf('<div className="flex flex-wrap items-center gap-2">', start);
    const cluster = source.slice(start, end);

    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    // Hugs its content and sits at the right edge of the column it now shares
    // with the nav buttons; full width (so it wraps) only on narrow screens.
    expect(cluster).toContain('w-full sm:w-auto sm:self-end flex flex-wrap items-center');
    expect(cluster).toContain('className="relative shrink-0"');
    for (const key of ['header_translate', 'header_export', 'header_analytics']) {
      expect(cluster).toContain(`data-help-key="${key}"`);
    }
    expect(cluster.indexOf('header_translate')).toBeLessThan(cluster.indexOf('header_export'));
    expect(cluster.indexOf('header_export')).toBeLessThan(cluster.indexOf('header_analytics'));
  });
  it('stacks the teacher utilities above the nav row, in DOM order', () => {
    // The cluster reads above the AI/Tools/Learn/Bridge row, so it must also be
    // reached first by Tab — matching visual order is the whole point of moving
    // the markup instead of reaching for a CSS `order` class (WCAG 2.4.3).
    const langBlock = source.indexOf('data-help-key="header_language"');
    const cluster = source.indexOf('data-header-utility-cluster="teacher"');
    const navRow = source.indexOf('<div className="flex flex-wrap items-center gap-2">', cluster);
    const aiButton = source.indexOf('data-help-key="header_ai_backend"');
    expect(langBlock).toBeGreaterThan(0);
    expect(cluster).toBeGreaterThan(langBlock);
    expect(navRow).toBeGreaterThan(cluster);
    expect(aiButton).toBeGreaterThan(navRow);
  });
  it('wraps source-panel actions instead of clipping Generate and Books', () => {
    const app = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
    expect(app).toContain('flex flex-wrap items-center justify-end gap-2 max-w-full min-w-0');
  });
  it('keeps the deployment mirror synchronized', () => {
    expect(builder).toContain("desktop/web-app', 'public', 'view_header_module.js");
  });
});
