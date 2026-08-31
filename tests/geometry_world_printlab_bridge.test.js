import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, ReactDOMServer, resetStemLab, loadTool, makeCtx, renderTool } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const BUILDER_PATHS = [
  'stem_lab/stem_tool_geometryworld_builder.js',
  'desktop/web-app/public/stem_lab/stem_tool_geometryworld_builder.js',
];
const PRINT_PATHS = [
  'stem_lab/stem_tool_printlab.js',
  'desktop/web-app/public/stem_lab/stem_tool_printlab.js',
];
const APP_MANIFEST_PATHS = ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const BUILDER_SOURCE = readFileSync(BUILDER_PATHS[0], 'utf8');

function binaryStl(triangleCount, byteLength) {
  const length = byteLength == null ? 84 + triangleCount * 50 : byteLength;
  const bytes = new Uint8Array(length);
  if (length >= 84) {
    const view = new DataView(bytes.buffer);
    view.setUint32(80, triangleCount, true);
    const values = [0, 0, 1, 0, 0, 0, 1, 0, 2, 0, 3, 1];
    const completeRecords = Math.min(triangleCount, Math.floor((length - 84) / 50));
    for (let triangle = 0; triangle < completeRecords; triangle += 1) {
      values.forEach((value, index) => view.setFloat32(84 + triangle * 50 + index * 4, value, true));
    }
  }
  return bytes;
}

function geometrySource(blocks, extra = {}) {
  return Object.assign({
    schema: 'alloflow-geometry-world-build/1',
    title: 'Student build',
    coordinateSystem: 'x-right,y-up,z-depth',
    blocks,
  }, extra);
}

function pendingHandoff(overrides = {}) {
  return Object.assign({
    schema: 'alloflow-print-source/1',
    id: 'gw-test',
    sourceTool: 'geometryWorld',
    format: 'STL',
    bytes: binaryStl(1),
    sourceName: 'student-build.stl',
    title: 'Geometry World build',
    unitMm: 5,
    sourceModel: geometrySource([{ x: 0, y: 0, z: 0, type: 'wood', shape: 'cube', rotation: 0 }]),
  }, overrides);
}

function loadBuilderWithCore() {
  const lab = resetStemLab();
  lab.registerTool('geometryWorld', {
    aliases: [],
    render(ctx) {
      return ctx.React.createElement('main', { id: 'geoworld-fs-workspace', className: 'gw-core' },
        ctx.React.createElement('div', { id: 'geoworld-fs-wrap', role: 'application', tabIndex: 0 }, '3D world'));
    },
  });
  // eslint-disable-next-line no-new-func
  new Function(BUILDER_SOURCE)();
  return lab._registry.geometryWorld;
}

function loadPrintLab() {
  resetStemLab();
  window.StemLab.geometryWorldBuilderPure = {};
  return loadTool(PRINT_PATHS[0], 'printLab');
}

afterEach(() => {
  delete window.__alloPrintLabPendingHandoff;
  delete window.__alloGeometryWorldPendingBuild;
  delete window.__geoWorldEngine;
  vi.useRealTimers();
});

