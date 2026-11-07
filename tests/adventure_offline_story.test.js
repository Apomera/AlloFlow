// Offline Adventure (2026-11-04): a teacher-reviewed branching story that a
// learner with no AI plays from the lesson. Covers the pure validator/repair,
// AI generation (one re-ask), the player and editor (no AI calls), the view and
// student panel wiring, and the round trip through the student pack/live paths.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let root, host, Offline;
const t = (key) => key;

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = React;
  window.AlloModules = {};
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloLanguageContext = React.createContext({ t });
  window.__alloHooks = { useFocusTrap: () => {} };
  new Function(readFileSync('view_adventure_module.js', 'utf8'))();
  new Function(readFileSync('adventure_module.js', 'utf8'))();
  new Function(readFileSync('view_student_save_adventure_module.js', 'utf8'))();
  Offline = window.AlloModules.AdventureOffline;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  delete window.__alloAiUsable; delete window.__alloStudentAiDisabled; delete window.callGemini; delete window.AlloAiSetupNotice; delete window.__alloAiSetupDoorway;
});

// Braided: s2 and s3 rejoin at s4.
const story = () => ({ version: 1, title: 'River Trip', start: 's1', scenes: [
  { id: 's1', text: 'You reach the river.', choices: [{ label: 'Build a raft', to: 's2' }, { label: 'Find a bridge', to: 's3' }] },
  { id: 's2', text: 'The raft floats.', choices: [{ label: 'Paddle on', to: 's4' }] },
  { id: 's3', text: 'The bridge is old.', choices: [{ label: 'Cross carefully', to: 's4' }, { label: 'Turn back', to: 's1' }] },
  { id: 's4', text: 'You reach the far bank.', choices: [{ label: 'Camp', to: 's5' }, { label: 'Keep going', to: 's6' }] },
  { id: 's5', text: 'You rest well. The end.', ending: true, choices: [] },
  { id: 's6', text: 'You arrive at the town.', ending: true, choices: [] },
] });
const codes = (s) => Offline.validate(Offline.normalize(s)).errors.map((e) => e.code + (e.sceneId ? ':' + e.sceneId : ''));

describe('validator', () => {
  it('accepts a braided story with loops that can still end', () => {
    const v = Offline.validate(Offline.normalize(story()));
    expect(v.ok).toBe(true);
    expect(v.stats).toEqual({ scenes: 6, endings: 2 });
  });
  it('reports broken choices, dead ends, unreachable scenes and a missing start', () => {
    const s = story();
    s.scenes[1].choices[0].to = 'nowhere';
    expect(codes(s)).toContain('broken_choice:s2');
    const d = story(); d.scenes[1].choices = [];
    expect(codes(d)).toContain('dead_end:s2');
    const u = story(); u.scenes.push({ id: 'x', text: 'Lost', ending: true });
    expect(codes(u)).toEqual(['unreachable:x']);
    const m = story(); m.start = 'zzz';
    expect(codes(m)).toContain('missing_start');
  });
  it('requires an ending, text, labels, unique ids and a way out of every loop', () => {
    const n = story(); n.scenes.forEach((s) => { s.ending = false; });
    n.scenes[4].choices = [{ label: 'a', to: 's1' }]; n.scenes[5].choices = [{ label: 'b', to: 's1' }];
    expect(codes(n)).toContain('no_ending');
    const e = story(); e.scenes[0].text = ' '; e.scenes[0].choices[0].label = '';
    expect(codes(e)).toEqual(expect.arrayContaining(['empty_text:s1', 'empty_label:s1']));
    const dup = story(); dup.scenes.push({ id: 's2', text: 'again', ending: true });
    expect(codes(dup)).toContain('duplicate_id:s2');
    const loop = story(); loop.scenes[3].choices = [{ label: 'Back', to: 's2' }]; // s2 -> s4 -> s2 forever
    expect(codes(loop)).toEqual(expect.arrayContaining(['no_way_out:s2', 'no_way_out:s4']));
  });
  it('enforces size caps', () => {
    const big = { start: 's0', scenes: Array.from({ length: Offline.LIMITS.maxScenes + 1 }, (_, i) => ({ id: 's' + i, text: 'x', choices: [{ label: 'n', to: 's' + (i + 1) }] })) };
    big.scenes[big.scenes.length - 1] = { id: 's' + Offline.LIMITS.maxScenes, text: 'end', ending: true };
    expect(codes(big)).toContain('too_big');
    const wide = story(); wide.scenes[0].choices = Array.from({ length: 5 }, () => ({ label: 'go', to: 's2' }));
    expect(codes(wide)).toContain('too_big:s1');
  });
  it('normalizes AI shapes: id-keyed scene maps and choice/ending synonyms', () => {
    const s = Offline.normalize({ title: 'T', startId: 'a', scenes: { a: { text: 'A', options: [{ text: 'Go', next: 'b' }] }, b: { text: 'B', isEnding: true } } });
    expect(s.start).toBe('a');
    expect(s.scenes[0].choices).toEqual([{ label: 'Go', to: 'b' }]);
    expect(Offline.validate(s).ok).toBe(true);
  });
});

