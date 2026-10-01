import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const languages = ['french', 'spanish_latin_america', 'arabic'];
const english = {
  activity_switch_saved_quiz: 'Question {number} is saved',
  activity_switch_saved_help: 'Your answer and score are kept while you use other activities. Return whenever you are ready.'
};
const catalogs = Object.fromEntries(languages.map(language => [language, fs.readFileSync('lang/' + language + '.js', 'utf8')]));
const dictionaries = Object.fromEntries(languages.map(language => [language, JSON.parse(catalogs[language]).stem.anatomy]));
const placeholders = value => [...value.matchAll(/\{[^{}]+\}/g)].map(match => match[0]).sort();
const format = (value, fields) => value.replace(/\{([a-z]+)\}/g, (match, key) => fields[key] ?? match);
const clone = value => JSON.parse(JSON.stringify(value));
const checkpoint = state => clone(Object.fromEntries(['quizIdx', 'quizScore', '_quizAttempts', '_quizQuestion', 'quizFeedback',
  '_structureConfidence', '_confidenceAt', '_structureNotes', '_aiInput', '_systemsMotionLearning'].map(key => [key, state[key]])));
const otherActivities = ['explore', 'tour', 'connections', 'aiTutor', 'spotter', 'pathways', 'flashcards', 'homeoHunt', 'imaging', 'procedure'];

beforeEach(() => { resetStemLab(); vi.useFakeTimers(); document.body.innerHTML = ''; });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('Saved Quiz return localization catalogs', () => {
  it.each(languages)('keeps the two %s labels translated with exact placeholders in both catalogs', language => {
    const mirror = fs.readFileSync('desktop/web-app/public/lang/' + language + '.js', 'utf8');
    expect(mirror).toBe(catalogs[language]);
    for (const [key, fallback] of Object.entries(english)) {
      const value = dictionaries[language][key]; expect(typeof value, key).toBe('string');
      expect(value.trim(), key).not.toBe(''); expect(value.trim(), key).not.toBe(fallback);
      expect(placeholders(value), key).toEqual(placeholders(fallback));
      expect(JSON.parse(mirror).stem.anatomy[key], key).toBe(value);
    }
  });
});

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const match = find(child, predicate); if (match) return match; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function session(file, dictionary) {
  const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { system: 'skeletal', view: 'anterior', complexity: 3, _activeTab: 'quiz', quizMode: true,
    quizIdx: 12, quizScore: 4, _quizAttempts: 6, _readingMode: true,
    _structureNotes: { ribs: 'My saved note: كتابة محفوظة.' }, _aiInput: 'My saved Tutor question.',
    _systemsMotionLearning: { exercise: { explanation: 'My comparison: مقارنة محفوظة.' } } } };
  const setToolData = update => { data = typeof update === 'function' ? update(data) : update; };
  const t = (key, fallback) => key.startsWith('stem.anatomy.') ? dictionary[key.slice('stem.anatomy.'.length)] ?? fallback : fallback;
  const ctx = () => ({ toolData: data, gradeLevel: '9', setToolData, t });
  const tree = () => tool.render(makeCtx(ctx()));
  const node = predicate => { const match = find(tree(), predicate); expect(match).not.toBeNull(); return match; };
  return {
    data: () => data.anatomy,
    patch(patch) { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
    captureQuestion() { node(element => !!element.props?.['data-anatomy-quiz-panel']).ref({}); },
    answer() { node(element => element.props?.['data-anatomy-quiz-option'] === data.anatomy._quizQuestion.structureId).props.onClick(); },
    html() { const host = document.createElement('div'); host.innerHTML = renderTool('anatomy', data, ctx()); return host; },
    switchActivity(activity) { node(element => element.type === 'button' && element.props?.id === 'anatomy-mode-tab-' + activity).props.onClick(); },
    returnToQuiz() {
      const strip = node(element => element.props?.['data-anatomy-quiz-return'] !== undefined);
      const button = find(strip, element => element.type === 'button'); expect(button).not.toBeNull(); button.props.onClick();
    }
  };
}

for (const file of files) describe('Rendered saved Quiz return localization: ' + file, () => {
  it.each(languages)('labels saved Question 13 across every other activity in %s and returns to its answer and score', language => {
    const dictionary = dictionaries[language], s = session(file, dictionary); s.captureQuestion(); s.answer(); s.switchActivity('explore');
    const saved = checkpoint(s.data());
    for (const activity of otherActivities) {
      s.patch({ _activeTab: activity, quizMode: false });
      const strip = s.html().querySelector('[data-anatomy-quiz-return]'); expect(strip, activity).not.toBeNull();
      expect(strip.querySelector('[data-anatomy-quiz-return-title]').textContent, activity).toBe(format(dictionary.activity_switch_saved_quiz, { number: 13 }));
      expect(strip.querySelector('[data-anatomy-quiz-return-help]').textContent, activity).toBe(dictionary.activity_switch_saved_help);
      expect(strip.querySelector('button').textContent, activity).toBe(format(dictionary.quiz_flow_return, { number: 13 }));
      expect(checkpoint(s.data()), activity).toEqual(saved);
    }
    s.returnToQuiz(); expect(s.data()._activeTab).toBe('quiz'); expect(checkpoint(s.data())).toEqual(saved);
    const quiz = s.html().querySelector('[data-anatomy-quiz-panel]'); expect(quiz).not.toBeNull();
    expect(quiz.querySelector('[data-anatomy-quiz-feedback]')).not.toBeNull();
    expect(quiz.querySelector('[data-anatomy-quiz-score]').textContent).toContain(format(dictionary.quiz_flow_score, { correct: 5, attempts: 7 }));
    expect(s.html().querySelector('[data-anatomy-quiz-return]')).toBeNull();
  });

  it.each(languages)('avoids claiming a saved return for missing or malformed checkpoints in %s', language => {
    const dictionary = dictionaries[language], s = session(file, dictionary); s.captureQuestion();
    const question = clone(s.data()._quizQuestion);
    s.patch({ _activeTab: 'connections', quizMode: false, _quizQuestion: null, quizFeedback: null });
    expect(s.html().querySelector('[data-anatomy-quiz-return]')).toBeNull();
    s.patch({ _quizQuestion: { ...question, poolIds: ['forged-structure'] } });
    expect(s.html().querySelector('[data-anatomy-quiz-return]')).toBeNull();
  });
});
