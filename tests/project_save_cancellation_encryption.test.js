import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const cryptoApi = require('../allo_crypto_module.js');
let save, downloads, click, blobs;
function deps(overrides = {}) {
  return {
    saveFileName: 'lesson-A', saveType: 'student', history: [{ id: 'lesson-A', type: 'lesson-plan', title: 'Original lesson' }],
    studentProgressLog: [], studentResponses: {}, studentNickname: 'Codename', studentProjectSettings: {},
    adventureState: {}, escapeRoomState: {}, completedActivities: new Map(), socraticMessages: [], fluencyAssessments: [],
    flashcardEngagement: {}, timeOnTask: {}, pointHistory: [], probeHistory: [], interventionLogs: [], surveyResponses: [],
    fidelityLog: [], externalCBMScores: [], gameCompletions: {}, labelChallengeResults: [], wordSoundsHistory: [],
    wordSoundsBadges: {}, phonemeMastery: {}, wordSoundsDailyProgress: {}, wordSoundsConfusionPatterns: {},
    wordSoundsFamilies: {}, wordSoundsAudioLibrary: {}, wordSoundsScore: {}, globalPoints: 0, sessionCounter: 1,
    addToast: vi.fn(), warnLog: vi.fn(), t: key => key,
    setStudentProgressLog: vi.fn(), setLastJsonFileSave: vi.fn(), setIsSaveActionPulsing: vi.fn(), setShowSaveModal: vi.fn(),
    getFocusRatio: () => null, ...overrides,
  };
}
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
beforeEach(() => {
  window.AlloModules = {};
  window.__alloflowSelToolData = null; window.__alloflowSelProgress = null;
  window.__alloflowSelSnapshots = null; window.__alloflowStudentArtifacts = null; delete window.AlloFlowUX;
  new Function('React', 'window', readFileSync(process.env.ALLO_PHASE_K_CANDIDATE || 'phase_k_helpers_module.js', 'utf8'))(React, window);
  save = window.AlloModules.PhaseKHelpers.executeSaveFile;
  downloads = []; blobs = [];
  vi.stubGlobal('Blob', class { constructor(parts) { this.text = async () => parts.join(''); } });
  URL.createObjectURL = vi.fn(blob => { blobs.push(blob); return 'blob:save-test'; });
  URL.revokeObjectURL = vi.fn();
  click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloads.push({ name: this.download, blob: blobs.at(-1) }); });
});
afterEach(() => { click.mockRestore(); vi.unstubAllGlobals(); delete window.AlloFlowUX; window.__alloflowSelToolData = null; });

describe('requested project encryption', () => {
  it.each([undefined, {}, { encryptJSON: null }])('does not download plaintext when the crypto API is unavailable (%j)', async api => {
    window.AlloModules.AlloCrypto = api;
    const d = deps({ saveType: 'teacher', saveEncryptPassword: 'test-password' });
    expect(await save(d)).toMatchObject({ ok: false, reason: 'encryption-failed' });
    expect(downloads).toEqual([]); expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(d.setLastJsonFileSave).not.toHaveBeenCalled(); expect(d.setShowSaveModal).not.toHaveBeenCalled();
  });
  it('does not download or mark a save when encryption rejects', async () => {
    window.AlloModules.AlloCrypto = { encryptJSON: vi.fn().mockRejectedValue(new Error('Crypto failed')) };
    const d = deps({ saveType: 'teacher', saveEncryptPassword: 'test-password' });
    expect(await save(d)).toMatchObject({ reason: 'encryption-failed' }); expect(downloads).toEqual([]);
    expect(d.setStudentProgressLog).not.toHaveBeenCalled(); expect(d.setLastJsonFileSave).not.toHaveBeenCalled();
  });
  it('downloads a real encrypted envelope that decrypts to the original project', async () => {
    window.AlloModules.AlloCrypto = cryptoApi;
    const d = deps({ saveType: 'teacher', saveEncryptPassword: 'test-password', history: [{ id: 'lesson-A', type: 'lesson-plan', title: 'Private lesson text' }] });
    expect(await save(d)).toMatchObject({ ok: true }); expect(downloads).toHaveLength(1);
    expect(downloads[0].name).toBe('lesson-A.enc.json');
    const text = await downloads[0].blob.text(), envelope = JSON.parse(text);
    expect(envelope.kind).toBe('alloenc'); expect(text).not.toContain('Private lesson text'); expect(text).not.toContain('test-password');
    const project = await cryptoApi.decryptJSON(envelope, 'test-password');
    expect(project.history[0].title).toBe('Private lesson text'); expect(project.history[0].id).toBe('lesson-A');
    await expect(cryptoApi.decryptJSON(envelope, 'wrong-password')).rejects.toThrow();
  });
});

