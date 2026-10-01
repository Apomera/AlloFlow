// Architecture Studio -> Print Lab bridge (2026-09-05).
//
// Architecture Studio builds block structures as real 3D geometry and could
// already download them as binary STL; the only way into Print Lab was to
// save that file and open it again by hand. The toolbar now hands the same
// STL over locally, exactly as Geometry World does, and Print Lab opens with
// it loaded, its scale presets, and a From Architecture Studio card.
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resetStemLab, loadTool, renderTool } from './helpers/stem_widgets_smoke_harness.js';

const PRINT_PATHS = ['stem_lab/stem_tool_printlab.js', 'desktop/web-app/public/stem_lab/stem_tool_printlab.js'];
const ARCH_PATHS = ['stem_lab/stem_tool_archstudio.js', 'desktop/web-app/public/stem_lab/stem_tool_archstudio.js'];

// A binary STL of n triangles; the first triangle spans a 1 x 2 x 3 box so the
// mesh envelope is measurable.
function binaryStl(triangleCount, byteLength) {
  const length = byteLength == null ? 84 + triangleCount * 50 : byteLength;
  const bytes = new Uint8Array(length);
  if (length >= 84) {
    const view = new DataView(bytes.buffer);
    view.setUint32(80, triangleCount, true);
    const values = [0, 0, 1, 0, 0, 0, 1, 0, 2, 0, 3, 1];
    const complete = Math.min(triangleCount, Math.floor((length - 84) / 50));
    for (let t = 0; t < complete; t += 1) values.forEach((v, i) => view.setFloat32(84 + t * 50 + i * 4, v, true));
  }
  return bytes;
}

function handoff(overrides = {}) {
  return Object.assign({
    schema: 'alloflow-print-source/1',
    id: 'arch-test',
    sourceTool: 'archStudio',
    format: 'STL',
    bytes: binaryStl(2),
    sourceName: 'architecture-studio-build.stl',
    title: 'Architecture Studio build - 7 blocks',
    description: 'Created in Architecture Studio.',
    unitMm: 5,
    summary: { blockCount: 7, triangleCount: 2 },
  }, overrides);
}

function loadPrintLab() {
  resetStemLab();
  window.StemLab.geometryWorldBuilderPure = {};
  return loadTool(PRINT_PATHS[0], 'printLab');
}

afterEach(() => { delete window.__alloPrintLabPendingHandoff; });

describe('Architecture Studio to Print Lab bridge', () => {
  it('ships both tools byte-identical in the CDN and desktop trees', () => {
    for (const [a, b] of [PRINT_PATHS, ARCH_PATHS]) expect(readFileSync(b, 'utf8')).toBe(readFileSync(a, 'utf8'));
  });

  it('gives the studio toolbar a Print Lab button that reuses the STL builder', () => {
    const src = readFileSync(ARCH_PATHS[0], 'utf8');
    expect(src).toContain("t('stem.archstudio.print_lab', 'Print Lab')");
    expect(src).toContain("t('stem.archstudio.print_lab_aria', 'Continue this building in Print Lab')");
    expect(src).toContain("sourceTool: 'archStudio', format: 'STL'");
    expect(src).toContain("ctx.setStemLabTool('printLab')");
    // One STL builder feeds both the download and the handoff.
    expect(src.match(/var buildArchStl = function/g)).toHaveLength(1);
    expect(src).toContain('var exportSTL = function () {\n      var bundle = buildArchStl();');
    expect(src).toContain('var sendToPrintLab = function () {\n      var bundle = buildArchStl();');
    // Where navigation is unavailable the model is downloaded instead of stranded.
    expect(src).toContain("if (typeof ctx.setStemLabTool !== 'function') { exportSTL();");
  });

  it('also offers Print Lab from the always-visible sidebar, not only the scrolling toolbar', () => {
    const src = readFileSync(ARCH_PATHS[0], 'utf8');
    expect(src).toContain("t('stem.archstudio.print_export', 'Print & export')");
    // Two Print Lab buttons share one handler: toolbar and sidebar.
    expect(src.match(/onClick: sendToPrintLab/g)).toHaveLength(2);
    expect(src.match(/onClick: exportSTL/g)).toHaveLength(2);
    resetStemLab();
    loadTool(ARCH_PATHS[0], 'archStudio');
    const html = renderTool('archStudio', { blocks: [{ x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 }] });
    expect(html).toContain('Print &amp; export');
    expect(html).toContain('Continue this building in Print Lab');
    expect(html).toContain('Download this building as an STL file');
  });

  it('accepts a well-formed Architecture Studio STL handoff and measures it', () => {
    loadPrintLab();
    const pure = window.StemLab.printLabPure;
    const out = pure.readPendingLocalHandoff(handoff());
    expect(out).toMatchObject({ sourceTool: 'archStudio', format: 'STL', sourceName: 'architecture-studio-build.stl', unitMm: 5, sourceModel: null });
    expect(out.bytes).toBeInstanceOf(Uint8Array);
    expect(out.summary.blockCount).toBe(7);
    expect(out.summary.triangleCount).toBe(2);
    expect(out.summary.meshDimensions).toEqual({ L: 1, W: 2, H: 3 });
    expect(pure.readPendingLocalHandoff(handoff({ title: '', summary: {} })).title).toBe('Architecture Studio build');
  });

  it('rejects malformed STL bytes and foreign shapes', () => {
    loadPrintLab();
    const pure = window.StemLab.printLabPure;
    expect(pure.readPendingArchStudioHandoff(null)).toBeNull();
    expect(pure.readPendingArchStudioHandoff(handoff({ format: 'RECIPE' }))).toBeNull();
    expect(pure.readPendingArchStudioHandoff(handoff({ sourceTool: 'geometryWorld' }))).toBeNull();
    expect(pure.readPendingArchStudioHandoff(handoff({ bytes: null }))).toBeNull();
    expect(pure.readPendingArchStudioHandoff(handoff({ bytes: binaryStl(2, 84 + 50) }))).toBeNull();
    expect(pure.readPendingArchStudioHandoff(handoff({ bytes: binaryStl(0) }))).toBeNull();
    // Geometry World's own path is untouched: it still needs its editable source model.
    expect(pure.readPendingLocalHandoff(Object.assign(handoff(), { sourceTool: 'geometryWorld', sourceModel: null }))).toBeNull();
  });

  it('opens Print Lab with the building loaded, its scale presets, and a way back', () => {
    loadPrintLab();
    window.__alloPrintLabPendingHandoff = handoff();
    const html = renderTool('printLab', { printLab: {} });
    expect(html).toContain('From Architecture Studio');
    expect(html).toContain('Revise in Architecture Studio');
    expect(html).toContain('Millimeters per Architecture Studio block');
    expect(html).toContain('Architecture Studio scale presets');
    expect(html).toContain('Current physical size: 5 × 10 × 15 mm');
    expect(html).toContain('Loaded an Architecture Studio build locally');
    expect(html).not.toContain('From Geometry World');
    expect(html).not.toContain('From Art Studio');
  });
});
