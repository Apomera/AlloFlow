import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_statslab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_statslab.js');

describe('Stats Lab inquiry form accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('names the power controls and evidence explanation field', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'aria-label': controlLabels.effect");
    expect(source).toContain("'aria-label': controlLabels.alpha");
    expect(source).toContain("'aria-label': controlLabels.nGroup");
    expect(source).toContain("'aria-label': __alloT('stem.statslab.evidence_explanation_input', 'Power-model evidence explanation')");
    expect(source).not.toContain("'Power-design hypothesis'");
    expect(source).not.toContain("'Power-state explanation'");
  });
});