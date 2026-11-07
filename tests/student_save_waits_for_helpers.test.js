// Student Save File must wait for what the save needs (live bug found 2026-11-06).
//
// The save module refuses a student save until SessionTransport, LiveAac and the FirestoreSync
// sanitizers exist. Those load from a background queue that parks behind the launch pad and nearly
// stops while someone clicks or types, and the host waited only for the save module. On the live
// app a student who pressed Save File early got "Reload AlloFlow" and no file, and a reload only
// restarted the wait. These tests run the host's real save code, cut from AlloFlowANTI.txt, against
// the real student-boundary modules.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));

const REAL = {
  FirestoreSync: 'firestore_sync_module.js',
  SessionTransportModule: 'session_transport_module.js',
  LiveAac: 'live_aac_module.js',
  InstructionalContext: 'instructional_context_module.js',
  ViewBrainstormModule: 'view_brainstorm_module.js',
};
// These only change what the file holds, and are large, so a marker stands in for them here.
const MARKERS = { ViewQuizModule: 'QuizView', GenDispatcherModule: 'GenDispatcher', ResourceReadAloudModule: 'ResourceReadAloud', MemoryAidModule: 'MemoryAid' };
const REQUIRED = ['FirestoreSync', 'LiveAac', 'SessionTransportModule'];
const CONTENT = ['InstructionalContext', 'ViewBrainstormModule', 'ViewQuizModule', 'GenDispatcherModule', 'ResourceReadAloudModule', 'MemoryAidModule'];
const WINDOW_HELPERS = ['stripUndefined', 'sanitizeHistoryForCloud', 'hydrateHistory', 'estimateJsonBytes', 'prepareSessionResourcesForWrite', 'sanitizeMemoryAidResourceForBoundary', 'sanitizeStudentResearchResource', 'sanitizeSessionValue'];
const FAILED_LOAD = 'Could not finish loading';

let anti, hostSource, downloads, blobs, toasts, click, ensured, failing;

const slice = (from, to) => {
  const a = anti.indexOf(from), b = anti.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error('host anchor missing: ' + from);
  return anti.slice(a, b);
};
const loadFile = (file) => new Function(readFileSync(resolve(process.cwd(), file), 'utf8'))();
const loadModule = (name) => {
  if (REAL[name]) return loadFile(REAL[name]);
  window.AlloModules[MARKERS[name]] = {};
  window.AlloModules[name] = true;
};

const saveDeps = (over = {}) => ({
  saveFileName: 'student-file', saveType: 'student',
  history: [{ id: 's1', type: 'simplified', title: 'Reading', data: 'The cat sat.' }, { id: 'p1', type: 'lesson-plan', title: 'TEACHERPLAN', data: { hook: 'x' } }],
  studentProgressLog: [], studentResponses: {}, studentNickname: 'Learner', studentProjectSettings: {},
  adventureState: {}, escapeRoomState: {}, completedActivities: new Map(), socraticMessages: [], fluencyAssessments: [],
  flashcardEngagement: {}, timeOnTask: {}, pointHistory: [], probeHistory: [], interventionLogs: [], surveyResponses: [],
  fidelityLog: [], externalCBMScores: [], gameCompletions: {}, labelChallengeResults: [], wordSoundsHistory: [],
  wordSoundsBadges: {}, phonemeMastery: {}, wordSoundsDailyProgress: {}, wordSoundsConfusionPatterns: {},
  wordSoundsFamilies: {}, wordSoundsAudioLibrary: {}, wordSoundsScore: {}, globalPoints: 0, sessionCounter: 1,
  addToast: (m, t) => toasts.push({ m: String(m), t }), warnLog() {}, t: (k) => k,
  setStudentProgressLog() {}, setLastJsonFileSave() {}, setIsSaveActionPulsing() {}, setShowSaveModal() {},
  getFocusRatio: () => null, ...over,
});

