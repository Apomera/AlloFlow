import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const TOOL_PATH = 'stem_lab/stem_tool_geosandbox.js';
const TOOL_MIRROR_PATH = 'desktop/web-app/public/stem_lab/stem_tool_geosandbox.js';
const HOST_PATH = 'stem_lab/stem_lab_module.js';
const HOST_MIRROR_PATH = 'desktop/web-app/public/stem_lab/stem_lab_module.js';

const tool = readFileSync(TOOL_PATH, 'utf8');
const host = readFileSync(HOST_PATH, 'utf8');

describe('Geometry Sandbox mode scene isolation', () => {
  it('hides every incompatible scene root before persisting a mode switch', () => {
    expect(tool).toContain('function prepareGeoModeTransition(nextMode)');
    expect(tool).toContain("['mesh', 'single']");
    expect(tool).toContain("['constructionGroup', 'stretch']");
    expect(tool).toContain("['sliceGroup', 'stretch']");
    expect(tool).toContain("['ghostGroup', 'stretch']");
    expect(tool).toContain("['sculptGroup', 'sculpt']");
    expect(tool).toContain('if (root && entry[1] !== nextMode) root.visible = false;');

    // All five UI/keyboard transition paths must route through the guard. The
    // only direct persisted write left is inside setGeoMode itself.
    expect(tool.match(/setGeoMode\(/g)).toHaveLength(6);
    expect(tool.match(/upd\('mode'/g)).toHaveLength(1);
  });

  it('routes sculpt raycasts to selected-part math in the viewport', () => {
    expect(tool).toContain('prim3dPartIndex');
    expect(tool).toContain('window._geoSelectSculptPart');
    expect(tool).toContain('function selectSculptPart(index)');
    expect(tool).toContain('data-geo-sculpt-math-overlay');
    expect(tool).toContain('selectedReadout.volFormula');
    expect(tool).toContain('selectedReadout.saFormula');
    expect(tool).toContain('geoSculptSelected');
  });

  it('presents one Sculpt workspace for manual and AI-assisted creation', () => {
    expect(tool).toContain('\\uD83E\\uDDCA Sculpt');
    expect(tool).toContain('Sculpt: build manually from primitives or create with AI');
    expect(tool).toContain('manual sculpting below still works');
    expect(tool).not.toContain('\\uD83E\\uDDCA AI Sculpt');
  });

  it('makes sculpt handles direction-readable, draggable, and representation-linked', () => {
    expect(tool).toContain('function _geoHandleScreenAxis(handle)');
    expect(tool).toContain('setPointerCapture');
    expect(tool).toContain('var dragStep = geoSculptDragSteps(hd.travel, dx, dy, hd.sx, hd.sy, 18)');
    expect(tool).toContain("geoSculptHandleSign = dir > 0 ? 'positive' : 'negative'");
    expect(tool).toContain('isGeoSculptHandleStem');
    expect(tool).toContain('function renderSculptRepresentationDiagram(shape, rep)');
    expect(tool).toContain("role: 'img'");
    expect(tool).toContain("h('title', null, geoShapeTitle(shape) + ' net and cross-section')");    expect(tool).toContain('function addSculptCrossSectionGuide(THREE, group, recipe, selectedPart, t)');
    expect(tool).toContain('plane.raycast = function() {}');
    expect(tool).toContain('addSculptCrossSectionGuide(window.THREE, sg, sculptRecipe, selPart, sculptSliceT)');
    expect(tool).toContain('data-geo-sculpt-cross-section');
    expect(tool).toContain('function geoSculptSliceProfile(part, t, recipeScale, worldUnit, sliceCount)');
    expect(tool).toContain('function renderSculptSliceProfile(profile, currentArea, unitShort)');
    expect(tool).toContain("'data-geo-sculpt-slice-profile': 'true'");
    expect(tool).toContain("'data-geo-sculpt-slice-volume': 'true'");
    expect(tool).toContain('function focusSculptPart(index)');
    expect(tool).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
    expect(tool).toContain("'data-geo-sculpt-part-navigator': 'true'");
    expect(tool).toContain("'aria-label': 'Selected sculpt part navigation'");
    expect(tool).toContain('if (window._geoFocusAnim) { cancelAnimationFrame(window._geoFocusAnim)');
    expect(tool).toContain('function previewSculptPart(index)');
    expect(tool).toContain('o.userData.geoSculptPreview = previewed');
    expect(tool).toContain('onFocus: function() { previewSculptPart(i); }');
    expect(tool).toContain('onBlur: function() { previewSculptPart(null); }');
    expect(tool).toContain('focusSculptPart(null)');
    expect(tool).toContain('Framed the whole sculpt in the 3D view.');
  });
  it('prevents the legacy host renderer from creating primitives outside single mode', () => {
    const guard = host.indexOf("if (activeGeoMode !== 'single')");
    const init = host.indexOf('// Init scene if not already', guard);
    const create = host.indexOf('var mesh = new THREE.Mesh(geometry, material);', guard);

    expect(guard).toBeGreaterThan(-1);
    expect(init).toBeGreaterThan(guard);
    expect(create).toBeGreaterThan(init);
    expect(host).toContain('legacyGeoScene.mesh.visible = false;');
    expect(host).toContain('legacyGeoScene.mesh = null;');
  });

  it('keeps canonical and desktop copies byte-identical', () => {
    expect(readFileSync(TOOL_MIRROR_PATH, 'utf8')).toBe(tool);
    expect(readFileSync(HOST_MIRROR_PATH, 'utf8')).toBe(host);
  });
});
