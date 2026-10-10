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
    species => species === 'birds' ? 'Seedwing birds' : 'Shellseed plants',
    species => species === 'birds' ? 'Beak strength' : 'Seed-shell hardness',
    island => model.islands[island].name);
});

afterEach(() => {
  mounted.splice(0).forEach(({ root, host }) => {
    act(() => root.unmount());
    host.remove();
  });
  vi.restoreAllMocks();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
});

// Frozen censuses keep history navigation independent of simulated breeding.
// Every record has its own ID and birth generation, including the G60 boundary.
function expedition(latest = 3) {
  const history = Object.freeze(Array.from({ length: latest + 1 }, (_, generation) => Object.freeze({
    generation, round: null,
    demes: Object.freeze(Array.from({ length: 3 }, (_, island) => {
      const residents = (species, values, offset) => Object.freeze(values.map((value, index) => Object.freeze({
        id: generation * 100 + island * 20 + offset + index, born: generation, species,
        genes: Object.freeze([value, value]), marker: Object.freeze([1, 0]),
        parents: Object.freeze([]), inheritance: Object.freeze([])
      })));
      return Object.freeze({
        birds: residents('birds', generation ? [.1, .3, .35, .6, .8, .9] : [0, .2, .4, .6, .8, 1], 1),
        plants: residents('plants', [.25, .75], 10)
      });
    }))
  })));
  return Object.freeze({ version: 1, seed: 2026, smallFounders: true, rng: 123456789,
    nextId: latest * 100 + 60, generation: latest, history,
    settings: Object.freeze({ migration: .12, reciprocal: true, selection: true,
      mutation: .01, rainfall: Object.freeze([.15, .5, .85]) }) });
}

function mountFieldCard(world, initialProps = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  mounted.push({ root, host });
  let props = { React, world, frame: world.history[0], island: 0, species: 'birds', selected: null,
    resident: null, onPick: vi.fn(), onSpecies: noop, onRecord: noop, onBirth: noop,
    onInspectReference: noop, onObservationFinding: vi.fn(), onCohortFinding: vi.fn(),
    onJournal: vi.fn(), onVisitCohort: vi.fn(), ...initialProps };
  function rerender(patch = {}) {
    props = { ...props, ...patch };
    act(() => root.render(React.createElement(FieldCard, props)));
  }
  rerender();
  host.querySelector('.ea-field-variation').open = true;
  return { host, rerender };
}

function button(host, name) {
  const result = [...host.querySelectorAll('button')].find(node => node.textContent === name);
  expect(result, 'Missing field-card button: ' + name).toBeTruthy();
  expect(result.tagName).toBe('BUTTON');
  return result;
}

function click(host, name, focus = false) {
  const target = button(host, name);
  if (focus) target.focus();
  act(() => target.click());
  return target;
}

function history(host, generation, latest) {
  const region = host.querySelector('[data-field-history-generation]');
  expect(region).toBeTruthy();
  const name = region.getAttribute('aria-label') || region.getAttribute('aria-labelledby').split(/\s+/)
    .map(id => document.getElementById(id)?.textContent || '').join(' ');
  expect(name).toBe('Browse recorded cohorts');
  expect(region.getAttribute('data-field-history-generation')).toBe(String(generation));
  expect(region.getAttribute('data-field-history-latest')).toBe(String(latest));
  expect(region.getAttribute('data-field-history-state')).toBe(generation === latest ? 'present' : 'recorded');
  const range = region.querySelector('#ea-field-generation');
  expect(range).toBeTruthy();
  expect(range.type).toBe('range');
  expect(range.min).toBe('0');
  expect(range.max).toBe(String(latest));
  expect(range.step).toBe('1');
  expect(range.value).toBe(String(generation));
  expect([...range.labels].map(label => label.textContent).join(' ')).toBe('Field card generation');
  expect(range.getAttribute('aria-valuetext')).toBe('G' + generation + ' / G' + latest);
  expect(region.querySelector('[aria-live], [role="status"], [role="alert"]')).toBeNull();
  return range;
}

