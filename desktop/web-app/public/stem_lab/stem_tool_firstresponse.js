// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// ═══════════════════════════════════════════
// stem_tool_firstresponse.js — First Response Lab
// Educational medical-emergency recognition + response training.
// Lane A spine: hands-only CPR / AED / Stop the Bleed / choking / stroke / seizure /
// anaphylaxis / diabetic + 911 / text-to-911 / mental-health crisis routing.
// Lane C threaded: disability-affirming peer response (deaf/HoH, autistic peer,
// epilepsy as identity, diabetic behavior changes, hidden-disability disclosure).
// All clinical numbers cite AHA / Red Cross / Stop the Bleed / Epilepsy Foundation /
// SAMHSA / NAMI / ASAN. Educational only — get certified at redcross.org or heart.org.
// In a real emergency: call 911 (or text 911 in Maine).
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('firstResponse'))) {

(function() {
  'use strict';

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-live-firstresponse')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-firstresponse';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
    // Assertive channel for time-sensitive coaching ("Begin compressions now")
    if (!document.getElementById('allo-live-firstresponse-assert')) {
      var lr2 = document.createElement('div');
      lr2.id = 'allo-live-firstresponse-assert';
      lr2.setAttribute('aria-live', 'assertive');
      lr2.setAttribute('aria-atomic', 'true');
      lr2.setAttribute('role', 'alert');
      lr2.className = 'sr-only';
      lr2.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
      document.body.appendChild(lr2);
    }
  })();

  // ── Focus-visible outline (WCAG 2.4.7) ──
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-fr-focus-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-fr-focus-css';
    st.textContent = '[data-fr-focusable]:focus-visible{outline:3px solid #fbbf24!important;outline-offset:2px!important;border-radius:6px}';
    if (document.head) document.head.appendChild(st);
  })();

  // ─────────────────────────────────────────────────────────
  // BODY POSITION IN 3D — compression placement + recovery position
  //
  // The existing CPR module teaches RATE with a rhythm trainer. Rate is the
  // easy half. The half a flat diagram teaches worst is WHERE your hands go on
  // a real chest and WHAT the recovery position actually looks like as a
  // three-dimensional shape. That is what this module is for.
  //
  // One learning path remains suitable for a lay
  // rescuer, hands-only. This is orientation and practice — it is NOT
  // A trained path covers adult/child/infant 30:2 sequence practice.
  // certification, and it does not replace a hands-on course with a manikin,
  // where an instructor can feel whether your depth is real.
  //
  // Guidance reflected here follows current widely-taught lay-rescuer teaching
  // (American Heart Association / Red Cross, consistent with ERC):
  //   · centre of the chest, lower half of the breastbone
  //   · at least 2 inches / 5 cm, and not more than about 2.4 inches / 6 cm
  //   · 100-120 per minute, full recoil, minimise interruptions
  // Numbers are given with both units because students meet both.
  // ─────────────────────────────────────────────────────────

  // Click zones on the torso. Coordinates are normalised (-1..1 across the
  // chest, 0 at the sternal notch down to 1 at the navel) so the 3D pick and
  // the 2D fallback grid can share one verdict function.
  var CPR_ZONES = [
    { id: 'correct', verdict: 'correct', label: 'Centre of the chest, lower half of the breastbone',
      why: 'This is the target. Heel of one hand here, the other hand on top, fingers interlaced, shoulders stacked directly above your hands and arms locked straight so the push comes from your body weight, not your arms.' },
    { id: 'high', verdict: 'poor', label: 'Too high — upper breastbone',
      why: 'Up here you are over the top of the breastbone and the collarbones. Compressions are much less effective because you are not squeezing the heart between the breastbone and the spine. Slide down to the centre of the chest.' },
    { id: 'low', verdict: 'harm', label: 'Too low — over the xiphoid process',
      why: 'That small pointed tip at the bottom of the breastbone is the xiphoid process. Compressing on it risks driving it into the organs underneath. Move up to the lower half of the breastbone, not the very bottom.' },
    { id: 'side', verdict: 'harm', label: 'Off to the side — over the ribs',
      why: 'Off-centre compressions land on ribs rather than the breastbone. That both wastes force and raises the risk of injury. Find the centre line of the chest.' },
    { id: 'belly', verdict: 'harm', label: 'Too low — on the abdomen',
      why: 'This is below the ribcage entirely. Compressions here do nothing for circulation and can injure the liver and stomach.' }
  ];

  // Depth and recoil — the two mechanics students get wrong after placement.
  var CPR_MECHANICS = [
    { id: 'shallow', label: 'Shallow — about an inch', verdict: 'poor',
      why: 'The most common real-world error, and it is understandable: pushing hard on a person feels wrong. But shallow compressions do not move enough blood. Adult depth is at least 2 inches (5 cm).' },
    { id: 'right', label: 'At least 2 inches (5 cm), not more than about 2.4 inches (6 cm)', verdict: 'correct',
      why: 'This is the target range for an adult. Push hard, push fast, and let the chest come all the way back up between compressions. Ribs sometimes crack during effective CPR — that is not a reason to stop.' },
    { id: 'toodeep', label: 'As deep as you possibly can', verdict: 'poor',
      why: 'There is an upper bound — beyond roughly 2.4 inches (6 cm) the added depth stops helping and injury risk rises. "Push hard" is not the same as "push without limit."' },
    { id: 'lean', label: 'Correct depth, but resting your weight between pushes', verdict: 'poor',
      why: 'Leaning is easy to do when you are tired and it quietly undoes your work. The chest has to recoil FULLY so the heart can refill before the next compression. Come all the way up without lifting your hands off the chest.' }
  ];

  // Short, screen-based rehearsal target. It deliberately scores timing and
  // sequence only; a real manikin and instructor are still required to assess
  // depth, hand force, airway seal or ventilation volume.
  // Radians the head pivots back at a FULL adult head-tilt in the 3D figure.
  // Each age scales this by its own airwayTilt, so the difference between an
  // adult tilt and an infant's neutral position is visible in the model rather
  // than only stated in text.
  var AIRWAY_TILT_MAX = 0.38;
  // The recovery position's own airway step. Gentler than a CPR head-tilt (the
  // step says "gently"), plus an extra turn about the body's long axis so the
  // mouth ends up pointing at the mat. The drainage angle is the entire reason
  // the position exists, so it has to be visible and not merely described.
  var RECOVERY_HEAD_TILT = 0.30;
  var RECOVERY_MOUTH_DOWN = 0.38;
  // How far below horizontal the squared top thigh points, in radians.
  var STABLE_THIGH_ANGLE = 0.61;

  var CPR_COACH_SPEC = {
    compressionsPerCycle: 30,
    breathsPerCycle: 2,
    practiceCycles: 2,
    minBpm: 100,
    maxBpm: 120,
    breathLockMs: 1500
  };

  // Pure so the timing logic can be regression-tested without a clock or DOM.
  // The recorder handles input bounce; every accepted interval remains in the
  // score so a very fast tap or a long pause cannot disappear from the result.
  function analyzeCprTiming(intervals) {
    var clean = (intervals || []).filter(function (ms) {
      return typeof ms === 'number' && isFinite(ms) && ms >= 180 && ms <= 60000;
    });
    if (!clean.length) return { medianBpm: 0, inRangePct: 0, consistencyPct: 0, sampleCount: 0 };
    var sorted = clean.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    var medianMs = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    var targetMinMs = 60000 / CPR_COACH_SPEC.maxBpm;
    var targetMaxMs = 60000 / CPR_COACH_SPEC.minBpm;
    var inRange = clean.filter(function (ms) { return ms >= targetMinMs && ms <= targetMaxMs; }).length;
    var mean = clean.reduce(function (sum, ms) { return sum + ms; }, 0) / clean.length;
    var variance = clean.reduce(function (sum, ms) {
      var delta = ms - mean;
      return sum + delta * delta;
    }, 0) / clean.length;
    var coefficient = mean ? Math.sqrt(variance) / mean : 1;
    return {
      medianBpm: Math.round(60000 / medianMs),
      inRangePct: Math.round((inRange / clean.length) * 100),
      consistencyPct: Math.max(0, Math.min(100, Math.round(100 - coefficient * 240))),
      sampleCount: clean.length
    };
  }

  // The gate that matters more than any of the above.
  // ── Practice-window scoring ──────────────────────────────────────────────
  // The Practice tab used to score its 30-second window by averaging over the
  // span between the FIRST and the LAST tap. A learner who compressed well for
  // eight seconds and then stopped for twenty-two still read "110 bpm, in
  // range" and earned the badge, because the twenty-two seconds of nothing were
  // outside the span being measured. Interruptions are the half that kills:
  // AHA asks for a chest compression fraction of at least 60% and for pauses
  // under 10 seconds, and a bystander's real failure mode is stopping, not
  // pushing at 96 bpm.
  //
  // Rate and consistency are delegated to analyzeCprTiming so the Practice tab
  // and the 3D coach return ONE verdict from ONE derivation; what is added here
  // is the pair of numbers neither of them had — the longest hands-off pause
  // and the compression fraction.
  //
  // ★ Steadiness has to be scored too, because a MEDIAN can sit in the band
  // while not one compression did. Alternating 400 ms / 700 ms over the full
  // window reads as 109 bpm with a 99% compression fraction and no pause — and
  // 0% of those intervals were inside 100–120. Consistency (dispersion) is the
  // right measure here rather than in-band share: a learner holding a steady
  // 100 bpm sits on the band edge, so half their jitter falls outside it
  // (in-range 68%) while their consistency is 92. The alternator scores 35.
  var CPR_PRACTICE_SPEC = {
    windowSec: 30,
    maxPauseMs: 10000,     // AHA: keep any interruption under 10 seconds
    warnPauseMs: 5000,     // the on-screen hands-off warning fires earlier
    minFractionPct: 60,    // AHA: chest compression fraction at or above 60%
    minConsistencyPct: 60, // below this the rate is an average, not a rhythm
    minCompressions: 10    // below this there is no rhythm to judge
  };

  // Pure: no clock, no DOM. `endMs` is the end of the window being scored —
  // "now" while the run is live, start + 30s once it has finished.
  function analyzeCprPractice(taps, startMs, endMs) {
    var list = (taps || []).filter(function (t) {
      return typeof t === 'number' && isFinite(t);
    }).slice().sort(function (a, b) { return a - b; });
    var windowMs = Math.max(0, (endMs || 0) - (startMs || 0));
    var intervals = [];
    for (var i = 1; i < list.length; i++) intervals.push(list[i] - list[i - 1]);
    var timing = analyzeCprTiming(intervals);

    // Hands-off gaps are measured against the WHOLE window, not the tap span:
    // the silence before the first compression and the silence after the last
    // one are interruptions too, and they are exactly the two a span average
    // erases.
    var gaps = intervals.slice();
    if (windowMs > 0) {
      gaps.push(list.length ? Math.max(0, list[0] - startMs) : windowMs);
      if (list.length) gaps.push(Math.max(0, (startMs + windowMs) - list[list.length - 1]));
    }
    var longestPauseMs = gaps.reduce(function (m, g) { return g > m ? g : m; }, 0);

    // Compression fraction: the share of the window covered by intervals short
    // enough to still count as continuous compressions.
    var covered = 0;
    for (var j = 0; j < intervals.length; j++) {
      if (intervals[j] <= CPR_PRACTICE_SPEC.maxPauseMs) covered += intervals[j];
    }
    var fractionPct = windowMs > 0 ? Math.round(Math.min(100, (covered / windowMs) * 100)) : 0;

    var enough = list.length >= CPR_PRACTICE_SPEC.minCompressions;
    var rateOk = timing.medianBpm >= CPR_COACH_SPEC.minBpm && timing.medianBpm <= CPR_COACH_SPEC.maxBpm;
    var pauseOk = longestPauseMs < CPR_PRACTICE_SPEC.maxPauseMs;
    var fractionOk = fractionPct >= CPR_PRACTICE_SPEC.minFractionPct;
    // A single interval has zero spread, so consistency reads 100 after two
    // taps. Do not call a rhythm steady before there is a rhythm.
    var steadyOk = enough && timing.consistencyPct >= CPR_PRACTICE_SPEC.minConsistencyPct;
    return {
      medianBpm: timing.medianBpm,
      inRangePct: timing.inRangePct,
      consistencyPct: timing.consistencyPct,
      compressions: list.length,
      longestPauseMs: longestPauseMs,
      fractionPct: fractionPct,
      rateOk: rateOk,
      pauseOk: pauseOk,
      fractionOk: fractionOk,
      steadyOk: steadyOk,
      enoughData: enough,
      passed: rateOk && pauseOk && fractionOk && steadyOk && enough
    };
  }

  var BREATHING_GATE = [
    { id: 'notbreathing', label: 'Not breathing, or only occasional gasps', action: 'cpr', correct: true,
      why: 'Those irregular gasps are called agonal breathing and they are a sign of cardiac arrest, not of recovery. People lose lives because a bystander saw gasping and assumed breathing. Not breathing normally means: call 911 (or send someone), get an AED, start compressions.' },
    { id: 'breathing', label: 'Breathing normally, but will not wake up', action: 'recovery', correct: true,
      why: 'Someone unresponsive but breathing normally needs their airway protected, not compressions. Recovery position, keep watching their breathing, and be ready to start CPR if it stops or turns to gasping.' }
  ];

  var RECOVERY_STEPS = [
    { id: 'check', icon: '👂', label: 'Confirm they are breathing normally and call for help',
      why: 'The recovery position is only for someone unresponsive who IS breathing normally. Confirm first, and get emergency services coming either way.' },
    { id: 'arm', icon: '💪', label: 'Place the near arm out at a right angle, palm up',
      why: 'This arm stays put and stops them rolling too far onto their front.' },
    { id: 'hand', icon: '🤚', label: 'Bring the far hand across to their cheek and hold it there',
      why: 'The back of their hand cushions the head as it turns, and holding it keeps the head supported through the roll.' },
    { id: 'knee', icon: '🦵', label: 'Bend the far knee up, foot flat on the ground',
      why: 'That bent leg is the lever you will pull on. It does the work so you are not hauling on their body.' },
    { id: 'roll', icon: '🔄', label: 'Pull on the bent knee to roll them towards you onto their side',
      why: 'Towards you, so they cannot roll away from you and end up face down. Keep supporting the head with their own hand as they turn.' },
    { id: 'airway', icon: '🫁', label: 'Tilt the head back gently and point the mouth slightly down',
      why: 'The head tilt opens the airway; the downward angle lets fluid drain out of the mouth instead of into the lungs. This is the whole reason the position exists.' },
    { id: 'stable', icon: '⚖️', label: 'Adjust the top leg so the hip and knee are bent at right angles',
      why: 'That is what stops them rolling onto their front once you let go.' },
    { id: 'watch', icon: '👀', label: 'Keep watching their breathing until help arrives',
      why: 'This is not a finished job. If breathing stops or turns into gasping, roll them onto their back and start compressions immediately.' }
  ];

  // Never correct, at any point in this module.
  var BODY_HAZARDS = [
    { id: 'compressbreathing', icon: '⛔', label: 'Start compressions on someone who is breathing normally',
      why: 'Compressions on a breathing person can cause real injury and do not help. Breathing normally but unresponsive means recovery position and close monitoring — not CPR.' },
    { id: 'spine', icon: '⛔', label: 'Roll them despite a suspected neck or spinal injury, with no other reason to move them',
      why: 'If you suspect a spinal injury and they are breathing, the general guidance is to leave them as they are and keep the airway open, unless staying put is itself dangerous. If they are NOT breathing normally, that overrides everything: an airway and circulation come first.' },
    { id: 'delay', icon: '⛔', label: 'Look for a pulse first and only start once you are sure',
      why: 'Lay rescuers are not expected to check for a pulse, and hunting for one wastes the minutes that matter most. Unresponsive and not breathing normally is enough to start.' }
  ];

  // ── Age variants ──────────────────────────────────────────────────────────
  // Adult technique is not simply "smaller" for a child or an infant — the
  // hands change, the depth changes, and the reason arrest happened usually
  // changes too. A teen who babysits is far more likely to meet an infant
  // emergency than an adult one, so leaving this at adult-only was a real gap.
  //
  // Depths follow AHA/AAP 2025: roughly one third of the depth of the chest in
  // every case, which works out at about 5 cm for an adult and a child and
  // about 4 cm for an infant. (The existing quick-reference in the CPR + AED
  // module had the child figure at 4 cm, matching the infant — corrected.)
  var CPR_AGES = [
    { id: 'adult', icon: '🧍', label: 'Adult', who: 'Puberty and older',
      hands: 'Two hands — heel of one on the breastbone, the other on top, fingers interlaced, arms locked, shoulders stacked over your hands.',
      where: 'Centre of the chest, on the lower half of the breastbone.',
      depth: 'At least 2 inches (5 cm), and no more than about 2.4 inches (6 cm).',
      // Only relevant if you are giving breaths. A breath delivered without
      // opening the airway mostly inflates the stomach, which then brings the
      // stomach contents back up — so the tilt is not decoration, it is what
      // makes the breath reach the lungs.
      airway: 'Head tilt, chin lift: one hand on the forehead tilts the head back, two fingertips under the bony part of the chin lift it up. Tilt well back for an adult.',
      airwayTilt: 1,
      breaths: 'For an adult who collapses suddenly, hands-only CPR is the standard advice for an untrained rescuer, and it works. If you are trained, 30 compressions to 2 breaths.',
      scale: 1 },
    { id: 'child', icon: '🧒', label: 'Child', who: 'About 1 year to puberty',
      hands: 'One hand, or two if one is not enough to reach the depth. Use whatever gets you deep enough on that particular child.',
      where: 'Same place as an adult — centre of the chest, lower half of the breastbone.',
      depth: 'About 2 inches (5 cm) — roughly one third of the depth of the chest.',
      airway: 'Head tilt, chin lift, but less far back than an adult. A child\'s airway is softer and easy to kink if you push past the point where the chest starts to rise.',
      airwayTilt: 0.62,
      breaths: 'Because pediatric arrest is often caused by a breathing problem, conventional CPR with breaths is recommended when you are willing and able. A single rescuer uses 30 compressions to 2 breaths; if a second trained rescuer joins, use 15:2. If you cannot or will not give breaths, compression-only CPR is still far better than nothing.',
      scale: 0.72 },
    { id: 'infant', icon: '👶', label: 'Infant', who: 'Under 1 year (not a newborn)',
      hands: 'Use the heel of one hand on the breastbone, or the two-thumb encircling-hands technique. The older two-finger method is no longer recommended because it often fails to reach adequate depth.',
      where: 'Centre of the chest, just below the nipple line.',
      depth: 'About 1.5 inches (4 cm) — again roughly one third of the depth of the chest.',
      // The one place where copying the adult action makes things WORSE.
      airway: 'Neutral "sniffing" position — head level, chin lifted just clear of the chest. Do NOT tilt an infant\'s head back the way you would an adult: their windpipe is soft and short, and over-extending the neck kinks it shut.',
      airwayTilt: 0.12,
      breaths: 'Infant arrest is usually a breathing problem, so conventional CPR with breaths is recommended when you are willing and able. A single rescuer uses 30:2; if a second trained rescuer joins, use 15:2. Cover the mouth and nose and give only enough air for visible chest rise.',
      scale: 0.46 }
  ];
  // Adult guidance has an explicit 5-6 cm range. Pediatric guidance instead
  // targets about one third of the chest, so the practice choices must change.
  function cprMechanicsForAge(ageId) {
    if (ageId === 'adult') return CPR_MECHANICS;
    var infant = ageId === 'infant';
    var targetLabel = infant
      ? 'About 1.5 inches (4 cm), roughly one third of the chest'
      : 'About 2 inches (5 cm), roughly one third of the chest';
    var targetWhy = infant
      ? 'This is the infant target: about 1.5 inches (4 cm), roughly one third of the chest. Let the chest recoil fully after every compression.'
      : 'This is the child target: about 2 inches (5 cm), roughly one third of the chest. Let the chest recoil fully after every compression.';
    var shallowLabel = infant ? 'Too shallow - only a small chest dip' : 'Too shallow - only about an inch';
    var shallowWhy = infant
      ? 'Shallow compressions do not move enough blood. For an infant, aim for about 1.5 inches (4 cm), roughly one third of the chest.'
      : 'Shallow compressions do not move enough blood. For a child, aim for about 2 inches (5 cm), roughly one third of the chest.';
    var deepLabel = infant ? 'Far beyond one third of the infant chest' : 'Far beyond one third of the child chest';
    var deepWhy = infant
      ? 'Do not chase an adult depth on an infant. Aim for about one third of the chest, around 1.5 inches (4 cm).'
      : 'Do not push without limit. Aim for about one third of the child chest, around 2 inches (5 cm).';
    return [
      { id: 'shallow', label: shallowLabel, verdict: 'poor', why: shallowWhy },
      { id: 'right', label: targetLabel, verdict: 'correct', why: targetWhy },
      { id: 'toodeep', label: deepLabel, verdict: 'poor', why: deepWhy },
      CPR_MECHANICS[3]
    ];
  }

  // ── AED pad placement ─────────────────────────────────────────────────────
  // Genuinely spatial and, until now, one line of text in the CPR + AED
  // walkthrough. The pads themselves carry a picture — this teaches the shape
  // so the picture makes sense under pressure.
  var AED_PADS = [
    { id: 'padUR', verdict: 'correct', label: 'Upper right chest, below the collarbone',
      why: 'One pad goes here, to the right of the breastbone and just under the collarbone. Paired with the lower-left pad it puts the heart between them, which is the whole point — the current has to cross the heart to do anything.' },
    { id: 'padLL', verdict: 'correct', label: 'Lower left side, below the armpit',
      why: 'The second pad goes on the left side of the chest, below and to the outside of the left nipple, over the lower ribs. Diagonally opposite the first one.' },
    { id: 'padTogether', verdict: 'wrong', label: 'Both pads side by side on the upper chest',
      why: 'With the pads close together the current takes the short path between them and largely misses the heart. They have to be diagonally opposite so the heart sits in between.' },
    { id: 'padBelly', verdict: 'wrong', label: 'On the abdomen',
      why: 'Too low to put the heart in the path of the current. Follow the picture printed on the pads themselves.' }
  ];

  // An infant is where this stops being a matter of degree. AED pads do not
  // shrink to fit the patient — an adult pad is the same piece of plastic on a
  // 5 kg chest — so the diagonal front pair that works on an adult ends up with
  // the two pads touching, and pads that touch send the current across the skin
  // between them instead of through the heart. The placement therefore changes
  // SHAPE: one pad on the front, one on the back, heart still in between.
  // This tool already teaches that twice in prose (the AED rules list and the
  // infant scenario, where two front pads is marked unsafe) and the 3D said the
  // opposite until now.
  var AED_PADS_INFANT = [
    { id: 'padFront', verdict: 'correct', label: 'Centre of the chest, on the front',
      why: 'One pad goes in the middle of the chest, over the breastbone. Paired with the pad on the back it puts the heart between them, exactly like the adult diagonal — the shape is different because the chest is small, but the goal has not changed.' },
    { id: 'padBack', verdict: 'correct', label: 'On the back, between the shoulder blades',
      why: 'The second pad goes behind the heart, between the shoulder blades. You have to roll the baby towards you to reach it, which feels wrong the first time and is correct. Front-and-back is the only way two adult pads fit on a chest this size without touching.' },
    { id: 'padTogether', verdict: 'unsafe', label: 'Both pads side by side on the front',
      why: 'They will touch. Pads that touch each other short the current across the skin instead of sending it through the chest, and can burn the baby. On a chest this small, front-and-back is the placement.' },
    { id: 'padBelly', verdict: 'wrong', label: 'On the abdomen',
      why: 'Too low to put the heart in the path of the current, on a baby just as on an adult.' }
  ];
  // An adult or a school-age child has room for the diagonal front pair. An
  // infant chest does not, so the correct answer itself changes with the age.
  function aedPadsForAge(ageId) {
    return ageId === 'infant' ? AED_PADS_INFANT : AED_PADS;
  }

  var AED_RULES = [
    { id: 'bare', icon: '👕', label: 'Bare skin, and dry',
      why: 'Pads have to make skin contact. Cut or tear the shirt off. If the chest is wet — sweat, rain, pool water — wipe it dry first, because water spreads the current across the skin instead of through the chest.' },
    { id: 'hair', icon: '✂️', label: 'A very hairy chest may need shaving',
      why: 'Thick hair stops the pad touching skin and the AED will tell you it cannot read. Many AED cases include a razor for exactly this.' },
    { id: 'patch', icon: '🩹', label: 'Take medication patches off',
      why: 'A patch under a pad blocks contact and can burn the skin. Peel it off — ideally with a gloved hand so you do not dose yourself — and wipe the area.' },
    { id: 'device', icon: '🔋', label: 'Avoid an implanted pacemaker or defibrillator',
      why: 'A hard lump under the skin, usually on the upper chest. Do not put a pad directly over it — shift the pad an inch or so to the side.' },
    { id: 'clear', icon: '🙌', label: 'Nobody touches during analysis or shock',
      why: 'Say "clear" out loud, look, and make sure no one is in contact — including you. Touching during the analysis can confuse the reading, and touching during the shock puts it through you.' },
    { id: 'kids', icon: '🧒', label: 'Under about 8 — use child pads if they exist',
      why: 'Use paediatric pads or a child setting if the AED has one. If it only has adult pads, use them rather than doing nothing — but the pads must not touch each other, so on a small chest put one on the front and one on the back.' },
    { id: 'resume', icon: '🔁', label: 'Start compressions again straight after the shock',
      why: 'Do not wait to see whether it worked. The AED will re-analyse on its own in about two minutes, and compressions in the meantime are what keeps blood moving.' }
  ];

  // ── Run the call ──────────────────────────────────────────────────────────
  // The five reference tabs each teach one thing well and none of them make
  // you COMBINE them. Real calls do: you assess, you pick a technique for the
  // age in front of you, you place your hands, and then an AED turns up and
  // changes what you are doing. This is the synthesis, and it is graded on
  // safety first — same shape as the Repair Bay and the tyre change.
  //
  // Case 3 exists specifically to test the gate in the direction people fail:
  // someone who is breathing and does NOT need compressions.
  var CALL_CASES = [
    {
      id: 'gym', icon: '🏋️', title: 'Adult collapse at the gym', age: 'adult',
      scene: 'A man in his fifties drops to the floor mid-workout. He does not respond when you shout and shake his shoulders. Every few seconds he makes a long, noisy gasp. Someone has run for the AED on the wall.',
      steps: [
        { prompt: 'Those occasional gasps — what are you looking at?',
          options: [
            { id: 'a', label: 'He is breathing, just badly — put him in the recovery position', verdict: 'wrong',
              why: 'This is the misread that costs lives. Occasional noisy gasps are agonal breathing, and they are a sign of cardiac arrest, not of breathing. Recovery position here means he gets no circulation at all.' },
            { id: 'b', label: 'Not breathing normally — send for help and start compressions', verdict: 'correct',
              why: 'Correct. Agonal gasping counts as NOT breathing normally. Unresponsive plus not breathing normally is enough to start; you are not expected to find a pulse first.' },
            { id: 'c', label: 'Check for a pulse before committing', verdict: 'unsafe',
              why: 'Lay rescuers are not expected to check for a pulse, and it is unreliable even for professionals under stress. Every second spent hunting for one is a second without circulation.' }
          ] },
        { prompt: 'Hands — what and where?',
          options: [
            { id: 'a', label: 'Two hands, centre of the chest, on the lower half of the breastbone', verdict: 'correct',
              why: 'Adult technique. Heel of one hand down, the other on top, fingers interlaced, arms locked and shoulders stacked over your hands so the push comes from your body weight.' },
            { id: 'b', label: 'Two hands, high on the chest just under the collarbones', verdict: 'wrong',
              why: 'Too high to squeeze the heart between the breastbone and the spine. Slide down to the centre of the chest.' },
            { id: 'c', label: 'Two fingers, centre of the chest', verdict: 'wrong',
              why: 'Two fingers cannot move an adult chest 5 cm, and the two-finger method is no longer recommended for infants either because it often fails to reach adequate depth.' }
          ] },
        { prompt: 'The AED arrives while you are compressing. What happens now?',
          options: [
            { id: 'a', label: 'Finish your two minutes of CPR, then deal with it', verdict: 'wrong',
              why: 'Use it as soon as it arrives. For a shockable rhythm, time to defibrillation is the single biggest factor in survival — waiting costs more than the pause does.' },
            { id: 'b', label: 'Turn it on and do exactly what it says, while someone bares his chest', verdict: 'correct',
              why: 'Right. It is built for untrained people and it will talk you through every step. Keep compressions going while the pads are being placed if there is someone to do both.' },
            { id: 'c', label: 'Check for a pulse to see whether the AED is still needed', verdict: 'unsafe',
              why: 'Still no pulse checks, and still no reason to stop compressions to perform one.' }
          ] },
        { prompt: 'Where do the pads go?',
          options: [
            { id: 'a', label: 'Upper right chest below the collarbone, and lower left side below the armpit', verdict: 'correct',
              why: 'Diagonally opposite, so the heart sits between them and the current has to cross it. The pads carry a picture of exactly this.' },
            { id: 'b', label: 'Both side by side on the upper chest, near each other', verdict: 'wrong',
              why: 'Close together, the current takes the short path between the pads and largely misses the heart.' },
            { id: 'c', label: 'One on the chest, one on the belly', verdict: 'wrong',
              why: 'The lower pad is too low to put the heart between them, so most of the current passes through the abdomen instead of across the heart. The pad has to sit on the lower ribs at the side of the chest, not below them.' }
          ] },
        { prompt: 'It says "shock delivered". What is your next move?',
          options: [
            { id: 'a', label: 'Start compressions again straight away', verdict: 'correct',
              why: 'Do not wait to see whether it worked. The AED re-analyses on its own in about two minutes; compressions in between are what keeps blood moving.' },
            { id: 'b', label: 'Stand back and watch for him to wake up', verdict: 'wrong',
              why: 'A heart that has just been shocked usually needs help pumping before it does anything useful. Waiting wastes the window the shock just bought.' },
            { id: 'c', label: 'Take the pads off now the shock is done', verdict: 'wrong',
              why: 'Leave them on. The AED needs them to re-analyse, and it will.' }
          ] }
      ],
      debrief: 'The two things that decide this call are recognising agonal gasping as arrest, and getting the AED on early. Neither requires strength or training you do not have.'
    },
    {
      id: 'infant', icon: '👶', title: 'Infant, babysitting', age: 'infant',
      scene: 'You are babysitting a seven-month-old. She has been quiet longer than feels right. You find her limp in the cot, and she does not respond when you tap her foot and call her name. Her chest is not moving.',
      steps: [
        { prompt: 'First move?',
          options: [
            { id: 'a', label: 'Shout for help, get 911 on speaker, and start compressions', verdict: 'correct',
              why: 'Unresponsive and not breathing means start. Speakerphone lets the dispatcher coach you while your hands keep working — they do this every day.' },
            { id: 'b', label: 'Pick her up and drive to the hospital', verdict: 'unsafe',
              why: 'Nobody is doing compressions in a moving car, and you may be minutes away. Care starts where she is.' },
            { id: 'c', label: 'Shake her hard to wake her up', verdict: 'unsafe',
              why: 'Never shake an infant. Tap the foot and call to her — that is enough to check responsiveness.' }
          ] },
        { prompt: 'How do you compress an infant chest?',
          options: [
            { id: 'a', label: 'Two hands, as you would for an adult', verdict: 'unsafe',
              why: 'Far too much force for an infant. This is the difference the age selector exists to teach.' },
            { id: 'b', label: 'Heel of one hand on the sternum, or two thumbs with hands encircling the chest', verdict: 'correct',
              why: 'Correct under the 2025 AHA/AAP guidance. Either heel-of-one-hand or two-thumb encircling-hands can reach the needed depth: about 1.5 inches (4 cm), roughly a third of her chest.' },
            { id: 'c', label: 'Two fingers on the breastbone', verdict: 'wrong',
              why: 'The older two-finger technique was removed in 2025 because it often fails to achieve adequate depth. Use heel of one hand or the two-thumb encircling-hands technique.' }
          ] },
        { prompt: 'Do rescue breaths matter here?',
          options: [
            { id: 'a', label: 'No — hands-only is the modern advice for everyone', verdict: 'wrong',
              why: 'Hands-only is the advice for an ADULT who collapses suddenly. Infant arrest is usually a breathing problem, so breaths matter a great deal here.' },
            { id: 'b', label: 'Yes — if trained, 30 compressions to 2 breaths, covering mouth and nose', verdict: 'correct',
              why: 'Right. Cover her mouth and nose, and give only enough air to make the chest rise — an infant\'s lungs are tiny and over-inflating does harm. If you are not trained in breaths, compressions alone are still far better than nothing.' },
            { id: 'c', label: 'Yes — full deep breaths, as much air as you can', verdict: 'unsafe',
              why: 'Too much. Just enough to see the chest start to rise, then stop.' }
          ] },
        { prompt: 'A neighbour arrives with an AED. It only has adult pads.',
          options: [
            { id: 'a', label: 'Do not use it — adult pads are not safe on a baby', verdict: 'wrong',
              why: 'Use it. Paediatric pads or a child setting are preferred, but an AED with adult pads is far better than no AED at all.' },
            { id: 'b', label: 'Use it — one pad on the front of the chest, one on the back', verdict: 'correct',
              why: 'On a chest that small the pads must not touch each other, so front-and-back is the placement. Otherwise, follow the prompts exactly as normal.' },
            { id: 'c', label: 'Use it — both pads on the front, overlapping slightly', verdict: 'unsafe',
              why: 'Pads that touch each other short the current across the skin instead of sending it through the chest, and can burn her.' }
          ] }
      ],
      debrief: 'This is the call a teenager is most likely to face, and it is the one where adult habits are most wrong: heel of one hand or two-thumb encircling-hands, breaths matter, and an AED with the wrong pads still beats no AED.'
    },
    {
      id: 'breathing', icon: '😴', title: 'Unresponsive, but breathing', age: 'adult',
      scene: 'A friend has been drinking heavily at a party. He is slumped on a sofa and you cannot wake him. He is breathing — slow, deep, snoring breaths — and his colour looks normal.',
      steps: [
        { prompt: 'What does he need?',
          options: [
            { id: 'a', label: 'Compressions, to be on the safe side', verdict: 'unsafe',
              why: 'Never "to be on the safe side". He is breathing, so his heart is beating. Compressions on a breathing person cause real injury and help nothing.' },
            { id: 'b', label: 'Recovery position, help on the way, and someone watching him', verdict: 'correct',
              why: 'Unresponsive but breathing normally means the job is protecting his airway. Recovery position, call for help, and stay with him.' },
            { id: 'c', label: 'Leave him to sleep it off and check back later', verdict: 'unsafe',
              why: 'Someone who cannot be woken is not asleep. Left on his back he can choke on vomit, and his breathing can stop without anyone noticing. This is how people die at parties.' }
          ] },
        { prompt: 'Why does the recovery position matter so much for him specifically?',
          options: [
            { id: 'a', label: 'It is more comfortable', verdict: 'wrong',
              why: 'Comfort is not the reason, and thinking of it that way makes the position sound optional. It is an airway measure — the point is what happens if he vomits while unconscious.' },
            { id: 'b', label: 'On his side with the mouth angled down, vomit drains out instead of into the lungs', verdict: 'correct',
              why: 'Exactly. Alcohol makes vomiting likely and blunts the reflexes that would normally protect the airway. The head tilt opens the airway; the downward angle lets fluid escape.' },
            { id: 'c', label: 'It stops him rolling off the sofa', verdict: 'wrong',
              why: 'Not the reason, though moving him to the floor is a sensible idea.' }
          ] },
        { prompt: 'He is positioned and help is coming. What now?',
          options: [
            { id: 'a', label: 'Stay and keep checking that his breathing is still normal', verdict: 'correct',
              why: 'This is not a finished job. If his breathing stops or turns into occasional gasps, roll him onto his back and start compressions immediately.' },
            { id: 'b', label: 'Go back to the party — he is in the right position now', verdict: 'unsafe',
              why: 'The position protects his airway; it does not monitor him. Breathing can stop after you walk away.' },
            { id: 'c', label: 'Try to make him drink water or coffee', verdict: 'unsafe',
              why: 'Someone who cannot be woken cannot swallow safely. Pouring anything into his mouth risks it going into his lungs.' }
          ] }
      ],
      debrief: 'Every wrong answer here is one that gets chosen in real life, usually kindly. Breathing means position and monitor. Not breathing normally means compressions. That single distinction is the most useful thing in this whole module.'
    },
    {
      id: 'pool', icon: '🌊', title: 'Pulled from the pool', age: 'adult',
      scene: 'A teenager is pulled from the deep end and laid on the wet tiles at the poolside. She is unresponsive and not breathing. Water is pooling around her.',
      steps: [
        { prompt: 'Drowning changes one thing about your priorities. What?',
          options: [
            { id: 'a', label: 'Nothing — compressions only, same as any adult collapse', verdict: 'wrong',
              why: 'Drowning arrest is caused by lack of oxygen, not usually by a sudden rhythm problem. If you are trained in breaths, they matter here more than in a typical adult collapse.' },
            { id: 'b', label: 'Breaths matter more than usual, because this is an oxygen problem', verdict: 'correct',
              why: 'Right. If you are trained, use 30 compressions to 2 breaths. If you are not, start compressions anyway — untrained compressions still beat waiting.' },
            { id: 'c', label: 'Drain the water from her lungs before starting', verdict: 'unsafe',
              why: 'There is no useful way to do that, and trying wastes the minutes that matter. Start CPR.' }
          ] },
        { prompt: 'An AED arrives. She is soaking wet and lying in a puddle.',
          options: [
            { id: 'a', label: 'Use it as-is — water makes no difference', verdict: 'unsafe',
              why: 'Water spreads the current across wet skin instead of driving it through the chest, and standing water puts everyone nearby in the path.' },
            { id: 'b', label: 'Move her clear of the puddle and wipe her chest dry, then apply the pads', verdict: 'correct',
              why: 'Both halves matter. Get her off standing water and dry the chest where the pads go — the pads need skin contact, and a wet chest defeats it. This takes seconds.' },
            { id: 'c', label: 'Skip the AED entirely because of the water', verdict: 'wrong',
              why: 'No — dry her and use it. An AED is the thing most likely to restart a shockable rhythm.' }
          ] }
      ],
      debrief: 'Drowning is the clearest case of "hands-only is not the whole story". It is an oxygen problem, and the water itself changes how you use the AED.'
    }
  ];

  // Pickable regions of the torso, in the order the raycaster should see them.
  // Deliberately schematic: this is a diagram you can walk around, not a
  // medical model, and the UI says so.
  var BODY_PARTS = [
    { id: 'high',    label: 'Upper breastbone' },
    { id: 'correct', label: 'Centre of the chest' },
    { id: 'low',     label: 'Bottom of the breastbone' },
    { id: 'belly',   label: 'Abdomen' },
    { id: 'sideL',   label: 'Ribs (left)' },
    { id: 'sideR',   label: 'Ribs (right)' },
  ];


  // Viewer labels include both quizzes, but the placement control list above
  // intentionally excludes AED-only targets.
  // Both pad layouts contribute labels: the viewer has to be able to name the
  // infant front/back targets too, and padTogether/padBelly are shared ids.
  var BODY_SCENE_PARTS = BODY_PARTS.concat(AED_PADS.concat(AED_PADS_INFANT)
    .filter(function (pad, i, all) {
      for (var j = 0; j < i; j++) if (all[j].id === pad.id) return false;
      return true;
    })
    .map(function (pad) { return { id: pad.id, label: pad.label }; }))
    // Camera targets are named for the viewer, without adding quiz regions.
    .concat([{ id: 'head', label: 'Head' }, { id: 'arms', label: 'Rescuer hands and arms' },
      { id: 'patientArms', label: 'Manikin arms and hands' }, { id: 'legs', label: 'Manikin legs and feet' }]);

  // -- Body scene content --
  // api.phase drives the recovery-position roll: 0 = flat on the back,
  // rising to 1 = fully on the side with the airway open.
  function buildBodySceneLegacy(THREE, api) {
    var meshes = {};
    var picks = [];
    var roll = Math.max(0, Math.min(1, (api.phase || 0) / RECOVERY_STEPS.length));
    var sp = api.sceneProps || {};
    var mode = sp.tab || 'place';                      // place | aed | recovery | gate
    // Age scales the whole figure. An infant is not a small adult, and seeing
    // the size difference is part of understanding why the technique changes.
    var ageScale = 1;
    for (var ai = 0; ai < CPR_AGES.length; ai++) if (CPR_AGES[ai].id === sp.age) ageScale = CPR_AGES[ai].scale;

    var ground = new THREE.Mesh(new THREE.BoxGeometry(7, 0.06, 5),
      api.trim(api.contrast ? 0x111111 : (api.dark ? 0x131c2e : 0x9aa5b4), 4));
    ground.position.y = -0.03;
    if (api.wantShadow) ground.receiveShadow = true;
    api.scene.add(ground);

    var skin = api.contrast ? 0xffffff : 0xc89a78;
    var shirt = api.contrast ? 0xdddddd : 0x3f6fa5;

    // Whole body rolls as one group for the recovery position.
    var body = new THREE.Group();
    body.rotation.z = -roll * (Math.PI / 2) * 0.78;   // onto their side
    body.position.y = 0.30 * ageScale;
    body.scale.setScalar(ageScale);
    api.scene.add(body);

    // Chest tapers to the waist and the shoulders sit proud, so the figure
    // reads as a person from any angle rather than as a stack of slabs.
    var torso = new THREE.Mesh(new THREE.BoxGeometry(1.00, 0.44, 1.55), api.trim(shirt, 12));
    torso.position.z = -0.05;
    body.add(torso);
    var shoulders = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.40, 0.42), api.trim(shirt, 12));
    shoulders.position.set(0, 0.02, -0.66);
    body.add(shoulders);
    var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.26, 12), api.trim(skin, 10));
    neck.rotation.x = Math.PI / 2;
    neck.position.set(0, 0.04, -0.92);
    body.add(neck);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.30, 20, 16), api.trim(skin, 10));
    head.scale.set(0.92, 1, 1.12);
    head.position.set(0, 0.07, -1.26);
    head.rotation.x = roll * 0.28;                    // tilted back, mouth down
    body.add(head);
    var hips = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.40, 0.55), api.trim(0x334155, 10));
    hips.position.set(0, -0.02, 0.92);
    body.add(hips);

    // Near arm out at a right angle once that step is done
    var armOut = (api.phase || 0) >= 2;
    var armL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.20, 0.20), api.trim(skin, 10));
    if (armOut) armL.position.set(-0.95, 0.02, -0.5);
    else { armL.position.set(-0.62, 0, -0.1); armL.rotation.y = 0.25; }
    body.add(armL);
    var armR = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.20, 0.9), api.trim(skin, 10));
    armR.position.set(0.55, 0.06, -0.62);
    body.add(armR);

    // Far knee bent up once that step is done
    var kneeUp = (api.phase || 0) >= 4;
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.30, 1.3), api.trim(0x334155, 10));
    legL.position.set(-0.24, -0.02, 1.85);
    body.add(legL);
    var legR = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.30, kneeUp ? 0.8 : 1.3), api.trim(0x334155, 10));
    legR.position.set(0.26, kneeUp ? 0.22 : -0.02, kneeUp ? 1.55 : 1.85);
    if (kneeUp) legR.rotation.x = -0.7;
    body.add(legR);

    if (api.wantShadow) body.traverse(function (o) { if (o.isMesh) o.castShadow = true; });

    // Target patches on the chest. Only meaningful before the roll starts,
    // so they fade out as the body turns.
    function patch(id, w, hgt, x, z, colorHex) {
      var g = new THREE.Group();
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, hgt), api.trim(colorHex, 30));
      m.material.transparent = true;
      m.material.opacity = roll > 0.05 ? 0.12 : 0.55;
      g.add(m);
      g.position.set(x, 0.22, z);
      g.userData.partId = id;
      g.traverse(function (o) { if (o.isMesh) { o.userData.partId = id; picks.push(o); } });
      body.add(g);
      meshes[id] = g;
    }
    // Sternal notch is around z = -0.72; navel around z = +0.62.
    // Targets belong to the tab that asks about them. On the gate, recovery
    // and scenario tabs the coloured patches are just noise on the body.
    if (mode !== 'place' && mode !== 'aed') {
      // no target patches
    } else if (mode === 'aed') {
      // Pad targets. The two correct ones sit diagonally opposite so the heart
      // ends up between them — which is the thing worth seeing in 3D.
      patch('padUR',       0.36, 0.34, -0.30, -0.52, api.contrast ? 0xffffff : 0x22c55e);
      patch('padLL',       0.36, 0.34,  0.32,  0.16, api.contrast ? 0xffffff : 0x22c55e);
      patch('padTogether', 0.34, 0.30,  0.30, -0.52, api.contrast ? 0xffffff : 0xf59e0b);
      patch('padBelly',    0.42, 0.36,  0,     0.60, api.contrast ? 0xffffff : 0xef4444);
    } else {
      patch('high',    0.34, 0.34, 0,     -0.60, api.contrast ? 0xffffff : 0xf59e0b);
      patch('correct', 0.34, 0.36, 0,     -0.20, api.contrast ? 0xffffff : 0x22c55e);
      patch('low',     0.34, 0.26, 0,      0.13, api.contrast ? 0xffffff : 0xf59e0b);
      patch('belly',   0.42, 0.40, 0,      0.55, api.contrast ? 0xffffff : 0xef4444);
      patch('sideL',   0.28, 0.9,  -0.36, -0.20, api.contrast ? 0xffffff : 0xef4444);
      patch('sideR',   0.28, 0.9,   0.36, -0.20, api.contrast ? 0xffffff : 0xef4444);
    }

    return { meshes: meshes, picks: picks, anchor: ground };
  }


  // Rounded, age-aware training manikin. The legacy block model remains above
  // for an easy source-level comparison while this builder is the live scene.
  // All geometry is procedural and supported by the bundled Three r128 build.
  // Settings describe an illustrative manikin, never measured learner performance.
  function compressionLabSettings(age, raw, mechanic) {
    var reference = age === 'infant' ? 4 : (age === 'child' ? 5 : 5.5);
    var maximum = age === 'infant' ? 5.5 : (age === 'child' ? 6.5 : 7);
    var value = raw && raw.age === age ? raw : {};
    var presetDepth = mechanic === 'shallow' ? Math.floor(reference) * 0.5 : mechanic === 'toodeep' ? maximum : reference;
    function clamp(n, fallback, lo, hi) { return typeof n === 'number' && Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback; }
    var depth = clamp(value.depth, presetDepth, 1, maximum);
    return {
      age: age, reference: reference, maximum: maximum,
      chestCm: age === 'infant' ? 12 : (age === 'child' ? 15 : 18),
      depth: depth, lean: clamp(value.lean, mechanic === 'lean' ? 1 : 0, 0, Math.min(2, depth)),
      rate: clamp(value.rate, 110, 80, 140),
      motion: ['cycle', 'press', 'release', 'inspect'].indexOf(value.motion) >= 0 ? value.motion : 'release',
      phase: Math.round(clamp(value.phase, 100, 0, 100)),
      anatomy: value.anatomy === true, hands: value.hands !== false, measure: value.measure === true
    };
  }
  function compressionLabSample(settings, timeMs, reduced) {
    var cycle = ((timeMs % (60000 / settings.rate)) + (60000 / settings.rate)) % (60000 / settings.rate);
    var phase = settings.motion === 'inspect' ? settings.phase / 100 : settings.motion === 'press' ? 0.5
      : settings.motion === 'cycle' && !reduced ? cycle / (60000 / settings.rate) : 1;
    var amount = (1 - Math.cos(phase * Math.PI * 2)) / 2;
    var depression = settings.lean + (settings.depth - settings.lean) * amount;
    return { depression: depression, fraction: depression / settings.chestCm, amount: amount, phase: phase,
      direction: phase > 0 && phase < 0.5 ? -1 : phase > 0.5 && phase < 1 ? 1 : 0 };
  }

  function compressionLabReference(age, raw) {
    if (!raw || raw.age !== age || !Number.isFinite(raw.depth) || !Number.isFinite(raw.lean)) return null;
    var normalized = compressionLabSettings(age, raw, null);
    return { age: age, depth: normalized.depth, lean: normalized.lean };
  }

  function buildBodyScene(THREE, api) {
    var meshes = {};
    var picks = [];
    var sp = api.sceneProps || {};
    var mode = sp.tab || 'place';
    var age = sp.age || 'adult';
    var phase = api.phase || 0;
    // ── Recovery choreography ───────────────────────────────────────────────
    // `phase` counts COMPLETED steps, so step i is done once phase >= i + 1.
    // Every step has to move the thing it names. The old schedule ramped the
    // roll linearly across the last four steps, which meant the step that says
    // "roll them onto their side" delivered a quarter of the turn, the airway
    // and top-leg steps appeared to work only because the body kept rotating
    // underneath them, and "keep watching their breathing" rolled the patient.
    var REC_AT = {};
    for (var rsi = 0; rsi < RECOVERY_STEPS.length; rsi++) REC_AT[RECOVERY_STEPS[rsi].id] = rsi + 1;
    var didRoll = phase >= (REC_AT.roll || 1e9);
    var didAirway = phase >= (REC_AT.airway || 1e9);
    var didStable = phase >= (REC_AT.stable || 1e9);
    // The turn belongs to its own step; the last 12% is the settle that comes
    // with squaring the top leg. Nothing after that moves the body, because
    // nothing after that is an instruction to move them.
    var roll = didStable ? 1 : (didRoll ? 0.88 : 0);
    var ageScale = 1;
    var ageAirwayTilt = 1;
    for (var ai = 0; ai < CPR_AGES.length; ai++) {
      if (CPR_AGES[ai].id === age) {
        ageScale = CPR_AGES[ai].scale;
        if (CPR_AGES[ai].airwayTilt != null) ageAirwayTilt = CPR_AGES[ai].airwayTilt;
      }
    }
    var profile = age === 'infant'
      ? { head: 1.40, torso: 0.86, width: 0.88, limb: 0.72 }
      : (age === 'child'
        ? { head: 1.15, torso: 0.94, width: 0.94, limb: 0.88 }
        : { head: 1, torso: 1, width: 1, limb: 1 });

    function material(hex, shiny, opacity, contrastHex) {
      var m = api.contrast ? new THREE.MeshBasicMaterial({ color: contrastHex == null ? 0xffffff : contrastHex }) : api.trim(hex, shiny);
      // Quiet highlights keep the contact heel and teaching markers readable.
      if (!api.contrast && m.specular) m.specular.setHex(0x25313b);
      if (opacity != null && opacity < 1) {
        m.transparent = true;
        m.opacity = opacity;
        m.depthWrite = opacity > 0.62;
      }
      return m;
    }
    function teachingMaterial(hex) {
      // Marker colors carry meaning, so lighting must not wash them out.
      return new THREE.MeshBasicMaterial({ color: api.contrast ? 0xffffff : hex });
    }
    function blob(parent, sx, sy, sz, mat, x, y, z, detailed) {
      var mesh = new THREE.Mesh(new THREE.SphereGeometry(1, detailed ? 48 : 28, detailed ? 32 : 18), mat);
      mesh.scale.set(sx, sy, sz);
      mesh.position.set(x || 0, y || 0, z || 0);
      parent.add(mesh);
      return mesh;
    }
    function segment(parent, a, b, radius, mat) {
      var delta = new THREE.Vector3().subVectors(b, a);
      var length = delta.length();
      var mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.94, length, 16), mat);
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
      parent.add(mesh);
      return mesh;
    }
    function joint(parent, at, radius, mat) {
      return blob(parent, radius, radius, radius, mat, at.x, at.y, at.z);
    }
    function smoothCoincidentNormals(geometry) {
      // Rounded surfaces share shading across duplicated seam and cap vertices.
      geometry.computeVertexNormals();
      var positions = geometry.attributes.position, normals = geometry.attributes.normal;
      var shared = {}, keys = [];
      for (var i = 0; i < positions.count; i++) {
        var key = [positions.getX(i),positions.getY(i),positions.getZ(i)]
          .map(function (v) { return Math.round(v*1e6); }).join(',');
        keys.push(key);
        if (!shared[key]) shared[key] = new THREE.Vector3();
        shared[key].add(new THREE.Vector3().fromBufferAttribute(normals,i));
      }
      for (var i = 0; i < positions.count; i++) {
        var normal = shared[keys[i]].normalize();
        normals.setXYZ(i,normal.x,normal.y,normal.z);
      }
    }
    function shapedSegment(parent, a, b, contour, mat, name) {
      var delta = new THREE.Vector3().subVectors(b, a), length = delta.length();
      var geometry = new THREE.CylinderGeometry(1, 1, length, 24, 16);
      var positions = geometry.attributes.position, normals = geometry.attributes.normal;
      var sideVertices = 25 * 17;
      for (var vi = 0; vi < positions.count; vi++) {
        var radialX = positions.getX(vi), radialZ = positions.getZ(vi);
        var t = positions.getY(vi) / length + 0.5, at = 0;
        while (at < contour.length - 2 && t > contour[at + 1][0]) at++;
        var u = Math.max(0, Math.min(1, (t - contour[at][0]) / (contour[at + 1][0] - contour[at][0])));
        var slope = (contour[at + 1][1] - contour[at][1]) * 6 * u * (1 - u)
          / ((contour[at + 1][0] - contour[at][0]) * length);
        u = u * u * (3 - 2 * u);
        var radius = contour[at][1] + (contour[at + 1][1] - contour[at][1]) * u;
        positions.setXYZ(vi, radialX * radius, positions.getY(vi), radialZ * radius);
        // Side shading follows the taper. Hidden end caps keep their own normals
        // so averaging them into a joint cannot leave a dark ring on the limb.
        if (vi < sideVertices) {
          var normal = new THREE.Vector3(radialX, -slope, radialZ).normalize();
          normals.setXYZ(vi, normal.x, normal.y, normal.z);
        }
      }
      var mesh = new THREE.Mesh(geometry, mat);
      mesh.name = name || '';
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
      parent.add(mesh);
      return mesh;
    }
    function pelvisSurface() {
      // A fitted waist and hips taper toward the crotch; the legs still attach
      // to their original joint centres inside this closed clothing shell.
      var sections = [[.74,.405,.205],[.83,.425,.215],[.94,.435,.22],
        [1.03,.43,.21],[1.12,.375,.18],[1.25,.25,.12],[1.31,.06,.03]];
      var vertices = [], indices = [], rings = [], around = 32;
      for (var s = 0; s < sections.length - 1; s++) {
        for (var step = 0; step < 8; step++) {
          var u = step / 8, a = sections[s], b = sections[s+1];
          var previous = sections[Math.max(0,s-1)], following = sections[Math.min(sections.length-1,s+2)];
          function radius(axis) {
            // Shared tangents carry the outline smoothly across each section.
            var startSlope = (b[axis]-previous[axis])/(b[0]-previous[0]);
            var endSlope = (following[axis]-a[axis])/(following[0]-a[0]);
            return (2*u*u*u-3*u*u+1)*a[axis] + (u*u*u-2*u*u+u)*(b[0]-a[0])*startSlope
              + (-2*u*u*u+3*u*u)*b[axis] + (u*u*u-u*u)*(b[0]-a[0])*endSlope;
          }
          rings.push([a[0]+(b[0]-a[0])*u,radius(1),radius(2)]);
        }
      }
      rings.push(sections[sections.length-1]);
      rings.forEach(function (ring,row) {
        for (var j = 0; j < around; j++) {
          var angle = j/around*Math.PI*2, next = (j+1)%around;
          vertices.push(Math.cos(angle)*ring[1]*profile.width,Math.sin(angle)*ring[2]-.012,ring[0]*profile.torso);
          if (row < rings.length-1) {
            var p = row*around+j, q = (row+1)*around+j;
            indices.push(p,row*around+next,q,row*around+next,(row+1)*around+next,q);
          }
        }
      });
      for (var end = 0; end < 2; end++) {
        var row = end ? rings.length-1 : 0, centre = vertices.length/3;
        vertices.push(0,-.012,rings[row][0]*profile.torso);
        for (var j = 0; j < around; j++) {
          var p = row*around+j, q = row*around+(j+1)%around;
          if (end) indices.push(centre,p,q); else indices.push(centre,q,p);
        }
      }
      var geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
      geometry.setIndex(indices); geometry.computeVertexNormals();
      var mesh = new THREE.Mesh(geometry,trousers);
      mesh.name = 'fr-manikin-pelvis'; body.add(mesh);
      return mesh;
    }
    function torsoSurface() {
      // One continuous shell, with the contact surface at y=.25. The existing
      // chest rig still owns depression and recoil around the fixed back plane.
      var sections = [[-0.91, .16, .13], [-0.75, .38, .20], [-0.55, .56, .23],
        [-0.34, .56, .25], [-0.18, .55, .25], [.08, .49, .23], [.38, .41, .20], [.70, .42, .20], [.94, .38, .18]];
      var vertices = [], indices = [], rings = [], around = 40;
      for (var si = 0; si < sections.length - 1; si++) {
        for (var step = 0; step < 5; step++) {
          var u = step / 5, smooth = u * u * (3 - 2 * u), a = sections[si], b = sections[si + 1];
          rings.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * smooth, a[2] + (b[2] - a[2]) * smooth]);
        }
      }
      rings.push(sections[sections.length - 1]);
      rings.forEach(function (ring, row) {
        for (var j = 0; j <= around; j++) {
          var angle = j / around * Math.PI * 2;
          vertices.push(Math.cos(angle) * ring[1] * profile.width, Math.sin(angle) * ring[2], ring[0] * profile.torso);
          if (row < rings.length - 1 && j < around) {
            var p = row * (around + 1) + j, q = p + around + 1;
            indices.push(p, p + 1, q, p + 1, q + 1, q);
          }
        }
      });
      for (var end = 0; end < 2; end++) {
        var row = end ? rings.length - 1 : 0, centre = vertices.length / 3;
        vertices.push(0, 0, rings[row][0] * profile.torso);
        for (var j = 0; j < around; j++) {
          var p = row * (around + 1) + j;
          if (end) indices.push(centre, p, p + 1); else indices.push(centre, p + 1, p);
        }
      }
      var geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices); geometry.computeVertexNormals();
      var normals = geometry.attributes.normal;
      for (var row = 0; row < rings.length; row++) {
        var first = row * (around + 1), last = first + around;
        var normal = new THREE.Vector3(normals.getX(first)+normals.getX(last), normals.getY(first)+normals.getY(last), normals.getZ(first)+normals.getZ(last)).normalize();
        normals.setXYZ(first,normal.x,normal.y,normal.z); normals.setXYZ(last,normal.x,normal.y,normal.z);
      }
      var mesh = new THREE.Mesh(geometry, shirt);
      mesh.name = 'fr-manikin-torso';
      chestRig.add(mesh);
      return mesh;
    }

    var ground = new THREE.Mesh(new THREE.BoxGeometry(12, 0.07, 12),
      material(api.dark ? 0x0d1726 : 0x9ba8b8, 4, null, 0x000000));
    ground.name = 'fr-training-floor';
    ground.position.y = -0.04;
    if (api.wantShadow) ground.receiveShadow = true;
    api.scene.add(ground);

    function matOutline(inset) {
      var x = 1.82 - inset, bottom = -2.62 + inset, top = 1.88 - inset, r = 0.20;
      var outline = new THREE.Shape();
      outline.moveTo(-x + r, bottom);
      outline.lineTo(x - r, bottom); outline.quadraticCurveTo(x, bottom, x, bottom + r);
      outline.lineTo(x, top - r); outline.quadraticCurveTo(x, top, x - r, top);
      outline.lineTo(-x + r, top); outline.quadraticCurveTo(-x, top, -x, top - r);
      outline.lineTo(-x, bottom + r); outline.quadraticCurveTo(-x, bottom, -x + r, bottom);
      return outline;
    }
    var matFloor = new THREE.Mesh(new THREE.ExtrudeGeometry(matOutline(0), {
      depth: 0.025, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.009,
      bevelSegments: 3, steps: 1, curveSegments: 12
    }), material(api.dark ? 0x24364b : 0xc7d2df, 5, null, 0x000000));
    matFloor.name = 'fr-training-mat';
    matFloor.rotation.x = -Math.PI / 2;
    matFloor.position.y = -0.015;
    if (api.wantShadow) matFloor.receiveShadow = true;
    api.scene.add(matFloor);
    var seamPoints = matOutline(0.075).getPoints(12).map(function (p) { return new THREE.Vector3(p.x, 0.021, -p.y); });
    var matSeam = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(seamPoints),
      new THREE.LineBasicMaterial({ color: api.contrast ? 0xffffff : 0x66809a, transparent: !api.contrast, opacity: api.contrast ? 1 : 0.55 }));
    matSeam.name = 'fr-training-mat-seam';
    api.scene.add(matSeam);
    if (!api.contrast) {
      var modelFill = new THREE.HemisphereLight(0xd9e8f5, 0x233044, 0.32);
      modelFill.name = 'fr-model-fill';
      api.scene.add(modelFill);
    }

    var skin = material(0xc09478, 12);
    var skinDetail = material(0x8d6650, 6, null, 0x777777);
    var nailMaterial = material(0xe1c5b2, 8, null, 0x777777);
    var shirt = material(0x28659a, 18, null, 0x333333);
    var trousers = material(0x273449, 10, null, 0x777777);
    var shoe = material(0x111827, 16);
    var bone = material(0xf8e7c4, 6, 0.70);
    var lungMat = material(0x7dd3fc, 18, 0.30);
    var heartMat = material(0xe11d48, 34, 0.88);

    var body = new THREE.Group();
    body.name = 'fr-training-manikin';
    // TOWARDS the rescuer. The near arm is the one placed out at a right angle
    // on the -X side, so -X is where the rescuer is kneeling, and "pull on the
    // bent knee to roll them TOWARDS YOU" means the far side comes up and over.
    // Rolling the other way is the exact mistake the step text warns about, and
    // it also leaves the lever leg trapped underneath and the bracing arm
    // waving in the air rather than supporting them on the mat.
    var rollAngle = roll * (Math.PI / 2) * 0.78;
    body.rotation.z = rollAngle;
    // A body on its side is taller than a body on its back: what rests on the
    // mat changes from the torso's half-THICKNESS to its half-WIDTH. Holding
    // the supine height through the roll sank the figure into the mat, which
    // put the near shoulder under the floor and left its hand looking severed.
    // Exact for the torso ellipsoid, so this reproduces the original supine
    // 0.30 at roll 0 and rises to the half-WIDTH as it comes over.
    var bodyLift = 0.05 + Math.sqrt(
      Math.pow(0.56 * profile.width * Math.sin(rollAngle), 2)
      + Math.pow(0.25 * Math.cos(rollAngle), 2));
    body.position.y = bodyLift * ageScale;
    body.scale.setScalar(ageScale);
    api.scene.add(body);
    // Rolled poses are far easier to reason about in world terms ("flat on the
    // mat, out to the side") than in the tilted body frame, so express them
    // that way and rotate them back. groundY is the mat, measured down from the
    // body origin in body-local units.
    var groundY = -bodyLift + 0.03 / Math.max(0.2, ageScale);
    function fromWorld(wx, wy) {
      var rc = Math.cos(rollAngle), rs = Math.sin(rollAngle);
      return { x: wx * rc + wy * rs, y: -wx * rs + wy * rc };
    }
    function span3(a, b) {
      return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
    }

    var chestRig = new THREE.Group();
    body.add(chestRig);
    var torso = torsoSurface();
    pelvisSurface();

    shapedSegment(body, new THREE.Vector3(0, .025, -.82 * profile.torso),
      new THREE.Vector3(0, .055, -1.12 * profile.torso),
      [[0,.16*profile.width],[.35,.14*profile.width],[.75,.12*profile.width],[1,.115*profile.width]], skin, 'fr-manikin-neck');
    var headPivot = new THREE.Group();
    headPivot.position.set(0, 0.07, -1.25 * profile.torso);
    body.add(headPivot);
    meshes.head = headPivot;
    headPivot.name = 'fr-manikin-head-pivot';
    var skull = blob(headPivot, 0.28 * profile.head, 0.30 * profile.head, 0.34 * profile.head, skin, 0, 0, 0, true);
    skull.name = 'fr-manikin-head';
    var skullVertices = skull.geometry.attributes.position;
    for (var hi = 0; hi < skullVertices.count; hi++) {
      var hz = skullVertices.getZ(hi), hy = skullVertices.getY(hi);
      skullVertices.setXYZ(hi, skullVertices.getX(hi) * (1 - Math.max(0, hz) * 0.22), hy * (hy > 0 ? 0.94 : 1), hz);
    }
    smoothCoincidentNormals(skull.geometry);
    // A single smooth bridge and tip joins the face, avoiding separate nose blobs.
    var noseSections = [[-.10,.008,.009,.266],[-.04,.022,.025,.291],
      [.006,.032,.026,.310],[.032,.027,.018,.301],[.055,.012,.007,.274]];
    var noseVertices = [], noseIndices = [], noseRows = [], noseAround = 24;
    for (var ni = 0; ni < noseSections.length-1; ni++) {
      for (var ns = 0; ns < 6; ns++) {
        var nu = ns/6, ne = nu*nu*(3-2*nu);
        noseRows.push(noseSections[ni].map(function (value, axis) {
          return value+(noseSections[ni+1][axis]-value)*(axis === 0 ? nu : ne);
        }));
      }
    }
    noseRows.push(noseSections[noseSections.length-1]);
    noseRows.forEach(function (row, ring) {
      for (var nj = 0; nj <= noseAround; nj++) {
        var angle = nj/noseAround*Math.PI*2;
        noseVertices.push(Math.cos(angle)*row[1]*profile.head,
          (row[3]+Math.sin(angle)*row[2])*profile.head, row[0]*profile.head);
        if (ring < noseRows.length-1 && nj < noseAround) {
          var p = ring*(noseAround+1)+nj, q = p+noseAround+1;
          noseIndices.push(p,p+1,q,p+1,q+1,q);
        }
      }
    });
    for (var end = 0; end < 2; end++) {
      var rowIndex = end ? noseRows.length-1 : 0, row = noseRows[rowIndex], centre = noseVertices.length/3;
      noseVertices.push(0,row[3]*profile.head,row[0]*profile.head);
      for (var nj = 0; nj < noseAround; nj++) {
        var p = rowIndex*(noseAround+1)+nj;
        if (end) noseIndices.push(centre,p,p+1); else noseIndices.push(centre,p+1,p);
      }
    }
    var noseGeometry = new THREE.BufferGeometry();
    noseGeometry.setAttribute('position',new THREE.Float32BufferAttribute(noseVertices,3));
    noseGeometry.setIndex(noseIndices); smoothCoincidentNormals(noseGeometry);
    var nose = new THREE.Mesh(noseGeometry,skin);
    nose.name = 'fr-manikin-nose'; headPivot.add(nose);
    [-1,1].forEach(function (side) {
      blob(headPivot,.005*profile.head,.002*profile.head,.005*profile.head,skinDetail,
        side*.019*profile.head,.313*profile.head,.034*profile.head);
    });
    function faceLine(points, radius, name, mat) {
      var curve = new THREE.CatmullRomCurve3(points.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]).multiplyScalar(profile.head); }));
      var line = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, radius * profile.head, 8, false), mat || skinDetail);
      line.name = name; headPivot.add(line);
    }
    faceLine([[-.155, .246, -.105], [-.10, .264, -.10], [-.05, .267, -.105]], .006, 'fr-manikin-eye-left');
    faceLine([[.05, .267, -.105], [.10, .264, -.10], [.155, .246, -.105]], .006, 'fr-manikin-eye-right');
    faceLine([[-.058, .256, .125], [0, .265, .133], [.058, .256, .125]], .006, 'fr-manikin-mouth');
    var lipMaterial = material(0xb8876f, 8, null, 0x888888);
    faceLine([[-.058,.256,.125],[-.026,.264,.121],[0,.267,.124],[.026,.264,.121],[.058,.256,.125]], .0065, 'fr-manikin-upper-lip', lipMaterial);
    faceLine([[-.052,.256,.132],[0,.262,.146],[.052,.256,.132]], .007, 'fr-manikin-lower-lip', lipMaterial);
    blob(headPivot, 0.045 * profile.head, 0.06 * profile.head, 0.07 * profile.head,
      skin, -0.29 * profile.head, 0, 0);
    blob(headPivot, 0.045 * profile.head, 0.06 * profile.head, 0.07 * profile.head,
      skin, 0.29 * profile.head, 0, 0);
    [-1,1].forEach(function (side) {
      blob(headPivot,.006*profile.head,.030*profile.head,.042*profile.head,skinDetail,
        side*.331*profile.head,.008*profile.head,0);
    });

    // The airway step is the whole reason the recovery position exists, and it
    // moved nothing: the head was carried round by the torso and never tilted.
    // frame() writes headPivot.rotation.x every tick, so the recovery tilt has
    // to be a BASE it adds to rather than a value it would overwrite with zero.
    var baseHeadTiltX = 0;
    if (didAirway) {
      baseHeadTiltX = RECOVERY_HEAD_TILT * ageAirwayTilt;
      headPivot.rotation.z = RECOVERY_MOUTH_DOWN;
    }
    headPivot.rotation.x = baseHeadTiltX;

    var armOut = phase >= 2;
    var handAtCheek = phase >= 3;
    var kneeUp = phase >= 4;
    var shoulderLX = -0.55 * profile.width;
    var shoulderRX = 0.55 * profile.width;
    var leftShoulder = new THREE.Vector3(shoulderLX, 0, -0.55 * profile.torso);
    // Once they are rolled onto this arm it stays on the mat, extended beside
    // them, taking their weight and stopping them going face-down. Carried
    // round by the body rotation alone it would swing 70 degrees and end up
    // either pointing at the ceiling or driven through the floor, depending on
    // which way the body turned — so when rolled it is re-pinned to the mat.
    // Derived from the shoulder and this figure's own upper-arm and forearm
    // lengths, for the same reason the top leg is: pinning it to hand-picked
    // world coordinates instead stretched the upper arm from 0.47 to 0.87 and
    // left a forearm floating clear of the body.
    var flatGroundY = -0.30 + 0.03 / Math.max(0.2, ageScale);
    var armOutElbow = new THREE.Vector3(-1.02, flatGroundY + 0.095, -0.52);
    var armOutWrist = new THREE.Vector3(-1.34, flatGroundY + 0.055, -0.52);
    var leftElbow, leftWrist;
    if (didRoll) {
      var rc1 = Math.cos(rollAngle), rs1 = Math.sin(rollAngle);
      var shWx = leftShoulder.x * rc1 - leftShoulder.y * rs1;
      var shWy = leftShoulder.x * rs1 + leftShoulder.y * rc1;
      var upperLen = span3(leftShoulder, armOutElbow);
      var foreLen = span3(armOutElbow, armOutWrist);
      var armDrop = shWy - (groundY + 0.10);
      if (armDrop > upperLen * 0.96) armDrop = upperLen * 0.96;
      var armReach = Math.sqrt(Math.max(0, upperLen * upperLen - armDrop * armDrop));
      var elbowW = fromWorld(shWx - armReach, shWy - armDrop);
      // Settle the wrist beside the mat while retaining the forearm length.
      var wristDrop = 0.045, foreReach = Math.sqrt(Math.max(0, foreLen * foreLen - wristDrop * wristDrop));
      var wristW = fromWorld(shWx - armReach - foreReach, shWy - armDrop - wristDrop);
      leftElbow = new THREE.Vector3(elbowW.x, elbowW.y, -0.52);
      leftWrist = new THREE.Vector3(wristW.x, wristW.y, -0.52);
    } else if (armOut) {
      leftElbow = armOutElbow;
      leftWrist = armOutWrist;
    } else {
      leftElbow = new THREE.Vector3(-0.69, groundY + 0.09, -0.10);
      leftWrist = new THREE.Vector3(-0.66, groundY + 0.055, 0.31);
    }
    var rightShoulder = new THREE.Vector3(shoulderRX, 0, -0.55 * profile.torso);
    var rightElbow = new THREE.Vector3(0.69, groundY + 0.09, -0.10);
    var rightWrist = new THREE.Vector3(0.66, groundY + 0.055, 0.31);
    var cheekPalmNormal, cheekForward;
    if (handAtCheek) {
      // Find the posed cheek surface so the hand back rests outside the head.
      body.updateMatrixWorld(true);
      var cheekDirection = new THREE.Vector3(.195,.205,.035).normalize()
        .applyQuaternion(headPivot.getWorldQuaternion(new THREE.Quaternion()));
      var headWorld = headPivot.getWorldPosition(new THREE.Vector3());
      var cheekRay = new THREE.Raycaster(headWorld.clone().addScaledVector(cheekDirection,.8*profile.head*ageScale),cheekDirection.clone().negate());
      var cheekHit = cheekRay.intersectObject(skull,false)[0];
      var cheekSurface;
      if (cheekHit) {
        cheekSurface = body.worldToLocal(cheekHit.point.clone());
        cheekPalmNormal = cheekHit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(skull.matrixWorld)).normalize()
          .applyQuaternion(body.getWorldQuaternion(new THREE.Quaternion()).invert());
      } else {
        cheekPalmNormal = new THREE.Vector3(.7,.71,.08).normalize().applyQuaternion(headPivot.quaternion);
        cheekSurface = new THREE.Vector3(.195,.205,.035).multiplyScalar(profile.head)
          .applyQuaternion(headPivot.quaternion).add(headPivot.position);
      }
      cheekForward = new THREE.Vector3(0,0,-1).applyQuaternion(headPivot.quaternion);
      cheekForward.addScaledVector(cheekPalmNormal,-cheekForward.dot(cheekPalmNormal)).normalize();
      rightWrist = cheekSurface.clone().addScaledVector(cheekPalmNormal,.047).addScaledVector(cheekForward,-.085);
      // Solve the elbow from the original arm lengths and the cheek target.
      var flatElbow = new THREE.Vector3(.69,flatGroundY+.09,-.10);
      var flatWrist = new THREE.Vector3(.66,flatGroundY+.055,.31);
      var upperLength = span3(rightShoulder,flatElbow), foreLength = span3(flatElbow,flatWrist);
      var armDirection = rightWrist.clone().sub(rightShoulder), armDistance = armDirection.length();
      armDirection.normalize();
      var along = (upperLength*upperLength-foreLength*foreLength+armDistance*armDistance)/(2*armDistance);
      var bend = new THREE.Vector3(1,.4,0);
      bend.addScaledVector(armDirection,-bend.dot(armDirection)).normalize();
      rightElbow = rightShoulder.clone().addScaledVector(armDirection,along)
        .addScaledVector(bend,Math.sqrt(Math.max(0,upperLength*upperLength-along*along)));
    }
    var patientArms = new THREE.Group();
    patientArms.name = 'fr-patient-arms'; body.add(patientArms); meshes.patientArms = patientArms;
    [
      [leftShoulder, leftElbow, leftWrist],
      [rightShoulder, rightElbow, rightWrist]
    ].forEach(function (arm, index) {
      var id = index ? 'right' : 'left', sleeveEnd = arm[0].clone().lerp(arm[1], .42);
      shapedSegment(patientArms, arm[0], arm[1], [[0,.11],[.3,.112],[.7,.085],[1,.072]], skin, 'fr-patient-' + id + '-upper-arm');
      shapedSegment(patientArms, arm[0], sleeveEnd, [[0,.122],[.6,.12],[1,.098]], shirt, 'fr-patient-' + id + '-sleeve');
      shapedSegment(patientArms, arm[1], arm[2], [[0,.072],[.28,.087],[.65,.068],[1,.048]], skin, 'fr-patient-' + id + '-forearm');
      joint(patientArms, arm[1], .078, skin);
      var patientHand = new THREE.Group();
      patientHand.name = 'fr-patient-' + id + '-hand'; patientHand.position.copy(arm[2]);
      var handForward = arm[2].clone().sub(arm[1]).normalize();
      if (index && handAtCheek) handForward.copy(cheekForward);
      // Local +Y is the palm. Resting palms face the mat; the extended near
      // palm stays up in world space, including after the torso rolls.
      var palmNormal = new THREE.Vector3(0,-1,0);
      if (!index && armOut) palmNormal.set(Math.sin(rollAngle),Math.cos(rollAngle),0);
      else if (index && handAtCheek) {
        // The back of the far hand supports the cheek, so its palm faces out.
        palmNormal.copy(cheekPalmNormal);
      }
      palmNormal.addScaledVector(handForward,-palmNormal.dot(handForward)).normalize();
      var handSide = new THREE.Vector3().crossVectors(palmNormal,handForward).normalize();
      patientHand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(handSide,palmNormal,handForward));
      patientArms.add(patientHand);
      blob(patientHand, .048, .04, .055, skin, 0, 0, .015);
      var patientPalm = blob(patientHand, .078, .044, .095, skin, 0, 0, .085);
      patientPalm.name = 'fr-patient-' + id + '-palm';
      for (var f = 0; f < 4; f++) {
        var x = (f - 1.5) * .037, reach = [.225,.25,.235,.205][f];
        var fingerBase = new THREE.Vector3(x,0,.145), fingerBend = new THREE.Vector3(x,.012,.145+(reach-.145)*.55);
        var fingerTip = new THREE.Vector3(x,.027,reach);
        var finger = new THREE.Group(); finger.name = 'fr-patient-' + id + '-finger-' + f;
        shapedSegment(finger,fingerBase,fingerBend,[[0,.017],[1,.014]],skin);
        shapedSegment(finger,fingerBend,fingerTip,[[0,.014],[1,.011]],skin);
        joint(finger,fingerBend,.015,skin); joint(finger,fingerTip,.012,skin);
        patientHand.add(finger);
        var patientNail = blob(patientHand,.010,.002,.016,nailMaterial,x,.014,reach-.012);
        patientNail.name = 'fr-patient-' + id + '-nail-' + f;
      }
      var thumbSide = index ? 1 : -1;
      shapedSegment(patientHand, new THREE.Vector3(thumbSide*.067,0,.06), new THREE.Vector3(thumbSide*.104,-.008,.13), [[0,.023],[1,.016]], skin);
      var palmCrease = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(-.05,.034,.085),new THREE.Vector3(0,.045,.10),new THREE.Vector3(.05,.034,.10)
      ]),12,.002,6,false),skinDetail);
      palmCrease.name = 'fr-patient-' + id + '-palm-crease'; patientHand.add(palmCrease);
    });

    var hipL = new THREE.Vector3(-0.24 * profile.width, 0, 1.00 * profile.torso);
    var hipR = new THREE.Vector3(0.24 * profile.width, 0, 1.00 * profile.torso);
    var kneeL = new THREE.Vector3(-0.25, flatGroundY + .135, 1.62 * profile.limb);
    var ankleL = new THREE.Vector3(-0.25, flatGroundY + .09, 2.22 * profile.limb);
    if (didRoll) {
      // Settle the lower leg on the mat using its original segment lengths.
      var lowerThighLength = span3(hipL,kneeL), lowerShinLength = span3(kneeL,ankleL);
      var lowerHipX = hipL.x*Math.cos(rollAngle), lowerHipY = hipL.x*Math.sin(rollAngle);
      var lowerKneeY = groundY + .135, lowerAnkleY = groundY + .105;
      var lowerThighDrop = lowerHipY-lowerKneeY;
      var lowerKnee = fromWorld(lowerHipX,lowerKneeY), lowerAnkle = fromWorld(lowerHipX,lowerAnkleY);
      var lowerThighRun = Math.sqrt(Math.max(0,lowerThighLength*lowerThighLength-lowerThighDrop*lowerThighDrop));
      var lowerShinRun = Math.sqrt(Math.max(0,lowerShinLength*lowerShinLength-Math.pow(lowerAnkleY-lowerKneeY,2)));
      kneeL = new THREE.Vector3(lowerKnee.x,lowerKnee.y,hipL.z+lowerThighRun);
      ankleL = new THREE.Vector3(lowerAnkle.x,lowerAnkle.y,kneeL.z+lowerShinRun);
    }
    // The far leg is the lever, and after the roll it is the TOP leg. Squaring
    // it — hip and knee both at right angles, knee resting forward on the mat —
    // is what stops them rolling onto their front once you let go, so it has to
    // be its own visible change rather than the pose it was already in.
    //
    // The squared pose is DERIVED from the hip and from this figure's own thigh
    // and shin lengths rather than hard-coded, so it holds at every age and the
    // leg cannot silently stretch. Hand-picked world coordinates gave an adult a
    // thigh 31% longer than the one it started with.
    var kneeFlatR = new THREE.Vector3(0.25, flatGroundY + .135, 1.62 * profile.limb);
    var ankleFlatR = new THREE.Vector3(0.25, flatGroundY + .09, 2.22 * profile.limb);
    var thighLen = span3(hipR, kneeFlatR);
    var shinLen = span3(kneeFlatR, ankleFlatR);
    var kneeR, ankleR;
    if (didStable) {
      var rc2 = Math.cos(rollAngle), rs2 = Math.sin(rollAngle);
      var hipWx = hipR.x * rc2 - hipR.y * rs2;
      var hipWy = hipR.x * rs2 + hipR.y * rc2;
      // The step asks for right angles at the hip and knee, not for the knee to
      // be on the floor — and on this figure those are different requests. Its
      // thigh is barely longer than the torso is wide, so aiming the knee at
      // the mat used the whole thigh on the drop and left the leg hanging
      // straight down beside the body instead of squared in front of it.
      // So: thigh forward and down across the body, then the shin drops to the
      // mat so the foot rests rather than floats. Both segments keep the
      // figure's own lengths, so nothing stretches to reach a target.
      var kneeWx = hipWx - thighLen * Math.cos(STABLE_THIGH_ANGLE);
      var kneeWy = hipWy - thighLen * Math.sin(STABLE_THIGH_ANGLE);
      var shinDrop = Math.min(shinLen * 0.96, Math.max(0, kneeWy - (groundY + 0.12)));
      var shinRun = Math.sqrt(Math.max(0, shinLen * shinLen - shinDrop * shinDrop));
      var kneeW = fromWorld(kneeWx, kneeWy);
      var ankleW = fromWorld(kneeWx, kneeWy - shinDrop);
      kneeR = new THREE.Vector3(kneeW.x, kneeW.y, hipR.z);
      ankleR = new THREE.Vector3(ankleW.x, ankleW.y, hipR.z + shinRun);
    } else if (kneeUp) {
      // The knee lift is proportional to this figure's thigh. A fixed lift
      // stretched the infant thigh by a third before the body even rolled.
      var kneeAcross = .08 * profile.limb, kneeLift = .64 * thighLen;
      var thighRun = Math.sqrt(Math.max(0, thighLen*thighLen - kneeAcross*kneeAcross - kneeLift*kneeLift));
      kneeR = new THREE.Vector3(hipR.x + kneeAcross, hipR.y + kneeLift, hipR.z + thighRun);
      // Allow for the shoe rotating onto its sole as the heel comes inward.
      var bentAnkleY = flatGroundY + .115;
      var ankleAcross = .02 * profile.limb, ankleDrop = kneeR.y - bentAnkleY;
      var bentShinRun = Math.sqrt(Math.max(0, shinLen*shinLen - ankleAcross*ankleAcross - ankleDrop*ankleDrop));
      ankleR = new THREE.Vector3(kneeR.x + ankleAcross, bentAnkleY, kneeR.z + bentShinRun);
    } else {
      kneeR = kneeFlatR;
      ankleR = ankleFlatR;
    }
    var legs = new THREE.Group();
    legs.name = 'fr-patient-legs'; body.add(legs); meshes.legs = legs;
    function shoeSurface(sole) {
      // A rounded heel, fuller toe box and a flat sole form one closed shell.
      var sections = [[-.07,.012,.025],[-.035,.074,.085],[.03,.095,.092],[.12,.106,.067],[.25,.10,.052],[.31,.06,.04],[.335,.008,.012]];
      var around = 32, positions = [], indices = [], rings = [];
      for (var s = 0; s < sections.length - 1; s++) for (var j = 0; j < 4; j++) {
        var t = j/4, u = t*t*(3-2*t), a = sections[s], b = sections[s+1];
        rings.push([a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*u, a[2]+(b[2]-a[2])*u]);
      }
      rings.push(sections[sections.length-1]);
      rings.forEach(function (ring, i) {
        for (var j = 0; j < around; j++) {
          var angle = j/around*Math.PI*2, sine = Math.sin(angle);
          var y = sole ? -.067 + .009*sine : -.042 + (sine > 0 ? ring[2] : .025)*sine;
          positions.push(Math.cos(angle)*ring[1]*(sole ? 1.025 : 1), y, ring[0]);
          var next = (j+1)%around;
          if (i) { var p = (i-1)*around;
            indices.push(p+j, i*around+next, i*around+j, p+j, p+next, i*around+next); }
        }
      });
      var first = positions.length/3; positions.push(0,sole ? -.067 : -.042,rings[0][0]);
      var last = positions.length/3; positions.push(0,sole ? -.067 : -.042,rings[rings.length-1][0]);
      for (var j = 0; j < around; j++) {
        var next = (j+1)%around, end = (rings.length-1)*around;
        indices.push(first,next,j,last,end+j,end+next);
      }
      var geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setIndex(indices); geometry.computeVertexNormals();
      return geometry;
    }
    var soleMaterial = material(0x455362, 16, null, 0xaaaaaa);
    var shoeGeometry = shoeSurface(false), soleGeometry = shoeSurface(true);
    [[hipL, kneeL, ankleL], [hipR, kneeR, ankleR]].forEach(function (leg, index) {
      var id = index ? 'right' : 'left', prefix = 'fr-patient-' + id;
      shapedSegment(legs, leg[0], leg[1], [[0,.155],[.25,.17],[.65,.145],[1,.12]], trousers, prefix + '-thigh');
      shapedSegment(legs, leg[1], leg[2], [[0,.12],[.25,.135],[.6,.108],[1,.08]], trousers, prefix + '-shin');
      joint(legs, leg[1], .125, trousers).name = prefix + '-knee';
      var shinDirection = leg[2].clone().sub(leg[1]).normalize();
      var toeDirection = new THREE.Vector3(0,1,0).addScaledVector(shinDirection,-shinDirection.y).normalize();
      var footUp = shinDirection.clone().negate(), footRight = footUp.clone().cross(toeDirection).normalize();
      var foot = new THREE.Group(); foot.name = prefix + '-foot'; foot.position.copy(leg[2]);
      foot.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(footRight,footUp,toeDirection));
      var upper = new THREE.Mesh(shoeGeometry,shoe); upper.name = prefix + '-shoe'; foot.add(upper);
      var sole = new THREE.Mesh(soleGeometry,soleMaterial); sole.name = prefix + '-sole'; foot.add(sole);
      // The cuff overlaps the heel collar; there is no exposed gap at the ankle.
      shapedSegment(legs,leg[2].clone().addScaledVector(shinDirection,-.075),leg[2],
        [[0,.085],[.65,.083],[1,.074]],trousers,prefix + '-cuff');
      legs.add(foot);
    });

    // Teaching overlay: sternum, ribs, lungs and a stylized heart. It is shown
    // only where anatomy supports the current question, never as decoration.
    var anatomy = new THREE.Group();
    anatomy.visible = mode === 'place' || mode === 'depth' || mode === 'coach';
    body.add(anatomy);
    var sternum = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.035, 0.72), bone);
    sternum.position.set(0, 0.27, -0.18);
    anatomy.add(sternum);
    for (var ri = 0; ri < 5; ri++) {
      var rib = new THREE.Mesh(new THREE.TorusGeometry(0.30 + ri * 0.038, 0.014, 7, 30), bone);
      rib.rotation.x = Math.PI / 2;
      rib.scale.z = 0.46;
      rib.position.set(0, 0.255, -0.48 + ri * 0.15);
      anatomy.add(rib);
    }
    var lungs = new THREE.Group();
    lungs.name = 'fr-schematic-lungs';
    lungs.visible = mode !== 'place';
    blob(lungs, 0.19, 0.045, 0.37, lungMat, -0.23, 0.29, -0.25);
    blob(lungs, 0.19, 0.045, 0.37, lungMat, 0.23, 0.29, -0.25);
    anatomy.add(lungs);
    var heart = new THREE.Group();
    heart.name = 'fr-schematic-heart';
    heart.visible = mode !== 'place';
    blob(heart, 0.10, 0.045, 0.11, heartMat, -0.055, 0, 0);
    blob(heart, 0.10, 0.045, 0.11, heartMat, 0.055, 0, 0);
    var heartTip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.26, 18), heartMat);
    heartTip.rotation.x = Math.PI / 2;
    heartTip.position.set(0, 0, 0.10);
    heart.add(heartTip);
    heart.position.set(-0.10, 0.31, -0.10);
    anatomy.add(heart);

    // Age-specific rescuer hand rig. Infant CPR now uses heel-of-one-hand by
    // default (2025 AHA/AAP), never the obsolete two-finger technique.
    var hands = new THREE.Group();
    hands.visible = mode === 'depth' || mode === 'coach';
    var handSize = age === 'adult' ? 1 : (age === 'child' ? 0.88 : 0.76);
    var baseHandsY = (0.64 * ageScale) + (age === 'infant' ? 0.08 : 0.03);
    hands.position.set(0, baseHandsY, -0.18 * ageScale);
    api.scene.add(hands);
    function rescuerHand(y, turn, id) {
      var hand = new THREE.Group();
      hand.name = 'fr-rescuer-' + id;
      hand.position.y = y;
      hand.rotation.y = turn;
      // Centre the heel, rather than the palm, on the breastbone. The same
      // offset aligns the upper heel directly over the lower one when stacked.
      hand.position.x = -Math.sin(turn) * 0.075 * handSize;
      hand.position.z = -Math.cos(turn) * 0.075 * handSize;
      hands.add(hand);
      blob(hand, 0.10 * handSize, 0.032, 0.13 * handSize, skin, 0, 0.004, -0.025 * handSize);
      // The heel stays at the contact plane. Rounded, raised fingers make the
      // load-bearing part of the hand distinguishable from the fingertips.
      var heel = blob(hand, 0.085 * handSize, 0.036, 0.065 * handSize, skin, 0, 0, 0.075 * handSize);
      heel.name = 'fr-rescuer-' + id + '-heel';
      var wristBridge = blob(hand,.070*handSize,.034,.062*handSize,skin,0,.030,.125*handSize);
      wristBridge.name = 'fr-rescuer-' + id + '-wrist-bridge';
      for (var fi = 0; fi < 4; fi++) {
        var fx = (fi - 1.5) * 0.047 * handSize;
        var length = (fi === 0 || fi === 3 ? 0.23 : 0.265) * handSize;
        var base = new THREE.Vector3(fx, 0.018, -0.105 * handSize);
        var knuckle = new THREE.Vector3(fx, 0.028, -length * 0.72);
        var tip = new THREE.Vector3(fx, 0.055, -length);
        var finger = new THREE.Group();
        finger.name = 'fr-rescuer-' + id + '-finger-' + fi;
        shapedSegment(finger, base, knuckle, [[0,.020*handSize],[.5,.020*handSize],[1,.019*handSize]], skin);
        shapedSegment(finger, knuckle, tip, [[0,.019*handSize],[.5,.018*handSize],[1,.015*handSize]], skin);
        joint(finger, knuckle, 0.021 * handSize, skin);
        joint(finger, tip, 0.018 * handSize, skin);
        hand.add(finger);
        var nail = blob(hand, .014*handSize, .003*handSize, .021*handSize, nailMaterial, fx, .071, -length+.014*handSize);
        nail.name = 'fr-rescuer-' + id + '-nail-' + fi;
      }
      shapedSegment(hand, new THREE.Vector3(-0.082 * handSize, 0.008, 0.018 * handSize),
        new THREE.Vector3(-0.14 * handSize, 0.046, -0.075 * handSize), [[0,.027*handSize],[.45,.025*handSize],[1,.019*handSize]], skin);
      joint(hand, new THREE.Vector3(-0.14 * handSize, 0.046, -0.075 * handSize), 0.025 * handSize, skin);
      var wrist = new THREE.Vector3(0, 0.055, 0.15 * handSize);
      // Both elbows and sleeve ends share a height despite the stacked palms.
      // The wrist-to-elbow axis stays straight as the whole rig follows the chest.
      var elbow = new THREE.Vector3(0, 0.46-y, wrist.z);
      var shoulder = new THREE.Vector3(0, 0.90-y, wrist.z);
      joint(hand, wrist, 0.053 * handSize, skin);
      var forearm = shapedSegment(hand, wrist, elbow, [[0,.048*handSize],[.35,.068*handSize],[.7,.063*handSize],[1,.055*handSize]], skin, 'fr-rescuer-' + id + '-forearm');
      joint(hand, elbow, 0.057 * handSize, skin);
      shapedSegment(hand, elbow, shoulder, [[0,.055*handSize],[.4,.070*handSize],[.8,.068*handSize],[1,.060*handSize]], skin, 'fr-rescuer-' + id + '-upper-arm');
      shapedSegment(hand, new THREE.Vector3(0,shoulder.y-.17,shoulder.z), new THREE.Vector3(0,shoulder.y+.10,shoulder.z),
        [[0,.072*handSize],[.45,.075*handSize],[1,.068*handSize]], trousers, 'fr-rescuer-' + id + '-sleeve');
      return hand;
    }
    rescuerHand(0, Math.PI / 2, 'lower');
    var upperHand = age === 'adult' || age === 'child' ? rescuerHand(0.071, -Math.PI / 2, 'upper') : null;
    if (upperHand) upperHand.visible = age === 'adult' || sp.childHands === 'two';
    meshes.arms = hands;
    // The existing centre-of-chest part also provides a focus target on this
    // tab, without adding a pickable answer region to the mechanics lesson.
    if (mode === 'depth') meshes.correct = chestRig;

    var guideMat = material(api.contrast ? 0xffffff : 0xfbbf24, 25, 0.62);
    var guideRing = new THREE.Mesh(new THREE.RingGeometry(0.27, 0.31, 48), guideMat);
    guideRing.rotation.x = -Math.PI / 2;
    guideRing.position.set(0, baseHandsY - 0.08, -0.18 * ageScale);
    guideRing.visible = mode === 'coach';
    api.scene.add(guideRing);

    // An AED pad is a fixed piece of plastic. It does not shrink when the
    // patient does, so on the pad tab the plates are counter-scaled out of the
    // body's age scale and drawn at true adult size against whatever chest is
    // in front of you. That single change is what makes "two pads will not fit
    // on a baby" a thing you can see rather than a sentence you have to trust.
    var padTrueSize = mode === 'aed' ? 1 / Math.max(0.2, ageScale) : 1;
    function patch(id, w, hgt, x, z, opts) {
      var o = opts || {};
      var group = new THREE.Group();
      var visibleMat = material(api.contrast ? 0xffffff : 0x38bdf8, 24, o.behind ? 0.5 : 0.34);
      var plate = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(w, hgt) * 0.48, Math.max(w, hgt) * 0.48, 0.045, 24), visibleMat);
      plate.scale.set(w / Math.max(w, hgt), 1, hgt / Math.max(w, hgt));
      plate.userData.partId = id;
      if (o.behind) {
        // The back pad is underneath the patient, so the torso would hide it
        // completely from the default overhead view. Draw it through the body
        // instead of asking the learner to rotate before the layout makes any
        // sense — the point of the picture is the pad being BEHIND the heart.
        plate.material.depthTest = false;
        plate.material.depthWrite = false;
        plate.renderOrder = 3;
      }
      group.add(plate);
      group.position.set(x, o.y != null ? o.y : 0.30, z);
      group.userData.partId = id;
      picks.push(plate);
      body.add(group);
      meshes[id] = group;
    }
    if (mode === 'aed' && age === 'infant') {
      // Front-and-back, because the diagonal front pair does not fit. The back
      // pad sits below the torso at the level of the shoulder blades, which is
      // where it actually goes, so the heart still ends up between the two.
      patch('padFront', 0.36 * padTrueSize, 0.34 * padTrueSize, 0, -0.24);
      patch('padBack', 0.36 * padTrueSize, 0.34 * padTrueSize, 0, -0.50, { y: -0.30, behind: true });
      patch('padTogether', 0.34 * padTrueSize, 0.30 * padTrueSize, 0.30, -0.52);
      patch('padBelly', 0.42 * padTrueSize, 0.36 * padTrueSize, 0, 0.60);
    } else if (mode === 'aed') {
      patch('padUR', 0.36 * padTrueSize, 0.34 * padTrueSize, -0.30, -0.52);
      patch('padLL', 0.36 * padTrueSize, 0.34 * padTrueSize, 0.32, 0.16);
      patch('padTogether', 0.34 * padTrueSize, 0.30 * padTrueSize, 0.30, -0.52);
      patch('padBelly', 0.42 * padTrueSize, 0.36 * padTrueSize, 0, 0.60);
    } else if (mode === 'place') {
      patch('high', 0.34, 0.34, 0, -0.60);
      patch('correct', 0.34, 0.36, 0, -0.20);
      patch('low', 0.34, 0.26, 0, 0.13);
      patch('belly', 0.42, 0.40, 0, 0.55);
      patch('sideL', 0.28, 0.90, -0.36, -0.20);
      patch('sideR', 0.28, 0.90, 0.36, -0.20);
    }

    if (api.wantShadow) {
      body.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
      hands.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    }

    // A fixed resting-height guide and moving marker make residual leaning visible.
    // The guide is outside the torso; all dimensions scale with this manikin.
    chestRig.name = 'fr-depth-chest';
    anatomy.name = 'fr-depth-anatomy';
    hands.name = 'fr-depth-hands';
    var depthGuide = new THREE.Group();
    depthGuide.name = 'fr-depth-guide';
    depthGuide.visible = false;
    var restHeight = body.position.y + 0.25 * ageScale;
    var referenceMat = teachingMaterial(0x5eead4);
    var movingMat = teachingMaterial(0xfbbf24);
    var rail = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.32, 0.018), material(0x94a3b8, 6));
    rail.position.set(-0.82 * ageScale, restHeight - 0.16 * ageScale, -0.18 * ageScale);
    rail.scale.y = ageScale;
    depthGuide.add(rail);
    var restLine = new THREE.Mesh(new THREE.BoxGeometry(1.65 * ageScale, 0.008, 0.016), referenceMat);
    restLine.name = 'fr-depth-resting-line';
    restLine.position.set(0, restHeight, -0.18 * ageScale);
    depthGuide.add(restLine);
    var depthMark = new THREE.Mesh(new THREE.BoxGeometry(0.24 * ageScale, 0.018, 0.05), referenceMat);
    depthMark.name = 'fr-depth-reference';
    depthMark.position.set(-0.82 * ageScale, restHeight, -0.18 * ageScale);
    depthGuide.add(depthMark);
    var movingMark = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 10), movingMat);
    movingMark.name = 'fr-depth-marker';
    movingMark.position.set(-0.82 * ageScale, restHeight, -0.18 * ageScale);
    depthGuide.add(movingMark);
    // Saved A is a separate square marker at the same cycle position as B.
    var savedMark = new THREE.Group();
    savedMark.name = 'fr-depth-saved';
    savedMark.visible = false;
    // Sharing x/z with B prevents camera perspective from reversing the apparent height difference.
    savedMark.position.set(-0.82 * ageScale, restHeight, -0.18 * ageScale);
    var savedMat = teachingMaterial(0xc4b5fd);
    savedMat.wireframe = true;
    savedMark.add(new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.095, 0.045), savedMat));
    depthGuide.add(savedMark);
    // This arrow describes chest movement, not a force or a measured compression.
    var directionArrow = new THREE.Group();
    var arrowMat = teachingMaterial(0x7dd3fc);
    segment(directionArrow, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.195 * ageScale, 0), 0.012 * ageScale, arrowMat);
    var arrowTip = new THREE.Mesh(new THREE.ConeGeometry(0.034 * ageScale, 0.085 * ageScale, 12), arrowMat);
    arrowTip.position.y = 0.2375 * ageScale;
    directionArrow.add(arrowTip);
    directionArrow.name = 'fr-depth-direction';
    directionArrow.visible = false;
    depthGuide.add(directionArrow);
    // Centimetre ticks and a capped span show movement between release and
    // peak, separately from depth measured from the resting height.
    var measureGuide = new THREE.Group();
    measureGuide.name = 'fr-depth-measure';
    measureGuide.visible = false;
    var chestCm = age === 'infant' ? 12 : age === 'child' ? 15 : 18;
    var maxCm = age === 'infant' ? 5.5 : age === 'child' ? 6.5 : 7;
    var cmWorld = 0.5 * ageScale / chestCm;
    var measureMat = teachingMaterial(0xf1f5f9);
    for (var cm = 0; cm <= Math.floor(maxCm); cm++) {
      var graduation = new THREE.Mesh(new THREE.BoxGeometry(0.075 * ageScale, 0.006 * ageScale, 0.022 * ageScale), measureMat);
      graduation.position.set(-0.82 * ageScale, restHeight - cm * cmWorld, -0.18 * ageScale);
      graduation.userData.centimetres = cm;
      measureGuide.add(graduation);
    }
    var travelSpan = new THREE.Mesh(new THREE.BoxGeometry(0.012 * ageScale, 1, 0.022 * ageScale), measureMat);
    travelSpan.name = 'fr-depth-travel';
    measureGuide.add(travelSpan);
    var releaseCap = new THREE.Mesh(new THREE.BoxGeometry(0.14 * ageScale, 0.010 * ageScale, 0.035 * ageScale), measureMat);
    releaseCap.name = 'fr-depth-travel-release';
    measureGuide.add(releaseCap);
    var peakCap = new THREE.Mesh(releaseCap.geometry, measureMat);
    peakCap.name = 'fr-depth-travel-peak';
    measureGuide.add(peakCap);
    depthGuide.add(measureGuide);
    api.scene.add(depthGuide);

    return {
      meshes: meshes,
      picks: picks,
      anchor: ground,
      // Recovery-position landmarks in WORLD space, for tests. The pose is the
      // teaching content of that tab and a screenshot can only say "something
      // changed" — which the broken schedule satisfied, because the body kept
      // rotating during steps that were supposed to move a head or a leg.
      // The shell ignores keys it does not use.
      landmarks: (function () {
        function toWorld(p) {
          var rc = Math.cos(rollAngle), rs = Math.sin(rollAngle);
          return {
            x: ageScale * (p.x * rc - p.y * rs),
            y: (bodyLift * ageScale) + ageScale * (p.x * rs + p.y * rc),
            z: ageScale * p.z
          };
        }
        return {
          rollAngle: rollAngle,
          headTiltX: baseHeadTiltX,
          headRollZ: headPivot.rotation.z,
          nearShoulder: toWorld(leftShoulder),
          nearElbow: toWorld(leftElbow),
          nearWrist: toWorld(leftWrist),
          topKnee: toWorld(kneeR),
          topAnkle: toWorld(ankleR),
          topHip: toWorld(hipR),
          // Body-frame copies. World positions alone cannot tell "the leg was
          // re-posed" from "the whole body rotated underneath it" — which is
          // exactly how the broken schedule made the top-leg step look like it
          // worked when it did nothing.
          topKneeLocal: { x: kneeR.x, y: kneeR.y, z: kneeR.z },
          topHipLocal: { x: hipR.x, y: hipR.y, z: hipR.z }
        };
      })(),
      frame: function (tick, nextProps, reduced) {
        var coach = nextProps.coach || {};
        if (upperHand) upperHand.visible = age === 'adult' || nextProps.childHands === 'two';
        if (mode === 'place') {
          // Reveal the example only after the learner locates the supported
          // chest region. Other selections keep their existing explanation.
          hands.visible = nextProps.placed === 'correct';
        }
        // Read live from props, NOT from the build-time sceneProps: switching
        // mechanic must change the motion without tearing the scene down, so
        // `mech` is deliberately absent from sceneKey.
        var mechDemo = nextProps.mech || null;
        var gateDemo = nextProps.gate || null;
        var now = Date.now();
        var compression = 0;
        var breathRise = 0;
        var guidePulse = 0;
        if (!reduced && mode === 'depth') {
          // Demonstrate the mechanic the learner actually picked, instead of
          // always modelling perfect technique. Reading "shallow compressions
          // do not move enough blood" is weaker than watching a chest barely
          // move; leaning is invisible in prose and obvious the moment the
          // chest never comes back up. Amplitudes are relative to the correct
          // stroke, and `floor` is residual compression left at the top.
          var stroke = 0.72, floor = 0;
          if (mechDemo === 'shallow') stroke = 0.26;
          else if (mechDemo === 'toodeep') stroke = 0.98;
          else if (mechDemo === 'lean') { stroke = 0.52; floor = 0.30; }
          compression = floor + Math.pow(Math.max(0, Math.sin(now / 720)), 6) * stroke;
        }
        // The breathing gate is the highest-stakes decision in this tool, and the
        // figure used to lie perfectly still while the learner made it. Agonal
        // gasping is not "slow breathing" — it is a few sharp, isolated gasps
        // separated by long dead pauses, and bystanders lose people by reading
        // that as breathing. RHYTHM is the whole lesson, so the two patterns are
        // driven by time, not by amplitude.
        if (!reduced && mode === 'gate' && gateDemo) {
          if (gateDemo === 'breathing') {
            // Regular and unmistakably continuous: about 14 breaths a minute.
            var cyc = (now % 4300) / 4300;
            breathRise = (1 - Math.cos(cyc * Math.PI * 2)) / 2;
          } else if (gateDemo === 'notbreathing') {
            // About 7 a minute, and each one is a brief snatch of air with a
            // long flat gap after it. The gap is the tell.
            var ag = (now % 8200) / 8200;
            breathRise = ag < 0.16 ? Math.pow(Math.sin((ag / 0.16) * Math.PI), 3) * 0.85 : 0;
          }
        }
        if (!reduced && mode === 'coach') {
          if (coach.running && coach.phase === 'compressions') {
            var beatMs = 60000 / Math.max(100, Math.min(120, coach.bpm || 110));
            var beatPhase = ((now - (coach.startedAt || now)) % beatMs) / beatMs;
            guidePulse = beatPhase < 0.26 ? Math.sin((beatPhase / 0.26) * Math.PI) : 0;
          }
          if (coach.mode === 'scenario' && coach.activeCompressionAt) {
            compression = Math.max(compression, 0.62);
          }
          var sinceCompression = now - (coach.lastCompressionAt || 0);
          if (sinceCompression >= 0 && sinceCompression < 310) {
            compression = Math.pow(1 - sinceCompression / 310, 2);
          }
          var sinceBreath = now - (coach.lastBreathAt || 0);
          if (sinceBreath >= 0 && sinceBreath < 1000) breathRise = sinceBreath / 1000;
          else if (sinceBreath >= 1000 && sinceBreath < 1500) breathRise = 1 - (sinceBreath - 1000) / 500;
        }
        // On the gate tab the chest IS the evidence — the internal anatomy is
        // hidden there, exactly as a bystander sees it — so give the breath a
        // larger excursion. Elsewhere it stays subtle so it cannot be mistaken
        // for a compression.
        var breathAmp = mode === 'gate' ? 0.15 : 0.07;
        chestRig.scale.y = 1 - compression * 0.13 + breathRise * breathAmp;
        hands.position.y = baseHandsY - compression * 0.10 + ((!reduced && (coach.phase === 'breaths' || coach.phase === 'breathRecovery')) ? 0.18 : 0);
        if (mode === 'place') hands.position.y = restHeight + 0.036;
        if (mode === 'coach') {
          var coachSurfaceY = body.position.y + 0.25*ageScale*chestRig.scale.y;
          hands.position.y = coachSurfaceY + 0.036 + ((!reduced && (coach.phase === 'breaths' || coach.phase === 'breathRecovery')) ? 0.18 : 0);
          guideRing.position.y = coachSurfaceY + 0.012;
        }
        lungs.scale.y = 1 + breathRise * 0.24;
        heart.scale.setScalar(1 + compression * 0.10);
        // New explorer settings are live props: controls never rebuild the canvas.
        var depthLab = mode === 'depth' && nextProps.depthLab
          ? compressionLabSettings(age, nextProps.depthLab, null) : null;
        depthGuide.visible = !!depthLab;
        var savedDepth = depthLab && compressionLabReference(age, nextProps.depthReference);
        savedMark.visible = !!savedDepth;
        if (depthLab) {
          var sampled = compressionLabSample(depthLab, tick, reduced);
          if (savedDepth) {
            var savedSample = compressionLabSample(Object.assign({}, depthLab, savedDepth), tick, reduced);
            savedMark.position.y = restHeight - savedSample.fraction * 0.5 * ageScale;
          }
          var localDrop = sampled.fraction * 0.5;
          var worldDrop = localDrop * ageScale;
          // Keep the back of the chest fixed on the mat while its front moves.
          chestRig.scale.y = 1 - sampled.fraction;
          chestRig.position.y = -localDrop / 2;
          anatomy.position.y = -localDrop;
          anatomy.visible = depthLab.anatomy;
          hands.visible = depthLab.hands;
          measureGuide.visible = depthLab.measure;
          var releaseY = restHeight - depthLab.lean * cmWorld;
          var peakY = restHeight - depthLab.depth * cmWorld;
          releaseCap.position.set(0.82 * ageScale, releaseY, -0.18 * ageScale);
          peakCap.position.set(0.82 * ageScale, peakY, -0.18 * ageScale);
          travelSpan.position.set(0.88 * ageScale, (releaseY + peakY) / 2, -0.18 * ageScale);
          travelSpan.scale.y = releaseY - peakY;
          travelSpan.visible = releaseY > peakY;
          hands.position.y = restHeight + 0.036 - worldDrop;
          movingMark.position.y = restHeight - worldDrop;
          directionArrow.visible = sampled.direction !== 0;
          if (sampled.direction) {
            directionArrow.rotation.z = sampled.direction < 0 ? Math.PI : 0;
            directionArrow.position.set(-1.02 * ageScale, restHeight - worldDrop - sampled.direction * 0.14 * ageScale, -0.18 * ageScale);
          }
          depthMark.position.y = restHeight - depthLab.reference / depthLab.chestCm * 0.5 * ageScale;
          heart.scale.setScalar(1);
        }
        // Airway. The head does not just nod along with the breath — during the
        // breath phase it is HELD in the position that opens the airway, and how
        // far back that is depends entirely on age. An adult tilts well back; an
        // infant stays near neutral, because over-extending a short soft trachea
        // kinks it shut. Showing the same tilt for all three ages would teach the
        // one thing that makes infant rescue breathing fail.
        var airwayHold = 0;
        if (mode === 'coach' && coach.running
            && (coach.phase === 'breaths' || coach.phase === 'breathRecovery')) airwayHold = 1;
        else if (mode === 'coach' && breathRise > 0) airwayHold = breathRise;
        headPivot.rotation.x = baseHeadTiltX + (airwayHold * ageAirwayTilt * AIRWAY_TILT_MAX) + (breathRise * -0.04);
        guideRing.scale.setScalar(1 + guidePulse * 0.20);
        guideMat.opacity = reduced ? 0.55 : (0.42 + guidePulse * 0.45);
        if (heartMat.emissive) heartMat.emissive.setRGB(0.18 + compression * 0.42, 0.01, 0.04);
      }
    };
  }
  // Shared 3D viewer shell, from the host (beside ensureThree). If the host is
  // absent this degrades to a permanently-failed viewer and the module falls
  // back to its 2D controls, which carry the whole lesson anyway.
  var FR_NULL_VIEWER = {
    attach: function () {}, sync: function () {}, nudge: function () {},
    zoom: function () {}, reset: function () {}, status: function () { return 'failed'; }
  };
  var BODY3D = (function () {
    var mk = (typeof window !== 'undefined') && window.StemLab && window.StemLab.makeBayViewer;
    if (!mk) return FR_NULL_VIEWER;
    return mk({
      parts: BODY_SCENE_PARTS,
      buildScene: buildBodyScene,
      minDistance: 1.1,
      home: { yaw: 0.1, pitch: 0.86, dist: 6.8, target: { x: 0, y: 0.30, z: 0.55 } }
    });
  })();

  // ── Live-region announcers (rate-limited; mirror RoadReady pattern) ──
  var _frPoliteTimer = null, _frAssertTimer = null;
  function frAnnounce(text) {
    if (typeof document === 'undefined') return;
    var lr = document.getElementById('allo-live-firstresponse');
    if (!lr) return;
    if (_frPoliteTimer) clearTimeout(_frPoliteTimer);
    lr.textContent = '';
    _frPoliteTimer = setTimeout(function() { lr.textContent = String(text || ''); _frPoliteTimer = null; }, 25);
  }
  function frAnnounceUrgent(text) {
    if (typeof document === 'undefined') return;
    var lr = document.getElementById('allo-live-firstresponse-assert');
    if (!lr) return;
    if (_frAssertTimer) clearTimeout(_frAssertTimer);
    lr.textContent = '';
    _frAssertTimer = setTimeout(function() { lr.textContent = String(text || ''); _frAssertTimer = null; }, 25);
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 1: CONSTANTS — resources, Maine EMS, recognize cards
  // Clinical numbers checked against AHA/AAP 2025 / Red Cross / Stop the Bleed / Epilepsy
  // Foundation / SAMHSA guidance, with resuscitation guidance checked 2026-08.
  // ─────────────────────────────────────────────────────────

  // External resource directory. Every clinical claim in this tool traces back
  // to one of these orgs. Phone numbers verified 2026-04. Disability-advocacy
  // section deliberately uses ASAN, NOT Autism Speaks (community-trust reasons).
  var RESOURCES = {
    emergency: [
      { name: '911', contact: 'Call 911', desc: 'Police, fire, EMS — anywhere in the US.', url: null, icon: '🚑' },
      { name: 'Text-to-911 (Maine)', contact: 'Text 911', desc: 'For deaf/HoH/speech-disabled or unsafe-to-speak. Maine has it; check coverage at maine.gov/dps/911.', url: 'https://www.maine.gov/dps/911', icon: '💬' },
      { name: 'Poison Control', contact: '1-800-222-1222', desc: 'Free 24/7. Ingestion, exposure, overdose questions.', url: 'https://www.poison.org', icon: '☠️' }
    ],
    crisis: [
      { name: '988 Suicide & Crisis Lifeline', contact: 'Call or text 988', desc: 'Free, confidential, 24/7. Maine routes to in-state counselors.', url: 'https://988lifeline.org', icon: '📞' },
      { name: 'Crisis Text Line', contact: 'Text HOME to 741741', desc: 'Free crisis counseling via text.', url: 'https://www.crisistextline.org', icon: '📱' },
      { name: 'Trans Lifeline', contact: '1-877-565-8860', desc: 'Peer support by and for trans people. No active rescue policy.', url: 'https://translifeline.org', icon: '🌈' },
      { name: 'NAMI HelpLine', contact: '1-800-950-NAMI (6264)', desc: 'Mental health info, support, referrals. Mon–Fri 10am–10pm ET.', url: 'https://www.nami.org/help', icon: '🧠' },
      { name: 'SAMHSA National Helpline', contact: '1-800-662-HELP (4357)', desc: 'Treatment referrals, mental health + substance use. Free, confidential, 24/7.', url: 'https://www.samhsa.gov/find-help/national-helpline', icon: '💚' }
    ],
    certification: [
      { name: 'American Heart Association', contact: 'cpr.heart.org', desc: 'Find a CPR/AED/First Aid course near you.', url: 'https://cpr.heart.org', icon: '❤️' },
      { name: 'American Red Cross', contact: 'redcross.org/take-a-class', desc: 'In-person and blended CPR, First Aid, BLS, lifeguard.', url: 'https://www.redcross.org/take-a-class', icon: '✚' },
      { name: 'Stop the Bleed', contact: 'stopthebleed.org', desc: 'Free bleeding-control training. Find a class or take the online module.', url: 'https://www.stopthebleed.org', icon: '🩸' },
      { name: 'FEMA Teen CERT', contact: 'community.fema.gov', desc: 'Community Emergency Response Team training for teens.', url: 'https://community.fema.gov', icon: '🛡️' },
      { name: 'Maine EMS', contact: 'maine.gov/ems', desc: 'State EMS office; EMR/EMT course listings.', url: 'https://www.maine.gov/ems', icon: '🌲' }
    ],
    conditions: [
      { name: 'Epilepsy Foundation', contact: 'epilepsy.com', desc: 'Seizure first aid, recognition, advocacy. Run by people with epilepsy.', url: 'https://www.epilepsy.com', icon: '⚡' },
      { name: 'American Diabetes Association', contact: 'diabetes.org', desc: 'Hypoglycemia + DKA recognition; school-staff guidance.', url: 'https://www.diabetes.org', icon: '🩺' },
      { name: 'FARE (Food Allergy Research & Education)', contact: 'foodallergy.org', desc: 'Anaphylaxis recognition + EpiPen guidance.', url: 'https://www.foodallergy.org', icon: '🦜' },
      { name: 'American Stroke Association', contact: 'stroke.org', desc: 'BE FAST stroke recognition.', url: 'https://www.stroke.org', icon: '🧠' }
    ],
    disabilityAdvocacy: [
      { name: 'Autistic Self Advocacy Network (ASAN)', contact: 'autisticadvocacy.org', desc: 'By and for autistic people. "Nothing about us without us."', url: 'https://autisticadvocacy.org', icon: '♾️' },
      { name: 'Hearing Loss Association of America', contact: 'hearingloss.org', desc: 'Communication-access guidance for emergencies.', url: 'https://www.hearingloss.org', icon: '👂' },
      { name: 'National Federation of the Blind', contact: 'nfb.org', desc: 'Accessibility advocacy + emergency-prep resources.', url: 'https://www.nfb.org', icon: '👁️' },
      { name: 'NAMI', contact: '1-800-950-NAMI', desc: 'Mental health peer support; Mental Health First Aid trainings.', url: 'https://www.nami.org', icon: '🧠' }
    ]
  };

  // Maine-specific reality (mirrors RoadReady's MAINE_RULES identity pattern).
  // Rural EMS response times shape the right-thing-to-do — direct pressure may
  // suffice in Portland, may not on a logging road in Aroostook.
  var MAINE_EMS = {
    text911: 'Maine has text-to-911 statewide. Use it if you cannot speak safely or are deaf/HoH. Send your location FIRST, then what is happening.',
    ruralEta: 'Rural Maine EMS response can be 15–45+ minutes. In remote areas you ARE the first responder until they arrive.',
    heartAed: 'Maine Heart Association tracks public AED locations. Many schools, town halls, gyms, and ferry terminals have one. Look for the green-and-white heart-with-lightning sign.',
    crisisRoute: 'In Maine, 988 routes to in-state Maine Crisis Line counselors. They know local resources.',
    poison: 'Maine Poison Center: 1-800-222-1222 (national line, Maine-staffed).'
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 2: RECOGNIZE module data — grade-banded card grid + quiz
  // Each card: cue (2-3 word recognition tag) + visual emoji + first-action (1 line).
  // Grade band shifts depth, not core protocol — K-2 stops at "get an adult."
  // ─────────────────────────────────────────────────────────

  // 12 conditions covered. Card.bands = which grade bands see this card.
  // 'k2' = K-2, 'g35' = 3-5, 'g68' = 6-8, 'g912' = 9-12.
  // 'all' = visible to every band.
  var RECOGNIZE_CARDS = [
    { id: 'cardiac', icon: '💔', name: 'Cardiac arrest',
      cue: 'Not breathing, not responding',
      first: { k2: 'Yell for an adult. Call 911.', g35: 'Call 911 on speaker and start CPR—dispatch can coach you. For a child, add breaths if willing and able.', g68: 'Call 911. Start age-appropriate CPR (100–120 bpm). Add breaths for a child or infant if willing and able. Send someone for an AED.', g912: 'Call 911. Start age-appropriate CPR at 100–120/min; add breaths for children, infants, and drowning if willing and able. AED ASAP.' },
      bands: 'all', source: 'AHA 2025 Guidelines' },
    { id: 'choking', icon: '😬', name: 'Choking',
      cue: 'Hands at throat, can’t cough or speak',
      first: { k2: 'Yell for an adult.', g35: 'Yell for help. If they can’t cough, an adult does back blows + abdominal thrusts.', g68: 'If alone with them: 5 back blows then 5 abdominal thrusts. Call 911.', g912: 'Universal sign = silent + clutching throat. 5 back blows / 5 abdominal thrusts. Unconscious → CPR + 911.' },
      bands: 'all', source: 'Red Cross First Aid' },
    { id: 'stroke', icon: '🧠', name: 'Stroke (BE FAST)',
      cue: 'Face droops, arm drifts, slurred speech',
      first: { g35: 'Tell an adult right away. Note the time it started.', g68: 'BE FAST: Balance, Eyes, Face, Arms, Speech, Time. Call 911. Note the time.', g912: 'BE FAST. Call 911. Note exact onset time — eligibility for clot-busting drugs depends on it. Do NOT give food, water, or aspirin.' },
      bands: 'g35,g68,g912', source: 'American Stroke Association' },
    { id: 'seizure', icon: '⚡', name: 'Seizure',
      cue: 'Body stiffens or jerks; loses awareness',
      first: { k2: 'Get an adult. Don’t touch. Stay with them.', g35: 'Get an adult. Move sharp things away. Time it. Don’t hold them down.', g68: 'Time it. Move hazards away. Cushion head. Don’t restrain. Don’t put anything in mouth. 911 if >5 min or first-ever.', g912: 'Time it. Cushion head. If the seizure stops and they are breathing normally, use the recovery position. Don’t restrain or put anything in mouth. 911 if >5 min, repeats, first-ever, in water, or injury.' },
      bands: 'all', source: 'Epilepsy Foundation' },
    { id: 'anaphylaxis', icon: '🦜', name: 'Anaphylaxis',
      cue: 'Hives, swelling, can’t breathe after exposure',
      first: { g35: 'Tell an adult NOW. They may have an EpiPen.', g68: 'EpiPen in outer thigh, hold 3 seconds. Call 911. Lay flat with legs up.', g912: 'EpiPen IM in outer thigh, hold 3 sec. Call 911 even if symptoms improve (biphasic reaction risk). Second dose at 5–15 min if no improvement.' },
      bands: 'g35,g68,g912', source: 'FARE / AAP' },
    { id: 'bleed', icon: '🩸', name: 'Severe bleeding',
      cue: 'Spurting, pooling, soaks through cloth',
      first: { g35: 'Get an adult. Press hard on the wound.', g68: 'Direct pressure with both hands. Call 911. Don’t lift to peek.', g912: 'Call 911 and apply direct pressure. If trained: tourniquet for life-threatening limb bleeding; pack an appropriate deep wound where a tourniquet cannot be used.' },
      bands: 'g35,g68,g912', source: 'Stop the Bleed' },
    { id: 'hypoglycemia', icon: '🩺', name: 'Low blood sugar',
      cue: 'Shaky, sweaty, confused, behavior change',
      first: { g35: 'Tell an adult. They may need juice or sugar.', g68: '15g fast sugar (juice, glucose tab). Recheck in 15 min. If unconscious — 911, do NOT give food.', g912: '15-15 rule if awake and able to swallow. If unconscious: call 911; use recovery position only if breathing normally, otherwise start CPR. Glucagon if available.' },
      bands: 'g35,g68,g912', source: 'American Diabetes Association' },
    { id: 'panic', icon: '😰', name: 'Panic attack',
      cue: 'Chest tight, breathing fast, fear',
      first: { g68: 'Stay with them. Calm voice. Slow breathing together (4 in, 6 out). Not heart attack — but if unsure, call 911.', g912: 'Co-regulate breath (4-in, 6-out box). Ground (5-4-3-2-1 senses). Distinguish from heart attack: panic peaks ~10 min, no left-arm pain, no diaphoresis. When in doubt — 911.' },
      bands: 'g68,g912', source: 'NAMI / SAMHSA' },
    { id: 'mh', icon: '💚', name: 'Mental health crisis',
      cue: 'Suicidal talk, self-harm, severe distress',
      first: { g68: 'Stay with them. Tell a trusted adult NOW. 988 calls or texts.', g912: 'Stay. Listen. No judgment. Move to a safer space. Loop in trusted adult. 988 for crisis line. 911 only if immediate life threat.' },
      bands: 'g68,g912', source: '988 / NAMI' },
    { id: 'overdose', icon: '💊', name: 'Overdose / unresponsive',
      cue: 'Won’t wake; slow or stopped breathing',
      first: { g912: 'Call 911. If they are not breathing normally, start CPR or rescue breathing as the dispatcher directs. Give naloxone (Narcan) if available and repeat in 2–3 min if no response. Use recovery position only if breathing normally. Maine’s Good Samaritan law protects bystanders.' },
      bands: 'g912', source: 'SAMHSA / Maine Good Samaritan Law' },
    { id: 'heat', icon: '🌡️', name: 'Heat stroke',
      cue: 'Hot dry skin, confused, no sweat',
      first: { g35: 'Get them in shade. Tell an adult. Cool with water.', g68: '911. Move to shade. Cool aggressively (water, ice packs to neck/armpits/groin).', g912: '911 — heat stroke is life-threatening. Cool aggressively (cold-water immersion if possible). Don’t give fluids if confused.' },
      bands: 'g35,g68,g912', source: 'CDC / Red Cross' },
    { id: 'burn', icon: '🔥', name: 'Burn',
      cue: 'Red, blistered, or charred skin',
      first: { k2: 'Cool water on it. Tell an adult.', g35: 'Cool running water 10–20 min. No ice. Tell an adult.', g68: 'Cool water 10–20 min. No butter / ice / toothpaste. Loose covering. 911 for face, hands, joints, large area, or charred.', g912: 'Cool water 10–20 min. No ice/butter. Cling-film or clean dressing. 911 if 3rd-degree (charred/leathery), >palm-size, face/hands/joints/genitals, or chemical/electrical.' },
      bands: 'all', source: 'Red Cross First Aid' }
  ];

  // 5-question recognition quiz. Answers built from the same data set above so
  // there is exactly one right answer per question (no clinical ambiguity).
  // Questions written to land on the recognition cue, not the protocol.
  var RECOGNIZE_QUIZ = [
    { id: 'q1', icon: '💔',
      stem: 'A classmate in the cafeteria suddenly collapses. They are not breathing and do not respond when you shake their shoulder. What is this?',
      choices: ['Fainting', 'Cardiac arrest', 'Panic attack', 'Stroke'],
      correct: 1, why: 'Cardiac arrest = unresponsive + not breathing normally. Call 911 and start age-appropriate CPR; for a child or infant, add breaths if willing and able.' },
    { id: 'q2', icon: '😬',
      stem: 'At lunch, a friend stands up, grabs their throat, can’t cough, and can’t make a sound. What is this?',
      choices: ['Asthma attack', 'Choking (universal sign)', 'Allergic reaction', 'Panic attack'],
      correct: 1, why: 'Hands at the throat + silent + can’t cough is the universal choking sign. They need back blows + abdominal thrusts immediately.' },
    { id: 'q3', icon: '🧠',
      stem: 'Your grandfather suddenly has a droopy face on one side, can’t lift his right arm, and his speech is slurred. What is this?',
      choices: ['Low blood sugar', 'Stroke', 'Heat stroke', 'Migraine'],
      correct: 1, why: 'Face-Arm-Speech together = stroke. Call 911 and note the EXACT time symptoms started — clot-busting medicine eligibility depends on it.' },
    { id: 'q4', icon: '🦜',
      stem: 'A peer who has a peanut allergy ate a cookie at a party. Within minutes she has hives all over, her lip is swelling, and she says her throat feels tight. What is this?',
      choices: ['Asthma attack', 'Anaphylaxis', 'Panic attack', 'Cold'],
      correct: 1, why: 'Hives + swelling + breathing trouble after a known allergen = anaphylaxis. EpiPen in the outer thigh, hold 3 seconds, then 911 — even if she gets better.' },
    { id: 'q5', icon: '⚡',
      stem: 'A classmate with epilepsy suddenly stiffens, falls, and his arms and legs jerk. He is not aware of you. What should you NOT do?',
      choices: ['Move sharp things away', 'Time how long it lasts', 'Put something in his mouth', 'Cushion his head'],
      correct: 2, why: 'NEVER put anything in someone’s mouth during a seizure (old myth). They cannot swallow their tongue. Time the seizure and stay calm. 911 if it lasts more than 5 minutes.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 2.5: CALL module data — when to call what + dispatcher script
  // 911 vs 988 vs 741741 vs 1-800-222-1222 routing matters: a kid mis-routing
  // a mental-health crisis to 911 can land a peer with police instead of a
  // counselor. The decision panel below is the differentiator from sel_safety.
  // ─────────────────────────────────────────────────────────

  // Decision panel: situation → which line to call. Order matters; first match
  // is shown when the user picks a tag.
  var CALL_DECISIONS = [
    { tag: 'cardiac', situation: 'Someone is unresponsive / not breathing / severe injury / can’t breathe / heavy bleeding',
      line: '911', why: 'Life-threatening medical or trauma — EMS dispatch needs to start now.' },
    { tag: 'fire', situation: 'Fire, smoke, gas leak, downed power line, vehicle crash with injury',
      line: '911', why: 'Fire, hazmat, or trauma — fire and EMS roll together.' },
    { tag: 'crime', situation: 'Crime in progress, weapon, immediate physical threat to anyone',
      line: '911', why: 'Police dispatch needs to be on the way as you’re talking.' },
    { tag: 'mh', situation: 'Suicidal thoughts, severe emotional crisis, panic attack with no medical signs',
      line: '988', why: 'Counselors trained in crisis de-escalation, NOT police. In Maine, 988 routes to in-state Maine Crisis Line counselors.' },
    { tag: 'mh-text', situation: 'You’re in crisis but can’t talk on the phone',
      line: '741741', why: 'Crisis Text Line — text HOME to 741741. Free, 24/7. Helpful when speaking aloud feels impossible.' },
    { tag: 'mh-trans', situation: 'Trans peer in crisis or wants peer support',
      line: '1-877-565-8860', why: 'Trans Lifeline — peer support by and for trans people. No active rescue / no police call without consent.' },
    { tag: 'poison', situation: 'Someone swallowed something, took too much medicine, splashed chemical in eye',
      line: '1-800-222-1222', why: 'Poison Control — free, 24/7, faster than 911 for non-life-threatening exposures. They tell you whether to go to ER.' },
    { tag: 'overdose', situation: 'Suspected overdose — slow breathing, blue lips, won’t wake',
      line: '911', why: 'Life threat. Maine’s Good Samaritan law protects bystanders calling for help during a drug overdose.' },
    { tag: 'abuse', situation: 'Child abuse you’re witnessing or suspect',
      line: '1-800-422-4453', why: 'Childhelp National Child Abuse Hotline — 24/7. They walk you through reporting. If a child is in immediate danger, call 911 first.' },
    { tag: 'unsure', situation: 'You don’t know if it’s an emergency',
      line: '911', why: 'When in doubt, call 911. Dispatchers are trained to route or de-escalate. You won’t get in trouble for calling.' }
  ];

  // What to say to a 911 dispatcher. Order is deliberate — location FIRST so
  // help can roll even if the call drops. Source: AHA / NENA dispatcher guidance.
  var DISPATCHER_SCRIPT = [
    { step: 1, label: 'Where',
      example: '"I’m at King Middle School, 92 Deering Avenue, Portland. We’re in the cafeteria on the first floor."',
      tip: 'Give address first. If you don’t know it: nearest cross streets, building name, what you can see (school, gas station, mile marker on a road).' },
    { step: 2, label: 'What',
      example: '"A student collapsed. He’s not breathing. He’s about 14, wearing a red hoodie."',
      tip: 'One sentence on what happened, then who is hurt. Age + appearance helps EMS find them when they arrive.' },
    { step: 3, label: 'Who you are',
      example: '"My name is Sam. I’m a student here. My phone number is 207-555-0142."',
      tip: 'They need a callback number in case the call drops.' },
    { step: 4, label: 'Stay on the line',
      example: '"Yes, I can stay with you. Tell me what to do."',
      tip: 'Don’t hang up. Dispatchers can coach you through CPR, choking, bleeding control. They will tell you when EMS is at the door.' },
    { step: 5, label: 'Listen for instructions',
      example: '"Yes, I’m starting compressions now. One. Two. Three..."',
      tip: 'Follow what they say even if it sounds different from what you learned. They’re looking at the case in real time.' }
  ];

  // Text-to-911 specifics (Maine has it; this is a deaf/HoH + speech-disabled
  // + unsafe-to-speak accommodation that few teens know about).
  var TEXT_911_SCRIPT = [
    { step: 1, label: 'First text: location',
      example: 'King Middle School cafeteria, 92 Deering Ave Portland',
      tip: 'Location FIRST. Texts can be slow or out-of-order — make sure the most important info goes first.' },
    { step: 2, label: 'Second text: what + who',
      example: 'Student collapsed not breathing 14yo red hoodie',
      tip: 'Short, clear, no abbreviations they might miss. Skip slang.' },
    { step: 3, label: 'Wait + reply',
      example: '(They reply with questions. Answer plainly.)',
      tip: 'Stay in the conversation until they tell you EMS has arrived. Don’t send a photo unless asked — it slows the system.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 3: TOOL REGISTRATION + RENDER
  // ─────────────────────────────────────────────────────────

  if (typeof document !== 'undefined' && !document.getElementById('firstresponse-readiness-css')) {
    var firstResponseStyle = document.createElement('style');
    firstResponseStyle.id = 'firstresponse-readiness-css';
    firstResponseStyle.textContent = [
      '.firstresponse-menu-shell{width:min(100%,1100px);margin:0 auto;padding:8px;color:#f8fafc;display:grid;gap:14px;}',
      '.firstresponse-menu-shell *{box-sizing:border-box;}',
      '.firstresponse-command{padding:20px;border:1px solid rgba(96,165,250,.4);border-radius:20px;background:radial-gradient(circle at 91% 9%,rgba(59,130,246,.22),transparent 34%),linear-gradient(135deg,rgba(30,58,138,.64),rgba(2,6,23,.98) 68%);box-shadow:0 18px 44px rgba(2,6,23,.28);}',
      '.firstresponse-command-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}',
      '.firstresponse-eyebrow{margin:0 0 7px;color:#93c5fd;font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;}',
      '.firstresponse-title{margin:0;color:#fff;font-size:clamp(22px,3vw,31px);line-height:1.12;}',
      '.firstresponse-subtitle{max-width:740px;margin:8px 0 0;color:#dbeafe;font-size:13px;line-height:1.55;}',
      '.firstresponse-status{flex:0 0 auto;padding:8px 11px;border:1px solid rgba(147,197,253,.35);border-radius:999rem;background:rgba(2,6,23,.66);color:#bfdbfe;font-size:10px;font-weight:800;white-space:nowrap;}',
      '.firstresponse-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:17px;}',
      '.firstresponse-metric{min-width:0;padding:10px;border:1px solid rgba(148,163,184,.18);border-radius:12px;background:rgba(15,23,42,.72);}',
      '.firstresponse-metric-label{display:block;color:#94a3b8;font-size:9px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;}',
      '.firstresponse-metric-value{display:block;margin-top:3px;color:#f8fafc;font-size:14px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.firstresponse-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:15px;}',
      '.firstresponse-primary{min-height:44px;padding:10px 16px;border:1px solid rgba(219,234,254,.42);border-radius:12px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 10px 24px rgba(37,99,235,.22);transition:transform .18s,box-shadow .18s;}',
      '.firstresponse-primary:hover{transform:translateY(-1px);box-shadow:0 14px 28px rgba(37,99,235,.3);}',
      '.firstresponse-action-note{color:#bfdbfe;font-size:10px;line-height:1.4;}',
      '.firstresponse-section{padding:16px;border:1px solid #334155;border-radius:16px;background:rgba(15,23,42,.67);}',
      '.firstresponse-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:10px;}',
      '.firstresponse-section-head h3{margin:0;color:#f8fafc;font-size:15px;}',
      '.firstresponse-section-head p{margin:3px 0 0;color:#94a3b8;font-size:11px;line-height:1.45;}',
      '.firstresponse-core-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;}',
      '.firstresponse-tile-wrap{min-width:0;}',
      '.firstresponse-menu-tile{width:100%;height:100%;min-height:142px;transition:transform .18s,border-color .18s,box-shadow .18s;}',
      '.firstresponse-menu-tile:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(2,6,23,.25);}',
      '.firstresponse-menu-tile--compact{min-height:108px;}',
      '.firstresponse-catalog{border:1px solid #334155;border-radius:16px;background:rgba(15,23,42,.72);overflow:hidden;}',
      '.firstresponse-catalog summary{min-height:50px;padding:14px 16px;cursor:pointer;color:#dbeafe;font-size:12px;font-weight:900;}',
      '.firstresponse-catalog-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;padding:0 14px 14px;}',
      '.firstresponse-badges{padding:13px;border:1px solid #334155;border-radius:14px;background:#0f172a;}',
      '@media(max-width:980px){.firstresponse-core-grid{grid-template-columns:repeat(3,minmax(0,1fr));}.firstresponse-catalog-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}',
      '@media(max-width:720px){.firstresponse-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}.firstresponse-core-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}',
      '@media(max-width:520px){.firstresponse-menu-shell{padding:0;}.firstresponse-command{padding:14px;border-radius:16px;}.firstresponse-command-top{flex-direction:column;}.firstresponse-status{white-space:normal;}.firstresponse-core-grid,.firstresponse-catalog-grid{grid-template-columns:1fr;}.firstresponse-primary{width:100%;}.firstresponse-actions{align-items:stretch;}.firstresponse-action-note{width:100%;}.firstresponse-menu-tile{min-height:100px;}}',
      '@media(prefers-reduced-motion:reduce){.firstresponse-primary,.firstresponse-menu-tile{transition:none;}.firstresponse-primary:hover,.firstresponse-menu-tile:hover{transform:none;}}',
      '.theme-contrast .firstresponse-command,.theme-contrast .firstresponse-section,.theme-contrast .firstresponse-catalog,.theme-contrast .firstresponse-badges{box-shadow:none;border-width:2px;}'
    ].join('\n');
    if (document.head) document.head.appendChild(firstResponseStyle);
  }

  if (typeof document !== 'undefined' && !document.getElementById('fr-sim-workshop-css')) {
    var simStyle = document.createElement('style');
    simStyle.id = 'fr-sim-workshop-css';
    simStyle.textContent = [
      ".fr-sim-shell{max-width:1080px;margin:0 auto;padding:clamp(12px,3vw,24px);box-sizing:border-box}",
      ".fr-sim-shell *{box-sizing:border-box}",
      ".fr-sim-intro{padding:24px;border:1px solid #3d5876;border-radius:18px;background:linear-gradient(120deg,#142b45,#142039 70%);margin-bottom:18px}",
      ".fr-sim-eyebrow{margin:0 0 10px;color:#99f6e4;font-size:11px;font-weight:800;letter-spacing:.12em;line-height:1.6}",
      ".fr-sim-title{margin:0;color:#f1f5f9;font-size:clamp(21px,3vw,28px);line-height:1.2;font-weight:800}",
      ".fr-sim-title:focus-visible{outline:3px solid #fbbf24;outline-offset:5px}",
      ".fr-sim-copy{color:#cbd5e1;font-size:14px;line-height:1.65;margin:10px 0;overflow-wrap:anywhere}",
      ".fr-sim-intro .fr-sim-copy{max-width:730px}",
      ".fr-sim-tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}",
      ".fr-sim-tags span{border:1px solid #526780;border-radius:99px;padding:5px 10px;color:#dbeafe;font-size:12px}",
      ".fr-sim-catalog{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:12px}",
      ".fr-sim-case{display:flex;flex-direction:column;align-items:stretch;width:100%;height:100%;min-width:0;text-align:left;padding:18px;border:1px solid #455871;border-radius:15px;background:#17253b;color:#f1f5f9;cursor:pointer;transition:border-color .15s,background .15s}",
      ".fr-sim-case:hover{background:#20334d;border-color:#93c5fd}",
      ".fr-sim-case-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:13px;color:#94a3b8;font-size:12px}",
      ".fr-sim-case-icon{display:grid;place-items:center;width:43px;height:43px;border-radius:12px;background:#263b54;font-size:25px}",
      ".fr-sim-case>strong{font-size:17px;line-height:1.35}",
      ".fr-sim-case-footer{display:flex;justify-content:space-between;gap:8px;margin-top:auto;padding-top:14px;color:#99f6e4;font-size:12px;line-height:1.5}",
      ".fr-sim-run-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:18px 0}",
      ".fr-sim-run-heading>span{color:#cbd5e1;font-size:12px;flex-shrink:0}",
      ".fr-sim-progress{list-style:none;padding:0;margin:0 0 18px;display:flex;gap:6px}",
      ".fr-sim-progress li{display:flex;flex:1;align-items:center;gap:7px;min-width:0;padding:9px;border-radius:8px;background:#1e293b;border-bottom:3px solid #526780;color:#cbd5e1;font-size:11px;line-height:1.5}",
      ".fr-sim-progress li>span:first-child{font-size:13px;font-weight:800}",
      ".fr-sim-progress .is-current{background:#193c4a;border-color:#5eead4;color:#ccfbf1}",
      ".fr-sim-progress .is-complete{border-color:#86efac;color:#bbf7d0}",
      ".fr-sim-workspace{display:grid;grid-template-columns:minmax(0,.78fr) minmax(0,1.35fr);gap:16px;align-items:start}",
      ".fr-sim-scene,.fr-sim-card{min-width:0;background:#17253b;border:1px solid #455871;border-radius:16px;padding:20px}",
      ".fr-sim-scene{background:#101e32}",
      ".fr-sim-map{display:block;width:100%;height:auto;margin-bottom:18px;border:1px solid #334d67;border-radius:14px}",
      ".fr-sim-scene h4,.fr-sim-situation{margin:0;font-size:18px;line-height:1.55;color:#f1f5f9;font-weight:700}",
      ".fr-sim-goal{border-top:1px solid #455871;margin-top:18px;padding-top:16px;font-size:13px;line-height:1.6}",
      ".fr-sim-goal strong{color:#99f6e4}.fr-sim-goal p{margin:6px 0;color:#cbd5e1}",
      ".fr-sim-note{color:#94a3b8;font-size:11px;line-height:1.6;margin-bottom:0}",
      ".fr-sim-choices{display:flex;flex-direction:column;gap:10px;margin-top:18px}",
      ".fr-sim-choice{display:flex;align-items:flex-start;gap:12px;width:100%;min-height:52px;padding:13px;text-align:left;font-size:14px;line-height:1.6;background:#0f1b2f;border:1px solid #526780;border-radius:11px;color:#f1f5f9;cursor:pointer;overflow-wrap:anywhere}",
      ".fr-sim-choice>span:last-child{min-width:0}.fr-sim-choice:hover{border-color:#93c5fd}",
      ".fr-sim-choice[aria-disabled=true]{cursor:default}",
      ".fr-sim-letter{display:grid;place-items:center;flex:0 0 25px;height:25px;background:#2a405c;color:#dbeafe;border-radius:6px;font-size:12px;font-weight:800}",
      ".fr-sim-choice.is-selected{border-width:2px;padding:12px}.fr-sim-choice.is-help{border-color:#86efac;background:#143d34}.fr-sim-choice.is-hurt,.fr-sim-choice.is-neutral{border-color:#fcd34d;background:#382f20}",
      ".fr-sim-choice-state{display:block;font-size:12px;font-weight:800;color:#fef3c7;margin-top:4px}.fr-sim-choice.is-help .fr-sim-choice-state{color:#bbf7d0}",
      ".fr-sim-feedback{margin-top:16px;padding:16px;background:#0b1426;border-left:3px solid #93c5fd;border-radius:8px;color:#e2e8f0;font-size:14px;line-height:1.65}",
      ".fr-sim-feedback p{margin:7px 0}.fr-sim-hint{margin-top:16px}",
      ".fr-sim-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.fr-sim-actions button,.fr-sim-hint button{min-height:44px;white-space:normal}",
      ".fr-sim-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:20px 0}",
      ".fr-sim-metrics>div{padding:15px;background:#0b1426;border:1px solid #455871;border-radius:10px}.fr-sim-metrics strong{display:block;color:#99f6e4;font-size:25px}.fr-sim-metrics span{display:block;color:#cbd5e1;font-size:12px;line-height:1.5;margin-top:6px}",
      ".fr-sim-trail{list-style:none;margin:22px 0;padding:0}.fr-sim-trail li{display:flex;gap:13px;padding:18px 0;border-top:1px solid #455871}.fr-sim-trail li>div:last-child{min-width:0}.fr-sim-trail-number{display:grid;place-items:center;flex:0 0 28px;height:28px;border-radius:50%;background:#243d51;color:#99f6e4;font-weight:800}.fr-sim-correction{color:#bbf7d0;font-size:14px;line-height:1.65}",
      ".fr-sim-reflect{padding:18px;background:#17313c;border:1px solid #46717a;border-radius:12px;font-size:15px;line-height:1.6}.fr-sim-reflect h4{margin:0;color:#99f6e4}.fr-sim-reflect p{margin:8px 0}",
      "@media(max-width:740px){.fr-sim-workspace{grid-template-columns:1fr}.fr-sim-scene{display:grid;grid-template-columns:minmax(0,1fr);gap:0}.fr-sim-map{max-height:145px}.fr-sim-run-heading{align-items:flex-start;flex-direction:column}}",
      "@media(max-width:420px){.fr-sim-shell{padding:12px}.fr-sim-intro,.fr-sim-card,.fr-sim-scene{padding:15px}.fr-sim-metrics{grid-template-columns:1fr}.fr-sim-metrics>div{display:flex;align-items:center;gap:15px}.fr-sim-metrics strong{font-size:22px;min-width:50px}.fr-sim-progress li{flex-direction:column;gap:0;padding:7px 3px;font-size:10px}.fr-sim-actions button{width:100%}.fr-sim-choice{gap:9px;padding:11px}.fr-sim-choice.is-selected{padding:10px}}",
      "@media(prefers-reduced-motion:reduce){.fr-sim-case{transition:none}}",
      "@media(forced-colors:active){.fr-sim-choice.is-selected,.fr-sim-progress .is-current{outline:2px solid Highlight}.fr-sim-map{display:none}}"
    ].join('\n');
    document.head.appendChild(simStyle);
  }

  if (typeof document !== 'undefined' && !document.getElementById('fr-dispatch-css')) {
    var dispatchStyle = document.createElement('style');
    dispatchStyle.id = 'fr-dispatch-css';
    dispatchStyle.textContent = [
      ".fr-dispatch{margin:4px 0 18px;padding:20px;background:linear-gradient(150deg,#152a43,#101d32);border:1px solid #4e6883;border-radius:18px;color:#f1f5f9}",
      ".fr-dispatch,.fr-dispatch *{box-sizing:border-box}.fr-dispatch p{overflow-wrap:anywhere}",
      ".fr-dispatch-boundary{margin:0 0 22px;padding:9px 12px;background:#283953;border:1px solid #647b96;border-radius:8px;color:#e2e8f0;font-size:11px;font-weight:700;line-height:1.6;letter-spacing:.03em}",
      ".fr-dispatch-title{margin:0;font-size:clamp(21px,3vw,28px);font-weight:800;line-height:1.25;color:#f8fafc}",
      ".fr-dispatch-title:focus-visible{outline:3px solid #fbbf24;outline-offset:5px}.fr-dispatch-eyebrow{margin:0 0 8px;color:#99f6e4;font-size:10px;font-weight:800;letter-spacing:.12em;line-height:1.6}",
      ".fr-dispatch-copy{margin:12px 0;color:#cbd5e1;font-size:14px;line-height:1.65}.fr-dispatch-small{font-size:12px;line-height:1.6;color:#b7c9dd;margin:12px 0}.fr-dispatch a{color:#93c5fd;text-decoration:underline}",
      ".fr-dispatch-modes{border:0;padding:0;margin:20px 0;display:flex;flex-wrap:wrap;gap:10px}.fr-dispatch-modes legend{margin-bottom:10px;font-size:13px;font-weight:700}",
      ".fr-dispatch-modes label{display:flex;gap:9px;align-items:center;padding:12px 15px;border:1px solid #60758f;background:#142339;border-radius:10px;font-size:13px;cursor:pointer;min-height:46px}",
      ".fr-dispatch input{accent-color:#0d9488;flex-shrink:0;width:19px;height:19px;margin:0}.fr-dispatch input:focus-visible{outline:3px solid #fbbf24;outline-offset:4px}",
      ".fr-dispatch .is-selected{background:#173e43;border-color:#5eead4}.fr-dispatch-notice{padding:14px;border-left:3px solid #93c5fd;background:#0b1729;border-radius:6px;color:#dbeafe;font-size:13px;line-height:1.65}",
      ".fr-dispatch-cases{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.fr-dispatch-case{display:flex;flex-direction:column;align-items:flex-start;text-align:left;gap:12px;padding:20px;border:1px solid #526e8b;border-radius:14px;background:#182b43;color:#f1f5f9;cursor:pointer;min-width:0}",
      ".fr-dispatch-case:hover{background:#213951;border-color:#93c5fd}.fr-dispatch-case strong{font-size:19px}.fr-dispatch-case>span{font-size:14px;line-height:1.6;color:#cbd5e1}.fr-dispatch-case .fr-dispatch-case-symbol{font-size:37px;color:#99f6e4;line-height:1}.fr-dispatch-case .fr-dispatch-start{margin-top:auto;color:#99f6e4;font-size:12px;font-weight:700}",
      ".fr-dispatch-run-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.fr-dispatch-run-head>span{font-size:12px;line-height:1.5;color:#cbd5e1}",
      ".fr-dispatch-progress{list-style:none;margin:20px 0;padding:0;display:flex;gap:5px}.fr-dispatch-progress li{flex:1;min-width:0;padding:8px 5px;border-bottom:3px solid #526e8b;background:#16263c;border-radius:6px;color:#cbd5e1;font-size:11px;line-height:1.5;overflow-wrap:anywhere}.fr-dispatch-progress li[aria-current=step]{border-color:#5eead4;background:#193e46;color:#ccfbf1}.fr-dispatch-progress .is-done{border-color:#86efac;color:#bbf7d0}",
      ".fr-dispatch-workspace{display:grid;grid-template-columns:minmax(0,.82fr) minmax(0,1.25fr);gap:18px;align-items:start}.fr-dispatch-brief{padding:15px;background:#0b1729;border:1px solid #405a76;border-radius:12px;min-width:0}.fr-dispatch-brief h4{margin:18px 0 12px;font-size:15px;font-weight:700}",
      ".fr-dispatch-map svg{display:block;width:100%;height:auto;border-radius:10px}.fr-dispatch-map-caption{margin-top:8px;color:#99f6e4;font-size:11px;font-weight:800;letter-spacing:.08em;line-height:1.5}.fr-dispatch-map .fr-dispatch-small{font-size:11px;margin:6px 0}.fr-dispatch-brief dl{margin:0}.fr-dispatch-brief dt{color:#99f6e4;font-size:11px;font-weight:800;margin-top:13px}.fr-dispatch-brief dd{margin:4px 0 0;color:#e2e8f0;font-size:13px;line-height:1.6;overflow-wrap:anywhere}",
      ".fr-dispatch-change{padding:12px;background:#49361e;border:1px solid #d6a357;border-radius:9px;color:#fef3c7;font-size:13px;line-height:1.6}",
      ".fr-dispatch-full-brief{border-top:1px solid #405a76;margin-top:14px;padding-top:3px}.fr-dispatch-full-brief summary{min-height:44px;padding:12px 0;font-size:12px;font-weight:700;line-height:1.6;cursor:pointer;color:#dbeafe}",
      ".fr-dispatch-conversation{min-width:0}.fr-dispatch-incoming{padding:17px;background:#223951;border:1px solid #587491;border-radius:14px 14px 14px 3px}.fr-dispatch-incoming h4{font-size:17px;line-height:1.6;margin:0;font-weight:700}",
      ".fr-dispatch-options{margin:20px 0 14px;padding:0;border:0;min-width:0;display:flex;flex-direction:column;gap:9px}.fr-dispatch-options legend{margin-bottom:12px;font-size:12px;font-weight:700;color:#cbd5e1}.fr-dispatch-options label{display:flex;align-items:flex-start;gap:11px;border:1px solid #526e8b;background:#102137;border-radius:10px;padding:13px;font-size:13px;line-height:1.6;cursor:pointer;min-height:48px}.fr-dispatch-options input{margin-top:2px}.fr-dispatch-options label>span{min-width:0;overflow-wrap:anywhere}",
      ".fr-dispatch-outgoing{padding:16px;background:#153b40;border:1px solid #428282;border-radius:14px 14px 3px 14px;color:#dcfce7;font-size:13px;line-height:1.65}.fr-dispatch-outgoing strong{font-size:11px;color:#99f6e4}.fr-dispatch-outgoing p{margin:7px 0 0}",
      ".fr-dispatch-feedback{margin-top:14px;padding:13px;border-left:3px solid #fcd34d;background:#16283d;border-radius:7px;font-size:13px;line-height:1.6}.fr-dispatch-feedback p{margin:7px 0 0}.fr-dispatch-example{margin-top:12px;padding:12px;border:1px dashed #93c5fd;border-radius:8px;color:#dbeafe;font-size:13px;line-height:1.6}.fr-dispatch-example p{margin:0}",
      ".fr-dispatch-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.fr-dispatch-actions button{min-height:44px;white-space:normal;font-size:12px!important}",
      ".fr-dispatch-result{display:flex;align-items:center;gap:18px;padding:18px;margin:20px 0;background:#12363d;border:1px solid #4d8489;border-radius:12px}.fr-dispatch-result strong{font-size:28px;color:#99f6e4;white-space:nowrap}.fr-dispatch-result span{font-size:13px;color:#dbeafe;line-height:1.6}",
      ".fr-dispatch-transcript{list-style:none;margin:0;padding:0}.fr-dispatch-transcript li{padding:20px 0;border-top:1px solid #405a76}.fr-dispatch-transcript li>strong{font-size:15px}.fr-dispatch-transcript blockquote{margin:10px 0;padding:14px 17px;border-left:3px solid #5eead4;background:#12323b;border-radius:0 10px 10px 0;font-size:14px;line-height:1.65;color:#e2e8f0;overflow-wrap:anywhere}.fr-dispatch-first{font-size:13px;line-height:1.6;color:#fde68a}",
      ".fr-dispatch-reflect{padding:17px;border:1px solid #56738d;background:#172e45;border-radius:12px}.fr-dispatch-reflect h4{margin:0;color:#99f6e4;font-weight:700}.fr-dispatch-reflect p{font-size:14px;line-height:1.65}.fr-dispatch-reference{border:1px solid #526e8b;border-radius:12px;padding:4px 14px;background:#101d32;margin-bottom:18px}.fr-dispatch-reference>summary{min-height:48px;padding:13px 0;font-size:13px;font-weight:700;cursor:pointer}",
      "@media(max-width:700px){.fr-dispatch{padding:14px}.fr-dispatch-workspace{grid-template-columns:1fr}.fr-dispatch-brief{display:grid;grid-template-columns:1fr;gap:0}.fr-dispatch-map svg{max-height:135px}.fr-dispatch-run-head{flex-direction:column}.fr-dispatch-progress li{font-size:10px}.fr-dispatch-progress li span{display:block;font-size:12px}}",
      "@media(max-width:420px){.fr-dispatch-cases{grid-template-columns:1fr}.fr-dispatch-modes label{width:100%}.fr-dispatch-actions button{width:100%}.fr-dispatch-result{align-items:flex-start;flex-direction:column;gap:4px}.fr-dispatch-progress{gap:3px}.fr-dispatch-progress li{position:relative;text-align:center}.fr-dispatch-progress li[aria-current=step]{flex:3}.fr-dispatch-progress li:not([aria-current=step]) .fr-dispatch-step-label{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}}",
      "@media(forced-colors:active){.fr-dispatch .is-selected,.fr-dispatch-progress li[aria-current=step]{outline:2px solid Highlight}.fr-dispatch-map svg{display:none}}"
    ].join('\n');
    document.head.appendChild(dispatchStyle);
  }

  if (typeof document !== 'undefined' && !document.getElementById('fr-reason-css')) {
    var reasonStyle = document.createElement('style');
    reasonStyle.id = 'fr-reason-css';
    reasonStyle.textContent = [
      '.fr-reason{padding:clamp(12px,3vw,24px);max-width:1100px;margin:auto;color:#f1f5f9;line-height:1.6;overflow-wrap:anywhere}.fr-reason *{box-sizing:border-box}.fr-reason h2,.fr-reason h3,.fr-reason p{margin:0 0 12px}.fr-reason h2{font-size:clamp(24px,3.5vw,34px);line-height:1.2;letter-spacing:-.02em}.fr-reason h3{font-size:18px}.fr-reason p{color:#cbd5e1}.fr-reason button,.fr-reason input{font:inherit}.fr-reason button{white-space:normal;min-height:44px}.fr-reason a{color:#93c5fd;text-decoration:underline}.fr-reason summary{cursor:pointer;min-height:44px;padding:10px 0;color:#e2e8f0}',
      '.fr-reason-hero{padding:clamp(18px,3vw,28px);border:1px solid #426379;border-radius:18px;background:linear-gradient(135deg,#152c3f,#172139);margin-bottom:18px}.fr-reason-eyebrow{font-size:11px;color:#99f6e4!important;letter-spacing:.1em;font-weight:800}.fr-reason-intro{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(180px,1fr);gap:24px;align-items:center}.fr-reason-route{width:100%;height:auto;max-height:170px}.fr-reason-steps,.fr-reason-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0}.fr-reason-card{padding:18px;background:#1e293b;border:1px solid #475569;border-radius:12px;min-width:0}.fr-reason-card p:last-child{margin-bottom:0}.fr-reason-number{display:inline-grid;place-items:center;width:32px;height:32px;border:1px solid #5eead4;border-radius:50%;color:#99f6e4;margin-bottom:10px;font-weight:800}.fr-reason-stats strong{display:block;font-size:28px;line-height:1.2;color:#99f6e4}.fr-reason-stats span{color:#cbd5e1;font-size:13px}',
      '.fr-reason-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:16px}.fr-reason-headrow{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;color:#cbd5e1;font-size:13px;margin-bottom:12px}.fr-reason-dots{display:flex;gap:5px;margin:12px 0 18px}.fr-reason-dots span{height:6px;flex:1;background:#334155;border-radius:4px}.fr-reason-dots .done{background:#5eead4}.fr-reason-dots .current{background:#fcd34d}.fr-reason-context{padding:12px 16px;border-left:3px solid #93c5fd;background:#101e33;color:#cbd5e1;margin-bottom:16px;font-size:13px}.fr-reason-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:18px;align-items:start}.fr-reason fieldset{margin:0;padding:0;border:0;min-width:0}.fr-reason legend{font-size:17px;font-weight:800;margin:0 0 12px;padding:0;color:#f1f5f9;max-width:100%}.fr-reason-options{display:grid;gap:9px}.fr-reason-action-options{grid-template-columns:repeat(2,minmax(0,1fr))}.fr-reason-option{display:flex;align-items:flex-start;gap:10px;background:#142238;border:1px solid #52627a;padding:13px;border-radius:10px;color:#f1f5f9;cursor:pointer;font-size:14px;min-width:0}.fr-reason-option.selected{border-color:#5eead4;background:#153a40;box-shadow:inset 0 0 0 1px #5eead4}.fr-reason-option input{accent-color:#0f766e;width:18px;height:18px;flex-shrink:0;margin:3px 0 0}.fr-reason-option small{display:block;font-size:12px;color:#cbd5e1;margin-top:4px}.fr-reason input:focus-visible,.fr-reason [tabindex]:focus-visible{outline:3px solid #fbbf24;outline-offset:5px}',
      '.fr-reason-feedback{margin-top:18px;padding:18px;border-radius:12px;border:1px solid #d4a857;background:#332b1c;color:#fef3c7}.fr-reason-feedback p{color:inherit}.fr-reason-feedback.is-complete{border-color:#5eead4;background:#143632;color:#ccfbf1}.fr-reason-feedback ul{padding-left:22px;margin:0}.fr-reason-transfer{margin-top:14px;border-top:1px solid #527872;padding-top:14px}.fr-reason-source{font-size:12px;margin-top:12px}.fr-reason-hint{padding:14px;border:1px dashed #94a3b8;border-radius:10px;margin-top:14px}.fr-reason-review{padding:0;list-style:none;display:grid;gap:12px}.fr-reason-review li{padding:18px;border:1px solid #475569;background:#111f33;border-radius:12px}.fr-reason-review h3{font-size:16px;margin-bottom:8px}.fr-reason-review p{margin:6px 0;font-size:14px}.fr-reason-tag{display:inline-block;color:#ccfbf1;border:1px solid #477b74;background:#193c3c;border-radius:6px;font-size:12px;padding:3px 8px;margin-bottom:8px}.fr-reason-tag.supported{color:#fef3c7;border-color:#8e7950;background:#352f20}.fr-reason-records{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.fr-reason-muted{font-size:13px;color:#cbd5e1}.fr-reason-reflect{margin-top:20px;padding:20px;background:#172c42;border:1px solid #5e839d;border-radius:12px}',
      '@media(max-width:700px){.fr-reason-grid,.fr-reason-intro,.fr-reason-records{grid-template-columns:1fr}.fr-reason-route{max-height:110px}.fr-reason-steps{grid-template-columns:1fr}.fr-reason-stats{gap:7px}.fr-reason-stats .fr-reason-card{padding:10px}.fr-reason-stats strong{font-size:24px}.fr-reason-action-options{grid-template-columns:1fr}.fr-reason-actions button{flex:1 1 180px}.fr-reason h2{font-size:25px}}',
      '@media(forced-colors:active){.fr-reason-option.selected{outline:2px solid Highlight}.fr-reason-route{display:none}.fr-reason-dots .done,.fr-reason-dots .current{background:Highlight}.fr-reason-card,.fr-reason-hero,.fr-reason-tag{border:1px solid CanvasText}}'
    ].join('\n');
    document.head.appendChild(reasonStyle);
  }

  if (typeof document !== 'undefined' && !document.getElementById('fr-depth-explorer-css')) {
    var depthStyle = document.createElement('style');
    depthStyle.id = 'fr-depth-explorer-css';
    depthStyle.textContent = [
      '.fr-body3d{padding:clamp(12px,2vw,22px);max-width:1160px;margin:0 auto;overflow-wrap:anywhere}.fr-body3d *{box-sizing:border-box}.fr-body3d-layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:20px;align-items:start}.fr-body3d-visual{min-width:0}.fr-body3d-stage{position:relative;width:100%;height:360px;border-radius:14px;overflow:hidden;background:#0b1220;border:1px solid #475569}.fr-body3d-stage.is-depth{height:min(40vh,420px);position:sticky;top:8px;z-index:12}.fr-body3d button:focus-visible,.fr-body3d input:focus-visible,.fr-body3d summary:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}.fr-body3d button{white-space:normal}.fr-body3d summary{cursor:pointer;min-height:44px;padding:12px 0;color:#e2e8f0;font-weight:700}.fr-body3d-camera{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.fr-body3d-camera button{min-height:40px}',
      '.fr-depth-lab{padding:18px;border:1px solid #47677c;background:linear-gradient(145deg,#152c3c,#172237);border-radius:14px;margin-bottom:14px;color:#f1f5f9}.fr-depth-lab h2{font-size:22px;line-height:1.3;margin:0 0 8px}.fr-depth-lab p{font-size:13px;line-height:1.6;color:#cbd5e1;margin:8px 0 14px}.fr-depth-eyebrow{font-size:10px!important;color:#99f6e4!important;letter-spacing:.12em;font-weight:800}.fr-depth-controls{display:grid;gap:16px}.fr-depth-controls label{display:flex;justify-content:space-between;gap:12px;color:#e2e8f0;font-size:13px;font-weight:700}.fr-depth-controls output{font-variant-numeric:tabular-nums;color:#99f6e4;white-space:nowrap}.fr-depth-controls input[type=range]{display:block;width:100%;height:32px;margin:2px 0;accent-color:#5eead4}.fr-depth-controls small{font-size:11px;line-height:1.5;color:#cbd5e1}.fr-depth-poses{display:flex;gap:6px;flex-wrap:wrap;margin:16px 0 12px}.fr-depth-poses button{flex:1 1 140px;min-height:44px}.fr-depth-readout{display:grid;gap:7px;padding:12px;border:1px solid #536981;border-radius:9px;background:#111f32;font-size:13px;line-height:1.5;color:#e2e8f0}.fr-depth-readout p{margin:0}.fr-depth-switch{display:flex;gap:9px;align-items:flex-start;font-size:13px;margin:14px 0;color:#e2e8f0}.fr-depth-switch input{width:18px;height:18px;accent-color:#0f766e;flex-shrink:0}.fr-depth-lab a{color:#93c5fd;text-decoration:underline;font-size:12px}.fr-depth-examples{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.fr-depth-examples button{min-height:40px}',
      '.fr-depth-profile{margin:14px 0 0;padding:14px;background:#111e31;border:1px solid #475569;border-radius:12px;color:#cbd5e1;font-size:12px;line-height:1.6}.fr-depth-profile h3{font-size:14px;color:#f1f5f9;margin:0 0 4px}.fr-depth-profile svg{display:block;width:100%;height:auto;margin:10px 0}.fr-depth-profile figcaption{margin-top:8px}.fr-depth-key{display:flex;gap:14px;flex-wrap:wrap}.fr-depth-key span:before{content:"";display:inline-block;vertical-align:middle;width:18px;height:3px;margin-right:6px;background:#fbbf24}.fr-depth-key span:first-child:before{background:#5eead4}.fr-depth-profile-values{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.fr-depth-profile-values strong{display:block;color:#f1f5f9;font-size:19px}.fr-depth-reference{margin-top:14px;border-top:1px solid #475569}.fr-depth-reference>div{padding:6px 0}',
      '.fr-depth-inspector{margin-top:14px;padding:14px;background:#112638;border:1px solid #527087;border-radius:12px;color:#e2e8f0;font-size:13px;line-height:1.6}.fr-depth-inspector h3{font-size:18px;color:#f1f5f9;margin:0 0 6px}.fr-depth-inspector p{margin:6px 0 12px}.fr-depth-scrub label{display:flex;justify-content:space-between;gap:12px;font-weight:700}.fr-depth-scrub output{color:#99f6e4;font-variant-numeric:tabular-nums}.fr-depth-scrub input{display:block;width:100%;height:36px;margin:4px 0;accent-color:#7dd3fc}.fr-depth-scrub small{color:#cbd5e1;font-size:11px}.fr-depth-steps{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}.fr-depth-steps button{flex:1 1 80px;min-height:64px;padding:8px;border:1px solid #64748b;border-radius:8px;background:#142d42;color:#f1f5f9;font:inherit;cursor:pointer}.fr-depth-steps button span{display:block;color:#a5f3fc;font-weight:700;font-size:11px}.fr-depth-steps button[aria-pressed=true]{background:#164e63;border-color:#7dd3fc;box-shadow:inset 0 0 0 1px #7dd3fc}.fr-depth-inspection-note{padding:12px;border-left:3px solid #7dd3fc;background:#0c1d2d;border-radius:0 8px 8px 0;min-height:115px}.fr-depth-inspection-note p{margin:6px 0 0;color:#cbd5e1}.fr-depth-selected-depth{margin-top:4px;font-variant-numeric:tabular-nums}.fr-depth-axis{display:flex;justify-content:space-between;margin:0 3% 8px 6%;font-size:11px}.fr-depth-cursor-caption{color:#f1f5f9}.fr-depth-cursor circle{paint-order:stroke fill}',
      '.fr-depth-compare{margin-top:14px;border:1px solid #506a86;border-radius:10px;background:#12283b;color:#e2e8f0}.fr-depth-compare>summary{padding:12px;font-size:14px}.fr-depth-compare-body{padding:0 12px 12px}.fr-depth-saved-badge{display:inline-block;margin-left:8px;padding:2px 7px;border:1px solid #a78bfa;border-radius:12px;color:#e9d5ff;font-size:10px}.fr-depth-comparison-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.fr-depth-comparison-actions button{flex:1 1 145px;min-height:44px}.fr-depth-comparison-table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:12px;line-height:1.6;margin:12px 0}.fr-depth-comparison-table caption{text-align:left;margin-bottom:6px;color:#f1f5f9;font-weight:700}.fr-depth-comparison-table th,.fr-depth-comparison-table td{padding:8px 5px;border-bottom:1px solid #607286;text-align:left;overflow-wrap:normal;font-variant-numeric:tabular-nums}.fr-depth-comparison-table thead{color:#c4b5fd}.fr-depth-comparison-table tbody{color:#f1f5f9}.fr-depth-compare .fr-depth-comparison-reading{border-left:3px solid #c4b5fd;background:#0c1d2d;padding:10px;color:#f1f5f9}.fr-depth-compare .fr-depth-comparison-scope{font-size:11px}.fr-depth-key.is-comparing span:first-child:before{background:none;height:0;border-top:3px dashed #c4b5fd}',
      '@media(max-width:760px){.fr-body3d-layout{grid-template-columns:minmax(0,1fr)}.fr-body3d-stage,.fr-body3d-stage.is-depth{height:330px}.fr-depth-lab{padding:14px}.fr-depth-lab h2{font-size:21px}.fr-body3d-layout.is-depth .fr-body3d-visual{display:contents}.fr-body3d-layout.is-depth .fr-body3d-stage{grid-row:1;position:sticky;top:8px;z-index:12;height:min(34vh,280px);min-height:180px}.fr-body3d-layout.is-depth .fr-body3d-camera{grid-row:2}.fr-body3d-layout.is-depth .fr-depth-inspector{grid-row:3}.fr-body3d-layout.is-depth>.fr-body3d-content{grid-row:4}.fr-body3d-layout.is-depth .fr-depth-profile{grid-row:5}.fr-body3d-layout.is-depth .fr-body3d-orbit{grid-row:6}.fr-body3d-layout.is-depth .fr-body3d-visual-help{grid-row:7}}',
      '@media(forced-colors:active){.fr-depth-saved-cursor{fill:LinkText;stroke:Canvas}.fr-depth-key.is-comparing span:first-child:before{border-color:LinkText}.fr-depth-steps button[aria-pressed=true]{outline:2px solid Highlight}.fr-depth-cursor circle{fill:Canvas;stroke:Highlight}.fr-depth-poses button[aria-pressed=true]{outline:2px solid Highlight}.fr-depth-profile svg path{stroke:CanvasText}.fr-depth-profile svg .fr-depth-reference-line{stroke:LinkText}.fr-depth-key span:before{background:CanvasText}}'
    ].join('\n');
    depthStyle.textContent += '\n' + [
      '.fr-model-key{margin-top:12px;padding:12px 14px;border:1px solid #527087;border-radius:10px;background:#101e30;color:#e2e8f0}.fr-model-key h3{margin:0 0 10px;font-size:13px;line-height:1.5;font-weight:800;color:#f1f5f9}.fr-model-key ul{list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 12px;padding:0;margin:0}.fr-model-key li{display:flex;align-items:center;gap:8px;min-width:0;font-size:12px;line-height:1.5}.fr-model-symbol{flex-shrink:0;overflow:visible}.fr-model-symbol.is-rest,.fr-model-symbol.is-reference{color:#5eead4}.fr-model-symbol.is-current{color:#fbbf24}.fr-model-symbol.is-saved{color:#c4b5fd}.fr-model-symbol.is-travel{color:#f1f5f9}.fr-model-symbol.is-direction{color:#7dd3fc}.fr-model-key.is-contrast .fr-model-symbol{color:#fff}@media(max-width:760px){.fr-body3d-layout.is-depth .fr-model-key{grid-row:3}.fr-body3d-layout.is-depth .fr-depth-inspector{grid-row:4}.fr-body3d-layout.is-depth>.fr-body3d-content{grid-row:5}.fr-body3d-layout.is-depth .fr-depth-profile{grid-row:6}.fr-body3d-layout.is-depth .fr-body3d-orbit{grid-row:7}.fr-body3d-layout.is-depth .fr-body3d-visual-help{grid-row:8}}@media(forced-colors:active){.fr-model-key{background:Canvas;border-color:CanvasText;color:CanvasText}.fr-model-key h3{color:CanvasText}.fr-model-key .fr-model-symbol{color:CanvasText}}',
      '.fr-child-hands{min-width:0;margin:16px 0;padding:14px;border:1px solid #647e95;border-radius:10px;background:#112638;color:#f1f5f9}.fr-child-hands legend{max-width:100%;padding:0 5px;font-size:15px;font-weight:800;color:#f1f5f9}.fr-child-hands p{font-size:13px;line-height:1.6;color:#cbd5e1;margin:8px 0 12px}.fr-child-hand-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.fr-child-hand-option{display:flex;align-items:flex-start;gap:9px;min-height:48px;padding:12px;border:1px solid #72849b;border-radius:8px;background:#162d41;color:#f1f5f9;font-size:13px;line-height:1.5;cursor:pointer}.fr-child-hand-option input{width:18px;height:18px;flex-shrink:0;margin:1px 0 0;accent-color:#0f766e}.fr-child-hand-option.is-selected{border-color:#5eead4;box-shadow:inset 0 0 0 1px #5eead4;background:#153c41}.fr-child-hands .fr-child-hand-reading{color:#f1f5f9;border-left:3px solid #5eead4;padding-left:10px}.fr-child-hands .fr-child-hand-scope{font-size:12px}.fr-child-hands a{color:#93c5fd;text-decoration:underline;font-size:12px}.fr-placement-demo-note{font-size:13px;line-height:1.6;color:#e2e8f0}.fr-child-hands:disabled .fr-child-hand-option{cursor:default}.fr-child-hands input:focus-visible{outline:3px solid #fbbf24;outline-offset:4px}@media(max-width:420px){.fr-child-hand-options{grid-template-columns:minmax(0,1fr)}}@media(forced-colors:active){.fr-child-hand-option.is-selected{outline:2px solid Highlight}.fr-child-hands .fr-child-hand-reading{border-color:CanvasText}}',
      '.fr-body3d-layout.is-depth .fr-body3d-visual{align-self:stretch}',
      '.fr-depth-measurement{margin:14px 0;padding:14px;border:1px solid #7890a6;border-radius:10px;background:#0c1d2d;color:#f1f5f9}.fr-depth-measurement h3{font-size:16px;line-height:1.5;margin:0 0 6px}.fr-depth-measure-values{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 0}.fr-depth-measure-values>div{padding:9px;border:1px solid #475569;border-radius:7px}.fr-depth-measure-values dt{font-size:12px;line-height:1.5;color:#cbd5e1}.fr-depth-measure-values dd{margin:5px 0 0;font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;color:#f1f5f9}.fr-depth-measure-values>div:last-child{border-color:#cbd5e1}.fr-depth-measurement .fr-depth-measure-equation{color:#f1f5f9;font-weight:700;font-variant-numeric:tabular-nums}.fr-depth-measurement .fr-depth-measure-comparison{border-left:3px solid #c4b5fd;padding-left:10px;color:#e9d5ff}.fr-depth-measurement .fr-depth-measure-scope{font-size:11px;margin-bottom:0}@media(max-width:760px){.fr-depth-measure-values{grid-template-columns:repeat(2,minmax(0,1fr))}.fr-depth-measure-values>div:last-child{grid-column:1/-1}}',
      '.fr-depth-inquiry{margin-top:16px;border-top:1px dashed #70859a}.fr-depth-inquiry>summary{color:#a5f3fc;font-size:15px}.fr-depth-predictions{border:0;padding:0;margin:0 0 16px;min-width:0}.fr-depth-predictions legend{font-size:13px;font-weight:700;line-height:1.6;margin-bottom:8px}.fr-depth-prediction-option{display:flex;align-items:center;gap:10px;padding:8px 10px;min-height:44px;margin:6px 0;border:2px solid transparent;border-radius:8px;background:#193246;color:#f1f5f9;font-size:13px;cursor:pointer}.fr-depth-prediction-option.is-selected{border-color:#7dd3fc;background:#164e63}.fr-depth-prediction-option input{flex:0 0 18px;width:18px;height:18px;margin:0;accent-color:#7dd3fc}.fr-depth-inquiry button:disabled{opacity:.65;cursor:not-allowed}.fr-depth-prediction-result:not(:empty){padding:12px;margin-top:12px;border-left:3px solid #7dd3fc;background:#0c1d2d;font-size:13px;font-weight:700}.fr-depth-evidence{margin-top:12px}.fr-depth-evidence .fr-depth-evidence-progress{color:#a5f3fc}.fr-depth-reflection-label{display:block;font-size:13px;font-weight:700;margin:12px 0 6px}.fr-depth-inquiry textarea{display:block;width:100%;min-height:110px;padding:10px;border:1px solid #94a3b8;border-radius:8px;background:#0c1d2d;color:#f1f5f9;font:inherit;font-size:13px;line-height:1.6;resize:vertical}.fr-depth-inquiry small{display:block;font-size:11px;line-height:1.6;margin-top:6px;color:#cbd5e1}.fr-depth-inquiry .fr-depth-takeaway{padding:12px;border:1px solid #527087;border-radius:8px;background:#112638}.fr-body3d textarea:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}',
      '@media(forced-colors:active){.fr-depth-prediction-option{border-color:CanvasText}.fr-depth-prediction-option.is-selected{outline:2px solid Highlight}.fr-depth-inquiry textarea{border-color:CanvasText}.fr-depth-evidence button[aria-pressed=true]{outline:2px solid Highlight}}'
    ].join('\n');
    document.head.appendChild(depthStyle);
  }

  window.StemLab.registerTool('firstResponse', {
    name: 'First Response Lab',
    icon: '🚑',
    category: 'life-skills',
    description: 'Recognize and respond to medical emergencies. Hands-only CPR rhythm trainer, AED walkthrough, Stop the Bleed, choking, seizure, stroke, anaphylaxis. Disability-affirming peer response. Maine 911 + text-to-911. Educational only — get certified at redcross.org or heart.org.',
    tags: ['first-aid', 'cpr', 'aed', 'emergency', 'safety', 'life-skills', 'maine', 'disability-affirming'],

    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      try {
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;

      // State persistence via ctx.toolData (system-managed; survives reload).
      var d = (ctx.toolData && ctx.toolData['firstResponse']) || {};
      var upd = function(key, val) { ctx.update('firstResponse', key, val); };
      var updMulti = function(obj) {
        if (ctx.updateMulti) ctx.updateMulti('firstResponse', obj);
        else Object.keys(obj).forEach(function(k) { upd(k, obj[k]); });
      };
      var addToast = ctx.addToast || function(msg) { console.log('[FirstResponse]', msg); };

      // Grade band drives content depth: k2 / g35 / g68 / g912.
      // Default to g68 if host hasn't set one — middle-band keeps the most users
      // on relevant content without exposing K-2 to OD/MH protocols.
      var gradeBand = (ctx.gradeBand || 'g68').toLowerCase();
      if (['k2','g35','g68','g912'].indexOf(gradeBand) === -1) gradeBand = 'g68';

      // ── First Action Sleuth shared data (hoisted so both the play view
      // and the Mastery view can reference the same canonical list) ──
      var FA_ACTIONS = [
        { id: 'callEMS',  label: __alloT('stem.firstresponse.call_911', 'Call 911'),                  color: '#dc2626', ink: '#fca5a5', icon: '📞', def: __alloT('stem.firstresponse.reason_call_def', 'Call 911 and follow the dispatcher. In Maine, text 911 if you cannot make a voice call.') },
        { id: 'cpr',      label: __alloT('stem.firstresponse.start_cpr', 'Start CPR'),                 color: '#ef4444', ink: '#fca5a5', icon: '❤️', def: __alloT('stem.firstresponse.reason_cpr_def', 'For unresponsiveness with absent or abnormal breathing. Give CPR as trained; breaths matter especially for children and drowning.') },
        { id: 'aed',      label: __alloT('stem.firstresponse.apply_aed', 'Apply AED'),                 color: '#f59e0b', ink: '#fcd34d', icon: '⚡', def: __alloT('stem.firstresponse.reason_aed_def', 'Turn on, attach pads, follow prompts. Everyone clear during analysis and shock; promptly resume CPR.') },
        { id: 'pressure', label: __alloT('stem.firstresponse.direct_pressure', 'Direct pressure'),           color: '#7c3aed', ink: '#c4b5fd', icon: '🩹', def: __alloT('stem.firstresponse.reason_pressure_def', 'Press firmly on the wound with a dressing or cloth. Use gloves if available and maintain pressure.') },
        { id: 'heimlich', label: __alloT('stem.firstresponse.abdominal_thrusts', 'Back blows + thrusts'),         color: '#0ea5e9', ink: '#7dd3fc', icon: '🫶', def: __alloT('stem.firstresponse.reason_choking_def', 'For severe choking in a responsive adult or child: 5 back blows, then 5 thrusts. Technique varies by age and pregnancy.') },
        { id: 'recovery', label: __alloT('stem.firstresponse.recovery_position', 'Recovery position'),         color: '#16a34a', ink: '#86efac', icon: '🛌', def: __alloT('stem.firstresponse.reason_recovery_def', 'For unresponsiveness with normal breathing and no suspected spinal injury. Position on their side and monitor.') }
      ];
      // The same case bank powers practice, review, and progress records.
      var FA_CASES = [
        { id: 1, title: __alloT('stem.firstresponse.reason_case1_title', 'Collapse in the office'), correct: 'callEMS', source: 'bls',
          scene: __alloT('stem.firstresponse.reason_case1_scene', 'An adult coworker collapses. They do not respond and are not breathing normally. You are alone, with your phone in your pocket. Help has not been called.'),
          cues: [__alloT('stem.firstresponse.reason_case1_key', 'Unresponsive and not breathing normally; your phone is within reach.'), __alloT('stem.firstresponse.reason_case1_context', 'The collapse happened in an office.'), __alloT('stem.firstresponse.reason_case1_guess', 'They must have a known heart condition.')],
          why: __alloT('stem.firstresponse.reason_case1_why', 'Call 911 on speaker, then immediately start CPR and follow the dispatcher. Lay rescuers use responsiveness and breathing to recognize cardiac arrest; do not delay for a pulse check.'),
          transfer: __alloT('stem.firstresponse.reason_case1_transfer', 'If a helper is present, direct them to call 911 and get an AED while you start CPR.') },
        { id: 2, title: __alloT('stem.firstresponse.reason_case2_title', 'A child pulled from a pool'), correct: 'cpr', source: 'water',
          scene: __alloT('stem.firstresponse.reason_case2_scene', 'A 7-year-old has been safely removed from a backyard pool and is unresponsive and not breathing. You are an adult trained in CPR with breaths. No helper or phone is within reach; you would have to leave to call.'),
          cues: [__alloT('stem.firstresponse.reason_case2_key', 'Unresponsive after drowning; calling would require leaving them.'), __alloT('stem.firstresponse.reason_case2_context', 'The pool is in a backyard.'), __alloT('stem.firstresponse.reason_case2_guess', 'Water must be drained from their lungs before care.')],
          why: __alloT('stem.firstresponse.reason_case2_why', 'Begin CPR with rescue breaths as trained. When alone without a phone, give about 2 minutes of care before leaving to call 911. Breaths are especially important after drowning.'),
          transfer: __alloT('stem.firstresponse.reason_case2_transfer', 'With a phone at hand, use speakerphone to call while giving care. With a helper, send them to call and get an AED. Never put yourself in danger entering water.') },
        { id: 3, title: __alloT('stem.firstresponse.reason_case3_title', 'Bleeding on the field'), correct: 'pressure', source: 'bleed',
          scene: __alloT('stem.firstresponse.reason_case3_scene', 'A person is awake with blood rapidly flowing from a deep thigh wound. A helper is calling 911. Gloves and a dressing are beside you; a tourniquet is not yet available.'),
          cues: [__alloT('stem.firstresponse.reason_case3_key', 'Blood is flowing rapidly; a helper is already calling 911.'), __alloT('stem.firstresponse.reason_case3_context', 'The injury happened on a playing field.'), __alloT('stem.firstresponse.reason_case3_guess', 'Being awake means the bleeding can wait.')],
          why: __alloT('stem.firstresponse.reason_case3_why', 'Use the gloves and press firmly on the wound with the dressing. Keep pressure on. For life-threatening limb bleeding, use a manufactured tourniquet when available if trained; maintain pressure until it is ready.'),
          transfer: __alloT('stem.firstresponse.reason_case3_transfer', 'Severe blood loss can occur without spurting or bright-red blood. Look at the amount and flow, and keep watching for changes.') },
        { id: 4, title: __alloT('stem.firstresponse.reason_case4_title', 'Choking at dinner'), correct: 'heimlich', source: 'choking',
          scene: __alloT('stem.firstresponse.reason_case4_scene', 'A responsive adult at dinner cannot speak, cough, or breathe. Another person is calling 911. The adult is not pregnant, and you can reach around their abdomen.'),
          cues: [__alloT('stem.firstresponse.reason_case4_key', 'They are responsive but cannot speak, cough, or breathe.'), __alloT('stem.firstresponse.reason_case4_context', 'They are standing beside a dinner table.'), __alloT('stem.firstresponse.reason_case4_guess', 'A drink will wash the food down.')],
          why: __alloT('stem.firstresponse.reason_case4_why', 'Give 5 back blows, then 5 abdominal thrusts, repeating until the blockage clears or they become unresponsive. The inability to cough or speak signals severe choking.'),
          transfer: __alloT('stem.firstresponse.reason_case4_transfer', 'If they can cough forcefully, encourage coughing and monitor. If they become unresponsive, lower them safely and start CPR as trained. Choking care differs for infants and pregnancy.') },
        { id: 5, title: __alloT('stem.firstresponse.reason_case5_title', 'The AED arrives'), correct: 'aed', source: 'bls',
          scene: __alloT('stem.firstresponse.reason_case5_scene', 'A helper is doing CPR on an unresponsive adult who is not breathing normally. EMS has been called. You arrive with an AED and can attach its pads while the helper continues compressions.'),
          cues: [__alloT('stem.firstresponse.reason_case5_key', 'CPR is underway and an AED is now available.'), __alloT('stem.firstresponse.reason_case5_context', 'The AED has just been taken out of its case.'), __alloT('stem.firstresponse.reason_case5_guess', 'Every person receiving CPR will need a shock.')],
          why: __alloT('stem.firstresponse.reason_case5_why', 'Turn on the AED, apply its pads, and follow its prompts. Keep compressions going during setup where possible. Everyone must be clear during analysis and any shock; immediately resume CPR when prompted.'),
          transfer: __alloT('stem.firstresponse.reason_case5_transfer', 'An AED may say no shock is advised. That does not mean the person has recovered: follow its prompt to resume CPR.') },
        { id: 6, title: __alloT('stem.firstresponse.reason_case6_title', 'After a seizure'), correct: 'recovery', source: 'firstAid',
          scene: __alloT('stem.firstresponse.reason_case6_scene', 'A student has stopped having a seizure. They are unresponsive but breathing normally. A helper is speaking with 911. No head, neck, or back injury is suspected.'),
          cues: [__alloT('stem.firstresponse.reason_case6_key', 'The seizure has stopped; breathing is normal and no spinal injury is suspected.'), __alloT('stem.firstresponse.reason_case6_context', 'Other students are nearby.'), __alloT('stem.firstresponse.reason_case6_guess', 'They need something put into their mouth.')],
          why: __alloT('stem.firstresponse.reason_case6_why', 'Place them on their side in the recovery position and monitor breathing. Put nothing in their mouth. Follow the dispatcher while help is coming.'),
          transfer: __alloT('stem.firstresponse.reason_case6_transfer', 'If breathing stops or becomes only gasping, the priority changes to CPR and an AED. Do not assume someone is simply sleeping after a seizure.') },
        { id: 7, title: __alloT('stem.firstresponse.reason_case7_title', 'A sudden change in speech'), correct: 'callEMS', source: 'symptoms',
          scene: __alloT('stem.firstresponse.reason_case7_scene', 'A neighbor suddenly has slurred speech, one side of their face droops, and one arm is weak. You saw the symptoms begin 15 minutes ago. No one has called for help.'),
          cues: [__alloT('stem.firstresponse.reason_case7_key', 'The speech, face, and arm changes began suddenly.'), __alloT('stem.firstresponse.reason_case7_context', 'The person lives next door.'), __alloT('stem.firstresponse.reason_case7_guess', 'Symptoms must persist for an hour before calling.')],
          why: __alloT('stem.firstresponse.reason_case7_why', 'Call 911 for possible stroke and report when symptoms began. These signs need emergency assessment even if they improve. Do not wait to confirm a diagnosis.'),
          transfer: __alloT('stem.firstresponse.reason_case7_transfer', 'Sudden balance or vision changes can also be stroke warnings. You do not need every sign before calling.') },
        { id: 8, title: __alloT('stem.firstresponse.reason_case8_title', 'Chest discomfort and sweating'), correct: 'callEMS', source: 'symptoms',
          scene: __alloT('stem.firstresponse.reason_case8_scene', 'An adult has persistent chest pressure, feels sweaty, and reports discomfort in their arm. They are awake and breathing. They suggest waiting to see if it passes.'),
          cues: [__alloT('stem.firstresponse.reason_case8_key', 'Persistent chest pressure with sweating and arm discomfort.'), __alloT('stem.firstresponse.reason_case8_context', 'They are able to describe their symptoms.'), __alloT('stem.firstresponse.reason_case8_guess', 'Someone who can speak cannot be having a heart attack.')],
          why: __alloT('stem.firstresponse.reason_case8_why', 'Call 911 for possible heart attack. Stay with them and follow the dispatcher. Being awake does not make these warning signs safe to wait out.'),
          transfer: __alloT('stem.firstresponse.reason_case8_transfer', 'Symptoms vary. Shortness of breath, nausea, or discomfort in the back or jaw can also occur; chest pain need not be crushing.') },
        { id: 9, title: __alloT('stem.firstresponse.reason_case9_title', 'Unresponsive, breathing normally'), correct: 'recovery', source: 'recovery',
          scene: __alloT('stem.firstresponse.reason_case9_scene', 'An adult is unresponsive but breathing normally. No head, neck, or back injury is suspected. A helper has called 911 and is following the dispatcher. You are beside the person.'),
          cues: [__alloT('stem.firstresponse.reason_case9_key', 'Breathing is normal, with no suspected spinal injury; help has been called.'), __alloT('stem.firstresponse.reason_case9_context', 'A helper is standing nearby.'), __alloT('stem.firstresponse.reason_case9_guess', 'No visible injury means they do not need help.')],
          why: __alloT('stem.firstresponse.reason_case9_why', 'Use the recovery position and keep checking breathing and responsiveness. It helps protect their airway while help is coming. Unresponsiveness still requires emergency care.'),
          transfer: __alloT('stem.firstresponse.reason_case9_transfer', 'If a head, neck, or back injury is suspected, leave them as found unless movement is needed for safety, CPR, or bleeding control. Follow the dispatcher.') },
        { id: 10, title: __alloT('stem.firstresponse.reason_case10_title', 'Severe breathing difficulty'), correct: 'callEMS', source: 'firstAid',
          scene: __alloT('stem.firstresponse.reason_case10_scene', 'An adult with asthma is struggling to breathe and cannot speak in full sentences. Their rescue inhaler is empty. They are awake, sitting forward. Help has not been called.'),
          cues: [__alloT('stem.firstresponse.reason_case10_key', 'Severe breathing difficulty and no usable rescue inhaler.'), __alloT('stem.firstresponse.reason_case10_context', 'They are sitting in a chair.'), __alloT('stem.firstresponse.reason_case10_guess', 'They should walk around to improve their breathing.')],
          why: __alloT('stem.firstresponse.reason_case10_why', 'Call 911 and follow the dispatcher. Let them stay in a position that makes breathing easier, and monitor for changes. Do not delay help to look for another inhaler.'),
          transfer: __alloT('stem.firstresponse.reason_case10_transfer', 'If their own prescribed reliever is available, help them use it as trained. Severe or worsening breathing difficulty still needs urgent help.') }
      ];
      var FA_VIGNETTE_INDEX = FA_CASES.map(function (v) { return { id: v.id, short: v.title, correct: v.correct }; });
      function faReasoned(entry) { return !!(entry && Number.isFinite(entry.reasonedCount) && entry.reasonedCount > 0); }
      function faPracticed(entry) { return !!(entry && Number.isFinite(entry.practiceCount) && entry.practiceCount > 0); }
      function faIndependent(record, v) { return !!(record && record.complete && record.attempts === 1 && !record.hintUsed && record.firstCue === 0 && record.firstAction === v.correct); }
      var FA_SOURCES = {
        bls: { name: 'American Heart Association: adult basic life support', url: 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support' },
        water: { name: 'American Red Cross: water safety', url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/water-safety.html' },
        bleed: { name: 'American Red Cross: life-threatening bleeding', url: 'https://www.redcross.org/take-a-class/resources/learn-first-aid/bleeding-life-threatening-external' },
        choking: { name: 'American Red Cross: adult and child choking', url: 'https://www.redcross.org/take-a-class/resources/learn-first-aid/adult-child-choking' },
        firstAid: { name: 'American Heart Association / Red Cross: first aid', url: 'https://cpr.heart.org/en/resuscitation-science/2024-first-aid-guidelines' },
        symptoms: { name: 'American Heart Association: emergency warning signs', url: 'https://www.heart.org/en/about-us/heart-attack-and-stroke-symptoms' },
        recovery: { name: 'American Red Cross: unresponsive and breathing', url: 'https://www.redcross.org/take-a-class/resources/learn-first-aid/unresponsive-and-breathing-person' }
      };

      // ── State schema (defaults for first launch) ──
      var view = d.view || 'menu';
      var consentAccepted = !!d.consentAccepted;
      var modulesVisited = d.modulesVisited || {};
      var quizResults = d.quizResults || {};
      var badges = d.badges || {};
      var faMastery = d.faMastery || {};
      var quizState = d.quizState || { idx: 0, score: 0, answered: false, lastChoice: null };

      // ── Hydration + Canvas-survival persistence ──
      // The StemLab host's localStorage block does not include firstResponse,
      // so reloads wipe state by default. Layer our own: window slot →
      // localStorage → host state, plus project-JSON ride-along.
      var _frHydrated = useRef(false);
      if (!_frHydrated.current) {
        _frHydrated.current = true;
        try {
          var winState = (typeof window !== 'undefined' && window.__alloflowFirstResponse) || null;
          var lsState = null;
          try { lsState = JSON.parse(localStorage.getItem('firstResponse.state.v1') || 'null'); } catch (e) {}
          var seed = winState || lsState || null;
          if (seed && typeof seed === 'object') {
            var merge = {};
            if (seed.consentAccepted && d.consentAccepted === undefined) merge.consentAccepted = seed.consentAccepted;
            if (seed.badges && d.badges === undefined) merge.badges = seed.badges;
            if (seed.modulesVisited && d.modulesVisited === undefined) merge.modulesVisited = seed.modulesVisited;
            if (seed.faMastery && d.faMastery === undefined) merge.faMastery = seed.faMastery;
            if (Object.keys(merge).length > 0) updMulti(merge);
          }
        } catch (e) {}
      }

      // Keep this hook in the host's fixed hook order, even outside scenarios.
      useEffect(function () {
        if (view !== 'scenarios' || typeof document === 'undefined') return;
        var heading = document.querySelector('[data-fr-sim-heading]');
        if (heading) heading.focus();
      }, [view, d.scenarioPick, d.scenarioStep, d.mhAcknowledged]);


      useEffect(function () {
        if (view !== 'call' || d.callView !== 'practice' || typeof document === 'undefined') return;
        var heading = document.querySelector('[data-fr-dispatch-heading]');
        if (heading) heading.focus();
      }, [view, d.callView, d.dispatchPractice && d.dispatchPractice.caseId, d.dispatchPractice && d.dispatchPractice.mode, d.dispatchPractice && d.dispatchPractice.turn]);

      useEffect(function () {
        if ((view !== 'firstAction' && view !== 'mastery') || typeof document === 'undefined') return;
        var heading = document.querySelector('[data-fr-reason-heading]');
        if (heading) heading.focus();
      }, [view, d.faPractice && d.faPractice.run, d.faPractice && d.faPractice.position]);

      // Live 30:2 rehearsal stays in memory. Persisting 30-60 timestamps through
      // ctx.update would churn host storage and can distort the very rhythm being
      // measured. Only a completed summary is written back to toolData.
      var _frCoachVersion = useState(0);
      var frCoachVersion = _frCoachVersion[0];
      var setFrCoachVersion = _frCoachVersion[1];
      var frCoachRef = useRef(null);
      var frCoachTimerRef = useRef(null);
      function makeFrCoachState() {
        return {
          running: false, phase: 'idle', cycle: 1,
          compressionCount: 0, breathCount: 0,
          intervals: [], pauseDurations: [], pauseStartedAt: 0,
          lastCompressionAt: 0, lastCompressionEpoch: 0,
          lastBreathAt: 0, lastBreathEpoch: 0, startedAtEpoch: 0,
          compressionSegmentEpoch: 0, phaseStartedAt: 0, summary: null,
          scenarioSteps: [], assessmentAt: 0, callAt: 0, aedAt: 0,
          activeCompressionAt: 0, holdDurations: [], releaseCount: 0, lastScenarioReleaseAt: 0
        };
      }
      if (!frCoachRef.current) frCoachRef.current = makeFrCoachState();
      var _bleedPracticeVersion = useState(0);
      var bleedPracticeVersion = _bleedPracticeVersion[0];
      var setBleedPracticeVersion = _bleedPracticeVersion[1];
      var bleedPracticeRef = useRef(null);
      function makeBleedPracticeState() {
        return {
          caseId: null, phase: 'select', holding: false, holdStartedAt: 0,
          pressureHoldMs: 0, packed: false, tourniquetPlacement: null,
          windlassTurns: 0, mistakes: [], sequence: [], summary: null
        };
      }
      if (!bleedPracticeRef.current) bleedPracticeRef.current = makeBleedPracticeState();
      function refreshBleedPractice() {
        setBleedPracticeVersion(function (n) { return n + 1; });
      }
      function bleedPracticeNow() {
        try { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
        catch (e) { return Date.now(); }
      }

      // Choking practice is a short decision-and-sequence rehearsal. Keep its
      // tap-by-tap state in memory and persist only the completed debrief.
      var _chokePracticeVersion = useState(0);
      var chokePracticeVersion = _chokePracticeVersion[0];
      var setChokePracticeVersion = _chokePracticeVersion[1];
      var chokePracticeRef = useRef(null);
      function makeChokePracticeState() {
        return {
          caseId: null, phase: 'select', backBlows: 0, thrusts: 0,
          placementCorrect: false, mistakes: [], sequence: [], summary: null
        };
      }
      if (!chokePracticeRef.current) chokePracticeRef.current = makeChokePracticeState();
      function refreshChokePractice() {
        setChokePracticeVersion(function (n) { return n + 1; });
      }

      function frCoachNow() {
        try { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
        catch (e) { return Date.now(); }
      }
      function refreshFrCoach() {
        setFrCoachVersion(function (n) { return n + 1; });
      }
      function clearFrCoachTimer() {
        if (frCoachTimerRef.current) {
          clearTimeout(frCoachTimerRef.current);
          frCoachTimerRef.current = null;
        }
      }
      function resetFrCoachSession(message) {
        clearFrCoachTimer();
        frCoachRef.current = makeFrCoachState();
        if (message) frAnnounce(message);
        refreshFrCoach();
      }
      useEffect(function () {
        function onVisibilityChange() {
          if (typeof document !== 'undefined' && document.hidden && frCoachRef.current.running) {
            resetFrCoachSession('Practice reset because the page was hidden.');
          }
        }
        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibilityChange);
        return function () {
          if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibilityChange);
          clearFrCoachTimer();
        };
      }, []);
      useEffect(function () {
        if (view !== 'body3d' && frCoachRef.current.running) {
          resetFrCoachSession('Practice reset after leaving the 3D coach.');
        }
      }, [view]);
      // Mirror persistent state to window slot + localStorage.
      useEffect(function () {
        try {
          var snapshot = {
            consentAccepted: !!d.consentAccepted,
            badges: d.badges || {},
            modulesVisited: d.modulesVisited || {},
            faMastery: d.faMastery || {},
            _ts: Date.now()
          };
          window.__alloflowFirstResponse = snapshot;
          try { localStorage.setItem('firstResponse.state.v1', JSON.stringify(snapshot)); } catch (e) {}
        } catch (e) {}
      }, [d.consentAccepted, d.badges, d.modulesVisited, d.faMastery]);

      // Hot-reload from project-JSON load mid-session.
      useEffect(function () {
        function onRestore() {
          try {
            var w = window.__alloflowFirstResponse || {};
            var patch = {};
            if (w.consentAccepted) patch.consentAccepted = w.consentAccepted;
            if (w.badges) patch.badges = w.badges;
            if (w.modulesVisited) patch.modulesVisited = w.modulesVisited;
            if (w.faMastery) patch.faMastery = w.faMastery;
            if (Object.keys(patch).length > 0) updMulti(patch);
          } catch (e) {}
        }
        window.addEventListener('alloflow-firstresponse-restored', onRestore);
        return function () { window.removeEventListener('alloflow-firstresponse-restored', onRestore); };
      }, []);

      // ── CPR & AED metronome (fixed hook slots) ──
      // render() runs inline in the host component, so these hooks may NOT
      // live inside renderCprAed(): that function only runs on the 'cprAed'
      // dispatch branch, and conditional hooks change the host's hook count
      // on navigation (React #310). renderCprAed reads them via closure.
      var cprView = d.cprView || 'overview';
      var bpm = typeof d.cprBpm === 'number' ? d.cprBpm : 110;
      if (bpm < 100) bpm = 100;
      if (bpm > 120) bpm = 120;
      var audioOn = !!d.cprAudio; // default OFF — sensory accommodation

      // Visual metronome beat tracker — pulses a circle in time with bpm.
      // Use a state-driven beat counter (re-render on each tick) rather than
      // raw DOM mutation so the live region announcement works for SR users
      // when beat lands on certain milestones.
      var beatTuple = useState(0);
      var beat = beatTuple[0], setBeat = beatTuple[1];
      var audioCtxRef = useRef(null);
      var intervalRef = useRef(null);

      // Close the AudioContext on unmount. Browsers limit ~4-6 contexts
      // per tab; without this, a student who navigates in and out of
      // FirstResponse multiple times in a session can silently lose
      // metronome audio after a few visits.
      useEffect(function() {
        return function() {
          if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            try { audioCtxRef.current.close(); } catch (e) {}
            audioCtxRef.current = null;
          }
        };
      }, []);

      // Drive the metronome only while the CPR & AED module is open AND the
      // Create-or-resume, called from the audio toggle (a real user gesture,
      // which is what the autoplay policy actually requires) and again from each
      // tick as a cheap safety net. Returns a RUNNING context or null; callers
      // must not assume a context they were handed is audible.
      function frEnsureAudio() {
        try {
          if (!audioCtxRef.current) {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            audioCtxRef.current = new AC();
          }
          var ac = audioCtxRef.current;
          if (ac.state === 'suspended' && typeof ac.resume === 'function') {
            audioCtxRef.resumeAskedAt = Date.now();
            ac.resume();
          }
          return ac;
        } catch (e) { return null; }
      }

      // user is on its metronome/practice sub-view. Tearing down on view or
      // sub-view change prevents background audio.
      useEffect(function() {
        if (view !== 'cprAed' || (cprView !== 'metronome' && cprView !== 'practice')) {
          if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
          return;
        }
        var intervalMs = Math.round(60000 / bpm);
        intervalRef.current = setInterval(function() {
          setBeat(function(b) { return b + 1; });
          if (audioOn) {
            try {
              var ac = frEnsureAudio();
              if (ac && ac.state === 'running') {
                var osc = ac.createOscillator();
                var gain = ac.createGain();
                osc.frequency.value = 880;
                gain.gain.setValueAtTime(0.0001, ac.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.005);
                gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.06);
                osc.connect(gain).connect(ac.destination);
                osc.start();
                osc.stop(ac.currentTime + 0.07);
              }
            } catch(e) { /* audio init can fail silently on autoplay-blocked tabs */ }
          }
        }, intervalMs);
        return function() {
          if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        };
      }, [view, cprView, bpm, audioOn]);

      // Award badge once (idempotent). frAnnounce + toast for SR + visual feedback.
      function awardBadge(id, label) {
        if (badges[id]) return;
        var nextBadges = Object.assign({}, badges);
        nextBadges[id] = { earned: new Date().toISOString(), label: label };
        upd('badges', nextBadges);
        badges = nextBadges; // keep this render's copy current: a second award in one handler must add, not replace
        addToast('🏅 Badge: ' + label);
        frAnnounce('Badge earned: ' + label);
      }

      function markVisited(modId) {
        if (modulesVisited[modId]) return;
        var nextVisited = Object.assign({}, modulesVisited);
        nextVisited[modId] = new Date().toISOString();
        upd('modulesVisited', nextVisited);
      }

      // Theme tokens — match RoadReady palette so the tool feels native.
      var T = {
        bg: '#0f172a', card: '#1e293b', cardAlt: '#0b1426', border: 'var(--allo-stem-border, #334155)',
        text: '#f1f5f9', muted: '#cbd5e1', dim: '#94a3b8',
        accent: '#dc2626', accentHi: '#fca5a5',
        ok: '#22c55e', warn: '#f59e0b', danger: '#ef4444',
        link: '#93c5fd'
      };

      // Shared button style helper (keeps focus-visible behavior consistent).
      function btn(extra) {
        return Object.assign({
          padding: '10px 16px', borderRadius: 10, border: '1px solid ' + T.border,
          background: T.card, color: T.text, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', textAlign: 'left'
        }, extra || {});
      }
      function btnPrimary(extra) {
        return Object.assign(btn({ background: T.accent, color: '#fff', border: '1px solid ' + T.accent }), extra || {});
      }

      // ─────────────────────────────────────────
      // CONSENT SCREEN — one-time gate
      // ─────────────────────────────────────────
      function renderConsent() {
        return h('div', { 'data-fr-focusable': true,
          style: { padding: 24, maxWidth: 720, margin: '0 auto', color: T.text, background: T.bg, borderRadius: 12 } },
          h('div', { role: 'region', 'aria-label': __alloT('stem.firstresponse.first_response_lab_consent_and_educati', 'First Response Lab consent and educational scope'),
            style: { background: '#7f1d1d', border: '1px solid #dc2626', borderRadius: 14, padding: 24 } },
            h('h2', { style: { margin: '0 0 12px', fontSize: 22, color: '#fde2e2' } },
              __alloT('stem.firstresponse.first_response_lab_is_an_educational_t', '🚑 First Response Lab is an EDUCATIONAL tool.')),
            h('p', { style: { margin: '0 0 12px', color: '#fde2e2', lineHeight: 1.55 } },
              __alloT('stem.firstresponse.it_teaches_you_to', 'It teaches you to '),
              h('strong', null, 'recognize'),
              __alloT('stem.firstresponse.medical_emergencies_and', ' medical emergencies and '),
              h('strong', null, __alloT('stem.firstresponse.what_to_do', 'what to do')),
              __alloT('stem.firstresponse.it_is', '. It is '),
              h('strong', null, 'NOT'),
              __alloT('stem.firstresponse.a_substitute_for_hands_on_certificatio', ' a substitute for hands-on certification.')),
            h('p', { style: { margin: '0 0 12px', color: '#fde2e2', lineHeight: 1.55 } },
              __alloT('stem.firstresponse.to_get_certified_take_a_course_with_th', 'To get certified, take a course with the '),
              h('a', { href: 'https://www.redcross.org/take-a-class', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, __alloT('stem.firstresponse.american_red_cross', 'American Red Cross')),
              __alloT('stem.firstresponse.the', ', the '),
              h('a', { href: 'https://cpr.heart.org', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, __alloT('stem.firstresponse.american_heart_association', 'American Heart Association')),
              __alloT('stem.firstresponse.or_your_local', ', or your local '),
              h('a', { href: 'https://www.maine.gov/ems', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, __alloT('stem.firstresponse.maine_ems', 'Maine EMS')),
              ' chapter.'),
            h('p', { style: { margin: '0 0 16px', color: '#fde2e2', lineHeight: 1.55 } },
              h('strong', null, __alloT('stem.firstresponse.in_a_real_emergency_call_911', 'In a real emergency, call 911.')),
              __alloT('stem.firstresponse.in_maine_you_can', ' In Maine, you can '),
              h('strong', null, __alloT('stem.firstresponse.text_911', 'text 911')),
              __alloT('stem.firstresponse.if_you_cannot_speak', ' if you cannot speak.')),
            h('button', { 'data-fr-focusable': true,
              'aria-label': __alloT('stem.firstresponse.i_understand_show_me_the_lab', 'I understand. Show me the lab.'),
              onClick: function() {
                updMulti({ consentAccepted: true, consentDate: new Date().toISOString(), view: 'menu' });
                awardBadge('first_responder_in_training', 'First Responder in Training');
                frAnnounceUrgent(__alloT('stem.firstresponse.sr_consent_accepted_welcome_to_first_response_lab', 'Consent accepted. Welcome to First Response Lab.'));
              },
              style: { padding: '12px 22px', borderRadius: 10, border: 'none', background: '#fff', color: '#7f1d1d', fontSize: 15, fontWeight: 700, cursor: 'pointer' }
            }, __alloT('stem.firstresponse.i_understand_show_me_the_lab_2', 'I understand — show me the lab'))
          ),
          h('p', { style: { marginTop: 14, fontSize: 12, color: T.dim, fontStyle: 'italic' } },
            __alloT('stem.firstresponse.acknowledging_this_screen_is_a_one_tim', 'Acknowledging this screen is a one-time gate. Your acknowledgment is saved with your profile so you do not see it again.'))
        );
      }

      // ─────────────────────────────────────────
      // PERSISTENT BANNER (shown above every clinical view)
      // ─────────────────────────────────────────
      function emergencyBanner() {
        return h('div', { role: 'region', 'aria-label': __alloT('stem.firstresponse.emergency_reminder', 'Emergency reminder'),
          style: { margin: '0 0 14px', padding: '10px 14px', borderRadius: 10, background: '#7f1d1d', border: '1px solid #dc2626', color: '#fde2e2', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
          h('span', { 'aria-hidden': 'true' }, '🚑'),
          h('span', null,
            h('strong', null, __alloT('stem.firstresponse.in_a_real_emergency_call_911_2', 'In a real emergency: call 911')),
            __alloT('stem.firstresponse.in_maine_you_can_text_911_this_tool_is', ' — in Maine you can text 911. This tool is educational only.'))
        );
      }

      // ─────────────────────────────────────────
      // DISCLAIMER FOOTER (renders below every clinical content view)
      // ─────────────────────────────────────────
      function disclaimerFooter() {
        return h('div', { role: 'contentinfo', 'aria-label': __alloT('stem.firstresponse.educational_disclaimer', 'Educational disclaimer'),
          style: { marginTop: 18, padding: '10px 14px', borderRadius: 8, background: T.cardAlt, border: '1px dashed ' + T.border, color: T.dim, fontSize: 11, textAlign: 'center', lineHeight: 1.55 } },
          __alloT('stem.firstresponse.educational_only_real_emergencies', 'Educational only. Real emergencies → '),
          h('strong', { style: { color: T.accentHi } }, '911'),
          __alloT('stem.firstresponse.get_certified', '. Get certified → '),
          h('a', { href: 'https://www.redcross.org/take-a-class', target: '_blank', rel: 'noopener', style: { color: T.link, textDecoration: 'underline' } }, 'redcross.org'),
          ' · ',
          h('a', { href: 'https://cpr.heart.org', target: '_blank', rel: 'noopener', style: { color: T.link, textDecoration: 'underline' } }, 'heart.org'),
          ' · ',
          h('a', { href: 'https://www.stopthebleed.org', target: '_blank', rel: 'noopener', style: { color: T.link, textDecoration: 'underline' } }, 'stopthebleed.org')
        );
      }

      // ─────────────────────────────────────────
      // MENU — module router
      // ─────────────────────────────────────────
      // Tile metadata. order = top-down on the menu. status indicator shows
      // whether the user has visited that module (small green dot).
      var MENU_TILES = [
        { id: 'recognize', icon: '👁️', label: __alloT('stem.firstresponse.recognize', 'Recognize'), desc: __alloT('stem.firstresponse.visual_signs_of_12_emergencies_quiz_at', 'Visual signs of 12 emergencies. Quiz at the end.'), ready: true },
        { id: 'call', icon: '📞', label: __alloT('stem.firstresponse.call_911_988', 'Call (911 + 988)'), desc: __alloT('stem.firstresponse.what_to_say_text_to_911_when_988_vs_91', 'What to say. Text-to-911. When 988 vs 911.'), ready: true },
        { id: 'cprAed', icon: '❤️', label: __alloT('stem.firstresponse.cpr_aed', 'CPR + AED'), desc: __alloT('stem.firstresponse.hands_only_rhythm_trainer_aed_walkthro', 'Hands-only rhythm trainer. AED walkthrough.'), ready: true },
        { id: 'body3d', icon: '🫀', label: __alloT('stem.firstresponse.body_position_3d', 'Body position (3D)'), desc: __alloT('stem.firstresponse.body_position_3d_desc', 'Explore an age-aware 3D training manikin: adult, child, infant. Practice hand placement, depth and recoil, a guided 30:2 compression + breath cycle, AED pad placement, recovery position, and {count} scenarios.').replace('{count}', CALL_CASES.length), ready: true },
        { id: 'bleed', icon: '🩸', label: __alloT('stem.firstresponse.stop_the_bleed', 'Stop the Bleed'), desc: __alloT('stem.firstresponse.pressure_packing_tourniquet', 'Pressure, wound packing, and tourniquet decisions.'), ready: true },
        { id: 'choking', icon: '😬', label: __alloT('stem.firstresponse.choking', 'Choking'), desc: __alloT('stem.firstresponse.infant_child_adult_pregnant_alone', 'Infant, child, adult, pregnant, alone.'), ready: true },
        { id: 'disabilityAware', icon: '♾️', label: __alloT('stem.firstresponse.disability_aware_response', 'Disability-aware response'), desc: __alloT('stem.firstresponse.deaf_hoh_autistic_epilepsy_hidden_disa', 'Deaf/HoH, autistic, epilepsy, hidden disability.'), ready: true },
        { id: 'scenarios', icon: '🎭', label: __alloT('stem.firstresponse.scenario_sim', 'Scenario sim'), desc: __alloT('stem.firstresponse.multi_step_branching_emergency_decisio', 'Multi-step branching emergency decisions.'), ready: true },
        { id: 'firstAction', icon: '🎯', label: __alloT('stem.firstresponse.first_action_sleuth', 'First Action Sleuth'), desc: __alloT('stem.firstresponse.reason_menu_sleuth_desc', 'Connect the key observation to your next action in 10 scenes. Get coaching and revisit missed decisions.'), ready: true },
        { id: 'aiPractice', icon: '🤖', label: __alloT('stem.firstresponse.ai_practice', 'AI Practice'), desc: __alloT('stem.firstresponse.novel_scenes_you_write_the_response_ai', 'Novel scenes — you write the response, AI critiques.'), ready: true },
        { id: 'mastery', icon: '🏅', label: __alloT('stem.firstresponse.reason_menu_record', 'Practice record'), desc: __alloT('stem.firstresponse.reason_menu_record_desc', 'See clue-and-action connections, supported practice, and scenes to revisit.'), ready: true },
        { id: 'resources', icon: '📚', label: __alloT('stem.firstresponse.resources', 'Resources'), desc: __alloT('stem.firstresponse.every_org_cited_in_this_tool_tap_to_ca', 'Every org cited in this tool. Tap to call or visit.'), ready: true }
      ];

      function renderMenu() {
        var _mMastery = (d.faMastery && typeof d.faMastery === 'object') ? d.faMastery : {};
        var _mDoneCount = FA_VIGNETTE_INDEX.filter(function(v) { return faReasoned(_mMastery[v.id]); }).length;
        var _mTotal = FA_VIGNETTE_INDEX.length;
        var coreIds = ['recognize', 'call', 'cprAed', 'bleed', 'choking'];
        var coreTiles = coreIds.map(function(id) { return MENU_TILES.filter(function(tile) { return tile.id === id; })[0]; }).filter(Boolean);
        var catalogTiles = MENU_TILES.filter(function(tile) { return coreIds.indexOf(tile.id) < 0; });
        var learningTiles = MENU_TILES.filter(function(tile) { return tile.id !== 'resources'; });
        var visitedCount = learningTiles.filter(function(tile) { return !!modulesVisited[tile.id]; }).length;
        var coreCompleted = coreTiles.filter(function(tile) { return !!modulesVisited[tile.id]; }).length;
        var nextTile = coreTiles.filter(function(tile) { return !modulesVisited[tile.id]; })[0]
          || learningTiles.filter(function(tile) { return !modulesVisited[tile.id]; })[0]
          || MENU_TILES.filter(function(tile) { return tile.id === 'mastery'; })[0];

        function openTile(tile) {
          if (!tile || !tile.ready) return;
          upd('view', tile.id);
          markVisited(tile.id);
          frAnnounce('Opening ' + tile.label);
        }

        function metric(label, value) {
          return h('div', { className: 'firstresponse-metric', role: 'listitem' },
            h('span', { className: 'firstresponse-metric-label' }, label),
            h('strong', { className: 'firstresponse-metric-value' }, value));
        }

        function renderTile(tile, core, compact) {
          var visited = !!modulesVisited[tile.id];
          return h('div', { key: tile.id, role: 'listitem', className: 'firstresponse-tile-wrap' },
            h('button', {
              type: 'button',
              className: 'firstresponse-menu-tile' + (compact ? ' firstresponse-menu-tile--compact' : ''),
              'data-fr-focusable': true,
              disabled: !tile.ready,
              'aria-label': tile.label + (visited ? ' (visited)' : '') + (core ? ' - core response step' : ''),
              onClick: function() { openTile(tile); },
              style: btn({
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                padding: 14, background: core ? '#101b3d' : T.card,
                borderColor: visited ? T.ok : (core ? '#3b82f6' : T.border),
                borderWidth: core ? 2 : 1, borderStyle: 'solid'
              })
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, width: '100%' } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, tile.icon),
                h('span', { style: { fontWeight: 700, fontSize: compact ? 13 : 14, flex: 1 } }, tile.label),
                visited && h('span', { 'aria-hidden': 'true', style: { color: T.ok, fontSize: 14 } }, '\u2713')),
              h('div', { style: { fontSize: compact ? 11 : 12, color: T.muted, lineHeight: 1.45 } }, tile.desc)
            )
          );
        }

        return h('main', { className: 'firstresponse-menu-shell', 'data-firstresponse-readiness': 'true' },
          emergencyBanner(),
          h('header', { className: 'firstresponse-command' },
            h('div', { className: 'firstresponse-command-top' },
              h('div', null,
                h('p', { className: 'firstresponse-eyebrow' }, __alloT('stem.firstresponse.readiness_label', 'Emergency response readiness')),
                h('h2', { className: 'firstresponse-title' }, __alloT('stem.firstresponse.first_response_lab', 'First Response Lab')),
                h('p', { className: 'firstresponse-subtitle' }, __alloT('stem.firstresponse.readiness_blurb', 'Build the decision sequence: recognize the emergency, activate help, then choose the appropriate first action.'))),
              h('div', { className: 'firstresponse-status', role: 'status' }, __alloT('stem.firstresponse.education_status', 'Educational only - real emergencies: call 911'))),
            h('div', { className: 'firstresponse-metrics', role: 'list', 'aria-label': __alloT('stem.firstresponse.progress_label', 'First Response progress') },
              metric(__alloT('stem.firstresponse.core_readiness', 'Core readiness'), coreCompleted + ' / ' + coreTiles.length),
              metric(__alloT('stem.firstresponse.modules_explored', 'Modules explored'), visitedCount + ' / ' + learningTiles.length),
              metric(__alloT('stem.firstresponse.reason_menu_progress', 'Clue + action practice'), _mDoneCount + ' / ' + _mTotal),
              metric(__alloT('stem.firstresponse.badges', 'Badges'), String(Object.keys(badges).length))),
            h('div', { className: 'firstresponse-actions' },
              h('button', { type: 'button', className: 'firstresponse-primary', onClick: function() { openTile(nextTile); } },
                coreCompleted < coreTiles.length ? __alloT('stem.firstresponse.continue_core', 'Continue core response path') : __alloT('stem.firstresponse.continue_practice', 'Continue practice')),
              h('span', { className: 'firstresponse-action-note' }, nextTile ? nextTile.label : __alloT('stem.firstresponse.review', 'Review mastery')))),

          h('section', { className: 'firstresponse-section', 'aria-labelledby': 'firstresponse-core-heading' },
            h('div', { className: 'firstresponse-section-head' },
              h('div', null,
                h('h3', { id: 'firstresponse-core-heading' }, __alloT('stem.firstresponse.core_path', 'Recognize - Call - Act')),
                h('p', null, __alloT('stem.firstresponse.core_path_blurb', 'Start with recognition and emergency activation, then learn the core response modules.'))),
              h('span', { className: 'firstresponse-action-note' }, coreCompleted + ' / ' + coreTiles.length)),
            h('div', { className: 'firstresponse-core-grid', role: 'list' },
              coreTiles.map(function(tile) { return renderTile(tile, true, false); }))),

          h('details', { className: 'firstresponse-catalog', open: coreCompleted === coreTiles.length },
            h('summary', null, __alloT('stem.firstresponse.more_practice', 'More practice, accessibility, mastery, and resources') + ' (' + catalogTiles.length + ')'),
            h('div', { className: 'firstresponse-catalog-grid', role: 'list' },
              catalogTiles.map(function(tile) { return renderTile(tile, false, true); }))),

          Object.keys(badges).length > 0 && h('section', { className: 'firstresponse-badges', 'aria-label': __alloT('stem.firstresponse.badges_earned', 'Badges earned') },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 } }, __alloT('stem.firstresponse.badges_earned', 'Badges earned')),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              Object.keys(badges).map(function(bid) {
                return h('span', { key: bid, style: { fontSize: 11, padding: '4px 10px', borderRadius: '999rem', background: '#1e3a8a', color: '#dbeafe', border: '1px solid #1e40af' } }, badges[bid].label || bid);
              }))),
          disclaimerFooter()
        );
      }

      // Back button (returns to menu)
      function backBar(title) {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' } },
          h('button', { 'data-fr-focusable': true,
            'aria-label': __alloT('stem.firstresponse.back_to_first_response_lab_menu', 'Back to First Response Lab menu'),
            onClick: function() { upd('view', 'menu'); frAnnounce(__alloT('stem.firstresponse.sr_back_to_menu', 'Back to menu')); },
            style: btn({ padding: '6px 12px', fontSize: 12 })
          }, __alloT('stem.firstresponse.menu', '← Menu')),
          h('h2', { style: { margin: 0, fontSize: 18, color: T.text, flex: 1 } }, title)
        );
      }

      // ─────────────────────────────────────────
      // RECOGNIZE module — card grid + 5-Q quiz
      // ─────────────────────────────────────────
      function bandIncludes(card, band) {
        if (card.bands === 'all') return true;
        return card.bands.split(',').indexOf(band) !== -1;
      }

      function renderRecognize() {
        var visibleCards = RECOGNIZE_CARDS.filter(function(c) { return bandIncludes(c, gradeBand); });
        var showQuiz = (d.recognizeView === 'quiz');
        return h('div', { style: { padding: 20, maxWidth: 960, margin: '0 auto', color: T.text } },
          backBar('👁️ Recognize'),
          emergencyBanner(),
          !showQuiz && h('div', null,
            h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              __alloT('stem.firstresponse.these_are_the', 'These are the '),
              h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.recognition_cues', 'recognition cues')),
              __alloT('stem.firstresponse.what_you_would_actually_see_tap_a_card', ' — what you would actually see. Tap a card for the first action at your grade band ('),
              h('strong', { style: { color: T.text } }, gradeBand.toUpperCase()),
              __alloT('stem.firstresponse.sources_cited_on_each_card', '). Sources cited on each card.')),
            h('div', { role: 'list',
              style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 } },
              visibleCards.map(function(card) {
                var firstText = card.first[gradeBand] || card.first.g68 || card.first.g912 || '';
                return h('div', { key: card.id, role: 'listitem',
                  style: { padding: 12, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, card.icon),
                    h('span', { style: { fontWeight: 700, fontSize: 14 } }, card.name)
                  ),
                  h('div', { style: { fontSize: 12, color: T.accentHi, fontStyle: 'italic', marginBottom: 6 } },
                    'Sign: ', card.cue),
                  h('div', { style: { fontSize: 13, color: T.text, lineHeight: 1.5, marginBottom: 6 } },
                    h('strong', null, __alloT('stem.firstresponse.first_action', 'First action: ')), firstText),
                  h('div', { style: { fontSize: 10, color: T.dim, fontStyle: 'italic' } },
                    'Source: ', card.source)
                );
              })
            ),
            h('div', { style: { marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' } },
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.start_the_5_question_recognition_quiz', 'Start the 5-question recognition quiz'),
                onClick: function() {
                  updMulti({ recognizeView: 'quiz', quizState: { idx: 0, score: 0, answered: false, lastChoice: null } });
                  frAnnounce(__alloT('stem.firstresponse.sr_quiz_started_question_1_of_5', 'Quiz started. Question 1 of 5.'));
                },
                style: btnPrimary()
              }, __alloT('stem.firstresponse.take_the_5_question_quiz', '🎯 Take the 5-question quiz')),
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.go_to_resources_tab', 'Go to Resources tab'),
                onClick: function() { upd('view', 'resources'); markVisited('resources'); },
                style: btn()
              }, __alloT('stem.firstresponse.resources_2', '📚 Resources'))
            ),
            disclaimerFooter()
          ),
          showQuiz && renderRecognizeQuiz()
        );
      }

      function renderRecognizeQuiz() {
        var qs = quizState;
        // End screen
        if (qs.idx >= RECOGNIZE_QUIZ.length) {
          var pct = Math.round((qs.score / RECOGNIZE_QUIZ.length) * 100);
          // Persist result + award badge for any pass.
          // Side effect on render is intentional here — we want to award once
          // when the user lands on the end screen.
          if (!d.lastQuizResult || d.lastQuizResult.idx !== qs.idx || d.lastQuizResult.score !== qs.score) {
            updMulti({
              quizResults: Object.assign({}, quizResults, {
                recognize: { correct: qs.score, total: RECOGNIZE_QUIZ.length, dateISO: new Date().toISOString() }
              }),
              lastQuizResult: { idx: qs.idx, score: qs.score }
            });
            if (qs.score >= 4) awardBadge('recognizer', 'Recognizer (4+/5 on Recognize quiz)');
            if (qs.score === RECOGNIZE_QUIZ.length) awardBadge('recognizer_perfect', 'Sharp Eyes (perfect score)');
          }
          // Tier message scaling — uses the existing pct >= 80 threshold but offers
          // more granular feedback at the in-between band.
          var tier = qs.score === RECOGNIZE_QUIZ.length ? 'perfect'
                     : pct >= 80 ? 'strong'
                     : pct >= 50 ? 'learning'
                     : 'review';
          var tierColor = tier === 'perfect' ? '#fbbf24'
                          : tier === 'strong' ? T.ok
                          : tier === 'learning' ? '#f59e0b'
                          : T.danger;
          var tierIcon = tier === 'perfect' ? '🏆' : tier === 'strong' ? '🎉' : tier === 'learning' ? '📚' : '📖';
          var tierTitle = tier === 'perfect' ? 'Sharp Eyes — perfect score!'
                          : tier === 'strong' ? 'Solid recognition'
                          : tier === 'learning' ? 'Building the eye'
                          : 'Review the cards';
          var tierMsg = tier === 'perfect'
                        ? 'You can recognize every emergency in the deck. Move on to action modules — CPR + AED, Stop the Bleed, Choking.'
                        : tier === 'strong'
                          ? 'You have solid recognition. Move on to the action modules — Call, CPR + AED, Stop the Bleed.'
                          : tier === 'learning'
                            ? 'Halfway there. Re-read the cards for the emergencies that tripped you up — recognition is the gate to response.'
                            : 'Recognition is the most important step — you can’t respond to what you don’t see. Review the cards and try again.';
          var rad = 36, circ = 2 * Math.PI * rad;
          var dashOff = circ - (pct / 100) * circ;
          return h('div', { role: 'region', 'aria-label': __alloT('stem.firstresponse.quiz_results', 'Quiz results'),
            style: { padding: 0, borderRadius: 14, overflow: 'hidden', border: '2px solid ' + tierColor + 'aa', background: T.card } },
            h('div', {
              style: {
                padding: 18,
                background: 'linear-gradient(135deg, ' + tierColor + '22, transparent)',
                display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap'
              }
            },
              // Score donut
              h('div', { style: { position: 'relative', width: 96, height: 96, flexShrink: 0 } },
                h('svg', { viewBox: '0 0 100 100', width: 96, height: 96,
                  'aria-label': 'Score: ' + qs.score + ' out of ' + RECOGNIZE_QUIZ.length
                },
                  h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: 'rgba(148,163,184,0.25)', strokeWidth: 9 }),
                  h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: tierColor, strokeWidth: 9, strokeLinecap: 'round',
                    strokeDasharray: circ, strokeDashoffset: dashOff, transform: 'rotate(-90 50 50)' })
                ),
                h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
                  h('div', { style: { fontSize: 22, fontWeight: 900, color: tierColor, lineHeight: 1 } }, pct + '%'),
                  h('div', { style: { fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.muted } }, qs.score + ' / ' + RECOGNIZE_QUIZ.length)
                )
              ),
              // Tier headline + message
              h('div', { style: { flex: 1, minWidth: 220 } },
                h('div', { style: { fontSize: 30, marginBottom: 4 }, 'aria-hidden': 'true' }, tierIcon),
                h('h3', { style: { margin: '0 0 6px', fontSize: 18, color: tierColor, fontWeight: 900, lineHeight: 1.15 } }, tierTitle),
                h('p', { style: { margin: 0, color: T.text, fontSize: 13, lineHeight: 1.55 } }, tierMsg)
              )
            ),
            h('div', { style: { padding: 14, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', borderTop: '1px solid ' + T.border } },
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.retake_the_recognition_quiz', 'Retake the recognition quiz'),
                onClick: function() {
                  updMulti({ quizState: { idx: 0, score: 0, answered: false, lastChoice: null }, lastQuizResult: null });
                  frAnnounce(__alloT('stem.firstresponse.sr_quiz_restarted_question_1_of_5', 'Quiz restarted. Question 1 of 5.'));
                },
                style: btn()
              }, __alloT('stem.firstresponse.retake', '↺ Retake')),
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.back_to_recognize_cards', 'Back to recognize cards'),
                onClick: function() { upd('recognizeView', 'cards'); frAnnounce(__alloT('stem.firstresponse.sr_back_to_recognize_cards', 'Back to recognize cards')); },
                style: btn()
              }, __alloT('stem.firstresponse.back_to_cards', '← Back to cards')),
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.back_to_menu', 'Back to menu'),
                onClick: function() { upd('view', 'menu'); frAnnounce(__alloT('stem.firstresponse.sr_back_to_menu', 'Back to menu')); },
                style: btnPrimary()
              }, __alloT('stem.firstresponse.menu_2', '→ Menu'))
            ),
            disclaimerFooter()
          );
        }
        // Question screen
        var q = RECOGNIZE_QUIZ[qs.idx];
        var answered = !!qs.answered;
        var lastChoice = qs.lastChoice;
        return h('div', { role: 'region', 'aria-label': 'Recognition quiz question ' + (qs.idx + 1),
          style: { padding: 18, borderRadius: 12, background: T.card, border: '1px solid ' + T.border } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 } },
            h('div', { style: { fontSize: 12, color: T.dim } }, __alloT('stem.firstresponse.question', 'Question '), (qs.idx + 1), ' of ', RECOGNIZE_QUIZ.length),
            h('div', { style: { fontSize: 12, color: T.muted } }, 'Score: ', qs.score)
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
            h('span', { 'aria-hidden': 'true', style: { fontSize: 30 } }, q.icon),
            h('p', { style: { margin: 0, color: T.text, fontSize: 14, lineHeight: 1.55 } }, q.stem)
          ),
          h('div', { role: 'group', 'aria-label': __alloT('stem.firstresponse.answer_choices', 'Answer choices'),
            style: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 } },
            q.choices.map(function(choice, i) {
              var isPicked = lastChoice === i;
              var isCorrect = i === q.correct;
              var bg = T.card, border = T.border, color = T.text;
              if (answered && isCorrect) { bg = '#064e3b'; border = T.ok; color = '#d1fae5'; }
              else if (answered && isPicked && !isCorrect) { bg = '#7f1d1d'; border = T.danger; color = '#fde2e2'; }
              return h('button', { key: i, 'data-fr-focusable': true,
                disabled: answered,
                'aria-label': 'Choice ' + (i + 1) + ': ' + choice + (answered && isCorrect ? ' (correct answer)' : '') + (answered && isPicked && !isCorrect ? ' (your choice, incorrect)' : ''),
                onClick: function() {
                  if (answered) return;
                  var correct = i === q.correct;
                  updMulti({ quizState: { idx: qs.idx, score: qs.score + (correct ? 1 : 0), answered: true, lastChoice: i } });
                  frAnnounceUrgent(correct ? 'Correct.' : 'Not quite. ' + q.why);
                },
                style: btn({ background: bg, borderColor: border, color: color, cursor: answered ? 'default' : 'pointer' })
              }, choice);
            })
          ),
          answered && h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 13, color: T.muted, lineHeight: 1.5 } },
            h('strong', { style: { color: T.text } }, 'Why: '), q.why),
          h('div', { style: { marginTop: 12, display: 'flex', justifyContent: 'flex-end' } },
            answered && h('button', { 'data-fr-focusable': true,
              'aria-label': qs.idx + 1 >= RECOGNIZE_QUIZ.length ? 'See results' : 'Next question',
              onClick: function() {
                updMulti({ quizState: { idx: qs.idx + 1, score: qs.score, answered: false, lastChoice: null } });
                frAnnounce(qs.idx + 1 >= RECOGNIZE_QUIZ.length ? 'Showing results.' : 'Question ' + (qs.idx + 2) + ' of ' + RECOGNIZE_QUIZ.length);
              },
              style: btnPrimary()
            }, qs.idx + 1 >= RECOGNIZE_QUIZ.length ? 'See results →' : 'Next →')
          )
        );
      }

      // ─────────────────────────────────────────
      // CALL module — when to call what + dispatcher script
      // Sub-views: 'overview' (default), 'tap-to-call', 'practice'
      // ─────────────────────────────────────────
      // Communication practice uses only fictional, supplied facts. Nothing is dialed,
      // sent, recorded, or graded by matching a learner's natural-language wording.
      function renderDispatchPractice() {
        var scenes = [
          { id: 'center', title: __alloT('stem.firstresponse.dispatch_center_title', 'Community center'),
            place: __alloT('stem.firstresponse.dispatch_center_place', '48 Lantern Way, Pine Harbor, Maine.'),
            access: __alloT('stem.firstresponse.dispatch_center_access', 'Community center, gym, north entrance.'),
            observation: __alloT('stem.firstresponse.dispatch_center_observation', 'An adult collapsed. They do not respond and are breathing normally.'),
            assistance: __alloT('stem.firstresponse.dispatch_center_assistance', 'A helper is beside you and can bring an AED.'),
            change: __alloT('stem.firstresponse.dispatch_center_change', 'Their breathing has changed to occasional irregular gasps. They still do not respond.'),
            description: __alloT('stem.firstresponse.dispatch_center_description', 'Locate a room and entrance. Report a change in breathing.'),
            landmark: __alloT('stem.firstresponse.dispatch_center_landmark', 'NORTH ENTRANCE') },
          { id: 'trail', title: __alloT('stem.firstresponse.dispatch_trail_title', 'River trail'),
            place: __alloT('stem.firstresponse.dispatch_trail_place', 'River Loop Trail, Pine Harbor, Maine.'),
            access: __alloT('stem.firstresponse.dispatch_trail_access', 'Trail marker 4, near the footbridge. Access from the Elm Street parking lot.'),
            observation: __alloT('stem.firstresponse.dispatch_trail_observation', 'A cyclist fell. They are awake and answering questions, with heavy bleeding from one lower leg.'),
            assistance: __alloT('stem.firstresponse.dispatch_trail_assistance', 'A helper is applying direct pressure to the wound.'),
            change: __alloT('stem.firstresponse.dispatch_trail_change', 'Blood is now soaking through the dressing. The helper is still applying pressure.'),
            description: __alloT('stem.firstresponse.dispatch_trail_description', 'Use landmarks when there is no street number. Report what has changed.'),
            landmark: __alloT('stem.firstresponse.dispatch_trail_landmark', 'TRAIL MARKER 4') }
        ];
        var saved = d.dispatchPractice;
        var validSession = saved && saved.version === 1 && scenes.some(function (s) { return s.id === saved.caseId; }) && ['voice', 'text'].indexOf(saved.mode) !== -1 && Number.isInteger(saved.turn) && saved.turn >= 0 && saved.turn <= 5 && Array.isArray(saved.log) && saved.log.length <= 5 && saved.log.every(function (r) { return r && Array.isArray(r.first) && Array.isArray(r.final) && Number.isInteger(r.attempts) && r.attempts > 0; });
        var session = validSession ? saved : null;
        var sceneId = session ? session.caseId : d.dispatchScene;
        var scene = scenes.filter(function (s) { return s.id === sceneId; })[0] || scenes[0];
        var mode = session ? session.mode : d.dispatchMode === 'text' ? 'text' : 'voice';
        var isText = mode === 'text';
        var turnIndex = session ? session.turn : 0;
        var phone = '(207) 555-0142';
        function option(id, text, required) { return { id: id, text: text, required: !!required }; }
        var firstOptions = [
          option('place', scene.place, true),
          option('auto-location', __alloT('stem.firstresponse.dispatch_auto_location', 'My phone will tell you exactly where I am.')),
          option('access', scene.access, true),
          option('vague', __alloT('stem.firstresponse.dispatch_vague_location', 'I am somewhere near a building or a trail.'))
        ];
        if (isText) firstOptions.splice(2, 0, option('emergency', scene.observation, true));
        var turns = [
          { id: 'location', label: __alloT('stem.firstresponse.dispatch_location', 'Location'),
            prompt: isText ? __alloT('stem.firstresponse.dispatch_text_first_prompt', 'Begin the practice text with your location and a brief description of the emergency.') : __alloT('stem.firstresponse.dispatch_voice_first_prompt', '911. Where is the emergency? Include the town and how to find you.'),
            options: firstOptions,
            why: __alloT('stem.firstresponse.dispatch_location_why', 'Give the town, location, and useful access details. Do not rely only on automatic phone location.'),
            missing: isText ? __alloT('stem.firstresponse.dispatch_text_location_missing', 'Include the location, access details, and the emergency in the first practice text.') : __alloT('stem.firstresponse.dispatch_voice_location_missing', 'Add both the location and the room, entrance, or trail access.') },
          { id: 'observations', label: __alloT('stem.firstresponse.dispatch_observations', 'Observations'),
            prompt: __alloT('stem.firstresponse.dispatch_observations_prompt', 'What happened? What can you observe, and is anyone helping?'),
            options: [option('observation', scene.observation, true), option('diagnosis', __alloT('stem.firstresponse.dispatch_guess_diagnosis', 'I know the diagnosis without checking.')), option('helper', scene.assistance, true), option('age', __alloT('stem.firstresponse.dispatch_guess_age', 'They are exactly 42 years old, although I have not asked.'))],
            why: __alloT('stem.firstresponse.dispatch_observations_why', 'Describe what you see and know. If you do not know an answer, say so.'),
            missing: __alloT('stem.firstresponse.dispatch_observations_missing', 'Include the observed condition and the help already available.') },
          { id: 'callback', label: __alloT('stem.firstresponse.dispatch_callback', 'Callback'),
            prompt: __alloT('stem.firstresponse.dispatch_callback_prompt', 'What number can I use to reach this phone if we get disconnected?'),
            options: [option('emergency-number', __alloT('stem.firstresponse.dispatch_wrong_callback_911', 'Call me back at 911.')), option('phone', __alloT('stem.firstresponse.dispatch_correct_callback', 'This practice phone number is ') + phone + '.', true), option('guess-number', __alloT('stem.firstresponse.dispatch_guess_callback', 'I will make up a number because I cannot remember it.'))],
            why: __alloT('stem.firstresponse.dispatch_callback_why', 'The callback number is the phone you are using, not the emergency number.'),
            missing: __alloT('stem.firstresponse.dispatch_callback_missing', 'Use the fictional phone number shown in the scene details.') },
          { id: 'change', label: __alloT('stem.firstresponse.dispatch_change', 'Change'),
            prompt: __alloT('stem.firstresponse.dispatch_change_prompt', 'A new observation appears. What update do you give the dispatcher now?'),
            options: [option('unchanged', __alloT('stem.firstresponse.dispatch_claim_unchanged', 'Nothing has changed.')), option('change', scene.change, true), option('wait', __alloT('stem.firstresponse.dispatch_wait_change', 'I will wait until the conversation is over to mention the change.'))],
            why: __alloT('stem.firstresponse.dispatch_change_why', 'Report a change promptly so the dispatcher can adjust instructions.'),
            missing: __alloT('stem.firstresponse.dispatch_change_missing', 'Select the new observation, rather than the earlier condition.') },
          { id: 'connected', label: __alloT('stem.firstresponse.dispatch_connected', 'Stay connected'),
            prompt: isText ? __alloT('stem.firstresponse.dispatch_text_last_prompt', 'The practice dispatcher asks you to keep replying and follow the instructions. What do you do?') : __alloT('stem.firstresponse.dispatch_voice_last_prompt', 'The practice dispatcher asks you to stay on the line and follow the instructions. What do you do?'),
            options: [option('close', __alloT('stem.firstresponse.dispatch_close_early', 'End the conversation now that I have given the address.')), option('follow', isText ? __alloT('stem.firstresponse.dispatch_text_follow', 'Keep watching for replies, answer questions, and follow the instructions.') : __alloT('stem.firstresponse.dispatch_voice_follow', 'Stay on the line, answer questions, and follow the instructions.'), true), option('prediction', __alloT('stem.firstresponse.dispatch_invent_arrival', 'Promise the person that an ambulance will arrive in exactly two minutes.'))],
            why: __alloT('stem.firstresponse.dispatch_connected_why', 'Stay connected until told to end. Questions and instructions support the response; an arrival time is not yours to promise.'),
            missing: __alloT('stem.firstresponse.dispatch_connected_missing', 'Choose how you will continue communicating with the dispatcher.') }
        ];
        var turn = turns[turnIndex];
        var selected = session && Array.isArray(session.selected) && turn ? session.selected.filter(function (id, index, all) { return all.indexOf(id) === index && turn.options.some(function (o) { return o.id === id; }); }) : [];
        var record = session && session.log[turnIndex];
        function complete(step, r) {
          return !!(r && r.complete && Array.isArray(r.final) && step.options.every(function (o) { return o.required === (r.final.indexOf(o.id) !== -1); }) && r.final.every(function (id) { return step.options.some(function (o) { return o.id === id; }); }));
        }
        var ready = !!(turn && complete(turn, record));
        var feedback = session && session.feedback;
        function write(patch) { upd('dispatchPractice', Object.assign({}, session, patch)); }
        function start(id, chosenMode) {
          updMulti({ dispatchScene: id || scene.id, dispatchMode: chosenMode || mode,
            dispatchPractice: { version: 1, caseId: id || scene.id, mode: chosenMode || mode,
              turn: 0, selected: [], log: [], feedback: null, hintUsed: false,
              run: ((session && session.run) || 0) + 1 } });
        }
        function exitPractice() { upd('dispatchPractice', null); }
        function toggle(id) {
          if (!turn || ready) return;
          write({ selected: selected.indexOf(id) === -1 ? selected.concat(id) : selected.filter(function (v) { return v !== id; }), feedback: null });
        }
        function message(step, ids) { return step.options.filter(function (o) { return ids.indexOf(o.id) !== -1; }).map(function (o) { return o.text; }).join(' '); }
        function check() {
          if (!turn || ready) return;
          var missing = turn.options.some(function (o) { return o.required && selected.indexOf(o.id) === -1; });
          var extra = turn.options.some(function (o) { return !o.required && selected.indexOf(o.id) !== -1; });
          var correct = !missing && !extra;
          var nextLog = session.log.slice(0, turns.length);
          nextLog[turnIndex] = { first: record ? record.first : selected.slice(), final: selected.slice(),
            attempts: record ? record.attempts + 1 : 1, hintUsed: !!(session.hintUsed || (record && record.hintUsed)), complete: correct };
          write({ log: nextLog, feedback: { correct: correct, missing: missing, extra: extra } });
        }
        function next() {
          if (!ready) return;
          // A completion is a communication rehearsal, never a certification.
          if (turnIndex === turns.length - 1 && turns.every(function (t, i) { return complete(t, session.log[i]); })) {
            awardBadge('dispatch_' + mode, isText ? __alloT('stem.firstresponse.dispatch_text_badge', 'Text-to-911 communication rehearsed') : __alloT('stem.firstresponse.dispatch_voice_badge', 'Emergency-call communication rehearsed'));
          }
          write({ turn: turnIndex + 1, selected: [], hintUsed: false, feedback: null });
        }
        function showExample() {
          if (ready) return;
          var log = session.log.slice();
          if (record) log[turnIndex] = Object.assign({}, record, { hintUsed: true });
          write({ hintUsed: true, log: log });
        }
        function title(text) { return h('h3', { className: 'fr-dispatch-title', tabIndex: -1, 'data-fr-dispatch-heading': true }, text); }
        function modeLabel(value) { return value === 'text' ? __alloT('stem.firstresponse.dispatch_text_mode', 'Maine text practice') : __alloT('stem.firstresponse.dispatch_voice_mode', 'Voice-call practice'); }
        function map() {
          var trail = scene.id === 'trail';
          return h('div', { className: 'fr-dispatch-map' },
            h('svg', { viewBox: '0 0 360 190', 'aria-hidden': 'true', focusable: 'false' },
              h('rect', { width: 360, height: 190, rx: 14, fill: '#0b1729' }),
              h('path', { d: 'M0 153H360 M42 0V190 M315 0V190', stroke: '#30445e', strokeWidth: 19 }),
              trail ? h('g', null,
                h('path', { d: 'M12 13Q185 118 348 32', stroke: '#387694', strokeWidth: 24, fill: 'none' }),
                h('path', { d: 'M70 153L88 102L179 55L280 91', stroke: '#99c5ac', strokeWidth: 5, strokeDasharray: '7 5', fill: 'none' }),
                h('path', { d: 'M153 37L178 79 M164 31L189 73', stroke: '#e2cfa7', strokeWidth: 6 }),
                h('circle', { cx: 179, cy: 80, r: 14, fill: '#0f766e', stroke: '#99f6e4', strokeWidth: 3 }),
                h('text', { x: 179, y: 85, textAnchor: 'middle', fill: '#fff', fontSize: 15, fontWeight: 800 }, '4')
              ) : h('g', null,
                h('rect', { x: 101, y: 40, width: 160, height: 82, rx: 8, fill: '#294361', stroke: '#7fa3c4', strokeWidth: 2 }),
                h('rect', { x: 125, y: 58, width: 38, height: 37, rx: 4, fill: '#47657e' }),
                h('rect', { x: 193, y: 58, width: 38, height: 37, rx: 4, fill: '#47657e' }),
                h('path', { d: 'M42 153V24H181V40', stroke: '#5eead4', strokeWidth: 4, strokeDasharray: '6 5', fill: 'none' }),
                h('circle', { cx: 181, cy: 40, r: 9, fill: '#99f6e4' })
              ),
              h('path', { d: 'M326 56V18L319 29 M326 18L333 29', stroke: '#cbd5e1', strokeWidth: 2, fill: 'none' }),
              h('text', { x: 326, y: 72, textAnchor: 'middle', fill: '#cbd5e1', fontSize: 12 }, __alloT('stem.firstresponse.dispatch_north', 'N'))
            ),
            h('div', { className: 'fr-dispatch-map-caption' }, scene.landmark),
            h('p', { className: 'fr-dispatch-small' }, __alloT('stem.firstresponse.dispatch_map_caption', 'Fictional practice map. Use the supplied location details.'))
          );
        }
        function sources() {
          return h('p', { className: 'fr-dispatch-small' }, __alloT('stem.firstresponse.dispatch_source_label', 'Communication guidance: '),
            h('a', { href: 'https://www.911.gov/calling-911/frequently-asked-questions/', target: '_blank', rel: 'noopener noreferrer' }, '911.gov'), ' · ',
            h('a', { href: 'https://www.maine.gov/maine911/using-911/tty-wireless-voip', target: '_blank', rel: 'noopener noreferrer' }, 'Maine 911'));
        }
        function picker() {
          return h('div', null,
            h('p', { className: 'fr-dispatch-eyebrow' }, __alloT('stem.firstresponse.dispatch_eyebrow', 'COMMUNICATE CLEARLY')),
            title(__alloT('stem.firstresponse.dispatch_title', 'Build the emergency conversation')),
            h('p', { className: 'fr-dispatch-copy' }, __alloT('stem.firstresponse.dispatch_intro', 'Choose the facts a dispatcher needs, build a practice response, and adapt when the scene changes. You can speak, sign, or read your response before checking it.')),
            h('fieldset', { className: 'fr-dispatch-modes' }, h('legend', null, __alloT('stem.firstresponse.dispatch_choose_mode', 'Choose a communication mode')),
              ['voice', 'text'].map(function (value) { return h('label', { key: value, className: mode === value ? 'is-selected' : '' },
                h('input', { type: 'radio', name: 'fr-dispatch-mode', checked: mode === value, onChange: function () { upd('dispatchMode', value); } }), modeLabel(value)); })
            ),
            isText && h('p', { className: 'fr-dispatch-notice' }, __alloT('stem.firstresponse.dispatch_text_notice', 'In Maine, text 911 when a voice call is not possible. Include your location and the emergency in the first message. Text availability varies elsewhere.')),
            h('div', { className: 'fr-dispatch-cases' }, scenes.map(function (s) {
              return h('button', { key: s.id, 'data-fr-focusable': true, className: 'fr-dispatch-case', onClick: function () { start(s.id); } },
                h('span', { 'aria-hidden': 'true', className: 'fr-dispatch-case-symbol' }, s.id === 'center' ? '⌂' : '⌁'),
                h('strong', null, s.title), h('span', null, s.description), h('span', { className: 'fr-dispatch-start' }, __alloT('stem.firstresponse.dispatch_start', 'Start rehearsal →')));
            })),
            h('p', { className: 'fr-dispatch-small' }, __alloT('stem.firstresponse.dispatch_order_note', 'Real dispatchers may ask questions in a different order. Follow their instructions. This exercise uses fictional details and has no timer.')),
            sources()
          );
        }
        function debrief() {
          if (!turns.every(function (t, i) { return complete(t, session.log[i]); })) {
            return h('div', null, title(__alloT('stem.firstresponse.dispatch_restart_title', 'Start a fresh conversation')), h('p', { className: 'fr-dispatch-copy' }, __alloT('stem.firstresponse.dispatch_restart_copy', 'This saved practice does not contain a complete conversation. Start a new rehearsal to build the review.')),
              h('button', { 'data-fr-focusable': true, style: btnPrimary(), onClick: function () { start(); } }, __alloT('stem.firstresponse.dispatch_restart', 'Restart rehearsal')));
          }
          var firstReady = session.log.filter(function (r) { return r.attempts === 1 && !r.hintUsed; }).length;
          return h('div', null,
            h('p', { className: 'fr-dispatch-eyebrow' }, __alloT('stem.firstresponse.dispatch_review_eyebrow', 'CONVERSATION REVIEW')),
            title(__alloT('stem.firstresponse.dispatch_complete', 'Communication rehearsal complete')),
            h('p', { className: 'fr-dispatch-copy' }, modeLabel(mode) + ' · ' + scene.title),
            h('div', { className: 'fr-dispatch-result' }, h('strong', null, firstReady + ' / ' + turns.length), h('span', null, __alloT('stem.firstresponse.dispatch_independent', 'responses ready on the first check without an example'))),
            h('ol', { className: 'fr-dispatch-transcript' }, turns.map(function (step, i) {
              var r = session.log[i], revised = r.attempts > 1;
              return h('li', { key: step.id }, h('strong', null, (i + 1) + '. ' + step.label),
                h('p', { className: 'fr-dispatch-copy' }, step.prompt),
                revised && h('p', { className: 'fr-dispatch-first' }, __alloT('stem.firstresponse.dispatch_first_response', 'First response: ') + (message(step, r.first) || __alloT('stem.firstresponse.dispatch_empty_response', 'No details selected.'))),
                h('blockquote', null, message(step, r.final)),
                h('p', { className: 'fr-dispatch-small' }, revised ? __alloT('stem.firstresponse.dispatch_revised', 'Revised using feedback.') : r.hintUsed ? __alloT('stem.firstresponse.dispatch_with_example', 'Practiced with an example.') : __alloT('stem.firstresponse.dispatch_first_ready', 'Ready on the first check.')),
                h('p', { className: 'fr-dispatch-copy' }, step.why));
            })),
            h('div', { className: 'fr-dispatch-reflect' }, h('h4', null, __alloT('stem.firstresponse.dispatch_transfer_title', 'Try the skill away from the screen')),
              h('p', null, __alloT('stem.firstresponse.dispatch_transfer', 'With a partner, describe how a responder would find this room or outdoor location. Use speech, writing, sign, or AAC. Then explain which observation you would report first if it changed.')),
              h('p', { className: 'fr-dispatch-small' }, __alloT('stem.firstresponse.dispatch_transfer_boundary', 'Keep this as a role-play. Do not place a real emergency call for practice.'))),
            h('div', { className: 'fr-dispatch-actions' },
              h('button', { 'data-fr-focusable': true, style: btnPrimary(), onClick: function () { start(scene.id === 'center' ? 'trail' : 'center'); } }, __alloT('stem.firstresponse.dispatch_other_scene', 'Try the other location')),
              h('button', { 'data-fr-focusable': true, style: btn(), onClick: function () { start(scene.id, isText ? 'voice' : 'text'); } }, __alloT('stem.firstresponse.dispatch_other_mode', 'Practice the other communication mode')),
              h('button', { 'data-fr-focusable': true, style: btn(), onClick: exitPractice }, __alloT('stem.firstresponse.dispatch_choose_again', 'Choose a rehearsal'))), sources()
          );
        }
        function active() {
          if (!turn) return debrief();
          var offset = ((Number.isInteger(session.run) && session.run >= 0 ? session.run : 0) + turnIndex) % turn.options.length;
          var options = turn.options.map(function (_, i) { return turn.options[(i + offset) % turn.options.length]; });
          var hint = !!(session.hintUsed || (record && record.hintUsed));
          return h('div', null,
            h('div', { className: 'fr-dispatch-run-head' }, title(scene.title), h('span', null, modeLabel(mode))),
            h('ol', { className: 'fr-dispatch-progress', 'aria-label': __alloT('stem.firstresponse.dispatch_progress', 'Conversation progress') }, turns.map(function (t, i) {
              return h('li', { key: t.id, 'aria-current': i === turnIndex ? 'step' : undefined, className: i < turnIndex ? 'is-done' : '' }, h('span', { 'aria-hidden': 'true' }, i < turnIndex ? '✓ ' : (i + 1) + ' '), h('span', { className: 'fr-dispatch-step-label' }, t.label));
            })),
            h('div', { className: 'fr-dispatch-workspace' },
              h('aside', { className: 'fr-dispatch-brief', 'aria-label': __alloT('stem.firstresponse.dispatch_facts', 'Scene details') },
                map(), h('h4', null, __alloT('stem.firstresponse.dispatch_facts_heading', 'What you know')),
                h('p', { className: 'fr-dispatch-copy' }, scene.place),
                turnIndex < 3 && h('p', { className: 'fr-dispatch-copy' }, scene.observation),
                h('details', { className: 'fr-dispatch-full-brief' }, h('summary', null, __alloT('stem.firstresponse.dispatch_full_brief', 'Full briefing and callback number')), h('dl', null,
                  h('dt', null, __alloT('stem.firstresponse.dispatch_location', 'Location')), h('dd', null, scene.place + ' ' + scene.access),
                  h('dt', null, __alloT('stem.firstresponse.dispatch_observations', 'Observations')), h('dd', null, turnIndex >= 3 ? scene.change : scene.observation),
                  h('dt', null, __alloT('stem.firstresponse.dispatch_help', 'Help available')), h('dd', null, scene.assistance),
                  h('dt', null, __alloT('stem.firstresponse.dispatch_practice_phone', 'Fictional callback number')), h('dd', null, phone))),
                turnIndex >= 3 && h('p', { className: 'fr-dispatch-change' }, __alloT('stem.firstresponse.dispatch_new_observation', 'New observation in the simulation: ') + scene.change)
              ),
              h('section', { className: 'fr-dispatch-conversation', 'aria-label': __alloT('stem.firstresponse.dispatch_conversation', 'Practice conversation') },
                h('div', { className: 'fr-dispatch-incoming' }, h('p', { className: 'fr-dispatch-eyebrow' }, isText && turnIndex === 0 ? __alloT('stem.firstresponse.dispatch_first_text', 'YOUR FIRST PRACTICE TEXT') : __alloT('stem.firstresponse.dispatch_dispatcher', 'PRACTICE DISPATCHER')),
                  h('h4', null, turn.prompt)),
                h('fieldset', { className: 'fr-dispatch-options' }, h('legend', null, __alloT('stem.firstresponse.dispatch_select_facts', 'Select every detail needed for this response')),
                  options.map(function (o) { var checked = selected.indexOf(o.id) !== -1; return h('label', { key: o.id, className: checked ? 'is-selected' : '' },
                    h('input', { type: 'checkbox', checked: checked, disabled: ready, onChange: function () { toggle(o.id); } }), h('span', null, o.text)); })
                ),
                h('div', { className: 'fr-dispatch-outgoing', 'aria-label': __alloT('stem.firstresponse.dispatch_response_preview', 'Your practice response') },
                  h('strong', null, __alloT('stem.firstresponse.dispatch_response_label', 'Your practice response')),
                  h('p', null, selected.length ? message(turn, selected) : __alloT('stem.firstresponse.dispatch_preview_empty', 'Your selected details will appear here.'))),
                h('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, feedback && h('div', { className: 'fr-dispatch-feedback' },
                  h('strong', null, feedback.correct ? __alloT('stem.firstresponse.dispatch_ready', 'Message ready') : __alloT('stem.firstresponse.dispatch_revise', 'Revise the message')),
                  feedback.extra && h('p', null, __alloT('stem.firstresponse.dispatch_remove_guesses', 'Remove guesses, unsupported promises, or details that do not answer this question.')),
                  feedback.missing && h('p', null, turn.missing), h('p', null, turn.why))),
                !ready && h('div', { className: 'fr-dispatch-actions' },
                  h('button', { 'data-fr-focusable': true, onClick: check, style: btnPrimary() }, __alloT('stem.firstresponse.dispatch_check', 'Check practice response')),
                  h('button', { 'data-fr-focusable': true, onClick: showExample, 'aria-expanded': hint, 'aria-controls': 'fr-dispatch-example', style: btn() }, __alloT('stem.firstresponse.dispatch_show_example', 'Show an example'))),
                !ready && h('div', { id: 'fr-dispatch-example', hidden: !hint, className: 'fr-dispatch-example' }, h('p', null, message(turn, turn.options.filter(function (o) { return o.required; }).map(function (o) { return o.id; })))),
                h('div', { className: 'fr-dispatch-actions' }, h('button', { 'data-fr-focusable': true, onClick: exitPractice, style: btn() }, __alloT('stem.firstresponse.dispatch_leave', 'Leave rehearsal')),
                  ready && h('button', { 'data-fr-focusable': true, onClick: next, style: btnPrimary() }, turnIndex === turns.length - 1 ? __alloT('stem.firstresponse.dispatch_review', 'Review conversation →') : __alloT('stem.firstresponse.dispatch_continue', 'Continue rehearsal →')))
              )
            )
          );
        }
        return h('section', { className: 'fr-dispatch', 'aria-label': __alloT('stem.firstresponse.dispatch_section', 'Emergency communication rehearsal') },
          h('p', { className: 'fr-dispatch-boundary' }, __alloT('stem.firstresponse.dispatch_boundary', 'SIMULATION ONLY · No call or text is sent. All locations and phone numbers below are fictional.')),
          session ? active() : picker());
      }
      function renderCall() {
        var callView = d.callView || 'overview';
        var pickedTag = d.callDecisionTag || null;
        var picked = pickedTag ? CALL_DECISIONS.filter(function(c) { return c.tag === pickedTag; })[0] : null;

        var CALL_TAB_IDS = ['overview', 'tap-to-call', 'practice'];
        function callTabKeyDown(e, index) {
          var key = e.key;
          if (key !== 'ArrowRight' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return;
          e.preventDefault();
          var nextIndex = index;
          if (key === 'ArrowRight' || key === 'ArrowDown') nextIndex = (index + 1) % CALL_TAB_IDS.length;
          if (key === 'ArrowLeft' || key === 'ArrowUp') nextIndex = (index - 1 + CALL_TAB_IDS.length) % CALL_TAB_IDS.length;
          if (key === 'Home') nextIndex = 0;
          if (key === 'End') nextIndex = CALL_TAB_IDS.length - 1;
          var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
          var nextTab = tabs[nextIndex];
          if (nextTab) { nextTab.focus(); nextTab.click(); }
        }

        function tabBtn(id, label) {
          var active = callView === id;
          return h('button', { 'data-fr-focusable': true, key: id, role: 'tab',
            id: 'firstresponse-call-tab-' + id,
            'aria-controls': 'firstresponse-call-panel-' + id,
            'aria-selected': active ? 'true' : 'false',
            tabIndex: active ? 0 : -1,
            'aria-label': label + (active ? ' (current)' : ''),
            onKeyDown: function(e) { callTabKeyDown(e, CALL_TAB_IDS.indexOf(id)); },
            onClick: function() { upd('callView', id); frAnnounce(label); },
            style: btn({
              padding: '6px 12px', fontSize: 12,
              background: active ? T.accent : T.card,
              color: active ? '#fff' : T.text,
              borderColor: active ? T.accent : T.border
            })
          }, label);
        }

        function callOverview() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.firstresponse.which_line_do_i_call', '🤔 Which line do I call?')),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                __alloT('stem.firstresponse.pick_the_situation_that_fits_calling_t', 'Pick the situation that fits. Calling the wrong line is rarely a disaster — but knowing the right one helps.')),
              h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                CALL_DECISIONS.map(function(c) {
                  var active = pickedTag === c.tag;
                  return h('div', { key: c.tag, role: 'listitem' }, h('button', { 'data-fr-focusable': true,
                    'aria-pressed': active ? 'true' : 'false',
                    onClick: function() { upd('callDecisionTag', c.tag); frAnnounce('Selected: ' + c.situation + '. Call ' + c.line + '.'); },
                    style: btn({
                      padding: '8px 12px', fontSize: 12, lineHeight: 1.45,
                      background: active ? '#1e3a8a' : T.cardAlt,
                      color: active ? '#dbeafe' : T.text,
                      borderColor: active ? '#1e40af' : T.border
                    })
                  }, c.situation));
                })
              ),
              picked && h('div', { role: 'region', 'aria-label': __alloT('stem.firstresponse.recommended_line_for_selected_situatio', 'Recommended line for selected situation'),
                style: { marginTop: 12, padding: 12, borderRadius: 10, background: '#064e3b', border: '1px solid ' + T.ok, color: '#d1fae5' } },
                h('div', { style: { fontSize: 12, opacity: 0.8, marginBottom: 4 } }, __alloT('stem.firstresponse.call', 'Call')),
                h('div', { style: { fontSize: 22, fontWeight: 800 } }, picked.line),
                h('div', { style: { fontSize: 12, marginTop: 6, lineHeight: 1.5 } }, picked.why)
              )
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              h('div', { style: { fontWeight: 700, color: T.text, marginBottom: 6 } }, __alloT('stem.firstresponse.in_maine', '🌲 In Maine')),
              h('div', { style: { marginBottom: 4 } }, MAINE_EMS.text911),
              h('div', { style: { marginBottom: 4 } }, MAINE_EMS.crisisRoute),
              h('div', null, MAINE_EMS.ruralEta)
            )
          );
        }

        function callTapToCall() {
          var lines = [
            { num: '911', label: __alloT('stem.firstresponse.emergency_police_fire_ems', 'Emergency (police / fire / EMS)'), tel: '911' },
            { num: '988', label: __alloT('stem.firstresponse.suicide_crisis_lifeline', 'Suicide & Crisis Lifeline'), tel: '988' },
            { num: '741741', label: __alloT('stem.firstresponse.crisis_text_line_text_home', 'Crisis Text Line — text HOME'), tel: null, sms: '741741', body: 'HOME' },
            { num: '1-800-222-1222', label: __alloT('stem.firstresponse.poison_control', 'Poison Control'), tel: '+18002221222' },
            { num: '1-800-950-NAMI', label: __alloT('stem.firstresponse.nami_helpline_mental_health_support', 'NAMI HelpLine (mental health support)'), tel: '+18009506264' },
            { num: '1-877-565-8860', label: __alloT('stem.firstresponse.trans_lifeline', 'Trans Lifeline'), tel: '+18775658860' },
            { num: '1-800-422-4453', label: __alloT('stem.firstresponse.childhelp_national_child_abuse_hotline', 'Childhelp National Child Abuse Hotline'), tel: '+18004224453' }
          ];
          return h('div', null,
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
              __alloT('stem.firstresponse.on_a_phone_tap_a_number_to_call_save_t', 'On a phone, tap a number to call. Save the ones you might need ahead of time.')),
            h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              lines.map(function(L) {
                var href = L.sms ? ('sms:' + L.sms + (L.body ? ('?body=' + encodeURIComponent(L.body)) : '')) : ('tel:' + L.tel);
                var verb = L.sms ? 'Text' : 'Call';
                return h('div', { key: L.num, role: 'listitem' }, h('a', { href: href,
                  'data-fr-focusable': true,
                  'aria-label': verb + ' ' + L.num + ' — ' + L.label,
                  style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 10, background: T.card, border: '1px solid ' + T.border, color: T.text, textDecoration: 'none' } },
                  h('div', null,
                    h('div', { style: { fontWeight: 700, fontSize: 16, color: T.accentHi } }, L.num),
                    h('div', { style: { fontSize: 12, color: T.muted, marginTop: 2 } }, L.label)
                  ),
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 13, color: T.link, fontWeight: 700 } }, verb + ' →')
                ));
              })
            )
          );
        }

        function callPractice() {
          return h('div', null, renderDispatchPractice(),
            h('details', { className: 'fr-dispatch-reference' },
              h('summary', null, __alloT('stem.firstresponse.dispatch_reference', 'Read the voice and text reference scripts')),
              callScriptReference()));
        }

        function callScriptReference() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.firstresponse.what_to_say_to_the_911_dispatcher', '📞 What to say to the 911 dispatcher')),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                __alloT('stem.firstresponse.say_it_in_this_order_location_first_so', 'Say it in this order. Location FIRST so help can roll even if your call drops.')),
              h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                DISPATCHER_SCRIPT.map(function(s) {
                  return h('div', { key: s.step, role: 'listitem',
                    style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                      h('span', { 'aria-hidden': 'true', style: { background: T.accent, color: '#fff', borderRadius: 999, width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 } }, s.step),
                      h('strong', { style: { color: T.text, fontSize: 13 } }, s.label)
                    ),
                    h('div', { style: { fontSize: 13, color: T.text, fontStyle: 'italic', marginLeft: 30, marginBottom: 4 } }, s.example),
                    h('div', { style: { fontSize: 11, color: T.dim, marginLeft: 30, lineHeight: 1.5 } }, s.tip)
                  );
                })
              )
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.firstresponse.text_to_911_maine', '💬 Text-to-911 (Maine)')),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                __alloT('stem.firstresponse.use_text_to_911_if_you_re_deaf_hoh_can', 'Use text-to-911 if you’re deaf/HoH, can’t speak safely, or have a speech disability. Maine supports it statewide; check coverage at '),
                h('a', { href: 'https://www.maine.gov/dps/911', target: '_blank', rel: 'noopener', style: { color: T.link, textDecoration: 'underline' } }, 'maine.gov/dps/911'),
                '.'),
              h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                TEXT_911_SCRIPT.map(function(s) {
                  return h('div', { key: s.step, role: 'listitem',
                    style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                      h('span', { 'aria-hidden': 'true', style: { background: '#1e40af', color: '#fff', borderRadius: 999, width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 } }, s.step),
                      h('strong', { style: { color: T.text, fontSize: 13 } }, s.label)
                    ),
                    h('div', { style: { fontSize: 13, color: T.text, fontFamily: 'monospace', background: T.bg, padding: '4px 8px', borderRadius: 4, marginLeft: 30, marginBottom: 4 } }, s.example),
                    h('div', { style: { fontSize: 11, color: T.dim, marginLeft: 30, lineHeight: 1.5 } }, s.tip)
                  );
                })
              )
            ),
            h('div', { style: { marginTop: 14 } },
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.mark_call_module_complete', 'Mark Call module complete'),
                onClick: function() { awardBadge('caller', 'Caller (knows what to say)'); },
                style: btnPrimary()
              }, __alloT('stem.firstresponse.i_ve_practiced_the_script', '✓ I’ve practiced the script'))
            )
          );
        }

        return h('div', { className: 'fr-call-shell', style: { padding: 'clamp(12px, 3vw, 20px)', maxWidth: 1080, margin: '0 auto', color: T.text } },
          backBar('📞 Call (911 + 988)'),
          emergencyBanner(),
          h('div', { role: 'tablist', 'aria-label': __alloT('stem.firstresponse.call_module_sections', 'Call module sections'),
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('overview', 'Which line?'),
            tabBtn('tap-to-call', 'Tap to call'),
            tabBtn('practice', __alloT('stem.firstresponse.dispatch_practice_tab', 'Practice a call'))
          ),
          h('div', { role: 'tabpanel',
            id: 'firstresponse-call-panel-' + callView,
            'aria-labelledby': 'firstresponse-call-tab-' + callView,
            tabIndex: 0
          },
            callView === 'overview' && callOverview(),
            callView === 'tap-to-call' && callTapToCall(),
            callView === 'practice' && callPractice(),
            disclaimerFooter()
          )
        );
      }

      // ─────────────────────────────────────────
      // CPR + AED module
      // - Rhythm trainer: visual metronome 100–120 bpm + optional audio click
      //   (audio OFF by default; sensory-aware default per accommodation guidance)
      // - Practice mode: 30-sec window, user taps in rhythm, tool reports avg bpm
      // - AED walkthrough: 6-step voice-prompt simulation with shock/no-shock branch
      // Clinical numbers checked against the 2025 AHA Adult Basic Life Support Guidelines.
      // ─────────────────────────────────────────
      function renderCprAed() {
        // cprView / bpm / audioOn and the metronome hook slots live in the
        // fixed hook budget at the top of render() — hooks may not be declared
        // here, because this function only runs on the 'cprAed' branch.
        var practiceRunning = !!d.cprPracticeRunning;
        var practiceStart = d.cprPracticeStart || 0;
        var practiceTaps = d.cprPracticeTaps || [];
        var practiceBest = d.cprPracticeBest || null;

        var CPR_TAB_IDS = ['overview', 'metronome', 'practice', 'aed'];
        function cprTabKeyDown(e, index) {
          var key = e.key;
          if (key !== 'ArrowRight' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return;
          e.preventDefault();
          var nextIndex = index;
          if (key === 'ArrowRight' || key === 'ArrowDown') nextIndex = (index + 1) % CPR_TAB_IDS.length;
          if (key === 'ArrowLeft' || key === 'ArrowUp') nextIndex = (index - 1 + CPR_TAB_IDS.length) % CPR_TAB_IDS.length;
          if (key === 'Home') nextIndex = 0;
          if (key === 'End') nextIndex = CPR_TAB_IDS.length - 1;
          var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
          var nextTab = tabs[nextIndex];
          if (nextTab) { nextTab.focus(); nextTab.click(); }
        }
        function tabBtn(id, label) {
          var active = cprView === id;
          return h('button', { 'data-fr-focusable': true, key: id, role: 'tab',
            id: 'firstresponse-cpr-tab-' + id,
            'aria-controls': 'firstresponse-cpr-panel-' + id,
            'aria-selected': active ? 'true' : 'false',
            tabIndex: active ? 0 : -1,
            'aria-label': label + (active ? __alloT('stem.firstresponse.sr_current_suffix', ' (current)') : ''),
            onKeyDown: function(e) { cprTabKeyDown(e, CPR_TAB_IDS.indexOf(id)); },
            onClick: function() { upd('cprView', id); frAnnounce(label); },
            style: btn({
              padding: '6px 12px', fontSize: 12,
              background: active ? T.accent : T.card,
              color: active ? '#fff' : T.text,
              borderColor: active ? T.accent : T.border
            })
          }, label);
        }

        function cprOverview() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 16, color: T.text } }, __alloT('stem.firstresponse.hands_only_cpr', '❤️ Hands-only CPR')),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.for_untrained_bystanders', 'For untrained bystanders')),
                __alloT('stem.firstresponse.hands_only_cpr_no_breaths_is_what_aha_', ': hands-only CPR (no breaths) is what AHA recommends for adults who collapse suddenly. It works.')),

              h('div', { style: { padding: '10px 12px', borderRadius: 8, marginBottom: 12, background: 'rgba(220,38,38,0.10)', border: '1px solid ' + T.accent } },
                h('h4', { style: { margin: '0 0 6px', fontSize: 13, color: T.text } }, __alloT('stem.firstresponse.gate_title', '🫁 Before you push: is this cardiac arrest?')),
                h('p', { style: { margin: '0 0 6px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                  __alloT('stem.firstresponse.gate_intro', 'Shake them and shout. If they do not respond, spend no more than ten seconds looking at the chest and deciding this one thing:')),
                h('ul', { style: { margin: '0 0 6px 18px', color: T.muted, fontSize: 12, lineHeight: 1.65 } },
                  h('li', null,
                    h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.gate_not_breathing', 'Not breathing, or only occasional gasps → CPR. ')),
                    __alloT('stem.firstresponse.gate_agonal_why', 'Those irregular gasps are called agonal breathing, and they are a sign of cardiac arrest, not of recovery. People lose lives because a bystander saw gasping and assumed breathing. Gasping counts as not breathing.')),
                  h('li', null,
                    h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.gate_breathing', 'Breathing normally, but will not wake up → recovery position. ')),
                    __alloT('stem.firstresponse.gate_breathing_why', 'Their heart is beating. Compressions on someone who is breathing cause real injury and help nothing. Roll them onto their side, keep watching, and start CPR if the breathing stops or turns to gasping.'))),
                h('button', { 'data-fr-focusable': true,
                  'aria-label': __alloT('stem.firstresponse.a11y_see_difference_3d', 'See the difference in 3D. Opens the 3D breathing gate, where normal breathing and agonal gasping move differently.'),
                  onClick: function() { updMulti({ view: 'body3d', b3dTab: 'gate' }); markVisited('body3d'); frAnnounce(__alloT('stem.firstresponse.sr_3d_breathing_gate', 'Body position in 3D, breathing gate.')); },
                  style: btn({ padding: '6px 12px', fontSize: 12 })
                }, __alloT('stem.firstresponse.see_the_difference_in_3d', '🫁 See the difference in 3D'))),

              h('details', { style: { padding: '10px 12px', borderRadius: 8, marginBottom: 12, background: 'rgba(245,158,11,0.12)', border: '1px solid ' + T.warn } },
                h('summary', { style: { cursor: 'pointer', fontSize: 13, color: T.text, fontWeight: 700, lineHeight: 1.5 } },
                  __alloT('stem.firstresponse.hands_only_exception_summary', '⚠️ Hands-only is for adults — infants, children, drowning and overdose need breaths too')),
                h('p', { style: { margin: '0 0 6px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                  __alloT('stem.firstresponse.hands_only_exception_why', 'Hands-only works for an adult who drops in front of you because their blood is still carrying oxygen — it has just stopped moving. That is not the situation when the arrest was caused by not being able to breathe:')),
                h('ul', { style: { margin: '0 0 6px 18px', color: T.muted, fontSize: 12, lineHeight: 1.65 } },
                  h('li', null, __alloT('stem.firstresponse.hands_only_exception_kids', 'Infants and children')),
                  h('li', null, __alloT('stem.firstresponse.hands_only_exception_drowning', 'Drowning')),
                  h('li', null, __alloT('stem.firstresponse.hands_only_exception_choking', 'Choking')),
                  h('li', null, __alloT('stem.firstresponse.hands_only_exception_overdose', 'Drug or opioid overdose'))),
                h('p', { style: { margin: '0 0 6px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                  __alloT('stem.firstresponse.hands_only_exception_what', 'There the blood has run out of oxygen, so moving it around achieves less. If you are willing and able, open the airway and give '),
                  h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.hands_only_exception_ratio', '30 compressions to 2 breaths')),
                  __alloT('stem.firstresponse.hands_only_exception_infant', ', watching for the chest to rise. An infant\'s head goes to a neutral “sniffing” position, NOT tilted back like an adult\'s — their windpipe is soft and short, and over-extending the neck kinks it shut.')),
                h('p', { style: { margin: 0, color: T.text, fontSize: 12, lineHeight: 1.55 } },
                  h('strong', null, __alloT('stem.firstresponse.hands_only_exception_fallback', 'If you cannot or will not give breaths, push anyway.')),
                  __alloT('stem.firstresponse.hands_only_exception_fallback_why', ' Compressions alone are far better than nothing. Standing there deciding is the only option that is certain to help no one.')),
                h('button', { 'data-fr-focusable': true,
                  'aria-label': __alloT('stem.firstresponse.a11y_practise_30_2_3d', 'Practise 30:2 in 3D. Opens the 3D coach for the thirty compressions to two breaths cycle.'),
                  onClick: function() { updMulti({ view: 'body3d', b3dTab: 'coach' }); markVisited('body3d'); frAnnounce(__alloT('stem.firstresponse.sr_3d_breath_coach', 'Body position in 3D, guided compression and breath cycle.')); },
                  style: btn({ marginTop: 10, padding: '6px 12px', fontSize: 12 })
                }, __alloT('stem.firstresponse.practise_30_to_2_in_3d', '🫀 Practise 30:2 in 3D'))),

              h('details', { style: { padding: '10px 12px', borderRadius: 8, marginBottom: 12, background: T.cardAlt, border: '1px solid ' + T.border } },
                h('summary', { style: { cursor: 'pointer', fontSize: 13, color: T.text, fontWeight: 700, lineHeight: 1.5 } },
                  __alloT('stem.firstresponse.midcpr_summary', '😖 If they vomit, or start to come round — neither means stop for long')),
                h('ul', { style: { margin: '6px 0 0 18px', color: T.muted, fontSize: 12, lineHeight: 1.65 } },
                  h('li', null,
                    h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.midcpr_vomit', 'Vomiting is common. ')),
                    __alloT('stem.firstresponse.midcpr_vomit_why', 'Roll them onto their side, let it drain, wipe the mouth clear, roll them back and resume compressions. Do the whole thing in a few seconds — it is an interruption like any other.')),
                  h('li', null,
                    h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.midcpr_signs', 'Real signs of life mean stop and watch. ')),
                    __alloT('stem.firstresponse.midcpr_signs_why', 'Breathing normally, moving purposefully, or opening their eyes: stop compressions, put them in the recovery position, and keep watching. Occasional gasping is NOT a sign of life — that is the arrest, and you keep going.'))
                )),

              h('p', { style: { margin: '0 0 6px', color: T.text, fontSize: 12, fontWeight: 600 } },
                __alloT('stem.firstresponse.for_an_adult_who_collapsed', 'For an adult who collapsed in front of you:')),
              h('ol', { style: { margin: '0 0 0 18px', color: T.muted, fontSize: 13, lineHeight: 1.7 } },
                h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.check', 'Check')), __alloT('stem.firstresponse.shake_shout_gate_v2', ' — shake & shout. No response, and not breathing normally (gasping counts as not breathing)?')),
                h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.call_911_2', 'Call 911')), __alloT('stem.firstresponse.or_have_someone_else_call_send_another', ' (or have someone else call). Send another person for an AED.')),
                h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.push_hard_push_fast', 'Push hard, push fast')),
                  __alloT('stem.firstresponse.hand_technique_adult', ' — heel of one hand on the breastbone in the centre of the chest, the other hand on top, fingers interlaced. Arms locked straight, shoulders stacked directly above your hands, so the push comes from your body weight and not your arms. '),
                  __alloT('stem.firstresponse.center_of_chest_v2', 'Go '),
                  h('span', { style: { color: T.accentHi } }, __alloT('stem.firstresponse.2_inches_deep', '2 inches deep')), __alloT('stem.firstresponse.at', ', at '),
                  h('span', { style: { color: T.accentHi } }, __alloT('stem.firstresponse.100_120_bpm', '100–120 bpm')), '.'),
                h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.don_t_stop', 'Don’t stop')), __alloT('stem.firstresponse.until_ems_takes_over_aed_tells_you_to_', ' until EMS takes over, AED tells you to clear, or person starts breathing.')),
                h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.use_the_aed', 'Use the AED')), __alloT('stem.firstresponse.as_soon_as_it_arrives_it_talks_you_thr', ' as soon as it arrives — it talks you through it.'))
              ),
              h('details', { style: { marginTop: 10, padding: '8px 10px', borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                h('summary', { style: { cursor: 'pointer', fontSize: 12, color: T.text, fontWeight: 700, lineHeight: 1.5 } },
                  __alloT('stem.firstresponse.hands_by_age_summary', '👶 Hand position is different for a child or an infant')),
                h('ul', { style: { margin: '6px 0 0 18px', color: T.muted, fontSize: 12, lineHeight: 1.65 } },
                  h('li', null,
                    h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.hands_child', 'Child: ')),
                    __alloT('stem.firstresponse.hands_child_why', 'one hand, or two if one is not enough to reach the depth. Use whatever gets you deep enough on that particular child.')),
                  h('li', null,
                    h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.hands_infant', 'Infant: ')),
                    __alloT('stem.firstresponse.hands_infant_why', 'the heel of one hand on the breastbone, or the two-thumb encircling-hands technique. The older two-finger method is no longer recommended, because it often fails to reach adequate depth.')),
                  h('li', null,
                    h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.hands_pregnant', 'Visibly pregnant: ')),
                    __alloT('stem.firstresponse.hands_pregnant_why', 'do not move your hands and do not push more gently. Compress exactly as you would for any other adult — the best thing for the baby is a mother whose blood is moving.'))
                )),

              h('div', { style: { marginTop: 10, padding: '8px 10px', borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.wasted_compressions_title', 'Two things quietly waste good compressions: ')),
                h('span', null,
                  __alloT('stem.firstresponse.wasted_surface', 'a soft surface and leaning. On a bed or a sofa the mattress absorbs the push instead of the chest — get them onto the floor or another firm flat surface first. And between pushes let the chest come all the way back up, keeping your hands in contact but resting no weight on it: leaning is easy to do once you are tired, and it stops the heart refilling for the next compression.'))),
              h('div', { style: { marginTop: 10, padding: '8px 10px', borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 11, color: T.dim, fontStyle: 'italic' } },
                __alloT('stem.firstresponse.depth_adult_child_infant', 'Depth: at least 2 in (5 cm) and no more than about 2.4 in (6 cm) for an adult; about 2 in (5 cm) for a child; about 1.5 in (4 cm) for an infant — in each case roughly one third of the depth of the chest. Source: 2025 AHA/AAP Guidelines for CPR & ECC.'))
            ),
            h('details', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('summary', { style: { cursor: 'pointer', fontSize: 15, color: T.text, fontWeight: 700, lineHeight: 1.5, marginBottom: 8 } },
                __alloT('stem.firstresponse.hesitating_summary', '🤚 If you are hesitating — broken ribs, legal risk, or forgetting the steps')),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.hesitating_ribs', '“What if I break a rib?” ')),
                __alloT('stem.firstresponse.hesitating_ribs_why', 'It happens, and it is not a reason to stop or to push more gently. Ribs heal. Someone in cardiac arrest is already not breathing and has no pulse — the realistic alternative to imperfect compressions is not a gentler outcome, it is no outcome. Shallow compressions are the more common mistake by far.')),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.hesitating_legal', '“Could I get in trouble?” ')),
                __alloT('stem.firstresponse.hesitating_legal_why', 'Every US state has some form of Good Samaritan law covering people who help in good faith, though what each one covers varies. If you are unsure what applies where you live, look it up before you need it — not while someone is on the floor.')),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.hesitating_death', '“What if they die anyway?” ')),
                __alloT('stem.firstresponse.hesitating_death_why', 'Most people who suffer a cardiac arrest outside hospital do not survive it, even when everything is done right — and bystander CPR still roughly doubles or triples the chance that they do. If they die, that is the arrest, not you. Doing nothing is the only choice that removes the chance entirely, and it is worth knowing beforehand that this can be hard to carry afterwards.')),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.hesitating_forgot', '“I will forget what to do.” ')),
                __alloT('stem.firstresponse.hesitating_forgot_why', 'Put the phone on speaker. The 911 dispatcher will count compressions with you and stay on the line until help arrives — you are not expected to remember this alone.'))
            ),

            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 16, color: T.text } }, __alloT('stem.firstresponse.aed_in_one_paragraph', '⚡ AED in one paragraph')),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                __alloT('stem.firstresponse.aeds_are_designed_for_untrained_people', 'AEDs are designed for untrained people. Turn it on. '),
                h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.it_will_talk_you_through_every_step', 'It will talk you through every step.')),
                __alloT('stem.firstresponse.it_will_not_shock_someone_who_doesn_t_', ' It will not shock someone who doesn’t need it — it analyzes the heart rhythm first. '),
                h('strong', { style: { color: T.accentHi } }, __alloT('stem.firstresponse.use_it', 'Use it.')),
                __alloT('stem.firstresponse.many_aeds_also_show_visual_prompts_on_', ' Many AEDs also show visual prompts on a screen for deaf and hard-of-hearing rescuers.'))
            ),
            h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.a11y_metronome_button', 'Metronome (100–120 bpm). Opens the CPR rhythm metronome.'),
                onClick: function() { upd('cprView', 'metronome'); frAnnounce(__alloT('stem.firstresponse.cpr_tab_metronome', 'Metronome')); },
                style: btnPrimary()
              }, __alloT('stem.firstresponse.metronome_100_120_bpm', '🥁 Metronome (100–120 bpm)')),
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.a11y_practice_button', 'Practice (30 sec). Practise the CPR rhythm in a 30 second window.'),
                onClick: function() { upd('cprView', 'practice'); frAnnounce(__alloT('stem.firstresponse.sr_practice_mode', 'Practice mode')); },
                style: btn()
              }, __alloT('stem.firstresponse.practice_30_sec', '⏱️ Practice (30 sec)')),
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.a11y_aed_walkthrough_button', 'AED walkthrough. Walks through using an AED, step by step.'),
                onClick: function() { upd('cprView', 'aed'); frAnnounce(__alloT('stem.firstresponse.sr_aed_walkthrough', 'AED walkthrough')); },
                style: btn()
              }, __alloT('stem.firstresponse.aed_walkthrough', '⚡ AED walkthrough'))
            )
          );
        }

        // Audio can be on and still inaudible: a browser that blocked the
        // context leaves it "suspended". Read it rather than assume, so the UI
        // can admit the failure instead of showing a speaker icon over silence.
        var audioBlocked = audioOn && !!audioCtxRef.current
          && audioCtxRef.current.state !== 'running'
          && (Date.now() - (audioCtxRef.resumeAskedAt || 0)) > 1200;

        function cprMetronome() {
          // Visible counter doubles as a re-render trigger; reading `beat` here
          // ensures the parent component re-renders each tick so the pulse
          // animation stays in sync even without a CSS animation.
          return h('div', null,
            h('div', { style: { padding: 16, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14, textAlign: 'center' } },
              h('div', { 'aria-hidden': 'true', style: {
                width: 160, height: 160, borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, ' + T.accentHi + ', ' + T.accent + ')',
                margin: '20px auto',
                animation: (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'none' : ('firstresponse-heartbeat ' + (60000 / bpm).toFixed(0) + 'ms ease-in-out infinite'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48, color: '#fff', fontWeight: 800,
                boxShadow: '0 0 40px rgba(220,38,38,0.45)'
              } }, '❤'),
              h('div', { 'aria-live': 'off', style: { fontSize: 36, fontWeight: 800, color: T.text, marginBottom: 4 } }, bpm + ' bpm'),
              h('div', { style: { fontSize: 12, color: T.muted, marginBottom: 8 } }, __alloT('stem.firstresponse.beats_counted', 'Beats counted: '), beat),
              // Visual rhythm strip — last 16 beats as pulsing dots that fade.
              // Pairs with the audio metronome so deaf/hard-of-hearing rescuers
              // see the rhythm too.
              h('div', { 'aria-hidden': 'true',
                style: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginBottom: 14, minHeight: 16 }
              },
                Array.from({ length: 16 }, function(_, i) {
                  // Trail fades behind the current beat: the dot that just
                  // pulsed is brightest; older beats dim with distance.
                  var age = ((beat % 16) - i + 16) % 16; // 0 = just pulsed
                  var isCurrent = (beat % 16) === i;
                  var opacity = isCurrent ? 1 : Math.max(0.15, 0.95 - age * 0.06);
                  var size = isCurrent ? 14 : 8;
                  return h('div', { key: i,
                    style: {
                      width: size, height: size, borderRadius: '50%',
                      background: isCurrent ? T.accentHi : T.accent,
                      opacity: opacity,
                      transition: 'all 80ms ease-out',
                      boxShadow: isCurrent ? ('0 0 8px ' + T.accentHi) : 'none'
                    }
                  });
                })
              ),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 10 } },
                h('label', { htmlFor: 'fr-bpm-slider', style: { fontSize: 12, color: T.muted } }, __alloT('stem.firstresponse.bpm_label', 'BPM:')),
                h('input', { id: 'fr-bpm-slider', type: 'range', min: 100, max: 120, step: 1, value: bpm,
                  'aria-label': __alloT('stem.firstresponse.sr_beats_per_minute_currently', 'Beats per minute, currently {n}').replace('{n}', bpm),
                  onChange: function(e) { upd('cprBpm', parseInt(e.target.value, 10)); },
                  style: { width: 200 }, 'data-fr-focusable': true })
              ),
              h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' } },
                h('button', { 'data-fr-focusable': true,
                  'aria-pressed': audioOn ? 'true' : 'false',
                  'aria-label': audioOn
                    ? __alloT('stem.firstresponse.sr_audio_on_click_to_mute', 'Audio on, click to mute')
                    : __alloT('stem.firstresponse.sr_audio_off_click_to_enable', 'Audio off, click to enable'),
                  onClick: function() {
                    if (!audioOn) frEnsureAudio();
                    upd('cprAudio', !audioOn);
                    frAnnounce(audioOn ? __alloT('stem.firstresponse.sr_audio_off', 'Audio off') : __alloT('stem.firstresponse.sr_audio_on', 'Audio on'));
                  },
                  style: btn({ padding: '6px 12px', fontSize: 12, background: audioOn ? '#1e3a8a' : T.card, color: audioOn ? '#dbeafe' : T.text })
                }, audioOn ? __alloT('stem.firstresponse.audio_on', '🔊 Audio on') : __alloT('stem.firstresponse.audio_off', '🔇 Audio off')),
                h('button', { 'data-fr-focusable': true,
                  'aria-label': __alloT('stem.firstresponse.a11y_reset_to_110', 'Reset to 110. Sets the metronome back to 110 beats per minute.'),
                  onClick: function() { upd('cprBpm', 110); },
                  style: btn({ padding: '6px 12px', fontSize: 12 })
                }, __alloT('stem.firstresponse.reset_to_110', 'Reset to 110'))
              ),
              audioBlocked && h('div', { role: 'status', style: {
                marginTop: 10, padding: '8px 10px', borderRadius: 8,
                background: 'rgba(245,158,11,0.14)', border: '1px solid ' + T.warn,
                color: T.text, fontSize: 12, lineHeight: 1.5, textAlign: 'left'
              } },
                h('strong', null, __alloT('stem.firstresponse.audio_blocked_title', 'Your browser is holding the sound. ')),
                __alloT('stem.firstresponse.audio_blocked_body', 'Press the audio button once more to let it through. The pulsing heart and the row of dots keep the same beat in the meantime.'))
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.tip_label', 'Tip:')),
              ' ',
              h('em', null, __alloT('stem.firstresponse.stayin_alive', 'Stayin’ Alive')),
              __alloT('stem.firstresponse.is_104_bpm', ' is ~104 bpm. '),
              h('em', null, __alloT('stem.firstresponse.baby_shark', 'Baby Shark')),
              __alloT('stem.firstresponse.is_115_bpm', ' is ~115 bpm. '),
              h('em', null, __alloT('stem.firstresponse.mr_brightside', 'Mr. Brightside')),
              __alloT('stem.firstresponse.is_148_bpm_too_fast_audio_is_off_by_de', ' is ~148 bpm — too fast. Audio is OFF by default; enable if it helps you keep time.'))
          );
        }

        function cprPractice() {
          // Rhythm is the easy half. This window also scores the half that
          // actually decides survival — how long the learner's hands were OFF
          // the chest — via the shared analyzeCprPractice(). See its comment.
          var nowMs = Date.now();
          var windowMs = CPR_PRACTICE_SPEC.windowSec * 1000;
          var elapsedSec = practiceRunning ? Math.min(CPR_PRACTICE_SPEC.windowSec, (nowMs - practiceStart) / 1000) : 0;
          var taps = practiceTaps || [];
          var done = practiceRunning && (nowMs - practiceStart) >= windowMs;
          // While the run is live the window ends "now"; once it is over the
          // window is the full 30 s, so a learner who quits at second 8 is
          // scored against 30 s of patient, not 8 s of themselves.
          var live = analyzeCprPractice(taps, practiceStart, done ? practiceStart + windowMs : nowMs);
          // Seconds since the last compression — the number a rescuer should be
          // watching, shown live rather than only in the debrief.
          var handsOffMs = practiceRunning
            ? (taps.length ? nowMs - taps[taps.length - 1] : nowMs - practiceStart)
            : 0;

          function recordResult(stats, partial, secs) {
            return {
              rate: stats.medianBpm,
              fractionPct: stats.fractionPct,
              longestPauseMs: stats.longestPauseMs,
              compressions: stats.compressions,
              consistencyPct: stats.consistencyPct,
              rateOk: stats.rateOk,
              pauseOk: stats.pauseOk,
              fractionOk: stats.fractionOk,
              steadyOk: stats.steadyOk,
              passed: stats.passed,
              partial: !!partial,
              durationSec: Math.round(secs),
              dateISO: new Date().toISOString()
            };
          }
          // A run that met every criterion always beats one that did not; among
          // equals, the closest to the middle of the target band wins.
          function betterRun(prev, next) {
            if (!prev) return next;
            if (next.passed !== prev.passed) return next.passed ? next : prev;
            return Math.abs(next.rate - 110) < Math.abs(prev.rate - 110) ? next : prev;
          }

          // Auto-finalize when the 30 seconds are up.
          if (done) {
            var result = recordResult(live, false, CPR_PRACTICE_SPEC.windowSec);
            updMulti({
              cprPracticeRunning: false,
              cprPracticeLast: result,
              cprPracticeBest: betterRun(practiceBest, result)
            });
            // The badge now requires all three: rate in band, no interruption
            // over 10 s, and at least 60% of the window spent compressing.
            if (live.passed) awardBadge('cpr_rhythm', 'CPR Rhythm (steady 100–120 bpm, no pause over 10 s, 30 s window)');
            frAnnounceUrgent(__alloT('stem.firstresponse.sr_practice_complete_summary',
              'Practice complete. Rate {bpm} beats per minute. Longest hands-off pause {pause} seconds. Compressing {pct} percent of the window.')
              .replace('{bpm}', live.medianBpm)
              .replace('{pause}', (live.longestPauseMs / 1000).toFixed(1))
              .replace('{pct}', live.fractionPct));
          }

          function startPractice() {
            updMulti({ cprPracticeRunning: true, cprPracticeStart: Date.now(), cprPracticeTaps: [], cprPracticeLast: null });
            frAnnounceUrgent(__alloT('stem.firstresponse.sr_begin_chest_compressions_now_30_second_timer_star', 'Begin chest compressions now. 30 second timer started.'));
          }
          function tapNow() {
            if (!practiceRunning) return;
            var t = Date.now();
            // Cap stored taps so we don't grow state without bound; keep last 200.
            var nextTaps = (practiceTaps || []).concat([t]);
            if (nextTaps.length > 200) nextTaps = nextTaps.slice(-200);
            upd('cprPracticeTaps', nextTaps);
          }
          function stopPractice() {
            // Stopping early used to throw the run away in silence. It now
            // scores what happened — against the full 30 s window, because
            // stopping early IS the interruption being taught.
            var secs = Math.max(0, (Date.now() - practiceStart) / 1000);
            var partial = analyzeCprPractice(practiceTaps || [], practiceStart, practiceStart + windowMs);
            var stopped = recordResult(partial, true, Math.min(CPR_PRACTICE_SPEC.windowSec, secs));
            updMulti({
              cprPracticeRunning: false,
              cprPracticeLast: stopped,
              cprPracticeBest: betterRun(practiceBest, stopped)
            });
            frAnnounceUrgent(__alloT('stem.firstresponse.sr_practice_stopped_early',
              'Practice stopped after {n} seconds. In a real arrest the pause starts here — compressions restart only when someone else takes over.')
              .replace('{n}', Math.round(secs)));
          }

          // One readout tile per criterion, so a failing run says WHICH half
          // failed — and says it in text, not only in hue.
          var TILE_STATES = {
            ok:      { color: T.ok,   glyph: '✓', word: __alloT('stem.firstresponse.tile_on_track', 'On track') },
            warn:    { color: T.warn, glyph: '!', word: __alloT('stem.firstresponse.tile_needs_work', 'Needs work') },
            unknown: { color: T.dim,  glyph: '·', word: __alloT('stem.firstresponse.tile_not_yet', 'Not enough yet') }
          };
          function statTile(label, value, state, note) {
            var st = TILE_STATES[state] || TILE_STATES.unknown;
            return h('div', { style: {
              flex: '1 1 140px', minWidth: 140, padding: '8px 10px', borderRadius: 8,
              background: T.cardAlt, border: '1px solid ' + st.color
            } },
              h('div', { style: { fontSize: 11, color: T.muted, marginBottom: 2 } }, label),
              h('div', { style: { fontSize: 20, fontWeight: 800, color: st.color } },
                h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, st.glyph),
                value),
              h('div', { style: { fontSize: 10, color: st.color, fontWeight: 600, marginTop: 2 } }, st.word),
              note && h('div', { style: { fontSize: 10, color: T.dim, marginTop: 2, lineHeight: 1.4 } }, note)
            );
          }

          var last = d.cprPracticeLast || null;
          var handsOffWarn = practiceRunning && handsOffMs >= CPR_PRACTICE_SPEC.warnPauseMs;

          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.firstresponse.practice_30_second_window', '⏱️ Practice (30-second window)')),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                __alloT('stem.firstresponse.tap_the_big_button_in_rhythm_like_you_', 'Tap the big button in rhythm — like you would push on someone’s chest. Aim for '),
                h('strong', { style: { color: T.accentHi } }, __alloT('stem.firstresponse.100_120_bpm_2', '100–120 bpm')),
                __alloT('stem.firstresponse.the_metronome_above_gives_you_the_targ', '. The metronome above gives you the target sound/visual.')),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.and_keep_going', 'And keep going.')),
                __alloT('stem.firstresponse.practice_scores_interruptions_too_v2', ' This window scores four things: your rate, how steady it is, your longest hands-off pause, and the share of the 30 seconds you spent compressing. Stopping to look around is the mistake that costs the most.')),
              h('div', { style: { textAlign: 'center', margin: '14px 0' } },
                h('button', { 'data-fr-focusable': true,
                  'aria-disabled': practiceRunning ? 'false' : 'true',
                  'aria-label': practiceRunning
                    ? __alloT('stem.firstresponse.sr_tap_to_record_a_compression', 'Tap to record a compression')
                    : __alloT('stem.firstresponse.a11y_tap_off', 'Off. Practice is not running — press Start.'),
                  onClick: tapNow,
                  style: {
                    width: 180, height: 180, borderRadius: '50%',
                    border: 'none',
                    background: practiceRunning ? T.accent : T.cardAlt,
                    color: '#fff', fontSize: 18, fontWeight: 800, cursor: practiceRunning ? 'pointer' : 'not-allowed',
                    opacity: practiceRunning ? 1 : 0.5,
                    transform: practiceRunning && taps.length % 2 === 1 ? 'scale(0.93)' : 'scale(1)',
                    transition: 'transform 90ms ease-out, box-shadow 90ms ease-out',
                    boxShadow: practiceRunning ? (taps.length % 2 === 1 ? '0 0 34px rgba(220,38,38,0.6)' : '0 0 24px rgba(220,38,38,0.45)') : 'none'
                  }
                }, practiceRunning ? __alloT('stem.firstresponse.tap_label', 'TAP') : __alloT('stem.firstresponse.off_label', 'Off'))
              ),
              practiceRunning && h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 } },
                statTile(__alloT('stem.firstresponse.stat_rate', 'Rate'),
                  live.enoughData ? live.medianBpm + ' bpm' : '—',
                  live.enoughData ? (live.rateOk ? 'ok' : 'warn') : 'unknown',
                  __alloT('stem.firstresponse.stat_rate_note', 'Target 100–120')),
                statTile(__alloT('stem.firstresponse.stat_hands_off', 'Hands off'), (handsOffMs / 1000).toFixed(1) + ' s',
                  handsOffMs < CPR_PRACTICE_SPEC.warnPauseMs ? 'ok' : 'warn',
                  __alloT('stem.firstresponse.stat_hands_off_note', 'Keep every pause under 10 s')),
                statTile(__alloT('stem.firstresponse.stat_compressing', 'Compressing'), live.fractionPct + '%',
                  live.fractionOk ? 'ok' : 'warn',
                  __alloT('stem.firstresponse.stat_compressing_note', 'Share of the window, target 60%+')),
                statTile(__alloT('stem.firstresponse.stat_steady', 'Steady'),
                  live.enoughData ? live.consistencyPct + '%' : '—',
                  live.enoughData ? (live.steadyOk ? 'ok' : 'warn') : 'unknown',
                  __alloT('stem.firstresponse.stat_steady_note', 'An even beat, not an even average'))
              ),
              handsOffWarn && h('div', { role: 'status', style: {
                padding: '8px 10px', borderRadius: 8, marginBottom: 10,
                background: 'rgba(245,158,11,0.14)', border: '1px solid ' + T.warn, color: T.text, fontSize: 12, lineHeight: 1.5
              } },
                h('strong', null, __alloT('stem.firstresponse.hands_off_warning_v2', 'Hands off the chest. ')),
                h('span', { 'aria-hidden': 'true' }, (handsOffMs / 1000).toFixed(0) + ' s. '),
                __alloT('stem.firstresponse.hands_off_warning_why', 'Blood flow stops the moment you stop, and it takes several compressions to build the pressure back up. Push again now.')),
              h('div', { style: { textAlign: 'center', fontSize: 14, color: T.muted, marginBottom: 8 } },
                practiceRunning
                  ? h('span', null, Math.round(elapsedSec), __alloT('stem.firstresponse.s_30s_taps', 's / 30s • taps: '), taps.length)
                  : (practiceBest
                      ? h('span', null, __alloT('stem.firstresponse.best_label', 'Best: '), h('strong', { style: { color: T.text } }, practiceBest.rate + ' bpm'),
                          typeof practiceBest.fractionPct === 'number' ? h('span', null, ' • ', __alloT('stem.firstresponse.n_percent_compressing', '{n}% compressing').replace('{n}', practiceBest.fractionPct)) : null,
                          practiceBest.passed ? h('span', { style: { color: T.ok } }, ' ✓') : null)
                      : __alloT('stem.firstresponse.press_start_then_tap', 'Press Start, then tap with the rhythm.'))
              ),
              h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' } },
                !practiceRunning && h('button', { 'data-fr-focusable': true,
                  'aria-label': __alloT('stem.firstresponse.a11y_start_30s', 'Start 30s. Begins the 30 second practice window.'),
                  onClick: startPractice, style: btnPrimary()
                }, __alloT('stem.firstresponse.start_30s', '▶ Start 30s')),
                practiceRunning && h('button', { 'data-fr-focusable': true,
                  'aria-label': __alloT('stem.firstresponse.stop_practice_early', 'Stop practice early'),
                  onClick: stopPractice, style: btn()
                }, __alloT('stem.firstresponse.stop', '■ Stop'))
              )
            ),

            // Debrief. Names the criterion that failed rather than a single
            // pass/fail number, because "110 bpm" and "you stopped for 12
            // seconds" are different lessons.
            !practiceRunning && last && h('div', { style: {
              padding: 14, borderRadius: 10, marginBottom: 14,
              background: T.card, border: '1px solid ' + (last.passed ? T.ok : T.warn)
            } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } },
                last.passed
                  ? __alloT('stem.firstresponse.result_all_four', '✅ All four: rate, steadiness, pauses, and compression time')
                  : __alloT('stem.firstresponse.result_what_to_fix', '🔎 What to fix next run')),
              last.partial && h('p', { style: { margin: '0 0 8px', fontSize: 12, color: T.warn, lineHeight: 1.5 } },
                __alloT('stem.firstresponse.result_stopped_early', 'You stopped early. This run is still scored against the full 30 seconds — because in a real arrest, stopping does not stop the clock.')),
              h('ul', { style: { margin: '0 0 0 18px', padding: 0, color: T.muted, fontSize: 12, lineHeight: 1.7 } },
                h('li', null,
                  h('strong', { style: { color: last.rateOk ? T.ok : T.warn } }, last.rateOk ? '✓ ' : '✗ '),
                  __alloT('stem.firstresponse.result_rate_label', 'Rate: '),
                  h('strong', { style: { color: T.text } }, last.rate + ' bpm'),
                  last.rateOk
                    ? __alloT('stem.firstresponse.result_rate_ok', ' — inside the 100–120 band.')
                    : (last.rate < 100
                        ? __alloT('stem.firstresponse.result_rate_slow', ' — under 100. Too slow to move enough blood; find the beat on the Metronome tab first.')
                        : __alloT('stem.firstresponse.result_rate_fast', ' — over 120. Faster is not better: the chest never refills between compressions.'))),
                h('li', null,
                  h('strong', { style: { color: last.steadyOk ? T.ok : T.warn } }, last.steadyOk ? '✓ ' : '✗ '),
                  __alloT('stem.firstresponse.result_steady_label', 'Steadiness: '),
                  h('strong', { style: { color: T.text } }, last.consistencyPct + '%'),
                  last.steadyOk
                    ? __alloT('stem.firstresponse.result_steady_ok', ' — an even beat, which is what a rate in the band is supposed to mean.')
                    : __alloT('stem.firstresponse.result_steady_bad', ' — too uneven. Rushing then coasting can average out to a healthy number while almost none of your compressions were actually in the band. Follow the metronome rather than counting.')),
                h('li', null,
                  h('strong', { style: { color: last.pauseOk ? T.ok : T.warn } }, last.pauseOk ? '✓ ' : '✗ '),
                  __alloT('stem.firstresponse.result_pause_label', 'Longest hands-off pause: '),
                  h('strong', { style: { color: T.text } }, (last.longestPauseMs / 1000).toFixed(1) + ' s'),
                  last.pauseOk
                    ? __alloT('stem.firstresponse.result_pause_ok', ' — under the 10-second limit.')
                    : __alloT('stem.firstresponse.result_pause_bad', ' — over 10 seconds. Pauses are for swapping rescuers or letting an AED analyze, and nothing else.')),
                h('li', null,
                  h('strong', { style: { color: last.fractionOk ? T.ok : T.warn } }, last.fractionOk ? '✓ ' : '✗ '),
                  __alloT('stem.firstresponse.result_fraction_label', 'Compressing: '),
                  h('strong', { style: { color: T.text } }, last.fractionPct + '%'),
                  __alloT('stem.firstresponse.result_fraction_of_window', ' of the window'),
                  last.fractionOk
                    ? __alloT('stem.firstresponse.result_fraction_ok', ' — at or above the 60% target.')
                    : __alloT('stem.firstresponse.result_fraction_bad', ' — below the 60% target. This is the number that separates a rescuer who kept going from one who kept starting over.')),
                h('li', null,
                  __alloT('stem.firstresponse.result_compressions_label', 'Compressions recorded: '),
                  h('strong', { style: { color: T.text } }, last.compressions))
              ),
              h('div', { style: { marginTop: 10, fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.5 } },
                __alloT('stem.firstresponse.result_source_v2', 'Rate, pause and compression-fraction targets come from the 2025 AHA Guidelines for CPR & ECC: 100–120 compressions per minute, interruptions under 10 seconds, chest compression fraction of at least 60%. Steadiness is this tool’s own check that your rate is a rhythm rather than an average, not a published guideline number.'))
            ),

            h('div', { style: { padding: 12, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h4', { style: { margin: '0 0 6px', fontSize: 13, color: T.text } }, __alloT('stem.firstresponse.fatigue_title', '💪 Thirty seconds is the easy part')),
              h('p', { style: { margin: '0 0 6px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                __alloT('stem.firstresponse.fatigue_body', 'A real arrest runs for many minutes. Compression depth starts falling after about a minute or two — and the rescuer almost never notices, because effort feels the same while the chest moves less. That is why the advice is not "push until you are tired".')),
              h('ul', { style: { margin: '0 0 0 18px', color: T.muted, fontSize: 12, lineHeight: 1.65 } },
                h('li', null,
                  h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.fatigue_swap', 'Swap compressors about every two minutes')),
                  __alloT('stem.firstresponse.fatigue_swap_why', ' if there is anyone else at all, whether or not you feel able to continue.')),
                h('li', null,
                  h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.fatigue_when', 'Use the AED’s analysis as the changeover')),
                  __alloT('stem.firstresponse.fatigue_when_why', ' — everyone is already off the chest, so the swap costs nothing extra.')),
                h('li', null,
                  h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.fatigue_fast', 'Count it out loud and keep it under five seconds')),
                  __alloT('stem.firstresponse.fatigue_fast_why', '. Plan the handover before it happens: the next person kneels ready on the opposite side, and takes over on the count.')),
                h('li', null,
                  h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.fatigue_alone', 'Alone? Do not stop to rest.')),
                  __alloT('stem.firstresponse.fatigue_alone_why', ' Tiring compressions still move blood; stopped compressions move none. Keep going until EMS takes over.'))
              )),

            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 11, color: T.dim, lineHeight: 1.55 } },
              __alloT('stem.firstresponse.you_re_practicing_rhythm_and_continuity', 'You’re practicing rhythm and continuity only — depth (about 2 inches on an adult) and full chest recoil also matter, and you can’t practice those on a screen. Get hands-on at '),
              h('a', { href: 'https://www.redcross.org/take-a-class', target: '_blank', rel: 'noopener', style: { color: T.link, textDecoration: 'underline' } }, 'redcross.org'),
              '.')
          );
        }

        function cprAed() {
          var aedStep = d.aedStep || 0;
          var aedShockBranch = d.aedShockBranch || null; // 'shock' or 'noshock'

          var STEPS = [
            { icon: '🟢', title: __alloT('stem.firstresponse.step_1_turn_it_on', 'Step 1 — Turn it on'),
              say: '"AED ON. Apply pads to bare chest as shown."',
              tip: __alloT('stem.firstresponse.open_the_case_press_the_green_power_bu', 'Open the case. Press the green/power button. The AED starts giving voice prompts immediately. Visual prompts on the screen mirror them for deaf/HoH rescuers.') },
            { icon: '👕', title: __alloT('stem.firstresponse.step_2_expose_the_chest', 'Step 2 — Expose the chest'),
              say: '"Apply pads to bare chest."',
              tip: __alloT('stem.firstresponse.cut_or_tear_off_the_shirt_v2', 'Cut or tear off the shirt. If the chest is wet — sweat, rain, pool water — wipe it dry, because water spreads the current across the skin instead of through the chest. If it is very hairy, most AED cases include a razor. Peel off any medication patches and wipe the area. If you see or feel a hard lump under the skin near the collarbone — an implanted pacemaker or defibrillator — put the pad an inch or so to the side of it, never straight on top. The pads go skin-to-skin.') },
            { icon: '📍', title: __alloT('stem.firstresponse.step_3_place_the_pads', 'Step 3 — Place the pads'),
              say: '"Place one pad on upper-right chest, one on lower-left side."',
              tip: __alloT('stem.firstresponse.the_pads_have_a_picture_showing_where_', 'The pads have a picture showing where they go. Adult: upper-right + lower-left ribs. Child <8 or <55 lbs: use child pads if available, or place one on chest and one on the back.') },
            { icon: '✋', title: __alloT('stem.firstresponse.step_4_stand_clear', 'Step 4 — Stand clear'),
              say: '"Analyzing. Do not touch the patient."',
              tip: __alloT('stem.firstresponse.loudly_say_clear_so_no_one_is_touching', 'Loudly say "CLEAR!" so no one is touching the person. The AED is reading the heart rhythm. Takes 5–15 seconds.') },
            { icon: '⚡', title: __alloT('stem.firstresponse.step_5_shock_or_no_shock', 'Step 5 — Shock or no shock'),
              say: aedShockBranch === 'shock' ? '"Shock advised. Stand clear. Press the flashing button now."' : (aedShockBranch === 'noshock' ? '"No shock advised. Begin CPR."' : '"Analyzing..."'),
              tip: __alloT('stem.firstresponse.pick_a_branch_below_to_see_what_happen', 'Pick a branch below to see what happens for each.') },
            { icon: '🔁', title: __alloT('stem.firstresponse.step_6_continue_compressions', 'Step 6 — Continue compressions'),
              say: '"Begin CPR. Continue chest compressions. AED will re-analyze in 2 minutes."',
              tip: __alloT('stem.firstresponse.whether_shock_or_no_shock_v2', 'Whether shock or no shock — the AED will tell you to do CPR for 2 minutes, then it re-analyzes. Do not remove the pads. Keep going until EMS arrives. Those analysis pauses are also when you swap compressors if anyone else is there: everybody is off the chest already, so the changeover is free.') }
          ];

          // Step 5 is the only DECISION in the walkthrough, and "no shock
          // advised" is the prompt bystanders most often misread as "he is
          // fine, stop". Advancing past it without picking a branch would let a
          // learner finish the walkthrough having seen neither outcome.
          var branchNeeded = aedStep === 4 && !aedShockBranch;

          function next() {
            if (branchNeeded) {
              frAnnounceUrgent(__alloT('stem.firstresponse.sr_pick_a_branch_first', 'Pick what the AED said — shock advised, or no shock advised — before continuing.'));
              return;
            }
            if (aedStep < STEPS.length - 1) {
              upd('aedStep', aedStep + 1);
              frAnnounceUrgent(__alloT('stem.firstresponse.sr_step_n', 'Step {n}: ').replace('{n}', aedStep + 2) + STEPS[aedStep + 1].title);
            } else {
              awardBadge('aed_walkthrough', 'AED Operator (walked the steps)');
              upd('aedStep', 0);
              upd('cprView', 'overview');
              frAnnounceUrgent(__alloT('stem.firstresponse.sr_aed_walkthrough_complete', 'AED walkthrough complete.'));
            }
          }
          function prev() {
            if (aedStep > 0) { upd('aedStep', aedStep - 1); }
          }
          function reset() {
            updMulti({ aedStep: 0, aedShockBranch: null });
            frAnnounce(__alloT('stem.firstresponse.sr_reset_to_step_1', 'Reset to step 1.'));
          }

          var step = STEPS[aedStep];
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 32 } }, step.icon),
                h('h3', { style: { margin: 0, fontSize: 16, color: T.text } }, step.title)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: '#0b1d2e', border: '1px solid #1e40af', color: '#dbeafe', fontSize: 13, fontStyle: 'italic', marginBottom: 10 } },
                h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🔊'),
                step.say),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } }, step.tip),
              aedStep === 4 && h('div', { style: { marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' } },
                h('button', { 'data-fr-focusable': true,
                  'aria-pressed': aedShockBranch === 'shock' ? 'true' : 'false',
                  onClick: function() { upd('aedShockBranch', 'shock'); frAnnounce(__alloT('stem.firstresponse.sr_shock_advised_branch', 'Shock advised branch.')); },
                  style: btn({ background: aedShockBranch === 'shock' ? '#7f1d1d' : T.card, color: aedShockBranch === 'shock' ? '#fde2e2' : T.text, padding: '6px 12px', fontSize: 12 })
                }, __alloT('stem.firstresponse.shock_advised', '⚡ "Shock advised"')),
                h('button', { 'data-fr-focusable': true,
                  'aria-pressed': aedShockBranch === 'noshock' ? 'true' : 'false',
                  onClick: function() { upd('aedShockBranch', 'noshock'); frAnnounce(__alloT('stem.firstresponse.sr_no_shock_advised_branch', 'No shock advised branch.')); },
                  style: btn({ background: aedShockBranch === 'noshock' ? '#064e3b' : T.card, color: aedShockBranch === 'noshock' ? '#d1fae5' : T.text, padding: '6px 12px', fontSize: 12 })
                }, __alloT('stem.firstresponse.no_shock_advised', '🚫 "No shock advised"'))
              ),
              aedStep === 4 && aedShockBranch === 'shock' && h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.12)', border: '1px solid ' + T.danger, color: T.text, fontSize: 12, lineHeight: 1.55 } },
                h('strong', null, __alloT('stem.firstresponse.aed_branch_shock_title', 'Shout "CLEAR!", check that nobody is touching them, then press the flashing button. ')),
                __alloT('stem.firstresponse.aed_branch_shock_body', 'The instant the shock is delivered, go straight back to compressions — do not wait to see whether it worked. The heart is empty right after a shock, and compressions are what fill it.')),
              aedStep === 4 && aedShockBranch === 'noshock' && h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.14)', border: '1px solid ' + T.warn, color: T.text, fontSize: 12, lineHeight: 1.55 } },
                h('strong', null, __alloT('stem.firstresponse.aed_branch_noshock_title', '"No shock advised" does not mean they are fine. ')),
                __alloT('stem.firstresponse.aed_branch_noshock_body', 'It means the rhythm is not one a shock can fix. If they are still unresponsive and not breathing normally, resume compressions immediately and leave the pads on — the AED will re-analyze in two minutes. Both branches end the same way: keep pushing.')),
              aedStep === 4 && !aedShockBranch && h('p', { style: { marginTop: 10, marginBottom: 0, fontSize: 12, color: T.warn, lineHeight: 1.5 } },
                __alloT('stem.firstresponse.aed_pick_branch_hint', 'Pick what the AED said to continue. Both branches matter — one of them is the one people get wrong.'))
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
              h('div', { style: { fontSize: 12, color: T.dim } },
                __alloT('stem.firstresponse.step', 'Step '), (aedStep + 1), __alloT('stem.firstresponse.of_separator', ' of '), STEPS.length),
              h('div', { style: { display: 'flex', gap: 6 } },
                aedStep > 0 && h('button', { 'data-fr-focusable': true, 'aria-label': __alloT('stem.firstresponse.a11y_back_previous_step', 'Back. Goes to the previous step.'), onClick: prev, style: btn({ padding: '6px 12px', fontSize: 12 }) }, __alloT('stem.firstresponse.back', '← Back')),
                h('button', { 'data-fr-focusable': true, 'aria-label': __alloT('stem.firstresponse.reset_to_first_step', 'Reset to first step'), onClick: reset, style: btn({ padding: '6px 12px', fontSize: 12 }) }, __alloT('stem.firstresponse.reset', 'Reset')),
                h('button', { 'data-fr-focusable': true,
                  'aria-label': branchNeeded
                    ? __alloT('stem.firstresponse.sr_next_blocked_pick_a_branch', 'Next step, unavailable until you pick shock advised or no shock advised')
                    : (aedStep < STEPS.length - 1
                        ? __alloT('stem.firstresponse.sr_next_step', 'Next step')
                        : __alloT('stem.firstresponse.sr_finish_walkthrough', 'Finish walkthrough')),
                  'aria-disabled': branchNeeded ? 'true' : 'false',
                  onClick: next,
                  style: btnPrimary({ padding: '6px 14px', fontSize: 12, opacity: branchNeeded ? 0.5 : 1, cursor: branchNeeded ? 'not-allowed' : 'pointer' })
                }, aedStep < STEPS.length - 1 ? __alloT('stem.firstresponse.next_arrow', 'Next →') : __alloT('stem.firstresponse.finish_check', 'Finish ✓'))
              )
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('❤️ CPR + AED'),
          emergencyBanner(),
          h('div', { role: 'tablist', 'aria-label': __alloT('stem.firstresponse.cpr_aed_sections', 'CPR + AED sections'),
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('overview', __alloT('stem.firstresponse.cpr_tab_overview', 'Overview')),
            tabBtn('metronome', __alloT('stem.firstresponse.cpr_tab_metronome', 'Metronome')),
            tabBtn('practice', __alloT('stem.firstresponse.cpr_tab_practice', 'Practice')),
            tabBtn('aed', __alloT('stem.firstresponse.sr_aed_walkthrough', 'AED walkthrough'))
          ),
          h('div', { role: 'tabpanel',
            id: 'firstresponse-cpr-panel-' + cprView,
            'aria-labelledby': 'firstresponse-cpr-tab-' + cprView,
            tabIndex: 0
          },
            cprView === 'overview' && cprOverview(),
            cprView === 'metronome' && cprMetronome(),
            cprView === 'practice' && cprPractice(),
            cprView === 'aed' && cprAed(),
            disclaimerFooter()
          )
        );
      }

      // ─────────────────────────────────────────
      // BLEED module — Stop the Bleed skills: direct pressure, wound packing,
      // and tourniquet use. The next trained action depends on severity and wound
      // location: tourniquets are for life-threatening limb bleeding; appropriate
      // deep junctional wounds may be packed by a trained responder.
      // Source: Stop the Bleed (American College of Surgeons / Hartford Consensus).
      // ─────────────────────────────────────────
      function renderBleed() {
        var bleedView = d.bleedView || 'overview';
        var BLEED_TAB_IDS = ['overview', 'practice', 'detail', 'tourniquet'];
        function bleedTabKeyDown(e, index) {
          var key = e.key;
          if (key !== 'ArrowRight' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return;
          e.preventDefault();
          var nextIndex = index;
          if (key === 'ArrowRight' || key === 'ArrowDown') nextIndex = (index + 1) % BLEED_TAB_IDS.length;
          if (key === 'ArrowLeft' || key === 'ArrowUp') nextIndex = (index - 1 + BLEED_TAB_IDS.length) % BLEED_TAB_IDS.length;
          if (key === 'Home') nextIndex = 0;
          if (key === 'End') nextIndex = BLEED_TAB_IDS.length - 1;
          var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
          var nextTab = tabs[nextIndex];
          if (nextTab) { nextTab.focus(); nextTab.click(); }
        }

        function tabBtn(id, label) {
          var active = bleedView === id;
          return h('button', { 'data-fr-focusable': true, key: id, role: 'tab',
            id: 'firstresponse-bleed-tab-' + id,
            'aria-controls': 'firstresponse-bleed-panel-' + id,
            'aria-selected': active ? 'true' : 'false',
            tabIndex: active ? 0 : -1,
            onKeyDown: function(e) { bleedTabKeyDown(e, BLEED_TAB_IDS.indexOf(id)); },
            onClick: function() { upd('bleedView', id); frAnnounce(label); },
            style: btn({
              padding: '6px 12px', fontSize: 12,
              background: active ? T.accent : T.card,
              color: active ? '#fff' : T.text,
              borderColor: active ? T.accent : T.border
            })
          }, label);
        }

        var STEPS = [
          { num: 1, icon: '✋', name: __alloT('stem.firstresponse.direct_pressure_2', 'Direct pressure'),
            short: 'Press hard with both hands.',
            detail: [
              'Use both hands and your bodyweight. Lean in.',
              'Press directly ON the wound — not around it.',
              'If you have a clean cloth, use it. If not, bare hands are fine.',
              'Don’t lift to peek. Hold steady, firm pressure until bleeding stops, a tourniquet is applied and stops limb bleeding, another person relieves you, you are exhausted, or the scene becomes unsafe.',
              'If blood soaks through, do not lift or remove the original dressing. Keep firm manual pressure and follow 911 dispatcher or trained-course guidance.'
            ],
            when: 'Start direct pressure immediately. For life-threatening arm or leg bleeding, use a tourniquet if trained while pressure continues until it is ready.',
            source: 'Stop the Bleed step 1' },
          { num: 2, icon: '🧤', name: __alloT('stem.firstresponse.wound_packing', 'Wound packing'),
            short: 'Pack gauze deep into the wound; keep pressure.',
            detail: [
              'For deep wounds on a limb, neck, armpit, or groin where pressure alone isn’t stopping it.',
              'Pack gauze (or any clean cloth strips) DEEP into the wound, all the way to the bone if needed.',
              'Keep packing until you can’t fit any more in.',
              'Then keep steady, firm direct pressure on top until bleeding stops or another trained responder takes over.',
              'If a hemostatic dressing is available, follow its package instructions and your training.'
            ],
            when: 'Use when direct pressure isn’t controlling a DEEP wound, especially on the neck, armpit, or groin where you CAN’T tourniquet.',
            source: 'Stop the Bleed step 2' },
          { num: 3, icon: '🩹', name: __alloT('stem.firstresponse.tourniquet', 'Tourniquet'),
            short: 'Limbs only. 2–3" above wound. Note time.',
            detail: [
              h('strong', null, __alloT('stem.firstresponse.limbs_only_never_on_neck_head_torso_gr', 'Limbs ONLY. NEVER on neck, head, torso, groin, or armpit.')),
              'Place the tourniquet 2–3 inches ABOVE the wound, between wound and heart. Not on a joint — go above or below the elbow/knee.',
              'Tighten until the bleeding STOPS. It will hurt — that is correct.',
              'Note the TIME you applied it. Write it on the tourniquet, on the patient’s forehead with marker, or tell EMS.',
              'Do NOT remove it. EMS removes tourniquets in a hospital.',
              'A second tourniquet can be added 2–3 inches above the first if bleeding doesn’t stop.',
              'Use a manufactured tourniquet and follow its instructions. If none is available, keep direct pressure and follow 911 dispatcher guidance.'
            ],
            when: 'Life-threatening bleeding from an arm or leg. Use a tourniquet if trained; use direct pressure while it is retrieved or if none is available.',
            source: 'Stop the Bleed step 3' }
        ];

        function bleedOverview() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 16, color: T.text } }, __alloT('stem.firstresponse.life_threatening_bleeding', '🩸 Life-threatening bleeding')),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.recognize_it', 'Recognize it: ')),
                __alloT('stem.firstresponse.spurting_blood_blood_pooling_on_the_gr', 'spurting or continuously flowing blood, blood pooling on the ground, clothing rapidly soaking through, or signs of shock. Life-threatening blood loss can happen '),
                h('strong', { style: { color: T.accentHi } }, __alloT('stem.firstresponse.as_little_as_3_5_minutes', 'within minutes')),
                '.'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.the_protocol', 'The protocol: ')),
                __alloT('stem.firstresponse.pressure_if_needed_packing_if_needed_t', 'Call 911 and apply direct pressure. For life-threatening arm or leg bleeding, use a tourniquet if trained. For a deep wound where a tourniquet cannot be used, pack the wound if trained and keep pressure.'))
            ),
            h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              STEPS.map(function(s) {
                return h('div', { key: s.num, role: 'listitem',
                  style: { padding: 12, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                    h('span', { 'aria-hidden': 'true', style: { background: T.accent, color: '#fff', borderRadius: 999, width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 } }, s.num),
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, s.icon),
                    h('strong', { style: { color: T.text, fontSize: 15 } }, s.name)
                  ),
                  h('div', { style: { fontSize: 13, color: T.text, marginBottom: 4 } }, s.short),
                  h('div', { style: { fontSize: 12, color: T.muted, fontStyle: 'italic' } }, 'When: ', s.when)
                );
              })
            ),
            h('div', { style: { marginTop: 14 } },
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.see_detailed_protocol_with_step_by_ste', 'See detailed protocol with step-by-step instructions'),
                onClick: function() { upd('bleedView', 'detail'); frAnnounce(__alloT('stem.firstresponse.sr_detailed_protocol', 'Detailed protocol')); },
                style: btnPrimary()
              }, __alloT('stem.firstresponse.see_detailed_protocol', '📋 See detailed protocol')),
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.see_where_you_can_and_cannot_put_a_tou', 'See where you can and cannot put a tourniquet'),
                onClick: function() { upd('bleedView', 'tourniquet'); frAnnounce(__alloT('stem.firstresponse.sr_tourniquet_placement', 'Tourniquet placement')); },
                style: btn({ marginLeft: 8 })
              }, __alloT('stem.firstresponse.tourniquet_placement', '🩹 Tourniquet placement'))
            )
          );
        }

        function bleedDetail() {
          return h('div', null,
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              __alloT('stem.firstresponse.each_step_in_detail', 'Each step in detail. '),
              h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.always_start_at_step_1', 'Apply direct pressure immediately.')),
              __alloT('stem.firstresponse.escalate_only_when_the_previous_step_i', ' Choose the next trained skill by wound location and severity—tourniquet for life-threatening limb bleeding, or packing for an appropriate deep wound where a tourniquet cannot be used.')),
            STEPS.map(function(s) {
              return h('div', { key: s.num,
                style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 10 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                  h('span', { 'aria-hidden': 'true', style: { background: T.accent, color: '#fff', borderRadius: 999, width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 } }, s.num),
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, s.icon),
                  h('strong', { style: { color: T.text, fontSize: 15 } }, s.name)
                ),
                h('ul', { style: { margin: '0 0 8px 18px', padding: 0, color: T.muted, fontSize: 13, lineHeight: 1.7 } },
                  s.detail.map(function(item, i) { return h('li', { key: i }, item); })
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, marginBottom: 6 } },
                  h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.use_when', 'Use when: ')), s.when),
                h('div', { style: { fontSize: 10, color: T.dim, fontStyle: 'italic' } }, 'Source: ', s.source)
              );
            }),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#7f1d1d', border: '1px solid #dc2626', color: '#fde2e2', fontSize: 13, lineHeight: 1.55, marginTop: 6 } },
              h('strong', null, __alloT('stem.firstresponse.maine_reality', '🌲 Maine reality: ')),
              MAINE_EMS.ruralEta,
              __alloT('stem.firstresponse.that_distance_is_why_a_tourniquet_may_', ' That distance makes early 911 activation, continuous bleeding control, and monitoring for shock especially important. The treatment choice depends on wound location and severity, not distance from a city.')),
            h('div', { style: { marginTop: 12 } },
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.mark_stop_the_bleed_module_complete', 'Mark Stop the Bleed module complete'),
                onClick: function() { awardBadge('bleed_stopped', 'Stop the Bleed (knows the protocol)'); },
                style: btnPrimary()
              }, __alloT('stem.firstresponse.i_ve_learned_the_protocol', '✓ I’ve learned the protocol')),
              h('a', { href: 'https://www.stopthebleed.org', target: '_blank', rel: 'noopener',
                'data-fr-focusable': true,
                style: Object.assign(btn({ marginLeft: 8, display: 'inline-block', textDecoration: 'none' }), { padding: '10px 16px' })
              }, __alloT('stem.firstresponse.take_a_free_course_stopthebleed_org', 'Take a free course → stopthebleed.org'))
            )
          );
        }

        var BLEED_PRACTICE_CASES = [
          { id: 'thigh', kind: 'limb', icon: '🦵', title: 'Workshop — deep thigh wound',
            scene: 'A sharp tool caused a deep thigh wound. Bright red blood is flowing rapidly and pooling on the floor.',
            choicePrompt: 'Pressure is slowing the flow, but this is still life-threatening limb bleeding. What comes next?' },
          { id: 'groin', kind: 'junction', icon: '🩸', title: 'Bike crash — deep groin wound',
            scene: 'A rider landed on broken metal. There is a deep groin wound with continuous heavy bleeding.',
            choicePrompt: 'A tourniquet cannot go around the groin. What trained skill fits this location?' }
        ];

        function bleedPracticeCase(id) {
          for (var i = 0; i < BLEED_PRACTICE_CASES.length; i++) if (BLEED_PRACTICE_CASES[i].id === id) return BLEED_PRACTICE_CASES[i];
          return null;
        }
        function resetBleedPractice(message) {
          bleedPracticeRef.current = makeBleedPracticeState();
          if (message) frAnnounce(message);
          refreshBleedPractice();
        }
        function startBleedPractice(caseId) {
          var next = makeBleedPracticeState();
          next.caseId = caseId;
          next.phase = 'protect';
          bleedPracticeRef.current = next;
          frAnnounceUrgent(__alloT('stem.firstresponse.sr_check_scene_safety_use_gloves_if_available_call_9', 'Check scene safety, use gloves if available, call 911, and begin care.'));
          refreshBleedPractice();
        }
        function bleedPracticeMistake(code, message) {
          var p = bleedPracticeRef.current;
          if (p.mistakes.indexOf(code) === -1) p.mistakes.push(code);
          frAnnounceUrgent(message);
          refreshBleedPractice();
        }
        function protectAndCallBleed() {
          var p = bleedPracticeRef.current;
          if (p.phase !== 'protect') return;
          p.sequence.push('scene-safety-ppe-911');
          p.phase = 'pressure';
          frAnnounceUrgent(__alloT('stem.firstresponse.sr_apply_steady_firm_direct_pressure_now', 'Apply steady, firm direct pressure now.'));
          refreshBleedPractice();
        }
        function beginBleedPressure(e) {
          var p = bleedPracticeRef.current;
          if (p.phase !== 'pressure' && p.phase !== 'packPressure') return;
          if (e && e.type === 'keydown') {
            if (e.repeat || (e.key !== ' ' && e.key !== 'Enter')) return;
            e.preventDefault();
          }
          if (p.holding) return;
          p.holding = true;
          p.holdStartedAt = bleedPracticeNow();
          frAnnounce(__alloT('stem.firstresponse.sr_pressure_started_keep_holding_steadily', 'Pressure started. Keep holding steadily.'));
          refreshBleedPractice();
        }
        function finishBleedPractice() {
          var p = bleedPracticeRef.current;
          var kase = bleedPracticeCase(p.caseId);
          p.holding = false;
          p.phase = 'complete';
          p.summary = {
            caseId: p.caseId,
            kind: kase ? kase.kind : null,
            mistakes: p.mistakes.length,
            sequence: p.sequence.slice(),
            completedAtISO: new Date().toISOString()
          };
          upd('bleedPracticeBest', p.summary);
          awardBadge('bleed_scenario_ready', 'Bleeding Control Scenario Practice');
          frAnnounceUrgent(__alloT('stem.firstresponse.sr_scenario_complete_keep_monitoring_breathing_respo', 'Scenario complete. Keep monitoring breathing, responsiveness, warmth, and signs of shock until EMS arrives.'));
          refreshBleedPractice();
        }
        function endBleedPressure(e) {
          var p = bleedPracticeRef.current;
          if (!p.holding) return;
          if (e && e.type === 'keyup' && e.key !== ' ' && e.key !== 'Enter') return;
          var held = Math.max(0, bleedPracticeNow() - p.holdStartedAt);
          p.holding = false;
          p.pressureHoldMs = held;
          if (held < 2500) {
            bleedPracticeMistake('released-early', 'Pressure released too soon. In real care, do not lift to peek. Hold continuously until bleeding stops, a tourniquet is applied and stops the bleeding, someone relieves you, you are exhausted, or the scene becomes unsafe.');
            return;
          }
          if (p.phase === 'packPressure') {
            p.sequence.push('pressure-after-packing');
            finishBleedPractice();
            return;
          }
          p.sequence.push('direct-pressure');
          p.phase = 'choice';
          frAnnounceUrgent(__alloT('stem.firstresponse.sr_pressure_hold_practiced_choose_the_next_action_fo', 'Pressure hold practiced. Choose the next action for this wound location.'));
          refreshBleedPractice();
        }
        function chooseBleedPracticeAction(action) {
          var p = bleedPracticeRef.current;
          var kase = bleedPracticeCase(p.caseId);
          if (!kase || p.phase !== 'choice') return;
          if (kase.kind === 'limb' && action === 'tourniquet') {
            p.sequence.push('choose-tourniquet');
            p.phase = 'tourniquetPlacement';
            frAnnounce(__alloT('stem.firstresponse.sr_correct_choose_a_safe_tourniquet_position', 'Correct. Choose a safe tourniquet position.'));
          } else if (kase.kind === 'junction' && action === 'pack') {
            p.sequence.push('choose-wound-packing');
            p.phase = 'packing';
            frAnnounce(__alloT('stem.firstresponse.sr_correct_pack_the_deep_wound_if_trained_then_keep', 'Correct. Pack the deep wound if trained, then keep firm pressure.'));
          } else if (action === 'peek') {
            bleedPracticeMistake('peeked', 'Do not lift or remove the original dressing to peek. Keep steady pressure.');
            return;
          } else if (action === 'tourniquet') {
            bleedPracticeMistake('tourniquet-junction', 'A tourniquet cannot be placed around the groin, neck, armpit, chest, or abdomen. For this deep junctional wound, pack if trained and keep pressure.');
            return;
          } else {
            bleedPracticeMistake('wrong-escalation', 'Match the tool to the wound location: life-threatening limb bleeding can use a tourniquet if trained; a deep junctional wound may need packing if trained.');
            return;
          }
          refreshBleedPractice();
        }
        function chooseBleedTourniquetPlacement(place) {
          var p = bleedPracticeRef.current;
          if (p.phase !== 'tourniquetPlacement') return;
          if (place !== 'above') {
            bleedPracticeMistake('bad-tourniquet-placement', place === 'joint'
              ? 'Do not place a tourniquet over a joint.'
              : 'The tourniquet belongs 2 to 3 inches above the wound, between the wound and the heart.');
            return;
          }
          p.tourniquetPlacement = place;
          p.sequence.push('tourniquet-2-3-inches-above-not-joint');
          p.phase = 'tighten';
          frAnnounceUrgent(__alloT('stem.firstresponse.sr_placement_correct_tighten_until_the_bleeding_stop', 'Placement correct. Tighten until the bleeding stops.'));
          refreshBleedPractice();
        }
        function tightenBleedTourniquet() {
          var p = bleedPracticeRef.current;
          if (p.phase !== 'tighten') return;
          p.windlassTurns += 1;
          if (p.windlassTurns >= 3) {
            p.sequence.push('tighten-until-bleeding-stops');
            p.phase = 'noteTime';
            frAnnounceUrgent(__alloT('stem.firstresponse.sr_bleeding_stopped_secure_the_windlass_note_the_tim', 'Bleeding stopped. Secure the windlass, note the time, and do not loosen the tourniquet.'));
          } else {
            frAnnounce(__alloT('stem.firstresponse.sr_still_bleeding_keep_tightening', 'Still bleeding. Keep tightening.'));
          }
          refreshBleedPractice();
        }
        function noteBleedTourniquetTime() {
          var p = bleedPracticeRef.current;
          if (p.phase !== 'noteTime') return;
          p.sequence.push('note-time-leave-in-place');
          finishBleedPractice();
        }
        function packBleedWound() {
          var p = bleedPracticeRef.current;
          if (p.phase !== 'packing') return;
          p.packed = true;
          p.sequence.push('pack-deep-wound');
          p.phase = 'packPressure';
          p.pressureHoldMs = 0;
          frAnnounceUrgent(__alloT('stem.firstresponse.sr_wound_packed_apply_steady_firm_pressure_on_top_an', 'Wound packed. Apply steady, firm pressure on top and keep holding.'));
          refreshBleedPractice();
        }

        function bleedPracticeVisual(kase, p) {
          var limb = kase && kase.kind === 'limb';
          var controlled = p.phase === 'complete' || p.phase === 'noteTime' || (p.phase === 'tighten' && p.windlassTurns >= 3);
          var streamWidth = controlled ? 2 : (p.holding ? 5 : 10);
          var woundX = limb ? 218 : 224;
          var woundY = limb ? 132 : 156;
          return h('svg', {
            viewBox: '0 0 440 230', role: 'img',
            'aria-label': limb
              ? 'Schematic thigh wound. Blood flow decreases while pressure is held and after the tourniquet is tightened.'
              : 'Schematic deep groin wound. Blood flow decreases while pressure is held and after wound packing.',
            style: { width: '100%', maxHeight: 250, display: 'block', marginBottom: 10, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border }
          },
            h('rect', { x: 12, y: 12, width: 416, height: 206, rx: 12, fill: T.cardAlt }),
            limb
              ? h('g', null,
                h('rect', { x: 172, y: 24, width: 96, height: 180, rx: 46, fill: T.card, stroke: T.border, strokeWidth: 3 }),
                (p.phase === 'tourniquetPlacement' || p.phase === 'tighten' || p.phase === 'noteTime' || p.phase === 'complete') &&
                  h('rect', { x: 162, y: 72, width: 116, height: 18, rx: 5, fill: T.warn, stroke: T.text, strokeWidth: 2 }),
                h('circle', { cx: woundX, cy: woundY, r: 13, fill: T.danger, stroke: '#fecaca', strokeWidth: 4 }))
              : h('g', null,
                h('path', { d: 'M150 28 Q220 2 290 28 L314 156 Q276 208 220 212 Q164 208 126 156 Z', fill: T.card, stroke: T.border, strokeWidth: 3 }),
                h('circle', { cx: woundX, cy: woundY, r: 13, fill: T.danger, stroke: '#fecaca', strokeWidth: 4 }),
                p.packed && h('path', { d: 'M205 145 L244 169 M244 145 L205 169', stroke: '#f8fafc', strokeWidth: 10, strokeLinecap: 'round' })),
            !controlled && h('path', { d: 'M' + woundX + ' ' + (woundY + 10) + ' C' + (woundX + 8) + ' 176 ' + (woundX - 18) + ' 188 ' + woundX + ' 211',
              fill: 'none', stroke: T.danger, strokeWidth: streamWidth, strokeLinecap: 'round' }),
            p.holding && h('g', null,
              h('rect', { x: woundX - 58, y: woundY - 42, width: 54, height: 38, rx: 16, fill: '#f5c7a9', stroke: T.text, strokeWidth: 2, transform: 'rotate(-12 ' + (woundX - 31) + ' ' + (woundY - 23) + ')' }),
              h('rect', { x: woundX + 4, y: woundY - 42, width: 54, height: 38, rx: 16, fill: '#f5c7a9', stroke: T.text, strokeWidth: 2, transform: 'rotate(12 ' + (woundX + 31) + ' ' + (woundY - 23) + ')' })),
            h('text', { x: 220, y: 214, textAnchor: 'middle', fill: T.muted, fontSize: 12 },
              controlled ? 'Bleeding controlled — continue monitoring' : (p.holding ? 'Steady pressure applied' : 'Life-threatening bleeding'))
          );
        }

        function bleedPractice() {
          var p = bleedPracticeRef.current;
          var kase = bleedPracticeCase(p.caseId);
          var phaseNames = {
            protect: 'SCENE SAFETY + 911', pressure: 'DIRECT PRESSURE', choice: 'CHOOSE THE NEXT TOOL',
            tourniquetPlacement: 'PLACE THE TOURNIQUET', tighten: 'TIGHTEN UNTIL BLEEDING STOPS',
            noteTime: 'NOTE THE TIME', packing: 'PACK THE WOUND', packPressure: 'PRESS AFTER PACKING',
            complete: 'SCENARIO COMPLETE'
          };
          function practiceButton(label, action, primary) {
            return h('button', { 'data-fr-focusable': true, onClick: action,
              style: (primary ? btnPrimary : btn)({ width: '100%', textAlign: 'left', marginBottom: 7 }) }, label);
          }
          if (!kase) {
            return h('div', null,
              h('h3', { style: { margin: '0 0 6px', fontSize: 16, color: T.text } }, 'Interactive bleeding-control practice'),
              h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: T.muted, lineHeight: 1.6 } },
                'Choose a wound location. You will practice scene safety, continuous pressure, and the location-specific trained skill.'),
              h('div', { role: 'list', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 9 } },
                BLEED_PRACTICE_CASES.map(function (item) {
                  return h('button', { key: item.id, onClick: function () { startBleedPractice(item.id); },
                    'aria-label': 'Start bleeding-control scenario: ' + item.title,
                    style: btn({ width: '100%', minHeight: 112, textAlign: 'left', padding: 13 }) },
                    h('div', { style: { fontSize: 20, marginBottom: 4 }, 'aria-hidden': 'true' }, item.icon),
                    h('div', { style: { fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 4 } }, item.title),
                    h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.5 } }, item.scene));
                })),
              d.bleedPracticeBest && h('div', { style: { marginTop: 10, fontSize: 11.5, color: T.dim } },
                'Previous scenario: ' + d.bleedPracticeBest.sequence.length + ' safe actions, ' + d.bleedPracticeBest.mistakes + ' mistake(s).')
            );
          }

          return h('div', null,
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
              h('div', null,
                h('div', { style: { fontSize: 11, fontWeight: 800, color: T.dim } }, phaseNames[p.phase] || 'PRACTICE'),
                h('h3', { style: { margin: '2px 0 0', fontSize: 16, color: T.text } }, kase.icon + ' ' + kase.title)),
              h('button', { onClick: function () { resetBleedPractice('Bleeding-control practice reset.'); }, style: btn({ padding: '5px 9px', fontSize: 11 }) }, 'Change scenario')),
            h('p', { style: { margin: '0 0 8px', fontSize: 12.5, color: T.muted, lineHeight: 1.55 } }, kase.scene),
            h('div', { role: 'note', style: { padding: 9, borderRadius: 8, border: '1px solid ' + T.warn, background: T.cardAlt, fontSize: 11.5, color: T.text, lineHeight: 1.5, marginBottom: 9 } },
              h('strong', { style: { color: T.warn } }, 'Training boundary: '),
              'The 2.5-second hold is compressed screen rehearsal. In real care, keep steady pressure until bleeding stops, a tourniquet is applied and stops the bleeding, someone relieves you, you are exhausted, or the scene becomes unsafe. This screen cannot assess real force, packing depth, or tourniquet tightness.'),
            bleedPracticeVisual(kase, p),
            h('div', { role: 'status', 'aria-live': 'polite', style: { padding: 9, borderRadius: 8, background: T.card, border: '1px solid ' + T.border, fontSize: 12, color: T.text, marginBottom: 9 } },
              (phaseNames[p.phase] || 'PRACTICE') + ' • Mistakes: ' + p.mistakes.length),

            p.phase === 'protect' && h('div', null,
              practiceButton('Check scene safety, use gloves if available, call 911, and begin care', protectAndCallBleed, true),
              practiceButton('Search for perfect supplies before touching the wound', function () {
                bleedPracticeMistake('delayed-care', 'Do not delay life-saving care while searching for perfect supplies. Use gloves if available, call 911, and start bleeding control immediately.');
              }, false)),

            (p.phase === 'pressure' || p.phase === 'packPressure') && h('div', null,
              h('p', { style: { fontSize: 12.5, color: T.text, lineHeight: 1.55, margin: '0 0 8px' } },
                p.phase === 'packPressure' ? 'Press firmly on top of the packed wound.' : 'Place both hands directly over the wound and hold without peeking.'),
              h('button', {
                'data-fr-focusable': true,
                'aria-label': p.phase === 'packPressure' ? 'Press and hold after wound packing' : 'Press and hold direct pressure',
                onPointerDown: beginBleedPressure, onPointerUp: endBleedPressure, onPointerCancel: endBleedPressure,
                onKeyDown: beginBleedPressure, onKeyUp: endBleedPressure, onBlur: endBleedPressure,
                style: { display: 'block', width: 180, height: 180, borderRadius: '50%', margin: '0 auto 8px',
                  border: '4px solid ' + (p.holding ? T.ok : T.danger),
                  background: p.holding ? T.ok : T.danger, color: '#fff', fontSize: 18, fontWeight: 900,
                  cursor: 'pointer', boxShadow: p.holding ? '0 0 0 8px rgba(34,197,94,.16)' : '0 12px 28px rgba(220,38,38,.28)' }
              }, p.holding ? 'KEEP HOLDING' : 'PRESS + HOLD'),
              h('div', { style: { textAlign: 'center', fontSize: 11.5, color: T.dim } }, 'Pointer: press and hold • Keyboard: hold Space or Enter')),

            p.phase === 'choice' && h('div', null,
              h('p', { style: { margin: '0 0 8px', fontSize: 12.5, color: T.text, lineHeight: 1.55 } }, kase.choicePrompt),
              kase.kind === 'limb'
                ? h('div', null,
                  practiceButton('Use a manufactured tourniquet if trained', function () { chooseBleedPracticeAction('tourniquet'); }, true),
                  practiceButton('Pack the thigh wound and wait before considering a tourniquet', function () { chooseBleedPracticeAction('pack'); }, false),
                  practiceButton('Lift the dressing to see whether it is still bleeding', function () { chooseBleedPracticeAction('peek'); }, false))
                : h('div', null,
                  practiceButton('Pack the deep wound with gauze if trained, then keep pressure', function () { chooseBleedPracticeAction('pack'); }, true),
                  practiceButton('Wrap a tourniquet around the groin', function () { chooseBleedPracticeAction('tourniquet'); }, false),
                  practiceButton('Lift the dressing to inspect the wound', function () { chooseBleedPracticeAction('peek'); }, false))),

            p.phase === 'tourniquetPlacement' && h('div', null,
              practiceButton('Place it 2–3 inches above the wound, between wound and heart, not over a joint', function () { chooseBleedTourniquetPlacement('above'); }, true),
              practiceButton('Place it directly over the wound', function () { chooseBleedTourniquetPlacement('wound'); }, false),
              practiceButton('Place it across the knee joint', function () { chooseBleedTourniquetPlacement('joint'); }, false),
              practiceButton('Place it below the wound, toward the foot', function () { chooseBleedTourniquetPlacement('below'); }, false)),

            p.phase === 'tighten' && h('div', null,
              h('div', { role: 'progressbar', 'aria-label': __alloT('stem.firstresponse.a11y_tourniquet_tightening_practice', 'Tourniquet tightening practice'), 'aria-valuemin': 0, 'aria-valuemax': 3, 'aria-valuenow': p.windlassTurns,
                style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 } },
                [0, 1, 2].map(function (i) { return h('span', { key: i, 'aria-hidden': 'true', style: { height: 9, borderRadius: 99, background: i < p.windlassTurns ? T.ok : T.border } }); })),
              practiceButton(p.windlassTurns < 2 ? 'Tighten the windlass — bleeding is still flowing' : 'Tighten until bleeding stops, then secure the windlass', tightenBleedTourniquet, true)),

            p.phase === 'noteTime' && h('div', null,
              practiceButton('Note the application time and leave the tourniquet in place for EMS', noteBleedTourniquetTime, true),
              practiceButton('Loosen it now that the bleeding stopped', function () {
                bleedPracticeMistake('loosen-tourniquet', 'Do not loosen or remove a tourniquet after application. A medical professional should remove it.');
              }, false)),

            p.phase === 'packing' && h('div', null,
              practiceButton('Pack gauze firmly into the deep wound, then press on top', packBleedWound, true),
              practiceButton('Place gauze loosely over the opening without filling the wound', function () {
                bleedPracticeMistake('loose-packing', 'For a deep junctional wound, trained wound packing fills the wound firmly before pressure is applied on top.');
              }, false)),

            p.phase === 'complete' && p.summary && h('div', { style: { padding: 13, borderRadius: 10, background: T.card, border: '2px solid ' + (p.mistakes.length ? T.warn : T.ok) } },
              h('div', { style: { fontSize: 13, color: T.dim } }, 'BLEEDING-CONTROL SEQUENCE COMPLETE'),
              h('div', { style: { fontSize: 22, fontWeight: 900, color: p.mistakes.length ? T.warn : T.ok, margin: '4px 0' } },
                p.mistakes.length ? p.mistakes.length + ' mistake(s) — retry to make it automatic' : 'Safe sequence'),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.65 } }, 'Actions: ' + p.sequence.join(' → ')),
              h('div', { style: { marginTop: 8, fontSize: 11.5, color: T.text, lineHeight: 1.55 } },
                'Keep the person warm, watch breathing and responsiveness, reassure them, and monitor for re-bleeding or shock until EMS takes over.'),
              h('button', { onClick: function () { resetBleedPractice('Choose another bleeding-control scenario.'); }, style: btnPrimary({ width: '100%', textAlign: 'center', marginTop: 10 }) }, 'Practice another scenario'))
          );
        }

        function bleedTourniquet() {
          // Body-zone diagram: green = OK to tourniquet (limbs), red = NEVER.
          var ZONES = [
            { zone: 'Upper arm', ok: true, note: __alloT('stem.firstresponse.2_3_above_wound_between_wound_and_shou', '2–3" above wound, between wound and shoulder.') },
            { zone: 'Forearm', ok: true, note: __alloT('stem.firstresponse.above_the_elbow_if_wound_is_at_near_el', 'Above the elbow if wound is at/near elbow.') },
            { zone: 'Thigh', ok: true, note: __alloT('stem.firstresponse.2_3_above_wound_between_wound_and_hip', '2–3" above wound, between wound and hip.') },
            { zone: 'Lower leg / shin', ok: true, note: __alloT('stem.firstresponse.above_the_knee_if_wound_is_at_near_kne', 'Above the knee if wound is at/near knee.') },
            { zone: 'Neck', ok: false, note: __alloT('stem.firstresponse.never_pack_the_wound_and_apply_pressur', 'No tourniquet. If trained, pack a deep wound and apply pressure while protecting the airway; call 911.') },
            { zone: 'Head / face', ok: false, note: __alloT('stem.firstresponse.never_direct_pressure_only', 'No tourniquet. Call 911 and use direct pressure only when appropriate; do not press on an injured eye or suspected skull fracture.') },
            { zone: 'Chest / abdomen', ok: false, note: __alloT('stem.firstresponse.never_pack_if_you_can_pressure_911_fas', 'No tourniquet and do not pack. Call 911 and follow dispatcher guidance; do not press on protruding organs or an embedded object.') },
            { zone: 'Back / shoulder', ok: false, note: 'No tourniquet. If trained, pack a deep wound and apply steady pressure.' },
            { zone: 'Armpit (axilla)', ok: false, note: __alloT('stem.firstresponse.junctional_can_t_tourniquet_pack_with_', 'Junctional — can’t tourniquet. Pack with gauze and apply pressure.') },
            { zone: 'Groin', ok: false, note: __alloT('stem.firstresponse.junctional_can_t_tourniquet_pack_with__2', 'Junctional — can’t tourniquet. Pack with gauze and apply pressure with bodyweight.') }
          ];
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.firstresponse.where_can_a_tourniquet_go', '🩹 Where can a tourniquet go?')),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, __alloT('stem.firstresponse.limbs_only', 'Limbs only.')),
                __alloT('stem.firstresponse.junctional_wounds_neck_armpit_groin_an', ' Deep junctional wounds (neck, shoulder, armpit, groin) may need '),
                h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.wound_packing_2', 'wound packing')),
                __alloT('stem.firstresponse.instead_gauze_deep_into_the_wound_then', ' instead — if trained, pack gauze into the wound and keep pressure. Do not pack the chest or abdomen.')),
              h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                ZONES.map(function(z, i) {
                  return h('div', { key: i, role: 'listitem',
                    style: {
                      padding: '8px 12px', borderRadius: 8,
                      background: z.ok ? '#064e3b' : '#7f1d1d',
                      border: '1px solid ' + (z.ok ? T.ok : T.danger),
                      color: z.ok ? '#d1fae5' : '#fde2e2',
                      display: 'flex', alignItems: 'center', gap: 10
                    } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, z.ok ? '✓' : '✗'),
                    h('div', null,
                      h('div', { style: { fontWeight: 700, fontSize: 13 } },
                        z.zone, ' — ',
                        h('span', { style: { textTransform: 'uppercase', fontSize: 11 } }, z.ok ? 'OK to tourniquet' : 'NEVER tourniquet')),
                      h('div', { style: { fontSize: 12, marginTop: 2 } }, z.note)
                    )
                  );
                })
              )
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.improvised_tourniquet_no_real_one_avai', 'Use the right equipment: ')),
              __alloT('stem.firstresponse.a_belt_won_t_tighten_enough_on_its_own', 'Use a manufactured tourniquet and follow its instructions. A belt alone is not a reliable tourniquet. If no tourniquet is available, keep firm direct pressure and follow 911 dispatcher guidance.'))
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🩸 Stop the Bleed'),
          emergencyBanner(),
          h('div', { role: 'tablist', 'aria-label': __alloT('stem.firstresponse.stop_the_bleed_sections', 'Stop the Bleed sections'),
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('overview', 'Overview'),
            tabBtn('practice', 'Interactive practice'),
            tabBtn('detail', 'Detailed protocol'),
            tabBtn('tourniquet', 'Tourniquet placement')
          ),
          h('div', { role: 'tabpanel',
            id: 'firstresponse-bleed-panel-' + bleedView,
            'aria-labelledby': 'firstresponse-bleed-tab-' + bleedView,
            tabIndex: 0
          },
            bleedView === 'overview' && bleedOverview(),
            bleedView === 'practice' && bleedPractice(),
            bleedView === 'detail' && bleedDetail(),
            bleedView === 'tourniquet' && bleedTourniquet(),
            disclaimerFooter()
          )
        );
      }

      // ─────────────────────────────────────────
      // CHOKING module — age + situation specific decision flow
      // Infant (<1 yr): 5 back blows + 5 chest thrusts (NOT abdominal).
      // Child / adult: 5 back blows + 5 abdominal thrusts (Heimlich).
      // Pregnant or a person whose abdomen cannot be encircled: 5 back blows + 5 chest thrusts.
      // Alone: self-administered abdominal thrust against chair back / counter.
      // Source: AHA/AAP 2025 Adult and Pediatric BLS; Red Cross first aid.
      // ─────────────────────────────────────────
      function renderChoking() {
        var chokeView = d.chokeView || 'select';
        var who = d.chokeWho || null; // 'adult' | 'child' | 'infant' | 'pregnant' | 'alone'
        var CHOKING_TAB_IDS = ['select', 'practice', 'protocol'];
        function chokingTabKeyDown(e, index) {
          var key = e.key;
          if (key !== 'ArrowRight' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return;
          e.preventDefault();
          var nextIndex = index;
          if (key === 'ArrowRight' || key === 'ArrowDown') nextIndex = (index + 1) % CHOKING_TAB_IDS.length;
          if (key === 'ArrowLeft' || key === 'ArrowUp') nextIndex = (index - 1 + CHOKING_TAB_IDS.length) % CHOKING_TAB_IDS.length;
          if (key === 'Home') nextIndex = 0;
          if (key === 'End') nextIndex = CHOKING_TAB_IDS.length - 1;
          var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
          var nextTab = tabs[nextIndex];
          if (nextTab) { nextTab.focus(); nextTab.click(); }
        }

        function tabBtn(id, label) {
          var active = chokeView === id;
          return h('button', { 'data-fr-focusable': true, key: id, role: 'tab',
            id: 'firstresponse-choking-tab-' + id,
            'aria-controls': 'firstresponse-choking-panel-' + id,
            'aria-selected': active ? 'true' : 'false',
            tabIndex: active ? 0 : -1,
            onKeyDown: function(e) { chokingTabKeyDown(e, CHOKING_TAB_IDS.indexOf(id)); },
            onClick: function() { upd('chokeView', id); frAnnounce(label); },
            style: btn({
              padding: '6px 12px', fontSize: 12,
              background: active ? T.accent : T.card,
              color: active ? '#fff' : T.text,
              borderColor: active ? T.accent : T.border
            })
          }, label);
        }

        var WHO = [
          { id: 'adult', icon: '🧑', label: __alloT('stem.firstresponse.adult_or_child_1_year', 'Adult or child (1+ year)') },
          { id: 'child', icon: '🧒', label: __alloT('stem.firstresponse.small_child_1_8', 'Small child (1–8)') },
          { id: 'infant', icon: '👶', label: __alloT('stem.firstresponse.infant_under_1_year', 'Infant (under 1 year)') },
          { id: 'pregnant', icon: '🤰', label: __alloT('stem.firstresponse.pregnant_person', 'Pregnant person') },
          { id: 'alone', icon: '🆘', label: __alloT('stem.firstresponse.you_alone_choking', 'You — alone, choking') }
        ];

        var PROTOCOLS = {
          adult: {
            title: __alloT('stem.firstresponse.adult_or_child_1_year_2', 'Adult or child (1+ year)'),
            recognize: 'Universal sign: hands at throat, can’t cough, can’t speak, can’t breathe. Color may turn dusky/blue.',
            steps: [
              'Ask: "Are you choking?" If they nod or can’t answer — act.',
              'Stand behind them. Lean them slightly forward.',
              h('strong', null, __alloT('stem.firstresponse.5_back_blows', '5 back blows ')),
              'between the shoulder blades with the heel of your hand.',
              h('strong', null, __alloT('stem.firstresponse.5_abdominal_thrusts_heimlich', '5 abdominal thrusts (Heimlich): ')),
              'fist just above the navel, other hand over fist, quick inward + upward thrusts.',
              'Repeat 5+5 until the object comes out OR they go unconscious.',
              h('strong', null, __alloT('stem.firstresponse.if_they_go_unconscious', 'If they go unconscious: ')),
              'lower them safely to the ground, call 911, start CPR. Look in the mouth before each set of breaths and remove anything you see — do NOT do a blind finger sweep.'
            ],
            after: 'Even if the object comes out: they should see a doctor. Abdominal thrusts can cause internal injury.',
            source: 'Red Cross First Aid'
          },
          child: {
            title: __alloT('stem.firstresponse.small_child_1_8_2', 'Small child (1–8)'),
            recognize: 'Same universal sign — hands at throat, silent, can’t breathe.',
            steps: [
              'Kneel behind them so you’re at their level.',
              h('strong', null, __alloT('stem.firstresponse.5_back_blows_2', '5 back blows ')),
              'between shoulder blades with the heel of your hand.',
              h('strong', null, __alloT('stem.firstresponse.5_abdominal_thrusts', '5 abdominal thrusts: ')),
              'gentler than for an adult — fist just above the navel, brisk inward + upward.',
              'Repeat 5+5 until object dislodges or they’re unconscious.',
              'If unconscious: 911, start CPR.'
            ],
            after: 'See a doctor afterward — children’s organs are more vulnerable to thrust injury.',
            source: 'Red Cross First Aid'
          },
          infant: {
            title: __alloT('stem.firstresponse.infant_under_1_year_2', 'Infant (under 1 year)'),
            recognize: 'Can’t cry, can’t cough, weak/silent, color dusky. Different from a fussy baby — there is no sound.',
            steps: [
              h('strong', null, __alloT('stem.firstresponse.never_use_abdominal_thrusts_on_an_infa', 'NEVER use abdominal thrusts on an infant.')),
              'Sit. Lay the baby face-DOWN along your forearm, head lower than body, supporting the jaw. Use your thigh as a brace.',
              h('strong', null, __alloT('stem.firstresponse.5_back_blows_3', '5 back blows ')),
              'between the shoulder blades with the heel of your hand. Firm but not violent.',
              'Flip the baby face-UP along your other forearm, head still low.',
              h('strong', null, __alloT('stem.firstresponse.5_chest_thrusts', '5 chest thrusts: ')),
              'use the heel of one hand on the breastbone for each chest thrust. Do not use the older two-finger method.',
              'Repeat 5+5 until object comes out or baby is unconscious.',
              'If unconscious: 911, start infant CPR.'
            ],
            after: 'Always seek medical care after a choking event in an infant.',
            source: 'AHA/AAP 2025 Pediatric BLS'
          },
          pregnant: {
            title: __alloT('stem.firstresponse.pregnant_person_2', 'Pregnant person'),
            recognize: 'Same universal sign — hands at throat, can’t breathe.',
            steps: [
              h('strong', null, __alloT('stem.firstresponse.use_chest_thrusts_not_abdominal_thrust', 'Use chest thrusts, NOT abdominal thrusts.')),
              h('strong', null, '5 back blows first: '),
              'lean them forward and strike between the shoulder blades with the heel of your hand.',
              'Stand behind them. Place your fist on the CENTER of the breastbone (sternum), not the abdomen.',
              h('strong', null, __alloT('stem.firstresponse.5_chest_thrusts_2', 'Then 5 chest thrusts: ')),
              'pull straight back into the chest, sharp and quick.',
              'Same goes for anyone too large for you to wrap your arms around the abdomen.',
              'Repeat 5 back blows + 5 chest thrusts until the object comes out or they’re unconscious.',
              'If unconscious: 911, start CPR.'
            ],
            after: 'Always see a doctor after — both for thrust injury risk and to check on the pregnancy.',
            source: 'AHA 2025 Adult BLS'
          },
          alone: {
            title: __alloT('stem.firstresponse.you_alone_choking_2', 'You — alone, choking'),
            recognize: 'You cannot cough, speak, or breathe. Act immediately; a severe blockage can become fatal quickly.',
            steps: [
              h('strong', null, __alloT('stem.firstresponse.self_abdominal_thrusts', 'Self abdominal thrusts. ')),
              'Make a fist just above your navel. Other hand on top. Pull sharply inward and upward.',
              h('strong', null, __alloT('stem.firstresponse.or_use_a_chair_back_counter_railing', 'OR use a chair back / counter / railing: ')),
              'lean over a hard horizontal edge (back of a chair, kitchen counter) and push your abdomen down onto it sharply.',
              'Repeat until the object dislodges.',
              'If you can dial — call 911 and leave the line open even if you can’t speak. Modern dispatchers can locate the call.'
            ],
            after: 'See a doctor afterward.',
            source: 'Red Cross First Aid'
          }
        };

        var CHOKE_PRACTICE_CASES = [
          { id: 'adult', tag: 'ADULT', title: 'Cafeteria - adult', kind: 'abdomen', scene: 'Hands at throat; cannot speak, breathe, or cough strongly.', thrust: 'abdominal thrust', placement: 'Fist just above the navel; thrust inward and upward.' },
          { id: 'infant', tag: 'INFANT', title: 'Day care - infant', kind: 'infant', scene: 'Awake but unable to cry or cough strongly; little sound; becoming dusky.', thrust: 'heel-of-one-hand chest thrust', placement: 'Heel of one hand on the breastbone; face-up with the head lower.' },
          { id: 'pregnant', tag: 'CHEST', title: 'Restaurant - late pregnancy', kind: 'chest', scene: 'Hands at throat; cannot speak, breathe, or cough. Avoid the abdomen.', thrust: 'chest thrust', placement: 'Fist on the center of the breastbone; pull straight back.' }
        ];
        function chokePracticeCase(id) {
          for (var i = 0; i < CHOKE_PRACTICE_CASES.length; i++) if (CHOKE_PRACTICE_CASES[i].id === id) return CHOKE_PRACTICE_CASES[i];
          return null;
        }
        function resetChokePractice(message) {
          chokePracticeRef.current = makeChokePracticeState();
          if (message) frAnnounce(message);
          refreshChokePractice();
        }
        function startChokePractice(id) {
          var p = makeChokePracticeState(); p.caseId = id; p.phase = 'recognize';
          chokePracticeRef.current = p;
          frAnnounceUrgent(__alloT('stem.firstresponse.sr_decide_whether_this_is_a_mild_or_severe_airway_ob', 'Decide whether this is a mild or severe airway obstruction.'));
          refreshChokePractice();
        }
        function chokeMistake(code, message) {
          var p = chokePracticeRef.current;
          if (p.mistakes.indexOf(code) < 0) p.mistakes.push(code);
          frAnnounceUrgent(message); refreshChokePractice();
        }
        function chooseChokeSeverity(choice) {
          var p = chokePracticeRef.current; if (p.phase !== 'recognize') return;
          if (choice !== 'severe') return chokeMistake('severity', 'They cannot speak, breathe, or cough strongly: this is severe obstruction. Encourage coughing only when the cough is forceful.');
          p.sequence.push('recognize-severe'); p.phase = 'call'; frAnnounceUrgent(__alloT('stem.firstresponse.sr_severe_obstruction_activate_911_while_beginning_c', 'Severe obstruction. Activate 911 while beginning care.')); refreshChokePractice();
        }
        function callChoke911() {
          var p = chokePracticeRef.current; if (p.phase !== 'call') return;
          p.sequence.push('activate-911'); p.phase = 'back'; frAnnounceUrgent(__alloT('stem.firstresponse.sr_give_5_separate_back_blows', 'Give 5 separate back blows.')); refreshChokePractice();
        }
        function giveChokeBackBlow() {
          var p = chokePracticeRef.current; if (p.phase !== 'back') return;
          p.backBlows++;
          if (p.backBlows >= 5) { p.sequence.push('five-back-blows'); p.phase = 'placement'; frAnnounceUrgent(__alloT('stem.firstresponse.sr_choose_the_correct_thrust_placement', 'Choose the correct thrust placement.')); }
          else frAnnounce('Back blow ' + p.backBlows + ' of 5.');
          refreshChokePractice();
        }
        function chooseChokePlacement(choice) {
          var p = chokePracticeRef.current, k = chokePracticeCase(p.caseId); if (!k || p.phase !== 'placement') return;
          if (choice !== k.kind) {
            var msg = k.kind === 'infant' ? 'Never use abdominal thrusts on an infant. Use the heel of one hand on the breastbone.' : (k.kind === 'chest' ? 'In late pregnancy, use chest thrusts on the center of the breastbone.' : 'Place a fist just above the navel, not on the chest or ribs.');
            return chokeMistake('placement-' + choice, msg);
          }
          p.placementCorrect = true; p.sequence.push('correct-' + k.kind + '-placement'); p.phase = 'thrust';
          frAnnounceUrgent('Placement correct. Give 5 separate ' + k.thrust + 's.'); refreshChokePractice();
        }
        function giveChokeThrust() {
          var p = chokePracticeRef.current, k = chokePracticeCase(p.caseId); if (!k || p.phase !== 'thrust') return;
          p.thrusts++;
          if (p.thrusts >= 5) { p.sequence.push('five-thrusts'); p.phase = 'unresponsive'; frAnnounceUrgent(__alloT('stem.firstresponse.sr_they_become_unresponsive_choose_the_next_action', 'They become unresponsive. Choose the next action.')); }
          else frAnnounce(k.thrust + ' ' + p.thrusts + ' of 5.');
          refreshChokePractice();
        }
        function chooseChokeUnresponsive(choice) {
          var p = chokePracticeRef.current; if (p.phase !== 'unresponsive') return;
          if (choice !== 'cpr') return chokeMistake('blind-sweep', 'Do not blindly sweep the mouth. Lower safely and start CPR with compressions.');
          p.sequence.push('start-cpr-compressions'); p.phase = 'mouth';
          frAnnounceUrgent(__alloT('stem.firstresponse.sr_before_breaths_open_the_mouth_and_look_for_a_visi', 'Before breaths, open the mouth and look for a visible object.')); refreshChokePractice();
        }
        function finishChokePractice(choice) {
          var p = chokePracticeRef.current; if (p.phase !== 'mouth') return;
          if (choice !== 'visible') return chokeMistake('sweep-unseen', 'Remove an object only if visible. A blind finger sweep can push it deeper.');
          p.sequence.push('remove-visible-object-only'); p.phase = 'complete';
          p.summary = { caseId: p.caseId, mistakes: p.mistakes.length, sequence: p.sequence.slice(), completedAtISO: new Date().toISOString() };
          upd('chokePracticeBest', p.summary); awardBadge('choking_scenario_ready', 'Choking Scenario Practice');
          frAnnounceUrgent(__alloT('stem.firstresponse.sr_scenario_complete_continue_cpr_and_follow_dispatc', 'Scenario complete. Continue CPR and follow dispatcher or AED prompts until help arrives.')); refreshChokePractice();
        }
        function chokingPracticeVisual(k, p) {
          var infant = k && k.kind === 'infant';
          var action = p.phase === 'back' ? 'BACK BLOWS' : (p.phase === 'thrust' ? 'THRUSTS' : 'ASSESS AND ACT');
          var count = p.phase === 'back' ? p.backBlows : (p.phase === 'thrust' ? p.thrusts : 0), dots = [];
          for (var i = 0; i < 5; i++) dots.push(h('g', { key: i },
            h('circle', { cx: 150 + i * 35, cy: 204, r: 12, fill: i < count ? T.accent : T.card, stroke: i < count ? T.accent : T.border, strokeWidth: 2 }),
            h('text', { x: 150 + i * 35, y: 208, textAnchor: 'middle', fill: i < count ? '#fff' : T.muted, fontSize: 11 }, String(i + 1))));
          return h('svg', { viewBox: '0 0 440 230', role: 'img', 'aria-label': (k ? k.title : 'Choking practice') + '. ' + action + ', ' + count + ' of 5.',
            style: { width: '100%', maxHeight: 255, display: 'block', marginBottom: 10, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('rect', { x: 12, y: 12, width: 416, height: 206, rx: 12, fill: T.cardAlt }),
            infant ? h('g', { transform: 'rotate(-8 220 105)' },
              h('ellipse', { cx: 215, cy: 108, rx: 92, ry: 36, fill: T.card, stroke: T.border, strokeWidth: 3 }),
              h('circle', { cx: 118, cy: 101, r: 31, fill: '#d8a47f', stroke: T.border, strokeWidth: 3 }),
              h('path', { d: 'M142 113 Q215 145 298 112', fill: 'none', stroke: '#d8a47f', strokeWidth: 20, strokeLinecap: 'round' }),
              (p.phase === 'back' || p.phase === 'thrust') && h('path', { d: p.phase === 'back' ? 'M250 42 L220 78' : 'M205 58 L205 95', fill: 'none', stroke: T.danger, strokeWidth: 8, strokeLinecap: 'round' }))
              : h('g', null,
                h('circle', { cx: 220, cy: 48, r: 29, fill: '#d8a47f', stroke: T.border, strokeWidth: 3 }),
                h('path', { d: 'M176 90 Q220 70 264 90 L278 172 L162 172 Z', fill: T.card, stroke: T.border, strokeWidth: 3 }),
                h('line', { x1: 194, y1: 173, x2: 188, y2: 198, stroke: T.border, strokeWidth: 13, strokeLinecap: 'round' }),
                h('line', { x1: 246, y1: 173, x2: 252, y2: 198, stroke: T.border, strokeWidth: 13, strokeLinecap: 'round' }),
                (p.phase === 'back' || p.phase === 'thrust') && h('path', { d: p.phase === 'back' ? 'M302 76 L266 108' : (k.kind === 'chest' ? 'M304 109 L246 109' : 'M305 145 Q260 145 235 129'), fill: 'none', stroke: T.danger, strokeWidth: 8, strokeLinecap: 'round' })),
            h('text', { x: 220, y: 24, textAnchor: 'middle', fill: T.text, fontSize: 12, fontWeight: 700 }, action),
            (p.phase === 'back' || p.phase === 'thrust') ? dots : h('text', { x: 220, y: 211, textAnchor: 'middle', fill: T.muted, fontSize: 12 }, p.phase === 'complete' ? 'Continue care until advanced help arrives' : 'Follow the decision cue below'));
        }
        function chokingPractice() {
          var p = chokePracticeRef.current, k = chokePracticeCase(p.caseId);
          var phaseNames = { recognize: 'RECOGNIZE', call: 'ACTIVATE HELP', back: '5 BACK BLOWS', placement: 'CHOOSE PLACEMENT', thrust: '5 THRUSTS', unresponsive: 'BECOMES UNRESPONSIVE', mouth: 'CPR AIRWAY CHECK', complete: 'SCENARIO COMPLETE' };
          function choice(label, fn, primary) { return h('button', { 'data-fr-focusable': true, onClick: fn, style: (primary ? btnPrimary : btn)({ width: '100%', textAlign: 'left', marginBottom: 7 }) }, label); }
          if (!k) return h('div', { 'data-choke-practice': 'select' },
            h('h3', { style: { margin: '0 0 6px', fontSize: 16, color: T.text } }, 'Interactive choking practice'),
            h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: T.muted, lineHeight: 1.6 } }, 'Practice recognition, the age/body-specific 5-and-5 sequence, placement, and transition to CPR.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 9 } }, CHOKE_PRACTICE_CASES.map(function (item) {
              return h('button', { key: item.id, onClick: function () { startChokePractice(item.id); }, 'aria-label': 'Start choking scenario: ' + item.title, style: btn({ width: '100%', minHeight: 112, textAlign: 'left', padding: 13 }) },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: T.accent, marginBottom: 5 } }, item.tag),
                h('div', { style: { fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 4 } }, item.title),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.5 } }, item.scene)); })),
            d.chokePracticeBest && h('div', { style: { marginTop: 10, fontSize: 11.5, color: T.dim } }, 'Previous: ' + d.chokePracticeBest.sequence.length + ' safe actions, ' + d.chokePracticeBest.mistakes + ' mistake(s).'));
          var correctPlace = k.kind === 'infant' ? 'Heel of one hand on the breastbone' : (k.kind === 'chest' ? 'Fist on the center of the breastbone' : 'Fist just above the navel');
          return h('div', { 'data-choke-practice': p.phase },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
              h('div', null, h('div', { style: { fontSize: 11, fontWeight: 800, color: T.dim } }, phaseNames[p.phase]), h('h3', { style: { margin: '2px 0 0', fontSize: 16, color: T.text } }, k.title)),
              h('button', { onClick: function () { resetChokePractice('Choking practice reset.'); }, style: btn({ padding: '5px 9px', fontSize: 11 }) }, 'Change scenario')),
            h('p', { style: { margin: '0 0 8px', fontSize: 12.5, color: T.muted } }, k.scene),
            h('div', { role: 'note', style: { padding: 9, borderRadius: 8, border: '1px solid ' + T.warn, background: T.cardAlt, fontSize: 11.5, color: T.text, lineHeight: 1.5, marginBottom: 9 } }, h('strong', { style: { color: T.warn } }, 'Training boundary: '), 'This screen rehearses decisions, order, placement concepts, and counting. It cannot assess real force, hand position, body support, or skill quality. Use an instructor-led course for hands-on practice.'),
            chokingPracticeVisual(k, p),
            h('div', { role: 'status', 'aria-live': 'polite', style: { padding: 9, borderRadius: 8, background: T.card, border: '1px solid ' + T.border, fontSize: 12, color: T.text, marginBottom: 9 } }, (phaseNames[p.phase] || 'PRACTICE') + ' - Back blows ' + p.backBlows + '/5 - Thrusts ' + p.thrusts + '/5 - Mistakes ' + p.mistakes.length),
            p.phase === 'recognize' && h('div', null, choice('Severe obstruction - activate 911 and begin care', function () { chooseChokeSeverity('severe'); }, true), choice('Encourage coughing and observe', function () { chooseChokeSeverity('mild'); }, false)),
            p.phase === 'call' && choice('Send someone to call 911, or call on speaker, while beginning care', callChoke911, true),
            p.phase === 'back' && choice('Give back blow ' + (p.backBlows + 1) + ' of 5', giveChokeBackBlow, true),
            p.phase === 'placement' && h('div', null, choice(correctPlace, function () { chooseChokePlacement(k.kind); }, true), choice(k.kind === 'infant' ? 'Two fingers on the breastbone' : 'Hands around the throat', function () { chooseChokePlacement('wrong'); }, false), choice(k.kind === 'abdomen' ? 'Fist on the center of the breastbone' : 'Fist on the abdomen', function () { chooseChokePlacement(k.kind === 'abdomen' ? 'chest' : 'abdomen'); }, false)),
            p.phase === 'thrust' && h('div', null, h('p', { style: { margin: '0 0 7px', fontSize: 12, color: T.muted } }, k.placement), choice('Give ' + k.thrust + ' ' + (p.thrusts + 1) + ' of 5', giveChokeThrust, true)),
            p.phase === 'unresponsive' && h('div', null, choice('Lower safely, activate 911 if needed, and start CPR with compressions', function () { chooseChokeUnresponsive('cpr'); }, true), choice('Reach into the mouth and sweep for the object', function () { chooseChokeUnresponsive('sweep'); }, false)),
            p.phase === 'mouth' && h('div', null, choice('Before breaths, look in the mouth; remove the object only if visible', function () { finishChokePractice('visible'); }, true), choice('Sweep the mouth even when no object is visible', function () { finishChokePractice('blind'); }, false)),
            p.phase === 'complete' && h('div', null,
              h('div', { style: { padding: 12, borderRadius: 9, background: T.card, border: '1px solid ' + T.ok, marginBottom: 9, fontSize: 12.5, lineHeight: 1.6 } }, h('strong', { style: { color: T.ok } }, p.mistakes.length ? 'Complete - review feedback and retry. ' : 'Complete with no recorded mistakes. '), 'You activated help, completed 5 back blows plus 5 ' + k.thrust + 's, then transitioned to CPR and a visible-object-only check.'),
              choice('Practice this case again', function () { startChokePractice(k.id); }, true), choice('Choose another case', function () { resetChokePractice('Choose another choking scenario.'); }, false)));
        }
        function chokeSelect() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.firstresponse.who_is_choking', '😬 Who is choking?')),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                __alloT('stem.firstresponse.the_right_technique_depends_on_who_pic', 'The right technique depends on who. Pick one to see the protocol.')),
              h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                WHO.map(function(w) {
                  var active = who === w.id;
                  return h('div', { key: w.id, role: 'listitem' }, h('button', { 'data-fr-focusable': true,
                    'aria-pressed': active ? 'true' : 'false',
                    onClick: function() {
                      updMulti({ chokeWho: w.id, chokeView: 'protocol' });
                      frAnnounce(w.label);
                    },
                    style: btn({
                      padding: '12px 14px', fontSize: 13,
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: active ? '#1e3a8a' : T.cardAlt,
                      color: active ? '#dbeafe' : T.text,
                      borderColor: active ? '#1e40af' : T.border
                    })
                  },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, w.icon),
                    h('span', null, w.label)
                  ));
                })
              )
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, 'Universal: '),
              __alloT('stem.firstresponse.if_the_person_is_coughing_forcefully', 'if the person is coughing forcefully, '),
              h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.don_t_intervene', 'don’t intervene')),
              __alloT('stem.firstresponse.let_them_cough_step_in_only_when_they', ' — let them cough. Step in only when they '),
              h('em', null, 'can’t'),
              __alloT('stem.firstresponse.cough_can_t_speak_or_can_t_breathe', ' cough, can’t speak, or can’t breathe.'))
          );
        }

        function chokeProtocol() {
          var p = who ? PROTOCOLS[who] : null;
          if (!p) return chokeSelect();
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 16, color: T.text } }, p.title),
              h('div', { style: { padding: 10, borderRadius: 8, background: '#7f1d1d', border: '1px solid #dc2626', color: '#fde2e2', fontSize: 12, marginBottom: 10 } },
                h('strong', null, 'Recognize: '), p.recognize),
              h('ol', { style: { margin: '0 0 0 18px', padding: 0, color: T.text, fontSize: 13, lineHeight: 1.7 } },
                p.steps.map(function(s, i) { return h('li', { key: i, style: { marginBottom: 4 } }, s); })
              ),
              h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted } },
                h('strong', { style: { color: T.text } }, 'After: '), p.after),
              h('div', { style: { marginTop: 6, fontSize: 10, color: T.dim, fontStyle: 'italic' } }, 'Source: ', p.source)
            ),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.pick_a_different_person', 'Pick a different person'),
                onClick: function() { upd('chokeView', 'select'); frAnnounce(__alloT('stem.firstresponse.sr_pick_someone_else', 'Pick someone else')); },
                style: btn()
              }, __alloT('stem.firstresponse.pick_someone_else', '← Pick someone else')),
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.mark_choking_module_complete', 'Mark choking module complete'),
                onClick: function() { awardBadge('choking_responder', 'Choking Responder (knows all 5 cases)'); },
                style: btnPrimary()
              }, __alloT('stem.firstresponse.got_it', '✓ Got it'))
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('😬 Choking'),
          emergencyBanner(),
          h('div', { role: 'tablist', 'aria-label': __alloT('stem.firstresponse.choking_module_sections', 'Choking module sections'),
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('select', 'Pick who'),

            tabBtn('practice', 'Interactive practice'),
            tabBtn('protocol', 'Protocol')
          ),
          h('div', { role: 'tabpanel',
            id: 'firstresponse-choking-panel-' + chokeView,
            'aria-labelledby': 'firstresponse-choking-tab-' + chokeView,
            tabIndex: 0
          },
            chokeView === 'select' && chokeSelect(),

            chokeView === 'practice' && chokingPractice(),
            chokeView === 'protocol' && chokeProtocol(),
            disclaimerFooter()
          )
        );
      }

      // ─────────────────────────────────────────
      // DISABILITY-AWARE module — the differentiator (Lane C content)
      // 6 sections, each cites a community-led org. Explicitly avoids Autism
      // Speaks; uses ASAN (autisticadvocacy.org) instead. Person-first vs
      // identity-first language follows community preference per condition:
      // autism = identity-first (autistic person), deafness = mixed (Deaf person
      // for cultural Deafness, deaf or HoH for medical), epilepsy = "person with
      // epilepsy" generally though community preference varies.
      // ─────────────────────────────────────────
      function renderDisabilityAware() {
        var daSection = d.daSection || 'overview';
        var DISABILITY_TAB_IDS = ['overview', 'deaf', 'autism', 'seizure', 'diabetes', 'hidden', 'self'];
        function disabilityTabKeyDown(e, index) {
          var key = e.key;
          if (key !== 'ArrowRight' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return;
          e.preventDefault();
          var nextIndex = index;
          if (key === 'ArrowRight' || key === 'ArrowDown') nextIndex = (index + 1) % DISABILITY_TAB_IDS.length;
          if (key === 'ArrowLeft' || key === 'ArrowUp') nextIndex = (index - 1 + DISABILITY_TAB_IDS.length) % DISABILITY_TAB_IDS.length;
          if (key === 'Home') nextIndex = 0;
          if (key === 'End') nextIndex = DISABILITY_TAB_IDS.length - 1;
          var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
          var nextTab = tabs[nextIndex];
          if (nextTab) { nextTab.focus(); nextTab.click(); }
        }

        function tabBtn(id, label) {
          var active = daSection === id;
          return h('button', { 'data-fr-focusable': true, key: id, role: 'tab',
            id: 'firstresponse-disability-tab-' + id,
            'aria-controls': 'firstresponse-disability-panel-' + id,
            'aria-selected': active ? 'true' : 'false',
            tabIndex: active ? 0 : -1,
            onKeyDown: function(e) { disabilityTabKeyDown(e, DISABILITY_TAB_IDS.indexOf(id)); },
            onClick: function() { upd('daSection', id); frAnnounce(label); },
            style: btn({
              padding: '6px 10px', fontSize: 11,
              background: active ? T.accent : T.card,
              color: active ? '#fff' : T.text,
              borderColor: active ? T.accent : T.border
            })
          }, label);
        }

        function card(title, items, source, sourceUrl) {
          return h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, title),
            h('ul', { style: { margin: '0 0 8px 18px', padding: 0, color: T.muted, fontSize: 13, lineHeight: 1.7 } },
              items.map(function(item, i) { return h('li', { key: i, style: { marginBottom: 4 } }, item); })
            ),
            source && h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic' } },
              'Source: ',
              sourceUrl
                ? h('a', { href: sourceUrl, target: '_blank', rel: 'noopener', style: { color: T.link, textDecoration: 'underline' } }, source)
                : source)
          );
        }

        function daOverview() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: '#1e3a8a', border: '1px solid #1e40af', marginBottom: 14, color: '#dbeafe' } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15 } }, __alloT('stem.firstresponse.why_this_module_exists', '♾️ Why this module exists')),
              h('p', { style: { margin: '0 0 8px', fontSize: 13, lineHeight: 1.55 } },
                __alloT('stem.firstresponse.most_first_aid_courses_don_t_cover_thi', 'Most first-aid courses don’t cover this: how disability shapes both '),
                h('strong', null, 'recognition'),
                __alloT('stem.firstresponse.a_peer_s_seizure_isn_t_weird_behavior_', ' (a peer’s seizure isn’t "weird behavior" — it’s a medical event) and '),
                h('strong', null, 'response'),
                __alloT('stem.firstresponse.you_can_t_shout_instructions_to_a_deaf', ' (you can’t shout instructions to a Deaf patient).')),
              h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55 } },
                __alloT('stem.firstresponse.this_module_pulls_from_community_led_o', 'This module pulls from community-led orgs — '),
                h('a', { href: 'https://autisticadvocacy.org', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, 'ASAN'),
                ', ',
                h('a', { href: 'https://www.epilepsy.com', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, __alloT('stem.firstresponse.epilepsy_foundation', 'Epilepsy Foundation')),
                ', ',
                h('a', { href: 'https://www.hearingloss.org', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, 'HLAA'),
                ', ',
                h('a', { href: 'https://www.diabetes.org', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, 'ADA'),
                __alloT('stem.firstresponse.where_community_preference_is_mixed_e_', '. Where community preference is mixed (e.g. person-first vs identity-first language), this module follows the most common preference and notes it.'))
            ),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              __alloT('stem.firstresponse.pick_a_section_above_each_section_is_s', 'Pick a section above. Each section is short — these are the things most adults don’t know either.'))
          );
        }

        function daDeaf() {
          return card('👂 Communicating with a deaf or hard-of-hearing patient', [
            h('span', null, h('strong', null, __alloT('stem.firstresponse.get_their_attention_visually', 'Get their attention visually: ')), __alloT('stem.firstresponse.wave_in_their_line_of_sight_tap_their_', 'wave in their line of sight, tap their shoulder. Don’t grab. Don’t shout — louder doesn’t help.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.face_them_directly', 'Face them directly')), __alloT('stem.firstresponse.so_they_can_see_your_mouth_and_express', ' so they can see your mouth and expressions. Good lighting on your face. Don’t cover your mouth.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.use_the_phone_s_notes_app', 'Use the phone’s notes app')), __alloT('stem.firstresponse.to_type_questions_most_teens_already_d', ' to type questions. Most teens already do this.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.text_to_911_is_the_right_call', 'Text-to-911 is the right call')), __alloT('stem.firstresponse.maine_has_it_don_t_call_for_them_on_a_', ' — Maine has it. Don’t call FOR them on a voice line if they want to text themselves.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.don_t_assume_asl', 'Don’t assume ASL')), __alloT('stem.firstresponse.many_late_deafened_or_hoh_people_don_t', ' — many late-deafened or HoH people don’t sign. Ask their preferred way to communicate.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.in_a_real_emergency', 'In a real emergency')), __alloT('stem.firstresponse.simple_gestures_writing_key_words_ambu', ', simple gestures + writing key words ("AMBULANCE COMING", "WHERE HURT?") often work faster than typing full sentences.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.aeds_talk_show', 'AEDs talk + show')), __alloT('stem.firstresponse.modern_aeds_display_visual_prompts_on_', ' — modern AEDs display visual prompts on a screen for the rescuer. Use one even if no one in the room can hear the voice prompts.'))
          ], 'Hearing Loss Association of America (hearingloss.org)', 'https://www.hearingloss.org');
        }

        function daAutism() {
          return h('div', null,
            card('♾️ Supporting an autistic peer in distress', [
              h('span', null, h('strong', null, __alloT('stem.firstresponse.lower_the_sensory_load', 'Lower the sensory load: ')), __alloT('stem.firstresponse.lights_down_if_you_can_fewer_voices_fe', 'lights down if you can, fewer voices, fewer hands. A crowd of helpers can make a meltdown worse.')),
              h('span', null, h('strong', null, __alloT('stem.firstresponse.predictable_verbal_warnings', 'Predictable verbal warnings: ')), __alloT('stem.firstresponse.i_m_going_to_touch_your_wrist_now_befo', '"I’m going to touch your wrist now" before you do. Touch without warning can escalate panic.')),
              h('span', null, h('strong', null, __alloT('stem.firstresponse.short_literal_sentences', 'Short, literal sentences. ')), __alloT('stem.firstresponse.avoid_figures_of_speech_sit_down_is_cl', 'Avoid figures of speech. "Sit down" is clearer than "take a load off."')),
              h('span', null, h('strong', null, __alloT('stem.firstresponse.allow_stims', 'Allow stims')), __alloT('stem.firstresponse.rocking_hand_flapping_repeating_words_', ' (rocking, hand-flapping, repeating words) — they’re self-regulation, NOT a symptom of the emergency.')),
              h('span', null, h('strong', null, __alloT('stem.firstresponse.meltdown_tantrum', 'Meltdown ≠ tantrum.')), __alloT('stem.firstresponse.a_meltdown_is_involuntary_nervous_syst', ' A meltdown is involuntary nervous-system overload. Don’t threaten consequences. Reduce input and wait.')),
              h('span', null, h('strong', null, __alloT('stem.firstresponse.look_for_a_comm_card_aac_device_script', 'Look for a comm card / AAC device / scripted phrases')), __alloT('stem.firstresponse.the_person_may_use_many_autistic_peopl', ' the person may use. Many autistic people carry a card explaining their communication needs.')),
              h('span', null, h('strong', null, __alloT('stem.firstresponse.don_t_mistake_autism_for_the_medical_e', 'Don’t mistake autism for the medical emergency. ')), __alloT('stem.firstresponse.a_non_speaking_autistic_peer_may_be_ha', 'A non-speaking autistic peer may be having a seizure or a panic attack — recognize THAT separately.'))
            ], 'Autistic Self Advocacy Network (autisticadvocacy.org)', 'https://autisticadvocacy.org'),
            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border, fontSize: 11, color: T.dim, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, 'Note: '),
              __alloT('stem.firstresponse.this_module_uses_identity_first_langua', 'this module uses identity-first language ("autistic person") because that is the majority preference in autistic-led communities. Some people and families prefer "person with autism." If you know someone’s preference, use it.'))
          );
        }

        function daSeizure() {
          return card('⚡ Seizure first aid as epilepsy advocacy', [
            h('span', null, h('strong', null, __alloT('stem.firstresponse.a_peer_having_a_seizure_is_having_a_me', 'A peer having a seizure is having a medical event')), __alloT('stem.firstresponse.not_acting_weird_recognizing_it_as_epi', ' — not "acting weird." Recognizing it as epilepsy (or another seizure cause) is the first thing.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.time_the_seizure', 'TIME the seizure')), __alloT('stem.firstresponse.from_when_it_starts_most_last_under_2_', ' from when it starts. Most last under 2 minutes.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.move_sharp_things_away', 'Move sharp things AWAY')), __alloT('stem.firstresponse.chairs_desks_glasses_don_t_move_the_pe', ' — chairs, desks, glasses. Don’t move the person unless they’re in immediate danger (water, road, fire).')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.cushion_the_head', 'Cushion the head ')), __alloT('stem.firstresponse.jacket_backpack_loosen_anything_around', '(jacket, backpack). Loosen anything around the neck.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.do_not_restrain', 'DO NOT restrain')), __alloT('stem.firstresponse.never_hold_them_down_or_try_to_stop_th', ' — never hold them down or try to stop the movements.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.do_not_put_anything_in_their_mouth', 'DO NOT put anything in their mouth')), __alloT('stem.firstresponse.old_myth_they_cannot_swallow_their_ton', ' — old myth. They cannot swallow their tongue.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.after_recovery_position', 'After: recovery position')), __alloT('stem.firstresponse.on_their_side_so_saliva_can_drain_they', ' (on their side) so saliva can drain. They may be confused for several minutes — that’s normal. Stay with them.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.call_911_if', 'Call 911 if: ')), __alloT('stem.firstresponse.seizure_is_over_5_minutes_repeats_with', 'seizure is over 5 minutes, repeats without recovery in between, first-ever, in water, follows a head injury, or person is pregnant/diabetic/not breathing after.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.privacy_after', 'Privacy after: ')), __alloT('stem.firstresponse.a_post_ictal_person_may_be_embarrassed', 'a post-ictal person may be embarrassed. Clear gawkers. They get to choose what to share with classmates.'))
          ], 'Epilepsy Foundation (epilepsy.com)', 'https://www.epilepsy.com/recognition');
        }

        function daDiabetes() {
          return card('🩺 Diabetic emergency — low vs high blood sugar', [
            h('span', null, h('strong', null, __alloT('stem.firstresponse.low_blood_sugar_hypoglycemia', 'Low blood sugar (hypoglycemia) ')), __alloT('stem.firstresponse.in_a_teen_often_looks_like', 'in a teen often looks like '),
              h('em', null, __alloT('stem.firstresponse.behavior_change', 'behavior change')),
              __alloT('stem.firstresponse.irritable_confused_off_shaky_sweaty_su', ' — irritable, confused, "off," shaky, sweaty, suddenly clumsy. Easy to mistake for being drunk or having an attitude.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.if_they_can_swallow_safely', 'If they CAN swallow safely: ')),
              __alloT('stem.firstresponse.15g_fast_carb_juice_box_regular_soda_g', '15g fast carb — juice box, regular soda, glucose tab, a tablespoon of honey. Recheck in 15 minutes. Repeat if still low.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.if_they_cannot_swallow_safely_slurring', 'If they CANNOT swallow safely (slurring, confused, semi-conscious): ')),
              __alloT('stem.firstresponse.do_not_give_food_or_liquid_choking_ris', 'do NOT give food or liquid — choking risk. Glucagon if available. Call 911. Recovery position.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.if_unconscious', 'If unconscious: ')),
              __alloT('stem.firstresponse.911_immediately_recovery_position_neve', '911 immediately. Recovery position. NEVER pour juice into the mouth of an unconscious person.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.high_blood_sugar_hyperglycemia_dka', 'High blood sugar (hyperglycemia / DKA) ')),
              __alloT('stem.firstresponse.in_a_peer_with_diabetes_extreme_thirst', 'in a peer with diabetes: extreme thirst, peeing constantly, fruity-acetone breath, deep rapid breathing, nausea/vomiting, confusion. '),
              h('strong', null, __alloT('stem.firstresponse.this_is_also_a_911_emergency', 'This is also a 911 emergency.')),
              __alloT('stem.firstresponse.don_t_give_insulin_unless_they_are_man', ' Don’t give insulin unless they are managing it themselves and you’re just supporting.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.behavior_changes_in_a_peer_you_know_ha', 'Behavior changes in a peer you know has diabetes ')),
              __alloT('stem.firstresponse.assume_blood_sugar_first_attitude_seco', '— assume blood sugar first, attitude second. Ask "Have you checked? Can I get you juice?"'))
          ], 'American Diabetes Association (diabetes.org)', 'https://www.diabetes.org');
        }

        function daHidden() {
          return card('👁️ Hidden disabilities + disclosure rights', [
            h('span', null, h('strong', null, __alloT('stem.firstresponse.you_can_t_see_most_disabilities', 'You can’t see most disabilities')), __alloT('stem.firstresponse.chronic_illness_cardiac_conditions_epi', ' — chronic illness, cardiac conditions, epilepsy, allergies, mental health, autism, ADHD, learning differences. A peer who looks "fine" may have a condition that matters in an emergency.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.look_for_medical_id_jewelry', 'Look for medical ID jewelry')), __alloT('stem.firstresponse.bracelet_necklace_dog_tag_watch_sticke', ' (bracelet, necklace, dog tag, watch sticker, card in wallet). It often lists condition + emergency contact + critical med.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.phone_medical_id', 'Phone medical ID: ')),
              __alloT('stem.firstresponse.iphones_and_androids_both_have_a_medic', 'iPhones and Androids both have a medical ID screen accessible from the lock screen — emergency responders can view condition + meds + emergency contacts without unlocking the phone. Look for "Emergency" or "SOS" on the lock screen.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.disclosure_is_their_choice', 'Disclosure is THEIR choice. ')),
              __alloT('stem.firstresponse.don_t_tell_other_classmates_teachers_r', 'Don’t tell other classmates / teachers / random adults a peer has a condition unless it’s necessary to keep them safe RIGHT NOW. To EMS, yes. To the lunchroom, no.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.ask_don_t_assume', 'Ask, don’t assume: ')),
              __alloT('stem.firstresponse.is_there_anything_i_should_know_to_hel', '"Is there anything I should know to help you?" gives them the chance to tell you if they want to. "Are you OK? You look weird" doesn’t.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.service_dogs_are_working', 'Service dogs are working: ')),
              __alloT('stem.firstresponse.don_t_pet_distract_or_call_to_them_the', 'don’t pet, distract, or call to them. The handler is the only person who interacts with them in an emergency.'))
          ], 'NAMI + American Diabetes Association', 'https://www.nami.org');
        }

        function daSelf() {
          return card('🤝 If YOU have a disability and want to help', [
            h('span', null, h('strong', null, __alloT('stem.firstresponse.you_can_do_cpr_with_a_limb_difference', 'You can do CPR with a limb difference')), __alloT('stem.firstresponse.depth_and_rate_matter_most_you_can_use', ' — depth and rate matter most. You can use your hand differently, use your forearm, or partner up so someone else does compressions while you coach (you know the rate).')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.you_can_do_cpr_with_low_muscle_tone_or', 'You can do CPR with low muscle tone or fatigue: ')),
              __alloT('stem.firstresponse.partner_up_switch_every_2_minutes_anyw', 'partner up. Switch every 2 minutes anyway — even adults without disabilities tire fast. The AHA recommends compressors swap every 2 minutes.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.you_can_call_911_if_you_can_t_speak', 'You can call 911 if you can’t speak: ')),
              __alloT('stem.firstresponse.use_text_to_911_maine_has_it_you_can_l', 'use text-to-911 (Maine has it). You can leave a voice line open even silent — dispatchers can locate the call.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.you_can_lead', 'You can lead')), __alloT('stem.firstresponse.even_if_you_can_t_do_compressions_assi', ' even if you can’t do compressions: assign tasks ("YOU call 911. YOU run for the AED in the gym. YOU clear people back."). Calm direction is real first aid.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.sensory_overload_during_the_emergency', 'Sensory overload during the emergency? ')),
              __alloT('stem.firstresponse.step_back_hands_over_ears_find_a_quiet', 'Step back, hands over ears, find a quieter spot. You don’t have to be the closest helper to be a helpful one. Coaching others through the protocol is a real role.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.practice_ahead', 'Practice ahead. ')),
              __alloT('stem.firstresponse.knowing_what_you_would_do_your_specifi', 'Knowing what you would do — your specific role, given what your body does — turns a freeze into a plan. That’s what this lab is for.'))
          ], 'Synthesizes ASAN + AHA + Hartford Consensus guidance', null);
        }

        return h('div', { style: { padding: 20, maxWidth: 920, margin: '0 auto', color: T.text } },
          backBar('♾️ Disability-aware response'),
          emergencyBanner(),
          h('div', { role: 'tablist', 'aria-label': __alloT('stem.firstresponse.disability_aware_sections', 'Disability-aware sections'),
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('overview', 'Why'),
            tabBtn('deaf', 'Deaf / HoH'),
            tabBtn('autism', 'Autistic peer'),
            tabBtn('seizure', 'Seizure / epilepsy'),
            tabBtn('diabetes', 'Diabetic emergency'),
            tabBtn('hidden', 'Hidden disabilities'),
            tabBtn('self', 'You as helper')
          ),
          h('div', { role: 'tabpanel',
            id: 'firstresponse-disability-panel-' + daSection,
            'aria-labelledby': 'firstresponse-disability-tab-' + daSection,
            tabIndex: 0
          },
            daSection === 'overview' && daOverview(),
            daSection === 'deaf' && daDeaf(),
            daSection === 'autism' && daAutism(),
            daSection === 'seizure' && daSeizure(),
            daSection === 'diabetes' && daDiabetes(),
            daSection === 'hidden' && daHidden(),
            daSection === 'self' && daSelf(),
          ),
          h('div', { style: { marginTop: 12, textAlign: 'right' } },
            h('button', { 'data-fr-focusable': true,
              'aria-label': __alloT('stem.firstresponse.mark_disability_aware_module_complete', 'Mark disability-aware module complete'),
              onClick: function() { awardBadge('da_responder', 'Disability-Aware Responder'); },
              style: btnPrimary({ padding: '8px 14px', fontSize: 13 })
            }, __alloT('stem.firstresponse.i_ve_read_this_module', '✓ I’ve read this module'))
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // SCENARIO module — multi-step branching simulations
      // Guided decisions preserve the first response separately from corrections.
      // Answer positions vary by step and attempt; progress requires a safe choice.
      // The mental-health scenario carries a content warning + opt-out.
      // ─────────────────────────────────────────
      var SCENARIOS = [
        { id: 'cafeteria', icon: '🍎', title: __alloT('stem.firstresponse.cafeteria_collapse', 'Cafeteria collapse'),
          setup: 'Lunchtime. A student two tables over suddenly slumps forward, then slides off the bench onto the floor. They are not moving. People around them are screaming. You’re the closest peer who has First Response Lab training.',
          steps: [
            { situation: __alloT('stem.firstresponse.sim_cafeteria_assess', 'The area is safe. You reach them first. What do you check?'),
              choices: [
                { text: __alloT('stem.firstresponse.sim_cafeteria_check', 'Shout, tap their shoulder, and check responsiveness and normal breathing for no more than 10 seconds.'), impact: 'help', feedback: __alloT('stem.firstresponse.sim_cafeteria_check_why', 'Check quickly. If they are unresponsive and not breathing normally, activate emergency help and start CPR.'), source: 'AHA BLS' },
                { text: __alloT('stem.firstresponse.start_chest_compressions_immediately', 'Start chest compressions immediately.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.sim_cafeteria_assess_why', 'First check responsiveness and breathing quickly. Once cardiac arrest is suspected, do not delay CPR because you fear causing injury.'), source: 'AHA BLS' },
                { text: __alloT('stem.firstresponse.run_to_get_a_teacher', 'Run to get a teacher.'), impact: 'neutral', feedback: __alloT('stem.firstresponse.a_teacher_is_needed_soon_but_leaving_t', 'A teacher is needed soon, but leaving the patient alone wastes the most critical seconds. Send someone else.'), source: 'AHA BLS' }
              ] },
            { situation: 'No response. They’re not breathing normally. Three other students are standing nearby looking at their phones.',
              choices: [
                { text: __alloT('stem.firstresponse.yell_you_call_911_you_go_to_the_front_', 'Yell "YOU — call 911. YOU — go to the front office for the AED. NOW."'), impact: 'help', feedback: __alloT('stem.firstresponse.pointing_at_specific_people_works_diff', 'Pointing at specific people works — diffuse responsibility freezes a crowd. Now you can focus on the patient.'), source: 'Hartford Consensus / bystander effect research' },
                { text: __alloT('stem.firstresponse.yell_someone_call_911_and_start_cpr', 'Yell "Someone call 911!" and start CPR.'), impact: 'neutral', feedback: __alloT('stem.firstresponse.better_than_nothing_but_someone_often_', 'Better than nothing, but "someone" often means no one. Pointing at a specific person fixes that.'), source: 'Hartford Consensus' },
                { text: __alloT('stem.firstresponse.pull_out_your_phone_and_call_911_yours', 'Pull out your phone and call 911 yourself while standing up.'), impact: 'neutral', feedback: __alloT('stem.firstresponse.sim_cafeteria_call_why', 'Calling is essential. Use speakerphone so CPR can begin promptly, or assign a specific helper to call while you start care.'), source: 'AHA BLS' }
              ] },
            { situation: 'You begin CPR. What rate?',
              choices: [
                { text: __alloT('stem.firstresponse.100_120_compressions_per_minute_about_', '100–120 compressions per minute, about the pace of "Stayin’ Alive."'), impact: 'help', feedback: __alloT('stem.firstresponse.exactly_right_push_hard_2_inches_deep_', 'Exactly right. Push hard (2 inches deep on an adult), let the chest fully recoil between pushes.'), source: 'AHA 2025 Guidelines' },
                { text: __alloT('stem.firstresponse.as_fast_as_you_can_speed_saves_lives', 'As fast as you can — speed saves lives.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.too_fast_120_bpm_means_shallow_compres', 'Too fast (>120 bpm) means shallow compressions and not enough time for the heart to refill between pushes. Aim for 100–120.'), source: 'AHA 2025 Guidelines' },
                { text: __alloT('stem.firstresponse.slow_and_steady_about_60_per_minute', 'Slow and steady, about 60 per minute.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.too_slow_the_heart_needs_100_120_pushe', 'Too slow. The heart needs ~100–120 pushes per minute to circulate blood enough to keep the brain alive.'), source: 'AHA 2025 Guidelines' }
              ] },
            { situation: 'The AED arrives. The student you sent says "I’ve never used one." What do you tell them?',
              choices: [
                { text: __alloT('stem.firstresponse.turn_it_on_it_will_talk_you_through_it', '"Turn it on. It will talk you through it. Listen and do exactly what it says."'), impact: 'help', feedback: __alloT('stem.firstresponse.aeds_are_designed_for_untrained_users_', 'AEDs are designed for untrained users. Voice prompts (and visual prompts on most models) lead you through every step.'), source: 'AHA / Red Cross AED training' },
                { text: __alloT('stem.firstresponse.wait_until_i_m_done_with_compressions_', '"Wait until I’m done with compressions, then I’ll do it."'), impact: 'hurt', feedback: __alloT('stem.firstresponse.every_second_without_an_aed_on_a_shock', 'Every second without an AED on a shockable rhythm reduces survival. Have them set it up while you keep compressing.'), source: 'AHA Chain of Survival' },
                { text: __alloT('stem.firstresponse.forget_it_just_keep_doing_cpr', '"Forget it, just keep doing CPR."'), impact: 'hurt', feedback: __alloT('stem.firstresponse.cpr_alone_has_much_lower_survival_than', 'CPR alone has much lower survival than CPR + AED. Even an untrained person can run an AED — it talks them through it.'), source: 'AHA Chain of Survival' }
              ] }
          ] },
        { id: 'hallway', icon: '🥪', title: __alloT('stem.firstresponse.hallway_choking', 'Hallway choking'),
          setup: 'Between classes, a friend takes a big bite of a sandwich and starts panicking. Their hands are at their throat. They’re not making noise. Their face is turning red.',
          steps: [
            { situation: 'What is the FIRST thing to confirm?',
              choices: [
                { text: __alloT('stem.firstresponse.ask_are_you_choking_watch_for_a_nod_or', 'Ask: "Are you choking?" Watch for a nod or thumbs-up.'), impact: 'help', feedback: __alloT('stem.firstresponse.the_universal_sign_is_hands_at_the_thr', 'The universal sign is hands at the throat with no sound. Confirming gives them a chance to cough first if they still can.'), source: 'Red Cross First Aid' },
                { text: __alloT('stem.firstresponse.slap_them_hard_on_the_back_right_away', 'Slap them hard on the back right away.'), impact: 'neutral', feedback: __alloT('stem.firstresponse.back_blows_are_part_of_the_protocol_bu', 'Back blows ARE part of the protocol, but confirm they can’t cough first. If they’re coughing forcefully, let them cough.'), source: 'Red Cross First Aid' },
                { text: __alloT('stem.firstresponse.get_them_to_drink_water_immediately', 'Get them to drink water immediately.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.don_t_give_a_choking_person_water_it_c', 'Don’t give a choking person water — it can go down the wrong way too. Don’t give anything by mouth.'), source: 'Red Cross First Aid' }
              ] },
            { situation: __alloT('stem.firstresponse.sim_hallway_call', 'They nod yes and cannot cough or breathe. You send a nearby peer to call 911 and get an adult. What care do you begin?'),
              choices: [
                { text: __alloT('stem.firstresponse.5_back_blows_between_the_shoulder_blad', '5 back blows between the shoulder blades, then 5 abdominal thrusts. Repeat.'), impact: 'help', feedback: __alloT('stem.firstresponse.correct_sequence_lean_them_forward_hee', 'Correct sequence. Lean them forward, heel of your hand between the shoulder blades.'), source: 'Red Cross First Aid' },
                { text: __alloT('stem.firstresponse.5_abdominal_thrusts_only', '5 abdominal thrusts only.'), impact: 'neutral', feedback: __alloT('stem.firstresponse.abdominal_thrusts_work_but_pairing_the', 'Abdominal thrusts work but pairing them with back blows is more effective. The current Red Cross protocol is 5 back blows + 5 thrusts.'), source: 'Red Cross First Aid' },
                { text: __alloT('stem.firstresponse.have_them_lie_down_on_their_back_so_yo', 'Have them lie down on their back so you can do CPR.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.cpr_is_for_unconscious_patients_while_', 'CPR is for unconscious patients. While they’re still conscious, do back blows + thrusts.'), source: 'Red Cross First Aid' }
              ] },
            { situation: 'After two cycles, they go limp and fall to the floor.',
              choices: [
                { text: __alloT('stem.firstresponse.lower_them_safely_call_911_start_cpr_l', 'Lower them safely, call 911, start CPR. Look in the mouth before each set of breaths.'), impact: 'help', feedback: __alloT('stem.firstresponse.right_once_unconscious_cpr_can_dislodg', 'Right. Once unconscious, CPR can dislodge the object on its own. Look in the mouth before breaths and remove anything you see — no blind finger sweeps.'), source: 'AHA / Red Cross unconscious choking' },
                { text: __alloT('stem.firstresponse.do_a_blind_finger_sweep_down_their_thr', 'Do a blind finger sweep down their throat.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.never_you_can_push_the_object_deeper_l', 'Never — you can push the object deeper. Look first, only remove what you can see.'), source: 'AHA' },
                { text: __alloT('stem.firstresponse.keep_doing_abdominal_thrusts_on_them_w', 'Keep doing abdominal thrusts on them while they’re on the floor.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.once_unconscious_switch_to_cpr_compres', 'Once unconscious, switch to CPR. Compressions can also help dislodge the object.'), source: 'AHA' }
              ] }
          ] },
        { id: 'field', icon: '⚽', title: __alloT('stem.firstresponse.sports_field_severe_bleeding', 'Sports field — severe bleeding'),
          setup: 'During a soccer game, a player goes down hard after a collision with another player’s cleat. There’s a deep gash on their thigh and blood is spurting. The closest hospital is 20 minutes away.',
          steps: [
            { situation: __alloT('stem.firstresponse.sim_field_safety', 'The area is safe. A teammate calls 911 and brings the bleeding kit; you put on available gloves. What do you do now?'),
              choices: [
                { text: __alloT('stem.firstresponse.press_both_hands_hard_directly_on_the_', 'Press both hands hard directly on the wound. Lean in with bodyweight.'), impact: 'help', feedback: __alloT('stem.firstresponse.direct_pressure_stops_most_bleeding_yo', 'Direct pressure stops most bleeding. Your bodyweight gets the depth a hand alone can’t.'), source: 'Stop the Bleed' },
                { text: __alloT('stem.firstresponse.run_to_find_the_coach_to_grab_the_firs', 'Run to find the coach to grab the first-aid kit.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.every_second_matters_with_arterial_ble', 'Every second matters with arterial bleeding. Apply pressure NOW; have someone else run for the kit.'), source: 'Stop the Bleed' },
                { text: __alloT('stem.firstresponse.lift_the_leg_up_to_drain_the_wound_and', 'Lift the leg up to "drain" the wound and check it.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.don_t_lift_to_peek_you_break_the_clot_', 'Don’t lift to peek. You break the clot you’re trying to form. Press and hold.'), source: 'Stop the Bleed' }
              ] },
            { situation: __alloT('stem.firstresponse.sim_field_training', 'Pressure has not stopped the life-threatening bleeding. The coach hands you a manufactured tourniquet you have been trained to use.'),
              choices: [
                { text: __alloT('stem.firstresponse.place_the_tourniquet_2_3_above_the_wou', 'Place the tourniquet 2–3" ABOVE the wound on the thigh. Tighten until bleeding stops. Note the time.'), impact: 'help', feedback: __alloT('stem.firstresponse.limbs_are_the_right_place_for_a_tourni', 'Limbs are the right place for a tourniquet. Above the wound, between wound and heart, not on a joint. Always note the time it was applied.'), source: 'Stop the Bleed' },
                { text: __alloT('stem.firstresponse.place_the_tourniquet_on_the_wound', 'Place the tourniquet ON the wound.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.tourniquets_go_above_the_wound_between', 'Tourniquets go above the wound, between the wound and the heart. Putting it on the wound itself can damage tissue and won’t cut off the artery.'), source: 'Stop the Bleed' },
                { text: __alloT('stem.firstresponse.don_t_use_the_tourniquet_just_keep_pre', 'Don’t use the tourniquet — just keep pressing harder.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.pressure_that_isn_t_controlling_spurti', 'Pressure that isn’t controlling spurting bleeding from a limb is the textbook indication for a tourniquet. Use it.'), source: 'Stop the Bleed / Hartford Consensus' }
              ] },
            { situation: 'EMS is 18 minutes out. Player is conscious but pale. What now?',
              choices: [
                { text: __alloT('stem.firstresponse.stay_with_them_keep_them_lying_down_wa', 'Stay with them. Keep them lying down, warm. Tell EMS the time the tourniquet went on.'), impact: 'help', feedback: __alloT('stem.firstresponse.right_don_t_loosen_the_tourniquet_don_', 'Right. Don’t loosen the tourniquet. Don’t let bystanders give them water. Time on tourniquet is the single most important fact for the ER.'), source: 'Stop the Bleed' },
                { text: __alloT('stem.firstresponse.loosen_the_tourniquet_every_couple_min', 'Loosen the tourniquet every couple minutes "to let blood flow."'), impact: 'hurt', feedback: __alloT('stem.firstresponse.never_once_it_s_on_it_stays_on_until_e', 'Never — once it’s on, it stays on until EMS or the ER takes over. Loosening can cause re-bleeding.'), source: 'Stop the Bleed' },
                { text: __alloT('stem.firstresponse.give_them_water_and_sit_them_up', 'Give them water and sit them up.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.don_t_give_anything_by_mouth_they_may_', 'Don’t give anything by mouth (they may need surgery). Keep them lying flat to maintain blood pressure to the brain.'), source: 'Red Cross' }
              ] }
          ] },
        { id: 'classroom', icon: '⚡', title: __alloT('stem.firstresponse.classroom_seizure', 'Classroom seizure'),
          setup: 'In second-period English, a classmate you know has epilepsy suddenly stiffens, falls out of their chair, and starts jerking on the floor. The teacher has stepped out of the room. People are filming on their phones.',
          steps: [
            { situation: 'You move toward them. What FIRST?',
              choices: [
                { text: __alloT('stem.firstresponse.move_sharp_objects_chair_legs_desk_cor', 'Move sharp objects (chair legs, desk corners) away. Note the time it started.'), impact: 'help', feedback: __alloT('stem.firstresponse.right_make_the_area_safe_and_time_the_', 'Right. Make the area safe and TIME the seizure. Most last under 2 minutes; over 5 is a 911 emergency.'), source: 'Epilepsy Foundation' },
                { text: __alloT('stem.firstresponse.hold_their_arms_and_legs_down_so_they_', 'Hold their arms and legs down so they don’t hurt themselves.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.never_restrain_someone_having_a_seizur', 'Never restrain someone having a seizure. You can cause serious injury. Move hazards away from THEM, not the other way.'), source: 'Epilepsy Foundation' },
                { text: __alloT('stem.firstresponse.try_to_put_a_pen_in_their_mouth_so_the', 'Try to put a pen in their mouth so they don’t bite their tongue.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.old_myth_never_put_anything_in_someone', 'Old myth. Never put anything in someone’s mouth during a seizure. They cannot swallow their tongue. You can break their teeth or get bitten.'), source: 'Epilepsy Foundation' }
              ] },
            { situation: 'About the kids filming on their phones:',
              choices: [
                { text: __alloT('stem.firstresponse.tell_them_firmly_to_put_the_phones_awa', 'Tell them firmly to put the phones away — this is not for the internet.'), impact: 'help', feedback: __alloT('stem.firstresponse.right_your_classmate_did_not_consent_t', 'Right. Your classmate did not consent to being filmed during a medical event. Protect their dignity.'), source: 'Epilepsy Foundation advocacy' },
                { text: __alloT('stem.firstresponse.ignore_them_focus_on_the_seizure', 'Ignore them — focus on the seizure.'), impact: 'neutral', feedback: __alloT('stem.firstresponse.focus_on_the_seizure_first_but_ask_som', 'Focus on the seizure first, but ask someone else to clear cameras. Their privacy matters too.'), source: 'Epilepsy Foundation advocacy' },
                { text: __alloT('stem.firstresponse.take_a_video_yourself_for_the_doctor', 'Take a video yourself "for the doctor."'), impact: 'hurt', feedback: __alloT('stem.firstresponse.their_family_or_doctor_can_request_spe', 'Their family or doctor can request specific recordings if helpful — that’s their decision, not yours. Don’t add to the camera count.'), source: 'Epilepsy Foundation advocacy' }
              ] },
            { situation: __alloT('stem.firstresponse.sim_classroom_recovery', 'After about 90 seconds, the jerking stops. They are breathing normally but groggy. No head, neck, or back injury is suspected; an adult is coming to follow their seizure action plan.'),
              choices: [
                { text: __alloT('stem.firstresponse.roll_them_gently_onto_their_side_recov', 'Roll them gently onto their side (recovery position). Stay with them. Speak calmly.'), impact: 'help', feedback: __alloT('stem.firstresponse.right_recovery_position_lets_saliva_dr', 'Right. Recovery position lets saliva drain. The post-ictal phase can last 5–30 minutes — confusion is normal.'), source: 'Epilepsy Foundation' },
                { text: __alloT('stem.firstresponse.wake_them_up_by_splashing_water_on_the', 'Wake them up by splashing water on their face.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.don_t_they_re_recovering_stay_calm_tal', 'Don’t. They’re recovering. Stay calm, talk softly, give them time.'), source: 'Epilepsy Foundation' },
                { text: __alloT('stem.firstresponse.walk_away_the_seizure_is_over', 'Walk away — the seizure is over.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.they_need_someone_with_them_through_th', 'They need someone with them through the post-ictal phase. They may also need to know what just happened — they often don’t remember.'), source: 'Epilepsy Foundation' }
              ] }
          ] },
        { id: 'busstop', icon: '🚌', title: __alloT('stem.firstresponse.bus_stop_diabetic_emergency', 'Bus stop — diabetic emergency'),
          setup: 'At the bus stop after school, a classmate you know has type 1 diabetes is acting strange. They’re sweating, slurring their words, and staring blankly. They look almost drunk. They tell you "I’m fine, leave me alone" but they’re shaky.',
          steps: [
            { situation: 'What do you suspect first?',
              choices: [
                { text: __alloT('stem.firstresponse.low_blood_sugar_hypoglycemia_check_if_', 'Low blood sugar (hypoglycemia). Check if they have juice or glucose tabs.'), impact: 'help', feedback: __alloT('stem.firstresponse.in_a_peer_with_diabetes_behavior_chang', 'In a peer with diabetes, behavior change + sweaty + shaky = low blood sugar until proven otherwise. They may not know how impaired they are.'), source: 'American Diabetes Association' },
                { text: __alloT('stem.firstresponse.they_re_drunk_ignore_them', 'They’re drunk. Ignore them.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.hypoglycemia_in_diabetics_often_looks_', 'Hypoglycemia in diabetics often LOOKS like being drunk. Mistaking it can be fatal. Always treat first when you’re not sure.'), source: 'ADA' },
                { text: __alloT('stem.firstresponse.call_their_parent_first', 'Call their parent first.'), impact: 'neutral', feedback: __alloT('stem.firstresponse.a_parent_can_help_but_treating_the_low', 'A parent can help, but treating the low NOW matters more. Sugar first, phone call second.'), source: 'ADA' }
              ] },
            { situation: __alloT('stem.firstresponse.sim_busstop_swallow', 'They are awake, can swallow safely, and agree to help. Their glucose reading is low. They have juice in their bag.'),
              choices: [
                { text: __alloT('stem.firstresponse.sim_busstop_juice', 'Help them take 15 grams of fast-acting carbohydrate, checking the juice label. Recheck blood glucose in 15 minutes.'), impact: 'help', feedback: __alloT('stem.firstresponse.sim_busstop_juice_why', 'Follow their diabetes care plan. Juice boxes vary in size; use the label for 15 grams. Stay with them and recheck. If swallowing becomes unsafe, get emergency help immediately.'), source: 'ADA' },
                { text: __alloT('stem.firstresponse.make_them_eat_a_sandwich_first_protein', 'Make them eat a sandwich first — protein is better.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.when_blood_sugar_is_low_you_need_fast_', 'When blood sugar is low, you need FAST carbs (juice, glucose tab, regular soda). Protein takes too long.'), source: 'ADA' },
                { text: __alloT('stem.firstresponse.give_them_their_insulin_pen', 'Give them their insulin pen.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.never_insulin_lowers_blood_sugar_they_', 'Never — insulin LOWERS blood sugar. They need sugar, not insulin.'), source: 'ADA' }
              ] },
            { situation: __alloT('stem.firstresponse.sim_busstop_worsening', 'Before the recheck, they become very drowsy and cannot swallow safely. They are still breathing normally and have no suspected injury.'),
              choices: [
                { text: __alloT('stem.firstresponse.call_911_recovery_position_don_t_put_a', 'Call 911. Recovery position. Don’t put anything else in their mouth.'), impact: 'help', feedback: __alloT('stem.firstresponse.right_choking_risk_is_real_if_they_can', 'Right. Choking risk is real if they can’t swallow safely. 911. They may need IV glucose or glucagon.'), source: 'ADA' },
                { text: __alloT('stem.firstresponse.pour_more_juice_into_their_mouth_more_', 'Pour more juice into their mouth — more sugar will help.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.aspiration_risk_never_pour_liquid_into', 'Aspiration risk. Never pour liquid into the mouth of a barely-conscious person. 911.'), source: 'ADA' },
                { text: __alloT('stem.firstresponse.wait_it_out_give_it_more_time', 'Wait it out — give it more time.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.sim_busstop_escalate_why', 'Do not wait for the 15-minute recheck when they worsen. Call 911 and stop giving anything by mouth if swallowing is unsafe.'), source: 'ADA' }
              ] }
          ] },
        { id: 'mh', icon: '💚', title: __alloT('stem.firstresponse.mental_health_peer_in_crisis', 'Mental health — peer in crisis'),
          contentWarning: 'This scenario includes a peer expressing suicidal thoughts. If that is too heavy right now, you can skip it — pick another scenario or come back later. There is no penalty for sitting this one out.',
          setup: 'A friend texts you late at night: "I don’t know if I can keep doing this. I don’t want to be here anymore." They live across town. You’re alone in your room.',
          steps: [
            { situation: 'You read the text. What FIRST?',
              choices: [
                { text: __alloT('stem.firstresponse.text_back_right_now_i_m_here_i_hear_yo', 'Text back right now: "I’m here. I hear you. Tell me more."'), impact: 'help', feedback: __alloT('stem.firstresponse.showing_up_matters_don_t_lecture_don_t', 'Showing up matters. Don’t lecture, don’t fix yet — just be present and listen. You can’t make someone more suicidal by asking.'), source: '988 Lifeline / NAMI' },
                { text: __alloT('stem.firstresponse.don_t_respond_you_don_t_know_what_to_s', 'Don’t respond — you don’t know what to say and you’re scared.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.sim_mh_support_why', 'It is understandable to feel scared. You can listen and bring in a trusted adult or 988 counselor. You do not have to handle this alone.'), source: 'QPR / NAMI' },
                { text: __alloT('stem.firstresponse.screenshot_it_and_post_it_to_tiktok_as', 'Screenshot it and post it to TikTok asking what to do.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.no_this_is_private_posting_it_betrays_', 'No. This is private. Posting it betrays trust and can escalate. Take the message to a trusted adult, not the internet.'), source: 'NAMI peer support guidance' }
              ] },
            { situation: 'They text back: "I’ve been thinking about it for a while. I have a plan."',
              choices: [
                { text: __alloT('stem.firstresponse.sim_mh_connect', 'Stay connected, ask where they are and whether they are in immediate danger, and involve a trusted adult and 988. Call 911 for immediate danger.'), impact: 'help', feedback: __alloT('stem.firstresponse.sim_mh_connect_why', 'Take a suicide plan seriously. Contact support now; do not promise secrecy or wait for permission to get emergency help when danger is immediate.'), source: '988 Lifeline / NAMI' },
                { text: __alloT('stem.firstresponse.promise_you_won_t_tell_anyone_ever_no_', 'Promise you won’t tell anyone, ever, no matter what.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.don_t_promise_this_some_things_you_can', 'Don’t promise this. Some things you can’t keep secret — a friend’s safety is one. You can promise to be there. You can’t promise silence.'), source: 'NAMI peer support / school safe-messaging' },
                { text: __alloT('stem.firstresponse.tell_them_to_just_hang_in_there_and_go', 'Tell them to "just hang in there" and go to sleep.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.this_dismisses_the_crisis_they_told_yo', 'This dismisses the crisis. They told you because they need help RIGHT NOW. Stay engaged.'), source: 'NAMI / SAMHSA' }
              ] },
            { situation: 'They’re scared their parents will be mad. What do you say?',
              choices: [
                { text: __alloT('stem.firstresponse.sim_mh_trusted_adult', 'Say: "I hear that you are scared. Let’s contact 988 together and find a trusted adult who can help you feel safe."'), impact: 'help', feedback: __alloT('stem.firstresponse.acknowledge_the_fear_offer_to_share_th', 'Acknowledge the fear. Offer to share the load. 988 counselors can help them figure out next steps and what to say to a parent.'), source: '988 Lifeline' },
                { text: __alloT('stem.firstresponse.tell_them_their_parents_won_t_care', 'Tell them their parents won’t care.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.you_don_t_know_that_even_if_a_relation', 'You don’t know that. Even if a relationship is hard, a crisis adult can step in (counselor, coach, aunt, neighbor). 988 helps figure out who.'), source: 'NAMI' },
                { text: __alloT('stem.firstresponse.wait_until_tomorrow_to_tell_anyone_it_', 'Wait until tomorrow to tell anyone — it’s late.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.a_specific_plan_is_a_now_problem_not_a', 'A specific plan is a now problem, not a tomorrow problem. 988 is open 24/7. So is 911 if there’s immediate life threat.'), source: '988 Lifeline' }
              ] },
            { situation: __alloT('stem.firstresponse.sim_mh_text_988', 'They agree to text 988, the Suicide & Crisis Lifeline. What do YOU do next?'),
              choices: [
                { text: __alloT('stem.firstresponse.stay_on_the_phone_or_text_with_them_te', 'Stay on the phone or text with them. Tell a trusted adult in your life what just happened — you need support too.'), impact: 'help', feedback: __alloT('stem.firstresponse.right_don_t_carry_this_alone_hearing_t', 'Right. Don’t carry this alone. Hearing this from a friend is heavy — your own adult / counselor / parent can help you process. NAMI HelpLine: 1-800-950-NAMI.'), source: 'NAMI peer support' },
                { text: __alloT('stem.firstresponse.hang_up_and_put_your_phone_away_you_ha', 'Hang up and put your phone away — you handled it.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.you_did_show_up_that_matters_but_stayi', 'You did show up — that matters. But staying connected and getting your own support afterward both matter. This is the kind of thing that lingers.'), source: 'NAMI' },
                { text: __alloT('stem.firstresponse.tell_everyone_at_school_tomorrow_what_', 'Tell everyone at school tomorrow what happened.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.no_their_story_is_theirs_you_can_tell_', 'No. Their story is theirs. You can tell trusted adults who can help; you can’t tell the lunch table.'), source: 'NAMI peer support' }
              ] }
          ] }
      ];

      // Source-backed practice adds a changing condition and two AED outcomes.
      var simAha = 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support';
      var simRedCross = 'https://www.redcross.org/take-a-class/resources/learn-first-aid/unresponsive-and-breathing-person';
      var simShock = d.scenarioAedOutcome === 'shock';
      SCENARIOS.unshift({
        id: 'changing', icon: '🫁', title: __alloT('stem.firstresponse.sim_changing_title', 'When breathing changes'),
        setup: __alloT('stem.firstresponse.sim_changing_setup', 'At a community center, an adult becomes unresponsive. The area is safe, there is no apparent injury, and you have a phone. A helper can bring an AED.'),
        steps: [
          { situation: __alloT('stem.firstresponse.sim_changing_s1', 'You have checked: they do not respond, but they ARE breathing normally. What care fits these observations?'), choices: [
            { text: __alloT('stem.firstresponse.sim_changing_s1_help', 'Call 911 on speaker, place them on their side, and keep watching their breathing.'), impact: 'help', feedback: __alloT('stem.firstresponse.sim_changing_s1_why', 'An unresponsive person needs emergency help. With normal breathing and no suspected injury, the recovery position helps protect their airway. Keep monitoring.'), source: 'American Red Cross', sourceUrl: simRedCross },
            { text: __alloT('stem.firstresponse.sim_changing_s1_cpr', 'Begin chest compressions while they are breathing normally.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.sim_changing_s1_cpr_why', 'Normal breathing changes the action: protect the airway and monitor. CPR is needed if they stop breathing normally.'), source: 'American Red Cross', sourceUrl: simRedCross },
            { text: __alloT('stem.firstresponse.sim_changing_s1_leave', 'Leave them alone to rest.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.sim_changing_s1_leave_why', 'Stay with them. Their breathing may change before help arrives.'), source: 'American Red Cross', sourceUrl: simRedCross }
          ] },
          { situation: __alloT('stem.firstresponse.sim_changing_s2', 'While you monitor, normal breathing changes to occasional irregular gasps. They still do not respond. The dispatcher is on speaker.'), choices: [
            { text: __alloT('stem.firstresponse.sim_changing_s2_help', 'Tell the dispatcher, roll them onto their back on a firm surface, and start CPR.'), impact: 'help', feedback: __alloT('stem.firstresponse.sim_changing_s2_why', 'Gasping is not normal breathing. Unresponsiveness with gasping calls for CPR; follow the dispatcher.'), source: 'AHA 2025 adult BLS', sourceUrl: simAha },
            { text: __alloT('stem.firstresponse.sim_changing_s2_wait', 'Keep them on their side because gasping means they are breathing.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.sim_changing_s2_wait_why', 'Gasping can occur in cardiac arrest. Change your response when the breathing changes.'), source: 'AHA 2025 adult BLS', sourceUrl: simAha },
            { text: __alloT('stem.firstresponse.sim_changing_s2_pulse', 'Wait until you can find a pulse before deciding.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.sim_changing_s2_pulse_why', 'Lay rescuers use responsiveness and breathing. A pulse search can delay CPR.'), source: 'AHA 2025 adult BLS', sourceUrl: simAha }
          ] },
          { situation: __alloT('stem.firstresponse.sim_changing_s3', 'Your helper turns on the AED and attaches its pads while you give CPR. The AED now says it is analyzing.'), choices: [
            { text: __alloT('stem.firstresponse.sim_changing_s3_help', 'Pause compressions, tell everyone to stand clear, and make sure nobody is touching the person.'), impact: 'help', feedback: __alloT('stem.firstresponse.sim_changing_s3_why', 'The AED needs everyone clear during analysis. Follow its next prompt.'), source: 'AHA: AED use', sourceUrl: 'https://www.heart.org/en/health-topics/cardiac-arrest/emergency-treatment-of-cardiac-arrest' },
            { text: __alloT('stem.firstresponse.sim_changing_s3_continue', 'Keep compressing while the AED analyzes.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.sim_changing_s3_continue_why', 'Movement can interfere with analysis. Clear the person when the AED tells you to.'), source: 'AHA: AED use' },
            { text: __alloT('stem.firstresponse.sim_changing_s3_shock', 'Press the shock button before the analysis finishes.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.sim_changing_s3_shock_why', 'Let the AED determine whether a shock is needed. Follow the device prompts.'), source: 'AHA: AED use' }
          ] },
          { situation: simShock
              ? __alloT('stem.firstresponse.sim_changing_s4_shock', 'The AED says “Shock advised.” This training device has a shock button. The person is still unresponsive.')
              : __alloT('stem.firstresponse.sim_changing_s4_no_shock', 'The AED says “No shock advised.” The person is still unresponsive and is not breathing normally.'), choices: [
            { text: simShock ? __alloT('stem.firstresponse.sim_changing_s4_shock_help', 'Make sure everyone is clear, deliver the advised shock, then immediately resume CPR.') : __alloT('stem.firstresponse.sim_changing_s4_no_shock_help', 'Immediately resume CPR and keep following the AED prompts.'), impact: 'help', feedback: __alloT('stem.firstresponse.sim_changing_s4_why', 'Resume CPR after either outcome. “No shock advised” does not mean the person has recovered.'), source: 'AHA: AED use', sourceUrl: 'https://www.heart.org/en/health-topics/cardiac-arrest/emergency-treatment-of-cardiac-arrest' },
            { text: __alloT('stem.firstresponse.sim_changing_s4_wait', 'Wait for the next analysis without giving CPR.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.sim_changing_s4_wait_why', 'Waiting creates an avoidable pause. Resume CPR as directed.'), source: 'AHA: AED use' },
            { text: __alloT('stem.firstresponse.sim_changing_s4_off', 'Remove the pads and turn the AED off.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.sim_changing_s4_off_why', 'Keep the AED attached and follow its prompts until responders take over.'), source: 'AHA: AED use' }
          ] }
        ]
      });

      var SIM_GUIDES = {
        changing: { goal: __alloT('stem.firstresponse.sim_goal_changing', 'Reassess breathing and respond to both AED outcomes.'), cues: [__alloT('stem.firstresponse.sim_cue_normal', 'Unresponsive · normal breathing'), __alloT('stem.firstresponse.sim_cue_gasp', 'Breathing has changed · irregular gasps'), __alloT('stem.firstresponse.sim_cue_analysis', 'AED analysis in progress'), simShock ? __alloT('stem.firstresponse.sim_cue_shock', 'AED prompt · shock advised') : __alloT('stem.firstresponse.sim_cue_no_shock', 'AED prompt · no shock advised')], skill: 'cprAed', reflect: __alloT('stem.firstresponse.sim_reflect_changing', 'Which observation changed the care plan? Why is “no shock advised” not a reason to stop CPR?') },
        cafeteria: { goal: __alloT('stem.firstresponse.sim_goal_cafeteria', 'Recognize collapse, delegate help, and bring in an AED.'), cues: [__alloT('stem.firstresponse.sim_cue_collapsed', 'Collapsed · responsiveness unknown'), __alloT('stem.firstresponse.sim_cue_unresponsive', 'No response · abnormal breathing'), __alloT('stem.firstresponse.sim_cue_compressions', 'CPR has begun'), __alloT('stem.firstresponse.sim_cue_aed_arrived', 'AED arrives · helper needs direction')], skill: 'cprAed', reflect: __alloT('stem.firstresponse.sim_reflect_cafeteria', 'Say the exact words you would use to assign the emergency call and AED task to two helpers.') },
        hallway: { goal: __alloT('stem.firstresponse.sim_goal_hallway', 'Recognize severe choking and change care if they become unresponsive.'), cues: [__alloT('stem.firstresponse.sim_cue_choking', 'Hands at throat · no sound'), __alloT('stem.firstresponse.sim_cue_no_cough', 'Cannot cough or breathe'), __alloT('stem.firstresponse.sim_cue_limp', 'Becomes unresponsive')], skill: 'choking', reflect: __alloT('stem.firstresponse.sim_reflect_hallway', 'What changes your response from back blows and thrusts to CPR?') },
        field: { goal: __alloT('stem.firstresponse.sim_goal_field', 'Control severe bleeding and communicate the care given.'), cues: [__alloT('stem.firstresponse.sim_cue_bleed', 'Deep thigh wound · spurting blood'), __alloT('stem.firstresponse.sim_cue_pressure', 'Bleeding continues · kit arrives'), __alloT('stem.firstresponse.sim_cue_ems', 'Help is coming · person is pale')], skill: 'bleed', reflect: __alloT('stem.firstresponse.sim_reflect_field', 'What would you tell the arriving responders about the bleeding and tourniquet?') },
        classroom: { goal: __alloT('stem.firstresponse.sim_goal_classroom', 'Protect safety, privacy, and recovery during a seizure.'), cues: [__alloT('stem.firstresponse.sim_cue_seizure', 'Jerking movements · nearby hazards'), __alloT('stem.firstresponse.sim_cue_privacy', 'Bystanders are recording'), __alloT('stem.firstresponse.sim_cue_recovery', 'Jerking stops · breathing normally')], skill: 'disabilityAware', reflect: __alloT('stem.firstresponse.sim_reflect_classroom', 'How can a helper protect privacy while you keep watching breathing and timing the seizure?') },
        busstop: { goal: __alloT('stem.firstresponse.sim_goal_busstop', 'Notice a possible diabetic emergency and check safe swallowing.'), cues: [__alloT('stem.firstresponse.sim_cue_diabetic', 'Diabetes · sweating and confusion'), __alloT('stem.firstresponse.sim_cue_swallow', 'Awake · able to swallow safely'), __alloT('stem.firstresponse.sim_cue_drowsy', 'Drowsier · cannot swallow safely')], skill: 'recognize', reflect: __alloT('stem.firstresponse.sim_reflect_busstop', 'What change makes giving more food or drink unsafe?') },
        mh: { goal: __alloT('stem.firstresponse.sim_goal_mh', 'Listen, connect with support, and share the responsibility for safety.'), cues: [__alloT('stem.firstresponse.sim_cue_text', 'A worrying message from a friend'), __alloT('stem.firstresponse.sim_cue_plan', 'Friend describes a suicide plan'), __alloT('stem.firstresponse.sim_cue_fear', 'Fear of asking an adult for help'), __alloT('stem.firstresponse.sim_cue_connected', 'Connecting with crisis support')], skill: 'call', reflect: __alloT('stem.firstresponse.sim_reflect_mh', 'Name a trusted adult you could involve. How would you get support for yourself afterward?') }
      };

      function renderScenarios() {
        var sc = SCENARIOS.filter(function (s) { return s.id === d.scenarioPick; })[0];
        var stepIndex = Number.isInteger(d.scenarioStep) ? Math.max(0, d.scenarioStep) : 0;
        var run = Number.isInteger(d.scenarioRun) ? d.scenarioRun : 0;
        var log = Array.isArray(d.scenarioLog) ? d.scenarioLog : [];
        var guide = sc && SIM_GUIDES[sc.id];
        var step = sc && sc.steps[stepIndex];
        var entry = log[stepIndex];
        var answered = !!(step && entry && step.choices[entry.finalChoice]);
        var lastChoice = answered && step.choices[entry.finalChoice];
        var ready = answered && lastChoice.impact === 'help';
        var stale = sc && d.scenarioVersion !== 2;
        var hintUsed = !!(d.scenarioHintUsed || (entry && entry.hintUsed));
        var labels = { help: __alloT('stem.firstresponse.sim_label_help', 'Ready to continue'), neutral: __alloT('stem.firstresponse.sim_label_neutral', 'Improve this action'), hurt: __alloT('stem.firstresponse.sim_label_hurt', 'Choose a safer action') };
        var sourceLinks = {
          changing: simAha, cafeteria: simAha,
          hallway: 'https://www.redcross.org/take-a-class/resources/learn-first-aid/adult-child-choking',
          field: 'https://www.stopthebleed.org/training/',
          classroom: 'https://www.epilepsy.com/recognition/first-aid-resources',
          busstop: 'https://diabetes.org/living-with-diabetes/treatment-care/hypoglycemia',
          mh: 'https://988lifeline.org/help-someone-else/'
        };

        function focusHeading() {
          // On a retry the step and case can stay unchanged, so focus explicitly.
          var title = document.querySelector('[data-fr-sim-heading]');
          if (title) title.focus();
        }
        function pickScenario(id, acknowledged) {
          updMulti({ scenarioPick: id, scenarioStep: 0, scenarioVersion: 2,
            scenarioRun: (run + 1) % 1000000, scenarioLog: [], scenarioHintUsed: false,
            scenarioAnswered: false, scenarioLastChoice: null,
            scenarioScore: { help: 0, neutral: 0, hurt: 0 },
            scenarioAedOutcome: id === 'changing' && d.scenarioPick === 'changing' && !simShock ? 'shock' : 'noShock',
            mhAcknowledged: id === 'mh' ? !!acknowledged : false
          });
          focusHeading();
        }
        function chooseAnswer(idx) {
          if (!step || ready || stale || (sc.contentWarning && !d.mhAcknowledged)) return;
          if (answered && entry.finalChoice === idx) return;
          var choice = step.choices[idx];
          if (!choice) return;
          var first = answered ? entry.firstChoice : idx;
          var next = log.slice(0, sc.steps.length);
          next[stepIndex] = { firstChoice: first, finalChoice: idx,
            tries: answered ? entry.tries + 1 : 1, hintUsed: hintUsed };
          var score = { help: 0, neutral: 0, hurt: 0 };
          next.forEach(function (record, i) {
            var original = sc.steps[i].choices[record.firstChoice];
            if (original) score[original.impact]++;
          });
          updMulti({ scenarioLog: next, scenarioScore: score, scenarioAnswered: true, scenarioLastChoice: idx });
          // Visible feedback is the polite live region; do not also announce it.
        }
        function nextStep() {
          if (!ready) return;
          if (stepIndex === sc.steps.length - 1 && log.length === sc.steps.length && log.every(function (record, i) {
            return record && sc.steps[i].choices[record.firstChoice] && sc.steps[i].choices[record.firstChoice].impact === 'help' && !record.hintUsed;
          })) awardBadge('scenario_clean_' + sc.id, __alloT('stem.firstresponse.sim_independent_run', 'Independent run: ') + sc.title);
          updMulti({ scenarioStep: stepIndex + 1, scenarioHintUsed: false, scenarioAnswered: false, scenarioLastChoice: null });
        }
        function leaveScenario() {
          updMulti({ scenarioPick: null, scenarioStep: 0, scenarioLog: [], scenarioHintUsed: false,
            scenarioAnswered: false, scenarioLastChoice: null, mhAcknowledged: false,
            scenarioScore: { help: 0, neutral: 0, hurt: 0 } });
        }
        function source(choice) {
          var organizations = { changing: 'American Heart Association', cafeteria: 'American Heart Association',
            hallway: 'American Red Cross', field: 'STOP THE BLEED', classroom: 'Epilepsy Foundation',
            busstop: 'American Diabetes Association', mh: '988 Suicide & Crisis Lifeline' };
          return h('span', { style: { fontSize: 12 } }, __alloT('stem.firstresponse.sim_related_guidance', 'Related guidance: '),
            h('a', { href: choice.sourceUrl || sourceLinks[sc.id], target: '_blank', rel: 'noopener noreferrer',
              style: { color: T.link, textDecoration: 'underline' } }, choice.sourceUrl ? choice.source : organizations[sc.id]));
        }
        function heading(text) {
          return h('h3', { 'data-fr-sim-heading': true, tabIndex: -1, className: 'fr-sim-title' }, text);
        }
        function illustration(id) {
          // Decorative scene map. All observations are repeated in real text.
          var upright = (id === 'hallway' || id === 'busstop') && stepIndex < 2;
          var aedArrived = (id === 'changing' && stepIndex >= 2) || (id === 'cafeteria' && stepIndex >= 3);
          return h('svg', { viewBox: '0 0 320 150', 'aria-hidden': 'true', focusable: 'false', className: 'fr-sim-map' },
            h('rect', { x: 1, y: 1, width: 318, height: 148, rx: 14, fill: '#0b1426' }),
            h('path', { d: 'M0 120H320 M40 0V150 M280 0V150', stroke: '#22354b', strokeWidth: 1 }),
            id === 'field' ? h('g', { fill: 'none', stroke: '#4d7b71', strokeWidth: 2 }, h('rect', { x: 22, y: 22, width: 276, height: 106, rx: 4 }), h('circle', { cx: 160, cy: 75, r: 32 }), h('path', { d: 'M160 22V128' })) :
              id === 'mh' ? h('g', null, h('rect', { x: 112, y: 18, width: 96, height: 116, rx: 12, fill: '#23354f', stroke: '#93c5fd', strokeWidth: 2 }), h('rect', { x: 125, y: 41, width: 58, height: 22, rx: 7, fill: '#a7f3d0' }), h('rect', { x: 142, y: 76, width: 53, height: 22, rx: 7, fill: '#93c5fd' }), h('circle', { cx: 160, cy: 121, r: 4, fill: '#94a3b8' })) :
              h('g', { fill: '#25374d', stroke: '#526984', strokeWidth: 1.5 }, [35, 117, 199].map(function (x) { return h('rect', { key: x, x: x, y: 20, width: 66, height: 24, rx: 5 }); }), h('path', { d: 'M40 50V58 M96 50V58 M122 50V58 M178 50V58 M204 50V58 M260 50V58' })),
            id !== 'mh' && h('g', null,
              h('ellipse', { cx: 145, cy: 113, rx: 79, ry: 11, fill: '#172940' }),
              h('circle', { cx: upright ? 144 : 91, cy: upright ? 64 : 94, r: 12, fill: '#c7d2e0' }),
              h('path', { d: upright ? 'M144 82V100 M144 100L130 121 M144 100L158 121 M144 86L122 81 M144 86L163 76' : 'M112 96L164 96 M126 96L141 108 M164 96L201 104 M164 96L201 87', stroke: '#93c5fd', strokeWidth: upright ? 9 : 13, strokeLinecap: 'round', fill: 'none' }),
              h('circle', { cx: 242, cy: 69, r: 11, fill: '#c7d2e0' }),
              h('path', { d: 'M241 86L226 111L210 111 M241 87L254 110 M238 87L215 87', stroke: '#5eead4', strokeWidth: 9, strokeLinecap: 'round', fill: 'none' }),
              h('circle', { cx: 283, cy: 100, r: 15, fill: '#183d43', stroke: '#5eead4' }),
              h('path', { d: aedArrived ? 'M286 89L276 102H284L280 111L291 98H283Z' : 'M283 92V108 M275 100H291', stroke: '#99f6e4', fill: aedArrived ? '#99f6e4' : 'none', strokeWidth: 2 })
            )
          );
        }
        function picker() {
          return h('div', null,
            h('section', { className: 'fr-sim-intro' },
              h('p', { className: 'fr-sim-eyebrow' }, __alloT('stem.firstresponse.sim_eyebrow', 'NOTICE · DECIDE · REASSESS')),
              heading(__alloT('stem.firstresponse.sim_picker_title', 'Practice the decisions that come next')),
              h('p', { className: 'fr-sim-copy' }, __alloT('stem.firstresponse.sim_picker_intro', 'Read the scene, choose an action, then use feedback to improve it. Each run ends with your decision trail and a question to discuss. Take the time you need.')),
              h('div', { className: 'fr-sim-tags' }, h('span', null, __alloT('stem.firstresponse.sim_no_timer', 'No countdown')), h('span', null, __alloT('stem.firstresponse.sim_optional_cues', 'Optional coaching cues')), h('span', null, __alloT('stem.firstresponse.sim_local_practice', 'Retry with feedback')))
            ),
            h('div', { className: 'fr-sim-catalog', role: 'list' }, SCENARIOS.map(function (s, i) {
              return h('div', { role: 'listitem', key: s.id },
                h('button', { 'data-fr-focusable': true, className: 'fr-sim-case', 'aria-label': __alloT('stem.firstresponse.sim_start_scenario', 'Start scenario: ') + s.title + (s.contentWarning ? ' (' + __alloT('stem.firstresponse.sim_content_warning', 'content warning') + ')' : ''), onClick: function () { pickScenario(s.id); } },
                  h('div', { className: 'fr-sim-case-top' }, h('span', { 'aria-hidden': 'true', className: 'fr-sim-case-icon' }, s.icon), h('span', null, String(i + 1).padStart(2, '0'))),
                  h('strong', null, s.title), h('span', { className: 'fr-sim-copy' }, SIM_GUIDES[s.id].goal),
                  h('span', { className: 'fr-sim-case-footer' }, s.steps.length + ' ' + __alloT('stem.firstresponse.sim_decisions', 'decisions'), h('span', null, s.contentWarning ? __alloT('stem.firstresponse.sim_content_warning', 'content warning') : __alloT('stem.firstresponse.sim_begin', 'Begin →')))
                )
              );
            }))
          );
        }
        function warning() {
          return h('section', { className: 'fr-sim-card', 'aria-label': __alloT('stem.firstresponse.sim_content_warning', 'content warning') },
            heading(__alloT('stem.firstresponse.sim_before_mh', 'Before this scenario')),
            h('p', { className: 'fr-sim-copy' }, sc.contentWarning),
            h('div', { className: 'fr-sim-actions' },
              h('button', { 'data-fr-focusable': true, onClick: function () { upd('mhAcknowledged', true); }, style: btnPrimary() }, __alloT('stem.firstresponse.sim_understand_start', 'I understand — start')),
              h('button', { 'data-fr-focusable': true, onClick: leaveScenario, style: btn() }, __alloT('stem.firstresponse.sim_skip', 'Choose another scenario'))
            )
          );
        }
        function debrief() {
          var reviewed = sc.steps.map(function (s, i) {
            var r = log[i];
            return r && s.choices[r.firstChoice] && s.choices[r.finalChoice] && s.choices[r.finalChoice].impact === 'help' ? r : null;
          });
          if (reviewed.some(function (r) { return !r; })) return restart();
          var firstReady = reviewed.filter(function (r, i) { return sc.steps[i].choices[r.firstChoice].impact === 'help'; }).length;
          var cues = reviewed.filter(function (r) { return r.hintUsed; }).length;
          return h('section', { className: 'fr-sim-card' },
            h('p', { className: 'fr-sim-eyebrow' }, __alloT('stem.firstresponse.sim_debrief_eyebrow', 'YOUR DECISION TRAIL')),
            heading(__alloT('stem.firstresponse.sim_complete', 'Scenario complete: ') + sc.title),
            h('p', { className: 'fr-sim-copy' }, __alloT('stem.firstresponse.sim_debrief_intro', 'Every step now ends with a safe action. Your first decisions stay visible so you can choose what to practice next. This records screen practice, not hands-on competence.')),
            h('div', { className: 'fr-sim-metrics' },
              [[firstReady + ' / ' + sc.steps.length, __alloT('stem.firstresponse.sim_first_choices', 'First choices ready')], [sc.steps.length - firstReady, __alloT('stem.firstresponse.sim_revised', 'Decisions revised')], [cues, __alloT('stem.firstresponse.sim_cues_used', 'Steps with coaching cues')]].map(function (m) { return h('div', { key: m[1] }, h('strong', null, m[0]), h('span', null, m[1])); })
            ),
            h('ol', { className: 'fr-sim-trail' }, reviewed.map(function (r, i) {
              var s = sc.steps[i], first = s.choices[r.firstChoice], final = s.choices[r.finalChoice];
              return h('li', { key: i }, h('div', { className: 'fr-sim-trail-number', 'aria-hidden': 'true' }, i + 1), h('div', null,
                h('strong', null, guide.cues[i]),
                h('p', { className: 'fr-sim-copy' }, __alloT('stem.firstresponse.sim_your_first_choice', 'Your first choice: ') + first.text),
                first.impact !== 'help' && h('p', { className: 'fr-sim-correction' }, __alloT('stem.firstresponse.sim_revised_to', 'Revised to: ') + final.text),
                h('p', { className: 'fr-sim-copy' }, final.feedback),
                r.hintUsed && h('p', { className: 'fr-sim-copy' }, __alloT('stem.firstresponse.sim_used_cue', 'A coaching cue supported this decision.')),
                source(final)
              ));
            })),
            h('div', { className: 'fr-sim-reflect' }, h('h4', null, __alloT('stem.firstresponse.sim_explain', 'Explain it in your own words')), h('p', null, guide.reflect), h('p', { className: 'fr-sim-copy' }, __alloT('stem.firstresponse.sim_explain_modes', 'Say it, write it, sign it, or discuss it with a partner. Use an observation from the scene to explain your action.'))),
            h('div', { className: 'fr-sim-actions' },
              h('button', { 'data-fr-focusable': true, onClick: function () { pickScenario(sc.id, d.mhAcknowledged); }, style: btnPrimary() }, sc.id === 'changing' ? __alloT('stem.firstresponse.sim_other_outcome', 'Practice the other AED outcome') : __alloT('stem.firstresponse.sim_retry', 'Try again without cues')),
              h('button', { 'data-fr-focusable': true, onClick: function () { upd('view', guide.skill); }, style: btn() }, __alloT('stem.firstresponse.sim_open_skill', 'Open related skill practice')),
              sc.id !== 'mh' && h('button', { 'data-fr-focusable': true, onClick: function () {
                updMulti({ view: 'call', callView: 'practice', dispatchPractice: null, dispatchScene: sc.id === 'field' ? 'trail' : 'center' });
              }, style: btn() }, __alloT('stem.firstresponse.dispatch_practice_communication', 'Practice communicating with 911')),
              h('button', { 'data-fr-focusable': true, onClick: leaveScenario, style: btn() }, __alloT('stem.firstresponse.sim_choose_another', 'Choose another scenario'))
            )
          );
        }
        function restart() {
          return h('section', { className: 'fr-sim-card' }, heading(sc.title), h('p', { className: 'fr-sim-copy' }, __alloT('stem.firstresponse.sim_restart_explanation', 'Start a fresh run to use the new decision trail and coaching feedback.')),
            h('button', { 'data-fr-focusable': true, style: btnPrimary(), onClick: function () { pickScenario(sc.id, d.mhAcknowledged); } }, __alloT('stem.firstresponse.sim_restart', 'Start a fresh run')));
        }
        function active() {
          if (stale || !step) return stepIndex >= sc.steps.length && !stale ? debrief() : restart();
          var offset = (run + stepIndex + sc.id.length) % step.choices.length;
          var order = step.choices.map(function (_, i) { return (i + offset) % step.choices.length; });
          var best = step.choices.filter(function (c) { return c.impact === 'help'; })[0];
          return h('div', null,
            h('header', { className: 'fr-sim-run-heading' }, heading(sc.title), h('span', null, __alloT('stem.firstresponse.sim_decision', 'Decision ') + (stepIndex + 1) + ' / ' + sc.steps.length)),
            h('ol', { className: 'fr-sim-progress', 'aria-label': __alloT('stem.firstresponse.sim_progress', 'Scenario progress') }, sc.steps.map(function (_, i) {
              return h('li', { key: i, 'aria-current': i === stepIndex ? 'step' : undefined, className: i < stepIndex ? 'is-complete' : i === stepIndex ? 'is-current' : '' },
                h('span', { 'aria-hidden': 'true' }, i < stepIndex ? '✓' : i + 1), h('span', null, i < stepIndex ? __alloT('stem.firstresponse.sim_reviewed_step', 'Reviewed') : i === stepIndex ? __alloT('stem.firstresponse.sim_current_step', 'Current') : __alloT('stem.firstresponse.sim_upcoming_step', 'Upcoming')));
            })),
            h('div', { className: 'fr-sim-workspace' },
              h('aside', { className: 'fr-sim-scene', 'aria-label': __alloT('stem.firstresponse.sim_scene_brief', 'Scene brief') },
                illustration(sc.id), h('p', { className: 'fr-sim-eyebrow' }, __alloT('stem.firstresponse.sim_observe', 'OBSERVE')),
                h('h4', null, guide.cues[stepIndex]), h('p', { className: 'fr-sim-copy' }, sc.setup),
                h('div', { className: 'fr-sim-goal' }, h('strong', null, __alloT('stem.firstresponse.sim_practice_goal', 'Practice goal')), h('p', null, guide.goal)),
                h('p', { className: 'fr-sim-note' }, __alloT('stem.firstresponse.sim_scene_note', 'Simplified scene illustration. Use the written observations to make your decision.'))
              ),
              h('section', { className: 'fr-sim-card fr-sim-decision', 'aria-label': __alloT('stem.firstresponse.sim_choose_action', 'Choose your action') },
                h('p', { className: 'fr-sim-eyebrow' }, __alloT('stem.firstresponse.sim_decide', 'DECIDE')),
                h('h4', { className: 'fr-sim-situation' }, step.situation),
                h('div', { role: 'group', 'aria-label': __alloT('stem.firstresponse.sim_choices', 'Choices'), className: 'fr-sim-choices' }, order.map(function (idx, position) {
                  var c = step.choices[idx], selected = answered && entry.finalChoice === idx;
                  return h('button', { key: idx, 'data-fr-focusable': true, 'aria-disabled': ready ? 'true' : undefined,
                    className: 'fr-sim-choice' + (selected ? ' is-selected is-' + c.impact : ''), onClick: function () { chooseAnswer(idx); } },
                    h('span', { className: 'fr-sim-letter', 'aria-hidden': 'true' }, String.fromCharCode(65 + position)), h('span', null, c.text,
                      selected && h('span', { className: 'fr-sim-choice-state' }, labels[c.impact])));
                })),
                // Keep the status node mounted before its text changes.
                h('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, answered && h('div', { className: 'fr-sim-feedback' },
                  h('strong', null, labels[lastChoice.impact]), h('p', null, lastChoice.feedback), source(lastChoice),
                  !ready && h('p', null, __alloT('stem.firstresponse.sim_correct_prompt', 'Use the feedback to choose again. Your first choice stays in the debrief.')),
                  ready && entry.tries > 1 && h('p', null, __alloT('stem.firstresponse.sim_correction_saved', 'Revision recorded. Notice the observation that changed your decision.'))
                )),
                !ready && h('div', { className: 'fr-sim-hint' },
                  h('button', { 'data-fr-focusable': true, 'aria-expanded': hintUsed, 'aria-controls': 'fr-sim-coaching', style: btn({ fontSize: 12 }), onClick: function () {
                    if (hintUsed) return;
                    var next = log.slice();
                    if (entry) next[stepIndex] = Object.assign({}, entry, { hintUsed: true });
                    updMulti({ scenarioHintUsed: true, scenarioLog: next });
                  } }, __alloT('stem.firstresponse.sim_show_cue', 'Show a coaching cue')),
                  h('div', { id: 'fr-sim-coaching', hidden: !hintUsed }, h('p', { className: 'fr-sim-copy' }, best.feedback))
                ),
                h('div', { className: 'fr-sim-actions' },
                  h('button', { 'data-fr-focusable': true, onClick: leaveScenario, style: btn() }, __alloT('stem.firstresponse.sim_leave', 'Leave scenario')),
                  ready && h('button', { 'data-fr-focusable': true, onClick: nextStep, style: btnPrimary() }, stepIndex === sc.steps.length - 1 ? __alloT('stem.firstresponse.sim_see_debrief', 'See your debrief →') : __alloT('stem.firstresponse.sim_next', 'Next observation →'))
                )
              )
            )
          );
        }
        return h('div', { className: 'fr-sim-shell', style: { color: T.text } },
          backBar(__alloT('stem.firstresponse.sim_module_title', '🎭 Scenario sim')), emergencyBanner(),
          !sc ? picker() : sc.contentWarning && !d.mhAcknowledged ? warning() : active(), disclaimerFooter());
      }


      // ─────────────────────────────────────────
      // AI PRACTICE module — callGemini generates novel scenes; AI critiques
      // student's response against HARDCODED protocols. The AI never answers
      // "what's the right clinical decision" — it only checks reasoning against
      // protocols already in this tool. Hardcoded fallback scenes ship with the
      // module so it works even if no API key / Gemini is unavailable.
      // ─────────────────────────────────────────
      var FALLBACK_SCENES = [
        { id: 'fb1', difficulty: 'basic',
          text: __alloT('stem.firstresponse.in_study_hall_a_peer_drops_his_soda_an', 'In study hall, a peer drops his soda and slumps face-first onto his desk. He does not respond when you say his name. You can see his chest is not moving normally.') },
        { id: 'fb2', difficulty: 'basic',
          text: __alloT('stem.firstresponse.on_the_school_bus_a_1st_grader_starts_', 'On the school bus, a 1st-grader starts crying loudly that his throat itches and his lip looks swollen. He just shared a granola bar with another kid and his backpack has a "PEANUT ALLERGY" tag on it.') },
        { id: 'fb3', difficulty: 'intermediate',
          text: __alloT('stem.firstresponse.your_aunt_is_over_for_dinner_mid_conve', 'Your aunt is over for dinner. Mid-conversation she suddenly can’t lift her right arm to take a glass of water. Her smile is uneven on one side and she keeps trying to say "I’m fine" but it comes out garbled. Time is 7:14 PM.') },
        { id: 'fb4', difficulty: 'intermediate',
          text: __alloT('stem.firstresponse.at_the_skate_park_a_kid_wipes_out_and_', 'At the skate park, a kid wipes out and lies on the ground bleeding heavily from a deep gash on her thigh. Blood is pooling on the concrete. The nearest hospital is 25 minutes away.') },
        { id: 'fb5', difficulty: 'advanced',
          text: __alloT('stem.firstresponse.you_walk_into_a_friend_s_house_unannou', 'You walk into a friend’s house unannounced. He’s on the bathroom floor, lips blue, breathing slowly and shallowly. There’s a small empty pill bottle and a vape pen near him. His phone is buzzing on the counter.') },
        { id: 'fb6', difficulty: 'advanced',
          text: __alloT('stem.firstresponse.at_lunch_a_classmate_who_is_deaf_taps_', 'At lunch, a classmate who is Deaf taps you and points at another student across the cafeteria who is alone, eyes wide, hands gripping the edge of the table, breathing fast and shallow. You don’t know if they’re having a heart attack or a panic attack.') }
      ];

      // Hardcoded ground-truth signal list. The AI critique prompt references
      // these so the model can't invent its own protocol numbers.
      var PROTOCOL_GROUND_TRUTH = [
        'Always call 911 (or text 911) for any unresponsive person, suspected stroke, severe bleeding, anaphylaxis, suspected overdose, suspected cardiac arrest, severe burn, or breathing emergency.',
        'CPR: 100–120 bpm with full recoil. Depth: at least 2 inches on an adult, about 2 inches on a child, and about 1.5 inches on an infant. Give conventional CPR with breaths for infants and children if able; for adult sudden collapse, untrained rescuers should start hands-only compressions. Continue until EMS or AED takes over.',
        'AED: turn it on, follow voice/visual prompts. AEDs will not shock someone who does not need it.',
        'Stop the Bleed: call 911 and apply direct pressure. If trained, use a tourniquet for life-threatening limb bleeding; pack an appropriate deep wound where a tourniquet cannot be used. Place a tourniquet 2–3 inches above the wound, not over a joint; tighten until bleeding stops, note the time, and do not loosen it.',
        'Choking adult/child: 5 back blows + 5 abdominal thrusts. Pregnant or large person: 5 back blows + 5 chest thrusts. Infant: 5 back blows + 5 chest thrusts (NEVER abdominal). Unconscious: lower, 911, CPR.',
        'Stroke recognition: BE FAST (Balance, Eyes, Face, Arms, Speech, Time). Note exact onset time. Do NOT give food, water, or aspirin.',
        'Anaphylaxis: EpiPen IM in outer thigh, hold 3 sec. Call 911 even if symptoms improve.',
        'Seizure: NEVER restrain. NEVER put anything in the mouth. Time it. Cushion head. Recovery position afterward only if breathing normally. 911 if >5 min, repeats, first-ever, in water, or injury.',
        'Hypoglycemia: 15g fast carb if alert and able to swallow. If unconscious: 911; recovery position only if breathing normally, otherwise CPR. Never put food or liquid in their mouth.',
        'Suspected overdose: 911. If not breathing normally, start CPR or rescue breathing as dispatch directs. Give naloxone if available. Recovery position only if breathing normally. Maine Good Samaritan law protects bystanders.',
        'Mental health crisis: 988 (call or text) for non-life-threat; 911 only if immediate life threat. Stay with the person. Tell a trusted adult.',
        'Deaf/HoH patients: text-to-911 (Maine has it). Face them. Don’t shout. Use phone-typing apps. AEDs show visual prompts.',
        'Autistic peer in distress: lower sensory load, predictable verbal warnings before touch, short literal sentences, allow stims, recognize meltdown ≠ tantrum.'
      ];

      function renderAiPractice() {
        var aiView = d.aiView || 'overview';
        var aiDifficulty = d.aiDifficulty || 'basic';
        var aiScene = d.aiScene || null; // { id, text, difficulty }
        var aiResponse = d.aiResponse || '';
        var aiCritique = d.aiCritique || null;
        var aiLoadingScene = !!d.aiLoadingScene;
        var aiLoadingCritique = !!d.aiLoadingCritique;
        var callGemini = ctx.callGemini || null;

        var AI_TAB_IDS = ['overview', 'practice'];
        function aiTabKeyDown(e, index) {
          var key = e.key;
          if (key !== 'ArrowRight' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return;
          e.preventDefault();
          var nextIndex = index;
          if (key === 'ArrowRight' || key === 'ArrowDown') nextIndex = (index + 1) % AI_TAB_IDS.length;
          if (key === 'ArrowLeft' || key === 'ArrowUp') nextIndex = (index - 1 + AI_TAB_IDS.length) % AI_TAB_IDS.length;
          if (key === 'Home') nextIndex = 0;
          if (key === 'End') nextIndex = AI_TAB_IDS.length - 1;
          var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
          var nextTab = tabs[nextIndex];
          if (nextTab) { nextTab.focus(); nextTab.click(); }
        }

        function tabBtn(id, label) {
          var active = aiView === id;
          return h('button', { 'data-fr-focusable': true, key: id, role: 'tab',
            id: 'firstresponse-ai-tab-' + id,
            'aria-controls': 'firstresponse-ai-panel-' + id,
            'aria-selected': active ? 'true' : 'false',
            tabIndex: active ? 0 : -1,
            onKeyDown: function(e) { aiTabKeyDown(e, AI_TAB_IDS.indexOf(id)); },
            onClick: function() { upd('aiView', id); frAnnounce(label); },
            style: btn({
              padding: '6px 12px', fontSize: 12,
              background: active ? T.accent : T.card,
              color: active ? '#fff' : T.text,
              borderColor: active ? T.accent : T.border
            })
          }, label);
        }

        function pickFallback() {
          var pool = FALLBACK_SCENES.filter(function(s) { return s.difficulty === aiDifficulty; });
          if (pool.length === 0) pool = FALLBACK_SCENES;
          var prev = aiScene ? aiScene.id : null;
          // Prefer one that's different from the previous pick.
          var candidates = pool.filter(function(s) { return s.id !== prev; });
          if (candidates.length === 0) candidates = pool;
          return candidates[Math.floor(Math.random() * candidates.length)];
        }

        function generateScene() {
          // No callGemini available: serve a fallback scene.
          if (!callGemini) {
            var fb = pickFallback();
            updMulti({ aiScene: fb, aiResponse: '', aiCritique: null });
            frAnnounce(__alloT('stem.firstresponse.sr_new_scene_loaded', 'New scene loaded.'));
            return;
          }
          upd('aiLoadingScene', true);
          frAnnounce(__alloT('stem.firstresponse.sr_generating_scene', 'Generating scene...'));
          var prompt = 'Write ONE realistic medical-emergency scene for a teen first-aid trainee. Length: 2–3 short sentences. Difficulty: ' + aiDifficulty + '.\n\n' +
            'Pick from these emergency types: cardiac arrest, anaphylaxis, choking, stroke, seizure, severe bleeding, hypoglycemia, overdose, panic attack, mental-health crisis. Vary across calls.\n\n' +
            'Set in a school, sports field, bus, home, or skate park. Include enough recognition cues that an alert trainee could identify the emergency. Do NOT include the diagnosis, do NOT name the protocol, do NOT include "what should you do?" — just describe the scene.\n\n' +
            'Output ONLY the scene text, no preamble, no markdown. Plain text only.';
          callGemini(prompt, { maxOutputTokens: 220 })
            .then(function(text) {
              var clean = String(text || '').trim();
              if (!clean) throw new Error('Empty response');
              var scene = { id: 'ai-' + Date.now(), text: clean, difficulty: aiDifficulty };
              updMulti({ aiScene: scene, aiResponse: '', aiCritique: null, aiLoadingScene: false });
              frAnnounce(__alloT('stem.firstresponse.sr_scene_loaded', 'Scene loaded.'));
            })
            .catch(function(e) {
              console.warn('[FirstResponse] AI scene generation failed; falling back.', e);
              var fb = pickFallback();
              updMulti({ aiScene: fb, aiResponse: '', aiCritique: null, aiLoadingScene: false });
              addToast('AI unavailable — using a built-in scene.');
              frAnnounce(__alloT('stem.firstresponse.sr_ai_unavailable_using_a_built_in_scene', 'AI unavailable. Using a built-in scene.'));
            });
        }

        function getCritique() {
          if (!aiScene || !aiResponse.trim()) return;
          if (!callGemini) {
            // Local fallback: keyword scaffold critique.
            var resp = aiResponse.toLowerCase();
            var checks = [
              { ok: /\b911\b|text\s*911|988\b/.test(resp), msg: 'Did you call 911 (or 988 / text-911)? Most life-threatening emergencies need EMS dispatch immediately.' },
              { ok: /(check|respond|shake|shout|are you ok|conscious)/i.test(resp), msg: 'Did you check responsiveness before doing anything else?' },
              { ok: /(stay|with|don.?t leave|next to)/i.test(resp), msg: 'Did you mention staying with the person until help arrives?' },
              { ok: /(direct\s*pressure|cpr|epipen|recovery\s*position|back\s*blows|abdominal|tourniquet|ae?d|sugar|juice|988)/i.test(resp), msg: 'Did you reference a specific protocol that matches the scene?' }
            ];
            var critiqueText = 'Local check (no AI available):\n\n' + checks.map(function(c) {
              return (c.ok ? '✓ ' : '✗ ') + c.msg;
            }).join('\n\n');
            updMulti({ aiCritique: { text: critiqueText, source: 'local' } });
            frAnnounce(__alloT('stem.firstresponse.sr_local_critique_ready', 'Local critique ready.'));
            return;
          }
          upd('aiLoadingCritique', true);
          frAnnounce(__alloT('stem.firstresponse.sr_getting_critique', 'Getting critique...'));
          var prompt = 'You are a first-aid instructor reviewing a student’s response to an emergency scene.\n\n' +
            'SCENE:\n' + aiScene.text + '\n\n' +
            'STUDENT RESPONSE:\n' + aiResponse + '\n\n' +
            'GROUND TRUTH PROTOCOLS (do not deviate from these — if the student response conflicts, flag it):\n' +
            PROTOCOL_GROUND_TRUTH.map(function(p, i) { return (i + 1) + '. ' + p; }).join('\n') + '\n\n' +
            'CRITIQUE the student’s response. Specifically:\n' +
            '1. Did they identify the emergency correctly? (If wrong, say what it actually is.)\n' +
            '2. Did they call 911 (or 988 for mental-health, or 1-800-222-1222 for poison)? If not, flag it.\n' +
            '3. Did they apply the right protocol step from the ground-truth list? Cite the protocol number.\n' +
            '4. What did they MISS or get WRONG?\n' +
            '5. What did they get RIGHT?\n\n' +
            'IMPORTANT: Do NOT make up clinical numbers, drug doses, or protocol steps not in the ground-truth list. ' +
            'Do NOT answer clinical decision questions ("should I give X medication") — instead say "follow what is prescribed and call 911." ' +
            'Do NOT diagnose for the student — your job is to grade their reasoning. ' +
            'End with: "Educational only. Real emergencies → 911. Get certified → redcross.org."\n\n' +
            'Tone: warm, direct, like a school-based mentor. 4–6 sentences total.';
          callGemini(prompt, { maxOutputTokens: 500 })
            .then(function(text) {
              var clean = String(text || '').trim();
              if (!clean) throw new Error('Empty response');
              updMulti({ aiCritique: { text: clean, source: 'ai' }, aiLoadingCritique: false });
              awardBadge('ai_practice', 'AI Practice (got a scene critiqued)');
              frAnnounce(__alloT('stem.firstresponse.sr_critique_ready', 'Critique ready.'));
            })
            .catch(function(e) {
              console.warn('[FirstResponse] AI critique failed; falling back.', e);
              upd('aiLoadingCritique', false);
              addToast('AI critique unavailable — try the local check.');
              // Recurse via local fallback:
              var resp = aiResponse.toLowerCase();
              var checks = [
                { ok: /\b911\b|text\s*911|988\b/.test(resp), msg: 'Did you call 911 (or 988 / text-911)?' },
                { ok: /(check|respond|shake|shout|are you ok)/i.test(resp), msg: 'Did you check responsiveness first?' },
                { ok: /(stay|with|don.?t leave)/i.test(resp), msg: 'Did you stay with the person?' },
                { ok: /(direct\s*pressure|cpr|epipen|recovery|back\s*blows|abdominal|tourniquet|ae?d|sugar|juice|988)/i.test(resp), msg: 'Did you reference a specific protocol?' }
              ];
              var critiqueText = 'AI was unavailable — here is a local check:\n\n' + checks.map(function(c) {
                return (c.ok ? '✓ ' : '✗ ') + c.msg;
              }).join('\n\n');
              updMulti({ aiCritique: { text: critiqueText, source: 'local' } });
            });
        }

        function aiOverview() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.firstresponse.how_ai_practice_works', '🤖 How AI Practice works')),
              h('ol', { style: { margin: '0 0 0 18px', color: T.muted, fontSize: 13, lineHeight: 1.7 } },
                h('li', null, __alloT('stem.firstresponse.pick_a_difficulty_generate_a_novel_sce', 'Pick a difficulty. Generate a novel scene.')),
                h('li', null, __alloT('stem.firstresponse.write_your_response_in_2_3_sentences_w', 'Write your response in 2–3 sentences: what you’d do, in what order.')),
                h('li', null, __alloT('stem.firstresponse.get_critique_the_ai_grades_your_reason', 'Get critique. The AI grades your reasoning against the protocols hardcoded in this tool.')),
                h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.the_ai_never_gives_clinical_decisions', 'The AI never gives clinical decisions')),
                  __alloT('stem.firstresponse.it_only_checks_your_reasoning_for_shou', ' — it only checks your reasoning. For "should I give X" questions, the answer is always "follow what’s prescribed + call 911."'))
              )
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.without_an_ai_key', 'Without an AI key: ')),
              __alloT('stem.firstresponse.the_module_still_works_pre_written_sce', 'the module still works — pre-written scenes are bundled, and a local keyword check stands in for AI critique.'))
          );
        }

        function aiPractice() {
          var difficulties = [
            { id: 'basic', label: __alloT('stem.firstresponse.basic_single_emergency_clear_cues', 'Basic — single emergency, clear cues') },
            { id: 'intermediate', label: __alloT('stem.firstresponse.intermediate_needs_recognition_decisio', 'Intermediate — needs recognition + decision') },
            { id: 'advanced', label: __alloT('stem.firstresponse.advanced_ambiguity_multiple_issues', 'Advanced — ambiguity / multiple issues') }
          ];
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.firstresponse.pick_difficulty', '⚙️ Pick difficulty')),
              h('div', { role: 'radiogroup', 'aria-label': __alloT('stem.firstresponse.difficulty', 'Difficulty'),
                style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                difficulties.map(function(diff) {
                  var active = aiDifficulty === diff.id;
                  return h('button', { key: diff.id, 'data-fr-focusable': true,
                    role: 'radio', 'aria-checked': active ? 'true' : 'false',
                    onClick: function() { upd('aiDifficulty', diff.id); frAnnounce(diff.label); },
                    style: btn({
                      padding: '8px 12px', fontSize: 12,
                      background: active ? '#1e3a8a' : T.cardAlt,
                      color: active ? '#dbeafe' : T.text,
                      borderColor: active ? '#1e40af' : T.border
                    })
                  }, (active ? '◉ ' : '○ ') + diff.label);
                })
              ),
              h('div', { style: { marginTop: 12 } },
                h('button', { 'data-fr-focusable': true,
                  'aria-label': aiLoadingScene ? 'Generating scene...' : 'Generate a new scene',
                  'aria-busy': aiLoadingScene ? 'true' : 'false',
                  disabled: aiLoadingScene,
                  onClick: generateScene, style: btnPrimary({ opacity: aiLoadingScene ? 0.6 : 1 })
                }, aiLoadingScene ? '⏳ Generating...' : '🎲 Generate scene')
              )
            ),
            aiScene && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.firstresponse.the_scene', '📖 The scene')),
              h('p', { style: { margin: 0, color: T.text, fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' } }, aiScene.text),
              aiScene.id && aiScene.id.indexOf('fb') === 0 && h('div', { style: { marginTop: 6, fontSize: 10, color: T.dim, fontStyle: 'italic' } }, __alloT('stem.firstresponse.bundled_scene_no_ai_used', 'Bundled scene (no AI used).'))
            ),
            aiScene && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('label', { htmlFor: 'fr-ai-response', style: { display: 'block', fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 6 } },
                __alloT('stem.firstresponse.your_response_2_3_sentences', '✏️ Your response (2–3 sentences)')),
              h('textarea', { id: 'fr-ai-response', 'data-fr-focusable': true,
                value: aiResponse,
                onChange: function(e) { upd('aiResponse', e.target.value); },
                placeholder: __alloT('stem.firstresponse.what_do_you_do_and_in_what_order_be_sp', 'What do you do, and in what order? Be specific (call 911? CPR? AED? EpiPen? recovery position?).'),
                'aria-label': __alloT('stem.firstresponse.your_emergency_response_2_to_3_sentenc', 'Your emergency response, 2 to 3 sentences'),
                rows: 4,
                style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid ' + T.border, background: T.bg, color: T.text, fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }
              }),
              h('div', { style: { marginTop: 8, fontSize: 11, color: T.dim, marginBottom: 8 } },
                aiResponse.length, __alloT('stem.firstresponse.characters_aim_for_150_400', ' characters. Aim for ~150–400.')),
              h('button', { 'data-fr-focusable': true,
                'aria-label': aiLoadingCritique ? 'Getting critique...' : 'Get AI critique of your response',
                'aria-busy': aiLoadingCritique ? 'true' : 'false',
                disabled: aiLoadingCritique || !aiResponse.trim(),
                onClick: getCritique,
                style: btnPrimary({ opacity: (aiLoadingCritique || !aiResponse.trim()) ? 0.6 : 1 })
              }, aiLoadingCritique ? '⏳ Critiquing...' : '🎓 Get critique')
            ),
            aiCritique && h('div', { style: { padding: 14, borderRadius: 10, background: '#1e3a8a', border: '1px solid #1e40af', color: '#dbeafe' } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15 } }, __alloT('stem.firstresponse.critique', '🎓 Critique')),
              h('div', { style: { whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6 } }, aiCritique.text),
              h('div', { style: { marginTop: 10, fontSize: 10, opacity: 0.75, fontStyle: 'italic' } },
                aiCritique.source === 'ai' ? 'Critique generated by AI; protocol references are checked against this tool’s hardcoded ground truth.' : 'Local keyword check (AI unavailable).')
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🤖 AI Practice'),
          emergencyBanner(),
          h('div', { role: 'tablist', 'aria-label': __alloT('stem.firstresponse.ai_practice_sections', 'AI Practice sections'),
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('overview', 'How it works'),
            tabBtn('practice', 'Practice')
          ),
          h('div', { role: 'tabpanel',
            id: 'firstresponse-ai-panel-' + aiView,
            'aria-labelledby': 'firstresponse-ai-tab-' + aiView,
            tabIndex: 0
          },
            aiView === 'overview' && aiOverview(),
            aiView === 'practice' && aiPractice(),
            disclaimerFooter()
          )
        );
      }

      // ─────────────────────────────────────────
      // RESOURCES tab — directory of every cited org
      // No consent gate; available even before consent for emergencies.
      // ─────────────────────────────────────────
      function renderResources() {
        function section(title, items) {
          return h('div', { style: { marginBottom: 16, padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, title),
            items.map(function(r, i) {
              return h('div', { key: i, style: { padding: '8px 0', borderBottom: i < items.length - 1 ? '1px solid ' + T.border : 'none' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 16 } }, r.icon),
                  h('span', { style: { fontWeight: 700, fontSize: 13, color: T.text } }, r.name)
                ),
                h('div', { style: { fontSize: 13, color: T.accentHi, fontWeight: 600, marginLeft: 24 } },
                  r.url
                    ? h('a', { href: r.url, target: '_blank', rel: 'noopener', style: { color: T.accentHi, textDecoration: 'underline' }, 'aria-label': r.name + ' — ' + r.contact + ' (opens in new tab)' }, r.contact)
                    : r.contact),
                h('div', { style: { fontSize: 11, color: T.dim, marginLeft: 24, lineHeight: 1.5 } }, r.desc)
              );
            })
          );
        }
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📚 Resources'),
          emergencyBanner(),
          h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            __alloT('stem.firstresponse.every_org_cited_in_this_tool_on_a_phon', 'Every org cited in this tool. On a phone, tap a phone number to call. '),
            h('strong', { style: { color: T.accentHi } }, __alloT('stem.firstresponse.maine_note', 'Maine note: ')), MAINE_EMS.text911),
          section('🚑 Emergency', RESOURCES.emergency),
          section('💚 Crisis & mental health', RESOURCES.crisis),
          section('✚ Get certified', RESOURCES.certification),
          section('⚡ Condition-specific', RESOURCES.conditions),
          section('♾️ Disability advocacy', RESOURCES.disabilityAdvocacy),
          h('div', { style: { marginTop: 8, padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('div', { style: { fontWeight: 700, color: T.text, marginBottom: 6 } }, __alloT('stem.firstresponse.maine_reality_2', '🌲 Maine reality')),
            h('div', { style: { marginBottom: 4 } }, MAINE_EMS.ruralEta),
            h('div', { style: { marginBottom: 4 } }, MAINE_EMS.heartAed),
            h('div', { style: { marginBottom: 4 } }, MAINE_EMS.crisisRoute),
            h('div', null, MAINE_EMS.poison)
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // FIRST ACTION SLEUTH — connect observations to actions.
      // Clue + action practice. First submissions stay in the review even after correction.
      function renderFirstActionSleuth() {
        var ACTIONS = FA_ACTIONS;
        var saved = d.faPractice;
        function caseById(id) { return FA_CASES.filter(function (v) { return v.id === id; })[0]; }
        function actionLabel(id) { var a = ACTIONS.filter(function (item) { return item.id === id; })[0]; return a ? a.label : ''; }
        function validRecord(r, v) {
          return r && Number.isInteger(r.firstCue) && r.firstCue >= 0 && r.firstCue < 3 && ACTIONS.some(function (a) { return a.id === r.firstAction; }) &&
            Number.isInteger(r.attempts) && r.attempts > 0 && typeof r.hintUsed === 'boolean' && typeof r.complete === 'boolean' &&
            (!r.complete || (r.finalCue === 0 && r.finalAction === v.correct));
        }
        var valid = saved && saved.version === 1 && Array.isArray(saved.queue) && saved.queue.length > 0 && saved.queue.length <= 10 &&
          saved.queue.every(function (id, i) { return !!caseById(id) && saved.queue.indexOf(id) === i; }) &&
          Number.isInteger(saved.position) && saved.position >= 0 && saved.position <= saved.queue.length &&
          Array.isArray(saved.log) && saved.log.length >= saved.position && saved.log.length <= Math.min(saved.position + 1, saved.queue.length) &&
          saved.log.every(function (r, i) { return validRecord(r, caseById(saved.queue[i])) && (i >= saved.position || r.complete); }) &&
          (saved.cue === null || (Number.isInteger(saved.cue) && saved.cue >= 0 && saved.cue < 3)) &&
          (saved.action === null || ACTIONS.some(function (a) { return a.id === saved.action; }));
        var p = valid ? saved : null;
        function begin(ids, mode) {
          var queue = ids.slice(), seed = Number.isInteger(d.faSeed) && d.faSeed > 0 ? d.faSeed % 2147483647 : 7;
          for (var i = queue.length - 1; i > 0; i--) {
            seed = (seed * 16807) % 2147483647;
            var j = seed % (i + 1), hold = queue[i]; queue[i] = queue[j]; queue[j] = hold;
          }
          updMulti({ faSeed: seed || 7, faPractice: { version: 1, queue: queue, mode: mode || 'all', position: 0, log: [], cue: null, action: null, hintUsed: false, feedback: null, run: (d.faRun || 0) + 1 }, faRun: (d.faRun || 0) + 1 });
        }
        function change(values) { upd('faPractice', Object.assign({}, p, values)); }
        function source(v) { var s = FA_SOURCES[v.source]; return h('div', { className: 'fr-reason-source' }, h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.name)); }
        function routeArt() {
          return h('svg', { viewBox: '0 0 330 160', className: 'fr-reason-route', 'aria-hidden': 'true', focusable: 'false' },
            h('path', { d: 'M52 80H278', stroke: '#385b73', strokeWidth: 5, strokeDasharray: '6 5' }),
            [52, 165, 278].map(function (x, i) { return h('g', { key: x }, h('circle', { cx: x, cy: 80, r: 34, fill: '#123b43', stroke: '#5eead4', strokeWidth: 2 }), h('text', { x: x, y: 89, textAnchor: 'middle', fill: '#ccfbf1', fontSize: 25, fontWeight: 800 }, String(i + 1))); }),
            h('path', { d: 'M94 74L101 80L94 86 M207 74L214 80L207 86', stroke: '#99f6e4', strokeWidth: 3, fill: 'none' }));
        }
        function shell(body) { return h('div', { className: 'fr-reason' }, backBar(__alloT('stem.firstresponse.reason_name', 'First Action Sleuth')), body, disclaimerFooter()); }
        function stats(items) { return h('div', { className: 'fr-reason-stats' }, items.map(function (item, i) { return h('div', { key: i, className: 'fr-reason-card' }, h('strong', null, item[0]), h('span', null, item[1])); })); }
        if (!p) {
          return shell(h('div', null,
            h('section', { className: 'fr-reason-hero fr-reason-intro' }, h('div', null,
              h('p', { className: 'fr-reason-eyebrow' }, __alloT('stem.firstresponse.reason_eyebrow', 'NOTICE · DECIDE · EXPLAIN')),
              h('h2', { tabIndex: -1, 'data-fr-reason-heading': true }, __alloT('stem.firstresponse.reason_intro_title', 'Find the clue. Choose the action.')),
              h('p', null, __alloT('stem.firstresponse.reason_intro_text', 'Connect what you observe to the next helpful action in 10 short scenes. Take time to reason; there is no timer.'))), routeArt()),
            saved && h('p', { role: 'status' }, __alloT('stem.firstresponse.reason_invalid', 'This saved practice cannot be resumed. Start a fresh set; your practice record is still available.')),
            h('div', { className: 'fr-reason-steps' }, [
              [__alloT('stem.firstresponse.reason_notice_title', 'Notice the key clue'), __alloT('stem.firstresponse.reason_notice_body', 'Pick the observation that matters most. Separate evidence from background details and guesses.')],
              [__alloT('stem.firstresponse.reason_decide_title', 'Choose your next action'), __alloT('stem.firstresponse.reason_decide_body', 'Use the people, phone, and equipment described. Some tasks can happen at the same time.')],
              [__alloT('stem.firstresponse.reason_explain_title', 'Explain and revisit'), __alloT('stem.firstresponse.reason_explain_body', 'Read the reasoning, compare a changed situation, then revisit the decisions that needed support.')]
            ].map(function (item, i) { return h('div', { key: i, className: 'fr-reason-card' }, h('span', { className: 'fr-reason-number', 'aria-hidden': 'true' }, i + 1), h('h3', null, item[0]), h('p', null, item[1])); })),
            h('p', { className: 'fr-reason-context' }, __alloT('stem.firstresponse.reason_context', 'Practice role: an adult helper with the training stated in each scene. Scene safety has already been checked. In a real emergency, get help and give care within your training.')),
            h('div', { className: 'fr-reason-actions' },
              h('button', { style: btnPrimary(), 'data-fr-focusable': true, onClick: function () { begin(FA_CASES.map(function (v) { return v.id; })); } }, __alloT('stem.firstresponse.reason_start', 'Start 10-scene practice')),
              h('button', { style: btn(), 'data-fr-focusable': true, onClick: function () { upd('view', 'mastery'); } }, __alloT('stem.firstresponse.reason_record_button', 'Open practice record'))),
            h('details', null, h('summary', null, __alloT('stem.firstresponse.reason_actions_reference', 'Review the six actions')), h('div', { className: 'fr-reason-records' }, ACTIONS.map(function (a) { return h('div', { className: 'fr-reason-card', key: a.id }, h('h3', null, a.label), h('p', null, a.def)); })))
          ));
        }
        if (p.position === p.queue.length) {
          var independent = p.log.filter(function (r, i) { return faIndependent(r, caseById(p.queue[i])); }).length;
          var revisit = p.queue.filter(function (id, i) { return !faIndependent(p.log[i], caseById(id)); });
          return shell(h('div', null,
            h('section', { className: 'fr-reason-hero' }, h('p', { className: 'fr-reason-eyebrow' }, __alloT('stem.firstresponse.reason_review_eyebrow', 'YOUR DECISION REVIEW')),
              h('h2', { tabIndex: -1, 'data-fr-reason-heading': true }, __alloT('stem.firstresponse.reason_review_title', 'Clues connected to actions')),
              h('p', null, __alloT('stem.firstresponse.reason_review_body', 'The first check shows what you chose before correction. A supported decision is a useful next practice target.')),
              stats([[independent + ' / ' + p.queue.length, __alloT('stem.firstresponse.reason_independent', 'First check, without a hint')], [revisit.length, __alloT('stem.firstresponse.reason_supported', 'Practiced with support')], [p.queue.length, __alloT('stem.firstresponse.reason_completed', 'Scenes completed')]])),
            h('div', { className: 'fr-reason-actions' },
              revisit.length > 0 && h('button', { style: btnPrimary(), 'data-fr-focusable': true, onClick: function () { begin(revisit, 'revisit'); } }, __alloT('stem.firstresponse.reason_revisit', 'Revisit supported decisions')),
              h('button', { style: btn(), 'data-fr-focusable': true, onClick: function () { begin(FA_CASES.map(function (v) { return v.id; })); } }, __alloT('stem.firstresponse.reason_new_set', 'Start a new mixed set')),
              h('button', { style: btn(), 'data-fr-focusable': true, onClick: function () { upd('view', 'mastery'); } }, __alloT('stem.firstresponse.reason_record_button', 'Open practice record'))),
            h('ol', { className: 'fr-reason-review' }, p.queue.map(function (id, i) {
              var v = caseById(id), r = p.log[i], independentRound = faIndependent(r, v);
              return h('li', { key: id }, h('span', { className: 'fr-reason-tag' + (independentRound ? '' : ' supported') }, independentRound ? __alloT('stem.firstresponse.reason_independent', 'First check, without a hint') : __alloT('stem.firstresponse.reason_supported', 'Practiced with support')),
                h('h3', null, v.title),
                h('p', { className: 'fr-reason-first' }, h('strong', null, __alloT('stem.firstresponse.reason_first_check', 'Your first check: ')), v.cues[r.firstCue], ' → ', actionLabel(r.firstAction)),
                h('p', null, h('strong', null, __alloT('stem.firstresponse.reason_connection', 'Key connection: ')), v.cues[0], ' → ', actionLabel(v.correct)),
                h('p', null, v.why),
                h('details', null, h('summary', null, __alloT('stem.firstresponse.reason_transfer', 'If the situation changes')), h('p', null, v.transfer)), source(v));
            })),
            h('section', { className: 'fr-reason-reflect' }, h('h3', null, __alloT('stem.firstresponse.reason_reflect_title', 'Try it in your own words')),
              h('p', null, __alloT('stem.firstresponse.reason_reflect', 'Choose one scene. Explain: “I noticed ___, so I would ___ because ___.” Then change one detail and explain whether your action changes. You can speak, sign, write, or discuss with a partner.')),
              h('p', { className: 'fr-reason-muted' }, __alloT('stem.firstresponse.reason_limit', 'This record describes decisions in a practice activity. Hands-on training and certification assess practical skills.')))
          ));
        }
        var v = caseById(p.queue[p.position]), record = p.log[p.position], complete = !!(record && record.complete);
        function check() {
          if (complete || p.cue === null || p.action === null) return;
          var right = p.cue === 0 && p.action === v.correct;
          var r = Object.assign({}, record || { firstCue: p.cue, firstAction: p.action, attempts: 0, hintUsed: false },
            { finalCue: p.cue, finalAction: p.action, attempts: (record ? record.attempts : 0) + 1, hintUsed: !!p.hintUsed || !!(record && record.hintUsed), complete: right });
          var log = p.log.slice(); log[p.position] = r;
          var values = { faPractice: Object.assign({}, p, { log: log, feedback: { cue: p.cue === 0, action: p.action === v.correct } }) };
          if (right) {
            var all = Object.assign({}, d.faMastery || {}), previous = all[v.id] || {}, now = new Date().toISOString(), reasoned = faIndependent(r, v);
            all[v.id] = Object.assign({}, previous, { practiceCount: (Number(previous.practiceCount) || 0) + 1, lastPracticedAt: now,
              reasonedCount: (Number(previous.reasonedCount) || 0) + (reasoned ? 1 : 0),
              firstReasonedAt: previous.firstReasonedAt || (reasoned ? now : null), lastReasonedAt: reasoned ? now : previous.lastReasonedAt || null,
              lastResult: reasoned ? 'independent' : 'supported', action: v.correct, actionLabel: actionLabel(v.correct) });
            values.faMastery = all;
          }
          updMulti(values);
        }
        function next() { if (complete) change({ position: p.position + 1, cue: null, action: null, hintUsed: false, feedback: null }); }
        function options(items, kind) {
          var offset = (v.id + (p.run || 1)) % items.length;
          var ordered = items.slice(offset).concat(items.slice(0, offset));
          return h('div', { className: 'fr-reason-options' + (kind === 'action' ? ' fr-reason-action-options' : '') }, ordered.map(function (item) {
            var selected = p[kind] === item.id;
            return h('label', { className: 'fr-reason-option' + (selected ? ' selected' : ''), key: item.id },
              h('input', { type: 'radio', name: 'fr-reason-' + kind, value: item.id, checked: selected, disabled: complete,
                onChange: function () { var update = { feedback: null }; update[kind] = item.id; change(update); } }),
              h('span', null, item.icon && h('span', { 'aria-hidden': 'true' }, item.icon + ' '), item.label));
          }));
        }
        return shell(h('div', null,
          h('div', { className: 'fr-reason-headrow' }, h('span', null, (p.mode === 'revisit' ? __alloT('stem.firstresponse.reason_revisit_label', 'Revisit') : __alloT('stem.firstresponse.reason_practice_label', 'Practice')) + ' · ' + (p.position + 1) + ' / ' + p.queue.length), h('span', null, __alloT('stem.firstresponse.reason_no_timer', 'Take your time · No speed score'))),
          h('div', { className: 'fr-reason-dots', 'aria-hidden': 'true' }, p.queue.map(function (id, i) { return h('span', { key: id, className: i < p.position ? 'done' : i === p.position ? 'current' : '' }); })),
          h('section', { className: 'fr-reason-hero', 'aria-labelledby': 'fr-reason-title' }, h('p', { className: 'fr-reason-eyebrow' }, __alloT('stem.firstresponse.reason_scene_label', 'READ THE SCENE')),
            h('h2', { id: 'fr-reason-title', tabIndex: -1, 'data-fr-reason-heading': true }, v.title), h('p', null, v.scene)),
          h('p', { className: 'fr-reason-context' }, __alloT('stem.firstresponse.reason_scene_safe', 'Scene safety is already checked. Choose the key clue and your next action using the details above.')),
          h('div', { className: 'fr-reason-grid' },
            h('fieldset', null, h('legend', null, __alloT('stem.firstresponse.reason_clue_legend', '1. Which clue matters most?')), options(v.cues.map(function (cue, i) { return { id: i, label: cue }; }), 'cue')),
            h('fieldset', null, h('legend', null, __alloT('stem.firstresponse.reason_action_legend', '2. What would you do next?')), options(ACTIONS, 'action'))),
          h('div', { className: 'fr-reason-actions' },
            !complete && h('button', { style: btnPrimary(), 'data-fr-focusable': true, disabled: p.cue === null || p.action === null, onClick: check }, __alloT('stem.firstresponse.reason_check', 'Check my reasoning')),
            !complete && h('button', { style: btn(), 'data-fr-focusable': true, 'aria-expanded': !!p.hintUsed, 'aria-controls': 'fr-reason-hint', onClick: function () { change({ hintUsed: true }); } }, __alloT('stem.firstresponse.reason_hint_button', 'Use a reasoning hint')),
            complete && h('button', { style: btnPrimary(), 'data-fr-focusable': true, onClick: next }, p.position === p.queue.length - 1 ? __alloT('stem.firstresponse.reason_review_button', 'Review my decisions') : __alloT('stem.firstresponse.reason_next', 'Next scene'))),
          !complete && (p.cue === null || p.action === null) && h('p', { className: 'fr-reason-muted' }, __alloT('stem.firstresponse.reason_select_both', 'Select one clue and one action to check your reasoning.')),
          p.hintUsed && h('div', { className: 'fr-reason-hint', id: 'fr-reason-hint' }, h('strong', null, __alloT('stem.firstresponse.reason_hint_label', 'Reasoning hint: ')), v.cues[0], h('p', null, __alloT('stem.firstresponse.reason_hint_guide', 'Use this clue to choose an action. This round will be recorded as supported practice.'))),
          h('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, p.feedback && h('div', { className: 'fr-reason-feedback' + (complete ? ' is-complete' : '') },
            h('h3', null, complete ? __alloT('stem.firstresponse.reason_connected', 'Clue and action connected') : __alloT('stem.firstresponse.reason_rethink', 'Recheck the connection')),
            complete ? h('p', null, v.why) : h('ul', null,
              !p.feedback.cue && h('li', null, __alloT('stem.firstresponse.reason_cue_feedback', 'Choose an observed condition that changes the care needed, together with any help or equipment already available.')),
              !p.feedback.action && h('li', null, __alloT('stem.firstresponse.reason_action_feedback', 'Re-read who is already helping and what is happening now. Choose the action you can take next.')),
              p.feedback.cue && h('li', null, __alloT('stem.firstresponse.reason_cue_right', 'Your clue identifies the key condition. Now connect it to the next action.')),
              p.feedback.action && h('li', null, __alloT('stem.firstresponse.reason_action_right', 'Your action fits this scene. Choose the clue that explains why.'))),
            complete && h('div', { className: 'fr-reason-transfer' }, h('strong', null, __alloT('stem.firstresponse.reason_transfer', 'If the situation changes')), h('p', null, v.transfer)),
            complete && source(v))),
          h('div', { className: 'fr-reason-actions' }, h('button', { style: btn(), 'data-fr-focusable': true, onClick: function () { upd('view', 'mastery'); } }, __alloT('stem.firstresponse.reason_record_button', 'Open practice record')))
        ));
      }

      // ─────────────────────────────────────────
      // VIEW ROUTER
      // ─────────────────────────────────────────
      // ─────────────────────────────────────────
      // PRACTICE RECORD — first-check reasoning, support, and preserved history.
      function renderResponderMastery() {
        var record = (d.faMastery && typeof d.faMastery === 'object') ? d.faMastery : {};
        var independent = FA_CASES.filter(function (v) { return faReasoned(record[v.id]); });
        var supported = FA_CASES.filter(function (v) { return faPracticed(record[v.id]) && !faReasoned(record[v.id]); });
        var remaining = FA_CASES.filter(function (v) { return !faReasoned(record[v.id]); });
        function start(ids) {
          updMulti({ view: 'firstAction', faPractice: { version: 1, queue: ids, mode: ids.length < 10 ? 'revisit' : 'all', position: 0, log: [], cue: null, action: null, hintUsed: false, feedback: null, run: (d.faRun || 0) + 1 }, faRun: (d.faRun || 0) + 1 });
        }
        return h('div', { className: 'fr-reason' }, backBar(__alloT('stem.firstresponse.reason_record_title', 'First Action practice record')),
          h('section', { className: 'fr-reason-hero' }, h('p', { className: 'fr-reason-eyebrow' }, __alloT('stem.firstresponse.reason_record_eyebrow', 'BUILD YOUR REASONING')),
            h('h2', { tabIndex: -1, 'data-fr-reason-heading': true }, __alloT('stem.firstresponse.reason_record_heading', 'What to practice next')),
            h('p', null, __alloT('stem.firstresponse.reason_record_intro', 'A reasoned decision means the key clue and action were both correct on the first check, without a hint. Repeated practice builds familiarity; this record does not measure emergency readiness.')),
            h('div', { className: 'fr-reason-stats' }, [
              [independent.length + ' / 10', __alloT('stem.firstresponse.reason_record_reasoned', 'Scenes reasoned through')],
              [supported.length, __alloT('stem.firstresponse.reason_record_supported', 'Supported scenes to revisit')],
              [remaining.length, __alloT('stem.firstresponse.reason_record_remaining', 'Scenes for another check')]
            ].map(function (item, i) { return h('div', { key: i, className: 'fr-reason-card' }, h('strong', null, item[0]), h('span', null, item[1])); })),
            h('div', { className: 'fr-reason-actions' },
              remaining.length > 0 && h('button', { style: btnPrimary(), 'data-fr-focusable': true, onClick: function () { start(remaining.map(function (v) { return v.id; })); } }, __alloT('stem.firstresponse.reason_record_target', 'Practice remaining scenes')),
              h('button', { style: btn(), 'data-fr-focusable': true, onClick: function () { upd('view', 'firstAction'); } }, d.faPractice ? __alloT('stem.firstresponse.reason_resume', 'Return to current practice') : __alloT('stem.firstresponse.reason_record_open', 'Open First Action Sleuth')))),
          h('section', { 'aria-labelledby': 'fr-reason-coverage' }, h('h3', { id: 'fr-reason-coverage' }, __alloT('stem.firstresponse.reason_coverage', 'Connections by action')),
            h('div', { className: 'fr-reason-steps' }, FA_ACTIONS.map(function (a) {
              var cases = FA_CASES.filter(function (v) { return v.correct === a.id; });
              var done = cases.filter(function (v) { return faReasoned(record[v.id]); }).length;
              return h('div', { key: a.id, className: 'fr-reason-card' }, h('h3', null, h('span', { 'aria-hidden': 'true' }, a.icon + ' '), a.label), h('p', null, done + ' / ' + cases.length + ' · ' + __alloT('stem.firstresponse.reason_coverage_label', 'clue + action, first check')));
            }))),
          h('section', { 'aria-labelledby': 'fr-reason-scenes' }, h('h3', { id: 'fr-reason-scenes' }, __alloT('stem.firstresponse.reason_record_scenes', 'Choose a scene to revisit')),
            h('div', { className: 'fr-reason-records' }, FA_CASES.map(function (v) {
              var entry = record[v.id] || {}, reasoned = faReasoned(entry), practiced = faPracticed(entry), legacy = !!entry.firstCorrectAt || !!entry.correctCount;
              var label = reasoned ? __alloT('stem.firstresponse.reason_record_done', 'Clue + action connected') : practiced ? __alloT('stem.firstresponse.reason_supported', 'Practiced with support') : legacy ? __alloT('stem.firstresponse.reason_legacy', 'Earlier action-only practice') : __alloT('stem.firstresponse.reason_not_yet', 'Not practiced yet');
              return h('article', { className: 'fr-reason-card', key: v.id }, h('span', { className: 'fr-reason-tag' + (reasoned ? '' : ' supported') }, label),
                h('h3', null, v.title),
                (practiced || reasoned) && h('p', { className: 'fr-reason-muted' }, __alloT('stem.firstresponse.reason_checks_count', 'Checks without support: ') + (Number(entry.reasonedCount) || 0) + ' · ' + __alloT('stem.firstresponse.reason_practices_count', 'Completed practices: ') + (Number(entry.practiceCount) || 0)),
                legacy && h('details', null, h('summary', null, __alloT('stem.firstresponse.reason_legacy_details', 'Earlier practice history')), h('p', null, __alloT('stem.firstresponse.reason_legacy_body', 'Your previous action-only result is preserved. The updated activity also checks the observation behind the action.'))),
                h('button', { style: btn(), 'data-fr-focusable': true, onClick: function () { start([v.id]); }, 'aria-label': __alloT('stem.firstresponse.reason_practice_scene', 'Practice scene: ') + v.title }, __alloT('stem.firstresponse.reason_practice_this', 'Practice this scene')));
            }))),
          h('p', { className: 'fr-reason-context', style: { marginTop: 20 } }, __alloT('stem.firstresponse.reason_record_saved', 'Completed practice records are saved on this device. A session can be resumed while you move between lab activities.')),
          disclaimerFooter()
        );
      }

      // Consent gate blocks every view EXCEPT 'resources' (emergencies always
      // need access to phone numbers, even from a fresh install).
      if (!consentAccepted && view !== 'resources') {
        return renderConsent();
      }
      // ─────────────────────────────────────────
      // BODY 3D — hand placement, depth/recoil, recovery position
      //
      // Same accessibility contract used across these 3D modules: the canvas
      // is aria-hidden and every target is also a real button. A student on a
      // screen reader, a locked-down Chromebook or a blocked CDN loses the
      // picture and loses none of the teaching.
      // ─────────────────────────────────────────
      function renderBody3D() {
        var tab = d.b3dTab || 'gate';
        var placed = d.b3dPlaced || null;
        var pad = d.b3dPad || null;
        var mech = d.b3dMech || null;
        var gate = d.b3dGate || null;
        var age = d.b3dAge || 'adult';
        var childHands = d.b3dChildHands === 'two' ? 'two' : 'one';
        var recDone = d.b3dRec || [];
        var recPose = typeof d.b3dRecView === 'number' && isFinite(d.b3dRecView)
          ? Math.max(0, Math.min(recDone.length, Math.floor(d.b3dRecView))) : recDone.length;
        var recRolled = RECOVERY_STEPS.slice(0, recPose).some(function (s) { return s.id === 'roll'; });
        var violations = d.b3dViolations || [];
        var st3 = (BODY3D.status() === 'failed') ? 'failed' : (d.b3dStatus || 'idle');
        // The correct AED layout depends on the age, so the pad list does too.
        var agePads = aedPadsForAge(age);
        function padInLayout(id) {
          for (var pi = 0; pi < agePads.length; pi++) if (agePads[pi].id === id) return true;
          return false;
        }
        // Drop picks that belong to the other layout. Switching age swaps which
        // targets exist, and a leftover padUR would otherwise sit in the list
        // marking an infant as correctly padded with a layout that is not shown.
        var padSelections = (Array.isArray(d.b3dPads) ? d.b3dPads : (pad ? [pad] : [])).filter(padInLayout);
        if (pad && !padInLayout(pad)) pad = null;
        var coach = frCoachRef.current;
        var coachMode = d.b3dCoachMode === 'handsOnly' ? 'handsOnly'
          : (d.b3dCoachMode === 'scenario' ? 'scenario' : 'trained');
        var coachCycles = d.b3dCoachCycles === 1 ? 1 : 2;
        var coachBpm = typeof d.b3dCoachBpm === 'number' ? d.b3dCoachBpm : 110;
        coachBpm = Math.max(CPR_COACH_SPEC.minBpm, Math.min(CPR_COACH_SPEC.maxBpm, coachBpm));
        var coachMetrics = analyzeCprTiming(coach.intervals);

        function finishCoach(session) {
          var metrics = analyzeCprTiming(session.intervals);
          var longestPause = session.pauseDurations.length
            ? Math.max.apply(Math, session.pauseDurations) : 0;
          var pauseScore = session.mode === 'handsOnly' ? 100
            : (longestPause <= 10000 ? 100 : Math.max(0, 100 - Math.round((longestPause - 10000) / 100)));
          var score = Math.round(metrics.inRangePct * 0.55 + metrics.consistencyPct * 0.25 + pauseScore * 0.20);
          session.running = false;
          session.phase = 'complete';
          session.summary = {
            score: score,
            medianBpm: metrics.medianBpm,
            inRangePct: metrics.inRangePct,
            consistencyPct: metrics.consistencyPct,
            longestPauseMs: Math.round(longestPause),
            mode: session.mode,
            cycles: session.goalCycles,
            age: age,
            releaseTimingPct: session.holdDurations.length
              ? Math.round(session.holdDurations.filter(function (ms) { return ms >= 120 && ms <= 500; }).length / session.holdDurations.length * 100) : 0,
            scenarioSteps: session.scenarioSteps.slice(),
            assessmentToCallMs: session.assessmentAt && session.callAt ? Math.max(0, session.callAt - session.assessmentAt) : 0,
            completedAtISO: new Date().toISOString()
          };
          upd('b3dCoachBest', session.summary);
          if (score >= 75) {
            if (session.mode === 'trained') awardBadge('cpr_30x2_flow', '30:2 Flow Practice (timing and sequence)');
            else if (session.mode === 'handsOnly') awardBadge('cpr_compression_fallback', 'Compression-only Fallback Practice (timing only)');
            else awardBadge('cpr_full_arrest_run', 'Full Arrest Run (sequence practice)');
          }
          frAnnounceUrgent('Practice complete. Timing and sequence score: ' + score + ' out of 100.');
          refreshFrCoach();
        }

        function startCoach() {
          clearFrCoachTimer();
          var next = makeFrCoachState();
          next.running = true;
          next.phase = coachMode === 'scenario' ? 'assessment' : 'compressions';
          next.mode = coachMode;
          next.goalCycles = coachMode === 'scenario' ? 1 : coachCycles;
          next.startedAtEpoch = coachMode === 'scenario' ? 0 : Date.now();
          next.compressionSegmentEpoch = coachMode === 'scenario' ? 0 : next.startedAtEpoch;
          next.phaseStartedAt = frCoachNow();
          frCoachRef.current = next;
          coach = next;
          frAnnounceUrgent(coachMode === 'scenario'
            ? 'Check response and breathing first.'
            : 'Begin compressions now. Aim for 100 to 120 per minute.');
          refreshFrCoach();
        }

        function scenarioAction(action) {
          var session = frCoachRef.current;
          if (!session.running || session.mode !== 'scenario') return;
          var epoch = Date.now();
          if (action === 'assess' && session.phase === 'assessment') {
            session.assessmentAt = epoch;
            session.scenarioSteps.push('assessment');
            session.phase = 'call';
            session.phaseStartedAt = frCoachNow();
            frAnnounceUrgent(__alloT('stem.firstresponse.sr_no_normal_response_or_breathing_call_911_on_speak', 'No normal response or breathing. Call 911 on speaker.'));
          } else if (action === 'call' && session.phase === 'call') {
            session.callAt = epoch;
            session.scenarioSteps.push('call');
            session.scenarioSteps.push('compressions');
            session.phase = 'compressions';
            session.startedAtEpoch = epoch;
            session.compressionSegmentEpoch = epoch;
            session.phaseStartedAt = frCoachNow();
            frAnnounceUrgent(__alloT('stem.firstresponse.sr_begin_30_compressions_now_aim_for_100_to_120_per', 'Begin 30 compressions now. Aim for 100 to 120 per minute.'));
          } else if (action === 'aed' && session.phase === 'aed') {
            session.aedAt = epoch;
            session.scenarioSteps.push('aed');
            session.phase = 'resume';
            session.pauseStartedAt = frCoachNow();
            frAnnounceUrgent(__alloT('stem.firstresponse.sr_aed_step_complete_resume_compressions_now', 'AED step complete. Resume compressions now.'));
          } else return;
          refreshFrCoach();
        }

        function stopCoach() {
          resetFrCoachSession('Practice reset.');
          coach = frCoachRef.current;
        }

        function recordScenarioCompressionDown() {
          var session = frCoachRef.current;
          if (!session.running || session.mode !== 'scenario' || session.phase !== 'compressions') return;
          if (session.activeCompressionAt) return;
          session.activeCompressionAt = frCoachNow();
          recordCoachCompression();
        }

        function recordScenarioCompressionUp() {
          var session = frCoachRef.current;
          if (!session.activeCompressionAt) return;
          session.holdDurations.push(Math.max(0, frCoachNow() - session.activeCompressionAt));
          session.activeCompressionAt = 0;
          session.releaseCount += 1;
          session.lastScenarioReleaseAt = frCoachNow();
          refreshFrCoach();
        }

        function recordScenarioCompressionClick() {
          var session = frCoachRef.current;
          if (session.lastScenarioReleaseAt && frCoachNow() - session.lastScenarioReleaseAt < 100) return;
          recordScenarioCompressionDown();
          recordScenarioCompressionUp();
        }

        function recordCoachCompression() {
          var session = frCoachRef.current;
          if (!session.running) return;
          var now = frCoachNow();
          var epoch = Date.now();
          if (session.phase === 'resume') {
            session.lastCompressionEpoch = epoch;
            session.pauseDurations.push(Math.max(0, now - session.pauseStartedAt));
            if (session.cycle >= session.goalCycles) {
              if (session.mode === 'scenario') session.scenarioSteps.push('resume');
              finishCoach(session);
              return;
            }
            session.cycle += 1;
            session.phase = 'compressions';
            session.compressionCount = 1;
            session.breathCount = 0;
            session.lastCompressionAt = now;
            session.compressionSegmentEpoch = epoch;
            frAnnounceUrgent('Compressions resumed. Cycle ' + session.cycle + '.');
            refreshFrCoach();
            return;
          }
          if (session.phase !== 'compressions') return;
          if (session.lastCompressionAt && now - session.lastCompressionAt < 180) return;
          if (session.lastCompressionAt) session.intervals.push(now - session.lastCompressionAt);
          session.lastCompressionAt = now;
          session.lastCompressionEpoch = epoch;
          session.compressionCount += 1;
          if (session.compressionCount === 10 || session.compressionCount === 20) {
            frAnnounce(session.compressionCount + ' compressions. Keep going.');
          }
          if (session.compressionCount >= CPR_COACH_SPEC.compressionsPerCycle) {
            if (session.mode === 'handsOnly') {
              if (session.cycle >= session.goalCycles) { finishCoach(session); return; }
              session.cycle += 1;
              session.compressionCount = 0;
              frAnnounceUrgent('30. Continue compressions. Cycle ' + session.cycle + '.');
            } else {
              session.phase = 'breaths';
              session.breathCount = 0;
              session.pauseStartedAt = now;
              session.lastCompressionAt = 0;
              frAnnounceUrgent(__alloT('stem.firstresponse.sr_30_give_two_breaths_about_one_second_each', '30. Give two breaths, about one second each.'));
            }
          }
          refreshFrCoach();
        }

        function recordCoachBreath() {
          var session = frCoachRef.current;
          if (!session.running || session.phase !== 'breaths') return;
          var now = frCoachNow();
          if (session.lastBreathAt && now - session.lastBreathAt < CPR_COACH_SPEC.breathLockMs) return;
          session.lastBreathAt = now;
          session.lastBreathEpoch = Date.now();
          session.breathCount += 1;
          clearFrCoachTimer();
          if (session.breathCount >= CPR_COACH_SPEC.breathsPerCycle) {
            session.phase = 'breathRecovery';
            frAnnounce(__alloT('stem.firstresponse.sr_second_breath_let_the_chest_fall_then_resume_comp', 'Second breath. Let the chest fall, then resume compressions.'));
            frCoachTimerRef.current = setTimeout(function () {
              frCoachTimerRef.current = null;
              if (frCoachRef.current !== session || !session.running || session.phase !== 'breathRecovery') return;
              if (session.mode === 'scenario') {
                session.scenarioSteps.push('breaths');
                session.phase = 'aed';
                frAnnounceUrgent(__alloT('stem.firstresponse.sr_aed_arrives_apply_the_aed_and_follow_its_prompts', 'AED arrives. Apply the AED and follow its prompts.'));
              } else {
                session.phase = 'resume';
                frAnnounceUrgent(__alloT('stem.firstresponse.sr_resume_compressions_now', 'Resume compressions now.'));
              }
              refreshFrCoach();
            }, CPR_COACH_SPEC.breathLockMs + 50);
          } else {
            frAnnounce(__alloT('stem.firstresponse.sr_first_breath_let_the_chest_fall_then_give_the_sec', 'First breath. Let the chest fall, then give the second breath.'));
            frCoachTimerRef.current = setTimeout(function () {
              frCoachTimerRef.current = null;
              if (frCoachRef.current === session && session.running && session.phase === 'breaths') refreshFrCoach();
            }, CPR_COACH_SPEC.breathLockMs + 50);
          }
          refreshFrCoach();
        }

        var ageInfo = CPR_AGES[0];
        for (var agi = 0; agi < CPR_AGES.length; agi++) if (CPR_AGES[agi].id === age) ageInfo = CPR_AGES[agi];
        var ageMechanics = cprMechanicsForAge(age);
        var modelTechnique = age === 'adult'
          ? 'Two-hand adult placement.'
          : (age === 'child' ? (childHands === 'two' ? __alloT('stem.firstresponse.hand_model_child_two', 'Two stacked hands on the child manikin.') : __alloT('stem.firstresponse.hand_model_child_one', 'Heel of one hand on the child manikin.'))
            : 'Heel of one hand. Two-thumb encircling-hands is also recommended and is best learned hands-on.');
        function renderChildHandChoice() {
          if (age !== 'child') return null;
          var hidden = tab === 'depth' && !depthLab.hands;
          return h('fieldset', { className: 'fr-child-hands', disabled: hidden, onFocusCapture: revealDepthControl, onKeyDownCapture: revealDepthControl },
            h('legend', null, __alloT('stem.firstresponse.hand_choice_title', 'Compare child hand techniques')),
            h('p', { id: 'fr-child-hands-help' }, __alloT('stem.firstresponse.hand_choice_intro', 'Choose the hand arrangement shown on the manikin. Both choices keep the heel of the lower hand in the same chest region.')),
            h('div', { className: 'fr-child-hand-options' },
              [['one', __alloT('stem.firstresponse.hand_choice_one', 'One hand')], ['two', __alloT('stem.firstresponse.hand_choice_two', 'Two stacked hands')]].map(function (choice) {
                return h('label', { key: choice[0], className: 'fr-child-hand-option' + (childHands === choice[0] ? ' is-selected' : '') },
                  h('input', { type: 'radio', name: 'fr-child-hands', value: choice[0], checked: childHands === choice[0], 'aria-describedby': 'fr-child-hands-help',
                    onChange: function () { upd('b3dChildHands', choice[0]); } }), h('span', null, choice[1]));
              })),
            h('p', { className: 'fr-child-hand-reading', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, hidden
              ? __alloT('stem.firstresponse.hand_choice_hidden', 'Turn on rescuer hands to inspect this choice.')
              : tab === 'place' && placed !== 'correct'
                ? __alloT('stem.firstresponse.hand_choice_pending', 'Locate the centre of the chest to reveal the selected hand arrangement.') : modelTechnique),
            h('p', { className: 'fr-child-hand-scope' }, __alloT('stem.firstresponse.hand_choice_scope', 'Switching hands changes the illustration. Set simulated depth and recoil separately; this display does not predict how much force or depth you would achieve.')),
            h('a', { href: 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/pediatric-basic-life-support', target: '_blank', rel: 'noopener noreferrer' }, __alloT('stem.firstresponse.hand_choice_source', 'AHA guidance: child compression techniques')));
        }

        // The scenario tab drives the figure from the case being run, not from
        // the age selector (which only appears on the placement/depth tabs).
        var sceneAge = age;
        if (tab === 'call') {
          var _run = d.b3dCall || {};
          for (var cci = 0; cci < CALL_CASES.length; cci++) {
            if (CALL_CASES[cci].id === _run.caseId) { sceneAge = CALL_CASES[cci].age || 'adult'; break; }
          }
        }

        var depthLab = compressionLabSettings(age, d.b3dDepthLab, mech);
        var savedDepth = compressionLabReference(age, d.b3dDepthReference);
        function setDepthLab(values) {
          var next = { b3dDepthLab: Object.assign({}, depthLab, values), b3dMech: null };
          if (next.b3dDepthLab.depth !== depthLab.depth || next.b3dDepthLab.lean !== depthLab.lean) next.b3dDepthInquiry = null;
          updMulti(next);
        }
        function depthExample(kind) {
          var next = compressionLabSettings(age, null, kind);
          next.motion = 'release'; next.anatomy = depthLab.anatomy; next.hands = depthLab.hands; next.measure = depthLab.measure;
          updMulti({ b3dDepthLab: next, b3dMech: kind, b3dDepthInquiry: null });
        }
        function depthNumber(n) { return (Math.round(n * 10 + 1e-9) / 10).toFixed(1); }
        var inspected = compressionLabSample(depthLab, 0, true);
        var savedInspection = savedDepth && compressionLabSample(Object.assign({}, depthLab, savedDepth), 0, true);
        var inspectionPhase = Math.round(inspected.phase * 100);
        var inspecting = depthLab.motion !== 'cycle';
        function cycleLabel(phase) {
          if (phase === 0) return __alloT('stem.firstresponse.depth_cycle_start', 'Before the push');
          if (phase < 50) return __alloT('stem.firstresponse.depth_cycle_down', 'Pressing down');
          if (phase === 50) return __alloT('stem.firstresponse.depth_cycle_peak', 'Deepest point');
          if (phase < 100) return __alloT('stem.firstresponse.depth_cycle_up', 'Releasing');
          return __alloT('stem.firstresponse.depth_cycle_end', 'Between pushes');
        }
        function inspectCycle(phase) { setDepthLab({ motion: 'inspect', phase: phase }); }
        // Keep the focused control and its label below the pinned phone viewer.
        function revealDepthControl(e) {
          var target = e.target;
          if (!window.requestAnimationFrame) return;
          window.requestAnimationFrame(function () {
            if (document.activeElement !== target) return;
            var lab = target.closest('.fr-body3d');
            var stage = lab && lab.querySelector('.fr-body3d-stage');
            var row = target.closest('.fr-depth-controls > div, .fr-depth-switch, .fr-depth-scrub, .fr-depth-prediction-option, .fr-child-hand-option') || target;
            if (!stage) return;
            var bounds = row.getBoundingClientRect();
            var viewer = stage.getBoundingClientRect();
            var overlapsViewer = bounds.right > viewer.left && bounds.left < viewer.right && bounds.top < viewer.bottom + 12;
            if (overlapsViewer || bounds.bottom > window.innerHeight - 12) {
              row.scrollIntoView({ block: 'center', behavior: 'instant' });
            }
          });
        }
        function renderDepthInspector() {
          var explanation = inspectionPhase === 0
            ? __alloT('stem.firstresponse.depth_cycle_start_hint', 'Notice the starting height. With leaning, the next push begins before the chest has returned to the resting line.')
            : inspectionPhase < 50
              ? __alloT('stem.firstresponse.depth_cycle_down_hint', 'The chest is moving toward its deepest point. Follow the downward arrow and the marker on the graph.')
              : inspectionPhase === 50
                ? __alloT('stem.firstresponse.depth_cycle_peak_hint', 'This is the peak depth. You still need to inspect the release to see whether the chest fully recoils.')
                : inspectionPhase < 100
                  ? __alloT('stem.firstresponse.depth_cycle_up_hint', 'The chest is returning upward. Compare 25% and 75%: the same height can occur during pressing and releasing.')
                  : depthLab.lean === 0
                    ? __alloT('stem.firstresponse.depth_cycle_full_hint', 'The chest meets the resting line. Add leaning and return to this point to see what changes.')
                    : __alloT('stem.firstresponse.depth_cycle_lean_hint', 'The chest remains below the resting line. Reaching the same peak depth did not guarantee full recoil.');
          return h('section', { className: 'fr-depth-inspector', 'aria-labelledby': 'fr-depth-inspector-title', onFocusCapture: revealDepthControl, onKeyDownCapture: revealDepthControl },
            h('h3', { id: 'fr-depth-inspector-title' }, __alloT('stem.firstresponse.depth_cycle_title', 'Step through one push')),
            h('p', null, __alloT('stem.firstresponse.depth_cycle_intro', 'Choose a moment to freeze the manikin and its graph. The blue arrow shows the direction of chest movement.')),
            h('div', { className: 'fr-depth-scrub' },
              h('label', { htmlFor: 'fr-depth-phase' }, __alloT('stem.firstresponse.depth_cycle_position', 'Cycle position'), h('output', { htmlFor: 'fr-depth-phase' }, inspecting ? inspectionPhase + '%' : '—')),
              h('input', { id: 'fr-depth-phase', type: 'range', min: 0, max: 100, step: 1, value: inspecting ? inspectionPhase : depthLab.phase,
                'aria-describedby': 'fr-depth-phase-help',
                'aria-valuetext': (inspecting ? inspectionPhase : depthLab.phase) + '% · ' + cycleLabel(inspecting ? inspectionPhase : depthLab.phase),
                onChange: function (e) { inspectCycle(Number(e.target.value)); } }),
              h('small', { id: 'fr-depth-phase-help' }, __alloT('stem.firstresponse.depth_cycle_help', 'Drag or use arrow keys. Home returns to the start; End goes to the release.'))),
            h('div', { className: 'fr-depth-steps', role: 'group', 'aria-label': __alloT('stem.firstresponse.depth_cycle_stages', 'Compression cycle stages') },
              [0, 25, 50, 75, 100].map(function (phase) { return h('button', { key: phase, type: 'button', 'aria-pressed': inspecting && inspectionPhase === phase,
                'data-fr-focusable': true, onClick: function () { inspectCycle(phase); } }, h('span', null, phase + '%'), cycleLabel(phase)); })),
            h('div', { className: 'fr-depth-inspection-note', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
              h('strong', null, inspecting ? cycleLabel(inspectionPhase) : __alloT('stem.firstresponse.depth_cycle_animated', 'Animation selected')),
              inspecting && h('div', { className: 'fr-depth-selected-depth' }, __alloT('stem.firstresponse.depth_cycle_depression', 'Chest depression at this position: {depth} cm.').replace('{depth}', depthNumber(inspected.depression))),
              h('p', null, inspecting ? explanation : __alloT('stem.firstresponse.depth_cycle_pause_hint', 'Choose a stage or move the slider to inspect a still position. Reduced-motion mode holds the released position.'))));
        }
        function renderDepthInquiry() {
          var signature = JSON.stringify([age, savedDepth.depth, savedDepth.lean, depthLab.depth, depthLab.lean]);
          var stored = d.b3dDepthInquiry;
          var inquiry = stored && stored.signature === signature ? stored : {};
          var choices = ['a', 'same', 'b'];
          var peakChoice = choices.indexOf(inquiry.peak) >= 0 ? inquiry.peak : '';
          var releaseChoice = choices.indexOf(inquiry.release) >= 0 ? inquiry.release : '';
          var reviewed = inquiry.reviewed === true && !!peakChoice && !!releaseChoice;
          function relation(a, b) { return a === b ? 'same' : a > b ? 'a' : 'b'; }
          var matches = (peakChoice === relation(savedDepth.depth, depthLab.depth) ? 1 : 0)
            + (releaseChoice === relation(savedDepth.lean, depthLab.lean) ? 1 : 0);
          function saveInquiry(values) { upd('b3dDepthInquiry', Object.assign({}, inquiry, values, { signature: signature })); }
          function predictionGroup(kind, title, selected) {
            return h('fieldset', { className: 'fr-depth-predictions' }, h('legend', null, title),
              choices.map(function (choice) {
                var label = choice === 'a' ? __alloT('stem.firstresponse.depth_compare_a', 'Saved A')
                  : choice === 'b' ? __alloT('stem.firstresponse.depth_compare_b', 'Current B')
                  : __alloT('stem.firstresponse.depth_inquiry_same', 'Same depression');
                return h('label', { key: choice, className: 'fr-depth-prediction-option' + (selected === choice ? ' is-selected' : '') },
                  h('input', { type: 'radio', name: 'fr-depth-predict-' + kind, value: choice, checked: selected === choice,
                    onChange: function () {
                      var next = { reviewed: false, peakSeen: false, releaseSeen: false, explanation: '' };
                      next[kind] = choice; saveInquiry(next);
                    } }), h('span', null, label));
              }));
          }
          function inspectEvidence(phase) {
            var next = Object.assign({}, inquiry, { signature: signature });
            next[phase === 50 ? 'peakSeen' : 'releaseSeen'] = true;
            updMulti({ b3dDepthInquiry: next, b3dDepthLab: Object.assign({}, depthLab, { motion: 'inspect', phase: phase }), b3dMech: null });
          }
          return h('details', { className: 'fr-depth-inquiry', onFocusCapture: revealDepthControl, onKeyDownCapture: revealDepthControl },
            h('summary', null, __alloT('stem.firstresponse.depth_inquiry_title', 'Predict and test')),
            h('div', { className: 'fr-depth-inquiry-body' },
              h('p', null, __alloT('stem.firstresponse.depth_inquiry_intro', 'Make two predictions for this A/B comparison, inspect the evidence, then explain what you found. You can revise your predictions.')),
              predictionGroup('peak', __alloT('stem.firstresponse.depth_inquiry_peak_question', 'At the deepest point, which chest is more depressed?'), peakChoice),
              predictionGroup('release', __alloT('stem.firstresponse.depth_inquiry_release_question', 'Between pushes, which chest is more depressed?'), releaseChoice),
              h('button', { type: 'button', style: btn(), disabled: !peakChoice || !releaseChoice,
                onClick: function () { saveInquiry({ reviewed: true }); } }, __alloT('stem.firstresponse.depth_inquiry_check', 'Check predictions')),
              h('div', { className: 'fr-depth-prediction-result', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, reviewed
                ? __alloT('stem.firstresponse.depth_inquiry_result', '{count} of 2 predictions match this model.').replace('{count}', matches) : ''),
              reviewed && h('div', { className: 'fr-depth-evidence' },
                h('p', null, __alloT('stem.firstresponse.depth_inquiry_peak_evidence', 'At the deepest point: A is {a} cm depressed; B is {b} cm depressed.').replace('{a}', depthNumber(savedDepth.depth)).replace('{b}', depthNumber(depthLab.depth))),
                h('p', null, __alloT('stem.firstresponse.depth_inquiry_release_evidence', 'Between pushes: A is {a} cm depressed; B is {b} cm depressed.').replace('{a}', depthNumber(savedDepth.lean)).replace('{b}', depthNumber(depthLab.lean))),
                h('div', { className: 'fr-depth-comparison-actions' },
                  h('button', { type: 'button', style: btn(), 'aria-pressed': inspecting && inspectionPhase === 50,
                    onClick: function () { inspectEvidence(50); } }, __alloT('stem.firstresponse.depth_inquiry_view_peak', 'View peak evidence')),
                  h('button', { type: 'button', style: btn(), 'aria-pressed': inspecting && inspectionPhase === 100,
                    onClick: function () { inspectEvidence(100); } }, __alloT('stem.firstresponse.depth_inquiry_view_release', 'View release evidence'))),
                h('p', { className: 'fr-depth-evidence-progress', role: 'status', 'aria-live': 'polite' }, inquiry.peakSeen && inquiry.releaseSeen
                  ? __alloT('stem.firstresponse.depth_inquiry_both_seen', 'Both positions inspected. Use the curves and numbers to explain your comparison.')
                  : __alloT('stem.firstresponse.depth_inquiry_inspect_both', 'Inspect both positions with the evidence buttons, then write your explanation.')),
                h('label', { htmlFor: 'fr-depth-explanation', className: 'fr-depth-reflection-label' }, __alloT('stem.firstresponse.depth_inquiry_explain', 'My explanation')),
                h('textarea', { id: 'fr-depth-explanation', rows: 3, maxLength: 400, 'aria-describedby': 'fr-depth-explanation-help',
                  value: typeof inquiry.explanation === 'string' ? inquiry.explanation.slice(0, 400) : '',
                  onChange: function (e) { saveInquiry({ explanation: e.target.value.slice(0, 400) }); } }),
                h('small', { id: 'fr-depth-explanation-help' }, __alloT('stem.firstresponse.depth_inquiry_explain_help', 'Use an observation from the peak and one from the release. Your note is saved with these settings; it is not graded.')),
                h('p', { className: 'fr-depth-takeaway' }, savedDepth.depth === depthLab.depth && savedDepth.lean !== depthLab.lean
                  ? __alloT('stem.firstresponse.depth_inquiry_takeaway_recoil', 'The peak depths match, but the release heights differ. Inspecting the peak alone cannot show whether both settings fully recoil.')
                  : savedDepth.lean === depthLab.lean && savedDepth.depth !== depthLab.depth
                    ? __alloT('stem.firstresponse.depth_inquiry_takeaway_depth', 'The peak depths differ, but depression at release matches. Compare depth and recoil at their separate points in the cycle.')
                    : __alloT('stem.firstresponse.depth_inquiry_takeaway_general', 'Peak depth and depression at release describe separate points in the cycle. Use both observations to explain the settings.'))),
              h('p', { className: 'fr-depth-comparison-scope' }, __alloT('stem.firstresponse.depth_inquiry_reset_hint', 'Changing depth, recoil, saved A, or age starts new predictions. Cycle position, rate, and anatomy leave these predictions in place.'))));
        }
        function renderDepthComparison() {
          function saveCurrent() { updMulti({ b3dDepthReference: { age: age, depth: depthLab.depth, lean: depthLab.lean }, b3dDepthInquiry: null }); }
          function compareRecoil() {
            updMulti({ b3dDepthReference: { age: age, depth: depthLab.depth, lean: 0 }, b3dDepthInquiry: null,
              b3dDepthLab: Object.assign({}, depthLab, { lean: Math.min(1, depthLab.depth), motion: 'inspect', phase: 100 }), b3dMech: null });
          }
          return h('details', { className: 'fr-depth-compare' },
            h('summary', null, __alloT('stem.firstresponse.depth_compare_title', 'Compare two settings'), savedDepth && h('span', { className: 'fr-depth-saved-badge' }, __alloT('stem.firstresponse.depth_compare_saved', 'A saved'))),
            h('div', { className: 'fr-depth-compare-body' },
              h('p', null, __alloT('stem.firstresponse.depth_compare_intro', 'Save the current depth and recoil as A. Then change a setting: the manikin is current B, and the saved marker shows A at the same point in the cycle. Matching curves overlap.')),
              h('div', { className: 'fr-depth-comparison-actions' },
                h('button', { type: 'button', style: btn(), onClick: saveCurrent }, savedDepth
                  ? __alloT('stem.firstresponse.depth_compare_replace', 'Replace A with current settings')
                  : __alloT('stem.firstresponse.depth_compare_save', 'Save current settings as A')),
                h('button', { type: 'button', style: btn(), onClick: compareRecoil }, __alloT('stem.firstresponse.depth_compare_example', 'Try full recoil vs leaning'))),
              savedDepth ? h('div', null,
                h('p', { className: 'fr-depth-comparison-key' }, __alloT('stem.firstresponse.depth_compare_key', 'In 3D: A is the violet square; B is the amber dot. On the graph: A is dashed; B is solid.')),
                h('table', { className: 'fr-depth-comparison-table' },
                  h('caption', null, __alloT('stem.firstresponse.depth_compare_caption', 'Depth and recoil comparison')),
                  h('thead', null, h('tr', null,
                    h('th', { scope: 'col' }, __alloT('stem.firstresponse.depth_compare_condition', 'Setting')),
                    h('th', { scope: 'col' }, __alloT('stem.firstresponse.depth_compare_peak', 'Peak depth')),
                    h('th', { scope: 'col' }, __alloT('stem.firstresponse.depth_compare_release', 'At release')))),
                  h('tbody', null,
                    h('tr', null, h('th', { scope: 'row' }, __alloT('stem.firstresponse.depth_compare_a', 'Saved A')), h('td', null, depthNumber(savedDepth.depth) + ' cm'), h('td', null, depthNumber(savedDepth.lean) + ' cm')),
                    h('tr', null, h('th', { scope: 'row' }, __alloT('stem.firstresponse.depth_compare_b', 'Current B')), h('td', null, depthNumber(depthLab.depth) + ' cm'), h('td', null, depthNumber(depthLab.lean) + ' cm')))),
                h('p', null, depthLab.depth === savedDepth.depth
                  ? __alloT('stem.firstresponse.depth_compare_same_peak', 'Peak depth matches. Inspect the peak, then the release: do both settings return to the resting line?')
                  : __alloT('stem.firstresponse.depth_compare_different_peak', 'Peak depths differ. Inspect both the deepest point and the release to see what changed.')),
                h('div', { className: 'fr-depth-comparison-actions' },
                  h('button', { type: 'button', style: btn(), onClick: function () { inspectCycle(50); } }, __alloT('stem.firstresponse.depth_compare_inspect_peak', 'Inspect peak')),
                  h('button', { type: 'button', style: btn(), onClick: function () { inspectCycle(100); } }, __alloT('stem.firstresponse.depth_compare_inspect_release', 'Inspect release')),
                  h('button', { type: 'button', style: btn(), onClick: function () { updMulti({ b3dDepthReference: null, b3dDepthInquiry: null }); } }, __alloT('stem.firstresponse.depth_compare_clear', 'Clear saved A'))),
                h('p', { className: 'fr-depth-comparison-reading', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, inspecting
                  ? __alloT('stem.firstresponse.depth_compare_reading', 'At {phase}% of the cycle: A is {a} cm depressed; B is {b} cm depressed.').replace('{phase}', inspectionPhase).replace('{a}', depthNumber(savedInspection.depression)).replace('{b}', depthNumber(inspected.depression))
                  : __alloT('stem.firstresponse.depth_compare_pause', 'Select a still position to compare exact model heights.')),
                renderDepthInquiry())
                : h('p', null, __alloT('stem.firstresponse.depth_compare_empty', 'No A is saved for this age. Save your settings or start the recoil comparison.')),
              h('p', { className: 'fr-depth-comparison-scope' }, __alloT('stem.firstresponse.depth_compare_scope', 'A stores depth and recoil for one age. Both markers use the current cycle position and animation rate.'))));
        }
        function renderDepthProfile() {
          var points = [], referencePoints = [];
          for (var i = 0; i <= 80; i++) {
            var wave = (1 - Math.cos(i / 80 * Math.PI * 2)) / 2;
            var depth = depthLab.lean + (depthLab.depth - depthLab.lean) * wave;
            points.push((i ? 'L' : 'M') + (25 + i * 4.75).toFixed(1) + ' ' + (22 + depth / depthLab.maximum * 95).toFixed(1));
            var comparisonDepth = savedDepth ? savedDepth.lean + (savedDepth.depth - savedDepth.lean) * wave : depthLab.reference * wave;
            referencePoints.push((i ? 'L' : 'M') + (25 + i * 4.75).toFixed(1) + ' ' + (22 + comparisonDepth / depthLab.maximum * 95).toFixed(1));
          }
          return h('figure', { className: 'fr-depth-profile' },
            h('h3', null, __alloT('stem.firstresponse.depth_explorer_profile_title', 'One compression, from start to release')),
            h('div', { className: 'fr-depth-key' + (savedDepth ? ' is-comparing' : '') },
              h('span', null, savedDepth ? __alloT('stem.firstresponse.depth_compare_a_dashed', 'Saved A · dashed') : __alloT('stem.firstresponse.depth_explorer_reference_key', 'Reference with full recoil')),
              h('span', null, savedDepth ? __alloT('stem.firstresponse.depth_compare_b_solid', 'Current B · solid') : __alloT('stem.firstresponse.depth_explorer_settings_key', 'Your model settings'))),
            h('svg', { viewBox: '0 0 430 140', 'aria-hidden': 'true', focusable: 'false' },
              h('path', { d: 'M25 22H405 M25 22V124', stroke: '#94a3b8', strokeWidth: 1, fill: 'none' }),
              h('path', { className: 'fr-depth-reference-line', d: referencePoints.join(' '), stroke: savedDepth ? '#c4b5fd' : '#5eead4', strokeWidth: 3, strokeDasharray: '5 4', fill: 'none' }),
              h('path', { d: points.join(' '), stroke: '#fbbf24', strokeWidth: 3, fill: 'none' }),
              h('circle', { cx: 405, cy: 22 + depthLab.lean / depthLab.maximum * 95, r: 5, fill: '#fbbf24' }),
              inspecting && savedDepth && h('rect', { className: 'fr-depth-saved-cursor', x: 20 + inspectionPhase * 3.8, y: 17 + savedInspection.depression / depthLab.maximum * 95, width: 10, height: 10, fill: '#c4b5fd', stroke: '#111e31', strokeWidth: 1.5 }),
              inspecting && h('g', { className: 'fr-depth-cursor' },
                h('path', { d: 'M' + (25 + inspectionPhase * 3.8) + ' 14V124', stroke: '#f1f5f9', strokeWidth: 1.5, strokeDasharray: '3 4' }),
                h('circle', { cx: 25 + inspectionPhase * 3.8, cy: 22 + inspected.depression / depthLab.maximum * 95, r: 6, fill: '#111e31', stroke: '#f1f5f9', strokeWidth: 2 }))),
            h('div', { className: 'fr-depth-axis' }, h('span', null, '0%'), h('span', null, '50%'), h('span', null, '100%')),
            h('p', { className: 'fr-depth-cursor-caption' }, inspecting
              ? __alloT('stem.firstresponse.depth_cycle_graph_cursor', 'Outlined marker: {phase}% of the cycle · {depth} cm depressed.').replace('{phase}', inspectionPhase).replace('{depth}', depthNumber(inspected.depression))
              : __alloT('stem.firstresponse.depth_cycle_graph_whole', 'The curve shows one whole cycle. Select a still position to place a marker.')),
            h('div', { className: 'fr-depth-profile-values' },
              h('div', null, __alloT('stem.firstresponse.depth_explorer_peak_label', 'At the deepest point'), h('strong', null, depthNumber(depthLab.depth) + ' cm')),
              h('div', null, __alloT('stem.firstresponse.depth_explorer_release_label', 'Still depressed at release'), h('strong', null, depthNumber(depthLab.lean) + ' cm'))),
            savedDepth && h('p', { className: 'fr-depth-saved-caption' }, __alloT('stem.firstresponse.depth_compare_graph_note', 'The dashed curve shows your saved A. The manikin and the values above show current B.')),
            h('figcaption', null, __alloT('stem.firstresponse.depth_explorer_profile_caption', 'A lower line means a more compressed chest. Both ends meet the resting line only when the model fully recoils. This diagram shows the same settings as the manikin.')));
        }
        function renderDepthExplorer() {
          var depthText = age === 'adult'
            ? (depthLab.depth < 5 ? __alloT('stem.firstresponse.depth_explorer_adult_shallow', 'Depth: below the adult 5–6 cm range.') : depthLab.depth > 6 ? __alloT('stem.firstresponse.depth_explorer_adult_deep', 'Depth: above the adult 5–6 cm range.') : __alloT('stem.firstresponse.depth_explorer_adult_range', 'Depth: within the adult 5–6 cm range.'))
            : (depthLab.depth < depthLab.reference ? __alloT('stem.firstresponse.depth_explorer_pediatric_below', 'Depth: below this model’s one-third chest-depth marker.') : depthLab.depth > depthLab.reference ? __alloT('stem.firstresponse.depth_explorer_pediatric_above', 'Depth: beyond this model’s one-third marker. Actual chest size guides technique.') : __alloT('stem.firstresponse.depth_explorer_pediatric_reference', 'Depth: at this model’s one-third chest-depth marker.'));
          var recoilText = depthLab.lean === 0 ? __alloT('stem.firstresponse.depth_explorer_recoil_full', 'Release: the chest returns to its resting height.') : __alloT('stem.firstresponse.depth_explorer_recoil_incomplete', 'Release: leaning keeps the chest below its resting height.');
          var rateText = depthLab.rate < 100 ? __alloT('stem.firstresponse.depth_explorer_rate_slow', 'Rate: slower than 100–120 compressions per minute.') : depthLab.rate > 120 ? __alloT('stem.firstresponse.depth_explorer_rate_fast', 'Rate: faster than 100–120 compressions per minute.') : __alloT('stem.firstresponse.depth_explorer_rate_range', 'Rate: within 100–120 compressions per minute.');
          function slider(id, label, min, max, step, value, unit, hint) {
            return h('div', { key: id }, h('label', { htmlFor: 'fr-depth-' + id }, label, h('output', { htmlFor: 'fr-depth-' + id }, (id === 'rate' ? value : depthNumber(value)) + ' ' + unit)),
              h('input', { id: 'fr-depth-' + id, type: 'range', min: min, max: max, step: step, value: value,
                'aria-describedby': 'fr-depth-' + id + '-help', 'aria-valuetext': (id === 'rate' ? value : depthNumber(value)) + ' ' + unit,
                onChange: function (e) { var update = {}; update[id] = Number(e.target.value); if (id === 'depth') update.lean = Math.min(depthLab.lean, update[id]); setDepthLab(update); } }),
              h('small', { id: 'fr-depth-' + id + '-help' }, hint));
          }
          return h('section', { className: 'fr-depth-lab', 'aria-labelledby': 'fr-depth-title', onFocusCapture: revealDepthControl, onKeyDownCapture: revealDepthControl },
            h('p', { className: 'fr-depth-eyebrow' }, __alloT('stem.firstresponse.depth_explorer_eyebrow', 'CHANGE A SETTING · INSPECT THE RESULT')),
            h('h2', { id: 'fr-depth-title' }, __alloT('stem.firstresponse.depth_explorer_title', 'Compression mechanics explorer')),
            h('p', null, __alloT('stem.firstresponse.depth_explorer_intro', 'Adjust the manikin, then compare its compressed and released positions. Watch whether the chest returns to the teal resting-height line.')),
            h('div', { className: 'fr-depth-controls' },
              slider('depth', __alloT('stem.firstresponse.depth_explorer_depth_control', 'Simulated peak depth'), 1, depthLab.maximum, 0.5, depthLab.depth, 'cm', ageInfo.depth),
              slider('lean', __alloT('stem.firstresponse.depth_explorer_lean_control', 'Depression left at release'), 0, Math.min(2, depthLab.depth), 0.5, depthLab.lean, 'cm', __alloT('stem.firstresponse.depth_explorer_lean_help', 'Set to 0 for full recoil. A higher value models leaning between pushes.')),
              slider('rate', __alloT('stem.firstresponse.depth_explorer_rate_control', 'Animation rate'), 80, 140, 5, depthLab.rate, __alloT('stem.firstresponse.depth_explorer_rate_unit', '/ min'), __alloT('stem.firstresponse.depth_explorer_rate_help', 'The moving demonstration uses this rate. Static positions let you inspect a single push.'))),
            h('div', { className: 'fr-depth-poses', role: 'group', 'aria-label': __alloT('stem.firstresponse.depth_explorer_pose_group', 'Inspect the compression cycle') }, [
              ['press', __alloT('stem.firstresponse.depth_explorer_press', 'Show compression')], ['release', __alloT('stem.firstresponse.depth_explorer_release', 'Show release')], ['cycle', __alloT('stem.firstresponse.depth_explorer_cycle', 'Animate cycle')]
            ].map(function (item) { return h('button', { key: item[0], 'aria-pressed': depthLab.motion === item[0], 'data-fr-focusable': true,
              style: btn({ background: depthLab.motion === item[0] ? '#164e63' : T.card, borderColor: depthLab.motion === item[0] ? '#67e8f9' : T.border }),
              onClick: function () { setDepthLab({ motion: item[0] }); } }, item[1]); })),
            h('div', { className: 'fr-depth-readout', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, h('p', null, depthText), h('p', null, recoilText), h('p', null, rateText)),
            h('label', { className: 'fr-depth-switch' }, h('input', { type: 'checkbox', checked: depthLab.anatomy, onChange: function (e) { setDepthLab({ anatomy: e.target.checked }); } }), __alloT('stem.firstresponse.depth_explorer_anatomy', 'Show the schematic anatomy layer')),
            h('label', { className: 'fr-depth-switch' }, h('input', { type: 'checkbox', checked: depthLab.hands, onChange: function (e) { setDepthLab({ hands: e.target.checked }); } }), __alloT('stem.firstresponse.depth_inspect_hands', 'Show rescuer hands and arms')),
            renderChildHandChoice(),
            h('label', { className: 'fr-depth-switch' }, h('input', { type: 'checkbox', checked: depthLab.measure, onChange: function (e) { setDepthLab({ measure: e.target.checked }); } }), __alloT('stem.firstresponse.depth_inspect_ruler', 'Measure movement between release and peak')),
            depthLab.measure && h('section', { id: 'fr-depth-measurement', className: 'fr-depth-measurement', 'aria-labelledby': 'fr-depth-measure-title' },
              h('h3', { id: 'fr-depth-measure-title' }, __alloT('stem.firstresponse.depth_inspect_title', 'Depth and movement start at different heights')),
              h('p', null, __alloT('stem.firstresponse.depth_inspect_key', 'Each short ruler tick is 1 cm in this model. The white bracket spans the released height to the deepest point; it stays fixed while the amber marker moves.')),
              h('dl', { className: 'fr-depth-measure-values' },
                h('div', null, h('dt', null, __alloT('stem.firstresponse.depth_inspect_peak', 'Peak depth from rest')), h('dd', null, depthNumber(depthLab.depth) + ' cm')),
                h('div', null, h('dt', null, __alloT('stem.firstresponse.depth_inspect_lean', 'Depression at release')), h('dd', null, depthNumber(depthLab.lean) + ' cm')),
                h('div', null, h('dt', null, __alloT('stem.firstresponse.depth_inspect_travel', 'Movement per push')), h('dd', null, depthNumber(depthLab.depth - depthLab.lean) + ' cm'))),
              h('p', { className: 'fr-depth-measure-equation' }, __alloT('stem.firstresponse.depth_inspect_equation', '{peak} cm − {release} cm = {travel} cm of movement.').replace('{peak}', depthNumber(depthLab.depth)).replace('{release}', depthNumber(depthLab.lean)).replace('{travel}', depthNumber(depthLab.depth - depthLab.lean))),
              h('p', null, depthLab.lean === 0
                ? __alloT('stem.firstresponse.depth_inspect_full', 'With full recoil, the released height is the resting height, so movement and peak depth match.')
                : __alloT('stem.firstresponse.depth_inspect_leaning', 'With leaning, the next push starts below rest. The movement is smaller than the peak depth because some depression remains between pushes.')),
              savedDepth && h('p', { className: 'fr-depth-measure-comparison' }, __alloT('stem.firstresponse.depth_inspect_compare', 'Movement from release to peak: saved A {a} cm; current B {b} cm.').replace('{a}', depthNumber(savedDepth.depth - savedDepth.lean)).replace('{b}', depthNumber(depthLab.depth - depthLab.lean))),
              h('p', { className: 'fr-depth-measure-scope' }, __alloT('stem.firstresponse.depth_inspect_scope', 'These distances describe the illustrated chest. They do not measure force, blood flow, or your hands-on technique.'))),
            h('div', { className: 'fr-depth-examples' },
              h('button', { style: btn(), 'data-fr-focusable': true, onClick: function () { depthExample('lean'); } }, __alloT('stem.firstresponse.depth_explorer_try_lean', 'Try a leaning example')),
              h('button', { style: btn(), 'data-fr-focusable': true, onClick: function () { depthExample('shallow'); } }, __alloT('stem.firstresponse.depth_explorer_try_shallow', 'Try a shallow example')),
              h('button', { style: btn(), 'data-fr-focusable': true, onClick: function () { depthExample('good'); } }, __alloT('stem.firstresponse.depth_explorer_reset', 'Reset model settings'))),
            h('p', null, __alloT('stem.firstresponse.depth_explorer_prompt', 'Investigate: leave the peak depth unchanged and add leaning. Does reaching the same lowest point guarantee full recoil? Compare the release position and the curve.')),
            renderDepthComparison(),
            h('p', null, __alloT('stem.firstresponse.depth_explorer_scope', 'These are illustrative model settings, not sensor measurements or a performance score. Reduced-motion mode holds the released position during animation; the two static controls remain available.')),
            h('a', { href: age === 'adult' ? 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support' : 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/pediatric-basic-life-support', target: '_blank', rel: 'noopener noreferrer' }, __alloT('stem.firstresponse.depth_explorer_source', 'AHA guidance: depth, rate, and full recoil')));
        }
        function cameraPreset(kind) {
          BODY3D.reset();
          if (kind === 'head' && typeof BODY3D.focus === 'function') {
            var rolledHead = tab === 'recovery' && recRolled;
            BODY3D.nudge((rolledHead ? -1.35 : -0.35)-0.1, (rolledHead ? 0.28 : 1.1)-0.86);
            BODY3D.focus('head', { distance: 1.5*ageInfo.scale, immediate: true });
            return;
          }
          if (kind === 'legs' && tab === 'recovery' && typeof BODY3D.focus === 'function') {
            var rolledLegs = recRolled;
            BODY3D.nudge((rolledLegs ? -.65 : -1.05)-0.1,(rolledLegs ? 1.15 : .55)-.86);
            BODY3D.focus('legs', { padding: 1.22, immediate: true });
            return;
          }
          if (kind === 'arms' && typeof BODY3D.focus === 'function') {
            if (tab === 'recovery') {
              var rolledArms = recRolled;
              BODY3D.nudge((rolledArms ? -1.35 : -0.55)-0.1,(rolledArms ? .65 : 1.1)-0.86);
              BODY3D.focus('patientArms', { padding: 1.2, immediate: true });
              return;
            }
            BODY3D.nudge(-0.85-0.1, 0.45-0.86);
            BODY3D.focus('arms', { distance: 3.25, immediate: true,
              target: { x: 0, y: 0.55*ageInfo.scale+0.45, z: -0.18*ageInfo.scale } });
            return;
          }
          if (kind === 'close' && (tab === 'depth' || tab === 'place') && typeof BODY3D.focus === 'function') {
            BODY3D.nudge(-1.05 - 0.1, 0.55 - 0.86);
            BODY3D.focus('correct', { distance: 2.65 * ageInfo.scale, immediate: true,
              target: { x: -0.05 * ageInfo.scale, y: 0.54 * ageInfo.scale, z: -0.18 * ageInfo.scale } });
            return;
          }
          if (kind === 'side') BODY3D.nudge(-Math.PI / 2 - 0.1, 0.30 - 0.86);
          else if (kind === 'above') BODY3D.nudge(-0.1, 1.35 - 0.86);
          if (kind !== 'home') BODY3D.zoom(sceneAge === 'infant' ? -1.9 : sceneAge === 'child' ? -0.75 : 0.45);
        }

        function renderRecoveryReview() {
          if (!recDone.length) return null;
          var shown = recPose ? RECOVERY_STEPS[recPose - 1] : null;
          return h('section', { className: 'fr-recovery-review', 'aria-labelledby': 'fr-recovery-review-title',
            style: { margin: '0 0 14px', padding: 12, border: '1px solid ' + T.border, borderRadius: 8, minWidth: 0 } },
            h('h3', { id: 'fr-recovery-review-title', style: { margin: '0 0 6px', fontSize: 14, color: T.text } },
              __alloT('stem.firstresponse.recovery_review_title', 'Review the movement')),
            h('p', { style: { margin: '0 0 10px', fontSize: 12, color: T.muted, lineHeight: 1.6 } },
              __alloT('stem.firstresponse.recovery_review_help', 'Choose a completed pose, then move one step backward or forward to compare how the body changes.')),
            h('label', { htmlFor: 'fr-recovery-pose', style: { display: 'block', fontSize: 12, marginBottom: 4, color: T.text } },
              __alloT('stem.firstresponse.recovery_review_pose', 'Pose to inspect')),
            h('select', { id: 'fr-recovery-pose', value: recPose,
              onChange: function (e) { upd('b3dRecView', Number(e.target.value)); },
              style: { width: '100%', maxWidth: '100%', minWidth: 0, minHeight: 40, padding: 6,
                color: T.text, background: T.card, border: '1px solid ' + T.border, borderRadius: 5 } },
              h('option', { value: 0 }, __alloT('stem.firstresponse.recovery_review_before', 'Before the sequence')),
              RECOVERY_STEPS.slice(0, recDone.length).map(function (s, i) {
                return h('option', { key: s.id, value: i + 1 }, (i + 1) + '. ' + s.label);
              })),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
              h('button', { disabled: recPose === 0, onClick: function () { upd('b3dRecView', recPose - 1); },
                style: btn({ minHeight: 40, fontSize: 12 }) }, __alloT('stem.firstresponse.recovery_review_previous', 'Previous pose')),
              h('button', { disabled: recPose === recDone.length, onClick: function () { upd('b3dRecView', recPose + 1); },
                style: btn({ minHeight: 40, fontSize: 12 }) }, __alloT('stem.firstresponse.recovery_review_next', 'Next pose')),
              h('button', { disabled: recPose === recDone.length, onClick: function () { upd('b3dRecView', null); },
                style: btn({ minHeight: 40, fontSize: 12 }) }, __alloT('stem.firstresponse.recovery_review_latest', 'Latest completed pose'))),
            h('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true',
              style: { marginTop: 10, fontSize: 12, color: T.text, lineHeight: 1.6 } },
              shown ? __alloT('stem.firstresponse.recovery_review_showing', 'Shown pose: step {step} — {label}')
                .replace('{step}', recPose).replace('{label}', shown.label)
                : __alloT('stem.firstresponse.recovery_review_before', 'Before the sequence'),
              shown && h('p', { style: { margin: '4px 0 0', color: T.muted } }, shown.why)));
        }

        function renderModelKey() {
          function symbol(kind) {
            var marks = kind === 'rest' ? [h('path', { key: 'line', d: 'M2 9H30' })]
              : kind === 'reference' ? [h('rect', { key: 'bar', x: 8, y: 7, width: 16, height: 4, fill: 'currentColor' })]
              : kind === 'current' ? [h('path', { key: 'rail', d: 'M16 1V17', opacity: 0.45 }), h('circle', { key: 'dot', cx: 16, cy: 9, r: 4, fill: 'currentColor' })]
              : kind === 'saved' ? [h('rect', { key: 'box', x: 11, y: 4, width: 10, height: 10 })]
              : kind === 'travel' ? [h('path', { key: 'bracket', d: 'M10 2H22M16 2V16M10 16H22' })]
              : [h('path', { key: 'arrow', d: 'M16 2V16M12 6L16 2L20 6M12 12L16 16L20 12' })];
            return h('svg', { className: 'fr-model-symbol is-' + kind, viewBox: '0 0 32 18', width: 32, height: 18,
              'aria-hidden': 'true', focusable: 'false', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }, marks);
          }
          var keys = [
            ['rest', __alloT('stem.firstresponse.visual_key_rest', 'Resting height')],
            ['reference', __alloT('stem.firstresponse.visual_key_reference', 'Reference depth')],
            ['current', savedDepth ? __alloT('stem.firstresponse.visual_key_current_b', 'Current B height') : __alloT('stem.firstresponse.visual_key_current', 'Current chest height')]
          ];
          if (savedDepth) keys.push(['saved', __alloT('stem.firstresponse.visual_key_saved', 'Saved A height')]);
          if (depthLab.measure) keys.push(['travel', __alloT('stem.firstresponse.visual_key_travel', 'Movement per push')]);
          keys.push(['direction', __alloT('stem.firstresponse.visual_key_direction', 'Direction of movement')]);
          return h('section', { className: 'fr-model-key' + (ctx.isContrast ? ' is-contrast' : ''), 'aria-labelledby': 'fr-model-key-title' },
            h('h3', { id: 'fr-model-key-title' }, __alloT('stem.firstresponse.visual_key_title', 'Read the 3D markers')),
            h('ul', null, keys.map(function (item) { return h('li', { key: item[0], 'data-marker': item[0] }, symbol(item[0]), h('span', null, item[1])); })));
        }

        BODY3D.sync({
          // Only surface a target while the tab that owns it is open. Otherwise
          // a stale chip floats over the body labelling something the student
          // is not being asked about.
          selected: (tab === 'place' ? placed : (tab === 'aed' ? pad : null)),
          phase: tab === 'recovery' ? recPose : 0,
          // On the scenario tab the body should be the person in the story —
          // an adult figure during the infant call would undercut the whole
          // point of the age selector.
          sceneProps: {
            tab: tab,
            age: sceneAge,
            // Which depth/recoil mechanic to demonstrate. Live-read by frame(),
            // and intentionally NOT part of sceneKey: changing it should change
            // the motion, not rebuild the figure.
            mech: tab === 'depth' ? mech : null,
            depthLab: tab === 'depth' ? depthLab : null,
            depthReference: tab === 'depth' ? savedDepth : null,
            childHands: sceneAge === 'child' ? childHands : null,
            placed: tab === 'place' ? placed : null,
            // Which breathing pattern the figure should act out. Live-read like
            // mech, and out of sceneKey for the same reason.
            gate: tab === 'gate' ? gate : null,
            coach: tab === 'coach' ? {
              mode: coach.mode || coachMode,
              running: !!coach.running,
              phase: coach.phase,
              bpm: coachBpm,
              startedAt: coach.compressionSegmentEpoch || coach.startedAtEpoch,
              lastCompressionAt: coach.lastCompressionEpoch,
              lastBreathAt: coach.lastBreathEpoch,
              activeCompressionAt: coach.activeCompressionAt || 0
            } : null
          },
          sceneKey: tab + ':' + sceneAge,
          dark: true, contrast: !!ctx.isContrast,
          onPick: function (id) { pickZone(id); },
          onStatus: function (n) { upd('b3dStatus', n); }
        });

        function zoneById(id) {
          var key = (id === 'sideL' || id === 'sideR') ? 'side' : id;
          for (var i = 0; i < CPR_ZONES.length; i++) if (CPR_ZONES[i].id === key) return CPR_ZONES[i];
          return null;
        }
        // Resolve against the layout for the age on screen first: padTogether
        // and padBelly exist in both sets and carry different explanations, and
        // the infant one is the one that says "these will touch".
        function padById(id) {
          for (var i = 0; i < agePads.length; i++) if (agePads[i].id === id) return agePads[i];
          for (var j = 0; j < AED_PADS.length; j++) if (AED_PADS[j].id === id) return AED_PADS[j];
          for (var k = 0; k < AED_PADS_INFANT.length; k++) if (AED_PADS_INFANT[k].id === id) return AED_PADS_INFANT[k];
          return null;
        }
        // Which correct pads this age's layout requires, so "both placed" is
        // computed from the layout instead of hard-coding the adult pair.
        var agePadsCorrect = agePads.filter(function (p) { return p.verdict === 'correct'; })
          .map(function (p) { return p.id; });
        function padPairDone(list) {
          for (var i = 0; i < agePadsCorrect.length; i++) if (list.indexOf(agePadsCorrect[i]) === -1) return false;
          return agePadsCorrect.length > 0;
        }
        // One pick handler for both target sets — the 3D scene only shows the
        // targets belonging to the open tab, so the id tells us which it is.
        function pickZone(id) {
          var p = padById(id);
          if (p) {
            var nextPads;
            if (p.verdict === 'correct') {
              nextPads = padSelections.filter(function (id) {
                var prior = padById(id);
                return prior && prior.verdict === 'correct';
              });
              if (nextPads.indexOf(p.id) === -1) nextPads.push(p.id);
            } else nextPads = [p.id];
            updMulti({ b3dPad: p.id, b3dPads: nextPads });
            frAnnounce(padPairDone(nextPads)
              ? (age === 'infant'
                ? 'Both pads placed, one on the front and one on the back, with the heart between them.'
                : 'Both pads placed diagonally across the heart.')
              : p.label + '. ' + p.why);
            return;
          }
          var z = zoneById(id);
          if (!z) return;
          upd('b3dPlaced', z.id === 'side' ? 'sideL' : z.id);
          var zoneWhy = z.verdict === 'correct' ? ageInfo.where + ' ' + ageInfo.hands : z.why;
          frAnnounce(z.label + '. ' + zoneWhy);
        }

        var placedZone = placed ? zoneById(placed) : null;
        var BODY_TAB_IDS = ['gate', 'place', 'depth', 'coach', 'aed', 'recovery', 'call'];
        function bodyTabKeyDown(e, index) {
          var key = e.key;
          if (key !== 'ArrowRight' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return;
          e.preventDefault();
          var nextIndex = index;
          if (key === 'ArrowRight' || key === 'ArrowDown') nextIndex = (index + 1) % BODY_TAB_IDS.length;
          if (key === 'ArrowLeft' || key === 'ArrowUp') nextIndex = (index - 1 + BODY_TAB_IDS.length) % BODY_TAB_IDS.length;
          if (key === 'Home') nextIndex = 0;
          if (key === 'End') nextIndex = BODY_TAB_IDS.length - 1;
          var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
          var nextTab = tabs[nextIndex];
          if (nextTab) { nextTab.focus(); nextTab.click(); }
        }


        function tabBtn(id, label) {
          var active = tab === id;
          return h('button', {
            key: id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
            id: 'firstresponse-body-tab-' + id,
            'aria-controls': 'firstresponse-body-panel-' + id,
            tabIndex: active ? 0 : -1,
            onKeyDown: function (e) { bodyTabKeyDown(e, BODY_TAB_IDS.indexOf(id)); },
            onClick: function () {
              if (id !== 'coach' && frCoachRef.current.running) stopCoach();
              upd('b3dTab', id); frAnnounce(label);
            },
            style: btn({
              padding: '7px 12px', fontSize: 13,
              background: active ? T.accent : T.card,
              color: active ? '#fff' : T.text,
              border: '1px solid ' + (active ? T.accent : T.border)
            })
          }, label);
        }

        function note(title, body, tone) {
          var c = tone === 'bad' ? T.danger : (tone === 'ok' ? T.ok : (tone === 'warn' ? T.warn : T.border));
          return h('div', { style: { marginTop: 10, padding: 11, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + c, borderLeft: '4px solid ' + c } },
            h('div', { style: { fontSize: 11.5, fontWeight: 800, color: tone === 'bad' ? '#fca5a5' : tone === 'ok' ? '#86efac' : tone === 'warn' ? '#fcd34d' : T.muted, marginBottom: 4 } }, title),
            h('div', { style: { fontSize: 12.5, color: T.text, lineHeight: 1.6 } }, body));
        }

        function hazardRow(hz) {
          var hit = violations.indexOf(hz.id) !== -1;
          return h('div', { key: hz.id },
            h('button', {
              onClick: function () {
                if (hit) return;
                upd('b3dViolations', violations.concat([hz.id]));
                frAnnounceUrgent('That is never correct. ' + hz.why);
              },
              style: btn({ width: '100%', fontSize: 12.5, fontWeight: 600, border: '1px solid ' + (hit ? T.danger : T.border) })
            }, h('span', { 'aria-hidden': 'true' }, hz.icon + ' '), hz.label),
            hit && h('div', { style: { padding: '8px 11px', fontSize: 12.5, color: T.text, lineHeight: 1.6, background: T.cardAlt, borderLeft: '3px solid ' + T.danger, marginTop: 3, borderRadius: 4 } },
              h('strong', { style: { color: T.danger } }, 'Never correct. '), hz.why));
        }

        return h('div', { className: 'fr-body3d' },
          h('button', { onClick: function () { if (frCoachRef.current.running) stopCoach(); upd('view', 'menu'); }, style: btn({ padding: '6px 12px', fontSize: 12, marginBottom: 12 }) },
            __alloT('stem.firstresponse.b3d_back', '← Menu')),
          h('h2', { style: { margin: '0 0 6px', fontSize: 20, color: T.text } },
            h('span', { 'aria-hidden': 'true' }, '🫀 '), __alloT('stem.firstresponse.b3d_title', 'Body position in 3D')),
          h('p', { style: { margin: '0 0 8px', fontSize: 13, color: T.muted, lineHeight: 1.6 } },
            __alloT('stem.firstresponse.b3d_intro', 'Explore a rounded, age-aware training manikin from every side. Find the hand position, watch compression and full recoil, rehearse the 30:2 flow with visible breaths, place both AED pads, and build the recovery position step by step.')),
          h('div', { role: 'note', style: { margin: '0 0 12px', padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.accent, fontSize: 12, color: T.text, lineHeight: 1.6 } },
            h('strong', { style: { color: T.accentHi } }, __alloT('stem.firstresponse.b3d_scope_lead', 'Scope: ')),
            __alloT('stem.firstresponse.b3d_scope', 'lay rescuer, compression-focused, covering adult, child and infant. This is orientation and practice, not certification — it cannot tell you whether your depth is real, which is exactly what an instructor with a manikin can. Take a hands-on course. In a real emergency, call 911 first or send someone to.')),

          h('div', { role: 'tablist', 'aria-label': __alloT('stem.firstresponse.a11y_body_position_practice_sections', 'Body position practice sections'), style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 } },
            tabBtn('gate', __alloT('stem.firstresponse.b3d_tab_gate', '1 · Which one do they need?')),
            tabBtn('place', __alloT('stem.firstresponse.b3d_tab_place', '2 · Hand placement')),
            tabBtn('depth', __alloT('stem.firstresponse.b3d_tab_depth', '3 · Depth + recoil')),
            tabBtn('coach', '4 · 30:2 coach'),
            tabBtn('aed', __alloT('stem.firstresponse.b3d_tab_aed', '5 · AED pads')),
            tabBtn('recovery', __alloT('stem.firstresponse.b3d_tab_recovery', '6 · Recovery position')),
            tabBtn('call', __alloT('stem.firstresponse.b3d_tab_call', '7 · Run the call'))
          ),

          // Age selector — only meaningful where the technique actually differs.
          // The AED tab belongs here: on an infant the correct pad layout is a
          // different SHAPE, not a smaller version of the adult one, and the
          // figure was already being drawn at whatever age was last picked.
          (tab === 'place' || tab === 'depth' || tab === 'coach' || tab === 'aed') && h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12, padding: 9, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('span', { style: { fontSize: 12, fontWeight: 700, color: T.muted } }, __alloT('stem.firstresponse.b3d_age', 'Who is it?')),
            CPR_AGES.map(function (a) {
              var on = age === a.id;
              return h('button', { key: a.id, 'aria-pressed': on ? 'true' : 'false',
                'aria-label': a.label + ' — ' + a.who,
                onClick: function () {
                  // Changing age on the pad tab swaps which targets exist, so
                  // the picks from the old layout go with it rather than
                  // lingering in saved state as a half-finished other answer.
                  if (tab === 'aed') updMulti({ b3dAge: a.id, b3dPad: null, b3dPads: [], b3dDepthInquiry: a.id === age ? d.b3dDepthInquiry : null });
                  else updMulti({ b3dAge: a.id, b3dDepthInquiry: a.id === age ? d.b3dDepthInquiry : null });
                  frAnnounce(tab === 'aed'
                    ? a.label + '. ' + a.who + '. ' + (a.id === 'infant'
                      ? 'Pads go one on the front and one on the back.'
                      : 'Pads go diagonally opposite on the front of the chest.')
                    : a.label + '. ' + a.who + '. ' + a.where + ' ' + a.depth);
                },
                style: btn({ padding: '6px 11px', fontSize: 12.5, background: on ? T.accent : T.card, color: on ? '#fff' : T.text, border: '1px solid ' + (on ? T.accent : T.border) }) },
                h('span', { 'aria-hidden': 'true' }, a.icon + ' '), a.label);
            }),
            h('span', { style: { fontSize: 11, color: T.dim } }, ageInfo.who)
          ),

          h('div', {
            role: 'tabpanel',
            id: 'firstresponse-body-panel-' + tab,
            'aria-labelledby': 'firstresponse-body-tab-' + tab,
            tabIndex: 0,
            className: 'fr-body3d-layout' + (tab === 'depth' ? ' is-depth' : '') },
            h('div', { className: 'fr-body3d-visual' },
              h('div', {
                ref: BODY3D.attach, tabIndex: 0, role: 'group',
                'data-allo-fs-stage': 'true',
                'aria-label': __alloT('stem.firstresponse.b3d_viewer_label', 'Body diagram, 3D. Interactive. Arrow keys rotate, plus and minus zoom, zero resets. Every target here is also a button below.'),
                onKeyDown: function (e) {
                  var k = e.key, handled = true;
                  if (k === 'ArrowLeft') BODY3D.nudge(-0.16, 0);
                  else if (k === 'ArrowRight') BODY3D.nudge(0.16, 0);
                  else if (k === 'ArrowUp') BODY3D.nudge(0, 0.10);
                  else if (k === 'ArrowDown') BODY3D.nudge(0, -0.10);
                  else if (k === '+' || k === '=') BODY3D.zoom(-0.4);
                  else if (k === '-' || k === '_') BODY3D.zoom(0.4);
                  else if (k === '0') BODY3D.reset();
                  else handled = false;
                  if (handled) { e.preventDefault(); e.stopPropagation(); }
                },
                className: 'fr-body3d-stage' + (tab === 'depth' ? ' is-depth' : '')
              },
                h('button', {
                  type: 'button',
                  'data-allo-fs-btn': 'true',
                  'aria-pressed': 'false',
                  ref: function (b) { if (b && typeof window.__alloStemFsBind === 'function') window.__alloStemFsBind(b, b.closest('[data-allo-fs-stage]')); },
                  'aria-label': __alloT('stem.firstresponse.enter_fullscreen', 'View the body diagram fullscreen'),
                  'data-fs-out': __alloT('stem.firstresponse.enter_fullscreen', 'View the body diagram fullscreen'),
                  'data-fs-in': __alloT('stem.firstresponse.exit_fullscreen', 'Exit fullscreen body diagram (Escape)'),
                  onClick: function (ev) { ev.stopPropagation(); },
                  style: { position: 'absolute', top: 8, right: 8, zIndex: 30, width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.55)', color: '#e2e8f0', fontSize: 16, fontWeight: 700, cursor: 'pointer' }
                }, h('span', { 'aria-hidden': 'true' }, '⛶')),
                st3 !== 'ready' && h('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 18, fontSize: 12.5, color: T.muted, lineHeight: 1.55 } },
                  st3 === 'failed'
                    ? __alloT('stem.firstresponse.b3d_failed', '3D view unavailable on this device or network. Every target and every step is a button below — nothing here needs the picture.')
                    : __alloT('stem.firstresponse.b3d_loading', 'Loading the body diagram…'))
              ),
              h('div', { className: 'fr-body3d-camera', role: 'group', 'aria-label': __alloT('stem.firstresponse.depth_explorer_camera_group', 'Camera viewpoints') },
                (tab === 'depth' || tab === 'place' ? [['close', __alloT('stem.firstresponse.depth_inspect_close', 'Chest close-up')]] : []).concat(
                  tab === 'depth' || tab === 'place' || tab === 'coach' || tab === 'recovery' ? [['arms', __alloT('stem.firstresponse.realism_camera_arms', 'Hands + arms')]] : [],
                  tab === 'recovery' ? [['legs', __alloT('stem.firstresponse.realism_camera_legs', 'Legs + feet')]] : [],
                  tab === 'gate' || tab === 'coach' || tab === 'recovery' ? [['head', __alloT('stem.firstresponse.realism_camera_head', 'Head close-up')]] : [],
                  [['side', __alloT('stem.firstresponse.depth_explorer_camera_side', 'Side view')], ['above', __alloT('stem.firstresponse.depth_explorer_camera_above', 'Overhead view')], ['home', __alloT('stem.firstresponse.depth_explorer_camera_home', 'Whole manikin')]]).map(function (item) {
                  var armsHidden = item[0] === 'arms' && ((tab === 'place' && placed !== 'correct') || (tab === 'depth' && !depthLab.hands));
                  return h('button', { key: item[0], style: btn({ fontSize: 12 }), disabled: st3 !== 'ready' || armsHidden, 'data-fr-focusable': true, onClick: function () { cameraPreset(item[0]); } }, item[1]);
                })),
              tab === 'depth' && renderModelKey(),
              tab === 'depth' && renderDepthInspector(),
              tab === 'depth' && renderDepthProfile(),
              h('div', { className: 'fr-body3d-orbit', style: { display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' } },
                [['Rotate view left', '⟲', function () { BODY3D.nudge(-0.28, 0); }],
                 ['Rotate view right', '⟳', function () { BODY3D.nudge(0.28, 0); }],
                 ['Tilt view up', '▲', function () { BODY3D.nudge(0, 0.16); }],
                 ['Tilt view down', '▼', function () { BODY3D.nudge(0, -0.16); }],
                 ['Zoom in', '＋', function () { BODY3D.zoom(-0.5); }],
                 ['Zoom out', '－', function () { BODY3D.zoom(0.5); }],
                 ['Reset the view', '⌂', function () { BODY3D.reset(); }]].map(function (c) {
                  return h('button', { key: c[0], 'aria-label': c[0], disabled: st3 !== 'ready', onClick: c[2],
                    style: btn({ padding: '6px 10px', fontSize: 12, minWidth: 34, opacity: st3 === 'ready' ? 1 : 0.45 }) }, c[1]);
                })
              ),
              h('div', { className: 'fr-body3d-visual-help', style: { marginTop: 6, fontSize: 10.5, color: T.dim, lineHeight: 1.5 } },
                __alloT('stem.firstresponse.b3d_hint', 'Purpose-built training manikin, not an anatomical model for diagnosis. Drag or use arrow keys to inspect it from every side.'))
            ),

            h('div', { className: 'fr-body3d-content' },
              tab === 'gate' && h('div', null,
                h('h2', { style: { margin: '0 0 6px', fontSize: 15, color: T.accentHi } },
                  __alloT('stem.firstresponse.b3d_gate_h', 'Before anything else: are they breathing normally?')),
                // Tell the learner the figure is acting out their pick, and say
                // what to watch for. Without this the animation is just motion;
                // the gap between gasps is the thing that has to be noticed.
                gate && note(
                  gate === 'notbreathing'
                    ? __alloT('stem.firstresponse.b3d_gate_watch_agonal', 'Watch the chest: agonal gasping')
                    : __alloT('stem.firstresponse.b3d_gate_watch_normal', 'Watch the chest: normal breathing'),
                  gate === 'notbreathing'
                    ? 'A few isolated snatches of air with long, still gaps between them. That pause is the tell — this is cardiac arrest, and it is what gets mistaken for breathing.'
                    : 'A steady, continuous rise and fall, roughly every four seconds. Nothing like the gasps.',
                  gate === 'notbreathing' ? 'warn' : 'ok'),
                h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: T.muted, lineHeight: 1.6 } },
                  __alloT('stem.firstresponse.b3d_gate_p', 'This single question decides everything that follows. Getting it backwards is the most consequential mistake in this whole module.')),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                  BREATHING_GATE.map(function (g) {
                    var picked = gate === g.id;
                    return h('div', { key: g.id },
                      h('button', { onClick: function () { upd('b3dGate', g.id); frAnnounce(g.label + '. ' + g.why); },
                        style: btn({ width: '100%', border: '1px solid ' + (picked ? T.ok : T.border) }) }, g.label),
                      picked && note(g.action === 'cpr'
                        ? __alloT('stem.firstresponse.b3d_gate_cpr', '→ Compressions')
                        : __alloT('stem.firstresponse.b3d_gate_rec', '→ Recovery position'), g.why, 'ok'));
                  })
                ),
                h('h3', { style: { margin: '14px 0 6px', fontSize: 13, color: T.danger } },
                  __alloT('stem.firstresponse.b3d_never', 'Never correct')),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, BODY_HAZARDS.map(hazardRow))
              ),

              tab === 'place' && h('div', null,
                h('h2', { style: { margin: '0 0 6px', fontSize: 15, color: T.accentHi } },
                  __alloT('stem.firstresponse.b3d_place_h', 'Where do your hands go?')),
                h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: T.muted, lineHeight: 1.6 } },
                  __alloT('stem.firstresponse.b3d_place_p', 'Tap a spot on the chest in the 3D view, or pick from the list. Both do the same thing.')),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: 5 } },
                  BODY_PARTS.map(function (p) {
                    return h('button', { key: p.id, 'aria-pressed': placed === p.id ? 'true' : 'false',
                      onClick: function () { pickZone(p.id); },
                      style: btn({ width: '100%', fontSize: 13, border: '1px solid ' + (placed === p.id ? T.accent : T.border) }) }, p.label);
                  })
                ),
                placedZone && note(
                  placedZone.verdict === 'correct' ? '✓ ' + placedZone.label : '✗ ' + placedZone.label,
                  placedZone.verdict === 'correct'
                    ? ageInfo.where + ' ' + ageInfo.hands
                    : placedZone.why,
                  placedZone.verdict === 'correct' ? 'ok' : (placedZone.verdict === 'harm' ? 'bad' : 'warn')),
                placedZone && placedZone.verdict === 'correct' && h('p', { className: 'fr-placement-demo-note' }, __alloT('stem.firstresponse.hand_placement_reveal', 'The manikin now shows the hand arrangement at this region. Use Chest close-up or Overhead view to inspect the heel and fingers.')),
                renderChildHandChoice(),
                note(__alloT('stem.firstresponse.b3d_age_hands', '{age} — what changes').replace('{age}', ageInfo.icon + ' ' + ageInfo.label),
                  ageInfo.hands, 'ok')
              ),

              tab === 'aed' && h('div', null,
                h('h2', { style: { margin: '0 0 6px', fontSize: 15, color: T.accentHi } },
                  __alloT('stem.firstresponse.b3d_aed_h', 'Where do the AED pads go?')),
                h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: T.muted, lineHeight: 1.6 } },
                  age === 'infant'
                    ? __alloT('stem.firstresponse.b3d_aed_p_infant', 'The pads carry a picture showing this, and the AED talks you through it. On a baby the picture changes: the pads are the same size they always are, and two of them will not fit side by side on a chest that small. One goes on the front and one on the back, and the heart is still between them.')
                    : __alloT('stem.firstresponse.b3d_aed_p', 'The pads carry a picture showing this, and the AED talks you through it. Knowing the shape in advance means the picture makes sense when you are under pressure. Two pads, diagonally opposite, so the heart sits between them.')),
                // The pads in the 3D are drawn at true size against this body,
                // so the size mismatch on a small chest is visible rather than
                // asserted. Say so, or it reads as a rendering glitch.
                age !== 'adult' && note(
                  age === 'infant'
                    ? __alloT('stem.firstresponse.b3d_aed_size_infant', 'Look at the size of the pads')
                    : __alloT('stem.firstresponse.b3d_aed_size_child', 'Look at the size of the pads'),
                  age === 'infant'
                    ? 'They are not drawn small because the patient is small — an AED pad is one fixed piece of plastic. That is the whole reason the placement changes shape on a baby.'
                    : 'Adult pads on a child chest are relatively much bigger, but the diagonal pair still fits on a school-age child. If you are looking at a small child and the two pads would touch, use front-and-back instead, exactly as you would for a baby.',
                  age === 'infant' ? 'warn' : null),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: 5 } },
                  agePads.map(function (p) {
                    var on = padSelections.indexOf(p.id) !== -1;
                    return h('button', { key: p.id, 'aria-pressed': on ? 'true' : 'false',
                      onClick: function () { pickZone(p.id); },
                      style: btn({ width: '100%', fontSize: 13, border: '1px solid ' + (on ? T.accent : T.border) }) }, (on ? 'Placed: ' : '') + p.label);
                  })
                ),
                (function () {
                  var sel = pad ? padById(pad) : null;
                  if (padPairDone(padSelections)) return note('Both pads placed',
                    age === 'infant'
                      ? 'Correct pair for a baby: one on the centre of the chest, one on the back between the shoulder blades, with the heart between them.'
                      : 'Correct pair: upper right chest and lower left side, diagonally across the heart.', 'ok');
                  if (!sel) return null;
                  if (sel.verdict !== 'correct') return note('Try a different pair', sel.why,
                    sel.verdict === 'unsafe' ? 'bad' : 'warn');
                  return note(age === 'infant' ? 'One pad placed - add its partner' : 'One pad placed - add its diagonal partner',
                    sel.why + ' The task is not complete until both pads are positioned.', 'ok');
                })(),
                h('h3', { style: { margin: '14px 0 6px', fontSize: 13, color: T.accentHi } },
                  __alloT('stem.firstresponse.b3d_aed_rules', 'Before you press the button')),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                  AED_RULES.map(function (r) {
                    return h('div', { key: r.id, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                      h('div', { style: { fontSize: 12.5, fontWeight: 800, color: T.text, marginBottom: 3 } },
                        h('span', { 'aria-hidden': 'true' }, r.icon + ' '), r.label),
                      h('div', { style: { fontSize: 12.5, color: T.muted, lineHeight: 1.6 } }, r.why));
                  })
                )
              ),

              tab === 'depth' && h('div', null, renderDepthExplorer(),
                h('details', { className: 'fr-depth-reference' }, h('summary', null, __alloT('stem.firstresponse.depth_explorer_reference_details', 'Technique examples and age guidance')),
                h('h2', { style: { margin: '0 0 6px', fontSize: 15, color: T.accentHi } },
                  __alloT('stem.firstresponse.b3d_depth_h', 'How hard, and what happens between pushes')),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: 5 } },
                  ageMechanics.map(function (m) {
                    return h('button', { key: m.id, 'aria-pressed': mech === m.id ? 'true' : 'false',
                      onClick: function () { depthExample(m.id); frAnnounce(m.label + '. ' + m.why); },
                      style: btn({ width: '100%', fontSize: 13, border: '1px solid ' + (mech === m.id ? T.accent : T.border) }) }, m.label);
                  })
                ),
                (function () {
                  var sel = null;
                  for (var i = 0; i < ageMechanics.length; i++) if (ageMechanics[i].id === mech) sel = ageMechanics[i];
                  return sel ? note(sel.verdict === 'correct' ? '✓ ' + sel.label : '✗ ' + sel.label, sel.why, sel.verdict === 'correct' ? 'ok' : 'warn') : null;
                })(),
                note(ageInfo.icon + ' ' + ageInfo.label + __alloT('stem.firstresponse.b3d_depth_for', ' — depth for this age'),
                  ageInfo.depth, 'ok'),
                note('Model shown', modelTechnique),
                note(__alloT('stem.firstresponse.b3d_breaths', 'Do breaths matter here?'), ageInfo.breaths,
                  age === 'adult' ? null : 'warn'),
                // Only shown once breaths are on the table. An infant is flagged
                // because copying the adult tilt is the failure mode here, not a
                // matter of degree.
                note(__alloT('stem.firstresponse.b3d_airway', 'If you do give breaths: open the airway first'),
                  ageInfo.airway, age === 'infant' ? 'warn' : null),
                note(__alloT('stem.firstresponse.b3d_rate', 'And the rate'),
                  __alloT('stem.firstresponse.b3d_rate_body', '100 to 120 compressions a minute for every age, which is faster than most people expect. The CPR + AED module has a rhythm trainer for exactly this. Keep interruptions as short as you can, and if an AED arrives, turn it on and do what it says.'))
              )),

              tab === 'coach' && (function () {
                var session = frCoachRef.current;
                var metrics = analyzeCprTiming(session.intervals);
                var best = d.b3dCoachBest || null;
                var phaseTitle = session.phase === 'assessment' ? 'CHECK RESPONSE + BREATHING'
                  : (session.phase === 'call' ? 'CALL 911 NOW'
                  : (session.phase === 'aed' ? 'AED: FOLLOW PROMPTS'
                  : (session.phase === 'breaths'
                    ? 'BREATH ' + Math.min(2, session.breathCount + 1) + ' / 2'
                    : (session.phase === 'breathRecovery'
                      ? 'LET THE CHEST FALL'
                      : (session.phase === 'resume'
                        ? 'RESUME COMPRESSIONS NOW'
                        : 'COMPRESSIONS ' + session.compressionCount + ' / 30')))));
                var paceText = metrics.sampleCount < 2 ? 'Build a steady rhythm'
                  : (metrics.medianBpm < 100 ? 'Too slow - speed up'
                    : (metrics.medianBpm > 120 ? 'Too fast - ease back' : 'On target'));
                var paceColor = metrics.sampleCount < 2 ? T.dim
                  : (metrics.medianBpm >= 100 && metrics.medianBpm <= 120 ? T.ok : T.warn);
                var breathReady = !session.lastBreathAt || frCoachNow() - session.lastBreathAt >= CPR_COACH_SPEC.breathLockMs;
                var inBreathPhase = session.phase === 'breaths' || session.phase === 'breathRecovery';
                var pediatricCoach = age !== 'adult';
                var fallbackLabel = pediatricCoach ? 'Compression-only fallback' : 'Hands-only comparison';
                var boundaryText = coachMode === 'scenario'
                  ? 'Run the sequence: check response and breathing, call 911, 30 compressions, 2 breaths, AED, then resume. This is timing and sequence rehearsal only - not depth, force, recoil, airway seal, ventilation volume or certification.'
                  : (pediatricCoach
                  ? 'This is single-rescuer 30:2 practice. If a second trained rescuer joins, pediatric CPR uses 15:2. Breaths are recommended when willing and able; choose compression-only fallback only if you cannot or will not give breaths. This screen scores timing and sequence only - never depth, force, airway seal or real chest rise.'
                  : 'For an adult sudden collapse, a rescuer who cannot or will not give breaths should start hands-only compressions. If willing and able, use 30:2. This screen scores timing and sequence only - never depth, force, airway seal or real chest rise.');

                function settingButton(on, label, onClick, disabled) {
                  return h('button', {
                    disabled: !!disabled,
                    'aria-pressed': on ? 'true' : 'false',
                    onClick: onClick,
                    style: btn({ padding: '7px 11px', fontSize: 12,
                      opacity: disabled ? 0.55 : 1,
                      background: on ? T.accent : T.card,
                      color: on ? '#fff' : T.text,
                      border: '1px solid ' + (on ? T.accent : T.border) })
                  }, label);
                }

                return h('div', null,
                  h('h2', { style: { margin: '0 0 6px', fontSize: 16, color: T.accentHi } },
                    coachMode === 'scenario' ? 'Full cardiac-arrest sequence coach' : '30:2 compression + breath coach'),
                  h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: T.muted, lineHeight: 1.6 } },
                    'Practice the flow: 30 compressions, 2 breaths with visible chest rise and fall, then resume immediately. The moving ring is the target beat; your taps move the hands and chest.'),
                  h('div', { role: 'note', style: { padding: 10, borderRadius: 9, background: T.cardAlt, border: '1px solid ' + T.warn, fontSize: 11.5, lineHeight: 1.55, color: T.text, marginBottom: 10 } },
                    h('strong', { style: { color: T.warn } }, 'Training boundary: '),
                    boundaryText),

                  !session.running && session.phase !== 'complete' && h('div', null,
                    h('div', { style: { marginBottom: 9 } },
                      h('div', { style: { fontSize: 11, fontWeight: 800, color: T.dim, marginBottom: 5 } }, 'PRACTICE PATH'),
                      h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                        settingButton(coachMode === 'trained', '30:2 with breaths', function () { upd('b3dCoachMode', 'trained'); }, false),
                        settingButton(coachMode === 'handsOnly', fallbackLabel, function () { upd('b3dCoachMode', 'handsOnly'); }, false),
                        settingButton(coachMode === 'scenario', 'Full arrest run', function () { upd('b3dCoachMode', 'scenario'); }, false)
                      )
                    ),
                    h('div', { style: { marginBottom: 9 } },
                      h('div', { style: { fontSize: 11, fontWeight: 800, color: T.dim, marginBottom: 5 } }, 'LENGTH'),
                      h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                        settingButton(coachCycles === 1, '1 cycle + resume', function () { upd('b3dCoachCycles', 1); }, false),
                        settingButton(coachCycles === 2, '2 cycles', function () { upd('b3dCoachCycles', 2); }, false)
                      )
                    ),
                    h('label', { htmlFor: 'fr-body-coach-bpm', style: { display: 'block', fontSize: 11, fontWeight: 800, color: T.dim, marginBottom: 5 } },
                      'TARGET RATE - ' + coachBpm + ' bpm'),
                    h('input', { id: 'fr-body-coach-bpm', type: 'range', min: 100, max: 120, step: 1, value: coachBpm,
                      'aria-label': 'Target compression rate, ' + coachBpm + ' beats per minute',
                      onChange: function (e) { upd('b3dCoachBpm', parseInt(e.target.value, 10)); },
                      style: { width: '100%', marginBottom: 8 } }),
                    note(ageInfo.icon + ' ' + ageInfo.label + ' hand position', ageInfo.hands, 'ok'),
                    note('Model shown', modelTechnique),
                    h('button', { onClick: startCoach, style: btnPrimary({ width: '100%', marginTop: 10, textAlign: 'center', fontSize: 15, padding: '12px 16px' }) },
                      coachMode === 'trained' ? 'Start 30:2 practice' : (coachMode === 'scenario' ? 'Start full arrest scenario' : (pediatricCoach ? 'Start compression-only fallback' : 'Start hands-only practice')))
                  ),

                  session.running && h('div', null,
                    h('div', { role: 'status', style: { padding: '10px 12px', borderRadius: 10,
                      background: session.phase === 'resume' ? '#7f1d1d' : (inBreathPhase ? '#0c4a6e' : '#172554'),
                      border: '2px solid ' + (session.phase === 'resume' ? T.danger : (inBreathPhase ? '#38bdf8' : '#60a5fa')),
                      color: '#fff', fontSize: 16, fontWeight: 900, textAlign: 'center', letterSpacing: 0.7, marginBottom: 10 } },
                      'Cycle ' + session.cycle + ' / ' + session.goalCycles + ' - ' + phaseTitle),
                    // The airway cue belongs HERE, at the moment the learner is
                    // about to blow, not only in a reference panel. A breath into
                    // an unopened airway inflates the stomach instead of the
                    // lungs, and for an infant the adult tilt is actively wrong.
                    inBreathPhase && h('div', { role: 'note', style: { padding: '8px 11px', borderRadius: 9,
                      background: age === 'infant' ? '#78350f' : '#0c4a6e',
                      border: '1px solid ' + (age === 'infant' ? T.warn : '#38bdf8'),
                      color: '#fff', fontSize: 12.5, lineHeight: 1.55, marginBottom: 10 } },
                      h('strong', null, age === 'infant'
                        ? __alloT('stem.firstresponse.b3d_airway_cue_infant', 'Airway — neutral, do NOT tilt back: ')
                        : __alloT('stem.firstresponse.b3d_airway_cue', 'Open the airway first: ')),
                      ageInfo.airway),
                    session.mode === 'scenario' && (session.phase === 'assessment' || session.phase === 'call' || session.phase === 'aed') && h('div', { role: 'group', style: { padding: 10, borderRadius: 9, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 10 } },
                      h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: 7 } },
                        session.phase === 'assessment' ? 'Confirm the person is unresponsive and not breathing normally.' : (session.phase === 'call' ? 'Use speakerphone so dispatch can coach you while you start.' : 'Turn on the AED, attach pads, and follow every voice prompt.')),
                      h('button', { onClick: function () { scenarioAction(session.phase === 'assessment' ? 'assess' : (session.phase === 'call' ? 'call' : 'aed')); }, style: btnPrimary({ width: '100%', textAlign: 'center' }) },
                        session.phase === 'assessment' ? 'Check response and breathing' : (session.phase === 'call' ? 'Call 911 on speaker' : 'Apply AED and follow prompts'))
                    ),
                    h('div', { role: 'progressbar', 'aria-label': __alloT('stem.firstresponse.a11y_compressions_in_this_cycle', 'Compressions in this cycle'),
                      'aria-valuemin': 0, 'aria-valuemax': 30, 'aria-valuenow': Math.min(30, session.compressionCount),
                      style: { display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4, marginBottom: 10 } },
                      Array.from({ length: 30 }, function (_, i) {
                        var done = i < session.compressionCount;
                        return h('span', { key: i, 'aria-hidden': 'true', style: { height: 8, borderRadius: 999,
                          background: done ? T.ok : T.border,
                          opacity: done ? 1 : 0.55,
                          marginBottom: (i === 9 || i === 19) ? 3 : 0 } });
                      })
                    ),
                    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, marginBottom: 10 } },
                      h('div', { style: { padding: 8, borderRadius: 8, background: T.cardAlt, textAlign: 'center' } },
                        h('div', { style: { fontSize: 10, color: T.dim } }, 'ROLLING RATE'),
                        h('div', { style: { fontSize: 18, fontWeight: 900, color: paceColor } }, metrics.medianBpm ? metrics.medianBpm + ' bpm' : '--')),
                      h('div', { style: { padding: 8, borderRadius: 8, background: T.cardAlt, textAlign: 'center' } },
                        h('div', { style: { fontSize: 10, color: T.dim } }, 'IN RANGE'),
                        h('div', { style: { fontSize: 18, fontWeight: 900, color: metrics.inRangePct >= 70 ? T.ok : T.warn } }, metrics.inRangePct + '%')),
                      h('div', { style: { padding: 8, borderRadius: 8, background: T.cardAlt, textAlign: 'center' } },
                        h('div', { style: { fontSize: 10, color: T.dim } }, session.mode === 'scenario' ? 'RELEASE TIMING' : 'CONSISTENCY'),
                        h('div', { style: { fontSize: 18, fontWeight: 900, color: (session.mode === 'scenario' ? (session.releaseCount ? Math.round(session.holdDurations.filter(function (ms) { return ms >= 120 && ms <= 500; }).length / session.releaseCount * 100) : 0) : metrics.consistencyPct) >= 70 ? T.ok : T.warn } }, session.mode === 'scenario' ? (session.releaseCount ? Math.round(session.holdDurations.filter(function (ms) { return ms >= 120 && ms <= 500; }).length / session.releaseCount * 100) : 0) + '%' : metrics.consistencyPct + '%'))
                    ),
                    h('div', { style: { textAlign: 'center', fontSize: 12, fontWeight: 800, color: paceColor, marginBottom: 8 } }, paceText),
                    (session.phase === 'compressions' || session.phase === 'resume') && h('button', {
                      onClick: session.mode === 'scenario' && session.phase !== 'resume' ? recordScenarioCompressionClick : recordCoachCompression,
                      onPointerDown: session.mode === 'scenario' ? recordScenarioCompressionDown : undefined,
                      onPointerUp: session.mode === 'scenario' ? recordScenarioCompressionUp : undefined,
                      onPointerCancel: session.mode === 'scenario' ? recordScenarioCompressionUp : undefined,
                      onKeyDown: session.mode === 'scenario' ? function (e) { if (!e.repeat && (e.key === ' ' || e.key === 'Enter')) recordScenarioCompressionDown(); } : undefined,
                      onKeyUp: session.mode === 'scenario' ? function (e) { if (e.key === ' ' || e.key === 'Enter') recordScenarioCompressionUp(); } : undefined,
                      'aria-keyshortcuts': 'Space',
                      'aria-label': session.phase === 'resume' ? 'Resume compressions now' : (session.mode === 'scenario' ? 'Press and release compression ' + (session.compressionCount + 1) + ' of 30' : 'Record compression ' + (session.compressionCount + 1) + ' of 30'),
                      style: { display: 'block', width: 190, height: 190, margin: '0 auto 10px', borderRadius: '50%',
                        border: '4px solid ' + (session.phase === 'resume' ? '#fecaca' : '#fca5a5'),
                        background: session.phase === 'resume' ? '#b91c1c' : 'radial-gradient(circle at 35% 30%, #ef4444, #991b1b)',
                        color: '#fff', fontSize: 20, fontWeight: 950, cursor: 'pointer', boxShadow: '0 14px 34px rgba(220,38,38,.34)' }
                    }, session.phase === 'resume' ? 'RESUME' : (session.mode === 'scenario' ? 'PRESS + RELEASE' : 'PRESS')),
                    session.phase === 'breaths' && session.breathCount < CPR_COACH_SPEC.breathsPerCycle && h('button', {
                      'aria-disabled': breathReady ? 'false' : 'true',
                      onClick: recordCoachBreath,
                      'aria-label': 'Give simulated breath ' + (session.breathCount + 1) + ' of 2',
                      style: btn({ width: '100%', padding: 14, textAlign: 'center', fontSize: 16,
                        cursor: breathReady ? 'pointer' : 'not-allowed',
                        opacity: breathReady ? 1 : 0.55, background: '#075985', color: '#fff', border: '2px solid #38bdf8' })
                    }, breathReady ? 'Give breath ' + (session.breathCount + 1) : 'Let the chest fall...'),
                    inBreathPhase && h('div', { style: { marginTop: 6, fontSize: 11, color: T.dim, textAlign: 'center', lineHeight: 1.5 } },
                      'Each real breath should take about one second and use only enough air for visible chest rise; avoid excessive ventilation. This screen locks each simulated rise and fall but cannot assess seal or air volume.'),
                    h('button', { onClick: stopCoach, style: btn({ display: 'block', margin: '10px auto 0', padding: '6px 11px', fontSize: 11.5 }) }, 'Stop and reset')
                  ),

                  session.phase === 'complete' && session.summary && h('div', { style: { padding: 13, borderRadius: 10, background: T.card, border: '2px solid ' + (session.summary.score >= 75 ? T.ok : T.warn) } },
                    h('div', { style: { fontSize: 13, color: T.dim } }, session.summary.mode === 'scenario' ? 'FULL ARREST SCENARIO SCORE' : (session.summary.mode === 'trained' ? 'TIMING + 30:2 SEQUENCE SCORE' : 'COMPRESSION TIMING SCORE')),
                    h('div', { style: { fontSize: 34, fontWeight: 950, color: session.summary.score >= 75 ? T.ok : T.warn } }, session.summary.score + ' / 100'),
                    h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.7 } },
                      'Median rate: ' + session.summary.medianBpm + ' bpm | In range: ' + session.summary.inRangePct + '% | Consistency: ' + session.summary.consistencyPct + '%',
                      session.summary.mode === 'scenario' ? ' | Steps: ' + session.summary.scenarioSteps.join(' > ') + ' | Release timing: ' + session.summary.releaseTimingPct + '%' : (session.summary.mode === 'trained' ? ' | Longest breath pause: ' + (session.summary.longestPauseMs / 1000).toFixed(1) + ' s' : '')),
                    note('What this score means', session.summary.mode === 'scenario' ? 'It reflects sequence timing plus the screen?s press/release gesture only. It does not assess response checks, call quality, compression depth, recoil, force, airway seal, ventilation volume, AED pad placement or readiness to perform CPR.' : (session.summary.mode === 'trained' ? 'It reflects screen timing and the 30:2 sequence only. It does not measure compression depth, full recoil, hand force, airway seal, ventilation volume or readiness to perform CPR.' : 'It reflects screen compression timing only. It does not mean compression-only CPR is preferred for this age or cause, and it does not measure depth, recoil, force or readiness to perform CPR.'), 'warn'),
                    h('button', { onClick: stopCoach, style: btnPrimary({ marginTop: 10, width: '100%', textAlign: 'center' }) }, 'Practice again')
                  ),
                  !session.running && session.phase === 'idle' && best && h('div', { style: { marginTop: 8, fontSize: 11, color: T.dim, textAlign: 'center' } },
                    'Previous ' + (best.mode === 'scenario' ? 'full arrest scenario' : 'timing + sequence') + ' score: ' + best.score + ' / 100')
                );
              })(),

              tab === 'call' && (function () {
                var run = d.b3dCall || { caseId: null, step: 0, wrong: 0, unsafe: [], picked: null };
                function setRun(patch) { upd('b3dCall', Object.assign({}, run, patch)); }
                var kase = null;
                for (var ci = 0; ci < CALL_CASES.length; ci++) if (CALL_CASES[ci].id === run.caseId) kase = CALL_CASES[ci];

                if (!kase) {
                  return h('div', null,
                    h('h2', { style: { margin: '0 0 6px', fontSize: 15, color: T.accentHi } },
                      __alloT('stem.firstresponse.b3d_call_h', 'Run the call')),
                    h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: T.muted, lineHeight: 1.6 } },
                      __alloT('stem.firstresponse.b3d_call_p', 'The other tabs each teach one piece. Here you have to put them together the way a real call makes you — assess, choose a technique for the person in front of you, place your hands, and adapt when an AED turns up.')),
                    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 7 } },
                      CALL_CASES.map(function (c) {
                        return h('button', { key: c.id,
                          'aria-label': 'Start scenario: ' + c.title,
                          onClick: function () { setRun({ caseId: c.id, step: 0, wrong: 0, unsafe: [], picked: null }); frAnnounce('Scenario: ' + c.title + '. ' + c.scene); },
                          style: btn({ width: '100%' }) },
                          h('div', { style: { fontSize: 13.5, fontWeight: 800, color: T.text, marginBottom: 3 } },
                            h('span', { 'aria-hidden': 'true' }, c.icon + ' '), c.title),
                          h('div', { style: { fontSize: 11.5, color: T.muted, lineHeight: 1.5, fontWeight: 400 } }, c.scene.slice(0, 110) + '…'));
                      })
                    ));
                }

                var finished = run.step >= kase.steps.length;
                var step = finished ? null : kase.steps[run.step];
                var pickedOpt = null;
                if (step && run.picked) {
                  for (var oi = 0; oi < step.options.length; oi++) if (step.options[oi].id === run.picked) pickedOpt = step.options[oi];
                }
                var grade = run.unsafe.length >= 2 ? 'F' : (run.unsafe.length ? 'D' : (run.wrong >= 3 ? 'C' : (run.wrong ? 'B' : 'A')));

                return h('div', null,
                  h('button', { onClick: function () { setRun({ caseId: null }); }, style: btn({ padding: '5px 10px', fontSize: 12, marginBottom: 10 }) },
                    __alloT('stem.firstresponse.b3d_call_back', '← Scenarios')),
                  h('h2', { style: { margin: '0 0 4px', fontSize: 15, color: T.accentHi } },
                    h('span', { 'aria-hidden': 'true' }, kase.icon + ' '), kase.title),
                  h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: T.text, lineHeight: 1.6, fontStyle: 'italic' } }, kase.scene),

                  !finished && h('div', null,
                    h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 6 } },
                      __alloT('stem.firstresponse.b3d_call_step', 'Step ') + (run.step + 1) + ' / ' + kase.steps.length),
                    h('div', { style: { fontSize: 13.5, fontWeight: 800, color: T.text, marginBottom: 8, lineHeight: 1.5 } }, step.prompt),
                    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                      step.options.map(function (o) {
                        var isPick = run.picked === o.id;
                        var tone = !run.picked ? T.border : (o.verdict === 'correct' ? T.ok : (o.verdict === 'unsafe' ? T.danger : T.warn));
                        return h('div', { key: o.id },
                          h('button', { disabled: !!run.picked,
                            onClick: function () {
                              var patch = { picked: o.id };
                              if (o.verdict === 'unsafe' && run.unsafe.indexOf(o.id) === -1) patch.unsafe = run.unsafe.concat([kase.id + ':' + run.step + ':' + o.id]);
                              if (o.verdict === 'wrong') patch.wrong = run.wrong + 1;
                              setRun(patch);
                              if (o.verdict === 'correct') frAnnounce('Correct. ' + o.why);
                              else frAnnounceUrgent((o.verdict === 'unsafe' ? 'Unsafe. ' : 'Not right. ') + o.why);
                            },
                            style: btn({ width: '100%', fontSize: 13, border: '1px solid ' + (isPick ? tone : T.border), background: isPick ? T.cardAlt : T.card }) },
                            (run.picked ? (o.verdict === 'correct' ? '✓ ' : (o.verdict === 'unsafe' ? '⛔ ' : '✗ ')) : '') + o.label),
                          run.picked && isPick && h('div', { style: { padding: '8px 11px', fontSize: 12.5, color: T.text, lineHeight: 1.6, background: T.cardAlt, borderLeft: '3px solid ' + tone, marginTop: 3, borderRadius: 4 } },
                            o.verdict === 'unsafe' && h('strong', { style: { color: T.danger } }, __alloT('stem.firstresponse.b3d_call_unsafe', 'Unsafe. ')),
                            o.why));
                      })
                    ),
                    pickedOpt && h('button', {
                      onClick: function () { setRun({ step: run.step + 1, picked: null }); },
                      style: btn({ marginTop: 10, background: T.accent, color: '#fff', border: '1px solid ' + T.accent, fontSize: 13 }) },
                      run.step + 1 >= kase.steps.length
                        ? __alloT('stem.firstresponse.b3d_call_finish', 'See how you did →')
                        : __alloT('stem.firstresponse.b3d_call_next', 'Next →'))
                  ),

                  finished && h('div', { style: { padding: 13, borderRadius: 10, background: T.card, border: '2px solid ' + (grade === 'A' ? T.ok : (run.unsafe.length ? T.danger : T.warn)) } },
                    h('div', { style: { fontSize: 20, fontWeight: 900, color: grade === 'A' ? T.ok : (run.unsafe.length ? T.danger : T.warn), marginBottom: 4 } },
                      __alloT('stem.firstresponse.b3d_call_grade', 'Grade: ') + grade),
                    h('div', { style: { fontSize: 12, color: T.muted, marginBottom: 8 } },
                      run.wrong + __alloT('stem.firstresponse.b3d_call_wrongs', ' wrong · ') + run.unsafe.length + __alloT('stem.firstresponse.b3d_call_unsafes', ' unsafe')),
                    run.unsafe.length > 0 && note(__alloT('stem.firstresponse.b3d_call_unsafe_h', 'The unsafe choices matter more than the grade'),
                      __alloT('stem.firstresponse.b3d_call_unsafe_b', 'Every unsafe option in this scenario is one people really choose, usually while trying to help. Run it again and notice what made it look reasonable at the time.'), 'bad'),
                    note(__alloT('stem.firstresponse.b3d_call_debrief', 'What this call teaches'), kase.debrief, 'ok'),
                    h('div', { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' } },
                      h('button', { onClick: function () { setRun({ step: 0, wrong: 0, unsafe: [], picked: null }); }, style: btn({ fontSize: 12.5 }) },
                        __alloT('stem.firstresponse.b3d_call_again', '↺ Run it again')),
                      h('button', { onClick: function () { setRun({ caseId: null }); }, style: btn({ fontSize: 12.5, background: T.accent, color: '#fff', border: '1px solid ' + T.accent }) },
                        __alloT('stem.firstresponse.b3d_call_next_case', 'Another scenario →')))
                  )
                );
              })(),

              tab === 'recovery' && h('div', null,
                h('h2', { style: { margin: '0 0 6px', fontSize: 15, color: T.accentHi } },
                  __alloT('stem.firstresponse.b3d_rec_h', 'Recovery position, in order')),
                h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: T.muted, lineHeight: 1.6 } },
                  __alloT('stem.firstresponse.b3d_rec_p', 'Only for someone unresponsive who IS breathing normally. Work through it and watch the body turn.')),
                h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 6 } }, recDone.length + ' / ' + RECOVERY_STEPS.length),
                renderRecoveryReview(),
                h('ol', { style: { margin: '0 0 10px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 } },
                  RECOVERY_STEPS.map(function (s, i) {
                    var done = recDone.indexOf(s.id) !== -1;
                    var next = recDone.length === i;
                    return h('li', { key: s.id, style: { fontSize: 12.5, color: done ? T.ok : (next ? T.text : T.dim), lineHeight: 1.5 } },
                      h('button', { disabled: !next,
                        onClick: function () { updMulti({ b3dRec: recDone.concat([s.id]), b3dRecView: null }); frAnnounce('Step ' + (i + 1) + '. ' + s.label + '. ' + s.why); },
                        style: btn({ padding: '6px 9px', fontSize: 12.5, width: '100%', opacity: next ? 1 : 0.75, cursor: next ? 'pointer' : 'default', border: '1px solid ' + (done ? T.ok : T.border) }) },
                        h('span', { 'aria-hidden': 'true' }, s.icon + ' '), s.label),
                      done && h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, padding: '4px 2px 0' } }, s.why));
                  })
                ),
                recDone.length > 0 && h('button', { onClick: function () { updMulti({ b3dRec: [], b3dRecView: null }); frAnnounce('Reset'); }, style: btn({ padding: '6px 10px', fontSize: 12 }) },
                  __alloT('stem.firstresponse.b3d_rec_reset', '↺ Start again')),
                recDone.length >= RECOVERY_STEPS.length && recPose === recDone.length && note(
                  __alloT('stem.firstresponse.b3d_rec_done', 'Positioned — now keep watching'),
                  __alloT('stem.firstresponse.b3d_rec_done_body', 'The recovery position buys a protected airway; it does not end the emergency. Stay with them, keep checking that breathing is still normal, and if it stops or turns to gasping, roll them onto their back and start compressions straight away.'),
                  'ok')
              )
            )
          )
        );
      }

      var viewBody;
      switch (view) {
        case 'recognize':       viewBody = renderRecognize(); break;
        case 'call':            viewBody = renderCall(); break;
        case 'cprAed':          viewBody = renderCprAed(); break;
        case 'body3d':          viewBody = renderBody3D(); break;
        case 'bleed':           viewBody = renderBleed(); break;
        case 'choking':         viewBody = renderChoking(); break;
        case 'disabilityAware': viewBody = renderDisabilityAware(); break;
        case 'scenarios':       viewBody = renderScenarios(); break;
        case 'firstAction':     viewBody = renderFirstActionSleuth(); break;
        case 'aiPractice':      viewBody = renderAiPractice(); break;
        case 'resources':       viewBody = renderResources(); break;
        case 'mastery':         viewBody = renderResponderMastery(); break;
        case 'decisionHunt':    viewBody = (function() {
          var iq = d.decisionHunt || { speed: 50, accuracy: 50, consistency: 50, recall: 50, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
          function setIQ(patch) { upd('decisionHunt', Object.assign({}, iq, patch)); }
          var readiness = (iq.speed * 0.2 + iq.accuracy * 0.3 + iq.consistency * 0.25 + iq.recall * 0.25) / 100;
          var state;
          if (readiness < 0.3) state = 'novice';
          else if (readiness < 0.55) state = 'developing';
          else if (readiness < 0.8) state = 'competent';
          else state = 'expert';
          var sm = {
            novice:     { label: __alloT('stem.firstresponse.novice_responder', '🌱 Novice responder'), color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', desc: __alloT('stem.firstresponse.build_foundational_recognition_first', 'Build foundational recognition first.') },
            developing: { label: __alloT('stem.firstresponse.developing', '🟡 Developing'), color: '#b45309', bg: '#fffbeb', border: '#fcd34d', desc: __alloT('stem.firstresponse.practice_scenarios_build_automaticity', 'Practice scenarios; build automaticity.') },
            competent:  { label: __alloT('stem.firstresponse.competent', '🟢 Competent'), color: '#047857', bg: '#ecfdf5', border: '#86efac', desc: __alloT('stem.firstresponse.reliable_in_familiar_situations', 'Reliable in familiar situations.') },
            expert:     { label: __alloT('stem.firstresponse.expert', '🌟 Expert'), color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', desc: __alloT('stem.firstresponse.calibrated_across_diverse_vignettes', 'Calibrated across diverse vignettes.') }
          }[state];
          var H = function(t, p, c) { return ctx.React.createElement.apply(null, arguments); };
          return H('div', { style: { padding: 20, maxWidth: 900, margin: '0 auto' } },
            H('button', { onClick: function() { upd('view', 'menu'); }, style: { padding: '6px 12px', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 6, fontSize: 11, cursor: 'pointer', marginBottom: 12 } }, '← Menu'),
            H('div', { style: { padding: 16, background: T.card, borderRadius: 10, color: T.text, border: '1px solid ' + T.border } },
              H('h3', { style: { fontSize: 14, fontWeight: 800, color: T.accentHi, margin: '0 0 6px 0' } }, '🧭 Decision-calibration discovery'),
              H('p', { style: { fontSize: 12, color: T.muted, marginBottom: 12 } }, 'Four sliders self-rate response capabilities. Discrete 4-state readiness + SVG capability heatmap. No score, no reveal.'),
              H('div', { style: { padding: 12, borderRadius: 8, textAlign: 'center', background: sm.bg, border: '2px solid ' + sm.border, marginBottom: 12 } },
                H('div', { style: { fontSize: 14, fontWeight: 900, color: sm.color } }, sm.label),
                H('div', { style: { fontSize: 11, color: '#475569', marginTop: 4 } }, sm.desc),
                H('div', { style: { fontSize: 10, color: '#64748b', marginTop: 4, fontFamily: 'monospace' } }, 'Readiness ' + (readiness * 100).toFixed(0) + '%')
              ),
              // SVG capability heatmap
              H('div', { style: { padding: 10, background: 'rgba(15,23,42,0.4)', borderRadius: 8, marginBottom: 12 } },
                H('svg', { viewBox: '0 0 280 80', style: { width: '100%', height: 80 } },
                  ['speed', 'accuracy', 'consistency', 'recall'].map(function(k, i) {
                    var val = iq[k];
                    var color = val > 75 ? '#059669' : (val > 50 ? '#d97706' : (val > 25 ? '#ea580c' : '#dc2626'));
                    return H('g', { key: 'h' + i },
                      H('rect', { x: 20 + i * 65, y: 20, width: 50, height: 40, fill: color, rx: 4, opacity: 0.3 + val / 150 }),
                      H('text', { x: 45 + i * 65, y: 45, textAnchor: 'middle', fontSize: 12, fontWeight: 'bold', fill: '#fff' }, val + '%'),
                      H('text', { x: 45 + i * 65, y: 72, textAnchor: 'middle', fontSize: 9, fill: '#94a3b8' }, k)
                    );
                  })
                )
              ),
              H('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 10 } },
                [{ k: 'speed', l: 'Response speed (%)' },
                 { k: 'accuracy', l: 'Action accuracy (%)' },
                 { k: 'consistency', l: 'Scenario consistency (%)' },
                 { k: 'recall', l: 'Critical-action recall (%)' }].map(function(s) {
                  return H('div', { key: s.k },
                    H('label', { htmlFor: 'dc-' + s.k, style: { display: 'block', fontSize: 11, fontWeight: 'bold', color: T.muted, marginBottom: 4 } }, s.l + ': ', H('span', { style: { color: T.accentHi, fontFamily: 'monospace' } }, iq[s.k])),
                    H('input', { id: 'dc-' + s.k, type: 'range', min: 0, max: 100, step: 5, value: iq[s.k],
                      onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                      style: { width: '100%' }, 'aria-label': s.l }));
                })
              ),
              H('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 } },
                H('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ sp: iq.speed, a: iq.accuracy, c: iq.consistency, r: iq.recall, st: state }]).slice(-8) }); }, style: { padding: '4px 10px', background: T.bg2 || '#1e293b', color: T.text, border: '1px solid ' + T.border, borderRadius: 4, fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, '📋 Log'),
                H('button', { onClick: function() { setIQ({ speed: 50, accuracy: 50, consistency: 50, recall: 50, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, style: { padding: '4px 10px', background: 'transparent', color: T.muted, border: '1px solid ' + T.border, borderRadius: 4, fontSize: 11, cursor: 'pointer' } }, '↺ Reset')
              ),
              H('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, 'aria-label': __alloT('stem.firstresponse.hypothesis_input', 'First-aid readiness hypothesis'), placeholder: __alloT('stem.firstresponse.hypothesis_which_capability_matters_mo', 'Hypothesis: which capability matters most for first-aid response?'),
                style: { width: '100%', minHeight: 50, padding: 6, background: T.bg2 || '#1e293b', color: T.text, border: '1px solid ' + T.border, borderRadius: 4, fontSize: 12, fontFamily: 'monospace', marginBottom: 8 }, rows: 2 }),
              !iq.stuckRevealed && H('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, style: { padding: '4px 10px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.5)', borderRadius: 4, fontSize: 11, fontWeight: 'bold', cursor: 'pointer', marginBottom: 8 } }, '🤔 Stuck — open prompts'),
              iq.stuckRevealed && H('div', { style: { padding: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 4, fontSize: 11, color: T.text, marginBottom: 8 } },
                H('ul', { style: { margin: 0, paddingLeft: 18 } },
                  H('li', null, 'In real emergencies, what matters more: speed or accuracy?'),
                  H('li', null, 'Real EMTs run drills until response is automatic. Why?'))),
              H('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 'bold', color: '#34d399', cursor: 'pointer' } },
                H('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }), 'I understand — explain'),
              iq.understood && H('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, 'aria-label': __alloT('stem.firstresponse.explanation_input', 'First-aid readiness explanation'), placeholder: __alloT('stem.firstresponse.explain_readiness_composition', 'Explain readiness composition.'),
                style: { width: '100%', minHeight: 60, padding: 6, background: T.bg2 || '#1e293b', color: T.text, border: '1px solid rgba(16,185,129,0.3)', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', marginTop: 6 }, rows: 3 }),
              H('div', { style: { marginTop: 8, fontSize: 10, fontStyle: 'italic', color: T.muted } }, 'Design note: discrete 4-state readiness marker; SVG capability map; no certification score — by design.')
            )
          );
        })(); break;
        case 'menu':
        default:                viewBody = renderMenu(); break;
      }
      return React.createElement(React.Fragment, null,
        React.createElement('div', {
          'data-fr-substrate': 'true',
          style: { background: T.bg, color: T.text, borderRadius: 12 }
        }, viewBody));
      } catch(e) {
        console.error('[FirstResponse] render error', e);
        return ctx.React.createElement('div', { style: { padding: 16, color: '#fde2e2', background: '#7f1d1d', borderRadius: 8 } },
          'First Response Lab failed to render. ' + (e && e.message ? e.message : ''));
      }
    }
  });

})();

}  // end isRegistered guard
