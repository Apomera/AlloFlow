// Angle Explorer graders and readouts, through a live mount with the hub's
// hosted state (angleValue, angleChallenge, angleFeedback, exploreScore).
//  - Moving the ray clears the feedback, which re-opened Check on a scored
//    create/classify challenge: one answer could be scored again and again.
//  - Estimate mode said "number hidden" while the header tile, live region,
//    bisector label, relation boxes, slider and quick buttons printed it.
//  - An open classify question printed its class (Type tile, real-world panel,
//    coach tip, live region).
//  - A blank estimate was graded as 0 deg; a decimal guess did nothing.
//  - The speed round scored while paused, and a miss did not move on, so
//    pressing every button scored each target; its buttons were all named
//    "Answer Speed".
//  - Snap on: a 5 deg step rounded back to the start, freezing keys/slider.
//  - classifyAngle returned the translated word for 90, so right-angle
//    examples vanished in other languages.
//  - Malformed saved pins/history crashed; the Pisa triangle clamped each leg
//    separately and drew 23.3 deg for a labelled 15 deg.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.MATH_REVIEW_ANGLES_SRC || 'stem_lab/stem_tool_angles.js';

const mounted = [];
let live = null;
let xp = [];

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'protractor');
  live = null;
  xp = [];
});

afterEach(async () => {
  vi.restoreAllMocks();
  while (mounted.length) {
    const { root, container } = mounted.pop();
    await React.act(async () => root.unmount());
    container.remove();
  }
});

const englishT = (k, fb) => fb || k;

async function mount(init, tImpl) {
  const cfg = window.StemLab._registry.protractor;
  const container = document.createElement('div');
  document.body.appendChild(container);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  function Host() {
    const [angleValue, setAngleValue] = React.useState(init.angleValue != null ? init.angleValue : 45);
    const [angleChallenge, setAngleChallenge] = React.useState(init.angleChallenge || null);
    const [angleFeedback, setAngleFeedback] = React.useState(init.angleFeedback || null);
    const [exploreScore, setExploreScore] = React.useState(init.exploreScore || { correct: 0, total: 0 });
    const [toolData, setToolData] = React.useState({ protractor: init.protractor || {}, angles: init.angles || {} });
    live = { angleValue, angleChallenge, angleFeedback, exploreScore, d: toolData.protractor || {} };
    const update = (slot, key, val) => setToolData((p) => Object.assign({}, p, { [slot]: Object.assign({}, p[slot] || {}, { [key]: val }) }));
    const updateMulti = (slot, obj) => setToolData((p) => Object.assign({}, p, { [slot]: Object.assign({}, p[slot] || {}, obj) }));
    return cfg.render(makeCtx({
      toolData, setToolData, update, updateMulti,
      angleValue, setAngleValue, angleChallenge, setAngleChallenge, angleFeedback, setAngleFeedback,
      exploreScore, setExploreScore,
      awardXP: (id, n, why) => xp.push([id, n, why]),
      t: tImpl || englishT,
    }));
  }
  const root = ReactDOMClient.createRoot(container);
  await React.act(async () => { root.render(React.createElement(Host)); });
  mounted.push({ root, container });
  return container;
}

async function click(el) { await React.act(async () => { el.click(); }); }
async function key(el, k) {
  await React.act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true })); });
}
async function tab(c, id) { await click(c.querySelector('#stem-angles-tab-' + id)); }
const buttons = (c, text) => Array.from(c.querySelectorAll('button')).filter((b) => (b.textContent || '').trim() === text);
const handle = (c) => c.querySelector('[aria-label="Angle ray handle"]');
const xpFor = (why) => xp.filter((a) => a[2] === why);
function headerAngle(c) {
  const label = Array.from(c.querySelectorAll('div')).find((d) => d.textContent === 'Angle' && /tracking-wider/.test(d.className));
  expect(label, 'header Angle tile').toBeTruthy();
  return label.previousElementSibling.textContent;
}

