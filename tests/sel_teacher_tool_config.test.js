// SEL teacher content with no AI (2026-11-04, AI-off sweep wave 5).
// Contract: an SEL Station carries station.toolConfig[toolId]; the hub hands the active
// station's map to tools as ctx.toolConfig, and ctx.setToolConfig only to the TEACHER view
// of an active station that includes the open tool.
// 1. Hub: teacher writes persist to the station (window slot + localStorage), students read
//    but cannot write, oversized config is refused, null clears, a station without the tool
//    gets no writer.
// 2. Culture Explorer: students see teacher cards first, read-only, AI off, zero AI calls;
//    teacher authors a card by hand with no AI (AI button shows the setup doorway) and with AI
//    (draft fills only empty boxes and re-requires the review checks).
// 3. Conflict Theater: teacher scenes are validated (only valid ones reach students); students
//    play them first with AI off; teacher writes one in AdventureOffline.Editor, and with AI
//    drafts one via AdventureOffline.generate.
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
  if (typeof window.Element.prototype.scrollIntoView !== 'function') window.Element.prototype.scrollIntoView = noop;
  globalThis.Audio = function () { return { play: () => Promise.resolve(), pause: noop }; };
  const load = (f) => new Function('require', readFileSync(f, 'utf8'))(require);
  load('view_adventure_module.js');
  load(process.env.SEL_TEACHER_HUB_SRC || 'sel_hub/sel_hub_module.js');
  load('sel_hub/sel_safety_layer.js');
  load('sel_hub/sel_tool_cultureexplorer.js');
  load('sel_hub/sel_tool_conflicttheater.js');
  Offline = window.AlloModules.AdventureOffline;
  window.__alloflowSelSnapshots = []; window.__alloflowStudentArtifacts = [];
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  document.body.innerHTML = '';
  delete window.__alloAiUsable; delete window.__alloStudentAiDisabled; delete window.__alloAiSetupDoorway; delete window.AlloAiSetupNotice;
  ['callGemini', 'callImagen', 'callGeminiVision', 'callGeminiImageEdit'].forEach((k) => { delete window[k]; });
  window.localStorage.removeItem('alloflow_sel_stations'); window.localStorage.removeItem('alloflow_sel_active_station');
  window.__alloflowSelStations = null;
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
function teacherNoAiHost() {
  window.__alloAiUsable = () => false;
  window.__alloAiSetupDoorway = () => ({ disabled: true, title: 'Needs AI setup', cta: 'connect', onDoorway: () => {} });
  window.AlloAiSetupNotice = () => React.createElement('button', { type: 'button', 'data-ai-setup-doorway': '' }, 'Needs AI setup');
}

// ── A tool host shaped like the hub's ctx, including the toolConfig contract ──
let state = null, cfgState = null;
function Host({ toolId, initial, cfg, teacher, spies, awardXP, aiOn, gemini }) {
  const [toolData, setToolData] = React.useState({ [toolId]: initial || {} });
  const [config, setConfig] = React.useState(cfg || {});
  state = toolData[toolId]; cfgState = config;
  const ctx = {
    React, toolData,
    update: (id, k, v) => setToolData((p) => ({ ...p, [id]: { ...(p[id] || {}), [k]: v } })),
    updateMulti: (id, o) => setToolData((p) => ({ ...p, [id]: { ...(p[id] || {}), ...o } })),
    awardXP: awardXP || (() => {}), addToast: () => {}, celebrate: () => {}, announceToSR: () => {}, t: (k) => k, gradeBand: 'middle', gradeLevel: '7th Grade',
    icons: { ArrowLeft: () => null, X: () => null, Sparkles: () => null, Heart: () => null, GripVertical: () => null },
    a11yClick: (fn) => ({ onClick: fn, role: 'button', tabIndex: 0 }), setSelHubTool: () => {},
    theme: { isDark: true, isContrast: false },
    callGemini: aiOn ? gemini : (spies ? spies.gemini : null), callImagen: spies ? spies.imagen : null, callGeminiVision: null, callTTS: null, aiAvailable: !!aiOn,
    onSafetyFlag: () => {},
    toolConfig: config,
    toolConfigStation: teacher ? { id: 'st', name: 'Week 3', includesTool: true } : null,
    isTeacherView: !!teacher,
    setToolConfig: teacher ? (id, value) => { teacher(id, value); setConfig((p) => { const n = { ...p }; if (value) n[id] = value; else delete n[id]; return n; }); return true; } : null,
  };
  return window.SelHub.renderTool(toolId, ctx);
}
async function mount(props) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Host, props)));
}

