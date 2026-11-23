import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act || require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils')).act;

const ROOT = process.cwd();
const readText = (rel) => readFileSync(resolve(ROOT, rel), 'utf8');

async function readBlobText(blob) {
  if (typeof blob?.text === 'function') return blob.text();
  return new Promise((resolveText, rejectText) => {
    const reader = new FileReader();
    reader.onload = () => resolveText(String(reader.result || ''));
    reader.onerror = () => rejectText(reader.error || new Error('Blob read failed'));
    reader.readAsText(blob);
  });
}

function createStorageMock(initial = {}) {
  const map = new Map(Object.entries(initial).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => { map.clear(); },
    key: (i) => Array.from(map.keys())[i] || null,
    get length() { return map.size; },
    _json(k) { return JSON.parse(map.get(k)); },
  };
}

describe('Pass 7 Track 1: Zero-UX Security, FERPA & Reliability Polish', () => {
  const cleanups = [];

  afterEach(() => {
    while (cleanups.length) {
      try { cleanups.pop()(); } catch (_) {}
    }
    vi.restoreAllMocks();
  });

  it('F-49: handleExportStorybook gates AI epilogue/narration approval and remote image URLs in Student Mode', async () => {
    loadAlloModule('read_aloud_artifact_contract_module.js');
    loadAlloModule('export_module.js');

    const capturedBlobs = [];
    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn((blob) => {
      capturedBlobs.push(blob);
      return `blob:test/${capturedBlobs.length}`;
    });
    URL.revokeObjectURL = vi.fn();
    cleanups.push(() => {
      URL.createObjectURL = origCreateObjectURL;
      URL.revokeObjectURL = origRevokeObjectURL;
      delete window.__alloStudentAiDisabled;
      delete window._alloQrBlocked;
      delete window.__alloAiUsable;
      delete window.callGemini;
    });

    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const prepareStorybookSummary = vi.fn(async () => ({ text: 'Should not run in student mode' }));
    const prepareReadAloudArtifactAudio = vi.fn(async () => ({ clips: {} }));
    const callGemini = vi.fn(async () => 'Educator epilogue summary.');
    window.callGemini = callGemini;
    window.__alloAiUsable = vi.fn(() => false);

    const makeLive = (overrides = {}) => ({
      isTeacherMode: false,
      isStudentMode: true,
      sourceTopic: 'Ecosystems',
      generatedContent: { id: 'res-eco-1' },
      adventureState: {
        level: 'Grade 5',
        turnCount: 2,
        imageCache: [{ imageId: 'scene-2', url: 'https://remote.example/cached.png' }],
        history: [
          { type: 'scene', text: 'Forest clearing', imageId: 'scene-remote', image: 'https://evil.example/scene.png' },
          { type: 'scene', text: 'Pond edge', imageId: 'scene-data', image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==' },
          { type: 'scene', text: 'Oak tree', imageId: 'scene-blob', image: 'blob:https://alloflow.example/local-img' },
          { type: 'scene', text: 'River bend', imageId: 'scene-hydrate' },
        ],
      },
      rehydrateHistoryWithImages: vi.fn(async (entries) => entries.map((e) => ({ ...e, image: 'https://evil.example/rehydrated.png' }))),
      parseMarkdownToHTML: (s) => s,
      prepareStorybookSummary,
      prepareReadAloudArtifactAudio,
      selectedVoice: 'Kore',
      voiceSpeed: 1,
      addToast: vi.fn(),
      t: (k, vars) => (k === 'export.storybook.page_title' ? `Storybook: ${vars?.title || ''}` : k),
      ...overrides,
    });

    const liveRef = { current: makeLive() };
    const { handleExportStorybook } = window.AlloModules.createExport({
      liveRef,
      warnLog: vi.fn(),
      debugLog: vi.fn(),
      escapeXml: (s) => String(s || ''),
      generateUUID: () => 'uuid-1',
    });

    const studentOk = await handleExportStorybook({ includeImages: true, includeNarration: true, keepModalOpen: true });
    expect(studentOk).toBe(true);
    expect(anchorClick).toHaveBeenCalledTimes(2);
    expect(prepareStorybookSummary).not.toHaveBeenCalled();
    expect(callGemini).not.toHaveBeenCalled();
    expect(prepareReadAloudArtifactAudio).toHaveBeenCalledTimes(1);
    expect(prepareReadAloudArtifactAudio.mock.calls[0][0].ownerApproved).toBe(false);

    const studentTexts = await Promise.all(capturedBlobs.map((b) => readBlobText(b)));
    const studentHtml = studentTexts.find((txt) => /<html|<!doctype/i.test(txt)) || '';
    expect(studentHtml.length).toBeGreaterThan(0);
    expect(studentHtml).not.toContain('https://evil.example/scene.png');
    expect(studentHtml).not.toContain('https://evil.example/rehydrated.png');
    expect(studentHtml).toContain('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==');
    expect(studentHtml).toContain('blob:https://alloflow.example/local-img');

    liveRef.current = makeLive({ isTeacherMode: true, isStudentMode: false });
    window.__alloAiUsable = vi.fn(() => true);
    const countBeforeTeacher = capturedBlobs.length;
    const teacherOk = await handleExportStorybook({ includeImages: true, includeNarration: false, keepModalOpen: true });
    expect(teacherOk).toBe(true);
    expect(callGemini).toHaveBeenCalledTimes(1);
    const teacherHtml = await readBlobText(capturedBlobs[countBeforeTeacher]);
    expect(teacherHtml).toContain('https://evil.example/scene.png');
    expect(teacherHtml).toContain('Educator epilogue summary.');
  });

  it('F-45: handleExportResearchJSON supports opt-in { deidentify: true } while keeping default untouched', async () => {
    loadAlloModule('identifier_redaction_module.js');
    loadAlloModule('export_module.js');

    const capturedBlobs = [];
    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn((blob) => {
      capturedBlobs.push(blob);
      return `blob:research/${capturedBlobs.length}`;
    });
    URL.revokeObjectURL = vi.fn();
    cleanups.push(() => {
      URL.createObjectURL = origCreateObjectURL;
      URL.revokeObjectURL = origRevokeObjectURL;
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const probeHistory = {
      'Maya Lin': [{ wpm: 112, studentName: 'Maya Lin', notes: 'Maya Lin emailed maya@school.edu or 555-234-5678, SSN 123-45-6789' }],
      'Jordan Lee': [{ wpm: 98, studentName: 'Jordan Lee' }],
    };
    const externalCBMScores = {
      'Maya Lin': [{ score: 88, studentId: 'STU-44' }],
    };
    const interventionLogs = {
      'Maya Lin': [{ tier: 2, parentEmail: 'parent@example.org', note: 'Parent call for Maya Lin at 207-555-0199' }],
    };
    const surveyResponses = [
      { studentName: 'Maya Lin', email: 'maya@school.edu', guardianEmail: 'g@example.com', comment: 'Maya Lin enjoyed partner reading' },
      { studentName: 'Jordan Lee', phone: '555-999-1111', comment: 'Jordan Lee wants audio support' },
    ];
    const fidelityLog = [
      { studentId: 'STU-44', codename: 'Maya Lin', teacherEmail: 't@school.edu', observerNote: 'Observed Maya Lin and STU-44 on task' },
    ];

    const liveRef = {
      current: {
        probeHistory,
        surveyResponses,
        fidelityLog,
        sessionCounter: 4,
        externalCBMScores,
        interventionLogs,
        history: [],
        addToast: vi.fn(),
        t: (k) => k,
      },
    };

    const { handleExportResearchJSON } = window.AlloModules.createExport({
      liveRef,
      warnLog: vi.fn(),
      debugLog: vi.fn(),
      escapeXml: (s) => String(s || ''),
      generateUUID: () => 'uuid-2',
    });

    handleExportResearchJSON();
    const rawJson = JSON.parse(await capturedBlobs[0].text());
    expect(rawJson.deidentified).toBeUndefined();
    expect(rawJson.probeHistory['Maya Lin']).toBeDefined();
    expect(rawJson.surveyResponses[0].email).toBe('maya@school.edu');

    handleExportResearchJSON({ deidentify: true });
    const safeText = await capturedBlobs[1].text();
    const safeJson = JSON.parse(safeText);
    expect(safeJson.deidentified).toBe(true);
    expect(safeJson.deidentificationPolicy).toBe('ferpa-99.31b-study-bundle');

    const probeKeys = Object.keys(safeJson.probeHistory);
    expect(probeKeys).toEqual(['participant_001', 'participant_002']);
    expect(Object.keys(safeJson.externalCBMScores)).toEqual(['participant_001']);
    expect(Object.keys(safeJson.interventionLogs)).toEqual(['participant_001']);

    expect(safeJson.surveyResponses[0].studentName).toBe('participant_001');
    expect(safeJson.surveyResponses[0].email).toBeUndefined();
    expect(safeJson.surveyResponses[0].guardianEmail).toBeUndefined();
    expect(safeJson.surveyResponses[1].studentName).toBe('participant_002');
    expect(safeJson.surveyResponses[1].phone).toBeUndefined();
    expect(safeJson.interventionLogs.participant_001[0].parentEmail).toBeUndefined();
    expect(safeJson.fidelityLog[0].teacherEmail).toBeUndefined();

    expect(safeText).not.toContain('Maya Lin');
    expect(safeText).not.toContain('Jordan Lee');
    expect(safeText).not.toContain('STU-44');
    expect(safeText).not.toContain('maya@school.edu');
    expect(safeText).not.toContain('555-234-5678');
    expect(safeText).not.toContain('207-555-0199');
    expect(safeText).not.toContain('123-45-6789');

    expect(probeHistory['Maya Lin'][0].studentName).toBe('Maya Lin');
    expect(surveyResponses[0].email).toBe('maya@school.edu');
  });

  it('F-02: BlueprintPreview passes blueprintPreview.html through window.sanitizeHtml in source, module mirrors, and live render', () => {
    for (const rel of [
      'view_misc_modals_source.jsx',
      'view_misc_modals_module.js',
      'desktop/web-app/public/view_misc_modals_module.js',
      'desktop/app-build/view_misc_modals_module.js',
      'desktop/web-app/build/view_misc_modals_module.js',
    ]) {
      const code = readText(rel);
      expect(code, rel).toMatch(/window\.sanitizeHtml\s*\(\s*blueprintPreview\.html/);
    }

    const origActEnv = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const origAlloModules = window.AlloModules;
    window.React = React;
    window.AlloModules = {};
    const LucideStub = () => null;
    const iconNames = ['ArrowRight', 'ChevronDown', 'ChevronRight', 'Cpu', 'Eye', 'Headphones', 'HelpCircle', 'ImageIcon', 'Maximize', 'Minimize', 'RefreshCw', 'Save', 'Search', 'Send', 'ShieldCheck', 'Unplug', 'X'];
    const savedGlobals = {};
    for (const name of iconNames) {
      savedGlobals[name] = window[name];
      window[name] = LucideStub;
    }
    window.lucideReact = window.lucideReact || new Proxy({}, { get: () => LucideStub });
    window.useFocusTrap = () => {};
    cleanups.push(() => {
      globalThis.IS_REACT_ACT_ENVIRONMENT = origActEnv;
      for (const name of iconNames) {
        if (savedGlobals[name] === undefined) delete window[name];
        else window[name] = savedGlobals[name];
      }
      delete window.sanitizeHtml;
      window.AlloModules = origAlloModules;
    });

    loadAlloModule('view_misc_modals_module.js');
    const UDLGuideModal = window.AlloModules.UDLGuideModal;
    expect(typeof UDLGuideModal).toBe('function');

    const sanitizeSpy = vi.fn((html) => String(html).replace(/<script[\s\S]*?<\/script>/gi, ''));
    window.sanitizeHtml = sanitizeSpy;

    const props = {
      showUDLGuide: true,
      blueprintPreview: {
        title: 'XSS Check Preview',
        html: '<p>Safe content</p><script>window.__xssFired = true;</script>',
      },
      closeBlueprintPreview: vi.fn(),
      chatStyles: { modal: '', header: '', text: '', subText: '', inputArea: '', input: '', button: '', primaryButton: '', secondaryButton: '' },
      filteredResources: [],
      udlMessages: [],
      archivedPlans: [],
      lessonTemplates: [],
      suggestedStandards: [],
      aiStandardQuery: '',
      aiStandardRegion: '',
      standardsInput: '',
      udlStandardFramework: 'Common Core ELA',
      udlStandardGrade: '5th Grade',
      addToast: vi.fn(),
      t: (k) => k,
      theme: 'light',
      handleFindStandards: vi.fn(),
      handleAutoFillToggle: vi.fn(),
      handleSetShowUDLGuideToFalse: vi.fn(),
      setAiStandardQuery: vi.fn(),
      setAiStandardRegion: vi.fn(),
      setStandardsInput: vi.fn(),
      setUdlStandardFramework: vi.fn(),
      setUdlStandardGrade: vi.fn(),
      setIsConversationMode: vi.fn(),
      setIsDictationMode: vi.fn(),
      setUdlInput: vi.fn(),
      setUdlMessages: vi.fn(),
      handleSendUDLMessage: vi.fn(),
      udlInput: '',
      udlInputRef: { current: null },
      udlScrollRef: { current: null },
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(React.createElement(UDLGuideModal, props));
    });
    cleanups.push(() => {
      act(() => root.unmount());
      container.remove();
    });

    expect(sanitizeSpy).toHaveBeenCalledWith('<p>Safe content</p><script>window.__xssFired = true;</script>');
    const body = container.querySelector('[data-testid="bp-preview-body"]');
    expect(body).not.toBeNull();
    expect(body.innerHTML).toContain('<p>Safe content</p>');
    expect(body.innerHTML).not.toContain('<script>');
  });

  it('coordgrid: uses deterministic recursive-descent math parser with zero new Function/eval and accurate evaluation', () => {
    for (const rel of [
      'stem_lab/stem_tool_coordgrid.js',
      'desktop/web-app/public/stem_lab/stem_tool_coordgrid.js',
      'desktop/app-build/stem_lab/stem_tool_coordgrid.js',
      'desktop/web-app/build/stem_lab/stem_tool_coordgrid.js',
    ]) {
      const code = readText(rel);
      expect(code, rel).not.toMatch(/\bnew\s+Function\b/);
      expect(code, rel).not.toMatch(/\beval\s*\(/);
    }

    delete window.StemLab;
    delete window._coordGridFnCache;
    cleanups.push(() => {
      delete window.StemLab;
      delete window._coordGridFnCache;
    });

    loadAlloModule('stem_lab/stem_tool_coordgrid.js');
    expect(window.StemLab && window.StemLab.isRegistered('coordinate')).toBe(true);

    const deepParens = '('.repeat(70) + 'x' + ')'.repeat(70);
    const exprs = [
      '2x^2 - 3x + 1',
      '(x+1)(x-1)',
      '2(x+3)^2',
      '-x^2',
      '((x+1)*2)-3',
      '1/(x-2)',
      '0/0',
      '1/x',
      deepParens,
      'x + alert(1)',
    ];

    const iconStub = () => null;
    const iconsProxy = new Proxy({}, { get: () => iconStub });
    const alertSpy = vi.fn();
    window.alert = alertSpy;
    cleanups.push(() => { delete window.alert; });

    const cgContainer = document.createElement('div');
    document.body.appendChild(cgContainer);
    const cgRoot = createRoot(cgContainer);
    const origAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const CoordHarness = () => window.StemLab.renderTool('coordinate', {
      React,
      icons: iconsProxy,
      t: (_k, fb) => fb || _k,
      gradeLevel: 8,
      addToast: vi.fn(),
      awardXP: vi.fn(),
      announceToSR: vi.fn(),
      setStemLabTool: vi.fn(),
      setToolData: vi.fn(),
      toolData: {
        _coordGrid: {
          cgTab: 'explore',
          funcsOn: true,
          funcs: exprs.map((expr, idx) => ({ id: `f-${idx}`, expr, visible: true })),
        },
      },
    });
    act(() => {
      cgRoot.render(React.createElement(CoordHarness));
    });
    cleanups.push(() => {
      globalThis.IS_REACT_ACT_ENVIRONMENT = origAct;
      act(() => cgRoot.unmount());
      cgContainer.remove();
    });

    const fnMap = window._coordGridFnCache && window._coordGridFnCache.map;
    expect(fnMap).toBeTruthy();

    expect(fnMap['2x^2 - 3x + 1'](0)).toBe(1);
    expect(fnMap['2x^2 - 3x + 1'](2)).toBe(3);
    expect(fnMap['2x^2 - 3x + 1'](-1)).toBe(6);

    expect(fnMap['(x+1)(x-1)'](3)).toBe(8);
    expect(fnMap['(x+1)(x-1)'](0)).toBe(-1);

    expect(fnMap['2(x+3)^2'](-1)).toBe(8);
    expect(fnMap['-x^2'](3)).toBe(-9);
    expect(fnMap['-x^2'](-3)).toBe(-9);
    expect(fnMap['((x+1)*2)-3'](4)).toBe(7);

    expect(fnMap['1/(x-2)'](0)).toBe(-0.5);
    expect(Number.isFinite(fnMap['1/(x-2)'](2))).toBe(false);

    expect(fnMap['0/0']).toBeNull();
    expect(typeof fnMap['1/x']).toBe('function');
    expect(Number.isFinite(fnMap['1/x'](0))).toBe(false);
    expect(fnMap['1/x'](2)).toBe(0.5);

    expect(fnMap[deepParens]).toBeNull();
    expect(fnMap['x + alert(1)'](4)).toBe(5);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('F-06: purgeRemovedStudentLocalStores clears all 5 per-student local stores without harming other students or classes', () => {
    window.React = React;
    loadAlloModule('teacher_module.js');

    const internals = window.AlloModules && window.AlloModules.TeacherPrivateLabelInternals;
    expect(typeof internals?.purgeRemovedStudentLocalStores).toBe('function');

    const classKeyA = internals.classKey({ classId: 'cls-a', className: 'Period 1' });
    const classKeyB = internals.classKey({ classId: 'cls-b', className: 'Period 2' });

    const storage = createStorageMock({
      alloflow_teacher_private_labels: {
        version: 1,
        byClass: {
          [classKeyA]: { 'Blue Owl': 'Maya Lin', 'Red Fox': 'Jordan Lee' },
          [classKeyB]: { 'Blue Owl': 'Samir Patel' },
        },
      },
      allo_cico_cards_v1: {
        version: 1,
        classes: {
          'cls-a': {
            settings: { periods: ['Period 1'], expectations: ['Be safe'], goalPct: 80 },
            students: {
              'lrn-1': { enrolledAt: 1000, days: { '2026-11-10': { ratings: { '0:0': 2 }, checkIn: true } } },
              'lrn-2': { enrolledAt: 1000, days: { '2026-11-10': { ratings: { '0:0': 1 }, checkIn: true } } },
            },
          },
          'cls-b': {
            settings: { periods: ['Period 2'], expectations: ['Be safe'], goalPct: 80 },
            students: {
              'lrn-9': { enrolledAt: 1000, days: { '2026-11-10': { ratings: { '0:0': 2 }, checkIn: true } } },
            },
          },
        },
      },
      allo_school_rewards_recognition_log_v1: {
        sessions: {
          'daily-goal-2026-11-10': {
            rows: {
              'Blue Owl': {
                ids: ['daily-goal:cls-a:lrn-1:2026-11-10', 'daily-goal:cls-b:lrn-9:2026-11-10'],
                reasons: { 'Individual goal progress': 2 },
                lastAt: 1000,
              },
              'Red Fox': {
                ids: ['daily-goal:cls-a:lrn-2:2026-11-10'],
                reasons: { 'Individual goal progress': 1 },
                lastAt: 1000,
              },
            },
            updatedAt: 1000,
          },
          'live-session-1': {
            rows: {
              'Blue Owl': { ids: ['live-token-1'], reasons: { Focus: 1 }, lastAt: 1000 },
              'Red Fox': { ids: ['live-token-2'], reasons: { Focus: 1 }, lastAt: 1000 },
            },
            updatedAt: 1000,
          },
        },
      },
      allo_teacher_comments: [
        ['Blue Owl:res-1', [{ id: 'c1', text: 'Great effort' }]],
        ['lrn-1:res-2', [{ id: 'c2', text: 'Follow-up note' }]],
        ['Red Fox:res-1', [{ id: 'c3', text: 'Keep going' }]],
      ],
      alloflow_offline_grades: {
        'Blue Owl|Quiz 1|1000': {
          nickname: 'Blue Owl',
          className: 'Period 1',
          identity: { classId: 'cls-a', learnerId: 'lrn-1' },
        },
        'Blue Owl|Quiz 1|2000': {
          nickname: 'Blue Owl',
          className: 'Period 2',
          identity: { classId: 'cls-b', learnerId: 'lrn-9' },
        },
        'Red Fox|Quiz 1|1000': {
          nickname: 'Red Fox',
          className: 'Period 1',
          identity: { classId: 'cls-a', learnerId: 'lrn-2' },
        },
      },
    });

    const result = internals.purgeRemovedStudentLocalStores({
      codename: 'Blue Owl',
      learnerId: 'lrn-1',
      classId: 'cls-a',
      className: 'Period 1',
      privateLabelClassKey: classKeyA,
      storage,
    });

    expect(result.changedKeys).toEqual(
      expect.arrayContaining([
        'alloflow_teacher_private_labels',
        'allo_cico_cards_v1',
        'allo_school_rewards_recognition_log_v1',
        'allo_teacher_comments',
        'alloflow_offline_grades',
      ])
    );

    const labels = storage._json('alloflow_teacher_private_labels');
    expect(labels.byClass[classKeyA]['Blue Owl']).toBeUndefined();
    expect(labels.byClass[classKeyA]['Red Fox']).toBe('Jordan Lee');
    expect(labels.byClass[classKeyB]['Blue Owl']).toBe('Samir Patel');

    const cico = storage._json('allo_cico_cards_v1');
    expect(cico.classes['cls-a'].students['lrn-1']).toBeUndefined();
    expect(cico.classes['cls-a'].students['lrn-2']).toBeDefined();
    expect(cico.classes['cls-b'].students['lrn-9']).toBeDefined();

    const recog = storage._json('allo_school_rewards_recognition_log_v1');
    expect(recog.sessions['daily-goal-2026-11-10'].rows['Blue Owl'].ids).toEqual(['daily-goal:cls-b:lrn-9:2026-11-10']);
    expect(recog.sessions['daily-goal-2026-11-10'].rows['Red Fox']).toBeDefined();
    expect(recog.sessions['live-session-1'].rows['Blue Owl']).toBeUndefined();
    expect(recog.sessions['live-session-1'].rows['Red Fox']).toBeDefined();

    const comments = storage._json('allo_teacher_comments');
    expect(comments.map(([k]) => k)).toEqual(['Red Fox:res-1']);

    const grades = storage._json('alloflow_offline_grades');
    expect(grades['Blue Owl|Quiz 1|1000']).toBeUndefined();
    expect(grades['Blue Owl|Quiz 1|2000']).toBeDefined();
    expect(grades['Red Fox|Quiz 1|1000']).toBeDefined();
  });
});
