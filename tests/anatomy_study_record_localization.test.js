import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const languages = ['french', 'spanish_latin_america', 'arabic'];
const english = {
  study_flow_import_title: 'Study record preview',
  study_flow_import_file: 'Selected file: ',
  study_flow_import_reading: 'Reading study record…',
  study_flow_import_canceled: 'Import canceled. Choose another study record to continue.',
  study_flow_error_schema: 'Choose a version 1 Anatomy study record exported by this tool.',
  study_flow_error_duplicate: 'Each structure must appear only once in the study record.',
  study_flow_error_record: 'A structure record has an invalid rating, date, or note.',
  study_flow_error_recall: 'A structure record has invalid scored-practice counts.',
  study_flow_error_no_match: 'No structures in this file match the Anatomy catalog.',
  study_flow_error_learning_notes: 'The study record has invalid activity explanations.',
  study_flow_error_unknown: 'This file could not be imported. Choose an Anatomy study record exported by this tool.',
  study_download_ready: 'Study download prepared. Keep the JSON record to resume your structure notes and ratings later.',
  study_download_failed: 'Download could not start. Please try again.',
  study_import_size: 'Import failed: the file is larger than 1 MB.',
  study_import_preview_ready: 'Preview ready. Review the counts, then merge to add this work.',
  study_import_failed: 'Import failed. ',
  study_import_read_failed: 'Import failed: the file could not be read.',
  study_merge_done: 'Study record merged. Structures imported: ',
  study_merge_notes_kept: 'Existing notes preserved: ',
  study_download_text: 'Download text',
  study_download_record: 'Download study record',
  study_import_title: 'Resume from a study record',
  study_import_help: 'Import structure notes, ratings, and review dates from a JSON record. Existing notes are kept when both records have writing; the newer dated rating wins. Your current grade, quiz, and display settings stay in place.',
  study_import_file: 'Choose Anatomy study record (.json)',
  study_import_cancel: 'Cancel import',
  study_import_structures: 'recognized structures',
  study_import_ratings: 'ratings',
  study_import_notes: 'notes',
  study_import_skipped: 'unrecognized structures skipped',
  study_import_merge: 'Merge study record',
  study_invalid_json: 'This file is not valid JSON.',
  study_sheet_next: 'Next step: ',
  viewed: 'viewed',
  in_my_words: 'In my words: ',
  study_sheet_empty: 'Nothing recorded yet. Open structures, rate them, and write notes to fill this sheet.',
  study_sheet_copied_sr: 'Study sheet copied to the clipboard.',
  study_copy_failed: 'Clipboard unavailable. Use Download text to keep your study sheet.',
  study_sheet_print_blocked: 'Printing is not available here. Use Copy as text instead.',
  study_sheet_opened: 'Study sheet opened. Print it or copy it as text.',
  study_sheet_kicker: 'Take it with you',
  study_sheet_title: '📄 My anatomy study sheet',
  study_sheet_sub: 'Built from what you viewed, rated, missed, and wrote in your own words.',
  study_sheet_print: '🖨 Print / save as PDF',
  study_sheet_copy: '📋 Copy as text',
  study_sheet_close: 'Close study sheet',
  close: 'Close',
  study_filter_focus: 'Show',
  study_sheet_due: '⏰ Re-check today: ',
  study_open_structure: 'Study on diagram: ',
  study_sheet_stale_prefix: 'rated ',
  a_while_ago: 'a while ago',
  days_ago_suffix: ' day(s) ago',
  study_sheet_stale_suffix: ' · re-check',
  study_filter_all: 'All recorded structures',
  study_filter_review: 'Needs review',
  study_filter_notes: 'With notes',
  study_filter_mastered: 'Got it',
  study_flow_next_tour_title: 'Take the guided tour',
  study_flow_next_tour_detail: 'Build a structure-to-function map before testing recall.',
  study_flow_next_review_title: 'Review {structure}',
  study_flow_next_review_detail: 'Structures marked for review in this view: {count}.',
  study_flow_next_unseen_title: 'Discover {structure}',
  study_flow_next_unseen_detail: 'Unexplored structures in this view: {count}.',
  study_flow_next_cards_title: 'Check your recall',
  study_flow_next_cards_detail: 'Use flashcards and rate your confidence to build a focused review list.',
  study_flow_next_quiz_title: 'Test what you know',
  study_flow_next_quiz_detail: 'Mix function, system, true/false, and clinical recall questions.',
  study_flow_next_spotter_title: 'Practice visual identification',
  study_flow_next_spotter_detail: 'Use the Spotter to transfer recall to the body diagram.',
  study_flow_activity_exercise_title: 'Exercise: force to gas exchange',
  study_flow_activity_meal_title: 'After a meal: absorption to delivery',
  study_flow_activity_wound_title: 'Wound repair: perfusion to rebuilding',
  study_flow_activity_fluid_title: 'Fluid balance: perfusion to concentration'
};
const catalogs = Object.fromEntries(languages.map(language => [language, fs.readFileSync('lang/' + language + '.js', 'utf8')]));
const dictionaries = Object.fromEntries(languages.map(language => [language, JSON.parse(catalogs[language]).stem.anatomy]));
const sourceTexts = Object.fromEntries(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
const dynamicFilterKeys = ['study_filter_all', 'study_filter_review', 'study_filter_notes', 'study_filter_mastered'];
function sheetReferences(source) {
  const start = source.indexOf('var showStudySheet ='), end = source.indexOf('function renderTourRecap()', start);
  if (start < 0 || end < start) throw new Error('Study-sheet source boundary is missing.');
  const component = source.slice(start, end);
  return [...new Set([...component.matchAll(/t\(\s*['"]stem\.anatomy\.([^'"]+)['"]/g)]
    .map(match => match[1]).filter(key => key !== 'study_filter_').concat(dynamicFilterKeys))];
}
const placeholders = value => [...value.matchAll(/\{[^{}]+\}/g)].map(match => match[0]).sort();
const row = { id: 'skull', viewed: true, confidence: null, ratedAt: null, note: '' };
const packet = records => ({ schema: 'alloflow-anatomy-study', version: 1, records });
const errors = [
  ['schema', () => ({ ...packet([row]), version: 2 })],
  ['duplicate', () => packet([row, row])],
  ['record', () => packet([{ ...row, note: {} }])],
  ['recall', () => packet([{ ...row, recall: { attempts: 1, correct: 2 } }])],
  ['no_match', () => packet([{ ...row, id: 'not-in-anatomy-catalog' }])],
  ['learning_notes', () => ({ ...packet([row]), learningNotes: {} })],
  ['unknown', null]
];

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const match = find(child, predicate); if (match) return match; }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}