describe('repair', () => {
  it('leaves a valid story alone', () => {
    const r = Offline.repair(story());
    expect(r.fixes).toEqual([]);
    expect(r.story).toEqual(Offline.normalize(story()));
  });
  it('drops broken choices, links dead ends to an ending and removes unreachable scenes', () => {
    const s = story();
    s.scenes[1].choices = [{ label: 'Lost', to: 'nowhere' }];
    s.scenes.push({ id: 'orphan', text: 'Unused', ending: true });
    const r = Offline.repair(s, { continueLabel: 'Seguir' });
    expect(r.fixes).toEqual(expect.arrayContaining(['dropped_choice', 'linked_dead_end', 'dropped_unreachable']));
    expect(r.story.scenes.find((x) => x.id === 's2').choices).toEqual([{ label: 'Seguir', to: 's5' }]);
    expect(Offline.validate(r.story).ok).toBe(true);
  });
  it('creates an ending when there is none and breaks endless loops', () => {
    const r = Offline.repair({ start: 'a', scenes: [{ id: 'a', text: 'A', choices: [{ label: 'x', to: 'b' }] }, { id: 'b', text: 'B', choices: [] }] });
    expect(r.story.scenes[1].ending).toBe(true);
    const loop = story(); loop.scenes[3].choices = [{ label: 'Back', to: 's2' }];
    const fixed = Offline.repair(loop);
    expect(fixed.fixes).toContain('linked_loop');
    expect(Offline.validate(fixed.story).ok).toBe(true);
  });
});

describe('AI generation', () => {
  it('re-asks once with the remaining problems, then returns the valid story', async () => {
    const bad = JSON.stringify({ title: 'T', start: 'a', scenes: [{ id: 'a', text: '', choices: [{ label: 'x', to: 'b' }] }, { id: 'b', text: 'B', ending: true }] });
    const callGemini = vi.fn().mockResolvedValueOnce('```json\n' + bad + '\n```').mockResolvedValueOnce(JSON.stringify(story()));
    const result = await Offline.generate({ callGemini, sourceText: 'Rivers carry water.', topic: 'Rivers', language: 'English' });
    expect(callGemini).toHaveBeenCalledTimes(2);
    expect(callGemini.mock.calls[0][0]).toContain('Rivers carry water.');
    expect(callGemini.mock.calls[1][0]).toContain('empty_text at a');
    expect(result.validation.ok).toBe(true);
    expect(result.attempts).toBe(2);
  });
  it('never asks more than twice', async () => {
    const callGemini = vi.fn().mockResolvedValue('not json');
    const result = await Offline.generate({ callGemini, sourceText: 'x' });
    expect(callGemini).toHaveBeenCalledTimes(2);
    expect(result.validation.ok).toBe(false);
  });
});