describe('Geometry World sandbox and Print Lab bridge', () => {
  BUILDER_PATHS.forEach((path) => {
    const source = readFileSync(path, 'utf8');

    it(`offers a distinct free-build sandbox — ${path}`, () => {
      expect(source).toContain("title: 'Free Build Sandbox'");
      expect(source).toContain("activeLesson: 'builderSandbox'");
      expect(source).toContain('data-geometry-mode');
      expect(source).toContain('Free Build Studio');
      expect(source).toContain('Open a blank Free Build Sandbox');
      expect(source).toContain('defaultPrintEnvelope');
      expect(source).toContain('Default Print Lab block envelope');
    });

    it(`selects only a connected student build for Print Lab — ${path}`, () => {
      expect(source).toContain('function openSelectedBuildInPrintLab(ctx)');
      expect(source).toContain("measurementLayerFor(data) !== 'student'");
      expect(source).toContain('eng.measureStructure(selected.gp.x, selected.gp.y, selected.gp.z)');
      expect(source).toContain('buildGeometryWorldStl(eng, measurement.blocks');
    });

    it(`preserves a lossless editable source while handing off local STL bytes — ${path}`, () => {
      expect(source).toContain("schema: 'alloflow-geometry-world-build/1'");
      expect(source).toContain("schema: 'alloflow-print-source/1'");
      expect(source).toContain('bytes: new Uint8Array(bundle.buffer)');
      expect(source).toContain("ctx.setStemLabTool('printLab')");
      expect(source).toContain('shape: mesh.userData.shape ||');
      expect(source).toContain('rotation: mesh.userData.rotation || 0');
    });

    it(`supports a privacy-minimized editable round trip — ${path}`, () => {
      expect(source).toContain('__alloGeometryWorldPendingBuild');
      expect(source).toContain('function restorePendingEditableBuild(ctx, engine)');
      expect(source).toContain("engine.logEvent('print_lab_return'");
      expect(source).toContain("EDITABLE_WORLD_SCHEMA = 'alloflow-geometry-world/2'");
      expect(source).toContain('function parseEditableWorldText(text, declaredBytes)');
      expect(source).toContain('function restoreEditableWorld(engine, candidate)');
      expect(source).toContain('Replace current sandbox');
      expect(source).toContain('MAX_EDITABLE_WORLD_BYTES');
    });
  });

  PRINT_PATHS.forEach((path) => {
    const source = readFileSync(path, 'utf8');

    it(`consumes the local Geometry World handoff without persisting model bytes — ${path}`, () => {
      expect(source).toContain('readPendingLocalHandoff');
      expect(source).toContain('__alloPrintLabPendingHandoff');
      expect(source).toContain("pending.sourceTool !== 'geometryWorld'");
      expect(source).toContain('delete window.__alloPrintLabPendingHandoff');
      expect(source).not.toContain('persist({ bytes:');
      expect(source).toContain("selfAsset('stem_tool_geometryworld_builder.js')");
      expect(source).toContain('From Geometry World');
      expect(source).toContain('function returnToGeometryWorld()');
      expect(source).toContain('Geometry World scale presets');
      expect(source).toContain('geometryWorldPrinterFit');
      expect(source).toContain('geometryWorldScaleRecommendation');
      expect(source).toContain('geometryWorldOrientationAdvice');
      expect(source).toContain('Suggested safe-fit scale');
      expect(source).toContain('data-geometry-printer-fit');
      expect(source).toContain('data-geometry-scale-math');
      expect(source).toContain('data-geometry-orientation-advice');
      expect(source).toContain('data-geometry-preflight-fit');
      expect(source).toContain('data-geometry-preflight-orientation');
      expect(source).toContain('DEFAULT_PRINTER_PROFILE');
      expect(source).toContain('Planning clearance (mm)');
    });
  });

  it('keeps canonical and desktop browser assets identical', () => {
    expect(readFileSync(BUILDER_PATHS[0], 'utf8')).toBe(readFileSync(BUILDER_PATHS[1], 'utf8'));
    expect(readFileSync(PRINT_PATHS[0], 'utf8')).toBe(readFileSync(PRINT_PATHS[1], 'utf8'));
  });

  APP_MANIFEST_PATHS.forEach((path) => {
    it(`loads the builder immediately after Geometry World — ${path}`, () => {
      const source = readFileSync(path, 'utf8');
      const geometry = source.indexOf("'stem_lab/stem_tool_geometryworld.js'");
      const builder = source.indexOf("'stem_lab/stem_tool_geometryworld_builder.js'");
      const nextTool = source.indexOf("'stem_lab/stem_tool_freeforms.js'");
      expect(geometry).toBeGreaterThan(-1);
      expect(builder).toBeGreaterThan(geometry);
      expect(builder).toBeLessThan(nextTool);
    });
  });
});

