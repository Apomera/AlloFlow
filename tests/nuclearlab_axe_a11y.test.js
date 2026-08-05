// Nuclear & Radiation Lab — independent accessibility audit with axe-core.
//
// The science suite asserts the numbers are right. This one asserts a student
// who cannot see the screen, or cannot use a mouse, can still get at them.
//
// SCOPE, stated honestly: this runs against rendered markup inside jsdom with no
// Tailwind stylesheet loaded, so every rule that needs computed style — colour
// contrast above all — would be judging default black-on-transparent rather than
// what a student sees. Those rules are DISABLED here rather than allowed to
// report a meaningless pass; contrast is checked separately, against the literal
// hex values the tool hard-codes, in nuclearlab_contrast_a11y.test.js.

import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import fs2 from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = fs2.readFileSync('stem_lab/stem_tool_nuclearlab.js', 'utf8');

const require = createRequire(import.meta.url);
let axe;
let host;

beforeAll(() => {
  axe = require(resolve(process.cwd(), 'desktop/web-app/node_modules', 'axe-core'));
});

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_nuclearlab.js', 'nuclearLab');
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  host?.remove();
  host = null;
});

const DISABLED = {
  'color-contrast': { enabled: false },
  region: { enabled: false },
  'page-has-heading-one': { enabled: false },
  'landmark-one-main': { enabled: false },
  'html-has-lang': { enabled: false },
};

// Every section renders at once, so the states below vary what is EXPANDED or
// computed rather than which panel is showing.
const SURFACES = [
  ['first load, nothing touched', {}],
  ['light theme', {}, { theme: 'light' }],
  ['decay curve mid-run', { isoId: 'cs137', halves: 3.25 }],
  ['carbon date revealed', { c14Frac: 12, datedOnce: true }],
  ['chain step open', { chainIdx: 6, chainSeen: ['U-238', 'Rn-222'] }],
  ['enrichment level open', { enrIdx: 5 }],
  ['shielding — neutron through lead', { radId: 'neutron', shieldId: 'lead', thick: 12 }],
  ['criticality supercritical', { rods: 10 }],
  ['binding reaction open', { reactionId: 'dt' }],
  ['weighting — alpha to lung', { wrId: 'alpha', wtId: 'lung', absorbedMGy: 4.5 }],
  ['weighting — whole body', { wrId: 'gamma', wtId: 'whole', absorbedMGy: 1 }],
  ['biohalf — caesium', { bioId: 'cs137', bioSeen: ['cs137'] }],
  ['biohalf — plutonium', { bioId: 'pu239' }],
  ['annual dose estimated', { dsAlt: 1200, dsFlights: 40, dsRadon: 'high', dsScans: { ctAbdo: 2 }, doseEstimated: true }],
  ['dose ladder row open', { dosePick: 7 }],
  ['detector — no counts yet', { cdSrc: 'cs137', cdDist: 10, cdTime: 10 }],
  ['detector — detected, precise', {
    cdSrc: 'cs137', cdDist: 5, cdTime: 600,
    cdRuns: [{ g: 4200, b: 250, t: 600, d: 5, s: 'cs137' }, { g: 4180, b: 262, t: 600, d: 5, s: 'cs137' }],
  }],
  ['detector — below detection limit', { cdSrc: 'kcl', cdDist: 40, cdTime: 10, cdRuns: [{ g: 5, b: 4, t: 10, d: 40, s: 'kcl' }] }],
  ['detector — background only, negative net', { cdSrc: 'none', cdTime: 30, cdRuns: [{ g: 10, b: 14, t: 30, d: 10, s: 'none' }] }],
  ['accident open', { incidentId: 'chernobyl', incidentsRead: ['chernobyl'] }],
  ['reactor design open', { reactorId: 'smr', reactorsSeen: ['smr'] }],
  ['waste card open', { wasteIdx: 4, wasteSeen: ['How much there is'] }],
  ['topic index filtered', { nkQuery: 'radon', nkGroup: 'radiation' }],
  // jsdom reports a 1024 px viewport, so the index defaults to OPEN in every
  // surface above and the collapsed state went unaudited — including whether
  // the toggle's aria-controls still resolves once the body is gone.
  ['index collapsed', { nkOpen: false }],
  ['index collapsed, on a route', { nkOpen: false, nkPath: 'safe' }],
  ['index open, on a route', { nkOpen: true, nkPath: 'me' }],
  ['topic index empty result', { nkQuery: 'zzzz' }],
];

