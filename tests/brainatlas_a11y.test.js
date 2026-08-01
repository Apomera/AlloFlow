import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_brainatlas.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_brainatlas.js');

describe('Brain Atlas inquiry accessibility', () => {
  it('names the chart and associates both inquiry textareas with visible labels', () => {
    for (const file of [sourcePath, publicPath]) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain("role: 'img', 'aria-label': t('stem.brainatlas.neurotransmitter_levels_chart', 'Neurotransmitter levels chart')");
      expect(source).toContain("htmlFor: 'brainatlas-nt-hypothesis'");
      expect(source).toContain("id: 'brainatlas-nt-hypothesis'");
      expect(source).toContain("htmlFor: 'brainatlas-nt-explanation'");
      expect(source).toContain("id: 'brainatlas-nt-explanation'");
    }
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