describe('Geometry World bridge runtime behavior', () => {
  it('shows a default print envelope after a connected build is measured', () => {
    const cfg = loadBuilderWithCore();
    const ctx = makeCtx({
      toolData: {
        geometryWorld: {
          activeLesson: 'builderSandbox',
          worldActive: true,
          selectedBlock: 0,
          selectedShape: 0,
          measureResult: { isComplete: true, count: 12, L: 10, W: 8, H: 6 },
        },
      },
    });
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(function Host() {
      return cfg.render(ctx);
    }));

    expect(html).toContain('Default Print Lab block envelope');
    expect(html).toContain('50 × 40 × 30 mm');
    expect(html).toContain('Within the default 220 × 220 × 250 mm');
    expect(window.StemLab.geometryWorldBuilderPure.defaultPrintEnvelope({ L: 50, W: 2, H: 2 })).toEqual({
      widthMm: 250,
      depthMm: 10,
      heightMm: 10,
      label: '250 × 10 × 10 mm',
      fitsDefaultProfile: false,
    });
  });

  it('sanitizes editable source data and rejects a mismatched binary STL length', () => {
    loadPrintLab();
    const pure = window.StemLab.printLabPure;
    expect(pure.DEFAULT_PRINTER_PROFILE).toMatchObject({ bedWidthMm: 220, bedDepthMm: 220, bedHeightMm: 250, planningClearanceMm: 5 });
    const candidate = pendingHandoff({
      summary: { blockCount: 999, triangleCount: 999, shapedCount: 999 },
      sourceModel: geometrySource([
        { x: 0, y: 0, z: 0, type: 'unknown', shape: 'quarter', rotation: 5, privateNote: 'remove me' },
        { x: 0, y: 0, z: 0, type: 'gold', shape: 'cube', rotation: 0 },
        { x: 2, y: 1, z: 3, type: 'wood', shape: 'not-a-shape', rotation: -1 },
      ], { studentEmail: 'not-carried@example.org' }),
    });

    const accepted = pure.readPendingLocalHandoff(candidate);
    expect(accepted).not.toBeNull();
    expect(accepted.summary).toEqual({
      blockCount: 2,
      triangleCount: 1,
      shapedCount: 1,
      dimensions: { L: 3, W: 4, H: 2 },
      meshDimensions: { L: 1, W: 2, H: 3 },
    });
    expect(Object.keys(accepted.sourceModel)).toEqual(['schema', 'title', 'coordinateSystem', 'blocks']);
    expect(accepted.sourceModel).not.toHaveProperty('studentEmail');
    expect(accepted.sourceModel.blocks[0]).toEqual({ x: 0, y: 0, z: 0, type: 'stone', shape: 'quarter', rotation: 1 });
    expect(accepted.sourceModel.blocks[0]).not.toHaveProperty('privateNote');

    const forged = pendingHandoff({ bytes: binaryStl(2, 134) });
    expect(pure.readPendingLocalHandoff(forged)).toBeNull();

    const nonFiniteBytes = binaryStl(1);
    new DataView(nonFiniteBytes.buffer).setFloat32(96, Number.NaN, true);
    expect(pure.readPendingLocalHandoff(pendingHandoff({ bytes: nonFiniteBytes }))).toBeNull();
    expect(pure.scaledGeometryWorldDimensions(accepted.summary, 5)).toEqual({ width: 5, depth: 10, height: 15, label: '5 × 10 × 15 mm' });
  });

  it('validates editable-world files completely before replacing the sandbox', () => {
    loadBuilderWithCore();
    const pure = window.StemLab.geometryWorldBuilderPure;
    const validWorld = {
      schema: 'alloflow-geometry-world/2',
      title: 'Bridge model',
      blocks: [
        { x: -1, y: 1, z: 0, type: 'wood', shape: 'cube', rotation: 0 },
        { x: 0, y: 1, z: 0, type: 'gold', shape: 'quarter', rotation: 3 },
      ],
    };
    const checked = pure.parseEditableWorldText(JSON.stringify(validWorld));

    expect(checked).toMatchObject({
      ok: true,
      value: { schema: 'alloflow-geometry-world/2', title: 'Bridge model' },
      summary: { blockCount: 2, bounds: { width: 2, depth: 1, height: 1 } },
    });
    expect(pure.parseEditableWorldText('{bad json')).toMatchObject({ ok: false });
    expect(pure.parseEditableWorldText(JSON.stringify(validWorld), pure.MAX_EDITABLE_WORLD_BYTES + 1)).toMatchObject({ ok: false });
    expect(pure.normalizeEditableWorld(Object.assign({}, validWorld, { schema: 'unknown' }))).toMatchObject({ ok: false });
    expect(pure.normalizeEditableWorld(Object.assign({}, validWorld, { blocks: validWorld.blocks.concat(validWorld.blocks[0]) }))).toMatchObject({ ok: false, error: expect.stringContaining('two blocks') });
    expect(pure.normalizeEditableWorld(Object.assign({}, validWorld, { blocks: [{ x: 0, y: 0, z: 0, type: 'grass', shape: 'cube', rotation: 0 }] }))).toMatchObject({ ok: false });

    const engine = {
      blocks: { old: { userData: { blockType: 'wood', _measurementLayer: 'student' } } },
      loadLesson: vi.fn(function (lesson) {
        this.blocks = {};
        this._currentLesson = lesson;
        for (let x = -12; x <= 12; x += 1) for (let z = -12; z <= 12; z += 1) this.blocks[`${x},0,${z}`] = { userData: { blockType: 'grass', _lessonBlock: true, _measurementLayer: 'lesson' } };
      }),
      placeBlock(x, y, z, type, shape, rotation) {
        this.blocks[`${x},${y},${z}`] = { userData: { blockType: type, shape, rotation, gridPos: { x, y, z }, _measurementLayer: 'student' } };
      },
      _undoStack: [{ action: 'old' }],
      _redoStack: [{ action: 'old' }],
    };

    const rejected = pure.restoreEditableWorld(engine, Object.assign({}, validWorld, { schema: 'unknown' }));
    expect(rejected.ok).toBe(false);
    expect(engine.loadLesson).not.toHaveBeenCalled();
    expect(engine.blocks).toHaveProperty('old');

    const restored = pure.restoreEditableWorld(engine, checked.value);
    expect(restored).toMatchObject({ ok: true, placedCount: 2 });
    expect(engine.loadLesson).toHaveBeenCalledWith(expect.objectContaining({ sandbox: true }));
    expect(Object.keys(engine.blocks)).toHaveLength(627);
    expect(engine.blocksPlaced).toBe(2);
    expect(engine._undoStack).toEqual([]);
    expect(engine._redoStack).toEqual([]);
  });

  it('saves only student-authored blocks in the editable-world schema', () => {
    loadBuilderWithCore();
    const pure = window.StemLab.geometryWorldBuilderPure;
    const mesh = (x, y, z, type, layer) => ({ userData: { gridPos: { x, y, z }, blockType: type, shape: 'cube', rotation: 0, _measurementLayer: layer } });
    const world = pure.editableWorld({ blocks: {
      '0,0,0': mesh(0, 0, 0, 'grass', 'lesson'),
      '0,1,0': mesh(0, 1, 0, 'stone', 'lesson'),
      '1,1,0': mesh(1, 1, 0, 'wood', 'student'),
    } });

    expect(world).toEqual({
      schema: 'alloflow-geometry-world/2',
      title: 'Geometry World editable build',
      coordinateSystem: 'x-right,y-up,z-depth',
      blocks: [{ x: 1, y: 1, z: 0, type: 'wood', shape: 'cube', rotation: 0 }],
    });
  });

  it('renders a validated Geometry World handoff in Print Lab with editable provenance', () => {
    loadPrintLab();
    window.__alloPrintLabPendingHandoff = pendingHandoff({
      sourceModel: geometrySource([
        { x: 0, y: 0, z: 0, type: 'stone', shape: 'cube', rotation: 0 },
        { x: 1, y: 0, z: 0, type: 'gold', shape: 'halfA', rotation: 2 },
      ]),
    });
    const html = renderTool('printLab', { printLab: {} });
    expect(html).toContain('From Geometry World');
    expect(html).toContain('Default: 5 mm / block');
    expect(html).toContain('Revise in Geometry World');
    expect(html).toContain('Download editable block source');
    expect(html).toContain('Connected blocks');
    expect(html).toContain('Current physical size');
    expect(html).toContain('5 × 10 × 15 mm');
    expect(html).toContain('Reset to 5 mm / block');
  });

  it('updates printer fit and applies a conservative Geometry World scale recommendation', () => {
    const cfg = loadPrintLab();
    const bytes = binaryStl(1);
    new DataView(bytes.buffer).setFloat32(84 + 10 * 4, 6, true);
    window.__alloPrintLabPendingHandoff = pendingHandoff({ bytes });
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const profile = {
      name: 'Compact school printer',
      bedWidthMm: 100,
      bedDepthMm: 100,
      bedHeightMm: 50,
      nozzleMm: 0.4,
      maxTriangles: 250000,
      maxBytes: 5 * 1024 * 1024,
    };

    try {
      act(() => root.render(React.createElement(function Host() {
        return cfg.render(makeCtx({ toolData: { printLab: { profile } } }));
      })));

      expect(host.textContent).toContain('5 × 10 × 30 mm');
      expect(host.querySelector('[data-geometry-printer-fit="true"]')).toBeTruthy();
      const large = [...host.querySelectorAll('button')].find((button) => button.textContent.includes('Large'));
      expect(large).toBeTruthy();
      expect(large.getAttribute('aria-pressed')).toBe('false');

      act(() => large.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));

      expect(large.getAttribute('aria-pressed')).toBe('true');
      expect(host.textContent).toContain('10 × 20 × 60 mm');
      expect(host.querySelector('[data-geometry-printer-fit="false"]')).toBeTruthy();
      expect(host.textContent).toContain('The height dimension is too large for 100 × 100 × 50 mm');
      expect(host.textContent).toContain('Suggested safe-fit scale: 6.66 mm per block');
      expect(host.textContent).toContain('Height is the limiting dimension');
      expect(host.textContent).toContain('90 × 90 × 40 mm');
      const changePreview = host.querySelector('[aria-label="Scale change preview"]');
      expect(changePreview).toBeTruthy();
      expect(changePreview.textContent).toContain('Current envelope10 × 20 × 60 mm');
      expect(changePreview.textContent).toContain('Suggested envelope6.66 × 13.32 × 39.96 mm');
      expect(changePreview.textContent).toContain('Scale reduction33.4%');
      const mathDetails = host.querySelector('[data-geometry-scale-math="true"]');
      expect(mathDetails).toBeTruthy();
      expect(mathDetails.open).toBe(false);
      expect(mathDetails.textContent).toContain('40 mm usable ÷ 6 mesh units = 6.667 mm per unit');
      expect(mathDetails.textContent).toContain('assumes the model keeps its current orientation');
      expect(window.StemLab.printLabPure.geometryWorldScaleRecommendation(
        { meshDimensions: { L: 1, W: 2, H: 6 } },
        profile,
        10,
        5,
      )).toEqual({
        canFit: true,
        needsReduction: true,
        recommendedUnitMm: 6.66,
        currentUnitMm: 10,
        reductionPercent: 33.4,
        recommendedPhysicalSize: { width: 6.66, depth: 13.32, height: 39.96, label: '6.66 × 13.32 × 39.96 mm' },
        clearanceMm: 5,
        limitingDimensions: ['height'],
        limitingCalculations: [{ dimension: 'height', availableMm: 40, modelUnits: 6, rawUnitMm: 6.667 }],
        availableLabel: '90 × 90 × 40 mm',
      });
      const useSuggested = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Use 6.66 mm / block');
      expect(useSuggested).toBeTruthy();
      const continueToPreflight = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Continue to Preflight');
      expect(continueToPreflight).toBeTruthy();

      act(() => continueToPreflight.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));

      expect(host.querySelector('[data-geometry-preflight-fit="false"]')).toBeTruthy();
      expect(host.textContent).toContain('Geometry World scale needs attention');
      expect(host.textContent).toContain('Suggested scale: 6.66 mm per block');
      const clearanceLabel = [...host.querySelectorAll('label')].find((label) => label.textContent.includes('Planning clearance (mm)'));
      expect(clearanceLabel).toBeTruthy();
      const clearanceInput = clearanceLabel.querySelector('input');
      expect(clearanceInput.value).toBe('5');
      const setNativeValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

      act(() => {
        setNativeValue.call(clearanceInput, '10');
        clearanceInput.dispatchEvent(new window.Event('input', { bubbles: true }));
      });

      expect(host.textContent).toContain('Suggested scale: 5 mm per block');
      expect(host.textContent).toContain('producing approximately 5 × 10 × 30 mm');
      const applySuggested = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Apply 5 mm / block');
      expect(applySuggested).toBeTruthy();

      act(() => applySuggested.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));

      expect(host.querySelector('[data-geometry-preflight-fit="true"]')).toBeTruthy();
      expect(host.textContent).toContain('Geometry World scale fits this profile');
      expect(host.textContent).toContain('Model envelope: 5 × 10 × 30 mm');
      expect(host.textContent).toContain('preferred 10 mm planning clearance');
      const designTab = [...host.querySelectorAll('button')].find((button) => button.textContent.includes('1. Design'));
      expect(designTab).toBeTruthy();

      act(() => designTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));

      expect(host.textContent).toContain('5 × 10 × 30 mm');
      expect(host.querySelector('[data-geometry-printer-fit="true"]')).toBeTruthy();
      expect(host.querySelector('[data-geometry-scale-recommendation]')).toBeNull();
      expect(host.textContent).toContain('Within the current printer envelope with 10 mm planning clearance');
      const selectedPreset = host.querySelector('button[aria-pressed="true"]');
      expect(selectedPreset).toBeTruthy();
      expect(selectedPreset.textContent).toContain('Default');
      expect(window.StemLab.printLabPure.geometryWorldPrinterFit(
        { width: 300, depth: 10, height: 10 },
        { bedWidthMm: 220, bedDepthMm: 220, bedHeightMm: 250 },
      )).toEqual({ fits: false, over: ['width'], profileLabel: '220 × 220 × 250 mm' });
    } finally {
      act(() => root.unmount());
      host.remove();
    }
  });

  it('suggests a non-mutating 90-degree slicer turn when a rectangular bed fits better', () => {
    const cfg = loadPrintLab();
    const bytes = binaryStl(1);
    const view = new DataView(bytes.buffer);
    view.setFloat32(84 + 6 * 4, 2, true);
    view.setFloat32(84 + 8 * 4, 8, true);
    view.setFloat32(84 + 10 * 4, 1, true);
    const originalBytes = Array.from(bytes);
    const profile = {
      name: 'Rectangular school printer',
      bedWidthMm: 100,
      bedDepthMm: 50,
      bedHeightMm: 50,
      planningClearanceMm: 5,
      nozzleMm: 0.4,
      maxTriangles: 250000,
      maxBytes: 5 * 1024 * 1024,
    };
    window.__alloPrintLabPendingHandoff = pendingHandoff({ bytes, unitMm: 10 });
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);

    try {
      act(() => root.render(React.createElement(function Host() {
        return cfg.render(makeCtx({ toolData: { printLab: { profile } } }));
      })));

      expect(host.textContent).toContain('20 \u00D7 80 \u00D7 10 mm');
      expect(host.querySelector('[data-geometry-printer-fit="false"]')).toBeTruthy();
      expect(host.querySelector('[data-geometry-scale-recommendation="5"]')).toBeTruthy();
      const designAdvice = host.querySelector('[data-geometry-orientation-advice="preserve-scale"]');
      expect(designAdvice).toBeTruthy();
      expect(designAdvice.textContent).toContain('At the current 10 mm per block');
      expect(designAdvice.textContent).toContain('80 \u00D7 20 \u00D7 10 mm');
      expect(designAdvice.textContent).toContain('not rotated or rewritten the STL');
      expect(window.StemLab.printLabPure.geometryWorldOrientationAdvice(
        { meshDimensions: { L: 2, W: 8, H: 1 } },
        profile,
        10,
        5,
      )).toEqual({
        beneficial: true,
        currentMaximumUnitMm: 5,
        rotatedMaximumUnitMm: 11.25,
        currentScaleFitsRotated: true,
        suggestedUnitMm: 10,
        rotatedPhysicalSize: { width: 80, depth: 20, height: 10, label: '80 \u00D7 20 \u00D7 10 mm' },
        improvementPercent: 125,
        clearanceMm: 5,
      });
      expect(window.StemLab.printLabPure.geometryWorldOrientationAdvice(
        { meshDimensions: { L: 2, W: 8, H: 1 } },
        Object.assign({}, profile, { bedWidthMm: 100, bedDepthMm: 100 }),
        10,
        5,
      )).toBeNull();

      const continueToPreflight = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Continue to Preflight');
      expect(continueToPreflight).toBeTruthy();
      act(() => continueToPreflight.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));

      expect(host.querySelector('[data-geometry-preflight-fit="false"]')).toBeTruthy();
      const preflightAdvice = host.querySelector('[data-geometry-preflight-orientation="preserve-scale"]');
      expect(preflightAdvice).toBeTruthy();
      expect(preflightAdvice.textContent).toContain('may preserve the current 10 mm per block scale');
      expect(preflightAdvice.textContent).toContain('80 \u00D7 20 \u00D7 10 mm');
      expect(preflightAdvice.textContent).toContain('Print Lab has not rotated the STL');
      expect(Array.from(bytes)).toEqual(originalBytes);
    } finally {
      act(() => root.unmount());
      host.remove();
    }
  });

  it('clears a malformed stale handoff after Print Lab mounts', () => {
    const cfg = loadPrintLab();
    const invalidBytes = binaryStl(1);
    new DataView(invalidBytes.buffer).setFloat32(96, Number.POSITIVE_INFINITY, true);
    window.__alloPrintLabPendingHandoff = pendingHandoff({ bytes: invalidBytes });
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    try {
      act(() => root.render(React.createElement(function Host() {
        return cfg.render(makeCtx({ toolData: { printLab: {} } }));
      })));
      expect(window.__alloPrintLabPendingHandoff).toBeUndefined();
      expect(host.textContent).not.toContain('From Geometry World');
    } finally {
      act(() => root.unmount());
      host.remove();
    }
  });

  it('deduplicates and capacity-limits a returning build after the sandbox floor loads', () => {
    loadBuilderWithCore();
    const pure = window.StemLab.geometryWorldBuilderPure;
    const placed = [];
    const engine = {
      blocks: {},
      blocksPlaced: 0,
      loadLesson: vi.fn(function (lesson) {
        this.blocks = {};
        this._currentLesson = lesson;
        for (let x = -12; x <= 12; x += 1) {
          for (let z = -12; z <= 12; z += 1) {
            this.blocks[`${x},0,${z}`] = { userData: { blockType: 'grass', _lessonBlock: true } };
          }
        }
      }),
      placeBlock(x, y, z, type, shape, rotation) {
        const key = `${x},${y},${z}`;
        if (this.blocks[key]) return;
        this.blocks[key] = { userData: { blockType: type, shape, rotation, gridPos: { x, y, z } } };
        placed.push({ x, y, z, type, shape, rotation });
        this.blocksPlaced += 1;
      },
      logEvent: vi.fn(),
    };
    const blocks = Array.from({ length: 900 }, (_, x) => ({ x, y: 0, z: 0, type: 'wood', shape: 'cube', rotation: 0 }));
    blocks.push({ x: 0, y: 0, z: 0, type: 'gold', shape: 'quarter', rotation: 3 });
    window.__alloGeometryWorldPendingBuild = { sourceModel: geometrySource(blocks) };
    const messages = [];
    const ctx = {
      updateMulti: vi.fn(),
      addToast(message) { messages.push(message); },
      announceToSR: vi.fn(),
    };

    expect(pure.restorePendingEditableBuild(ctx, engine)).toBe(true);
    expect(placed).toHaveLength(875);
    expect(Object.keys(engine.blocks)).toHaveLength(1500);
    expect(new Set(placed.map((block) => `${block.x},${block.y},${block.z}`)).size).toBe(875);
    expect(Math.min(...placed.map((block) => block.y))).toBe(1);
    expect(engine.logEvent).toHaveBeenCalledWith('print_lab_return', expect.objectContaining({ blocks: 875, requestedBlocks: 900, truncated: true }));
    expect(messages.join(' ')).toContain('prevented 25 additional blocks');
    expect(window.__alloGeometryWorldPendingBuild).toBeUndefined();
  });

  it('returns focus to the launcher trigger and moves focus into the world when sandbox mode starts', () => {
    vi.useFakeTimers();
    const cfg = loadBuilderWithCore();
    const engine = {
      blocks: {},
      blocksPlaced: 0,
      _currentLesson: null,
      loadLesson: vi.fn(function (lesson) { this._currentLesson = lesson; }),
      logEvent: vi.fn(),
    };
    window.__geoWorldEngine = engine;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);

    function Host() {
      const [toolData, setToolData] = React.useState({
        geometryWorld: { activeLesson: 'volumeExplorer', worldActive: false, showSandboxLauncher: false },
      });
      const ctx = makeCtx({
        toolData,
        updateMulti(section, patch) {
          setToolData((previous) => Object.assign({}, previous, {
            [section]: Object.assign({}, previous[section] || {}, patch || {}),
          }));
        },
      });
      return cfg.render(ctx);
    }

    try {
      act(() => root.render(React.createElement(Host)));
      let trigger = host.querySelector('.gwe-free-build-launch');
      expect(trigger).toBeTruthy();
      trigger.focus();
      act(() => trigger.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
      expect(host.querySelector('[role="dialog"]')).toBeTruthy();

      const cancel = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Cancel');
      act(() => cancel.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
      act(() => vi.runOnlyPendingTimers());
      trigger = host.querySelector('.gwe-free-build-launch');
      expect(document.activeElement).toBe(trigger);

      act(() => trigger.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
      const open = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Open blank sandbox');
      act(() => open.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
      act(() => vi.runOnlyPendingTimers());
      expect(engine.loadLesson).toHaveBeenCalledWith(expect.objectContaining({ title: 'Free Build Sandbox', sandbox: true }));
      expect(document.activeElement && document.activeElement.id).toBe('geoworld-fs-wrap');
      expect(host.querySelector('[data-geometry-mode="sandbox"]')).toBeTruthy();
      expect(host.textContent).toContain('Free Build Studio');
    } finally {
      act(() => root.unmount());
      host.remove();
    }
  });
});
