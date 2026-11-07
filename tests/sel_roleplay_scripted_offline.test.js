// Scripted (no-AI) role-play in four SEL tools (2026-11-04, AI-off sweep wave 5, lane rp_b):
// Self-Advocacy voice practice, Conflict Resolution Lab role-play + mediation, Social Skills Lab
// conversations, Peer Support Coach practice conversations.
// 1. Every script is a valid AdventureOffline story (8-14 scenes, 2-3 choices, 2+ endings with a
//    "What worked:" debrief, braided). Peer-support safety scripts end with a trusted adult every time.
// 2. With student AI off (blocked host fns), a learner plays a script to an ending, saves a reflection
//    to the tool's toolData (checked with SelHub.safeRehearseCheck), gets XP once per scenario,
//    and nothing calls callGemini / callImagen / callGeminiVision / image edit.
// 3. An old host without AdventureOffline gets a built-in player.
// 4. With AI on, the scripted version is offered beside the AI role-play.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Advocacy is a 1.2 MB tool: give a loaded machine room before a render-heavy test times out.
vi.setConfig({ testTimeout: 30000 });
const require = createRequire(import.meta.url);
const React =require(resolve('desktop/web-app/node_modules/react'));
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
  if (typeof Element.prototype.scrollIntoView !== 'function') Element.prototype.scrollIntoView = noop;
  globalThis.Audio = function () { return { play: () => Promise.resolve(), pause: noop }; };
  const load = (f) => new Function('require', readFileSync(f, 'utf8'))(require);
  load('view_adventure_module.js');
  load('sel_hub/sel_hub_module.js');
  load('sel_hub/sel_safety_layer.js');
  ['advocacy', 'conflict', 'sociallab', 'peersupport'].forEach((n) => load('sel_hub/sel_tool_' + n + '.js'));
  Offline = window.AlloModules.AdventureOffline;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  delete window.__alloAiUsable; delete window.__alloStudentAiDisabled;
  ['callGemini', 'callImagen', 'callGeminiVision', 'callGeminiImageEdit'].forEach((k) => { delete window[k]; });
});

const click = (el) => act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const setValue = (el, value) => act(async () => {
  Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
const blocked = () => { const fn = vi.fn(() => Promise.reject(new Error('blocked'))); fn._alloQrBlocked = true; return fn; };
function blockAi() {
  const spies = { gemini: blocked(), imagen: blocked(), vision: blocked(), edit: blocked() };
  window.callGemini = spies.gemini; window.callImagen = spies.imagen; window.callGeminiVision = spies.vision; window.callGeminiImageEdit = spies.edit;
  window.__alloStudentAiDisabled = true; window.__alloAiUsable = () => false;
  return spies;
}
const noAiCalls = (spies) => Object.values(spies).forEach((s) => expect(s).not.toHaveBeenCalled());

let state = null;
function Host({ id, initial, spies, awardXP, ai }) {
  const [toolData, setToolData] = React.useState({ [id]: initial || {} });
  state = toolData[id];
  const noop = () => {};
  const base = {
    React, toolData,
    update: (tid, k, v) => setToolData((p) => ({ ...p, [tid]: { ...(p[tid] || {}), [k]: v } })),
    updateMulti: (tid, o) => setToolData((p) => ({ ...p, [tid]: { ...(p[tid] || {}), ...o } })),
    awardXP, addToast: noop, celebrate: noop, announceToSR: noop, t: (k) => k, gradeBand: 'middle', gradeLevel: '7th Grade',
    theme: { isDark: true, isContrast: false }, icons: new Proxy({}, { get: () => () => null }),
    a11yClick: (fn) => ({ onClick: fn, role: 'button', tabIndex: 0 }),
    // An AI-off host that forgot to null them: tools must read aiAvailable / __alloAiUsable.
    callGemini: spies.gemini, callImagen: spies.imagen, callGeminiVision: null, callTTS: null, aiAvailable: !!ai,
    onSafetyFlag: noop,
  };
  const ctx = new Proxy(base, { get: (o, p) => (p in o ? o[p] : undefined) });
  return window.SelHub.renderTool(id, ctx);
}
async function mount(props) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Host, props)));
}
const $ = (sel) => document.querySelector(sel);
const text = () => document.body.textContent;
const xpAt = (awardXP, n) => awardXP.mock.calls.filter((c) => c.length === 1 && c[0] === n).length;
const play = async (path) => { for (const to of path) await click($(`[data-offline-choice="${to}"]`)); };

