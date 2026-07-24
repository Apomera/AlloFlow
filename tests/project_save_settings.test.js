import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
const ReactDOMServer = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/server'));

let PhaseKHelpers;
let ProjectSettingsView;
let activeBlob;
let downloads;
let anchorClickSpy;
let confirmResult;

class TestBlob {
  constructor(parts, options) {
    this.parts = parts;
    this.type = options?.type || '';
  }
  async text() {
    return this.parts.join('');
  }
}

const resetWindowProjectData = () => {
  [
    '__alloflowSelEngagement', '__alloflowSelStations', '__alloflowSelProgress',
    '__alloflowSelToolData', '__alloflowSelSnapshots', '__alloflowStudentArtifacts'
  ].forEach((key) => { window[key] = null; });
};

const makeSaveDeps = (overrides = {}) => ({
  saveFileName: 'student-project',
  saveType: 'student',
  history: [
    { id: 'lesson-1', type: 'lesson-plan', title: 'Lesson' },
    { id: 'quiz-1', type: 'quiz', data: { questions: [{ options: ['A', 'B'], correctAnswer: 'A' }] } },
    { id: 'hidden-1', type: 'udl-advice' },
    { id: 'hidden-2', type: 'brainstorm' }
  ],
  studentProgressLog: [],
  studentResponses: { 'quiz-1': { 0: 0 } },
  studentNickname: 'Learner',
  studentProjectSettings: { allowDictation: true, allowSocraticTutor: true },
  adventureState: {},
  escapeRoomState: {},
  completedActivities: new Map([['lesson-1', 100]]),
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
  globalPoints: 25,
  sessionCounter: 1,
  addToast() {},
  t(key) { return key; },
  setStudentProgressLog() {},
  setLastJsonFileSave() {},
  setIsSaveActionPulsing() {},
  setShowSaveModal() {},
  getFocusRatio() { return null; },
  ...overrides
});

const lastSavedJson = async () => JSON.parse(await downloads.at(-1).blob.text());

beforeAll(() => {
  globalThis.React = React;
  window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('phase_k_helpers_module.js');
  loadAlloModule('view_project_settings_module.js');
  PhaseKHelpers = window.AlloModules.PhaseKHelpers;
  ProjectSettingsView = window.AlloModules.ProjectSettingsView;
});

beforeEach(() => {
  activeBlob = null;
  downloads = [];
  confirmResult = true;
  resetWindowProjectData();
  vi.stubGlobal('Blob', TestBlob);
  URL.createObjectURL = vi.fn((blob) => { activeBlob = blob; return 'blob:project-save-test'; });
  URL.revokeObjectURL = vi.fn();
  window.confirm = vi.fn(() => confirmResult);
  anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
    downloads.push({ name: this.download, blob: activeBlob });
  });
});

afterEach(() => {
  anchorClickSpy.mockRestore();
  vi.unstubAllGlobals();
  resetWindowProjectData();
});

describe('project JSON saves', () => {
  it('saves a teacher project with a valid SEL progress summary', async () => {
    window.__alloflowSelStations = [{ id: 'station-1', quests: [{ id: 'quest-1' }] }];
    window.__alloflowSelProgress = { 'station-1': { 'quest-1': { manualComplete: true } } };

    await PhaseKHelpers.executeSaveFile(makeSaveDeps({
      saveType: 'teacher',
      saveFileName: 'teacher-project',
      isIndependentMode: false
    }));

    expect(downloads).toHaveLength(1);
    expect(downloads[0].name).toBe('teacher-project_CONFIDENTIAL.json');
    const saved = await lastSavedJson();
    expect(saved.studentProgressSummary.sel.stationQuestsComplete).toBe(1);
    expect(saved.studentProgressSummary.sel.stationQuestsTotal).toBe(1);
  });

  it('persists a sanitized Builder draft only in teacher projects', async () => {
    const builderDraft = {
      version: 1,
      source: 'history',
      historySignature: '123:abc',
      html: '<!doctype html><html><body><h1>Edited lesson</h1></body></html>',
      activeContentRemoved: true
    };

    await PhaseKHelpers.executeSaveFile(makeSaveDeps({
      saveType: 'teacher',
      saveFileName: 'teacher-with-draft',
      isIndependentMode: false,
      builderDraft: Promise.resolve(builderDraft)
    }));
    expect((await lastSavedJson()).builderDraft).toEqual(builderDraft);

    await PhaseKHelpers.executeSaveFile(makeSaveDeps({
      saveFileName: 'student-without-draft',
      builderDraft
    }));
    expect((await lastSavedJson()).builderDraft).toBeUndefined();
  });

  it('saves a student project without the removed researchMode free variable', async () => {
    await PhaseKHelpers.executeSaveFile(makeSaveDeps());

    expect(downloads).toHaveLength(1);
    expect(downloads[0].name).toBe('student-project.json');
    const saved = await lastSavedJson();
    expect(saved.mode).toBe('student');
    expect(saved.settings.researchMode).toBe(false);
    expect(saved.history.map((item) => item.type)).toEqual(['lesson-plan', 'quiz']);
    expect(saved.studentProgressSummary.academic.quizAverage).toBe(100);
    expect(saved.studentProgressSummary.overview.completedActivities).toBe(1);
    expect(saved.completedActivities).toEqual([['lesson-1', 100]]);
  });

  it('preserves rich student state and honors privacy cancellation', async () => {
    window.__alloflowSelStations = [{ id: 'station-1', quests: [{ id: 'quest-1' }] }];
    window.__alloflowSelProgress = { 'station-1': { 'quest-1': { completed: true } } };
    window.__alloflowSelSnapshots = [{ id: 'reflection-1' }];

    await PhaseKHelpers.executeSaveFile(makeSaveDeps({
      saveFileName: 'rich-student.json',
      studentProjectSettings: { allowDictation: false, researchMode: true },
      adventureState: { turnCount: 2, xp: 40, gold: 5, energy: 3, level: 2, inventory: ['map'] },
      conceptMasteryLocal: { attempts: { fractions: { correct: 2 } } },
      user: { uid: 'student-1' }
    }));

    expect(downloads.at(-1).name).toBe('rich-student_CONFIDENTIAL.json');
    const saved = await lastSavedJson();
    expect(saved.settings.researchMode).toBe(true);
    expect(saved.studentProgressSummary.sel).toMatchObject({
      stationQuestsComplete: 1,
      stationQuestsTotal: 1,
      reflectionSnapshots: 1
    });
    expect(saved.conceptMastery.uid).toBe('student-1');
    expect(saved.adventureSnapshot.turnCount).toBe(2);

    confirmResult = false;
    const countBeforeCancel = downloads.length;
    await PhaseKHelpers.executeSaveFile(makeSaveDeps({ saveFileName: 'cancelled-student' }));
    expect(downloads).toHaveLength(countBeforeCancel);
  });
});

