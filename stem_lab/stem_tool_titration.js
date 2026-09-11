// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// ── Titration Lab Plugin v2.0 ──
// Enhanced: 7 reaction types, lab incident simulator, safety challenge quiz,
// equipment technique guide, dilution calculator, GHS hazards for all chemicals

  // ── Audio + WCAG (auto-injected) ──
  var _titrAC = null;
  function getTitrAC() { if (!_titrAC) { try { _titrAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_titrAC && _titrAC.state==="suspended") { try { _titrAC.resume(); } catch(e) {} } return _titrAC; }
  function titrTone(f,d,tp,v) { var ac=getTitrAC(); if(!ac) return; try { var o=ac.createOscillator(); var g=ac.createGain(); o.type=tp||"sine"; o.frequency.value=f; g.gain.setValueAtTime(v||0.07,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxTitrClick() { titrTone(600,0.03,"sine",0.04); }
  function sfxTitrSuccess() { titrTone(523,0.08,"sine",0.07); setTimeout(function(){titrTone(659,0.08,"sine",0.07);},70); setTimeout(function(){titrTone(784,0.1,"sine",0.08);},140); }
  if(!document.getElementById("titr-a11y")){var _s=document.createElement("style");_s.id="titr-a11y";_s.textContent="@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}";document.head.appendChild(_s);}

// ═══════════════════════════════════════════════════════════════════════════
// BURETTE READING — the parallax model behind the 3D station and the graded run
// ═══════════════════════════════════════════════════════════════════════════
// Every number here is plain arithmetic on purpose. The 3D view is a *picture of*
// this model, never the source of it: WebGL can fail, be blocked by a school
// network, or be absent on the device, and the graded titration still has to
// produce the same reading from the same eye height.
//
// Why a burette misreads at all: the graduations are printed on the FRONT of the
// glass, but the meniscus sits on the tube's axis, ~half an inner diameter behind
// them. Sighting from eye E to the meniscus M crosses the scale plane at a point
// offset from M's true height — the classic parallax error.
//
//        eye ──────╮                        h  = eye height above meniscus
//                  ╰──── ✕ ← scale plane    L  = viewing distance
//                        ╰──── M            d  = meniscus depth behind scale
//
// Similar triangles put the crossing point h·d/L above the true level. Burette
// numbering increases DOWNWARD, so a crossing point above the meniscus reads a
// SMALLER number: eye high → reads low, eye low → reads high. That is exactly the
// rule the lab tip states, and now it is the rule the simulation obeys.
var BURETTE = {
  CAPACITY_ML: 50,
  DEPTH_CM: 0.5,
  VIEW_CM: 30,
  ML_PER_CM: 1.0,
  READING_STEP_ML: 0.01,
  NOMINAL_CLASS_A_LIMIT_ML: 0.05,
  SIM_TARGET_ML: 0.05,
  TOLERANCE_ML: 0.05,  // compatibility alias for the simulation target
  DROP_ML: 0.05,
  MAX_EYE_CM: 20,
  CONCORDANCE_RANGE_ML: 0.10,
  CONCORDANCE_ML: 0.10 // compatibility alias
};

// Reading error in mL for an eye sitting eyeCm above (+) or below (−) the meniscus.
// Positive eyeCm returns a NEGATIVE error: looking down makes you read low.
function buretteParallaxMl(eyeCm) {
  var e = Number(eyeCm);
  if (!isFinite(e)) return 0;
  e = Math.max(-BURETTE.MAX_EYE_CM, Math.min(BURETTE.MAX_EYE_CM, e));
  var err = -(e * BURETTE.DEPTH_CM / BURETTE.VIEW_CM) * BURETTE.ML_PER_CM;
  // Negating zero yields -0, which is numerically fine but makes `err >= 0` sign
  // checks and equality assertions behave differently from the +0 they read as.
  return err === 0 ? 0 : err;
}

// Round once at the instrument's displayed resolution, then use that same value for
// the screen, the trial record and grading. A learner must never be graded on hidden
// digits that were not visible on the burette readout.
function roundBuretteReading(value) {
  var v = Number(value);
  if (!isFinite(v)) return 0;
  v = Math.max(0, Math.min(BURETTE.CAPACITY_ML, v));
  return Math.round(v / BURETTE.READING_STEP_ML) * BURETTE.READING_STEP_ML;
}

// A titre is a difference, not an absolute scale coordinate. Preserve its sign so
// an impossible visible pair can be flagged instead of silently rewritten as 0.00 mL.
function roundBuretteDelta(value) {
  var v = Number(value);
  if (!isFinite(v)) return NaN;
  var rounded = Math.round(v / BURETTE.READING_STEP_ML) * BURETTE.READING_STEP_ML;
  return rounded === 0 ? 0 : rounded;
}

// Apparent absolute scale reading at the selected eye height.
function readBurette(trueMl, eyeCm) {
  var v = Number(trueMl) || 0;
  return roundBuretteReading(v + buretteParallaxMl(eyeCm));
}

// Standalone helper used by the regression harness and by worked examples: begin
// from a non-zero scale position, deliver a volume, then read the final meniscus.
function buretteReading(initialMl, deliveredMl, eyeCm) {
  var initial = Number(initialMl) || 0;
  var delivered = Number(deliveredMl) || 0;
  var eye = Number(eyeCm);
  if (!isFinite(eye)) eye = 0;
  eye = Math.max(-20, Math.min(20, eye));
  var parallax = -(eye * 0.5 / 30) * 1.0;
  var apparent = Math.max(0, Math.min(50, initial + delivered + parallax));
  return Math.round(apparent * 100) / 100;
}

function titreFromReadings(initialTrueMl, deliveredMl, initialEyeCm, finalEyeCm) {
  var initial = readBurette(initialTrueMl, initialEyeCm);
  var final = readBurette((Number(initialTrueMl) || 0) + (Number(deliveredMl) || 0), finalEyeCm);
  var valid = final > initial;
  return {
    initial: initial,
    final: final,
    titre: valid ? roundBuretteDelta(final - initial) : null,
    valid: valid
  };
}

function initialBuretteReading(run, trialIndex) {
  var rand = titrLcg((Number(run) || 1) * 997 + ((Number(trialIndex) || 0) + 1) * 37);
  return roundBuretteReading(0.50 + rand() * 3.50);
}

// ═══════════════════════════════════════════════════════════════════════════
// GRADED UNKNOWNS — determining a concentration, which is what titration is FOR
// ═══════════════════════════════════════════════════════════════════════════
// Deterministic LCG (Numerical Recipes constants) rather than Math.random, so a
// given run number always yields the same unknown: a teacher can hand the whole
// class run 7 and compare answers, and the tests can pin real values.
function titrLcg(seed) {
  var s = (Math.abs(Math.floor(Number(seed) || 0)) % 2147483647) || 1;
  // Scramble and warm up before handing out any values. A raw LCG's first output is
  // LINEAR in the seed, so consecutive run numbers produced nearly identical first
  // draws — runs 1 through 35 all served vinegar, and a student doing ten runs never
  // saw a second product. Knuth's multiplicative hash decorrelates the seed; the
  // warm-up steps discard the remaining short-period behaviour in the low bits.
  s = (s * 2654435761) % 4294967296;
  var step = function () {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  step(); step(); step();
  return step;
}

// Real consumer products, with the concentration ranges they actually ship at.
// All four are 1:1 stoichiometry (monoprotic acid or monobasic base) so the
// arithmetic a student does by hand is exactly the arithmetic the grader does.
var UNKNOWN_SPECS = [
  // dilutionFactor: undiluted product would need hundreds of mL of titrant, which is
  // why a real bench dilutes it first. The student titrates the DILUTED aliquot and
  // multiplies back up — the step that makes the Dilution tab next door matter.
  { id: 'vinegar', name: 'Household vinegar', icon: '🍶', analyte: 'Acetic acid (CH₃COOH)',
    titrant: 'NaOH', titrantConc: 0.100, aliquotMl: 25.0, lo: 0.75, hi: 0.95,
    dilutionFactor: 10, prep: '10.00 mL vinegar diluted to 100.0 mL; 25.00 mL of that titrated',
    Ka: 1.8e-5, indicator: 'phenolphthalein', truthUnit: 'M',
    blurb: 'Vinegar is sold at "5% acidity". Titrate it and find out what that really means in mol/L.' },
  { id: 'ammonia', name: 'Ammonia cleaner', icon: '🧴', analyte: 'Ammonia (NH₃)',
    titrant: 'HCl', titrantConc: 0.100, aliquotMl: 25.0, lo: 0.55, hi: 0.80,
    dilutionFactor: 10, prep: '10.00 mL cleaner diluted to 100.0 mL; 25.00 mL of that titrated',
    Kb: 1.8e-5, indicator: 'methylRed', truthUnit: 'M',
    blurb: 'A weak base titrated with a strong acid — so the equivalence point is acidic, and phenolphthalein would mislead you.' },
  { id: 'vitaminc', name: 'Vitamin C tablet', icon: '💊', analyte: 'Ascorbic acid',
    titrant: 'NaOH', titrantConc: 0.0500, aliquotMl: 20.0, lo: 0.030, hi: 0.055,
    dilutionFactor: 1, prep: 'One tablet dissolved and diluted to 100.0 mL; a 20.00 mL aliquot titrated',
    Ka: 7.9e-5, indicator: 'phenolphthalein', truthUnit: 'M',
    blurb: 'Find the concentration of the prepared tablet solution. At the first equivalence point, ascorbic acid is treated as monoprotic.' },
  // A STRONG acid, so the set covers the sharpest curve shape too and the equivalence
  // sits exactly at pH 7. (Water alkalinity was the obvious environmental candidate and
  // was dropped on purpose: carbonate cannot honestly be modelled as a lone weak base —
  // its real endpoint sits near pH 8.3 precisely because the HCO3-/CO3^2- pair buffers
  // it, which a single-Kb term cannot reproduce.)
  { id: 'poolacid', name: 'Diluted pool-acid sample', icon: '🏊', analyte: 'Hydrochloric acid (HCl)',
    titrant: 'NaOH', titrantConc: 0.100, aliquotMl: 25.0, lo: 1.10, hi: 1.50,
    dilutionFactor: 20, prep: '5.00 mL acid diluted to 100.0 mL; 25.00 mL of that titrated',
    strong: 'acid', indicator: 'bromothymolBlue', truthUnit: 'M',
    blurb: 'Sold for pool pH control. A strong acid, so the curve is near-vertical and equivalence sits exactly at pH 7.' }
];

// pH of an unknown part-way through its titration. Same physics as the main
// calcPH engine, but parameterised by spec instead of a fixed preset: weak acid +
// strong base for the two acids, weak base + strong acid for the two bases.
// Needed because in graded mode the student gets NO pH meter — they find the
// endpoint from the indicator, and the indicator needs a pH to respond to.
function unknownPH(spec, conc, vb) {
  var Kw = 1e-14;
  var Va = spec.aliquotMl, Cb = spec.titrantConc;
  var molesAnalyte = conc * Va / 1000;
  var molesTitrant = Cb * (Number(vb) || 0) / 1000;
  var totalVolL = (Va + (Number(vb) || 0)) / 1000;
  var excess = molesAnalyte - molesTitrant;
  var clamp = function (p) { return Math.max(0, Math.min(14, p)); };

  // ONE equivalence pH for the whole run, evaluated at the volume where equivalence
  // actually happens. Both the buffer formula and the excess-titrant formula are
  // asymptotic approximations that break down beside it — Henderson–Hasselbalch runs
  // off to infinity as the analyte is used up, and the excess formula ignores the
  // conjugate species entirely — so each is bounded against this value. The result
  // passes exactly through it and is monotone on both sides, which is what the real
  // curve does and what an endpoint hunt needs.
  var vEqMl = (molesAnalyte / Cb) * 1000;
  var eqVolL = (Va + vEqMl) / 1000;

  if (spec.strong === 'acid') {                   // strong acid titrated with strong base
    if (molesTitrant <= 1e-12) return clamp(-Math.log10(conc));
    if (excess > 1e-12) return clamp(Math.min(7, -Math.log10(excess / totalVolL)));
    if (excess > -1e-12) return 7;
    return clamp(Math.max(7, 14 + Math.log10(-excess / totalVolL)));
  }

  if (spec.Ka) {                                  // weak acid titrated with strong base
    var Ka = spec.Ka;
    if (molesTitrant <= 1e-12) return clamp(-Math.log10(Math.sqrt(Ka * conc)));
    var eqPH = 14 + Math.log10(Math.sqrt((Kw / Ka) * (molesAnalyte / eqVolL)));
    if (excess > 1e-12) {
      var hh = -Math.log10(Ka) + Math.log10(molesTitrant / excess);
      var alone = -Math.log10(Math.sqrt(Ka * (excess / totalVolL)));
      // Floor: no dip below the initial pH. Ceiling: adding base before equivalence
      // cannot take you past the equivalence pH.
      return clamp(Math.min(Math.max(hh, alone), eqPH));
    }
    if (excess > -1e-12) return clamp(eqPH);
    return clamp(Math.max(eqPH, 14 + Math.log10(-excess / totalVolL)));
  }

  var Kb = spec.Kb;                               // weak base titrated with strong acid
  if (molesTitrant <= 1e-12) return clamp(14 + Math.log10(Math.sqrt(Kb * conc)));
  var eqPHb = -Math.log10(Math.sqrt((Kw / Kb) * (molesAnalyte / eqVolL)));
  if (excess > 1e-12) {
    var pKb = -Math.log10(Kb);
    var pOH = pKb + Math.log10(molesTitrant / excess);
    var aloneOH = -Math.log10(Math.sqrt(Kb * (excess / totalVolL)));
    // MAX on pOH, mirroring the acid branch's max(): the larger pOH is the smaller
    // pH. Taking the min let the pH RISE after the first drop of acid — a base
    // getting more basic as you titrate it with acid — and put half-equivalence at
    // 11.07 instead of pOH = pKb -> pH 9.26.
    return clamp(Math.max(14 - Math.max(pOH, aloneOH), eqPHb));
  }
  if (excess > -1e-12) return clamp(eqPHb);
  return clamp(Math.min(eqPHb, -Math.log10(-excess / totalVolL)));
}

// Build run N. The true concentration is hidden from the UI until the student commits.
function makeUnknown(runSeed) {
  var rnd = titrLcg(runSeed);
  var spec = UNKNOWN_SPECS[Math.floor(rnd() * UNKNOWN_SPECS.length) % UNKNOWN_SPECS.length];
  // Quantised to 4 significant-ish steps so the truth is a value a student could
  // plausibly report, not a 15-digit float.
  var raw = spec.lo + rnd() * (spec.hi - spec.lo);
  var step = (spec.hi - spec.lo) / 40;
  var truth = Math.round(raw / step) * step;
  // truth is the concentration of the PRODUCT; what sits in the flask is diluted.
  var dil = spec.dilutionFactor || 1;
  var flaskConc = truth / dil;
  // Vb at the true equivalence: Cflask·Va = Cb·Vb  (1:1), so Vb = Cflask·Va/Cb.
  var trueVb = (flaskConc * spec.aliquotMl) / spec.titrantConc;
  return { spec: spec, truthConc: truth, flaskConc: flaskConc, trueVb: trueVb, seed: runSeed };
}

// Volume at which the indicator's colour actually turns. The pH curve is monotone
// (unknownPH guarantees it), so bisection finds this in ~30 steps instead of scanning.
// Used only to phrase what the student SEES — it is never shown, and the grade is
// still measured against true equivalence, not against this.
function findEndpointVb(spec, flaskConc, endPH, rising) {
  var lo = 0, hi = 50;
  var reached = function (v) {
    var ph = unknownPH(spec, flaskConc, v);
    return rising ? ph >= endPH : ph <= endPH;
  };
  if (!reached(hi)) return hi;
  for (var i = 0; i < 40; i++) {
    var mid = (lo + hi) / 2;
    if (reached(mid)) hi = mid; else lo = mid;
  }
  return hi;
}

// What the flask looks like, expressed in DROPS either side of the colour change.
// Keying this to pH bands instead made the "faint persistent colour" state about a
// fifth of a drop wide, so a single drop could jump a student from "nothing yet"
// straight to "you overshot" and the endpoint was literally unobservable. The real
// skill is stopping at the FIRST drop that leaves lasting colour, and one drop is
// exactly the burette's tolerance — so drops, not pH, are the honest unit here.
function endpointObservation(gVb, endVb, firstPersistentVb) {
  var delivered = Number(gVb);
  var endpoint = Number(endVb);
  if (!isFinite(delivered) || !isFinite(endpoint)) return 'none';
  // Once a learner has observed the first persistent signal, every later addition is
  // overshoot even if it still lies inside the broad two-drop visual transition band.
  var hasFirst = firstPersistentVb !== null && firstPersistentVb !== '' &&
    typeof firstPersistentVb !== 'undefined' && isFinite(Number(firstPersistentVb));
  var first = hasFirst ? Number(firstPersistentVb) : null;
  if (hasFirst && delivered > first + 1e-9) return 'over';
  var drops = (delivered - endpoint) / BURETTE.DROP_ML;
  if (drops < -1) return 'none';
  if (drops < 0) return 'flash';       // colour flares where the drop lands, then swirls away
  if (drops <= 2) return 'endpoint';   // first faint lasting signal — stop here
  return 'over';
}

// ═══════════════════════════════════════════════════════════════════════════
// GLASSWARE — why the tolerances differ, which is a fact about SHAPE
// ═══════════════════════════════════════════════════════════════════════════
// The Equipment tab lists tolerances (burette 0.05 mL, volumetric flask 0.10, pipette
// 0.02) as though they were arbitrary facts to memorise. They are not: they follow
// from how wide the vessel is where you read it. One millilitre poured into a 10 mm
// burette bore stands about 13 mm tall and you can read it to a fraction of a
// division; the same millilitre in a 70 mm beaker is a quarter-millimetre film you
// cannot see at all. That is a geometric argument, so it is worth showing in 3D.
//
// Capacities and class A tolerances are the standard catalogue values; bore diameters
// are typical for that glassware.
var GLASSWARE = [
  // 11 mm bore, not 10: at 10 the arithmetic implies a 64 cm barrel, where a real
  // 50 mL burette is about 50 cm. 11 mm gives 10.5 mm per mL and a 52 cm barrel.
  { id: 'burette',  label: 'Burette, 50 mL',            capMl: 50,  tolMl: 0.05, boreMm: 11, kind: 'burette' },
  { id: 'pipette',  label: 'Volumetric pipette, 25 mL', capMl: 25,  tolMl: 0.03, boreMm: 6,  kind: 'pipette' },
  { id: 'volflask', label: 'Volumetric flask, 100 mL',  capMl: 100, tolMl: 0.10, boreMm: 12, kind: 'volflask' },
  { id: 'cylinder', label: 'Measuring cylinder, 100 mL', capMl: 100, tolMl: 0.50, boreMm: 26, kind: 'cylinder' },
  { id: 'conical',  label: 'Conical flask, 250 mL',     capMl: 250, tolMl: 12.5, boreMm: 22, kind: 'conical' },
  { id: 'beaker',   label: 'Beaker, 250 mL',            capMl: 250, tolMl: 12.5, boreMm: 70, kind: 'beaker' }
];

// How tall a 1 mL slice stands in a vessel of the given bore. 1 mL = 1000 mm³, so
// height = 1000 / (pi r²). This is the number the whole bench exists to make visible.
function mlHeightMm(boreMm) {
  var r = Number(boreMm) / 2;
  if (!(r > 0)) return 0;
  return 1000 / (Math.PI * r * r);
}

// Tolerance as a fraction of capacity, for ranking precision independently of size —
// a 0.05 mL error means something very different on 50 mL than on 250 mL.
function tolPercent(g) { return g.capMl > 0 ? (g.tolMl / g.capMl) * 100 : 0; }

// ═══════════════════════════════════════════════════════════════════════════
// BUFFER CAPACITY — what a spike of strong acid does to a buffer
// ═══════════════════════════════════════════════════════════════════════════
// Henderson–Hasselbalch describes a solution that still HAS both members of the
// conjugate pair. The Buffer Discovery tab used it unconditionally, clamping [A⁻] to
// 0.001 M when the spike consumed more base than the buffer held — so a buffer that
// had been completely destroyed was still reported through the buffer equation. The
// pH shifts it printed were wrong by over a full unit either way, and those printed
// shifts are exactly what the tab asks students to log and reason from.
//
// Once A⁻ is gone the leftover is FREE STRONG ACID, and that is what sets the pH.
// Both regimes below meet at the same value when the spike exactly exhausts the
// buffer, so the curve stays continuous instead of stepping at the boundary.
function bufferAfterStrongAcid(Ka, ratio, totalConc, deltaAcid) {
  var pKa = -Math.log10(Ka);
  var ha = totalConc / (1 + ratio);          // [A⁻]/[HA] = ratio, and they sum to total
  var aMinus = totalConc - ha;
  var consumed = Math.min(deltaAcid, aMinus);
  var newHA = ha + consumed;
  var newA = aMinus - consumed;
  var excess = deltaAcid - consumed;         // strong acid the buffer could not absorb
  // A spike that EXACTLY exhausts the buffer leaves excess = 5.6e-17 rather than 0
  // (ratio 0.25 gives aMinus = 0.19999999999999996). Without a physical threshold the
  // panel announces "the A⁻ ran out completely, the leftover strong acid now sets the
  // pH" over a leftover of 5.6e-17 M.
  if (excess <= totalConc * 1e-9) { excess = 0; }
  var pHAfter;
  if (excess <= 0 && newA > 0) {
    var hh = pKa + Math.log10(newA / newHA);
    // H–H dives to −∞ as the last of the A⁻ goes; the physical floor is the weak
    // acid on its own, solved exactly rather than as √(Ka·C) because Ka is not
    // necessarily small next to C here.
    var hAlone = (-Ka + Math.sqrt(Ka * Ka + 4 * Ka * newHA)) / 2;
    pHAfter = Math.max(hh, -Math.log10(hAlone));
  } else {
    // Buffer destroyed. [H⁺] is the leftover strong acid plus whatever the weak acid
    // still manages to give up against it. The quadratic keeps this continuous with
    // the branch above as excess → 0.
    var b = excess + Ka;
    var x = (-b + Math.sqrt(b * b + 4 * Ka * totalConc)) / 2;
    pHAfter = -Math.log10(excess + x);
  }
  return {
    pHBefore: pKa + Math.log10(ratio),
    pHAfter: Math.max(0, Math.min(14, pHAfter)),
    exhausted: excess > 0
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// REPLICATES — precision is not accuracy, and a burette can prove it
// ═══════════════════════════════════════════════════════════════════════════
// Nobody titrates once. The bench workflow is a rough run to find the endpoint, then
// repeats until two or three agree within about 0.10 mL, and the mean of those is the
// result. Grading a single run rewarded a lucky drop and taught none of that.
//
// The reason it is worth the machinery: parallax from a FIXED eye height is a
// SYSTEMATIC error. Do four replicates without moving your head and they will agree
// beautifully with each other and all be wrong by the same amount. That is the
// cleanest demonstration of precision-without-accuracy a student can be shown, and it
// falls straight out of the readings this station already produces.
function replicateStats(readings) {
  var n = readings.length;
  if (!n) return { n: 0, mean: 0, spread: 0, sd: 0 };
  var sum = 0, lo = Infinity, hi = -Infinity;
  for (var i = 0; i < n; i++) {
    sum += readings[i];
    if (readings[i] < lo) lo = readings[i];
    if (readings[i] > hi) hi = readings[i];
  }
  var mean = sum / n;
  // Sample standard deviation (n-1); with a single reading there is no spread to
  // speak of, so it is reported as zero rather than NaN.
  var ss = 0;
  for (var j = 0; j < n; j++) ss += (readings[j] - mean) * (readings[j] - mean);
  return { n: n, mean: mean, spread: hi - lo, sd: n > 1 ? Math.sqrt(ss / (n - 1)) : 0 };
}

// Precision (do the replicates agree?) and accuracy (is the mean right?) are scored
// independently, because the whole point is that they can come apart.
function precisionAccuracy(stats, trueVb) {
  // EPS matters here, it is not defensive noise. Readings are quantised to 0.01 mL, so
  // a spread of exactly 0.10 — the textbook concordance criterion, and therefore the
  // single most likely value to land on — comes out of the subtraction as
  // 0.10000000000000142 and would be judged NOT concordant.
  var EPS = 1e-9;
  var precise = stats.n >= 2 && stats.spread <= BURETTE.CONCORDANCE_ML + EPS;
  var accurate = Math.abs(stats.mean - trueVb) <= BURETTE.TOLERANCE_ML + EPS;
  return {
    precise: precise, accurate: accurate,
    biasMl: stats.mean - trueVb,
    verdict: precise && accurate ? 'both'
      : precise && !accurate ? 'precise-not-accurate'
      : !precise && accurate ? 'accurate-not-precise'
      : 'neither'
  };
}

// Parallax affects a titre through the DIFFERENCE between the final- and
// initial-reading errors. The same relative eye offset at both readings cancels in
// final − initial; only a changed sight line predicts a titre bias. Diagnose it only
// when the predicted direction and size agree with the observed mean bias.
function systematicDiagnosis(trials, observedBiasMl) {
  if (!trials || trials.length < 2) return null;
  var predicted = [];
  for (var i = 0; i < trials.length; i++) {
    var t = trials[i] || {};
    var initialEye = Number(t.initialEyeCm);
    var finalEye = Number(t.finalEyeCm != null ? t.finalEyeCm : t.eyeCm);
    if (!isFinite(initialEye) || !isFinite(finalEye)) return null;
    predicted.push(buretteParallaxMl(finalEye) - buretteParallaxMl(initialEye));
  }
  var meanPredicted = predicted.reduce(function (sum, v) { return sum + v; }, 0) / predicted.length;
  if (Math.abs(meanPredicted) < BURETTE.READING_STEP_ML / 2) return null;
  var observed = Number(observedBiasMl);
  var matches = isFinite(observed) && Math.abs(observed - meanPredicted) <= 0.03;
  return { kind: 'parallax-difference', predictedMl: meanPredicted, observedMl: observed, matchesObserved: matches };
}// Grade a committed run. Reports BOTH errors on purpose: the volume error is what
// the student controls, the concentration error is what it costs them, and seeing
// 0.25 mL become 1% of an answer is the whole lesson about reading technique.
function gradeUnknown(unknown, recordedVb, methodEndpointVb) {
  var spec = unknown.spec;
  // Titrated concentration scaled back up through the dilution, so the answer is
  // reported for the product on the shelf, as a real report would be.
  var measured = ((spec.titrantConc * recordedVb) / spec.aliquotMl) * (spec.dilutionFactor || 1);
  var volErr = recordedVb - unknown.trueVb;
  var concErrPct = unknown.truthConc > 0
    ? ((measured - unknown.truthConc) / unknown.truthConc) * 100
    : 0;
  var endpointTarget = isFinite(Number(methodEndpointVb)) ? Number(methodEndpointVb) : unknown.trueVb;
  var techniqueErr = recordedVb - endpointTarget;
  var methodBias = endpointTarget - unknown.trueVb;
  var absTechnique = Math.abs(techniqueErr);
  var band = absTechnique <= BURETTE.SIM_TARGET_ML ? 'excellent'
    : absTechnique <= 0.15 ? 'good'
    : absTechnique <= 0.50 ? 'fair' : 'poor';
  return {
    measuredConc: measured, volErrMl: volErr, concErrPct: concErrPct,
    techniqueErrMl: techniqueErr, methodBiasMl: methodBias,
    withinTolerance: absTechnique <= BURETTE.SIM_TARGET_ML, band: band
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3D PARALLAX STATION — a diagram you can walk around
// ═══════════════════════════════════════════════════════════════════════════
// Deliberately NOT a first-person view down a burette. Putting the student's eye
// where the error happens hides the very thing that causes it; what teaches the
// mechanism is seeing, from the side, the sight line leave the eye, cross the
// front scale, and land on the meniscus behind it. So this is an orbitable
// diagram, and the accessible eye-height control below it is the real input.
//
// HONEST EXAGGERATION: a real 1 cm bore viewed from 30 cm has a depth:distance
// ratio of 1:60 — at burette scale the two readings differ by well under a
// millimetre and the diagram would show nothing. The scene therefore draws a wide
// bore seen from close in (ratio ~1:5), which is how textbooks draw it and is
// geometrically self-consistent: the sight line really does pass through the mark
// it points at. The mL figure beside it is always computed from REAL burette
// geometry by buretteParallaxMl(), never from the picture. The UI says so.
var BUR3D = {
  R: 0.42,            // drawn bore radius (world units)
  VIEW: 1.8,          // drawn eye distance from the tube axis
  H: 3.2,             // drawn barrel height
  ML_WINDOW: 4.8,     // mL of scale the drawn barrel spans
  // Kept small on purpose: the camera frames everything the scene occupies, so a
  // tall eye travel makes it back off until the burette is a sliver. 0.10 keeps the
  // eye inside the frame across the full +/-20 cm while the tighter VIEW above
  // preserves a clearly visible gap between the two readings.
  EYE_UNITS_PER_CM: 0.10,
  TICKS: 21
};
BUR3D.UNITS_PER_ML = BUR3D.H / BUR3D.ML_WINDOW;
// How much the picture overstates the effect, derived from the constants rather
// than typed in, so the on-screen caption cannot drift away from the geometry.
BUR3D.EXAGGERATION = (BUR3D.EYE_UNITS_PER_CM * (BUR3D.R / BUR3D.VIEW) / BUR3D.UNITS_PER_ML)
  / (BURETTE.DEPTH_CM / BURETTE.VIEW_CM * BURETTE.ML_PER_CM);

// Thin cylinder between two points — LineBasicMaterial.linewidth is ignored on
// nearly every platform, so real geometry is the only way to get a visible line.
function bur3dSegment(THREE, parent, a, b, hex, thick, opacity) {
  var dir = new THREE.Vector3().subVectors(b, a);
  var len = dir.length();
  if (!(len > 1e-6)) return null;
  var geo = new THREE.CylinderGeometry(thick, thick, len, 8, 1);
  var mat = new THREE.MeshLambertMaterial({
    color: hex, transparent: opacity != null && opacity < 1, opacity: opacity == null ? 1 : opacity
  });
  var mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  parent.add(mesh);
  return mesh;
}

// Text in the scene, as a canvas-textured sprite. r128 has no text geometry, and a
// sprite always faces the camera — which is what a scale number has to do if the
// diagram is going to stay readable from every orbit angle.
//
// Textures are tracked on S and disposed at the top of each build: the shell's
// disposeGroup() releases geometry and material but NOT material.map, and this scene
// rebuilds on every eye-height step, so an untracked texture would leak once per tick
// of the slider.
function bur3dLabel(THREE, S, parent, text, pos, hex, size) {
  var cvs = document.createElement('canvas');
  cvs.setAttribute('aria-hidden', 'true');
  cvs.width = 256; cvs.height = 96;
  var g = cvs.getContext('2d');
  if (!g) return null;
  g.clearRect(0, 0, 256, 96);
  // Shrink to fit rather than overflow the texture. At a fixed 58px, "10.5 mm/mL"
  // measured ~320px against a 256px canvas and rendered as ".5 mm/m" — clipped at both
  // ends, on every vessel on the bench.
  var fontPx = 58;
  var face = 'px system-ui, -apple-system, sans-serif';
  g.font = 'bold ' + fontPx + face;
  while (fontPx > 18 && g.measureText(String(text)).width > 236) {
    fontPx -= 2;
    g.font = 'bold ' + fontPx + face;
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  // Dark outline first, so a number stays legible against glass, liquid or void.
  g.lineWidth = 10;
  g.strokeStyle = 'rgba(2,8,18,0.92)';
  g.strokeText(text, 128, 50);
  g.fillStyle = hex;
  g.fillText(text, 128, 50);
  var tex = new THREE.CanvasTexture(cvs);
  var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  var sp = new THREE.Sprite(mat);
  sp.position.copy(pos);
  var s = size || 0.5;
  sp.scale.set(s, s * 0.375, 1);
  sp.renderOrder = 10;
  parent.add(sp);
  if (S._texes) S._texes.push(tex);
  return sp;
}

// A mark ON the glass rather than on a flat plate in front of it.
//
// Every graduation used to be a BoxGeometry sitting at z = R. A box spans the
// full CHORD, so at the default 34 degrees of orbit its corners project outside
// the barrel's silhouette: the scale read as a comb floating beside the tube,
// overhanging on one side and stopping short of the glass on the other. An
// open-ended cylinder arc is the same mark wrapped onto the surface it is
// actually etched on, so it stays on the glass from every angle.
//
// Angle convention: three.js builds a cylinder with x = r sin(theta),
// z = r cos(theta), so theta = 0 is the +z face — the scale face, the plane the
// student reads against. Marks stay centred on it and the parallax geometry is
// untouched: near theta = 0 the arc still sits at z = R.
function bur3dArc(THREE, parent, y, centerRad, halfArc, hex, thick, opts) {
  opts = opts || {};
  var r = opts.radius == null ? BUR3D.R + 0.014 : opts.radius;
  var geo = new THREE.CylinderGeometry(r, r, thick, 30, 1, true,
    centerRad - halfArc, halfArc * 2);
  var mat = new THREE.MeshLambertMaterial({
    color: hex, side: THREE.DoubleSide,
    transparent: opts.opacity != null && opts.opacity < 1,
    opacity: opts.opacity == null ? 1 : opts.opacity
  });
  var m = new THREE.Mesh(geo, mat);
  m.position.y = y;
  parent.add(m);
  return m;
}

// A reading band: the same arc, run most of the way round the front so it reads
// as a line drawn across the scale rather than as one more graduation.
function bur3dBand(THREE, parent, y, hex, emphatic) {
  return bur3dArc(THREE, parent, y, 0, 1.16, hex, emphatic ? 0.045 : 0.03,
    { radius: BUR3D.R + 0.026 });
}

function buildBuretteScene(THREE, S, m) {
  var R = BUR3D.R, H = BUR3D.H;
  // Release the previous build's label textures. disposeGroup() upstream frees
  // geometry and material but not material.map, and this scene rebuilds on every
  // step of the eye-height slider.
  if (S._texes) { for (var ti = 0; ti < S._texes.length; ti++) { try { S._texes[ti].dispose(); } catch (e) {} } }
  S._texes = [];
  var yM = 0;                                  // meniscus sits at the origin
  var eyeY = yM + (m.eyeCm || 0) * BUR3D.EYE_UNITS_PER_CM;
  // Similar triangles: the sight line eye -> meniscus crosses the scale plane
  // (z = R) at R/VIEW of the way down from the eye's height.
  var crossY = yM + (eyeY - yM) * (R / BUR3D.VIEW);

  // Glass barrel. Rendered from inside as well so the meniscus stays visible
  // through the front wall instead of being culled behind it.
  var glass = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, H, 40, 1, true),
    new THREE.MeshPhongMaterial({
      color: m.contrast ? 0xffffff : 0x93c5fd, transparent: true,
      opacity: m.contrast ? 0.30 : 0.16, side: THREE.DoubleSide, shininess: 90,
      specular: m.contrast ? 0x888888 : 0x2b4a72,
      // Glass must not occupy the depth buffer. Writing depth from a 16%-opaque
      // wall let the near side of the barrel hide the meniscus, the titrant and
      // the graduations behind it depending on orbit angle — the contents are the
      // whole point of looking into a burette.
      depthWrite: false
    })
  );
  glass.position.y = yM - H / 2 + H * 0.62;
  S.model.add(glass);
  var glassTop = glass.position.y + H / 2, glassBot = glass.position.y - H / 2;

  // Silhouette shell — see benchVessel for why lighting cannot do this job at this
  // opacity. Shares the barrel geometry.
  var barrelShell = new THREE.Mesh(glass.geometry, new THREE.MeshBasicMaterial({
    color: m.contrast ? 0xffffff : 0xbfdbfe,
    transparent: true, opacity: 0.26, side: THREE.BackSide, depthWrite: false
  }));
  barrelShell.position.copy(glass.position);
  barrelShell.scale.setScalar(1.035);
  S.model.add(barrelShell);

  // Lip at the mouth. An open-ended cylinder ends on nothing, so without it the
  // barrel reads as a tube cropped by the top of the frame rather than as the
  // top of an instrument.
  var lip = new THREE.Mesh(
    new THREE.TorusGeometry(R, 0.016, 8, 36),
    new THREE.MeshPhongMaterial({
      color: m.contrast ? 0xffffff : 0xbfdbfe, shininess: 80,
      transparent: true, opacity: 0.75
    })
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.y = glassTop;
  S.model.add(lip);

  // Titrant column below the meniscus. The height is DERIVED from the barrel,
  // not typed: a fixed 0.62 H centred on the meniscus put the bottom of the
  // column 0.77 units BELOW the bottom of the glass, so a slab of titrant hung
  // in mid-air under the burette and ran off the bottom of the frame.
  var colH = Math.max(0.05, yM - glassBot - 0.02);
  var liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.93, R * 0.93, colH, 32),
    new THREE.MeshLambertMaterial({
      color: m.contrast ? 0x888888 : (m.liquidHex || 0x38bdf8), transparent: true, opacity: 0.55
    })
  );
  liquid.position.y = yM - colH / 2;
  S.model.add(liquid);

  // The meniscus itself: concave, so its LOWEST point is what you read. Drawn as a
  // shallow inverted dome on the tube axis — i.e. a full bore-radius BEHIND the
  // scale face, which is the entire cause of the error.
  var men = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.93, 36, 14, 0, Math.PI * 2, 0, Math.PI * 0.42),
    new THREE.MeshPhongMaterial({ color: m.contrast ? 0xffffff : 0x22d3ee, shininess: 90, side: THREE.DoubleSide })
  );
  men.position.y = yM + R * 0.30;
  men.scale.y = -0.62;                         // flip into a bowl
  S.model.add(men);
  S.meniscusY = yM;

  // Front scale face, carrying the graduations. This is the plane the student
  // reads against, and it sits a bore-radius in FRONT of the meniscus.
  // Curved to the glass for the same reason the graduations are: a flat card
  // R * 3.0 wide overhangs a barrel of radius R at any orbit angle, and its
  // corners were the brightest thing in the scene.
  var face = new THREE.Mesh(
    new THREE.CylinderGeometry(R + 0.006, R + 0.006, H, 40, 1, true, -1.22, 2.44),
    new THREE.MeshLambertMaterial({
      color: m.contrast ? 0x000000 : 0x0f172a, transparent: true, opacity: 0.5,
      side: THREE.DoubleSide, depthWrite: false
    })
  );
  face.position.set(0, glass.position.y, 0);
  S.model.add(face);

  var tickMat = new THREE.MeshLambertMaterial({ color: m.contrast ? 0xffffff : 0xcbd5e1 });
  var top = glass.position.y + H / 2, bot = glass.position.y - H / 2;
  // Burette numbering runs DOWNWARD — 0.00 at the top, 50.00 at the tip — which is
  // the whole reason "reads high" and "reads a bigger number" mean the same thing.
  // Without printed numbers a student can see the two marks are apart but not which
  // way the error goes, so the scale is genuinely numbered.
  // Graduations are anchored to ROUND millilitres, not to a fixed count of evenly
  // spaced marks. Dividing the barrel into N ticks put the labels on 18.3 / 19.5 /
  // 20.7 — no burette ever made is graduated at 1.2 mL intervals, and a scale that
  // does not look like the instrument teaches the student to read the wrong thing.
  // 0.2 mL minors, whole-millilitre majors, which is what a 50 mL class A burette
  // actually carries (real ones subdivide to 0.1; 0.2 keeps the draw count sane).
  var mlPerUnit = BUR3D.ML_WINDOW / H;
  var trueMl = m.trueMl || 0;
  var yForMl = function (ml) { return yM - (ml - trueMl) / mlPerUnit; };
  var mlTop = trueMl + (yM - top) * mlPerUnit;      // smallest number, at the top
  var mlBot = trueMl + (yM - bot) * mlPerUnit;
  var first = Math.ceil(mlTop * 5) / 5;
  for (var v = first; v <= mlBot + 1e-9; v = Math.round((v + 0.2) * 5) / 5) {
    if (v < 0 || v > 50) continue;                  // past either end of the barrel
    var ty = yForMl(v);
    var major = Math.abs(v - Math.round(v)) < 1e-9;
    // Majors run right across the face; minors are the short marks on one side,
    // as on a real burette. Both are arcs on the glass — see bur3dArc.
    bur3dArc(THREE, S.model, ty, major ? 0 : -0.40, major ? 0.95 : 0.42,
      tickMat.color.getHex(), major ? 0.020 : 0.016);
    if (major) {
      // Close enough to the barrel to belong to it, far enough not to sit on the
      // graduations. At -2.0 R they floated in the void with nothing to attach to.
      bur3dLabel(THREE, S, S.model, v.toFixed(0),
        new THREE.Vector3(-R * 1.62, ty, R + 0.04),
        m.contrast ? '#ffffff' : '#cbd5e1', 0.44);
    }
  }

  // TRUE reading (green): where the meniscus actually is.
  bur3dBand(THREE, S.model, yM, m.contrast ? 0xffffff : 0x4ade80, false);
  // RECORDED reading: green while the eye is genuinely level (the sight line then
  // lands ON the true mark and no second band is drawn at all), amber once there is
  // an error inside burette tolerance, red once it exceeds it.
  var level = Math.abs(crossY - yM) <= 0.004;
  var offHex = m.contrast ? 0xffffff
    : level ? 0x4ade80 : (m.withinTolerance ? 0xfbbf24 : 0xf87171);
  if (!level) bur3dBand(THREE, S.model, crossY, offHex, true);
  S.crossY = crossY;

  // The two numbers, side by side on the scale they are read from. This is the
  // payload of the whole station: not "your eye is crooked" but "your eye being
  // crooked made you write 21.08 where the liquid says 21.25".
  // The numbers hang at the heights they are read at, but a 0.62 sprite is 0.23
  // tall and a small parallax error puts the two readings closer together than
  // that — they overlapped and NEITHER was legible, which is the one failure this
  // station cannot afford. Push the SPRITES apart to a legible gap when they
  // would collide; the BANDS never move, because their positions carry the
  // meaning and the labels only annotate them.
  var LABEL_GAP = 0.30;
  var trueLabelY = yM, readLabelY = crossY;
  if (!level && Math.abs(crossY - yM) < LABEL_GAP) {
    var mid = (yM + crossY) / 2, up = crossY >= yM ? 1 : -1;
    trueLabelY = mid - up * LABEL_GAP / 2;
    readLabelY = mid + up * LABEL_GAP / 2;
  }
  if (m.trueMl != null) {
    bur3dLabel(THREE, S, S.model, m.trueMl.toFixed(2),
      new THREE.Vector3(R * 2.35, trueLabelY, R + 0.05), m.contrast ? '#ffffff' : '#4ade80', 0.62);
    if (!level && m.readMl != null) {
      bur3dLabel(THREE, S, S.model, m.readMl.toFixed(2),
        new THREE.Vector3(R * 2.35, readLabelY, R + 0.05),
        m.contrast ? '#ffffff' : (m.withinTolerance ? '#fbbf24' : '#f87171'), 0.62);
    }
  }

  // The eye, and the sight line through the scale to the meniscus.
  var eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 28, 20),
    new THREE.MeshPhongMaterial({ color: m.contrast ? 0xffffff : 0xf1f5f9, shininess: 70 })
  );
  var eyePos = new THREE.Vector3(0, eyeY, BUR3D.VIEW);
  eye.position.copy(eyePos);
  S.model.add(eye);

  var menPt = new THREE.Vector3(0, yM, 0);
  var sightDir = new THREE.Vector3().subVectors(menPt, eyePos).normalize();

  // A marking round the eye, on the plane PERPENDICULAR to the sight line, so the
  // ball reads as an optic aimed somewhere rather than as a golf ball.
  //
  // A disc placed where an iris really goes is invisible here and always will be:
  // the eye looks down the barrel, i.e. away from the camera, so its front face
  // sits on the hidden hemisphere at every orbit angle the station allows. The
  // ring runs through the visible hemisphere by construction.
  var iris = new THREE.Mesh(
    new THREE.TorusGeometry(0.104, 0.011, 8, 32),
    new THREE.MeshBasicMaterial({ color: m.contrast ? 0x000000 : 0x1e3a8a })
  );
  iris.position.copy(eyePos);
  iris.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), sightDir);
  S.model.add(iris);
  bur3dSegment(THREE, S.model, eyePos, new THREE.Vector3(0, yM, 0), offHex, 0.012, 0.95);

  // Faint guide at true eye level, so "get your eye level with the meniscus"
  // is a visible target and not just an instruction.
  bur3dSegment(THREE, S.model, new THREE.Vector3(0, yM, 0),
    new THREE.Vector3(0, yM, BUR3D.VIEW + 0.35), m.contrast ? 0xffffff : 0x4ade80, 0.004, 0.5);

  // ...and the place the eye has to GET to, at the end of that guide. The line on
  // its own ran out into empty space, so it read as a stray diagonal instead of as
  // a target; a ring at the eye's own distance turns "level with the meniscus"
  // into a gap the student can see themselves closing.
  var mark = new THREE.Mesh(
    new THREE.TorusGeometry(0.115, 0.010, 8, 28),
    new THREE.MeshBasicMaterial({
      color: m.contrast ? 0xffffff : 0x4ade80,
      transparent: true, opacity: level ? 0.9 : 0.55
    })
  );
  mark.position.set(0, yM, BUR3D.VIEW);
  mark.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1),
    new THREE.Vector3().subVectors(menPt, mark.position).normalize());
  S.model.add(mark);

  S.target = new THREE.Vector3(0, yM + 0.1, 0);
  // The scale numbers hang off both flanks of the face, so the fit has to allow for
  // them or the camera crops the very digits the station exists to show.
  // Sampled from what the scene actually contains, including the bottom of the
  // titrant column and the lip — the old list sampled the barrel only, so
  // anything drawn past either end of it was framed straight off the canvas.
  S.fitPts = [
    new THREE.Vector3(0, top, 0), new THREE.Vector3(0, bot, 0),
    new THREE.Vector3(0, yM - colH, 0),
    new THREE.Vector3(R * 2.7, Math.max(yM, trueLabelY, readLabelY), R),
    new THREE.Vector3(-R * 2.3, Math.min(yM, trueLabelY, readLabelY), R),
    // The eye is a SPHERE, so sample its extremes and not just its centre: at the
    // ends of the eye-height slider the fit cropped the bottom of it.
    new THREE.Vector3(0, eyeY - 0.13, BUR3D.VIEW),
    new THREE.Vector3(0, eyeY + 0.13, BUR3D.VIEW),
    new THREE.Vector3(0, yM - 0.4, BUR3D.VIEW + 0.4)
  ];
}

// ── The glassware bench ─────────────────────────────────────────────────────
// Every vessel is drawn at its TRUE relative bore, because bore is the whole
// argument, and each carries a 1 mL slice of liquid at true scale against that bore.
// Drawn HEIGHTS are equalised and truncated instead of being to scale: a real burette
// is six times the height of a beaker, and at honest scale the short vessels collapse
// to nothing and the comparison that matters becomes unreadable. The UI says so.
var BENCH = {
  MM_PER_UNIT: 46,     // world units per millimetre of real bore
  H: 2.0,              // drawn body height, the same for every vessel
  GAP: 0.34,           // clear margin between neighbouring vessels
  MIN_BAND: 0.014      // floor on the 1 mL band, or the beaker's is literally invisible
};

function benchVessel(THREE, S, m, g, x, selected) {
  var grp = new THREE.Group();
  var r = (g.boreMm / 2) / BENCH.MM_PER_UNIT;
  var H = BENCH.H;
  var glassMat = new THREE.MeshPhongMaterial({
    color: m.contrast ? 0xffffff : (selected ? 0x7dd3fc : 0x93c5fd),
    // The selection ring below carries "this one" now, so the selected vessel no
    // longer has to shout it with opacity — at 0.34 the beaker went nearly solid
    // and buried its own 1 mL slice.
    transparent: true, opacity: selected ? 0.25 : 0.16,
    side: THREE.DoubleSide, shininess: 95,
    specular: m.contrast ? 0x888888 : 0x2b4a72,
    // The 1 mL slice is the entire content of this bench and it lives INSIDE the
    // vessel. A 16%-opaque wall that writes depth hid it behind the near glass on
    // the wide vessels, which are exactly the ones whose slice is thinnest and
    // hardest to see.
    depthWrite: false
  });

  // Body profile. Only the READING bore has to be right; the reservoir below it is
  // shaped for recognition.
  // Base radius per vessel, because the foot below is drawn from it. A flat
  // max(r, 0.18) disc sat a long way INSIDE the conical flask and the volumetric
  // flask, so both stood on a pale ellipse floating in their own middle.
  var baseR = Math.max(r, 0.17);
  if (g.kind === 'volflask' || g.kind === 'conical') {
    var bulbR = Math.max(r * 2.2, 0.30);
    baseR = g.kind === 'conical' ? bulbR : Math.max(r, bulbR * 0.62);
    var neckH = H * 0.55, bulbH = H - neckH;
    grp.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, neckH, 32, 1, true), glassMat));
    grp.children[0].position.y = bulbH + neckH / 2;
    var body;
    if (g.kind === 'conical') {
      body = new THREE.Mesh(new THREE.CylinderGeometry(r, bulbR, bulbH, 40, 1, true), glassMat);
      body.position.y = bulbH / 2;
    } else {
      // The bulb has to MEET the neck. Sized and centred so the top of the squashed
      // sphere lands exactly at bulbH — otherwise the flask renders as a ball with a
      // tube floating above it, which is what it did.
      var squash = 0.85;
      body = new THREE.Mesh(new THREE.SphereGeometry(bulbR, 40, 26), glassMat);
      body.scale.y = squash;
      body.position.y = bulbH - bulbR * squash;
    }
    grp.add(body);
  } else if (g.kind === 'pipette') {
    var bulbR2 = Math.max(r * 3.0, 0.16);
    grp.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, H, 28, 1, true), glassMat));
    grp.children[0].position.y = H / 2;
    var bulb = new THREE.Mesh(new THREE.SphereGeometry(bulbR2, 36, 22), glassMat);
    bulb.position.y = H * 0.42; bulb.scale.y = 2.0;
    grp.add(bulb);
  } else {
    var tube = new THREE.Mesh(new THREE.CylinderGeometry(r, r, H, 40, 1, true), glassMat);
    tube.position.y = H / 2;
    grp.add(tube);
  }

  // Rim shells, one per glass body. See the note at the top of this pass: at 16%
  // opacity there is no shading to light, so the 250 mL beaker read as a pale
  // rectangle and the row had no silhouettes at all. Back faces of a slightly
  // larger copy are visible only around the edge.
  //
  // Geometry is SHARED with the body rather than rebuilt — disposeGroup collects
  // geometries into a de-duplicated list, so the shared buffer is released once.
  var rimMat = new THREE.MeshBasicMaterial({
    color: m.contrast ? 0xffffff : (selected ? 0x67e8f9 : 0x7dd3fc),
    transparent: true, opacity: selected ? 0.34 : 0.22,
    side: THREE.BackSide, depthWrite: false
  });
  var bodies = grp.children.slice();
  for (var bi = 0; bi < bodies.length; bi++) {
    var shell = new THREE.Mesh(bodies[bi].geometry, rimMat);
    shell.position.copy(bodies[bi].position);
    shell.scale.copy(bodies[bi].scale).multiplyScalar(1.04);
    grp.add(shell);
  }

  // The 1 mL slice, at true scale against this bore.
  var bandH = Math.max(BENCH.MIN_BAND, mlHeightMm(g.boreMm) / BENCH.MM_PER_UNIT);
  var band = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.97, r * 0.97, bandH, 40),
    new THREE.MeshLambertMaterial({
      color: m.contrast ? 0xffffff : (selected ? 0x22d3ee : 0x38bdf8),
      transparent: true, opacity: 0.92
    })
  );
  band.position.y = H * 0.45;
  grp.add(band);

  // Base disc, sized to the vessel it belongs to (see baseR above).
  var foot = new THREE.Mesh(
    new THREE.CylinderGeometry(baseR * 0.96, baseR, 0.03, 40),
    new THREE.MeshLambertMaterial({ color: m.contrast ? 0xffffff : (selected ? 0x0ea5e9 : 0x334155) })
  );
  foot.position.y = 0.015;
  grp.add(foot);

  // Which vessel the mm-per-mL figure and the table below are talking about. The
  // selected vessel was distinguished only by a slightly lighter glass, which is
  // not a difference you can find in a row of six at this size.
  if (selected) {
    // A CONSTANT margin outside the foot. Scaled 1.2-1.52x it was proportional to
    // a base that ranges from 0.17 to 0.76 units, so on the 250 mL beaker the ring
    // grew wider than the bench it stood on and was cropped by the frame.
    var ring = new THREE.Mesh(
      new THREE.RingGeometry(baseR + 0.055, baseR + 0.155, 64),
      new THREE.MeshBasicMaterial({
        color: m.contrast ? 0xffffff : 0x22d3ee,
        transparent: true, opacity: 0.6, side: THREE.DoubleSide
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.034;
    grp.add(ring);
  }

  grp.position.x = x;
  S.model.add(grp);

  // Bore under every vessel; the mm-per-mL figure only on the selected one. Labelling
  // all six put two lines of text over each of the narrow vessels, which sit closest
  // together — the full set is in the table below, where it can be read properly.
  // Below the FOOT, not below the origin. At -0.26 the wide vessels — whose feet
  // are the widest things in the scene and tilt toward the viewer — carried their
  // own label inside themselves; the 250 mL beaker's sat in the middle of it.
  bur3dLabel(THREE, S, S.model, g.boreMm + ' mm',
    new THREE.Vector3(x, -0.30 - baseR * 0.22, 0),
    m.contrast ? '#ffffff' : (selected ? '#22d3ee' : '#94a3b8'), 0.52);
  if (selected) {
    bur3dLabel(THREE, S, S.model, mlHeightMm(g.boreMm).toFixed(1) + ' mm per mL',
      new THREE.Vector3(x, BENCH.H + 0.26, 0), m.contrast ? '#ffffff' : '#67e8f9', 0.92);
  }
  return grp;
}

// Widest half-width a vessel occupies, so the row can be packed without the beaker
// growing through its neighbours — a fixed gap put the 250 mL beaker (76 mm across at
// this scale) straight through the conical flask beside it.
function benchHalfWidth(g) {
  var r = (g.boreMm / 2) / BENCH.MM_PER_UNIT;
  if (g.kind === 'volflask' || g.kind === 'conical') return Math.max(r * 2.2, 0.30);
  if (g.kind === 'pipette') return Math.max(r * 3.0, 0.16);
  return Math.max(r, 0.18);
}

function buildBenchScene(THREE, S, m) {
  if (S._texes) { for (var ti = 0; ti < S._texes.length; ti++) { try { S._texes[ti].dispose(); } catch (e) {} } }
  S._texes = [];
  var n = GLASSWARE.length;
  // Lay the row out by accumulating each vessel's own footprint plus a margin.
  var hws = [], xs = [], cursor = 0;
  for (var i = 0; i < n; i++) {
    var hw = benchHalfWidth(GLASSWARE[i]);
    hws.push(hw);
    if (i > 0) cursor += hw;
    xs.push(cursor);
    cursor += hw + BENCH.GAP;
  }
  // Centre on the row's true EXTENT, not on the last vessel's CENTRE. The vessels
  // differ more than fourfold in half-width — a 250 mL beaker against a pipette —
  // so subtracting xs[n-1]/2 shifted the whole row right by half a beaker and left
  // a third of the canvas empty on the left while the beaker ran off the right.
  var left = xs[0] - hws[0], right = xs[n - 1] + hws[n - 1];
  var mid = (left + right) / 2, halfSpan = (right - left) / 2;
  for (var j = 0; j < n; j++) {
    benchVessel(THREE, S, m, GLASSWARE[j], xs[j] - mid, GLASSWARE[j].id === m.selected);
  }

  // A bench, so six vessels stand on something. Without it the feet read as
  // unattached ellipses and the row floats in the void.
  var deepest = 0;
  for (var hi = 0; hi < hws.length; hi++) if (hws[hi] > deepest) deepest = hws[hi];
  // Margin wide enough to carry the selection ring of whichever vessel is picked,
  // including the widest one at either end of the row.
  var slabDepth = deepest * 1.5 + 0.42;
  var slab = new THREE.Mesh(
    new THREE.BoxGeometry(halfSpan * 2 + 0.52, 0.055, slabDepth),
    new THREE.MeshLambertMaterial({ color: m.contrast ? 0x000000 : 0x16233a })
  );
  slab.position.y = -0.0285;
  S.model.add(slab);
  // A lit front edge, so the slab has a top surface rather than reading as a hole.
  var lipEdge = new THREE.Mesh(
    new THREE.BoxGeometry(halfSpan * 2 + 0.52, 0.012, 0.012),
    new THREE.MeshBasicMaterial({
      color: m.contrast ? 0xffffff : 0x475569, transparent: true, opacity: 0.7
    })
  );
  lipEdge.position.set(0, 0.004, slabDepth / 2);
  S.model.add(lipEdge);

  S.benchCount = n;
  S.target = new THREE.Vector3(0, BENCH.H * 0.44, 0);
  var edge = halfSpan + 0.26;
  // Corners of what is actually drawn, not four points on the centre lines: the old
  // list never sampled (±edge, below zero), so the outermost vessel's foot and its
  // bore label — which tilt toward the viewer and sit lowest on screen — were the
  // two things the fit could not see, and the beaker was cropped along the bottom.
  //
  // Sampled tightly, because this bay is roughly 4:1 and the row is roughly 2:1:
  // the VERTICAL extent sets the camera distance, so every unit of slack above or
  // below the glassware is paid for twice over in horizontal emptiness. The solid
  // is sampled at its real depth; the labels are sprites on the z = 0 plane and are
  // sampled there, at their own half-height rather than at a guessed margin.
  var zHalf = slabDepth / 2;
  var labelLow = -0.30 - deepest * 0.22 - 0.11;   // bore label centre, minus half its height
  var labelHigh = BENCH.H + 0.26 + 0.18;          // the mm-per-mL caption over the selection
  S.fitPts = [];
  for (var sx = -1; sx <= 1; sx += 2) {
    for (var sz = -1; sz <= 1; sz += 2) {
      S.fitPts.push(new THREE.Vector3(sx * edge, BENCH.H, sz * zHalf));
      S.fitPts.push(new THREE.Vector3(sx * edge, 0, sz * zHalf));
    }
    S.fitPts.push(new THREE.Vector3(sx * edge, labelLow, 0));
  }
  S.fitPts.push(new THREE.Vector3(0, labelHigh, 0));
}

var BENCH_GL = (typeof window !== 'undefined' && window.StemLab && typeof window.StemLab.makeOrbitViewer === 'function')
  ? window.StemLab.makeOrbitViewer({
      attr: 'data-titration-bench-gl',
      clearColor: 0x0a1420,
      fov: 40,
      rot: { y: 8, x: 10 },
      fitSlack: 1.08,
      failMessage: '3D bench unavailable — the table of tolerances below carries the same comparison.',
      // See the note on relighting at the top of pass 4 in the burette lights below:
      // ambient down, key and rim up, total DOWN. Glass needs a direction to catch.
      lights: function (THREE, scene) {
        scene.add(new THREE.AmbientLight(0xffffff, 0.42));
        var key = new THREE.DirectionalLight(0xffffff, 0.80);
        key.position.set(0.4, 1, 0.8);
        scene.add(key);
        var rim = new THREE.DirectionalLight(0xbfdbfe, 0.62);
        rim.position.set(-0.6, 0.35, -0.5);
        scene.add(rim);
        // Behind and low, so the far wall of a wide vessel separates from the near
        // one. Without it the 250 mL beaker had no interior at all.
        var back = new THREE.DirectionalLight(0x7dd3fc, 0.34);
        back.position.set(0.15, -0.25, -1);
        scene.add(back);
      },
      debug: function (S) {
        return { vessels: S.benchCount || 0, labelTextures: S._texes ? S._texes.length : 0 };
      },
      build: buildBenchScene
    })
  : {
      attach: function () {}, push: function () {}, onStatusChange: function () {},
      status: function () { return 'failed'; },
      debug: function () { return { state: 'failed', contextLost: false, hostTooOld: true }; },
      dispose: function () {}
    };

function benchGlRef(nodeOrNull) { BENCH_GL.attach(nodeOrNull); }
var benchDrag = { current: null };

if (typeof window !== 'undefined') window.__alloBenchGL = BENCH_GL;

// Host may be older than this tool (it has bitten the rocks crystal lab before):
// calling a missing factory at load time would throw before registerTool runs and
// take the WHOLE tool down, not just its 3D. Degrade to a stub; the 2D station
// carries the lesson exactly as it does on a device with no WebGL.
var BURETTE_GL = (typeof window !== 'undefined' && window.StemLab && typeof window.StemLab.makeOrbitViewer === 'function')
  ? window.StemLab.makeOrbitViewer({
      attr: 'data-titration-burette-gl',
      clearColor: 0x0a1420,
      fov: 40,
      rot: { y: 34, x: 6 },
      fitSlack: 1.10,
      failMessage: '3D burette view unavailable — the eye-height control and readings below still work.',
      lights: function (THREE, scene) {
        scene.add(new THREE.AmbientLight(0xffffff, 0.44));
        var key = new THREE.DirectionalLight(0xffffff, 0.82);
        key.position.set(0.5, 0.9, 0.8);
        scene.add(key);
        var rim = new THREE.DirectionalLight(0xbfdbfe, 0.60);
        rim.position.set(-0.6, 0.3, -0.5);
        scene.add(rim);
        var back = new THREE.DirectionalLight(0x7dd3fc, 0.30);
        back.position.set(0.15, -0.2, -1);
        scene.add(back);
      },
      debug: function (S) {
        return {
          meniscusY: S.meniscusY, crossY: S.crossY, exaggeration: BUR3D.EXAGGERATION,
          // Label textures alive right now. Constant across rebuilds means the
          // dispose-on-rebuild in buildBuretteScene is holding; a number that climbs
          // with every step of the eye slider is a texture leak.
          labelTextures: S._texes ? S._texes.length : 0,
          objects: S.model ? S.model.children.length : 0
        };
      },
      build: buildBuretteScene
    })
  : {
      attach: function () {}, push: function () {}, onStatusChange: function () {},
      status: function () { return 'failed'; },
      debug: function () { return { state: 'failed', contextLost: false, hostTooOld: true }; },
      dispose: function () {}
    };

// ONE stable ref callback at module scope. An inline arrow would be a new identity
// every render, so React would detach and reattach — rebuilding the scene on every
// single tick of the eye-height slider.
// Stops the safety-drill countdown when the walkthrough leaves the DOM. See the ref
// site for why this has to live at module scope rather than inline.
function titrDrillTeardownRef(node) {
  if (node) return;
  if (typeof window !== 'undefined' && window._titrationDrillTimer) {
    clearInterval(window._titrationDrillTimer);
    window._titrationDrillTimer = null;
  }
}

function buretteGlRef(nodeOrNull) { BURETTE_GL.attach(nodeOrNull); }

// Drag state lives beside the viewer at module scope, so it survives the re-render
// that every orbit step triggers.
var buretteDrag = { current: null };
var BUR_HOME = { rotY: 34, rotX: 6, zoom: 1 };
// A FRESH rotation object each time. Storing BUR_HOME itself put its zoom key inside
// the rotation state and handed React a shared module-scope object to hold.
function burHomeRot() { return { rotY: BUR_HOME.rotY, rotX: BUR_HOME.rotX }; }

if (typeof window !== 'undefined') window.__alloBuretteGL = BURETTE_GL;

// Animated titration-curve canvas. Declared here, at module scope, for STABLE IDENTITY.
//
// As an inline `ref: function (cvEl) {...}` this was a new function on every render, so
// React tore it down and set it up again on every single state change: measured at one
// full restart per re-render, which reset performance.now() and snapped the animation
// back to its first frame every time the volume slider moved, while churning the
// canvas backing store, the ResizeObserver and the visibilitychange listener with it.
//
// The body is self-contained — it closes over nothing from render scope — so hoisting
// it is a pure identity change. Per-canvas state rides on the element (_ttAnim,
// _ttCleanup) exactly as before.
var titrAnimCanvases = new Set();
function titrAnimCanvasRef(cvEl) {
            if (!cvEl) {
              titrAnimCanvases.forEach(function (canvas) {
                if (!canvas.isConnected && canvas._ttCleanup) canvas._ttCleanup();
              });
              return;
            }
            if (cvEl._ttCleanup) cvEl._ttCleanup();
            else if (cvEl._ttAnim) { cancelAnimationFrame(cvEl._ttAnim); cvEl._ttAnim = null; }
            var c2 = cvEl.getContext('2d');
            if (!c2) return;
            var W = cvEl.offsetWidth || 600;
            var H = cvEl.offsetHeight || 220;
            cvEl.width = W * 2; cvEl.height = H * 2;
            if (c2.setTransform) c2.setTransform(2, 0, 0, 2, 0, 0);
            else c2.scale(2, 2);
            var start = performance.now();
            var paused = cvEl.getAttribute('data-titration-paused') === 'true';
            var pausedT = 0;
            var alive = true;
            var reducedMotion = false;
            var ro = null;
            try { reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
            function isTitrationHidden() { return typeof document !== 'undefined' && !!document.hidden; }
            function cancelTitrationFrame() {
              if (cvEl._ttAnim && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(cvEl._ttAnim);
              cvEl._ttAnim = null;
            }
            function scheduleTitrationFrame() {
              if (!alive || reducedMotion || cvEl._ttAnim || isTitrationHidden()) return;
              if (paused) return;
              if (typeof requestAnimationFrame !== 'function') return;
              cvEl._ttAnim = requestAnimationFrame(drawTt);
            }
            function cleanupTitrationAnim() {
              alive = false;
              cancelTitrationFrame();
              if (ro) ro.disconnect();
              if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onTitrationVisibilityChange);
              titrAnimCanvases.delete(cvEl);
              cvEl._ttCleanup = null;
              cvEl._ttSetPaused = null;
            }
            function onTitrationVisibilityChange() {
              if (!alive) return;
              if (!cvEl.isConnected) { cleanupTitrationAnim(); return; }
              if (isTitrationHidden()) cancelTitrationFrame();
              else { cancelTitrationFrame(); drawTt(); }
            }
            function resizeTitrationCanvas() {
              if (!alive || !cvEl.isConnected) { cleanupTitrationAnim(); return; }
              cancelTitrationFrame();
              W = cvEl.offsetWidth || 600; H = cvEl.offsetHeight || 220;
              cvEl.width = W * 2; cvEl.height = H * 2;
              if (c2.setTransform) c2.setTransform(2, 0, 0, 2, 0, 0);
              else c2.scale(2, 2);
              drawTt();
            }
            cvEl._ttCleanup = cleanupTitrationAnim;
            titrAnimCanvases.add(cvEl);
            if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onTitrationVisibilityChange);
            cvEl._ttSetPaused = function(nextPaused) {
              nextPaused = !!nextPaused;
              if (nextPaused === paused) { if (!paused) scheduleTitrationFrame(); return; }
              if (nextPaused) {
                pausedT = reducedMotion ? 5 : (performance.now() - start) / 1000;
                paused = true;
                cancelTitrationFrame();
                drawTt();
              } else {
                paused = false;
                start = performance.now() - pausedT * 1000;
                cancelTitrationFrame();
                drawTt();
              }
            };
            function drawTt() {
              if (!alive) return;
              cvEl._ttAnim = null;
              if (!cvEl.isConnected) { cleanupTitrationAnim(); return; }
              if (isTitrationHidden()) { cancelTitrationFrame(); return; }
              var t = reducedMotion ? 5 : (performance.now() - start) / 1000;
              if (paused && !reducedMotion) t = pausedT;
              var cyc = (t * 0.10) % 1; // 0 = no base added, 1 = excess base
              var pH = titrationReferencePH(cyc);
              c2.fillStyle = '#020210';
              c2.fillRect(0, 0, W, H);
              // LEFT: beaker + burette
              var lftW = W * 0.35;
              var burX = lftW * 0.5;
              var burY = 20;
              var burH = 80;
              // Burette, draining from the top as titrant leaves it
              c2.fillStyle = '#7dd3fc';
              c2.fillRect(burX - 6, burY + burH * cyc, 12, burH * (1 - cyc));
              c2.strokeStyle = '#cbd5e1'; c2.lineWidth = 1.5;
              c2.strokeRect(burX - 6, burY, 12, burH);
              c2.beginPath();
              for (var gr = 1; gr < 10; gr++) {
                var gy = burY + burH * gr / 10;
                c2.moveTo(burX - 6, gy); c2.lineTo(burX - (gr % 5 === 0 ? 0 : 3), gy);
              }
              c2.lineWidth = 1; c2.strokeStyle = 'rgba(203,213,225,0.75)'; c2.stroke();
              // Stopcock and the tapered delivery tip
              c2.fillStyle = '#94a3b8';
              c2.fillRect(burX - 9, burY + burH, 18, 5);
              c2.beginPath();
              c2.moveTo(burX - 4, burY + burH + 5);
              c2.lineTo(burX + 4, burY + burH + 5);
              c2.lineTo(burX + 1.5, burY + burH + 20);
              c2.lineTo(burX - 1.5, burY + burH + 20);
              c2.closePath();
              c2.fillStyle = 'rgba(203,213,225,0.55)'; c2.fill();
              c2.font = '11px monospace'; c2.fillStyle = '#7dd3fc'; c2.textAlign = 'left';
              c2.fillText('NaOH', burX + 13, burY + 12);
              // Drip — glowing NaOH beads
              c2.save();
              c2.shadowColor = 'rgba(125,211,252,0.9)'; c2.shadowBlur = 6;
              for (var dr = 0; dr < 3; dr++) {
                var drY = burY + burH + 22 + ((t * 50 + dr * 18) % 34);
                c2.fillStyle = '#7dd3fc';
                c2.beginPath();
                c2.arc(burX, drY, 2, 0, Math.PI * 2);
                c2.fill();
              }
              c2.restore();
              // Conical flask, matching the 3D bench rather than a plain rectangle
              var bkY = H * 0.55;
              var bkW = 70, neckW = 16, shoulder = 14, bkH = 60;
              function flaskPath() {
                c2.beginPath();
                c2.moveTo(burX - neckW / 2, bkY);
                c2.lineTo(burX - neckW / 2, bkY + shoulder);
                c2.lineTo(burX - bkW / 2, bkY + bkH);
                c2.lineTo(burX + bkW / 2, bkY + bkH);
                c2.lineTo(burX + neckW / 2, bkY + shoulder);
                c2.lineTo(burX + neckW / 2, bkY);
              }
              // Solution color shifts with pH (colorless \u2192 pink for phenolphthalein)
              var solColor = pH < 8.3 ? 'rgba(252, 165, 165, 0.6)' : 'rgba(217, 70, 239, 0.7)';
              var surfaceY = bkY + shoulder + 12;
              c2.save();
              flaskPath();
              c2.clip();
              c2.fillStyle = solColor;
              c2.fillRect(burX - bkW / 2, surfaceY, bkW, bkH);
              // Depth, not a pH signal: the pool darkens away from the surface.
              var solShade = c2.createLinearGradient(0, surfaceY, 0, bkY + bkH);
              solShade.addColorStop(0, 'rgba(255,255,255,0.26)');
              solShade.addColorStop(0.4, 'rgba(255,255,255,0)');
              solShade.addColorStop(1, 'rgba(0,0,0,0.16)');
              c2.fillStyle = solShade;
              c2.fillRect(burX - bkW / 2, surfaceY, bkW, bkH);
              c2.restore();
              c2.strokeStyle = 'rgba(226,232,240,0.85)'; c2.lineWidth = 1;
              c2.beginPath(); c2.moveTo(burX - bkW / 2 + 8, surfaceY); c2.lineTo(burX + bkW / 2 - 8, surfaceY); c2.stroke();
              c2.strokeStyle = '#cbd5e1'; c2.lineWidth = 2;
              flaskPath();
              c2.stroke();
              c2.font = 'bold 11px sans-serif'; c2.fillStyle = '#cbd5e1'; c2.textAlign = 'center';
              c2.fillText('HCl + indicator', burX, bkY + bkH + 15);
              // RIGHT: pH vs volume plot
              var plotX = lftW + 30, plotY = 20;
              var plotW = W - plotX - 20, plotH = H - 60;
              c2.fillStyle = 'rgba(255,255,255,0.04)';
              c2.fillRect(plotX, plotY, plotW, plotH);
              c2.strokeStyle = '#475569'; c2.lineWidth = 1; c2.strokeRect(plotX, plotY, plotW, plotH);
              c2.strokeStyle = 'rgba(71,85,105,0.55)';
              c2.beginPath();
              for (var gl = 2; gl <= 12; gl += 2) {
                var gy = plotY + (1 - gl / 14) * plotH;
                c2.moveTo(plotX, gy); c2.lineTo(plotX + plotW, gy);
              }
              c2.stroke();
              c2.font = '11px monospace'; c2.fillStyle = '#94a3b8'; c2.textAlign = 'right';
              c2.fillText('14', plotX - 4, plotY + 8);
              c2.fillText('7', plotX - 4, plotY + plotH / 2);
              c2.fillText('0', plotX - 4, plotY + plotH);
              // Equivalence line
              c2.strokeStyle = 'rgba(251, 191, 36, 0.4)'; c2.setLineDash([3, 3]);
              c2.beginPath();
              c2.moveTo(plotX + plotW * 0.50, plotY); c2.lineTo(plotX + plotW * 0.50, plotY + plotH);
              c2.stroke();
              c2.setLineDash([]);
              c2.font = '10px monospace'; c2.fillStyle = '#fbbf24'; c2.textAlign = 'center';
              c2.fillText('Equivalence', plotX + plotW * 0.50, plotY + plotH - 4);
              // Plot curve up to current cyc — neon glow on the key data trace
              c2.save();
              c2.shadowColor = 'rgba(16,185,129,0.85)'; c2.shadowBlur = 8;
              c2.strokeStyle = '#10b981'; c2.lineWidth = 2;
              c2.beginPath();
              for (var px = 0; px <= cyc * plotW; px++) {
                var py = plotY + (1 - titrationReferencePH(px / plotW) / 14) * plotH;
                if (px === 0) c2.moveTo(plotX + px, py);
                else c2.lineTo(plotX + px, py);
              }
              c2.stroke();
              c2.restore();
              // Current marker — glowing pulse so the eye tracks the titration point
              var cpX = plotX + cyc * plotW;
              var cpY = plotY + (1 - pH / 14) * plotH;
              var cpPulse = 5 + Math.sin(t * 4) * 1.2;
              c2.save();
              c2.shadowColor = 'rgba(253,224,71,0.95)'; c2.shadowBlur = 12;
              c2.fillStyle = '#fde047';
              c2.beginPath();
              c2.arc(cpX, cpY, cpPulse, 0, Math.PI * 2);
              c2.fill();
              c2.restore();
              // The explanatory sentence is rendered as responsive HTML below the
              // canvas instead of being clipped into bitmap pixels on narrow screens.
              scheduleTitrationFrame();
            }
            drawTt();
            if (typeof ResizeObserver === 'function') {
              ro = new ResizeObserver(resizeTitrationCanvas);
              ro.observe(cvEl);
            }
          }

// Persisted classroom state can outlive a release. Normalize it before any
// calculation so a removed option, malformed trial, or stale result cannot crash the
// lab or reveal the answer for a different unknown.
var TITRATION_SUBSTRATE_CSS =
  '.theme-dark [data-titration-instance]{background:#0f172a;color:#e2e8f0;padding:14px;border-radius:18px}' +
  '.theme-contrast [data-titration-instance]{background:#000000;color:#ffffff;padding:14px;border-radius:18px}';

function titrationReferencePH(progress) {
  var p = Math.max(0, Math.min(1, Number(progress) || 0));
  var v0 = 25, conc = 0.1, added = p * 50;
  var excess = conc * added - conc * v0;      // mmol of OH- beyond the acid present
  var total = v0 + added;
  // Water's own contribution is what keeps a real curve finite at equivalence; without
  // it this diverges to +/-Infinity exactly where the interesting part is.
  var net = excess / total;
  var hydro = (-net + Math.sqrt(net * net + 4e-14)) / 2;
  return Math.max(0, Math.min(14, -Math.log10(Math.max(hydro, 1e-14))));
}

function titrFinite(raw, fallback, min, max) {
  var n = Number(raw);
  if (!isFinite(n)) n = Number(fallback);
  if (!isFinite(n)) n = 0;
  if (min != null && n < min) n = min;
  if (max != null && n > max) n = max;
  return n;
}
function titrIndex(raw, length) {
  if (!(length > 0)) return 0;
  var n = Math.floor(Number(raw));
  return isFinite(n) && n >= 0 && n < length ? n : 0;
}
function normalizeTitrationTrials(raw, run) {
  if (!Array.isArray(raw)) return [];
  return raw.map(function (trial) {
    if (!trial || typeof trial !== 'object') return null;
    if (trial.run != null && Number(trial.run) !== Number(run)) return null;
    var recorded = Number(trial.recorded);
    var vb = Number(trial.vb);
    if (!isFinite(recorded) || recorded <= 0 || recorded > BURETTE.CAPACITY_ML) return null;
    if (!isFinite(vb)) vb = recorded;
    if (vb <= 0 || vb > BURETTE.CAPACITY_ML) return null;
    var initialRecorded = Number(trial.initialRecorded);
    var finalRecorded = Number(trial.finalRecorded);
    if (!isFinite(initialRecorded)) initialRecorded = 0;
    if (!isFinite(finalRecorded)) finalRecorded = initialRecorded + recorded;
    var rawEndpointState = trial.endpointState != null ? trial.endpointState : trial.endpointKind;
    var endpointState = ['none', 'flash', 'endpoint', 'over'].indexOf(rawEndpointState) >= 0
      ? rawEndpointState : null;
    return Object.assign({}, trial, {
      run: Number(run), vb: vb, recorded: roundBuretteDelta(recorded),
      initialRecorded: roundBuretteReading(initialRecorded),
      finalRecorded: roundBuretteReading(finalRecorded),
      endpointState: endpointState,
      included: trial.included !== false
    });
  }).filter(Boolean);
}
function normalizeTitrationLog(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(function (entry) {
    if (!entry || !isFinite(Number(entry.run)) || typeof entry.name !== 'string' ||
        !isFinite(Number(entry.volErrMl)) || !isFinite(Number(entry.concErrPct)) ||
        !isFinite(Number(entry.seconds))) return null;
    return Object.assign({}, entry, {
      run: Number(entry.run),
      volErrMl: Number(entry.volErrMl),
      concErrPct: Number(entry.concErrPct),
      seconds: Number(entry.seconds)
    });
  }).filter(Boolean).slice(-8);
}
function normalizeTitrationResult(raw, run) {
  if (!raw || typeof raw !== 'object' || Number(raw.run) !== Number(run)) return null;
  if (['excellent', 'good', 'fair', 'poor'].indexOf(raw.band) < 0) return null;
  var nums = ['measuredConc', 'volErrMl', 'techniqueErrMl', 'methodBiasMl', 'concErrPct'];
  for (var i = 0; i < nums.length; i++) if (!isFinite(Number(raw[nums[i]]))) return null;
  if (!raw.stats || !isFinite(Number(raw.stats.n)) || !isFinite(Number(raw.stats.mean)) ||
      !isFinite(Number(raw.stats.spread)) || !isFinite(Number(raw.stats.sd))) return null;
  if (!raw.pa || ['both', 'precise-not-accurate', 'accurate-not-precise', 'neither'].indexOf(raw.pa.verdict) < 0 ||
      !isFinite(Number(raw.pa.biasMl))) return null;
  var result = Object.assign({}, raw);
  nums.forEach(function (key) { result[key] = Number(raw[key]); });
  result.run = Number(raw.run);
  result.seconds = isFinite(Number(raw.seconds)) ? Number(raw.seconds) : 0;
  result.stats = Object.assign({}, raw.stats, {
    n: Number(raw.stats.n), mean: Number(raw.stats.mean),
    spread: Number(raw.stats.spread), sd: Number(raw.stats.sd)
  });
  result.pa = Object.assign({}, raw.pa, {
    precise: !!raw.pa.precise, accurate: !!raw.pa.accurate, biasMl: Number(raw.pa.biasMl)
  });
  if (raw.diag && typeof raw.diag === 'object' &&
      isFinite(Number(raw.diag.predictedMl)) && isFinite(Number(raw.diag.observedMl))) {
    result.diag = Object.assign({}, raw.diag, {
      predictedMl: Number(raw.diag.predictedMl),
      observedMl: Number(raw.diag.observedMl),
      matchesObserved: !!raw.diag.matchesObserved
    });
  } else {
    result.diag = null;
  }
  result.withinTolerance = !!raw.withinTolerance;
  return result;
}
function normalizeBufferState(raw) {
  var defaults = { ka: 1e-5, ratio: 1, startPH: 4.74, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
  var b = raw && typeof raw === 'object' ? Object.assign({}, defaults, raw) : defaults;
  b.ka = titrFinite(b.ka, defaults.ka, 1e-12, 1e-2);
  b.ratio = titrFinite(b.ratio, defaults.ratio, 0.05, 20);
  b.hypothesis = typeof b.hypothesis === 'string' ? b.hypothesis : '';
  b.explanation = typeof b.explanation === 'string' ? b.explanation : '';
  b.log = Array.isArray(b.log) ? b.log.filter(function (o) {
    return o && isFinite(Number(o.pKa)) && isFinite(Number(o.ratio)) && isFinite(Number(o.pH)) && isFinite(Number(o.shift));
  }).slice(-8) : [];
  b.stuckRevealed = !!b.stuckRevealed;
  b.understood = !!b.understood;
  return b;
}

// Safety translations written for superseded procedures are more dangerous than an
// English fallback. These keys remain English until each localized version receives a
// new protocol review; ordinary instructional UI stays localized.
var TITRATION_REVIEWED_ENGLISH_KEYS = {
  'stem.titration.naoh_causes_alkali_burns_that_penetrat': true,
  'stem.titration.the_10_second_rule_if_chemicals_splash': true,
  'stem.titration.remember_p_a_s_s_pull_the_pin_aim_at_b': true,
  'stem.titration.remove_clothing_rinse_under_running_wa': true,
  'stem.titration.correct_immediate_and_prolonged_rinsin': true,
  'stem.titration.go_to_eyewash_station_immediately_rins': true,
  'stem.titration.correct_speed_is_everything_you_have_a': true,
  'stem.titration.extremely_dangerous_naoh_causes_alkali': true,
  'stem.titration.alert_others_contain_with_absorbent_ne': true,
  'stem.titration.perfect_procedure_1_alert_nearby_stude': true,
  'stem.titration.partially_right_but_incomplete_floodin': true,
  'stem.titration.tell_the_teacher_and_don_t_touch_it': true,
  'stem.titration.telling_the_teacher_is_good_but_at_0_1': true,
  'stem.titration.move_the_experiment_to_the_fume_hood_i': true,
  'stem.titration.correct_volatile_chemicals_like_nh_mus': true,
  'stem.titration.fanning_is_for_wafting_to_detect_odors': true,
  'stem.titration.dangerous_if_you_can_smell_nh_the_conc': true,
  'stem.titration.life_saving_action_naocl_2nh_2nh_cl_ch': true,
  'stem.titration.acid_spill_neutralize_with_sodium_bica': true,
  'stem.titration.neutralized_acid_base_solutions_ph_6_8': true,
  'stem.titration.equip_each_piece_of_ppe_before_proceed': true,
  'stem.titration.know_where_it_is_before_you_start_you_': true,
  'stem.titration.acetic_acid_is_flammable_know_your_nea': true,
  'stem.titration.face_shields_provide_splash_protection': true
};

// Main experiment bench. The chemistry stays in the existing titration model;
// this scene receives its readings and colors and never computes an endpoint.
function titrationBenchLiquidProfile(fraction) {
  var f = Math.max(0, Math.min(1, Number(fraction) || 0));
  var base = 0.90, neck = 0.25, height = 1.65, slope = (neck - base) / height;
  function volume(h) { return base * base * h + base * slope * h * h + slope * slope * h * h * h / 3; }
  var lo = 0, hi = height, target = f * volume(height);
  for (var i = 0; i < 40; i++) { var mid = (lo + hi) / 2; if (volume(mid) < target) lo = mid; else hi = mid; }
  var fill = f === 0 ? 0 : f === 1 ? height : (lo + hi) / 2;
  return { height: fill, radius: base + slope * fill, fraction: f };
}

function titrationBenchPreviewTime(value) {
  return typeof value==='number' && isFinite(value) ? Math.max(0,Math.min(1800,value)) : null;
}
// A finite illustrative surface cue shared by the live scene and static inspector.
function titrationRippleFrame(elapsed,index,radius) {
  var age=elapsed-650-index*140,k=Math.max(0,Math.min(1,age/650));
  return {visible:age>=0&&age<650&&radius>0,scale:radius*(0.12+0.80*k),opacity:0.48*(1-k)*(1-k)};
}
function buildTitrationExperimentScene(THREE, S, m) {
  var previewMs=titrationBenchPreviewTime(m.previewMs);
  function material(color, extra) { return new THREE.MeshPhongMaterial(Object.assign({ color: color, shininess: 65 }, extra || {})); }
  var steel = material(0x71869b), dark = material(0x17293e), white = material(0xe5edf5);
  var glass = material(0xa9dcf2, { transparent: true, opacity: m.contrast ? 0.30 : 0.17, side: THREE.DoubleSide, depthWrite: false });
  function mesh(name, geometry, mat, x, y, z) {
    var obj = new THREE.Mesh(geometry, mat); obj.name = name; obj.position.set(x || 0, y || 0, z || 0); S.model.add(obj); return obj;
  }
  function box(name, w, h, d, mat, x, y, z) { return mesh(name, new THREE.BoxGeometry(w,h,d),mat,x,y,z); }
  function tube(name, rt, rb, h, mat, x, y, z, open) { return mesh(name,new THREE.CylinderGeometry(rt,rb,h,40,1,!!open),mat,x,y,z); }
  function ring(name,r,mat,x,y,z) { var obj=mesh(name,new THREE.TorusGeometry(r,0.023,8,48),mat,x,y,z);obj.rotation.x=Math.PI/2;return obj; }
  var fx = 0.42;
  // The apparatus used to float in flat clear colour with the bench slab ending in
  // nothing, which reads as an unfinished render rather than a lab. The camera orbits
  // and the model does not, so a backdrop PLANE would swing edge-on; a cyclorama
  // cylinder is rotation-invariant. Vertex colours rather than a CanvasTexture,
  // because this builder also runs under jsdom in the bench tests, where a 2D context
  // does not exist. Named 'stage-' so the close-up frames exclude the room along with
  // the rest of the bench.
  function stage(name, geometry, mat, x, y, z) {
    var obj = new THREE.Mesh(geometry, mat); obj.name = name; obj.position.set(x||0,y||0,z||0);
    obj.renderOrder = -1; S.model.add(obj); return obj;
  }
  var cyc = new THREE.CylinderGeometry(30, 30, 46, 40, 12, true);
  var cycPos = cyc.attributes.position, tint = new Float32Array(cycPos.count * 3);
  var lowC = new THREE.Color(0x16344d), highC = new THREE.Color(0x04101c), mixC = new THREE.Color();
  for (var vi = 0; vi < cycPos.count; vi++) {
    // Cylinder positions are local and the mesh sits at the origin, so this is world
    // height: the pool of light starts at bench level and is gone by the top of the stand.
    var kk = Math.max(0, Math.min(1, (cycPos.getY(vi) + 1.2) / 13));
    mixC.copy(lowC).lerp(highC, kk * kk);
    tint[vi*3] = mixC.r; tint[vi*3+1] = mixC.g; tint[vi*3+2] = mixC.b;
  }
  cyc.setAttribute('color', new THREE.BufferAttribute(tint, 3));
  stage('stage-cyclorama', cyc,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false }),
    0, 0, 0);
  stage('stage-floor', new THREE.CircleGeometry(30, 40),
    new THREE.MeshBasicMaterial({ color: 0x0e2537, depthWrite: false }), 0, -0.95, 0)
    .rotation.x = -Math.PI / 2;
  box('workbench',5.2,0.16,2.9,dark,0,-0.09,0);
  // Contact shadows. Nothing here casts one, so the flask floated over the tile and
  // the tile over the bench - the strongest 'it is not really there' cue in the whole
  // render, and cheaper to answer with three unlit discs than with a shadow map.
  function contact(name, radius, y, opacity, x, z) {
    var disc = stage(name, new THREE.CircleGeometry(radius, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: opacity, depthWrite: false }),
      x, y, z);
    disc.rotation.x = -Math.PI / 2; disc.scale.z = 0.96; return disc;
  }
  box('bench-front-edge',5.2,0.035,0.035,steel,0,0,1.43);
  box('stand-base',1.35,0.14,1.25,dark,-1.23,0.06,-0.18);
  contact('stage-shadow-stand',0.86,-0.004,0.34,-1.23,-0.18);
  tube('support-rod',0.055,0.055,6.45,steel,-1.4,3.35,-0.3);
  [4.3,5.8].forEach(function(y) {
    box('burette-clamp',1.82,0.085,0.12,steel,-0.49,y,-0.12);
    tube('clamp-collar',0.11,0.11,0.23,dark,-1.4,y,-0.3);
    ring('burette-collar',0.20,steel,fx,y,0);
    ring('burette-grip',0.171,material(0x23465c,{shininess:10}),fx,y,0);
    var screw=tube('clamp-screw',0.09,0.09,0.11,dark,-1.4,y,-0.10);screw.rotation.x=Math.PI/2;
    box('clamp-screw-slot',0.095,0.018,0.014,steel,-1.4,y,-0.035);
  });
  // Thicker and reseated: it spanned 0.038-0.103 between a bench top at -0.010 and a
  // flask whose glass starts at 0.165, so it floated at both ends. Now its underside
  // meets the bench and its face meets the foot of the flask.
  box('white-endpoint-tile',2.22,0.175,2.12,white,fx,0.0775,0.08);
  contact('stage-shadow-tile',1.42,-0.004,0.30,fx,0.08);
  contact('stage-shadow-flask',1.02,0.168,0.40,fx,0);
  tube('flask-body',0.27,0.94,1.7,glass,fx,1.015,0,true);
  tube('flask-neck',0.27,0.27,0.47,glass,fx,2.1,0,true);
  ring('flask-rim',0.27,white,fx,2.335,0);
  ring('flask-inner-lip',0.244,material(0xbce7ff,{transparent:true,opacity:0.5,depthWrite:false}),fx,2.32,0);
  // Was steel: a bright ring at the foot of the flask read as a second liquid
  // surface, so the flask appeared to stand in a pool of spilled indicator.
  ring('flask-base',0.94,dark,fx,0.165,0);
  var profile=titrationBenchLiquidProfile(m.fill);
  // Match the source color, including its transparency. Three r128 setStyle ignores rgba alpha.
  var rgba=/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/.exec(m.color || '');
  var color=rgba ? 'rgb('+rgba[1]+','+rgba[2]+','+rgba[3]+')' : m.color || '#c8dcff';
  var alpha=rgba && rgba[4] !== undefined ? Number(rgba[4]) : 0.80;
  var solution=material(color,{transparent:true,opacity:Math.max(0.20,alpha),depthWrite:false,side:THREE.DoubleSide,shininess:100});
  // Open-ended: the closed bottom cap was lit as brightly as the meniscus above it,
  // so the flask showed two equally convincing surfaces. A dedicated darker floor
  // disc reads as liquid pooled on glass and leaves exactly one bright ellipse.
  if(profile.height>0.0001) tube('flask-liquid',profile.radius,0.90,profile.height,solution,fx,0.18+profile.height/2,0,true);
  var deep=new THREE.Color(color).multiplyScalar(0.45);
  // Opacity follows the solution's own alpha: a colourless flask must not grow an
  // opaque black pool just because the shading maths ran.
  var liquidFloor=mesh('flask-liquid-floor',new THREE.CircleGeometry(0.89,36),
    new THREE.MeshBasicMaterial({color:deep.getHex(),transparent:true,opacity:Math.min(0.85,0.20+alpha*0.65)}),fx,0.170,0);
  liquidFloor.rotation.x=-Math.PI/2;liquidFloor.visible=profile.height>0.0001;
  var surface=tube('liquid-surface',profile.radius,profile.radius,0.014,material(color,{transparent:true,opacity:Math.max(0.35,alpha),depthWrite:false}),fx,0.18+profile.height,0);
  surface.visible=profile.height>0.0001;
  var surfaceRim=ring('liquid-surface-rim',profile.radius,material(0xd5f4ff,{transparent:true,opacity:0.28,depthWrite:false}),fx,0.18+profile.height,0);
  surfaceRim.scale.set(1,1,0.42);surfaceRim.visible=profile.height>0.0001;
  var ripples=[0,1,2].map(function(index){
    var ripple=mesh('liquid-ripple-'+index,new THREE.TorusGeometry(1,0.014,6,64),new THREE.MeshBasicMaterial({color:0x173e54,transparent:true,opacity:0,depthWrite:false}),fx,0.199+profile.height,0);
    var highlight=new THREE.Mesh(new THREE.TorusGeometry(1,0.005,6,64),new THREE.MeshBasicMaterial({color:0xe2f6ff,transparent:true,opacity:0,depthWrite:false}));highlight.renderOrder=5;ripple.add(highlight);
    ripple.rotation.x=Math.PI/2;ripple.visible=false;ripple.renderOrder=4;return ripple;
  });
  // A back-facing shell just outside the glass lights only where the surface turns
  // away from the camera, which is a cheap fresnel: it puts a rim back on the wall
  // in FRONT of the liquid. Both meshes write no depth, so previously the solution
  // had a hard edge against nothing and the flask stopped reading as glass at all.
  var sheen=material(0xbfe9ff,{transparent:true,opacity:m.contrast?0.34:0.20,side:THREE.BackSide,depthWrite:false,blending:THREE.AdditiveBlending});
  mesh('flask-glow',new THREE.CylinderGeometry(0.278,0.968,1.751,40,1,true),sheen,fx,1.015,0);
  mesh('flask-glow-neck',new THREE.CylinderGeometry(0.278,0.278,0.484,32,1,true),sheen,fx,2.1,0);
  // Seated on the flask floor and no longer pure white: at full brightness inside a
  // pale solution it read as a scratch on the glass rather than a stir bar.
  var stir=box('stir-bar',0.49,0.075,0.105,material(0xb7c6d6,{shininess:18}),fx,0.212,0);
  var bottom=3.12, length=3.12, top=bottom+length;
  tube('burette-glass',0.155,0.155,length,glass,fx,bottom+length/2,0,true);
  box('burette-highlight',0.011,length,0.008,material(0xe2f6ff,{transparent:true,opacity:0.42,depthWrite:false}),fx-0.13,bottom+length/2,0.08);
  ring('burette-rim',0.155,white,fx,top,0);
  var reading=Math.max(0,Math.min(50,Number(m.reading)||0));
  var liquidHeight=length*(1-reading/50);
  var titrant=material(m.redox ? 0x9333ea : 0x86d3ed,{transparent:true,opacity:m.redox?0.8:0.45,depthWrite:false});
  var column=tube('burette-liquid',0.13,0.13,Math.max(0.001,liquidHeight),titrant,fx,bottom+liquidHeight/2,0);column.visible=liquidHeight>0;
  var meniscus=ring('burette-meniscus',0.13,white,fx,bottom+liquidHeight,0);meniscus.visible=liquidHeight>0;
  for(var mark=0;mark<=50;mark++) box('graduation-'+mark,mark%10===0?0.20:0.10,0.012,0.014,white,fx-0.04,top-mark/50*length,0.158);
  var scaleInk=new THREE.LineBasicMaterial({color:0xe2f4ff});
  for(var number=0;number<=50;number+=10){
    var label=new THREE.LineSegments(titrationScaleNumber(THREE,number,0.14),scaleInk);label.name='burette-number-'+number;label.position.set(fx+0.22,top-number/50*length,0.18);S.model.add(label);
  }
  var guideGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(fx-0.43,bottom+liquidHeight,0.20),new THREE.Vector3(fx+0.47,bottom+liquidHeight,0.20)]);
  var guide=new THREE.Line(guideGeometry,new THREE.LineDashedMaterial({color:0xfbbf24,dashSize:0.05,gapSize:0.035}));guide.name='burette-reading-guide';guide.computeLineDistances();guide.visible=m.focus==='burette';S.model.add(guide);
  var valve=tube('stopcock-body',0.16,0.16,0.16,white,fx,3.00,0);valve.rotation.x=Math.PI/2;
  var handle=box('stopcock-handle',0.62,0.075,0.09,material(0x22c8dc),fx,3.00,0.14);handle.rotation.z=m.animating?0:Math.PI/2;
  // Ended 0.26 short of the flask mouth, so every drop fell through open air past
  // the OUTSIDE of the neck. Delivering with the tip inside the neck is the
  // technique this lab teaches; the burette close-up frame below widened to match.
  tube('burette-tip',0.075,0.026,0.72,glass,fx,2.61,0);
  var drop=mesh('titrant-drop',new THREE.SphereGeometry(0.052,16,12),titrant,fx,2.20,0);drop.scale.y=1.35;drop.visible=!!m.animating;
  // The transient bloom of colour where a drop lands, dying away as the swirl mixes
  // it back in, is the moment this whole lab is about, and nothing modelled it: the
  // solution simply stepped from colourless to uniformly pink. flashHold carries how
  // close the addition is to equivalence and lengthens the fade, which is exactly
  // the cue a student is told to watch for as the endpoint approaches.
  var flashHold=Math.max(0,Math.min(1,Number(m.flashHold)||0));
  var flashLife=340+flashHold*760;
  var flash=mesh('titrant-flash',new THREE.SphereGeometry(0.30,20,14),
    material(m.flashColor||color,{transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}),
    fx,0.18+profile.height,0);
  flash.visible=false;
  // Animation is a brief cue for an addition, not a fluid-dynamics model or a drop counter.
  var started=null;
  S.tick=function(now){ if(!m.animating && previewMs===null)return; if(started===null)started=now;var elapsed=previewMs===null?Math.max(0,now-started):previewMs;var phase=Math.min(1,elapsed/650);drop.position.y=2.20-phase*(2.20-(0.18+profile.height));drop.visible=elapsed<650 && m.focus!=='burette';stir.rotation.y=Math.min(elapsed,700)*0.013;handle.rotation.z=elapsed<650?0:Math.PI/2;
    ripples.forEach(function(ripple,index){var frame=titrationRippleFrame(elapsed,index,profile.radius);ripple.visible=frame.visible&&profile.height>0.0001&&m.focus!=='burette';ripple.scale.setScalar(frame.scale);ripple.material.opacity=frame.opacity;ripple.children[0].material.opacity=frame.opacity;});
    var fe=elapsed-620;
    if(fe>=0 && fe<flashLife && profile.height>0.0001 && m.focus!=='burette'){
      var k=fe/flashLife, grow=0.55+k*1.85;
      flash.visible=true;
      flash.scale.set(grow,Math.min(grow,0.34+k*1.05),grow);
      flash.material.opacity=0.8*(1-k)*(1-k);
      flash.position.y=0.18+profile.height-Math.min(profile.height*0.6,k*0.46);
    } else flash.visible=false;
  };
  S.target=new THREE.Vector3(0,3.15,0);S.half=new THREE.Vector3(2.8,3.55,1.55);
  // Close-ups frame the selected apparatus, not an arbitrary zoom of the whole bench.
  // Hidden meshes remain owned by the shared viewer and are disposed with the scene.
  var focus=m.focus==='flask'||m.focus==='burette'?m.focus:'apparatus';
  if(focus!=='apparatus'){
    S.model.children.forEach(function(obj){
      var belongs=focus==='flask'
        ? /^(flask-|liquid-|stir-bar|white-endpoint-tile|burette-tip|titrant-)/.test(obj.name)
        : /^(burette-(?!clamp)|graduation-|stopcock-)/.test(obj.name);
      obj.visible=obj.visible && belongs;
    });
    if(focus==='flask'){S.target.set(fx,1.50,0);S.half.set(1.18,1.65,1.18);}
    else {S.target.set(fx,4.35,0);S.half.set(0.58,2.14,0.44);}
  }
  S.experiment={focus:focus,reading:reading,delivered:m.delivered,fillFraction:profile.fraction,liquidSurface:0.18+profile.height,meniscus:bottom+liquidHeight,color:m.color,animating:!!m.animating,previewMs:previewMs};
}

function titrationBenchTracePoints(points, volume, value) {
  // Always end on the exact current reading, even between the curve's 0.2 mL samples.
  var current=Math.max(0,Number(volume)||0);
  var trace=(points||[]).filter(function(p){return p && isFinite(p.vol) && isFinite(p.y) && p.vol>=0 && p.vol<current;});
  if(isFinite(value))trace.push({vol:current,y:Number(value)});
  return trace;
}

function TitrationBenchTrace(props) {
  var h=props.React.createElement,t=props.t,c=props.curve;
  var left=39,top=30,width=207,height=150;
  var x=function(v){return left+Math.max(0,Math.min(c.maxVolume,v))/c.maxVolume*width;};
  var y=function(value){return top+height-(Math.max(c.min,Math.min(c.max,value))-c.min)/(c.max-c.min)*height;};
  var trace=titrationBenchTracePoints(c.points,c.volume,c.value);
  var path=trace.map(function(p,i){return (i?'L':'M')+x(p.vol).toFixed(2)+' '+y(p.y).toFixed(2);}).join(' ');
  var eqVisible=c.equivalence>=0 && c.equivalence<=c.maxVolume;
  return h('section',{className:'titr-immersive-trace','data-titration-bench-trace':true,'aria-label':t('stem.titration.bench_live_curve','Live curve')},
    h('h4',null,t('stem.titration.bench_live_curve','Live curve')),
    h('p',{className:'titr-trace-value'},c.readout),
    h('svg',{viewBox:'0 0 260 225',role:'img','aria-label':c.description,style:{display:'block',width:'100%',height:'auto'}},
      h('text',{x:left,y:15,fill:'#e2edf8',fontSize:12},c.label),
      [c.min,(c.min+c.max)/2,c.max].map(function(value){return h('g',{key:value},
        h('line',{x1:left,y1:y(value),x2:left+width,y2:y(value),stroke:'#536e83',strokeWidth:1}),
        h('text',{x:left-7,y:y(value)+4,fill:'#cbd5e1',fontSize:11,textAnchor:'end'},c.tick(value))
      );}),
      h('line',{x1:left,y1:top,x2:left,y2:top+height,stroke:'#cbd5e1'}),
      [0,c.maxVolume/2,c.maxVolume].map(function(v){return h('text',{key:v,x:x(v),y:top+height+18,fill:'#cbd5e1',fontSize:11,textAnchor:'middle'},v);}),
      h('text',{x:left+width/2,y:220,fill:'#cbd5e1',fontSize:11,textAnchor:'middle'},t('stem.titration.bench_volume_axis','Titrant volume (mL)')),
      eqVisible && h('line',{x1:x(c.equivalence),x2:x(c.equivalence),y1:top,y2:top+height,stroke:'#fbbf24',strokeWidth:1.5,strokeDasharray:'4 4'}),
      h('path',{'data-titration-bench-trace-line':true,d:path,fill:'none',stroke:'#67e8f9',strokeWidth:3,strokeLinejoin:'round',strokeLinecap:'round'}),
      h('circle',{'data-titration-bench-trace-current':true,cx:x(c.volume),cy:y(c.value),r:4.5,fill:'#67e8f9',stroke:'#071422',strokeWidth:2})
    ),
    h('p',null,t('stem.titration.bench_trace_note','Simulated response up to the current volume.')),
    h('p',{className:'titr-trace-equivalence'},t('stem.titration.bench_equivalence_marker','Dashed line: equivalence volume'),h('strong',null,c.equivalence.toFixed(1)+' mL')),
    h('p',null,t('stem.titration.bench_signal_note','Compare the curve with the solution color. Indicator endpoint and equivalence are different signals.'))
  );
}

function titrationBenchDose(raw, remaining) {
  if(raw == null || String(raw).trim()==='')return null;
  var n=Number(raw),limit=Number(remaining);
  if(!isFinite(n)||!isFinite(limit)||n<0.1||n>limit+1e-8||Math.abs(n*10-Math.round(n*10))>1e-7)return null;
  return Math.round(n*10)/10;
}
function titrationBenchNotebook(raw) {
  var ids={};
  return (Array.isArray(raw)?raw:[]).filter(function(r){
    if(!r||!Number.isSafeInteger(r.id)||r.id<1||r.id>1000000000||ids[r.id]||typeof r.preset!=='string'||typeof r.setup!=='string'||(r.axis!=='pH'&&r.axis!=='E')||typeof r.volume!=='number'||!isFinite(r.volume)||r.volume<0||r.volume>150||typeof r.value!=='number'||!isFinite(r.value))return false;
    ids[r.id]=true;return true;
  }).slice(0,40).map(function(r){return {id:r.id,preset:r.preset.slice(0,80),setup:r.setup.slice(0,240),axis:r.axis,volume:r.volume,value:r.value,observation:typeof r.observation==='string'?r.observation.slice(0,240):'',indicator:typeof r.indicator==='string'?r.indicator.slice(0,120):'',note:typeof r.note==='string'?r.note.slice(0,500):''};});
}
function titrationBenchCompare(a,b) {
  if(!a||!b||a.id===b.id||a.preset!==b.preset||a.setup!==b.setup||a.axis!==b.axis)return null;
  var volume=Number((b.volume-a.volume).toFixed(1)),response=Number((b.value-a.value).toFixed(a.axis==='E'?3:2));
  return isFinite(volume)&&isFinite(response)?{volume:volume,response:response,axis:a.axis}:null;
}
// Zoom to the selected observations; no titration curve is inferred between them.
function titrationComparisonFrame(a,b) {
  var difference=titrationBenchCompare(a,b);if(!difference)return null;
  function bounds(v1,v2,minimum,floor,ceiling){
    var pad=Math.max(minimum/2,Math.abs(v2-v1)*0.15),low=Math.min(v1,v2)-pad,high=Math.max(v1,v2)+pad;
    if(floor!==null)low=Math.max(floor,low);if(ceiling!==null)high=Math.min(ceiling,high);
    return {low:low,high:high};
  }
  var volume=bounds(a.volume,b.volume,0.2,0,null),response=bounds(a.value,b.value,a.axis==='E'?0.02:0.4,a.axis==='pH'?Math.min(0,a.value,b.value):null,a.axis==='pH'?Math.max(14,a.value,b.value):null);
  if(!isFinite(volume.low)||!isFinite(volume.high)||!isFinite(response.low)||!isFinite(response.high)||volume.high<=volume.low||response.high<=response.low)return null;
  function point(r){return {x:58+297*(r.volume-volume.low)/(volume.high-volume.low),y:187-155*(r.value-response.low)/(response.high-response.low)};}
  var rate=difference.volume===0?null:difference.response/difference.volume;
  return {a:point(a),b:point(b),volume:volume,response:response,rate:rate===null||!isFinite(rate)?null:Number(rate.toPrecision(4)),axis:a.axis};
}
function TitrationComparisonPlot(props) {
  var h=props.React.createElement,t=props.t,a=props.a,b=props.b,f=titrationComparisonFrame(a,b);if(!f)return null;
  var coincident=Math.abs(f.a.x-f.b.x)<1&&Math.abs(f.a.y-f.b.y)<1;
  var axis=f.axis==='E'?t('stem.titration.comparison_potential','Potential (V)'):'pH';
  var fmtY=function(n){return n.toFixed(f.axis==='E'?3:2);},fmtX=function(n){return String(Number(n.toFixed(2)));};
  var desc=t('stem.titration.bench_reading_a','Reading A')+' #'+a.id+': '+a.volume.toFixed(1)+' mL, '+props.response(a)+'. '+t('stem.titration.bench_reading_b','Reading B')+' #'+b.id+': '+b.volume.toFixed(1)+' mL, '+props.response(b)+'.';
  return h('section',{className:'titr-comparison-plot','data-titration-comparison-plot':true,'aria-label':t('stem.titration.comparison_plot','Reading comparison diagram')},
    h('svg',{viewBox:'0 0 380 252',role:'img','aria-label':desc,style:{display:'block',width:'100%',height:'auto'}},
      h('rect',{x:58,y:32,width:297,height:155,rx:6,fill:'#071422'}),
      h('text',{x:58,y:18,fontSize:12,fill:'#e2edf8'},axis),
      [0,0.5,1].map(function(k){var y=187-155*k,v=f.response.low+(f.response.high-f.response.low)*k,x=58+297*k,vol=f.volume.low+(f.volume.high-f.volume.low)*k;return h('g',{key:k},
        h('line',{x1:58,x2:355,y1:y,y2:y,stroke:'#526d82',strokeWidth:0.8}),
        h('text',{x:50,y:y+4,textAnchor:'end',fontSize:11,fill:'#cbd5e1'},fmtY(v)),
        h('line',{x1:x,x2:x,y1:187,y2:191,stroke:'#cbd5e1'}),
        h('text',{x:x,y:209,textAnchor:'middle',fontSize:11,fill:'#cbd5e1'},fmtX(vol)));}),
      h('path',{'data-comparison-guides':true,d:'M'+f.a.x+' '+f.a.y+' H'+f.b.x+' V'+f.b.y,fill:'none',stroke:'#a6bacb',strokeWidth:1.5,strokeDasharray:'5 4'}),
      h('circle',{'data-comparison-point':'a',cx:f.a.x,cy:f.a.y,r:7,fill:'#071422',stroke:'#67e8f9',strokeWidth:3}),
      h('path',{'data-comparison-point':'b',d:'M'+f.b.x+' '+(f.b.y-(coincident?4:7))+' l'+(coincident?4:7)+' '+(coincident?4:7)+' l-'+(coincident?4:7)+' '+(coincident?4:7)+' l-'+(coincident?4:7)+' -'+(coincident?4:7)+' Z',fill:'#fbbf24',stroke:'#071422',strokeWidth:1.5}),
      h('text',{x:Math.min(340,f.a.x+12),y:f.a.y<44?f.a.y+23:f.a.y-11,fontSize:13,fontWeight:800,fill:'#a5f3fc'},'A'),
      h('text',{x:Math.min(340,f.b.x+12),y:coincident&&f.a.y<44?f.b.y+42:f.b.y+20>180?f.b.y-27:f.b.y+20,fontSize:13,fontWeight:800,fill:'#fde68a'},'B'),
      h('text',{x:206,y:236,textAnchor:'middle',fontSize:12,fill:'#cbd5e1'},t('stem.titration.bench_volume_axis','Titrant volume (mL)'))
    ),
    h('div',{className:'titr-comparison-legend'},h('p',null,h('span',{className:'titr-comparison-a'},'○ A'),' · #'+a.id),h('p',null,h('span',{className:'titr-comparison-b'},'◇ B'),' · #'+b.id)),
    h('p',null,t('stem.titration.comparison_scale_note','Axes zoom to the two saved readings. Dashed guides show the volume and response differences.')),
    h('div',{className:'titr-comparison-rate','data-comparison-rate':true},h('strong',null,t('stem.titration.comparison_average','Average response change per mL')),
      h('p',null,f.rate===null?t('stem.titration.comparison_same_volume','Choose different volumes to calculate an average change.'):(f.rate>0?'+':'')+f.rate+' '+(f.axis==='E'?'V/mL':'pH/mL')),
      f.rate!==null&&h('p',null,t('stem.titration.comparison_average_note','Calculated from the rounded readings saved in the notebook.')))
  );
}

// Quote every cell and keep student text literal when opened in a spreadsheet.
function titrationBenchCSV(raw) {
  function cell(value) {
    var text=String(value);
    if(typeof value==='string' && /^[\s]*[=+@-]/.test(text))text="'"+text;
    return '"'+text.replace(/"/g,'""')+'"';
  }
  var rows=[['Reading','Setup ID','Reagents','Titrant volume (mL)','pH','Potential (V)','Indicator','Simulation observation','Student note']];
  titrationBenchNotebook(raw).forEach(function(r){rows.push([r.id,r.preset,r.setup,r.volume,r.axis==='pH'?r.value:'',r.axis==='E'?r.value:'',r.indicator,r.observation,r.note]);});
  return '\uFEFF'+rows.map(function(row){return row.map(cell).join(',');}).join('\r\n')+'\r\n';
}
// Keep saved setups separate and preserve recording order, including repeated volumes.
function titrationNotebookSeries(raw,selectedId) {
  var records=titrationBenchNotebook(raw),groups=[];
  records.forEach(function(r){var key=JSON.stringify([r.preset,r.setup,r.axis]),group=groups.find(function(g){return g.key===key;});if(!group){group={key:key,setup:r.setup,axis:r.axis,records:[]};groups.push(group);}group.records.push(r);});
  var selected=records.find(function(r){return r.id===selectedId;})||records[records.length-1];
  return {groups:groups,selected:selected||null,group:selected?groups.find(function(g){return g.records.some(function(r){return r.id===selected.id;});}):null};
}
function titrationNotebookPlotFrame(raw) {
  var records=titrationBenchNotebook(raw);if(!records.length)return null;
  var first=records[0];if(records.some(function(r){return r.preset!==first.preset||r.setup!==first.setup||r.axis!==first.axis;}))return null;
  function range(values,minimum,floor){var low=Math.min.apply(null,values),high=Math.max.apply(null,values),pad=Math.max(minimum/2,(high-low)*0.12);low=floor===null?low-pad:Math.max(floor,low-pad);high+=pad;return isFinite(low)&&isFinite(high)&&isFinite(high-low)&&high>low?{low:low,high:high}:null;}
  var volume=range(records.map(function(r){return r.volume;}),0.2,0),response=range(records.map(function(r){return r.value;}),first.axis==='E'?0.02:0.4,null);if(!volume||!response)return null;
  var points=records.map(function(r){return {id:r.id,x:74+376*(r.volume-volume.low)/(volume.high-volume.low),y:218-176*(r.value-response.low)/(response.high-response.low)};});
  return {points:points,volume:volume,response:response,axis:first.axis};
}
function titrationNotebookNearest(frame,x,y) {
  if(!frame||!isFinite(x)||!isFinite(y)||x<74||x>450||y<42||y>218)return null;
  var best=null,distance=Infinity;
  frame.points.forEach(function(p){var d=(p.x-x)*(p.x-x)+(p.y-y)*(p.y-y);if(d<=distance){distance=d;best=p.id;}});return best;
}
function TitrationNotebookPlot(props) {
  var React=props.React,h=React.createElement,t=props.t,id=props.id;
  var choice=React.useState(function(){var saved=titrationBenchNotebook(props.records);return saved.length?saved[saved.length-1].id:null;}),chosen=choice[0],setChosen=choice[1],selectRef=React.useRef(null);
  React.useEffect(function(){if(selectRef.current)selectRef.current.focus();},[]);
  var series=titrationNotebookSeries(props.records,chosen),r=series.selected,group=series.group;if(!r)return null;
  var frame=titrationNotebookPlotFrame(group.records),index=group.records.findIndex(function(entry){return entry.id===r.id;}),point=frame&&frame.points.find(function(p){return p.id===r.id;});
  var axis=r.axis==='E'?t('stem.titration.comparison_potential','Potential (V)'):'pH';
  var describe=function(entry){return '#'+entry.id+' · '+entry.volume.toFixed(1)+' mL · '+props.response(entry);};
  var selectedText=t('stem.titration.notebook_plot_selected','Selected saved reading')+' '+describe(r);
  return h('section',{id:id,className:'titr-notebook-plot','data-titration-notebook-plot':true,'aria-labelledby':id+'-title',onKeyDown:function(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();props.onClose();}}},
    h('div',{className:'titr-notebook-plot-header'},h('div',null,h('h5',{id:id+'-title'},t('stem.titration.notebook_plot_title','Saved-reading plot')),h('p',null,t('stem.titration.notebook_plot_intro','Explore the observations you saved, one titration setup at a time.'))),h('button',{type:'button',className:'titr-immersive-button',onClick:props.onClose},t('stem.titration.notebook_plot_close','Close plot'))),
    h('div',{className:'titr-notebook-plot-layout'},
      h('div',{className:'titr-notebook-plot-chart'},
        h('label',{htmlFor:id+'-setup'},t('stem.titration.notebook_plot_setup','Plot setup')),
        h('select',{id:id+'-setup',value:group.key,onChange:function(e){var next=series.groups.find(function(g){return g.key===e.target.value;});if(next)setChosen(next.records[next.records.length-1].id);}},series.groups.map(function(g){return h('option',{key:g.key,value:g.key},g.setup+' · '+(g.axis==='E'?t('stem.titration.comparison_potential','Potential (V)'):'pH')+' · '+g.records.length+' '+t('stem.titration.notebook_plot_count','saved readings'));})),
        h('p',{className:'titr-notebook-plot-setup'},group.setup+' · '+axis+' · '+group.records.length+' '+t('stem.titration.notebook_plot_count','saved readings')),
        frame?h('svg',{viewBox:'0 0 480 292',role:'img','aria-label':selectedText+'. '+t('stem.titration.notebook_plot_points','Points show saved readings; no curve is fitted.'),'aria-describedby':id+'-help',onClick:function(e){var box=e.currentTarget.getBoundingClientRect(),next=titrationNotebookNearest(frame,(e.clientX-box.left)*480/box.width,(e.clientY-box.top)*292/box.height);if(next!==null)setChosen(next);}},
          h('rect',{x:74,y:42,width:376,height:176,rx:8,fill:'#071422'}),
          h('text',{x:74,y:24,fill:'#e2edf8',fontSize:14},axis),
          [0,0.5,1].map(function(k){var y=218-176*k,x=74+376*k,v=frame.response.low+(frame.response.high-frame.response.low)*k,vol=frame.volume.low+(frame.volume.high-frame.volume.low)*k;return h('g',{key:k},h('line',{x1:74,x2:450,y1:y,y2:y,stroke:'#536e83',strokeWidth:1}),h('text',{x:64,y:y+5,textAnchor:'end',fontSize:13,fill:'#cbd5e1'},v.toFixed(r.axis==='E'?3:2)),h('line',{x1:x,x2:x,y1:218,y2:223,stroke:'#cbd5e1'}),h('text',{x:x,y:246,textAnchor:k===1?'end':k===0?'start':'middle',fontSize:13,fill:'#cbd5e1'},String(Number(vol.toFixed(2)))));}),
          h('path',{d:'M74 '+point.y+' H'+point.x+' V218',fill:'none',stroke:'#fbbf24',strokeWidth:1.5,strokeDasharray:'5 4'}),
          frame.points.map(function(p){return h('circle',{key:p.id,'data-notebook-point':p.id,cx:p.x,cy:p.y,r:5,fill:'#67e8f9',stroke:'#071422',strokeWidth:2});}),
          h('circle',{'data-notebook-point-selected':r.id,cx:point.x,cy:point.y,r:9,fill:'#071422',stroke:'#fbbf24',strokeWidth:2.5}),
          h('circle',{cx:point.x,cy:point.y,r:3,fill:'#fbbf24'}),
          h('text',{x:262,y:278,textAnchor:'middle',fontSize:14,fill:'#cbd5e1'},t('stem.titration.bench_volume_axis','Titrant volume (mL)'))
        ):h('p',null,t('stem.titration.notebook_plot_unavailable','These saved values cannot be plotted. Use the reading list to inspect them.')),
        h('p',{id:id+'-help'},t('stem.titration.notebook_plot_help','Select a point or use the reading list. Overlapping points remain individually selectable in the list.')),
        h('p',{className:'titr-notebook-plot-key'},h('span',{'aria-hidden':true},'● '),t('stem.titration.notebook_plot_points','Points show saved readings; no curve is fitted.'))
      ),
      h('div',{className:'titr-notebook-plot-detail'},
        h('label',{htmlFor:id+'-reading'},t('stem.titration.notebook_plot_reading','Plot reading')),
        h('select',{ref:selectRef,id:id+'-reading',value:String(r.id),onChange:function(e){setChosen(Number(e.target.value));}},group.records.map(function(entry){return h('option',{key:entry.id,value:String(entry.id)},describe(entry));})),
        h('div',{className:'titr-immersive-switches'},h('button',{type:'button',className:'titr-immersive-button',disabled:index===0,onClick:function(){setChosen(group.records[index-1].id);}},t('stem.titration.notebook_plot_previous','Previous reading')),h('button',{type:'button',className:'titr-immersive-button',disabled:index===group.records.length-1,onClick:function(){setChosen(group.records[index+1].id);}},t('stem.titration.notebook_plot_next','Next reading'))),
        h('div',{className:'titr-notebook-plot-value',role:'status','aria-atomic':true},h('strong',null,t('stem.titration.notebook_plot_selected','Selected saved reading')+' #'+r.id),h('p',null,r.volume.toFixed(1)+' mL'),h('p',null,props.response(r))),
        h('p',null,r.indicator),h('p',null,r.observation),
        r.note&&h('div',{className:'titr-notebook-plot-note'},h('strong',null,t('stem.titration.bench_student_note','Your observation')),h('p',null,r.note)),
        h('div',{className:'titr-immersive-switches'},['a','b'].map(function(which){return h('button',{key:which,type:'button',className:'titr-immersive-button','aria-pressed':String(r.id)===(which==='a'?props.aId:props.bId),onClick:function(){props.onMark(which,r.id);}},which==='a'?t('stem.titration.bench_use_a','Use as A'):t('stem.titration.bench_use_b','Use as B'));})),
        h('p',null,t('stem.titration.notebook_plot_note','Selection changes only what you inspect. Experiment readings and saved notes stay unchanged.'))
      )
    )
  );
}

function TitrationBenchTools(props) {
  var React=props.React,h=React.createElement,t=props.t,id=React.useId();
  var doseState=React.useState('1'),dose=doseState[0],setDose=doseState[1];
  var plotState=React.useState(false),plotOpen=plotState[0],setPlotOpen=plotState[1],plotToggle=React.useRef(null);
  React.useEffect(function(){if(!props.records||!props.records.length)setPlotOpen(false);},[props.records]);
  function closePlot(){setPlotOpen(false);if(plotToggle.current)plotToggle.current.focus();}
  var selections=React.useState({a:null,b:null}),selected=selections[0],setSelected=selections[1];
  var feedbackState=React.useState(''),feedback=feedbackState[0],setFeedback=feedbackState[1];
  var records=titrationBenchNotebook(props.records),amount=titrationBenchDose(dose,props.remaining);
  var aId=selected.a !== null ? selected.a : (records[0]?String(records[0].id):'');
  var bId=selected.b !== null ? selected.b : (records.length>1?String(records[records.length-1].id):'');
  var a=records.find(function(r){return String(r.id)===aId;}),b=records.find(function(r){return String(r.id)===bId;});
  var comparison=titrationBenchCompare(a,b);
  function response(r){return (r.axis==='E'?'E ':'pH ')+r.value.toFixed(r.axis==='E'?3:2)+(r.axis==='E'?' V':'');}
  function signed(n,digits){return (n>0?'+':'')+n.toFixed(digits);}
  function record(){
    if(records.length>=40)return;
    var nextId=1;while(records.some(function(r){return r.id===nextId;}))nextId+=1;
    props.onRecords(records.concat([Object.assign({},props.current,{id:nextId})]));
    setFeedback(t('stem.titration.bench_reading_saved','Reading saved to the notebook.')+' #'+nextId);
  }
  function mark(which,recordId){
    setSelected(function(previous){var next=Object.assign({},previous);next[which]=String(recordId);return next;});
  }
  function selection(which,label){return h('div',null,
    h('label',{htmlFor:id+'-'+which},label),
    h('select',{id:id+'-'+which,value:which==='a'?(a?String(a.id):''):(b?String(b.id):''),onChange:function(e){var next=Object.assign({},selected);next[which]=e.target.value;setSelected(next);}},
      h('option',{value:''},t('stem.titration.bench_choose_reading','Choose a reading')),
      records.map(function(r){return h('option',{key:r.id,value:String(r.id)},'#'+r.id+' · '+r.volume.toFixed(1)+' mL · '+response(r)+' · '+r.setup);})
    )
  );}
  var css='.titr-comparison-plot{margin-top:14px;border-top:1px solid #52657a;padding-top:12px}.titr-comparison-legend{display:flex;gap:20px;flex-wrap:wrap}.titr-comparison-a{color:#a5f3fc;font-weight:800}.titr-comparison-b{color:#fde68a;font-weight:800}.titr-comparison-rate{margin-top:12px;padding:10px;border:1px solid #52657a;border-radius:8px;background:#071422}.titr-comparison-rate strong{font-size:12px;color:#e2edf8}.titr-comparison-rate p:first-of-type{font-size:18px;font-weight:800;color:#ecfeff}.titr-bench-tools{padding:16px;border-top:1px solid #52657a;background:#0b1d2d}.titr-bench-tools h4{font-size:16px;font-weight:800;color:#e2edf8;margin:0 0 12px}.titr-bench-tool-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.titr-bench-tool-card{border:1px solid #52657a;border-radius:13px;padding:14px;min-width:0;background:#102538}.titr-bench-tool-card h5{font-size:14px;font-weight:800;margin:0 0 10px;color:#a5f3fc}.titr-bench-tools label{display:block;font-size:12px;font-weight:700;color:#e2edf8;margin:8px 0 5px}.titr-bench-tools textarea{resize:vertical;min-height:78px;line-height:1.5}.titr-bench-tools input,.titr-bench-tools select,.titr-bench-tools textarea{box-sizing:border-box;max-width:100%;width:100%;min-height:44px;border:1px solid #8193a7;border-radius:8px;background:#071422;color:#ecf5fc;padding:8px;font-size:13px}.titr-bench-tools :is(input,select,textarea):focus-visible{outline:3px solid #facc15;outline-offset:2px}.titr-bench-tools .titr-immersive-switches{margin-top:12px}.titr-bench-tools p{margin:8px 0 0}.titr-bench-tools .titr-tool-error{color:#fecaca}.titr-notebook{margin-top:12px}.titr-notebook ol{list-style:none;padding:0;margin:12px 0 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;max-height:520px;overflow:auto}.titr-notebook li{border:1px solid #52657a;border-radius:10px;padding:12px;min-width:0;background:#071422;overflow-wrap:anywhere}.titr-notebook li[data-selected=true]{border-color:#67e8f9;box-shadow:inset 3px 0 #67e8f9}.titr-bench-tools a.titr-immersive-button{display:inline-flex;align-items:center;box-sizing:border-box;text-decoration:none}.titr-notebook .titr-note-count{font-variant-numeric:tabular-nums;text-align:right}.titr-notebook li strong{color:#a5f3fc;font-size:13px}.titr-notebook-readout{font-size:16px!important;font-weight:800;color:#ecfeff!important}.titr-comparison-result{margin-top:12px;padding:10px;border-left:3px solid #67e8f9;background:#071422;border-radius:6px}.titr-comparison-result strong{color:#ecfeff}@media(max-width:600px){.titr-comparison-plot svg text{font-size:16px}.titr-bench-tool-grid{grid-template-columns:minmax(0,1fr)}.titr-notebook ol{grid-template-columns:minmax(0,1fr)}}';
  css+='.titr-bench-tools{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-areas:"heading heading" "dispenser comparison" "notebook comparison";gap:12px;align-items:start}.titr-bench-tools>h4{grid-area:heading;margin:0}.titr-bench-tool-grid{display:contents}.titr-bench-dispenser{grid-area:dispenser}.titr-bench-comparison{grid-area:comparison}.titr-bench-tools>.titr-notebook{grid-area:notebook;margin-top:0}.titr-comparison-setup{overflow-wrap:anywhere}.titr-comparison-plot svg{max-height:330px}@media(max-width:760px){.titr-bench-tools{grid-template-columns:minmax(0,1fr);grid-template-areas:"heading" "dispenser" "comparison" "notebook"}}';
  css+=".titr-bench-tools.has-plot{grid-template-areas:\"heading heading\" \"plot plot\" \"dispenser comparison\" \"notebook comparison\"}.titr-notebook-plot{grid-area:plot;min-width:0;padding:16px;border:1px solid #8193a7;border-radius:14px;background:#102a3d}.titr-notebook-plot-header{display:flex;justify-content:space-between;align-items:start;gap:12px;flex-wrap:wrap}.titr-notebook-plot-header h5{font-size:16px;font-weight:800;margin:0;color:#fde68a}.titr-notebook-plot-layout{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:20px;margin-top:12px}.titr-notebook-plot-chart,.titr-notebook-plot-detail{min-width:0}.titr-notebook-plot svg{display:block;width:100%;height:auto;margin:12px 0;cursor:crosshair}.titr-notebook-plot-value{border-left:3px solid #fbbf24;border-radius:8px;background:#071422;padding:12px;margin-top:14px}.titr-notebook-plot-value strong{color:#fde68a;font-size:12px}.titr-notebook-plot-value p{font-size:22px;font-weight:800;color:#ecfeff;margin:4px 0 0;font-variant-numeric:tabular-nums}.titr-notebook-plot-key{color:#a5f3fc!important}.titr-notebook-plot-note{border-top:1px solid #52657a;margin-top:12px;padding-top:12px}.titr-notebook-plot-note strong{color:#e2edf8;font-size:12px}.titr-notebook-plot-note p{white-space:pre-wrap;overflow-wrap:anywhere}.titr-notebook-plot-detail>p{overflow-wrap:anywhere}.titr-notebook-plot-setup{display:none}@media(max-width:760px){.titr-bench-tools.has-plot{grid-template-columns:minmax(0,1fr);grid-template-areas:\"heading\" \"plot\" \"dispenser\" \"comparison\" \"notebook\"}.titr-notebook-plot-layout{grid-template-columns:minmax(0,1fr);gap:16px}.titr-notebook-plot-setup{display:block;overflow-wrap:anywhere}.titr-notebook-plot{padding:12px}.titr-notebook-plot svg text{font-size:18px}}@media(max-width:480px){.titr-notebook-plot svg text{font-size:24px}}";
  return h('section',{className:'titr-bench-tools'+(plotOpen&&records.length?' has-plot':''),'data-titration-bench-tools':true,'aria-label':t('stem.titration.bench_tools','Bench tools')},
    h('style',null,css),h('h4',null,t('stem.titration.bench_tools','Bench tools')),
    plotOpen&&records.length>0&&h(TitrationNotebookPlot,{React:React,t:t,id:id+'-plot',records:records,response:response,aId:aId,bId:bId,onMark:mark,onClose:closePlot}),
    h('div',{className:'titr-bench-tool-grid'},
      h('section',{className:'titr-bench-tool-card titr-bench-dispenser','aria-label':t('stem.titration.bench_dispenser','Custom-volume dispenser')},
        h('h5',null,t('stem.titration.bench_dispenser','Custom-volume dispenser')),
        h('label',{htmlFor:id+'-dose'},t('stem.titration.bench_dose_label','Addition volume (mL)')),
        h('input',{id:id+'-dose',type:'number',min:0.1,max:Math.max(0.1,props.remaining),step:0.1,value:dose,'aria-invalid':dose!==''&&amount===null,'aria-describedby':id+'-dose-help',onChange:function(e){setDose(e.target.value);}}),
        h('p',{id:id+'-dose-help'},t('stem.titration.bench_dose_help','Use 0.1 mL increments. Remaining simulation range:')+' '+props.remaining.toFixed(1)+' mL'),
        amount===null && h('p',{className:'titr-tool-error'},t('stem.titration.bench_dose_invalid','Enter a positive volume within the remaining range, in 0.1 mL steps.')),
        h('div',{className:'titr-immersive-switches'},h('button',{type:'button',className:'titr-immersive-button',disabled:amount===null,onClick:function(){if(amount!==null)props.onAdd(amount);}},t('stem.titration.bench_add_custom','Add custom volume')))
      ),
      h('section',{className:'titr-bench-tool-card titr-bench-comparison','aria-label':t('stem.titration.bench_compare','Compare readings')},
        h('h5',null,t('stem.titration.bench_compare','Compare readings')),
        selection('a',t('stem.titration.bench_reading_a','Reading A')),selection('b',t('stem.titration.bench_reading_b','Reading B')),
        comparison&&h('p',{className:'titr-comparison-setup'},a.setup),
        comparison?h('div',{className:'titr-comparison-result','data-titration-comparison':true,role:'status'},
          h('p',null,t('stem.titration.bench_difference','Difference (B − A)')+' · #'+b.id+' − #'+a.id),
          h('p',null,h('strong',null,'Δ mL: '+signed(comparison.volume,1))),
          h('p',null,h('strong',null,(comparison.axis==='E'?'Δ E: ':'Δ pH: ')+signed(comparison.response,comparison.axis==='E'?3:2)+(comparison.axis==='E'?' V':'')))
        ):h('p',null,t('stem.titration.bench_compare_help','Save and choose two different readings from the same titration setup and signal type.')),
        comparison&&h('div',{className:'titr-immersive-switches'},h('button',{type:'button',className:'titr-immersive-button',onClick:function(){setSelected({a:String(b.id),b:String(a.id)});}},t('stem.titration.comparison_swap','Swap A and B'))),
        comparison&&h(TitrationComparisonPlot,{React:React,t:t,a:a,b:b,response:response})
      )
    ),
    h('section',{className:'titr-bench-tool-card titr-notebook','aria-label':t('stem.titration.bench_notebook','Reading notebook')},
      h('h5',null,t('stem.titration.bench_notebook','Reading notebook')+' · '+records.length+'/40'),
      h('p',{className:'titr-notebook-readout'},t('stem.titration.bench_record_preview','Current reading:')+' '+props.current.volume.toFixed(1)+' mL · '+response(props.current)),
      h('p',null,props.current.setup),
      h('p',null,t('stem.titration.bench_notebook_help','Save displayed simulation readings to compare later. Readings stay in the notebook when you change setups; up to 40 can be kept.')),
      h('div',{className:'titr-immersive-switches'},
        h('button',{type:'button',className:'titr-immersive-button',disabled:records.length>=40,onClick:record},t('stem.titration.bench_save_reading','Save reading')),
        h('button',{ref:plotToggle,type:'button',className:'titr-immersive-button',disabled:records.length===0,'aria-expanded':plotOpen&&records.length>0,'aria-controls':plotOpen&&records.length>0?id+'-plot':undefined,onClick:function(){if(plotOpen)closePlot();else setPlotOpen(true);}},t('stem.titration.notebook_plot_toggle','Plot readings')),
        records.length>0 && h('a',{className:'titr-immersive-button',href:'data:text/csv;charset=utf-8,'+encodeURIComponent(titrationBenchCSV(records)),download:'alloflow-titration-notebook.csv'},t('stem.titration.bench_download_csv','Download CSV')),
        h('button',{type:'button',className:'titr-immersive-button',disabled:records.length===0,onClick:function(){props.onRecords([]);setSelected({a:null,b:null});setFeedback(t('stem.titration.bench_notebook_cleared','Notebook cleared.'));}},t('stem.titration.bench_clear_notebook','Clear notebook'))
      ),
      h('p',{id:id+'-note-help'},t('stem.titration.bench_notes_help','Add your observations below each saved reading. Notes save as you type and are included in the CSV download.')),
      h('p',{role:'status'},feedback),
      records.length>0 && h('ol',null,records.map(function(r){return h('li',{key:r.id,'data-reading-id':r.id,'data-selected':String(r.id)===aId||String(r.id)===bId},
        h('strong',null,'#'+r.id+' · '+r.setup),
        h('p',{className:'titr-notebook-readout'},r.volume.toFixed(1)+' mL · '+response(r)),
        h('p',null,r.indicator),h('p',null,r.observation),
        h('div',{className:'titr-immersive-switches'},['a','b'].map(function(which){var chosen=String(r.id)===(which==='a'?aId:bId);return h('button',{key:which,type:'button',className:'titr-immersive-button','aria-pressed':chosen,'aria-label':(which==='a'?t('stem.titration.bench_use_a','Use as A'):t('stem.titration.bench_use_b','Use as B'))+' · #'+r.id,onClick:function(){mark(which,r.id);}},(chosen?'✓ ':'')+(which==='a'?t('stem.titration.bench_use_a','Use as A'):t('stem.titration.bench_use_b','Use as B')));})),
        h('label',{htmlFor:id+'-note-'+r.id},t('stem.titration.bench_student_note','Your observation')+' · #'+r.id),
        h('textarea',{id:id+'-note-'+r.id,value:r.note,maxLength:500,rows:2,'aria-describedby':id+'-note-help',onChange:function(e){var note=e.target.value.slice(0,500);props.onRecords(records.map(function(entry){return entry.id===r.id?Object.assign({},entry,{note:note}):entry;}));}}),
        h('p',{className:'titr-note-count'},r.note.length+'/500')
      );}))
    )
  );
}

function buildTitrationDilutionScene(THREE,S,m) {
  var ratio=Math.max(0.000001,Math.min(1,m.fraction));
  function mesh(name,geometry,material,x,y,z){var o=new THREE.Mesh(geometry,material);o.name=name;o.position.set(x,y,z);S.model.add(o);return o;}
  var glass=new THREE.MeshPhongMaterial({color:0xbce7ff,transparent:true,opacity:0.17,side:THREE.DoubleSide,depthWrite:false,shininess:100});
  var edge=new THREE.MeshStandardMaterial({color:0xbce7ff,metalness:0.25,roughness:0.28});
  var liquid=new THREE.MeshPhongMaterial({color:0x22d3ee,transparent:true,opacity:0.22,depthWrite:false,shininess:90});
  var solute=new THREE.MeshStandardMaterial({color:0xfbbf24,emissive:0x513000,roughness:0.3,metalness:0.05});
  mesh('dilution-bench',new THREE.BoxGeometry(6.3,0.14,2.5),new THREE.MeshStandardMaterial({color:0x183149,roughness:0.65}),0,-0.08,0);
  [ratio,1].forEach(function(fraction,index){
    var x=index===0?-1.65:1.65,h=2*fraction,base=0.13,prefix=index===0?'stock':'final';
    mesh(prefix+'-vessel',new THREE.CylinderGeometry(0.82,0.82,2.35,48,1,true),glass,x,base+1.175,0);
    mesh(prefix+'-base',new THREE.CylinderGeometry(0.82,0.82,0.06,48),glass,x,base,0);
    var rim=mesh(prefix+'-rim',new THREE.TorusGeometry(0.82,0.028,8,64),edge,x,base+2.35,0);rim.rotation.x=Math.PI/2;
    mesh(prefix+'-liquid',new THREE.CylinderGeometry(0.79,0.79,h,48),liquid,x,base+h/2,0);
    var meniscus=mesh(prefix+'-surface',new THREE.TorusGeometry(0.78,0.018,8,64),edge,x,base+h,0);meniscus.rotation.x=Math.PI/2;
    for(var tick=1;tick<=4;tick++)mesh(prefix+'-tick-'+tick,new THREE.BoxGeometry(0.15,0.018,0.025),edge,x+0.38,base+tick*0.5,0.72);
    var radius=Math.min(0.068,h*0.09),particleGeometry=new THREE.SphereGeometry(radius,12,8);
    for(var i=0;i<18;i++){
      var angle=i*2.39996323,radial=0.22+0.34*((i*7)%11)/10;
      var packet=mesh(prefix+'-solute-'+i,particleGeometry,solute,x+Math.cos(angle)*radial,base+h*(0.12+0.76*(i+0.5)/18),Math.sin(angle)*radial);
      packet.visible=m.markers!==false;
    }
  });
  S.target=new THREE.Vector3(0,1.15,0);S.half=new THREE.Vector3(3.2,1.45,1.3);
  S.dilution={fraction:ratio,stockMl:m.stockMl,finalMl:m.finalMl,markers:m.markers!==false,solutePackets:18};
}
function TitrationDilutionView(props) {
  var React=props.React,h=React.createElement,t=props.t;
  var host=React.useRef(null),viewer=React.useRef(null),drag=React.useRef(null);
  var viewState=React.useState('3d'),view=viewState[0],setView=viewState[1];
  var statusState=React.useState('idle'),status=statusState[0],setStatus=statusState[1];
  var markerState=React.useState(true),markers=markerState[0],setMarkers=markerState[1];
  var cameraState=React.useState({rotY:15,rotX:16,zoom:1}),camera=cameraState[0],setCamera=cameraState[1];
  var fraction=props.stockMl/props.finalMl;
  React.useEffect(function(){
    if(view!=='3d')return;
    if(!window.StemLab||!window.StemLab.makeOrbitViewer){setStatus('failed');return;}
    var api=window.StemLab.makeOrbitViewer({attr:'data-titration-dilution-gl',clearColor:0x071422,fov:38,fitSlack:1.03,build:buildTitrationDilutionScene,
      lights:function(THREE,scene){scene.add(new THREE.HemisphereLight(0xe6f8ff,0x203349,1));var key=new THREE.DirectionalLight(0xffffff,0.9);key.position.set(2,5,4);scene.add(key);},
      debug:function(S){return S.dilution||{};}});
    viewer.current=api;api.onStatusChange(setStatus);api.attach(host.current);host.current.__dilutionViewer=api;
    return function(){api.onStatusChange(null);api.dispose();viewer.current=null;};
  },[view]);
  React.useEffect(function(){if(viewer.current)viewer.current.push(Object.assign({},camera,{fraction:fraction,stockMl:props.stockMl,finalMl:props.finalMl,markers:markers,static:true,sig:JSON.stringify([fraction,props.stockMl,props.finalMl,markers])}));},[fraction,props.stockMl,props.finalMl,markers,camera,status,view]);
  function rotate(y,x){setCamera(function(c){return {rotY:Math.max(-60,Math.min(60,c.rotY+y)),rotX:Math.max(0,Math.min(55,c.rotX+x)),zoom:c.zoom};});}
  function zoom(delta){setCamera(function(c){return Object.assign({},c,{zoom:Math.max(0.7,Math.min(1.5,c.zoom+delta))});});}
  function reset(){setCamera({rotY:15,rotX:16,zoom:1});}
  function button(label,onClick,pressed){return h('button',{type:'button',onClick:onClick,'aria-pressed':pressed},label);}
  var stockLabel=t('stem.titration.dilution_stock_aliquot','Stock aliquot'),finalLabel=t('stem.titration.dilution_final_solution','Final solution');
  var description=stockLabel+': '+props.stockMl.toFixed(2)+' mL, '+props.stockC.toFixed(2)+' M. '+finalLabel+': '+props.finalMl.toFixed(0)+' mL, '+props.finalC.toFixed(3)+' M.';
  var css='.titr-dilution-view{background:#0b1d2d;border:1px solid #60758a;border-radius:16px;overflow:hidden;color:#e2edf8}.titr-dilution-view h4{font-size:17px;font-weight:800;color:#e2edf8;margin:0}.titr-dilution-view p{font-size:12px;line-height:1.6;color:#d0e0ef;margin:6px 0 0}.titr-dilution-head,.titr-dilution-controls,.titr-dilution-caption{padding:14px 16px}.titr-dilution-controls{display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid #52657a}.titr-dilution-view button{min-height:44px;padding:8px 12px;border-radius:8px;border:1px solid #8297ac;background:#16334a;color:#edf7ff;font-size:12px;font-weight:700}.titr-dilution-view button[aria-pressed=true]{background:#a5f3fc;color:#083344}.titr-dilution-view :is(button,[tabindex]):focus-visible{outline:3px solid #facc15;outline-offset:-3px}.titr-dilution-stage{height:clamp(300px,40vw,440px);position:relative;touch-action:pan-y;cursor:grab}.titr-dilution-readings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:#52657a;border-top:1px solid #52657a}.titr-dilution-readings>div{padding:14px;background:#102538;min-width:0}.titr-dilution-readings strong{display:block;font-size:13px;color:#a5f3fc}.titr-dilution-readings b{display:block;font-size:20px;color:#ecfeff;font-variant-numeric:tabular-nums}.titr-dilution-constant{padding:14px 16px;background:#163b3f;border-top:1px solid #60758a;font-size:14px;color:#d1fae5}.titr-dilution-diagram{display:flex;align-items:flex-end;justify-content:space-around;gap:20px;padding:25px 12px;background:#071422}.titr-dilution-cell{display:flex;flex-direction:column;align-items:center;gap:7px}.titr-dilution-cell figcaption{font-size:12px;font-weight:700;color:#cbd5e1;font-variant-numeric:tabular-nums}.titr-dilution-vessel{position:relative;border:2px solid #bce7ff;border-top:0;border-radius:0 0 12px 12px;overflow:hidden}.titr-dilution-fill{position:absolute;bottom:0;width:100%;background:#146779;border-top:2px solid #bce7ff}.titr-dilution-dot{position:absolute;width:5px;height:5px;margin:-2.5px 0 0 -2.5px;background:#fbbf24;border-radius:50%}@media(max-width:480px){.titr-dilution-readings{grid-template-columns:minmax(0,1fr)}}';
  return h('section',{className:'titr-dilution-view','data-titration-dilution':true,'aria-label':t('stem.titration.dilution_visual_title','Dilution in 3D')},
    h('style',null,css),h('div',{className:'titr-dilution-head'},h('h4',null,t('stem.titration.dilution_visual_title','Dilution in 3D')),h('p',null,t('stem.titration.dilution_visual_intro','Compare the measured stock aliquot on the left with the final solution on the right. Adjust the calculator above to update the view.'))),
    h('div',{className:'titr-dilution-controls',role:'group','aria-label':t('stem.titration.dilution_view_options','Dilution view options')},button(t('stem.titration.dilution_3d','3D vessels'),function(){setView('3d');},view==='3d'),button(t('stem.titration.dilution_2d','2D comparison'),function(){setView('diagram');},view==='diagram'),button(t('stem.titration.dilution_markers','Solute markers'),function(){setMarkers(!markers);},markers)),
    view==='3d' && h('div',{ref:host,className:'titr-dilution-stage',role:'img',tabIndex:0,'aria-label':description,'aria-keyshortcuts':'ArrowLeft ArrowRight ArrowUp ArrowDown + - 0',style:status==='failed'?{display:'none'}:undefined,
      onKeyDown:function(e){var handled=true;if(e.key==='ArrowLeft')rotate(-10,0);else if(e.key==='ArrowRight')rotate(10,0);else if(e.key==='ArrowUp')rotate(0,8);else if(e.key==='ArrowDown')rotate(0,-8);else if(e.key==='+')zoom(0.1);else if(e.key==='-')zoom(-0.1);else if(e.key==='0')reset();else handled=false;if(handled)e.preventDefault();},
      onPointerDown:function(e){if(e.pointerType==='touch'||e.button!==0)return;drag.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);},onPointerMove:function(e){if(!drag.current)return;rotate((e.clientX-drag.current.x)*0.4,(e.clientY-drag.current.y)*0.25);drag.current={x:e.clientX,y:e.clientY};},onPointerUp:function(){drag.current=null;},onPointerCancel:function(){drag.current=null;},onLostPointerCapture:function(){drag.current=null;}}),
    (view==='diagram'||status!=='ready') && h('div',{className:'titr-dilution-diagram',role:'img','aria-label':description},[props.stockMl,props.finalMl].map(function(vol,index){
      // Linear dimension by the cube root of volume, so the drawn vessel scales the way
      // a real one does; floored so a 1000-fold dilution still leaves something to see.
      var big=Math.max(props.stockMl,props.finalMl,1e-9);
      var k=Math.max(0.3,Math.pow(Math.max(vol,0)/big,1/3));
      var dots=markers&&Array.from({length:18},function(_,i){
        return h('span',{key:i,className:'titr-dilution-dot',style:{left:(10+(i%6)*16)+'%',bottom:(12+Math.floor(i/6)*30)+'%'}});
      });
      return h('figure',{key:index,className:'titr-dilution-cell',style:{margin:0}},
        h('div',{className:'titr-dilution-vessel',style:{height:Math.round(190*k)+'px',width:Math.round(96*k)+'px'}},
          h('div',{className:'titr-dilution-fill',style:{height:'85%'}},dots)),
        h('figcaption',null,(vol>=10?vol.toFixed(0):vol.toFixed(2))+' mL'));
    })),
    view==='3d'&&status==='failed'&&h('p',{className:'titr-dilution-caption',role:'status'},t('stem.titration.dilution_fallback','3D is unavailable. The 2D comparison and calculator remain available.')),
    view==='3d'&&status==='ready'&&h('div',{className:'titr-dilution-controls',role:'group','aria-label':t('stem.titration.dilution_camera','Dilution camera controls')},button(t('stem.titration.bench_orbit_left','Rotate left'),function(){rotate(-15,0);}),button(t('stem.titration.bench_orbit_right','Rotate right'),function(){rotate(15,0);}),button(t('stem.titration.bench_zoom_in','Zoom in'),function(){zoom(0.1);}),button(t('stem.titration.bench_zoom_out','Zoom out'),function(){zoom(-0.1);}),button(t('stem.titration.bench_reset','Reset view'),reset)),
    h('div',{className:'titr-dilution-readings'},[[stockLabel,props.stockMl.toFixed(2),props.stockC.toFixed(2)],[finalLabel,props.finalMl.toFixed(0),props.finalC.toFixed(3)]].map(function(r){return h('div',{key:r[0]},h('strong',null,r[0]),h('b',null,r[1]+' mL'),h('p',null,r[2]+' M'));})),
    h('div',{className:'titr-dilution-constant'},h('strong',null,t('stem.titration.dilution_solute_constant','Same amount of solute in both views:')+' '+(props.finalC*props.finalMl/1000).toExponential(2)+' mol')),
    h('p',{className:'titr-dilution-caption'},t('stem.titration.dilution_visual_note','Gold markers represent equal portions of solute, not individual atoms. Their size changes to fit shallow liquid; compare their count. Vessel dimensions and colors are illustrative. Use the numerical readings and the preparation procedure below. Mouse drag or arrow keys rotate; +/− zoom; 0 resets. Touch swipes scroll the page.'))
  );
}

// Numerical scale geometry uses line segments, so it needs no font download or texture.
function titrationScaleNumber(THREE,textValue,size) {
  var segments=[[[0,1],[0.6,1]],[[0.6,1],[0.6,0.5]],[[0.6,0.5],[0.6,0]],[[0,0],[0.6,0]],[[0,0.5],[0,0]],[[0,1],[0,0.5]],[[0,0.5],[0.6,0.5]]];
  var digits=['012345','12','01643','01236','1256','02563','025643','012','0123456','012356'],points=[];
  String(textValue).split('').forEach(function(d,index){(digits[Number(d)]||'').split('').forEach(function(n){segments[Number(n)].forEach(function(p){points.push((p[0]+index*0.85)*size,(p[1]-0.5)*size,0);});});});
  var geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));return geometry;
}
function titrationReadingWindow(raw) {
  var reading=Math.max(0,Math.min(50,Number(raw)||0)),low=Math.max(0,Math.min(47,Math.floor(reading)-1));
  return {reading:reading,low:low,high:low+3};
}
// Match the lab's 50 mL refill convention: an exact multiple is an empty fill.
function titrationBurettePosition(raw) {
  if(typeof raw!=='number'||!isFinite(raw)||raw<0||raw>150)return null;
  var refills=Math.max(0,Math.ceil(raw/50)-1),reading=Number((raw-refills*50).toFixed(1));
  return {volume:Number((refills*50+reading).toFixed(1)),refills:refills,reading:reading};
}
function titrationVolumeDifference(start,current) {
  var a=titrationBurettePosition(start),b=titrationBurettePosition(current);if(!a||!b||b.volume<a.volume)return null;
  var refills=b.refills-a.refills,total=Number((b.volume-a.volume).toFixed(1));
  return {start:a,current:b,total:total,refills:refills,first:refills?Number((50-a.reading).toFixed(1)):total,full:Math.max(0,refills-1),last:refills?b.reading:0};
}
function TitrationVolumeMeasure(props) {
  var React=props.React,h=React.createElement,t=props.t,id=props.id,button=React.useRef(null),current=titrationBurettePosition(props.model.delivered),difference=titrationVolumeDifference(props.start,props.model.delivered),start=difference?difference.start:null;
  React.useEffect(function(){if(button.current)button.current.focus();},[]);
  var unit=function(value){return value.toFixed(1)+' mL';};
  var clear=t('stem.titration.measure_clear','Clear start'),notSet=t('stem.titration.measure_not_set','Not set');
  function scale(position,label,isCurrent){var level=position?32+position.reading/50*220:0,edge=props.model.redox?level:level-6,uid=id.replace(/[^a-zA-Z0-9]/g,'')+(isCurrent?'now':'start'),color=isCurrent?'#fbbf24':'#67e8f9';return h('figure',{className:'titr-measure-scale'+(isCurrent?' is-current':'')},
    h('figcaption',null,h('strong',null,label),h('span',null,position?unit(position.reading):notSet)),
    h('svg',{viewBox:'0 0 200 292',role:'img','aria-label':label+'. '+(position?unit(position.reading):notSet)},
      h('defs',null,h('linearGradient',{id:uid,x1:'0',x2:'1'},h('stop',{offset:'0%',stopColor:'#bce7ff',stopOpacity:0.35}),h('stop',{offset:'45%',stopColor:'#5e9bb5',stopOpacity:0.05}),h('stop',{offset:'100%',stopColor:'#bce7ff',stopOpacity:0.3}))),
      h('rect',{x:48,y:15,width:55,height:254,rx:10,fill:'url(#'+uid+')',stroke:'#bce7ff',strokeWidth:2}),
      position&&position.reading<50&&h('path',{'data-measure-liquid':isCurrent?'current':'start',d:'M52 '+edge+' Q75.5 '+(edge+12)+' 99 '+edge+' V262 H52 Z',fill:props.model.redox?'#a855f7':'#69cddd',fillOpacity:props.model.redox?0.8:0.4,stroke:'#e2f6ff',strokeWidth:1}),
      Array.from({length:51},function(_,i){var y=32+i/50*220;return h('g',{key:i},h('line',{x1:i%10===0?88:98,x2:112,y1:y,y2:y,stroke:'#dcecf6',strokeWidth:i%10===0?1.5:0.8}),i%10===0&&h('text',{x:124,y:y+6,fontSize:20,fill:'#e2edf8'},i));}),
      position&&h('g',null,h('line',{'data-measure-level':isCurrent?'current':'start',x1:30,x2:114,y1:level,y2:level,stroke:color,strokeWidth:2,strokeDasharray:'4 3'}),h('path',{d:'M25 '+(level-5)+' L33 '+level+' L25 '+(level+5)+' Z',fill:color})),
      h('text',{x:126,y:18,fontSize:17,fill:'#cbd5e1'},'mL'),
      h('path',{d:'M57 24 V259',stroke:'#e2f4ff',strokeOpacity:0.35,strokeWidth:2})
    )
  );}
  return h('section',{id:id,className:'titr-volume-measure','data-titration-volume-measure':true,'aria-labelledby':id+'-title',onKeyDown:function(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();props.onClose();}}},
    h('div',{className:'titr-measure-header'},h('div',null,h('h4',{id:id+'-title'},t('stem.titration.measure_title','Delivered-volume tracker')),h('p',null,t('stem.titration.measure_help','Set a start reading, then add titrant to measure the volume delivered since that mark.'))),h('button',{type:'button',className:'titr-immersive-button',onClick:props.onClose},t('stem.titration.measure_close','Close tracker'))),
    h('div',{className:'titr-measure-layout'},
      h('div',null,h('div',{className:'titr-measure-pair'},scale(start,t('stem.titration.measure_start','Start reading'),false),scale(current,t('stem.titration.measure_current','Current reading'),true)),h('p',{className:'titr-measure-caption'},t('stem.titration.measure_scale_note','Each scale shows one 50 mL fill. Read the numbered values; use the reading lens for the meniscus close-up.'))),
      h('div',{className:'titr-measure-detail'},
        h('div',{className:'titr-immersive-switches'},h('button',{ref:button,type:'button',className:'titr-immersive-button',onClick:props.onMark},t('stem.titration.measure_mark','Set start reading')),h('button',{type:'button',className:'titr-immersive-button',disabled:!start,onClick:props.onClear},clear)),
        h('div',{className:'titr-measure-result',role:'status','aria-atomic':true},h('strong',null,t('stem.titration.measure_delivered','Delivered since start')),h('p',{'data-measure-total':true},difference?unit(difference.total):'—'),h('p',{className:'titr-measure-result-note'},difference?t('stem.titration.measure_live','Updates as you add titrant.'):t('stem.titration.measure_empty','Choose Set start reading to begin.'))),
        difference&&h('div',{className:'titr-measure-calculation','data-measure-calculation':true},h('strong',null,t('stem.titration.measure_calculation','How the volume is counted')),
          difference.refills===0?h('p',null,unit(current.reading)+' − '+unit(start.reading)+' = '+unit(difference.total)):h(React.Fragment,null,
            h('p',null,t('stem.titration.measure_refills','Refills since start:')+' '+difference.refills),
            h('ol',null,h('li',null,t('stem.titration.measure_first','From the starting fill:')+' '+unit(difference.first)),difference.full>0&&h('li',null,t('stem.titration.measure_full','Complete intervening fills:')+' '+difference.full+' × 50.0 mL'),h('li',null,t('stem.titration.measure_last','From the current fill:')+' '+unit(difference.last))),
            h('p',null,t('stem.titration.measure_refill_note','A refill returns the burette scale to the top. Delivered volume continues to accumulate.')))),
        h('div',{className:'titr-measure-add'},h('strong',null,t('stem.titration.bench_add','Add titrant at the bench')),h('div',{className:'titr-immersive-switches'},[0.1,0.5,1].map(function(amount){return h('button',{key:amount,type:'button',className:'titr-immersive-button',disabled:!props.canAdd,onClick:function(){props.onAdd(amount);}},'+'+amount+' mL');}))),
        h('p',null,t('stem.titration.measure_mark_note','Setting or clearing a start mark does not add titrant or save a notebook reading. The mark is cleared if the setup changes or the volume moves below it.'))
      )
    )
  );
}

function TitrationReadingLens(props) {
  var h=props.React.createElement,t=props.t,m=props.model,w=titrationReadingWindow(m.reading),y=function(v){return 36+(v-w.low)/3*210;},level=y(w.reading),empty=w.reading===50;
  var edge=m.redox?level:level-10,control=edge+20,path='M72 '+edge+' Q112 '+control+' 152 '+edge+' V258 H72 Z';
  return h('section',{className:'titr-immersive-trace titr-reading-lens','data-titration-reading-lens':true,'aria-label':t('stem.titration.reading_lens','Reading lens')},
    h('h4',null,t('stem.titration.reading_lens','Reading lens')),h('p',{className:'titr-trace-value'},w.reading.toFixed(1)+' mL'),
    h('svg',{viewBox:'0 0 260 295',role:'img','aria-label':t('stem.titration.lens_scale','Magnified burette scale')+'. '+w.reading.toFixed(1)+' mL',style:{display:'block',width:'100%',height:'auto'}},
      h('rect',{x:52,y:12,width:176,height:257,rx:14,fill:'#071422',stroke:'#607d95'}),
      h('rect',{x:72,y:18,width:80,height:240,rx:4,fill:'#18384b',stroke:'#bce7ff',strokeWidth:2}),
      !empty && h('path',{d:path,fill:m.redox?'#a855f7':'#69cddd',fillOpacity:m.redox?0.8:0.45,stroke:'#e2f6ff',strokeWidth:1.5}),
      Array.from({length:31},function(_,i){var value=w.low+i/10,major=i%5===0;return h('g',{key:i},h('line',{x1:major?143:151,x2:166,y1:y(value),y2:y(value),stroke:'#e2edf8',strokeWidth:major?1.5:0.8}),major&&h('text',{x:176,y:y(value)+4,fill:'#e2edf8',fontSize:12},value.toFixed(1)));}),
      h('line',{'data-reading-guide':true,x1:59,x2:218,y1:level,y2:level,stroke:'#fbbf24',strokeWidth:2,strokeDasharray:'5 4'}),
      h('path',{d:'M54 '+(level-5)+' L63 '+level+' L54 '+(level+5)+' Z',fill:'#fbbf24'}),
      h('text',{x:130,y:287,textAnchor:'middle',fill:'#d0e0ef',fontSize:12},t('stem.titration.lens_units','Scale in mL'))
    ),
    h('p',null,empty?t('stem.titration.lens_empty','The burette is empty at 50.0 mL.'):m.redox?t('stem.titration.lens_dark','Dark titrant: the guide follows the upper visible edge.'):t('stem.titration.lens_clear','Clear titrant: the guide follows the bottom of the meniscus.')),
    h('p',null,t('stem.titration.lens_fill_note','This is the current burette fill reading. Total delivered volume also includes earlier fills.'))
  );
}
function TitrationApparatusDiagram(props) {
  var React=props.React,h=React.createElement,t=props.t,m=props.model,id=React.useId().replace(/[^a-zA-Z0-9]/g,''),reading=titrationReadingWindow(m.reading).reading;
  var profile=titrationBenchLiquidProfile(m.fill),surface=463-118*profile.height/1.65,radius=76*profile.radius/0.9,level=40+reading/50*216;
  var liquidD='M'+(300-radius)+' '+surface+' H'+(300+radius)+' L376 459 Q380 468 368 469 H232 Q220 468 224 459 Z';
  var focus=props.focus,full=focus==='apparatus',label=m.redox?t('stem.titration.flask_diagram_redox','Titration flask diagram showing the permanganate colour of the solution.'):t('stem.titration.flask_diagram','Titration flask diagram showing the current pH and indicator state.');
  function callout(n,text,x,y,targetX,targetY){return h('g',{key:n,className:'titr-diagram-callout'},h('path',{d:'M'+targetX+' '+targetY+' H'+(x-12)+' V'+y,fill:'none',stroke:'#7594aa',strokeWidth:1.5}),h('circle',{cx:x,cy:y,r:10,fill:'#16384d',stroke:'#91c3da'}),h('text',{x:x,y:y+4,textAnchor:'middle',fontSize:12,fill:'#ecf8ff'},n),h('text',{x:x+17,y:y+4,fontSize:13,fill:'#e2edf8'},text));}
  return h('div',{className:'titr-apparatus-diagram','data-titration-apparatus-diagram':true},
    h('svg',{viewBox:focus==='flask'?'195 285 215 210':focus==='burette'?'253 10 135 315':'120 0 445 500',role:'img','aria-label':label,'data-diagram-focus':focus,style:{width:'100%',height:'100%',display:'block'}},
      h('defs',null,
        h('clipPath',{id:id+'clip'},h('path',{d:liquidD})),
        h('linearGradient',{id:id+'glass',x1:'0',x2:'1'},h('stop',{offset:'0%',stopColor:'#bce7ff',stopOpacity:0.28}),h('stop',{offset:'36%',stopColor:'#9edcf3',stopOpacity:0.07}),h('stop',{offset:'100%',stopColor:'#bce7ff',stopOpacity:0.25})),
        h('linearGradient',{id:id+'liquid',x1:'0',x2:'0',y1:'0',y2:'1'},h('stop',{offset:'0%',stopColor:m.color,stopOpacity:0.85}),h('stop',{offset:'100%',stopColor:m.color,stopOpacity:0.4}))
      ),
      full&&h('g',{fill:'#224258',stroke:'#8ea9bb'},h('rect',{x:142,y:474,width:295,height:12,rx:4}),h('rect',{x:169,y:30,width:6,height:444,rx:3}),h('rect',{x:167,y:76,width:131,height:7,rx:2}),h('rect',{x:167,y:191,width:131,height:7,rx:2})),
      focus!=='flask'&&h('g',null,
        h('rect',{x:289,y:40,width:22,height:216,rx:5,fill:'url(#'+id+'glass)',stroke:'#bce7ff',strokeWidth:2}),
        reading<50&&h('rect',{'data-diagram-burette-liquid':true,x:292,y:level,width:16,height:256-level,fill:m.redox?'#a855f7':'#69cddd',fillOpacity:m.redox?0.85:0.5}),
        Array.from({length:51},function(_,i){var y=40+i/50*216;return h('g',{key:i},h('line',{x1:i%10===0?292:300,x2:317,y1:y,y2:y,stroke:'#e2edf8',strokeWidth:i%10===0?1.5:0.7}),i%10===0&&h('text',{x:324,y:y+4,fontSize:13,fill:'#e2edf8'},i));}),
        h('text',{x:324,y:26,fontSize:12,fill:'#a5f3fc'},'mL'),
        h('line',{'data-diagram-meniscus':true,x1:280,x2:350,y1:level,y2:level,stroke:'#fbbf24',strokeWidth:2,strokeDasharray:'4 3'}),
        h('rect',{x:284,y:263,width:32,height:13,rx:4,fill:'#d6e6ef',stroke:'#8caec4'}),h('rect',{x:296,y:251,width:8,height:36,rx:3,fill:'#28b7c9'})),
      h('path',{d:'M296 276 L298 313 L302 313 L304 276',fill:'url(#'+id+'glass)',stroke:'#bce7ff',strokeWidth:1.5}),
      focus!=='burette'&&h('g',null,
        h('ellipse',{cx:300,cy:478,rx:103,ry:10,fill:'#020c16',opacity:0.6}),
        h('path',{d:'M213 461 H387 L405 478 H197 Z',fill:'#dce8f0',stroke:'#9ab8cc'}),
        h('path',{d:'M277 307 H323 V336 L381 454 Q386 470 368 473 H232 Q214 470 219 454 L277 336 Z',fill:'url(#'+id+'glass)',stroke:'#bce7ff',strokeWidth:2}),
        profile.height>0&&h('path',{'data-diagram-flask-liquid':true,d:liquidD,fill:'url(#'+id+'liquid)',stroke:m.color,strokeWidth:0.8}),
        h('ellipse',{'data-diagram-flask-surface':true,cx:300,cy:surface,rx:radius,ry:5,fill:m.color,fillOpacity:0.4,stroke:'#d7f2ff',strokeWidth:1.2}),
        h('path',{d:'M282 318 V338 L230 454',fill:'none',stroke:'#e2f4ff',strokeOpacity:0.35,strokeWidth:3,strokeLinecap:'round'}),
        h('ellipse',{cx:300,cy:307,rx:23,ry:4,fill:'#0c2232',stroke:'#def5ff',strokeWidth:2}),
        h('rect',{x:286,y:460,width:28,height:5,rx:2,fill:'#97afbd',stroke:'#e2edf8',strokeWidth:0.8}),
        m.animating&&h(React.Fragment,{key:m.pulse},profile.height>0.0001&&[0,1,2].map(function(i){return h('ellipse',{key:i,'data-diagram-ripple':true,cx:300,cy:surface,rx:radius*0.92,ry:4.6,fill:'none',stroke:'#e2f6ff',strokeWidth:1,style:{opacity:0,transformBox:'fill-box',transformOrigin:'center',animation:'titrationDiagramRipple 650ms '+(650+i*140)+'ms linear forwards'}});}),h('circle',{'data-diagram-drop':true,cx:300,cy:314,r:2.5,fill:m.redox?'#a855f7':'#9bdfed',style:{'--titr-drop-distance':Math.max(0,surface-314)+'px',animation:'titrationDiagramDrop 650ms linear both'}}),h('g',{clipPath:'url(#'+id+'clip)'},h('ellipse',{'data-diagram-bloom':true,cx:300,cy:surface+7,rx:15,ry:8,fill:m.flashColor||m.color,style:{animation:'titrationDiagramBloom '+Math.round(340+760*(Number(m.flashHold)||0))+'ms 620ms ease-out both',transformBox:'fill-box',transformOrigin:'center',filter:'blur(2px)'}})))
      ),
      full&&[callout(1,t('stem.titration.burette','Burette'),390,112,315,99),callout(2,t('stem.titration.diagram_stopcock','Stopcock'),390,274,318,271),callout(3,t('stem.titration.diagram_flask','Flask'),416,404,367,409),callout(4,t('stem.titration.diagram_tile','White tile'),416,466,399,478)]
    )
  );
}

function titrationColorPreviewValue(raw,max,redox) {
  if((typeof raw!=='number'&&typeof raw!=='string')||(typeof raw==='string'&&!raw.trim()))return null;
  var value=Number(raw),limit=Number(max),step=redox?0.1:0.01;
  if(!isFinite(value)||!isFinite(limit)||limit<=0)return null;
  return Number((Math.round(Math.max(0,Math.min(limit,value))/step+1e-9)*step).toFixed(2));
}
function TitrationColorExplorer(props) {
  var h=props.React.createElement,t=props.t,c=props.reference,id=props.id;
  var unit=function(v){return c.redox?v.toFixed(1)+' mL':'pH '+v.toFixed(2);};
  var samples=c.redox?[0,c.equivalence,Math.min(c.max,c.equivalence+0.1)]:[c.low,(c.low+c.high)/2,c.high];
  var stops=Array.from({length:71},function(_,i){return c.max*i/70;}).concat(samples).sort(function(a,b){return a-b;}).map(function(v){return c.colorAt(v)+' '+(v/c.max*100)+'%';});
  function well(value,label,preview){return h('figure',{className:'titr-reference-well'+(preview?' is-reference':'')},
    h('figcaption',null,h('strong',null,h('span',{'aria-hidden':true,style:{display:'inline',fontSize:'inherit',color:'inherit'}},preview?'◇ ':'▲ '),label),h('span',null,unit(value))),
    h('svg',{viewBox:'0 0 128 128',role:'img','aria-label':label+'. '+unit(value)},
      h('ellipse',{cx:64,cy:113,rx:43,ry:5,fill:'#061421',opacity:0.8}),
      h('circle',{cx:64,cy:60,r:48,fill:'#e2ecf3',stroke:'#9eb5c5',strokeWidth:2}),
      h('circle',{cx:64,cy:60,r:43,fill:'#fff',stroke:'#b5c9d8',strokeWidth:1.5}),
      h('circle',{'data-explorer-sample':preview?'reference':'live',cx:64,cy:60,r:37,fill:c.colorAt(value),stroke:'#7996aa',strokeWidth:0.8}),
      h('path',{d:'M34 45 A34 34 0 0 1 66 25',fill:'none',stroke:'#fff',strokeWidth:3,strokeLinecap:'round',opacity:0.65})
    ));}
  return h('section',{id:id,className:'titr-color-explorer','data-titration-color-explorer':true,'aria-labelledby':id+'-title',onKeyDown:function(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();props.onClose();}}},
    h('div',{className:'titr-explorer-header'},h('div',null,h('h4',{id:id+'-title'},t('stem.titration.color_explorer_title','Reference color preview')),h('p',null,c.label)),h('button',{type:'button',className:'titr-immersive-button',onClick:props.onClose},t('stem.titration.color_explorer_close','Close preview'))),
    h('div',{className:'titr-explorer-layout'},
      h('div',null,
        h('p',{id:id+'-help'},t('stem.titration.color_explorer_help','Preview only: no titrant is added and no readings are saved.')),
        h('label',{htmlFor:id+'-slider'},c.redox?t('stem.titration.color_reference_volume','Reference volume (mL)'):t('stem.titration.color_reference_ph','Reference pH')),
        h('input',{ref:props.sliderRef,id:id+'-slider',type:'range',min:0,max:c.max,step:c.redox?0.1:0.01,value:props.value,'aria-valuetext':unit(props.value),'aria-describedby':id+'-help',style:{'--titr-reference-gradient':'linear-gradient(to right,'+stops.join(',')+')'},onChange:function(e){props.onChange(titrationColorPreviewValue(e.target.value,c.max,c.redox));}}),
        h('div',{className:'titr-reference-scale','aria-hidden':true},h('span',null,unit(0)),h('span',null,unit(c.max))),
        h('div',{className:'titr-immersive-switches',role:'group','aria-label':t('stem.titration.color_reference_values','Reference values')},samples.map(function(v,i){return h('button',{key:i,type:'button',className:'titr-immersive-button','aria-pressed':Math.abs(props.value-v)<0.0001,onClick:function(){props.onChange(titrationColorPreviewValue(v,c.max,c.redox));}},unit(v));})),
        h('p',{className:'titr-reference-caption'},t('stem.titration.color_explorer_note','Compare the samples on white. The live sample follows your experiment; the reference stays at the value you choose.'))
      ),
      h('div',{className:'titr-reference-pair'},well(c.value,t('stem.titration.color_live_sample','Live color'),false),well(props.value,t('stem.titration.color_reference_sample','Reference color'),true))
    )
  );
}

// The color guide samples the existing chemistry color function. It has no endpoint model.
function TitrationColorGuide(props) {
  var React=props.React,h=React.createElement,t=props.t,c=props.reference;
  var id='titr-color-'+React.useId().replace(/[^a-zA-Z0-9]/g,''),x=function(v){return 20+220*Math.max(0,Math.min(c.max,v))/c.max;};
  var samples=c.redox?[0,c.equivalence,Math.min(c.max,c.equivalence+0.1)]:[c.low,(c.low+c.high)/2,c.high];
  var anchors=Array.from({length:71},function(_,i){return c.max*i/70;}).concat(samples);
  anchors.sort(function(a,b){return a-b;});
  var unit=function(v){return c.redox?v.toFixed(1)+' mL':'pH '+Number(v.toFixed(2));};
  var range=c.redox?t('stem.titration.color_equivalence','Gold line: equivalence at')+' '+unit(c.equivalence):c.universal?t('stem.titration.color_full_scale','Broad pH color reference'):t('stem.titration.color_transition','Indicator transition:')+' pH '+c.low.toFixed(1)+'–'+c.high.toFixed(1);
  return h('section',{className:'titr-immersive-trace titr-color-guide','data-titration-color-guide':true,'aria-label':t('stem.titration.color_guide','Color guide')},
    h('h4',null,t('stem.titration.color_guide','Color guide')),
    h('p',{className:'titr-color-name'},c.label),
    h('p',{className:'titr-trace-value'},c.readout),
    h('div',{className:'titr-color-observation'},h('span',{className:'titr-color-well','aria-hidden':true},h('span',{'data-color-current':true,style:{background:c.colorAt(c.value)}})),h('p',null,c.observation)),
    h('svg',{viewBox:'0 0 260 145',role:'img','aria-label':c.label+'. '+range+'. '+c.readout+(props.preview!==null&&props.preview!==undefined?'. '+t('stem.titration.color_reference_sample','Reference color')+' '+unit(props.preview):''),style:{display:'block',width:'100%',height:'auto'}},
      h('defs',null,h('linearGradient',{id:id},anchors.map(function(v,i){return h('stop',{key:i,offset:(v/c.max*100)+'%',stopColor:c.colorAt(v)});}))),
      h('rect',{x:20,y:35,width:220,height:24,rx:5,fill:'#fff'}),
      h('rect',{x:20,y:35,width:220,height:24,rx:5,fill:'url(#'+id+')',stroke:'#cbd5e1',strokeWidth:1.5}),
      h('path',{'data-color-position':true,d:'M'+(x(c.value)-5)+' 22 L'+x(c.value)+' 30 L'+(x(c.value)+5)+' 22 Z',fill:'#67e8f9'}),
      props.preview!==null&&props.preview!==undefined&&h('path',{'data-color-reference-position':true,d:'M'+x(props.preview)+' 3 l5 5 -5 5 -5 -5 Z',fill:'#fff',stroke:'#fbbf24',strokeWidth:1.5}),
      c.redox?h('g',null,h('line',{x1:x(c.equivalence),x2:x(c.equivalence),y1:31,y2:78,stroke:'#173e54',strokeWidth:4,strokeDasharray:'3 3'}),h('line',{'data-color-equivalence':true,x1:x(c.equivalence),x2:x(c.equivalence),y1:31,y2:78,stroke:'#fbbf24',strokeWidth:2,strokeDasharray:'3 3'})):!c.universal&&h('g',{stroke:'#fbbf24',fill:'#fde68a'},
        h('path',{d:'M'+x(c.low)+' 66 V75 H'+x(c.high)+' V66',fill:'none',strokeWidth:1.5}),
        h('text',{x:x(c.low),y:89,fontSize:10,textAnchor:'end',stroke:'none'},c.low.toFixed(1)),h('text',{x:x(c.high),y:89,fontSize:10,textAnchor:'start',stroke:'none'},c.high.toFixed(1))),
      [0,c.max/2,c.max].map(function(v){return h('text',{key:v,x:x(v),y:112,fontSize:12,textAnchor:'middle',fill:'#e2edf8'},Number.isInteger(v)?v:v.toFixed(1));}),
      h('text',{x:130,y:136,fontSize:12,textAnchor:'middle',fill:'#cbd5e1'},c.redox?t('stem.titration.bench_volume_axis','Titrant volume (mL)'):'pH')
    ),
    h('p',{className:'titr-color-range'},range),
    h('div',{className:'titr-color-samples',role:'group','aria-label':t('stem.titration.color_samples','Reference colors')},samples.map(function(v,i){return h('button',{key:i,type:'button','aria-label':t('stem.titration.color_preview_swatch','Preview')+' '+unit(v),'aria-pressed':props.preview!==null&&props.preview!==undefined&&Math.abs(props.preview-v)<0.0001,onClick:function(){props.onPreview(v);}},h('span',{className:'titr-color-well','aria-hidden':true},h('span',{'data-color-sample':v,style:{background:c.colorAt(v)}})),h('p',null,unit(v)));})),
    h('p',null,c.redox?t('stem.titration.color_redox_note','Self-indicating permanganate. Compare the color with the potential curve and added volume.'):t('stem.titration.color_indicator_note','Compare the color with the pH curve. A color change alone does not locate the equivalence point.')),
    h('p',null,t('stem.titration.color_white_note','Simulated colors shown on white; glass and lighting can change their appearance.'))
  );
}

function TitrationBenchViews(props) {
  var h=props.React.createElement,t=props.t;
  function picture(part){return h('svg',{viewBox:'0 0 112 90','aria-hidden':true,focusable:'false'},
    h('ellipse',{cx:56,cy:79,rx:43,ry:6,fill:'#04121e'}),
    part==='apparatus'?h('g',null,
      h('path',{d:'M17 78 H92 M28 77 V12 M28 27 H61',fill:'none',stroke:'#8ea9bb',strokeWidth:4,strokeLinecap:'round'}),
      h('rect',{x:57,y:7,width:10,height:43,rx:3,fill:'#29556c',stroke:'#d0eafa',strokeWidth:1.5}),
      h('path',{d:'M58 21 H66 V48 H58 Z',fill:'#69cddd',opacity:0.65}),
      h('path',{d:'M62 50 V57 M56 51 H68',stroke:'#d0eafa',strokeWidth:2}),
      h('path',{d:'M55 58 H69 V65 L78 77 H46 L55 65 Z',fill:'#21475b',stroke:'#d0eafa',strokeWidth:1.5}),
      h('path',{d:'M53 70 H71 L75 75 H49 Z',fill:'#67e8f9',opacity:0.6})
    ):part==='flask'?h('g',null,
      h('path',{d:'M17 77 H95 L99 83 H13 Z',fill:'#e2ecf3'}),
      h('path',{d:'M43 12 H69 V32 L92 69 Q94 78 85 78 H27 Q18 78 20 69 L43 32 Z',fill:'#1b3f52',stroke:'#c5e8fa',strokeWidth:2}),
      h('path',{d:'M31 51 H81 L89 70 Q90 74 84 75 H28 Q22 74 23 70 Z',fill:'#f9a8d4',opacity:0.85}),
      h('ellipse',{cx:56,cy:51,rx:25,ry:4,fill:'#fbcfe8',stroke:'#e2f6ff',strokeWidth:1}),
      h('path',{d:'M47 18 V34 L28 66',stroke:'#e2f4ff',strokeWidth:3,opacity:0.5,fill:'none'})
    ):h('g',null,
      h('rect',{x:36,y:6,width:22,height:67,rx:5,fill:'#244c60',stroke:'#c5e8fa',strokeWidth:2}),
      h('path',{d:'M38 34 Q47 40 56 34 V70 H38 Z',fill:'#69cddd',opacity:0.55,stroke:'#e2f6ff',strokeWidth:1}),
      [14,22,30,38,46,54,62,70].map(function(y,i){return h('line',{key:y,x1:i%2?52:47,x2:65,y1:y,y2:y,stroke:'#d0eafa',strokeWidth:1.4});}),
      h('path',{d:'M23 37 H77',stroke:'#fbbf24',strokeDasharray:'4 3',strokeWidth:2}),
      h('path',{d:'M47 73 V83 M36 75 H58',stroke:'#d0eafa',strokeWidth:3})
    )
  );}
  var cards=[['apparatus',t('stem.titration.bench_full_apparatus','Full apparatus'),t('stem.titration.nav_apparatus_hint','Follow additions and the live curve.')],['flask',t('stem.titration.bench_flask_closeup','Flask close-up'),t('stem.titration.nav_flask_hint','Inspect the solution and compare colors.')],['burette',t('stem.titration.bench_burette_closeup','Burette close-up'),t('stem.titration.nav_burette_hint','Read the scale and track delivered volume.')]];
  return h('div',{className:'titr-bench-views',role:'group','aria-label':t('stem.titration.bench_inspect','Inspect the apparatus')},cards.map(function(card){var active=props.focus===card[0],hint=props.id+'-'+card[0];return h('button',{key:card[0],type:'button',className:'titr-bench-view','data-bench-view':card[0],'aria-label':card[1],'aria-describedby':hint,'aria-pressed':active,onClick:function(){props.onInspect(card[0]);}},picture(card[0]),h('span',{className:'titr-bench-view-copy'},h('strong',null,card[1]),h('span',{id:hint},card[2])),h('span',{className:'titr-bench-view-check','aria-hidden':true},active?'✓':''));}));
}

// Equipment technique illustrations are independent of the live experiment state.
// Integer tenths of a milligram avoid binary rounding drift in the weighing exercise.
function titrationWeighingState(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  var tare = raw.tareUnits === 23456 ? 23456 : 0;
  var sample = tare && Number.isSafeInteger(raw.sampleUnits) ? Math.max(0,Math.min(20000,raw.sampleUnits)) : 0;
  return {closed:raw.closed !== false,boat:raw.boat === true,tareUnits:tare,sampleUnits:sample,
    recordedUnits:tare && Number.isSafeInteger(raw.recordedUnits) && raw.recordedUnits > 0 && raw.recordedUnits <= 20000 ? raw.recordedUnits : null};
}
function titrationWeighingTransition(raw, action) {
  var s=titrationWeighingState(raw);action=action||{};
  switch(action.type) {
    case 'reset': return titrationWeighingState();
    case 'shield': s.closed=!s.closed;break;
    case 'boat': if(!s.closed)s.boat=!s.boat;break;
    case 'tare': if(s.closed && s.boat && s.sampleUnits===0)s.tareUnits=23456;break;
    case 'add': if(!s.closed && s.boat && s.tareUnits && [1000,100,10].indexOf(action.units)!==-1 && s.sampleUnits+action.units<=20000)s.sampleUnits+=action.units;break;
    case 'record': if(s.closed && s.boat && s.tareUnits && s.sampleUnits>0)s.recordedUnits=s.sampleUnits;break;
  }
  return s;
}
function titrationWeighingReading(raw) {
  var s=titrationWeighingState(raw),gross=s.boat?23456+s.sampleUnits:0;
  return {gross:gross,tare:s.tareUnits,net:gross-s.tareUnits};
}
// Transfer trials keep a copy of a recorded mass; they never consume the weighing sample.
function titrationTransferSource(weighing) {
  var w=titrationWeighingState(weighing);
  return w.recordedUnits!==null && w.recordedUnits===w.sampleUnits ? w.recordedUnits : null;
}
function titrationTransferState(raw) {
  raw=raw && typeof raw==='object'?raw:{};
  var source=Number.isSafeInteger(raw.sourceUnits) && raw.sourceUnits>0 && raw.sourceUnits<=20000?raw.sourceUnits:null;
  var residue=Number.isSafeInteger(raw.residuePermille)?Math.max(0,Math.min(100,raw.residuePermille)):40;
  var phase=source && ['poured','rinsed'].indexOf(raw.phase)!==-1?raw.phase:'ready';
  var recorded=source && phase!=='ready' && (raw.recordedPhase==='poured' || (raw.recordedPhase==='rinsed' && phase==='rinsed'))?raw.recordedPhase:null;
  return {sourceUnits:source,residuePermille:residue,phase:phase,recordedPhase:recorded};
}
function titrationTransferMass(raw,phaseOverride) {
  var s=titrationTransferState(raw),source=s.sourceUnits||0,phase=phaseOverride||s.phase;
  var dryResidue=Math.round(source*s.residuePermille/1000);
  var remaining=phase==='ready'?source:phase==='rinsed'?0:dryResidue;
  return {source:source,remaining:remaining,received:source-remaining,
    dryBefore:source?23456+source:null,dryAfter:source && phase==='poured'?23456+remaining:null};
}
function titrationTransferTransition(raw,action,weighing) {
  var s=titrationTransferState(raw);action=action||{};
  if(action.type==='load') {
    var source=titrationTransferSource(weighing);
    if(source!==null)return {sourceUnits:source,residuePermille:s.residuePermille,phase:'ready',recordedPhase:null};
  } else if(action.type==='restart') {
    s.phase='ready';s.recordedPhase=null;
  } else if(action.type==='residue' && s.phase==='ready' && Number.isSafeInteger(action.value) && action.value>=0 && action.value<=100) {
    s.residuePermille=action.value;
  } else if(action.type==='pour' && s.sourceUnits!==null && s.phase==='ready') {
    s.phase='poured';
  } else if(action.type==='rinse' && s.phase==='poured' && titrationTransferMass(s).remaining>0) {
    s.phase='rinsed';
  } else if(action.type==='record' && s.phase!=='ready' && s.sourceUnits!==null) {
    s.recordedPhase=s.phase;
  }
  return s;
}

// Preparation volumes use integer hundredths of a milliliter; sample units remain 0.0001 g.
function titrationPreparationSource(transfer) {
  var s=titrationTransferState(transfer);
  return s.recordedPhase!==null && s.recordedPhase===s.phase?titrationTransferMass(s).received:null;
}
function titrationPreparationState(raw) {
  raw=raw && typeof raw==='object'?raw:{};
  var source=Number.isSafeInteger(raw.sourceUnits)&&raw.sourceUnits>0&&raw.sourceUnits<=20000?raw.sourceUnits:null;
  var phase=source && ['dissolved','filling','mixed'].indexOf(raw.phase)!==-1?raw.phase:'received';
  var volume=phase==='filling'||phase==='mixed'?(Number.isSafeInteger(raw.volumeUnits)&&raw.volumeUnits>=9500&&raw.volumeUnits<=10100&&raw.volumeUnits%5===0?raw.volumeUnits:9500):0;
  var eye=raw.eyeLevel===true;
  if(phase==='mixed' && (volume!==10000 || !eye))phase='filling';
  return {sourceUnits:source,phase:phase,volumeUnits:volume,eyeLevel:eye};
}
function titrationPreparationTransition(raw,action,transfer) {
  var s=titrationPreparationState(raw);action=action||{};
  if(action.type==='load') {
    var source=titrationPreparationSource(transfer);
    if(source!==null)return {sourceUnits:source,phase:'received',volumeUnits:0,eyeLevel:false};
  } else if(action.type==='restart') {
    s.phase='received';s.volumeUnits=0;s.eyeLevel=false;
  } else if(s.sourceUnits!==null) {
    if(action.type==='dissolve' && s.phase==='received')s.phase='dissolved';
    else if(action.type==='transfer' && s.phase==='dissolved'){s.phase='filling';s.volumeUnits=9500;}
    else if(action.type==='eye' && s.phase==='filling')s.eyeLevel=true;
    else if(action.type==='add' && s.phase==='filling' && s.volumeUnits<=10000 && [5,100].indexOf(action.units)!==-1)s.volumeUnits+=action.units;
    else if(action.type==='mix' && s.phase==='filling' && s.volumeUnits===10000 && s.eyeLevel)s.phase='mixed';
  }
  return s;
}
function titrationPreparationResult(raw) {
  var s=titrationPreparationState(raw);
  return s.sourceUnits!==null && s.phase==='mixed'?{massGrams:s.sourceUnits/10000,volumeMl:100,gramsPerLiter:s.sourceUnits/1000}:null;
}

function titrationAliquotSource(preparation) {
  var s=titrationPreparationState(preparation);
  return titrationPreparationResult(s)?s.sourceUnits:null;
}
function titrationAliquotState(raw) {
  raw=raw&&typeof raw==='object'?raw:{};
  var source=Number.isSafeInteger(raw.sourceUnits)&&raw.sourceUnits>0&&raw.sourceUnits<=20000?raw.sourceUnits:null;
  var phase=source&&['conditioned','filled','adjusted','delivered','blown'].indexOf(raw.phase)!==-1?raw.phase:'ready';
  // A completed delivery cannot be reconstructed without its alignment and wall-contact steps.
  var eye=raw.eyeLevel===true,wall=raw.atWall===true;
  if(['adjusted','delivered','blown'].indexOf(phase)!==-1&&!eye)phase='filled';
  if(['delivered','blown'].indexOf(phase)!==-1&&!wall)phase='adjusted';
  if(['adjusted','delivered','blown'].indexOf(phase)===-1)wall=false;
  if(phase==='ready'||phase==='conditioned')eye=false;
  return {sourceUnits:source,phase:phase,eyeLevel:eye,atWall:wall,recorded:raw.recorded===true&&(phase==='delivered'||phase==='blown')};
}
function titrationAliquotTransition(raw,action,preparation) {
  var s=titrationAliquotState(raw);action=action||{};
  if(action.type==='load') {
    var source=titrationAliquotSource(preparation);
    if(source!==null)return {sourceUnits:source,phase:'ready',eyeLevel:false,atWall:false,recorded:false};
  } else if(action.type==='restart') {
    s.phase='ready';s.eyeLevel=false;s.atWall=false;s.recorded=false;
  } else if(s.sourceUnits!==null) {
    if(action.type==='condition'&&s.phase==='ready')s.phase='conditioned';
    else if(action.type==='fill'&&s.phase==='conditioned')s.phase='filled';
    else if(action.type==='eye'&&s.phase==='filled')s.eyeLevel=true;
    else if(action.type==='adjust'&&s.phase==='filled'&&s.eyeLevel)s.phase='adjusted';
    else if(action.type==='wall'&&s.phase==='adjusted')s.atWall=true;
    else if(action.type==='drain'&&s.phase==='adjusted'&&s.atWall)s.phase='delivered';
    else if(action.type==='record'&&s.phase==='delivered')s.recorded=true;
    else if(action.type==='blow'&&s.phase==='delivered')s.phase='blown';
  }
  return s;
}
function titrationAliquotResult(raw) {
  var s=titrationAliquotState(raw);
  return s.phase==='delivered'&&s.recorded?{volumeMl:25,gramsPerLiter:s.sourceUnits/1000,massGrams:s.sourceUnits/40000}:null;
}

// Progress is derived from each activity's own saved copy; upstream changes do not erase later records.
function titrationPreparationProgress(data) {
  data=data&&typeof data==='object'?data:{};
  var w=titrationWeighingState(data.weighingPractice),tr=titrationTransferState(data.transferPractice),p=titrationPreparationState(data.preparationPractice),a=titrationAliquotState(data.aliquotPractice);
  var weighed=titrationTransferSource(w),transferred=titrationPreparationSource(tr),prepared=titrationAliquotSource(p),pr=titrationPreparationResult(p),ar=titrationAliquotResult(a);
  var stages=[
    {id:'analytical-balance',status:weighed!==null?'complete':w.recordedUnits!==null?'attention':!w.closed||w.boat||w.tareUnits||w.sampleUnits?'active':'available',issue:w.recordedUnits!==null&&weighed===null?'weighing':null,value:weighed,unit:'g',sourceChanged:false},
    {id:'weighing-boat',status:transferred!==null?'complete':tr.recordedPhase!==null?'attention':tr.sourceUnits!==null?'active':weighed!==null?'available':'pending',issue:tr.recordedPhase!==null&&transferred===null?'transfer':null,value:transferred,unit:'g',sourceChanged:tr.sourceUnits!==null&&tr.sourceUnits!==weighed},
    {id:'volumetric-flask',status:pr?'complete':p.volumeUnits>10000?'attention':p.sourceUnits!==null?'active':transferred!==null?'available':'pending',issue:p.volumeUnits>10000?'preparation':null,value:pr?pr.gramsPerLiter:null,unit:'g/L',sourceChanged:p.sourceUnits!==null&&p.sourceUnits!==transferred},
    {id:'pipette',status:ar?'complete':a.phase==='blown'?'attention':a.sourceUnits!==null?'active':prepared!==null?'available':'pending',issue:a.phase==='blown'?'aliquot':null,value:ar?ar.volumeMl:null,unit:'mL',sourceChanged:a.sourceUnits!==null&&a.sourceUnits!==prepared}
  ];
  var next=null;
  ['attention','active','available'].some(function(status){next=stages.find(function(stage){return stage.status===status;});return !!next;});
  return {stages:stages,completed:stages.filter(function(stage){return stage.status==='complete';}).length,nextId:next?next.id:'pipette'};
}

function titrationWeighingEquipment(t) {
  return [
    {id:'analytical-balance',icon:'\u2696',name:t('stem.titration.equip_balance_name','Analytical balance'),desc:t('stem.titration.equip_balance_desc','Separate container mass from sample mass.'),
      technique:t('stem.titration.equip_balance_technique','Check that the balance is level, ready, and zeroed according to its instructions before starting.'),
      study:[
        {label:t('stem.titration.equip_balance_step1','Prepare the pan'),text:t('stem.titration.equip_balance_text1','Use a clean, suitable weighing vessel for powders. Place it centrally on the pan.')},
        {label:t('stem.titration.equip_balance_step2','Tare the vessel'),text:t('stem.titration.equip_balance_text2','Close the draft shield and wait for stability, then tare the empty vessel. Tare subtracts its mass from the reading.')},
        {label:t('stem.titration.equip_balance_step3','Read the sample'),text:t('stem.titration.equip_balance_text3','Add sample carefully, close the shield, and wait for a stable reading. Record the actual mass with its unit.')}
      ],errors:[t('stem.titration.equip_balance_error','Reading before stability, spilling powder on the pan, or taring away some of the sample.')],
      safetyNote:t('stem.titration.equip_balance_safety','Use the approved weighing method and clean up spills according to the lab procedure.'),source:'https://chemed.chem.purdue.edu/genchem/lab/equipment/analytical/instructions'},
    {id:'weighing-boat',icon:'\u25B1',name:t('stem.titration.equip_boat_name','Weighing boat'),desc:t('stem.titration.equip_boat_desc','Contain a solid and account for its transfer.'),
      technique:t('stem.titration.equip_boat_technique','Choose a clean, dry vessel compatible with the solid and any solvent used to rinse it.'),
      study:[
        {label:t('stem.titration.equip_boat_step1','Contain'),text:t('stem.titration.equip_boat_text1','Use the boat to keep solid off the balance pan. Measure sample mass separately from the container mass.')},
        {label:t('stem.titration.equip_boat_step2','Transfer'),text:t('stem.titration.equip_boat_text2','Guide the solid into the receiving vessel without spilling. Some material may remain on the boat.')},
        {label:t('stem.titration.equip_boat_step3','Account for residue'),text:t('stem.titration.equip_boat_text3','Follow the method: rinse compatible residue into the receiver, or determine the transferred mass by weighing before and after transfer.')}
      ],errors:[t('stem.titration.equip_boat_error','Assuming all weighed solid reached the solution when some remains in the boat.')],
      safetyNote:t('stem.titration.equip_boat_safety','Some solvents attack plastic boats. Check compatibility before rinsing.'),source:'https://chemtl.york.ac.uk/techniques/basic-techniques/weigh-measure/adding-material-to-a-flask'},
    {id:'spatula',icon:'\u2571',name:t('stem.titration.equip_spatula_name','Spatula'),desc:t('stem.titration.equip_spatula_desc','Transfer solid in controlled portions.'),
      technique:t('stem.titration.equip_spatula_technique','Use a clean, dry, compatible spatula and the portioning method specified for the reagent.'),
      study:[
        {label:t('stem.titration.equip_spatula_step1','Select'),text:t('stem.titration.equip_spatula_text1','Choose a suitable clean tool before taking a working portion of solid.')},
        {label:t('stem.titration.equip_spatula_step2','Add gradually'),text:t('stem.titration.equip_spatula_text2','Use smaller portions as you approach the target. A scoop does not have a fixed mass; check the balance reading.')},
        {label:t('stem.titration.equip_spatula_step3','Keep stock clean'),text:t('stem.titration.equip_spatula_text3','Do not return excess material to the stock container. Handle leftovers and clean the tool as directed.')}
      ],errors:[t('stem.titration.equip_spatula_error','Cross-contaminating stock or treating scoop size as a calibrated measurement.')],
      safetyNote:t('stem.titration.equip_spatula_safety','Avoid raising dust; follow the handling controls for the actual solid.'),source:'https://chemistry.ucdavis.edu/sites/g/files/dgvnsk196/files/inline-files/2B%20Student%20Lab%20Manual%20Spring%202026.pdf#page=172'}
  ];
}
function TitrationWeighingIllustration(props) {
  var h=props.React.createElement,s=titrationWeighingState(props.state),uid=props.id;
  var grains=s.sampleUnits?Math.max(3,Math.min(25,Math.ceil(s.sampleUnits/250))):0;
  return h('svg',{viewBox:'0 0 360 275',width:'100%',style:{display:'block',maxHeight:320},'aria-hidden':true,focusable:false,'data-weighing-illustration':true,'data-shield':s.closed?'closed':'open','data-boat':s.boat?'on':'off'},
    h('defs',null,h('linearGradient',{id:uid+'-shield',x1:0,y1:0,x2:1,y2:1},h('stop',{offset:0,stopColor:'#a5e6ff',stopOpacity:0.15}),h('stop',{offset:1,stopColor:'#bde5f5',stopOpacity:0.04}))),
    h('ellipse',{cx:180,cy:142,rx:149,ry:124,fill:'#102d41'}),
    h('ellipse',{cx:180,cy:254,rx:134,ry:12,fill:'#020e1a'}),
    h('path',{d:'M64 200 H274 L306 223 V249 H42 V223 Z',fill:'#29495f',stroke:'#9fbed0',strokeWidth:2}),
    h('path',{d:'M64 200 H274 L306 223 H42 Z',fill:'#adc6d3',stroke:'#dcebf3',strokeWidth:2}),
    h('path',{d:'M64 53 L100 27 H310 L274 53 Z M100 27 V179 L64 201 M310 27 V179 L274 201',fill:'none',stroke:'#7eabbe',strokeWidth:2}),
    h('path',{d:'M64 53 H274 V201 H64 Z',fill:'url(#'+uid+'-shield)',stroke:'#a2d1e2',strokeWidth:2}),
    h('path',{d:s.closed?'M274 53 L310 27 V179 L274 201 Z':'M298 53 L334 27 V179 L298 201 Z',fill:'url(#'+uid+'-shield)',stroke:s.closed?'#a2d1e2':'#6ee7b7',strokeWidth:2}),
    h('path',{d:s.closed?'M292 94 V124':'M317 93 V123',stroke:s.closed?'#dbf3fc':'#6ee7b7',strokeWidth:5,strokeLinecap:'round'}),
    h('path',{d:'M78 68 V183 M83 67 V98',stroke:'#c9eaf5',strokeWidth:2,opacity:0.5}),
    h('ellipse',{cx:175,cy:191,rx:70,ry:16,fill:'#243e51',stroke:'#b8d0dc',strokeWidth:2}),
    h('ellipse',{cx:175,cy:187,rx:69,ry:14,fill:'#cbdce4',stroke:'#e4f2f7',strokeWidth:2}),
    s.boat && h('g',null,
      h('path',{d:'M120 164 L177 148 L230 165 L218 185 L174 196 L131 183 Z',fill:'#e4eff3',stroke:'#97b6c6',strokeWidth:2}),
      h('path',{d:'M134 166 L177 155 L216 167 L208 177 L175 186 L142 177 Z',fill:'#c2d6e0',stroke:'#fbfeff',strokeWidth:1.5}),
      Array.from({length:grains},function(_,i){var x=154+(i*13%41),y=168+(i*7%12);return h('circle',{key:i,cx:x,cy:y-(i>15?7:0),r:2.5+(i%3)*0.5,fill:'#f9f6d1',stroke:'#c1b987',strokeWidth:0.6});})),
    !s.closed && s.boat && s.tareUnits>0 && h('g',{transform:'rotate(-25 231 128)'},h('rect',{x:231,y:122,width:64,height:8,rx:4,fill:'#8baebe',stroke:'#d6e9f1'}),h('ellipse',{cx:231,cy:127,rx:15,ry:6,fill:'#d8e7ed',stroke:'#93b4c4'})),
    h('rect',{x:82,y:230,width:92,height:12,rx:4,fill:'#082a31'}),h('rect',{x:89,y:233,width:76,height:6,rx:2,fill:s.closed?'#6ee7b7':'#fcd34d'}),
    h('circle',{cx:254,cy:235,r:8,fill:'#153448',stroke:'#abc8d8'}),h('circle',{cx:254,cy:235,r:3,fill:'#6ee7b7'}));
}
function TitrationPreparationPath(props) {
  var h=props.React.createElement,t=props.t,id=props.React.useId(),progress=titrationPreparationProgress(props.data);
  var steps=[['analytical-balance',t('stem.titration.prep_weigh','Weigh a sample'),t('stem.titration.prep_weigh_hint','Practice tare, fine additions, and a stable reading.')],['weighing-boat',t('stem.titration.prep_transfer','Transfer the solid'),t('stem.titration.prep_transfer_hint','Account for the material left in the boat.')],['volumetric-flask',t('stem.titration.prep_volume','Prepare the solution'),t('stem.titration.prep_volume_hint','Dissolve, transfer rinsings, make to volume, and mix.')],['pipette',t('stem.titration.aliquot_path','Take an aliquot'),t('stem.titration.aliquot_path_hint','Deliver a measured portion with a volumetric pipette.')]];
  var labels={complete:t('stem.titration.path_complete','Recorded'),attention:t('stem.titration.path_attention','Needs attention'),active:t('stem.titration.path_active','In progress'),available:t('stem.titration.path_available','Ready to start'),pending:t('stem.titration.path_pending','Needs an earlier record')};
  var issues={weighing:t('stem.titration.path_weigh_changed','Sample changed after weighing. Update its record.'),transfer:t('stem.titration.path_transfer_changed','Rinsed after recording. Update the delivered mass.'),preparation:t('stem.titration.path_overshoot','Above the mark. Restart this preparation.'),aliquot:t('stem.titration.path_blowout','Tip liquid forced out. Restart pipetting.')};
  var colors={complete:'#91d6b7',attention:'#e6c875',active:'#80d1ee',available:'#93b5c9',pending:'#9ab2c5'};
  var next=steps.find(function(step){return step[0]===progress.nextId;});
  var countText=t('stem.titration.path_count','{count} of {total} activities recorded').replace('{count}',String(progress.completed)).replace('{total}',String(steps.length));
  function record(stage) {
    if(stage.value===null)return null;
    return stage.unit==='g'?(stage.value/10000).toFixed(4)+' g':stage.unit==='g/L'?stage.value.toFixed(3)+' g/L':stage.value.toFixed(2)+' mL';
  }
  return h('section',{'data-titration-preparation-path':true,'aria-label':t('stem.titration.prep_title','From solid to aliquot'),style:{padding:16,border:'1px solid #527f95',borderRadius:14,background:'#102c3d'}},
    h('div',{style:{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}},h('div',null,
      h('h4',{style:{margin:'0 0 7px',fontSize:17,color:'#e0f2fe'}},t('stem.titration.prep_title','From solid to aliquot')),
      h('p',{'data-path-count':true,style:{margin:0,fontSize:12,color:'#c7e2f0'}},countText)),
      h('button',{type:'button','data-path-continue':true,'aria-describedby':id+'-next',onClick:function(){props.onSelect(progress.nextId);},className:'focus-visible:ring-2 focus-visible:ring-cyan-200',style:{minHeight:44,padding:'10px 14px',border:'1px solid #9ed8c6',borderRadius:10,background:'#185345',color:'#e2fff1',fontSize:13,fontWeight:700}},progress.completed===steps.length?t('stem.titration.path_review','Review aliquot record'):t('stem.titration.path_continue','Continue practice'))),
    h('div',{role:'progressbar','aria-label':t('stem.titration.path_progress','Activities with a current record'),'aria-valuemin':0,'aria-valuemax':steps.length,'aria-valuenow':progress.completed,'aria-valuetext':countText,style:{display:'flex',gap:5,margin:'14px 0 10px'}},progress.stages.map(function(stage){return h('span',{key:stage.id,'aria-hidden':true,style:{flex:1,height:5,borderRadius:4,background:stage.status==='complete'?'#6ee7b7':'#3b5b70'}});})),
    h('p',{id:id+'-next',style:{fontSize:12,color:'#c4deec',lineHeight:1.6,margin:'0 0 14px'}},progress.completed===steps.length?t('stem.titration.path_all_recorded','Every activity has a current record. Choose a stage to review it.'):t('stem.titration.path_next','Suggested next activity')+': '+next[1]),
    h('div',{style:{display:'flex',flexWrap:'wrap',gap:10}},steps.map(function(item,i){var stage=progress.stages[i],current=props.selected===item[0],value=record(stage);
      return h('button',{key:item[0],type:'button','data-path-stage':item[0],'data-path-status':stage.status,'aria-current':current?'step':undefined,'aria-labelledby':id+'-'+i+'-title','aria-describedby':id+'-'+i+'-hint '+id+'-'+i+'-status'+(stage.sourceChanged?' '+id+'-'+i+'-source':''),onClick:function(){props.onSelect(item[0]);},className:'focus-visible:ring-2 focus-visible:ring-cyan-200',style:{flex:'1 1 190px',minWidth:0,textAlign:'left',minHeight:132,padding:12,border:(current?'2px':'1px')+' solid '+(current?'#93e2ff':colors[stage.status]),borderRadius:10,background:current?'#193f53':'#123446',color:'#f1f5f9'}},
        h('strong',{id:id+'-'+i+'-title',style:{display:'block',fontSize:13,marginBottom:9}},h('span',{'aria-hidden':true,style:{color:colors[stage.status],marginRight:8}},stage.status==='complete'?'✓':'0'+(i+1)),item[1]),
        h('span',{id:id+'-'+i+'-status',style:{display:'block',fontSize:11,fontWeight:700,color:colors[stage.status],marginBottom:7}},labels[stage.status]),
        h('span',{id:id+'-'+i+'-hint',style:{display:'block',fontSize:value?17:12,lineHeight:1.5,color:value?'#edfaff':'#c4dcea',fontVariantNumeric:'tabular-nums'}},stage.issue?issues[stage.issue]:value||item[2]),
        stage.sourceChanged&&h('span',{id:id+'-'+i+'-source',style:{display:'block',fontSize:11,lineHeight:1.5,color:'#c4e4f4',marginTop:8}},t('stem.titration.path_saved_copy','Using an earlier source record')));
    })),
    h('p',{style:{fontSize:11,lineHeight:1.6,color:'#bfd6e5',margin:'12px 0 0'}},t('stem.titration.path_copies','Each activity keeps its own sample copy. Changing an earlier activity does not replace later records. You can open any stage to review or restart it.')));
}
function TitrationRelatedEquipment(props) {
  var h=props.React.createElement,t=props.t;
  var pairs={'analytical-balance':['spatula','weighing-boat'],'weighing-boat':['analytical-balance','volumetric-flask'],'spatula':['analytical-balance','weighing-boat'],'volumetric-flask':['weighing-boat','pipette-filler'],'pipette-filler':['pipette','volumetric-flask'],'funnel':['stand-clamp','burette'],'stand-clamp':['funnel','burette'],'magnetic-stirrer':['erlenmeyer','ph-electrode'],'ph-electrode':['magnetic-stirrer','indicator']};
  var ids=pairs[props.equipment.id]||[],items=props.catalogue.filter(function(eq){return ids.indexOf(eq.id)!==-1;});
  return h('div',{role:'group','aria-label':t('stem.titration.equip_related','Related equipment'),'data-equipment-related':true,style:{paddingTop:12,marginTop:12,borderTop:'1px solid #35586e'}},
    h('p',{style:{fontSize:12,color:'#bdd4e2',margin:'0 0 8px'}},t('stem.titration.equip_related','Related equipment')),
    h('div',{style:{display:'flex',flexWrap:'wrap',gap:8}},items.map(function(eq){return h('button',{key:eq.id,type:'button',onClick:function(){props.onSelect(eq.id);},className:'focus-visible:ring-2 focus-visible:ring-emerald-300',style:{minHeight:44,border:'1px solid #678ba0',borderRadius:9,padding:'8px 12px',background:'#153448',color:'#d1fae5',fontSize:12}},eq.name);})));
}
function TitrationWeighingPractice(props) {
  var React=props.React,h=React.createElement,t=props.t,id=React.useId(),s=titrationWeighingState(props.state),reading=titrationWeighingReading(s);
  var fmt=function(n){return (n/10000).toFixed(4)+' g';},within=Math.abs(s.sampleUnits-5000)<=20,hasCurrentRecord=s.recordedUnits!==null && s.recordedUnits===s.sampleUnits;
  var next=!s.boat?(s.closed?t('stem.titration.weigh_next_open','Open the draft shield to place the boat.'):t('stem.titration.weigh_next_boat','Place the boat on the pan.')):!s.tareUnits?(s.closed?t('stem.titration.weigh_next_tare','Tare the empty boat to exclude its mass.'):t('stem.titration.weigh_next_close_tare','Close the shield before taring the empty boat.')):s.sampleUnits===0?(s.closed?t('stem.titration.weigh_next_open_add','Open the shield to add sample with the spatula.'):t('stem.titration.weigh_next_add','Add a coarse portion, then use smaller additions near the target.')):!s.closed?t('stem.titration.weigh_next_close','Close the shield before recording a mass.'):hasCurrentRecord?t('stem.titration.weigh_next_transfer','Mass recorded. Study how to transfer the sample without losing material.'):t('stem.titration.weigh_next_record','Record the stable sample mass, even if it differs from the target.');
  function button(label,action,disabled,primary){return h('button',{type:'button',disabled:!!disabled,onClick:function(){props.onAction(action);},className:'focus-visible:ring-2 focus-visible:ring-emerald-300',style:{scrollMarginTop:150,minHeight:44,padding:'9px 12px',border:'1px solid '+(disabled?'#385366':primary?'#6ee7b7':'#64879c'),borderRadius:9,background:disabled?'#152a39':primary?'#164b42':'#193b50',color:disabled?'#94a8b8':'#e1f7ee',fontSize:12,cursor:disabled?'not-allowed':'pointer'}},label);}
  function stat(label,value){return h('div',{style:{flex:'1 1 90px',minWidth:0,padding:10,border:'1px solid #35576c',borderRadius:9}},h('dt',{style:{fontSize:11,color:'#b7d0df'}},label),h('dd',{style:{margin:'4px 0 0',fontSize:15,color:'#e0f2fe',fontVariantNumeric:'tabular-nums'}},fmt(value)));}
  return h('section',{'data-titration-weighing-practice':true,'aria-labelledby':id+'-title',style:{padding:16,border:'1px solid #58748c',borderRadius:16,background:'#0b2030'}},
    h('div',{style:{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}},
      h('div',null,h('p',{style:{margin:'0 0 4px',fontSize:11,fontWeight:700,color:'#bae6fd',letterSpacing:'0.06em'}},t('stem.titration.weigh_badge','HANDS-ON PRACTICE')),
        h('h4',{id:id+'-title',style:{margin:0,fontSize:20,color:'#f0f9ff'}},t('stem.titration.weigh_title','Weigh a sample'))),button(t('stem.titration.weigh_reset','Restart practice'),{type:'reset'},false,false)),
    h('p',{style:{fontSize:12,lineHeight:1.6,color:'#c2d8e5',margin:'10px 0 16px'}},t('stem.titration.weigh_goal','Aim for 0.5000 g. The practice target band is ±0.0020 g; it is not the balance uncertainty.')),
        h('div',{role:'status','aria-atomic':true,'data-weighing-readout':true,style:{position:'sticky',top:8,zIndex:3,boxShadow:'0 5px 16px rgba(0,0,0,0.24)',border:'1px solid '+(s.closed?'#4a927e':'#bca86b'),borderRadius:10,padding:14,marginBottom:16,background:'#08202a'}},
          h('p',{style:{fontSize:11,color:'#bcdbdf',margin:0}},t('stem.titration.weigh_display','Balance display')),
          h('strong',{'data-weighing-display':true,style:{display:'block',fontFamily:'ui-monospace,Consolas,monospace',fontSize:30,fontVariantNumeric:'tabular-nums',color:s.closed?'#a7f3d0':'#fde68a',margin:'4px 0'}},fmt(reading.net)),
          h('span',{style:{fontSize:12,color:s.closed?'#a7f3d0':'#fde68a'}},s.closed?t('stem.titration.weigh_stable','Stable in this model'):t('stem.titration.weigh_unstable','Shield open · do not record'))),
    h('div',{style:{display:'flex',flexWrap:'wrap',gap:20,alignItems:'flex-start'}},
      h('div',{style:{flex:'1 1 230px',minWidth:0}},
        h('div',{style:{background:'#071725',border:'1px solid #34566b',borderRadius:12}},h(TitrationWeighingIllustration,{React:React,state:s,id:id})),
        h('dl',{style:{display:'flex',flexWrap:'wrap',gap:6,margin:'10px 0 0'}},stat(t('stem.titration.weigh_gross','Gross on pan'),reading.gross),stat(t('stem.titration.weigh_tare','Tare offset'),reading.tare),stat(t('stem.titration.weigh_net','Net display'),reading.net)),
        h('p',{style:{fontSize:11,lineHeight:1.5,color:'#bad1e0',margin:'8px 0 0'}},t('stem.titration.weigh_equation','Net = gross − tare. Removing a tared boat leaves a negative reading.'))),
      h('div',{style:{flex:'1.2 1 260px',minWidth:0}},
        h('p',{id:id+'-next','aria-live':'polite',style:{margin:'0 0 14px',padding:12,borderLeft:'3px solid #6ee7b7',background:'#123d3c',borderRadius:6,color:'#d1fae5',fontSize:13,lineHeight:1.6}},next),
        h('div',{role:'group','aria-label':t('stem.titration.weigh_setup','Prepare the balance'),'aria-describedby':id+'-next',style:{display:'flex',flexWrap:'wrap',gap:8}},
          button(s.closed?t('stem.titration.weigh_open','Open draft shield'):t('stem.titration.weigh_close','Close draft shield'),{type:'shield'},false,false),
          button(s.boat?t('stem.titration.weigh_remove','Remove boat'):s.sampleUnits?t('stem.titration.weigh_return','Return loaded boat'):t('stem.titration.weigh_place','Place empty boat'),{type:'boat'},s.closed,false),
          button(t('stem.titration.weigh_tare_button','Tare empty boat'),{type:'tare'},!s.closed||!s.boat||s.sampleUnits>0||s.tareUnits>0,true)),
        h('p',{style:{fontSize:12,color:'#c8dce7',margin:'16px 0 8px'}},t('stem.titration.weigh_additions','Spatula additions · use smaller portions near the target')),
        h('div',{role:'group','aria-label':t('stem.titration.weigh_additions','Spatula additions · use smaller portions near the target'),'aria-describedby':id+'-next',style:{display:'flex',flexWrap:'wrap',gap:8}},[1000,100,10].map(function(amount){return h(React.Fragment,{key:amount},button('+ '+fmt(amount),{type:'add',units:amount},s.closed||!s.boat||!s.tareUnits||s.sampleUnits+amount>20000,false));})),
        h('div',{style:{margin:'16px 0',padding:12,border:'1px solid #45677e',borderRadius:10}},
          h('p',{style:{margin:'0 0 6px',fontSize:11,color:'#bdd4e2'}},(s.boat?t('stem.titration.weigh_sample_in_boat','Sample in boat'):t('stem.titration.weigh_boat_off_pan','Boat off pan'))+': '+fmt(s.sampleUnits)),
          h('p',{style:{margin:'0 0 8px',fontSize:12,color:'#dcebf3'}},s.sampleUnits===0?t('stem.titration.weigh_empty','No sample added'):within?t('stem.titration.weigh_within','Within the practice target band'):s.sampleUnits<5000?t('stem.titration.weigh_below','Below the practice target band'):t('stem.titration.weigh_above','Above the practice target band')),
          h('div',{'aria-hidden':true,style:{position:'relative',height:10,borderRadius:6,background:'#304c61',margin:'10px 0'}},h('div',{style:{height:'100%',width:(s.sampleUnits/Math.max(10000,s.sampleUnits)*100)+'%',background:within?'#6ee7b7':'#7dd3fc',borderRadius:6}}),h('span',{style:{position:'absolute',left:(5000/Math.max(10000,s.sampleUnits)*100)+'%',top:-4,height:18,borderLeft:'2px solid #fde68a'}})),
          h('div',{'aria-hidden':true,style:{display:'flex',justifyContent:'space-between',fontSize:11,color:'#bdd4e2'}},h('span',null,'0.0000 g'),h('span',null,fmt(Math.max(10000,s.sampleUnits))))),
        button(t('stem.titration.weigh_record','Record mass'),{type:'record'},!s.closed||!s.boat||!s.tareUnits||s.sampleUnits===0||hasCurrentRecord,true),
        s.recordedUnits!==null && h('div',{'data-weighing-record':true,style:{marginTop:12,padding:12,background:'#123a36',border:'1px solid #507f6e',borderRadius:10,color:'#d1fae5',fontSize:13,lineHeight:1.6}},
          h('strong',null,t('stem.titration.weigh_recorded','Recorded sample mass')+': '+fmt(s.recordedUnits)),
          h('p',{style:{margin:'5px 0 0',fontSize:12}},hasCurrentRecord?t('stem.titration.weigh_transfer_hint','Next, check how much of this sample reaches the receiver.'):t('stem.titration.weigh_record_stale','Sample changed. Close the shield and record the new mass.')),
          h('button',{type:'button',onClick:function(){props.onSelect('weighing-boat');},className:'focus-visible:ring-2 focus-visible:ring-emerald-300',style:{minHeight:44,padding:'8px 10px',marginTop:8,border:'1px solid #72ac9c',borderRadius:8,background:'#18483f',color:'#d1fae5',fontSize:12}},t('stem.titration.weigh_transfer','Study sample transfer'))))),
    h('p',{style:{fontSize:11,lineHeight:1.6,color:'#b5cede',margin:'16px 0 0'}},t('stem.titration.weigh_model_note','Practice model: fixed additions, a 2 g sample limit, and immediate stability with the shield closed. Real scoops vary; wait for the instrument stability indicator. Four decimals show display resolution, not guaranteed accuracy.')),
    h('p',{style:{fontSize:11,lineHeight:1.6,color:'#b5cede',margin:'6px 0 0'}},t('stem.titration.weigh_scope','Progress stays while you browse equipment. Restart clears this practice record. This exercise does not change the live titration or its notebook.')));
}


function TitrationTransferIllustration(props) {
  var h=props.React.createElement,s=titrationTransferState(props.state),m=titrationTransferMass(s),id=props.id;
  var wet=s.phase==='rinsed',poured=s.phase!=='ready';
  function grains(units,cx,cy,width,height,key) {
    var count=units?Math.max(1,Math.round(30*units/Math.max(1,m.source))):0;
    return h('g',{key:key},Array.from({length:count},function(_,i){return h('circle',{key:i,cx:cx+(i*17%width),cy:cy+(i*7%height),r:2.7+(i%3)*0.4,fill:'#fff0a6',stroke:'#ad985d',strokeWidth:0.65});}));
  }
  return h('svg',{viewBox:'0 0 460 285',width:'100%',style:{display:'block',maxHeight:345},'aria-hidden':true,focusable:false,'data-transfer-diagram':s.phase},
    h('defs',null,h('linearGradient',{id:id+'-glass',x1:'0%',y1:'0%',x2:'100%',y2:'0%'},h('stop',{offset:0,stopColor:'#c4eaff',stopOpacity:0.18}),h('stop',{offset:0.5,stopColor:'#d9f3ff',stopOpacity:0.03}),h('stop',{offset:1,stopColor:'#c4eaff',stopOpacity:0.16}))),
    h('ellipse',{cx:232,cy:145,rx:204,ry:124,fill:'#112f43'}),
    h('path',{d:'M24 255 H436 M45 264 H415',stroke:'#476a82',strokeWidth:1}),
    h('ellipse',{cx:327,cy:247,rx:82,ry:9,fill:'#031220'}),
    h('ellipse',{cx:116,cy:245,rx:86,ry:9,fill:'#031220',opacity:poured?0.35:0.8}),
    wet&&h('path',{d:'M270 197 Q327 214 386 197 V231 Q327 253 270 231 Z',fill:'#38bdf8',fillOpacity:0.3,stroke:'#7dd3fc',strokeWidth:1.3}),
    h('path',{d:'M267 127 V231 Q327 257 389 231 V127',fill:'url(#'+id+'-glass)',stroke:'#b9d8e9',strokeWidth:2.5}),
    h('ellipse',{cx:328,cy:127,rx:61,ry:13,fill:'none',stroke:'#b9d8e9',strokeWidth:2}),
    h('path',{d:'M280 147 V225 M286 145 V181',stroke:'#e1f4ff',strokeWidth:3,opacity:0.5}),
    grains(m.received,295,222,56,12,'receiver'),
    h('g',{transform:poured?'translate(113 -106) rotate(24 121 174)':undefined},
      h('path',{d:'M43 188 L116 161 L208 188 L191 218 L121 239 L62 218 Z',fill:'#dae8ef',stroke:'#9ebfcf',strokeWidth:2}),
      h('path',{d:'M66 190 L118 171 L187 190 L176 207 L121 224 L78 207 Z',fill:'#b9d1df',stroke:'#f3fbff',strokeWidth:1.6}),
      grains(m.remaining,96,193,56,15,'boat')),
    poured&&h('path',{d:'M309 115 Q325 120 327 146 M319 137 L327 146 L332 135',fill:'none',stroke:wet?'#7dd3fc':'#6ee7b7',strokeWidth:3,strokeLinecap:'round'}),
    wet&&h('g',null,
      h('path',{d:'M195 38 L215 66 M202 35 L221 63',stroke:'#d8e9f2',strokeWidth:3}),
      h('ellipse',{cx:190,cy:25,rx:9,ry:16,transform:'rotate(-35 190 25)',fill:'#486d84',stroke:'#b9d5e3',strokeWidth:2}),
      h('path',{d:'M220 72 L225 80 M228 85 L233 93',stroke:'#7dd3fc',strokeWidth:3,strokeLinecap:'round'})),
    poured&&m.remaining>0&&h('circle',{cx:216,cy:88,r:25,fill:'none',stroke:'#fde68a',strokeWidth:2,strokeDasharray:'4 5'}));
}
function TitrationTransferPractice(props) {
  var React=props.React,h=React.createElement,t=props.t,id=React.useId(),s=titrationTransferState(props.state),m=titrationTransferMass(s);
  var latest=titrationTransferSource(props.weighing),current=s.recordedPhase===s.phase,saved=s.recordedPhase?titrationTransferMass(s,s.recordedPhase):null;
  var fmt=function(units){return (units/10000).toFixed(4)+' g';};
  var phaseLabel=s.phase==='ready'?t('stem.titration.transfer_ready','Ready to pour'):s.phase==='poured'?t('stem.titration.transfer_dry','After dry transfer'):t('stem.titration.transfer_wet','After model rinse');
  var next=saved&&current?(s.phase==='poured'&&m.remaining>0?t('stem.titration.transfer_next_dry_recorded','Dry transfer recorded. Continue with this delivered mass, or rinse the residue and record the updated result.'):t('stem.titration.transfer_next_recorded','Transfer recorded. Continue to solution preparation with the delivered mass.')):s.sourceUnits===null?t('stem.titration.transfer_next_load','Load a current recorded mass from the weighing activity to begin.'):s.phase==='ready'?t('stem.titration.transfer_next_pour','Choose a model residue setting, then pour the solid into the receiver.'):s.phase==='poured' && m.remaining>0?t('stem.titration.transfer_next_compare','Compare the dry masses to find how much arrived. Record this result, or rinse the remaining solid into the receiver.'):t('stem.titration.transfer_next_finish','All of the model sample is in the receiver. Record the transfer before continuing to solution preparation.');
  function button(label,action,disabled,primary) {
    return h('button',{type:'button',disabled:!!disabled,onClick:function(){props.onAction(action);},className:'focus-visible:ring-2 focus-visible:ring-emerald-300',style:{minHeight:44,padding:'9px 12px',borderRadius:9,border:'1px solid '+(disabled?'#3a576c':primary?'#73c9b3':'#7594a8'),background:disabled?'#152d3e':primary?'#154d43':'#193c51',color:disabled?'#97afc0':'#e0f5ed',fontSize:12,scrollMarginTop:140,cursor:disabled?'not-allowed':'pointer'}},label);
  }
  function massCard(label,units,color,key) {
    return h('div',{key:key,style:{flex:'1 1 115px',minWidth:0,padding:12,border:'1px solid '+color,borderRadius:10,background:'#0c2433'}},
      h('dt',{style:{fontSize:11,color:'#c2d8e5'}},label),h('dd',{'data-transfer-mass':key,style:{margin:'5px 0 0',fontSize:19,color:'#eff9ff',fontVariantNumeric:'tabular-nums'}},fmt(units)));
  }
  return h('section',{'data-titration-transfer-practice':true,'aria-labelledby':id+'-title',style:{padding:16,border:'1px solid #557e92',borderRadius:16,background:'#0a2232'}},
    h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}},
      h('div',null,h('p',{style:{margin:'0 0 4px',fontSize:11,fontWeight:700,color:'#a7f3d0',letterSpacing:'0.06em'}},t('stem.titration.transfer_badge','FOLLOW THE SAMPLE')),
        h('h4',{id:id+'-title',style:{margin:0,fontSize:20,color:'#f0f9ff'}},t('stem.titration.transfer_title','Transfer the sample'))),
      button(t('stem.titration.transfer_restart','Restart transfer'),{type:'restart'},s.sourceUnits===null,false)),
    h('p',{style:{fontSize:12,color:'#c0d6e4',lineHeight:1.6,margin:'10px 0 14px'}},t('stem.titration.transfer_intro','Explore how residue changes the mass delivered to a receiver. The exercise keeps a copy of your recorded sample.')),
    h('div',{style:{padding:12,border:'1px solid #45677d',borderRadius:10,background:'#113044',marginBottom:16}},
      h('p',{'data-transfer-source':true,style:{margin:'0 0 10px',fontSize:12,color:'#e0edf5'}},latest===null?t('stem.titration.transfer_no_record','No current weighing record. Record the sample mass on the balance first.'):t('stem.titration.transfer_available','Current weighing record')+': '+fmt(latest)),
      h('div',{style:{display:'flex',flexWrap:'wrap',gap:8}},button(t('stem.titration.transfer_load','Use recorded sample'),{type:'load'},latest===null,true),
        h('button',{type:'button',onClick:function(){props.onSelect('analytical-balance');},className:'focus-visible:ring-2 focus-visible:ring-emerald-300',style:{minHeight:44,padding:'8px 12px',border:'1px solid #678a9e',borderRadius:9,background:'#183c50',color:'#d8f5ee',fontSize:12}},t('stem.titration.transfer_weighing','Back to weighing'))),
      s.sourceUnits!==null&&h('p',{style:{fontSize:11,lineHeight:1.5,color:latest===s.sourceUnits?'#bcd2df':'#fde68a',margin:'10px 0 0'}},latest===s.sourceUnits?t('stem.titration.transfer_reload_note','Loading a sample starts a new transfer; navigating between guides keeps this trial.'):t('stem.titration.transfer_source_changed','The weighing record has changed or is unavailable. This trial still uses its original sample')+': '+fmt(s.sourceUnits))),
    h('div',{style:{display:'flex',flexWrap:'wrap',gap:20,alignItems:'flex-start'}},
      h('div',{style:{flex:'1.15 1 250px',minWidth:0}},
        h('figure',{style:{margin:0,border:'1px solid #3f6479',borderRadius:12,background:'#071925',overflow:'hidden'}},
          h(TitrationTransferIllustration,{React:React,id:id,state:s}),h('figcaption',{style:{padding:'0 12px 12px',fontSize:12,color:'#bae6fd',textAlign:'center'}},s.sourceUnits===null?t('stem.titration.transfer_empty_scene','Load a sample to begin'):phaseLabel)),
        h('dl',{'aria-live':'polite','aria-atomic':true,style:{display:'flex',flexWrap:'wrap',gap:8,margin:'12px 0 0'}},
          massCard(t('stem.titration.transfer_starting_mass','Starting solid'),m.source,'#456e88','source'),
          massCard(t('stem.titration.transfer_received','Solid in receiver'),m.received,'#599f8b','received'),
          massCard(t('stem.titration.transfer_residue','Solid left in boat'),m.remaining,'#a89457','residue')),
        h('p',{style:{fontSize:11,color:'#c1d8e7',lineHeight:1.5,margin:'10px 0 0'}},t('stem.titration.transfer_conservation','Starting solid = solid in receiver + solid left in boat. Rinse liquid is not counted as sample mass.'))),
      h('div',{style:{flex:'1 1 250px',minWidth:0}},
        h('p',{id:id+'-next','aria-live':'polite',style:{margin:'0 0 16px',padding:12,borderLeft:'3px solid #6ee7b7',borderRadius:6,background:'#12403d',color:'#d1fae5',fontSize:13,lineHeight:1.6}},next),
        h('label',{htmlFor:id+'-residue',style:{display:'block',fontSize:12,color:'#e3eff7',fontWeight:700}},t('stem.titration.transfer_residue_setting','Residue left by a dry pour (model setting)')),
        h('div',{style:{display:'flex',alignItems:'center',gap:12,margin:'8px 0'}},h('input',{id:id+'-residue',type:'range',min:0,max:100,step:1,value:s.residuePermille,disabled:s.phase!=='ready','aria-valuetext':(s.residuePermille/10).toFixed(1)+'%','aria-describedby':id+'-residue-help',onChange:function(e){props.onAction({type:'residue',value:Number(e.target.value)});},style:{flex:1,minWidth:0,minHeight:44,accentColor:'#6ee7b7'}}),h('strong',{'aria-hidden':true,style:{fontSize:15,color:'#fde68a',fontVariantNumeric:'tabular-nums'}},(s.residuePermille/10).toFixed(1)+'%')),
        h('p',{id:id+'-residue-help',style:{fontSize:11,color:'#b8d0df',lineHeight:1.5,margin:'0 0 14px'}},s.phase==='ready'?t('stem.titration.transfer_setting_hint','Choose 0–10% before pouring. This is an example setting, not a prediction for a real powder.'):t('stem.titration.transfer_setting_locked','Restart the transfer to compare a different residue setting.')),
        h('div',{role:'group','aria-label':t('stem.titration.transfer_actions','Transfer actions'),'aria-describedby':id+'-next',style:{display:'flex',flexWrap:'wrap',gap:8}},
          button(t('stem.titration.transfer_pour','Pour the solid'),{type:'pour'},s.sourceUnits===null||s.phase!=='ready',true),
          button(t('stem.titration.transfer_rinse','Rinse residue into receiver'),{type:'rinse'},s.phase!=='poured'||m.remaining===0,false),
          button(t('stem.titration.transfer_record','Record transfer'),{type:'record'},s.phase==='ready'||s.sourceUnits===null||current,false)),
        s.phase!=='ready'&&h('div',{'data-transfer-difference':true,style:{marginTop:16,padding:12,border:'1px solid #597289',borderRadius:10,background:'#132c40'}},
          h('h5',{style:{fontSize:13,margin:'0 0 10px',color:'#e7f3fa'}},t('stem.titration.transfer_difference','Weighing by difference')),
          s.phase==='poured'?h(React.Fragment,null,
            h('p',{style:{margin:'0 0 6px',fontSize:12,color:'#cadfea'}},t('stem.titration.transfer_before','Dry boat + sample before')+': '+fmt(m.dryBefore)),
            h('p',{style:{margin:'0 0 10px',fontSize:12,color:'#cadfea'}},t('stem.titration.transfer_after','Dry boat + residue after')+': '+fmt(m.dryAfter)),
            h('strong',{'data-transfer-equation':true,style:{display:'block',fontSize:15,color:'#a7f3d0',lineHeight:1.6,fontVariantNumeric:'tabular-nums'}},(m.dryBefore/10000).toFixed(4)+' − '+(m.dryAfter/10000).toFixed(4)+' = '+fmt(m.received)),
            h('p',{style:{margin:'8px 0 0',fontSize:11,color:'#bfd5e3',lineHeight:1.5}},t('stem.titration.transfer_difference_note','These are model dry masses. The same boat mass cancels, leaving the mass delivered.'))):
            h('p',{style:{margin:0,fontSize:12,lineHeight:1.6,color:'#fde68a'}},t('stem.titration.transfer_wet_warning','The boat is now wet. Do not use its wet mass as the dry after-transfer measurement; rinse liquid would change that reading.'))),
        saved&&h('div',{'data-transfer-record':true,style:{marginTop:14,padding:12,border:'1px solid '+(current?'#518c7b':'#a9914f'),borderRadius:10,background:'#12362f',color:'#d1fae5',fontSize:12,lineHeight:1.6}},
          h('strong',{style:{fontSize:14}},t('stem.titration.transfer_recorded','Recorded delivered mass')+': '+fmt(saved.received)),
          h('p',{style:{margin:'4px 0 0'}},s.recordedPhase==='poured'?t('stem.titration.transfer_method_dry','Method: dry weighing by difference'):t('stem.titration.transfer_method_rinse','Method: complete rinse in this model')),
          !current&&h('p',{style:{color:'#fde68a',margin:'8px 0 0'}},t('stem.titration.transfer_record_stale','The received mass changed after rinsing. Record the transfer again to update this result.')),
          current&&h('button',{type:'button',onClick:function(){props.onSelect('volumetric-flask');},className:'focus-visible:ring-2 focus-visible:ring-emerald-300',style:{minHeight:44,padding:'8px 12px',marginTop:10,border:'1px solid #71a895',borderRadius:9,background:'#194a40',color:'#d1fae5',fontSize:12}},t('stem.titration.transfer_continue','Continue to solution preparation'))))),
    h('p',{style:{fontSize:11,lineHeight:1.6,color:'#bdd3e1',margin:'16px 0 0'}},t('stem.titration.transfer_model_note','Illustrative model: no spills, masses rounded to 0.0001 g, and a complete rinse in one action. In a real procedure, use compatible solvent and rinse as directed; one rinse is not a guarantee of complete transfer.')),
    h('p',{style:{fontSize:11,lineHeight:1.6,color:'#bdd3e1',margin:'6px 0 0'}},t('stem.titration.transfer_preparation_note','Dissolve the solid and transfer it with its rinsings before making up the final solution volume. This exercise does not change the live titration or its notebook.')));
}

function TitrationPreparationSample(props) {
  var h=props.React.createElement,t=props.t,s=titrationTransferState(props.state);
  if(s.recordedPhase===null)return null;
  var current=s.recordedPhase===s.phase,m=titrationTransferMass(s,s.recordedPhase);
  return h('aside',{'data-titration-preparation-sample':true,'aria-label':t('stem.titration.transfer_preparation_record','Transfer record for preparation'),style:{padding:16,border:'1px solid '+(current?'#579a86':'#aa955f'),borderRadius:12,background:'#123632',color:'#d9f4e9'}},
    h('h4',{style:{margin:'0 0 8px',fontSize:15}},t('stem.titration.transfer_preparation_record','Transfer record for preparation')),
    current?h('div',null,
      h('strong',{style:{display:'block',fontSize:20,fontVariantNumeric:'tabular-nums'}},t('stem.titration.transfer_delivered_mass','Delivered solid mass')+': '+(m.received/10000).toFixed(4)+' g'),
      h('p',{style:{fontSize:12,lineHeight:1.6,margin:'8px 0'}},t('stem.titration.transfer_use_delivered','Use the mass that reached the receiver when calculating concentration. It can differ from the original weighed mass.'))):
      h('p',{style:{fontSize:12,lineHeight:1.6,color:'#fde68a'}},t('stem.titration.transfer_update_before_prepare','The transfer changed after recording. Update its record before using a mass for solution preparation.')),
    h('button',{type:'button',onClick:function(){props.onSelect('weighing-boat');},className:'focus-visible:ring-2 focus-visible:ring-emerald-300',style:{minHeight:44,padding:'8px 12px',border:'1px solid #74aa99',borderRadius:9,background:'#184a40',color:'#d1fae5',fontSize:12}},t('stem.titration.transfer_review','Review transfer')));
}

function TitrationPreparationIllustration(props) {
  var h=props.React.createElement,s=titrationPreparationState(props.state),id=props.id,t=props.t;
  var filled=s.phase==='filling'||s.phase==='mixed',complete=s.phase==='mixed';
  var difference=10000-s.volumeUnits;
  // Deliberately exaggerate near-mark differences in the labeled teaching close-up.
  var zoomOffset=difference===0?0:(difference>0?1:-1)*Math.min(difference>0?70:29,4*Math.sqrt(Math.abs(difference)));
  var enlarged=props.closeup&&filled,y=filled?145-(s.volumeUnits-9500)*0.12:235,zoomY=filled?114+zoomOffset:230;
  var outline='M126 37 V129 C75 153 65 232 113 245 H183 C231 232 221 153 170 129 V37 Z';
  return h('svg',{viewBox:props.closeup&&filled?'260 38 190 235':'0 0 460 290',width:'100%','aria-hidden':true,focusable:false,'data-preparation-diagram':s.phase,'data-preparation-view':props.closeup&&filled?'meniscus':'flask',style:{display:'block',maxHeight:360}},
    h('defs',null,h('clipPath',{id:id+'-flask'},h('path',{d:outline})),
      h('linearGradient',{id:id+'-glass',x1:0,y1:0,x2:1,y2:0},h('stop',{offset:0,stopColor:'#d9f4ff',stopOpacity:0.23}),h('stop',{offset:0.5,stopColor:'#d9f4ff',stopOpacity:0.02}),h('stop',{offset:1,stopColor:'#d9f4ff',stopOpacity:0.18}))),
    !enlarged&&h('ellipse',{cx:230,cy:147,rx:217,ry:131,fill:'#102e43'}),
    !enlarged&&h('path',{d:'M23 259 H439',stroke:'#446d86'}),h('ellipse',{cx:148,cy:254,rx:70,ry:7,fill:'#031422'}),
    filled&&h('path',{d:'M68 '+(y-7)+' Q148 '+(y+7)+' 230 '+(y-7)+' V252 H68 Z',clipPath:'url(#'+id+'-flask)',fill:'#38bdf8',fillOpacity:0.35,stroke:'#a5eaf7',strokeWidth:2}),
    h('path',{d:outline,fill:'url(#'+id+'-glass)',stroke:'#bbdfef',strokeWidth:2.5}),h('ellipse',{cx:148,cy:37,rx:22,ry:5,fill:'#0d2333',stroke:'#caeafa',strokeWidth:2}),
    h('path',{d:'M136 48 V127 M106 171 Q92 208 110 226',fill:'none',stroke:'#f0f9ff',strokeWidth:4,opacity:0.6,strokeLinecap:'round'}),
    h('path',{d:'M120 85 H176',stroke:'#fda4af',strokeWidth:3}),
    h('text',{x:148,y:207,textAnchor:'middle',fill:'#e0f2fe',fontSize:17,fontWeight:700},'100 mL'),
    complete&&h('g',null,h('path',{d:'M120 22 H176 L167 39 H129 Z',fill:'#d9e9f2',stroke:'#a7c9dc',strokeWidth:2}),h('path',{d:'M68 133 Q38 181 64 219 M53 213 L65 221 L68 206',stroke:'#6ee7b7',strokeWidth:3,fill:'none'})),
    !filled&&h('g',null,h('path',{d:'M288 170 V222 Q326 238 364 222 V170',fill:'url(#'+id+'-glass)',stroke:'#bddcec',strokeWidth:2}),h('ellipse',{cx:326,cy:170,rx:38,ry:9,fill:'none',stroke:'#bddcec',strokeWidth:2}),
      s.phase==='dissolved'&&h('path',{d:'M291 198 Q326 209 361 198 V220 Q326 234 291 220 Z',fill:'#38bdf8',fillOpacity:0.35}),
      s.phase==='received'&&s.sourceUnits!==null&&Array.from({length:13},function(_,i){return h('circle',{key:i,cx:305+(i*13%41),cy:217+(i*7%10),r:2.7,fill:'#fde68a'});}),
      h('text',{x:326,y:151,textAnchor:'middle',fill:'#c9e4f2',fontSize:12},s.phase==='dissolved'?t('stem.titration.preparation_dissolved','Dissolved sample'):t('stem.titration.preparation_receiver','Sample receiver'))),
    filled&&h('g',null,
      !enlarged&&h('path',{d:'M180 85 L265 57 M181 91 L265 227',stroke:'#527e98',strokeWidth:1,strokeDasharray:'4 5'}),
      h('rect',{x:266,y:44,width:179,height:196,rx:14,fill:'#081d2c',stroke:'#668ea5',strokeWidth:1.5}),
      h('text',{x:355,y:64,textAnchor:'middle',fill:'#c9e4f2',fontSize:11},t('stem.titration.preparation_neck','Meniscus close-up')),
      h('path',{d:'M288 76 V222 H350 V76',fill:'url(#'+id+'-glass)',stroke:'#bbdfef',strokeWidth:2}),
      h('path',{d:'M290 '+(zoomY-9)+' Q319 '+(zoomY+9)+' 348 '+(zoomY-9)+' V221 H290 Z',fill:'#38bdf8',fillOpacity:0.4,stroke:'#a5eaf7',strokeWidth:2}),
      h('path',{d:'M280 114 H356',stroke:'#fda4af',strokeWidth:2.5}),
      h('path',{d:s.eyeLevel?'M353 114 H381':'M352 103 L381 85',stroke:s.eyeLevel?'#6ee7b7':'#fde68a',strokeWidth:1.5,strokeDasharray:'4 4'}),
      h('g',{'data-preparation-eye':s.eyeLevel?'level':'above',transform:'translate(0 '+(s.eyeLevel?0:-29)+')'},h('path',{d:'M382 114 Q400 94 421 114 Q400 134 382 114 Z',fill:'none',stroke:s.eyeLevel?'#6ee7b7':'#fde68a',strokeWidth:2}),h('circle',{cx:401,cy:114,r:5,fill:s.eyeLevel?'#6ee7b7':'#fde68a'})),
      h('text',{x:355,y:263,textAnchor:'middle',fill:'#c9e4f2',fontSize:11},t('stem.titration.preparation_schematic','Schematic view'))));
}
function TitrationPreparationPractice(props) {
  var React=props.React,h=React.createElement,t=props.t,id=React.useId(),s=titrationPreparationState(props.state),latest=titrationPreparationSource(props.transfer),result=titrationPreparationResult(s);
  var zoomState=React.useState(false),neckOnly=zoomState[0],setNeckOnly=zoomState[1];
  var filling=s.phase==='filling',over=s.volumeUnits>10000,atMark=s.volumeUnits===10000;
  var next=s.sourceUnits===null?t('stem.titration.preparation_next_load','Use a current transfer record to begin preparing a solution.'):s.phase==='received'?t('stem.titration.preparation_next_dissolve','Dissolve the delivered sample in a suitable portion of solvent before making up the final volume.'):s.phase==='dissolved'?t('stem.titration.preparation_next_transfer','Transfer the solution and all receiver and funnel rinsings into the volumetric flask. Keep below the mark.'):over?t('stem.titration.preparation_next_over','The meniscus is above the mark. Restart this practice preparation; removing mixed solution does not restore the intended concentration.'):result?t('stem.titration.preparation_next_done','Preparation recorded. Use the delivered mass and final solution volume to calculate mass concentration.'):!s.eyeLevel?t('stem.titration.preparation_next_eye','Align your eye with the mark, then bring the bottom of the clear meniscus to it.'):atMark?t('stem.titration.preparation_next_mix','The bottom of the meniscus meets the mark. Stopper securely and mix by repeated inversion.'):t('stem.titration.preparation_next_fill','Add solvent carefully. Switch to the smaller model additions near the mark.');
  function button(label,type,disabled,units) {return h('button',{type:'button',disabled:!!disabled,onClick:function(){props.onAction({type:type,units:units});},className:'focus-visible:ring-2 focus-visible:ring-cyan-200',style:{minHeight:44,padding:'9px 12px',borderRadius:9,border:'1px solid '+(disabled?'#466175':'#83b5c7'),background:disabled?'#172e40':'#174858',color:disabled?'#a3b8c7':'#e2f8ff',fontSize:12,cursor:disabled?'not-allowed':'pointer'}},label);}
  var phaseText=s.phase==='received'?t('stem.titration.preparation_phase_received','1 · Dissolve'):s.phase==='dissolved'?t('stem.titration.preparation_phase_dissolved','2 · Transfer and rinse'):s.phase==='mixed'?t('stem.titration.preparation_phase_mixed','4 · Mixed and recorded'):t('stem.titration.preparation_phase_filling','3 · Make to the mark');
  return h('section',{'data-titration-preparation-practice':true,'aria-labelledby':id+'-title',style:{padding:16,border:'1px solid #628aa0',borderRadius:16,background:'#0a2232'}},
    h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}},h('div',null,h('p',{style:{margin:'0 0 5px',fontSize:11,fontWeight:700,color:'#a5f3fc',letterSpacing:'0.06em'}},t('stem.titration.preparation_badge','MAKE TO VOLUME')),h('h4',{id:id+'-title',style:{margin:0,fontSize:20,color:'#eff9ff'}},t('stem.titration.preparation_title','Prepare a 100 mL solution'))),button(t('stem.titration.preparation_restart','Restart preparation'),'restart',s.sourceUnits===null)),
    h('p',{style:{fontSize:12,lineHeight:1.6,color:'#c5dfed'}},t('stem.titration.preparation_intro','Practice the order of preparation and learn why the final solution volume matters. This trial keeps a copy of your delivered sample mass.')),
    h('div',{style:{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center',padding:12,margin:'12px 0 16px',borderRadius:10,border:'1px solid #52758a',background:'#103347'}},
      button(t('stem.titration.preparation_load','Use delivered sample'),'load',latest===null),
      h('button',{type:'button',onClick:function(){props.onSelect('weighing-boat');},className:'focus-visible:ring-2 focus-visible:ring-cyan-200',style:{minHeight:44,padding:'9px 12px',borderRadius:9,border:'1px solid #83b5c7',background:'#174858',color:'#e2f8ff',fontSize:12}},t('stem.titration.preparation_back','Back to sample transfer')),
      h('p',{'data-preparation-source':true,style:{margin:0,fontSize:12,color:'#d7eefa',flex:'1 1 180px'}},latest===null?t('stem.titration.preparation_no_source','A current recorded transfer is needed to load a sample.'):t('stem.titration.preparation_available','Available delivered mass')+': '+(latest/10000).toFixed(4)+' g')),
    s.sourceUnits!==null&&h('p',{style:{fontSize:11,lineHeight:1.6,color:s.sourceUnits===latest?'#bed8e8':'#fde68a'}},s.sourceUnits===latest?t('stem.titration.preparation_reload_note','Loading again starts a new preparation. Navigating between equipment keeps this trial.'):t('stem.titration.preparation_source_changed','The transfer record has changed or is unavailable. This preparation still uses its original delivered mass.')),
    h('div',{style:{display:'flex',flexWrap:'wrap',alignItems:'flex-start',gap:18}},
      h('div',{style:{flex:'1.1 1 270px',minWidth:0}},
        h('figure',{style:{margin:0,border:'1px solid #547b92',borderRadius:12,background:'#071a28',overflow:'hidden'}},h(TitrationPreparationIllustration,{React:React,t:t,state:s,id:id,closeup:neckOnly}),h('figcaption',{style:{fontSize:12,color:'#c9e9fa',padding:'0 12px 12px',textAlign:'center'}},s.sourceUnits===null?t('stem.titration.preparation_empty','Load a delivered sample to begin'):phaseText)),
        (filling||result)&&h('button',{type:'button','aria-pressed':neckOnly,onClick:function(){setNeckOnly(!neckOnly);},className:'focus-visible:ring-2 focus-visible:ring-cyan-200',style:{minHeight:44,marginTop:10,padding:'9px 12px',border:'1px solid #83b5c7',borderRadius:9,background:neckOnly?'#c5f5ff':'#174858',color:neckOnly?'#07313d':'#e2f8ff',fontSize:12}},t('stem.titration.preparation_zoom','Enlarge meniscus')),
        h('dl',{'aria-live':'polite','aria-atomic':true,style:{display:'flex',flexWrap:'wrap',gap:8,margin:'12px 0'}},[
          [t('stem.titration.preparation_sample_mass','Sample mass'),s.sourceUnits===null?'—':(s.sourceUnits/10000).toFixed(4)+' g','mass'],
          [t('stem.titration.preparation_model_volume','Model flask volume'),s.volumeUnits?(s.volumeUnits/100).toFixed(2)+' mL':'—','volume']
        ].map(function(item){return h('div',{key:item[2],style:{flex:'1 1 130px',padding:12,border:'1px solid #52788f',borderRadius:10,background:'#102e41'}},h('dt',{style:{fontSize:11,color:'#c4ddea'}},item[0]),h('dd',{'data-preparation-reading':item[2],style:{margin:'6px 0 0',fontSize:19,color:'#edfaff',fontVariantNumeric:'tabular-nums'}},item[1]));})),
        h('p',{style:{fontSize:11,color:'#bdd8e8',lineHeight:1.6}},t('stem.titration.preparation_volume_note','The close-up exaggerates small differences from the mark. The extra volume readout is a teaching aid; a real flask has one calibration mark, not a graduated scale.'))),
      h('div',{style:{flex:'1 1 250px',minWidth:0}},
        h('p',{id:id+'-next','aria-live':'polite','data-preparation-next':true,style:{margin:'0 0 14px',padding:12,borderLeft:'3px solid '+(over?'#fde68a':'#67e8f9'),borderRadius:6,background:over?'#403719':'#123b48',color:over?'#fef3c7':'#d4f7ff',fontSize:13,lineHeight:1.6}},next),
        h('div',{role:'group','aria-label':t('stem.titration.preparation_actions','Solution preparation actions'),'aria-describedby':id+'-next',style:{display:'flex',flexWrap:'wrap',gap:8}},
          button(t('stem.titration.preparation_dissolve','Dissolve the sample'),'dissolve',s.sourceUnits===null||s.phase!=='received'),
          button(t('stem.titration.preparation_transfer','Transfer solution and rinsings'),'transfer',s.phase!=='dissolved'),
          button(t('stem.titration.preparation_align','Align eye with the mark'),'eye',!filling||s.eyeLevel||over),
          button(t('stem.titration.preparation_coarse','Add 1.00 mL (model)'),'add',!filling||over,100),
          button(t('stem.titration.preparation_fine','Add 0.05 mL (model)'),'add',!filling||over,5),
          button(t('stem.titration.preparation_mix','Stopper and mix'),'mix',!filling||!atMark||!s.eyeLevel)),
        filling&&h('p',{'data-preparation-level':true,style:{fontSize:13,color:over?'#fde68a':atMark?'#a7f3d0':'#bae6fd',lineHeight:1.6,margin:'14px 0'}},over?t('stem.titration.preparation_above','Above the mark — preparation needs restarting.'):atMark?t('stem.titration.preparation_at','At the mark — stop adding solvent.'):t('stem.titration.preparation_below','Below the mark — more solvent is needed.')),
        result&&h('div',{'data-preparation-result':true,style:{padding:14,marginTop:16,border:'1px solid #67a98e',borderRadius:12,background:'#123d32',color:'#d1fae5'}},
          h('h5',{style:{margin:'0 0 10px',fontSize:15}},t('stem.titration.preparation_recorded','Prepared solution record')),
          h('p',{style:{fontSize:12,margin:'0 0 6px'}},t('stem.titration.preparation_concentration','Mass concentration')),
          h('strong',{style:{fontSize:25,fontVariantNumeric:'tabular-nums'}},result.gramsPerLiter.toFixed(3)+' g/L'),
          h('p',{style:{fontSize:12,lineHeight:1.6}},result.massGrams.toFixed(4)+' g ÷ 0.10000 L = '+result.gramsPerLiter.toFixed(3)+' g/L'),
          h('p',{style:{fontSize:11,lineHeight:1.6,marginBottom:0}},t('stem.titration.preparation_mass_not_molar','This is mass per solution volume. Molar concentration also requires the solute’s molar mass.')),
          h('button',{type:'button',onClick:function(){props.onSelect('pipette');},className:'focus-visible:ring-2 focus-visible:ring-cyan-200',style:{minHeight:44,padding:'9px 12px',marginTop:12,border:'1px solid #8bc5b0',borderRadius:9,background:'#194b3f',color:'#d1fae5',fontSize:12}},t('stem.titration.aliquot_continue','Practice a 25 mL aliquot'))))),
    h('p',{style:{fontSize:11,lineHeight:1.6,color:'#bfd9e8',margin:'16px 0 0'}},t('stem.titration.preparation_model_note','Illustrative model: the sample dissolves completely, transfer with rinsings is complete, and the flask starts at 95.00 mL. Fixed additions, liquid heights, and mixing in one action are simplified. Real drop sizes, solubility, temperature, and mixing requirements depend on the procedure.')),
    h('p',{style:{fontSize:11,lineHeight:1.6,color:'#bfd9e8',margin:'8px 0 0'}},t('stem.titration.preparation_method_note','Follow the reviewed procedure and the flask’s calibration temperature. Make up to the final solution volume, not by adding 100 mL of solvent. These practice results do not change the live titration.')));
}

function titrationAliquotEquipment(t) {
  return {id:'pipette',name:t('stem.titration.volumetric_pipette','Volumetric Pipette'),icon:'\uD83E\uDDEA',
    desc:t('stem.titration.aliquot_equip_desc','Transfer one calibrated volume of solution.'),
    technique:t('stem.titration.aliquot_equip_technique','This exercise uses a 25 mL non-blow-out volumetric pipette. Condition it with the solution, fill above the mark with a filler, set the meniscus at eye level, and deliver vertically against the receiving wall. Follow the specified drain and waiting times; leave retained tip liquid in place.'),
    errors:[t('stem.titration.aliquot_equip_error1','Skipping solution conditioning or setting the meniscus from the wrong viewing height.'),t('stem.titration.aliquot_equip_error2','Forcing retained liquid out of this non-blow-out pipette or ignoring its drain instructions.')],
    safetyNote:t('stem.titration.aliquot_equip_safety','Never mouth pipette. Use a compatible filler and support the glass near its top when fitting it. Other pipette types have different delivery instructions; check their markings.')};
}
function TitrationAliquotIllustration(props) {
  var h=props.React.createElement,t=props.t,s=titrationAliquotState(props.state),id=props.id;
  var transfer=['adjusted','delivered','blown'].indexOf(s.phase)!==-1,delivered=s.phase==='delivered'||s.phase==='blown',loaded=s.phase==='filled'||s.phase==='adjusted';
  var px=transfer?(s.atWall?363:329):123,top=s.phase==='filled'?67:84.5,detail=props.closeup;
  var outline='M'+(px-4)+' 51 V117 C'+(px-28)+' 125 '+(px-28)+' 169 '+(px-4)+' 177 L'+(px-2)+' 242 L'+(px+2)+' 242 L'+(px+4)+' 177 C'+(px+28)+' 169 '+(px+28)+' 125 '+(px+4)+' 117 V51 Z';
  return h('svg',{viewBox:detail?'202 14 202 125':'0 0 460 320',width:'100%','aria-hidden':true,focusable:false,'data-aliquot-diagram':s.phase,'data-aliquot-view':detail?'detail':'bench',style:{display:'block',maxHeight:375}},
    h('defs',null,h('linearGradient',{id:id+'-glass',x1:0,y1:0,x2:1,y2:0},h('stop',{offset:0,stopColor:'#c4ebfa',stopOpacity:0.23}),h('stop',{offset:0.5,stopColor:'#d1f4ff',stopOpacity:0.03}),h('stop',{offset:1,stopColor:'#c4ebfa',stopOpacity:0.19})),h('clipPath',{id:id+'-pipette'},h('path',{d:outline}))),
    !detail&&h('g',null,
      h('ellipse',{cx:230,cy:170,rx:215,ry:140,fill:'#102e43'}),h('path',{d:'M24 292 H436',stroke:'#4d7892'}),
      h('ellipse',{cx:123,cy:283,rx:64,ry:8,fill:'#031322'}),h('ellipse',{cx:329,cy:283,rx:61,ry:8,fill:'#031322'}),
      h('path',{d:'M72 212 Q123 225 174 212 V267 Q123 288 72 267 Z',fill:'#38bdf8',fillOpacity:s.sourceUnits?0.3:0}),
      h('path',{d:'M68 184 V269 Q123 291 178 269 V184',fill:'url(#'+id+'-glass)',stroke:'#bddff0',strokeWidth:2}),h('ellipse',{cx:123,cy:184,rx:55,ry:11,fill:'none',stroke:'#bddff0',strokeWidth:2}),
      h('path',{d:'M213 238 V272 Q237 283 261 272 V238',fill:'url(#'+id+'-glass)',stroke:'#bddff0',strokeWidth:1.5}),h('ellipse',{cx:237,cy:238,rx:24,ry:5,fill:'none',stroke:'#bddff0',strokeWidth:1.5}),
      s.sourceUnits!==null&&s.phase!=='ready'&&h('path',{d:'M216 260 Q237 268 258 260 V271 Q237 280 216 271 Z',fill:'#38bdf8',fillOpacity:0.3}),
      h('text',{x:237,y:312,textAnchor:'middle',fill:'#cce9f7',fontSize:11},t('stem.titration.aliquot_waste','Rinse waste')),
      h('path',{d:'M292 201 V265 Q329 283 366 265 V201',fill:'url(#'+id+'-glass)',stroke:'#bddff0',strokeWidth:2}),h('ellipse',{cx:329,cy:201,rx:37,ry:7,fill:'none',stroke:'#bddff0',strokeWidth:2}),
      delivered&&h('path',{d:'M295 246 Q329 256 363 246 V264 Q329 280 295 264 Z',fill:'#38bdf8',fillOpacity:0.4,stroke:'#99def5',strokeWidth:1.5}),
      loaded&&h('path',{d:'M'+(px-35)+' '+top+' Q'+px+' '+(top+7)+' '+(px+35)+' '+top+' V244 H'+(px-35)+' Z',clipPath:'url(#'+id+'-pipette)',fill:'#38bdf8',fillOpacity:0.65}),
      h('path',{d:outline,fill:'url(#'+id+'-glass)',stroke:'#d3eafa',strokeWidth:2}),h('path',{d:'M'+(px-12)+' 88 H'+(px+12),stroke:'#fda4af',strokeWidth:2.5}),
      h('path',{d:'M'+(px-12)+' 49 V37 C'+(px-29)+' 11 '+(px+29)+' 11 '+(px+12)+' 37 V49 Z',fill:'#197168',stroke:'#83d6c2',strokeWidth:2}),
      s.phase==='delivered'&&h('path',{'data-aliquot-retained':true,d:'M'+(px-2)+' 229 Q'+px+' 225 '+(px+2)+' 229 V238 Q'+px+' 242 '+(px-2)+' 238 Z',fill:'#7dd3fc'}),
      s.atWall&&h('circle',{cx:px,cy:239,r:13,fill:'none',stroke:s.phase==='blown'?'#fde68a':'#6ee7b7',strokeWidth:1.5,strokeDasharray:'3 4'}),
      h('text',{x:123,y:312,textAnchor:'middle',fill:'#cce9f7',fontSize:12},t('stem.titration.aliquot_working','Working solution')),
      h('text',{x:329,y:312,textAnchor:'middle',fill:'#cce9f7',fontSize:12},t('stem.titration.aliquot_receiver','Aliquot receiver'))),
    h('g',{transform:!detail&&transfer?'translate(-177 0)':undefined},h('rect',{x:207,y:18,width:190,height:116,rx:12,fill:'#071c2b',stroke:'#6e98af',strokeWidth:1.5}),
      delivered?h('g',null,
        h('path',{d:'M246 31 V80 L253 111 L260 80 V31',fill:'url(#'+id+'-glass)',stroke:'#c9e8f5',strokeWidth:2}),
        s.phase==='delivered'&&h('path',{d:'M250 89 Q253 85 256 89 L254 107 H252 Z',fill:'#7dd3fc'}),
        h('path',{d:s.phase==='blown'?'M250 108 L245 120 M257 109 L264 122':'M264 100 H279',stroke:s.phase==='blown'?'#fde68a':'#7dd3fc',strokeWidth:2}),
        h('text',{x:292,y:58,fill:'#cfe8f5',fontSize:11},t('stem.titration.aliquot_tip_detail','Tip detail')),
        h('text',{x:292,y:84,fill:s.phase==='blown'?'#fde68a':'#a7f3d0',fontSize:11},s.phase==='blown'?t('stem.titration.aliquot_tip_forced','Liquid forced out'):t('stem.titration.aliquot_tip_retained','Liquid retained'))):h('g',null,
        h('path',{d:'M231 32 V120 H278 V32',fill:'url(#'+id+'-glass)',stroke:'#c9e8f5',strokeWidth:2}),
        loaded&&h('path',{d:'M233 '+(s.phase==='filled'?50:77)+' Q254 '+(s.phase==='filled'?66:93)+' 276 '+(s.phase==='filled'?50:77)+' V119 H233 Z',fill:'#38bdf8',fillOpacity:0.4,stroke:'#a5e8fa',strokeWidth:1.5}),
        h('path',{d:'M225 85 H285',stroke:'#fda4af',strokeWidth:2}),
        h('path',{d:s.eyeLevel?'M286 85 H320':'M286 75 L320 61',stroke:s.eyeLevel?'#6ee7b7':'#fde68a',strokeDasharray:'4 4',strokeWidth:1.5}),
        h('g',{'data-aliquot-eye':s.eyeLevel?'level':'above',transform:'translate(0 '+(s.eyeLevel?0:-24)+')'},h('path',{d:'M322 85 Q340 66 359 85 Q340 104 322 85 Z',fill:'none',stroke:s.eyeLevel?'#6ee7b7':'#fde68a',strokeWidth:2}),h('circle',{cx:340,cy:85,r:4,fill:s.eyeLevel?'#6ee7b7':'#fde68a'})),
        h('text',{x:303,y:123,textAnchor:'middle',fill:'#cde8f6',fontSize:10},t('stem.titration.aliquot_mark_detail','Set the lower meniscus at the mark')))));
}
function TitrationAliquotPractice(props) {
  var React=props.React,h=React.createElement,t=props.t,id=React.useId(),s=titrationAliquotState(props.state),latest=titrationAliquotSource(props.preparation),r=titrationAliquotResult(s);
  var zoom=React.useState(false),detail=zoom[0],setDetail=zoom[1],delivered=s.phase==='delivered',blown=s.phase==='blown';
  var stepsView=React.useState(false),allSteps=stepsView[0],setAllSteps=stepsView[1],actionsRef=React.useRef(null),resultRef=React.useRef(null),guidanceRef=React.useRef(null),focusNext=React.useRef(false);
  React.useEffect(function(){if(!focusNext.current)return;focusNext.current=false;var target=actionsRef.current&&actionsRef.current.querySelector('button:not([disabled])');if(!target)target=resultRef.current||guidanceRef.current;if(target)target.focus();},[s.phase,s.eyeLevel,s.atWall,s.recorded,allSteps]);
  var next=s.sourceUnits===null?t('stem.titration.aliquot_next_load','Finish and mix a preparation, then load its solution to begin.'):s.phase==='ready'?t('stem.titration.aliquot_next_condition','Condition a clean pipette with a small working portion of the solution. Collect the rinse as waste; do not return it to the stock.'):s.phase==='conditioned'?t('stem.titration.aliquot_next_fill','Use the fitted pipette filler to draw solution above the mark. Keep liquid out of the filler.'):s.phase==='filled'?!s.eyeLevel?t('stem.titration.aliquot_next_eye','Keep the pipette vertical and bring your eye level with its calibration mark.'):t('stem.titration.aliquot_next_adjust','Release excess solution to a suitable waste receiver until the bottom of the meniscus meets the mark.'):s.phase==='adjusted'?!s.atWall?t('stem.titration.aliquot_next_wall','Move to the receiving vessel. Keep the pipette vertical and place its tip against the inside wall.'):t('stem.titration.aliquot_next_drain','Allow gravity drainage and follow the pipette’s specified waiting time before withdrawing the tip along the wall.'):blown?t('stem.titration.aliquot_next_blown','Forcing out the retained liquid adds more than the calibrated delivery. The actual extra volume is not modeled, so the 25 mL result is no longer valid.'):r?t('stem.titration.aliquot_next_recorded','Aliquot recorded. Taking a well-mixed portion changes the amount of solute, while its concentration stays the same.'):t('stem.titration.aliquot_next_record','The calibrated delivery is complete. Leave the retained tip liquid in this non-blow-out pipette and record the aliquot.');
  function button(label,type,disabled,caution){var isStep=['condition','fill','eye','adjust','wall','drain','record'].indexOf(type)!==-1;if(isStep&&!allSteps&&disabled)return null;return h('button',{type:'button',disabled:!!disabled,onClick:function(){if((isStep&&!allSteps)||type==='blow'||(type==='restart'&&blown))focusNext.current=true;props.onAction({type:type});},className:'focus-visible:ring-2 focus-visible:ring-cyan-200',style:{minHeight:44,padding:'9px 12px',border:'1px solid '+(disabled?'#4c6577':caution?'#d5b571':'#7cacc1'),borderRadius:9,background:disabled?'#162e40':caution?'#493b1b':'#15475a',color:disabled?'#a3b9c9':caution?'#fef3c7':'#e0f5ff',fontSize:12,cursor:disabled?'not-allowed':'pointer'}},label);}
  function link(label,target){return h('button',{type:'button',onClick:function(){props.onSelect(target);},className:'focus-visible:ring-2 focus-visible:ring-cyan-200',style:{minHeight:44,padding:'9px 12px',border:'1px solid #7cacc1',borderRadius:9,background:'#15475a',color:'#e0f5ff',fontSize:12}},label);}
  var phase=s.phase==='ready'?t('stem.titration.aliquot_phase_ready','1 · Condition'):s.phase==='conditioned'?t('stem.titration.aliquot_phase_conditioned','2 · Fill with a filler'):s.phase==='filled'?t('stem.titration.aliquot_phase_filled','3 · Set the meniscus'):s.phase==='adjusted'?t('stem.titration.aliquot_phase_adjusted','4 · Deliver by gravity'):blown?t('stem.titration.aliquot_phase_blown','Delivery needs restarting'):r?t('stem.titration.aliquot_result','Recorded aliquot'):t('stem.titration.aliquot_phase_delivered','5 · Leave the tip liquid and record');
  return h('section',{'data-titration-aliquot-practice':true,onKeyDown:function(e){if(e.key==='Escape'){e.stopPropagation();props.onClose();}},'aria-labelledby':id+'-title',style:{padding:16,border:'1px solid #628ba2',borderRadius:16,background:'#0a2232'}},
    h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}},h('div',null,h('p',{style:{fontSize:11,letterSpacing:'0.06em',fontWeight:700,margin:'0 0 5px',color:'#a5f3fc'}},t('stem.titration.aliquot_badge','TAKE A MEASURED PORTION')),h('h4',{id:id+'-title',style:{margin:0,fontSize:20,color:'#edfaff'}},t('stem.titration.aliquot_title','Deliver a 25 mL aliquot'))),button(t('stem.titration.aliquot_restart','Restart pipetting'),'restart',s.sourceUnits===null)),
    h('p',{style:{fontSize:12,lineHeight:1.6,color:'#c5dfea'}},t('stem.titration.aliquot_intro','Practise with a standard non-blow-out volumetric pipette calibrated to deliver 25 mL. An aliquot is a measured portion of a well-mixed solution.')),
    h('div',{style:{display:'flex',alignItems:'center',flexWrap:'wrap',gap:8,padding:12,border:'1px solid #547d94',borderRadius:10,background:'#123447',margin:'12px 0'}},button(t('stem.titration.aliquot_load','Use prepared solution'),'load',latest===null),link(t('stem.titration.aliquot_back','Back to preparation'),'volumetric-flask'),
      h('p',{'data-aliquot-source':true,style:{flex:'1 1 170px',fontSize:12,margin:0,color:'#d5edf8'}},latest===null?t('stem.titration.aliquot_no_source','A completed, mixed preparation is needed.'):t('stem.titration.aliquot_available','Prepared concentration')+': '+(latest/1000).toFixed(3)+' g/L')),
    s.sourceUnits!==null&&h('p',{style:{fontSize:11,lineHeight:1.6,color:latest===s.sourceUnits?'#bed8e8':'#fde68a'}},latest===s.sourceUnits?t('stem.titration.aliquot_snapshot_note','This exercise uses a copy of the prepared solution. Loading again starts a new pipetting trial.'):t('stem.titration.aliquot_source_changed','The preparation has changed or is unavailable. This trial keeps its original concentration until you load again.')),
    h('div',{style:{display:'flex',flexWrap:'wrap',gap:18,alignItems:'flex-start'}},
      h('div',{style:{flex:'1.1 1 270px',minWidth:0}},
        h('figure',{style:{margin:0,border:'1px solid #567e95',borderRadius:12,overflow:'hidden',background:'#071a28'}},h(TitrationAliquotIllustration,{React:React,t:t,state:s,id:id,closeup:detail}),h('figcaption',{style:{fontSize:12,color:'#c6e8f8',padding:'8px 12px 12px',textAlign:'center'}},s.sourceUnits===null?t('stem.titration.aliquot_empty','Load a prepared solution to begin'):phase)),
        h('button',{type:'button','aria-pressed':detail,onClick:function(){setDetail(!detail);},className:'focus-visible:ring-2 focus-visible:ring-cyan-200',style:{minHeight:44,marginTop:10,padding:'9px 12px',border:'1px solid #7cacc1',borderRadius:9,background:detail?'#c5f5ff':'#15475a',color:detail?'#07313d':'#e0f5ff',fontSize:12}},t('stem.titration.aliquot_zoom','Enlarge technique detail')),
        h('dl',{'aria-live':'polite','aria-atomic':true,style:{display:'flex',flexWrap:'wrap',gap:8,margin:'12px 0'}},[[t('stem.titration.aliquot_working_c','Working concentration'),s.sourceUnits===null?'—':(s.sourceUnits/1000).toFixed(3)+' g/L','concentration'],[t('stem.titration.aliquot_delivered','Calibrated delivery'),blown?t('stem.titration.aliquot_invalid','Invalid'):delivered?'25.00 mL':'—','volume']].map(function(item){return h('div',{key:item[2],style:{flex:'1 1 140px',minWidth:0,padding:12,border:'1px solid #54778f',borderRadius:10,background:'#102e41'}},h('dt',{style:{fontSize:11,color:'#c4ddea'}},item[0]),h('dd',{'data-aliquot-reading':item[2],style:{margin:'6px 0 0',fontSize:19,color:'#ecf9ff',fontVariantNumeric:'tabular-nums'}},item[1]));})),
        (delivered||blown)&&h('p',{style:{fontSize:12,lineHeight:1.6,color:blown?'#fde68a':'#c3e9f5'}},blown?t('stem.titration.aliquot_blown_note','Extra liquid was forced into the receiver. Do not use the nominal 25 mL value for this delivery.'):t('stem.titration.aliquot_retained_note','The retained liquid is already accounted for in this pipette’s delivery calibration. Do not subtract it from 25 mL or force it out.'))),
      h('div',{style:{flex:'1 1 250px',minWidth:0}},h('p',{'aria-live':'polite',id:id+'-next',ref:guidanceRef,tabIndex:-1,className:'focus-visible:ring-2 focus-visible:ring-cyan-200','data-aliquot-next':true,style:{padding:12,margin:'0 0 14px',borderLeft:'3px solid '+(blown?'#fde68a':'#67e8f9'),borderRadius:6,background:blown?'#403719':'#123b48',color:blown?'#fef3c7':'#d4f7ff',fontSize:13,lineHeight:1.6}},next),
        blown&&button(t('stem.titration.aliquot_recover','Start over with this solution'),'restart',false),
        h('button',{type:'button','aria-pressed':allSteps,onClick:function(){setAllSteps(!allSteps);},className:'focus-visible:ring-2 focus-visible:ring-cyan-200',style:{minHeight:44,padding:'8px 10px',margin:'10px 0',border:'1px solid #769cb2',borderRadius:9,background:allSteps?'#c5f5ff':'#14374a',color:allSteps?'#07313d':'#d4edf9',fontSize:12}},t('stem.titration.path_show_steps','Show all technique steps')),
        (allSteps||(s.sourceUnits!==null&&!blown&&!r))&&h('div',{ref:actionsRef,role:'group','aria-label':t('stem.titration.aliquot_actions','Aliquot preparation actions'),'aria-describedby':id+'-next',style:{display:'flex',flexWrap:'wrap',gap:8,marginTop:blown?12:0}},
          button(t('stem.titration.aliquot_condition','Condition with solution'),'condition',s.sourceUnits===null||s.phase!=='ready'),
          button(t('stem.titration.aliquot_fill','Fill above the mark'),'fill',s.phase!=='conditioned'),
          button(t('stem.titration.aliquot_eye','Align eye with the mark'),'eye',s.phase!=='filled'||s.eyeLevel),
          button(t('stem.titration.aliquot_adjust','Set the meniscus'),'adjust',s.phase!=='filled'||!s.eyeLevel),
          button(t('stem.titration.aliquot_wall','Place tip against receiver wall'),'wall',s.phase!=='adjusted'||s.atWall),
          button(t('stem.titration.aliquot_drain','Drain and wait (model)'),'drain',s.phase!=='adjusted'||!s.atWall),
          button(t('stem.titration.aliquot_record','Record aliquot'),'record',!delivered||s.recorded)),
        blown&&s.recorded&&h('p',{'data-aliquot-stale':true,style:{fontSize:12,lineHeight:1.6,color:'#fde68a'}},t('stem.titration.aliquot_record_invalid','Your earlier record is no longer valid after blowing out the tip. Restart to record a new aliquot.')),
        r&&h('div',{ref:resultRef,tabIndex:-1,'data-aliquot-result':true,className:'focus-visible:ring-2 focus-visible:ring-cyan-200',style:{padding:14,marginTop:16,border:'1px solid #6aa88e',borderRadius:12,background:'#123d32',color:'#d1fae5'}},h('h5',{style:{fontSize:15,margin:'0 0 10px'}},t('stem.titration.aliquot_result','Recorded aliquot')),
          h('strong',{style:{display:'block',fontSize:22}},'25.00 mL'),h('p',{style:{fontSize:13,lineHeight:1.6}},t('stem.titration.aliquot_same_c','Same concentration as the prepared solution')+': '+r.gramsPerLiter.toFixed(3)+' g/L'),
          h('p',{style:{fontSize:12,lineHeight:1.6}},t('stem.titration.aliquot_solute','Calculated solute mass')+': '+parseFloat(r.massGrams.toFixed(6))+' g'),
          h('p',{style:{fontSize:11,lineHeight:1.6,marginBottom:0}},r.gramsPerLiter.toFixed(3)+' g/L × 0.02500 L = '+parseFloat(r.massGrams.toFixed(6))+' g')),
        delivered&&h('div',{style:{padding:12,marginTop:14,border:'1px solid #9e874e',borderRadius:10,background:'#302d1d'}},h('p',{style:{fontSize:12,lineHeight:1.6,color:'#fef3c7',margin:'0 0 10px'}},t('stem.titration.aliquot_mistake_hint','Explore a technique error: see what happens if the retained liquid is forced out.')),button(t('stem.titration.aliquot_blow','Try blowing out the tip'),'blow',false,true)))),
    h('p',{style:{fontSize:11,lineHeight:1.6,color:'#bed9e8',margin:'16px 0 0'}},t('stem.titration.aliquot_model_note','Illustrative model: conditioning, drainage, and the specified wait each finish in one action. Working-solution use, rinse waste, and retained-liquid volumes are not tracked. Vessel shapes and liquid levels are schematic. The prepared solution and live titration are unchanged.')),
    h('div',{style:{display:'flex',flexWrap:'wrap',gap:8,marginTop:12}},h('button',{type:'button',onClick:props.onClose,className:'focus-visible:ring-2 focus-visible:ring-cyan-200',style:{minHeight:44,padding:'9px 12px',border:'1px solid #7cacc1',borderRadius:9,background:'#15475a',color:'#e0f5ff',fontSize:12}},t('stem.titration.aliquot_close','Back to equipment')),link(t('stem.titration.aliquot_filler_guide','Study the pipette filler'),'pipette-filler'),h('a',{href:'https://chemed.chem.purdue.edu/genchem/lab/equipment/pipet/use.html',target:'_blank',rel:'noopener noreferrer',className:'focus-visible:ring-2 focus-visible:ring-cyan-200',style:{display:'inline-flex',alignItems:'center',minHeight:44,padding:'8px 4px',fontSize:12,color:'#bae6fd',textDecoration:'underline'}},t('stem.titration.aliquot_reference','Pipetting technique reference'))));
}

function titrationAdditionalEquipment(t) {
  var general = 'https://spots.augusta.edu/smyers1/Chemistry2810/GENERALPROCEDURES.html';
  var burette = 'https://www2.chem.wisc.edu/deptfiles/genchem/lab/labdocs/modules/buret/bretfill.htm';
  return [
    { id: 'volumetric-flask', icon: '\u2697', name: t('stem.titration.equip_flask_name', 'Volumetric flask'),
      desc: t('stem.titration.equip_flask_desc', 'Prepare a solution to one calibrated volume.'),
      technique: t('stem.titration.equip_flask_technique', 'A volumetric flask is calibrated to contain its marked volume, not to deliver that volume when poured.'),
      study: [
        { label: t('stem.titration.equip_flask_step1', 'Transfer'), text: t('stem.titration.equip_flask_text1', 'Transfer the dissolved solute and its rinsings into the flask. Keep the liquid below the calibration mark.') },
        { label: t('stem.titration.equip_flask_step2', 'Make to the mark'), text: t('stem.titration.equip_flask_text2', 'At the specified temperature, add solvent dropwise. View the bottom of the clear meniscus at eye level against the single mark.') },
        { label: t('stem.titration.equip_flask_step3', 'Mix'), text: t('stem.titration.equip_flask_text3', 'Stopper securely and invert repeatedly to mix the entire solution before taking an aliquot.') }
      ],
      errors: [t('stem.titration.equip_flask_error', 'Overshooting the mark changes the concentration; removing some mixed solution does not correct it.')],
      safetyNote: t('stem.titration.equip_flask_safety', 'Follow the reviewed preparation procedure; a volumetric flask is not a heating vessel.'), source: general },
    { id: 'pipette-filler', icon: '\u25C9', name: t('stem.titration.equip_filler_name', 'Pipette filler'),
      desc: t('stem.titration.equip_filler_desc', 'Control aspiration without mouth pipetting.'),
      technique: t('stem.titration.equip_filler_technique', 'Use a compatible filler and follow its controls; bulb and lever designs differ.'),
      study: [
        { label: t('stem.titration.equip_filler_step1', 'Fit the filler'), text: t('stem.titration.equip_filler_text1', 'Support the pipette near its top when fitting the filler. Do not force glass into a tight adapter.') },
        { label: t('stem.titration.equip_filler_step2', 'Draw and adjust'), text: t('stem.titration.equip_filler_text2', 'Draw solution above the mark, then adjust the meniscus to it. Keep liquid out of the filler.') },
        { label: t('stem.titration.equip_filler_step3', 'Deliver'), text: t('stem.titration.equip_filler_text3', 'Let a standard volumetric pipette drain by gravity against the receiving wall. Follow its drain time; do not blow out its retained tip liquid.') }
      ],
      errors: [t('stem.titration.equip_filler_error', 'Drawing liquid into the bulb or forcing the final liquid out.')],
      safetyNote: t('stem.titration.equip_filler_safety', 'Never mouth pipette.'), source: 'https://shop.brand.de/media/import/1/27/32406/42485/42534/42546/GA_macro.pdf#page=27' },
    { id: 'funnel', icon: '\u25BD', name: t('stem.titration.equip_funnel_name', 'Filling funnel'),
      desc: t('stem.titration.equip_funnel_desc', 'Fill the burette, then remove the funnel.'),
      technique: t('stem.titration.equip_funnel_technique', 'A funnel is a filling aid; it does not stay in place during a measured titration.'),
      study: [
        { label: t('stem.titration.equip_funnel_step1', 'Prepare'), text: t('stem.titration.equip_funnel_text1', 'Secure the burette, close its stopcock, and place a waste beaker underneath.') },
        { label: t('stem.titration.equip_funnel_step2', 'Fill slowly'), text: t('stem.titration.equip_funnel_text2', 'Allow air to escape around the funnel stem. Watch the burette level and avoid overfilling.') },
        { label: t('stem.titration.equip_funnel_step3', 'Remove'), text: t('stem.titration.equip_funnel_text3', 'Remove the funnel before taking the initial reading. Later drips would change the volume after that reading.') }
      ],
      errors: [t('stem.titration.equip_funnel_error', 'Leaving the funnel in the burette during titration.')],
      safetyNote: t('stem.titration.equip_funnel_safety', 'Fill at a safe working height.'), source: burette },
    { id: 'stand-clamp', icon: '\u22A5', name: t('stem.titration.equip_stand_name', 'Stand and clamp'),
      desc: t('stem.titration.equip_stand_desc', 'Support the burette above the receiving flask.'),
      technique: t('stem.titration.equip_stand_technique', 'Set up a stable support before filling the burette.'),
      study: [
        { label: t('stem.titration.equip_stand_step1', 'Set the base'), text: t('stem.titration.equip_stand_text1', 'Place the stand on a level bench, away from its edge.') },
        { label: t('stem.titration.equip_stand_step2', 'Secure the glass'), text: t('stem.titration.equip_stand_text2', 'Use a suitable burette clamp. Support the glass while adjusting the grip; do not overtighten.') },
        { label: t('stem.titration.equip_stand_step3', 'Align'), text: t('stem.titration.equip_stand_text3', 'Keep the burette vertical, with its tip above the flask opening and room to swirl.') }
      ],
      errors: [t('stem.titration.equip_stand_error', 'Loose grips, unstable bases, or a burette leaning sideways.')],
      safetyNote: t('stem.titration.equip_stand_safety', 'Check the support before adding reagent.'), source: burette },
    { id: 'magnetic-stirrer', icon: '\u27F3', name: t('stem.titration.equip_stirrer_name', 'Magnetic stirrer'),
      desc: t('stem.titration.equip_stirrer_desc', 'Mix evenly with a magnetic stir bar.'),
      technique: t('stem.titration.equip_stirrer_technique', 'Gentle mixing distributes each addition through the analyte. A deep vortex is not the goal.'),
      study: [
        { label: t('stem.titration.equip_stirrer_step1', 'Place the bar'), text: t('stem.titration.equip_stirrer_text1', 'With stirring off, place a clean stir bar in the flask and center it on the plate.') },
        { label: t('stem.titration.equip_stirrer_step2', 'Mix gently'), text: t('stem.titration.equip_stirrer_text2', 'Increase stirring gradually until the solution mixes without splashing. Keep any probe clear of the moving bar.') },
        { label: t('stem.titration.equip_stirrer_step3', 'Finish'), text: t('stem.titration.equip_stirrer_text3', 'Switch stirring off before moving the vessel or recovering the bar. Handle the solution as directed by the lab procedure.') }
      ],
      errors: [t('stem.titration.equip_stirrer_error', 'Excessive speed can cause splashing or make the stir bar lose its smooth rotation.')],
      safetyNote: t('stem.titration.equip_stirrer_safety', 'On a combined hotplate and stirrer, heating is a separate control. Leave it off unless the procedure requires it.'),
      source: 'https://chemed.chem.purdue.edu/genchem/lab/techniques/titration/perform.html' },
    { id: 'ph-electrode', icon: '\u2316', name: t('stem.titration.equip_probe_name', 'pH electrode'),
      desc: t('stem.titration.equip_probe_desc', 'Measure acidity and follow a potentiometric endpoint.'),
      technique: t('stem.titration.equip_probe_technique', 'Use the instructions for the actual electrode and meter. This illustration does not calibrate the simulated pH signal.'),
      study: [
        { label: t('stem.titration.equip_probe_step1', 'Calibrate'), text: t('stem.titration.equip_probe_text1', 'Calibrate with fresh buffer portions spanning the expected pH range. Rinse between buffers; never return used buffer to its bottle.') },
        { label: t('stem.titration.equip_probe_step2', 'Measure'), text: t('stem.titration.equip_probe_text2', 'Immerse the sensing region as specified. Keep the tip clear of the vessel and stir bar, then wait for a stable reading.') },
        { label: t('stem.titration.equip_probe_step3', 'Rinse and store'), text: t('stem.titration.equip_probe_text3', 'Rinse with deionized water and store in the manufacturer-specified solution. Do not use deionized water for long-term storage of this glass pH electrode.') }
      ],
      errors: [t('stem.titration.equip_probe_error', 'Using the electrode to stir, contaminating calibration buffers, or letting the glass bulb dry out.')],
      safetyNote: t('stem.titration.equip_probe_safety', 'The sensing bulb is fragile. Secure the electrode before starting a stirrer.'),
      source: 'https://www.vernier.com/blog/answers-to-the-top-five-questions-about-ph-sensor-care/' }
  ].concat(titrationWeighingEquipment(t));
}

function TitrationEquipmentIllustration(props) {
  var h = props.React.createElement, kind = props.kind, phase = props.phase, uid = props.id;
  if (kind === 'analytical-balance') return h('div',{'data-equipment-diagram':kind,'data-equipment-phase':phase},h(TitrationWeighingIllustration,{React:props.React,id:uid,state:{closed:phase>0,boat:phase>0,tareUnits:phase>0?23456:0,sampleUnits:phase===2?5000:0}}));
  var glass = {fill:'url(#'+uid+'-glass)',stroke:'#b8d8e9',strokeWidth:2};
  function path(d, extra) { return h('path',Object.assign({d:d},glass,extra)); }
  function line(x1,y1,x2,y2,extra) { return h('line',Object.assign({x1:x1,y1:y1,x2:x2,y2:y2,stroke:'#a8c8dc',strokeWidth:2,strokeLinecap:'round'},extra)); }
  function water(d) { return h('path',{d:d,fill:'#38bdf8',fillOpacity:0.38,stroke:'#7dd3fc',strokeWidth:1.5}); }
  function ring(x,y,r) { return h('circle',{cx:x,cy:y,r:r,fill:'none',stroke:'#6ee7b7',strokeWidth:2,strokeDasharray:'4 5'}); }
  function beaker(x,y,w,height,fillLevel) { return h('g',null,
    water('M'+(x+3)+' '+(y+height-fillLevel)+' h'+(w-6)+' v'+(fillLevel-4)+' h-'+(w-6)+' Z'),
    path('M'+x+' '+y+' v'+(height-8)+' q0 8 8 8 h'+(w-16)+' q8 0 8 -8 v-'+(height-8),{fill:'none'}),
    line(x+8,y+10,x+8,y+height-12,{stroke:'#f0f9ff',strokeWidth:3,opacity:0.5})); }
  function tube(x,top,bottom,fillTop) { return h('g',null,
    h('rect',Object.assign({x:x-7,y:top,width:14,height:bottom-top,rx:3},glass)),
    h('rect',{x:x-4,y:fillTop,width:8,height:bottom-fillTop,fill:'#38bdf8',opacity:0.5}),
    Array.from({length:9},function(_,i){return line(x-6,top+15+i*12,x+(i%2?0:4),top+15+i*12,{key:i,stroke:'#d6e7f4',strokeWidth:1});}),
    line(x,bottom,x,bottom+17),line(x-13,bottom+5,x+13,bottom+5,{stroke:'#6ee7b7',strokeWidth:5})); }
  var scene;
  if (kind === 'volumetric-flask') {
    scene = h('g',{transform:phase===2?'rotate(-23 145 148)':undefined},
      phase===2?h('path',{d:'M70 45 L220 109 V240 H70 Z',fill:'#38bdf8',fillOpacity:0.38,stroke:'#7dd3fc',strokeWidth:1.5,clipPath:'url(#'+uid+'-flask)'}):water(phase===0?'M108 144 Q91 195 117 212 H173 Q199 195 182 144 Z':'M137 77 Q145 83 153 77 L153 117 Q194 141 193 181 Q193 214 172 214 H118 Q97 214 97 181 Q96 141 137 117 Z'),
      path('M135 42 L135 116 C88 141 83 216 118 218 H172 C207 216 202 141 155 116 L155 42 Z'),
      h('ellipse',{cx:145,cy:43,rx:10,ry:3,fill:'#143448',stroke:'#d9edf7',strokeWidth:2}),
      line(130,80,160,80,{stroke:'#fb7185',strokeWidth:2}),line(141,51,141,111,{stroke:'#f0f9ff',strokeWidth:3,opacity:0.6}),
      h('path',{d:'M109 161 Q99 187 112 201',fill:'none',stroke:'#e0f2fe',strokeWidth:4,strokeLinecap:'round',opacity:0.6}),
      phase===1 && h('g',null,line(166,80,245,80,{stroke:'#6ee7b7',strokeDasharray:'4 4'}),ring(145,80,25),h('path',{d:'M230 80 Q249 61 268 80 Q249 99 230 80 Z',fill:'none',stroke:'#cbd5e1',strokeWidth:1.5}),h('circle',{cx:249,cy:80,r:5,fill:'#6ee7b7'})),
      phase===2 && h('g',null,h('rect',{x:132,y:30,width:26,height:12,rx:3,fill:'#e2e8f0'}),h('rect',{x:138,y:40,width:14,height:13,fill:'#94a3b8'}),h('path',{d:'M212 116 A70 70 0 0 1 215 183 M210 176 L215 185 L224 178',fill:'none',stroke:'#6ee7b7',strokeWidth:3})));
  } else if (kind === 'pipette-filler') {
    var px = phase===2?185:145;
    scene = h('g',null,
      beaker(phase===2?110:106,165,78,58,phase===1?35:phase===2?18:4),
      h('path',{d:'M'+px+' 35 C'+(px-29)+' 35 '+(px-29)+' 73 '+px+' 78 C'+(px+29)+' 73 '+(px+29)+' 35 '+px+' 35 Z',fill:'#0d6e65',stroke:'#6ee7b7',strokeWidth:2}),
      h('rect',{x:px-5,y:74,width:10,height:14,rx:3,fill:'#cbd5e1'}),
      path('M'+(px-3)+' 87 V119 C'+(px-16)+' 126 '+(px-16)+' 148 '+(px-3)+' 155 L'+(px-2)+' 198 L'+(px+2)+' 198 L'+(px+3)+' 155 C'+(px+16)+' 148 '+(px+16)+' 126 '+(px+3)+' 119 V87 Z'),
      phase===1 && h('path',{d:'M'+(px-1)+' 108 V122 C'+(px-13)+' 129 '+(px-13)+' 145 '+(px-1)+' 154 L'+px+' 195 L'+(px+1)+' 154 C'+(px+13)+' 145 '+(px+13)+' 129 '+(px+1)+' 122 V108 Z',fill:'#38bdf8',opacity:0.6}),
      line(px-8,108,px+8,108,{stroke:'#fb7185'}),
      phase===1 && h('path',{d:'M104 161 V105 L98 113 M104 105 L110 113',stroke:'#6ee7b7',strokeWidth:3,fill:'none'}),
      phase===2 && h('path',{d:'M215 115 V166 L209 158 M215 166 L221 158',stroke:'#6ee7b7',strokeWidth:3,fill:'none'}),ring(px,phase===0?80:phase===1?108:196,phase===0?20:16));
  } else if (kind === 'funnel') {
    var fx=phase===2?231:145,fy=phase===2?127:29;
    scene=h('g',null,
      h('g',{opacity:0.55},line(73,64,73,231,{strokeWidth:5}),line(48,233,97,233,{strokeWidth:5}),line(73,108,145,108,{strokeWidth:4}),h('path',{d:'M135 100 Q153 96 154 108 Q153 120 135 116',fill:'none',stroke:'#a8c8dc',strokeWidth:3})),
      tube(145,65,179,phase===0?166:84),beaker(112,205,66,29,8),
      h('g',null,path('M'+(fx-23)+' '+fy+' H'+(fx+23)+' L'+(fx+3)+' '+(fy+27)+' V'+(fy+44)+' H'+(fx-3)+' V'+(fy+27)+' Z'),h('ellipse',{cx:fx,cy:fy,rx:23,ry:4,fill:'#193e52',stroke:'#b8d8e9',strokeWidth:2}),phase===1&&water('M'+(fx-15)+' '+(fy+9)+' H'+(fx+15)+' L'+fx+' '+(fy+27)+' Z')),
      phase===2?h('g',null,ring(145,66,20),h('path',{d:'M179 91 L214 109 M202 108 L214 109 L209 98',stroke:'#6ee7b7',strokeWidth:3,fill:'none'})):ring(145,phase===0?184:55,22));
  } else if (kind === 'stand-clamp') {
    scene=h('g',null,h('path',{d:'M48 220 L193 220 L213 236 H36 Z',fill:'#31495d',stroke:'#7e9eb4',strokeWidth:2}),
      line(66,39,66,219,{stroke:'#acc3d0',strokeWidth:8}),line(63,40,63,213,{stroke:'#edf6fb',strokeWidth:2}),
      line(67,90,149,90,{stroke:phase===1?'#6ee7b7':'#829bad',strokeWidth:7}),
      phase>0&&h('g',null,tube(152,39,154,67),h('path',{d:'M140 80 Q157 71 163 81 M140 100 Q157 109 163 99',fill:'none',stroke:'#6ee7b7',strokeWidth:5,strokeLinecap:'round'})),
      phase===2&&h('g',null,water('M129 202 H175 L187 222 H117 Z'),path('M141 181 H163 V194 L190 225 H114 L141 194 Z'),line(152,173,152,187,{stroke:'#6ee7b7',strokeDasharray:'3 3',strokeWidth:1})),
      ring(phase===0?115:152,phase===0?225:phase===1?90:178,phase===0?29:23));
  } else if (kind === 'magnetic-stirrer') {
    scene=h('g',null,
      h('path',{d:'M66 181 L230 181 L247 204 V233 H51 V204 Z',fill:'#244158',stroke:'#8cacc1',strokeWidth:2}),
      h('path',{d:'M66 181 H230 L247 204 H51 Z',fill:'#d9e7ed',stroke:'#8cacc1',strokeWidth:2}),
      h('circle',{cx:214,cy:218,r:8,fill:'#0f2737',stroke:'#9cbccc',strokeWidth:1.5}),line(214,218,phase===1?220:210,phase===1?215:212,{stroke:'#6ee7b7'}),
      h('rect',{x:73,y:214,width:36,height:9,rx:3,fill:phase===1?'#6ee7b7':'#506578'}),
      water('M115 119 H185 L223 186 Q150 205 77 186 Z'),
      path('M132 56 H168 V87 L226 187 Q150 211 74 187 L132 87 Z'),
      h('ellipse',{cx:150,cy:57,rx:18,ry:4,fill:'#17364a',stroke:'#b8d8e9',strokeWidth:2}),
      h('rect',{x:129,y:182,width:42,height:8,rx:4,fill:'#f8fafc',stroke:'#bdd4e0',transform:phase===1?'rotate(-15 150 186)':undefined}),
      phase===1 && h('g',null,h('path',{d:'M111 150 C107 127 182 123 187 146 M181 137 L187 146 L195 138 M187 163 C174 184 115 179 109 159 M105 170 L109 159 L120 165',fill:'none',stroke:'#6ee7b7',strokeWidth:2.5,strokeLinecap:'round'})),
      phase!==1 && ring(phase===0?150:214,phase===0?186:218,phase===0?28:17));
  } else if (kind === 'weighing-boat') {
    scene=h('g',null,phase>0&&beaker(177,184,77,47,phase===2?19:7),
      h('g',{transform:phase>0?'rotate(26 151 146)':undefined},
        h('path',{d:'M77 130 L148 108 L222 130 L203 164 L149 181 L94 160 Z',fill:'#dfeaf0',stroke:'#9bbccb',strokeWidth:2}),
        h('path',{d:'M96 134 L149 118 L204 133 L192 150 L149 164 L108 149 Z',fill:'#b9cedb',stroke:'#f1f9ff',strokeWidth:1.5}),
        phase>0&&Array.from({length:phase===1?9:3},function(_,i){return h('circle',{key:i,cx:149+i*6,cy:138+(i%2)*5,r:3,fill:'#fff4b0',stroke:'#b9a964',strokeWidth:0.7});})),
      phase===1&&h('path',{d:'M204 161 L216 178 L210 172 M216 178 L217 169',stroke:'#6ee7b7',strokeWidth:2.5,fill:'none'}),
      phase===2&&h('g',null,h('path',{d:'M211 68 L186 111 M216 71 L191 114',stroke:'#cfe6f1',strokeWidth:3}),h('ellipse',{cx:217,cy:62,rx:9,ry:14,transform:'rotate(29 217 62)',fill:'#41697f',stroke:'#9cbccd',strokeWidth:2}),h('path',{d:'M186 122 L181 132 M181 136 L176 146 M202 164 L210 180',stroke:'#7dd3fc',strokeWidth:3,strokeLinecap:'round'})),
      ring(phase===0?149:phase===1?213:176,phase===0?145:phase===1?174:147,phase===0?35:20));
  } else if (kind === 'spatula') {
    scene=h('g',null,
      phase===2&&h('g',null,h('rect',{x:47,y:101,width:72,height:112,rx:8,fill:'#254e59',stroke:'#93bdc9',strokeWidth:2}),h('rect',{x:45,y:87,width:76,height:19,rx:5,fill:'#91a9b8'}),h('rect',{x:57,y:134,width:51,height:48,rx:4,fill:'#d4e6ec'}),h('path',{d:'M69 158 L78 167 L98 144',fill:'none',stroke:'#126253',strokeWidth:4})),
      phase!==0&&h('path',{d:phase===1?'M110 204 L168 181 L237 204 L219 224 H128 Z':'M150 220 L195 204 L263 220 L249 236 H163 Z',fill:'#d9e7ee',stroke:'#98b8ca',strokeWidth:2}),
      h('g',{transform:phase===0?'rotate(-35 146 126)':phase===1?'rotate(-28 200 137)':'rotate(-53 219 148)'},h('rect',{x:106,y:117,width:123,height:11,rx:5,fill:'#8daabb',stroke:'#deedf6',strokeWidth:2}),h('ellipse',{cx:108,cy:123,rx:24,ry:11,fill:'#d8e7ee',stroke:'#8eaebf',strokeWidth:2}),phase===1&&h('path',{d:'M91 122 Q108 104 125 122 Z',fill:'#fff2b1',stroke:'#c7b873'})),
      phase===1&&h('g',null,h('circle',{cx:143,cy:186,r:3,fill:'#fff2b1'}),h('circle',{cx:154,cy:198,r:4,fill:'#fff2b1'}),h('path',{d:'M178 177 V195 M173 190 L178 195 L183 190',stroke:'#6ee7b7',strokeWidth:2,fill:'none'})),
      phase===0&&ring(115,142,35));
  } else {
    var ex=phase===2?158:151;
    scene=h('g',null,
      phase===2?h('g',null,h('rect',{x:130,y:149,width:56,height:74,rx:8,fill:'#0d514d',stroke:'#6ee7b7',strokeWidth:2}),h('rect',{x:135,y:138,width:46,height:16,rx:4,fill:'#94a3b8'}),h('rect',{x:137,y:176,width:42,height:31,rx:3,fill:'#d6efea'})):
        beaker(102,139,98,84,57),
      h('path',{d:'M'+ex+' 50 C'+ex+' 15 234 14 241 53',fill:'none',stroke:'#738ea6',strokeWidth:5}),
      h('rect',{x:ex-10,y:46,width:20,height:71,rx:6,fill:'#344f64',stroke:'#aecbde',strokeWidth:2}),
      h('rect',{x:ex-5,y:115,width:10,height:64,rx:2,fill:'#d0e1e9',stroke:'#e7f5ff',strokeWidth:1.5}),
      h('circle',{cx:ex,cy:183,r:8,fill:'#91d4ea',stroke:'#e0f2fe',strokeWidth:2}),
      phase===0&&h('g',null,beaker(36,162,40,61,34),beaker(223,162,40,61,34),ring(ex,183,21)),
      phase===1&&h('g',null,h('rect',{x:135,y:213,width:32,height:6,rx:3,fill:'#f1f5f9'}),line(181,191,181,206,{stroke:'#6ee7b7'}),line(177,191,185,191,{stroke:'#6ee7b7'}),line(177,206,185,206,{stroke:'#6ee7b7'})),
      phase===2&&ring(ex,183,18));
  }
  return h('svg',{viewBox:'0 0 300 260',width:'100%','aria-hidden':true,focusable:false,'data-equipment-diagram':kind,'data-equipment-phase':phase,style:{display:'block',maxHeight:300}},
    h('defs',null,h('clipPath',{id:uid+'-flask'},h('path',{d:'M135 42 L135 116 C88 141 83 216 118 218 H172 C207 216 202 141 155 116 L155 42 Z'})),h('linearGradient',{id:uid+'-glass',x1:'0%',y1:'0%',x2:'100%',y2:'0%'},h('stop',{offset:'0%',stopColor:'#bfe9ff',stopOpacity:0.2}),h('stop',{offset:'35%',stopColor:'#e0f2fe',stopOpacity:0.04}),h('stop',{offset:'100%',stopColor:'#bfe9ff',stopOpacity:0.15}))),
    h('ellipse',{cx:150,cy:137,rx:116,ry:105,fill:'#102d41',opacity:0.65}),
    h('path',{d:'M18 238 H282 M44 246 H256',stroke:'#46657b',strokeWidth:1,opacity:0.6}),
    h('ellipse',{cx:150,cy:234,rx:97,ry:8,fill:'#020d17',opacity:0.5}),scene);
}

function TitrationEquipmentStudy(props) {
  var React=props.React,h=React.createElement,t=props.t,eq=props.equipment;
  var stepState=React.useState(0),step=stepState[0],setStep=stepState[1];
  var id='titration-equipment-study-'+React.useId().replace(/:/g,''),active=eq.study[step];
  return h('section',{'data-titration-equipment-study':eq.id,'aria-labelledby':id+'-title',style:{border:'1px solid #40657a',borderRadius:16,background:'#0a1d2d',padding:16},onKeyDown:function(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();props.onClose();}}},
    h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}},
      h('div',null,h('p',{style:{margin:'0 0 4px',fontSize:11,color:'#a7f3d0',fontWeight:700,letterSpacing:'0.06em'}},t('stem.titration.equip_walkthrough','TECHNIQUE WALKTHROUGH')),
        h('h4',{id:id+'-title',style:{margin:0,fontSize:19,color:'#f0f9ff'}},eq.name)),
      h('button',{type:'button',onClick:props.onClose,className:'focus-visible:ring-2 focus-visible:ring-emerald-300',style:{minHeight:44,padding:'8px 12px',border:'1px solid #69879b',borderRadius:9,color:'#e2e8f0',fontSize:12,background:'#163246'}},t('stem.titration.equip_back','Back to equipment'))),
    h('div',{style:{display:'flex',flexWrap:'wrap',gap:20,alignItems:'center',marginTop:16}},
      h('div',{style:{flex:'1 1 220px',minWidth:0,borderRadius:12,background:'#071724',border:'1px solid #2d4d63',overflow:'hidden'}},
        h(TitrationEquipmentIllustration,{React:React,kind:eq.id,phase:step,id:id}),
        h('p',{'aria-hidden':true,style:{margin:0,padding:'0 12px 12px',fontSize:12,color:'#bae6fd',textAlign:'center'}},String(step+1).padStart(2,'0')+' / '+String(eq.study.length).padStart(2,'0')+' \u00b7 '+active.label)),
      h('div',{style:{flex:'1.35 1 260px',minWidth:0}},
        h('div',{role:'group','aria-label':t('stem.titration.equip_steps','Illustrated technique steps'),style:{display:'flex',flexDirection:'column',gap:8}},eq.study.map(function(s,i){
          return h('button',{key:i,type:'button','aria-pressed':step===i,'aria-controls':id+'-description',onClick:function(){setStep(i);},className:'focus-visible:ring-2 focus-visible:ring-emerald-300',style:{display:'flex',alignItems:'center',gap:12,textAlign:'left',padding:'10px 12px',minHeight:48,borderRadius:10,border:'1px solid '+(step===i?'#6ee7b7':'#486579'),background:step===i?'#123d39':'#122b3f',color:step===i?'#d1fae5':'#e2e8f0',fontSize:13,fontWeight:step===i?700:500}},
            h('span',{'aria-hidden':true,style:{display:'inline-flex',alignItems:'center',justifyContent:'center',flex:'0 0 26px',height:26,borderRadius:8,background:step===i?'#6ee7b7':'#29465a',color:step===i?'#052e25':'#d8e9f3',fontWeight:700}},i+1),s.label);
        })),
        h('p',{id:id+'-description','aria-live':'polite','aria-atomic':true,style:{fontSize:13,lineHeight:1.65,color:'#e2e8f0',margin:'14px 0 0'}},active.text),
        h('button',{type:'button','aria-controls':id+'-description',onClick:function(){setStep(function(old){return (old+1)%eq.study.length;});},className:'focus-visible:ring-2 focus-visible:ring-emerald-300',style:{minHeight:44,padding:'8px 12px',marginTop:12,border:'1px solid #618598',borderRadius:9,background:'#17384b',color:'#d1fae5',fontSize:12}},step===eq.study.length-1?t('stem.titration.equip_review_steps','Review from start'):t('stem.titration.equip_next_step','Next step')))),
    h('p',{style:{fontSize:12,lineHeight:1.6,color:'#b9cddd',margin:'16px 0 8px'}},t('stem.titration.equip_illustration_note','Illustrated guide. Selecting a step does not operate equipment or change your experiment. Follow your reviewed lab procedure and equipment instructions.')),
    h('a',{href:eq.source,target:'_blank',rel:'noopener noreferrer',className:'focus-visible:ring-2 focus-visible:ring-emerald-300',style:{display:'inline-flex',alignItems:'center',minHeight:44,color:'#a7f3d0',fontSize:12,textDecoration:'underline',textUnderlineOffset:3}},t('stem.titration.equip_source','Read the technique reference (opens a new tab)')),
    h(TitrationRelatedEquipment,{React:React,t:t,equipment:eq,catalogue:props.catalogue,onSelect:props.onSelect}));
}

function TitrationExperimentBench(props) {
  var React=props.React, h=React.createElement, t=props.t;
  var inspectorId=React.useId();
  var measureState=React.useState(false),measureOpen=measureState[0],setMeasureOpen=measureState[1],markState=React.useState(null),measureStart=markState[0],setMeasureStart=markState[1],measureToggle=React.useRef(null),measureId=inspectorId+'-measure';
  React.useEffect(function(){setMeasureStart(null);},[props.setup,props.currentReading.preset]);
  React.useEffect(function(){if(measureStart!==null&&props.model.delivered<measureStart)setMeasureStart(null);},[props.model.delivered,measureStart]);
  function closeMeasure(){setMeasureOpen(false);if(measureToggle.current)measureToggle.current.focus();}
  var previewState=React.useState(null),previewMs=previewState[0],setPreviewMs=previewState[1],additionToggle=React.useRef(null),additionSlider=React.useRef(null),additionFocusPending=React.useRef(false);
  React.useEffect(function(){if(previewMs!==null&&additionFocusPending.current&&additionSlider.current){additionFocusPending.current=false;additionSlider.current.focus();}},[previewMs]);
  function closeAddition(){additionFocusPending.current=false;setPreviewMs(null);if(additionToggle.current)additionToggle.current.focus();}
  var colorState=React.useState(null),colorPreview=colorState[0],setColorPreview=colorState[1],colorExplorerId=inspectorId+'-colors';
  var colorToggle=React.useRef(null),colorSlider=React.useRef(null),colorFocusPending=React.useRef(false);
  React.useEffect(function(){setColorPreview(null);colorFocusPending.current=false;},[props.setup,props.colorReference.identity]);
  React.useEffect(function(){if(colorPreview!==null&&colorFocusPending.current&&colorSlider.current){colorFocusPending.current=false;colorSlider.current.focus();}},[colorPreview]);
  function openColors(value){setMeasureOpen(false);setFocus('flask');setMonitorOpen(true);if(focus!=='flask')reset();setPreviewMs(null);setColorPreview(titrationColorPreviewValue(value,props.colorReference.max,props.colorReference.redox));if(colorSlider.current)colorSlider.current.focus();else colorFocusPending.current=true;}
  function closeColors(){colorFocusPending.current=false;setColorPreview(null);if(colorToggle.current)colorToggle.current.focus();}
  React.useEffect(function(){setPreviewMs(null);},[props.model.pulse,props.model.delivered,props.model.color,props.model.redox,props.setup,props.view]);
  var host=React.useRef(null), viewer=React.useRef(null), drag=React.useRef(null);
  var motionState=React.useState(function(){return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);}), systemReduced=motionState[0], setSystemReduced=motionState[1];
  React.useEffect(function(){
    if(!window.matchMedia)return;
    var query=window.matchMedia('(prefers-reduced-motion: reduce)'), update=function(){setSystemReduced(query.matches);};
    update();if(query.addEventListener)query.addEventListener('change',update);else if(query.addListener)query.addListener(update);
    return function(){if(query.removeEventListener)query.removeEventListener('change',update);else if(query.removeListener)query.removeListener(update);};
  },[]);
  var statusState=React.useState('idle'), status=statusState[0], setStatus=statusState[1];
  var monitorState=React.useState(function(){return !(window.matchMedia && window.matchMedia('(max-width:760px)').matches);}), monitorOpen=monitorState[0], setMonitorOpen=monitorState[1];
  var focusState=React.useState('apparatus'), focus=focusState[0], setFocus=focusState[1];
  var orbitState=React.useState({rotY:24,rotX:8,zoom:1}), orbit=orbitState[0], setOrbit=orbitState[1];
  React.useEffect(function(){
    if(props.view==='diagram')return;
    if(!window.StemLab || !window.StemLab.makeOrbitViewer){setStatus('failed');return;}
    var api=window.StemLab.makeOrbitViewer({
      attr:'data-titration-experiment-gl',clearColor:0x071422,fov:38,fitSlack:1.04,
      build:buildTitrationExperimentScene,
      lights:function(THREE,scene){
        scene.add(new THREE.HemisphereLight(0xe9f6ff,0x253347,0.75));
        var key=new THREE.DirectionalLight(0xffffff,0.85);key.position.set(4,8,6);scene.add(key);
        var rim=new THREE.DirectionalLight(0x8bddff,0.65);rim.position.set(-4,4,-3);scene.add(rim);
      },
      debug:function(S){var flash=S.model.getObjectByName('titrant-flash');return Object.assign({objects:S.model.children.length,flashVisible:!!(flash&&flash.visible),flashOpacity:flash?flash.material.opacity:0,ripples:S.model.children.filter(function(o){return /^liquid-ripple-/.test(o.name)&&o.visible;}).length},S.experiment||{});}
    });
    viewer.current=api;api.onStatusChange(setStatus);api.attach(host.current);
    host.current.__titrationViewer=api;
    return function(){api.onStatusChange(null);api.dispose();viewer.current=null;};
  },[props.view]);
  var diagram=props.view==='diagram'||status==='failed';
  React.useEffect(function(){props.onReady(diagram||status==='ready');},[diagram,status,props.onReady]);
  React.useEffect(function(){
    if(!viewer.current)return;
    var model=Object.assign({},props.model,{focus:focus,animating:previewMs===null && props.model.animating && !systemReduced,previewMs:previewMs});
    viewer.current.push(Object.assign({},model,orbit,{static:!model.animating,sig:JSON.stringify(model)}));
  },[props.model,orbit,status,props.view,systemReduced,focus,previewMs]);
  function rotate(y,x){setOrbit(function(o){return {rotY:o.rotY+y,rotX:Math.max(-20,Math.min(65,o.rotX+x)),zoom:o.zoom};});}
  function zoom(delta){setOrbit(function(o){return Object.assign({},o,{zoom:Math.max(0.6,Math.min(1.8,o.zoom+delta))});});}
  function reset(){setOrbit({rotY:24,rotX:8,zoom:1});}
  function inspect(part){additionFocusPending.current=false;setMeasureOpen(false);setPreviewMs(null);setColorPreview(null);colorFocusPending.current=false;setFocus(part);reset();}
  var previewPhase=previewMs<620?t('stem.titration.inspector_release','Drop release'):previewMs<850?t('stem.titration.inspector_impact','Impact'):previewMs<1720?t('stem.titration.inspector_mix','Mixing'):t('stem.titration.inspector_settled','Settled');
  var btn=function(label,action,pressed,key){return h('button',{key:key,type:'button',onClick:action,'aria-label':label,'aria-pressed':pressed,className:'titr-immersive-button'},label);};
  var css='@keyframes titrationDiagramRipple{0%{opacity:.48;transform:scale(.13)}100%{opacity:0;transform:scale(1)}}.titr-color-guide{gap:10px}.titr-color-name{font-weight:700}.titr-color-observation{display:flex;gap:12px;align-items:center}.titr-color-well{display:block;flex-shrink:0;width:48px;height:48px;border-radius:50%;border:2px solid #b6cddd;background:#fff;padding:4px;box-shadow:0 2px 6px #071422}.titr-color-well>span{display:block;width:100%;height:100%;border-radius:50%;border:1px solid #8c9cad}.titr-color-samples{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;text-align:center}.titr-color-samples .titr-color-well{margin:0 auto 6px;width:38px;height:38px}.titr-color-range{padding:8px;border:1px dashed #fbbf24;border-radius:8px}.titr-color-guide p.titr-color-range{color:#fde68a}@media(max-width:760px){.titr-color-observation,.titr-color-samples{margin:12px 0}.titr-color-guide .titr-color-name{margin-top:8px}}@keyframes titrationDiagramDrop{0%{opacity:1;transform:translateY(0)}99%{opacity:1}100%{opacity:0;transform:translateY(var(--titr-drop-distance))}}@keyframes titrationDiagramBloom{0%{opacity:0;transform:scale(.55)}8%{opacity:.8}100%{opacity:0;transform:scale(2.4)}}.titr-apparatus-diagram{height:clamp(390px,55vw,580px);min-width:0;background:radial-gradient(ellipse at 45% 45%,#153448,#071422 75%)}.titr-reading-lens svg{max-width:260px;margin:0 auto}.titr-addition-inspector{padding:14px 16px;background:#263041;border-top:1px solid #8193a7}.titr-addition-inspector h4{font-size:14px;font-weight:800;color:#fde68a;margin:0 0 6px}.titr-addition-inspector label{display:block;color:#f1f5f9;font-size:12px;margin-top:10px}.titr-addition-inspector input{width:100%;min-height:44px;accent-color:#fbbf24}.titr-addition-inspector input:focus-visible{outline:3px solid #facc15;outline-offset:2px}.titr-addition-inspector .titr-immersive-switches{margin-top:8px}.titr-preview-badge{position:absolute;z-index:2;top:12px;left:12px;max-width:calc(100% - 24px);padding:8px 12px;border:1px solid #fbbf24;border-radius:8px;background:#152338;color:#fde68a;font-size:12px;font-weight:800;pointer-events:none}.titr-immersive{background:#0b1d2d;color:#e2edf8;border:1px solid #52657a;border-radius:18px;overflow:hidden}.titr-immersive-header,.titr-immersive-controls{padding:14px;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}.titr-immersive h3{font-size:17px;font-weight:800;margin:0;color:#f1f5f9}.titr-immersive p{font-size:12px;line-height:1.6;margin:0;color:#cbd5e1}.titr-immersive .titr-immersive-button{min-height:44px;padding:8px 12px;border:1px solid #8193a7;background:#132d42;color:#ecf5fc;border-radius:9px;font-size:12px;font-weight:700}.titr-immersive .titr-immersive-button[aria-pressed=true]{background:#a5f3fc;color:#083344;border-color:#a5f3fc}.titr-immersive .titr-immersive-button:disabled{opacity:.5;cursor:not-allowed}.titr-immersive-button:focus-visible,.titr-immersive-stage:focus-visible{outline:3px solid #facc15;outline-offset:-3px}.titr-immersive-stage{height:clamp(390px,55vw,580px);position:relative;touch-action:pan-y;cursor:grab;background:#071422}.titr-immersive-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:1px;background:#52657a;border-top:1px solid #52657a}.titr-immersive-stat{padding:13px 16px;background:#102538;min-width:0}.titr-immersive-stat dt{font-size:11px;color:#cbd5e1;margin-bottom:4px}.titr-immersive-stat dd{font-size:22px;font-weight:800;color:#ecfeff;margin:0;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.titr-immersive-caption{padding:0 14px 14px}.titr-immersive-switches{display:flex;gap:8px;flex-wrap:wrap}.titr-immersive-workspace{display:grid;grid-template-columns:minmax(0,1fr)}.titr-immersive-workspace.with-trace{grid-template-columns:minmax(0,1fr) 260px}.titr-immersive-trace{padding:18px 12px;background:#102538;border-left:1px solid #52657a;min-width:0;display:flex;flex-direction:column;gap:13px;justify-content:center}.titr-immersive-trace h4{font-size:14px;font-weight:800;color:#a5f3fc;margin:0}.titr-immersive-trace .titr-trace-value{font-size:22px;font-weight:800;color:#ecfeff;font-variant-numeric:tabular-nums}.titr-trace-equivalence{padding:10px;border:1px dashed #fbbf24;border-radius:9px}.titr-trace-equivalence strong{display:block;color:#fde68a;font-size:15px;margin-top:4px}@media(max-width:760px){.titr-immersive-workspace.with-trace{grid-template-columns:minmax(0,1fr)}.titr-immersive-trace{border-left:0;border-top:1px solid #52657a;display:block}.titr-immersive-trace svg{max-width:340px;margin:8px auto}.titr-immersive-trace p{margin-top:8px}}.titr-immersive-inspector{padding:14px 16px;background:#102a3d;border-top:1px solid #52657a;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}.titr-immersive-inspector strong{display:block;font-size:13px;color:#a5f3fc;margin-bottom:5px}.titr-immersive-inspector p{font-size:12px;line-height:1.6}.titr-immersive-focus{padding:10px 14px;border-top:1px solid #52657a;background:#102538}.titr-immersive-focus button{flex:1}.titr-immersive-focus button[aria-pressed=true]::before{content:"✓ ";}@media(max-width:480px){.titr-immersive-inspector{grid-template-columns:minmax(0,1fr);gap:10px}.titr-immersive-stat:last-child{grid-column:1/-1}}@media(forced-colors:active){.titr-immersive .titr-immersive-button[aria-pressed=true]{outline:2px solid Highlight}}';
  css+='.titr-color-samples button{min-height:44px;width:100%;padding:5px 2px;border:1px solid #8193a7;border-radius:9px;background:#132d42;color:#e2edf8;cursor:pointer}.titr-color-samples button[aria-pressed=true]{border-color:#fbbf24;box-shadow:inset 0 0 0 1px #fbbf24}.titr-color-samples button p{margin:0}.titr-color-samples button:focus-visible{outline:3px solid #facc15;outline-offset:2px}.titr-color-explorer{padding:16px;border-top:1px solid #8193a7;border-bottom:1px solid #8193a7;background:#102a3d}.titr-explorer-header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}.titr-color-explorer h4{font-size:16px;font-weight:800;color:#fde68a;margin:0 0 5px}.titr-explorer-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;align-items:center}.titr-color-explorer label{display:block;font-size:13px;font-weight:700;color:#e2edf8;margin:16px 0 6px}.titr-color-explorer input[type=range]{display:block;appearance:none;width:100%;min-height:44px;background:transparent;cursor:pointer}.titr-color-explorer input[type=range]::-webkit-slider-runnable-track{height:14px;background:var(--titr-reference-gradient),#fff;border:1px solid #b6cddd;border-radius:20px}.titr-color-explorer input[type=range]::-webkit-slider-thumb{appearance:none;width:24px;height:24px;margin-top:-6px;background:#fbbf24;border:3px solid #071422;border-radius:50%;box-shadow:0 0 0 1px #fbbf24}.titr-color-explorer input[type=range]::-moz-range-track{height:14px;background:var(--titr-reference-gradient),#fff;border:1px solid #b6cddd;border-radius:20px}.titr-color-explorer input[type=range]::-moz-range-thumb{width:20px;height:20px;background:#fbbf24;border:3px solid #071422;border-radius:50%}.titr-color-explorer input:focus-visible{outline:3px solid #facc15;outline-offset:2px}.titr-reference-scale{display:flex;justify-content:space-between;gap:8px;color:#cbd5e1;font-size:12px;margin-bottom:12px}.titr-reference-caption{margin-top:12px!important}.titr-reference-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.titr-reference-well{margin:0;padding:12px 8px 0;text-align:center;border:1px solid #668397;border-radius:14px;background:#0b1d2d;min-width:0}.titr-reference-well.is-reference{border-color:#fbbf24}.titr-reference-well strong{display:block;font-size:13px;color:#a5f3fc}.titr-reference-well.is-reference strong{color:#fde68a}.titr-reference-well figcaption span{display:block;font-size:18px;font-weight:800;color:#ecfeff;margin-top:6px}.titr-reference-well svg{display:block;width:100%;max-width:170px;margin:0 auto}.titr-color-guide{gap:8px}@media(max-width:760px){.titr-explorer-layout{grid-template-columns:minmax(0,1fr);gap:16px}.titr-color-explorer{padding:14px}.titr-reference-pair{gap:8px}.titr-reference-well figcaption span{font-size:16px}}';
  css+=".titr-volume-measure{padding:16px;border-top:1px solid #8193a7;border-bottom:1px solid #8193a7;background:#102a3d}.titr-measure-header{display:flex;justify-content:space-between;gap:12px;align-items:start;flex-wrap:wrap;margin-bottom:16px}.titr-measure-header h4{font-size:16px;font-weight:800;color:#fde68a;margin:0 0 6px}.titr-measure-layout{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:24px;align-items:start}.titr-measure-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.titr-measure-scale{margin:0;padding:12px 4px 0;border:1px solid #668397;border-radius:14px;background:#0b1d2d;min-width:0}.titr-measure-scale.is-current{border-color:#fbbf24}.titr-measure-scale figcaption{padding:0 8px;text-align:center}.titr-measure-scale strong{display:block;font-size:13px;color:#a5f3fc}.titr-measure-scale.is-current strong{color:#fde68a}.titr-measure-scale figcaption span{display:block;font-size:20px;font-weight:800;color:#ecfeff;margin-top:6px}.titr-measure-scale svg{display:block;width:100%;max-width:200px;margin:0 auto}.titr-measure-caption{margin-top:12px!important}.titr-measure-detail{min-width:0;display:flex;flex-direction:column;gap:16px}.titr-measure-result{padding:14px;border-left:3px solid #fbbf24;border-radius:9px;background:#071422}.titr-measure-result strong{font-size:13px;color:#fde68a}.titr-measure-result p[data-measure-total]{font-size:30px;font-weight:800;color:#ecfeff;margin-top:4px;line-height:1.3}.titr-measure-calculation{padding:12px;border:1px solid #668397;border-radius:10px;background:#0b1d2d}.titr-measure-calculation strong,.titr-measure-add>strong{font-size:13px;color:#a5f3fc}.titr-measure-calculation ol{padding-left:20px;margin:8px 0;color:#e2edf8;font-size:13px;line-height:1.8}.titr-measure-calculation p{margin-top:8px}.titr-measure-add .titr-immersive-switches{margin-top:8px}@media(max-width:760px){.titr-measure-layout{grid-template-columns:minmax(0,1fr);gap:16px}.titr-volume-measure{padding:14px}.titr-measure-pair{gap:8px}.titr-measure-scale figcaption span{font-size:18px}}";
  css+=".titr-bench-navigation{padding:14px;border-top:1px solid #52657a;background:#102538}.titr-bench-views{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.titr-bench-view{position:relative;display:flex;align-items:center;gap:10px;min-width:0;padding:12px 24px 12px 8px;border:1px solid #8193a7;border-radius:13px;background:#0b1d2d;color:#e2edf8;text-align:left;cursor:pointer}.titr-bench-view svg{display:block;width:82px;flex:0 0 82px}.titr-bench-view-copy{min-width:0}.titr-bench-view-copy strong{display:block;font-size:14px;line-height:1.35;color:#ecfeff}.titr-bench-view-copy>span{display:block;font-size:12px;line-height:1.5;color:#cbd5e1;margin-top:5px}.titr-bench-view[aria-pressed=true]{background:#12384b;border-color:#67e8f9;box-shadow:inset 0 0 0 1px #67e8f9}.titr-bench-view-check{position:absolute;top:8px;right:8px;font-size:15px;font-weight:800;color:#a5f3fc}.titr-bench-view:focus-visible{outline:3px solid #facc15;outline-offset:2px}.titr-bench-view:hover{border-color:#c5e8fa}.titr-bench-aids{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-top:14px;padding-top:14px;border-top:1px solid #52657a}.titr-bench-aids strong{font-size:13px;color:#fde68a}.titr-bench-aids p{margin-top:4px}.titr-bench-monitor{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px}.titr-bench-aids button[aria-expanded=true]{background:#fbbf24;color:#172638;border-color:#fbbf24}@media(max-width:1050px) and (min-width:601px){.titr-bench-view{flex-direction:column;align-items:start}.titr-bench-view svg{width:74px;flex-basis:auto}}@media(max-width:600px){.titr-bench-views{grid-template-columns:minmax(0,1fr);gap:8px}.titr-bench-view{padding:8px 25px 8px 8px;gap:12px}.titr-bench-view svg{width:65px;flex-basis:65px}.titr-bench-aids>.titr-immersive-switches{width:100%}.titr-bench-aids button{flex:1 1 120px}.titr-bench-view-copy>span{margin-top:3px}}@media(forced-colors:active){.titr-bench-view[aria-pressed=true],.titr-bench-aids button[aria-expanded=true]{outline:2px solid Highlight}.titr-bench-view svg{forced-color-adjust:none}}";
  return h('section',{className:'titr-immersive','data-titration-immersive':true,'aria-label':t('stem.titration.immersive_title','Interactive titration bench')},
    h('style',null,css),
    h('div',{className:'titr-immersive-header'},h('div',null,
      h('h3',null,t('stem.titration.immersive_title','Interactive titration bench')),
      h('p',null,props.setup)
    ),h('div',{className:'titr-immersive-switches',role:'group','aria-label':t('stem.titration.apparatus_view','Apparatus view')},
      btn(t('stem.titration.bench_3d','3D bench'),function(){props.onView('3d');},props.view!=='diagram'),
      btn(t('stem.titration.bench_diagram','2D diagram'),function(){props.onView('diagram');},props.view==='diagram')
    )),
    (diagram||status==='ready') && h('div',{className:'titr-bench-navigation','data-titration-bench-navigation':true},
      h(TitrationBenchViews,{React:React,t:t,id:inspectorId+'-views',focus:focus,onInspect:inspect}),
      h('div',{className:'titr-bench-aids',role:'group','aria-label':t('stem.titration.nav_aids','Bench aids')},
        h('div',null,h('strong',null,t('stem.titration.nav_aids','Bench aids')),h('p',null,t('stem.titration.nav_aids_hint','Each aid opens its matching close-up.'))),
        h('div',{className:'titr-immersive-switches'},
          h('button',{ref:colorToggle,type:'button',className:'titr-immersive-button','aria-expanded':colorPreview!==null,'aria-controls':colorPreview!==null?colorExplorerId:undefined,onClick:function(){if(colorPreview!==null)closeColors();else openColors(props.colorReference.redox?Math.min(props.colorReference.max,props.colorReference.equivalence+0.1):(props.colorReference.low+props.colorReference.high)/2);}},t('stem.titration.color_explore','Explore colors')),
          h('button',{ref:measureToggle,type:'button',className:'titr-immersive-button','aria-expanded':measureOpen,'aria-controls':measureOpen?measureId:undefined,onClick:function(){if(measureOpen)closeMeasure();else {inspect('burette');setMonitorOpen(true);setMeasureOpen(true);}}},t('stem.titration.measure_toggle','Measure volume')),
          !diagram&&h('button',{ref:additionToggle,type:'button',className:'titr-immersive-button','aria-expanded':previewMs!==null,'aria-controls':previewMs!==null?inspectorId+'-addition':undefined,onClick:function(){if(previewMs!==null)closeAddition();else {inspect('flask');setMonitorOpen(true);additionFocusPending.current=true;setPreviewMs(650);}}},t('stem.titration.inspector_toggle','Inspect addition'))
        )
      ),
      h('div',{className:'titr-bench-monitor'},btn(focus==='burette'?t('stem.titration.reading_lens','Reading lens'):focus==='flask'?t('stem.titration.color_guide','Color guide'):t('stem.titration.bench_live_curve','Live curve'),function(){setMonitorOpen(!monitorOpen);},monitorOpen),h('p',null,monitorOpen?t('stem.titration.nav_panel_shown','Companion panel shown'):t('stem.titration.nav_panel_hidden','Companion panel hidden')))
    ),
    props.view!=='diagram' && status==='ready' && previewMs!==null && h('section',{id:inspectorId+'-addition',className:'titr-addition-inspector','data-titration-addition-inspector':true,'aria-labelledby':inspectorId+'-title',onKeyDown:function(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeAddition();}}},
      h('h4',{id:inspectorId+'-title'},t('stem.titration.inspector_title','Static addition inspector')),
      h('p',{id:inspectorId+'-help'},t('stem.titration.inspector_help','Step through an illustrative mixing cue for the current setup. No titrant is added and recorded readings stay unchanged. The timeline is illustrative, not a measurement of reaction speed.')),
      h('label',{htmlFor:inspectorId+'-time'},t('stem.titration.inspector_timeline','Visual timeline')+' · '+previewPhase),
      h('input',{ref:additionSlider,id:inspectorId+'-time',type:'range',min:0,max:1800,step:50,value:previewMs,'aria-label':t('stem.titration.inspector_timeline','Visual timeline'),'aria-valuetext':previewPhase,'aria-describedby':inspectorId+'-help',onChange:function(e){setPreviewMs(Number(e.target.value));}}),
      h('div',{className:'titr-immersive-switches'},[[0,t('stem.titration.inspector_release','Drop release')],[650,t('stem.titration.inspector_impact','Impact')],[1100,t('stem.titration.inspector_mix','Mixing')],[1800,t('stem.titration.inspector_settled','Settled')]].map(function(step){return btn(step[1],function(){setPreviewMs(step[0]);},previewMs===step[0],step[0]);}),btn(t('stem.titration.inspector_exit','Return to live view'),closeAddition))
    ),
    (diagram||status==='ready')&&focus==='burette'&&measureOpen&&h(TitrationVolumeMeasure,{React:React,t:t,id:measureId,model:props.model,start:measureStart,onMark:function(){setMeasureStart(props.model.delivered);},onClear:function(){setMeasureStart(null);},onClose:closeMeasure,onAdd:props.onAdd,canAdd:props.canAdd}),
    (diagram||status==='ready')&&focus==='flask'&&colorPreview!==null&&h(TitrationColorExplorer,{React:React,t:t,id:colorExplorerId,reference:props.colorReference,value:colorPreview,onChange:setColorPreview,onClose:closeColors,sliderRef:colorSlider}),
    props.view!=='diagram' && h('div',{className:'titr-immersive-workspace'+(monitorOpen && status==='ready'?' with-trace':''),style:status==='failed'?{display:'none'}:undefined},
    h('div',{ref:host,className:'titr-immersive-stage',role:'img',tabIndex:0,'aria-label':(previewMs!==null?t('stem.titration.inspector_static','Static illustration')+'. '+previewPhase+'. ':'')+(focus==='flask'?t('stem.titration.bench_flask_closeup','Flask close-up'):focus==='burette'?t('stem.titration.bench_burette_closeup','Burette close-up'):t('stem.titration.bench_full_apparatus','Full apparatus'))+'. '+props.description,
      'aria-keyshortcuts':'ArrowLeft ArrowRight ArrowUp ArrowDown + - 0',
      style:status==='failed'?{display:'none'}:undefined,
      onKeyDown:function(e){var handled=true;if(e.key==='ArrowLeft')rotate(-10,0);else if(e.key==='ArrowRight')rotate(10,0);else if(e.key==='ArrowUp')rotate(0,8);else if(e.key==='ArrowDown')rotate(0,-8);else if(e.key==='+')zoom(0.1);else if(e.key==='-')zoom(-0.1);else if(e.key==='0')reset();else handled=false;if(handled)e.preventDefault();},
      onPointerDown:function(e){if(e.pointerType==='touch'||e.button!==0)return;drag.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);},
      onPointerMove:function(e){if(!drag.current)return;rotate((e.clientX-drag.current.x)*0.4,(e.clientY-drag.current.y)*0.25);drag.current={x:e.clientX,y:e.clientY};},
      onPointerUp:function(){drag.current=null;},onPointerCancel:function(){drag.current=null;},onLostPointerCapture:function(){drag.current=null;}
    },previewMs!==null && h('span',{className:'titr-preview-badge','aria-hidden':true},t('stem.titration.inspector_static','Static illustration')+' · '+previewPhase)),
      monitorOpen && status==='ready' && (focus==='burette'?h(TitrationReadingLens,{React:React,t:t,model:props.model}):focus==='flask'?h(TitrationColorGuide,{React:React,t:t,reference:props.colorReference,preview:colorPreview,onPreview:openColors}):h(TitrationBenchTrace,{React:React,t:t,curve:props.curve}))
    ),
    diagram && h('div',{className:'titr-immersive-workspace'+(monitorOpen?' with-trace':'')},h(TitrationApparatusDiagram,{React:React,t:t,model:Object.assign({},props.model,{animating:props.model.animating&&!systemReduced}),focus:focus}),monitorOpen&&(focus==='burette'?h(TitrationReadingLens,{React:React,t:t,model:props.model}):focus==='flask'?h(TitrationColorGuide,{React:React,t:t,reference:props.colorReference,preview:colorPreview,onPreview:openColors}):h(TitrationBenchTrace,{React:React,t:t,curve:props.curve}))),
    props.view!=='diagram' && status!=='ready' && h('p',{role:'status',className:'titr-immersive-caption'},status==='failed'?t('stem.titration.bench_fallback','3D is unavailable. The diagram and experiment controls below still work.'):t('stem.titration.bench_loading','Loading the 3D bench. The diagram remains available below.')),
    (diagram||status==='ready') && h(React.Fragment,null,
      h('div',{className:'titr-immersive-controls',role:'group','aria-label':t('stem.titration.bench_add','Add titrant at the bench')},
        h('p',null,t('stem.titration.titrant_volume','TITRANT VOLUME:')),
        h('div',{className:'titr-immersive-switches'},[0.1,0.5,1,5].map(function(amount){return h('button',{key:amount,type:'button',className:'titr-immersive-button',disabled:!props.canAdd,onClick:function(){props.onAdd(amount);}},'+'+amount+' mL');}))
      ),
      !diagram && h('div',{className:'titr-immersive-controls',role:'group','aria-label':t('stem.titration.bench_camera','Bench camera controls')},
        h('div',{className:'titr-immersive-switches'},
          btn(t('stem.titration.bench_front','Front'),function(){setOrbit({rotY:0,rotX:0,zoom:1});}),
          btn(t('stem.titration.bench_side','Side'),function(){setOrbit({rotY:65,rotX:8,zoom:1});}),
          btn(t('stem.titration.bench_orbit_left','Rotate left'),function(){rotate(-15,0);}),
          btn(t('stem.titration.bench_orbit_right','Rotate right'),function(){rotate(15,0);}),
          btn(t('stem.titration.bench_zoom_in','Zoom in'),function(){zoom(0.1);}),
          btn(t('stem.titration.bench_zoom_out','Zoom out'),function(){zoom(-0.1);}),
          btn(t('stem.titration.bench_reset','Reset view'),reset)
        )
      ),
      h('dl',{className:'titr-immersive-stats'},props.readings.map(function(item){return h('div',{className:'titr-immersive-stat',key:item[0]},h('dt',null,item[0]),h('dd',null,item[1]));})),
      h('div',{className:'titr-immersive-inspector'},
        h('div',null,
          h('strong',null,t('stem.titration.bench_observe','What to observe')),
          h('p',null,focus==='flask'
            ? t('stem.titration.bench_flask_guide','Watch the liquid surface rise and compare the solution color with the indicator status. The white tile helps the color stand out.')
            : focus==='burette'
              ? t('stem.titration.bench_burette_guide','Track the meniscus as you add titrant. The burette readout describes the current fill; cumulative titrant volume also includes previous fills.')
              : t('stem.titration.bench_full_guide','Follow an addition from the burette tip into the flask. Use the close-ups to inspect each vessel, then compare the readings with the curve below.'))
        ),
        h('div',null,h('strong',null,t('stem.titration.bench_current_observation','Current observation')),h('p',null,props.observation))
      ),
      h('p',{className:'titr-immersive-caption'},t('stem.titration.bench_scale_note','Illustrative apparatus: dimensions, liquid heights, and drop animation are not a calibrated measurement scale. Use the numerical readings. Drag with a mouse or use the camera buttons; touch swipes scroll the page.'))
    ),
    h(TitrationBenchTools,{React:React,t:t,records:props.notebook,onRecords:props.onNotebook,current:props.currentReading,remaining:props.remaining,onAdd:props.onAdd})
  );
}

window.StemLab.registerTool('titrationLab', {
  label: 'Titration Lab',
  icon: '\uD83E\uDDEA',
  desc: 'Virtual titration lab with S-curve graphing, safety drills, incident simulator, equipment guide, and dilution calculator.',
  category: 'science',
    questHooks: [
      { id: 'safety_check', label: 'Complete safety checklist', icon: '🧪', check: function(d) { return d.safetyChecked || false; }, progress: function(d) { return d.safetyChecked ? 'Done!' : 'Complete checklist'; } },
      { id: 'try_2_setups', label: 'Try 2 titration setups', icon: '🔬', check: function(d) { return Object.keys(d.presetsUsed || {}).length >= 2; }, progress: function(d) { return Object.keys(d.presetsUsed || {}).length + '/2'; } }
    ],
  render: function(ctx) {
    var React = ctx.React;
    var titrationInstanceKey = React.useId().replace(/[^A-Za-z0-9_-]/g, '') || 'instance';
    var scanGradientId = 'scanGrad-' + titrationInstanceKey;
    var flaskGradientId = 'flaskLiquid-' + titrationInstanceKey;
    var experimentReadyState = React.useState(false), experimentReady = experimentReadyState[0], setExperimentReady = experimentReadyState[1];
    var aiRequestRef = React.useRef(0);
    React.useEffect(function () { return function () { aiRequestRef.current += 1; }; }, []);
    var __alloT = function (k, fb) {
      if (TITRATION_REVIEWED_ENGLISH_KEYS[k]) return fb != null ? fb : k;
      var v;
      try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; }
      return (v == null) ? (fb != null ? fb : k) : v;
    };
    var labToolData = ctx.toolData;
    var setStemLabTool = ctx.setStemLabTool;
    var awardStemXP = ctx.awardXP;
    var setToolSnapshots = ctx.setToolSnapshots;
    var addToast = ctx.addToast;
    var announceToSR = ctx.announceToSR;
    var a11yClick = ctx.a11yClick;
    var callGemini = ctx.callGemini;
    var gradeLevel = ctx.gradeLevel;

var d = (labToolData && labToolData.titrationLab) || {};

// Send only changed fields: delayed callbacks must not replay an older lab snapshot.
var upd = function (k, v) {
  var patch = {}; patch[k] = v;
  ctx.updateMulti('titrationLab', patch);
};
var updMulti = function (obj) {
  ctx.updateMulti('titrationLab', obj);
};

// Timers belong to a mounted lab instance, never to render or to window. SSR and
// abandoned renders create no work, and unmount always clears the countdown.
React.useEffect(function () {
  if (d.safetyChecked || !d.drillActive || d.drillPaused || d.drillResult || !d.drillStartTime) return;
  var durationMs = (15 + Math.max(0, Number(d.drillExtraSeconds) || 0)) * 1000;
  var tick = function () {
    if (Date.now() - Number(d.drillStartTime) >= durationMs) {
      updMulti({ drillResult: 'timeout', drillActive: false, drillPaused: false, _drillTick: Date.now() });
    } else {
      upd('_drillTick', Date.now());
    }
  };
  var timer = setInterval(tick, 200);
  return function () { clearInterval(timer); };
}, [!!d.safetyChecked, !!d.drillActive, !!d.drillPaused, d.drillResult, d.drillStartTime, d.drillExtraSeconds]);



var glass = { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' };



// ── Presets ──

var presets = [

  { id: 'sa_sb', label: __alloT('stem.titration.hcl_naoh', 'HCl + NaOH'), icon: '\u2697\uFE0F', desc: __alloT('stem.titration.strong_acid_strong_base', 'Strong acid + Strong base'), color: '#f87171',

    concAcid: 0.1, volAcid: 25, concBase: 0.1, Ka: null, Kb: null, acidName: 'HCl (0.1 M)', baseName: 'NaOH (0.1 M)' },

  { id: 'wa_sb', label: __alloT('stem.titration.ch_cooh_naoh', 'CH\u2083COOH + NaOH'), icon: '\uD83E\uDDEA', desc: __alloT('stem.titration.weak_acid_strong_base', 'Weak acid + Strong base'), color: '#60a5fa',

    concAcid: 0.1, volAcid: 25, concBase: 0.1, Ka: 1.8e-5, Kb: null, acidName: 'Acetic Acid (0.1 M)', baseName: 'NaOH (0.1 M)' },

  { id: 'sa_wb', label: __alloT('stem.titration.hcl_nh', 'HCl + NH\u2083'), icon: '\uD83D\uDC9C', desc: __alloT('stem.titration.strong_acid_weak_base', 'Strong acid + Weak base'), color: '#a855f7',

    concAcid: 0.1, volAcid: 25, concBase: 0.1, Ka: null, Kb: 1.8e-5, acidName: 'HCl (0.1 M)', baseName: 'NH\u2083 (0.1 M)' },

  { id: 'wa_wb', label: __alloT('stem.titration.ch_cooh_nh', 'CH\u2083COOH + NH\u2083'), icon: '\uD83D\uDC9A', desc: __alloT('stem.titration.both_weak', 'Both weak'), color: '#34d399',

    concAcid: 0.1, volAcid: 25, concBase: 0.1, Ka: 1.8e-5, Kb: 1.8e-5, acidName: 'Acetic Acid (0.1 M)', baseName: 'NH\u2083 (0.1 M)' },

  { id: 'poly_h3po4', label: __alloT('stem.titration.h_po_naoh', 'H\u2083PO\u2084 + NaOH'), icon: '\uD83D\uDD2C', desc: __alloT('stem.titration.polyprotic_acid_3_equiv_pts', 'Polyprotic acid \u2014 first neutralization stage'), color: '#06b6d4',
    concAcid: 0.1, volAcid: 25, concBase: 0.1, Ka: 7.5e-3, Kb: null, polyprotic: [7.5e-3, 6.2e-8, 4.8e-13], acidName: 'Phosphoric Acid (0.1 M)', baseName: 'NaOH (0.1 M)' },

  { id: 'redox_kmno4', label: __alloT('stem.titration.fe_kmno', 'Fe\u00B2\u207A + KMnO\u2084'), icon: '\uD83D\uDCAB', desc: __alloT('stem.titration.redox_titration', 'Redox titration'), color: '#c026d3',
    concAcid: 0.02, volAcid: 25, concBase: 0.02, Ka: null, Kb: null, redox: true, acidName: 'FeSO\u2084 (0.02 M)', baseName: 'KMnO\u2084 (0.02 M)' },

  { id: 'back_antacid', label: __alloT('stem.titration.antacid_back', 'Antacid (back)'), icon: '\uD83D\uDC8A', desc: __alloT('stem.titration.back_titration_of_antacid', 'Back-titration of antacid'), color: '#f472b6',
    concAcid: 0.1, volAcid: 50, concBase: 0.1, Ka: null, Kb: null, backTitration: true, excessAcidMoles: 0.003, acidName: 'Excess HCl after antacid', baseName: 'NaOH (0.1 M)' }

];



// ── Indicators ──

var indicators = [

  { id: 'phenolphthalein', label: __alloT('stem.titration.phenolphthalein', 'Phenolphthalein'), low: 8.2, high: 10.0,

    colorLow: 'rgba(255,255,255,0.15)', colorHigh: '#ec4899', colorMid: '#f9a8d4' },

  { id: 'methylOrange', label: __alloT('stem.titration.methyl_orange', 'Methyl Orange'), low: 3.1, high: 4.4,

    colorLow: '#ef4444', colorHigh: '#eab308', colorMid: '#f97316' },

  { id: 'bromothymolBlue', label: __alloT('stem.titration.bromothymol_blue', 'Bromothymol Blue'), low: 6.0, high: 7.6,

    colorLow: '#eab308', colorHigh: '#3b82f6', colorMid: '#22c55e' },

  // Methyl red (pKa 5.1) — the textbook choice for a weak base titrated with a strong
  // acid, whose equivalence lands near pH 5.3. Neither methyl orange (3.1-4.4) nor
  // bromothymol blue (6.0-7.6) straddles that, so without this one the tool could not
  // offer a correct indicator for its own strong-acid/weak-base preset.
  { id: 'methylRed', label: __alloT('stem.titration.methyl_red', 'Methyl Red'), low: 4.4, high: 6.2,

    colorLow: '#dc2626', colorHigh: '#facc15', colorMid: '#fb923c' },

  { id: 'universal', label: __alloT('stem.titration.universal', 'Universal'), low: 0, high: 14,

    colorLow: '#ef4444', colorHigh: '#7c3aed', colorMid: '#22c55e' }

];


// ── GHS Chemical Hazard Data ──
var chemHazards = (function () {
  var CHEM_FIRST_AID = 'Stop work and alert the instructor. For eye exposure, begin eyewash immediately and remove contacts only if easy; continue for at least 15 minutes and longer when the exact SDS/local plan directs and obtain medical help as directed. For skin or inhalation exposure, begin the exact SDS/local response.';
  var CHEM_DISPOSAL = 'Follow the exact bottle SDS, instructor directions, and local waste plan. Students should not neutralize, mix, or drain-dispose laboratory chemicals unless the reviewed procedure explicitly permits it.';
  return {
  'HCl': { name: __alloT('stem.titration.hydrochloric_acid', 'Hydrochloric Acid'), color: '#ef4444',
    working: 'Simulated working solution: 0.1 M HCl',
    classification: 'Example supplier SDS at 0.1 M: Warning — H290, may be corrosive to metals. The exact bottle SDS controls.',
    hazards: ['Avoid splashes and contact; wear the eye protection and PPE specified by the reviewed procedure.'], firstAid: CHEM_FIRST_AID, disposal: CHEM_DISPOSAL },
  'NaOH': { name: __alloT('stem.titration.sodium_hydroxide', 'Sodium Hydroxide'), color: '#3b82f6',
    working: 'Simulated working solution: 0.1 M NaOH',
    classification: 'Example supplier SDS at 0.1 M: Danger — H290 and H318 (serious eye damage). The exact bottle SDS controls.',
    hazards: ['Prevent eye contact and splashes; do not infer hazards from concentrated sodium hydroxide labels.'], firstAid: CHEM_FIRST_AID, disposal: CHEM_DISPOSAL },
  'CH₃COOH': { name: __alloT('stem.titration.acetic_acid', 'Acetic Acid'), color: '#f59e0b',
    working: 'Simulated working solution: 0.1 M acetic acid',
    classification: 'Example supplier SDS at 0.1 M: not classified for physical or health hazards under GHS; no signal word. The exact bottle SDS controls.',
    hazards: ['Use normal splash-prevention and hygiene controls for the laboratory procedure.'], firstAid: CHEM_FIRST_AID, disposal: CHEM_DISPOSAL },
  'NH₃': { name: __alloT('stem.titration.ammonia', 'Ammonia'), color: '#a855f7',
    working: 'Simulated working solution: 0.1 M ammonium hydroxide/ammonia',
    classification: 'Example supplier SDS at 0.1 M reports skin irritation and serious eye damage; supplier wording varies, so check the exact bottle SDS.',
    hazards: ['Keep separate from bleach and other incompatible chemicals; avoid inhaling vapor or mist.'], firstAid: CHEM_FIRST_AID, disposal: CHEM_DISPOSAL },
  'H₃PO₄': { name: __alloT('stem.titration.phosphoric_acid', 'Phosphoric Acid'), color: '#06b6d4',
    working: 'Simulated working solution: 0.1 M phosphoric acid',
    classification: 'Supplier and formulation are not specified in this simulation — check the exact bottle SDS before bench work.',
    hazards: ['Use the splash controls and PPE required by the reviewed procedure.'], firstAid: CHEM_FIRST_AID, disposal: CHEM_DISPOSAL },
  'KMnO₄': { name: __alloT('stem.titration.potassium_permanganate', 'Potassium Permanganate'), color: '#c026d3',
    working: 'Simulated working solution: 0.020 M potassium permanganate',
    classification: 'Example supplier SDS at 0.020 M: H412, harmful to aquatic life with long lasting effects. The exact bottle SDS controls.',
    hazards: ['Avoid release to the environment; staining does not show whether an exposure is harmless.'], firstAid: CHEM_FIRST_AID, disposal: CHEM_DISPOSAL },
  'H₂SO₄': { name: 'Sulfuric acid medium', color: '#f97316',
    working: 'Simulated acidic medium: 1 M sulfuric acid',
    classification: 'Supplier and formulation are not specified in this simulation — check the exact bottle SDS before bench work.',
    hazards: ['The redox calculation assumes an acidic medium; real preparation and hazards depend on the supplied solution.'], firstAid: CHEM_FIRST_AID, disposal: CHEM_DISPOSAL },
  'FeSO₄': { name: __alloT('stem.titration.ferrous_sulfate', 'Ferrous Sulfate'), color: '#65a30d',
    working: 'Simulated working solution: 0.020 M iron(II) sulfate',
    classification: 'Supplier and formulation are not specified in this simulation — check the exact bottle SDS before bench work.',
    hazards: ['Avoid ingestion, splashes, and release to drains or the environment.'], firstAid: CHEM_FIRST_AID, disposal: CHEM_DISPOSAL },
  'Antacid': { name: __alloT('stem.titration.antacid_tablet_caco_mg_oh', 'Antacid Tablet Sample'), color: '#f472b6',
    working: 'Simulated processed mixture; exact tablet formulation is not specified',
    classification: 'Supplier and formulation are not specified — review the tablet label plus every reagent SDS used to prepare the sample.',
    hazards: ['The prepared sample also contains added laboratory reagents; treat it according to the complete procedure.'], firstAid: CHEM_FIRST_AID, disposal: CHEM_DISPOSAL }
};
})();var presetHazardKeys = {
  'sa_sb': ['HCl', 'NaOH'], 'wa_sb': ['CH\u2083COOH', 'NaOH'],
  'sa_wb': ['HCl', 'NH\u2083'], 'wa_wb': ['CH\u2083COOH', 'NH\u2083'],
  'poly_h3po4': ['H\u2083PO\u2084', 'NaOH'], 'redox_kmno4': ['FeSO\u2084', 'KMnO\u2084', 'H\u2082SO\u2084'],
  'back_antacid': ['Antacid', 'HCl', 'NaOH']
};

// ── Safety Checklist Items ──
var safetyItems = [
  { id: 'goggles', icon: '\uD83E\uDD7D', label: __alloT('stem.titration.safety_goggles_on', 'Safety goggles on'), desc: __alloT('stem.titration.splash_proof_chemical_safety_goggles_n', 'Splash-proof chemical safety goggles \u2014 not regular glasses') },
  { id: 'gloves', icon: '\uD83E\uDDE4', label: __alloT('stem.titration.nitrile_gloves_worn', 'Nitrile gloves worn'), desc: __alloT('stem.titration.protects_skin_from_corrosive_acids_and', 'No glove protects against every chemical. Select glove material from the SDS or a compatibility chart, and replace contaminated gloves immediately.') },
  { id: 'coat', icon: '\uD83E\uDD7C', label: __alloT('stem.titration.lab_coat_on', 'Lab coat on'), desc: __alloT('stem.titration.button_it_up_protects_clothing_and_ski', 'Button it up \u2014 protects clothing and skin from splashes') },
  { id: 'shoes', icon: '\uD83D\uDC5F', label: __alloT('stem.titration.closed_toe_shoes', 'Closed-toe shoes'), desc: __alloT('stem.titration.no_sandals_or_open_toed_shoes_in_the_c', 'No sandals or open-toed shoes in the chemistry lab') },
  { id: 'eyewash', icon: '\uD83D\uDEBF', label: __alloT('stem.titration.eyewash_station_located', 'Eyewash station located'), desc: __alloT('stem.titration.know_where_it_is_before_you_start_you_', 'Know its location before work begins. If splashed, start flushing immediately, alert the teacher, and follow the SDS/local emergency plan.') },
  { id: 'extinguisher', icon: '\uD83E\uDDEF', label: __alloT('stem.titration.fire_extinguisher_located', 'Fire extinguisher located'), desc: __alloT('stem.titration.acetic_acid_is_flammable_know_your_nea', 'Know the alarm, exit route, and extinguisher location. Hazard classification depends on the exact formulation and concentration.') },
  { id: 'sds', icon: '\uD83D\uDCCB', label: __alloT('stem.titration.sds_reviewed_for_chemicals', 'SDS reviewed for chemicals'), desc: __alloT('stem.titration.safety_data_sheets_list_all_hazards_pp', 'Safety Data Sheets list all hazards, PPE, and emergency procedures') }
];

// ── Contextual Safety Tips ──
var safetyTips = {
  firstDrip: { icon: '\uD83D\uDCA7', text: __alloT('stem.titration.always_add_titrant_slowly_near_the_exp', 'Always add titrant slowly near the expected endpoint. A single drop can change the pH dramatically!'), color: '#38bdf8' },
  nearEquiv: { icon: '\u26A0\uFE0F', text: __alloT('stem.titration.the_ph_is_changing_rapidly_in_a_real_l', 'The pH is changing rapidly! In a real lab, switch to drop-by-drop addition and swirl after each drop.'), color: '#f59e0b' },
  overshot: { icon: '\u274C', text: __alloT('stem.titration.you_overshot_the_equivalence_point_in_', 'You overshot the equivalence point! In a real lab, you would need to restart with a fresh sample.'), color: '#ef4444' },
  reset: { icon: '\u267B\uFE0F', text: __alloT('stem.titration.good_lab_practice_always_rinse_the_bur', 'Before first use or a reagent change, rinse the burette as the reviewed procedure directs, condition it with titrant, remove the filling funnel, clear tip bubbles, check for leaks, and record the initial reading.'), color: '#22c55e' },
  halfEquiv: { icon: '\uD83E\uDDEA', text: __alloT('stem.titration.at_the_half_equivalence_point_ph_pka_t', 'At the half-equivalence point, pH = pKa. This is the center of the buffer region!'), color: '#a78bfa' },
  halfEquivRedox: { icon: '\u26A1', text: __alloT('stem.titration.at_half_equivalence_e_equals_e0', 'At half-equivalence exactly half the Fe\u00B2\u207A has been oxidised, so [Fe\u00B3\u207A] = [Fe\u00B2\u207A], the log term in the Nernst equation goes to zero, and the electrode reads E\u00B0 for the couple itself \u2014 the redox twin of pH = pKa.'), color: '#a78bfa' },
  redoxWarning: { icon: '\uD83D\uDCAB', text: __alloT('stem.titration.kmno_is_a_strong_oxidizer_in_a_real_la', 'KMnO\u2084 is an oxidizer. Follow the reviewed procedure and exact SDS, keep it away from incompatible organics, and use the specified engineering controls. Purple drops decolorize before equivalence; the first faint pink that persists after swirling is the visual endpoint.'), color: '#c026d3' },
  polyprotic: { icon: '\uD83D\uDD2C', text: __alloT('stem.titration.polyprotic_acids_have_multiple_equival', 'H\u2083PO\u2084 has several neutralization stages. This activity focuses on the first stage; later stages require more titrant and may be less distinctly resolved in water.'), color: '#06b6d4' },
  backTitration: { icon: '\uD83D\uDC8A', text: __alloT('stem.titration.in_a_back_titration_you_add_excess_aci', 'In a back-titration, you add EXCESS acid first, then titrate the leftover acid. This works for insoluble analytes like CaCO\u2083.'), color: '#f472b6' },
  acidToWater: { icon: '\uD83D\uDCA5', text: __alloT('stem.titration.never_add_water_to_concentrated_acid_a', 'NEVER add water to concentrated acid! Always add acid TO water. "Do as you oughta \u2014 add acid to water." The exothermic reaction can cause dangerous splashing.'), color: '#ef4444' },
  fumeHood: { icon: '\uD83C\uDF2C\uFE0F', text: __alloT('stem.titration.when_using_volatile_reagents_like_nh_o', 'When using volatile reagents like NH\u2083 or HCl (conc.), always work in a fume hood. Breathing acid/base fumes damages lung tissue.'), color: '#a855f7' },
  meniscus: { icon: '\uD83D\uDC41\uFE0F', text: __alloT('stem.titration.read_the_burette_at_the_bottom_of_the_', 'Read at eye level. Use the bottom of a clear concave meniscus; for dark or opaque titrants such as permanganate, follow the reviewed top-meniscus method. Record both initial and final readings to calculate the titre.'), color: '#38bdf8' }
};

// ── Lab Incident Scenarios ──
var incidentScenarios = [
  { id: 'acid_splash', title: __alloT('stem.titration.acid_splash_on_skin', 'Acid Splash on Skin!'), icon: '\uD83D\uDCA6', desc: __alloT('stem.titration.while_pouring_hcl_some_splashes_on_you', 'While pouring HCl, some splashes on your forearm.'), urgency: 'high',
    correct: 'rinse', options: [
      { id: 'rinse', label: __alloT('stem.titration.remove_clothing_rinse_under_running_wa', 'Immediately rinse under running water for at least 15 minutes and alert the teacher'), icon: '\uD83D\uDEB0', correct: true, feedback: __alloT('stem.titration.correct_immediate_and_prolonged_rinsin', 'Correct! Immediate and prolonged rinsing for at least 15 minutes is critical. Alert the teacher, follow the local emergency plan, and do not try to neutralize a chemical on the body.') },
      { id: 'wipe', label: __alloT('stem.titration.wipe_it_off_with_a_paper_towel', 'Wipe it off with a paper towel'), icon: '\uD83E\uDDF4', correct: false, feedback: __alloT('stem.titration.wrong_wiping_can_spread_the_acid_and_p', 'WRONG! Wiping can spread the acid and push it into your skin. You need running water immediately.') },
      { id: 'neutralize', label: __alloT('stem.titration.apply_baking_soda_paste_directly_to_sk', 'Apply baking soda paste directly to skin'), icon: '\uD83E\uDDEA', correct: false, feedback: __alloT('stem.titration.not_recommended_the_neutralization_rea', 'Not recommended! The neutralization reaction generates heat (exothermic) which can cause additional burns. Water is always the first response.') },
      { id: 'ignore', label: __alloT('stem.titration.it_s_dilute_just_keep_working', 'It\'s dilute, just keep working'), icon: '\uD83E\uDD37', correct: false, feedback: __alloT('stem.titration.dangerous_even_dilute_acids_can_cause_', 'DANGEROUS! Even dilute acids can cause burns over time. Always treat chemical contact immediately.') }
    ]
  },
  { id: 'eye_contact', title: __alloT('stem.titration.chemical_splash_in_eyes', 'Chemical Splash in Eyes!'), icon: '\uD83D\uDC41\uFE0F', desc: __alloT('stem.titration.naoh_solution_splashes_into_your_eyes_', 'NaOH solution splashes into your eyes while swirling the flask.'), urgency: 'critical',
    correct: 'eyewash', options: [
      { id: 'eyewash', label: __alloT('stem.titration.go_to_eyewash_station_immediately_rins', 'Use the eyewash immediately, flush for at least 15 minutes, hold eyelids open, and alert the teacher'), icon: '\uD83D\uDEBF', correct: true, feedback: __alloT('stem.titration.correct_speed_is_everything_you_have_a', 'Start flushing immediately for at least 15 minutes, hold the eyelids open, and alert the teacher. Remove contact lenses only if they come out easily during rinsing, then follow the SDS/local plan and obtain medical evaluation as directed.') },
      { id: 'rub', label: __alloT('stem.titration.rub_your_eyes_and_blink_rapidly', 'Rub your eyes and blink rapidly'), icon: '\uD83D\uDE23', correct: false, feedback: __alloT('stem.titration.never_rub_this_spreads_the_chemical_ac', 'NEVER rub! This spreads the chemical across more of the eye surface and can scratch the cornea.') },
      { id: 'drops', label: __alloT('stem.titration.use_eye_drops_from_the_first_aid_kit', 'Use eye drops from the first aid kit'), icon: '\uD83D\uDC8A', correct: false, feedback: __alloT('stem.titration.eye_drops_are_insufficient_you_need_hi', 'Eye drops are insufficient! You need high-volume flushing for 15+ minutes. Eye drops cannot provide that.') },
      { id: 'wait', label: __alloT('stem.titration.finish_the_experiment_first_then_wash', 'Finish the experiment first, then wash'), icon: '\u23F0', correct: false, feedback: __alloT('stem.titration.extremely_dangerous_naoh_causes_alkali', 'Do not delay. Use the eyewash immediately, alert the teacher, and follow the SDS/local emergency plan. Alkali eye exposure can cause severe injury and requires prolonged flushing and prompt evaluation.') }
    ]
  },
  { id: 'spill_bench', title: __alloT('stem.titration.large_acid_spill_on_bench', 'Large Acid Spill on Bench!'), icon: '\uD83E\uDDEA', desc: __alloT('stem.titration.you_knock_over_the_beaker_of_0_1m_hcl_', 'You knock over the beaker of 0.1M HCl, spilling ~200 mL across the bench.'), urgency: 'medium',
    correct: 'contain', options: [
      { id: 'contain', label: __alloT('stem.titration.alert_others_contain_with_absorbent_ne', 'Alert the teacher, keep others away, and follow the approved spill-response plan'), icon: '\u2705', correct: true, feedback: __alloT('stem.titration.perfect_procedure_1_alert_nearby_stude', 'Correct first response: alert the teacher, isolate the area, consult the SDS/local plan, and let trained personnel choose any compatible spill kit or cleanup method. Students should not neutralize or clean an unknown spill.') },
      { id: 'water', label: __alloT('stem.titration.just_flood_it_with_lots_of_water', 'Just flood it with lots of water'), icon: '\uD83D\uDCA7', correct: false, feedback: __alloT('stem.titration.partially_right_but_incomplete_floodin', 'Do not flood the spill. Alert the teacher, keep others away, and follow the approved spill-response plan.') },
      { id: 'leave', label: __alloT('stem.titration.tell_the_teacher_and_don_t_touch_it', 'Ask whether the experiment can continue after the teacher assesses the spill'), icon: '\uD83D\uDDE3\uFE0F', correct: false, feedback: __alloT('stem.titration.telling_the_teacher_is_good_but_at_0_1', 'The teacher must assess the chemical, concentration, and amount before deciding whether the experiment can continue. Alert the teacher and keep people away.') },
      { id: 'paper', label: __alloT('stem.titration.soak_it_up_with_paper_towels', 'Soak it up with paper towels'), icon: '\uD83E\uDDF4', correct: false, feedback: __alloT('stem.titration.paper_towels_are_not_appropriate_for_a', 'Paper towels are not appropriate for acid spills! They don\'t neutralize the acid and you\'ll be handling acid-soaked material. Use proper spill kits.') }
    ]
  },
  { id: 'gas_release', title: __alloT('stem.titration.mysterious_fumes_rising', 'Mysterious Fumes Rising!'), icon: '\uD83C\uDF2B\uFE0F', desc: __alloT('stem.titration.while_working_with_ammonia_nh_you_noti', 'While working with ammonia (NH\u2083), you notice a strong smell and your eyes start watering.'), urgency: 'high',
    correct: 'evacuate', options: [
      { id: 'evacuate', label: __alloT('stem.titration.move_the_experiment_to_the_fume_hood_i', 'Move away, warn others, alert the teacher, and follow evacuation instructions'), icon: '\uD83C\uDF2C\uFE0F', correct: true, feedback: __alloT('stem.titration.correct_volatile_chemicals_like_nh_mus', 'Correct first response: move away, warn others, alert the teacher, and follow evacuation instructions. Do not move an actively fuming reaction; the teacher or emergency responder decides whether to shut down, ventilate, or evacuate.') },
      { id: 'mask', label: __alloT('stem.titration.put_on_a_face_mask_and_continue', 'Put on a face mask and continue'), icon: '\uD83D\uDE37', correct: false, feedback: __alloT('stem.titration.a_regular_face_mask_does_not_protect_a', 'A regular face mask does NOT protect against chemical fumes! You need proper respiratory protection (not available in most teaching labs) or a fume hood.') },
      { id: 'fan', label: __alloT('stem.titration.fan_the_fumes_away_with_your_hand', 'Fan the fumes away with your hand'), icon: '\uD83D\uDC4B', correct: false, feedback: __alloT('stem.titration.fanning_is_for_wafting_to_detect_odors', 'Do not fan, sniff, or waft an irritating vapor. Move away, warn others, alert the teacher, and follow the local emergency plan.') },
      { id: 'continue', label: __alloT('stem.titration.it_s_just_a_little_smell_keep_going', 'It\'s just a little smell, keep going'), icon: '\uD83E\uDD37', correct: false, feedback: __alloT('stem.titration.dangerous_if_you_can_smell_nh_the_conc', 'Do not use odor to estimate exposure. Move away to fresh air, warn others, alert the teacher, and follow evacuation instructions; odor fatigue can make ammonia seem to disappear while exposure continues.') }
    ]
  },
  { id: 'mix_bleach', title: __alloT('stem.titration.someone_brought_bleach', 'Someone Brought Bleach!'), icon: 'SDS', desc: __alloT('stem.titration.a_classmate_suggests_cleaning_the_benc', 'A classmate suggests cleaning the bench with bleach while you still have ammonia solution open.'), urgency: 'critical',
    correct: 'stop', options: [
      { id: 'stop', label: __alloT('stem.titration.stop_them_immediately_bleach_ammonia_t', 'STOP them immediately! Bleach + ammonia = toxic chloramine gas'), icon: '\uD83D\uDED1', correct: true, feedback: __alloT('stem.titration.life_saving_action_naocl_2nh_2nh_cl_ch', 'Correct: stop the mixing, move away to fresh air, warn others, and alert the teacher. Do not add chemicals or attempt neutralization; responders decide how to isolate and ventilate the area.') },
      { id: 'ok', label: __alloT('stem.titration.sure_bleach_is_a_disinfectant_it_shoul', 'Sure, bleach is a disinfectant, it should be fine'), icon: '\uD83D\uDC4D', correct: false, feedback: __alloT('stem.titration.extremely_dangerous_mixing_bleach_naoc', 'EXTREMELY DANGEROUS! Mixing bleach (NaOCl) with ammonia produces toxic chloramine gas. This has caused deaths in laboratories and homes. NEVER mix bleach with any other chemical.') },
      { id: 'dilute', label: __alloT('stem.titration.it_should_be_fine_if_the_ammonia_is_di', 'It should be fine if the ammonia is diluted'), icon: '\uD83E\uDDEA', correct: false, feedback: __alloT('stem.titration.wrong_even_dilute_ammonia_reacts_with_', 'WRONG! Even dilute ammonia reacts with bleach to produce toxic chloramine gas. The reaction occurs at ANY concentration. There is no safe dilution for mixing these chemicals.') },
      { id: 'outside', label: __alloT('stem.titration.just_open_a_window_and_it_will_be_fine', 'Just open a window and it will be fine'), icon: '\uD83C\uDF2C\uFE0F', correct: false, feedback: __alloT('stem.titration.ventilation_does_not_make_it_safe_to_g', 'Ventilation does NOT make it safe to generate toxic gas! Chloramine causes immediate respiratory distress. Prevention is the only acceptable approach.') }
    ]
  }
];

// Every incident scenario authored its correct response FIRST (5 of 5), so
// the drill rendered "always pick A" — a bad habit to teach for lab safety.
// Rotate each scenario's options deterministically; grading is by option id
// and the correct id lives on the scenario, so nothing needs remapping.
incidentScenarios.forEach(function (sc, i) {
  if (!Array.isArray(sc.options) || sc.options.length < 2) return;
  var shift = (i * 7 + 3) % sc.options.length;
  if (!shift) return;
  sc.options = sc.options.slice(shift).concat(sc.options.slice(0, shift));
});

// ── Lab Equipment Guide Data ──
var labEquipment = [
  { id: 'burette', name: __alloT('stem.titration.burette', 'Burette'), icon: '\uD83E\uDDEA', desc: __alloT('stem.titration.delivers_precise_volumes_of_titrant', 'Delivers precise volumes of titrant.'),
    technique: 'Before first use or a reagent change, rinse and condition as directed. Remove the funnel, clear tip bubbles, check for leaks, and record an initial reading; it need not be 0.00 mL. Record the final reading and calculate titre = final \u2212 initial. Read the lower meniscus for clear solutions and use the reviewed method for dark solutions such as permanganate.',
    errors: ['Parallax error: eye not level with meniscus', 'Air bubbles in tip', 'Not pre-rinsing with titrant', 'Reading at top of meniscus instead of bottom'],
    safetyNote: 'Clamp securely! A falling burette with acid/base is a serious splash hazard.' },
  { id: 'erlenmeyer', name: __alloT('stem.titration.erlenmeyer_flask', 'Erlenmeyer Flask'), icon: '\u2697\uFE0F', desc: __alloT('stem.titration.holds_the_analyte_solution_being_titra', 'Holds the analyte solution being titrated.'),
    technique: 'Swirl gently (don\'t shake!) after each addition. A white tile underneath helps detect color changes. Rinse walls with distilled water from a wash bottle to ensure all analyte reacts.',
    errors: ['Violent shaking (splashes analyte out)', 'Not rinsing walls (loses analyte)', 'Using a beaker instead (harder to swirl, easier to spill)'],
    safetyNote: 'Hot glass looks the same as cold glass. Always use tongs for heated flasks.' },
  titrationAliquotEquipment(__alloT),
  { id: 'indicator', name: __alloT('stem.titration.ph_indicator', 'pH Indicator'), icon: '\uD83C\uDFA8', desc: __alloT('stem.titration.changes_color_to_signal_the_endpoint', 'Changes color to signal the endpoint.'),
    technique: 'Add only 2-3 drops. Too much indicator acts as a weak acid/base itself and shifts the endpoint! Choose an indicator whose transition range includes the equivalence pH.',
    errors: ['Adding too much indicator', 'Choosing wrong indicator for the titration type', 'Confusing endpoint with equivalence point'],
    safetyNote: 'Some indicators stain skin and clothing permanently. Wear gloves and a lab coat.' },
  { id: 'washbottle', name: __alloT('stem.titration.wash_bottle', 'Wash Bottle'), icon: '\uD83D\uDCA7', desc: __alloT('stem.titration.contains_distilled_water_for_rinsing', 'Contains distilled water for rinsing.'),
    technique: 'Use distilled water to rinse the inner flask walls so all analyte stays in the reaction mixture. Do not squirt water into the burette or its tip; if a hanging exterior drop must be transferred, follow the reviewed technique. Always label the bottle.',
    errors: ['Using tap water instead of distilled (introduces ions)', 'Adding too much rinse water (dilutes but doesn\'t affect moles)'],
    safetyNote: 'Never store anything other than distilled water in a wash bottle. Label everything!' }
].concat(titrationAdditionalEquipment(__alloT));

// ── Titration Challenge Questions ──
var challengeQuestions = [
  { q: 'What determines the PPE for a titration procedure?', opts: ['The reviewed procedure, risk assessment, and exact SDS', 'Concentration alone', 'Whether the liquid has a strong smell', 'Personal preference'], answer: __alloT('stem.titration.goggles_gloves_and_lab_coat', 'The reviewed procedure, risk assessment, and exact SDS'), xp: 10, category: 'safety',
    feedback: __alloT('stem.titration.all_three_are_mandatory_goggles_protec', 'Use the protection specified by the reviewed procedure and exact SDS. Chemical-splash goggles and protective clothing are common baseline controls; glove material and any additional face protection must match the actual hazard.') },
  { q: 'You spill acid on your skin. What is your FIRST action?', opts: ['Apply baking soda', 'Rinse with running water for 15+ min', 'Wipe with a dry cloth', 'Apply burn cream'], answer: __alloT('stem.titration.rinse_with_running_water_for_15_min', 'Rinse with running water for 15+ min'), xp: 15, category: 'safety',
    feedback: __alloT('stem.titration.water_first_always_the_15_minute_rinse', 'Water first, always! The 15-minute rinse is critical. Neutralizers can cause exothermic reactions on skin.') },
  { q: 'What is the equivalence point?', opts: ['Where the indicator changes color', 'Where titrant and analyte have been mixed in the stoichiometric ratio from the balanced reaction', 'Where pH = 7', 'Where you stop adding titrant'], answer: __alloT('stem.titration.where_moles_of_acid_moles_of_base', 'Where titrant and analyte have been mixed in the stoichiometric ratio from the balanced reaction'), xp: 10, category: 'theory',
    feedback: __alloT('stem.titration.the_equivalence_point_is_the_stoichiom', 'The equivalence point is the stoichiometric point. The pH at equivalence depends on acid/base strength \u2014 it\'s only pH 7 for strong acid + strong base.') },
  { q: 'Why do we add acid TO water, never water to acid?', opts: ['It\'s just tradition', 'Water is denser than acid', 'The exothermic reaction can cause violent boiling and splashing', 'It doesn\'t matter with dilute solutions'], answer: __alloT('stem.titration.the_exothermic_reaction_can_cause_viol', 'The exothermic reaction can cause violent boiling and splashing'), xp: 15, category: 'safety',
    feedback: __alloT('stem.titration.when_water_hits_concentrated_acid_the_', 'When water hits concentrated acid, the heat released can boil the water instantly, causing a violent splash of hot acid. Adding acid to water spreads the heat through a larger water volume.') },
  { q: 'For a weak acid + strong base titration, the equivalence pH is:', opts: ['Exactly 7', 'Below 7', 'Above 7', 'Cannot be determined'], answer: __alloT('stem.titration.above_7', 'Above 7'), xp: 10, category: 'theory',
    feedback: __alloT('stem.titration.at_equivalence_only_the_conjugate_base', 'At equivalence, only the conjugate base (A\u207B) remains. Conjugate bases of weak acids are themselves weak bases, making the solution basic (pH > 7).') },
  { q: 'Phenolphthalein is best for which titration type?', opts: ['Strong acid + Strong base or Weak acid + Strong base', 'Strong acid + Weak base', 'Both weak', 'Redox titrations'], answer: __alloT('stem.titration.strong_acid_strong_base_or_weak_acid_s', 'Strong acid + Strong base or Weak acid + Strong base'), xp: 10, category: 'theory',
    feedback: __alloT('stem.titration.phenolphthalein_transitions_at_ph_8_2_', 'Phenolphthalein transitions at pH 8.2-10.0, which matches the basic equivalence pH of weak acid + strong base titrations. It also works for SA+SB since the sharp jump crosses its range.') },
  { q: 'Which pair is especially dangerous to combine with bleach?', opts: ['Ammonia or acids', 'Only distilled water under an approved dilution procedure', 'An empty, clean container', 'None of these'], answer: __alloT('stem.titration.ammonia_or_acids', 'Ammonia or acids'), xp: 20, category: 'safety',
    feedback: __alloT('stem.titration.bleach_ammonia_chloramine_gas_toxic_bl', 'Bleach + ammonia = chloramine gas (toxic). Bleach + acid = chlorine gas (toxic). Both can cause severe respiratory injury or death. NEVER combine bleach with any chemical.') },
  { q: 'A burette reading of 23.45 mL has how many significant figures?', opts: ['2', '3', '4', '5'], answer: '4', xp: 10, category: 'technique',
    feedback: __alloT('stem.titration.23_45_has_4_significant_figures_the_la', '23.45 has 4 significant figures. The last digit (5) is estimated between the graduations. Burettes are precise to \u00B10.05 mL.') },
  { q: 'What happens at the half-equivalence point of a weak acid titration?', opts: ['pH = 7', 'pH = pKa', 'pH = pKb', 'The indicator changes'], answer: __alloT('stem.titration.ph_pka', 'pH = pKa'), xp: 15, category: 'theory',
    feedback: __alloT('stem.titration.at_half_equivalence_ha_a_so_henderson_', 'At half-equivalence, [HA] = [A\u207B], so Henderson\u2013Hasselbalch gives pH = pKa + log(1) = pKa. This is the center of the buffer region.') },
  { q: 'How is a face shield used when the risk assessment requires one?', opts: ['Over chemical-splash goggles as additional protection', 'Instead of goggles', 'Only with ordinary glasses', 'As respiratory protection'], answer: __alloT('stem.titration.when_handling_1m_concentrated_acids_or', 'Over chemical-splash goggles as additional protection'), xp: 15, category: 'safety',
    feedback: __alloT('stem.titration.face_shields_provide_splash_protection', 'A face shield supplements chemical-splash goggles; it does not replace them. The exact SDS, procedure, and risk assessment determine when additional face protection is required.') }
];

// ── State with defaults ──

var presetId = presets.some(function (p) { return p.id === d.presetId; }) ? d.presetId : 'sa_sb';
var preset = presets.find(function (p) { return p.id === presetId; }) || presets[0];

var indicatorId = indicators.some(function (ind) { return ind.id === d.indicator; }) ? d.indicator : 'phenolphthalein';
var indicator = indicators.find(function (ind) { return ind.id === indicatorId; }) || indicators[0];

// Exploratory curves may extend beyond one physical burette fill (for example the
// third H3PO4 equivalence). The apparatus still shows a 50 mL instrument; the graph
// state is therefore bounded by a generous experiment window, not glass capacity.
var volumeAdded = titrFinite(d.volumeAdded, 0, 0, 150);
var safetyChecked = !!d.safetyChecked;
var safetyChecks = d.safetyChecks && typeof d.safetyChecks === 'object' ? d.safetyChecks : {};
var showSafetyRef = !!d.showSafetyRef;
var showHazards = !!d.showHazards;
var allSafetyChecked = safetyItems.every(function(item) { return safetyChecks[item.id]; });
var prevVolume = titrFinite(d._prevVolume, 0, 0, 80);
var validTabs = ['titrate', 'challenge', 'incidents', 'equipment', 'molarity', 'buffers'];
var labTab = validTabs.indexOf(d.labTab) >= 0 ? d.labTab : 'titrate';
var titrationReduceMotion = !!d.titrationReduceMotion;
var additionAnimating = !titrationReduceMotion &&
  (d.additionAnimating === true || (d.additionAnimating == null && volumeAdded > prevVolume));
var titrationAnimPaused = !!d.titrationAnimPaused;
React.useEffect(function () {
  if (!additionAnimating) return;
  // 850 ms covered the falling drop and nothing after it, which left the endpoint
  // bloom in the 3D bench no window to be seen in at all.
  var delay = titrationReduceMotion ? 0 : 1750;
  var timer = setTimeout(function () {
    updMulti({ additionAnimating: false, _prevVolume: volumeAdded });
  }, delay);
  return function () { clearTimeout(timer); };
}, [additionAnimating, d.additionPulse, titrationReduceMotion, volumeAdded]);
var incidentIdx = titrIndex(d.incidentIdx, incidentScenarios.length);
var currentIncident = incidentScenarios[incidentIdx] || incidentScenarios[0];
var incidentAnswer = currentIncident && currentIncident.options.some(function (o) { return o.id === d.incidentAnswer; }) ? d.incidentAnswer : null;
var incidentScore = titrFinite(d.incidentScore, 0, 0);
var incidentCompleted = d.incidentCompleted && typeof d.incidentCompleted === 'object' ? d.incidentCompleted : {};
var challengeIdx = titrIndex(d.challengeIdx, challengeQuestions.length);
var currentChallenge = challengeQuestions[challengeIdx] || challengeQuestions[0];
var challengeAnswer = currentChallenge && currentChallenge.opts.indexOf(d.challengeAnswer) >= 0 ? d.challengeAnswer : null;
var challengeScore = titrFinite(d.challengeScore, 0, 0);
var challengeStreak = titrFinite(d.challengeStreak, 0, 0);
// ── Graded unknown-determination run (the Challenge tab's headline mode) ──
var chMode = d.chMode === 'quiz' ? 'quiz' : 'graded';
var gRun = Math.max(1, Math.floor(titrFinite(d.gRun, 1, 1)));
var gVb = titrFinite(d.gVb, 0, 0, BURETTE.CAPACITY_ML);
var gEyeCm = titrFinite(d.gEyeCm, 0, -BURETTE.MAX_EYE_CM, BURETTE.MAX_EYE_CM);
var gResult = normalizeTitrationResult(d.gResult, gRun);
var gTrials = normalizeTitrationTrials(d.gTrials, gRun);
var gStartMs = titrFinite(d.gStartMs, 0, 0);
var gLog = normalizeTitrationLog(d.gLog);
var gUnknown = makeUnknown(gRun);
var legacyZeroStart = d.gInitialTrue == null && gVb > 0;
var gInitialTrue = legacyZeroStart ? 0 : (isFinite(Number(d.gInitialTrue)) ? Number(d.gInitialTrue) : initialBuretteReading(gRun, gTrials.length));
gInitialTrue = Math.max(0, Math.min(BURETTE.CAPACITY_ML, gInitialTrue));
gVb = Math.max(0, Math.min(BURETTE.CAPACITY_ML - gInitialTrue, gVb));
var gInitialLocked = d.gInitialLocked != null ? !!d.gInitialLocked : legacyZeroStart;
var gInitialEyeCm = gInitialLocked && isFinite(Number(d.gInitialEyeCm))
  ? titrFinite(d.gInitialEyeCm, 0, -BURETTE.MAX_EYE_CM, BURETTE.MAX_EYE_CM)
  : (legacyZeroStart ? 0 : gEyeCm);
var gInitialRecorded = gInitialLocked && isFinite(Number(d.gInitialRecorded))
  ? roundBuretteReading(Number(d.gInitialRecorded))
  : readBurette(gInitialTrue, gEyeCm);
var gFinalTrue = Math.min(BURETTE.CAPACITY_ML, gInitialTrue + gVb);
var gFinalRecorded = readBurette(gFinalTrue, gEyeCm);
var gRecordedTitre = gInitialLocked ? roundBuretteDelta(gFinalRecorded - gInitialRecorded) : 0;
var gReadingPairValid = !gInitialLocked || (isFinite(gRecordedTitre) && gFinalRecorded > gInitialRecorded && gRecordedTitre > 0);
var hasEndpointMemory = d.gEndpointReachedAt !== null && d.gEndpointReachedAt !== '' &&
  typeof d.gEndpointReachedAt !== 'undefined' && isFinite(Number(d.gEndpointReachedAt));
var gEndpointReachedAt = hasEndpointMemory ? Number(d.gEndpointReachedAt) : null;
var gRecordedVb = gFinalRecorded;             // legacy name: absolute final reading
var gCapacityRemaining = Math.max(0, BURETTE.CAPACITY_ML - gFinalTrue);
var gFlaskPH = unknownPH(gUnknown.spec, gUnknown.flaskConc, gVb);
var showEquipGuide = d.showEquipGuide || false;
var selectedEquip = d.selectedEquip || null;
function selectEquipment(id) {
  if(id && !labEquipment.some(function(eq){return eq.id===id;}))return;
  upd('selectedEquip',id);
  if(id){
    focusTitrationRegion('titration-equipment-detail-'+id);
    var chosen=labEquipment.find(function(eq){return eq.id===id;});
    if(typeof awardStemXP==='function')awardStemXP('equip-'+id,5,'Studied '+chosen.name);
  }
}
// The dilution calculator divides by C₁, so a stored 0 — or a cleared field, since
// Number('') is 0 and not NaN — printed "measure Infinity mL of stock solution with a
// pipette" and a water-to-add of -Infinity. The RAW value has to be judged before it
// is coerced, because coercion is what hides the empty string. Each field is then held
// at the minimum its own slider allows, so the panel can never be shown a value the UI
// itself would not let you pick.
function titrNum(raw, fallback, min) {
  if (raw == null || raw === '') return fallback;
  var n = Number(raw);
  if (!isFinite(n)) return fallback;
  return min != null && n < min ? min : n;
}
var molarityCalcC1 = titrNum(d.molarityC1, 1.0, 0.01);
var molarityCalcV1 = titrNum(d.molarityV1, 10, 1);
var molarityCalcC2 = titrNum(d.molarityC2, 0.1, 0.001);
var dilutionC2 = Math.min(molarityCalcC2, molarityCalcC1);
var dilutionStockMl = dilutionC2 * molarityCalcV1 / molarityCalcC1;
var dilutionTargetAdjusted = molarityCalcC2 > molarityCalcC1;
var accuracyLog = d.accuracyLog || [];

var curveMaxVol = preset.redox ? 12 : preset.polyprotic ? 80 : 50;
volumeAdded = Math.max(0, Math.min(curveMaxVol, volumeAdded));
prevVolume = Math.max(0, Math.min(curveMaxVol, prevVolume));
var xTicks = curveMaxVol <= 15 ? [0, 2, 4, 5, 6, 8, 10, 12] :
  curveMaxVol <= 50 ? [0, 10, 20, 25, 30, 40, 50] :
  [0, 10, 20, 30, 40, 50, 60, 70, 80];

var Veq = (preset.concAcid * preset.volAcid) / preset.concBase;
// Per-preset equivalence volume. The acid–base formula above is right for the
// standard presets, but redox (5:1 Fe²⁺:MnO₄⁻) and back-titration (only the
// leftover excess acid is titrated) reach equivalence at a different volume —
// and calcPH already inflects there, so the chart marker/tips must match it.
if (preset.redox) Veq = Veq / 5;
else if (preset.backTitration) Veq = ((preset.excessAcidMoles || 0.003) / preset.concBase) * 1000;

var Kw = 1e-14;

// Determine active safety tip. NOTE: Veq/curveMaxVol/Kw are declared ABOVE this block on
// purpose — they used to be declared just below it, and `var` hoisting left Veq
// `undefined` here, so the halfEquiv / nearEquiv / overshot tips silently never fired.
var activeTip = null;
if (safetyChecked && labTab === 'titrate') {
  if (preset.redox && volumeAdded < 1) activeTip = safetyTips.redoxWarning;
  else if (preset.polyprotic && volumeAdded < 1) activeTip = safetyTips.polyprotic;
  else if (preset.backTitration && volumeAdded < 1) activeTip = safetyTips.backTitration;
  else if (volumeAdded > 0 && volumeAdded <= 0.5 && prevVolume === 0) activeTip = safetyTips.firstDrip;
  else if ((presetId === 'sa_wb' || presetId === 'wa_wb') && volumeAdded > 1 && volumeAdded < 3) activeTip = safetyTips.fumeHood;
  else if (volumeAdded > 5 && volumeAdded < 7) activeTip = safetyTips.meniscus;
  else if (preset.Ka && Math.abs(volumeAdded - Veq/2) < 1) activeTip = safetyTips.halfEquiv;
  else if (preset.redox && Math.abs(volumeAdded - Veq/2) < 0.6) activeTip = safetyTips.halfEquivRedox;
  else if (volumeAdded > Veq - 2 && volumeAdded < Veq + 0.5) activeTip = safetyTips.nearEquiv;
  else if (volumeAdded > Veq + 3) activeTip = safetyTips.overshot;
}



// ── Redox Potentiometry (Nernst) ──
// The Fe(II)/KMnO4 preset is not an acid-base titration, and what a real lab plots for it
// is not pH: it is the potential of a Pt indicator electrode against a reference, read on a
// potentiometer. Modelled from the two half-reactions in the 1 M H2SO4 medium:
//
//   Fe3+ + e-                  -> Fe2+                 E0 = +0.771 V   (n = 1)
//   MnO4- + 8 H+ + 5 e-        -> Mn2+ + 4 H2O         E0 = +1.507 V   (n = 5)
//   overall: 5 Fe2+ + MnO4- + 8 H+ -> 5 Fe3+ + Mn2+ + 4 H2O
//
// E0 values are the standard (1 M H+) ones. Real 1 M H2SO4 shifts the iron couple down to a
// FORMAL potential near 0.68 V because sulfate complexes Fe3+ — the explainer in the UI says
// so; we plot the standard couple so the numbers match the E0 table students are given.
var REDOX = {
  E0_FE: 0.771,   // V, Fe3+|Fe2+
  E0_MN: 1.507,   // V, MnO4-|Mn2+ at [H+] = 1 M
  nFE: 1,
  nMN: 5,
  H_COEFF: 8,     // H+ in the permanganate half-reaction
  S: 0.05916,     // V, 2.303RT/F at 25 C
  pH: 0,          // 1 M H2SO4 medium, [H+] ~ 1 M
  // A real flask always carries a trace of Fe3+ from air oxidation. Without it the
  // Fe3+|Fe2+ potential is undefined at V = 0 (log of zero); 1 part in 10^4 is the usual
  // order of magnitude and starts the curve near 0.53 V, where real curves start.
  TRACE_FE3: 1e-4
};

// Equivalence potential. Add the two Nernst equations weighted by their electron counts:
// at equivalence [Fe3+] = 5[Mn2+] and [Fe2+] = 5[MnO4-], so every concentration term
// cancels and only the H+ term from the permanganate half-reaction survives.
//   E_eq = (nFe*E0_Fe + nMn*E0_Mn)/(nFe + nMn) - (8*S/(nFe + nMn))*pH
// At pH 0 this is 1.384 V, the textbook value for Fe2+ titrated with MnO4-.
function redoxEquivE() {
  var n = REDOX.nFE + REDOX.nMN;
  return (REDOX.nFE * REDOX.E0_FE + REDOX.nMN * REDOX.E0_MN) / n
    - (REDOX.H_COEFF * REDOX.S / n) * REDOX.pH;
}

// Fraction of the Fe2+ that has been oxidised: 5 Fe2+ consumed per MnO4- delivered.
function redoxFraction(vol) {
  var molesFe = preset.concAcid * preset.volAcid / 1000;
  if (!(molesFe > 0)) return 0;
  return (preset.concBase * vol / 1000) * REDOX.nMN / molesFe;
}

// Cell potential in volts at a given titrant volume.
function calcE(vol) {
  var f = redoxFraction(vol);
  var eq = redoxEquivE();
  if (Math.abs(f - 1) < 1e-9) return eq;
  if (f < 1) {
    // Excess Fe2+ — the iron couple sets the potential:
    //   E = E0_Fe + S*log10([Fe3+]/[Fe2+]),  [Fe3+]/[Fe2+] = f/(1-f)
    var ratio = Math.max(f, REDOX.TRACE_FE3) / Math.max(1 - f, 1e-12);
    return Math.min(eq, REDOX.E0_FE + REDOX.S * Math.log10(ratio));
  }
  // Excess MnO4- — the permanganate couple takes over:
  //   E = E0_Mn + (S/5)*log10([MnO4-][H+]^8/[Mn2+]),  [MnO4-]/[Mn2+] = f-1
  var post = REDOX.E0_MN
    + (REDOX.S / REDOX.nMN) * (Math.log10(f - 1) - REDOX.H_COEFF * REDOX.pH);
  return Math.max(eq, post);
}

// ── pH Calculation Engine ──

function calcPH(vol) {

  // Handle back-titration (excess acid after antacid reaction)
  if (preset.backTitration) {
    var excessMoles = preset.excessAcidMoles || 0.003;
    var molesNaOH = preset.concBase * vol / 1000;
    var totalV = (preset.volAcid + vol) / 1000;
    var remaining = excessMoles - molesNaOH;
    if (remaining > 1e-7) return Math.max(0, Math.min(14, -Math.log10(remaining / totalV)));
    if (remaining > -1e-7) return 7;
    return Math.max(0, Math.min(14, 14 + Math.log10(-remaining / totalV)));
  }

  // Redox titration: pH is NOT the measured variable here — see calcE below. The
  // analyte is dissolved in ~1 M H2SO4 and the titration consumes no net H+ that the
  // medium does not swamp, so the pH is simply the (constant) pH of the medium.
  if (preset.redox) return REDOX.pH;

  // Triprotic-acid charge balance for H3PO4. This remains an ideal, dilute,
  // 25 C model, but unlike the former piecewise H-H approximation it is continuous
  // from the initial acid through the first equivalence region.
  if (preset.polyprotic) {
    var Kas = preset.polyprotic;
    var totalVP = (preset.volAcid + vol) / 1000;
    var phosphateTotal = (preset.concAcid * preset.volAcid / 1000) / totalVP;
    var sodiumTotal = (preset.concBase * vol / 1000) / totalVP;
    function phosphateChargeResidual(pHguess) {
      var hP = Math.pow(10, -pHguess);
      var k1 = Kas[0], k2 = Kas[1], k3 = Kas[2];
      var denom = hP * hP * hP + k1 * hP * hP + k1 * k2 * hP + k1 * k2 * k3;
      var avgNegativeCharge = (k1 * hP * hP + 2 * k1 * k2 * hP + 3 * k1 * k2 * k3) / Math.max(denom, 1e-300);
      return hP + sodiumTotal - Kw / hP - phosphateTotal * avgNegativeCharge;
    }
    var lowPH = 0, highPH = 14;
    for (var pi = 0; pi < 80; pi++) {
      var midPH = (lowPH + highPH) / 2;
      if (phosphateChargeResidual(midPH) > 0) lowPH = midPH;
      else highPH = midPH;
    }
    return (lowPH + highPH) / 2;
  }

  var Ca = preset.concAcid, Va = preset.volAcid, Cb = preset.concBase, Vb = vol;

  var Ka = preset.Ka, Kb = preset.Kb;

  var molesAcid = Ca * Va / 1000;

  var molesBase = Cb * Vb / 1000;

  var totalVolL = (Va + Vb) / 1000;

  if (Vb <= 0.001) {

    if (Ka) return Math.max(0, Math.min(14, -Math.log10(Math.sqrt(Ka * Ca))));

    return Math.max(0, Math.min(14, -Math.log10(Ca)));

  }

  var excess = molesAcid - molesBase;

  if (excess > 1e-7) {

    // Before equivalence: excess acid

    if (!Ka && !Kb) return Math.max(0, Math.min(14, -Math.log10(excess / totalVolL)));

    if (Ka) {

      if (molesBase < 1e-7) return Math.max(0, Math.min(14, -Math.log10(Math.sqrt(Ka * (excess / totalVolL)))));

      var pKa = -Math.log10(Ka);

      // Henderson–Hasselbalch governs the buffer region, but very near the start
      // (only a trace of base added) it dips below the pure-weak-acid pH because
      // it ignores the acid's own dissociation. Take the higher (physically
      // correct) of the two so the curve rises monotonically from the initial pH.
      var hh = pKa + Math.log10(molesBase / excess);

      var weakAcidAlonePH = -Math.log10(Math.sqrt(Ka * (excess / totalVolL)));

      return Math.max(0, Math.min(14, Math.max(hh, weakAcidAlonePH)));

    }

    return Math.max(0, Math.min(14, -Math.log10(excess / totalVolL)));

  }

  if (excess > -1e-7) {

    // At equivalence

    if (!Ka && !Kb) return 7;

    if (Ka && !Kb) { var CbC = molesAcid / totalVolL; return Math.max(0, Math.min(14, 14 + Math.log10(Math.sqrt((Kw / Ka) * CbC)))); }

    if (!Ka && Kb) { var CaC = molesAcid / totalVolL; return Math.max(0, Math.min(14, -Math.log10(Math.sqrt((Kw / Kb) * CaC)))); }

    return Math.max(0, Math.min(14, 7 + 0.5 * (-Math.log10(Ka) + Math.log10(Kb))));

  }

  // After equivalence: excess base

  var excessBase = -excess;

  if (!Kb) return Math.max(0, Math.min(14, 14 + Math.log10(excessBase / totalVolL)));

  var pKb = -Math.log10(Kb);

  var pOH = pKb + Math.log10(molesAcid / excessBase);

  return Math.max(0, Math.min(14, 14 - pOH));

}



// ── Indicator Color ──

// Parse a hex or rgba() color into {r,g,b,a} and linearly interpolate two of them.
// Real indicators change color CONTINUOUSLY across their ~2 pH-unit transition range,
// so we blend colorLow→colorMid→colorHigh instead of snapping between three bands.
function _parseColor(c) {
  c = String(c).trim();
  if (c.charAt(0) === '#') {
    var hex = c.slice(1);
    if (hex.length === 3) hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: 1 };
  }
  var m = c.match(/rgba?\(([^)]+)\)/);
  if (m) { var p = m[1].split(',').map(function (x) { return parseFloat(x); }); return { r: p[0] || 0, g: p[1] || 0, b: p[2] || 0, a: p[3] == null ? 1 : p[3] }; }
  return { r: 128, g: 128, b: 128, a: 1 };
}
function _lerpColor(c1, c2, t) {
  var a = _parseColor(c1), b = _parseColor(c2);
  t = Math.max(0, Math.min(1, t));
  return 'rgba(' + Math.round(a.r + (b.r - a.r) * t) + ',' + Math.round(a.g + (b.g - a.g) * t) + ',' + Math.round(a.b + (b.b - a.b) * t) + ',' + (a.a + (b.a - a.a) * t).toFixed(3) + ')';
}

function indicatorColorFor(indicatorDefinition, pH, universal) {
  var ind = indicatorDefinition || indicators[0];
  var value = titrFinite(pH, 7, 0, 14);
  if (universal) {
    var hue = value <= 7 ? (value * 120 / 7) : (120 + (value - 7) * 160 / 7);
    return 'hsl(' + Math.round(hue) + ', 75%, 50%)';
  }
  if (value <= ind.low) return ind.colorLow;
  if (value >= ind.high) return ind.colorHigh;
  var mid = (ind.low + ind.high) / 2;
  if (value <= mid && mid > ind.low) return _lerpColor(ind.colorLow, ind.colorMid, (value - ind.low) / (mid - ind.low));
  if (ind.high > mid) return _lerpColor(ind.colorMid, ind.colorHigh, (value - mid) / (ind.high - mid));
  return ind.colorMid;
}
function getIndicatorColor(pH) {
  return indicatorColorFor(indicator, pH, indicatorId === 'universal');
}



function getFlaskColor(pH) {

  if (indicatorId === 'phenolphthalein' && pH < indicator.low) return 'rgba(200,220,255,0.25)';

  return getIndicatorColor(pH);

}



// Permanganate is self-indicating, so the redox flask has its own colour law: Fe2+ in
// sulfate is near-colourless, Fe3+ builds a pale straw yellow as the titration proceeds,
// and the first drop of unreacted MnO4- turns it faint pink — that pink IS the endpoint —
// deepening to purple as you overshoot. pH indicators play no part in any of this.
function getRedoxFlaskColor(f) {
  if (f <= 1) return _lerpColor('rgba(214,240,226,0.20)', 'rgba(250,236,170,0.38)', Math.max(0, f));
  return _lerpColor('rgba(250,236,170,0.38)', 'rgba(147,51,234,0.80)', Math.sqrt(Math.min(1, (f - 1) / 1.5)));
}

// ── What the y-axis actually measures ──
// Acid-base presets plot pH on a 0-14 scale. The redox preset plots the cell potential a Pt
// electrode reads, in volts — a different quantity on a different scale. Everything
// downstream (curve, gridlines, ticks, readouts, live region, SVG label) asks `yAxis`
// instead of assuming pH, so neither mode has to know about the other.
var isPotentiometric = !!preset.redox;

var yAxis = isPotentiometric ? {
  mode: 'E', min: 0.4, max: 1.6,
  grid: [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6],
  ticks: [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6],
  label: __alloT('stem.titration.axis_cell_potential', 'Cell potential (V)'),
  tick: function (y) { return y.toFixed(1); },
  readout: function (y) { return y.toFixed(3); },
  unit: ' V',
  speech: function (y) { return y.toFixed(3) + ' volts'; },
  at: calcE
} : {
  mode: 'pH', min: 0, max: 14,
  grid: [0, 2, 4, 6, 7, 8, 10, 12, 14],
  ticks: [0, 2, 4, 6, 8, 10, 12, 14],
  label: 'pH',
  tick: function (y) { return String(y); },
  readout: function (y) { return y.toFixed(2); },
  unit: '',
  speech: function (y) { return 'pH ' + y.toFixed(2); },
  at: calcPH
};

// ── Generate Titration Curve ──

var curveData = [];
if (safetyChecked && labTab === 'titrate') {
  for (var v = 0; v <= curveMaxVol; v += 0.2) {
    curveData.push({ vol: Math.round(v * 100) / 100, y: yAxis.at(v) });
  }
}

var currentPH = calcPH(volumeAdded);

var currentY = yAxis.at(volumeAdded);

var redoxF = isPotentiometric ? redoxFraction(volumeAdded) : 0;

var currentColor = isPotentiometric ? getRedoxFlaskColor(redoxF) : getFlaskColor(currentPH);
// The endpoint bloom: the transient swirl of colour where a drop lands. Its colour is
// what the indicator turns where the titrant is locally in excess — not the colour the
// bulk solution happens to be — and it lingers longer the nearer the addition is to
// equivalence, which is the cue students are told to watch for. Derived once here and
// used by BOTH the 3D bench and the 2D flask.
var endpointBloomColor = isPotentiometric ? '#a855f7' : indicator.colorHigh;
var endpointBloomHold = Math.max(0, Math.min(1, 1 - Math.abs(volumeAdded - Veq) / Math.max(1, Veq * 0.12)));
var endpointBloomMs = Math.round(420 + endpointBloomHold * 900);

// The flask colour doubles as the colour of the big numeric readout — but a flask tint
// is chosen to look like a liquid, not to be read as text on a dark card. Measured in a
// real browser, phenolphthalein's colourless state (rgba(200,220,255,0.25)) gave the pH
// number a contrast of 1.95:1 against the panel: the headline value of the whole
// simulation, effectively invisible, in the tool's most-used state.
//
// So the readout takes an opaque, legible stand-in whenever the flask colour is too
// faint to read. The flask itself is unchanged — it should look like what is in the
// flask; only the NUMBER swaps to something a student can actually see.
// Text laid ON a coloured chip: pick whichever of near-black or white the accent
// actually contrasts with. Forcing either one uniformly fails at the other end of the
// palette — white sat at 2.1:1 on the sky-400 tab, and near-black at 3.8:1 on the
// magenta redox chip.
function titrOnColor(hex) {
  var p = _parseColor(hex);
  var lin = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  var L = 0.2126 * lin(p.r) + 0.7152 * lin(p.g) + 0.0722 * lin(p.b);
  var withDark = (L + 0.05) / (0.0114 + 0.05);      // vs #0f172a
  var withWhite = (1.05) / (L + 0.05);
  return withDark >= withWhite ? '#0f172a' : '#ffffff';
}

function readoutSafeColor(c) {
  var p = _parseColor(c);
  if (p.a >= 0.75) {
    // Opaque enough to keep, unless it is simply too dark for a dark background.
    var lum = (0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b) / 255;
    if (lum >= 0.38) return c;
  }
  return '#e2e8f0';                 // slate-200: ~12:1 on these panels
}
var readoutColor = isPotentiometric
  ? (redoxF > 1 ? '#e879f9' : '#fde68a')
  : readoutSafeColor(currentColor);

var equivalenceTolerance = Math.max(0.05, Math.min(0.2, curveMaxVol / 500));
var atEquivalence = Math.abs(volumeAdded - Veq) <= equivalenceTolerance;
var pastEquivalence = volumeAdded > Veq + equivalenceTolerance;

var equivPH = calcPH(Veq);

var equivY = yAxis.at(Veq);

// Endpoint status. For redox this is the self-indicating pink, not an indicator band:
// the endpoint is the first faint lasting colour from a tiny excess of MnO4-.
var indicatorStatus = isPotentiometric

  ? (redoxF < 1 ? 'Before endpoint' : redoxF <= 1.05 ? 'At endpoint' : 'Past endpoint')

  : currentPH < indicator.low ? 'Before endpoint' :

  currentPH > indicator.high ? 'Past endpoint' : 'At endpoint';

// ── Endpoint vs. equivalence (the single most important practical titration idea) ──
// An indicator is suitable when its transition occurs within the steep curve region,
// so the predicted endpoint volume has acceptably small bias. The equivalence pH does
// not need to sit inside the transition interval (phenolphthalein in SA/SB is the
// familiar counterexample). Weak-acid/weak-base curves have no sharp visual endpoint.
var indicatorAnalysisOn = safetyChecked && labTab === 'titrate' &&
  indicatorId !== 'universal' && !preset.redox && !preset.backTitration && !preset.polyprotic;
var visualIndicatorUnsuitable = !!(preset.Ka && preset.Kb);
var indicatorTargetPH = (indicator.low + indicator.high) / 2;
var endpointVol = null;
if (indicatorAnalysisOn && calcPH(curveMaxVol) >= indicatorTargetPH) {
  var endpointLow = 0, endpointHigh = curveMaxVol;
  for (var endpointIter = 0; endpointIter < 60; endpointIter++) {
    var endpointMid = (endpointLow + endpointHigh) / 2;
    if (calcPH(endpointMid) < indicatorTargetPH) endpointLow = endpointMid;
    else endpointHigh = endpointMid;
  }
  endpointVol = (endpointLow + endpointHigh) / 2;
}
var titrationErrorMl = (indicatorAnalysisOn && endpointVol != null) ? Math.abs(endpointVol - Veq) : 0;
var titrationErrorPct = (indicatorAnalysisOn && Veq > 0) ? (titrationErrorMl / Veq * 100) : 0;
var indicatorMaxBiasMl = Math.max(0.10, Veq * 0.01);
var indicatorMismatch = indicatorAnalysisOn && (visualIndicatorUnsuitable || endpointVol == null || titrationErrorMl > indicatorMaxBiasMl);

// WCAG 4.1.3: React owns this polite status node; its text changes only when the
// measured volume/status changes during a render.
var titrationLiveText = volumeAdded.toFixed(1) + ' mL added. ' + yAxis.speech(currentY) + '. ' + indicatorStatus + '.';

// ── XP Awards (window-level flag prevents re-render loop) ──

if (!window._titrationXPFlags) window._titrationXPFlags = {};
React.useEffect(function () {
  if (d._firstRun || window._titrationXPFlags[presetId + '_first']) return;
  window._titrationXPFlags[presetId + '_first'] = true;
  upd('_firstRun', true);
  if (typeof awardStemXP === 'function') awardStemXP('titrationLab', 5, 'First titration');
}, [presetId, !!d._firstRun]);
React.useEffect(function () {
  if (!pastEquivalence || d._reachedEquiv || window._titrationXPFlags[presetId + '_equiv']) return;
  window._titrationXPFlags[presetId + '_equiv'] = true;
  upd('_reachedEquiv', true);
  if (typeof awardStemXP === 'function') awardStemXP('titrationLab', 5, 'Reached equivalence point');
}, [presetId, pastEquivalence, !!d._reachedEquiv]);



// ── SVG Chart Dimensions ──

var svgW = 700, svgH = 300;

var pad = { top: 20, right: 20, bottom: 40, left: 50 };

var chartW = svgW - pad.left - pad.right;

var chartH = svgH - pad.top - pad.bottom;

var xScale = function (v) { return pad.left + (v / curveMaxVol) * chartW; };

// Maps the plotted quantity (pH 0-14, or volts over the redox window) onto the chart,
// clamped so a value outside the window rides the edge instead of drawing off-canvas.
var yScale = function (val) {
  var t = (val - yAxis.min) / (yAxis.max - yAxis.min);
  return pad.top + chartH - Math.max(0, Math.min(1, t)) * chartH;
};



// Build SVG path for full curve and current progress curve

var fullPath = '', currentPath = '';

curveData.forEach(function (pt, i) {

  var x = xScale(pt.vol).toFixed(1);

  var y = yScale(pt.y).toFixed(1);

  var cmd = i === 0 ? 'M' : 'L';

  fullPath += cmd + x + ' ' + y + ' ';

  if (pt.vol <= volumeAdded + 0.1) currentPath += cmd + x + ' ' + y + ' ';

});



// Indicator transition zone on chart

var zoneY1 = yScale(indicator.high);

var zoneY2 = yScale(indicator.low);

var zoneH = zoneY2 - zoneY1;



// Burette dimensions

var buretteH = 260, buretteW = 36;

// Where the meniscus sits, in pixels from the top of the barrel: the SAME mapping the
// scale markings use (yPos = ml / curveMaxVol * buretteH), so the line lands exactly on the
// graduation it is meant to read.
var physicalBuretteReading = volumeAdded <= BURETTE.CAPACITY_ML
  ? volumeAdded
  : volumeAdded % BURETTE.CAPACITY_ML;
if (physicalBuretteReading === 0 && volumeAdded > 0) physicalBuretteReading = BURETTE.CAPACITY_ML;
var physicalRefills = Math.max(0, Math.ceil(volumeAdded / BURETTE.CAPACITY_ML) - 1);
var meniscusTop = Math.round(Math.min(BURETTE.CAPACITY_ML, Math.max(0, physicalBuretteReading)) / BURETTE.CAPACITY_ML * buretteH);
// Titrant left in the barrel: everything BELOW the meniscus, down to the stopcock.
var liquidH = buretteH - meniscusTop;

// Flask level. The drawn cone runs from y = 25 (neck, full) to y = 72 (base, empty) in
// the flask SVG below. What is IN the flask is the aliquot plus everything delivered so
// far, so the surface has to climb as the burette drains — it used to be pinned at the
// neck, which showed 50 mL of titrant going into a flask that never gained a drop.
var FLASK_Y_FULL = 25, FLASK_Y_EMPTY = 72;
var flaskFillFrac = Math.max(0, Math.min(1,
  (preset.volAcid + Math.min(curveMaxVol, Math.max(0, volumeAdded))) / (preset.volAcid + curveMaxVol)));
var flaskSurfaceY = FLASK_Y_EMPTY - flaskFillFrac * (FLASK_Y_EMPTY - FLASK_Y_FULL);
function addTitrantAmount(amt) {
  if(volumeAdded >= curveMaxVol)return;
  updMulti({volumeAdded:Math.min(curveMaxVol,Math.round((volumeAdded+amt)*10)/10),_prevVolume:volumeAdded,additionPulse:(Number(d.additionPulse)||0)+1,additionAnimating:!titrationReduceMotion});
}
// Half-widths of the INNER wall at the surface, interpolated down the cone, so the
// liquid always meets the glass instead of floating inside it.
var _flaskT = (flaskSurfaceY - FLASK_Y_FULL) / (FLASK_Y_EMPTY - FLASK_Y_FULL);
var flaskSurfaceL = (buretteW / 2 + 10) + (4 - (buretteW / 2 + 10)) * _flaskT;
var flaskSurfaceR = (buretteW / 2 + 14) + ((buretteW + 32) - (buretteW / 2 + 14)) * _flaskT;



// ── Render ──

// ── Immersive Safety Walkthrough Gate ──
function focusTitrationRegion(id) {
  var active = typeof document !== 'undefined' ? document.activeElement : null;
  var ownerRoot = active && typeof active.closest === 'function'
    ? active.closest('[data-titration-instance]')
    : null;
  var ownerBoundary = ownerRoot && ownerRoot.parentElement;
  setTimeout(function() {
    var scope = ownerRoot && ownerRoot.isConnected ? ownerRoot : ownerBoundary;
    var region = scope && typeof scope.querySelector === 'function'
      ? scope.querySelector('#' + id)
      : (typeof document !== 'undefined' && document.getElementById(id));
    if (region && typeof region.focus === 'function') region.focus();
  }, 0);
}

if (!safetyChecked) {
  var safetyStation = d.safetyStation || 1;
  var labMapFound = d.labMapFound || {};
  var chemsReviewed = d.chemsReviewed || {};
  var drillActive = d.drillActive || false;
  var drillStartTime = d.drillStartTime || 0;
  var drillAnswer = d.drillAnswer || null;
  var drillResult = d.drillResult || null;
  var drillPaused = !!d.drillPaused;
  var drillPausedTimeLeft = d.drillPausedTimeLeft;
  var drillExtraSeconds = Math.max(0, Number(d.drillExtraSeconds) || 0);
  var mapTooltip = d.mapTooltip || null;
  var enterAnim = d.enterAnim || false;

  var ppeItems = safetyItems.slice(0, 4);
  var mapEquip = safetyItems.slice(4);
  var ppeComplete = ppeItems.every(function(it) { return safetyChecks[it.id]; });
  var mapComplete = mapEquip.every(function(it) { return labMapFound[it.id]; });
  var presChems = presetHazardKeys[presetId] || [];
  var chemsComplete = presChems.length > 0 && presChems.every(function(c) { return chemsReviewed[c]; });

  var drillForPreset = { 'sa_sb':0, 'wa_sb':2, 'sa_wb':3, 'wa_wb':4, 'poly_h3po4':0, 'redox_kmno4':1, 'back_antacid':2 };
  // Clamp drillIdx to a valid range — guards against incidentScenarios shrinking
  // in a future edit, or drillForPreset holding a stale index for a preset.
  var rawDrillIdx = drillForPreset[presetId] != null ? drillForPreset[presetId] : 0;
  var drillIdx = (incidentScenarios.length > 0)
    ? Math.max(0, Math.min(rawDrillIdx, incidentScenarios.length - 1))
    : 0;
  var drillScenario = incidentScenarios[drillIdx];
  var drillComplete = drillResult !== null;

  var drillDuration = 15 + drillExtraSeconds;
  var drillTimeLeft = drillPaused && drillPausedTimeLeft != null
    ? Math.max(0, Math.min(drillDuration, Number(drillPausedTimeLeft) || 0))
    : drillDuration;
  if (drillActive && drillStartTime && !drillPaused) {
    drillTimeLeft = Math.max(0, Math.ceil(drillDuration - (Date.now() - drillStartTime) / 1000));
  }

  var toggleDrillPause = function() {
    if (!drillActive || drillResult) return;
    if (drillPaused) {
      var resumeTimeLeft = drillPausedTimeLeft == null ? drillTimeLeft : Number(drillPausedTimeLeft);
      updMulti({
        drillPaused: false,
        drillPausedTimeLeft: null,
        drillStartTime: Date.now() - Math.max(0, drillDuration - resumeTimeLeft) * 1000
      });
    } else {
      updMulti({ drillPaused: true, drillPausedTimeLeft: drillTimeLeft });
    }
  };
  var extendDrill = function() {
    if (!drillActive || drillResult) return;
    updMulti({
      drillExtraSeconds: drillExtraSeconds + 15,
      drillPausedTimeLeft: drillPaused ? drillTimeLeft + 15 : drillPausedTimeLeft
    });
  };

  var allStationsComplete = ppeComplete && mapComplete && chemsComplete && drillComplete;
  var ppeCount = ppeItems.filter(function(it) { return safetyChecks[it.id]; }).length;
  var mapCount = mapEquip.filter(function(it) { return labMapFound[it.id]; }).length;
  var chemsCount = presChems.filter(function(c) { return chemsReviewed[c]; }).length;

  var stationDefs = [
    { id: 1, label: __alloT('stem.titration.suit_up', 'Suit Up'), icon: '\uD83E\uDDFA', color: '#f59e0b', complete: ppeComplete, progress: ppeCount + '/' + ppeItems.length },
    { id: 2, label: __alloT('stem.titration.lab_scan', 'Lab Scan'), icon: '\uD83D\uDD2C', color: '#38bdf8', complete: mapComplete, progress: mapCount + '/' + mapEquip.length },
    // red-500 is the one station accent too dark for 11-14 px on this ground: the
    // stepper label measured 4.4:1 and the SDS badge 3.8:1, while amber, sky and
    // orange all clear it comfortably. red-400 brings it into line with its siblings.
    { id: 3, label: __alloT('stem.titration.chemicals', 'Chemicals'), icon: 'SDS', color: '#f87171', complete: chemsComplete, progress: chemsCount + '/' + presChems.length },
    { id: 4, label: __alloT('stem.titration.safety_drill', 'Safety Drill'), icon: '\uD83D\uDEA8', color: '#f97316', complete: drillComplete, progress: drillComplete ? '1/1' : '0/1' }
  ];

  function canGoStation(n) {
    if (n === 1) return true;
    return stationDefs[n - 2].complete;
  }
  function goSafetyStation(n) {
    upd('safetyStation', n);
    focusTitrationRegion('titration-safety-station-' + n);
  }

  // ── PPE consequence data ──
  var ppeConsequences = {
    goggles: { risk: 'Chemical splash blindness', detail: __alloT('stem.titration.naoh_causes_alkali_burns_that_penetrat', 'A chemical splash can cause severe eye injury. Wear the eye protection specified by the procedure and start eyewash flushing immediately after any exposure.'), severity: 'critical' },
    gloves: { risk: 'Chemical burns on hands', detail: __alloT('stem.titration.concentrated_hcl_dissolves_skin_on_con', 'Concentrated HCl dissolves skin on contact. Even dilute acids cause irritation. Your hands are closest to the chemicals.'), severity: 'high' },
    coat: { risk: 'Skin burns and ruined clothing', detail: __alloT('stem.titration.a_splash_of_acid_or_base_will_burn_thr', 'A splash of acid or base will burn through clothing and skin. Lab coats provide a removable barrier layer.'), severity: 'high' },
    shoes: { risk: 'Foot burns from spills', detail: __alloT('stem.titration.a_dropped_beaker_sends_glass_and_chemi', 'A dropped beaker sends glass and chemicals across the floor. Open-toed shoes mean acid on bare feet.'), severity: 'medium' }
  };

  // ── Immersive CSS ──
  var safetyCSSText = '@keyframes safetyEquipGlow { 0% { opacity:0; transform:scale(0.3) rotate(-10deg); } 60% { opacity:1; transform:scale(1.1) rotate(2deg); } 100% { opacity:1; transform:scale(1) rotate(0); } } ' +
    '@keyframes safetyPulseRing { 0%,100% { box-shadow:0 0 0 0 rgba(56,189,248,0.6); } 50% { box-shadow:0 0 0 14px rgba(56,189,248,0); } } ' +
    '@keyframes safetyPulseGlow { 0%,100% { filter:drop-shadow(0 0 4px currentColor); } 50% { filter:drop-shadow(0 0 18px currentColor); } } ' +
    '@keyframes safetyFlipIn { 0% { transform:perspective(800px) rotateY(90deg); opacity:0; } 100% { transform:perspective(800px) rotateY(0); opacity:1; } } ' +
    '@keyframes safetyUrgencyPulse { 0%,100% { box-shadow:0 0 0 0 rgba(249,115,22,0); } 50% { box-shadow:0 0 24px 3px rgba(249,115,22,0.45); } } ' +
    '@keyframes safetyShake { 0%,100% { transform:translateX(0); } 10%,30%,50%,70%,90% { transform:translateX(-8px); } 20%,40%,60%,80% { transform:translateX(8px); } } ' +
    '@keyframes safetyFireGlow { 0%,100% { text-shadow:0 0 8px #ff4500, 0 0 16px #ff4500; } 50% { text-shadow:0 0 16px #ff6700, 0 0 32px #ff4500, 0 0 48px #832; } } ' +
    '@keyframes safetyScanline { 0% { top:-20%; } 100% { top:120%; } } ' +
    '@keyframes safetyHeartbeat { 0%,100% { transform:scale(1); } 15% { transform:scale(1.18); } 30% { transform:scale(1); } 45% { transform:scale(1.12); } } ' +
    '@keyframes safetyDoorOpen { 0% { clip-path:inset(0 50% 0 50%); opacity:0; filter:brightness(3); } 50% { clip-path:inset(0 10% 0 10%); opacity:0.7; filter:brightness(1.5); } 100% { clip-path:inset(0); opacity:1; filter:brightness(1); } } ' +
    '@keyframes safetyFadeUp { 0% { opacity:0; transform:translateY(24px); } 100% { opacity:1; transform:translateY(0); } } ' +
    '@keyframes safetyCheckPop { 0% { transform:scale(0); } 50% { transform:scale(1.4); } 100% { transform:scale(1); } } ' +
    '@keyframes safetyConsequence { 0% { background:rgba(239,68,68,0); } 15% { background:rgba(239,68,68,0.35); } 100% { background:rgba(239,68,68,0); } } ' +
    '@keyframes safetyTimerWarn { 0%,100% { color:#ef4444; } 50% { color:#fbbf24; } } ' +
    '@keyframes safetyParticle { 0% { opacity:1; transform:translateY(0) scale(1); } 100% { opacity:0; transform:translateY(-60px) scale(0); } } ' +
    '@keyframes safetyStationEnter { 0% { opacity:0; transform:translateX(30px); } 100% { opacity:1; transform:translateX(0); } } ' +
    '@keyframes safetyGaugeShine { 0% { left:-100%; } 100% { left:200%; } } ' +
    '@keyframes safetyBreathe { 0%,100% { box-shadow:0 0 0 0 rgba(251,191,36,0); transform:scale(1); } 50% { box-shadow:0 0 16px 1px rgba(251,191,36,0.30); transform:scale(1.015); } } ' +
    '@keyframes safetyRipple { 0% { box-shadow:0 0 0 0 currentColor; opacity:0.6; } 100% { box-shadow:0 0 0 20px transparent; opacity:0; } } ' +
    '.ppe-card-unequipped:hover { transform:translateY(-3px) scale(1.02); border-color:rgba(251,191,36,0.5) !important; box-shadow:0 8px 25px rgba(245,158,11,0.2) !important; } ' +
    '.ppe-card-unequipped { transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease !important; } ';

  // ── Station theme backgrounds ──
  var stationBGs = {
    1: 'linear-gradient(135deg, #1a0f00 0%, #2d1600 30%, #3d1f00 60%, #291400 100%)',
    2: 'linear-gradient(135deg, #001a2e 0%, #002240 30%, #001830 60%, #00162e 100%)',
    3: 'linear-gradient(135deg, #2a0a0a 0%, #3d0f0f 30%, #2e0808 60%, #1f0505 100%)',
    4: 'linear-gradient(135deg, #2a1500 0%, #3d2000 30%, #2e1800 60%, #1f1000 100%)'
  };
  var stationBorders = { 1: 'rgba(251,191,36,0.35)', 2: 'rgba(56,189,248,0.35)', 3: 'rgba(239,68,68,0.35)', 4: 'rgba(249,115,22,0.35)' };

  // ── Enter Lab transition ──
  if (enterAnim) {
    var particleEmojis = ['\uD83E\uDDEA', '\u2697\uFE0F', '\uD83D\uDD2C', '\uD83E\uDDEC', '\uD83E\uDD7D', '\uD83E\uDDE4', '\uD83E\uDD7C', '\u269B\uFE0F', '\uD83D\uDCA7', '\u2B50'];
    return React.createElement("div", {
      style: { position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center',
        background:'linear-gradient(135deg, #001a1a 0%, #002e2e 50%, #003838 100%)',
        animation: 'safetyDoorOpen 1.5s ease-out forwards', overflow:'hidden' }
    },
      React.createElement("style", null, safetyCSSText),
      // Floating particles
      particleEmojis.map(function(emoji, i) {
        var xPos = 5 + (i * 9.5);
        var delay = i * 0.15;
        var duration = 2 + (i % 3) * 0.5;
        return React.createElement("div", { key:'p'+i, style: {
          position:'absolute', left: xPos + '%', bottom:'-20px', fontSize: (16 + (i % 4) * 6) + 'px',
          animation: 'safetyParticle ' + duration + 's ease ' + delay + 's both', opacity:0.6
        } }, emoji);
      }),
      // Center content
      React.createElement("div", { style: { textAlign:'center', animation:'safetyFadeUp 0.8s ease 0.5s both', position:'relative', zIndex:1 } },
        React.createElement("div", { style: { fontSize:'80px', marginBottom:'16px', animation:'safetyHeartbeat 1s ease infinite',
          filter:'drop-shadow(0 0 20px rgba(52,211,153,0.4))' } }, "\uD83E\uDDEA"),
        React.createElement("div", { style: { fontSize:'28px', fontWeight:900, color:'#34d399', letterSpacing:'3px', textTransform:'uppercase',
          textShadow:'0 0 30px rgba(52,211,153,0.3)' } }, __alloT('stem.titration.lab_access_granted', "Lab Access Granted")),
        React.createElement("div", { style: { fontSize:'12px', color:'#6ee7b7', marginTop:'12px', opacity:0.8, letterSpacing:'1px' } },
          __alloT('stem.titration.all_safety_protocols_confirmed', "All safety protocols confirmed")),
        // PPE status badges
        React.createElement("div", { style: { display:'flex', gap:'8px', justifyContent:'center', marginTop:'16px', animation:'safetyFadeUp 0.5s ease 1s both' } },
          ['\uD83E\uDD7D Goggles', '\uD83E\uDDE4 Gloves', '\uD83E\uDD7C Coat', '\uD83D\uDC5F Shoes'].map(function(label, i) {
            return React.createElement("div", { key:i, style: {
              padding:'4px 10px', borderRadius:'20px', fontSize:'9px', fontWeight:700, color:'#34d399',
              background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)',
              animation:'safetyFadeUp 0.3s ease ' + (1.2 + i * 0.1) + 's both'
            } }, '\u2714 ' + label);
          })
        )
      )
    );
  }

  return React.createElement("div", {
    "data-titration-instance": "safety",
    className: "space-y-4 max-w-2xl mx-auto",
    // The drill countdown is a window-level setInterval started and stopped DURING
    // render. That is fine while the gate keeps rendering, and a leak the moment it
    // stops: start a drill, navigate to another tool, and nothing ever runs the stop
    // branch again — the interval keeps firing upd() five times a second for the rest
    // of the session, re-rendering the host over a tool nobody is looking at.
    //
    // This ref is declared at module scope on purpose. React re-invokes an INLINE
    // callback ref (null, then node) on every single re-render, and this subtree
    // re-renders on every tick, so an inline version would clear its own timer
    // immediately. A stable identity is only called on real mount and unmount.
    ref: titrDrillTeardownRef,
    style: { animation: 'safetyFadeUp 0.4s ease' }
  },
    React.createElement("style", null, safetyCSSText + ' ' + TITRATION_SUBSTRATE_CSS),

    // Back button
    React.createElement("button", { type: "button", "aria-label": __alloT('stem.titration.back', "Back"),
      onClick: function() { setStemLabTool(null); },
      className: "text-xs font-bold transition-colors",
      style: { color: ctx.isContrast ? '#ffffff' : '#22d3ee' }
    }, __alloT('stem.titration.back_2', "\u2190 Back")),

    // ── Header ──
    React.createElement("div", {
      className: "rounded-2xl border overflow-hidden",
      style: { background: stationBGs[safetyStation], borderColor: stationBorders[safetyStation], transition:'background 0.5s ease, border-color 0.5s ease' }
    },
      React.createElement("div", {
        className: "px-6 py-4 text-center",
        style: { background:'rgba(0,0,0,0.4)', borderBottom:'1px solid ' + stationBorders[safetyStation] }
      },
        React.createElement("div", { style: { fontSize:'28px', marginBottom:'4px' } }, "\u26A0\uFE0F"),
        React.createElement("h2", { className: "text-xl font-black tracking-tight", style: { color: stationDefs[safetyStation-1].color } }, __alloT('stem.titration.lab_safety_briefing', "Lab Safety Briefing")),
        React.createElement("p", { className: "text-[0.6875rem] mt-1", style: { color: 'rgba(255,255,255,0.5)' } },
          "Complete all 4 safety stations before entering the Virtual " + preset.acidName.split(' ')[0] + " Lab")
      ),

      // ── Progress Stepper ──
      React.createElement("div", {
        className: "flex items-center justify-start sm:justify-center gap-1 px-4 py-3 overflow-x-auto", role: "navigation", "aria-label": "Safety briefing progress",
        style: { background:'rgba(0,0,0,0.25)' }
      },
        stationDefs.map(function(st, i) {
          var isCurrent = safetyStation === st.id;
          var canAccess = canGoStation(st.id);
          return React.createElement("div", { key: st.id, className: "flex items-center" },
            React.createElement("button", {
              type: "button", "aria-label": "Go to " + st.label + " station, " + st.progress + (st.complete ? ", complete" : ""),
              "aria-current": isCurrent ? "step" : undefined,
              disabled: !canAccess,
              onClick: function() { if (canAccess) goSafetyStation(st.id); },
              className: "min-h-[44px] min-w-[76px] flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 " +
                (isCurrent ? "scale-110" : canAccess ? "cursor-pointer" : "cursor-not-allowed"),
              style: isCurrent ? { background: st.color + '25', boxShadow: '0 0 20px ' + st.color + '30' } : {}
            },
              React.createElement("div", {
                style: {
                  width:'32px', height:'32px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'14px', fontWeight:900, border: '2px solid ' + (st.complete ? '#10b981' : isCurrent ? st.color : canAccess ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.3)'),
                  background: st.complete ? 'rgba(16,185,129,0.2)' : isCurrent ? st.color + '20' : 'rgba(0,0,0,0.3)',
                  animation: st.complete ? 'safetyCheckPop 0.4s ease' : isCurrent ? 'safetyPulseGlow 2s ease infinite' : 'none',
                  color: st.complete ? '#10b981' : st.color
                }
              }, st.complete ? "\u2714" : st.icon),
              React.createElement("span", {
                style: { fontSize:'11px', fontWeight:700, color: isCurrent ? st.color : canAccess ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.62)', whiteSpace:'nowrap' }
              }, st.label),
              React.createElement("span", {
                style: { fontSize:'10px', color: st.complete ? '#10b981' : canAccess ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.58)' }
              }, st.progress)
            ),
            i < 3 ? React.createElement("div", {
              style: { width:'24px', height:'2px', background: stationDefs[i].complete ? '#10b981' : 'rgba(255,255,255,0.28)', borderRadius:'1px', transition:'background 0.3s' }
            }) : null
          );
        })
      ),

      // ══════════════════════════════════════
      // STATION 1: SUIT UP (PPE)
      // ══════════════════════════════════════
      safetyStation === 1 && React.createElement("div", {
        id: "titration-safety-station-1", role: "region", tabIndex: -1, "aria-label": "Safety station 1 of 4",
        className: "p-5 space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
        style: { animation: 'safetyStationEnter 0.4s ease' }
      },
        React.createElement("div", { className: "text-center mb-2" },
          React.createElement("div", { style: { fontSize:'14px', fontWeight:900, color:'#fbbf24', letterSpacing:'2px', textTransform:'uppercase' } }, __alloT('stem.titration.personal_protective_equipment', "\uD83D\uDEE1\uFE0F Personal Protective Equipment")),
          React.createElement("p", { style: { fontSize:'11px', color:'rgba(226,232,240,0.88)', marginTop:'4px' } }, __alloT('stem.titration.equip_each_piece_of_ppe_before_proceed', "Complete this simulated PPE check. In a real lab, the reviewed procedure, risk assessment, and exact SDS determine the required protection."))
        ),

        // PPE readiness gauge
        React.createElement("div", { role: "progressbar", "aria-label": "PPE readiness", "aria-valuemin": 0, "aria-valuemax": ppeItems.length, "aria-valuenow": ppeCount, "aria-valuetext": ppeCount + " of " + ppeItems.length + " items equipped", style: { position:'relative', height:'12px', borderRadius:'6px', background:'rgba(0,0,0,0.4)', border:'1px solid rgba(251,191,36,0.35)', overflow:'hidden' } },
          React.createElement("div", {
            style: { height:'100%', borderRadius:'4px', transition:'width 0.5s ease',
              width: (ppeCount / ppeItems.length * 100) + '%',
              background: ppeComplete ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
              boxShadow: ppeComplete ? '0 0 12px rgba(16,185,129,0.5)' : '0 0 12px rgba(245,158,11,0.3)' }
          }),
          React.createElement("div", {
            style: { position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', fontSize:'7px', fontWeight:900,
              color: ppeComplete ? '#10b981' : '#fbbf24' }
          }, ppeComplete ? "\u2714 PROTECTED" : ppeCount + '/' + ppeItems.length + ' EQUIPPED')
        ),

        // PPE Grid (2x2) with consequence warnings
        React.createElement("div", { className: "grid grid-cols-2 gap-3" },
          ppeItems.map(function(item, idx) {
            var checked = safetyChecks[item.id] || false;
            var consequence = ppeConsequences[item.id];
            return React.createElement("button", {
              key: item.id, type: "button",
              "aria-label": (checked ? "Remove " : "Equip ") + item.label,
              "aria-pressed": checked,
              "aria-describedby": "titration-ppe-desc-" + item.id + (!checked && consequence ? " titration-ppe-risk-" + item.id : ""),
              onClick: function() {
                var next = Object.assign({}, safetyChecks);
                next[item.id] = !checked;
                upd('safetyChecks', next);
              },
              className: "relative min-h-[44px] text-left p-4 rounded-xl border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 " + (checked ? '' : 'ppe-card-unequipped'),
              style: {
                background: checked ? 'rgba(16,185,129,0.12)' : 'rgba(0,0,0,0.3)',
                borderColor: checked ? 'rgba(16,185,129,0.5)' : 'rgba(251,191,36,0.2)',
                boxShadow: checked ? '0 0 20px rgba(16,185,129,0.15), inset 0 0 20px rgba(16,185,129,0.05)' : 'none',
                animation: checked ? 'safetyEquipGlow 0.5s ease' : 'safetyBreathe 3s ease ' + (idx * 0.5) + 's infinite',
                cursor: 'pointer'
              }
            },
              // Icon
              React.createElement("div", { "aria-hidden": true, style: { fontSize:'40px', textAlign:'center', marginBottom:'6px',
                filter: checked ? 'drop-shadow(0 0 10px rgba(16,185,129,0.7))' : 'grayscale(0.4) opacity(0.7)',
                transition: 'filter 0.4s ease, transform 0.4s ease', transform: checked ? 'scale(1.05)' : 'scale(0.85)' }
              }, item.icon),
              // Label
              React.createElement("div", { style: { fontSize:'13px', fontWeight:800, color: checked ? '#34d399' : '#fbbf24', textAlign:'center', transition:'color 0.3s' } }, item.label),
              // Description
              React.createElement("div", { id: "titration-ppe-desc-" + item.id, style: { fontSize:'12px', color: checked ? 'rgba(52,211,153,0.85)' : 'rgba(251,191,36,0.70)', textAlign:'center', marginTop:'3px', lineHeight:'1.3' } }, item.desc),
              // Consequence warning (only when NOT equipped)
              !checked && consequence && React.createElement("div", {
                id: "titration-ppe-risk-" + item.id,
                style: { marginTop:'8px', padding:'5px 8px', borderRadius:'6px', textAlign:'center',
                  background: consequence.severity === 'critical' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.1)',
                  border: '1px solid ' + (consequence.severity === 'critical' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.2)') }
              },
                React.createElement("div", { style: { fontSize:'11px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.5px',
                  color: consequence.severity === 'critical' ? '#fca5a5' : '#fcd34d' } },
                  (consequence.severity === 'critical' ? '\u26A0\uFE0F ' : '') + 'Without this: ' + consequence.risk)
              ),
              // Equipped checkmark badge
              checked && React.createElement("div", {
                style: { position:'absolute', top:'6px', right:'6px', width:'22px', height:'22px', borderRadius:'50%',
                  background:'linear-gradient(135deg, #10b981, #059669)', display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'12px', color:'white', fontWeight:900, animation:'safetyCheckPop 0.3s ease',
                  boxShadow:'0 0 8px rgba(16,185,129,0.4)' }
              }, "\u2714"),
              // Equipped status line
              checked && React.createElement("div", {
                style: { marginTop:'8px', padding:'4px', borderRadius:'6px', textAlign:'center',
                  background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)' }
              },
                React.createElement("span", { style: { fontSize:'11px', fontWeight:700, color:'#34d399' } }, __alloT('stem.titration.equipped_protected', "\u2714 EQUIPPED \u2014 Protected"))
              )
            );
          })
        ),

        // Next station button
        ppeComplete && React.createElement("button", {
          "aria-label": __alloT('stem.titration.continue_to_lab_scan_station', "Continue to Lab Scan station"),
          onClick: function() { goSafetyStation(2); },
          className: "w-full py-3 rounded-xl text-sm font-black text-white transition-all hover:scale-[1.02]",
          style: { background:'linear-gradient(90deg, #f59e0b, #d97706)', boxShadow:'0 0 20px rgba(245,158,11,0.3)', animation:'safetyFadeUp 0.4s ease' }
        }, __alloT('stem.titration.continue_to_lab_scan', "\uD83D\uDD2C Continue to Lab Scan \u2192"))
      ),

      // ══════════════════════════════════════
      // STATION 2: LAB SCAN (Emergency Equipment)
      // ══════════════════════════════════════
      safetyStation === 2 && React.createElement("div", {
        id: "titration-safety-station-2", role: "region", tabIndex: -1, "aria-label": "Safety station 2 of 4",
        className: "p-5 space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
        style: { animation: 'safetyStationEnter 0.4s ease' }
      },
        React.createElement("div", { className: "text-center mb-2" },
          React.createElement("div", { style: { fontSize:'14px', fontWeight:900, color:'#38bdf8', letterSpacing:'2px', textTransform:'uppercase' } }, __alloT('stem.titration.locate_emergency_equipment', "\uD83D\uDD0D Locate Emergency Equipment")),
          React.createElement("p", { style: { fontSize:'11px', color:'rgba(226,232,240,0.88)', marginTop:'4px' } }, __alloT('stem.titration.find_each_piece_of_safety_equipment_on', "Find each piece of safety equipment on the lab map. In a real emergency, seconds matter \u2014 you must know where everything is BEFORE you start."))
        ),

        // Lab Map SVG
        React.createElement("div", {
          style: { position:'relative', borderRadius:'12px', border:'2px solid rgba(56,189,248,0.25)', overflow:'hidden', background:'rgba(0,0,0,0.4)' }
        },
          React.createElement("svg", {
            viewBox: "0 0 400 280", className: "w-full", role: "img",
            "aria-label": __alloT('stem.titration.safety_equipment_map', "Safety equipment map. Locate the eyewash, fire extinguisher, and SDS station."),
            style: { display:'block' }
          },
            // Floor
            React.createElement("rect", { x:0, y:0, width:400, height:280, fill:'#0a1929', rx:8 }),

            // Grid pattern
            [40,80,120,160,200,240,280,320,360].map(function(x) {
              return React.createElement("line", { key:'gx'+x, x1:x, y1:0, x2:x, y2:280, stroke:'rgba(56,189,248,0.05)', strokeWidth:0.5 });
            }),
            [40,80,120,160,200,240].map(function(y) {
              return React.createElement("line", { key:'gy'+y, x1:0, y1:y, x2:400, y2:y, stroke:'rgba(56,189,248,0.05)', strokeWidth:0.5 });
            }),

            // Fume hood (top)
            React.createElement("rect", { x:20, y:10, width:120, height:35, fill:'rgba(56,189,248,0.08)', stroke:'rgba(56,189,248,0.2)', strokeWidth:1, rx:3 }),
            React.createElement("text", { x:80, y:32, fill:'rgba(125,211,252,0.92)', fontSize:8, textAnchor:'middle', fontWeight:'bold' }, __alloT('stem.titration.fume_hood', "FUME HOOD")),

            // Lab benches with equipment
            React.createElement("rect", { x:40, y:80, width:140, height:30, fill:'rgba(148,163,184,0.1)', stroke:'rgba(148,163,184,0.2)', strokeWidth:1, rx:2 }),
            React.createElement("rect", { x:220, y:80, width:140, height:30, fill:'rgba(148,163,184,0.1)', stroke:'rgba(148,163,184,0.2)', strokeWidth:1, rx:2 }),
            React.createElement("rect", { x:40, y:150, width:140, height:30, fill:'rgba(148,163,184,0.1)', stroke:'rgba(148,163,184,0.2)', strokeWidth:1, rx:2 }),
            React.createElement("rect", { x:220, y:150, width:140, height:30, fill:'rgba(148,163,184,0.1)', stroke:'rgba(148,163,184,0.2)', strokeWidth:1, rx:2 }),
            React.createElement("text", { x:110, y:98, fill:'rgba(203,213,225,0.82)', fontSize:7, textAnchor:'middle' }, __alloT('stem.titration.bench_1', "Bench 1")),
            React.createElement("text", { x:290, y:98, fill:'rgba(203,213,225,0.82)', fontSize:7, textAnchor:'middle' }, __alloT('stem.titration.bench_2', "Bench 2")),
            React.createElement("text", { x:110, y:168, fill:'rgba(203,213,225,0.82)', fontSize:7, textAnchor:'middle' }, __alloT('stem.titration.bench_3', "Bench 3")),

            // Tiny equipment on benches (beakers, flasks)
            React.createElement("text", { x:65, y:93, fill:'rgba(56,189,248,0.25)', fontSize:10 }, "\u2697\uFE0F"),
            React.createElement("text", { x:95, y:93, fill:'rgba(56,189,248,0.25)', fontSize:10 }, "\uD83E\uDDEA"),
            React.createElement("text", { x:130, y:93, fill:'rgba(56,189,248,0.25)', fontSize:10 }, "\uD83D\uDD2C"),
            React.createElement("text", { x:245, y:93, fill:'rgba(56,189,248,0.25)', fontSize:10 }, "\uD83E\uDDEA"),
            React.createElement("text", { x:310, y:93, fill:'rgba(56,189,248,0.25)', fontSize:10 }, "\u2697\uFE0F"),
            React.createElement("text", { x:65, y:163, fill:'rgba(56,189,248,0.25)', fontSize:10 }, "\uD83D\uDCA7"),
            React.createElement("text", { x:130, y:163, fill:'rgba(56,189,248,0.25)', fontSize:10 }, "\uD83E\uDDEA"),

            // Student position marker ("You are here")
            React.createElement("circle", { cx:200, cy:210, r:10, fill:'rgba(16,185,129,0.2)', stroke:'#10b981', strokeWidth:1.5 }),
            React.createElement("circle", { cx:200, cy:210, r:5, fill:'#10b981' }),
            React.createElement("circle", { cx:200, cy:210, r:16, fill:'transparent', stroke:'rgba(16,185,129,0.3)', strokeWidth:1,
              style: { animation:'safetyRipple 2s ease infinite' } }),
            React.createElement("text", { x:200, y:230, fill:'#10b981', fontSize:7, textAnchor:'middle', fontWeight:'bold' }, __alloT('stem.titration.you_are_here', "YOU ARE HERE")),

            // Safety path lines (connect found equipment to student)
            labMapFound['eyewash'] && React.createElement("line", { x1:200, y1:210, x2:60, y2:240, stroke:'#10b981', strokeWidth:1, strokeDasharray:'4,3', opacity:0.4 }),
            labMapFound['extinguisher'] && React.createElement("line", { x1:200, y1:210, x2:370, y2:160, stroke:'#10b981', strokeWidth:1, strokeDasharray:'4,3', opacity:0.4 }),
            labMapFound['sds'] && React.createElement("line", { x1:200, y1:210, x2:250, y2:30, stroke:'#10b981', strokeWidth:1, strokeDasharray:'4,3', opacity:0.4 }),

            // Door
            React.createElement("rect", { x:370, y:240, width:25, height:35, fill:'rgba(148,163,184,0.08)', stroke:'rgba(148,163,184,0.25)', strokeWidth:1, rx:2 }),
            React.createElement("text", { x:382, y:262, fill:'rgba(203,213,225,0.92)', fontSize:7, textAnchor:'middle' }, "EXIT"),

            // Sink
            React.createElement("rect", { x:330, y:10, width:50, height:25, fill:'rgba(56,189,248,0.05)', stroke:'rgba(56,189,248,0.15)', strokeWidth:1, rx:2 }),
            React.createElement("text", { x:355, y:26, fill:'rgba(125,211,252,0.92)', fontSize:7, textAnchor:'middle' }, __alloT('stem.titration.sink', "Sink")),

            // Scanline animation overlay
            !mapComplete && React.createElement("rect", {
              x:0, y:0, width:400, height:40, fill:'url(#' + scanGradientId + ')',
              style: { animation: 'safetyScanline 3s linear infinite' }
            }),
            React.createElement("defs", null,
              React.createElement("linearGradient", { id: scanGradientId, x1:0, y1:0, x2:0, y2:1 },
                React.createElement("stop", { offset:'0%', stopColor:'rgba(56,189,248,0)', stopOpacity:0 }),
                React.createElement("stop", { offset:'50%', stopColor:'rgba(56,189,248,0.08)', stopOpacity:1 }),
                React.createElement("stop", { offset:'100%', stopColor:'rgba(56,189,248,0)', stopOpacity:0 })
              )
            ),

            // Equipment hotspots
            // Eyewash (bottom-left area, near sink)
            !labMapFound['eyewash'] && React.createElement("g", null,
              React.createElement("circle", { cx:60, cy:240, r:16, fill:'transparent', stroke:'#38bdf8', strokeWidth:2, style: { animation:'safetyPulseRing 1.5s ease infinite' } }),
              React.createElement("circle", { cx:60, cy:240, r:8, fill:'rgba(56,189,248,0.15)', stroke:'rgba(56,189,248,0.4)', strokeWidth:1 }),
              React.createElement("text", { x:60, y:244, fill:'#38bdf8', fontSize:10, textAnchor:'middle', fontWeight:'bold' }, "?")
            ),
            labMapFound['eyewash'] && React.createElement("g", null,
              React.createElement("circle", { cx:60, cy:240, r:14, fill:'rgba(16,185,129,0.2)', stroke:'#10b981', strokeWidth:2 }),
              React.createElement("text", { x:60, y:237, fill:'white', fontSize:14, textAnchor:'middle' }, "\uD83D\uDEBF"),
              React.createElement("text", { x:60, y:254, fill:'#10b981', fontSize:6, textAnchor:'middle', fontWeight:'bold' }, "EYEWASH")
            ),

            // Fire extinguisher (right side, near door)
            !labMapFound['extinguisher'] && React.createElement("g", null,
              React.createElement("circle", { cx:370, cy:160, r:16, fill:'transparent', stroke:'#f97316', strokeWidth:2, style: { animation:'safetyPulseRing 1.5s ease 0.5s infinite' } }),
              React.createElement("circle", { cx:370, cy:160, r:8, fill:'rgba(249,115,22,0.15)', stroke:'rgba(249,115,22,0.4)', strokeWidth:1 }),
              React.createElement("text", { x:370, y:164, fill:'#f97316', fontSize:10, textAnchor:'middle', fontWeight:'bold' }, "?")
            ),
            labMapFound['extinguisher'] && React.createElement("g", null,
              React.createElement("circle", { cx:370, cy:160, r:14, fill:'rgba(16,185,129,0.2)', stroke:'#10b981', strokeWidth:2 }),
              React.createElement("text", { x:370, y:157, fill:'white', fontSize:14, textAnchor:'middle' }, "\uD83E\uDDEF"),
              React.createElement("text", { x:370, y:174, fill:'#10b981', fontSize:6, textAnchor:'middle', fontWeight:'bold' }, __alloT('stem.titration.fire_ext', "FIRE EXT."))
            ),

            // SDS binder (teacher's area, top-right)
            !labMapFound['sds'] && React.createElement("g", null,
              React.createElement("circle", { cx:250, cy:30, r:16, fill:'transparent', stroke:'#a78bfa', strokeWidth:2, style: { animation:'safetyPulseRing 1.5s ease 1s infinite' } }),
              React.createElement("circle", { cx:250, cy:30, r:8, fill:'rgba(167,139,250,0.15)', stroke:'rgba(167,139,250,0.4)', strokeWidth:1 }),
              React.createElement("text", { x:250, y:34, fill:'#a78bfa', fontSize:10, textAnchor:'middle', fontWeight:'bold' }, "?")
            ),
            labMapFound['sds'] && React.createElement("g", null,
              React.createElement("circle", { cx:250, cy:30, r:14, fill:'rgba(16,185,129,0.2)', stroke:'#10b981', strokeWidth:2 }),
              React.createElement("text", { x:250, y:27, fill:'white', fontSize:14, textAnchor:'middle' }, "\uD83D\uDCCB"),
              React.createElement("text", { x:250, y:44, fill:'#10b981', fontSize:6, textAnchor:'middle', fontWeight:'bold' }, __alloT('stem.titration.sds_binder', "SDS BINDER"))
            )
          ),

          // Clickable overlay zones (positioned absolutely over SVG)
          React.createElement("div", { style: { position:'absolute', inset:0 } },
            // Eyewash click zone
            React.createElement("button", {
              type: "button", "aria-pressed": !!labMapFound['eyewash'], "aria-label": __alloT('stem.titration.locate_eyewash_station', "Locate eyewash station"),
              className: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
              style: { minWidth:'44px', minHeight:'44px', position:'absolute', left:'10%', top:'80%', width:'12%', height:'14%', background:'transparent', border:'none', cursor:'pointer', borderRadius:'50%' },
              onClick: function() {
                var next = Object.assign({}, labMapFound);
                next['eyewash'] = true;
                upd('labMapFound', next);
                upd('mapTooltip', 'eyewash');
                setTimeout(function() { upd('mapTooltip', null); }, 4000);
              }
            }),
            // Fire ext click zone
            React.createElement("button", {
              type: "button", "aria-pressed": !!labMapFound['extinguisher'], "aria-label": __alloT('stem.titration.locate_fire_extinguisher', "Locate fire extinguisher"),
              className: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300",
              style: { minWidth:'44px', minHeight:'44px', position:'absolute', left:'86%', top:'50%', width:'12%', height:'14%', background:'transparent', border:'none', cursor:'pointer', borderRadius:'50%' },
              onClick: function() {
                var next = Object.assign({}, labMapFound);
                next['extinguisher'] = true;
                upd('labMapFound', next);
                upd('mapTooltip', 'extinguisher');
                setTimeout(function() { upd('mapTooltip', null); }, 4000);
              }
            }),
            // SDS click zone
            React.createElement("button", {
              type: "button", "aria-pressed": !!labMapFound['sds'], "aria-label": __alloT('stem.titration.locate_sds_binder', "Locate SDS binder"),
              className: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300",
              style: { minWidth:'44px', minHeight:'44px', position:'absolute', left:'57%', top:'4%', width:'12%', height:'14%', background:'transparent', border:'none', cursor:'pointer', borderRadius:'50%' },
              onClick: function() {
                var next = Object.assign({}, labMapFound);
                next['sds'] = true;
                upd('labMapFound', next);
                upd('mapTooltip', 'sds');
                setTimeout(function() { upd('mapTooltip', null); }, 4000);
              }
            })
          )
        ),

        // Map tooltips
        mapTooltip === 'eyewash' && React.createElement("div", {
          role: "status", "aria-live": "polite",
          className: "rounded-xl p-3 border",
          style: { background:'rgba(56,189,248,0.1)', borderColor:'rgba(56,189,248,0.3)', animation:'safetyFadeUp 0.3s ease' }
        },
          React.createElement("div", { style: { fontSize:'11px', fontWeight:800, color:'#38bdf8' } }, __alloT('stem.titration.eyewash_station_located_2', "\uD83D\uDEBF Eyewash Station Located!")),
          React.createElement("div", { style: { fontSize:'10px', color:'rgba(255,255,255,0.6)', marginTop:'4px' } }, __alloT('stem.titration.the_10_second_rule_if_chemicals_splash', "Start flushing immediately. Hold the eyelids open and rinse continuously for at least 15 minutes, alert the teacher, and follow the SDS/local plan; longer flushing or medical evaluation may be required."))
        ),
        mapTooltip === 'extinguisher' && React.createElement("div", {
          role: "status", "aria-live": "polite",
          className: "rounded-xl p-3 border",
          style: { background:'rgba(249,115,22,0.1)', borderColor:'rgba(249,115,22,0.3)', animation:'safetyFadeUp 0.3s ease' }
        },
          React.createElement("div", { style: { fontSize:'11px', fontWeight:800, color:'#f97316' } }, __alloT('stem.titration.fire_extinguisher_located_2', "\uD83E\uDDEF Fire Extinguisher Located!")),
          React.createElement("div", { style: { fontSize:'10px', color:'rgba(255,255,255,0.6)', marginTop:'4px' } }, __alloT('stem.titration.remember_p_a_s_s_pull_the_pin_aim_at_b', "Know the alarm, exit route, and extinguisher location. Warn others and alert the teacher first; students should not fight a fire unless specifically trained and directed under the site fire plan."))
        ),
        mapTooltip === 'sds' && React.createElement("div", {
          role: "status", "aria-live": "polite",
          className: "rounded-xl p-3 border",
          style: { background:'rgba(167,139,250,0.1)', borderColor:'rgba(167,139,250,0.3)', animation:'safetyFadeUp 0.3s ease' }
        },
          React.createElement("div", { style: { fontSize:'11px', fontWeight:800, color:'#a78bfa' } }, __alloT('stem.titration.safety_data_sheets_located', "\uD83D\uDCCB Safety Data Sheets Located!")),
          React.createElement("div", { style: { fontSize:'10px', color:'rgba(255,255,255,0.6)', marginTop:'4px' } }, __alloT('stem.titration.sds_documents_list_all_hazards_require', "SDS documents list ALL hazards, required PPE, first aid procedures, and emergency contacts for every chemical in the lab. Review them BEFORE handling any substance."))
        ),

        // Equipment status grid
        React.createElement("div", { className: "grid grid-cols-3 gap-2" },
          [
            { id:'eyewash', icon:'\uD83D\uDEBF', label:__alloT('stem.titration.eyewash', 'Eyewash'), color:'#38bdf8', time:'~3 sec away' },
            { id:'extinguisher', icon:'\uD83E\uDDEF', label:__alloT('stem.titration.fire_ext_2', 'Fire Ext.'), color:'#f97316', time:'~5 sec away' },
            { id:'sds', icon:'\uD83D\uDCCB', label:__alloT('stem.titration.sds_binder_2', 'SDS Binder'), color:'#a78bfa', time:'~4 sec away' }
          ].map(function(eq) {
            var found = labMapFound[eq.id];
            return React.createElement("div", {
              key: eq.id,
              style: { padding:'8px', borderRadius:'8px', textAlign:'center', transition:'all 0.3s ease',
                background: found ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.3)',
                border: '1px solid ' + (found ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)') }
            },
              React.createElement("div", { style: { fontSize:'18px', marginBottom:'2px',
                filter: found ? 'none' : 'grayscale(1) opacity(0.3)', transition:'filter 0.3s' } }, eq.icon),
              React.createElement("div", { style: { fontSize:'9px', fontWeight:700, color: found ? '#34d399' : 'rgba(255,255,255,0.3)' } },
                found ? '\u2714 ' + eq.label : '? ? ?'),
              found && React.createElement("div", { style: { fontSize:'7px', color:'rgba(16,185,129,0.6)', marginTop:'2px' } }, eq.time)
            );
          })
        ),

        // Map complete celebration
        mapComplete && React.createElement("div", {
          style: { textAlign:'center', padding:'12px', borderRadius:'12px',
            background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)',
            animation:'safetyFadeUp 0.4s ease' }
        },
          React.createElement("div", { style: { fontSize:'13px', fontWeight:900, color:'#34d399' } }, __alloT('stem.titration.lab_safety_map_complete', "\uD83D\uDDFA\uFE0F Lab Safety Map Complete!")),
          React.createElement("div", { style: { fontSize:'10px', color:'rgba(16,185,129,0.6)', marginTop:'4px' } },
            __alloT('stem.titration.you_can_now_locate_all_emergency_equip', "You can now locate all emergency equipment from your bench. In an emergency, every second counts \u2014 this knowledge could save a life."))
        ),

        // Navigation
        React.createElement("div", { className: "flex gap-2" },
          React.createElement("button", {
            type: "button", "aria-label": __alloT('stem.titration.back_to_ppe_station', "Back to PPE station"),
            onClick: function() { goSafetyStation(1); },
            className: "px-4 py-2 rounded-xl text-[0.6875rem] font-bold text-slate-200 hover:text-white bg-black/30 border border-slate-700 hover:border-slate-500 transition-all"
          }, __alloT('stem.titration.ppe', "\u2190 PPE")),
          mapComplete && React.createElement("button", {
            "aria-label": __alloT('stem.titration.continue_to_chemical_briefing', "Continue to Chemical Briefing"),
            onClick: function() { goSafetyStation(3); },
            className: "flex-1 py-3 rounded-xl text-sm font-black text-white transition-all hover:scale-[1.02]",
            style: { background:'linear-gradient(90deg, #38bdf8, #0ea5e9)', boxShadow:'0 0 20px rgba(56,189,248,0.3)', animation:'safetyFadeUp 0.4s ease' }
          }, __alloT('stem.titration.continue_to_chemical_briefing_2', "SDS Continue to Chemical Briefing \u2192"))
        )
      ),

      // ══════════════════════════════════════
      // STATION 3: CHEMICAL HAZARD BRIEFING
      // ══════════════════════════════════════
      safetyStation === 3 && React.createElement("div", {
        id: "titration-safety-station-3", role: "region", tabIndex: -1, "aria-label": "Safety station 3 of 4",
        className: "p-5 space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
        style: { animation: 'safetyStationEnter 0.4s ease' }
      },
        React.createElement("div", { className: "text-center mb-2" },
          React.createElement("div", { style: { fontSize:'14px', fontWeight:900, color:'#f87171', letterSpacing:'2px', textTransform:'uppercase' } }, __alloT('stem.titration.chemical_hazard_briefing', "SDS Chemical Hazard Briefing")),
          React.createElement("p", { style: { fontSize:'11px', color:'rgba(226,232,240,0.88)', marginTop:'4px' } }, __alloT('stem.titration.review_every_chemical_you_will_handle_', "Review EVERY chemical you will handle today. Tap each card to acknowledge you understand the hazards."))
        ),

        // Chemical cards
        React.createElement("div", { className: "space-y-3" },
          presChems.map(function(chem, ci) {
            var h = chemHazards[chem];
            if (!h) return null;
            var reviewed = chemsReviewed[chem] || false;
            var titleId = 'titration-chemical-title-' + ci;
            return React.createElement("section", {
              key: chem, "aria-labelledby": titleId,
              className: "rounded-xl border-2 overflow-hidden",
              style: { borderColor: reviewed ? 'rgba(16,185,129,0.5)' : h.color + '50',
                background: reviewed ? 'rgba(16,185,129,0.08)' : 'rgba(0,0,0,0.3)',
                animation: 'safetyFlipIn 0.4s ease ' + (ci * 0.1) + 's both' }
            },
              React.createElement("div", { className: "flex items-center gap-3 px-4 py-3", style: { borderBottom: '1px solid ' + h.color + '30' } },
                React.createElement("div", { "aria-hidden": true, className: "min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-xs font-black border", style: { color: h.color, borderColor: h.color + '66', background: h.color + '18' } }, 'SDS'),
                React.createElement("div", { className: "flex-1 min-w-0" },
                  React.createElement("h4", { id: titleId, className: "text-sm font-black", style: { color: reviewed ? '#34d399' : h.color } }, h.name),
                  React.createElement("p", { className: "text-xs text-slate-200 mt-1 leading-relaxed" }, h.working)
                ),
                reviewed && React.createElement("span", { className: "text-xs font-black text-emerald-300" }, 'Reviewed')
              ),
              React.createElement("div", { className: "px-4 py-3 space-y-3" },
                React.createElement("p", { className: "text-xs text-slate-200 leading-relaxed" },
                  React.createElement("span", { className: "font-black text-amber-300" }, 'Reference profile: '), h.classification),
                h.hazards.map(function(hz, hi) { return React.createElement("p", { key: hi, className: "text-xs text-slate-200 leading-relaxed pl-2 border-l-2", style: { borderColor: h.color + '66' } }, hz); }),
                React.createElement("p", { className: "text-xs text-slate-200 leading-relaxed" }, React.createElement("span", { className: "font-black text-emerald-300" }, 'First response: '), h.firstAid),
                React.createElement("button", { type: "button", "aria-pressed": reviewed, onClick: function() { var next = Object.assign({}, chemsReviewed); next[chem] = !reviewed; upd('chemsReviewed', next); }, className: "min-h-[44px] w-full px-4 py-2 rounded-lg text-xs font-black border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 " + (reviewed ? 'bg-emerald-800/40 text-emerald-200 border-emerald-600' : 'bg-slate-800 text-white border-slate-600 hover:bg-slate-700') }, reviewed ? 'Reviewed — press to revisit' : 'Mark reviewed')
              )
            );
          })
        ),

        // Navigation
        React.createElement("div", { className: "flex gap-2" },
          React.createElement("button", {
            type: "button", "aria-label": __alloT('stem.titration.back_to_lab_scan', "Back to Lab Scan"),
            onClick: function() { goSafetyStation(2); },
            className: "px-4 py-2 rounded-xl text-[0.6875rem] font-bold text-slate-200 hover:text-white bg-black/30 border border-slate-700 hover:border-slate-500 transition-all"
          }, __alloT('stem.titration.lab_scan_2', "\u2190 Lab Scan")),
          chemsComplete && React.createElement("button", {
            "aria-label": __alloT('stem.titration.continue_to_safety_drill', "Continue to Safety Drill"),
            onClick: function() { goSafetyStation(4); },
            className: "flex-1 py-3 rounded-xl text-sm font-black text-white transition-all hover:scale-[1.02]",
            style: { background:'linear-gradient(90deg, #ef4444, #dc2626)', boxShadow:'0 0 20px rgba(239,68,68,0.3)', animation:'safetyFadeUp 0.4s ease' }
          }, __alloT('stem.titration.continue_to_safety_drill_2', "\uD83D\uDEA8 Continue to Safety Drill \u2192"))
        )
      ),

      // ══════════════════════════════════════
      // STATION 4: TIMED SAFETY DRILL
      // ══════════════════════════════════════
      safetyStation === 4 && React.createElement("div", {
        id: "titration-safety-station-4", role: "region", tabIndex: -1, "aria-label": "Safety station 4 of 4",
        className: "p-5 space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
        style: { animation: drillResult === 'wrong' ? 'safetyShake 0.5s ease, safetyConsequence 1.5s ease' : 'safetyStationEnter 0.4s ease' }
      },
        React.createElement("div", { className: "text-center mb-2" },
          React.createElement("div", { style: { fontSize:'14px', fontWeight:900, color:'#f97316', letterSpacing:'2px', textTransform:'uppercase',
            animation: drillActive && drillTimeLeft <= 5 ? 'safetyTimerWarn 0.5s ease infinite' : 'none' } }, __alloT('stem.titration.emergency_response_drill', "\uD83D\uDEA8 Emergency Response Drill")),
          React.createElement("p", { style: { fontSize:'11px', color:'rgba(226,232,240,0.88)', marginTop:'4px' } },
            drillResult ? "Drill complete \u2014 review the outcome below." :
            drillActive ? "Choose the safest first action. Pause or add time whenever you need it." :
            "Practice the first response at your own pace. The optional timer can be paused or extended at any time.")
        ),

        // Countdown timer (circular SVG)
        drillActive && !drillResult && React.createElement("div", { style: { display:'flex', justifyContent:'center' } },
          React.createElement("div", {
            role: "group", "aria-label": "Safety drill timer",
            style: { position:'relative', width:'80px', height:'80px' }
          },
            React.createElement("svg", {
              viewBox:"0 0 100 100", role:"img",
              "aria-label": __alloT('stem.titration.safety_drill_countdown', "Safety drill countdown") + ': ' + drillTimeLeft + __alloT('stem.titration.sr_seconds_remaining', ' seconds remaining'),
              style: { transform:'rotate(-90deg)', width:'100%', height:'100%' }
            },
              React.createElement("circle", { cx:50, cy:50, r:45, fill:'none', stroke:'rgba(255,255,255,0.1)', strokeWidth:6 }),
              React.createElement("circle", { cx:50, cy:50, r:45, fill:'none',
                stroke: drillTimeLeft <= 5 ? '#ef4444' : drillTimeLeft <= 10 ? '#f59e0b' : '#22c55e',
                strokeWidth:6, strokeLinecap:'round',
                strokeDasharray: (2 * Math.PI * 45).toFixed(0),
                strokeDashoffset: ((1 - drillTimeLeft / drillDuration) * 2 * Math.PI * 45).toFixed(0),
                style: { transition:'stroke-dashoffset 0.2s linear, stroke 0.3s ease' }
              })
            ),
            React.createElement("div", {
              role: "timer", "aria-label": drillTimeLeft + " seconds remaining",
              style: { position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'24px', fontWeight:900, fontFamily:'monospace',
                color: drillTimeLeft <= 5 ? '#ef4444' : drillTimeLeft <= 10 ? '#f59e0b' : '#22c55e',
                animation: drillTimeLeft <= 5 ? 'safetyHeartbeat 0.5s ease infinite' : 'none' }
            }, drillTimeLeft)
          ),
          React.createElement("div", { className: "flex gap-2 mt-2 justify-center flex-wrap" },
            React.createElement("button", {
              type: "button", "aria-label": drillPaused
                ? __alloT('stem.titration.resume_safety_drill', "Resume safety drill")
                : __alloT('stem.titration.pause_safety_drill', "Pause safety drill"),
              "aria-pressed": drillPaused,
              onClick: toggleDrillPause,
              className: "min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 text-white bg-slate-700 border border-slate-500"
            }, drillPaused ? __alloT('stem.titration.resume', "Resume") : __alloT('stem.titration.pause', "Pause")),
            React.createElement("button", {
              type: "button", "aria-label": __alloT('stem.titration.add_fifteen_seconds', "Add 15 seconds to safety drill"),
              onClick: extendDrill,
              className: "min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 text-amber-200 bg-amber-900/40 border border-amber-600"
            }, "+15s")
          )
        ),

        // Scenario
        !drillActive && !drillResult && React.createElement("button", {
          id: "titration-drill-begin", type: "button",
          "aria-label": __alloT('stem.titration.begin_safety_drill', "Begin safety drill"),
          onClick: function() {
            updMulti({ drillActive: true, drillStartTime: Date.now(), drillAnswer: null, drillResult: null, drillPaused: false, drillPausedTimeLeft: null, drillExtraSeconds: 0 });
            focusTitrationRegion('titration-drill-scenario');
          },
          className: "w-full py-4 rounded-xl text-sm font-black text-white transition-all hover:scale-[1.02]",
          style: { background:'linear-gradient(90deg, #c2410c, #9a3412)', boxShadow:'0 0 25px rgba(249,115,22,0.4)', animation:'safetyUrgencyPulse 2s ease infinite' }
        }, __alloT('stem.titration.begin_emergency_drill', "\uD83D\uDEA8 Begin Emergency Drill")),

        // Scenario content
        (drillActive || drillResult) && React.createElement("div", {
          id: "titration-drill-scenario", tabIndex: -1,
          className: "rounded-xl p-4 border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300",
          style: {
            background: drillScenario.urgency === 'critical' ? 'rgba(127,29,29,0.3)' : 'rgba(120,53,15,0.2)',
            borderColor: drillScenario.urgency === 'critical' ? 'rgba(248,113,113,0.5)' : 'rgba(251,191,36,0.4)',
            animation: drillActive && !drillResult ? 'safetyUrgencyPulse 3s ease infinite' : 'none'
          }
        },
          React.createElement("div", { className: "flex items-center gap-2 mb-2" },
            React.createElement("span", { style: { fontSize:'28px', animation: drillActive && !drillResult ? 'safetyHeartbeat 1s ease infinite' : 'none' } }, drillScenario.icon),
            React.createElement("div", null,
              React.createElement("h4", { style: { fontSize:'14px', fontWeight:900, color:'#fca5a5',
                animation: drillActive && !drillResult && drillScenario.urgency === 'critical' ? 'safetyFireGlow 1s ease infinite' : 'none' } }, drillScenario.title),
              React.createElement("span", {
                style: { fontSize:'9px', fontWeight:700, padding:'2px 8px', borderRadius:'4px', textTransform:'uppercase',
                  // White on amber-600 is 3.2:1; amber-700 gives the 9 px badge 5:1.
                  background: drillScenario.urgency === 'critical' ? '#dc2626' : '#b45309', color:'white' }
              }, drillScenario.urgency + " URGENCY")
            )
          ),
          React.createElement("p", { style: { fontSize:'12px', color:'rgba(255,255,255,0.7)', marginBottom:'12px', lineHeight:'1.5' } }, drillScenario.desc),

          // Answer options
          React.createElement("div", { className: "space-y-2" },
            drillScenario.options.map(function(opt) {
              var isSelected = drillAnswer === opt.id;
              var showResult = drillResult !== null;
              var bgStyle = {};
              if (showResult && isSelected && opt.correct) bgStyle = { background:'rgba(16,185,129,0.3)', borderColor:'#10b981' };
              else if (showResult && isSelected && !opt.correct) bgStyle = { background:'rgba(239,68,68,0.3)', borderColor:'#ef4444' };
              else if (showResult && opt.correct) bgStyle = { background:'rgba(16,185,129,0.15)', borderColor:'#10b981' };
              else bgStyle = { background:'rgba(0,0,0,0.3)', borderColor:'rgba(255,255,255,0.15)' };
              return React.createElement("button", {
                key: opt.id,
                "aria-label": "Select response: " + opt.label,
                disabled: showResult,
                onClick: function() {
                  var result = opt.correct ? 'correct' : 'wrong';
                  updMulti({ drillAnswer: opt.id, drillResult: result, drillActive: false });
                  focusTitrationRegion('titration-drill-feedback');
                  if (opt.correct && typeof awardStemXP === 'function') awardStemXP('safety-drill-' + drillScenario.id, 25, 'Safety drill: ' + drillScenario.title);
                },
                className: "w-full flex items-start gap-2 px-4 py-3 rounded-xl border-2 text-left transition-all",
                style: Object.assign({ cursor: showResult ? 'default' : 'pointer' }, bgStyle)
              },
                React.createElement("span", { style: { fontSize:'16px', shrink:0 } }, opt.icon),
                React.createElement("span", { style: { fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.8)' } }, opt.label)
              );
            })
          ),

          // Result feedback
          drillResult && (function() {
            var dsOpts = (drillScenario && drillScenario.options) || [];
            var selected = dsOpts.find(function(o) { return o.id === drillAnswer; });
            // Predicate-based lookup (not findById) — guarded so a scenario with no
            // correct-flagged option won't crash the render.
            var correctOpt = dsOpts.find(function(o) { return o.correct; });
            var isTimeout = drillResult === 'timeout';
            var isCorrect = drillResult === 'correct';
            return React.createElement("div", {
              id: "titration-drill-feedback", tabIndex: -1,
              role: "status", "aria-live": "polite", "aria-atomic": "true",
              className: "mt-3 p-4 rounded-xl border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300",
              style: {
                background: isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                borderColor: isCorrect ? '#10b981' : '#ef4444',
                animation: 'safetyFadeUp 0.4s ease'
              }
            },
              React.createElement("div", { style: { fontSize:'13px', fontWeight:900, color: isCorrect ? '#34d399' : '#fca5a5', marginBottom:'8px' } },
                isCorrect ? "\u2705 Protocol-first response selected. +25 XP" :
                isTimeout ? "\u23F0 Practice time ended. Review the protocol and try again when ready." :
                "\u274C Review this response against the protocol-first action."
              ),
              !isTimeout && selected && React.createElement("p", { style: { fontSize:'11px', color:'rgba(255,255,255,0.6)', lineHeight:'1.5' } }, selected.feedback),
              isTimeout && React.createElement("p", { style: { fontSize:'11px', color:'rgba(255,255,255,0.6)', lineHeight:'1.5' } },
                "The correct response was: " + (correctOpt ? correctOpt.label : '(no correct option defined)')),
              !isCorrect && correctOpt && React.createElement("div", {
                style: { marginTop:'8px', padding:'8px', borderRadius:'8px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)' }
              },
                React.createElement("div", { style: { fontSize:'10px', fontWeight:800, color:'#34d399', marginBottom:'4px' } }, __alloT('stem.titration.correct_response', "\u2705 Correct response:")),
                React.createElement("div", { style: { fontSize:'10px', color:'rgba(255,255,255,0.6)' } },
                  correctOpt.label),
                React.createElement("div", { style: { fontSize:'10px', color:'rgba(255,255,255,0.5)', marginTop:'4px' } },
                  correctOpt.feedback)
              )
            );
          })()
        ),

        // Navigation / Enter Lab
        React.createElement("div", { className: "flex gap-2" },
          React.createElement("button", {
            type: "button", "aria-label": __alloT('stem.titration.back_to_chemical_briefing', "Back to Chemical Briefing"),
            onClick: function() { goSafetyStation(3); },
            className: "min-h-[44px] px-4 py-2 rounded-xl text-[0.6875rem] font-bold text-slate-200 hover:text-white bg-black/30 border border-slate-700 hover:border-slate-500 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          }, __alloT('stem.titration.chemicals_2', "\u2190 Chemicals")),
          drillResult && !allStationsComplete && React.createElement("button", {
            type: "button", "aria-label": __alloT('stem.titration.retry_drill', "Retry drill"),
            onClick: function() {
              updMulti({ drillActive: false, drillStartTime: 0, drillAnswer: null, drillResult: null, drillPaused: false, drillPausedTimeLeft: null, drillExtraSeconds: 0 });
              focusTitrationRegion('titration-drill-begin');
            },
            className: "min-h-[44px] px-4 py-2 rounded-xl text-[0.6875rem] font-bold text-amber-400 bg-amber-900/30 border border-amber-700 hover:border-amber-500 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          }, __alloT('stem.titration.retry_drill_2', "\u21BA Retry Drill"))
        ),

        // ── ENTER THE LAB ──
        allStationsComplete && React.createElement("button", {
          type: "button", "aria-label": __alloT('stem.titration.enter_lab_safety_confirmed', "Enter lab \u2014 safety confirmed"),
          onClick: function() {
            upd('enterAnim', true);
            var allChecks = {};
            safetyItems.forEach(function(item) { allChecks[item.id] = true; });
            var reduceEntryMotion = false;
            try { reduceEntryMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
            setTimeout(function() {
              updMulti({ safetyChecked: true, safetyChecks: allChecks, enterAnim: false });
              focusTitrationRegion('titration-lab-root');
            }, reduceEntryMotion ? 0 : 2000);
          },
          className: "w-full py-4 rounded-xl text-base font-black text-white transition-all hover:scale-[1.02]",
          style: {
            background: 'linear-gradient(90deg, #10b981, #059669, #0d9488)',
            boxShadow: '0 0 30px rgba(16,185,129,0.4), 0 0 60px rgba(16,185,129,0.15)',
            animation: 'safetyFadeUp 0.5s ease, safetyPulseGlow 2s ease infinite',
            color: '#10b981'
          }
        },
          React.createElement("span", { style: { color:'white' } }, __alloT('stem.titration.lab_safety_confirmed_enter_virtual_lab', "\uD83E\uDDEA Lab Safety Confirmed \u2014 Enter Virtual Lab"))
        )
      )
    )
  );
}

// ── Keyboard shortcuts (WCAG 2.1.1): 1-6 switch tabs, E explain, Esc back ──
var _TITR_TABS = ['titrate', 'challenge', 'incidents', 'equipment', 'molarity', 'buffers'];
var _TITR_TAB_LABELS = { titrate: 'Titrate', challenge: 'Challenge', incidents: 'Safety Drills', equipment: 'Equipment', molarity: 'Dilution Calc', buffers: 'Buffers' };
function onTitrKey(e) {
  var tgt = e.target || {};
  var tn = (tgt.tagName || '').toUpperCase();
  if (tn === 'INPUT' || tn === 'TEXTAREA' || tn === 'SELECT' || tgt.isContentEditable) return;
  var k = e.key;
  if (k >= '1' && k <= '6') {
    var idx = parseInt(k, 10) - 1;
    if (_TITR_TABS[idx]) {
      e.preventDefault();
      upd('labTab', _TITR_TABS[idx]);
      if (typeof announceToSR === 'function') announceToSR('Switched to ' + _TITR_TAB_LABELS[_TITR_TABS[idx]] + ' tab.');
    }
  }
}

function onTitrTabKey(e, index) {
  var key = e.key;
  if (key !== 'ArrowRight' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return;
  e.preventDefault();
  var nextIndex = index;
  if (key === 'ArrowRight' || key === 'ArrowDown') nextIndex = (index + 1) % _TITR_TABS.length;
  if (key === 'ArrowLeft' || key === 'ArrowUp') nextIndex = (index - 1 + _TITR_TABS.length) % _TITR_TABS.length;
  if (key === 'Home') nextIndex = 0;
  if (key === 'End') nextIndex = _TITR_TABS.length - 1;
  var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
  var nextTab = tabs[nextIndex];
  if (nextTab) { nextTab.focus(); nextTab.click(); }
}

// ── Main Lab Render (after safety check passed) ──
return React.createElement("div", {
  id: "titration-lab-root", "data-titration-instance": "lab",
  className: "space-y-4 max-w-5xl mx-auto",
  style: { animation:'safetyFadeUp 0.4s ease' },
  role: "region",
  "aria-label": __alloT('stem.titration.titration_lab_keyboard_shortcuts_1_thr', "Titration Lab. Keyboard shortcuts: 1 through 6 switch tabs."),
  tabIndex: 0,
  onKeyDown: onTitrKey
},

  // Global lab CSS animations
  React.createElement("style", null,
    '@keyframes safetyFadeUp { 0% { opacity:0; transform:translateY(16px); } 100% { opacity:1; transform:translateY(0); } } ' +
    '@keyframes safetyPulseGlow { 0%,100% { filter:drop-shadow(0 0 4px currentColor); } 50% { filter:drop-shadow(0 0 18px currentColor); } } ' +
    '@keyframes labGlow { 0%,100% { opacity:0.3; } 50% { opacity:0.6; } } ' +
    TITRATION_SUBSTRATE_CSS
  ),


  React.createElement("div", { id: "allo-live-titration", role: "status", "aria-live": "polite", "aria-atomic": "true", className: "sr-only" }, titrationLiveText),

  // ── Persistent Safety Banner ──
  React.createElement("div", {
    className: "flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border",
    style: { background: 'linear-gradient(90deg, rgba(16,185,129,0.12) 0%, rgba(6,182,212,0.08) 100%)', borderColor: 'rgba(16,185,129,0.3)' }
  },
    React.createElement("div", { className: "flex items-center gap-1 text-base" }, "\uD83E\uDD7D\uD83E\uDDE4\uD83E\uDD7C"),
    React.createElement("span", { className: "text-xs font-bold text-emerald-300 flex-1" }, __alloT('stem.titration.ppe_active_lab_safety_verified', "Pre-lab briefing complete \u2022 Review exact SDS before bench work")),
    React.createElement("button", {
      type: "button", "aria-pressed": titrationReduceMotion,
      "aria-label": titrationReduceMotion ? "Motion reduced. Restore lab motion" : "Reduce nonessential lab motion",
      onClick: function (event) {
        var nextReduced = !titrationReduceMotion;
        updMulti({
          titrationReduceMotion: nextReduced,
          additionAnimating: false,
          titrationAnimPaused: nextReduced ? true : titrationAnimPaused
        });
        var instance = event.currentTarget && event.currentTarget.closest('[data-titration-instance]');
        var localCanvas = instance && instance.querySelector('[data-titration-anim="true"]');
        if (nextReduced && localCanvas && typeof localCanvas._ttSetPaused === 'function') {
          localCanvas._ttSetPaused(true);
        }
      },
      className: "min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 " +
        (titrationReduceMotion ? "bg-cyan-900/50 text-cyan-100 border-cyan-500" : "bg-slate-900/40 text-slate-200 border-slate-600 hover:bg-slate-800")
    }, titrationReduceMotion ? "Motion reduced" : "Reduce motion"),
    React.createElement("button", { type: "button", "aria-label": __alloT('stem.titration.safety_info', "Safety Info"), "aria-expanded": showSafetyRef, "aria-controls": "titration-safety-reference",
      onClick: function () { upd('showSafetyRef', !showSafetyRef); },
      className: "min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 " +
        (showSafetyRef ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40" : "transition-colors text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 active:scale-[0.97]")
    }, __alloT('stem.titration.safety_info_2', "\u26A0\uFE0F Safety Info")),
    React.createElement("button", { type: "button", "aria-label": __alloT('stem.titration.hazards', "Hazards"), "aria-expanded": showHazards, "aria-controls": "titration-hazards-panel",
      onClick: function () { upd('showHazards', !showHazards); },
      className: "min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 " +
        (showHazards ? "bg-red-500/20 text-red-300 ring-1 ring-red-500/40" : "transition-colors text-red-400 hover:text-red-300 hover:bg-red-500/10 active:scale-[0.97]")
    }, __alloT('stem.titration.hazards_2', "SDS Hazards"))
  ),

  // ── Safety Reference Panel (toggled) ──
  showSafetyRef && React.createElement("div", {
    id: "titration-safety-reference", role: "region", "aria-label": "Quick safety reference",
    className: "rounded-xl p-4 border space-y-2 animate-in slide-in-from-top duration-200",
    style: Object.assign({}, glass, { background: 'rgba(120,53,15,0.3)', borderColor: 'rgba(251,191,36,0.2)' })
  },
    React.createElement("div", { className: "text-xs font-black text-amber-400 mb-2" }, __alloT('stem.titration.quick_safety_reference', "\u26A0\uFE0F Quick Safety Reference")),
    React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2" },
      safetyItems.slice(0, 4).map(function (item) {
        return React.createElement("div", { key: item.id, className: "flex items-center gap-2 text-[0.6875rem] text-amber-200/70" },
          React.createElement("span", null, item.icon), React.createElement("span", null, item.label)
        );
      })
    ),
    React.createElement("div", { className: "text-[0.6875rem] text-amber-300/50 mt-1" },
      __alloT('stem.titration.eyewash_10_second_rule_fire_extinguish', "\uD83D\uDEBF Eyewash located; flush immediately after exposure \u2022 \uD83D\uDEA8 Alarm and exit route known \u2022 \uD83D\uDCCB Exact SDS reviewed"))
  ),

  // ── Chemical Hazards Panel (toggled) ──
  showHazards && React.createElement("div", {
    id: "titration-hazards-panel", role: "region", "aria-label": "Chemical hazard information",
    className: "rounded-xl p-4 border space-y-3 animate-in slide-in-from-top duration-200",
    style: Object.assign({}, glass, { background: 'rgba(127,29,29,0.15)', borderColor: 'rgba(248,113,113,0.2)' })
  },
    React.createElement("div", { className: "text-xs font-black text-red-400 mb-1" }, __alloT('stem.titration.chemical_hazard_information', "Chemical Hazard Information")),
    React.createElement("p", { className: "text-xs text-slate-300 leading-relaxed" }, "Classification depends on the exact supplier, formulation, and concentration. These reference cards do not replace the SDS for the bottle in your lab."),
    (presetHazardKeys[presetId] || []).map(function (chem) {
      var h = chemHazards[chem];
      if (!h) return null;
      return React.createElement("section", { key: chem, className: "rounded-lg p-3 border", "aria-label": h.name + ' working-solution safety reference', style: { background: 'rgba(0,0,0,0.2)', borderColor: h.color + '45' } },
        React.createElement("div", { className: "flex items-center gap-3 mb-2" },
          React.createElement("span", { "aria-hidden": true, className: "min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-xs font-black border", style: { color: h.color, borderColor: h.color + '66' } }, 'SDS'),
          React.createElement("div", null, React.createElement("h4", { className: "text-sm font-black", style: { color: h.color } }, h.name), React.createElement("p", { className: "text-xs text-slate-100 mt-1" }, h.working))
        ),
        React.createElement("p", { className: "text-xs text-slate-200 leading-relaxed" }, React.createElement("span", { className: "font-black text-amber-300" }, 'Reference profile: '), h.classification),
        h.hazards.map(function (hz) { return React.createElement("p", { key: hz, className: "mt-1 text-xs text-slate-200 leading-relaxed" }, hz); }),
        React.createElement("p", { className: "mt-2 text-xs text-slate-200 leading-relaxed" }, React.createElement("span", { className: "font-black text-emerald-300" }, 'First response: '), h.firstAid),
        React.createElement("p", { className: "mt-1 text-xs text-slate-200 leading-relaxed" }, React.createElement("span", { className: "font-black text-cyan-300" }, 'Disposal: '), h.disposal)
      );
    })
  ),

  // ── Contextual Safety Tip ──
  activeTip && React.createElement("div", {
    className: "flex items-start gap-3 px-4 py-3 rounded-xl border animate-in fade-in duration-300",
    style: { background: 'rgba(5,30,45,0.75)', borderColor: activeTip.color + '40' }
  },
    React.createElement("span", { className: "text-lg shrink-0" }, activeTip.icon),
    React.createElement("div", null,
      React.createElement("div", { className: "text-[0.6875rem] font-black uppercase tracking-wider mb-0.5", style: { color: activeTip.color } }, __alloT('stem.titration.safety_tip', "Safety Tip")),
      React.createElement("div", { className: "text-[0.6875rem] text-slate-300 leading-relaxed" }, activeTip.text)
    )
  ),


  // ── Header ──

  React.createElement("div", {

    className: "rounded-2xl p-5 border",

    style: Object.assign({}, glass, { background: 'linear-gradient(135deg, #021a2b 0%, #0a2540 50%, #0c1e35 100%)', borderColor: 'rgba(6,182,212,0.25)' })

  },

    React.createElement("div", { className: "flex items-center justify-between mb-2" },

      React.createElement("button", { type: "button", "aria-label": __alloT('stem.titration.back_3', "Back"),

        onClick: function () { setStemLabTool(null); },

        className: "text-xs font-bold text-cyan-400 hover:text-white transition-colors"

      }, __alloT('stem.titration.back_4', "\u2190 Back")),

      React.createElement("h3", { className: "text-lg font-black text-white tracking-tight" }, __alloT('stem.titration.virtual_titration_lab', "\uD83E\uDDEA Virtual Titration Lab")),
      React.createElement("span", { className: "text-[0.6875rem] text-slate-400 ml-1" }, "v2.0")

    ),

    React.createElement("p", { className: "text-xs text-slate-200 text-center" },

      "Flask: ", preset.acidName, " (", preset.volAcid, __alloT('stem.titration.ml_burette', " mL)  \u2022  Burette: "), preset.baseName

    )

  ),

  // ── Experiment command (Titrate only) ──
  // Everything in here is the Titrate experiment's live state. See the note in pass 11:
  // on Challenge it contradicted the graded mode's "no pH readout" rule, and on the
  // other tabs it was stale. The per-tab hero band below carries the correct heading.
  labTab === 'titrate' && React.createElement("section", { "data-titration-command": true, className: "relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/70 via-slate-900 to-indigo-950/60 p-4 sm:p-5", "aria-labelledby": "titration-command-title" },
    React.createElement("div", { className: "absolute -right-5 -top-8 text-8xl opacity-[0.06]", "aria-hidden": true }, "🧪"),
    React.createElement("div", { className: "relative grid gap-4 lg:grid-cols-[1.1fr_.9fr]" },
      React.createElement("div", null,
        React.createElement("div", { className: "text-[0.625rem] font-black uppercase tracking-[0.15em] text-cyan-300" }, "Experiment command"),
        React.createElement("h2", { id: "titration-command-title", className: "mt-2 text-xl sm:text-2xl font-black text-white" }, volumeAdded === 0 ? "Prepare a controlled first addition" : pastEquivalence ? "Equivalence passed — evaluate endpoint bias" : atEquivalence ? "At equivalence — compare the indicator signal" : Math.abs(volumeAdded - Veq) <= 2 ? "Approach equivalence drop by drop" : "Build the titration curve"),
        React.createElement("p", { className: "mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed" }, volumeAdded === 0 ? (isPotentiometric ? "Confirm the preset, then add titrant while watching both the colour and the electrode potential." : "Confirm the preset and indicator, then add titrant while watching both color and pH.") : pastEquivalence ? "Compare the observed endpoint with the stoichiometric equivalence volume before resetting." : atEquivalence ? "This is the stoichiometric point; check whether the selected indicator has already changed, is changing, or has not changed yet." : Math.abs(volumeAdded - Veq) <= 2 ? "The curve is steep here. Use the smallest additions and swirl after every drop." : "Add measured volumes, observe the response, and predict where the sharp change will occur."),
        React.createElement("div", { className: "mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4", "aria-label": "Live titration metrics" },
          [[volumeAdded.toFixed(1) + ' mL', 'Titrant'], [yAxis.readout(currentY) + yAxis.unit, isPotentiometric ? 'Cell potential' : 'Current pH'], [Veq.toFixed(1) + ' mL', 'Equivalence'], [indicatorStatus, isPotentiometric ? 'MnO₄⁻ colour' : 'Indicator', true]].map(function(metric) {
            // metric[2] marks a value that is a PHRASE rather than a number. Numbers are
            // short and truncating them is safe; "Before endpoint" is not, and it clipped
            // to "Before e..." in the tool's opening state.
            var wordy = !!metric[2];
            return React.createElement("div", { key: metric[1], className: "rounded-xl border border-white/10 bg-white/5 p-3" },
              React.createElement("div", {
                className: "font-black text-white leading-tight " +
                  (wordy ? "text-sm break-words" : "text-base truncate")
              }, metric[0]),
              React.createElement("div", { className: "mt-1 text-[0.625rem] font-bold text-slate-400" }, metric[1]));
          })
        )
      ),
      // role=group, not <aside>. A complementary landmark nested inside the section's
      // own region is a WCAG landmark-structure violation, and this panel is not
      // complementary content anyway — it is the progress readout for the activity
      // right beside it. A bare labelled <div> would have its aria-label dropped, so
      // the role has to stay.
      React.createElement("div", { role: "group", className: "rounded-xl border border-cyan-500/20 bg-black/20 p-4", "aria-label": "Equivalence progress" },
        React.createElement("div", { className: "flex items-center justify-between gap-3" }, React.createElement("span", { className: "text-[0.625rem] font-black uppercase tracking-wide text-cyan-300" }, "Equivalence progress"), React.createElement("span", { className: "text-lg font-black text-white" }, Math.min(100, Math.round(volumeAdded / Math.max(0.1, Veq) * 100)) + "%")),
        React.createElement("div", { className: "mt-3 h-2 overflow-hidden rounded-full bg-slate-800", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.min(100, Math.round(volumeAdded / Math.max(0.1, Veq) * 100)), "aria-label": "Progress toward equivalence volume" }, React.createElement("div", { className: "h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all", style: { width: Math.min(100, volumeAdded / Math.max(0.1, Veq) * 100) + '%' } })),
        React.createElement("ol", { className: "mt-4 space-y-2 text-[0.6875rem] text-slate-300" }, ["Measure volume precisely", isPotentiometric ? "Track colour and potential together" : "Track color and pH together", "Distinguish endpoint from equivalence"].map(function(step, i) {
          return React.createElement("li", { key: step, className: "flex gap-2" }, React.createElement("span", { className: "font-black text-cyan-400" }, (i + 1) + "."), React.createElement("span", null, step));
        }))
      )
    )
  ),

  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 border-b border-slate-700 pb-2", role: "tablist", "aria-label": "Titration Lab sections" },
    [
      { id: 'titrate', label: __alloT('stem.titration.titrate', '\uD83E\uDDEA Titrate'), color: '#38bdf8' },
      { id: 'challenge', label: __alloT('stem.titration.challenge', '\uD83C\uDFC6 Challenge'), color: '#f59e0b' },
      { id: 'incidents', label: __alloT('stem.titration.safety_drills', '\uD83D\uDEA8 Safety Drills'), color: '#ef4444' },
      { id: 'equipment', label: __alloT('stem.titration.equipment', '\uD83D\uDD2C Equipment'), color: '#22c55e' },
      { id: 'molarity', label: __alloT('stem.titration.dilution_calc', '\uD83E\uDDEE Dilution Calc'), color: '#a78bfa' },
      { id: 'buffers', label: __alloT('stem.titration.buffers', '\uD83D\uDEE1\uFE0F Buffers'), color: '#0891b2' }
    ].map(function(tab) {
      var active = labTab === tab.id;
      return React.createElement("button", { type: "button", "aria-label": "Switch to " + tab.label + " tab",
        key: tab.id,
        id: 'titration-tab-' + tab.id,
        role: "tab",
        'aria-controls': 'titration-panel',
        'aria-selected': active ? "true" : "false",
        tabIndex: active ? 0 : -1,
        onKeyDown: function(e) { onTitrTabKey(e, _TITR_TABS.indexOf(tab.id)); },
        onClick: function() { upd('labTab', tab.id); },
        className: "min-h-[44px] w-full px-3 py-2 rounded-full text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 " +
          (active ? "shadow-lg" : "transition-colors text-slate-200 hover:text-white bg-slate-800/50 hover:bg-slate-700/60 border border-slate-700 active:scale-[0.97]"),
        style: active ? { background: tab.color, color: titrOnColor(tab.color), boxShadow: '0 0 12px ' + tab.color + '40' } : {}
      }, tab.label);
    })
  ),

  React.createElement("div", {
    role: "tabpanel",
    id: 'titration-panel',
    'aria-labelledby': 'titration-tab-' + labTab,
    tabIndex: 0
  },

  // ── Topic-accent hero band (per tab) ──
  (function() {
    var TAB_META = {
      titrate:    { accent: '#38bdf8', soft: 'rgba(56,189,248,0.10)', icon: '\uD83E\uDDEA', title: __alloT('stem.titration.titrate_find_the_equivalence_point', 'Titrate \u2014 find the equivalence point'),  hint: __alloT('stem.titration.add_titrant_drop_by_drop_until_indicat', 'Add titrant carefully while following the selected endpoint signal. Equivalence is stoichiometric balance; an endpoint is the visual or instrumental signal used to estimate it.') },
      challenge:  { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)', icon: '\uD83C\uDFC6', title: __alloT('stem.titration.challenge_graded_titrations', 'Challenge \u2014 graded titrations'),           hint: __alloT('stem.titration.match_real_world_unknowns_by_titrating', 'Determine a hidden concentration from authentic initial and final burette readings. Calculate titre = final \u2212 initial, select concordant trials, and separate stopping error from indicator-method bias. A question bank on safety and theory sits alongside it.') },
      incidents:  { accent: '#f87171', soft: 'rgba(220,38,38,0.10)',  icon: '\uD83D\uDEA8', title: __alloT('stem.titration.safety_drills_what_could_go_wrong', 'Safety drills \u2014 what could go wrong'),     hint: __alloT('stem.titration.burette_explodes_acid_burns_spill_indi', 'Practice protocol-first responses to splashes, spills, fumes, incompatible chemicals, and other realistic lab incidents.') },
      equipment:  { accent: '#22c55e', soft: 'rgba(34,197,94,0.10)',  icon: '\uD83D\uDD2C', title: __alloT('stem.titration.equipment_burette_flask_pipette', 'Equipment \u2014 burette, flask, pipette'),     hint: __alloT('stem.titration.burette_tolerance_0_05_ml_volumetric_f', 'Distinguish 0.01 mL displayed readings, a typical 50 mL Class AS manufacturer error limit of ±0.05 mL, this activity’s scoring target, and the course-defined concordance range. They are not interchangeable.') },
      molarity:   { accent: '#a78bfa', soft: 'rgba(167,139,250,0.10)', icon: '\uD83E\uDDEE', title: __alloT('stem.titration.dilution_calculator_m_v_m_v', 'Dilution calculator \u2014 M\u2081V\u2081 = M\u2082V\u2082'),     hint: __alloT('stem.titration.stock_diluent_desired_concentration_th', 'Stock + diluent \u2192 desired concentration. The 4 most-tested AP Chem problems all reduce to this single equation. Track significant figures: weakest measurement sets the answer.') },
      // cyan-600 as a 15 px bold title measured 4.33:1 against the strip's gradient; it
      // hid behind that gradient until the audit learned to read the stops. cyan-400
      // brings it in line with the other tab accents.
      buffers:    { accent: '#22d3ee', soft: 'rgba(8,145,178,0.10)',  icon: '\uD83D\uDEE1\uFE0F', title: __alloT('stem.titration.buffer_discovery_when_does_a_buffer_ho', 'Buffer discovery \u2014 when does a buffer hold?'), hint: __alloT('stem.titration.adjust_acid_strength_a_ha_ratio_starti', 'Adjust acid strength, [A\u207B]/[HA] ratio, starting pH. Discrete outcome: good buffer or poor buffer (after 20% more acid added). No score, no reveal \u2014 just sweep and observe.') }
    };
    var meta = TAB_META[labTab] || TAB_META.titrate;
    return React.createElement('div', {
      style: {
        margin: '12px 0',
        padding: '12px 14px',
        borderRadius: 12,
        background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(15,23,42,0) 100%)',
        border: '1px solid ' + meta.accent + '55',
        borderLeft: '4px solid ' + meta.accent,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
      }
    },
      React.createElement('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
      React.createElement('div', { style: { flex: '1 1 220px', minWidth: 0, overflowWrap: 'anywhere' } },
        React.createElement('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
        React.createElement('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
      )
    );
  })(),



  // ── Preset Buttons (visible on titrate tab) ──

  labTab === 'titrate' && React.createElement("div", { className: "flex flex-wrap gap-2 justify-center" },

    presets.map(function (p) {

      var active = p.id === presetId;

      return React.createElement("button", { type: "button", "aria-label": "Select titration preset: " + p.label, "aria-pressed": active,

        key: p.id,

        onClick: function () {

          updMulti({ presetId: p.id, volumeAdded: 0, _reachedEquiv: false, _prevVolume: 0, additionAnimating: false });

          if (typeof awardStemXP === 'function') awardStemXP('titrationLab', 3, 'Preset loaded');

        },

        className: "min-h-[44px] px-3 py-2 rounded-full text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 " +

          (active ? "shadow-lg" : "transition-colors text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 border border-slate-600 active:scale-[0.97]"),

        style: active ? { background: p.color, color: titrOnColor(p.color), boxShadow: '0 0 12px ' + p.color + '60' } : {}

      }, p.icon + " " + p.label);

    })

  ),



  // ── Indicator Selector ──

  labTab === 'titrate' && (isPotentiometric
    ? React.createElement("div", { className: "max-w-2xl mx-auto rounded-xl border border-fuchsia-500/40 bg-fuchsia-950/20 px-4 py-3 text-xs text-fuchsia-100", role: "note" },
        React.createElement("span", { className: "font-black" }, "ENDPOINT METHOD: "),
        "Permanganate is self-indicating; the platinum electrode potential supplies the instrumental trace. No acid–base indicator is added.")
    : React.createElement("div", { className: "flex flex-wrap gap-2 justify-center" },

    React.createElement("span", { className: "text-xs text-slate-200 font-bold self-center mr-1" }, "INDICATOR:"),

    indicators.map(function (ind) {

      var active = ind.id === indicatorId;

      return React.createElement("button", { type: "button", "aria-label": "Select indicator: " + ind.label, "aria-pressed": active,

        key: ind.id,

        onClick: function () { upd('indicator', ind.id); },

        className: "min-h-[44px] px-3 py-2 rounded-full text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 " +

          (active ? "text-white bg-slate-700 ring-2 ring-cyan-400" : "transition-colors text-slate-200 bg-slate-800/50 hover:bg-slate-700/60 border border-slate-700 active:scale-[0.97]")

      }, ind.label);

    })

  )),



  // ── Endpoint vs. equivalence coaching ──
  labTab === 'titrate' && indicatorAnalysisOn && React.createElement("div", {
    className: "rounded-xl p-3 border text-xs leading-relaxed max-w-2xl mx-auto",
    role: "status",
    style: indicatorMismatch
      ? { background: 'rgba(127,29,29,0.35)', borderColor: 'rgba(248,113,113,0.5)', color: '#fecaca' }
      : { background: 'rgba(6,78,59,0.32)', borderColor: 'rgba(52,211,153,0.45)', color: '#bbf7d0' }
  },
    indicatorMismatch
      ? [
          React.createElement("span", { key: 'h', className: "font-black" }, __alloT('stem.titration.endpoint_equivalence', '⚠ Endpoint and equivalence do not align closely. ')),
          visualIndicatorUnsuitable
            ? 'A weak-acid/weak-base curve has no sharp visual jump, so use potentiometric detection rather than relying on a color indicator. '
            : endpointVol != null
              ? indicator.label + ' reaches the midpoint of its pH ' + indicator.low + '–' + indicator.high + ' transition near ' + endpointVol.toFixed(2) + ' mL, about ' + titrationErrorMl.toFixed(2) + ' mL ' + (endpointVol < Veq ? 'before' : 'after') + ' equivalence. '
              : indicator.label + ' does not reach its transition midpoint within this run. ',
          React.createElement("span", { key: 'f', className: "font-bold" }, 'Choose a transition within the steep part of the curve or use an instrumental endpoint.')
        ]
      : [
          React.createElement("span", { key: 'h', className: "font-black" }, __alloT('stem.titration.good_indicator_choice', '✔ Suitable visual indicator. ')),
          indicator.label + ' reaches its transition midpoint near ' + endpointVol.toFixed(2) + ' mL, only ' + titrationErrorMl.toFixed(2) + ' mL from the stoichiometric equivalence volume. Suitability comes from the steep curve region, not from requiring the equivalence pH to fall inside the indicator range.'
        ]
  ),

  // ── Redox: what the axis is, and where the numbers come from ──
  // A redox titration is followed with a Pt electrode and a potentiometer, not a pH meter,
  // so the curve here is volts from the Nernst equation. Both half-reactions and both E°
  // values are on screen: the plotted curve should be checkable by hand against them.
  labTab === 'titrate' && isPotentiometric && React.createElement("div", {
    className: "rounded-xl p-3 border text-[0.75rem] leading-snug max-w-2xl mx-auto space-y-2",
    role: "status",
    style: { background: 'rgba(112,26,117,0.30)', borderColor: 'rgba(217,70,239,0.5)', color: '#f5d0fe' }
  },
    React.createElement("div", null,
      React.createElement("span", { className: "font-black" }, __alloT('stem.titration.redox_potentiometric_curve', '⚗ Redox titration — the y-axis is volts, not pH. ')),
      __alloT('stem.titration.redox_potentiometric_explainer', 'You follow a redox titration with a platinum electrode on a potentiometer. Before equivalence the Fe³⁺/Fe²⁺ couple sets the potential; after it, the leftover MnO₄⁻/Mn²⁺ couple takes over. The near-vertical jump between them is the endpoint.')
    ),
    React.createElement("div", { className: "font-mono text-[0.6875rem] leading-relaxed", style: { color: '#f0abfc' } },
      React.createElement("div", null, 'Fe³⁺ + e⁻ → Fe²⁺    E° = +0.771 V'),
      React.createElement("div", null, 'MnO₄⁻ + 8H⁺ + 5e⁻ → Mn²⁺ + 4H₂O    E° = +1.507 V'),
      React.createElement("div", null, 'E = E° + (0.05916/n)·log₁₀([ox]/[red])'),
      React.createElement("div", null, 'Eₑ = (1·0.771 + 5·1.507)/6 = ' + redoxEquivE().toFixed(3) + ' V')
    ),
    React.createElement("div", null,
      __alloT('stem.titration.redox_colour_and_formal_potential', 'You can also read the endpoint by eye — permanganate is self-indicating: it goes purple → colourless as it reacts, so the first faint lasting pink means a trace is left over. Two honest caveats: real 1 M H₂SO₄ shifts the iron couple down to a formal potential near 0.68 V because sulfate complexes Fe³⁺, and at exactly 0 mL the potential is undefined (no Fe³⁺ yet) — the curve starts from the trace of Fe³⁺ that air oxidation always leaves.')
    )
  ),



  // ── Volume Controls ──

  labTab === 'titrate' && React.createElement("div", {

    className: "rounded-xl p-3 border",

    style: Object.assign({}, glass, { background: 'rgba(5,30,45,0.75)', borderColor: 'rgba(100,116,139,0.3)' })

  },

    React.createElement("div", { className: "flex items-center gap-3 flex-wrap" },

      React.createElement("span", { className: "text-[0.6875rem] text-slate-200 font-bold" }, __alloT('stem.titration.titrant_volume', "TITRANT VOLUME:")),

      React.createElement("input", {

        type: "range", min: 0, max: curveMaxVol, step: 0.1, value: volumeAdded,

        onChange: function (e) { updMulti({ volumeAdded: parseFloat(e.target.value), _prevVolume: volumeAdded }); },

        'aria-label': __alloT('stem.titration.titrant_volume_2', 'Titrant volume'),

        'aria-valuetext': volumeAdded.toFixed(1) + ' milliliters, ' + yAxis.speech(currentY) + ', ' + indicatorStatus,

        className: "flex-1 min-w-[160px] min-h-[44px] accent-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 rounded",

        style: { height: '6px' }

      }),

      React.createElement("span", {

        className: "text-sm font-black tabular-nums min-w-[70px] text-right",

        style: { color: pastEquivalence ? '#f87171' : '#38bdf8' }

      }, volumeAdded.toFixed(1) + " mL"),

      // Drip buttons

      [0.1, 0.5, 1, 5].map(function (amt) {
        var dropIcon = amt <= 0.1 ? '💧' : amt <= 1 ? '💧💧' : '🌊';
        return React.createElement("button", { type: "button", "aria-label": "Add " + amt + " milliliters of titrant",
          key: amt,
          onClick: function () { addTitrantAmount(amt); },
          className: "min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg text-xs font-bold text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 bg-cyan-900/30 hover:bg-cyan-800/50 border border-cyan-800/40 transition-all hover:scale-105 active:scale-[0.97]",
          title: amt <= 0.5 ? 'Drop-by-drop (precise)' : 'Stream (fast)'
        }, dropIcon + " +" + amt);
      }),

      React.createElement("button", { type: "button", "aria-label": __alloT('stem.titration.reset_titration_volume_to_zero', "Reset titration volume to zero"),
        onClick: function () { updMulti({ volumeAdded: 0, _reachedEquiv: false, _prevVolume: 0, additionAnimating: false }); if (addToast) addToast('♻️ ' + safetyTips.reset.text, 'info'); },
        className: "min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg text-xs font-bold text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 bg-amber-900/30 hover:bg-amber-800/50 border border-amber-800/40 transition-all hover:scale-105 active:scale-[0.97]"
      }, __alloT('stem.titration.reset', "↺ Reset"))

    )

  ),



  labTab === 'titrate' && React.createElement(TitrationExperimentBench, {
    React: React, t: __alloT, view: d.experimentView === 'diagram' ? 'diagram' : '3d',
    onView: function(view) { setExperimentReady(false); upd('experimentView', view); }, onReady: setExperimentReady,
    setup: preset.acidName + ' + ' + preset.baseName,
    onAdd: addTitrantAmount, canAdd: volumeAdded < curveMaxVol,
    remaining: Number((curveMaxVol-volumeAdded).toFixed(1)), notebook: d.benchNotebook,
    onNotebook: function(records){upd('benchNotebook',records);},
    currentReading: {preset:presetId,setup:preset.acidName+' + '+preset.baseName,axis:yAxis.mode,value:Number(yAxis.readout(currentY)),volume:Number(volumeAdded.toFixed(1)),observation:indicatorStatus,indicator:isPotentiometric?'KMnO₄':indicator.label},
    curve: { points: curveData, volume: volumeAdded, value: currentY, maxVolume: curveMaxVol, equivalence: Veq, min: yAxis.min, max: yAxis.max, tick: yAxis.tick, label: yAxis.label, readout: yAxis.speech(currentY), description: volumeAdded.toFixed(1) + ' mL. ' + yAxis.speech(currentY) + '. ' + indicatorStatus },
    colorReference: {identity:isPotentiometric?presetId:indicatorId,redox:isPotentiometric,universal:indicatorId==='universal',label:isPotentiometric?'KMnO₄':indicator.label,low:indicator.low,high:indicator.high,max:isPotentiometric?curveMaxVol:14,value:isPotentiometric?volumeAdded:currentPH,equivalence:Veq,readout:yAxis.speech(currentY),observation:indicatorStatus,colorAt:isPotentiometric?function(v){return getRedoxFlaskColor(redoxFraction(v));}:getIndicatorColor},
    model: { reading: physicalBuretteReading, delivered: volumeAdded, fill: flaskFillFrac, color: currentColor, redox: isPotentiometric, contrast: !!ctx.isContrast, animating: additionAnimating, pulse: d.additionPulse || 0,
      flashColor: endpointBloomColor, flashHold: endpointBloomHold },
    description: __alloT('stem.titration.burette_flask', 'BURETTE & FLASK') + '. ' + volumeAdded.toFixed(1) + ' mL. ' + yAxis.speech(currentY) + '. ' + indicatorStatus,
    readings: [
      [__alloT('stem.titration.titrant_volume', 'TITRANT VOLUME:'), volumeAdded.toFixed(1) + ' mL'],
      [__alloT('stem.titration.burette', 'Burette') + ' (50 mL)', physicalBuretteReading.toFixed(1) + ' mL'],
      [isPotentiometric ? __alloT('stem.titration.cell_potential_caps', 'CELL POTENTIAL') : __alloT('stem.titration.current_ph', 'CURRENT pH'), yAxis.readout(currentY) + yAxis.unit]
    ],
    observation: indicatorStatus + (physicalRefills > 0 ? ' · ' + physicalRefills + ' × 50 mL' : '')
  }),

  // ── Main Layout: Burette/Flask + SVG Chart ──

  labTab === 'titrate' && React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-4" },



    // ── Left: Burette & Flask Visual ──

    !experimentReady && React.createElement("div", {

      className: "rounded-2xl p-4 border flex flex-col items-center",

      style: Object.assign({}, glass, { background: 'rgba(3,25,40,0.85)', borderColor: 'rgba(100,116,139,0.3)' })

    },

      React.createElement("div", { className: "text-[0.6875rem] font-bold text-slate-200 mb-2" }, __alloT('stem.titration.burette_flask', "BURETTE & FLASK")),



      // Burette container

      React.createElement("div", { style: { position: 'relative', width: buretteW + 40 + 'px', height: buretteH + 120 + 'px' } },



        // Scale markings

        [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map(function (ml) {

          var major = ml % 10 === 0;
          var yPos = (ml / BURETTE.CAPACITY_ML) * buretteH;

          return React.createElement("div", { key: ml, style: { position: 'absolute', left: '0px', top: yPos + 'px', display: 'flex', alignItems: 'center', gap: '2px' } },

            React.createElement("span", { style: { fontSize: '11px', color: major ? '#cbd5e1' : 'transparent', width: '18px', textAlign: 'right', fontFamily: 'monospace' }, "aria-hidden": !major }, major ? ml : ''),

            React.createElement("div", { style: { width: major ? '7px' : '4px', height: '1px', background: major ? '#94a3b8' : '#475569' } })

          );

        }),



        // Burette tube
        React.createElement("div", {
          style: { position: 'absolute', left: '20px', top: '0px', width: buretteW + 'px', height: buretteH + 'px',
            border: '2px solid rgba(148,163,184,0.4)', borderRadius: '4px 4px 2px 2px',
            background: 'rgba(15,23,42,0.5)', overflow: 'hidden' }
        },
          // Titrant remaining, hanging BELOW the meniscus — see meniscusTop.
          React.createElement("div", {
            style: { position: 'absolute', top: meniscusTop + 'px', left: '0px', right: '0px',
              height: liquidH + 'px',
              background: 'linear-gradient(180deg, rgba(56,189,248,0.55) 0%, rgba(56,189,248,0.28) 100%)',
              transition: 'top 0.3s ease, height 0.3s ease' }
          }),
          // Meniscus: the concave surface of what is left, on the mark it reads.
          React.createElement("div", {
            style: { position: 'absolute', top: meniscusTop + 'px', left: '2px', right: '2px', height: '4px',
              background: 'rgba(56,189,248,0.85)', borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
              transition: 'top 0.3s ease', boxShadow: '0 0 5px rgba(56,189,248,0.55)' }
          }),
          // Glass shine
          React.createElement("div", {
            style: { position: 'absolute', top: 0, left: '2px', width: '4px', height: '100%',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%)',
              borderRadius: '2px' }
          })
        ),


        // Stopcock with handle
        React.createElement("div", {
          style: { position: 'absolute', left: (20 + buretteW / 2 - 3) + 'px', top: buretteH + 'px',
            width: '6px', height: '15px', background: 'rgba(148,163,184,0.5)', borderRadius: '0 0 2px 2px' }
        }),
        // Stopcock handle
        React.createElement("div", {
          style: { position: 'absolute', left: (20 + buretteW / 2 - 10) + 'px', top: (buretteH + 4) + 'px',
            width: '20px', height: '5px', background: 'rgba(148,163,184,0.3)', borderRadius: '2px',
            transform: additionAnimating ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.3s ease' }
        }),


        // Animated drip (CSS animation via inline keyframes)
        additionAnimating && React.createElement("div", {
          style: { position: 'absolute', left: (20 + buretteW / 2 - 2) + 'px', top: buretteH + 16 + 'px',
            width: '4px', height: '6px', background: 'rgba(56,189,248,0.8)',
            borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%',
            animation: 'titrationDrip 0.8s 1 ease-in both',
            filter: 'drop-shadow(0 0 3px rgba(56,189,248,0.5))' }
        }),

        // Drip CSS keyframes (injected once)
        React.createElement("style", null,
          '@keyframes titrationDrip { 0% { opacity:1; transform:translateY(0); } 70% { opacity:1; transform:translateY(12px); } 100% { opacity:0; transform:translateY(16px) scale(1.5); } } ' +
          '@keyframes stirSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } ' +
          '@keyframes bubbleRise { 0% { opacity:0.7; transform: translateY(0) scale(1); } 100% { opacity:0; transform: translateY(-20px) scale(0.3); } } ' +
          '@keyframes titrationBloom { 0% { opacity:0; transform:scale(0.35); } 18% { opacity:0.85; transform:scale(0.8); } 100% { opacity:0; transform:scale(2.3); } }'
        ),


        // Flask (Erlenmeyer shape via SVG) — Enhanced
        React.createElement("svg", {
          width: buretteW + 40, height: 90, role: "img",
          "aria-label": isPotentiometric ? __alloT('stem.titration.flask_diagram_redox', "Titration flask diagram showing the permanganate colour of the solution.") : __alloT('stem.titration.flask_diagram', "Titration flask diagram showing the current pH and indicator state."),
          style: { position: 'absolute', left: '0px', top: buretteH + 30 + 'px' }
        },
          // Flask glow when near equivalence
          pastEquivalence && React.createElement("ellipse", {
            cx: (buretteW + 40) / 2, cy: 70, rx: 30, ry: 10,
            fill: currentColor, opacity: 0.15, style: { filter: 'blur(8px)' }
          }),

          // Flask outline
          React.createElement("path", {
            d: 'M' + (buretteW / 2 + 10) + ' 0 L' + (buretteW / 2 + 14) + ' 0 L' + (buretteW / 2 + 14) + ' 20 L' + (buretteW + 35) + ' 72 L' + (buretteW + 35) + ' 78 Q' + (buretteW + 35) + ' 82 ' + (buretteW + 31) + ' 82 L5 82 Q1 82 1 78 L1 72 L' + (buretteW / 2 + 10) + ' 20 Z',
            fill: 'none', stroke: 'rgba(148,163,184,0.4)', strokeWidth: '1.5'
          }),

          // Flask liquid fill with gradient
          React.createElement("defs", null,
            React.createElement("linearGradient", { id: flaskGradientId, x1: "0", y1: "0", x2: "0", y2: "1" },
              React.createElement("stop", { offset: "0%", stopColor: currentColor, stopOpacity: "0.5", style: { transition: 'stop-color 0.5s ease' } }),
              React.createElement("stop", { offset: "100%", stopColor: currentColor, stopOpacity: "0.85", style: { transition: 'stop-color 0.5s ease' } })
            )
          ),
          React.createElement("path", {
            d: 'M' + flaskSurfaceR.toFixed(1) + ' ' + flaskSurfaceY.toFixed(1) +
               ' L' + (buretteW + 32) + ' 72 L' + (buretteW + 32) + ' 78 Q' + (buretteW + 32) + ' 80 ' + (buretteW + 28) + ' 80' +
               ' L8 80 Q4 80 4 78 L4 72 L' + flaskSurfaceL.toFixed(1) + ' ' + flaskSurfaceY.toFixed(1) + ' Z',
            fill: 'url(#' + flaskGradientId + ')', style: { transition: 'fill 0.5s ease, d 0.4s ease' }
          }),

          // The surface. This is what makes a COLOURLESS solution read as liquid at all:
          // the tint alone is ~0.2 alpha on a near-black panel and disappears, but every
          // real liquid shows its surface, so drawing one claims nothing about colour.
          React.createElement("line", {
            x1: flaskSurfaceL.toFixed(1), y1: flaskSurfaceY.toFixed(1),
            x2: flaskSurfaceR.toFixed(1), y2: flaskSurfaceY.toFixed(1),
            stroke: currentColor, strokeWidth: '2.5', strokeLinecap: 'round',
            style: { transition: 'stroke 0.5s ease' }, opacity: 0.95
          }),
          React.createElement("line", {
            x1: flaskSurfaceL.toFixed(1), y1: flaskSurfaceY.toFixed(1),
            x2: flaskSurfaceR.toFixed(1), y2: flaskSurfaceY.toFixed(1),
            stroke: 'rgba(255,255,255,0.45)', strokeWidth: '0.8', strokeLinecap: 'round'
          }),

          // Glass shine on flask
          React.createElement("path", {
            d: 'M' + (buretteW / 2 + 11) + ' 5 L' + (buretteW / 2 + 12) + ' 20 L8 72',
            fill: 'none', stroke: 'rgba(255,255,255,0.12)', strokeWidth: '1.5'
          }),

          // A pool at the base. The gradient fill fades out toward the bottom, which on a
          // colourless solution left the widest part of the flask indistinguishable from
          // the panel behind it.
          React.createElement("path", {
            d: 'M6 70 L' + (buretteW + 30) + ' 70 L' + (buretteW + 32) + ' 78 Q' + (buretteW + 32) + ' 80 ' + (buretteW + 28) + ' 80 L8 80 Q4 80 4 78 Z',
            fill: currentColor, opacity: 0.55, style: { transition: 'fill 0.5s ease' }
          }),

          // Stir bar at bottom
          React.createElement("ellipse", {
            cx: (buretteW + 40) / 2, cy: 77, rx: 8, ry: 2.5,
            fill: '#1e293b', stroke: 'rgba(255,255,255,0.2)', strokeWidth: '0.5',
            style: { animation: additionAnimating ? 'stirSpin 0.5s 1 ease-out' : 'none' }
          }),

          // The same bloom the 3D bench shows, so a device without WebGL is not taught a
          // different titration. transform-box/transform-origin because an SVG element
          // otherwise scales about the ROOT origin and the bloom flies off the flask.
          additionAnimating && React.createElement("ellipse", {
            cx: (buretteW + 40) / 2, cy: Number(flaskSurfaceY) + 7, rx: 11, ry: 5,
            fill: endpointBloomColor,
            style: { animation: 'titrationBloom ' + endpointBloomMs + 'ms ease-out both',
              transformBox: 'fill-box', transformOrigin: 'center',
              filter: 'blur(1.5px)', mixBlendMode: 'screen' }
          }),

          // Bubbles at drip entry point
          additionAnimating && [0, 1, 2].map(function (i) {
            return React.createElement("circle", {
              key: 'b' + i,
              cx: (buretteW + 40) / 2 + (i - 1) * 4, cy: 35 + i * 5, r: 1.5 - i * 0.3,
              fill: 'rgba(56,189,248,0.4)',
              style: { animation: 'bubbleRise 0.8s ease-out ' + (i * 0.12) + 's 1 both' }
            });
          })
        )

      ),



      // pH display below flask

      React.createElement("div", {

        className: "mt-2 text-center rounded-lg px-4 py-2 border",

        style: { background: 'rgba(15,23,42,0.6)', borderColor: currentColor, borderWidth: '2px', transition: 'border-color 0.5s ease' }

      },

        React.createElement("span", { className: "text-[0.6875rem] text-slate-200 font-bold block" }, isPotentiometric ? __alloT('stem.titration.cell_potential_caps', "CELL POTENTIAL") : __alloT('stem.titration.current_ph', "CURRENT pH")),

        React.createElement("span", {

          className: "text-2xl font-black tabular-nums tracking-tight",

          style: { color: readoutColor, transition: 'color 0.5s ease' }

        }, yAxis.readout(currentY) + yAxis.unit)

      ),
      React.createElement("p", { className: "mt-2 text-xs text-slate-200 text-center tabular-nums" },
        physicalRefills > 0
          ? ('Cumulative titrant ' + volumeAdded.toFixed(1) + ' mL · current fill reading ' +
              physicalBuretteReading.toFixed(1) + ' mL · ' + physicalRefills + ' refill' + (physicalRefills === 1 ? '' : 's'))
          : ('Burette reading ' + physicalBuretteReading.toFixed(1) + ' mL · ' +
              Math.max(0, BURETTE.CAPACITY_ML - physicalBuretteReading).toFixed(1) + ' mL remaining')),
      curveMaxVol > BURETTE.CAPACITY_ML && React.createElement("p", { className: "mt-1 text-xs text-amber-200 text-center leading-relaxed" },
        'This curve spans more than one 50 mL burette fill. The apparatus view advances to the next fill after each refill; in a real lab, record every initial and final reading.')

    ),



    // ── Right: SVG Titration Curve (2 cols wide) ──

    React.createElement("div", {

      className: "rounded-2xl p-4 border overflow-x-auto " + (experimentReady ? "lg:col-span-3" : "lg:col-span-2"),
      role: "region", "aria-label": "Scrollable titration curve plot", tabIndex: 0,
      style: Object.assign({}, glass, { background: 'rgba(3,25,40,0.85)', borderColor: 'rgba(100,116,139,0.3)' })

    },

      React.createElement("div", { className: "text-[0.6875rem] font-bold text-slate-200 mb-2" }, __alloT('stem.titration.titration_curve', "TITRATION CURVE")),

      React.createElement("svg", {

        viewBox: '0 0 ' + svgW + ' ' + svgH, className: "w-full min-w-[600px] sm:min-w-0 h-auto", preserveAspectRatio: "xMidYMid meet",

        role: "img", 'aria-describedby': 'titration-curve-caption',

        'aria-label': __alloT('stem.titration.sr_curve_for', 'Titration curve for ') + preset.label +
          __alloT('stem.titration.sr_currently', '. Currently ') + volumeAdded.toFixed(1) +
          __alloT('stem.titration.sr_ml_added_at', ' mL of titrant added at ') + yAxis.speech(currentY) +
          __alloT('stem.titration.sr_equiv_near', '. Equivalence point near ') + Veq.toFixed(1) +
          __alloT('stem.titration.sr_ml_at', ' mL at ') + yAxis.speech(equivY) + '.',

        style: { maxHeight: '340px' }

      },

        // Background

        React.createElement("rect", { x: pad.left, y: pad.top, width: chartW, height: chartH, fill: 'rgba(15,23,42,0.4)', rx: 4 }),



        // Indicator transition zone. A pH-indicator band is meaningless against a volts
        // axis — the redox preset self-indicates with permanganate colour instead — so the
        // band is drawn only in pH mode.

        !isPotentiometric && indicatorId !== 'universal' && React.createElement("rect", {

          x: pad.left, y: zoneY1, width: chartW, height: Math.max(0, zoneH),

          fill: indicator.colorMid, opacity: 0.17, rx: 2

        }),

        !isPotentiometric && indicatorId !== 'universal' && React.createElement("text", {

          x: pad.left + 4, y: zoneY1 + 12, fill: indicator.colorMid, fontSize: '11', fontWeight: 'bold', opacity: 0.95

        }, indicator.label + ' zone'),



        // Buffer region (weak acid/base): light purple band from ~10% to ~90% of Veq
        preset.Ka && React.createElement("rect", {
          x: xScale(Veq * 0.1), y: pad.top,
          width: Math.max(0, xScale(Veq * 0.9) - xScale(Veq * 0.1)),
          height: chartH,
          fill: 'rgba(167,139,250,0.10)', rx: 2
        }),

        preset.Ka && React.createElement("text", {
          x: xScale(Veq * 0.5), y: pad.top + 14,
          fill: '#a78bfa', fontSize: '12', textAnchor: 'middle', fontWeight: 'bold', opacity: 0.85
        }, __alloT('stem.titration.buffer_region', 'Buffer Region')),




        // Grid lines. pH mode picks out pH 7 as the neutral reference; volts mode has no
        // equivalent landmark on the axis itself (the reference is the equivalence
        // potential, drawn with the equivalence marker below).

        yAxis.grid.map(function (gv) {

          var isRef = yAxis.mode === 'pH' && gv === 7;

          return React.createElement("line", {

            key: 'g' + gv, x1: pad.left, y1: yScale(gv), x2: pad.left + chartW, y2: yScale(gv),

            stroke: isRef ? 'rgba(74,222,128,0.45)' : 'rgba(100,116,139,0.30)', strokeWidth: isRef ? 1.5 : 0.7,

            strokeDasharray: isRef ? '' : '3,3'

          });

        }),

        // pH 7 label

        // Inside the plot and right-anchored: the 20px gutter cannot hold a 9px bold
        // "pH 7", so left-anchoring it past the axis clipped the 7 off. Lifted clear of
        // its own line; at the right-hand edge the curve is far above pH 7 in every
        // preset, so nothing collides.
        yAxis.mode === 'pH' && React.createElement("text", {
          x: pad.left + chartW - 4, y: yScale(7) - 4, textAnchor: 'end',
          fill: '#4ade80', fontSize: '11', fontWeight: 'bold'
        }, __alloT('stem.titration.ph_7', 'pH 7')),



        // Y-axis labels

        yAxis.ticks.map(function (tv) {

          return React.createElement("text", {

            key: 'y' + tv, x: pad.left - 6, y: yScale(tv) + 3,

            fill: '#94a3b8', fontSize: '11', textAnchor: 'end', fontFamily: 'monospace'

          }, yAxis.tick(tv));

        }),



        // X-axis labels

        xTicks.map(function (ml) {

          return React.createElement("text", {

            key: 'x' + ml, x: xScale(ml), y: pad.top + chartH + 16,

            fill: ml === Math.round(Veq) ? '#f87171' : '#94a3b8', fontSize: '11', textAnchor: 'middle',

            fontWeight: ml === Math.round(Veq) ? 'bold' : 'normal', fontFamily: 'monospace'

          }, ml + (ml === Math.round(Veq) ? ' (V\u2091)' : ''));

        }),



        // Axis labels

        React.createElement("text", { x: pad.left + chartW / 2, y: svgH - 4, fill: '#94a3b8', fontSize: '12', textAnchor: 'middle', fontWeight: 'bold' }, __alloT('stem.titration.volume_of_titrant_ml', 'Volume of Titrant (mL)')),

        React.createElement("text", {

          x: 12, y: pad.top + chartH / 2, fill: '#94a3b8', fontSize: '12', textAnchor: 'middle', fontWeight: 'bold',

          transform: 'rotate(-90, 12, ' + (pad.top + chartH / 2) + ')'

        }, yAxis.label),



        // Equivalence point vertical line

        React.createElement("line", {

          x1: xScale(Veq), y1: pad.top, x2: xScale(Veq), y2: pad.top + chartH,

          stroke: '#f87171', strokeWidth: 1.5, strokeDasharray: '5,3', opacity: 0.7

        }),



        // Full curve (faded preview)

        React.createElement("path", {

          d: fullPath, fill: 'none', stroke: '#67e8f9', strokeWidth: 2, strokeDasharray: '7,5'

        }),



        // Active curve (bright, up to current volume)

        currentPath && React.createElement("path", {

          d: currentPath, fill: 'none', stroke: '#38bdf8', strokeWidth: 2.5,

          strokeLinecap: 'round', strokeLinejoin: 'round',

          style: { filter: 'drop-shadow(0 0 4px rgba(56,189,248,0.5))' }

        }),



        // Current position dot

        volumeAdded > 0 && React.createElement("circle", {

          cx: xScale(volumeAdded), cy: yScale(currentY), r: 5,

          fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 2,

          style: { filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.7))' }

        }),



        // Equivalence point marker

        React.createElement("circle", {

          cx: xScale(Veq), cy: yScale(equivY), r: 4,

          fill: 'none', stroke: '#f87171', strokeWidth: 1.5, strokeDasharray: '2,2'

        }),

        // Equivalence label (so students see the value at Veq at a glance) — the
        // equivalence pH for an acid-base run, the equivalence POTENTIAL for the redox one.
        React.createElement("text", {
          x: xScale(Veq) + 6, y: yScale(equivY) - 6,
          fill: '#f87171', fontSize: '12', fontWeight: 'bold',
          style: { textShadow: '0 0 4px rgba(15,23,42,0.9)' }
        }, (isPotentiometric ? 'Eₑ ' : 'pHₑ ') + yAxis.readout(equivY) + yAxis.unit),

        // Half-equivalence point (pH = pKa) — only meaningful for weak-acid titrations
        preset.Ka && React.createElement("line", {
          x1: xScale(Veq / 2), y1: pad.top, x2: xScale(Veq / 2), y2: pad.top + chartH,
          stroke: '#a78bfa', strokeWidth: 1, strokeDasharray: '4,3', opacity: 0.7
        }),

        preset.Ka && React.createElement("circle", {
          cx: xScale(Veq / 2), cy: yScale(-Math.log10(preset.Ka)), r: 4,
          fill: '#a78bfa', stroke: '#0f172a', strokeWidth: 1.5,
          style: { filter: 'drop-shadow(0 0 4px rgba(167,139,250,0.7))' }
        }),

        preset.Ka && React.createElement("text", {
          x: xScale(Veq / 2) + 6, y: yScale(-Math.log10(preset.Ka)) - 6,
          fill: '#a78bfa', fontSize: '12', fontWeight: 'bold',
          style: { textShadow: '0 0 4px rgba(15,23,42,0.9)' }
        }, '½ Vₑ → pH=pKₐ (' + (-Math.log10(preset.Ka)).toFixed(2) + ')'),

        // The redox counterpart of pH = pKa at half-equivalence. At ½Vₑ exactly half the
        // Fe²⁺ is oxidised, so [Fe³⁺] = [Fe²⁺], the log term in the Nernst equation is
        // zero, and the electrode reads the standard potential of the couple itself.
        isPotentiometric && React.createElement("line", {
          x1: xScale(Veq / 2), y1: pad.top, x2: xScale(Veq / 2), y2: pad.top + chartH,
          stroke: '#a78bfa', strokeWidth: 1, strokeDasharray: '4,3', opacity: 0.7
        }),

        isPotentiometric && React.createElement("circle", {
          cx: xScale(Veq / 2), cy: yScale(REDOX.E0_FE), r: 4,
          fill: '#a78bfa', stroke: '#0f172a', strokeWidth: 1.5,
          style: { filter: 'drop-shadow(0 0 4px rgba(167,139,250,0.7))' }
        }),

        isPotentiometric && React.createElement("text", {
          x: xScale(Veq / 2) + 6, y: yScale(REDOX.E0_FE) - 6,
          fill: '#a78bfa', fontSize: '12', fontWeight: 'bold',
          style: { textShadow: '0 0 4px rgba(15,23,42,0.9)' }
        }, '½ Vₑ → E=E°(Fe) (' + REDOX.E0_FE.toFixed(3) + ' V)')

      ),

      React.createElement("div", { className: "mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-200", "aria-label": "Titration curve legend" },
        React.createElement("span", { className: "inline-flex items-center gap-2" }, React.createElement("span", { "aria-hidden": true, className: "inline-block h-1 w-8 rounded bg-cyan-400" }), "Observed curve"),
        React.createElement("span", { className: "inline-flex items-center gap-2" }, React.createElement("span", { "aria-hidden": true, className: "inline-block w-8 border-t-2 border-dashed border-cyan-200" }), "Dashed full-curve preview"),
        React.createElement("span", { className: "inline-flex items-center gap-2" }, React.createElement("span", { "aria-hidden": true, className: "inline-block w-8 border-t-2 border-dashed border-red-400" }), "Equivalence volume"),
        (preset.Ka || isPotentiometric) && React.createElement("span", { className: "inline-flex items-center gap-2" }, React.createElement("span", { "aria-hidden": true, className: "inline-block w-8 border-t-2 border-dashed border-violet-400" }), "Half-equivalence reference")
      ),

      React.createElement("p", { className: "mt-2 text-xs font-bold text-slate-200 tabular-nums" },
        'Observed to ' + volumeAdded.toFixed(1) + ' mL · Equivalence marker ' + Veq.toFixed(1) + ' mL · ' + indicatorStatus),
      React.createElement("div", { className: "mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300 tabular-nums" },
        !isPotentiometric && indicatorId !== 'universal' && React.createElement("span", null,
          'Indicator transition: pH ' + indicator.low.toFixed(1) + '–' + indicator.high.toFixed(1)),
        preset.Ka && React.createElement("span", null,
          'Buffer region: ' + (Veq * 0.1).toFixed(1) + '–' + (Veq * 0.9).toFixed(1) + ' mL')
      ),
      React.createElement("p", { id: "titration-curve-caption", className: "mt-2 text-xs text-slate-300 leading-relaxed" },
        "The solid line is observed; the dashed line previews the full curve. Equivalence is the balanced stoichiometric ratio, not simply a colour change or a single pH value. The endpoint is the visual or instrumental signal used to estimate it."
      )

    )

  ),



  // ── Stats Panel ──

  labTab === 'titrate' && React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3" },

    // Current pH

    React.createElement("div", {

      className: "rounded-xl p-3 border text-center",

      style: Object.assign({}, glass, { background: 'rgba(5,30,45,0.75)', borderColor: 'rgba(56,189,248,0.2)' })

    },

      React.createElement("div", { className: "text-[0.6875rem] font-bold text-slate-200 mb-1" }, isPotentiometric ? __alloT('stem.titration.cell_potential_caps', "CELL POTENTIAL") : __alloT('stem.titration.current_ph_2', "CURRENT pH")),

      React.createElement("div", { className: "text-xl font-black tabular-nums tracking-tight", style: { color: readoutColor } }, yAxis.readout(currentY) + yAxis.unit),

      React.createElement("div", {

        className: "mt-1 h-1.5 rounded-full",

        // The rainbow reads as a pH scale, so volts mode gets its own ramp: the pale
        // straw of an Fe3+ solution through to permanganate purple.
        style: { background: isPotentiometric ? 'linear-gradient(90deg, #d1fae5, #fde68a, #f472b6, #9333ea)' : 'linear-gradient(90deg, #ef4444, #eab308, #22c55e, #3b82f6, #7c3aed)', position: 'relative' }

      },

        React.createElement("div", {

          style: { position: 'absolute', left: (Math.max(0, Math.min(1, (currentY - yAxis.min) / (yAxis.max - yAxis.min))) * 100) + '%', top: '-2px',

            width: '6px', height: '10px', background: 'white', borderRadius: '3px',

            transform: 'translateX(-3px)', boxShadow: '0 0 4px rgba(0,0,0,0.5)', transition: 'left 0.3s ease' }

        })

      )

    ),

    // Volume Added

    React.createElement("div", {

      className: "rounded-xl p-3 border text-center",

      style: Object.assign({}, glass, { background: 'rgba(5,30,45,0.75)', borderColor: 'rgba(100,116,139,0.2)' })

    },

      React.createElement("div", { className: "text-[0.6875rem] font-bold text-slate-200 mb-1" }, __alloT('stem.titration.volume_added', "VOLUME ADDED")),

      React.createElement("div", { className: "text-xl font-black tabular-nums text-cyan-400 tracking-tight" }, volumeAdded.toFixed(1) + " mL"),

      React.createElement("div", { className: "text-[0.6875rem] text-slate-400 mt-1" }, "V\u2091 = " + Veq.toFixed(1) + " mL")

    ),

    // Equivalence Point

    React.createElement("div", {

      className: "rounded-xl p-3 border text-center",

      style: Object.assign({}, glass, { background: 'rgba(5,30,45,0.75)', borderColor: pastEquivalence ? 'rgba(248,113,113,0.3)' : 'rgba(100,116,139,0.2)' })

    },

      React.createElement("div", { className: "text-[0.6875rem] font-bold text-slate-200 mb-1" }, __alloT('stem.titration.equivalence_point', "EQUIVALENCE POINT")),

      React.createElement("div", { className: "text-lg font-black tabular-nums tracking-tight " + (pastEquivalence ? 'text-red-400' : 'text-slate-300') },

        (isPotentiometric ? "E " : "pH ") + yAxis.readout(equivY) + yAxis.unit

      ),

      React.createElement("div", { className: "text-[0.6875rem] mt-1 " + (pastEquivalence ? 'text-red-400' : 'text-slate-200') },

        pastEquivalence ? 'Past equivalence' : atEquivalence ? '\u2714 At equivalence' : 'Approaching equivalence'

      )

    ),

    // Indicator Status

    React.createElement("div", {

      className: "rounded-xl p-3 border text-center",

      style: Object.assign({}, glass, { background: 'rgba(5,30,45,0.75)', borderColor: 'rgba(100,116,139,0.2)' })

    },

      React.createElement("div", { className: "text-xs font-bold text-slate-200 mb-1" }, isPotentiometric ? "ENDPOINT SIGNAL" : "INDICATOR"),

      React.createElement("div", {

        className: "w-6 h-6 rounded-full mx-auto mb-1 border border-white/20",

        style: { background: currentColor, boxShadow: '0 0 8px ' + currentColor, transition: 'background 0.5s ease, box-shadow 0.5s ease' }

      }),

      React.createElement("div", { className: "text-xs font-bold text-slate-300" }, isPotentiometric ? "Permanganate — self-indicating" : indicator.label),

      React.createElement("div", { className: "text-[0.6875rem] text-slate-200" }, indicatorStatus)

    )

  ),



  // ── Educational Panel ──

  labTab === 'titrate' && React.createElement("details", {

    className: "rounded-xl border overflow-hidden",

    style: Object.assign({}, glass, { background: 'rgba(5,30,45,0.75)', borderColor: 'rgba(100,116,139,0.2)' })

  },

    React.createElement("summary", {

      className: "px-4 py-3 cursor-pointer text-sm font-bold text-slate-300 hover:text-white transition-colors"

    }, __alloT('stem.titration.titration_science', "\uD83D\uDCD6 Titration Science")),

    React.createElement("div", { className: "px-4 pb-4 space-y-3" },

      React.createElement("div", {

        className: "rounded-lg p-3 border border-cyan-800/30 bg-cyan-950/30"

      },

        React.createElement("h5", { className: "text-xs font-bold text-cyan-400 mb-1" }, __alloT('stem.titration.what_is_titration', "What is Titration?")),

        React.createElement("p", { className: "text-[0.6875rem] text-slate-300 leading-relaxed" },

          "Titration is a technique to determine the concentration of an unknown solution by reacting it with a solution of known concentration (the titrant). " +

          "The titrant is added from a burette until the balanced reaction reaches its stoichiometric ratio. Titrant and analyte mole amounts are equal only for a 1:1 reaction."

        )

      ),

      React.createElement("div", {

        className: "rounded-lg p-3 border border-amber-800/30 bg-amber-950/30"

      },

        React.createElement("h5", { className: "text-xs font-bold text-amber-400 mb-1" }, __alloT('stem.titration.henderson_hasselbalch_equation', "Henderson\u2013Hasselbalch Equation")),

        React.createElement("p", { className: "text-sm font-mono text-amber-200 text-center my-2" },

          __alloT('stem.titration.ph_pk_log_a_ha', "pH = pK\u2090 + log([A\u207B] / [HA])")

        ),

        React.createElement("p", { className: "text-[0.6875rem] text-slate-300 leading-relaxed" },

          "This equation relates pH to the ratio of conjugate base [A\u207B] to weak acid [HA] concentrations. " +

          "At the half-equivalence point, [A\u207B] = [HA], so pH = pK\u2090."

        )

      ),

      React.createElement("div", {

        className: "rounded-lg p-3 border border-emerald-800/30 bg-emerald-950/30"

      },

        React.createElement("h5", { className: "text-xs font-bold text-emerald-400 mb-2" }, __alloT('stem.titration.key_concepts', "Key Concepts")),

        React.createElement("p", { className: "text-[0.6875rem] text-slate-300 leading-relaxed mb-1" },

          React.createElement("span", { className: "font-bold text-cyan-400" }, __alloT('stem.titration.equivalence_point_2', "Equivalence Point")), __alloT('stem.titration.where_moles_of_acid_moles_of_base_the_', " \u2014 Where titrant and analyte have been mixed in the stoichiometric ratio from the balanced reaction. The pH at this point depends on the acid/base strength.")

        ),

        React.createElement("p", { className: "text-[0.6875rem] text-slate-300 leading-relaxed mb-1" },

          React.createElement("span", { className: "font-bold text-pink-400" }, __alloT('stem.titration.endpoint', "Endpoint")), __alloT('stem.titration.where_the_indicator_changes_color_idea', " — The visual or instrumental signal used to estimate equivalence. A suitable method keeps endpoint bias acceptably small.")

        ),

        React.createElement("p", { className: "text-[0.6875rem] text-slate-300 leading-relaxed mb-1" },

          React.createElement("span", { className: "font-bold text-amber-400" }, __alloT('stem.titration.buffer_region_2', "Buffer Region")), __alloT('stem.titration.the_flat_part_of_a_weak_acid_base_curv', " \u2014 The flat part of a weak acid/base curve where pH resists change (Henderson\u2013Hasselbalch applies).")

        ),

        React.createElement("p", { className: "text-[0.6875rem] text-slate-300 leading-relaxed" },

          React.createElement("span", { className: "font-bold text-emerald-400" }, __alloT('stem.titration.indicators', "Indicators")), __alloT('stem.titration.weak_acids_bases_that_change_color_at_', " \u2014 Weak acids/bases that change color over a pH range. Choose one whose transition occurs within the steep part of the curve and produces acceptably small endpoint-volume bias.")

        )

      ),

      // ── Lab Safety Best Practices ──
      React.createElement("div", {
        className: "rounded-lg p-3 border border-red-800/30 bg-red-950/20"
      },
        React.createElement("h5", { className: "text-xs font-bold text-red-400 mb-2" }, __alloT('stem.titration.lab_safety_best_practices', "\u26A0\uFE0F Lab Safety Best Practices")),

        React.createElement("p", { className: "text-[0.6875rem] text-slate-300 leading-relaxed mb-1" },
          React.createElement("span", { className: "font-bold text-red-400" }, __alloT('stem.titration.spill_response', "\uD83E\uDDEA Spill Response")), __alloT('stem.titration.acid_spill_neutralize_with_sodium_bica', " — Spill response: alert the teacher, keep others away, and follow the approved SDS/local spill plan. Students should not neutralize or clean unknown spills.")
        ),
        React.createElement("p", { className: "text-[0.6875rem] text-slate-300 leading-relaxed mb-1" },
          React.createElement("span", { className: "font-bold text-amber-400" }, __alloT('stem.titration.never_mix', "\u274C Never Mix")), __alloT('stem.titration.never_mix_bleach_with_ammonia_toxic_ch', " \u2014 Never mix bleach with ammonia (toxic chloramine gas). Never add water to concentrated acid (exothermic splash risk \u2014 always add acid to water).")
        ),
        React.createElement("p", { className: "text-[0.6875rem] text-slate-300 leading-relaxed mb-1" },
          React.createElement("span", { className: "font-bold text-cyan-400" }, __alloT('stem.titration.equipment_2', "\uD83E\uDDEA Equipment")), __alloT('stem.titration.rinse_the_burette_with_the_titrant_sol', " \u2014 Rinse the burette with the titrant solution before filling. Swirl the flask gently after each addition. Read the burette at the meniscus bottom.")
        ),
        React.createElement("p", { className: "text-[0.6875rem] text-slate-300 leading-relaxed" },
          React.createElement("span", { className: "font-bold text-emerald-400" }, __alloT('stem.titration.waste_disposal', "\u267B\uFE0F Waste Disposal")), __alloT('stem.titration.neutralized_acid_base_solutions_ph_6_8', " — Waste disposal: label and collect chemical waste according to the instructor\'s SDS/local waste plan. Never assume drain disposal is allowed.")
        )
      )

    )

  ),



  // ── AI Tutor Panel (titrate tab, reading-level aware) ──
  labTab === 'titrate' && (function () {
    var aiLevel = d.aiLevel || 'grade5';
    var aiText = d.aiExplain || '';
    var aiLoading = !!d.aiLoading;
    var aiError = d.aiError || '';
    var aiAction = aiText ? 'Re-explain' : 'Explain';
    var LEVELS = [
      { id: 'plain', label: __alloT('stem.titration.plain', 'Plain'), hint: __alloT('stem.titration.using_simple_everyday_words_and_short_', 'using simple everyday words and short sentences') },
      { id: 'grade5', label: __alloT('stem.titration.grade_5', 'Grade 5'), hint: __alloT('stem.titration.for_a_5th_grade_student_brief_and_frie', 'for a 5th grade student, brief and friendly') },
      { id: 'hs', label: __alloT('stem.titration.high_school', 'High School'), hint: __alloT('stem.titration.for_a_high_school_chemistry_student_ac', 'for a high school chemistry student, accurate but accessible') }
    ];
    function explain() {
      if (typeof callGemini !== 'function') { upd('aiError', 'AI tutor not available.'); return; }
      var requestId = ++aiRequestRef.current;
      updMulti({ aiLoading: true, aiError: '', aiExplain: '' });
      var lv = LEVELS.find(function (L) { return L.id === aiLevel; }) || LEVELS[1];
      var prompt = 'Explain this titration setup ' + lv.hint + '. '
        + 'Setup: ' + preset.label + ' (' + preset.desc + '). Flask: ' + preset.acidName + ' (' + preset.volAcid + ' mL). Burette: ' + preset.baseName + '. '
        // The redox run has no pH indicator and no pH meter — telling the tutor otherwise
        // makes it explain phenolphthalein in a permanganate titration.
        + (isPotentiometric
            ? 'This is a REDOX titration followed with a platinum electrode: the measured quantity is cell potential in volts, not pH, and there is no added indicator — permanganate is self-indicating. Current potential: ' + yAxis.readout(currentY) + ' V. '
            : 'Indicator: ' + indicator.label + '. ')
        + 'Volume added so far: ' + volumeAdded.toFixed(1) + ' mL. '
        + 'In 3 short sentences: (1) What reaction is happening? (2) What will the student see as they add titrant? (3) What the equivalence point means here. '
        + 'No markdown, no bullets, no headings. Use plain prose.';
      callGemini(prompt, false, false, 0.5).then(function (resp) {
        if (requestId !== aiRequestRef.current) return;
        updMulti({ aiExplain: String(resp || '').trim(), aiLoading: false, aiError: '' });
        if (typeof announceToSR === 'function') announceToSR('Explanation ready.');
      }).catch(function () {
        if (requestId !== aiRequestRef.current) return;
        updMulti({ aiLoading: false, aiError: 'Could not reach AI tutor. Try again in a moment.' });
      });
    }
    return React.createElement("div", {
      className: "rounded-xl p-4 border",
      role: "region",
      "aria-label": __alloT('stem.titration.ai_titration_tutor', "AI titration tutor"),
      "aria-busy": aiLoading,
      style: Object.assign({}, glass, { background: 'rgba(10,40,60,0.75)', borderColor: 'rgba(168,85,247,0.4)' })
    },
      React.createElement("div", { className: "flex items-center flex-wrap gap-2 mb-2" },
        React.createElement("span", { className: "text-sm font-bold text-purple-300" }, __alloT('stem.titration.explain_at_my_level', "\u2728 Explain at my level")),
        React.createElement("div", { className: "ml-auto flex flex-wrap gap-2", role: "group", "aria-label": __alloT('stem.titration.reading_level', "Reading level") },
          LEVELS.map(function (L) {
            var active = aiLevel === L.id;
            return React.createElement("button", {
              key: L.id,
              onClick: function () { upd('aiLevel', L.id); },
              "aria-label": __alloT('stem.titration.sr_reading_level', 'Reading level: ') + L.label +
                (active ? __alloT('stem.titration.sr_selected', ' (selected)') : ''),
              "aria-pressed": active,
              type: "button",
              className: "min-h-[44px] px-3 py-2 rounded text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 " + (active ? 'bg-purple-600 text-white' : 'transition-colors bg-slate-800 text-slate-300 hover:bg-purple-900/50 active:scale-[0.97]')
            }, L.label);
          })
        ),
        React.createElement("button", {
          type: "button",
          onClick: explain,
          disabled: aiLoading,
          "aria-label": aiAction + ' at ' +
            ((LEVELS.find(function (L) { return L.id === aiLevel; }) || {}).label || 'Grade 5') +
            __alloT('stem.titration.sr_level_suffix', ' level'),
          className: "min-h-[44px] transition-colors px-4 py-2 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
        }, aiLoading ? '\u23F3 Thinking...' : (aiText ? '\uD83D\uDD04 Re-explain' : '\uD83E\uDDE0 Explain'))
      ),
      React.createElement("div", { role: "status", "aria-live": "polite", "aria-atomic": "true", className: "text-xs leading-relaxed" },
        aiLoading ? React.createElement("p", { className: "text-purple-200" }, "Generating explanation…")
          : aiError ? React.createElement("p", { className: "text-rose-300" }, aiError)
          : aiText ? React.createElement("p", { className: "text-slate-200 bg-slate-900/40 rounded-lg p-3" }, aiText)
          : null),
      !aiText && !aiLoading && !aiError && React.createElement("p", { className: "text-[0.6875rem] italic text-slate-400" }, __alloT('stem.titration.click_explain_to_have_the_ai_tutor_des', "Click \u201CExplain\u201D to have the AI tutor describe this titration at your chosen reading level."))
    );
  })(),



  // ══════════════════════════════════════════════
  // CHALLENGE TAB — Safety & Theory Quiz
  // ══════════════════════════════════════════════
  // \u2500\u2500 Challenge mode switch: the graded determination, or the question bank \u2500\u2500
  labTab === 'challenge' && React.createElement("div", {
    className: "flex gap-2 flex-wrap", role: "group",
    "aria-label": __alloT('stem.titration.challenge_mode', 'Challenge mode')
  },
    [
      { id: 'graded', label: __alloT('stem.titration.graded_unknown', '\uD83C\uDFAF Graded unknown'), hint: __alloT('stem.titration.determine_a_concentration', 'Determine a concentration') },
      { id: 'quiz', label: __alloT('stem.titration.question_bank', '\u2753 Question bank'), hint: __alloT('stem.titration.safety_and_theory_mcqs', 'Safety and theory MCQs') }
    ].map(function (mo) {
      var on = chMode === mo.id;
      return React.createElement("button", {
        key: mo.id, type: "button", "aria-pressed": on,
        onClick: function () { if (typeof sfxTitrClick === 'function') sfxTitrClick(); upd('chMode', mo.id); },
        title: mo.hint,
        className: "min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 " +
          (on ? "bg-amber-500 text-slate-900 border-amber-300"
              : "bg-slate-800/60 text-slate-200 border-slate-600 hover:bg-slate-700/80")
      }, mo.label);
    })
  ),

  // \u2550\u2550\u2550 GRADED UNKNOWN \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // The tab has always advertised "match real-world unknowns by titrating to
  // within \u00B10.05 mL, tracks accuracy + speed". This is that, for real: a hidden
  // concentration, a burette you can only run forwards, an endpoint you have to
  // SEE rather than be told, and a reading whose accuracy depends on where your
  // eye is. No pH number is shown anywhere in this mode \u2014 that is the point.
  labTab === 'challenge' && chMode === 'graded' && (function () {
    var spec = gUnknown.spec;
    var gInd = null;
    for (var ii = 0; ii < indicators.length; ii++) if (indicators[ii].id === spec.indicator) gInd = indicators[ii];
    gInd = gInd || indicators[0];
    var rising = !!(spec.Ka || spec.strong === 'acid');   // does pH climb as you titrate?
    var endPH = rising ? gInd.low : gInd.high;            // pH at which the colour turns
    var gEndVb = findEndpointVb(spec, gUnknown.flaskConc, endPH, rising);
    var obsKind = endpointObservation(gVb, gEndVb, gEndpointReachedAt);
    var gradedTrialKind = function (trial) {
      if (trial && ['none', 'flash', 'endpoint', 'over'].indexOf(trial.endpointState) >= 0) return trial.endpointState;
      return endpointObservation(trial && trial.vb, gEndVb, trial && trial.endpointReachedAt);
    };
    var gradedTrialValid = function (trial) {
      return !!trial && gradedTrialKind(trial) === 'endpoint' && isFinite(Number(trial.recorded)) && Number(trial.recorded) > 0 &&
        isFinite(Number(trial.initialRecorded)) && isFinite(Number(trial.finalRecorded)) && Number(trial.finalRecorded) > Number(trial.initialRecorded);
    };
    var obs = {
      none:     { text: __alloT('stem.titration.obs_none', 'No colour change yet.'), tone: '#94a3b8' },
      flash:    { text: __alloT('stem.titration.obs_flash', 'A flash of colour where each drop lands \u2014 it disappears when you swirl. Slow down: you are one drop away.'), tone: '#fbbf24' },
      endpoint: { text: __alloT('stem.titration.obs_persist', 'Faint colour that PERSISTS after swirling. This is the endpoint \u2014 stop here.'), tone: '#4ade80' },
      over:     { text: __alloT('stem.titration.obs_over', 'Strong, deep colour throughout \u2014 you have gone past the endpoint.'), tone: '#f87171' }
    }[obsKind];
    var glReady = BURETTE_GL.status() === 'ready';
    BURETTE_GL.onStatusChange(function () { upd('glTick', (d.glTick || 0) + 1); });
    var parErr = buretteParallaxMl(gEyeCm);
    var eyeLevel = Math.abs(gEyeCm) < 0.25;
    // Camera state is the student's, not a constant. sig deliberately excludes it:
    // orbit and zoom are applied by the render loop without touching the model, so
    // dragging never rebuilds the scene — only the eye height and the readings do.
    var gRot = d.gRot3d || burHomeRot();
    var gZoom = d.gZoom3d || BUR_HOME.zoom;
    var setRot = function (rotY, rotX) {
      upd('gRot3d', { rotY: rotY, rotX: Math.max(-70, Math.min(78, rotX)) });
    };
    var setZoom = function (z) { upd('gZoom3d', Math.max(0.5, Math.min(2.6, z))); };
    BURETTE_GL.push({
      // A still life — see pass 13. Nothing in this scene moves on its own, so the
      // viewer must not re-arm rAF after each frame; it repaints on push, resize and
      // on scrolling back into view, which covers orbit, zoom and every eye-height step.
      static: true,
      sig: [Math.round(gEyeCm * 4), spec.id, Math.abs(parErr) <= BURETTE.TOLERANCE_ML,
            gFinalTrue.toFixed(2), gFinalRecorded.toFixed(2)].join('|'),
      eyeCm: gEyeCm, contrast: !!(ctx && ctx.isContrast),
      liquidHex: 0x38bdf8, withinTolerance: Math.abs(parErr) <= BURETTE.TOLERANCE_ML,
      trueMl: gFinalTrue, readMl: gFinalRecorded,
      rotY: gRot.rotY, rotX: gRot.rotX, zoom: gZoom
    });

    function deliver(ml) {
      if (gResult || !gInitialLocked) return;
      var amount = Number(ml) || 0;
      if (amount <= 0 || gFinalTrue + amount > BURETTE.CAPACITY_ML + 1e-9) return;
      var next = Math.round((gVb + amount) * 1000) / 1000;
      var firstPersistent = gEndpointReachedAt;
      var hasFirstPersistent = firstPersistent !== null && firstPersistent !== '' &&
        typeof firstPersistent !== 'undefined' && isFinite(Number(firstPersistent));
      if (!hasFirstPersistent && endpointObservation(next, gEndVb) === 'endpoint') firstPersistent = next;
      updMulti({ gVb: next, gEndpointReachedAt: firstPersistent, gStartMs: gStartMs || Date.now() });
      if (typeof sfxTitrClick === 'function') sfxTitrClick();
    }

    // Side elevation of the same geometry. ALWAYS the guaranteed floor: it renders
    // whether or not WebGL is available, and it is what a screen-reader user's
    // description is written against.
    var elevation = (function () {
      var W = 300, H = 190, mx = 100, my = 84;          // meniscus at (mx,my)
      var scaleX = mx + 26, eyeX = 268;
      var eyeY = my - gEyeCm * 2.4;
      var crossY = my + (eyeY - my) * ((scaleX - mx) / (eyeX - mx));
      // Marks on the scale, so it reads as a burette rather than a bare line. They
      // are deliberately UNNUMBERED: only the two crossings carry a millilitre value,
      // because only those two are quantities the model actually computed.
      var rungs = [];
      for (var ry = 18; ry < H - 12; ry += 9) {
        var major = Math.round((ry - 18) / 9) % 4 === 0;
        rungs.push(React.createElement('line', { key: 'r' + ry, x1: scaleX - (major ? 9 : 5), y1: ry,
          x2: scaleX, y2: ry, stroke: 'rgba(203,213,225,0.55)', strokeWidth: 1 }));
      }
      // The two readings are the point of the whole diagram, so give them numbers
      // instead of the words 'true' and 'you read' — which were the only untranslated
      // English left in this picture, and said less.
      var gap = crossY - my, apart = Math.abs(gap) >= 15;
      var valueLabel = function (y, value, fill, key) {
        return React.createElement('text', { key: key, x: mx - 34, y: y + 4, fill: fill,
          fontSize: 11, fontWeight: 'bold', textAnchor: 'end' }, value.toFixed(2));
      };
      // The honest problem with a self-consistent side elevation: at 12 cm the sight
      // line crosses the scale about four pixels off true, which is invisible. Rather
      // than quietly exaggerate the geometry — the thing the note under the 3D view
      // explicitly promises not to do — magnify the crossing in a labelled detail
      // circle, the way a technical drawing would, and print the factor.
      var detail = (function () {
        if (eyeLevel || !isFinite(gap) || Math.abs(gap) < 0.05) return null;
        var cx = 46, cy = 136, r = 29;
        // Chosen so the magnified mark still LANDS inside the circle: rounding to a
        // nice factor first pushed it outside the rim, which read as a stray bar.
        var k = Math.max(2, Math.min(8, Math.floor((r - 8) / Math.abs(gap))));
        var far = cy + k * gap;
        return React.createElement('g', { key: 'detail' },
          React.createElement('line', { x1: mx - 24, y1: my + gap / 2, x2: cx + r * 0.78, y2: cy - r * 0.62,
            stroke: 'rgba(148,163,184,0.6)', strokeWidth: 1, strokeDasharray: '3,3' }),
          React.createElement('circle', { cx: cx, cy: cy, r: r, fill: 'rgba(15,32,48,0.92)',
            stroke: 'rgba(148,163,184,0.7)', strokeWidth: 1 }),
          React.createElement('line', { x1: cx, y1: cy - r + 4, x2: cx, y2: cy + r - 4,
            stroke: 'rgba(203,213,225,0.6)', strokeWidth: 1 }),
          React.createElement('line', { x1: cx - 17, y1: cy, x2: cx + 17, y2: cy, stroke: '#4ade80', strokeWidth: 3 }),
          React.createElement('line', { x1: cx - 14, y1: far, x2: cx + 14, y2: far, stroke: '#fbbf24', strokeWidth: 3 }),
          React.createElement('text', { x: cx, y: H - 4, fill: '#94a3b8', fontSize: 10,
            fontWeight: 'bold', textAnchor: 'middle' }, '\u00D7' + k));
      })();
      return React.createElement("svg", {
        viewBox: '0 0 ' + W + ' ' + H, className: "w-full", style: { maxHeight: '200px' },
        // Every clause is a key. Splicing a raw 'above'/'below' into an otherwise
        // translated sentence is the half-translated failure this repo guards against
        // elsewhere, and a screen reader reads the result aloud verbatim.
        role: "img", "aria-label": __alloT('stem.titration.sr_side_view', 'Side view: eye ') + Math.abs(gEyeCm).toFixed(0) + __alloT('stem.titration.sr_cm', ' cm ') +
          (eyeLevel ? __alloT('stem.titration.sr_level_with', 'level with') : gEyeCm > 0 ? __alloT('stem.titration.sr_above', 'above') : __alloT('stem.titration.sr_below', 'below')) +
          __alloT('stem.titration.sr_meniscus_crosses', ' the meniscus. The sight line crosses the scale ') +
          (eyeLevel ? __alloT('stem.titration.sr_exactly_at', 'exactly at the meniscus.')
            : (gEyeCm > 0 ? __alloT('stem.titration.sr_above', 'above') : __alloT('stem.titration.sr_below', 'below')) +
              __alloT('stem.titration.sr_true_level_so', ' the true level, so the reading is ') +
              (gEyeCm > 0 ? __alloT('stem.titration.sr_too_low', 'too low') : __alloT('stem.titration.sr_too_high', 'too high')) +
              __alloT('stem.titration.sr_by', ' by ') + Math.abs(parErr).toFixed(3) + __alloT('stem.titration.sr_millilitres', ' millilitres.'))
      },
        React.createElement("rect", { x: mx - 22, y: 8, width: 48, height: H - 16, fill: 'rgba(147,197,253,0.10)', stroke: 'rgba(147,197,253,0.45)' }),
        React.createElement("line", { x1: scaleX, y1: 8, x2: scaleX, y2: H - 8, stroke: '#cbd5e1', strokeWidth: 1.5 }),
        rungs,
        React.createElement("rect", { x: mx - 21, y: my, width: 46, height: H - 8 - my, fill: 'rgba(56,189,248,0.35)' }),
        React.createElement("line", { x1: mx - 21, y1: my, x2: mx + 25, y2: my, stroke: '#22d3ee', strokeWidth: 2 }),
        React.createElement("line", { x1: mx, y1: my, x2: eyeX, y2: my, stroke: '#4ade80', strokeWidth: 1, strokeDasharray: '3,3', opacity: 0.65 }),
        React.createElement("line", { x1: mx, y1: my, x2: eyeX, y2: eyeY, stroke: eyeLevel ? '#4ade80' : '#fbbf24', strokeWidth: 1.6 }),
        // An actual eye rather than a white dot: the sight line has to read as coming
        // out of something that looks, which is the whole mechanism being taught.
        React.createElement("ellipse", { cx: eyeX, cy: eyeY, rx: 12, ry: 7.5, fill: '#f1f5f9', stroke: '#94a3b8', strokeWidth: 1 }),
        React.createElement("circle", { cx: eyeX - 4, cy: eyeY, r: 4.6, fill: '#1e3a5f' }),
        React.createElement("circle", { cx: eyeX - 4, cy: eyeY, r: 2.1, fill: '#0b1120' }),
        React.createElement("circle", { cx: eyeX - 5.6, cy: eyeY - 1.6, r: 1.1, fill: '#f8fafc' }),
        React.createElement("line", { x1: scaleX - 12, y1: my, x2: scaleX + 12, y2: my, stroke: '#4ade80', strokeWidth: 3 }),
        !eyeLevel && React.createElement("line", { x1: scaleX - 12, y1: crossY, x2: scaleX + 12, y2: crossY, stroke: '#fbbf24', strokeWidth: 3 }),
        // The error is the gap between those two marks, so draw it as the gap and put
        // the number on it — the panel already states the value, but only in prose.
        detail,
        // The size of the mistake, on the picture that shows where it comes from. Not
        // gated on the marks being far apart: a small gap is exactly when the number
        // is the only thing carrying it.
        !eyeLevel && React.createElement("text", { key: 'err', x: scaleX + 14, y: my + gap / 2 + (gap >= 0 ? 14 : -8),
          fill: '#fbbf24', fontSize: 10, fontWeight: 'bold' },
          (parErr >= 0 ? '+' : '\u2212') + Math.abs(parErr).toFixed(3)),
        valueLabel(my, gFinalTrue, '#4ade80', 'vt'),
        !eyeLevel && valueLabel(apart ? crossY : crossY + (gap >= 0 ? 15 : -15), gFinalRecorded, '#fbbf24', 'vr')
      );
    })();

    return React.createElement("div", { id: "titration-graded-run", tabIndex: -1, className: "rounded-2xl p-3 sm:p-5 border space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
      style: Object.assign({}, glass, { background: 'rgba(3,25,40,0.85)', borderColor: 'rgba(245,158,11,0.3)' }) },

      // \u2500\u2500 Briefing \u2500\u2500
      React.createElement("div", { className: "flex items-start justify-between gap-3 flex-wrap" },
        React.createElement("div", null,
          React.createElement("h3", { className: "text-sm font-black text-amber-400" },
            spec.icon + ' ' + __alloT('stem.titration.unknown_run', 'Unknown') + ' #' + gRun + ' \u2014 ' + spec.name),
          React.createElement("p", { className: "text-[0.75rem] text-slate-300 mt-1 max-w-xl leading-relaxed" }, spec.blurb)
        ),
        React.createElement("button", {
          type: "button",
          onClick: function () {
            updMulti({ gRun: gRun + 1, gInitialTrue: initialBuretteReading(gRun + 1, 0), gInitialLocked: false, gInitialRecorded: null, gInitialEyeCm: null, gVb: 0, gEndpointReachedAt: null, gResult: null, gStartMs: 0, gEyeCm: 0, gTrials: [] });
            focusTitrationRegion('titration-graded-run');
            if (announceToSR) announceToSR('New unknown loaded. Run ' + (gRun + 1) + '.');
          },
          className: "min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold bg-slate-800/70 text-amber-300 border border-amber-700/50 hover:bg-slate-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        }, __alloT('stem.titration.new_unknown', '\uD83C\uDFB2 New unknown'))
      ),

      React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2" },
        [[spec.analyte, __alloT('stem.titration.analyte', 'Analyte')],
         [spec.aliquotMl.toFixed(2) + ' mL', __alloT('stem.titration.aliquot', 'Aliquot in flask')],
         [spec.titrant + ' ' + spec.titrantConc.toFixed(4) + ' M', __alloT('stem.titration.titrant_known', 'Titrant (known)')],
         [gInd.label, __alloT('stem.titration.indicator_label', 'Indicator')]].map(function (m) {
          return React.createElement("div", { key: m[1], className: "rounded-xl border border-white/10 bg-white/5 p-2.5" },
            React.createElement("div", { className: "text-[0.8125rem] font-black text-white break-words" }, m[0]),
            React.createElement("div", { className: "mt-0.5 text-[0.625rem] font-bold text-slate-400" }, m[1]));
        })
      ),
      React.createElement("p", { className: "text-[0.6875rem] text-slate-400 italic" }, '\uD83E\uDDEB ' + spec.prep),

      // \u2500\u2500 Burette: forward only, like the real thing \u2500\u2500
      React.createElement("div", { className: "rounded-xl p-3 border border-slate-600/40 bg-slate-900/40 space-y-2" },
        React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-2" },
          React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-200" }, __alloT('stem.titration.deliver_titrant', 'DELIVER TITRANT')),
          React.createElement("span", { className: "text-[0.6875rem] text-slate-400" },
            __alloT('stem.titration.one_drop_is', 'One drop = ') + BURETTE.DROP_ML.toFixed(2) + ' mL')
        ),
        React.createElement("div", { className: "flex gap-2 flex-wrap" },
          [[BURETTE.DROP_ML, '+1 drop'], [BURETTE.DROP_ML * 5, '+5 drops'], [0.5, '+0.5 mL'], [2, '+2 mL'], [5, '+5 mL']].map(function (b) {
            var cannotFit = gFinalTrue + b[0] > BURETTE.CAPACITY_ML + 1e-9;
            var disabled = !!gResult || !gInitialLocked || cannotFit;
            return React.createElement("button", {
              type: "button", key: b[1], disabled: disabled, onClick: function () { deliver(b[0]); },
              "aria-label": __alloT('stem.titration.deliver', 'Deliver ') + b[1],
              className: "min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 " +
                (disabled ? "bg-slate-800/40 text-slate-500 border-slate-700 cursor-not-allowed"
                          : "bg-cyan-900/40 text-cyan-200 border-cyan-700/50 hover:bg-cyan-800/60 active:scale-[0.97]")
            }, b[1]);
          }),
          // Abandons the aliquot currently in the flask. It deliberately does NOT clear
          // gResult: doing so let a student submit, read the true concentration off the
          // result panel, and then re-titrate the SAME unknown to a perfect score. Once
          // an unknown is reported it is finished, and the only way on is a new one.
          React.createElement("button", {
            type: "button", disabled: !!gResult,
            onClick: function () { if (gResult) return;
              updMulti({ gInitialTrue: gFinalTrue, gInitialLocked: false, gInitialRecorded: null, gInitialEyeCm: null, gVb: 0, gStartMs: gStartMs || Date.now() });
              focusTitrationRegion('titration-burette-readings');
              if (announceToSR) announceToSR('Fresh aliquot in the flask. The burette remains at ' + gFinalTrue.toFixed(2) + ' millilitres; record a new initial reading.'); },
            className: "min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 " +
              (gResult ? "bg-slate-800/40 text-slate-500 border-slate-700 cursor-not-allowed"
                       : "bg-amber-900/40 text-amber-200 border-amber-700/50 hover:bg-amber-800/60")
          }, __alloT('stem.titration.fresh_sample', '\u21BA Fresh sample'))
        ),
        React.createElement("p", { className: "text-xs text-slate-300 italic" },
          'A burette runs downward: a fresh aliquot does not reset its scale. Record a new initial burette reading, and refill only between aliquots when needed.'),
        React.createElement("p", { className: "text-xs font-bold text-cyan-200" }, 'Capacity remaining: ' + gCapacityRemaining.toFixed(2) + ' mL'),
        !gInitialLocked && gVb === 0 && React.createElement("button", { type: "button", onClick: function () { updMulti({ gInitialTrue: initialBuretteReading(gRun, gTrials.length), gInitialLocked: false, gInitialRecorded: null, gInitialEyeCm: null, gVb: 0, gEndpointReachedAt: null }); focusTitrationRegion('titration-burette-readings'); }, className: "min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold border border-blue-500/60 bg-blue-950/40 text-blue-200 hover:bg-blue-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300" }, 'Refill burette between aliquots')
      ),

      // \u2500\u2500 What you can SEE (no pH meter in this mode) \u2500\u2500
      React.createElement("div", { className: "rounded-xl p-3 border flex items-center gap-3 flex-wrap",
        style: { borderColor: obs.tone + '66', background: 'rgba(15,23,42,0.55)' } },
        React.createElement("div", { "aria-hidden": true, style: {
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: indicatorColorFor(gInd, gFlaskPH, false), border: '2px solid rgba(148,163,184,0.5)'
        } }),
        React.createElement("div", { className: "flex-1 min-w-[180px]" },
          React.createElement("div", { className: "text-[0.6875rem] font-bold text-slate-200" }, __alloT('stem.titration.in_the_flask', 'IN THE FLASK')),
          React.createElement("div", { className: "text-[0.75rem] font-semibold", style: { color: obs.tone } }, obs.text)
        ),
        React.createElement("div", { className: "text-[0.625rem] text-slate-400 italic max-w-[220px]" },
          __alloT('stem.titration.no_ph_meter', 'No pH readout in graded mode \u2014 you judge the endpoint the way you would at a real bench.'))
      ),

      // \u2500\u2500 The reading: 3D station + accessible eye control \u2500\u2500
      React.createElement("div", { id: "titration-burette-readings", tabIndex: -1, className: "rounded-xl p-3 border border-slate-600/40 bg-slate-900/40 space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" },
        React.createElement("div", { className: "flex items-center justify-between gap-2 flex-wrap" },
          React.createElement("div", { className: "text-xs font-bold text-slate-200" }, __alloT('stem.titration.read_the_burette', 'READ THE BURETTE')),
          !gInitialLocked && React.createElement("button", { type: "button", onClick: function () { var initialRead = readBurette(gInitialTrue, gEyeCm); updMulti({ gInitialLocked: true, gInitialRecorded: initialRead, gInitialEyeCm: gEyeCm }); if (announceToSR) announceToSR('Initial burette reading recorded at ' + initialRead.toFixed(2) + ' millilitres.'); }, className: "min-h-[44px] px-4 py-2 rounded-lg text-xs font-black bg-emerald-700 text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300" }, 'Record initial burette reading')
        ),
        React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3" },
          React.createElement("div", null,
            // The GL container is ALWAYS laid out at its real size. It used to be
            // display:none until the viewer reported ready, which meant the renderer
            // was built against a zero-width node — a 0x0 canvas that never recovered
            // its size on some paths and could not be screenshotted at all. The
            // elevation is overlaid on top instead, so there is always something to
            // look at and the renderer always has a box to measure.
            React.createElement("div", {
              style: { position: 'relative', height: 240, borderRadius: 10, overflow: 'hidden',
                background: '#0a1420', border: '1px solid rgba(100,116,139,0.35)' }
            },
              React.createElement("div", {
                ref: buretteGlRef,
                style: { position: 'absolute', inset: 0, cursor: 'grab', touchAction: 'pan-y' },
                // The canvas inside is aria-hidden, so this container carries the
                // description. tabIndex + onKeyDown are not optional extras: drag
                // alone would make the only way to inspect the geometry a mouse.
                // Both go away when 3D is not up — an empty div claiming role="img"
                // next to the elevation's own would announce the same picture twice,
                // and offer a focus stop that does nothing.
                role: glReady ? "img" : undefined,
                tabIndex: glReady ? 0 : undefined,
                "aria-label": !glReady ? undefined : 'Burette parallax diagram, ' + BUR3D.EXAGGERATION.toFixed(1) +
                  ' times life size. Final burette reading ' + gFinalRecorded.toFixed(2) +
                  ' millilitres; recorded titre ' + gRecordedTitre.toFixed(2) + ' millilitres. ' +
                  (eyeLevel
                    ? __alloT('stem.titration.sr_eye_level_meets', 'The eye is level with the meniscus and the sight line meets the scale at the true reading of ') + gFinalTrue.toFixed(2) + __alloT('stem.titration.sr_millilitres', ' millilitres.')
                    : __alloT('stem.titration.sr_the_eye_is', 'The eye is ') + Math.abs(gEyeCm).toFixed(0) + __alloT('stem.titration.sr_centimetres', ' centimetres ') +
                      (gEyeCm > 0 ? __alloT('stem.titration.sr_above', 'above') : __alloT('stem.titration.sr_below', 'below')) +
                      __alloT('stem.titration.sr_meniscus_so_crosses', ' the meniscus, so the sight line crosses the scale at ') + gFinalRecorded.toFixed(2) +
                      __alloT('stem.titration.sr_ml_instead_of_true', ' millilitres instead of the true ') + gFinalTrue.toFixed(2) + '.') +
                  ' Arrow keys orbit, plus and minus zoom, 0 resets.',
                onPointerDown: function (ev) {
                  buretteDrag.current = { x: ev.clientX, y: ev.clientY, rotY: gRot.rotY, rotX: gRot.rotX };
                  try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
                },
                onPointerMove: function (ev) {
                  var g = buretteDrag.current;
                  if (!g) return;
                  setRot(g.rotY + (ev.clientX - g.x) * 0.5, g.rotX + (ev.clientY - g.y) * 0.35);
                },
                onPointerUp: function () { buretteDrag.current = null; },
                onPointerCancel: function () { buretteDrag.current = null; },
                onWheel: function (ev) {
                  ev.preventDefault();
                  setZoom(gZoom * (ev.deltaY < 0 ? 1.12 : 0.89));
                },
                onKeyDown: function (ev) {
                  var k = ev.key;
                  if (k === 'ArrowLeft') { setRot(gRot.rotY - 8, gRot.rotX); }
                  else if (k === 'ArrowRight') { setRot(gRot.rotY + 8, gRot.rotX); }
                  else if (k === 'ArrowUp') { setRot(gRot.rotY, gRot.rotX - 6); }
                  else if (k === 'ArrowDown') { setRot(gRot.rotY, gRot.rotX + 6); }
                  else if (k === '+' || k === '=') { setZoom(gZoom * 1.15); }
                  else if (k === '-' || k === '_') { setZoom(gZoom * 0.87); }
                  else if (k === '0' || k === 'Home') { updMulti({ gRot3d: burHomeRot(), gZoom3d: BUR_HOME.zoom }); }
                  else return;
                  ev.preventDefault();
                }
              }),
              glReady && React.createElement("div", {
                style: { position: 'absolute', left: 8, bottom: 6, fontSize: 10,
                  color: '#94a3b8', pointerEvents: 'none', background: 'rgba(10,20,32,0.7)',
                  padding: '3px 8px', borderRadius: 999 },
                "aria-hidden": true
              }, __alloT('stem.titration.gl_hint', 'Drag or arrow keys — orbit · scroll or ± — zoom · 0 — reset')),
              glReady && React.createElement("button", {
                onClick: function () { updMulti({ gRot3d: burHomeRot(), gZoom3d: BUR_HOME.zoom }); },
                style: { position: 'absolute', right: 8, top: 6 },
                className: "px-2 py-0.5 rounded text-[0.625rem] font-bold text-slate-200 bg-slate-900/70 border border-slate-600 hover:bg-slate-800"
              }, __alloT('stem.titration.reset_view', 'Reset view')),
              !glReady && React.createElement("div", {
                style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', background: '#0a1420' }
              }, elevation)
            ),
            React.createElement("p", { className: "text-[0.625rem] text-slate-400 mt-1 leading-snug" },
              glReady
                ? (__alloT('stem.titration.exag_note', 'Drawn as a wide bore seen from close in, so the effect is visible \u2014 about ')
                    + BUR3D.EXAGGERATION.toFixed(1)
                    + __alloT('stem.titration.exag_note_tail', '\u00D7 life. The numbers on the scale and the millilitre figures come from real burette geometry, not from the picture.'))
                : __alloT('stem.titration.elevation_note', 'Side elevation. The green line is where the meniscus really sits; the amber line is where your sight line crosses the scale.'))
          ),
          React.createElement("div", { className: "space-y-2" },
            React.createElement("label", { className: "block text-[0.6875rem] font-bold text-slate-300", htmlFor: "titr-eye" },
              __alloT('stem.titration.eye_height', 'Eye height vs the meniscus')),
            React.createElement("input", {
              id: "titr-eye", type: "range", min: -BURETTE.MAX_EYE_CM, max: BURETTE.MAX_EYE_CM, step: 0.5,
              value: gEyeCm, disabled: !!gResult,
              onChange: function (e) { upd('gEyeCm', parseFloat(e.target.value)); },
              "aria-valuetext": (eyeLevel ? __alloT('stem.titration.sr_level_with_meniscus', 'Level with the meniscus') :
                Math.abs(gEyeCm).toFixed(1) + __alloT('stem.titration.sr_centimetres', ' centimetres ') + (gEyeCm > 0 ? __alloT('stem.titration.sr_above', 'above') : __alloT('stem.titration.sr_below', 'below'))) +
                __alloT('stem.titration.sr_reading_error', '. Reading error ') +
                (parErr >= 0 ? __alloT('stem.titration.sr_plus', 'plus ') : __alloT('stem.titration.sr_minus', 'minus ')) +
                Math.abs(parErr).toFixed(3) + __alloT('stem.titration.sr_millilitres', ' millilitres.'),
              className: "min-h-[44px] w-full accent-amber-400"
            }),
            React.createElement("div", { className: "flex items-center justify-between text-[0.625rem] text-slate-400" },
              React.createElement("span", null, __alloT('stem.titration.below', '20 cm below')),
              React.createElement("button", {
                onClick: function () { upd('gEyeCm', 0); },
                type: "button", className: "min-h-[44px] px-3 py-2 rounded font-bold text-emerald-300 bg-emerald-900/30 border border-emerald-700/50 hover:bg-emerald-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              }, __alloT('stem.titration.get_level', 'Get level')),
              React.createElement("span", null, __alloT('stem.titration.above', '20 cm above'))),
            React.createElement("div", { className: "rounded-lg p-3 border", style: { borderColor: eyeLevel ? 'rgba(74,222,128,0.5)' : 'rgba(251,191,36,0.5)', background: 'rgba(15,23,42,0.6)' } },
              React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2" },
                [[gInitialLocked ? gInitialRecorded.toFixed(2) + ' mL' : readBurette(gInitialTrue, gEyeCm).toFixed(2) + ' mL (not recorded)', 'Initial burette reading'],
                 [gInitialLocked ? gFinalRecorded.toFixed(2) + ' mL' : '—', 'Final burette reading'],
                 [gInitialLocked ? gRecordedTitre.toFixed(2) + ' mL' : '—', 'Titre = final − initial']].map(function (reading) {
                  return React.createElement("div", { key: reading[1], className: "rounded-lg border border-white/10 bg-white/5 p-2" },
                    React.createElement("div", { className: "text-lg font-black tabular-nums text-white" }, reading[0]),
                    React.createElement("div", { className: "text-xs text-slate-300 mt-1" }, reading[1]));
                })
              ),
              React.createElement("p", { className: "text-xs mt-2", style: { color: eyeLevel ? '#4ade80' : '#fbbf24' } },
                eyeLevel ? 'Eye level — no parallax shift in this reading.' : (parErr < 0 ? 'Eye above the meniscus: this scale reading is low by ' : 'Eye below the meniscus: this scale reading is high by ') + Math.abs(parErr).toFixed(3) + ' mL'),
              React.createElement("p", { className: "text-xs text-slate-300 mt-2 leading-relaxed" }, 'A consistent sight-line error at both readings cancels in final − initial. Changing eye height between readings can bias the titre.')
            )
          )
        )
      ),

      // \u2500\u2500 Replicates: record trials, then report their mean \u2500\u2500
      (function () {
        if (gResult) return null;
        var evaluatedTrials = gTrials.map(function (t) {
          var kind = gradedTrialKind(t);
          var valid = gradedTrialValid(Object.assign({}, t, { endpointState: kind }));
          return Object.assign({}, t, { endpointState: kind, validForMean: valid });
        });
        var includedTrials = evaluatedTrials.filter(function (t) { return t.validForMean && t.included !== false; });
        var liveStats = replicateStats(includedTrials.map(function (t) { return t.recorded; }));
        var concordant = includedTrials.length >= 2 && liveStats.spread <= BURETTE.CONCORDANCE_RANGE_ML + 1e-9;
        return React.createElement("div", { id: "titration-trials", tabIndex: -1, className: "rounded-xl p-3 border border-slate-600/40 bg-slate-900/40 space-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" },
          React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-2" },
            React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-200" }, __alloT('stem.titration.trials', '\uD83E\uDDFE TRIALS')),
            React.createElement("span", { className: "text-[0.625rem] text-slate-400 italic" },
              'Activity criterion: select at least two non-rough titres with a range within ' + BURETTE.CONCORDANCE_RANGE_ML.toFixed(2) + ' mL, then report their mean. Your course may specify another criterion; concordance shows repeatability, not accuracy.')
          ),
          gTrials.length === 0
            ? React.createElement("p", { className: "text-xs text-slate-300" },
                'No trials recorded yet. Record an initial burette reading, titrate to the endpoint, record the final reading, and save the titre. A rough run can be retained but excluded from the mean.')
            : React.createElement("div", { className: "overflow-x-auto", role: "region", "aria-label": "Recorded trial readings", tabIndex: 0 }, React.createElement("table", { className: "w-full min-w-[42rem] text-xs" },
                React.createElement("caption", { className: "sr-only" }, "Recorded trial readings"),
                // The last column holds the discard buttons. It still needs a header
                // with real text — an empty <th> gives screen-reader users an unnamed
                // column — so it is named and hidden visually rather than left blank.
                React.createElement("thead", null, React.createElement("tr", { className: "text-slate-400" },
                  ['Trial', 'Initial', 'Final', 'Titre', 'Endpoint signal', 'Sight line', 'Use in mean'].map(function (hh, hi) {
                    return React.createElement("th", {
                      key: hi, scope: 'col',
                      className: "px-2 py-1 text-left font-bold",
                    }, hh);
                  }))),
                React.createElement("tbody", null, evaluatedTrials.map(function (t, i) {
                  return React.createElement("tr", { key: i, className: "text-slate-300 border-t border-slate-700/40" },
                    React.createElement("td", { className: "px-2 py-2" }, '#' + (i + 1)),
                    React.createElement("td", { className: "px-2 py-2 tabular-nums" }, (isFinite(Number(t.initialRecorded)) ? Number(t.initialRecorded) : 0).toFixed(2) + ' mL'),
                    React.createElement("td", { className: "px-2 py-2 tabular-nums" }, (isFinite(Number(t.finalRecorded)) ? Number(t.finalRecorded) : Number(t.recorded) || 0).toFixed(2) + ' mL'),
                    React.createElement("td", { className: "px-2 py-2 tabular-nums font-bold" }, Number(t.recorded).toFixed(2) + ' mL'),
                    React.createElement("td", { className: "px-2 py-2" },
                      t.endpointState === 'endpoint' ? 'At endpoint — first persistent signal' : t.endpointState === 'over' ? 'Overshot — past endpoint' : t.endpointState === 'flash' ? 'Transient flash — before endpoint' : 'Before endpoint — no persistent signal'),
                    React.createElement("td", { className: "px-2 py-2" }, isFinite(Number(t.initialEyeCm)) && isFinite(Number(t.finalEyeCm)) ? ('initial ' + Number(t.initialEyeCm).toFixed(1) + ' cm; final ' + Number(t.finalEyeCm).toFixed(1) + ' cm') : 'legacy trial'),
                    React.createElement("td", { className: "px-2 py-2 text-right" },
                      t.validForMean
                        ? React.createElement("button", { type: "button", onClick: function () { upd('gTrials', gTrials.map(function (trial, k) { return k === i ? Object.assign({}, trial, { included: trial.included === false }) : trial; })); focusTitrationRegion('titration-trials'); }, "aria-pressed": t.included !== false, "aria-label": (t.included === false ? 'Include' : 'Exclude') + ' trial ' + (i + 1) + ' in the reported mean', className: "min-h-[44px] px-3 py-2 rounded text-xs font-bold text-slate-200 bg-slate-800 border border-slate-600 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" }, t.included === false ? 'Include' : 'Exclude')
                        : React.createElement("span", { className: "text-xs text-amber-300" }, 'Not eligible')));
                }))
              )),
          includedTrials.length >= 2 && React.createElement("div", { className: "text-[0.6875rem] font-bold",
            style: { color: concordant ? '#4ade80' : '#fbbf24' } },
            __alloT('stem.titration.mean_of', 'Mean of ') + liveStats.n + ': ' + liveStats.mean.toFixed(2) + ' mL \u00B7 ' +
            __alloT('stem.titration.spread_is', 'spread ') + liveStats.spread.toFixed(2) + ' mL \u00B7 ' +
            (concordant ? __alloT('stem.titration.concordant', 'concordant \u2713')
                        : __alloT('stem.titration.not_concordant', 'not concordant \u2014 run another'))),
          React.createElement("div", { className: "flex gap-2 flex-wrap" },
            React.createElement("button", {
              type: "button",
              onClick: function () {
                var endpointValid = obsKind === 'endpoint';
                var t = { run: gRun, vb: gVb, initialTrue: gInitialTrue, finalTrue: gFinalTrue,
                  initialRecorded: gInitialRecorded, finalRecorded: gFinalRecorded,
                  initialEyeCm: gInitialEyeCm, finalEyeCm: gEyeCm, eyeCm: gEyeCm,
                  recorded: gRecordedTitre, endpointState: obsKind, endpointReachedAt: gEndpointReachedAt,
                  validForMean: endpointValid && gReadingPairValid, included: endpointValid && gReadingPairValid };
                updMulti({ gTrials: gTrials.concat([t]), gInitialTrue: gFinalTrue, gInitialLocked: false,
                  gInitialRecorded: null, gInitialEyeCm: null, gVb: 0, gEndpointReachedAt: null, gStartMs: gStartMs || Date.now() });
                focusTitrationRegion('titration-trials');
                if (typeof sfxTitrClick === 'function') sfxTitrClick();
                if (announceToSR) announceToSR(__alloT('stem.titration.sr_trial_word', 'Trial ') + (gTrials.length + 1) +
                  __alloT('stem.titration.sr_recorded_at', ' recorded at ') + gRecordedTitre.toFixed(2) +
                  __alloT('stem.titration.sr_ml_fresh_aliquot', ' millilitres. Fresh aliquot in the flask.'));
              },
              disabled: !gInitialLocked || gVb <= 0 || !gReadingPairValid,
              className: "min-h-[44px] px-4 py-2 rounded-xl text-xs font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 " +
                (!gInitialLocked || gVb <= 0 || !gReadingPairValid ? "bg-slate-800/50 text-slate-500 cursor-not-allowed"
                          : "bg-cyan-700 text-white hover:bg-cyan-700 active:scale-[0.98]")
            }, __alloT('stem.titration.record_trial', '\uD83D\uDCCB Record trial ') + (gTrials.length + 1)),
            React.createElement("button", {
              type: "button",
              onClick: function () {
                var selected = evaluatedTrials.filter(function (t) { return t.validForMean && t.included !== false; });
                var readings = selected.map(function (t) { return t.recorded; });
                var st = replicateStats(readings);
                var res = gradeUnknown(gUnknown, st.mean, gEndVb);
                res.run = gRun;
                res.unknownId = spec.id;
                res.endpointRule = 'first persistent signal after swirling';
                res.endpointTargetMl = gEndVb;
                res.stats = st;
                res.pa = precisionAccuracy(st, gUnknown.trueVb);
                res.diag = systematicDiagnosis(selected, res.pa.biasMl);
                res.trials = gTrials.slice();
                res.seconds = gStartMs ? Math.round((Date.now() - gStartMs) / 1000) : 0;
                updMulti({
                  gResult: res,
                  gLog: gLog.concat([{ run: gRun, name: spec.name, band: res.band, volErrMl: res.volErrMl,
                    concErrPct: res.concErrPct, seconds: res.seconds, trials: st.n, spread: st.spread }]).slice(-8)
                });
                focusTitrationRegion('titration-graded-result');
                if (res.withinTolerance && typeof awardStemXP === 'function') awardStemXP('titr-graded-' + gRun, 25, 'Graded titration within tolerance');
                if (typeof sfxTitrSuccess === 'function' && res.withinTolerance) sfxTitrSuccess();
                if (announceToSR) announceToSR(__alloT('stem.titration.sr_reported', 'Reported. ') + res.measuredConc.toPrecision(3) +
                  __alloT('stem.titration.sr_molar_from', ' molar from ') + st.n + __alloT('stem.titration.sr_trials_dot', ' trials. ') +
                  (res.withinTolerance ? __alloT('stem.titration.sr_within_tol', 'Within tolerance.')
                                       : __alloT('stem.titration.sr_outside_tol', 'Outside this activity’s 0.05 millilitre stopping target.')));
              },
              disabled: includedTrials.length < 2 || !concordant,
              className: "min-h-[44px] px-4 py-2 rounded-xl text-xs font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 " +
                (includedTrials.length < 2 || !concordant ? "bg-slate-800/50 text-slate-500 cursor-not-allowed"
                                    : "bg-amber-500 text-slate-900 hover:bg-amber-400 active:scale-[0.98]")
            }, __alloT('stem.titration.finish_and_report', '\u2705 Finish and report the mean')),
            (!concordant) && React.createElement("span", { className: "text-[0.625rem] text-slate-400 self-center" },
              __alloT('stem.titration.need_two', 'Select at least two concordant titres before reporting.'))
          )
        );
      })(),

      gResult && (function () {
        var r = gResult;
        var bandMeta = { excellent: ['#4ade80', 'Excellent \u2014 inside this activity’s stopping target'],
          good: ['#a3e635', 'Good \u2014 just outside the activity target'],
          fair: ['#fbbf24', 'Fair \u2014 a visible technique error'],
          poor: ['#f87171', 'Poor \u2014 check your endpoint and your eye line'] }[r.band];
        return React.createElement("div", { id: "titration-graded-result", tabIndex: -1, role: "region", "aria-label": "Graded titration result", className: "rounded-xl p-4 border space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
          style: { borderColor: bandMeta[0] + '88', background: 'rgba(15,23,42,0.7)' } },
          React.createElement("div", { className: "text-sm font-black", style: { color: bandMeta[0] } }, bandMeta[1]),
          React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2" },
            [[r.measuredConc.toPrecision(3) + ' M', __alloT('stem.titration.your_answer', 'Your answer')],
             [gUnknown.truthConc.toPrecision(3) + ' M', __alloT('stem.titration.true_value', 'True value')],
             [(r.techniqueErrMl >= 0 ? '+' : '') + r.techniqueErrMl.toFixed(2) + ' mL', 'Stopping error vs endpoint'],
             [(r.methodBiasMl >= 0 ? '+' : '') + r.methodBiasMl.toFixed(2) + ' mL', 'Indicator-method bias'],
             [(r.volErrMl >= 0 ? '+' : '') + r.volErrMl.toFixed(2) + ' mL', 'Total error vs equivalence'],
             [(r.concErrPct >= 0 ? '+' : '') + r.concErrPct.toFixed(2) + '%', __alloT('stem.titration.concentration_error', 'Concentration error')]].map(function (m) {
              return React.createElement("div", { key: m[1], className: "rounded-lg border border-white/10 bg-white/5 p-2.5" },
                React.createElement("div", { className: "text-[0.8125rem] font-black text-white break-words" }, m[0]),
                React.createElement("div", { className: "mt-0.5 text-[0.625rem] font-bold text-slate-400" }, m[1]));
            })
          ),
          // \u2500\u2500 Precision and accuracy, scored SEPARATELY \u2500\u2500
          // Reporting one number hides the most common misconception in the whole
          // topic: students read "close together" as "correct". Splitting them lets
          // the panel say precise-but-wrong out loud when that is what happened.
          r.pa && React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2" },
            [[r.pa.precise, __alloT('stem.titration.precision', 'Precision'),
              __alloT('stem.titration.spread_label', 'spread ') + r.stats.spread.toFixed(2) +
                __alloT('stem.titration.ml_over', ' mL over ') + r.stats.n + __alloT('stem.titration.trials_suffix', ' trials'),
              r.pa.precise ? __alloT('stem.titration.replicates_agree', 'Replicates agree') : __alloT('stem.titration.replicates_scatter', 'Replicates scatter')],
             [r.pa.accurate, __alloT('stem.titration.accuracy', 'Accuracy'),
              __alloT('stem.titration.mean_is_off_by', 'mean off by ') + Math.abs(r.pa.biasMl).toFixed(2) + ' mL',
              r.pa.accurate ? __alloT('stem.titration.mean_is_right', 'Mean is right') : __alloT('stem.titration.mean_is_biased', 'Mean is biased')]
            ].map(function (m) {
              return React.createElement("div", { key: m[1], className: "rounded-lg border p-2.5",
                style: { borderColor: m[0] ? 'rgba(74,222,128,0.5)' : 'rgba(248,113,113,0.5)',
                  background: m[0] ? 'rgba(22,101,52,0.15)' : 'rgba(127,29,29,0.15)' } },
                React.createElement("div", { className: "text-[0.625rem] font-bold text-slate-400" }, m[1]),
                React.createElement("div", { className: "text-[0.8125rem] font-black", style: { color: m[0] ? '#4ade80' : '#f87171' } },
                  (m[0] ? '\u2713 ' : '\u2717 ') + m[3]),
                React.createElement("div", { className: "text-[0.625rem] text-slate-400 mt-0.5" }, m[2]));
            })
          ),

          // The teaching moment this whole feature exists for.
          r.pa && r.pa.verdict === 'precise-not-accurate' && React.createElement("div", {
            className: "rounded-lg p-3 border text-[0.6875rem] leading-relaxed",
            style: { borderColor: 'rgba(251,191,36,0.6)', background: 'rgba(120,53,15,0.28)', color: '#fde68a' }
          },
            React.createElement("span", { className: "font-black" }, __alloT('stem.titration.precise_not_accurate_head', '\u26a0 Precise, but not accurate. ')),
            __alloT('stem.titration.precise_not_accurate_body', 'Your replicates agree with each other to ') + r.stats.spread.toFixed(2) +
            __alloT('stem.titration.ml_yet_sit', ' mL, yet their mean sits ') + Math.abs(r.pa.biasMl).toFixed(2) +
            __alloT('stem.titration.ml_from_truth', ' mL from the true value. Repeating a measurement cannot reveal an error that repeats with it \u2014 that is a SYSTEMATIC error, and no number of extra trials will average it away.') +
            (r.diag && r.diag.matchesObserved
              ? ' A changed sight line between initial and final readings predicts ' + (r.diag.predictedMl >= 0 ? '+' : '') + r.diag.predictedMl.toFixed(2) + ' mL, close to the observed ' + (r.pa.biasMl >= 0 ? '+' : '') + r.pa.biasMl.toFixed(2) + ' mL bias.'
              : r.diag ? ' Changing eye height may contribute, but its predicted shift does not fully explain the observed bias; also check endpoint choice, conditioning, tip bubbles, and calibration.' : '')
          ),

          React.createElement("p", { className: "text-xs text-slate-300 leading-relaxed" },
            'Displayed burette readings are recorded to 0.01 mL. The manufacturer error limit, this activity’s scoring target, and the course concordance rule are separate concepts. Estimate method uncertainty from the actual certificate and procedure, endpoint repeatability, standard concentration, pipette/dilution, and other inputs. ',
            __alloT('stem.titration.true_equivalence_was', 'True equivalence was at ') + gUnknown.trueVb.toFixed(2) + ' mL; ' +
            __alloT('stem.titration.your_mean_was', 'the mean of your ') + r.stats.n +
            __alloT('stem.titration.trials_was', ' trials was ') + r.stats.mean.toFixed(2) + ' mL.' +
            (r.seconds ? ' (' + r.seconds + ' s)' : '')),
          React.createElement("button", {
            type: "button",
            onClick: function () { updMulti({ gRun: gRun + 1, gInitialTrue: initialBuretteReading(gRun + 1, 0), gInitialLocked: false, gInitialRecorded: null, gInitialEyeCm: null, gVb: 0, gEndpointReachedAt: null, gResult: null, gStartMs: 0, gEyeCm: 0, gTrials: [] }); focusTitrationRegion('titration-graded-run'); },
            className: "min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-900 hover:bg-amber-400"
          }, __alloT('stem.titration.next_unknown', '\u2192 Next unknown'))
        );
      })(),

      gLog.length > 0 && React.createElement("details", { className: "rounded-xl border border-slate-700/50 overflow-hidden" },
        React.createElement("summary", { className: "px-3 py-2 cursor-pointer text-[0.75rem] font-bold text-slate-300" },
          __alloT('stem.titration.run_log', 'Run log') + ' (' + gLog.length + ')'),
        React.createElement("div", { className: "overflow-x-auto", role: "region", "aria-label": "Completed unknown runs", tabIndex: 0 }, React.createElement("table", { className: "w-full min-w-[34rem] text-xs" },
          React.createElement("caption", { className: "sr-only" }, "Completed unknown runs"),
          React.createElement("thead", null, React.createElement("tr", { className: "text-slate-400" },
            ['Run', 'Unknown', '\u0394V (mL)', '\u0394 conc', 'Time'].map(function (hh) {
              return React.createElement("th", { key: hh, scope: 'col', className: "px-2 py-1 text-left font-bold" }, hh);
            }))),
          React.createElement("tbody", null, gLog.map(function (e, i) {
            return React.createElement("tr", { key: i, className: "text-slate-300 border-t border-slate-700/40" },
              React.createElement("td", { className: "px-2 py-1" }, '#' + e.run),
              React.createElement("td", { className: "px-2 py-1" }, e.name),
              React.createElement("td", { className: "px-2 py-1 tabular-nums" }, (e.volErrMl >= 0 ? '+' : '') + e.volErrMl.toFixed(2)),
              React.createElement("td", { className: "px-2 py-1 tabular-nums" }, (e.concErrPct >= 0 ? '+' : '') + e.concErrPct.toFixed(2) + '%'),
              React.createElement("td", { className: "px-2 py-1 tabular-nums" }, e.seconds + ' s'));
          }))
        ))
      )
    );
  })(),

  labTab === 'challenge' && chMode === 'quiz' && React.createElement("div", {
    className: "rounded-2xl p-5 border space-y-4",
    style: Object.assign({}, glass, { background: 'rgba(3,25,40,0.85)', borderColor: 'rgba(245,158,11,0.3)' })
  },
    React.createElement("div", { className: "flex items-center justify-between" },
      React.createElement("h3", { className: "text-sm font-black text-amber-400" }, __alloT('stem.titration.lab_safety_chemistry_challenge', "\uD83C\uDFC6 Lab Safety & Chemistry Challenge")),
      React.createElement("div", { className: "flex gap-2" },
        React.createElement("span", { className: "text-[0.6875rem] font-bold px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400" }, "Score: " + challengeScore),
        challengeStreak >= 3 && React.createElement("span", { className: "text-[0.6875rem] font-bold px-2 py-0.5 rounded-full bg-red-900/30 text-red-400" }, "\uD83D\uDD25 Streak: " + challengeStreak)
      )
    ),
    // Current question
    (function() {
      var cq = challengeQuestions[challengeIdx % challengeQuestions.length];
      return React.createElement("div", {
        id: "titration-quiz-question", tabIndex: -1,
        className: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 rounded-xl"
      },
        React.createElement("div", { className: "flex items-center gap-2 mb-2" },
          React.createElement("span", {
            className: "text-[0.6875rem] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider " +
              (cq.category === 'safety' ? 'bg-red-900/30 text-red-400' : cq.category === 'technique' ? 'bg-cyan-900/30 text-cyan-400' : 'bg-indigo-900/30 text-indigo-400')
          }, cq.category),
          React.createElement("span", { className: "text-[0.6875rem] text-slate-400" }, "Q" + (challengeIdx + 1) + " of " + challengeQuestions.length)
        ),
        React.createElement("p", { className: "text-sm font-semibold text-white mb-3" }, cq.q),
        React.createElement("div", { className: "flex flex-col gap-2" },
          cq.opts.map(function(opt) {
            var showResult = challengeAnswer !== null;
            var isSelected = challengeAnswer === opt;
            var isCorrect = opt === cq.answer;
            var cls = "min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ";
            if (showResult && isSelected && isCorrect) cls += "bg-emerald-700 text-white ring-2 ring-emerald-400";
            else if (showResult && isSelected && !isCorrect) cls += "bg-red-600 text-white";
            else if (showResult && isCorrect) cls += "bg-emerald-600/20 text-emerald-300 border border-emerald-500";
            else cls += "transition-colors bg-slate-800/60 text-slate-200 hover:bg-slate-700/80 border border-slate-600 hover:border-slate-400 active:scale-[0.97]";
            return React.createElement("button", { type: "button", "aria-label": "Select answer: " + opt,
              key: opt, disabled: showResult,
              onClick: function() {
                var correct = opt === cq.answer;
                updMulti({
                  challengeAnswer: opt,
                  challengeScore: correct ? challengeScore + cq.xp : challengeScore,
                  challengeStreak: correct ? challengeStreak + 1 : 0
                });
                focusTitrationRegion('titration-quiz-feedback');
                if (correct && typeof awardStemXP === 'function') awardStemXP('titration-ch-' + challengeIdx, cq.xp, 'Challenge: ' + cq.q.substring(0, 30) + '...');
              },
              className: cls
            }, opt);
          })
        ),
        // Feedback
        challengeAnswer && React.createElement("div", {
          id: "titration-quiz-feedback", tabIndex: -1,
          role: "status", "aria-live": "polite", "aria-atomic": "true",
          className: "mt-3 p-3 rounded-xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 " + (challengeAnswer === cq.answer ? "bg-emerald-900/20 border-emerald-700" : "bg-red-900/20 border-red-700")
        },
          React.createElement("p", { className: "text-xs font-bold mb-1 " + (challengeAnswer === cq.answer ? "text-emerald-400" : "text-red-400") },
            challengeAnswer === cq.answer ? "\u2705 Correct! +" + cq.xp + " XP" + (challengeStreak >= 3 ? " \uD83D\uDD25 Streak bonus!" : "") : "\u274C Incorrect"
          ),
          React.createElement("p", { className: "text-[0.6875rem] text-slate-300 leading-relaxed" }, cq.feedback),
          React.createElement("div", { className: "mt-2" },
            React.createElement("button", { "aria-label": __alloT('stem.titration.next_question', "Next Question"),
              type: "button",
              onClick: function() {
                updMulti({ challengeIdx: (challengeIdx + 1) % challengeQuestions.length, challengeAnswer: null });
                focusTitrationRegion('titration-quiz-question');
              },
              className: "min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-700 hover:to-orange-700 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            }, __alloT('stem.titration.next_question_2', "Next Question \u2192"))
          )
        )
      );
    })()
  ),

  // ══════════════════════════════════════════════
  // LAB INCIDENT SIMULATOR TAB
  // ══════════════════════════════════════════════
  labTab === 'incidents' && React.createElement("div", {
    className: "rounded-2xl p-5 border space-y-4",
    style: Object.assign({}, glass, { background: 'rgba(3,25,40,0.85)', borderColor: 'rgba(239,68,68,0.3)' })
  },
    React.createElement("div", { className: "flex items-center justify-between" },
      React.createElement("h3", { className: "text-sm font-black text-red-400" }, __alloT('stem.titration.lab_safety_incident_simulator', "\uD83D\uDEA8 Lab Safety Incident Simulator")),
      React.createElement("div", { className: "flex gap-2" },
        React.createElement("span", { className: "text-[0.6875rem] font-bold px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-400" },
          Object.keys(incidentCompleted).filter(function(k) { return incidentCompleted[k]; }).length + "/" + incidentScenarios.length + " completed"),
        React.createElement("span", { className: "text-[0.6875rem] font-bold px-2 py-0.5 rounded-full bg-red-900/30 text-red-400" }, "Score: " + incidentScore)
      )
    ),
    React.createElement("p", { className: "text-xs text-slate-300 leading-relaxed" },
      __alloT('stem.titration.practice_responding_to_real_lab_emerge', "Practice choosing the safest first action. Use these scenarios to learn the local protocol sequence; real incidents must be handled under teacher and site emergency direction.")
    ),
    // Scenario selector dots
    React.createElement("div", { className: "flex gap-2 justify-center" },
      incidentScenarios.map(function(sc, i) {
        var completed = incidentCompleted[sc.id];
        return React.createElement("button", { type: "button", "aria-label": "Select incident scenario: " + sc.title + (completed ? ", completed" : ""), "aria-current": i === incidentIdx ? "true" : undefined,
          key: sc.id,
          onClick: function() {
            updMulti({ incidentIdx: i, incidentAnswer: null });
            focusTitrationRegion('titration-incident-scenario');
          },
          className: "w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 " +
            (i === incidentIdx ? "ring-2 ring-offset-1 ring-offset-slate-900 ring-red-400 " : "") +
            (completed ? "bg-emerald-700 text-white" : "transition-colors bg-slate-800 text-slate-200 border border-slate-600 hover:border-slate-400"),
          title: sc.title
        }, completed ? "\u2714" : sc.icon);
      })
    ),
    // Current scenario
    (function() {
      var scenario = incidentScenarios[incidentIdx] || incidentScenarios[0];
      return React.createElement("div", {
        id: "titration-incident-scenario", tabIndex: -1,
        className: "rounded-xl p-4 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300",
        style: { background: scenario.urgency === 'critical' ? 'rgba(127,29,29,0.2)' : scenario.urgency === 'high' ? 'rgba(120,53,15,0.2)' : 'rgba(30,41,59,0.5)', borderColor: scenario.urgency === 'critical' ? 'rgba(248,113,113,0.4)' : scenario.urgency === 'high' ? 'rgba(251,191,36,0.3)' : 'rgba(100,116,139,0.3)' }
      },
        React.createElement("div", { className: "flex items-center gap-2 mb-2" },
          React.createElement("span", { className: "text-2xl" }, scenario.icon),
          React.createElement("div", null,
            React.createElement("h4", { className: "text-sm font-black text-white" }, scenario.title),
            React.createElement("span", {
              className: "text-[0.6875rem] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider " +
                (scenario.urgency === 'critical' ? 'bg-red-600 text-white' : scenario.urgency === 'high' ? 'bg-amber-700 text-white' : 'bg-slate-600 text-slate-200')
            }, scenario.urgency + " urgency")
          )
        ),
        React.createElement("p", { className: "text-xs text-slate-300 mb-3 leading-relaxed" }, scenario.desc),
        React.createElement("div", { className: "text-[0.6875rem] font-bold text-red-400 mb-2" }, __alloT('stem.titration.what_do_you_do', "What do you do?")),
        React.createElement("div", { className: "flex flex-col gap-2" },
          scenario.options.map(function(opt) {
            var showResult = incidentAnswer !== null;
            var isSelected = incidentAnswer === opt.id;
            var cls = "px-4 py-3 rounded-xl text-xs font-semibold text-left transition-all flex items-start gap-2 ";
            if (showResult && isSelected && opt.correct) cls += "bg-emerald-700 text-white ring-2 ring-emerald-400";
            else if (showResult && isSelected && !opt.correct) cls += "bg-red-600 text-white";
            else if (showResult && opt.correct) cls += "bg-emerald-600/20 text-emerald-300 border border-emerald-500";
            else cls += "transition-colors bg-slate-800/60 text-slate-200 hover:bg-slate-700/80 border border-slate-600 hover:border-slate-400 active:scale-[0.97]";
            return React.createElement("button", { type: "button", "aria-label": "Select emergency response: " + opt.label,
              key: opt.id, disabled: showResult,
              onClick: function() {
                var newCompleted = Object.assign({}, incidentCompleted);
                newCompleted[scenario.id] = true;
                updMulti({
                  incidentAnswer: opt.id,
                  incidentScore: opt.correct ? incidentScore + 20 : incidentScore,
                  incidentCompleted: newCompleted
                });
                focusTitrationRegion('titration-incident-feedback');
                if (opt.correct && typeof awardStemXP === 'function') awardStemXP('incident-' + scenario.id, 20, 'Correct safety response: ' + scenario.title);
              },
              className: cls
            },
              React.createElement("span", { className: "text-base shrink-0" }, opt.icon),
              React.createElement("span", null, opt.label)
            );
          })
        ),
        // Feedback
        incidentAnswer && (function() {
          var selected = scenario.options.find(function(o) { return o.id === incidentAnswer; });
          return React.createElement("div", {
            id: "titration-incident-feedback", tabIndex: -1,
            role: "status", "aria-live": "polite", "aria-atomic": "true",
            className: "mt-3 p-3 rounded-xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 " + (selected.correct ? "bg-emerald-900/20 border-emerald-700" : "bg-red-900/20 border-red-700")
          },
            React.createElement("p", { className: "text-xs font-bold mb-1 " + (selected.correct ? "text-emerald-400" : "text-red-400") },
              selected.correct ? "\u2705 Correct Response! +20 XP" : "\u274C Not the best response"
            ),
            React.createElement("p", { className: "text-[0.6875rem] text-slate-300 leading-relaxed" }, selected.feedback),
            incidentIdx < incidentScenarios.length - 1 && React.createElement("button", { type: "button", "aria-label": __alloT('stem.titration.next_scenario', "Next Scenario"),
              onClick: function() {
                updMulti({ incidentIdx: incidentIdx + 1, incidentAnswer: null });
                focusTitrationRegion('titration-incident-scenario');
              },
              className: "mt-2 min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 bg-gradient-to-r from-red-600 to-orange-700 hover:from-red-600 hover:to-orange-700 transition-all"
            }, __alloT('stem.titration.next_scenario_2', "Next Scenario \u2192"))
          );
        })()
      );
    })()
  ),

  // ══════════════════════════════════════════════
  // EQUIPMENT GUIDE TAB
  // ══════════════════════════════════════════════
  labTab === 'equipment' && React.createElement("div", {
    'data-titration-equipment-guide': true,
    className: "rounded-2xl p-5 border space-y-4",
    style: Object.assign({}, glass, { background: 'rgba(3,25,40,0.85)', borderColor: 'rgba(34,197,94,0.3)' })
  },
    React.createElement("h3", { className: "text-sm font-black text-emerald-400 mb-2" }, __alloT('stem.titration.lab_equipment_proper_technique', "\uD83D\uDD2C Lab Equipment & Proper Technique")),
    React.createElement("p", { className: "text-xs text-slate-200 mb-3" }, __alloT('stem.titration.master_the_correct_technique_for_each_', "Master the correct technique for each piece of equipment. Good technique = accurate results + safe lab work.")),

    React.createElement(TitrationPreparationPath,{React:React,t:__alloT,data:d,selected:selectedEquip,onSelect:selectEquipment}),

    // \u2500\u2500 Why the tolerances differ: the glassware bench \u2500\u2500
    // The list below teaches technique. This teaches the number that sits beside every
    // piece of glassware in a catalogue and is otherwise pure memorisation.
    (function () {
      var benchSel = d.benchSel || 'burette';
      var sel = GLASSWARE[0];
      for (var gi = 0; gi < GLASSWARE.length; gi++) if (GLASSWARE[gi].id === benchSel) sel = GLASSWARE[gi];
      var benchReady = BENCH_GL.status() === 'ready';
      BENCH_GL.onStatusChange(function () { upd('benchTick', (d.benchTick || 0) + 1); });
      var bRot = d.benchRot || { rotY: 8, rotX: 10 };
      var bZoom = d.benchZoom || 1;
      var setBRot = function (y, x) { upd('benchRot', { rotY: y, rotX: Math.max(-40, Math.min(70, x)) }); };
      BENCH_GL.push({
        static: true,                      // still life; see the burette push above
        sig: [benchSel, !!(ctx && ctx.isContrast)].join('|'),
        selected: benchSel, contrast: !!(ctx && ctx.isContrast),
        rotY: bRot.rotY, rotX: bRot.rotX, zoom: bZoom
      });
      var slice = mlHeightMm(sel.boreMm);
      var beaker = mlHeightMm(70);
      return React.createElement("div", { className: "rounded-xl p-3 border border-emerald-800/40 bg-slate-900/40 space-y-3 mb-4" },
        React.createElement("div", { className: "text-[0.6875rem] font-bold text-emerald-300" },
          __alloT('stem.titration.why_tolerances_differ', '\uD83D\uDCD0 WHY THE TOLERANCES DIFFER')),
        React.createElement("p", { className: "text-[0.6875rem] text-slate-300 leading-relaxed" },
          __alloT('stem.titration.bore_explains_tolerance', 'A tolerance is not an arbitrary number stamped on the glass \u2014 it follows from how wide the vessel is where you read it. The blue slice in each vessel below is one millilitre, drawn to scale against that vessel\'s real bore.')),
        React.createElement("div", {
          style: { position: 'relative', height: 'clamp(240px, 26vw, 340px)', borderRadius: 10, overflow: 'hidden',
            background: '#0a1420', border: '1px solid rgba(100,116,139,0.35)' }
        },
          React.createElement("div", {
            ref: benchGlRef,
            style: { position: 'absolute', inset: 0, cursor: 'grab', touchAction: 'pan-y' },
            role: benchReady ? "img" : undefined,
            tabIndex: benchReady ? 0 : undefined,
            "aria-label": !benchReady ? undefined :
              'Six vessels side by side, each drawn at its true bore with a one millilitre slice to scale. ' +
              GLASSWARE.map(function (g) {
                return g.label + ', bore ' + g.boreMm + ' millimetres, one millilitre stands ' +
                  mlHeightMm(g.boreMm).toFixed(1) + ' millimetres tall';
              }).join('. ') + '. Arrow keys orbit, 0 resets.',
            onPointerDown: function (ev) {
              benchDrag.current = { x: ev.clientX, y: ev.clientY, rotY: bRot.rotY, rotX: bRot.rotX };
              try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
            },
            onPointerMove: function (ev) {
              var g2 = benchDrag.current;
              if (!g2) return;
              setBRot(g2.rotY + (ev.clientX - g2.x) * 0.5, g2.rotX + (ev.clientY - g2.y) * 0.3);
            },
            onPointerUp: function () { benchDrag.current = null; },
            onPointerCancel: function () { benchDrag.current = null; },
            onWheel: function (ev) { ev.preventDefault(); upd('benchZoom', Math.max(0.55, Math.min(2.4, bZoom * (ev.deltaY < 0 ? 1.12 : 0.89)))); },
            onKeyDown: function (ev) {
              var k = ev.key;
              if (k === 'ArrowLeft') setBRot(bRot.rotY - 8, bRot.rotX);
              else if (k === 'ArrowRight') setBRot(bRot.rotY + 8, bRot.rotX);
              else if (k === 'ArrowUp') setBRot(bRot.rotY, bRot.rotX - 6);
              else if (k === 'ArrowDown') setBRot(bRot.rotY, bRot.rotX + 6);
              else if (k === '+' || k === '=') upd('benchZoom', Math.min(2.4, bZoom * 1.15));
              else if (k === '-' || k === '_') upd('benchZoom', Math.max(0.55, bZoom * 0.87));
              else if (k === '0' || k === 'Home') updMulti({ benchRot: { rotY: 8, rotX: 10 }, benchZoom: 1 });
              else return;
              ev.preventDefault();
            }
          }),
          !benchReady && React.createElement("div", {
            style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10 }
          },
            (function () {
              var gap = 12, marginX = 22, bodyPx = 132, baseY = 172;
              var bores = GLASSWARE.reduce(function (sum, g) { return sum + g.boreMm; }, 0);
              var scale = (560 - marginX * 2 - gap * (GLASSWARE.length - 1)) / bores;
              var x = marginX, parts = [];
              GLASSWARE.forEach(function (g) {
                var w = g.boreMm * scale, on = g.id === benchSel;
                // Floored at one pixel: the beaker's millilitre is 0.26 mm and would
                // round away entirely, which would hide the very fact being taught.
                var slice = Math.max(1, mlHeightMm(g.boreMm) * scale);
                parts.push(React.createElement('g', { key: g.id },
                  React.createElement('rect', { x: x, y: baseY - bodyPx, width: w, height: bodyPx,
                    fill: on ? 'rgba(16,185,129,0.10)' : 'rgba(148,163,184,0.06)',
                    stroke: on ? '#34d399' : '#7c8ea3', strokeWidth: on ? 2 : 1 }),
                  React.createElement('rect', { x: x, y: baseY - slice, width: w, height: slice,
                    fill: '#38bdf8', stroke: '#bae6fd', strokeWidth: 0.5 }),
                  React.createElement('text', { x: x + w / 2, y: baseY + 15, fontSize: 11,
                    textAnchor: 'middle', fill: on ? '#6ee7b7' : '#cbd5e1' }, g.boreMm + ' mm'),
                  React.createElement('text', { x: x + w / 2, y: baseY + 29, fontSize: 10,
                    textAnchor: 'middle', fill: '#94a3b8' }, mlHeightMm(g.boreMm).toFixed(2))));
                x += w + gap;
              });
              return React.createElement('svg', { viewBox: '0 0 560 208', width: '100%',
                preserveAspectRatio: 'xMidYMid meet', style: { maxHeight: '100%' }, role: 'img',
                'aria-label': __alloT('stem.titration.bench_fallback', 'The 3D bench needs WebGL. The table below carries the same comparison.') },
                React.createElement('line', { x1: 10, y1: baseY, x2: 550, y2: baseY, stroke: '#64748b', strokeWidth: 1 }),
                parts);
            })(),
            React.createElement("span", { style: { color: '#94a3b8', fontSize: 11, textAlign: 'center' } },
              __alloT('stem.titration.bench_fallback', 'The 3D bench needs WebGL. The table below carries the same comparison.'))
          ),
          benchReady && React.createElement("div", {
            style: { position: 'absolute', left: 8, bottom: 6, fontSize: 10, color: '#94a3b8',
              pointerEvents: 'none', background: 'rgba(10,20,32,0.7)', padding: '3px 8px', borderRadius: 999 },
            "aria-hidden": true
          }, __alloT('stem.titration.bench_hint', 'Drag or arrow keys \u2014 orbit \u00B7 heights are equalised, bores are true'))
        ),
        // Selector doubles as the accessible control: the 3D never has to be clicked.
        React.createElement("div", { className: "flex gap-1.5 flex-wrap" },
          GLASSWARE.map(function (g) {
            var on = g.id === benchSel;
            return React.createElement("button", {
              key: g.id, type: "button", onClick: function () { upd('benchSel', g.id); },
              "aria-pressed": on ? 'true' : 'false',
              className: "min-h-[44px] px-3 py-2 rounded-lg text-[0.625rem] font-bold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 " +
                (on ? "bg-emerald-500 text-slate-900 border-emerald-300"
                    : "bg-slate-800/60 text-slate-300 border-slate-600 hover:bg-slate-700/70")
            }, g.label);
          })
        ),
        React.createElement("div", { className: "overflow-x-auto", role: "region", "aria-label": "Glassware comparison", tabIndex: 0 }, React.createElement("table", { className: "w-full min-w-[36rem] text-xs" },
          React.createElement("caption", { className: "sr-only" }, "Glassware comparison"),
          React.createElement("thead", null, React.createElement("tr", { className: "text-slate-400" },
            ['Vessel', 'Bore', '1 mL stands', 'Tolerance', 'as % of capacity'].map(function (hh) {
              return React.createElement("th", { key: hh, scope: 'col', className: "px-2 py-1 text-left font-bold" }, hh);
            }))),
          React.createElement("tbody", null, GLASSWARE.map(function (g) {
            var on = g.id === benchSel;
            return React.createElement("tr", { key: g.id,
              className: "border-t border-slate-700/40 " + (on ? "text-emerald-300 font-bold" : "text-slate-300") },
              React.createElement("td", { className: "px-2 py-1" }, g.label),
              React.createElement("td", { className: "px-2 py-1 tabular-nums" }, g.boreMm + ' mm'),
              React.createElement("td", { className: "px-2 py-1 tabular-nums" }, mlHeightMm(g.boreMm).toFixed(1) + ' mm'),
              React.createElement("td", { className: "px-2 py-1 tabular-nums" }, '\u00B1' + g.tolMl + ' mL'),
              React.createElement("td", { className: "px-2 py-1 tabular-nums" }, tolPercent(g).toFixed(2) + '%'));
          }))
        )),
        React.createElement("p", { className: "text-[0.6875rem] leading-relaxed", style: { color: '#a7f3d0' } },
          __alloT('stem.titration.bench_punchline_a', 'In the ') + sel.label.toLowerCase() +
          __alloT('stem.titration.bench_punchline_b', ', one millilitre stands ') + slice.toFixed(1) +
          __alloT('stem.titration.bench_punchline_c', ' mm tall \u2014 about ') + (slice / beaker).toFixed(0) +
          __alloT('stem.titration.bench_punchline_d', '\u00D7 what the same millilitre manages in a 250 mL beaker, where it is a ') +
          beaker.toFixed(2) + __alloT('stem.titration.bench_punchline_e', ' mm film you could not see, let alone read. That is the entire reason you titrate from a burette and not out of a beaker.'))
      );
    })(),
    React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" },
      labEquipment.map(function(eq) {
        var isSelected = selectedEquip === eq.id;
        return React.createElement("button", {
          key: eq.id, type: "button",
          id: "titration-equipment-button-" + eq.id,
          "aria-expanded": isSelected ? "true" : "false",
          "aria-controls": "titration-equipment-detail-" + eq.id,
          "aria-labelledby": "titration-equipment-name-" + eq.id,
          "aria-describedby": "titration-equipment-description-" + eq.id,
          onClick: function() { selectEquipment(isSelected ? null : eq.id); },
          className: "min-h-[44px] text-left p-3 rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 " +
            (isSelected ? "bg-emerald-900/30 border-emerald-500/50 ring-1 ring-emerald-500/30" : "transition-colors bg-slate-800/40 border-slate-700 hover:border-slate-500")
        },
          React.createElement("div", { className: "flex items-center gap-2 mb-1" },
            React.createElement("span", { className: "text-lg" }, eq.icon),
            React.createElement("span", { id: "titration-equipment-name-" + eq.id, className: "text-xs font-bold " + (isSelected ? "text-emerald-400" : "text-white") }, eq.name)
          ),
          React.createElement("p", { id: "titration-equipment-description-" + eq.id, className: "text-[0.6875rem] text-slate-200" }, eq.desc)
        );
      })
    ),
    labEquipment.map(function (eq) {
      return eq.id === selectedEquip ? null : React.createElement("div", {
        key: 'detail-placeholder-' + eq.id,
        id: "titration-equipment-detail-" + eq.id,
        hidden: true
      });
    }),
    // Selected equipment detail
    selectedEquip && (function() {
      var eq = labEquipment.find(function(e) { return e.id === selectedEquip; });
      if (!eq) return null;
      return React.createElement("div", {
        id: "titration-equipment-detail-" + eq.id, tabIndex: -1,
        role: "region", "aria-labelledby": "titration-equipment-name-" + eq.id,
        className: "space-y-3 animate-in fade-in duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
      },
        eq.id === 'analytical-balance' && React.createElement(TitrationWeighingPractice,{React:React,t:__alloT,state:d.weighingPractice,onAction:function(action){upd('weighingPractice',titrationWeighingTransition(d.weighingPractice,action));},onSelect:selectEquipment}),
        eq.id === 'weighing-boat' && React.createElement(TitrationTransferPractice,{React:React,t:__alloT,state:d.transferPractice,weighing:d.weighingPractice,onAction:function(action){upd('transferPractice',titrationTransferTransition(d.transferPractice,action,d.weighingPractice));},onSelect:selectEquipment}),
        eq.id === 'volumetric-flask' && React.createElement(TitrationPreparationSample,{React:React,t:__alloT,state:d.transferPractice,onSelect:selectEquipment}),
        eq.id === 'volumetric-flask' && React.createElement(TitrationPreparationPractice,{React:React,t:__alloT,state:d.preparationPractice,transfer:d.transferPractice,onAction:function(action){upd('preparationPractice',titrationPreparationTransition(d.preparationPractice,action,d.transferPractice));},onSelect:selectEquipment}),
        eq.id === 'pipette' && React.createElement(TitrationAliquotPractice,{React:React,t:__alloT,state:d.aliquotPractice,preparation:d.preparationPractice,onAction:function(action){upd('aliquotPractice',titrationAliquotTransition(d.aliquotPractice,action,d.preparationPractice));},onSelect:selectEquipment,onClose:function(){upd('selectedEquip',null);focusTitrationRegion('titration-equipment-button-pipette');}}),
        eq.study && React.createElement(TitrationEquipmentStudy, { key: eq.id, React: React, t: __alloT, equipment: eq, catalogue:labEquipment, onSelect:selectEquipment, onClose: function() {
          upd('selectedEquip', null);
          focusTitrationRegion('titration-equipment-button-' + eq.id);
        } }),
        // Technique
        React.createElement("div", { className: "rounded-xl p-4 border border-emerald-800/30 bg-emerald-950/20" },
          React.createElement("h5", { className: "text-xs font-bold text-emerald-400 mb-2" }, __alloT('stem.titration.correct_technique', "\u2705 Correct Technique")),
          React.createElement("p", { className: "text-[0.6875rem] text-slate-300 leading-relaxed" }, eq.technique)
        ),
        // Common errors
        React.createElement("div", { className: "rounded-xl p-4 border border-amber-800/30 bg-amber-950/20" },
          React.createElement("h5", { className: "text-xs font-bold text-amber-400 mb-2" }, __alloT('stem.titration.common_errors', "\u26A0\uFE0F Common Errors")),
          React.createElement("ul", { className: "space-y-1" },
            eq.errors.map(function(err, i) {
              return React.createElement("li", { key: i, className: "text-[0.6875rem] text-slate-300 flex items-start gap-1.5" },
                React.createElement("span", { className: "text-red-400 shrink-0" }, "\u2022"),
                err
              );
            })
          )
        ),
        // Safety note
        React.createElement("div", { className: "rounded-xl p-4 border border-red-800/30 bg-red-950/20" },
          React.createElement("h5", { className: "text-xs font-bold text-red-400 mb-1" }, __alloT('stem.titration.safety_note', "\uD83D\uDEE1\uFE0F Safety Note")),
          React.createElement("p", { className: "text-[0.6875rem] text-slate-300 leading-relaxed" }, eq.safetyNote)
        )
      );
    })()
  ),

  // ══════════════════════════════════════════════
  // DILUTION & MOLARITY CALCULATOR TAB
  // ══════════════════════════════════════════════
  labTab === 'molarity' && React.createElement("div", {
    className: "rounded-2xl p-5 border space-y-4",
    style: Object.assign({}, glass, { background: 'rgba(3,25,40,0.85)', borderColor: 'rgba(167,139,250,0.3)' })
  },
    React.createElement("h3", { className: "text-sm font-black text-violet-400 mb-1" }, __alloT('stem.titration.dilution_molarity_calculator', "\uD83E\uDDEE Dilution & Molarity Calculator")),
    React.createElement("p", { className: "text-xs text-slate-200 mb-3" }, __alloT('stem.titration.c_v_c_v_calculate_how_to_dilute_a_stoc', "C\u2081V\u2081 = C\u2082V\u2082 \u2014 Calculate how to dilute a stock solution to a target concentration.")),

    // Safety warning
    React.createElement("div", {
      className: "flex items-start gap-2 px-3 py-2 rounded-xl border",
      style: { background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }
    },
      React.createElement("span", { className: "text-base shrink-0" }, "\u26A0\uFE0F"),
      React.createElement("div", null,
        React.createElement("p", { className: "text-[0.6875rem] font-bold text-red-400" }, __alloT('stem.titration.critical_safety_reminder', "CRITICAL SAFETY REMINDER")),
        React.createElement("p", { className: "text-[0.6875rem] text-red-300/70" }, __alloT('stem.titration.always_add_acid_to_water_never_water_t', "Always add acid TO water, never water to acid. Exothermic mixing can cause violent boiling and splash concentrated acid."))
      )
    ),

    // Calculator inputs
    React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" },
      // Stock solution (C1)
      React.createElement("div", { className: "rounded-xl p-3 border border-violet-800/30 bg-violet-950/20" },
        React.createElement("div", { className: "text-[0.6875rem] font-bold text-violet-400 mb-2 uppercase tracking-wider" }, __alloT('stem.titration.stock_solution', "Stock Solution")),
        React.createElement("label", { className: "block mb-2" },
          React.createElement("span", { className: "text-[0.6875rem] text-slate-200" }, __alloT('stem.titration.c_concentration', "C\u2081 (Concentration)")),
          React.createElement("div", { className: "flex items-center gap-1 mt-1" },
            React.createElement("input", {
              type: "range", min: 0.01, max: 18, step: 0.01, value: molarityCalcC1,
              onChange: function(e) { var nextC1 = parseFloat(e.target.value); updMulti({ molarityC1: nextC1, molarityC2: Math.min(molarityCalcC2, nextC1) }); },
              'aria-label': __alloT('stem.titration.stock_solution_concentration', 'Stock solution concentration'),
              'aria-valuetext': molarityCalcC1.toFixed(2) + ' molar',
              className: "flex-1 min-h-[44px] accent-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 rounded"
            }),
            React.createElement("span", { className: "text-xs font-mono font-bold text-violet-300 w-16 text-right" }, molarityCalcC1.toFixed(2) + " M")
          )
        ),
        React.createElement("label", { className: "block" },
          React.createElement("span", { className: "text-[0.6875rem] text-slate-200" }, __alloT('stem.titration.v_volume_needed', "V\u2081 (Volume needed)")),
          React.createElement("div", { className: "text-lg font-black text-violet-300 mt-1 tracking-tight" },
            (dilutionStockMl).toFixed(2) + " mL"
          ),
          React.createElement("span", { className: "text-[0.6875rem] text-slate-200" }, __alloT('stem.titration.calculated_from_c_v_c', "Calculated from C\u2082V\u2082/C\u2081"))
        )
      ),
      // Desired solution (C2, V2)
      React.createElement("div", { className: "rounded-xl p-3 border border-cyan-800/30 bg-cyan-950/20" },
        React.createElement("div", { className: "text-[0.6875rem] font-bold text-cyan-400 mb-2 uppercase tracking-wider" }, __alloT('stem.titration.desired_solution', "Desired Solution")),
        React.createElement("label", { className: "block mb-2" },
          React.createElement("span", { className: "text-[0.6875rem] text-slate-200" }, __alloT('stem.titration.c_target_concentration', "C\u2082 (Target concentration)")),
          React.createElement("div", { className: "flex items-center gap-1 mt-1" },
            React.createElement("input", {
              type: "range", min: 0.001, max: molarityCalcC1, step: 0.001, value: dilutionC2,
              onChange: function(e) { upd('molarityC2', parseFloat(e.target.value)); },
              'aria-label': __alloT('stem.titration.target_concentration', 'Target concentration'),
              'aria-valuetext': dilutionC2.toFixed(3) + ' molar',
              className: "flex-1 min-h-[44px] accent-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 rounded"
            }),
            React.createElement("span", { className: "text-xs font-mono font-bold text-cyan-300 w-16 text-right" }, dilutionC2.toFixed(3) + " M")
          )
        ),
        React.createElement("label", { className: "block" },
          React.createElement("span", { className: "text-[0.6875rem] text-slate-200" }, __alloT('stem.titration.v_final_volume', "V\u2082 (Final volume)")),
          React.createElement("div", { className: "flex items-center gap-1 mt-1" },
            React.createElement("input", {
              type: "range", min: 1, max: 1000, step: 1, value: molarityCalcV1,
              onChange: function(e) { upd('molarityV1', parseFloat(e.target.value)); },
              'aria-label': __alloT('stem.titration.final_volume', 'Final volume'),
              'aria-valuetext': molarityCalcV1.toFixed(0) + ' milliliters',
              className: "flex-1 min-h-[44px] accent-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 rounded"
            }),
            React.createElement("span", { className: "text-xs font-mono font-bold text-cyan-300 w-16 text-right" }, molarityCalcV1.toFixed(0) + " mL")
          )
        )
      )
    ),

    dilutionTargetAdjusted && React.createElement("div", { role: "status", "aria-live": "polite", className: "rounded-lg border border-amber-700/50 bg-amber-950/30 p-3 text-xs text-amber-200" },
      "The requested target concentration exceeded the stock, so it was limited to " + dilutionC2.toFixed(3) + " M. A dilution cannot be more concentrated than its stock solution."
    ),

    React.createElement(TitrationDilutionView,{React:React,t:__alloT,stockMl:dilutionStockMl,finalMl:molarityCalcV1,stockC:molarityCalcC1,finalC:dilutionC2}),

    // Dilution procedure
    React.createElement("div", { className: "rounded-xl p-4 border border-slate-700 bg-slate-800/40" },
      React.createElement("div", { className: "text-[0.6875rem] font-bold text-white mb-2" }, __alloT('stem.titration.dilution_procedure', "\uD83D\uDCD0 Dilution Procedure")),
      React.createElement("div", { className: "space-y-2" },
        [
          { step: 1, text: "Calculate V\u2081 = C\u2082 \u00D7 V\u2082 / C\u2081 = " + dilutionC2.toFixed(3) + " \u00D7 " + molarityCalcV1.toFixed(0) + " / " + molarityCalcC1.toFixed(2) + " = " + (dilutionStockMl).toFixed(2) + " mL", icon: "\uD83E\uDDEE" },
          { step: 2, text: "Place an appropriate initial amount of diluent in the volumetric flask, following the reviewed procedure", icon: "\uD83D\uDCA7" },
          { step: 3, text: "Carefully measure " + (dilutionStockMl).toFixed(2) + " mL of stock solution with a pipette", icon: "\uD83E\uDDEA" },
          { step: 4, text: __alloT('stem.titration.add_the_stock_solution_to_the_water_ne', "If the stock is an acid, add acid to water only under the reviewed procedure; this rule is not a substitute for the exact SDS/SOP"), icon: "\u26A0\uFE0F" },
          { step: 5, text: "Mix safely, allow the solution to return to calibration temperature if it warmed, then add diluent to the " + molarityCalcV1.toFixed(0) + " mL mark", icon: "\uD83C\uDFAF" },
          { step: 6, text: __alloT('stem.titration.stopper_and_invert_10_times_to_mix_tho', "Stopper and invert 10 times to mix thoroughly"), icon: "\uD83D\uDD04" }
        ].map(function(s) {
          return React.createElement("div", { key: s.step, className: "flex items-start gap-2" },
            React.createElement("span", { className: "text-xs shrink-0" }, s.icon),
            React.createElement("span", { className: "text-[0.6875rem] text-slate-300" },
              React.createElement("span", { className: "font-bold text-white" }, "Step " + s.step + ": "), s.text
            )
          );
        })
      )
    ),

    // Dilution factor
    React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3" },
      React.createElement("div", { className: "rounded-lg px-4 py-2 text-center border border-violet-800/30 bg-violet-950/20" },
        React.createElement("div", { className: "text-[0.6875rem] text-slate-200 font-bold" }, __alloT('stem.titration.dilution_factor', "Dilution Factor")),
        React.createElement("div", { className: "text-sm font-black text-violet-400" }, "1:" + (molarityCalcC1 / dilutionC2).toFixed(1))
      ),
      React.createElement("div", { className: "rounded-lg px-4 py-2 text-center border border-cyan-800/30 bg-cyan-950/20" },
        React.createElement("div", { className: "text-[0.6875rem] text-slate-200 font-bold" }, __alloT('stem.titration.water_to_add', "Diluent")),
        React.createElement("div", { className: "text-sm font-black text-cyan-400" }, "Add to the final mark")
      ),
      React.createElement("div", { className: "rounded-lg px-4 py-2 text-center border border-emerald-800/30 bg-emerald-950/20" },
        React.createElement("div", { className: "text-[0.6875rem] text-slate-200 font-bold" }, __alloT('stem.titration.moles_solute', "Moles Solute")),
        React.createElement("div", { className: "text-sm font-black text-emerald-400" }, (dilutionC2 * molarityCalcV1 / 1000).toExponential(2) + " mol")
      )
    )
  ),

  // ── Snapshot and reference animation (Titrate tab only) ──
  labTab === 'titrate' && React.createElement("div", { className: "space-y-4" },
    React.createElement("div", { className: "flex justify-end" },
      React.createElement("button", { type: "button", "aria-label": __alloT('stem.titration.save_titration_snapshot', "Save titration snapshot"),
        onClick: function () {
          if (typeof setToolSnapshots === 'function') {
            setToolSnapshots(function (prev) {
              return prev.concat([{
                id: 'titr-' + Date.now(), tool: 'titrationLab', label: __alloT('stem.titration.titration_lab', 'Titration Lab'),
                data: Object.assign({ presetId: presetId, indicator: indicatorId, volumeAdded: volumeAdded, pH: currentPH },
                  isPotentiometric ? { cellPotentialV: currentY } : null),
                timestamp: Date.now()
              }]);
            });
            if (addToast) addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
          }
        },
        className: "min-h-[44px] px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-700 to-blue-600 rounded-full hover:from-cyan-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      }, __alloT('stem.titration.snapshot', "\uD83D\uDCF8 Snapshot"))
    ),

    React.createElement("figure", { className: "rounded-2xl border border-emerald-800/40 bg-slate-900/40 p-3", "aria-labelledby": "titration-animation-title" },
      React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-3 mb-2" },
        React.createElement("div", { className: "flex items-center gap-2" },
          React.createElement("span", { className: "text-lg", "aria-hidden": true }, "\uD83E\uDDEB"),
          React.createElement("div", null,
            React.createElement("h4", { id: "titration-animation-title", className: "text-sm font-bold text-emerald-400" }, __alloT('stem.titration.titration_curve_finding_the_equivalenc', "How a strong-acid/strong-base curve develops")),
            React.createElement("p", { className: "text-xs text-slate-400" }, __alloT('stem.titration.strong_acid_strong_base_ph_meter_shows', "Fixed reference example \u00B7 the interactive curve above reflects your selected preset"))
          )
        ),
        React.createElement("button", { type: "button", "aria-pressed": titrationAnimPaused,
          "aria-label": titrationAnimPaused ? "Play reference curve animation" : "Pause reference curve animation",
          onClick: function(event) {
            var nextPaused = !titrationAnimPaused;
            upd('titrationAnimPaused', nextPaused);
            var instance = event.currentTarget && event.currentTarget.closest('[data-titration-instance]');
            var animCanvas = instance && instance.querySelector('[data-titration-anim="true"]');
            if (animCanvas && typeof animCanvas._ttSetPaused === 'function') animCanvas._ttSetPaused(nextPaused);
          },
          className: "min-h-[44px] px-3 py-2 rounded-lg border border-emerald-700 bg-emerald-950/40 text-xs font-bold text-emerald-200 hover:bg-emerald-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        }, titrationAnimPaused ? "\u25B6 Play animation" : "\u23F8 Pause animation")
      ),
      React.createElement("div", { className: "aspect-[4/3] sm:aspect-[16/6] rounded-xl overflow-hidden border border-emerald-700/50", style: { background: '#020210' } },
        React.createElement("canvas", {
          'data-titration-anim': 'true',
          'data-titration-paused': titrationAnimPaused ? 'true' : 'false',
          role: 'img',
          'aria-label': 'Animated reference curve showing pH versus titrant volume for a strong acid titrated by a strong base.',
          'aria-describedby': 'titration-animation-caption',
          ref: titrAnimCanvasRef,
          style: { width: '100%', height: '100%', display: 'block' }
        })
      ),
      React.createElement("figcaption", { id: "titration-animation-caption", className: "mt-3 text-xs leading-relaxed text-slate-300" },
        "As base is added, pH rises slowly, changes steeply near the balanced stoichiometric ratio, and then levels in excess base. The equivalence point is defined by reaction stoichiometry; the endpoint is the observed indicator signal used to estimate it."
      )
    )
  ),

  // ══════════════════════════════════════════════
  // BUFFER DISCOVERY TAB (Cycle 17 — H7b'' validated)
  // ══════════════════════════════════════════════
  labTab === 'buffers' && (function() {
    var bf = normalizeBufferState(typeof d !== 'undefined' && d ? d.buffers : null);
    function setBF(patch) { if (typeof upd === 'function') upd('buffers', Object.assign({}, bf, patch)); }
    // Henderson-Hasselbalch: pH = pKa + log([A-]/[HA]) — buffer best near pKa with 0.1<ratio<10
    var pKa = -Math.log10(bf.ka);
    var totalConc = 1.0;
    var deltaAcid = 0.2 * totalConc;
    // Shared with the tests; see bufferAfterStrongAcid for why H-H alone was not enough.
    var bfRes = bufferAfterStrongAcid(bf.ka, bf.ratio, totalConc, deltaAcid);
    var pHcurrent = bfRes.pHBefore;
    var pHafter = bfRes.pHAfter;
    var pHshift = Math.abs(pHafter - pHcurrent);
    // Discrete outcome: good buffer (<1.0 unit shift), poor buffer (>=1.0 unit shift)
    var isGood = pHshift < 1.0;
    var outcomeMeta = isGood
      ? { label: __alloT('stem.titration.good_buffer', '🛡️ GOOD BUFFER'), desc: 'pH shifted only ' + pHshift.toFixed(2) + ' units after 20% more acid. Buffer is holding.', color: '#6ee7b7', bg: 'rgba(6,78,59,0.55)', border: 'rgba(16,185,129,0.55)', mark: '#34d399' }
      : { label: __alloT('stem.titration.poor_buffer', '💥 POOR BUFFER'),
          // Naming exhaustion matters: "overwhelmed" and "ran out of A⁻ entirely" are
          // different failures, and only the second one leaves free strong acid behind.
          desc: 'pH shifted ' + pHshift.toFixed(2) + ' units — ' + (bfRes.exhausted
            ? 'the A⁻ ran out completely, so the leftover strong acid now sets the pH. There is no buffer left.'
            : 'buffer overwhelmed. Use different conditions.'),
          color: '#fca5a5', bg: 'rgba(127,29,29,0.45)', border: 'rgba(248,113,113,0.55)', mark: '#f87171' };
    function logObs() {
      var obs = { pKa: parseFloat(pKa.toFixed(2)), ratio: parseFloat(bf.ratio.toFixed(2)), pH: parseFloat(pHcurrent.toFixed(2)), shift: parseFloat(pHshift.toFixed(2)), good: isGood };
      setBF({ log: (bf.log || []).concat([obs]).slice(-8) });
    }
    return React.createElement('div', { className: 'rounded-2xl p-5 border space-y-4', style: Object.assign({}, glass, { background: 'rgba(3,30,40,0.85)', borderColor: 'rgba(8,145,178,0.3)' }) },
      React.createElement('h3', { className: 'text-sm font-black text-cyan-400 mb-1' }, __alloT('stem.titration.buffer_strength_discovery', '🛡️ Buffer strength discovery')),
      React.createElement('p', { className: 'text-[0.75rem] text-slate-300 mb-3 leading-relaxed' },
        __alloT('stem.titration.three_sliders_weak_acid_strength_ka_bu', 'Two sliders you control — weak acid strength (Ka) and buffer ratio [A⁻]/[HA]; the starting pH below them is a readout, not a control. The simulation tells you whether the buffer HOLDS or FAILS after adding 20% more acid (discrete outcome — no numeric "buffer score"). Sweep the sliders. Log observations. Type what you discover about what makes a good buffer.')),
      React.createElement('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', className: 'mb-3 p-3 rounded-lg text-center', style: { background: outcomeMeta.bg, border: '2px solid ' + outcomeMeta.border } },
        React.createElement('div', { className: 'text-base font-black mb-1', style: { color: outcomeMeta.color } }, outcomeMeta.label),
        React.createElement('div', { className: 'text-[0.6875rem] text-slate-200' }, outcomeMeta.desc)
      ),
      (function () {
        var X = function (p) { return 40 + (Math.max(0, Math.min(14, p)) / 14) * 480; };
        var xBefore = X(pHcurrent), xAfter = X(pHafter), xKa = X(pKa);
        // A good buffer barely moves, so the two readings sit almost on top of each
        // other and their labels collided into unreadable overlap. Flank the bar
        // instead: lower reading to the left of it, higher to the right, and fall back
        // to stacking only when the pair is pinned against an end of the scale.
        function label(x, other, value, fill, key) {
          var left = x <= other, edge = left ? x - 11 < 44 : x + 11 > 516;
          return React.createElement('text', {
            key: key, x: edge ? x : (left ? x - 11 : x + 11), y: edge ? 30 : 48,
            fill: fill, fontSize: 12, fontWeight: 'bold',
            textAnchor: edge ? 'middle' : (left ? 'end' : 'start')
          }, value.toFixed(2));
        }
        // Literal hex throughout: SVG presentation attributes do not resolve var().
        var ticks = [];
        for (var tp = 0; tp <= 14; tp += 2) {
          ticks.push(React.createElement('g', { key: 'tk' + tp },
            React.createElement('line', { x1: X(tp), y1: 66, x2: X(tp), y2: 72, stroke: '#64748b', strokeWidth: 1 }),
            React.createElement('text', { x: X(tp), y: 86, fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' }, String(tp))));
        }
        return React.createElement('svg', {
          viewBox: '0 0 560 96', className: 'w-full h-auto mb-3', preserveAspectRatio: 'xMidYMid meet',
          // Uncapped, a 560-unit viewBox stretched across the panel and blew the 11 px
          // labels up to nearly 20 px.
          style: { maxWidth: '640px', margin: '0 auto', display: 'block' },
          role: 'img', 'aria-label': outcomeMeta.label + '. ' + outcomeMeta.desc
        },
          React.createElement('rect', { x: 0, y: 0, width: 560, height: 96, fill: '#0b2030', rx: 10 }),
          React.createElement('rect', { x: X(pKa - 1), y: 20, width: Math.max(0, X(pKa + 1) - X(pKa - 1)), height: 46,
            fill: '#0891b2', fillOpacity: 0.22, stroke: '#22d3ee', strokeOpacity: 0.45, strokeWidth: 1 }),
          React.createElement('text', { x: xKa, y: 16, fill: '#67e8f9', fontSize: 11, textAnchor: 'middle' }, 'pKa \u00B1 1'),
          React.createElement('line', { x1: xKa, y1: 20, x2: xKa, y2: 66, stroke: '#22d3ee', strokeWidth: 1.5, strokeDasharray: '4 3' }),
          React.createElement('line', { x1: 40, y1: 66, x2: 520, y2: 66, stroke: '#94a3b8', strokeWidth: 1.5 }),
          ticks,
          React.createElement('text', { x: 8, y: 70, fill: '#cbd5e1', fontSize: 12, fontWeight: 'bold' }, 'pH'),
          React.createElement('line', { x1: xBefore, y1: 44, x2: xAfter, y2: 44,
            stroke: outcomeMeta.mark, strokeWidth: 5, strokeLinecap: 'round' }),
          React.createElement('circle', { cx: xBefore, cy: 44, r: 7, fill: '#e2e8f0', stroke: '#0b2030', strokeWidth: 2 }),
          React.createElement('circle', { cx: xAfter, cy: 44, r: 7, fill: outcomeMeta.mark, stroke: '#0b2030', strokeWidth: 2 }),
          label(xBefore, xAfter, pHcurrent, '#e2e8f0', 'lb'),
          label(xAfter, xBefore, pHafter, outcomeMeta.mark, 'la')
        );
      })(),
      React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3 mb-3' },
        [
          { key: 'ka', label: __alloT('stem.titration.acid_strength_pka', 'Acid strength (pKa)'), val: pKa, displayVal: pKa.toFixed(2), min: 2, max: 12, step: 0.1, onChange: function(v) { setBF({ ka: Math.pow(10, -v) }); } },
          { key: 'ratio', label: __alloT('stem.titration.a_ha_ratio', '[A⁻]/[HA] ratio'), val: bf.ratio, displayVal: bf.ratio.toFixed(2), min: 0.05, max: 20, step: 0.05, onChange: function(v) { setBF({ ratio: v }); } },
          { key: 'startPH', label: __alloT('stem.titration.starting_ph_display_only', 'Starting pH (display only)'), val: pHcurrent, displayVal: pHcurrent.toFixed(2), min: 0, max: 14, step: 0.1, onChange: function(v) {}, readOnly: true }
        ].map(function(s) {
          return React.createElement('div', { key: s.key },
            React.createElement('label', { htmlFor: 'bf-' + s.key, className: 'block text-[0.6875rem] font-bold text-slate-300 mb-1' },
              s.label + ': ', React.createElement('span', { className: 'font-mono text-cyan-400' }, s.displayVal)),
            s.readOnly
              ? React.createElement('output', { id: 'bf-' + s.key, className: 'block min-h-[44px] rounded-lg border border-cyan-800/40 bg-slate-900 px-3 py-2 text-base font-mono font-bold text-cyan-300', 'aria-label': s.label }, s.displayVal)
              : React.createElement('input', { id: 'bf-' + s.key, type: 'range', min: s.min, max: s.max, step: s.step, value: s.val,
                  onChange: function(e) { s.onChange(parseFloat(e.target.value)); },
                  className: 'w-full min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 rounded', 'aria-label': s.label }));
        })
      ),
      React.createElement('div', { className: 'flex gap-2 items-center mb-3 flex-wrap' },
        React.createElement('button', { type: 'button', onClick: logObs, className: 'min-h-[44px] transition-colors px-3 py-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 bg-slate-700 hover:bg-slate-600 text-[0.6875rem] font-bold text-slate-200 border border-slate-600 active:scale-[0.97]' }, __alloT('stem.titration.log_observation', '📋 Log observation')),
        React.createElement('button', { type: 'button', onClick: function() { setBF({ ka: 1e-5, ratio: 1.0, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); },
          className: 'min-h-[44px] transition-colors px-3 py-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 bg-slate-800 hover:bg-slate-700 text-[0.6875rem] font-semibold text-slate-300 border border-slate-600 active:scale-[0.97]' }, __alloT('stem.titration.reset_2', '↺ Reset')),
        (bf.log || []).length > 0 && React.createElement('span', { className: 'text-[0.625rem] text-slate-400 italic' }, (bf.log || []).length + ' observations logged')
      ),
      (bf.log || []).length > 0 && React.createElement('div', { className: 'mb-3 overflow-x-auto' },
        React.createElement('table', { className: 'text-xs w-full min-w-[520px] border-collapse text-slate-300', 'aria-label': 'Buffer observations' },
          React.createElement('caption', { className: 'sr-only' }, 'Logged buffer observations'),
          React.createElement('thead', null, React.createElement('tr', { className: 'bg-slate-800' },
            ['pKa', '[A⁻]/[HA]', 'starting pH', 'pH shift', 'outcome'].map(function(c, i) {
              return React.createElement('th', { key: 'h' + i, scope: 'col', className: 'px-2 py-1 border border-slate-700 text-left' }, c);
            }))),
          React.createElement('tbody', null, bf.log.map(function(o, idx) {
            var rowBg = o.good ? 'rgba(16,185,129,0.10)' : 'rgba(220,38,38,0.10)';
            return React.createElement('tr', { key: 'lr' + idx, style: { background: rowBg } },
              React.createElement('td', { className: 'px-2 py-1 border border-slate-700 font-mono' }, o.pKa),
              React.createElement('td', { className: 'px-2 py-1 border border-slate-700 font-mono' }, o.ratio),
              React.createElement('td', { className: 'px-2 py-1 border border-slate-700 font-mono' }, o.pH),
              React.createElement('td', { className: 'px-2 py-1 border border-slate-700 font-mono' }, o.shift),
              React.createElement('td', { className: 'px-2 py-1 border border-slate-700' }, o.good ? 'GOOD' : 'POOR'));
          })))
      ),
      React.createElement('div', { className: 'mb-3' },
        React.createElement('label', { htmlFor: 'bf-hypo', className: 'block text-[0.6875rem] font-bold text-slate-300 mb-1' },
          __alloT('stem.titration.your_hypothesis_free_text_no_right_ans', 'Your hypothesis (free text — no right answer):')),
        React.createElement('textarea', { id: 'bf-hypo', value: bf.hypothesis || '',
          onChange: function(e) { setBF({ hypothesis: e.target.value }); },
          placeholder: __alloT('stem.titration.what_single_condition_makes_the_differ', 'What single condition makes the difference between GOOD and POOR? Does ratio matter more than pKa? Does the starting pH matter at all? Type your own theory.'),
          className: 'w-full text-[0.75rem] border border-slate-500 rounded p-2 font-mono leading-snug bg-slate-900 text-slate-200', rows: 3 })
      ),
      React.createElement('div', { className: 'mb-3' },
        !bf.stuckRevealed && React.createElement('button', { type: 'button', onClick: function() { setBF({ stuckRevealed: true }); },
          className: 'min-h-[44px] transition-colors px-3 py-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 bg-amber-900/30 hover:bg-amber-800/40 text-[0.6875rem] font-bold text-amber-300 border border-amber-700 active:scale-[0.97]' },
          __alloT('stem.titration.i_m_stuck_show_me_questions_to_think_a', '🤔 I\'m stuck — show me questions to think about (no answers)')),
        bf.stuckRevealed && React.createElement('div', { className: 'p-3 rounded bg-amber-900/20 border border-amber-700 text-[0.6875rem] text-slate-300 leading-relaxed' },
          React.createElement('div', { className: 'font-bold text-amber-300 mb-1' }, __alloT('stem.titration.open_questions_investigate_by_manipula', 'Open questions — investigate by manipulating:')),
          React.createElement('ul', { className: 'list-disc pl-5 space-y-1' },
            React.createElement('li', null, __alloT('stem.titration.fix_ratio_at_1_0_sweep_pka_from_2_to_1', 'Fix ratio at 1.0. Sweep pKa from 2 to 12. Are some pKa values just inherently better buffers? Why might that be?')),
            React.createElement('li', null, __alloT('stem.titration.set_pka_4_74_acetic_acid_sweep_ratio_f', 'Set pKa = 4.74 (acetic acid). Sweep ratio from 0.05 to 20. At which ratios does the buffer hold? Is there a symmetric "good band"?')),
            React.createElement('li', null, __alloT('stem.titration.find_one_good_buffer_then_change_one_s', 'Find one GOOD buffer. Then change ONE slider until it becomes POOR. Which single change was most efficient?')),
            React.createElement('li', null, __alloT('stem.titration.log_4_5_good_buffers_with_different_pk', 'Log 4-5 GOOD buffers with different pKa values. What do their starting pH values have in common with their pKa?')),
            React.createElement('li', null, __alloT('stem.titration.in_real_biochemistry_blood_is_buffered', 'In real biochemistry, blood is buffered at pH 7.4 — what pKa would be ideal for that buffer system? Investigate by looking up phosphate and bicarbonate buffers.'))),
          React.createElement('div', { className: 'text-[0.625rem] italic text-amber-400 mt-2' }, __alloT('stem.titration.no_answers_will_be_revealed_investigat', 'No answers will be revealed. Investigate.')))
      ),
      React.createElement('div', { className: 'p-3 rounded bg-emerald-900/20 border border-emerald-700' },
        React.createElement('div', { className: 'flex items-center gap-2 mb-2' },
          React.createElement('input', { type: 'checkbox', id: 'bf-und', checked: !!bf.understood, onChange: function(e) { setBF({ understood: e.target.checked }); }, className: 'w-6 h-6' }),
          React.createElement('label', { htmlFor: 'bf-und', className: 'text-[0.75rem] font-bold text-emerald-300 cursor-pointer' },
            __alloT('stem.titration.i_think_i_understand_the_trade_offs_le', 'I think I understand the trade-offs — let me explain them in my own words'))),
        // A placeholder is not an accessible name: it vanishes the moment the student
        // starts typing, so anyone relying on the accessible name loses the prompt
        // exactly when they need it. The visible label is bound with htmlFor.
        bf.understood && React.createElement('label', {
          htmlFor: 'bf-explain', className: 'block text-[0.6875rem] font-bold text-emerald-300 mb-1'
        }, __alloT('stem.titration.explain_label', 'Your explanation')),
        bf.understood && React.createElement('textarea', { id: 'bf-explain', value: bf.explanation || '',
          onChange: function(e) { setBF({ explanation: e.target.value }); },
          placeholder: __alloT('stem.titration.explain_in_your_own_words_what_is_the_', 'Explain in your own words: what is the relationship between pKa, ratio, and starting pH? What single condition (or combination) makes a buffer hold against more acid? Why does ratio range matter?'),
          className: 'w-full text-[0.75rem] border border-emerald-700 rounded p-2 font-mono leading-snug bg-slate-900 text-slate-200', rows: 4 }),
        bf.understood && (bf.explanation || '').trim().length >= 40 && React.createElement('div', { className: 'mt-2 text-[0.625rem] italic text-emerald-400' },
          __alloT('stem.titration.saved_notice_nobody_checked_your_answe', '✓ Saved. Notice — nobody checked your answer. That is what learner-driven inquiry looks like.'))
      ),
      React.createElement('div', { className: 'mt-3 p-2 rounded bg-slate-900 border border-slate-700 text-[0.625rem] italic text-slate-400' },
        __alloT('stem.titration.design_note_no_buffer_capacity_score_n', 'Design note: no buffer-capacity score, no reveal button, no quiz validation. Outcome is shown as a discrete 2-state marker (GOOD / POOR), not a continuous gradient — by design, to discourage optimization-gaming behavior. The point is the inquiry, not the number.'))
    );
  })()
  )

);
  }
});