describe('save cancellation at async boundaries', () => {
  it('does not start a save whose request is already cancelled', async () => {
    const d = deps({ isSaveRequestCurrent: () => false });
    expect(await save(d)).toMatchObject({ cancelled: true }); expect(downloads).toEqual([]);
    expect(d.setStudentProgressLog).not.toHaveBeenCalled();
  });
  it('cancels after a delayed document-builder snapshot', async () => {
    const wait = deferred(); let current = true;
    const d = deps({ saveType: 'teacher', builderDraft: wait.promise, isSaveRequestCurrent: () => current });
    const pending = save(d); current = false; wait.resolve({ schemaVersion: 1 });
    expect(await pending).toMatchObject({ reason: 'save-context-changed' }); expect(downloads).toEqual([]);
  });
  it('does not download or change progress when Cancel is used during privacy confirmation', async () => {
    const wait = deferred(); let current = true;
    window.__alloflowSelToolData = { journal: { text: 'Private reflection' } };
    window.AlloFlowUX = { confirm: vi.fn(() => wait.promise) };
    const d = deps({ isSaveRequestCurrent: () => current });
    const pending = save(d); expect(window.AlloFlowUX.confirm).toHaveBeenCalledOnce(); current = false; wait.resolve(true);
    expect(await pending).toMatchObject({ cancelled: true }); expect(downloads).toEqual([]);
    expect(d.setStudentProgressLog).not.toHaveBeenCalled(); expect(d.setLastJsonFileSave).not.toHaveBeenCalled();
  });
  it('cancels after encryption completes without creating a download URL', async () => {
    const wait = deferred(); let current = true;
    window.AlloModules.AlloCrypto = { encryptJSON: vi.fn(() => wait.promise) };
    const d = deps({ saveType: 'teacher', saveEncryptPassword: 'test-password', isSaveRequestCurrent: () => current });
    const pending = save(d); await Promise.resolve(); expect(window.AlloModules.AlloCrypto.encryptJSON).toHaveBeenCalledOnce();
    current = false; wait.resolve({ kind: 'alloenc', ct: 'test' });
    expect(await pending).toMatchObject({ cancelled: true }); expect(downloads).toEqual([]); expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it('records student progress only after the browser accepts the download', async () => {
    const d = deps(); click.mockImplementationOnce(() => { throw new Error('Download blocked'); });
    expect(await save(d)).toMatchObject({ reason: 'download-blocked' }); expect(d.setStudentProgressLog).not.toHaveBeenCalled();
    expect(await save(d)).toMatchObject({ ok: true }); expect(d.setStudentProgressLog).toHaveBeenCalledOnce();
    expect(d.setStudentProgressLog.mock.calls[0][0]).toHaveLength(1);
  });
});

describe('adventure restart confirmation cancellation', () => {
  it('keeps the current story if it changes while the restart dialog is open', async () => {
    const source = readFileSync(process.env.ALLO_ADVENTURE_CANDIDATE || 'adventure_handlers_source.jsx', 'utf8');
    const api = new Function('window', source + '\nreturn window.AlloModules.AdventureHandlers;')(window);
    const wait = deferred(); let current = true;
    window.AlloFlowUX = { confirm: vi.fn(() => wait.promise) };
    const d = { history: [], inputText: 'Original lesson', adventureState: { currentScene: { text: 'Current story' }, history: [] },
      isAdventureStartCurrent: () => current, t: key => key, warnLog: vi.fn(), setAdventureState: vi.fn(),
      setActiveView: vi.fn(), setPendingAdventureUpdate: vi.fn(), stopPlayback: vi.fn(), alloBotRef: { current: null },
      setFailedAdventureAction: vi.fn(), setShowDice: vi.fn(), setDiceResult: vi.fn(), setAdventureTextInput: vi.fn(),
      setShowNewGameSetup: vi.fn(), setHasSavedAdventure: vi.fn(), addToast: vi.fn() };
    const pending = api.handleStartAdventure(d); expect(window.AlloFlowUX.confirm).toHaveBeenCalledOnce(); current = false; wait.resolve(true);
    expect(await pending).toBe(false); expect(d.setAdventureState).not.toHaveBeenCalled(); expect(d.setActiveView).not.toHaveBeenCalled();
    expect(d.setPendingAdventureUpdate).not.toHaveBeenCalled(); expect(d.stopPlayback).not.toHaveBeenCalled();
  });
});
