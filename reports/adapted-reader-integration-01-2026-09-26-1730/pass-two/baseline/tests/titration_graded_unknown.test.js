// Titration Lab — the graded unknown-determination mode and the burette parallax
// model behind it.
//
// Two layers are covered on purpose:
//
//  * The MODEL (parallax mL, seeded unknowns, unknown pH curves, endpoint
//    observation, grading) is plain arithmetic at module scope. It is loaded in a
//    sandbox and exercised directly, because the properties that matter — an even
//    spread of unknowns over thousands of runs, a strictly monotone pH curve at
//    0.001 mL sampling — need far more iterations than a render test can carry.
//    Every one of these caught a real bug during the build.
//
//  * The RENDER, through the same harness the rest of the suite uses, so the
//    numbers the model produces are the numbers a student actually sees.
//
// The 3D station is deliberately NOT the thing under test: it is a picture of the
// model, WebGL does not exist in jsdom, and the accessible side elevation plus the
// numeric readout are what must survive that. So the tests assert the fallback.

import fs from 'node:fs';
import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// ── Model under test, loaded without the browser half of the file ────────────
const SRC = fs.readFileSync('stem_lab/stem_tool_titration.js', 'utf8');
const M = (() => {
  const head = SRC.slice(0, SRC.indexOf("window.StemLab.registerTool('titrationLab'"));
  const win = { StemLab: {} };
  const doc = { getElementById: () => ({}), createElement: () => ({ style: {} }), head: { appendChild() {} } };
  return new Function('window', 'document', head + `; return {
    BURETTE, BUR3D, buretteParallaxMl, roundBuretteReading, readBurette,
    titreFromReadings, titrLcg, UNKNOWN_SPECS,
    makeUnknown, gradeUnknown, unknownPH, findEndpointVb, endpointObservation,
    replicateStats, precisionAccuracy, systematicDiagnosis };`)(win, doc);
})();

// Indicator bands, mirrored from the tool's own indicator table.
const BANDS = {
  phenolphthalein: [8.2, 10.0], methylOrange: [3.1, 4.4],
  bromothymolBlue: [6.0, 7.6], methylRed: [4.4, 6.2],
};
const rises = (spec) => !!(spec.Ka || spec.strong === 'acid');
const endPHof = (spec) => (rises(spec) ? BANDS[spec.indicator][0] : BANDS[spec.indicator][1]);
// First seed that draws a given unknown, so each spec can be exercised concretely.
function seedFor(id) {
  for (let s = 1; s < 4000; s++) if (M.makeUnknown(s).spec.id === id) return s;
  throw new Error('no seed draws ' + id);
}

describe('burette parallax — the model behind the 3D station', () => {
  it('reads exact at eye level', () => {
    expect(M.buretteParallaxMl(0)).toBe(0);
    expect(M.readBurette(25, 0)).toBe(25);
  });

  // The lab rule the tool has always stated in a text tip, now enforced by the sim.
  it('eye ABOVE the meniscus reads LOW, eye below reads high', () => {
    expect(M.buretteParallaxMl(5)).toBeLessThan(0);
    expect(M.buretteParallaxMl(-5)).toBeGreaterThan(0);
    expect(M.readBurette(25, 10)).toBeLessThan(25);
    expect(M.readBurette(25, -10)).toBeGreaterThan(25);
  });

  // h·d/L with d = 0.5 cm (half a 1 cm bore) and L = 30 cm: 5 cm off-level costs
  // 0.083 mL, which is already over a class A burette's whole tolerance.
  it('matches the similar-triangles geometry', () => {
    expect(M.buretteParallaxMl(5)).toBeCloseTo(-0.0833, 4);
    expect(M.buretteParallaxMl(-20)).toBeCloseTo(0.3333, 4);
  });

  it('3 cm off-level spends the entire burette tolerance', () => {
    expect(Math.abs(M.buretteParallaxMl(3))).toBeCloseTo(M.BURETTE.TOLERANCE_ML, 10);
    expect(Math.abs(M.buretteParallaxMl(4))).toBeGreaterThan(M.BURETTE.TOLERANCE_ML);
  });

  it('clamps rather than extrapolating off the bench', () => {
    expect(M.buretteParallaxMl(999)).toBe(M.buretteParallaxMl(M.BURETTE.MAX_EYE_CM));
    expect(M.buretteParallaxMl(NaN)).toBe(0);
    expect(M.readBurette(0, 20)).toBeGreaterThanOrEqual(0);   // never negative
  });

  it('records absolute readings to 0.01 mL and calculates titre from visible values', () => {
    expect(M.roundBuretteReading(12.346)).toBeCloseTo(12.35, 10);
    const r = M.titreFromReadings(1.23, 20.126, 0, 0);
    expect(r.initial).toBeCloseTo(1.23, 10);
    expect(r.final).toBeCloseTo(21.36, 10);
    expect(r.titre).toBeCloseTo(20.13, 10);
  });

  it('cancels the same sight-line offset but preserves a changed-eye shift', () => {
    const same = M.titreFromReadings(2, 20, 10, 10);
    expect(same.titre).toBeCloseTo(20, 10);

    const changed = M.titreFromReadings(2, 20, 0, 10);
    const predicted = M.buretteParallaxMl(10) - M.buretteParallaxMl(0);
    expect(changed.titre - 20).toBeCloseTo(predicted, 2);
    expect(changed.titre).toBeCloseTo(19.83, 10);
  });
});

