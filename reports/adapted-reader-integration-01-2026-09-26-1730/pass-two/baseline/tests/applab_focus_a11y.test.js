import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_applab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_applab.js');

describe('App Lab enhancement prompt focus accessibility', () => {
  it('provides a visible focus ring when the enhancement prompt receives focus', () => {
    const expected = [
      "onFocus: function(e) { e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.4)'; },",
      "onBlur: function(e) { e.target.style.boxShadow = 'none'; },"
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
