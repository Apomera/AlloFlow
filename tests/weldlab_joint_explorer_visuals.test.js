import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const state = (extra = {}) => ({ view: 'jointCatalog', ...extra });
const names = { butt: 'Butt Joint', lap: 'Lap Joint', tjoint: 'T-Joint', corner: 'Corner Joint', edge: 'Edge Joint' };
let root;
beforeEach(() => {
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => {
  if (root) { await React.act(() => root.unmount()); root = null; }
});
function render(extra = {}, contrast = false) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('weldLab', { weldLab: state(extra) }, { isContrast: contrast });
  return host;
}
async function mount(extra = {}) {
  document.body.innerHTML = '<div id="joint-explorer-root"></div>';
  let latest;
  const updates = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: state(extra) });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData,
      update: (tool, key, value) => { updates.push([key, value]); setData(prev => ({ ...prev, [tool]: { ...prev[tool], [key]: value } })); }
    }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('joint-explorer-root'));
  await React.act(() => root.render(React.createElement(App)));
  return { state: () => latest, updates };
}
const explorer = (host = document) => host.querySelector('[data-joint-explorer]');
async function click(button) { expect(button).toBeTruthy(); await React.act(() => button.click()); }
async function stage(id) { await click(document.querySelector(`[data-joint-stage="${id}"]`)); }
async function focus(id) { await click(document.querySelector(`[data-joint-focus="${id}"]`)); }
const button = (label, scope = document) => [...scope.querySelectorAll('button')].find(b => b.textContent.replace(/^[●✓✗] /, '').trim() === label);

