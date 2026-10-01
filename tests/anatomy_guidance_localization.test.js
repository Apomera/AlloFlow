import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const languages = ['french', 'spanish_latin_america', 'arabic'];
const english = {
  guidance_dashboard: 'Study dashboard',
  guidance_dashboard_summary: '{viewed} viewed · {review} to revisit',
  guidance_mastered_view: 'Got it in this view',
  guidance_revisit: 'To revisit',
  guidance_next: 'Recommended next step',
  guidance_queue: 'Revisit a structure',
  guidance_more: '+{count} more in this view',
  guidance_review_help: 'Revisit structures marked Need practice or Learning. Due for review in Flashcards also includes older ratings.',
  guidance_action_tour: 'Open guided tour',
  guidance_action_review: 'Review structure',
  guidance_action_unseen: 'Open structure',
  guidance_action_cards: 'Open flashcards',
  guidance_action_quiz: 'Open quiz',
  guidance_action_spotter: 'Open Spotter',
  guidance_empty_view_title: 'See structures in the {view} view',
  guidance_empty_view_detail: 'This view has no structures at this level. Switch views to continue studying.',
  guidance_action_view: 'Switch view',
  guidance_empty_level_title: 'Explore at {level}',
  guidance_empty_level_detail: 'Choose the next level with structures available in this view.',
  guidance_action_level: 'Change level',
  guidance_preserve_help: 'Opening an activity keeps your saved answers and ratings. Use its Restart control to begin again.',
  guidance_progress_help: 'Viewed records what you opened. Confidence ratings guide your next practice.',
  guidance_quiz_opened: 'Quiz opened. Your saved place and answers are kept.',
  guidance_scope_help: 'Viewed, systems, quiz, and badges cover all saved work. Confidence counts and recommendations use this view.'
};
const catalogs = Object.fromEntries(languages.map(language => [language, fs.readFileSync('lang/' + language + '.js', 'utf8')]));
const dictionaries = Object.fromEntries(languages.map(language => [language, JSON.parse(catalogs[language]).stem.anatomy]));
const placeholders = value => [...value.matchAll(/\{[^{}]+\}/g)].map(match => match[0]).sort();
const format = (value, fields = {}) => value.replace(/\{([a-z]+)\}/g, (match, key) => fields[key] ?? match);