// ══ 1. Hub contract ══
let probe = [];
function mountHub(props) {
  const Icon = () => null, noop = () => {};
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  act(() => {
    root.render(React.createElement(window.AlloModules.SelHub, Object.assign({
      showSelHub: true, setShowSelHub: noop, selHubTab: 'explore', setSelHubTab: noop,
      selHubTool: 'ctxProbe', setSelHubTool: noop, addToast: noop, gradeLevel: '7th Grade',
      callGemini: null, onSafetyFlag: noop, studentCodename: 'test', t: (k) => k,
      ArrowLeft: Icon, X: Icon, Sparkles: Icon, Heart: Icon, GripVertical: Icon, onExportRequested: noop,
    }, props)));
  });
}
function seedStation(station) {
  window.localStorage.setItem('alloflow_sel_stations', JSON.stringify([station]));
  window.__alloflowSelStations = [station];
  window.localStorage.setItem('alloflow_sel_active_station', station.id);
}
const STATION = { id: 'sel_station_cfg', name: 'Week 3', tools: ['ctxProbe'], teacherNote: '', quests: [], createdAt: '2026-11-04T00:00:00.000Z', source: 'sel-hub-builder' };
const last = () => probe[probe.length - 1];

describe('SEL hub hands station teacher content to tools (ctx.toolConfig)', () => {
  beforeAll(() => { window.SelHub.registerTool('ctxProbe', { label: 'Ctx probe', icon: '', render: (ctx) => { probe.push(ctx); return null; } }); });
  afterEach(() => { probe = []; });

  it('the teacher view of an active station writes; the station and its storage carry it', () => {
    seedStation(STATION);
    mountHub({});
    expect(typeof last().setToolConfig).toBe('function');
    expect(last().isTeacherView).toBe(true);
    expect(last().toolConfig).toEqual({});
    const cfg = { version: 1, cards: [{ id: 'a', subject: 'X', fields: { traditions: 'Y' } }] };
    let ok;
    act(() => { ok = last().setToolConfig('ctxProbe', cfg); });
    expect(ok).toBe(true);
    expect(last().toolConfig).toEqual({ ctxProbe: cfg });
    expect(window.__alloflowSelStations[0].toolConfig).toEqual({ ctxProbe: cfg });
    expect(JSON.parse(window.localStorage.getItem('alloflow_sel_stations'))[0].toolConfig).toEqual({ ctxProbe: cfg });
    // Oversized or non-object config is refused and changes nothing.
    act(() => { ok = last().setToolConfig('ctxProbe', { big: 'x'.repeat(400001) }); });
    expect(ok).toBe(false);
    act(() => { ok = last().setToolConfig('ctxProbe', [1, 2]); });
    expect(ok).toBe(false);
    expect(last().toolConfig).toEqual({ ctxProbe: cfg });
    // null clears; an empty map is dropped from the station.
    act(() => { last().setToolConfig('ctxProbe', null); });
    expect(last().toolConfig).toEqual({});
    expect('toolConfig' in window.__alloflowSelStations[0]).toBe(false);
  });

  it('a student reads the station content but gets no writer', () => {
    seedStation({ ...STATION, toolConfig: { ctxProbe: { version: 1, cards: [] } } });
    mountHub({ isTeacherMode: false });
    expect(last().toolConfig).toEqual({ ctxProbe: { version: 1, cards: [] } });
    expect(last().setToolConfig).toBe(null);
    expect(last().isTeacherView).toBe(false);
  });

  it('no active station, or a station without the open tool: no writer, empty config', () => {
    mountHub({});
    expect(last().setToolConfig).toBe(null);
    expect(last().toolConfig).toEqual({});
    expect(last().toolConfigStation).toBe(null);
    act(() => root.unmount()); host.remove(); root = null; probe = [];
    seedStation({ ...STATION, tools: ['journal'] });
    mountHub({});
    expect(last().setToolConfig).toBe(null);
    expect(last().toolConfigStation).toMatchObject({ id: STATION.id, includesTool: false });
  });

  it('"Adapt a copy" carries the teacher content of the tools it keeps', async () => {
    const original = { ...STATION, id: 'sel_station_adapt_src', name: 'Culture week', toolConfig: { ctxProbe: { version: 1, cards: [{ id: 'k' }] }, gone: { version: 1 } } };
    window.localStorage.setItem('alloflow_sel_stations', JSON.stringify([original]));
    window.__alloflowSelStations = [original];
    window.localStorage.removeItem('alloflow_sel_builder_draft');
    mountHub({ selHubTool: null });
    const adapt = $('[aria-label="Adapt a copy of station Culture week"]');
    expect(adapt).not.toBeNull();
    await click(adapt);
    await click($('[aria-label="Save this station"]'));
    const stations = window.__alloflowSelStations;
    expect(stations).toHaveLength(2);
    expect(stations[1].id).not.toBe(original.id);
    expect(stations[1].toolConfig).toEqual({ ctxProbe: { version: 1, cards: [{ id: 'k' }] } });
    window.localStorage.removeItem('alloflow_sel_builder_draft');
  });
});

