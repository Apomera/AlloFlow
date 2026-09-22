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
    const values = [0, -1, 0, 0, 0, 0, 1, -2, 0, 0, -1, 3];
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
      expect(source).toContain('Print Lab block envelope');
      expect(source).toContain('FALLBACK_BED_MM');
      expect(source).toContain('HANDOFF_UNIT_MM');
    });

    it(`selects student work and preserves its measurement for Print Lab — ${path}`, () => {
      expect(source).toContain('function openSelectedBuildInPrintLab(ctx)');
      expect(source).toContain("measurementLayerFor(data) !== 'student'");
      expect(source).toContain('var measurement = selected.measurement;');
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
      expect(source).toContain('function restoreEditableWorld(engine, candidate, ctx)');
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

// The dock only sizes a print for the student's own blocks; the engine says
// which layer a measured cell belongs to.
function studentEngineAt(key, blockType = 'stone') {
  return { blocks: { [key]: { userData: { blockType, gridPos: { x: 0, y: 1, z: 0 } } } } };
}

describe('Geometry World bridge runtime behavior', () => {
  it('says what the printer will make solid, in cubic units and millimetres', () => {
    // The envelope is a bounding box. A build of slabs and wedges prints much
    // less than its box, and the tool exists to teach exactly that difference.
    const cfg = loadBuilderWithCore();
    window.__geoWorldEngine = studentEngineAt('0,1,0');
    const ctx = makeCtx({
      toolData: {
        geometryWorld: {
          activeLesson: 'builderSandbox',
          worldActive: true,
          selectedBlock: 0,
          selectedShape: 0,
          measureResult: {
            isComplete: true, count: 12, L: 3, W: 2, H: 2, blocks: [{ x: 0, y: 1, z: 0 }],
            totalVolume: 9.75, formattedVolume: '9\u00BE',
            shapeCounts: { cube: 8, halfB: 2, halfA: 1, quarter: 1 },
          },
        },
      },
    });
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(function Host() {
      return cfg.render(ctx);
    }));
    expect(html).toContain('data-gwe-print-volume="true"');
    expect(html).toContain('Prints solid at 9\u00BE cubic units = 1,218.75 mm\u00B3 at 5 mm per block (8 cubes, 1 diagonal half, 2 half slabs, 1 quarter wedge).');

    const pure = window.StemLab.geometryWorldBuilderPure;
    expect(pure.printVolumeSentence({ totalVolume: 1, formattedVolume: '1', shapeCounts: { cube: 1 } }))
      .toBe('Prints solid at 1 cubic unit = 125 mm\u00B3 at 5 mm per block (1 cube).');
    expect(pure.printVolumeSentence({ totalVolume: 1, shapeCounts: { halfA: 2 } }))
      .toBe('Prints solid at 1 cubic unit = 125 mm\u00B3 at 5 mm per block (2 diagonal halves).');
    // A measurement that never carried a volume gets no sentence rather than NaN.
    expect(pure.printVolumeSentence({ count: 3 })).toBeNull();
  });

  it('does not quote a print size for the ground or a lesson structure', () => {
    // M measures whatever the crosshair rests on. The sandbox floor is a
    // 25 x 25 x 1 structure that used to be quoted as a 125 x 125 x 5 mm print
    // that fits, when Send would have refused it as not the student's work.
    const cfg = loadBuilderWithCore();
    window.__geoWorldEngine = studentEngineAt('0,0,0', 'grass');
    const ctx = makeCtx({
      toolData: {
        geometryWorld: {
          activeLesson: 'builderSandbox',
          worldActive: true,
          selectedBlock: 0,
          selectedShape: 0,
          measureResult: { isComplete: true, count: 625, L: 25, W: 25, H: 1, blocks: [{ x: 0, y: 0, z: 0 }] },
        },
      },
    });
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(function Host() {
      return cfg.render(ctx);
    }));
    expect(html).not.toContain('Print Lab block envelope');
    expect(html).not.toContain('125 × 125 × 5 mm');
    expect(html).toContain('That measurement was the ground or a lesson structure.');
    // The count and bounds still show; they are true, just not printable.
    expect(html).toContain('25×25×1');
    expect(window.StemLab.geometryWorldBuilderPure.measurementIsStudentBuild(
      studentEngineAt('0,0,0', 'grass'), { blocks: [{ x: 0, y: 0, z: 0 }] })).toBe(false);
    expect(window.StemLab.geometryWorldBuilderPure.measurementIsStudentBuild(
      studentEngineAt('0,1,0'), { blocks: [{ x: 0, y: 1, z: 0 }] })).toBe(true);
    expect(window.StemLab.geometryWorldBuilderPure.measurementIsStudentBuild(
      { blocks: { '0,1,0': { userData: { blockType: 'stone', _lessonBlock: true } } } }, { blocks: [{ x: 0, y: 1, z: 0 }] })).toBe(false);
  });

  it('shows a default print envelope after a connected build is measured', () => {
    const cfg = loadBuilderWithCore();
    window.__geoWorldEngine = studentEngineAt('0,1,0');
    const ctx = makeCtx({
      toolData: {
        geometryWorld: {
          activeLesson: 'builderSandbox',
          worldActive: true,
          selectedBlock: 0,
          selectedShape: 0,
          measureResult: { isComplete: true, count: 12, L: 10, W: 8, H: 6, blocks: [{ x: 0, y: 1, z: 0 }] },
        },
      },
    });
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(function Host() {
      return cfg.render(ctx);
    }));

    expect(html).toContain('Print Lab block envelope');
    expect(html).toContain('50 × 40 × 30 mm');
    expect(html).toContain('Fits the 220 × 220 × 250 mm printer profile at 5 mm per block');
    expect(html).toContain('default printer profile');
    expect(window.StemLab.geometryWorldBuilderPure.defaultPrintEnvelope({ L: 50, W: 2, H: 2 })).toEqual({
      widthMm: 250,
      depthMm: 10,
      heightMm: 10,
      label: '250 × 10 × 10 mm',
      profileLabel: '220 × 220 × 250 mm',
      usingSavedProfile: false,
      over: ['width'],
      fits: false,
    });
  });

  it('measures against the printer profile the school saved in Print Lab', () => {
    const cfg = loadBuilderWithCore();
    window.__geoWorldEngine = studentEngineAt('0,1,0');
    const ctx = makeCtx({
      toolData: {
        geometryWorld: {
          activeLesson: 'builderSandbox',
          worldActive: true,
          selectedBlock: 0,
          selectedShape: 0,
          // 150 x 150 x 30 mm at 5 mm per block: inside the default bed,
          // outside the small printer this school actually owns on two axes.
          measureResult: { isComplete: true, count: 12, L: 30, W: 30, H: 6, blocks: [{ x: 0, y: 1, z: 0 }] },
        },
        printLab: { profile: { name: 'Lab mini', bedWidthMm: 120, bedDepthMm: 120, bedHeightMm: 120 } },
      },
    });
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(function Host() {
      return cfg.render(ctx);
    }));

    expect(html).toContain('150 × 150 × 30 mm');
    expect(html).toContain('The width and depth dimensions are larger than the 120 × 120 × 120 mm printer profile');
    expect(html).toContain('data-fit="false"');
    expect(html).toContain('printer profile saved in Print Lab');
    expect(html).not.toContain('220 × 220 × 250 mm');
  });

  it('returns the same fit verdict as Print Lab for every size and profile', () => {
    loadBuilderWithCore();
    const builder = window.StemLab.geometryWorldBuilderPure;
    const envelope = builder.defaultPrintEnvelope;
    const fallback = builder.FALLBACK_BED_MM;
    const unitMm = builder.HANDOFF_UNIT_MM;
    loadPrintLab();
    const print = window.StemLab.printLabPure;

    // The dock's fallback is Print Lab's own default bed, not a second opinion.
    expect(fallback).toEqual({
      width: print.DEFAULT_PRINTER_PROFILE.bedWidthMm,
      depth: print.DEFAULT_PRINTER_PROFILE.bedDepthMm,
      height: print.DEFAULT_PRINTER_PROFILE.bedHeightMm,
    });
    expect(unitMm).toBe(5);

    const profiles = [
      undefined,
      { bedWidthMm: 220, bedDepthMm: 220, bedHeightMm: 250 },
      { bedWidthMm: 120, bedDepthMm: 120, bedHeightMm: 120 },
      { bedWidthMm: 350, bedDepthMm: 350, bedHeightMm: 400 },
      // Out-of-range values fall back on both sides rather than being trusted.
      { bedWidthMm: 5, bedDepthMm: 'wide', bedHeightMm: null },
    ];
    const builds = [
      { L: 1, W: 1, H: 1 },
      { L: 24, W: 24, H: 24 },
      { L: 24, W: 24, H: 25 },
      { L: 25, W: 24, H: 24 },
      { L: 30, W: 8, H: 6 },
      { L: 44, W: 44, H: 50 },
      { L: 45, W: 10, H: 10 },
      { L: 70, W: 70, H: 80 },
    ];

    let disagreements = 0;
    let overCases = 0;
    profiles.forEach((profile) => {
      const normalized = print.normalizePrinterProfile(profile || {});
      builds.forEach((build) => {
        const mine = envelope(build, profile);
        const theirs = print.geometryWorldPrinterFit(
          { width: mine.widthMm, depth: mine.depthMm, height: mine.heightMm },
          normalized,
        );
        if (mine.fits !== theirs.fits) disagreements += 1;
        if (!mine.fits) overCases += 1;
        expect(mine.over).toEqual(theirs.over);
        expect(mine.profileLabel).toBe(theirs.profileLabel);
      });
    });
    expect(disagreements).toBe(0);
    // The table has to contain real failures, or agreement proves nothing.
    expect(overCases).toBeGreaterThan(5);
  });

  it('subtracts shared polygon area for both full and partial face contacts', () => {
    // Each block is a closed shell, so touching neighbours keep a coincident pair
    // of faces between them. Print Lab's preflight counts every shared edge of
    // such a pair as non-manifold: measured, a slab on a cube drew 4 and a mixed
    // 12-block build 17, and the enclosed volume stopped being reported. The rule
    // is decided from the triangles, not a shape table.
    loadBuilderWithCore();
    const pure = window.StemLab.geometryWorldBuilderPure;
    const tri = (n, a, b, c) => ({ n, v: [a, b, c] });
    // A unit square on the plane x = 1 facing +x, split one way ...
    const squarePlusX = [tri([1, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1]), tri([1, 0, 0], [1, 0, 0], [1, 1, 1], [1, 0, 1])];
    // ... and the same square facing -x, split the OTHER way, as the neighbour's face.
    const squareMinusX = [tri([-1, 0, 0], [1, 0, 1], [1, 1, 0], [1, 0, 0]), tri([-1, 0, 0], [1, 0, 1], [1, 1, 1], [1, 1, 0])];
    // A half-height rectangle facing -x on the same plane: a slab's side.
    const halfMinusX = [tri([-1, 0, 0], [1, 0, 1], [1, 0.5, 0], [1, 0, 0]), tri([-1, 0, 0], [1, 0, 1], [1, 0.5, 1], [1, 0.5, 0])];
    const other = tri([0, 1, 0], [0, 1, 0], [0, 1, 1], [1, 1, 1]);   // an unrelated top face

    const a = { position: { x: 0, y: 0, z: 0 }, triangles: squarePlusX.concat([other]) };
    const b = { position: { x: 1, y: 0, z: 0 }, triangles: squareMinusX.concat([other]) };
    const selected = { '0,0,0': true, '1,0,0': true };
    // Identical polygon, different triangulation: both faces go, the tops stay.
    expect(pure.unionSurface([a, b], selected)).toHaveLength(2);

    const c = { position: { x: 1, y: 0, z: 0 }, triangles: halfMinusX.concat([other]) };
    const a2 = { position: { x: 0, y: 0, z: 0 }, triangles: squarePlusX.concat([other]) };
    // Partial contact removes the overlapping half, leaving only the exposed half
    // of the cube face. Reused inputs must remain immutable.
    const exposed = pure.unionSurface([a2,c],selected).filter(t=>t.n[0]===1);
    const area=exposed.reduce((sum,t)=>{const [a,b,c]=t.v,u=b.map((v,k)=>v-a[k]),v=c.map((n,k)=>n-a[k]);return sum+Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;},0);
    expect(area).toBeCloseTo(0.5,6);
    expect(Object.keys(squarePlusX[0])).toEqual(['n', 'v']);

    // A neighbour that is not part of the selection never culls anything.
    expect(pure.unionSurface([{ position: { x: 0, y: 0, z: 0 }, triangles: squarePlusX.slice() }], { '0,0,0': true })).toHaveLength(2);

    // The signature ignores triangulation and vertex order but not area.
    expect(pure.faceSignature(squarePlusX)).toBe(pure.faceSignature(squareMinusX));
    expect(pure.faceSignature(squarePlusX)).not.toBe(pure.faceSignature(halfMinusX));
    // Only axis-aligned triangles on integer cell boundaries are candidates.
    expect(pure.axisPlane(tri([0, 0.7071, 0.7071], [0, 0, 0], [1, 0, 0], [1, 1, 1]))).toBeNull();
    expect(pure.axisPlane(tri([0, 1, 0], [0, 0.5, 0], [1, 0.5, 0], [1, 0.5, 1]))).toBeNull();
    expect(pure.axisPlane(tri([0, -1, 0], [0, 2, 0], [1, 2, 1], [1, 2, 0]))).toEqual({ axis: 1, sign: -1, coordinate: 2 });
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
      blocks: { '-3,1,7': { userData: { blockType: 'wood', shape: 'cube', rotation: 0, gridPos: { x: -3, y: 1, z: 7 }, _measurementLayer: 'student' } } },
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
    expect(engine.blocks).toHaveProperty('-3,1,7');

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
    new DataView(bytes.buffer).setFloat32(84 + 11 * 4, 6, true);
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
    view.setFloat32(84 + 7 * 4, -8, true);
    view.setFloat32(84 + 11 * 4, 1, true);
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

  it.each([false, true])('deduplicates and capacity-limits a returning build (independent terrain: %s)', (independentTerrain) => {
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
    if (independentTerrain) engine.getConstructionBlockCount = function () { return Object.values(this.blocks).filter(m => !m.userData._lessonBlock).length; };
    const capacity = independentTerrain ? 1500 : 875;
    const blocks = Array.from({ length: 1600 }, (_, i) => ({ x: i % 40, y: 0, z: Math.floor(i / 40), type: 'wood', shape: 'cube', rotation: 0 }));
    blocks.push({ x: 0, y: 0, z: 0, type: 'gold', shape: 'quarter', rotation: 3 });
    window.__alloGeometryWorldPendingBuild = { sourceModel: geometrySource(blocks) };
    const messages = [];
    const ctx = {
      updateMulti: vi.fn(),
      addToast(message) { messages.push(message); },
      announceToSR: vi.fn(),
    };

    expect(pure.restorePendingEditableBuild(ctx, engine)).toBe(true);
    expect(placed).toHaveLength(capacity);
    expect(Object.keys(engine.blocks)).toHaveLength(625 + capacity);
    expect(new Set(placed.map((block) => `${block.x},${block.y},${block.z}`)).size).toBe(capacity);
    expect(Math.min(...placed.map((block) => block.y))).toBe(1);
    expect(engine.logEvent).toHaveBeenCalledWith('print_lab_return', expect.objectContaining({ blocks: capacity, requestedBlocks: 1600, truncated: true }));
    expect(messages.join(' ')).toContain('prevented ' + (1600 - capacity) + ' additional blocks');
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

// The STEM host folds a tool's toolData `activeTab` (also subtool / tab / mode / activeSubtool) into the plugin's
// React key so sub-view switches remount a fresh fiber. Print Lab persisted its tab under exactly that name, so the
// handoff intake's own persist({ activeTab: 'Design' }) changed the key, remounted Print Lab, and the second
// instance found the pending handoff already consumed: a Geometry World build arrived as an empty Design tab with
// "Add or import geometry to preview it" (measured on the live shell, 2026-09-14). Every later tab click would
// have dropped the in-memory STL the same way. The tab now persists as printStage, which the key ignores.
describe('Print Lab keeps its plugin key stable across the handoff and its tabs', () => {
  it('persists the tab under a name the host key does not read, and still restores a legacy activeTab', () => {
    for (const path of PRINT_PATHS) {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain("persist({ printStage: 'Design',");
      expect(source).toContain('persist({ printStage: name });');
      expect(source).not.toMatch(/persist\(\{ activeTab/);
      expect(source).toContain('TABS.indexOf(stored.printStage) >= 0 ? stored.printStage : (TABS.indexOf(stored.activeTab) >= 0 ? stored.activeTab');
    }
    // The reason must stay true: the host still keys plugins on these fields.
    const host = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    expect(host).toContain('_modeTd.subtool || _modeTd.tab || _modeTd.mode || _modeTd.activeTab || _modeTd.activeSubtool');
    expect(host).not.toContain('_modeTd.printStage');
  });
});

// Three tools hand a model to Print Lab, and only the receiver could lose it. Each sender writes
// window.__alloPrintLabPendingHandoff and calls setStemLabTool in the SAME synchronous handler, so a sender
// remount cannot drop it. On the receiving side the distinction that matters is what Print Lab persists:
// a RECIPE handoff (Art Studio) is written into toolData, while STL `bytes` live only in component memory —
// so the two STL senders (Geometry World, Architecture Studio) were the data-losing cases, and both are
// covered by the printStage fix above. Pinned so a future edit cannot quietly re-add a key-bearing write.
describe('every Print Lab handoff survives the trip', () => {
  const SENDERS = [
    ['stem_lab/stem_tool_geometryworld_builder.js', 'geometryWorld', 'STL'],
    ['stem_lab/stem_tool_archstudio.js', 'archStudio', 'STL'],
    ['stem_lab/stem_tool_artstudio.js', 'artStudio', 'RECIPE'],
  ];

  it.each(SENDERS)('%s sets the handoff and navigates in one synchronous handler', (file, sourceTool, format) => {
    const source = readFileSync(file, 'utf8');
    // Anchor on the pending-handoff assignment itself: a tool may name its sourceTool elsewhere for unrelated
    // payloads (Art Studio tags captured artwork the same way).
    const assign = source.indexOf('window.__alloPrintLabPendingHandoff =');
    expect(assign, file + ' writes the pending slot').toBeGreaterThan(-1);
    // The payload may be written inline OR built into a variable immediately above the
    // assignment (Geometry World's builder hoists it into `handoffMarker`). Both are the
    // same synchronous handler, so search the handler's window, not just the text after
    // the assignment — a position-only pin failed on a harmless hoist while the payload,
    // and Print Lab's `sourceTool === 'geometryWorld'` check, were both intact.
    // Art Studio and Architecture Studio write the object literal inline AFTER the
    // assignment; Geometry World's builder hoists it into `handoffMarker` ~800 chars
    // ABOVE. Cover both directions: it is one synchronous handler either way.
    const handler = source.slice(Math.max(0, assign - 1600), assign + 2000);
    expect(handler, file + ' names its source tool in the handoff')
      .toContain("sourceTool: '" + sourceTool + "'");
    expect(handler, file + ' declares the handoff schema')
      .toContain("schema: 'alloflow-print-source/1'");
    expect(handler, file + ' declares the handoff format').toContain("format: '" + format + "'");
    const navigate = source.indexOf("setStemLabTool('printLab')", assign);
    expect(navigate, file + ' navigates after setting the handoff').toBeGreaterThan(assign);
    // No await between the assignment and the navigation: nothing can unmount the sender in between.
    // (The format assertion lives with the rest of the payload checks above — searching
    // only between assign and navigate assumed an inline literal, which the hoisted
    // `handoffMarker` in Geometry World's builder no longer is.)
    expect(source.slice(assign, navigate)).not.toMatch(/\bawait\b|setTimeout\(/);
  });

  it('only RECIPE handoffs are persisted, which is why the STL senders needed the stable key', () => {
    const printLab = readFileSync(PRINT_PATHS[0], 'utf8');
    // the intake persists the recipe but never the bytes
    const persistCall = printLab.slice(printLab.indexOf("persist({ printStage: 'Design',"), printLab.indexOf("persist({ printStage: 'Design',") + 400);
    expect(persistCall).toContain('recipe: pendingHandoff.recipe || null');
    expect(persistCall).not.toContain('bytes');
    // and the bytes are held in component state only
    expect(printLab).toContain('React.useState(pendingHandoff ? pendingHandoff.bytes : null)');
  });
});

// Activating a STEM tool is NOT the same as loading it. `ctx.setStemLabTool` is the raw
// useState setter from AlloFlowANTI.txt (`const [stemLabTool, setStemLabTool] = useState(null)`)
// wrapped only by the host's _deferSafe; it changes the active tool id and nothing else.
// Print Lab is one of ~150 lazily fetched CDN plugins, so the app-owned launchers all call
// _alloRequestStemPlugin / __alloEnsureStemPluginLoaded FIRST (see _openStemTool, the
// freeForms bridge and the shell deep link in AlloFlowANTI.txt). The Print Lab senders did
// not, so the plugin download only began inside stem_lab_module.js's render-time safety net
// — AFTER navigation. That download is advertised as "1-2 seconds" while Geometry World's
// stranded-build timer fires at 1200ms, so the sender reclaimed the handoff and downloaded a
// fallback STL before Print Lab ever mounted to consume it: "Send to Print Lab" landed the
// student on a loading skeleton, then an empty Design tab plus a surprise file.
describe('every Print Lab sender requests the plugin before it navigates', () => {
  const NAVIGATING_SENDERS = [
    'stem_lab/stem_tool_geometryworld_builder.js',
    'stem_lab/stem_tool_archstudio.js',
    'stem_lab/stem_tool_artstudio.js',
  ];

  it.each(NAVIGATING_SENDERS)('%s starts the printLab plugin fetch before setStemLabTool', (file) => {
    const source = readFileSync(file, 'utf8');
    const navigate = source.indexOf("setStemLabTool('printLab')");
    expect(navigate, file + ' navigates to printLab').toBeGreaterThan(-1);
    // The request must be in the same synchronous handler, ahead of the navigation.
    const beforeNavigation = source.slice(Math.max(0, navigate - 2000), navigate);
    expect(beforeNavigation, file + ' requests the printLab plugin before navigating')
      .toMatch(/__alloEnsureStemPluginLoaded\(\s*'printLab'\s*\)/);
  });

  // The reason must stay true: the host's own launcher requests the plugin, and the
  // ctx setter handed to plugins does not. If the host ever starts requesting the plugin
  // inside setStemLabTool itself, this gate can be retired.
  it('the host launcher requests the plugin and the ctx setter still does not', () => {
    const host = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    const opener = host.slice(host.indexOf('function _openStemTool('), host.indexOf('function _openStemTool(') + 400);
    expect(opener).toContain('window.__alloEnsureStemPluginLoaded(id)');
    expect(opener).toContain('setStemLabTool(id)');
    // _safeSetStemLabTool only adds universe cleanup + the render-deferral wrapper.
    const wrapper = host.slice(host.indexOf('var _safeSetStemLabTool ='), host.indexOf('var _safeSetStemLabTab ='));
    expect(wrapper).not.toContain('__alloEnsureStemPluginLoaded');
  });
});

// The Showcase ("creations") view is a SECOND route to Print Lab, separate from the builder
// dock's "Send to Print Lab" button. Its "Use & export" panel offers both a Print Lab handoff
// and a standalone STL for a student who wants to use their own slicer. The underlying
// functions are covered in geometry_world_selected_files.test.js, but nothing pinned that the
// PANEL is wired to them -- and a broken wire is exactly the failure that shipped here once
// (the bridge worked; nothing had ever requested the Print Lab plugin). Both routes must stay
// reachable, and the standalone download must stay a real file for third-party software.
describe('the Showcase creations view keeps both Print Lab and a slicer-ready file', () => {
  const showcasePanel = () => {
    const open = BUILDER_SOURCE.indexOf("id:'gwe-showcase-files'");
    expect(open, 'the Showcase export panel exists').toBeGreaterThan(-1);
    const end = BUILDER_SOURCE.indexOf('gwe-file-photo', open);
    expect(end, 'the panel body is bounded').toBeGreaterThan(open);
    return BUILDER_SOURCE.slice(open, end);
  };

  it('wires the panel button to the same Print Lab handoff the dock uses', () => {
    const panel = showcasePanel();
    expect(panel).toContain('Open in Print Lab');
    expect(panel).toContain('openSelectedBuildInPrintLab(ctx)');
  });

  it('offers a standalone STL download beside it, so a student can use their own slicer', () => {
    const panel = showcasePanel();
    expect(panel).toContain('Download STL');
    expect(panel).toContain('selectedBuildStlDownload(ctx)');
    // The unit must be stated in the panel: a bare STL carries no unit metadata, so a student
    // importing into Cura/PrusaSlicer needs to know it is already millimetres at 100%.
    expect(panel).toMatch(/mm per block/);
  });

  // A slicer reads geometry, not our metadata. Two properties decide whether the downloaded
  // file is actually printable elsewhere, and both are produced in the builder, not Print Lab.
  it('writes Z-up millimetre geometry, the convention third-party slicers expect', () => {
    // Geometry World is Y-up; STL/slicer beds are Z-up. The conversion lives in the writer so
    // BOTH the Print Lab handoff and the standalone download get it.
    expect(BUILDER_SOURCE).toContain('function worldToStl(v) { return [v[0], -v[2], v[1]]; }');
    const writer = BUILDER_SOURCE.slice(BUILDER_SOURCE.indexOf('function writeBinaryStl('), BUILDER_SOURCE.indexOf('function buildGeometryWorldStl('));
    expect(writer, 'every vertex and normal is converted on write').toContain('worldToStl(triangle.n).concat(worldToStl(triangle.v[0]), worldToStl(triangle.v[1]), worldToStl(triangle.v[2]))');
    // The download is scaled into real millimetres and says so in the 80-byte STL header.
    const scaler = BUILDER_SOURCE.slice(BUILDER_SOURCE.indexOf('function scaleStlForDownload('), BUILDER_SOURCE.indexOf('function selectedBuildStlDownload('));
    expect(scaler).toContain("'Geometry World; coordinates in mm; '+unitMm+' mm per block'");
  });

  it('unions adjacent block faces so the export is a solid, not overlapping cubes', () => {
    // Interior faces between touching blocks would leave internal walls that slicers either
    // reject or print as wasted material; unionSurface drops them and the topology is reported.
    expect(BUILDER_SOURCE).toContain('triangles = unionSurface(perBlock, selected);');
    expect(BUILDER_SOURCE).toContain('topology:surfaceTopology(triangles)');
  });
});
