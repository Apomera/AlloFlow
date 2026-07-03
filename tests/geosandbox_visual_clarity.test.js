import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE_FILE = 'stem_lab/stem_tool_geosandbox.js';
const PUBLIC_FILE = 'prismflow-deploy/public/stem_lab/stem_tool_geosandbox.js';

function read(path) {
  return readFileSync(path, 'utf8');
}

describe('Geometry Sandbox visual clarity', () => {
  it('keeps source and public copies aligned', () => {
    expect(read(PUBLIC_FILE)).toBe(read(SOURCE_FILE));
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
});
