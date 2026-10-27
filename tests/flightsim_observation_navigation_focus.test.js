import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, root, host, latest, latestRoot, externalPatch, pending, delayHost, errors, awardXP, replayChecks;
const clone = value => JSON.parse(JSON.stringify(value));
const row = (index, offset = 0) => ({ t: index * 2, lat: 43.646, lon: -70.309, alt: 1200 + offset + index * 10,
  spd: 90 + index, hdg: 90, agl: 1124 + offset, fpm: index * 20, aoa: index === 1 ? 18 : 8,
  pitch: index, bank: 0, throttle: .6, onGround: false, stalling: index === 1, lowAirspeed: index === 3 });
const flight = (id = 'latest-a', patch = {}) => ({ attemptId: id, aircraftId: 'cessna172', aircraft: 'Cessna 172 Skyhawk',
  activityId: 'free_flight', investigation: false, startedAirborne: false, flightTime: 30, sessionTime: 30,
  airborneSeconds: 30, landings: 0, bestLanding: null, reflection: id + ' explanation',
  samples: Array.from({ length: 6 }, (_, index) => row(index)),
  flightNotes: [{ title: id + ' observation', message: 'A full explanation retained with ' + id + '.' }],
  discoveredPlaces: [{ name: id + ' coast', country: 'United States', fact: 'A complete geographic fact for ' + id + '.' }], ...patch });
