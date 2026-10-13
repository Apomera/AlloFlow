import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const SECONDS_PER_AU = 499.0047838;
const ORBIT_AU = { Mercury: 0.387, Venus: 0.723, Mars: 1.524, Jupiter: 5.203,
  Saturn: 9.537, Uranus: 19.19, Neptune: 30.07, Pluto: 39.48 };
const WORLD_KEYS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const EXPLANATION = 'The signal speed stayed constant. B had a longer path, so the delay grew.';

// The oracle uses the stated circular, coplanar orbital geometry independently
// of the production helper. It deliberately retains fractional saved angles.
function observation(target, angle) {
  const radius = ORBIT_AU[target];
  const distanceAU = Math.sqrt(1 + radius ** 2 - 2 * radius * Math.cos(angle * Math.PI / 180));
  return { target, angle, distanceAU, oneWaySeconds: distanceAU * SECONDS_PER_AU };
}
function translate(key, fallback) {
  return WORLD_KEYS.find((name) => key === `stem.solar_sys.${name.toLowerCase()}`) || fallback || key;
}

function signalSubtree(node) {
  if (React.isValidElement(node) && node.props.id === 'solar-signal-lab') return node;
  let found = null;
  const children = Array.isArray(node) ? node : React.isValidElement(node) ? node.props.children : null;
  React.Children.forEach(children, (child) => {
    if (!found && React.isValidElement(child)) found = signalSubtree(child);
  });
  return found;
}

// Capture actual native production handlers. Browser coverage owns mounted
// refs, pointer/keyboard behavior, SVG text bounds, contrast and layout.
function renderSignal(seed = {}, overrides = {}) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
    showSignalLab: true, selectedPlanet: 'Earth', viewTab: 'overview', paused: true,
    signalTarget: 'Mars', signalAngle: 0, missionLog: [], journalEntries: [], ...seed,
  } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (typeof type === 'string' && props &&
        ['onClick', 'onChange'].some((name) => typeof props[name] === 'function')) {
      const id = String(callbacks.size);
      callbacks.set(id, props);
      return React.createElement(type, { ...props, 'data-signal-callback': id }, ...children);
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map();
      store.dirty = false;
      const ctx = makeCtx({ t: translate, ...overrides, React: callbackReact }, store);
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => {
        // Run the production render and its hooks, then serialize the complete
        // signal lab only. Every asserted control, reading, SVG, and link lives
        // here; unrelated explorer markup need not be rebuilt in JSDOM.
        const labTree = signalSubtree(config.render(ctx));
        if (!labTree) throw new Error('The production signal lab must be rendered');
        return labTree;
      }));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  const lab = () => document.getElementById('solar-signal-lab');
  function button(name) {
    return [...(lab()?.querySelectorAll('button') || [])].find((control) =>
      (control.getAttribute('aria-label') || control.textContent).replace(/\s+/g, ' ').trim() === name);
  }
  function handler(control, name = 'onClick') {
    expect(control, 'The production signal control must be rendered').toBeTruthy();
    expect(control.disabled, 'Only an enabled signal control can be activated').toBe(false);
    const fn = callbacks.get(control.dataset.signalCallback)?.[name];
    expect(fn).toBeTypeOf('function');
    return fn;
  }
  function event(control, value) {
    return { target: value === undefined ? control : { value }, currentTarget: control, preventDefault() {} };
  }
  function click(control) { handler(control)(event(control)); render(); }
  function change(control, value) { handler(control, 'onChange')(event(control, value)); render(); }
  render();
  return {
    get state() { return store.toolData.solarSystem; },
    get lab() { return lab(); },
    get notebook() { return lab()?.querySelector('[data-signal-notebook]'); },
    get angle() { return document.getElementById('solar-signal-angle'); },
    get draft() { return document.getElementById('solar-signal-explanation'); },
    get record() { return lab()?.querySelector('[data-signal-record-observation]'); },
    get save() { return [...(lab()?.querySelectorAll('button') || [])].find((item) =>
      /Save signal evidence to journal|Signal evidence saved/.test(item.textContent)); },
    get receipt() { return [...(lab()?.querySelectorAll('[role="status"]') || [])].find((item) =>
      /^Ping sent[.]/.test(item.textContent.trim())); },
    get journey() { return document.getElementById('solar-signal-journey'); },
    get timeSlider() { return document.getElementById('solar-signal-inspect-time'); },
    get timeReading() { return lab()?.querySelector('[data-signal-inspection-reading]'); },
    button, click, change, handler, event, render,
    target(key) { click(lab().querySelector(`[data-signal-target-option="${key}"]`)); },
    setAngle(value) { change(document.getElementById('solar-signal-angle'), value); },
    inspect(value) { change(document.getElementById('solar-signal-inspect-time'), String(value)); },
    write(value) { change(document.getElementById('solar-signal-explanation'), value); },
    predict(value) { click(button({ increase: 'Increases', decrease: 'Decreases', same: 'Stays same' }[value])); },
  };
}

