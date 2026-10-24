import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, externalPatch, errors, awardXP, celebrate, downloads, revoke;
const phases = ['predict', 'experiment', 'explain', 'transfer', 'review'];
const clone = value => JSON.parse(JSON.stringify(value));
const original = () => ({ version: 1, status: 'committed', prediction: 'speed', hypothesis: 'I first expected speed to determine the stall.' });
const observation = (patch = {}) => ({ airspeed: 130, altitude: 5000, aoa: 8, ...patch });
const evidence = () => [observation({ trialNumber: 71 }), observation({ trialNumber: 72, aoa: 20 }), observation({ trialNumber: 73, airspeed: 80, aoa: 20 })];
const practice = () => ({ status: 'ended', sawStall: true, recovered: false, recoverySeconds: 0, samples: [
  { time: 0, aoa: 8, airspeed: 130, altitude: 5000 }, { time: 1, aoa: 20, airspeed: 125, altitude: 4980 },
] });
const inquiry = (patch = {}) => ({ phase: 'experiment', startingIdea: original(), prediction: 'angle', hypothesis: 'My revised idea follows the angle evidence.',
  airspeed: 185, altitude: 9000, aoa: 12, observations: evidence(), explanation: 'Trials 71 and 72 changed angle. Trials 72 and 73 remained stalled at different speeds.',
  transferChoice: 'stall', transferAnswer: 'stall', transferAttempts: 2, completedAt: '2026-10-22T12:00:00.000Z', ...patch });
