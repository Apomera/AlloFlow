import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import path from 'node:path';

// Round 11: what the real app and other languages do to this tool. Bare test pages never showed these.
// A real host needs a real browser, so these pin the tool's side of each fix; the host measurements are in NOTES.md.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let loadTool, resetStemLab, React, ReactDOMClient;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, React, ReactDOMClient } = mod);
  resetStemLab(); loadTool(TOOL, 'coralReef');
});

const mounted = [];
const restore = [];
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  while (restore.length) restore.pop()();
});
const longT = (k, f) => (f ? String(f).replace(/\w+/g, (w) => w + w) : k);
async function mount(seed = {}, { t = (k, f) => f || k, parent = document.body, theme } = {}) {
  const host = document.createElement('div'); parent.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [toolData, setToolData] = React.useState({ coralReef: { section: 'hub', ...seed } });
    return cfg.render({ React, toolData, setToolData, t, theme, announceToSR() {} });
  }
  mounted.push({ host, root });
  await React.act(async () => root.render(React.createElement(Shell)));
  return host;
}
const allCss = (host) => Array.from(host.querySelectorAll('style')).map((s) => s.textContent).join('\n');
function stubRects(fn) {
  const proto = window.Element.prototype, was = proto.getBoundingClientRect;
  proto.getBoundingClientRect = function () { return fn(this) || was.call(this); };
  restore.push(() => { proto.getBoundingClientRect = was; });
}
const rect = (left, width, top = 0, height = 20) => ({ left, right: left + width, width, top, bottom: top + height, height, x: left, y: top });

describe('the app CSS reset does not undo the tool', () => {
  it('gives back heading weight, list bullets and link underlines, weakly', async () => {
    const css = allCss(await mount());
    const has = (s) => css.includes(s);
    expect(has(':where([data-coralreef-root]) :is(h1,h2,h3,h4,h5,h6){font-weight:700}')).toBe(true);
    expect(has(':where([data-coralreef-root]) ul{list-style-type:disc}')).toBe(true);
    expect(has(':where([data-coralreef-root]) ol{list-style-type:decimal}')).toBe(true);
    expect(has(':where([data-coralreef-root]) a{text-decoration-line:underline}')).toBe(true);
  });
  it('keeps those weak rules below every rule the tool wrote itself', async () => {
    const css = allCss(await mount());
    // Lists the tool laid out with no bullets must stay that way: their rule has real specificity.
    expect(css.includes('[data-coralreef-root] .cr-nav ul{display:flex;flex-wrap:wrap;gap:8px;list-style:none')).toBe(true);
    expect(css.includes('[data-coralreef-root] ul{list-style')).toBe(false);
  });
});

describe('dark theme in the host', () => {
  it('turns off the white card the host lays under a tool that paints its own page', async () => {
    const css = allCss(await mount({}, { theme: 'dark' }));
    expect(css.includes('[data-stem-tool-surface="coralReef"]{background:transparent!important;padding:0!important}')).toBe(true);
  });
});

describe('form fields in dark themes', () => {
  it('asks for dark fields, because the host card asks for light ones and the ink here is pale', async () => {
    const host = await mount({}, { theme: 'dark' });
    expect(allCss(host).includes('[data-coralreef-root][data-theme=dark],[data-coralreef-root][data-theme=contrast]{color-scheme:dark}')).toBe(true);
    expect(host.querySelector('[data-coralreef-root]').getAttribute('data-theme')).toBe('dark');
  });
});

describe('high contrast in the host', () => {
  it('gives coloured chips their own ink back from the yellow the host forces', async () => {
    const css = allCss(await mount({}, { theme: 'contrast' }));
    const r = '[data-coralreef-root][data-coralreef-root][data-theme=contrast] ';
    expect(css.includes(r + '.cr-iucn-code{color:#141414!important}')).toBe(true);
    expect(css.includes(r + '.cr-iucn[data-iucn=CR] .cr-iucn-code{color:#fff!important}')).toBe(true);
    expect(css.includes(r + '.crb-cat-hard_coral,' + r + '.crb-cat-hard_coral .crb-pct{color:#ffffff!important}')).toBe(true);
    expect(css.includes(r + '.crb-cat-sand,' + r + '.crb-cat-sand .crb-pct{color:#13212b!important}')).toBe(true);
    expect(css.includes(r + '.srv-dot,' + r + '.sv-log-n{color:#000!important}')).toBe(true);
  });
});

describe('words too long for their box', () => {
  it('break rather than run under a clipped edge', async () => {
    const css = allCss(await mount());
    expect(css.includes('[data-coralreef-root]{overflow-wrap:break-word}')).toBe(true);
    expect(css.includes('@media(max-width:640px){[data-coralreef-root] :is(th,td,caption){overflow-wrap:anywhere}}')).toBe(true);
  });
});

