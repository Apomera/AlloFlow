// @vitest-environment jsdom
// The fast accessibility checks for AlloFlow Packets (2026-11-12): what dev-tools/check_packets_a11y.cjs found and
// what was fixed, held at the jsdom level so it does not come back. The full check (a real browser, axe-core, Tab
// walks, reflow, reduced motion, dark mode) is heavy and not part of this run: npm run check:packets-a11y.
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (f) => readFileSync(f, 'utf8');
delete window.AlloWordSoundsTakeHome;
new Function(read('word_sounds_take_home_loader.js'))();
const TH = window.AlloWordSoundsTakeHome;
const PC = require('../packet_check_builder.js');
const MP = require('../packet_math_practice_builder.js');
const BANK = JSON.parse(read('psychometric_math_probes.json').replace(/^﻿/, ''));

const FILES = {
  check: PC.buildCheckPacket({ lesson: PC.lessonFromMathForm({ bank: BANK, measure: 'quantity_discrimination', grade: 'K', form: 'A' }), loader: TH }).html,
  facts: MP.buildMathPracticePacket({ lesson: MP.lessonFromMathPractice({ loader: TH, mode: 'ccc', factSet: 'mul-7' }), loader: TH }).html,
};
const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });
const open = (html) => {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html', beforeParse(w) {
    w.Audio = class { play() { return Promise.resolve(); } pause() {} };
  } });
  opened.push(dom.window);
  return dom.window.document;
};
const styleOf = (html) => /<style>([\s\S]*?)<\/style>/.exec(html)[1];
// The tab stops of a document in Tab order (positive tabindex first, then document order), as a browser walks them.
const stops = (d) => [...d.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]')]
  .filter((n) => !n.closest('[hidden]') && !n.disabled && n.getAttribute('tabindex') !== '-1');

describe('in a file: the reading tools come right after the screen heading', () => {
  // Known issue (2026-11-12): "Aa" sat before the heading the file moves the focus to on every screen, so a keyboard
  // user reached it only with Shift+Tab.
  for (const [name, html] of Object.entries(FILES)) {
    it(name + ': on the first screen and on the next one, Tab from the heading reaches "Aa" first', () => {
      const d = open(html);
      const check = () => {
        const h = d.querySelector('#app > h2[tabindex="-1"]');
        // The file puts the focus on the heading, or on the first thing to do (cover, copy, compare): never before the tools.
        expect(d.activeElement === h || !!(h.compareDocumentPosition(d.activeElement) & 4)).toBe(true);
        expect(h.nextElementSibling.className).toBe('lt-bar');
        expect(h.nextElementSibling.nextElementSibling.id).toBe('lt-panel');
        const order = stops(d);
        expect(order[0].hasAttribute('data-tools-open')).toBe(true);
        // Everything that can take the focus comes after the heading.
        expect(order.every((n) => h.compareDocumentPosition(n) & 4)).toBe(true);
      };
      check();
      d.getElementById('learner-name').value = 'Ana';
      d.querySelector('#app button.primary').click();
      check();
      // The panel opens right under the button and keeps its place when the screen changes.
      d.querySelector('[data-tools-open]').click();
      expect(d.getElementById('lt-panel').hidden).toBe(false);
      expect(stops(d)[1].getAttribute('data-tool')).toBe('size-0');
    });
  }
});

describe('in a file: a pressed button still shows where the focus is', () => {
  it('a pressed button has an outline of its own, and the focus ring is a different color and place', () => {
    const css = styleOf(FILES.check);
    expect(css).toContain('button[aria-pressed=true]{outline:3px solid var(--accent);outline-offset:2px}');
    expect(css).toContain('button[aria-pressed=true]:focus-visible{outline-color:var(--focus);outline-offset:4px}');
  });
});

describe('in a file: feedback is said by a live region', () => {
  it('the practice feedback line is role=status, there from the start of the item, so a screen reader hears it', () => {
    const d = open(FILES.check);
    d.getElementById('learner-name').value = 'Ana';
    d.querySelector('#app button.primary').click();
    const line = d.querySelector('#app .status');
    expect(line.getAttribute('role')).toBe('status');
    expect(line.textContent).toBe('');
    expect(d.getElementById('live').getAttribute('aria-live')).toBe('polite');
  });
});

describe('in a check: the teacher answers table can be scrolled with the keyboard', () => {
  it('the box that scrolls the table sideways on a phone takes the focus and has a name (axe scrollable-region-focusable)', () => {
    const html = PC.buildCheckPacket({ lesson: PC.lessonFromMathForm({ bank: BANK, measure: 'math_computation', grade: '3', form: 'A' }), loader: TH, teacherCode: 'tulip-47' }).html;
    expect(html).toContain("el('div', { class: 'scroll', tabindex: '0', role: 'region', 'aria-label': L.check_review_title }, [el('table', { class: 'review' }, [");
    expect(styleOf(html)).toContain('.scroll{overflow-x:auto}');
  });
});
