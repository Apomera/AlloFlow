// Independent hunt of the Coordinate Grid engagement build (2026-11-04). Each block
// failed on the build as it stood; run with COORDGRID_DEEP_FILE=<start copy> to see it.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.COORDGRID_DEEP_FILE || 'stem_lab/stem_tool_coordgrid.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root = null, latest = null, sr = [], errors = [], scrolled = [];
beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'coordinate');
  latest = null; sr = []; errors = []; scrolled = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 300)); });
  window.HTMLElement.prototype.scrollIntoView = function (opts) { scrolled.push([this, opts]); };
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  document.body.innerHTML = '';
  delete window.HTMLElement.prototype.scrollIntoView;
  vi.restoreAllMocks();
});

async function mount(cg, extra) {
  if (root) { await React.act(async () => root.unmount()); root = null; }
  document.body.innerHTML = '<div id="root"></div>';
  function App() {
    const [state, setState] = React.useState({ _coordGrid: cg });
    const [es, setEs] = React.useState({ correct: 0, total: 0 });
    latest = state._coordGrid;
    return window.StemLab._registry.coordinate.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState, exploreScore: es, setExploreScore: setEs, gradeLevel: '7th Grade',
      awardXP: () => {}, announceToSR: (m) => sr.push(m), addToast: () => {},
    }, extra || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(App)));
}
const click = async (el) => { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); };
const clickN = async (el, detail) => { await React.act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, detail, clientX: 50, clientY: 50 })); }); };
const settle = async (ms) => { await React.act(async () => { await new Promise((r) => setTimeout(r, ms || 60)); }); };
async function type(el, value) {
  expect(el, 'input to type in').toBeTruthy();
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
const byText = (re, scope) => [...(scope || document).querySelectorAll('button')].find((b) => re.test(b.textContent.trim()));
const checkBtn = () => document.querySelector('button[aria-label="Check"]');
const walkSvg = () => document.querySelector('[data-coordgrid-walk-svg]');
const P = (x, y) => ({ x, y });
const plotTask = (t, more) => Object.assign({ type: 'plot', target: t, tries: 0, hint: 0 }, more || {});
const stepBtn = (id) => document.querySelector('[data-coordgrid-path-step="' + id + '"] button');
const scrolledTo = (sel) => scrolled.some((s) => s[0].matches && s[0].matches(sel));

describe('the walk labels stay inside the grid', () => {
  it('Quadrant I (grade 5): the x-leg label is not drawn below the bottom edge, and legs on the frame are not half cut', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g5', gridPoints: [P(3, 2)], gridChallenge: plotTask(P(2, 3), { view: 'q1' }) });
    await click(checkBtn());
    const labels = [...walkSvg().querySelectorAll('text')];
    expect(labels.map((t) => t.textContent)).toEqual(['3 right', '2 up']);
    const right = labels[0];
    expect(Number(right.getAttribute('y')), 'x-leg label y').toBeLessThan(400);
    expect(walkSvg().querySelector('path').getAttribute('d')).toBe('M2.0 398.0L120.0 398.0');
  });

  it('a leg near the right or left edge puts its label on the inner side', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridPoints: [P(8, -7)], gridChallenge: plotTask(P(8, -7)) });
    await click(checkBtn());
    const y = [...walkSvg().querySelectorAll('text')][1];
    expect(y.textContent).toBe('7 down');
    expect(y.getAttribute('text-anchor')).toBe('end');
    expect(Number(y.getAttribute('x'))).toBeLessThan(360);
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridPoints: [P(-10, 3)], gridChallenge: plotTask(P(2, 3)) });
    await click(checkBtn());
    const y2 = [...walkSvg().querySelectorAll('text')][1];
    expect(y2.getAttribute('text-anchor')).toBe('start');
    expect(Number(y2.getAttribute('x'))).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  it('the labels are drawn after every leg, so a leg never crosses a label', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g5', gridPoints: [P(1, 2)], gridChallenge: plotTask(P(2, 3), { view: 'q1' }) });
    await click(checkBtn());
    const tags = [...walkSvg().children].map((n) => n.tagName.toLowerCase());
    expect(tags.lastIndexOf('path')).toBeLessThan(tags.indexOf('text'));
  });
});

