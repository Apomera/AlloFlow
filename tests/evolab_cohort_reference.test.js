import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_evolab.js'), 'utf8');
const start = source.indexOf('  function ArchipelagoFieldCard(props) {');
const end = source.indexOf('  var archipelagoCSS = `', start);
if (start < 0 || end <= start) throw new Error('ArchipelagoFieldCard source boundaries were not found');
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

function resident(id, value, born = 0, species = 'birds') {
  return Object.freeze({ id, born, species, genes: Object.freeze([value, value]), marker: Object.freeze([1, 0]),
    parents: Object.freeze([]), inheritance: Object.freeze([]) });
}

function frame(generation, populations) {
  return Object.freeze({ generation, round: null, demes: Object.freeze(Array.from({ length: 3 }, (_, island) => {
    const cohort = populations[island] || {};
    return Object.freeze({ birds: Object.freeze((cohort.birds || []).slice()), plants: Object.freeze((cohort.plants || []).slice()) });
  })) });
}

// Frozen birth records isolate display arithmetic and reference state. These
// fixtures are intentionally not restored simulation trajectories.
function expedition() {
  const birds = [0, .2, .4, .6, .8, 1].map((value, i) => resident(i + 1, value));
  const plants = [resident(40, .24, 0, 'plants'), resident(41, .27, 0, 'plants')];
  const otherBirds = [resident(50, .1), resident(51, .8)];
  const laterBirds = Array.from({ length: 24 }, (_, i) => resident(101 + i, [.1, .35, .65, .95][Math.floor(i / 6)], 1));
  const history = Object.freeze([frame(0, { 0: { birds, plants }, 1: { birds: otherBirds } }),
    frame(1, { 0: { birds: laterBirds }, 1: { birds: [resident(150, .7, 1)] } })]);
  const world = Object.freeze({ version: 1, seed: 2026, smallFounders: true, rng: 123456789, nextId: 151, generation: 1, history,
    settings: Object.freeze({ migration: .12, reciprocal: true, selection: true, mutation: .01, rainfall: Object.freeze([.15, .5, .85]) }) });
  return { world, birds, plants, otherBirds, laterBirds };
}

function mountFieldCard(world, selected = null, initialProps = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  mounted.push({ root, host });
  let props = { React, world, frame: world.history[0], island: 0, species: 'birds', selected,
    resident: model.find(world, selected), onPick: vi.fn(), onSpecies: noop, onRecord: noop, onBirth: noop,
    onInspectReference: noop, onObservationFinding: vi.fn(), onJournal: vi.fn(), onVisitCohort: vi.fn(), ...initialProps };
  function rerender(patch = {}) {
    props = { ...props, ...patch };
    act(() => root.render(React.createElement(FieldCard, props)));
  }
  rerender();
  return { host, rerender };
}

function namedButton(host, name) {
  const button = [...host.querySelectorAll('button')].find(node => node.textContent === name);
  expect(button).toBeTruthy();
  expect(button.tagName).toBe('BUTTON');
  return button;
}

function clickNamed(host, name) {
  const button = namedButton(host, name);
  act(() => button.click());
  return button;
}

function variation(host) {
  const region = host.querySelector('[data-field-variation-island]');
  expect(region).toBeTruthy();
  return region;
}

function bands(host) {
  const result = [...variation(host).querySelectorAll('[data-field-variation-band]')];
  expect(result).toHaveLength(5);
  return result;
}

function reference(host, state, generation = 0, island = 0, species = 'birds') {
  const region = host.querySelector('[data-field-cohort-comparison]');
  expect(region).toBeTruthy();
  const label = region.getAttribute('aria-label') || (region.getAttribute('aria-labelledby') || '').split(/\s+/)
    .map(id => document.getElementById(id)?.textContent || '').join(' ');
  expect(label).toBe('Pinned cohort comparison');
  expect(region.getAttribute('data-field-cohort-comparison')).toBe(state);
  expect(region.getAttribute('data-field-cohort-reference-generation')).toBe(String(generation));
  expect(region.getAttribute('data-field-cohort-reference-island')).toBe(String(island));
  expect(region.getAttribute('data-field-cohort-reference-species')).toBe(species);
  return region;
}