describe('the model rules table', () => {
  it('sends its Where it comes from column through the translator', async () => {
    const seen = {};
    const t = (k, f) => { seen[k] = f; return f || k; };
    const host = await mount({ section: 'model' }, { t });
    const open = Array.from(host.querySelectorAll('details')); open.forEach((d) => { d.open = true; });
    expect(Object.keys(seen).filter((k) => /\.hs11_src_/.test(k)).length).toBe(15);
    expect(seen['stem.coralreef.hs11_src_rubble']).toBe('Komodo, 17 years (Fox et al. 2019)');
  });
});

describe('the three Acropora accounts', () => {
  it('reach the translator, in the plate and in the guide', async () => {
    const seen = {};
    const t = (k, f) => { seen[k] = f; return f || k; };
    await mount({ section: 'guide', guidePictures: true }, { t });
    const keys = Object.keys(seen).filter((k) => /\.hs11_ac_/.test(k));
    expect(keys.length).toBeGreaterThanOrEqual(28);
    expect(seen['stem.coralreef.hs11_ac_humilis_mark']).toBe('Thick, finger-like branches taper toward rounded tips.');
    expect(seen['stem.coralreef.hs11_ac_clathrata_role']).toBe('A reef-building coral whose connected branches form a horizontal shelf.');
  });
  it('show a translated word on the card, not the English', async () => {
    const t = (k, f) => (/\.hs11_ac_humilis_habitat$/.test(k) ? 'PRUEBA-HABITAT' : (f || k));
    const host = await mount({ section: 'guide', guidePictures: true }, { t });
    Array.from(host.querySelectorAll('details')).forEach((d) => { d.open = true; });
    const card = host.querySelector('[data-acropora-species=humilis]');
    if (card) expect(card.textContent.includes('PRUEBA-HABITAT')).toBe(true);
    expect(host.innerHTML.includes('Look on shallow reef flats')).toBe(false);
  });
});

describe('the three Acropora accounts on a page in another language', () => {
  it('mark words English with lang only while they have no translation', async () => {
    const t = (k, f) => (/\.hs11_ac_humilis_habitat$/.test(k) ? 'PRUEBA-HABITAT' : (f || k));
    const host = await mount({ section: 'guide', guidePictures: true }, { t });
    const details = host.querySelector('[data-acropora-shelf] details');
    await React.act(async () => { details.open = true; details.dispatchEvent(new Event('toggle')); });
    const dds = Array.from(host.querySelectorAll('[data-acropora-species=humilis] dd'));
    const done = dds.filter((d) => d.textContent === 'PRUEBA-HABITAT');
    expect(done.length).toBe(1);
    expect(done[0].hasAttribute('lang')).toBe(false);
    expect(dds.filter((d) => d.getAttribute('lang') === 'en').length).toBeGreaterThanOrEqual(1);
  });
});

describe('the heat chart title', () => {
  it('stays on one line when a translation is long, because a second line lands on the plot', async () => {
    const long = 'Palabra '.repeat(9).trim();
    const t = (k, f) => (/\.sciLab_fig_dhw$/.test(k) ? long : (f || k));
    const host = await mount({ section: 'science' }, { t });
    const title = Array.from(host.querySelectorAll('svg text')).filter((x) => x.textContent.startsWith('Palabra'))[0];
    expect(!!title).toBe(true);
    expect(title.querySelectorAll('tspan').length).toBe(1);
  });
});

describe('the Species guide jump bar on a phone', () => {
  it('seats itself again when the host changes its workspace padding after the page opens', async () => {
    const box = document.createElement('div');
    box.style.overflowY = 'auto'; box.style.paddingTop = '24px';
    document.body.appendChild(box);
    restore.push(() => box.remove());
    const was = window.ResizeObserver, seen = [];
    window.ResizeObserver = class { constructor(cb) { this.cb = cb; seen.push(this); } observe(el) { this.el = el; } unobserve() {} disconnect() {} };
    restore.push(() => { window.ResizeObserver = was; });
    const matchWas = window.matchMedia;
    window.matchMedia = (query) => { const max = /max-width:\s*(\d+)px/.exec(query), min = /min-width:\s*(\d+)px/.exec(query); return { media: query, matches: (!max || 390 <= Number(max[1])) && (!min || 390 >= Number(min[1])) && !!(max || min), addEventListener() {}, removeEventListener() {} }; };
    restore.push(() => { if (matchWas) window.matchMedia = matchWas; else delete window.matchMedia; });
    const host = await mount({ section: 'guide', guidePictures: true }, { parent: box });
    const bar = host.querySelector('.cr-guide-jump');
    expect(!!bar).toBe(true);
    expect(bar.style.top).toBe('-24px');
    box.style.paddingTop = '12px';
    const watchers = seen.filter((o) => o.el === box);
    expect(watchers.length).toBeGreaterThan(0);
    await React.act(async () => { watchers.forEach((o) => o.cb([])); });
    expect(bar.style.top).toBe('-12px');
  });
});

