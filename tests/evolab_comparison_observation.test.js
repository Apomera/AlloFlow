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

function resident(id, genes, marker, born = 0, species = 'birds', parents = []) {
  return Object.freeze({ id, born, species, genes: Object.freeze(genes.slice()), marker: Object.freeze(marker.slice()),
    parents: Object.freeze(parents.slice()), inheritance: Object.freeze([]) });
}

function frame(generation, populations) {
  return Object.freeze({ generation, round: null, demes: Object.freeze(Array.from({ length: 3 }, (_, island) => {
    const cohort = populations[island] || {};
    return Object.freeze({ birds: Object.freeze((cohort.birds || []).slice()), plants: Object.freeze((cohort.plants || []).slice()) });
  })) });
}

// Small immutable birth records keep the test about the captured evidence and
// React state. No model restore or stochastic breeding runs are needed here.
function expedition(aGenes = [.123456789, .876543211], bGenes = [.234567891, .876543219]) {
  const a = resident(1, aGenes, [1, 0]), b = resident(10, bGenes, [0, 1], 1, 'birds', [1, 2]);
  const parent = resident(2, [.234567891, .654321987], [0, 1]);
  const other = resident(11, [.3, .7], [1, 1], 1), plant = resident(20, [.4, .6], [0, 0], 1, 'plants');
  const later = resident(30, [.2, .9], [0, 0], 2);
  const history = [frame(0, { 0: { birds: [a] }, 2: { birds: [parent] } }), frame(1, { 2: { birds: [b, other], plants: [plant] } }),
    frame(2, { 1: { birds: [later] } })];
  const world = { version: 1, seed: 2026, smallFounders: false, rng: 123456789, nextId: 31, generation: 2, history,
    settings: { migration: .12, reciprocal: true, selection: true, mutation: .01, rainfall: [.15, .5, .85] } };
  return { world, a, b, other, plant, later };
}

function mountFieldCard(world, selected, initialProps = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  mounted.push({ root, host });
  let props = { React, world, frame: world.history[0], island: 0, species: 'birds', selected,
    resident: model.find(world, selected), onPick: noop, onSpecies: noop, onRecord: noop, onBirth: noop,
    onInspectReference: noop, onObservationFinding: vi.fn(), onJournal: vi.fn(), ...initialProps };
  function rerender(patch = {}) {
    props = { ...props, ...patch };
    act(() => root.render(React.createElement(FieldCard, props)));
  }
  rerender();
  return { host, rerender };
}

function findButton(host, text) {
  return [...host.querySelectorAll('button')].find(node => node.textContent === text) || null;
}

function click(host, text) {
  const node = findButton(host, text);
  if (!node) throw new Error('Missing field-card button: ' + text);
  act(() => node.click());
  return node;
}

function readyPair(fixture, props = {}) {
  const view = mountFieldCard(fixture.world, fixture.a.id, props);
  click(view.host, 'Pin this organism for comparison');
  view.rerender({ frame: fixture.world.history[1], island: 2, selected: fixture.b.id,
    resident: model.find(fixture.world, fixture.b.id) });
  expect(view.host.querySelector('[data-field-compare="ready"]')).toBeTruthy();
  return view;
}

function accessibleName(node) {
  if (node.getAttribute('aria-label')) return node.getAttribute('aria-label');
  const labelledBy = node.getAttribute('aria-labelledby');
  if (labelledBy) return labelledBy.split(/\s+/).map(id => node.ownerDocument.getElementById(id)?.textContent || '').join(' ');
  return [...(node.labels || [])].map(label => label.textContent).join(' ');
}

function note(host) {
  const textarea = host.querySelector('#ea-field-observation-note');
  expect(textarea).toBeTruthy();
  expect(accessibleName(textarea)).toBe('What is alike or different, and what can this pair not tell you?');
  expect(textarea.maxLength).toBe(2000);
  return textarea;
}

