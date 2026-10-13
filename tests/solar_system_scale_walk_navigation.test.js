import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const AU_KM = 149597870.7;
const WORLDS = [
  { key: 'Sun', au: 0, diameter: 1392700 },
  { key: 'Mercury', au: 0.387, diameter: 4880 },
  { key: 'Venus', au: 0.723, diameter: 12104 },
  { key: 'Earth', au: 1, diameter: 12742 },
  { key: 'Mars', au: 1.524, diameter: 6780 },
  { key: 'Jupiter', au: 5.203, diameter: 139822 },
  { key: 'Saturn', au: 9.537, diameter: 116464 },
  { key: 'Uranus', au: 19.19, diameter: 50724 },
  { key: 'Neptune', au: 30.07, diameter: 49244 },
];

function translate(key, fallback) {
  return [...WORLDS.map((world) => world.key), 'Pluto']
    .find((name) => key === `stem.solar_sys.${name.toLowerCase()}`) || fallback || key;
}

// Serialize the actual production planner and invoke its native callbacks.
// Unrelated WebGL, dashboards and other mini-labs do not enter jsdom.
function scaleWalkTestTree(tree) {
  let lab = null;
  function visit(node) {
    if (lab) return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-scale-walk') { lab = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree);
  return lab;
}

function renderScaleWalk(seed = {}) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
    showScaleWalk: true, selectedPlanet: 'Earth', viewTab: 'overview', paused: true,
    missionLog: [], journalEntries: [], ...seed,
  } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, renderWrites;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    if (typeof type === 'string' && props &&
        ['onClick', 'onChange'].some((key) => typeof props[key] === 'function')) {
      const id = String(callbacks.size);
      callbacks.set(id, props);
      return React.createElement(type, { ...props, 'data-scale-test-callback': id }, ...children);
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    renderWrites = 0;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map(); store.dirty = false;
      const ctx = makeCtx({ t: translate, React: callbackReact }, store), setToolData = ctx.setToolData;
      ctx.setToolData = (updater) => { renderWrites++; setToolData(updater); };
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => scaleWalkTestTree(config.render(ctx))));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
    expect(document.getElementById('solar-scale-walk')).not.toBeNull();
  }
  const lab = () => document.getElementById('solar-scale-walk');
  function button(name) {
    return [...lab().querySelectorAll('button')].find((node) => {
      const label = node.getAttribute('aria-label') || node.textContent.trim();
      return name instanceof RegExp ? name.test(label) : label === name;
    });
  }
  function props(control) {
    expect(control, 'The actual production control must render').toBeTruthy();
    const value = callbacks.get(control.dataset.scaleTestCallback);
    expect(value).toBeTruthy(); return value;
  }
  function dispatch(control, key = 'onClick', value) {
    expect(control.disabled).not.toBe(true);
    const fn = props(control)[key]; expect(fn).toBeTypeOf('function');
    fn({ target: value === undefined ? control : { value }, currentTarget: control, preventDefault() {} });
    render();
  }
  render();
  return {
    get state() { return store.toolData.solarSystem; },
    get renderWrites() { return renderWrites; },
    get lab() { return lab(); },
    get map() { return lab().querySelector('[data-scale-map-view]'); },
    get select() { return lab().querySelector('#solar-walk-stop'); },
    get stop() { return lab().querySelector('[data-scale-walk-stop]'); },
    get saveButton() { return button(/Save scale plan to journal|Scale plan saved/); },
    row(world) { return lab().querySelector(`[data-scale-walk-world="${world}"]`); },
    marker(world) { return lab().querySelector(`[data-scale-map-marker="${world}"]`); },
    reading(which) { return Number(lab().querySelector(`[data-scale-stop-reading="${which}"]`).getAttribute('data-value')); },
    choose(world) { dispatch(lab().querySelector('#solar-walk-stop'), 'onChange', world); },
    click(control) { dispatch(control); },
    change(control, value) { dispatch(control, 'onChange', value); },
    button, props, render,
  };
}

function measurements(env) {
  return WORLDS.map(({ key }) => {
    const row = env.row(key);
    expect(row).not.toBeNull();
    return { key, distance: Number(row.getAttribute('data-distance-meters')), diameter: Number(row.getAttribute('data-diameter-mm')) };
  });
}

function expectMap(env, mode) {
  expect(env.map.getAttribute('data-scale-map-view')).toBe(mode);
  expect(env.button('Whole walk').getAttribute('aria-pressed')).toBe(String(mode === 'full'));
  expect(env.button('Inner planets').getAttribute('aria-pressed')).toBe(String(mode === 'inner'));
}

