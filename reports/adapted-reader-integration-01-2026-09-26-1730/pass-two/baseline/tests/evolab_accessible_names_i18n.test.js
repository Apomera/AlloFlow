// EvoLab's accessible names must be translatable, and must actually render.
//
// Background (2026-09-15): every VISIBLE string in the STEM tools is routed through
// t()/__alloT, but accessible names were not. A suite-wide AST scan found 7,253
// hardcoded English literals inside aria-label / aria-valuetext / title / alt across
// 123 of 149 tools. EvoLab owned 25 of them. For a screen-reader user reading in
// Spanish the interface translated and the simulations did not — and for a canvas or
// a chart the aria-label is the ONLY description that exists.
//
// Two traps this file guards, both of which were live bugs while fixing that:
//   1. Wrapping a label in __alloFill without passing every placeholder leaves a
//      literal "{value1}" in what the screen reader speaks. Rendering is the only
//      way to see it; the source looks fine.
//   2. A ternary can have one branch translated and the other not. The mate-choice
//      bird label was exactly that — the untranslated half was the clickable one.
//
// The suite-wide ratchet lives in dev-tools/check_stem_aria_i18n.cjs; this file pins
// EvoLab specifically at zero so the tool cannot regress quietly.
import { describe, expect, it, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = 'stem_lab/stem_tool_evolab.js';

const VIEWS = ['menu', 'predatorVision', 'mateChoice', 'climatePressure', 'selectionSandbox',
  'beakLab', 'speciation', 'phyloBuilder', 'hardyWeinberg', 'geneticDrift', 'commonAncestry',
  'antibioticLab', 'coevolution', 'discoveryTimeline', 'misconceptions', 'selectionSleuth',
  'homologySleuth', 'capstone', 'termSprint', 'classSnapshot', 'journal', 'pressureHunt'];

const ATTRS = ['aria-label', 'aria-valuetext', 'aria-description', 'aria-roledescription', 'title', 'alt'];

beforeEach(() => { resetStemLab(); localStorage.clear(); loadTool(TOOL, 'evoLab'); });

function accessibleNames(toolData) {
  const html = renderTool('evoLab', toolData);
  const doc = new DOMParser().parseFromString('<div id="r">' + html + '</div>', 'text/html');
  const out = [];
  for (const el of doc.querySelectorAll('[' + ATTRS.join('],[') + ']')) {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v) out.push({ attr: a, text: v });
    }
  }
  return out;
}

describe('EvoLab accessible names are translatable', () => {
  it('no aria/title string literal sits outside a translation call', () => {
    // Reuses the suite gate's AST walk rather than reimplementing it. A first attempt
    // here DID reimplement it with a regex and immediately reported CSS class names as
    // untranslated prose, because the pattern ran past the attribute into the next
    // property. That is the same failure mode the gate's own header warns about.
    const { scan } = require('../dev-tools/check_stem_aria_i18n.cjs');
    const hits = scan(fs.readFileSync(path.resolve(TOOL), 'utf8'));
    expect(hits.map((hh) => hh.line + ' [' + hh.attr + '] ' + JSON.stringify(hh.text))).toEqual([]);
  });

  it('every rendered accessible name is free of unresolved placeholders', () => {
    // __alloFill leaves "{value1}" in place when a key is missing from the values
    // object. That is invisible in source review and is what the student HEARS.
    const leaks = [];
    for (const view of VIEWS) {
      for (const { attr, text } of accessibleNames({ evoLab: { view } })) {
        if (/\{value\d+\}/.test(text)) leaks.push(view + ' [' + attr + '] ' + text);
      }
    }
    expect(leaks).toEqual([]);
  });

  it('conditional branches of accessible names also resolve', () => {
    // The states that only appear once a student has done something: completed
    // modules, a chosen mate, placed organisms, answered quiz items.
    const progress = {
      completed: { beakLab: true, geneticDrift: true }, experiments: { speciation: 3 },
      predictions: {}, checks: {}, challenges: {}, records: {}, notes: {}, exitTickets: {}
    };
    const states = [
      { view: 'menu', evoProgress: progress },
      { view: 'discoveryTimeline' },
      { view: 'misconceptions', misconAnswers: { 0: 1, 1: 0, 2: 2 } },
      { view: 'phyloBuilder' },
      { view: 'mateChoice' },
      { view: 'climatePressure' },
      { view: 'antibioticLab' },
      { view: 'commonAncestry' }
    ];
    const leaks = [];
    for (const st of states) {
      for (const { attr, text } of accessibleNames({ evoLab: st })) {
        if (/\{value\d+\}/.test(text)) leaks.push(st.view + ' [' + attr + '] ' + text);
      }
    }
    expect(leaks).toEqual([]);
  });

  it('module cards still announce their completion state', () => {
    // Guards against a "fix" that drops the suffix entirely instead of translating it:
    // a completed module must still be distinguishable by ear from an untouched one.
    const progress = {
      completed: { beakLab: true }, experiments: {}, predictions: {}, checks: {},
      challenges: {}, records: {}, notes: {}, exitTickets: {}
    };
    const names = accessibleNames({ evoLab: { view: 'menu', evoProgress: progress } }).map((n) => n.text);
    const completed = names.filter((n) => /completed/i.test(n));
    expect(completed.length).toBeGreaterThan(0);
    // And the module's own title is still part of the name, not replaced by it.
    expect(completed.some((n) => /beak/i.test(n))).toBe(true);
  });

  it('the climate slider speaks a value, not a bare number', () => {
    // aria-valuetext REPLACES the number a screen reader would announce, so if it
    // renders empty or as a placeholder the readout is worse than having none.
    const vt = accessibleNames({ evoLab: { view: 'climatePressure' } })
      .filter((n) => n.attr === 'aria-valuetext').map((n) => n.text);
    expect(vt.length).toBeGreaterThan(0);
    for (const v of vt) {
      expect(v).not.toMatch(/\{value/);
      expect(v.trim().length).toBeGreaterThan(3);
    }
  });

  it('canvas figures carry a populated description', () => {
    // Each simulation canvas is role="img" and its aria-label is the only account of
    // what is on screen. An empty or placeholder one is a silent failure.
    const canvasViews = ['selectionSandbox', 'antibioticLab', 'speciation', 'coevolution', 'climatePressure', 'predatorVision'];
    for (const view of canvasViews) {
      const html = renderTool('evoLab', { evoLab: { view } });
      const doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
      const canvases = [...doc.querySelectorAll('canvas')];
      expect(canvases.length, view + ' should render a canvas').toBeGreaterThan(0);
      for (const c of canvases) {
        const label = c.getAttribute('aria-label') || '';
        expect(label.length, view + ' canvas needs a description').toBeGreaterThan(10);
        expect(label).not.toMatch(/\{value/);
      }
    }
  });
});
