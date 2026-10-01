// 2026-09-27 review of the Sequence Builder and Concept Sort games.
// S2: picture alt text read the answer order (date) aloud during play and
//     ignored the teacher's reviewed description / decorative flag.
// S3: "Show answer" then "Play again" kept the no-points banner, and the
//     completion did not say the answer had been revealed.
// S5: "Why?" (an AI call) stayed visible with student AI turned off.
// C1: a card whose categoryId names no category made every check unwinnable;
//     an empty board rendered with no buckets; a card added in play was not
//     checked against the categories.
// C2: a board finished after "Fix the N incorrect" reported a first-try
//     perfect score with no misplacements.
// ALLO_GAMES_CANDIDATE (read by the harness) swaps in a scratch module for mutation checks.
import { afterEach, describe, expect, it } from 'vitest';
import { act, mountGame } from './helpers/games_live_harness.js';

let mounted = null;
afterEach(() => {
  if (mounted) mounted.unmount();
  mounted = null;
  delete window.__alloStudentAiDisabled;
});
const mount = (name, props) => { mounted = mountGame(name, props); return mounted.container; };
const buttons = (host) => Array.from(host.querySelectorAll('button'));
const byLabel = (host, label) => buttons(host).find((b) => (b.getAttribute('aria-label') || '') === label);
const byText = (host, text) => buttons(host).find((b) => b.textContent.includes(text) || (b.getAttribute('aria-label') || '').includes(text));
const click = (el) => { expect(el, 'element to click').toBeTruthy(); act(() => { el.click(); }); };

const PIC = 'data:image/png;base64,AAAA';
const sequence = (extra = {}) => ({
  progressionLabel: 'Time',
  items: [
    { date: '1492', event: 'Columbus sails', image: PIC, alt: 'Three ships on the sea', ...extra.first },
    { date: '1620', event: 'Mayflower lands', image: PIC, ...extra.second },
  ],
});
const timelineProps = (over = {}) => ({ data: sequence(), onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {}, onExplainIncorrect: async () => 'because', ...over });

describe('Sequence Builder picture alt text', () => {
  it('never speaks the date while playing, and uses the reviewed description', () => {
    const host = mount('TimelineGame', timelineProps());
    const alts = Array.from(host.querySelectorAll('img')).map((img) => img.getAttribute('alt'));
    expect(alts).toHaveLength(2);
    alts.forEach((alt) => { expect(alt).not.toMatch(/1492|1620/); });
    expect(alts).toContain('Three ships on the sea');
    expect(alts).toContain('Mayflower lands');
  });

  it('keeps a decorative picture silent', () => {
    const host = mount('TimelineGame', timelineProps({ data: sequence({ second: { decorative: true, alt: 'ignored' } }) }));
    const alts = Array.from(host.querySelectorAll('img')).map((img) => img.getAttribute('alt'));
    expect(alts).toContain('');
    expect(alts).not.toContain('ignored');
  });

  it('adds the date only once the order is shown', () => {
    const host = mount('TimelineGame', timelineProps());
    click(byLabel(host, 'timeline.game.reveal_aria'));
    const alts = Array.from(host.querySelectorAll('img')).map((img) => img.getAttribute('alt'));
    expect(alts).toContain('1492: Three ships on the sea');
    expect(alts).toContain('1620: Mayflower lands');
  });
});

describe('Sequence Builder reveal then replay', () => {
  it('clears the no-points banner for the new round and reports the reveal with the completion', () => {
    const completions = [];
    const host = mount('TimelineGame', timelineProps({ onGameComplete: (type, payload) => completions.push({ type, payload }) }));
    click(byLabel(host, 'timeline.game.reveal_aria'));
    expect(host.textContent).toContain('timeline.game.answer_revealed_banner');
    click(byLabel(host, 'timeline.game.reset_aria'));
    expect(host.textContent).not.toContain('timeline.game.answer_revealed_banner');
    // Two items are always dealt swapped; one move puts them in order.
    click(byLabel(host, 'move_down'));
    click(byLabel(host, 'common.check_order'));
    expect(completions).toHaveLength(1);
    expect(completions[0].payload.answerRevealed).toBe(true);
  });

  it('reports a clean win as not revealed', () => {
    const completions = [];
    const host = mount('TimelineGame', timelineProps({ onGameComplete: (type, payload) => completions.push({ type, payload }) }));
    click(byLabel(host, 'move_down'));
    click(byLabel(host, 'common.check_order'));
    expect(completions).toHaveLength(1);
    expect(completions[0].payload.answerRevealed).toBe(false);
  });
});

describe('Sequence Builder "Why?" follows the student AI setting', () => {
  const whyButtons = (host) => buttons(host).filter((b) => b.getAttribute('aria-label') === 'timeline.game.why_aria');
  it('shows Why? after a wrong check when AI is available', () => {
    const host = mount('TimelineGame', timelineProps());
    click(byLabel(host, 'common.check_order'));
    expect(whyButtons(host).length).toBeGreaterThan(0);
  });
  it('hides Why? when the host has turned student AI off', () => {
    window.__alloStudentAiDisabled = true;
    const host = mount('TimelineGame', timelineProps());
    click(byLabel(host, 'common.check_order'));
    expect(whyButtons(host)).toHaveLength(0);
  });
});

