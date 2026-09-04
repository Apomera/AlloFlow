import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 13 (2026-09-02): quiz misses explain the difference between the chosen and correct
// structures, well-known misconceptions become "Myth or fact?" items and a Myth buster box,
// and every structure name gets a "Hear it" button on the detail card and flashcard front.

const ANATOMY_PATHS = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
];

const OLDER = { gradeLevel: '9' };

function parse(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

function render(filePath, state, overrides) {
  loadTool(filePath, 'anatomy');
  return parse(renderTool('anatomy', {
    anatomy: { system: 'circulatory', view: 'anterior', complexity: 3, ...state },
  }, overrides));
}

beforeEach(() => { resetStemLab(); });

describe('Anatomy quiz contrast feedback', () => {
  it.each(ANATOMY_PATHS)('names what the chosen structure does next to what the answer does in %s', (filePath) => {
    const first = render(filePath, { _activeTab: 'quiz', quizMode: true, quizIdx: 0 }, OLDER);
    const options = [...first.querySelectorAll('[data-anatomy-quiz-panel] button[data-anatomy-quiz-option]')];
    expect(options.length).toBe(4);
    const ids = options.map((b) => b.getAttribute('data-anatomy-quiz-option'));
    // Two candidates: at least one is wrong, and the wrong one must be explained by contrast.
    let contrast = null;
    for (const chosen of ids.slice(0, 2)) {
      const again = render(filePath, { _activeTab: 'quiz', quizMode: true, quizIdx: 0, quizFeedback: { chosen, correct: false } }, OLDER);
      contrast = again.querySelector('[data-anatomy-quiz-contrast]');
      if (!contrast) continue;
      expect(contrast.getAttribute('data-anatomy-quiz-contrast')).toBe(chosen);
      expect(contrast.textContent).toMatch(/^You chose the .+: \S/);
      const status = again.querySelector('[data-anatomy-quiz-panel] [role="status"]');
      expect(status.textContent).toMatch(/The answer was: /);
      expect(status.textContent).toMatch(/The .+: /);
      break;
    }
    expect(contrast).not.toBeNull();
  }, 60_000);
});

describe('Anatomy myth or fact', () => {
  it.each(ANATOMY_PATHS)('turns the True/False slot into Myth or fact for the heart and shows the fact afterwards in %s', (filePath) => {
    // quizIdx ≡ 1 (mod 4) is the True/False slot. Walk the pool until the heart comes up.
    let mythRound = null;
    for (let idx = 1; idx < 200 && !mythRound; idx += 4) {
      const root = render(filePath, { _activeTab: 'quiz', quizMode: true, quizIdx: idx }, OLDER);
      if (root.querySelector('[data-anatomy-myth-quiz="heart"]')) mythRound = { idx, root };
    }
    expect(mythRound).not.toBeNull();
    const labels = [...mythRound.root.querySelectorAll('[data-anatomy-quiz-panel] button[data-anatomy-quiz-option]')].map((b) => b.textContent.replace(/^\d/, '').trim());
    expect(labels).toEqual(['Fact', 'Myth']);
    expect(mythRound.root.textContent).toMatch(/Myth or fact\?/);

    const answered = render(filePath, { _activeTab: 'quiz', quizMode: true, quizIdx: mythRound.idx, quizFeedback: { chosen: 'true', correct: false } }, OLDER);
    const explanation = answered.querySelector('[data-anatomy-myth-fact="heart"]');
    expect(explanation).not.toBeNull();
    expect(explanation.textContent).toMatch(/Myth: The heart sits on the left side of the chest\./);
    expect(explanation.textContent).toMatch(/Fact: The heart sits almost in the middle/);
  }, 60_000);

  it.each(ANATOMY_PATHS)('shows a Myth buster box on the detail card, in child words for young learners, in %s', (filePath) => {
    const older = render(filePath, { _activeTab: 'explore', selectedStructure: 'heart' }, OLDER);
    const box = older.querySelector('[data-anatomy-myth-buster="heart"]');
    expect(box).not.toBeNull();
    expect(box.textContent).toMatch(/Many people think: .The heart sits on the left side of the chest\./);
    expect(box.textContent).toMatch(/Actually: The heart sits almost in the middle/);

    const young = render(filePath, { _activeTab: 'explore', selectedStructure: 'heart' });
    expect(young.querySelector('[data-anatomy-myth-buster="heart"]').textContent).toMatch(/Your heart is almost in the middle of your chest/);

    const none = render(filePath, { _activeTab: 'explore', selectedStructure: 'aorta' }, OLDER);
    expect(none.querySelector('[data-anatomy-myth-buster]')).toBeNull();
  }, 60_000);
});

describe('Anatomy read-aloud controls', () => {
  // Round 28 (2026-09-03): nine read-aloud buttons all announced themselves as "Read aloud",
  // four of them inside the structure card, so a screen-reader user could not tell which one
  // read which section. They also used a different pill shape from the Hear it control.
  it.each(ANATOMY_PATHS)('names every read-aloud control by what it reads in %s', (filePath) => {
    const root = render(filePath, { _activeTab: 'explore', system: 'skeletal', selectedStructure: 'femur' }, OLDER);
    const card = root.querySelector('[data-anatomy-structure-detail]');
    const names = [...card.querySelectorAll('[data-anatomy-tts], [data-anatomy-hear-name]')]
      .map((b) => b.getAttribute('aria-label'));
    expect(names.length).toBeGreaterThanOrEqual(3);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain('Read the function aloud');
    expect(names).toContain('Read the clinical note aloud');
    expect(names.every((n) => n && n !== 'Read aloud')).toBe(true);
  }, 60_000);

  it.each(ANATOMY_PATHS)('shares one pill shape with the Hear it control in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('var ttsBtn = function(text, label) {');
    expect(source).toContain("var spokenLabel = label || t('stem.anatomy.read_aloud_2', 'Read aloud');");
    // Both controls are rounded-full indigo pills.
    expect(source).toMatch(/data-anatomy-tts[\s\S]{0,320}rounded-full/);
    const root = render(filePath, { _activeTab: 'explore', system: 'skeletal', selectedStructure: 'femur' }, OLDER);
    for (const btn of root.querySelectorAll('[data-anatomy-tts]')) {
      expect(btn.className).toMatch(/rounded-full/);
      expect(btn.className).toMatch(/border-indigo-300/);
    }
  }, 60_000);
});

describe('Anatomy Hear it button', () => {
  it.each(ANATOMY_PATHS)('offers to speak the name on the detail card and the flashcard front in %s', (filePath) => {
    const card = render(filePath, { _activeTab: 'explore', system: 'skeletal', selectedStructure: 'skull' }, OLDER);
    const hear = card.querySelector('[data-anatomy-structure-detail] [data-anatomy-hear-name="skull"]');
    expect(hear).not.toBeNull();
    expect(hear.getAttribute('aria-label')).toBe('Hear the name Skull');
    expect(hear.textContent).toMatch(/Hear it/);

    const deck = render(filePath, { _activeTab: 'flashcards', system: 'skeletal', _flashcardIdx: 0, _flashcardFlipped: false }, OLDER);
    expect(deck.querySelector('[data-anatomy-hear-name]')).not.toBeNull();
  }, 60_000);
});
