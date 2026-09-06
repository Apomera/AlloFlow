// Art Studio -> Print Lab bridge (2026-09-05).
//
// Art Studio's sculpt mode builds the same constrained Prim3D recipe that the
// Print Lab's Design tab edits and the School Rewards portal accepts as the
// RECIPE handoff format. Until this bridge the only way across was to export
// the sculpture as JSON and load that file in Print Lab by hand. Now the
// sculpt toolbar hands the recipe over locally, the way Geometry World hands
// over an STL, and Print Lab opens on the Design tab with the recipe loaded.
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resetStemLab, loadTool, renderTool } from './helpers/stem_widgets_smoke_harness.js';

const PRINT_PATHS = ['stem_lab/stem_tool_printlab.js', 'desktop/web-app/public/stem_lab/stem_tool_printlab.js'];
const ART_PATHS = ['stem_lab/stem_tool_artstudio.js', 'desktop/web-app/public/stem_lab/stem_tool_artstudio.js'];

function recipe(parts) {
  return {
    version: 'p3d/1',
    name: 'Desk otter',
    parts: parts || [
      { shape: 'sphere', size: [0.6, 0.6, 0.6], position: [0, 0.5, 0], rotation: [0, 0, 0], color: '#818cf8' },
      { shape: 'cylinder', size: [0.3, 0.8, 0.3], position: [0, 1.1, 0], rotation: [0, 0, 0], color: '#f472b6' },
    ],
  };
}

function handoff(overrides = {}) {
  return Object.assign({
    schema: 'alloflow-print-source/1',
    id: 'as-test',
    sourceTool: 'artStudio',
    format: 'RECIPE',
    recipe: recipe(),
    title: 'Desk otter',
    description: 'Created in Art Studio sculpt mode.',
    unitMm: 20,
  }, overrides);
}

function loadPrintLab() {
  resetStemLab();
  window.StemLab.geometryWorldBuilderPure = {};
  return loadTool(PRINT_PATHS[0], 'printLab');
}

afterEach(() => { delete window.__alloPrintLabPendingHandoff; });

