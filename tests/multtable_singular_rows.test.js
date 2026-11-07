// "1 rows" in Multiplication Table sentences: the picture hint, the array read-outs and the factor rectangles.
// A sentence that names one row now has its own key, and no restatement names the answer the old one kept back.
// MULTTABLE_SINGULAR_SRC points the suite at another copy for the fail-first proof.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MULTTABLE_SINGULAR_SRC || 'stem_lab/stem_tool_multtable.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let host = null;

beforeEach(() => { resetStemLab(); loadTool(FILE, 'multtable'); });
afterEach(async () => {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  if (host) { host.remove(); host = null; }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function mount(opts = {}) {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; host.remove(); }
  const tool = window.StemLab._registry.multtable;
  const view = { ann: [] };
  function App() {
    const [lab, setLab] = React.useState(opts.lab || {});
    const [answer, setAnswer] = React.useState('');
    const [challenge, setChallenge] = React.useState(opts.challenge || null);
    const [feedback, setFeedback] = React.useState(null);
    const [hidden, setHidden] = React.useState(false);
    const [revealed, setRevealed] = React.useState(new Set());
    const [score, setScore] = React.useState({ correct: 0, total: 0 });
    return tool.render(makeCtx({
      labToolData: lab, setLabToolData: setLab,
      multTableAnswer: answer, setMultTableAnswer: setAnswer,
      multTableChallenge: challenge, setMultTableChallenge: setChallenge,
      multTableFeedback: feedback, setMultTableFeedback: setFeedback,
      multTableHidden: hidden, setMultTableHidden: setHidden,
      multTableHover: null, setMultTableHover: () => {},
      multTableRevealed: revealed, setMultTableRevealed: setRevealed,
      exploreScore: score, setExploreScore: setScore,
      awardXP: () => {}, announceToSR: (m) => view.ann.push(String(m)), addToast: () => {},
    }));
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(App)); });
  return view;
}
const act = (fn) => React.act(async () => { await fn(); });
const setValue = async (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(() => { setter.call(input, String(value)); input.dispatchEvent(new Event('input', { bubbles: true })); });
};
const button = (name) => [...host.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === name || b.textContent.trim() === name);
async function wrong(value) {
  await setValue(host.querySelector('#multtable-input'), value);
  await act(() => button('Check').click());
}
const right = (c) => (c.mode === 'div' ? (c.divisor === c.a ? c.b : c.a) : c.mode === 'missing' ? (c.known === c.a ? c.b : c.a) : c.a * c.b);
async function hintFor(challenge) {
  await mount({ challenge: Object.assign({ divisor: null, source: 'tool', id: 'q' }, challenge) });
  const r = right(challenge);
  await wrong(r + 1);
  await wrong(r + 2);
  const fig = host.querySelector('[data-mt-hint-picture]');
  return fig ? fig.querySelector('figcaption').textContent : null;
}
const NOT_ONE_ROWS = /(^|[^\d])1 (equal )?(rows|columns)\b/;

describe('the picture hint says "1 row"', () => {
  it('the case from the review: 6 rows split as 5 and 1', async () => {
    expect(await hintFor({ a: 6, b: 7, mode: 'mult' })).toBe('The rows split into 5 rows of 7 and 1 row of 7. Find each part, then add.');
  });

  it('3 rows split as 1 and 2', async () => {
    expect(await hintFor({ a: 3, b: 7, mode: 'mult' })).toBe('The rows split into 1 row of 7 and 2 rows of 7. Find each part, then add.');
  });

  it('facts that land on one row or one split part: never "1 rows", and never the product', async () => {
    let captions = 0;
    for (const a of [1, 2, 3, 6, 7, 11, 12]) {
      for (const b of [1, 2, 3, 6, 7, 11, 12]) {
        const c = await hintFor({ a, b, mode: 'mult' });
        if (c === null) continue;
        captions++;
        expect(NOT_ONE_ROWS.test(c), a + 'x' + b + ': ' + c).toBe(false);
        // A number in the question may equal the product (1 x 7); otherwise the hint keeps it back.
        if (a > 1 && b > 1) expect(new RegExp('(^|\\D)' + a * b + '(\\D|$)').test(c), a + 'x' + b + ': ' + c).toBe(false);
      }
    }
    expect(captions).toBeGreaterThan(30);
  }, 120000);

  it('division with one row keeps asking, and the sentence is singular', async () => {
    const c = await hintFor({ a: 1, b: 7, mode: 'div', divisor: 1 });
    expect(NOT_ONE_ROWS.test(c), c).toBe(false);
    expect(c).toBe('7 dots shared into 1 row. How many dots are in that row?');
  });

  it('a missing factor of 1 row is singular too', async () => {
    const c = await hintFor({ a: 1, b: 7, mode: 'missing', known: 1 });
    expect(NOT_ONE_ROWS.test(c), c).toBe(false);
  });

  it('the plural sentence still reads as before', async () => {
    expect(await hintFor({ a: 8, b: 7, mode: 'mult' })).toBe('The rows split into 5 rows of 8 and 2 rows of 8. Find each part, then add.');
  });
});

describe('the array read-outs say "1 row"', () => {
  const lab = (extra) => ({ _multExt: Object.assign({ mtTab: 'visual', visualA: 1, visualB: 7 }, extra) });
  it('the built read-outs and the picture label', async () => {
    await mount({ lab: lab({ visualPred: { key: '1x7', built: true, committed: 7 } }) });
    const all = host.textContent + ' ' + [...host.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).join(' ');
    expect(NOT_ONE_ROWS.test(all), all.match(/.{30}1 rows.{20}/)?.[0]).toBe(false);
    expect(host.textContent).toContain('1 row of 7 = 1 group of 7 = 7 added once');
    expect(all).toContain('Array of 1 row with 7 in that row, 7 in all.');
  });

  it('what a screen reader hears on building and swapping', async () => {
    const v1 = await mount({ lab: lab({}) });
    await act(() => button('I am not sure: just build it').click());
    expect(v1.ann.join(' ')).toContain('Built: 1 row of 7 makes 7 in all.');
    const v2 = await mount({ lab: { _multExt: { mtTab: 'visual', visualA: 7, visualB: 1 } } });
    await act(() => button('Swap factors (commutativity)').click());
    const heard = v1.ann.concat(v2.ann).join(' | ');
    expect(NOT_ONE_ROWS.test(heard), heard).toBe(false);
    expect(v2.ann.join(' ')).toContain('Swapped to 1 row of 7.');
  });
});

describe('factor rectangles say "1 row"', () => {
  it('the test line and the rectangle label', async () => {
    await mount({ lab: { _multExt: { mtTab: 'factors', fx: { n: 24, pred: 'composite', found: [[1, 24]], tests: [{ w: 1, ok: true, q: 24, r: 0 }], checks: 0 } } } });
    const box = host.querySelector('[data-mt-factors]');
    expect(box.textContent).toContain('1 row of 24: yes. 1 × 24 = 24, so 1 and 24 are a factor pair.');
    expect(box.querySelector('svg[role="img"]').getAttribute('aria-label')).toBe('1 row of 24 squares, 24 squares in all.');
    expect(NOT_ONE_ROWS.test(box.textContent)).toBe(false);
  });
});
