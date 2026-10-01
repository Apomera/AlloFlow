// Every molecule reference section, rendered with its tab actually open.
//
// WHY THIS FILE EXISTS
// dev-tools/check_stem_render.cjs renders each tool in its DEFAULT state, and molecule
// opens with expSection = null (everything collapsed). So the bodies of all 49 reference
// sections are invisible to that gate AND to the render goldens, which snapshot the same
// default state. A ReferenceError inside any of them ships silently: the student clicks
// the tab and gets a blank panel or a dead tool.
//
// tests/stem_chemistry_sections_render.test.js covers the four RICH sections in depth
// (equilibrium, gaslaws, and the chembalance particle views). This file is the breadth
// pass over all of them, and it derives the id list FROM THE SOURCE so a newly added
// section is covered the day it lands instead of silently opting out.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const MOLECULE = 'stem_lab/stem_tool_molecule.js';

// Every section id the tool actually dispatches on. Read from source rather than
// hand-listed: a hand-list silently stops covering whatever is added next.
function sectionIds(source) {
  return [...new Set(
    [...source.matchAll(/expSection === '([a-z_]+)'/g)].map((m) => m[1])
  )].sort();
}

function textOf(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.textContent.trim();
}

function headingCount(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
}

// The collapsed render is ~6.4k chars of shell chrome (header, tab bar, the main
// builder view) that every section render also contains. Comparing against it is
// what makes "the section produced content" a real assertion instead of a
// tautology about the surrounding page.
const MIN_OWN_TEXT = 300;

describe('Molecule — every reference section renders behind its tab', () => {
  let source;
  let ids;
  let baseText;

  beforeAll(() => {
    window.localStorage.clear();
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
    source = readFileSync(MOLECULE, 'utf8');
    ids = sectionIds(source);
    baseText = textOf(renderTool('molecule', { molecule: { expSection: null } }));
  });

  it('finds the full section catalog in source', () => {
    // If this collapses to a handful, the regex stopped matching and every
    // per-section assertion below would vacuously pass.
    expect(ids.length).toBeGreaterThanOrEqual(45);
    for (const known of ['equilibrium', 'gaslaws', 'thermo', 'redox', 'spectro']) {
      expect(ids).toContain(known);
    }
  });

  it('every section has a render function wired to it', () => {
    // A section id that dispatches to nothing renders an empty panel.
    const unwired = ids.filter(
      (id) => !new RegExp(`expSection === '${id}'\\) return render[A-Za-z]+Section\\(\\)`).test(source)
    );
    expect(unwired).toEqual([]);
  });

  it('renders all of them without throwing, each with its own content', () => {
    const failures = [];
    const thin = [];

    for (const id of ids) {
      let html;
      try {
        html = renderTool('molecule', { molecule: { expSection: id } });
      } catch (error) {
        failures.push(`${id}: ${error.message}`);
        continue;
      }
      // Own content = what this section added beyond the collapsed shell.
      const own = textOf(html).length - baseText.length;
      if (own < MIN_OWN_TEXT) thin.push(`${id}: only ${own} chars beyond the shell`);
    }

    expect(failures).toEqual([]);
    expect(thin).toEqual([]);
  });

  it('no section leaks a formatting failure to the student', () => {
    // "NaN", "undefined" and "[object Object]" reaching the DOM are the visible
    // symptoms of a broken data row or a missing field.
    //
    // A bare substring search gives FALSE POSITIVES on real chemistry prose, and
    // both of them are present in this tool:
    //   - "NaN" matches inside NaCl, NaNO3, NaNH2 - sodium formulae.
    //   - "undefined" is correct physics in the orbitals section ("its momentum
    //     becomes undefined").
    // So match the FORMATTING failure, not the letters: a broken number is a
    // standalone token, usually adjacent to a unit, a sign or a delimiter.
    const patterns = [
      [/(^|[\s>(:,=])NaN([\s<),;%]|$)/, 'NaN'],
      [/(^|[\s>(:,=])undefined([\s<),;%]|$)/, 'undefined'],
      [/\[object Object\]/, '[object Object]'],
    ];
    // Prose exceptions: places where the WORD is the correct content.
    const proseOk = /momentum becomes undefined|position .{0,40} undefined/i;

    const dirty = [];
    for (const id of ids) {
      const text = textOf(renderTool('molecule', { molecule: { expSection: id } }));
      for (const [re, label] of patterns) {
        if (!re.test(text)) continue;
        if (label === 'undefined' && proseOk.test(text)) continue;
        dirty.push(`${id}: renders "${label}"`);
      }
    }
    expect(dirty).toEqual([]);
  });

  it('every section adds a heading of its OWN so the panel is navigable', () => {
    // A reference panel with no heading is unreachable by heading navigation,
    // which is how many screen-reader users move through a long page.
    //
    // The surrounding shell already renders 6 headings, so "this render contains
    // a heading" is true even when the section contributes none - that assertion
    // passes with the section's own heading deleted. Count the DELTA instead.
    const shellHeadings = headingCount(
      renderTool('molecule', { molecule: { expSection: null } })
    );
    expect(shellHeadings).toBeGreaterThan(0); // guards the baseline itself

    const headless = [];
    for (const id of ids) {
      const own = headingCount(renderTool('molecule', { molecule: { expSection: id } }))
        - shellHeadings;
      if (own < 1) headless.push(`${id}: adds ${own} headings`);
    }
    expect(headless).toEqual([]);
  });

  it('tables in reference sections carry real header cells', () => {
    // These sections are mostly data tables. A table with no <th> is an
    // unlabelled grid to a screen reader.
    const bad = [];
    for (const id of ids) {
      const el = document.createElement('div');
      el.innerHTML = renderTool('molecule', { molecule: { expSection: id } });
      for (const table of el.querySelectorAll('table')) {
        if (table.querySelectorAll('th').length === 0) {
          bad.push(`${id}: a <table> with no <th>`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