describe('challenges count one answer once', () => {
  it('a solved create challenge is not re-scored after the ray is nudged', async () => {
    const c = await mount({ angleValue: 90, angleChallenge: { type: 'create', target: 90 }, protractor: { activeTab: 'challenges' } });
    await click(c.querySelector('button[aria-label="Check"]'));
    expect(live.exploreScore).toEqual({ correct: 1, total: 1 });
    for (let i = 0; i < 3; i++) {
      await tab(c, 'explore');
      await key(handle(c), 'ArrowRight');
      await key(handle(c), 'ArrowLeft');
      expect(live.angleFeedback).toBe(null);
      await tab(c, 'challenges');
      expect(c.querySelector('button[aria-label="Check"]').disabled, 'Check stays locked').toBe(true);
      await click(c.querySelector('button[aria-label="Check"]'));
    }
    expect(live.exploreScore).toEqual({ correct: 1, total: 1 });
    expect(xpFor('create angle').length).toBe(1);
    expect(live.d.streak).toBe(1);
    expect(c.querySelector('button[aria-label="Next Challenge"]'), 'Next Challenge still offered').toBeTruthy();
  });

  it('a classify answer is not re-scored after the feedback is cleared', async () => {
    const c = await mount({ angleValue: 120, angleChallenge: { type: 'classify', target: 120 }, protractor: { activeTab: 'challenges' } });
    await click(buttons(c, 'Obtuse')[0]);
    expect(live.exploreScore).toEqual({ correct: 1, total: 1 });
    await tab(c, 'explore');
    await key(handle(c), 'ArrowRight');
    expect(live.angleFeedback).toBe(null);
    await tab(c, 'challenges');
    const btn = buttons(c, 'Obtuse')[0];
    expect(btn.disabled, 'classify buttons stay locked').toBe(true);
    await React.act(async () => { btn.disabled = false; btn.click(); });
    expect(live.exploreScore).toEqual({ correct: 1, total: 1 });
    expect(xpFor('classify angle').length).toBe(1);
    expect(c.querySelector('button[aria-label="Next Challenge"]'), 'Next Challenge still offered').toBeTruthy();
  });

  it('an open classify question does not print its class on the explore tab', async () => {
    const c = await mount({ angleValue: 120, angleChallenge: { type: 'classify', target: 120 }, exploreScore: { correct: 0, total: 1 }, protractor: { activeTab: 'explore' } });
    const text = c.textContent;
    expect(text.includes('Real-World Obtuse'), 'real-world panel').toBe(false);
    expect(text.includes('Obtuse angles are wider'), 'coach tip').toBe(false);
    expect(text.includes('Obtuse'), 'any Obtuse label').toBe(false);
    const svgLabel = c.querySelector('[data-protractor-svg]').getAttribute('aria-label');
    expect(svgLabel.includes('Obtuse'), svgLabel).toBe(false);
  });

  it('the coach tip does not name the class of an open classify question', async () => {
    const cases = [[90, 'A right angle (90°) is everywhere'], [210, 'Reflex angles go past 180°']];
    for (const [target, tip] of cases) {
      const c = await mount({ angleValue: target, angleChallenge: { type: 'classify', target }, exploreScore: { correct: 0, total: 1 }, protractor: { activeTab: 'challenges' } });
      expect(c.textContent.includes(tip), target + ': ' + tip).toBe(false);
    }
  });
});

describe('estimate mode hides the number it asks for', () => {
  const est = (extra) => ({ angleValue: 30, protractor: Object.assign({ estimateActive: true, estimateTarget: 30, estimateGuess: '', showBisector: true, activeTab: 'explore' }, extra || {}) });

  it('header, live region, bisector, relation boxes, slider and quick buttons stay silent', async () => {
    const c = await mount(est());
    expect(headerAngle(c)).toBe('?');
    const liveRegion = c.querySelector('[aria-live="polite"][aria-atomic="true"]');
    expect(liveRegion.textContent.includes('30'), liveRegion.textContent).toBe(false);
    expect(c.textContent.includes('15.0°'), 'bisector label').toBe(false);
    expect(c.textContent.includes('Vertical Angle'), 'relation boxes').toBe(false);
    const slider = c.querySelector('input[type="range"][aria-label="Angle value slider"]');
    expect(slider.getAttribute('aria-valuetext')).toBe('?');
    expect(slider.disabled, 'slider locked so the drawn angle stays the graded one').toBe(true);
    const quick30 = c.querySelector('button[aria-label="Set angle to 30 degrees"]');
    expect(quick30.getAttribute('aria-pressed')).toBe('false');
    expect(quick30.disabled).toBe(true);
    expect(/bg-purple-700/.test(quick30.className), 'the 30 deg button is not highlighted').toBe(false);
    expect(handle(c).getAttribute('aria-valuetext')).toBe('?');
    const svgLabel = c.querySelector('[data-protractor-svg]').getAttribute('aria-label');
    expect(/30|Acute/.test(svgLabel), svgLabel).toBe(false);
  });

  it('a blank guess is not graded as 0, and a decimal guess rounds', async () => {
    const c = await mount(est({ activeTab: 'challenges' }));
    await click(c.querySelector('button[aria-label="Check"]'));
    expect(live.d.estimateResult == null, 'blank guess graded').toBe(true);
    expect(live.exploreScore.total).toBe(0);
    const input = c.querySelector('input[aria-label="Angle estimate guess in degrees"]');
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, '30.4');
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    await click(c.querySelector('button[aria-label="Check"]'));
    expect(live.d.estimateResult && live.d.estimateResult.guess).toBe(30);
    expect(live.d.estimateResult.ok).toBe(true);
  });
});

