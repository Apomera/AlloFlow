import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'student_analytics_module.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/student_analytics_module.js'), 'utf8');

describe('Student Analytics sortable column headers', () => {
  it('keeps source and deploy mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });

  it('uses native target-sized buttons instead of click-only table headers', () => {
    expect(source.match(/onClick: \(\) => handleSort\(col\.key\)/g)).toHaveLength(2);
    const sortButtons = [...source.matchAll(/type: \"button\",\s+onClick: \(\) => handleSort\(col\.key\),\s+className: ([^\n]+)/g)];
    expect(sortButtons).toHaveLength(2);
    for (const match of sortButtons) expect(match[1]).toContain('min-h-11');
    const headerProps = [...source.matchAll(/React\.createElement\("th", \{([\s\S]*?)\}, (?:\/\*#__PURE__\*\/)?React\.createElement\("button"/g)];
    expect(headerProps).toHaveLength(2);
    for (const match of headerProps) expect(match[1]).not.toContain('onClick');
  });

  it('exposes current sort direction and the next action', () => {
    expect(source.match(/"aria-sort": sortColumn === col\.key/g)).toHaveLength(2);
    expect(source).toContain("'ascending' : 'descending'");
    expect(source).toContain("', activate to sort ascending'");
    expect(source).toContain('activate to sort descending');
  });
});
