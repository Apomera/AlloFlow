import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
let root, host;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
async function mount(extra = {}, contrast = false) {
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: { view: 'symbolsReader', sr_view: 'library', ...extra } });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData, isContrast: contrast,
      update: (id, key, value) => setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })),
    }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App))); return () => latest;
}
const lens = () => host.querySelector('[data-symbol-modifier-lens]');
const core = () => window.__WeldLabCore.sym2;
async function select(value) { await React.act(() => Simulate.change(lens().querySelector('[data-symbol-modifier-pick]'), { target: { value } })); }
async function toggle() { await React.act(() => lens().querySelector('[data-symbol-modifier-highlight-toggle]').click()); }
const card = role => lens().querySelector('[data-symbol-modifier-card="' + role + '"]');
const diagram = role => lens().querySelector('[data-symbol-modifier-diagram="' + role + '"]');
const spec = role => JSON.parse(card(role).dataset.spec);
const EXAMPLES = [
  ['allAround', { type: 'fillet', side: 'arrow', size: '1/4', allAround: true }, { allAround: false }, ['allround|'], 'Open circle where the arrow meets the line: the weld goes all the way around the joint.'],
  ['field', { type: 'fillet', side: 'arrow', size: '1/4', fieldWeld: true }, { fieldWeld: false }, ['field|'], 'Flag at the arrow junction: the weld is made at the install site, not in the shop.'],
  ['both', { type: 'fillet', side: 'both', size: '1/4' }, { side: 'arrow' }, ['sym|other', 'size|other'], 'A symbol above AND below the line: weld both sides of the joint. Each side carries its own size.'],
  ['lp', { type: 'fillet', side: 'arrow', size: '3/16', length: '2', pitch: '6' }, { length: '', pitch: '' }, ['lp|arrow'], 'Right of the symbol: weld length, then centre-to-centre spacing. Here, 2 in welds every 6 in.'],
  ['flush', { type: 'vGroove', side: 'arrow', contour: 'flush' }, { contour: 'none' }, ['contour|arrow'], 'Straight line beyond the symbol: finish the weld face flat with the surface.'],
  ['convex', { type: 'vGroove', side: 'arrow', contour: 'convex' }, { contour: 'none' }, ['contour|arrow'], 'Curve bulging AWAY from the line: the weld face crowns above flush.'],
  ['concave', { type: 'fillet', side: 'arrow', size: '1/4', contour: 'concave' }, { contour: 'none' }, ['contour|arrow'], 'Curve dipping back TOWARD the line: the weld face is dished.'],
  ['finish', { type: 'vGroove', side: 'arrow', contour: 'flush', finish: 'G' }, { finish: '' }, ['finish|arrow'], 'Letter beyond the contour says how to get it: G grind, M machine, C chip, H hammer, R roll, P planish.'],
  ['tail', { type: 'fillet', side: 'arrow', size: '1/4', tail: 'GMAW' }, { tail: '' }, ['tail|'], 'Process, procedure (WPS) or other reference. Left off when nothing needs saying.'],
  ['right', { type: 'fillet', side: 'arrow', size: '1/4', arrowAt: 'right' }, { arrowAt: 'left' }, ['arrow|'], 'The arrow may leave either end. Below the line is still the arrow side, and the vertical leg stays on the left.'],
];
const shapeAttrs = new Set(['x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'width', 'height', 'd', 'points', 'font-size', 'text-anchor']);
function geometry(svg) {
  return [...svg.querySelectorAll('[data-part]')].map(group => ({
    part: group.dataset.part, side: group.dataset.side || '',
    prims: [...group.children].map(el => ({ tag: el.tagName.toLowerCase(), text: el.textContent,
      attrs: [...el.attributes].filter(a => shapeAttrs.has(a.name)).map(a => [a.name, a.value]).sort((a, b) => a[0].localeCompare(b[0])) })),
  }));
}
function expectedGeometry(raw) { const el = document.createElement('div'); el.innerHTML = core().svg(raw); return geometry(el.querySelector('svg')); }

describe('Symbols modifier comparison lens', () => {
  it('offers all ten authored examples and removes only the selected instruction in each comparison reference', async () => {
    await mount();
    expect([...lens().querySelector('select').options].map(o => o.value)).toEqual(EXAMPLES.map(e => e[0]));
    for (const [id, authored, reset, , prose] of EXAMPLES) {
      await select(id);
      expect(lens().dataset.symbolModifierLens).toBe(id);
      expect(spec('example')).toEqual(core().normSpec(authored));
      expect(spec('baseline')).toEqual(core().normSpec({ ...authored, ...reset }));
      expect(Object.keys(spec('example')).filter(key => spec('example')[key] !== spec('baseline')[key]).sort()).toEqual(Object.keys(reset).sort());
      expect(lens().querySelector('[data-symbol-modifier-reading]').textContent).toBe(prose);
      expect(lens().dataset.fields).toBe(Object.keys(reset).join(','));
    }
  });

  it('retains the flush contour when removing G from the finish-letter example', async () => {
    await mount(); await select('finish');
    expect(spec('baseline').contour).toBe('flush'); expect(spec('example').contour).toBe('flush');
    expect(spec('baseline').finish).toBe(''); expect(spec('example').finish).toBe('G');
    expect(diagram('baseline').querySelector('[data-part="contour"]')).toBeTruthy();
    expect(diagram('baseline').querySelector('[data-part="finish"]')).toBeNull();
    expect(diagram('example').querySelector('[data-part="finish"]').textContent).toBe('G');
    expect(diagram('example').querySelector('[data-part="contour"]').dataset.highlight).toBe('false');
  });

  it('draws the exact shared-model shape coordinates for both versions of every example', async () => {
    await mount();
    for (const [id, authored, reset] of EXAMPLES) {
      await select(id);
      expect(geometry(diagram('example'))).toEqual(expectedGeometry(authored));
      expect(geometry(diagram('baseline'))).toEqual(expectedGeometry({ ...authored, ...reset }));
    }
  });

  it('uses one exact union viewBox and identical fixed viewport dimensions without independently scaling either symbol', async () => {
    await mount();
    for (const [id, authored, reset] of EXAMPLES) {
      await select(id);
      const a = core().model(authored).viewBox, b = core().model({ ...authored, ...reset }).viewBox;
      const x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]);
      const union = [x, y, Math.max(a[0] + a[2], b[0] + b[2]) - x, Math.max(a[1] + a[3], b[1] + b[3]) - y];
      for (const role of ['baseline', 'example']) {
        expect(diagram(role).getAttribute('viewBox').split(' ').map(Number)).toEqual(union);
        expect(diagram(role).style.width).toBe('100%'); expect(diagram(role).style.height).toBe('180px');
        expect(diagram(role).getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
        expect(card(role).style.flex).toBe('1 1 240px');
      }
      const before = ['baseline', 'example'].map(role => diagram(role).getAttribute('viewBox'));
      await toggle();
      expect(['baseline', 'example'].map(role => diagram(role).getAttribute('viewBox'))).toEqual(before);
      await toggle();
    }
  });

  it('highlights only the affected actual primitive groups with heavier strokes and leaves reference geometry unchanged', async () => {
    await mount();
    for (const [id, , , affected] of EXAMPLES) {
      await select(id);
      const active = [...diagram('example').querySelectorAll('[data-highlight="true"]')];
      expect(active.map(g => g.dataset.part + '|' + (g.dataset.side || ''))).toEqual(affected);
      expect(diagram('baseline').querySelector('[data-highlight="true"]')).toBeNull();
      for (const g of active) for (const primitive of g.children) {
        expect(primitive.getAttribute(primitive.tagName.toLowerCase() === 'text' ? 'fill' : 'stroke')).toBe('#c2410c');
        if (primitive.tagName.toLowerCase() === 'text') expect(primitive.getAttribute('font-weight')).toBe('bold');
        else expect(Number(primitive.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(3.6);
      }
      const before = geometry(diagram('example')), specs = [spec('baseline'), spec('example')];
      await toggle();
      expect(lens().querySelector('[data-highlight="true"]')).toBeNull();
      expect(geometry(diagram('example'))).toEqual(before);
      expect([spec('baseline'), spec('example')]).toEqual(specs);
      await toggle();
    }
  });

  it('keeps inspection local and independent of library-side, length/pitch and scored records', async () => {
    const saved = { sym2_lib_side: 'both', sym3_lp_example: '3-12', sym2_pr_ans: { '0_0': 2 }, sym2_b_res: { b1: 1 }, sym2_bp_ans: { bp1: 1 } };
    const latest = await mount(saved);
    const library = host.querySelector('[data-sym2-card]').outerHTML;
    await select('finish'); await toggle(); await select('right'); await toggle();
    expect(latest()).toEqual({ view: 'symbolsReader', sr_view: 'library', ...saved });
    expect(host.querySelector('[data-symbol-run]').dataset.side).toBe('both');
    expect(host.querySelector('[data-symbol-run]').dataset.symbolRun).toBe('3-12');
    expect(host.querySelector('[data-sym2-card]').outerHTML).toBe(library);
    expect(spec('example').side).toBe('arrow'); // authored examples keep their authored side
    const tabs = [...host.querySelectorAll('[role="tab"]')];
    for (const n of [0, 2, 3, 4]) {
      await React.act(() => tabs[n].click()); expect(lens()).toBeNull();
      expect(latest().sym2_pr_ans).toEqual(saved.sym2_pr_ans); expect(latest().sym2_b_res).toEqual(saved.sym2_b_res); expect(latest().sym2_bp_ans).toEqual(saved.sym2_bp_ans);
      await React.act(() => host.querySelectorAll('[role="tab"]')[1].click());
      expect(lens().dataset.symbolModifierLens).toBe('right');
    }
  });

  it('rejects unknown selector values and remains finite with unrelated malformed saved state', async () => {
    const latest = await mount({ sym2_lib_side: '__proto__', sym3_lp_example: 'garbage', sym2_pr_ans: { bad: 999 } });
    await select('constructor'); expect(lens().dataset.symbolModifierLens).toBe('allAround');
    await select('tail'); await select('__proto__'); expect(lens().dataset.symbolModifierLens).toBe('tail');
    expect(lens().innerHTML).not.toMatch(/NaN|Infinity|undefined/);
    expect(latest().sym2_lib_side).toBe('__proto__'); expect(latest().sym2_pr_ans).toEqual({ bad: 999 });
  });

  it('provides a labelled native selector, wrapping matched frames and clear non-color highlight wording', async () => {
    await mount();
    const picker = lens().querySelector('select'), label = lens().querySelector('label');
    expect(label.htmlFor).toBe(picker.id); expect(picker.style.minHeight).toBe('44px'); expect(picker.className).toContain('focus:ring-4');
    const button = lens().querySelector('button'); expect(button.style.minHeight).toBe('44px'); expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(lens().querySelector('[data-symbol-modifier-frames]').style.flexWrap).toBe('wrap');
    expect(lens().querySelector('[data-symbol-modifier-legend]').textContent).toContain('heavier strokes');
    expect(lens().querySelector('[data-symbol-modifier-legend]').textContent).toContain('same scale');
    expect(lens().querySelector('animate,animateTransform')).toBeNull();
  });

  it('uses explicit white and yellow contrast ink on black surfaces for all figures and readings', async () => {
    await mount({}, true); await select('finish');
    expect(lens().style.background).toBe('rgb(0, 0, 0)'); expect(lens().style.color).toBe('rgb(255, 255, 255)');
    expect(lens().querySelector('[data-symbol-modifier-reading]').style.color).toBe('rgb(255, 255, 255)');
    const button = lens().querySelector('[data-symbol-modifier-highlight-toggle]');
    expect(button.style.background).toBe('rgb(255, 255, 0)'); expect(button.style.color).toBe('rgb(0, 0, 0)');
    for (const role of ['baseline', 'example']) {
      expect(diagram(role).style.background).toBe('rgb(0, 0, 0)'); expect(card(role).style.background).toBe('rgb(0, 0, 0)');
      expect(card(role).querySelector('figcaption').style.color).toBe('rgb(255, 255, 255)');
    }
    expect(diagram('example').querySelector('[data-part="finish"] text').getAttribute('fill')).toBe('#ffff00');
    expect(diagram('example').querySelector('[data-part="ref"] line').getAttribute('stroke')).toBe('#ffffff');
    await toggle(); expect(diagram('example').querySelector('[data-part="finish"] text').getAttribute('fill')).toBe('#ffffff');
  });
});