describe('seeded unknowns', () => {
  it('is deterministic — a class can all be given run 7', () => {
    const a = M.makeUnknown(7), b = M.makeUnknown(7);
    expect(a.spec.id).toBe(b.spec.id);
    expect(a.truthConc).toBe(b.truthConc);
    expect(a.trueVb).toBe(b.trueVb);
  });

  // REGRESSION: a raw LCG's first output is linear in its seed, so consecutive run
  // numbers drew nearly identical values and runs 1-35 every one served vinegar.
  it('spreads across all four unknowns instead of repeating one', () => {
    const tally = {};
    for (let s = 1; s <= 40; s++) {
      const id = M.makeUnknown(s).spec.id;
      tally[id] = (tally[id] || 0) + 1;
    }
    expect(Object.keys(tally).length).toBe(M.UNKNOWN_SPECS.length);
    expect(Math.max(...Object.values(tally))).toBeLessThanOrEqual(20);
  });

  it('stays balanced over 2000 runs', () => {
    const tally = {};
    for (let s = 1; s <= 2000; s++) {
      const id = M.makeUnknown(s).spec.id;
      tally[id] = (tally[id] || 0) + 1;
    }
    for (const spec of M.UNKNOWN_SPECS) expect(tally[spec.id]).toBeGreaterThan(350);
  });

  it('always lands inside the real product range and on a reachable burette', () => {
    for (let s = 1; s <= 400; s++) {
      const u = M.makeUnknown(s);
      expect(u.truthConc).toBeGreaterThanOrEqual(u.spec.lo - 1e-9);
      expect(u.truthConc).toBeLessThanOrEqual(u.spec.hi + 1e-9);
      expect(u.trueVb).toBeGreaterThan(2);
      expect(u.trueVb).toBeLessThan(50);          // a 50 mL burette must be enough
    }
  });
});

