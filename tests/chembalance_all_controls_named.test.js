// Every form control in every chemBalance subtool must have an accessible name.
//
// WHY THIS FILE EXISTS
// chembalance_form_labels_a11y already counts control DECLARATIONS in source as a ratchet
// (17 -> 29 across this work). That catches a control arriving, but it verifies the names
// of only four subtools - glossary, kinetics, nuclear and redox - out of 39. A control
// added to any of the other 35 is counted and never checked.
//
// The twin of this file for molecule (molecule_all_controls_named) failed on its first
// run and found five real defects: sliders that announced their name but never their
// value. chemBalance is clean on every check here today; this keeps it that way.
//
// Names are computed the way a screen reader would resolve them - aria-label first, then
// the associated <label> - not by asserting an attribute exists. Those are different
// things: a visible <label htmlFor> names a control perfectly well with no aria-label,
// and an aria-label="" passes an existence check while silencing the control.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const CHEMBALANCE = 'stem_lab/stem_tool_chembalance.js';

// Subtool ids read from source, so a newly added section is covered the day it
// lands rather than silently opting out.
function subtoolIds(source) {
  return [...new Set(
    [...source.matchAll(/subtool === '([a-z_]+)'/g)].map((m) => m[1])
  )].sort();
}

function render(subtool) {
  const el = document.createElement('div');
  el.innerHTML = renderTool('chemBalance', {
    chemBalance: { subtool, _everPicked: true },
  });
  return el;
}

function accessibleName(control) {
  const aria = (control.getAttribute('aria-label') || '').trim();
  if (aria) return aria;
  return [...(control.labels || [])]
    .map((label) => label.textContent || '')
    .join(' ')
    .trim();
}

describe('chemBalance — every control in every subtool is named', () => {
  let ids;

  beforeAll(() => {
    window.localStorage.clear();
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
    ids = subtoolIds(readFileSync(CHEMBALANCE, 'utf8'));
  });

  it('finds the full subtool catalog', () => {
    // If this collapses, every per-subtool assertion below passes vacuously.
    expect(ids.length).toBeGreaterThanOrEqual(35);
    for (const known of ['balance', 'kinetics', 'nuclear', 'solutions', 'redox', 'thermo']) {
      expect(ids).toContain(known);
    }
  });

  it('no input, select or textarea is left unnamed', () => {
    const unnamed = [];
    for (const id of ids) {
      for (const control of render(id).querySelectorAll('input, select, textarea')) {
        if (!accessibleName(control)) {
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

  it('every id a label points at actually exists in that subtool', () => {
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

  it('no two elements in one subtool share an id', () => {
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

  it('every SVG marked role="img" carries a description', () => {
    // chembalance_svg_alternatives_a11y checks this by scanning source LINES, so
    // it only sees declarations where role and aria-label sit on the same line.
    // Rendering catches the ones that do not.
    const undescribed = [];
    for (const id of ids) {
      for (const svg of render(id).querySelectorAll('svg[role="img"]')) {
        if (!(svg.getAttribute('aria-label') || '').trim()) {
          undescribed.push(`${id}: <svg role="img"> with no aria-label`);
        }
      }
    }
    expect(undescribed).toEqual([]);
  });

  it('no data-testid is used twice in the same subtool', () => {
    // A duplicated testid makes every test that queries it read the FIRST match,
    // so a later panel can be silently untested while appearing covered.
    const dupes = [];
    for (const id of ids) {
      const seen = new Map();
      for (const node of render(id).querySelectorAll('[data-testid]')) {
        const key = node.getAttribute('data-testid');
        seen.set(key, (seen.get(key) || 0) + 1);
      }
      for (const [key, count] of seen) {
        if (count > 1) dupes.push(`${id}: data-testid "${key}" used ${count} times`);
      }
    }
    expect(dupes).toEqual([]);
  });
});
