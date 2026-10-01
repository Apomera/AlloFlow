// Badges no student can earn any more are retired, not shown as locked (2026-09-24).
//
// The SEL redesigns replaced scored and completion activities with optional practice
// notes, and some relabelled their badges "Historical award" / "Earlier activity",
// but every badge panel still listed them as locked goals and counted them in
// "X/N badges". A retired badge now appears, and counts, only for a student who
// already earned it. Upstander also awarded two ids no catalog defines ('roleplayed',
// 'generated'), which silently gave neither badge nor XP.

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import * as acorn from 'acorn';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');
let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { React: req('react'), RDC: req('react-dom/client'), act: req('react-dom/test-utils').act };
} catch { R = null; }
let React, RDC, act;
vi.setConfig({ testTimeout: 60000, hookTimeout: 120000 });
const TOOLS = ['decisions', 'teamwork', 'conflict', 'community', 'strengths', 'upstander'];

let loaded = false;
function setup() {
  if (loaded) return;
  loaded = true;
  const sg = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
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
  TOOLS.forEach((id) => load(join(SEL, `sel_tool_${id}.js`)));
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

// Badge ids a tool defines, read from its BADGES list / BADGE_CATALOG / BADGES map.
function badgeDefs(id) {
  const ast = acorn.parse(readFileSync(join(SEL, `sel_tool_${id}.js`), 'utf8'), { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true });
  const defs = {}; const awards = [];
  const walk = (n) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && /BADGE/.test(n.id.name) && n.init) {
      if (n.init.type === 'ArrayExpression') n.init.elements.forEach((el) => { const p = el && el.properties && el.properties.find((q) => q.key && q.key.name === 'id'); if (p) defs[p.value.value] = el.properties.some((q) => q.key && q.key.name === 'retired'); });
      if (n.init.type === 'ObjectExpression') n.init.properties.forEach((p) => { if (p.value && p.value.type === 'ObjectExpression') defs[p.key.name || p.key.value] = p.value.properties.some((q) => q.key && q.key.name === 'retired'); });
    }
    if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && /^(tryAwardBadge|awardBadge)$/.test(n.callee.name) && n.arguments[0] && n.arguments[0].type === 'Literal') awards.push(n.arguments[0].value);
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v); }
  };
  walk(ast);
  return { defs, awards };
}

describe('every badge a SEL tool awards is one it defines', () => {
  const tools = readdirSync(SEL).filter((f) => /^sel_tool_.*\.js$/.test(f)).map((f) => f.slice(9, -3));
  it.each(tools)('%s', (id) => {
    const { defs, awards } = badgeDefs(id);
    if (!Object.keys(defs).length) return;
    expect(awards.filter((a) => !(a in defs))).toEqual([]);
  });

  it('Upstander: a role-play reflection earns "Rehearsed With AI", and a generated scenario keeps its XP', () => {
    const src = readFileSync(join(SEL, 'sel_tool_upstander.js'), 'utf8');
    expect(src).toContain("tryAwardBadge('rehearsed', 20);");
    expect(src).toContain("if (awardXP) awardXP(10, 'Generated a practice scenario');");
  });
});

describe.skipIf(!R)('retired badges are not shown as goals', () => {
  beforeAll(setup);
  const retiredCount = (id) => Object.values(badgeDefs(id).defs).filter(Boolean).length;
  const total = (id) => Object.keys(badgeDefs(id).defs).length;

  it.each([['decisions', 'consequence_3', 'Ripple Effect Master'], ['teamwork', 'scenario_pro', 'Scenario Pro'], ['conflict', 'apology_3', 'Repair Artist'], ['community', 'bridge_builder', 'Bridge Builder']])(
    '%s: the badge count leaves retired badges out, and an earned one comes back', (id, earnedId, name) => {
      expect(retiredCount(id)).toBeGreaterThan(0);
      const shown = total(id) - retiredCount(id);
      const fresh = mount(id, { showBadgesPanel: true });
      try {
        const label = fresh.container.querySelector('[aria-label$="badges earned"]');
        // The count is in the toggle's aria-label, or in the panel text.
        if (label) expect(label.getAttribute('aria-label')).toBe(`0/${shown} badges earned`);
        else expect(fresh.container.textContent).toMatch(new RegExp(`\\b0/${shown}\\b|\\(0/${shown}\\)`));
        expect(fresh.container.textContent).not.toContain(name);
      } finally { fresh.unmount(); }
      const keeper = mount(id, { showBadgesPanel: true, earnedBadges: { [earnedId]: 1 } });
      try {
        expect(keeper.container.textContent).toContain(name);
        const label1 = keeper.container.querySelector('[aria-label$="badges earned"]');
        if (label1) expect(label1.getAttribute('aria-label')).toBe(`1/${shown + 1} badges earned`);
        else expect(keeper.container.textContent).toMatch(new RegExp(`\\b1/${shown + 1}\\b|\\(1/${shown + 1}\\)`));
      } finally { keeper.unmount(); }
    });

  // Teamwork and Community list their badges a second time, on a tab of their own.
  it.each([['teamwork', 'progress', 'Scenario Pro'], ['community', 'badges', 'Bridge Builder']])('%s: the %s tab leaves retired badges out too', (id, tab, name) => {
    const shown = total(id) - retiredCount(id);
    const m = mount(id, { activeTab: tab });
    try {
      expect(m.container.textContent).toMatch(new RegExp(`(?<!\\d)0/${shown}(?!\\d)`));
      expect(m.container.textContent).not.toContain(name);
    } finally { m.unmount(); }
  });

  it('Strengths: the three scenario badges leave the panel and its count', () => {
    const shown = total('strengths') - 3;
    const m = mount('strengths', { showBadges: true });
    try {
      expect(m.container.textContent).toContain(`Badges — 0/${shown}`);
      expect(m.container.textContent).not.toContain('Master Strategist');
    } finally { m.unmount(); }
  });

  it('Upstander: the badge gallery counts only badges that can still be earned', () => {
    const shown = total('upstander') - 3;
    const m = mount('upstander', { activeTab: 'pledge' });
    try {
      expect(m.container.textContent).toContain(`0 of ${shown} earned`);
      expect(m.container.textContent).not.toContain('Walked the Repair Path');
    } finally { m.unmount(); }
  });
});
