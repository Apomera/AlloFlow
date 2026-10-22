import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, errors, awardXP, celebrate;
const pending = () => ({ version: 1, status: 'pending' });
const original = (patch = {}) => ({ version: 1, status: 'committed', prediction: 'speed', hypothesis: 'I expected speed to determine the stall.', ...patch });
const evidence = () => [
  { airspeed: 130, altitude: 5000, aoa: 8 },
  { airspeed: 130, altitude: 5000, aoa: 20 },
  { airspeed: 80, altitude: 5000, aoa: 20 },
];
const completed = (patch = {}) => ({ phase: 'review', prediction: 'angle', hypothesis: 'I now expect angle to determine the stall.',
  observations: evidence(), explanation: 'Trials 1 and 2 changed only angle. Trials 2 and 3 stayed stalled at both speeds.',
  transferChoice: 'stall', transferAnswer: 'stall', transferAttempts: 1, completedAt: '2026-10-21T12:00:00.000Z', ...patch });
const current = () => latest.stallInvestigation;
const review = (scope = 'current') => host.querySelector('[data-stall-idea-review="' + scope + '"]');
const clone = value => JSON.parse(JSON.stringify(value));
function button(label) {
  const node = [...host.querySelectorAll('button')].find(item => item.textContent === label);
  expect(node, 'Button: ' + label).toBeTruthy(); return node;
}
function handler(node, name) {
  expect(node).toBeTruthy();
  return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][name];
}
async function click(label) { await act(async () => button(label).click()); }
async function choose(value, name = 'stall-prediction') {
  const node = name === 'stall-transfer' ? [...host.querySelectorAll('label')].find(label => label.textContent.trim() === 'Stall')?.querySelector('input[name="stall-transfer"]')
    : host.querySelector('input[name="' + name + '"][value="' + value + '"]');
  expect(node).toBeTruthy(); await act(async () => node.click());
}
async function write(selector, value) {
  const node = host.querySelector(selector); expect(node).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function mount(record = {}, extra = {}, context = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'stallHunt', stallInvestigation: record, ...extra } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData, awardXP, celebrate,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })), ...context,
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
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

