import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const fixture = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-projection-anatomy-baseline.json'), 'utf8'));
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'mathBlueprint', mb_mode: 'browse', mb_sect: 'prints', sym2_m_seed: 12345 };
const CARRIES = { width: ['front', 'top'], depth: ['right', 'top'], height: ['front', 'right'] };
const DIMENSIONS = { width: 6, depth: 4, height: 6.5 };
const EXPECTED = {
  top: { base: [[100,240],[340,240],[340,80],[100,80]], upright: [[160,240],[180,240],[180,80],[160,80]], gusset: [[180,170],[300,170],[300,150],[180,150]] },
  front: { base: [[100,600],[340,600],[340,580],[100,580]], upright: [[160,580],[180,580],[180,340],[160,340]], gusset: [[180,580],[300,580],[180,460]] },
  right: { base: [[500,600],[660,600],[660,580],[500,580]], upright: [[500,580],[660,580],[660,340],[500,340]], gusset: [[570,580],[590,580],[590,460],[570,460]] }
};
let host, root;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab'); });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
const panel = (node = host) => node.querySelector('[data-print-projections]');
const $ = selector => panel().querySelector(selector);
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
function render(extra = {}) { const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }); return node; }
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function choose(kind, id) { await click($('[data-projection-' + kind + '="' + id + '"]')); }
async function mode(label) { await click([...host.querySelectorAll('button')].find(el => el.textContent.trim().includes(label))); }
const number = (node, attr) => Number(node.getAttribute(attr));
const points = node => node.getAttribute('points').split(' ').map(pair => pair.split(',').map(Number));
const geometry = () => [...panel().querySelectorAll('[data-projection-part]')].map(el => [el.dataset.view, el.dataset.projectionPart, el.getAttribute('points')]);
const withoutMode = data => { const copy = structuredClone(data); delete copy.mb_mode; return copy; };

