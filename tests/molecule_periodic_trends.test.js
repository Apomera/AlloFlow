// Molecule — predict a periodic trend, then check the measurement.
//
// WHY THIS FILE EXISTS
// PERIODIC_TRENDS states six rules as prose ("Decreases →", "Increases ↓"). A rule you
// can only read is a rule you cannot be wrong about, so the skill - "which of these two
// is bigger?" - never gets rehearsed.
//
// The important design decision: every answer is graded against MEASURED values, never
// against a restatement of the rule. That is what lets the panel show where the rule
// FAILS - first ionisation energy has four real subshell anomalies (Be/B, N/O, Mg/Al,
// P/S) and atomic mass inverts at Te/I. A drill graded by the rule could never surface
// them, and would quietly teach that the rule is exceptionless.
//
// The section is tab-gated (molecule opens with expSection = null), so
// dev-tools/check_stem_render.cjs never builds it and the render goldens never see it.

import { beforeAll, describe, expect, it } from 'vitest';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const MOLECULE = 'stem_lab/stem_tool_molecule.js';

function frag(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

function periodic(state = {}) {
  return frag(renderTool('molecule', {
    molecule: { expSection: 'periodic', referenceLibraryOpen: true, ...state },
  }));
}

const testid = (el, id) => {
  const node = el.querySelector(`[data-testid="${id}"]`);
  return node ? node.textContent.replace(/\s+/g, ' ') : null;
};

describe('Periodic trend model (pure)', () => {
  let pure;

  beforeAll(() => {
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
    renderTool('molecule', { molecule: { expSection: null } });
    pure = window.__alloMoleculePure;
  });

  it('carries published element data', () => {
    const el = pure.PT_ELEMENTS;
    // Pauling EN, matching the values the bond-polarity section already uses.
    expect(el.F.en).toBeCloseTo(3.98, 2);
    expect(el.Cs.en).toBeCloseTo(0.79, 2);
    // First ionisation energies in kJ/mol.
    expect(el.He === undefined || el.F.ie1 === 1681).toBe(true);
    expect(el.Cs.ie1).toBe(376);
    // The mass inversion pair.
    expect(el.Te.mass).toBeGreaterThan(el.I.mass);
    expect(el.Te.z).toBeLessThan(el.I.z);
  });

  it('grades against the MEASURED value, not the rule', () => {
    // Li vs F on radius: both the rule and the measurement say Li.
    const agree = pure.compareTrend('radius', 'Li', 'F');
    expect(agree.actual).toBe('Li');
    expect(agree.predicted).toBe('Li');
    expect(agree.ruleHolds).toBe(true);
    // And the actual numbers are what decided it.
    expect(agree.valueA).toBeGreaterThan(agree.valueB);
  });

  it('finds the four real ionisation-energy anomalies', () => {
    // Be/B and N/O (and their period-3 twins Mg/Al, P/S) are textbook subshell
    // effects: B starts a new 2p subshell, O pairs an electron in a half-filled
    // one. A rule-graded drill could never surface these.
    const exceptions = pure.trendExceptions('ie1');
    const pairs = exceptions.map((e) => [e.a, e.b].sort().join('/'));
    for (const want of ['B/Be', 'N/O', 'Al/Mg', 'P/S']) {
      expect(pairs, `missing IE anomaly ${want}`).toContain(want);
    }
  });

  it('finds the atomic mass inversion', () => {
    // Te (127.60) is heavier than I (126.90) despite lower Z - which is why
    // Moseley replaced Mendeleev's mass ordering with atomic number.
    const exceptions = pure.trendExceptions('mass');
    const pairs = exceptions.map((e) => [e.a, e.b].sort().join('/'));
    expect(pairs).toContain('I/Te');
  });

  it('reports N/O as a rule FAILURE, with the right winner', () => {
    const r = pure.compareTrend('ie1', 'N', 'O');
    expect(r.predicted).toBe('O');     // rule: IE increases across
    expect(r.actual).toBe('N');        // measurement disagrees
    expect(r.ruleHolds).toBe(false);
    expect(r.valueA).toBe(1402);
    expect(r.valueB).toBe(1314);
  });

  it('has NO exceptions where the trend really is monotonic', () => {
    // Radius and electronegativity hold across every comparable pair in this
    // element set. If one ever appeared, either the data or the rule is wrong.
    expect(pure.trendExceptions('radius')).toEqual([]);
    expect(pure.trendExceptions('en')).toEqual([]);
  });

  it('stays SILENT when the rule cannot decide', () => {
    // C and Br share neither a period nor a group, so the simple rule has
    // nothing to say. Guessing would be worse than admitting it.
    const r = pure.compareTrend('en', 'C', 'Br');
    expect(r.predicted).toBeNull();
    expect(r.basis).toBeNull();
    expect(r.ruleHolds).toBeNull();
    // But the measurement still decides.
    expect(r.actual).toBe('Br');
  });

  it('uses the group rule when two elements share a group', () => {
    const r = pure.compareTrend('radius', 'Li', 'Cs');
    expect(r.basis).toBe('same group');
    expect(r.predicted).toBe('Cs');
    expect(r.actual).toBe('Cs');
  });

  it('refuses a comparison it cannot make', () => {
    expect(pure.compareTrend('radius', 'Li', 'Li')).toBeNull();
    expect(pure.compareTrend('nope', 'Li', 'F')).toBeNull();
    expect(pure.compareTrend('radius', 'Li', 'Unobtainium')).toBeNull();
    // Argon has no Pauling electronegativity, so an EN comparison is impossible.
    expect(pure.compareTrend('en', 'Ar', 'Cl')).toBeNull();
  });
});

describe('Periodic section — the prediction drill renders', () => {
  beforeAll(() => {
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
  });

  it('asks a question with two choices and no answer shown', () => {
    const el = periodic();
    expect(testid(el, 'mol-pt-question')).toContain('Atomic radius');
    expect(el.querySelectorAll('[data-pt-choice]').length).toBe(2);
    expect(el.querySelector('[data-testid="mol-pt-verdict"]')).toBeNull();
  });

  it('confirms a correct prediction with both measurements', () => {
    const el = periodic({ ptIdx: 0, ptPick: 'Li' });
    const verdict = testid(el, 'mol-pt-verdict');
    expect(verdict).toContain('Correct');
    expect(verdict).toContain('167 pm');
    expect(verdict).toContain('42 pm');
  });

  it('marks a rule-correct answer WRONG when the measurement disagrees', () => {
    // This is the whole point. A student applying the rule to N/O picks O and is
    // told - accurately - that the measurement says N.
    const el = periodic({ ptIdx: 4, ptPick: 'O' });
    expect(testid(el, 'mol-pt-verdict')).toContain('Not quite');
    expect(testid(el, 'mol-pt-verdict')).toContain('1402');
    const rule = testid(el, 'mol-pt-rule');
    expect(rule).toContain('the rule predicts O');
    expect(rule).toContain('REAL exception');
  });

  it('marks the rule-defying answer RIGHT', () => {
    const el = periodic({ ptIdx: 4, ptPick: 'N' });
    expect(testid(el, 'mol-pt-verdict')).toContain('Correct');
    // And still explains that the rule would have said otherwise.
    expect(testid(el, 'mol-pt-rule')).toContain('REAL exception');
  });

  it('handles the mass inversion the same way', () => {
    const el = periodic({ ptIdx: 5, ptPick: 'I' });
    expect(testid(el, 'mol-pt-verdict')).toContain('Not quite');
    expect(testid(el, 'mol-pt-verdict')).toContain('127.6');
    expect(testid(el, 'mol-pt-rule')).toContain('REAL exception');
  });

  it('does NOT cry exception when the rule holds', () => {
    // Each pair has its OWN two symbols - picking a symbol from a different pair
    // renders no verdict at all, so the choice has to come from the question.
    for (const ptIdx of [0, 1, 2, 3]) {
      const choice = periodic({ ptIdx })
        .querySelector('[data-pt-choice]').getAttribute('data-pt-choice');
      const rule = testid(periodic({ ptIdx, ptPick: choice }), 'mol-pt-rule');
      expect(rule, `pair ${ptIdx} rendered no rule panel`).toBeTruthy();
      expect(rule, `pair ${ptIdx}`).not.toContain('REAL exception');
    }
  });

  it('states the rule and the basis for its prediction', () => {
    const rule = testid(periodic({ ptIdx: 1, ptPick: 'Cs' }), 'mol-pt-rule');
    expect(rule).toContain('increases down a group');
    expect(rule).toContain('same group');
    expect(rule).toContain('the rule predicts Cs');
  });

  it('walks the set and stops offering Next at the end', () => {
    expect(periodic({ ptIdx: 0, ptPick: 'Li' })
      .querySelector('[data-testid="mol-pt-next"]')).toBeTruthy();
    expect(periodic({ ptIdx: 5, ptPick: 'I' })
      .querySelector('[data-testid="mol-pt-next"]')).toBeNull();
  });

  it('every pair renders and grades exactly one answer correct', () => {
    for (let ptIdx = 0; ptIdx < 6; ptIdx += 1) {
      const question = periodic({ ptIdx });
      const choices = [...question.querySelectorAll('[data-pt-choice]')]
        .map((n) => n.getAttribute('data-pt-choice'));
      expect(choices.length, `pair ${ptIdx}`).toBe(2);

      const verdicts = choices.map((ptPick) =>
        testid(periodic({ ptIdx, ptPick }), 'mol-pt-verdict'));
      const correct = verdicts.filter((v) => v.includes('Correct')).length;
      expect(correct, `pair ${ptIdx} must have exactly one right answer`).toBe(1);
    }
  });

  it('announces the question and the verdict', () => {
    const asked = periodic().querySelector('[data-testid="mol-pt-sr"]');
    expect(asked.getAttribute('aria-live')).toBe('polite');
    expect(asked.textContent).toContain('Which has the larger');

    const answered = periodic({ ptIdx: 4, ptPick: 'O' })
      .querySelector('[data-testid="mol-pt-sr"]').textContent;
    expect(answered).toContain('Not quite');
    expect(answered).toContain('N');
  });

  it('keeps the reference trends table that was already there', () => {
    const el = periodic();
    expect(el.textContent).toContain('Atomic radius');
    expect(el.textContent).toContain('Metallic character');
  });

  it('falls back to a real pair when the stored index is junk', () => {
    for (const ptIdx of [-1, 99, 'banana', null]) {
      expect(testid(periodic({ ptIdx }), 'mol-pt-question'), String(ptIdx)).toBeTruthy();
    }
  });

  it('ignores a pick that is not one of the two choices', () => {
    // A stale ptPick from a previous pair must not grade this one.
    const el = periodic({ ptIdx: 0, ptPick: 'Cs' });
    expect(el.querySelector('[data-testid="mol-pt-verdict"]')).toBeNull();
    expect(el.querySelectorAll('[data-pt-choice]').length).toBe(2);
  });

  it('never leaks NaN for any pair', () => {
    for (let ptIdx = 0; ptIdx < 6; ptIdx += 1) {
      const text = periodic({ ptIdx, ptPick: 'Li' }).textContent;
      expect(text, `pair ${ptIdx}`).not.toMatch(/(^|[\s>(:,=])NaN([\s<),;%]|$)/);
    }
  });
});
