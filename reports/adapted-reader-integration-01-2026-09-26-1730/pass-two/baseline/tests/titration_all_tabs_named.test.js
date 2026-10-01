// Every form control in every Titration Lab tab must have an accessible name.
//
// WHY THIS FILE EXISTS
// Titration Lab has 36 suites, more than any other chemistry tool, and they cover the
// tabs well individually. What none of them does is sweep ALL SIX tabs with one set of
// accessibility invariants - so a control added to a tab whose suite does not happen to
// check names is counted by nobody.
//
// The blind spot is structural, and bigger here than in the other two tools. Titration
// opens on a SAFETY CHECKLIST (`if (!safetyChecked)` returns early in
// stem_tool_titration.js), so dev-tools/check_stem_render.cjs and the render goldens -
// which both build the DEFAULT state - never reach a single one of the six tab bodies.
// 8071 lines of tool render behind a gate no automated check passes through.
//
// The twin of this file for molecule found five sliders that announced their name and
// never their value. That is the class of defect being hunted: things that look right in
// source and only appear when you render the page a student actually sees.
//
// Names are computed the way a screen reader resolves them - aria-label, then
// aria-labelledby, then the associated <label> - not by asserting an attribute exists.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const TITRATION = 'stem_lab/stem_tool_titration.js';

// Tab ids read FROM SOURCE, so a newly added tab is covered the day it lands
// rather than silently opting out of every check below.
function tabIds(source) {
  const m = source.match(/var _TITR_TABS = \[([^\]]+)\]/);
  if (!m) return [];
  return [...m[1].matchAll(/'([a-z]+)'/g)].map((x) => x[1]);
}

// safetyChecked:true is the whole point - it is what gets past the gate that
// hides every tab body from the render gate and the goldens.
function render(labTab, extra = {}) {
  const el = document.createElement('div');
  el.innerHTML = renderTool('titrationLab', {
    titrationLab: { safetyChecked: true, labTab, ...extra },
  });
  return el;
}

function accessibleName(control, root) {
  const aria = (control.getAttribute('aria-label') || '').trim();
  if (aria) return aria;
  const by = (control.getAttribute('aria-labelledby') || '').trim();
  if (by) {
    const text = by.split(/\s+/)
      .map((id) => {
        const node = [...root.querySelectorAll('[id]')]
          .find((n) => n.getAttribute('id') === id);
        return node ? node.textContent : '';
      })
      .join(' ')
      .trim();
    if (text) return text;
  }
  return [...(control.labels || [])]
    .map((label) => label.textContent || '')
    .join(' ')
    .trim();
}

