// Student AI-off sweep, wave 2 GAPS lane (2026-11-04).
// 1. SEL: remaining AI-only badges hide (list + denominator) without usable AI; earned ones stay.
// 2. SEL hub ctx nulls host-blocked AI fns (blocked fns are truthy).
// 3. SafetyContentChecker.aiCheck never sends student text to Gemini when the host says text AI is off.
// 4. analyzeFluencyWithGemini honours host audio policy (student AI off / audio not approved),
//    while keyless Canvas (only reason: missing key, text AI usable) keeps working.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
// GAPS_W2_SRC_DIR: point at a pre-fix copy (same layout) to confirm these tests fail first.
const SRC = process.env.GAPS_W2_SRC_DIR || ROOT;
const SEL = resolve(SRC, 'sel_hub');
const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
const React = req('react');
const RDC = req('react-dom/client');
const { act } = req('react-dom/test-utils');

const TOOLS = ['advocacy', 'coping', 'emotions', 'mindfulness', 'zones', 'social', 'conflict', 'decisions', 'teamwork', 'upstander'];

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
  if (!window.SelHub) load(resolve(SEL, 'sel_hub_module.js'));
  TOOLS.forEach((n) => load(join(SEL, 'sel_tool_' + n + '.js')));
});

let root = null, container = null;
afterEach(() => { try { if (root) act(() => root.unmount()); } catch {} root = null; container?.remove(); container = null; });

