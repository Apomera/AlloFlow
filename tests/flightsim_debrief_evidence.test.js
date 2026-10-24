import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let FS, tool, root, host, latest, frameCallback;
const row = (i = 0) => ({ t: i * 2, lat: 43.646, lon: -70.309, alt: 5000 + i * 100, spd: 110 - i, hdg: 90,
  agl: 4924 + i * 100, fpm: 200, aoa: 8 + i / 10, pitch: -3 + i / 10, bank: 0, throttle: 0.6, onGround: false, stalling: false, lowAirspeed: false });
const flight = patch => ({ aircraftId: 'cessna172', aircraft: 'Cessna 172 Skyhawk', airborneSeconds: 30,
  flightTime: 30, peakAGL: 1000, bestStableSeconds: 15, landings: 1, bestLanding: 180,
  stallSeconds: 0, samples: Array.from({ length: 12 }, (_, i) => row(i)), ...patch });
function completedChallenge(id) {
  const challenge = FS.createFlightChallenge(id, {});
  challenge.elapsedSeconds = 30;
  challenge.airborneSeconds = 30;
  challenge.status = 'complete';
  Object.keys(challenge.objectives).forEach(key => { challenge.objectives[key] = true; });
  if (id === 'world_tour') {
    challenge.arrivals = FS.WAYPOINTS.slice(0, 5).map(airport => airport.id);
    challenge.tourElapsedSeconds = 150;
  }
  return challenge;
}

