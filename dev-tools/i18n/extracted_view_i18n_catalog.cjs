'use strict';

// Source-derived catalog for the extracted Assignment Center and Directions
// views. It is read-only; translation payloads are reviewed separately.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const unique = (values) => [...new Set(values)].sort();

const assignmentSource = read('view_assignment_center_source.jsx');
const directionsSource = read('view_directions_result_source.jsx');
const uiStrings = JSON.parse(read('ui_strings.js'));

const assignmentKeys = unique(
  [...assignmentSource.matchAll(/\btx\('([^']+)'/g)]
    .map((match) => match[1])
    .filter((key) => key.startsWith('share_collect.')),
);

const DIRECTION_ALIASES = {
  mapHide: 'directions.map_hide',
  mapShow: 'directions.map_show',
  mapSummary: 'directions.map_summary',
  stationsVisited: 'directions.map_stations',
  goals: 'directions.goals',
  mapStart: 'directions.map_start',
  mapNextPin: 'directions.map_next_pin',
  mapNextLabel: 'directions.map_next_label',
  mapNextGoal: 'directions.map_next_goal',
  mapAlsoReady: 'directions.map_also_ready',
  mapAllVisited: 'directions.map_all_visited',
  mapJumpAny: 'directions.map_jump_any',
  mapVisitedSr: 'directions.map_visited_sr',
  yourGoals: 'directions.your_goals',
  goalDone: 'directions.goal_done',
  goalOpen: 'directions.goal_open',
  signalsNote: 'directions.signals_note',
  missingChoices: 'directions.missing_choices',
  choices: 'directions.choices',
  selectedPrefix: 'directions.selected_prefix',
  selectedSuffix: 'directions.selected_suffix',
  chooseActivity: 'directions.choose_activity',
  openActivity: 'directions.open_activity',
  choiceHint: 'directions.choice_hint',
};

const directionKeys = unique(
  [...directionsSource.matchAll(/\btext\('([^']+)'/g)]
    .map((match) => DIRECTION_ALIASES[match[1]] || match[1])
    .map((key) => key.startsWith('directions.') ? key : `directions.${key}`),
);

const SHARE_FALLBACK_OVERRIDES = {
  private_link_label: 'Private assignment link',
};

const shareEnglish = {};
for (const key of assignmentKeys) {
  const localKey = key.slice('share_collect.'.length);
  const value = uiStrings.share_collect?.[localKey] || SHARE_FALLBACK_OVERRIDES[localKey];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing English ui_strings.share_collect source for ${key}`);
  }
  shareEnglish[localKey] = value;
}

const directionEnglish = {
  title: uiStrings.directions?.title || 'Assignment Directions',
  map_hide: 'Hide map',
  map_show: 'Quest map',
  map_summary: 'Quest map',
  map_stations: 'stations visited',
  goals: 'goals',
  map_start: 'Start here',
  map_next_pin: 'NEXT',
  map_next_label: 'Go here next',
  map_next_goal: 'finishes your goal: {goal}',
  map_also_ready: 'or',
  map_all_visited: '🎉 You have been to every station on this map.',
  map_jump_any: 'Go to any station',
  map_visited_sr: 'already visited',
  your_goals: 'Your goals',
  goal_done: 'complete',
  goal_open: 'not yet complete',
  signals_note: 'Goals check themselves on this device as you play and earn XP — and your own checkmarks count too.',
  missing_choices: 'Some activity choices are no longer available in this assignment. Choose from the activities still listed below or ask your teacher for an updated board.',
  choices: 'choices',
  selected_prefix: 'Selected',
  selected_suffix: 'You can choose another activity below.',
  choose_activity: 'Choose activity',
  open_activity: 'Open activity',
  choice_hint: 'Choose one activity to begin. You can return here and choose another card later.',
};

const directionEnglishKeys = Object.keys(directionEnglish).map((key) => `directions.${key}`);
const missingDirections = directionKeys.filter((key) => !directionEnglishKeys.includes(key));
if (missingDirections.length) throw new Error(`Missing English extracted directions: ${missingDirections.join(', ')}`);

const EXTRACTED_VIEW_ADDITIONS = { share_collect: shareEnglish, directions: directionEnglish };
const EXTRACTED_VIEW_KEYS = [...assignmentKeys, ...directionKeys].sort();
const placeholders = (value) => [...String(value).matchAll(/\{[^{}]+\}/g)].map((match) => match[0]).sort();
const EXTRACTED_VIEW_PLACEHOLDERS = Object.fromEntries(EXTRACTED_VIEW_KEYS.map((key) => {
  const [namespace, ...rest] = key.split('.');
  return [key, placeholders(EXTRACTED_VIEW_ADDITIONS[namespace][rest.join('.')])];
}));

module.exports = {
  ASSIGNMENT_KEYS: assignmentKeys,
  DIRECTION_ALIASES,
  DIRECTION_KEYS: directionKeys,
  EXTRACTED_VIEW_ADDITIONS,
  EXTRACTED_VIEW_KEYS,
  EXTRACTED_VIEW_PLACEHOLDERS,
};