describe('Manual joint assembly explorer', () => {
  it.each(['butt', 'lap', 'tjoint', 'corner', 'edge'])('opens %s as an unfused fitted pair using catalog geometry', id => {
    const host = render({ jc_tab: id }), figure = explorer(host);
    expect(figure.dataset.jointExplorer).toBe(id);
    expect(figure.dataset.jointAssembly).toBe('fit');
    expect(figure.querySelectorAll('[data-joint-explorer-part="plateA"]')).toHaveLength(1);
    expect(figure.querySelectorAll('[data-joint-explorer-part="plateB"]')).toHaveLength(1);
    expect(figure.querySelector('[data-joint-explorer-part="weld"]')).toBeNull();
    expect(figure.querySelector('[data-joint-focus="weld"]').disabled).toBe(true);
    expect(figure.querySelector('[data-joint-explorer-reading]').textContent).toBeTruthy();
    expect(figure.querySelector('svg').getAttribute('aria-label')).toContain(names[id]);
    expect(figure.textContent).toContain('no fit-up dimensions are specified');
    if (id !== 'butt') {
      const original = host.querySelector(`[data-proc2="joint-${id}"]`);
      const originalPlates = [...original.querySelectorAll('[data-part="plate"]')];
      const actual = [...figure.querySelectorAll('[data-joint-explorer-part]')];
      originalPlates.forEach((plate, index) => {
        const points = `${plate.getAttribute('x')},${plate.getAttribute('y')} ${Number(plate.getAttribute('x')) + Number(plate.getAttribute('width'))},${plate.getAttribute('y')} ${Number(plate.getAttribute('x')) + Number(plate.getAttribute('width'))},${Number(plate.getAttribute('y')) + Number(plate.getAttribute('height'))} ${plate.getAttribute('x')},${Number(plate.getAttribute('y')) + Number(plate.getAttribute('height'))}`;
        const coordinates = value => value.split(/[ ,]+/).map(Number);
        expect(coordinates(actual[index].getAttribute('points'))).toEqual(coordinates(points));
      });
    }
  });

  it('moves members apart, restores fit and reveals existing weld locations without changing saved answers', async () => {
    const saved = { proc2_jqSeed: 31, proc2_jqAns: ['butt'], proc2_jqBest: 7, proc2_pos: '3G' };
    const app = await mount({ jc_tab: 'tjoint', ...saved });
    app.updates.length = 0;
    await stage('separate');
    expect(explorer().dataset.jointAssembly).toBe('separate');
    expect([...explorer().querySelectorAll('[data-joint-member-offset]')].map(g => g.dataset.jointMemberOffset)).toEqual(['0,12', '0,-16']);
    expect(explorer().querySelectorAll('[stroke-dasharray="3 3"]')).toHaveLength(2);
    await focus('plateB');
    expect(explorer().querySelector('[data-joint-explorer-highlight]').dataset.jointExplorerHighlight).toBe('plateB');
    await stage('fit');
    expect([...explorer().querySelectorAll('[data-joint-member-offset]')].map(g => g.dataset.jointMemberOffset)).toEqual(['0,0', '0,0']);
    await stage('weld');
    await focus('weld');
    expect(explorer().querySelector('[data-joint-explorer-highlight]').textContent).toContain('Weld metal');
    const originalWelds = [...document.querySelector('[data-proc2="joint-tjoint"]').querySelectorAll('[data-part="weld"]')].map(w => w.getAttribute('points'));
    expect([...explorer().querySelectorAll('[data-joint-explorer-part="weld"]')].map(w => w.getAttribute('points'))).toEqual(originalWelds);
    expect(app.updates).toEqual([]);
    expect(app.state()).toMatchObject(saved);
    await stage('fit');
    expect(explorer().querySelector('[data-joint-explorer-highlight]').dataset.jointExplorerHighlight).toBe('plateA');
    expect(explorer().querySelector('[data-joint-explorer-part="weld"]')).toBeNull();
  });

  it('keeps every chosen butt preparation exact, including J/U curves, through preparation changes', async () => {
    const app = await mount({ jc_tab: 'butt', proc2_prep: 'square' });
    await stage('weld');
    await focus('plateB');
    for (const [prep, label] of [['square', 'Square groove'], ['v', 'Single-V groove'], ['bevel', 'Single-bevel groove'], ['j', 'J-groove'], ['u', 'U-groove']]) {
      await click(button(label, document.querySelector('[role="radiogroup"][aria-label="Edge preparation"]')));
      expect(app.state().proc2_prep).toBe(prep);
      expect(explorer().dataset.jointExplorerPrep).toBe(prep);
      expect(explorer().dataset.jointAssembly).toBe('weld');
      expect(explorer().querySelector('[data-joint-explorer-highlight]').dataset.jointExplorerHighlight).toBe('plateB');
      const original = [...document.querySelector(`[data-proc2="prep-${prep}"]`).querySelectorAll('path')].slice(0, 3).map(path => path.getAttribute('d'));
      expect([...explorer().querySelectorAll('[data-joint-explorer-part]')].map(path => path.getAttribute('d'))).toEqual(original);
    }
    await click(document.querySelector('[role="tab"][id="proc2-tab-lap"]'));
    expect(explorer().dataset.jointExplorer).toBe('lap');
    expect(explorer().dataset.jointAssembly).toBe('weld');
    expect(explorer().hasAttribute('data-joint-explorer-prep')).toBe(false);
  });

  it('is absent during quiz recall and preserves first-answer locking and explained feedback', async () => {
    const app = await mount({ proc2_jqOn: true, proc2_jqSeed: 31, proc2_jqIdx: 0, proc2_jqAns: [] });
    expect(explorer()).toBeNull();
    const item = window.__WeldLabCore.proc.jqBuild(31)[0];
    const wrong = Object.keys(names).find(id => id !== item.joint);
    await click(button(names[wrong]));
    expect(app.state().proc2_jqAns).toEqual([wrong]);
    expect(document.body.textContent).toContain('Why not');
    await click(button(names[item.joint]));
    expect(app.state().proc2_jqAns).toEqual([wrong]);
    expect(explorer()).toBeNull();
  });

  it('normalizes hostile catalog choices and uses native contrast-safe controls with HTML readings', () => {
    const host = render({ jc_tab: '__proto__', proc2_prep: { a: 'v' } }, true), figure = explorer(host);
    expect(figure.dataset.jointExplorer).toBe('butt');
    expect(figure.dataset.jointExplorerPrep).toBe('square');
    expect(figure.style.background).toBe('rgb(0, 0, 0)');
    expect(figure.querySelector('svg').style.background).toBe('rgb(0, 0, 0)');
    expect(figure.querySelector('h3').style.color).toBe('rgb(255, 255, 0)');
    expect(figure.querySelector('[data-joint-explorer-reading]').style.color).toBe('rgb(255, 255, 255)');
    for (const control of figure.querySelectorAll('button')) {
      expect(control.tagName).toBe('BUTTON');
      expect(control.style.minHeight).toBe('44px');
      expect(control.style.background).toBe('rgb(0, 0, 0)');
    }
    expect(figure.innerHTML).not.toMatch(/NaN|Infinity|<animate/);
  });
});
