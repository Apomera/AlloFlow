import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'robotic', rob_sect: 'vision' };
const METHODS = ['laser', 'touch', 'arc', 'map'];
const DESCRIPTIONS = {
  laser: 'A laser line projected ahead of the torch + a camera detects where the line falls on the part. The control system calculates where the actual joint is + adjusts torch path. Used for long longitudinal welds where part may bow slightly.',
  touch: 'Robot touches the part with the welding wire (or a separate probe) to establish reference points before welding. Slower setup but very accurate. Used when part position is uncertain.',
  arc: 'The robot weaves the arc + monitors voltage. When arc length differs side-to-side, it indicates joint asymmetry. Robot adjusts position. No additional sensor needed — uses the arc itself. Common for fillet welds.',
  map: 'Cameras + projected light pattern build a 3D model of the part in real-time. Robot uses this to plan path. Most advanced + expensive systems ($50-200K added cost).',
};
let root, host;
const bench = (node = host) => node.querySelector('[data-robot-sensing]');
const num = (node, key) => Number(node.getAttribute(key));
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
function render(extra = {}, contrast = false) {
  const node = document.createElement('div');
  node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast }); return node;
}
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (id, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })); },
    }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function method(id) { await click(host.querySelector('[data-robot-sensing-method="' + id + '"]')); }
async function position(value) { await React.act(() => Simulate.change(host.querySelector('[data-robot-sensing-position]'), { target: { value: String(value) } })); }
async function buttonText(text) { await click([...host.querySelectorAll('button')].find(node => node.textContent.trim() === text)); }

