import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 14 (2026-09-02): ratings carry a timestamp. "Got it" is due for a re-check after 7 days
// and "Learning" after 2, so stale confidence goes to the front of the card deck and the quiz,
// and the study sheet lists what to re-check today. The Homeostasis Hunt gains a recap check.

const ANATOMY_PATHS = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
];

const OLDER = { gradeLevel: '9' };
const DAY = 86_400_000;
const NOW = Date.now();

function parse(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

function render(filePath, state, overrides) {
  loadTool(filePath, 'anatomy');
  return parse(renderTool('anatomy', {
    anatomy: { system: 'skeletal', view: 'anterior', complexity: 3, ...state },
  }, overrides));
}

// Skull rated Got it ten days ago (stale), femur Learning yesterday (fresh), ribs Got it today.
const RATINGS = {
  _structureConfidence: { skull: 'mastered', femur: 'learning', ribs: 'mastered' },
  _confidenceAt: { skull: NOW - 10 * DAY, femur: NOW - 1 * DAY, ribs: NOW },
  _structuresViewed: { skull: true, femur: true, ribs: true },
};

beforeEach(() => { resetStemLab(); });

describe('Anatomy review scheduling', () => {
  it.each(ANATOMY_PATHS)('stamps every confidence write with a time in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain("return { _structureConfidence: nextConfidence, _confidenceAt: stampConfidence(structureId) };");
    expect(source).toContain("{ _structureConfidence: nextConfidence, _confidenceAt: stampConfidence(structureId) }");
    expect(source).toContain('var ANATOMY_REVIEW_DUE_DAYS = { learning: 2, mastered: 7 };');
  });

  it.each(ANATOMY_PATHS)('puts a stale Got it at the front of the card deck and says so in %s', (filePath) => {
    const deck = render(filePath, { _activeTab: 'flashcards', ...RATINGS }, OLDER);
    const front = deck.querySelector('[role="group"][aria-label^="Flashcard"] h3');
    expect(front?.textContent).toBe('Skull (Cranium)');
    const notice = deck.querySelector('p[role="status"].text-rose-700');
    expect(notice?.textContent).toMatch(/^1 card\(s\) marked Need practice or due for a re-check/);

  }, 60_000);

  it.each(ANATOMY_PATHS)('asks the stale structure first in the quiz in %s', (filePath) => {
    const answered = render(filePath, { _activeTab: 'quiz', quizMode: true, quizIdx: 0, quizFeedback: { chosen: 'skull', correct: true }, ...RATINGS }, OLDER);
    const status = answered.querySelector('[data-anatomy-quiz-panel] [role="status"]');
    expect(status?.textContent).toMatch(/Correct!/);
  }, 60_000);

  it.each(ANATOMY_PATHS)('lists what to re-check on the study sheet in %s', (filePath) => {
    const sheet = render(filePath, { _activeTab: 'explore', _showStudySheet: true, ...RATINGS }, OLDER);
    const dueLine = sheet.querySelector('[data-anatomy-study-sheet-due]');
    expect(dueLine?.getAttribute('data-anatomy-study-sheet-due')).toBe('1');
    expect(dueLine?.textContent).toMatch(/Re-check today: Skull \(Cranium\)\./);
    expect(sheet.querySelector('[data-anatomy-stale="skull"]')?.textContent).toBe('rated 10 day(s) ago · re-check');
    expect(sheet.querySelector('[data-anatomy-stale="femur"]')).toBeNull();
    expect(sheet.querySelector('[data-anatomy-stale="ribs"]')).toBeNull();
  }, 60_000);

  it.each(ANATOMY_PATHS)('treats a rating saved without a timestamp as due in %s', (filePath) => {
    const sheet = render(filePath, { _activeTab: 'explore', _showStudySheet: true, _structureConfidence: { skull: 'mastered' } }, OLDER);
    expect(sheet.querySelector('[data-anatomy-stale="skull"]')?.textContent).toBe('rated a while ago · re-check');
  }, 60_000);
});

describe('Anatomy Homeostasis recap', () => {
  it.each(ANATOMY_PATHS)('appears after understanding is ticked and scores three checks in %s', (filePath) => {
    const before = render(filePath, { _activeTab: 'homeoHunt', homeoHunt: { understood: false, log: [] } }, OLDER);
    expect(before.querySelector('[data-anatomy-homeo-recap]')).toBeNull();

    const open = render(filePath, { _activeTab: 'homeoHunt', homeoHunt: { understood: true } }, OLDER);
    const recap = open.querySelector('[data-anatomy-homeo-recap]');
    expect(recap?.getAttribute('data-anatomy-homeo-recap-state')).toBe('open');
    expect(recap.querySelectorAll('[data-anatomy-homeo-recap-question]')).toHaveLength(3);
    expect(recap.querySelectorAll('button[data-anatomy-homeo-recap-option]')).toHaveLength(9);

    const done = render(filePath, { _activeTab: 'homeoHunt', homeoHunt: { understood: true, recap: { temp: 'above', ph: 'acid', feedback: 'amplify' } } }, OLDER);
    const finished = done.querySelector('[data-anatomy-homeo-recap]');
    expect(finished?.getAttribute('data-anatomy-homeo-recap-state')).toBe('done');
    expect(finished.textContent).toMatch(/2 \/ 3 right\./);
    expect(finished.querySelectorAll('button[disabled]')).toHaveLength(9);
  }, 60_000);
});