async function auditState(state, ctx) {
  host.innerHTML = renderTool('nuclearLab', { _nuclearLab: state }, ctx);
  const results = await axe.run(host, { rules: DISABLED, resultTypes: ['violations'] });
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 180)),
  }));
}

function report(violations) {
  if (!violations.length) return '';
  return '\n' + violations.map((v) =>
    `  [${v.impact}] ${v.id}: ${v.help}\n` + v.nodes.map((n) => `      ${n}`).join('\n')
  ).join('\n');
}

describe('nuclearLab — axe audit of every reachable surface', () => {
  for (const [name, state, ctx] of SURFACES) {
    it(name + ' has no axe violations', async () => {
      const violations = await auditState(state, ctx);
      expect(violations, name + report(violations)).toEqual([]);
    // Renders nineteen sections and runs a full axe scan over them. Roughly a
    // second each in isolation, but vitest runs test FILES in parallel, and
    // under that contention the 5 s default started timing out fifteen of these
    // at once — which reads like a real accessibility failure and is not one.
    }, 30000);
  }
});

describe('nuclearLab — checks axe cannot make for us', () => {
  it('every focusable element has an accessible name', () => {
    for (const [name, state, ctx] of SURFACES) {
      host.innerHTML = renderTool('nuclearLab', { _nuclearLab: state }, ctx);
      const focusables = host.querySelectorAll('button, [tabindex="0"], input, select, textarea, a[href]');
      // Collected ONCE per surface. Re-querying every label inside the element
      // loop made this O(controls x labels) across 24 surfaces — ~150 controls
      // each — and it started timing out the moment the machine was busy.
      const labelFor = new Set(
        [...host.querySelectorAll('label[for]')].map((l) => l.getAttribute('for')));
      for (const el of focusables) {
        const labelled = el.id && labelFor.has(el.id);
        const named = el.getAttribute('aria-label')
          || el.getAttribute('aria-labelledby')
          || el.getAttribute('title')
          || (el.textContent || '').trim()
          || labelled;
        expect(Boolean(named), `${name}: unnamed ${el.tagName} — ${el.outerHTML.slice(0, 140)}`).toBe(true);
      }
    }
  }, 60000);

  it('no id is emitted twice on any surface', () => {
    for (const [name, state, ctx] of SURFACES) {
      host.innerHTML = renderTool('nuclearLab', { _nuclearLab: state }, ctx);
      const ids = [...host.querySelectorAll('[id]')].map((e) => e.id);
      const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
      expect(dupes, `${name}: duplicate ids ${dupes.join(', ')}`).toEqual([]);
    }
  }, 60000);

  // Seventeen sections used to share exactly one heading element between them
  // (the tool title), so heading navigation — the primary way a screen reader
  // user moves around a long page — found nothing at all.
  it('gives every section a real heading, in a valid order', () => {
    host.innerHTML = renderTool('nuclearLab', {});
    const levels = [...host.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((el) => +el.tagName[1]);
    expect(levels.length, 'sections without heading elements').toBeGreaterThanOrEqual(17);
    expect(levels[0], 'the tool title should be the first heading').toBe(3);
    // No level may be skipped on the way down.
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1], `heading jumped from h${levels[i - 1]} to h${levels[i]}`).toBeLessThanOrEqual(1);
    }
    // And a heading must have text — a styled empty element helps nobody.
    for (const el of host.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
      expect((el.textContent || '').trim().length, 'empty heading').toBeGreaterThan(2);
    }
  });

  // Jumping used to scroll the viewport and leave focus behind on the index,
  // so the next Tab went to the next index button and the section a keyboard
  // user asked for stayed out of reach.
  it('makes every jump target focusable so focus can follow the scroll', () => {
    host.innerHTML = renderTool('nuclearLab', {});
    const targets = [...host.querySelectorAll('[data-nk-sec]')];
    expect(targets.length).toBeGreaterThanOrEqual(17);
    for (const t of targets) {
      expect(t.getAttribute('tabindex'), `${t.id} cannot receive focus`).toBe('-1');
    }
    // -1, never 0: these are scroll destinations, not tab stops. Putting 17
    // panels into the tab order would bury every control inside them.
    expect(host.querySelectorAll('[data-nk-sec][tabindex="0"]').length).toBe(0);
  });

  // A panel that is both announced by hand and wrapped in a live region gets
  // read out twice.
  it('never puts a live region around content it also announces by hand', () => {
    host.innerHTML = renderTool('nuclearLab', {
      _nuclearLab: {
        datedOnce: true, c14Frac: 25,
        cdSrc: 'cs137', cdRuns: [{ g: 900, b: 250, t: 600, d: 5, s: 'cs137' }],
      },
    });
    const live = [...host.querySelectorAll('[role="status"], [aria-live]')];
    for (const el of live) {
      const txt = (el.textContent || '').trim();
      expect(txt.slice(0, 30), 'a live region duplicates the detector announcement')
        .not.toMatch(/^With the source/);
      expect(txt.slice(0, 40), 'a live region duplicates the dating announcement')
        .not.toMatch(/years old/);
    }
  });

  // Six canvases carry real quantitative content. A canvas with no accessible
  // name is a hole in the page for anyone not looking at it, and these are the
  // places the tool makes its arguments.
  it('every canvas states its content in words', () => {
    for (const [name, state, ctx] of SURFACES) {
      host.innerHTML = renderTool('nuclearLab', { _nuclearLab: state }, ctx);
      for (const c of host.querySelectorAll('canvas')) {
        const label = c.getAttribute('aria-label') || '';
        expect(c.getAttribute('role'), `${name}: canvas without role=img`).toBe('img');
        expect(label.length, `${name}: canvas label too thin — "${label}"`).toBeGreaterThan(40);
        expect(label, `${name}: canvas label leaks a bad number`).not.toMatch(/NaN|Infinity|undefined/);
      }
    }
  }, 60000);
});

