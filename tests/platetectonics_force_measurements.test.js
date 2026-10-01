import fs from 'node:fs';
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
let React, ReactDOM, act;
const apps = [];
beforeAll(() => {
  const context = new Proxy({}, { get: (_, key) => key === 'measureText' ? () => ({ width: 10 }) : () => ({ addColorStop() {} }) });
  window.HTMLCanvasElement.prototype.getContext = () => context;
  window.requestAnimationFrame = globalThis.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = () => {};
  window.ResizeObserver = class { observe() {} disconnect() {} };
  window.StemLab = { registerTool() {} };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', process.env.PT_FORCES_SOURCE || 'stem_lab/stem_tool_platetectonics.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; act = React.act;
});
afterEach(() => { while (apps.length) { const app = apps.pop(); act(() => app.root.unmount()); app.host.remove(); } });
function mount() {
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOM.createRoot(host), records = vi.fn();
  let data;
  function Host() { const [saved, setSaved] = React.useState({}); data = saved; return React.createElement(window.AlloTectonicsForces, { saved, t: (_k, f) => f, onRecord(patch) { records(patch); setSaved(prev => ({ ...prev, ...patch })); } }); }
  const app = { host, root, records, data: () => data, get: selector => host.querySelector(selector), click(selector) { act(() => host.querySelector(selector).click()); },
    value(selector, value) { const node = host.querySelector(selector); act(() => { const proto = node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value); node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); }); },
    measure(distance, side = 'A') { app.value('[data-pt-forces-probe-km]', String(distance)); app.value('[data-pt-forces-probe] select', side); app.click('[data-pt-forces-probe-go]'); },
    rows: () => [...host.querySelectorAll('[data-pt-probe-table] tbody tr')], completed: () => records.mock.calls.filter(([patch]) => patch.observations || patch.preds) };
  apps.push(app); act(() => root.render(React.createElement(Host))); return app;
}
describe('Sea-floor measurement evidence', () => {
  it('asks for comparable measurements without claiming an unobserved pattern or recording on entry', () => {
    const app = mount();
    expect(app.get('[data-pt-probe-pair]')).toBeNull(); expect(app.get('[data-pt-probe-next]').textContent).toContain('two different distances on the same plate');
    expect(app.records).not.toHaveBeenCalled();
  });
  it('keeps repeated readings but does not treat one sampled distance as a pattern', () => {
    const app = mount(); app.measure(400); app.measure(400);
    expect(app.rows()).toHaveLength(2); expect(app.get('[data-pt-probe-pair]')).toBeNull();
    expect(app.get('[data-pt-probe-next]').textContent).toContain('Repeated readings at one distance');
    expect(app.rows().map(row => row.querySelector('[data-pt-probe-time]').textContent)).toEqual(['0.0', '0.0']);
    expect(app.rows().map(row => row.querySelector('[data-pt-probe-average]').textContent)).toEqual(['4.5', '4.5']);
    expect(app.completed()).toHaveLength(0);
  });
  it('compares actual values on one side and asks for the other side before drawing a both-sides conclusion', () => {
    const app = mount(); app.measure(100); app.measure(400);
    const a = app.get('[data-pt-probe-pair="A"]');
    expect(a.dataset.ptProbePattern).toBe('older'); expect(a.textContent).toContain('100 km'); expect(a.textContent).toContain('400 km');
    expect(a.textContent).toContain('recorded model time 0.0'); expect(app.get('[data-pt-probe-next]').textContent).toContain('plate B');
    app.measure(100, 'B'); app.measure(400, 'B');
    expect(app.get('[data-pt-probe-pair="B"]').dataset.ptProbePattern).toBe('older'); expect(app.get('[data-pt-probe-next]')).toBeNull();
    expect(app.completed()).toHaveLength(0);
  });
  it('does not combine measurements at different model times into a controlled distance comparison', () => {
    const app = mount(); app.measure(100); app.click('[data-pt-forces-step]'); app.measure(400);
    expect(app.rows().map(row => row.querySelector('[data-pt-probe-time]').textContent)).toEqual(['0.0', '1.0']);
    expect(app.get('[data-pt-probe-pair]')).toBeNull(); expect(app.get('[data-pt-probe-next]').textContent).toContain('different model times');
    expect(app.completed()).toHaveLength(0);
  });
  it('keeps recorded averages fixed when cutting the slab changes the separate live ridge-relative speed', () => {
    const app = mount(); app.measure(100); app.measure(400);
    const before = app.rows().map(row => row.querySelector('[data-pt-probe-average]').textContent);
    app.click('[data-pt-forces-cut]'); act(() => app.host.querySelectorAll('[data-pt-forces-predict] input')[1].click()); app.click('[data-pt-forces-lock]'); app.click('[data-pt-forces-run]');
    expect(app.rows().map(row => row.querySelector('[data-pt-probe-average]').textContent)).toEqual(before);
    expect(app.get('[data-pt-probe-current-rate]').textContent).toContain('plate A 0.9 cm/yr');
    expect(app.get('[data-pt-forces-probe-note]').textContent).toContain('over that crust’s lifetime');
    expect(app.get('[data-pt-forces-probe-note]').textContent).toContain('÷ 10');
    expect(app.data().observations || []).toHaveLength(0); expect(app.data().preds).toHaveLength(1);
  });
  it('keeps the six most recent measurements and clears this run’s probes on explicit Reset', () => {
    const app = mount(); for (const d of [100, 150, 200, 250, 300, 350, 400]) app.measure(d);
    expect(app.rows()).toHaveLength(6); expect(app.rows()[0].textContent).toContain('150');
    expect(app.get('[data-pt-probe-cards]').children).toHaveLength(6);
    app.click('[data-pt-forces-reset]'); expect(app.rows()).toHaveLength(0); expect(app.get('[data-pt-probe-pair]')).toBeNull();
    expect(app.completed()).toHaveLength(0);
  });
});
