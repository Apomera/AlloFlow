import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const table = JSON.parse(fs.readFileSync('dev-tools/i18n/handtl_anatomy_study_20260904.json', 'utf8'));
const english = JSON.parse(fs.readFileSync('dev-tools/i18n/stem_anatomy_en.json', 'utf8'));
const languages = Object.keys(table);
const dictionaries = Object.fromEntries(languages.map(language => [language, JSON.parse(fs.readFileSync('lang/' + language + '.js', 'utf8')).stem.anatomy]));
const paths = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const format = (value, fields) => value.replace(/\{([a-z]+)\}/g, (match, key) => fields[key] ?? match);
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const hit = find(child, predicate); if (hit) return hit; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function text(node) { return node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children); }
function session(file, dictionary) {
  const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { system: 'skeletal', view: 'anterior', complexity: 3, _activeTab: 'flashcards', _structureConfidence: { ribs: 'practice' } } };
  const announcements = [];
  const t = (key, fallback) => key.startsWith('stem.anatomy.') ? dictionary[key.slice('stem.anatomy.'.length)] || fallback : fallback;
  const render = () => tool.render(makeCtx({ toolData: data, gradeLevel: '9', t, announceToSR: message => announcements.push(message), setToolData: updater => { data = typeof updater === 'function' ? updater(data) : updater; } }));
  return { data: () => data.anatomy, announcements,
    click(label) { const button = find(render(), node => node.type === 'button' && (node.props['aria-label'] === label || text(node).trim() === label)); expect(button).not.toBeNull(); button.props.onClick(); },
    changeSystem(system) { find(render(), node => node.props?.id === 'anatomy-study-system').props.onChange({ target: { value: system } }); },
    edit(value) { find(render(), node => node.type === 'textarea' && String(node.props.id).startsWith('anatomy-own-words-')).props.onChange({ target: { value } }); },
    html() { const root = document.createElement('div'); root.innerHTML = renderTool('anatomy', data, { t, gradeLevel: '9' }); return root; }
  };
}
beforeEach(resetStemLab);
describe('Anatomy study localization', () => {
  it.each(languages)('ships the study translations with matching placeholders in both %s catalogs', language => {
    const mirror = JSON.parse(fs.readFileSync('desktop/web-app/public/lang/' + language + '.js', 'utf8')).stem.anatomy;
    for (const [key, expected] of Object.entries(table[language])) {
      expect(expected.trim()).not.toBe(''); expect(dictionaries[language][key], key).toBe(expected); expect(mirror[key], key).toBe(expected);
      const placeholders = value => [...value.matchAll(/\{([a-z]+)\}/g)].map(match => match[1]).sort();
      expect(typeof english[key], key).toBe('string'); expect(placeholders(expected), key).toEqual(placeholders(english[key]));
    }
  });
  for (const file of paths) {
    it.each(languages)('uses %s labels and announcements through recall, rating, notes, and system changes in ' + file, language => {
      const dictionary = dictionaries[language]; const s = session(file, dictionary);
      expect(s.html().querySelector('[data-anatomy-study-controls]').textContent).toContain(dictionary.body_system);
      expect(s.html().querySelector('[data-anatomy-study-controls-toggle]').textContent).toBe(dictionary.more_study_controls);
      s.click(dictionary.flashcard_due + ' (1)');
      const card = s.html().querySelector('[data-anatomy-recall-card]'); const name = card.querySelector('h3').textContent;
      const fields = { current: 1, total: 1, name };
      expect(card.getAttribute('aria-label')).toBe(format(dictionary.flashcard_group, fields));
      expect(s.announcements.at(-1)).toBe(format(dictionary.flashcard_announcement, fields) + dictionary.answer_hidden);
      expect(s.html().querySelector('textarea')).toBeNull();
      s.click(dictionary.reveal_function);
      expect(s.html().querySelector('#anatomy-flashcard-content').textContent).toContain(dictionary.function_label);
      expect(s.html().querySelector('.anatomy-confidence').getAttribute('aria-label')).toBe(format(dictionary.confidence_for, fields));
      expect(s.html().querySelector('.anatomy-confidence').textContent).toContain(dictionary.confidence_question);
      s.click('~ ' + dictionary.learning); expect(s.data()._structureConfidence.ribs).toBe('learning');
      expect(s.html().querySelector('[data-anatomy-round-rated]').textContent).toContain(dictionary.flashcard_rated_round + '1 / 1');
      s.edit(dictionary.own_words_placeholder); expect(s.data()._structureNotes.ribs).toBe(dictionary.own_words_placeholder);
      expect(s.html().querySelector('[data-anatomy-flashcard-note] summary').textContent).toContain(dictionary.card_note_saved);
      s.click(dictionary.show_structure_name); expect(s.html().querySelector('textarea')).toBeNull();
      s.click(dictionary.locate_flashcard);
      expect(s.announcements.at(-1)).toBe(format(dictionary.flashcard_announcement, fields) + dictionary.answer_hidden);
      s.changeSystem('respiratory'); expect(s.html().textContent).toContain(dictionary.flashcard_none_due);
      s.changeSystem('skeletal'); expect(s.data().selectedStructure).toBe('ribs'); expect(s.data()._structureNotes.ribs).toBe(dictionary.own_words_placeholder);
    });
  }
});