describe('speed round', () => {
  const speed = (extra) => ({ angleValue: 45, protractor: Object.assign({ activeTab: 'challenges', speedActive: true, speedPaused: false, speedScore: 0, speedTimeLeft: 30, speedTarget: { angle: 120, type: 'Obtuse' } }, extra || {}) });

  it('does not score while paused', async () => {
    const c = await mount(speed({ speedPaused: true }));
    await click(buttons(c, 'Obtuse')[0]);
    expect(live.d.speedScore || 0).toBe(0);
  });

  it('a miss moves to the next target, so pressing every button cannot score it', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // next target = 15 deg
    const c = await mount(speed());
    await click(buttons(c, 'Acute')[0]);
    expect(live.d.speedTarget && live.d.speedTarget.angle).toBe(15);
    expect(live.d.speedScore || 0).toBe(0);
  });

  it('each answer button is named by its class', async () => {
    const c = await mount(speed());
    expect(c.querySelectorAll('button[aria-label="Answer Speed"]').length).toBe(0);
    expect(buttons(c, 'Reflex').length).toBe(1);
  });
});

describe('snap to 15 degrees', () => {
  it('arrow keys move a full snap step instead of rounding back', async () => {
    const c = await mount({ angleValue: 45, protractor: { snapEnabled: true, activeTab: 'explore' } });
    await key(handle(c), 'ArrowRight');
    expect(live.angleValue).toBe(60);
    await key(handle(c), 'ArrowLeft');
    expect(live.angleValue).toBe(45);
    const slider = c.querySelector('input[type="range"][aria-label="Angle value slider"]');
    expect(slider.getAttribute('step')).toBe('15');
  });
});

describe('class ids and saved data', () => {
  it('right-angle examples survive a translated "Right"', async () => {
    const germanT = (k, fb) => (k === 'stem.angles.right' ? 'Recht' : (fb || k));
    const c = await mount({ angleValue: 90, protractor: { activeTab: 'explore' } }, germanT);
    expect(c.textContent.includes('Corner of a book or paper')).toBe(true);
  });

  it('an untranslated key never prints as raw text', async () => {
    const rawT = (k) => k; // a host t() that echoes missing keys
    const c = await mount({ angleValue: 90, protractor: { activeTab: 'explore' } }, rawT);
    expect(c.textContent.includes('stem.angles.right')).toBe(false);
  });

  it('malformed saved pins and history do not crash any tab', () => {
    for (const activeTab of ['explore', 'tools']) {
      const html = renderTool('protractor', { protractor: { activeTab, anglePins: [null, { deg: 30 }, { deg: 'x' }], angleHistory: 'oops' } }, { angleValue: 45, exploreScore: { correct: 0, total: 0 } });
      expect(html.length > 1000, activeTab).toBe(true);
    }
    const html2 = renderTool('protractor', { protractor: { activeTab: 'tools', angleHistory: [null, { deg: 60 }] } }, { angleValue: 45, exploreScore: { correct: 0, total: 0 } });
    expect(html2.includes('60°')).toBe(true);
  });
});

describe('Pisa triangle', () => {
  it('draws the labelled angle: 15 deg at H = 100 m, not 23.3 deg', () => {
    const html = renderTool('protractor', { protractor: { activeTab: 'reference' }, angles: { expSection: 'pisaCross', pisaCross: { angleDeg: 15, towerHeight: 100 } } }, { angleValue: 45, exploreScore: { correct: 0, total: 0 } });
    const m = html.match(/<polygon points="([^"]+)" fill="rgba\(251,191,36,0.3\)"/);
    expect(m, 'triangle polygon').toBeTruthy();
    const pts = m[1].trim().split(/\s+/).map((p) => p.split(',').map(Number));
    const [a, b, top] = pts; // right angle, base-right, top
    const drawn = Math.atan2(a[1] - top[1], b[0] - a[0]) * 180 / Math.PI;
    expect(Math.abs(drawn - 15) < 0.2, 'drawn ' + drawn.toFixed(2)).toBe(true);
  });
});
