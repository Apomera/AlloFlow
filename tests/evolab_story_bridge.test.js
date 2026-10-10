import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_evolab.js'), 'utf8');
function component(name, next) {
  const start = source.indexOf('  function ' + name + '(props) {');
  const end = source.indexOf(next, start);
  if (start < 0 || end <= start) throw new Error(name + ' source boundaries were not found');
  return new Function('ArchipelagoModel', 'ax', 'archSpecies', 'archTrait', 'archIslandName',
    'return (' + source.slice(start, end).trim() + ');');
}
const buildFieldCard = component('ArchipelagoFieldCard', '  var archipelagoCSS = `');
const buildStory = component('ArchipelagoStory', '  function ArchipelagoPassport(props) {');
let model, FieldCard, Story, previousActEnvironment;
const mounted = [];
const noop = () => {};

beforeEach(() => {
  previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  localStorage.clear();
  loadTool('stem_lab/stem_tool_evolab.js', 'evoLab');
  model = window.StemLab.evoArchipelagoModel;
  const dependencies = [model, (key, fallback) => fallback,
    species => species === 'birds' ? 'Seedwing birds' : 'Shellseed plants',
    species => species === 'birds' ? 'Beak strength' : 'Seed-shell hardness',
    island => model.islands[island].name];
  FieldCard = buildFieldCard(...dependencies);
  Story = buildStory(...dependencies);
});

afterEach(() => {
  mounted.splice(0).forEach(({ root, host, anchor }) => {
    act(() => root.unmount());
    host.remove();
    anchor.remove();
  });
  vi.restoreAllMocks();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
});

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function expedition() {
  let world = model.create(21, true);
  world.settings = { ...world.settings, migration: .4, mutation: .05 };
  world = model.step(model.step(world));
  return freeze(world);
}

function mount(Component, initialProps) {
  const host = document.createElement('div');
  const anchor = document.createElement('button');
  anchor.textContent = 'Unrelated control';
  document.body.append(anchor, host);
  anchor.focus();
  const root = ReactDOMClient.createRoot(host);
  mounted.push({ root, host, anchor });
  let props = { React, ...initialProps };
  function rerender(patch = {}) {
    props = { ...props, ...patch };
    act(() => root.render(React.createElement(Component, props)));
  }
  rerender();
  return { host, anchor, rerender };
}

function mountFieldCard(world, patch = {}) {
  return mount(FieldCard, { world, frame: world.history[0], island: 0, species: 'birds',
    selected: null, resident: null, onPick: noop, onSpecies: noop, onRecord: noop,
    onBirth: noop, onInspectReference: noop, onVisitCohort: noop,
    onObservationFinding: noop, onCohortFinding: noop, onJournal: noop, ...patch });
}

function mountStory(world, patch = {}) {
  return mount(Story, { world, generation: 1, island: 0, species: 'birds',
    onSpecies: noop, onInspect: noop, onVisit: noop, onAdvance: noop, ...patch });
}

function request(world, patch = {}) {
  return { foundingFrame: world.history[0], generation: 1, island: 0, species: 'birds',
    childId: null, token: 1, ...patch };
}

function button(host, selector, label) {
  const node = host.querySelector(selector);
  expect(node, 'Missing action: ' + label).toBeTruthy();
  expect(node.tagName).toBe('BUTTON');
  expect(node.type).toBe('button');
  expect(node.textContent).toBe(label);
  return node;
}

function choose(select, value) {
  act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, String(value));
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
}

function expectCopies(host, birth) {
  const cards = [...host.querySelectorAll('[data-story-copy]')];
  expect(cards).toHaveLength(2);
  cards.forEach((card, index) => {
    const copy = birth.copies[index];
    expect(Number(card.getAttribute('data-story-copy'))).toBe(index);
    expect(Number(card.getAttribute('data-copy-parent'))).toBe(copy.parent);
    expect(Number(card.getAttribute('data-copy-from'))).toBe(copy.from);
    expect(Number(card.getAttribute('data-copy-before'))).toBe(copy.traitBeforeMutation);
    expect(Number(card.getAttribute('data-copy-after'))).toBe(copy.traitAfterMutation);
    expect(Number(card.getAttribute('data-copy-marker'))).toBe(copy.marker);
  });
}

