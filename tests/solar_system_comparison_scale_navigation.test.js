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
const SYSTEM_MAXIMA = { diameter: 139822, gravity: 2.53 };

function translate(key, fallback) {
  return Object.keys(WORLDS).find((name) => key === `stem.solar_sys.${name.toLowerCase()}`) || fallback || key;
}

function elementText(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(elementText).join('');
  return React.isValidElement(node) ? elementText(node.props.children) : '';
}

// Serialize production comparison elements, navigation targets and the two
// native picker buttons used to supersede a request. No unrelated explorer,
// WebGL viewer, dashboard or stylesheet enters jsdom.
function comparisonTestTree(tree) {
  const retained = [];
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-visual-comparison' || node.props.id === 'solar-world-detail-title' ||
        ['Select Mars from mission control', 'Select Jupiter from mission control'].includes(node.props['aria-label']) ||
        (node.type === 'button' && elementText(node.props.children).includes('Back to comparison'))) {
      retained.push(node); return;
    }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree);
  return React.createElement(React.Fragment, null, retained);
}

// Real callbacks and refs come from the production React elements. Refs persist
// through SSR passes; explicit commit() models attachment separately from render.
function renderComparison(seed = {}) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
    showVisualCompare: true, selectedPlanet: 'Earth', viewTab: 'overview', paused: true,
    compare1: 'Earth', compare2: 'Jupiter', missionLog: [], journalEntries: [], ...seed,
  } });
  const config = window.StemLab._registry.solarSystem;
  const refs = [];
  let callbacks, refCursor, renderWrites;
  const callbackReact = { ...React, useRef(initialValue) {
    const currentRef = React.useRef(initialValue), index = refCursor++;
    if (!refs[index]) refs[index] = currentRef;
    return refs[index];
  }, createElement(type, props, ...children) {
    if (type === 'style') return null;
    if (typeof type === 'string' && props &&
        (props.ref || ['onClick', 'onChange'].some((key) => typeof props[key] === 'function'))) {
      const id = String(callbacks.size);
      const element = React.createElement(type, { ...props, 'data-comparison-test-callback': id }, ...children);
      callbacks.set(id, { ...element.props, ref: element.ref });
      return element;
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    renderWrites = 0;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map(); refCursor = 0; store.dirty = false;
      const ctx = makeCtx({ t: translate, React: callbackReact }, store), setToolData = ctx.setToolData;
      ctx.setToolData = (updater) => { renderWrites++; setToolData(updater); };
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => comparisonTestTree(config.render(ctx))));
      if (!store.dirty) break;
    }
    const holder = document.createElement('div'); holder.innerHTML = markup;
    const previous = document.getElementById('solar-visual-comparison');
    const next = holder.querySelector('#solar-visual-comparison');
    // React preserves the originating Explore button when only the selected
    // detail changes. Keep that same connected DOM node for return-focus checks.
    if (previous && next && previous.outerHTML === next.outerHTML) next.replaceWith(previous);
    document.body.replaceChildren(...holder.childNodes);
  }
  const outer = () => document.getElementById('solar-visual-comparison');
  function button(scope, text) {
    return [...scope.querySelectorAll('button')].find((node) =>
      node.getAttribute('aria-label') === text || node.textContent.trim() === text ||
      node.querySelector('strong')?.textContent.trim() === text);
  }
  function props(control) {
    expect(control, 'The actual production control must render').toBeTruthy();
    const value = callbacks.get(control.dataset.comparisonTestCallback);
    expect(value).toBeTruthy(); return value;
  }
  function handler(control, key = 'onClick') {
    expect(control.disabled).not.toBe(true);
    const fn = props(control)[key]; expect(fn).toBeTypeOf('function'); return fn;
  }
  function event(control, value) {
    return { target: value === undefined ? control : { value }, currentTarget: control, preventDefault() {} };
  }
  function commit(control, node = control) {
    const ref = props(control).ref;
    expect(ref, 'The production navigation target must have a ref').toBeTruthy();
    if (typeof ref === 'function') ref(node);
    else ref.current = node;
  }
  function click(control) { handler(control)(event(control)); render(); }
  render();
  return {
    get state() { return store.toolData.solarSystem; },
    get renderWrites() { return renderWrites; },
    get outer() { return outer(); },
    get comparison() { return outer().querySelector('[data-solar-planet-comparison]'); },
    get scaleGroup() { return outer().querySelector('[aria-label="Measurement chart scale"]'); },
    get heading() { return document.getElementById('solar-world-detail-title'); },
    get back() { return button(document.body, 'Back to comparison'); },
    explore(world) { return button(outer(), `Explore ${world}`); },
    picker(world) { return document.querySelector(`button[aria-label="Select ${world} from mission control"]`); },
    scale(name) { click(button(outer(), name)); },
    choose(which, value) {
      const control = outer().querySelector(`select[aria-label="${which} world for visual comparison"]`);
      handler(control, 'onChange')(event(control, value)); render();
    },
    button, props, handler, event, commit, click, render,
  };
}

