// Assessment Center's Missing Number and Quantity Discrimination probes, rendered
// against the item bank the app actually ships (psychometric_math_probes.json).
//
// The runners read fields the bank never had: Missing Number mapped
// `problem.sequence` (bank items are {display: "7 + __ = 12", missingPos, answer}),
// so Start crashed the panel; Quantity Discrimination drew `problem.a`/`problem.b`
// (bank items are {left, right, answer}), so both choice buttons were blank and a
// full administration scored 0/25. This mounts the real module and runs each
// probe to the end with correct answers.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(MODULES, 'react'));
const { createRoot } = require(resolve(MODULES, 'react-dom/client'));
const banks = JSON.parse(readFileSync(resolve(process.cwd(), 'psychometric_math_probes.json'), 'utf8'));

let Panel;
let root;
let host;

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = React;
  window.ReactDOM = require(resolve(MODULES, 'react-dom')); // the panel portals into document.body
  const file = process.env.SA_MN_QD_MODULE || 'student_analytics_module.js';
  const log = console.log;
  console.log = () => {};
  try { new Function(readFileSync(resolve(process.cwd(), file), 'utf8'))(); } finally { console.log = log; }
  Panel = window.AlloModules.StudentAnalytics;
});

afterEach(() => {
  if (root) React.act(() => root.unmount());
  root = null;
  if (host) host.remove();
  vi.useRealTimers();
});

function mount() {
  vi.useFakeTimers();
  window.MISSING_NUMBER_PROBES = banks.MISSING_NUMBER_PROBES;
  window.QUANTITY_DISCRIMINATION_PROBES = banks.QUANTITY_DISCRIMINATION_PROBES;
  window.MATH_PROBE_BANKS = banks.MATH_PROBE_BANKS;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  const caught = [];
  class Boundary extends React.Component {
    constructor(p) { super(p); this.state = { error: null }; }
    static getDerivedStateFromError(error) { return { error }; }
    componentDidCatch(error) { caught.push(error.message); }
    render() { return this.state.error ? React.createElement('div', { id: 'crashed' }, String(this.state.error.message)) : this.props.children; }
  }
  const err = console.error;
  console.error = () => {};
  try {
    React.act(() => root.render(React.createElement(Boundary, null, React.createElement(Panel, {
      isOpen: true, onClose() {}, students: [], dashboardData: null, t: (k) => k, addToast() {}, loadProbeBanks() {},
    }))));
    React.act(() => { vi.advanceTimersByTime(100); });
  } finally { console.error = err; }
  return caught;
}

const buttons = () => Array.from(document.body.querySelectorAll('button'));
const click = (el) => React.act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); vi.advanceTimersByTime(60); });

describe('Missing Number probe runs on the shipped bank items', () => {
  it('shows each equation with its blank and scores correct answers', () => {
    const caught = mount();
    const start = buttons().find((b) => /Start Missing Number/.test(b.textContent));
    expect(start, 'Start Missing Number button').toBeTruthy();
    const err = console.error;
    console.error = () => {};
    try { click(start); } finally { console.error = err; }
    expect(document.querySelector('#crashed'), 'panel crashed on Start').toBeNull();
    expect(caught).toEqual([]);

    const items = banks.MISSING_NUMBER_PROBES['1'].A.problems;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    items.forEach((item, i) => {
      const shown = document.querySelector('.text-3xl.mb-6.tracking-wider');
      expect(shown && shown.textContent.replace(/\s+/g, ''), 'item ' + i).toBe(item.display.replace(/_{2,}/, '?').replace(/\s+/g, ''));
      const input = document.querySelector('input[aria-label="Math probe answer"]');
      React.act(() => {
        setter.call(input, String(item.answer));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      React.act(() => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        vi.advanceTimersByTime(60);
      });
    });
    const results = Array.from(document.body.querySelectorAll('h4')).find((h) => /Missing Number Probe Results/.test(h.textContent));
    expect(results, 'results panel').toBeTruthy();
    expect(results.parentElement.textContent).toContain(items.length + 'Correct');
  });
});

describe('Quantity Discrimination probe runs on the shipped bank items', () => {
  it('labels both choices with the item numbers and scores the bigger one as correct', () => {
    mount();
    click(buttons().find((b) => /Start QD Probe/.test(b.textContent)));
    const items = banks.QUANTITY_DISCRIMINATION_PROBES.K.A.problems;
    items.forEach((item, i) => {
      const choices = buttons().filter((b) => /w-28 h-28/.test(b.className));
      expect(choices.map((b) => b.textContent), 'item ' + i).toEqual([String(item.left), String(item.right)]);
      click(choices.find((b) => b.textContent === String(item.answer)));
    });
    const results = Array.from(document.body.querySelectorAll('h4')).find((h) => /Quantity Discrimination Results/.test(h.textContent));
    expect(results, 'results panel').toBeTruthy();
    expect(results.parentElement.textContent).toContain(items.length + 'Correct');
  });
});
