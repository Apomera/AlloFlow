import fs from 'node:fs';
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
let React, ReactDOM, act;
const hosts = [];
beforeAll(() => {
  window.StemLab = { registerTool() {} };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'stem_lab/stem_tool_platetectonics.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; act = React.act || React.unstable_act;
});
afterEach(() => { while (hosts.length) { const host = hosts.pop(); act(() => ReactDOM.unmountComponentAtNode(host)); host.remove(); } });
function mount(initial = {}) {
  const host = document.createElement('div'); document.body.appendChild(host); hosts.push(host);
  let saved;
  const record = vi.fn(), announce = vi.fn();
  function Host() {
    const state = React.useState(initial); saved = state[0];
    return React.createElement(window.AlloTectonicsHotspotLab, { saved, t: (_key, fallback) => fallback,
      announceToSR: announce, onRecord(patch) { record(patch); state[1](prev => ({ ...prev, ...patch })); } });
  }
  act(() => ReactDOM.render(React.createElement(Host), host));
  return { host, state: () => saved, record, announce };
}
function input(app, selector, value) {
  const node = app.host.querySelector(selector);
  act(() => {
    const proto = node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, String(value));
    node.dispatchEvent(new window.Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
const click = node => act(() => node.click());
const key = (node, value) => act(() => node.dispatchEvent(new window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })));

describe('Hotspot observations through overall fit', () => {
  it('connects the selected observation, calculation and chart without revealing or committing a fit', () => {
    const app = mount();
    expect(app.record).not.toHaveBeenCalled();
    input(app, '#pt-hl-observe-island', 'midway');
    expect(app.host.querySelector('#pt-hl-calc-island').value).toBe('midway');
    expect(app.host.querySelector('[data-pt-hotspot-selected="true"]').dataset.ptHotspotPoint).toBe('midway');
    expect(app.host.querySelector('[data-pt-hotspot-observed]').textContent).toContain('2,432 km');
    const compare = app.host.querySelector('[data-pt-hotspot-compare]');
    expect(compare.textContent).toContain('predicts 1,108 km');
    expect(compare.textContent).toContain('1,324 km below');
    input(app, '#pt-hl-rate', 100);
    expect(compare.textContent).toContain('predicts 2,770 km');
    expect(compare.textContent).toContain('338 km above');
    expect(app.state().est).toBeUndefined(); expect(app.host.querySelector('[data-pt-hotspot-best-fit]')).toBeNull();
  });

  it('keeps exact-rate text as a local draft until Enter and saves only the existing numeric schema', () => {
    const app = mount(), number = app.host.querySelector('[data-pt-hotspot-rate-number]');
    input(app, '[data-pt-hotspot-rate-number]', '1.5');
    expect(number.value).toBe('1.5'); expect(app.host.querySelector('#pt-hl-rate').value).toBe('40');
    expect(app.record).not.toHaveBeenCalled();
    key(number, 'Enter');
    expect(app.host.querySelector('#pt-hl-rate').value).toBe('15');
    expect(app.state()).toEqual({ draftRate: 15, completed: null, bestEst: null, evidence: null });
    input(app, '[data-pt-hotspot-rate-number]', '21.5'); key(number, 'Enter');
    expect(number.value).toBe('20.0'); expect(app.state().draftRate).toBe(200);
    input(app, '[data-pt-hotspot-rate-number]', '0.5'); key(number, 'Enter');
    expect(number.value).toBe('1.0'); expect(app.state().draftRate).toBe(10);
    expect(app.state().est).toBeUndefined();
  });

  it('commits the pending rate when Lock is clicked and keeps both line styles distinguishable', () => {
    const app = mount(); input(app, '[data-pt-hotspot-rate-number]', '9.8');
    click(app.host.querySelector('[data-pt-hotspot-commit]'));
    expect(app.state().est).toBe(98);
    expect(app.host.querySelector('[data-pt-hotspot-result]').dataset.ptHotspotResult).toBe('close');
    expect(app.host.querySelector('[data-pt-hotspot-line="estimate"]').getAttribute('stroke-dasharray')).toBe('7 5');
    expect(app.host.querySelector('[data-pt-hotspot-best-fit]')).toBeTruthy();
    expect(app.host.querySelector('[data-pt-hotspot-line-legend]').textContent).toContain('Overall fit (solid)');
    expect(document.activeElement).toBe(app.host.querySelector('[data-pt-hotspot-retry]'));
    expect(app.host.querySelector('[data-pt-hotspot-rate-number]').disabled).toBe(true);
  });

  it('uses a checked calculation as a draft line and returns focus for comparison', () => {
    const app = mount(); input(app, '#pt-hl-calc-rate', '10.2');
    click(app.host.querySelector('[data-pt-hotspot-calc-check]'));
    click(app.host.querySelector('[data-pt-hotspot-calc-use]'));
    expect(app.state().draftRate).toBe(102);
    expect(app.host.querySelector('[data-pt-hotspot-rate-number]').value).toBe('10.2');
    expect(document.activeElement).toBe(app.host.querySelector('#pt-hl-rate'));
    expect(app.state().est).toBeUndefined(); expect(app.host.querySelector('[data-pt-hotspot-best-fit]')).toBeNull();
    expect(app.announce).toHaveBeenCalledWith(expect.stringContaining('Compare it with several observations'));
  });

  it('revises a committed rate while keeping the existing calculation, direction and draft fields', () => {
    const calculation = { island: 'kauai', value: '10.2', checked: true };
    const app = mount({ est: 98, draftRate: 98, dir: 'nw', calculation });
    click(app.host.querySelector('[data-pt-hotspot-retry]'));
    expect(app.state()).toEqual({ est: null, draftRate: 98, dir: 'nw', calculation,
      completed: { est: 98, dir: 'nw' }, bestEst: 98, evidence: { est: 98, dir: 'nw' } });
    expect(app.host.querySelector('[data-pt-hotspot-rate-number]').value).toBe('9.8');
    expect(document.activeElement).toBe(app.host.querySelector('#pt-hl-rate'));
    expect(app.host.querySelector('[data-pt-hotspot-best-fit]')).toBeNull();
    expect(app.host.querySelector('[data-pt-hotspot-model-note]').textContent).toContain('assume a fixed hotspot');
    expect(app.host.querySelector('[data-pt-hotspot-table] tbody th[scope="row"]')).toBeTruthy();
  });
});