function assertMode(env, mode) {
  expect(env.scaleGroup).not.toBeNull();
  const marked = env.comparison.hasAttribute('data-comparison-scale')
    ? env.comparison : env.comparison.querySelector('[data-comparison-scale]');
  expect(marked?.getAttribute('data-comparison-scale')).toBe(mode);
  for (const [label, value] of [['Fit selected pair', 'pair'], ['Fixed across worlds', 'system']]) {
    expect(env.button(env.scaleGroup, label)?.getAttribute('aria-pressed')).toBe(String(mode === value));
  }
}

function assertMeasurements(env, first, second, mode) {
  const worlds = [WORLDS[first], WORLDS[second]];
  for (const [kind, values] of [
    ['diameter', worlds.map((world) => world.radius * 2)],
    ['gravity', worlds.map((world) => world.gravity)],
  ]) {
    const ceiling = mode === 'system' ? SYSTEM_MAXIMA[kind] : Math.max(...values);
    const chart = env.comparison.querySelector(`[data-compare-bars="${kind}"]`);
    const meters = [...chart.querySelectorAll('[role="meter"]')];
    const earth = kind === 'diameter' ? 12742 : 1;
    const note = chart.querySelector('[data-earth-reference]');
    expect(Number(note.dataset.referenceValue)).toBe(earth);
    expect(note.dataset.referenceVisible).toBe(String(earth <= ceiling));
    expect(document.querySelectorAll(`[id="${note.id}"]`)).toHaveLength(1);
    const markers = [...chart.querySelectorAll('[data-earth-reference-marker]')];
    expect(markers).toHaveLength(earth <= ceiling ? 2 : 0);
    expect(note.textContent).toContain(earth <= ceiling ? 'Dashed markers show this value.' : 'Above this chart’s range.');
    markers.forEach((marker) => {
      expect(parseFloat(marker.style.left)).toBeCloseTo(100 * earth / ceiling, 12);
      expect(marker.getAttribute('aria-hidden')).toBe('true');
      expect(marker.parentElement.querySelector('[role="meter"]')).toBeTruthy();
      expect(marker.closest('[role="meter"]')).toBeNull();
    });
    const ratios = [...chart.querySelectorAll('[data-earth-relative-world]')];
    expect(ratios).toHaveLength(2);
    expect(meters).toHaveLength(2);
    meters.forEach((meter, index) => {
      expect(Number(meter.getAttribute('aria-valuemin'))).toBe(0);
      expect(Number(meter.getAttribute('aria-valuemax'))).toBe(ceiling);
      expect(Number(meter.getAttribute('aria-valuenow'))).toBe(values[index]);
      expect(parseFloat(meter.firstElementChild.style.width)).toBeCloseTo(100 * values[index] / ceiling, 12);
      expect(meter.getAttribute('aria-describedby')).toBe(note.id);
      expect(Number(ratios[index].dataset.earthRelativeRatio)).toBeCloseTo(values[index] / earth, 12);
      expect(ratios[index].dataset.earthRelativeWorld).toBe([first, second][index]);
      expect(meter.getAttribute('aria-valuetext')).toContain(ratios[index].textContent);
      expect(ratios[index].textContent).toContain(`${(values[index] / earth).toFixed(2)}× Earth’s`);
    });
  }
  // Fixed measurement bars must not silently change the pair-fit portrait scale.
  const maximum = Math.max(...worlds.map((world) => world.radius));
  for (const name of [first, second]) {
    const portrait = env.comparison.querySelector(`[data-comparison-world="${name}"]`);
    const raw = 128 * WORLDS[name].radius / maximum;
    expect(Number(portrait.getAttribute('data-diameter-km'))).toBe(WORLDS[name].radius * 2);
    expect(Number(portrait.getAttribute('data-raw-diameter'))).toBeCloseTo(raw, 12);
    expect(Number(portrait.getAttribute('data-drawn-diameter'))).toBeCloseTo(Math.max(3, raw), 12);
  }
}

function focusSpies(node) {
  node.scrollIntoView = vi.fn();
  return { focus: vi.spyOn(node, 'focus'), scroll: node.scrollIntoView };
}