const history = () => [flight('earlier-a'), flight('earlier-b', { samples: Array.from({ length: 6 }, (_, index) => row(index, 300)) })];
const explorer = () => host.querySelector('[aria-label="Flight evidence explorer"]');
const journal = () => host.querySelector('[aria-label="Flight practice journal"]');
const button = (label, within = host) => [...within.querySelectorAll('button')].find(node => node.textContent === label);
const nativeReview = () => button('Review flight journal');
function handler(node, event = 'onChange') {
  expect(node).toBeTruthy();
  const propsKey = Object.keys(node).find(key => key.startsWith('__reactProps$'));
  expect(propsKey).toBeTruthy(); expect(node[propsKey][event]).toBeTypeOf('function');
  return node[propsKey][event];
}
const eventValue = value => ({ target: { value: String(value) } });
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
async function change(node, value) {
  expect(node).toBeTruthy();
  const proto = node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
async function flushHost() {
  for (let count = 0; pending.length; count++) {
    expect(count).toBeLessThan(30); const apply = pending.shift(); await act(async () => apply());
  }
}
async function mount(seed = {}, options = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  pending = []; delayHost = !!options.delayHost;
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'debrief', aircraft: 'cessna172',
      lastDebrief: flight(), flightPracticeHistory: history(), totalFlightTime: 900,
      earnedBadges: { mile_high: true }, debriefSampleIndex: 1, debriefCompareIndex: 0,
      debriefHistoryIndex: 0, debriefHistorySampleIndex: 1, hostMarker: 'A', ...seed },
      otherTool: { writing: 'Retain unrelated work.' } });
    latestRoot = data; latest = data.flightSim;
    externalPatch = patch => setData(previous => ({ ...previous, flightSim: { ...previous.flightSim, ...patch } }));
    const submit = update => {
      const apply = () => setData(previous => {
        if (typeof update !== 'function') return update;
        const before = JSON.stringify(previous), first = update(previous), second = update(previous);
        replayChecks.push({ pure: JSON.stringify(previous) === before, stable: JSON.stringify(first) === JSON.stringify(second) });
        return second;
      });
      if (delayHost) pending.push(apply); else apply();
    };
    return tool.render(makeCtx({ toolData: data, setToolData: options.legacyHost ? undefined : submit, awardXP,
      update: (id, key, value) => submit(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => submit(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
const scopes = ['current', 'earlier'];
const selectedField = scope => scope === 'current' ? 'debriefSampleIndex' : 'debriefHistorySampleIndex';
const within = scope => scope === 'current' ? explorer() : journal();
const step = (scope, direction) => button(direction === 'previous' ? 'Previous observation' : 'Next observation', within(scope));
const selection = scope => [...within(scope).querySelectorAll('[role="status"]')].find(node => node.textContent.startsWith('Observation '));
function expectAvailable(node, available) {
  expect(node.disabled).toBe(false);
  expect(node.getAttribute('aria-disabled')).toBe(String(!available));
  expect(node.type).toBe('button');
  expect(node.tabIndex).toBe(0);
}
const immutableEvidence = () => clone({ current: latest.lastDebrief, earlier: latest.flightPracticeHistory,
  earnedBadges: latest.earnedBadges, totalFlightTime: latest.totalFlightTime, otherTool: latestRoot.otherTool });
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-22T12:00:00.000Z'));
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool(process.env.SKYSCHOOL_OBSERVATION_NAVIGATION_SOURCE || 'stem_lab/stem_tool_flightsim.js', 'flightSim');
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } }));
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); awardXP = vi.fn(); replayChecks = [];
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled();
  expect(replayChecks.every(result => result.pure && result.stable)).toBe(true);
  delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School observation navigation focus and ownership', () => {
  it.each(scopes.flatMap(scope => ['previous', 'next'].map(direction => [scope, direction])))
    ('retains %s %s focus at its boundary and keeps repeat activation inert', async (scope, direction) => {
      const field = selectedField(scope), start = direction === 'previous' ? 1 : 4, end = direction === 'previous' ? 0 : 5;
      await mount({ [field]: start });
      const action = step(scope, direction), region = selection(scope), evidence = immutableEvidence();
      expectAvailable(action, true);
      await click(action);
      expect(latest[field]).toBe(end); expect(document.activeElement).toBe(action);
      expectAvailable(action, false); expect(selection(scope)).toBe(region);
      expect(region.getAttribute('aria-live')).toBe('polite'); expect(region.getAttribute('aria-atomic')).toBe('true');
      expect(region.textContent).toBe('Observation ' + (end + 1) + ' of 6 · 0:' + (end * 2).toFixed(1).padStart(4, '0'));
      const saved = clone(latestRoot), run = handler(action, 'onClick');
      await act(async () => { action.click(); run(); action.click(); });
      expect(clone(latestRoot)).toEqual(saved); expect(immutableEvidence()).toEqual(evidence);
      expect(document.activeElement).toBe(action);
      await click(step(scope, direction === 'previous' ? 'next' : 'previous'));
      expect(latest[field]).toBe(start); expectAvailable(action, true);
    });

  it.each(scopes)('keeps both %s controls discoverable and inert for a single observation', async scope => {
    const field = selectedField(scope), record = flight('one-sample', { samples: [row(0)] });
    await mount({ [field]: 0, ...(scope === 'current' ? { lastDebrief: record } : { flightPracticeHistory: [record] }) });
    const saved = clone(latestRoot);
    for (const direction of ['previous', 'next']) {
      const action = step(scope, direction); expectAvailable(action, false); await click(action);
      expect(document.activeElement).toBe(action); expect(clone(latestRoot)).toEqual(saved);
    }
    expect(selection(scope).textContent).toBe('Observation 1 of 1 · 0:00.0');
  });

  it.each(scopes)('composes rapid %s steps from live accepted state and clamps both endpoints', async scope => {
    const field = selectedField(scope); await mount({ [field]: 1 }); const evidence = immutableEvidence();
    const next = handler(step(scope, 'next'), 'onClick');
    await act(async () => { for (let index = 0; index < 12; index++) next(); });
    expect(latest[field]).toBe(5); expectAvailable(step(scope, 'next'), false);
    const previous = handler(step(scope, 'previous'), 'onClick');
    await act(async () => { previous(); previous(); }); expect(latest[field]).toBe(3);
    const toStart = handler(step(scope, 'previous'), 'onClick');
    await act(async () => { for (let index = 0; index < 12; index++) toStart(); });
    expect(latest[field]).toBe(0); expectAvailable(step(scope, 'previous'), false);
    expect(immutableEvidence()).toEqual(evidence);
  });

  it.each(scopes)('keeps delayed %s boundary feedback accepted until the host receives each step', async scope => {
    const field = selectedField(scope); await mount({ [field]: 4 }, { delayHost: true });
    const action = step(scope, 'next'), status = selection(scope), savedText = status.textContent;
    await click(action); await act(async () => action.click());
    expect(latest[field]).toBe(4); expect(status.textContent).toBe(savedText); expectAvailable(action, true);
    expect(document.activeElement).toBe(action); await flushHost();
    expect(latest[field]).toBe(5); expect(selection(scope)).toBe(status); expectAvailable(action, false);
    expect(document.activeElement).toBe(action); expect(status.textContent).toContain('Observation 6 of 6');
  });

  it.each(scopes.flatMap(scope => ['previous', 'next'].map(direction => [scope, direction])))
    ('keeps a visibly unavailable %s %s action inert during same-turn host selection replacement', async (scope, direction) => {
      const field = selectedField(scope); await mount({ [field]: direction === 'previous' ? 0 : 5 });
      const action = step(scope, direction); expectAvailable(action, false);
      await act(async () => { externalPatch({ [field]: 2 }); action.click(); });
      expect(latest[field]).toBe(2); expectAvailable(action, true);
    });

  it.each(scopes.flatMap(scope => ['evidence', 'view'].map(replacement => [scope, replacement])))
    ('rejects a pending %s step when a replacement %s wins before host receipt', async (scope, replacement) => {
      const field = selectedField(scope); await mount({ [field]: 1 }, { delayHost: true });
      await click(step(scope, 'next'));
      const patch = replacement === 'view' ? { view: 'menu' } : scope === 'current'
        ? { lastDebrief: flight('incoming-current') } : { flightPracticeHistory: [flight('incoming-earlier')] };
      await act(async () => externalPatch({ ...patch, [field]: 3 }));
      const saved = clone(latestRoot); await flushHost(); expect(clone(latestRoot)).toEqual(saved);
    });

  it.each(['committed', 'queued'])('keeps an earlier-step callback out of a %s newly selected history attempt', async timing => {
    await mount(); const next = handler(step('earlier', 'next'), 'onClick');
    const choose = handler(host.querySelector('#debrief-earlier-flight'));
    if (timing === 'committed') {
      await act(async () => choose(eventValue(1))); await act(async () => next());
    } else await act(async () => { choose(eventValue(1)); next(); });
    expect(latest.debriefHistoryIndex).toBe(1); expect(latest.debriefHistorySampleIndex).toBe(0);
    expectAvailable(step('earlier', 'previous'), false); expectAvailable(step('earlier', 'next'), true);
  });

  it.each(scopes)('keeps %s endpoint navigation focusable in the legacy host', async scope => {
    const field = selectedField(scope); await mount({ [field]: 4 }, { legacyHost: true });
    const action = step(scope, 'next'); await click(action);
    expect(latest[field]).toBe(5); expectAvailable(action, false); expect(document.activeElement).toBe(action);
    const saved = clone(latestRoot); await click(action); expect(clone(latestRoot)).toEqual(saved);
  });
});

