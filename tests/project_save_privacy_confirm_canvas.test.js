// Project save: the FERPA "Save anyway?" prompt must survive the Canvas sandbox (field report 2026-09-11).
//
// "Save keeps cancelling, no clear error." executeSaveFile asked the privacy question through raw
// window.confirm(); a sandboxed Canvas iframe returns false from it INSTANTLY with no dialog, so
// any project holding a voice recording or SEL data was reported as "Save cancelled." with
// nothing to see. The helper now prefers the in-app dialog (window.AlloFlowUX.confirm), treats a
// native `false` that arrives in under 50 ms as a suppressed dialog (not a user choice), and logs
// the route + outcome on every path.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));

let PhaseKHelpers;
let downloads;
let anchorClickSpy;
let toasts;
let logs;

class TestBlob {
  constructor(parts, options) { this.parts = parts; this.type = options?.type || ''; }
  async text() { return this.parts.join(''); }
}

// SEL tool data is one of the two detectors that raise the privacy prompt.
const makeSaveDeps = (overrides = {}) => ({
  saveFileName: 'student-project',
  saveType: 'student',
  history: [{ id: 'lesson-1', type: 'lesson-plan', title: 'Lesson' }],
  studentProgressLog: [],
  studentResponses: {},
  studentNickname: 'Learner',
  studentProjectSettings: {},
  adventureState: {},
  escapeRoomState: {},
  completedActivities: new Map(),
  socraticMessages: [],
  fluencyAssessments: [],
  flashcardEngagement: {},
  timeOnTask: {},
  pointHistory: [],
  probeHistory: [],
  interventionLogs: [],
  surveyResponses: [],
  fidelityLog: [],
  externalCBMScores: [],
  gameCompletions: {},
  labelChallengeResults: [],
  wordSoundsHistory: [],
  wordSoundsBadges: {},
  phonemeMastery: {},
  wordSoundsDailyProgress: {},
  wordSoundsConfusionPatterns: {},
  wordSoundsFamilies: {},
  wordSoundsAudioLibrary: {},
  wordSoundsScore: {},
  globalPoints: 0,
  sessionCounter: 1,
  _isCanvasEnv: true,
  addToast(message, type) { toasts.push({ message: String(message), type }); },
  warnLog(...args) { logs.push(args.map(String).join(' ')); },
  t(key) { return key; },
  setStudentProgressLog() {},
  setLastJsonFileSave() {},
  setIsSaveActionPulsing() {},
  setShowSaveModal() {},
  getFocusRatio() { return null; },
  ...overrides,
});

beforeAll(() => {
  globalThis.React = React;
  window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('phase_k_helpers_module.js');
  PhaseKHelpers = window.AlloModules.PhaseKHelpers;
});

beforeEach(() => {
  // SEL tool data (read from the window bridge) is one of the two detectors that raise the prompt.
  window.__alloflowSelToolData = { 'check-in': { mood: 'ok' } };
  downloads = [];
  toasts = [];
  logs = [];
  vi.stubGlobal('Blob', TestBlob);
  URL.createObjectURL = vi.fn(() => 'blob:project-save-test');
  URL.revokeObjectURL = vi.fn();
  anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
    downloads.push({ name: this.download });
  });
  delete window.AlloFlowUX;
});

afterEach(() => {
  window.__alloflowSelToolData = null;
  anchorClickSpy.mockRestore();
  vi.unstubAllGlobals();
  delete window.AlloFlowUX;
});

describe('privacy confirm survives the Canvas sandbox', () => {
  it('prefers the in-app dialog and never touches window.confirm when it exists', async () => {
    const uxConfirm = vi.fn(async () => true);
    window.AlloFlowUX = { confirm: uxConfirm };
    window.confirm = vi.fn(() => false);

    const result = await PhaseKHelpers.executeSaveFile(makeSaveDeps());

    expect(uxConfirm).toHaveBeenCalledTimes(1);
    expect(uxConfirm.mock.calls[0][0]).toMatch(/Save anyway\?/);
    expect(window.confirm).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(downloads).toEqual([{ name: 'student-project_CONFIDENTIAL.json' }]);
    expect(logs.some((l) => /\[SaveFile\] privacy confirm — sel-data via in-app → confirmed/.test(l))).toBe(true);
    expect(logs.some((l) => /\[SaveFile\] download handed to the browser — student-project_CONFIDENTIAL\.json/.test(l))).toBe(true);
  });

  it('a genuine in-app decline is still "Save cancelled." (privacy-declined)', async () => {
    window.AlloFlowUX = { confirm: vi.fn(async () => false) };

    const result = await PhaseKHelpers.executeSaveFile(makeSaveDeps());

    expect(result).toMatchObject({ ok: false, cancelled: true, reason: 'privacy-declined', dialogRoute: 'in-app', privacyKind: 'sel-data' });
    expect(downloads).toEqual([]);
    expect(toasts).toEqual([{ message: 'toasts.save_cancelled', type: 'info' }]);
  });

  it('a native confirm that returns false instantly is reported as SUPPRESSED, not as the user cancelling', async () => {
    window.confirm = vi.fn(() => false); // what a sandboxed iframe does: no dialog, immediate false

    const result = await PhaseKHelpers.executeSaveFile(makeSaveDeps());

    expect(result).toMatchObject({ ok: false, cancelled: false, reason: 'privacy-dialog-suppressed', dialogRoute: 'native' });
    expect(downloads).toEqual([]);
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].message).toMatch(/blocked the privacy confirmation dialog/);
    expect(logs.some((l) => /via native → declined in \d+ms \(dialog SUPPRESSED by the host/.test(l))).toBe(true);
  });

  it('the spoken-command path (privacyConfirmed) skips every dialog', async () => {
    window.confirm = vi.fn(() => false);
    const result = await PhaseKHelpers.executeSaveFile(makeSaveDeps(), { privacyConfirmed: true });
    expect(window.confirm).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(logs.some((l) => /via spoken → confirmed/.test(l))).toBe(true);
  });

  it('a download click that throws is surfaced instead of a false "saved" toast', async () => {
    window.AlloFlowUX = { confirm: vi.fn(async () => true) };
    anchorClickSpy.mockImplementation(function click() { throw new Error('sandbox refused download'); });

    const result = await PhaseKHelpers.executeSaveFile(makeSaveDeps());

    expect(result).toMatchObject({ ok: false, reason: 'download-blocked' });
    expect(toasts.at(-1).type).toBe('error');
    expect(toasts.at(-1).message).toMatch(/sandbox refused download/);
    expect(toasts.some((x) => /Project saved as/.test(x.message))).toBe(false);
  });
});

describe('source pins (module and .jsx source agree)', () => {
  const { readFileSync } = require('node:fs');
  for (const name of ['phase_k_helpers_module.js', 'phase_k_helpers_source.jsx']) {
    it(`${name} routes the privacy prompt through AlloFlowUX.confirm and classifies a suppressed native dialog`, () => {
      const text = readFileSync(resolve(process.cwd(), name), 'utf8');
      const fn = text.slice(text.indexOf('executeSaveFile = async (deps'), text.indexOf('Project saved as'));
      expect(fn).toContain('_ux.confirm(_msg');
      expect(fn).toMatch(/suppressed: !_native && _ms < 50/);
      expect(fn).toMatch(/privacy-dialog-suppressed/);
      expect(fn).toMatch(/\[SaveFile\] privacy confirm/);
      expect(fn).toMatch(/\[SaveFile\] download/);
      expect(fn).not.toMatch(/\? window\.confirm\(_msg\) : true\)/);
    });
  }
});
