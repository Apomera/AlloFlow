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

// Immutable birth records isolate the explorer's cohort arithmetic and React
// state; these fixtures do not substitute for a saved simulation trajectory.
function expedition(birds = [resident(1, 0), resident(2, .2), resident(3, .4), resident(4, .6), resident(5, .8), resident(6, 1)]) {
  const plants = [resident(40, .24, 0, 'plants'), resident(41, .27, 0, 'plants')];
  const otherBirds = [resident(50, .26), resident(51, .72)];
  const laterBirds = [resident(101, .22, 1), resident(102, .35, 1)];
  const history = Object.freeze([frame(0, { 0: { birds, plants }, 1: { birds: otherBirds } }),
    frame(1, { 0: { birds: laterBirds } })]);
  const world = Object.freeze({ version: 1, seed: 2026, smallFounders: true, rng: 123456789, nextId: 103, generation: 1, history,
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
    onInspectReference: noop, onObservationFinding: vi.fn(), onJournal: vi.fn(), ...initialProps };
  function rerender(patch = {}) {
    props = { ...props, ...patch };
    act(() => root.render(React.createElement(FieldCard, props)));
  }
  rerender();
  return { host, rerender };
}

function accessibleName(node) {
  if (node.getAttribute('aria-label')) return node.getAttribute('aria-label');
  const labelledBy = node.getAttribute('aria-labelledby');
  if (labelledBy) return labelledBy.split(/\s+/).map(id => node.ownerDocument.getElementById(id)?.textContent || '').join(' ');
  return [...(node.labels || [])].map(label => label.textContent).join(' ');
}

function variation(host, generation = 0, island = 0, species = 'birds') {
  const details = [...host.querySelectorAll('details')].find(node => node.querySelector('summary')?.textContent === 'Explore variation in this cohort');
  expect(details).toBeTruthy();
  const region = details.querySelector('[data-field-variation-island]');
  expect(region).toBeTruthy();
  expect(accessibleName(region)).toBe('Displayed cohort variation');
  expect(region.getAttribute('data-field-variation-island')).toBe(String(island));
  expect(region.getAttribute('data-field-variation-generation')).toBe(String(generation));
  expect(region.getAttribute('data-field-variation-species')).toBe(species);
  return region;
}

function bands(region) {
  const result = [...region.querySelectorAll('[data-field-variation-band]')];
  expect(result).toHaveLength(5);
  result.forEach((button, index) => {
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('data-field-variation-band')).toBe(String(index));
    expect(['true', 'false']).toContain(button.getAttribute('aria-pressed'));
    expect(button.disabled).toBe(false);
  });
  return result;
}

function chooseBand(region, index) {
  const button = bands(region)[index];
  act(() => button.click());
  return button;
}

function listed(region) {
  return [...region.querySelectorAll('[data-field-variation-resident]')];
}

function expectNoSelection(region) {
  expect(bands(region).every(button => button.getAttribute('aria-pressed') === 'false')).toBe(true);
  expect(listed(region)).toHaveLength(0);
}

function exactStatistic(region, name, expected) {
  const node = region.hasAttribute('data-field-variation-' + name) ? region : region.querySelector('[data-field-variation-' + name + ']');
  expect(node).toBeTruthy();
  expect(Number(node.getAttribute('data-field-variation-' + name))).toBe(expected);
}

function clickNamed(host, text) {
  const button = [...host.querySelectorAll('button')].find(node => node.textContent === text);
  expect(button).toBeTruthy();
  act(() => button.click());
  return button;
}

