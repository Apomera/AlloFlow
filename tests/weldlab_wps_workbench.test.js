import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
let root, host;
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
const seed = extra => ({ view: 'codes', insp2_codesTab: 'flow', ...extra });
const fragment = (extra = {}, contrast = false) => {
  const el = document.createElement('div');
  el.innerHTML = renderTool('weldLab', { weldLab: seed(extra) }, { isContrast: contrast });
  return el;
};
async function mount(extra = {}) {
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: seed(extra) });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData,
      update: (bucket, key, value) => setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })),
    }));
  }
  host = document.createElement('div');
  document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}

describe('WPS shop-floor workbench', () => {
  it('locates all eleven sample fields and repeats each written value without inventing operating settings', () => {
    const objects = { pqr: 'record', process: 'power', joint: 'joint', base: 'stock', filler: 'filler', pos: 'position', preheat: 'temperature', pwht: 'treatment', gas: 'gas', elec: 'power', travel: 'travel' };
    for (const [field, object] of Object.entries(objects)) {
      const el = fragment({ insp2_wpsField: field });
      const scene = el.querySelector('[data-wps-workbench]');
      const form = el.querySelector(`[data-wps-form-field="${field}"]`);
      const value = scene.querySelector('[data-wps-field-value]').textContent;
      expect(scene.dataset.wpsWorkbench).toBe(field);
      expect(form.getAttribute('aria-checked')).toBe('true');
      expect(form.textContent).toContain(value);
      expect(scene.querySelector('svg').getAttribute('aria-label')).toContain(value);
      expect(scene.querySelectorAll('[data-active="true"]')).toHaveLength(1);
      expect(scene.querySelector('[data-active="true"]').dataset.wpsPhysicalObject).toBe(object);
      expect(scene.textContent).toContain('not a working procedure');
    }
  });

  it('synchronizes the dropdown, form and scene in both directions while preserving sorter history', async () => {
    const current = await mount({ insp2_sort: { speed: 'ok' } });
    await React.act(() => Simulate.change(host.querySelector('[data-wps-field-select]'), { target: { value: 'gas' } }));
    expect(current().insp2_wpsField).toBe('gas');
    expect(host.querySelector('[data-wps-form-field="gas"]').getAttribute('aria-checked')).toBe('true');
    expect(host.querySelector('[data-wps-field-value]').textContent).toContain('90% argon / 10% CO2');
    await React.act(() => host.querySelector('[data-wps-form-field="joint"]').click());
    expect(host.querySelector('[data-wps-field-select]').value).toBe('joint');
    expect(host.querySelector('[data-wps-field-marker]').dataset.wpsFieldMarker).toBe('joint');
    expect(current().insp2_sort).toEqual({ speed: 'ok' });
  });

  it('walks fields with native buttons and stops at both ends', async () => {
    const current = await mount({ insp2_wpsField: 'pqr' });
    expect(host.querySelector('[data-wps-field-prev]').disabled).toBe(true);
    await React.act(() => host.querySelector('[data-wps-field-next]').click());
    expect(current().insp2_wpsField).toBe('process');
    await React.act(() => Simulate.change(host.querySelector('[data-wps-field-select]'), { target: { value: 'travel' } }));
    expect(host.querySelector('[data-wps-field-next]').disabled).toBe(true);
    await React.act(() => host.querySelector('[data-wps-field-prev]').click());
    expect(current().insp2_wpsField).toBe('elec');
  });

  it('uses a valid fallback for malformed saves and keeps the illustration outside both quizzes', () => {
    for (const value of ['__proto__', {}, null, 99]) {
      const el = fragment({ insp2_wpsField: value });
      expect(el.querySelector('[data-wps-workbench]').dataset.wpsWorkbench).toBe('process');
      expect(el.textContent).not.toMatch(/NaN|undefined/);
    }
    for (const tab of ['read', 'sort', 'clause']) expect(fragment({ insp2_codesTab: tab }).querySelector('[data-wps-workbench]')).toBeNull();
  });

  it('provides native labelled controls and an explicit contrast palette', () => {
    const el = fragment({}, true), scene = el.querySelector('[data-wps-workbench]');
    expect(scene.style.background).toBe('rgb(0, 0, 0)');
    expect(scene.style.color).toBe('rgb(255, 255, 0)');
    const select = scene.querySelector('select');
    expect(scene.querySelector(`label[for="${select.id}"]`)).toBeTruthy();
    for (const control of scene.querySelectorAll('button,select')) {
      expect(control.style.minHeight).toBe('44px');
      expect(control.style.color).toBe('rgb(255, 255, 0)');
      expect(control.style.background).toBe('rgb(0, 0, 0)');
    }
    expect(scene.querySelector('svg').getAttribute('role')).toBe('img');
  });
});
