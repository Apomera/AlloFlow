import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host, latest, patch, poke, queue, replayResults, errors, awardXP, celebrate, blobs, createURL, revokeURL, anchorClick;
const initial = () => api.stallInvestigationRecord({ phase: 'experiment', prediction: 'angle', hypothesis: 'Keep my current explanation.',
  airspeed: 130, altitude: 5000, aoa: 8, observations: [{ trialNumber: 41, airspeed: 130, altitude: 5000, aoa: 8 }],
  attempts: [{ phase: 'review', hypothesis: 'Keep my earlier attempt.', completedAt: '2026-10-22T12:00:00Z' }] });
const clone = value => JSON.parse(JSON.stringify(value));
const button = () => host.querySelector('[data-stall-investigation-export] button');
const status = () => host.querySelector('[data-stall-export-status]');
function handler(node, name = 'onClick') { return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][name]; }
async function exportNow() { await act(async () => button().click()); }
async function input(value) { await act(async () => handler(host.querySelector('[data-investigation-number="airspeed"]'), 'onChange')({ target: { value: String(value) } })); }
async function commitAll() {
  for (let count = 0; queue.length; count++) { expect(count).toBeLessThan(20); await act(async () => queue.shift()()); }
}
async function mount(options = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'stallHunt', stallInvestigation: initial(), unrelated: 'Keep other settings.' }, otherTool: { text: 'Keep other work.' } });
    const [, rerender] = React.useState(0);
    latest = data; patch = update => setData(previous => ({ ...previous, flightSim: { ...previous.flightSim, ...update } }));
    poke = () => rerender(value => value + 1);
    const submit = update => {
      const apply = () => setData(previous => {
        const before = JSON.stringify(previous), first = update(previous), second = update(previous);
        replayResults.push({ same: JSON.stringify(first) === JSON.stringify(second), immutable: before === JSON.stringify(previous) });
        return second;
      });
      if (options.delayed) queue.push(apply); else apply();
    };
    return tool.render(makeCtx({ toolData: data, setToolData: submit, awardXP, celebrate,
      update: (id, key, value) => submit(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, values) => submit(previous => ({ ...previous, [id]: { ...previous[id], ...values } })),
    }));
  }
  await act(async () => root.render(options.strict ? React.createElement(React.StrictMode, null, React.createElement(App)) : React.createElement(App)));
}
const exported = () => JSON.parse(blobs.at(-1).text);
beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  if (process.env.SKYSCHOOL_INVESTIGATION_EXPORT_SOURCE) {
    new Function(readFileSync('stem_lab/stem_data_skyschool_geo.js', 'utf8'))();
    new Function(readFileSync(process.env.SKYSCHOOL_INVESTIGATION_EXPORT_SOURCE, 'utf8'))();
    tool = window.StemLab._registry.flightSim;
  } else tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); awardXP = vi.fn(); celebrate = vi.fn();
  queue = []; replayResults = []; blobs = [];
  vi.stubGlobal('Blob', class { constructor(parts, options) { this.text = parts.join(''); this.type = options.type; } });
  createURL = vi.fn(blob => { blobs.push(blob); return 'blob:investigation-export-' + blobs.length; }); revokeURL = vi.fn();
  const OriginalURL = URL;
  vi.stubGlobal('URL', class extends OriginalURL { static createObjectURL = createURL; static revokeObjectURL = revokeURL; });
  anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() {
    expect(this.isConnected).toBe(true); expect(this.download).toBe('skyschool-stall-investigation.json');
  });
});
afterEach(async () => {
  try {
    if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
    expect(errors).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
    expect(replayResults.every(item => item.same && item.immutable)).toBe(true);
  } finally {
    delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  }
});