function expectStop(env, index) {
  const world = WORLDS[index];
  expect(env.select.value).toBe(world.key);
  expect(env.stop.getAttribute('data-scale-walk-stop')).toBe(world.key);
  expect(env.stop.textContent).toContain(`Stop ${index + 1} of 9`);
  expect([...env.lab.querySelectorAll('[data-scale-gap-to][aria-pressed="true"]')]
    .map(node => node.dataset.scaleGapTo)).toEqual(index ? [world.key] : []);
  expect(env.lab.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
  expect(env.row(world.key).getAttribute('aria-current')).toBe('step');
  const selected = env.map.querySelectorAll('[data-scale-map-selected="true"]');
  expect(selected).toHaveLength(env.marker(world.key) ? 1 : 0);
  if (selected.length) expect(selected[0].querySelector('[data-scale-map-marker]').getAttribute('data-scale-map-marker')).toBe(world.key);
}

describe('Solar System scale walk stop guide and map views', () => {
  beforeEach(() => {
    resetStemLab(); loadTool(SOURCE, 'solarSystem');
    vi.stubGlobal('matchMedia', vi.fn((query) => ({ matches: false, media: query,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('setTimeout', vi.fn(() => 1));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = '';
  });

  it('starts at the Sun with a common physical scale and full linear map', () => {
    const env = renderScaleWalk();
    expectMap(env, 'full'); expectStop(env, 0);
    expect(env.lab.querySelectorAll('[data-scale-walk-world]')).toHaveLength(9);
    expect(env.map.querySelectorAll('[data-scale-map-marker]')).toHaveLength(9);
    const origin = Number(env.marker('Sun').getAttribute('cx'));
    const oneAU = Number(env.marker('Earth').getAttribute('cx')) - origin;
    measurements(env).forEach((reading, index) => {
      const world = WORLDS[index];
      expect(reading.distance).toBeCloseTo(world.au * 100 / 30.07, 10);
      expect(reading.diameter).toBeCloseTo(world.diameter * 100 / (30.07 * AU_KM) * 1000, 10);
      expect((Number(env.marker(world.key).getAttribute('cx')) - origin) / oneAU).toBeCloseTo(world.au, 10);
    });
    expect(env.map.getAttribute('aria-label')).toContain('markers are enlarged, not scaled diameters');
    expect(env.reading('gap')).toBe(0); expect(env.reading('total')).toBe(0);
    expect(env.renderWrites).toBe(0);
  });

  it('magnifies exactly Sun through Mars while preserving all nine physical measurements', () => {
    const env = renderScaleWalk(), before = measurements(env);
    env.click(env.button('Inner planets')); expectMap(env, 'inner');
    expect([...env.map.querySelectorAll('[data-scale-map-marker]')].map((node) => node.getAttribute('data-scale-map-marker')))
      .toEqual(WORLDS.slice(0, 5).map((world) => world.key));
    expect(measurements(env)).toEqual(before);
    const origin = Number(env.marker('Sun').getAttribute('cx'));
    const oneAU = Number(env.marker('Earth').getAttribute('cx')) - origin;
    expect(Number(env.marker('Mars').getAttribute('cx'))).toBeCloseTo(488, 10);
    WORLDS.slice(0, 5).forEach((world) => {
      expect((Number(env.marker(world.key).getAttribute('cx')) - origin) / oneAU).toBeCloseTo(world.au, 10);
    });
    const lastTick = env.map.querySelector('[data-scale-map-tick="1"]').textContent;
    expect(parseFloat(lastTick)).toBeCloseTo(100 * 1.524 / 30.07, 2);
    expect(env.map.getAttribute('aria-label')).toContain('Sun-to-Mars');
    expect(env.lab.querySelector('[data-scale-map-description]').textContent).toContain('physical distances and diameters stay the same');
  });

  it('changes only the map setting when zooming and keeps saved evidence and other activities intact', () => {
    const explanation = 'Both sizes and distances share one conversion.';
    const seed = { scaleWalkLength: 100, scaleWalkStop: 'Earth', scaleWalkMap: 'full',
      scaleWalkClaim: 'double', scaleWalkExplanation: explanation,
      scaleWalkSaved: JSON.stringify([100, 'double', explanation]),
      journalEntries: [{ planet: 'Mars', observation: 'Keep earlier evidence.' }],
      seasonsPrediction: { world: 'Earth', phase: 25, choice: 'north' },
      gravityPrediction: { planet: 'Mars', choice: 'Earth' },
      compareReasoningDrafts: { 'Earth:Jupiter': 'Keep this comparison.' } };
    const env = renderScaleWalk(seed), before = { ...env.state }, readings = measurements(env);
    for (const [label, mode] of [['Inner planets', 'inner'], ['Whole walk', 'full']]) {
      env.click(env.button(label)); expectMap(env, mode);
      expect(env.state).toEqual({ ...before, scaleWalkMap: mode });
      for (const key of Object.keys(before).filter((key) => key !== 'scaleWalkMap')) expect(env.state[key]).toBe(before[key]);
      expect(measurements(env)).toEqual(readings);
      expect(env.saveButton.disabled).toBe(true);
    }
  });

  it('reports exact adjacent gaps, total distances and diameters for every selected stop', () => {
    const env = renderScaleWalk({ scaleWalkLength: 730 });
    const rows = measurements(env);
    WORLDS.forEach((world, index) => {
      env.choose(world.key); expectStop(env, index);
      expect(env.reading('total')).toBe(rows[index].distance);
      expect(env.reading('diameter')).toBe(rows[index].diameter);
      expect(env.reading('gap')).toBe(index ? rows[index].distance - rows[index - 1].distance : 0);
      expect(env.stop.textContent).toContain(index ? `Gap from ${WORLDS[index - 1].key}` : 'Starting position');
    });
    expect(env.state.journalEntries).toEqual([]);
  });

  it('visits all nine stops in both directions and guards the two endpoints', () => {
    const env = renderScaleWalk();
    expect(env.select.options).toHaveLength(9);
    for (let index = 0; index < WORLDS.length; index++) {
      expectStop(env, index);
      expect(env.button('Previous stop').disabled).toBe(index === 0);
      expect(env.button('Next stop').disabled).toBe(index === WORLDS.length - 1);
      if (index < WORLDS.length - 1) env.click(env.button('Next stop'));
    }
    for (let index = WORLDS.length - 2; index >= 0; index--) {
      env.click(env.button('Previous stop')); expectStop(env, index);
    }
    // Even a replayed disabled control callback must remain inside the route.
    const before = { ...env.state }, previous = env.button('Previous stop');
    env.props(previous).onClick({ currentTarget: previous, target: previous }); env.render();
    expect(env.state).toEqual(before); expectStop(env, 0);
    env.choose('Neptune');
    const end = { ...env.state }, next = env.button('Next stop');
    env.props(next).onClick({ currentTarget: next, target: next }); env.render();
    expect(env.state).toEqual(end); expectStop(env, 8);
  });

  it('keeps inner stop selections magnified and returns to the whole map for an outer stop', () => {
    const env = renderScaleWalk({ scaleWalkMap: 'inner', scaleWalkStop: 'Mercury' });
    env.choose('Mars'); expectMap(env, 'inner'); expectStop(env, 4);
    const before = { ...env.state };
    env.click(env.button('Next stop')); expectMap(env, 'full'); expectStop(env, 5);
    expect(env.state).toEqual({ ...before, scaleWalkStop: 'Jupiter', scaleWalkMap: 'full' });
    env.click(env.button('Inner planets'));
    env.choose('Neptune'); expectMap(env, 'full'); expectStop(env, 8);
  });

  it('explains a selected outer stop outside the inner view and offers a map-only return', () => {
    const env = renderScaleWalk({ scaleWalkMap: 'full', scaleWalkStop: 'Saturn' });
    env.click(env.button('Inner planets')); expectMap(env, 'inner'); expectStop(env, 6);
    expect(env.marker('Saturn')).toBeNull();
    const before = { ...env.state }, reading = env.reading('total');
    expect(env.button('Show Saturn on whole map')).toBeTruthy();
    env.click(env.button('Show Saturn on whole map')); expectMap(env, 'full'); expectStop(env, 6);
    expect(env.state).toEqual({ ...before, scaleWalkMap: 'full' });
    expect(env.reading('total')).toBe(reading);
    expect(env.button('Show Saturn on whole map')).toBeUndefined();
  });

  it('falls back from malformed restored stop and map values without rewriting saved state', () => {
    const invalid = [
      [undefined, undefined], [null, null], [false, true], [1, 1], ['earth', 'INNER'],
      ['Pluto', 'zoom'], ['constructor', 'constructor'], ['__proto__', '__proto__'],
      [['Earth'], ['inner']], [{ key: 'Earth' }, { mode: 'inner' }],
      [new String('Earth'), new String('inner')],
    ];
    invalid.forEach(([stop, map]) => {
      const env = renderScaleWalk({ scaleWalkStop: stop, scaleWalkMap: map });
      expectMap(env, 'full'); expectStop(env, 0);
      expect(env.state.scaleWalkStop).toBe(stop); expect(env.state.scaleWalkMap).toBe(map);
      expect(env.renderWrites).toBe(0);
    });
  });

  it('doubles distances, diameters and the selected gap together without moving the stop or zoom', () => {
    const env = renderScaleWalk({ scaleWalkLength: 100, scaleWalkStop: 'Earth', scaleWalkMap: 'inner' });
    const before = measurements(env), gap = env.reading('gap'), total = env.reading('total');
    const markerX = Number(env.marker('Earth').getAttribute('cx'));
    env.click(env.button('Try doubling this walk'));
    expect(env.state.scaleWalkLength).toBe(200); expectMap(env, 'inner'); expectStop(env, 3);
    measurements(env).forEach((reading, index) => {
      expect(reading.distance).toBeCloseTo(before[index].distance * 2, 10);
      expect(reading.diameter).toBeCloseTo(before[index].diameter * 2, 10);
    });
    expect(env.reading('gap')).toBeCloseTo(gap * 2, 10);
    expect(env.reading('total')).toBeCloseTo(total * 2, 10);
    expect(Number(env.marker('Earth').getAttribute('cx'))).toBe(markerX);
    expect(parseFloat(env.map.querySelector('[data-scale-map-tick="1"]').textContent)).toBeCloseTo(200 * 1.524 / 30.07, 1);
  });

  it.each([10, 100, 1000])('compares all eight adjacent gaps on one true linear scale for a %s meter walk', length => {
    const env = renderScaleWalk({ scaleWalkLength: length });
    const figure = env.lab.querySelector('[data-scale-walk-gaps]');
    expect(figure.tagName).toBe('FIGURE');
    expect(document.getElementById(figure.getAttribute('aria-labelledby')).textContent).toBe('Compare the gaps');
    const rows = [...figure.querySelectorAll('[data-scale-gap-to]')];
    expect(rows.map(row => row.dataset.scaleGapTo)).toEqual(WORLDS.slice(1).map(world => world.key));
    const gaps = WORLDS.slice(1).map((world, index) => (world.au - WORLDS[index].au) * length / 30.07);
    const longest = Math.max(...gaps);
    let total = 0;
    rows.forEach((row, index) => {
      const gap = Number(row.dataset.gapMeters); total += gap;
      expect(row.type).toBe('button');
      expect(gap).toBeCloseTo(gaps[index], 10); expect(gap).toBeGreaterThan(0);
      expect(row.getAttribute('aria-label')).toContain(`Gap from ${WORLDS[index].key} to ${WORLDS[index + 1].key}: ${gaps[index].toFixed(2)} meters`);
      const bar = row.querySelector('[data-scale-gap-bar]');
      expect(parseFloat(bar.style.width)).toBeCloseTo(gap / longest * 100, 10);
      expect(bar.style.minWidth).toBe('');
      expect(bar.parentElement.getAttribute('aria-hidden')).toBe('true');
    });
    expect(total).toBeCloseTo(length, 10);
    expect(figure.textContent).toContain(`0 to ${longest.toFixed(2)} m, the longest gap`);
    expect(figure.textContent).toContain('not current distances between planets');
    expect(figure.querySelector('[data-scale-gap-summary]').textContent).toContain('starting point has no incoming gap');
    expect(env.renderWrites).toBe(0);
  });

  it('links every gap row to its destination and reports its fraction of the whole walk', () => {
    const explanation = 'Keep this authored scale explanation.';
    const saved = JSON.stringify([100, 'double', explanation]);
    const journal = [{ planet: 'Solar System', observation: 'Prior placement plan' }];
    const env = renderScaleWalk({ scaleWalkLength: 100, scaleWalkMap: 'inner', scaleWalkClaim: 'double',
      scaleWalkExplanation: explanation, scaleWalkSaved: saved, journalEntries: journal });
    WORLDS.slice(1).forEach((world, index) => {
      env.click(env.lab.querySelector(`[data-scale-gap-to="${world.key}"]`));
      expectStop(env, index + 1);
      const summary = env.lab.querySelector('[data-scale-gap-summary]');
      const percent = (world.au - WORLDS[index].au) / 30.07 * 100;
      expect(Number(summary.dataset.wholeWalkPercent)).toBeCloseTo(percent, 10);
      expect(summary.textContent).toContain(`${percent.toFixed(2)}% of the entire 100 m Sun-to-Neptune walk`);
      expectMap(env, index < 4 ? 'inner' : 'full');
      expect(env.state.scaleWalkExplanation).toBe(explanation);
      expect(env.state.scaleWalkSaved).toBe(saved);
      expect(env.state.journalEntries).toBe(journal);
      expect(env.saveButton.disabled).toBe(true);
    });
    expect(Number(env.lab.querySelector('[data-scale-gap-summary]').dataset.wholeWalkPercent)).toBeLessThan(37);
    expect(parseFloat(env.lab.querySelector('[data-scale-gap-bar="Neptune"]').style.width)).toBeCloseTo(100, 10);
  });

  it('uses the latest map choice for a captured gap selection and ignores events from a closed planner', () => {
    const env = renderScaleWalk({ scaleWalkMap: 'full', scaleWalkStop: 'Earth' });
    const outerRow = env.lab.querySelector('[data-scale-gap-to="Neptune"]');
    const chooseOuter = env.props(outerRow).onClick;
    env.click(env.button('Inner planets'));
    chooseOuter({ currentTarget: outerRow, target: outerRow }); env.render();
    expectMap(env, 'full'); expectStop(env, 8);
    const earthRow = env.lab.querySelector('[data-scale-gap-to="Earth"]');
    const chooseEarth = env.props(earthRow).onClick;
    const close = env.button('Close scale walk');
    env.props(close).onClick({ currentTarget: close, target: close });
    const closedState = env.state;
    chooseEarth({ currentTarget: earthRow, target: earthRow });
    expect(env.state).toBe(closedState);
    expect(env.state.showScaleWalk).toBe(false);
    expect(env.state.scaleWalkStop).toBe('Neptune');
  });

  it('doubles gap values while preserving bar proportions and whole-walk percentages', () => {
    const env = renderScaleWalk({ scaleWalkLength: 100, scaleWalkStop: 'Earth', scaleWalkMap: 'inner' });
    const bars = () => [...env.lab.querySelectorAll('[data-scale-gap-bar]')].map(bar => parseFloat(bar.style.width));
    const before = bars(), oldGap = env.reading('gap');
    const oldPercent = Number(env.lab.querySelector('[data-scale-gap-summary]').dataset.wholeWalkPercent);
    env.click(env.button('Try doubling this walk'));
    bars().forEach((width, index) => expect(width).toBeCloseTo(before[index], 10));
    expect(env.reading('gap')).toBeCloseTo(oldGap * 2, 10);
    expect(Number(env.lab.querySelector('[data-scale-gap-summary]').dataset.wholeWalkPercent)).toBeCloseTo(oldPercent, 10);
    expect(env.lab.querySelector('[data-scale-gap-summary]').textContent).toContain('entire 200 m Sun-to-Neptune walk');
    expectStop(env, 3); expectMap(env, 'inner');
  });

  it('keeps a saved placement plan immutable during inspection and enables a new save after scaling', () => {
    const env = renderScaleWalk({ scaleWalkLength: 100, scaleWalkStop: 'Earth' });
    env.click(env.button('They double too'));
    env.change(env.lab.querySelector('#solar-scale-walk-explanation'), '  Every physical length uses one scale.  ');
    env.click(env.saveButton);
    expect(env.state.journalEntries).toHaveLength(1); expect(env.saveButton.disabled).toBe(true);
    const entry = env.state.journalEntries[0], snapshot = JSON.parse(JSON.stringify(entry));
    expect(entry.observation).toContain('Sun to Neptune = 100 m');
    expect(entry.observation).toContain('Neptune: 100.00 m');
    expect(entry.investigation).toEqual({ id: 'compare', explanation: 'Every physical length uses one scale.' });
    const savedSignature = env.state.scaleWalkSaved;
    env.click(env.button('Inner planets')); env.choose('Mars');
    env.choose('Neptune');
    expect(env.state.scaleWalkSaved).toBe(savedSignature); expect(env.saveButton.disabled).toBe(true);
    expect(env.state.journalEntries[0]).toBe(entry); expect(entry).toEqual(snapshot);
    env.click(env.button('Try doubling this walk'));
    expect(env.saveButton.disabled).toBe(false); expect(env.state.scaleWalkSaved).toBe(savedSignature);
    expect(env.state.journalEntries).toEqual([snapshot]);
    env.click(env.saveButton);
    expect(env.state.journalEntries).toHaveLength(2); expect(env.state.journalEntries[0]).toBe(entry);
    expect(env.state.journalEntries[0]).toEqual(snapshot);
    expect(env.state.journalEntries[1].observation).toContain('Sun to Neptune = 200 m');
    expect(env.saveButton.disabled).toBe(true);
  });
});