describe('find', () => {
  it('returns the newest playable offline adventure and skips drafts and AI saves', () => {
    const draft = { id: 'd', type: 'adventure', data: { offlineStory: { start: 'a', scenes: [{ id: 'a', text: '' }] } } };
    const good = { id: 'g', type: 'adventure', data: { offlineStory: story(), offlineOnly: true } };
    const aiSave = { id: 'ai', type: 'adventure', data: { snapshot: { level: 2 } } };
    expect(Offline.find([good, draft, aiSave]).item.id).toBe('g');
    expect(Offline.find([good]).offlineOnly).toBe(true);
    expect(Offline.find([draft, aiSave])).toBeNull();
    expect(Offline.findDraft([good, draft]).id).toBe('d');
  });
});

async function mount(element) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(element));
}
const click = (el) => act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const blockAi = () => {
  const blocked = vi.fn(() => Promise.reject(new Error('blocked'))); blocked._alloQrBlocked = true;
  window.callGemini = blocked; window.__alloStudentAiDisabled = true; window.__alloAiUsable = () => false;
  return blocked;
};

describe('player', () => {
  it('plays to an ending with back and restart, and makes no AI call', async () => {
    const blocked = blockAi();
    await mount(React.createElement(Offline.Player, { story: Offline.normalize(story()), t }));
    const sceneId = () => host.querySelector('[data-offline-scene]').getAttribute('data-offline-scene');
    expect(sceneId()).toBe('s1');
    expect(host.querySelector('[data-offline-back]').disabled).toBe(true);
    await click(host.querySelector('[data-offline-choice="s3"]'));
    expect(sceneId()).toBe('s3');
    expect(document.activeElement).toBe(host.querySelector('[data-offline-scene]'));
    await click(host.querySelector('[data-offline-back]'));
    expect(sceneId()).toBe('s1');
    await click(host.querySelector('[data-offline-choice="s2"]'));
    await click(host.querySelector('[data-offline-choice="s4"]'));
    await click(host.querySelector('[data-offline-choice="s6"]'));
    expect(sceneId()).toBe('s6');
    expect(host.querySelector('[data-offline-scene]').textContent).toBe('The end');
    expect(host.querySelector('[data-offline-choice]')).toBeNull();
    expect(host.querySelector('[data-offline-restart]').textContent).toContain('Play again');
    await click(host.querySelector('[data-offline-restart]'));
    expect(sceneId()).toBe('s1');
    expect(blocked).not.toHaveBeenCalled();
  });
});

const viewProps = (extra) => {
  const base = {
    t, theme: 'light', isTeacherMode: false, activeSessionCode: '', sessionData: {}, studentProjectSettings: { adventureMinXP: 0 },
    adventureState: { currentScene: null, history: [], inventory: [], climax: { isActive: false }, energy: 100, xp: 0, level: 1, xpToNextLevel: 100, gold: 0, turnCount: 0, isLoading: false, isGameOver: false, characters: [], stats: { decisions: 0, conceptsFound: [] } },
    adventureInputMode: 'choice', splitTextToSentences: (x) => [x], formatInteractiveText: (x) => x, playbackState: {}, history: [],
    adventureEffects: {}, ErrorBoundary: ({ children }) => children, ...extra,
  };
  return new Proxy(base, { get(target, key) {
    if (key in target) return target[key];
    if (typeof key === 'string' && /^[A-Z]/.test(key)) return () => null;
    if (typeof key === 'string' && /^(handle|on|toggle|open|close|start|stop|render|get)[A-Z]?/.test(key)) return () => {};
    return undefined;
  } });
};
const renderView = (extra) => { const props = viewProps(extra); return mount(React.createElement(function Harness() { return window.AlloModules.AdventureView(props); })); };
const offlineItem = (extra = {}) => ({ id: 'off1', type: 'adventure', title: 'River Trip', data: { offlineStory: story(), ...extra } });

