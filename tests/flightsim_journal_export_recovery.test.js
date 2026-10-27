import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, patch, poke, queue, checks, errors, xp, blobs, createURL, revokeURL, anchorClick;
const date = '2026-10-26T12:00:00.000Z';
const clone = value => JSON.parse(JSON.stringify(value));
const flight = (id = 'current', extra = {}) => ({ attemptId: id, aircraftId: 'cessna172', aircraft: 'Cessna 172 Skyhawk',
  activityId: 'free_flight', startedAirborne: false, investigation: false, endedAt: date, flightTime: 30, sessionTime: 40,
  airborneSeconds: 30, bestStableSeconds: 12, stallSeconds: 0, landings: 0, reflection: id + ' explanation.',
  samples: [{ t: 0, lat: 43.646, lon: -70.309, alt: 5000, spd: 110, hdg: 90, agl: 4924, fpm: 0, aoa: 11.96,
    pitch: -3, bank: 7, throttle: .42, onGround: false, stalling: false, lowAirspeed: false }], ...extra });
const button = () => host.querySelector('[data-flight-journal-export]');
const status = () => host.querySelector('[data-flight-journal-export-status]');
const textButton = text => [...host.querySelectorAll('button')].find(node => node.textContent.includes(text));
function handler(node, name = 'onClick') { expect(node).toBeTruthy(); return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][name]; }
const reflection = () => handler(host.querySelector('#debrief-evidence-explanation'), 'onChange');
async function exportNow() { await act(async () => button().click()); }
async function commitAll() { for (let i = 0; queue.length; i++) { expect(i).toBeLessThan(25); await act(async () => queue.shift()()); } }
async function mount(options = {}, seed = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ otherTool: { text: 'Preserve sibling work.' }, flightSim: {
      view: 'debrief', aircraft: 'cessna172', lastDebrief: flight(), flightPracticeHistory: [flight('earlier')],
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
    return tool.render(makeCtx({ toolData: data, setToolData: submit, awardXP: xp,
      update: (id, key, value) => submit(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, values) => submit(old => ({ ...old, [id]: { ...old[id], ...values } })),
    }));
  }
  await act(async () => root.render(options.strict ? React.createElement(React.StrictMode, null, React.createElement(App)) : React.createElement(App)));
}
const exported = () => JSON.parse(blobs.at(-1).text);
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(date)); resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  if (process.env.SKYSCHOOL_JOURNAL_EXPORT_SOURCE) {
    new Function(readFileSync('stem_lab/stem_data_skyschool_geo.js', 'utf8'))();
    new Function(readFileSync(process.env.SKYSCHOOL_JOURNAL_EXPORT_SOURCE, 'utf8'))();
    tool = window.StemLab._registry.flightSim;
  } else tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
  { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); xp = vi.fn(); queue = []; checks = []; blobs = [];
  vi.stubGlobal('Blob', class { constructor(parts, options) { this.text = parts.join(''); this.type = options.type; } });
  createURL = vi.fn(blob => { blobs.push(blob); return 'blob:journal-recovery-' + blobs.length; }); revokeURL = vi.fn();
  const OriginalURL = URL;
  vi.stubGlobal('URL', class extends OriginalURL { static createObjectURL = createURL; static revokeObjectURL = revokeURL; });
  anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() {
    expect(this.isConnected).toBe(true); expect(this.download).toBe('skyschool-flight-practice-journal.json');
  });
});
afterEach(async () => {
  try {
    if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
    expect(errors).not.toHaveBeenCalled(); expect(xp).not.toHaveBeenCalled(); expect(checks.every(Boolean)).toBe(true);
  } finally { delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); }
});

