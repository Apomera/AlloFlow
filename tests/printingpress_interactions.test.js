// Live-mount interaction tests for the 2026-11-03 Printing Press pass:
// first-try quiz scoring, non-colour answer cues, focus after answering,
// the hand-pulled press bar, Canvas-safe printing, type-case names, the
// screen-reader mirror puzzle and glossary content.
// PP_SRC points the suite at another copy (used to confirm it fails pre-fix).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = ['desktop/web-app/node_modules', 'node_modules']
  .map((p) => resolve(process.cwd(), p))
  .find((p) => existsSync(resolve(p, 'react')));
const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const SOURCE = process.env.PP_SRC || 'stem_lab/stem_tool_printingpress.js';
const noop = () => {};
let mounted = null;

function loadTool() {
  const reg = {
    _registry: {}, _order: [],
    registerTool(id, config) { config.id = id; this._registry[id] = config; this._order.push(id); },
    isRegistered(id) { return !!this._registry[id]; },
    getRegisteredTools() { return this._order.map((id) => this._registry[id]); },
    renderTool(id, ctx) { const t = this._registry[id]; return t && t.render ? t.render(ctx) : null; },
  };
  window.StemLab = reg;
  globalThis.StemLab = reg;
  if (!window.React) window.React = React;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), SOURCE), 'utf8'))();
  return reg._registry.printingPress;
}

function mount(initial) {
  const cfg = loadTool();
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({ printingPress: initial || {} });
    const update = (toolId, key, val) => setToolData((prev) => ({ ...prev, [toolId]: { ...(prev[toolId] || {}), [key]: val } }));
    const updateMulti = (toolId, obj) => setToolData((prev) => ({ ...prev, [toolId]: { ...(prev[toolId] || {}), ...obj } }));
    return cfg.render({
      React, toolData, setToolData, update, updateMulti, addToast: noop, announceToSR: noop,
      awardXP: noop, callGemini: null, gradeLevel: '7th Grade', t: (k, f) => f || k,
      icons: new Proxy({}, { get: () => () => null }),
    });
  }
  act(() => { root.render(React.createElement(Harness)); });
  mounted = { host, root };
  return host;
}

const click = (el) => act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); });
const tick = (ms) => act(() => { vi.advanceTimersByTime(ms); });
const buttons = (scope) => Array.from(scope.querySelectorAll('button'));
const byText = (scope, text) => buttons(scope).find((b) => b.textContent.includes(text));
function setRange(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  act(() => { setter.call(input, String(value)); input.dispatchEvent(new window.Event('input', { bubbles: true })); });
}
function typeInto(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  act(() => { setter.call(input, value); input.dispatchEvent(new window.Event('input', { bubbles: true })); });
}

