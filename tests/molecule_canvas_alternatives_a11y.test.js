import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_molecule.js');
const deployPath = path.join(root, 'prismflow-deploy', 'public', 'stem_lab', 'stem_tool_molecule.js');
const source = fs.readFileSync(sourcePath, 'utf8');

describe('Molecule Lab canvas alternatives', () => {
  it('excludes the internal WebGL text texture from the accessibility tree', () => {
    expect(source).toContain("var canvas = document.createElement('canvas');");
    expect(source).toContain("canvas.setAttribute('aria-hidden', 'true');");
  });

  it('names the 3D molecular model and describes its complete camera alternatives', () => {
    expect(source).toContain('"aria-label": "3D molecular model of "');
    expect(source).toContain('role: "img"');
    expect(source).toContain('Camera controls follow with front, side, top, zoom, and reset options.');
    expect(source).not.toContain("outline: 'none'");
  });

  it('describes the Bohr model with element, nucleus, and electron data', () => {
    expect(source).toContain('"aria-label": "Bohr model of "');
    expect(source).toContain('" protons and approximately "');
    expect(source).toContain('getElectronConfig(d.selectedElement.n)');
  });

  it('keeps the source and deploy copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
