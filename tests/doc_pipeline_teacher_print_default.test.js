import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

const labels = {
  'export.student_copy': 'Student resources: ',
  'export.teacher_copy': 'Teacher resources: ',
  'lesson_plan.extensions_header': 'Extensions',
  'lesson_plan.materials_header': 'Materials Needed',
  'lesson_plan.assessment_header': 'Assessment',
  'lesson_plan.activities_header': 'Activities',
};
const teacherConfig = { audience: 'teacher', includeTeacherKey: false, includeLessonPlan: true };
const fields = ['hook', 'directInstruction', 'guidedPractice', 'independentPractice', 'closure'];

beforeAll(() => {
  window.React = window.React || {};
  loadAlloModule('doc_pipeline_module.js');
});

function plan(id = 'generic-teacher-plan', mode = 'teacher') {
  return {
    id, type: 'lesson-plan', title: 'Explaining a community decision', meta: 'Independent teaching example',
    ...(mode ? { config: { generationInputs: { mode }, language: 'English' } } : {}),
    data: {
      essentialQuestion: 'How can we explain and reconsider a decision?',
      objectives: ['Connect a reason to relevant evidence.'],
      materialsNeeded: ['One case sheet and a familiar recording method.'],
      ...Object.fromEntries(fields.map(field => [field, `Saved ${field} narrative with a meaningful teaching action.`])),
      activities: [{ name: 'Actual exchange', description: 'Receive an idea, check its meaning, then reply.', duration: '8 minutes' }],
      assessmentIdeas: ['Look for an actual response to another idea.'],
      extensions: [],
    },
  };
}

function render(items, { config = teacherConfig, worksheet = false, state = {}, translator = key => labels[key] || key } = {}) {
  const pipeline = window.AlloModules.createDocPipeline({
    addToast: () => {}, t: translator,
    isRtlLang: language => /^(Arabic|Hebrew|Farsi|Urdu)$/i.test(language),
    updateExportPreview: () => {}, getDefaultTitle: () => 'Resource',
    state: { currentUiLanguage: 'English', leveledTextLanguage: 'English', ...state },
  });
  const html = pipeline.generateFullPackHTML(items, 'A generic teaching guide', worksheet, {}, config);
  return { html, document: new DOMParser().parseFromString(html, 'text/html') };
}

