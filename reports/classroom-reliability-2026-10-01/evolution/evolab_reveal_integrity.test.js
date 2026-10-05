import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from '../../../tests/helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
let container, root, state, model;

function mount(world) {
  state = {
    evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: world.seed, introDismissed: true }, preservedDraft: 'Keep my draft' },
    otherTool: { writing: 'Keep other work' }
  };
  function Host() {
    const [data, setData] = React.useState(state);
    state = data;
    return window.StemLab._registry.evoLab.render(makeCtx({
      toolData: data,
      setToolData: setData,
      update: (tool, key, value) => setData(previous => ({ ...previous, [tool]: { ...previous[tool], [key]: value } }))
    }));
  }
  container = document.createElement('div'); document.body.append(container);
  root = ReactDOMClient.createRoot(container);
  act(() => root.render(React.createElement(Host)));
}
function button(text, scope = container) {
  const target = [...scope.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') || el.textContent).trim().startsWith(text));
  expect(target, 'button ' + text).toBeTruthy(); return target;
}
function click(text, scope = container) {
  act(() => button(text, scope).click());
  act(() => vi.advanceTimersByTime(0));
}
function guide() { return container.querySelector('.ei-watch-guide'); }
function expectPhase(phase) { expect(guide().getAttribute('data-watch-phase')).toBe(phase); }
function serialized(value) {
  return JSON.stringify(value, (_, entry) => entry && typeof entry === 'object' && !Array.isArray(entry)
    ? Object.fromEntries(Object.keys(entry).sort().map(key => [key, entry[key]])) : entry);
}
function expectPrivateReport() {
  expect(container.querySelector('.ei-field-report')).toBeNull();
  expect(container.querySelector('.ei-loop')).toBeNull();
}
function expectSameWorld(recorded) {
  const expected = serialized(recorded);
  expect(serialized(state.evoLab.island)).toBe(expected);
  expect(serialized(JSON.parse(localStorage.getItem('evoLab.island.v1')))).toBe(expected);
  expect(state.evoLab.preservedDraft).toBe('Keep my draft');
  expect(state.otherTool).toEqual({ writing: 'Keep other work' });
}

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); localStorage.clear();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  new Function(readFileSync(process.env.EVOLAB_REVEAL_SOURCE || 'stem_lab/stem_tool_evolab.js', 'utf8'))();
  model = window.StemLab.evoIslandModel;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove(); root = null; container = null;
  if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollDescriptor);
  else delete HTMLElement.prototype.scrollIntoView;
  vi.restoreAllMocks(); vi.clearAllTimers(); vi.useRealTimers();
});

