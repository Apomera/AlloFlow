// Every chemBalance subtool, rendered with its tab actually open.
//
// WHY THIS FILE EXISTS
// dev-tools/check_stem_render.cjs renders each tool in its DEFAULT state, and chemBalance
// opens on its hub. So the bodies of all 39 subtools are invisible to that gate AND to
// the render goldens, which snapshot the same default state. Molecule has had a breadth
// test since early in this work (molecule_all_sections_render); chemBalance had none.
//
// Writing it found a real defect on the first run: the guard that offers the Titration
// Lab link was keyed to `subtool === 'acids'`, an id nothing emits - the section is
// `acids_bases`. So Acids & Bases showed NO titration link, while an unreachable state
// showed one. That is exactly the class of bug a breadth render test exists to catch:
// it looks correct in source and only appears when you render every page.
//
// Ids are read FROM SOURCE so a newly added subtool is covered the day it lands.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const CHEMBALANCE = 'stem_lab/stem_tool_chembalance.js';

function subtoolIds(source) {
  return [...new Set(
    [...source.matchAll(/subtool === '([a-z_]+)'/g)].map((m) => m[1])
  )].sort();
}

// The catalog the hub actually offers, which is the set a student can reach.
function catalogIds(source) {
  const start = source.indexOf('var SUBTOOLS');
  const end = source.indexOf('var CHEM_CATEGORIES');
  if (start < 0 || end < 0) return [];
  return [...new Set(
    [...source.slice(start, end).matchAll(/\{ id: '([a-z_A-Z]+)'/g)].map((m) => m[1])
  )];
}

function textOf(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.textContent.trim();
}

function render(subtool) {
  return renderTool('chemBalance', { chemBalance: { subtool, _everPicked: true } });
}

// The shell alone - header, breadcrumb, snapshot button. Comparing against it is
// what makes "this subtool produced content" a real assertion rather than a
// statement about the surrounding page.
const MIN_OWN_TEXT = 150;

describe('chemBalance — every subtool renders behind its tab', () => {
  let source;
  let ids;
  let shellLength;

  beforeAll(() => {
    window.localStorage.clear();
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
    source = readFileSync(CHEMBALANCE, 'utf8');
    ids = subtoolIds(source);
    // An id nothing dispatches on renders the bare shell.
    shellLength = textOf(render('__not_a_subtool__')).length;
  });

  it('finds the full subtool catalog', () => {
    // If this collapses, every per-subtool assertion below passes vacuously.
    expect(ids.length).toBeGreaterThanOrEqual(35);
    for (const known of ['balance', 'stoich', 'kinetics', 'nuclear', 'acids_bases']) {
      expect(ids).toContain(known);
    }
  });

  it('every subtool guard names an id the hub can actually reach', () => {
    // The defect this file was written for. A guard keyed to an id no catalog
    // entry emits is dead code that silently withholds whatever it guards -
    // `subtool === 'acids'` hid the Titration Lab link from Acids & Bases.
    const catalog = new Set(catalogIds(source));
    expect(catalog.size, 'catalog did not parse').toBeGreaterThanOrEqual(35);

    const unreachable = ids.filter((id) => !catalog.has(id));
    expect(unreachable).toEqual([]);
  });

  it('renders every subtool without throwing, each with its own content', () => {
    const failures = [];
    const thin = [];

    for (const id of ids) {
      let html;
      try {
        html = render(id);
      } catch (error) {
        failures.push(`${id}: ${error.message}`);
        continue;
      }
      const own = textOf(html).length - shellLength;
      if (own < MIN_OWN_TEXT) thin.push(`${id}: only ${own} chars beyond the shell`);
    }

    expect(failures).toEqual([]);
    expect(thin).toEqual([]);
  });

  it('no subtool leaks a formatting failure to the student', () => {
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
      const text = textOf(render(id));
      for (const [re, label] of patterns) {
        if (re.test(text)) dirty.push(`${id}: renders "${label}"`);
      }
    }
    expect(dirty).toEqual([]);
  });

  it('every subtool announces itself with a visible title', () => {
    // chemBalance titles its pages with styled <div>s rather than h1-h6 (only 18
    // real headings in the whole file), so a heading-delta check is the wrong
    // shape here. What every page DOES have is its catalog label on screen -
    // that is what tells a student which page they are on.
    // Scope to the SUBTOOLS catalog. A file-wide scan also picks up progress
    // metrics ({ id: 'balance', label: 'Unique equations' }) whose label is not
    // a page title at all, and grades pages against the wrong string.
    const catalogStart = source.indexOf('var SUBTOOLS');
    const catalogEnd = source.indexOf('var CHEM_CATEGORIES');
    const labels = new Map(
      [...source.slice(catalogStart, catalogEnd)
        .matchAll(/\{ id: '([a-zA-Z_]+)',[^}]*?label: '([^']+)'/g)]
        .map((m) => [m[1], m[2]])
    );
    const untitled = [];
    for (const id of ids) {
      const label = labels.get(id);
      if (!label) continue;              // not a catalog entry, nothing to assert
      if (!textOf(render(id)).includes(label)) {
        untitled.push(`${id}: page never shows its own label "${label}"`);
      }
    }
    expect(untitled).toEqual([]);
  });

  it('tables carry real header cells', () => {
    // A table with no <th> is an unlabelled grid to a screen reader.
    const bad = [];
    for (const id of ids) {
      const el = document.createElement('div');
      el.innerHTML = render(id);
      for (const table of el.querySelectorAll('table')) {
        if (table.querySelectorAll('th').length === 0) {
          bad.push(`${id}: a <table> with no <th>`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('offers the Titration Lab link from Acids & Bases, and not everywhere', () => {
    // Pins the fix. Acids & Bases and pH Discovery are the two pages where a
    // titration is the obvious next step; a link on every page would be noise.
    const hasLink = (id) => {
      const el = document.createElement('div');
      el.innerHTML = render(id);
      return [...el.querySelectorAll('button')]
        .some((b) => b.textContent.includes('Titration Lab'));
    };
    expect(hasLink('acids_bases'), 'Acids & Bases must link to Titration').toBe(true);
    expect(hasLink('pHHunt'), 'pH Discovery must link to Titration').toBe(true);
    for (const id of ['balance', 'redox', 'nuclear', 'stoich']) {
      expect(hasLink(id), `${id} should not link to Titration`).toBe(false);
    }
  });
});
