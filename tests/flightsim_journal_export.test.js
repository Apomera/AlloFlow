import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, writes, errors, downloads, revoke, xp;
const date = '2026-10-21T17:00:00.000Z';
const row = (t = 0, patch = {}) => ({ t, lat: 43.646, lon: -70.309, alt: 5000, spd: 110, hdg: 90,
  agl: 4924, fpm: 0, aoa: 11.96, pitch: -3, bank: 7, throttle: .42,
  onGround: false, stalling: false, lowAirspeed: false, ...patch });
const flight = (patch = {}) => ({ attemptId: 'latest-flight', aircraftId: 'cessna172', activityId: 'free_flight',
  startedAirborne: false, investigation: false, endedAt: '2026-10-21T16:30:00.000Z',
  flightTime: 30, sessionTime: 40, airborneSeconds: 30, bestStableSeconds: 12, stallSeconds: 0, landings: 0,
  reflection: 'I reduced pitch before adding power.', samples: [row(0), row(2)],
  flightNotes: [{ title: 'Steady flight', message: 'Altitude and vertical speed remained close to the target.' }],
  discoveredPlaces: [{ name: 'Portland', country: 'USA', fact: 'Portland is a coastal city in Maine.' }], ...patch });
const mission = () => ({ missionId: 'drone_survey', mode: 'aerial', launchLat: 43.646, launchLon: -70.309,
  elapsedSeconds: 24, completed: false, returned: false, battery: 82, batteryExhausted: false,
  targets: [{ name: 'First photo', lat: 43.65, lon: -70.30, captured: true },
    { name: 'Second photo', lat: 43.64, lon: -70.31, captured: false }] });
const savedCheckpoint = kind => ({ version: 1, attemptId: 'interrupted-' + kind, recordedAt: date,
  ...(kind === 'mission' ? { mission: mission() } : { sprint: { routeId: 'americas', status: 'ended', elapsedSeconds: 14,
    results: [{ place: 'Washington D.C.', answer: 'Washington D.C.', expected: 'Washington D.C.' }] } }) });
