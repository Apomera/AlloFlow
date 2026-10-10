import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_evolab.js'), 'utf8');
const start = source.indexOf('  function ArchipelagoStory(props) {');
const end = source.indexOf('  function ArchipelagoPassport(props) {', start);
if (start < 0 || end <= start) throw new Error('ArchipelagoStory source boundaries were not found');
const buildStory = new Function('ArchipelagoModel', 'ax', 'archSpecies', 'archTrait', 'archIslandName',
  'return (' + source.slice(start, end).trim() + ');');
const noop = () => {};
let model, Story, previousActEnvironment;
const mounted = [];

beforeEach(() => {
  previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  localStorage.clear();
  loadTool('stem_lab/stem_tool_evolab.js', 'evoLab');
  model = window.StemLab.evoArchipelagoModel;
  Story = buildStory(model, (key, fallback) => fallback,
    species => species === 'birds' ? 'Seedwing birds' : 'Shellseed plants',
    species => species === 'birds' ? 'Beak strength' : 'Seed-shell hardness',
    island => model.islands[island].name);
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

function expedition(seed = 21, settings = {}) {
  let world = model.create(seed, true);
  world.settings = { ...world.settings, migration: .4, mutation: .05, ...settings };
  return freeze(model.step(model.step(world)));
}

function mount(world) {
  const host = document.createElement('div'), anchor = document.createElement('button');
  anchor.textContent = 'Unrelated control';
  document.body.append(anchor, host);
  anchor.focus();
  const root = ReactDOMClient.createRoot(host);
  mounted.push({ root, host, anchor });
  let props = { React, world, generation: 1, island: 0, species: 'birds',
    onSpecies: noop, onInspect: noop, onVisit: noop, onAdvance: noop };
  function rerender(patch = {}) {
    props = { ...props, ...patch };
    act(() => root.render(React.createElement(Story, props)));
  }
  rerender();
  return { host, anchor, rerender };
}

function choose(select, value) {
  expect(select).toBeTruthy();
  act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, String(value));
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
}

function click(node) {
  expect(node).toBeTruthy();
  act(() => node.click());
}

function button(host, text) {
  const node = [...host.querySelectorAll('button')].find(item => item.textContent === text);
  expect(node, 'Missing button: ' + text).toBeTruthy();
  expect(node.type).toBe('button');
  return node;
}

function openLottery(host) {
  click(host.querySelector('[data-story-stage="parents"]'));
  const region = host.querySelector('section[aria-labelledby="ea-story-parent-title"]');
  expect(region).toBeTruthy();
  expect(region.querySelector('#ea-story-parent-title').tagName).toBe('H3');
  expect(region.querySelector('label[for="ea-story-parent"]').textContent).toContain('Choose a potential parent');
  expect(region.querySelector('#ea-story-parent').getAttribute('aria-label')).toBe('Choose a potential parent');
  return region;
}

// Enumerate both ordered choices independently: the second choice excludes the first.
function expectedCopyCounts(weights, offspring) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight, index) => {
    let count = 0;
    weights.forEach((otherWeight, other) => {
      if (index !== other) {
        count += weight / total * otherWeight / (total - weight);
        count += otherWeight / total * weight / (total - otherWeight);
      }
    });
    return count * offspring;
  });
}

function actualSlots(children, parentId) {
  return children.flatMap(child => child.parents.flatMap((id, slot) => id === parentId ? [{ childId: child.id, slot }] : []));
}

function expectSelected(host, parentId, expected, slots) {
  const detail = host.querySelector('[data-story-parent]');
  expect(Number(detail.getAttribute('data-story-parent'))).toBe(parentId);
  expect(Number(detail.getAttribute('data-parent-recorded'))).toBe(slots.length);
  if (expected === null) {
    expect(detail.hasAttribute('data-parent-expected')).toBe(false);
    expect(detail.hasAttribute('data-parent-difference')).toBe(false);
  } else {
    expect(Number(detail.getAttribute('data-parent-expected'))).toBeCloseTo(expected, 11);
    expect(Number(detail.getAttribute('data-parent-difference'))).toBeCloseTo(slots.length - expected, 11);
  }
  const links = [...host.querySelectorAll('[data-story-parent-child]')];
  expect(links.map(link => ({ childId: Number(link.getAttribute('data-story-parent-child')),
    slot: Number(link.getAttribute('data-story-parent-slot')) }))).toEqual(slots);
  links.forEach(link => { expect(link.tagName).toBe('BUTTON'); expect(link.type).toBe('button'); });
}

