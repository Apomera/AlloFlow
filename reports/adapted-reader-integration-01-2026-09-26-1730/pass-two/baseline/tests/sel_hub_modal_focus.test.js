// SEL Hub · keyboard focus stays in the hub while it is open, and goes back where it came from.
//
// Found 2026-09-24 with a keyboard-only walk of Crew week 5 in Chromium: the hub is a full-screen
// aria-modal dialog, but only its inner dialogs trapped focus. After 28 Tabs focus left it for <body>
// and then the page hidden behind it ("Skip to Content", "Join Class", ...), 12 of 40 presses. Closing
// it (Escape) left focus on <body> instead of the pack link that opened it.
// Two focus guards (the dialog's first and last children) now wrap Tab around, and focus returns to
// the opener when the hub closes.
//
// jsdom never moves focus on Tab, so these tests focus a guard directly (which is what Tab does in a
// browser) and assert that the HANDLER moved focus, paired with a case it must leave alone.
// SEL_HUB_MODULE_PATH points the suite at a copy of sel_hub_module.js for mutation runs.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');
const HUB = process.env.SEL_HUB_MODULE_PATH ? resolve(process.env.SEL_HUB_MODULE_PATH) : resolve(SEL, 'sel_hub_module.js');

let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { React: req('react'), RDC: req('react-dom/client'), act: req('react-dom/test-utils').act };
} catch { R = null; }
let React, RDC, act;
const nodeRequire = createRequire(import.meta.url);
const load = (f) => new Function('require', readFileSync(f, 'utf8'))(nodeRequire);

function setup() {
  const sg = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
  const noop = () => {};
  React = R.React; RDC = R.RDC; act = R.act;
  sg('React', React); window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloModules = window.AlloModules || {};
  window.callGemini = null;
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  }
  sg('Audio', function () { return { play: () => Promise.resolve() }; });
  sg('IS_REACT_ACT_ENVIRONMENT', true);
  if (typeof window.Element.prototype.scrollIntoView !== 'function') window.Element.prototype.scrollIntoView = noop;
  load(HUB);
  for (const f of ['sel_safety_layer.js', 'sel_standards_alignment.js']) {
    if (existsSync(join(SEL, f))) { try { load(join(SEL, f)); } catch { /* optional */ } }
  }
  window.__alloEnsureSelPluginLoaded = () => true;
  window.__alloGetSelPluginState = () => null;
  window.__alloflowSelSnapshots = []; window.__alloflowStudentArtifacts = [];
}

function mountHub() {
  const noop = () => {};
  const Icon = () => null;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = RDC.createRoot(container);
  const render = (open) => act(() => {
    root.render(React.createElement(window.AlloModules.SelHub, {
      showSelHub: open, setShowSelHub: noop, selHubTab: 'explore', setSelHubTab: noop,
      selHubTool: null, setSelHubTool: noop, addToast: noop, gradeLevel: '7th Grade',
      callGemini: null, onSafetyFlag: noop, studentCodename: 'test', t: (k) => k,
      ArrowLeft: Icon, X: Icon, Sparkles: Icon, Heart: Icon, GripVertical: Icon, onExportRequested: noop,
    }));
  });
  render(true);
  const hub = () => container.querySelector('[role="dialog"][aria-label="SEL Hub"]');
  return { container, hub, close: () => render(false), unmount: () => { act(() => root.unmount()); container.remove(); } };
}
const controls = (hub) => [...hub.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, summary, [tabindex]')]
  .filter((el) => !el.hasAttribute('data-sel-focus-guard') && el.getAttribute('tabindex') !== '-1');
const guard = (hub, which) => hub.querySelector('[data-sel-focus-guard="' + which + '"]');
const focus = (el) => act(() => { el.focus(); });
const flush = (ms = 30) => act(() => new Promise((r) => setTimeout(r, ms)));
// The hub moves focus itself a moment after it opens (station guide, first control); let that settle.
const settle = () => flush(150);

describe.skipIf(!R)('SEL Hub keeps keyboard focus while open', () => {
  beforeAll(setup);
  afterEach(() => { document.body.querySelectorAll('[data-test-outside]').forEach((n) => n.remove()); });

  it('the guards are the dialog\'s first and last focusable children', () => {
    const h = mountHub();
    const kids = [...h.hub().children];
    expect(kids[0].getAttribute('data-sel-focus-guard')).toBe('start');
    expect(kids[kids.length - 1].getAttribute('data-sel-focus-guard')).toBe('end');
    expect(kids[0].tabIndex).toBe(0);
    h.unmount();
  });

  it('Tab off the last control wraps to the first; Shift+Tab off the first wraps to the last', async () => {
    const h = mountHub();
    await settle();
    const c = controls(h.hub());
    expect(c.length).toBeGreaterThan(3);
    focus(c[c.length - 1]);
    focus(guard(h.hub(), 'end'));
    expect(document.activeElement).toBe(c[0]);
    focus(c[0]);
    focus(guard(h.hub(), 'start'));
    expect(document.activeElement).toBe(c[c.length - 1]);
    h.unmount();
  });

  it('coming in from the page, focus lands on the first control', async () => {
    const outside = document.createElement('button'); outside.setAttribute('data-test-outside', '1'); document.body.appendChild(outside);
    const h = mountHub();
    await settle();
    focus(outside);
    focus(guard(h.hub(), 'start'));
    expect(document.activeElement).toBe(controls(h.hub())[0]);
    h.unmount();
  });

  it('ordinary focus moves inside the hub are left alone', async () => {
    const h = mountHub();
    await settle();
    const c = controls(h.hub());
    focus(c[1]);
    focus(c[2]);
    expect(document.activeElement).toBe(c[2]);
    h.unmount();
  });

  it('closing the hub puts focus back on what opened it', async () => {
    const link = document.createElement('a'); link.href = '#sel-hub/dearMan'; link.textContent = 'DEAR MAN'; link.setAttribute('data-test-outside', '1');
    document.body.appendChild(link);
    focus(link);
    const h = mountHub();
    await settle();
    focus(controls(h.hub())[0]);
    h.close();
    await flush();
    expect(document.activeElement).toBe(link);
    h.unmount();
  });

  it('but does not take focus back from somewhere the student chose after', async () => {
    const link = document.createElement('a'); link.href = '#sel-hub/dearMan'; link.setAttribute('data-test-outside', '1');
    const other = document.createElement('input'); other.setAttribute('data-test-outside', '1');
    document.body.append(link, other);
    focus(link);
    const h = mountHub();
    await settle();
    focus(other);
    h.close();
    await flush();
    expect(document.activeElement).toBe(other);
    h.unmount();
  });
});
