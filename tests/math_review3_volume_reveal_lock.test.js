// Math review 3: 3D Volume Explorer locks an item once a checker has shown its answer.
// A wrong slider-challenge or word-problem answer printed the volume ("... 6 x 4 =
// 24"), and the slider readouts unmasked; typing that number back in then paid full
// score, streak, XP and the word_3 quest. Decision (Aaron, 10-19): once the answer is
// shown the item is locked (no credit, the answer box disabled, "Answer shown. Try the
// next one."), keyed by the item and kept in tool state, so a reload, or moving a
// slider away and back in word mode, cannot reopen it. Credit for an item solved
// before any reveal is unchanged.
// MATH_REVIEW3_VOLUME points the suite at another copy (mutation checks).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.MATH_REVIEW3_VOLUME || 'stem_lab/stem_tool_volume.js';
const LOCKED = 'Answer shown. Try the next one.';

const mounted = [];
let latest = null;
let xp = [];

beforeEach(() => { resetStemLab(); loadTool(SOURCE, 'volume'); latest = null; xp = []; });
afterEach(async () => {
  while (mounted.length) {
    const { root, container } = mounted.pop();
    await React.act(async () => root.unmount());
    container.remove();
  }
  vi.restoreAllMocks();
});

function stubCanvas() {
  window.HTMLCanvasElement.prototype.getContext = function () {
    const noop = function () {};
    return {
      scale: noop, fillRect: noop, save: noop, translate: noop, rotate: noop,
      beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop,
      rect: noop, arc: noop, ellipse: noop, fill: noop, stroke: noop,
      restore: noop, fillText: noop, setTransform: noop, clearRect: noop,
      measureText: function () { return { width: 0 }; },
    };
  };
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}

async function mountVolume(initial) {
  while (mounted.length) {
    const { root, container } = mounted.pop();
    await React.act(async () => root.unmount());
    container.remove();
  }
  stubCanvas();
  const cfg = window.StemLab._registry.volume;
  const container = document.createElement('div');
  document.body.appendChild(container);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  function Host() {
    const [toolData, setToolData] = React.useState({ _volume: initial });
    latest = toolData._volume || {};
    return cfg.render(makeCtx({
      toolData, setToolData,
      awardXP: function (id, amt, why) { xp.push(why); },
      announceToSR: function () {},
    }));
  }
  const root = ReactDOMClient.createRoot(container);
  await React.act(async () => { root.render(React.createElement(Host)); });
  mounted.push({ root, container });
  return container;
}

