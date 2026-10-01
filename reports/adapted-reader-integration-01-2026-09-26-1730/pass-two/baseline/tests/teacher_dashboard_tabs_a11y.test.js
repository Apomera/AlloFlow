import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['teacher_source.jsx', 'teacher_module.js', 'desktop/web-app/public/teacher_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);
const tabs = ['students', 'insights', 'behavior', 'stems'];

describe('Teacher Dashboard ARIA tabs', () => {
  it.each(files)('%s exposes a named tablist', (_path, source) => {
    expect(source).toMatch(/(?:role="tablist"|role:\s*"tablist")/);
    expect(source).toContain('Dashboard sections');
  });

  it.each(tabs)('%s tab has a controlled labelled panel', tab => {
    const source = files[0][1];
    expect(source).toContain(`id="teacher-dashboard-tab-${tab}"`);
    expect(source).toContain(`aria-controls="teacher-dashboard-panel-${tab}"`);
    expect(source).toContain(`teacher-dashboard-panel-${tab}`);
    expect(source).toContain(`teacher-dashboard-tab-${tab}`);
  });

  it.each(files)('%s exposes selected state and roving tabindex', (_path, source) => {
    expect(source).toContain('aria-selected');
    expect(source).toContain('tabIndex');
    expect(source).toContain('dashboardTabRefs');
  });

  it('supports wrapping arrows plus Home and End with automatic activation', () => {
    const source = files[0][1];
    expect(source).toContain("event.key === 'ArrowRight'");
    expect(source).toContain("event.key === 'ArrowLeft'");
    expect(source).toContain("event.key === 'Home'");
    expect(source).toContain("event.key === 'End'");
    expect(source).toContain('setActiveTab(nextId)');
    expect(source).toContain('dashboardTabRefs.current[nextId]?.focus()');
  });
});