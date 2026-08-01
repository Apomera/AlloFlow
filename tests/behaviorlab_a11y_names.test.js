import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_behaviorlab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_behaviorlab.js');

describe('Behavior Lab schedule comparison accessibility', () => {
  it('names the schedule chart and inquiry fields', () => {
    for (const file of [sourcePath, publicPath]) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain("role: 'img'");
      expect(source).toContain("'aria-label': __alloT('stem.behaviorlab.schedule_comparison_chart'");
      expect(source).toContain("htmlFor: 'behaviorlab-hypothesis'");
      expect(source).toContain("id: 'behaviorlab-hypothesis'");
      expect(source).toContain("id: 'behaviorlab-explanation', 'aria-label': __alloT('stem.behaviorlab.explanation_label'");
    }
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
