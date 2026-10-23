import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host, latest, externalPatch, poke, pending, delayHost, errors, awardXP, replays;
const clone = value => JSON.parse(JSON.stringify(value));
const hooks = () => window.__testHooks.flightSim;
const returnButton = () => host.querySelector('[data-flight-debrief-return-investigation="true"]');
const flight = (status = 'ended') => ({ status, sawStall: true, recovered: false, recoverySeconds: 0, samples: [
  { time: 1, aoa: 20, airspeed: 130, altitude: 5000 }, { time: 2, aoa: 8, airspeed: 125, altitude: 4980 },
] });
const inquiry = (owner = 'A', patch = {}) => api.stallInvestigationRecord({ phase: 'transfer', prediction: 'angle', hypothesis: owner + ' revised prediction',
  startingIdea: { version: 1, status: 'committed', prediction: 'speed', hypothesis: owner + ' original prediction' },
  observations: [{ trialNumber: 41, airspeed: 130, altitude: 5000, aoa: 8 }, { trialNumber: 42, airspeed: 130, altitude: 5000, aoa: 20 },
    { trialNumber: 43, airspeed: 80, altitude: 5000, aoa: 20 }], explanation: owner + ' retained explanation',
  transferChoice: 'stall', transferAnswer: 'stall', transferAttempts: 2, flight: flight(), completedAt: null,
  attempts: [{ phase: 'review', hypothesis: owner + ' archived work', completedAt: '2026-10-21T12:00:00.000Z' }], ...patch });
const debrief = (patch = {}) => ({ attemptId: 'guided_A', aircraftId: 'cessna172', aircraft: 'Cessna 172', activityId: 'stall_investigation',
  investigation: true, startedAirborne: true, endedAt: '2026-10-22T12:00:00.000Z', flightTime: 12, sessionTime: 16,
  airborneSeconds: 12, bestStableSeconds: 2, peakAGL: 4924, stallSeconds: 1, lowAirspeedSeconds: 0, landings: 0,
  bestLanding: null, distance: 1, maxAlt: 5000, maxSpeed: 130, airports: 0, discovered: 0, reflection: 'Keep this debrief explanation.',
  flightNotes: [], discoveredPlaces: [], samples: [], ...patch });
