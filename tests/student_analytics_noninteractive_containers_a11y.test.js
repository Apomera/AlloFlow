import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'student_analytics_module.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'prismflow-deploy/public/student_analytics_module.js'), 'utf8');

describe('Student Analytics container semantics', () => {
  it('keeps source and deploy mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });

  it('does not expose layout containers as simulated buttons', () => {
    expect(source).not.toMatch(/role: ['"]button['"]/);
    expect(source).not.toContain("onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ')");
  });

  it('retains native controls inside all four corrected regions', () => {
    const starts = [
      source.indexOf('const renderResearchToolbar ='),
      source.indexOf('const renderResearchDashboard ='),
      source.indexOf('"Student reads aloud'),
      source.indexOf('"Which number is bigger?'),
    ];
    for (const start of starts) {
      expect(start).toBeGreaterThan(-1);
      expect(source.slice(start, start + 5000)).toMatch(/React\.createElement\(['"]button['"]/);
    }
  });
});
