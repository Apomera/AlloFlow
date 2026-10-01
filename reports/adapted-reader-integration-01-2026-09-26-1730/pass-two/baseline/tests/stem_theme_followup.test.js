import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const read = (path) => readFileSync(path, 'utf8');

describe('STEM theme follow-up contract', () => {
  it('uses an executable retired-contract detector', () => {
    const retired = /\bctx\.darkMode\b/;
    expect(retired.test('ctx.darkMode')).toBe(true);
    expect(retired.test('ctx.isDark')).toBe(false);
  });

  it('keeps SSR, DOM fallback, and the shell marker on one theme contract', () => {
    const host = read('stem_lab/stem_lab_module.js');
    expect(host).toContain("if (typeof document === 'undefined') return 'light'");
    expect(host).toContain("if (!_stemTheme) _stemTheme = 'light'");
    expect(host).toContain("'data-stem-theme'");
    expect(host).toContain('allo-stem-theme-contract-css');
    expect(host).toContain('@media (forced-colors:active)');
  });

  it('wires Plate Tectonics host contrast through both interactive canvases', () => {
    const source = read('stem_lab/stem_tool_platetectonics.js');
    expect(source).toContain('darkMode: !!ctx.isDark || !!ctx.isContrast');
    expect(source).toContain('isContrastRef.current');
    expect(source).toContain('bg.addColorStop(0, palette.bg)');
    expect(source).toContain('ctx.pal || null');
    expect(source).toContain("'data-plate-theme': isContrast ? 'contrast'");
  });

  it('makes Solar System follow the host while preserving a standalone fallback', () => {
    const source = read('stem_lab/stem_tool_solarsystem.js');
    expect(source).toContain('var isContrast = !!ctx.isContrast');
    expect(source).toContain('d.isDark != null ? !!d.isDark : !!ctx.isDark');
    expect(source).toContain('Theme follows AlloFlow');
    expect(source).not.toContain("isDark ? 'text-slate-200' : 'text-slate-200'");
  });

  it.each(['stem_lab/stem_tool_beehive.js', 'stem_lab/stem_tool_echotrainer.js'])('%s routes contrast through its dark structural palette', (file) => {
    const source = read(file);
    expect(source).toContain('isContrast');
    expect(source).toMatch(/isDark\s*=.*ctx\.isDark.*isContrast/);
  });
});

describe('companion live theme synchronization', () => {
  const launchers = ['alphafold', 'circuitshelf', 'datalab', 'moleculeshelf', 'simshelf', 'timeline', 'zoomgallery'];
  const pages = ['alphafold_explorer/alphafold_explorer.html', 'circuit_shelf/circuit_shelf.html', 'data_lab/data_lab.html', 'molecule_shelf/molecule_shelf.html', 'sim_shelf/sim_shelf.html', 'timeline_studio/timeline_studio.html', 'zoom_gallery/zoom_gallery.html'];

  it.each(launchers)('%s sends live host-theme changes to its open popup', (name) => {
    const source = read('stem_lab/stem_tool_' + name + '.js');
    expect(source).toContain("type: 'alloflow-theme-change'");
    expect(source).toContain('[ctx.theme]');
  });

  it.each(pages)('%s validates the opener and applies live theme messages', (file) => {
    const html = read(file);
    expect(html).toContain('function applyAlloFlowTheme(value)');
    expect(html).toContain('event.source !== window.opener');
    expect(html).toContain("data.type !== 'alloflow-theme-change'");
    expect(html).toContain('applyAlloFlowTheme(data.theme)');
  });
});
describe('companion live theme behavior', () => {
  const pages = [
    'alphafold_explorer/alphafold_explorer.html',
    'circuit_shelf/circuit_shelf.html',
    'data_lab/data_lab.html',
    'molecule_shelf/molecule_shelf.html',
    'sim_shelf/sim_shelf.html',
    'timeline_studio/timeline_studio.html',
    'zoom_gallery/zoom_gallery.html',
  ];

  it.each(pages)('%s applies an opener-sent theme without reloading', (file) => {
    const html = read(file);
    const match = html.match(/<script>\s*(\(function \(\) \{\s*function applyAlloFlowTheme[\s\S]*?\}\)\(\);)\s*<\/script>/);
    expect(match).not.toBeNull();
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
      url: 'https://example.test/companion?theme=light',
      runScripts: 'outside-only',
    });
    const opener = {};
    Object.defineProperty(dom.window, 'opener', { configurable: true, value: opener });
    dom.window.eval(match[1]);
    expect(dom.window.document.documentElement.dataset.theme).toBe('light');
    dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
      data: { type: 'alloflow-theme-change', theme: 'contrast' },
      source: opener,
    }));
    expect(dom.window.document.documentElement.dataset.theme).toBe('contrast');
    expect(dom.window.document.documentElement.style.colorScheme).toBe('dark');
    dom.window.close();
  });
});