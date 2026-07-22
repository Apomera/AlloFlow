import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'student_analytics_module.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'prismflow-deploy/public/student_analytics_module.js'), 'utf8');

describe('Student Analytics scatter-plot alternative', () => {
  it('keeps source and deploy mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });

  it('names the SVG using the student, trend, point count, and detailed alternative', () => {
    const start = source.indexOf("const renderScatterPlot = studentName =>");
    const end = source.indexOf('const renderResearchToolbar', start);
    const section = source.slice(start, end);
    expect(section).toContain("role: 'img'");
    expect(section).toContain("'aria-label': 'Practice versus outcome scatter plot for ' + studentName");
    expect(section).toContain("n + ' data points show a '");
    expect(section).toContain('Detailed values are available in the Growth Trajectory table.');
  });
});
