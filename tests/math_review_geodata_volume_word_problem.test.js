// 3D Volume Explorer graders and readouts, driven through a live mount.
//  - Graders compared parseInt(answer) to the exact product. With "allow
//    fractional" on, a 2.5 x 3 x 3 story (22.5) could never be solved, and a
//    wrong 24.7 passed for 24.
//  - Re-pressing Check on a solved slider challenge, build or word problem
//    re-counted score, streak, wpSolved (the word_3 quest) and XP.
//  - The L-block question ("What is the volume of this L-shaped block?") had
//    no answer box: Check compared the pre-placed cube count to itself.
//  - "Show solution (gives up - no badge)" followed by Check paid XP.
//  - Stats used box formulas for every solid (a 4x4x6 cone read V = 96), and
//    the header tile, word-mode stats and formula line printed the answer to
//    the open question.
//  - Formula breakdown rounded (22.5 -> "23", r = 1.25 -> "1.3"); the PNG
//    footer printed cm³³ / cm³²; the real-world strip converted ft² to litres.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.MATH_REVIEW_VOLUME_SRC || 'stem_lab/stem_tool_volume.js';

const mounted = [];
let latest = null;
let xpAwards = [];
let announcements = [];

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'volume');
  latest = null;
  xpAwards = [];
  announcements = [];
});