describe('Sky School recoverable investigation downloads', () => {
  it('keeps a persistent, initially empty status next to Export without moving focus or claiming saved/completed work', async () => {
    await mount(); const output = status(), before = clone(latest); button().focus();
    expect(output).toBeTruthy(); expect(output.textContent).toBe(''); expect(output.getAttribute('role')).toBe('status');
    expect(output.getAttribute('aria-live')).toBe('polite'); expect(output.getAttribute('aria-atomic')).toBe('true');
    await exportNow();
    expect(status()).toBe(output); expect(output.textContent).toBe('Download started. Check your browser’s downloads for the file.');
    expect(document.activeElement).toBe(button()); expect(latest).toEqual(before); expect(exported()).toEqual(before.flightSim.stallInvestigation);
    expect(document.querySelectorAll('a[download="skyschool-stall-investigation.json"]')).toHaveLength(0);
    expect(revokeURL).not.toHaveBeenCalled(); await act(async () => vi.advanceTimersByTime(1000));
    expect(revokeURL).toHaveBeenCalledExactlyOnceWith('blob:investigation-export-1');
    expect(output.textContent).toMatch(/^Download started/);
  });

  it.each(['createObjectURL', 'anchor.click', 'Blob'])('recovers from native %s failure, preserves work and focus, and permits retry', async failure => {
    await mount(); const before = clone(latest); button().focus();
    if (failure === 'createObjectURL') createURL.mockImplementationOnce(() => { throw new Error('Download unavailable'); });
    if (failure === 'anchor.click') anchorClick.mockImplementationOnce(() => { throw new Error('Download unavailable'); });
    if (failure === 'Blob') { const WorkingBlob = Blob; let first = true; vi.stubGlobal('Blob', class extends WorkingBlob { constructor(...args) { if (first) { first = false; throw new Error('Download unavailable'); } super(...args); } }); }
    await exportNow();
    expect(host.querySelector('#skyschool-investigation')).toBeTruthy(); expect(latest).toEqual(before);
    expect(document.activeElement).toBe(button()); expect(status().textContent).toBe('The download could not start. Your investigation is still here. Try Export investigation again.');
    expect(document.querySelectorAll('a[download="skyschool-stall-investigation.json"]')).toHaveLength(0);
    expect(revokeURL).toHaveBeenCalledTimes(failure === 'anchor.click' ? 1 : 0);
    await exportNow(); expect(status().textContent).toMatch(/^Download started/); expect(exported()).toEqual(before.flightSim.stallInvestigation);
    await act(async () => vi.advanceTimersByTime(1000)); expect(revokeURL).toHaveBeenCalledTimes(failure === 'anchor.click' ? 2 : 1);
  });

  it('retains a visible numeric draft after a failed download and exports its latest accepted value on retry', async () => {
    await mount(); await input('185'); const before = clone(latest);
    createURL.mockImplementationOnce(() => { throw new Error('Download unavailable'); }); await exportNow();
    expect(host.querySelector('[data-investigation-number="airspeed"]').value).toBe('185');
    expect(latest.flightSim.stallInvestigation).toEqual({ ...before.flightSim.stallInvestigation, airspeed: 185 });
    await input('195'); await exportNow(); expect(exported().airspeed).toBe(195); expect(exported().hypothesis).toBe(before.flightSim.stallInvestigation.hypothesis);
    expect(exported().attempts).toEqual(before.flightSim.stallInvestigation.attempts); expect(latest.otherTool).toEqual(before.otherTool);
  });

  it('waits for a delayed number receipt and downloads once under Strict Mode and updater replay', async () => {
    await mount({ delayed: true, strict: true }); await input('185'); await exportNow();
    expect(createURL).not.toHaveBeenCalled(); expect(status().textContent).toBe('');
    await act(async () => poke()); await commitAll(); await act(async () => poke());
    expect(createURL).toHaveBeenCalledTimes(1); expect(anchorClick).toHaveBeenCalledTimes(1); expect(exported().airspeed).toBe(185);
    expect(status().textContent).toMatch(/^Download started/);
  });

  it.each(['attempt', 'view', 'phase', 'draft'])('retires a pending export after %s changes, without stale download or feedback', async kind => {
    await mount({ delayed: true }); await input('185'); await exportNow();
    expect(createURL).not.toHaveBeenCalled();
    if (kind === 'draft') await input('195');
    else await act(async () => patch(kind === 'view' ? { view: 'menu' } : { stallInvestigation: { ...initial(), ...(kind === 'phase' ? { phase: 'explain' } : { hypothesis: 'A newer authoritative attempt.' }) } }));
    await commitAll(); expect(createURL).not.toHaveBeenCalled();
    if (kind === 'view') await act(async () => patch({ view: 'stallHunt' }));
    expect(status().textContent).toBe('');
    if (kind === 'draft') expect(host.querySelector('[data-investigation-number="airspeed"]').value).toBe('195');
    if (kind === 'attempt') expect(latest.flightSim.stallInvestigation.hypothesis).toBe('A newer authoritative attempt.');
  });

  it.each(['attempt', 'view', 'phase'])('clears completed export feedback after %s changes', async kind => {
    await mount(); await exportNow(); expect(status().textContent).toMatch(/^Download started/);
    await act(async () => patch(kind === 'view' ? { view: 'menu' } : { stallInvestigation: { ...initial(), ...(kind === 'phase' ? { phase: 'explain' } : { hypothesis: 'Replacement work.' }) } }));
    if (kind === 'view') await act(async () => patch({ view: 'stallHunt' }));
    expect(status().textContent).toBe('');
  });

  it('revokes an outstanding URL on unmount once and ignores a retained export handler', async () => {
    await mount(); const staleExport = handler(button()); await exportNow();
    await act(async () => root.unmount()); root = null;
    expect(revokeURL).toHaveBeenCalledExactlyOnceWith('blob:investigation-export-1');
    await act(async () => { staleExport(); vi.advanceTimersByTime(1000); });
    expect(createURL).toHaveBeenCalledTimes(1); expect(revokeURL).toHaveBeenCalledTimes(1); expect(host.textContent).toBe('');
  });

  it('does not export or announce an unmounted pending request', async () => {
    await mount({ delayed: true }); await input('185'); await exportNow();
    await act(async () => root.unmount()); root = null; await commitAll();
    expect(createURL).not.toHaveBeenCalled(); expect(revokeURL).not.toHaveBeenCalled(); expect(host.textContent).toBe('');
  });
});