describe('Sky School starting idea provenance', () => {
  it('makes only genuinely empty current attempts eligible for a future original idea', () => {
    expect(api.stallInvestigationRecord().startingIdea).toEqual(pending());
    expect(api.stallInvestigationRecord({}).startingIdea).toEqual(pending());
    for (const saved of [0, '', [], new Date(), { prediction: 'speed' }, { hypothesis: 'A saved reason' }, { phase: 'predict' }, { startingIdea: null }]) {
      expect(api.stallInvestigationRecord(saved).startingIdea).toBeNull();
    }
  });

  it.each([
    ['already collected trials', { observations: evidence() }],
    ['discarded malformed trial evidence', { observations: [{}] }],
    ['malformed evidence container', { observations: 'saved evidence' }],
    ['saved optional flight', { flight: { status: 'ended', samples: [] } }],
    ['malformed optional flight', { flight: {} }],
    ['later valid phase', { phase: 'experiment' }],
    ['unknown phase', { phase: 'invented' }],
    ['saved evidence explanation', { explanation: 'I used the trials.' }],
    ['saved transfer choice', { transferChoice: 'stall' }],
    ['saved checked response', { transferAnswer: 'normal' }],
    ['prior check count', { transferAttempts: 1 }],
    ['malformed check count', { transferAttempts: '0' }],
    ['prior completion', { completedAt: '2026-10-21T12:00:00.000Z' }],
    ['malformed completion', { completedAt: 'finished' }],
  ])('retires a forged pending marker with %s instead of inventing an origin', (_, patch) => {
    const saved = { phase: 'predict', prediction: 'speed', hypothesis: 'A mutable saved idea', startingIdea: pending(), ...patch };
    expect(api.stallInvestigationRecord(saved).startingIdea).toBeNull();
    expect(saved.startingIdea).toEqual(pending());
  });

  it.each([
    null, [], 'speed', { version: 2, status: 'committed', prediction: 'speed', hypothesis: 'Reason' },
    { version: 1, status: 'unknown', prediction: 'speed', hypothesis: 'Reason' },
    { version: 1, status: 'committed', prediction: 'invented', hypothesis: 'Reason' },
    { version: 1, status: 'committed', prediction: 'speed' },
    { version: 1, status: 'committed', prediction: 'speed', hypothesis: 12 },
  ])('keeps malformed saved provenance unknown: %j', startingIdea => {
    const normalized = api.stallInvestigationRecord(completed({ startingIdea }));
    expect(normalized.startingIdea).toBeNull();
    expect(normalized.prediction).toBe('angle'); expect(normalized.hypothesis).toContain('now expect angle');
  });

  it('bounds and detaches the original without discarding the independent latest idea', () => {
    const saved = completed({ startingIdea: original({ hypothesis: 'x'.repeat(4500), unknown: 'remove' }) });
    const normalized = api.stallInvestigationRecord(saved);
    expect(normalized.startingIdea).toEqual(original({ hypothesis: 'x'.repeat(4000) }));
    expect(normalized.startingIdea).not.toBe(saved.startingIdea);
    expect(normalized.prediction).toBe('angle'); expect(normalized.hypothesis).toBe(saved.hypothesis);
    normalized.startingIdea.hypothesis = 'Detached';
    expect(saved.startingIdea.hypothesis).toHaveLength(4500);
  });

  it('commits only on the first valid departure from Prediction, including an optional blank reason', async () => {
    await mount();
    expect(button('Continue to trials').disabled).toBe(true); expect(review()).toBeNull();
    await choose('speed');
    expect(current().startingIdea).toEqual(pending());
    await click('Continue to trials');
    expect(current().startingIdea).toEqual(original({ hypothesis: '' }));
    expect(current().observations).toEqual([]);
    await click('Back to prediction');
    expect(review().querySelector('[data-stall-idea-original-reason]').textContent).toBe('Not recorded');
    expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
  });

  it('retains a genuine pending draft across serialized reload and commits its latest pre-trial text', async () => {
    await mount(); await choose('speed'); await write('#stall-hypothesis', 'A draft before leaving.');
    const saved = clone(latest);
    await mount(saved.stallInvestigation);
    expect(current().startingIdea).toEqual(pending());
    await write('#stall-hypothesis', 'My final pre-trial reason.'); await click('Continue to trials');
    expect(current().startingIdea).toEqual(original({ hypothesis: 'My final pre-trial reason.' }));
    expect(current().hypothesis).toBe('My final pre-trial reason.');
  });

  it('captures live batched edits once and ignores old-phase text after committing', async () => {
    await mount();
    const select = handler(host.querySelector('input[value="altitude"]'), 'onChange');
    const edit = handler(host.querySelector('#stall-hypothesis'), 'onChange');
    const next = handler(button('Continue to trials'), 'onClick');
    await act(async () => {
      select(); edit({ target: { value: 'My last pre-trial idea.' } }); next();
      edit({ target: { value: 'A stale edit after leaving.' } }); next();
    });
    expect(current().startingIdea).toEqual(original({ prediction: 'altitude', hypothesis: 'My last pre-trial idea.' }));
    expect(current()).toMatchObject({ phase: 'experiment', prediction: 'altitude', hypothesis: 'My last pre-trial idea.' });
  });

  it('keeps the committed original while revisions, evidence, completion and reload preserve the latest idea separately', async () => {
    await mount(); await choose('speed'); await write('#stall-hypothesis', original().hypothesis); await click('Continue to trials');
    await click('Record observation'); await click('Change angle only'); await click('Record observation');
    await click('Change speed only'); await click('Record observation');
    await click('Back to prediction'); await choose('angle'); await write('#stall-hypothesis', 'My revised idea follows the angle comparisons.');
    await click('Continue to trials'); await click('Continue to explanation');
    expect(review().querySelector('[data-stall-idea-original-prediction]').textContent).toBe('Starting prediction: Airspeed');
    expect(review().querySelector('[data-stall-idea-original-reason]').textContent).toBe(original().hypothesis);
    expect(review().querySelector('[data-stall-idea-latest-prediction]').textContent).toBe('Latest saved prediction: Angle of attack');
    expect(review().querySelector('[data-stall-idea-latest-reason]').textContent).toBe('My revised idea follows the angle comparisons.');
    expect(review().closest('[aria-live]')).toBeNull();
    await write('#stall-explanation', completed().explanation); await click('Continue to transfer');
    await choose('stall', 'stall-transfer'); await click('Check prediction'); await click('Complete investigation');
    expect(current().startingIdea).toEqual(original()); expect(current().transferAttempts).toBe(1);
    expect(current().completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(host.textContent).toContain('Investigation complete:');
    const saved = clone(latest); await mount(saved.stallInvestigation);
    expect(review().dataset.stallIdeaProvenance).toBe('committed');
    expect(review().querySelector('[data-stall-idea-original-reason]').textContent).toBe(original().hypothesis);
    expect(current()).toEqual(saved.stallInvestigation);
    expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
  });

  it('never recaptures a legacy saved draft when it later leaves Prediction or revises after evidence', async () => {
    await mount({ phase: 'predict', prediction: 'speed', hypothesis: 'A legacy saved idea, with no timing record.' });
    await click('Continue to trials'); expect(current().startingIdea).toBeNull();
    await click('Back to prediction'); await choose('angle'); await write('#stall-hypothesis', 'A later revision.');
    await click('Continue to trials'); expect(current().startingIdea).toBeNull();
    await mount(completed());
    expect(review().dataset.stallIdeaProvenance).toBe('unknown');
    expect(review().textContent).toContain('Saved prediction: Angle of attack');
    expect(review().textContent).toContain('The timing of this saved idea was not recorded.');
    expect(review().querySelector('[data-stall-idea-original]')).toBeNull();
    expect(review().textContent).not.toMatch(/starting|before the trials|Latest saved/);
  });

  it('retires an invalid pending marker before going back and cannot promote the old idea later', async () => {
    await mount({ phase: 'experiment', prediction: 'speed', hypothesis: 'An existing saved idea.', startingIdea: pending(), observations: evidence() });
    await click('Back to prediction'); expect(current().startingIdea).toBeNull();
    await write('#stall-hypothesis', 'A revision after recorded trials.'); await click('Continue to trials');
    expect(current().startingIdea).toBeNull();
    await click('Continue to explanation'); expect(review().dataset.stallIdeaProvenance).toBe('unknown');
    expect(review().textContent).not.toContain('Starting prediction:');
  });

  it('archives original and latest ideas without mutating them, then starts an independently eligible attempt', async () => {
    const saved = completed({ startingIdea: original() });
    await mount(saved); await click('Start a new investigation');
    expect(current()).toMatchObject({ phase: 'predict', prediction: '', hypothesis: '', startingIdea: pending(), observations: [] });
    expect(current().attempts).toHaveLength(1); expect(current().attempts[0].startingIdea).toEqual(original());
    expect(current().attempts[0].hypothesis).toBe(saved.hypothesis);
    expect(review()).toBeNull();
    const earlier = review('earlier');
    expect(earlier.dataset.stallIdeaProvenance).toBe('committed');
    expect(earlier.textContent).toContain('Earlier: Recorded before the trials');
    expect(earlier.querySelector('[data-stall-idea-original-reason]').textContent).toBe(original().hypothesis);
    expect(earlier.querySelector('[data-stall-idea-latest-reason]').textContent).toBe(saved.hypothesis);
    await choose('altitude'); await write('#stall-hypothesis', 'A new attempt begins independently.'); await click('Continue to trials');
    expect(current().startingIdea).toEqual(original({ prediction: 'altitude', hypothesis: 'A new attempt begins independently.' }));
    expect(current().attempts[0].startingIdea).toEqual(original());
    const serialized = clone(latest); await mount(serialized.stallInvestigation);
    expect(review('earlier').querySelector('[data-stall-idea-original-reason]').textContent).toBe(original().hypothesis);
    expect(current()).toEqual(serialized.stallInvestigation);
    expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
  });

  it('shows an archived legacy idea as saved writing without a claim that it preceded evidence', async () => {
    const saved = { attempts: [completed()] };
    await mount(saved);
    expect(review('earlier').dataset.stallIdeaProvenance).toBe('unknown');
    expect(review('earlier').textContent).toContain('Earlier: Saved idea');
    expect(review('earlier').textContent).toContain('The timing of this saved idea was not recorded.');
    expect(review('earlier').querySelector('[data-stall-idea-original]')).toBeNull();
    expect(review('earlier').textContent).not.toMatch(/starting|before the trials|Latest saved/);
    expect(current()).toEqual(saved);
  });

  it('exports the canonical original and latest ideas for both current and archived attempts without changing work', async () => {
    let exported, filename;
    await mount(completed({ startingIdea: original(), attempts: [completed({ startingIdea: original({ prediction: 'altitude', hypothesis: 'The earlier original.' }), hypothesis: 'The earlier revision.' }), completed()] }));
    const saved = clone(current());
    vi.stubGlobal('Blob', class { constructor(parts, options) { this.content = parts.join(''); this.type = options.type; } });
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL(blob) { exported = blob; return 'blob:starting-idea-export'; }
      static revokeObjectURL = vi.fn();
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { filename = this.download; });
    await click('Export investigation');
    expect(filename).toBe('skyschool-stall-investigation.json'); expect(exported.type).toBe('application/json');
    const json = JSON.parse(exported.content);
    expect(json.startingIdea).toEqual(original()); expect(json.hypothesis).toBe(saved.hypothesis);
    expect(json.attempts[0].startingIdea).toEqual(original({ prediction: 'altitude', hypothesis: 'The earlier original.' }));
    expect(json.attempts[0].hypothesis).toBe('The earlier revision.'); expect(json.attempts[1].startingIdea).toBeNull();
    expect(current()).toEqual(saved);
    expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
  });

  it('renders translated original and latest labels without changing stored identifiers or learner writing', async () => {
    await mount(completed({ startingIdea: original() }), {}, { t: (key, fallback) => ({
      'stem.flightsim.guided_idea_before_trials': 'Vor den Versuchen festgehalten',
      'stem.flightsim.guided_starting_prediction': 'Erste Vorhersage: {prediction}',
      'stem.flightsim.guided_idea_latest': 'Letzte gespeicherte Idee',
      'stem.flightsim.guided_idea_latest_prediction': 'Letzte Vorhersage: {prediction}',
      'stem.flightsim.guided_airspeed_label': 'Geschwindigkeit',
      'stem.flightsim.guided_angle_label': 'Anstellwinkel',
    })[key] || fallback || key });
    expect(review().textContent).toContain('Vor den Versuchen festgehalten');
    expect(review().textContent).toContain('Erste Vorhersage: Geschwindigkeit');
    expect(review().textContent).toContain('Letzte Vorhersage: Anstellwinkel');
    expect(current().startingIdea.prediction).toBe('speed'); expect(current().prediction).toBe('angle');
    expect(review().querySelector('[data-stall-idea-original-reason]').textContent).toBe(original().hypothesis);
  });
});
