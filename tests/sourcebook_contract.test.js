import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const pluginPath = path.join(root, 'stem_lab', 'stem_tool_sourcebook.js');
const pluginSource = fs.readFileSync(pluginPath, 'utf8');

function loadSourcebook() {
  const sandbox = {
    console,
    window: {
      StemLab: {
        _registry: {},
        _order: [],
        registerTool(id, config) {
          config.id = id;
          this._registry[id] = config;
          this._order.push(id);
        }
      }
    }
  };
  vm.runInNewContext(pluginSource, sandbox, { filename: pluginPath });
  return sandbox.window;
}

describe('Sourcebook initial feature contract', () => {
  it('registers as a standalone creative tool with no collage framing', () => {
    const window = loadSourcebook();
    expect(window.StemLab._registry.sourcebook).toBeTruthy();
    expect(window.StemLab._registry.sourcebook.category).toBe('creative');
    expect(pluginSource.toLowerCase()).not.toContain('collage');
  });

  it('allows only explicit reusable-rights classes in built-in results', () => {
    const window = loadSourcebook();
    const materials = Array.from(window.SourcebookProviders.materials);
    expect(materials.length).toBeGreaterThanOrEqual(10);
    expect(new Set(materials.map((item) => item.rightsType))).toEqual(new Set(['pd', 'cc0']));
    for (const item of materials) {
      expect(['pd', 'cc0', 'ccby']).toContain(item.rightsType);
      expect(item.license).toMatch(/public domain|cc0/i);
      expect(item.rightsNote.length).toBeGreaterThan(40);
      expect(item.sourceUrl).toMatch(/^https:\/\//);
      expect(item.imageUrl).toMatch(/^https:\/\//);
      expect(item.downloadUrl).toMatch(/^https:\/\//);
    }
    expect(pluginSource).not.toContain("rightsType: 'nkr'");
  });

  it('matches representative natural-language material requests', () => {
    const window = loadSourcebook();
    const search = window.SourcebookProviders.searchCurated;
    expect(Array.from(search('quiet wood grain for a handout', 'All', 'All')).some((item) => item.kind === 'Textures')).toBe(true);
    expect(Array.from(search('historic blueprint linework', 'All', 'All')).some((item) => item.kind === 'Blueprints')).toBe(true);
    expect(Array.from(search('brainwaves and neuron diagrams', 'All', 'All')).some((item) => item.kind === 'Science')).toBe(true);
    expect(Array.from(search('contour map', 'Maps', 'All')).every((item) => item.kind === 'Maps')).toBe(true);
  });

  it('exports a portable provenance-rich palette for future consumers', () => {
    const window = loadSourcebook();
    const materials = Array.from(window.SourcebookProviders.materials);
    const ids = materials.slice(0, 2).map((item) => item.id);
    const manifest = window.SourcebookProviders.buildPalette(ids, { [ids[0]]: { mode: 'tile', tile: 120 } }, 'Lesson textures');
    expect(manifest.schema).toBe('org.owlflow.sourcebook-palette');
    expect(manifest.version).toBe(1);
    expect(manifest.assets).toHaveLength(2);
    expect(manifest.assets[0].preparation.mode).toBe('tile');
    expect(manifest.assets.every((asset) => asset.sourceUrl && asset.license && asset.rightsNote)).toBe(true);
  });

  it('is reachable from the loader, catalog, fallback renderer, and build mirror', () => {
    const appSource = fs.readFileSync(path.join(root, 'AlloFlowANTI.txt'), 'utf8');
    const hubSource = fs.readFileSync(path.join(root, 'stem_lab', 'stem_lab_module.js'), 'utf8');
    const buildSource = fs.readFileSync(path.join(root, 'build.js'), 'utf8');
    expect(appSource).toContain("'stem_lab/stem_tool_sourcebook.js'");
    expect(appSource).toContain("'sourcebook': 'sourcebook'");
    expect(hubSource).toContain("id: 'sourcebook'");
    expect(hubSource).toContain('sourcebook: true');
    expect(buildSource).toContain("'stem_lab/stem_tool_sourcebook.js'");
  });
});
