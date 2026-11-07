// Conflict Theater no-AI mode (2026-11-04, AI-off sweep wave 4).
// 1. Every scripted scene is a valid AdventureOffline story (8-14 scenes, 2-3 choices,
//    2+ endings, every ending reachable and closing with a debrief).
// 2. With student AI off (blocked host fns), a learner plays a scripted scene to an ending,
//    reflects, and nothing calls callGemini / callImagen / callGeminiVision / image edit.
// 3. An old host without AdventureOffline gets the built-in player, never a blank.
// 4. The student-written scene saves to this tool's SEL work (toolData), plus a reflection.
// 5. The SEL hub lists Conflict Theater with AI off, with no-AI card copy.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const RDS = require(resolve('desktop/web-app/node_modules/react-dom/server'));
const { act } = React;
let root, host, Offline, tool;

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.React = window.React = React;
  window.AlloModules = {};
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloLanguageContext = React.createContext({ t: (k) => k });
  window.__alloHooks = { useFocusTrap: () => {} };
  const noop = () => {};
  if (typeof window.matchMedia !== 'function') window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  globalThis.Audio = function () { return { play: () => Promise.resolve(), pause: noop }; };
  const load = (f) => new Function('require', readFileSync(f, 'utf8'))(require);
  load('view_adventure_module.js');
  // CT_OFFLINE_HUB_SRC: point at a pre-change hub copy to confirm the hub test fails first.
  load(process.env.CT_OFFLINE_HUB_SRC || 'sel_hub/sel_hub_module.js');
  load('sel_hub/sel_safety_layer.js');
  load('sel_hub/sel_tool_conflicttheater.js');
  Offline = window.AlloModules.AdventureOffline;
  tool = window.SelHub._registry.conflicttheater;
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
// Host state like the AI-off student: blocked (truthy) host fns, policy says no AI.
function blockAi() {
  const spies = { gemini: blocked(), imagen: blocked(), vision: blocked(), edit: blocked() };
  window.callGemini = spies.gemini; window.callImagen = spies.imagen; window.callGeminiVision = spies.vision; window.callGeminiImageEdit = spies.edit;
  window.__alloStudentAiDisabled = true; window.__alloAiUsable = () => false;
  return spies;
}
const noAiCalls = (spies) => Object.values(spies).forEach((s) => expect(s).not.toHaveBeenCalled());

let state = null;
function Host({ initial, spies, awardXP }) {
  const [toolData, setToolData] = React.useState({ conflicttheater: initial || {} });
  state = toolData.conflicttheater;
  const ctx = {
    React, toolData,
    update: (id, k, v) => setToolData((p) => ({ ...p, [id]: { ...(p[id] || {}), [k]: v } })),
    updateMulti: (id, o) => setToolData((p) => ({ ...p, [id]: { ...(p[id] || {}), ...o } })),
    awardXP, addToast: () => {}, celebrate: () => {}, t: (k) => k, gradeBand: 'middle',
    theme: { isDark: true, isContrast: false },
    // A host that forgot to null them: the tool must still read aiAvailable / __alloAiUsable.
    callGemini: spies.gemini, callImagen: spies.imagen, callGeminiVision: null, callTTS: null, aiAvailable: false,
    onSafetyFlag: () => {},
  };
  return window.SelHub.renderTool('conflicttheater', ctx);
}
async function mount(props) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Host, props)));
}
const $ = (sel) => document.querySelector(sel);
const byText = (sel, text) => [...document.querySelectorAll(sel)].find((el) => el.textContent.includes(text));

