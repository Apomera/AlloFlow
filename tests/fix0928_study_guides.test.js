// 2026-09-28 Decision 2: Study Guides and Family Guides are deliverable.
//  - One eligibility rule (SessionTransport.isStudentDeliverableGuide): a
//    lesson-plan whose saved mode is study/family may go to learners; teacher
//    plans and plans with no saved mode stay teacher-only on every route.
//  - Guides travel as a learner projection with no teacher-facing parts.
//  - The STUDENT export split keeps guides and drops teacher plans.
//  - The lesson plan view renders guides read-only for students and families.
// Mutation check: point these at pre-fix copies and the matching tests fail.
//   FIX0928_ST_SRC, FIX0928_FS_SRC, FIX0928_AAC_SRC, FIX0928_DOC_MOD,
//   FIX0928_LP_MOD, FIX0928_DOCK_SRC
import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const { buildLiveAacModule } = require('../_build_live_aac_module.js');
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const read = (env, file) => fs.readFileSync(process.env[env] || file, 'utf8');
const anti = fs.readFileSync('AlloFlowANTI.txt', 'utf8');

const TEACHER_ONLY = ['lesson-plan', 'udl-advice', 'brainstorm'];
const TEACHER_TEXT = ['TEACHER_NOTES_PRIVATE', 'CUSTOM_INSTRUCTIONS_PRIVATE', 'PRIVATE_INTEREST', 'SUMMARY_PRIVATE', 'INVENTORY_PRIVATE',
  'EXTENSION_TEACHER_GUIDE', 'TEACHER_SAYS_SCRIPT', 'STATION_RATIONALE', 'UNIT_PATH_PRIVATE', 'ASSESSMENT_IDEA_PRIVATE', 'quiz-9'];
const plan = (mode, id) => ({
  id: id || 'guide-' + mode, type: 'lesson-plan', title: 'Tides ' + mode, meta: '5th Grade', timestamp: '2026-09-28T10:00:00.000Z',
  teacherNotes: 'TEACHER_NOTES_PRIVATE',
  config: { grade: '5th Grade', language: 'English', customInstructions: 'CUSTOM_INSTRUCTIONS_PRIVATE', interests: ['PRIVATE_INTEREST'],
    ...(mode ? { generationInputs: { version: 1, mode, route: 'dispatcher', summaries: [{ id: 'r1', title: 'SUMMARY_PRIVATE', kind: 'Reading' }], inventory: [{ id: 'r1', title: 'INVENTORY_PRIVATE' }] } } : {}) },
  data: {
    essentialQuestion: 'GUIDE_QUESTION ' + (mode || 'none'), objectives: ['You will explain tides'], materialsNeeded: ['Tide chart'],
    hook: 'GUIDE_HOOK', directInstruction: 'GUIDE_CORE', guidedPractice: 'GUIDE_PRACTICE', independentPractice: 'GUIDE_CHALLENGE', closure: 'GUIDE_REFLECT',
    successCriteria: [{ id: 'tides', statement: 'I can explain why tides happen.', source: 'quiz' }, 'I can read a tide chart.'], successCriteriaQuizId: 'quiz-9',
    extensions: [{ title: 'Moon watch', description: 'Track the moon for a week.', guide: 'EXTENSION_TEACHER_GUIDE' }],
    teachingScripts: [{ scope: 'lesson', steps: [{ title: 'Teacher says', script: 'TEACHER_SAYS_SCRIPT' }] }],
    recommendedStemTools: [{ id: 'astronomy', rationale: 'STATION_RATIONALE' }],
    unitPath: { nodeId: 'n1', title: 'UNIT_PATH_PRIVATE' }, assessmentIdeas: ['ASSESSMENT_IDEA_PRIVATE']
  }
});
const study = () => plan('study');
const family = () => plan('family');
const teacherPlan = () => plan('teacher', 'plan-teacher');
const legacyPlan = () => plan(null, 'plan-legacy');
const quiz = () => ({ id: 'quiz-1', type: 'quiz', title: 'Tides quiz', data: { questions: [{ type: 'mcq', question: 'Tides?', options: ['Moon', 'Wind'], correctAnswer: 'Moon' }] } });
const noTeacherText = value => { const text = JSON.stringify(value); TEACHER_TEXT.forEach(secret => expect(text).not.toContain(secret)); };

