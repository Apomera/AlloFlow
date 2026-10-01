import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const languages = ['french', 'spanish_latin_america', 'arabic'];
const english = {
  study_return_rounds_title: 'Saved review rounds',
  study_return_resume: 'Resume saved round',
  study_return_help: 'Resume keeps your place. Refresh round starts with your latest ratings. Your notes and ratings stay saved.',
  study_return_filter_scope: 'These filters apply to recorded structures. Saved activity writing appears below.',
  study_return_copy_working: 'Copying study sheet…',
  study_return_copy_interrupted: 'Copy stopped. Try again or download the text.',
  study_return_reflections_only: 'No recorded structures yet. Your saved activity writing appears below.',
  study_return_structures_title: 'Recorded structures'
};
const catalogs = Object.fromEntries(languages.map(language => [language, fs.readFileSync('lang/' + language + '.js', 'utf8')]));
const dictionaries = Object.fromEntries(languages.map(language => [language, JSON.parse(catalogs[language]).stem.anatomy]));
const sourceTexts = Object.fromEntries(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
const placeholders = value => [...value.matchAll(/\{[^{}]+\}/g)].map(match => match[0]).sort();
let clipboardDescriptor;

beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); document.body.innerHTML = '';
  clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
});
afterEach(() => {
  if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
  else delete navigator.clipboard;
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = '';
});