const journal = () => host.querySelector('[aria-label="Flight practice journal"]');
const exportButton = () => journal().querySelector('[data-flight-journal-export]');
async function click(button) { expect(button).toBeTruthy(); await act(async () => button.click()); }
async function editReflection(value) {
  const input = host.querySelector('#debrief-evidence-explanation'); expect(input).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function mount(seed = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'debrief', lastDebrief: flight(),
      flightPracticeHistory: [], ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData, awardXP: (...args) => xp.push(args),
      update: (id, key, value) => { writes.push({ [key]: value }); setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })); },
      updateMulti: (id, patch) => { writes.push(patch); setData(old => ({ ...old, [id]: { ...old[id], ...patch } })); },
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
function captureDownloads() {
  vi.stubGlobal('Blob', class { constructor(parts, options) { this.text = parts.join(''); this.type = options.type; } });
  const blobs = [];
  revoke = vi.fn();
  vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { blobs.push(blob); return 'blob:journal-' + blobs.length; }), revokeObjectURL: revoke });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() {
    downloads.push({ name: this.download, href: this.href, connected: this.isConnected, blob: blobs.at(-1) });
  });
}

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(date));
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
  { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  writes = []; xp = []; downloads = []; errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School complete practice journal export', () => {
  it('exports the canonical latest and four retained attempts with their own learning evidence', () => {
    const challenge = api.createFlightChallenge('first_flight', {});
    Object.keys(challenge.objectives).forEach(key => { challenge.objectives[key] = true; });
    const saved = { lastDebrief: flight(), flightPracticeHistory: [
      flight({ attemptId: 'ordinary', reflection: 'Earlier ordinary explanation.' }),
      flight({ attemptId: 'challenge', challenge, activityId: challenge.id, reflection: 'Challenge decision.' }),
      { ...api.recoverFlightMissionCheckpoint(savedCheckpoint('mission')), reflection: 'Plan my remaining target and return.' },
      { ...api.recoverFlightSprintCheckpoint(savedCheckpoint('sprint')), reflection: 'Review this city and its country.' },
    ], aircraft: 'drone', rescue: { active: true }, controls: { throttle: 1 }, surveysCompleted: 99, unrelatedSecret: 'excluded' };
    const original = JSON.stringify(saved);
    const exported = api.createFlightPracticeJournalExport(saved, date);
    expect(Object.keys(exported)).toEqual(['format', 'version', 'exportedAt', 'latest', 'earlier']);
    expect(exported).toMatchObject({ format: 'skyschool-flight-practice-journal', version: 1, exportedAt: date });
    expect(exported.latest).toEqual(api.normalizeFlightPracticeRecord(saved.lastDebrief));
    expect(exported.earlier).toEqual(api.normalizeFlightPracticeHistory(saved.flightPracticeHistory));
    expect(exported.earlier.map(record => record.attemptId)).toEqual(['ordinary', 'challenge', 'interrupted-mission', 'interrupted-sprint']);
    expect(exported.latest.flightNotes).toEqual(saved.lastDebrief.flightNotes);
    expect(exported.latest.discoveredPlaces).toEqual(saved.lastDebrief.discoveredPlaces);
    expect(exported.earlier[1].challenge.status).toBe('complete');
    expect(exported.earlier[2].mission).toMatchObject({ interrupted: true, capturedCount: 1, battery: 82 });
    expect(exported.earlier[3].sprint).toMatchObject({ interrupted: true, score: 1, results: [{ place: 'Washington D.C.' }] });
    expect(JSON.stringify(exported)).not.toContain('unrelatedSecret'); expect(JSON.stringify(saved)).toBe(original);
  });
  it('detaches nested samples, objectives, targets, notes, discoveries and answer records in both directions', () => {
    const challenge = api.createFlightChallenge('first_flight', {});
    const saved = { lastDebrief: flight({ challenge, activityId: challenge.id }), flightPracticeHistory: [
      flight({ attemptId: 'mission', aircraftId: 'drone', activityId: 'drone_survey', mission: mission() }),
      api.recoverFlightSprintCheckpoint(savedCheckpoint('sprint')),
    ] };
    const exported = api.createFlightPracticeJournalExport(saved, date);
    exported.latest.samples[0].alt = 1; exported.latest.challenge.objectives.climb = true;
    exported.latest.flightNotes[0].message = 'Changed export'; exported.latest.discoveredPlaces[0].fact = 'Changed export';
    exported.earlier[0].mission.targets[0].captured = false; exported.earlier[1].sprint.results[0].answer = 'Changed export';
    expect(saved.lastDebrief.samples[0].alt).toBe(5000); expect(saved.lastDebrief.challenge.objectives.climb).toBe(false);
    expect(saved.lastDebrief.flightNotes[0].message).not.toBe('Changed export');
    expect(saved.lastDebrief.discoveredPlaces[0].fact).not.toBe('Changed export');
    expect(saved.flightPracticeHistory[0].mission.targets[0].captured).toBe(true);
    expect(saved.flightPracticeHistory[1].sprint.results[0].answer).toBe('Washington D.C.');
    saved.lastDebrief.samples[1].aoa = 2; saved.flightPracticeHistory[0].mission.targets[1].name = 'Changed save';
    expect(exported.latest.samples[1].aoa).toBe(11.96); expect(exported.earlier[0].mission.targets[1].name).toBe('Second photo');
  });
  it('keeps the same existing record/sample/text retention limits instead of exporting unbounded raw save data', () => {
    const saved = { lastDebrief: flight({ reflection: 'x'.repeat(5000), samples: Array.from({ length: 550 }, (_, index) => row(index * 2)) }),
      flightPracticeHistory: Array.from({ length: 8 }, (_, index) => flight({ attemptId: 'earlier-' + index })) };
    const exported = api.createFlightPracticeJournalExport(saved, date);
    expect(exported.latest.reflection).toHaveLength(4000); expect(exported.latest.samples).toHaveLength(500);
    expect(exported.latest.samples[0].t).toBe(100);
    expect(exported.earlier.map(record => record.attemptId)).toEqual(['earlier-4', 'earlier-5', 'earlier-6', 'earlier-7']);
    expect(saved.lastDebrief.samples).toHaveLength(550); expect(saved.lastDebrief.reflection).toHaveLength(5000);
  });
  it('uses a matching legacy explanation for the latest record without attaching it to unrelated earlier attempts', () => {
    const challenge = api.createFlightChallenge('first_flight', {});
    const old = flight({ challenge, activityId: challenge.id }); delete old.reflection;
    const exported = api.createFlightPracticeJournalExport({ lastDebrief: old,
      challengeReflections: { first_flight: 'Current legacy explanation.' },
      flightPracticeHistory: [flight({ attemptId: 'earlier-challenge', challenge, activityId: challenge.id, reflection: 'Own earlier explanation.' })] }, date);
    expect(exported.latest.reflection).toBe('Current legacy explanation.');
    expect(exported.earlier[0].reflection).toBe('Own earlier explanation.');
  });
  it('keeps missing evidence and invalid dates unknown while making valid offset dates portable', () => {
    const exported = api.createFlightPracticeJournalExport({ lastDebrief: { aircraftId: 'drone', activityId: 'drone_survey' } }, '2026-10-21T13:00:00-04:00');
    expect(exported.exportedAt).toBe(date); expect(exported.latest.mission).toBeNull();
    expect(exported.latest.airborneSeconds).toBeNull(); expect(exported.latest.samples).toEqual([]);
    expect(api.createFlightPracticeJournalExport(null, '2026-02-30T00:00:00Z')).toMatchObject({ exportedAt: null, latest: null, earlier: [] });
  });
  it.each(['mission', 'sprint'])('downloads the entire recovered %s journal even when the latest attempt has no aircraft samples', async kind => {
    await mount({ view: 'flying', lastDebrief: null,
      [kind === 'mission' ? 'flightMission' : 'flightSprint']: savedCheckpoint(kind),
      totalFlightTime: 900, surveysCompleted: 3 });
    expect(latest.view).toBe('debrief'); expect(latest.lastDebrief.samples).toEqual([]);
    expect(exportButton()).toBeTruthy(); expect(exportButton().disabled).toBe(false);
    expect(exportButton().textContent).toBe('Download Flight practice journal (JSON)');
    const original = JSON.stringify(latest), writeCount = writes.length;
    captureDownloads(); exportButton().focus(); expect(document.activeElement).toBe(exportButton());
    await click(exportButton());
    expect(downloads).toHaveLength(1); const download = downloads[0], exported = JSON.parse(download.blob.text);
    expect(download).toMatchObject({ name: 'skyschool-flight-practice-journal.json', connected: true });
    expect(download.blob.type).toBe('application/json');
    expect(exported).toMatchObject({ format: 'skyschool-flight-practice-journal', version: 1, exportedAt: date,
      latest: { attemptId: 'interrupted-' + kind, samples: [] } });
    expect(exported.latest[kind].interrupted).toBe(true);
    expect(kind === 'mission' ? exported.latest.mission.targets.length : exported.latest.sprint.results.length).toBeGreaterThan(0);
    expect(JSON.stringify(latest)).toBe(original); expect(writes).toHaveLength(writeCount); expect(xp).toHaveLength(0);
    expect(document.querySelector('a[download="skyschool-flight-practice-journal.json"]')).toBeNull();
    expect(revoke).not.toHaveBeenCalled(); await act(async () => vi.advanceTimersByTime(1000));
    expect(revoke).toHaveBeenCalledWith(download.href);
  });
  it('includes final explanation edits and every retained attempt regardless of which earlier attempt is being viewed', async () => {
    const history = Array.from({ length: 4 }, (_, index) => flight({ attemptId: 'earlier-' + index, reflection: 'Earlier ' + index }));
    await mount({ flightPracticeHistory: history, debriefHistoryIndex: 2,
      debriefHistorySampleIndex: 1, debriefSampleIndex: 1, debriefCompareIndex: 0 });
    await editReflection('My final explanation before the download.');
    const saved = JSON.parse(JSON.stringify(latest)), writeCount = writes.length;
    captureDownloads(); await click(exportButton());
    const exported = JSON.parse(downloads[0].blob.text);
    expect(exported.latest.reflection).toBe('My final explanation before the download.');
    expect(exported.earlier.map(record => record.reflection)).toEqual(['Earlier 0', 'Earlier 1', 'Earlier 2', 'Earlier 3']);
    expect(latest).toEqual(saved); expect(writes).toHaveLength(writeCount);
    await mount(saved); await click(exportButton());
    expect(JSON.parse(downloads[1].blob.text)).toEqual(exported);
  });
  it('leaves existing current and earlier observation CSV downloads unchanged alongside the full journal download', async () => {
    const current = flight(), previous = flight({ attemptId: 'previous', samples: [row(0, { alt: 1234 })] });
    await mount({ lastDebrief: current, flightPracticeHistory: [previous] }); captureDownloads();
    await click(exportButton());
    await click([...journal().querySelectorAll('button')].find(button => button.textContent === 'Download earlier observations (CSV)'));
    await click([...host.querySelectorAll('button')].find(button => button.textContent.includes('Export Flight Data (CSV)')));
    expect(downloads[0].blob.type).toBe('application/json');
    expect(downloads[1].blob.text).toBe(api.flightEvidenceCsv(previous.samples));
    expect(downloads[1].name).toBe('SkySchool-earlier-flight.csv');
    expect(downloads[2].blob.text).toBe(api.flightEvidenceCsv(current.samples));
    expect(downloads[2].name).toMatch(/^flight_data_.*\.csv$/);
    expect(writes).toHaveLength(0);
  });
});
