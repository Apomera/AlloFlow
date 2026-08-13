// Titration Lab — the four tabs that had no coverage at all: Buffers, Safety Drills
// (incidents), Equipment, and the Dilution calculator.
//
// The Challenge and Titrate tabs are pinned elsewhere. These four were reachable only
// through the render smoke gate, which proves a tab does not throw and nothing more —
// and the Buffers tab in particular runs real arithmetic behind a discrete verdict.
// Writing these found a live bug in it (see the regression block below).

import fs from 'node:fs';
import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = fs.readFileSync('stem_lab/stem_tool_titration.js', 'utf8');
const M = (() => {
  const head = SRC.slice(0, SRC.indexOf("window.StemLab.registerTool('titrationLab'"));
  const win = { StemLab: {} };
  const doc = { getElementById: () => ({}), createElement: () => ({ style: {} }), head: { appendChild() {} } };
  return new Function('window', 'document',
    head + '; return { bufferAfterStrongAcid, GLASSWARE, mlHeightMm, tolPercent };')(win, doc);
})();

function renderTab(labTab, state) {
  return renderTool('titrationLab', {
    titrationLab: Object.assign({ safetyChecked: true, labTab }, state),
  });
}
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_titration.js', 'titrationLab'); });

// ── Buffers ──────────────────────────────────────────────────────────────────
const TOTAL = 1.0, SPIKE = 0.2;
const after = (pKa, ratio) => M.bufferAfterStrongAcid(Math.pow(10, -pKa), ratio, TOTAL, SPIKE);

describe('buffer capacity model', () => {
  it('an equimolar buffer sits at pKa and barely moves', () => {
    const r = after(5, 1);
    expect(r.pHBefore).toBeCloseTo(5, 10);          // pH = pKa when [A-] = [HA]
    expect(r.exhausted).toBe(false);
    expect(Math.abs(r.pHAfter - r.pHBefore)).toBeLessThan(0.5);
  });

  it('Henderson-Hasselbalch still governs while both members survive', () => {
    // [A-]/[HA] = 4 -> HA 0.2, A- 0.8; a 0.2 spike leaves 0.4 / 0.6.
    const r = after(5, 4);
    expect(r.pHBefore).toBeCloseTo(5 + Math.log10(4), 10);
    expect(r.pHAfter).toBeCloseTo(5 + Math.log10(0.6 / 0.4), 10);
    expect(r.exhausted).toBe(false);
  });

  // REGRESSION. The tab clamped [A-] to 0.001 M and kept applying H-H even after the
  // spike had consumed every last bit of conjugate base. A destroyed buffer was still
  // being described by the buffer equation, and the pH shifts it printed — the very
  // numbers the tab tells students to log and reason from — were wrong by more than a
  // full pH unit in BOTH directions.
  describe('once the conjugate base runs out', () => {
    it('flags the buffer as exhausted rather than quietly clamping', () => {
      expect(after(5, 0.1).exhausted).toBe(true);   // A- = 0.09 < 0.2 spike
      expect(after(5, 0.5).exhausted).toBe(false);  // A- = 0.33 > 0.2 spike
    });

    it('lets the leftover strong acid set the pH', () => {
      // ratio 0.1 -> HA 0.909, A- 0.0909. The 0.2 spike wipes out the A- and leaves
      // 0.109 M free strong acid, so the pH is essentially -log10(0.109) = 0.96.
      const r = after(5, 0.1);
      expect(r.pHAfter).toBeCloseTo(0.96, 1);
      // The old clamp reported ~2.0 here, understating the collapse by a full unit.
      expect(r.pHAfter).toBeLessThan(1.5);
    });

    it('does not overstate the collapse either', () => {
      // ratio 0.25 -> A- = 0.2 exactly: the spike is precisely absorbed, nothing over.
      const r = after(5, 0.25);
      expect(r.exhausted).toBe(false);
      // The old clamp drove this to ~1.3 via log10(0.001/1.2); with the A- exactly
      // consumed the honest answer is the weak acid on its own, near pH 2.5.
      expect(r.pHAfter).toBeCloseTo(2.5, 1);
    });

    it('stays continuous across the exhaustion boundary', () => {
      // A step here would be a modelling seam a student could see in the log table.
      let prev = after(5, 0.20).pHAfter;
      for (let ratio = 0.21; ratio <= 0.40001; ratio += 0.01) {
        const cur = after(5, ratio).pHAfter;
        expect(cur).toBeGreaterThan(prev - 1e-9);     // monotonically rising
        expect(cur - prev).toBeLessThan(0.75);        // and no jump
        prev = cur;
      }
    });
  });

  it('is monotone in the ratio across the whole slider range', () => {
    let prev = -Infinity;
    for (let ratio = 0.05; ratio <= 20.0001; ratio += 0.05) {
      const cur = after(5, ratio).pHAfter;
      expect(cur).toBeGreaterThan(prev - 1e-9);
      prev = cur;
    }
  });

  it('never returns a pH outside 0-14 anywhere on the slider grid', () => {
    for (let pKa = 2; pKa <= 12.0001; pKa += 0.5) {
      for (let ratio = 0.05; ratio <= 20.0001; ratio += 0.25) {
        const r = after(pKa, ratio);
        expect(Number.isFinite(r.pHAfter)).toBe(true);
        expect(r.pHAfter).toBeGreaterThanOrEqual(0);
        expect(r.pHAfter).toBeLessThanOrEqual(14);
      }
    }
  });

  it('a buffer far from its pKa is the one that fails', () => {
    // The discovery the tab is built around: strong buffering near pKa (ratio ~ 1),
    // failure once the ratio is lopsided.
    const near = after(5, 1), far = after(5, 0.05);
    expect(Math.abs(near.pHAfter - near.pHBefore)).toBeLessThan(1.0);
    expect(Math.abs(far.pHAfter - far.pHBefore)).toBeGreaterThan(1.0);
  });
});

