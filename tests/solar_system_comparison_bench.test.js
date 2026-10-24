import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const WORLDS = {
  Mercury: { radius: 2440, gravity: 0.38 }, Venus: { radius: 6052, gravity: 0.91 },
  Earth: { radius: 6371, gravity: 1 }, Mars: { radius: 3390, gravity: 0.38 },
  Jupiter: { radius: 69911, gravity: 2.53 }, Saturn: { radius: 58232, gravity: 1.06 },
  Uranus: { radius: 25362, gravity: 0.89 }, Neptune: { radius: 24622, gravity: 1.14 },
  Pluto: { radius: 1188, gravity: 0.06 },
};
const WORLD_KEYS = Object.keys(WORLDS);
const PAIR = 'Earth:Jupiter';
const EXPLANATION = 'Jupiter is about eleven times wider, but only 2.53 times stronger in listed gravity.';

function translate(key, fallback) {
  const world = WORLD_KEYS.find((name) => key === `stem.solar_sys.${name.toLowerCase()}`);
  return world || fallback || key;
}

// These controls are the actual native elements and callbacks produced by the
// tool. Mounted browser coverage owns portrait drawing, layout and live refs.
function renderBench(seed = {}, overrides = {}) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
    showVisualCompare: true, selectedPlanet: 'Earth', viewTab: 'overview', paused: true,
    compare1: 'Earth', compare2: 'Jupiter', missionLog: [], journalEntries: [], ...seed,
  } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (typeof type === 'string' && props &&
        ['onClick', 'onChange'].some((name) => typeof props[name] === 'function')) {
      const id = String(callbacks.size);
      callbacks.set(id, props);
      return React.createElement(type, { ...props, 'data-bench-callback': id }, ...children);
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map();
      store.dirty = false;
      const ctx = makeCtx({ t: translate, ...overrides, React: callbackReact }, store);
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => config.render(ctx)));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  const outer = () => document.getElementById('solar-visual-comparison');
  function handler(control, name = 'onClick') {
    expect(control, 'The production comparison control must be rendered').toBeTruthy();
    expect(control.disabled, 'Only an enabled control can be activated').toBe(false);
    const fn = callbacks.get(control.dataset.benchCallback)?.[name];
    expect(fn).toBeTypeOf('function');
    return fn;
  }
  function event(control, value) {
    return { target: value === undefined ? control : { value }, currentTarget: control, preventDefault() {} };
  }
  function click(control) { handler(control)(event(control)); render(); }
  function change(control, value) { handler(control, 'onChange')(event(control, value)); render(); }
  function select(which) {
    return outer()?.querySelector(`select[aria-label="${which} world for visual comparison"]`);
  }
  render();
  return {
    get state() { return store.toolData.solarSystem; },
    get outer() { return outer(); },
    get comparison() { return outer()?.querySelector('[data-solar-planet-comparison]'); },
    get draft() { return document.getElementById('solar-compare-reasoning'); },
    get save() { return outer()?.querySelector('[data-solarsystem-compare-save]'); },
    get swap() { return outer()?.querySelector('button[aria-label="Swap visually compared worlds"]'); },
    select, click, change, handler, event, render,
    choose(which, value) { change(select(which), value); },
    write(value) { change(document.getElementById('solar-compare-reasoning'), value); },
    challenge(pair) { click(outer().querySelector(`[data-compare-challenge="${pair}"]`)); },
  };
}

function meters(env, kind) {
  return [...env.comparison.querySelectorAll(`[data-compare-bars="${kind}"] [role="meter"]`)];
}
function ratio(env, kind) {
  const node = env.comparison.querySelector(`#solar-compare-ratios [data-comparison-ratio="${kind}"]`);
  expect(node).not.toBeNull();
  expect(node.getAttribute('data-value')).not.toBeNull();
  const value = Number(node.getAttribute('data-value'));
  expect(Number.isFinite(value)).toBe(true);
  return value;
}
function exactRow(env, label) {
  return [...env.comparison.querySelectorAll('tbody tr')].find((row) => row.querySelector('th')?.textContent.trim() === label);
}
function assertBars(env, kind, values, unit) {
  const controls = meters(env, kind);
  expect(controls).toHaveLength(2);
  const ceiling = Math.max(...values);
  controls.forEach((meter, index) => {
    expect(Number(meter.getAttribute('aria-valuemin'))).toBe(0);
    expect(Number(meter.getAttribute('aria-valuemax'))).toBe(ceiling);
    expect(Number(meter.getAttribute('aria-valuenow'))).toBe(values[index]);
    expect(meter.getAttribute('aria-valuetext')).toContain(unit);
    expect(parseFloat(meter.firstElementChild?.style.width)).toBeCloseTo(100 * values[index] / ceiling, 12);
  });
}
function retained(state) {
  const { compare1, compare2, compareReasoningDrafts, compareEvidenceSavedFor, evidenceMissionCompared, journalEntries, ...rest } = state;
  return structuredClone(rest);
}

