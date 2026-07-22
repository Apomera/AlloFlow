import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'student_analytics_module.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'prismflow-deploy/public/student_analytics_module.js'), 'utf8');

describe('Student Analytics Growth Trajectory table semantics', () => {
  it('keeps source and deploy mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });

  it('associates every Growth Trajectory header with its column', () => {
    const section = source.slice(
      source.indexOf("}, 'Growth Trajectory')"),
      source.indexOf("}, 'Intervention Dosage')")
    );
    expect(section).toContain("}, 'Date')");
    expect(section.match(/scope: 'col'/g)).toHaveLength(4);
  });
});
