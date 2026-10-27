import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host, latest, patch, poke, queue, checks, errors, xp, toasts, blobs, downloads, createURL, revokeURL, anchorClick;
const date = '2026-10-26T12:00:00.000Z';
const scopes = ['current', 'earlier'];
const clone = value => JSON.parse(JSON.stringify(value));
const sample = (t, alt = 5000) => ({ t, lat: 43.646, lon: -70.309, alt, spd: 110, hdg: 90, agl: alt - 76,
  fpm: 0, aoa: 11.96, pitch: -3, bank: 7, throttle: .42, onGround: false, stalling: false, lowAirspeed: false });
const flight = (id = 'current', extra = {}) => ({ attemptId: id, aircraftId: 'cessna172', aircraft: 'Cessna 172 Skyhawk',
  activityId: 'free_flight', startedAirborne: false, investigation: false, endedAt: date, flightTime: 30, sessionTime: 40,
  airborneSeconds: 30, bestStableSeconds: 12, stallSeconds: 0, landings: 1, bestLanding: 120,
  touchdownAirportId: id === 'current' ? 'kpwm' : 'kden', reflection: id + ' explanation.',
  samples: [sample(0, id === 'current' ? 5000 : 4000), sample(2, id === 'current' ? 5010 : 4010)], ...extra });
const history = () => [flight('earlier-a'), flight('earlier-b', { samples: [sample(0, 3000)] })];
const textButton = text => [...host.querySelectorAll('button')].find(node => node.textContent.includes(text));
// Text fallback permits the unchanged baseline to exercise the actual export
// and stale-handler behavior before the new machine-readable selectors exist.
const button = scope => host.querySelector(`[data-flight-observation-export="${scope}"]`)
  || textButton(scope === 'current' ? 'Export Flight Data (CSV)' : 'Download earlier observations (CSV)');
const status = scope => host.querySelector(`[data-flight-observation-export-status="${scope}"]`);
function handler(node, name = 'onClick') { expect(node).toBeTruthy(); return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][name]; }
async function exportNow(scope) { await act(async () => button(scope).click()); }
async function commitAll() { for (let i = 0; queue.length; i++) { expect(i).toBeLessThan(25); await act(async () => queue.shift()()); } }
async function mount(options = {}, seed = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ otherTool: { text: 'Preserve sibling work.' }, flightSim: {
      view: 'debrief', aircraft: 'cessna172', lastDebrief: flight(), flightPracticeHistory: history(), debriefHistoryIndex: 0,
      totalFlightTime: 900, earnedBadges: { mile_high: true }, ...seed } });
    const [, rerender] = React.useState(0);
    latest = data; patch = values => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...values } }));
    poke = () => rerender(n => n + 1);
    const submit = update => {
      const apply = () => setData(previous => {
        if (typeof update !== 'function') return update;
        const before = JSON.stringify(previous), first = update(previous), second = update(previous);
        checks.push(JSON.stringify(previous) === before && JSON.stringify(first) === JSON.stringify(second));
        return second;
      });
      if (options.delayed) queue.push(apply); else apply();
    };
    return tool.render(makeCtx({ toolData: data, setToolData: submit, awardXP: xp, addToast: toasts,
      update: (id, key, value) => submit(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, values) => submit(old => ({ ...old, [id]: { ...old[id], ...values } })),
    }));
  }
  await act(async () => root.render(options.strict ? React.createElement(React.StrictMode, null, React.createElement(App)) : React.createElement(App)));
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(date)); resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  if (process.env.SKYSCHOOL_OBSERVATION_EXPORT_SOURCE) {
    new Function(readFileSync('stem_lab/stem_data_skyschool_geo.js', 'utf8'))();
    new Function(readFileSync(process.env.SKYSCHOOL_OBSERVATION_EXPORT_SOURCE, 'utf8'))();
    tool = window.StemLab._registry.flightSim;
  } else tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
  { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); xp = vi.fn(); toasts = vi.fn(); queue = []; checks = []; blobs = []; downloads = [];
  vi.stubGlobal('Blob', class { constructor(parts, options) { this.text = parts.join(''); this.type = options.type; } });
  createURL = vi.fn(blob => { blobs.push(blob); return 'blob:observation-recovery-' + blobs.length; }); revokeURL = vi.fn();
  const OriginalURL = URL;
  vi.stubGlobal('URL', class extends OriginalURL { static createObjectURL = createURL; static revokeObjectURL = revokeURL; });
  anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() {
    downloads.push({ name: this.download, blob: blobs.at(-1), connected: this.isConnected });
  });
});
afterEach(async () => {
  try {
    if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
    expect(errors).not.toHaveBeenCalled(); expect(xp).not.toHaveBeenCalled(); expect(checks.every(Boolean)).toBe(true);
  } finally { delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); }
});

