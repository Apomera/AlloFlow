import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host, latest, setSaved, writes, xp, errors;
const copy = value => JSON.parse(JSON.stringify(value));
const row = (t = 0) => ({ t, lat: 43.646, lon: -70.309, alt: 5000, spd: 110, hdg: 90,
  agl: 4924, fpm: 0, aoa: 8, pitch: 0, bank: 0, throttle: .6, onGround: false, stalling: false, lowAirspeed: false });
const flight = (kind = 'generic', patch = {}) => ({ attemptId: 'review-a', aircraftId: 'cessna172',
  activityId: kind === 'challenge' ? 'first_flight' : 'free_flight', investigation: false, startedAirborne: false,
  endedAt: '2026-10-21T12:00:00.000Z', flightTime: 30, airborneSeconds: 30, bestStableSeconds: 15,
  landings: 0, reflection: 'Original explanation.', samples: [row(0), row(2), row(4)],
  ...(kind === 'challenge' ? { challenge: { version: 1, id: 'first_flight', objectives: { climb: true, steady: false, landing: false }, elapsedSeconds: 30 } } : {}), ...patch });
function handler(node, event = 'onChange') {
  expect(node).toBeTruthy(); return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][event];
}
const textarea = kind => host.querySelector(kind === 'challenge' ? '#challenge-reflection' : '#debrief-evidence-explanation');
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.includes(text));
async function click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); }
async function input(node, text) {
  expect(node).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, text);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const reviewState = () => copy({ lastDebrief: latest.lastDebrief, flightPracticeHistory: latest.flightPracticeHistory,
  challengeReflections: latest.challengeReflections, debriefSampleIndex: latest.debriefSampleIndex,
  debriefCompareIndex: latest.debriefCompareIndex, debriefHistoryIndex: latest.debriefHistoryIndex,
  debriefHistorySampleIndex: latest.debriefHistorySampleIndex, totalFlightTime: latest.totalFlightTime });
