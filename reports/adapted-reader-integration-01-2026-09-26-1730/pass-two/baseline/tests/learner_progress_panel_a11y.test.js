import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = [
  'teacher_source.jsx',
  'teacher_module.js',
  'desktop/web-app/public/teacher_module.js',
];

const learnerSection = (text) => {
  const start = text.indexOf('const LearnerProgressView');
  const end = text.indexOf('const TeacherDashboard', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return text.slice(start, end);
};

describe.each(paths)('Learner Progress accessibility in %s', (path) => {
  const section = learnerSection(fs.readFileSync(path, 'utf8'));

  it('gives the icon-only close button an accessible name', () => {
    expect(section).toContain('common.close_dashboard');
    expect(section).toContain('Close progress dashboard');
    expect(section).toMatch(/aria-(?:label|"label")/);
  });

  it('uses contrast-safe level and activity text colors', () => {
    expect(section).toContain('bg-indigo-900 text-yellow-200');
    for (const color of ['blue', 'purple', 'green', 'orange']) {
      expect(section).toContain(`bg-${color}-50 text-${color}-800`);
    }
    expect(section).not.toContain('tracking-wider opacity-80');
    expect(section).not.toContain('bg-indigo-900 text-yellow-700');
  });
});
