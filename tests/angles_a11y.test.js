import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_angles.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_angles.js');

describe('Angles timed round and chart accessibility', () => {
  it('provides timing controls, named diagrams, and scoped table headers', () => {
    for (const file of [sourcePath, publicPath]) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain('var toggleSpeedPause = function()');
      expect(source).toContain('var extendSpeedRound = function()');
      expect(source).toContain("'aria-pressed': speedPaused ? 'true' : 'false'");
      expect((source.match(/role: 'img', 'aria-label': t\('stem\.angles\.angle_diagram'/g) || []).length).toBe(2);
      expect((source.match(/scope: 'col'/g) || []).length).toBeGreaterThanOrEqual(14);
    }
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
