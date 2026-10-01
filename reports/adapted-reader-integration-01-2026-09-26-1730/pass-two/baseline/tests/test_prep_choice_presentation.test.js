import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// Twenty-two of the thirty-two shipped packs store their answer keys in a
// strict A, B, C, D, A, B... cycle in file order, and the diagnostic banks
// serve items in file order. The Hub now shows each item's choices in a
// per-session order and records the learner's pick in the stored index space.
// These tests pin the mapping, the cases where order must stay fixed, and the
// end-to-end path: a learner who picks the key by its text is scored correct.
const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, Hub, Component, root, host;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
  Component = Hub.TestPrepHub;
}, 30_000);

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
});

const item = (overrides = {}) => ({
  id: 'probe-1',
  prompt: 'Which one?',
  choices: ['alpha', 'beta', 'gamma', 'delta'],
  choiceRationales: ['why alpha', 'why beta', 'why gamma', 'why delta'],
  answerIndex: 2,
  rationale: 'gamma is right.',
  ...overrides,
});

describe('testPrepPresentItem', () => {
  it('permutes choices and rationales together and remaps the key', () => {
    const source = item();
    let moved = 0;
    for (let seed = 0; seed < 12; seed += 1) {
      const shown = Hub.presentItem(source, 'seed-' + seed);
      expect(shown.choiceOrder).toHaveLength(4);
      expect(shown.choiceOrder.slice().sort()).toEqual([0, 1, 2, 3]);
      expect(shown.choices[shown.answerIndex]).toBe('gamma');
      shown.choices.forEach((choice, index) => {
        expect(choice).toBe(source.choices[shown.choiceOrder[index]]);
        expect(shown.choiceRationales[index]).toBe(source.choiceRationales[shown.choiceOrder[index]]);
      });
      expect(shown.sourceAnswerIndex).toBe(2);
      expect(Hub.sourceChoiceIndex(shown, shown.answerIndex)).toBe(2);
      if (shown.answerIndex !== 2) moved += 1;
    }
    // A shuffle that never moves the key is not a shuffle.
    expect(moved).toBeGreaterThan(0);
    // The source item is untouched.
    expect(source.answerIndex).toBe(2);
    expect(source.choices[0]).toBe('alpha');
  });

  it('is stable for one seed and differs across seeds', () => {
    const a = Hub.presentItem(item(), 'seed-a');
    const b = Hub.presentItem(item(), 'seed-a');
    expect(a.choiceOrder).toEqual(b.choiceOrder);
    const orders = new Set();
    for (let seed = 0; seed < 24; seed += 1) orders.add(Hub.presentItem(item(), 'seed-' + seed).choiceOrder.join(''));
    expect(orders.size).toBeGreaterThan(1);
  });

  it('keeps the stored order with no seed, for fixed items, and for locked shapes', () => {
    const cases = {
      'no seed': [item(), ''],
      'fixed item': [item({ choicePresentation: 'fixed' }), 'seed'],
      'numeric choices': [item({ choices: ['2', '4', '6', '8'] }), 'seed'],
      'numeric with units': [item({ choices: ['2.5 m/s', '5 m/s', '1.0 × 10^3 J', '−4 N'] }), 'seed'],
      'all of the above': [item({ choices: ['x', 'y', 'z', 'All of the above'] }), 'seed'],
      'roman numerals': [item({ choices: ['I only', 'II only', 'I and II', 'I, II, and III'] }), 'seed'],
      'both a and b': [item({ choices: ['x', 'y', 'Both x and y', 'z'] }), 'seed'],
      'letter in rationale': [item({ rationale: 'Choice B confuses the two.' }), 'seed'],
      'letter in choice rationale': [item({ choiceRationales: ['a', 'Option (C) is the definition.', 'c', 'd'] }), 'seed'],
      'two choices': [item({ choices: ['true', 'false'], choiceRationales: ['a', 'b'], answerIndex: 0 }), 'seed'],
    };
    Object.entries(cases).forEach(([label, [source, seed]]) => {
      const shown = Hub.presentItem(source, seed);
      expect(shown.choiceOrder, label).toEqual(source.choices.map((_, index) => index));
      expect(shown.choices, label).toEqual(source.choices);
      expect(shown.answerIndex, label).toBe(source.answerIndex);
      expect(shown.choicePresentation, label).toBe('fixed');
      expect(Hub.choiceOrderLocked(source), label).toBe(seed === '' ? false : true);
    });
  });

  it('does not lock ordinary prose that merely contains a capital letter word', () => {
    expect(Hub.choiceOrderLocked(item({ choices: ['A vitamin', 'B cells', 'C. elegans', 'D. melanogaster'] }))).toBe(false);
    expect(Hub.choiceOrderLocked(item({ rationale: 'A buffer resists pH change.' }))).toBe(false);
  });

  it('maps a display index back to the stored index and passes through unknown values', () => {
    const shown = Hub.presentItem(item(), 'seed-z');
    shown.choiceOrder.forEach((sourceIndex, displayIndex) => expect(Hub.sourceChoiceIndex(shown, displayIndex)).toBe(sourceIndex));
    expect(Hub.sourceChoiceIndex(shown, null)).toBe(null);
    expect(Hub.sourceChoiceIndex(item(), 3)).toBe(3);
    expect(Hub.sourceChoiceIndex(shown, 9)).toBe(9);
  });

  it('locks only the shipped items whose choices or rationales require it', () => {
    // Real packs: the lock must fire on the few items that reference a
    // lettered option or list numeric choices, and stay quiet elsewhere.
    const stats = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/ap_statistics_foundation_pilot.json'), 'utf8'));
    const locked = stats.items.filter((entry) => Hub.choiceOrderLocked(entry));
    expect(locked.length).toBeGreaterThan(0);
    expect(locked.length).toBeLessThan(stats.items.length / 2);
    const gov = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/ap_us_government_foundation_pilot.json'), 'utf8'));
    expect(gov.items.filter((entry) => Hub.choiceOrderLocked(entry)).length).toBe(0);
  }, 60_000);
});