function meters(env) { return [...env.notebook.querySelectorAll('[role="meter"]')]; }
function assertJourney(env, target, angle) {
  const expected = observation(target, angle);
  for (const [key, value] of [['distance', expected.distanceAU],
    ['one-way', expected.oneWaySeconds], ['round-trip', expected.oneWaySeconds * 2]]) {
    const reading = env.lab.querySelector(`[data-signal-${key}]`);
    expect(reading?.tagName).toBe('DD');
    expect(Number(reading.dataset.value)).toBeCloseTo(value, 9);
  }
  expect(env.journey?.getAttribute('role')).toBe('img');
  expect(env.journey.getAttribute('aria-label')).toMatch(/one.way/i);
  expect(env.journey.getAttribute('aria-label')).toMatch(/earliest.*reply/i);
  expect(Number(env.journey.dataset.oneWaySeconds)).toBeCloseTo(expected.oneWaySeconds, 9);
  expect(Number(env.journey.dataset.replySeconds)).toBeCloseTo(expected.oneWaySeconds * 2, 9);
  for (const leg of ['outbound', 'return']) {
    const segment = env.journey.querySelector(`[data-signal-leg="${leg}"]`);
    expect(segment).not.toBeNull();
    expect(segment.style.width).toBe('50%');
    expect(Number(segment.dataset.seconds)).toBeCloseTo(expected.oneWaySeconds, 9);
  }
}

