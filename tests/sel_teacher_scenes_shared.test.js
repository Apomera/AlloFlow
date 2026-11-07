// Teacher-written scenes on one shared helper (2026-11-04, AI-off sweep wave 6, lane sel_scenes).
// window.SelHub.teacherScenes (sel_hub_module.js) normalizes + validates on read and renders the student
// "From your teacher" list and the teacher editor. Conflict Theater moved onto it (its own tests live in
// tests/sel_teacher_tool_config.test.js) and 8 tools were wired:
// 1. Helper unit behaviour: shape, validation, limits, content standard.
// 2. Per tool, with student AI off: teacher scene shown before the built-ins, plays in the tool's own player,
//    reflection goes through SelHub.safeRehearseCheck, XP once per scene, blocked AI spies never called.
// 3. Per tool: the editor appears only with ctx.setToolConfig; hand-writing works with no AI.
// 4. AI drafts: Save stays off until the teacher ticks the review; prompt carries the content standard;
//    Peer Support adds the trusted-adult rule, shows it in the editor and confirms it on an AI draft.
// 5. An older hub with no helper: tools render, with no teacher section (Conflict Theater included).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.setConfig({ testTimeout: 60000 });
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let root, host, Offline, Api;

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
  ['coping', 'restorativecircle', 'selfadvocacy', 'upstander', 'advocacy', 'conflict', 'sociallab', 'peersupport', 'conflicttheater'].forEach((n) => load('sel_hub/sel_tool_' + n + '.js'));
  Offline = window.AlloModules.AdventureOffline;
  Api = window.SelHub.teacherScenes;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  delete window.__alloAiUsable; delete window.__alloStudentAiDisabled; delete window.__alloAiSetupDoorway; delete window.AlloAiSetupNotice;
  ['callGemini', 'callImagen', 'callGeminiVision', 'callGeminiImageEdit'].forEach((k) => { delete window[k]; });
  window.SelHub.teacherScenes = Api;
});

const click = (el) => act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const setValue = (el, value) => act(async () => {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); await new Promise((r) => setTimeout(r, 0)); });
const blocked = () => { const fn = vi.fn(() => Promise.reject(new Error('blocked'))); fn._alloQrBlocked = true; return fn; };
function blockAi() {
  const spies = { gemini: blocked(), imagen: blocked(), vision: blocked(), edit: blocked() };
  window.callGemini = spies.gemini; window.callImagen = spies.imagen; window.callGeminiVision = spies.vision; window.callGeminiImageEdit = spies.edit;
  window.__alloStudentAiDisabled = true; window.__alloAiUsable = () => false;
  return spies;
}
const noAiCalls = (spies) => Object.values(spies).forEach((s) => expect(s).not.toHaveBeenCalled());
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const text = () => document.body.textContent;

let state = null;
function Host({ toolId, initial, cfg, teacher, spies, awardXP, aiOn, gemini }) {
  const [toolData, setToolData] = React.useState({ [toolId]: initial || {} });
  const [config, setConfig] = React.useState(cfg || {});
  state = toolData[toolId];
  const noop = () => {};
  const base = {
    React, toolData,
    update: (id, k, v) => setToolData((p) => ({ ...p, [id]: { ...(p[id] || {}), [k]: v } })),
    updateMulti: (id, o) => setToolData((p) => ({ ...p, [id]: { ...(p[id] || {}), ...o } })),
    awardXP: awardXP || noop, addToast: noop, celebrate: noop, announceToSR: noop, t: (k) => k, gradeBand: 'middle', gradeLevel: '7th Grade',
    theme: { isDark: true, isContrast: false }, icons: new Proxy({}, { get: () => () => null }),
    a11yClick: (fn) => ({ onClick: fn, role: 'button', tabIndex: 0 }), setSelHubTool: noop,
    callGemini: aiOn ? gemini : (spies ? spies.gemini : null), callImagen: spies ? spies.imagen : null, callGeminiVision: null, callTTS: null, aiAvailable: !!aiOn,
    onSafetyFlag: noop,
    toolConfig: config,
    toolConfigStation: teacher ? { id: 'st', name: 'Week 3', includesTool: true } : null,
    isTeacherView: !!teacher,
    setToolConfig: teacher ? (id, value) => { teacher(id, value); setConfig((p) => { const n = { ...p }; if (value) n[id] = value; else delete n[id]; return n; }); return true; } : null,
  };
  const ctx = new Proxy(base, { get: (o, p) => (p in o ? o[p] : undefined) });
  return window.SelHub.renderTool(toolId, ctx);
}
async function mount(props) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Host, props)));
}

