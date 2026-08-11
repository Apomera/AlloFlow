import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_migration.js');
const publicPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_migration.js');
const catalogPath = path.join(process.cwd(), 'stem_lab', 'stem_lab_module.js');
const publicCatalogPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_lab_module.js');
const compatibilityCatalogPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab_module.js');

describe('Migration Lab 3D flight experience', () => {
  beforeEach(() => resetStemLab());

  it('makes the 3D flight deck the coherent default while preserving the broad lab icon', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const catalog = fs.readFileSync(catalogPath, 'utf8');
    expect(source).toContain("icon: '\\uD83E\\uDDED'");
    expect(catalog).toContain("{ id: 'migration', icon: '\\uD83E\\uDDED'");
    expect(catalog).not.toContain("{ id: 'migration', icon: '" + String.fromCodePoint(0x1F98B) + "'");
    expect(source).toContain("var tab = d.tab || 'flight3d'");
    expect(source).toContain("{ id: 'flight3d', label: '3D Flight'");
    expect(source).toContain("'data-migration-3d-flight': 'true'");
  });

  it('renders species, formation, wind, season, camera, pause, and fullscreen controls', () => {
    loadTool('stem_lab/stem_tool_migration.js', 'migration');
    const html = renderTool('migration', {});
    expect(html).toContain('data-migration-3d-flight="true"');
    expect(html).toContain('3D migration focus species');
    expect(html).toContain('3D migration flight pattern');
    expect(html).toContain('Along-route wind');
    expect(html).toContain('Season and direction');
    expect(html).toContain('Chase');
    expect(html).toContain('Aerial');
    expect(html).toContain('Side');
    expect(html).toContain('Pause flight');
    expect(html).toContain('Fullscreen');
  });

  it('implements a real Monarch swarm model and explains its multigenerational relay', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("species.id === 'monarch'");
    expect(source).toContain("return 'swarm'");
    expect(source).toContain("'data-monarch-simulation': species.id === 'monarch' ? 'active' : 'available'");
    expect(source).toContain('Monarch relay migration:');
    expect(source).toContain('Spring return unfolds across multiple generations');
    expect(source).toContain('createMigrationFlyer(THREE, species, fi)');
  });

  it('uses the shared 3D loader with visible fallback, responsive resize, and teardown', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("window.StemLab.ensureThree({");
    expect(source).toContain("new THREE.WebGLRenderer({");
    expect(source).toContain("engine.resizeObserver = new ResizeObserver(engine.resizeHandler)");
    expect(source).toContain("renderer.domElement.addEventListener('webglcontextlost'");
    expect(source).toContain('destroyMigrationFlightEngine();');
    expect(source).toContain('The shared 3D engine is unavailable');
    expect(source).toContain('The V-Formation and Routes tabs remain fully usable');
  });

  it('provides keyboard camera and pause commands plus an accessible scene summary', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("if (event.key === '1')");
    expect(source).toContain("else if (event.key === '2')");
    expect(source).toContain("else if (event.key === '3')");
    expect(source).toContain("else if (event.key === ' ')");
    expect(source).toContain("'aria-label': stageLabel");
    expect(source).toContain("role: 'status', 'aria-live': 'polite'");
    expect(source).toContain('.migration-flight-stage:focus-visible');
    expect(source).toContain("window.__alloStemFS(deck)");
    expect(source).toContain('.migration-flight-deck[data-allo-fullscreen-active="true"]');
  });

  it('keeps source and deploy mirrors byte-identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
    expect(fs.readFileSync(catalogPath, 'utf8')).toBe(fs.readFileSync(publicCatalogPath, 'utf8'));
    expect(fs.readFileSync(catalogPath, 'utf8')).toBe(fs.readFileSync(compatibilityCatalogPath, 'utf8'));
  });
});
