import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, api, host, root, latest, saved, setSaved, pending, delayHost, replayChecks, writes, xp, errors;
const copy = value => JSON.parse(JSON.stringify(value));
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const complete = () => button('📚 Mark lesson complete');
const nav = id => [...host.querySelectorAll('[data-flight-lesson-navigation] button')]
  .find(node => node.title === api.LESSONS[id].title);
const next = () => button(api.LESSONS.drag.title + ' →');
function handler(node) {
  expect(node).toBeTruthy();
  return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))].onClick;
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
async function patch(values) { await act(async () => setSaved(values)); }
async function flushHost() {
  for (let count = 0; pending.length; count++) {
    expect(count).toBeLessThan(20);
    const apply = pending.shift(); await act(async () => apply());
  }
}
async function mount(seed = {}, options = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  pending = []; delayHost = !!options.delayHost;
  function App() {
    const [data, update] = React.useState({ teacherNotebook: { kept: 'outside the flight tool' },
      flightSim: { view: 'lesson', selectedLesson: 'lift', aircraft: 'cessna172',
        completedLessons: { weather: true }, lessonsCompleted: 1,
        quizScore: 7, quizTotal: 12, teacherMarker: 'original', ...seed } });
    saved = data; latest = data.flightSim;
    const committedCompletions = React.useRef(data.flightSim.completedLessons);
    React.useEffect(() => {
      if (committedCompletions.current !== data.flightSim.completedLessons) writes.push(copy(data.flightSim.completedLessons));
      committedCompletions.current = data.flightSim.completedLessons;
    }, [data.flightSim.completedLessons]);
    setSaved = values => update(old => ({ ...old, flightSim: { ...old.flightSim, ...values } }));
    const submit = change => {
      const apply = () => update(previous => {
        if (typeof change !== 'function') return change;
        const before = JSON.stringify(previous), first = change(previous), second = change(previous);
        replayChecks.push({ pure: JSON.stringify(previous) === before,
          stable: JSON.stringify(first) === JSON.stringify(second) });
        return second;
      });
      if (delayHost) pending.push(apply); else apply();
    };
    return tool.render(makeCtx({ toolData: data,
      setToolData: options.legacyHost ? undefined : submit,
      update: (id, key, value) => submit(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, values) => submit(old => ({ ...old, [id]: { ...old[id], ...values } })),
      awardXP: (...args) => xp.push(args),
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
  replayChecks = []; writes = []; xp = []; errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); expect(xp).toHaveLength(0);
  expect(replayChecks.every(check => check.pure && check.stable)).toBe(true);
  delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Sky School lesson action ownership', () => {
  it.each(['committed', 'pending'])('merges a completion with %s host progress instead of replacing newer lesson evidence', async timing => {
    await mount(); const done = handler(complete());
    const replacement = { completedLessons: { weather: true, drag: true, retired: true, thrust: 'true' },
      lessonsCompleted: 999, teacherMarker: 'newer host metadata' };
    if (timing === 'committed') { await patch(replacement); await act(async () => done()); }
    else await act(async () => { setSaved(replacement); done(); });
    expect(latest.completedLessons).toEqual({ lift: true, drag: true, weather: true });
    expect(latest.lessonsCompleted).toBe(3); expect(latest.teacherMarker).toBe('newer host metadata');
    expect(replacement.completedLessons).toEqual({ weather: true, drag: true, retired: true, thrust: 'true' });
    expect(saved.teacherNotebook).toEqual({ kept: 'outside the flight tool' });
    expect([latest.quizScore, latest.quizTotal]).toEqual([7, 12]);
  });

  it('merges a fully delayed accepted completion with later host progress in a replayable updater', async () => {
    await mount({}, { delayHost: true }); await click(complete());
    expect(latest.completedLessons).toEqual({ weather: true }); expect(pending).toHaveLength(1);
    await patch({ completedLessons: { drag: true, weather: true }, lessonsCompleted: 2, teacherMarker: 'hydrated' });
    await flushHost();
    expect(latest.completedLessons).toEqual({ lift: true, drag: true, weather: true });
    expect(latest.lessonsCompleted).toBe(3); expect(latest.teacherMarker).toBe('hydrated');
    expect(replayChecks.length).toBeGreaterThan(0);
  });

  it.each(['completion', 'strip', 'next'].flatMap(control => ['committed', 'pending'].map(timing => [control, timing])))
    ('rejects an old %s control after a %s lesson selection change', async (control, timing) => {
      await mount(); const run = handler(control === 'completion' ? complete() : control === 'strip' ? nav('thrust') : next());
      const replacement = { selectedLesson: 'weight', teacherMarker: 'current lesson' };
      if (timing === 'committed') { await patch(replacement); await act(async () => run()); }
      else await act(async () => { setSaved(replacement); run(); });
      expect(latest.selectedLesson).toBe('weight'); expect(latest.completedLessons).toEqual({ weather: true });
      expect(latest.lessonsCompleted).toBe(1); expect(latest.teacherMarker).toBe('current lesson');
    });

  it.each(['completion', 'strip', 'next'].flatMap(control => ['committed', 'pending'].map(timing => [control, timing])))
    ('rejects an old %s control after %s Menu navigation', async (control, timing) => {
      await mount(); const run = handler(control === 'completion' ? complete() : control === 'strip' ? nav('thrust') : next());
      if (timing === 'committed') { await patch({ view: 'menu' }); await act(async () => run()); }
      else await act(async () => { setSaved({ view: 'menu' }); run(); });
      expect(latest.view).toBe('menu'); expect(latest.selectedLesson).toBe('lift');
      expect(latest.completedLessons).toEqual({ weather: true }); expect(latest.lessonsCompleted).toBe(1);
    });

  it.each(['completion', 'strip'].flatMap(control => ['selection', 'view', 'A to B to A'].map(change => [control, change])))
    ('rechecks a fully delayed accepted %s after a host %s change', async (control, change) => {
      await mount({}, { delayHost: true }); await click(control === 'completion' ? complete() : nav('thrust'));
      expect(pending).toHaveLength(1);
      if (change === 'selection') await patch({ selectedLesson: 'weight' });
      else if (change === 'view') await patch({ view: 'menu' });
      else { await patch({ selectedLesson: 'drag' }); await patch({ selectedLesson: 'lift' }); }
      const before = copy(latest); await flushHost(); expect(latest).toEqual(before);
    });

  it.each(['completion', 'strip'])('retires retained %s callbacks across a committed lesson A to B to A visit', async control => {
    await mount(); const old = handler(control === 'completion' ? complete() : nav('thrust'));
    await patch({ selectedLesson: 'drag' }); await patch({ selectedLesson: 'lift' });
    const before = copy(latest); await act(async () => old()); expect(latest).toEqual(before);
    await click(control === 'completion' ? complete() : nav('thrust'));
    if (control === 'completion') expect(latest.completedLessons.lift).toBe(true);
    else expect(latest.selectedLesson).toBe('thrust');
  });

  it('preserves completion before Next when both actions occur before React commits', async () => {
    await mount(); const done = handler(complete()), advance = handler(next());
    await act(async () => { done(); advance(); });
    expect(latest.selectedLesson).toBe('drag');
    expect(latest.completedLessons).toEqual({ lift: true, weather: true }); expect(latest.lessonsCompleted).toBe(2);
    expect(document.activeElement).toBe(host.querySelector('#skyschool-lesson-title'));
  });

  it('rejects the old completion after Next when both actions occur before React commits', async () => {
    await mount(); const done = handler(complete()), advance = handler(next());
    await act(async () => { advance(); done(); });
    expect(latest.selectedLesson).toBe('drag');
    expect(latest.completedLessons).toEqual({ weather: true }); expect(latest.lessonsCompleted).toBe(1);
  });

  it('does not duplicate a same-tick completion and restores real progress after serialization', async () => {
    await mount({}, { delayHost: true }); const done = handler(complete());
    await act(async () => { done(); done(); });
    expect(pending).toHaveLength(1); await flushHost();
    expect(latest.completedLessons).toEqual({ lift: true, weather: true }); expect(latest.lessonsCompleted).toBe(2);
    expect(writes).toHaveLength(1);
    await mount(copy(latest)); expect(button('✓ Lesson completed').disabled).toBe(true);
    await click(nav('drag')); await click(complete());
    expect(latest.completedLessons).toEqual({ lift: true, drag: true, weather: true }); expect(latest.lessonsCompleted).toBe(3);
    expect(host.querySelector('[aria-live="polite"]').textContent).toContain('3 done');
    expect(tool.questHooks.find(hook => hook.id === 'complete_lesson').check(latest)).toBe(true);
  });

  it('keeps previous-lesson controls owned by the lesson that displayed them', async () => {
    await mount({ selectedLesson: 'drag' }); const previous = handler(button('← ' + api.LESSONS.lift.title));
    await patch({ selectedLesson: 'weight' }); await act(async () => previous());
    expect(latest.selectedLesson).toBe('weight');
    await click(button('← ' + api.LESSONS.thrust.title)); expect(latest.selectedLesson).toBe('thrust');
  });

  it.each(['committed', 'pending', 'A to B to A'])('retires the last lesson Menu control after a %s selection change', async timing => {
    await mount({ selectedLesson: 'weather' }); const exit = handler(button('Back to menu →'));
    if (timing === 'pending') await act(async () => { setSaved({ selectedLesson: 'lift' }); exit(); });
    else {
      await patch({ selectedLesson: 'lift' });
      if (timing === 'A to B to A') await patch({ selectedLesson: 'weather' });
      await act(async () => exit());
    }
    expect(latest.view).toBe('lesson'); expect(latest.selectedLesson).toBe(timing === 'A to B to A' ? 'weather' : 'lift');
    expect(latest.completedLessons).toEqual({ weather: true });
    await click(host.querySelector('[data-flight-lesson-menu]')); expect(latest.view).toBe('menu');
  });

  it('preserves same-batch ordering in a legacy host without a functional setter', async () => {
    await mount({}, { legacyHost: true }); const done = handler(complete()), advance = handler(next());
    await act(async () => { done(); advance(); done(); });
    expect(latest.selectedLesson).toBe('drag');
    expect(latest.completedLessons).toEqual({ lift: true, weather: true }); expect(latest.lessonsCompleted).toBe(2);
  });
});
