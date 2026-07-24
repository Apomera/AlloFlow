import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_molecule.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_molecule.js');
const source = fs.readFileSync(sourcePath, 'utf8');

describe('Molecule 3D camera alternatives', () => {
  it('provides single-click alternatives for every drag-dependent camera action', () => {
    expect(source).toContain("const setMoleculeCameraView = (action) =>");
    expect(source).toContain("front: [0, 0, 15]");
    expect(source).toContain("side: [15, 0, 0]");
    expect(source).toContain("top: [0, 15, 0]");
    expect(source).toContain("action === 'zoom-in' || action === 'zoom-out'");
    expect(source).toContain("if (action === 'reset')");
    expect(source).toContain("'data-molecule-camera-control': control.id");
  });

  it('names the camera group and gives every control a large visible focus target', () => {
    expect(source).toContain("'3D molecule camera controls. Single-click alternatives to dragging the model.'");
    expect(source).toContain("'aria-label': control.label");
    expect(source).toContain('min-h-11 min-w-11');
    expect(source).toContain('focus-visible:ring-2 focus-visible:ring-indigo-600');
  });

  it('describes the alternatives from the canvas and announces each view change', () => {
    expect(source).toContain(
      'Camera controls follow with front, side, top, zoom, and reset options.',
    );
    expect(source).toContain("front: 'Front molecule view.'");
    expect(source).toContain("'zoom-in': 'Molecule view zoomed in.'");
    expect(source).toContain("reset: 'Molecule camera reset.'");
  });

  it('keeps the source and deploy copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