describe('Study return localization catalogs', () => {
  it.each(languages)('ships the eight owned labels with exact placeholders in both %s catalogs', language => {
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
function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node !== 'object') return String(node);
  return Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children);
}
function session(file, dictionary, state = {}) {
  const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { system: 'skeletal', view: 'anterior', complexity: 3, _activeTab: 'explore',
    _showStudySheet: true, _readingMode: true, ...state } };
  const setToolData = update => { data = typeof update === 'function' ? update(data) : update; };
  const t = (key, fallback) => key.startsWith('stem.anatomy.') ? dictionary[key.slice('stem.anatomy.'.length)] ?? fallback : fallback;
  const context = () => ({ toolData: data, gradeLevel: '9', setToolData, t });
  const node = predicate => { const match = find(tool.render(makeCtx(context())), predicate); expect(match).not.toBeNull(); return match; };
  return {
    patch(patch) { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
    data() { return data.anatomy; },
    language(next) { dictionary = next; },
    html() { const host = document.createElement('div'); host.innerHTML = renderTool('anatomy', data, context()); return host; },
    show(open) {
      node(element => element.type === 'button' && (open ? element.props?.['data-anatomy-study-toggle'] === true :
        element.props?.['aria-label'] === dictionary.study_sheet_close)).props.onClick();
    },
    due() { node(element => element.type === 'button' && text(element).startsWith(dictionary.flashcard_due + ' (')).props.onClick(); },
    key(key) {
      const card = node(element => !!element.props?.['data-anatomy-recall-card']), target = {};
      card.props.onKeyDown({ key, target, currentTarget: target, preventDefault() {}, stopPropagation() {} });
    },
    copy() { node(element => element.props?.['data-anatomy-study-copy'] === true).props.onClick(); }
  };
}

for (const file of files) describe('Rendered study return localization: ' + file, () => {
  it.each(languages)('labels a saved round in %s even when structure filters hide its collection', language => {
    const dictionary = dictionaries[language], now = Date.now();
    const s = session(file, dictionary, { _activeTab: 'flashcards', _showStudySheet: false,
      _structureConfidence: { ribs: 'practice', skull: 'mastered' },
      _confidenceAt: { ribs: now, skull: now - 10 * 86400000 } });
    s.due(); s.key(' '); s.key('2'); s.key('ArrowRight');
    s.patch({ _activeTab: 'explore', _showStudySheet: true, _studySheetFilter: 'notes', _studySheetSystem: 'muscular',
      _structureConfidence: { ribs: 'learning', skull: 'learning' }, _confidenceAt: { ribs: now, skull: now } });
    const host = s.html(), region = host.querySelector('[data-anatomy-study-rounds]'); expect(region).not.toBeNull();
    const heading = region.querySelector('h4');
    expect(region.getAttribute('aria-labelledby')).toBe(heading.id); expect(heading.textContent).toBe(dictionary.study_return_rounds_title);
    expect(region.querySelector('h4 + p').textContent).toBe(dictionary.study_return_help);
    const article = region.querySelector('[data-anatomy-study-round="skeletal"]'); expect(article).not.toBeNull();
    expect(article.getAttribute('aria-labelledby')).toBe(article.querySelector('h5').id);
    expect(article.querySelector('[data-anatomy-study-resume-round]').textContent).toBe(dictionary.study_return_resume);
    expect(article.querySelector('[data-anatomy-study-refresh-round]').textContent).toBe(dictionary.flashcard_refresh);
    for (const [hook, prefix, fraction] of [
      ['position', dictionary.card_flow_position, '2 / 2'], ['rated', dictionary.flashcard_rated_round, '1 / 2']
    ]) {
      const line = article.querySelector('[data-anatomy-study-round-' + hook + ']');
      expect(line.textContent).toContain(prefix); expect(line.querySelector('bdi[dir="ltr"]').textContent).toBe(fraction);
    }
    expect(host.querySelector('[data-anatomy-study-filter-scope]').textContent).toBe(dictionary.study_return_filter_scope);
    expect(host.querySelector('[data-anatomy-study-structures-title]').textContent).toBe(dictionary.study_return_structures_title);
    expect(host.querySelector('[data-anatomy-study-structures-empty="filtered"]').textContent).toBe(dictionary.study_ref_filter_empty);
  });

  it.each(languages)('describes reflection-only saved work truthfully in %s and preserves mixed-language writing', language => {
    const dictionary = dictionaries[language], writing = 'My cooling explanation: تبريد محفوظ.';
    const s = session(file, dictionary, { _feedbackExperiment: { direction: 'cool', explanation: writing } });
    const host = s.html(), sheet = host.querySelector('[data-anatomy-study-sheet]'); expect(sheet).not.toBeNull();
    expect(sheet.querySelector('[data-anatomy-study-structures-title]').textContent).toBe(dictionary.study_return_structures_title);
    expect(sheet.querySelector('[data-anatomy-study-filter-scope]').textContent).toBe(dictionary.study_return_filter_scope);
    expect(sheet.querySelector('[data-anatomy-study-structures-empty="reflection"]').textContent).toBe(dictionary.study_return_reflections_only);
    expect(sheet.querySelector('[data-anatomy-study-structures-empty="empty"]')).toBeNull();
    expect(sheet.textContent).not.toContain(dictionary.study_sheet_empty);
    expect(sheet.querySelector('[data-anatomy-study-reflection="homeostasis-cool"] .anatomy-study-saved-text[dir="auto"]').textContent).toBe(writing);
  });

  it.each(languages)('labels a live and an interrupted clipboard request in %s', language => {
    const dictionary = dictionaries[language], writeText = vi.fn(() => new Promise(() => {}));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const s = session(file, dictionary, { _structureNotes: { skull: 'Fresh saved note: كتابة محفوظة.' } });
    s.copy(); expect(writeText).toHaveBeenCalledOnce();
    const busy = s.html().querySelector('[data-anatomy-study-copy]'); expect(busy).not.toBeNull();
    expect(busy.disabled).toBe(true); expect(busy.getAttribute('aria-busy')).toBe('true');
    expect(busy.textContent).toBe(dictionary.study_return_copy_working);
    const interrupted = session(file, dictionary, { _studyCopyToken: 'interrupted-copy', _studyRecordNotice: dictionary.study_return_copy_working }).html();
    expect(interrupted.querySelector('[data-anatomy-study-record-notice]').textContent).toBe(dictionary.study_return_copy_interrupted);
    const retry = interrupted.querySelector('[data-anatomy-study-copy]'); expect(retry.disabled).toBe(false);
    expect(retry.getAttribute('aria-busy')).toBe('false'); expect(retry.textContent).toBe(dictionary.study_sheet_copy);
  });

  it('clears an orphaned busy notice after a language change and close/reopen', () => {
    const initial = dictionaries.french, next = dictionaries.arabic;
    const s = session(file, initial, { _studyCopyToken: 'orphaned-french-copy', _studyRecordNotice: initial.study_return_copy_working });
    expect(s.html().querySelector('[data-anatomy-study-record-notice]').textContent).toBe(initial.study_return_copy_interrupted);
    s.language(next);
    expect(s.html().querySelector('[data-anatomy-study-record-notice]').textContent).toBe(next.study_return_copy_interrupted);
    s.show(false);
    expect(s.data()._showStudySheet).toBe(false); expect(s.data()._studyCopyToken).toBeNull();
    expect(s.data()._studyRecordNotice).toBe('');
    s.show(true);
    const sheet = s.html().querySelector('[data-anatomy-study-sheet]'); expect(sheet).not.toBeNull();
    expect(sheet.querySelector('[data-anatomy-study-record-notice]').textContent).toBe('');
    const copy = sheet.querySelector('[data-anatomy-study-copy]'); expect(copy).not.toBeNull();
    expect(copy.disabled).toBe(false); expect(copy.getAttribute('aria-busy')).toBe('false');
    expect(copy.textContent).toBe(next.study_sheet_copy); expect(sheet.textContent).not.toContain(initial.study_return_copy_working);
  });
});
