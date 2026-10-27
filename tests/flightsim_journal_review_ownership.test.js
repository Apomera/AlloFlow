import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host, latest, latestRoot, externalPatch, pending, delayHost, errors, awardXP, downloads, replayChecks;
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
async function click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); }
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
    return tool.render(makeCtx({ toolData: data, setToolData: submit, awardXP,
      update: (id, key, value) => submit(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => submit(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
function captureControls() {
  return {
    latestTime: handler(host.querySelector('#debrief-observation-time')),
    latestEvent: handler(host.querySelector('#debrief-recorded-event')),
    comparison: handler(button('Use this moment for comparison', explorer()), 'onClick'),
    earlierChoice: handler(host.querySelector('#debrief-earlier-flight')),
    earlierTime: handler(host.querySelector('#debrief-earlier-time')),
    earlierEvent: handler(host.querySelector('#debrief-earlier-recorded-event')),
    earlierNext: handler(host.querySelector('[data-earlier-observation-step="next"]'), 'onClick'),
  };
}
function invokeOldControls(controls) {
  controls.latestTime(eventValue(2)); controls.latestEvent(eventValue(1)); controls.comparison();
  controls.earlierChoice(eventValue(1)); controls.earlierTime(eventValue(2));
  controls.earlierEvent(eventValue(1)); controls.earlierNext();
}
const records = () => clone({ latest: latest.lastDebrief, history: latest.flightPracticeHistory,
  earnedBadges: latest.earnedBadges, totalFlightTime: latest.totalFlightTime, otherTool: latestRoot.otherTool });
function captureDownloads() {
  vi.stubGlobal('Blob', class { constructor(parts) { this.text = parts.join(''); } });
  const blobs = new Map();
  vi.stubGlobal('URL', { createObjectURL: blob => { const url = 'blob:journal-' + blobs.size; blobs.set(url, blob); return url; }, revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() {
    downloads.push({ name: this.download, text: blobs.get(this.href)?.text });
  });
}

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-22T12:00:00.000Z'));
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } }));
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); awardXP = vi.fn(); downloads = []; replayChecks = [];
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled();
  expect(replayChecks.every(result => result.pure && result.stable)).toBe(true);
  delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('journal controls belong to their rendered review evidence', () => {
  it.each(['committed', 'queued'].flatMap(timing => ['latest', 'history', 'view'].map(field => [timing, field])))(
    'rejects retained controls after a %s %s replacement, preserving the complete replacement', async (timing, field) => {
      await mount(); const old = captureControls();
      const patch = { debriefSampleIndex: 4, debriefCompareIndex: 3, debriefHistoryIndex: 0,
        debriefHistorySampleIndex: 4, hostMarker: 'Replacement B' };
      // Same attempt IDs are deliberate: identity alone cannot own changed
      // recorded measurements or a replacement historical notebook.
      if (field === 'latest') patch.lastDebrief = flight('latest-a', { samples: Array.from({ length: 6 }, (_, index) => row(index, 700)) });
      if (field === 'history') patch.flightPracticeHistory = history().map(record => ({ ...record,
        discoveredPlaces: [{ name: 'Replacement place', country: 'Canada', fact: 'A newer retained fact.' }] }));
      if (field === 'view') patch.view = 'menu';
      const expected = clone({ ...latest, ...patch });
      if (timing === 'committed') { await act(async () => externalPatch(patch)); await act(async () => invokeOldControls(old)); }
      else await act(async () => { externalPatch(patch); invokeOldControls(old); });
      expect(latest).toEqual(expected); expect(latestRoot.otherTool).toEqual({ writing: 'Retain unrelated work.' });
    });

  it.each(['committed', 'queued'])('keeps an earlier-flight callback out of a %s newly selected attempt', async timing => {
    await mount(); const old = captureControls();
    const choose = () => old.earlierChoice(eventValue(1));
    const oldSample = () => { old.earlierTime(eventValue(4)); old.earlierEvent(eventValue(1)); old.earlierNext(); };
    const before = records();
    if (timing === 'committed') { await act(async () => choose()); await act(async () => oldSample()); }
    else await act(async () => { choose(); oldSample(); });
    expect(latest.debriefHistoryIndex).toBe(1); expect(latest.debriefHistorySampleIndex).toBe(0);
    expect(records()).toEqual(before);
    await change(host.querySelector('#debrief-earlier-time'), 3); expect(latest.debriefHistorySampleIndex).toBe(3);
  });

  it.each(['latest', 'history'])('retires old controls after committed A to B to A %s evidence transitions', async field => {
    await mount(); const original = clone(latest), old = captureControls();
    const replacement = field === 'latest' ? { lastDebrief: flight('review-b') } : { flightPracticeHistory: [flight('archive-b')] };
    await act(async () => externalPatch(replacement)); await act(async () => externalPatch(clone(original)));
    await act(async () => invokeOldControls(old)); expect(latest).toEqual(original);
    await change(host.querySelector('#debrief-observation-time'), 3); expect(latest.debriefSampleIndex).toBe(3);
  });

  it('permits canonical host clones and same-review reflection changes without losing current selection', async () => {
    await mount(); const old = captureControls(), before = records();
    const changedReflection = 'A final explanation typed while inspecting this same flight.';
    await act(async () => externalPatch({ lastDebrief: { ...clone(latest.lastDebrief), reflection: changedReflection },
      flightPracticeHistory: clone(latest.flightPracticeHistory), hostMarker: 'Same canonical evidence' }));
    await act(async () => old.latestTime(eventValue(4)));
    expect(latest.debriefSampleIndex).toBe(4); expect(latest.lastDebrief.reflection).toBe(changedReflection);
    expect(records()).toEqual({ ...before, latest: { ...before.latest, reflection: changedReflection } });
  });
});

describe('functional host receipts and valid consecutive journal actions', () => {
  it('keeps controlled review values committed until delayed host writes are actually accepted', async () => {
    await mount({}, { delayHost: true }); const before = clone(latest), controls = captureControls();
    await act(async () => { controls.latestTime(eventValue(4)); controls.earlierTime(eventValue(3)); });
    expect(latest).toEqual(before);
    expect(host.querySelector('#debrief-observation-time').value).toBe('1');
    expect(host.querySelector('#debrief-earlier-time').value).toBe('1');
    await flushHost();
    expect(latest).toEqual({ ...before, debriefSampleIndex: 4, debriefHistorySampleIndex: 3 });
  });

  it('rejects a pending write when new canonical evidence reaches the host before evaluation', async () => {
    await mount({}, { delayHost: true }); const old = captureControls();
    await act(async () => { old.latestTime(eventValue(4)); old.earlierTime(eventValue(3)); });
    const replacement = { lastDebrief: flight('replacement'), flightPracticeHistory: [flight('replacement-earlier')],
      debriefSampleIndex: 2, debriefCompareIndex: 1, debriefHistorySampleIndex: 2, hostMarker: 'Host hydration B' };
    const expected = clone({ ...latest, ...replacement }); await act(async () => externalPatch(replacement));
    const focus = host.querySelector('#debrief-observation-time'); focus.focus();
    await flushHost(); expect(latest).toEqual(expected); expect(document.activeElement).toBe(focus);
  });

  it.each(['latest', 'earlier'])('composes rapid valid %s next/previous steps using accepted state and clamps endpoints', async family => {
    await mount(); const before = records(), field = family === 'latest' ? 'debriefSampleIndex' : 'debriefHistorySampleIndex';
    const nextNode = () => family === 'latest' ? button('Next observation', explorer()) : host.querySelector('[data-earlier-observation-step="next"]');
    const previousNode = () => family === 'latest' ? button('Previous observation', explorer()) : host.querySelector('[data-earlier-observation-step="previous"]');
    const next = handler(nextNode(), 'onClick');
    await act(async () => { for (let count = 0; count < 8; count++) next(); });
    expect(latest[field]).toBe(5); expect(nextNode().disabled).toBe(false); expect(nextNode().getAttribute('aria-disabled')).toBe('true');
    const previous = handler(previousNode(), 'onClick');
    await act(async () => { previous(); previous(); previous(); }); expect(latest[field]).toBe(2);
    const toStart = handler(previousNode(), 'onClick');
    await act(async () => { for (let count = 0; count < 8; count++) toStart(); });
    expect(latest[field]).toBe(0); expect(previousNode().disabled).toBe(false); expect(previousNode().getAttribute('aria-disabled')).toBe('true'); expect(records()).toEqual(before);
  });

  it('accepts consecutive absolute sliders in the same review without replaying an older comparison action', async () => {
    await mount(); const old = captureControls(), before = records();
    await act(async () => {
      old.latestTime(eventValue(2)); old.latestTime(eventValue(4));
      old.earlierTime(eventValue(3)); old.earlierTime(eventValue(5)); old.comparison();
    });
    expect(latest.debriefSampleIndex).toBe(4); expect(latest.debriefCompareIndex).toBe(0);
    expect(latest.debriefHistorySampleIndex).toBe(5); expect(records()).toEqual(before);
    await click(button('Use this moment for comparison', explorer())); expect(latest.debriefCompareIndex).toBe(4);
  });

  it('moves a normal-flow event and its recorded stall comparison together without changing evidence', async () => {
    await mount(); const before = records();
    await change(host.querySelector('#debrief-recorded-event'), 1);
    expect(latest.debriefSampleIndex).toBe(2); expect(latest.debriefCompareIndex).toBe(1);
    expect(explorer().querySelector('[data-evidence-comparison]').textContent).toContain('0:02.0');
    expect(records()).toEqual(before);
  });
});

describe('native menu access to retained facts without a latest review', () => {
  it('rejects old menu review navigation after committed or queued incoming flight navigation', async () => {
    for (const timing of ['committed', 'queued']) {
      await mount({ view: 'menu' });
      const openOldReview = handler(nativeReview(), 'onClick'), before = records();
      const departure = host.querySelector('button[aria-label="Free Flight from Portland, ME"]');
      expect(departure).toBeTruthy();
      const launch = () => {
        // A raw hydrated flying view correctly triggers interrupted-flight
        // recovery. Start a real session so the old menu action competes with
        // an active native flight, rather than a deliberately recovered save.
        departure.click(); externalPatch({ hostMarker: 'A fresh flight owns navigation' });
      };
      if (timing === 'committed') {
        await act(async () => launch()); expect(latest.view).toBe('flying');
        await act(async () => openOldReview());
      } else await act(async () => { launch(); openOldReview(); });
      expect(latest.view).toBe('flying'); expect(latest.hostMarker).toBe('A fresh flight owns navigation');
      expect(records()).toEqual(before);
    }
  });

  it('opens the journal from a genuine legacy menu whose view field is absent', async () => {
    await mount({ view: undefined }); const before = records();
    expect(nativeReview()).toBeTruthy(); await click(nativeReview());
    expect(latest.view).toBe('debrief'); expect(explorer()).toBeTruthy();
    expect(host.querySelector('[data-flight-notes-scope="latest"]').textContent).toContain('A full explanation retained with latest-a.');
    expect(records()).toEqual(before);
  });

  it('browses and exports retained earlier facts for missing latest values and preserves them through reload', async () => {
    for (const missing of [undefined, null, false]) {
      const savedHistory = history();
      await mount({ view: 'menu', lastDebrief: missing, flightPracticeHistory: savedHistory });
      const review = nativeReview(); expect(review).toBeTruthy(); review.focus(); expect(document.activeElement).toBe(review);
      await click(review); expect(latest.view).toBe('debrief');
      expect(host.querySelector('[data-flight-debrief-unavailable]')).toBeTruthy();
      expect(journal()).toBeTruthy(); expect(host.querySelector('textarea')).toBeNull();
      await change(host.querySelector('#debrief-earlier-flight'), 1);
      const savedFacts = host.querySelector('[data-flight-notes-scope="earlier"]');
      expect(savedFacts.textContent).toContain(savedHistory[1].discoveredPlaces[0].fact);
      captureDownloads(); await click(host.querySelector('[data-flight-journal-export]'));
      const exported = JSON.parse(downloads.at(-1).text);
      expect(exported.latest).toBeNull(); expect(exported.earlier).toEqual(api.normalizeFlightPracticeHistory(savedHistory));
      const saved = clone(latest); await mount({ ...saved, lastDebrief: missing });
      expect(host.querySelector('[data-flight-notes-scope="earlier"]').textContent).toContain(savedHistory[1].discoveredPlaces[0].fact);
      expect(latest.flightPracticeHistory).toEqual(savedHistory); expect(latest.lastDebrief).toBe(missing);
    }
  });

  it('keeps the existing entry for a truthy unreadable latest save without manufacturing a review', async () => {
    const unreadable = { reflection: 'Unowned legacy writing.' };
    await mount({ view: 'menu', lastDebrief: unreadable, flightPracticeHistory: [] });
    await click(nativeReview()); expect(host.querySelector('[data-flight-debrief-unavailable]')).toBeTruthy();
    expect(latest.lastDebrief).toEqual(unreadable); expect(journal()).toBeNull();
  });

  it('omits a journal entry when neither a latest review nor valid earlier evidence exists', async () => {
    await mount({ view: 'menu', lastDebrief: null, flightPracticeHistory: [null, {}, 'invalid'] });
    expect(nativeReview()).toBeUndefined(); expect(latest.flightPracticeHistory).toEqual([null, {}, 'invalid']);
  });
});