describe('Titration Lab — every control in every tab is named', () => {
  let ids;

  beforeAll(() => {
    window.localStorage.clear();
    resetStemLab();
    loadTool(TITRATION, 'titrationLab');
    ids = tabIds(readFileSync(TITRATION, 'utf8'));
  });

  it('finds the full tab catalog', () => {
    // If this collapses, every per-tab assertion below passes vacuously.
    expect(ids.length).toBe(6);
    for (const known of ['titrate', 'challenge', 'incidents', 'equipment', 'molarity', 'buffers']) {
      expect(ids).toContain(known);
    }
  });

  it('gets past the safety gate, so the tabs are really being rendered', () => {
    // Guards the premise of this entire file. The default state returns the
    // checklist early; if safetyChecked stopped working, every sweep below
    // would be measuring the same checklist six times and passing.
    const gated = document.createElement('div');
    gated.innerHTML = renderTool('titrationLab', { titrationLab: {} });
    const gatedText = gated.textContent;

    for (const id of ids) {
      const text = render(id).textContent;
      expect(text.length, `${id} rendered nothing`).toBeGreaterThan(400);
      expect(text, `${id} is still showing the safety checklist`).not.toBe(gatedText);
    }
  });

  it('no input, select or textarea is left unnamed', () => {
    const unnamed = [];
    for (const id of ids) {
      const el = render(id);
      for (const control of el.querySelectorAll('input, select, textarea')) {
        if (!accessibleName(control, el)) {
          unnamed.push(
            `${id}: <${control.tagName.toLowerCase()} type="${control.type || '-'}" id="${control.id || '(none)'}">`
          );
        }
      }
    }
    expect(unnamed).toEqual([]);
  });

  it('every range input also speaks its VALUE', () => {
    // The molecule twin of this check found five sliders that announced their
    // name and never their setting: a screen-reader user heard "Activation
    // energy" and never learned it was 75 kJ/mol.
    const silent = [];
    for (const id of ids) {
      for (const slider of render(id).querySelectorAll('input[type="range"]')) {
        if (!(slider.getAttribute('aria-valuetext') || '').trim()) {
          silent.push(`${id}: #${slider.id || '(none)'} has no aria-valuetext`);
        }
      }
    }
    expect(silent).toEqual([]);
  });

  it('the buffers sliders read out the value a sighted student sees', () => {
    // An existence check on aria-valuetext is not the same as a sensible
    // reading - "5" and "5.00" and "[object Object]" all pass it. These two
    // sliders are where this file found its defect, so pin what they SAY.
    //
    // The visible label splits name from reading ("Acid strength (pKa):" then a
    // styled span holding "5.00"), which is exactly why aria-label alone left a
    // screen-reader user with the name and no setting.
    const el = render('buffers');
    const read = (id) => {
      const node = [...el.querySelectorAll('input[type="range"]')]
        .find((n) => n.getAttribute('id') === id);
      return node ? node.getAttribute('aria-valuetext') : null;
    };
    // Default buffer is Ka = 1e-5, ratio 1.0 - so pKa reads 5.00.
    expect(read('bf-ka')).toBe('5.00');
    // A bare "1.00" is not a ratio out loud; ':1' is notation, not prose.
    expect(read('bf-ratio')).toBe('1.00:1');

    // And the reading tracks the control rather than being a fixed string.
    const moved = render('buffers', { buffers: { ka: 1e-9, ratio: 4 } });
    const movedRead = (id) => [...moved.querySelectorAll('input[type="range"]')]
      .find((n) => n.getAttribute('id') === id).getAttribute('aria-valuetext');
    expect(movedRead('bf-ka')).toBe('9.00');
    expect(movedRead('bf-ratio')).toBe('4.00:1');
  });

  it('every select offers real options', () => {
    // An empty select is a dead control that still passes a name check.
    const empty = [];
    for (const id of ids) {
      for (const select of render(id).querySelectorAll('select')) {
        if (select.querySelectorAll('option').length === 0) {
          empty.push(`${id}: #${select.id || '(none)'} has no options`);
        }
      }
    }
    expect(empty).toEqual([]);
  });

  it('no control carries an EMPTY aria-label', () => {
    // aria-label="" is worse than no aria-label: it suppresses the visible
    // <label> a browser would otherwise fall back to, so the control goes silent.
    const emptied = [];
    for (const id of ids) {
      for (const control of render(id).querySelectorAll('input, select, textarea')) {
        if (control.hasAttribute('aria-label')
          && !(control.getAttribute('aria-label') || '').trim()) {
          emptied.push(`${id}: #${control.id || '(none)'} has aria-label=""`);
        }
      }
    }
    expect(emptied).toEqual([]);
  });

  it('every id a label points at actually exists in that tab', () => {
    // A <label htmlFor="x"> aimed at nothing names nothing, and it reads as
    // correct in source. Only rendering catches it.
    const dangling = [];
    for (const id of ids) {
      const el = render(id);
      // Walk [id] into a Set rather than querySelector('#id'): CSS.escape is not
      // available in this jsdom, and an id with a dot or colon would break a raw
      // selector anyway.
      const present = new Set(
        [...el.querySelectorAll('[id]')].map((n) => n.getAttribute('id'))
      );
      for (const label of el.querySelectorAll('label[for]')) {
        const target = label.getAttribute('for');
        if (!present.has(target)) {
          dangling.push(`${id}: <label for="${target}"> points at nothing`);
        }
      }
    }
    expect(dangling).toEqual([]);
  });

  it('every aria-labelledby points at an element that exists', () => {
    // Titration names several panels this way. A dangling reference leaves the
    // region unnamed, and unlike a missing attribute it looks handled.
    const dangling = [];
    for (const id of ids) {
      const el = render(id);
      const present = new Set(
        [...el.querySelectorAll('[id]')].map((n) => n.getAttribute('id'))
      );
      for (const node of el.querySelectorAll('[aria-labelledby]')) {
        for (const target of node.getAttribute('aria-labelledby').trim().split(/\s+/)) {
          if (!present.has(target)) {
            dangling.push(`${id}: aria-labelledby="${target}" points at nothing`);
          }
        }
      }
    }
    expect(dangling).toEqual([]);
  });

  it('no two elements in one tab share an id', () => {
    // Duplicate ids break label association silently: the browser binds the
    // label to whichever came first and the other control goes unnamed.
    const clashes = [];
    for (const id of ids) {
      const seen = new Map();
      for (const node of render(id).querySelectorAll('[id]')) {
        const key = node.getAttribute('id');
        seen.set(key, (seen.get(key) || 0) + 1);
      }
      for (const [key, count] of seen) {
        if (count > 1) clashes.push(`${id}: id "${key}" used ${count} times`);
      }
    }
    expect(clashes).toEqual([]);
  });

  it('every button has a name a screen reader can announce', () => {
    // An icon-only button with no aria-label is announced as "button" and
    // nothing else. Titration is dense with emoji controls, which is exactly
    // where this goes wrong.
    const unnamed = [];
    for (const id of ids) {
      for (const button of render(id).querySelectorAll('button')) {
        const name = (button.getAttribute('aria-label') || '').trim()
          || (button.textContent || '').trim();
        if (!name) unnamed.push(`${id}: <button id="${button.id || '(none)'}"> has no name`);
      }
    }
    expect(unnamed).toEqual([]);
  });

  it('every SVG marked role="img" carries a description', () => {
    // Titration is the most graphical chemistry tool - burette, flask, curve.
    // An undescribed role="img" is a hole where the whole point of the tab is.
    const undescribed = [];
    for (const id of ids) {
      for (const svg of render(id).querySelectorAll('svg[role="img"]')) {
        if (!(svg.getAttribute('aria-label') || '').trim()
          && !(svg.getAttribute('aria-labelledby') || '').trim()) {
          undescribed.push(`${id}: <svg role="img"> with no description`);
        }
      }
    }
    expect(undescribed).toEqual([]);
  });

  it('tables carry real header cells', () => {
    // A table with no <th> is an unlabelled grid to a screen reader.
    const bad = [];
    for (const id of ids) {
      for (const table of render(id).querySelectorAll('table')) {
        if (table.querySelectorAll('th').length === 0) {
          bad.push(`${id}: a <table> with no <th>`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('no tab leaks a formatting failure to the student', () => {
    // A bare substring search false-positives on real chemistry - "NaN" matches
    // inside NaCl and NaNO3 - so match the FORMATTING failure: a standalone
    // token beside a delimiter or unit.
    const patterns = [
      [/(^|[\s>(:,=])NaN([\s<),;%]|$)/, 'NaN'],
      [/(^|[\s>(:,=])undefined([\s<),;%]|$)/, 'undefined'],
      [/\[object Object\]/, '[object Object]'],
    ];
    const dirty = [];
    for (const id of ids) {
      const text = render(id).textContent;
      for (const [re, label] of patterns) {
        if (re.test(text)) dirty.push(`${id}: renders "${label}"`);
      }
    }
    expect(dirty).toEqual([]);
  });

  it('the selected tab is the one marked aria-selected', () => {
    // The tablist drives which body renders. If the visual state and the ARIA
    // state disagree, a screen reader user is told they are somewhere they are
    // not - and every other assertion here would still pass.
    for (const id of ids) {
      const el = render(id);
      const selected = [...el.querySelectorAll('[role="tab"]')]
        .filter((t) => t.getAttribute('aria-selected') === 'true');
      expect(selected.length, `${id}: expected exactly one selected tab`).toBe(1);
      expect(selected[0].id, `${id}: wrong tab marked selected`).toBe('titration-tab-' + id);
    }
  });
});
