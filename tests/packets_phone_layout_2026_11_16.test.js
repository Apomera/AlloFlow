// @vitest-environment jsdom
// The student file on a phone, and three small engine fixes (2026-11-16).
// Measured in a real browser before the change (C:\tmp\overnight_1116\phone\): at 390 x 844 the question card
// started 290 px down and two of Blend Sounds' six choices were off the screen; at 360 x 640 none of the six fitted
// and a check's Next key was off the screen. After: the card starts at 154 px and all six fit at 390 x 844.
// jsdom has no layout, so these tests hold the rules and the markers the layout depends on, not the pixels.
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
const BANK = JSON.parse(read('psychometric_math_probes.json').replace(/^\uFEFF/, ''));
const CHECK = PC.buildCheckPacket({ lesson: PC.lessonFromMathForm({ bank: BANK, measure: 'quantity_discrimination', grade: 'K', form: 'A' }), loader: TH }).html;

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
// The rules inside every "@media (max-width:480px){...}" block of the file's style sheet.
// A line of the sheet that is one phone-only block: narrow screens, or narrow and short ones.
const isPhoneLine = (line) => line.startsWith('@media (max-width:480px){') || line.startsWith('@media (max-width:480px) and (max-height:700px){');
const phoneRules = (css) => css.split('\n').filter((line) => line.indexOf('@media (max-width:480px){') === 0).map((line) => line.slice('@media (max-width:480px){'.length, -1)).join('');

describe('the student file on a phone', () => {
  const phone = phoneRules(styleOf(CHECK));

  it('the style sheet keeps its braces balanced, and every phone rule is inside a phone block', () => {
    const css = styleOf(CHECK);
    const lines = css.split(/\r?\n/);
    // Each line of the sheet is whole: a rule that lost its "@media" opener leaves a stray brace (this happened once).
    for (const line of lines) expect(line.split('{').length, line.slice(0, 80)).toBe(line.split('}').length);
    for (const line of lines) if (line.includes('data-step') || line.includes(':has(>.choice:nth-child(4))')) expect(isPhoneLine(line), line.slice(0, 80)).toBe(true);
  });

  it('while a screen shows its own heading, the title is one small line and the tools button sits beside the heading', () => {
    expect(phone).toContain('[data-step] h1{font-size:1rem;margin:0 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}');
    expect(phone).toContain('[data-step] #app>h2:first-child{display:flex;align-items:center;min-height:48px;margin:0 0 8px;padding-inline-end:64px}');
    expect(phone).toContain('[data-step] .lt-bar{margin:-56px 0 8px}');
    // Only on phones: outside the phone blocks nothing is keyed on data-step.
    const rest = styleOf(CHECK).split(/\r?\n/).filter((line) => !isPhoneLine(line)).join(' ');
    expect(rest).not.toContain('data-step');
  });

  it('a check on a short phone screen: smaller spaces, keys still 48 px tall', () => {
    // Measured at 360 x 640: the Next key of a timed Missing Number check ended at 688 px (48 below the screen); now 623.
    const css = styleOf(CHECK);
    expect(css).toContain('@media (max-width:480px) and (max-height:700px){.prompt{font-size:2.2rem;margin:4px 0 10px}.answer{font-size:1.6rem;padding:4px 12px}.pad{gap:8px;margin-top:10px}.pad button{min-height:48px}.timer{margin-bottom:8px}[data-step] .card{margin-top:8px}}');
    // Everywhere else the keys keep their 56 px.
    expect(css).toContain('.pad button{min-height:56px;font-size:1.5rem;font-weight:700;padding:6px}');
  });

  it('four or more sound choices go two across; a list that sets its own columns is left alone', () => {
    expect(phone).toContain('.choices:not([style]):has(>.choice:nth-child(4)){grid-template-columns:1fr 1fr;gap:10px}');
    expect(phone).toContain('.choices:not([style]):has(>.choice:nth-child(4))>.choice:not([style]){flex-direction:column;padding:8px}');
    // The meaning lists of a vocabulary file carry their own columns (in shared takeHomeVocab), so long sentences never go two across.
    const loader = read('word_sounds_take_home_loader.js');
    expect(loader).toContain("class: 'choices', style: pictured ? 'grid-template-columns:repeat(2,minmax(0,1fr))' : 'grid-template-columns:1fr'");
  });

  it('the start screen keeps the full title; a screen with its own heading is marked for the phone rules', () => {
    const d = open(CHECK);
    expect(d.body.hasAttribute('data-step')).toBe(false);
    expect(d.querySelector('#app > h2').className).toBe('sr');
    d.getElementById('learner-name').value = 'Ana';
    d.querySelector('#app button.primary').click();
    expect(d.querySelector('#app > h2').className).not.toBe('sr');
    expect(d.body.hasAttribute('data-step')).toBe(true);
    // The title is still the whole title for a screen reader: the rule only clips how it is painted.
    expect(d.querySelector('main > h1').textContent).toBe(d.title);
    expect(d.title).toMatch(/^Quantity Discrimination, /);
  });
});

describe('Reading tools: a Close at the top of the panel', () => {
  it('is the first button of the panel, says Close, closes it and gives the focus back to the Aa button', () => {
    const d = open(CHECK);
    const aa = d.querySelector('[data-tools-open]');
    aa.click();
    const panel = d.getElementById('lt-panel');
    expect(panel.hidden).toBe(false);
    const top = panel.querySelector('button');
    expect(top.hasAttribute('data-tools-close-top')).toBe(true);
    expect(top.textContent).toBe(TH.DEFAULT_LABELS.tools_close);
    expect(top.parentNode.className).toBe('lt-top');
    expect(top.parentNode.firstChild.id).toBe('lt-title');
    top.click();
    expect(panel.hidden).toBe(true);
    expect(d.activeElement).toBe(aa);
    // 2026-11-19: duplicate bottom Close button removed; top Close remains the single close button in the panel.
    expect(panel.querySelectorAll('[data-tools-close]')).toHaveLength(0);
  });
});

