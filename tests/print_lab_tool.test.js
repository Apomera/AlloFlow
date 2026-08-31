import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL_FILE = 'stem_lab/stem_tool_printlab.js';
const TOOL_SOURCE = readFileSync(resolve(process.cwd(), TOOL_FILE), 'utf8');

const RECIPE = {
  version: 'p3d/1',
  name: 'Test token',
  scale: 1,
  parts: [{
    shape: 'box',
    size: [1, 1, 1],
    position: [0, 0.5, 0],
    rotation: [0, 0, 0],
    color: '#22d3ee',
  }],
};

const PREFLIGHT = {
  status: 'WARN',
  sourceFormat: 'RECIPE',
  triangleCount: 12,
  meshCount: 1,
  dimensionsMm: { width: 20, depth: 20, height: 20 },
  volumeMm3UpperBound: 8000,
  issues: [{ code: 'ASSEMBLY_NOT_UNIONED', severity: 'WARNING', message: 'Staff must inspect the sliced result.' }],
};

beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.PrintableModel;
  delete window.AlloModules.Prim3D;
  // Exercise the real shared modules that Print Lab depends on.
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'printable_model_module.js'), 'utf8'))();
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'prim3d_module.js'), 'utf8'))();
});

beforeEach(() => {
  resetStemLab();
  loadTool(TOOL_FILE, 'printLab');
});