let readers;
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); document.body.innerHTML = ''; readers = [];
  vi.stubGlobal('FileReader', class {
    constructor() { readers.push(this); }
    readAsText() {}
    fail() { this.onerror?.({ target: this }); }
    finish(value) {
      this.result = typeof value === 'string' ? value : JSON.stringify(value);
      this.onload?.({ target: this });
    }
  });
  const NativeURL = URL;
  vi.stubGlobal('URL', class extends NativeURL {
    static createObjectURL = vi.fn(() => 'blob:anatomy-localization');
    static revokeObjectURL = vi.fn();
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = '';
});

function session(file, dictionary, extra = {}) {
  const tool = loadTool(file, 'anatomy'); let mounted;
  let data = { anatomy: { system: 'skeletal', view: 'anterior', complexity: 3, selectedStructure: 'skull',
    _activeTab: 'explore', _showStudySheet: true, ...extra } };
  const setToolData = update => { data = typeof update === 'function' ? update(data) : update; };
  const t = (key, fallback) => key.startsWith('stem.anatomy.') ? dictionary[key.slice('stem.anatomy.'.length)] ?? fallback : fallback;
  const context = () => ({ toolData: data, gradeLevel: '9', setToolData, t });
  const node = predicate => {
    const match = find(tool.render(makeCtx(context())), predicate);
    expect(match).not.toBeNull(); return match;
  };
  const html = () => {
    const host = document.createElement('div'); host.innerHTML = renderTool('anatomy', data, context()); return host;
  };
  return {
    html,
    patch(patch) { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
    choose(name, size = 100) {
      // Keep the connected chooser across reads, as React retains this input after Cancel.
      if (!mounted) { mounted = html(); document.body.appendChild(mounted); }
      const input = mounted.querySelector('#anatomy-study-import-file'); expect(input).not.toBeNull();
      Object.defineProperty(input, 'files', { configurable: true, value: [{ name, size }] });
      const previousReaders = readers.length;
      node(element => element.props?.id === 'anatomy-study-import-file').props.onChange({ currentTarget: input });
      if (size <= 1000000) expect(readers).toHaveLength(previousReaders + 1);
      return readers.length > previousReaders ? readers.at(-1) : null;
    },
    cancel() { node(element => element.props?.['data-anatomy-study-import-cancel']).props.onClick(); },
    merge() { node(element => element.props?.['data-anatomy-study-import-merge']).props.onClick(); },
    download(format) { node(element => element.props?.['data-anatomy-study-export'] === format).props.onClick(); }
  };
}

// Limit catalog coverage to the exact 73 labels owned by this study-record pass.
describe('Study record localization catalogs', () => {
  it.each(languages)('ships all 73 owned labels and exact placeholders in both %s catalogs', language => {
    const mirrorText = fs.readFileSync('desktop/web-app/public/lang/' + language + '.js', 'utf8');
    expect(mirrorText).toBe(catalogs[language]);
    const mirror = JSON.parse(mirrorText).stem.anatomy;
    for (const [key, fallback] of Object.entries(english)) {
      const value = dictionaries[language][key];
      expect(typeof value, key).toBe('string'); expect(value.trim(), key).not.toBe('');
      expect(value.trim(), key).not.toBe(fallback.trim()); expect(mirror[key], key).toBe(value);
      expect(placeholders(value), key).toEqual(placeholders(fallback));
      for (const file of files) {
        if (dynamicFilterKeys.includes(key)) {
          expect(sourceTexts[file], key + ' dynamic reference in ' + file).toMatch(/t\(\s*['"]stem\.anatomy\.study_filter_['"]\s*\+\s*option\[0\]/);
          expect(sourceTexts[file], key + ' option in ' + file).toContain("['" + key.slice('study_filter_'.length) + "',");
        } else expect(sourceTexts[file], key + ' in ' + file).toContain('stem.anatomy.' + key);
      }
      if (fallback.endsWith(' ')) expect(value, key).toBe(value.trimEnd() + ' ');
      if (fallback.startsWith(' ')) expect(value, key).toBe(' ' + value.trimStart());
    }
    expect(dictionaries[language].study_filter_mastered).toBe(dictionaries[language].got_it);
    for (const file of files) {
      for (const key of sheetReferences(sourceTexts[file])) {
        expect(typeof dictionaries[language][key], 'component label ' + key).toBe('string');
        expect(dictionaries[language][key].trim(), 'component label ' + key).not.toBe('');
      }
    }
  });
});

for (const file of files) describe('Rendered study-record localization: ' + file, () => {
  for (const language of languages) {
    it('renders every ' + language + ' generated next step and all four saved activity headings', () => {
      const dictionary = dictionaries[language], s = session(file, dictionary, { selectedStructure: null });
      const options = [...s.html().querySelectorAll('[data-anatomy-structure-option]')];
      expect(options.length).toBeGreaterThanOrEqual(3);
      const ids = options.map(option => option.getAttribute('data-anatomy-structure-option'));
      const structure = options[0].querySelector('.truncate').textContent;
      const viewed = Object.fromEntries(ids.map(id => [id, true]));
      const mastered = Object.fromEntries(ids.map(id => [id, 'mastered']));
      const variants = [
        ['tour', { _tourCompleted: false, _structuresViewed: {}, _structureConfidence: {}, _totalCorrect: 0 }, {}],
        ['review', { _tourCompleted: true, _structuresViewed: {}, _structureConfidence: { [ids[0]]: 'practice' }, _totalCorrect: 0 }, { structure, count: 1 }],
        ['unseen', { _tourCompleted: true, _structuresViewed: {}, _structureConfidence: {}, _totalCorrect: 0 }, { structure, count: ids.length }],
        ['cards', { _tourCompleted: true, _structuresViewed: viewed, _structureConfidence: {}, _totalCorrect: 0 }, {}],
        ['quiz', { _tourCompleted: true, _structuresViewed: viewed, _structureConfidence: mastered, _totalCorrect: 0 }, {}],
        ['spotter', { _tourCompleted: true, _structuresViewed: viewed, _structureConfidence: mastered, _totalCorrect: 5 }, {}]
      ];
      const format = (template, fields) => template.replace(/\{([a-z]+)\}/g, (match, key) => fields[key] ?? match);
      for (const [id, state, fields] of variants) {
        s.patch(state);
        const next = s.html().querySelector('[data-anatomy-study-sheet] .anatomy-study-sheet-next');
        const title = format(dictionary['study_flow_next_' + id + '_title'], fields);
        const detail = format(dictionary['study_flow_next_' + id + '_detail'], fields);
        expect(next.textContent, id).toBe(dictionary.study_sheet_next + title + ' — ' + detail);
      }
      const activities = ['exercise', 'meal', 'wound', 'fluid'];
      const notes = Object.fromEntries(activities.map(id => [id, {
        explanation: 'My ' + id + ' explanation: محفوظة.', transferExplanation: 'My ' + id + ' comparison: محفوظة.'
      }]));
      s.patch({ _systemsMotionLearning: notes });
      const sheet = s.html().querySelector('[data-anatomy-study-sheet]');
      for (const id of activities) {
        const article = sheet.querySelector('[data-anatomy-study-reflection="' + id + '"]'); expect(article, id).not.toBeNull();
        expect(article.querySelector('h5').textContent, id).toBe(dictionary['study_flow_activity_' + id + '_title']);
        expect(article.querySelector('h5 + p').textContent, id).toBe(dictionary['motion_predict_' + id]);
        const comparison = [...article.children].find(child => child.tagName === 'DIV');
        expect(comparison.querySelector('p').textContent, id).toBe(dictionary['motion_transfer_' + id]);
        expect([...article.querySelectorAll('.anatomy-study-saved-text[dir="auto"]')].map(node => node.textContent), id)
          .toEqual([notes[id].explanation, notes[id].transferExplanation]);
      }
    });

    it('renders ' + language + ' sheet controls, all filters and preserved mixed-language notes', () => {
      const dictionary = dictionaries[language], note = 'My note: تحمي الجمجمة الدماغ.';
      const s = session(file, dictionary, {
        _structuresViewed: { ribs: true }, _structureConfidence: { skull: 'learning', femur: 'mastered' },
        _confidenceAt: { skull: Date.now() - 3 * 86400000 }, _structureNotes: { skull: note }
      });
      const sheet = s.html().querySelector('[data-anatomy-study-sheet]'); expect(sheet).not.toBeNull();
      expect(sheet.querySelector('#anatomy-study-sheet-title').textContent).toBe(dictionary.study_sheet_title);
      expect(sheet.querySelector('.anatomy-kicker').textContent).toBe(dictionary.study_sheet_kicker);
      expect(sheet.querySelector('.anatomy-study-sheet-head p').textContent).toContain(dictionary.study_sheet_sub);
      const actions = [...sheet.querySelectorAll('.anatomy-study-sheet-actions button')];
      const close = actions.find(button => button.getAttribute('aria-label') === dictionary.study_sheet_close);
      expect(close).toBeDefined(); expect(close.textContent).toBe(dictionary.close);
      expect(actions.map(button => button.textContent)).toContain(dictionary.study_sheet_print);
      expect(actions.map(button => button.textContent)).toContain(dictionary.study_sheet_copy);
      const filter = sheet.querySelector('[data-anatomy-study-filter-focus]');
      expect(filter.getAttribute('aria-label')).toBe(dictionary.study_filter_focus);
      expect([...filter.options].map(option => [option.value, option.textContent])).toEqual(
        ['all', 'review', 'notes', 'mastered'].map(value => [value, dictionary['study_filter_' + value]]));
      expect(sheet.querySelector('.anatomy-study-sheet-next strong').textContent).toBe(dictionary.study_sheet_next);
      expect(sheet.querySelector('[data-anatomy-study-sheet-due] strong').textContent).toBe(dictionary.study_sheet_due);
      expect(sheet.querySelector('[data-anatomy-study-unrated="viewed"]').textContent).toBe(dictionary.viewed);
      const skull = sheet.querySelector('[data-anatomy-study-open="skull"]');
      expect(skull.getAttribute('aria-label')).toBe(dictionary.study_open_structure + skull.textContent);
      const saved = skull.closest('li').querySelector('.anatomy-study-sheet-note');
      expect(saved.querySelector('strong').textContent).toBe(dictionary.in_my_words);
      expect(saved.querySelector('.anatomy-study-saved-text[dir="auto"]').textContent).toBe(note);
      expect(sheet.querySelector('[data-anatomy-stale="skull"]').textContent).toBe(
        dictionary.study_sheet_stale_prefix + '3' + dictionary.days_ago_suffix + dictionary.study_sheet_stale_suffix);
      expect(sheet.querySelector('[data-anatomy-stale="femur"]').textContent).toBe(
        dictionary.study_sheet_stale_prefix + dictionary.a_while_ago + dictionary.study_sheet_stale_suffix);
    });

    it('uses ' + language + ' reading, cancellation, filename and preview labels', () => {
      const dictionary = dictionaries[language], s = session(file, dictionary);
      const name = language === 'arabic' ? 'My سجل دراسة.json' : 'Mon registro.json';
      const initial = s.html();
      expect(initial.querySelector('.anatomy-study-sheet-empty').textContent).toBe(dictionary.study_sheet_empty);
      expect(initial.querySelector('[data-anatomy-study-export="txt"]').textContent).toBe(dictionary.study_download_text);
      expect(initial.querySelector('[data-anatomy-study-export="json"]').textContent).toBe(dictionary.study_download_record);
      expect(initial.querySelector('[data-anatomy-study-import] summary').textContent).toBe(dictionary.study_import_title);
      expect(initial.querySelector('[data-anatomy-study-import]').textContent).toContain(dictionary.study_import_help);
      expect(initial.querySelector('label[for="anatomy-study-import-file"]').textContent).toBe(dictionary.study_import_file);
      s.choose(name);
      expect(s.html().querySelector('[data-anatomy-study-import-cancel]').textContent).toBe(dictionary.study_import_cancel);
      expect(s.html().querySelector('[data-anatomy-study-record-notice]').textContent).toBe(dictionary.study_flow_import_reading);
      s.cancel();
      expect(s.html().querySelector('[data-anatomy-study-record-notice]').textContent).toBe(dictionary.study_flow_import_canceled);
      const reader = s.choose(name);
      reader.finish(packet([{ ...row, confidence: 'learning', ratedAt: 1800000000000, note: 'Imported explanation.' },
        { ...row, id: 'not-in-anatomy-catalog' }]));
      const host = s.html(), filename = host.querySelector('[data-anatomy-study-import-filename]');
      expect(host.querySelector('[data-anatomy-study-import-preview-title]').textContent).toBe(dictionary.study_flow_import_title);
      expect(filename.querySelector('strong').textContent).toBe(dictionary.study_flow_import_file);
      expect(filename.querySelector('bdi[dir="auto"]').textContent).toBe(name);
      expect(filename.textContent).toBe(dictionary.study_flow_import_file + name);
      expect(host.querySelector('[data-anatomy-study-record-notice]').textContent).toBe(dictionary.study_import_preview_ready);
      const preview = host.querySelector('[data-anatomy-study-import-preview]');
      expect(preview.textContent).toContain('1 ' + dictionary.study_import_structures);
      expect(preview.textContent).toContain('1 ' + dictionary.study_import_ratings);
      expect(preview.textContent).toContain('1 ' + dictionary.study_import_notes);
      expect(preview.textContent).toContain('1 ' + dictionary.study_import_skipped);
      expect(preview.querySelector('[data-anatomy-study-import-merge]').textContent).toBe(dictionary.study_import_merge);
      expect(preview.querySelector('[data-anatomy-study-import-cancel]').textContent).toBe(dictionary.study_import_cancel);
      s.merge();
      expect(s.html().querySelector('[data-anatomy-study-record-notice]').textContent).toBe(
        dictionary.study_merge_done + '1. ' + dictionary.study_merge_notes_kept + '0. ' + dictionary.study_merge_reflections_kept + '0.');
    });

    it('uses ' + language + ' download success and failure notices', () => {
      const dictionary = dictionaries[language], s = session(file, dictionary);
      s.download('txt');
      expect(s.html().querySelector('[data-anatomy-study-record-notice]').textContent).toBe(dictionary.study_download_ready);
      URL.createObjectURL.mockImplementationOnce(() => { throw new Error('download unavailable'); });
      s.download('json');
      expect(s.html().querySelector('[data-anatomy-study-record-notice]').textContent).toBe(dictionary.study_download_failed);
    });

    it('uses ' + language + ' file-size, read and malformed-JSON notices', () => {
      const dictionary = dictionaries[language], s = session(file, dictionary);
      s.choose('large.json', 1000001);
      expect(s.html().querySelector('[data-anatomy-study-record-notice]').textContent).toBe(dictionary.study_import_size);
      const reader = s.choose('unreadable.json'); reader.fail();
      expect(s.html().querySelector('[data-anatomy-study-record-notice]').textContent).toBe(dictionary.study_import_read_failed);
      const malformed = s.choose('malformed.json'); malformed.finish('{ definitely invalid JSON');
      expect(s.html().querySelector('[data-anatomy-study-record-notice]').textContent).toBe(dictionary.study_import_failed + dictionary.study_invalid_json);
    });

    it.each(errors)('renders the localized %s rejection in ' + language, (code, invalidPacket) => {
      const dictionary = dictionaries[language], s = session(file, dictionary), reader = s.choose('record.json');
      if (invalidPacket) reader.finish(invalidPacket());
      else {
        // An unexpected importer exception uses the learner-facing generic message.
        const parse = vi.spyOn(JSON, 'parse').mockImplementationOnce(() => { throw new Error('INTERNAL_RECORD_DETAIL'); });
        try { reader.finish('{}'); } finally { parse.mockRestore(); }
      }
      const key = 'study_flow_error_' + code;
      const notice = s.html().querySelector('[data-anatomy-study-record-notice]').textContent;
      expect(notice).toBe(dictionary.study_import_failed + dictionary[key]);
      expect(notice).not.toContain(english[key]); expect(notice).not.toContain('INTERNAL_RECORD_DETAIL');
    });
  }
});
