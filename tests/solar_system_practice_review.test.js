import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const AU_KM = 1.496e8;
const MU_KM = 6.674e-11 * 1.989e30 / 1e9;
const IDEA_ANSWERS = [false, false, false, true, false, true, false, true, false, false, false, false, true, false, true];

// Independent calculations use the stated units and Sun model, rather than
// the old rounded answer literals or the production helper functions.
const period = (a) => Math.sqrt(a * a * a);
const speed = (r, a) => Math.sqrt(MU_KM * (2 / (r * AU_KM) - 1 / (a * AU_KM)));
function transfer(r1, r2) {
  const a = (r1 + r2) / 2;
  return {
    deltaV: Math.abs(speed(r1, a) - speed(r1, r1)) + Math.abs(speed(r2, r2) - speed(r2, a)),
    days: Math.PI * Math.sqrt((a * AU_KM) ** 3 / MU_KM) / 86400,
  };
}
const CALCULATIONS = [
  { index: 0, title: 'Jupiter’s year', answer: period(5.203), tolerance: 0.15, hints: 3 },
  { index: 1, title: 'Circular Earth speed', answer: speed(1, 1), tolerance: 0.3, hints: 3 },
  { index: 2, title: 'Mercury’s nearest distance', answer: 0.387 * (1 - 0.2056), tolerance: 0.005, hints: 3 },
  { index: 3, title: 'Comet speed ratio', answer: 35 / 0.5, tolerance: 1.5, hints: 2 },
  { index: 4, title: 'Earth–Mars transfer', answer: transfer(1, 1.524).deltaV, tolerance: 0.25, hints: 3 },
  { index: 5, title: 'Solar escape speed', answer: Math.sqrt(2 * MU_KM / AU_KM), tolerance: 0.5, hints: 3 },
  { index: 6, title: 'Saturn’s year', answer: period(9.537), tolerance: 0.4, hints: 3 },
  { index: 7, title: 'Asteroid orbit size', answer: Math.cbrt(8 ** 2), tolerance: 0.1, hints: 3 },
  { index: 8, title: 'Mars at aphelion', answer: speed(1.524 * (1 + 0.0934), 1.524), tolerance: 0.4, hints: 3 },
  { index: 9, title: 'Earth–Venus flight time', answer: transfer(1, 0.723).days, tolerance: 5, hints: 3 },
];