// ── The collapsible index ──────────────────────────────────────────────────
// Measured on a 390 px phone, the expanded index took 48% of the viewport
// before the question routes were added and 55% after — half the screen,
// permanently, for navigation. It now folds: closed by default on a narrow
// viewport, closed automatically once a jump has been used, and always one tap
// from open.
describe('nuclearLab — the index folds without stranding anyone', () => {
  it('keeps the toggle and the search reachable while collapsed', () => {
    host.innerHTML = renderTool('nuclearLab', { _nuclearLab: { nkOpen: false } });
    const toggle = host.querySelector('[aria-controls], [aria-expanded]');
    expect(toggle, 'no disclosure control on the index').toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('#nk-index-body'), 'body still rendered while collapsed').toBeNull();
    // Search stays in the header row, so it survives the fold.
    expect(host.querySelector('#nk-topic-search'), 'search vanished with the body').toBeTruthy();
  });

  it('does not point aria-controls at an element that is not there', () => {
    const closed = renderTool('nuclearLab', { _nuclearLab: { nkOpen: false } });
    expect(closed).not.toContain('aria-controls="nk-index-body"');
    const open = renderTool('nuclearLab', { _nuclearLab: { nkOpen: true } });
    expect(open).toContain('aria-controls="nk-index-body"');
    expect(open).toContain('id="nk-index-body"');
  });

  it('names the active route in the collapsed header, so state is never hidden', () => {
    host.innerHTML = renderTool('nuclearLab', { _nuclearLab: { nkOpen: false, nkPath: 'safe' } });
    expect(host.textContent).toContain('Is nuclear power safe?');
    const toggle = host.querySelector('[aria-expanded]');
    expect(toggle.getAttribute('aria-label')).toMatch(/currently following the route/i);
  });

  it('folds itself once a jump has been used', () => {
    // The behaviour, asserted at the source: nkGoTo closes the index. Testing
    // it through a click would need a live root; this pins the intent.
    const start = SRC.indexOf('function nkGoTo');
    expect(start, 'nkGoTo not found').toBeGreaterThan(-1);
    // Slice to the announceToSR call that ends the function rather than to a
    // fixed character count — the comment inside it pushed past 900 and the
    // test failed on prose length rather than on behaviour.
    const body = SRC.slice(start, SRC.indexOf("announceToSR('Jumped to", start));
    expect(body).toMatch(/nkOpen: false/);
  });

  it('still renders every section while the index is collapsed', () => {
    // Folding is navigation only. Nothing may become unreachable by scrolling.
    const html = renderTool('nuclearLab', { _nuclearLab: { nkOpen: false, nkPath: 'know' } });
    const ids = [...SRC.matchAll(/\{ id: '([a-z0-9]+)', grp: '[a-z]+', icon:/g)].map((m) => m[1]);
    for (const id of ids) expect(html, id + ' unreachable').toContain('id="nksec-' + id + '"');
  });
});