describe('unknown pH curves', () => {
  // REGRESSION x3. The weak-base branch took min() where it needed max(), so a base
  // got MORE basic as acid went in and half-equivalence read 11.07 instead of 9.26.
  // Separately, both the buffer formula and the excess formula are asymptotic
  // approximations that blow past the equivalence pH beside it, which put a
  // backward step of up to 1.4 pH units right at the endpoint — exactly where the
  // student is looking.
  for (const spec of M.UNKNOWN_SPECS) {
    it(spec.id + ': moves monotonically, with no dip at the endpoint', () => {
      const u = M.makeUnknown(seedFor(spec.id));
      const dir = rises(spec) ? 1 : -1;
      let prev = M.unknownPH(spec, u.flaskConc, 0);
      for (let v = 0; v <= u.trueVb * 2; v += 0.001) {
        const ph = M.unknownPH(spec, u.flaskConc, v);
        expect(dir * (ph - prev)).toBeGreaterThanOrEqual(-1e-9);
        prev = ph;
      }
    });

    it(spec.id + ': breaks sharply enough to see an endpoint', () => {
      const u = M.makeUnknown(seedFor(spec.id));
      const jump = Math.abs(M.unknownPH(spec, u.flaskConc, u.trueVb * 1.02)
        - M.unknownPH(spec, u.flaskConc, u.trueVb * 0.98));
      expect(jump).toBeGreaterThan(1.0);
    });

    // A run is only fair if the indicator it hands you actually turns at equivalence.
    it(spec.id + ': its indicator straddles its equivalence pH', () => {
      const u = M.makeUnknown(seedFor(spec.id));
      const eqPH = M.unknownPH(spec, u.flaskConc, u.trueVb);
      const [lo, hi] = BANDS[spec.indicator];
      expect(eqPH).toBeGreaterThanOrEqual(lo);
      expect(eqPH).toBeLessThanOrEqual(hi);
    });
  }

  it('half-equivalence sits on pKa for a weak acid and pKb for a weak base', () => {
    const vin = M.makeUnknown(seedFor('vinegar'));
    expect(M.unknownPH(vin.spec, vin.flaskConc, vin.trueVb / 2))
      .toBeCloseTo(-Math.log10(vin.spec.Ka), 2);
    const amm = M.makeUnknown(seedFor('ammonia'));
    expect(M.unknownPH(amm.spec, amm.flaskConc, amm.trueVb / 2))
      .toBeCloseTo(14 + Math.log10(amm.spec.Kb), 2);
  });

  it('a strong acid equivalence is exactly pH 7', () => {
    const u = M.makeUnknown(seedFor('poolacid'));
    expect(M.unknownPH(u.spec, u.flaskConc, u.trueVb)).toBe(7);
  });
});

describe('endpoint observation is reachable', () => {
  // REGRESSION: keyed to pH bands, the "faint persistent colour" state was about a
  // fifth of a drop wide, so one drop could jump from "nothing yet" to "you
  // overshot" and the endpoint could never actually be observed.
  for (const spec of M.UNKNOWN_SPECS) {
    it(spec.id + ': one warning drop, then at least two endpoint drops', () => {
      const u = M.makeUnknown(seedFor(spec.id));
      const endVb = M.findEndpointVb(spec, u.flaskConc, endPHof(spec), rises(spec));
      const seen = {};
      for (let v = 0; v <= 50; v += M.BURETTE.DROP_ML) {
        const k = M.endpointObservation(v, endVb);
        seen[k] = (seen[k] || 0) + 1;
      }
      expect(seen.flash).toBeGreaterThanOrEqual(1);
      expect(seen.endpoint).toBeGreaterThanOrEqual(2);
      expect(seen.none).toBeGreaterThan(0);
      expect(seen.over).toBeGreaterThan(0);
    });

    it(spec.id + ': stopping at the first lasting colour is within tolerance', () => {
      const u = M.makeUnknown(seedFor(spec.id));
      const endVb = M.findEndpointVb(spec, u.flaskConc, endPHof(spec), rises(spec));
      expect(Math.abs(endVb - u.trueVb)).toBeLessThanOrEqual(M.BURETTE.TOLERANCE_ML);
    });
  }
});

describe('grading', () => {
  it('an exact volume recovers the concentration exactly', () => {
    const u = M.makeUnknown(3);
    const g = M.gradeUnknown(u, u.trueVb);
    expect(g.measuredConc).toBeCloseTo(u.truthConc, 12);
    expect(g.concErrPct).toBeCloseTo(0, 9);
    expect(g.withinTolerance).toBe(true);
    expect(g.band).toBe('excellent');
  });

  it('reports the concentration cost of a reading error', () => {
    const u = M.makeUnknown(3);
    const g = M.gradeUnknown(u, M.readBurette(u.trueVb, 20));   // eye 20 cm high
    expect(g.volErrMl).toBeLessThan(0);                          // read low
    expect(g.measuredConc).toBeLessThan(u.truthConc);            // so answered low
    expect(g.withinTolerance).toBe(false);
  });

  it('scales the answer back up through the dilution', () => {
    // The flask holds the diluted aliquot; the reported answer is for the product.
    const u = M.makeUnknown(seedFor('vinegar'));
    expect(u.spec.dilutionFactor).toBeGreaterThan(1);
    expect(u.flaskConc).toBeCloseTo(u.truthConc / u.spec.dilutionFactor, 12);
    expect(M.gradeUnknown(u, u.trueVb).measuredConc).toBeCloseTo(u.truthConc, 12);
  });

  it('bands widen monotonically with the error', () => {
    const u = M.makeUnknown(3);
    const band = (dv) => M.gradeUnknown(u, u.trueVb + dv).band;
    expect(band(0.02)).toBe('excellent');
    expect(band(0.10)).toBe('good');
    expect(band(0.30)).toBe('fair');
    expect(band(2.00)).toBe('poor');
  });
});