describe('Conflict Theater scripted scenes are valid shared stories', () => {
  it('declares an offline mode with one script per scenario', () => {
    expect(tool.offlineMode).toBe(true);
    expect(Object.keys(tool.offlineScripts).sort()).toEqual([
      'eating-alone', 'excluded-project', 'lunch-money', 'misgender-on-purpose', 'racist-remark', 'screenshot-betrayal', 'spread-rumor', 'took-credit']);
  });

  it('every script passes AdventureOffline.validate with braided 8-14 scenes, 2-3 choices and 2+ debriefed endings', () => {
    for (const [id, raw] of Object.entries(tool.offlineScripts)) {
      const story = Offline.normalize(raw);
      const check = Offline.validate(story);
      expect(check.errors, id + ' errors').toEqual([]);
      expect(check.warnings, id + ' warnings').toEqual([]);
      expect(story.scenes.length, id).toBeGreaterThanOrEqual(8);
      expect(story.scenes.length, id).toBeLessThanOrEqual(14);
      expect(check.stats.endings, id).toBeGreaterThanOrEqual(2);
      story.scenes.filter((s) => !s.ending).forEach((s) => {
        expect(s.choices.length, id + ':' + s.id).toBeGreaterThanOrEqual(2);
        expect(s.choices.length, id + ':' + s.id).toBeLessThanOrEqual(3);
      });
      story.scenes.filter((s) => s.ending).forEach((s) => expect(s.text, id + ':' + s.id).toContain('What worked:'));
      // Braided: at least one scene is reached from more than one place.
      expect(Offline.outline(story).some((row) => row.inbound > 1), id + ' braided').toBe(true);
    }
  });
});

