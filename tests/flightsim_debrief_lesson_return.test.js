import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host, latest, setSaved, writes, xp, errors;
const row = (index = 0) => ({ t: index * 2, lat: 43.646, lon: -70.309, alt: 5000 + index,
  spd: 110, hdg: 90, agl: 4924, fpm: 0, aoa: 8, pitch: -3, bank: 0, throttle: .6,
  onGround: false, stalling: false, lowAirspeed: false });
const flight = (patch = {}) => ({ attemptId: 'review-current', aircraftId: 'cessna172', activityId: 'free_flight',
  investigation: false, startedAirborne: false, endedAt: '2026-10-21T12:00:00.000Z',
  flightTime: 30, airborneSeconds: 30, bestStableSeconds: 15, stallSeconds: 4, landings: 0,
  reflection: 'I reduced pitch before adding power.', samples: [row(0), row(1), row(2)], ...patch });
const study = (kind = 'supporting') => host.querySelector('[data-flight-debrief-study="' + kind + '"]');
const back = () => host.querySelector('[data-flight-debrief-return]');
function handler(node, event = 'onClick') {
  expect(node).toBeTruthy(); return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][event];
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
const reviewState = () => JSON.parse(JSON.stringify({ lastDebrief: latest.lastDebrief,
  flightPracticeHistory: latest.flightPracticeHistory, challengeReflections: latest.challengeReflections,
  debriefHistoryIndex: latest.debriefHistoryIndex, debriefHistorySampleIndex: latest.debriefHistorySampleIndex,
  debriefSampleIndex: latest.debriefSampleIndex, debriefCompareIndex: latest.debriefCompareIndex,
  totalFlightTime: latest.totalFlightTime, quizScore: latest.quizScore, quizTotal: latest.quizTotal }));
