// K-2 stays on 0-20 (2026-11-05). Only placeWhole honoured the limit: Round offered 101-999, Read a scaled line went to 750,
// Estimate was 0-100, the worked example drew 0-1000 next to a 0-10 question, Quick questions reached -20 and fractions,
// and Explore and Skip Count offered 1000 with one tap. NUMBERLINE_SRC=<path> runs against another copy (fail-first).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.NUMBERLINE_SRC || 'stem_lab/stem_tool_numberline.js';
const K2 = { gradeBand: 'k2', gradeLevel: '1st Grade' };
const THIRD = { gradeBand: 'g35', gradeLevel: '3rd Grade' };

let root, host, E, latest;
beforeEach(() => {
  resetStemLab();
  vi.spyOn(Math, 'random');
  Math.random.mockRestore();
  const tool = loadTool(FILE, 'numberline');
  E = tool._engine;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  if (host) host.remove();
});
async function mount(seed, ctxExtra) {
  const tool = window.StemLab._registry.numberline;
  function Host() {
    const [toolData, setToolData] = React.useState({ _numberline: seed });
    latest = toolData._numberline;
    return tool.render(makeCtx({ toolData, setToolData, ...ctxExtra }));
  }
  await React.act(async () => root.render(React.createElement(Host)));
}
const click = (el) => React.act(async () => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
const type = (el, value) => React.act(async () => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const blur = (el) => React.act(async () => el.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true })));
const btn = (text) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(text));

const TYPES = ['placeWhole', 'readScale', 'roundLine', 'estimateOpen'];

describe('K-2 items: every type, 2,000 of each', () => {
  for (const type of TYPES) {
    it(type + ': the line and the answer stay inside 0-20, whole numbers', () => {
      const r = E.seeded(11);
      for (let i = 0; i < 2000; i++) {
        const it = E.genItem(type, 'b23', r, { young: true });
        expect(it.line.min, JSON.stringify(it.line)).toBeGreaterThanOrEqual(0);
        expect(it.line.max, JSON.stringify(it.line)).toBeLessThanOrEqual(20);
        expect(it.target).toBeGreaterThanOrEqual(0);
        expect(it.target).toBeLessThanOrEqual(20);
        expect(Number.isInteger(it.target)).toBe(true);
        if (it.arrow != null) {
          expect(it.arrow).toBeGreaterThanOrEqual(it.line.min);
          expect(it.arrow).toBeLessThanOrEqual(it.line.max);
        }
        for (const label of it.line.labels) { expect(label).toBeGreaterThanOrEqual(0); expect(label).toBeLessThanOrEqual(20); }
      }
    });
  }

  it('each K-2 item grades its own answer right and shows steps with no number above 20', () => {
    const r = E.seeded(5);
    const tt = (k, fb) => fb;
    for (const type of TYPES) {
      for (let i = 0; i < 400; i++) {
        const it = E.genItem(type, 'b23', r, { young: true });
        const res = E.grade(it, it.answer === 'position' ? { pos: it.target } : { text: String(it.target) });
        expect(res.ok, JSON.stringify(it)).toBe(true);
        const words = E.steps(it, tt).join(' ');
        expect(words).not.toContain('percent');
        for (const n of (words.match(/\d+/g) || [])) expect(Number(n), it.type).toBeLessThanOrEqual(20);
      }
    }
  });

  it('a position item can be reached and hit on its own snap grid', () => {
    const r = E.seeded(9);
    for (let i = 0; i < 400; i++) {
      const it = E.genItem('estimateOpen', 'b23', r, { young: true });
      expect(E.snapPos(it, it.target)).toBe(it.target);
      // Estimates keep the proportions older bands get: 5% counts, 10% is close.
      expect(it.tol / (it.line.max - it.line.min)).toBeCloseTo(0.05, 5);
      expect(it.close / (it.line.max - it.line.min)).toBeCloseTo(0.1, 5);
    }
  });

  it('an estimate step names the closer end and how far', () => {
    const it = { ...E.genItem('estimateOpen', 'b23', E.seeded(1), { young: true }), target: 17, text: '17' };
    expect(E.steps(it, (k, fb) => fb)[2]).toBe('17 is 3 away from 20, the closer end.');
  });

  it('older learners keep the wider lines', () => {
    const r = E.seeded(3);
    const maxes = { readScale: 0, roundLine: 0, estimateOpen: 0 };
    for (let i = 0; i < 400; i++) for (const type of Object.keys(maxes)) maxes[type] = Math.max(maxes[type], E.genItem(type, 'b23', r).line.max);
    expect(maxes.readScale).toBeGreaterThan(20);
    expect(maxes.roundLine).toBeGreaterThan(20);
    expect(maxes.estimateOpen).toBe(100);
  });
});

