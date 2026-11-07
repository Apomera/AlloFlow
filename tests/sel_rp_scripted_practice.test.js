// Scripted practice with no AI (2026-11-04, AI-off sweep wave 5, lane rp_a):
// Coping Toolkit (Rehearse), Restorative Circle (Rehearse), Self-Advocacy Studio
// (Practice) and Upstander Workshop (Practice) each play branching scripts in
// AdventureOffline.Player in place of the hidden AI role-play.
// 1. Every script is a valid AdventureOffline story (8-14 scenes, 2-3 choices,
//    2+ endings, every ending closes with "What worked:", braided).
// 2. AI off: a learner plays a script to an ending, saves a reflection (local
//    safety check), gets XP once per scenario, and nothing calls an AI function.
// 3. An old host without AdventureOffline gets the built-in player.
// 4. AI on: the scripted version is offered beside the AI role-play.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let root, host, Offline;

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.React = window.React = React;
  window.AlloModules = {};
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloLanguageContext = React.createContext({ t: (k) => k });
  window.__alloHooks = { useFocusTrap: () => {} };
  const noop = () => {};
  if (typeof window.matchMedia !== 'function') window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  if (typeof window.scrollTo !== 'function') window.scrollTo = noop;
  if (typeof Element.prototype.scrollIntoView !== 'function') Element.prototype.scrollIntoView = noop;
  globalThis.Audio = function () { return { play: () => Promise.resolve(), pause: noop }; };
  const load = (f) => new Function('require', readFileSync(f, 'utf8'))(require);
  load('view_adventure_module.js');
  load('sel_hub/sel_hub_module.js');
  load('sel_hub/sel_safety_layer.js');
  ['coping', 'restorativecircle', 'selfadvocacy', 'upstander'].forEach((n) => load('sel_hub/sel_tool_' + n + '.js'));
  Offline = window.AlloModules.AdventureOffline;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  document.body.innerHTML = '';
  delete window.__alloAiUsable; delete window.__alloStudentAiDisabled;
  ['callGemini', 'callImagen', 'callGeminiVision', 'callGeminiImageEdit'].forEach((k) => { delete window[k]; });
});