const STORY = { version: 1, title: 'The Window Seat', start: 's1', scenes: [
  { id: 's1', text: 'Two friends both want the window seat on the bus.', ending: false, choices: [{ label: "'Move, it is mine.'", to: 's2' }, { label: "'Can we take turns?'", to: 's3' }] },
  { id: 's2', text: 'Dev sits down hard and turns away. Not fixed yet.\n\nWhat worked:\n• Noticing it went badly is a start.', ending: true, choices: [] },
  { id: 's3', text: 'Dev grins. They agree to swap at the halfway stop.\n\nWhat worked:\n• Asking first.', ending: true, choices: [] },
] };
const BROKEN = { version: 1, title: 'Broken', start: 's1', scenes: [{ id: 's1', text: 'Nowhere to go.', ending: false, choices: [{ label: 'Go', to: 'missing' }] }] };
const cfgFor = (toolId, scenes) => ({ [toolId]: { version: 1, scenes } });

// Per tool: how a student lands on the surface, the tool's own reflection box and where its state lives.
const TOOLS = [
  { id: 'coping', initial: { activeTab: 'rehearse' }, builtIn: '[data-sp-start="anxious_voice"]', keyField: 'spId', doneField: 'spDone', reflectField: 'spReflections', reflect: '#sp-reflect-coping', save: '[data-sp-reflect-save]', player: '[data-sp-player="teacher:ts_1"]', jump: { activeTab: 'library' } },
  { id: 'restorativeCircle', initial: { tab: 'rehearse' }, builtIn: '[data-sp-start="facilitator"]', keyField: 'spId', doneField: 'spDone', reflectField: 'spReflections', reflect: '#sp-reflect-restorativecircle', save: '[data-sp-reflect-save]', player: '[data-sp-player="teacher:ts_1"]', jump: { tab: 'home' } },
  { id: 'selfAdvocacy', initial: { activeTab: 'practice' }, builtIn: '[role="radiogroup"]', keyField: 'spId', doneField: 'spDone', reflectField: 'spReflections', reflect: '#sp-reflect-selfadvocacy', save: '[data-sp-reflect-save]', player: '[data-sp-player="teacher:ts_1"]', jump: { activeTab: 'menu' } },
  { id: 'upstander', initial: { activeTab: 'practice' }, builtIn: '[data-sp-toggle]', keyField: 'spId', doneField: 'spDone', reflectField: 'spReflections', reflect: '#sp-reflect-upstander', save: '[data-sp-reflect-save]', player: '[data-sp-player="teacher:ts_1"]', jump: { activeTab: 'roles' } },
  { id: 'advocacy', initial: { activeTab: 'voice' }, builtIn: '[data-adv-script-card="vo1"]', keyField: 'voScriptKey', doneField: 'voScriptDone', reflectField: 'voScriptReflections', reflect: '#adv-reflect-script', save: '[data-adv-reflect-save]', player: '[data-adv-script-player="teacher:ts_1"]', jump: { activeTab: 'mykit' } },
  { id: 'conflict', initial: { activeTab: 'roleplay' }, builtIn: '[data-cfl-script-card="rp1"]', keyField: 'rpScriptKey', doneField: 'rpScriptDone', reflectField: 'rpScriptReflections', reflect: '#cfl-reflect-script', save: '[data-cfl-reflect-save]', player: '[data-cfl-script-player="teacher:ts_1"]', jump: { activeTab: 'apology' } },
  { id: 'sociallab', initial: {}, builtIn: '[data-sl-script-menu]', keyField: 'scriptKey', doneField: 'scriptDone', reflectField: 'scriptReflections', reflect: '#sl-reflect-script', save: '[data-sl-reflect-save]', player: '[data-sl-script-player="teacher:ts_1"]' },
  { id: 'peersupport', initial: {}, builtIn: '[data-ps-script-menu]', keyField: 'scriptKey', doneField: 'scriptDone', reflectField: 'scriptReflections', reflect: '#ps-reflect-script', save: '[data-ps-reflect-save]', player: '[data-ps-script-player="teacher:ts_1"]' },
];