describe('K-2 on the screen', () => {
  const openPp = (item) => ({ item, pos: null, text: '', tries: 0, hints: 0, status: 'open', fb: null, exampleOpen: false });
  const placeItem = { v: 2, id: 'a', type: 'placeWhole', band: 'b23', answer: 'position', tries: 0, line: { min: 0, max: 10, step: 1, labels: [0, 5, 10] }, snap: 1, tol: 0.49, text: '7', target: 7 };

  it('the worked example beside a K-2 question stays inside 0-20, over many items', async () => {
    for (let i = 0; i < 12; i++) {
      await mount({ tab: 'challenges', challengeMode: 'place', pp: openPp({ ...placeItem, id: 'w' + i }) }, K2);
      const worked = host.querySelector('[data-pp-worked]');
      expect(worked).toBeTruthy();
      const labels = [...worked.querySelectorAll('svg text')].map((t) => Number(t.textContent)).filter((n) => Number.isFinite(n));
      expect(labels.length).toBeGreaterThan(0);
      expect(Math.max(...labels), 'item ' + i).toBeLessThanOrEqual(20);
    }
  });

  for (const difficulty of ['easy', 'medium', 'hard']) {
    it('Quick questions on ' + difficulty + ': no negatives, no fractions, nothing above 20', async () => {
      for (let i = 0; i < 30; i++) {
        await mount({ tab: 'challenges', challengeMode: 'quick', difficulty }, K2);
        await click(host.querySelector('button[aria-label="Generate Challenge"]'));
        const ch = latest.challenge;
        expect(ch.type).not.toBe('fraction');
        for (const v of [ch.answer, ch._arrowValue, ch.roundingValue, ch.low, ch.high]) {
          if (v == null) continue;
          expect(v, JSON.stringify(ch)).toBeGreaterThanOrEqual(0);
          expect(v, JSON.stringify(ch)).toBeLessThanOrEqual(20);
        }
        expect(latest.range.min).toBeGreaterThanOrEqual(0);
        expect(latest.range.max).toBeLessThanOrEqual(20);
        if (ch.type === 'between') expect(ch.high - ch.low).toBeGreaterThanOrEqual(2); // a whole number is always between
        await React.act(async () => root.unmount());
        root = ReactDOMClient.createRoot(host);
      }
    });
  }

  it('Explore offers only the K-2 presets; a 3rd grader still has all of them', async () => {
    const presets = () => [...host.querySelectorAll('[aria-label="Range presets"] button')].map((b) => b.textContent);
    await mount({ tab: 'explore' }, K2);
    expect(presets()).toEqual(['0 to 10', '0 to 20']);
    await React.act(async () => root.unmount());
    root = ReactDOMClient.createRoot(host);
    await mount({ tab: 'explore' }, THIRD);
    expect(presets()).toContain('0 to 1000');
  });

  it('Explore: a typed range past 20 is refused, says why, and the box goes back on blur', async () => {
    await mount({ tab: 'explore', range: { min: 0, max: 20 } }, K2);
    const box = host.querySelector('input[aria-label="Maximum value"]');
    await type(box, '1000');
    expect(latest.range).toEqual({ min: 0, max: 20 });
    expect(host.querySelector('#numberline-range-error').textContent).toBe('Use numbers from 0 to 20 on this line.');
    await blur(host.querySelector('input[aria-label="Maximum value"]'));
    expect(host.querySelector('input[aria-label="Maximum value"]').value).toBe('20');
    await type(host.querySelector('input[aria-label="Maximum value"]'), '15');
    expect(latest.range).toEqual({ min: 0, max: 15 });
  });

  it('Explore: a saved wider range opens clamped, drawn and in the boxes', async () => {
    await mount({ tab: 'explore', range: { min: -20, max: 1000 } }, K2);
    expect(host.querySelector('input[aria-label="Minimum value"]').value).toBe('0');
    expect(host.querySelector('input[aria-label="Maximum value"]').value).toBe('20');
    const labels = [...host.querySelectorAll('#numberline-panel-explore svg[role="slider"] text')].map((t) => Number(t.textContent)).filter(Number.isFinite);
    expect(Math.max(...labels)).toBe(20);
  });

  it('Skip Count: the hop sizes stop at 10, and every hop lands inside 0-20', async () => {
    await mount({ tab: 'skipcount' }, K2);
    const sizes = [...host.querySelectorAll('[data-skip-activity] button')].map((b) => b.textContent).filter((x) => /^\d+$/.test(x));
    expect(sizes).toEqual(['2', '3', '5', '10']);
    await click(btn('10'));
    const landings = () => [...host.querySelectorAll('[data-skip-activity] svg text')].map((t) => Number(t.textContent)).filter(Number.isFinite);
    expect(Math.max(...landings())).toBeLessThanOrEqual(20);
    expect(host.querySelector('input[aria-label="Number of hops"]').value).toBe('2');
  });

  it('Skip Count: hostile or old saved values can not push a landing past 20 or below 0', async () => {
    for (const seed of [{ skipFrom: 1000, skipBy: 100, skipCount: 20 }, { skipFrom: -1000, skipBy: 7, skipCount: 20, skipDirection: 'backward' }, { skipFrom: 20, skipBy: 3, skipCount: 9 }, { skipFrom: 0, skipBy: 5, skipCount: 20, skipDirection: 'backward' }]) {
      await mount({ tab: 'skipcount', ...seed }, K2);
      const labels = [...host.querySelectorAll('[data-skip-activity] svg text')].map((t) => Number(t.textContent)).filter(Number.isFinite);
      expect(labels.length, JSON.stringify(seed)).toBeGreaterThan(0);
      expect(Math.max(...labels), JSON.stringify(seed)).toBeLessThanOrEqual(20);
      expect(Math.min(...labels), JSON.stringify(seed)).toBeGreaterThanOrEqual(0);
      await React.act(async () => root.unmount());
      root = ReactDOMClient.createRoot(host);
    }
  });

  it('a 3rd grader keeps the older Skip Count and Quick ranges', async () => {
    await mount({ tab: 'skipcount', skipBy: 100, skipCount: 20 }, THIRD);
    expect(host.querySelector('input[aria-label="Skip By"]').value).toBe('100');
    expect(host.querySelector('input[aria-label="Number of hops"]').value).toBe('20');
  });
});