describe('Sky School observation CSV recovery and ownership', () => {
  it.each(scopes)('exports exact %s telemetry and touchdown context with stable status, focus and once-only cleanup', async scope => {
    await mount({ strict: true }); const before = clone(latest), output = status(scope), action = button(scope); action.focus();
    expect(output).toBeTruthy(); expect(output.textContent).toBe(''); expect(output.getAttribute('role')).toBe('status');
    expect(output.getAttribute('aria-live')).toBe('polite'); expect(output.getAttribute('aria-atomic')).toBe('true');
    await exportNow(scope); await act(async () => poke());
    expect(status(scope)).toBe(output); expect(output.textContent).toMatch(/download.*started/i);
    expect(document.activeElement).toBe(action); expect(latest).toEqual(before); expect(downloads).toHaveLength(1);
    const record = scope === 'current' ? before.flightSim.lastDebrief : before.flightSim.flightPracticeHistory[0];
    expect(downloads[0].blob.text).toBe(api.flightEvidenceCsv(record.samples, record));
    expect(downloads[0].blob.text).toContain('11.96'); expect(downloads[0].blob.text).toContain('FlightBestTouchdownAirportId');
    expect(downloads[0].name).toBe(scope === 'current' ? 'flight_data_2026-10-26.csv' : 'SkySchool-earlier-flight.csv');
    expect(downloads[0].blob.type).toBe(scope === 'current' ? 'text/csv' : 'text/csv;charset=utf-8;');
    expect(downloads[0].connected).toBe(true); expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('a[download$=".csv"]')).toHaveLength(0);
    expect(revokeURL).not.toHaveBeenCalled(); await act(async () => vi.advanceTimersByTime(1000));
    expect(revokeURL).toHaveBeenCalledExactlyOnceWith('blob:observation-recovery-1');
    expect(toasts.mock.calls.flat().join(' ')).not.toMatch(/data exported|download complete|saved/i);
  });

  it.each(scopes.flatMap(scope => ['Blob', 'createObjectURL', 'anchor.click'].map(kind => [scope, kind])))
    ('recovers %s from %s failure and retries with unchanged work and focus', async (scope, kind) => {
      await mount(); const before = clone(latest); button(scope).focus();
      if (kind === 'createObjectURL') createURL.mockImplementationOnce(() => { throw new Error('Download unavailable'); });
      if (kind === 'anchor.click') anchorClick.mockImplementationOnce(() => { throw new Error('Download unavailable'); });
      if (kind === 'Blob') { const WorkingBlob = Blob; let first = true; vi.stubGlobal('Blob', class extends WorkingBlob { constructor(...args) { if (first) { first = false; throw new Error('Download unavailable'); } super(...args); } }); }
      await exportNow(scope);
      expect(button(scope)).toBeTruthy(); expect(latest).toEqual(before); expect(document.activeElement).toBe(button(scope));
      expect(status(scope)?.textContent).toMatch(/could not start/i);
      expect(document.querySelectorAll('a[download$=".csv"]')).toHaveLength(0);
      expect(revokeURL).toHaveBeenCalledTimes(kind === 'anchor.click' ? 1 : 0);
      await exportNow(scope); expect(status(scope).textContent).toMatch(/download.*started/i);
      const record = scope === 'current' ? before.flightSim.lastDebrief : before.flightSim.flightPracticeHistory[0];
      expect(downloads.at(-1).blob.text).toBe(api.flightEvidenceCsv(record.samples, record));
      await act(async () => vi.advanceTimersByTime(1000)); expect(revokeURL).toHaveBeenCalledTimes(kind === 'anchor.click' ? 2 : 1);
    });

  it.each(scopes.flatMap(scope => ['view', 'evidence'].map(kind => [scope, kind])))
    ('rejects a same-batch %s export when %s is replaced first', async (scope, kind) => {
      await mount(); const download = handler(button(scope));
      const values = kind === 'view' ? { view: 'menu' } : scope === 'current'
        ? { lastDebrief: flight('replacement') } : { flightPracticeHistory: [flight('replacement-earlier')] };
      await act(async () => { patch(values); download(); });
      expect(createURL).not.toHaveBeenCalled(); expect(anchorClick).not.toHaveBeenCalled();
      expect(latest.flightSim).toMatchObject(values); expect(status(scope)?.textContent || '').toBe('');
    });

  it('rejects an earlier export when native earlier-flight selection commits in the same batch', async () => {
    await mount(); const download = handler(button('earlier')), select = handler(host.querySelector('#debrief-earlier-flight'), 'onChange');
    await act(async () => { select({ target: { value: '1' } }); download(); });
    expect(latest.flightSim.debriefHistoryIndex).toBe(1); expect(createURL).not.toHaveBeenCalled();
    await exportNow('earlier'); const selected = latest.flightSim.flightPracticeHistory[1];
    expect(downloads[0].blob.text).toBe(api.flightEvidenceCsv(selected.samples, selected));
  });

  it.each(scopes.flatMap(scope => ['view', 'evidence'].map(kind => [scope, kind])))
    ('retires retained %s callbacks across A-to-B-to-A %s changes', async (scope, kind) => {
      await mount(); const original = clone(latest.flightSim), download = handler(button(scope));
      await act(async () => patch(kind === 'view' ? { view: 'menu' } : scope === 'current'
        ? { lastDebrief: flight('replacement') } : { flightPracticeHistory: [flight('replacement-earlier')] }));
      await act(async () => patch(original)); await act(async () => download()); expect(createURL).not.toHaveBeenCalled();
      await exportNow(scope); expect(createURL).toHaveBeenCalledTimes(1);
    });

  it('retires an earlier callback after selection changes away and back', async () => {
    await mount(); const download = handler(button('earlier'));
    await act(async () => patch({ debriefHistoryIndex: 1 })); await act(async () => patch({ debriefHistoryIndex: 0 }));
    await act(async () => download()); expect(createURL).not.toHaveBeenCalled();
    await exportNow('earlier'); expect(downloads[0].blob.text).toBe(api.flightEvidenceCsv(history()[0].samples, history()[0]));
  });

  it.each(['Back to Menu', 'Fly Again'])('blocks both scopes after native %s is queued in a delayed host', async label => {
    await mount({ delayed: true }); const current = handler(button('current')), earlier = handler(button('earlier')), leave = handler(textButton(label));
    await act(async () => { leave(); current(); earlier(); });
    expect(createURL).not.toHaveBeenCalled(); await commitAll(); expect(createURL).not.toHaveBeenCalled();
  });

  it('keeps current and earlier export requests independent in the same turn', async () => {
    await mount(); const before = clone(latest);
    await act(async () => { button('current').click(); button('earlier').click(); });
    expect(downloads).toHaveLength(2); expect(new Set(downloads.map(item => item.name)).size).toBe(2);
    expect(status('current').textContent).toMatch(/download.*started/i); expect(status('earlier').textContent).toMatch(/download.*started/i);
    expect(latest).toEqual(before); await act(async () => vi.advanceTimersByTime(1000)); expect(revokeURL).toHaveBeenCalledTimes(2);
    await act(async () => patch({ debriefHistoryIndex: 1 }));
    expect(status('earlier').textContent).toBe(''); expect(status('current').textContent).toMatch(/download.*started/i);
  });

  it('preserves feedback and valid callbacks through reflection and moment-selection edits outside the CSV scope', async () => {
    await mount(); const current = handler(button('current')), earlier = handler(button('earlier'));
    await act(async () => { current(); earlier(); });
    await act(async () => patch({ lastDebrief: flight('current', { reflection: 'A new current explanation.' }),
      flightPracticeHistory: history().map(record => ({ ...record, reflection: 'A new earlier explanation.' })),
      debriefSampleIndex: 1, debriefCompareIndex: 1, debriefHistorySampleIndex: 1, hostMarker: 'Unrelated' }));
    expect(status('current').textContent).toMatch(/download.*started/i); expect(status('earlier').textContent).toMatch(/download.*started/i);
    await act(async () => { current(); earlier(); }); expect(downloads).toHaveLength(4);
    expect(downloads[0].blob.text).toBe(downloads[2].blob.text); expect(downloads[1].blob.text).toBe(downloads[3].blob.text);
  });

  it.each(scopes)('retires %s feedback permanently when its observation evidence changes', async scope => {
    await mount(); const original = clone(latest.flightSim); await exportNow(scope);
    await act(async () => patch(scope === 'current' ? { lastDebrief: flight('current', { samples: [sample(0, 1000)] }) }
      : { flightPracticeHistory: [flight('earlier-a', { samples: [sample(0, 1000)] }), history()[1]] }));
    expect(status(scope)?.textContent || '').toBe(''); await act(async () => patch(original));
    expect(status(scope).textContent).toBe('');
  });

  it('cleans both outstanding URLs on unmount once and blocks retained callbacks', async () => {
    await mount(); const current = handler(button('current')), earlier = handler(button('earlier'));
    await act(async () => { current(); earlier(); }); expect(createURL).toHaveBeenCalledTimes(2);
    await act(async () => root.unmount()); root = null; expect(revokeURL).toHaveBeenCalledTimes(2);
    await act(async () => { current(); earlier(); vi.advanceTimersByTime(1000); });
    expect(createURL).toHaveBeenCalledTimes(2); expect(revokeURL).toHaveBeenCalledTimes(2); expect(host.textContent).toBe('');
  });

  it('exports selected earlier observations without manufacturing a missing latest review', async () => {
    await mount({}, { lastDebrief: null, debriefHistoryIndex: 1 }); expect(button('current')).toBeUndefined();
    const before = clone(latest); await exportNow('earlier');
    const record = before.flightSim.flightPracticeHistory[1]; expect(downloads[0].blob.text).toBe(api.flightEvidenceCsv(record.samples, record));
    expect(latest).toEqual(before); expect(status('earlier').textContent).toMatch(/download.*started/i);
  });
});
