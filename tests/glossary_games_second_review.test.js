import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, loadGames, mountGame } from './helpers/games_live_harness.js';
import { readFileSync } from 'node:fs';
const shuffle = vi.fn(values => values.slice().reverse());
window.fisherYatesShuffle = shuffle;
loadGames();
const cleanups = [];
const mount = (name, props = {}) => { const game = mountGame(name, { onClose: vi.fn(), ...props }); cleanups.push(game.unmount); return game; };
const click = element => { expect(element).toBeTruthy(); act(() => element.click()); };
const control = (container, name) => container.querySelector('[data-help-key="' + name + '"]');
const data = [{ term: 'Planet', def: 'A world orbiting a star.' }, { term: 'Orbit', def: 'A curved path around another object.' }, { term: 'Star', def: 'A sphere of hot gas that produces light.' }];
const input = (element, value) => act(() => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
});
beforeEach(() => { shuffle.mockClear(); });
afterEach(() => { cleanups.splice(0).reverse().forEach(fn => fn()); vi.useRealTimers(); vi.restoreAllMocks(); });
const choiceForClue = container => {
  const definition = container.querySelector('#detective-clue').textContent;
  const term = data.find(item => item.def === definition).term;
  return [...container.querySelectorAll('[data-help-key="detective_choice"]')].find(button => button.textContent === term);
};
function finish(container, wrongFirst = false) {
  let count = 0;
  while (control(container, 'detective_choice') && count++ < 20) {
    const right = choiceForClue(container);
    const selected = wrongFirst && count === 1 ? [...container.querySelectorAll('[data-help-key="detective_choice"]')].find(button => button !== right) : right;
    click(selected); click(control(container, 'detective_next'));
  }
  expect(count).toBeLessThan(20);
}

describe('Additional glossary refinements', () => {
  it.each([['MemoryGame', 10], ['MatchingGame', 8]])('%s samples the full glossary before applying its board limit', (name, size) => {
    const entries = Array.from({length: 14}, (_, i) => ({term: 'Term ' + i, def: 'Meaning ' + i}));
    const game = mount(name, {data: entries});
    expect(shuffle.mock.calls.some(([values]) => values.length === 14 && values[0].term === 'Term 0')).toBe(true);
    expect(game.container.textContent).toContain('Term 13');
    if (name === 'MatchingGame') expect(game.container.querySelectorAll('[data-help-key="matching_term_item"]')).toHaveLength(size);
  });
  it('Bingo replaces stale content and clears a card when the glossary becomes empty', () => {
    const game = mount('StudentBingoGame', {data: [data[0]]});
    expect(game.container.textContent).toContain('Planet');
    game.rerender({data: [data[1]], onClose: vi.fn()});
    expect(game.container.textContent).not.toContain('Planet'); expect(game.container.textContent).toContain('Orbit');
    game.rerender({data: [], onClose: vi.fn()});
    expect(game.container.querySelectorAll('[role="group"] button')).toHaveLength(0);
    expect(game.container.textContent).toContain('Add glossary terms');
  });
  it('Bingo preserves marks for equivalent data and rearms completion only for a new card', () => {
    const complete = vi.fn(), props = {data, onClose: vi.fn(), onGameComplete: complete};
    const game = mount('StudentBingoGame', props);
    click(game.container.querySelector('[role="group"] button'));
    game.rerender({...props, data: data.map(item => ({...item}))});
    expect(game.container.querySelector('[role="group"] button').getAttribute('aria-pressed')).toBe('true');
    for (const square of [...game.container.querySelectorAll('[role="group"] button')].slice(1, 5)) click(square);
    expect(complete).toHaveBeenCalledTimes(1);
    click(control(game.container, 'bingo_new_card'));
    expect(game.container.querySelector('[role="group"] button').getAttribute('aria-pressed')).toBe('false');
    for (const square of [...game.container.querySelectorAll('[role="group"] button')].slice(0, 5)) click(square);
    expect(complete).toHaveBeenCalledTimes(2);
  });
  it('Scramble hints lower the current word award even before the first earned point', () => {
    vi.useFakeTimers(); const onScoreUpdate = vi.fn();
    const {container} = mount('WordScrambleGame', {data: [data[0]], onScoreUpdate});
    click(container.querySelector('[aria-label="games.scramble.get_hint_aria"]'));
    input(container.querySelector('input'), 'Planet'); click(container.querySelector('[aria-label="common.check"]'));
    act(() => vi.advanceTimersByTime(1100));
    expect(onScoreUpdate).toHaveBeenCalledExactlyOnceWith(7, 'Word Scramble Complete');
  });
  it('Scramble hints cannot erase points already earned on earlier words', () => {
    vi.useFakeTimers(); const onScoreUpdate = vi.fn();
    const {container} = mount('WordScrambleGame', {data: data.slice(0, 2), onScoreUpdate});
    const first = data.find(item => container.textContent.includes(item.def));
    input(container.querySelector('input'), first.term); click(container.querySelector('[aria-label="common.check"]'));
    act(() => vi.advanceTimersByTime(1100));
    click(container.querySelector('[aria-label="games.scramble.get_hint_aria"]'));
    expect(container.textContent).toContain('flashcards.score_label 10');
    input(container.querySelector('input'), data.find(item => item.term !== first.term).term);
    click(container.querySelector('[aria-label="common.check"]')); act(() => vi.advanceTimersByTime(1100));
    expect(onScoreUpdate).toHaveBeenCalledExactlyOnceWith(17, 'Word Scramble Complete');
  });
});