describe('Adventure view wiring', () => {
  it('a solo learner with no AI plays the offline story instead of the "needs AI" note', async () => {
    const blocked = blockAi();
    await renderView({ history: [offlineItem()] });
    expect(host.querySelector('[data-adventure-offline-player]')).not.toBeNull();
    expect(host.querySelector('[data-adventure-solo-ai-off]')).toBeNull();
    await click(host.querySelector('[data-offline-choice="s2"]'));
    expect(host.querySelector('[data-offline-scene]').getAttribute('data-offline-scene')).toBe('s2');
    expect(blocked).not.toHaveBeenCalled();
  });
  it('keeps the note without an offline story, and AI learners keep AI unless the teacher chose offline only', async () => {
    blockAi();
    await renderView({ history: [] });
    expect(host.querySelector('[data-adventure-solo-ai-off]')).not.toBeNull();
    await act(async () => root.unmount()); host.remove(); root = null;
    delete window.__alloStudentAiDisabled; window.__alloAiUsable = () => true; window.callGemini = () => Promise.resolve('');
    await renderView({ history: [offlineItem()] });
    expect(host.querySelector('[data-adventure-offline-player]')).toBeNull();
    await act(async () => root.unmount()); host.remove(); root = null;
    await renderView({ history: [offlineItem({ offlineOnly: true })] });
    expect(host.querySelector('[data-adventure-offline-player]')).not.toBeNull();
  });
  it('live students never get the offline player (the teacher drives the class story)', async () => {
    blockAi();
    await renderView({ history: [offlineItem({ offlineOnly: true })], activeSessionCode: 'ABCDE' });
    expect(host.querySelector('[data-adventure-offline-player]')).toBeNull();
  });
  it('teachers open the offline editor from the setup screen; old hosts without setHistory show no button', async () => {
    await renderView({ isTeacherMode: true, history: [] });
    expect(host.querySelector('[data-adventure-offline-open]')).toBeNull();
    await act(async () => root.unmount()); host.remove(); root = null;
    await renderView({ isTeacherMode: true, history: [], setHistory: vi.fn() });
    const open = host.querySelector('[data-adventure-offline-open]');
    expect(open).not.toBeNull();
    await click(open);
    expect(document.querySelector('[data-adventure-offline-panel][role="dialog"]')).not.toBeNull();
  });
});

