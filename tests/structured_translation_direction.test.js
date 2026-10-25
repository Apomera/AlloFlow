import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { transformSync } = require('@babel/core');
const { act } = React;
let quiz, root, host, originalExtras;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = {};
  originalExtras = window.AlloModules.ModuleScopeExtras;
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('view_faq_module.js');
  loadAlloModule('view_timeline_module.js');
  const code = transformSync(readFileSync('view_quiz_source.jsx', 'utf8'), {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
    parserOpts: { sourceType: 'script', plugins: ['jsx'] }, compact: false
  }).code;
  quiz = new Function('window', 'React', code + '\nreturn { QuizTranslationContext, AssessmentQuestionSupport, AssessmentChoiceContent, AssessmentPairSide };')(window, React);
});
beforeEach(() => {
  window.AlloModules.ModuleScopeExtras = {
    getSpeechLangCode: language => ({ Arabic: 'ar', Hebrew: 'he', English: 'en-US', Spanish: 'es' })[language] || language,
    getContentDirection: language => /^(Arabic|Hebrew|ar|he)(?:-|$)/i.test(language) ? 'rtl' : 'ltr'
  };
});
afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove(); root = host = null;
  window.AlloModules.ModuleScopeExtras = originalExtras;
});

const artifact = target => ({ id: 'saved', type: 'quiz', config: { language: 'Spanish', translationPolicy: { enabled: true, target, mode: 'auto' } } });
const attrs = item => window.AlloModules.TextPipelineHelpers.getArtifactTranslationTextAttributes(item);
const t = key => key;
function mount(element, direction = 'ltr') {
  host = document.createElement('div'); host.dir = direction; document.body.append(host); root = createRoot(host);
  act(() => root.render(element));
}
function expectDirection(element, language, direction) {
  expect(element).toBeTruthy();
  expect(element.getAttribute('lang')).toBe(language);
  expect(element.getAttribute('dir')).toBe(direction);
  expect(element.style.textAlign).toBe('start');
}

describe('saved companion language attributes', () => {
  it('uses saved policy metadata ahead of other destinations', () => {
    const item = { ...artifact('Arabic'), translationTarget: 'English', currentUiLanguage: 'Spanish', translationMode: 'off' };
    expect(attrs(item)).toMatchObject({ lang: 'ar', dir: 'rtl' });
    item.currentUiLanguage = 'English'; item.translationMode = 'Spanish';
    expect(attrs(item)).toMatchObject({ lang: 'ar', dir: 'rtl' });
  });

  it('keeps a legacy English companion LTR even when the primary is RTL', () => {
    expect(attrs({ config: { language: 'Arabic' } })).toMatchObject({ lang: 'en-US', dir: 'ltr' });
  });

  it('recognizes RTL destinations before optional language helpers are available', () => {
    delete window.AlloModules.ModuleScopeExtras;
    expect(attrs(artifact('Arabic'))).toMatchObject({ lang: 'ar', dir: 'rtl' });
    expect(attrs(artifact('he-IL'))).toMatchObject({ lang: 'he-IL', dir: 'rtl' });
    expect(attrs(artifact('Twi'))).toMatchObject({ lang: 'Twi', dir: 'ltr' });
    expect(attrs(artifact('Custom language'))).toMatchObject({ lang: 'und', dir: 'auto' });
  });
});

describe('structured companion fields render with their own language and direction', () => {
  it('marks FAQ companion questions, answers and editor fields without changing primary text', () => {
    const item = { ...artifact('Arabic'), type: 'faq', data: [{ question: 'Primary question?', answer: 'Primary answer.', question_en: 'سؤال', answer_en: 'إجابة' }] };
    const props = { t, generatedContent: item, splitTextToSentences: text => [text], formatInteractiveText: text => text,
      isTeacherMode: false, isEditingFaq: false, handleFaqChange: () => {}, getRows: () => 2 };
    mount(React.createElement(window.AlloModules.FaqView, props));
    act(() => host.querySelector('[data-faq-toggle-all]').click());
    const companions = [...host.querySelectorAll('p[lang="ar"]')];
    expect(companions).toHaveLength(2);
    companions.forEach(element => expectDirection(element, 'ar', 'rtl'));
    expect(host.querySelector('h4').hasAttribute('dir')).toBe(false);
    act(() => root.render(React.createElement(window.AlloModules.FaqView, { ...props, isEditingFaq: true })));
    const translatedEditors = [...host.querySelectorAll('textarea[lang="ar"]')];
    expect(translatedEditors).toHaveLength(2);
    translatedEditors.forEach(element => expectDirection(element, 'ar', 'rtl'));
  });

  it('marks timeline label and event companions while preserving the primary direction', () => {
    const item = { ...artifact('Hebrew'), type: 'timeline', data: { progressionLabel: 'Order', mode: 'chronological', items: [{ date: 'First', event: 'Primary event', date_en: 'ראשון', event_en: 'אירוע' }] } };
    const props = { t, generatedContent: item, isTeacherMode: false, isIndependentMode: true, isEditingTimeline: false, isTimelineGame: false,
      TIMELINE_MODE_DEFINITIONS: { chronological: { label: 'Chronological' } }, dismissedVerifications: {}, timelineImageSize: 96,
      timelineRefinementInputs: {}, isGeneratingTimelineImage: {}, handleTimelineChange: () => {} };
    mount(React.createElement(window.AlloModules.TimelineView, props));
    const companions = [...host.querySelectorAll('[lang="he"]')];
    expect(companions).toHaveLength(2);
    companions.forEach(element => expectDirection(element, 'he', 'rtl'));
    const primary = [...host.querySelectorAll('p')].find(element => element.textContent === 'Primary event');
    expect(primary.hasAttribute('dir')).toBe(false);
    act(() => root.render(React.createElement(window.AlloModules.TimelineView, { ...props, isEditingTimeline: true })));
    const editors = [...host.querySelectorAll('input[lang="he"]')];
    expect(editors).toHaveLength(2);
    editors.forEach(element => expectDirection(element, 'he', 'rtl'));
  });

  it.each(['Arabic', 'English'])('marks quiz questions, option translations and matching pairs for saved %s', target => {
    const saved = artifact(target);
    const q = { question: 'Primary question', question_en: 'Companion question', options: ['Primary option'], options_en: ['Companion option'], pairs: [{ left: 'Primary pair', left_en: 'Companion pair' }] };
    mount(React.createElement(quiz.QuizTranslationContext.Provider, { value: attrs(saved) },
      React.createElement(React.Fragment, null,
        React.createElement(quiz.AssessmentQuestionSupport, { q }),
        React.createElement(quiz.AssessmentChoiceContent, { q, field: 'options', index: 0 }),
        React.createElement(quiz.AssessmentPairSide, { q, index: 0, side: 'left' }))), target === 'Arabic' ? 'ltr' : 'rtl');
    const language = target === 'Arabic' ? 'ar' : 'en-US', direction = target === 'Arabic' ? 'rtl' : 'ltr';
    const companions = [...host.querySelectorAll('[lang]')];
    expect(companions).toHaveLength(3);
    companions.forEach(element => expectDirection(element, language, direction));
    const primary = [...host.querySelectorAll('span')].find(element => element.textContent === 'Primary option');
    expect(primary.hasAttribute('dir')).toBe(false);
  });
});
