import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

// Camouflage Lab skin patches. The chromatophore layer used to be folded into
// one flat colour on an oval, and leucophores added plain white, so even the
// TARGET skin could not match sand. Each check reads what the section renders.
const SOURCE = 'stem_lab/stem_tool_cephalopodlab.js';
const RENDER_TIMEOUT_MS = 20000;

function render(data) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('cephalopodLab', { cephalopodLab: Object.assign({ activeSection: 'camo' }, data) });
  return container;
}
// The two patches are the clipped skin SVGs; the second one is "your skin".
function patches(container) {
  return [...container.querySelectorAll('svg[aria-hidden="true"]')].filter((svg) => svg.querySelector('clipPath[id^="ccoClip_"]'));
}
function bodyFill(svg) {
  const group = [...svg.querySelectorAll('g')].find((g) => /url\(#ccoClip_/.test(g.getAttribute('clip-path') || ''));
  return group.querySelector('rect').getAttribute('fill').toLowerCase();
}
function sacRadii(svg) {
  const group = [...svg.querySelectorAll('g')].find((g) => /url\(#ccoClip_/.test(g.getAttribute('clip-path') || ''));
  return [...group.querySelectorAll(':scope > g > circle')].map((c) => Number(c.getAttribute('r')));
}

beforeEach(() => {
  window.localStorage.clear();
  resetStemLab();
  loadTool(SOURCE, 'cephalopodLab');
});

describe('Camouflage Lab skin patches', () => {
  it('lets leucophores reflect the scene: full reflection gives the scene colour as the skin base', () => {
    for (const [scene, bg] of [['sand', '#e6c884'], ['kelp', '#3d7a3d'], ['rock', '#6b6258']]) {
      const [, mine] = patches(render({ camoScene: scene, camoChromatophore: 40, camoIridophore: 0, camoLeucophore: 100 }));
      expect(bodyFill(mine)).toBe(bg);
    }
    const [, dull] = patches(render({ camoScene: 'sand', camoChromatophore: 40, camoIridophore: 0, camoLeucophore: 0 }));
    expect(bodyFill(dull)).not.toBe('#e6c884');
  }, RENDER_TIMEOUT_MS);

  it('draws chromatophores as pigment sacs that grow as the layer expands', () => {
    const relaxed = sacRadii(patches(render({ camoScene: 'sand', camoChromatophore: 0 }))[1]);
    const expanded = sacRadii(patches(render({ camoScene: 'sand', camoChromatophore: 100 }))[1]);
    const mean = (r) => r.reduce((a, v) => a + v, 0) / r.length;
    expect(relaxed.length).toBeGreaterThan(100);
    expect(relaxed.length).toBe(expanded.length);
    expect(mean(expanded)).toBeGreaterThan(mean(relaxed) * 4);
  }, RENDER_TIMEOUT_MS);

  it('renders both panels as decorative SVGs on the same textured scene', () => {
    const container = render({ camoScene: 'reef' });
    const both = patches(container);
    expect(both).toHaveLength(2);
    const ground = (svg) => svg.querySelector(':scope > g[aria-hidden="true"]').innerHTML;
    expect(ground(both[0])).toBe(ground(both[1]));
    expect(both[0].querySelectorAll(':scope > g[aria-hidden="true"] circle').length).toBeGreaterThan(10);
    for (const svg of both) expect(svg.getAttribute('focusable')).toBe('false');
  }, RENDER_TIMEOUT_MS);
});
