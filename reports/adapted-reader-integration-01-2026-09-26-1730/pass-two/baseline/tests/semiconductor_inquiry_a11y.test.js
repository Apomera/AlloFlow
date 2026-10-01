import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_semiconductor.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_semiconductor.js');

describe('Semiconductor inquiry accessibility', () => {
  it('names both carrier-concentration reflection textareas in source and public mirrors', () => {
    const expected = [
      "'aria-label': t('stem.semiconductor.hypothesis_input', 'Semiconductor carrier concentration hypothesis')",
      "'aria-label': t('stem.semiconductor.explanation_input', 'Explain semiconductor carrier concentration')"
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