describe('Blueprint projection explorer', () => {
  it('projects the exact existing BRKT-01 base, upright and triangular gusset in three views at forty pixels per inch', async () => {
    await mount(); expect(panel().dataset.scale).toBe('40'); expect(panel().querySelectorAll('[data-projection-part]')).toHaveLength(9);
    for (const [view, parts] of Object.entries(EXPECTED)) for (const [part, expected] of Object.entries(parts)) {
      const shape = $('[data-projection-part="' + part + '"][data-view="' + view + '"]'); expect(shape.tagName.toLowerCase()).toBe('polygon'); expect(points(shape)).toEqual(expected);
    }
    // The front gusset is a real right triangle: both legs are three inches.
    const triangle = points($('[data-projection-part="gusset"][data-view="front"]'));
    expect(triangle).toHaveLength(3); expect((triangle[1][0]-triangle[0][0])/40).toBe(3); expect((triangle[0][1]-triangle[2][1])/40).toBe(3);
    // Half-inch base plus six-inch upright yields a 6.5-inch envelope.
    const base = points($('[data-projection-part="base"][data-view="front"]')), upright = points($('[data-projection-part="upright"][data-view="front"]'));
    expect((base[0][1]-base[2][1])/40).toBe(.5); expect((upright[0][1]-upright[2][1])/40).toBe(6); expect((base[0][1]-upright[2][1])/40).toBe(6.5);
    expect($('[data-projection-height-breakdown]').textContent).toContain('Overall height: 0.5 + 6 = 6.5 in.');
  });

  it('keeps third-angle placement and consistent dimensions across the matching view pairs', async () => {
    await mount();
    expect(number($('[data-projection-view="top"]'),'data-origin-x')).toBe(number($('[data-projection-view="front"]'),'data-origin-x'));
    expect(number($('[data-projection-view="front"]'),'data-origin-y')).toBe(number($('[data-projection-view="right"]'),'data-origin-y'));
    const topBottom=Math.max(...points($('[data-projection-part="base"][data-view="top"]')).map(p=>p[1]));
    const frontTop=Math.min(...points($('[data-projection-part="upright"][data-view="front"]')).map(p=>p[1])); expect(topBottom).toBeLessThan(frontTop);
    const frontRight=Math.max(...points($('[data-projection-part="base"][data-view="front"]')).map(p=>p[0]));
    const rightLeft=Math.min(...points($('[data-projection-part="base"][data-view="right"]')).map(p=>p[0])); expect(rightLeft).toBeGreaterThan(frontRight);
    for (const [dimension, expectedLength] of Object.entries(DIMENSIONS)) {
      const lines=[...panel().querySelectorAll('[data-projection-dimension="'+dimension+'"]')]; expect(lines).toHaveLength(2);
      expect(lines.map(line=>line.dataset.view).sort()).toEqual(CARRIES[dimension]);
      for(const line of lines) { expect(number(line,'data-length')).toBe(expectedLength); expect(Math.hypot(number(line,'x2')-number(line,'x1'),number(line,'y2')-number(line,'y1'))).toBe(expectedLength*40); }
    }
    const topDepth=$('[data-projection-dimension="depth"][data-view="top"]'),rightDepth=$('[data-projection-dimension="depth"][data-view="right"]');
    expect(number(topDepth,'x1')).toBe(number(topDepth,'x2')); expect(number(rightDepth,'y1')).toBe(number(rightDepth,'y2'));
  });

  it('highlights the two views carrying each dimension with readable matching HTML values and no geometry changes', async () => {
    const app=await mount(), initial=geometry(), saved=structuredClone(app.latest());
    for(const dimension of ['depth','height','width']) {
      await choose('focus',dimension); expect(panel().dataset.focus).toBe(dimension); expect(geometry()).toEqual(initial);
      const readings=[...panel().querySelectorAll('[data-projection-reading][data-carries-focus="true"]')];expect(readings.map(el=>el.dataset.projectionReading).sort()).toEqual(CARRIES[dimension]);
      expect(panel().querySelectorAll('[data-projection-dimension-group][data-active="true"]')).toHaveLength(2);
      for(const reading of readings) expect(number(reading.querySelector('[data-projection-reading-dimension="'+dimension+'"]'),'data-value')).toBe(DIMENSIONS[dimension]);
      expect($('[data-projection-relationship]').textContent).toContain(DIMENSIONS[dimension]+' in');
    }
    expect(app.latest()).toEqual(saved);expect(app.writes).toHaveLength(0);
  });

  it('offers manual alignment guides and detail crops of the same undistorted SVG geometry', async () => {
    const app=await mount(), initial=geometry(), saved=structuredClone(app.latest());expect(panel().querySelectorAll('[data-projection-guide]')).toHaveLength(0);
    await click($('[data-projection-guides]'));expect($('[data-projection-guides]').getAttribute('aria-pressed')).toBe('true');expect(panel().querySelectorAll('[data-projection-guide]')).toHaveLength(4);
    for(const guide of panel().querySelectorAll('[data-projection-guide]')) { if(guide.dataset.projectionGuide==='width')expect(number(guide,'x1')).toBe(number(guide,'x2')); else expect(number(guide,'y1')).toBe(number(guide,'y2')); }
    const boxes=new Set();
    for(const detail of ['top','front','right','all']) { await choose('detail',detail);const svg=$('[data-projection-drawing]');boxes.add(svg.getAttribute('viewBox'));expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');expect(svg.style.height).toBe('auto');expect(geometry()).toEqual(initial);expect(panel().querySelectorAll('[data-projection-view][transform], [data-projection-part][transform]')).toHaveLength(0); }
    expect(boxes.size).toBe(4);await click($('[data-projection-guides]'));expect(panel().querySelectorAll('[data-projection-guide]')).toHaveLength(0);expect(app.latest()).toEqual(saved);expect(app.writes).toHaveLength(0);
  });

  it('preserves all nine original anatomy texts, six checklist items, intro and cross-link', async () => {
    await mount();expect(fixture.anatomy).toHaveLength(9);const rows=[...panel().querySelectorAll('[data-projection-original]')];expect(rows).toHaveLength(9);
    expect(rows.map(row=>({part:row.querySelector('[data-projection-original-title]').textContent,detail:row.querySelector('[data-projection-original-body]').textContent}))).toEqual(fixture.anatomy);
    expect($('[data-projection-reference]').tagName).toBe('DETAILS');for(const text of [...fixture.checklist,fixture.intro,fixture.crosslink,fixture.crosslinkButton])expect(host.textContent).toContain(text);
    const open=[...host.querySelectorAll('button')].find(el=>el.textContent===fixture.crosslinkButton);expect(open).toBeTruthy();await click(open);
    expect(host.textContent).toContain('Mini blueprint: bracket BRKT-01');expect(panel()).toBeNull();
  });

  it('keeps all model, round, score and committed quiz records isolated from local inspection', async () => {
    const records={sym2_m_seed:12345,sym2_m_rounds:{square:3,brace:2},sym2_m_score:4,sym2_m_tries:8,sym2_m_streak:2,sym2_m_best:3,mb_q_idx:0,mb_q_score:2,mb_q_picked:0,sym2_bp_ans:{s1:1},sym2_pr_ans:{},sym2_b_res:{}};
    const app=await mount(records), saved=structuredClone(app.latest());await choose('focus','height');await choose('detail','right');await click($('[data-projection-guides]'));expect(app.latest()).toEqual(saved);expect(app.writes).toHaveLength(0);
    await mode('Symbol Match quiz');expect(panel()).toBeNull();const answers=[...host.querySelectorAll('[role="radiogroup"] button')];expect(answers.length).toBeGreaterThan(1);expect(answers.every(el=>el.disabled)).toBe(true);for(const answer of answers)await click(answer);
    expect(withoutMode(app.latest())).toEqual(withoutMode(saved));await mode('Browse topics');expect(panel()).toBeTruthy();expect(panel().dataset).toMatchObject({focus:'height',detail:'right'});
  });

  it('does not reveal a checked-practice answer or bypass the pending quiz Check gate', async () => {
    const app=await mount({mb_q_picked:null,mb_q_score:0});await choose('detail','front');await mode('Checked practice');expect(panel()).toBeNull();
    const card=host.querySelector('[data-sym2-math="square"]');expect(card).toBeTruthy();expect(card.textContent).not.toContain('Worked solution:');expect(card.textContent).not.toContain('Show the worked solution');
    await React.act(()=>Simulate.change(card.querySelector('input'),{target:{value:'0'}}));await click([...card.querySelectorAll('button')].find(el=>el.textContent==='Check answer'));expect(card.textContent).toContain('Show the worked solution');expect(card.textContent).not.toContain('Worked solution:');
    const saved=withoutMode(app.latest());await mode('Browse topics');await choose('focus','depth');await mode('Checked practice');expect(host.querySelector('[data-sym2-math="square"]').textContent).not.toContain('Worked solution:');expect(withoutMode(app.latest())).toEqual(saved);
    await mode('Symbol Match quiz');const check=[...host.querySelectorAll('button')].find(el=>el.textContent==='Check answer');expect(check.disabled).toBe(true);await click(check);expect(app.latest().mb_q_picked).toBeNull();expect(host.querySelector('#sym2-mq-fb')).toBeNull();
  });

  it('stays exclusive to print-reading Browse and leaves other lessons available', () => {
    for(const mb_sect of ['overview','arithmetic','measure','geometry','symbols','estimate','unknown'])expect(panel(render({mb_sect}))).toBeNull();
    for(const mb_mode of ['practice','quiz'])expect(panel(render({mb_mode}))).toBeNull();
    expect(render({mb_sect:'geometry'}).textContent).toContain('Pythagorean theorem — daily use');
    expect(render({view:'symbolsReader',sr_view:'blueprint'}).textContent).toContain('Mini blueprint: bracket BRKT-01');
  });

  it.each([false,true])('provides full-size HTML equivalents, named native44px controls and strong focus (contrast=%s)', async contrast => {
    await mount({},contrast);expect(panel().style.color).toBe(contrast?'rgb(255, 255, 255)':'rgb(15, 23, 42)');expect(panel().style.background).toBe(contrast?'rgb(0, 0, 0)':'rgb(250, 245, 255)');
    expect(panel().style.getPropertyValue('--projection-focus')).toBe(contrast?'#ffff00':'#6b21a8');const css=panel().querySelector('style').textContent;expect(css).toContain('outline:3px solid var(--projection-focus)');expect(css).toContain('transition:none!important;animation:none!important');
    for(const control of panel().querySelectorAll('button,summary,a'))expect(parseInt(control.style.minHeight)).toBeGreaterThanOrEqual(44);
    for(const group of panel().querySelectorAll('[role="group"]'))expect(group.getAttribute('aria-label')).toBeTruthy();for(const button of panel().querySelectorAll('button'))expect(button.type).toBe('button');
    expect(panel().querySelectorAll('[data-projection-reading]')).toHaveLength(3);expect($('[data-projection-relationship]').getAttribute('aria-live')).toBe('polite');expect($('[data-projection-drawing]').getAttribute('aria-label')).toContain('third-angle');
    expect(panel().querySelectorAll('animate,animateTransform,canvas,[data-callout]')).toHaveLength(0);expect(panel().querySelector('a').getAttribute('href')).toBe('https://pressbooks.nvcc.edu/cad201/chapter/multiview-drawings/');
  });
});
