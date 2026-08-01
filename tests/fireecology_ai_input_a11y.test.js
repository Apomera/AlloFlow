import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_fireecology.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_fireecology.js');

describe('Fire Ecology AI tutor input accessibility', () => {
  it('gives the AI question input a programmatic accessible name in both mirrors', () => {
    const expected = "'aria-label': t('stem.fireecology.ai_question_input', 'Ask the AI fire ecology tutor')";
    expect(fs.readFileSync(sourcePath, 'utf8')).toContain(expected);
    expect(fs.readFileSync(publicPath, 'utf8')).toContain(expected);
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
