import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'student_analytics_module.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'prismflow-deploy/public/student_analytics_module.js'), 'utf8');

describe('Student Analytics embedded probe progress', () => {
  it('keeps source and deploy mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });

  it('names all five embedded probe progress indicators', () => {
    for (const label of ['NWF', 'LNF', 'RAN', 'Missing Number', 'Quantity Discrimination']) {
      expect(source).toContain(`"aria-label": "${label} item progress"`);
    }
  });

  it('provides current percentages and human-readable item positions', () => {
    const labels = source.match(/"aria-label": "(?:NWF|LNF|RAN|Missing Number|Quantity Discrimination) item progress"/g) || [];
    expect(labels).toHaveLength(5);
    const values = source.match(/"aria-valuenow": Math\.round\([^\n]+/g) || [];
    expect(values.length).toBeGreaterThanOrEqual(6);
    expect(source.match(/"aria-valuetext": "Item " \+ Math\.min\(/g)).toHaveLength(5);
    expect(source.match(/Math\.max\([^\n]+\.length, 1\)/g).length).toBeGreaterThanOrEqual(10);
  });
});