describe('Solar System signal inspection bench', () => {
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

  it('keeps the named investigation, eight native destinations and established readout hooks', () => {
    const env = renderSignal();
    expect(env.lab?.tagName).toBe('SECTION');
    expect(env.lab.getAttribute('aria-labelledby')).toBe('solar-signal-lab-title');
    expect(document.getElementById('solar-signal-lab-title').textContent).toContain('mission control');
    const controls = [...env.lab.querySelectorAll('[data-signal-target-option]')];
    expect(controls.map((item) => item.dataset.signalTargetOption)).toEqual(Object.keys(ORBIT_AU));
    expect(controls.every((item) => item.type === 'button')).toBe(true);
    expect(controls.filter((item) => item.getAttribute('aria-pressed') === 'true').map((item) => item.dataset.signalTargetOption)).toEqual(['Mars']);
    expect(env.lab.querySelector('[data-signal-one-way]').textContent).toBe('4.4 min');
    expect(env.lab.querySelector('[data-signal-round-trip]').textContent).toBe('8.7 min');
    expect(env.angle.getAttribute('aria-valuetext')).toContain('distance 0.524 AU');
  });

  it('uses equal outbound and immediate-return time segments with independent raw light times', () => {
    const env = renderSignal();
    assertJourney(env, 'Mars', 0);
    env.click(env.button('Far alignment'));
    assertJourney(env, 'Mars', 180);
    expect(env.lab.querySelector('[data-signal-one-way]').textContent).toBe('21.0 min');
    expect(env.lab.querySelector('[data-signal-round-trip]').textContent).toBe('42.0 min');
    env.target('Neptune');
    assertJourney(env, 'Neptune', 180);
    expect(env.lab.textContent).toContain('Solar-conjunction caution');
  });

  it('contains every modeled destination and Earth dot at near, right-angle and far alignments', () => {
    const env = renderSignal();
    for (const target of Object.keys(ORBIT_AU)) {
      env.target(target);
      for (const angle of [0, 90, 180]) {
        env.setAngle(String(angle));
        const svg = env.lab.querySelector('.solar-signal-stage svg');
        expect(svg.getAttribute('viewBox')).toBe('0 0 660 500');
        const dots = [...svg.querySelectorAll('[data-signal-world-dot]')];
        expect(dots.map((dot) => dot.getAttribute('data-signal-world-dot')).sort()).toEqual(['Earth', target].sort());
        for (const dot of dots) {
          const x = Number(dot.getAttribute('cx')), y = Number(dot.getAttribute('cy')), radius = Number(dot.getAttribute('r'));
          expect([x, y, radius].every(Number.isFinite)).toBe(true);
          expect(radius).toBeGreaterThan(0);
          expect(x - radius).toBeGreaterThanOrEqual(0); expect(x + radius).toBeLessThanOrEqual(660);
          expect(y - radius).toBeGreaterThanOrEqual(0); expect(y + radius).toBeLessThanOrEqual(500);
        }
        assertJourney(env, target, angle);
      }
    }
  });

  it('falls back from malformed, inherited and unknown targets without rewriting saved data', () => {
    for (const target of [null, {}, [], 42, 'Earth', 'not-a-world', 'constructor', '__proto__']) {
      const env = renderSignal({ signalTarget: target });
      expect(env.lab.dataset.signalTarget).toBe('Mars');
      expect(env.state.signalTarget).toBe(target);
      expect(env.lab.textContent).not.toMatch(/NaN|undefined|\[object Object\]/);
      assertJourney(env, 'Mars', 0);
    }
  });

  it('derives a finite integer angle from numbers and nonblank numeric strings without render writes', () => {
    for (const [raw, expected] of [[6.7, 7], [' 90 ', 90], [999, 180], [-9, 0],
      [null, 0], [false, 0], [true, 0], ['', 0], ['   ', 0], ['not-an-angle', 0],
      [[], 0], [['180'], 0], [{}, 0], [Infinity, 0], [NaN, 0]]) {
      const env = renderSignal({ signalAngle: raw });
      expect(env.lab.dataset.signalAngle).toBe(String(expected));
      expect(env.angle.value).toBe(String(expected));
      expect(env.state.signalAngle).toBe(raw);
      assertJourney(env, 'Mars', expected);
    }
  });

  it('derives an empty notebook from malformed maps and inherited destination records', () => {
    for (const notebooks of [null, [], 'notebooks', 17,
      Object.create({ Mars: { observations: [observation('Mars', 0)], explanation: EXPLANATION } })]) {
      const env = renderSignal({ signalNotebooks: notebooks });
      expect(meters(env)).toHaveLength(0);
      expect(env.draft.value).toBe('');
      expect(env.state.signalNotebooks).toBe(notebooks);
      expect(env.lab.textContent).not.toMatch(/NaN|undefined|\[object Object\]/);
      env.click(env.record);
      expect(env.state.signalNotebooks.Mars.observations).toEqual([observation('Mars', 0)]);
    }
  });

  it('ignores nonobject destination records and nonstring explanations without corrupting siblings', () => {
    for (const record of [null, [], 'Mars notebook', 8, { explanation: {} }, { explanation: ['draft'] },
      Object.create({ observations: [observation('Mars', 0)], explanation: EXPLANATION })]) {
      const notebooks = { Mars: record, Jupiter: { explanation: 'Retained Jupiter draft', observations: [] } };
      const env = renderSignal({ signalNotebooks: notebooks });
      expect(env.draft.value).toBe('');
      expect(meters(env)).toHaveLength(0);
      expect(env.state.signalNotebooks).toBe(notebooks);
      env.write(EXPLANATION);
      expect(env.state.signalNotebooks.Mars.explanation).toBe(EXPLANATION);
      expect(env.state.signalNotebooks.Jupiter).toBe(notebooks.Jupiter);
    }
  });

  it('recalculates contradictory restored observations from recorded angles while preserving their raw fields', () => {
    const a = { target: 'Mars', angle: 0.5, distanceAU: 999, oneWaySeconds: 2 };
    const b = { target: 'Mars', angle: 180, distanceAU: 1, oneWaySeconds: 1 };
    const notebooks = { Mars: { observations: [a, b], explanation: EXPLANATION } };
    const env = renderSignal({ signalNotebooks: notebooks });
    expect(meters(env)).toHaveLength(2);
    for (const [index, item] of [a, b].entries()) {
      const expected = observation('Mars', item.angle);
      expect(Number(meters(env)[index].getAttribute('aria-valuenow'))).toBeCloseTo(expected.oneWaySeconds, 9);
      const article = env.notebook.querySelector(`[data-signal-observation="${index === 0 ? 'A' : 'B'}"]`);
      expect(article.textContent).toContain(expected.distanceAU.toFixed(3) + ' AU');
    }
    expect(env.state.signalNotebooks).toBe(notebooks);
    expect(env.state.signalNotebooks.Mars.observations).toEqual([a, b]);
    env.predict('increase'); env.click(env.save);
    expect(env.state.journalEntries[0].observation).toContain(observation('Mars', 0.5).distanceAU.toFixed(3) + ' AU');
    expect(env.state.journalEntries[0].observation).not.toContain('999');
  });

  it('filters malformed and other-destination readings and limits retained evidence to two valid observations', () => {
    const valid = [observation('Mars', 0), observation('Mars', 180), observation('Mars', 90)];
    const observations = [null, [], 'reading', observation('Jupiter', 0), Object.create(valid[0]),
      { ...valid[0], angle: '0' }, { ...valid[0], angle: -1 }, { ...valid[0], angle: 181 },
      { ...valid[0], distanceAU: 0 }, { ...valid[0], distanceAU: Infinity },
      { ...valid[0], oneWaySeconds: '4' }, { ...valid[0], oneWaySeconds: NaN }, ...valid];
    const env = renderSignal({ signalNotebooks: { Mars: { observations } } });
    expect(meters(env)).toHaveLength(2);
    expect(meters(env).map((meter) => Number(meter.getAttribute('aria-valuenow')))).toEqual(valid.slice(0, 2).map((item) => item.oneWaySeconds));
    expect(env.state.signalNotebooks.Mars.observations).toBe(observations);
  });

  it('keeps observation readings fixed on one shared linear time scale as the current setup changes', () => {
    const readings = [observation('Mars', 0), observation('Mars', 180)];
    const env = renderSignal({ signalNotebooks: { Mars: { observations: readings } } });
    const maximum = readings[1].oneWaySeconds;
    for (const [index, meter] of meters(env).entries()) {
      expect(Number(meter.getAttribute('aria-valuemin'))).toBe(0);
      expect(Number(meter.getAttribute('aria-valuemax'))).toBeCloseTo(maximum, 9);
      expect(Number(meter.getAttribute('aria-valuenow'))).toBeCloseTo(readings[index].oneWaySeconds, 9);
      expect(parseFloat(meter.firstElementChild.style.width)).toBeCloseTo(100 * readings[index].oneWaySeconds / maximum, 9);
    }
    env.setAngle('90');
    expect(meters(env).map((meter) => Number(meter.getAttribute('aria-valuenow')))).toEqual(readings.map((item) => item.oneWaySeconds));
    expect(env.notebook.querySelector('[data-signal-notebook-status]').textContent).toContain('16.6 min longer');
  });

  it('describes equal restored observations honestly without claiming that either delay grew', () => {
    const readings = [observation('Mars', 90), observation('Mars', 90)];
    const env = renderSignal({ signalAngle: 90, signalNotebooks: { Mars: { observations: readings } } });
    expect(meters(env)).toHaveLength(2);
    expect(meters(env).map((meter) => Number(meter.getAttribute('aria-valuenow')))).toEqual(readings.map((item) => item.oneWaySeconds));
    expect(meters(env).map((meter) => meter.firstElementChild.style.width)[0]).toBe(meters(env)[1].firstElementChild.style.width);
    expect(env.notebook.querySelector('[data-signal-notebook-status]').textContent).toContain('same one-way delay');
    expect(env.notebook.querySelector('[data-signal-notebook-status]').textContent).not.toMatch(/longer|shorter/);
    expect(env.record.disabled).toBe(true);
    expect(env.state.signalNotebooks.Mars.observations).toBe(readings);
  });

  it('freezes A, replaces only B, prevents repeated angle capture and retains writing when cleared', () => {
    const env = renderSignal();
    env.click(env.record);
    expect(env.record.disabled).toBe(true);
    env.setAngle('180'); env.click(env.record);
    env.setAngle('90');
    expect(env.record.textContent).toBe('Update observation B');
    env.click(env.record);
    expect(env.state.signalNotebooks.Mars.observations).toEqual([observation('Mars', 0), observation('Mars', 90)]);
    env.write(EXPLANATION);
    env.click(env.button('Clear observations'));
    expect(meters(env)).toHaveLength(0);
    expect(env.record.textContent).toBe('Record observation A');
    expect(env.draft.value).toBe(EXPLANATION);
  });

  it('retains independent destination observations and drafts through native target changes', () => {
    const env = renderSignal();
    env.click(env.record); env.write(EXPLANATION); env.predict('increase');
    env.target('Jupiter');
    expect(meters(env)).toHaveLength(0); expect(env.draft.value).toBe('');
    expect(env.save).toBeUndefined();
    env.click(env.record); env.write('Jupiter draft');
    env.target('Mars');
    expect(env.draft.value).toBe(EXPLANATION);
    expect(meters(env)).toHaveLength(1);
    expect(env.state.signalNotebooks.Jupiter.explanation).toBe('Jupiter draft');
    expect(env.state.signalNotebooks.Mars.observations).toEqual([observation('Mars', 0)]);
  });

  it('accepts only known hypotheses and a literal true evidence marker', () => {
    for (const prediction of [null, {}, [], 9, 'increase!', 'constructor']) {
      const env = renderSignal({ signalPrediction: prediction, signalEvidenceSaved: 'false' });
      expect(env.save).toBeUndefined();
      expect(env.lab.querySelector('[data-inquiry-stage]').dataset.inquiryStage).toBe('predict');
      expect(env.state.signalPrediction).toBe(prediction);
    }
    for (const prediction of ['increase', 'same', 'decrease']) {
      const env = renderSignal({ signalPrediction: prediction, signalEvidenceSaved: 'false' });
      expect(env.save.disabled).toBe(false);
      expect(env.lab.querySelector('[data-inquiry-stage]').dataset.inquiryStage).toBe('evidence');
      env.click(env.save);
      expect(env.state.journalEntries[0].prediction).toContain('would ' + prediction);
    }
  });

  it('keeps sent receipts tied to their original position and clears them when changing destination', () => {
    const env = renderSignal();
    env.click(env.button('Send a light-speed ping'));
    expect(env.receipt.textContent).toContain('At 0°'); expect(env.receipt.textContent).toContain('4.4 min');
    env.setAngle('180');
    expect(env.receipt.textContent).toContain('At 0°'); expect(env.receipt.textContent).toContain('4.4 min');
    expect(env.lab.querySelector('[data-signal-one-way]').textContent).toBe('21.0 min');
    env.click(env.button('Send a light-speed ping'));
    expect(env.receipt.textContent).toContain('At 180°'); expect(env.receipt.textContent).toContain('21.0 min');
    env.target('Pluto'); expect(env.receipt).toBeUndefined();
    expect(env.state.signalLastPing).toBeNull();
  });

  it('ignores malformed, inherited, inconsistent and wrong-target receipts without render writes', () => {
    const good = { target: 'Mars', angle: 0, oneWaySeconds: observation('Mars', 0).oneWaySeconds };
    for (const ping of [null, [], 'ping', Object.create(good),
      { ...good, target: 'Jupiter' }, { ...good, angle: '0' }, { ...good, angle: 181 },
      { ...good, oneWaySeconds: '4' }, { ...good, oneWaySeconds: -1 },
      { ...good, oneWaySeconds: Infinity }, { ...good, oneWaySeconds: good.oneWaySeconds + 100 }]) {
      const env = renderSignal({ signalLastPing: ping });
      expect(env.receipt).toBeUndefined();
      expect(env.state.signalLastPing).toBe(ping);
      expect(env.lab.textContent).not.toMatch(/NaN|undefined|\[object Object\]/);
    }
    const env = renderSignal({ signalLastPing: good });
    expect(env.receipt.textContent).toContain('4.4 min');
    expect(env.state.signalLastPing).toBe(good);
  });

  it('starts valid ping animation counters from a safe integer instead of propagating invalid saves', () => {
    for (const [raw, next] of [[null, 1], [-1, 1], [1.5, 2], [Infinity, 1], [NaN, 1],
      [{}, 1], [[], 1], ['invalid', 1], ['7', 1], [true, 1], [1000001, 1],
      [1000000, 1], [999999, 1000000]]) {
      const env = renderSignal({ signalPulseNonce: raw });
      expect(env.state.signalPulseNonce).toBe(raw);
      env.click(env.button('Send a light-speed ping'));
      expect(env.state.signalPulseNonce).toBe(next);
      expect(env.state.signalLastPing).toEqual({ target: 'Mars', angle: 0, oneWaySeconds: observation('Mars', 0).oneWaySeconds });
    }
    const env = renderSignal({ signalPulseNonce: 3 });
    env.click(env.button('Send a light-speed ping')); expect(env.state.signalPulseNonce).toBe(4);
  });

  it('honors a legacy true saved marker until evidence is edited and permits the revised explanation', () => {
    const env = renderSignal({ signalPrediction: 'increase', signalEvidenceSaved: true,
      signalNotebooks: { Mars: { explanation: EXPLANATION } } });
    expect(env.save.disabled).toBe(true);
    env.write(EXPLANATION + ' The return leg needs the same travel time.');
    expect(env.state.signalEvidenceSaved).toBe(false); expect(env.save.disabled).toBe(false);
    env.click(env.save);
    expect(env.state.journalEntries).toHaveLength(1);
    expect(env.state.journalEntries[0].surprise).toContain('return leg');
    expect(env.state.signalEvidenceSaved).toBe(true);
  });

  it('guards repeated captured save callbacks while allowing new angle and writing evidence without XP', () => {
    const awardXP = vi.fn(), tryAward = vi.fn();
    const env = renderSignal({ signalPrediction: 'increase', signalNotebooks: { Mars: {
      observations: [observation('Mars', 0), observation('Mars', 180)], explanation: `  ${EXPLANATION}  `,
    } } }, { awardXP, tryAward });
    const control = env.save, save = env.handler(control), event = env.event(control);
    save(event); save(event); save(event); env.render();
    expect(env.state.journalEntries).toHaveLength(1);
    expect(env.state.journalEntries[0].surprise).toBe(EXPLANATION);
    expect(env.state.journalEntries[0].investigation).toEqual({ id: 'signal', explanation: EXPLANATION });
    expect(env.state.journalEntries[0].observation).toContain('A: 0°');
    expect(env.state.journalEntries[0].observation).toContain('B: 180°');
    env.setAngle('90'); env.click(env.save);
    expect(env.state.journalEntries).toHaveLength(2);
    expect(env.state.journalEntries[1].observation).toContain('At 90°');
    env.write(EXPLANATION + ' Both legs are equally long.'); env.click(env.save);
    expect(env.state.journalEntries).toHaveLength(3);
    expect(awardXP).not.toHaveBeenCalled(); expect(tryAward).not.toHaveBeenCalled();
  });

  it('preserves unrelated learning state and journal entries while retaining the disclosed model limits', () => {
    const prior = { planet: 'Earth', observation: 'Keep this earlier orbit measurement.' };
    const retained = { orr_time: 4.25, orr_sel: 'mercury', orr_paused: true,
      orr_snapshots: { earth: { A: { time: 0.2 } } }, keplerInquiry: { a: 3, e: 0.2 },
      compareReasoningDrafts: { 'Earth:Jupiter': 'Keep a comparison draft.' },
      transferDebriefs: { 'earth-mars': { explanation: 'Keep a transfer explanation.' } } };
    const env = renderSignal({ ...retained, journalEntries: [prior] });
    env.target('Jupiter'); env.setAngle('90'); env.click(env.record); env.write(EXPLANATION);
    env.predict('increase'); env.click(env.save);
    for (const [key, value] of Object.entries(retained)) expect(env.state[key]).toBe(value);
    expect(env.state.journalEntries[0]).toBe(prior); expect(env.state.journalEntries).toHaveLength(2);
    expect(env.lab.textContent).toContain('Model boundary');
    expect(env.lab.textContent).toContain('not today’s ephemeris');
    expect(env.lab.textContent).toContain('not distance divided by a constant rocket speed');
    expect([...env.lab.querySelectorAll('a')].map((link) => link.href)).toEqual(expect.arrayContaining([
      'https://science.nasa.gov/mars/mars-relay-network/', 'https://physics.nist.gov/cuu/Constants/Value/c.html',
    ]));
  });

  it.each([['Mercury', 0], ['Mars', 90], ['Pluto', 180], ['Neptune', 90]])('links %s at %s degrees to a linear round-trip clock and a returning packet', (target, angle) => {
    const env = renderSignal({ signalTarget: target, signalAngle: angle });
    const expected = observation(target, angle);
    expect(env.timeReading.dataset.phase).toBe('uninspected');
    expect(env.lab.querySelector('[data-signal-time-cursor]')).toBeNull();
    expect(env.timeSlider.closest('[role="img"]')).toBeNull();
    const phases = ['At departure', 'Command outbound', 'Command arrives · reply begins', 'Reply returning', 'Reply arrives at Earth'];
    [0, 25, 50, 75, 100].forEach((progress, index) => {
      env.inspect(progress);
      const fraction = progress / 100, position = fraction <= .5 ? 2 * fraction : 2 * (1 - fraction);
      expect(Number(env.timeReading.dataset.elapsedSeconds)).toBeCloseTo(expected.oneWaySeconds * 2 * fraction, 8);
      expect(Number(env.timeReading.dataset.travelledAu)).toBeCloseTo(expected.distanceAU * 2 * fraction, 8);
      expect(env.timeReading.dataset.phase).toBe(phases[index]);
      expect(env.timeSlider.getAttribute('aria-valuetext')).toContain(phases[index]);
      expect(parseFloat(env.lab.querySelector('[data-signal-time-cursor]').style.left)).toBe(progress);
      const packet = env.lab.querySelector('[data-signal-route-packet]');
      expect(Number(packet.dataset.position)).toBe(position);
      expect(packet.dataset.leg).toBe(progress > 50 ? 'return' : 'outbound');
      expect(parseFloat(packet.style.left)).toBeCloseTo(8 + 84 * position, 8);
      const start = env.lab.querySelector('[data-signal-world-dot="Earth"]'), end = env.lab.querySelector(`[data-signal-world-dot="${target}"]`);
      const transform = env.lab.querySelector('[data-signal-map-packet]').getAttribute('transform');
      const [x, y] = transform.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi).map(Number);
      expect(x).toBeCloseTo(+start.getAttribute('cx') + (+end.getAttribute('cx') - +start.getAttribute('cx')) * position, 8);
      expect(y).toBeCloseTo(+start.getAttribute('cy') + (+end.getAttribute('cy') - +start.getAttribute('cy')) * position, 8);
      expect(env.lab.querySelector('[data-signal-map-packet] circle').getAttribute('fill')).toBe('none');
      expect(env.lab.querySelector('[data-signal-map-packet] path').getAttribute('d')).toMatch(y < 90 ? /^M0 17/ : /^M0 -17/);
      assertJourney(env, target, angle);
    });
    expect(env.lab.textContent).toContain('Orbits stay fixed during this preview');
    expect(env.lab.textContent).toContain('Numerical distance comes from the model, not screen length');
    if (angle === 180) expect(env.lab.textContent).toContain('Solar-conjunction caution');
  });

  it('provides exact milestones and changes only the viewing state while inspecting', () => {
    const saved = { target: 'Mars', angle: 0, oneWaySeconds: observation('Mars', 0).oneWaySeconds };
    const env = renderSignal({ signalPrediction: 'increase', signalEvidenceSaved: true, signalLastPing: saved,
      signalNotebooks: { Mars: { observations: [observation('Mars', 0)], explanation: EXPLANATION } },
      journalEntries: [{ planet: 'Mars', observation: 'Keep this evidence' }], researchPoints: 75 });
    const before = { ...env.state };
    for (const progress of [0, 50, 100]) {
      env.click(env.lab.querySelector(`[data-signal-milestone="${progress}"]`));
      expect(env.state.signalJourneyInspection).toEqual({ target: 'Mars', angle: 0, progress });
      const pressed = [...env.lab.querySelectorAll('[data-signal-milestone][aria-pressed="true"]')];
      expect(pressed.map(n => Number(n.dataset.signalMilestone))).toEqual([progress]);
      expect(env.save.disabled).toBe(true);
      for (const key of Object.keys(before)) expect(env.state[key]).toBe(before[key]);
    }
    env.inspect(25);
    expect(env.lab.querySelectorAll('[data-signal-milestone][aria-pressed="true"]')).toHaveLength(0);
  });

  it('resets inspection on setup changes and ping replay while keeping historical receipts anchored', () => {
    const env = renderSignal(); env.click(env.button('Send a light-speed ping')); env.inspect(75);
    expect(env.lab.querySelector('.solar-signal-pulse').style.visibility).toBe('hidden');
    env.setAngle('90');
    expect(env.state.signalJourneyInspection).toBeNull(); expect(env.timeReading.dataset.phase).toBe('uninspected');
    expect(env.receipt.textContent).toContain('At 0°');
    expect(env.lab.querySelector('.solar-signal-pulse').style.visibility).toBe('hidden');
    env.inspect(75); env.click(env.button('Send a light-speed ping'));
    expect(env.state.signalJourneyInspection).toBeNull(); expect(env.timeReading.dataset.phase).toBe('uninspected');
    expect(env.receipt.textContent).toContain('At 90°'); expect(env.lab.querySelector('.solar-signal-pulse')).not.toBeNull();
    env.inspect(50); env.target('Mercury');
    expect(env.state.signalJourneyInspection).toBeNull(); expect(env.timeReading.dataset.phase).toBe('uninspected');
    expect(env.lab.querySelector('[data-signal-map-packet]')).toBeNull(); expect(env.receipt).toBeUndefined();
  });

  it('projects malformed and stale restored inspection read-only without attaching a misleading cursor', () => {
    const valid = { target: 'Mars', angle: 0, progress: 75 };
    for (const raw of [null, [], 'inspection', Object.create(valid), { ...valid, target: 'Jupiter' },
      { ...valid, angle: 90 }, { ...valid, angle: '0' }, ...['75', null, [], {}, NaN, Infinity].map(progress => ({ ...valid, progress }))]) {
      const env = renderSignal({ signalJourneyInspection: raw });
      expect(env.state.signalJourneyInspection).toBe(raw);
      expect(env.timeReading.dataset.phase).toBe('uninspected'); expect(env.timeSlider.value).toBe('0');
      expect(env.lab.querySelector('[data-signal-time-cursor]')).toBeNull();
      expect(env.lab.querySelector('[data-signal-map-packet]')).toBeNull();
      expect(env.lab.textContent).not.toMatch(/NaN|undefined|\[object Object\]/);
    }
    for (const [raw, bounded] of [[-20, 0], [160, 100], [12.5, 13]]) {
      const record = { ...valid, progress: raw }, env = renderSignal({ signalJourneyInspection: record });
      expect(env.timeSlider.value).toBe(String(bounded));
      expect(env.state.signalJourneyInspection).toBe(record);
      expect(Number(env.timeReading.dataset.elapsedSeconds)).toBeCloseTo(observation('Mars', 0).oneWaySeconds * 2 * bounded / 100, 8);
    }
  });
});