describe('Art Studio to Print Lab bridge', () => {
  it('ships both tools byte-identical in the CDN and desktop trees', () => {
    for (const [a, b] of [PRINT_PATHS, ART_PATHS]) expect(readFileSync(b, 'utf8')).toBe(readFileSync(a, 'utf8'));
  });

  it('gives the sculpt toolbar a Print Lab button that hands over the recipe locally', () => {
    const src = readFileSync(ART_PATHS[0], 'utf8');
    expect(src).toContain(`"aria-label": __alloT('stem.artstudio.a11y_continue_this_sculpture_in_print_lab', 'Continue this sculpture in Print Lab')`);
    expect(src).toContain("__alloT('stem.artstudio.sculpt_print_lab', 'Print Lab')");
    expect(src).toContain("schema: 'alloflow-print-source/1'");
    expect(src).toContain("sourceTool: 'artStudio', format: 'RECIPE'");
    expect(src).toContain("ctx.setStemLabTool('printLab')");
    // Without navigation the handoff must not be left dangling on window.
    expect(src).toContain('delete window.__alloPrintLabPendingHandoff;');
  });

  it('accepts a valid Art Studio recipe handoff and normalises it', () => {
    loadPrintLab();
    const pure = window.StemLab.printLabPure;
    const out = pure.readPendingLocalHandoff(handoff());
    expect(out).toMatchObject({ sourceTool: 'artStudio', format: 'RECIPE', bytes: null, title: 'Desk otter', unitMm: 20 });
    expect(out.recipe.parts).toHaveLength(2);
    expect(out.summary).toEqual({ partCount: 2, name: 'Desk otter' });
    // Title falls back to the recipe name, then to a generic label.
    expect(pure.readPendingLocalHandoff(handoff({ title: '' })).title).toBe('Desk otter');
    expect(pure.readPendingLocalHandoff(handoff({ title: '', recipe: Object.assign(recipe(), { name: '' }) })).title).toBe('Art Studio sculpture');
  });

  it('rejects anything that is not a well-formed Art Studio recipe', () => {
    loadPrintLab();
    const pure = window.StemLab.printLabPure;
    expect(pure.readPendingRecipeHandoff(null)).toBeNull();
    expect(pure.readPendingRecipeHandoff(handoff({ schema: 'something-else/1' }))).toBeNull();
    expect(pure.readPendingRecipeHandoff(handoff({ format: 'STL' }))).toBeNull();
    expect(pure.readPendingRecipeHandoff(handoff({ sourceTool: 'geometryWorld' }))).toBeNull();
    expect(pure.readPendingRecipeHandoff(handoff({ recipe: null }))).toBeNull();
    expect(pure.readPendingRecipeHandoff(handoff({ recipe: recipe([]) }))).toBeNull();
    expect(pure.readPendingRecipeHandoff(handoff({ recipe: recipe([{ shape: 'teapot', size: [1, 1, 1], position: [0, 0, 0], rotation: [0, 0, 0] }]) }))).toBeNull();
    // The general reader still refuses a Geometry World shape claiming the recipe format.
    expect(pure.readPendingLocalHandoff(handoff({ sourceTool: 'geometryWorld' }))).toBeNull();
  });

  it('carries an edited recipe back to Art Studio and opens its sculpt tab', () => {
    const printSrc = readFileSync(PRINT_PATHS[0], 'utf8');
    expect(printSrc).toContain("window.__alloArtStudioPendingSculpt = {");
    expect(printSrc).toContain("schema: 'alloflow-artstudio-sculpt/1'");
    expect(printSrc).toContain("ctx.updateMulti('artStudio', { tab: 'sculpt3d', studioStarted: true })");
    expect(printSrc).toContain("onClick: returnToArtStudio");
    expect(printSrc).toContain("'Download editable sculpture recipe'");
    const artSrc = readFileSync(ART_PATHS[0], 'utf8');
    expect(artSrc).toContain('delete window.__alloArtStudioPendingSculpt;');
    expect(artSrc).toContain("updMany({ sculptRecipe: pending.recipe, sculptSel: 0, sculptUndo: d.sculptRecipe ? [d.sculptRecipe] : [], sculptRedo: [], tab: 'sculpt3d', studioStarted: true });");
  });

  it('validates a returning sculpture before Art Studio accepts it', () => {
    resetStemLab();
    loadTool(ART_PATHS[0], 'artStudio');
    const pure = window.StemLab.artStudioPure;
    expect(typeof pure.readPendingSculpt).toBe('function');
    // Prim3D is not loaded in this harness, so a real normaliser is stubbed in
    // with the same contract: null for junk, a cleaned recipe otherwise.
    window.AlloModules = window.AlloModules || {};
    const previous = window.AlloModules.Prim3D;
    window.AlloModules.Prim3D = { normalizeRecipe: (r) => (r && Array.isArray(r.parts) && r.parts.length ? { version: 'p3d/1', name: String(r.name || ''), parts: r.parts.slice(0, 24) } : null) };
    try {
      const ok = pure.readPendingSculpt({ schema: 'alloflow-artstudio-sculpt/1', id: 'pl-1', recipe: recipe() });
      expect(ok).toEqual({ id: 'pl-1', recipe: { version: 'p3d/1', name: 'Desk otter', parts: recipe().parts } });
      expect(pure.readPendingSculpt(null)).toBeNull();
      expect(pure.readPendingSculpt({ schema: 'other/1', recipe: recipe() })).toBeNull();
      expect(pure.readPendingSculpt({ schema: 'alloflow-artstudio-sculpt/1', recipe: null })).toBeNull();
      expect(pure.readPendingSculpt({ schema: 'alloflow-artstudio-sculpt/1', recipe: recipe([]) })).toBeNull();
      window.__alloArtStudioPendingSculpt = { schema: 'alloflow-artstudio-sculpt/1', id: 'pl-2', recipe: recipe() };
      expect(pure.readPendingSculpt().id).toBe('pl-2');
    } finally {
      window.AlloModules.Prim3D = previous;
      delete window.__alloArtStudioPendingSculpt;
    }
  });

  it('offers the three design tools as starting points when nothing was handed in', () => {
    loadPrintLab();
    const html = renderTool('printLab', { printLab: {} });
    expect(html).toContain('Or start in another tool');
    for (const label of ['Start in Geometry World', 'Start in Architecture Studio', 'Start in Art Studio']) expect(html).toContain(label);
    window.__alloPrintLabPendingHandoff = handoff();
    expect(renderTool('printLab', { printLab: {} })).not.toContain('Or start in another tool');
  });

  it('opens Print Lab on the Design tab with the sculpture loaded and named as its source', () => {
    loadPrintLab();
    window.__alloPrintLabPendingHandoff = handoff();
    const html = renderTool('printLab', { printLab: {} });
    expect(html).toContain('From Art Studio');
    expect(html).toContain('Revise in Art Studio');
    expect(html).toContain('Desk otter');
    expect(html).toContain('Loaded an Art Studio sculpture locally');
    expect(html).not.toContain('From Geometry World');
  });
});