describe('Sky School journal export recovery and ownership', () => {
  it('keeps a stable polite status, focus and full journal while cleaning resources once', async () => {
    await mount({ strict: true }); const output = status(), before = clone(latest); button().focus();
    expect(output).toBeTruthy(); expect(output.textContent).toBe(''); expect(output.getAttribute('role')).toBe('status');
    expect(output.getAttribute('aria-live')).toBe('polite'); expect(output.getAttribute('aria-atomic')).toBe('true');
    await exportNow(); await act(async () => poke());
    expect(status()).toBe(output); expect(output.textContent).toBe('Download started. Check your browser’s downloads for the file.');
    expect(latest).toEqual(before); expect(document.activeElement).toBe(button());
    expect(exported()).toEqual(api.createFlightPracticeJournalExport(before.flightSim, date));
    expect(createURL).toHaveBeenCalledTimes(1); expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('a[download="skyschool-flight-practice-journal.json"]')).toHaveLength(0);
    expect(revokeURL).not.toHaveBeenCalled(); await act(async () => vi.advanceTimersByTime(1000));
    expect(revokeURL).toHaveBeenCalledExactlyOnceWith('blob:journal-recovery-1');
  });

  it.each(['Blob', 'createObjectURL', 'anchor.click'])('recovers from %s failure and retries without losing work or focus', async kind => {
    await mount(); const before = clone(latest); button().focus();
    if (kind === 'createObjectURL') createURL.mockImplementationOnce(() => { throw new Error('Download unavailable'); });
    if (kind === 'anchor.click') anchorClick.mockImplementationOnce(() => { throw new Error('Download unavailable'); });
    if (kind === 'Blob') { const WorkingBlob = Blob; let first = true; vi.stubGlobal('Blob', class extends WorkingBlob { constructor(...args) { if (first) { first = false; throw new Error('Download unavailable'); } super(...args); } }); }
    await exportNow();
    expect(button()).toBeTruthy(); expect(latest).toEqual(before); expect(document.activeElement).toBe(button());
    expect(status().textContent).toBe('The download could not start. Your flight journal is still here. Try the download again.');
    expect(document.querySelectorAll('a[download="skyschool-flight-practice-journal.json"]')).toHaveLength(0);
    expect(revokeURL).toHaveBeenCalledTimes(kind === 'anchor.click' ? 1 : 0);
    await exportNow(); expect(status().textContent).toMatch(/^Download started/);
    expect(exported()).toEqual(api.createFlightPracticeJournalExport(before.flightSim, date));
    await act(async () => vi.advanceTimersByTime(1000)); expect(revokeURL).toHaveBeenCalledTimes(kind === 'anchor.click' ? 2 : 1);
  });

  it.each([false, true])('captures the newest same-turn reflection with a delayed host: %s', async delayed => {
    await mount({ delayed }); const edit = reflection(), download = handler(button());
    await act(async () => { edit({ target: { value: 'Latest explanation before download.' } }); download(); });
    expect(exported().latest.reflection).toBe('Latest explanation before download.');
    expect(exported().earlier[0].reflection).toBe('earlier explanation.');
    expect(status().textContent).toMatch(/^Download started/);
    expect(createURL).toHaveBeenCalledTimes(1); await commitAll(); expect(createURL).toHaveBeenCalledTimes(1);
    expect(status().textContent).toMatch(/^Download started/);
    expect(latest.flightSim.lastDebrief.reflection).toBe('Latest explanation before download.');
  });

  it.each(['view', 'latest', 'history', 'reflection'])('rejects a same-batch foreign %s replacement before download starts', async kind => {
    await mount(); const download = handler(button());
    const values = kind === 'view' ? { view: 'menu' } : kind === 'latest' ? { lastDebrief: flight('replacement') }
      : kind === 'history' ? { flightPracticeHistory: [flight('replacement-earlier')] }
        : { lastDebrief: flight('current', { reflection: 'Incoming explanation.' }) };
    await act(async () => { patch(values); download(); });
    expect(createURL).not.toHaveBeenCalled(); expect(anchorClick).not.toHaveBeenCalled();
    expect(latest.flightSim).toMatchObject(values); expect(status()?.textContent || '').toBe('');
  });

  it('keeps a failed export message through a pending reflection receipt, then retires it on later accepted edits', async () => {
    await mount({ delayed: true }); const edit = reflection(), download = handler(button());
    createURL.mockImplementationOnce(() => { throw new Error('Download unavailable'); });
    await act(async () => { edit({ target: { value: 'My pending explanation.' } }); download(); });
    const output = status(); expect(output.textContent).toMatch(/^The download could not start/);
    await commitAll(); expect(status()).toBe(output); expect(output.textContent).toMatch(/^The download could not start/);
    // The original accepted prefix must no longer be allowed after receipt.
    await act(async () => patch({ lastDebrief: flight() })); expect(output.textContent).toBe('');
    await act(async () => patch({ lastDebrief: flight('current', { reflection: 'My pending explanation.' }) }));
    expect(output.textContent).toBe('');
    await exportNow(); expect(status().textContent).toMatch(/^Download started/);
    expect(exported().latest.reflection).toBe('My pending explanation.');
  });

  it.each(['Back to Menu', 'Fly Again'])('rejects export after native %s is queued in a delayed host', async label => {
    await mount({ delayed: true }); const download = handler(button()), leave = handler(textButton(label));
    await act(async () => { leave(); download(); });
    expect(createURL).not.toHaveBeenCalled(); await commitAll(); expect(createURL).not.toHaveBeenCalled();
  });

  it.each(['view', 'latest', 'history'])('retires callbacks across a committed A-to-B-to-A %s change', async kind => {
    await mount(); const original = clone(latest.flightSim), download = handler(button());
    await act(async () => patch(kind === 'view' ? { view: 'menu' } : kind === 'latest' ? { lastDebrief: flight('replacement') } : { flightPracticeHistory: [flight('replacement-earlier')] }));
    await act(async () => patch(original)); await act(async () => download()); expect(createURL).not.toHaveBeenCalled();
    await exportNow(); expect(createURL).toHaveBeenCalledTimes(1);
  });

  it.each(['view', 'latest', 'history', 'reflection'])('retires completed feedback after %s changes and does not restore it on return', async kind => {
    await mount(); const original = clone(latest.flightSim); await exportNow(); expect(status().textContent).toMatch(/^Download started/);
    await act(async () => patch(kind === 'view' ? { view: 'menu' } : kind === 'latest' ? { lastDebrief: flight('replacement') }
      : kind === 'history' ? { flightPracticeHistory: [flight('replacement-earlier')] } : { lastDebrief: flight('current', { reflection: 'A revised explanation.' }) }));
    await act(async () => patch(original)); expect(status().textContent).toBe('');
  });

  it('keeps valid feedback through unrelated metadata and observation-selection changes', async () => {
    await mount(); await exportNow(); const output = status();
    await act(async () => patch({ debriefSampleIndex: 0, debriefHistoryIndex: 0, hostMarker: 'unrelated' }));
    expect(status()).toBe(output); expect(output.textContent).toMatch(/^Download started/); expect(createURL).toHaveBeenCalledTimes(1);
  });

  it('cleans an outstanding URL on unmount once and blocks its retained callback', async () => {
    await mount(); const download = handler(button()); await exportNow();
    await act(async () => root.unmount()); root = null;
    expect(revokeURL).toHaveBeenCalledExactlyOnceWith('blob:journal-recovery-1');
    await act(async () => { download(); vi.advanceTimersByTime(1000); });
    expect(createURL).toHaveBeenCalledTimes(1); expect(revokeURL).toHaveBeenCalledTimes(1); expect(host.textContent).toBe('');
  });

  it('exports retained earlier work when the latest record is missing', async () => {
    await mount({}, { lastDebrief: null }); await exportNow();
    expect(exported().latest).toBeNull(); expect(exported().earlier[0].attemptId).toBe('earlier');
    expect(status().textContent).toMatch(/^Download started/);
  });
});