// The host's own executeSaveFile + _alloAwaitModules, with the component state it closes over.
const makeContext = (deps, open = true) => ({ values: [open, deps.saveType, deps.saveFileName, deps.saveEncryptPassword || ''], getDeps: () => deps });
const hostSave = (deps, contextRef = { current: makeContext(deps) }) => {
  const make = new Function('React', 'addToast', 'warnLog', 'setIsProjectSaving', 'projectSaveBusyRef', 'projectSaveContextRef', 'projectSaveRequestRef', hostSource);
  return make(React, deps.addToast, () => {}, () => {}, { current: false }, contextRef, { current: 0 })();
};
const savedFile = async () => JSON.parse(await downloads.at(-1).blob.text());

beforeAll(() => {
  anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
  hostSource = slice('const _alloAwaitModules = (mods', '\n  const generateBilingualText') + '\n'
    + slice('const executeSaveFile = async (interactionOptions)', '\n  const _studentSavePrivateFilenameTokens')
    + '\nreturn executeSaveFile;';
  globalThis.React = React;
  window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
});

beforeEach(() => {
  // What the student has at that moment: the save module and nothing from the background queue.
  window.AlloModules = {};
  WINDOW_HELPERS.forEach((key) => { delete window[key]; });
  window.__alloflowSelToolData = null;
  loadFile('phase_k_helpers_module.js');
  downloads = []; blobs = []; toasts = []; ensured = []; failing = new Set();
  window.__alloModuleRegistry = {};
  window.__alloModuleWaitToasts = {};
  window.__alloPromoteModule = () => true;
  window.__alloEnsureLazyModule = async (name, _loader, readyKey) => {
    ensured.push(name);
    await Promise.resolve();
    if (failing.has(name)) throw Object.assign(new Error(name + ' could not be loaded.'), { code: 'allo-lazy-module-failed' });
    loadModule(name);
    if (!window.AlloModules[readyKey]) throw new Error(name + ' did not provide ' + readyKey);
    return window.AlloModules[readyKey];
  };
  vi.stubGlobal('Blob', class { constructor(parts) { this.parts = parts; } async text() { return this.parts.join(''); } });
  URL.createObjectURL = vi.fn((blob) => { blobs.push(blob); return 'blob:x'; });
  URL.revokeObjectURL = vi.fn();
  click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloads.push({ name: this.download, blob: blobs.at(-1) }); });
});

afterEach(() => {
  click.mockRestore();
  vi.unstubAllGlobals();
  delete window.__alloEnsureLazyModule;
  delete window.__alloPromoteModule;
  delete window.__alloModuleRegistry;
});

describe('pressing Save File before the background queue has finished', () => {
  it('waits for the helpers and then saves, instead of refusing', async () => {
    const result = await hostSave(saveDeps());
    expect(result.reason).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(downloads).toHaveLength(1);
    expect(toasts.some((x) => /could not be prepared/i.test(x.m))).toBe(false);
  });

  it('asks for every module the student file depends on, not just the ones it refuses without', async () => {
    await hostSave(saveDeps());
    expect([...ensured].sort()).toEqual([...REQUIRED, ...CONTENT].sort());
  });

  it('still keeps teacher-only resources out of the file it waited to write', async () => {
    await hostSave(saveDeps());
    const saved = await savedFile();
    expect(saved.mode).toBe('student');
    expect(saved.history.map((item) => item.id)).toEqual(['s1']);
    expect(JSON.stringify(saved)).not.toMatch(/TEACHERPLAN/);
  });

  it('tells the student it is getting ready while it waits', async () => {
    await hostSave(saveDeps());
    expect(toasts.some((x) => /Getting project save ready/.test(x.m))).toBe(true);
  });
});