function attributeNode(region, attribute) {
  return region.hasAttribute(attribute) ? region : region.querySelector('[' + attribute + ']');
}

function statistic(region, attribute, expected) {
  const node = attributeNode(region, attribute);
  if (expected === undefined) expect(node).toBeNull();
  else {
    expect(node).toBeTruthy();
    expect(Number(node.getAttribute(attribute))).toBeCloseTo(expected, 13);
  }
}

function expectShares(host, aCounts, bCounts) {
  const aTotal = aCounts.reduce((sum, count) => sum + count, 0);
  const bTotal = bCounts.reduce((sum, count) => sum + count, 0);
  expect(bands(host).map(button => Number(button.getAttribute('data-field-cohort-reference-count')))).toEqual(aCounts);
  expect(bands(host).map(button => Number(button.getAttribute('data-field-variation-count')))).toEqual(bCounts);
  for (const [side, counts, total] of [['A', aCounts, aTotal], ['B', bCounts, bTotal]]) {
    const bars = [...variation(host).querySelectorAll('[data-field-cohort-bar="' + side + '"]')];
    expect(bars).toHaveLength(5);
    bars.forEach((bar, i) => {
      expect(bar.getAttribute('data-field-cohort-band')).toBe(String(i));
      if (total) expect(Number(bar.getAttribute('data-field-cohort-share'))).toBeCloseTo(counts[i] / total, 13);
      else expect(bar.hasAttribute('data-field-cohort-share')).toBe(false);
    });
  }
  const details = [...variation(host).querySelectorAll('details')].find(node => node.querySelector('summary')?.textContent === 'Read cohort comparison values');
  expect(details).toBeTruthy();
  expect(details.querySelector('table')).toBeTruthy();
  const rows = [...details.querySelectorAll('[data-field-cohort-row]')];
  expect(rows).toHaveLength(5);
  rows.forEach((row, i) => {
    expect(row.getAttribute('data-field-cohort-row')).toBe(String(i));
    for (const [side, counts, total] of [['A', aCounts, aTotal], ['B', bCounts, bTotal]]) {
      const cell = row.querySelector('[data-field-cohort-table-side="' + side + '"]');
      expect(cell).toBeTruthy();
      expect(Number(cell.getAttribute('data-field-cohort-count'))).toBe(counts[i]);
      if (total) expect(Number(cell.getAttribute('data-field-cohort-share'))).toBeCloseTo(counts[i] / total, 13);
      else expect(cell.hasAttribute('data-field-cohort-share')).toBe(false);
    }
    statistic(row, 'data-field-cohort-share-difference', aTotal && bTotal ? 100 * (bCounts[i] / bTotal - aCounts[i] / aTotal) : undefined);
  });
}