async function mount(seed = {}, t) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, update] = React.useState({ flightSim: { view: 'debrief', lastDebrief: flight(),
      flightPracticeHistory: [flight({ attemptId: 'earlier-one' }), flight({ attemptId: 'earlier-two', reflection: 'Earlier explanation.' })],
      debriefHistoryIndex: 1, debriefHistorySampleIndex: 1, debriefSampleIndex: 2, debriefCompareIndex: 1,
      totalFlightTime: 500, quizScore: 7, quizTotal: 12, ...seed } });
    latest = data.flightSim;
    setSaved = patch => update(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: update, ...(t ? { t } : {}),
      awardXP: (...args) => xp.push(args),
      update: (id, key, value) => { writes.push({ [key]: value }); update(old => ({ ...old, [id]: { ...old[id], [key]: value } })); },
      updateMulti: (id, patch) => { writes.push(patch); update(old => ({ ...old, [id]: { ...old[id], ...patch } })); },
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
  { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  writes = []; xp = []; errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Sky School debrief supporting-lesson return', () => {
  it('validates only a bounded known-lesson and matching review identity without retaining evidence snapshots', () => {
    const live = { lastDebrief: flight() }, context = { version: 1, attemptId: 'review-current', lessonId: 'lift' };
    expect(api.flightDebriefLessonContext({ ...context, lastDebrief: flight(), reflection: 'Do not restore' }, live)).toEqual(context);
    for (const saved of [null, [], Object.create(context), { ...context, version: 2 },
      { ...context, attemptId: '' }, { ...context, attemptId: 'x'.repeat(81) }, { ...context, attemptId: '../review' },
      { ...context, attemptId: 'other-review' }, { ...context, lessonId: 'invented' }, { ...context, lessonId: '__proto__' }]) {
      expect(api.flightDebriefLessonContext(saved, live)).toBeNull();
    }
    expect(api.flightDebriefLessonContext(context, { lastDebrief: flight({ attemptId: null }) })).toBeNull();
    expect(live.lastDebrief.reflection).toBe('I reduced pitch before adding power.');
  });
  it('opens supporting material and returns to the exact saved review with its explanation and selected moments', async () => {
    await mount(); const original = reviewState();
    await click(study());
    expect(latest.view).toBe('lesson'); expect(latest.selectedLesson).toBe(api.flightCoachingPlan(original.lastDebrief).lesson);
    expect(latest.debriefLessonReturn).toEqual({ version: 1, attemptId: 'review-current', lessonId: latest.selectedLesson });
    expect(back().textContent).toBe('Back · FLIGHT DEBRIEF');
    expect(document.activeElement).toBe(host.querySelector('#skyschool-lesson-title')); expect(reviewState()).toEqual(original);
    await click(back());
    expect(latest.view).toBe('debrief'); expect(latest.debriefLessonReturn).toBeNull(); expect(reviewState()).toEqual(original);
    expect(host.querySelector('#debrief-evidence-explanation').value).toBe(original.lastDebrief.reflection);
    expect(host.querySelector('#debrief-observation-time').value).toBe('2');
    expect(host.querySelector('#debrief-earlier-flight').value).toBe('1');
    expect(host.querySelector('#debrief-earlier-time').value).toBe('1');
    expect(document.activeElement).toBe(host.querySelector('#skyschool-debrief-title')); expect(xp).toHaveLength(0);
  });
  it('uses the same return path for a debrief challenge’s related lesson', async () => {
    const challenge = api.createFlightChallenge('first_flight', {});
    await mount({ lastDebrief: flight({ challenge, activityId: challenge.id, reflection: 'My challenge decision.' }),
      challengeReflections: { first_flight: 'My challenge decision.' } });
    const original = reviewState(); await click(study('challenge'));
    expect(latest.view).toBe('lesson'); expect(back()).toBeTruthy();
    await click(back()); expect(reviewState()).toEqual(original);
    expect(host.querySelector('#challenge-reflection').value).toBe('My challenge decision.'); expect(xp).toHaveLength(0);
  });
  it('keeps a recovered mission review and its target observations intact through supporting study', async () => {
    const recovered = api.recoverFlightMissionCheckpoint({ version: 1, attemptId: 'mission-interrupted', recordedAt: '2026-10-21T12:00:00Z',
      mission: { missionId: 'drone_survey', mode: 'aerial', launchLat: 43.646, launchLon: -70.309,
        elapsedSeconds: 24, completed: false, returned: false, battery: 82, batteryExhausted: false,
        targets: [{ name: 'Photo site', lat: 43.65, lon: -70.30, captured: false }] } });
    await mount({ lastDebrief: { ...recovered, reflection: 'Use a slower approach to the next target.' } });
    const original = reviewState(); await click(study()); await click(back());
    expect(reviewState()).toEqual(original); expect(latest.lastDebrief.samples).toEqual([]);
    expect(host.querySelector('[data-flight-mission-summary="latest"]').textContent).toContain('Photo site');
    expect(host.querySelector('[data-mission-interrupted]')).toBeTruthy(); expect(xp).toHaveLength(0);
  });
  it('survives a serialized lesson reload and returns without replacing the saved review selections', async () => {
    await mount(); const original = reviewState(); await click(study());
    const saved = JSON.parse(JSON.stringify(latest)); await mount(saved);
    expect(back()).toBeTruthy(); expect(latest.debriefLessonReturn).toEqual(saved.debriefLessonReturn);
    await click(back()); expect(latest.view).toBe('debrief'); expect(reviewState()).toEqual(original);
    expect(document.activeElement).toBe(host.querySelector('#skyschool-debrief-title'));
  });
  it('allows browsing and completing lessons while keeping the same saved-review return', async () => {
    await mount(); const original = reviewState(); await click(study());
    const context = { ...latest.debriefLessonReturn };
    const other = [...host.querySelectorAll('nav[aria-label="Aerodynamics lessons"] button')].find(button => !button.hasAttribute('aria-current'));
    await click(other); expect(back()).toBeTruthy(); expect(latest.debriefLessonReturn).toEqual(context);
    const complete = [...host.querySelectorAll('button')].find(button => button.textContent.includes('Mark lesson complete'));
    await click(complete); expect(latest.completedLessons[latest.selectedLesson]).toBe(true);
    await click(back()); expect(reviewState()).toEqual(original); expect(xp).toHaveLength(0);
  });
  it('adds only a stable review identity for a deliberate lesson visit from a legacy debrief', async () => {
    const legacy = flight(); delete legacy.attemptId;
    await mount({ lastDebrief: legacy }); const original = reviewState();
    await click(study()); const identity = latest.lastDebrief.attemptId;
    expect(identity).toMatch(/^review_[A-Za-z0-9_-]+$/);
    expect(latest.lastDebrief).toEqual({ ...legacy, attemptId: identity });
    await click(back()); await click(study()); expect(latest.lastDebrief.attemptId).toBe(identity);
    await click(back());
    expect(reviewState()).toEqual({ ...original, lastDebrief: { ...legacy, attemptId: identity } }); expect(xp).toHaveLength(0);
  });
  it.each(['normal', 'challenge'])('keeps a final queued %s explanation when a legacy review opens study before React commits', async kind => {
    const legacy = flight(); delete legacy.attemptId;
    if (kind === 'challenge') { legacy.challenge = api.createFlightChallenge('first_flight', {}); legacy.activityId = legacy.challenge.id; }
    await mount({ lastDebrief: legacy });
    const input = host.querySelector(kind === 'challenge' ? '#challenge-reflection' : '#debrief-evidence-explanation');
    const change = handler(input, 'onChange'), launch = handler(study(kind === 'challenge' ? 'challenge' : 'supporting'));
    await act(async () => { change({ target: { value: 'My final explanation before supporting study.' } }); launch(); });
    expect(latest.view).toBe('lesson'); expect(latest.lastDebrief.reflection).toBe('My final explanation before supporting study.');
    expect(latest.lastDebrief.attemptId).toMatch(/^review_/);
    if (kind === 'challenge') expect(latest.challengeReflections.first_flight).toBe('My final explanation before supporting study.');
    await click(back()); expect(latest.lastDebrief.reflection).toBe('My final explanation before supporting study.'); expect(xp).toHaveLength(0);
  });
  it('retires the context on Menu exit and prevents a queued return from overriding that exit', async () => {
    await mount(); const original = reviewState(); await click(study()); const queuedReturn = handler(back());
    await act(async () => { host.querySelector('[data-flight-lesson-menu]').click(); queuedReturn(); });
    expect(latest.view).toBe('menu'); expect(latest.debriefLessonReturn).toBeNull(); expect(reviewState()).toEqual(original);
    await act(async () => setSaved({ view: 'lesson', selectedLesson: 'lift' }));
    expect(back()).toBeNull(); expect(reviewState()).toEqual(original);
  });
  it('retires an unrelated saved context on generic lesson entry via Menu', async () => {
    await mount({ view: 'menu', debriefLessonReturn: { version: 1, attemptId: 'review-current', lessonId: 'stall' } });
    expect(latest.debriefLessonReturn).toBeNull();
    await act(async () => setSaved({ view: 'lesson', selectedLesson: 'lift' })); expect(back()).toBeNull();
  });
  it('retires a changed latest review and never restores an old explanation or history over it', async () => {
    await mount(); await click(study()); const queuedReturn = handler(back()), history = latest.flightPracticeHistory;
    const replacement = flight({ attemptId: 'replacement-review', reflection: 'New review explanation.' });
    await act(async () => setSaved({ lastDebrief: replacement }));
    expect(back()).toBeNull(); expect(latest.debriefLessonReturn).toBeNull();
    await act(async () => queuedReturn());
    expect(latest.view).toBe('lesson'); expect(latest.lastDebrief).toEqual(replacement);
    expect(latest.flightPracticeHistory).toEqual(history); expect(xp).toHaveLength(0);
  });
  it('uses current explanation and selection edits for the same review instead of a stored snapshot', async () => {
    await mount(); await click(study());
    const current = { ...latest.lastDebrief, reflection: 'Updated while studying.' };
    await act(async () => setSaved({ lastDebrief: current, debriefSampleIndex: 1, debriefCompareIndex: 0, debriefHistoryIndex: 0 }));
    expect(back()).toBeTruthy(); await click(back());
    expect(latest.lastDebrief).toEqual(current); expect(latest.debriefSampleIndex).toBe(1);
    expect(latest.debriefCompareIndex).toBe(0); expect(latest.debriefHistoryIndex).toBe(0);
  });
  it('does not let an old lesson-return callback take over a newly launched flight', async () => {
    await mount(); const original = reviewState(); await click(study()); const queuedReturn = handler(back());
    const launch = [...host.querySelectorAll('button')].find(button => button.textContent.includes('Try It — Free Flight'));
    await act(async () => { launch.click(); queuedReturn(); });
    expect(latest.view).toBe('flying'); expect(latest.debriefLessonReturn).toBeNull();
    expect(reviewState()).toEqual(original); expect(xp).toHaveLength(0);
  });
  it('rejects a queued old supporting-study callback after another debrief replaces its origin', async () => {
    await mount(); const queuedStudy = handler(study());
    const replacement = flight({ attemptId: 'replacement-review', reflection: 'New review explanation.' });
    await act(async () => setSaved({ lastDebrief: replacement })); await act(async () => queuedStudy());
    expect(latest.view).toBe('debrief'); expect(latest.lastDebrief).toEqual(replacement);
    expect(latest.debriefLessonReturn).toBeUndefined();
  });
  it('reuses localized navigation labels with a stable saved identity', async () => {
    await mount({}, (key, fallback) => ({ 'common.back': 'Retour', 'stem.flightsim.flight_debrief': 'COMPTE RENDU' })[key] || fallback);
    await click(study()); expect(back().textContent).toBe('Retour · COMPTE RENDU');
    expect(latest.debriefLessonReturn.attemptId).toBe('review-current'); await click(back());
    expect(latest.lastDebrief.attemptId).toBe('review-current');
  });
});
