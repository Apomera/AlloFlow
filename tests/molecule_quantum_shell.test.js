// Molecule — the live quantum shell explorer.
//
// WHY THIS FILE EXISTS
// QUANTUM_REF states the four rules as text, and a second card hard-codes the orbital
// counts as [1, 3, 5, 7]. Those counts are not separate facts: they are 2ℓ+1, and the
// famous 2n² electrons-per-shell falls OUT of the four rules. The explorer derives all
// of it so a student can see where the numbers come from.
//
// The section is tab-gated (molecule opens with expSection = null), so
// dev-tools/check_stem_render.cjs never builds it and the render goldens never see it.
//
// The assertions here are mathematical identities, not the model's own output - most
// importantly that the summed subshell capacities equal 2n² independently computed.

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

function quantum(state = {}) {
  return frag(renderTool('molecule', {
    molecule: { expSection: 'quantum', referenceLibraryOpen: true, ...state },
  }));
}

const testid = (el, id) => {
  const node = el.querySelector(`[data-testid="${id}"]`);
  return node ? node.textContent.replace(/\s+/g, ' ') : null;
};

describe('Quantum shell model (pure)', () => {
  let pure;

  beforeAll(() => {
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
    pure = window.__alloMoleculePure;
  });

  it('gives 2ℓ+1 orbitals per subshell', () => {
    expect(pure.orbitalsInSubshell(0)).toBe(1);   // s
    expect(pure.orbitalsInSubshell(1)).toBe(3);   // p
    expect(pure.orbitalsInSubshell(2)).toBe(5);   // d
    expect(pure.orbitalsInSubshell(3)).toBe(7);   // f
    // The hard-coded [1,3,5,7] card above must agree with the formula.
    expect([0, 1, 2, 3].map(pure.orbitalsInSubshell)).toEqual([1, 3, 5, 7]);
  });

  it('enumerates mₗ from −ℓ to +ℓ inclusive', () => {
    expect(pure.magneticValues(0)).toEqual([0]);
    expect(pure.magneticValues(1)).toEqual([-1, 0, 1]);
    expect(pure.magneticValues(2)).toEqual([-2, -1, 0, 1, 2]);
    // Count must always match 2ℓ+1 - the two rules are the same rule.
    for (let l = 0; l <= 5; l += 1) {
      expect(pure.magneticValues(l).length).toBe(pure.orbitalsInSubshell(l));
    }
  });

  it('runs ℓ from 0 to n−1, so 1p and 2d cannot exist', () => {
    expect(pure.subshellsInShell(1).map((s) => s.label)).toEqual(['1s']);
    expect(pure.subshellsInShell(2).map((s) => s.label)).toEqual(['2s', '2p']);
    expect(pure.subshellsInShell(3).map((s) => s.label)).toEqual(['3s', '3p', '3d']);
    expect(pure.subshellsInShell(4).map((s) => s.label)).toEqual(['4s', '4p', '4d', '4f']);
    // Shell n has exactly n subshells.
    for (let n = 1; n <= 6; n += 1) {
      expect(pure.subshellsInShell(n).length).toBe(n);
    }
  });

  it('DERIVES 2n² instead of asserting it', () => {
    // The whole point. Summing 2(2ℓ+1) over ℓ = 0…n−1 must equal 2n²,
    // computed here independently of the model.
    for (let n = 1; n <= 6; n += 1) {
      expect(pure.shellCapacity(n), `shell ${n}`).toBe(2 * n * n);
    }
    expect(pure.shellCapacity(4)).toBe(32);
  });

  it('shows the derivation, so 2n² is a RESULT not an input', () => {
    // A plain `shellCapacity(n) === 2*n*n` assertion is satisfied just as well by
    // `return 2*n*n`, which would turn the derivation back into the asserted fact
    // this panel exists to unpack. The two are indistinguishable from the total
    // alone - they differ in whether the PARTS are shown and add up.
    //
    // So the guard lives on the rendered sum: "2 + 6 + 10 + 14 = 32" is only
    // producible by walking the subshells. A closed form has no parts to print.
    // (Checked in the render describe below via mol-qn-capacity; here we pin the
    // per-subshell rule the sum is built from.)
    for (let n = 1; n <= 5; n += 1) {
      const subs = pure.subshellsInShell(n);
      expect(subs.length, `shell ${n} must expose its parts`).toBe(n);
      const summed = subs.reduce((total, sub) => total + sub.electrons, 0);
      expect(pure.shellCapacity(n)).toBe(summed);
      for (const sub of subs) {
        // 2 electrons x (2l+1) orbitals - the rule, not a lookup.
        expect(sub.electrons).toBe(2 * (2 * sub.l + 1));
      }
    }
  });

  it('puts 2 electrons in every orbital (Pauli)', () => {
    for (const sub of pure.subshellsInShell(4)) {
      expect(sub.electrons).toBe(2 * sub.orbitals);
    }
  });

  it('names the FIRST rule broken, not just "invalid"', () => {
    // A student who picks ℓ = 2 with n = 2 needs to be told WHICH rule.
    expect(pure.validateQuantumSet(3, 2, 1, 0.5).ok).toBe(true);

    const badL = pure.validateQuantumSet(2, 2, 0, 0.5);
    expect(badL.ok).toBe(false);
    expect(badL.rule).toContain('n−1');
    expect(badL.rule).toContain('largest allowed ℓ is 1');

    const badMl = pure.validateQuantumSet(3, 1, 2, 0.5);
    expect(badMl.ok).toBe(false);
    expect(badMl.rule).toContain('mₗ');

    const badSpin = pure.validateQuantumSet(3, 1, 0, 1);
    expect(badSpin.ok).toBe(false);
    expect(badSpin.rule).toContain('mₛ');

    const badN = pure.validateQuantumSet(0, 0, 0, 0.5);
    expect(badN.ok).toBe(false);
    expect(badN.rule).toContain('n must be');
  });

  it('accepts every legal set it can generate', () => {
    // Self-consistency: anything the model builds must validate.
    for (let n = 1; n <= 4; n += 1) {
      for (const sub of pure.subshellsInShell(n)) {
        for (const ml of pure.magneticValues(sub.l)) {
          for (const ms of [0.5, -0.5]) {
            expect(
              pure.validateQuantumSet(n, sub.l, ml, ms).ok,
              `n=${n} l=${sub.l} ml=${ml} ms=${ms}`
            ).toBe(true);
          }
        }
      }
    }
  });

  it('refuses non-integer and negative inputs', () => {
    expect(Number.isNaN(pure.orbitalsInSubshell(-1))).toBe(true);
    expect(Number.isNaN(pure.orbitalsInSubshell(1.5))).toBe(true);
    expect(pure.subshellsInShell(0)).toEqual([]);
    expect(Number.isNaN(pure.shellCapacity(0))).toBe(true);
  });
});

