import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE_FILE = 'stem_lab/stem_tool_geosandbox.js';
const PUBLIC_FILE = 'desktop/web-app/public/stem_lab/stem_tool_geosandbox.js';
const IMMERSIVE_SOURCE_FILE = 'immersive_geometry/immersive_geometry.html';
const IMMERSIVE_PUBLIC_FILE = 'desktop/web-app/public/immersive_geometry/immersive_geometry.html';

function read(path) {
  return readFileSync(path, 'utf8');
}

describe('Geometry Sandbox visual clarity', () => {
  it('keeps source and public copies aligned', () => {
    expect(read(PUBLIC_FILE)).toBe(read(SOURCE_FILE));
  });

  it('keeps immersive geometry source and public copies aligned', () => {
    expect(read(IMMERSIVE_PUBLIC_FILE)).toBe(read(IMMERSIVE_SOURCE_FILE));
  });

  it('does not enable haze-prone scene polish by default', () => {
    const source = read(SOURCE_FILE);

    expect(source).toContain('scene.background = new THREE.Color(themeBg)');
    expect(source).toContain('window.AlloGeoSandboxPostFXEnabled !== true');
    expect(source).toContain('new THREE.MeshPhongMaterial');
    expect(source).not.toContain('new THREE.CanvasTexture(bgCv)');
    expect(source).not.toContain('scene._alloMotes');
    expect(source).not.toContain('new THREE.MeshPhysicalMaterial');
  });

  it('keeps compact UI text and controls at accessible contrast', () => {
    const source = read(SOURCE_FILE);
    const immersive = read(IMMERSIVE_SOURCE_FILE);

    expect(source).toContain('allo-geosandbox-contrast-css');
    expect(source).toContain("id: 'allo-geo-sandbox'");
    expect(source).not.toContain('text-amber-900 bg-amber-500/20');
    expect(source).not.toContain('from-amber-500 to-orange-600 text-white');
    expect(source).not.toContain('bg-yellow-600 text-white');
    expect(source).not.toContain('bg-sky-600 text-white');
    expect(source).not.toMatch(/hover:bg-(sky|yellow|emerald|teal|amber|orange)-600/);
    expect(source).not.toContain('border-transparent hover:bg-slate-700');
    expect(source).not.toContain('border-transparent hover:scale-105');

    expect(immersive).toContain('--accent: #665cf5');
    expect(immersive).toContain('button.act:focus-visible');
    expect(immersive).toContain('id="labelWrap"');
    expect(immersive).not.toContain('--accent: #6366f1');
    expect(immersive).not.toContain('color: #5f6d99');
    expect(immersive).not.toContain('color: #7d86ad');
  });

  it('renders stretch and sculpt objects with high-contrast scene labels', () => {
    const source = read(SOURCE_FILE);

    expect(source).toContain('function buildGeoLabelSprite');
    expect(source).toContain('function addSculptSceneLabel');
    expect(source).toContain('function sculptPartLabelText');
    expect(source).toContain('function sculptRecipeLabelText');
    expect(source).toContain('var showSceneLabels = gd.showSceneLabels !== false');
    expect(source).toContain("t('stem.geosandbox.scene_labels', 'Scene labels')");
    expect(source).toContain("(mode === 'stretch' || mode === 'sculpt')");
    expect(source).toContain('addSculptSceneLabel(window.THREE, sg, sculptRecipe, selPart, unitDef.short)');
    expect(source).toContain('selPart]');
    expect(source).toContain('new THREE.CanvasTexture(canvas)');
    expect(source).toContain('disposeGeoObject3D(window._geoScene.constructionGroup)');
    expect(source).toContain('disposeGeoObject3D(window._geoScene.sculptGroup)');
  });
  it('keeps the 3D canvas and supporting graphics keyboard and screen-reader accessible', () => {
    const source = read(SOURCE_FILE);

    expect(source).toContain("role: 'application'");
    expect(source).toContain("'aria-describedby': 'geo-sandbox-canvas-description'");
    expect(source).toContain("'aria-keyshortcuts': 'ArrowUp ArrowDown ArrowLeft ArrowRight + - [ ] Delete'");
    expect(source).toContain("new window.THREE.Spherical().setFromVector3(offset)");
    expect(source).toContain("role: 'alertdialog'");
    expect(source).not.toContain('window.confirm(');
    expect(source).not.toContain('window.prompt(');
    expect(source).toContain("id: 'geo-save-name'");
    expect(source).toContain("key === '[' || key === ']'" );
    expect(source).toContain("key === 'Delete' || key === 'Backspace'");
    expect(source).toContain('var next = (g.history || []).concat([snap]);');
    expect((source.match(/role: 'img'/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(source).toContain("@media (max-width: 760px)");
    expect(source).toContain("id: 'geo-control-sidebar'");
    expect(source).toContain("id: 'geo-viewport-shell'");
    expect(source).toContain("pc.kind === 'annularSector'");
    expect(source).toContain("mode === 'single' && h('button', { 'aria-label': t('stem.geosandbox.export_stl', 'Export current shape as STL')");
    expect(source).toContain("'aria-label': t('stem.geosandbox.ai_tutor', 'AI Tutor')");
    expect(source).toContain("if (!exportSTL(shape, addToast))");
    expect(source).toContain("if (typeof mesh.updateMatrixWorld === 'function') mesh.updateMatrixWorld(true)");
    expect(source).toContain("window.setTimeout(function() { URL.revokeObjectURL(url); }, 0)");
    expect(source).toContain("steps.vol.formula");
    expect(source).toContain("steps.sa.formula");
    expect(source).toContain("['box','pyramid','prism'].indexOf(shape) >= 0");
    expect(source).toContain("geometry.rotateY(Math.PI / 4)");
    expect(source).toContain("label: 'Rectangular Prism'");
    expect(source).toContain("label: 'Base Half-Side'");
    expect(source).toContain("title: 'Frustum'");
    expect(source).toContain("rd = geoNormalizeShapeDims(sid, rd)");
    expect(source).toContain("shape === 'torus' && sl.key === 'tube'");
    expect(source).toContain("torus does not self-intersect");
    expect(source).toContain('input[type="range"] { min-height: 24px');
    expect(source).toContain("'aria-pressed': shapeColor === c");
    expect(source).toContain("role: 'switch', 'aria-checked': wireframe");
    expect(source).toContain("className: 'w-7 h-7 rounded-full");
    expect(source).toContain("className: 'geo-hint-touch'");
    expect(source).toContain("Pinch: zoom");
    expect(source).toContain("['ArrowLeft','ArrowRight','Home','End']");
    expect(source).toContain("tabIndex: mode === 'single' ? 0 : -1");
    expect(source).toContain("'aria-controls': 'geo-fullscreen-container'");
    expect(source).toContain("'aria-controls': 'geo-stretch-net-panel'");
    expect(source).toContain("disabled: !net");
    expect(source).toContain("'aria-controls': 'geo-single-net-panel'");
    expect(source).toContain("clearTimeout(window._geoSrTimer); window._geoSrTimer = null");
    expect(source).toContain("_geoAudioCtx.state !== 'closed'");
    expect(source).toContain("_geoAudioCtx = null");
    expect(source).toContain("id: 'geo-challenge-answer'");
    expect(source).toContain("document.getElementById('geo-challenge-answer')");
    expect(source).toContain("geoFormatChallengeAnswer(challenge)");
    expect(source).toContain("'aria-label': t('stem.geosandbox.challenge_result', 'Challenge result')");
    expect(source).toContain("geoBuildTutorPrompt(mode, shape, dims, construction, sculptRecipe, unitDef.short)");
    expect(source).toContain("if (aiLoading || aiRequestRef.current) return");
    expect(source).toContain("'aria-controls': 'geo-ai-tutor-panel'");
    expect(source).toContain("'aria-busy': aiLoading");
    expect(source).toContain("Analyzing the current geometry scene");
    expect(source).toContain("document.getElementById('geo-ai-tutor-button')");
  });
});