describe('Project Settings progressive disclosure', () => {
  const defaultSettings = () => ({
    hideStudentAiFeatures: false,
    allowStudentByokAi: false,
    allowDictation: true,
    allowSocraticTutor: true,
    allowFreeResponse: true,
    allowPersonaFreeResponse: true,
    nickname: '',
    baseXP: 100,
    adventureUnlockXP: 0,
    adventureMinXP: 0,
    adventurePermissions: {
      allowDifficultySwitch: true,
      allowModeSwitch: false,
      allowCustomInstructions: false,
      allowLanguageSwitch: true,
      allowVisualsToggle: true,
      allowCloudImageStorage: true,
      lockAllSettings: false
    }
  });

  const textOf = (node) => {
    if (node == null || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(textOf).join(' ');
    return textOf(node.props?.children);
  };

  const find = (node, predicate) => {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) {
      const found = find(child, predicate);
      if (found) return found;
    }
    return null;
  };

  it('renders essentials first and keeps expert controls in native details', () => {
    const props = {
      t: (key) => key,
      studentProjectSettings: defaultSettings(),
      setStudentProjectSettings() {},
      isTeacherMode: true,
      handleSetIsProjectSettingsOpenToFalse() {}
    };
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(ProjectSettingsView, props));

    expect(html).toContain('Balanced');
    expect(html).toContain('Everyday controls');
    expect(html).toContain('Hide student AI tools');
    expect(html).toContain('Allow students to connect their own AI provider');
    expect(html).toContain('<details');
    expect(html).toContain('Advanced lesson configuration');
    expect(html).toContain('Preferred name or codename');
    expect(html).toContain('Allow cloud image storage');
    expect(html).toContain('aria-pressed="true"');
  });

  it('lets teachers hide student AI tools with one project-level control', () => {
    let settings = defaultSettings();
    const tree = ProjectSettingsView({
      t: (key) => key,
      studentProjectSettings: settings,
      setStudentProjectSettings(updater) { settings = updater(settings); },
      isTeacherMode: true,
      handleSetIsProjectSettingsOpenToFalse() {}
    });
    const toggle = find(tree, (node) => node.type === 'input' && node.props.id === 'proj-hide-student-ai');

    expect(toggle).toBeTruthy();
    expect(toggle.props.checked).toBe(false);
    toggle.props.onChange({ target: { checked: true } });
    expect(settings.hideStudentAiFeatures).toBe(true);
  });

  it('keeps personal student AI off by default and requires an explicit teacher opt-in', () => {
    let settings = defaultSettings();
    const tree = ProjectSettingsView({
      t: (key) => key,
      studentProjectSettings: settings,
      setStudentProjectSettings(updater) { settings = updater(settings); },
      isTeacherMode: true,
      handleSetIsProjectSettingsOpenToFalse() {}
    });
    const toggle = find(tree, (node) => node.type === 'input' && node.props.id === 'proj-allow-student-byok-ai');

    expect(toggle).toBeTruthy();
    expect(toggle.props.checked).toBe(false);
    toggle.props.onChange({ target: { checked: true } });
    expect(settings.allowStudentByokAi).toBe(true);
    expect(settings.hideStudentAiFeatures).toBe(false);
  });

  it('applies presets without silently changing cloud-storage consent', () => {
    let settings = defaultSettings();
    const props = {
      t: (key) => key,
      studentProjectSettings: settings,
      setStudentProjectSettings(updater) { settings = updater(settings); },
      isTeacherMode: true,
      handleSetIsProjectSettingsOpenToFalse() {}
    };
    const tree = ProjectSettingsView(props);
    const guided = find(tree, (node) => node.type === 'button' && textOf(node).includes('Guided'));

    expect(guided).toBeTruthy();
    guided.props.onClick();
    expect(settings.allowFreeResponse).toBe(false);
    expect(settings.allowPersonaFreeResponse).toBe(false);
    expect(settings.adventurePermissions.lockAllSettings).toBe(true);
    expect(settings.adventurePermissions.allowCloudImageStorage).toBe(true);
  });
});
