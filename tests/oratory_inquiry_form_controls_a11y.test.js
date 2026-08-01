import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_oratory.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_oratory.js');

describe('Oratory Lab inquiry accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('provides accessible names for pace hypothesis and prosody explanation fields', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'aria-label': t('stem.oratory.hypothesis_input', 'Oratory pace hypothesis')");
    expect(source).toContain("'aria-label': t('stem.oratory.explanation_input', 'Oratory prosody explanation')");
  });
});
