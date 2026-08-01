import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_echolocation.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_echolocation.js');

describe('Echo Location inquiry accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('provides accessible names for the sonar hypothesis and explanation fields', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'aria-label': t('stem.echolocation.hypothesis_input', 'Sonar call-type hypothesis')");
    expect(source).toContain("'aria-label': t('stem.echolocation.explanation_input', 'Sonar call-type explanation')");
  });
});