// FirestoreSync landing fires an upgrade event. It used to give `history` a new array even when nothing
// had changed, and the save reads any change as "a different project", so on the real app the save
// stopped with no file and no message. A REAL change during the wait must still discard the save.
describe('project state that changes while the save waits', () => {
  // The real upgrade handler + the real helpers it calls, cut from AlloFlowANTI.txt.
  const upgrade = (history, hydrateHistory = (items) => items) => {
    const helpers = slice('function _alloRehydrateShimHistory(items) {', '\n// Shim for safety_checker_module.js')
      + slice("const ALLO_ARTIFACT_INSTANCE_ID_FIELD = '_artifactInstanceId';", 'const sameArtifactInstance = (left, right)');
    const handler = slice('const onFirestoreSyncUpgraded = () => _setHistory(prev => {', "\n    window.addEventListener('allo-firestore-sync-upgraded'");
    const ref = { current: null };
    let result;
    const setHistory = (fn) => { result = fn(history); };
    new Function('hydrateHistory', '_setHistory', 'bootHistoryHydrationRef', helpers + '\n' + handler + '\nonFirestoreSyncUpgraded();')(hydrateHistory, setHistory, ref);
    return { result, hydration: ref.current };
  };

  it('an upgrade that changes nothing keeps the same history array, so a save in progress is not disturbed', () => {
    const history = [{ id: 'q1', type: 'quiz', data: { questions: [] }, _artifactInstanceId: 'artifact-unchanged1' }, { id: 's1', type: 'simplified', data: 'Text', dataEncoding: 'text/v1', _artifactInstanceId: 'artifact-unchanged2' }];
    const { result, hydration } = upgrade(history);
    expect(result).toBe(history);
    expect(hydration).toBe(null);
  });

  it('an upgrade that really hydrates something still replaces history', () => {
    const history = [{ id: 'q1', type: 'quiz', data: '{"questions":[]}', _artifactInstanceId: 'artifact-hydrating1' }];
    const hydrated = [{ id: 'q1', type: 'quiz', data: { questions: [] }, _artifactInstanceId: 'artifact-hydrating1' }];
    const { result, hydration } = upgrade(history, () => hydrated);
    expect(result).not.toBe(history);
    expect(result[0].data).toEqual({ questions: [] });
    expect(hydration).toEqual({ previous: history, current: result });
  });

  it('an upgrade that repairs a duplicate id still replaces history', () => {
    const history = [{ id: 'a', type: 'quiz', data: {}, _artifactInstanceId: 'artifact-duplicate1' }, { id: 'b', type: 'quiz', data: {}, _artifactInstanceId: 'artifact-duplicate1' }];
    const { result } = upgrade(history);
    expect(result).not.toBe(history);
    expect(result[0]._artifactInstanceId).not.toBe(result[1]._artifactInstanceId);
  });

  it('a real change during the wait discards the stale save, says so, and the next press saves', async () => {
    const deps = saveDeps();
    const ref = { current: makeContext(deps) };
    const ensure = window.__alloEnsureLazyModule;
    window.__alloEnsureLazyModule = async (name, loader, readyKey) => {
      const value = await ensure(name, loader, readyKey);
      if (name === 'FirestoreSync') ref.current = makeContext(deps);
      return value;
    };
    const result = await hostSave(deps, ref);
    expect(result).toMatchObject({ ok: false, cancelled: true, reason: 'save-context-changed' });
    expect(downloads).toEqual([]);
    expect(toasts.some((x) => /Save again/.test(x.m))).toBe(true);
    expect((await hostSave(deps, ref)).ok).toBe(true);
    expect(downloads).toHaveLength(1);
  });

  it('closing the dialog during the wait cancels quietly with no file', async () => {
    const deps = saveDeps();
    const ref = { current: makeContext(deps) };
    const ensure = window.__alloEnsureLazyModule;
    window.__alloEnsureLazyModule = async (name, loader, readyKey) => {
      const value = await ensure(name, loader, readyKey);
      ref.current = makeContext(deps, false);
      return value;
    };
    const result = await hostSave(deps, ref);
    expect(result).toMatchObject({ ok: false, cancelled: true, reason: 'save-context-changed' });
    expect(downloads).toEqual([]);
    expect(toasts.some((x) => /Save cancelled/.test(x.m))).toBe(false);
  });

  it('a change that still stops the save, with the dialog open, says so instead of doing nothing', async () => {
    Object.keys(REAL).forEach(loadModule);
    Object.keys(MARKERS).forEach(loadModule);
    const deps = saveDeps();
    const ref = { current: makeContext(deps) };
    // Mid-save, after the host has read the project: the dialog stays open but the context moves on.
    const realGetDeps = deps;
    ref.current.getDeps = () => { ref.current = makeContext(realGetDeps); return realGetDeps; };
    const result = await hostSave(deps, ref);
    expect(result).toMatchObject({ ok: false, cancelled: true, reason: 'save-context-changed' });
    expect(toasts.some((x) => /Save again/.test(x.m))).toBe(true);
  });
});

