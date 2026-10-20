// SkySchool engagement: a Start-here path, tutorials that survive challenges,
// lessons that lead to practice, celebrated wins with XP, personal bests and a
// debrief that leads with what happened.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// Each test mounts the full menu or flight deck; leave headroom on a busy machine.
vi.setConfig({ testTimeout: 20000 });
let FS, tool, host, root, latest, setData, frameCallback, wallTime, toasts, xp;
const hooks = () => window.__testHooks.flightSim;

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  }, {
    get(target, property) { return property in target ? target[property] : () => {}; },
    set(target, property, value) { target[property] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  wallTime = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  toasts = []; xp = [];
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null; frameCallback = null;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

async function mount(initial = {}) {
  function App() {
    const [data, update] = React.useState({ flightSim: { view: 'menu', railCollapsed: true, ...initial } });
    latest = data.flightSim; setData = update;
    return tool.render(makeCtx({ toolData: data, setToolData: update,
      addToast: (message, type) => toasts.push({ message: String(message), type }),
      awardXP: (id, points, reason, done) => { xp.push({ id, points, reason }); if (done) done(points); },
      update: (id, key, value) => update(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => update(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
const startHere = () => host.querySelector('[data-flight-start-here]');
const buttonText = text => [...host.querySelectorAll('button')].find(b => b.textContent.includes(text));

describe('Start here path', () => {
  it('walks a new student through five first steps, one launcher at a time', async () => {
    await mount();
    const card = startHere();
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('0 of 5 done');
    const steps = [...card.querySelectorAll('[data-flight-start-step]')];
    expect(steps.map(s => s.getAttribute('data-flight-start-step'))).toEqual(['lesson', 'first_climb', 'first_flight', 'landing', 'mission']);
    expect(card.querySelectorAll('button')).toHaveLength(1);
    await act(async () => card.querySelector('button').click());
    expect(latest.view).toBe('lesson');
    expect(latest.selectedLesson).toBe('lift');
  });

  it('marks finished steps, offers the next one, and disappears when all five are done', async () => {
    await mount({ completedLessons: { lift: true }, challengeCompleted: { first_flight: '2026-10-17T00:00:00Z' } });
    expect(startHere().textContent).toContain('3 of 5 done');
    const landing = startHere().querySelector('[data-flight-start-step="landing"]');
    expect(landing.getAttribute('data-done')).toBe('false');
    expect(landing.querySelector('button').textContent).toContain('Take off from Portland');
    expect(startHere().querySelector('[data-flight-start-step="first_flight"]').getAttribute('data-done')).toBe('true');
    await act(async () => setData(old => ({ ...old, flightSim: { ...old.flightSim, firstRunwayLanding: 'x', rescuesCompleted: 1 } })));
    expect(startHere()).toBeNull();
  });

  it('offers First Climb as the first launcher after the lesson, and a passed First Flight also counts it done', async () => {
    await mount({ completedLessons: { lift: true } });
    const climb = startHere().querySelector('[data-flight-start-step="first_climb"]');
    expect(climb.getAttribute('data-done')).toBe('false');
    expect(climb.querySelector('button').textContent).toContain('Start First Climb');
    expect(climb.textContent).toContain('Take off and climb to 1,000 ft');
    await act(async () => climb.querySelector('button').click());
    expect(latest.selectedChallenge).toBe('first_climb');
  });

  it('counts the optional First Climb step done once First Flight is passed', async () => {
    await mount({ completedLessons: { lift: true }, challengeResults: { first_flight: { id: 'first_flight', status: 'complete' } } });
    expect(startHere().querySelector('[data-flight-start-step="first_climb"]').getAttribute('data-done')).toBe('true');
    expect(startHere().querySelector('[data-flight-start-step="first_flight"]').getAttribute('data-done')).toBe('true');
  });

  it('keeps First Flight done after a later failed attempt', async () => {
    await mount({ challengeCompleted: { first_flight: 'x' }, challengeResults: { first_flight: { id: 'first_flight', status: 'active' } } });
    expect(startHere().querySelector('[data-flight-start-step="first_flight"]').getAttribute('data-done')).toBe('true');
  });
});

describe('tutorials and challenges', () => {
  it('a challenge hides the beginner cards for that flight without switching them off for good', async () => {
    const tutorial = FS.getFlightTutorialKind;
    expect(typeof tutorial).toBe('function');
    const ground = { onGround: true, altitude: 76, fieldElev: 76, vsi: 0 };
    expect(tutorial(ground, { railCollapsed: true }, {}, null)).toBe('takeoff');
    expect(tutorial(ground, { railCollapsed: true, flightChallenge: { id: 'first_flight' } }, {}, null)).toBe(null);
    expect(tutorial(ground, { railCollapsed: true, selectedChallenge: 'stall_investigation' }, {}, null)).toBe(null);
    await mount({ menuSections: { challenges: true } });
    await act(async () => host.querySelector('[data-flight-challenge-id="first_flight"]').click());
    const briefing = buttonText('I Understand');
    if (briefing) await act(async () => briefing.click());
    expect(latest.view).toBe('flying');
    expect(latest.flightChallenge && latest.flightChallenge.id).toBe('first_flight');
    expect(latest.takeoffTutorialDismissed).not.toBe(true);
    expect(latest.landingTutorialDismissed).not.toBe(true);
  });
});

describe('lessons lead to practice', () => {
  it('offers the challenges that practise a lesson, and starts one', async () => {
    await mount({ view: 'lesson', selectedLesson: 'lift' });
    const practice = host.querySelector('[data-flight-lesson-practice="lift"]');
    expect(practice).toBeTruthy();
    expect(practice.textContent).toContain('Fly it: ');
    expect(practice.querySelectorAll('button').length).toBeGreaterThanOrEqual(2);
    await act(async () => practice.querySelector('button').click());
    expect(latest.view).toBe('flying');
    expect(latest.flightChallenge).toBeTruthy();
  });

  it('shows nothing when no challenge practises the lesson', async () => {
    await mount({ view: 'lesson', selectedLesson: 'drag' });
    expect(host.querySelector('[data-flight-lesson-practice]')).toBeNull();
  });
});

describe('personal bests and debrief', () => {
  it('shows each challenge and rescue best on its card', async () => {
    await mount({ menuSections: { challenges: true }, personalBests: { challenges: { first_flight: 125 }, rescueSeconds: 61 } });
    expect(host.querySelector('[data-flight-personal-best="first_flight"]').textContent).toContain('2:05');
    expect(host.querySelector('[data-flight-personal-best="coastal_rescue"]').textContent).toContain('1:01');
    expect(host.querySelector('[data-flight-personal-best="cross_country"]')).toBeNull();
  });

  it('leads the debrief with the result and offers the same challenge again', async () => {
    await mount({ view: 'debrief', lastDebrief: { flightTime: 300, distance: 12, maxAlt: 3100, newBest: 'challenge',
      challenge: { id: 'first_flight', status: 'complete', objectives: {} } } });
    const headline = host.querySelector('[data-flight-debrief-headline]');
    expect(headline.textContent).toBe('Challenge complete: 🎓 First Flight. New personal best!'.replace('🎓 First Flight', FS.CHALLENGES.find(c => c.id === 'first_flight').name));
    const retry = buttonText('Try the challenge again');
    expect(retry).toBeTruthy();
    await act(async () => retry.click());
    expect(latest.view).toBe('flying');
    expect(latest.flightChallenge && latest.flightChallenge.id).toBe('first_flight');
  });

  it('names the airport for a landing and summarises a flight without one', async () => {
    const kpwm = FS.WAYPOINTS.find(w => w.id === 'kpwm');
    await mount({ view: 'debrief', lastDebrief: { flightTime: 400, distance: 30, maxAlt: 4500, bestLanding: 140, touchdownAirportId: 'kpwm', newLandingBest: true } });
    expect(host.querySelector('[data-flight-debrief-headline]').textContent)
      .toBe('You landed at ' + kpwm.name + ' with a 140 fpm touchdown. Your softest landing yet!');
    expect(buttonText('Try the challenge again')).toBeFalsy();
    await act(async () => setData(old => ({ ...old, flightSim: { ...old.flightSim, lastDebrief: { flightTime: 200, distance: 18, maxAlt: 2500 } } })));
    expect(host.querySelector('[data-flight-debrief-headline]').textContent).toBe('You flew 18 nm and climbed to 2,500 ft.');
  });
});

describe('celebrated wins', () => {
  it('announces a badge to every student with a toast and practice XP', async () => {
    await mount({ thirdPerson: false, takeoffTutorialDismissed: true, landingTutorialDismissed: true });
    await act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
    expect(frameCallback).toBeTypeOf('function');
    vi.spyOn(FS.Physics, 'step').mockImplementation(state => ({ ...state, onGround: false, altitude: 5600, vsi: 0, speed: 180,
      forces: { lift: 2550, drag: 200, thrust: 200, weight: 2550, normal: 2550 } }));
    Object.assign(hooks().flightRef.current, { onGround: false, altitude: 5600, fieldElev: 76, speed: 180, vsi: 0 });
    Object.assign(hooks().controlsRef.current, { throttle: 0.7, pitch: 0, bank: 0 });
    // The loop advances at most 0.1 s per frame; the badge needs 10 s airborne.
    for (let frame = 0; frame < 220 && !(latest.earnedBadges && latest.earnedBadges.mile_high); frame++) {
      wallTime += 100;
      await act(async () => frameCallback());
    }
    expect(latest.earnedBadges && latest.earnedBadges.mile_high).toBe(true);
    const badgeToast = toasts.find(t => t.message.includes('Badge earned: One Mile Up'));
    expect(badgeToast && badgeToast.type).toBe('success');
    expect(xp.some(award => award.id === 'flightSim' && award.points === 10 && award.reason.includes('One Mile Up'))).toBe(true);
  }, 30000);
});

describe('free-flight discoveries', () => {
  it('points from Portland to the nearest place still to discover, then the next', () => {
    const at = { lat: 43.646, lon: -70.309 };
    const first = FS.getNextFlightDiscovery(at, { Portland: true });
    expect(first.place.name).toBe('Sebago Lake');
    expect(first.distanceNm).toBeGreaterThan(15); // beyond the discovery radius: a goal, not a freebie
    expect(first.distanceNm).toBeLessThan(20);
    expect(first.bearingDeg).toBeGreaterThan(310);
    expect(first.bearingDeg).toBeLessThan(322);
    const second = FS.getNextFlightDiscovery(at, { Portland: true, 'Sebago Lake': true });
    expect(second.place.name).toBe('Pemaquid Point Light');
  });

  it('offers nothing over open ocean far from every place', () => {
    expect(FS.getNextFlightDiscovery({ lat: -45, lon: -130 }, {})).toBeNull();
  });
});

describe('personal best rules', () => {
  it('keeps the fastest challenge, the fastest rescue and the softest landing, and flags only beaten records', () => {
    const record = FS.recordFlightPersonalBests;
    const first = record({}, { challengeId: 'first_flight', challengeSeconds: 300.4 });
    expect(first.bests.challenges.first_flight).toBe(300);
    expect(first.improved.challenge).toBeUndefined(); // a first record is not a "new best"
    const slower = record(first.bests, { challengeId: 'first_flight', challengeSeconds: 420 });
    expect(slower.bests.challenges.first_flight).toBe(300);
    expect(slower.improved.challenge).toBeUndefined();
    const faster = record(slower.bests, { challengeId: 'first_flight', challengeSeconds: 250 });
    expect(faster.bests.challenges.first_flight).toBe(250);
    expect(faster.improved.challenge).toBe(true);
    const landing = record(faster.bests, { landingFpm: 180 });
    const harder = record(landing.bests, { landingFpm: 400 });
    expect(harder.bests.landingFpm).toBe(180);
    const softer = record(harder.bests, { landingFpm: 95 });
    expect(softer.bests.landingFpm).toBe(95);
    expect(softer.improved.landing).toBe(true);
    const rescue = record(softer.bests, { rescueSeconds: 140 });
    expect(record(rescue.bests, { rescueSeconds: 200 }).bests.rescueSeconds).toBe(140);
    expect(record(rescue.bests, { rescueSeconds: 120 }).improved.rescue).toBe(true);
    expect(rescue.bests.challenges.first_flight).toBe(250);
  });
});

describe('weather lesson', () => {
  it('is the seventh lesson, reachable from the lesson list, with its own text and a way on', async () => {
    const ids = [...Object.keys(FS.LESSONS)];
    expect(ids).toEqual(['lift', 'drag', 'thrust', 'weight', 'bernoulli', 'navigation', 'weather']);
    await mount({ view: 'lesson', selectedLesson: 'weather' });
    const lesson = host.querySelector('[data-flightsim-lesson]');
    expect(lesson.textContent).toContain('Wind, Density and Weather');
    expect(lesson.textContent).toContain('Lesson 7 / 7');
    expect(lesson.textContent).toContain('Headwind = wind speed × cos(θ)');
    expect(lesson.textContent).toContain('density altitude');
    // Last lesson: the way on is back to the menu, and the one before it is linked.
    expect(lesson.textContent).toContain('Back to menu');
    expect(lesson.textContent).toContain(FS.LESSONS.navigation.title);
    const button = [...lesson.querySelectorAll('button')].find(b => b.textContent.includes('Mark lesson complete'));
    await act(async () => button.click());
    expect(latest.completedLessons.weather).toBe(true);
  });

  it('states the same headwind rule the cockpit computes, with the same sign convention', () => {
    const aircraft = FS.AIRCRAFT.find(item => item.id === 'cessna172');
    FS.Physics.configureAircraft(aircraft);
    const base = { altitude: 4000, fieldElev: 76, speed: 100 / 0.5924838, vsi: 0, heading: 90, bank: 0, onGround: false, lat: 43.6, lon: -70.3, stalling: false, lowAirspeed: false };
    const controls = { throttle: 0.6, bank: 0, pitch: 0 };
    const lesson = FS.LESSONS.weather;
    expect(lesson.formula).toBe('Headwind = wind speed × cos(θ)');
    expect(lesson.variables).toContain('direction the wind blows FROM');
    // Wind FROM the nose is all headwind; from behind is a tailwind (negative);
    // from the side is all crosswind; in between follows the cosine.
    for (const [fromOffset, wind] of [[0, 20], [180, 20], [90, 20], [60, 30], [-45, 12]]) {
      const weather = { type: 'clear', wind, windDir: (base.heading + fromOffset + 360) % 360, visibility: 1, turbulence: 0 };
      const telemetry = FS.computeFlightTelemetry(base, controls, weather, 0, 0, null, null, aircraft);
      expect(telemetry.headwindKts).toBeCloseTo(wind * Math.cos(fromOffset * Math.PI / 180), 9);
    }
  });
});
