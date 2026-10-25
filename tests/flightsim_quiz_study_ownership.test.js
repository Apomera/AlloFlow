import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, saved, setSaved, pending, delayHost, replayChecks, xp, errors;
const copy = value => JSON.parse(JSON.stringify(value));
const deck = () => api.getQuizDeck();
const weatherIndex = () => deck().findIndex(question => question.topic === 'Weather');
const key = index => api.flightQuizQuestionKey(deck()[index]);
const back = () => host.querySelector('[data-quiz-study-return]');
const menu = () => host.querySelector('button[aria-label="Back to menu"]');
function response(index, correct = false, order = 0) {
  const question = deck()[index];
  return { choice: correct ? question.correct : question.options.find(option => option !== question.correct), correct, order };
}
function studySeed(index = weatherIndex(), options = {}) {
  const first = response(index, !!options.correct), question = deck()[index];
  const topic = api.flightQuizStudyTopic(question.topic), sequence = options.sequence ?? 5;
  const practicePicked = options.practice ? question.options.indexOf(question.correct) : null;
  return { view: 'learn', learnTopic: topic.id, learnQuery: '', quizIdx: index,
    quizFirstAttempts: { [key(index)]: first }, quizScore: first.correct ? 1 : 0, quizTotal: 1,
    quizStreak: first.correct ? 1 : 0, quizBest: first.correct ? 1 : 0,
    quizPracticeKey: options.practice ? key(index) : null, quizPracticePicked: practicePicked,
    quizAttemptSequence: sequence,
    quizStudyReturn: { version: 1, questionKey: key(index), topicId: topic.id, firstChoice: first.choice,
      practiceChoice: options.practice ? question.correct : null, attemptSequence: sequence } };
}
function replacement(kind) {
  if (kind === 'Menu') return { view: 'menu', quizStudyReturn: null };
  if (kind === 'question') return studySeed(0);
  if (kind === 'first response') return studySeed(weatherIndex(), { correct: true });
  if (kind === 'practice response') return studySeed(weatherIndex(), { practice: true });
  return studySeed(weatherIndex(), { sequence: 6 });
}
function handler(node) {
  expect(node).toBeTruthy();
  return node[Object.keys(node).find(name => name.startsWith('__reactProps$'))].onClick;
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
      flightSim: { ...studySeed(), totalFlightTime: 900, teacherMarker: 'original', ...seed } });
    saved = data; latest = data.flightSim;
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
    return tool.render(makeCtx({ toolData: data, setToolData: submit,
      update: (id, name, value) => submit(old => ({ ...old, [id]: { ...old[id], [name]: value } })),
      updateMulti: (id, values) => submit(old => ({ ...old, [id]: { ...old[id], ...values } })),
      awardXP: (...args) => xp.push(args),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  replayChecks = []; xp = []; errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); expect(xp).toHaveLength(0);
  expect(replayChecks.every(check => check.pure && check.stable)).toBe(true);
  delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Sky School quiz study return ownership', () => {
  it.each(['return', 'Menu'].flatMap(control => ['committed', 'pending'].flatMap(timing =>
    ['question', 'first response', 'practice response', 'attempt sequence', 'Menu'].map(change => [control, timing, change]))))
    ('rejects an old %s control after a %s replacement of the study %s', async (control, timing, change) => {
      await mount(); const run = handler(control === 'return' ? back() : menu());
      const newer = { ...replacement(change), teacherMarker: 'newer host metadata' };
      if (timing === 'committed') { await patch(newer); await act(async () => run()); }
      else await act(async () => { setSaved(newer); run(); });
      expect(latest).toMatchObject(newer);
      expect(latest.totalFlightTime).toBe(900);
      expect(saved.teacherNotebook).toEqual({ kept: 'outside the flight tool' });
      if (change !== 'Menu') expect(back()).toBeTruthy();
    });

  it.each(['return', 'Menu'].flatMap(control => ['context', 'Menu', 'A to B to A'].map(change => [control, change])))
    ('rechecks a fully delayed accepted %s after a host %s change', async (control, change) => {
      await mount({}, { delayHost: true }); const original = copy(latest);
      await click(control === 'return' ? back() : menu()); expect(pending).toHaveLength(1);
      if (change === 'context') await patch(replacement('first response'));
      else if (change === 'Menu') await patch(replacement('Menu'));
      else { await patch(replacement('attempt sequence')); await patch(original); }
      const newer = copy(latest); await flushHost(); expect(latest).toEqual(newer);
    });

  it.each(['return', 'Menu'])('retires a retained %s after study A to B to A while fresh controls remain usable', async control => {
    await mount(); const original = copy(latest), run = handler(control === 'return' ? back() : menu());
    await patch(replacement('first response')); await patch(original);
    await act(async () => run()); expect(latest).toEqual(original);
    await click(control === 'return' ? back() : menu());
    expect(latest.view).toBe(control === 'return' ? 'quiz' : 'menu'); expect(latest.quizStudyReturn).toBeNull();
    expect(latest.quizFirstAttempts).toEqual(original.quizFirstAttempts);
  });

  it.each(['committed', 'pending', 'delayed'])('preserves a compatible %s addition to other question evidence while returning', async timing => {
    await mount({}, { delayHost: timing === 'delayed' }); const run = handler(back());
    const newer = { quizFirstAttempts: { ...copy(latest.quizFirstAttempts), [key(0)]: response(0, true, 1) },
      quizTotal: 2, quizScore: 1, teacherMarker: 'merged host metadata' };
    if (timing === 'delayed') { await act(async () => run()); await patch(newer); await flushHost(); }
    else if (timing === 'committed') { await patch(newer); await act(async () => run()); }
    else await act(async () => { setSaved(newer); run(); });
    expect(latest.view).toBe('quiz'); expect(latest.quizStudyReturn).toBeNull(); expect(latest).toMatchObject(newer);
    expect(saved.teacherNotebook).toEqual({ kept: 'outside the flight tool' });
  });

  it.each(['malformed context', 'different view'])('does not let delayed cleanup of a %s erase a newly valid study visit', async invalid => {
    const first = studySeed();
    await mount(invalid === 'malformed context' ? { quizStudyReturn: { ...first.quizStudyReturn, version: 2 } }
      : { view: 'quiz' }, { delayHost: true });
    expect(pending.length).toBeGreaterThan(0);
    const newer = { ...studySeed(weatherIndex(), { practice: true, sequence: 6 }), teacherMarker: 'valid replacement' };
    await patch(newer); const before = copy(latest); expect(back()).toBeTruthy();
    await flushHost(); expect(latest).toEqual(before); expect(back()).toBeTruthy();
    expect(api.flightQuizStudyContext(latest.quizStudyReturn, latest)).toEqual(newer.quizStudyReturn);
  });

  it('clears a still-invalid delayed context without changing current quiz evidence or host siblings', async () => {
    const first = studySeed(); await mount({ quizStudyReturn: { ...first.quizStudyReturn, firstChoice: 'not an answer' } }, { delayHost: true });
    const before = copy(latest); await flushHost();
    expect(latest).toEqual({ ...before, quizStudyReturn: null }); expect(back()).toBeNull();
    expect(saved.teacherNotebook).toEqual({ kept: 'outside the flight tool' });
  });

  it('keeps a serialized version-1 study visit usable through topic browsing, search, and cloned record hydration', async () => {
    await mount(studySeed(weatherIndex(), { practice: true })); const original = copy(latest);
    await mount(copy(latest)); const run = handler(back());
    await click(host.querySelector('nav[aria-label="Learn topics"] button'));
    const search = host.querySelector('input[type="search"]');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search, 'lift');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await patch({ quizFirstAttempts: copy(latest.quizFirstAttempts), quizStudyReturn: copy(latest.quizStudyReturn), teacherMarker: 'cloned' });
    await act(async () => run());
    expect(latest.view).toBe('quiz'); expect(latest.quizFirstAttempts).toEqual(original.quizFirstAttempts);
    expect(latest.quizPracticeKey).toBe(original.quizPracticeKey); expect(latest.quizPracticePicked).toBe(original.quizPracticePicked);
    expect(latest.quizAttemptSequence).toBe(original.quizAttemptSequence); expect(latest.teacherMarker).toBe('cloned');
    expect(latest.learnQuery).toBe('lift');
    expect(document.activeElement).toBe(host.querySelector('#skyschool-quiz-question'));
  });

  it('keeps Menu exit ahead of an old return submitted in the same batch', async () => {
    await mount(); const oldReturn = handler(back()), leave = handler(menu());
    await act(async () => { leave(); oldReturn(); });
    expect(latest.view).toBe('menu'); expect(latest.quizStudyReturn).toBeNull();
  });
});
