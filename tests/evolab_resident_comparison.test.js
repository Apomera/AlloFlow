import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_evolab.js'), 'utf8');
const start = source.indexOf('  function ArchipelagoFieldCard(props) {');
const end = source.indexOf('  var archipelagoCSS = `', start);
if (start < 0 || end <= start) throw new Error('ArchipelagoFieldCard source boundaries were not found');
// Evaluate only the production component. Its real model comes from the regular
// tool loader; the injected dependencies only provide the surrounding labels.
const buildFieldCard = new Function('ArchipelagoModel', 'ax', 'archSpecies', 'archTrait', 'archIslandName',
  'return (' + source.slice(start, end).trim() + ');');

let model, FieldCard, previousActEnvironment;
const mounted = [];
const noop = () => {};

beforeEach(() => {
  previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  localStorage.clear();
  loadTool('stem_lab/stem_tool_evolab.js', 'evoLab');
  model = window.StemLab.evoArchipelagoModel;
  FieldCard = buildFieldCard(model, (key, fallback) => fallback,
    sp => sp === 'birds' ? 'Seedwing birds' : 'Shellseed plants',
    sp => sp === 'birds' ? 'Beak strength' : 'Seed-shell hardness',
    island => model.islands[island].name);
});

afterEach(() => {
  mounted.splice(0).forEach(({ root, host }) => {
    act(() => root.unmount());
    host.remove();
  });
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
});

function resident(id, genes, marker = [1, 0], born = 0, species = 'birds') {
  return Object.freeze({ id, born, species, genes: Object.freeze(genes.slice()),
    marker: Object.freeze(marker.slice()), parents: Object.freeze([]), inheritance: Object.freeze([]) });
}

function frame(organisms, generation = 0, displayedIsland = 0, plants = []) {
  return Object.freeze({ generation, round: null, demes: Object.freeze(Array.from({ length: 3 }, (_, island) =>
    Object.freeze({ birds: Object.freeze(island === displayedIsland ? organisms.slice() : []),
      plants: Object.freeze(island === displayedIsland ? plants.slice() : []) }))) });
}

// These small, immutable birth cohorts exercise presentation and lookup. They
// are not saved-world restore fixtures or new biological model trajectories.
function world(organisms) {
  return { version: 1, seed: 2026, generation: 0, history: [frame(organisms)],
    settings: { migration: .12, reciprocal: true, selection: true, mutation: .01, rainfall: [.15, .5, .85] } };
}

function mountFieldCard(expedition, selected, initialProps = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  mounted.push({ root, host });
  let props = { React, world: expedition, frame: expedition.history[0], island: 0, species: 'birds',
    selected, resident: model.find(expedition, selected), onPick: noop, onSpecies: noop,
    onRecord: noop, onBirth: noop, onInspectReference: noop, ...initialProps };
  function rerender(patch = {}) {
    props = { ...props, ...patch };
    act(() => root.render(React.createElement(FieldCard, props)));
  }
  rerender();
  return { host, rerender };
}

function button(host, text) {
  const result = [...host.querySelectorAll('button')].find(node => node.textContent === text);
  if (!result) throw new Error('Missing field-card button: ' + text);
  return result;
}

function pinAndCompare(expedition, first, second) {
  const view = mountFieldCard(expedition, first.id);
  act(() => button(view.host, 'Pin this organism for comparison').click());
  expect(view.host.querySelector('[data-field-compare="same"]')).toBeTruthy();
  view.rerender({ selected: second.id, resident: model.find(expedition, second.id) });
  expect(view.host.querySelector('[data-field-compare="ready"]')).toBeTruthy();
  return view;
}

function comparisonCopies(host, side) {
  return [...host.querySelectorAll('[data-field-comparison-side="' + side + '"] [data-field-comparison-copy]')]
    .map(node => node.textContent);
}