describe('window.SelHub.teacherScenes helper', () => {
  it('reads only the {version, scenes} shape, drops duplicates, caps at MAX, and checks every scene', () => {
    expect(Api.scenesFrom(null, Offline)).toEqual([]);
    expect(Api.scenesFrom({ scenes: 'nope' }, Offline)).toEqual([]);
    const out = Api.scenesFrom({ version: 1, scenes: [{ id: 'ok', story: STORY, intro: 'x'.repeat(900) }, { id: 'bad', story: BROKEN }, { id: 'ok', story: STORY }, { id: 'nostory' }, 'junk'] }, Offline);
    expect(out.map((s) => [s.id, s.ok])).toEqual([['ok', true], ['bad', false], ['nostory', false], ['ts_4', false]]);
    expect(out[0].key).toBe('teacher:ok');
    expect(out[0].intro).toHaveLength(600);
    const many = Array.from({ length: Api.MAX + 5 }, (_, i) => ({ id: 'a' + i, story: STORY }));
    expect(Api.scenesFrom({ scenes: many }, Offline)).toHaveLength(Api.MAX);
  });

  it('the blank starter is not playable until written; a host without AdventureOffline still checks links', () => {
    expect(Offline.validate(Offline.normalize(Api.starter())).ok).toBe(false);
    expect(Api.basicValid(STORY)).toBe(true);
    expect(Api.basicValid(BROKEN)).toBe(false);
    expect(Api.basicValid(Api.starter())).toBe(false);
    expect(Api.scenesFrom({ scenes: [{ id: 'a', story: STORY }, { id: 'b', story: BROKEN }] }, null).map((s) => s.ok)).toEqual([true, false]);
  });

  it('the content standard names what a school SEL tool must not do', () => {
    ['age-appropriate', 'no shaming endings', 'no clinical or diagnostic language', 'never real students', 'never quote slurs', 'What worked:'].forEach((s) => expect(Api.CONTENT_STANDARD).toContain(s));
  });

  it('bind: no toolConfig means no scenes and no student section; a student never gets the editor', () => {
    const h = React.createElement;
    const c = Api.bind({ ctx: { t: (k) => k, theme: {} }, h, toolId: 'x', d: { tsDraft: { story: Api.starter() } }, set: () => {} });
    expect(c.ready).toEqual([]);
    expect(c.canAuthor).toBe(false);
    expect(c.editing).toBe(false);
    expect(c.renderSection({ onPlay: () => {} })).toBe(null);
    expect(c.renderJump({ onOpen: () => {} })).toBe(null);
    expect(c.byKey('teacher:x')).toBe(null);
    expect(c.byKey('vo1')).toBe(null);
  });

  it('default theme colours keep at least 4.5:1 for body text in light, dark and high contrast', () => {
    const lum = (hex) => { const v = hex.replace('#', ''); const n = v.length === 3 ? v.split('').map((x) => x + x).join('') : v; const ch = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4))); return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]; };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const toRgbHex = (s) => (s.startsWith('#') ? s : '#' + s.match(/\d+/g).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join(''));
    for (const theme of [{ isDark: true }, { isDark: false }, { isContrast: true }]) {
      const c = Api.bind({ ctx: { t: (k) => k, theme, toolConfig: { x: { scenes: [{ id: 'a', story: STORY, intro: 'Setup' }] } } }, h: React.createElement, toolId: 'x', d: {}, set: () => {} });
      host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
      act(() => root.render(c.renderList({ onPlay: () => {} })));
      const btn = $('[data-ts-teacher-play="a"]');
      const bg = toRgbHex(btn.style.background || btn.style.backgroundColor);
      [...btn.querySelectorAll('div, p')].forEach((el) => expect(ratio(toRgbHex(el.style.color), bg), JSON.stringify(theme) + el.textContent).toBeGreaterThanOrEqual(4.5));
      act(() => root.unmount()); host.remove(); root = host = null;
    }
  });
});

