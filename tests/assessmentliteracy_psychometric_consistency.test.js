// The Reliability Inquiry sandbox lets reliability and SEM move on independent
// sliders so a student can see each lever alone. Classical test theory does not
// allow that independence — SEM = SD√(1−r) — so the slider space contains
// instruments that cannot exist, and the tool's own note says as much:
// "r=.99 with SEM=15 is mathematically impossible at any plausible SD".
//
// That combination is reachable with both sliders at maximum. A confidence
// interval read off it is arithmetically correct and describes a test nobody has
// ever built — the exact shape of error this codebase keeps finding, where a
// number is right and the thing it claims to measure is not. These pin the live
// consistency check that now fires at that moment.
//
// The stakes are the tool's own: it cites Atkins v. Virginia, where SEM and the
// standard error of difference were "literally life-or-death".

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_assessmentliteracy.js'), 'utf8');

// SEM = SD√(1−r)  ⇒  SD = SEM / √(1−r)
const impliedSD = (sem, r) => sem / Math.sqrt(1 - r);

describe('assessmentLiteracy — reliability/SEM consistency', () => {
  it('states the classical-test-theory relation correctly', () => {
    // Pinning the formula itself: an edit that flips it would invalidate every
    // interval the sandbox draws.
    expect(SRC).toMatch(/SEM\s*=\s*SD\s*[×x*]\s*√\(1−r\)/);
    // And the derived quantity used by the live check.
    expect(SRC).toMatch(/impliedSD\s*=\s*iq\.sem\s*\/\s*Math\.sqrt/);
  });

  it('agrees with published psychometrics on a real instrument', () => {
    // A standard-score scale (SD 15) at r = .95 has SEM 3.35 — the value test
    // manuals print. If our inversion is right, it round-trips.
    expect(15 * Math.sqrt(1 - 0.95)).toBeCloseTo(3.354, 3);
    expect(impliedSD(3.354, 0.95)).toBeCloseTo(15, 2);
    // Subtest scaled scores: SD 3, r = .90 → SEM 0.95.
    expect(impliedSD(0.949, 0.90)).toBeCloseTo(3, 1);
  });

  it('flags the impossible pairing the tool itself calls out', () => {
    // Both sliders at maximum — reachable in one gesture.
    expect(impliedSD(15, 0.99)).toBeCloseTo(150, 0);
    expect(impliedSD(15, 0.99)).toBeGreaterThan(30);   // over the plausibility bar
    // r = .90 with SEM 15 is equally unbuildable.
    expect(impliedSD(15, 0.90)).toBeGreaterThan(30);
  });

  it('leaves realistic pairings unflagged, so the warning keeps meaning', () => {
    // A warning that fires on ordinary settings trains students to ignore it.
    for (const [sem, r] of [[1, 0.99], [5, 0.85], [3, 0.95], [6.7, 0.80], [15, 0.50]]) {
      expect(impliedSD(sem, r), 'r=' + r + ' SEM=' + sem + ' should read as plausible')
        .toBeLessThanOrEqual(30);
    }
  });

  it('warns without contradicting the arithmetic it just showed', () => {
    // The interval is not wrong — the instrument is. Saying "this is incorrect"
    // would teach the wrong lesson about where the error lives.
    const from = SRC.indexOf('implied_sd_bad_body');
    expect(from).toBeGreaterThan(-1);
    const body = SRC.slice(from, from + 400);
    expect(body).toMatch(/arithmetically correct/);
    expect(body).toMatch(/cannot exist|no published instrument/);
  });

  it('marks the impossible state as an alert for assistive tech', () => {
    // Colour alone cannot carry "the instrument you built is impossible".
    expect(SRC).toMatch(/role:\s*sdPlausible\s*\?\s*null\s*:\s*'alert'/);
  });
});

// ── Free-identifier crash guard ─────────────────────────────────────────────
// The _RENDER_* functions live at module scope and receive what they need as
// parameters. Three aria-labels inside _RENDER_CAREER called __alloT, which is
// declared inside the render closure and is therefore NOT visible there — a
// ReferenceError that unmounts the careers module. It never fired in a default
// render because those panels only appear once a student has a career code,
// which is precisely why it survived.
describe('assessmentLiteracy — no free identifiers in module-scope renderers', () => {
  it('passes __alloT into _RENDER_CAREER instead of closing over it', () => {
    expect(SRC).toMatch(/function _RENDER_CAREER\([^)]*__alloT\)/);
    expect(SRC).toMatch(/_RENDER_CAREER\(h, s, upd, callGemini, addToast, backBtn, __alloT\)/);
  });

  it('every __alloT call sits inside a scope that defines it', () => {
    // Locate the render-closure declaration and its extent, then assert no call
    // outside it belongs to a function that lacks its own binding.
    const declAt = SRC.indexOf('var __alloT = function');
    expect(declAt).toBeGreaterThan(-1);
    const open = SRC.lastIndexOf('{', declAt);
    let depth = 0, end = -1;
    for (let i = open; i < SRC.length; i++) {
      const c = SRC[i];
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    const outside = [];
    const re = /__alloT\s*\(/g;
    let m;
    while ((m = re.exec(SRC))) {
      if (m.index < open || m.index > end) outside.push(SRC.slice(0, m.index).split(/\r?\n/).length);
    }
    // Any remaining outside use must be covered by a parameter or local binding.
    for (const line of outside) {
      const before = SRC.split(/\r?\n/).slice(0, line).join('\n');
      const fnAt = before.lastIndexOf('function _RENDER');
      expect(fnAt, 'unscoped __alloT call at line ' + line).toBeGreaterThan(-1);
      const sig = SRC.slice(fnAt, SRC.indexOf(')', fnAt) + 1);
      expect(sig, 'line ' + line + ' is inside ' + sig.split('(')[0] + ', which does not receive __alloT')
        .toContain('__alloT');
    }
  });
});