describe('buffers tab renders its verdict', () => {
  it('reports a holding buffer at the equimolar default', () => {
    const html = renderTab('buffers', { buffers: { ka: 1e-5, ratio: 1.0, log: [] } });
    expect(html).toContain('GOOD BUFFER');
    expect(html).toContain('Buffer is holding');
  });

  it('reports failure, and names exhaustion when that is what happened', () => {
    const html = renderTab('buffers', { buffers: { ka: 1e-5, ratio: 0.1, log: [] } });
    expect(html).toContain('POOR BUFFER');
    expect(html).toContain('ran out completely');
  });

  it('describes only the sliders that are actually controls', () => {
    const html = renderTab('buffers', { buffers: { ka: 1e-5, ratio: 1.0, log: [] } });
    expect(html).toContain('Two sliders you control');
    expect(html).not.toContain('Three sliders');
    expect(html).toContain('is a readout, not a control');
  });

  it('logs observations into a scoped table', () => {
    const html = renderTab('buffers', {
      buffers: { ka: 1e-5, ratio: 1.0, log: [{ pKa: 5, ratio: 1, pH: 5, shift: 0.37, good: true }] },
    });
    expect(html).toContain('scope="col"');
    expect(html).toContain('1 observations logged');
  });
});

// ── Safety drills (incidents) ────────────────────────────────────────────────
describe('safety drills tab', () => {
  it('poses a scenario with selectable responses', () => {
    const html = renderTab('incidents', { incidentIdx: 0 });
    expect(html).toContain('Acid Splash on Skin');
    expect(/aria-label="[^"]*"/.test(html)).toBe(true);
  });

  // The first-aid content is the point; a wrong answer must be corrected, not just scored.
  it('explains why the wrong response is wrong', () => {
    const html = renderTab('incidents', { incidentIdx: 0, incidentAnswer: 'wipe' });
    expect(html).toContain('Wiping can spread the acid');
  });

  it('confirms the correct response', () => {
    const html = renderTab('incidents', { incidentIdx: 0, incidentAnswer: 'rinse' });
    expect(html).toContain('Immediate and prolonged rinsing');
  });

  it('every scenario has exactly one correct option', () => {
    // A scenario with two correct options (or none) would be unanswerable. Counted over
    // the whole bank rather than trusting the first card: one `correct: true` per
    // scenario, and every scenario's `correct:` id must name an option that exists.
    const bank = SRC.slice(SRC.indexOf('var incidentScenarios'), SRC.indexOf('var labEquipment'));
    const scenarios = (bank.match(/^  \{ id: '/gm) || []).length;
    const correctFlags = (bank.match(/correct: true/g) || []).length;
    expect(scenarios).toBeGreaterThan(3);
    expect(correctFlags).toBe(scenarios);

    const namedCorrect = bank.match(/correct: '([a-z_]+)'/g) || [];
    expect(namedCorrect.length).toBe(scenarios);
    for (const nc of namedCorrect) {
      const id = nc.match(/'([a-z_]+)'/)[1];
      expect(bank).toContain("{ id: '" + id + "'");
    }
  });
});

// ── Equipment ────────────────────────────────────────────────────────────────
describe('equipment tab', () => {
  it('lists the glassware with its tolerances', () => {
    const html = renderTab('equipment', {});
    expect(html).toContain('Burette');
    expect(/[Pp]ipette/.test(html)).toBe(true);
    expect(html).toContain('0.05');            // class A burette tolerance
  });

  it('opens a detail view for a selected item', () => {
    const plain = renderTab('equipment', {});
    const picked = renderTab('equipment', { selectedEquip: 'burette' });
    expect(picked.length).not.toBe(plain.length);
  });
});

// The bench turns the tolerance column from a list to memorise into a consequence of
// bore. Its claim is arithmetic, so the arithmetic is what gets pinned.
describe('glassware bench geometry', () => {
  it('1 mL height follows 1000 / (pi r squared)', () => {
    expect(M.mlHeightMm(11)).toBeCloseTo(1000 / (Math.PI * 5.5 * 5.5), 10);
    expect(M.mlHeightMm(11)).toBeCloseTo(10.52, 2);   // burette bore
    expect(M.mlHeightMm(70)).toBeCloseTo(0.26, 2);    // 250 mL beaker
  });

  // Sanity against the real instrument: 50 mL at 10.5 mm per mL is a ~52 cm barrel,
  // which is what a 50 mL burette actually measures. A bore of 10 mm implied 64 cm.
  it('implies a burette barrel of a believable length', () => {
    const burette = M.GLASSWARE.find((g) => g.id === 'burette');
    const barrelCm = (M.mlHeightMm(burette.boreMm) * burette.capMl) / 10;
    expect(barrelCm).toBeGreaterThan(45);
    expect(barrelCm).toBeLessThan(58);
  });

  it('ranks the vessels the way a catalogue does', () => {
    // Narrower bore -> taller millilitre -> finer tolerance as a share of capacity.
    const byBore = M.GLASSWARE.slice().sort((a, b) => a.boreMm - b.boreMm);
    for (let i = 1; i < byBore.length; i++) {
      expect(M.mlHeightMm(byBore[i].boreMm)).toBeLessThan(M.mlHeightMm(byBore[i - 1].boreMm));
    }
    const burette = M.GLASSWARE.find((g) => g.id === 'burette');
    const beaker = M.GLASSWARE.find((g) => g.id === 'beaker');
    expect(M.tolPercent(burette)).toBeLessThan(M.tolPercent(beaker));
    expect(M.mlHeightMm(burette.boreMm) / M.mlHeightMm(beaker.boreMm)).toBeGreaterThan(35);
  });

  it('is safe on a zero or negative bore', () => {
    expect(M.mlHeightMm(0)).toBe(0);
    expect(M.mlHeightMm(-5)).toBe(0);
    expect(M.tolPercent({ capMl: 0, tolMl: 1 })).toBe(0);
  });

  it('renders the comparison as a table, so it survives without WebGL', () => {
    const html = renderTab('equipment', { benchSel: 'burette' });
    expect(html).toContain('WHY THE TOLERANCES DIFFER');
    expect(html).toContain('10.5 mm');          // burette, in the table
    expect(html).toContain('0.3 mm');           // beaker
    expect(html).toContain('scope="col"');
    // jsdom has no WebGL, so the fallback line must be the thing on screen.
    expect(html).toContain('The 3D bench needs WebGL');
  });

  it('the punchline names the selected vessel and stays numerically honest', () => {
    const html = renderTab('equipment', { benchSel: 'beaker' });
    expect(html).toContain('beaker, 250 ml');   // lower-cased into the sentence
    expect(html).toContain('0.3 mm tall');
  });
});

// ── Dilution calculator ──────────────────────────────────────────────────────
describe('dilution calculator', () => {
  // C1V1 = C2V2. The tab's own worked example: 1.0 M stock down to 0.1 M in 10 mL
  // needs 1.0 mL of stock and 9.0 mL of water.
  it('solves the standard worked example', () => {
    const html = renderTab('molarity', { molarityC1: 1.0, molarityV1: 10, molarityC2: 0.1 });
    expect(html).toContain('1.0');
    expect(html).toContain('Add to the final mark');
  });

  it('handles a 100-fold dilution without losing precision', () => {
    const html = renderTab('molarity', { molarityC1: 1.0, molarityV1: 100, molarityC2: 0.01 });
    expect(html).toContain('1.0');
  });

  // Number('') === 0, which has bitten this codebase repeatedly: a cleared field must
  // not silently become a zero-concentration stock and divide by it.
  it('does not blow up on a cleared or zero field', () => {
    for (const bad of [0, '', null, undefined]) {
      const html = renderTab('molarity', { molarityC1: bad, molarityV1: 10, molarityC2: 0.1 });
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('Infinity');
    }
  });
});