describe('the landmark path step snaps on release', () => {
  const FIFTH = { gradeBand: 'g35', gradeLevel: '5th Grade' };
  const snapBox = () => [...host.querySelectorAll('label')].find((l) => /Snap to the nearest/.test(l.textContent)).querySelector('input');

  it('on while the step is open: the box says so', async () => {
    await mount({ tab: 'fracdec', fdValue: 0.5, fdDen: 4 }, FIFTH);
    expect(snapBox().checked).toBe(true);
  });
  it('off once 3 landmarks are found: free placement again', async () => {
    await mount({ tab: 'fracdec', fdValue: 0.5, fdDen: 4, fdLandmarksFound: { '1/4': true, '1/2': true, '3/4': true } }, FIFTH);
    expect(snapBox().checked).toBe(false);
  });
  it('off for a band whose path has no landmark step', async () => {
    await mount({ tab: 'fracdec', fdValue: 0.5, fdDen: 4 }, { gradeBand: 'g68', gradeLevel: '7th Grade' });
    expect(snapBox().checked).toBe(false);
  });
  it('the student can turn it off, and that choice holds', async () => {
    await mount({ tab: 'fracdec', fdValue: 0.5, fdDen: 4 }, FIFTH);
    await click(snapBox());
    expect(latest.fdSnap).toBe(false);
    expect(snapBox().checked).toBe(false);
  });
});
