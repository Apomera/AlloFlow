import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_geologyexplorer.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_geologyexplorer.js');

beforeEach(() => resetStemLab());

describe('Geology Explorer text accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('does not retain persistent text below ten pixels', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).not.toMatch(/text-\[(?:[0-9])px\]/);
    expect(source).not.toMatch(/fontSize:\s*(?:[0-9](?:\.[0-9]+)?)\b/);
  });

  it('renders Geology Explorer without tiny utility or SVG text', () => {
    loadTool('stem_lab/stem_tool_geologyexplorer.js', 'geologyExplorer');
    const html = renderTool('geologyExplorer', { geologyExplorer: {} });
    expect(html).not.toMatch(/text-\[(?:[0-9])px\]/);
    expect(html).not.toMatch(/font-size="(?:[0-9](?:\.[0-9]+)?)"/);
    expect(html).toContain('text-[10px]');
  });

  it('renders every scene and investigation mode without React key warnings', () => {
    loadTool('stem_lab/stem_tool_geologyexplorer.js', 'geologyExplorer');
    const warnings = [];
    let renderCase = 'setup';
    const originalError = console.error;
    console.error = (...args) => warnings.push(renderCase + ': ' + args.map(String).join(' '));
    try {
      const scenes = ['crust', 'geode', 'subduction', 'ridge', 'deepEarth', 'volcano'];
      const modes = ['explore', 'investigate', 'assess'];
      scenes.forEach((scene) => {
        modes.forEach((mode) => {
          renderCase = scene + '/' + mode;
          renderTool('geologyExplorer', { geologyExplorer: { scene, mode } });
        });
      });
    } finally {
      console.error = originalError;
    }

    expect(warnings.filter((warning) => /unique ["']key["'] prop/i.test(warning))).toEqual([]);
  });
});