beforeEach(() => { resetStemLab(); vi.useFakeTimers(); document.body.innerHTML = ''; });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('Anatomy guidance localization catalogs', () => {
  it.each(languages)('preserves all 24 labels and exact placeholders in both %s catalogs', language => {
    const mirrorText = fs.readFileSync('desktop/web-app/public/lang/' + language + '.js', 'utf8');
    expect(mirrorText).toBe(catalogs[language]);
    const mirror = JSON.parse(mirrorText).stem.anatomy;
    for (const [key, fallback] of Object.entries(english)) {
      const value = dictionaries[language][key];
      expect(typeof value, key).toBe('string'); expect(value.trim(), key).not.toBe('');
      expect(value.trim(), key).not.toBe(fallback.trim()); expect(mirror[key], key).toBe(value);
      expect(placeholders(value), key).toEqual(placeholders(fallback));
    }
  });
});

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const match = find(child, predicate); if (match) return match; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function session(file, dictionary, state = {}) {
  const tool = loadTool(file, 'anatomy'), announcements = [];
  let data = { anatomy: { system: 'skeletal', view: 'anterior', complexity: 3,
    _activeTab: 'explore', _readingMode: true, ...state } };
  const setToolData = update => { data = typeof update === 'function' ? update(data) : update; };
  const t = (key, fallback) => key.startsWith('stem.anatomy.') ? dictionary[key.slice('stem.anatomy.'.length)] ?? fallback : fallback;
  const context = () => ({ toolData: data, gradeLevel: '9', setToolData, t, announceToSR: message => announcements.push(message) });
  return {
    patch(patch) { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
    data() { return data.anatomy; }, announcements,
    html() { const host = document.createElement('div'); host.innerHTML = renderTool('anatomy', data, context()); return host; },
    clickGuidance() {
      const button = find(tool.render(makeCtx(context())), node => node.type === 'button' && !!node.props?.['data-anatomy-guidance-action']);
      expect(button).not.toBeNull(); button.props.onClick();
    }
  };
}

for (const file of files) describe('Rendered Anatomy guidance localization: ' + file, () => {
  it.each(languages)('labels every available next step and preserves saved-activity expectations in %s', language => {
    const dictionary = dictionaries[language], s = session(file, dictionary);
    const options = [...s.html().querySelectorAll('[data-anatomy-structure-option]')];
    const ids = options.map(option => option.getAttribute('data-anatomy-structure-option'));
    expect(ids.length).toBeGreaterThanOrEqual(4);
    const structure = options[0].querySelector('.truncate').textContent;
    const viewed = Object.fromEntries(ids.map(id => [id, true]));
    const mastered = Object.fromEntries(ids.map(id => [id, 'mastered']));
    const now = Object.fromEntries(ids.map(id => [id, Date.now()]));
    const variants = [
      ['tour', { _tourCompleted: false, _structuresViewed: {}, _structureConfidence: {}, _totalCorrect: 0 }, {}],
      ['review', { _tourCompleted: true, _structuresViewed: {}, _structureConfidence: { [ids[0]]: 'practice' }, _totalCorrect: 0 }, { structure, count: 1 }],
      ['unseen', { _tourCompleted: true, _structuresViewed: {}, _structureConfidence: {}, _totalCorrect: 0 }, { structure, count: ids.length }],
      ['cards', { _tourCompleted: true, _structuresViewed: viewed, _structureConfidence: {}, _totalCorrect: 0 }, {}],
      ['quiz', { _tourCompleted: true, _structuresViewed: viewed, _structureConfidence: mastered, _confidenceAt: now, _totalCorrect: 0 }, {}],
      ['spotter', { _tourCompleted: true, _structuresViewed: viewed, _structureConfidence: mastered, _confidenceAt: now, _totalCorrect: 5 }, {}]
    ];
    for (const [id, state, fields] of variants) {
      s.patch(state); const coach = s.html().querySelector('[data-anatomy-guidance]');
      expect(coach, id).not.toBeNull(); expect(coach.getAttribute('data-anatomy-guidance'), id).toBe(id);
      expect(coach.querySelector('[data-anatomy-guidance-title]').textContent, id).toBe(format(dictionary['study_flow_next_' + id + '_title'], fields));
      expect(coach.querySelector('[data-anatomy-guidance-detail]').textContent, id).toBe(format(dictionary['study_flow_next_' + id + '_detail'], fields));
      expect(coach.querySelector('[data-anatomy-guidance-action]').textContent, id).toBe(dictionary['guidance_action_' + id]);
      expect(coach.querySelector('[data-anatomy-guidance-preserve-help]').textContent, id).toBe(dictionary.guidance_preserve_help);
      expect(coach.textContent, id).toContain(dictionary.guidance_next);
    }
  });

  it.each(languages)('explains progress scope and the difference between revisit and due cards in %s', language => {
    const dictionary = dictionaries[language], s = session(file, dictionary, { _tourCompleted: true,
      _structuresViewed: { skull: true, femur: true, heart: true, lungs: true },
      _structureConfidence: { skull: 'practice', ribs: 'learning', clavicle: 'practice', sternum: 'practice' } });
    const host = s.html(), dashboard = host.querySelector('[data-anatomy-study-dashboard]');
    expect(dashboard).not.toBeNull();
    const summary = dashboard.querySelector('summary');
    expect(summary.textContent).toContain(dictionary.guidance_dashboard);
    expect(summary.textContent).toContain(format(dictionary.guidance_dashboard_summary, { viewed: 4, review: 4 }));
    expect(dashboard.textContent).toContain(dictionary.guidance_scope_help);
    expect(dashboard.querySelector('[data-anatomy-guidance-progress-help]').textContent).toBe(dictionary.guidance_progress_help);
    expect(dashboard.textContent).toContain(dictionary.guidance_mastered_view);
    expect(dashboard.textContent).toContain(dictionary.guidance_revisit);
    expect(dashboard.querySelector('[data-anatomy-guidance-review-help]').textContent).toBe(dictionary.guidance_review_help);
    const queue = dashboard.querySelector('[data-anatomy-review-queue]'); expect(queue).not.toBeNull();
    expect(queue.textContent).toContain(dictionary.guidance_queue);
    expect(queue.textContent).toContain(format(dictionary.guidance_more, { count: 1 }));
    expect(queue.querySelectorAll('[data-review-queue-id]')).toHaveLength(3);
  });

  it.each(languages)('localizes an actionable empty-view recovery in %s', language => {
    const dictionary = dictionaries[language], s = session(file, dictionary, { system: 'respiratory', view: 'posterior', complexity: 3 });
    const coach = s.html().querySelector('[data-anatomy-guidance="view"]'); expect(coach).not.toBeNull();
    expect(coach.querySelector('[data-anatomy-guidance-title]').textContent).toBe(format(dictionary.guidance_empty_view_title, { view: dictionary.quiz_flow_anterior }));
    expect(coach.querySelector('[data-anatomy-guidance-detail]').textContent).toBe(dictionary.guidance_empty_view_detail);
    expect(coach.querySelector('[data-anatomy-guidance-action]').textContent).toBe(dictionary.guidance_action_view);
    expect(coach.querySelector('[data-anatomy-guidance-preserve-help]').textContent).toBe(dictionary.guidance_preserve_help);
    s.clickGuidance(); expect(s.data().view).toBe('anterior');
    expect(s.html().querySelectorAll('[data-anatomy-structure-option]').length).toBeGreaterThan(0);
  });
});
