import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host, latest, setSaved, xp, errors, pending, delayHost, replayChecks;
const copy = value => JSON.parse(JSON.stringify(value));
const row = (t = 0, patch = {}) => ({ t, lat: 43.646, lon: -70.309, alt: 5000, spd: 110, hdg: 90,
  agl: 4924, fpm: 0, aoa: 8, pitch: 0, bank: 0, throttle: .6,
  onGround: false, stalling: false, lowAirspeed: false, ...patch });
const flight = (kind = 'generic', patch = {}) => ({ attemptId: 'review-a', aircraftId: 'cessna172',
  activityId: kind === 'challenge' ? 'first_flight' : 'free_flight', investigation: false, startedAirborne: false,
  endedAt: '2026-10-23T12:00:00.000Z', flightTime: 30, airborneSeconds: 30, bestStableSeconds: 15,
  stallSeconds: 4, landings: 0, reflection: 'Original explanation.', samples: [row(0), row(2), row(4)],
  ...(kind === 'challenge' ? { challenge: { version: 1, id: 'first_flight',
    objectives: { climb: true, steady: false, landing: false }, elapsedSeconds: 30 } } : {}), ...patch });
const textarea = kind => host.querySelector(kind === 'challenge' ? '#challenge-reflection' : '#debrief-evidence-explanation');
const study = (kind = 'supporting') => host.querySelector('[data-flight-debrief-study="' + kind + '"]');
const back = () => host.querySelector('[data-flight-debrief-return]');
function handler(node, event = 'onClick') {
  expect(node).toBeTruthy();
  return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][event];
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
async function input(node, text) {
  expect(node).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, text);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const reviewState = () => copy({ lastDebrief: latest.lastDebrief, flightPracticeHistory: latest.flightPracticeHistory,
  challengeReflections: latest.challengeReflections, debriefSampleIndex: latest.debriefSampleIndex,
  debriefCompareIndex: latest.debriefCompareIndex, debriefHistoryIndex: latest.debriefHistoryIndex,
  debriefHistorySampleIndex: latest.debriefHistorySampleIndex, totalFlightTime: latest.totalFlightTime,
  quizScore: latest.quizScore, quizTotal: latest.quizTotal });
