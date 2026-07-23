import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const deployPath = path.join(root, 'prismflow-deploy', 'public', 'stem_lab', 'stem_tool_geologyexplorer.js');
const source = fs.readFileSync(sourcePath, 'utf8');

describe('Geology Explorer canvas semantics', () => {
  it('excludes the WebGL canvas because its labelled viewport owns the alternative', () => {
    expect(source).toContain("var cnv = document.createElement('canvas');");
    expect(source).toContain("cnv.setAttribute('aria-hidden', 'true');");
    expect(source).toContain("role: fpOn ? 'application' : 'img'");
    expect(source).toContain("'aria-label': fpOn ?");
  });

  it('excludes the internal gradient texture buffer', () => {
    expect(source).toContain("var bgCanvas = document.createElement('canvas');");
    expect(source).toContain("bgCanvas.setAttribute('aria-hidden', 'true');");
  });

  it('keeps the source and deploy copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
