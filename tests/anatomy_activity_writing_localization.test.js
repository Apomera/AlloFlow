import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const languages = ['french', 'spanish_latin_america', 'arabic'];
const english = {
  motion_writing_limit: '{count} / {limit} characters',
  feedback_saved_explanation_title: 'My saved explanation',
  feedback_saved_explanation_help: 'Your earlier writing is saved. Make a prediction and compare the model before revising it.'
};
const catalogs = Object.fromEntries(languages.map(language => [language, fs.readFileSync('lang/' + language + '.js', 'utf8')]));
const dictionaries = Object.fromEntries(languages.map(language => [language, JSON.parse(catalogs[language]).stem.anatomy]));
const sourceTexts = Object.fromEntries(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
const placeholders = value => [...value.matchAll(/\{[^{}]+\}/g)].map(match => match[0]).sort();
const format = (text, values) => text.replace(/\{([^{}]+)\}/g, (_, key) => String(values[key]));

beforeEach(() => { resetStemLab(); vi.useFakeTimers(); document.body.innerHTML = ''; });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('Activity writing localization catalogs', () => {
  it.each(languages)('ships the three owned labels with exact placeholders in both %s catalogs', language => {
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

function session(file, dictionary, state) {
  const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { system: 'organs', view: 'posterior', complexity: 3, _readingMode: true, ...state } };
  const setToolData = update => { data = typeof update === 'function' ? update(data) : update; };
  const t = (key, fallback) => key.startsWith('stem.anatomy.') ? dictionary[key.slice('stem.anatomy.'.length)] ?? fallback : fallback;
  const context = () => ({ toolData: data, gradeLevel: '9', setToolData, t });
  const node = predicate => { const match = find(tool.render(makeCtx(context())), predicate); expect(match).not.toBeNull(); return match; };
  return {
    html() { const host = document.createElement('div'); host.innerHTML = renderTool('anatomy', data, context()); return host; },
    compare() {
      node(element => element.type === 'input' && element.props?.name === 'anatomy-feedback-prediction' && element.props.value === 'active').props.onChange();
      node(element => element.props?.['data-anatomy-run-feedback'] === 'true').props.onClick();
    }
  };
}

for (const file of files) describe('Rendered activity writing localization: ' + file, () => {
  it.each(languages)('labels both Motion writing counters in %s larger-text mode', language => {
    const dictionary = dictionaries[language];
    const writing = { explanation: 'Heat leaves: حرارة محفوظة.', transferExplanation: 'New situation: مقارنة محفوظة.' };
    const s = session(file, dictionary, { _activeTab: 'explore', _showSystemsMotion: true, _systemsMotionScenario: 'exercise',
      _systemsMotionLearning: { exercise: writing } });
    const host = s.html();
    expect(host.querySelector('[data-anatomy-tool]').getAttribute('data-reading-mode')).toBe('true');
    const reflection = host.querySelector('[data-anatomy-motion-reflection="exercise"]'); expect(reflection).not.toBeNull();
    for (const [field, inputId, limitId] of [
      ['explanation', 'anatomy-motion-explanation', 'anatomy-motion-explanation-limit'],
      ['transferExplanation', 'anatomy-motion-transfer-explanation', 'anatomy-motion-transfer-limit']
    ]) {
      const input = reflection.querySelector('#' + inputId), counter = reflection.querySelector('[data-anatomy-motion-writing-limit="' + field + '"]');
      expect(input).not.toBeNull(); expect(counter).not.toBeNull();
      expect(input.value).toBe(writing[field]); expect(input.getAttribute('dir')).toBe('auto');
      expect(counter.id).toBe(limitId);
      expect(input.getAttribute('aria-describedby').split(/\s+/)).toContain(limitId);
      expect(counter.textContent).toBe(format(dictionary.motion_writing_limit, { count: writing[field].length, limit: 1200 }));
    }
  });

  it.each(languages)('shows the saved Homeostasis preview in %s before compare without duplicating revealed writing', language => {
    const dictionary = dictionaries[language], writing = 'Cooling explanation: التبريد يحفظ الحرارة.';
    const s = session(file, dictionary, { _activeTab: 'homeoHunt', _feedbackExperiment: { direction: 'cool', explanation: writing } });
    const host = s.html(), preview = host.querySelector('details[data-anatomy-feedback-saved-writing]'); expect(preview).not.toBeNull();
    expect(preview.querySelector('summary').textContent).toBe(dictionary.feedback_saved_explanation_title);
    expect(preview.querySelector('p').textContent).toBe(dictionary.feedback_saved_explanation_help);
    expect(preview.querySelector('p[dir="auto"]').textContent).toBe(writing);
    expect(host.querySelector('#anatomy-feedback-explanation')).toBeNull();
    s.compare();
    const revealed = s.html();
    expect(revealed.querySelector('[data-anatomy-feedback-saved-writing]')).toBeNull();
    const editor = revealed.querySelector('#anatomy-feedback-explanation'); expect(editor).not.toBeNull();
    expect(editor.value).toBe(writing); expect(editor.getAttribute('dir')).toBe('auto');
  });
});