function button(label) { const node = [...host.querySelectorAll('button')].find(item => item.textContent === label); expect(node, label).toBeTruthy(); return node; }
function handler(node, name = 'onClick') {
  expect(node).toBeTruthy(); const key = Object.keys(node).find(item => item.startsWith('__reactProps$')); expect(key).toBeTruthy(); return node[key][name];
}
async function action(label) { await act(async () => button(label).click()); }
async function clickReturn() { expect(returnButton(), 'Latest guided debrief has a native Return to investigation button').toBeTruthy(); await act(async () => returnButton().click()); }
async function flushHost() {
  for (let count = 0; pending.length; count++) {
    expect(count).toBeLessThan(20); const apply = pending.shift(); await act(async () => apply());
  }
}
async function mount(seed = {}, options = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); delayHost = !!options.delayHost;
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'debrief', aircraft: 'cessna172', railCollapsed: false,
      tutorialCue: null, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      totalFlightTime: 900, stallInvestigation: inquiry(), lastDebrief: debrief(),
      flightPracticeHistory: [debrief({ attemptId: 'earlier_guided', reflection: 'Earlier flight explanation.' })],
      stallCompareFirst: 1, stallCompareSecond: 2, stallHistoryIndex: 0, stallPracticeSampleIndex: 1,
      stallHistoryPracticeSampleIndex: 0, debriefHistoryIndex: 0, debriefSampleIndex: 0,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])), hostMarker: 'A', ...seed },
      otherTool: { writing: 'Keep unrelated writing.' } });
    const [, setLocal] = React.useState(0);
    latest = data.flightSim; poke = () => setLocal(value => value + 1);
    externalPatch = patch => setData(previous => ({ ...previous, flightSim: { ...previous.flightSim, ...patch } }));
    const submit = update => {
      const apply = () => setData(previous => {
        let next;
        if (options.replay && typeof update === 'function') {
          const before = JSON.stringify(previous), first = update(previous); next = update(previous);
          replays.push({ same: JSON.stringify(first) === JSON.stringify(next), immutable: JSON.stringify(previous) === before });
        } else next = typeof update === 'function' ? update(previous) : update;
        if (options.cloneRecordAtCommit && next !== previous && next.flightSim.stallInvestigation) {
          next = { ...next, flightSim: { ...next.flightSim, stallInvestigation: clone(next.flightSim.stallInvestigation) } };
        }
        return next;
      });
      if (delayHost) pending.push(apply); else apply();
    };
    return tool.render(makeCtx({ toolData: data, setToolData: submit, awardXP,
      update: (id, key, value) => submit(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => submit(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  const app = React.createElement(App); await act(async () => root.render(options.strict ? React.createElement(React.StrictMode, null, app) : app));
}
function noRewards() { expect(awardXP).not.toHaveBeenCalled(); expect(replays.every(item => item.same && item.immutable)).toBe(true); }
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-22T12:00:00.000Z'));
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function() {
    return new Proxy({ canvas: this, measureText: text => ({ width: String(text).length * 6 }),
      createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) }, {
      get(target, key) { return key in target ? target[key] : () => {}; }, set(target, key, value) { target[key] = value; return true; },
    });
  });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  pending = []; replays = []; errors = vi.spyOn(console, 'error').mockImplementation(() => {}); awardXP = vi.fn();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School guided debrief return to the saved investigation', () => {
  it('returns from native guided Exit to the current investigation without altering evidence, notes, or credit', async () => {
    await mount({ view: 'stallHunt', stallInvestigation: inquiry('A', { flight: null }) });
    await action('Try flight practice'); expect(latest.view).toBe('flying');
    hooks().getLogRef().current.airborneSeconds = 7; hooks().timeRef.current = 9;
    await action('✕ Exit'); expect(latest.view).toBe('debrief'); expect(latest.totalFlightTime).toBe(907);
    const before = clone(latest), node = returnButton(); expect(node).toBeTruthy();
    expect(node.tagName).toBe('BUTTON'); expect(node.type).toBe('button'); expect(node.textContent).toBe('Return to investigation');
    expect(parseFloat(node.style.minHeight)).toBeGreaterThanOrEqual(44); expect(node.closest('.skyschool-debrief-actions')).toBeTruthy();
    await clickReturn(); expect(latest).toEqual({ ...before, view: 'stallHunt' });
    expect(document.activeElement).toBe(host.querySelector('#stall-phase-title')); expect(hooks().flyingRef.current).toBe(false); noRewards();
  });

  it('retains the return route after a serialized reload without restoring an earlier investigation', async () => {
    await mount({ stallInvestigation: inquiry('A', { phase: 'review', completedAt: '2026-10-22T12:00:00.000Z' }) });
    const saved = clone(latest); await mount(saved); const before = clone(latest);
    await clickReturn(); expect(latest).toEqual({ ...before, view: 'stallHunt' });
    expect(latest.stallInvestigation.phase).toBe('review'); expect(latest.stallInvestigation.hypothesis).toBe('A revised prediction'); noRewards();
  });

  it('offers one latest-flight action while an archived flight is selected and preserves that archive selection', async () => {
    await mount({ flightPracticeHistory: [debrief({ attemptId: 'oldest', reflection: 'Oldest note.' }), debrief({ attemptId: 'newer', reflection: 'Newer note.' })], debriefHistoryIndex: 1 });
    const journal = host.querySelector('[aria-label="Flight practice journal"]'); expect(journal).toBeTruthy();
    expect(journal.querySelector('[data-flight-debrief-return-investigation]')).toBeNull();
    expect(host.querySelectorAll('[data-flight-debrief-return-investigation]')).toHaveLength(1);
    const before = clone(latest); await clickReturn(); expect(latest).toEqual({ ...before, view: 'stallHunt' }); noRewards();
  });

  it('waits for a real delayed host receipt before navigation and accepts a canonical record clone', async () => {
    await mount({}, { delayHost: true, strict: true, replay: true, cloneRecordAtCommit: true });
    const before = clone(latest), node = returnButton(); expect(node).toBeTruthy(); node.focus();
    await clickReturn(); await act(async () => poke()); await act(async () => vi.advanceTimersByTime(100));
    expect(latest).toEqual(before); expect(document.activeElement).toBe(node); expect(hooks().flyingRef.current).toBe(false);
    await flushHost(); expect(latest).toEqual({ ...before, view: 'stallHunt' });
    expect(document.activeElement).toBe(host.querySelector('#stall-phase-title')); expect(requestAnimationFrame).not.toHaveBeenCalled(); noRewards();
  });

  it.each(['not-guided', 'other-activity', 'missing-inquiry', 'array-inquiry', 'missing-flight', 'active-flight', 'missing-latest'])(
    'does not offer an investigation return for %s even with a guided archive', async kind => {
      const seed = kind === 'not-guided' ? { lastDebrief: debrief({ investigation: false }) }
        : kind === 'other-activity' ? { lastDebrief: debrief({ activityId: 'free_flight' }) }
        : kind === 'missing-inquiry' ? { stallInvestigation: null }
        : kind === 'array-inquiry' ? { stallInvestigation: [] }
        : kind === 'missing-flight' ? { stallInvestigation: inquiry('A', { flight: null }) }
        : kind === 'active-flight' ? { stallInvestigation: inquiry('A', { flight: flight('active') }) }
        : { lastDebrief: null };
      await mount(seed); expect(host.querySelector('[aria-label="Flight practice journal"]')).toBeTruthy();
      expect(returnButton()).toBeNull(); noRewards();
    });

  it.each(['committed', 'queued'].flatMap(timing => ['inquiry', 'debrief', 'view'].map(field => [timing, field])))(
    'rejects retained A return after %s B %s replacement without touching B', async (timing, field) => {
      await mount({}, { strict: true, replay: true }); const oldReturn = handler(returnButton());
      const patch = field === 'inquiry' ? { stallInvestigation: inquiry('B'), hostMarker: 'B' }
        : field === 'debrief' ? { lastDebrief: debrief({ attemptId: 'guided_B', reflection: 'B authoritative explanation.' }), hostMarker: 'B' }
        : { view: 'menu', hostMarker: 'B' };
      const expected = clone({ ...latest, ...patch });
      if (timing === 'queued') await act(async () => { externalPatch(patch); oldReturn(); });
      else { await act(async () => externalPatch(patch)); await act(async () => oldReturn()); }
      await flushHost(); await act(async () => vi.advanceTimersByTime(100));
      expect(latest).toEqual(expected); expect(hooks().flyingRef.current).toBe(false); expect(requestAnimationFrame).not.toHaveBeenCalled(); noRewards();
    });

  it.each(['committed', 'queued'].flatMap(timing => ['other-activity', 'malformed-challenge'].map(conflict => [timing, conflict])))(
    'rejects retained return after a %s raw %s conflict with the same canonical flight and attempt', async (timing, conflict) => {
      await mount({}, { strict: true, replay: true }); const oldReturn = handler(returnButton());
      const replacement = { ...latest.lastDebrief, ...(conflict === 'other-activity' ? { activityId: 'free_flight' } : { challenge: { id: 'invalid_activity' } }) };
      expect(replacement.attemptId).toBe(latest.lastDebrief.attemptId);
      expect(api.normalizeFlightPracticeRecord(replacement)).toEqual(api.normalizeFlightPracticeRecord(latest.lastDebrief));
      const patch = { lastDebrief: replacement, hostMarker: 'B raw conflict' }, expected = clone({ ...latest, ...patch });
      if (timing === 'queued') await act(async () => { externalPatch(patch); oldReturn(); });
      else { await act(async () => externalPatch(patch)); expect(returnButton()).toBeNull(); await act(async () => oldReturn()); }
      await flushHost(); await act(async () => vi.advanceTimersByTime(100));
      expect(latest).toEqual(expected); expect(returnButton()).toBeNull();
      expect(hooks().flyingRef.current).toBe(false); expect(requestAnimationFrame).not.toHaveBeenCalled(); noRewards();
    });

  it('rejects a pending return when a different latest debrief commits before host evaluation and keeps deliberate focus', async () => {
    await mount({}, { delayHost: true, replay: true }); await clickReturn(); expect(pending.length).toBeGreaterThan(0);
    const patch = { lastDebrief: debrief({ attemptId: 'guided_B', reflection: 'B newest explanation.' }), hostMarker: 'B' };
    const expected = clone({ ...latest, ...patch }); await act(async () => externalPatch(patch));
    const target = host.querySelector('#flight-reflection');
    const focusTarget = target || button('🏠 Back to Menu'); focusTarget.focus();
    await flushHost(); await act(async () => vi.advanceTimersByTime(100));
    expect(latest).toEqual(expected); expect(document.activeElement).toBe(focusTarget); noRewards();
  });
});