function loadLanes() {
  const win = { React: {}, AlloModules: {} };
  new Function('window', read('FIX0928_ST_SRC', 'session_transport_module.js'))(win);
  new Function('window', read('FIX0928_FS_SRC', 'firestore_sync_module.js'))(win);
  new Function('window', buildLiveAacModule(read('FIX0928_AAC_SRC', 'live_aac_source.jsx')))(win);
  const pack = (item, channel = 'student-pack') => win.AlloModules.LiveAac.serializeResourceForStudentPack(item, { sanitizeHistoryForCloud: win.sanitizeHistoryForCloud, stripUndefined: win.stripUndefined, audioChannel: channel });
  return { win, pack, ST: win.AlloModules.SessionTransport };
}
// The host's own student-safe rule (ANTI), with or without the module.
function antiRule(ST) {
  const begin = anti.indexOf('const TEACHER_ONLY_TYPES = [');
  const end = anti.indexOf('const _alloIsStudentSafeResource =', begin);
  return new Function('window', anti.slice(begin, end) + '\nreturn _alloStudentSafeResources;')({ AlloModules: ST ? { SessionTransport: ST } : {} });
}

describe('one eligibility rule: study and family guides only', () => {
  it('passes study and family guides as learner projections and blocks teacher and unlabelled plans', () => {
    const { ST } = loadLanes();
    const originals = [study(), family(), teacherPlan(), legacyPlan(), quiz()];
    const before = JSON.stringify(originals);
    const safe = ST.studentSafeResources(originals, TEACHER_ONLY);
    expect(safe.map(item => item.id)).toEqual(['guide-study', 'guide-family', 'quiz-1']);
    const [studyCopy, familyCopy] = safe;
    noTeacherText([studyCopy, familyCopy]);
    expect(studyCopy.data).toMatchObject({ essentialQuestion: 'GUIDE_QUESTION study', hook: 'GUIDE_HOOK', directInstruction: 'GUIDE_CORE', closure: 'GUIDE_REFLECT',
      objectives: ['You will explain tides'], materialsNeeded: ['Tide chart'] });
    expect(studyCopy.data.successCriteria).toEqual([{ statement: 'I can explain why tides happen.' }, 'I can read a tide chart.']);
    expect(studyCopy.data.extensions).toEqual([{ title: 'Moon watch', description: 'Track the moon for a week.' }]);
    expect(studyCopy.config).toEqual({ grade: '5th Grade', language: 'English', generationInputs: { version: 1, mode: 'study' } });
    expect(familyCopy.config.generationInputs.mode).toBe('family');
    expect(studyCopy.studentProjection).toBe(true);
    expect(JSON.stringify(originals)).toBe(before);
    expect(ST.isStudentDeliverableGuide(study())).toBe(true);
    expect(ST.isStudentDeliverableGuide(teacherPlan())).toBe(false);
    expect(ST.isStudentDeliverableGuide(legacyPlan())).toBe(false);
    // Even a caller that forgot to list lesson-plan cannot leak a teacher plan.
    expect(ST.studentSafeResources([teacherPlan(), legacyPlan()], []).length).toBe(0);
    // The receiving device filters again; a projection survives unchanged.
    expect(ST.studentSafeResources(safe, TEACHER_ONLY)).toEqual(safe);
  });

  it('the host rule uses it, and fails closed before the module loads', () => {
    const { ST } = loadLanes();
    const items = [study(), family(), teacherPlan(), legacyPlan(), quiz()];
    expect(antiRule(ST)(items).map(item => item.id)).toEqual(['guide-study', 'guide-family', 'quiz-1']);
    expect(antiRule(null)(items).map(item => item.id)).toEqual(['quiz-1']);
    const dock = read('FIX0928_DOCK_SRC', 'view_live_session_dock_source.jsx');
    expect(dock).toContain('const canPushCurrent = !!(generatedContent && generatedContent.id && _alloStudentSafeResources([generatedContent]).length > 0);');
    expect(dock).not.toContain('!TEACHER_ONLY_TYPES.includes(generatedContent.type)');
  });
});