describe('Robot sensor-location bench', () => {
  it('replaces the static sensor list only in the vision topic and preserves the variation introduction', () => {
    const node = render(), section = bench(node);
    expect(section.dataset).toMatchObject({ robotSensing: 'laser', position: '50' });
    expect(section.querySelectorAll('[data-robot-sensing-method]')).toHaveLength(4);
    expect(node.textContent).toContain('Gaps vary, fit-up varies, fixtures drift, parts arrive bent');
    for (const sect of ['overview', 'brands', 'program', 'pendant', 'cobots', 'sorter', 'careers', 'invalid']) expect(bench(render({ rob_sect: sect }))).toBeNull();
  });

  it('links every method to its exact original description, observation location and legend', async () => {
    await mount();
    for (const id of METHODS) {
      await method(id); const section = bench();
      expect(section.dataset.robotSensing).toBe(id);
      expect(section.querySelectorAll('[data-robot-sensing-method][aria-pressed="true"]')).toHaveLength(1);
      expect(section.querySelector('[data-robot-sensing-method="' + id + '"]').getAttribute('aria-pressed')).toBe('true');
      expect(section.querySelector('[data-robot-sensing-diagram]').dataset.robotSensingDiagram).toBe(id);
      expect(section.querySelector('[data-robot-sensing-reading]').dataset.robotSensingReading).toBe(id);
      expect(section.querySelector('[data-robot-sensing-authored]').textContent).toBe(DESCRIPTIONS[id]);
      expect(section.querySelector('[data-robot-sensing-location]').dataset.robotSensingLocation).toBe(id);
      expect(section.querySelector('[data-robot-sensing-legend]').dataset.robotSensingLegend).toBe(id);
      expect(section.querySelector('[data-robot-sensing-reading]').getAttribute('aria-live')).toBe('polite');
      expect(section.querySelector('[data-robot-sensing-diagram]').getAttribute('aria-label').length).toBeGreaterThan(100);
    }
  });

  it('moves the inspection position around one unchanged joint and keeps laser observation ahead', async () => {
    await mount(); const joint = bench().querySelector('[data-robot-sensing-joint]').outerHTML;
    for (const id of METHODS) {
      await method(id);
      for (const p of [0, 25, 50, 71, 100]) {
        await position(p);
        const x = 100 + 3.8 * p, torch = bench().querySelector('[data-robot-sensing-torch]'), focus = bench().querySelector('[data-robot-sensing-focus]');
        expect(num(torch, 'data-x')).toBeCloseTo(x, 10);
        expect(torch.getAttribute('transform')).toBe('translate(' + x + ' 0)');
        expect(num(focus, 'data-x')).toBeCloseTo(x + (id === 'laser' ? 65 : id === 'map' ? 10 : 0), 10);
        expect(num(focus, 'data-y')).toBe(220);
        expect(bench().querySelector('[data-robot-sensing-joint]').outerHTML).toBe(joint);
        if (id === 'laser') {
          const laser = bench().querySelector('[data-robot-sensing-laser]');
          expect(num(laser, 'data-observation-x')).toBeGreaterThan(x);
          const line = laser.querySelector('line'); expect(num(line, 'x1')).toBeCloseTo(x + 65, 10);
        }
      }
    }
  });

  it('distinguishes contact before welding from arc observation and a qualitative surface map', async () => {
    await mount(); await method('touch');
    expect(bench().querySelector('[data-robot-sensing-contact]')).toBeTruthy();
    expect(bench().querySelector('[data-robot-sensing-arc]')).toBeNull();
    const wire = bench().querySelector('[data-robot-sensing-torch] > line');
    expect(num(wire, 'y2')).toBe(220);
    expect(bench().querySelector('[data-robot-sensing-joint] > path').getAttribute('d')).toContain('V220');
    expect(bench().querySelector('[data-robot-sensing-location]').textContent).toContain('Before welding');
    await method('arc');
    expect(bench().querySelector('[data-robot-sensing-contact]')).toBeNull();
    expect(bench().querySelector('[data-robot-sensing-arc]')).toBeTruthy();
    expect(bench().querySelector('[data-robot-sensing-weave] path').getAttribute('stroke-dasharray')).toBe('6 5');
    expect(bench().querySelector('[data-robot-sensing-laser]')).toBeNull();
    await method('map');
    expect(bench().querySelector('[data-robot-sensing-arc]')).toBeNull();
    expect(bench().querySelector('[data-robot-sensing-contact]')).toBeNull();
    expect(bench().querySelector('[data-robot-sensing-map]').dataset.qualitative).toBe('true');
    expect(bench().querySelector('[data-robot-sensing-map]').querySelectorAll('path').length).toBeGreaterThan(8);
    expect(bench().querySelector('[data-robot-sensing-location]').textContent).toContain('surface map');
    expect(bench().querySelector('[data-robot-sensing-note]').textContent).toContain('not measured data, sensing distance, accuracy or an adaptive-control result');
    expect(bench().querySelector('meter,progress,select,input[type="number"]')).toBeNull();
    expect(bench().querySelectorAll('output')).toHaveLength(1);
    expect(bench().querySelector('output').textContent).toBe('50%');
  });

  it('clips the surface map to the fixed plate footprint at either end without clipping the camera', async () => {
    await mount(); await method('map');
    for (const value of [0, 100]) {
      await position(value);
      const mesh = bench().querySelector('[data-robot-sensing-mesh]');
      expect(mesh.getAttribute('clip-path')).toBe('url(#rob5-part-surface)');
      const clip = bench().querySelector('#rob5-part-surface');
      expect(clip.getAttribute('clipPathUnits')).toBe('userSpaceOnUse');
      const part = clip.querySelector('rect');
      expect(['x', 'y', 'width', 'height'].map(key => num(part, key))).toEqual([45, 182, 550, 88]);
      expect(mesh.querySelectorAll('path')).toHaveLength(12);
      expect(bench().querySelector('[data-robot-sensing-map] > g[transform]')).toBeTruthy();
    }
  });

  it('provides bounded manual checkpoints and retains position while switching methods', async () => {
    await mount();
    for (const p of [0, 50, 100]) {
      await click(bench().querySelector('[data-robot-sensing-stop="' + p + '"]'));
      expect(bench().dataset.position).toBe(String(p));
      expect(bench().querySelectorAll('[data-robot-sensing-stop][aria-pressed="true"]')).toHaveLength(1);
    }
    await position(73.7); expect(bench().dataset.position).toBe('74');
    await position('bad'); await position(''); await position('Infinity'); expect(bench().dataset.position).toBe('74');
    await position(-9); expect(bench().dataset.position).toBe('0');
    await position(999); expect(bench().dataset.position).toBe('100');
    await position(36); await method('touch'); await method('map'); expect(bench().dataset.position).toBe('36');
    expect(bench().querySelector('[data-robot-sensing-position]').value).toBe('36');
  });

  it('leaves persisted programs, tracking state and sorter decisions unchanged and restores local inspection across topics', async () => {
    const program = [{ x: 3, y: 4, m: 'J', w: false }, { x: 7, y: 4, m: 'L', w: true }];
    const app = await mount({ tech2_rob_prog: program, tech2_rob_mode: 'L', tech2_rob_arc: true, tech2_rob_shift: true, tech2_rob_track: true, tech2_rob_sort: { 0: 'robot', 2: 'manual' }, rob4_job: 2, rob4_lens: 'fit' });
    const before = JSON.stringify(app.latest()), writes = app.writes.length;
    for (const id of METHODS) { await method(id); await position(82); }
    expect(JSON.stringify(app.latest())).toBe(before); expect(app.writes).toHaveLength(writes);
    await buttonText('🤝 Collaborative cobots'); expect(bench()).toBeNull();
    await buttonText('👁 Vision + adaptive control'); expect(bench().dataset).toMatchObject({ robotSensing: 'map', position: '82' });
    expect(JSON.stringify(app.latest())).toBe(before);
  });

  it('uses full-size native controls, full-size HTML labels and explicit contrast without autoplay', async () => {
    await mount({}, true); const section = bench();
    expect(section.style.background).toBe('rgb(0, 0, 0)'); expect(section.style.color).toBe('rgb(255, 255, 255)');
    expect(section.querySelector('h4').style.color).toBe('rgb(255, 255, 0)');
    expect(section.querySelector('[role="group"]').className).toContain('flex-wrap');
    const slider = section.querySelector('[data-robot-sensing-position]');
    expect(slider.type).toBe('range'); expect(slider.min).toBe('0'); expect(slider.max).toBe('100'); expect(slider.step).toBe('1');
    expect(slider.style.minHeight).toBe('44px'); expect(slider.getAttribute('aria-valuetext')).toContain('along the schematic joint');
    expect(section.querySelector('label[for="' + slider.id + '"]')).toBeTruthy();
    for (const button of section.querySelectorAll('button')) {
      expect(button.type).toBe('button'); expect(button.style.minHeight).toBe('44px'); expect(button.className).toContain('focus:ring-4');
      const on = button.getAttribute('aria-pressed') === 'true';
      expect(button.style.background).toBe(on ? 'rgb(255, 255, 0)' : 'rgb(0, 0, 0)');
      expect(button.style.color).toBe(on ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 0)');
    }
    expect(section.querySelector('[data-robot-sensing-legend]').className).toContain('text-sm');
    expect(section.querySelector('[data-robot-sensing-legend]').style.color).toBe('rgb(255, 255, 255)');
    expect(section.querySelector('[data-robot-sensing-diagram]').querySelector('text')).toBeNull();
    expect(section.querySelector('[data-robot-sensing-diagram]').style.width).toBe('100%');
    await React.act(() => section.querySelector('[data-robot-sensing-method="touch"]').focus());
    expect(section.dataset.robotSensing).toBe('laser');
    await method('touch');
    expect(section.querySelector('[data-robot-sensing-method="touch"]').style.background).toBe('rgb(255, 255, 0)');
    expect(section.querySelector('[data-robot-sensing-method="laser"]').style.background).toBe('rgb(0, 0, 0)');
    expect(section.querySelector('animate,animateTransform,canvas,[style*="animation"]')).toBeNull();
  });
});
