import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'student_analytics_module.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'prismflow-deploy/public/student_analytics_module.js'), 'utf8');

describe('Student Analytics chart alternatives', () => {
  it('keeps source and deploy mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });

  it('names both quiz-chart render branches and points to detailed values', () => {
    const label = 'Quiz averages by student. Detailed values are available in the student table.';
    expect(source.split(label)).toHaveLength(3);
  });

  it('names both safety-flag chart render branches and points to detailed values', () => {
    const label = 'Safety flag counts by category. Detailed values are available in student records.';
    expect(source.split(label)).toHaveLength(3);
  });

  it('exposes every rendered canvas as a named image', () => {
    const canvases = source.match(/React\.createElement\("canvas", \{[\s\S]*?\}\)/g) || [];
    expect(canvases).toHaveLength(5);
    for (const canvas of canvases) {
      expect(canvas).toContain('role: "img"');
      expect(canvas).toContain('"aria-label"');
    }
  });
});