const current = () => latest.stallInvestigation;
const inspector = () => host.querySelector('#stall-trial-comparison');
const first = () => host.querySelector('#stall-compare-first');
const second = () => host.querySelector('#stall-compare-second');
const receipt = kind => host.querySelector('[data-stall-inspect-pair="' + kind + '"]');
function button(text) {
  const node = [...host.querySelectorAll('button')].find(item => item.textContent === text);
  expect(node, 'Button: ' + text).toBeTruthy(); return node;
}
function handler(node, name = 'onClick') {
  expect(node).toBeTruthy();
  const key = Object.keys(node).find(value => value.startsWith('__reactProps$'));
  expect(key).toBeTruthy(); return node[key][name];
}
async function click(node) { await act(async () => node.click()); }
async function action(label) { await click(button(label)); }
async function edit(node, value) {
  expect(node).toBeTruthy();
  const prototype = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
async function mount(record = inquiry(), extra = {}, t, strictMode = false, hostCommitDelayMs = 0) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'stallHunt', stallInvestigation: record,
      stallCompareFirst: 0, stallCompareSecond: 2, unrelatedSetting: 'keep', ...extra } });
    latest = data.flightSim;
    externalPatch = patch => setData(previous => ({ ...previous, flightSim: { ...previous.flightSim, ...patch } }));
    // A connected host can commit an owned action later than the tool's own
    // state updates. Keep the functional updater intact until that commit.
    const setToolData = React.useCallback(update => {
      if (hostCommitDelayMs) window.setTimeout(() => setData(update), hostCommitDelayMs);
      else setData(update);
    }, [setData, hostCommitDelayMs]);
    return tool.render(makeCtx({ toolData: data, setToolData, ...(t ? { t } : {}), awardXP, celebrate,
      update: (id, key, value) => setData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => root.render(strictMode ? React.createElement(React.StrictMode, null, React.createElement(App)) : React.createElement(App)));
}
function captureDownloads() {
  downloads = []; revoke = vi.fn();
  vi.stubGlobal('Blob', class { constructor(parts, options) { this.text = parts.join(''); this.type = options.type; } });
  const OriginalURL = URL;
  vi.stubGlobal('URL', class extends OriginalURL {
    static createObjectURL(blob) { downloads.push({ blob }); return 'blob:investigation-access-' + downloads.length; }
    static revokeObjectURL = revoke;
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() {
    const entry = downloads.at(-1); entry.filename = this.download; entry.href = this.href;
  });
}
const exported = () => JSON.parse(downloads.at(-1).blob.text);
function expectNoRewards() { expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled(); }
beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); awardXP = vi.fn(); celebrate = vi.fn();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School direct access to qualifying recorded comparisons', () => {
  it.each(['experiment', 'explain', 'review'].flatMap(phase => ['angle', 'speed'].map(kind => [phase, kind])))(
    'opens the actual %s phase %s receipt while preserving the investigation', async (phase, kind) => {
      await mount(inquiry({ phase, flight: practice(), attempts: [inquiry({ phase: 'review', hypothesis: 'Earlier work.' })] }));
      const before = clone(current());
      const node = receipt(kind);
      expect(node.tagName).toBe('BUTTON'); expect(node.type).toBe('button');
      expect(node.textContent).toBe('Inspect ' + kind + ' comparison');
      expect(node.getAttribute('aria-controls')).toBe('stall-trial-comparison');
      expect(node.closest('[role="status"], [aria-live]')).toBeNull();
      await click(node);
      expect([first().value, second().value]).toEqual(kind === 'angle' ? ['0', '1'] : ['1', '2']);
      expect(api.stallTrialComparison(current().observations, latest.stallCompareFirst, latest.stallCompareSecond).qualifies).toBe(kind);
      expect(inspector().textContent).toContain(kind === 'angle' ? 'Trial A (71):' : 'Trial A (72):');
      expect(inspector().textContent).toContain(kind === 'angle' ? 'Trial B (72):' : 'Trial B (73):');
      expect(current()).toEqual(before); expect(latest.unrelatedSetting).toBe('keep'); expectNoRewards();
    });

  it.each([
    [[], []], [[observation()], []],
    [[observation(), observation({ aoa: 20 })], ['angle']],
    [[observation(), observation({ airspeed: 80 })], ['speed']],
  ])('offers only comparisons established by the retained evidence %j', async (observations, expected) => {
    await mount(inquiry({ observations }));
    expect([...host.querySelectorAll('[data-stall-inspect-pair]')].map(node => node.dataset.stallInspectPair)).toEqual(expected);
  });

  it('keeps archived receipts read-only and uses current evidence despite a selected earlier attempt', async () => {
    await mount(inquiry({ attempts: [inquiry({ phase: 'review', observations: evidence().map(row => ({ ...row, trialNumber: row.trialNumber + 100 })) })] }), { stallHistoryIndex: 0 });
    const notebook = host.querySelector('[aria-label="Investigation notebook"]'), before = clone(current());
    expect(notebook.querySelector('[data-stall-inspect-pair]')).toBeNull();
    await click(receipt('speed'));
    expect(inspector().textContent).toContain('Trial A (72):'); expect(current()).toEqual(before);
    expect(latest.stallHistoryIndex).toBe(0);
  });

  it.each(['prepared', 'number-draft'])('preserves trial controls while inspecting with %s work', async state => {
    const saved = api.stallInvestigationRecord(inquiry());
    const preparation = api.prepareStallComparisonContext(saved, 0, 'angle');
    await mount({ ...saved, airspeed: 130, altitude: 5000, aoa: 20 }, { stallPreparedComparison: preparation });
    const numeric = host.querySelector('[data-investigation-number="airspeed"]');
    if (state === 'number-draft') await edit(numeric, '8');
    else expect(host.querySelector('[data-stall-prepared-comparison]')).toBeTruthy();
    const before = clone(current());
    await click(receipt('speed'));
    expect(numeric.value).toBe(state === 'number-draft' ? '8' : '130'); expect(current()).toEqual(before); expect(latest.stallPreparedComparison).toBeNull();
    expect([first().value, second().value]).toEqual(['1', '2']); expectNoRewards();
  });

  it('retains direct comparison selection across a serialized reload', async () => {
    await mount(); await click(receipt('speed')); const saved = clone(latest);
    await mount(saved.stallInvestigation, saved);
    expect([first().value, second().value]).toEqual(['1', '2']);
    expect(inspector().textContent).toContain('This meets the speed comparison.'); expect(current()).toEqual(saved.stallInvestigation);
  });

  it('focuses the comparison heading after opening a receipt', async () => {
    await mount(); const node = receipt('angle'); node.focus(); await click(node);
    await act(async () => vi.advanceTimersByTime(0));
    const heading = host.querySelector('#stall-trial-comparison-title');
    expect(heading.tabIndex).toBe(-1); expect(document.activeElement).toBe(heading);
    expect(heading.textContent).toBe('Compare recorded trials');
  });

  it('waits for a delayed host comparison commit before focusing its heading', async () => {
    await mount(inquiry(), {}, undefined, false, 25);
    const before = clone(current()), node = receipt('angle'); node.focus(); await click(node);
    await act(async () => vi.advanceTimersByTime(0));
    expect([latest.stallCompareFirst, latest.stallCompareSecond]).toEqual([0, 2]);
    expect([first().value, second().value]).toEqual(['0', '2']);
    expect(document.activeElement).toBe(node);
    await act(async () => vi.advanceTimersByTime(24));
    expect([latest.stallCompareFirst, latest.stallCompareSecond]).toEqual([0, 2]);
    expect(document.activeElement).toBe(node);
    await act(async () => vi.advanceTimersByTime(1));
    await act(async () => vi.advanceTimersByTime(0));
    expect([latest.stallCompareFirst, latest.stallCompareSecond]).toEqual([0, 1]);
    expect([first().value, second().value]).toEqual(['0', '1']);
    expect(inspector().textContent).toContain('This meets the angle comparison.');
    expect(document.activeElement).toBe(host.querySelector('#stall-trial-comparison-title'));
    expect(current()).toEqual(before); expectNoRewards();
  });

  it('preserves deliberate user focus while waiting for a delayed host comparison commit', async () => {
    await mount(inquiry(), {}, undefined, false, 25);
    const before = clone(current()), node = receipt('speed'); node.focus(); await click(node);
    await act(async () => vi.advanceTimersByTime(10));
    expect([latest.stallCompareFirst, latest.stallCompareSecond]).toEqual([0, 2]);
    const target = first(); target.focus();
    expect(document.activeElement).toBe(target);
    await act(async () => vi.advanceTimersByTime(15));
    await act(async () => vi.advanceTimersByTime(0));
    expect([latest.stallCompareFirst, latest.stallCompareSecond]).toEqual([1, 2]);
    expect([first().value, second().value]).toEqual(['1', '2']);
    expect(inspector().textContent).toContain('This meets the speed comparison.');
    expect(document.activeElement).toBe(target);
    expect(current()).toEqual(before); expectNoRewards();
  });

  it('does not steal focus from a deliberately chosen control before delayed inspection focus runs', async () => {
    await mount(); const node = receipt('speed'); node.focus(); await click(node);
    const target = first(); target.focus(); await act(async () => vi.advanceTimersByTime(0));
    expect(document.activeElement).toBe(target);
  });

  it('retires delayed comparison focus on departure', async () => {
    await mount(); const node = receipt('angle'); node.focus(); await click(node); await action('← Back to menu');
    const target = host.querySelector('button'); target.focus(); await act(async () => vi.advanceTimersByTime(0));
    expect(latest.view).toBe('menu'); expect(document.activeElement).toBe(target);
  });

  it('recomputes a qualifying pair after queued recording shifts the latest-24 window', async () => {
    const observations = [observation({ trialNumber: 31 }), observation({ trialNumber: 32, aoa: 20 }), observation({ trialNumber: 33, airspeed: 80, aoa: 20 }),
      ...Array.from({ length: 21 }, (_, index) => observation({ trialNumber: 34 + index, altitude: 7000 + index * 100 }))];
    await mount(inquiry({ observations, airspeed: 130, altitude: 5000, aoa: 8 }));
    const save = handler(button('Record observation')), inspect = handler(receipt('angle'));
    await act(async () => { save(); inspect(); });
    expect(current().observations[0].trialNumber).toBe(32); expect(current().observations.at(-1).trialNumber).toBe(55);
    expect([first().value, second().value]).toEqual(['0', '23']);
    expect(inspector().textContent).toContain('Trial A (32):'); expect(inspector().textContent).toContain('Trial B (55):');
  });

  it.each(['phase', 'new-attempt', 'view'])('rejects retained receipt callbacks after a native %s departure', async departure => {
    await mount(inquiry({ phase: departure === 'new-attempt' ? 'review' : 'experiment' }));
    const inspect = handler(receipt('speed'));
    if (departure === 'phase') await action('Back to prediction');
    else if (departure === 'new-attempt') await action('Start a new investigation');
    else await action('← Back to menu');
    const saved = clone(latest); await act(async () => inspect());
    expect(latest).toEqual(saved); expectNoRewards();
  });

  it.each([false, true])('rejects old receipt ownership when a same-phase replacement is %s queued', async queued => {
    await mount(); const inspect = handler(receipt('speed'));
    const replacement = inquiry({ hypothesis: 'A different current investigation.', observations: evidence().map(row => ({ ...row, trialNumber: row.trialNumber + 100 })) });
    const patch = { stallInvestigation: replacement, stallCompareFirst: 0, stallCompareSecond: 0 };
    if (queued) await act(async () => { externalPatch(patch); inspect(); });
    else { await act(async () => externalPatch(patch)); await act(async () => inspect()); }
    expect(current()).toEqual(replacement); expect([latest.stallCompareFirst, latest.stallCompareSecond]).toEqual([0, 0]);
    expectNoRewards();
  });
});

