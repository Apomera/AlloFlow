import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_solarsystem.js', 'utf8');
const BANK = new Function('__alloT', source.slice(source.indexOf('var solarShuffledOpts = function'), source.indexOf('var VOCAB')) + '\nreturn QUIZ_BANK;')((key, fallback) => fallback);
const worlds = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const translate = (key, fallback) => worlds.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;
const question = (patch = {}) => ({ ...BANK[0], opts: BANK[0].opts.slice(), answered: false, correct: null, chosen: null, score: 1, streak: 2, ...patch });
function retainQuiz(tree) {
  const found = [];
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props['data-solar-quiz']) { found.push(node); return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return React.createElement(React.Fragment, null, found);
}
// Exercise production event handlers and refs without mounting unrelated WebGL.
function renderQuiz(seed = {}, options = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
    selectedPlanet: 'Earth', viewTab: 'overview', paused: true, missionLog: [], journalEntries: [], ...seed } });
  const config = window.StemLab._registry.solarSystem, refs = [], toast = vi.fn(), announce = vi.fn(), award = vi.fn();
  let callbacks, cursor, effects, writes = 0;
  const transitions = [];
  const callbackReact = { ...React, useRef(initial) {
    const ref = React.useRef(initial), index = cursor++;
    if (!refs[index]) refs[index] = ref; return refs[index];
  }, useEffect(effect) { if (effect.name === 'deliverSolarQuizFeedback') effects.push(effect); }, createElement(type, props, ...children) {
    if (type === 'style') return null;
    if (typeof type === 'string' && props && (props.ref || props.onClick)) {
      const id = String(callbacks.size), element = React.createElement(type, { ...props, 'data-quiz-test-callback': id }, ...children);
      callbacks.set(id, { ...element.props, ref: element.ref }); return element;
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map(); cursor = 0; effects = []; store.dirty = false;
      const ctx = makeCtx({ t: translate, awardXP: award, addToast: toast, announceToSR: announce, React: callbackReact }, store);
      const set = ctx.setToolData; ctx.setToolData = updater => {
        writes++;
        if (options.replayUpdates && typeof updater === 'function') updater(store.toolData);
        set(updater); transitions.push(store.toolData.solarSystem);
      };
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => retainQuiz(config.render(ctx))));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  function props(node) { expect(node).toBeTruthy(); const value = callbacks.get(node.dataset.quizTestCallback); expect(value).toBeTruthy(); return value; }
  function click(node) { expect(node.disabled).toBe(false); props(node).onClick({ currentTarget: node }); render(); }
  function commit(node, target = node) { const ref = props(node).ref; expect(ref).toBeTypeOf('function'); ref(target); }
  function flush() { expect(effects).toHaveLength(1); effects.forEach(effect => effect()); }
  render();
  return { get state() { return store.toolData.solarSystem; }, get writes() { return writes; }, transitions,
    get root() { return document.querySelector('[data-solar-quiz]'); }, get draw() { return document.querySelector('[data-quiz-draw]'); },
    get heading() { return document.getElementById('solar-quiz-question-title'); }, get feedbackHeading() { return document.getElementById('solar-quiz-feedback-title'); },
    get feedback() { return document.querySelector('[data-quiz-feedback]'); }, get score() { return document.querySelector('[data-quiz-score]').textContent; },
    get streak() { return document.querySelector('[data-quiz-streak]').textContent; }, get count() { return document.querySelector('[data-quiz-round-count]').textContent; },
    choices() { return [...document.querySelectorAll('[data-quiz-option]')]; }, answer(value) { return this.choices()[this.state.quiz.opts.indexOf(value)]; },
    patch(patch) { store.toolData = { ...store.toolData, solarSystem: { ...store.toolData.solarSystem, ...patch } }; },
    hooks: config.questHooks, captureEffects() { return effects.slice(); }, render, props, click, commit, flush, toast, announce, award,
  };
}
function focusSpy(node) { node.scrollIntoView = vi.fn(); return vi.spyOn(node, 'focus'); }

