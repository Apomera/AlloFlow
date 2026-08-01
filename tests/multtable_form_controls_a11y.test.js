import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_multtable.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_multtable.js');

describe('Multiplication Table form control accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('names the challenge answer, hint, and reflection controls', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'aria-label': t('stem.multtable.answer', 'Multiplication or division answer')");
    expect(source).toContain("'aria-label': t('stem.multtable.get_a_hint_from_ai', 'Get a hint from AI')");
    expect(source).toContain("'aria-label': t('stem.multtable.mastery_hypothesis', 'Mastery threshold hypothesis')");
    expect(source).toContain("'aria-label': t('stem.multtable.mastery_explanation', 'Explain mastery learning thresholds')");
  });
});