describe('Solar System comparison bench', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'solarSystem');
    vi.stubGlobal('matchMedia', vi.fn((query) => ({ matches: false, media: query,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = '';
  });

  it('keeps an empty comparison as an explicitly unselected native pair', () => {
    const env = renderBench({ compare1: '', compare2: '' });
    expect(env.outer?.tagName).toBe('SECTION');
    expect(env.select('First').value).toBe('');
    expect(env.select('Second').value).toBe('');
    for (const which of ['First', 'Second']) {
      expect([...env.select(which).options].map((option) => option.value)).toEqual(['', ...WORLD_KEYS]);
    }
    expect(env.comparison).toBeNull();
    expect(env.outer.textContent).toContain('Choose two worlds to begin');
    expect(env.swap.disabled).toBe(true);
    expect(env.state.compare1).toBe(''); expect(env.state.compare2).toBe('');
  });

  it('provides a named scientific region, raw ratios and both measurement charts', () => {
    const env = renderBench();
    expect(env.comparison.getAttribute('role')).toBe('region');
    expect(env.comparison.getAttribute('aria-label')).toMatch(/Earth.*Jupiter/);
    expect(env.comparison.classList.contains('solar-compare-inspection')).toBe(true);
    expect(env.comparison.getAttribute('data-same-world')).toBe('false');
    expect(document.getElementById('solar-compare-ratios')?.tagName).toBe('DL');
    expect(ratio(env, 'diameter')).toBeCloseTo(139822 / 12742, 12);
    expect(ratio(env, 'gravity')).toBe(2.53);
    assertBars(env, 'diameter', [12742, 139822], 'km');
    assertBars(env, 'gravity', [1, 2.53], 'g');
    // Each meter also speaks its Earth-relative ratio (Earth reference markers, 10-12).
    expect(meters(env, 'gravity')[0].getAttribute('aria-valuetext')).toBe('1.00 g; 1.00× Earth’s listed gravity');
    expect(meters(env, 'gravity')[1].getAttribute('aria-valuetext')).toBe('2.53 g; 2.53× Earth’s listed gravity');
  });

  it.each([['Earth', 'Jupiter'], ['Mercury', 'Mars'], ['Pluto', 'Jupiter']])(
    'preserves the exact %s/%s diameter ratio and discloses the small-disc minimum', (first, second) => {
      const env = renderBench({ compare1: first, compare2: second });
      const maximum = Math.max(WORLDS[first].radius, WORLDS[second].radius);
      for (const world of [first, second]) {
        const portrait = env.comparison.querySelector(`[data-comparison-world="${world}"]`);
        expect(portrait).not.toBeNull();
        const raw = 128 * WORLDS[world].radius / maximum;
        expect(Number(portrait.getAttribute('data-diameter-km'))).toBe(2 * WORLDS[world].radius);
        expect(Number(portrait.getAttribute('data-raw-diameter'))).toBeCloseTo(raw, 12);
        expect(Number(portrait.getAttribute('data-drawn-diameter'))).toBeCloseTo(Math.max(3, raw), 12);
        expect(portrait.getAttribute('data-exaggerated')).toBe(String(raw < 3));
      }
      assertBars(env, 'diameter', [2 * WORLDS[first].radius, 2 * WORLDS[second].radius], 'km');
    }
  );

  it('shows that the smaller Uranus/Neptune world can have stronger listed gravity', () => {
    const env = renderBench({ compare1: 'Uranus', compare2: 'Neptune' });
    expect(ratio(env, 'diameter')).toBeCloseTo(50724 / 49244, 12);
    expect(ratio(env, 'gravity')).toBeCloseTo(1.14 / 0.89, 12);
    assertBars(env, 'diameter', [50724, 49244], 'km');
    assertBars(env, 'gravity', [0.89, 1.14], 'g');
    expect(env.comparison.textContent).toMatch(/Neptune.*gravity/);
  });

  it('keeps equal listed gravity distinct from unequal diameter in saved evidence', () => {
    const awardXP = vi.fn();
    const env = renderBench({ compare1: 'Mercury', compare2: 'Mars' }, { awardXP });
    expect(ratio(env, 'gravity')).toBe(1);
    expect(ratio(env, 'diameter')).toBeCloseTo(6780 / 4880, 12);
    assertBars(env, 'gravity', [0.38, 0.38], 'g');
    env.click(env.save);
    const entry = env.state.journalEntries.at(-1);
    expect(entry.observation).toContain('same listed gravity');
    expect(entry.observation).not.toContain('stronger');
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('retains the seven exact properties with diameter and weight-force units consistent with the charts', () => {
    const env = renderBench();
    const region = env.comparison.querySelector('[role="region"][aria-label="Exact world comparison values"]');
    expect(region?.getAttribute('tabindex')).toBe('0');
    const table = region.querySelector('table');
    expect(table.querySelector('caption')?.textContent.trim()).toBeTruthy();
    expect([...table.querySelectorAll('thead th')].map((cell) => cell.textContent.trim())).toEqual(['Measure', 'Earth', 'Jupiter']);
    expect([...table.querySelectorAll('thead th')].every((cell) => cell.getAttribute('scope') === 'col')).toBe(true);
    const rows = [...table.querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(7);
    expect(rows.map((row) => row.querySelector('th')?.textContent.trim())).toEqual([
      'Temperature', 'Day', 'Year', 'Diameter', 'Moons', 'Surface gravity', '70 kg mass: weight force',
    ]);
    expect(rows.every((row) => row.children.length === 3 && row.querySelector('th')?.getAttribute('scope') === 'row')).toBe(true);
    expect([...exactRow(env, 'Diameter').querySelectorAll('td')].map((cell) => cell.textContent.trim())).toEqual(['12,742 km', '139,822 km']);
    expect([...exactRow(env, 'Surface gravity').querySelectorAll('td')].map((cell) => cell.textContent.trim())).toEqual(['1.00g', '2.53g']);
    const forces = [...exactRow(env, '70 kg mass: weight force').querySelectorAll('td')];
    expect(forces.map((cell) => cell.textContent.trim())).toEqual([
      `${Math.round(70 * 9.80665).toLocaleString()} N`, `${Math.round(70 * 2.53 * 9.80665).toLocaleString()} N`,
    ]);
  });

  it.each([['Earth', 'Jupiter'], ['earth', 'jupiter'], ['stem.solar_sys.earth', 'stem.solar_sys.jupiter']])(
    'resolves restored %s/%s selections without rewriting them on render', (first, second) => {
      const env = renderBench({ compare1: first, compare2: second });
      expect(env.select('First').value).toBe('Earth');
      expect(env.select('Second').value).toBe('Jupiter');
      expect(env.comparison).not.toBeNull();
      expect(env.state.compare1).toBe(first); expect(env.state.compare2).toBe(second);
      env.click(env.swap);
      expect(env.state.compare1).toBe('Jupiter'); expect(env.state.compare2).toBe('Earth');
    }
  );

  it('resolves world keys to localized canonical names while keeping pair drafts stable', () => {
    const env = renderBench({ compareReasoningDrafts: { [PAIR]: EXPLANATION } }, {
      t: (key, fallback) => key === 'stem.solar_sys.earth' ? 'Terre' : translate(key, fallback),
    });
    expect(env.select('First').value).toBe('Terre');
    expect(env.select('Second').value).toBe('Jupiter');
    expect(env.draft.value).toBe(EXPLANATION);
    expect(env.state.compare1).toBe('Earth');
    env.click(env.swap);
    expect(env.state.compare1).toBe('Jupiter'); expect(env.state.compare2).toBe('Terre');
    expect(env.draft.value).toBe(EXPLANATION);
  });

  it('leaves invalid restored selections untouched and renders the empty placeholder safely', () => {
    for (const value of [null, {}, [], 42, 'not-a-world', 'Sun']) {
      const env = renderBench({ compare1: value, compare2: 'Jupiter' });
      expect(env.select('First').value).toBe('');
      expect(env.select('Second').value).toBe('Jupiter');
      expect(env.comparison).toBeNull();
      expect(env.outer.textContent).toContain('Choose two worlds to begin');
      expect(env.outer.textContent).not.toMatch(/\[object Object\]|NaN|undefined/);
      expect(env.state.compare1).toBe(value);
      env.click(env.swap);
      expect(env.state.compare1).toBe('Jupiter'); expect(env.state.compare2).toBe('');
    }
  });

  it('uses a stable sorted draft key through native challenge switching and swapping', () => {
    const drafts = { [PAIR]: EXPLANATION, 'Neptune:Uranus': 'The smaller world has stronger listed gravity.', other: 'Retain unrelated draft' };
    const env = renderBench({ compare1: 'Jupiter', compare2: 'Earth', compareReasoningDrafts: drafts });
    expect(env.draft.value).toBe(EXPLANATION);
    env.click(env.swap);
    expect(env.draft.value).toBe(EXPLANATION);
    env.challenge('Uranus-Neptune');
    expect(env.state.compare1).toBe('Uranus'); expect(env.state.compare2).toBe('Neptune');
    expect(env.draft.value).toBe(drafts['Neptune:Uranus']);
    env.write('A revised Neptune explanation uses both measurements.');
    env.challenge('Earth-Jupiter');
    expect(env.draft.value).toBe(EXPLANATION);
    expect(env.state.compareReasoningDrafts.other).toBe('Retain unrelated draft');
    expect(env.state.compareReasoningDrafts['Neptune:Uranus']).toContain('revised');
  });

  it('derives empty reasoning from malformed maps, inherited pairs and nonstring drafts', () => {
    for (const drafts of [null, [], 'drafts', { [PAIR]: {} }, { [PAIR]: 0 }, { [PAIR]: ['text'] }, Object.create({ [PAIR]: EXPLANATION })]) {
      const env = renderBench({ compareReasoningDrafts: drafts });
      expect(env.draft.value).toBe('');
      expect(env.outer.textContent).not.toMatch(/\[object Object\]|NaN|undefined/);
      expect(env.state.compareReasoningDrafts).toBe(drafts);
      env.click(env.save);
      expect(env.state.journalEntries).toHaveLength(1);
      expect(env.state.journalEntries[0].investigation).toEqual({ id: 'compare', explanation: '' });
    }
  });

  it('renders restored same-world measurements honestly and disables evidence capture', () => {
    const env = renderBench({ compare1: 'earth', compare2: 'stem.solar_sys.earth' });
    expect(env.comparison.getAttribute('data-same-world')).toBe('true');
    expect(ratio(env, 'diameter')).toBe(1); expect(ratio(env, 'gravity')).toBe(1);
    assertBars(env, 'diameter', [12742, 12742], 'km');
    assertBars(env, 'gravity', [1, 1], 'g');
    expect(env.save.disabled).toBe(true);
    expect(env.state.journalEntries).toEqual([]);
  });

  it('honors a legacy saved-pair marker until writing changes, then permits revised evidence', () => {
    const env = renderBench({ compareEvidenceSavedFor: PAIR, compareReasoningDrafts: { [PAIR]: EXPLANATION } });
    expect(env.save.disabled).toBe(true);
    expect(env.state.journalEntries).toEqual([]);
    env.write(EXPLANATION + ' I would compare mass next.');
    expect(env.state.compareEvidenceSavedFor).toBeNull();
    expect(env.save.disabled).toBe(false);
    env.click(env.save);
    expect(env.state.journalEntries).toHaveLength(1);
    expect(env.state.journalEntries[0].surprise).toContain('compare mass next');
    expect(env.state.compareEvidenceSavedFor).toBe(PAIR);
  });

  it('guards repeated captured save callbacks and allows a new explanation without repeat XP', () => {
    const awardXP = vi.fn(), tryAward = vi.fn();
    const env = renderBench({ compareReasoningDrafts: { [PAIR]: `  ${EXPLANATION}  ` } }, { awardXP, tryAward });
    const control = env.save, save = env.handler(control), event = env.event(control);
    save(event); save(event); save(event);
    env.render();
    expect(env.state.journalEntries).toHaveLength(1);
    expect(env.state.journalEntries[0].surprise).toBe(EXPLANATION);
    expect(env.state.journalEntries[0].investigation).toEqual({ id: 'compare', explanation: EXPLANATION });
    expect(env.state.journalEntries[0].observation).toContain('139,822');
    env.write(EXPLANATION + ' Surface gravity also depends on mass.');
    env.click(env.save);
    expect(env.state.journalEntries).toHaveLength(2);
    expect(env.state.journalEntries[1].surprise).toContain('depends on mass');
    expect(awardXP).not.toHaveBeenCalled(); expect(tryAward).not.toHaveBeenCalled();
  });

  it('preserves other learning state and existing journal records throughout comparison actions', () => {
    const prior = { planet: 'Mars', observation: 'Retain this transfer result.', transferComparisonId: 'older-flight' };
    const env = renderBench({
      journalEntries: [prior], orr_time: 4.25, orr_sel: 'mercury', orr_paused: true,
      orr_snapshots: { earth: { A: { time: 0.2 } } }, orr_mission_progress: { 1: { started: true } },
      keplerInquiry: { a: 3, e: 0.2, baseline: { a: 1, e: 0, mass: 1 } },
      marsMission: { startedAt: 123, prediction: 'miss' }, orr_trf: 'venus', orr_trt: 'earth',
      transferDebriefs: { 'earth-mars': { explanation: 'Retain captured explanation' } },
      compareReasoningDrafts: { other: 'Keep another comparison draft' },
    });
    const before = retained(env.state);
    env.challenge('Uranus-Neptune'); env.click(env.swap);
    env.choose('First', 'Earth'); env.choose('Second', 'Jupiter');
    env.write(EXPLANATION); env.click(env.save);
    expect(retained(env.state)).toEqual(before);
    expect(env.state.compareReasoningDrafts.other).toBe('Keep another comparison draft');
    expect(env.state.journalEntries[0]).toBe(prior);
    expect(env.state.journalEntries).toHaveLength(2);
    expect(env.state.evidenceMissionCompared).toBe(true);
  });
});
