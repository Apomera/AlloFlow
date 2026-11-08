import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Lane sc16: "Why survey a reef?", three Reasons for hope and three What helps reefs cards show a
// still of the dive reef (rendered offline from the tool's own 3D files) over their drawn scene.
// The drawing stays underneath as the fallback, and the contrast theme gets no picture at all.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const SRC = fs.readFileSync(TOOL, 'utf8');
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
async function mount(seed, theme) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [toolData, setToolData] = React.useState({ coralReef: seed });
    return cfg.render({ React, toolData, setToolData, theme, t: (k, f) => f || k, announceToSR() {} });
  }
  mounted.push({ host, root });
  await React.act(async () => root.render(React.createElement(Shell)));
  return host;
}
const HUB = { why: [640, 356], regrow: [440, 200], fish: [440, 200], turtle: [440, 200] };
const HELP = { 'card-garden': [720, 300], 'card-reserves': [720, 300], 'card-structures': [720, 300] };
// These read better as drawings (faint frames on sand; the thermometer carries the card), so they keep them.
const DRAWN = { hub: ['stars', 'calm'], help: ['card-stars'] };
function expectDrawnOnly(host, ids) {
  ids.forEach((id) => {
    const art = host.querySelector('[data-pg-art="' + id + '"]');
    expect(!!art, id).toBe(true);
    expect(art.querySelector('img'), id + ' has no picture').toBe(null);
    expect(art.hasAttribute('data-sc16'), id).toBe(false);
    expect(art.children.length, id).toBe(1);
    expect(art.firstElementChild.tagName.toLowerCase(), id).toBe('svg');
  });
}
const css = (host) => [...host.querySelectorAll('style')].map((s) => s.textContent).join('\n');

function checkPictures(host, want) {
  Object.keys(want).forEach((id) => {
    const art = host.querySelector('[data-pg-art="' + id + '"]');
    expect(!!art, id).toBe(true);
    expect(art.getAttribute('aria-hidden'), id).toBe('true');
    // The drawing comes first and stays, the picture is laid over it.
    expect(art.firstElementChild.tagName.toLowerCase(), id).toBe('svg');
    const img = art.querySelector('img.sc16-pic');
    expect(!!img, id + ' picture').toBe(true);
    const [w, ht] = want[id];
    expect(img.getAttribute('alt'), id).toBe('');
    expect(img.getAttribute('width'), id).toBe(String(w));
    expect(img.getAttribute('height'), id).toBe(String(ht));
    expect(img.getAttribute('loading'), id).toBe('lazy');
    expect(img.getAttribute('decoding'), id).toBe('async');
    expect(img.getAttribute('data-sc16-pic'), id).toBe('wait');
    const one = 'assets/coralreef/scene_' + id + '_' + w + '.webp', two = 'assets/coralreef/scene_' + id + '_' + (w * 2) + '.webp';
    expect(img.getAttribute('src').endsWith(one), id + ' src').toBe(true);
    const set = img.getAttribute('srcset') || '';
    expect(set.includes(one + ' ' + w + 'w') && set.includes(two + ' ' + (w * 2) + 'w'), id + ' srcset').toBe(true);
    expect((img.getAttribute('sizes') || '').length > 0, id + ' sizes').toBe(true);
  });
}

describe('sc16 scene pictures', () => {
  for (const theme of ['light', 'dark']) {
    it('lays a picture with srcset and fixed size over the Start page scenes in the ' + theme + ' theme', async () => {
      const host = await mount({ section: 'hub' }, theme);
      checkPictures(host, HUB);
      expect(host.querySelectorAll('img.sc16-pic').length).toBe(4);
      expectDrawnOnly(host, DRAWN.hub);
      expect(css(host).includes('[data-coralreef-root][data-theme=contrast] .sc16-pic{display:none}')).toBe(true);
    });
  }

  it('gives pictures only to the help cards the dive can show, never to a card that draws numbers', async () => {
    const host = await mount({ section: 'science', sciTopic: 'help' }, 'light');
    checkPictures(host, HELP);
    const got = [...host.querySelectorAll('img.sc16-pic')].map((i) => i.closest('[data-pg-art]').getAttribute('data-pg-art')).sort();
    expect(got).toEqual(Object.keys(HELP).sort());
    expectDrawnOnly(host, DRAWN.help);
    ['card-acid', 'card-grazers', 'card-bleaching', 'card-return', 'card-symbiosis', 'card-larvae', 'card-biorock', 'card-water'].forEach((id) => {
      const art = host.querySelector('[data-pg-art="' + id + '"]');
      expect(!!art && !art.querySelector('img'), id).toBe(true);
    });
  });

  it('fades a picture in once it loads', async () => {
    const host = await mount({ section: 'hub' }, 'light');
    const img = host.querySelector('[data-pg-art="why"] img.sc16-pic');
    await React.act(async () => { img.dispatchEvent(new Event('load')); });
    expect(host.querySelector('[data-pg-art="why"] img.sc16-pic').getAttribute('data-sc16-pic')).toBe('ok');
    expect(css(host).includes('[data-coralreef-root] .pg-art>.sc16-pic[data-sc16-pic=ok]{opacity:1}')).toBe(true);
    expect(css(host).includes('@media(prefers-reduced-motion:reduce){[data-coralreef-root] .pg-art>.sc16-pic{transition:none}}')).toBe(true);
  });

  it('falls back to the drawing alone when a picture cannot load', async () => {
    const host = await mount({ section: 'hub' }, 'dark');
    const art = () => host.querySelector('[data-pg-art="turtle"]');
    await React.act(async () => { art().querySelector('img').dispatchEvent(new Event('error')); });
    expect(art().querySelector('img')).toBe(null);
    expect(art().children.length).toBe(1);
    expect(art().firstElementChild.tagName.toLowerCase()).toBe('svg');
    // The others keep theirs.
    expect(host.querySelectorAll('img.sc16-pic').length).toBe(3);
  });

  it('leaves the contrast theme as it was: no picture, nothing downloaded', async () => {
    for (const seed of [{ section: 'hub' }, { section: 'science', sciTopic: 'help' }]) {
      const host = await mount(seed, 'contrast');
      expect(host.querySelectorAll('[data-pg-art]').length > 0, seed.section).toBe(true);
      expect(host.querySelector('[data-pg-art] img, img.sc16-pic, [data-sc16]'), seed.section).toBe(null);
      host.querySelectorAll('[data-pg-art]').forEach((a) => {
        if (a.tagName.toLowerCase() === 'span' && a.classList.contains('pg-art')) expect(a.children.length).toBe(1);
      });
    }
  });

  it('adds no strings', () => {
    expect(/__alloT\('stem\.coralreef\.sc16_/.test(SRC)).toBe(false);
  });
});