describe('Print Lab workflow surface', () => {
  it('registers four keyboard-operable tabs and the manual, AI, and local-import design paths', () => {
    const html = renderTool('printLab', { printLab: { activeTab: 'Design', recipe: RECIPE, unitMm: 20 } });

    expect(html).toContain('data-print-lab="true"');
    expect(html).toContain('role="tablist"');
    expect(html.match(/role="tab"/g)).toHaveLength(4);
    expect(html).toContain('aria-controls="print-lab-panel-design"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('Design with primitives');
    expect(html).toContain('+ box');
    expect(html).toContain('Optional AI modeling assistant');
    expect(html).toContain('Choose RECIPE / GLB / STL');
    expect(html).toContain('Maximum 5 MB');
    expect(html).toMatch(/<canvas[^>]*role="img"/);
    expect(html).toContain('aria-label="Interactive preview of the current model. A complete text report is available in the Preflight tab."');
    expect(html).not.toMatch(/<canvas[^>]*tabindex=/i);
  });

  it('drops malformed persisted recipes before the design surface renders', () => {
    const malformedRecipes = [
      { parts: 'not-an-array' },
      { parts: [{ shape: 'box' }] },
      { parts: [{ shape: 'script', size: [1, 1, 1], position: [0, 0, 0], rotation: [0, 0, 0] }] },
    ];

    malformedRecipes.forEach(recipe => {
      expect(window.StemLab.printLabPure.normalizePersistedRecipe(recipe)).toBeNull();
      const html = renderTool('printLab', { printLab: { activeTab: 'Design', recipe } });
      expect(html).toContain('No primitive recipe yet.');
      expect(html).not.toContain('Part 1');
    });

    const fallback = window.StemLab.printLabPure.normalizePersistedRecipe({
      name: 'A'.repeat(120), scale: 99, rotY: -90, tint: '#ABCDEF', extra: 'drop me',
      parts: [{ shape: 'BOX', size: [99, 0.001, 1], stretch: [9, 1, 0], position: [99, -99, 2], rotation: [999, 0, -999], color: '#ABCDEF', privateNote: 'drop me' }],
    }, {});
    expect(fallback).toMatchObject({ version: 'p3d/1', scale: 5, rotY: 270, tint: '#abcdef' });
    expect(fallback.name).toHaveLength(80);
    expect(fallback.parts[0]).toEqual({
      shape: 'box', size: [4, 0.02, 1], stretch: [4, 1, 0.1], position: [4, -4, 2], rotation: [360, 0, -360], color: '#abcdef',
    });
    expect(fallback).not.toHaveProperty('extra');
    expect(fallback.parts[0]).not.toHaveProperty('privateNote');
  });

  it('keeps preflight advisory and requires the slicer and trained staff review', () => {
    const html = renderTool('printLab', { printLab: { activeTab: 'Preflight', recipe: RECIPE, unitMm: 20, preflight: PREFLIGHT } });

    expect(html).toContain('School printer profile');
    expect(html).toContain('Run advisory preflight');
    expect(html).toContain('Advisory, not certification.');
    expect(html).toContain('trained staff member');
    expect(html).toContain('wall thickness');
    expect(html).toContain('Analyze &amp; Repair');
    expect(html).toContain('Create conservative repair candidate');
    expect(html).toContain('does not fill holes');
  });

  it('teaches qualified material tradeoffs without promising that PHA is universally green or safe', () => {
    const html = renderTool('printLab', { printLab: { activeTab: 'Materials', recipe: RECIPE, unitMm: 20, preflight: PREFLIGHT } });

    expect(html).toContain('Materials are systems, not labels');
    expect(html).toContain('PHA / PHA blend');
    expect(html).toContain('automatic green guarantee');
    expect(html).toContain('exact filament');
    expect(html).toContain('receiving slicer determines the real toolpath');
    expect(html).toContain('does not replace');
  });

  it('presents a privacy-minimized review handoff, not a purchase or ledger action', () => {
    const html = renderTool('printLab', { printLab: {
      activeTab: 'Submit', recipe: RECIPE, unitMm: 20, preflight: PREFLIGHT,
      title: 'Test token', materialId: 'PLA', aiUse: 'NONE',
    } });

    expect(html).toContain('Prepare a staff-review handoff');
    expect(html).toContain('does not deduct points');
    expect(html).toContain('Model bytes embedded');
    expect(html).toContain('>No<');
    expect(html).toContain('.alloflow-print.json');
    expect(html).toContain('contains no account identifier');
    expect(html).toContain('only then create a store request');
    expect(html).toContain('Job Ticket');
    expect(html).toContain('alloflow-print-job/1');
    expect(html).toContain('Import local G-code comment metadata');
    expect(html).toContain('Configurable point estimate');
    expect(html).toContain('Simulator');
    expect(html).toContain('Queue in simulator');
    expect(html).toContain('adapters remain disabled');
    expect(html).toContain('deterministic SHA-256 digest');
    expect(html).toContain('not a signature');
    expect(html).toContain('server approval');
  });
});

describe('Print Lab import and handoff guardrails', () => {
  it('exposes a deterministic 5 MB extension allowlist for local files', () => {
    const pure = window.StemLab.printLabPure;

    expect(pure.TABS).toEqual(['Design', 'Preflight', 'Materials', 'Submit']);
    expect(pure.allowedFile({ name: 'model.glb', size: 5 * 1024 * 1024 })).toMatchObject({ ok: true, format: 'GLB' });
    expect(pure.allowedFile({ name: 'model.STL', size: 128 })).toMatchObject({ ok: true, format: 'STL' });
    expect(pure.allowedFile({ name: 'model.alloflow-print.json', size: 128 })).toMatchObject({ ok: true, format: 'RECIPE' });
    expect(pure.allowedFile({ name: 'model.glb', size: 5 * 1024 * 1024 + 1 })).toMatchObject({ ok: false });
    expect(pure.allowedFile({ name: 'model.obj', size: 128 })).toMatchObject({ ok: false });
    expect(pure.allowedGcodeFile({ name: 'reviewed.gcode', size: 1024 })).toMatchObject({ ok: true });
    expect(pure.allowedGcodeFile({ name: 'commands.txt', size: 1024 })).toMatchObject({ ok: false });
  });

  it('reuses only the exact HTTPS Apps Script portal URL saved by Project Settings', () => {
    const pure = window.StemLab.printLabPure;

    expect(pure.normalizeRewardsPortalUrl('https://script.google.com/macros/s/deploy_123/exec')).toBe('https://script.google.com/macros/s/deploy_123/exec');
    expect(pure.normalizeRewardsPortalUrl('https://script.google.com/macros/s/deploy_123/exec?user=student')).toBe('');
    expect(pure.normalizeRewardsPortalUrl('https://example.com/macros/s/deploy_123/exec')).toBe('');
  });

  it('pins the classic r128 GLTFLoader locally first and parses GLB bytes without a network URL', () => {
    const local = TOOL_SOURCE.indexOf("selfAsset('../vendor/three-r128/GLTFLoader.js')");
    const jsdelivr = TOOL_SOURCE.indexOf('three@0.128.0/examples/js/loaders/GLTFLoader.js');

    expect(local).toBeGreaterThan(-1);
    expect(jsdelivr).toBeGreaterThan(local);
    expect(TOOL_SOURCE).toContain("loader.parse(exactArrayBuffer(bytes), ''");
    expect(TOOL_SOURCE).toContain('Printable.inspectRecipe');
    expect(TOOL_SOURCE).toContain('Printable.inspectStl');
    expect(TOOL_SOURCE).toContain('Printable.inspectGlb');
  });

  it('uses the versioned serializer and STL exporter without calling rewards or Google APIs directly', () => {
    expect(TOOL_SOURCE).toContain('Printable.serializeSubmission');
    expect(TOOL_SOURCE).toContain('Printable.exportBinaryStl');
    expect(TOOL_SOURCE).toContain("'student-model.' + format.toLowerCase()");
    expect(TOOL_SOURCE).not.toMatch(/checkoutSchoolRewards|awardSchoolRewards|google\.script\.run|fetch\s*\(/);
  });

  it('hashes normalized recipes and invalidates stale job artifacts when quote inputs change', () => {
    expect(TOOL_SOURCE).toContain('Printable.sha256Hex(JSON.stringify(clean))');
    expect(TOOL_SOURCE).toContain("replaceDesign('RECIPE', clean, null, null, '', 20, recipeReport, normalizedHash, 'modelImport')");

    expect(TOOL_SOURCE).toContain('function invalidateManufacturingEvidence(options)');
    expect(TOOL_SOURCE).toContain("setGcodeMetadata(null); setGcodeMetadataHash(''); setGcodeBinding('');");
    expect(TOOL_SOURCE).toContain("persist({ unitMm: next, preflight: null, preflightBinding: '' })");
    expect(TOOL_SOURCE).toContain('updateRecipe(clean, 20)');
    expect(TOOL_SOURCE).toMatch(/setInfillPercent\(next\);\s*clearJobArtifacts\(\);/);
    expect(TOOL_SOURCE).toMatch(/setSupportPercent\(next\);\s*clearJobArtifacts\(\);/);
  });

  it('binds persisted preflight and slicer evidence to the exact manufacturing context', () => {
    const pure = window.StemLab.printLabPure;
    const profile = pure.normalizePrinterProfile({});
    const report = pure.normalizePersistedPreflight(PREFLIGHT);
    const binding = pure.persistedPreflightBinding(RECIPE, 20, profile);

    expect(report).toMatchObject({ status: 'WARN', sourceFormat: 'RECIPE', dimensionsMm: PREFLIGHT.dimensionsMm });
    expect(binding).toContain('alloflow-print-preflight-binding/1');
    expect(pure.persistedPreflightBinding(RECIPE, 21, profile)).not.toBe(binding);
    expect(pure.persistedPreflightBinding(RECIPE, 20, Object.assign({}, profile, { bedWidthMm: 180 }))).not.toBe(binding);
    expect(pure.normalizePersistedPreflight(Object.assign({}, PREFLIGHT, { sourceFormat: 'STL' }))).toBeNull();

    const trusted = renderTool('printLab', { printLab: { activeTab: 'Preflight', recipe: RECIPE, unitMm: 20, profile, preflight: PREFLIGHT, preflightBinding: binding } });
    const stale = renderTool('printLab', { printLab: { activeTab: 'Preflight', recipe: RECIPE, unitMm: 21, profile, preflight: PREFLIGHT, preflightBinding: binding } });
    expect(trusted).toContain('>WARN</span>');
    expect(stale).not.toContain('>WARN</span>');

    const hash = 'a'.repeat(64);
    const evidence = pure.manufacturingEvidenceBinding(hash, 'RECIPE', 20, 'PLA', profile);
    expect(evidence).toContain('alloflow-print-evidence-binding/1');
    expect(pure.manufacturingEvidenceBinding(hash, 'RECIPE', 20, 'PETG', profile)).not.toBe(evidence);
    expect(pure.manufacturingEvidenceBinding(hash, 'RECIPE', 25, 'PLA', profile)).not.toBe(evidence);
    expect(pure.manufacturingEvidenceBinding('not-a-hash', 'RECIPE', 20, 'PLA', profile)).toBe('');
  });

  it('allows 5 MiB local inspection while enforcing the School Rewards 4 MiB asset gate', () => {
    const pure = window.StemLab.printLabPure;
    const borderline = Math.floor(4.5 * 1024 * 1024);

    expect(pure.MAX_FILE_BYTES).toBe(5 * 1024 * 1024);
    expect(pure.MAX_PORTAL_ASSET_BYTES).toBe(4 * 1024 * 1024);
    expect(pure.allowedFile({ name: 'borderline.stl', size: borderline })).toMatchObject({ ok: true, format: 'STL' });
    expect(pure.schoolRewardsAssetCompatibility('STL', borderline)).toMatchObject({ compatible: false, needsAsset: true, maxBytes: 4 * 1024 * 1024 });
    expect(pure.schoolRewardsAssetCompatibility('GLB', 4 * 1024 * 1024)).toMatchObject({ compatible: true, needsAsset: true });
    expect(pure.schoolRewardsAssetCompatibility('RECIPE', 0)).toMatchObject({ compatible: true, needsAsset: false });
    expect(TOOL_SOURCE).toContain("'data-school-rewards-asset-ready': 'false'");
  });

  it('prefers slicer-reported grams and gates tickets on a reviewed material estimate', () => {
    const slicerMaterial = TOOL_SOURCE.indexOf('var slicerMaterial = gcodeMetadata && gcodeMetadata.filamentGrams > 0');
    const quoteFallback = TOOL_SOURCE.indexOf('var quoteMaterial = slicerMaterial || materialEstimate');

    expect(slicerMaterial).toBeGreaterThan(-1);
    expect(quoteFallback).toBeGreaterThan(slicerMaterial);
    expect(TOOL_SOURCE).toContain('var pointQuote = Printable && quoteMaterial ? Printable.estimatePointQuote(quoteMaterial, quoteConfig) : null;');
    expect(TOOL_SOURCE).toContain("if (!quoteMaterial || !(Number(quoteMaterial.estimatedGrams) > 0))");
    expect(TOOL_SOURCE).toContain('disabled: !gcodeEvidenceCurrent || !quoteMaterial || !materialReviewed');
    expect(TOOL_SOURCE).toContain('expectedBinding !== gcodeBinding');
    expect(TOOL_SOURCE).toContain('This metadata reports filament length but not mass.');
  });
});