const scriptsOf = (id) => {
  const s = window.SelHub._registry[id].offlineScripts;
  return id === 'conflict' ? { ...s.practice, ...s.mediation } : s;
};

describe('scripted role-play scripts are valid shared stories', () => {
  const expected = {
    advocacy: ['vo1', 'vo10', 'vo4', 'vo5', 'vo8'],
    conflict: ['med1', 'med4', 'med7', 'rp1', 'rp6', 'rp8'],
    sociallab: ['broken_toy', 'college_stress', 'group_project', 'lunch_table', 'new_kid'],
    peersupport: ['bully', 'family', 'grades', 'identity', 'lonely'],
  };
  for (const [id, keys] of Object.entries(expected)) {
    it(id + ': every script validates, braided, 2-3 choices, debriefed endings', () => {
      const scripts = scriptsOf(id);
      expect(Object.keys(scripts).sort()).toEqual(keys.slice().sort());
      for (const [k, raw] of Object.entries(scripts)) {
        const story = Offline.normalize(raw);
        const check = Offline.validate(story);
        expect(check.errors, k).toEqual([]);
        expect(check.warnings, k).toEqual([]);
        expect(story.scenes.length, k).toBeGreaterThanOrEqual(8);
        expect(story.scenes.length, k).toBeLessThanOrEqual(14);
        expect(check.stats.endings, k).toBeGreaterThanOrEqual(2);
        expect(check.stats.endings, k).toBeLessThanOrEqual(3);
        story.scenes.filter((s) => !s.ending).forEach((s) => {
          expect(s.choices.length, k + ':' + s.id).toBeGreaterThanOrEqual(2);
          expect(s.choices.length, k + ':' + s.id).toBeLessThanOrEqual(3);
        });
        story.scenes.filter((s) => s.ending).forEach((s) => expect(s.text, k + ':' + s.id).toContain('What worked:'));
        expect(Offline.outline(story).some((row) => row.inbound > 1), k + ' braided').toBe(true);
      }
    });
  }

  it('peer-support safety scripts: every ending brings in a trusted adult; no ending keeps the secret', () => {
    const scripts = scriptsOf('peersupport');
    for (const k of ['bully', 'family']) {
      Offline.normalize(scripts[k]).scenes.filter((s) => s.ending).forEach((s) => {
        expect(/trusted adult|counselor|teacher|Mr\. Kim|Ms\. Rivera/.test(s.text), k + ':' + s.id).toBe(true);
      });
    }
  });
});

