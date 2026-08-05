// Titration Lab — independent accessibility audit with axe-core.
//
// The other suites assert affordances I chose to add: this aria-label exists, that
// slider announces its value. They cannot tell me about the things I did not think of
// — a table missing headers, an aria-* attribute that is invalid on the role I used, a
// duplicated id, a control whose accessible name is empty. axe knows those rules and I
// do not, which is the whole reason to run it.
//
// SCOPE, stated honestly: this runs against the rendered markup inside jsdom, with no
// Tailwind stylesheet loaded. Every rule that needs computed style — colour-contrast
// above all — would be judging default black-on-transparent rather than what a student
// sees, so those rules are DISABLED here rather than allowed to report a meaningless
// pass. Contrast has to be checked in a real browser; this covers structure and
// semantics, which is the half that static markup can actually answer for.

import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
let axe;
let host;

beforeAll(() => {
  axe = require(resolve(process.cwd(), 'desktop/web-app/node_modules', 'axe-core'));
});

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_titration.js', 'titrationLab');
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  host?.remove();
  host = null;
});

// Rules that cannot be judged without the real stylesheet, plus the page-level
// landmark/heading-order rules that do not apply to a fragment rendered on its own.
const DISABLED = {
  'color-contrast': { enabled: false },
  'region': { enabled: false },
  'page-has-heading-one': { enabled: false },
  'landmark-one-main': { enabled: false },
  'html-has-lang': { enabled: false },
  'heading-order': { enabled: false },
};

async function auditState(state) {
  host.innerHTML = renderTool('titrationLab', { titrationLab: state });
  const results = await axe.run(host, { rules: DISABLED, resultTypes: ['violations'] });
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 160)),
  }));
}

function report(violations) {
  if (!violations.length) return '';
  return '\n' + violations.map((v) =>
    `  [${v.impact}] ${v.id}: ${v.help}\n` + v.nodes.map((n) => `      ${n}`).join('\n')
  ).join('\n');
}

// Every surface a student can actually reach, including the ones added most recently
// (the graded run, its 3D station, the trials table, the glassware bench).
const SURFACES = [
  ['safety walkthrough gate', { safetyChecked: false }],
  ['titrate — strong/strong', { safetyChecked: true, labTab: 'titrate', presetId: 'sa_sb', volumeAdded: 12 }],
  ['titrate — redox potentiometry', { safetyChecked: true, labTab: 'titrate', presetId: 'redox_kmno4', volumeAdded: 5 }],
  ['challenge — graded, fresh', { safetyChecked: true, labTab: 'challenge', chMode: 'graded', gRun: 1 }],
  ['challenge — graded, mid-run', {
    safetyChecked: true, labTab: 'challenge', chMode: 'graded', gRun: 1, gVb: 21.2, gEyeCm: 10,
    gTrials: [{ vb: 21.25, eyeCm: 10, recorded: 21.08 }, { vb: 21.2, eyeCm: 10, recorded: 21.03 }],
  }],
  ['challenge — quiz', { safetyChecked: true, labTab: 'challenge', chMode: 'quiz' }],
  ['challenge — quiz answered', { safetyChecked: true, labTab: 'challenge', chMode: 'quiz', challengeAnswer: 'x' }],
  ['safety drills', { safetyChecked: true, labTab: 'incidents', incidentIdx: 0 }],
  ['safety drills — answered', { safetyChecked: true, labTab: 'incidents', incidentIdx: 0, incidentAnswer: 'wipe' }],
  ['equipment + glassware bench', { safetyChecked: true, labTab: 'equipment', benchSel: 'beaker' }],
  ['equipment — item open', { safetyChecked: true, labTab: 'equipment', selectedEquip: 'burette' }],
  ['dilution calculator', { safetyChecked: true, labTab: 'molarity' }],
  ['buffers', { safetyChecked: true, labTab: 'buffers', buffers: { ka: 1e-5, ratio: 1.0, log: [] } }],
  ['buffers — with observations', {
    safetyChecked: true, labTab: 'buffers',
    buffers: { ka: 1e-5, ratio: 0.1, log: [{ pKa: 5, ratio: 0.1, pH: 4, shift: 3.0, good: false }] },
  }],
];

describe('titrationLab — axe audit of every reachable surface', () => {
  for (const [name, state] of SURFACES) {
    it(name + ' has no axe violations', async () => {
      const violations = await auditState(state);
      expect(violations, name + report(violations)).toEqual([]);
    });
  }
});

describe('titrationLab — checks axe cannot make for us', () => {
  it('the run log and trials tables mark up their headers', async () => {
    host.innerHTML = renderTool('titrationLab', {
      titrationLab: {
        safetyChecked: true, labTab: 'challenge', chMode: 'graded', gRun: 1,
        gTrials: [{ vb: 21.25, eyeCm: 0, recorded: 21.25 }],
        gLog: [{ run: 1, name: 'Household vinegar', band: 'good', volErrMl: -0.1, concErrPct: -0.5, seconds: 42 }],
      },
    });
    const tables = host.querySelectorAll('table');
    expect(tables.length).toBeGreaterThan(0);
    for (const t of tables) {
      expect(t.querySelectorAll('th[scope="col"]').length).toBeGreaterThan(0);
    }
  });

  // A focusable element with no accessible name is announced as "group" and nothing
  // else. axe covers most of these, but the 3D containers are custom enough to pin.
  it('every focusable element has an accessible name', async () => {
    for (const [name, state] of SURFACES) {
      host.innerHTML = renderTool('titrationLab', { titrationLab: state });
      const focusables = host.querySelectorAll(
        'button, [tabindex="0"], input, select, textarea, a[href]');
      for (const el of focusables) {
        // A bound <label for> counts for any form control, not just INPUT — gating
        // this on INPUT alone reported a properly-labelled textarea as unnamed.
        // A placeholder deliberately does NOT count: axe accepts it as a last-resort
        // accessible name, but it disappears as soon as the field has content.
        // Walk the labels rather than building a selector: CSS.escape is absent in
        // this jsdom, and an id needing escaping would break the query anyway.
        const labelled = el.id && [...host.querySelectorAll('label[for]')]
          .some((l) => l.getAttribute('for') === el.id);
        const named = el.getAttribute('aria-label')
          || el.getAttribute('aria-labelledby')
          || el.getAttribute('title')
          || (el.textContent || '').trim()
          || labelled;
        expect(Boolean(named), `${name}: unnamed ${el.tagName} — ${el.outerHTML.slice(0, 120)}`).toBe(true);
      }
    }
  });

  it('no id is emitted twice on any surface', async () => {
    for (const [name, state] of SURFACES) {
      host.innerHTML = renderTool('titrationLab', { titrationLab: state });
      const ids = [...host.querySelectorAll('[id]')].map((e) => e.id);
      const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
      expect(dupes, `${name}: duplicate ids ${dupes.join(', ')}`).toEqual([]);
    }
  });
});
