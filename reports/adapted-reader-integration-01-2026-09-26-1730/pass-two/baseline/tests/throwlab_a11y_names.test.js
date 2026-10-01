import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_throwlab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_throwlab.js');

describe('Throw Lab inquiry accessibility', () => {
  it('names hypothesis and explanation textareas while preserving named canvases', () => {
    for (const file of [sourcePath, publicPath]) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain("'aria-label': __alloT('stem.throwlab.hypothesis_label'");
      expect(source).toContain("'aria-label': __alloT('stem.throwlab.explanation_label'");
      expect(source).toContain("'aria-describedby': 'throwlab-canvas-help'");
      expect(source).toContain("'data-throwlab-immersive-canvas': 'true'");
    }
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
