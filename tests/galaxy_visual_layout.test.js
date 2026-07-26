import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const GALAXY_PATHS = [
  'stem_lab/stem_tool_galaxy.js',
  'desktop/web-app/public/stem_lab/stem_tool_galaxy.js',
];

describe('galaxy visual layout', () => {
  it.each(GALAXY_PATHS)('%s uses the canvas-first responsive workspace', (filePath) => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('className: "max-w-7xl mx-auto animate-in fade-in duration-200"');
    expect(source).toContain('xl:grid-cols-[minmax(0,1fr)_360px]');
    expect(source).toContain("height: 'clamp(360px, 58vw, 620px)'");
    expect(source).toContain("var galaxyControlPanel = d.galaxyControlPanel || 'view';");
    expect(source).toContain('Galaxy control groups');
    expect(source).toContain("{ key: 'view', icon: '◉', label: 'View' }");
    expect(source).toContain('Explore the science behind the simulation');

    const workspace = source.indexOf('Canvas-first workspace');
    const infoCard = source.indexOf('Galaxy type info card');
    expect(workspace).toBeGreaterThan(0);
    expect(workspace).toBeLessThan(infoCard);
  });

  it.each(GALAXY_PATHS)('%s keeps navigation and Star Life responsive', (filePath) => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('flex flex-nowrap gap-1 ml-auto');
    expect(source).toContain('overflow-x-auto');
    expect(source).toContain('min-h-[44px]');
    expect(source).toContain('grid grid-cols-1 lg:grid-cols-[minmax(280px,38%)_minmax(0,1fr)]');
    expect(source).toContain('order-1 lg:order-2 lg:sticky');
    expect(source).toContain('order-2 lg:order-1');
    expect(source).not.toContain('style: { display: "flex", gap: "16px", alignItems: "stretch" }');
    expect(source).not.toContain('text-[10px]');
  });

  it.each(GALAXY_PATHS)('%s uses the simplified simulation HUD', (filePath) => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('Compact spectral legend');
    expect(source).toContain('O B A F G K M');
    expect(source).toContain('Galaxy camera controls');
    expect(source).toContain('data-galaxy-orientation');
    expect(source).toContain('data-galaxy-status');
    expect(source).toContain('selectionMarker');
    expect(source).toContain('getPinchDistance');
    expect(source).toContain("touchAction: 'none'");
    expect(source).toContain('Drag to orbit · scroll or pinch to zoom · select a star');
    expect(source).not.toContain('left: \'10%\', right: \'10%\', top: \'50%\'');
  });

  it.each(GALAXY_PATHS)('%s includes cinematic depth and adaptive detail systems', (filePath) => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain("var galaxyQuality = d.galaxyQuality || 'auto';");
    expect(source).toContain('data-resolved-quality');
    expect(source).toContain('volumetricAtmosphere');
    expect(source).toContain('satellitesAndTidalStreams');
    expect(source).toContain('starBirthSprites');
    expect(source).toContain('diffraction');
    expect(source).toContain('data-galaxy-observe-transition');
    expect(source).toContain('Grand Tour');
    expect(source).toContain('Rendering detail');
    expect(source).toContain('prefersReducedMotion');
    expect(source).toContain('targetExposure');
    expect(source).toContain('aLuminosity');
    expect(source).toContain('airyRing');
    expect(source).toContain('microStarCount');
    expect(source).toContain('textureResolutionScale');
    expect(source).toContain('tuneGalaxyTexture');
    expect(source).toContain('galaxyTextureAnisotropy');
    expect(source).toContain('data-render-resolution');
    expect(source).toContain('bloomStrength');
    expect(source).toContain('globularClusterHalo');
    expect(source).toContain('dustFeatherMats');
    expect(source).toContain('ionizedShells');
    expect(source).toContain('satelliteCoreSprites');
    expect(source).toContain('openClusterStarCount');
    expect(source).toContain('thickDiskCount');
    expect(source).toContain('supernovaRemnantArcs');
    expect(source).toContain('populationTarget');
    expect(source).toContain('fineStarTex');
    expect(source).toContain('molecularCloudFilaments');
    expect(source).toContain('molecularCloudCount');
    expect(source).toContain('embeddedProtostarKnots');
    expect(source).toContain('protostarCount');
    expect(source).toContain('foregroundParallaxDust');
    expect(source).toContain('cloudTarget');
    expect(source).toContain('_setDetailLayer');
  });
});