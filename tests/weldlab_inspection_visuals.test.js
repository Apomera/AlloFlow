import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'inspection', insp_sect: 'ndt', insp2_ndtMode: 'choose' };
let root, host;
const core = () => window.__WeldLabCore;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  host?.remove();
});
function render(extra = {}, contrast = false) {
  const el = document.createElement('div');
  el.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast });
  return el;
}
async function mount(extra = {}, contrast = false) {
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData, isContrast: contrast,
      update: (id, key, value) => setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })),
    }));
  }
  host = document.createElement('div'); document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
async function click(selector) {
  const el = host.querySelector(selector); expect(el, selector).toBeTruthy();
  await React.act(() => el.click());
}
async function buttonText(text) {
  const el = [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text); expect(el, text).toBeTruthy();
  await React.act(() => el.click());
}
async function factor(group, text) {
  const container = host.querySelector(`[role="radiogroup"][aria-label="${group}"]`);
  const el = [...container.querySelectorAll('button')].find(el => el.textContent.includes(text)); expect(el).toBeTruthy();
  await React.act(() => el.click());
}

describe('NDT shared specimen explorer', () => {
  it('uses the same status and reason as the chooser model for every material, flaw, access and method', () => {
    for (const mat of ['cs', 'ss304', 'al']) for (const flaw of ['surf_crack', 'lamination', 'porosity', 'lof']) for (const access of ['both', 'one', 'thin']) {
      const rank = core().insp2NdtRank(mat, flaw, access);
      for (const method of ['mt', 'pt', 'ut', 'rt']) {
        const el = render({ insp2_ndtMat: mat, insp2_ndtFlaw: flaw, insp2_ndtAccess: access, insp2_ndtDemo: method });
        const scene = el.querySelector('[data-inspection-specimen]'), result = scene.querySelector('[data-inspection-method-result]');
        expect(scene.dataset).toMatchObject({ inspectionSpecimen: method, material: mat, flaw, access, view: 'section' });
        expect(result.dataset.status).toBe(rank[method].s);
        expect(result.dataset.reason).toBe(rank[method].c);
        expect(result.textContent.trim().length).toBeGreaterThan(35);
        expect(scene.querySelector('[data-inspection-specimen-flaw]').dataset.inspectionSpecimenFlaw).toBe(flaw);
        expect(scene.querySelector('[data-inspection-reverse-access]').dataset.inspectionReverseAccess).toBe(access === 'one' ? 'blocked' : 'reachable');
      }
    }
  });

  it('hides buried flaws in the surface view and exposes their schematic location in a cutaway without changing the job', async () => {
    const latest = await mount({ insp2_ndtFlaw: 'porosity', insp2_ndtMat: 'ss304', insp2_ndtAccess: 'one' });
    expect(host.querySelector('[data-inspection-specimen-flaw]').children.length).toBe(3);
    await click('[data-inspection-view="surface"]');
    const flaw = host.querySelector('[data-inspection-specimen-flaw]');
    expect(flaw.dataset.visible).toBe('false');
    expect(flaw.children).toHaveLength(0);
    expect(host.querySelector('[data-inspection-specimen-observation]').textContent).toContain('not exposed in this surface view');
    await click('[data-inspection-view="section"]');
    expect(host.querySelector('[data-inspection-specimen-flaw]').dataset.visible).toBe('true');
    expect(latest()).toMatchObject({ insp2_ndtFlaw: 'porosity', insp2_ndtMat: 'ss304', insp2_ndtAccess: 'one' });
  });

  it('keeps a surface-opening crack visible in either view and draws internal planar flaws in their authored orientation', async () => {
    await mount();
    await click('[data-inspection-view="surface"]');
    expect(host.querySelector('[data-inspection-specimen-flaw]').dataset.visible).toBe('true');
    expect(host.querySelector('[data-inspection-specimen-flaw] path')).toBeTruthy();
    await click('[data-inspection-view="section"]');
    await factor('Discontinuity', 'Lamination');
    const lam = host.querySelector('[data-inspection-specimen-flaw] line');
    expect(lam.getAttribute('y1')).toBe(lam.getAttribute('y2'));
    await factor('Discontinuity', 'Lack of fusion');
    const lof = host.querySelector('[data-inspection-specimen-flaw] line');
    expect(lof.getAttribute('x1')).not.toBe(lof.getAttribute('x2'));
    expect(lof.getAttribute('y1')).not.toBe(lof.getAttribute('y2'));
  });

  it('synchronizes method selection with the existing detailed demo in both directions', async () => {
    const latest = await mount();
    for (const method of ['pt', 'ut', 'rt', 'mt']) {
      await click(`[data-inspection-method="${method}"]`);
      expect(latest().insp2_ndtDemo).toBe(method);
      expect(host.querySelector('[data-inspection-specimen]').dataset.inspectionSpecimen).toBe(method);
      const group = host.querySelector('[aria-label="Pick a method demo"]');
      expect(group.querySelector('[aria-checked="true"]').textContent.toLowerCase().startsWith(method + ':')).toBe(true);
    }
    const detailedUt = [...host.querySelector('[aria-label="Pick a method demo"]').querySelectorAll('button')].find(el => el.textContent.startsWith('UT:'));
    await React.act(() => detailedUt.click());
    expect(host.querySelector('[data-inspection-method="ut"]').getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-inspection-method-path]').dataset.inspectionMethodPath).toBe('ut');
  });

  it('explains one-sided RT and nonmagnetic MT using existing reasons without drawing a successful indication', async () => {
    await mount({ insp2_ndtDemo: 'rt', insp2_ndtAccess: 'one', insp2_ndtMat: 'ss304' });
    const result = () => host.querySelector('[data-inspection-method-result]');
    expect(result().dataset.reason).toBe('rt_one_side');
    expect(result().textContent).toContain('cannot be set up');
    const detector = host.querySelector('[data-inspection-method-path] rect');
    expect(detector.getAttribute('fill')).toBe('none');
    expect(detector.getAttribute('stroke-dasharray')).toBe('4 3');
    await click('[data-inspection-method="mt"]');
    expect(result().dataset.reason).toBe('mt_aus');
    expect(result().textContent).toContain('non-magnetic');
    expect(host.querySelector('[data-inspection-method-path]').querySelectorAll('path')).toHaveLength(1); // yoke, no field through the material
    await factor('Material', 'Carbon steel');
    expect(host.querySelector('[data-inspection-method-path]').querySelectorAll('path')).toHaveLength(2);
    expect(result().dataset.reason).toBe('mt_surface');
  });

  it('does not render specimen methods or recommendations in quiz mode, and preserves first-answer locks and bench progress', async () => {
    const bench = { uc1: { pick: 'reject', recs: [6.5] } };
    const latest = await mount({ insp2_ndtMode: 'quiz', insp2_bench: bench });
    expect(host.querySelector('[data-inspection-specimen]')).toBeNull();
    expect(host.textContent).not.toContain('Best answer:');
    expect(host.textContent).not.toContain('MT needs a ferromagnetic part');
    const choices = () => host.querySelector('[aria-label="Pick the best NDT method"]').querySelectorAll('button');
    await React.act(() => choices()[0].click());
    expect(latest().insp2_ndtQuiz).toEqual({ 0: 0 });
    expect([...choices()].every(button => button.disabled)).toBe(true);
    await buttonText('🧭 Chooser');
    await click('[data-inspection-method="ut"]');
    await click('[data-inspection-view="surface"]');
    await buttonText('📝 Quiz: 8 cases');
    expect(host.querySelector('[data-inspection-specimen]')).toBeNull();
    await React.act(() => choices()[1].click());
    expect(latest().insp2_ndtQuiz).toEqual({ 0: 0 });
    expect(latest().insp2_bench).toEqual(bench);
  });

  it('normalizes hostile chooser saves before drawing or looking up method details', () => {
    const el = render({ insp2_ndtMat: '__proto__', insp2_ndtFlaw: {}, insp2_ndtAccess: 'constructor', insp2_ndtDemo: 'invalid', insp2_ndtMode: [] });
    const scene = el.querySelector('[data-inspection-specimen]');
    expect(scene.dataset).toMatchObject({ inspectionSpecimen: 'mt', material: 'cs', flaw: 'surf_crack', access: 'both' });
    expect(scene.querySelector('[data-inspection-method-result]').dataset.reason).toBe('mt_surface');
    expect(scene.innerHTML).not.toMatch(/(?:NaN|Infinity|undefined)/);
  });

  it('uses responsive manual controls, named diagrams and distinct contrast selected states without motion', () => {
    const el = render({}, true), scene = el.querySelector('[data-inspection-specimen]');
    expect(scene.style.background).toBe('rgb(0, 0, 0)');
    expect(scene.style.color).toBe('rgb(255, 255, 255)');
    expect(scene.querySelector('h4').style.color).toBe('rgb(255, 255, 0)');
    for (const button of scene.querySelectorAll('button')) {
      expect(button.style.minHeight).toBe('44px');
      expect(button.className).toContain('focus:ring-4');
      expect(button.style.background).toBe(button.getAttribute('aria-pressed') === 'true' ? 'rgb(255, 255, 0)' : 'rgb(0, 0, 0)');
      expect(button.style.color).toBe(button.getAttribute('aria-pressed') === 'true' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 0)');
    }
    expect(scene.querySelector('figure').parentElement.style.flexWrap).toBe('wrap');
    expect(scene.querySelector('svg').getAttribute('role')).toBe('img');
    expect(scene.querySelector('svg').getAttribute('aria-label')).toContain('not a measured indication');
    expect(scene.querySelector('animate,animateTransform')).toBeNull();
    expect(scene.textContent).toContain('not a detection result');
    expect(scene.textContent).toContain('No flaw size, acceptance decision or test result is predicted');
  });

  it('keeps the actual flaw strokes visible against dark metal in contrast mode', () => {
    for (const flaw of ['surf_crack', 'lamination', 'lof']) {
      const el = render({ insp2_ndtFlaw: flaw }, true);
      const indication = el.querySelector('[data-inspection-specimen-flaw] path, [data-inspection-specimen-flaw] line');
      expect(indication).toBeTruthy();
      expect(indication.getAttribute('stroke')).toBe('#ffffff');
      expect(Number(indication.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(4);
      const weld = el.querySelector('[data-inspection-specimen-diagram] > path');
      expect(weld.getAttribute('fill')).toBe('#000000');
    }
  });
});
