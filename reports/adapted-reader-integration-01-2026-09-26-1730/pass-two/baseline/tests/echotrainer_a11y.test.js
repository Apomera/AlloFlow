import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_echotrainer.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_echotrainer.js');

describe('Echo Trainer accessibility', () => {
  it('scopes run-history headers and preserves a visible canvas focus indicator', () => {
    for (const file of [sourcePath, publicPath]) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain(".echotrainer-focus-canvas:focus-visible { outline: 3px solid #38bdf8 !important;");
      expect(source).toContain("className: 'echotrainer-focus-canvas', role: 'application'");
      expect(source).toContain("h('th', { scope: 'col', style:");
      expect((source.match(/h\('th', \{ scope: 'col'/g) || []).length).toBeGreaterThanOrEqual(6);
    }
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