describe('replicates — precision is scored apart from accuracy', () => {
  it('computes mean, range and sample standard deviation', () => {
    const s = M.replicateStats([21.20, 21.25, 21.30]);
    expect(s.n).toBe(3);
    expect(s.mean).toBeCloseTo(21.25, 10);
    expect(s.spread).toBeCloseTo(0.10, 10);
    expect(s.sd).toBeCloseTo(0.05, 10);          // n-1 denominator
  });

  it('survives degenerate inputs', () => {
    expect(M.replicateStats([]).n).toBe(0);
    const one = M.replicateStats([21.25]);
    expect(one.sd).toBe(0);                       // not NaN from dividing by n-1 = 0
    expect(one.spread).toBe(0);
  });

  // REGRESSION: readings are quantised to 0.01 mL, so a spread of exactly the 0.10 mL
  // concordance criterion is the single most likely value to land on — and it came out
  // of the subtraction as 0.10000000000000142, i.e. judged NOT concordant.
  it('treats a spread of exactly the concordance limit as concordant', () => {
    const s = M.replicateStats([21.05, 21.10, 21.15]);
    expect(s.spread).toBeGreaterThan(M.BURETTE.CONCORDANCE_ML - 1e-6);
    expect(M.precisionAccuracy(s, 21.10).precise).toBe(true);
  });

  it('one trial is never called precise', () => {
    expect(M.precisionAccuracy(M.replicateStats([21.25]), 21.25).precise).toBe(false);
  });

  // A fixed non-level eye position affects both absolute readings equally, so it
  // cancels in final - initial. Precision and accuracy must therefore stay intact.
  it('does not invent a titre bias when both readings use the same eye height', () => {
    const u = M.makeUnknown(1);
    const trials = [-0.05, 0.0, 0.05, 0.0].map((j) => {
      const r = M.titreFromReadings(2, u.trueVb + j, 10, 10);
      return {
        initialEyeCm: 10, finalEyeCm: 10,
        initialRecorded: r.initial, finalRecorded: r.final, recorded: r.titre,
      };
    });
    const stats = M.replicateStats(trials.map((t) => t.recorded));
    const pa = M.precisionAccuracy(stats, u.trueVb);
    expect(pa.verdict).toBe('both');
    expect(pa.biasMl).toBeCloseTo(0, 2);
    expect(M.systematicDiagnosis(trials, pa.biasMl)).toBeNull();
  });

  // Moving the eye between the two readings does not cancel. Repeating that change
  // can produce concordant titres which are systematically shifted.
  it('diagnoses a repeated changed sight line only when it explains the bias', () => {
    const u = M.makeUnknown(1);
    const trials = [-0.05, 0.0, 0.05, 0.0].map((j) => {
      const r = M.titreFromReadings(2, u.trueVb + j, 0, 10);
      return {
        initialEyeCm: 0, finalEyeCm: 10,
        initialRecorded: r.initial, finalRecorded: r.final, recorded: r.titre,
      };
    });
    const stats = M.replicateStats(trials.map((t) => t.recorded));
    const pa = M.precisionAccuracy(stats, u.trueVb);
    expect(pa.verdict).toBe('precise-not-accurate');

    const diag = M.systematicDiagnosis(trials, pa.biasMl);
    expect(diag).not.toBeNull();
    expect(diag.kind).toBe('parallax-difference');
    expect(diag.predictedMl).toBeCloseTo(pa.biasMl, 2);
    expect(diag.matchesObserved).toBe(true);

    const mismatch = M.systematicDiagnosis(trials, 0.4);
    expect(mismatch).not.toBeNull();
    expect(mismatch.matchesObserved).toBe(false);
  });

  it('covers the other three quadrants', () => {
    const u = M.makeUnknown(1);
    const verdict = (offs) => M.precisionAccuracy(
      M.replicateStats(offs.map((o) => M.roundBuretteReading(u.trueVb + o))),
      u.trueVb,
    ).verdict;
    expect(verdict([-0.02, 0.01, 0.02])).toBe('both');
    expect(verdict([-0.35, 0.36, -0.02])).toBe('accurate-not-precise');
    expect(verdict([0.25, 0.50, 0.75])).toBe('neither');
  });

  it('requires two complete reading pairs and a non-zero predicted shift', () => {
    const complete = (initial, final) => ({ initialEyeCm: initial, finalEyeCm: final, recorded: 21 });
    expect(M.systematicDiagnosis([complete(0, 10)], -0.17)).toBeNull();
    expect(M.systematicDiagnosis([{ eyeCm: 10, recorded: 21 }, { eyeCm: 10, recorded: 21 }], -0.17)).toBeNull();
    expect(M.systematicDiagnosis([complete(10, 10), complete(10, 10)], 0)).toBeNull();
    expect(M.systematicDiagnosis([complete(0, 10), complete(0, 10)], -0.17)).not.toBeNull();
  });
});