function writeNote(host, value) {
  const textarea = note(host);
  act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(textarea, value);
    textarea.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

function captured(host, a = 1, b = 10, generation = 1, island = 2) {
  const region = host.querySelector('[data-field-observation="ready"]');
  expect(region).toBeTruthy();
  expect(accessibleName(region)).toBe('Captured comparison');
  expect(region.getAttribute('data-field-observation-a')).toBe(String(a));
  expect(region.getAttribute('data-field-observation-b')).toBe(String(b));
  expect(region.getAttribute('data-field-observation-generation')).toBe(String(generation));
  expect(region.getAttribute('data-field-observation-island')).toBe(String(island));
  return region;
}

function saved(host) {
  const feedback = host.querySelector('[data-field-observation-saved]');
  expect(feedback).toBeTruthy();
  expect(feedback.tagName).toBe('P');
  expect(feedback.getAttribute('data-field-observation-saved')).toBe('1:10');
  expect(feedback.hasAttribute('aria-live')).toBe(false);
  expect(feedback.hasAttribute('role')).toBe(false);
  expect(document.activeElement).toBe(feedback);
  return feedback;
}

function findingText(callback) {
  expect(callback).toHaveBeenCalledTimes(1);
  const text = callback.mock.calls[0][0];
  expect(typeof text).toBe('string');
  expect(text).toContain('2026');
  return text;
}

function expectRawEvidence(text, fixture, equalGenes = false) {
  expect(text).toContain('Seed=2026; captured displayed generation=G1; displayed island=Mist; species=birds.');
  expect(text).toContain('A: #1; born G0; birth island=Ember; parents=[]; trait copies=' + JSON.stringify(fixture.a.genes));
  expect(text).toContain('B: #10; born G1; birth island=Mist; parents=[1,2]; trait copies=' + JSON.stringify(fixture.b.genes));
  for (const item of [fixture.a, fixture.b]) {
    expect(text).toContain('trait mean (0–1)=' + model.value(item) + '; trait index (0–100)=' + (model.value(item) * 100));
  }
  expect(text).toContain('neutral marker copies=[1,0]; neutral marker genotype=A/a.');
  expect(text).toContain('neutral marker copies=[0,1]; neutral marker genotype=a/A.');
  expect(text).toContain('B minus A=' + ((model.value(fixture.b) - model.value(fixture.a)) * 100) + ' inherited trait index points (0–100 scale).');
  expect(text).toContain('Unordered trait-copy pair match=' + equalGenes + '; neutral marker genotype match=true.');
}

describe('captured archipelago comparison observations', () => {
  it('freezes the original raw birth evidence and reflection while the live comparison is browsed and replaced', () => {
    const fixture = expedition(), finding = vi.fn(), journal = vi.fn(), original = JSON.stringify(fixture.world);
    const { host, rerender } = readyPair(fixture, { onObservationFinding: finding, onJournal: journal });
    click(host, 'Capture this comparison');
    const region = captured(host);
    const aSide = region.querySelector('[data-field-observation-side="A"]');
    const bSide = region.querySelector('[data-field-observation-side="B"]');
    expect(aSide.textContent).toContain('#1');
    expect(aSide.textContent).toMatch(/Born G0/);
    expect(aSide.textContent).toContain('Ember');
    expect(bSide.textContent).toContain('#10');
    expect(bSide.textContent).toMatch(/Born G1/);
    expect(bSide.textContent).toContain('Mist');
    expect(Number(aSide.querySelector('[data-field-observation-trait]').getAttribute('data-field-observation-trait'))).toBe(model.value(fixture.a));
    expect(Number(bSide.querySelector('[data-field-observation-trait]').getAttribute('data-field-observation-trait'))).toBe(model.value(fixture.b));
    const evidence = [...region.querySelectorAll('details')].find(node => node.querySelector('summary')?.textContent === 'Show captured evidence');
    expect(evidence).toBeTruthy();
    expect(evidence.open).toBe(false);
    expectRawEvidence(evidence.textContent, fixture);
    const reflection = 'Their marker genotype matches, but this pair cannot estimate population diversity.';
    writeNote(host, reflection);

    rerender({ selected: fixture.other.id, resident: model.find(fixture.world, fixture.other.id) });
    click(host, 'Pin this organism for comparison');
    rerender({ selected: fixture.b.id, resident: model.find(fixture.world, fixture.b.id) });
    expect(host.querySelector('[data-field-reference]').getAttribute('data-field-reference')).toBe('11');
    expect(findButton(host, 'Capture this comparison').disabled).toBe(true);
    act(() => findButton(host, 'Capture this comparison').click());
    captured(host);
    rerender({ species: 'plants', selected: fixture.plant.id, resident: model.find(fixture.world, fixture.plant.id) });
    captured(host);
    expect(note(host).value).toBe(reflection);
    rerender({ selected: null, resident: null });
    captured(host);
    expect(note(host).value).toBe(reflection);
    const queued = { ...fixture.world, settings: { ...fixture.world.settings, migration: .3 } };
    const queuedOriginal = JSON.stringify(queued);
    rerender({ world: queued, frame: fixture.world.history[2], island: 1, species: 'birds', selected: fixture.later.id,
      resident: model.find(queued, fixture.later.id) });
    captured(host);
    expect(note(host).value).toBe(reflection);
    click(host, 'Save captured comparison to field journal');
    expect(host.querySelector('[data-field-observation]')).toBeNull();
    const text = findingText(finding);
    expectRawEvidence(text, fixture);
    expect(text).toContain('My observation:\n' + reflection + '\nProtocol:');
    expect(text).toContain('This pair is not a random sample; its selection path is not recorded.');
    expect(text).toContain('A pair does not establish a population trend or an evolutionary cause.');
    expect(journal).not.toHaveBeenCalled();
    expect(JSON.stringify(fixture.world)).toBe(original);
    expect(JSON.stringify(queued)).toBe(queuedOriginal);
  });

  it('saves an optional blank reflection through one journal-finding callback without changing world or RNG state', () => {
    const fixture = expedition(undefined, [.876543211, .123456789]), finding = vi.fn(), journal = vi.fn();
    const callbacks = { onPick: vi.fn(), onSpecies: vi.fn(), onRecord: vi.fn(), onBirth: vi.fn(), onInspectReference: vi.fn() };
    const original = JSON.stringify(fixture.world), initialRng = fixture.world.rng;
    const { host } = readyPair(fixture, { ...callbacks, onObservationFinding: finding, onJournal: journal });
    click(host, 'Capture this comparison');
    captured(host);
    expect(note(host).value).toBe('');
    expect(findButton(host, 'Save captured comparison to field journal').disabled).toBe(false);
    click(host, 'Save captured comparison to field journal');
    const text = findingText(finding);
    expectRawEvidence(text, fixture, true);
    expect(text).toContain('My observation:\n(no explanation added)\nProtocol:');
    expect(host.querySelector('[data-field-observation]')).toBeNull();
    expect(findButton(host, 'Save captured comparison to field journal')).toBeNull();
    saved(host);
    Object.values(callbacks).forEach(callback => expect(callback).not.toHaveBeenCalled());
    expect(journal).not.toHaveBeenCalled();
    expect(fixture.world.rng).toBe(initialRng);
    expect(JSON.stringify(fixture.world)).toBe(original);
    click(host, 'Open field journal');
    expect(journal).toHaveBeenCalledTimes(1);
    expect(finding).toHaveBeenCalledTimes(1);
  });

  it('requires a distinct pair of one species and cancels a single draft without adding a journal finding', () => {
    const fixture = expedition(), finding = vi.fn();
    const { host, rerender } = mountFieldCard(fixture.world, null, { onObservationFinding: finding });
    expect(findButton(host, 'Capture this comparison')).toBeNull();
    rerender({ selected: fixture.a.id, resident: model.find(fixture.world, fixture.a.id) });
    click(host, 'Pin this organism for comparison');
    expect(host.querySelector('[data-field-compare="same"]')).toBeTruthy();
    expect(findButton(host, 'Capture this comparison')).toBeNull();
    rerender({ frame: fixture.world.history[1], island: 2, species: 'plants', selected: fixture.plant.id,
      resident: model.find(fixture.world, fixture.plant.id) });
    expect(host.querySelector('[data-field-compare="species"]')).toBeTruthy();
    expect(findButton(host, 'Capture this comparison')).toBeNull();
    rerender({ selected: null, resident: null });
    expect(findButton(host, 'Capture this comparison')).toBeNull();
    rerender({ species: 'birds', selected: fixture.b.id, resident: model.find(fixture.world, fixture.b.id) });
    expect(findButton(host, 'Capture this comparison').disabled).toBe(false);
    click(host, 'Capture this comparison');
    writeNote(host, 'Discard this draft.');
    rerender({ selected: fixture.other.id, resident: model.find(fixture.world, fixture.other.id) });
    expect(findButton(host, 'Capture this comparison').disabled).toBe(true);
    act(() => findButton(host, 'Capture this comparison').click());
    captured(host);
    click(host, 'Cancel captured observation');
    expect(host.querySelector('[data-field-observation]')).toBeNull();
    expect(host.querySelector('[data-field-observation-saved]')).toBeNull();
    expect(finding).not.toHaveBeenCalled();
    expect(findButton(host, 'Capture this comparison').disabled).toBe(false);
    expect(document.activeElement).toBe(findButton(host, 'Capture this comparison'));
    click(host, 'Capture this comparison');
    captured(host, 1, 11);
    expect(note(host).value).toBe('');
    click(host, 'Cancel captured observation');
    expect(finding).not.toHaveBeenCalled();
  });

  it('clears drafts and saved feedback when a same-seed replacement supplies a new founding frame', () => {
    const fixture = expedition(), finding = vi.fn();
    const { host, rerender } = readyPair(fixture, { onObservationFinding: finding });
    click(host, 'Capture this comparison');
    writeNote(host, 'This belongs only to the original expedition.');
    const staleSave = findButton(host, 'Save captured comparison to field journal');
    const replacement = expedition([.101010101, .202020202], [.303030303, .404040404]);
    expect(replacement.world.seed).toBe(fixture.world.seed);
    expect(replacement.world.history[0]).not.toBe(fixture.world.history[0]);
    rerender({ world: replacement.world, frame: replacement.world.history[1], island: 2, selected: replacement.b.id,
      resident: model.find(replacement.world, replacement.b.id) });
    expect(host.querySelector('[data-field-observation]')).toBeNull();
    expect(host.querySelector('#ea-field-observation-note')).toBeNull();
    expect(host.querySelector('[data-field-observation-saved]')).toBeNull();
    expect(findButton(host, 'Save captured comparison to field journal')).toBeNull();
    act(() => staleSave.click());
    expect(finding).not.toHaveBeenCalled();

    rerender({ frame: replacement.world.history[0], island: 0, selected: replacement.a.id,
      resident: model.find(replacement.world, replacement.a.id) });
    click(host, 'Pin this organism for comparison');
    rerender({ frame: replacement.world.history[1], island: 2, selected: replacement.b.id,
      resident: model.find(replacement.world, replacement.b.id) });
    click(host, 'Capture this comparison');
    captured(host);
    expect(note(host).value).toBe('');
    click(host, 'Save captured comparison to field journal');
    const text = findingText(finding);
    expectRawEvidence(text, replacement);
    [...fixture.a.genes, ...fixture.b.genes].forEach(copy => expect(text).not.toContain(String(copy)));
    expect(text).not.toContain('This belongs only to the original expedition.');
    saved(host);
    const third = expedition([.51, .61], [.71, .81]);
    rerender({ world: third.world, frame: third.world.history[1], selected: third.b.id,
      resident: model.find(third.world, third.b.id) });
    expect(host.querySelector('[data-field-observation-saved]')).toBeNull();
    expect(host.querySelector('[data-field-observation]')).toBeNull();
    expect(finding).toHaveBeenCalledTimes(1);
  });
});
