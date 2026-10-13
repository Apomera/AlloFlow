import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const WORLD_KEYS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const TILTS = { Earth: 23.44, Mars: 25.19, Uranus: 97.77 };
const MALFORMED_NUMBERS = [null, undefined, false, true, '', '  ', 'invalid', [], ['25'], {}, Infinity, -Infinity, NaN];

// Evaluate the disclosed ideal-horizon model independently. Solar-noon angle
// stays signed: a negative elevation is below the horizon, rather than 0°.
function metrics(world, phase, latitude) {
  const angle = phase / 100 * Math.PI * 2;
  const declination = Math.asin(Math.sin(TILTS[world] * Math.PI / 180) * Math.sin(angle));
  const radians = latitude * Math.PI / 180;
  const horizonTerm = -Math.tan(radians) * Math.tan(declination);
  const hourAngle = horizonTerm <= -1 ? Math.PI : horizonTerm >= 1 ? 0 : Math.acos(horizonTerm);
  return {
    hours: 24 * hourAngle / Math.PI,
    noon: 90 - Math.abs(latitude - declination * 180 / Math.PI),
  };
}

function earthRecord(phase) {
  const north = metrics('Earth', phase, 45), south = metrics('Earth', phase, -45);
  return { world: 'Earth', phase, northHours: north.hours, southHours: south.hours,
    northNoon: north.noon, southNoon: south.noon };
}

function translate(key, fallback) {
  return WORLD_KEYS.find((name) => key === `stem.solar_sys.${name.toLowerCase()}`) || fallback || key;
}

// Keep production elements and callbacks, but serialize only the investigation
// exercised here. Parsing the unrelated explorer's styles and dashboard in
// jsdom is costly and adds no evidence to these handler and geometry checks.
function seasonsTestTree(tree) {
  const retained = [];
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    const props = node.props;
    if (props.id === 'solar-seasons-lab' ||
        props['data-solarsystem-investigation-hub'] !== undefined ||
        props['data-solarsystem-evidence-constellation'] !== undefined) {
      retained.push(node); return;
    }
    React.Children.forEach(props.children, visit);
  }
  visit(tree);
  return React.createElement(React.Fragment, null, retained);
}

// Capture actual production callbacks. Invoking several captured callbacks
// before render() exercises the same-frame state races that static tests miss.
// Ref objects persist across SSR passes as they do in one mounted component;
// effects, focus, keyboard navigation and layout belong to browser tests.
function renderSeasons(seed = {}, overrides = {}, siblings = {}) {
  const store = newStore({ ...siblings, solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
    showSeasonsLab: true, selectedPlanet: 'Earth', viewTab: 'overview', paused: true,
    seasonsWorld: 'Earth', seasonsPhase: 25, seasonsLatitude: 45,
    missionLog: [], journalEntries: [], ...seed,
  } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, renderingCallbacks, renderWrites = 0, refCursor = 0;
  const refs = [];
  const callbackReact = { ...React, useRef(initialValue) {
    const currentRef = React.useRef(initialValue);
    const index = refCursor++;
    if (!refs[index]) refs[index] = currentRef;
    return refs[index];
  }, createElement(type, props, ...children) {
    if (type === 'style') return null;
    if (typeof type === 'string' && props &&
        ['onClick', 'onChange', 'onKeyDown'].some((name) => typeof props[name] === 'function')) {
      const id = String(renderingCallbacks.size);
      const element = React.createElement(type, { ...props, 'data-season-callback': id }, ...children);
      renderingCallbacks.set(id, { ...element.props, ref: element.ref });
      return element;
    }
    return React.createElement(type, props, ...children);
  } };
  function render({ commit = true } = {}) {
    let markup;
    renderWrites = 0;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      renderingCallbacks = new Map();
      refCursor = 0;
      store.dirty = false;
      const ctx = makeCtx({ t: translate, ...overrides, React: callbackReact }, store);
      const setToolData = ctx.setToolData;
      ctx.setToolData = function(updater) { renderWrites++; setToolData(updater); };
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => seasonsTestTree(config.render(ctx))));
      if (!store.dirty) break;
    }
    if (commit) {
      callbacks = renderingCallbacks;
      document.body.innerHTML = markup;
    }
  }
  const lab = () => document.getElementById('solar-seasons-lab');
  const guide = () => lab()?.querySelector('[data-season-guide]');
  function button(scope, name) {
    return [...scope.querySelectorAll('button')].find((control) =>
      typeof name === 'string' ? control.textContent.trim() === name : name.test(control.textContent.trim()));
  }
  function handler(control, name = 'onClick') {
    expect(control, 'The production seasons control must render').toBeTruthy();
    expect(control.disabled, 'Only an enabled seasons control can be activated').toBe(false);
    const fn = callbacks.get(control.dataset.seasonCallback)?.[name];
    expect(fn).toBeTypeOf('function');
    return fn;
  }
  function event(control, value) {
    return { target: value === undefined ? control : { value }, currentTarget: control, preventDefault() {} };
  }
  // SSR cannot attach refs. Explicitly commit the real save-element ref when a
  // test distinguishes the visible DOM from a rendered but discarded tree.
  function commit(control) {
    const ref = callbacks.get(control.dataset.seasonCallback)?.ref;
    expect(ref, 'The production save control must register its committed render').toBeTypeOf('function');
    ref(control);
  }
  function click(control) { handler(control)(event(control)); render(); }
  function change(control, value) { handler(control, 'onChange')(event(control, value)); render(); }
  render();
  return {
    get state() { return store.toolData.solarSystem; },
    get rootState() { return store.toolData; },
    get renderWrites() { return renderWrites; },
    get lab() { return lab(); },
    get guide() { return guide(); },
    get phase() { return document.getElementById('solar-season-phase'); },
    get latitude() { return document.getElementById('solar-season-latitude'); },
    get interpretation() { return lab()?.querySelector('[data-solar-season-evidence-check]'); },
    get mainSave() { return button(lab(), /(?:Save interpretation \+ evidence to journal|Evidence saved to journal)/); },
    get latitudeSave() { return button(lab(), /(?:Save latitude investigation to journal|Latitude evidence saved)/); },
    get guideSave() { return button(guide(), /(?:Save guided explanation to journal|Guided explanation saved)/); },
    get hub() { return document.querySelector('[data-investigation-id="seasons"]'); },
    handler, event, click, change, render, commit, button,
    setPhase(value) { change(document.getElementById('solar-season-phase'), value); },
    setLatitude(value) { change(document.getElementById('solar-season-latitude'), value); },
    world(value) {
      click(button(lab().querySelector('[aria-label="World for seasons model"]'), new RegExp(`^${value}`)));
    },
    interpret(value) {
      click(button(lab().querySelector('[aria-label="Season sunlight evidence check"]'),
        { north: '45° N', equal: 'About equal', south: '45° S' }[value]));
    },
    guideClick(name) { click(button(guide(), name)); },
    explain(value) { change(document.getElementById('solar-guide-explanation'), value); },
    latitudeExplain(value) { change(document.getElementById('solar-latitude-explanation'), value); },
  };
}

