import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'student_analytics_module.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/student_analytics_module.js'), 'utf8');

describe('Student Analytics table row actions', () => {
  it('keeps source and deploy mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });

  it('uses two named native buttons instead of clickable table rows', () => {
    expect(source.match(/"aria-label": ["']View detail/g)).toHaveLength(2);
    expect(source.match(/min-h-11 w-full inline-flex/g)).toHaveLength(2);
    const rows = [...source.matchAll(/React\.createElement\("tr", \{([\s\S]{0,320}?)\},/g)];
    for (const row of rows) {
      expect(row[1]).not.toContain('onClick');
      expect(row[1]).not.toContain('tabIndex');
    }
  });

  it('uses encoding-stable Unicode escapes for both visible sort arrows', () => {
    expect(source.match(/'\\u25B2' : '\\u25BC'/g)).toHaveLength(2);
  });
});