function render(id, toolState, { ai }) {
  const noop = () => {};
  const pal = { bg: '#ffffff', bgCard: '#f8fafc', text: '#0f172a', textMuted: '#475569', border: '#cbd5e1', accent: '#4f46e5', accentText: '#fff' };
  const theme = new Proxy({ isDark: false, isContrast: false, reduceMotion: true, palette: pal, ...pal }, { get: (o, k) => (k in o ? o[k] : '#475569') });
  const base = {
    React, toolData: { [id]: toolState }, setToolData: noop, update: noop, updateMulti: noop, setSelHubTool: noop, setSelHubTab: noop,
    selHubTab: 'explore', selHubTool: id, addToast: noop, getSavePolicy: () => ({ checkpointLabel: 'Private checkpoint', sharePacketLabel: 'Share Packet eligible' }), awardXP: noop, getXP: () => 0, announceToSR: noop, celebrate: noop, beep: noop,
    t: (k, fb) => (typeof fb === 'string' ? fb : k), theme, isDark: false, isContrast: false, reduceMotion: true, themePalette: pal,
    callGemini: ai ? async () => '' : null, aiAvailable: !!ai, callTTS: null, callImagen: null, callGeminiVision: null,
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
function reset() { act(() => root.unmount()); root = null; container.remove(); container = null; }

const PANEL = { showBadgesPanel: true };
const CASES = [
  { id: 'advocacy', open: PANEL, ai: 'Voice Found', badgeId: 'first_voice', keep: 'Rights Scholar' },
  { id: 'coping', open: PANEL, ai: 'Smart Matcher', badgeId: 'ai_match', keep: 'Self-Evaluator' },
  { id: 'emotions', open: PANEL, ai: 'Coached', badgeId: 'ai_coach', keep: 'Journal Master' },
  { id: 'mindfulness', open: PANEL, ai: 'Inner Guide', badgeId: 'ai_coach', keep: 'Dedicated Practitioner' },
  { id: 'zones', open: PANEL, ai: 'Advice Seeker', badgeId: 'ai_advice', keep: 'Toolbox Builder' },
  { id: 'social', open: PANEL, ai: 'AI Partner', badgeId: 'ai_chat', keep: 'Smooth Talker' },
  { id: 'conflict', open: PANEL, ai: 'Mediation Seeker', badgeId: 'ai_mediator', keep: 'Healer' },
  { id: 'decisions', open: PANEL, ai: 'Wisdom Seeker', badgeId: 'ai_advisor', keep: 'Decision Maker' },
  { id: 'teamwork', open: PANEL, ai: 'AI Team Coach', badgeId: 'ai_coach', keep: 'Team Player' },
  { id: 'upstander', open: { activeTab: 'pledge' }, ai: 'Rehearsed With AI', badgeId: 'rehearsed', keep: 'Pledge Sealed' },
];

describe('SEL AI-only badges with student AI off (wave 2 tools)', () => {
  for (const c of CASES) {
    it(c.id + ': hides the AI-only badge without AI, shows it with AI, keeps it once earned', () => {
      const off = render(c.id, { ...c.open }, { ai: false });
      expect(off.includes(c.keep), c.id + ' keep badge rendered').toBe(true);
      expect(off.includes(c.ai), c.id + ' AI off still shows ' + c.ai).toBe(false);
      reset();
      const on = render(c.id, { ...c.open }, { ai: true });
      expect(on.includes(c.ai), c.id + ' AI on hides ' + c.ai).toBe(true);
      reset();
      const earned = render(c.id, { ...c.open, earnedBadges: { [c.badgeId]: true } }, { ai: false });
      expect(earned.includes(c.ai), c.id + ' earned AI badge hidden').toBe(true);
    });
  }
});

describe('SEL hub ctx nulls unusable AI fns', () => {
  it('passes null (not a truthy blocked fn) for callGemini/Imagen/Vision', () => {
    const src = readFileSync(resolve(SEL, 'sel_hub_module.js'), 'utf8');
    expect(src.includes("callGemini: _selAiOn ? callGemini : null,")).toBe(true);
    expect(src.includes("callImagen: _selAiUsable('images', callImagen) ? callImagen : null,")).toBe(true);
    expect(src.includes("callGeminiVision: _selAiUsable('vision', callGeminiVision) ? callGeminiVision : null,")).toBe(true);
  });
});

function freshWindowFn(file, setup) {
  // Each module guards against double-load via window.AlloModules.<Name>; load in an isolated fake window.
  const win = { AlloModules: {}, console, setTimeout, clearTimeout, ...setup };
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"safe":true,"category":"none","confidence":0}' }] } }] }) }));
  win.fetch = fetchMock;
  win.window = win;
  new Function('window', 'fetch', 'console', readFileSync(resolve(SRC, file), 'utf8'))(win, fetchMock, { log() {}, warn() {}, error() {} });
  return { win, fetchMock };
}

describe('SafetyContentChecker.aiCheck respects host AI policy', () => {
  it('does not send student text when the host says text AI is not usable', async () => {
    const { win, fetchMock } = freshWindowFn('safety_checker_module.js', { _isCanvasEnv: true, __alloAiUsable: () => false, callGemini: async () => '' });
    await win.SafetyContentChecker.aiCheck('this is a student message', 'socratic', '', () => {});
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('does not send when the student AI-off flag is set on an older host', async () => {
    const { win, fetchMock } = freshWindowFn('safety_checker_module.js', { _isCanvasEnv: true, __alloStudentAiDisabled: true });
    await win.SafetyContentChecker.aiCheck('this is a student message', 'socratic', '', () => {});
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('still runs the cloud check when AI is usable', async () => {
    const { win, fetchMock } = freshWindowFn('safety_checker_module.js', { _isCanvasEnv: true, __alloAiUsable: () => true, callGemini: async () => '' });
    await win.SafetyContentChecker.aiCheck('this is a student message', 'socratic', '', () => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('analyzeFluencyWithGemini respects host audio policy', () => {
  const run = async (setup) => {
    const { win, fetchMock } = freshWindowFn('fluency_module.js', setup);
    const r = await win.analyzeFluencyWithGemini('AAAA', 'audio/webm', 'The cat sat.');
    return { r, fetchMock };
  };
  const usable = (map) => (kind) => !!map[kind];
  it('blocks a student whose audio is not approved even though text AI is on', async () => {
    const { r, fetchMock } = await run({ __alloAiUsable: usable({ text: true, audio: false }), __alloResolveGeminiAudioCapability: () => ({ available: false, reason: 'student-audio-not-approved' }), callGemini: async () => '' });
    expect(r).toBe(null);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('blocks when the host reports student AI disabled', async () => {
    const { r, fetchMock } = await run({ __alloAiUsable: usable({}), __alloResolveGeminiAudioCapability: () => ({ available: false, reason: 'student-ai-disabled' }) });
    expect(r).toBe(null);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('keeps keyless Canvas working (only reason: missing key, text AI usable)', async () => {
    const { fetchMock } = await run({ __alloAiUsable: usable({ text: true, audio: false }), __alloResolveGeminiAudioCapability: () => ({ available: false, reason: 'missing-gemini-key' }), callGemini: async () => '' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('runs when host audio is usable', async () => {
    const { fetchMock } = await run({ __alloAiUsable: usable({ text: true, audio: true }), __alloResolveGeminiAudioCapability: () => ({ available: true, reason: 'gemini-key' }), callGeminiAudio: async () => '', callGemini: async () => '' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
