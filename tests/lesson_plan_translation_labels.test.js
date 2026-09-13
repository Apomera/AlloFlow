import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

const delimiter = '--- ENGLISH TRANSLATION ---';
const fields = ['essentialQuestion', 'hook', 'directInstruction', 'guidedPractice', 'independentPractice', 'closure'];
const translator = key => ({
  'output.translation_block': 'Traduction',
  'output.translation_into': 'Traduction ({language})',
  'output.english_translation': 'Traduction anglaise'
}[key] || key);
let exportsApi;
beforeAll(() => {
  window.React = window.React || {};
  loadAlloModule('export_handlers_module.js');
  loadAlloModule('doc_pipeline_module.js');
  exportsApi = window.AlloModules.ExportHandlers;
});
function plan(config = { language: 'Spanish', translationTarget: 'French' }) {
  const bilingual = key => 'Fuente ' + key + '\n' + delimiter + '\nTraduction ' + key;
  const data = Object.fromEntries(fields.map(key => [key, bilingual(key)]));
  data.objectives = [bilingual('objective')];
  data.materialsNeeded = [bilingual('material')];
  data.extensions = [{ title: bilingual('extension title'), description: bilingual('extension description'), guide: bilingual('guide') }];
  data.activities = [{ name: bilingual('legacy title'), description: bilingual('legacy description'), duration: '5 minutes' }];
  data.assessmentIdeas = [bilingual('assessment')];
  return { id: 'saved-bilingual-plan', type: 'lesson-plan', title: 'Saved lesson', config, data };
}
function render(resource, t = translator) {
  const prepared = exportsApi.prepareLessonPlanExport(resource);
  const pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t, isRtlLang: language => /^(?:Arabic|Hebrew|Farsi|Urdu)$/i.test(language),
    updateExportPreview: () => {}, getDefaultTitle: () => 'Lesson Plan',
    // The current workspace deliberately disagrees with every saved fixture.
    state: { currentUiLanguage: 'English', leveledTextLanguage: 'Hebrew', translationTarget: 'German', translationMode: 'off', isParentMode: false, isIndependentMode: false }
  });
  const html = pipeline.generateFullPackHTML([prepared.resource], prepared.topic, false, {}, {
    includeLessonPlan: true, includeTeacherKey: false, assessmentMode: false, includeStudentResponses: false, annotations: []
  });
  return new DOMParser().parseFromString(html, 'text/html').getElementById(resource.id);
}
const translations = root => [...root.querySelectorAll('.lesson-plan-translation')];
const labels = root => [...root.querySelectorAll('.lesson-plan-translation-label')].map(node => node.textContent.trim());

describe('saved lesson translation labels and direction in the real print pipeline', () => {
  it('uses the recorded French target and preserves both languages in every native and legacy section', () => {
    const resource = plan(), original = structuredClone(resource), root = render(resource);
    for (const key of [...fields, 'objective', 'material', 'extension title', 'extension description', 'guide', 'legacy title', 'legacy description', 'assessment']) {
      expect(root.textContent).toContain('Fuente ' + key);
      expect(root.textContent).toContain('Traduction ' + key);
    }
    expect(labels(root).filter(label => label === 'Traduction (French)')).toHaveLength(13);
    expect(labels(root).filter(label => label === 'Traduction')).toHaveLength(1);
    expect(root.textContent).not.toContain('English Translation');
    expect(root.textContent).not.toContain('German');
    expect(translations(root).filter(node => node.getAttribute('dir') === 'ltr')).toHaveLength(13);
    expect(resource).toEqual(original);
  });

  it('prints recorded English translations left to right while preserving an Arabic source direction', () => {
    const root = render(plan({ language: 'Arabic', translationTarget: 'English' }));
    expect(labels(root).filter(label => label === 'Traduction anglaise')).toHaveLength(13);
    for (const node of translations(root).filter(node => !/Traduction guide\s*$/.test(node.textContent))) expect(node.getAttribute('dir')).toBe('ltr');
    expect([...root.querySelectorAll('.lesson-plan-source')].filter(node => node.getAttribute('dir') === 'rtl')).toHaveLength(13);
  });

  it('prints a recorded Arabic translation right to left independently of the source or current settings', () => {
    const root = render(plan({ language: 'French', translationTarget: 'Arabic' }));
    expect(labels(root).filter(label => label === 'Traduction (Arabic)')).toHaveLength(13);
    expect(translations(root).filter(node => node.getAttribute('dir') === 'rtl')).toHaveLength(13);
    expect([...root.querySelectorAll('.lesson-plan-source')].filter(node => node.getAttribute('dir') === 'ltr')).toHaveLength(13);
  });

  it.each([undefined, null, '', 'auto', { target: 'French' }])('uses a localized neutral label and automatic direction when saved target metadata is %j', target => {
    const root = render(plan({ translationTarget: target, translationMode: 'French', currentUiLanguage: 'French' }));
    expect(new Set(labels(root))).toEqual(new Set(['Traduction']));
    for (const node of [...translations(root), ...root.querySelectorAll('.lesson-plan-source')]) expect(node.getAttribute('dir')).toBe('auto');
    expect(root.textContent).toContain('Traduction directInstruction');
  });

  it('does not borrow the plan language for independently generated guides without language metadata', () => {
    const root = render(plan({ language: 'Arabic', translationTarget: 'English' }));
    const guide = translations(root).find(node => /Traduction guide\s*$/.test(node.textContent));
    expect(guide.getAttribute('dir')).toBe('auto');
    expect(guide.querySelector('.lesson-plan-translation-label').textContent.trim()).toBe('Traduction');
    expect(guide.previousElementSibling.getAttribute('dir')).toBe('auto');
  });

  it('keeps all text after an additional delimiter in an edited field', () => {
    const resource = plan();
    resource.data.hook += '\n' + delimiter + '\nAdditional saved paragraph';
    const root = render(resource);
    expect(root.textContent).toContain('Fuente hook');
    expect(root.textContent).toContain('Traduction hook');
    expect(root.textContent).toContain('Additional saved paragraph');
  });

  it('uses readable fallback labels when translations are unavailable and escapes saved label text', () => {
    const resource = plan({ language: 'Spanish', translationTarget: 'French <img src=x onerror=alert(1)>' });
    const root = render(resource, key => key);
    expect(labels(root)[0]).toBe('Translation (French <img src=x onerror=alert(1)>)');
    expect(root.querySelector('.lesson-plan-translation-label img')).toBeNull();
    expect(labels(root)).toContain('Translation');
  });

  it('keeps a single-language field and guide complete without adding translation blocks', () => {
    const resource = plan();
    resource.data.hook = 'Single-language hook';
    resource.data.extensions[0].guide = 'Single-language guide';
    const root = render(resource);
    expect(root.textContent).toContain('Single-language hook');
    expect(root.textContent).toContain('Single-language guide');
    expect(translations(root)).toHaveLength(12);
  });
});
