import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import path from 'node:path';

// The species guide's picture grid reaches tablets. The media query is answered from a real
// width, so moving the limit in the tool fails here. Tablet tiles keep readable columns and open
// field marks in place, so no card moves.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let loadTool, resetStemLab, React, ReactDOMClient;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, React, ReactDOMClient } = mod);
  resetStemLab(); loadTool(TOOL, 'coralReef');
});

function setWidth(width) {
  window.matchMedia = (query) => {
    const max = /max-width:\s*(\d+)px/.exec(query), min = /min-width:\s*(\d+)px/.exec(query);
    const matches = (!max || width <= Number(max[1])) && (!min || width >= Number(min[1])) && !!(max || min);
    return { media: query, matches, addEventListener() {}, removeEventListener() {} };
  };
}
const mounted = [];
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  delete window.matchMedia;
});
async function mount(seed = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [toolData, setToolData] = React.useState({ coralReef: { section: 'guide', ...seed } });
    return cfg.render({ React, toolData, setToolData, t: (k, f) => f || k, announceToSR() {} });
  }
  mounted.push({ host, root });
  await React.act(async () => root.render(React.createElement(Shell)));
  return host;
}
const hasGrid = (host) => !!host.querySelector('.crds-guide[data-gd10-grid=true]');

describe('species guide picture grid on tablets', () => {
  it('opens as the grid up to 900 px and as full cards from 901 px', async () => {
    const seen = {};
    for (const width of [390, 640, 641, 768, 900, 901, 1280]) {
      setWidth(width);
      seen[width] = hasGrid(await mount());
    }
    expect(seen).toEqual({ 390: true, 640: true, 641: true, 768: true, 900: true, 901: false, 1280: false });
  });
  it('a saved full-card choice still wins on a tablet', async () => {
    setWidth(768);
    expect(hasGrid(await mount({ guideCompact: false }))).toBe(false);
  });
  it('tablet tiles use a wider minimum and do not span the row when field marks open', async () => {
    setWidth(768);
    const host = await mount();
    const css = [...host.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    const block = /@media\(min-width:641px\)\{\[data-coralreef-root\] \.crds-guide\[data-gd10-grid=true\][^\n]*/.exec(css);
    const text = block ? block[0].slice(0, 600) : '';
    expect(/minmax\(min\(100%,168px\),1fr\)\)!important/.test(text), 'wider tile minimum').toBe(true);
    expect(/\.gd10-wide\{grid-column:auto\}/.test(text), 'marks open in place').toBe(true);
    expect(/\.gd10-more \.crds-search-grid>\.crds-field:first-child\{grid-column:auto\}/.test(text), 'filters share a row').toBe(true);
  });
});