describe('field-card bridges into recorded generation stories', () => {
  it('offers only recorded rounds and current newborn inheritance, retaining the empty-cohort explanation path', () => {
    const world = expedition(), before = JSON.stringify(world), next = model.step(world);
    const cohort = vi.fn(), resident = vi.fn();
    const view = mountFieldCard(world, { onTraceCohort: cohort, onTraceResident: resident });
    const round = () => button(view.host, '#ea-field-cohort-story', 'Trace this recorded round');
    expect(round().disabled).toBe(true);
    expect(view.host.textContent).toContain('G0 is a founding sample. There is no earlier recorded breeding round to trace.');
    act(() => round().click());
    expect(cohort).not.toHaveBeenCalled();
    expect(view.host.querySelector('#ea-field-resident-story')).toBeNull();

    const child = world.history[1].demes[0].birds[7], birth = model.find(world, child.id);
    view.rerender({ frame: world.history[1], selected: child.id, resident: birth });
    const inherit = () => button(view.host, '#ea-field-resident-story', 'Trace this resident’s inherited copies');
    expect(round().disabled).toBe(false);
    expect(inherit().disabled).toBe(false);
    act(() => { round().click(); inherit().click(); });
    expect(cohort).toHaveBeenCalledExactlyOnceWith();
    expect(resident).toHaveBeenCalledExactlyOnceWith(child.id);
    view.rerender({ onTraceCohort: undefined, onTraceResident: undefined });
    expect(round().disabled).toBe(true);
    expect(inherit().disabled).toBe(true);
    act(() => { round().click(); inherit().click(); });
    expect(cohort).toHaveBeenCalledTimes(1);
    expect(resident).toHaveBeenCalledTimes(1);

    view.rerender({ frame: world.history[2], onTraceCohort: cohort, onTraceResident: resident });
    expect(view.host.querySelector('#ea-field-resident-story')).toBeNull();
    const founder = world.history[0].demes[0].birds[0];
    view.rerender({ selected: founder.id, resident: model.find(world, founder.id) });
    expect(view.host.querySelector('#ea-field-resident-story')).toBeNull();
    view.rerender({ frame: world.history[0] });
    expect(view.host.querySelector('#ea-field-resident-story')).toBeNull();

    let absent = model.create(22, true);
    absent.settings = { ...absent.settings, migration: 0 };
    absent.history[0].demes[0].birds = absent.history[0].demes[0].birds.slice(0, 1);
    absent = freeze(model.step(absent));
    expect(absent.history[1].demes[0].birds).toHaveLength(0);
    view.rerender({ world: absent, frame: absent.history[1], selected: null, resident: null });
    expect(round().disabled).toBe(false);
    act(() => round().click());
    expect(cohort).toHaveBeenCalledTimes(2);
    expect(view.host.querySelector('#ea-field-resident-story')).toBeNull();
    expect(JSON.stringify(world)).toBe(before);
    expect(model.step(world)).toEqual(next);
  });

  it('opens the exact requested newborn and its actual inherited copies for either species', () => {
    const world = expedition(), before = JSON.stringify(world), next = model.step(world);
    const { host, rerender } = mountStory(world);
    for (const [island, species] of [[0, 'birds'], [2, 'plants']]) {
      const trace = model.story(world, 1, island, species), birth = trace.newborns[7];
      rerender({ key: species, island, species,
        entryRequest: request(world, { island, species, childId: birth.id }) });
      const select = host.querySelector('#ea-story-child');
      expect(select, species + ' G1 island ' + island + ': ' + host.innerHTML).not.toBeNull();
      expect(select.value).toBe(String(birth.id));
      expect(document.activeElement).toBe(select);
      expect(host.querySelector('.ea-copy-trail').open).toBe(true);
      expect(host.querySelector('[data-story-detail]').getAttribute('data-story-detail')).toBe(trace.stages[5].key);
      expect(host.querySelector('[data-generation-story]').getAttribute('data-story-lens')).toBe('trait');
      expectCopies(host, birth);
      birth.copies.forEach((copy, index) => {
        const child = world.history[1].demes[island][species][7];
        const parent = model.find(world, child.parents[index]);
        expect(copy.parent).toBe(parent.organism.id);
        expect(copy.traitBeforeMutation).toBe(parent.organism.genes[child.inheritance[index].copy]);
        expect(copy.traitAfterMutation).toBe(child.genes[index]);
        expect(copy.marker).toBe(parent.organism.marker[child.inheritance[index].markerCopy]);
      });
    }
    expect(JSON.stringify(world)).toBe(before);
    expect(model.step(world)).toEqual(next);
  });

  it('rejects stale roots, mismatched contexts and unavailable newborn IDs without opening or stealing focus', () => {
    const world = expedition(), trace = model.story(world, 1, 0, 'birds');
    const childId = trace.newborns[7].id;
    const invalid = [
      request(world, { childId, foundingFrame: expedition().history[0] }),
      request(world, { childId, generation: 2 }),
      request(world, { childId, island: 1 }),
      request(world, { childId, species: 'plants' }),
      request(world, { childId: -1 }),
      request(world, { childId: world.history[0].demes[0].birds[0].id }),
      request(world, { childId: world.history[1].demes[1].birds[7].id })
    ];
    const { host, anchor, rerender } = mountStory(world);
    for (const [index, entryRequest] of invalid.entries()) {
      anchor.focus();
      rerender({ key: index, entryRequest });
      const select = host.querySelector('#ea-story-child');
      expect(select, 'Invalid request ' + index + ': ' + host.innerHTML).not.toBeNull();
      expect(select.value).toBe(String(trace.newborns[0].id));
      expect(host.querySelector('.ea-copy-trail').open).toBe(false);
      expect(host.querySelector('[data-story-detail]').getAttribute('data-story-detail')).toBe(trace.stages[0].key);
      expect(document.activeElement).toBe(anchor);
    }
  });

  it('focuses the requested cohort once and preserves later child, stage and lens choices through rerenders', () => {
    const world = expedition(), before = JSON.stringify(world), next = model.step(world);
    const trace = model.story(world, 1, 0, 'birds'), entryRequest = request(world);
    const { host, anchor, rerender } = mountStory(world, { entryRequest });
    const heading = host.querySelector('#ea-story-title');
    expect(heading.tagName).toBe('H2');
    expect(heading.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(heading);
    expect(host.querySelector('.ea-copy-trail').open).toBe(false);
    expect(host.querySelector('[data-story-detail]').getAttribute('data-story-detail')).toBe(trace.stages[0].key);

    host.querySelector('.ea-copy-trail').open = true;
    const select = host.querySelector('#ea-story-child'), child = trace.newborns[11];
    select.focus();
    choose(select, child.id);
    expect(select.value).toBe(String(child.id));
    expect(document.activeElement).toBe(select);
    expectCopies(host, child);
    const stage = host.querySelectorAll('[data-story-stage]')[3];
    const marker = [...host.querySelectorAll('button')].find(node => node.textContent === 'Neutral marker A frequency');
    act(() => { stage.click(); marker.click(); });
    anchor.focus();
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus');
    rerender({ world: { ...world, settings: { ...world.settings, rainfall: [1, 1, 1] } },
      entryRequest: { ...entryRequest } });
    expect(focus).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(anchor);
    expect(select.value).toBe(String(child.id));
    expect(host.querySelector('.ea-copy-trail').open).toBe(true);
    expect(host.querySelector('[data-story-detail]').getAttribute('data-story-detail')).toBe(trace.stages[3].key);
    expect(host.querySelector('[data-generation-story]').getAttribute('data-story-lens')).toBe('marker');
    expectCopies(host, child);
    expect(JSON.stringify(world)).toBe(before);
    expect(model.step(world)).toEqual(next);
  });
});