describe('Conflict Resolution Lab role-play with student AI off', () => {
  it('plays a scripted scene, reflects, earns XP once, and makes no AI calls', async () => {
    const spies = blockAi();
    const awardXP = vi.fn();
    const check = vi.spyOn(window.SelHub, 'safeRehearseCheck');
    await mount({ id: 'conflict', spies, awardXP, initial: { activeTab: 'roleplay', rpModeRP: 'practice', rpSubMode: 'chat' } });
    expect([...document.querySelectorAll('[role="tab"]')].map((b) => b.textContent).join('|')).toContain('Role-Play');
    expect(text()).not.toContain('AI Mediator');
    expect(text()).not.toContain('Practice Mode'); // the AI mode menu never renders
    expect($('input[aria-label="Role-play message"]')).toBeNull(); // nor a saved AI chat
    expect($('[data-cfl-script-card="med4"]')).not.toBeNull();
    await click($('[data-cfl-script-card="rp1"]'));
    expect($('[data-cfl-script-player="rp1"] [data-adventure-offline-player]')).not.toBeNull();
    await play(['istate', 'end_fair']);
    expect($('[data-offline-scene-text]').textContent).toContain('What worked:');
    expect(state.rpScriptDone).toEqual({ 'rp1:end_fair': true });
    expect(xpAt(awardXP, 10)).toBe(1);
    expect(state.earnedBadges.scripted_scene).toBeTruthy();
    await setValue($('#cfl-reflect-script'), 'Taking turns worked because I said how I felt.');
    await click($('[data-cfl-reflect-save]'));
    expect(check).toHaveBeenCalledWith('Taking turns worked because I said how I felt.', expect.objectContaining({ toolId: 'conflict' }));
    expect(state.rpScriptReflections).toHaveLength(1);
    expect(state.rpScriptReflections[0]).toMatchObject({ scenarioId: 'rp1', ending: 'end_fair' });
    await click($('[data-offline-restart]'));
    expect(state.rpScriptEnding).toBe(null);
    await play(['walk', 'end_walk']);
    expect(text()).toContain('Endings found: 2 of 3');
    expect(xpAt(awardXP, 10)).toBe(1);
    noAiCalls(spies);
  });

  it('a blocked reflection raises the crisis tier', async () => {
    const spies = blockAi();
    vi.spyOn(window.SelHub, 'safeRehearseCheck').mockReturnValue({ action: 'block', severity: 'critical' });
    await mount({ id: 'conflict', spies, awardXP: vi.fn(), initial: { activeTab: 'roleplay', rpScriptKey: 'rp6' } });
    await play(['istate', 'why', 'end_repair']);
    await setValue($('#cfl-reflect-script'), 'test text');
    await click($('[data-cfl-reflect-save]'));
    expect(state._rpScriptTier).toBe(3);
    noAiCalls(spies);
  });

  it('an old host without AdventureOffline gets the built-in player (mediation)', async () => {
    const spies = blockAi();
    const saved = window.AlloModules.AdventureOffline;
    delete window.AlloModules.AdventureOffline;
    try {
      await mount({ id: 'conflict', spies, awardXP: vi.fn(), initial: { activeTab: 'roleplay', rpScriptKey: 'med1' } });
      for (const to of ['rules', 'heard', 'end_agree']) await click($(`[data-cfl-choice="${to}"]`));
      expect($('[data-cfl-fallback-player]').textContent).toContain('What worked:');
      expect(state.rpScriptDone).toEqual({ 'med1:end_agree': true });
      expect($('[data-cfl-reflect]')).not.toBeNull();
    } finally { window.AlloModules.AdventureOffline = saved; }
    noAiCalls(spies);
  });

  it('badges: AI role-play badges hide without AI; the scripted badge shows', async () => {
    const spies = blockAi();
    await mount({ id: 'conflict', spies, awardXP: vi.fn(), initial: { activeTab: 'roleplay', showBadgesPanel: true } });
    expect(text()).toContain('Scene Rehearser');
    expect(text()).not.toContain('Role-Player');
    expect(text()).not.toContain('Master Mediator');
  });

  it('with AI on, scripted scenes are a third mode beside the AI ones', async () => {
    window.__alloAiUsable = () => true;
    const spies = { gemini: vi.fn(() => Promise.resolve('')), imagen: vi.fn() };
    await mount({ id: 'conflict', spies, awardXP: vi.fn(), ai: true, initial: { activeTab: 'roleplay', showBadgesPanel: true } });
    expect(text()).toContain('Practice Mode');
    expect(text()).toContain('Mediation Mode');
    expect(text()).toContain('Role-Player');
    await click($('[data-cfl-scripted-mode]'));
    expect(state.rpModeRP).toBe('scripted');
    expect($('[data-cfl-script-card="rp8"]')).not.toBeNull();
    expect(spies.gemini).not.toHaveBeenCalled();
  });
});

