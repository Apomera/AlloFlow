import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import path from 'node:path';

// Lane hr15: the Start page hero shows a still of the dive reef (rendered offline from the tool's
// own 3D files) over the old drawn vista. The drawn vista stays as the fallback, and the contrast
// theme keeps its plain black hero with no picture at all.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let loadTool, resetStemLab, React, ReactDOMClient;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, React, ReactDOMClient } = mod);
  resetStemLab(); loadTool(TOOL, 'coralReef');
});

const mounted = [];
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
});
async function mount(theme) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [toolData, setToolData] = React.useState({ coralReef: { section: 'hub' } });
    return cfg.render({ React, toolData, setToolData, theme, t: (k, f) => f || k, announceToSR() {} });
  }
  mounted.push({ host, root });
  await React.act(async () => root.render(React.createElement(Shell)));
  return host;
}
function hero(host) {
  const h = host.querySelector('section.cr-hero[aria-labelledby="cr-welcome-title"]');
  expect(!!h).toBe(true);
  return h;
}

describe('hr15 Start page hero picture', () => {
  for (const theme of ['light', 'dark']) {
    it('shows the reef picture with srcset, sizes and fixed dimensions in the ' + theme + ' theme', async () => {
      const h = hero(await mount(theme));
      const pic = h.querySelector('picture.hr15-pic'), img = pic && pic.querySelector('img'), src = pic && pic.querySelector('source');
      expect(!!img).toBe(true);
      expect(pic.getAttribute('aria-hidden')).toBe('true');
      expect(img.getAttribute('alt')).toBe('');
      expect(img.getAttribute('width')).toBe('2400');
      expect(img.getAttribute('height')).toBe('1040');
      expect(img.getAttribute('decoding')).toBe('async');
      expect(img.getAttribute('loading')).toBe(null);
      expect(/assets\/coralreef\/reef_hero_1200\.webp$/.test(img.getAttribute('src'))).toBe(true);
      const set = img.getAttribute('srcset') || '';
      expect(/reef_hero_1200\.webp 1200w/.test(set) && /reef_hero_2400\.webp 2400w/.test(set)).toBe(true);
      expect((img.getAttribute('sizes') || '').length > 0).toBe(true);
      expect(src.getAttribute('media')).toBe('(max-width: 640px)');
      expect(/reef_hero_phone\.webp 840w$/.test(src.getAttribute('srcset'))).toBe(true);
      expect(src.getAttribute('width')).toBe('840');
      expect(src.getAttribute('height')).toBe('1400');
      // The drawn vista stays underneath while the picture loads.
      expect(!!h.querySelector('svg.cr-vista')).toBe(true);
      expect(pic.getAttribute('data-hr15-pic')).toBe('wait');
      // The words still come after the art, so reading order is unchanged.
      expect(h.lastElementChild.className).toBe('cr-hero-copy');
    });
  }

  it('fades the picture in once it loads', async () => {
    const h = hero(await mount('dark'));
    const img = h.querySelector('picture.hr15-pic img');
    await React.act(async () => { img.dispatchEvent(new Event('load')); });
    expect(h.querySelector('picture.hr15-pic').getAttribute('data-hr15-pic')).toBe('ok');
  });

  it('falls back to the drawn vista when the picture cannot load', async () => {
    const h = hero(await mount('light'));
    const img = h.querySelector('picture.hr15-pic img');
    await React.act(async () => { img.dispatchEvent(new Event('error')); });
    expect(h.querySelector('picture, img')).toBe(null);
    const svg = h.querySelector('svg.cr-vista');
    expect(!!svg).toBe(true);
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(h.firstElementChild).toBe(svg);
    // The tablet heading wrap still applies to the drawn vista.
    const css = Array.from(h.querySelectorAll('style')).map((s) => s.textContent).join('\n');
    expect(css.includes('@media(min-width:641px){[data-coralreef-root]:not([data-theme=contrast]) .cr-hero #cr-welcome-title{max-width:11.5em}}')).toBe(true);
  });

  it('wraps the tablet heading so it stays on the dark band (base: 2.5:1 over the water at 768 px)', async () => {
    const h = hero(await mount('dark'));
    const css = Array.from(h.querySelectorAll('style')).map((s) => s.textContent).join('\n');
    expect(css.includes('@media(min-width:641px){[data-coralreef-root]:not([data-theme=contrast]) .cr-hero #cr-welcome-title{max-width:11.5em}}')).toBe(true);
    expect(h.querySelector('#cr-welcome-title').tagName).toBe('H3');
  });

  it('leaves the contrast theme hero as it was: no picture, no download', async () => {
    const h = hero(await mount('contrast'));
    expect(h.querySelector('picture, img, source')).toBe(null);
    expect(Array.from(h.children).map((c) => c.tagName.toLowerCase() + '.' + (c.getAttribute('class') || ''))).toEqual(['svg.cr-vista', 'div.cr-hero-copy']);
  });

  it('hides the picture in contrast and forced colours, and mirrors it right to left', async () => {
    const h = hero(await mount('dark'));
    const css = Array.from(h.querySelectorAll('style')).map((s) => s.textContent).join('\n');
    expect(css.includes('[data-coralreef-root][data-theme=contrast] .hr15-pic{display:none}')).toBe(true);
    expect(css.includes('@media(forced-colors:active){[data-coralreef-root] .hr15-pic{display:none}}')).toBe(true);
    expect(css.includes('[dir=rtl] [data-coralreef-root] .hr15-pic img{transform:scaleX(-1)}')).toBe(true);
    expect(css.includes('@media(prefers-reduced-motion:reduce){[data-coralreef-root] .hr15-pic img{transition:none}}')).toBe(true);
  });
});