describe('archipelago pinned cohort comparison', () => {
  it('preserves exact band boundaries and compares normalized shares for unequal six- and 24-organism cohorts', () => {
    const fixture = expedition(), pick = vi.fn(), original = JSON.stringify(fixture.world);
    const { host, rerender } = mountFieldCard(fixture.world, null, { onPick: pick });
    expect(namedButton(variation(host), 'Pin displayed cohort as reference').disabled).toBe(false);
    clickNamed(variation(host), 'Pin displayed cohort as reference');
    reference(host, 'same');
    expect(namedButton(variation(host), 'Pin displayed cohort as reference').disabled).toBe(true);
    expect(namedButton(host, 'Visit reference cohort').disabled).toBe(true);
    rerender({ frame: fixture.world.history[1] });
    const region = reference(host, 'ready');
    statistic(region, 'data-field-cohort-reference-total', 6);
    statistic(region, 'data-field-cohort-reference-mean', .5);
    const bMean = fixture.laterBirds.reduce((sum, organism) => sum + model.value(organism), 0) / 24;
    statistic(region, 'data-field-cohort-difference', (bMean - .5) * 100);
    expectShares(host, [1, 1, 1, 1, 2], [6, 6, 0, 6, 6]);
    act(() => bands(host)[1].click());
    const residents = [...variation(host).querySelectorAll('[data-field-variation-resident]')];
    expect(residents.map(button => Number(button.getAttribute('data-field-variation-resident')))).toEqual([107, 108, 109, 110, 111, 112]);
    expect(pick).not.toHaveBeenCalled();
    act(() => residents[0].click());
    expect(pick).toHaveBeenCalledExactlyOnceWith({ id: 107, species: 'birds', island: 0 });
    expect(variation(host).querySelector('[aria-live], [role="status"], [role="alert"]')).toBeNull();
    expect(JSON.stringify(fixture.world)).toBe(original);
  });

  it('keeps undefined shares and means distinct from zero for empty reference and displayed cohorts', () => {
    const fixture = expedition(), original = JSON.stringify(fixture.world);
    const { host, rerender } = mountFieldCard(fixture.world, null, { island: 2 });
    clickNamed(variation(host), 'Pin displayed cohort as reference');
    reference(host, 'same', 0, 2);
    rerender({ island: 0, frame: fixture.world.history[1] });
    let region = reference(host, 'ready', 0, 2);
    statistic(region, 'data-field-cohort-reference-total', 0);
    statistic(region, 'data-field-cohort-reference-mean', undefined);
    statistic(region, 'data-field-cohort-difference', undefined);
    expectShares(host, [0, 0, 0, 0, 0], [6, 6, 0, 6, 6]);
    expect(variation(host).textContent).not.toMatch(/NaN|Infinity/);
    clickNamed(variation(host), 'Pin displayed cohort as reference');
    rerender({ island: 2 });
    region = reference(host, 'ready', 1);
    statistic(region, 'data-field-cohort-reference-total', 24);
    statistic(region, 'data-field-cohort-difference', undefined);
    expectShares(host, [6, 6, 0, 6, 6], [0, 0, 0, 0, 0]);
    clickNamed(variation(host), 'Pin displayed cohort as reference');
    rerender({ frame: fixture.world.history[0] });
    region = reference(host, 'ready', 1, 2);
    statistic(region, 'data-field-cohort-reference-mean', undefined);
    statistic(region, 'data-field-cohort-difference', undefined);
    expectShares(host, [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]);
    expect(variation(host).textContent).not.toMatch(/NaN|Infinity/);
    expect(JSON.stringify(fixture.world)).toBe(original);
  });

  it('distinguishes geography, time, and species contexts and clears references when the founding world is replaced', () => {
    const fixture = expedition(), visit = vi.fn(), original = JSON.stringify(fixture.world);
    const { host, rerender } = mountFieldCard(fixture.world, null, { onVisitCohort: visit });
    clickNamed(variation(host), 'Pin displayed cohort as reference');
    rerender({ island: 1 });
    const spatialCopy = reference(host, 'ready').textContent;
    clickNamed(host, 'Visit reference cohort');
    expect(visit).toHaveBeenCalledExactlyOnceWith({ generation: 0, island: 0, species: 'birds' });
    rerender({ island: 0, frame: fixture.world.history[1] });
    const temporalCopy = reference(host, 'ready').textContent;
    rerender({ island: 1 });
    const bothCopy = reference(host, 'ready').textContent;
    expect(spatialCopy).not.toBe(temporalCopy);
    expect(bothCopy).not.toBe(spatialCopy);
    expect(bothCopy).not.toBe(temporalCopy);
    rerender({ island: 0, species: 'plants', frame: fixture.world.history[0] });
    reference(host, 'species');
    expect(variation(host).querySelector('[data-field-cohort-bar]')).toBeNull();
    expect(variation(host).querySelector('[data-field-cohort-difference]')).toBeNull();
    expect(variation(host).querySelector('[data-field-cohort-row]')).toBeNull();
    expect(namedButton(variation(host), 'Pin displayed cohort as reference').disabled).toBe(false);
    rerender({ onVisitCohort: undefined });
    expect(namedButton(host, 'Visit reference cohort').disabled).toBe(true);
    const replacement = expedition();
    expect(replacement.world.seed).toBe(fixture.world.seed);
    // Keep the displayed frame unchanged to isolate founding-frame identity.
    rerender({ world: replacement.world });
    expect(host.querySelector('[data-field-cohort-comparison]')).toBeNull();
    expect(namedButton(variation(host), 'Pin displayed cohort as reference').disabled).toBe(false);
    rerender({ world: fixture.world, species: 'birds' });
    expect(host.querySelector('[data-field-cohort-comparison]')).toBeNull();
    clickNamed(variation(host), 'Pin displayed cohort as reference');
    clickNamed(host, 'Clear cohort reference');
    expect(host.querySelector('[data-field-cohort-comparison]')).toBeNull();
    expect(document.activeElement).toBe(host.querySelector('#ea-field-variation-title'));
    expect(JSON.stringify(fixture.world)).toBe(original);
  });

  it('keeps the cohort snapshot, organism pin, and captured observation independent while navigating', () => {
    const fixture = expedition(), pick = vi.fn(), finding = vi.fn(), original = JSON.stringify(fixture.world);
    const { host, rerender } = mountFieldCard(fixture.world, 1, { onPick: pick, onObservationFinding: finding });
    clickNamed(host, 'Pin this organism for comparison');
    rerender({ selected: 2, resident: model.find(fixture.world, 2) });
    clickNamed(host, 'Capture this comparison');
    const capturedText = host.querySelector('.ea-field-observation-evidence').textContent;
    clickNamed(variation(host), 'Pin displayed cohort as reference');
    const queued = { ...fixture.world, settings: { ...fixture.world.settings, migration: .3 } };
    const queuedOriginal = JSON.stringify(queued);
    rerender({ world: queued, selected: 6, resident: model.find(fixture.world, 6) });
    reference(host, 'same');
    rerender({ frame: fixture.world.history[1], island: 1, selected: 150, resident: model.find(fixture.world, 150) });
    let region = reference(host, 'ready');
    statistic(region, 'data-field-cohort-reference-total', 6);
    statistic(region, 'data-field-cohort-reference-mean', .5);
    expectShares(host, [1, 1, 1, 1, 2], [0, 0, 0, 1, 0]);
    rerender({ species: 'plants', selected: null, resident: null });
    reference(host, 'species');
    rerender({ species: 'birds', island: 0 });
    region = reference(host, 'ready');
    statistic(region, 'data-field-cohort-reference-mean', .5);
    expectShares(host, [1, 1, 1, 1, 2], [6, 6, 0, 6, 6]);
    act(() => bands(host)[4].click());
    const selected = variation(host).querySelector('[data-field-variation-resident="119"]');
    expect(selected).toBeTruthy();
    act(() => selected.click());
    expect(pick).toHaveBeenCalledExactlyOnceWith({ id: 119, species: 'birds', island: 0 });
    rerender({ selected: 119, resident: model.find(fixture.world, 119) });
    expect(host.querySelector('[data-field-reference]').getAttribute('data-field-reference')).toBe('1');
    expect(host.querySelector('[data-field-observation="ready"]').getAttribute('data-field-observation-b')).toBe('2');
    expect(host.querySelector('.ea-field-observation-evidence').textContent).toBe(capturedText);
    clickNamed(host, 'Clear cohort reference');
    expect(host.querySelector('[data-field-cohort-comparison]')).toBeNull();
    expect(host.querySelector('[data-field-reference]').getAttribute('data-field-reference')).toBe('1');
    expect(host.querySelector('.ea-field-observation-evidence').textContent).toBe(capturedText);
    expect(finding).not.toHaveBeenCalled();
    expect(JSON.stringify(fixture.world)).toBe(original);
    expect(JSON.stringify(queued)).toBe(queuedOriginal);
    expect(fixture.world.rng).toBe(123456789);
  });
});