describe('Solar System comparison scale and navigation', () => {
  beforeEach(() => {
    resetStemLab(); loadTool(SOURCE, 'solarSystem');
    vi.stubGlobal('matchMedia', vi.fn((query) => ({ matches: false, media: query,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = '';
  });

  it('defaults to pair-fit zero-baseline bars and retains exact measurements', () => {
    const env = renderComparison({ compare1: 'Mercury', compare2: 'Mars' });
    assertMode(env, 'pair'); assertMeasurements(env, 'Mercury', 'Mars', 'pair');
    expect(env.state.compareScaleMode).toBeUndefined();
    expect(env.renderWrites).toBe(0);
  });

  it('keeps fixed diameter and gravity ceilings across pair changes and swaps', () => {
    const env = renderComparison(); env.scale('Fixed across worlds');
    for (const [first, second] of [['Mercury', 'Mars'], ['Uranus', 'Neptune'], ['Pluto', 'Jupiter']]) {
      env.choose('First', first); env.choose('Second', second);
      assertMode(env, 'system'); assertMeasurements(env, first, second, 'system');
      env.click(env.outer.querySelector('[aria-label="Swap visually compared worlds"]'));
      assertMode(env, 'system'); assertMeasurements(env, second, first, 'system');
    }
    expect(env.state.journalEntries).toEqual([]);
  });

  it.each([
    ['Mercury', 'Mars'], ['Venus', 'Uranus'], ['Earth', 'Earth'],
    ['Uranus', 'Neptune'], ['Pluto', 'Jupiter'],
  ])('positions Earth independently in both charts for %s and %s, without changing evidence', (first, second) => {
    const seed = { compare1: first, compare2: second,
      compareReasoningDrafts: { [`${first}:${second}`]: 'Keep my explanation.' },
      journalEntries: [{ planet: first, observation: 'Keep my evidence.' }] };
    const env = renderComparison(seed);
    assertMeasurements(env, first, second, 'pair');
    expect(env.renderWrites).toBe(0);
    const before = { ...env.state };
    env.scale('Fixed across worlds');
    assertMeasurements(env, first, second, 'system');
    env.scale('Fit selected pair');
    assertMeasurements(env, first, second, 'pair');
    const { compareScaleMode, ...after } = env.state;
    expect(compareScaleMode).toBe('pair');
    expect(after).toEqual(before);
  });

  it.each([undefined, null, false, true, 'SYSTEM', 'fixed', 1, ['system'], { mode: 'system' }, new String('system')].map((raw) => [raw]))(
    'uses pair-fit geometry for malformed restored mode %j without repairing saved state', (raw) => {
      const env = renderComparison({ compareScaleMode: raw, compare1: 'Uranus', compare2: 'Neptune' });
      assertMode(env, 'pair'); assertMeasurements(env, 'Uranus', 'Neptune', 'pair');
      expect(env.state.compareScaleMode).toBe(raw);
      expect(env.renderWrites).toBe(0);
    }
  );

  it('restores the literal system mode and limits native mode changes to their own setting', () => {
    const prior = { planet: 'Mars', observation: 'Keep this earlier evidence.' };
    const seed = { compareScaleMode: 'system', journalEntries: [prior],
      compareReasoningDrafts: { 'Earth:Jupiter': 'Keep my comparison explanation.' },
      compareEvidenceSavedFor: 'Earth:Jupiter', seasonsPrediction: { world: 'Earth', phase: 25, choice: 'north' },
      moonPrediction: { phase: 90.25, node: 30, choice: 'none' },
      marsMission: { prediction: 'miss' }, orr_snapshots: { earth: { a: { time: 0.25 } } } };
    const env = renderComparison(seed), { compareScaleMode, ...before } = env.state;
    assertMode(env, 'system'); assertMeasurements(env, 'Earth', 'Jupiter', 'system');
    env.scale('Fit selected pair'); assertMode(env, 'pair');
    assertMeasurements(env, 'Earth', 'Jupiter', 'pair');
    env.scale('Fixed across worlds'); assertMode(env, 'system');
    const { compareScaleMode: afterMode, ...after } = env.state;
    expect(compareScaleMode).toBe('system'); expect(afterMode).toBe('system');
    expect(after).toEqual(before);
    for (const key of Object.keys(before)) expect(after[key]).toBe(before[key]);
    expect(env.state.journalEntries).toEqual([prior]);
  });

  it.each(['Earth', 'Jupiter'])('focuses Explore %s only when its matching detail heading commits', (world) => {
    const prior = { planet: 'Mars', observation: 'Keep this evidence.' };
    const env = renderComparison({ selectedPlanet: 'Mars', viewTab: 'surface', journalEntries: [prior] });
    const before = { ...env.state }, origin = env.explore(world), oldHeading = env.heading;
    expect(oldHeading.textContent).toBe('Mars');
    const oldSpies = focusSpies(oldHeading);
    env.handler(origin)(env.event(origin));
    expect(env.state.selectedPlanet).toBe(world); expect(env.state.viewTab).toBe('overview');
    expect(env.state).toEqual({ ...before, selectedPlanet: world, viewTab: 'overview' });
    env.commit(oldHeading); env.commit(oldHeading, null);
    expect(oldSpies.focus).not.toHaveBeenCalled(); expect(oldSpies.scroll).not.toHaveBeenCalled();
    env.render();
    expect(env.explore(world)).toBe(origin); expect(origin.isConnected).toBe(true);
    const heading = env.heading, currentSpies = focusSpies(heading);
    expect(heading.textContent).toBe(world); expect(heading.getAttribute('tabindex')).toBe('-1');
    expect(currentSpies.focus).not.toHaveBeenCalled();
    env.commit(heading, null);
    expect(currentSpies.focus).not.toHaveBeenCalled();
    env.commit(heading);
    expect(currentSpies.focus).toHaveBeenCalledTimes(1);
    expect(currentSpies.scroll).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(heading);
    env.commit(heading); expect(currentSpies.focus).toHaveBeenCalledTimes(1);
    expect(env.state.journalEntries).toEqual([prior]);
  });

  it('returns focus to the originating connected Explore button without resetting the comparison', () => {
    const env = renderComparison({ compareScaleMode: 'system',
      compareReasoningDrafts: { 'Earth:Jupiter': 'Keep this authored reasoning.' } });
    const origin = env.explore('Jupiter'), originSpies = focusSpies(origin), before = { ...env.state };
    env.handler(origin)(env.event(origin)); env.render();
    focusSpies(env.heading); env.commit(env.heading);
    expect(env.back).toBeTruthy(); env.handler(env.back)(env.event(env.back));
    expect(originSpies.focus).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(origin);
    expect(env.state).toEqual({ ...before, selectedPlanet: 'Jupiter', viewTab: 'overview' });
    assertMode(env, 'system');
  });

  it('does not focus or scroll an Explore origin that has left the document', () => {
    const env = renderComparison(), origin = env.explore('Jupiter'), originSpies = focusSpies(origin);
    env.handler(origin)(env.event(origin)); env.render();
    const heading = env.heading; focusSpies(heading); env.commit(heading);
    origin.remove(); expect(origin.isConnected).toBe(false);
    env.handler(env.back)(env.event(env.back));
    expect(originSpies.focus).not.toHaveBeenCalled(); expect(originSpies.scroll).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(heading);
    expect(env.state.selectedPlanet).toBe('Jupiter'); expect(env.state.journalEntries).toEqual([]);
  });

  it('keeps a matching heading request pending until its node is connected', () => {
    const env = renderComparison(), origin = env.explore('Jupiter');
    env.handler(origin)(env.event(origin)); env.render();
    const heading = env.heading, spies = focusSpies(heading);
    heading.remove(); env.commit(heading);
    expect(spies.focus).not.toHaveBeenCalled(); expect(spies.scroll).not.toHaveBeenCalled();
    document.body.appendChild(heading); env.commit(heading);
    expect(spies.focus).toHaveBeenCalledTimes(1); expect(spies.scroll).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(heading);
  });

  it('cancels pending Explore focus when a different native world selection supersedes it', () => {
    const env = renderComparison(), origin = env.explore('Jupiter');
    const oldHeading = env.heading, oldCommit = env.props(oldHeading).ref, oldSpies = focusSpies(oldHeading);
    env.handler(origin)(env.event(origin));
    const mars = env.picker('Mars'); env.handler(mars)(env.event(mars));
    expect(env.state.selectedPlanet).toBe('Mars');
    oldCommit(oldHeading);
    expect(oldSpies.focus).not.toHaveBeenCalled(); expect(oldSpies.scroll).not.toHaveBeenCalled();
    env.render();
    const marsHeading = env.heading, marsSpies = focusSpies(marsHeading); env.commit(marsHeading);
    expect(marsHeading.textContent).toBe('Mars');
    expect(marsSpies.focus).not.toHaveBeenCalled(); expect(marsSpies.scroll).not.toHaveBeenCalled();

    const jupiter = env.picker('Jupiter'); env.handler(jupiter)(env.event(jupiter)); env.render();
    const jupiterHeading = env.heading, jupiterSpies = focusSpies(jupiterHeading); env.commit(jupiterHeading);
    expect(jupiterHeading.textContent).toBe('Jupiter');
    expect(jupiterSpies.focus).not.toHaveBeenCalled(); expect(jupiterSpies.scroll).not.toHaveBeenCalled();
    expect(env.state.journalEntries).toEqual([]);
  });
});