describe('Self-Advocacy voice practice with student AI off', () => {
  it('plays a scripted practice, reflects, earns XP once, and makes no AI calls', async () => {
    const spies = blockAi();
    const awardXP = vi.fn();
    const check = vi.spyOn(window.SelHub, 'safeRehearseCheck');
    await mount({ id: 'advocacy', spies, awardXP, initial: { activeTab: 'voice', voMode: 'chat' } });
    expect(text()).not.toContain('AI-powered authority figures');
    expect($('input[aria-label="Voice practice message"]')).toBeNull();
    expect(text()).toContain('Voices to borrow'); // the quote decks stay
    await click($('[data-adv-script-card="vo1"]'));
    expect($('[data-adv-script-player="vo1"] [data-adventure-offline-player]')).not.toBeNull();
    await play(['clear', 'specific', 'plan', 'end_best']);
    expect(state.voScriptDone).toEqual({ 'vo1:end_best': true });
    expect(xpAt(awardXP, 10)).toBe(1);
    expect(state.earnedBadges.voice_scripted).toBeTruthy();
    await setValue($('#adv-reflect-script'), 'Naming the exact part that was hard helped.');
    await click($('[data-adv-reflect-save]'));
    expect(check).toHaveBeenCalledWith('Naming the exact part that was hard helped.', expect.objectContaining({ toolId: 'advocacy' }));
    expect(state.voScriptReflections[0]).toMatchObject({ scenarioId: 'vo1', ending: 'end_best' });
    await click($('[data-offline-restart]'));
    await play(['quiet', 'end_wait']);
    expect(text()).toContain('Endings found: 2 of 3');
    expect(xpAt(awardXP, 10)).toBe(1);
    noAiCalls(spies);
  });

  it('an old host without AdventureOffline gets the built-in player', async () => {
    const spies = blockAi();
    const saved = window.AlloModules.AdventureOffline;
    delete window.AlloModules.AdventureOffline;
    try {
      await mount({ id: 'advocacy', spies, awardXP: vi.fn(), initial: { activeTab: 'voice', voScriptKey: 'vo8' } });
      for (const to of ['specific', 'reread', 'end_best']) await click($(`[data-adv-choice="${to}"]`));
      expect($('[data-adv-fallback-player]').textContent).toContain('What worked:');
      expect(state.voScriptDone).toEqual({ 'vo8:end_best': true });
    } finally { window.AlloModules.AdventureOffline = saved; }
    noAiCalls(spies);
  });

  it('badges: AI voice badges hide without AI; the scripted badge shows', async () => {
    const spies = blockAi();
    await mount({ id: 'advocacy', spies, awardXP: vi.fn(), initial: { activeTab: 'voice', showBadgesPanel: true } });
    expect(text()).toContain('Practice Run');
    expect(text()).not.toContain('Heard & Understood');
    expect(text()).not.toContain('Confident Speaker');
  });

  it('with AI on, the scripted practice is offered beside the AI one', async () => {
    window.__alloAiUsable = () => true;
    const spies = { gemini: vi.fn(() => Promise.resolve('')) };
    await mount({ id: 'advocacy', spies, awardXP: vi.fn(), ai: true, initial: { activeTab: 'voice' } });
    expect(text()).toContain('AI-powered authority figures');
    await click($('[data-adv-scripted-mode]'));
    expect(state.voMode).toBe('scripted');
    expect($('[data-adv-script-card="vo5"]')).not.toBeNull();
    expect(spies.gemini).not.toHaveBeenCalled();
  });
});

describe('Social Skills Lab conversations with student AI off', () => {
  it('plays a scripted conversation, reflects, earns XP once, and makes no AI calls', async () => {
    const spies = blockAi();
    const awardXP = vi.fn();
    const check = vi.spyOn(window.SelHub, 'safeRehearseCheck');
    await mount({ id: 'sociallab', spies, awardXP });
    expect(text()).not.toContain('AI Peer Roleplay');
    expect($('[data-sl-script-menu]')).not.toBeNull();
    await click($('[data-sl-script-card="new_kid"]'));
    expect($('[data-sl-script-player="new_kid"] [data-adventure-offline-player]')).not.toBeNull();
    await play(['hello', 'talk', 'end_friend']);
    expect(state.scriptDone).toEqual({ 'new_kid:end_friend': true });
    expect(awardXP.mock.calls).toEqual([[10]]);
    await setValue($('#sl-reflect-script'), 'Asking where Alex was from helped.');
    await click($('[data-sl-reflect-save]'));
    expect(check).toHaveBeenCalledWith('Asking where Alex was from helped.', expect.objectContaining({ toolId: 'sociallab' }));
    expect(state.scriptReflections[0]).toMatchObject({ scenarioId: 'new_kid', ending: 'end_friend' });
    await click($('[data-offline-restart]'));
    await play(['wave', 'end_missed']);
    expect(text()).toContain('Endings found: 2 of 3');
    expect(awardXP.mock.calls).toEqual([[10]]);
    // Back on the menu, the no-AI badge shows.
    await click([...document.querySelectorAll('button')].find((b) => b.textContent === '← All conversations'));
    await click([...document.querySelectorAll('button')].find((b) => b.textContent === '← Back'));
    expect($('[aria-label="Earned badges"]').textContent).toContain('Practice Run');
    noAiCalls(spies);
  });

  it('an old host without AdventureOffline gets the built-in player', async () => {
    const spies = blockAi();
    const saved = window.AlloModules.AdventureOffline;
    delete window.AlloModules.AdventureOffline;
    try {
      await mount({ id: 'sociallab', spies, awardXP: vi.fn() });
      await click($('[data-sl-script-card="group_project"]'));
      for (const to of ['check', 'plan', 'end_team']) await click($(`[data-sl-choice="${to}"]`));
      expect($('[data-sl-fallback-player]').textContent).toContain('What worked:');
      expect(state.scriptDone).toEqual({ 'group_project:end_team': true });
    } finally { window.AlloModules.AdventureOffline = saved; }
    noAiCalls(spies);
  });

  it('with AI on, the scripted conversations are offered beside the AI roleplay', async () => {
    window.__alloAiUsable = () => true;
    const spies = { gemini: vi.fn(() => Promise.resolve('')) };
    await mount({ id: 'sociallab', spies, awardXP: vi.fn(), ai: true });
    expect(text()).toContain('AI Peer Roleplay');
    expect($('[data-sl-script-menu]')).toBeNull();
    await click($('[data-sl-scripted-mode]'));
    expect($('[data-sl-script-card="lunch_table"]')).not.toBeNull();
    expect(spies.gemini).not.toHaveBeenCalled();
  });
});