describe('Living Island phase disclosure and terminal guidance', () => {
  it('withholds the complete report until offspring while revealing each recorded cohort without rerunning the world', () => {
    const initial = model.create(2026), expected = model.step(initial);
    mount(initial); click('Watch a generation'); expectPhase('parents'); expectPrivateReport(); expectSameWorld(expected);
    expect(guide().querySelector('.ei-watch-count').textContent).toContain(String(initial.history[0].population.length));
    click('Reveal survivors', guide()); expectPhase('survivors'); expectPrivateReport(); expectSameWorld(expected);
    expect(guide().querySelector('.ei-watch-count').textContent).toContain(String(expected.history[1].survivors.length));
    click('Meet the offspring', guide()); expectPhase('offspring'); expectSameWorld(expected);
    const report = container.querySelector('.ei-field-report'); expect(report).toBeTruthy();
    expect([...report.querySelectorAll('.ei-report-flow strong')].map(el => Number(el.textContent))).toEqual([
      initial.history[0].population.length, expected.history[1].survivors.length, expected.history[1].population.length
    ]);
    click('Previous stage', guide()); expectPhase('survivors'); expectPrivateReport(); expectSameWorld(expected);
    click('Previous stage', guide()); expectPhase('parents'); expectPrivateReport(); expectSameWorld(expected);
  });

  it('withholds the fallback summary under the same phase boundary', () => {
    vi.spyOn(window.StemLab.evoIslandObservation, 'briefing').mockReturnValue(null);
    const expected = model.step(model.create(2026)); mount(model.create(2026));
    click('Watch a generation'); expectPhase('parents'); expectPrivateReport();
    click('Reveal survivors', guide()); expectPhase('survivors'); expectPrivateReport();
    click('Meet the offspring', guide()); expectPhase('offspring'); expectSameWorld(expected);
    const summary = container.querySelector('.ei-loop'); expect(summary).toBeTruthy();
    expect([...summary.querySelectorAll('strong')].slice(0, 3).map(el => Number(el.textContent))).toEqual([
      expected.history[1].population.length, expected.history[1].survivors.length, expected.history[1].mutations
    ]);
  });

  it('keeps forecast outcome reports private until the offspring stage', () => {
    const initial = model.create(2026), expected = model.step(initial); mount(initial);
    click('Predict this round'); click('Lock forecast & watch'); expectPhase('parents'); expectPrivateReport(); expectSameWorld(expected);
    click('Reveal survivors', guide()); expectPhase('survivors'); expectPrivateReport(); expectSameWorld(expected);
    click('Meet the offspring', guide()); expectPhase('offspring'); expect(container.querySelector('.ei-field-report')).toBeTruthy(); expectSameWorld(expected);
  });

  it('retains complete recorded reports during ordinary historical playback and leaves evidence immutable', () => {
    let recorded = model.create(2026); for (let n = 0; n < 3; n++) recorded = model.step(recorded);
    const frozen = JSON.parse(JSON.stringify(recorded)); mount(recorded);
    act(() => Simulate.change(container.querySelector('#ei-time'), { target: { value: '1' } }));
    expect(guide()).toBeNull(); expect(container.querySelector('.ei-field-report')).toBeTruthy(); expect(state.evoLab.island).toEqual(frozen);
    click('Show parents'); expect(guide()).toBeNull(); expect(container.querySelector('.ei-field-report')).toBeTruthy(); expect(state.evoLab.island).toEqual(frozen);
    click('Show survivors'); expect(container.querySelector('.ei-field-report')).toBeTruthy(); expect(state.evoLab.island).toEqual(frozen);
    click('Show offspring'); expect(container.querySelector('.ei-field-report')).toBeTruthy(); expect(state.evoLab.island).toEqual(frozen);
  });

  for (const terminal of ['extinction', 'generation limit']) {
    it('replaces active habitat advice with review guidance after ' + terminal, () => {
      let world = { ...model.create(2026), living: false, selection: false, habitat: 'meadow' };
      if (terminal === 'extinction') {
        // A deliberately dwindled saved cohort cannot produce offspring with one possible parent.
        world.history[0].population = world.history[0].population.slice(0, 1);
        world.history[0].stats = model.stats(world.history[0].population);
        world.nextId = 2;
        world = model.step(world);
        expect(world.history[world.generation].population).toHaveLength(0);
      } else {
        while (world.generation < 60 && world.history[world.generation].population.length) world = model.step(world);
        expect(world.generation).toBe(60);
      }
      mount(world);
      const habitat = container.querySelector('.ei-habitat-grid'), hint = habitat.nextElementSibling;
      expect([...habitat.querySelectorAll('button')].every(el => el.disabled)).toBe(true);
      expect(hint.textContent).toContain(terminal === 'extinction' ? 'Rewind the timeline and inspect the last breeding generation.' : 'explore the timeline, export your data, and explain what changed.');
      expect(state.evoLab.island).toEqual(world);
      act(() => Simulate.change(container.querySelector('#ei-time'), { target: { value: '0' } }));
      expect(hint.textContent).toContain(terminal === 'extinction' ? 'went extinct' : '60 generations recorded');
      expect(state.evoLab.island).toEqual(world);
    });
  }
});
