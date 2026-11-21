import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const botSource = fs.readFileSync('allobot_source.jsx', 'utf8');
const appSource = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const uiStrings = fs.readFileSync('ui_strings.js', 'utf8');
const publicUiStrings = fs.readFileSync('desktop/web-app/public/ui_strings.js', 'utf8');
const parsedUiStrings = JSON.parse(uiStrings);
const parsedPublicUiStrings = JSON.parse(publicUiStrings);

const extractFrozenMap = (name) => {
  const match = botSource.match(new RegExp(`const ${name} = Object\\.freeze\\(\\{([\\s\\S]*?)\\n\\}\\);`));
  expect(match, `${name} should be declared as a frozen coverage map`).toBeTruthy();
  return Function(`\"use strict\"; return ({${match[1]}});`)();
};

const lookupString = (key) => key.split('.').reduce((value, part) => value?.[part], parsedUiStrings);
const lookupPublicString = (key) => key.split('.').reduce((value, part) => value?.[part], parsedPublicUiStrings);

describe('AlloBot student-facing tips', () => {
  it('passes a student-only audience flag without including parent or independent modes', () => {
    expect(appSource).toContain('isStudentMode={!isTeacherMode && !isParentMode && !isIndependentMode}');
    expect(appSource).toContain('isEducatorMode={isTeacherMode}');
  });

  it('routes resource events and idle tips through student-specific copy', () => {
    expect(botSource).toContain("if (isStudentMode) {");
    expect(botSource).toContain("bot_events.student_resource_ready");
    expect(botSource).toContain("tips.student_quiz_reasoning");
    expect(botSource).toContain("tips.student_fallback_explain");
  });

  it('uses facts from the current learner resource when they are available', () => {
    expect(botSource).toContain('const buildStudentEventTip = (latest, topic, t) =>');
    expect(botSource).toContain('const buildStudentIdleTips = ({ activeView, history, topic, t }) =>');
    expect(botSource).toContain("tips.student_glossary_term");
    expect(botSource).toContain("tips.student_concept_sort_counts");
    expect(botSource).toContain("bot_events.student_persona_ready_name");
    expect(botSource).toContain("bot_events.student_timeline_ready_count");
  });

  it('has explicit learner-safe idle coverage for every student resource family', () => {
    const idleCoverage = extractFrozenMap('STUDENT_IDLE_TIP_KEYS');
    const expectedViews = [
      'input', 'simplified', 'glossary', 'quiz', 'adventure', 'timeline', 'math', 'faq', 'outline',
      'concept-sort', 'sentence-frames', 'analysis', 'image', 'brainstorm', 'persona', 'dbq',
      'note-taking', 'anchor-chart', 'lesson-plan', 'alignment-report', 'alignment', 'gemini-bridge',
      'word-sounds', 'directions',
      'video-transcript', 'video-ref', 'readingBook', 'readingSet', 'aac-board', 'math-fluency-maze',
      'math-fluency-probe', 'fluency-record', 'manipulative-resource', 'stem-assessment',
      'explore-challenge', 'storyforge-config',
      'storyforge-submission', 'poettree-config', 'poettree-submission', 'litlab-config',
      'litlab-submission', 'lingua-config', 'lingua-submission', 'udl-advice',
    ];

    for (const view of expectedViews) {
      expect(idleCoverage[view], `${view} needs a student idle tip`).toMatch(/^tips\.student_/);
    }
  });

  it('has learner-safe event copy for generated student resource families', () => {
    const eventCoverage = extractFrozenMap('STUDENT_EVENT_TIP_KEYS');
    const expectedTypes = [
      'quiz', 'glossary', 'simplified', 'adventure', 'analysis', 'scaffolds', 'faq', 'outline',
      'brainstorm', 'concept-sort', 'math', 'persona', 'alignment-report', 'gemini-bridge', 'timeline', 'lesson-plan',
      'image', 'dbq', 'note-taking', 'anchor-chart', 'word-sounds', 'directions', 'video-transcript',
      'video-ref', 'readingBook', 'readingSet', 'aac-board', 'math-fluency-maze',
      'math-fluency-probe', 'fluency-record', 'manipulative-resource', 'stem-assessment',
      'explore-challenge', 'storyforge-config',
      'storyforge-submission', 'poettree-config', 'poettree-submission', 'litlab-config',
      'litlab-submission', 'lingua-config', 'lingua-submission', 'udl-advice',
    ];

    for (const type of expectedTypes) {
      expect(eventCoverage[type], `${type} needs a student event tip`).toMatch(/^bot_events\.student_/);
    }
  });

  it('offers multiple learning moves for every covered student view', () => {
    const baseCoverage = extractFrozenMap('STUDENT_IDLE_TIP_KEYS');
    const diverseCoverage = extractFrozenMap('STUDENT_DIVERSE_TIP_KEYS');
    expect(Object.keys(diverseCoverage).sort()).toEqual(Object.keys(baseCoverage).sort());
    for (const [view, keys] of Object.entries(diverseCoverage)) {
      expect(keys, `${view} needs multiple student coaching moves`).toHaveLength(2);
      expect(new Set(keys).size, `${view} student coaching moves should be distinct`).toBe(2);
      for (const key of keys) expect(key).toMatch(/^tips\.student_extra_/);
    }
  });

  it('provides equally broad educator idle and event coverage', () => {
    const studentIdle = extractFrozenMap('STUDENT_IDLE_TIP_KEYS');
    const educatorIdle = extractFrozenMap('EDUCATOR_IDLE_TIP_KEYS');
    const studentEvents = extractFrozenMap('STUDENT_EVENT_TIP_KEYS');
    const educatorEvents = extractFrozenMap('EDUCATOR_EVENT_TIP_KEYS');

    expect(Object.keys(educatorIdle).sort()).toEqual(Object.keys(studentIdle).sort());
    expect(Object.keys(educatorEvents).sort()).toEqual(Object.keys(studentEvents).sort());
    for (const [view, keys] of Object.entries(educatorIdle)) {
      expect(keys, `${view} needs multiple educator coaching moves`).toHaveLength(2);
      for (const key of keys) expect(key).toMatch(/^tips\.educator_/);
    }
    for (const key of Object.values(educatorEvents)) expect(key).toMatch(/^bot_events\.educator_/);
    expect(botSource).toContain('const buildEducatorEventTip = (latest, topic, t) =>');
    expect(botSource).toContain('const buildEducatorIdleTips = ({ activeView, history, topic, t }) =>');
    expect(botSource).toContain('message = buildEducatorEventTip(latest, topic, t)');
  });

  it('uses refined metadata for AAC, creative work, language practice, and fluency', () => {
    expect(botSource).toContain('const alloBotAacChoiceCount = (data) =>');
    expect(botSource).toContain("data?.practiceSet?.lesson?.vocabulary");
    expect(botSource).toContain('const alloBotLinguaLanguage = (data) =>');
    expect(botSource).toContain("bot_events.student_story_ready_words");
    expect(botSource).toContain("bot_events.educator_scaffold_ready_count");
    expect(botSource).toContain("bot_events.educator_quiz_ready_context");
    expect(botSource).toContain('const higherOrderQuestionCount = questions.filter');
    expect(botSource).toContain("tips.educator_aac_count");
    expect(botSource).toContain("tips.student_lingua_record_context");
  });

  it('remembers recently spoken tips across view and history changes', () => {
    expect(botSource).toContain('const recentTipHistoryRef = useRef([])');
    expect(botSource).toContain('const recentTips = new Set(recentTipHistoryRef.current)');
    expect(botSource).toContain('.slice(0, 10)');
  });

  it('defines every student and educator translation key in both UI string mirrors', () => {
    const referencedKeys = [...new Set(botSource.match(/(?:tips|bot_events)\.(?:student|educator)_[a-z0-9_]+/g) || [])];
    expect(referencedKeys.length).toBeGreaterThan(170);
    for (const key of referencedKeys) {
      expect(lookupString(key), `${key} needs English learner copy`).toEqual(expect.any(String));
      expect(lookupPublicString(key), `${key} needs matching public learner copy`).toBe(lookupString(key));
    }
  });

  it('sanitizes spoken resource labels and retains context-free fallbacks', () => {
    expect(botSource).toContain(".replace(/[\\u0000-\\u001f\\u007f]/g, ' ')");
    expect(botSource).toContain("return t(STUDENT_EVENT_TIP_KEYS[type] || 'bot_events.student_resource_ready')");
    expect(uiStrings).toContain('"student_recent_resource"');
    expect(uiStrings).toContain('"student_quiz_ready_count"');
  });

  it('keeps teacher-only lesson creation suggestions out of the student fallback pool', () => {
    expect(botSource).toContain("if (!envStudent && resourceCount >= 3 && !has('lesson-plan'))");
    expect(uiStrings).toContain('"student_fallback_progress"');
    expect(uiStrings).toContain('"student_study_guide_ready"');
  });

  it('reads canonical data shapes in student and educator idle tips', () => {
    const start = botSource.indexOf('const alloBotTipText =');
    const end = botSource.indexOf('const ALLOBOT_GENERATION_FAMILY_BY_TYPE =');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const { buildStudentIdleTips, buildEducatorIdleTips } = new Function(
      botSource.slice(start, end) + '\nreturn { buildStudentIdleTips, buildEducatorIdleTips };'
    )();
    const fmt = (key, params) => params ? `${key}:${JSON.stringify(params)}` : key;

    const studentTimeline = buildStudentIdleTips({
      activeView: 'timeline',
      history: [{ type: 'timeline', data: { items: [{ title: 'A' }, { title: 'B' }, { title: 'C' }] } }],
      topic: 'History',
      t: fmt,
    });
    expect(studentTimeline).toContain('tips.student_timeline_count:{"count":3}');

    const studentOutline = buildStudentIdleTips({
      activeView: 'outline',
      history: [{ type: 'outline', data: { branches: [{ title: '1' }, { title: '2' }] } }],
      topic: 'Cells',
      t: fmt,
    });
    expect(studentOutline).toContain('tips.student_outline_count:{"count":2}');

    const studentFrames = buildStudentIdleTips({
      activeView: 'sentence-frames',
      history: [{ type: 'sentence-frames', data: { items: [{ frame: 'Because...' }, { frame: 'Therefore...' }] } }],
      topic: 'Cells',
      t: fmt,
    });
    expect(studentFrames).toContain('tips.student_scaffolds_count:{"count":2}');

    const studentPersona = buildStudentIdleTips({
      activeView: 'persona',
      history: [{ type: 'persona', data: [{ name: 'Marie Curie' }] }],
      topic: 'Science',
      t: fmt,
    });
    expect(studentPersona).toContain('tips.student_persona_name:{"name":"Marie Curie"}');

    const studentNotes = buildStudentIdleTips({
      activeView: 'note-taking',
      history: [{ type: 'note-taking', data: { cues: [{ cue: 'What is osmosis?' }, { cue: 'Why does it happen?' }] } }],
      topic: 'Cells',
      t: fmt,
    });
    expect(studentNotes).toContain('tips.student_notes_count:{"count":2}');

    const studentQuiz = buildStudentIdleTips({
      activeView: 'quiz',
      history: [{ type: 'quiz', data: { questions: [{ q: '1' }], reflections: [{ prompt: 'Explain why.' }, { prompt: 'Compare.' }] } }],
      topic: 'Cells',
      t: fmt,
    });
    expect(studentQuiz).toContain('tips.student_quiz_count:{"count":3}');

    const studentSortPartial = buildStudentIdleTips({
      activeView: 'concept-sort',
      history: [{ type: 'concept-sort', data: { categories: [{ id: 'c1' }], items: [] } }],
      topic: 'Cells',
      t: fmt,
    });
    expect(studentSortPartial.some(tip => tip.startsWith('tips.student_concept_sort_counts'))).toBe(false);
    expect(studentSortPartial).toContain('tips.student_concept_sort_reason');

    const educatorQuiz = buildEducatorIdleTips({
      activeView: 'quiz',
      history: [{ type: 'quiz', data: { questions: [{ q: '1' }], reflections: [{ prompt: 'Explain.' }] } }],
      topic: 'Cells',
      t: fmt,
    });
    expect(educatorQuiz).toContain('tips.educator_quiz_count:{"count":2}');

    const educatorOutline = buildEducatorIdleTips({
      activeView: 'outline',
      title: 'Cell Outline',
      history: [{ type: 'outline', title: 'Cell Outline', data: { branches: [{ title: 'A' }, { title: 'B' }, { title: 'C' }] } }],
      topic: 'Cells',
      t: fmt,
    });
    expect(educatorOutline).toContain('tips.educator_section_count:{"count":3,"resource":"Cell Outline"}');

    const educatorSortPartial = buildEducatorIdleTips({
      activeView: 'concept-sort',
      history: [{ type: 'concept-sort', data: { categories: [{ id: 'c1' }], items: [] } }],
      topic: 'Cells',
      t: fmt,
    });
    expect(educatorSortPartial.some(tip => tip.startsWith('tips.educator_sort_counts'))).toBe(false);
  });

});