describe('when a module cannot load', () => {
  for (const name of REQUIRED) {
    it(`${name}: no file, nothing written, and the message is about the connection rather than reloading`, async () => {
      failing.add(name);
      const result = await hostSave(saveDeps());
      expect(result).toMatchObject({ ok: false, reason: 'save-failed' });
      expect(downloads).toEqual([]);
      expect(toasts.some((x) => x.m.includes(FAILED_LOAD))).toBe(true);
      expect(toasts.some((x) => /reload/i.test(x.m))).toBe(false);
    });
  }

  for (const name of CONTENT) {
    it(`${name}: the save still goes through, because the file stays safe without it`, async () => {
      failing.add(name);
      const result = await hostSave(saveDeps());
      expect(result.ok).toBe(true);
      expect(downloads).toHaveLength(1);
      expect(toasts.some((x) => x.m.includes(FAILED_LOAD))).toBe(false);
    });
  }

  it('a project with discussion activities is still refused if the activity module is missing, rather than dropping them', async () => {
    failing.add('ViewBrainstormModule');
    const history = [{ id: 'b1', type: 'brainstorm', data: [{ kind: 'discussion', title: 'Talk' }] }];
    const result = await hostSave(saveDeps({ history }));
    expect(result).toMatchObject({ ok: false, reason: 'student-resource-projection-unavailable' });
    expect(downloads).toEqual([]);
  });

  it('a second press works once the module can load, with no reload', async () => {
    failing.add('SessionTransportModule');
    expect((await hostSave(saveDeps())).ok).toBe(false);
    failing.clear();
    expect((await hostSave(saveDeps())).ok).toBe(true);
    expect(downloads).toHaveLength(1);
  });
});

describe('saves that have nothing to wait for', () => {
  it('a teacher save does not wait for the student helpers', async () => {
    const result = await hostSave(saveDeps({ saveType: 'teacher', saveFileName: 'teacher-file' }));
    expect(result.ok).toBe(true);
    expect(ensured).toEqual([]);
  });

  it('once everything has loaded, a student save starts straight away with no "getting ready" message', async () => {
    Object.keys(REAL).forEach(loadModule);
    Object.keys(MARKERS).forEach(loadModule);
    const result = await hostSave(saveDeps());
    expect(result.ok).toBe(true);
    expect(ensured).toEqual([]);
    expect(toasts.some((x) => /Getting project save ready/.test(x.m))).toBe(false);
  });
});

describe('reaching the button', () => {
  it('the Save File panel loads in the first-action tier, not at the back of the background queue', () => {
    // With steady clicking the queue moves one module per 8 s: the button took over 400 s to appear.
    const list = slice('var FIRST_ACTION_MODULES = [', '];');
    expect(list.includes("'StudentSaveAdventurePanel'")).toBe(true);
    expect(list.includes("'PhaseKHelpersModule'")).toBe(true);
  });

  it('FirestoreSync loads early too, so its upgrade normally lands before a project is open', () => {
    expect(slice('var FIRST_ACTION_MODULES = [', '];').includes("'FirestoreSync'")).toBe(true);
  });
});

describe('the save module own messages', () => {
  it('helpers still missing (an older host page): says to wait and press again, never to reload', async () => {
    const result = await window.AlloModules.PhaseKHelpers.executeSaveFile(saveDeps());
    expect(result).toMatchObject({ ok: false, reason: 'student-resource-projection-unavailable' });
    expect(result.narration).toMatch(/Wait a moment/);
    expect(result.narration).not.toMatch(/reload/i);
    expect(toasts.at(-1)).toMatchObject({ t: 'error' });
    expect(downloads).toEqual([]);
  });

  it('a resource that fails its safety check gets its own reason and message, and no file', async () => {
    Object.keys(REAL).forEach(loadModule);
    window.AlloModules.LiveAac.serializeResourceForStudentPack = () => null;
    const result = await window.AlloModules.PhaseKHelpers.executeSaveFile(saveDeps());
    expect(result).toMatchObject({ ok: false, reason: 'student-resource-not-safe' });
    expect(result.narration).not.toMatch(/reload/i);
    expect(downloads).toEqual([]);
  });
});