beforeEach(() => {
  vi.useFakeTimers();
  try { localStorage.clear(); } catch (_) {}
  delete window.__alloflowPrintingPress;
});
afterEach(() => {
  if (mounted) { try { act(() => mounted.root.unmount()); } catch (_) {} mounted.host.remove(); mounted = null; }
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('mini-quiz', () => {
  function quiz(host) { return host.querySelector('[role="group"][aria-label="Mini-quiz"]'); }
  function options(q) { return buttons(q).filter((b) => !/Try again|Next|See score/.test(b.textContent)); }

  it('scores first tries only, marks answers in text, and moves focus deliberately', () => {
    const host = mount({ view: 'pressMechanism' });
    let firstTryRight = 0, firstTryWrong = 0, total = 0;
    for (let guard = 0; guard < 10 && quiz(host); guard++) {
      const q = quiz(host);
      const choice = options(q)[1];
      click(choice);
      const feedback = document.activeElement;
      expect(q.contains(feedback) && feedback.textContent.includes('Why:'), 'focus moves to the feedback').toBe(true);
      const key = options(q).find((b) => b.textContent.startsWith('✓ Correct answer:'));
      expect(key, 'the key is marked in text, not colour alone').toBeTruthy();
      total++;
      if (key === choice) firstTryRight++;
      else {
        firstTryWrong++;
        expect(choice.textContent.startsWith('✗ Your answer:')).toBe(true);
        click(byText(q, 'Try again'));
        expect(document.activeElement.tagName).toBe('P');
        click(options(q).find((b) => b.textContent === key.textContent.replace('✓ Correct answer: ', '')));
        expect(q.textContent).toContain('Correct on retry');
      }
      const next = byText(q, 'Next') || byText(q, 'See score');
      click(next);
    }
    expect(firstTryWrong, 'the walk must include a miss to discriminate').toBeGreaterThan(0);
    const score = Array.from(host.querySelectorAll('p')).find((p) => p.textContent.startsWith('Score:'));
    expect(score.textContent).toContain(firstTryRight + ' / ' + total);
    expect(document.activeElement.textContent).toMatch(/Mastery|Review recommended/);
  });
});

describe('cumulative quiz', () => {
  it('keeps a first-try miss in the score and the review list after a correct retry', () => {
    const host = mount({ view: 'cumulative' });
    const total = Number(/of (\d+)/.exec(host.textContent)[1]);
    expect(total).toBeGreaterThan(5);
    const bar = host.querySelector('[role="progressbar"]');
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
    act(() => { mounted.root.unmount(); }); mounted.host.remove(); mounted = null;

    const lastQuestion = { view: 'cumulative', bigQuizState: { idx: total - 1, score: 0, answered: false, lastChoice: null, picks: {} } };
    const options = (h) => buttons(h.querySelector('[role="progressbar"]').nextElementSibling);

    // Probe mount: answer once to learn which option is the key.
    let host2 = mount(lastQuestion);
    click(options(host2)[0]);
    const keyText = options(host2).find((b) => b.textContent.startsWith('✓ Correct answer:')).textContent.replace('✓ Correct answer: ', '');
    act(() => { mounted.root.unmount(); }); mounted.host.remove(); mounted = null;

    host2 = mount(lastQuestion);
    const wrong = options(host2).find((b) => b.textContent !== keyText);
    click(wrong);
    expect(wrong.textContent.startsWith('✗ Your answer:')).toBe(true);
    expect(document.activeElement.textContent).toContain('Why:');
    click(byText(host2, 'Try again'));
    click(options(host2).find((b) => b.textContent === keyText));
    expect(host2.textContent).toContain('Correct on retry');
    expect(host2.textContent).toMatch(/score\s*0/);
    click(byText(host2, 'See results'));
    expect(host2.textContent).toContain('Score: 0 / ' + total);
    expect(host2.textContent).toContain('Review these specific gaps');
    expect(document.activeElement.tagName).toBe('H2');
  });
});

describe('press mechanism', () => {
  it('lets the student pull the bar by hand, with readable state names', () => {
    const host = mount({ view: 'pressMechanism' });
    const press = () => host.querySelector('svg[role="img"][aria-label^="Side view"]');
    click(byText(host, '① Ink the type'));
    tick(1500);
    click(byText(host, '② Lay paper'));
    expect(press().getAttribute('aria-label')).not.toMatch(/state: (clean|inking|inked|papered|pressed|revealed)$/);
    const slider = host.querySelector('#pp-bar-pull');
    expect(slider, 'hand-pull control appears once paper is laid').toBeTruthy();
    expect(slider.labels[0].textContent).toContain('pull the bar by hand');
    setRange(slider, 50);
    const bar = host.querySelector('.pp-press-bar');
    expect(bar.getAttribute('transform')).toMatch(/^translate\(240, [\d.]+\) rotate\(-37\.5\)$/);
    // The translate already sits on the nut; any other origin swings the bar off it.
    expect(bar.style.transformOrigin).toBe('0px 0px');
    expect(host.querySelector('#pp-bar-pull-readout').textContent).toContain('45°');
    expect(host.querySelector('#pp-bar-pull-readout').textContent).toContain('No contact yet');
    setRange(slider, 95);
    expect(host.querySelector('#pp-bar-pull-readout').textContent).toMatch(/Contact: up to [\d,]+ N/);
    setRange(slider, 100);
    expect(host.querySelector('#pp-bar-pull')).toBeNull();
    expect(byText(host, '④ Lift and reveal')).toBeTruthy();
  });

  it('keeps Teacher Notes free of nested controls and prints through a new window', () => {
    const host = mount({ view: 'pressMechanism' });
    const notes = host.querySelector('details.printingpress-teacher-notes');
    expect(notes.querySelector('summary [role="button"], summary button')).toBeNull();
    const print = notes.querySelector('button[aria-label="Print this module page"]');
    expect(print).toBeTruthy();
    const doc = { write: vi.fn(), close: vi.fn() };
    const popup = { document: doc, focus: vi.fn(), print: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(popup);
    const inPage = vi.spyOn(window, 'print').mockImplementation(() => {});
    click(print);
    expect(open).toHaveBeenCalled();
    expect(popup.print).toHaveBeenCalled();
    expect(inPage).not.toHaveBeenCalled();
    const written = doc.write.mock.calls[0][0];
    expect(written).toContain('Turn motion into a message');
    expect(written).not.toContain('printingpress-no-print');
    open.mockReturnValue(null);
    click(print);
    expect(inPage, 'falls back to in-page print when pop-ups are blocked').toHaveBeenCalled();
  });
});

describe('set your own type', () => {
  it('names every sort, including the space, and reports the picked sort as pressed', () => {
    const host = mount({ view: 'setType' });
    const sorts = buttons(host).filter((b) => /\(mirror-reversed sort\)$|^fi ligature \(one sort/.test(b.getAttribute('aria-label') || ''));
    expect(sorts.length).toBeGreaterThan(8);
    expect(sorts.some((b) => b.getAttribute('aria-label') === 'space (mirror-reversed sort)')).toBe(true);
    for (const s of sorts) expect(s.getAttribute('aria-label').trim().startsWith('(')).toBe(false);
    expect(sorts[0].getAttribute('aria-pressed')).toBe('false');
    click(sorts[0]);
    expect(sorts[0].isConnected, 'the case keeps its DOM across a pick').toBe(true);
    expect(sorts[0].getAttribute('aria-pressed')).toBe('true');
    const slot = buttons(host).find((b) => /^Slot 1: empty\. Activate to place/.test(b.getAttribute('aria-label') || ''));
    expect(slot).toBeTruthy();
    click(slot);
    expect(buttons(host).find((b) => /^Slot 1: I\. Activate to remove it\./.test(b.getAttribute('aria-label') || ''))).toBeTruthy();
  });

  it('gives screen readers the mirror puzzle instead of the answer', () => {
    const host = mount({ view: 'setType' });
    const puzzle = host.querySelector('[role="img"][aria-label^="Mirror-reversed type"]');
    expect(puzzle).toBeTruthy();
    expect(puzzle.getAttribute('aria-label')).toContain('S, A, T, I, R, E, V');
    expect(puzzle.firstElementChild.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('print glossary', () => {
  it('holds printing terms only and announces filter results', () => {
    const host = mount({ view: 'printGlossary' });
    expect(host.textContent).not.toMatch(/MIG welding|weld symbol|AWS weld/);
    const filter = host.querySelector('input[aria-label="Filter print glossary terms"]');
    typeInto(filter, 'zzzz');
    const status = Array.from(host.querySelectorAll('[role="status"]')).find((s) => / terms$/.test(s.textContent));
    expect(status.textContent).toMatch(/^0 \/ \d+ terms$/);
    expect(host.textContent).toContain('No terms match');
  });
});
