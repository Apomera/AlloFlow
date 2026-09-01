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
  edit.dominantNormalStep = window.__alloArchDominantNormalStep;
  edit.reflectRotation = window.__alloArchReflectRotation;
  edit.blockAction = window.__alloArchBlockAction;
  edit.mergeBlocks = window.__alloArchMergeBlocks;
  edit.mirrorBlocks = window.__alloArchMirrorBlocks;
  edit.duplicateBlocks = window.__alloArchDuplicateBlocks;
  edit.nearestLayer = window.__alloArchNearestLayer;
  edit.moveGridCursor = window.__alloArchMoveGridCursor;
  edit.replacementViewState = window.__alloArchReplacementViewState;
  edit.buildSignature = window.__alloArchBuildSignature;
  edit.simulateEarthquake = window.__alloArchSimulateEarthquake;
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

      const strictCoordinates = edit.sanitize([
        { x: null, y: 0, z: 0, shape: 'block', material: 'stone' },
        { x: 1, y: '   ', z: 0, shape: 'block', material: 'stone' },
        { x: 2, y: 0, z: false, shape: 'block', material: 'stone' },
        { x: ' 3 ', y: ' 4 ', z: ' -5 ', shape: 'column', material: 'wood', color: '#92400e' },
      ]);
      expect(strictCoordinates).toHaveLength(1);
      expect(strictCoordinates[0]).toMatchObject({ x: 3, y: 4, z: -5, shape: 'column', material: 'wood' });

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

      expect(edit.dominantNormalStep).toBeTypeOf('function');
      expect({ ...edit.dominantNormalStep({ x: 0, y: 0.707, z: 0.707 }) }).toEqual({ x: 0, y: 1, z: 0 });
      expect({ ...edit.dominantNormalStep({ x: -0.9, y: 0.2, z: 0.3 }) }).toEqual({ x: -1, y: 0, z: 0 });
      expect({ ...edit.dominantNormalStep({ x: 0, y: 0, z: -1 }) }).toEqual({ x: 0, y: 0, z: -1 });

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

      expect(edit.mirrorBlocks).toBeTypeOf('function');
      const mirroredBuild = edit.mirrorBlocks([
        { x: 0, y: 0, z: 0, shape: 'ramp', material: 'stone', color: '#94a3b8', rotation: 0 },
        { x: 2, y: 0, z: 1, shape: 'door', material: 'wood', color: '#92400e', rotation: 90 },
      ], 'x');
      expect(mirroredBuild).toMatchObject({ added: 2, skipped: 0 });
      expect(mirroredBuild.blocks).toHaveLength(4);
      expect(mirroredBuild.blocks.find((b) => b.x === 2 && b.z === 0)).toMatchObject({ shape: 'ramp', rotation: 180 });

      expect(edit.duplicateBlocks).toBeTypeOf('function');
      const duplicatedBuild = edit.duplicateBlocks([
        { x: 2, y: 3, z: -4, shape: 'ramp', material: 'wood', color: '#abcdef', rotation: 90 },
      ], 1, 0, 0);
      expect(duplicatedBuild).toMatchObject({ added: 1, skipped: 0 });
      expect(duplicatedBuild.blocks[1]).toMatchObject({ x: 3, y: 3, z: -4, shape: 'ramp', rotation: 90 });

      expect(edit.nearestLayer).toBeTypeOf('function');
      expect(edit.nearestLayer([{ y: 0 }, { y: 4 }], 3)).toBe(4);
      expect(edit.nearestLayer([{ y: 0 }, { y: 4 }], 2)).toBe(0);
      expect(edit.nearestLayer([], 17)).toBe(0);

      expect(edit.moveGridCursor).toBeTypeOf('function');
      const cursorBounds = { minX: 0, maxX: 9, minZ: 0, maxZ: 9 };
      expect({ ...edit.moveGridCursor({ x: 0, z: 0 }, 'ArrowLeft', cursorBounds) }).toEqual({ x: 0, z: 0 });
      expect({ ...edit.moveGridCursor({ x: 0, z: 0 }, 'ArrowRight', cursorBounds) }).toEqual({ x: 1, z: 0 });
      expect({ ...edit.moveGridCursor({ x: 1, z: 0 }, 'ArrowDown', cursorBounds) }).toEqual({ x: 1, z: 1 });
      expect({ ...edit.moveGridCursor({ x: 4, z: 5 }, 'Home', cursorBounds) }).toEqual({ x: 0, z: 5 });
      expect({ ...edit.moveGridCursor({ x: 4, z: 5 }, 'End', cursorBounds) }).toEqual({ x: 9, z: 5 });
      expect({ ...edit.moveGridCursor({ x: 4, z: 5 }, 'Home', cursorBounds, true) }).toEqual({ x: 0, z: 0 });
      expect({ ...edit.moveGridCursor({ x: 4, z: 5 }, 'End', cursorBounds, true) }).toEqual({ x: 9, z: 9 });

      expect(edit.replacementViewState).toBeTypeOf('function');
      expect({ ...edit.replacementViewState([{ y: 4 }, { y: 7 }], 6) }).toMatchObject({
        viewLayer: -1,
        showSlice: false,
        sliceZSelected: false,
        filterMaterial: '',
        filterShape: '',
        editLayer: 7,
        gridCursorX: null,
        gridCursorZ: null,
        selectedBlockKey: '',
        quakeResult: null,
      });

      expect(edit.buildSignature).toBeTypeOf('function');
      const signatureBlock = { x: 2, y: 3, z: -4, shape: 'ramp', material: 'wood', color: '#abcdef', rotation: 90 };
      const signature = edit.buildSignature([signatureBlock]);
      expect(signature).toBe(edit.buildSignature([{ ...signatureBlock }]));
      expect(signature).not.toBe(edit.buildSignature([{ ...signatureBlock, material: 'glass' }]));
      expect(signature).not.toBe(edit.buildSignature([{ ...signatureBlock, rotation: 180 }]));

      expect(edit.simulateEarthquake).toBeTypeOf('function');
      const groundQuake = edit.simulateEarthquake([
        { x: 0, y: 0, z: 0, shape: 'block', material: 'stone' },
      ], 10, () => 0.5);
      const elevatedQuake = edit.simulateEarthquake([
        { x: 0, y: 5, z: 0, shape: 'block', material: 'stone' },
      ], 10, () => 0.5);
      expect(groundQuake).toMatchObject({ survived: 1, fallen: 0, pct: 100, intensity: 10 });
      expect(elevatedQuake).toMatchObject({ survived: 0, fallen: 1, pct: 0, intensity: 10 });

      const nearlyFull = [];
      for (let y = 0; y < 32 && nearlyFull.length < 4095; y++) {
        for (let x = -64; x <= 64 && nearlyFull.length < 4095; x++) {
          nearlyFull.push({ x, y, z: -64, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 });
        }
      }
      const cappedPlacement = edit(nearlyFull, {
        mode: 'place', symmetry: true, place: { x: 2, y: 31, z: 64 },
        shape: 'roof', material: 'wood', color: '#92400e', rotation: 90,
      });
      expect(cappedPlacement).toHaveLength(4096);
      expect(edit(cappedPlacement, { mode: 'place', place: { x: 3, y: 31, z: 64 } })).toBe(cappedPlacement);
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
      expect(source).toContain('function getArchReplacementViewState(nextBlocks, preferredLayer)');
      expect(source).toContain('getArchReplacementViewState(loadedBlocks, a.editLayer)');
      expect(source).toContain('getArchReplacementViewState(newBlocks, a.editLayer)');
      expect(source).toContain('getArchReplacementViewState(imported, a.editLayer)');
      expect(source).toContain('getArchReplacementViewState(gen, a.editLayer)');
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
      expect(source).toContain('function mirrorArchBlocksWithinLimit(currentBlocks, axis)');
      expect(source).toContain('function duplicateArchBlocksWithinLimit(currentBlocks, dx, dy, dz)');
      expect(source).toContain('var requireLiveBuild = function ()');
      expect(source).toContain('selectionOutlineVisible: !!selectionMesh');
      expect(source).toContain("'data-arch-inspector': 'true'");
      expect(source).toContain("'data-arch-selection-chip': 'true'");
      expect(source).toContain("selectedBlockKey: selectedAfterEdit");
      expect(source).toContain('function getArchBuildSignature(currentBlocks)');
      expect(source).toContain('aiAdviceBuildSignature === currentBuildSignature');
      expect(source).toContain('storedQuakeResult.buildSignature === currentBuildSignature');
      expect(source).toContain('var archHeatmapBlocks = showReplay ? archReplayFrame : blocks;');
      expect(source).toContain('if (a.showReplay) return p;');
      expect(source).toContain("showHeatmap ? '#' + ('000000' + archHexFor(b).toString(16)).slice(-6)");
      expect(source).toContain('Viewport and heatmap show this historical step. Analysis, wind, badges, and totals describe the live build.');
      expect(source).toContain('var pendingBadges = window.__archPendingBadgeIds');
      expect(source).toContain('var latestEarned = Object.assign({}, a.earnedBadges || {})');
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

  it('shows AI and earthquake results only for the build they analyzed', () => {
    for (const file of files) {
      const block = { x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 };
      const signature = loadReducer(file).buildSignature([block]);

      resetStemLab();
      loadTool(file, 'archStudio');
      const staleHtml = renderTool('archStudio', { archStudio: {
        blocks: [block], showAI: true, earnedBadges: { first_block: 1 },
        aiAdvice: 'STALE ARCHITECT ADVICE', aiAdviceBuildSignature: 'old-build',
        aiLoading: true, aiRequestBuildSignature: 'old-build',
        quakeResult: { rating: 'STALE QUAKE RESULT', pct: 100, fallen: 0, intensity: 10, buildSignature: 'old-build' },
      } });
      expect(staleHtml).not.toContain('STALE ARCHITECT ADVICE');
      expect(staleHtml).not.toContain('Analyzing your structure...');
      expect(staleHtml).not.toContain('STALE QUAKE RESULT');

      resetStemLab();
      loadTool(file, 'archStudio');
      const currentHtml = renderTool('archStudio', { archStudio: {
        blocks: [block], showAI: true, earnedBadges: { first_block: 1 },
        aiAdvice: 'CURRENT ARCHITECT ADVICE', aiAdviceBuildSignature: signature,
        quakeResult: { rating: 'CURRENT QUAKE RESULT', pct: 100, fallen: 0, intensity: 10, buildSignature: signature },
      } });
      expect(currentHtml).toContain('CURRENT ARCHITECT ADVICE');
      expect(currentHtml).toContain('CURRENT QUAKE RESULT');
    }
  });

  it('shows a share code only while it describes the current build', () => {
    for (const file of files) {
      const block = { x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 };
      const signature = loadReducer(file).buildSignature([block]);

      resetStemLab();
      loadTool(file, 'archStudio');
      const staleHtml = renderTool('archStudio', { archStudio: {
        blocks: [block], showShare: true, earnedBadges: { first_block: 1 },
        shareCode: 'STALE-SHARE-CODE', shareCodeBuildSignature: 'old-build',
      } });
      expect(staleHtml).not.toContain('STALE-SHARE-CODE');

      resetStemLab();
      loadTool(file, 'archStudio');
      const currentHtml = renderTool('archStudio', { archStudio: {
        blocks: [block], showShare: true, earnedBadges: { first_block: 1 },
        shareCode: 'CURRENT-SHARE-CODE', shareCodeBuildSignature: signature,
      } });
      expect(currentHtml).toContain('CURRENT-SHARE-CODE');
    }
  });

  it('ignores unknown persisted challenge and badge identifiers', () => {
    window.localStorage.removeItem('alloflow_archstudio_builds');
    for (const file of files) {
      resetStemLab();
      loadTool(file, 'archStudio');
      const html = renderTool('archStudio', { archStudio: {
        blocks: [], showBadges: true,
        completedChallenges: {
          legacy_a: 1, legacy_b: 1, legacy_c: 1, legacy_d: 1, legacy_e: 1,
          legacy_f: 1, legacy_g: 1, legacy_h: 1, legacy_i: 1, legacy_j: 1,
        },
        earnedBadges: { retired_badge: 1, experimental_badge: 1 },
      } });
      expect(html).toContain('0/10');
      expect(html).toContain('Badges (0/12)');
      expect(html).not.toContain('Badges (2/12)');
    }
  });

  it('repairs malformed persisted build and history containers before rendering', () => {
    for (const file of files) {
      resetStemLab();
      loadTool(file, 'archStudio');
      const malformedHtml = renderTool('archStudio', { archStudio: {
        blocks: [null, { x: null, y: 0, z: 0 }, { x: ' 2 ', y: ' 1 ', z: ' -3 ', shape: 'column', material: 'wood' }],
        undoStack: 'legacy-history',
        redoStack: [null, { blocks: 'not-a-frame' }, [null]],
        showReplay: true, replayStep: 999,
        viewLayer: 'not-a-layer', showSlice: true, sliceZ: 999,
        filterMaterial: 'lava', filterShape: 'sphere',
      } });
      expect(malformedHtml).not.toContain('data-arch-view-hud="true"');
      expect(malformedHtml).not.toContain('Replay Step 1000');

      resetStemLab();
      loadTool(file, 'archStudio');
      const clampedReplayHtml = renderTool('archStudio', { archStudio: {
        editorView: 'grid', blocks: [{ x: 0, y: 0, z: 0, shape: 'block', material: 'stone' }],
        undoStack: [[]], showReplay: true, replayStep: 999,
      } });
      expect(clampedReplayHtml).toContain('Replay Step 2/2');
      expect(clampedReplayHtml).not.toContain('Replay Step 1000');
    }
  });

  it('persists and reports an eligible badge once across rapid rerenders', async () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_archstudio.js', 'archStudio');
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const awards = [];
    const toasts = [];
    let latest = null;
    let updateExternal = null;
    delete window.__archPendingBadgeIds;

    function BadgeHarness() {
      const state = React.useState({ archStudio: {
        blocks: [{ x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 }],
        undoStack: [], redoStack: [], earnedBadges: {},
      } });
      const toolData = state[0];
      const setToolData = state[1];
      latest = toolData.archStudio;
      updateExternal = setToolData;
      return cfg.render({
        React, toolData, setToolData,
        update(bucket, key, value) { setToolData((prev) => Object.assign({}, prev, { [bucket]: Object.assign({}, prev[bucket] || {}, { [key]: value }) })); },
        updateMulti(bucket, patch) { setToolData((prev) => Object.assign({}, prev, { [bucket]: Object.assign({}, prev[bucket] || {}, patch) })); },
        setStemLabTool() {}, addToast(...args) { toasts.push(args); }, awardXP(...args) { awards.push(args); }, celebrate() {}, beep() {},
        announceToSR() {}, getXP() { return 0; }, callGemini: null, gradeLevel: '5th Grade', toolSnapshots: [], props: {},
        t(key, fallback) { return fallback || key; },
        icons: new Proxy({}, { get() { return function Icon() { return React.createElement('span'); }; } }),
        a11yClick(fn) { return { onClick: fn, role: 'button', tabIndex: 0 }; }, srOnly: {},
      });
    }

    await React.act(async () => { root.render(React.createElement(BadgeHarness)); });
    await React.act(async () => {
      updateExternal((prev) => ({ archStudio: Object.assign({}, prev.archStudio, { gridCursorX: 0 }) }));
      updateExternal((prev) => ({ archStudio: Object.assign({}, prev.archStudio, { gridCursorZ: 0 }) }));
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    await React.act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
    expect(latest.earnedBadges.first_block).toBeTruthy();
    expect(awards.filter((args) => args[0] === 'archStudio_badge_first_block')).toHaveLength(1);
    expect(toasts.filter((args) => String(args[0]).includes('Badge Earned'))).toHaveLength(1);
    await React.act(async () => { root.unmount(); });
    host.remove();
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
    let aiCalls = 0;
    let aiProvider = () => Promise.resolve('{"tips":["Ready"],"funFact":"Stable foundations spread loads."}');
    window.__archPendingBadgeIds = {
      first_block: true, hundred_club: true, all_shapes: true, all_mats: true,
      sky_high: true, rock_solid: true, perfect_sym: true, quake_proof: true,
      five_saves: true, challenger: true, mega_build: true, minimalist: true,
    };

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
        getXP() { return 0; }, callGemini(...args) { aiCalls++; return aiProvider(...args); }, gradeLevel: '5th Grade', toolSnapshots: [], props: {},
        t(key, fallback) { return fallback || key; },
        icons: new Proxy({}, { get() { return function Icon() { return React.createElement('span'); }; } }),
        a11yClick(fn) { return { onClick: fn, role: 'button', tabIndex: 0 }; }, srOnly: {},
      };
      return cfg.render(ctx);
    }

    await React.act(async () => { root.render(React.createElement(Harness)); });
    aiProvider = () => { throw new Error('synchronous provider failure'); };
    const aiToggle = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('AI Architect'));
    await React.act(async () => {
      aiToggle.click();
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
    expect(latest.aiLoading).toBe(false);
    expect(latest.aiAdvice).toContain('Could not reach AI advisor');
    expect(window.__archAiPendingReqId).toBe(0);

    let resolveAiRequest;
    aiCalls = 0;
    aiProvider = () => new Promise((resolve) => { resolveAiRequest = resolve; });
    const askAgain = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Ask Again'));
    await React.act(async () => {
      askAgain.click();
      askAgain.click();
    });
    expect(aiCalls).toBe(1);
    await React.act(async () => {
      resolveAiRequest('{"tips":["Fresh guidance"],"funFact":"Strong bases help."}');
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
    expect(latest.aiLoading).toBe(false);
    expect(latest.aiAdvice).toContain('Fresh guidance');
    expect(window.__archAiPendingReqId).toBe(0);
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

    const replayRaceCell = host.querySelector('[data-arch-cell="3,0,0"]');
    await React.act(async () => {
      setToolDataExternal((prev) => ({ archStudio: Object.assign({}, prev.archStudio, { showReplay: true, replayStep: 0 }) }));
      replayRaceCell.click();
    });
    expect(latest.showReplay).toBe(true);
    expect(latest.blocks).toHaveLength(1);
    expect(latest.undoStack).toEqual([]);
    await React.act(async () => {
      setToolDataExternal((prev) => ({ archStudio: Object.assign({}, prev.archStudio, { showReplay: false, replayStep: -1 }) }));
    });

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
    expect(latest.editLayer).toBe(1);
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

    const historyBlockA = { x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 };
    const historyBlockB = { x: 1, y: 0, z: 0, shape: 'column', material: 'wood', color: '#92400e', rotation: 0 };
    await React.act(async () => {
      setToolDataExternal({ archStudio: {
        editorView: 'grid', editLayer: 0, viewLayer: -1, undoStack: [[], [historyBlockA]], redoStack: [],
        blocks: [historyBlockA, historyBlockB],
      } });
    });
    await React.act(async () => {
      const region = host.querySelector('#arch-studio-region');
      region.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
      region.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
    expect(latest.blocks).toHaveLength(0);
    expect(latest.undoStack).toHaveLength(0);
    expect(latest.redoStack).toHaveLength(2);
    await React.act(async () => {
      const region = host.querySelector('#arch-studio-region');
      region.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true, cancelable: true }));
      region.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
    expect(latest.blocks).toHaveLength(2);
    expect(latest.undoStack).toHaveLength(2);
    expect(latest.redoStack).toHaveLength(0);

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
    await React.act(async () => { host.querySelector('[aria-label="Reveal selected block"]').click(); });
    await React.act(async () => { await new Promise((resolve) => setTimeout(resolve, 90)); });
    expect(latest).toMatchObject({ gridCursorX: 64, gridCursorZ: 0, editLayer: 0 });
    expect(host.querySelector('[data-arch-cell="64,0,0"]')).not.toBeNull();
    expect(document.activeElement).toBe(host.querySelector('[data-arch-cell="64,0,0"]'));
    expect(document.activeElement.tabIndex).toBe(0);

    const mutationBlockA = { x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 };
    const mutationBlockB = { x: 1, y: 0, z: 0, shape: 'column', material: 'wood', color: '#92400e', rotation: 0 };
    await React.act(async () => {
      setToolDataExternal({ archStudio: {
        editorView: 'grid', editLayer: 7, viewLayer: 7, filterMaterial: 'wood', showSlice: true, sliceZSelected: true,
        blocks: [mutationBlockA], undoStack: [], redoStack: [],
      } });
    });
    const staleClearButton = host.querySelector('[title="Clear the live build"]');
    await React.act(async () => {
      setToolDataExternal((prev) => ({ archStudio: Object.assign({}, prev.archStudio, { blocks: [mutationBlockA, mutationBlockB] }) }));
      staleClearButton.click();
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
    expect(latest.blocks).toEqual([]);
    expect(latest.undoStack.at(-1)).toEqual([mutationBlockA, mutationBlockB]);
    expect(latest).toMatchObject({ editLayer: 0, viewLayer: -1, filterMaterial: '', filterShape: '', showSlice: false, sliceZSelected: false });
    await React.act(async () => {
      host.querySelector('#arch-studio-region').dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
    });
    expect(latest.blocks).toEqual([mutationBlockA, mutationBlockB]);

    await React.act(async () => {
      setToolDataExternal({ archStudio: {
        editorView: 'grid', editLayer: 7, viewLayer: 7, undoStack: [], redoStack: [],
        blocks: [
          { x: 0, y: 5, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 },
          { x: 0, y: 7, z: 0, shape: 'roof', material: 'wood', color: '#92400e', rotation: 0 },
        ],
      } });
    });
    await React.act(async () => { host.querySelector('[title="Apply gravity (drop floating blocks)"]').click(); });
    expect(latest.blocks.map((b) => b.y)).toEqual([0, 1]);
    expect(latest).toMatchObject({ editLayer: 1, viewLayer: 1 });

    await React.act(async () => {
      setToolDataExternal({ archStudio: {
        editorView: 'grid', editLayer: 5, viewLayer: 5, showFilter: true, filterMaterial: 'wood', filterShape: '',
        showSlice: true, sliceZSelected: true, undoStack: [], redoStack: [],
        blocks: [
          { x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 },
          { x: 0, y: 5, z: 0, shape: 'roof', material: 'wood', color: '#92400e', rotation: 0 },
        ],
      } });
    });
    await React.act(async () => { host.querySelector('[title="Remove matching blocks"]').click(); });
    expect(latest.blocks).toHaveLength(1);
    expect(latest.blocks[0]).toMatchObject({ y: 0, material: 'stone' });
    expect(latest).toMatchObject({ editLayer: 0, viewLayer: 0, filterMaterial: '', filterShape: '', showSlice: false, sliceZSelected: false });

    await React.act(async () => {
      setToolDataExternal({ archStudio: {
        editorView: 'grid', editLayer: 0, viewLayer: 0, mode: 'pick', selectedBlockKey: '0,0,0',
        showFilter: false, filterMaterial: 'stone', filterShape: 'block',
        showSlice: true, sliceZ: 0, sliceZSelected: true, undoStack: [], redoStack: [],
        blocks: [{ x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 }],
      } });
    });
    await React.act(async () => {
      host.querySelector('[aria-label="Delete selected block"]').click();
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
    expect(latest.blocks).toEqual([]);
    expect(latest).toMatchObject({
      editLayer: 0, viewLayer: -1, filterMaterial: '', filterShape: '', showSlice: false, sliceZSelected: false,
    });

    await React.act(async () => { root.unmount(); });
    host.remove();
  }, 15_000);
});
