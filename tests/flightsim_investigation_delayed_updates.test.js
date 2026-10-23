import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host, latest, externalPatch, poke, queue, replayResults, errors, awardXP, frameCallback, wallTime;
const hooks = () => window.__testHooks.flightSim;
const clone = value => JSON.parse(JSON.stringify(value));
const evidence = start => [{ trialNumber: start, airspeed: 130, altitude: 5000, aoa: 8 },
  { trialNumber: start + 1, airspeed: 130, altitude: 5000, aoa: 20 }, { trialNumber: start + 2, airspeed: 80, altitude: 5000, aoa: 20 }];
const inquiry = (owner = 'A', patch = {}) => api.stallInvestigationRecord({ phase: 'experiment', prediction: 'angle',
  hypothesis: owner + ' current idea', startingIdea: { version: 1, status: 'committed', prediction: 'speed', hypothesis: owner + ' original idea' },
  airspeed: owner === 'A' ? 130 : 185, altitude: owner === 'A' ? 5000 : 9000, aoa: owner === 'A' ? 8 : 12,
  observations: evidence(owner === 'A' ? 41 : 171), explanation: owner + ' explanation',
  transferChoice: 'stall', transferAnswer: 'stall', transferAttempts: 2, completedAt: '2026-10-22T12:00:00.000Z', ...patch });