async function flushHost() {
  for (let count = 0; pending.length; count++) {
    expect(count).toBeLessThan(30);
    const apply = pending.shift(); await act(async () => apply());
  }
}
async function mount(kind = 'generic', seed = {}, options = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  pending = []; delayHost = !!options.delayHost;
  function App() {
    const [data, update] = React.useState({ flightSim: { view: 'debrief', aircraft: 'cessna172', lastDebrief: flight(kind),
      flightPracticeHistory: [flight('generic', { attemptId: 'earlier', reflection: 'Earlier explanation remains read-only.' })],
      challengeReflections: { first_flight: 'Original explanation.', energy_management: 'Other exercise explanation.' },
      debriefSampleIndex: 2, debriefCompareIndex: 1, debriefHistoryIndex: 0, debriefHistorySampleIndex: 1,
      totalFlightTime: 900, quizScore: 7, quizTotal: 12, ...seed } });
    latest = data.flightSim;
    setSaved = patch => update(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    const submit = change => {
      const apply = () => update(previous => {
        if (typeof change !== 'function') return change;
        const before = JSON.stringify(previous), first = change(previous), second = change(previous);
        replayChecks.push({ pure: JSON.stringify(previous) === before,
          stable: JSON.stringify(first) === JSON.stringify(second), unchanged: first === previous && second === previous });
        return second;
      });
      if (delayHost) pending.push(apply); else apply();
    };
    return tool.render(makeCtx({ toolData: data, setToolData: submit, awardXP: (...args) => xp.push(args),
      update: (id, key, value) => submit(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => submit(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
  { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  xp = []; replayChecks = []; errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); expect(xp).toHaveLength(0); delete window.__RR_TEST_EXPORTS__;
  expect(replayChecks.every(check => check.pure && check.stable)).toBe(true);
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Sky School review evidence ownership', () => {
  it.each([
    ['recorded moment', 'generic', record => ({ ...record, samples: [row(0), row(2, { alt: 5400 }), row(4)] })],
    ['finish time', 'generic', record => ({ ...record, endedAt: '2026-10-23T13:00:00.000Z' })],
    ['steady-flight measurement', 'generic', record => ({ ...record, bestStableSeconds: 20 })],
    ['touchdown evidence', 'generic', record => ({ ...record, landings: 1, bestLanding: 180, touchdownAirportId: 'pwm' })],
    ['milestone explanation', 'generic', record => ({ ...record, flightNotes: [{ title: 'Measured climb', message: 'Use the corrected climb observation.' }] })],
    ['discovery fact', 'generic', record => ({ ...record, discoveredPlaces: [{ name: 'Portland', country: 'United States', fact: 'The recorded place fact.' }] })],
    ['interrupted status', 'generic', record => ({ ...record, interrupted: true })],
    ['challenge goal', 'challenge', record => ({ ...record, challenge: { ...record.challenge,
      objectives: { ...record.challenge.objectives, steady: true } } })],
    ['challenge measured time', 'challenge', record => ({ ...record, challenge: { ...record.challenge, elapsedSeconds: 40 } })],
  ])('does not let an attempt ID authorize an explanation for changed %s', (label, kind, replace) => {
    const origin = flight(kind), replacement = replace(copy(origin)), before = copy([origin, replacement]);
    expect(replacement.attemptId).toBe(origin.attemptId);
    expect(api.flightReflectionCanEdit(origin, { view: 'debrief', lastDebrief: replacement })).toBe(false);
    expect([origin, replacement]).toEqual(before);
  });

  it('permits explanation revisions and ignored host metadata without changing canonical evidence', () => {
    const origin = flight(), replacement = { ...copy(origin), reflection: 'A newer draft.',
      teacherMarker: 'Preserve this host field', hostRevision: 3 };
    expect(api.flightReflectionCanEdit(origin, { view: 'debrief', lastDebrief: replacement })).toBe(true);
    expect(replacement.teacherMarker).toBe('Preserve this host field');
  });

  it.each(['generic', 'challenge'].flatMap(kind => ['committed', 'queued'].flatMap(timing =>
    ['reflection', 'supporting study'].map(control => [kind, timing, control]))))(
    'rejects an old %s %s %s control when same-ID evidence is replaced', async (kind, timing, control) => {
      await mount(kind);
      const action = control === 'reflection' ? handler(textarea(kind), 'onChange') : handler(study());
      const replacement = flight(kind, { samples: [row(10, { alt: 6200, pitch: -2 })],
        endedAt: '2026-10-23T13:00:00.000Z', reflection: 'The corrected evidence owns this explanation.' });
      const before = reviewState();
      const invoke = () => control === 'reflection' ? action({ target: { value: 'Stale explanation from the old moments.' } }) : action();
      if (timing === 'committed') {
        await act(async () => setSaved({ lastDebrief: replacement }));
        await act(async () => invoke());
      } else await act(async () => { setSaved({ lastDebrief: replacement }); invoke(); });
      expect(latest.view).toBe('debrief'); expect(latest.lastDebrief).toEqual(replacement);
      expect(latest.debriefLessonReturn == null).toBe(true); expect(latest.selectedLesson == null).toBe(true);
      expect(reviewState()).toEqual({ ...before, lastDebrief: replacement });
      await input(textarea(kind), 'A fresh control can explain the corrected moments.');
      expect(latest.lastDebrief.samples).toEqual(replacement.samples);
      expect(latest.lastDebrief.reflection).toBe('A fresh control can explain the corrected moments.');
      if (kind === 'challenge') expect(latest.challengeReflections.first_flight).toBe(latest.lastDebrief.reflection);
    });

  it('also rejects a retained related-lesson control after a same-ID challenge outcome changes', async () => {
    await mount('challenge'); const launch = handler(study('challenge'));
    const replacement = flight('challenge', { challenge: { ...latest.lastDebrief.challenge,
      objectives: { climb: true, steady: true, landing: false }, elapsedSeconds: 45 } });
    await act(async () => { setSaved({ lastDebrief: replacement }); launch(); });
    expect(latest.view).toBe('debrief'); expect(latest.lastDebrief).toEqual(replacement);
    expect(latest.debriefLessonReturn == null).toBe(true); expect(latest.selectedLesson == null).toBe(true);
    await click(study('challenge')); expect(latest.view).toBe('lesson');
  });

  it.each(['generic', 'challenge'])('keeps valid queued %s drafts and unknown host metadata with the same evidence', async kind => {
    await mount(kind); const edit = handler(textarea(kind), 'onChange'), before = reviewState();
    const replacement = { ...latest.lastDebrief, reflection: 'A host-provided draft.', teacherMarker: 'Queued host metadata' };
    await act(async () => {
      setSaved({ lastDebrief: replacement, challengeReflections: { ...latest.challengeReflections, energy_management: 'Queued exercise note.' } });
      edit({ target: { value: 'First valid draft on the same moments.' } });
      edit({ target: { value: 'Final valid draft on the same moments.' } });
    });
    expect(latest.lastDebrief).toEqual({ ...replacement, reflection: 'Final valid draft on the same moments.' });
    expect(latest.flightPracticeHistory).toEqual(before.flightPracticeHistory);
    expect(latest.challengeReflections.energy_management).toBe('Queued exercise note.');
    if (kind === 'challenge') expect(latest.challengeReflections.first_flight).toBe(latest.lastDebrief.reflection);
    else expect(latest.challengeReflections.first_flight).toBe('Original explanation.');
  });

  it.each(['generic', 'challenge'].flatMap(kind => ['reflection', 'supporting study'].map(control => [kind, control])))(
    'retires a retained %s %s control across review A to B to A', async (kind, control) => {
      await mount(kind); const original = copy(latest.lastDebrief);
      const action = control === 'reflection' ? handler(textarea(kind), 'onChange') : handler(study());
      await act(async () => setSaved({ lastDebrief: flight(kind, { attemptId: 'review-b', reflection: 'B explanation.' }) }));
      await act(async () => setSaved({ lastDebrief: copy(original) })); const before = copy(latest);
      await act(async () => control === 'reflection' ? action({ target: { value: 'Late event from the first A visit.' } }) : action());
      expect(latest).toEqual(before);
      if (control === 'reflection') {
        await input(textarea(kind), 'The current A visit owns this edit.');
        expect(latest.lastDebrief.reflection).toBe('The current A visit owns this edit.');
      } else { await click(study()); expect(latest.view).toBe('lesson'); }
    });

  it.each(['Menu navigation', 'different-ID review', 'same-ID changed evidence'])(
    'does not let a queued lesson return override pending host %s', async replacementKind => {
      await mount(); await click(study()); const oldReturn = handler(back()), original = reviewState();
      const replacement = replacementKind === 'Menu navigation' ? latest.lastDebrief : flight('generic', {
        attemptId: replacementKind === 'different-ID review' ? 'review-b' : 'review-a',
        samples: [row(12, { alt: 6100 })], reflection: 'Keep the pending host review.' });
      const patch = replacementKind === 'Menu navigation' ? { view: 'menu' } : { lastDebrief: replacement };
      await act(async () => { setSaved(patch); oldReturn(); });
      expect(latest.view).toBe(replacementKind === 'Menu navigation' ? 'menu' : 'lesson');
      expect(reviewState()).toEqual({ ...original, lastDebrief: copy(replacement) });
      if (replacementKind === 'same-ID changed evidence') {
        expect(back()).toBeTruthy(); await click(back()); expect(latest.view).toBe('debrief');
        expect(latest.lastDebrief).toEqual(replacement);
      } else expect(latest.debriefLessonReturn == null).toBe(true);
    });

  it('rejects an old return after committed same-ID evidence hydration while allowing the current return', async () => {
    await mount(); await click(study()); const oldReturn = handler(back());
    const replacement = flight('generic', { samples: [row(12, { alt: 6100 })], reflection: 'Hydrated review explanation.' });
    await act(async () => setSaved({ lastDebrief: replacement, debriefSampleIndex: 0 })); const before = reviewState();
    await act(async () => oldReturn()); expect(latest.view).toBe('lesson'); expect(reviewState()).toEqual(before);
    expect(back()).toBeTruthy(); await click(back());
    expect(latest.view).toBe('debrief'); expect(reviewState()).toEqual(before);
    expect(textarea('generic').value).toBe(replacement.reflection);
    expect(host.querySelector('#debrief-observation-time').value).toBe('0');
  });

  it('retires an old lesson return across same-ID evidence A to B to A without changing the saved return context', async () => {
    await mount(); await click(study());
    const oldReturn = handler(back()), original = copy(latest.lastDebrief), context = copy(latest.debriefLessonReturn);
    await act(async () => setSaved({ lastDebrief: flight('generic', {
      samples: [row(12, { alt: 6100 })], reflection: 'Intermediate corrected evidence.' }) }));
    expect(latest.debriefLessonReturn).toEqual(context);
    await act(async () => setSaved({ lastDebrief: copy(original) })); const before = reviewState();
    expect(latest.debriefLessonReturn).toEqual(context);
    await act(async () => oldReturn());
    expect(latest.view).toBe('lesson'); expect(reviewState()).toEqual(before);
    await click(back()); expect(latest.view).toBe('debrief'); expect(reviewState()).toEqual(before);
  });

  it('keeps a serialized version-1 lesson context usable with the latest same-ID evidence', async () => {
    await mount(); await click(study()); const saved = copy(latest);
    expect(saved.debriefLessonReturn).toEqual({ version: 1, attemptId: 'review-a', lessonId: saved.selectedLesson });
    saved.lastDebrief = flight('generic', { samples: [row(10, { alt: 5800 }), row(12, { alt: 6000 })],
      reflection: 'The reloaded review contains its current explanation.' });
    saved.debriefSampleIndex = 1;
    await mount('generic', saved); const before = reviewState();
    expect(latest.debriefLessonReturn).toEqual(saved.debriefLessonReturn); expect(back()).toBeTruthy();
    await click(back()); expect(latest.view).toBe('debrief'); expect(reviewState()).toEqual(before);
    expect(textarea('generic').value).toBe(saved.lastDebrief.reflection);
    expect(host.querySelector('#debrief-observation-time').value).toBe('1');
  });

  it('lets a current lesson return merge pending reflection-only changes and host metadata', async () => {
    await mount(); await click(study()); const currentReturn = handler(back()), before = reviewState();
    const replacement = { ...latest.lastDebrief, reflection: 'A current explanation changed during study.', teacherMarker: 'Keep this marker' };
    await act(async () => {
      setSaved({ lastDebrief: replacement, debriefSampleIndex: 1, debriefCompareIndex: 0 });
      currentReturn();
    });
    expect(latest.view).toBe('debrief'); expect(latest.debriefLessonReturn).toBeNull();
    expect(reviewState()).toEqual({ ...before, lastDebrief: replacement, debriefSampleIndex: 1, debriefCompareIndex: 0 });
  });

  it.each(['generic', 'challenge'].flatMap(kind => ['reflection', 'supporting study'].map(control => [kind, control])))(
    'rechecks a delayed accepted %s %s update after committed same-ID evidence A to B to A', async (kind, control) => {
      await mount(kind, {}, { delayHost: true }); await flushHost();
      const original = copy(latest);
      if (control === 'reflection') await input(textarea(kind), 'A draft accepted before the host delay.');
      else await click(study());
      // The callback has passed its live preflight gate, but its functional
      // update has not yet received the actual host state.
      expect(pending).toHaveLength(1); expect(latest).toEqual(original);
      await act(async () => setSaved({ lastDebrief: flight(kind, {
        samples: [row(12, { alt: 6100 })], reflection: 'Intermediate evidence B.' }) }));
      await act(async () => setSaved(copy(original)));
      const receiptStart = replayChecks.length;
      await flushHost();
      expect(latest).toEqual(original);
      const receipts = replayChecks.slice(receiptStart);
      expect(receipts.length).toBeGreaterThan(0);
      expect(receipts.every(receipt => receipt.pure && receipt.stable && receipt.unchanged)).toBe(true);
      if (control === 'reflection') {
        await input(textarea(kind), 'The current control owns its delayed draft.'); await flushHost();
        expect(latest.lastDebrief.reflection).toBe('The current control owns its delayed draft.');
        if (kind === 'challenge') expect(latest.challengeReflections.first_flight).toBe(latest.lastDebrief.reflection);
      } else {
        await click(study()); await flushHost(); expect(latest.view).toBe('lesson');
        expect(latest.debriefLessonReturn.attemptId).toBe(original.lastDebrief.attemptId);
      }
    });

  it('rechecks a delayed accepted lesson return after committed same-ID evidence A to B to A', async () => {
    await mount(); await click(study()); delayHost = true;
    const original = copy(latest), context = copy(latest.debriefLessonReturn);
    await click(back());
    expect(pending).toHaveLength(1); expect(latest).toEqual(original);
    await act(async () => setSaved({ lastDebrief: flight('generic', {
      samples: [row(12, { alt: 6100 })], reflection: 'Intermediate evidence B during study.' }) }));
    expect(latest.debriefLessonReturn).toEqual(context);
    await act(async () => setSaved(copy(original)));
    const receiptStart = replayChecks.length;
    await flushHost(); expect(latest).toEqual(original);
    const receipts = replayChecks.slice(receiptStart);
    expect(receipts.length).toBeGreaterThan(0);
    expect(receipts.every(receipt => receipt.pure && receipt.stable && receipt.unchanged)).toBe(true);
    await click(back()); await flushHost(); expect(latest.view).toBe('debrief');
    expect(latest.lastDebrief).toEqual(original.lastDebrief); expect(latest.debriefLessonReturn).toBeNull();
  });
});