describe('archipelago resident comparison scientific boundaries', () => {
  it('compares unordered trait copies and A/a versus a/A as the same genotype with zero index difference', () => {
    const first = resident(1, [.2, .8], [1, 0]), second = resident(2, [.8, .2], [0, 1]);
    const { host } = pinAndCompare(world([first, second]), first, second);
    expect(comparisonCopies(host, 'A')).toEqual(['0.2000', '0.8000']);
    expect(comparisonCopies(host, 'B')).toEqual(['0.8000', '0.2000']);
    expect([...host.querySelectorAll('[data-field-comparison-marker]')].map(node => node.textContent)).toEqual(['A/a', 'a/A']);
    expect(host.querySelector('[data-field-comparison-genes]').getAttribute('data-field-comparison-genes')).toBe('same');
    expect(host.querySelector('[data-field-comparison-genotype]').getAttribute('data-field-comparison-genotype')).toBe('same');
    const difference = host.querySelector('[data-field-comparison-difference]');
    expect(Number(difference.getAttribute('data-field-comparison-difference'))).toBe(0);
    expect(difference.textContent).toBe('0.00 index points');
  });

  it('shows different copy pairs when two residents have exactly the same trait average', () => {
    const first = resident(1, [.2, .8]), second = resident(2, [.4, .6]);
    const { host } = pinAndCompare(world([first, second]), first, second);
    expect([...host.querySelectorAll('[data-field-comparison-trait]')].map(node =>
      Number(node.getAttribute('data-field-comparison-trait')))).toEqual([.5, .5]);
    expect(Number(host.querySelector('[data-field-comparison-difference]').getAttribute('data-field-comparison-difference'))).toBe(0);
    expect(host.querySelector('[data-field-comparison-genes]').getAttribute('data-field-comparison-genes')).toBe('different');
    expect(host.querySelector('[data-field-comparison-genes]').textContent).toBe('Different trait-copy pairs');
  });

  it('matches unrounded copies even when the displayed copies and index difference round to the same values', () => {
    const first = resident(1, [.200001, .800001]), second = resident(2, [.200002, .800002]);
    const { host } = pinAndCompare(world([first, second]), first, second);
    expect(comparisonCopies(host, 'A')).toEqual(['0.2000', '0.8000']);
    expect(comparisonCopies(host, 'B')).toEqual(comparisonCopies(host, 'A'));
    expect(host.querySelector('[data-field-comparison-genes]').getAttribute('data-field-comparison-genes')).toBe('different');
    const difference = host.querySelector('[data-field-comparison-difference]');
    expect(Number(difference.getAttribute('data-field-comparison-difference'))).toBeGreaterThan(0);
    expect(Number(difference.getAttribute('data-field-comparison-difference'))).toBeCloseTo(.0001, 12);
    expect(difference.textContent).toBe('+0.00 index points');
  });

  it('keeps the pin across settings and appended history but clears it for a replacement founding frame with the same seed', () => {
    const first = resident(1, [.2, .8]), second = resident(2, [.4, .6]);
    const initial = world([first, second]), { host, rerender } = pinAndCompare(initial, first, second);
    const queuedSettings = { ...initial, settings: { ...initial.settings, migration: .3 } };
    rerender({ world: queuedSettings });
    expect(host.querySelector('[data-field-reference]').getAttribute('data-field-reference')).toBe('1');
    expect(host.querySelector('[data-field-compare="ready"]')).toBeTruthy();

    const child = resident(3, [.3, .7], [0, 0], 1), nextFrame = frame([child], 1);
    const appended = { ...queuedSettings, generation: 1, history: [...initial.history, nextFrame] };
    rerender({ world: appended, frame: nextFrame, selected: child.id, resident: model.find(appended, child.id) });
    expect(host.querySelector('[data-field-reference]').getAttribute('data-field-reference')).toBe('1');
    expect(host.querySelector('[data-field-comparison-side="A"] h4').textContent).toContain('#1');
    expect(host.querySelector('[data-field-comparison-side="B"] h4').textContent).toContain('#3');

    // The reused seed and IDs must not turn an old pin into a different resident.
    const replacement = world([resident(1, [.1, .1], [0, 0]), resident(2, [.9, .9], [1, 1])]);
    expect(replacement.seed).toBe(initial.seed);
    expect(replacement.history[0]).not.toBe(initial.history[0]);
    rerender({ world: replacement, frame: replacement.history[0], selected: 2, resident: model.find(replacement, 2) });
    expect(host.querySelector('[data-arch-field-card]').getAttribute('data-arch-field-card')).toBe('2');
    expect(host.querySelector('[data-field-reference]')).toBeNull();
    expect(button(host, 'Pin this organism for comparison').getAttribute('aria-pressed')).toBe('false');
    act(() => button(host, 'Pin this organism for comparison').click());
    expect(host.querySelector('[data-field-reference]').getAttribute('data-field-reference')).toBe('2');
    expect(host.querySelector('[data-field-compare="same"]')).toBeTruthy();
  });

  it('finds deliberate marker examples in cohort order and uses the displayed island, generation and pinned species', () => {
    const reference = resident(1, [.2, .8], [1, 0]);
    const founders = [reference, resident(2, [.1, .3], [0, 1]), resident(3, [.4, .4], [1, 1]),
      resident(4, [.6, .6], [1, 0]), resident(5, [.7, .9], [0, 0])];
    const initial = world(founders);
    const recordedBirds = [resident(10, [.1, .2], [0, 1], 1), resident(11, [.3, .4], [0, 0], 1),
      resident(12, [.5, .6], [1, 0], 1)];
    const plant = resident(20, [.7, .8], [1, 1], 1, 'plants');
    const displayedFrame = frame(recordedBirds, 1, 1, [plant]);
    const latestFrame = frame([resident(30, [.2, .2], [0, 0], 2), resident(31, [.8, .8], [1, 1], 2)], 2, 1);
    const expedition = { ...initial, generation: 2, history: [initial.history[0], displayedFrame, latestFrame] };
    const original = JSON.stringify(expedition), picks = [];
    let view;
    view = mountFieldCard(expedition, reference.id, { onPick: pick => {
      picks.push(pick);
      view.rerender({ selected: pick.id, species: pick.species, resident: model.find(expedition, pick.id) });
    } });
    const { host, rerender } = view;
    act(() => button(host, 'Pin this organism for comparison').click());

    // A/a and a/A both match, but the pinned organism is never a candidate.
    const foundingSearch = host.querySelector('[data-field-search-island="0"][data-field-search-generation="0"][data-field-search-species="birds"]');
    expect(foundingSearch).toBeTruthy();
    expect(foundingSearch.querySelector('[data-field-search-same]').getAttribute('data-field-search-same')).toBe('2');
    expect(foundingSearch.querySelector('[data-field-search-different]').getAttribute('data-field-search-different')).toBe('2');
    for (const category of ['same', 'same', 'different', 'different', 'same', 'same']) {
      act(() => button(host, 'Find ' + category + ' marker genotype').click());
    }
    // Switching categories starts after the selected resident in the full
    // cohort. Repeated searches wrap without selecting the pinned reference.
    expect(picks).toEqual([2, 4, 5, 3, 4, 2].map(id => ({ id, species: 'birds', island: 0 })));

    rerender({ frame: displayedFrame, island: 1, species: 'plants', selected: plant.id,
      resident: model.find(expedition, plant.id) });
    expect(host.querySelector('[data-field-compare="species"]')).toBeTruthy();
    const recordedSearch = host.querySelector('[data-field-search-island="1"][data-field-search-generation="1"][data-field-search-species="birds"]');
    expect(recordedSearch).toBeTruthy();
    expect(recordedSearch.querySelector('[data-field-search-same]').getAttribute('data-field-search-same')).toBe('2');
    expect(recordedSearch.querySelector('[data-field-search-different]').getAttribute('data-field-search-different')).toBe('1');
    expect(recordedSearch.textContent).toContain('Tide');
    expect(recordedSearch.textContent).toMatch(/G1\b/);
    expect(recordedSearch.textContent).toContain('Seedwing birds');
    expect(recordedSearch.textContent).toMatch(/deliberat/i);
    expect(recordedSearch.textContent).toMatch(/do not draw a random sample/i);
    expect(recordedSearch.textContent).toMatch(/or explain an evolutionary cause/i);
    for (const category of ['same', 'different', 'same', 'same']) {
      act(() => button(host, 'Find ' + category + ' marker genotype').click());
    }
    expect(picks.slice(6)).toEqual([10, 11, 12, 10].map(id => ({ id, species: 'birds', island: 1 })));
    expect(host.querySelector('#ea-field-resident').value).toBe('10');
    expect(host.querySelector('[data-arch-field-card]').getAttribute('data-arch-field-card')).toBe('10');
    expect(host.querySelector('[data-field-reference]').getAttribute('data-field-reference')).toBe('1');
    expect(JSON.stringify(expedition)).toBe(original);
  });

  it('disables each unavailable marker category for reference-only, empty and one-category cohorts', () => {
    const reference = resident(1, [.2, .8], [1, 0]), initial = world([reference]), picks = [];
    let currentWorld = initial, view;
    view = mountFieldCard(initial, reference.id, { onPick: pick => {
      picks.push(pick);
      view.rerender({ selected: pick.id, species: pick.species, resident: model.find(currentWorld, pick.id) });
    } });
    const { host, rerender } = view;
    act(() => button(host, 'Pin this organism for comparison').click());
    const original = JSON.stringify(initial);
    for (const category of ['same', 'different']) {
      const searchButton = button(host, 'Find ' + category + ' marker genotype');
      expect(searchButton.disabled).toBe(true);
      expect(host.querySelector('[data-field-search-' + category + ']').getAttribute('data-field-search-' + category)).toBe('0');
      act(() => searchButton.click());
    }
    expect(picks).toEqual([]);
    expect(JSON.stringify(initial)).toBe(original);

    const cases = [
      { organisms: [], available: null },
      { organisms: [resident(2, [.1, .3], [0, 1], 1)], available: 'same' },
      { organisms: [resident(3, [.6, .9], [1, 1], 1)], available: 'different' }
    ];
    for (const { organisms, available } of cases) {
      const displayedFrame = frame(organisms, 1);
      currentWorld = { ...initial, generation: 1, history: [initial.history[0], displayedFrame] };
      const capturedWorld = JSON.stringify(currentWorld), before = picks.length;
      rerender({ world: currentWorld, frame: displayedFrame, selected: reference.id,
        resident: model.find(currentWorld, reference.id) });
      expect(host.querySelector('[data-field-search-generation="1"]')).toBeTruthy();
      for (const category of ['same', 'different']) {
        const searchButton = button(host, 'Find ' + category + ' marker genotype');
        expect(searchButton.disabled).toBe(category !== available);
        expect(host.querySelector('[data-field-search-' + category + ']').getAttribute('data-field-search-' + category))
          .toBe(category === available ? '1' : '0');
        if (category !== available) act(() => searchButton.click());
      }
      expect(picks).toHaveLength(before);
      if (available) {
        act(() => button(host, 'Find ' + available + ' marker genotype').click());
        expect(picks.slice(before)).toEqual([{ id: organisms[0].id, species: 'birds', island: 0 }]);
      }
      expect(JSON.stringify(currentWorld)).toBe(capturedWorld);
    }
  });
});