describe('displayed archipelago cohort variation explorer', () => {
  it('uses exact fixed-band boundaries and raw trait ordering, including equal values and rounded ties', () => {
    const birds = [resident(6, 1), resident(33, .20004002), resident(5, .8), resident(22, .2), resident(1, 0),
      resident(21, .20004001), resident(4, .6), resident(3, .4), resident(2, .2), resident(9, .19999999)];
    const fixture = expedition(birds), pick = vi.fn(), original = JSON.stringify(fixture.world);
    const { host, rerender } = mountFieldCard(fixture.world, null, { onPick: pick });
    let region = variation(host);
    expectNoSelection(region);
    expect(bands(region).map(button => Number(button.getAttribute('data-field-variation-count')))).toEqual([2, 4, 1, 1, 2]);
    exactStatistic(region, 'total', 10);
    exactStatistic(region, 'minimum', 0);
    exactStatistic(region, 'mean', birds.reduce((sum, item) => sum + model.value(item), 0) / birds.length);
    exactStatistic(region, 'maximum', 1);
    const expectedIds = [[1, 9], [2, 22, 21, 33], [3], [4], [5, 6]];
    expectedIds.forEach((ids, index) => {
      chooseBand(region, index);
      region = variation(host);
      expect(bands(region).map(button => button.getAttribute('aria-pressed'))).toEqual(expectedIds.map((_, i) => String(i === index)));
      expect(listed(region).map(button => Number(button.getAttribute('data-field-variation-resident')))).toEqual(ids);
      listed(region).forEach(button => {
        const item = birds.find(item => String(item.id) === button.getAttribute('data-field-variation-resident'));
        expect(button.tagName).toBe('BUTTON');
        expect(Number(button.getAttribute('data-field-variation-trait'))).toBe(model.value(item));
        expect(button.textContent).toBe('#' + item.id + ' · ' + (model.value(item) * 100).toFixed(2) + '/100');
        expect(button.getAttribute('aria-pressed')).toBe('false');
      });
    });
    expect(pick).not.toHaveBeenCalled();
    chooseBand(region, 1);
    const chosen = listed(variation(host)).find(button => button.getAttribute('data-field-variation-resident') === '21');
    act(() => chosen.click());
    expect(pick).toHaveBeenCalledExactlyOnceWith({ id: 21, species: 'birds', island: 0 });
    rerender({ selected: 21, resident: model.find(fixture.world, 21) });
    region = variation(host);
    expect(bands(region)[1].getAttribute('aria-pressed')).toBe('true');
    expect(listed(region).filter(button => button.getAttribute('aria-pressed') === 'true').map(button => button.getAttribute('data-field-variation-resident'))).toEqual(['21']);
    expect(host.querySelectorAll('[role="img"]')).toHaveLength(1);
    expect(region.querySelector('[aria-live], [role="status"], [role="alert"]')).toBeNull();
    expect(JSON.stringify(fixture.world)).toBe(original);
  });

  it('reports real six-organism and empty cohorts without filling bands or automatically picking an organism', () => {
    const fixture = expedition(), pick = vi.fn(), original = JSON.stringify(fixture.world);
    const { host, rerender } = mountFieldCard(fixture.world, null, { onPick: pick });
    let region = variation(host);
    exactStatistic(region, 'total', 6);
    exactStatistic(region, 'mean', .5);
    expect(bands(region).map(button => Number(button.getAttribute('data-field-variation-count')))).toEqual([1, 1, 1, 1, 2]);
    chooseBand(region, 4);
    expect(listed(variation(host)).map(button => button.getAttribute('data-field-variation-resident'))).toEqual(['5', '6']);

    rerender({ island: 2 });
    region = variation(host, 0, 2);
    exactStatistic(region, 'total', 0);
    expect(bands(region).map(button => Number(button.getAttribute('data-field-variation-count')))).toEqual([0, 0, 0, 0, 0]);
    for (const name of ['minimum', 'mean', 'maximum']) {
      expect(region.hasAttribute('data-field-variation-' + name)).toBe(false);
      expect(region.querySelector('[data-field-variation-' + name + ']')).toBeNull();
    }
    expectNoSelection(region);
    chooseBand(region, 3);
    expect(bands(variation(host, 0, 2))[3].getAttribute('aria-pressed')).toBe('true');
    expect(listed(variation(host, 0, 2))).toHaveLength(0);
    expect(region.textContent).not.toMatch(/NaN|Infinity/);
    expect(pick).not.toHaveBeenCalled();
    expect(JSON.stringify(fixture.world)).toBe(original);
  });

  it('keeps a band across selection and queued settings but resets for species, island, frame identity, and founding-frame changes', () => {
    const fixture = expedition(), pick = vi.fn(), original = JSON.stringify(fixture.world);
    const { host, rerender } = mountFieldCard(fixture.world, 1, { onPick: pick });
    chooseBand(variation(host), 1);
    rerender({ selected: 2, resident: model.find(fixture.world, 2) });
    expect(bands(variation(host))[1].getAttribute('aria-pressed')).toBe('true');
    const queued = { ...fixture.world, settings: { ...fixture.world.settings, migration: .3 } };
    const queuedOriginal = JSON.stringify(queued);
    rerender({ world: queued });
    expect(bands(variation(host))[1].getAttribute('aria-pressed')).toBe('true');

    rerender({ species: 'plants', selected: 40, resident: model.find(fixture.world, 40) });
    expectNoSelection(variation(host, 0, 0, 'plants'));
    chooseBand(variation(host, 0, 0, 'plants'), 1);
    expect(listed(variation(host, 0, 0, 'plants')).map(button => button.getAttribute('data-field-variation-resident'))).toEqual(['40', '41']);
    act(() => listed(variation(host, 0, 0, 'plants'))[1].click());
    expect(pick).toHaveBeenCalledExactlyOnceWith({ id: 41, species: 'plants', island: 0 });
    rerender({ species: 'birds', island: 1, selected: 50, resident: model.find(fixture.world, 50) });
    expectNoSelection(variation(host, 0, 1));
    chooseBand(variation(host, 0, 1), 1);
    rerender({ frame: fixture.world.history[1], island: 0, selected: 1, resident: model.find(fixture.world, 1) });
    expectNoSelection(variation(host, 1));
    chooseBand(variation(host, 1), 1);
    expect(listed(variation(host, 1)).map(button => button.getAttribute('data-field-variation-resident'))).toEqual(['101', '102']);
    expect(listed(variation(host, 1)).every(button => button.getAttribute('aria-pressed') === 'false')).toBe(true);
    // The displayed cohort must win over the selected archived founder.
    exactStatistic(variation(host, 1), 'total', 2);
    exactStatistic(variation(host, 1), 'minimum', .22);
    rerender({ selected: null, resident: null });
    expect(bands(variation(host, 1))[1].getAttribute('aria-pressed')).toBe('true');

    const replacementFrame = frame(1, { 0: { birds: fixture.laterBirds } });
    rerender({ frame: replacementFrame });
    expectNoSelection(variation(host, 1));
    chooseBand(variation(host, 1), 1);
    const replacement = expedition();
    // Keep the displayed-frame identity stable to isolate founding identity.
    rerender({ world: replacement.world });
    expectNoSelection(variation(host, 1));
    expect(JSON.stringify(fixture.world)).toBe(original);
    expect(JSON.stringify(queued)).toBe(queuedOriginal);
    expect(fixture.world.rng).toBe(123456789);
  });

  it('preserves a pinned organism and frozen comparison evidence while band residents are explored', () => {
    const fixture = expedition(), pick = vi.fn(), finding = vi.fn(), original = JSON.stringify(fixture.world);
    const { host, rerender } = mountFieldCard(fixture.world, 1, { onPick: pick, onObservationFinding: finding });
    clickNamed(host, 'Pin this organism for comparison');
    rerender({ selected: 2, resident: model.find(fixture.world, 2) });
    clickNamed(host, 'Capture this comparison');
    const captured = host.querySelector('[data-field-observation="ready"]');
    expect(captured).toBeTruthy();
    const evidence = captured.querySelector('.ea-field-observation-evidence').textContent;
    const textarea = captured.querySelector('#ea-field-observation-note');
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'A pair does not describe all variation in this cohort.');
      textarea.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    chooseBand(variation(host), 4);
    expect(pick).not.toHaveBeenCalled();
    act(() => listed(variation(host))[1].click());
    expect(pick).toHaveBeenCalledExactlyOnceWith({ id: 6, species: 'birds', island: 0 });
    rerender({ selected: 6, resident: model.find(fixture.world, 6) });
    expect(bands(variation(host))[4].getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-field-reference]').getAttribute('data-field-reference')).toBe('1');
    expect(host.querySelector('[data-field-observation="ready"]').getAttribute('data-field-observation-b')).toBe('2');
    expect(host.querySelector('.ea-field-observation-evidence').textContent).toBe(evidence);
    expect(host.querySelector('#ea-field-observation-note').value).toBe('A pair does not describe all variation in this cohort.');
    expect(finding).not.toHaveBeenCalled();
    clickNamed(host, 'Save captured comparison to field journal');
    expect(finding).toHaveBeenCalledTimes(1);
    expect(finding.mock.calls[0][0]).toContain('A: #1; born G0;');
    expect(finding.mock.calls[0][0]).toContain('B: #2; born G0;');
    expect(finding.mock.calls[0][0]).not.toContain('B: #6;');
    expect(finding.mock.calls[0][0]).toContain('A pair does not describe all variation in this cohort.');
    expect(JSON.stringify(fixture.world)).toBe(original);
  });
});
