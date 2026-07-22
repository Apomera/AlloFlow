import { beforeEach, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const read = (path) => readFileSync(path, 'utf8');

describe('STEM theme contract', () => {
  it('uses the host isDark/isContrast contract instead of the retired darkMode name', () => {
    const offenders = readdirSync('stem_lab')
      .filter((name) => /^stem_tool_.*.js$/.test(name))
      .filter((name) => /ctx.darkMode/.test(read('stem_lab/' + name)));
    expect(offenders).toEqual([]);
  });

  it('keeps the host theme context explicit', () => {
    const host = read('stem_lab/stem_lab_module.js');
    expect(host).toContain('isDark: isDark');
    expect(host).toContain('isContrast: isContrast');
    expect(host).toContain('theme: _stemTheme');
  });
});

describe('confirmed native-tool contrast palettes', () => {
  beforeEach(() => resetStemLab());

  it('renders Arithmetic Studio with a black, white, and amber contrast palette', () => {
    loadTool('stem_lab/stem_tool_arithmetic.js', 'arithmeticStudio');
    const html = renderTool('arithmeticStudio', {
      _arithmeticStudio: { tab: 'learn', operation: 'add', a: 58, b: 27 }
    }, { isDark: false, isContrast: true, theme: 'contrast' });
    expect(html).toContain('background:#000000');
    expect(html).toContain('color:#ffffff');
    expect(html).toContain('border:2px solid #fbbf24');
  });

  it('renders Area & Perimeter with an explicit contrast palette', () => {
    loadTool('stem_lab/stem_tool_areaperimeter.js', 'areaPerimeter');
    const html = renderTool('areaPerimeter', {
      _areaPerimeter: { mode: 'explore', width: 3, height: 2 }
    }, { isDark: false, isContrast: true, theme: 'contrast' });
    expect(html).toContain('background:#000000');
    expect(html).toContain('color:#ffffff');
    expect(html).toContain('border-color:#fbbf24');
  });

  it('marks Geology Explorer contrast output and uses its dark structural branch', () => {
    loadTool('stem_lab/stem_tool_geologyexplorer.js', 'geologyExplorer');
    const html = renderTool('geologyExplorer', { geologyExplorer: {} }, {
      isDark: false, isContrast: true, theme: 'contrast'
    });
    expect(html).toContain('data-geology-theme="contrast"');
    expect(html).toContain('background:#000000');
    expect(html).toContain('color:#ffffff');
  });
});

describe('centralized native palettes', () => {
  it.each([
    'stem_lab/stem_tool_autorepair.js',
    'stem_lab/stem_tool_renewables.js',
    'stem_lab/stem_tool_swimlab.js'
  ])('%s defines light, dark, and contrast branches', (file) => {
    const source = read(file);
    expect(source).toContain('var isContrast = !!ctx.isContrast');
    expect(source).toContain('var isDark = !!ctx.isDark');
    expect(source).toContain("bg: '#000000'");
    expect(source).toMatch(/}\s*:\s*isDark\s*\?\s*{/);
  });
});

describe('companion-window theme propagation', () => {
  const launchers = [
    'stem_lab/stem_tool_alphafold.js',
    'stem_lab/stem_tool_circuitshelf.js',
    'stem_lab/stem_tool_datalab.js',
    'stem_lab/stem_tool_moleculeshelf.js',
    'stem_lab/stem_tool_simshelf.js',
    'stem_lab/stem_tool_timeline.js',
    'stem_lab/stem_tool_zoomgallery.js'
  ];
  const pages = [
    'alphafold_explorer/alphafold_explorer.html',
    'circuit_shelf/circuit_shelf.html',
    'data_lab/data_lab.html',
    'molecule_shelf/molecule_shelf.html',
    'sim_shelf/sim_shelf.html',
    'timeline_studio/timeline_studio.html',
    'zoom_gallery/zoom_gallery.html'
  ];

  it.each(launchers)('%s passes the active theme to its companion', (file) => {
    expect(read(file)).toContain("'&theme=' + encodeURIComponent(ctx.theme || 'dark')");
  });

  it.each(pages)('%s initializes light, dark, and contrast color systems', (file) => {
    const html = read(file);
    expect(html).toContain("get('theme')");
    expect(html).toContain('data-theme="light"');
    expect(html).toContain('data-theme="contrast"');
    expect(html).toContain('--bg: #000000');
    expect(html).toContain('@media (forced-colors: active)');
  });
});