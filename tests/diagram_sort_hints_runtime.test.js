import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, act, loadGames, mountGame } from './helpers/games_live_harness.js';

const cleanups = [];
const first = 'First destination';
const second = 'Second destination';
const shared = 'Overlap destination';
const itemText = 'Practice card';
const otherText = 'Remaining card';
const translations = {
  'games.ce_sort.causes_label': 'Cause destination',
  'games.ce_sort.effects_label': 'Effect destination',
  'concept_map.venn.move_incorrect': ({ item }) => `Not quite. Try sorting "${item}" again.`,
  'concept_map.venn.move_correct': ({ item, zone }) => `Correct! "${item}" belongs in ${zone}.`,
};

beforeAll(() => {
  window.AlloLanguageContext = React.createContext({
    t: (key, params = {}) => typeof translations[key] === 'function'
      ? translations[key](params) : translations[key] || key,
  });
  loadGames();
});

afterEach(() => {
  cleanups.splice(0).reverse().forEach(unmount => unmount());
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const click = element => {
  expect(element, 'interactive control exists').toBeTruthy();
  act(() => element.click());
};
const card = (container, fixture, text = itemText) => [...container.querySelectorAll(fixture.itemSelector)]
  .find(element => element.textContent.trim() === text);
const announcement = container => container.querySelector('[aria-live="polite"]').textContent.trim();
const visibleHint = container => container.querySelector('[data-diagram-sort-hint]');
const tipButton = container => container.querySelector('[data-diagram-sort-tip]');
const prompt = container => visibleHint(container)?.textContent.trim();
const replayButton = container => [...container.querySelectorAll('button')]
  .find(button => /play_again|Play [Aa]gain/.test(button.textContent));

function mount(fixture) {
  vi.useFakeTimers();
  const onGameComplete = vi.fn();
  const props = { onClose: vi.fn(), onGameComplete, ...fixture.props };
  const game = mountGame(fixture.name, props);
  cleanups.push(game.unmount);
  return { ...game, props, onGameComplete };
}

function expectPrivatePrompt(container, fixture) {
  expect(visibleHint(container), 'diagram guidance is visible').toBeTruthy();
  const text = prompt(container);
  expect(text.length).toBeGreaterThan(25);
  expect(text).not.toContain(fixture.correct);
  expect(text).not.toContain(fixture.wrong);
  expect(text).not.toContain('games.sort_');
  expect(tipButton(container).getAttribute('aria-expanded')).toBe('true');
  const panelId = tipButton(container).getAttribute('aria-controls');
  expect(panelId, 'tip control identifies its expanded guidance').toBeTruthy();
  expect(container.querySelector(`[id="${panelId}"]`)).toBeTruthy();
  return text;
}

function choose(container, fixture, destination, text = itemText) {
  click(card(container, fixture, text));
  const menu = container.querySelector(`[aria-labelledby="${fixture.menuId}"]`);
  expect(menu, 'select-and-place destination dialog').toBeTruthy();
  click([...menu.querySelectorAll('button')].find(button => button.textContent.includes(destination)));
}

function drag(container, fixture, destination) {
  const draggable = card(container, fixture).closest('[draggable="true"]');
  expect(draggable, 'card can be dragged from bank').toBeTruthy();
  const dataTransfer = { effectAllowed: '', dropEffect: '', setData: vi.fn(), getData: vi.fn() };
  const fire = (element, type) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
    act(() => element.dispatchEvent(event));
  };
  fire(draggable, 'dragstart');
  const dropZone = fixture.dropZone(container, destination);
  expect(dropZone, 'target drop zone exists').toBeTruthy();
  fire(dropZone, 'dragover');
  fire(dropZone, 'drop');
}

const venn = (isShared = false) => ({
  name: 'VennGame', label: isShared ? 'Venn overlap' : 'Venn single group',
  props: {
    data: { setA: isShared ? [] : [itemText], setB: [otherText], shared: isShared ? [itemText] : [] },
    titles: { setA: first, setB: second, shared },
  },
  correct: isShared ? shared : first, wrong: second,
  itemSelector: '[data-venn-item-id]', menuId: 'venn-move-menu-title',
  dropZone: (container, destination) => container.querySelector(`[data-help-key="venn_drop_zone_${destination === second ? 'b' : destination === shared ? 'shared' : 'a'}"]`),
  visible: true,
});
const branches = count => Array.from({ length: count }, (_, index) => ({
  title: index === 0 ? first : index === 1 ? second : `Other destination ${index}`,
  items: index === 0 ? [itemText] : index === 1 ? [otherText] : [],
}));
const bucket = name => ({
  name, label: name, props: { data: { branches: branches(2) } },
  correct: first, wrong: second, itemSelector: '[data-multi-bucket-item-id]',
  menuId: 'multi-bucket-move-title', visible: true,
  dropZone: (container, destination) => container.querySelector(`[aria-label="Bucket: ${destination}"]`),
});
const multiZone = (name, count) => ({
  name, label: name, props: { data: { branches: branches(count) } },
  correct: first, wrong: second, itemSelector: '[data-multi-zone-item-id]',
  menuId: 'multi-zone-move-title', visible: true,
  dropZone: (container, destination) => container.querySelector(`[aria-label="Drop zone: ${destination}"]`),
});
const fixtures = [
  venn(), venn(true),
  {
    name: 'CauseEffectSortGame', label: 'Cause and effect',
    props: { data: { causes: [itemText], effects: [otherText] } },
    correct: 'Cause destination', wrong: 'Effect destination',
    itemSelector: '[data-cause-effect-item-id]', menuId: 'cause-effect-move-menu-title', visible: true,
    dropZone: (container, destination) => container.querySelector(`[aria-label="${destination === 'Cause destination' ? 'Causes' : 'Effects'} drop zone"]`),
  },
  {
    name: 'TChartSortGame', label: 'T-chart',
    props: { data: { leftTitle: first, rightTitle: second, leftItems: [itemText], rightItems: [otherText] } },
    correct: first, wrong: second, itemSelector: '[data-tchart-item-id]',
    menuId: 'tchart-move-menu-title', visible: true,
    dropZone: (container, destination) => [...container.querySelectorAll('div')]
      .find(element => element.textContent.trim() === destination)?.parentElement,
  },
  ...['ConceptMapSortGame', 'OutlineSortGame', 'FishboneSortGame', 'ProblemSolutionSortGame'].map(bucket),
  multiZone('FrayerSortGame', 4), multiZone('SeeThinkWonderSortGame', 3), multiZone('StoryMapSortGame', 5),
  {
    ...multiZone('MultiZoneSortGame', 2),
    props: {
      data: { zones: { alpha: [itemText], beta: [otherText] } },
      zoneConfig: [{ id: 'alpha', label: first }, { id: 'beta', label: second }],
      gameKey: 'customSort', gameLabel: 'Custom diagram sort',
    },
  },
];

describe('diagram sort tips support reasoning without revealing destinations', () => {
  it.each(fixtures)('$label progresses per card across drag and select-and-place mistakes', fixture => {
    const { container, onGameComplete } = mount(fixture);
    expect(visibleHint(container)).toBeNull();
    choose(container, fixture, fixture.wrong);
    const firstHint = expectPrivatePrompt(container, fixture);
    expect(announcement(container)).toContain(firstHint);
    expect(announcement(container)).not.toContain(fixture.correct);

    // Hiding advice does not erase this card's mistake history.
    click(tipButton(container));
    expect(visibleHint(container)).toBeNull();
    drag(container, fixture, fixture.wrong);
    const reasoningHint = expectPrivatePrompt(container, fixture);
    expect(reasoningHint).not.toBe(firstHint);
    expect(announcement(container)).toContain(reasoningHint);
    expect(announcement(container)).not.toContain(fixture.correct);
    act(() => vi.advanceTimersByTime(60000));
    expect(prompt(container), 'reasoning guidance stays until the learner acts').toBe(reasoningHint);

    click(tipButton(container));
    click(tipButton(container));
    expect(prompt(container), 'reopening advice keeps the last card\'s reasoning prompt').toBe(reasoningHint);
    click(card(container, fixture));
    const menu = container.querySelector(`[aria-labelledby="${fixture.menuId}"]`);
    expect(visibleHint(container), 'selecting a card removes stale displayed advice').toBeNull();
    const menuTip = menu.querySelector('[data-diagram-sort-tip]');
    expect(menuTip, 'advice remains reachable inside the destination dialog').toBeTruthy();
    expect(menuTip.tagName).toBe('BUTTON');
    act(() => menuTip.focus());
    expect(document.activeElement).toBe(menuTip);
    click(menuTip);
    expect(prompt(container), 'manual advice uses the selected card\'s mistake history').toBe(reasoningHint);
    act(() => menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(container.querySelector(`[aria-labelledby="${fixture.menuId}"]`)).toBeNull();

    // A different card starts with basic guidance, regardless of total round errors.
    choose(container, fixture, fixture.correct, otherText);
    expect(expectPrivatePrompt(container, fixture)).toBe(firstHint);
    expect(announcement(container)).not.toContain(fixture.wrong);
    choose(container, fixture, fixture.wrong);
    expect(expectPrivatePrompt(container, fixture)).toBe(reasoningHint);
    expect(announcement(container)).toContain(reasoningHint);

    choose(container, fixture, fixture.correct);
    expect(announcement(container)).toContain(fixture.name === 'CauseEffectSortGame' ? 'is a Cause' : fixture.correct);
    expect(visibleHint(container)).toBeNull();
    expect(tipButton(container).getAttribute('aria-expanded')).toBe('false');
    choose(container, fixture, fixture.wrong, otherText);
    expect(onGameComplete).toHaveBeenCalledTimes(1);
    expect(onGameComplete.mock.calls[0][1]).toMatchObject({ incorrectAttempts: 4, score: 10 });

    click(replayButton(container));
    expect(visibleHint(container)).toBeNull();
    expect(card(container, fixture).closest('[draggable="true"]')).toBeTruthy();
    choose(container, fixture, fixture.wrong);
    expect(expectPrivatePrompt(container, fixture), 'replay resets each card\'s guidance level').toBe(firstHint);
  });

  it.each(fixtures)('$label offers free persistent advice and restores full first-try scoring on replay', fixture => {
    const { container, onGameComplete } = mount(fixture);
    const control = tipButton(container);
    expect(control, 'manual help is available before a mistake').toBeTruthy();
    expect(control.textContent.trim()).toBe('Sorting tip');
    expect(control.getAttribute('aria-expanded')).toBe('false');
    click(control);
    const generalHint = expectPrivatePrompt(container, fixture);
    expect(control.textContent.trim()).toBe('Hide tip');
    act(() => vi.advanceTimersByTime(60000));
    expect(prompt(container)).toBe(generalHint);
    click(control);
    expect(visibleHint(container)).toBeNull();
    expect(control.getAttribute('aria-expanded')).toBe('false');
    click(control);
    expect(prompt(container), 'requesting help again does not advance its level').toBe(generalHint);

    choose(container, fixture, fixture.correct);
    expect(visibleHint(container), 'successful placement clears old advice').toBeNull();
    click(tipButton(container));
    choose(container, fixture, fixture.wrong, otherText);
    expect(onGameComplete.mock.calls[0][1]).toMatchObject({ incorrectAttempts: 0, score: 40 });

    click(replayButton(container));
    expect(visibleHint(container)).toBeNull();
    click(tipButton(container));
    expect(prompt(container)).toBe(generalHint);
    choose(container, fixture, fixture.correct);
    choose(container, fixture, fixture.wrong, otherText);
    expect(onGameComplete).toHaveBeenCalledTimes(2);
    expect(onGameComplete.mock.calls[1][1]).toMatchObject({ incorrectAttempts: 0, score: 40 });
  });

  it.each(fixtures)('$label clears visible tips, card history, and scoring when data changes', fixture => {
    const game = mount(fixture);
    const { container, props, onGameComplete } = game;
    choose(container, fixture, fixture.wrong);
    const firstHint = expectPrivatePrompt(container, fixture);
    choose(container, fixture, fixture.wrong);
    expect(expectPrivatePrompt(container, fixture)).not.toBe(firstHint);
    click(card(container, fixture));
    const staleMenu = container.querySelector(`[aria-labelledby="${fixture.menuId}"]`);
    expect(staleMenu, 'a destination dialog is open for the old dataset').toBeTruthy();
    click(staleMenu.querySelector('[data-diagram-sort-tip]'));
    expect(visibleHint(container)).toBeTruthy();
    const data = JSON.parse(JSON.stringify(props.data).replaceAll(itemText, 'Replacement card'));
    game.rerender({ ...props, data });
    expect(container.querySelector(`[aria-labelledby="${fixture.menuId}"]`), 'data replacement closes the stale destination dialog').toBeNull();
    expect(visibleHint(container)).toBeNull();
    expect(tipButton(container).getAttribute('aria-expanded')).toBe('false');
    expect(card(container, fixture, 'Replacement card')).toBeTruthy();
    choose(container, fixture, fixture.wrong, 'Replacement card');
    expect(expectPrivatePrompt(container, fixture)).toBe(firstHint);
    choose(container, fixture, fixture.correct, 'Replacement card');
    choose(container, fixture, fixture.wrong, otherText);
    expect(onGameComplete.mock.calls[0][1]).toMatchObject({ incorrectAttempts: 1, score: 25 });

    game.rerender(props);
    expect(visibleHint(container)).toBeNull();
    choose(container, fixture, fixture.correct);
    choose(container, fixture, fixture.wrong, otherText);
    expect(onGameComplete).toHaveBeenCalledTimes(2);
    expect(onGameComplete.mock.calls[1][1]).toMatchObject({ incorrectAttempts: 0, score: 40 });
  });
});