// ══ 2. Culture Explorer ══
const CARD = { id: 'tc_1', subject: 'Wabanaki communities in Maine', relation: 'researched', fields: { traditions: 'Basketmaking passes between generations, and families do it differently.' }, interview: { person: 'A basketmaker', answers: { q6: 'We are still here.' } }, sources: 'Abbe Museum', note: 'Read this before our talk.' };
const ceCfg = (cards) => ({ cultureExplorer: { version: 1, cards } });

describe('Culture Explorer teacher cards', () => {
  it('normalizes cards and keeps only ones with a subject and an answer', () => {
    const c = window.SelHub._registry.cultureExplorer.teacherConfig;
    const out = c.cardsFrom({ version: 1, cards: [CARD, { id: 'empty', subject: 'No answers' }, { ...CARD }, { id: 'x', subject: '', fields: { foods: 'a' } }, 'junk'] });
    expect(out.map((x) => x.id)).toEqual(['tc_1']);
    expect(out[0].fields).toEqual(CARD.fields);
    expect(c.cardsFrom(null)).toEqual([]);
  });

  it('a student with AI off sees teacher cards first, read-only, with zero AI calls', async () => {
    const spies = blockAi();
    await mount({ toolId: 'cultureExplorer', spies, cfg: ceCfg([CARD, { id: 'draft', subject: 'Unfinished' }]) });
    const section = $('[data-ce-teacher-cards]');
    expect(section).not.toBeNull();
    expect(section.textContent).toContain('From your teacher');
    expect($$('[data-ce-teacher-card]').map((e) => e.getAttribute('data-ce-teacher-card'))).toEqual(['tc_1']);
    expect(section.textContent).toContain('Basketmaking');
    expect(section.textContent).toContain('We are still here.');
    expect(section.querySelectorAll('input, textarea, button').length).toBe(0);
    // Shown before the student's own card, and no teacher editor or hint for a student.
    expect(section.compareDocumentPosition($('#culture-research-title')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect($('[data-ce-teacher-editor]')).toBeNull();
    expect($('[data-ce-teacher-hint]')).toBeNull();
    noAiCalls(spies);
  });

  it('a student who left the tool on another tab gets a pointer to the teacher cards', async () => {
    const spies = blockAi();
    await mount({ toolId: 'cultureExplorer', spies, initial: { tab: 'quiz' }, cfg: ceCfg([CARD]) });
    expect($('[data-ce-teacher-cards]')).toBeNull();
    expect($('[data-ce-teacher-jump]').textContent).toContain('From your teacher (1)');
    await click($('[data-ce-teacher-jump]'));
    expect($('[data-ce-teacher-cards]')).not.toBeNull();
    noAiCalls(spies);
  });

  it('a teacher with no AI writes a card by hand; the AI button shows the setup doorway', async () => {
    teacherNoAiHost();
    const wrote = vi.fn();
    await mount({ toolId: 'cultureExplorer', teacher: wrote, cfg: {} });
    expect($('[data-ce-teacher-editor]')).not.toBeNull();
    await click($('[data-ce-teacher-new]'));
    const ai = $('[data-ce-teacher-ai]');
    expect(ai.disabled).toBe(true);
    expect(ai.getAttribute('title')).toBe('Needs AI setup');
    expect($('[data-ce-teacher-ai-setup] [data-ai-setup-doorway]')).not.toBeNull();
    await setValue($('#ce-tc-subject'), 'Hmong families in our town');
    await setValue($('#ce-tc-traditions'), 'New Year celebrations bring families together; each family keeps its own customs.');
    expect($('[data-ce-teacher-save]').disabled).toBe(true); // review checks not ticked yet
    for (const el of $$('[data-ce-teacher-check]')) await click(el);
    expect($('[data-ce-teacher-save]').disabled).toBe(false);
    await click($('[data-ce-teacher-save]'));
    expect(wrote).toHaveBeenCalledTimes(1);
    const [toolId, value] = wrote.mock.calls[0];
    expect(toolId).toBe('cultureExplorer');
    expect(value.version).toBe(1);
    expect(value.cards).toHaveLength(1);
    expect(value.cards[0]).toMatchObject({ subject: 'Hmong families in our town', fields: { traditions: expect.stringContaining('New Year') } });
    expect(state.tcDraft).toBe(null);
    // The saved card now shows in the student view above, and it can be removed (two steps).
    expect($$('[data-ce-teacher-card]')).toHaveLength(1);
    const id = value.cards[0].id;
    await click($(`[data-ce-teacher-remove="${id}"]`));
    expect(wrote).toHaveBeenCalledTimes(1);
    await click($(`[data-ce-teacher-remove="${id}"]`));
    expect(wrote).toHaveBeenLastCalledWith('cultureExplorer', null);
    expect($('[data-ce-teacher-cards]')).toBe(null);
  });

  it('with AI, a draft fills only the empty boxes and the checks must be ticked again', async () => {
    window.__alloAiUsable = () => true;
    const gemini = vi.fn(() => Promise.resolve('```json\n{"traditions":"AI text","foods":"Families share rice dishes; recipes vary.","languages":"","sources":"Local library"}\n```'));
    await mount({ toolId: 'cultureExplorer', teacher: vi.fn(), cfg: {}, aiOn: true, gemini });
    await click($('[data-ce-teacher-new]'));
    await setValue($('#ce-tc-subject'), 'Somali community');
    await setValue($('#ce-tc-traditions'), 'My own words');
    await click($('[data-ce-teacher-check="source"]'));
    await click($('[data-ce-teacher-ai]'));
    await flush();
    expect(gemini).toHaveBeenCalledTimes(1);
    expect(gemini.mock.calls[0][0]).toContain('Somali community');
    expect(gemini.mock.calls[0][0]).toContain('Do not invent quotes');
    expect($('#ce-tc-traditions').value).toBe('My own words');
    expect($('#ce-tc-foods').value).toContain('rice');
    expect($('#ce-tc-sources').value).toBe('Local library');
    expect(state.tcDraft.aiDrafted).toBe(true);
    expect($$('[data-ce-teacher-check]').every((el) => !el.checked)).toBe(true);
    expect($('[data-ce-teacher-save]').disabled).toBe(true);
  });
});

// ══ 3. Conflict Theater ══
const STORY = { version: 1, title: 'The Bus Seat', start: 's1', scenes: [
  { id: 's1', text: 'Ari and Dev both reach the last window seat on the bus.', ending: false, choices: [{ label: "'It's mine, move.'", to: 's2' }, { label: "'We both wanted it. Want to take turns?'", to: 's3' }] },
  { id: 's2', text: 'Dev sits down hard and turns away. Not fixed yet.\n\nWhat worked:\n• Noticing it went badly is a start.', ending: true, choices: [] },
  { id: 's3', text: 'Dev grins. They agree to swap halfway.\n\nWhat worked:\n• Naming both needs.', ending: true, choices: [] },
] };
const BROKEN = { version: 1, title: 'Broken', start: 's1', scenes: [{ id: 's1', text: 'Start', ending: false, choices: [{ label: 'Go', to: 'nowhere' }] }] };
const ctCfg = (scenes) => ({ conflicttheater: { version: 1, scenes } });

describe('Conflict Theater teacher scenes', () => {
  it('validates teacher scenes: only valid ones are playable; the blank starter is not', () => {
    const c = window.SelHub._registry.conflicttheater.teacherConfig;
    const out = c.scenesFrom({ version: 1, scenes: [{ id: 'ok', story: STORY }, { id: 'bad', story: BROKEN }, { id: 'ok', story: STORY }, { id: 'nostory' }] }, Offline);
    expect(out.map((s) => [s.id, s.ok])).toEqual([['ok', true], ['bad', false], ['nostory', false]]);
    const check = Offline.validate(Offline.normalize(STORY));
    expect(check.errors).toEqual([]);
    expect(check.warnings).toEqual([]);
    expect(Offline.validate(Offline.normalize(c.starter())).ok).toBe(false);
    // Old host without AdventureOffline: the basic check still accepts / rejects.
    expect(c.scenesFrom({ scenes: [{ id: 'a', story: STORY }, { id: 'b', story: BROKEN }] }, null).map((s) => s.ok)).toEqual([true, false]);
  });

  it('a student with AI off plays a teacher scene first, earns XP once, reflects; zero AI calls', async () => {
    const spies = blockAi();
    const awardXP = vi.fn();
    await mount({ toolId: 'conflicttheater', spies, awardXP, cfg: ctCfg([{ id: 'ts_1', story: STORY, intro: 'Two friends, one seat.' }, { id: 'ts_bad', story: BROKEN }]) });
    const list = $('[data-ct-teacher-scenes]');
    expect(list).not.toBeNull();
    expect($$('[data-ct-teacher-play]').map((e) => e.getAttribute('data-ct-teacher-play'))).toEqual(['ts_1']);
    const firstBuiltIn = $('[aria-label="Pick scenario: The Missing Lunch Money"]');
    expect(firstBuiltIn).not.toBeNull();
    expect(list.compareDocumentPosition(firstBuiltIn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect($('[data-ct-teacher-author]')).toBeNull();
    await click($('[data-ct-teacher-play="ts_1"]'));
    expect(state.mode).toBe('script');
    expect($('[data-ct-script-player="teacher:ts_1"] [data-adventure-offline-player]')).not.toBeNull();
    expect($('[data-ct-teacher-intro]').textContent).toContain('one seat');
    await click($('[data-offline-choice="s3"]'));
    expect(state.scriptDone).toEqual({ 'teacher:ts_1:s3': true });
    expect(awardXP).toHaveBeenCalledWith(10);
    expect(document.body.textContent).toContain('Endings found: 1 of 2');
    await setValue($('#cft-reflect-script'), 'Asking about turns worked.');
    await click($('[data-ct-reflect-save="script"]'));
    expect(state.scriptReflections[0]).toMatchObject({ scenarioId: 'teacher:ts_1', ending: 's3' });
    await click($('[data-offline-restart]'));
    await click($('[data-offline-choice="s2"]'));
    expect(awardXP).toHaveBeenCalledTimes(1);
    // Back to the list, then a built-in scene still plays its own script.
    await click([...document.querySelectorAll('button')].find((b) => b.textContent.includes('All scenarios')));
    expect(state.teacherSceneId).toBe(null);
    noAiCalls(spies);
  });

  it('a teacher with no AI writes a scene in the shared editor; Save waits for a valid story', async () => {
    teacherNoAiHost();
    const wrote = vi.fn();
    await mount({ toolId: 'conflicttheater', teacher: wrote, cfg: {} });
    expect($('[data-ct-teacher-author]')).not.toBeNull();
    await click($('[data-ct-teacher-new]'));
    expect($('[data-ct-teacher-editor]')).not.toBeNull();
    expect($('[data-ct-teacher-save]').disabled).toBe(true);
    const ai = $('[data-ct-teacher-ai]');
    expect(ai.disabled).toBe(true);
    expect(ai.getAttribute('title')).toBe('Needs AI setup');
    expect($('[data-ct-teacher-ai-setup] [data-ai-setup-doorway]')).not.toBeNull();
    const editor = $('[data-adventure-offline-editor]');
    await setValue(editor.querySelector('input[type="text"]'), 'The Borrowed Pencil Case');
    await setValue($('[data-offline-scene-editor="s1"] textarea'), 'Mira finds her pencil case on Theo\'s desk, half empty.');
    const labels = $$('[data-offline-scene-editor="s1"] input[type="text"]');
    await setValue(labels[0], "'You took my stuff again!'");
    await setValue(labels[1], "'Hey, is this mine? What happened?'");
    await setValue($('[data-offline-scene-editor="s2"] textarea'), 'Theo gets defensive. Not fixed yet.\n\nWhat worked:\n• Pausing.');
    await setValue($('[data-offline-scene-editor="s3"] textarea'), 'Theo explains he borrowed pens. They agree he asks first.\n\nWhat worked:\n• Asking first.');
    await setValue($('#cft-ts-intro'), 'Something went missing.');
    expect($('[data-ct-teacher-save]').disabled).toBe(false);
    await click($('[data-ct-teacher-preview]'));
    expect($('[data-adventure-offline-player]')).not.toBeNull();
    await click($('[data-ct-teacher-save]'));
    expect(wrote).toHaveBeenCalledTimes(1);
    const [toolId, value] = wrote.mock.calls[0];
    expect(toolId).toBe('conflicttheater');
    expect(value.scenes).toHaveLength(1);
    expect(value.scenes[0].intro).toBe('Something went missing.');
    expect(Offline.validate(Offline.normalize(value.scenes[0].story)).ok).toBe(true);
    expect(state.mode).toBe('select');
    // The teacher sees it listed as playable, and in the student list.
    expect($('[data-ct-teacher-author]').textContent).toContain('students can play it');
    expect($$('[data-ct-teacher-play]')).toHaveLength(1);
  });

  it('with AI, the teacher drafts a scene through AdventureOffline.generate, then reviews it', async () => {
    window.__alloAiUsable = () => true;
    const gemini = vi.fn(() => Promise.resolve(JSON.stringify(STORY)));
    await mount({ toolId: 'conflicttheater', teacher: vi.fn(), cfg: {}, aiOn: true, gemini });
    await click($('[data-ct-teacher-new]'));
    expect($('[data-ct-teacher-ai]').disabled).toBe(true); // needs an idea first
    await setValue($('#cft-ts-idea'), 'Two friends both want the window seat on the bus.');
    await click($('[data-ct-teacher-ai]'));
    await flush();
    expect(gemini).toHaveBeenCalledTimes(1);
    expect(gemini.mock.calls[0][0]).toContain('Content standard');
    expect(gemini.mock.calls[0][0]).toContain('window seat');
    expect(state.tsDraft.aiDrafted).toBe(true);
    expect(state.tsDraft.story.title).toBe('The Bus Seat');
    // An AI draft needs the teacher's review before it can reach students, as in the 8 roleplay tools.
    expect($('[data-ct-teacher-save]').disabled).toBe(true);
    const checks = Array.from(document.querySelectorAll('[data-ct-teacher-check]'));
    expect(checks.length).toBeGreaterThan(0);
    for (const box of checks) await click(box);
    expect($('[data-ct-teacher-save]').disabled).toBe(false);
  });
});