async function mount(data = {}) {
  if (root) await act(async () => root.unmount());
  host?.remove();
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [state, update] = React.useState({ flightSim: { view: 'debrief', lastDebrief: flight(), ...data } });
    latest = state.flightSim;
    return tool.render(makeCtx({ toolData: state, setToolData: update,
      update: (id, key, value) => update(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => update(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function click(text) {
  const button = [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text);
  expect(button, text).toBeTruthy();
  await act(async () => button.click());
}
async function change(element, value) {
  const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const explorer = () => host.querySelector('[aria-label="Flight evidence explorer"]');

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); FS = window.__RR_TEST_EXPORTS__.flightSim;
  const canvasContext = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (object, key) => key in object ? object[key] : () => {}, set: (object, key, value) => { object[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext);
  frameCallback = null;
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
    if (callback.name === 'loop') frameCallback = callback;
    return 1;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('SkySchool flight evidence measurements', () => {
  it('records actual controls, AoA, vertical speed, and height without fabricating missing rotor data', () => {
    const sample = FS.flightEvidenceSample({ altitude: 1000, fieldElev: 76, speed: 100, heading: 90, lat: 43, lon: -70,
      vsi: -5, aoa: 15.26, pitch: 12, onGround: false, stalling: true, lowAirspeed: false }, { pitch: -4.36, bank: 3.2, throttle: 0.734 }, 12.35);
    expect(sample).toMatchObject({ t: 12.4, alt: 1000, agl: 924, spd: 59, fpm: -300, aoa: 15.26, pitch: -4.4, bank: 3.2, throttle: 0.73, stalling: true });
    expect(FS.flightEvidenceSample({ altitude: 100, speed: 0, heading: 0, lat: 43, lon: -70 }, {}, 1)).toMatchObject({ agl: null, aoa: null, pitch: null, bank: null, throttle: null, fpm: null });
  });
  it.each(['isHelicopter', 'isDrone'])('does not record the %s physics AoA placeholder as a measurement', capability => {
    const state = { altitude: 200, fieldElev: 76, speed: 40, heading: 90, lat: 43, lon: -70,
      vsi: 0, aoa: 0, onGround: false, stalling: false };
    const sample = FS.flightEvidenceSample(state, { throttle: 0.5, bank: 0 }, 2, { [capability]: true });
    expect(sample.aoa).toBeNull();
    expect(sample).toMatchObject({ alt: 200, agl: 124, fpm: 0, onGround: false, stalling: false });
    expect(FS.flightEvidenceSample(state, {}, 2, { isHelicopter: false, isDrone: false }).aoa).toBe(0);
  });
  it('preserves unrecorded advisory and contact flags as unknown instead of false', () => {
    const state = { altitude: 1000, speed: 100, heading: 0, lat: 43, lon: -70 };
    expect(FS.flightEvidenceSample(state, {}, 1)).toMatchObject({ onGround: null, stalling: null, lowAirspeed: null });
    expect(FS.flightEvidenceSample({ ...state, onGround: false, stalling: false, lowAirspeed: false }, {}, 1))
      .toMatchObject({ onGround: false, stalling: false, lowAirspeed: false });
  });
  it('rejects nonfinite observations and bounds, sorts, and deduplicates saved history without modifying it', () => {
    const saved = [row(2), row(0), row(1), row(1), { ...row(3), lat: NaN }, { ...row(4), spd: -1 }];
    const result = FS.normalizeFlightEvidence(saved);
    expect(result.map(value => value.t)).toEqual([0, 2, 4]);
    expect(saved[0].t).toBe(4);
    expect(FS.normalizeFlightEvidence(Array.from({ length: 550 }, (_, i) => ({ ...row(), t: i * 2 })))).toHaveLength(500);
    expect(FS.flightEvidenceSample({ altitude: NaN }, {}, 0)).toBeNull();
  });
  it('keeps old measurements but leaves unrecorded telemetry and advisory flags unknown', () => {
    const legacy = { t: 2, lat: 43, lon: -70, alt: 1000, spd: 100, hdg: -10 };
    expect(FS.normalizeFlightEvidence([legacy])[0]).toMatchObject({ hdg: 350, alt: 1000, aoa: null, pitch: null, fpm: null, onGround: null, stalling: null, lowAirspeed: null });
  });
  it('keeps finite pitch inputs in angular bounds and leaves invalid saved input unknown', () => {
    const values = [-180, 0, 180, -181, 181, NaN, Infinity, '0', null];
    expect(FS.normalizeFlightEvidence(values.map((pitch, i) => ({ ...row(i), pitch }))).map(sample => sample.pitch))
      .toEqual([-180, 0, 180, null, null, null, null, null, null]);
  });
  it('exports enriched observations and leaves older optional columns blank', () => {
    const csv = FS.flightEvidenceCsv([row(0)]).split('\n').map(value => value.split(','));
    expect(csv[0]).toHaveLength(15);
    expect(csv[0][14]).toBe('PitchInput(deg)');
    expect(csv[1].slice(6, 14)).toEqual(['4924', '200', '8', '0', '0.6', 'false', 'false', 'false']);
    expect(csv[1][14]).toBe('-3');
    const legacy = FS.flightEvidenceCsv([{ t: 0, lat: 43, lon: -70, alt: 1000, spd: 100, hdg: 90 }]).split('\n')[1].split(',');
    expect(legacy.slice(6)).toEqual(Array(9).fill(''));
  });
  it('counts advisory exposure only during measured airborne time and caps suspended-frame credit', () => {
    let log = {};
    const state = { altitude: 1000, fieldElev: 0, onGround: false, vsi: 0, stalling: true, lowAirspeed: true };
    log = FS.updateFlightPractice(log, state, {}, 100);
    expect(log).toMatchObject({ airborneSeconds: 1, stallSeconds: 1, lowAirspeedSeconds: 1, bestStableSeconds: 0 });
    FS.updateFlightPractice(log, { ...state, onGround: true }, {}, 1);
    FS.updateFlightPractice(log, state, {}, 0);
    expect(log.stallSeconds).toBe(1);
  });
});

describe('SkySchool evidence-based coaching priorities', () => {
  it('prioritizes an observed stall over smooth landings, discoveries, and unfinished goals', () => {
    expect(FS.flightCoachingPlan(flight({ stallSeconds: 2, discovered: 99 }))).toMatchObject({ reason: 'stall', activity: 'stallHunt' });
  });
  it('prioritizes a hard touchdown over geography exploration', () => {
    expect(FS.flightCoachingPlan(flight({ bestLanding: 700, discovered: 0 }))).toMatchObject({ reason: 'landing', challenge: 'world_tour' });
  });
  it('uses takeoff practice for ground-only sessions and honest investigation guidance for older logs', () => {
    expect(FS.flightCoachingPlan(flight({ airborneSeconds: 0 }))).toMatchObject({ reason: 'takeoff', challenge: 'first_flight' });
    expect(FS.flightCoachingPlan({ flightTime: 300 })).toMatchObject({ reason: 'legacy', activity: 'stallHunt' });
  });
  it('recommends an unfinished challenge before a generic exercise', () => {
    const challenge = FS.createFlightChallenge('cross_country', {});
    expect(FS.flightCoachingPlan(flight({ challenge }))).toMatchObject({ reason: 'challenge', challenge: 'cross_country', lesson: 'navigation' });
  });
  it('moves from steady-flight practice to approach practice to an energy investigation as evidence accumulates', () => {
    expect(FS.flightCoachingPlan(flight({ bestStableSeconds: 0 })).reason).toBe('steady');
    expect(FS.flightCoachingPlan(flight({ landings: 0, bestLanding: null })).reason).toBe('approach');
    expect(FS.flightCoachingPlan(flight()).reason).toBe('energy');
  });
  it.each(['first_flight', 'mountain_flying', 'cross_country', 'world_tour'])('moves completed %s forward without changing its generic milestone evidence', id => {
    const record = flight({ challenge: completedChallenge(id), bestStableSeconds: 0 });
    expect(FS.flightCoachingPlan(record)).toEqual({ reason: 'challenge_complete', challenge: 'energy_management', lesson: 'weight' });
    expect(FS.flightPracticeEvidence(record).steady).toBe(false);
    expect(record.bestStableSeconds).toBe(0);
  });
  it.each([0, 15])('transfers completed energy practice to an approach with %s seconds of generic steady flight', bestStableSeconds => {
    const record = flight({ challenge: completedChallenge('energy_management'), bestStableSeconds, landings: 0, bestLanding: null });
    expect(FS.flightCoachingPlan(record)).toEqual({ reason: 'energy_complete', challenge: 'world_tour', lesson: 'weight' });
    expect(FS.flightPracticeEvidence(record).landing).toBe(false);
  });
  it('uses saved completed objectives when generic measurements are missing, without inventing them', () => {
    const record = { challenge: completedChallenge('world_tour') };
    expect(FS.flightCoachingPlan(record).reason).toBe('challenge_complete');
    expect(FS.flightPracticeEvidence(record)).toMatchObject({ steady: false, landing: false, airborne: false });
    expect(record.airborneSeconds).toBeUndefined();
  });
  it.each(['energy_management', 'world_tour'])('keeps actual stall and hard-touchdown priorities after completed %s', id => {
    const challenge = completedChallenge(id);
    expect(FS.flightCoachingPlan(flight({ challenge, stallSeconds: 2, bestLanding: 700 })))
      .toMatchObject({ reason: 'stall', activity: 'stallHunt' });
    expect(FS.flightCoachingPlan(flight({ challenge, bestLanding: 700 })))
      .toMatchObject({ reason: 'landing', challenge: 'world_tour' });
  });
  it('does not treat a saved complete status as completed objective evidence', () => {
    const challenge = { ...FS.createFlightChallenge('energy_management', {}), status: 'complete' };
    expect(FS.flightCoachingPlan(flight({ challenge, bestStableSeconds: 0 })))
      .toMatchObject({ reason: 'challenge', challenge: 'energy_management' });
  });
});

describe('SkySchool debrief evidence explorer', () => {
  it('shows measured pitch input separately from angle of attack in current and earlier observations', async () => {
    await mount({ flightPracticeHistory: [flight({ samples: [row(0)] })] });
    const pitchLabel = [...explorer().querySelectorAll('dt')].find(label => label.textContent === 'Pitch input');
    expect(pitchLabel.parentElement.querySelector('dd').textContent).toBe('-3°');
    expect(explorer().querySelector('table thead').textContent).toContain('Pitch input');
    expect(explorer().querySelector('table tbody tr').lastElementChild.textContent).toBe('-3°');
    const earlier = host.querySelector('table[aria-label="Earlier recorded observations"]');
    expect(earlier.querySelector('thead').textContent).toContain('Pitch input');
    expect(earlier.querySelector('tbody tr').lastElementChild.textContent).toBe('-3°');
  });
  it('offers keyboard focus on current and earlier horizontal observation tables', async () => {
    await mount({ flightPracticeHistory: [flight({ samples: [row(0)] })] });
    for (const name of ['Current flight observations', 'Earlier flight observations']) {
      const scrollRegion = host.querySelector('[role="region"][aria-label="' + name + '"]');
      expect(scrollRegion.tabIndex).toBe(0);
      expect(scrollRegion.style.overflowX).toBe('auto');
      await act(async () => {
        scrollRegion.closest('details').querySelector('summary').click();
        scrollRegion.focus();
      });
      expect(document.activeElement).toBe(scrollRegion);
    }
    expect([...host.querySelectorAll('style')].map(style => style.textContent).join('\n')).toContain('.skyschool-evidence-scroll:focus-visible');
  });
  it('inspects exact observations, compares moments, and pages the accessible table', async () => {
    await mount();
    expect(explorer().querySelectorAll('table tbody tr')).toHaveLength(10);
    expect(explorer().textContent).toContain('Observation 1 of 12 · 0:00.0');
    await click('Next observation');
    expect(explorer().textContent).toContain('Observation 2 of 12 · 0:02.0');
    await click('Use this moment for comparison');
    await change(host.querySelector('#debrief-observation-time'), 11);
    expect(latest.debriefSampleIndex).toBe(11);
    expect(explorer().querySelectorAll('table tbody tr')).toHaveLength(2);
    expect(explorer().querySelector('[data-evidence-comparison]').textContent).toContain('altitude +1,000 ft; true airspeed -10 kts; angle of attack +1°');
    expect(explorer().querySelector('svg').getAttribute('aria-describedby')).toBe('debrief-evidence-plot-description');
  });
  it('preserves selected moments and a written explanation across a full remount', async () => {
    await mount();
    await change(host.querySelector('#debrief-evidence-explanation'), 'At 2 seconds, more power preceded the altitude gain. I would repeat with idle power.');
    await change(host.querySelector('#debrief-observation-time'), 3);
    await click('Use this moment for comparison');
    const saved = JSON.parse(JSON.stringify(latest));
    await mount(saved);
    expect(host.querySelector('#debrief-evidence-explanation').value).toContain('more power preceded');
    expect(latest.debriefCompareIndex).toBe(3);
    expect(explorer().textContent).toContain('Observation 4 of 12');
  });
  it('renders partial legacy logs with unknown telemetry instead of zero measurements', async () => {
    await mount({ lastDebrief: { samples: [{ t: 0, lat: 43, lon: -70, alt: 1000, spd: 100, hdg: 0 }] } });
    expect(explorer().textContent).toContain('Not recorded');
    expect(host.querySelector('#debrief-observation-time').disabled).toBe(true);
    expect(explorer().querySelector('svg').outerHTML).not.toMatch(/NaN|Infinity/);
    expect(explorer().textContent).not.toContain('Airborne; no stall');
    const pitchLabel = [...explorer().querySelectorAll('dt')].find(label => label.textContent === 'Pitch input');
    expect(pitchLabel.parentElement.querySelector('dd').textContent).toBe('Not recorded');
    expect(explorer().querySelector('table tbody tr').lastElementChild.textContent).toBe('Not recorded');
  });
  it('shows an honest empty state for invalid history without exposing broken charts', async () => {
    await mount({ lastDebrief: flight({ samples: [{ t: 0, alt: NaN }] }) });
    expect(explorer().textContent).toContain('No recorded observations');
    expect(explorer().querySelector('svg')).toBeNull();
    expect(host.querySelectorAll('canvas')).toHaveLength(0);
  });
  it('carries rounded chart ticks into the next minute', async () => {
    await mount({ lastDebrief: flight({ samples: [row(0), { ...row(1), t: 179.9 }] }) });
    const plotText = explorer().querySelector('svg').textContent;
    expect(plotText).toContain('1:00.0');
    expect(plotText).not.toContain('0:60.0');
    expect(plotText).not.toContain('1:60.0');
  });
  it('describes an unavailable beginning without claiming a short log was truncated at 500 samples', async () => {
    await mount({ lastDebrief: flight({ samples: [{ ...row(0), t: 10 }, { ...row(1), t: 12 }] }) });
    expect(explorer().textContent).toContain('The earliest available observation is after departure. Earlier moments are not available in this log.');
    expect(explorer().textContent).not.toContain('This long flight');
    expect(explorer().textContent).not.toContain('most recent 500 observations');
  });
  it('opens the recommended investigation and its supporting lesson without losing the debrief', async () => {
    await mount({ lastDebrief: flight({ stallSeconds: 4 }) });
    expect(host.querySelector('aside').textContent).toContain('A stall was observed');
    await click('Review supporting lesson');
    expect(latest).toMatchObject({ view: 'lesson', selectedLesson: 'lift' });
    const saved = { ...latest, view: 'debrief' };
    await mount(saved);
    await click('Start recommended practice');
    expect(latest.view).toBe('stallHunt');
    expect(latest.lastDebrief.stallSeconds).toBe(4);
  });
  it('starts a fresh measured trainer challenge from a parked debrief', async () => {
    await mount({ lastDebrief: flight({ airborneSeconds: 0, samples: [] }) });
    await click('Start recommended practice');
    expect(latest).toMatchObject({ view: 'flying', aircraft: 'cessna172', selectedChallenge: 'first_flight' });
    expect(latest.flightChallenge.objectives).toEqual({ climb: false, steady: false, landing: false });
  });
  it.each([
    ['cross_country', 'energy_management', 'Challenge objectives were observed.'],
    ['world_tour', 'energy_management', 'Challenge objectives were observed.'],
    ['energy_management', 'world_tour', 'The energy-management objectives were observed.'],
  ])('recognizes completed %s and launches its next practice without claiming missing milestones', async (id, next, message) => {
    const challenge = completedChallenge(id);
    await mount({ lastDebrief: flight({ challenge, startedAirborne: true, bestStableSeconds: 0,
      ...(id === 'energy_management' ? { landings: 0, bestLanding: null } : {}) }) });
    const coaching = host.querySelector('[aria-label="Next flight coaching tip"]');
    expect(coaching.textContent).toContain(message);
    expect(coaching.textContent).not.toContain('A ten-second steady-flight hold was not observed');
    expect(coaching.textContent).not.toContain('The basic practice milestones were observed');
    expect(host.querySelector('[aria-label="Observed practice milestones"]').textContent).toContain('○ Steady flight:');
    expect(host.querySelector('[data-flight-debrief-headline]').textContent).toContain('Challenge complete:');
    await click('Start recommended practice');
    expect(latest).toMatchObject({ view: 'flying', selectedChallenge: next });
    expect(latest.flightChallenge).toMatchObject({ id: next, status: 'active' });
    expect(Object.values(latest.flightChallenge.objectives).every(value => value === false)).toBe(true);
    expect(latest.lastDebrief.challenge.status).toBe('complete');
  });
  it('seeds an airborne TAS maximum and records later TAS peaks instead of indicated airspeed', async () => {
    await mount();
    await click('Start recommended practice');
    const hooks = window.__testHooks.flightSim;
    expect(latest.selectedChallenge).toBe('energy_management');
    expect(hooks.getLogRef().current.maxSpeed).toBeCloseTo(hooks.flightRef.current.speed * 0.5924838, 6);
    Object.assign(hooks.flightRef.current, { altitude: 10000, speed: 200, vsi: 0, onGround: false });
    expect(frameCallback).toBeTypeOf('function');
    await act(async () => { frameCallback(); });
    const measuredTas = hooks.flightRef.current.speed * 0.5924838;
    const expectedTas = Math.round(measuredTas);
    expect(hooks.getLogRef().current.maxSpeed).toBeCloseTo(measuredTas, 6);
    const cockpit = host.querySelector('canvas[role="application"]');
    cockpit.focus();
    await act(async () => {
      cockpit.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      cockpit.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }));
      frameCallback();
    });
    expect(latest.view).toBe('debrief');
    expect(latest.lastDebrief.maxSpeed).toBe(expectedTas);
    expect(latest.lastDebrief.maxSpeed).toBeGreaterThanOrEqual(Math.max(...latest.lastDebrief.samples.map(sample => sample.spd)));
  });
});