// Capture actual production handlers, including keydown. Retaining a handler
// across two activations before rerender verifies the synchronous award guard.
function renderPractice(seed = {}, overrides = {}) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false,
    orreryMode: true, orr_tab: 6, orr_paused: true,
    missionLog: [], journalEntries: [], ...seed,
  } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (typeof type === 'string' && props &&
        ['onClick', 'onChange', 'onKeyDown'].some((eventName) => typeof props[eventName] === 'function')) {
      const id = String(callbacks.size);
      callbacks.set(id, props);
      return React.createElement(type, { ...props, 'data-practice-callback': id }, ...children);
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    let markup;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      callbacks = new Map();
      store.dirty = false;
      const ctx = makeCtx({ ...overrides, React: callbackReact }, store);
      markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => config.render(ctx)));
      if (!store.dirty) break;
    }
    document.body.innerHTML = markup;
  }
  function section() {
    return document.getElementById(Number(store.toolData.solarSystem.orr_tab) === 7
      ? 'orrery-misconception-practice' : 'orrery-calculation-practice');
  }
  function buttons() { return [...(section()?.querySelectorAll('button') || [])]; }
  function label(control) { return (control.getAttribute('aria-label') || control.textContent).replace(/\s+/g, ' ').trim(); }
  function button(name) { return buttons().find((control) => label(control) === name); }
  function handler(control, eventName) {
    expect(control, 'The native production practice control must be rendered').toBeTruthy();
    expect(control.disabled, 'Only an enabled control can be activated').toBe(false);
    const callback = callbacks.get(control.dataset.practiceCallback)?.[eventName];
    expect(callback).toBeTypeOf('function');
    return callback;
  }
  function event(control, extra = {}) {
    return { target: control, currentTarget: control, preventDefault() {}, ...extra };
  }
  function invoke(control, eventName, extra) {
    handler(control, eventName)(event(control, extra));
    render();
  }
  function navigate(index) {
    const isIdea = Number(store.toolData.solarSystem.orr_tab) === 7;
    const groupName = isIdea ? 'True or false question navigator' : 'Challenge question navigator';
    const prefix = (isIdea ? 'Idea ' : 'Question ') + (index + 1) + ':';
    const navigator = document.querySelector(`[role="group"][aria-label="${groupName}"]`);
    const control = [...(navigator?.querySelectorAll('button') || [])].find((item) => item.getAttribute('aria-label')?.startsWith(prefix));
    invoke(control, 'onClick');
  }
  render();
  return {
    get state() { return store.toolData.solarSystem; },
    get section() { return section(); },
    get answer() { return document.getElementById('orrery-calculation-answer'); },
    button, handler, event, navigate, render,
    buttonMatching(pattern) { return buttons().find((control) => pattern.test(label(control))); },
    click(control) { invoke(control, 'onClick'); },
    changeAnswer(value) { invoke(document.getElementById('orrery-calculation-answer'), 'onChange', { target: { value: String(value) } }); },
    enter() { invoke(document.getElementById('orrery-calculation-answer'), 'onKeyDown', { key: 'Enter' }); },
    showTab(tab) { store.toolData.solarSystem = { ...store.toolData.solarSystem, orr_tab: tab }; render(); },
  };
}

function currentIndex(isIdea = false) {
  const groupName = isIdea ? 'True or false question navigator' : 'Challenge question navigator';
  const control = document.querySelector(`[role="group"][aria-label="${groupName}"] button[aria-pressed="true"]`);
  expect(control).not.toBeNull();
  const match = control.getAttribute('aria-label')?.match(/^(?:Question|Idea) (\d+):/);
  expect(match).not.toBeNull();
  return Number(match[1]) - 1;
}

function calculationProgress(count) {
  expect(document.getElementById('orrery-challenge-progress')?.textContent).toContain(`Challenge progress: ${count} of 10 solved`);
  const bar = document.querySelector('[role="progressbar"][aria-label="Challenge completion"]');
  expect(bar?.getAttribute('aria-valuenow')).toBe(String(count));
  expect(bar?.getAttribute('aria-valuemax')).toBe('10');
}

function ideaProgress(count) {
  expect(document.getElementById('orrery-misconception-progress')?.textContent).toContain(`Ideas checked: ${count} of 15`);
}

function feedback(id) {
  const node = document.getElementById(id);
  expect(node).not.toBeNull();
  expect(node.getAttribute('role')).toBe('status');
  expect(node.getAttribute('aria-live')).toBe('polite');
  expect(node.getAttribute('aria-atomic')).toBe('true');
  expect(node.textContent.trim()).toBeTruthy();
  return node;
}

