import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_atctower.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_atctower.js');

describe('ATC Tower inquiry form accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('names both live-model evidence explanation fields', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const evidenceLabelCount = source.split('Evidence-based ATC load explanation').length - 1;
    expect(evidenceLabelCount).toBe(2);
    expect(source).not.toContain("'ATC load hypothesis'");
    expect(source).not.toContain("'ATC load explanation'");
  });
});