describe('Definition Detective', () => {
  it('renders a labelled dialog, readable clue, and keyboard-native choices', () => {
    const {container} = mount('DefinitionDetectiveGame', {data});
    expect(container.querySelector('[role="dialog"]').getAttribute('aria-labelledby')).toBe('definition-detective-title');
    expect(container.querySelector('#detective-clue').textContent).toBeTruthy();
    expect(container.querySelectorAll('[data-help-key="detective_choice"]')).toHaveLength(3);
    expect(container.querySelector('progress').max).toBe(3);
  });
  it.each([undefined, [], [null, {}, {term: 'Only term'}], [{term: 'One', def: 'Same'}, {term: 'Two', def: 'Same'}]])('handles insufficient or ambiguous data without awarding completion: %j', invalid => {
    const complete = vi.fn(); const {container} = mount('DefinitionDetectiveGame', {data: invalid, onGameComplete: complete});
    expect(container.textContent).toContain('Add at least two terms');
    expect(container.querySelectorAll('[data-help-key="detective_choice"]')).toHaveLength(0);
    expect(complete).not.toHaveBeenCalled();
  });
  it('does not present synonyms sharing the clue as incorrect distractors', () => {
    const synonyms = [{term:'Planet',def:'A world'}, {term:'World',def:'A world'}, {term:'Star',def:'A light source'}];
    const {container} = mount('DefinitionDetectiveGame', {data: synonyms});
    for (let i = 0; i < 2; i++) {
      const clue = container.querySelector('#detective-clue').textContent;
      const buttons = [...container.querySelectorAll('[data-help-key="detective_choice"]')];
      const valid = buttons.filter(button => synonyms.some(item => item.term === button.textContent && item.def === clue));
      expect(valid).toHaveLength(1);
      click(valid[0]); click(control(container, 'detective_next'));
    }
    expect(container.textContent).toContain('Case closed!');
  });
  it('locks each answer and waits for the learner before advancing', () => {
    vi.useFakeTimers(); const {container} = mount('DefinitionDetectiveGame', {data});
    const clue = container.querySelector('#detective-clue').textContent;
    const choice = choiceForClue(container); click(choice); click(choice);
    expect(container.querySelector('progress').value).toBe(1);
    expect([...container.querySelectorAll('[data-help-key="detective_choice"]')].every(button => button.disabled)).toBe(true);
    act(() => vi.advanceTimersByTime(30000));
    expect(container.querySelector('#detective-clue').textContent).toBe(clue);
    expect(document.activeElement).toBe(container.querySelector('#detective-feedback-title'));
  });
  it('shows both meanings after a mistake and records an honest first-pass score once', () => {
    const onScoreUpdate = vi.fn(), onGameComplete = vi.fn();
    const game = mount('DefinitionDetectiveGame', {data, onScoreUpdate, onGameComplete});
    const right = choiceForClue(game.container);
    const wrong = [...game.container.querySelectorAll('[data-help-key="detective_choice"]')].find(button => button !== right);
    const selected = data.find(item => item.term === wrong.textContent);
    click(wrong); expect(game.container.textContent).toContain('Compare the meanings:'); expect(game.container.textContent).toContain(selected.def);
    click(control(game.container, 'detective_next')); finish(game.container);
    expect(onScoreUpdate).toHaveBeenCalledExactlyOnceWith(20, 'Definition Detective Complete');
    expect(onGameComplete).toHaveBeenCalledExactlyOnceWith('definitionDetective', expect.objectContaining({correctCount: 2, totalItems: 3, isPerfect: false}));
    const replacement = vi.fn(); game.rerender({data: data.map(item => ({...item})), onScoreUpdate, onGameComplete: replacement});
    expect(game.container.textContent).toContain('Case closed!'); expect(replacement).not.toHaveBeenCalled();
  });
  it('offers missed-clue practice without awarding points or another completion', () => {
    const onScoreUpdate = vi.fn(), onGameComplete = vi.fn();
    const {container} = mount('DefinitionDetectiveGame', {data, onScoreUpdate, onGameComplete});
    finish(container, true); click(control(container, 'detective_practice_missed'));
    expect(container.querySelector('progress').max).toBe(1);
    finish(container);
    expect(container.textContent).toContain('Practice complete');
    expect(onGameComplete).toHaveBeenCalledTimes(1); expect(onScoreUpdate).toHaveBeenCalledTimes(1);
  });
  it('preserves progress when only callback identities or equivalent rows change', () => {
    const game = mount('DefinitionDetectiveGame', {data});
    click(choiceForClue(game.container)); click(control(game.container, 'detective_next'));
    const clue = game.container.querySelector('#detective-clue').textContent;
    game.rerender({data: data.map(item => ({...item})), onClose: vi.fn(), onGameComplete: vi.fn()});
    expect(game.container.querySelector('#detective-clue').textContent).toBe(clue);
    expect(game.container.querySelector('progress').value).toBe(1);
  });
  it('resets when the glossary changes instead of carrying an old answer forward', () => {
    const game = mount('DefinitionDetectiveGame', {data});
    click(choiceForClue(game.container));
    game.rerender({data:[{term:'Alpha',def:'First Greek letter'}, {term:'Beta',def:'Second Greek letter'}], onClose: vi.fn()});
    expect(game.container.querySelector('progress').value).toBe(0);
    expect(game.container.textContent).not.toContain('A world orbiting');
  });
  it('connects the new activity to the glossary menu and shared completion callbacks', () => {
    const source = readFileSync('view_glossary_source.jsx', 'utf8');
    expect(source).toContain('data-help-key="glossary_definition_detective"');
    expect(source).toContain('onGameComplete={handleGameCompletion}');
    expect(window.AlloModules.DefinitionDetectiveGame).toBeTruthy();
  });
});

