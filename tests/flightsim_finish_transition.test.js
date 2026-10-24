import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host, latest, updateSaved, writes, translationCalls, errors, awardXP, delayFinish, delayedToolWrites;
const hooks = () => window.__testHooks.flightSim;
const copy = value => JSON.parse(JSON.stringify(value));
const row = () => ({ t: 2, lat: 43.646, lon: -70.309, alt: 1200, spd: 90, hdg: 90,
  agl: 1124, fpm: 300, aoa: 8, pitch: 3, bank: 0, throttle: .7, onGround: false, stalling: false, lowAirspeed: false });
const record = (patch = {}) => ({ attemptId: 'hydrated-later-flight', aircraftId: 'cessna172', activityId: 'free_flight',
  investigation: false, startedAirborne: false, sessionTime: 12, flightTime: 10, airborneSeconds: 10,
  bestStableSeconds: 4, peakAGL: 1124, stallSeconds: 0, lowAirspeedSeconds: 0, landings: 0, bestLanding: null,
  distance: 1, maxAlt: 1200, maxSpeed: 90, airports: 0, discovered: 0, samples: [row()],
  flightNotes: [], discoveredPlaces: [], reflection: '', ...patch });
const checkpoint = () => ({ version: 1, attemptId: 'hydrated-later-flight', recordedAt: '2026-10-22T12:00:00.000Z', record: record() });
const earlier = () => record({ attemptId: 'earlier-flight', reflection: 'Keep my earlier explanation.', endedAt: '2026-10-21T12:00:00.000Z' });
const inquiry = () => ({ phase: 'transfer', prediction: 'angle', hypothesis: 'Angle determines the flow state.',
  startingIdea: { version: 1, status: 'committed', prediction: 'speed', hypothesis: 'My original prediction.' },
  observations: [{ airspeed: 130, altitude: 5000, aoa: 8 }, { airspeed: 130, altitude: 5000, aoa: 20 }, { airspeed: 80, altitude: 5000, aoa: 20 }],
  explanation: 'The angle comparison crossed the stall boundary; the speed comparison stayed stalled.',
  transferChoice: 'stall', transferAnswer: 'stall', transferAttempts: 1, completedAt: null });
const reopenedCalls = () => translationCalls.filter(key => /\.(?:guided_)?flight_reopened_announcement$/.test(key));
const finishWrites = () => writes.filter(patch => patch.lastDebrief && !patch.lastDebrief.interrupted);
function button(label) {
  const node = [...host.querySelectorAll('button')].find(item => item.textContent === label);
  expect(node, 'Button: ' + label).toBeTruthy(); return node;
}
async function click(node) { await act(async () => node.click()); }
async function action(label) { await click(button(label)); }
async function advance(ms) { await act(async () => vi.advanceTimersByTime(ms)); }

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); awardXP = vi.fn();
  writes = []; translationCalls = []; delayFinish = false; delayedToolWrites = [];
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});
async function mount(seed = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172', railCollapsed: false,
      menuSections: { challenges: true }, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      totalFlightTime: 900, lastDebrief: earlier(), earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])), ...seed } });
    latest = data.flightSim;
    updateSaved = patch => setData(previous => ({ ...previous, flightSim: { ...previous.flightSim, ...patch } }));
    const setToolData = update => {
      // Guided finishes use a conditional functional transaction. Retain that
      // updater without inspecting it until the actual delayed host commit.
      const receipt = { evaluated: false, accepted: false, patch: null };
      const apply = () => setData(previous => {
        const next = typeof update === 'function' ? update(previous) : update;
        receipt.evaluated = true; receipt.accepted = next !== previous;
        if (next !== previous && next.flightSim.lastDebrief !== previous.flightSim.lastDebrief &&
            next.flightSim.lastDebrief && !next.flightSim.lastDebrief.interrupted) {
          receipt.patch = copy(next.flightSim); writes.push(receipt.patch);
        }
        return next;
      });
      if (delayFinish) { delayedToolWrites.push(receipt); window.setTimeout(apply, 25); }
      else apply();
    };
    return tool.render(makeCtx({ toolData: data, setToolData, awardXP,
      t: (key, fallback) => { translationCalls.push(key); return fallback ?? key; },
      update: (id, key, value) => { writes.push({ [key]: value }); setData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })); },
      updateMulti: (id, patch) => {
        writes.push(copy(patch));
        const apply = () => setData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } }));
        // Keep each updateMulti patch atomic. Only the normal finish patch is
        // delayed; a separate public host update can render in the meantime.
        if (delayFinish && patch.lastDebrief && !patch.lastDebrief.interrupted) window.setTimeout(apply, 25);
        else apply();
      },
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function launch(challenge) {
  const node = challenge ? host.querySelector('[data-flight-challenge-id="' + challenge + '"]') : host.querySelector('[aria-label="Free Flight from Portland, ME"]');
  expect(node).toBeTruthy(); await click(node); expect(latest.view).toBe('flying'); expect(hooks().flyingRef.current).toBe(true);
  const expand = host.querySelector('[aria-label="Expand the flight deck controls"]'); if (expand) await click(expand);
}
async function beginDelayedFinish(label = '✕ Exit', investigation = false) {
  // The native launch owns the real session identity. These measured summary
  // values isolate ending/navigation from the physics and recorder cadence.
  hooks().getLogRef().current.airborneSeconds = 12; hooks().timeRef.current = 16;
  delayFinish = true; translationCalls.length = 0;
  await action(label);
  expect(hooks().flyingRef.current).toBe(false);
  expect(finishWrites().length + delayedToolWrites.length).toBe(1);
  const expected = delayedToolWrites.length ? { transaction: delayedToolWrites[0] } : copy(finishWrites()[0]);
  if (!expected.transaction) expect(expected.lastDebrief.interrupted).toBeUndefined();
  // This committed host update changes a recovery-effect dependency while the
  // atomic finish/navigation update is still pending. It reproduces a fresh
  // render of the old cockpit, rather than invoking a private React handler.
  await act(async () => updateSaved(investigation ? { stallInvestigation: copy(latest.stallInvestigation), hostRevision: 1 }
    : { flightPractice: null, hostRevision: 1 }));
  expect(latest.view).toBe('flying');
  expect(writes.filter(patch => patch.view === 'menu')).toHaveLength(0);
  expect(reopenedCalls()).toEqual([]);
  await advance(24); expect(latest.view).toBe('flying'); expect(reopenedCalls()).toEqual([]);
  return expected;
}
async function completeDelayedFinish(expected) {
  await advance(1);
  if (expected.transaction) {
    expect(expected.transaction.evaluated).toBe(true);
    expect(expected.transaction.accepted, 'The pending normal finish must accept an unchanged canonical investigation clone.').toBe(true);
    expect(expected.transaction.patch).toBeTruthy(); expected = expected.transaction.patch;
  }
  expect(latest.view).toBe(expected.view); expect(latest.lastDebrief).toEqual(expected.lastDebrief);
  expect(latest.lastDebrief.interrupted).toBeUndefined(); expect(latest.flightPractice).toBeNull();
  expect(latest.totalFlightTime).toBe(912); expect(finishWrites()).toHaveLength(1);
  expect(reopenedCalls()).toEqual([]); expect(awardXP).not.toHaveBeenCalled();
  expect(writes.filter(patch => patch.view === 'menu')).toHaveLength(0);
  expect(latest.flightPracticeHistory).toHaveLength(1);
  expect(latest.flightPracticeHistory[0].reflection).toBe('Keep my earlier explanation.');
  const before = copy(latest); await advance(100); expect(latest).toEqual(before);
}

