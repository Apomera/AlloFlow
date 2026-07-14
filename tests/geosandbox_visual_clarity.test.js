import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE_FILE = 'stem_lab/stem_tool_geosandbox.js';
const PUBLIC_FILE = 'prismflow-deploy/public/stem_lab/stem_tool_geosandbox.js';
const IMMERSIVE_SOURCE_FILE = 'immersive_geometry/immersive_geometry.html';
const IMMERSIVE_PUBLIC_FILE = 'prismflow-deploy/public/immersive_geometry/immersive_geometry.html';

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
});
