import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_geologyexplorer.js');
const source = fs.readFileSync(sourcePath, 'utf8');

describe('Geology Explorer focus visibility', () => {
  it('gives the keyboard-focusable first-person viewport a visible inset ring', () => {
    expect(source).not.toContain("outline: 'none'");
    expect(source).toContain(
      "className: fpOn ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-inset' : undefined",
    );
    expect(source).toContain('tabIndex: fpOn ? 0 : undefined');
    expect(source).toContain("role: fpOn ? 'application' : 'img'");
  });

  it('keeps the source and deploy copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