function assertLatitude(env, phase, latitude) {
  expect(env.latitude.value).toBe(String(latitude));
  const hours = [...env.lab.querySelectorAll('[data-latitude-reading]')]
    .map((reading) => Number(reading.dataset.daylightHours));
  expect(hours).toHaveLength(2); expect(hours[0] + hours[1]).toBeCloseTo(24, 10);
  for (const [hemisphere, signed] of [['north', latitude], ['south', -latitude]]) {
    const expected = metrics('Earth', phase, signed);
    const reading = env.lab.querySelector(`[data-latitude-reading="${hemisphere}"]`);
    expect(Number(reading.dataset.daylightHours)).toBeCloseTo(expected.hours, 10);
    const noon = reading.querySelector('[data-latitude-noon-value]');
    expect(Number(noon.dataset.value)).toBeCloseTo(expected.noon, 10);
    const meter = reading.querySelector('[data-latitude-daylight-meter]');
    expect(meter.getAttribute('role')).toBe('meter');
    expect(Number(meter.getAttribute('aria-valuemin'))).toBe(0);
    expect(Number(meter.getAttribute('aria-valuemax'))).toBe(24);
    expect(Number(meter.getAttribute('aria-valuenow'))).toBeCloseTo(expected.hours, 10);
    expect(parseFloat(meter.firstElementChild.style.width)).toBeCloseTo(expected.hours / 24 * 100, 10);
    const observer = reading.querySelector('[data-latitude-noon-observer]');
    expect(observer.tagName).toBe('DIV');
    expect(observer.getAttribute('role')).toBe('img');
    expect(observer.getAttribute('aria-label')).toMatch(/sun|noon/i);
    expect(observer.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
  }
}

function completeGuide(env, prediction = 'opposite') {
  env.click(env.guide.querySelector(`[data-guide-prediction="${prediction}"]`));
  env.guideClick('Capture current Earth observation');
  env.guideClick('Inspect December position');
  env.guideClick('Capture current Earth observation');
  env.guideClick('Compare my evidence');
  env.click(env.guide.querySelector('[data-guide-claim="tilt"]'));
  env.guideClick('Build my explanation');
}

function readyGuide(explanation = 'My own reasoning stays here.') {
  return { prediction: 'opposite', records: { 25: earthRecord(25), 75: earthRecord(75) },
    claim: 'tilt', step: 3, explanation };
}

describe('Solar System seasons observer workbench', () => {
  beforeEach(() => {
    resetStemLab(); loadTool(SOURCE, 'solarSystem');
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn((query) => ({ matches: false, media: query,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => {
    vi.clearAllTimers(); vi.useRealTimers();
    vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = '';
  });

  it('names the investigation and exposes Earth observer measurements on a shared daylight scale', () => {
    const env = renderSeasons();
    expect(env.lab.tagName).toBe('SECTION');
    expect(env.lab.getAttribute('aria-labelledby')).toBe('solar-seasons-lab-title');
    expect(document.getElementById('solar-seasons-lab-title')).toBeTruthy();
    expect(env.phase.getAttribute('aria-valuetext')).toContain('solstice');
    assertLatitude(env, 25, 45);
    for (const [hemisphere, latitude] of [['north', 45], ['south', -45]]) {
      const card = env.lab.querySelector(`[data-season-hemisphere="${hemisphere}"]`);
      const expected = metrics('Earth', 25, latitude);
      const daylight = card.querySelector('[data-season-daylight-value]');
      const noon = card.querySelector('[data-season-noon-value]');
      expect(daylight.tagName).toBe('DD'); expect(noon.tagName).toBe('DD');
      expect(Number(daylight.dataset.value)).toBeCloseTo(expected.hours, 10);
      expect(Number(noon.dataset.value)).toBeCloseTo(expected.noon, 10);
      expect(card.querySelector('[data-season-relative-meter]').getAttribute('role')).toBe('meter');
    }
    expect(env.lab.textContent).toContain('not a temperature or climate forecast');
  });

  it('uses only own whitelisted world names and leaves malformed restored keys untouched', () => {
    for (const raw of ['Earth', 'Mars', 'Uranus', 'constructor', '__proto__', 'toString', '',
      null, undefined, false, 0, ['Mars'], {}, new String('Mars')]) {
      const valid = typeof raw === 'string' && ['Earth', 'Mars', 'Uranus'].includes(raw);
      const env = renderSeasons({ seasonsWorld: raw });
      expect(env.lab.dataset.seasonWorld).toBe(valid ? raw : 'Earth');
      expect(env.state.seasonsWorld).toBe(raw); expect(env.renderWrites).toBe(0);
      expect(env.lab.textContent).not.toMatch(/NaN|undefined|\[object Object\]/);
    }
  });

  it('preserves finite fractional phase inputs and clamps numeric values without render writes', () => {
    for (const [raw, phase] of [[25.25, 25.25], [' 75.125 ', 75.125], [999, 100], [-2, 0], ['100', 100]]) {
      const env = renderSeasons({ seasonsPhase: raw });
      expect(env.phase.value).toBe(String(phase));
      expect(Number(env.lab.dataset.seasonPhaseExact)).toBe(phase);
      expect(env.state.seasonsPhase).toBe(raw); expect(env.renderWrites).toBe(0);
      assertLatitude(env, phase, 45);
    }
  });

  it('uses phase 25 for malformed restored types without silently repairing persisted state', () => {
    for (const raw of MALFORMED_NUMBERS) {
      const env = renderSeasons({ seasonsPhase: raw });
      expect(env.phase.value).toBe('25'); assertLatitude(env, 25, 45);
      expect(env.state.seasonsPhase).toBe(raw); expect(env.renderWrites).toBe(0);
      expect(env.lab.textContent).not.toMatch(/NaN|undefined|\[object Object\]/);
    }
  });

  it('names exact checkpoints distinctly from neighboring orbital positions', () => {
    const names = new Map();
    for (const phase of [0, 25, 50, 75, 100]) {
      const env = renderSeasons({ seasonsPhase: phase });
      const label = env.phase.getAttribute('aria-valuetext');
      expect(label).toMatch(/equinox|solstice/i); expect(label).not.toMatch(/^Near /);
      names.set(phase, label);
    }
    expect(names.get(100)).toBe(names.get(0));
    for (const phase of [0.25, 24.75, 25.25, 49.75, 50.25, 74.75, 75.25, 99.75]) {
      const env = renderSeasons({ seasonsPhase: phase });
      expect(env.phase.getAttribute('aria-valuetext')).toMatch(/^Near /);
    }
  });

  it('reports signed solar-noon elevation when Earth polar winter puts the Sun below the horizon', () => {
    const env = renderSeasons({ seasonsPhase: 75, seasonsLatitude: 80 });
    assertLatitude(env, 75, 80);
    const north = env.lab.querySelector('[data-latitude-reading="north"]');
    expect(Number(north.querySelector('[data-latitude-noon-value]').dataset.value)).toBeCloseTo(-13.44, 10);
    expect(north.textContent).toMatch(/below.*horizon/i);
    expect(Number(north.dataset.daylightHours)).toBe(0);
    for (const phase of [25, 75]) {
      const uranus = renderSeasons({ seasonsWorld: 'Uranus', seasonsPhase: phase });
      for (const [hemisphere, latitude] of [['north', 45], ['south', -45]]) {
        const card = uranus.lab.querySelector(`[data-season-hemisphere="${hemisphere}"]`);
        expect(Number(card.querySelector('[data-season-noon-value]').dataset.value))
          .toBeCloseTo(metrics('Uranus', phase, latitude).noon, 10);
        expect(card.textContent).toContain('Daylight uses a normalized 24-hour rotation scale, not Earth-hour durations.');
      }
    }
  });

  it('preserves fractional latitude restoration and clamps only outside the disclosed range', () => {
    for (const [raw, latitude] of [[45.25, 45.25], [' 70.125 ', 70.125], [999, 80], [-2, 0]]) {
      const env = renderSeasons({ seasonsLatitude: raw });
      assertLatitude(env, 25, latitude);
      expect(env.state.seasonsLatitude).toBe(raw); expect(env.renderWrites).toBe(0);
    }
  });

  it('uses latitude 45 for malformed restored values without rewriting the draft or raw state', () => {
    for (const raw of MALFORMED_NUMBERS) {
      const env = renderSeasons({ seasonsLatitude: raw, seasonsLatitudeExplanation: 'Keep my explanation.' });
      assertLatitude(env, 25, 45);
      expect(env.state.seasonsLatitude).toBe(raw); expect(env.renderWrites).toBe(0);
      expect(env.state.seasonsLatitudeExplanation).toBe('Keep my explanation.');
    }
  });

  it('shows equal twelve-hour equatorial traces and opposite polar daylight without changing meter scales', () => {
    const env = renderSeasons({ seasonsLatitude: 0 });
    for (const phase of [0, 25, 50, 75, 100]) {
      env.setPhase(String(phase)); assertLatitude(env, phase, 0);
      for (const reading of env.lab.querySelectorAll('[data-latitude-reading]')) {
        expect(Number(reading.dataset.daylightHours)).toBeCloseTo(12, 10);
      }
    }
    env.setLatitude('70'); env.setPhase('25'); assertLatitude(env, 25, 70);
    env.setPhase('75'); assertLatitude(env, 75, 70);
    expect(Number(env.lab.querySelector('[data-latitude-reading="north"]').dataset.daylightHours)).toBe(0);
    expect(Number(env.lab.querySelector('[data-latitude-reading="south"]').dataset.daylightHours)).toBe(24);
  });

  it('accepts each own typed interpretation choice only for exact current world and fractional phase', () => {
    for (const choice of ['north', 'equal', 'south']) {
      const record = { world: 'Earth', phase: 25.25, choice };
      const env = renderSeasons({ seasonsPhase: 25.25, seasonsPrediction: record });
      expect(env.interpretation.dataset.inquiryStage).toBe('evidence');
      expect(env.mainSave.disabled).toBe(false);
      const pressed = [...env.interpretation.querySelectorAll('[aria-pressed="true"]')];
      expect(pressed).toHaveLength(1);
      expect(pressed[0].textContent).toBe({ north: '45° N', equal: 'About equal', south: '45° S' }[choice]);
      expect(env.state.seasonsPrediction).toBe(record); expect(env.renderWrites).toBe(0);
    }
  });

  it('rejects inherited, untyped, unknown and mismatched interpretation records without render writes', () => {
    const good = { world: 'Earth', phase: 25.25, choice: 'north' };
    for (const record of [null, [], 'north', 7, Object.create(good),
      { world: 'Earth', phase: 25.25 }, { phase: 25.25, choice: 'north' },
      Object.assign(Object.create({ choice: 'north' }), { world: 'Earth', phase: 25.25 }),
      { ...good, phase: '25.25' }, { ...good, phase: NaN }, { ...good, phase: Infinity },
      { ...good, phase: 25 }, { ...good, world: 'Mars' }, { ...good, world: new String('Earth') },
      { ...good, choice: 'constructor' }, { ...good, choice: {} }, { ...good, choice: new String('north') }]) {
      const env = renderSeasons({ seasonsPhase: 25.25, seasonsPrediction: record });
      expect(env.interpretation.dataset.inquiryStage).toBe('interpret'); expect(env.mainSave).toBeUndefined();
      expect(env.state.seasonsPrediction).toBe(record); expect(env.renderWrites).toBe(0);
      expect(env.lab.textContent).not.toMatch(/NaN|undefined|\[object Object\]/);
    }
  });

  it('requires a literal true saved marker and lets malformed truthy markers save valid evidence', () => {
    for (const marker of [false, 'true', 'false', 1, [], {}, null, undefined, true]) {
      const env = renderSeasons({ seasonsPrediction: { world: 'Earth', phase: 25, choice: 'north' },
        seasonsEvidenceSaved: marker });
      expect(env.mainSave.disabled).toBe(marker === true);
      expect(env.state.seasonsEvidenceSaved).toBe(marker); expect(env.renderWrites).toBe(0);
      if (marker !== true) {
        env.click(env.mainSave); expect(env.state.journalEntries).toHaveLength(1);
        expect(env.state.seasonsEvidenceSaved).toBe(true);
      }
    }
  });

  it('merges native world and phase updates from latest state and starts an unsaved interpretation', () => {
    const env = renderSeasons({ seasonsPrediction: { world: 'Earth', phase: 25, choice: 'north' }, seasonsEvidenceSaved: true });
    const phase = env.phase;
    const mars = env.button(env.lab.querySelector('[aria-label="World for seasons model"]'), /^Mars/);
    const changePhase = env.handler(phase, 'onChange'), changeWorld = env.handler(mars);
    changePhase(env.event(phase, '75.25')); changeWorld(env.event(mars));
    expect(env.state.seasonsPhase).toBe(75.25); expect(env.state.seasonsWorld).toBe('Mars');
    expect(env.state.seasonsPrediction).toBeNull(); expect(env.state.seasonsEvidenceSaved).toBe(false);
    env.render(); expect(env.interpretation.dataset.inquiryStage).toBe('interpret');
    expect(env.phase.value).toBe('75.25'); expect(env.lab.dataset.seasonWorld).toBe('Mars');
  });

  it('allows the evidence interpretation to be revised while keeping the current physical trial fixed', () => {
    const env = renderSeasons();
    env.interpret('south'); expect(env.interpretation.textContent).toContain('Compare the two readouts again');
    env.interpret('north'); expect(env.interpretation.textContent).toContain('Your interpretation matches the model');
    expect(env.state.seasonsPrediction).toEqual({ world: 'Earth', phase: 25, choice: 'north' });
    expect(env.state.seasonsWorld).toBe('Earth'); expect(env.state.seasonsPhase).toBe(25);
    expect(env.state.journalEntries).toHaveLength(0);
  });

  it('deduplicates captured interpretation saves and journals exact fractional geometry without XP', () => {
    const awardXP = vi.fn(), tryAward = vi.fn();
    const env = renderSeasons({ seasonsPhase: 25.25 }, { awardXP, tryAward });
    env.interpret('north');
    const control = env.mainSave, save = env.handler(control), event = env.event(control);
    save(event); save(event); save(event);
    expect(env.state.journalEntries).toHaveLength(1); expect(env.state.seasonsEvidenceSaved).toBe(true);
    const entry = env.state.journalEntries[0];
    expect(entry.planet).toBe('Earth'); expect(entry.investigation).toEqual({ id: 'seasons', explanation: '' });
    expect(entry.observation).toContain('25.25');
    expect(entry.observation).toContain(metrics('Earth', 25.25, 45).hours.toFixed(1) + ' h');
    env.render(); expect(env.mainSave.disabled).toBe(true);
    expect(awardXP).not.toHaveBeenCalled(); expect(tryAward).not.toHaveBeenCalled();
  });

  it('ignores a captured interpretation save after native geometry changes before rerender', () => {
    const env = renderSeasons(); env.interpret('north');
    const control = env.mainSave, save = env.handler(control), phase = env.phase;
    env.handler(phase, 'onChange')(env.event(phase, '75'));
    save(env.event(control)); save(env.event(control));
    expect(env.state.journalEntries).toHaveLength(0); expect(env.state.seasonsEvidenceSaved).toBe(false);
    env.render(); expect(env.interpretation.dataset.inquiryStage).toBe('interpret');
    env.interpret('south'); env.click(env.mainSave);
    expect(env.state.journalEntries).toHaveLength(1);
  });

  it('deduplicates latitude saves and permits a changed valid explanation to be saved without XP', () => {
    const awardXP = vi.fn(), tryAward = vi.fn();
    const env = renderSeasons({ seasonsLatitude: 70.25, seasonsPhase: 75.25,
      seasonsLatitudeExplanation: 'The daylight range grows near the poles.' }, { awardXP, tryAward });
    const control = env.latitudeSave, save = env.handler(control), event = env.event(control);
    save(event); save(event); save(event);
    expect(env.state.journalEntries).toHaveLength(1);
    expect(env.state.journalEntries[0].observation).toContain('±70.25°');
    expect(env.state.journalEntries[0].observation).toContain('75.25%');
    env.render(); expect(env.latitudeSave.disabled).toBe(true);
    const prior = env.state.journalEntries[0];
    env.latitudeExplain('Revised: compare the twelve-hour equator with polar day and night.');
    expect(env.latitudeSave.disabled).toBe(false); env.click(env.latitudeSave);
    expect(env.state.journalEntries).toHaveLength(2); expect(env.state.journalEntries[0]).toBe(prior);
    expect(awardXP).not.toHaveBeenCalled(); expect(tryAward).not.toHaveBeenCalled();
  });

  it('ignores captured latitude saves after latitude, phase, world or explanation changes', () => {
    for (const change of ['latitude', 'phase', 'world', 'draft']) {
      const env = renderSeasons({ seasonsLatitudeExplanation: 'Original reasoning.' });
      const control = env.latitudeSave, save = env.handler(control);
      if (change === 'latitude') env.setLatitude('70');
      if (change === 'phase') env.setPhase('75');
      if (change === 'world') env.world('Mars');
      if (change === 'draft') env.latitudeExplain('A new explanation.');
      save(env.event(control));
      expect(env.state.journalEntries).toHaveLength(0);
    }
  });

  it('rejects fabricated, inherited and incomplete restored guide records and permits explicit recapture', () => {
    const good = earthRecord(25);
    for (const record of [null, [], Object.create(good), { ...good, world: 'Mars' },
      { ...good, phase: '25' }, { ...good, northHours: 12 }, { ...good, southNoon: 45 },
      { ...good, northHours: NaN }, { ...good, southNoon: Infinity },
      { world: 'Earth', phase: 25, northHours: good.northHours },
      Object.assign(Object.create({ northNoon: good.northNoon }), {
        world: 'Earth', phase: 25, northHours: good.northHours, southHours: good.southHours, southNoon: good.southNoon,
      })]) {
      const guide = { prediction: 'opposite', step: 1, records: { 25: record } };
      const env = renderSeasons({ seasonsGuideActive: true, seasonsGuide: guide });
      expect(env.guide.querySelectorAll('[data-guide-observation]')).toHaveLength(0);
      expect(env.button(env.guide, 'Capture current Earth observation').disabled).toBe(false);
      expect(env.state.seasonsGuide).toBe(guide); expect(env.renderWrites).toBe(0);
      env.guideClick('Capture current Earth observation');
      expect(env.guide.querySelectorAll('[data-guide-observation]')).toHaveLength(1);
      expect(env.state.seasonsGuide.records[25].northHours).toBeCloseTo(good.northHours, 10);
    }
    const inherited = { prediction: 'opposite', step: 1, records: Object.create({ 25: good }) };
    const env = renderSeasons({ seasonsGuideActive: true, seasonsGuide: inherited });
    expect(env.guide.querySelectorAll('[data-guide-observation]')).toHaveLength(0);
    expect(env.state.seasonsGuide).toBe(inherited); expect(env.renderWrites).toBe(0);
  });

  it('accepts physically matching own restored Earth checkpoints and retains their original persisted objects', () => {
    const guide = readyGuide();
    const env = renderSeasons({ seasonsGuideActive: true, seasonsGuide: guide });
    expect(env.guide.querySelectorAll('[data-guide-observation]')).toHaveLength(2);
    expect(env.guide.dataset.guideStep).toBe('3');
    expect(env.state.seasonsGuide).toBe(guide); expect(env.renderWrites).toBe(0);
    const meters = [...env.guide.querySelectorAll('[role="meter"]')];
    expect(meters).toHaveLength(4);
    for (const meter of meters) {
      expect(meter.getAttribute('aria-valuemax')).toBe('24');
      expect(parseFloat(meter.firstElementChild.style.width)).toBeCloseTo(Number(meter.getAttribute('aria-valuenow')) / 24 * 100, 10);
    }
    for (const step of [null, undefined, false, true, '', '  ', [], {},
      { valueOf: null, toString: null }, Infinity, NaN]) {
      const restoredGuide = { ...readyGuide(), step };
      const restored = renderSeasons({ seasonsGuideActive: true, seasonsGuide: restoredGuide });
      expect(restored.guide.dataset.guideStep).toBe('1');
      expect(restored.guide.querySelectorAll('[data-guide-observation]')).toHaveLength(2);
      expect(restored.state.seasonsGuide).toBe(restoredGuide); expect(restored.renderWrites).toBe(0);
    }
  });

  it('keeps the first original guide prediction when different captured commitment handlers fire together', () => {
    for (const guide of [null, [], Object.create(readyGuide()), { prediction: 'constructor' },
      { prediction: new String('opposite') }]) {
      const restored = renderSeasons({ seasonsGuideActive: true, seasonsGuide: guide });
      expect(restored.guide.dataset.guideStep).toBe('0');
      expect(restored.lab.querySelector('.solar-seasons-stage')).toBeNull();
      expect(restored.state.seasonsGuide).toBe(guide); expect(restored.renderWrites).toBe(0);
    }
    const env = renderSeasons({ seasonsGuideActive: true });
    const together = env.guide.querySelector('[data-guide-prediction="together"]');
    const opposite = env.guide.querySelector('[data-guide-prediction="opposite"]');
    const unchanged = env.guide.querySelector('[data-guide-prediction="unchanged"]');
    const first = env.handler(together), second = env.handler(opposite), third = env.handler(unchanged);
    first(env.event(together)); second(env.event(opposite)); third(env.event(unchanged));
    expect(env.state.seasonsGuide.prediction).toBe('together');
    env.render(); expect(env.guide.textContent).toContain('Your original prediction: Daylight grows and shrinks together');
    expect(env.state.journalEntries).toHaveLength(0);
  });

  it('captures both checkpoints only through explicit Earth observations and retains them while revisiting steps', () => {
    const env = renderSeasons({ seasonsGuideActive: true });
    env.click(env.guide.querySelector('[data-guide-prediction="opposite"]'));
    env.world('Uranus'); expect(env.button(env.guide, 'Capture current Earth observation').disabled).toBe(true);
    env.guideClick('Inspect June position'); env.setPhase('50');
    expect(env.button(env.guide, 'Capture current Earth observation').disabled).toBe(true);
    env.guideClick('Inspect June position'); env.guideClick('Capture current Earth observation');
    env.guideClick('Inspect December position'); env.guideClick('Capture current Earth observation');
    const records = env.state.seasonsGuide.records;
    expect(records[25].northHours).toBeCloseTo(metrics('Earth', 25, 45).hours, 10);
    expect(records[75].northHours).toBeCloseTo(metrics('Earth', 75, 45).hours, 10);
    env.guideClick('Compare my evidence'); env.click(env.guide.querySelector('[data-guide-claim="tilt"]'));
    env.guideClick('Build my explanation'); env.explain('Keep this draft while reviewing.');
    env.guideClick(/^2\. Collect evidence|^✓ Collect evidence/);
    expect(env.state.seasonsGuide.records).toBe(records);
    expect(env.state.seasonsGuide.explanation).toBe('Keep this draft while reviewing.');
  });

  it('merges rapid June and December evidence insertions with authored prose and enforces the character cap', () => {
    const env = renderSeasons({ seasonsGuideActive: true, seasonsGuide: readyGuide() });
    const june = env.guide.querySelector('[data-guide-insert-evidence="25"]');
    const december = env.guide.querySelector('[data-guide-insert-evidence="75"]');
    const addJune = env.handler(june), addDecember = env.handler(december);
    addJune(env.event(june)); addDecember(env.event(december)); addJune(env.event(june));
    expect(env.state.seasonsGuide.explanation).toContain('My own reasoning stays here.');
    expect(env.state.seasonsGuide.explanation).toContain('In June, 45° N had 15.4 h');
    expect(env.state.seasonsGuide.explanation).toContain('In December, 45° N had 8.6 h');
    expect(env.state.seasonsGuide.explanation.match(/In June,/g)).toHaveLength(1);
    env.render(); expect(env.guide.querySelector('[data-guide-insert-evidence="25"]').disabled).toBe(true);
    expect(env.guide.querySelector('[data-guide-insert-evidence="75"]').disabled).toBe(true);
    env.explain('x'.repeat(1990));
    expect(env.guide.querySelector('[data-guide-insert-evidence="25"]').disabled).toBe(true);
    addJune(env.event(june)); addDecember(env.event(december));
    expect(env.state.seasonsGuide.explanation).toHaveLength(1990);
  });

  it('merges a captured claim edit and writing edit without losing either nested guide update', () => {
    const env = renderSeasons({ seasonsGuideActive: true, seasonsGuide: readyGuide() });
    const writing = document.getElementById('solar-guide-explanation');
    const changeWriting = env.handler(writing, 'onChange');
    env.guideClick(/^✓ Check a claim/);
    const distance = env.guide.querySelector('[data-guide-claim="distance"]');
    env.handler(distance)(env.event(distance));
    changeWriting(env.event(writing, 'My latest explanation survives the claim edit.'));
    expect(env.state.seasonsGuide.claim).toBe('distance');
    expect(env.state.seasonsGuide.explanation).toBe('My latest explanation survives the claim edit.');
    expect(env.state.seasonsGuide.records[25].northHours).toBeCloseTo(earthRecord(25).northHours, 10);
  });

  it('deduplicates guided saves, ignores changed-draft callbacks and permits revised reasoning without XP', () => {
    const awardXP = vi.fn(), tryAward = vi.fn();
    const env = renderSeasons({ seasonsGuideActive: true }, { awardXP, tryAward });
    completeGuide(env, 'together'); env.explain('June and December reverse the daylight advantage because of tilt. I revised my prediction.');
    const control = env.guideSave, save = env.handler(control), event = env.event(control);
    save(event); save(event); save(event);
    expect(env.state.journalEntries).toHaveLength(1);
    const entry = env.state.journalEntries[0];
    expect(entry.prediction).toContain('Daylight grows and shrinks together');
    expect(entry.observation).toContain('June solstice: 45° N daylight 15.4 h');
    expect(entry.observation).toContain('December solstice: 45° N daylight 8.6 h');
    expect(entry.investigation.id).toBe('seasons');
    env.render(); expect(env.guideSave.disabled).toBe(true);
    env.explain('Revised reasoning connects the noon Sun and day length to the fixed tilted axis.');
    save(event); expect(env.state.journalEntries).toHaveLength(1);
    expect(env.guideSave.disabled).toBe(false); env.click(env.guideSave);
    expect(env.state.journalEntries).toHaveLength(2); expect(env.state.journalEntries[0]).toBe(entry);
    expect(awardXP).not.toHaveBeenCalled(); expect(tryAward).not.toHaveBeenCalled();
  });

  for (const [route, saveProperty, seed] of [
    ['interpretation', 'mainSave', { seasonsPhase: 25.25,
      seasonsPrediction: { world: 'Earth', phase: 25.25, choice: 'north' }, seasonsEvidenceSaved: 'false' }],
    ['latitude', 'latitudeSave', { seasonsLatitudeExplanation: 'Compare equatorial and polar daylight.' }],
    ['guide', 'guideSave', { seasonsGuideActive: true, seasonsGuide: readyGuide() }],
  ]) {
    it(`keeps the committed ${route} save usable after an unchanged render is discarded`, () => {
      const prior = { planet: 'Earth', observation: 'Earlier orbital evidence.' };
      const env = renderSeasons({ ...seed, journalEntries: [prior] });
      const control = env[saveProperty], save = env.handler(control), event = env.event(control);
      env.commit(control);
      env.render({ commit: false });
      expect(env[saveProperty]).toBe(control);
      expect(env.handler(control)).toBe(save);
      expect(env.renderWrites).toBe(0);
      save(event); save(event);
      expect(env.state.journalEntries).toHaveLength(2);
      expect(env.state.journalEntries[0]).toBe(prior);
      expect(env.state.journalEntries[1].investigation.id).toBe('seasons');
      env.render(); expect(env[saveProperty].disabled).toBe(true);
    });

    it(`rejects superseded ${route} saves and preserves journal evidence pending before commit`, () => {
      const prior = { planet: 'Earth', observation: 'Earlier orbital evidence.' };
      const pending = { planet: 'Mars', observation: 'New evidence from another investigation.' };
      const env = renderSeasons({ ...seed, journalEntries: [prior] });
      const oldControl = env[saveProperty], oldSave = env.handler(oldControl);
      env.commit(oldControl);
      env.render();
      const control = env[saveProperty], save = env.handler(control), event = env.event(control);
      env.commit(control);
      oldSave(env.event(oldControl));
      expect(env.state.journalEntries).toEqual([prior]);

      env.rootState.solarSystem = { ...env.state, journalEntries: [prior, pending] };
      env.render({ commit: false });
      expect(env[saveProperty]).toBe(control);
      save(event); save(event);
      expect(env.state.journalEntries).toEqual([prior, pending]);
      expect(env.renderWrites).toBe(0);

      env.render();
      const currentControl = env[saveProperty], currentSave = env.handler(currentControl);
      env.commit(currentControl);
      currentSave(env.event(currentControl)); currentSave(env.event(currentControl));
      expect(env.state.journalEntries).toHaveLength(3);
      expect(env.state.journalEntries[0]).toBe(prior);
      expect(env.state.journalEntries[1]).toBe(pending);
      expect(env.state.journalEntries[2].investigation.id).toBe('seasons');
    });
  }

  it.each([[0, 0], [45.25, 25.25], [70, 75], [80, 100]])('keeps the responsive annual curves and markers on one physical scale at latitude %s and position %s', (latitude, phase) => {
    const env = renderSeasons({ seasonsLatitude: latitude, seasonsPhase: phase });
    const chart = env.lab.querySelector('[data-season-year-chart]'), svg = chart.querySelector('svg');
    expect(svg.getAttribute('viewBox')).toBe('0 0 480 192');
    expect(svg.getAttribute('preserveAspectRatio')).toBe('none');
    expect(svg.getAttribute('aria-label')).toContain('Fixed scale: 0 to 24 hours');
    expect(svg.querySelectorAll('text')).toHaveLength(0);
    expect(chart.hasAttribute('tabindex')).toBe(false);
    expect(chart.querySelector('#solar-season-year-phase').value).toBe(String(phase));
    expect(chart.querySelector('#solar-season-year-phase').getAttribute('step')).toBe('any');
    expect(env.phase.getAttribute('step')).toBe('any'); expect(env.latitude.getAttribute('step')).toBe('any');
    expect(Number(chart.querySelector('[data-season-year-cursor]').getAttribute('x1'))).toBeCloseTo(phase * 4.8, 10);
    for (const [hemisphere, signed] of [['north', latitude], ['south', -latitude]]) {
      const path = chart.querySelector(`[data-season-year-curve="${hemisphere}"]`);
      expect(path.getAttribute('vector-effect')).toBe('non-scaling-stroke');
      const points = [...path.getAttribute('d').matchAll(/[ML]([\d.]+),([\d.]+)/g)].map(match => ({ x: +match[1], y: +match[2] }));
      expect(points.length).toBe(phase % 1 ? 102 : 101);
      expect(points[0].x).toBe(0); expect(points.at(-1).x).toBe(480);
      points.forEach(point => {
        expect(point.x).toBeGreaterThanOrEqual(0); expect(point.x).toBeLessThanOrEqual(480);
        expect(point.y).toBeGreaterThanOrEqual(0); expect(point.y).toBeLessThanOrEqual(192);
        expect(point.y).toBeCloseTo(192 - metrics('Earth', point.x / 4.8, signed).hours * 8, 3);
      });
      const exact = points.find(point => Math.abs(point.x - phase * 4.8) < 1e-6);
      expect(exact).toBeTruthy(); expect(exact.y).toBeCloseTo(192 - metrics('Earth', phase, signed).hours * 8, 3);
      const dot = chart.querySelector(`[data-season-year-point="${hemisphere}"]`), expected = metrics('Earth', phase, signed).hours;
      expect(parseFloat(dot.style.left)).toBe(phase);
      expect(parseFloat(dot.style.top)).toBeCloseTo(100 - expected / 24 * 100, 10);
      expect(Number(dot.dataset.hours)).toBeCloseTo(expected, 10);
      expect(chart.querySelector(`[data-season-year-reading="${hemisphere}"]`).textContent).toContain(expected.toFixed(1) + ' h daylight');
    }
    if (latitude === 0) {
      expect(chart.querySelector('[data-season-year-curve="north"]').getAttribute('d')).toBe(chart.querySelector('[data-season-year-curve="south"]').getAttribute('d'));
      expect(chart.textContent).toContain('curves and markers overlap');
    }
    expect(env.renderWrites).toBe(0);
  });

  it('synchronizes the local year slider and exact checkpoints without changing saved writing or captured evidence', () => {
    const guide = readyGuide(), journal = [{ observation: 'Keep this prior evidence' }];
    const env = renderSeasons({ seasonsGuide: guide, journalEntries: journal, seasonsLatitudeExplanation: 'Keep this explanation',
      seasonsPrediction: { world: 'Earth', phase: 25, choice: 'north' }, seasonsEvidenceSaved: true });
    env.change(env.lab.querySelector('#solar-season-year-phase'), '75.125');
    expect(env.phase.value).toBe('75.125'); assertLatitude(env, 75.125, 45);
    expect(env.state.seasonsPrediction).toBeNull(); expect(env.state.seasonsEvidenceSaved).toBe(false);
    expect(env.state.seasonsGuide).toBe(guide); expect(env.state.journalEntries).toBe(journal);
    expect(env.state.seasonsLatitudeExplanation).toBe('Keep this explanation');
    expect(env.lab.querySelectorAll('[data-season-year-checkpoint][aria-pressed="true"]')).toHaveLength(0);
    for (const phase of [0, 25, 50, 75]) {
      env.click(env.lab.querySelector(`[data-season-year-checkpoint="${phase}"]`));
      expect(env.phase.value).toBe(String(phase)); assertLatitude(env, phase, 45);
      expect([...env.lab.querySelectorAll('[data-season-year-checkpoint][aria-pressed="true"]')].map(n => +n.dataset.seasonYearCheckpoint)).toEqual([phase]);
    }
    env.setPhase('100');
    expect(env.lab.querySelector('[data-season-year-checkpoint="0"]').getAttribute('aria-pressed')).toBe('true');
    expect(env.lab.querySelector('[data-season-year-cursor]').getAttribute('x1')).toBe('480');
    expect(env.lab.querySelector('#solar-season-year-phase').value).toBe('100');
  });

  it('retains one-unit arrow-key changes while allowing fractional restored slider positions', () => {
    const env = renderSeasons({ seasonsPhase: 25.25, seasonsLatitude: 45.25 });
    function key(control, value) { const preventDefault = vi.fn(); env.handler(control, 'onKeyDown')({ key: value, preventDefault }); env.render(); return preventDefault; }
    expect(key(env.lab.querySelector('#solar-season-year-phase'), 'ArrowRight')).toHaveBeenCalledOnce();
    expect(env.state.seasonsPhase).toBe(26.25); expect(env.phase.value).toBe('26.25');
    key(env.phase, 'ArrowLeft'); expect(env.state.seasonsPhase).toBe(25.25);
    key(env.latitude, 'ArrowUp'); expect(env.state.seasonsLatitude).toBe(46.25);
    key(env.latitude, 'ArrowDown'); expect(env.state.seasonsLatitude).toBe(45.25);
    env.setPhase('100'); key(env.lab.querySelector('#solar-season-year-phase'), 'ArrowRight'); expect(env.state.seasonsPhase).toBe(100);
    env.setLatitude('0'); key(env.latitude, 'ArrowLeft'); expect(env.state.seasonsLatitude).toBe(0);
    expect(key(env.phase, 'Home')).not.toHaveBeenCalled();
  });

  it('guards removed annual controls after world changes, closing, or returning to the prediction gate', () => {
    for (const change of ['world', 'close', 'guide']) {
      const env = renderSeasons(), control = env.lab.querySelector('[data-season-year-checkpoint="75"]'), action = env.handler(control);
      if (change === 'world') env.world('Mars');
      else { env.rootState.solarSystem = { ...env.state, ...(change === 'close' ? { showSeasonsLab: false } : { seasonsGuideActive: true, seasonsGuide: {} }) }; env.render(); }
      const before = env.state; action(env.event(control));
      expect(env.state).toBe(before); expect(env.state.seasonsPhase).toBe(25);
    }
  });

  it('preserves unrelated learning and historical journal evidence while rejecting invalid current hub progress', () => {
    const prior = { planet: 'Earth', observation: 'Keep earlier orbit evidence.' };
    const sibling = { retainedDraft: 'An unrelated tool draft.' };
    const retained = { orr_time: 4.25, orr_sel: 'mercury', orr_paused: true,
      orr_snapshots: { earth: { A: { time: 0.2 } } }, keplerInquiry: { a: 3, e: 0.2 },
      compareReasoningDrafts: { 'Earth:Jupiter': 'Keep the comparison.' },
      signalNotebooks: { Mars: { explanation: 'Keep signal evidence.', observations: [] } },
      moonPrediction: { phase: 45, node: 30, choice: 'none' }, gravityPrediction: 'same',
      transferDebriefs: { 'earth-mars': { explanation: 'Keep transfer reasoning.' } } };
    const env = renderSeasons({ ...retained, journalEntries: [prior] }, {}, { chemistryLab: sibling });
    env.setPhase('75.25'); env.setLatitude('70.25'); env.interpret('south'); env.click(env.mainSave);
    for (const [key, value] of Object.entries(retained)) expect(env.state[key]).toBe(value);
    expect(env.rootState.chemistryLab).toBe(sibling); expect(env.state.journalEntries[0]).toBe(prior);
    expect(env.state.journalEntries).toHaveLength(2);
    for (const record of [null, 'north', Object.create({ world: 'Earth', phase: 25, choice: 'north' }),
      { world: 'Earth', phase: 75, choice: 'north' }, { world: 'Earth', phase: '25', choice: 'north' },
      { world: 'Earth', phase: 25, choice: 'constructor' }]) {
      const invalid = renderSeasons({ showSeasonsLab: false, seasonsPrediction: record, seasonsEvidenceSaved: 'true' });
      expect(invalid.hub.dataset.investigationProgress).toBe('not-started'); expect(invalid.renderWrites).toBe(0);
    }
    const current = renderSeasons({ showSeasonsLab: false, seasonsEvidenceSaved: 'false',
      seasonsPrediction: { world: 'Earth', phase: 25, choice: 'north' } });
    expect(current.hub.dataset.investigationProgress).toBe('prediction');
    const marker = renderSeasons({ showSeasonsLab: false, seasonsPrediction: null, seasonsEvidenceSaved: true });
    expect(marker.hub.dataset.investigationProgress).toBe('saved');
    const historical = { planet: 'Earth', observation: 'Historical seasons evidence.', investigation: { id: 'seasons', explanation: '' } };
    const linked = renderSeasons({ showSeasonsLab: false, seasonsPrediction: null, seasonsEvidenceSaved: false, journalEntries: [historical] });
    expect(linked.hub.dataset.investigationProgress).toBe('saved');
    expect(linked.state.journalEntries[0]).toBe(historical);
    expect(document.querySelector('[data-investigation-constellation-id="seasons"]').dataset.complete).toBe('true');
  });
});
