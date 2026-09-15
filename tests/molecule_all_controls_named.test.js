// Every form control in every molecule section must have an accessible name.
//
// WHY THIS FILE EXISTS
// chembalance has a ratchet for this (chembalance_form_labels_a11y counts declarations in
// source and renders two subtools to check the names). Molecule had nothing equivalent:
// the eight interactive panels added across this work were each covered only by their own
// suite, and most of those assert that an `aria-label` ATTRIBUTE exists rather than that
// the control has a NAME. Those are different things - a control can be correctly named
// by a visible <label htmlFor> with no aria-label at all, and an aria-label can be present
// but empty.
//
// So this walks all 49 sections and computes the accessible name the way a screen reader
// would: aria-label first, then the associated <label> text. Nothing is unnamed today;
// this keeps it that way.
//
// It also covers the sections nobody has touched, not just the new panels - the point of
// a gate is to catch the control someone adds next year, wherever they add it.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const MOLECULE = 'stem_lab/stem_tool_molecule.js';

// Section ids read from source, so a newly added section is covered the day it
// lands instead of silently opting out.
function sectionIds(source) {
  return [...new Set(
    [...source.matchAll(/expSection === '([a-z_]+)'/g)].map((m) => m[1])
  )].sort();
}

function render(sectionId) {
  const el = document.createElement('div');
  el.innerHTML = renderTool('molecule', {
    molecule: { expSection: sectionId, referenceLibraryOpen: true },
  });
  return el;
}

// The name a screen reader would announce, in the order it would look.
function accessibleName(control) {
  const aria = (control.getAttribute('aria-label') || '').trim();
  if (aria) return aria;
  const labelled = [...(control.labels || [])]
    .map((label) => label.textContent || '')
    .join(' ')
    .trim();
  return labelled;
}

describe('Molecule — every control in every section is named', () => {
  let ids;

  beforeAll(() => {
    window.localStorage.clear();
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
    ids = sectionIds(readFileSync(MOLECULE, 'utf8'));
  });

  it('finds the full section catalog', () => {
    // If this collapses, every per-section assertion below passes vacuously.
    expect(ids.length).toBeGreaterThanOrEqual(45);
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
    // A slider that announces "Temperature" but not "25 degrees" tells a screen
    // reader user the control exists and nothing about its state. aria-valuetext
    // is what carries the reading.
    const silent = [];
    for (const id of ids) {
      for (const slider of render(id).querySelectorAll('input[type="range"]')) {
        const valuetext = (slider.getAttribute('aria-valuetext') || '').trim();
        if (!valuetext) {
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
    // <label> a browser would otherwise use, so the control goes silent.
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

  it('every id used by a label actually exists in the same section', () => {
    // A <label htmlFor="x"> pointing at nothing names nothing, and it looks
    // correct in source. Only rendering catches it.
    const dangling = [];
    for (const id of ids) {
      const el = render(id);
      // Collect ids by walking the tree rather than querySelector('#id') -
      // CSS.escape is not available in this jsdom, and an id containing a dot or
      // colon would break a raw selector anyway.
      const presentIds = new Set(
        [...el.querySelectorAll('[id]')].map((n) => n.getAttribute('id'))
      );
      for (const label of el.querySelectorAll('label[for]')) {
        const target = label.getAttribute('for');
        if (!presentIds.has(target)) {
          dangling.push(`${id}: <label for="${target}"> points at nothing`);
        }
      }
    }
    expect(dangling).toEqual([]);
  });

  it('no two controls in one section share an id', () => {
    // Duplicate ids break label association silently: the browser binds the
    // label to whichever came first and the other control goes unnamed.
    const clashes = [];
    for (const id of ids) {
      const seen = new Map();
      for (const control of render(id).querySelectorAll('[id]')) {
        const key = control.getAttribute('id');
        seen.set(key, (seen.get(key) || 0) + 1);
      }
      for (const [key, count] of seen) {
        if (count > 1) clashes.push(`${id}: id "${key}" used ${count} times`);
      }
    }
    expect(clashes).toEqual([]);
  });
});
