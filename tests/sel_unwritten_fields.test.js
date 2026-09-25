// SEL screens that read a field nothing writes (2026-09-24).
//
// A scan for `d.X || []` / `d.X || {}` reads with no write anywhere in the tool:
// - Friendship's launch panel counted "digital practices" from digitalDone, the
//   earlier activity's record. The Digital tab now saves digitalCases, so the
//   count stayed 0 however many dilemmas a student worked through.
// - Identity Support's printable reference told students to add affirming people
//   "in the Finding community tab", which has no form; nothing writes those lists.
//   It now prints lines to fill in by hand, and stores nothing.
// - Decisions "Consequence Maps" and Conflict "Apologies Crafted" counted csCompleted /
//   apCompleted after those tabs moved to per-scenario notes: always 0.
// Mounted through the real renderTool.

import { beforeAll, describe, expect, it, vi } from 'vitest';
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
vi.setConfig({ testTimeout: 60000, hookTimeout: 120000 });

let loaded = false;
function setup() {
  if (loaded) return;
  loaded = true;
  const sg =(k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
  const noop = () => {};
  React = R.React; RDC = R.RDC; act = R.act;
  sg('React', React); window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloModules = window.AlloModules || {};
  window.callGemini = null;
  if (typeof window.matchMedia !== 'function') window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  sg('Audio', function () { return { play: () => Promise.resolve() }; });
  sg('IS_REACT_ACT_ENVIRONMENT', true);
  const req = createRequire(import.meta.url);
  const load = (f) => new Function('require', readFileSync(f, 'utf8'))(req);
  load(resolve(SEL, 'sel_hub_module.js'));
  ['friendship', 'identitysupport', 'decisions', 'conflict', 'growthmindset'].forEach((id) => load(join(SEL, `sel_tool_${id}.js`)));
}

function mount(toolId, toolData) {
  const noop = () => {};
  let store = { [toolId]: Object.assign({}, toolData) };
  const pal = { bg: '#fff', bgCard: '#f8fafc', text: '#0f172a', textMuted: '#475569', border: '#cbd5e1', accent: '#4f46e5', accentText: '#fff' };
  const theme = new Proxy({ isDark: false, isContrast: false, reduceMotion: true, palette: pal, ...pal }, { get: (o, k) => (k in o ? o[k] : '#475569') });
  let root;
  const render = () => { act(() => { root.render(React.createElement(() => window.SelHub.renderTool(toolId, ctx()))); }); };
  const setToolData = (fn) => { store = typeof fn === 'function' ? fn(store) : Object.assign({}, store, fn); render(); };
  const ctx = () => new Proxy({
    React, toolData: store, setToolData,
    update: (id, key, val) => setToolData((p) => { const n = Object.assign({}, p); n[id] = Object.assign({}, p[id], { [key]: val }); return n; }),
    updateMulti: (id, patch) => setToolData((p) => { const n = Object.assign({}, p); n[id] = Object.assign({}, p[id], patch); return n; }),
    setSelHubTool: noop, setSelHubTab: noop, selHubTab: 'explore', selHubTool: toolId, addToast: noop, awardXP: noop, getXP: () => 0,
    getSavePolicy: () => ({ checkpointLabel: 'x', sharePacketLabel: 'y' }), announceToSR: noop, celebrate: noop, beep: noop,
    t: (k, fb) => (typeof fb === 'string' ? fb : k), theme, isDark: false, isContrast: false, reduceMotion: true, themePalette: pal,
    callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null, onSafetyFlag: noop, studentCodename: 'test', selectedVoice: null, activeSessionCode: null,
    icons: new Proxy({}, { get: () => () => null }), gradeLevel: '7th Grade', gradeBand: 'middle', toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    srOnly: (t) => React.createElement('span', { className: 'sr-only' }, t), a11yClick: (fn) => ({ onClick: fn, onKeyDown: noop, role: 'button', tabIndex: 0 }), props: { onExportRequested: noop },
  }, { get: (o, p) => (p in o ? o[p] : noop) });
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = RDC.createRoot(container);
  render();
  return { container, unmount: () => { act(() => root.unmount()); container.remove(); } };
}

describe.skipIf(!R)('Friendship: digital practices', () => {
  beforeAll(setup);
  const stat = (c) => Array.from(c.querySelectorAll('div')).find((el) => el.children.length === 2 && el.children[1].textContent === 'digital practices');

  it('counts the dilemmas the Digital tab saved notes for', () => {
    const m = mount('friendship', { digitalCases: {
      'middle:screenshot': { notice: 'They might not know it was shared.' },
      'middle:tone': { notice: '   ' }, // opened, nothing written
      'high:groupchat': { plan: 'Ask before posting.' },
    } });
    try { expect(stat(m.container).children[0].textContent).toBe('2'); } finally { m.unmount(); }
  });

  it('still counts the earlier activity, and survives a malformed record', () => {
    const m = mount('friendship', { digitalDone: { 0: true }, digitalCases: { 'middle:tone': { notice: 'Ask what they meant.' }, bad: 'x' } });
    try { expect(stat(m.container).children[0].textContent).toBe('2'); } finally { m.unmount(); }
  });
});

describe.skipIf(!R)('Progress tabs count the practice the current tabs save', () => {
  beforeAll(setup);
  // Tile = icon, value, label.
  const tile = (c, label) => Array.from(c.querySelectorAll('div')).find((el) => el.children.length === 3 && el.children[2].textContent === label);
  const drafts = {
    first: { notice: 'Friends might feel left out.' },
    second: { notice: 'I could ask first.', plan: '' },
    opened: { notice: '  ' }, // opened, nothing written
  };

  it('Decisions "Consequence Maps" counts saved maps (it read csCompleted, which nothing writes)', () => {
    const m = mount('decisions', { activeTab: 'progress', mapDrafts: drafts });
    try { expect(tile(m.container, 'Consequence Maps').children[1].textContent).toBe('2'); } finally { m.unmount(); }
  });

  it('Growth Mindset progress bar counts saved reframes (it read reframeScore, which nothing writes)', () => {
    const m = mount('growthmindset', { practiceDrafts: drafts });
    try {
      expect(m.container.textContent).toContain('🔄 2 reframed');
    } finally { m.unmount(); }
  });

  it('Conflict "Apologies Crafted" counts saved apologies, plus an earlier count', () => {
    const m = mount('conflict', { activeTab: 'progress', apDrafts: drafts, apCompleted: 1 });
    try { expect(tile(m.container, 'Apologies Crafted').children[1].textContent).toBe('3'); } finally { m.unmount(); }
  });
});

describe.skipIf(!R)('Identity Support: printable reference', () => {
  beforeAll(setup);

  it('prints write-in lines, not a pointer to a form that does not exist', () => {
    const m = mount('identitySupport', { view: 'print' });
    try {
      const text = m.container.textContent;
      expect(text).not.toContain('Finding community tab');
      expect(text).toContain('People who affirm me');
      expect(text).toContain('Spaces where I feel like myself');
      expect(text.split('Fill these in by hand after printing. They are not saved in AlloFlow.').length - 1).toBe(2);
    } finally { m.unmount(); }
  });

  it('still lists people and spaces saved by an earlier version', () => {
    const m = mount('identitySupport', { view: 'print', affirmingPeople: [{ name: 'Ms. Rivera', role: 'counselor' }], affirmingSpaces: ['Art club'] });
    try {
      const text = m.container.textContent;
      expect(text).toContain('Ms. Rivera · counselor');
      expect(text).toContain('Art club');
      expect(text).not.toContain('Fill these in by hand');
    } finally { m.unmount(); }
  });
});