describe('every student route carries guides and never a teacher plan', () => {
  it('live session document (Firebase lane)', async () => {
    const { win, ST } = loadLanes();
    const writes = [];
    const transport = ST.createFirebaseTransport({ teacherOnlyTypes: TEACHER_ONLY, uploadAssets: items => items,
      prepareResources: items => win.prepareSessionResourcesForWrite(items), write: payload => { writes.push(payload); } });
    await transport.publishResources([study(), family(), teacherPlan(), legacyPlan()]);
    expect(writes[0].resources.map(item => item.id)).toEqual(['guide-study', 'guide-family']);
    noTeacherText(writes[0].resources);
    expect(writes[0].resources[0].data.guidedPractice).toBe('GUIDE_PRACTICE');
  });

  it('class mailbox and hosted pack (mailbox lane)', async () => {
    const { pack, ST } = loadLanes();
    const pushed = [];
    const transport = ST.createMailboxTransport({ teacherOnlyTypes: TEACHER_ONLY, seen: {}, fingerprint: item => JSON.stringify(pack(item, 'live')), pushItem: item => { pushed.push(pack(item, 'live')); } });
    await transport.publishResources([study(), family(), teacherPlan(), legacyPlan()]);
    expect(pushed.map(item => item.id)).toEqual(['guide-study', 'guide-family']);
    noTeacherText(pushed);
  });

  it('homework QR and student pack file serialize the projection, even from a raw guide', () => {
    const { pack, ST } = loadLanes();
    for (const channel of ['qr', 'student-pack']) {
      const candidates = ST.studentSafeResources([study(), family(), teacherPlan()], TEACHER_ONLY).map(item => pack(item, channel));
      expect(candidates.map(item => item.id)).toEqual(['guide-study', 'guide-family']);
      noTeacherText(candidates);
      const direct = pack(study(), channel);
      noTeacherText(direct);
      expect(direct.data.directInstruction).toBe('GUIDE_CORE');
    }
  });

  describe('host routes (push, share pack, take-home)', () => {
    let createHostHandlers;
    beforeAll(() => {
      window.React = window.React || React;
      new Function(fs.readFileSync('host_handlers_module.js', 'utf8'))();
      createHostHandlers = window.AlloModules.createHostHandlers;
    });
    const deps = (history, generatedContent) => {
      const { ST } = loadLanes();
      const pushed = [], sent = [];
      return { pushed, sent, deps: {
        mbLive: { code: 'ROOM' }, mbConfig: { url: 'https://mailbox.example', admin: 'a' }, mbRoster: {}, history, generatedContent, sourceTopic: 'Tides',
        _alloStudentSafeResources: antiRule(ST), _mbPushOneResource: async item => { pushed.push(item); return { rtcCount: 0 }; },
        _alloMailboxCallWithRetry: async (url, payload) => { sent.push(payload); return {}; },
        requestWordSoundsAudioConfirmation: () => false, setMbBusy: () => {}, addToast: vi.fn(), warnLog: () => {}, t: key => key
      } };
    };
    it('share full pack and push send the family guide, never the teacher plan', async () => {
      const run = deps([teacherPlan(), family()], teacherPlan());
      const handlers = createHostHandlers(run.deps);
      await handlers.shareFullPackToMailbox();
      expect(run.pushed.map(item => item.id)).toEqual(['guide-family']);
      noTeacherText(run.pushed);
      run.pushed.length = 0;
      await handlers.pushResourceToMailbox(teacherPlan());
      expect(run.pushed.map(item => item.id)).toEqual(['guide-family']);
    });
    it('take-home sends when a Family Guide is the only resource', async () => {
      const run = deps([family(), teacherPlan()], family());
      await createHostHandlers(run.deps).sendPackHome();
      expect(run.sent.map(payload => payload.v && payload.v.kind)).toEqual(['takehome']);
      const none = deps([teacherPlan(), legacyPlan()], teacherPlan());
      await createHostHandlers(none.deps).sendPackHome();
      expect(none.sent).toHaveLength(0);
    });
  });
});