describe('Start and Next land focus on something usable, on screen', () => {
  it('Patterns: Start focuses the first box of the card (typing is step 1), and scrolls the card in, not the level bar', async () => {
    await mount({ cgLevel: 'g5', pathAll: true });
    await click(stepBtn('patterns'));
    await settle();
    const card = document.querySelector('[data-coordgrid-pt]');
    expect(latest.ptTask.stage).toBe('fill');
    expect(document.activeElement.tagName).toBe('INPUT');
    expect(card.contains(document.activeElement)).toBe(true);
    expect(scrolledTo('[data-coordgrid-pt]')).toBe(true);
    expect(scrolledTo('[data-coordgrid-tab]')).toBe(false);
    // A table starts by plotting: the graph, which has no box before it, takes focus.
    scrolled = [];
    await mount({ cgLevel: 'g6', pathAll: true });
    await click(stepBtn('table'));
    await settle();
    expect(document.activeElement).toBe(document.querySelector('[data-coordgrid-app="pt"]'));
    expect(scrolledTo('[data-coordgrid-pt]')).toBe(true);
  });

  it('Transformations: Start scrolls the task card in (prompt and grid), not the whole panel', async () => {
    await mount({ cgLevel: 'g8', pathAll: true });
    await click(stepBtn('rotate'));
    await settle();
    expect(document.activeElement).toBe(document.querySelector('[data-coordgrid-app="tf"]'));
    expect(scrolledTo('[data-coordgrid-tf]')).toBe(true);
    expect(scrolledTo('[data-coordgrid-tab]')).toBe(false);
  });

  it('when the box would leave most of the focused grid off screen, the grid itself comes into view', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', pathAll: true });
    const real = window.HTMLElement.prototype.getBoundingClientRect;
    window.HTMLElement.prototype.getBoundingClientRect = function () {
      const top = this.id === 'coordgrid-explore-app' ? window.innerHeight + 100 : 0;
      return { top, bottom: top + 400, left: 0, right: 300, width: 300, height: 400, x: 0, y: top };
    };
    try {
      await click(stepBtn('plot6'));
      await settle();
    } finally { window.HTMLElement.prototype.getBoundingClientRect = real; }
    const last = scrolled[scrolled.length - 1];
    expect(last[0].id).toBe('coordgrid-explore-app');
    expect(last[1].block).toBe('nearest');
    expect(document.activeElement.id).toBe('coordgrid-explore-app');
  });

  it('Transformations and Patterns Next move focus into the new task; they used to drop it on the page', async () => {
    await mount({ cgLevel: 'g8', pathAll: true });
    await click(stepBtn('rotate'));
    await settle();
    await mount(Object.assign({}, latest, { tfTask: Object.assign({}, latest.tfTask, { done: true }) }));
    let next = byText(/^Next: /, document.querySelector('[data-coordgrid-tf]'));
    next.focus();
    await click(next);
    await settle();
    expect(document.activeElement).toBe(document.querySelector('[data-coordgrid-app="tf"]'));
    await mount({ cgLevel: 'g6', pathAll: true });
    await click(stepBtn('table'));
    await settle();
    await mount(Object.assign({}, latest, { ptTask: Object.assign({}, latest.ptTask, { done: true }) }));
    next = byText(/^Next: /, document.querySelector('[data-coordgrid-pt]'));
    next.focus();
    await click(next);
    await settle();
    expect(document.querySelector('[data-coordgrid-pt]').contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('Treasure: Start a mission and Next mission keep focus (each button disappears on click); a quiet move', async () => {
    await mount({ cgTab: 'treasure', cgLevel: 'g6' });
    const start = byText(/^Start a mission$/);
    start.focus();
    await click(start);
    await settle();
    const app = document.querySelector('[data-coordgrid-app="th"]');
    expect(document.activeElement).toBe(app);
    expect(sr[sr.length - 1]).toMatch(/^Find the buried treasure/);
    const T = latest.thMission.T;
    const lab = (txt) => [...document.querySelectorAll('[data-coordgrid-th] label')].find((l) => l.textContent.trim().startsWith(txt)).querySelector('input');
    await type(lab('X coordinate'), String(T.x));
    await type(lab('Y coordinate'), String(T.y));
    const dig = byText(/^Dig here$/);
    dig.focus();
    await click(dig);
    await settle();
    expect(document.activeElement.id, 'Dig here is gone: focus on the result').toBe('coordgrid-th-feedback');
    const nx = byText(/^Next mission$/);
    nx.focus();
    await click(nx);
    await settle();
    expect(document.activeElement).toBe(document.querySelector('[data-coordgrid-app="th"]'));
  });
});

describe('focus when an item ends', () => {
  it('a solve disables Check: focus moves to the result line, and Tab goes on to Next', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridPoints: [P(2, 3)], gridChallenge: plotTask(P(2, 3)) });
    const c = checkBtn();
    c.focus();
    await click(c);
    await settle();
    expect(c.disabled).toBe(true);
    const fb = document.getElementById('coordgrid-task-feedback');
    expect(document.activeElement).toBe(fb);
    expect(fb.getAttribute('tabindex')).toBe('-1');
  });

  it('a first miss leaves focus on Check; the second miss and Show the answer land on the result line', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridChallenge: { type: 'name', target: P(2, 3), tries: 0, hint: 0 }, gridFeedback: { ansX: '3', ansY: '2' } });
    const c = checkBtn();
    c.focus();
    await click(c);
    await settle();
    expect(document.activeElement).toBe(c);
    await type(document.querySelector('input[aria-label="Your x-coordinate"]'), '9');
    c.focus();
    await click(c);
    await settle();
    expect(document.activeElement.id).toBe('coordgrid-task-feedback');
    const show = document.querySelector('[data-coordgrid-reveal]');
    show.focus();
    await click(show);
    await settle();
    expect(document.activeElement.id).toBe('coordgrid-task-feedback');
    expect(walkSvg().getAttribute('data-coordgrid-walk-svg')).toBe('answer');
  });

  it('Transformations: the second miss disables Check and focus lands on that tab\'s result line', async () => {
    await mount({ cgLevel: 'g8', pathAll: true });
    await click(stepBtn('rotate'));
    await settle();
    await type(document.querySelector('[data-coordgrid-tf] input[aria-label="Your x-coordinate"]'), '9');
    await type(document.querySelector('[data-coordgrid-tf] input[aria-label="Your y-coordinate"]'), '9');
    const c = document.querySelector('[data-coordgrid-tf] button[aria-label="Check"]');
    c.focus();
    await click(c);
    await settle();
    expect(document.activeElement).toBe(c);
    await type(document.querySelector('[data-coordgrid-tf] input[aria-label="Your x-coordinate"]'), '8');
    c.focus();
    await click(c);
    await settle();
    expect(document.activeElement.id).toBe('coordgrid-tf-feedback');
  });
});