function setNativeValue(el, value) {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
}
async function typeInto(el, value) {
  expect(el, 'answer box').toBeTruthy();
  await React.act(async () => { setNativeValue(el, value); el.dispatchEvent(new window.Event('input', { bubbles: true })); });
}
async function click(el) { await React.act(async () => { el.click(); }); }
async function pressEnter(el) {
  await React.act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
}
async function moveSlider(c, dim, value) {
  const slider = c.querySelector('#volume-dimension-' + dim);
  expect(slider, dim + ' slider').toBeTruthy();
  await React.act(async () => {
    setNativeValue(slider, String(value));
    slider.dispatchEvent(new window.Event('input', { bubbles: true }));
    slider.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
}
const text = (c) => c.textContent.replace(/\s+/g, ' ');
const answerBox = (c) => c.querySelector('input[aria-label="Volume answer"]');
const checkBtn = (c) => c.querySelector('button[aria-label="Check"]');
const wpBox = (c) => c.querySelector('input[aria-label="Volume answer for word problem"]');
const wpCheck = (c) => c.querySelector('button[aria-label="Check answer"]');
const xpFor = (why) => xp.filter((w) => w === why).length;

function state(extra) {
  return Object.assign({
    mode: 'slider', shape: 'prism', dims: { l: 2, w: 3, h: 4 },
    wpCtxIdx: 0, wpAnswer: '', wpFeedback: null, wpSolved: 0,
    score: { correct: 0, total: 0 }, streak: 2, badges: {},
  }, extra || {});
}
// l = 9 is outside the 1..8 the random generator draws, so a new challenge is a new item.
const challengeState = () => state({ dims: { l: 9, w: 3, h: 4 }, challenge: { l: 9, w: 3, h: 4, answer: 108 }, answer: '' });

async function submitSlider(c) {
  if (!checkBtn(c).disabled) await click(checkBtn(c));
  await pressEnter(answerBox(c));
}

describe('slider challenge: a wrong check shows the answer and locks the item', () => {
  it('typing the shown volume back in earns nothing, and says why', async () => {
    const c = await mountVolume(challengeState());
    await typeInto(answerBox(c), '16');
    await click(checkBtn(c));
    expect(latest.feedback.correct).toBe(false);
    expect(latest.feedback.msg).toMatch(/108/);
    await typeInto(answerBox(c), '108');
    await submitSlider(c);
    expect(latest.feedback.correct).toBe(false);
    expect(latest.score).toEqual({ correct: 0, total: 1 });
    expect(latest.streak).toBe(0);
    expect(xpFor('cube volume')).toBe(0);
    expect(text(c).includes(LOCKED), 'lock notice').toBe(true);
    expect(answerBox(c).disabled, 'answer box disabled').toBe(true);
    expect(checkBtn(c).disabled, 'Check disabled').toBe(true);
  });

  it('a reload does not reopen it', async () => {
    let c = await mountVolume(challengeState());
    await typeInto(answerBox(c), '16');
    await click(checkBtn(c));
    c = await mountVolume(Object.assign({}, latest, { answer: '108' }));
    await submitSlider(c);
    expect(latest.score).toEqual({ correct: 0, total: 1 });
    expect(xpFor('cube volume')).toBe(0);
    expect(text(c).includes(LOCKED)).toBe(true);
  });

  it('Random Challenge gives an open item and skips one whose answer was shown', async () => {
    const c = await mountVolume(state({ dims: { l: 2, w: 3, h: 4 }, challenge: { l: 2, w: 3, h: 4, answer: 24 }, answer: '' }));
    await typeInto(answerBox(c), '9');
    await click(checkBtn(c));
    // First draw repeats 2 x 3 x 4 (locked), the next is 5 x 1 x 1.
    const draws = [0.15, 0.4, 0.55, 0.55, 0.05, 0.05];
    vi.spyOn(Math, 'random').mockImplementation(() => (draws.length ? draws.shift() : 0.05));
    await click(c.querySelector('button[aria-label="Random Challenge"]'));
    expect(latest.challenge).toEqual({ l: 5, w: 1, h: 1, answer: 5 });
    expect(answerBox(c).disabled).toBe(false);
    expect(text(c).includes(LOCKED)).toBe(false);
  });

  it('solved before any reveal pays once, as before', async () => {
    const c = await mountVolume(challengeState());
    await typeInto(answerBox(c), '108');
    await click(checkBtn(c));
    await pressEnter(answerBox(c));
    expect(latest.feedback.correct).toBe(true);
    expect(latest.score).toEqual({ correct: 1, total: 1 });
    expect(latest.streak).toBe(3);
    expect(xpFor('cube volume')).toBe(1);
    expect(text(c).includes(LOCKED)).toBe(false);
  });
});

describe('word problems: a wrong check shows the answer and locks that story', () => {
  const word = (dims) => state({ mode: 'word', dims: dims });

  it('typing the shown volume back in earns nothing, even after moving a slider away and back', async () => {
    const c = await mountVolume(word({ l: 4, w: 3, h: 2 }));
    await typeInto(wpBox(c), '9');
    await click(wpCheck(c));
    expect(latest.wpFeedback.correct).toBe(false);
    expect(latest.wpFeedback.msg).toMatch(/24/);
    await typeInto(wpBox(c), '24');
    if (!wpCheck(c).disabled) await click(wpCheck(c));
    await pressEnter(wpBox(c));
    expect(latest.wpSolved).toBe(0);
    expect(latest.score).toEqual({ correct: 0, total: 1 });
    expect(xpFor('word problem')).toBe(0);
    expect(wpBox(c).disabled).toBe(true);
    expect(text(c).includes(LOCKED)).toBe(true);

    await moveSlider(c, 'h', 3);
    await moveSlider(c, 'h', 2);
    expect(latest.dims).toEqual({ l: 4, w: 3, h: 2 });
    await typeInto(wpBox(c), '24');
    if (!wpCheck(c).disabled) await click(wpCheck(c));
    await pressEnter(wpBox(c));
    expect(latest.wpSolved, 'same story, same numbers').toBe(0);
    expect(xpFor('word problem')).toBe(0);
    expect(text(c).includes(LOCKED)).toBe(true);
  });

  it('a reload does not reopen it, and a different story is open', async () => {
    let c = await mountVolume(word({ l: 4, w: 3, h: 2 }));
    await typeInto(wpBox(c), '9');
    await click(wpCheck(c));
    c = await mountVolume(Object.assign({}, latest, { wpAnswer: '24', wpFeedback: null }));
    if (!wpCheck(c).disabled) await click(wpCheck(c));
    expect(latest.wpSolved).toBe(0);
    expect(xpFor('word problem')).toBe(0);
    await moveSlider(c, 'h', 3);
    expect(wpBox(c).disabled).toBe(false);
    await typeInto(wpBox(c), '36');
    await click(wpCheck(c));
    expect(latest.wpSolved).toBe(1);
    expect(xpFor('word problem')).toBe(1);
  });

  it('solved before any reveal pays once, as before', async () => {
    const c = await mountVolume(word({ l: 4, w: 3, h: 2 }));
    await typeInto(wpBox(c), '24');
    await click(wpCheck(c));
    await click(wpCheck(c));
    expect(latest.wpSolved).toBe(1);
    expect(xpFor('word problem')).toBe(1);
    expect(text(c).includes(LOCKED)).toBe(false);
  });
});
