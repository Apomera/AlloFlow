// SEL Hub · HOWL Tracker can rate the three HOWLs King Middle School grades.
//
// The tool shipped only EL Education's four habits. King (and other EL schools)
// grade Respect, Responsibility and Perseverance 1-4 per course per trimester.
// A preset picker on the Home view swaps the set; content banks keyed by the EL
// ids stay populated through elBase. Mounted through the REAL renderTool.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');
let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { React: req('react'), RDC: req('react-dom/client'), act: req('react-dom/test-utils').act };
} catch { R = null; }
let React, RDC, act;

function setup() {
  const sg = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
  const noop = () => {};
  React = R.React; RDC = R.RDC; act = R.act;
  sg('React', React); window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloModules = window.AlloModules || {};
  if (typeof window.matchMedia !== 'function') window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  sg('Audio', function () { return { play: () => Promise.resolve() }; });
  sg('IS_REACT_ACT_ENVIRONMENT', true);
  const req = createRequire(import.meta.url);
  const load = (f) => new Function('require', readFileSync(f, 'utf8'))(req);
  load(resolve(SEL, 'sel_hub_module.js'));
  load(resolve(SEL, 'sel_tool_howl.js'));
}

function mount(toolData, onSet) {
  const noop = () => {};
  const pal = { bg: '#fff', bgCard: '#f8fafc', text: '#0f172a', textMuted: '#475569', border: '#cbd5e1', accent: '#4f46e5', accentText: '#fff' };
  const theme = new Proxy({ isDark: false, isContrast: false, reduceMotion: true, palette: pal, ...pal }, { get: (o, k) => (k in o ? o[k] : '#475569') });
  const base = {
    React, toolData, setToolData: onSet, update: noop, updateMulti: noop, setSelHubTool: noop, setSelHubTab: noop, selHubTab: 'explore', selHubTool: 'howlTracker',
    addToast: noop, awardXP: noop, getXP: () => 0, getSavePolicy: () => ({ checkpointLabel: 'x', sharePacketLabel: 'y' }), announceToSR: noop, celebrate: noop, beep: noop,
    t: (k, fb) => (typeof fb === 'string' ? fb : k), theme, isDark: false, isContrast: false, reduceMotion: true, themePalette: pal,
    callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null, onSafetyFlag: noop, studentCodename: 'test', selectedVoice: null, activeSessionCode: null,
    icons: new Proxy({}, { get: () => () => null }), gradeLevel: '7th Grade', gradeBand: 'middle', toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    srOnly: (t) => React.createElement('span', { className: 'sr-only' }, t), a11yClick: (fn) => ({ onClick: fn, onKeyDown: noop, role: 'button', tabIndex: 0 }), props: { onExportRequested: noop },
  };
  const ctx = new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = RDC.createRoot(container);
  act(() => { root.render(React.createElement(() => window.SelHub.renderTool('howlTracker', ctx))); });
  return { container, unmount: () => { act(() => root.unmount()); container.remove(); } };
}

describe.skipIf(!R)('HOWL Tracker · Respect, Responsibility, Perseverance preset', () => {
  beforeAll(setup);

  it('offers the preset on the Home view and defaults to the EL four', () => {
    const h = mount({}, () => {});
    const select = h.container.querySelector('#howl-preset-select');
    expect(select).toBeTruthy();
    expect(select.value).toBe('el4');
    expect([...select.options].map((o) => o.value)).toEqual(['el4', 'rrp3']);
    expect(h.container.textContent).toMatch(/Tracking 4 HOWLs/);
    h.unmount();
  });

  it('switching to the three-HOWL set writes the set into tool data and shows the grading-guide statements', () => {
    let patched = null;
    const h = mount({}, (fn) => { patched = typeof fn === 'function' ? fn({}) : fn; });
    const select = h.container.querySelector('#howl-preset-select');
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      setter.call(select, 'rrp3');
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    expect(patched && patched.howlTracker).toBeTruthy();
    const st = patched.howlTracker;
    expect(st.howlPreset).toBe('rrp3');
    expect(st.howls.map((x) => x.id)).toEqual(['respect', 'responsibility', 'perseverance']);
    expect(st.activeHowls).toEqual(['respect', 'responsibility', 'perseverance']);
    h.unmount();
    const h2 = mount({ howlTracker: st }, () => {});
    expect(h2.container.textContent).toContain('I am a respectful member of the King community.');
    expect(h2.container.textContent).toContain('I take responsibility for my success as a learner.');
    expect(h2.container.textContent).toContain('I persevere to produce high quality work.');
    expect(h2.container.textContent).toMatch(/Tracking 3 HOWLs/);
    h2.unmount();
  });

  it('every preset habit carries the fields the other views read, a 1-4 rubric, and a real EL base for the content banks', () => {
    const src = readFileSync(resolve(SEL, 'sel_tool_howl.js'), 'utf8');
    const block = src.slice(src.indexOf('var RRP_HOWLS = ['), src.indexOf('var HOWL_PRESETS'));
    for (const id of ['respect', 'responsibility', 'perseverance']) expect(block).toContain("id: '" + id + "'");
    for (const field of ['statement', 'tagline', 'rubric', 'strands', 'research', 'misconception', 'goalExamples', 'crewPrompts']) {
      expect((block.match(new RegExp('\\b' + field + ':', 'g')) || []).length, field).toBe(3);
    }
    for (const base of ['crewMembership', 'activeEngagement', 'effectiveEffort']) expect(block).toContain("elBase: '" + base + "'");
    expect((block.match(/\b4: '/g) || []).length).toBe(3);
    expect(src).not.toMatch(/typeof DEFAULT_HOWLS !== 'undefined' \? DEFAULT_HOWLS : \[\]/);
  });
});