describe('Solar System quiz workbench', () => {
  beforeEach(() => {
    vi.useFakeTimers(); resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    window.StemLab.audioContext = vi.fn(() => null);
    vi.stubGlobal('matchMedia', vi.fn(query => ({ matches: true, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it('offers a named start action and honest zero progress without render-time writes', () => {
    const env = renderQuiz(); expect(env.draw.textContent).toBe('Start quiz'); expect(env.draw.type).toBe('button');
    expect(env.heading).toBeNull(); expect(env.score).toBe('0'); expect(env.streak).toBe('0'); expect(env.count).toBe('0 of 15 questions drawn');
    expect(env.root.querySelector('[role="progressbar"]').getAttribute('aria-label')).toBe('Questions drawn this round');
    env.render(); env.flush(); expect(env.writes).toBe(0); expect(env.toast).not.toHaveBeenCalled(); expect(env.award).not.toHaveBeenCalled();
  });

  it('draws quiz and history atomically while retaining other current work', () => {
    const env = renderQuiz(), journal = [{ observation: 'Added before drawing.' }];
    env.patch({ journalEntries: journal, quizAsked: [BANK[2].q], learningPathChecks: { explorer: [true] } });
    const writes = env.writes; env.click(env.draw);
    expect(env.writes - writes).toBe(1); expect(env.state.quizAsked).toEqual([BANK[2].q, env.state.quiz.q]);
    expect(env.state.quiz.q).not.toBe(BANK[2].q); expect(env.state.journalEntries).toBe(journal);
    expect(env.state.learningPathChecks).toEqual({ explorer: [true] }); expect(env.draw.textContent).toBe('Skip question');
    expect(env.transitions.at(-1).quizAsked).toContain(env.transitions.at(-1).quiz.q);
    expect(env.state.quiz.opts).toContain(env.state.quiz.a); expect(env.state.quiz._solarQuizDraw).toEqual(expect.any(String));
  });

  it('keeps shuffled choices stable on rerender and grades their text', () => {
    const env = renderQuiz(); env.click(env.draw); const opts = env.state.quiz.opts, correct = env.state.quiz.a;
    env.render(); expect(env.state.quiz.opts).toBe(opts); expect(env.choices().map(node => node.getAttribute('aria-label'))).toEqual(opts);
    env.click(env.answer(correct)); expect(env.state.quiz.correct).toBe(true); expect(env.state.quiz.chosen).toBe(correct);
    expect(env.score).toBe('1'); expect(env.streak).toBe('1'); expect(env.draw.textContent).toBe('Next question');
    expect(env.choices().every(node => node.disabled)).toBe(true);
    expect(env.answer(correct).textContent).toContain('Your answer · Correct'); expect(env.feedback.textContent).toContain(env.state.quiz.tip);
  });

  it('locks the first answer even for rapid duplicate or conflicting callbacks', () => {
    const env = renderQuiz({ quiz: question() }, { replayUpdates: true }), correct = env.answer('Venus'), wrong = env.answer('Mercury');
    const onCorrect = env.props(correct).onClick, onWrong = env.props(wrong).onClick;
    onCorrect(); onCorrect(); onWrong(); env.render();
    expect(env.state.quiz.chosen).toBe('Venus'); expect(env.score).toBe('2'); expect(env.streak).toBe('3');
    expect(env.toast).not.toHaveBeenCalled(); env.flush(); env.flush(); expect(env.toast).toHaveBeenCalledOnce();
    expect(env.announce).toHaveBeenCalledOnce(); expect(env.award).not.toHaveBeenCalled();
  });

  it('ignores an old answer after drawing another question and an old draw after answering', () => {
    const env = renderQuiz({ quiz: question() }); const oldAnswer = env.props(env.answer('Venus')).onClick;
    env.click(env.draw); const next = env.state.quiz; oldAnswer(); env.render(); expect(env.state.quiz).toBe(next); expect(env.score).toBe('1');
    const oldDraw = env.props(env.draw).onClick; env.click(env.answer(env.state.quiz.a)); const answered = env.state.quiz;
    oldDraw(); env.render(); expect(env.state.quiz).toBe(answered); expect(env.state.quiz.answered).toBe(true);
  });

  it('ignores stale callbacks after an external question replacement or Orrery switch', () => {
    const env = renderQuiz({ quiz: question() }), oldAnswer = env.props(env.answer('Venus')).onClick, oldDraw = env.props(env.draw).onClick;
    const imported = question({ ...BANK[3], score: 9 }); env.patch({ quiz: imported });
    oldAnswer(); oldDraw(); expect(env.state.quiz).toBe(imported); env.render();
    const answer = env.props(env.answer(env.state.quiz.a)).onClick; env.patch({ orreryMode: true }); answer();
    expect(env.state.quiz).toBe(imported); expect(env.state.orreryMode).toBe(true);
  });

  it('keeps cumulative score, resets only the current streak for wrong answers, and shows fallback feedback', () => {
    const env = renderQuiz({ quiz: question({ wrongFeedback: null }) }); env.click(env.answer('Mercury'));
    expect(env.score).toBe('1'); expect(env.streak).toBe('0'); expect(env.feedback.textContent).toContain('Your answer: Mercury. Correct answer: Venus.');
    expect(env.feedback.textContent).toContain(BANK[0].tip); expect(env.answer('Mercury').textContent).toContain('Your answer · Review');
    expect(env.answer('Venus').textContent).toContain('Correct answer'); env.click(env.draw);
    expect(env.score).toBe('1'); expect(env.streak).toBe('0'); expect(env.feedback).toBeNull();
    env.click(env.draw); expect(env.score).toBe('1'); expect(env.streak).toBe('0');
  });

  it('reaches each bank question once before resetting only round history', () => {
    const env = renderQuiz({ quiz: question({ score: 6, streak: 3 }) }); const seen = [env.state.quiz.q];
    while (seen.length < BANK.length) { env.click(env.draw); expect(seen).not.toContain(env.state.quiz.q); seen.push(env.state.quiz.q); }
    expect(new Set(seen)).toEqual(new Set(BANK.map(q => q.q))); expect(env.count).toBe('15 of 15 questions drawn');
    expect(env.draw.textContent).toBe('Skip to next round'); env.click(env.answer(env.state.quiz.a));
    expect(env.draw.textContent).toBe('Start next round'); expect(env.score).toBe('7'); env.click(env.draw);
    expect(env.count).toBe('1 of 15 questions drawn'); expect(env.state.quizAsked).toEqual([env.state.quiz.q]);
    expect(env.score).toBe('7'); expect(env.streak).toBe('4');
  });

  it('normalizes duplicate and unknown history and maps legacy Pluto wording without render writes', () => {
    const legacy = 'Which planet has the longest year?', current = 'Which of these worlds has the longest year?';
    const oldQuestion = question({ ...BANK.find(q => q.a === 'Pluto'), q: legacy });
    const asked = [legacy, current, BANK[0].q, BANK[0].q, 'unknown', false, null];
    const env = renderQuiz({ quiz: oldQuestion, quizAsked: asked });
    expect(env.heading.textContent).toBe(current); expect(env.count).toBe('2 of 15 questions drawn');
    expect(env.state.quiz.q).toBe(legacy); expect(env.state.quizAsked).toBe(asked); expect(env.writes).toBe(0);
    env.click(env.draw); expect(env.state.quizAsked).toHaveLength(3); expect(env.state.quizAsked).toContain(current);
    expect(env.state.quizAsked).not.toContain(legacy); expect(env.state.quiz.q).not.toBe(current);
    for (const raw of [null, 'asked', 4, { length: 15 }]) {
      const safe = renderQuiz({ quizAsked: raw }); expect(safe.count).toBe('0 of 15 questions drawn'); safe.click(safe.draw); expect(safe.state.quizAsked).toHaveLength(1);
    }
  });

  it('recovers invalid restored questions without deleting their valid cumulative score', () => {
    const invalid = [null, false, 'quiz', [], {}, question({ opts: null }), question({ opts: ['Venus', 'Venus'] }), question({ opts: ['Mars', 'Earth'] }), question({ opts: ['Venus', {}] })];
    for (const raw of invalid) {
      const env = renderQuiz({ quiz: raw }); expect(env.heading).toBeNull(); expect(env.draw.textContent).toBe('Start quiz'); expect(env.writes).toBe(0);
      env.click(env.draw); expect(env.choices()).toHaveLength(4); expect(env.score).toBe(raw && raw.score === 1 ? '1' : '0');
    }
    const env = renderQuiz({ quiz: { score: 8, streak: 4 } }); env.click(env.draw); expect(env.score).toBe('8'); expect(env.streak).toBe('4');
  });

  it('uses only nonnegative safe integer counters for display, scoring, and objectives', () => {
    for (const value of ['5', -2, 1.5, Infinity, NaN, {}, true]) {
      const env = renderQuiz({ quiz: question({ score: value, streak: value }) });
      expect(env.score).toBe('0'); expect(env.streak).toBe('0');
      expect(env.hooks.find(hook => hook.id === 'quiz_score_5').check(env.state)).toBe(false);
      expect(env.hooks.find(hook => hook.id === 'quiz_score_8').progress(env.state)).toBe('0/8');
      env.click(env.answer('Venus')); expect(env.score).toBe('1'); expect(env.streak).toBe('1');
    }
    const env = renderQuiz({ quiz: question({ score: 7 }) }); env.click(env.answer('Venus'));
    expect(env.hooks.find(hook => hook.id === 'quiz_score_8').check(env.state)).toBe(true);
  });

  it('keeps an answered legacy question locked when the chosen answer is missing', () => {
    const saved = question({ answered: true, correct: true, chosen: 'missing', score: 5 }); const env = renderQuiz({ quiz: saved });
    expect(env.choices().every(node => node.disabled)).toBe(true); expect(env.feedbackHeading.textContent).toBe('Review your saved question');
    expect(env.feedback.textContent).toContain('Correct answer: Venus.'); expect(env.score).toBe('5');
    env.flush(); expect(env.writes).toBe(0); expect(env.toast).not.toHaveBeenCalled(); expect(env.state.quiz).toBe(saved);
  });

  it('focuses the drawn question once after connection and never lets an old heading steal focus', () => {
    const env = renderQuiz(); env.click(env.draw); const first = env.heading, firstRef = env.props(first).ref, focus = focusSpy(first), parent = first.parentNode;
    env.commit(first, null); first.remove(); firstRef(first); expect(focus).not.toHaveBeenCalled();
    parent.appendChild(first); firstRef(first); firstRef(first); expect(focus).toHaveBeenCalledOnce();
    expect(first.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
    const draw = env.props(env.draw).onClick; draw(); firstRef(first); expect(focus).toHaveBeenCalledOnce(); env.render();
    const nextFocus = focusSpy(env.heading); env.commit(env.heading); expect(nextFocus).toHaveBeenCalledOnce();
  });

  it('focuses committed feedback and avoids a duplicate screen-reader announcement', () => {
    const env = renderQuiz({ quiz: question() }); env.click(env.answer('Venus'));
    const heading = env.feedbackHeading, focus = focusSpy(heading); env.commit(heading); env.commit(heading); expect(focus).toHaveBeenCalledOnce();
    expect(heading.getAttribute('aria-describedby')).toBe('solar-quiz-feedback-copy'); env.flush(); env.flush();
    expect(env.toast).toHaveBeenCalledOnce(); expect(env.announce).not.toHaveBeenCalled();
    const oldRef = env.props(heading).ref; env.props(env.draw).onClick(); oldRef(heading); expect(focus).toHaveBeenCalledOnce();
  });

  it('does not let a previous passive effect discard newly queued feedback', () => {
    const env = renderQuiz({ quiz: question() }); const oldEffects = env.captureEffects();
    env.props(env.answer('Venus')).onClick(); oldEffects.forEach(effect => effect()); expect(env.toast).not.toHaveBeenCalled();
    env.render(); env.flush(); expect(env.toast).toHaveBeenCalledOnce(); env.flush(); expect(env.toast).toHaveBeenCalledOnce();
  });

  it('does not replay feedback on restore or against an externally replaced quiz', () => {
    const env = renderQuiz({ quiz: question() }); env.click(env.answer('Venus'));
    const saved = env.state.quiz; const restored = renderQuiz({ quiz: saved }); restored.flush(); expect(restored.toast).not.toHaveBeenCalled();
    env.patch({ quiz: question({ ...BANK[3], score: 4 }) }); env.render(); env.flush(); expect(env.toast).not.toHaveBeenCalled();
  });

  it('preserves simultaneous journal and assignment work when an answer commits', () => {
    const env = renderQuiz({ quiz: question() }), journal = [{ observation: 'Concurrent evidence' }], checks = [0, 2];
    env.patch({ journalEntries: journal, asn_done_inner_planets: checks, compare1: 'Mars', compare2: 'Jupiter' });
    env.click(env.answer('Venus')); expect(env.state.journalEntries).toBe(journal); expect(env.state.asn_done_inner_planets).toBe(checks);
    expect(env.state.compare1).toBe('Mars'); expect(env.state.compare2).toBe('Jupiter'); expect(env.score).toBe('2');
  });
});