describe('a double-click or double-tap is one answer', () => {
  it('Check: the second click of a double-click does not spend the second try', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridPoints: [P(3, 2)], gridChallenge: plotTask(P(2, 3)) });
    const c = checkBtn();
    await clickN(c, 1);
    await clickN(c, 2);
    expect(latest.gridChallenge.tries).toBe(1);
    expect(latest.revealedItems || {}).toEqual({});
    expect(document.querySelector('[data-coordgrid-reveal]')).toBe(null);
    // A later, separate click on the same unchanged answer does not use a try either.
    await clickN(c, 1);
    expect(latest.gridChallenge.tries).toBe(1);
    expect(latest.gridFeedback.msg).toMatch(/same answer/);
  });

  it('a held Enter in a task box (key repeat) grades once', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridChallenge: { type: 'name', target: P(2, 3), tries: 0, hint: 0 } });
    const box = document.querySelector('input[aria-label="Your x-coordinate"]');
    await type(box, '9');
    await type(document.querySelector('input[aria-label="Your y-coordinate"]'), '9');
    const key = async (repeat) => { await React.act(async () => { box.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, repeat })); }); };
    await key(false);
    await key(true);
    await key(true);
    expect(latest.gridChallenge.tries).toBe(1);
  });

  it('Transformations Check: same rule', async () => {
    await mount({ cgLevel: 'g8', pathAll: true });
    await click(stepBtn('rotate'));
    await settle();
    await type(document.querySelector('[data-coordgrid-tf] input[aria-label="Your x-coordinate"]'), '9');
    await type(document.querySelector('[data-coordgrid-tf] input[aria-label="Your y-coordinate"]'), '9');
    const c = document.querySelector('[data-coordgrid-tf] button[aria-label="Check"]');
    await clickN(c, 1);
    await clickN(c, 2);
    expect(latest.tfTask.tries).toBe(1);
    expect(latest.tfTask.done).toBeFalsy();
  });

  it('the grid: a double-click plots one point; it does not plot and then remove it', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6' });
    const svg = document.querySelector('#coordinate-section-panel [role="application"] svg');
    await clickN(svg, 1);
    await clickN(svg, 2);
    expect((latest.gridPoints || []).length).toBe(1);
    // A separate click on the same spot still removes it.
    await clickN(svg, 1);
    expect((latest.gridPoints || []).length).toBe(0);
  });
});

