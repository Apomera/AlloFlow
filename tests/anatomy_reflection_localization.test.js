import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const languages = ['french', 'spanish_latin_america', 'arabic'];
const english = {
  study_reflection_unknown_title: 'Homeostasis: earlier reflection',
  study_reflection_unknown_context: 'This earlier record did not save whether the disturbance was warming or cooling. Choose the activity that matches your writing.',
  study_reflection_use_warm: 'Use for warming',
  study_reflection_use_cool: 'Use for cooling',
  study_reflection_conflict: 'This activity already has writing. Your earlier reflection is still saved in the study sheet.'
};
const catalogs = Object.fromEntries(languages.map(language => [language, fs.readFileSync('lang/' + language + '.js', 'utf8')]));
const dictionaries = Object.fromEntries(languages.map(language => [language, JSON.parse(catalogs[language]).stem.anatomy]));
const sourceTexts = Object.fromEntries(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
const placeholders = value => [...value.matchAll(/\{[^{}]+\}/g)].map(match => match[0]).sort();

beforeEach(() => { resetStemLab(); vi.useFakeTimers(); document.body.innerHTML = ''; });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('Saved reflection localization catalogs', () => {
  it.each(languages)('ships exactly the five owned labels with matching placeholders in both %s catalogs', language => {
    const mirrorText = fs.readFileSync('desktop/web-app/public/lang/' + language + '.js', 'utf8');
    expect(mirrorText).toBe(catalogs[language]);
    const mirror = JSON.parse(mirrorText).stem.anatomy;
    for (const [key, fallback] of Object.entries(english)) {
      const value = dictionaries[language][key];
      expect(typeof value, key).toBe('string'); expect(value.trim(), key).not.toBe('');
      expect(value.trim(), key).not.toBe(fallback.trim()); expect(mirror[key], key).toBe(value);
      expect(placeholders(value), key).toEqual(placeholders(fallback));
      for (const file of files) expect(sourceTexts[file], key + ' in ' + file).toContain('stem.anatomy.' + key);
    }
  });
});

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const match = find(child, predicate); if (match) return match; }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}

function session(file, dictionary, writing) {
  const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { system: 'skeletal', view: 'anterior', complexity: 3, _activeTab: 'explore', _showStudySheet: true,
    _feedbackExperiment: { direction: 'warm', explanation: writing.warm,
      sessions: { cool: { explanation: writing.cool } }, unassignedExplanation: writing.unassigned } } };
  const setToolData = update => { data = typeof update === 'function' ? update(data) : update; };
  const t = (key, fallback) => key.startsWith('stem.anatomy.') ? dictionary[key.slice('stem.anatomy.'.length)] ?? fallback : fallback;
  const context = () => ({ toolData: data, gradeLevel: '9', setToolData, t });
  return {
    html() { const host = document.createElement('div'); host.innerHTML = renderTool('anatomy', data, context()); return host; },
    use(direction) {
      const button = find(tool.render(makeCtx(context())), node =>
        node.props?.['data-anatomy-resume-reflection'] === 'homeostasis-unassigned-' + direction);
      expect(button).not.toBeNull(); button.props.onClick();
    }
  };
}

for (const file of files) describe('Rendered saved-reflection localization: ' + file, () => {
  it.each(languages)('labels both directions and earlier choices in %s while preserving mixed-language writing', language => {
    const dictionary = dictionaries[language];
    const writing = { warm: 'Warm explanation: حرارة محفوظة.', cool: 'Cool explanation: تبريد محفوظ.', unassigned: 'Earlier explanation: كتابة قديمة.' };
    const s = session(file, dictionary, writing), host = s.html();
    for (const direction of ['warm', 'cool']) {
      const article = host.querySelector('[data-anatomy-study-reflection="homeostasis-' + direction + '"]'); expect(article).not.toBeNull();
      const heading = article.querySelector('h5');
      expect(heading.id).toBe(article.getAttribute('aria-labelledby'));
      expect(heading.textContent).toBe(dictionary.study_homeostasis_reflection + ' · ' + dictionary[direction === 'warm' ? 'feedback_warming' : 'feedback_cooling']);
      expect(article.querySelector('h5 + p').textContent).toBe(dictionary[direction === 'warm' ? 'feedback_warm_mechanism' : 'feedback_cool_mechanism']);
      expect(article.querySelector('.anatomy-study-saved-text[dir="auto"]').textContent).toBe(writing[direction]);
      expect(article.querySelector('[data-anatomy-resume-reflection]').textContent).toBe(dictionary.study_reflection_resume);
    }
    const earlier = host.querySelector('[data-anatomy-study-reflection="homeostasis-unassigned"]'); expect(earlier).not.toBeNull();
    expect(earlier.querySelector('h5').textContent).toBe(dictionary.study_reflection_unknown_title);
    expect(earlier.querySelector('h5 + p').textContent).toBe(dictionary.study_reflection_unknown_context);
    expect(earlier.querySelector('.anatomy-study-saved-text[dir="auto"]').textContent).toBe(writing.unassigned);
    for (const direction of ['warm', 'cool']) {
      const choice = earlier.querySelector('[data-anatomy-resume-reflection="homeostasis-unassigned-' + direction + '"]');
      expect(choice).not.toBeNull(); expect(choice.textContent).toBe(dictionary['study_reflection_use_' + direction]);
      s.use(direction);
      const sheet = s.html().querySelector('[data-anatomy-study-sheet]');
      expect(sheet.querySelector('[data-anatomy-study-record-notice]').textContent).toBe(dictionary.study_reflection_conflict);
      expect(sheet.querySelector('[data-anatomy-study-reflection="homeostasis-unassigned"] .anatomy-study-saved-text[dir="auto"]').textContent).toBe(writing.unassigned);
    }
  });
});