// ── Rendered behaviour ───────────────────────────────────────────────────────
function renderChallenge(state) {
  return renderTool('titrationLab', {
    titrationLab: Object.assign({ safetyChecked: true, labTab: 'challenge' }, state),
  });
}
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_titration.js', 'titrationLab'); });

describe('graded mode, as rendered', () => {
  it('briefs the unknown without leaking the answer', () => {
    const html = renderChallenge({ chMode: 'graded', gRun: 1, gVb: 0, gEyeCm: 0 });
    const u = M.makeUnknown(1);
    expect(html).toContain('Unknown #1');
    expect(html).toContain(u.spec.name);
    expect(html).toContain(u.spec.analyte);
    expect(html).not.toContain(u.truthConc.toPrecision(3));   // truth stays hidden
    expect(html).not.toContain(u.trueVb.toFixed(3));
  });

  // The whole point of the mode: you judge the endpoint the way you would at a bench.
  it('shows no pH readout at all', () => {
    const html = renderChallenge({ chMode: 'graded', gRun: 1, gVb: 5, gEyeCm: 0 });
    expect(html).not.toContain('CURRENT pH');
    expect(html).not.toContain('Cell potential');
  });

  it('walks the observation ladder as titrant goes in', () => {
    const u = M.makeUnknown(1);
    const endVb = M.findEndpointVb(u.spec, u.flaskConc, endPHof(u.spec), rises(u.spec));
    expect(renderChallenge({ chMode: 'graded', gRun: 1, gVb: 1 })).toContain('No colour change yet');
    expect(renderChallenge({ chMode: 'graded', gRun: 1, gVb: endVb - 0.03 })).toContain('disappears when you swirl');
    expect(renderChallenge({ chMode: 'graded', gRun: 1, gVb: endVb + 0.01 })).toContain('PERSISTS after swirling');
    expect(renderChallenge({ chMode: 'graded', gRun: 1, gVb: endVb + 1 })).toContain('gone past the endpoint');
  });

  it('shows initial, final and titre readings, including a changed-eye bias', () => {
    const base = {
      chMode: 'graded', gRun: 1, gInitialTrue: 2.50,
      gInitialLocked: true, gInitialRecorded: 2.50, gInitialEyeCm: 0, gVb: 18.75,
    };
    const level = renderChallenge(Object.assign({}, base, { gEyeCm: 0 }));
    expect(level).toContain('Initial burette reading');
    expect(level).toContain('Final burette reading');
    expect(level).toContain('Titre = final − initial');
    expect(level).toContain('>2.50 mL<');
    expect(level).toContain('>21.25 mL<');
    expect(level).toContain('>18.75 mL<');
    expect(level).toContain('no parallax shift in this reading');

    const high = renderChallenge(Object.assign({}, base, { gEyeCm: 10 }));
    expect(high).toContain('>21.08 mL<');
    expect(high).toContain('>18.58 mL<');
    expect(high).toContain('scale reading is low by 0.167');

    const low = renderChallenge(Object.assign({}, base, { gEyeCm: -10 }));
    expect(low).toContain('>21.42 mL<');
    expect(low).toContain('>18.92 mL<');
    expect(low).toContain('scale reading is high by 0.167');
  });

  it('will not report a result from a single selected trial', () => {
    const trial = (titre, included = true) => ({
      initialRecorded: 2.50, finalRecorded: 2.50 + titre, recorded: titre,
      initialEyeCm: 0, finalEyeCm: 0, endpointState: 'endpoint', included,
    });
    const one = renderChallenge({ chMode: 'graded', gRun: 1, gTrials: [trial(21.25)] });
    expect(one).toContain('Select at least two concordant titres before reporting.');
    const excluded = renderChallenge({ chMode: 'graded', gRun: 1, gTrials: [trial(21.25), trial(21.20, false)] });
    expect(excluded).toContain('Select at least two concordant titres before reporting.');
    const two = renderChallenge({ chMode: 'graded', gRun: 1, gTrials: [trial(21.25), trial(21.20)] });
    expect(two).not.toContain('Select at least two concordant titres before reporting.');
    expect(two).toContain('concordant ✓');
    expect(two).toContain('concordance shows repeatability, not accuracy');
  });

  it('shows the live mean and spread as trials accumulate', () => {
    const html = renderChallenge({ chMode: 'graded', gRun: 1, gTrials: [
      { vb: 21.20, initialRecorded: 2.00, finalRecorded: 23.20,
        initialEyeCm: 0, finalEyeCm: 0, recorded: 21.20, endpointState: 'endpoint', included: true },
      { vb: 21.30, initialRecorded: 2.00, finalRecorded: 23.30,
        initialEyeCm: 0, finalEyeCm: 0, recorded: 21.30, endpointState: 'endpoint', included: true }] });
    expect(html).toContain('21.25');             // mean at burette display resolution
    expect(html).toContain('0.10');              // range at burette display resolution
  });

  // Submitting used to be reversible: "Fresh sample" cleared the result but kept the
  // same unknown, so a student could read the true concentration off the result panel
  // and then re-titrate it perfectly.
  it('cannot re-titrate an unknown after its answer has been revealed', () => {
    const revealed = renderChallenge({
      chMode: 'graded', gRun: 1,
      gTrials: [
        { vb: 21.25, initialRecorded: 2.00, finalRecorded: 23.25,
          initialEyeCm: 0, finalEyeCm: 0, recorded: 21.25, endpointState: 'endpoint', included: true },
        { vb: 21.20, initialRecorded: 2.00, finalRecorded: 23.20,
          initialEyeCm: 0, finalEyeCm: 0, recorded: 21.20, endpointState: 'endpoint', included: true },
      ],
      gResult: { run: 1, band: 'good', measuredConc: 0.82, volErrMl: -0.05, techniqueErrMl: -0.05,
        methodBiasMl: 0, concErrPct: -0.2, seconds: 30,
        stats: { n: 2, mean: 21.225, spread: 0.05, sd: 0.035 },
        pa: { precise: true, accurate: true, biasMl: -0.025, verdict: 'both' }, diag: null, trials: [] },
    });
    // Every route back into the burette is shut: delivery, the eye slider, and the
    // fresh-aliquot button are all disabled once the truth is on screen.
    expect(revealed).toContain('Next unknown');
    const freshBtn = revealed.match(/<button[^>]*>↺ Fresh sample<\/button>/);
    expect(freshBtn, 'fresh-sample button missing').not.toBeNull();
    expect(freshBtn[0]).toContain('disabled');
    const dropBtn = revealed.match(/<button[^>]*>\+1 drop<\/button>/);
    expect(dropBtn, 'one-drop button missing').not.toBeNull();
    expect(dropBtn[0]).toContain('disabled');
  });

  it('explains precise-but-not-accurate only when the changed sight line matches', () => {
    const u = M.makeUnknown(1);
    const trials = [-0.05, 0.0, 0.05, 0.0].map((j) => {
      const r = M.titreFromReadings(2, u.trueVb + j, 0, 10);
      return {
        initialEyeCm: 0, finalEyeCm: 10,
        initialRecorded: r.initial, finalRecorded: r.final,
        recorded: r.titre, endpointState: 'endpoint', included: true,
      };
    });
    const stats = M.replicateStats(trials.map((t) => t.recorded));
    const grade = M.gradeUnknown(u, stats.mean);
    const pa = M.precisionAccuracy(stats, u.trueVb);
    const html = renderChallenge({
      chMode: 'graded', gRun: 1, gTrials: trials,
      gResult: Object.assign({}, grade, {
        run: 1, stats, pa, diag: M.systematicDiagnosis(trials, pa.biasMl), trials, seconds: 90,
      }),
    });
    expect(html).toContain('Precise, but not accurate');
    expect(html).toContain('Replicates agree');
    expect(html).toContain('Mean is biased');
    expect(html).toContain('SYSTEMATIC error');
    expect(html).toContain('A changed sight line between initial and final readings predicts -0.17 mL');
    expect(html).toContain('close to the observed -0.17 mL bias');
    expect(html).toContain('Displayed burette readings are recorded to 0.01 mL');
    expect(html).toContain('manufacturer error limit');
  });

  it('delivers drop-wise, at the resolution the ±0.05 mL claim needs', () => {
    const html = renderChallenge({ chMode: 'graded', gRun: 1, gVb: 0 });
    expect(html).toContain('+1 drop');
    expect(html).toContain('One drop = 0.05 mL');
    expect(html).toContain('Fresh sample');          // a burette has no undo
  });
});

