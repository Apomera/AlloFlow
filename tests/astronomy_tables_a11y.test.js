import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_astronomy.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_astronomy.js');

describe('Astronomy table accessibility', () => {
  it('assigns column scope to magnitude and seasonal-sky headers', () => {
    for (const file of [sourcePath, publicPath]) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain("return h('th', { key: i, scope: 'col', style:");
      expect(source).toContain("h('th', { scope: 'col', style: { padding: 6, border: '1px solid #cbd5e1', background: '#f1f5f9', textAlign: 'left' } }, __alloT('stem.astronomy.season'");
      expect(source).toContain("h('th', { scope: 'col', style: { padding: 6, border: '1px solid #cbd5e1', background: '#f1f5f9', textAlign: 'left' } }, __alloT('stem.astronomy.what_s_up'");
    }
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