describe('testPrepDistractorRationalesIdentical', () => {
  it('detects one sentence repeated for every distractor and nothing else', () => {
    expect(Hub.distractorRationalesIdentical(item())).toBe(false);
    expect(Hub.distractorRationalesIdentical(item({ choiceRationales: ['same', 'same', 'key note', 'same'] }))).toBe(true);
    expect(Hub.distractorRationalesIdentical(item({ choiceRationales: ['same', 'other', 'key note', 'same'] }))).toBe(false);
    expect(Hub.distractorRationalesIdentical(item({ choiceRationales: [] }))).toBe(false);
  });

  it('speaks a repeated distractor note once', () => {
    const boilerplate = 'This choice does not match the definition in the question.';
    const spoken = Hub.feedbackSpeechText(item({ choiceRationales: [boilerplate, boilerplate, 'key note', boilerplate] }), 0, 'full', 'full');
    expect(spoken.split(boilerplate).length - 1).toBe(1);
    const distinct = Hub.feedbackSpeechText(item(), 0, 'full', 'full');
    expect(distinct).toContain('why beta');
    expect(distinct).toContain('why delta');
  });
});

describe('Hub practice screen', () => {
  async function mount(props = {}) {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component, { isOpen: true, onClose: () => {}, ...props })); });
  }
  const button = (text) => Array.from(host.querySelectorAll('button')).find((entry) => entry.textContent.includes(text));
  async function click(text) { const el = button(text); expect(el, 'button ' + text).toBeTruthy(); await act(async () => { el.click(); }); }

  it('scores the key by its text whatever position it lands in, and records progress in the stored index space', async () => {
    await mount();
    await click('Open practice pack');
    const pack = Hub.listPacks().find((candidate) => candidate.id === 'workplace-safety-foundations-demo');
    expect(pack.choicePresentation).toBe('shuffled');
    const positions = [];
    for (let index = 0; index < pack.items.length; index += 1) {
      const source = pack.items[index];
      const radios = Array.from(host.querySelectorAll('input[type="radio"]'));
      expect(radios).toHaveLength(source.choices.length);
      const shownTexts = radios.map((radio) => radio.closest('label').textContent.replace(/^[A-D]\.\s*/, ''));
      // Every source choice is on screen exactly once.
      source.choices.forEach((choice) => expect(shownTexts.filter((text) => text === choice)).toHaveLength(1));
      const keyPosition = shownTexts.indexOf(source.choices[source.answerIndex]);
      positions.push(keyPosition);
      await act(async () => { radios[keyPosition].click(); });
      await click('Check answer');
      expect(host.textContent).toContain('Correct');
      await click(index === pack.items.length - 1 ? 'Finish practice' : 'Next question');
    }
    expect(host.textContent).toContain('5/5');
    // Progress is stored against the pack's own indexes, not the screen order.
    const saved = JSON.parse(localStorage.getItem('alloflow_test_prep_progress_v1'));
    const text = JSON.stringify(saved);
    expect(text).toContain('workplace-safety-foundations-demo');
    expect(text).not.toContain('choiceOrder');
    // Five items, five shown key positions: not every key can sit where the
    // pack stored it unless the seed happened to be the identity everywhere.
    expect(positions).toHaveLength(pack.items.length);
  }, 30_000);

  it('honours a pack that declares a fixed choice order', () => {
    const fixed = Hub.normalizePack({ id: 'fixed-probe', title: 'Fixed', choicePresentation: 'fixed', items: [item()] });
    expect(fixed.choicePresentation).toBe('fixed');
    const open = Hub.normalizePack({ id: 'open-probe', title: 'Open', items: [item()] });
    expect(open.choicePresentation).toBe('shuffled');
    expect(open.items[0].choicePresentation).toBe('');
    expect(Hub.normalizePack({ id: 'p', title: 'P', items: [item({ choicePresentation: 'fixed' })] }).items[0].choicePresentation).toBe('fixed');
  });
});
