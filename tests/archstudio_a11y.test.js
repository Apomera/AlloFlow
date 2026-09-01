import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { React, ReactDOMClient, loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = [
  path.resolve(process.cwd(), 'stem_lab/stem_tool_archstudio.js'),
  path.resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'),
];

describe('ArchStudio accessibility parity', () => {
  it('exposes the pressed state of every header pill as a real button', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const pillStart = source.indexOf('var pillBtn = function');
      const pillEnd = source.indexOf('var cameraBtn = function', pillStart);
      const pillHelper = source.slice(pillStart, pillEnd);
      expect(pillStart).toBeGreaterThanOrEqual(0);
      expect(pillEnd).toBeGreaterThan(pillStart);
      expect(pillHelper).toMatch(/type:\s*'button'/);
      expect(pillHelper).toMatch(/'aria-pressed':\s*!*isActive/);
    }
  });

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
      expect(source).toContain("'aria-pressed': modeActive");
      expect(source).toContain('var modeActive = mode === m.id');
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
      expect(source).toContain("'aria-hidden': 'true', style: { width: 22");
      expect(source).toContain("el('span', null, 'Color '");
      expect(source).toContain("normalizeArchRotation(selectedBlock.rotation) + '\\u00B0'");
      expect(source).toContain("'data-arch-selection-chip': 'true', 'aria-hidden': 'true'");
      expect(source).toContain('minHeight: 28');
      expect(source).toContain('minHeight: 32');
      expect(source).toContain('minHeight: 34');
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

  it('names shape, optional-color, and filter choices and exposes their selected state', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');

      const shapePalette = source.slice(source.indexOf('// Shape palette'), source.indexOf('// Rotation selector'));
      expect(shapePalette).toContain("'aria-label': s.label + ' shape'");
      expect(shapePalette).toContain("'aria-pressed': activeShape === s.id");

      const optionalColorStart = source.indexOf('colorSwatches.map');
      const optionalColors = source.slice(optionalColorStart, source.indexOf('// ── Cross-Section Slicer', optionalColorStart));
      expect(optionalColors).toMatch(/'aria-label':\s*'Use (?:custom color|colour) '\s*\+\s*c(?:\.toUpperCase\(\))?/);
      expect(optionalColors).toMatch(/'aria-pressed':\s*(?:activeColor|customColor)\s*===\s*c/);

      const filters = source.slice(source.lastIndexOf('// ── Block Search / Filter'), source.lastIndexOf('// ── Achievement Badges'));
      expect(filters).toContain("'aria-label': 'Show all materials'");
      expect(filters).toContain("'aria-pressed': !filterMaterial");
      expect(filters).toContain("'aria-label': 'Filter by ' + m.label + ' material'");
      expect(filters).toContain("'aria-pressed': filterMaterial === m.id");
      expect(filters).toContain("'aria-label': 'Show all shapes'");
      expect(filters).toContain("'aria-pressed': !filterShape");
      expect(filters).toContain("'aria-label': 'Filter by ' + s.label + ' shape'");
      expect(filters).toContain("'aria-pressed': filterShape === s.id");
    }
  });

  it('exposes the Active View dock as a named group with labeled removable settings', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const chipStart = source.indexOf('var activeViewChips = []');
      const dockStart = source.indexOf("activeViewChips.length > 0 && el('div'", chipStart);
      const dockEnd = source.indexOf('// Analysis overlay', dockStart);
      const chips = source.slice(chipStart, source.indexOf('var resetArchView', chipStart));
      const dock = source.slice(dockStart, dockEnd);

      expect(chipStart).toBeGreaterThanOrEqual(0);
      expect(dockStart).toBeGreaterThan(chipStart);
      expect(dockEnd).toBeGreaterThan(dockStart);
      for (const [id, label] of [
        ['layer', 'Show all floor layers'],
        ['slice', 'Clear Z cross-section'],
        ['material', 'Clear material filter'],
        ['shape', 'Clear shape filter'],
        ['heatmap', 'Turn off load heatmap'],
        ['replay', 'Exit construction replay'],
        ['blueprint', 'Exit blueprint view'],
      ]) {
        expect(chips).toContain(`id: '${id}'`);
        expect(chips).toContain(`clearLabel: '${label}'`);
      }
      expect(dock).toContain("'data-arch-view-hud': 'true'");
      expect(dock).toMatch(/role:\s*'group'/);
      expect(dock).toContain("'aria-label': mainUse3d ? 'Active view settings' : 'Three-dimensional view settings'");
      expect(dock).toContain("mainUse3d ? '\\uD83D\\uDC41 Active View \\u2022 '");
      expect(dock).toContain(": '\\uD83D\\uDC41 3D View Settings'");
      expect(dock).toContain("'aria-label': chip.clearLabel");
      expect(dock).toContain("'aria-hidden': 'true'");
      expect(dock).toContain("'data-arch-reset-view': 'true'");
      expect(dock).toContain("'aria-label': 'Reset layer, slice, filters, heatmap, replay, and blueprint view settings'");
    }
  });

  it('links selected-object inspector sections and palette groups to visible names', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const inspectorStart = source.indexOf("selectedBlock && el('section'");
      const inspectorEnd = source.indexOf('// Shape palette', inspectorStart);
      const inspector = source.slice(inspectorStart, inspectorEnd);

      expect(inspectorStart).toBeGreaterThanOrEqual(0);
      expect(inspectorEnd).toBeGreaterThan(inspectorStart);
      expect(inspector).toContain("'data-arch-inspector': 'true'");
      expect(inspector).toContain("'data-arch-selected-key': selectedBlockKey");
      expect(inspector).toContain("'aria-labelledby': 'arch-selected-heading'");
      expect(inspector).toContain("id: 'arch-selected-heading'");
      for (const [hook, label] of [
        ['data-arch-inspector-coordinates', 'Selected object coordinates'],
        ['data-arch-inspector-moves', 'Move selected object one cell'],
        ['data-arch-inspector-actions', 'Selected object actions'],
      ]) {
        expect(inspector).toContain(`'${hook}': 'true'`);
        expect(inspector).toContain(`'aria-label': '${label}'`);
      }
      expect((inspector.match(/role:\s*'group'/g) || [])).toHaveLength(3);

      for (const headingId of ['arch-shapes-heading', 'arch-rotation-heading', 'arch-materials-heading', 'arch-colors-heading']) {
        const headingStart = source.indexOf(`id: '${headingId}'`, inspectorEnd);
        const groupStart = source.indexOf("role: 'group'", headingStart);
        const groupEnd = source.indexOf('style:', groupStart);
        expect(headingStart).toBeGreaterThan(inspectorEnd);
        expect(groupStart).toBeGreaterThan(headingStart);
        expect(source.slice(groupStart, groupEnd)).toContain(`'aria-labelledby': '${headingId}'`);
      }
    }
  });

  it('scopes hover, press, and focus-visible feedback to Architecture Studio controls', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const styleStart = source.indexOf("el('style', null,");
      const styleEnd = source.indexOf('// ── Header', styleStart);
      const scopedStyles = source.slice(styleStart, styleEnd);

      expect(styleStart).toBeGreaterThanOrEqual(0);
      expect(styleEnd).toBeGreaterThan(styleStart);
      expect(scopedStyles).toContain('#arch-studio-region button:not(:disabled):hover');
      expect(scopedStyles).toContain('#arch-studio-region button:not(:disabled):active');
      expect(scopedStyles).toContain('#arch-studio-region button:focus-visible');
      expect(scopedStyles).toContain('outline:2px solid #38bdf8');
      expect(source).toContain('@media (prefers-reduced-motion: reduce)');
    }
  });

  it('uses finite attention motion for the challenge claim control', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const claimStart = source.indexOf('justCompleted && challengeProgress');
      const claimEnd = source.indexOf('// Gallery Panel', claimStart);
      const claimControl = source.slice(claimStart, claimEnd);
      const animation = claimControl.match(/animation:\s*'([^']+)'/);

      expect(claimStart).toBeGreaterThanOrEqual(0);
      expect(claimEnd).toBeGreaterThan(claimStart);
      expect(animation).toBeTruthy();
      expect(animation[1]).not.toMatch(/\binfinite\b/i);
      expect(animation[1]).toMatch(/\s[1-9]\d*\s*$/);
    }
  });

  it('marks the three-dimensional loader as a busy live status', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const loaderStart = source.indexOf('mainUse3d && !archGlLive &&');
      const loaderEnd = source.indexOf('!mainUse3d && renderBuildGrid()', loaderStart);
      const loader = source.slice(loaderStart, loaderEnd);

      expect(loaderStart).toBeGreaterThanOrEqual(0);
      expect(loaderEnd).toBeGreaterThan(loaderStart);
      expect(loader).toMatch(/role:\s*'status'/);
      expect(loader).toMatch(/'aria-live':\s*'polite'/);
      expect(loader).toMatch(/'aria-busy':\s*(?:'true'|true)/);
      expect(loader).toContain('Open Floor Grid');
    }
  });

  it('exposes AI work as a busy region with a visible live loading status', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const aiStart = source.indexOf('// AI Architect overlay');
      const aiEnd = source.indexOf('// Bottom stats bar', aiStart);
      const aiPanel = source.slice(aiStart, aiEnd);

      expect(aiStart).toBeGreaterThanOrEqual(0);
      expect(aiEnd).toBeGreaterThan(aiStart);
      expect(aiPanel).toMatch(/role:\s*'region'/);
      expect(aiPanel).toContain("'aria-label': 'AI Architect advice'");
      expect(aiPanel).toContain("'aria-busy': aiLoading");
      expect(aiPanel).toMatch(/aiLoading\s*&&\s*el\('div',\s*\{\s*role:\s*'status'/);
      expect(aiPanel).toMatch(/'aria-live':\s*'polite'/);
      expect(aiPanel).toContain('Refreshing advice for this build');
      expect(aiPanel).toContain('Analyzing your structure');
    }
  });

  it('clears stale three-dimensional previews before keyboard tool changes', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const handlerStart = source.indexOf('function onArchKey');
      const handlerEnd = source.indexOf("return el('div',", handlerStart);
      const handler = source.slice(handlerStart, handlerEnd);

      expect(handlerStart).toBeGreaterThanOrEqual(0);
      expect(handlerEnd).toBeGreaterThan(handlerStart);
      for (const [key, mode] of [['p', 'place'], ['e', 'erase'], ['a', 'paint'], ['i', 'pick']]) {
        expect(handler).toContain(`(k === '${key}' || k === '${key.toUpperCase()}') && authoringShortcutSurface) { e.preventDefault(); ArchGL.clearPreview(); upd('mode', '${mode}')`);
      }
      const rotateStart = handler.indexOf("(k === 'r' || k === 'R')");
      const rotateEnd = handler.indexOf("k === 'PageUp'", rotateStart);
      expect(handler.slice(rotateStart, rotateEnd)).toContain('ArchGL.clearPreview();');
      const numberStart = handler.indexOf("k >= '1' && k <= '9'");
      expect(handler.slice(numberStart)).toContain('ArchGL.clearPreview();');
    }
  });

  it('scopes P, R, and S shortcuts to the studio, canvas, and gridcell authoring surfaces', async () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_archstudio.js', 'archStudio');
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const toasts = [];
    let latest;
    let setToolDataExternal;
    const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    const earnedBadges = {
      first_block: 1, hundred_club: 1, all_shapes: 1, all_mats: 1,
      sky_high: 1, rock_solid: 1, perfect_sym: 1, quake_proof: 1,
      five_saves: 1, challenger: 1, mega_build: 1, minimalist: 1,
    };

    function Harness() {
      const state = React.useState({ archStudio: {
        blocks: [{ x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 }],
        editorView: '3d', mode: 'erase', activeRotation: 0, undoStack: [], redoStack: [], earnedBadges,
      } });
      const toolData = state[0];
      const setToolData = state[1];
      latest = toolData.archStudio;
      setToolDataExternal = setToolData;
      return cfg.render({
        React, toolData, setToolData,
        update(bucket, key, value) {
          setToolData((prev) => Object.assign({}, prev, { [bucket]: Object.assign({}, prev[bucket] || {}, { [key]: value }) }));
        },
        updateMulti(bucket, patch) {
          setToolData((prev) => Object.assign({}, prev, { [bucket]: Object.assign({}, prev[bucket] || {}, patch) }));
        },
        setStemLabTool() {}, addToast(...args) { toasts.push(args); }, awardXP() {}, celebrate() {}, beep() {},
        announceToSR() {}, getXP() { return 0; }, callGemini: null, gradeLevel: '5th Grade', toolSnapshots: [], props: {},
        t(key, fallback) { return fallback || key; },
        icons: new Proxy({}, { get() { return function Icon() { return React.createElement('span'); }; } }),
        a11yClick(fn) { return { onClick: fn, role: 'button', tabIndex: 0 }; }, srOnly: {},
      });
    }

    const press = async (target, key) => {
      await React.act(async () => {
        target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      });
    };
    const resetAuthoring = async (editorView) => {
      await React.act(async () => {
        setToolDataExternal((prev) => ({ archStudio: Object.assign({}, prev.archStudio, {
          editorView, mode: 'erase', activeRotation: 0,
        }) }));
      });
      toasts.length = 0;
    };
    const expectAuthoringShortcuts = async (target) => {
      await press(target, 'r');
      expect(latest.activeRotation).toBe(90);
      await press(target, 'p');
      expect(latest.mode).toBe('place');
      await press(target, 's');
      expect(toasts).toHaveLength(1);
    };

    try {
      await React.act(async () => { root.render(React.createElement(Harness)); });

      const ordinaryButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Analysis'));
      expect(ordinaryButton).toBeTruthy();
      await press(ordinaryButton, 'r');
      await press(ordinaryButton, 'p');
      await press(ordinaryButton, 's');
      expect(latest.activeRotation).toBe(0);
      expect(latest.mode).toBe('erase');
      expect(toasts).toHaveLength(0);

      const studio = host.querySelector('#arch-studio-region');
      expect(studio).toBeTruthy();
      await expectAuthoringShortcuts(studio);

      await resetAuthoring('3d');
      const canvas = host.querySelector('#arch-studio-canvas');
      expect(canvas).toBeTruthy();
      await expectAuthoringShortcuts(canvas);

      await resetAuthoring('grid');
      const gridcell = host.querySelector('[role="gridcell"]');
      expect(gridcell).toBeTruthy();
      await expectAuthoringShortcuts(gridcell);
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });

  it('keeps the source and public bundles byte-identical', () => {
    const hashes = files.map((file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
    expect(hashes[0]).toBe(hashes[1]);
  });
});