function revealHints(env) {
  for (let i = 0; i < 12; i++) {
    const hint = env.buttonMatching(/^Reveal hint \(/);
    if (!hint) break;
    env.click(hint);
  }
  expect(env.buttonMatching(/^Reveal hint \(/)).toBeUndefined();
}

function otherWork(state) {
  const {
    orr_tab, orr_chi, orr_cha, orr_chh, orr_chc, orr_chf, orr_chpractice, orr_chsolution, orr_chlast,
    orr_tfi, orr_tfa, orr_tfreviewing, orr_tfreview, ...rest
  } = state;
  return structuredClone(rest);
}

describe('Solar System calculation and misconception practice review', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'solarSystem');
    vi.stubGlobal('matchMedia', vi.fn((query) => ({
      matches: false, media: query, onchange: null,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('names the current calculation, answer and topic navigation while retaining legacy progress', () => {
    const env = renderPractice();
    expect(env.section?.tagName).toBe('SECTION');
    expect(document.getElementById('orrery-calculation-question')?.getAttribute('data-question-index')).toBe('0');
    expect(env.answer?.type).toBe('number');
    expect(env.answer.step).toBe('any');
    expect(env.answer.getAttribute('aria-label')).toMatch(/Jupiter.*\(yr\)$/);
    expect(env.button('Submit')?.type).toBe('button');
    const navigator = document.querySelector('[role="group"][aria-label="Challenge question navigator"]');
    expect([...navigator.querySelectorAll('button')].map((control) => control.getAttribute('aria-label')))
      .toEqual(CALCULATIONS.map((question) => `Question ${question.index + 1}: ${question.title}`));
    calculationProgress(0);
    expect(env.button('Show worked solution')).toBeUndefined();
    expect(env.button('Next unsolved calculation')?.disabled).toBe(false);
  });

  it.each(CALCULATIONS)('checks model-derived $title with its unchanged tolerance', ({ index, answer, tolerance }) => {
    const awardXP = vi.fn();
    const env = renderPractice({ orr_chi: index }, { awardXP });
    env.changeAnswer(answer + tolerance * 1.1);
    env.click(env.button('Submit'));
    expect(env.state.orr_chc?.[index]).not.toBe(true);
    expect(env.state.orr_chlast?.[index]).toEqual({ value: answer + tolerance * 1.1, correct: false });
    feedback('orrery-challenge-feedback');
    expect(awardXP).not.toHaveBeenCalled();
    env.changeAnswer(answer + tolerance * 0.9);
    env.click(env.button('Submit'));
    expect(env.state.orr_chc?.[index]).toBe(true);
    expect(env.state.orr_chlast?.[index]).toEqual({ value: answer + tolerance * 0.9, correct: true });
    expect(feedback('orrery-challenge-feedback').textContent).toMatch(/\bcorrect\b/i);
    env.click(env.button('Show worked solution'));
    expect(document.getElementById('orrery-calculation-solution')?.textContent.trim()).toBeTruthy();
    calculationProgress(1);
    expect(awardXP).toHaveBeenCalledExactlyOnceWith(10);
  });

  it('gives equivalent persistent feedback and records for Enter and Submit', () => {
    const wrong = CALCULATIONS[0].answer + 2;
    const enterEnv = renderPractice();
    enterEnv.changeAnswer(wrong);
    enterEnv.enter();
    const enterFeedback = feedback('orrery-challenge-feedback').textContent;
    const enterRecord = structuredClone(enterEnv.state.orr_chlast);
    const submitEnv = renderPractice();
    submitEnv.changeAnswer(wrong);
    submitEnv.click(submitEnv.button('Submit'));
    expect(feedback('orrery-challenge-feedback').textContent).toBe(enterFeedback);
    expect(submitEnv.state.orr_chlast).toEqual(enterRecord);
    expect(submitEnv.answer.getAttribute('aria-invalid')).toBe('true');
  });

  it('rejects blank, nonfinite and prefix-only numbers without replacing a finite last submission', () => {
    const awardXP = vi.fn();
    const last = { value: 10, correct: false };
    const env = renderPractice({ orr_chlast: { 0: last } }, { awardXP });
    for (const value of ['', ' ', '11.86junk', '1e', 'Infinity', 'NaN', '0xB', '1,186', '--11']) {
      env.changeAnswer(value);
      env.click(env.button('Submit'));
      expect(env.state.orr_chc?.[0]).not.toBe(true);
      expect(env.state.orr_chlast[0]).toEqual(last);
      expect(feedback('orrery-challenge-feedback').textContent).toMatch(/number|numeric|finite|valid/i);
    }
    expect(awardXP).not.toHaveBeenCalled();
    env.changeAnswer('1.186e1');
    env.enter();
    expect(env.state.orr_chlast[0]).toEqual({ value: 11.86, correct: true });
    expect(awardXP).toHaveBeenCalledExactlyOnceWith(10);
  });

  it('reveals worked steps without solving and permits completed practice without repeat XP', () => {
    const awardXP = vi.fn();
    const env = renderPractice({ orr_cha: { other: 'Retain draft' }, orr_chh: { other: 2 } }, { awardXP });
    revealHints(env);
    env.click(env.button('Show worked solution'));
    expect(env.state.orr_chsolution?.[0]).toBe(true);
    expect(document.getElementById('orrery-calculation-solution')?.textContent.trim()).toBeTruthy();
    expect(env.state.orr_chc?.[0]).not.toBe(true);
    calculationProgress(0);
    expect(awardXP).not.toHaveBeenCalled();
    env.changeAnswer(CALCULATIONS[0].answer);
    env.click(env.button('Submit'));
    expect(awardXP).toHaveBeenCalledExactlyOnceWith(10);
    env.click(env.button('Practice again'));
    expect(env.state.orr_chpractice?.[0]).toBe(true);
    expect(env.state.orr_chc[0]).toBe(true);
    expect(env.answer).not.toBeNull();
    env.changeAnswer(0);
    env.enter();
    expect(env.state.orr_chlast[0]).toEqual({ value: 0, correct: false });
    expect(env.state.orr_chc[0]).toBe(true);
    calculationProgress(1);
    env.changeAnswer(CALCULATIONS[0].answer);
    env.click(env.button('Submit'));
    expect(awardXP).toHaveBeenCalledExactlyOnceWith(10);
    expect(env.state.orr_cha.other).toBe('Retain draft');
    expect(env.state.orr_chh.other).toBe(2);
  });

  it('keeps a restored open solution pending until the explanation is available', () => {
    const awardXP = vi.fn();
    const env = renderPractice({
      orr_chsolution: { 0: true, other: false }, orr_chh: { 0: 0 }, orr_chc: {},
    }, { awardXP });
    expect(env.state.orr_chsolution).toEqual({ 0: true, other: false });
    expect(document.getElementById('orrery-calculation-solution')).toBeNull();
    expect(env.button('Show worked solution')).toBeUndefined();
    expect(env.button('Hide worked solution')).toBeUndefined();
    calculationProgress(0);
    revealHints(env);
    expect(document.getElementById('orrery-calculation-solution')?.textContent.trim()).toBeTruthy();
    expect(env.button('Hide worked solution')?.disabled).toBe(false);
    expect(env.button('Hide worked solution')?.getAttribute('aria-expanded')).toBe('true');
    expect(env.state.orr_chsolution).toEqual({ 0: true, other: false });
    expect(env.state.orr_chc).toEqual({});
    calculationProgress(0);
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('caps restored hints, retains zero drafts and preserves other map entries during submission', () => {
    const env = renderPractice({
      orr_cha: { 0: 0, other: 'Keep draft' }, orr_chh: { 0: 999, other: 2 },
      orr_chf: { 0: 'Earlier feedback', other: 'Keep feedback' },
      orr_chc: { other: true }, orr_chlast: { other: { value: 4, correct: false } },
    });
    expect(env.answer.value).toBe('0');
    expect(env.state.orr_chh[0]).toBe(999);
    expect(env.buttonMatching(/^Reveal hint \(/)).toBeUndefined();
    expect(env.button('Show worked solution')).toBeTruthy();
    env.changeAnswer(CALCULATIONS[0].answer);
    env.click(env.button('Submit'));
    expect(env.state.orr_cha.other).toBe('Keep draft');
    expect(env.state.orr_chh.other).toBe(2);
    expect(env.state.orr_chf.other).toBe('Keep feedback');
    expect(env.state.orr_chc.other).toBe(true);
    expect(env.state.orr_chlast.other).toEqual({ value: 4, correct: false });
    const invalid = renderPractice({ orr_chh: { 0: 'bad count', other: 2 } });
    expect(invalid.button('Reveal hint (3 remaining)')).toBeTruthy();
    invalid.click(invalid.button('Reveal hint (3 remaining)'));
    expect(invalid.state.orr_chh[0]).toBe(1);
    expect(invalid.state.orr_chh.other).toBe(2);
  });

  it('wraps unfinished calculation navigation without losing drafts or marking skipped work solved', () => {
    const env = renderPractice({ orr_chi: 9, orr_chc: { 0: true, 1: true, 3: true }, orr_cha: { 2: '4', 9: '146' } });
    env.click(env.button('Next unsolved calculation'));
    expect(currentIndex()).toBe(2);
    expect(env.state.orr_chi).toBe(2);
    expect(env.answer.value).toBe('4');
    env.click(env.button('Previous question'));
    expect(currentIndex()).toBe(1);
    env.click(env.button('Next question'));
    expect(currentIndex()).toBe(2);
    env.navigate(9);
    expect(env.answer.value).toBe('146');
    expect(env.state.orr_chc).toEqual({ 0: true, 1: true, 3: true });
    const complete = renderPractice({ orr_chc: Object.fromEntries(CALCULATIONS.map(({ index }) => [index, true])) });
    expect(complete.button('Next unsolved calculation')?.disabled).toBe(true);
    calculationProgress(10);
  });

  it('ignores malformed array completions for displayed progress and repairs them only on an action', () => {
    const completion = [true, true, true];
    const awardXP = vi.fn();
    const env = renderPractice({ orr_chc: completion }, { awardXP });
    calculationProgress(0);
    // Browser coverage verifies effect-driven quest-score synchronization;
    // SSR checks displayed progress, raw preservation and explicit action repair.
    expect(env.state.orr_chc).toBe(completion);
    expect(env.answer).not.toBeNull();
    expect(awardXP).not.toHaveBeenCalled();
    env.changeAnswer(CALCULATIONS[0].answer);
    expect(env.state.orr_chc).toBe(completion);
    env.click(env.button('Submit'));
    expect(env.state.orr_chc).toEqual({ 0: true });
    expect(Array.isArray(env.state.orr_chc)).toBe(false);
    calculationProgress(1);
    expect(awardXP).toHaveBeenCalledExactlyOnceWith(10);
  });

  it('normalizes question indices for display and counts only known own true completions', () => {
    for (const [value, calcIndex, ideaIndex] of [[1.9, 1, 1], ['3.9', 3, 3], [-4, 0, 0], [999, 9, 14], [NaN, 0, 0], [Infinity, 0, 0]]) {
      const calc = renderPractice({ orr_chi: value });
      expect(currentIndex()).toBe(calcIndex);
      expect(calc.state.orr_chi).toEqual(value);
      const idea = renderPractice({ orr_tab: 7, orr_tfi: value });
      expect(currentIndex(true)).toBe(ideaIndex);
      expect(idea.state.orr_tfi).toEqual(value);
    }
    const completion = Object.assign(Object.create({ 0: true }), { 1: true, 2: 'true', 3: 1, 4: false, 10: true, other: true });
    const feedbackRecord = { 0: { message: 'Not a renderable feedback string' } };
    const env = renderPractice({ orr_chc: completion, orr_chf: feedbackRecord, orr_chlast: { 0: { value: Infinity, correct: true } } });
    calculationProgress(1);
    expect(env.answer).not.toBeNull();
    expect(env.state.orr_chc).toEqual(completion);
    expect(env.state.orr_chf).toEqual(feedbackRecord);
    expect(env.section.textContent).not.toMatch(/NaN|Infinity|undefined|Not a renderable/);
  });

  it('checks every original idea with strict first answers and awards only first-correct responses', () => {
    const awardXP = vi.fn();
    const env = renderPractice({ orr_tab: 7 }, { awardXP });
    expect(env.section?.tagName).toBe('SECTION');
    const navigator = document.querySelector('[role="group"][aria-label="True or false question navigator"]');
    expect(navigator.querySelectorAll('button')).toHaveLength(15);
    for (let index = 0; index < IDEA_ANSWERS.length; index++) {
      env.navigate(index);
      expect(document.getElementById('orrery-misconception-question')?.textContent.trim()).toBeTruthy();
      env.click(env.button(IDEA_ANSWERS[index] ? 'True' : 'False'));
      expect(env.state.orr_tfa[index]).toBe(IDEA_ANSWERS[index]);
      expect(feedback('orrery-misconception-feedback').textContent).toMatch(/\bcorrect\b/i);
      ideaProgress(index + 1);
      expect(env.button('Review this idea')).toBeTruthy();
    }
    expect(awardXP).toHaveBeenCalledTimes(15);
    expect(awardXP.mock.calls.every(([amount]) => amount === 8)).toBe(true);
    expect(env.button('Next unchecked idea')?.disabled).toBe(true);
  });

  it('lets a wrong first answer be reviewed without overwriting it or awarding review XP', () => {
    const awardXP = vi.fn();
    const env = renderPractice({ orr_tab: 7 }, { awardXP });
    env.click(env.button('True'));
    expect(env.state.orr_tfa[0]).toBe(true);
    ideaProgress(1);
    expect(awardXP).not.toHaveBeenCalled();
    env.click(env.button('Review this idea'));
    expect(env.state.orr_tfreviewing[0]).toBe(true);
    expect(env.button('True')).toBeTruthy();
    expect(env.button('False')).toBeTruthy();
    env.click(env.button('False'));
    expect(env.state.orr_tfreview[0]).toBe(false);
    expect(env.state.orr_tfa[0]).toBe(true);
    expect(feedback('orrery-misconception-feedback').textContent).toMatch(/\bcorrect\b/i);
    ideaProgress(1);
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('keeps malformed first answers answerable and leaves restored raw records untouched', () => {
    const saved = { 0: null, 1: 'false', 2: 0, 3: { value: true }, 4: undefined, 5: true, 6: false, 99: true };
    const env = renderPractice({ orr_tab: 7, orr_tfa: saved });
    ideaProgress(2);
    for (const index of [0, 1, 2, 3, 4]) {
      env.navigate(index);
      expect(env.button('True')).toBeTruthy();
      expect(env.button('False')).toBeTruthy();
      expect(env.state.orr_tfa[index]).toEqual(saved[index]);
    }
    expect(env.section.textContent).not.toMatch(/NaN|Infinity|undefined|\[object Object\]/);
    expect(env.state.orr_tfa).toEqual(saved);
  });

  it('preserves first answers and other review records when revisiting already checked ideas', () => {
    const awardXP = vi.fn();
    const first = { 0: false, 1: true, other: 'Keep historical metadata' };
    const env = renderPractice({ orr_tab: 7, orr_tfa: first, orr_tfreview: { 1: false, other: true }, orr_tfreviewing: { 1: false } }, { awardXP });
    env.click(env.button('Review this idea'));
    env.click(env.button('True'));
    expect(env.state.orr_tfa).toEqual(first);
    expect(env.state.orr_tfreview[0]).toBe(true);
    expect(env.state.orr_tfreview[1]).toBe(false);
    expect(env.state.orr_tfreview.other).toBe(true);
    env.navigate(1);
    env.click(env.button('Review this idea'));
    env.click(env.button('False'));
    expect(env.state.orr_tfa).toEqual(first);
    expect(env.state.orr_tfreview[0]).toBe(true);
    expect(env.state.orr_tfreview[1]).toBe(false);
    ideaProgress(2);
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('wraps unchecked idea navigation while keeping previous responses and review history', () => {
    const first = { 0: false, 1: false, 3: true };
    const env = renderPractice({ orr_tab: 7, orr_tfi: 14, orr_tfa: first, orr_tfreview: { 0: true } });
    env.click(env.button('Next unchecked idea'));
    expect(currentIndex(true)).toBe(2);
    env.click(env.button('Previous idea'));
    expect(currentIndex(true)).toBe(1);
    env.click(env.button('Next idea'));
    expect(currentIndex(true)).toBe(2);
    expect(env.state.orr_tfa).toEqual(first);
    expect(env.state.orr_tfreview).toEqual({ 0: true });
    ideaProgress(3);
  });

  it('guards awards against captured Enter/Submit and repeated True/False activation before rerender', () => {
    const awardXP = vi.fn();
    const env = renderPractice({}, { awardXP });
    env.changeAnswer(CALCULATIONS[0].answer);
    const input = env.answer, submit = env.button('Submit');
    const submitHandler = env.handler(submit, 'onClick'), enterHandler = env.handler(input, 'onKeyDown');
    submitHandler(env.event(submit));
    enterHandler(env.event(input, { key: 'Enter' }));
    submitHandler(env.event(submit));
    expect(awardXP).toHaveBeenCalledExactlyOnceWith(10);
    env.render();
    calculationProgress(1);
    env.showTab(7);
    const answer = env.button('False'), choose = env.handler(answer, 'onClick');
    choose(env.event(answer));
    choose(env.event(answer));
    expect(awardXP.mock.calls).toEqual([[10], [8]]);
    env.render();
    expect(env.state.orr_tfa[0]).toBe(false);
    ideaProgress(1);
  });

  it('preserves live challenges and all other saved learning through first attempts and reviews', () => {
    const awardXP = vi.fn(), tryAward = vi.fn();
    const env = renderPractice({
      orr_sel: 'mars', orr_compare: 'earth', orr_time: 12.75, orr_paused: false, orr_zoom: 'inner', orr_follow: true,
      orr_cli: 1, orr_cla: { 1: '26.5' }, orr_clc: { 0: true }, orr_clf: { 1: 'Keep live feedback' },
      orr_k1e: 0.5, orr_k1phase: 0.25, orr_k1axes: false, orr_k2e: 0.6, orr_k2phase: 0.2, orr_k3hover: 'halley',
      orr_wsb: 'neptune', orr_wse: 0.3, orr_wsa: 1, orr_wsphase: 0.75, orr_wscompare: true, orr_wshz: false,
      orr_snapshots: { mars: { a: { bodyId: 'mars', time: 0, distance: 1.4, speed: 26 } } },
      orr_mission_idx: 2, orr_mission_progress: { speed_zone: { started: true, correct: true } },
      keplerInquiry: { a: 2, e: 0.4, mass: 1, baseline: { a: 2, e: 0.2, mass: 1 }, hypothesis: 'Hold orbit size.', log: [{ a: '2.00', p: '2.83' }] },
      journalEntries: [{ observation: 'Keep my saved experiment.' }], missionLog: [{ text: 'Earlier orbit evidence.' }],
    }, { awardXP, tryAward });
    const retained = otherWork(env.state);
    revealHints(env);
    env.click(env.button('Show worked solution'));
    env.changeAnswer(CALCULATIONS[0].answer);
    env.enter();
    env.click(env.button('Practice again'));
    env.changeAnswer(0);
    env.click(env.button('Submit'));
    expect(otherWork(env.state)).toEqual(retained);
    env.showTab(7);
    env.click(env.button('False'));
    env.click(env.button('Review this idea'));
    env.click(env.button('True'));
    expect(otherWork(env.state)).toEqual(retained);
    expect(awardXP.mock.calls).toEqual([[10], [8]]);
    expect(tryAward).not.toHaveBeenCalled();
  });
});