describe('Peer Support Coach practice conversations with student AI off', () => {
  it('plays the safety script to telling a trusted adult, reflects, earns XP once, no AI calls', async () => {
    const spies = blockAi();
    const awardXP = vi.fn();
    const check = vi.spyOn(window.SelHub, 'safeRehearseCheck');
    await mount({ id: 'peersupport', spies, awardXP });
    expect(text()).not.toContain('AI Practice Conversations');
    expect($('[data-ps-script-menu]')).not.toBeNull();
    await click($('[data-ps-script-card="family"]'));
    // Promising secrecy does not end the story: it leads back to telling an adult.
    await play(['promise', 'weight', 'end_together']);
    expect($('[data-offline-scene-text]').textContent).toContain('counselor');
    expect(state.scriptDone).toEqual({ 'family:end_together': true });
    expect(awardXP.mock.calls).toEqual([[10]]);
    await setValue($('#ps-reflect-script'), 'Some secrets are not safe to keep.');
    await click($('[data-ps-reflect-save]'));
    expect(check).toHaveBeenCalledWith('Some secrets are not safe to keep.', expect.objectContaining({ toolId: 'peersupport' }));
    expect(state.scriptReflections[0]).toMatchObject({ scenarioId: 'family', ending: 'end_together' });
    await click($('[data-offline-restart]'));
    await play(['dismiss', 'later', 'end_counselor']);
    expect(awardXP.mock.calls).toEqual([[10]]);
    noAiCalls(spies);
  });

  it('an old host without AdventureOffline gets the built-in player', async () => {
    const spies = blockAi();
    const saved = window.AlloModules.AdventureOffline;
    delete window.AlloModules.AdventureOffline;
    try {
      await mount({ id: 'peersupport', spies, awardXP: vi.fn() });
      await click($('[data-ps-script-card="lonely"]'));
      for (const to of ['open', 'reflect', 'affirm', 'end_friend']) await click($(`[data-ps-choice="${to}"]`));
      expect($('[data-ps-fallback-player]').textContent).toContain('What worked:');
      expect(state.scriptDone).toEqual({ 'lonely:end_friend': true });
    } finally { window.AlloModules.AdventureOffline = saved; }
    noAiCalls(spies);
  });

  it('with AI on, the scripted conversations are offered beside the AI ones', async () => {
    window.__alloAiUsable = () => true;
    const spies = { gemini: vi.fn(() => Promise.resolve('')) };
    await mount({ id: 'peersupport', spies, awardXP: vi.fn(), ai: true });
    expect(text()).toContain('AI Practice Conversations');
    await click($('[data-ps-scripted-mode]'));
    expect($('[data-ps-script-card="bully"]')).not.toBeNull();
    expect(spies.gemini).not.toHaveBeenCalled();
  });
});
