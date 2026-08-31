import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const files = [
  path.resolve(process.cwd(), 'stem_lab/stem_tool_archstudio.js'),
  path.resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'),
];

describe('ArchStudio accessibility parity', () => {
  it('names share, authoring, and color controls', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain("'aria-label': t('stem.archstudio.share_code', 'Share code to copy')");
      expect(source).toContain("'aria-label': t('stem.archstudio.custom_color', 'Custom color')");
      expect(source).toContain("'aria-label': t('stem.archstudio.hypothesis', 'Structural stability hypothesis')");
      expect(source).toContain("'aria-label': t('stem.archstudio.explanation', 'Explain structural stability')");
      expect(source).toContain("'aria-label': t('stem.archstudio.screenshot', 'Screenshot')");
      expect(source).toContain("'aria-label': 'Use custom color ' + c");
    }
  });

  it('names picker, mirror, duplicate, and saved-build controls', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain("'aria-label': m.label + ' mode'");
      expect(source).toContain("'aria-pressed': mode === m.id");
      expect(source).toContain("'aria-label': 'Mirror entire build across the X axis'");
      expect(source).toContain("'aria-label': 'Mirror entire build across the Z axis'");
      expect(source).toContain("'aria-label': 'Load saved build ' + item.name");
      expect(source).toContain("'aria-label': 'Delete saved build ' + item.name");
      expect(source).toContain("'aria-label': t('stem.archstudio.copy_upward', 'Copy upward')");
      expect(source).toContain("'aria-label': 'Selected block inspector'");
      expect(source).toContain("label: 'Move selected block right along X'");
      expect(source).toContain("'aria-label': move.label");
      expect(source).toContain("'aria-label': 'Duplicate selected block above'");
      expect(source).toContain("'aria-label': 'Apply current properties to selected block'");
      expect(source).toContain("'aria-label': 'Delete selected block'");
      expect(source).toContain("'aria-selected': isSelected");
      expect(source).toContain("'aria-label': s.label + ' shape'");
      expect(source).toContain("'aria-label': 'Use ' + m.label + ' material'");
      expect(source).toContain("'aria-label': 'Use ' + r.label + ' rotation'");
      expect(source).toContain("'aria-hidden': 'true', style: { width: 16");
      expect(source).toContain("' \\u2022 Color ' + selectedColorLabel");
      expect(source).toContain("'data-arch-selection-chip': 'true', 'aria-hidden': 'true'");
      expect(source).toContain('minHeight: 28');
      expect(source).toContain('minHeight: 30');
      expect(source).toContain('var focusArchStudioRegion = function ()');
      expect(source).toContain("announceToSR('Block selection cleared.')");
      expect(source).toContain('var authoringShortcutSurface =');
      expect(source).not.toContain("(k === 'Delete' || k === 'Backspace')");
      expect(source).toContain('selectionMesh = new T.Mesh');
      expect(source).toContain('disabled: showReplay || !blocks.length');
    }
  });

  it('gives each glyph-only replay transport button a localized accessible name', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      for (const key of ['replay_first', 'replay_previous', 'replay_next', 'replay_last']) {
        expect(source).toContain(`'aria-label': t('stem.archstudio.${key}'`);
      }
    }
  });

  it('provides named keyboard-accessible controls for the three-dimensional camera', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain("'aria-label': 'Three-dimensional camera controls'");
      for (const label of ['Rotate view left', 'Rotate view right', 'Tilt view up', 'Tilt view down', 'Zoom in', 'Zoom out', 'Reset three-dimensional view']) {
        expect(source).toContain(`cameraBtn('${label}'`);
      }
      expect(source).toContain("ArrowLeft: 'left'");
      expect(source).toContain("Home: 'reset'");
    }
  });

  it('uses a described semantic grid with one roving keyboard stop', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain("'data-arch-grid': 'true'");
      expect(source).toContain("'aria-describedby': 'arch-grid-help'");
      expect(source).toContain("'aria-readonly': showReplay");
      expect(source).toContain("'aria-rowcount': rows");
      expect(source).toContain("'aria-colcount': cols");
      expect(source).toContain("role: 'row'");
      expect(source).toContain("role: 'gridcell'");
      expect(source).toContain('tabIndex: x === cursorX && z === cursorZ ? 0 : -1');
      expect(source).toContain('onGridCellKeyDown(ev, x, z)');
      expect(source).toContain("var cellName = b ? (b.material || 'stone') + ' ' + (b.shape || 'block')");
      expect(source).toContain('Arrow keys move between cells');
      expect(source).toContain('openArchGridForKeyboard();');
    }
  });

  it('keeps the source and public bundles byte-identical', () => {
    const hashes = files.map((file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
    expect(hashes[0]).toBe(hashes[1]);
  });
});
