import { beforeEach, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const read = (path) => readFileSync(path, 'utf8');

describe('STEM theme contract', () => {
  it('uses the host isDark/isContrast contract instead of the retired darkMode name', () => {
    const offenders = readdirSync('stem_lab')
      .filter((name) => /^stem_tool_.*.js$/.test(name))
      .filter((name) => { const source = read('stem_lab/' + name); return source.includes('ctx.darkMode') || source.includes('const isDark = !!(props && props.darkMode)'); });
    expect(offenders).toEqual([]);
  }, 30000);

  it("keeps native tool theme branches on the canonical contract and covers audited contrast tokens", () => {
    const molecule = read("stem_lab/stem_tool_molecule.js");
    expect(molecule).toContain("const isDark = !!ctx.isDark || !!ctx.isContrast;");
    expect(molecule).not.toContain("props.darkMode");
    expect(read("stem_lab/stem_tool_galaxy.js")).toContain("background: galaxyScienceOverlay ? '#334155'");
    expect(read("stem_lab/stem_tool_heatlab.js")).toContain("pillTextColor(accent)");
    const lifeSkills = read("stem_lab/stem_tool_lifeskills.js");
    expect(lifeSkills).toContain("lab.id === 'safety' ? '#b91c1c'");
    expect(lifeSkills).toContain("lab.id === 'kitchen' ? '#c2410c'");
  });

  it("keeps Molecule and Rock Cycle card surfaces on remappable utility tokens", () => {
    const molecule = read("stem_lab/stem_tool_molecule.js");
    const rocks = read("stem_lab/stem_tool_rocks.js");
    // The Mineral Workbench deliberately uses bg-white/80 as a translucent
    // layer; its dark state is covered by the real-browser WCAG suite. Keep
    // this static guard scoped to the legacy tokens that actually bypassed
    // theme remapping instead of flagging every translucent white surface.
    ["bg-white/60", "bg-cyan-50/70", "bg-sky-50/70", "bg-orange-100/50"].forEach((token) => {
      expect(molecule + rocks).not.toContain(token);
    });
    expect(molecule).toContain("bg-cyan-50");
    expect(rocks).toContain("bg-sky-50");
  });

  it('pins audited dark/contrast treatments and their deployment mirrors', () => {
    const audited = {
      'stem_tool_molecule.js': ["darkTone: '#5eead4'", "isContrast ? '#ffff00'"],
      'stem_tool_physics.js': ["color: '#ffff00', bg: '#000000'", "optimal: { color: '#6ee7b7'"],
      'stem_tool_wave.js': ['var mythTheme = isContrast', 'wave-myths-panel'],
      'stem_tool_anatomy.js': ['.theme-dark .anatomy-tool-shell .anatomy-progress-row', 'button.bg-green-50'],
    };
    Object.entries(audited).forEach(([file, tokens]) => {
      const source = read('stem_lab/' + file);
      expect(read('desktop/web-app/public/stem_lab/' + file), file + ' mirror').toBe(source);
      tokens.forEach((token) => expect(source, file + ' missing ' + token).toContain(token));
    });
  });

  it('keeps the host theme context explicit', () => {
    const host = read('stem_lab/stem_lab_module.js');
    expect(host).toContain('isDark: isDark');
    expect(host).toContain('isContrast: isContrast');
    expect(host).toContain('theme: _stemTheme');
  });

  it('resolves the theme before registering theme-dependent effects', () => {
    const host = read('stem_lab/stem_lab_module.js');
    const themeResolve = host.indexOf('var _stemTheme =');
    const darkEffect = host.indexOf("var id = 'stem-theme-overrides'");
    const lightEffect = host.indexOf("var id = 'stem-contrast-fix'");
    expect(themeResolve).toBeGreaterThanOrEqual(0);
    expect(themeResolve).toBeLessThan(darkEffect);
    expect(themeResolve).toBeLessThan(lightEffect);
    expect(host.match(/}, \[isDark, isContrast\]\);/g)).toHaveLength(2);
  });

  it('remaps the stone card palette in dark and contrast themes', () => {
    const host = read('stem_lab/stem_lab_module.js');
    const effectStart = host.indexOf("var id = 'stem-theme-overrides'");
    const darkStart = host.indexOf('if (isDark) {', effectStart);
    const contrastStart = host.indexOf('} else if (isContrast) {', darkStart);
    const effectEnd = host.indexOf('document.head.appendChild(s);', contrastStart);
    const darkBlock = host.slice(darkStart, contrastStart);
    const contrastBlock = host.slice(contrastStart, effectEnd);
    ['.bg-stone-50', '.text-stone-800', '.text-stone-600', '.border-stone-200'].forEach((token) => {
      expect(darkBlock).toContain(token);
      expect(contrastBlock).toContain(token);
    });
    const opacitySelectors = ['[class~="bg-white/80"]', '[class~="bg-cyan-50/70"]', '[class~="bg-indigo-50/70"]'];
    opacitySelectors.forEach((selector) => {
      expect(darkBlock).toContain(selector);
      expect(contrastBlock).toContain(selector);
    });
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

describe('dispersed-color native shells', () => {
  it.each([
    ['stem_lab/stem_tool_bakingscience.js', 'data-baking-theme'],
    ['stem_lab/stem_tool_coordgrid.js', 'data-coordinate-theme'],
    ['stem_lab/stem_tool_physics.js', 'data-physics-theme'],
    ['stem_lab/stem_tool_algebraCAS.js', 'data-algebra-theme'],
    ['stem_lab/stem_tool_lumen.js', 'data-lumen-theme']
  ])('%s exposes an explicit host-theme shell', (file, marker) => {
    const source = read(file);
    expect(source).toContain('var isContrast = !!ctx.isContrast');
    expect(source).toContain('var isDark = !!ctx.isDark');
    expect(source).toContain(marker);
    expect(source).toContain("'#000000'");
    expect(source).toContain("'#fbbf24'");
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
