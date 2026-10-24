import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
let root, host;
const TOOLS = [
  ['light', 'Adequate lighting: ', 'Required by the governing code. Many shops work to at least 50 fc (foot-candles, about 540 lux) at the weld, and some codes set a higher minimum (ASME Section V, Article 9, for example). A flashlight held at a low angle shows surface texture.'],
  ['magnifier', '5-10x magnifier: ', 'For close inspection of small features.'],
  ['mirror', 'Mirror on stick: ', 'For visualizing back side of welds, inside pipe, etc.'],
  ['weld-gauge', 'Weld gauge: ', 'A Bridge Cam (Cambridge) gauge or a set of fillet weld gauges. They measure reinforcement, undercut depth, fillet leg size and throat.'],
  ['pit-gauge', 'Pit gauge: ', 'Calipers + depth gauge for measuring defect dimensions.'],
  ['borescope', 'Borescope: ', 'For inspecting inside enclosed spaces (pipe, vessel interior).'],
  ['code', 'Code book + acceptance criteria: ', "Reference for what's acceptable + what's not. Cannot work without this."],
];
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
async function mount(extra = {}, contrast = false) {
  let latest, set;
  function App() {
    const [data, setData] = React.useState({ weldLab: { view: 'inspection', insp_sect: 'visual', ...extra } });
    latest = data.weldLab; set = setData;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData, isContrast: contrast,
      update: (id, key, value) => setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })),
    }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return { latest: () => latest, patch: async values => React.act(() => set(prev => ({ ...prev, weldLab: { ...prev.weldLab, ...values } }))) };
}
const tray = () => host.querySelector('[data-insp-vt-toolkit]');
const scene = () => tray().querySelector('[data-insp-vt-scene]');
const $ = selector => tray().querySelector(selector);
async function choose(value) { await React.act(() => Simulate.change($('select'), { target: { value } })); }
async function detail() { await React.act(() => $('[data-insp-vt-detail-toggle]').click()); }
function points(el) { return el.getAttribute('points').trim().split(/\s+/).map(pair => pair.split(',').map(Number)); }
function line(el) { return ['x1', 'y1', 'x2', 'y2'].map(k => Number(el.getAttribute(k))); }
function center(el) { return ['cx', 'cy'].map(k => Number(el.getAttribute(k))); }
function specimen() { return $('[data-insp-vt-specimen]'); }
function allGeometry() {
  return [...scene().querySelectorAll('polygon,rect,path,line,polyline,circle,ellipse')].map(el => [el.tagName, ...[...el.attributes].filter(a => !a.name.startsWith('aria-')).map(a => [a.name, a.value])]);
}
function globalPoint(pt) { return [40 + pt[0] * 2, 65 + pt[1] * 2]; }
const joint = () => window.__WeldLabCore.proc.JOINT_GEOM.tjoint;
function insidePolygon(pt, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    const cross = (pt[0] - a[0]) * (b[1] - a[1]) - (pt[1] - a[1]) * (b[0] - a[0]);
    if (Math.abs(cross) < 1e-8 && pt[0] >= Math.min(a[0], b[0]) && pt[0] <= Math.max(a[0], b[0]) && pt[1] >= Math.min(a[1], b[1]) && pt[1] <= Math.max(a[1], b[1])) return false;
    if (((a[1] > pt[1]) !== (b[1] > pt[1])) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
function sampleSegment(a, b, count = 40) { return Array.from({ length: count - 1 }, (_, i) => { const t = (i + 1) / count; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }); }
function solids() { return [...specimen().querySelectorAll('polygon')].map(el => points(el).map(globalPoint)); }

describe('VT inspection tool tray', () => {
  it('preserves the seven exact authored tool references and full lighting qualification', async () => {
    await mount();
    expect([...$('select').options].map(o => [o.value, o.textContent])).toEqual(TOOLS.map(t => t.slice(0, 2)));
    for (const [id, label, description] of TOOLS) {
      expect($(`[data-insp-vt-source="${id}"]`).textContent).toBe(label + description);
      await choose(id);
      expect($('[data-insp-vt-reading]').textContent).toBe(label + description);
      expect(scene().getAttribute('aria-label')).toContain(label);
    }
    expect($('[data-insp-vt-source="light"]').textContent).toContain('some codes set a higher minimum');
    expect($('[data-insp-vt-source="light"]').textContent).toContain('Required by the governing code.');
  });

  it('renders the authored T-joint polygons without changing the specimen across tool choices', async () => {
    await mount();
    const j = joint();
    expect(specimen().getAttribute('transform')).toBe('translate(40 65) scale(2)');
    expect([...specimen().querySelectorAll('[data-insp-vt-plate]')].map(points)).toEqual(j.plates.map(p => window.__WeldLabCore.proc.platePoly(p)));
    expect([...specimen().querySelectorAll('[data-insp-vt-weld]')].map(points)).toEqual(j.welds);
    const before = specimen().outerHTML;
    for (const [id] of TOOLS) { await choose(id); expect(specimen().outerHTML).toBe(before); }
    expect(tray().textContent).toContain('no scored indications, measured dimensions or acceptance result');
    expect(tray().querySelectorAll('output,input[type="range"]')).toHaveLength(0);
  });

  it('magnifies by cropping the same geometry with a reversible manual control', async () => {
    await mount(); await choose('magnifier');
    const before = allGeometry();
    expect(scene().style.height).toBe('auto');
    expect(scene().getAttribute('viewBox')).toBe('0 0 640 330');
    expect($('[data-insp-vt-detail-toggle]').getAttribute('aria-pressed')).toBe('false');
    await detail();
    expect(scene().getAttribute('viewBox')).toBe('232 158 90 90');
    expect(allGeometry()).toEqual(before); expect(scene().style.height).toBe('280px');
    const [x, y, w, h] = scene().getAttribute('viewBox').split(' ').map(Number);
    for (const pt of joint().welds[1].map(globalPoint)) { expect(pt[0]).toBeGreaterThanOrEqual(x); expect(pt[0]).toBeLessThanOrEqual(x + w); expect(pt[1]).toBeGreaterThanOrEqual(y); expect(pt[1]).toBeLessThanOrEqual(y + h); }
    expect($('[data-insp-vt-detail-toggle]').getAttribute('aria-pressed')).toBe('true');
    expect($('[data-insp-vt-scene-key]').textContent).toContain('same right-side fillet');
    await detail(); expect(scene().getAttribute('viewBox')).toBe('0 0 640 330'); expect(scene().style.height).toBe('auto');
    await detail(); await choose('mirror'); expect(scene().dataset.inspVtDetail).toBe('context');
    await choose('magnifier'); expect(scene().dataset.inspVtDetail).toBe('context');
  });

  it('places the weld gauge on the two actual fillet toes with its blade in free space', async () => {
    await mount(); await choose('weld-gauge');
    const upper = globalPoint(joint().welds[1][2]), lower = globalPoint(joint().welds[1][1]);
    expect(center($('[data-insp-vt-contact="fillet-upper"]'))).toEqual(upper);
    expect(center($('[data-insp-vt-contact="fillet-base"]'))).toEqual(lower);
    const blade = points($('[data-insp-vt-gauge-body]'));
    expect(blade.slice(0, 2)).toEqual([upper, lower]);
    // The blade is on the air side of the fillet's diagonal, never buried in the weld.
    for (const [x, y] of blade) expect(y).toBeLessThanOrEqual(x - 75);
    expect($('[data-insp-vt-purpose]').textContent).toContain('contact locations');
    expect($('[data-insp-vt-instrument]').querySelectorAll('text')).toHaveLength(0);
  });

  it('keeps depth-gauge feet and probe on the flat plate, with no invented pit or reading', async () => {
    await mount(); await choose('pit-gauge');
    const contacts = [...tray().querySelectorAll('[data-insp-vt-contact]')].map(center);
    expect(contacts).toEqual([[330, 209], [380, 209], [355, 209]]);
    const baseToe = globalPoint(joint().welds[1][1]);
    for (const [x, y] of contacts) { expect(x).toBeGreaterThan(baseToe[0]); expect(x).toBeLessThan(400); expect(y).toBe(209); }
    for (const el of $('[data-insp-vt-instrument]').querySelectorAll('line')) expect(Number(el.getAttribute('y2'))).toBe(209);
    expect($('[data-insp-vt-purpose]').textContent).toContain('no depth reading');
    expect($('[data-insp-vt-instrument]').querySelectorAll('text,path')).toHaveLength(0);
  });

  it('routes the mirror around the upright and orients its plane to that viewing route', async () => {
    await mount(); await choose('mirror');
    const path = points($('[data-insp-vt-route="mirror"]'));
    expect(path).toEqual([[390, 45], [160, 70], globalPoint(joint().welds[0][2])]);
    for (let i = 1; i < path.length; i++) for (const pt of sampleSegment(path[i - 1], path[i])) for (const solid of solids()) expect(insidePolygon(pt, solid)).toBe(false);
    // A direct sightline crosses the upright; the routed mirror path does not.
    expect(sampleSegment(path[0], path[2]).some(pt => insidePolygon(pt, solids()[1]))).toBe(true);
    const plane = line($('[data-insp-vt-mirror-plane]'));
    const m = path[1], a = path[0], b = path[2];
    const unit = v => { const l = Math.hypot(...v); return v.map(n => n / l); };
    const incoming = unit([m[0] - a[0], m[1] - a[1]]), outgoing = unit([b[0] - m[0], b[1] - m[1]]);
    const tangent = unit([plane[2] - plane[0], plane[3] - plane[1]]), normal = [-tangent[1], tangent[0]];
    const dot = incoming[0] * normal[0] + incoming[1] * normal[1];
    const reflected = incoming.map((n, i) => n - 2 * dot * normal[i]);
    expect(reflected[0]).toBeCloseTo(outgoing[0], 8); expect(reflected[1]).toBeCloseTo(outgoing[1], 8);
  });

  it('passes the borescope through the open pipe section before viewing its inner wall', async () => {
    await mount(); await choose('borescope');
    const opening = line($('[data-insp-vt-pipe-opening]'));
    expect(opening).toEqual([435, 171, 435, 229]);
    expect($('[data-insp-vt-probe]').getAttribute('d')).toBe('M390 115 V187 Q390 200 403 200 H510');
    expect(200).toBeGreaterThan(opening[1]); expect(200).toBeLessThan(opening[3]);
    const ray = line($('[data-insp-vt-route="borescope"]'));
    expect(ray).toEqual([510, 200, 548, 171]);
    for (const [x, y] of sampleSegment(ray.slice(0, 2), ray.slice(2))) { expect(x).toBeGreaterThan(435); expect(x).toBeLessThan(595); expect(y).toBeGreaterThan(171); expect(y).toBeLessThan(229); }
    expect(center($('[data-insp-vt-target]'))).toEqual(ray.slice(2));
    expect($('[data-insp-vt-purpose]').textContent).toContain('inside wall');
  });

  it('keeps a low-angle light cone above the plate and puts its target on a real toe', async () => {
    await mount();
    const cone = points($('[data-insp-vt-instrument="light"] polygon'));
    expect(cone).toEqual([[363, 176], [369, 188], [334, 209], globalPoint(joint().welds[1][1])]);
    expect(center($('[data-insp-vt-target]'))).toEqual(globalPoint(joint().welds[1][1]));
    for (let i = 0; i < cone.length; i++) for (const pt of sampleSegment(cone[i], cone[(i + 1) % cone.length])) for (const solid of solids()) expect(insidePolygon(pt, solid)).toBe(false);
    expect($('[data-insp-vt-purpose]').textContent).toContain('does not set or verify the required illumination');
  });

  it('keeps exploration separate from saved bench records, NDT choices and first-call gates', async () => {
    const saved = { insp2_benchIdx: 0, insp2_bench: { uc1: { recs: [3.5], pick: 'reject' }, us1: { recs: [2.25], pick: null } }, insp2_ndtMat: 'ss304', insp2_ndtFlaw: 'porosity', insp2_ndtAccess: 'one', insp2_ndtDemo: 'rt', insp2_ndtQuiz: { '0': 2 }, insp2_ndtQIdx: 1 };
    const { latest } = await mount(saved);
    const before = JSON.stringify(latest());
    for (const [id] of TOOLS) { await choose(id); if (id === 'magnifier') await detail(); }
    expect(JSON.stringify(latest())).toBe(before);
    await React.act(() => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === 'Open the bench →').click());
    expect(tray()).toBeNull(); expect(latest().insp_sect).toBe('bench');
    const calls = host.querySelector('[aria-label="Your call for this weld"]');
    expect([...calls.querySelectorAll('button')].every(el => el.disabled)).toBe(true);
    expect(calls.querySelector('[aria-checked="true"]').textContent.toLowerCase()).toContain('reject');
    const entry = JSON.stringify(latest().insp2_bench);
    await React.act(() => calls.querySelector('button').click()); expect(JSON.stringify(latest().insp2_bench)).toBe(entry);
    await React.act(() => [...host.querySelectorAll('button[aria-pressed]')].find(el => el.textContent.includes('Visual inspection (VT)')).click()); await choose('mirror');
    expect(latest()).toMatchObject(saved);
    await React.act(() => [...host.querySelectorAll('button[aria-pressed]')].find(el => el.textContent.includes('NDT Method Chooser')).click()); expect(tray()).toBeNull(); expect(latest()).toMatchObject(saved);
  });

  it('keeps an unknown saved section on the existing overview fallback', async () => {
    await mount({ insp_sect: 'not-a-section' });
    expect(tray()).toBeNull(); expect(host.textContent).toContain('The CWI');
  });

  it.each([false, true])('provides labelled native controls, explicit contrast and readable reference text (contrast=%s)', async contrast => {
    await mount({}, contrast);
    expect(tray().getAttribute('aria-label')).toBe('Visual inspection tool tray');
    const select = $('select'); expect(select.closest('label').textContent).toContain('Choose a tool');
    expect(parseInt(select.style.minHeight)).toBeGreaterThanOrEqual(44);
    expect(select.style.maxWidth).toBe('100%');
    expect(tray().style.backgroundColor).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 251, 235)');
    expect($('[data-insp-vt-reading]').style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(23, 37, 84)');
    await React.act(() => { $('[data-insp-vt-reference-list]').open = true; });
    const refs = $('[data-insp-vt-reference-list] ul');
    expect(refs.style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(23, 37, 84)');
    expect(parseInt($('summary').style.minHeight)).toBeGreaterThanOrEqual(44);
    await choose('magnifier');
    expect(parseInt($('[data-insp-vt-detail-toggle]').style.minHeight)).toBeGreaterThanOrEqual(44);
    expect(scene().getAttribute('role')).toBe('img'); expect(scene().style.height).toBe('auto');
    await detail(); expect(scene().style.height).toBe('280px');
    expect($('[aria-label="Diagram legend"]').textContent).toContain('Dashed cyan circle');
    expect(tray().querySelectorAll('animate,animateTransform,marquee')).toHaveLength(0);
    const geometry = allGeometry();
    await new Promise(resolve => setTimeout(resolve, 20)); expect(allGeometry()).toEqual(geometry);
  });
});