describe('Quantum section — the shell explorer renders', () => {
  beforeAll(() => {
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
  });

  it('offers a named shell slider that speaks its value', () => {
    const el = quantum();
    const slider = el.querySelector('#qn-shell');
    expect(slider).toBeTruthy();
    expect(slider.getAttribute('type')).toBe('range');
    expect(slider.getAttribute('aria-label')).toBeTruthy();
    expect(slider.getAttribute('aria-valuetext')).toContain('electrons');
  });

  it('shows one row per subshell, with the 2ℓ+1 working visible', () => {
    const el = quantum({ qnShell: 3 });
    const rows = el.querySelectorAll('[data-qn-sub]');
    expect([...rows].map((r) => r.getAttribute('data-qn-sub'))).toEqual(['3s', '3p', '3d']);
    // The arithmetic must be on screen, not just its answer.
    expect(testid(el, 'mol-qn-subshells')).toContain('2(2)+1 = 5');
    expect(testid(el, 'mol-qn-subshells')).toContain('mₗ = -2, -1, 0, 1, 2');
  });

  it('adds exactly one subshell per step up the slider', () => {
    for (const n of [1, 2, 3, 4, 5, 6]) {
      const rows = quantum({ qnShell: n }).querySelectorAll('[data-qn-sub]');
      expect(rows.length, `n=${n}`).toBe(n);
    }
  });

  it('shows the capacity as a SUM that lands on 2n²', () => {
    const el = quantum({ qnShell: 4 });
    const cap = testid(el, 'mol-qn-capacity');
    expect(cap).toContain('2 + 6 + 10 + 14 = 32');
    expect(cap).toContain('2n²');
    expect(cap).toContain('2 × 4² = 32');
  });

  it('holds that identity at every shell', () => {
    for (const n of [1, 2, 3, 5]) {
      const cap = testid(quantum({ qnShell: n }), 'mol-qn-capacity');
      expect(cap, `n=${n}`).toContain(`= ${2 * n * n} e⁻`);
    }
  });

  it('separates "exists" from "fills first" once d subshells appear', () => {
    // 4s filling before 3d is the standard confusion, and it is NOT what this
    // panel shows - so it says so rather than leaving the wrong impression.
    expect(quantum({ qnShell: 2 }).querySelector('[data-testid="mol-qn-note"]')).toBeNull();
    const note = testid(quantum({ qnShell: 3 }), 'mol-qn-note');
    expect(note).toContain('4s fills before 3d');
    expect(note).toContain('EXIST');
  });

  it('keeps the reference cards that were already there', () => {
    const el = quantum();
    expect(el.textContent).toContain('Principal (n)');
    expect(el.textContent).toContain('Azimuthal');
    expect(el.textContent).toContain('Pauli');
  });

  it('announces the derived shell in one utterance', () => {
    // The shell renders its own [role="status"], so target this panel's region.
    const status = quantum({ qnShell: 3 }).querySelector('[data-testid="mol-qn-sr"]');
    expect(status).toBeTruthy();
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toContain('3s, 3p, 3d');
    expect(status.textContent).toContain('18 electrons');
  });

  it('never leaks NaN across the whole slider range', () => {
    for (let n = 1; n <= 6; n += 1) {
      const text = quantum({ qnShell: n }).textContent;
      expect(text, `n=${n}`).not.toMatch(/(^|[\s>(:,=])NaN([\s<),;%]|$)/);
    }
  });

  it('falls back to a sane shell when the stored value is junk', () => {
    for (const qnShell of [0, 99, -3, 'banana', null]) {
      const rows = quantum({ qnShell }).querySelectorAll('[data-qn-sub]');
      expect(rows.length, String(qnShell)).toBeGreaterThan(0);
      expect(rows.length).toBeLessThanOrEqual(6);
    }
  });
});