describe('every tool: a student with AI off gets the teacher scene first', () => {
  for (const tool of TOOLS) {
    it(tool.id + ': listed before the built-ins, plays, reflects with the safety check, XP once, zero AI calls', async () => {
      const spies = blockAi();
      const awardXP = vi.fn();
      const check = vi.spyOn(window.SelHub, 'safeRehearseCheck');
      await mount({ toolId: tool.id, spies, awardXP, initial: tool.initial, cfg: cfgFor(tool.id, [{ id: 'ts_1', story: STORY, intro: 'Two friends, one seat.' }, { id: 'ts_bad', story: BROKEN }]) });
      const list = $('[data-ts-teacher-scenes]');
      expect(list).not.toBeNull();
      expect(list.textContent).toContain('From your teacher');
      expect($$('[data-ts-teacher-play]').map((e) => e.getAttribute('data-ts-teacher-play'))).toEqual(['ts_1']);
      const builtIn = $(tool.builtIn);
      expect(builtIn, 'built-in practice still there').not.toBeNull();
      expect(list.compareDocumentPosition(builtIn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect($('[data-ts-teacher-author]')).toBeNull();
      expect($('[data-ts-teacher-editor]')).toBeNull();

      await click($('[data-ts-teacher-play="ts_1"]'));
      expect(state[tool.keyField]).toBe('teacher:ts_1');
      expect($(tool.player + ' [data-adventure-offline-player]')).not.toBeNull();
      expect($('[data-ts-teacher-intro]').textContent).toContain('one seat');
      await click($('[data-offline-choice="s3"]'));
      expect(state[tool.doneField]).toEqual({ 'teacher:ts_1:s3': true });
      // XP once per scene; a tool may also pay its own scripted-practice badge bonus (as its built-in scripts do).
      const xpTens = () => awardXP.mock.calls.filter((c) => c.length === 1 && c[0] === 10).length;
      expect(xpTens()).toBe(1);
      const paidAfterFirstEnding = awardXP.mock.calls.length;
      expect(text()).toContain('Endings found: 1 of 2');

      await setValue($(tool.reflect), 'Asking about turns worked.');
      await click($(tool.save));
      expect(check).toHaveBeenCalledWith('Asking about turns worked.', expect.anything());
      expect(state[tool.reflectField][0]).toMatchObject({ scenarioId: 'teacher:ts_1', ending: 's3' });

      await click($('[data-offline-restart]'));
      await click($('[data-offline-choice="s2"]'));
      expect(awardXP.mock.calls).toHaveLength(paidAfterFirstEnding); // once per scene, not per ending
      noAiCalls(spies);
    });

    it(tool.id + ': no teacher section without teacher scenes; the editor needs ctx.setToolConfig', async () => {
      const spies = blockAi();
      await mount({ toolId: tool.id, spies, initial: tool.initial, cfg: {} });
      expect($('[data-ts-teacher-section]')).toBeNull();
      expect($('[data-ts-teacher-author]')).toBeNull();
      expect($(tool.builtIn)).not.toBeNull();
      noAiCalls(spies);
    });

    it(tool.id + ': a teacher with no AI writes a scene by hand and saves it', async () => {
      window.__alloAiUsable = () => false;
      window.__alloAiSetupDoorway = () => ({ disabled: true, title: 'Needs AI setup', cta: 'connect', onDoorway: () => {} });
      window.AlloAiSetupNotice = () => React.createElement('button', { type: 'button', 'data-ai-setup-doorway': '' }, 'Needs AI setup');
      const wrote = vi.fn();
      await mount({ toolId: tool.id, teacher: wrote, initial: tool.initial, cfg: {} });
      expect($('[data-ts-teacher-author]')).not.toBeNull();
      await click($('[data-ts-teacher-new]'));
      expect($('[data-ts-teacher-editor]')).not.toBeNull();
      expect($('[data-ts-teacher-save]').disabled).toBe(true);
      const ai = $('[data-ts-teacher-ai]');
      expect(ai.disabled).toBe(true);
      expect(ai.getAttribute('title')).toBe('Needs AI setup');
      expect($('[data-ts-teacher-ai-setup] [data-ai-setup-doorway]')).not.toBeNull();
      expect($('[data-ts-teacher-review]')).toBeNull(); // hand-written: no AI review step
      const editor = $('[data-adventure-offline-editor]');
      await setValue(editor.querySelector('input[type="text"]'), 'The Borrowed Pencil Case');
      await setValue($('[data-offline-scene-editor="s1"] textarea'), "Mira finds her pencil case on Theo's desk, half empty.");
      const labels = $$('[data-offline-scene-editor="s1"] input[type="text"]');
      await setValue(labels[0], "'You took my stuff again!'");
      await setValue(labels[1], "'Hey, is this mine? What happened?'");
      await setValue($('[data-offline-scene-editor="s2"] textarea'), 'Theo gets defensive. Not fixed yet.\n\nWhat worked:\n• Pausing.');
      await setValue($('[data-offline-scene-editor="s3"] textarea'), 'Theo explains he borrowed pens. They agree he asks first.\n\nWhat worked:\n• Asking first.');
      expect($('[data-ts-teacher-save]').disabled).toBe(false);
      await click($('[data-ts-teacher-preview]'));
      expect($('[data-adventure-offline-player]')).not.toBeNull();
      await click($('[data-ts-teacher-save]'));
      expect(wrote).toHaveBeenCalledTimes(1);
      const [toolId, value] = wrote.mock.calls[0];
      expect(toolId).toBe(tool.id);
      expect(value.version).toBe(1);
      expect(Offline.validate(Offline.normalize(value.scenes[0].story)).ok).toBe(true);
      expect(value.scenes[0].aiDrafted).toBe(false);
      expect($('[data-ts-teacher-editor]')).toBeNull();
      expect($('[data-ts-teacher-author]').textContent).toContain('students can play it');
      expect($$('[data-ts-teacher-play]')).toHaveLength(1);
    });

    it(tool.id + ': an older hub with no helper shows no teacher section and does not crash', async () => {
      const spies = blockAi();
      delete window.SelHub.teacherScenes;
      await mount({ toolId: tool.id, spies, initial: { ...tool.initial, [tool.keyField]: 'teacher:ts_1' }, cfg: cfgFor(tool.id, [{ id: 'ts_1', story: STORY }]) });
      expect($('[data-ts-teacher-scenes]')).toBeNull();
      expect($('[data-ts-teacher-author]')).toBeNull();
      expect($('[data-ts-teacher-jump]')).toBeNull();
      expect($(tool.builtIn)).not.toBeNull();
      noAiCalls(spies);
    });

    if (tool.jump) {
      it(tool.id + ': from another tab a student gets a pointer to the teacher scenes', async () => {
        const spies = blockAi();
        await mount({ toolId: tool.id, spies, initial: tool.jump, cfg: cfgFor(tool.id, [{ id: 'ts_1', story: STORY }]) });
        expect($('[data-ts-teacher-scenes]')).toBeNull();
        expect($('[data-ts-teacher-jump]').textContent).toContain('From your teacher (1)');
        await click($('[data-ts-teacher-jump]'));
        expect($('[data-ts-teacher-scenes]')).not.toBeNull();
        expect($('[data-ts-teacher-jump]')).toBeNull();
        noAiCalls(spies);
      });
    }
  }
});

describe('AI drafts need the teacher\'s review before saving', () => {
  for (const tool of TOOLS) {
    it(tool.id + ': Save waits for every check; the prompt carries the content standard', async () => {
      window.__alloAiUsable = () => true;
      const gemini = vi.fn(() => Promise.resolve(JSON.stringify(STORY)));
      const wrote = vi.fn();
      await mount({ toolId: tool.id, teacher: wrote, cfg: {}, aiOn: true, gemini, initial: tool.initial });
      await click($('[data-ts-teacher-new]'));
      expect($('[data-ts-teacher-ai]').disabled).toBe(true); // needs an idea first
      await setValue($(`[id="ts-${tool.id}-ts-idea"]`), 'Two friends both want the window seat on the bus.');
      await click($('[data-ts-teacher-ai]'));
      await flush();
      expect(gemini).toHaveBeenCalledTimes(1);
      expect(gemini.mock.calls[0][0]).toContain('Content standard');
      expect(gemini.mock.calls[0][0]).toContain('no shaming endings');
      expect(gemini.mock.calls[0][0]).toContain('window seat');
      expect(state.tsDraft.aiDrafted).toBe(true);
      expect($('[data-ts-teacher-review]')).not.toBeNull();
      const saveBtn = () => $('[data-ts-teacher-save]');
      expect(saveBtn().disabled).toBe(true);
      await click(saveBtn());
      expect(wrote).not.toHaveBeenCalled();
      const boxes = $$('[data-ts-teacher-check]');
      expect(boxes.length).toBeGreaterThanOrEqual(3);
      for (const el of boxes.slice(0, -1)) await click(el);
      expect(saveBtn().disabled).toBe(true);
      await click($$('[data-ts-teacher-check]').slice(-1)[0]);
      expect(saveBtn().disabled).toBe(false);
      await click(saveBtn());
      expect(wrote).toHaveBeenCalledTimes(1);
      expect(wrote.mock.calls[0][1].scenes[0].aiDrafted).toBe(true);
      expect(Object.keys(wrote.mock.calls[0][1].scenes[0]).sort()).toEqual(['aiDrafted', 'id', 'intro', 'story', 'updatedAt']);
    });
  }

  it('re-opening a saved AI draft asks for the review again; a fresh AI draft clears ticks', async () => {
    window.__alloAiUsable = () => true;
    const gemini = vi.fn(() => Promise.resolve(JSON.stringify(STORY)));
    await mount({ toolId: 'sociallab', teacher: vi.fn(), aiOn: true, gemini, cfg: cfgFor('sociallab', [{ id: 'ts_1', story: STORY, aiDrafted: true }]) });
    await click($('[data-ts-teacher-edit="ts_1"]'));
    expect($('[data-ts-teacher-save]').disabled).toBe(true);
    for (const el of $$('[data-ts-teacher-check]')) await click(el);
    expect($('[data-ts-teacher-save]').disabled).toBe(false);
    await setValue($('[id="ts-sociallab-ts-idea"]'), 'Another idea');
    await click($('[data-ts-teacher-ai]'));
    await flush();
    expect($$('[data-ts-teacher-check]').every((el) => !el.checked)).toBe(true);
    expect($('[data-ts-teacher-save]').disabled).toBe(true);
  });

  it('a failed AI draft keeps the teacher\'s text and says so', async () => {
    window.__alloAiUsable = () => true;
    const gemini = vi.fn(() => Promise.reject(new Error('boom')));
    await mount({ toolId: 'sociallab', teacher: vi.fn(), aiOn: true, gemini, cfg: {} });
    await click($('[data-ts-teacher-new]'));
    await setValue($('[id="ts-sociallab-ts-intro"]'), 'My setup');
    await setValue($('[id="ts-sociallab-ts-idea"]'), 'An idea');
    await click($('[data-ts-teacher-ai]'));
    await flush(); await flush();
    expect(text()).toContain('could not be used');
    expect(state.tsDraft.intro).toBe('My setup');
    expect(state.tsDraft.aiDrafted).not.toBe(true);
    expect(state.tsBusy).toBe(false);
  });

  it('Cancel while a draft is in flight: the reply does not reopen the editor', async () => {
    window.__alloAiUsable = () => true;
    let release;
    const gemini = vi.fn(() => new Promise((r) => { release = r; }));
    await mount({ toolId: 'sociallab', teacher: vi.fn(), aiOn: true, gemini, cfg: {} });
    await click($('[data-ts-teacher-new]'));
    await setValue($('[id="ts-sociallab-ts-idea"]'), 'An idea');
    await click($('[data-ts-teacher-ai]'));
    await flush();
    await click([...document.querySelectorAll('button')].find((b) => b.textContent.includes('Cancel')));
    expect($('[data-ts-teacher-editor]')).toBeNull();
    release(JSON.stringify(STORY));
    await flush(); await flush();
    expect($('[data-ts-teacher-editor]')).toBeNull();
    expect(state.tsDraft).toBe(null);
    expect(state.tsBusy).toBe(false);
  });
});

describe('Peer Support: anyone unsafe leads to a trusted adult', () => {
  it('the AI prompt says so, the editor shows it, and an AI draft must confirm it', async () => {
    window.__alloAiUsable = () => true;
    const gemini = vi.fn(() => Promise.resolve(JSON.stringify(STORY)));
    await mount({ toolId: 'peersupport', teacher: vi.fn(), cfg: {}, aiOn: true, gemini });
    await click($('[data-ts-teacher-new]'));
    expect($('[data-ts-teacher-note]').textContent).toContain('trusted adult');
    expect($('[data-ts-teacher-note]').textContent).toContain('cannot check');
    await setValue($('[id="ts-peersupport-ts-idea"]'), 'A friend says they do not feel safe at home.');
    await click($('[data-ts-teacher-ai]'));
    await flush();
    const prompt = gemini.mock.calls[0][0];
    expect(prompt).toContain('every path must lead to telling a trusted adult');
    expect(prompt).toContain('no ending may keep it secret');
    expect($('[data-ts-teacher-check="adult"]')).not.toBeNull();
  });

  it('a hand-written scene shows the guidance but is not blocked by it', async () => {
    window.__alloAiUsable = () => false;
    const wrote = vi.fn();
    await mount({ toolId: 'peersupport', teacher: wrote, cfg: {} });
    await click($('[data-ts-teacher-new]'));
    expect($('[data-ts-teacher-note]')).not.toBeNull();
    expect($('[data-ts-teacher-check="adult"]')).toBeNull();
  });

  it('other tools show no Peer Support note', async () => {
    window.__alloAiUsable = () => false;
    await mount({ toolId: 'sociallab', teacher: vi.fn(), cfg: {} });
    await click($('[data-ts-teacher-new]'));
    expect($('[data-ts-teacher-note]')).toBeNull();
  });
});

describe('Conflict Theater on the shared helper', () => {
  it('keeps its stored shape and its own attributes; no review gate changes its flow', async () => {
    window.__alloAiUsable = () => false;
    const wrote = vi.fn();
    await mount({ toolId: 'conflicttheater', teacher: wrote, cfg: cfgFor('conflicttheater', [{ id: 'ts_1', story: STORY, intro: 'Two friends.' }]) });
    expect($('[data-ct-teacher-scenes]')).not.toBeNull();
    expect($('[data-ts-teacher-scenes]')).toBeNull();
    await click($('[data-ct-teacher-remove="ts_1"]'));
    await click($('[data-ct-teacher-remove="ts_1"]'));
    expect(wrote).toHaveBeenLastCalledWith('conflicttheater', null);
    await click($('[data-ct-teacher-new]'));
    expect(state.mode).toBe('teacher-edit');
    expect($('#cft-ts-intro')).not.toBeNull();
    expect(text()).toContain('Write a conflict scene');
  });

  it('an older hub: no teacher section, built-in scenes still play', async () => {
    const spies = blockAi();
    delete window.SelHub.teacherScenes;
    await mount({ toolId: 'conflicttheater', spies, cfg: cfgFor('conflicttheater', [{ id: 'ts_1', story: STORY }]), initial: { mode: 'teacher-edit' } });
    expect($('[data-ct-teacher-scenes]')).toBeNull();
    expect($('[data-ct-teacher-author]')).toBeNull();
    expect($('[data-ct-teacher-editor]')).toBeNull();
    expect($('[aria-label="Pick scenario: The Missing Lunch Money"]')).not.toBeNull();
    expect(window.SelHub._registry.conflicttheater.teacherConfig.scenesFrom({ scenes: [{ id: 'a', story: STORY }] }, Offline)).toEqual([]);
    noAiCalls(spies);
  });
});

describe('Self-Advocacy Practice copy', () => {
  it('says nothing about AI coaching when AI is off, and still does when AI is on', async () => {
    const spies = blockAi();
    await mount({ toolId: 'selfAdvocacy', spies, initial: { activeTab: 'practice' } });
    expect(text()).not.toContain('AI coaching');
    expect(text()).not.toContain('AI coach');
    expect(text()).toContain('Pick a scenario.');
    await act(async () => root.unmount()); host.remove();
    await mount({ toolId: 'selfAdvocacy', spies, initial: { activeTab: 'menu' } });
    expect(text()).not.toContain('AI coaching');
    noAiCalls(spies);
    await act(async () => root.unmount()); host.remove();
    delete window.__alloStudentAiDisabled;
    window.__alloAiUsable = () => true;
    const gemini = vi.fn(() => Promise.resolve(''));
    await mount({ toolId: 'selfAdvocacy', aiOn: true, gemini, initial: { activeTab: 'practice' } });
    expect(text()).toContain('Get AI coaching');
    expect(gemini).not.toHaveBeenCalled();
  });
});