describe('student export keeps guides and drops teacher plans', () => {
  it('splits a pack with guides, a teacher plan and a quiz', () => {
    window.React = window.React || React;
    loadAlloModule('export_handlers_module.js');
    new Function(read('FIX0928_DOC_MOD', 'doc_pipeline_module.js'))();
    const pipeline = window.AlloModules.createDocPipeline({
      callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
      addToast: () => {}, t: key => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Lesson Plan',
      state: { currentUiLanguage: 'English', isParentMode: false, isIndependentMode: false }
    });
    const html = pipeline.generateFullPackHTML([study(), family(), teacherPlan(), legacyPlan(), quiz()], 'Tides', false, {}, { includeTeacherKey: true, includeLessonPlan: true, includeQuiz: true });
    const { studentHtml, teacherHtml } = window.AlloModules.ExportHandlers.separateStudentTeacherHtml(html);
    expect(studentHtml).toContain('GUIDE_QUESTION study');
    expect(studentHtml).toContain('GUIDE_QUESTION family');
    expect(studentHtml).toContain('GUIDE_CORE');
    expect(studentHtml).not.toContain('GUIDE_QUESTION teacher');
    expect(studentHtml).not.toContain('GUIDE_QUESTION none');
    for (const secret of ['EXTENSION_TEACHER_GUIDE', 'STATION_RATIONALE', 'ASSESSMENT_IDEA_PRIVATE']) expect(studentHtml).not.toContain(secret);
    for (const text of ['GUIDE_QUESTION teacher', 'GUIDE_QUESTION study', 'EXTENSION_TEACHER_GUIDE']) expect(teacherHtml).toContain(text);
  });
});

describe('lesson plan view: guides read-only for students and families', () => {
  let View, root, host;
  beforeAll(() => {
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    delete window.AlloModules.LessonPlanView;
    new Function(read('FIX0928_LP_MOD', 'view_lesson_plan_module.js'))();
    View = window.AlloModules.LessonPlanView;
  });
  afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; delete window.__alloCriterionRollup; });
  function render(generatedContent, extra = {}) {
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    act(() => root.render(React.createElement(View, {
      generatedContent, history: [], isTeacherMode: true, isParentMode: false, isIndependentMode: false, isEditingLessonPlan: false, t: () => '', getRows: () => 2,
      handleLessonPlanChange: vi.fn(), handleActivateNextLesson: vi.fn(), handleGenerateProgression: vi.fn(), handleGenerateExtensionGuide: vi.fn(),
      handleToggleIsEditingLessonPlan: vi.fn(), onGenerateTeachingScript: vi.fn(), teachingScriptLoadState: 'loading',
      renderFormattedText: text => text, BilingualFieldRenderer: ({ text }) => React.createElement('span', null, text), ...extra
    })));
  }
  const teacherActions = () => ({
    edit: !!host.querySelector('button[aria-pressed]'),
    progression: [...host.querySelectorAll('button[aria-busy]')].length,
    station: host.textContent.includes('Create Station'),
    extensionGuide: host.textContent.includes('EXTENSION_TEACHER_GUIDE'),
    script: !!host.querySelector('section[aria-label="Teaching script"]'),
    overview: !!host.querySelector('[data-lesson-overview]'),
    inputs: host.textContent.includes('generation time') || host.textContent.includes('Input versions'),
    criterionChip: host.textContent.includes('tides') && !!host.querySelector('span.font-mono'),
    reteach: host.textContent.includes('Reteach')
  });
  const NONE = { edit: false, progression: 0, station: false, extensionGuide: false, script: false, overview: false, inputs: false, criterionChip: false, reteach: false };

  it('a student sees the guide content and no teacher actions', () => {
    window.__alloCriterionRollup = { quizId: 'quiz-9', quizMode: 'exit-ticket', byConcept: { tides: { met: 1, partial: 0, total: 4 } } };
    render(study(), { isTeacherMode: false });
    expect(host.textContent).toContain('GUIDE_CORE');
    expect(host.textContent).toContain('I can explain why tides happen.');
    expect(teacherActions()).toEqual(NONE);
    expect(host.querySelector('[data-criterion-mastery]')).toBeNull();
  });

  it('a family (parent mode) and a delivered copy read it without editing', () => {
    render(family(), { isParentMode: true });
    expect(teacherActions()).toEqual(NONE);
    act(() => root.unmount()); root = null; host.remove();
    render({ ...study(), studentProjection: true });
    expect(teacherActions()).toEqual(NONE);
  });

  it('the planning teacher keeps every tool on a teacher plan', () => {
    render(teacherPlan());
    const actions = teacherActions();
    expect(actions.edit).toBe(true);
    expect(actions.progression).toBeGreaterThan(0);
    expect(actions.station).toBe(true);
    expect(actions.extensionGuide).toBe(true);
    expect(actions.script).toBe(true);
    expect(actions.overview).toBe(true);
  });
});
