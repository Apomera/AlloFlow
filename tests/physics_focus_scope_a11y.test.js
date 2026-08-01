import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_physics.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_physics.js');

describe('Physics canvas and inquiry table accessibility', () => {
  it('preserves the labeled keyboard canvas without suppressing focus and scopes its log header', () => {
    for (const file of [sourcePath, publicPath]) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain('id: "physicsCanvas"');
      expect(source).toContain('role: "application"');
      expect(source).toContain("'stem.physics.aria_canvas'");
      expect(source).toContain("scope: 'col', className: 'px-2 py-1 border border-slate-200 text-left'");
      expect(source).not.toContain('style: { width: "100%", height: "100%", display: "block", outline: "none" }');
    }
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