describe('Quadrant I view and a four-quadrant task', () => {
  it('an open task keeps its own grid: the marked point is drawn and a negative answer can be plotted', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', q1View: true, gridChallenge: { type: 'name', target: P(-3, -2), tries: 0, hint: 0 } });
    expect(document.querySelector('#coordinate-section-panel [role="application"] svg rect[transform]'), 'the marked point').toBeTruthy();
    await mount({ cgTab: 'explore', cgLevel: 'g6', q1View: true, gridChallenge: plotTask(P(-3, 2)), coordinateInputX: -3, coordinateInputY: 2 });
    await click(byText(/^Plot or remove point$/));
    expect(latest.gridPoints).toEqual([P(-3, 2)]);
  });

  it('the view checkbox is off limits while a task is open, and still works in free play', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', q1View: true, gridChallenge: plotTask(P(-3, 2)) });
    const box = () => [...document.querySelectorAll('label')].find((l) => l.textContent.includes('Quadrant I view')).querySelector('input');
    expect(box().disabled).toBe(true);
    await mount({ cgTab: 'explore', cgLevel: 'g6', q1View: true, coordinateInputX: -3, coordinateInputY: 2 });
    expect(box().disabled).toBe(false);
    await click(byText(/^Plot or remove point$/));
    // Free play in the Quadrant I view still clamps to 0..10.
    expect(latest.gridPoints).toEqual([P(0, 2)]);
  });
});

describe('small things that were wrong', () => {
  it('a saved lastCode that names an Object method prints no slip (it printed "function Object()")', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridChallenge: plotTask(P(2, 3), { tries: 1, lastCode: 'constructor' }), gridFeedback: { correct: false, walk: P(3, 2) } });
    const cap = document.querySelector('[data-coordgrid-walk]').textContent;
    expect(cap).toBe('Your walk: from the origin, 3 right, then 2 up. It ends at (3, 2).');
  });

  it('contrast theme: the done tick does not sit on a green fill (the host forces span text yellow: 1.22:1)', async () => {
    await mount({ cgLevel: 'g6', pathAll: true, reflectsSolved: 2 }, { isContrast: true });
    const tick = document.querySelector('[data-coordgrid-path-step="reflect"] span[aria-hidden="true"]');
    expect(tick.textContent).toBe('✓');
    expect(tick.style.background).toMatch(/rgb\(0, 0, 0\)|#000000/);
    await mount({ cgLevel: 'g6', pathAll: true, reflectsSolved: 2 });
    const tick2 = document.querySelector('[data-coordgrid-path-step="reflect"] span[aria-hidden="true"]');
    expect(tick2.style.background).not.toMatch(/rgb\(0, 0, 0\)/);
  });

  it('Quadrant Tour has no drag, so touch-action lets a phone scroll from its grid', async () => {
    await mount({ cgTab: 'quadrants', cgLevel: 'g6' });
    const svg = document.querySelector('#coordinate-section-panel svg');
    expect(svg.style.touchAction).toBe('manipulation');
  });

  it('the badge heading is the darker amber (3.07:1 before)', async () => {
    await mount({ cgTab: 'explore', cgLevel: 'g6', gridPoints: [P(2, 3)], gridChallenge: plotTask(P(2, 3)) });
    await click(checkBtn());
    const head = [...document.querySelectorAll('p')].find((p) => /Badges \(/.test(p.textContent));
    expect(head.className).toContain('text-amber-800');
  });
});
