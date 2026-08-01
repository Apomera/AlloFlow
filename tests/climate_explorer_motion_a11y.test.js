import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_climateExplorer.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_climateExplorer.js');

describe('Climate Explorer hero motion accessibility', () => {
  it('provides a persistent pause/resume control for the animated hero', () => {
    for (const file of [sourcePath, publicPath]) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain("var heroMotionPaused = !!d.heroMotionPaused;");
      expect(source).toContain("upd('heroMotionPaused', !heroMotionPaused)");
      expect(source).toContain("'aria-pressed': heroMotionPaused ? 'true' : 'false'");
      expect(source).toContain("if (!cv.isConnected || cv._cePaused) return;");
      expect(source).toContain("cv._ceResume = function() { cv._cePaused = false; heroDraw(); };");
    }
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