describe('right to left', () => {
  it('keeps figure labels anchored the way the figures were drawn', async () => {
    const css = allCss(await mount());
    expect(css.includes('[dir=rtl] [data-coralreef-root] svg text{direction:ltr')).toBe(true);
  });
  it('moves bullets, the hero band and forward arrows, and keeps survey points on the tape order', async () => {
    const css = allCss(await mount());
    expect(css.includes('[dir=rtl] [data-coralreef-root] :is(ul,ol)[style*="padding-left"]')).toBe(true);
    expect(css.includes('[dir=rtl] [data-coralreef-root] .cr-hero:after{background:linear-gradient(270deg')).toBe(true);
    expect(css.includes('svg:has(>path[d="M4 12h16M14 6l6 6-6 6"]){transform:scaleX(-1)}')).toBe(true);
    expect(css.includes('[dir=rtl] [data-coralreef-root] :is(.sv9-tiles,.crb-chunks,.crb-chunk){direction:ltr}')).toBe(true);
  });
  it('names the grid the Field survey really draws its points in', async () => {
    // The first version of this rule named only .crb-chunks, which this page does not use, and did nothing.
    const host = await mount({ section: 'survey' });
    const point = host.querySelector('button.crb-pt');
    expect(!!point).toBe(true);
    expect(!!point.closest('.sv9-tiles')).toBe(true);
    expect(allCss(host).includes(':is(.sv9-tiles,')).toBe(true);
  });
  it('leaves the rules with no effect on a left to right page', async () => {
    const css = allCss(await mount());
    const hs = css.slice(css.indexOf(':where([data-coralreef-root]) :is(h1'));
    const unguarded = hs.split('}').filter((r) => /scaleX\(-1\)|padding-right:22px|direction:ltr/.test(r) && !/\[dir=rtl\]/.test(r));
    expect(unguarded).toEqual([]);
  });
});

describe('panels sized to the box that scrolls', () => {
  function scroller(clientHeight) {
    const box = document.createElement('div');
    box.style.overflowY = 'auto'; box.style.paddingTop = '24px'; box.style.paddingBottom = '24px';
    Object.defineProperty(box, 'clientHeight', { configurable: true, value: clientHeight });
    document.body.appendChild(box);
    restore.push(() => box.remove());
    return box;
  }
  it('measures the host workspace and leaves a bare page on 100vh', async () => {
    const inside = await mount({}, { parent: scroller(649) });
    expect(inside.querySelector('[data-coralreef-root]').style.getPropertyValue('--hs11-view')).toBe('601px');
    const bare = await mount();
    expect(bare.querySelector('[data-coralreef-root]').style.getPropertyValue('--hs11-view')).toBe('');
    const css = allCss(bare);
    expect(css.includes('.sv9-side{max-height:calc(var(--hs11-view,100vh) - 16px)}')).toBe(true);
    expect(css.includes('.fw-panel-wrap{max-height:calc(var(--hs11-view,100vh) - 24px)}')).toBe(true);
    // A bare page keeps the old limits, because the fallback equals them.
    expect(css.includes('.cr-dive-stage canvas{height:clamp(340px,min(52vw,var(--hs11-view,620px)),620px)!important}')).toBe(true);
  });
});

describe('SVG labels that leave their figure in another language', () => {
  const svgRect = rect(0, 100, 0, 100);
  // Every label reports a width of 200 inside a figure 100 wide.
  const wide = (el) => (el.tagName.toLowerCase() === 'svg' ? svgRect : el.tagName.toLowerCase() === 'text' ? rect(0, 200) : null);
  const wait = () => React.act(async () => { await new Promise((r) => setTimeout(r, 180)); });

  it('shrinks them when the text is translated', async () => {
    stubRects(wide);
    const host = await mount({ section: 'methods' }, { t: longT });
    await wait();
    const fit = host.querySelectorAll('svg text[data-hs11-fit=true]');
    expect(fit.length).toBeGreaterThan(0);
    expect(fit[0].style.fontSize).toMatch(/px$/);
  });
  it('shares the room when two labels on a row run into each other', async () => {
    const seen = new Map();
    stubRects((el) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'svg') return rect(0, 2000, 0, 2000);
      if (tag !== 'text') return null;
      if (!seen.has(el)) seen.set(el, seen.size);
      return rect(seen.get(el) * 60, 100, 0, 20); // inside the figure, but overlapping the next one
    });
    const host = await mount({ section: 'methods' }, { t: longT });
    await wait();
    expect(host.querySelectorAll('svg text').length).toBeGreaterThan(1);
    expect(host.querySelectorAll('svg text[data-hs11-fit=true]').length).toBeGreaterThan(1);
  });
  it('does nothing at all in English', async () => {
    stubRects(wide);
    const host = await mount({ section: 'methods' });
    await wait();
    expect(host.querySelectorAll('svg text').length).toBeGreaterThan(0);
    expect(host.querySelectorAll('[data-hs11-fit]').length).toBe(0);
  });
});