describe('graded mode accessibility', () => {
  it('the eye-height slider announces the error it causes', () => {
    const html = renderChallenge({ chMode: 'graded', gRun: 1, gVb: 10, gEyeCm: 10 });
    expect(/aria-valuetext="10\.0 centimetres above\. Reading error minus 0\.167 millilitres\."/.test(html)).toBe(true);
  });

  // jsdom has no WebGL, which is exactly the case a school Chromebook can hit. The
  // lesson has to survive it, so the side elevation carries the same description.
  it('falls back to a labelled side elevation when 3D cannot start', () => {
    const html = renderChallenge({ chMode: 'graded', gRun: 1, gVb: 10, gEyeCm: 10 });
    expect(/aria-label="Side view: eye 10 cm above the meniscus[^"]*too low by 0\.167 millilitres\."/.test(html)).toBe(true);
    expect(html).toContain('Side elevation');
  });

  // jsdom never starts WebGL, so this is the no-3D case: the elevation must be the
  // only thing claiming to be a picture, and the empty GL container must not offer a
  // focus stop that does nothing.
  it('does not announce the diagram twice when 3D is unavailable', () => {
    const html = renderChallenge({ chMode: 'graded', gRun: 1, gVb: 10, gEyeCm: 10 });
    expect((html.match(/aria-label="Side view:/g) || []).length).toBe(1);
    expect(html).not.toContain('Burette parallax diagram');
    // The GL container is identifiable by its grab cursor; with no scene in it, it
    // must carry neither a role nor a focus stop. (Other elements in the tool
    // legitimately have tabindex, so this has to be scoped to that div.)
    const glDiv = html.match(/<div style="position:absolute;inset:0;cursor:grab[^>]*>/);
    expect(glDiv, 'GL container not found').not.toBeNull();
    expect(glDiv[0]).not.toContain('tabindex');
    expect(glDiv[0]).not.toContain('role=');
  });

  it('the run log table has scoped column headers', () => {
    const html = renderChallenge({
      chMode: 'graded', gRun: 2,
      gLog: [{ run: 1, name: 'Household vinegar', band: 'good', volErrMl: -0.1, concErrPct: -0.5, seconds: 42 }],
    });
    expect(html).toContain('scope="col"');
    expect(html).toContain('Household vinegar');
  });
});

describe('the question bank survives as its own mode', () => {
  it('quiz mode still renders the MCQ bank and not the graded run', () => {
    const html = renderChallenge({ chMode: 'quiz' });
    expect(html).toContain('Lab Safety');
    expect(html).not.toContain('DELIVER TITRANT');
  });

  it('both modes are reachable from a tablist', () => {
    const html = renderChallenge({ chMode: 'graded' });
    expect(html).toContain('role="tablist"');
    expect(html).toContain('Graded unknown');
    expect(html).toContain('Question bank');
  });
});