const click = (el) => act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const setValue = (el, value) => act(async () => {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
const blocked = () => { const fn = vi.fn(() => Promise.reject(new Error('blocked'))); fn._alloQrBlocked = true; return fn; };
function blockAi() {
  const spies = { gemini: blocked(), imagen: blocked(), vision: blocked(), edit: blocked() };
  window.callGemini = spies.gemini; window.callImagen = spies.imagen; window.callGeminiVision = spies.vision; window.callGeminiImageEdit = spies.edit;
  window.__alloStudentAiDisabled = true; window.__alloAiUsable = () => false;
  return spies;
}
function allowAi() {
  const spies = { gemini: vi.fn(async () => '') };
  window.__alloAiUsable = () => true;
  return spies;
}
const noAiCalls = (spies) => Object.values(spies).forEach((s) => expect(s).not.toHaveBeenCalled());
const $ = (sel) => document.querySelector(sel);

const TOOLS = [
  { id: 'coping', key: 'coping', open: { activeTab: 'rehearse' }, scripts: ['anxious_voice', 'friend_bailing', 'parent_escalating', 'sensory_overload'],
    sid: 'anxious_voice', path: ['named', 'breath', 'selftalk', 'end_steady'], path2: ['pushdown', 'avoid', 'end_later'], endings: 3 },
  { id: 'restorativeCircle', key: 'restorativeCircle', open: { tab: 'rehearse' }, scripts: ['accountability', 'facilitator', 'listening'],
    sid: 'facilitator', path: ['what', 'thinking', 'affected', 'impact', 'repair', 'end_repair'], path2: ['rush', 'end_early'], endings: 3 },
  { id: 'selfAdvocacy', key: 'selfAdvocacy', open: { activeTab: 'practice', pScenarioId: 'm1' }, scripts: ['h1', 'h2', 'm1', 'm6'],
    sid: 'm1', path: ['open', 'clear', 'specific', 'end_clear'], path2: ['wait', 'end_unspoken'], endings: 3 },
  { id: 'upstander', key: 'upstander', open: { activeTab: 'practice' }, scripts: ['bully', 'bystander', 'exclusion', 'target'],
    sid: 'bully', path: ['distract', 'checkin', 'end_ally'], path2: ['laugh', 'direct', 'distract', 'checkin', 'end_partial'], endings: 3 },
];

let state = null;
function Host({ tool, initial, spies, awardXP, aiOn }) {
  const [toolData, setToolData] = React.useState({ [tool.key]: initial || {} });
  state = toolData[tool.key];
  const noop = () => {};
  const pal = { bg: '#ffffff', bgCard: '#f8fafc', text: '#0f172a', textMuted: '#475569', border: '#cbd5e1', accent: '#4f46e5', accentText: '#fff' };
  const base = {
    React, toolData, setToolData,
    update: (id, k, v) => setToolData((p) => ({ ...p, [id]: { ...(p[id] || {}), [k]: v } })),
    updateMulti: (id, o) => setToolData((p) => ({ ...p, [id]: { ...(p[id] || {}), ...o } })),
    awardXP, addToast: noop, celebrate: noop, announceToSR: noop, t: (k) => k, gradeBand: 'middle', gradeLevel: '7th Grade',
    theme: { isDark: true, isContrast: false, palette: pal, ...pal }, isDark: true, isContrast: false, themePalette: pal,
    icons: new Proxy({}, { get: () => () => null }), a11yClick: (fn) => ({ onClick: fn, onKeyDown: noop, role: 'button', tabIndex: 0 }),
    getSavePolicy: () => ({ checkpointLabel: 'x', sharePacketLabel: 'y' }), getXP: () => 0, beep: noop,
    srOnly: (t) => React.createElement('span', { className: 'sr-only' }, t), toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop, props: {},
    // AI off: a host that forgot to null them; the tools must still read aiAvailable / __alloAiUsable.
    callGemini: spies.gemini, callImagen: spies.imagen || null, callGeminiVision: null, callTTS: null, aiAvailable: !!aiOn,
    onSafetyFlag: noop, studentCodename: 'test', setSelHubTool: noop, setSelHubTab: noop, selHubTab: 'explore', selHubTool: tool.id,
  };
  const ctx = new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
  return window.SelHub.renderTool(tool.id, ctx);
}
async function mount(props) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Host, props)));
}

describe('scripted practice scripts are valid shared stories', () => {
  for (const tool of TOOLS) {
    it(tool.id + ': every script validates, braided, 8-14 scenes, 2-3 choices, debriefed endings', () => {
      const reg = window.SelHub._registry[tool.id];
      expect(Object.keys(reg.offlineScripts).sort()).toEqual(tool.scripts);
      for (const [id, raw] of Object.entries(reg.offlineScripts)) {
        const story = Offline.normalize(raw);
        const check = Offline.validate(story);
        expect(check.errors, id + ' errors').toEqual([]);
        expect(check.warnings, id + ' warnings').toEqual([]);
        expect(story.scenes.length, id).toBeGreaterThanOrEqual(8);
        expect(story.scenes.length, id).toBeLessThanOrEqual(14);
        expect(check.stats.endings, id).toBeGreaterThanOrEqual(2);
        expect(check.stats.endings, id).toBeLessThanOrEqual(3);
        story.scenes.filter((s) => !s.ending).forEach((s) => {
          expect(s.choices.length, id + ':' + s.id).toBeGreaterThanOrEqual(2);
          expect(s.choices.length, id + ':' + s.id).toBeLessThanOrEqual(3);
        });
        story.scenes.filter((s) => s.ending).forEach((s) => expect(s.text, id + ':' + s.id).toContain('What worked:'));
        expect(Offline.outline(story).some((row) => row.inbound > 1), id + ' braided').toBe(true);
      }
    });
  }
});

