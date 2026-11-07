// Student AI-off sweep (wave 2): badges only AI can award are hidden from the badge
// list and progress count when AI is unusable, so the visible set stays completable.
// Already-earned AI badges stay visible; with AI usable every badge shows.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');
const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
const React = req('react');
const RDC = req('react-dom/client');
const { act } = req('react-dom/test-utils');

beforeAll(() => {
  const noop = () => {};
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloModules = window.AlloModules || {};
  window.callGemini = null;
  if (typeof window.matchMedia !== 'function') window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  if (typeof window.scrollTo !== 'function') window.scrollTo = noop;
  if (typeof Element.prototype.scrollIntoView !== 'function') Element.prototype.scrollIntoView = noop;
  globalThis.Audio = function () { return { play: () => Promise.resolve(), pause: noop }; };
  const load = (f) => new Function('require', readFileSync(f, 'utf8'))(createRequire(import.meta.url));
  load(resolve(SEL, 'sel_hub_module.js'));
  ['perspective', 'journal', 'community', 'ethicalreasoning'].forEach((n) => load(join(SEL, 'sel_tool_' + n + '.js')));
});

let root = null, container = null;
afterEach(() => { try { if (root) act(() => root.unmount()); } catch {} root = null; container?.remove(); container = null; });

function render(id, key, toolState, { ai }) {
  const noop = () => {};
  const pal = { bg: '#ffffff', bgCard: '#f8fafc', text: '#0f172a', textMuted: '#475569', border: '#cbd5e1', accent: '#4f46e5', accentText: '#fff' };
  const theme = new Proxy({ isDark: false, isContrast: false, reduceMotion: true, palette: pal, ...pal }, { get: (o, k) => (k in o ? o[k] : '#475569') });
  const base = {
    React, toolData: { [key]: toolState }, setToolData: noop, update: noop, updateMulti: noop, setSelHubTool: noop, setSelHubTab: noop,
    selHubTab: 'explore', selHubTool: id, addToast: noop, getSavePolicy: () => ({ checkpointLabel: 'Private checkpoint', sharePacketLabel: 'Share Packet eligible' }), awardXP: noop, getXP: () => 0, announceToSR: noop, celebrate: noop, beep: noop,
    t: (k, fb) => (typeof fb === 'string' ? fb : k), theme, isDark: false, isContrast: false, reduceMotion: true, themePalette: pal,
    callGemini: ai ? async () => '' : null, callTTS: null, callImagen: null, callGeminiVision: null,
    onSafetyFlag: noop, studentCodename: 'test', icons: new Proxy({}, { get: () => () => null }), gradeLevel: '7th Grade', gradeBand: 'middle',
    toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop, srOnly: (t) => React.createElement('span', { className: 'sr-only' }, t),
    a11yClick: (fn) => ({ onClick: fn, onKeyDown: noop, role: 'button', tabIndex: 0 }), props: {},
  };
  const ctx = new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
  container = document.createElement('div'); document.body.appendChild(container);
  root = RDC.createRoot(container);
  act(() => { root.render(React.createElement(() => window.SelHub.renderTool(id, ctx))); });
  return container.innerHTML;
}

const CASES = [
  { id: 'perspective', key: 'perspective', open: { showBadgesPanel: true }, aiNames: ['Perspective Seeker', 'Action Taker', 'Moral Compass', 'Empathy in Action'], keep: 'Perspective Pioneer', earned: { earnedBadges: { respond_1: 1 } }, earnedName: 'Action Taker' },
  { id: 'journal', key: 'journal', open: { activeTab: 'badges' }, aiNames: ['AI Reflector'], keep: 'Mood Detective', earned: { earnedBadges: { ai_reflector: 1 } }, earnedName: 'AI Reflector' },
  { id: 'community', key: 'community', open: { showBadgesPanel: true }, aiNames: ['AI Learner'], keep: 'Culture Curious', earned: { earnedBadges: { ai_learner: 1 } }, earnedName: 'AI Learner' },
  { id: 'ethicalReasoning', key: 'ethicalReasoning', open: { tab: 'badges' }, aiNames: ['Moral Philosopher', 'Socratic Thinker', 'Framework Thinker', 'Debate Champion', 'Case Study Scholar', 'Values Explorer', 'Ethical Leader'], keep: 'Philosophy Fan', earned: { kohlbergComplete: true }, earnedName: 'Moral Philosopher' },
];

describe('SEL AI-only badges with student AI off', () => {
  for (const c of CASES) {
    it(c.id + ': hides AI-only badges without AI and shows them with AI', () => {
      const off = render(c.id, c.key, { ...c.open }, { ai: false });
      expect(off).toContain(c.keep);
      for (const name of c.aiNames) expect(off.includes(name), c.id + ' AI off still shows ' + name).toBe(false);
      act(() => root.unmount()); root = null; container.remove();
      const on = render(c.id, c.key, { ...c.open }, { ai: true });
      for (const name of c.aiNames) expect(on.includes(name), c.id + ' AI on hides ' + name).toBe(true);
    });
    it(c.id + ': an already-earned AI badge stays visible with AI off', () => {
      const off = render(c.id, c.key, { ...c.open, ...c.earned }, { ai: false });
      expect(off).toContain(c.earnedName);
    });
  }

  it('the progress denominators count only the shown badges', () => {
    expect(render('perspective', 'perspective', { showBadgesPanel: true }, { ai: false })).toContain('Badges (0/19)');
    act(() => root.unmount()); root = null; container.remove();
    expect(render('ethicalReasoning', 'ethicalReasoning', { tab: 'badges' }, { ai: false })).toMatch(/>0\/6</);
    act(() => root.unmount()); root = null; container.remove();
    expect(render('ethicalReasoning', 'ethicalReasoning', { tab: 'badges' }, { ai: true })).toMatch(/>0\/13</);
  });
});