describe('results file names keep the version letter', () => {
  it('an automatic title of 45 characters is not cut before "version A"', () => {
    const name = (title) => TH.resultsCsv({ lessonTitle: title, learner: 'BlueHeron7', finishedLocal: '2026-11-16T10:00:00', items: [] }).stem;
    const a = name('Word Sounds: Kindergarten, first part, version A');
    const b = name('Word Sounds: Kindergarten, first part, version B');
    expect(a).toBe('Word-Sounds-Kindergarten-first-part-version-A__BlueHeron7__2026-11-16');
    expect(b).not.toBe(a);
    // A long title is still cut (at 60), and never ends in a hyphen.
    const long = name('A very long title that a teacher typed for the whole unit of the second quarter of the year');
    expect(long.split('__')[0].length).toBeLessThanOrEqual(60);
    expect(long.split('__')[0]).not.toMatch(/-$/);
    // The name part keeps its own limit.
    expect(name('T').split('__')[1]).toBe('BlueHeron7');
  });
});

describe('the teacher screen of a check says "student" and "code name"', () => {
  it('in the file, and the same English in the app copies', () => {
    expect(TH.CHECK_LABELS.check_review_attempt).toBe('Attempt {n} for this name or code name on this device.');
    expect(TH.CHECK_LABELS.check_review_note).toBe('All times come from the clock of the device the student used.');
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js', 'desktop/app-build/ui_strings.js', 'desktop/web-app/build/ui_strings.js']) {
      const text = read(file);
      expect(text, file).toContain('"take_home_player_check_review_attempt": "Attempt {n} for this name or code name on this device."');
      expect(text, file).toContain('"take_home_player_check_review_note": "All times come from the clock of the device the student used."');
    }
    for (const file of ['allo_data_source.jsx', 'allo_data_module.js']) expect(read(file), file).not.toMatch(/learner label on this device|clock of the learner device/);
  });
});

describe('vocabulary maker on a phone: the Fill the blank and picture rows keep their buttons', () => {
  // Found in a real browser at 390 px: Edit and Swap of every Fill the blank row had no size. The rule that hides a row's
  // buttons behind its Change button also matched the rows of step 3, which have no Change button.
  it('only the rows of step 2 (data-row) hide their buttons until Change is pressed', () => {
    const css = read('packets-vocab.css');
    expect(css).toContain('.v-row[data-row]:not(.is-changing) .v-tools, .v-row[data-row]:not(.is-changing) .v-meanings, .v-row[data-row]:not(.is-changing) .v-undo { display: none; }');
    expect(css).not.toContain('.v-row:not(.is-changing)');
    const page = read('packets-vocab.js');
    // data-row is set where a step 2 row is drawn, the one place that makes a Change button.
    expect(page).toContain("box.setAttribute('data-row', row.key);");
    expect(page.split("'btn-small v-change'").length - 1).toBe(1);
    for (const other of ['data-blank-row', 'data-picture-row', 'data-custom-pic-row']) expect(page, other).toContain("box.setAttribute('" + other + "', row.key);");
  });
});

describe('Save first in the check, math practice and vocabulary makers', () => {
  // Measured on a 390 x 844 phone before: Save was 1,772 to 3,362 px down the page (6,122 with picture questions).
  // After: 304 to 424 px below the top of step 3 (C:\tmp\overnight_1116\packets\save_first_probe.cjs).
  const parse = (file) => new JSDOM(read(file)).window.document;
  for (const file of ['packets-check.html', 'packets-math-practice.html', 'packets-vocab.html']) {
    it(file + ': step 3 is the file, Save, what to do next, the choices, then the list of what is in the file', () => {
      const step = parse(file).getElementById('step-3');
      const order = [...step.querySelectorAll('#making, #build-problem, #summary, #save, #after-save, #f-title, #summary-list, #batch')].map((node) => node.id);
      // 2026-11-17 (review 2.3): the title comes just before Save, so a teacher who saves at once sees it.
      expect(order).toEqual(['making', 'build-problem', 'summary', 'f-title', 'save', 'after-save', 'summary-list', 'batch']);
      // Nothing a teacher can change comes before Save: the only controls ahead of it are in its own row (and Try again).
      const controls = [...step.querySelectorAll('input, select, textarea')];
      // 2026-11-17 (review 2.3): except the title, which sits just before Save so a teacher who saves at once sees it.
      for (const control of controls.filter((c) => c.id !== 'f-title')) expect(step.querySelector('#save').compareDocumentPosition(control) & 4, control.id || control.name).toBe(4);
      expect(step.querySelector('#save').parentNode.className).toBe('actions actions-file');
      expect(step.querySelector('#back-3').parentNode).toBe(step.querySelector('#save').parentNode);
      // The list is filled by the same id as before, and is shown only while the summary is (packets.css).
      const list = step.querySelector('#summary-list');
      expect(list.querySelector('dl').id).toBe('summary-rows');
      expect(step.querySelector('#summary dl')).toBeNull();
      expect(list.parentNode).toBe(step.querySelector('#summary').parentNode);
      expect(list.querySelector('h3').textContent).toBe('What is in the file');
    });
  }
  it('the list hides with the summary, and the top row has no rule above it', () => {
    const css = read('packets.css');
    expect(css).toContain('#summary[hidden] ~ .summary-list { display: none; }');
    expect(css).toContain('.actions-file { margin-top: 1rem; padding-top: 0; border-top: 0; }');
  });
});