describe('Conflict Theater with student AI off', () => {
  it('plays a scripted scene to an ending, saves a reflection, and makes no AI calls', async () => {
    const spies = blockAi();
    const awardXP = vi.fn();
    await mount({ spies, awardXP });
    // Select screen: no-AI copy, the writer card, and no Conflict Replay card.
    expect(document.body.textContent).toContain('choose what to say');
    expect(document.body.textContent).not.toContain('two AI characters');
    expect($('[data-ct-write-card]')).not.toBeNull();
    expect(document.body.textContent).not.toContain('Conflict Replay');
    await click($('[aria-label="Pick scenario: The Missing Lunch Money"]'));
    expect($('[data-ct-start-script]')).toBeNull(); // AI off: Start itself plays the script
    await click($('[aria-label="Start scenario"]'));
    expect(state.mode).toBe('script');
    expect($('[data-ct-script-player="lunch-money"] [data-adventure-offline-player]')).not.toBeNull();
    expect($('textarea[aria-label="Your message"]')).toBeNull(); // the AI chat never renders
    for (const to of ['open', 'heard', 'side', 'impact', 'end_repair']) await click($(`[data-offline-choice="${to}"]`));
    expect($('[data-offline-scene]').textContent).toBe('The end');
    expect($('[data-offline-scene-text]').textContent).toContain('What worked:');
    expect(state.scriptEnding).toBe('end_repair');
    expect(state.scriptDone).toEqual({ 'lunch-money:end_repair': true });
    expect(awardXP).toHaveBeenCalledWith(10);
    expect(document.body.textContent).toContain('Endings found: 1 of 3');
    await setValue($('#cft-reflect-script'), 'Asking Jordan what was going on helped him tell the truth.');
    await click($('[data-ct-reflect-save="script"]'));
    expect(state.scriptReflections).toHaveLength(1);
    expect(state.scriptReflections[0]).toMatchObject({ scenarioId: 'lunch-money', ending: 'end_repair' });
    // Replay to a second ending: XP only for the first ending in a scenario.
    await click($('[data-offline-restart]'));
    expect(state.scriptEnding).toBe(null);
    for (const to of ['joke', 'end_pause']) await click($(`[data-offline-choice="${to}"]`));
    expect(document.body.textContent).toContain('Endings found: 2 of 3');
    expect(awardXP).toHaveBeenCalledTimes(1);
    noAiCalls(spies);
  });

  it('a saved live AI scene resumes as the scripted scene', async () => {
    const spies = blockAi();
    await mount({ spies, awardXP: vi.fn(), initial: { mode: 'scene', scenarioId: 'took-credit' } });
    expect($('[data-ct-script-player="took-credit"]')).not.toBeNull();
    expect($('textarea[aria-label="Your message"]')).toBeNull();
    noAiCalls(spies);
  });

  it('an old host without AdventureOffline gets the built-in player', async () => {
    const spies = blockAi();
    const saved = window.AlloModules.AdventureOffline;
    delete window.AlloModules.AdventureOffline;
    try {
      await mount({ spies, awardXP: vi.fn(), initial: { mode: 'script', scenarioId: 'spread-rumor' } });
      expect($('[data-ct-fallback-player]')).not.toBeNull();
      for (const to of ['open', 'heard', 'side', 'impact', 'end_partial']) await click($(`[data-ct-choice="${to}"]`));
      expect($('[data-ct-fallback-player]').textContent).toContain('What worked:');
      expect(state.scriptDone).toEqual({ 'spread-rumor:end_partial': true });
      expect($('[data-ct-reflect="script"]')).not.toBeNull();
      // The writer shows a clear loading state instead of a blank.
      await act(async () => root.unmount()); host.remove();
      await mount({ spies, awardXP: vi.fn(), initial: { mode: 'write' } });
      expect($('[data-ct-writer-loading]').textContent).toContain('still loading');
    } finally { window.AlloModules.AdventureOffline = saved; }
    noAiCalls(spies);
  });

  it('a learner writes a conflict scene that saves to this tool\'s work, then reflects', async () => {
    const spies = blockAi();
    await mount({ spies, awardXP: vi.fn() });
    await click($('[data-ct-write-card]'));
    expect(state.mode).toBe('write');
    await click($('[data-ct-open-writer]'));
    const dialog = $('[data-adventure-student-story][role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.querySelector('[data-offline-make-ai]')).toBeNull();
    await setValue(dialog.querySelector('input[type="text"]'), 'The Borrowed Charger');
    await setValue(dialog.querySelector('[data-offline-scene-editor="s1"] textarea'), 'Kai borrowed Lena\'s charger and lost it.');
    await click(dialog.querySelector('[data-offline-scene-editor="s1"] [data-offline-add-choice]'));
    await click(dialog.querySelector('[data-offline-scene-editor="s1"] [data-offline-add-choice]'));
    const labels = [...dialog.querySelectorAll('[data-offline-scene-editor="s1"] input[type="text"]')];
    await setValue(labels[0], '"I felt worried when it was gone."');
    await setValue(labels[1], '"You always lose my stuff!"');
    await setValue(dialog.querySelector('[data-offline-scene-editor="s2"] textarea'), 'Kai listens and offers to replace it.');
    await setValue(dialog.querySelector('[data-offline-scene-editor="s3"] textarea'), 'Kai gets defensive. Not fixed yet.');
    for (const id of ['s2', 's3']) await click(dialog.querySelector(`[data-offline-scene-editor="${id}"] input[type="checkbox"]`));
    await click(dialog.querySelector('[data-offline-save]'));
    const item = Offline.findStudentStory(state.studentScenes);
    expect(item.data).toMatchObject({ kind: 'student-story', ready: true });
    expect(item.data.studentStory.title).toBe('The Borrowed Charger');
    expect(item.data.studentStory.scenes).toHaveLength(3);
    await click(dialog.querySelector('[aria-label="common.close"]'));
    expect(state.writeOpen).toBe(false);
    expect(document.body.textContent).toContain('The Borrowed Charger · 3 scenes · ready to play');
    await click($('[data-ct-play-mine]'));
    await click($('[data-offline-choice="s2"]'));
    expect($('[data-offline-scene-text]').textContent).toBe('Kai listens and offers to replace it.');
    await setValue($('#cft-reflect-write'), 'Lena might feel worried and let down.');
    await click($('[data-ct-reflect-save="write"]'));
    expect(state.writeReflection.text).toBe('Lena might feel worried and let down.');
    noAiCalls(spies);
  });
});

describe('SEL hub offers Conflict Theater with AI off', () => {
  it('lists the card with no-AI copy when callGemini is unusable', () => {
    blockAi();
    const noop = () => {};
    const Icon = () => null;
    window.__alloflowSelSnapshots = []; window.__alloflowStudentArtifacts = [];
    const html = RDS.renderToStaticMarkup(React.createElement(window.AlloModules.SelHub, {
      showSelHub: true, setShowSelHub: noop, selHubTab: 'explore', setSelHubTab: noop,
      selHubTool: null, setSelHubTool: noop, addToast: noop, gradeLevel: '8th Grade',
      callGemini: window.callGemini, onSafetyFlag: noop, studentCodename: 'test', t: (k) => k,
      ArrowLeft: Icon, X: Icon, Sparkles: Icon, Heart: Icon, GripVertical: Icon, onExportRequested: noop,
    }));
    const doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    const card = doc.querySelector('[data-sel-tool-card-id="conflicttheater"]');
    expect(card).not.toBeNull();
    expect(card.textContent).toContain('scripted scenes');
    expect(card.textContent).not.toContain('two AI characters');
  });
});