describe('recorded parent lottery investigation', () => {
  it('reconciles every parent’s expected and actual copy counts for both species using the recorded round', () => {
    const world = expedition(), before = JSON.stringify(world), next = model.step(world);
    const view = mount(world);
    expect(view.host.querySelector('#ea-story-parent')).toBeNull();
    let zeroParents = 0, nonzeroParents = 0, unequalExpectedAndActual = 0;
    for (const species of ['birds', 'plants']) {
      const island = species === 'birds' ? 0 : 2;
      view.rerender({ key: species, island, species });
      const trace = model.story(world, 1, island, species), children = world.history[1].demes[island][species];
      const expected = expectedCopyCounts(trace.parents.map(parent => parent.weight), children.length);
      const region = openLottery(view.host), select = region.querySelector('#ea-story-parent');
      expect(select.value).toBe('');
      expect([...select.options].map(option => option.value)).toEqual(['', ...trace.parents.map(parent => String(parent.id))]);
      let actualTotal = 0;
      trace.parents.forEach((parent, index) => {
        const slots = actualSlots(children, parent.id);
        choose(select, parent.id);
        expectSelected(view.host, parent.id, expected[index], slots);
        actualTotal += slots.length;
        if (slots.length) nonzeroParents++; else zeroParents++;
        if (Math.abs(slots.length - expected[index]) > 1e-8) unequalExpectedAndActual++;
      });
      expect(actualTotal).toBe(children.length * 2);
      expect(expected.reduce((sum, count) => sum + count, 0)).toBeCloseTo(children.length * 2, 11);
      const queued = { ...world, settings: { ...world.settings, selection: false, migration: 0, rainfall: [1, 1, 1] } };
      view.rerender({ world: queued });
      const last = trace.parents.at(-1);
      expectSelected(view.host, last.id, expected.at(-1), actualSlots(children, last.id));
      view.rerender({ world });
      click(view.host.querySelector('[data-story-stage="expected"]'));
      expect(view.host.querySelector('#ea-story-parent')).toBeNull();
    }
    expect(zeroParents).toBeGreaterThan(0);
    expect(nonzeroParents).toBeGreaterThan(0);
    expect(unequalExpectedAndActual).toBeGreaterThan(0);
    expect(JSON.stringify(world)).toBe(before);
    expect(model.step(world)).toEqual(next);
  });

  it('opens each real inherited slot with focus and an exact highlight, clearing the link on manual choices', () => {
    const world = expedition(), trace = model.story(world, 1, 0, 'birds');
    const children = world.history[1].demes[0].birds;
    const parent = trace.parents.find(item => actualSlots(children, item.id).length >= 2);
    expect(parent).toBeTruthy();
    const slots = actualSlots(children, parent.id), view = mount(world);
    openLottery(view.host);
    choose(view.host.querySelector('#ea-story-parent'), parent.id);
    for (const target of [slots[0], slots[1], slots[0]]) {
      openLottery(view.host);
      expect(view.host.querySelector('#ea-story-parent').value).toBe(String(parent.id));
      click(button(view.host, 'Neutral marker A frequency'));
      click(view.host.querySelector('[data-story-parent-child="' + target.childId + '"][data-story-parent-slot="' + target.slot + '"]'));
      expect(view.host.querySelector('[data-story-detail]').getAttribute('data-story-detail')).toBe('newborns');
      expect(view.host.querySelector('[data-generation-story]').getAttribute('data-story-lens')).toBe('trait');
      const select = view.host.querySelector('#ea-story-child');
      expect(select.value).toBe(String(target.childId));
      expect(document.activeElement).toBe(select);
      expect(view.host.querySelector('.ea-copy-trail').open).toBe(true);
      const highlights = [...view.host.querySelectorAll('[data-parent-lottery-link="true"]')];
      expect(highlights).toHaveLength(1);
      expect(Number(highlights[0].getAttribute('data-story-copy'))).toBe(target.slot);
      expect(Number(highlights[0].getAttribute('data-copy-parent'))).toBe(parent.id);
      expect(highlights[0].textContent).toContain('Copy from selected parent');
      const birth = trace.newborns.find(item => item.id === target.childId);
      const copy = birth.copies[target.slot];
      expect(Number(highlights[0].getAttribute('data-copy-before'))).toBe(copy.traitBeforeMutation);
      expect(Number(highlights[0].getAttribute('data-copy-after'))).toBe(copy.traitAfterMutation);
      expect(Number(highlights[0].getAttribute('data-copy-marker'))).toBe(copy.marker);
    }
    const alternative = trace.newborns.find(child => child.id !== slots[0].childId);
    choose(view.host.querySelector('#ea-story-child'), alternative.id);
    expect(view.host.querySelector('[data-parent-lottery-link="true"]')).toBeNull();
    openLottery(view.host);
    click(view.host.querySelector('[data-story-parent-child]'));
    expect(view.host.querySelector('[data-parent-lottery-link="true"]')).toBeTruthy();
    openLottery(view.host);
    choose(view.host.querySelector('#ea-story-parent'), trace.parents.find(item => item.id !== parent.id).id);
    expect(view.host.querySelector('[data-parent-lottery-link="true"]')).toBeNull();
  });

  it('handles empty, singleton and two-parent pools and lets chance remain visible with selection switched off', () => {
    const view = mount(expedition());
    for (const size of [0, 1, 2]) {
      let world = model.create(9, true);
      world.settings = { ...world.settings, migration: 0, mutation: 0 };
      world.history[0].demes[0].birds = world.history[0].demes[0].birds.slice(0, size)
        .map((parent, index) => ({ ...parent, genes: index ? [.9, .9] : [.2, .2] }));
      world = freeze(model.step(world));
      const trace = model.story(world, 1, 0, 'birds'), children = world.history[1].demes[0].birds;
      view.rerender({ key: size, world });
      const region = openLottery(view.host), select = region.querySelector('#ea-story-parent');
      expect(select.disabled).toBe(size === 0);
      expect(button(region, 'Find a parent with no offspring').disabled).toBe(size !== 1);
      expect(button(region, 'Find a parent with offspring').disabled).toBe(size < 2);
      expect(region.textContent).not.toMatch(/NaN|Infinity/);
      if (!size) {
        expect(view.host.querySelector('[data-story-parent]')).toBeNull();
        expect(view.host.querySelector('[data-story-parent-child]')).toBeNull();
      } else {
        trace.parents.forEach(parent => {
          choose(select, parent.id);
          expectSelected(view.host, parent.id, size === 1 ? null : children.length, actualSlots(children, parent.id));
        });
        if (size === 1) {
          expect(children).toHaveLength(0);
          expect(view.host.querySelector('[data-story-parent-child]')).toBeNull();
        } else {
          expect(children).toHaveLength(24);
          expect(trace.parents[0].weight).not.toBe(trace.parents[1].weight);
        }
      }
    }
    const world = expedition(5, { selection: false, migration: 0, mutation: 0 });
    const trace = model.story(world, 1, 0, 'birds'), children = world.history[1].demes[0].birds;
    view.rerender({ key: 'selection-off', world });
    openLottery(view.host);
    const counts = trace.parents.map(parent => actualSlots(children, parent.id).length);
    expect(new Set(counts).size).toBeGreaterThan(1);
    trace.parents.forEach(parent => {
      choose(view.host.querySelector('#ea-story-parent'), parent.id);
      expectSelected(view.host, parent.id, children.length * 2 / trace.parents.length, actualSlots(children, parent.id));
    });
  });

  it('cycles matching parents deterministically, preserves queued-setting choices and resets on context or founding-root changes', () => {
    const world = expedition(), before = JSON.stringify(world), next = model.step(world);
    const trace = model.story(world, 1, 0, 'birds'), view = mount(world);
    const region = openLottery(view.host), random = vi.spyOn(Math, 'random');
    for (const [label, candidates] of [
      ['Find a parent with no offspring', trace.parents.filter(parent => parent.gametes === 0)],
      ['Find a parent with offspring', trace.parents.filter(parent => parent.gametes > 0)]
    ]) {
      expect(candidates.length).toBeGreaterThan(0);
      choose(view.host.querySelector('#ea-story-parent'), '');
      const action = button(region, label);
      expect(action.disabled).toBe(false);
      for (let index = 0; index <= candidates.length; index++) {
        click(action);
        expect(view.host.querySelector('#ea-story-parent').value).toBe(String(candidates[index % candidates.length].id));
      }
    }
    const selected = view.host.querySelector('#ea-story-parent').value;
    click(view.host.querySelector('[data-story-parent-child]'));
    const linked = view.host.querySelector('[data-parent-lottery-link="true"]');
    expect(linked).toBeTruthy();
    const childId = view.host.querySelector('#ea-story-child').value;
    view.anchor.focus();
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus');
    view.rerender({ world: { ...world, settings: { ...world.settings, rainfall: [1, 1, 1] } } });
    expect(focus).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(view.anchor);
    expect(view.host.querySelector('#ea-story-child').value).toBe(childId);
    expect(view.host.querySelector('[data-parent-lottery-link="true"]')).toBeTruthy();
    openLottery(view.host);
    expect(view.host.querySelector('#ea-story-parent').value).toBe(selected);
    for (const patch of [{ generation: 2 }, { island: 1 }, { species: 'plants' }, { world: expedition(22) }]) {
      choose(view.host.querySelector('#ea-story-parent'), view.host.querySelector('#ea-story-parent').options[1].value);
      view.rerender(patch);
      openLottery(view.host);
      expect(view.host.querySelector('#ea-story-parent').value).toBe('');
      expect(view.host.querySelector('[data-story-parent]')).toBeNull();
      expect(view.host.querySelector('[data-parent-lottery-link="true"]')).toBeNull();
    }
    expect(random).not.toHaveBeenCalled();
    expect(JSON.stringify(world)).toBe(before);
    expect(model.step(world)).toEqual(next);
  });
});