function setRange(range, value) {
  act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(range, String(value));
    range.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

const previous = 'Previous recorded generation';
const next = 'Next recorded generation';
const latest = 'Latest recorded generation';

describe('archipelago field-card recorded history navigation', () => {
  it('respects founders-only, unavailable-callback, and G60 boundaries without requesting nonexistent generations', () => {
    const founders = expedition(0), visit = vi.fn();
    const { host, rerender } = mountFieldCard(founders, { onVisitCohort: visit });
    expect(history(host, 0, 0).disabled).toBe(true);
    [previous, next, latest].forEach(name => {
      expect(button(host, name).disabled).toBe(true);
      click(host, name);
    });
    expect(visit).not.toHaveBeenCalled();

    const world = expedition(60);
    rerender({ world, frame: world.history[30], onVisitCohort: undefined });
    expect(history(host, 30, 60).disabled).toBe(true);
    [previous, next, latest].forEach(name => expect(button(host, name).disabled).toBe(true));
    rerender({ frame: world.history[0], onVisitCohort: visit });
    expect(history(host, 0, 60).disabled).toBe(false);
    expect(button(host, previous).disabled).toBe(true);
    click(host, next);
    expect(visit).toHaveBeenLastCalledWith({ generation: 1, island: 0, species: 'birds' });
    click(host, latest);
    expect(visit).toHaveBeenLastCalledWith({ generation: 60, island: 0, species: 'birds' });
    rerender({ frame: world.history[60] });
    const range = history(host, 60, 60);
    expect(button(host, next).disabled).toBe(true);
    expect(button(host, latest).disabled).toBe(true);
    visit.mockClear();
    click(host, next);
    click(host, latest);
    setRange(range, 60);
    expect(visit).not.toHaveBeenCalled();
    setRange(range, 12);
    expect(visit).toHaveBeenCalledExactlyOnceWith({ generation: 12, island: 0, species: 'birds' });
    rerender({ frame: world.history[12] });
    visit.mockClear();
    setRange(history(host, 12, 60), 12.5);
    expect(visit).not.toHaveBeenCalled();
  });

  it('keeps island and species context and retains keyboard focus, moving it to the range only at button boundaries', () => {
    const world = expedition(3);
    const view = mountFieldCard(world, { frame: world.history[1], island: 2, species: 'plants' });
    const visit = vi.fn(context => view.rerender({ frame: world.history[context.generation],
      island: context.island, species: context.species, selected: null, resident: null }));
    view.rerender({ onVisitCohort: visit });
    const { host } = view;
    const range = history(host, 1, 3), focusRange = vi.spyOn(range, 'focus');
    const nextButton = click(host, next, true);
    history(host, 2, 3);
    expect(visit).toHaveBeenLastCalledWith({ generation: 2, island: 2, species: 'plants' });
    expect(document.activeElement).toBe(nextButton);
    expect(focusRange).not.toHaveBeenCalled();
    click(host, next, true);
    history(host, 3, 3);
    expect(document.activeElement).toBe(range);
    expect(focusRange).toHaveBeenLastCalledWith({ preventScroll: true });
    const previousButton = click(host, previous, true);
    history(host, 2, 3);
    expect(document.activeElement).toBe(previousButton);
    click(host, latest, true);
    history(host, 3, 3);
    expect(document.activeElement).toBe(range);
    range.focus();
    setRange(range, 1);
    history(host, 1, 3);
    expect(document.activeElement).toBe(range);
    click(host, previous, true);
    history(host, 0, 3);
    expect(document.activeElement).toBe(range);
    expect(visit.mock.calls.map(([context]) => context)).toEqual([2, 3, 2, 3, 1, 0]
      .map(generation => ({ generation, island: 2, species: 'plants' })));
    expect(document.activeElement).not.toBe(host.querySelector('#ea-field-variation-title'));
  });

  it('preserves both pins and frozen observations while resetting the displayed band, without advancing or writing the world', () => {
    const world = expedition(3), original = JSON.stringify(world), step = vi.spyOn(model, 'step');
    localStorage.setItem('field-history-sentinel', 'unchanged');
    const storage = JSON.stringify(localStorage);
    const view = mountFieldCard(world, { selected: 1, resident: model.find(world, 1) });
    const visit = vi.fn(context => view.rerender({ frame: world.history[context.generation],
      island: context.island, species: context.species, selected: null, resident: null }));
    view.rerender({ onVisitCohort: visit });
    const { host, rerender } = view;
    click(host, 'Pin this organism for comparison');
    rerender({ selected: 2, resident: model.find(world, 2) });
    click(host, 'Capture this comparison');
    const organismEvidence = host.querySelector('[data-field-observation] pre').textContent;
    click(host, 'Pin displayed cohort as reference');
    click(host, next, true);
    history(host, 1, 3);
    click(host, 'Capture cohort comparison');
    const cohortEvidence = host.querySelector('[data-field-cohort-observation] pre').textContent;
    const cohortNote = host.querySelector('[data-field-cohort-observation] textarea');
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(cohortNote, 'Counts changed; this alone does not establish the cause.');
      cohortNote.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    const band = host.querySelector('[data-field-variation-band="1"]');
    act(() => band.click());
    expect(band.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelectorAll('[data-field-variation-resident]')).toHaveLength(2);
    click(host, next, true);
    history(host, 2, 3);
    expect(host.querySelectorAll('[data-field-variation-band][aria-pressed="true"]')).toHaveLength(0);
    expect(host.querySelector('[data-field-variation-resident]')).toBeNull();
    const reference = host.querySelector('[data-field-cohort-comparison="ready"]');
    expect(reference).toBeTruthy();
    expect(reference.getAttribute('data-field-cohort-reference-generation')).toBe('0');
    expect(host.querySelector('[data-field-observation] pre').textContent).toBe(organismEvidence);
    expect(host.querySelector('[data-field-cohort-observation] pre').textContent).toBe(cohortEvidence);
    expect(host.querySelector('[data-field-cohort-observation] textarea').value).toBe('Counts changed; this alone does not establish the cause.');
    click(host, previous, true);
    click(host, previous, true);
    rerender({ selected: 1, resident: model.find(world, 1) });
    expect(button(host, 'Pin this organism for comparison').getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-field-cohort-comparison="same"]')).toBeTruthy();
    expect(step).not.toHaveBeenCalled();
    expect(JSON.stringify(world)).toBe(original);
    expect(JSON.stringify(localStorage)).toBe(storage);
  });

  it('discards delayed focus requests after a new expedition and never steals focus from another active control', () => {
    const world = expedition(3), visit = vi.fn();
    const { host, rerender } = mountFieldCard(world, { frame: world.history[2], onVisitCohort: visit });
    const range = history(host, 2, 3), focusRange = vi.spyOn(range, 'focus');
    click(host, next, true);
    expect(visit).toHaveBeenCalledExactlyOnceWith({ generation: 3, island: 0, species: 'birds' });
    const replacement = expedition(3);
    expect(replacement.history[0]).not.toBe(world.history[0]);
    rerender({ world: replacement, frame: replacement.history[3] });
    history(host, 3, 3);
    expect(focusRange).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(range);
    rerender({ frame: replacement.history[1] });
    click(host, latest, true);
    const speciesButton = host.querySelector('.ea-species-buttons button');
    speciesButton.focus();
    rerender({ frame: replacement.history[3] });
    expect(document.activeElement).toBe(speciesButton);
    expect(focusRange).not.toHaveBeenCalled();
    rerender({ frame: replacement.history[2] });
    expect(document.activeElement).toBe(speciesButton);
    expect(focusRange).not.toHaveBeenCalled();
  });
});