async function mount(kind = 'generic', seed = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, update] = React.useState({ flightSim: { view: 'debrief', aircraft: 'cessna172', lastDebrief: flight(kind),
      flightPracticeHistory: [flight('generic', { attemptId: 'earlier', reflection: 'Earlier evidence remains read-only.' })],
      challengeReflections: { first_flight: 'Original explanation.', energy_management: 'Other exercise explanation.' },
      debriefSampleIndex: 2, debriefCompareIndex: 1, debriefHistoryIndex: 0, debriefHistorySampleIndex: 1,
      totalFlightTime: 900, ...seed } });
    latest = data.flightSim;
    setSaved = patch => update(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: update, awardXP: (...args) => xp.push(args),
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

describe('Sky School reflection review ownership', () => {
  it('requires a real originating and live debrief rather than reconstructing a missing record', () => {
    const origin = flight();
    expect(api.flightReflectionCanEdit(origin, { view: 'debrief', lastDebrief: copy(origin) })).toBe(true);
    for (const live of [null, {}, { view: 'menu', lastDebrief: origin }, { view: 'lesson', lastDebrief: origin },
      { view: 'debrief' }, { view: 'debrief', lastDebrief: null }, { view: 'debrief', lastDebrief: [] }, { view: 'debrief', lastDebrief: {} }]) {
      expect(api.flightReflectionCanEdit(origin, live)).toBe(false);
    }
    expect(api.flightReflectionCanEdit(null, { view: 'debrief', lastDebrief: origin })).toBe(false);
  });
  it('binds stable review IDs to their exercise, aircraft and launch context while permitting explanation changes', () => {
    const origin = flight(), before = copy(origin);
    expect(api.flightReflectionCanEdit(origin, { view: 'debrief', lastDebrief: { ...origin, reflection: 'New explanation.' } })).toBe(true);
    for (const patch of [{ attemptId: 'review-b' }, { aircraftId: 'sr71' }, { startedAirborne: true },
      { activityId: 'stall_investigation', investigation: true }, { activityId: 'geography_sprint', sprintRouteId: 'world_capitals' }]) {
      expect(api.flightReflectionCanEdit(origin, { view: 'debrief', lastDebrief: { ...origin, ...patch } })).toBe(false);
    }
    expect(origin).toEqual(before);
  });
  it('uses canonical legacy evidence identity excluding reflection without mutating either record', () => {
    const origin = flight('generic', { attemptId: null }), live = { view: 'debrief', lastDebrief: copy(origin) };
    const before = copy([origin, live]);
    expect(api.flightReflectionReviewKey(origin)).toBe(api.flightReflectionReviewKey({ ...origin, reflection: 'A later draft.' }));
    expect(api.flightReflectionCanEdit(origin, live)).toBe(true);
    expect(api.flightReflectionCanEdit(origin, { ...live, lastDebrief: { ...origin, samples: [row(8)] } })).toBe(false);
    expect(api.flightReflectionCanEdit(origin, { ...live, lastDebrief: { ...origin, endedAt: '2026-10-21T13:00:00.000Z' } })).toBe(false);
    expect(api.flightReflectionCanEdit(origin, { ...live, lastDebrief: { ...origin, attemptId: 'newly-owned-review' } })).toBe(false);
    expect([origin, live]).toEqual(before);
  });
  it.each(['generic', 'challenge'])('keeps native serial %s edits with their own record, archives, observations and exercise map after reload', async kind => {
    await mount(kind); const initial = reviewState();
    await input(textarea(kind), 'First revision after reviewing both moments.');
    await input(textarea(kind), 'Final explanation with recorded evidence.');
    expect(latest.lastDebrief.reflection).toBe('Final explanation with recorded evidence.');
    expect(latest.flightPracticeHistory).toEqual(initial.flightPracticeHistory);
    expect(latest.lastDebrief.samples).toEqual(initial.lastDebrief.samples);
    expect(latest.debriefSampleIndex).toBe(2); expect(latest.debriefCompareIndex).toBe(1);
    expect(latest.debriefHistorySampleIndex).toBe(1); expect(latest.totalFlightTime).toBe(900);
    expect(latest.challengeReflections.energy_management).toBe('Other exercise explanation.');
    expect(latest.challengeReflections.first_flight).toBe(kind === 'challenge' ? latest.lastDebrief.reflection : 'Original explanation.');
    const saved = copy(latest); await mount(kind, saved);
    expect(textarea(kind).value).toBe('Final explanation with recorded evidence.'); expect(xp).toHaveLength(0);
  });
  it.each(['generic', 'challenge'])('ignores the retained %s input handler after a newer saved review replaces its origin', async kind => {
    await mount(kind); const edit = handler(textarea(kind)), next = flight(kind, { attemptId: 'review-b', reflection: 'New review explanation.' });
    await act(async () => setSaved({ lastDebrief: next })); const before = reviewState(), count = writes.length;
    await act(async () => edit({ target: { value: 'Late text from review A.' } }));
    expect(reviewState()).toEqual(before); expect(latest.lastDebrief).toEqual(next); expect(writes).toHaveLength(count);
    await input(textarea(kind), 'Review B owns this edit.'); expect(latest.lastDebrief.reflection).toBe('Review B owns this edit.');
  });
  it.each(['generic', 'challenge'])('does not overwrite a pending newer %s review when the host update has not committed', async kind => {
    await mount(kind); const edit = handler(textarea(kind)), next = flight(kind, { attemptId: 'review-b', reflection: 'Pending review B explanation.' });
    const history = copy(latest.flightPracticeHistory), reflections = copy(latest.challengeReflections);
    await act(async () => {
      setSaved({ lastDebrief: next });
      edit({ target: { value: 'Late review A text before the commit.' } });
    });
    expect(latest.lastDebrief).toEqual(next); expect(latest.flightPracticeHistory).toEqual(history);
    expect(latest.challengeReflections).toEqual(reflections); expect(xp).toHaveLength(0);
  });
  it('does not recreate a review removed by a pending host update before React commits', async () => {
    await mount(); const edit = handler(textarea('generic'));
    await act(async () => { setSaved({ lastDebrief: null, view: 'menu' }); edit({ target: { value: 'A note without its pending owner.' } }); });
    expect(latest.lastDebrief).toBeNull(); expect(latest.view).toBe('menu');
  });
  it('rejects a pending replacement of legacy evidence even without an attempt ID', async () => {
    await mount('generic', { lastDebrief: flight('generic', { attemptId: null }) }); const edit = handler(textarea('generic'));
    const replacement = flight('generic', { attemptId: null, samples: [row(10)], reflection: 'A different saved legacy log.' });
    await act(async () => { setSaved({ lastDebrief: replacement }); edit({ target: { value: 'Late draft from the previous legacy log.' } }); });
    expect(latest.lastDebrief).toEqual(replacement);
  });
  it('merges a valid pending same-review edit with the host latest record fields and correct exercise map', async () => {
    await mount('challenge'); const edit = handler(textarea('challenge'));
    await act(async () => {
      setSaved({ lastDebrief: { ...latest.lastDebrief, teacherMarker: 'preserve the queued host field' },
        challengeReflections: { first_flight: 'Host first-flight note.', energy_management: 'Queued other exercise note.' } });
      edit({ target: { value: 'My current first-flight explanation.' } });
    });
    expect(latest.lastDebrief.reflection).toBe('My current first-flight explanation.');
    expect(latest.lastDebrief.teacherMarker).toBe('preserve the queued host field');
    expect(latest.challengeReflections).toEqual({ first_flight: 'My current first-flight explanation.', energy_management: 'Queued other exercise note.' });
  });
  it.each([
    ['generic', null], ['challenge', null], ['generic', 'review-a'], ['challenge', 'review-a']
  ])('rejects both stale %s reflection and supporting-lesson navigation after pending replacement (origin ID %s)', async (kind, attemptId) => {
    await mount(kind, { lastDebrief: flight(kind, { attemptId }) });
    const edit = handler(textarea(kind)), study = host.querySelector('[data-flight-debrief-study="supporting"]');
    const replacement = flight(kind, { attemptId: attemptId == null ? null : 'review-b',
      endedAt: '2026-10-21T13:00:00.000Z', samples: [row(10)], reflection: 'Review B must remain active.' });
    const beforeHistory = copy(latest.flightPracticeHistory), beforeReflections = copy(latest.challengeReflections);
    await act(async () => {
      setSaved({ lastDebrief: replacement });
      edit({ target: { value: 'Late origin A draft.' } });
      study.click();
    });
    expect(latest.view).toBe('debrief'); expect(latest.lastDebrief).toEqual(replacement);
    expect(latest.debriefLessonReturn == null).toBe(true);
    expect(latest.selectedLesson == null).toBe(true);
    expect(latest.flightPracticeHistory).toEqual(beforeHistory); expect(latest.challengeReflections).toEqual(beforeReflections);
    expect(host.querySelector('[data-flight-debrief-return]')).toBeNull(); expect(xp).toHaveLength(0);
  });
  it.each(['generic', 'challenge'])('preserves a valid legacy %s final draft when lesson entry deliberately assigns its review ID', async kind => {
    await mount(kind, { lastDebrief: flight(kind, { attemptId: null }) });
    const edit = handler(textarea(kind)), history = copy(latest.flightPracticeHistory);
    await act(async () => {
      edit({ target: { value: 'Final legacy evidence-based draft before study.' } });
      host.querySelector('[data-flight-debrief-study="supporting"]').click();
    });
    expect(latest.view).toBe('lesson'); expect(latest.lastDebrief.attemptId).toMatch(/^review_/);
    expect(latest.lastDebrief.reflection).toBe('Final legacy evidence-based draft before study.');
    expect(latest.debriefLessonReturn.attemptId).toBe(latest.lastDebrief.attemptId);
    expect(latest.flightPracticeHistory).toEqual(history);
    if (kind === 'challenge') expect(latest.challengeReflections.first_flight).toBe('Final legacy evidence-based draft before study.');
    const saved = copy(latest); await mount(kind, saved);
    await click(host.querySelector('[data-flight-debrief-return]'));
    expect(latest.view).toBe('debrief'); expect(textarea(kind).value).toBe('Final legacy evidence-based draft before study.');
    expect(latest.lastDebrief.attemptId).toBe(saved.lastDebrief.attemptId); expect(xp).toHaveLength(0);
  });
  it.each(['generic', 'challenge'])('retires %s input immediately when Menu is chosen, including after reopening the same review', async kind => {
    await mount(kind); const edit = handler(textarea(kind)), original = latest.lastDebrief.reflection;
    await act(async () => { button('Back to Menu').click(); edit({ target: { value: 'Queued after Menu before commit.' } }); });
    expect(latest.view).toBe('menu'); expect(latest.lastDebrief.reflection).toBe(original);
    await click(button('Review flight journal')); const before = reviewState(), count = writes.length;
    await act(async () => edit({ target: { value: 'Late text from the previous visit.' } }));
    expect(reviewState()).toEqual(before); expect(writes).toHaveLength(count);
    await input(textarea(kind), 'A fresh visit can edit the review.'); expect(latest.lastDebrief.reflection).toBe('A fresh visit can edit the review.');
  });
  it.each(['generic', 'challenge'])('blocks a queued %s edit after native fresh-flight launch before React replaces the old textarea', async kind => {
    await mount(kind); const edit = handler(textarea(kind)), before = reviewState();
    await act(async () => { button('Fly Again').click(); edit({ target: { value: 'Late text after launch.' } }); });
    expect(latest.view).toBe('flying'); expect(latest.lastDebrief).toEqual(before.lastDebrief);
    expect(latest.flightPracticeHistory).toEqual(before.flightPracticeHistory); expect(latest.challengeReflections).toEqual(before.challengeReflections);
    expect(latest.flightPractice.record.reflection).toBe(''); expect(xp).toHaveLength(0);
  });
  it.each(['generic', 'challenge'])('keeps the final %s edit before lesson entry and blocks edits queued during or after that study visit', async kind => {
    await mount(kind); const edit = handler(textarea(kind));
    await act(async () => {
      edit({ target: { value: 'Final explanation before study.' } });
      host.querySelector('[data-flight-debrief-study="supporting"]').click();
      edit({ target: { value: 'Queued after lesson navigation.' } });
    });
    expect(latest.view).toBe('lesson'); expect(latest.lastDebrief.reflection).toBe('Final explanation before study.');
    await click(host.querySelector('[data-flight-debrief-return]'));
    const before = reviewState(), count = writes.length;
    await act(async () => edit({ target: { value: 'Queued from the old study origin.' } }));
    expect(reviewState()).toEqual(before); expect(writes).toHaveLength(count);
    await input(textarea(kind), 'Fresh reflection after the lesson.'); expect(latest.lastDebrief.reflection).toBe('Fresh reflection after the lesson.');
  });
  it.each(['generic', 'challenge'])('does not rebuild a missing live %s review from an old input callback', async kind => {
    await mount(kind); const edit = handler(textarea(kind));
    await act(async () => setSaved({ lastDebrief: null, view: 'menu' })); const count = writes.length, archive = copy(latest.flightPracticeHistory);
    await act(async () => edit({ target: { value: 'Text with no owner.' } }));
    expect(latest.lastDebrief).toBeNull(); expect(latest.flightPracticeHistory).toEqual(archive); expect(writes).toHaveLength(count);
  });
  it('allows same-review legacy drafts but rejects their old handlers after canonical evidence is replaced', async () => {
    await mount('generic', { lastDebrief: flight('generic', { attemptId: null }) }); const edit = handler(textarea('generic'));
    await act(async () => { edit({ target: { value: 'First legacy draft.' } }); edit({ target: { value: 'Second legacy draft.' } }); });
    expect(latest.lastDebrief.reflection).toBe('Second legacy draft.'); expect(latest.lastDebrief.attemptId).toBeNull();
    await act(async () => setSaved({ lastDebrief: flight('generic', { attemptId: null, samples: [row(10)], reflection: 'Replacement legacy explanation.' }) }));
    const count = writes.length;
    await act(async () => edit({ target: { value: 'Late draft from the other legacy log.' } }));
    expect(latest.lastDebrief.reflection).toBe('Replacement legacy explanation.'); expect(writes).toHaveLength(count);
  });
  it('never writes an old challenge exercise map after the same-ID record changes to another exercise', async () => {
    await mount('challenge'); const edit = handler(textarea('challenge'));
    const result = api.createFlightChallenge('energy_management', {});
    await act(async () => setSaved({ lastDebrief: flight('challenge', { challenge: result, activityId: result.id, startedAirborne: true, reflection: 'Energy explanation.' }) }));
    const before = reviewState(), count = writes.length;
    await act(async () => edit({ target: { value: 'Wrong exercise text.' } }));
    expect(reviewState()).toEqual(before); expect(writes).toHaveLength(count);
    await input(textarea('challenge'), 'The energy exercise owns this note.');
    expect(latest.challengeReflections.energy_management).toBe('The energy exercise owns this note.');
    expect(latest.challengeReflections.first_flight).toBe('Original explanation.');
  });
  it('bounds valid input, permits clearing, and ignores nontext callback payloads without changing evidence', async () => {
    await mount(); const edit = handler(textarea('generic')), evidence = copy(latest.lastDebrief.samples);
    await act(async () => edit({ target: { value: 'x'.repeat(5000) } })); expect(latest.lastDebrief.reflection).toHaveLength(4000);
    await act(async () => edit({ target: { value: '' } })); expect(latest.lastDebrief.reflection).toBe('');
    const count = writes.length; await act(async () => edit({ target: { value: null } }));
    expect(writes).toHaveLength(count); expect(latest.lastDebrief.samples).toEqual(evidence); expect(xp).toHaveLength(0);
  });
});