describe('Sky School normal finish navigation and genuine recovery', () => {
  it.each([undefined, 'first_flight'])('keeps native %s Exit distinct from recovery while the host finish commit is delayed', async challenge => {
    await mount(); await launch(challenge);
    const attemptId = latest.flightPractice.attemptId;
    const expected = await beginDelayedFinish();
    // A second native activation while the old cockpit remains rendered must
    // not create another debrief or credit the same airborne time again.
    await action('✕ Exit'); expect(finishWrites()).toHaveLength(1);
    await completeDelayedFinish(expected);
    expect(latest.view).toBe('debrief'); expect(latest.lastDebrief.attemptId).toBe(attemptId);
    expect(latest.lastDebrief.activityId).toBe(challenge || 'free_flight');
    if (challenge) expect(latest.challengeResults[challenge].interrupted).not.toBe(true);
  });

  it('preserves native Return to investigation through an intermediate cockpit render', async () => {
    await mount({ view: 'stallHunt', stallInvestigation: inquiry() }); await action('Try flight practice');
    expect(latest.view).toBe('flying'); expect(hooks().flyingRef.current).toBe(true);
    const original = copy(latest.stallInvestigation.startingIdea);
    const expected = await beginDelayedFinish('Return to investigation', true);
    await completeDelayedFinish(expected);
    expect(latest.view).toBe('stallHunt'); expect(latest.lastDebrief.investigation).toBe(true);
    expect(latest.stallInvestigation).toMatchObject({ phase: 'transfer', startingIdea: original, flight: { status: 'ended' } });
  });

  it('still recovers a genuinely new checkpoint hydrated after a completed normal finish', async () => {
    await mount(); await launch(); const expected = await beginDelayedFinish(); await completeDelayedFinish(expected);
    const finished = copy(latest.lastDebrief), beforeXP = awardXP.mock.calls.length;
    delayFinish = false;
    const saved = checkpoint(); expect(api.normalizeFlightPracticeCheckpoint(saved)).toBeTruthy();
    await act(async () => updateSaved({ view: 'menu', flightPractice: saved }));
    expect(latest.view).toBe('debrief'); expect(hooks().flyingRef.current).toBe(false);
    expect(latest.flightPractice).toBeNull();
    expect(latest.lastDebrief).toMatchObject({ attemptId: saved.attemptId, interrupted: true, samples: saved.record.samples });
    expect(latest.flightPracticeHistory.map(item => item.attemptId)).toEqual(['earlier-flight', finished.attemptId]);
    expect(latest.totalFlightTime).toBe(912); expect(awardXP).toHaveBeenCalledTimes(beforeXP);
    expect(host.querySelector('[data-flight-interrupted="latest"]')).toBeTruthy();
  });

  it.each([true, false])('recovers a genuinely restored initial cockpit with a saved checkpoint: %s', async hasCheckpoint => {
    const saved = checkpoint();
    await mount({ view: 'flying', flightPractice: hasCheckpoint ? saved : null });
    expect(hooks().flyingRef.current).toBe(false); expect(latest.flightPractice).toBeNull();
    expect(latest.totalFlightTime).toBe(900); expect(awardXP).not.toHaveBeenCalled();
    if (hasCheckpoint) {
      expect(latest.view).toBe('debrief'); expect(latest.lastDebrief).toMatchObject({ attemptId: saved.attemptId, interrupted: true });
      expect(host.querySelector('[data-flight-interrupted="latest"]')).toBeTruthy();
    } else {
      expect(latest.view).toBe('menu'); expect(latest.lastDebrief.attemptId).toBe('earlier-flight');
      expect(reopenedCalls()).toEqual(['stem.flightsim.flight_reopened_announcement']);
    }
  });
});
