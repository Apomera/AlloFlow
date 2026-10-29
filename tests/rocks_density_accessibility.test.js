import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { flushSync } = require(resolve('desktop/web-app/node_modules/react-dom'));
const cleanup = [];
function find(node, predicate) {
  if (Array.isArray(node)) { for (const child of node) { const match = find(child, predicate); if (match) return match; } return null; }
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  return node.props ? find(node.props.children, predicate) : null;
}
function mount(densityLab = {}, overrides = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  let store = { rocks: { mode: 'densityLab', densityLab }, rockCycle: {} }, update, tree;
  const root = ReactDOMClient.createRoot(host);
  function App() {
    const [, force] = React.useState(0); update = () => force((n) => n + 1);
    const ctx = makeCtx({ ...overrides, toolData: store, setToolData: (arg) => { store = typeof arg === 'function' ? arg(store) : arg; update(); } });
    tree = window.StemLab._registry.rocks.render(ctx);
    return tree;
  }
  flushSync(() => root.render(React.createElement(App)));
  const get = (selector) => { const result = host.querySelector(selector); expect(result, selector).toBeTruthy(); return result; };
  const click = (selector, drain = true) => {
    const button = get(selector); button.focus();
    flushSync(() => button.click());
    if (drain) flushSync(() => vi.runOnlyPendingTimers());
    return button;
  };
  const change = (attr, value) => flushSync(() => find(tree, (node) => node.props?.[attr] === true).props.onChange({target:{value}}));
  const read = () => ['mass','before','after'].forEach((kind) => click(`[data-rk-density-measure="${kind}"]`));
  const solve = () => { read(); change('data-rk-density-estimate','2.65'); click('[data-rk-density-check]'); };
  let unmounted = false;
  const unmount = () => { if (!unmounted) { flushSync(() => root.unmount()); host.remove(); unmounted = true; } };
  cleanup.push(unmount);
  return { get, click, change, read, solve, state: () => store.rocks.densityLab, host, unmount };
}
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_rocks.js','rocks'); vi.useFakeTimers(); });
afterEach(() => { cleanup.splice(0).forEach((fn) => fn()); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('density calculation error recovery', () => {
  it('associates an invalid answer with its visible message and focuses the answer', () => {
    const app = mount(); app.read(); app.change('data-rk-density-estimate','not a number'); app.click('[data-rk-density-check]');
    const answer = app.get('[data-rk-density-estimate]');
    expect(document.activeElement).toBe(answer);
    expect(answer.getAttribute('aria-invalid')).toBe('true');
    expect(answer.getAttribute('aria-errormessage')).toBe('rk-density-feedback');
    expect(answer.getAttribute('aria-describedby')).toContain('rk-density-feedback');
    expect(app.get('#rk-density-feedback').textContent).toContain('positive number');
    app.change('data-rk-density-estimate','2.65');
    expect(answer.hasAttribute('aria-invalid')).toBe(false);
    expect(answer.getAttribute('aria-describedby')).toBe('rk-density-rounding');
  });

  it.each(['mass','before','after'])('moves to the first missing measurement: %s', (missing) => {
    const measured = {mass:missing !== 'mass',before:missing === 'after'};
    const app = mount({measured}); app.click('[data-rk-density-check]');
    const button = app.get(`[data-rk-density-measure="${missing}"]`);
    expect(document.activeElement).toBe(button);
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-describedby')).toContain('rk-density-feedback');
    expect(app.get('[data-rk-density-estimate]').hasAttribute('aria-invalid')).toBe(false);
  });

  it('associates unit conversion feedback with both relevant controls and focuses units', () => {
    const app = mount(); app.read(); app.change('data-rk-density-estimate','2650'); app.click('[data-rk-density-check]');
    const units = app.get('[data-rk-density-units]');
    expect(document.activeElement).toBe(units);
    expect(units.getAttribute('aria-invalid')).toBe('true');
    expect(units.getAttribute('aria-describedby')).toContain('rk-density-feedback');
    app.change('data-rk-density-units','kg/m3');
    expect(units.hasAttribute('aria-invalid')).toBe(false);
    app.click('[data-rk-density-check]');
    expect(app.state().feedback).toBe('correct');
  });

  it('supports form submission, prevents navigation, and retains successful Check focus', () => {
    const app = mount(); app.read(); app.change('data-rk-density-estimate','2.65');
    const form = app.get('form[aria-labelledby="rk-density-calculate-heading"]');
    expect(app.get('[data-rk-density-check]').type).toBe('submit');
    const submit = new Event('submit',{bubbles:true,cancelable:true});
    flushSync(() => form.dispatchEvent(submit));
    expect(submit.defaultPrevented).toBe(true);
    expect(app.state().feedback).toBe('correct');
    const check = app.click('[data-rk-density-check]');
    expect(document.activeElement).toBe(check);
    expect(app.get('[data-rk-density-record]').disabled).toBe(false);
  });

  it('does not send calculation feedback through a second live announcer', () => {
    const announce = vi.fn(); const app = mount({}, {announceToSR:announce});
    app.read(); announce.mockClear(); app.change('data-rk-density-estimate','2.65'); app.click('[data-rk-density-check]');
    expect(announce).not.toHaveBeenCalled();
    expect(app.get('#rk-density-feedback').getAttribute('aria-live')).toBe('polite');
    expect(app.get('#rk-density-feedback').textContent).toContain('matches the displayed readings');
  });

  it('does not steal focus after a later action or unmount', () => {
    const app = mount(); app.read(); app.change('data-rk-density-estimate','bad');
    app.click('[data-rk-density-check]',false);
    const prediction = app.get('[data-rk-density-prediction]'); prediction.focus();
    vi.runOnlyPendingTimers(); expect(document.activeElement).toBe(prediction);
    app.click('[data-rk-density-check]',false); app.unmount();
    const outside = document.createElement('button'); document.body.appendChild(outside); outside.focus();
    vi.runOnlyPendingTimers(); expect(document.activeElement).toBe(outside); outside.remove();
  });
});

describe('density measurements and trial review access', () => {
  it('describes unread measurements explicitly and exposes units and reset consequences', () => {
    const app = mount();
    for (const kind of ['mass','before','after']) {
      const reading = app.get(`#rk-density-reading-${kind}`);
      expect(reading.textContent).toContain('Not measured');
      expect(reading.querySelector('[aria-hidden="true"]').textContent).toBe('—');
      expect(app.get(`[data-rk-density-measure="${kind}"]`).getAttribute('aria-describedby')).toContain(reading.id);
    }
    expect(app.get('[data-rk-density-water]').getAttribute('aria-valuetext')).toBe('30.0 mL');
    for (const attr of ['mineral','size','water']) expect(app.get(`[data-rk-density-${attr}]`).getAttribute('aria-describedby')).toBe('rk-density-settings-help');
  });

  it('moves from the disabled Record button to a uniquely named native notes disclosure', () => {
    const app = mount(); app.solve(); app.click('[data-rk-density-record]');
    const first = app.get('[data-rk-density-trial="1"] summary');
    expect(document.activeElement).toBe(first);
    expect(first.getAttribute('aria-label')).toMatch(/^View notes: Trial 1,/);
    expect(first.parentElement.tagName).toBe('DETAILS');
    expect(app.get('[data-rk-density-record]').disabled).toBe(true);
    app.click('[data-rk-density-repeat]');
    expect(document.activeElement).toBe(app.get('[data-rk-density-measure="mass"]'));
    app.solve(); app.click('[data-rk-density-record]');
    const second = app.get('[data-rk-density-trial="2"] summary');
    expect(document.activeElement).toBe(second);
    expect(second.getAttribute('aria-label')).not.toBe(first.getAttribute('aria-label'));
    expect(app.get('[data-rk-density-trials] caption').textContent).toBe('Recorded density trials');
  });

  it('announces measurements and repeat reset without depending on a host announcer', () => {
    const app = mount({}, {announceToSR:undefined});
    app.click('[data-rk-density-measure="mass"]');
    expect(app.get('[data-rk-density-announcement]').textContent).toContain('26.5 g');
    app.click('[data-rk-density-repeat]');
    expect(app.get('[data-rk-density-announcement]').textContent).toContain('Measurements reset');
    expect(app.state().measured).toEqual({});
  });
});