describe('shared default teacher-guide printing', () => {
  it('gives a generic teacher plan the shared compact print scope without catalog-specific CSS or pack metadata', () => {
    const resource = plan(), before = structuredClone(resource);
    const { document, html } = render([resource]);
    expect(document.body.getAttribute('data-alloflow-teacher-print')).toBe('compact');
    const rendered = document.querySelector('.alloflow-teacher-plan');
    expect(rendered).not.toBeNull();
    expect(rendered.querySelector('.alloflow-plan-body')).not.toBeNull();
    expect(rendered.querySelector('.alloflow-plan-practice-grid')).not.toBeNull();
    expect(rendered.querySelector('.alloflow-plan-assessment')).not.toBeNull();
    expect(document.querySelector('.export-title').textContent).toContain('Teacher resources:');
    expect(document.querySelector('.export-title').textContent).not.toContain('Student resources:');
    expect(document.querySelector('a[href="#main-export-content"]')).not.toBeNull();
    expect(document.querySelector('main#main-export-content')).not.toBeNull();
    expect(html).toContain('@media print');
    expect(html).toContain('.alloflow-teacher-plan');
    expect(resource).toEqual(before);
  });

  it('preserves every saved teaching field, actual extension and source link while omitting an empty Extensions box', () => {
    const resource = plan();
    resource.data.closure += '\n\nRead the [original source](https://example.org/teaching-source).';
    const before = structuredClone(resource);
    const root = render([resource]).document.querySelector('.alloflow-teacher-plan');
    for (const field of fields) expect(root.textContent).toContain(`Saved ${field} narrative`);
    for (const text of [...resource.data.objectives, ...resource.data.materialsNeeded, ...resource.data.assessmentIdeas]) expect(root.textContent).toContain(text);
    expect(root.textContent).toContain('Actual exchange');
    expect(root.textContent).toContain(resource.data.activities[0].description);
    expect(root.querySelector('a[href="https://example.org/teaching-source"]')).not.toBeNull();
    expect([...root.querySelectorAll('h2,h3,h4,h5')].some(node => node.textContent.trim() === 'Extensions')).toBe(false);
    expect(resource).toEqual(before);

    const extended = structuredClone(resource);
    extended.data.extensions = [{ title: 'Stretch task', description: 'Apply the same reasoning to another case.', guide: 'Keep the original response available.' }];
    const next = render([extended]).document.querySelector('.alloflow-teacher-plan');
    expect(next.textContent).toContain('Stretch task');
    expect(next.textContent).toContain(extended.data.extensions[0].description);
    expect(next.textContent).toContain(extended.data.extensions[0].guide);
  });

  it('uses a readable teacher heading when an older translator echoes an unknown key', () => {
    const { document } = render([plan()], { translator: key => key });
    expect(document.body.getAttribute('data-alloflow-teacher-print')).toBe('compact');
    expect(document.querySelector('.export-title').textContent).toBe('Teacher resources: A generic teaching guide');
    expect(document.querySelector('.export-title').textContent).not.toContain('export.teacher_copy');
  });

  it('uses teacher document defaults for multiple teacher guides, including legacy unclassified plans', () => {
    const { document } = render([plan('first'), plan('legacy', null)]);
    expect(document.body.getAttribute('data-alloflow-teacher-print')).toBe('compact');
    expect(document.querySelectorAll('.alloflow-teacher-plan')).toHaveLength(2);
    expect(document.querySelectorAll('[data-alloflow-resource-id]')).toHaveLength(2);
    expect(document.querySelector('.teacher-view')).toBeNull();
  });

  it('does not add pupil identification fields when a teacher-only guide is requested through the worksheet path', () => {
    const { document } = render([plan('first'), plan('second')], { worksheet: true });
    expect(document.body.getAttribute('data-alloflow-teacher-print')).toBe('compact');
    expect(document.querySelector('.worksheet-header')).toBeNull();
    expect(document.querySelector('.alloflow-worksheet-continuation')).toBeNull();
    expect(document.querySelectorAll('.alloflow-teacher-plan')).toHaveLength(2);
  });

  it.each(['study', 'family'])('does not apply teacher-only paper defaults to a %s guide', mode => {
    const resource = plan('learner-guide', mode);
    const { document } = render([resource]);
    expect(document.body.hasAttribute('data-alloflow-teacher-print')).toBe(false);
    expect(document.querySelector('.alloflow-teacher-plan')).toBeNull();
    expect(document.querySelector('.export-title').textContent).toContain('Student resources:');
    expect(document.querySelector('[data-alloflow-resource-id="learner-guide"]')).not.toBeNull();
  });

  it('does not mark a learner projection of a teacher plan as full teacher narrative', () => {
    const { document } = render([plan()], { config: { includeLessonPlan: true, includeTeacherKey: false } });
    expect(document.body.hasAttribute('data-alloflow-teacher-print')).toBe(false);
    expect(document.querySelector('.alloflow-teacher-plan')).toBeNull();
    expect(document.body.textContent).not.toContain('Saved hook narrative');
    expect(document.body.textContent).toContain('Connect a reason to relevant evidence.');
  });

  it('keeps mixed student resources outside the teacher-plan print scope', () => {
    const worksheet = { id: 'student-questions', type: 'quiz', title: 'Explain a reason', data: { questions: [{ type: 'short-answer', question: 'Which fact supports the choice?', expectedAnswer: 'A relevant fact with its connection.' }], reflections: [] } };
    const before = structuredClone(worksheet);
    const { document } = render([plan(), worksheet]);
    expect(document.body.hasAttribute('data-alloflow-teacher-print')).toBe(false);
    expect(document.querySelectorAll('.alloflow-teacher-plan')).toHaveLength(1);
    const student = document.querySelector('[data-alloflow-resource-id="student-questions"]');
    expect(student).not.toBeNull();
    expect(student.closest('.alloflow-teacher-plan')).toBeNull();
    expect(student.querySelector('.alloflow-teacher-plan')).toBeNull();
    expect(student.textContent).toContain(worksheet.data.questions[0].question);
    expect(worksheet).toEqual(before);
  });

  it('keeps the teacher answer-key appendix separate from compact document defaults', () => {
    const quiz = { id: 'check', type: 'quiz', title: 'Check the evidence', data: { questions: [{ type: 'mcq', question: 'Which response uses evidence?', options: ['A fact with a reason', 'A louder reply'], correctAnswer: 'A fact with a reason' }], reflections: [] } };
    const { document } = render([plan(), quiz], { config: { ...teacherConfig, includeTeacherKey: true } });
    expect(document.body.hasAttribute('data-alloflow-teacher-print')).toBe(false);
    const key = document.querySelector('.teacher-view');
    expect(key).not.toBeNull();
    expect(key.querySelector('[data-alloflow-resource-id="check"]')).not.toBeNull();
    expect(key.querySelector('[data-alloflow-resource-id="check"]').closest('.alloflow-teacher-plan')).toBeNull();
    expect(key.textContent).toContain('A fact with a reason');
  });

  it('retains a larger caller font size and right-to-left saved source/translation directions', () => {
    const resource = plan();
    resource.config.language = 'Arabic'; resource.config.translationTarget = 'English';
    resource.data.hook = 'فكرة تستند إلى دليل.\n--- ENGLISH TRANSLATION ---\nAn idea supported by evidence.';
    const before = structuredClone(resource);
    const { document, html } = render([resource], { config: { ...teacherConfig, fontSize: 24 }, state: { leveledTextLanguage: 'Arabic' } });
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(document.querySelector('.alloflow-teacher-plan .lesson-plan-source').getAttribute('dir')).toBe('rtl');
    expect(document.querySelector('.alloflow-teacher-plan .lesson-plan-translation').getAttribute('dir')).toBe('ltr');
    expect(document.body.textContent).toContain('فكرة تستند إلى دليل.');
    expect(document.body.textContent).toContain('An idea supported by evidence.');
    expect(html).toMatch(/body\s*\{[^}]*font-size:\s*24px/);
    expect(resource).toEqual(before);
  });

  it('continues to honor enabled reading settings over the builder font size', () => {
    const previousLibrary = window.AlloModules.UIFontLibrary, previousSettings = window.__alloReadingSettings;
    window.AlloModules.UIFontLibrary = {
      readingSettingsAvailable: () => true,
      readerExportCss: () => 'html:not([data-rt-custom]) body { font-size: 30px; line-height: 2; }',
    };
    window.__alloReadingSettings = { get: () => ({ fontId: 'default', baseFontSize: 30 }) };
    try {
      const { document, html } = render([plan()], { config: { ...teacherConfig, fontSize: 16, useReadingSettings: true } });
      expect(document.body.getAttribute('data-alloflow-teacher-print')).toBe('compact');
      expect(html).toMatch(/body\s*\{[^}]*font-size:\s*30px/);
      expect(html).toContain('html:not([data-rt-custom]) body { font-size: 30px; line-height: 2; }');
    } finally {
      window.AlloModules.UIFontLibrary = previousLibrary;
      window.__alloReadingSettings = previousSettings;
    }
  });
});
