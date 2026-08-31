import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { React, ReactDOMClient, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

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
  edit.blockAction = window.__alloArchBlockAction;
  edit.mergeBlocks = window.__alloArchMergeBlocks;
  edit.nearestLayer = window.__alloArchNearestLayer;
  edit.moveGridCursor = window.__alloArchMoveGridCursor;
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
      // Read-only or future tools must never fall through to placement.
      expect(edit(placed, { mode: 'pick', block: { x: 2, y: 1, z: 3 }, place: { x: 9, y: 0, z: 9 } })).toBe(placed);

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
      expect(Array.from(edit.gridBounds(true, -64, 64, -64))).toEqual([-64, -33]);
      expect(Array.from(edit.gridBounds(true, -64, 64, 64))).toEqual([33, 64]);
      expect(Array.from(edit.gridBounds(true, -64, 64, -999))).toEqual([-64, -33]);
      expect(Array.from(edit.gridBounds(true, -64, 64, 999))).toEqual([33, 64]);

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

      expect(edit.blockAction).toBeTypeOf('function');
      const selectable = [
        { x: 0, y: 0, z: 0, shape: 'ramp', material: 'wood', color: '#123456', rotation: 270 },
        { x: 1, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 },
      ];
      expect(edit.blockAction(selectable, { type: 'move', cell: selectable[0], dx: 1 })).toBe(selectable);
      const movedSelection = edit.blockAction(selectable, { type: 'move', cell: selectable[0], dy: 1 });
      expect(movedSelection[0]).toMatchObject({ x: 0, y: 1, z: 0, shape: 'ramp', material: 'wood', rotation: 270 });
      const duplicatedSelection = edit.blockAction(movedSelection, { type: 'duplicate', cell: movedSelection[0], dy: 1 });
      expect(duplicatedSelection).toHaveLength(3);
      expect(duplicatedSelection[2]).toMatchObject({ x: 0, y: 2, z: 0, shape: 'ramp', material: 'wood', color: '#123456', rotation: 270 });
      const replacedSelection = edit.blockAction(duplicatedSelection, {
        type: 'replace', cell: duplicatedSelection[2], shape: 'door', material: 'glass', color: '#abcdef', rotation: 450,
      });
      expect(replacedSelection[2]).toMatchObject({ shape: 'door', material: 'glass', color: '#abcdef', rotation: 90 });
      expect(edit.blockAction(replacedSelection, { type: 'move', cell: replacedSelection[2], dy: 40 })).toBe(replacedSelection);
      expect(edit.blockAction(replacedSelection, { type: 'delete', cell: replacedSelection[2] })).toHaveLength(2);

      expect(edit.mergeBlocks).toBeTypeOf('function');
      const nearCapacity = [];
      for (let y = 0; y < 32 && nearCapacity.length < 4095; y++) {
        for (let x = -64; x <= 64 && nearCapacity.length < 4095; x++) {
          nearCapacity.push({ x, y, z: -64, shape: 'block', material: 'stone', color: '#94a3b8' });
        }
      }
      const capped = edit.mergeBlocks(nearCapacity, [
        { x: 0, y: 0, z: -64, shape: 'block', material: 'stone' },
        { x: 0, y: 0, z: -63, shape: 'block', material: 'stone' },
        { x: 1, y: 0, z: -63, shape: 'block', material: 'stone' },
      ]);
      expect(capped.blocks).toHaveLength(4096);
      expect(capped.added).toBe(1);
      expect(capped.skipped).toBe(1);

      expect(edit.nearestLayer).toBeTypeOf('function');
      expect(edit.nearestLayer([{ y: 0 }, { y: 4 }], 3)).toBe(4);
      expect(edit.nearestLayer([{ y: 0 }, { y: 4 }], 2)).toBe(0);

      expect(edit.moveGridCursor).toBeTypeOf('function');
      const cursorBounds = { minX: 0, maxX: 9, minZ: 0, maxZ: 9 };
      expect({ ...edit.moveGridCursor({ x: 0, z: 0 }, 'ArrowLeft', cursorBounds) }).toEqual({ x: 0, z: 0 });
      expect({ ...edit.moveGridCursor({ x: 0, z: 0 }, 'ArrowRight', cursorBounds) }).toEqual({ x: 1, z: 0 });
      expect({ ...edit.moveGridCursor({ x: 1, z: 0 }, 'ArrowDown', cursorBounds) }).toEqual({ x: 1, z: 1 });
      expect({ ...edit.moveGridCursor({ x: 4, z: 5 }, 'Home', cursorBounds) }).toEqual({ x: 0, z: 5 });
      expect({ ...edit.moveGridCursor({ x: 4, z: 5 }, 'End', cursorBounds) }).toEqual({ x: 9, z: 5 });
      expect({ ...edit.moveGridCursor({ x: 4, z: 5 }, 'Home', cursorBounds, true) }).toEqual({ x: 0, z: 0 });
      expect({ ...edit.moveGridCursor({ x: 4, z: 5 }, 'End', cursorBounds, true) }).toEqual({ x: 9, z: 9 });
    });
  }

  it('keeps both pointer and keyboard-operable authoring surfaces visible in source', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain('onClick: editAtPointer');
      expect(source).toContain("'data-arch-cell': x + ',' + editLayer + ',' + z");
      expect(source).toContain('function moveArchGridCursor(current, key, bounds, ctrlKey)');
      expect(source).toContain("'data-arch-grid': 'true'");
      expect(source).toContain("role: 'row'");
      expect(source).toContain('tabIndex: x === cursorX && z === cursorZ ? 0 : -1');
      expect(source).toContain("'aria-rowcount': rows");
      expect(source).toContain('openArchGridForKeyboard();');
      expect(source).toContain("!mainUse3d && renderBuildGrid()");
      expect(source).toContain("'3D is unavailable, but the floor grid is fully editable.'");
      expect(source).toContain('function makeArchGeometry(shape)');
      expect(source).toContain("shape: b.shape || 'block'");
      expect(source).toContain("upd('activeRotation', nextDeg)");
      expect(source).toContain('function buildPlacementGrid(minX, maxX, minZ, maxZ)');
      expect(source).toContain('ArchGL.preview(hoverTarget');
      expect(source).toContain("'aria-label': 'Three-dimensional camera controls'");
      expect(source).toContain("if (showReplay) {");
      expect(source).toContain('var pickArchProperties = function (target)');
      expect(source).toContain("mode === 'pick'");
      expect(source).toContain("upd('mode', 'pick')");
      expect(source).toContain("k === 'PageUp' || k === 'PageDown'");
      expect(source).toContain('function applyArchBlockAction(currentBlocks, action)');
      expect(source).toContain('function mergeArchBlocksWithinLimit(currentBlocks, candidateBlocks)');
      expect(source).toContain('var requireLiveBuild = function ()');
      expect(source).toContain('selectionOutlineVisible: !!selectionMesh');
      expect(source).toContain("'data-arch-inspector': 'true'");
      expect(source).toContain("'data-arch-selection-chip': 'true'");
      expect(source).toContain("selectedBlockKey: selectedAfterEdit");
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
      expect(html).toContain('Pick mode');
    }
  });

  it('copies a block with Pick and immediately repeats it on another floor', async () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_archstudio.js', 'archStudio');
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    let latest = null;
    let setToolDataExternal = null;
    const announcements = [];

    function Harness() {
      const state = React.useState({ archStudio: {
        editorView: 'grid', undoStack: [], selectedBlockKey: '0,0,0',
        blocks: [{ x: 0, y: 0, z: 0, shape: 'ramp', material: 'wood', color: '#123456', rotation: 270 }],
      } });
      const toolData = state[0];
      const setToolData = state[1];
      setToolDataExternal = setToolData;
      latest = toolData.archStudio;
      const ctx = {
        React,
        toolData,
        update(bucket, key, value) {
          setToolData((prev) => Object.assign({}, prev, { [bucket]: Object.assign({}, prev[bucket] || {}, { [key]: value }) }));
        },
        updateMulti(bucket, patch) {
          setToolData((prev) => Object.assign({}, prev, { [bucket]: Object.assign({}, prev[bucket] || {}, patch) }));
        },
        setToolData,
        setStemLabTool() {}, addToast() {}, awardXP() {}, celebrate() {}, beep() {},
        announceToSR(message) { announcements.push(String(message)); },
        getXP() { return 0; }, callGemini: null, gradeLevel: '5th Grade', toolSnapshots: [], props: {},
        t(key, fallback) { return fallback || key; },
        icons: new Proxy({}, { get() { return function Icon() { return React.createElement('span'); }; } }),
        a11yClick(fn) { return { onClick: fn, role: 'button', tabIndex: 0 }; }, srOnly: {},
      };
      return cfg.render(ctx);
    }

    await React.act(async () => { root.render(React.createElement(Harness)); });
    expect(host.querySelectorAll('[role="gridcell"][tabindex="0"]')).toHaveLength(1);
    const firstGridCell = host.querySelector('[data-arch-cell="0,0,0"]');
    await React.act(async () => {
      firstGridCell.focus();
      firstGridCell.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
    expect(document.activeElement).toBe(host.querySelector('[data-arch-cell="1,0,0"]'));
    expect(document.activeElement.tabIndex).toBe(0);
    await React.act(async () => {
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
    expect(document.activeElement).toBe(host.querySelector('[data-arch-cell="1,0,1"]'));
    await React.act(async () => {
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
    expect(document.activeElement).toBe(host.querySelector('[data-arch-cell="-5,0,1"]'));
    await React.act(async () => {
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', ctrlKey: true, bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
    expect(document.activeElement).toBe(host.querySelector('[data-arch-cell="4,0,4"]'));
    expect(host.querySelectorAll('[role="gridcell"][tabindex="0"]')).toHaveLength(1);

    await React.act(async () => { host.querySelector('[aria-label="Pick mode"]').click(); });
    await React.act(async () => { host.querySelector('[data-arch-cell="0,0,0"]').click(); });
    expect(latest).toMatchObject({
      mode: 'place', activeShape: 'ramp', activeMaterial: 'wood', activeColor: '#123456', activeRotation: 270,
      selectedBlockKey: '0,0,0',
    });
    expect(latest.blocks).toHaveLength(1);
    expect(latest.undoStack).toEqual([]);
    expect(announcements.at(-1)).toContain('Place mode active');
    expect(host.querySelector('[data-arch-inspector="true"]')).not.toBeNull();

    const clearSelection = host.querySelector('[aria-label="Clear selected block"]');
    await React.act(async () => {
      clearSelection.focus();
      clearSelection.click();
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
    expect(latest.selectedBlockKey).toBe('');
    expect(document.activeElement).toBe(host.querySelector('#arch-studio-region'));
    expect(announcements.at(-1)).toBe('Block selection cleared.');
    await React.act(async () => { host.querySelector('[aria-label="Pick mode"]').click(); });
    await React.act(async () => { host.querySelector('[data-arch-cell="0,0,0"]').click(); });

    await React.act(async () => {
      host.querySelector('#arch-studio-region').dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true, cancelable: true }));
    });
    expect(latest.editLayer).toBe(1);
    await React.act(async () => { host.querySelector('[data-arch-cell="1,1,0"]').click(); });
    expect(latest.blocks).toHaveLength(2);
    expect(latest.blocks[1]).toMatchObject({
      x: 1, y: 1, z: 0, shape: 'ramp', material: 'wood', color: '#123456', rotation: 270,
    });
    expect(latest.selectedBlockKey).toBe('1,1,0');
    expect(host.querySelector('[data-arch-cell="1,1,0"]').getAttribute('aria-selected')).toBe('true');

    await React.act(async () => { host.querySelector('[aria-label="Move selected block right along X"]').click(); });
    expect(latest.blocks[1]).toMatchObject({ x: 2, y: 1, z: 0 });
    expect(latest.selectedBlockKey).toBe('2,1,0');

    await React.act(async () => {
      host.querySelector('#arch-studio-region').dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true, cancelable: true }));
    });
    expect(latest.blocks).toHaveLength(3);
    expect(latest.selectedBlockKey).toBe('2,2,0');

    await React.act(async () => { host.querySelector('[aria-label="Door shape"]').click(); });
    await React.act(async () => { host.querySelector('[aria-label="Use Glass material"]').click(); });
    await React.act(async () => { host.querySelector('[aria-label="Use 90\u00B0 rotation"]').click(); });
    await React.act(async () => { host.querySelector('[aria-label="Apply current properties to selected block"]').click(); });
    expect(latest.blocks.find((b) => `${b.x},${b.y},${b.z}` === latest.selectedBlockKey)).toMatchObject({
      shape: 'door', material: 'glass', color: '#38bdf8', rotation: 90,
    });

    const unrelatedShapeButton = host.querySelector('[aria-label="Block shape"]');
    await React.act(async () => {
      unrelatedShapeButton.focus();
      unrelatedShapeButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
    });
    expect(latest.blocks).toHaveLength(3);

    const deleteSelection = host.querySelector('[aria-label="Delete selected block"]');
    await React.act(async () => {
      deleteSelection.focus();
      deleteSelection.click();
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
    expect(latest.blocks).toHaveLength(2);
    expect(latest.selectedBlockKey).toBe('');
    expect(host.querySelector('[data-arch-inspector="true"]')).toBeNull();
    expect(document.activeElement).toBe(host.querySelector('#arch-studio-region'));

    await React.act(async () => {
      host.querySelector('#arch-studio-region').dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
    });
    expect(latest.blocks).toHaveLength(3);
    expect(latest.selectedBlockKey).toBe('');
    await React.act(async () => {
      host.querySelector('#arch-studio-region').dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true, cancelable: true }));
    });
    expect(latest.blocks).toHaveLength(2);

    await React.act(async () => {
      setToolDataExternal({ archStudio: {
        editorView: 'grid', editLayer: 0, viewLayer: 0, undoStack: [], redoStack: [], selectedBlockKey: '0,0,0',
        blocks: [{ x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 }],
      } });
    });
    await React.act(async () => { host.querySelector('[aria-label="Move selected block up one floor"]').click(); });
    expect(latest.editLayer).toBe(1);
    expect(latest.viewLayer).toBe(1);
    await React.act(async () => {
      host.querySelector('#arch-studio-region').dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
    });
    expect(latest.blocks[0]).toMatchObject({ x: 0, y: 0, z: 0 });
    expect(latest.editLayer).toBe(0);
    expect(latest.viewLayer).toBe(0);

    await React.act(async () => {
      setToolDataExternal({ archStudio: {
        editorView: 'grid', editLayer: 0, mode: 'paint', symmetryMode: true,
        activeMaterial: 'glass', activeColor: '#38bdf8', undoStack: [], redoStack: [],
        blocks: [{ x: -2, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 }],
      } });
    });
    await React.act(async () => { host.querySelector('[data-arch-cell="2,0,0"]').click(); });
    expect(latest.blocks[0]).toMatchObject({ x: -2, y: 0, z: 0, material: 'glass', color: '#38bdf8' });
    expect(latest.selectedBlockKey).toBe('-2,0,0');

    await React.act(async () => {
      setToolDataExternal((prev) => ({ archStudio: Object.assign({}, prev.archStudio, {
        showReplay: true,
        replayStep: 0,
        undoStack: [[{ x: -2, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 }]],
      }) }));
    });
    expect(host.querySelector('[title="Exit construction replay to clear the build"]').disabled).toBe(true);
    expect(host.querySelector('[title="Exit construction replay to apply gravity"]').disabled).toBe(true);
    expect(host.querySelector('[title="Exit construction replay to mirror the build"]').disabled).toBe(true);
    expect(host.querySelector('[data-arch-grid="true"]').getAttribute('aria-readonly')).toBe('true');
    expect(host.querySelector('[data-arch-cell="-2,0,0"]').getAttribute('aria-label')).toContain('stone block');
    expect(host.querySelector('[data-arch-cell="-2,0,0"]').getAttribute('aria-label')).toContain('read-only construction replay');

    await React.act(async () => {
      setToolDataExternal({ archStudio: {
        editorView: 'grid', editLayer: 0, viewLayer: -1, mode: 'place', undoStack: [], redoStack: [],
        gridCursorX: -64, gridCursorZ: 0, selectedBlockKey: '64,0,0',
        blocks: [
          { x: -64, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 },
          { x: 64, y: 0, z: 0, shape: 'column', material: 'metal', color: '#64748b', rotation: 0 },
        ],
      } });
    });
    expect(host.querySelector('[data-arch-cell="-64,0,0"]')).not.toBeNull();
    expect(host.querySelector('[data-arch-cell="64,0,0"]')).toBeNull();
    await React.act(async () => {
      host.querySelector('[aria-label="Reveal selected block"]').click();
      await new Promise((resolve) => setTimeout(resolve, 90));
    });
    expect(latest).toMatchObject({ gridCursorX: 64, gridCursorZ: 0, editLayer: 0 });
    expect(host.querySelector('[data-arch-cell="64,0,0"]')).not.toBeNull();
    expect(document.activeElement).toBe(host.querySelector('[data-arch-cell="64,0,0"]'));
    expect(document.activeElement.tabIndex).toBe(0);

    await React.act(async () => { root.unmount(); });
    host.remove();
  }, 15_000);
});
