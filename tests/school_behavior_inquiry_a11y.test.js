import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_schoolbehaviortoolkit.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_schoolbehaviortoolkit.js');

describe('School Behavior Toolkit inquiry accessibility', () => {
  it('names both readiness reflection textareas in source and public mirrors', () => {
    const expected = [
      "'aria-label': __alloT('stem.schoolbehaviortoolkit.hypothesis_input', 'Behavior plan readiness hypothesis')",
      "'aria-label': __alloT('stem.schoolbehaviortoolkit.explanation_input', 'Explain behavior plan readiness')"
    ];
    for (const file of [sourcePath, publicPath]) {
      const source = fs.readFileSync(file, 'utf8');
      for (const value of expected) expect(source).toContain(value);
    }
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
