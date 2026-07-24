import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'allohaven_module.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/allohaven_module.js'), 'utf8');

describe('AlloHaven peer relationship table semantics', () => {
  it('keeps source and deploy mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });

  it('marks every peer-summary header as a column header', () => {
    for (const label of ['Peer', 'Career', 'Personality', 'Relationship']) {
      expect(source).toContain("h('th', { scope: 'col', style: { textAlign: 'left', padding: '4px 8px', border: '1px solid #ccc', fontWeight: 700 } }, '" + label + "')");
    }
  });

  it('does not leave unscoped table headers in the module', () => {
    expect(source).not.toMatch(/h\('th', \{ style:/);
  });
});