describe('teacher panel', () => {
  it('manual authoring works with no AI: doorway shown, AI button off, save writes a lesson resource', async () => {
    window.__alloAiUsable = () => false;
    window.AlloAiSetupNotice = () => React.createElement('span', { 'data-doorway': true });
    let history = [{ id: 'src', type: 'analysis', data: {} }];
    const setHistory = vi.fn((fn) => { history = fn(history); });
    await mount(React.createElement(Offline.Panel, { t, history, setHistory, callGemini: null, onClose: vi.fn() }));
    expect(host.querySelector('[data-offline-make-ai]').disabled).toBe(true);
    expect(host.querySelector('[data-doorway]')).not.toBeNull();
    await click(host.querySelector('[data-offline-blank]'));
    expect(host.querySelector('[data-offline-validation]').textContent).toContain('Write the scene text.');
    const setValue = (el, value) => act(async () => {
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const areas = () => [...host.querySelectorAll('[data-offline-scene-editor] textarea')];
    for (const [i, text] of ['Start', 'Left end', 'Right end'].entries()) await setValue(areas()[i], text);
    const labels = [...host.querySelectorAll('[data-offline-scene-editor="s1"] input[type="text"]')];
    await setValue(labels[0], 'Go left'); await setValue(labels[1], 'Go right');
    expect(host.querySelector('[data-offline-validation]').textContent).toContain('Ready');
    await click(host.querySelector('[data-offline-add-scene]'));
    expect(host.querySelector('[data-offline-validation]').textContent).toContain('No choice leads here.');
    await click(host.querySelector('[data-offline-scene-editor="s4"] [data-offline-remove-scene]'));
    await click(host.querySelector('[data-offline-save]'));
    expect(setHistory).toHaveBeenCalledTimes(1);
    const saved = history.find((h) => h.type === 'adventure');
    expect(saved.data.offlineOnly).toBe(false);
    expect(Offline.find(history).story.scenes.map((s) => s.text)).toEqual(['Start', 'Left end', 'Right end']);
  });
  it('Make with AI fills the editor from a repaired, validated story', async () => {
    window.__alloAiUsable = () => true;
    const callGemini = vi.fn().mockResolvedValue(JSON.stringify(story()));
    await mount(React.createElement(Offline.Panel, { t, history: [], setHistory: vi.fn(), callGemini, onClose: vi.fn(), settings: { sourceText: 'Rivers.' } }));
    await click(host.querySelector('[data-offline-make-ai]'));
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(host.querySelectorAll('[data-offline-scene-editor]')).toHaveLength(6);
    expect(host.querySelector('[data-offline-validation]').textContent).toContain('Ready');
  });
});

describe('student panel', () => {
  const panel = (props) => mount(React.createElement(window.AlloModules.StudentSaveAdventurePanel.StudentSaveAdventurePanel, {
    activeSessionCode: null, globalPoints: 5, handleResumeAdventure() {}, handleSetShowSubmitModalToTrue() {}, handleStartAdventure: vi.fn(),
    hasSavedAdventure: false, initiateSaveStudentProject() {}, isResumingAdventure: false, isSaveActionPulsing: false,
    projectFileInputRef: { current: null }, sessionData: null, studentProjectSettings: { adventureUnlockXP: 1 }, t, ...props }));
  it('offers Start for an offline story when AI is off, else keeps the note', async () => {
    blockAi();
    await panel({ offlineAdventure: Offline.find([offlineItem()]) });
    expect(host.querySelector('[data-adventure-offline-start]')).not.toBeNull();
    expect(host.querySelector('[data-adventure-solo-ai-off]')).toBeNull();
    await act(async () => root.unmount()); host.remove(); root = null;
    await panel({});
    expect(host.querySelector('[data-adventure-solo-ai-off]')).not.toBeNull();
  });
});

describe('persistence round trip', () => {
  it('survives the student pack, live session and project-file paths with scene art', () => {
    const win = { React: {}, AlloModules: {} };
    const { buildLiveAacModule } = require('../_build_live_aac_module.js');
    new Function('window', readFileSync('firestore_sync_module.js', 'utf8'))(win);
    new Function('window', buildLiveAacModule(readFileSync('live_aac_source.jsx', 'utf8')))(win);
    const art = 'data:image/png;base64,iVBORw0KGgo=';
    const item = offlineItem({ offlineOnly: true });
    item.data.offlineStory.scenes[0].sceneImage = art;
    item.data.offlineStory.scenes[0].sceneImageAlt = 'A wide river';
    const packed = win.AlloModules.LiveAac.serializeResourceForStudentPack(item, { sanitizeHistoryForCloud: win.sanitizeHistoryForCloud, stripUndefined: win.stripUndefined });
    const live = win.prepareSessionResourcesForWrite([item]).resources[0];
    const file = JSON.parse(JSON.stringify({ mode: 'student', history: [packed] })).history;
    for (const history of [[packed], [live], file]) {
      const found = Offline.find(history);
      expect(found, JSON.stringify(history).slice(0, 200)).not.toBeNull();
      expect(found.offlineOnly).toBe(true);
      expect(found.story.scenes).toHaveLength(6);
      expect(found.story.scenes[0].choices).toEqual(story().scenes[0].choices);
    }
    expect(Offline.find([packed]).story.scenes[0].sceneImage).toBe(art);
    expect(Offline.find([packed]).story.scenes[0].sceneImageAlt).toBe('A wide river');
  });
});