afterEach(async () => {
  while (mounted.length) {
    const { root, container } = mounted.pop();
    await React.act(async () => root.unmount());
    container.remove();
  }
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
  stubCanvas();
  const cfg = window.StemLab._registry.volume;
  const container = document.createElement('div');
  document.body.appendChild(container);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  function Host() {
    const [toolData, setToolData] = React.useState({ _volume: initial });
    latest = toolData._volume || {};
    return cfg.render(makeCtx({
      toolData,
      setToolData,
      awardXP: function (id, amt, why) { xpAwards.push([id, amt, why]); },
      announceToSR: function (msg) { announcements.push(String(msg)); },
    }));
  }
  const root = ReactDOMClient.createRoot(container);
  await React.act(async () => { root.render(React.createElement(Host)); });
  mounted.push({ root, container });
  return container;
}

// Badge awards also go through awardXP; count only the per-answer award.
function xpFor(why) { return xpAwards.filter((a) => a[2] === why); }

function setNativeValue(element, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(element, value);
}

async function typeInto(input, value) {
  await React.act(async () => {
    setNativeValue(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

async function click(el) {
  await React.act(async () => { el.click(); });
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

const wpInput = (c) => c.querySelector('input[aria-label="Volume answer for word problem"]');
const wpCheck = (c) => c.querySelector('button[aria-label="Check answer"]');
const answerInput = (c) => c.querySelector('input[aria-label="Volume answer"]');
const checkBtn = (c) => c.querySelector('button[aria-label="Check"]');
const byText = (c, sel, text) => Array.from(c.querySelectorAll(sel)).find((b) => (b.textContent || '').includes(text));

function headerVolume(c) {
  const head = c.querySelector('[data-volume-command]');
  const label = Array.from(head.querySelectorAll('div')).find((d) => d.textContent === 'Volume');
  expect(label, 'header Volume tile').toBeTruthy();
  return label.previousElementSibling.textContent;
}

function state(extra) {
  return Object.assign({
    mode: 'slider', shape: 'prism', dims: { l: 2, w: 3, h: 4 }, allowFractional: true,
    wpCtxIdx: 0, wpAnswer: '', wpFeedback: null, wpSolved: 0,
    score: { correct: 0, total: 0 }, streak: 0, badges: {},
  }, extra || {});
}
const word = (dims, extra) => state(Object.assign({ mode: 'word', dims: dims }, extra || {}));

describe('word problems', () => {
  it('accepts the exact decimal volume of a half-unit story (2.5 x 3 x 3 = 22.5)', async () => {
    const c = await mountVolume(word({ l: 2.5, w: 3, h: 3 }));
    await typeInto(wpInput(c), '22.5');
    await click(wpCheck(c));
    expect(latest.wpFeedback && latest.wpFeedback.correct).toBe(true);
    expect(latest.wpSolved).toBe(1);
  });

  it('rejects a wrong decimal that merely truncates to the volume (24.7 for 24)', async () => {
    const c = await mountVolume(word({ l: 2, w: 3, h: 4 }));
    await typeInto(wpInput(c), '24.7');
    await click(wpCheck(c));
    expect(latest.wpFeedback && latest.wpFeedback.correct).toBe(false);
    expect(latest.wpSolved).toBe(0);
    expect(xpFor('word problem').length).toBe(0);
  });

  it('counts one solved problem once, by button or by Enter', async () => {
    const c = await mountVolume(word({ l: 2, w: 3, h: 4 }));
    await typeInto(wpInput(c), '24');
    await click(wpCheck(c));
    await click(wpCheck(c));
    await React.act(async () => {
      wpInput(c).dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await click(wpCheck(c));
    expect(latest.wpFeedback && latest.wpFeedback.correct).toBe(true);
    expect(latest.wpSolved).toBe(1);
    expect(latest.score).toEqual({ correct: 1, total: 1 });
    expect(latest.streak).toBe(1);
    expect(xpFor('word problem').length).toBe(1);
  });

  it('a dimension change clears the old verdict and is a new problem', async () => {
    const c = await mountVolume(word({ l: 2, w: 3, h: 4 }));
    await typeInto(wpInput(c), '24');
    await click(wpCheck(c));
    await moveSlider(c, 'h', 5);
    expect(latest.dims).toEqual({ l: 2, w: 3, h: 5 });
    expect(latest.wpFeedback).toBe(null);
    expect(latest.wpAnswer).toBe('');
    await typeInto(wpInput(c), '30');
    await click(wpCheck(c));
    expect(latest.wpSolved).toBe(2);
    expect(xpFor('word problem').length).toBe(2);
  });

  it('a story answer is not printed on screen until it is solved', async () => {
    const c = await mountVolume(word({ l: 4, w: 3, h: 5 }));
    const text = () => c.textContent.replace(/\s+/g, ' ');
    expect(headerVolume(c)).toBe('?');
    expect(text().includes('60 unit cubes'), text()).toBe(false);
    expect(text().includes('Height (5) ='), text()).toBe(false);
    expect(text().includes('5=60'), text()).toBe(false);
    const sliderLabel = c.querySelector('#volume-dimension-l').getAttribute('aria-label');
    expect(sliderLabel.includes('volume 60'), sliderLabel).toBe(false);
    await typeInto(wpInput(c), '60');
    await click(wpCheck(c));
    expect(headerVolume(c)).toBe('60');
  });

  it('moving a slider in word mode does not announce the volume', async () => {
    const c = await mountVolume(word({ l: 4, w: 3, h: 5 }));
    await moveSlider(c, 'h', 6);
    await new Promise((r) => setTimeout(r, 450));
    expect(announcements.some((m) => m.includes('Volume now')), announcements.join(' | ')).toBe(false);
  });
});

describe('slider challenge', () => {
  const challengeState = () => state({ dims: { l: 2, w: 3, h: 4 }, challenge: { l: 2, w: 3, h: 4, answer: 24 }, answer: '' });

  it('hides the answer in the header while the challenge is open', async () => {
    const c = await mountVolume(challengeState());
    expect(headerVolume(c)).toBe('?');
  });

  it('rejects 24.7 for 24, and the answer it then shows earns no credit (10-20: lock after reveal)', async () => {
    const c = await mountVolume(challengeState());
    await typeInto(answerInput(c), '24.7');
    await click(checkBtn(c));
    expect(latest.feedback && latest.feedback.correct).toBe(false);
    // Retyping the shown answer: the box may be disabled; if it is not, Check must still pay nothing.
    const retry = answerInput(c);
    if (retry && !retry.disabled && checkBtn(c)) {
      await typeInto(retry, '24');
      await click(checkBtn(c));
    }
    expect(latest.score.correct).toBe(0);
    expect(latest.streak || 0).toBe(0);
    expect(xpFor('cube volume').length).toBe(0);
  });

  it('accepts 24 and counts it once however often Check is pressed', async () => {
    const c = await mountVolume(challengeState());
    await typeInto(answerInput(c), '24');
    await click(checkBtn(c));
    await click(checkBtn(c));
    await click(checkBtn(c));
    expect(latest.feedback && latest.feedback.correct).toBe(true);
    expect(latest.score).toEqual({ correct: 1, total: 1 });
    expect(latest.streak).toBe(1);
    expect(xpFor('cube volume').length).toBe(1);
  });

  it('a new random challenge is always a box, even with a cone selected', async () => {
    const c = await mountVolume(state({ shape: 'cone' }));
    await click(c.querySelector('button[aria-label="Random Challenge"]'));
    expect(latest.challenge).toBeTruthy();
    expect(latest.shape).toBe('prism');
    expect(latest.challenge.answer).toBe(latest.dims.l * latest.dims.w * latest.dims.h);
  });

  it('the N shortcut also starts a box challenge', async () => {
    const c = await mountVolume(state({ shape: 'cylinder' }));
    await React.act(async () => {
      // WCAG 2.1.4: shortcuts act only while focus is inside the tool.
      c.querySelector('[data-volume-root]').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'n', bubbles: true }));
    });
    expect(latest.challenge).toBeTruthy();
    expect(latest.shape).toBe('prism');
    expect(c).toBeTruthy();
  });
});

describe('freeform builder challenges', () => {
  it('a solved prism build is counted once however often Check is pressed', async () => {
    const c = await mountVolume(state({
      mode: 'freeform',
      positions: ['0-0-0', '1-0-0', '0-1-0', '1-1-0'],
      builderChallenge: { type: 'prism', target: { l: 2, w: 2, h: 1 }, answer: 4 },
    }));
    await click(checkBtn(c));
    await click(checkBtn(c));
    await click(checkBtn(c));
    expect(latest.builderFeedback && latest.builderFeedback.correct).toBe(true);
    expect(latest.score).toEqual({ correct: 1, total: 1 });
    expect(xpFor('prism build').length).toBe(1);
  });

  const lPositions = ['0-0-0', '1-0-0', '2-0-0', '0-1-0', '1-1-0', '2-1-0', '0-0-1', '1-0-1', '0-1-1', '1-1-1'];
  const lState = (extra) => state(Object.assign({
    mode: 'freeform', positions: lPositions.slice(), answer: '',
    builderChallenge: { type: 'volume', answer: 10, shape: 'L-Block' },
  }, extra || {}));

  it('the L-block takes a typed answer and does not print the cube count', async () => {
    const c = await mountVolume(lState());
    expect(answerInput(c), 'L-block answer box').toBeTruthy();
    expect(c.textContent.includes('Cubes placed'), 'cube counter shown').toBe(false);
    expect(checkBtn(c).disabled, 'Check is disabled with no answer').toBe(true);
  });

  it('the L-block is not solved by pressing Check without an answer', async () => {
    const c = await mountVolume(lState({ answer: '' }));
    const btn = checkBtn(c);
    await React.act(async () => {
      btn.disabled = false; // even a forced click must not grade an empty answer
      btn.click();
    });
    expect(latest.builderFeedback == null || latest.builderFeedback.correct === false).toBe(true);
    expect(xpFor('volume quiz').length).toBe(0);
  });

  it('the L-block grades the typed volume without revealing it on a miss', async () => {
    const c = await mountVolume(lState());
    await typeInto(answerInput(c), '9');
    await click(checkBtn(c));
    expect(latest.builderFeedback.correct).toBe(false);
    expect(latest.builderFeedback.msg.includes('10'), latest.builderFeedback.msg).toBe(false);
    await typeInto(answerInput(c), '10');
    await click(checkBtn(c));
    expect(latest.builderFeedback.correct).toBe(true);
    expect(xpFor('volume quiz').length).toBe(1);
  });

  it('a new L-block starts with an empty answer box', async () => {
    const c = await mountVolume(state({ mode: 'freeform', positions: [], answer: '7' }));
    await click(c.querySelector('button[aria-label="L-Block Vol"]'));
    expect(latest.builderChallenge && latest.builderChallenge.shape).toBe('L-Block');
    expect(latest.answer).toBe('');
  });

  it('a revealed library solution earns no score, streak or XP', async () => {
    const c = await mountVolume(state({
      mode: 'freeform', positions: [], streak: 2,
      builderChallenge: { type: 'volume', answer: 3, shape: 'Tower', library: 'tower', libraryPositions: ['0-0-0', '0-0-1', '0-0-2'], libraryDesc: 'A tower' },
    }));
    await click(byText(c, 'button', 'Show solution'));
    expect(latest.positions.length).toBe(3);
    await click(checkBtn(c));
    expect(latest.score).toEqual({ correct: 0, total: 0 });
    expect(latest.streak).toBe(2);
    expect(xpFor('volume quiz').length).toBe(0);
  });
});

describe('readouts follow the drawn solid', () => {
  it('a 4 x 4 x 6 cone reads V = 25.13 and SA = 52.3, not the box 96 and 128', async () => {
    const c = await mountVolume(state({ shape: 'cone', dims: { l: 4, w: 4, h: 6 }, allowFractional: false }));
    const text = c.textContent.replace(/\s+/g, ' ');
    expect(headerVolume(c)).toBe('25.13');
    expect(text.includes('25.13 unit cubes'), text).toBe(true);
    expect(text.includes('SA = 52.3'), text).toBe(true);
    expect(text.includes('96 unit cubes'), text).toBe(false);
    expect(text.includes('Area of Base'), text).toBe(false);
    expect(text.includes('2(4×4'), text).toBe(false);
    // Rounded for display, not 25.132741228718345 / 52.30472...
    expect(text.includes('25.1327'), text).toBe(false);
    expect(text.includes('52.304'), text).toBe(false);
  });

  it('a slider move on a cone announces the cone volume, not the box', async () => {
    const c = await mountVolume(state({ shape: 'cone', dims: { l: 4, w: 4, h: 6 }, allowFractional: false }));
    await moveSlider(c, 'h', 3);
    await new Promise((r) => setTimeout(r, 450));
    const said = announcements.join(' | ');
    // (1/3) * pi * 2 * 2 * 3 = 4 pi = 12.57; the box would be 48.
    expect(said.includes('Volume now 12.57 cubic units'), said).toBe(true);
    expect(said.includes('Volume now 48'), said).toBe(false);
  });

  it('the box breakdown is still shown for a prism', async () => {
    const c = await mountVolume(state({ dims: { l: 2, w: 3, h: 4 } }));
    const text = c.textContent.replace(/\s+/g, ' ');
    expect(text.includes('Area of Base'), text).toBe(true);
    expect(headerVolume(c)).toBe('24');
  });

  it('prints the exact prism product for half-unit dims (22.5, not 23)', async () => {
    const c = await mountVolume(state({ dims: { l: 2.5, w: 3, h: 3 } }));
    const note = c.querySelector('[aria-label="Formula with dimensions substituted"]');
    const text = note.textContent.replace(/\s+/g, ' ');
    expect(text.includes('2.5 × 3 × 3'), text).toBe(true);
    expect(text.includes('= 22.5') || text.includes('=22.5'), text).toBe(true);
    expect(/=\s*23\b/.test(text), text).toBe(false);
  });

  it('prints the true radius for half-unit cylinder dims (1.25, not 1.3)', async () => {
    const c = await mountVolume(state({ shape: 'cylinder', dims: { l: 2.5, w: 2.5, h: 2 } }));
    const note = c.querySelector('[aria-label="Formula with dimensions substituted"]');
    const text = note.textContent.replace(/\s+/g, ' ');
    expect(text.includes('(1.25)²'), text).toBe(true);
    expect(text.includes('9.82'), text).toBe(true);
  });

  it('the displacement header waits for a correct subtraction', async () => {
    const c = await mountVolume(state({ mode: 'displacement', dispSubmerged: true }));
    expect(headerVolume(c)).toBe('?');
  });
});

describe('unit labels', () => {
  it('the real-world strip gives surface area in square units, not litres', async () => {
    const c = await mountVolume(state({ unitId: 'ft', dims: { l: 2, w: 3, h: 4 } }));
    const text = c.textContent.replace(/\s+/g, ' ');
    expect(text.includes('Surface area = 52 ft²'), text).toBe(true);
    expect(text.includes('52 ft² (≈'), text).toBe(false);
  });

  it('the exported image prints cm³ and cm², not cm³³ and cm³²', async () => {
    const OrigBlob = globalThis.Blob;
    const captured = [];
    globalThis.Blob = class extends OrigBlob {
      constructor(parts, opts) { super(parts, opts); captured.push((parts || []).join('')); }
    };
    window.Blob = globalThis.Blob;
    const origCreate = URL.createObjectURL;
    URL.createObjectURL = () => 'blob:test';
    try {
      const c = await mountVolume(state({ unitId: 'cm', dims: { l: 2, w: 3, h: 4 } }));
      await click(byText(c, 'button', 'Export PNG'));
      const svg = captured.find((s) => s.includes('<svg')) || '';
      expect(svg.includes('Volume: 24 cm³ '), svg.slice(-400)).toBe(true);
      expect(svg.includes('Surface area: 52 cm²'), svg.slice(-400)).toBe(true);
      expect(svg.includes('cm³³') || svg.includes('cm³²'), svg.slice(-400)).toBe(false);
    } finally {
      globalThis.Blob = OrigBlob;
      window.Blob = OrigBlob;
      URL.createObjectURL = origCreate;
    }
  });
});