describe('scripted practice with student AI off', () => {
  for (const tool of TOOLS) {
    it(tool.id + ': plays a script to an ending, reflects, XP once per scenario, no AI calls', async () => {
      const spies = blockAi();
      const awardXP = vi.fn();
      const safety = vi.spyOn(window.SelHub, 'safeRehearseCheck');
      await mount({ tool, initial: tool.open, spies, awardXP, aiOn: false });
      expect($('[data-sp-offer]')).toBeNull(); // AI off: the picker itself is scripted
      const start = $(`[data-sp-start="${tool.sid}"]`);
      expect(start, 'scripted start control').not.toBeNull();
      await click(start);
      expect(state.spId).toBe(tool.sid);
      expect($(`[data-sp-player="${tool.sid}"] [data-adventure-offline-player]`)).not.toBeNull();
      for (const to of tool.path) await click($(`[data-offline-choice="${to}"]`));
      expect($('[data-offline-scene]').textContent).toBe('The end');
      expect($('[data-offline-scene-text]').textContent).toContain('What worked:');
      const endId = tool.path[tool.path.length - 1];
      expect(state.spEnding).toBe(endId);
      expect(state.spDone).toEqual({ [tool.sid + ':' + endId]: true });
      expect(awardXP).toHaveBeenCalledTimes(1);
      expect(awardXP.mock.calls[0][0]).toBe(10);
      expect(document.body.textContent).toContain('Endings found: 1 of ' + tool.endings);
      const field = $('[data-sp-reflect] textarea');
      await setValue(field, 'Slowing down and asking a question changed how it went.');
      await click($('[data-sp-reflect-save]'));
      expect(safety).toHaveBeenCalledWith('Slowing down and asking a question changed how it went.', expect.objectContaining({ toolId: expect.any(String) }));
      expect(state.spReflections).toHaveLength(1);
      expect(state.spReflections[0]).toMatchObject({ scenarioId: tool.sid, ending: endId });
      expect(document.body.textContent).toContain('Saved to your work.');
      // Replay to a second ending: XP only for the first ending in a scenario.
      await click($('[data-offline-restart]'));
      expect(state.spEnding).toBe(null);
      for (const to of tool.path2) await click($(`[data-offline-choice="${to}"]`));
      expect(document.body.textContent).toContain('Endings found: 2 of ' + tool.endings);
      expect(awardXP).toHaveBeenCalledTimes(1);
      await click($('[data-sp-back]'));
      expect(state.spId).toBe('');
      safety.mockRestore();
      noAiCalls(spies);
    });

    it(tool.id + ': an old host without AdventureOffline gets the built-in player', async () => {
      const spies = blockAi();
      const saved = window.AlloModules.AdventureOffline;
      delete window.AlloModules.AdventureOffline;
      try {
        const awardXP = vi.fn();
        await mount({ tool, initial: { ...tool.open, spId: tool.sid }, spies, awardXP, aiOn: false });
        expect($('[data-sp-fallback-player]')).not.toBeNull();
        for (const to of tool.path) await click($(`[data-sp-choice="${to}"]`));
        expect($('[data-sp-fallback-player]').textContent).toContain('What worked:');
        expect(state.spDone).toEqual({ [tool.sid + ':' + tool.path[tool.path.length - 1]]: true });
        expect($('[data-sp-reflect]')).not.toBeNull();
        expect(awardXP).toHaveBeenCalledTimes(1);
      } finally { window.AlloModules.AdventureOffline = saved; }
      noAiCalls(spies);
    });
  }
});

describe('scripted practice is offered beside the AI role-play when AI is on', () => {
  for (const tool of TOOLS) {
    it(tool.id + ': shows a scripted-version option and plays it without calling AI', async () => {
      const spies = allowAi();
      await mount({ tool, initial: tool.open, spies, awardXP: vi.fn(), aiOn: true });
      if (tool.id === 'upstander') {
        // A collapsed extra option below the AI role-play.
        const toggle = $('[data-sp-toggle]');
        expect(toggle.textContent).toContain('Scripted practice (no AI)');
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(document.body.textContent).toContain('Practice the conversation (role-play)');
        await click(toggle);
      } else {
        expect($('[data-sp-offer]')).not.toBeNull();
      }
      await click($(`[data-sp-start="${tool.sid}"]`));
      expect($(`[data-sp-player="${tool.sid}"] [data-adventure-offline-player]`)).not.toBeNull();
      await click($(`[data-offline-choice="${tool.path[0]}"]`));
      noAiCalls(spies);
    });
  }
});