const current = () => latest.stallInvestigation;
function button(label) { const node = [...host.querySelectorAll('button')].find(node => node.textContent === label); expect(node, label).toBeTruthy(); return node; }
function handler(node, name = 'onClick') {
  expect(node).toBeTruthy(); const key = Object.keys(node).find(key => key.startsWith('__reactProps$')); expect(key).toBeTruthy(); return node[key][name];
}
const event = value => ({ target: { value: String(value) } });
const change = selector => handler(host.querySelector(selector), 'onChange');
async function action(label) { await act(async () => button(label).click()); }
async function input(selector, value) { await act(async () => change(selector)(event(value))); }
async function mount(saved = inquiry(), options = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'stallHunt', stallInvestigation: saved,
      stallCompareFirst: 0, stallCompareSecond: 2, stallHistoryIndex: 0, stallHistoryPracticeSampleIndex: 0,
      stallPracticeSampleIndex: 0, stallPreparedComparison: null, hostMarker: 'A', tutorialCue: null,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true, railCollapsed: false, aircraft: 'cessna172',
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) }, otherTool: { writing: 'Keep unrelated writing' } });
    const [, renderLocal] = React.useState(0);
    latest = data.flightSim; poke = () => renderLocal(value => value + 1);
    externalPatch = patch => setData(previous => ({ ...previous, flightSim: { ...previous.flightSim, ...patch } }));
    const submit = update => queue.push(() => setData(previous => {
      let next;
      if (!options.replay) next = typeof update === 'function' ? update(previous) : update;
      else {
        const before = JSON.stringify(previous), first = update(previous), second = update(previous);
        replayResults.push({ same: JSON.stringify(first) === JSON.stringify(second), immutable: before === JSON.stringify(previous) }); next = second;
      }
      // A connected host may normalize its saved record after accepting the
      // transaction. Preserve the root proof while replacing record identity.
      if (options.cloneRecordAtCommit && next !== previous && next.flightSim.stallInvestigation) {
        return { ...next, flightSim: { ...next.flightSim, stallInvestigation: clone(next.flightSim.stallInvestigation) } };
      }
      return next;
    }));
    return tool.render(makeCtx({ toolData: data, setToolData: submit, awardXP,
      update: (id, key, value) => submit(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => submit(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  const app = React.createElement(App);
  await act(async () => root.render(options.strict ? React.createElement(React.StrictMode, null, app) : app));
}
async function commit(count = 1) {
  expect(queue.length).toBeGreaterThanOrEqual(count);
  const pending = queue.splice(0, count); await act(async () => pending.forEach(apply => apply()));
}
async function commitAll() {
  for (let count = 0; queue.length; count++) { expect(count).toBeLessThan(40); await commit(); }
}
async function foreign(patch = {}, extra = {}) {
  const replacement = { stallInvestigation: inquiry('B', { phase: current().phase, ...patch }), hostMarker: 'B authoritative',
    stallCompareFirst: 2, stallCompareSecond: 0, stallPreparedComparison: null, ...extra };
  const expected = clone({ ...latest, ...replacement }); await act(async () => externalPatch(replacement));
  expect(latest).toEqual(expected); return expected;
}
function noRewards() { expect(awardXP).not.toHaveBeenCalled(); expect(replayResults.every(item => item.same && item.immutable)).toBe(true); }
async function launched(options = {}) {
  await mount(inquiry('A', { phase: 'transfer', flight: null }), options); await action('Try flight practice');
  expect(hooks().flyingRef.current).toBe(false); await commitAll();
  expect(latest.view).toBe('flying'); expect(hooks().flyingRef.current).toBe(true); expect(current().flight.status).toBe('active');
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-22T12:00:00.000Z'));
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  queue = []; replayResults = []; frameCallback = null; wallTime = 1000;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function() {
    return new Proxy({ canvas: this, measureText: text => ({ width: String(text).length * 6 }),
      createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) }, {
      get(target, key) { return key in target ? target[key] : () => {}; }, set(target, key, value) { target[key] = value; return true; },
    });
  });
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); awardXP = vi.fn();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School delayed investigation host acknowledgments', () => {
  it('preserves pending native control and recording chains through local rerenders and prefix acknowledgments', async () => {
    await mount(inquiry(), { replay: true }); const original = clone(current());
    await act(async () => { change('#trial-airspeed')(event(180)); change('#trial-altitude')(event(6500)); change('#trial-aoa')(event(20)); handler(button('Record observation'))(); });
    expect(current()).toEqual(original); await act(async () => poke());
    await act(async () => { change('#trial-aoa')(event(8)); handler(button('Record observation'))(); });
    await commit(2); expect(current()).toMatchObject({ airspeed: 180, altitude: 6500 });
    await commitAll();
    expect(current().observations.slice(-2)).toMatchObject([{ trialNumber: 44, airspeed: 180, altitude: 6500, aoa: 20 }, { trialNumber: 45, airspeed: 180, altitude: 6500, aoa: 8 }]);
    expect(current().nextTrialNumber).toBe(46); expect(current().startingIdea).toEqual(original.startingIdea); noRewards();
  });

  it('accepts a newer native writing edit while an earlier write is only partially acknowledged', async () => {
    await mount(inquiry('A', { phase: 'explain' }), { replay: true });
    await input('#stall-explanation', 'First pending explanation'); await input('#stall-explanation', 'Second pending explanation');
    expect(current().explanation).toBe('A explanation'); await act(async () => poke());
    await commit(); expect(current().explanation).toBe('First pending explanation');
    await input('#stall-explanation', 'Third final explanation'); await commitAll();
    expect(current().explanation).toBe('Third final explanation'); expect(current().startingIdea.hypothesis).toBe('A original idea'); noRewards();
  });

  it('keeps pre-trial native edits and the one-time original when Prediction host writes are delayed', async () => {
    await mount(api.stallInvestigationRecord({ startingIdea: { version: 1, status: 'pending' } }), { replay: true });
    await act(async () => { change('input[value="speed"]')(); change('#stall-hypothesis')(event('My final idea before evidence')); handler(button('Continue to trials'))(); });
    expect(current().phase).toBe('predict'); await commit(); expect(current().prediction).toBe('speed');
    await commitAll(); expect(current()).toMatchObject({ phase: 'experiment', hypothesis: 'My final idea before evidence',
      startingIdea: { version: 1, status: 'committed', prediction: 'speed', hypothesis: 'My final idea before evidence' } }); noRewards();
  });

  it('waits for the actual phase commit before moving phase focus', async () => {
    await mount(inquiry('A', { phase: 'explain' })); const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    await action('Continue to transfer'); await act(async () => vi.advanceTimersByTime(100));
    expect(current().phase).toBe('explain'); expect(focus.mock.instances.filter(node => node.id === 'stall-phase-title')).toHaveLength(0);
    await commitAll(); await act(async () => vi.advanceTimersByTime(0));
    expect(current().phase).toBe('transfer'); expect(focus.mock.instances.filter(node => node.id === 'stall-phase-title')).toHaveLength(1);
  });

  it('does not acknowledge a delayed no-op receipt on a local render or move focus after foreign replacement', async () => {
    await mount(inquiry(), { strict: true, replay: true });
    await act(async () => externalPatch({ stallCompareFirst: 0, stallCompareSecond: 1 }));
    const receipt = host.querySelector('[data-stall-inspect-pair="angle"]'); receipt.focus();
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    await act(async () => receipt.click()); expect(queue).toHaveLength(1);
    await act(async () => poke()); await act(async () => vi.advanceTimersByTime(100));
    expect(document.activeElement).toBe(receipt);
    expect(focus.mock.instances.filter(node => node.id === 'stall-trial-comparison-title')).toHaveLength(0);
    const expected = await foreign(); const target = host.querySelector('[data-investigation-number="airspeed"]'); target.focus();
    await commitAll(); await act(async () => vi.advanceTimersByTime(100));
    expect(latest).toEqual(expected); expect(document.activeElement).toBe(target);
    expect(focus.mock.instances.filter(node => node.id === 'stall-trial-comparison-title')).toHaveLength(0); noRewards();
  });

  it.each([false, true])('waits for a pending writing receipt before export and respects foreign replacement %s', async replace => {
    await mount(inquiry('A', { phase: 'explain' }), { strict: true, replay: true });
    const downloads = [], OriginalURL = URL;
    vi.stubGlobal('Blob', class { constructor(parts) { this.text = parts.join(''); } });
    vi.stubGlobal('URL', class extends OriginalURL {
      static createObjectURL(blob) { downloads.push(blob); return 'blob:delayed-investigation'; }
      static revokeObjectURL() {}
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await input('#stall-explanation', 'A final explanation pending host acknowledgment');
    await action('Export investigation'); await act(async () => poke());
    await act(async () => vi.advanceTimersByTime(100));
    expect(current().explanation).toBe('A explanation'); expect(downloads).toHaveLength(0);
    const expected = replace ? await foreign({ phase: 'explain' }) : null;
    await commitAll(); await act(async () => vi.advanceTimersByTime(100));
    if (replace) { expect(downloads).toHaveLength(0); expect(latest).toEqual(expected); }
    else {
      expect(downloads).toHaveLength(1); expect(JSON.parse(downloads[0].text)).toEqual(api.stallInvestigationRecord(current()));
      expect(current().explanation).toBe('A final explanation pending host acknowledgment');
      expect(current().phase).toBe('explain'); expect(current().completedAt).toBeNull();
    }
    noRewards();
  });

  it.each(['record', 'phase', 'menu', 'launch'])('rejects delayed A %s when authoritative B commits before its host write', async kind => {
    const phase = kind === 'phase' || kind === 'menu' ? 'explain' : kind === 'launch' ? 'transfer' : 'experiment';
    await mount(inquiry('A', { phase, flight: null }), { strict: true, replay: true });
    await action(kind === 'record' ? 'Record observation' : kind === 'phase' ? 'Continue to transfer' : kind === 'menu' ? '← Back to menu' : 'Try flight practice');
    expect(queue.length).toBeGreaterThan(0); expect(hooks().flyingRef.current).toBe(false);
    const expected = await foreign({ phase, flight: null });
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    await commitAll(); await act(async () => vi.advanceTimersByTime(100));
    expect(latest).toEqual(expected); expect(hooks().flyingRef.current).toBe(false); expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.body); noRewards();
  });

  it('keeps a newer numeric draft while older committed conditions and observations are acknowledged', async () => {
    await mount(inquiry(), { replay: true }); await input('[data-investigation-number="airspeed"]', 80); await action('Record observation');
    await input('[data-investigation-number="airspeed"]', 120); expect(current().airspeed).toBe(130);
    await commit(); expect(current().airspeed).toBe(80); expect(host.querySelector('[data-investigation-number="airspeed"]').value).toBe('120');
    await commitAll(); expect(host.querySelector('[data-investigation-number="airspeed"]').value).toBe('120');
    await action('Record observation'); await commitAll();
    expect(current().observations.slice(-2)).toMatchObject([{ trialNumber: 44, airspeed: 80 }, { trialNumber: 45, airspeed: 120 }]);
    expect(current().nextTrialNumber).toBe(46); noRewards();
  });

  it('preserves the native completion timestamp through delayed and replayed host application', async () => {
    await mount(inquiry('A', { phase: 'transfer', completedAt: null }), { strict: true, replay: true });
    const original = clone(current()); await action('Complete investigation'); vi.setSystemTime(new Date('2026-10-22T12:10:00.000Z'));
    await commitAll(); expect(current().phase).toBe('review'); expect(current().completedAt).toBe('2026-10-22T12:00:00.000Z');
    expect(current().observations).toEqual(original.observations); expect(current().startingIdea).toEqual(original.startingIdea); noRewards();
  });

  it('initializes guided flight once after committed ownership, before passive recovery, with no launch writeback', async () => {
    await mount(inquiry('A', { phase: 'transfer', flight: null }), { strict: true, replay: true });
    await action('Try flight practice'); await act(async () => poke());
    expect(hooks().flyingRef.current).toBe(false); expect(requestAnimationFrame).not.toHaveBeenCalled();
    await commitAll(); expect(queue).toHaveLength(0); expect(latest.view).toBe('flying'); expect(hooks().flyingRef.current).toBe(true);
    expect(hooks().flightRef.current).toMatchObject({ altitude: 5000, onGround: false });
    expect(current().flight).toMatchObject({ status: 'active', samples: [] }); expect(latest.lastDebrief).toBeUndefined();
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1); noRewards();
  });

  it('initializes guided flight only after the host accepts and canonically clones its launch record', async () => {
    await mount(inquiry('A', { phase: 'transfer', flight: null }), { strict: true, replay: true, cloneRecordAtCommit: true });
    await action('Try flight practice'); await act(async () => poke());
    expect(latest.view).toBe('stallHunt'); expect(hooks().flyingRef.current).toBe(false);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    await commitAll();
    expect(latest.view).toBe('flying'); expect(hooks().flyingRef.current).toBe(true);
    expect(hooks().flightRef.current).toMatchObject({ altitude: 5000, onGround: false });
    expect(current().flight).toMatchObject({ status: 'active', samples: [] });
    expect(current().startingIdea.hypothesis).toBe('A original idea'); expect(queue).toHaveLength(0);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1); expect(latest.lastDebrief).toBeUndefined(); noRewards();
  });

  it('exports a numeric draft once after the host accepts and canonically clones the committed record', async () => {
    await mount(inquiry(), { strict: true, replay: true, cloneRecordAtCommit: true });
    const before = clone(current()), downloads = [], OriginalURL = URL;
    vi.stubGlobal('Blob', class { constructor(parts) { this.text = parts.join(''); } });
    vi.stubGlobal('URL', class extends OriginalURL {
      static createObjectURL(blob) { downloads.push(blob); return 'blob:canonical-clone-export'; }
      static revokeObjectURL() {}
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await input('[data-investigation-number="airspeed"]', 80); await action('Export investigation');
    await act(async () => poke()); await act(async () => vi.advanceTimersByTime(100));
    expect(current().airspeed).toBe(130); expect(downloads).toHaveLength(0);
    await commitAll(); await act(async () => vi.advanceTimersByTime(100));
    expect(downloads).toHaveLength(1); expect(JSON.parse(downloads[0].text)).toEqual(api.stallInvestigationRecord(current()));
    expect(current().airspeed).toBe(80); expect(current().observations).toEqual(before.observations);
    expect(current().startingIdea).toEqual(before.startingIdea); expect(current().completedAt).toBe(before.completedAt);
    expect(host.querySelector('[data-investigation-number="airspeed"]').value).toBe('80');
    expect(queue).toHaveLength(0); noRewards();
  });

  it('retires a launched A lease on foreign work and rejects retained A Return without writing a debrief into B', async () => {
    await launched({ strict: true, replay: true }); const oldReturn = handler(button('Return to investigation'));
    const expected = await foreign({ phase: 'transfer', flight: null }, { view: 'stallHunt', selectedChallenge: null, flightChallenge: null });
    expect(hooks().flyingRef.current).toBe(false);
    await act(async () => oldReturn()); await commitAll(); expect(latest).toEqual(expected); expect(queue).toHaveLength(0); noRewards();
  });

  it.each(['Return to investigation', '✕ Exit'])('rejects active A %s when B is queued before the finish event and host commit', async label => {
    await launched({ replay: true }); const finish = handler(button(label));
    const replacement = { stallInvestigation: inquiry('B', { phase: 'transfer', flight: null }), view: 'stallHunt', selectedChallenge: null, hostMarker: 'B authoritative' };
    const expected = clone({ ...latest, ...replacement });
    await act(async () => { externalPatch(replacement); finish(); });
    await commitAll(); await act(async () => vi.advanceTimersByTime(100));
    expect(latest).toEqual(expected); expect(hooks().flyingRef.current).toBe(false); expect(latest.lastDebrief).toBeUndefined(); noRewards();
  });

  it('rejects an A guided progress write when B arrives before the active frame host update commits', async () => {
    await launched({ replay: true }); expect(frameCallback).toBeTypeOf('function');
    const replacement = { stallInvestigation: inquiry('B', { phase: 'transfer', flight: null }), view: 'stallHunt', selectedChallenge: null, hostMarker: 'B authoritative' };
    const expected = clone({ ...latest, ...replacement });
    Object.assign(hooks().flightRef.current, { lat: 0, lon: 0, altitude: 5000, fieldElev: 0, speed: 160,
      vsi: -160 * Math.sin(20 * Math.PI / 180), onGround: false, aoa: 0, stalling: false });
    Object.assign(hooks().controlsRef.current, { pitch: 0, bank: 0, throttle: 0.4 });
    hooks().timeRef.current = 0.99; wallTime += 100;
    await act(async () => { externalPatch(replacement); frameCallback(); });
    await commitAll(); expect(latest).toEqual(expected); expect(current().flight).toBeNull(); expect(hooks().flyingRef.current).toBe(false); noRewards();
  });
});