const card = (host, text) => Array.from(host.querySelectorAll('[role="button"][aria-label]')).find((el) => el.getAttribute('aria-label').startsWith(text + '.'));
const moveHere = (host) => Array.from(host.querySelectorAll('button[data-move-here]'));
function place(host, text, bucketIndex) {
  click(card(host, text));
  const targets = moveHere(host);
  expect(targets.length).toBeGreaterThan(bucketIndex);
  click(targets[bucketIndex]);
}
const CATS = [{ id: 'c1', label: 'Renewable', color: 'bg-green-500' }, { id: 'c2', label: 'Non-renewable', color: 'bg-red-500' }];
const sortProps = (data, over = {}) => ({ data, onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {}, ...over });

describe('Concept Sort never deals an unwinnable board', () => {
  it('leaves out a card whose category does not exist, says so, and the rest can be won', () => {
    const completions = [];
    const data = { categories: CATS, items: [
      { id: 'i1', content: 'Solar', categoryId: 'c1' },
      { id: 'i2', content: 'Coal', categoryId: 'c2' },
      { id: 'i3', content: 'Wind', categoryId: 'Renewable' },
    ] };
    const host = mount('ConceptSortGame', sortProps(data, { onGameComplete: (type, payload) => completions.push({ type, payload }) }));
    expect(card(host, 'Wind')).toBeUndefined();
    expect(host.querySelector('[data-concept-sort-orphans]')).not.toBeNull();
    place(host, 'Solar', 0);
    place(host, 'Coal', 1);
    click(byText(host, 'concept_sort.check_answers'));
    expect(completions.at(-1).type).toBe('conceptSort');
    expect(completions.at(-1).payload.totalItems).toBe(2);
  });

  it('shows a clear message instead of a board with no categories', () => {
    const host = mount('ConceptSortGame', sortProps({ categories: [], items: [{ id: 'i1', content: 'Solar', categoryId: 'c1' }] }));
    const alert = host.querySelector('[data-concept-sort-unplayable]');
    expect(alert).not.toBeNull();
    expect(alert.getAttribute('role')).toBe('alert');
    expect(card(host, 'Solar')).toBeUndefined();
  });

  it('does not add a card from play whose category is not on the board', async () => {
    const data = { categories: CATS, items: [{ id: 'i1', content: 'Solar', categoryId: 'c1' }] };
    const host = mount('ConceptSortGame', sortProps(data, { onGenerateItem: async () => ({ id: 'n1', content: 'Mystery', categoryId: 'zzz' }) }));
    const input = host.querySelector('[data-help-key="concept_sort_add_item"]');
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    act(() => { setValue.call(input, 'mystery'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => { host.querySelector('[data-help-key="concept_sort_add_btn"]').click(); });
    expect(card(host, 'Mystery')).toBeUndefined();
  });
});

describe('Concept Sort retry is not a first-try perfect', () => {
  it('reports the first misplacements, not perfect, and does not re-award locked cards', () => {
    const completions = [];
    const data = { categories: CATS, items: [
      { id: 'i1', content: 'Solar', categoryId: 'c1' },
      { id: 'i2', content: 'Wind', categoryId: 'c1' },
      { id: 'i3', content: 'Coal', categoryId: 'c2' },
      { id: 'i4', content: 'Oil', categoryId: 'c2' },
    ] };
    const host = mount('ConceptSortGame', sortProps(data, { onGameComplete: (type, payload) => completions.push({ type, payload }) }));
    place(host, 'Solar', 0);
    place(host, 'Wind', 0);
    place(host, 'Coal', 1);
    place(host, 'Oil', 0);
    click(byText(host, 'concept_sort.check_answers'));
    expect(completions.at(-1).type).toBe('conceptSortAttempt');
    const firstScore = completions.at(-1).payload.score;
    click(byText(host, 'concept_sort.retry_incorrect'));
    place(host, 'Oil', 1);
    click(byText(host, 'concept_sort.check_answers'));
    const done = completions.at(-1);
    expect(done.type).toBe('conceptSort');
    expect(done.payload.isPerfect).toBe(false);
    expect(done.payload.incorrectPlacements.map((p) => p.itemText)).toEqual(['Oil']);
    // Only the fixed card earns more; 3 locked cards are not paid twice.
    expect(done.payload.score).toBeLessThan(80);
    expect(done.payload.score).toBeGreaterThan(firstScore);
  });

  it('still reports a first-check perfect as perfect', () => {
    const completions = [];
    const data = { categories: CATS, items: [{ id: 'i1', content: 'Solar', categoryId: 'c1' }, { id: 'i3', content: 'Coal', categoryId: 'c2' }] };
    const host = mount('ConceptSortGame', sortProps(data, { onGameComplete: (type, payload) => completions.push({ type, payload }) }));
    place(host, 'Solar', 0);
    place(host, 'Coal', 1);
    click(byText(host, 'concept_sort.check_answers'));
    expect(completions.at(-1).payload).toMatchObject({ isPerfect: true, incorrectPlacements: [], score: 40 });
  });
});