describe('Sky School export of unfinished investigation work', () => {
  it.each(phases)('exports one canonical JSON draft from %s without completing or rewarding it', async phase => {
    await mount(inquiry({ phase, completedAt: null, flight: practice(), attempts: [inquiry({ phase: 'review', hypothesis: 'An earlier revised idea.' })] }));
    captureDownloads(); const before = clone(current()), expected = api.stallInvestigationRecord(before);
    expect([...host.querySelectorAll('button')].filter(node => node.textContent === 'Export investigation')).toHaveLength(1);
    expect(host.textContent).toContain('Export includes your current draft and earlier attempts. Exporting does not complete the investigation.');
    await action('Export investigation');
    expect(downloads).toHaveLength(1); expect(downloads[0].filename).toBe('skyschool-stall-investigation.json');
    expect(downloads[0].blob.type).toBe('application/json'); expect(exported()).toEqual(expected);
    expect(exported().phase).toBe(phase); expect(exported().completedAt).toBeNull();
    expect(exported().startingIdea).toEqual(original()); expect(exported().hypothesis).toBe(before.hypothesis);
    expect(exported().attempts[0].hypothesis).toBe('An earlier revised idea.');
    expect(current()).toEqual(before); expectNoRewards();
    expect(revoke).not.toHaveBeenCalled(); await act(async () => vi.advanceTimersByTime(1000));
    expect(revoke).toHaveBeenCalledWith(downloads[0].href);
  });

  it('exports a genuinely empty Prediction without committing a starting idea or requiring an answer', async () => {
    await mount({}); captureDownloads();
    await action('Export investigation');
    expect(exported()).toMatchObject({ phase: 'predict', prediction: '', hypothesis: '', startingIdea: { version: 1, status: 'pending' }, observations: [], completedAt: null });
    expect(current()).toEqual({}); expectNoRewards();
  });

  it.each([
    ['80', 80], ['8', 40], ['', 185],
  ])('commits visible airspeed text %j to %s before exporting and preserves completion', async (draft, expected) => {
    await mount(); captureDownloads();
    await edit(host.querySelector('[data-investigation-number="airspeed"]'), draft);
    expect(current().airspeed).toBe(185);
    await action('Export investigation');
    expect(current().airspeed).toBe(expected); expect(exported()).toEqual(api.stallInvestigationRecord(current()));
    expect(host.querySelector('[data-investigation-number="airspeed"]').value).toBe(String(expected));
    expect(current().completedAt).toBe('2026-10-22T12:00:00.000Z'); expect(current().startingIdea).toEqual(original());
    expectNoRewards();
  });

  it('exports the final explanation from the same event turn without replaying earlier text', async () => {
    await mount(inquiry({ phase: 'explain' })); captureDownloads();
    const write = handler(host.querySelector('#stall-explanation'), 'onChange'), save = handler(button('Export investigation'));
    await act(async () => { write({ target: { value: 'My final written draft before export.' } }); save(); });
    expect(exported().explanation).toBe('My final written draft before export.'); expect(current().explanation).toBe(exported().explanation);
    expect(exported().completedAt).toBeNull(); expect(exported().startingIdea).toEqual(original()); expectNoRewards();
  });

  it('preserves unknown legacy timing and bounds archives instead of inventing a completed original', async () => {
    const legacy = { phase: 'predict', prediction: 'speed', hypothesis: 'A legacy draft.', unknown: 'not canonical',
      observations: [observation({ state: 'stall', lift: 9999 }), null], attempts: Array.from({ length: 8 }, (_, index) => inquiry({ hypothesis: 'Archive ' + index })) };
    await mount(legacy); captureDownloads(); const before = clone(current());
    await action('Export investigation');
    expect(exported()).toEqual(api.stallInvestigationRecord(before)); expect(exported().startingIdea).toBeNull();
    expect(exported().observations[0]).toMatchObject({ state: 'normal', trialNumber: 1 });
    expect(exported().attempts).toHaveLength(5); expect(exported().attempts[0].hypothesis).toBe('Archive 3');
    expect(exported()).not.toHaveProperty('unknown'); expect(current()).toEqual(before); expectNoRewards();
  });

  it.each(['phase', 'new-attempt', 'view'])('rejects retained export callbacks after native %s departure', async departure => {
    await mount(inquiry({ phase: departure === 'new-attempt' ? 'review' : 'experiment' })); captureDownloads();
    const save = handler(button('Export investigation'));
    if (departure === 'phase') await action('Back to prediction');
    else if (departure === 'new-attempt') await action('Start a new investigation');
    else await action('← Back to menu');
    const before = clone(latest); await act(async () => save());
    expect(downloads).toHaveLength(0); expect(latest).toEqual(before); expectNoRewards();
  });

  it.each([false, true])('does not export an old investigation when replacement is %s queued', async queued => {
    await mount(); captureDownloads(); const save = handler(button('Export investigation'));
    const replacement = inquiry({ hypothesis: 'Replacement draft.', startingIdea: null });
    if (queued) await act(async () => { externalPatch({ stallInvestigation: replacement }); save(); });
    else { await act(async () => externalPatch({ stallInvestigation: replacement })); await act(async () => save()); }
    expect(downloads).toHaveLength(0); expect(current()).toEqual(replacement); expectNoRewards();
  });

  it.each(['Export investigation', 'Record observation'])('retires another investigation\'s number drafts before a fresh %s action', async label => {
    await mount(); captureDownloads();
    for (const [key, value] of [['airspeed', '8'], ['altitude', '19000'], ['aoa', '25']]) {
      await edit(host.querySelector('[data-investigation-number="' + key + '"]'), value);
    }
    expect(current()).toMatchObject({ airspeed: 185, altitude: 9000, aoa: 12 });
    const replacement = inquiry({ airspeed: 200, altitude: 6000, aoa: 10,
      hypothesis: 'Replacement investigation writing.', explanation: 'Replacement evidence explanation.',
      startingIdea: { version: 1, status: 'committed', prediction: 'altitude', hypothesis: 'Replacement starting idea.' },
      observations: evidence().map(row => ({ ...row, trialNumber: row.trialNumber + 100 })) });
    await act(async () => externalPatch({ stallInvestigation: replacement }));
    for (const [key, value] of [['airspeed', '200'], ['altitude', '6000'], ['aoa', '10']]) {
      expect(host.querySelector('[data-investigation-number="' + key + '"]').value).toBe(value);
    }
    expect(current()).toEqual(replacement);
    await action(label);
    if (label === 'Export investigation') {
      expect(downloads).toHaveLength(1); expect(exported()).toEqual(api.stallInvestigationRecord(replacement));
      expect(current()).toEqual(replacement);
    } else {
      expect(downloads).toHaveLength(0); expect(current().observations).toHaveLength(4);
      expect(current().observations.at(-1)).toEqual({ ...api.sampleStallInvestigation(200, 6000, 10), trialNumber: 174 });
      expect(current().completedAt).toBeNull();
    }
    expect(current()).toMatchObject({ airspeed: 200, altitude: 6000, aoa: 10,
      hypothesis: replacement.hypothesis, explanation: replacement.explanation, startingIdea: replacement.startingIdea });
    expectNoRewards();
  });

  it.each([false, true])('downloads exactly once in StrictMode when numeric draft commit is %s needed', async hasDraft => {
    await mount(inquiry(), {}, undefined, true); captureDownloads();
    const before = clone(current());
    if (hasDraft) await edit(host.querySelector('[data-investigation-number="airspeed"]'), '80');
    await action('Export investigation');
    expect(downloads).toHaveLength(1); expect(downloads[0].filename).toBe('skyschool-stall-investigation.json');
    expect(exported()).toEqual(api.stallInvestigationRecord({ ...before, airspeed: hasDraft ? 80 : before.airspeed }));
    expect(current().completedAt).toBe(before.completedAt);
    expect(api.stallInvestigationRecord(current()).observations).toEqual(api.stallInvestigationRecord(before).observations);
    await act(async () => vi.advanceTimersByTime(1000));
    expect(downloads).toHaveLength(1); expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith(downloads[0].href); expectNoRewards();
  });

  it('localizes direct actions and export guidance without changing identifiers or learner writing', async () => {
    await mount(inquiry(), {}, (key, fallback) => ({
      'stem.flightsim.guided_inspect_angle': 'Winkelvergleich ansehen',
      'stem.flightsim.guided_inspect_speed': 'Geschwindigkeitsvergleich ansehen',
      'stem.flightsim.guided_export_scope': 'Der Export enthält Entwurf und frühere Versuche. Er schließt die Untersuchung nicht ab.',
    })[key] || fallback);
    const before = clone(current());
    expect(receipt('angle').textContent).toBe('Winkelvergleich ansehen'); expect(receipt('speed').textContent).toBe('Geschwindigkeitsvergleich ansehen');
    expect(host.textContent).toContain('Der Export enthält Entwurf und frühere Versuche.');
    await click(receipt('speed')); expect(current()).toEqual(before); expect([first().value, second().value]).toEqual(['1', '2']);
  });
});
