import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = [
  path.resolve(process.cwd(), 'stem_lab/stem_tool_archstudio.js'),
  path.resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'),
];

function loadReducer(file) {
  const source = fs.readFileSync(file, 'utf8');
  const document = {
    getElementById() { return null; },
    createElement() {
      return {
        style: {},
        setAttribute() {},
      };
    },
    head: { appendChild() {} },
    body: { appendChild() {} },
  };
  const window = {
    StemLab: { registerTool() {} },
  };
  vm.runInNewContext(source, {
    window,
    document,
    console,
    setTimeout,
    clearTimeout,
  }, { filename: file });
  const edit = window.__alloArchEditBlocks;
  edit.gridBounds = window.__alloArchGridAxisBounds;
  edit.displayBlocks = window.__alloArchDisplayBlocks;
  edit.sanitize = window.__alloArchSanitizeBlocks;
  edit.settle = window.__alloArchSettleBlocks;
  edit.unsupportedKeys = window.__alloArchUnsupportedKeys;
  edit.changeCamera = window.__alloArchChangeCamera;
  edit.reflectRotation = window.__alloArchReflectRotation;
  return edit;
}

describe('Architecture Studio authoring', () => {
  for (const file of files) {
    it(`supports place, paint, and erase edits in ${path.relative(process.cwd(), file)}`, () => {
      const edit = loadReducer(file);
      expect(edit).toBeTypeOf('function');

      const empty = [];
      const placed = edit(empty, {
        mode: 'place',
        place: { x: 2, y: 1, z: 3 },
        shape: 'column',
        material: 'wood',
        color: '#92400e',
        rotation: 90,
      });
      expect(placed).toHaveLength(1);
      expect(placed[0]).toMatchObject({
        x: 2, y: 1, z: 3,
        shape: 'column', material: 'wood', color: '#92400e', rotation: 90,
      });

      // Occupied cells must not duplicate blocks or create undo noise.
      expect(edit(placed, { mode: 'place', place: { x: 2, y: 1, z: 3 } })).toBe(placed);

      const painted = edit(placed, {
        mode: 'paint', block: { x: 2, y: 1, z: 3 },
        material: 'glass', color: '#38bdf8',
      });
      expect(painted[0]).toMatchObject({
        x: 2, y: 1, z: 3, shape: 'column', rotation: 90,
        material: 'glass', color: '#38bdf8',
      });

      const erased = edit(painted, { mode: 'erase', block: { x: 2, y: 1, z: 3 } });
      expect(erased).toEqual([]);

      const mirrored = edit([], {
        mode: 'place', symmetry: true,
        place: { x: 2, y: 1, z: 3 },
        shape: 'ramp', material: 'brick', color: '#b45309', rotation: 270,
      });
      expect(mirrored).toHaveLength(2);
      expect(mirrored.map((b) => b.x).sort((a, b) => a - b)).toEqual([-2, 2]);
      expect(mirrored.every((b) => b.shape === 'ramp' && b.rotation === 270)).toBe(true);

      const mirroredPaint = edit(mirrored, {
        mode: 'paint', symmetry: true, block: { x: 2, y: 1, z: 3 },
        material: 'glass', color: '#38bdf8',
      });
      expect(mirroredPaint.every((b) => b.material === 'glass')).toBe(true);
      expect(edit(mirroredPaint, {
        mode: 'erase', symmetry: true, block: { x: 2, y: 1, z: 3 },
      })).toEqual([]);

      expect(edit.gridBounds).toBeTypeOf('function');
      expect(Array.from(edit.gridBounds(false, 0, 0))).toEqual([0, 9]);
      const farBounds = Array.from(edit.gridBounds(true, 64, 64));
      expect(farBounds[1] - farBounds[0] + 1).toBe(10);
      expect(farBounds[0]).toBeLessThanOrEqual(64);
      expect(farBounds[1]).toBeGreaterThanOrEqual(64);

      const viewBlocks = [
        { x: 0, y: 0, z: -1, shape: 'block', material: 'stone' },
        { x: 0, y: 1, z: -1, shape: 'column', material: 'wood' },
        { x: 1, y: 0, z: 1, shape: 'ramp', material: 'stone' },
        { x: 1, y: 1, z: 1, shape: 'roof', material: 'wood' },
      ];
      expect(edit.displayBlocks).toBeTypeOf('function');
      expect(edit.displayBlocks(viewBlocks, { viewLayer: 1 })).toHaveLength(2);
      expect(edit.displayBlocks(viewBlocks, {
        showSlice: true, sliceZ: -1, sliceZSelected: true,
      })).toHaveLength(2);
      expect(edit.displayBlocks(viewBlocks, { filterMaterial: 'wood' })).toHaveLength(2);
      expect(edit.displayBlocks(viewBlocks, {
        showReplay: true, replayStep: 0, undoStack: [[viewBlocks[0]]],
      })).toEqual([viewBlocks[0]]);

      expect(edit.sanitize).toBeTypeOf('function');
      const sanitized = edit.sanitize([
        { x: 1.4, y: 2.2, z: -3.7, shape: 'ramp', material: 'wood', color: 'var(--wood, #ABCDEF)', rotation: 450 },
        { x: 1, y: 2, z: -4, shape: 'door', material: 'glass' }, // duplicate after rounding
        { x: 0, y: 32, z: 0, shape: 'block', material: 'stone' },
        { x: 2, y: 0, z: 2, shape: '__proto__', material: 'toString', color: 'invalid', rotation: -90 },
      ]);
      expect(sanitized).toHaveLength(2);
      expect(sanitized[0]).toMatchObject({ x: 1, y: 2, z: -4, shape: 'ramp', material: 'wood', color: '#abcdef', rotation: 90 });
      expect(sanitized[1]).toMatchObject({ x: 2, y: 0, z: 2, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 270 });

      expect(edit.reflectRotation(0, 'x')).toBe(180);
      expect(edit.reflectRotation(90, 'x')).toBe(90);
      expect(edit.reflectRotation(90, 'z')).toBe(270);

      const elevated = [
        { x: 0, y: 5, z: 0, shape: 'block', material: 'stone' },
        { x: 0, y: 7, z: 0, shape: 'roof', material: 'wood' },
        { x: 2, y: 0, z: 0, shape: 'column', material: 'metal' },
      ];
      expect(Object.keys(edit.unsupportedKeys(elevated)).sort()).toEqual(['0,5,0', '0,7,0']);
      const settled = edit.settle(elevated);
      expect(settled.moved).toBe(2);
      expect(settled.blocks.filter((b) => b.x === 0).map((b) => b.y)).toEqual([0, 1]);

      expect(edit.changeCamera({ rotX: -24, rotY: -38, scale: 1 }, 'left')).toMatchObject({ rotY: -53 });
      expect(edit.changeCamera({ rotX: -86, rotY: 0, scale: 2.95 }, 'up')).toMatchObject({ rotX: -88 });
      expect(edit.changeCamera({ rotX: 0, rotY: 0, scale: 2.95 }, 'zoomIn')).toMatchObject({ scale: 3 });
      expect(edit.changeCamera({}, 'reset')).toMatchObject({ rotX: -24, rotY: -38, scale: 1 });
    });
  }

  it('keeps both pointer and keyboard-operable authoring surfaces visible in source', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain('onClick: editAtPointer');
      expect(source).toContain("'data-arch-cell': x + ',' + editLayer + ',' + z");
      expect(source).toContain("!mainUse3d && renderBuildGrid()");
      expect(source).toContain("'3D is unavailable, but the floor grid is fully editable.'");
      expect(source).toContain('function makeArchGeometry(shape)');
      expect(source).toContain("shape: b.shape || 'block'");
      expect(source).toContain("upd('activeRotation', nextDeg)");
      expect(source).toContain('function buildPlacementGrid(minX, maxX, minZ, maxZ)');
      expect(source).toContain('ArchGL.preview(hoverTarget');
      expect(source).toContain("'aria-label': 'Three-dimensional camera controls'");
      expect(source).toContain("if (showReplay) {");
    }
  });

  it('renders the enhanced default editor without throwing', () => {
    for (const file of files) {
      resetStemLab();
      loadTool(file, 'archStudio');
      const html = renderTool('archStudio', { archStudio: { blocks: [] } });
      expect(html).toContain('Architecture Studio');
      expect(html).toContain('data-arch-gl="true"');
      expect(html).toContain('Three-dimensional camera controls');
      expect(html).toContain('Floor Grid');
    }
  });
});
