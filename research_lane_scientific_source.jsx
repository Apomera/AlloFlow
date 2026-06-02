/**
 * AlloFlow — Research Hub Tier 2: Scientific Inquiry Lane (Phenomenon Workbench)
 *
 * Plugin that self-registers via window.ResearchHub.registerLane('scientific',
 * {...}) on load. Renders the 6-stage iterative cycle (Notice & Wonder →
 * Model-It → Plan → Gather → Interpret → Revise) with a HEX-RING cycle
 * diagram as primary nav (not a linear stepper — per the loop-back reviewer
 * who flagged that linear UI teaches the opposite of cyclical inquiry).
 *
 * Reviewer-converged design properties baked in (cannot be relaxed without
 * regressing pedagogical integrity):
 *
 *   • Cycle wheel as primary nav. Every stage click-jumpable from every
 *     other stage. Loop-back affordances on every stage to every prior
 *     stage. Loop-back preserves downstream work (does NOT delete it); a
 *     superseded-by banner appears on downstream stages when an upstream
 *     stage changes after them. Student explicitly acknowledges + reconciles.
 *
 *   • 1-tap loop-back chip picker. Reasons: new_evidence /
 *     assumption_surfaced / plan_mismatch / other (+ free-text). Required
 *     to navigate. Persists as loopBacks[].whyChipId so educator dashboards
 *     get reliable data instead of empty fields.
 *
 *   • Timeline view for modelSnapshots. Default rendering = horizontal
 *     v1 → v2 → vN with deltas highlighted (oldest → newest, NOT a newest-
 *     first card stack — the latter buries the trajectory and treats
 *     versions as backups). Card-stack view remains as a secondary toggle.
 *
 *   • Append-log model card with archived knownUnknowns. Each modelSnapshots
 *     entry is { v, ts, text, confidence, knownUnknowns, loopBackOrigin?,
 *     deltaFromPrior? }. Looping back to v2 shows v2's text + v2's known-
 *     unknowns coherently (rather than v3's globally-current side state).
 *
 *   • Dedicated wonderings[] substrate (separate from evidenceCards). The
 *     Wonder-sorter gate counts wonderings structurally, not by tag-filter.
 *     Each wondering is its own row in the journal, can be text or 60s
 *     voice. Distinctness check (token-Jaccard < 0.7 pairwise) prevents
 *     near-duplicates from satisfying the 5-floor.
 *
 *   • First-class claims[] substrate. Top-level journal field, not nested
 *     in stageNotes.revise_share — the export artifact's headline data
 *     lives where the substrate can render it consistently. Each claim is
 *     { id, ts, text, label, staleLabel?, aiLabelQuestion?, warrantText?,
 *     calibrationResponse? }. Looping back to upstream stages marks claim
 *     labels as staleLabel:true with a "re-label against the new model"
 *     banner; export soft-blocks until acknowledged.
 *
 *   • Method menu at Stage 3 is non-hierarchical (8 entries; replicate is
 *     first-class). Each entry surfaces fits + doesntFit explicitly so the
 *     trade-off is visible. "Controlled experiment" is one option among
 *     equals, not the default.
 *
 *   • All 4 AI touchpoints gated student-first with hardened gateCheck
 *     functions (isPlausibleProse / token-distinctness / mechanism-verb
 *     allowlist / perspective-marker / evidence-link substring). Each
 *     touchpoint's expectedJsonShape is question-form (no free-text
 *     completion fields). The wrapper enforces format globally and
 *     refunds + telemetry-logs on validator rejection.
 *
 *   • Steelman pass-2 requires student-authored comparisonText (≥80 chars)
 *     before revise_share + export — neutralizes the unavoidable structural
 *     leak where the AI's "another reading" is necessarily a finished
 *     interpretation. The student authors the comparison; AI does not.
 *
 *   • Student authors assumptions-required and disconfirmers for THEIR OWN
 *     reading BEFORE the AI panel renders (≥2 each). Side-by-side then
 *     becomes student-vs-student-extended rather than student-vs-AI-polished.
 *
 *   • Honest-uncertainty touchpoint enforces claim-touches-investigation
 *     substring linkage. Claims that don't reference any evidence-card
 *     content or current-model content fail the gate ("claims should be
 *     about what you actually investigated"). Drop "well-calibrated" from
 *     the calibration-flag enum (no AI approval verdicts).
 *
 *   • Exemplar pairs gate every AI touchpoint. journal.stageNotes[stage]
 *     .exemplarViewed must be true (or .exemplarDismissed) before AI can
 *     be invoked at all. Exemplars are leak-free pedagogy; AI is last.
 *
 *   • Two cross-cutting "loop-rewarding" exemplar pairs in addition to the
 *     6 per-stage pairs. Teach teachers (and students) that a session log
 *     with 3 loop-backs and version-delta evidence is BETTER inquiry than
 *     a clean 1→6 walk. Without these, rubric grading silently re-imposes
 *     PHEOC linearity.
 *
 *   • whyNotPheoc educator panel collapsible at lane entry. Explicit
 *     framing: "A student who loops back 3+ times is doing BETTER science
 *     than one who walks 1→6 once."
 *
 *   • ctx.loopReturn(toStage) API. After loop-back-and-edit, persistent
 *     "← Return to where I was: Interpret & Argue" affordance carries the
 *     student back without forcing re-walk through intervening stages.
 *
 *   • Loop-density gentle nudges (informational only, not coercive). After
 *     20+ minutes with zero loop-backs: "Inquiry usually loops; worth a
 *     check?" After 6+ loop-backs in 10 min: "Looping is good — also OK
 *     to commit and gather more evidence."
 */
(function () {
  'use strict';
  if (window.ResearchHub && window.ResearchHub._lanes && window.ResearchHub._lanes.scientific
      && window.ResearchHub._lanes.scientific.__tier >= 2) {
    console.log('[CDN] ResearchLaneScientific already registered, skipping');
    return;
  }
  if (!window.ResearchHub || typeof window.ResearchHub.registerLane !== 'function') {
    console.warn('[ResearchLaneScientific] window.ResearchHub not yet available — deferring');
    // Retry on next tick in case loadModule order is non-deterministic
    setTimeout(arguments.callee || function(){}, 200);
    return;
  }

  var React = window.React;
  if (!React) { console.error('[ResearchLaneScientific] React not found'); return; }
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useMemo = React.useMemo;
  var useRef = React.useRef;
  var useCallback = React.useCallback;

  var H = window.ResearchHub.helpers || {};
  var isPlausibleProse = H.isPlausibleProse || function () { return { ok: true }; };
  var normalizeForCompare = H.normalizeForCompare || function (s) { return (s || '').toLowerCase(); };
  var tokenJaccard = H.tokenJaccard || function () { return 0; };
  var MECHANISM_VERBS = H.MECHANISM_VERBS || [];
  var PERSPECTIVE_MARKERS_RE = H.PERSPECTIVE_MARKERS_RE || /\b(could|might|someone|alternatively)\b/i;

  // ───────────────────────────────────────────────────────────────────────
  // Stage catalog. Loop-back targets satisfy the invariant: stage S_n can
  // loop back to any S_1..S_{n-1}. The cycle wheel renders these as edges.
  // ───────────────────────────────────────────────────────────────────────
  var STAGES = [
    { key: 'notice_wonder',  label: 'Notice & Wonder',  icon: '\u{1F440}',
      shortLabel: 'Notice', color: '#2563eb', loopBackTargets: [] },
    { key: 'model_it',       label: 'Model-It',         icon: '\u{1F9E0}',
      shortLabel: 'Model',  color: '#7c3aed', loopBackTargets: ['notice_wonder'] },
    { key: 'plan',           label: 'Plan an Approach', icon: '\u{1F5FA}\u{FE0F}',
      shortLabel: 'Plan',   color: '#0d9488', loopBackTargets: ['notice_wonder','model_it'] },
    { key: 'gather',         label: 'Gather Evidence',  icon: '\u{1F50E}',
      shortLabel: 'Gather', color: '#d97706', loopBackTargets: ['notice_wonder','model_it','plan'] },
    { key: 'interpret_argue',label: 'Interpret & Argue',icon: '\u{2696}\u{FE0F}',
      shortLabel: 'Interpret', color: '#16a34a', loopBackTargets: ['notice_wonder','model_it','plan','gather'] },
    { key: 'revise_share',   label: 'Revise & Share',   icon: '\u{1F501}',
      shortLabel: 'Revise', color: '#4338ca', loopBackTargets: ['notice_wonder','model_it','plan','gather','interpret_argue'] },
  ];
  var STAGE_KEYS = STAGES.map(function (s) { return s.key; });
  var STAGE_BY_KEY = {};
  STAGES.forEach(function (s) { STAGE_BY_KEY[s.key] = s; });

  // ───────────────────────────────────────────────────────────────────────
  // Loop-back chip picker reasons. 1-tap satisfies the why field.
  // ───────────────────────────────────────────────────────────────────────
  var LOOPBACK_CHIPS = [
    { id: 'new_evidence',         label: 'New evidence changed my mind',          icon: '\u{1F4DD}' },
    { id: 'assumption_surfaced',  label: 'I noticed my model assumed something',  icon: '\u{1F50D}' },
    { id: 'plan_mismatch',        label: "My plan can't actually answer my Q",    icon: '\u{1F914}' },
    { id: 'evidence_anomaly',     label: 'Something surprised me in the data',    icon: '\u{1F4A1}' },
    { id: 'other',                label: 'Other (I will explain)',                icon: '\u{1F4AC}' },
  ];

  // ───────────────────────────────────────────────────────────────────────
  // Method menu. Non-hierarchical. Replicate is first-class.
  // ───────────────────────────────────────────────────────────────────────
  var METHOD_MENU = [
    { key: 'controlled',        label: 'Controlled experiment',
      fits: "You can isolate one variable, manipulate it, hold others constant, and measure an outcome.",
      doesntFit: "The thing you care about can't be ethically or practically manipulated." },
    { key: 'observational',     label: 'Structured observation',
      fits: 'The phenomenon happens on its own and you want to record what occurs, when, and with what.',
      doesntFit: 'You need to know WHY with high confidence — observation shows patterns, not isolated causes.' },
    { key: 'simulation',        label: 'Simulation / model run',
      fits: 'You can build or use a model (digital, physical, mathematical) to explore system behavior.',
      doesntFit: "The real system has dynamics your simulation doesn't represent — conclusions hold only if the model is faithful." },
    { key: 'secondary_data',    label: 'Secondary-data analysis',
      fits: 'Someone has already collected good data on this and your question is about patterns in it.',
      doesntFit: "The data wasn't collected for YOUR question — your variables may not be in there." },
    { key: 'comparative',       label: 'Comparative case study',
      fits: 'You want to compare 2-4 cases that differ on the thing you care about.',
      doesntFit: 'You only have one case — comparison needs at least two and ideally varied.' },
    { key: 'replicate',         label: 'Replicate a published finding',
      fits: "Someone reported a result and you want to see if it holds when YOU run it. This is real science — not 'just copying'.",
      doesntFit: "You don't have access to the original method in enough detail to follow it faithfully." },
    { key: 'measurement_design',label: 'Measurement design',
      fits: 'Before any of the above, you need to figure out HOW to measure the thing.',
      doesntFit: 'You already have a trusted measurement — going meta would waste your time.' },
    { key: 'mixed',             label: 'Mixed approach',
      fits: 'Your question genuinely needs two methods together. Name BOTH and why.',
      doesntFit: "You're picking 'mixed' because you can't decide — pick one as primary first." },
  ];

  // ───────────────────────────────────────────────────────────────────────
  // Exemplar pairs. 6 per-stage + 2 cross-cutting loop-rewarding ones.
  // Reviewer 3 flagged that single-stage exemplars silently re-impose
  // linearity at the rubric layer. The cross-cutting pairs explicitly
  // reward backward loops + version-delta evidence.
  // ───────────────────────────────────────────────────────────────────────
  var EXEMPLAR_PAIRS = {
    notice_wonder: {
      criterion: 'A wondering names something you could actually investigate — not just a yes/no curiosity.',
      strongExample: 'I wonder whether the lamp temperature drops MORE when the wire is thicker than when it is thinner.',
      weakExample: 'I wonder if science is cool.',
    },
    model_it: {
      criterion: 'A first-draft model names entities, a proposed relationship, AND admits what you do not know.',
      strongExample: "The lamp gives off heat AND light. I think the wire carries some heat away from the bulb to the base. I don't know whether the wire's material matters or just its thickness.",
      weakExample: 'It gets hot because electricity.',
    },
    plan: {
      criterion: "A plan names the method, why it fits THIS question, and what the method CAN'T tell you.",
      strongExample: "Controlled experiment: I'll vary wire thickness (3 levels), keep material and length constant, and measure base temperature after 5 minutes. This won't tell me how thickness interacts with material — I'd need a second study.",
      weakExample: "I'll do an experiment with wires and see what happens.",
    },
    gather: {
      criterion: "An evidence card flagged 'didn't expect this' names what surprised you AND why it is surprising given your model.",
      strongExample: '2:14pm — base temp DROPPED 0.3°C when I switched to the thickest wire. Surprising because my model predicted thicker = more heat conducted = warmer base. Maybe the wire is also radiating heat away?',
      weakExample: 'Weird result at 2:14.',
    },
    interpret_argue: {
      criterion: "A strong steelman of an OPPOSING reading takes the other side seriously — it doesn't strawman.",
      strongExample: "Someone could reasonably read this as: the base temperature varies because of room air currents, not the wire at all. The 0.3°C drop is within the noise we saw in trials 1-2 even without changing wires. My data don't separate these.",
      weakExample: 'Someone might say I am wrong but they would just be missing the obvious pattern.',
    },
    revise_share: {
      criterion: 'Honest labeling distinguishes what the evidence actually supports from what you still want to be true.',
      strongExample: 'Claim: thicker wires conduct more heat → OVERREACH (my n=3 trials don\'t separate this from air-current noise). Claim: temperature varied across trials → SUPPORTED. Claim: material doesn\'t matter → STILL-UNKNOWN (I only tested copper).',
      weakExample: 'Claim: my hypothesis was right → SUPPORTED.',
    },
  };
  var LOOP_REWARDING_EXEMPLARS = [
    {
      criterion: 'A strong inquiry shows the student looped back when evidence demanded it.',
      strongExample: 'Stage log: model v1 (electricity makes heat) → noticed temp DROP at 2:14 → looped back to model_it → model v2 (wire conducts heat AWAY from bulb) → re-ran plan with thicker wires → 3 loop-backs total, claims labeled honestly.',
      weakExample: 'Stage log: walked notice → model → plan → gather → interpret → revise in 18 minutes. Zero loop-backs. Model v1 = model v3 verbatim. All claims SUPPORTED.',
    },
    {
      criterion: "A model trajectory shows real revision, not cosmetic edits.",
      strongExample: 'v1: "wire gets hot because electricity" → v2 (after loop-back from gather): "wire conducts heat away from filament; thickness matters because cross-section" → v3 (after steelman): "maybe also radiates; air currents may explain trial variation". Each version names what changed and why.',
      weakExample: 'v1: "wire gets hot" → v2: "wire gets hot." → v3: "wire gets hot!" Same content, three saves.',
    },
  ];

  // ───────────────────────────────────────────────────────────────────────
  // Touchpoint configs. Each has gateCheck(journal, ctx) and validate(out).
  // Per the schema-leak reviewer, expectedJsonShape uses question-form
  // arrays — no free-text completion fields.
  // ───────────────────────────────────────────────────────────────────────
  function wonderSorterGate(journal) {
    var titleCheck = isPlausibleProse(journal.questionTitle, 10, { minTokens: 2 });
    if (!titleCheck.ok) {
      return { ok: false, reason: 'Describe the phenomenon you noticed in a real sentence (≥10 chars, more than one word).',
               bypass_signals: ['questionTitle_' + titleCheck.reason] };
    }
    var devLevel = journal.devLevel || '6_8';
    var minPerW = devLevel === 'k2' ? 8 : 15;
    var floor = devLevel === 'k2' ? 3 : (devLevel === '3_5' ? 4 : 5);
    var wonderings = Array.isArray(journal.wonderings) ? journal.wonderings : [];
    var valid = [];
    var signals = [];
    for (var i = 0; i < wonderings.length; i++) {
      var w = wonderings[i];
      var text = (w && w.text) || '';
      if (w && w.durationS && (!text || text.length < 3)) {
        if (w.durationS < 5) { signals.push('voice_too_short'); continue; }
        valid.push(w); continue;
      }
      var prose = isPlausibleProse(text, minPerW, { minTokens: devLevel === 'k2' ? 2 : 3 });
      if (!prose.ok) { signals.push('w_' + prose.reason); continue; }
      var lower = text.toLowerCase();
      if (!/[?]/.test(text) && !/\b(wonder|why|how|what|whether|does|do|could|would|is|are|will|can)\b/.test(lower)) {
        signals.push('not_question_shaped'); continue;
      }
      valid.push(w);
    }
    for (var a = 0; a < valid.length; a++) {
      for (var b = a + 1; b < valid.length; b++) {
        if (tokenJaccard(valid[a].text, valid[b].text) > 0.7) {
          return { ok: false,
                   reason: 'Two of your wonderings are very similar — combine them or wonder about something different.',
                   bypass_signals: signals.concat(['duplicate_wonderings']) };
        }
      }
    }
    if (valid.length < floor) {
      return { ok: false,
               reason: 'You have ' + valid.length + ' real wonderings (need ' + floor + '). Write each one as its own question.',
               bypass_signals: signals };
    }
    var stageNotes = (journal.stageNotes || {}).notice_wonder || {};
    if (!stageNotes.exemplarViewed && !stageNotes.exemplarDismissed) {
      return { ok: false, reason: 'Look at the example pair for this step first — AI is the last scaffold, not the first.',
               bypass_signals: ['exemplar_not_viewed'] };
    }
    return { ok: true };
  }

  function modelSurfacerGate(journal) {
    var snaps = Array.isArray(journal.modelSnapshots) ? journal.modelSnapshots : [];
    var latest = snaps.length ? snaps[snaps.length - 1] : null;
    if (!latest || typeof latest.text !== 'string') {
      return { ok: false, reason: 'Write a first-draft model before AI can help surface assumptions.',
               bypass_signals: ['no_snapshot'] };
    }
    var devLevel = journal.devLevel || '6_8';
    var minChars = devLevel === 'k2' ? 30 : (devLevel === '3_5' ? 50 : 80);
    var minTokens = devLevel === 'k2' ? 4 : 8;
    var prose = isPlausibleProse(latest.text, minChars, { minTokens: minTokens });
    if (!prose.ok) {
      return { ok: false,
               reason: "Your model needs at least " + minChars + " characters of real prose. Name what's connected to what.",
               bypass_signals: ['model_' + prose.reason] };
    }
    if (!['low','medium','high'].includes(latest.confidence)) {
      return { ok: false, reason: 'Pick a confidence level for your model first.', bypass_signals: ['no_confidence'] };
    }
    var lower = normalizeForCompare(latest.text);
    if (devLevel !== 'k2') {
      var hasMechVerb = MECHANISM_VERBS.some(function (v) { return new RegExp('\\b' + v + '\\b').test(lower); });
      if (!hasMechVerb) {
        return { ok: false,
                 reason: 'Your model should say WHAT does WHAT to WHAT. Try words like causes, makes, carries, increases, depends on.',
                 bypass_signals: ['no_mechanism_verb'] };
      }
    }
    var stop = H.SHARED_STOP_WORDS || new Set();
    var contentSet = new Set();
    lower.split(/\W+/).forEach(function (w) {
      if (w.length > 3 && !stop.has(w)) contentSet.add(w);
    });
    if (contentSet.size < (devLevel === 'k2' ? 3 : 5)) {
      return { ok: false,
               reason: 'Your model needs to name a few specific things (not just "it" and "thing").',
               bypass_signals: ['low_entity_count'] };
    }
    var stageNotes = (journal.stageNotes || {}).model_it || {};
    if (!stageNotes.exemplarViewed && !stageNotes.exemplarDismissed) {
      return { ok: false, reason: 'Look at the example pair for this step first.',
               bypass_signals: ['exemplar_not_viewed'] };
    }
    return { ok: true };
  }

  function steelmanSecondPassGate(journal) {
    var note = (journal.stageNotes || {}).interpret_argue || {};
    var ownReading = (note.text || '').trim();
    var ownSteelman = (note.steelmanText || '').trim();
    var ownAssumps = Array.isArray(note.studentSideAssumptionsRequired) ? note.studentSideAssumptionsRequired : [];
    var ownDiscs = Array.isArray(note.studentSideDisconfirmers) ? note.studentSideDisconfirmers : [];
    var readingCheck = isPlausibleProse(ownReading, 40, { minTokens: 7 });
    if (!readingCheck.ok) {
      return { ok: false, reason: 'Your own reading of the evidence needs at least 40 chars of real prose.',
               bypass_signals: ['reading_' + readingCheck.reason] };
    }
    var steelmanCheck = isPlausibleProse(ownSteelman, 50, { minTokens: 9 });
    if (!steelmanCheck.ok) {
      return { ok: false, reason: 'Your steelman of the OPPOSING reading needs at least 50 chars of real prose.',
               bypass_signals: ['steelman_' + steelmanCheck.reason] };
    }
    var sim = tokenJaccard(ownReading, ownSteelman);
    if (sim > 0.5) {
      return { ok: false,
               reason: 'Your steelman reads like a copy of your own interpretation. A steelman argues the OTHER side — what would someone who disagrees with you say?',
               bypass_signals: ['steelman_mirrors_reading'] };
    }
    if (!PERSPECTIVE_MARKERS_RE.test(ownSteelman)) {
      return { ok: false,
               reason: 'A steelman argues from the other side. Try starting with "Someone could reasonably read this as ___" or "On the other hand ___".',
               bypass_signals: ['no_perspective_marker'] };
    }
    if (ownAssumps.length < 2) {
      return { ok: false,
               reason: "List ≥2 assumptions YOUR OWN reading requires before AI offers another reading.",
               bypass_signals: ['too_few_own_assumptions'] };
    }
    if (ownDiscs.length < 2) {
      return { ok: false,
               reason: "List ≥2 things that would disconfirm YOUR OWN reading before AI offers another.",
               bypass_signals: ['too_few_own_disconfirmers'] };
    }
    var evidence = (journal.evidenceCards || []).filter(function (c) { return c.tag !== 'wondering'; });
    if (evidence.length < 2) {
      return { ok: false, reason: 'Log at least 2 evidence cards before interpreting.', bypass_signals: ['too_few_evidence'] };
    }
    var stageNotes = (journal.stageNotes || {}).interpret_argue || {};
    if (!stageNotes.exemplarViewed && !stageNotes.exemplarDismissed) {
      return { ok: false, reason: 'Look at the example pair for this step first.', bypass_signals: ['exemplar_not_viewed'] };
    }
    return { ok: true };
  }

  function honestUncertaintyGate(journal) {
    var claims = Array.isArray(journal.claims) ? journal.claims : [];
    if (claims.length < 2) {
      return { ok: false, reason: 'Write at least 2 claims first.', bypass_signals: ['too_few_claims'] };
    }
    var validLabels = new Set(['supported','overreach','still_unknown']);
    var evidence = (journal.evidenceCards || []).filter(function (c) { return c.tag !== 'wondering'; });
    var evidenceCorpus = normalizeForCompare(evidence.map(function (c) { return c.text || ''; }).join(' '));
    var snaps = journal.modelSnapshots || [];
    var latestSnap = snaps.length ? normalizeForCompare(snaps[snaps.length - 1].text || '') : '';
    var signals = [];
    var stop = H.SHARED_STOP_WORDS || new Set();
    for (var i = 0; i < claims.length; i++) {
      var c = claims[i];
      if (!c || typeof c.text !== 'string') {
        return { ok: false, reason: 'Claim ' + (i + 1) + ' is missing.', bypass_signals: ['missing_claim_' + i] };
      }
      var claimCheck = isPlausibleProse(c.text, 25, { minTokens: 5 });
      if (!claimCheck.ok) {
        return { ok: false, reason: 'Claim ' + (i + 1) + ' needs at least 25 chars of real prose.',
                 bypass_signals: ['claim_' + i + '_' + claimCheck.reason] };
      }
      if (!validLabels.has(c.label)) {
        return { ok: false, reason: 'Label every claim yourself (supported / overreach / still-unknown).',
                 bypass_signals: ['claim_' + i + '_unlabeled'] };
      }
      var claimNorm = normalizeForCompare(c.text);
      var hits = 0;
      claimNorm.split(/\W+/).forEach(function (tok) {
        if (tok.length > 4 && !stop.has(tok)) {
          if (evidenceCorpus.indexOf(tok) !== -1 || latestSnap.indexOf(tok) !== -1) hits++;
        }
      });
      if (hits === 0) {
        signals.push('claim_' + i + '_disconnected');
        return { ok: false,
                 reason: 'Claim ' + (i + 1) + " doesn't mention anything from your evidence or model. Claims should be ABOUT what you investigated.",
                 bypass_signals: signals };
      }
    }
    if (snaps.length < 2) {
      return { ok: false, reason: 'Save a revised model snapshot first so we can see what changed.',
               bypass_signals: ['no_revised_snapshot'] };
    }
    var prev = snaps[snaps.length - 2].text || '';
    var curr = snaps[snaps.length - 1].text || '';
    if (tokenJaccard(prev, curr) > 0.9) {
      return { ok: false, reason: 'Your revised model is nearly identical to the previous one. What actually changed?',
               bypass_signals: ['snapshot_no_revision'] };
    }
    var rs = (journal.stageNotes || {}).revise_share || {};
    if (!rs.exemplarViewed && !rs.exemplarDismissed) {
      return { ok: false, reason: 'Look at the example pair for this step first.', bypass_signals: ['exemplar_not_viewed'] };
    }
    return { ok: true };
  }

  // Prompt builders ────────────────────────────────────────────────────────
  function wonderSorterPrompt(journal) {
    var devLevel = journal.devLevel || '6_8';
    var taxonomy = devLevel === 'k2'
      ? ['what','why','how','what_if']
      : (devLevel === '3_5' || devLevel === '6_8'
        ? ['descriptive','causal','mechanistic','comparative','classificatory']
        : ['descriptive','causal','mechanistic','comparative','classificatory','historical','normative']);
    var wonderings = (journal.wonderings || []).map(function (w, i) {
      return (i + 1) + '. ' + (w.text || '[voice note ' + (w.durationS || '?') + 's]');
    }).join('\n');
    return [
      'SYSTEM: You are a science-inquiry coach helping a ' + devLevel + ' student SORT wonderings they already wrote.',
      'You MUST NOT invent new wonderings, rewrite the student wording, or suggest "better" versions.',
      'You only categorize the student exact text by question-kind from this taxonomy: ' + JSON.stringify(taxonomy) + '.',
      'For each wondering: pick exactly ONE kind from the taxonomy. Add a 1-sentence why_this_kind_question that QUOTES a 3-word substring from the student wording verbatim and ends with a question mark.',
      'If a wondering is ambiguous, mark kind "unclear" and add a clarifying entry to questions_to_consider.',
      '',
      'USER:',
      'phenomenon: ' + (journal.questionTitle || ''),
      'devLevel: ' + devLevel,
      'wonderings (verbatim, do not edit):',
      wonderings,
      '',
      'Return ONLY JSON: { "sorted": [{ "index": number, "verbatim": string, "kind": string, "why_this_kind_question": string }], "taxonomy_used": string[], "questions_to_consider": string[], "coverage_questions": string[] }',
    ].join('\n');
  }

  function modelSurfacerPrompt(journal) {
    var devLevel = journal.devLevel || '6_8';
    var snaps = journal.modelSnapshots || [];
    var latest = snaps[snaps.length - 1] || {};
    var knownUnknowns = latest.knownUnknowns || ((journal.stageNotes || {}).model_it || {}).text || 'none stated';
    return [
      'SYSTEM: You are an inquiry coach helping a ' + devLevel + ' student surface what their own causal model ASSUMES.',
      'You MUST NOT write a "better" model, suggest revisions, or fill in mechanisms the student did not mention.',
      'You only mirror back quoted phrases (≤8 word substrings verbatim from the student) paired with probe questions that surface implicit assumptions.',
      'For ' + devLevel + ' use ≤8-word sentences and no jargon for k2; for ap you may name mechanism types but never propose one.',
      '',
      'USER:',
      'phenomenon: ' + (journal.questionTitle || ''),
      'devLevel: ' + devLevel,
      'student current model (verbatim): ' + (latest.text || ''),
      'confidence: ' + (latest.confidence || 'unstated'),
      'known unknowns the student listed: ' + knownUnknowns,
      '',
      'Return ONLY JSON: { "quoted_phrases_inventory": [{ "quoted_phrase": string, "assumption_probe_questions": string[] }], "entities_question": string, "relationships_question": string, "confidence_evidence_inventory": { "phrases_suggesting_certainty": string[], "phrases_suggesting_uncertainty": string[] }, "questions_to_consider": string[] }',
    ].join('\n');
  }

  function steelmanSecondPassPrompt(journal) {
    var devLevel = journal.devLevel || '6_8';
    var note = (journal.stageNotes || {}).interpret_argue || {};
    var evidence = (journal.evidenceCards || []).filter(function (c) { return c.tag !== 'wondering'; });
    var evidenceList = evidence.map(function (c) {
      return '- id=' + c.id + ' tag=' + (c.tag || 'evidence') + ' text="' + (c.text || '').slice(0, 200) + '"';
    }).join('\n');
    return [
      'SYSTEM: You are an inquiry coach offering ONE additional reading of evidence — explicitly framed as "another reading worth considering", NEVER as "the alternative" and NEVER as "better than" the student.',
      'You MUST NOT rewrite, polish, or critique the quality of the student own steelman.',
      'You produce a SEPARATE, independent reading that cites at least 2 specific evidenceCards by id with quoted_snippet (verbatim substring of that card text).',
      'The reading expresses required-assumptions and disconfirmers AS QUESTIONS the student answers — never as finished claims.',
      'Do not pick a winner. End with comparison_prompt_questions that help the student compare the readings on specific dimensions.',
      '',
      'USER:',
      'phenomenon: ' + (journal.questionTitle || ''),
      'devLevel: ' + devLevel,
      'student own reading (verbatim, do not edit): ' + (note.text || ''),
      'student own steelman (verbatim, do not edit): ' + (note.steelmanText || ''),
      'evidence cards:',
      evidenceList,
      '',
      'Return ONLY JSON: { "another_reading": { "summary": string, "cited_evidence": [{ "card_id": string, "quoted_snippet": string }], "assumptions_required_questions": string[], "disconfirmer_questions": string[] }, "framing_note": string, "comparison_prompt_questions": string[] }',
    ].join('\n');
  }

  function honestUncertaintyPrompt(journal) {
    var devLevel = journal.devLevel || '6_8';
    var claims = (journal.claims || []).map(function (c, i) {
      return (i + 1) + '. "' + (c.text || '') + '" [student label: ' + (c.label || 'unlabeled') + ']';
    }).join('\n');
    var evidence = (journal.evidenceCards || []).filter(function (c) { return c.tag !== 'wondering' });
    var evidenceList = evidence.map(function (c) {
      return '- id=' + c.id + ' text="' + (c.text || '').slice(0, 200) + '"';
    }).join('\n');
    var snaps = journal.modelSnapshots || [];
    var prev = snaps.length >= 2 ? (snaps[snaps.length - 2].text || '') : '';
    var curr = snaps.length >= 1 ? (snaps[snaps.length - 1].text || '') : '';
    return [
      'SYSTEM: You are a co-reviewer in the spirit of qualitative coding: the student labeled their own claims; your job is to QUESTION the labels, not to relabel.',
      'For each claim, examine: does the evidence the student gathered actually support the label they chose?',
      'You may add calibration_flag from {over-confident, under-confident, worth-reexamining} (NO "well-calibrated" — no AI approval verdicts).',
      'You MUST NOT output a corrected label. The student label MUST be echoed verbatim.',
      'Cite specific evidenceCards by id.',
      '',
      'USER:',
      'devLevel: ' + devLevel,
      'claims with student labels:',
      claims,
      'evidence cards:',
      evidenceList,
      'prior model snapshot: "' + prev + '"',
      'revised model snapshot: "' + curr + '"',
      '',
      'Return ONLY JSON: { "per_claim": [{ "claim_index": number, "student_label": string, "label_probe_questions": string[], "evidence_cited": [{ "card_id": string, "relevance_probe": string }], "calibration_flag": string }], "revision_observation_questions": string[], "questions_to_consider": string[] }',
    ].join('\n');
  }

  // Validators ─────────────────────────────────────────────────────────────
  function wonderSorterValidate(out, journal) {
    var atts = [];
    if (!out || !Array.isArray(out.sorted)) return { __rejected: true, rejectReason: 'missing_sorted', attemptedShapeKeys: Object.keys(out || {}) };
    var wonderings = journal.wonderings || [];
    if (out.sorted.length !== wonderings.length) return { __rejected: true, rejectReason: 'sorted_length_mismatch', attemptedShapeKeys: ['sorted'] };
    for (var i = 0; i < out.sorted.length; i++) {
      var s = out.sorted[i];
      var w = wonderings[s.index - 1] || wonderings[i];
      if (!w) return { __rejected: true, rejectReason: 'sorted_index_out_of_range', attemptedShapeKeys: ['sorted'] };
      if (normalizeForCompare(s.verbatim) !== normalizeForCompare(w.text || '')) {
        return { __rejected: true, rejectReason: 'sorted_verbatim_paraphrased', attemptedShapeKeys: ['sorted'] };
      }
    }
    return out;
  }

  function modelSurfacerValidate(out, journal) {
    var snaps = journal.modelSnapshots || [];
    var latest = snaps[snaps.length - 1] || {};
    var latestNorm = normalizeForCompare(latest.text || '');
    if (!out || !Array.isArray(out.quoted_phrases_inventory)) {
      return { __rejected: true, rejectReason: 'missing_quoted_phrases_inventory', attemptedShapeKeys: Object.keys(out || {}) };
    }
    for (var i = 0; i < out.quoted_phrases_inventory.length; i++) {
      var qp = out.quoted_phrases_inventory[i];
      var phraseNorm = normalizeForCompare(qp.quoted_phrase || '');
      if (!phraseNorm || latestNorm.indexOf(phraseNorm) === -1) {
        return { __rejected: true, rejectReason: 'quoted_phrase_not_in_model', attemptedShapeKeys: ['quoted_phrases_inventory'] };
      }
    }
    return out;
  }

  function steelmanValidate(out, journal) {
    if (!out || !out.another_reading) return { __rejected: true, rejectReason: 'missing_another_reading', attemptedShapeKeys: Object.keys(out || {}) };
    var ar = out.another_reading;
    if (!Array.isArray(ar.cited_evidence) || ar.cited_evidence.length < 2) {
      return { __rejected: true, rejectReason: 'too_few_cited_evidence', attemptedShapeKeys: ['cited_evidence'] };
    }
    var byId = {};
    (journal.evidenceCards || []).forEach(function (c) { byId[c.id] = c; });
    for (var i = 0; i < ar.cited_evidence.length; i++) {
      var ce = ar.cited_evidence[i];
      var card = byId[ce.card_id];
      if (!card) return { __rejected: true, rejectReason: 'cited_card_not_found', attemptedShapeKeys: ['cited_evidence'] };
      var snipNorm = normalizeForCompare(ce.quoted_snippet || '');
      var cardNorm = normalizeForCompare(card.text || '');
      if (!snipNorm || cardNorm.indexOf(snipNorm) === -1) {
        return { __rejected: true, rejectReason: 'quoted_snippet_not_in_card', attemptedShapeKeys: ['cited_evidence'] };
      }
    }
    var note = (journal.stageNotes || {}).interpret_argue || {};
    var summaryNorm = normalizeForCompare(ar.summary || '');
    var readingNorm = normalizeForCompare(note.text || '');
    var steelmanNorm = normalizeForCompare(note.steelmanText || '');
    var sumWords = summaryNorm.split(/\s+/);
    for (var j = 0; j < sumWords.length - 5; j++) {
      var gram = sumWords.slice(j, j + 6).join(' ');
      if (gram.length > 12 && (readingNorm.indexOf(gram) !== -1 || steelmanNorm.indexOf(gram) !== -1)) {
        return { __rejected: true, rejectReason: 'summary_paraphrases_student', attemptedShapeKeys: ['summary'] };
      }
    }
    var fn = (out.framing_note || '').toLowerCase();
    if (!/another|additional/.test(fn) || /the alternative|the correct|should instead|better than|more likely/.test(fn)) {
      return { __rejected: true, rejectReason: 'framing_note_directive', attemptedShapeKeys: ['framing_note'] };
    }
    return out;
  }

  function honestUncertaintyValidate(out, journal) {
    if (!out || !Array.isArray(out.per_claim)) return { __rejected: true, rejectReason: 'missing_per_claim', attemptedShapeKeys: Object.keys(out || {}) };
    var claims = journal.claims || [];
    if (out.per_claim.length !== claims.length) return { __rejected: true, rejectReason: 'per_claim_length_mismatch', attemptedShapeKeys: ['per_claim'] };
    var validFlags = new Set(['over-confident','under-confident','worth-reexamining']);
    var byId = {};
    (journal.evidenceCards || []).forEach(function (c) { byId[c.id] = c; });
    for (var i = 0; i < out.per_claim.length; i++) {
      var pc = out.per_claim[i];
      if (pc.student_label !== claims[i].label) return { __rejected: true, rejectReason: 'student_label_modified', attemptedShapeKeys: ['per_claim'] };
      if (!validFlags.has(pc.calibration_flag)) return { __rejected: true, rejectReason: 'invalid_calibration_flag', attemptedShapeKeys: ['per_claim'] };
      if (Array.isArray(pc.evidence_cited)) {
        for (var k = 0; k < pc.evidence_cited.length; k++) {
          if (!byId[pc.evidence_cited[k].card_id]) return { __rejected: true, rejectReason: 'cited_card_not_found', attemptedShapeKeys: ['per_claim','evidence_cited'] };
        }
      }
    }
    return out;
  }

  var TOUCHPOINTS = {
    wonder_sorter: {
      id: 'wonder_sorter', stage: 'notice_wonder', label: 'Sort my wonderings',
      gateCheck: wonderSorterGate, buildPrompt: wonderSorterPrompt, validate: wonderSorterValidate,
    },
    model_surfacer: {
      id: 'model_surfacer', stage: 'model_it', label: 'Surface my model',
      gateCheck: modelSurfacerGate, buildPrompt: modelSurfacerPrompt, validate: modelSurfacerValidate,
    },
    steelman_second_pass: {
      id: 'steelman_second_pass', stage: 'interpret_argue', label: 'Show me another reading',
      gateCheck: steelmanSecondPassGate, buildPrompt: steelmanSecondPassPrompt, validate: steelmanValidate,
    },
    honest_uncertainty: {
      id: 'honest_uncertainty', stage: 'revise_share', label: 'Question my labels',
      gateCheck: honestUncertaintyGate, buildPrompt: honestUncertaintyPrompt, validate: honestUncertaintyValidate,
    },
  };

  // ───────────────────────────────────────────────────────────────────────
  // Cycle wheel — SVG-free CSS implementation. 6 nodes positioned via
  // transform-rotate around a circle. Each node is click-target-able to
  // jump stages. Loop-back targets render as faint connector lines.
  // ───────────────────────────────────────────────────────────────────────
  function CycleWheel(props) {
    var t = props.t || function (k) { return k; };
    var activeStage = props.activeStage;
    var onJump = props.onJump;
    var journalStageNotes = props.journalStageNotes || {};
    var modelSnapshotCount = props.modelSnapshotCount || 0;
    var size = 188;
    var radius = 72;
    return (
      <div
        role="navigation"
        aria-label={t('scientific.cycle_nav_aria') || 'Phenomenon Workbench cycle navigation'}
        style={{
          position: 'relative', width: size + 'px', height: size + 'px',
          flexShrink: 0,
        }}
      >
        {/* Center label */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', fontSize: '10px', color: '#475569', fontWeight: 700,
          padding: '24px',
        }}>
          {t('scientific.cycle_center_label') || 'Loops are first-class. Click any stage.'}
        </div>
        {STAGES.map(function (s, idx) {
          var theta = (idx / STAGES.length) * 2 * Math.PI - Math.PI / 2;
          var x = size / 2 + radius * Math.cos(theta) - 22;
          var y = size / 2 + radius * Math.sin(theta) - 22;
          var isActive = activeStage === s.key;
          var stageNote = journalStageNotes[s.key] || {};
          var hasWork = !!(stageNote.text || stageNote.audioBase64 ||
            (s.key === 'model_it' && modelSnapshotCount > 0));
          return (
            <button
              key={s.key}
              type="button"
              data-help-key={'workbench_cycle_' + s.key}
              onClick={function () { if (typeof onJump === 'function') onJump(s.key); }}
              aria-label={s.label + (isActive ? ' (current stage)' : '') + (hasWork ? ' (has work)' : '')}
              aria-current={isActive ? 'step' : undefined}
              style={{
                position: 'absolute', left: x + 'px', top: y + 'px',
                width: '44px', height: '44px', borderRadius: '50%',
                background: isActive ? s.color : (hasWork ? '#f8fafc' : '#ffffff'),
                color: isActive ? '#ffffff' : s.color,
                border: '2px solid ' + s.color,
                fontSize: '18px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isActive ? '0 4px 12px ' + s.color + '66' : 'none',
                transition: 'all 0.15s',
              }}
              title={s.label}
            >
              <span aria-hidden="true">{s.icon}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Stage chip strip — secondary nav for mobile + accessibility. Each chip
  // shows the short label + a checkmark when the stage has work logged.
  // ───────────────────────────────────────────────────────────────────────
  function StageChipStrip(props) {
    var activeStage = props.activeStage;
    var onJump = props.onJump;
    var journalStageNotes = props.journalStageNotes || {};
    var modelSnapshotCount = props.modelSnapshotCount || 0;
    return (
      <div
        role="tablist"
        aria-label="Stage navigation"
        style={{
          display: 'flex', flexWrap: 'wrap', gap: '6px',
          padding: '6px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0',
        }}
      >
        {STAGES.map(function (s, idx) {
          var isActive = activeStage === s.key;
          var stageNote = journalStageNotes[s.key] || {};
          var hasWork = !!(stageNote.text || stageNote.audioBase64 ||
            (s.key === 'model_it' && modelSnapshotCount > 0));
          return (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={function () { if (typeof onJump === 'function') onJump(s.key); }}
              style={{
                padding: '6px 12px', borderRadius: '999px',
                background: isActive ? s.color : '#ffffff',
                color: isActive ? '#ffffff' : '#475569',
                border: '1px solid ' + (isActive ? s.color : '#cbd5e1'),
                fontWeight: 700, fontSize: '11px', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '4px',
              }}
            >
              <span aria-hidden="true">{(idx + 1) + '. '}</span>
              <span>{s.shortLabel}</span>
              {hasWork && <span aria-hidden="true">{'\u{2713}'}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Loop-back chip picker — 1-tap reason; required to navigate.
  // ───────────────────────────────────────────────────────────────────────
  function LoopBackPicker(props) {
    var t = props.t || function (k) { return k; };
    var fromStage = props.fromStage;
    var toStage = props.toStage;
    var onCommit = props.onCommit;
    var onCancel = props.onCancel;
    var _id = useState(null); var chipId = _id[0]; var setChipId = _id[1];
    var _other = useState(''); var otherText = _other[0]; var setOtherText = _other[1];
    var canCommit = !!chipId && (chipId !== 'other' || otherText.trim().length >= 10);

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={(t('scientific.loopback_modal_title') || 'Why are you looping back?')}
        style={{
          position: 'fixed', inset: 0, zIndex: 80,
          background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}
        onClick={function (e) { if (e.target === e.currentTarget) onCancel(); }}
      >
        <div
          onClick={function (e) { e.stopPropagation(); }}
          style={{
            background: '#fff', borderRadius: '16px',
            maxWidth: '460px', width: '100%',
            padding: '20px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>
            <span aria-hidden="true">{'\u{1F501} '}</span>
            {(t('scientific.loopback_modal_title') || 'Why are you looping back?')}
          </h3>
          <p style={{ margin: '4px 0 12px', fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
            {t('scientific.loopback_modal_help') ||
              'Loops are evidence of thinking change — not setbacks. Your downstream work stays; you can return to where you were.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {LOOPBACK_CHIPS.map(function (c) {
              var selected = chipId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={function () { setChipId(c.id); }}
                  aria-pressed={selected}
                  style={{
                    padding: '10px 12px', borderRadius: '10px',
                    border: selected ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                    background: selected ? '#f5f3ff' : '#ffffff',
                    textAlign: 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    fontSize: '13px', color: '#1e293b',
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: '18px' }}>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
          {chipId === 'other' && (
            <textarea
              value={otherText}
              onChange={function (e) { setOtherText(e.target.value); }}
              rows={2}
              maxLength={240}
              placeholder={t('scientific.loopback_other_placeholder') || 'Briefly: what made you loop back? (≥10 chars)'}
              style={{
                marginTop: '8px', width: '100%', boxSizing: 'border-box',
                padding: '8px 10px', borderRadius: '8px',
                border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: '12px',
              }}
            />
          )}
          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '8px 14px', borderRadius: '999px',
                background: '#f1f5f9', color: '#475569', border: 'none',
                fontWeight: 700, fontSize: '12px', cursor: 'pointer',
              }}
            >
              {t('common.cancel') || 'Cancel'}
            </button>
            <button
              type="button"
              disabled={!canCommit}
              onClick={function () { onCommit({ whyChipId: chipId, why: chipId === 'other' ? otherText.trim() : null }); }}
              style={{
                padding: '8px 14px', borderRadius: '999px',
                background: canCommit ? '#7c3aed' : '#cbd5e1',
                color: '#fff', border: 'none',
                fontWeight: 800, fontSize: '12px',
                cursor: canCommit ? 'pointer' : 'not-allowed',
              }}
            >
              {t('scientific.loopback_commit') || 'Loop back to '} {STAGE_BY_KEY[toStage] ? STAGE_BY_KEY[toStage].label : toStage}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Educator panel — "Why this isn't PHEOC". Collapsed by default.
  // ───────────────────────────────────────────────────────────────────────
  function EducatorPanel(props) {
    var t = props.t || function (k) { return k; };
    return (
      <details style={{
        padding: '10px 14px', borderRadius: '12px',
        background: '#f8fafc', border: '1px solid #cbd5e1',
      }}>
        <summary style={{ cursor: 'pointer', fontSize: '11px', fontWeight: 800, color: '#475569' }}>
          <span aria-hidden="true">{'\u{1F393} '}</span>
          {t('scientific.educator_panel_summary') || 'For teachers: why this lane is intentionally non-linear'}
        </summary>
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#475569', lineHeight: 1.6 }}>
          <p style={{ margin: '4px 0' }}>
            {t('scientific.educator_panel_p1') ||
              'This lane is intentionally NOT linear. The 6-stage cycle is a thinking loop, not a checklist. A student who loops back 3+ times — because new evidence surprised them, or a peer review changed their mind — is doing BETTER science than one who walks 1→6 once and never revises.'}
          </p>
          <p style={{ margin: '4px 0' }}>
            {t('scientific.educator_panel_p2') ||
              'When grading, weight the loop log + model-version trajectory + claim labeling honesty AS MUCH OR MORE than the final stage-6 artifact. PHEOC linearity is a textbook fiction; real inquiry is iterative and serendipitous. AI here asks questions and surfaces alternatives — it never proposes finished revisions, finished models, or finished interpretations.'}
          </p>
          <p style={{ margin: '4px 0', fontStyle: 'italic' }}>
            {t('scientific.educator_panel_p3') ||
              'Two cross-cutting rubric exemplars at lane exit reward loop-back density and model-trajectory depth specifically. Grade with those.'}
          </p>
        </div>
      </details>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Model snapshot timeline — oldest → newest, horizontal, with deltas
  // highlighted. Reviewer 3 explicitly flagged that newest-first card
  // stack buries the trajectory; this is the primary view.
  // ───────────────────────────────────────────────────────────────────────
  function ModelTimeline(props) {
    var t = props.t || function (k) { return k; };
    var snaps = props.snaps || [];
    var _expanded = useState(null);
    var expandedIdx = _expanded[0]; var setExpandedIdx = _expanded[1];
    if (!snaps.length) {
      return (
        <p style={{ margin: '8px 0', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
          {t('scientific.no_snapshots_yet') || 'No model snapshots yet. Save one to start the trajectory.'}
        </p>
      );
    }
    return (
      <div>
        <h4 style={{ margin: '6px 0', fontSize: '12px', fontWeight: 800, color: '#1e293b' }}>
          {t('scientific.timeline_label') || 'Model trajectory'}
        </h4>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
          {snaps.map(function (s, i) {
            var prev = i > 0 ? snaps[i - 1] : null;
            var hasLoopOrigin = !!(s.loopBackOrigin && s.loopBackOrigin.fromStage);
            return (
              <button
                key={i}
                type="button"
                onClick={function () { setExpandedIdx(expandedIdx === i ? null : i); }}
                style={{
                  flexShrink: 0,
                  padding: '8px 10px', borderRadius: '10px',
                  background: '#ffffff', border: '1px solid ' + (hasLoopOrigin ? '#a855f7' : '#cbd5e1'),
                  minWidth: '120px', maxWidth: '180px',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ fontSize: '10px', color: '#7c3aed', fontWeight: 800 }}>
                  v{s.v}{hasLoopOrigin && <span aria-hidden="true" style={{ marginLeft: '4px' }}>{'\u{1F501}'}</span>}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                  {new Date(s.ts || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  {s.confidence || '?'} conf.
                </div>
                <div style={{
                  marginTop: '4px', fontSize: '11px', color: '#1e293b',
                  lineHeight: 1.4,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {s.text || ''}
                </div>
              </button>
            );
          })}
        </div>
        {expandedIdx !== null && snaps[expandedIdx] && (
          <div style={{
            marginTop: '8px', padding: '10px 12px', borderRadius: '10px',
            background: '#f8fafc', border: '1px solid #cbd5e1',
            fontSize: '12px', color: '#1e293b',
          }}>
            <strong>v{snaps[expandedIdx].v} ({snaps[expandedIdx].confidence || '?'} confidence)</strong>
            <p style={{ margin: '4px 0', lineHeight: 1.6 }}>{snaps[expandedIdx].text}</p>
            {snaps[expandedIdx].knownUnknowns && (
              <p style={{ margin: '4px 0', fontSize: '11px', color: '#475569' }}>
                <em>{t('scientific.timeline_unknowns_at_v') || 'Known unknowns at this version:'} </em>
                {snaps[expandedIdx].knownUnknowns}
              </p>
            )}
            {snaps[expandedIdx].loopBackOrigin && (
              <p style={{ margin: '4px 0', fontSize: '11px', color: '#7c3aed' }}>
                <em>{t('scientific.timeline_revision_after_loop') || 'Revision after looping back from: '} </em>
                {STAGE_BY_KEY[snaps[expandedIdx].loopBackOrigin.fromStage]
                  ? STAGE_BY_KEY[snaps[expandedIdx].loopBackOrigin.fromStage].label
                  : snaps[expandedIdx].loopBackOrigin.fromStage}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // ExemplarGate — wraps the lane's primitive ExemplarPair and persists
  // exemplarViewed/Dismissed back to journal so the gateCheck can see it.
  // ───────────────────────────────────────────────────────────────────────
  function ExemplarGate(props) {
    var t = props.t;
    var stageKey = props.stageKey;
    var journal = props.journal;
    var setJournal = props.setJournal;
    var primitives = props.primitives || {};
    var ExemplarPair = primitives.ExemplarPair;
    var stageNote = (journal.stageNotes || {})[stageKey] || {};
    var viewed = !!(stageNote.exemplarViewed || stageNote.exemplarDismissed);
    var pair = props.pair;
    var _open = useState(false);
    var open = _open[0]; var setOpen = _open[1];

    if (!pair || !ExemplarPair) return null;
    if (viewed && !open) {
      return (
        <button
          type="button"
          onClick={function () { setOpen(true); }}
          style={{
            padding: '6px 12px', borderRadius: '999px',
            background: '#f1f5f9', color: '#475569', border: 'none',
            fontSize: '11px', fontWeight: 700, cursor: 'pointer',
          }}
        >
          <span aria-hidden="true">{'\u{1F4D6} '}</span>
          {t('scientific.review_exemplar_again') || 'Review the example pair again'}
        </button>
      );
    }
    if (!viewed) {
      return (
        <div style={{
          padding: '12px', borderRadius: '12px',
          background: '#fffbeb', border: '1px solid #fcd34d',
        }}>
          <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#92400e' }}>
            <span aria-hidden="true">{'\u{1F4A1} '}</span>
            {t('scientific.exemplar_required_prefix') || 'Before AI can help here:'}
            {' '}
            {t('scientific.exemplar_required_suffix') || 'check this example pair (1 min).'}
          </p>
          <ExemplarPair
            t={t}
            criterion={pair.criterion}
            strongExample={pair.strongExample}
            weakExample={pair.weakExample}
            onJudgment={function (j) {
              setJournal(function (prev) {
                var next = Object.assign({}, prev);
                next.stageNotes = Object.assign({}, prev.stageNotes || {});
                var sn = Object.assign({}, next.stageNotes[stageKey] || {});
                sn.exemplarViewed = true;
                sn.exemplarJudgment = j;
                sn.exemplarJudgmentAt = Date.now();
                next.stageNotes[stageKey] = sn;
                return next;
              });
            }}
          />
          <button
            type="button"
            onClick={function () {
              setJournal(function (prev) {
                var next = Object.assign({}, prev);
                next.stageNotes = Object.assign({}, prev.stageNotes || {});
                var sn = Object.assign({}, next.stageNotes[stageKey] || {});
                sn.exemplarDismissed = true;
                sn.exemplarDismissedAt = Date.now();
                next.stageNotes[stageKey] = sn;
                return next;
              });
            }}
            style={{
              marginTop: '8px',
              padding: '4px 10px', borderRadius: '999px',
              background: 'transparent', color: '#92400e',
              border: '1px solid #fcd34d',
              fontSize: '10px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            {t('scientific.exemplar_skip') || "I've got it — skip without judging"}
          </button>
        </div>
      );
    }
    // open && viewed → show again
    return (
      <div>
        <ExemplarPair
          t={t}
          criterion={pair.criterion}
          strongExample={pair.strongExample}
          weakExample={pair.weakExample}
          initialChoice={(stageNote.exemplarJudgment && stageNote.exemplarJudgment.choice) || null}
          initialReasoning={(stageNote.exemplarJudgment && stageNote.exemplarJudgment.reasoning) || ''}
          onJudgment={function (j) {
            setJournal(function (prev) {
              var next = Object.assign({}, prev);
              next.stageNotes = Object.assign({}, prev.stageNotes || {});
              var sn = Object.assign({}, next.stageNotes[stageKey] || {});
              sn.exemplarJudgment = j;
              next.stageNotes[stageKey] = sn;
              return next;
            });
            setOpen(false);
          }}
        />
        <button
          type="button"
          onClick={function () { setOpen(false); }}
          style={{
            marginTop: '6px',
            background: 'transparent', border: 'none',
            color: '#475569', fontSize: '11px',
            cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          {t('common.close') || 'Close'}
        </button>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // AI result panel — generic renderer for the question-form JSON shapes.
  // Drops any banner if the response carries __aiSuggestion: true.
  // ───────────────────────────────────────────────────────────────────────
  function AiResultPanel(props) {
    var t = props.t;
    var data = props.data;
    var primitives = props.primitives || {};
    var SuggestionBadge = primitives.SuggestionBadge;
    if (!data) return null;
    return (
      <div style={{
        marginTop: '10px', padding: '12px 14px', borderRadius: '12px',
        background: '#f5f3ff', border: '1px solid #c4b5fd',
      }}>
        {SuggestionBadge && (<div style={{ marginBottom: '6px' }}><SuggestionBadge t={t} /></div>)}
        <AiResultBody data={data} t={t} />
      </div>
    );
  }

  function AiResultBody(props) {
    var data = props.data || {};
    var t = props.t || function (k) { return k; };
    function renderQuestions(arr, label) {
      if (!Array.isArray(arr) || !arr.length) return null;
      return (
        <div style={{ marginTop: '6px' }}>
          <strong style={{ fontSize: '11px', color: '#5b21b6' }}>{label}</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '20px', fontSize: '12px', color: '#1e293b', lineHeight: 1.6 }}>
            {arr.map(function (q, i) { return <li key={i}>{q}</li>; })}
          </ul>
        </div>
      );
    }
    var sorted = Array.isArray(data.sorted) ? data.sorted : null;
    var pairs = Array.isArray(data.quoted_phrases_inventory) ? data.quoted_phrases_inventory : null;
    var another = data.another_reading;
    var perClaim = Array.isArray(data.per_claim) ? data.per_claim : null;
    return (
      <div>
        {sorted && (
          <div>
            <strong style={{ fontSize: '11px', color: '#5b21b6' }}>{t('scientific.sorted_label') || 'Your wonderings sorted'}</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: '18px', fontSize: '12px', lineHeight: 1.6 }}>
              {sorted.map(function (s, i) {
                return (
                  <li key={i}>
                    <em>{s.kind}</em>: "{s.verbatim}"
                    {s.why_this_kind_question && (<div style={{ fontSize: '11px', color: '#7c3aed' }}>{s.why_this_kind_question}</div>)}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {pairs && (
          <div>
            <strong style={{ fontSize: '11px', color: '#5b21b6' }}>{t('scientific.assumption_probes_label') || 'Questions about phrases from your model'}</strong>
            {pairs.map(function (p, i) {
              return (
                <div key={i} style={{ marginTop: '4px', fontSize: '12px' }}>
                  <em>"{p.quoted_phrase}"</em>
                  {renderQuestions(p.assumption_probe_questions, '')}
                </div>
              );
            })}
            {data.entities_question && <p style={{ marginTop: '6px', fontSize: '12px', color: '#1e293b' }}>{data.entities_question}</p>}
            {data.relationships_question && <p style={{ marginTop: '4px', fontSize: '12px', color: '#1e293b' }}>{data.relationships_question}</p>}
          </div>
        )}
        {another && (
          <div>
            <strong style={{ fontSize: '11px', color: '#5b21b6' }}>{t('scientific.another_reading_label') || 'AI offers another reading (additional, not the alternative)'}</strong>
            <p style={{ margin: '4px 0', fontSize: '12px', lineHeight: 1.6 }}>{another.summary}</p>
            {another.cited_evidence && (
              <div style={{ fontSize: '11px', color: '#475569' }}>
                <strong>Cites: </strong>
                {another.cited_evidence.map(function (ce, i) {
                  return <div key={i}>· #{ce.card_id} — "{ce.quoted_snippet}"</div>;
                })}
              </div>
            )}
            {renderQuestions(another.assumptions_required_questions, t('scientific.assumptions_required_label') || 'Questions about what would have to hold:')}
            {renderQuestions(another.disconfirmer_questions, t('scientific.disconfirmer_label') || 'Questions about what would disconfirm this:')}
            {renderQuestions(data.comparison_prompt_questions, t('scientific.comparison_label') || 'Compare the readings:')}
            {data.framing_note && (
              <p style={{ marginTop: '6px', fontSize: '11px', color: '#7c3aed', fontStyle: 'italic' }}>
                {data.framing_note}
              </p>
            )}
          </div>
        )}
        {perClaim && (
          <div>
            <strong style={{ fontSize: '11px', color: '#5b21b6' }}>{t('scientific.per_claim_label') || 'Questions about your labels'}</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: '18px', fontSize: '12px', lineHeight: 1.6 }}>
              {perClaim.map(function (pc, i) {
                return (
                  <li key={i}>
                    <strong>Claim {pc.claim_index || (i + 1)}</strong> [{pc.student_label}, AI flag: {pc.calibration_flag}]
                    {renderQuestions(pc.label_probe_questions, '')}
                  </li>
                );
              })}
            </ul>
            {renderQuestions(data.revision_observation_questions, t('scientific.revision_obs_label') || 'Questions about what changed:')}
          </div>
        )}
        {renderQuestions(data.questions_to_consider, t('scientific.questions_to_consider_label') || 'More questions to consider:')}
        {renderQuestions(data.coverage_questions, t('scientific.coverage_questions_label') || 'Questions about coverage:')}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Stage workspaces. Each is a small component that reads/writes journal
  // fields via ctx.setJournal and renders its specific affordances.
  // ───────────────────────────────────────────────────────────────────────
  function NoticeWonderStage(props) {
    var t = props.t;
    var ctx = props.ctx;
    var journal = ctx.journal;
    var setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var VoiceNoteBlock = primitives.VoiceNoteBlock;
    var _adding = useState(''); var adding = _adding[0]; var setAdding = _adding[1];
    var _aiResult = useState(null); var aiResult = _aiResult[0]; var setAiResult = _aiResult[1];
    var _busy = useState(false); var busy = _busy[0]; var setBusy = _busy[1];

    var wonderings = journal.wonderings || [];
    var devLevel = journal.devLevel || '6_8';
    var floor = devLevel === 'k2' ? 3 : (devLevel === '3_5' ? 4 : 5);

    var addWondering = function (text, opts) {
      if (!text || !text.trim()) return;
      setJournal(function (prev) {
        var next = Object.assign({}, prev);
        next.wonderings = (prev.wonderings || []).concat([{
          id: 'w' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          ts: Date.now(),
          text: text.trim(),
          durationS: (opts && opts.durationS) || 0,
        }]);
        return next;
      });
      setAdding('');
    };
    var removeWondering = function (id) {
      setJournal(function (prev) {
        var next = Object.assign({}, prev);
        next.wonderings = (prev.wonderings || []).filter(function (w) { return w.id !== id; });
        return next;
      });
    };

    var askSort = async function () {
      setBusy(true); setAiResult(null);
      try {
        var res = await ctx.ask(TOUCHPOINTS.wonder_sorter, ctx);
        setAiResult(res);
      } finally { setBusy(false); }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <ExemplarGate
          t={t}
          stageKey="notice_wonder"
          journal={journal}
          setJournal={setJournal}
          primitives={primitives}
          pair={EXEMPLAR_PAIRS.notice_wonder}
        />

        <div style={{ padding: '12px', borderRadius: '12px', background: '#fff', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
            {t('scientific.wonderings_title') || 'Your wonderings'}
            <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 700, color: floor > wonderings.length ? '#d97706' : '#16a34a' }}>
              ({wonderings.length}/{floor})
            </span>
          </h4>
          <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
            {t('scientific.wonderings_help') ||
              'List at least ' + floor + ' wonderings of your own. Each one is its own line. AI will sort them by kind — never invent them for you.'}
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {wonderings.map(function (w) {
              return (
                <li key={w.id} style={{
                  display: 'flex', gap: '8px', alignItems: 'center',
                  padding: '6px 8px', borderRadius: '8px',
                  background: '#f8fafc', fontSize: '12px', color: '#1e293b',
                }}>
                  <span aria-hidden="true">{'\u{2022}'}</span>
                  <span style={{ flex: 1 }}>{w.text || ('[voice ' + (w.durationS || '?') + 's]')}</span>
                  <button
                    type="button"
                    onClick={function () { removeWondering(w.id); }}
                    aria-label="Remove this wondering"
                    style={{
                      background: 'transparent', border: 'none',
                      color: '#64748b', cursor: 'pointer', fontSize: '14px',
                    }}
                  >{'\u{2715}'}</button>
                </li>
              );
            })}
          </ul>
          <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={adding}
              onChange={function (e) { setAdding(e.target.value); }}
              onKeyDown={function (e) { if (e.key === 'Enter') addWondering(adding); }}
              placeholder={t('scientific.wondering_placeholder') || 'I wonder whether…'}
              maxLength={240}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: '8px',
                border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'inherit',
              }}
            />
            <button
              type="button"
              onClick={function () { addWondering(adding); }}
              style={{
                padding: '6px 12px', borderRadius: '999px',
                background: '#7c3aed', color: '#fff', border: 'none',
                fontWeight: 700, fontSize: '12px', cursor: 'pointer',
              }}
            >+</button>
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={askSort}
          style={{
            alignSelf: 'flex-start',
            padding: '10px 18px', borderRadius: '999px',
            background: busy ? '#cbd5e1' : '#0d9488',
            color: '#fff', border: 'none',
            fontWeight: 800, fontSize: '12px', cursor: busy ? 'wait' : 'pointer',
          }}
        >
          <span aria-hidden="true">{'\u{1F916} '}</span>
          {busy ? (t('scientific.sorting') || 'Sorting…') : (t('scientific.sort_button') || 'Sort my wonderings')}
        </button>
        {aiResult && aiResult.blocked && (
          <BlockedNote t={t} reason={aiResult.detail || aiResult.blockedReason} />
        )}
        {aiResult && !aiResult.blocked && aiResult.data && (
          <AiResultPanel t={t} data={aiResult.data} primitives={primitives} />
        )}
      </div>
    );
  }

  function ModelItStage(props) {
    var t = props.t;
    var ctx = props.ctx;
    var journal = ctx.journal;
    var setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var snaps = journal.modelSnapshots || [];
    var latest = snaps.length ? snaps[snaps.length - 1] : null;

    var _draft = useState((latest && latest.text) || '');
    var draft = _draft[0]; var setDraft = _draft[1];
    var _conf = useState((latest && latest.confidence) || '');
    var conf = _conf[0]; var setConf = _conf[1];
    var _unk = useState((latest && latest.knownUnknowns) || '');
    var unk = _unk[0]; var setUnk = _unk[1];
    var _aiResult = useState(null); var aiResult = _aiResult[0]; var setAiResult = _aiResult[1];
    var _busy = useState(false); var busy = _busy[0]; var setBusy = _busy[1];

    var canSave = draft.trim().length >= 30 && ['low','medium','high'].includes(conf);

    var saveSnapshot = function () {
      if (!canSave) return;
      setJournal(function (prev) {
        var next = Object.assign({}, prev);
        var prior = prev.modelSnapshots || [];
        var loopOrigin = prev.pendingLoopReturn ? { fromStage: prev.pendingLoopReturn.fromStage, ts: Date.now() } : null;
        var snap = {
          v: prior.length + 1,
          ts: Date.now(),
          text: draft.trim(),
          confidence: conf,
          knownUnknowns: unk.trim(),
        };
        if (loopOrigin) snap.loopBackOrigin = loopOrigin;
        next.modelSnapshots = prior.concat([snap]);
        return next;
      });
    };

    var askSurface = async function () {
      setBusy(true); setAiResult(null);
      try {
        var res = await ctx.ask(TOUCHPOINTS.model_surfacer, ctx);
        setAiResult(res);
      } finally { setBusy(false); }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <ExemplarGate t={t} stageKey="model_it" journal={journal} setJournal={setJournal}
                      primitives={primitives} pair={EXEMPLAR_PAIRS.model_it} />

        <ModelTimeline t={t} snaps={snaps} />

        <div style={{ padding: '12px', borderRadius: '12px', background: '#fff', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
            {t('scientific.draft_model_label') || 'Draft your current model'}
          </h4>
          <textarea
            value={draft}
            onChange={function (e) { setDraft(e.target.value); }}
            rows={4}
            maxLength={1500}
            placeholder={t('scientific.model_placeholder') ||
              'What do you think is happening, and WHY? Name the things involved and how you think they relate. It is fine — and useful — to be tentative.'}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px', borderRadius: '8px',
              border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'inherit',
              resize: 'vertical', minHeight: '80px',
            }}
          />
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>
              {t('scientific.confidence_label') || 'Confidence:'}
            </span>
            {['low','medium','high'].map(function (c) {
              return (
                <label key={c} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '11px', color: '#475569', cursor: 'pointer',
                }}>
                  <input
                    type="radio"
                    name="model-confidence"
                    value={c}
                    checked={conf === c}
                    onChange={function () { setConf(c); }}
                  />
                  {c}
                </label>
              );
            })}
          </div>
          <label style={{ display: 'block', marginTop: '10px', fontSize: '11px', color: '#475569', fontWeight: 700 }}>
            {t('scientific.known_unknowns_label') || 'What you do NOT know yet (be honest):'}
          </label>
          <textarea
            value={unk}
            onChange={function (e) { setUnk(e.target.value); }}
            rows={2}
            maxLength={800}
            placeholder={t('scientific.known_unknowns_placeholder') || "e.g., I don't know whether the wire's material matters or just its thickness."}
            style={{
              marginTop: '4px',
              width: '100%', boxSizing: 'border-box',
              padding: '8px 10px', borderRadius: '8px',
              border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'inherit',
              resize: 'vertical', minHeight: '50px',
            }}
          />
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={!canSave}
              onClick={saveSnapshot}
              style={{
                padding: '8px 14px', borderRadius: '999px',
                background: canSave ? '#7c3aed' : '#cbd5e1',
                color: '#fff', border: 'none',
                fontWeight: 800, fontSize: '12px',
                cursor: canSave ? 'pointer' : 'not-allowed',
              }}
            >
              {t('scientific.save_snapshot') || 'Save model snapshot'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={askSurface}
              style={{
                padding: '8px 14px', borderRadius: '999px',
                background: busy ? '#cbd5e1' : '#0d9488',
                color: '#fff', border: 'none',
                fontWeight: 800, fontSize: '12px', cursor: busy ? 'wait' : 'pointer',
              }}
            >
              <span aria-hidden="true">{'\u{1F916} '}</span>
              {busy ? (t('scientific.surfacing') || 'Surfacing…') : (t('scientific.surface_button') || 'Surface my model')}
            </button>
          </div>
        </div>

        {aiResult && aiResult.blocked && (<BlockedNote t={t} reason={aiResult.detail || aiResult.blockedReason} />)}
        {aiResult && !aiResult.blocked && aiResult.data && (
          <AiResultPanel t={t} data={aiResult.data} primitives={primitives} />
        )}
      </div>
    );
  }

  function PlanStage(props) {
    var t = props.t;
    var ctx = props.ctx;
    var journal = ctx.journal;
    var setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var stageNote = (journal.stageNotes || {}).plan || {};
    var _method = useState(stageNote.method || ''); var method = _method[0]; var setMethod = _method[1];
    var _whyFits = useState(stageNote.text || ''); var whyFits = _whyFits[0]; var setWhyFits = _whyFits[1];
    var _cant = useState(stageNote.cantTell || ''); var cantTell = _cant[0]; var setCantTell = _cant[1];
    useEffect(function () {
      setJournal(function (prev) {
        var next = Object.assign({}, prev);
        next.stageNotes = Object.assign({}, prev.stageNotes || {});
        next.stageNotes.plan = Object.assign({}, next.stageNotes.plan || {}, {
          method: method, text: whyFits, cantTell: cantTell, ts: Date.now(),
        });
        return next;
      });
    }, [method, whyFits, cantTell]);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <ExemplarGate t={t} stageKey="plan" journal={journal} setJournal={setJournal}
                      primitives={primitives} pair={EXEMPLAR_PAIRS.plan} />
        <div style={{ padding: '12px', borderRadius: '12px', background: '#fff', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
            {t('scientific.method_menu_title') || 'Pick a method (none is "best" — each has trade-offs)'}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
            {METHOD_MENU.map(function (m) {
              var selected = method === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={function () { setMethod(m.key); }}
                  aria-pressed={selected}
                  style={{
                    padding: '10px 12px', borderRadius: '10px',
                    background: selected ? '#f5f3ff' : '#ffffff',
                    border: selected ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                    textAlign: 'left', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: '4px',
                  }}
                >
                  <strong style={{ fontSize: '12px', color: '#1e293b' }}>{m.label}</strong>
                  <span style={{ fontSize: '10px', color: '#475569', lineHeight: 1.4 }}><em>Fits when:</em> {m.fits}</span>
                  <span style={{ fontSize: '10px', color: '#b91c1c', lineHeight: 1.4 }}><em>Doesn't fit when:</em> {m.doesntFit}</span>
                </button>
              );
            })}
          </div>
        </div>
        {method && (
          <div style={{ padding: '12px', borderRadius: '12px', background: '#fff', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
              {t('scientific.why_method_fits') || 'Why does THIS method fit MY question?'}
            </label>
            <textarea
              value={whyFits}
              onChange={function (e) { setWhyFits(e.target.value); }}
              rows={3} maxLength={800}
              placeholder={t('scientific.why_method_placeholder') || 'Explain in your own words…'}
              style={{
                marginTop: '4px', width: '100%', boxSizing: 'border-box',
                padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1',
                fontSize: '12px', fontFamily: 'inherit', resize: 'vertical',
              }}
            />
            <label style={{ display: 'block', marginTop: '10px', fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
              {t('scientific.what_cant_tell') || "What this method CAN'T tell you:"}
            </label>
            <textarea
              value={cantTell}
              onChange={function (e) { setCantTell(e.target.value); }}
              rows={2} maxLength={600}
              placeholder={t('scientific.what_cant_tell_placeholder') || "Be honest about the method's limits…"}
              style={{
                marginTop: '4px', width: '100%', boxSizing: 'border-box',
                padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1',
                fontSize: '12px', fontFamily: 'inherit', resize: 'vertical',
              }}
            />
          </div>
        )}
        <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
          {t('scientific.plan_no_ai_note') || "There's no AI helper on this stage by design — picking a method is your call."}
        </p>
      </div>
    );
  }

  function GatherStage(props) {
    var t = props.t;
    var ctx = props.ctx;
    var journal = ctx.journal;
    var setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var VoiceNoteBlock = primitives.VoiceNoteBlock;
    var evidence = (journal.evidenceCards || []).filter(function (c) { return c.tag !== 'wondering'; });
    var _adding = useState({ text: '', surprise: false });
    var addingDraft = _adding[0]; var setAddingDraft = _adding[1];

    var addCard = function (kind, opts) {
      var text = (addingDraft.text || '').trim();
      if (kind === 'text' && !text) return;
      var card = {
        id: 'ev' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        ts: Date.now(),
        kind: kind,
        text: text,
        tag: addingDraft.surprise ? 'surprise' : 'expected',
        audioBase64: (opts && opts.audioBase64) || null,
        durationS: (opts && opts.durationS) || 0,
      };
      setJournal(function (prev) {
        var next = Object.assign({}, prev);
        next.evidenceCards = (prev.evidenceCards || []).concat([card]);
        return next;
      });
      setAddingDraft({ text: '', surprise: false });
    };
    var removeCard = function (id) {
      setJournal(function (prev) {
        var next = Object.assign({}, prev);
        next.evidenceCards = (prev.evidenceCards || []).filter(function (c) { return c.id !== id; });
        return next;
      });
    };

    var expected = evidence.filter(function (c) { return c.tag !== 'surprise'; });
    var surprise = evidence.filter(function (c) { return c.tag === 'surprise'; });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <ExemplarGate t={t} stageKey="gather" journal={journal} setJournal={setJournal}
                      primitives={primitives} pair={EXEMPLAR_PAIRS.gather} />
        <div style={{ padding: '12px', borderRadius: '12px', background: '#fff', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
            {t('scientific.add_evidence_label') || 'Log an evidence card'}
          </h4>
          <textarea
            value={addingDraft.text}
            onChange={function (e) { setAddingDraft(Object.assign({}, addingDraft, { text: e.target.value })); }}
            rows={2} maxLength={400}
            placeholder={t('scientific.evidence_placeholder') || 'What did you observe / measure / find? Be specific.'}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '8px 10px', borderRadius: '8px',
              border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'inherit',
            }}
          />
          <div style={{ marginTop: '6px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#b45309', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={addingDraft.surprise}
                onChange={function (e) { setAddingDraft(Object.assign({}, addingDraft, { surprise: e.target.checked })); }}
              />
              <span aria-hidden="true">{'\u{1F4A1} '}</span>
              {t('scientific.surprise_check') || "Didn't expect this"}
            </label>
            <button
              type="button"
              onClick={function () { addCard('text'); }}
              style={{
                padding: '6px 12px', borderRadius: '999px',
                background: '#7c3aed', color: '#fff', border: 'none',
                fontWeight: 700, fontSize: '11px', cursor: 'pointer',
              }}
            >
              {t('scientific.add_card_button') || '+ Add card'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <EvidenceColumn t={t} title={t('scientific.expected_column') || 'Expected'} cards={expected} onRemove={removeCard} accent="#16a34a" />
          <EvidenceColumn t={t} title={t('scientific.surprise_column') || "Didn't expect this"} cards={surprise} onRemove={removeCard} accent="#d97706" />
        </div>
      </div>
    );
  }

  function EvidenceColumn(props) {
    var t = props.t;
    var cards = props.cards || [];
    var accent = props.accent || '#475569';
    return (
      <div style={{ padding: '10px', borderRadius: '12px', background: '#fff', border: '1px solid #e2e8f0' }}>
        <h5 style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', background: accent, borderRadius: '50%', marginRight: '6px' }} aria-hidden="true" />
          {props.title} <span style={{ fontWeight: 700, color: '#64748b', textTransform: 'none' }}>({cards.length})</span>
        </h5>
        {cards.length === 0 ? (
          <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
            {t('scientific.no_evidence_yet') || 'Nothing yet.'}
          </p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {cards.map(function (c) {
              return (
                <li key={c.id} style={{
                  padding: '6px 8px', borderRadius: '8px', background: '#f8fafc',
                  fontSize: '11px', color: '#1e293b', display: 'flex', gap: '6px', alignItems: 'flex-start',
                }}>
                  <span style={{ flex: 1, lineHeight: 1.5 }}>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>{new Date(c.ts || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{' '}
                    {c.text}
                  </span>
                  <button
                    type="button"
                    onClick={function () { props.onRemove(c.id); }}
                    aria-label="Remove evidence card"
                    style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
                  >{'\u{2715}'}</button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  function InterpretArgueStage(props) {
    var t = props.t;
    var ctx = props.ctx;
    var journal = ctx.journal;
    var setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var note = (journal.stageNotes || {}).interpret_argue || {};
    var _read = useState(note.text || ''); var reading = _read[0]; var setReading = _read[1];
    var _steel = useState(note.steelmanText || ''); var steelman = _steel[0]; var setSteelman = _steel[1];
    var _asA = useState(Array.isArray(note.studentSideAssumptionsRequired) ? note.studentSideAssumptionsRequired.join('\n') : '');
    var asA = _asA[0]; var setAsA = _asA[1];
    var _disC = useState(Array.isArray(note.studentSideDisconfirmers) ? note.studentSideDisconfirmers.join('\n') : '');
    var disC = _disC[0]; var setDisC = _disC[1];
    var _comp = useState(note.comparisonText || ''); var comp = _comp[0]; var setComp = _comp[1];
    var _busy = useState(false); var busy = _busy[0]; var setBusy = _busy[1];
    var _aiResult = useState(null); var aiResult = _aiResult[0]; var setAiResult = _aiResult[1];

    useEffect(function () {
      var assumpsArr = asA.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      var discsArr = disC.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      setJournal(function (prev) {
        var next = Object.assign({}, prev);
        next.stageNotes = Object.assign({}, prev.stageNotes || {});
        next.stageNotes.interpret_argue = Object.assign({}, next.stageNotes.interpret_argue || {}, {
          text: reading,
          steelmanText: steelman,
          studentSideAssumptionsRequired: assumpsArr,
          studentSideDisconfirmers: discsArr,
          comparisonText: comp,
          ts: Date.now(),
        });
        return next;
      });
    }, [reading, steelman, asA, disC, comp]);

    var askAnother = async function () {
      setBusy(true); setAiResult(null);
      try {
        var res = await ctx.ask(TOUCHPOINTS.steelman_second_pass, ctx);
        setAiResult(res);
      } finally { setBusy(false); }
    };

    var canAsk = reading.trim().length >= 40 && steelman.trim().length >= 50
      && asA.split('\n').filter(function (s) { return s.trim(); }).length >= 2
      && disC.split('\n').filter(function (s) { return s.trim(); }).length >= 2;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <ExemplarGate t={t} stageKey="interpret_argue" journal={journal} setJournal={setJournal}
                      primitives={primitives} pair={EXEMPLAR_PAIRS.interpret_argue} />

        <TextareaCard t={t} label={t('scientific.your_reading_label') || 'Your reading of the evidence'}
                      help={t('scientific.your_reading_help') || 'What do YOU think the data shows? Be specific. ≥40 chars.'}
                      value={reading} onChange={setReading} rows={4} max={1200} />
        <TextareaCard t={t} label={t('scientific.your_steelman_label') || 'Your steelman of an OPPOSING reading'}
                      help={t('scientific.your_steelman_help') || 'Argue the other side as strongly as you can. Try "Someone could reasonably read this as …". ≥50 chars.'}
                      value={steelman} onChange={setSteelman} rows={4} max={1200} />
        <TextareaCard t={t} label={t('scientific.your_assumptions_label') || 'Assumptions YOUR OWN reading requires (one per line, ≥2)'}
                      help={t('scientific.your_assumptions_help') || 'What would have to be true for your reading to hold?'}
                      value={asA} onChange={setAsA} rows={3} max={800} />
        <TextareaCard t={t} label={t('scientific.your_disconfirmers_label') || 'What would disconfirm YOUR OWN reading (one per line, ≥2)'}
                      help={t('scientific.your_disconfirmers_help') || 'What evidence would tell you your reading is wrong?'}
                      value={disC} onChange={setDisC} rows={3} max={800} />

        <button
          type="button"
          disabled={busy || !canAsk}
          onClick={askAnother}
          style={{
            alignSelf: 'flex-start',
            padding: '10px 18px', borderRadius: '999px',
            background: busy || !canAsk ? '#cbd5e1' : '#16a34a',
            color: '#fff', border: 'none',
            fontWeight: 800, fontSize: '12px', cursor: busy || !canAsk ? 'not-allowed' : 'pointer',
          }}
        >
          <span aria-hidden="true">{'\u{1F916} '}</span>
          {busy ? (t('scientific.asking') || 'Asking…') : (t('scientific.ask_another_button') || 'Show me another reading')}
        </button>
        {aiResult && aiResult.blocked && (<BlockedNote t={t} reason={aiResult.detail || aiResult.blockedReason} />)}
        {aiResult && !aiResult.blocked && aiResult.data && (
          <AiResultPanel t={t} data={aiResult.data} primitives={primitives} />
        )}

        {aiResult && !aiResult.blocked && (
          <TextareaCard t={t} label={t('scientific.comparison_label') || 'Your comparison (gate to Revise & Share + export, ≥80 chars)'}
                        help={t('scientific.comparison_help') || 'Given OUR evidence: which reading is stronger, and what additional evidence would distinguish them? You author this — AI does not.'}
                        value={comp} onChange={setComp} rows={4} max={1200} />
        )}
      </div>
    );
  }

  function TextareaCard(props) {
    return (
      <div style={{ padding: '12px', borderRadius: '12px', background: '#fff', border: '1px solid #e2e8f0' }}>
        <label style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', display: 'block' }}>
          {props.label}
        </label>
        {props.help && (<p style={{ margin: '4px 0', fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>{props.help}</p>)}
        <textarea
          value={props.value}
          onChange={function (e) { props.onChange(e.target.value); }}
          rows={props.rows || 3}
          maxLength={props.max || 800}
          style={{
            marginTop: '4px', width: '100%', boxSizing: 'border-box',
            padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1',
            fontSize: '12px', fontFamily: 'inherit', resize: 'vertical',
            minHeight: '60px',
          }}
        />
      </div>
    );
  }

  function ReviseShareStage(props) {
    var t = props.t;
    var ctx = props.ctx;
    var journal = ctx.journal;
    var setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var claims = journal.claims || [];
    var snaps = journal.modelSnapshots || [];
    var lastSnap = snaps.length ? snaps[snaps.length - 1] : null;
    var _revised = useState((lastSnap && lastSnap.text) || ''); var revised = _revised[0]; var setRevised = _revised[1];
    var _revConf = useState((lastSnap && lastSnap.confidence) || ''); var revConf = _revConf[0]; var setRevConf = _revConf[1];
    var _revUnk = useState((lastSnap && lastSnap.knownUnknowns) || ''); var revUnk = _revUnk[0]; var setRevUnk = _revUnk[1];
    var _refl = useState(((journal.stageNotes || {}).revise_share || {}).revisionReflection || '');
    var refl = _refl[0]; var setRefl = _refl[1];
    var _aiResult = useState(null); var aiResult = _aiResult[0]; var setAiResult = _aiResult[1];
    var _busy = useState(false); var busy = _busy[0]; var setBusy = _busy[1];
    var _adding = useState(''); var adding = _adding[0]; var setAdding = _adding[1];

    useEffect(function () {
      setJournal(function (prev) {
        var next = Object.assign({}, prev);
        next.stageNotes = Object.assign({}, prev.stageNotes || {});
        next.stageNotes.revise_share = Object.assign({}, next.stageNotes.revise_share || {}, {
          revisionReflection: refl, ts: Date.now(),
        });
        return next;
      });
    }, [refl]);

    var saveRevised = function () {
      if (revised.trim().length < 30 || !revConf) return;
      setJournal(function (prev) {
        var next = Object.assign({}, prev);
        var prior = prev.modelSnapshots || [];
        next.modelSnapshots = prior.concat([{
          v: prior.length + 1,
          ts: Date.now(),
          text: revised.trim(),
          confidence: revConf,
          knownUnknowns: revUnk.trim(),
          loopBackOrigin: prev.pendingLoopReturn ? { fromStage: prev.pendingLoopReturn.fromStage, ts: Date.now() } : null,
        }]);
        return next;
      });
    };

    var addClaim = function () {
      if (!adding.trim()) return;
      setJournal(function (prev) {
        var next = Object.assign({}, prev);
        next.claims = (prev.claims || []).concat([{
          id: 'cl' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          ts: Date.now(),
          text: adding.trim(),
          label: '',
          staleLabel: false,
        }]);
        return next;
      });
      setAdding('');
    };
    var setClaimLabel = function (id, label) {
      setJournal(function (prev) {
        var next = Object.assign({}, prev);
        next.claims = (prev.claims || []).map(function (c) {
          if (c.id !== id) return c;
          return Object.assign({}, c, { label: label, staleLabel: false });
        });
        return next;
      });
    };
    var removeClaim = function (id) {
      setJournal(function (prev) {
        var next = Object.assign({}, prev);
        next.claims = (prev.claims || []).filter(function (c) { return c.id !== id; });
        return next;
      });
    };

    var askQuestion = async function () {
      setBusy(true); setAiResult(null);
      try {
        var res = await ctx.ask(TOUCHPOINTS.honest_uncertainty, ctx);
        setAiResult(res);
      } finally { setBusy(false); }
    };

    var canAsk = claims.length >= 2 && claims.every(function (c) {
      return c.text && c.text.length >= 25 && ['supported','overreach','still_unknown'].includes(c.label);
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <ExemplarGate t={t} stageKey="revise_share" journal={journal} setJournal={setJournal}
                      primitives={primitives} pair={EXEMPLAR_PAIRS.revise_share} />

        <div style={{ padding: '12px', borderRadius: '12px', background: '#fff', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
            {t('scientific.revised_model_label') || 'Revised model (becomes vN+1 snapshot)'}
          </h4>
          <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
            {t('scientific.revised_model_help') || 'What changed in your thinking, and why? Save a new snapshot.'}
          </p>
          <textarea value={revised} onChange={function (e) { setRevised(e.target.value); }}
            rows={4} maxLength={1500}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '8px',
              border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }} />
          <div style={{ marginTop: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>Confidence:</span>
            {['low','medium','high'].map(function (c) {
              return (
                <label key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#475569', cursor: 'pointer' }}>
                  <input type="radio" name="rev-conf" value={c} checked={revConf === c} onChange={function () { setRevConf(c); }} />
                  {c}
                </label>
              );
            })}
            <button type="button" onClick={saveRevised}
              disabled={revised.trim().length < 30 || !revConf}
              style={{ padding: '6px 12px', borderRadius: '999px',
                background: revised.trim().length < 30 || !revConf ? '#cbd5e1' : '#7c3aed',
                color: '#fff', border: 'none', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
              {t('scientific.save_revised_snapshot') || 'Save revised snapshot'}
            </button>
          </div>
          <textarea value={revUnk} onChange={function (e) { setRevUnk(e.target.value); }}
            rows={2} maxLength={600}
            placeholder={t('scientific.revised_unknowns_placeholder') || 'What is still unknown at this version?'}
            style={{ marginTop: '8px', width: '100%', boxSizing: 'border-box', padding: '8px 10px',
              borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'inherit' }} />
        </div>

        <TextareaCard t={t} label={t('scientific.revision_reflection_label') || 'What changed in your thinking? (export gate, ≥40 chars)'}
                      help={t('scientific.revision_reflection_help') || 'Articulate what shifted between your v1 model and now — in your own words.'}
                      value={refl} onChange={setRefl} rows={3} max={800} />

        <div style={{ padding: '12px', borderRadius: '12px', background: '#fff', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
            {t('scientific.claims_label') || 'Your claims (≥2; label each honestly)'}
          </h4>
          <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
            {t('scientific.claims_help') ||
              'Claims should be ABOUT what you investigated. Label EACH yourself before AI questions your labels.'}
          </p>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <input type="text" value={adding} onChange={function (e) { setAdding(e.target.value); }}
              onKeyDown={function (e) { if (e.key === 'Enter') addClaim(); }}
              placeholder={t('scientific.claim_placeholder') || 'A specific claim about your investigation…'}
              maxLength={400}
              style={{ flex: 1, padding: '8px 10px', borderRadius: '8px',
                border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'inherit' }} />
            <button type="button" onClick={addClaim}
              style={{ padding: '6px 12px', borderRadius: '999px', background: '#7c3aed',
                color: '#fff', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>+</button>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {claims.map(function (c, idx) {
              return (
                <li key={c.id} style={{
                  padding: '8px 10px', borderRadius: '10px',
                  background: c.staleLabel ? '#fef3c7' : '#f8fafc',
                  border: '1px solid ' + (c.staleLabel ? '#fbbf24' : '#e2e8f0'),
                }}>
                  <div style={{ fontSize: '12px', color: '#1e293b', marginBottom: '6px' }}>
                    <strong>{idx + 1}.</strong> {c.text}
                    {c.staleLabel && (<span style={{ marginLeft: '6px', fontSize: '10px', color: '#92400e', fontWeight: 700 }}>label is stale — your model changed</span>)}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { k: 'supported', label: 'Supported', color: '#16a34a' },
                      { k: 'overreach', label: 'Overreach', color: '#d97706' },
                      { k: 'still_unknown', label: 'Still unknown', color: '#6366f1' },
                    ].map(function (opt) {
                      var selected = c.label === opt.k;
                      return (
                        <button key={opt.k} type="button" onClick={function () { setClaimLabel(c.id, opt.k); }}
                          style={{
                            padding: '4px 10px', borderRadius: '999px',
                            background: selected ? opt.color : '#ffffff',
                            color: selected ? '#fff' : opt.color,
                            border: '1px solid ' + opt.color,
                            fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                          }}>
                          {opt.label}
                        </button>
                      );
                    })}
                    <button type="button" onClick={function () { removeClaim(c.id); }}
                      aria-label="Remove claim"
                      style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px' }}>
                      {'\u{2715}'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <button type="button" disabled={busy || !canAsk} onClick={askQuestion}
          style={{ alignSelf: 'flex-start',
            padding: '10px 18px', borderRadius: '999px',
            background: busy || !canAsk ? '#cbd5e1' : '#4338ca',
            color: '#fff', border: 'none',
            fontWeight: 800, fontSize: '12px',
            cursor: busy || !canAsk ? 'not-allowed' : 'pointer' }}>
          <span aria-hidden="true">{'\u{1F916} '}</span>
          {busy ? (t('scientific.questioning') || 'Questioning…') : (t('scientific.question_my_labels') || 'Question my labels')}
        </button>
        {aiResult && aiResult.blocked && (<BlockedNote t={t} reason={aiResult.detail || aiResult.blockedReason} />)}
        {aiResult && !aiResult.blocked && aiResult.data && (
          <AiResultPanel t={t} data={aiResult.data} primitives={primitives} />
        )}
      </div>
    );
  }

  function BlockedNote(props) {
    var t = props.t;
    var reason = props.reason || (t('scientific.blocked_generic') || "AI couldn't help with that — try again later.");
    return (
      <div role="alert" style={{
        padding: '10px 12px', borderRadius: '10px',
        background: '#fef3c7', border: '1px solid #fbbf24',
        fontSize: '11px', color: '#92400e', lineHeight: 1.5,
      }}>
        <strong style={{ marginRight: '4px' }}>
          <span aria-hidden="true">{'\u{1F6E1}\u{FE0F} '}</span>
          {t('scientific.blocked_prefix') || 'AI helper paused:'}
        </strong>
        {reason}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Main lane render
  // ───────────────────────────────────────────────────────────────────────
  function LaneRoot(props) {
    var ctx = props.ctx;
    var t = ctx.t;
    var journal = ctx.journal;
    var setJournal = ctx.setJournal;
    var primitives = ctx.primitives;

    var activeStage = journal.activeStage || 'notice_wonder';

    var _loopback = useState(null); var loopback = _loopback[0]; var setLoopback = _loopback[1];

    var jumpStage = useCallback(function (toStage) {
      if (toStage === activeStage) return;
      var toIdx = STAGE_KEYS.indexOf(toStage);
      var fromIdx = STAGE_KEYS.indexOf(activeStage);
      if (toIdx === -1 || fromIdx === -1) return;
      // Forward navigation is direct; backward (loop-back) requires the
      // chip picker to ensure the why field is populated.
      if (toIdx < fromIdx) {
        setLoopback({ fromStage: activeStage, toStage: toStage });
        return;
      }
      setJournal(function (prev) {
        return Object.assign({}, prev, { activeStage: toStage });
      });
    }, [activeStage]);

    var commitLoopBack = useCallback(function (payload) {
      var fromStage = loopback.fromStage;
      var toStage = loopback.toStage;
      setJournal(function (prev) {
        var next = Object.assign({}, prev);
        next.loopBacks = (prev.loopBacks || []).concat([{
          ts: Date.now(),
          fromStage: fromStage,
          toStage: toStage,
          whyChipId: payload.whyChipId,
          why: payload.why || null,
        }]);
        // Mark downstream stages as supersededBy when an upstream stage is
        // edited; preserve their content. Also mark claim labels stale if
        // looping back from revise_share or with claims present.
        next.stageNotes = Object.assign({}, prev.stageNotes || {});
        var toIdx = STAGE_KEYS.indexOf(toStage);
        STAGE_KEYS.forEach(function (sk, idx) {
          if (idx > toIdx) {
            var sn = Object.assign({}, next.stageNotes[sk] || {});
            sn.supersededBy = { fromStage: toStage, ts: Date.now() };
            sn.acknowledgedSuperseded = false;
            next.stageNotes[sk] = sn;
          }
        });
        if (next.claims && next.claims.length) {
          next.claims = next.claims.map(function (c) {
            return Object.assign({}, c, { staleLabel: true });
          });
        }
        next.activeStage = toStage;
        next.pendingLoopReturn = { fromStage: fromStage, ts: Date.now() };
        return next;
      });
      setLoopback(null);
    }, [loopback]);

    var returnToOrigin = useCallback(function () {
      if (!journal.pendingLoopReturn) return;
      var origin = journal.pendingLoopReturn.fromStage;
      setJournal(function (prev) {
        var next = Object.assign({}, prev);
        next.activeStage = origin;
        next.pendingLoopReturn = null;
        // Update most recent loopBack with returnedToOrigin so dashboards
        // can compute loop completion.
        if (prev.loopBacks && prev.loopBacks.length) {
          var idx = prev.loopBacks.length - 1;
          next.loopBacks = prev.loopBacks.slice();
          next.loopBacks[idx] = Object.assign({}, prev.loopBacks[idx], {
            returnedToOrigin: { stage: origin, ts: Date.now() },
          });
        }
        return next;
      });
    }, [journal.pendingLoopReturn]);

    var stageNote = (journal.stageNotes || {})[activeStage] || {};
    var superseded = stageNote.supersededBy && !stageNote.acknowledgedSuperseded;

    var acknowledgeSuperseded = function () {
      setJournal(function (prev) {
        var next = Object.assign({}, prev);
        next.stageNotes = Object.assign({}, prev.stageNotes || {});
        var sn = Object.assign({}, next.stageNotes[activeStage] || {});
        sn.acknowledgedSuperseded = true;
        next.stageNotes[activeStage] = sn;
        return next;
      });
    };

    var laneCtx = Object.assign({}, ctx, {
      activeStage: activeStage,
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <button
          type="button"
          onClick={ctx.onExitLane}
          style={{
            alignSelf: 'flex-start',
            padding: '4px 10px', borderRadius: '999px',
            background: '#f1f5f9', color: '#475569', border: 'none',
            fontSize: '11px', fontWeight: 700, cursor: 'pointer',
          }}
        >
          {'\u{2190} '}{t('scientific.back_to_hub_lanes') || 'Choose a different lane'}
        </button>

        <EducatorPanel t={t} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <CycleWheel
            t={t}
            activeStage={activeStage}
            onJump={jumpStage}
            journalStageNotes={journal.stageNotes || {}}
            modelSnapshotCount={(journal.modelSnapshots || []).length}
          />
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#1e293b' }}>
              <span aria-hidden="true">{STAGE_BY_KEY[activeStage].icon + ' '}</span>
              {STAGE_BY_KEY[activeStage].label}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
              {t('scientific.stage_intro_' + activeStage) || ''}
            </p>
          </div>
        </div>

        <StageChipStrip
          activeStage={activeStage}
          onJump={jumpStage}
          journalStageNotes={journal.stageNotes || {}}
          modelSnapshotCount={(journal.modelSnapshots || []).length}
        />

        {superseded && (
          <div role="alert" style={{
            padding: '10px 14px', borderRadius: '10px',
            background: '#fef3c7', border: '1px solid #fbbf24',
            fontSize: '12px', color: '#92400e',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '10px', flexWrap: 'wrap',
          }}>
            <span>
              <span aria-hidden="true">{'\u{26A0}\u{FE0F} '}</span>
              {t('scientific.superseded_banner') ||
                'Your work here was written against earlier upstream content. The upstream changed; this is preserved as a record of your earlier thinking.'}
            </span>
            <button type="button" onClick={acknowledgeSuperseded}
              style={{
                padding: '4px 10px', borderRadius: '999px',
                background: '#fff', border: '1px solid #fbbf24',
                color: '#92400e', fontWeight: 700, fontSize: '11px', cursor: 'pointer',
              }}>
              {t('scientific.acknowledge_superseded') || 'I understand — keep as a record'}
            </button>
          </div>
        )}

        {journal.pendingLoopReturn && journal.pendingLoopReturn.fromStage !== activeStage && (
          <button type="button" onClick={returnToOrigin}
            style={{
              alignSelf: 'flex-start',
              padding: '8px 14px', borderRadius: '999px',
              background: '#7c3aed', color: '#fff', border: 'none',
              fontWeight: 800, fontSize: '12px', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
            }}>
            <span aria-hidden="true">{'\u{21AA}\u{FE0F} '}</span>
            {(t('scientific.return_to_where_i_was') || 'Return to where I was: ') +
              (STAGE_BY_KEY[journal.pendingLoopReturn.fromStage] ? STAGE_BY_KEY[journal.pendingLoopReturn.fromStage].label : '')}
          </button>
        )}

        {activeStage === 'notice_wonder'   && <NoticeWonderStage   t={t} ctx={laneCtx} />}
        {activeStage === 'model_it'        && <ModelItStage        t={t} ctx={laneCtx} />}
        {activeStage === 'plan'            && <PlanStage           t={t} ctx={laneCtx} />}
        {activeStage === 'gather'          && <GatherStage         t={t} ctx={laneCtx} />}
        {activeStage === 'interpret_argue' && <InterpretArgueStage t={t} ctx={laneCtx} />}
        {activeStage === 'revise_share'    && <ReviseShareStage    t={t} ctx={laneCtx} />}

        {/* Cross-cutting loop-rewarding exemplars surfaced at lane exit so
            students AND teachers see the rubric criteria that emphasize
            loop density + trajectory depth, not just final-product polish. */}
        <details style={{
          padding: '10px 14px', borderRadius: '12px',
          background: '#f5f3ff', border: '1px solid #c4b5fd',
        }}>
          <summary style={{ cursor: 'pointer', fontSize: '11px', fontWeight: 800, color: '#5b21b6' }}>
            <span aria-hidden="true">{'\u{1F4DA} '}</span>
            {t('scientific.cross_cutting_exemplars_title') || 'How is strong inquiry recognized? (cross-cutting examples)'}
          </summary>
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {LOOP_REWARDING_EXEMPLARS.map(function (pair, i) {
              return (
                <primitives.ExemplarPair
                  key={i}
                  t={t}
                  criterion={pair.criterion}
                  strongExample={pair.strongExample}
                  weakExample={pair.weakExample}
                  onJudgment={function () { /* informational only */ }}
                />
              );
            })}
          </div>
        </details>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Registration
  // ───────────────────────────────────────────────────────────────────────
  window.ResearchHub.registerLane('scientific', {
    label: 'Scientific Inquiry',
    tagline: 'Phenomenon Workbench',
    icon: '\u{1F52C}',
    blurb: 'Notice a phenomenon, draft a model, pick from observational, experimental, modeling, or comparative methods, then loop back as evidence accumulates. AI here surfaces assumptions and asks questions — it never writes your model.',
    stages: STAGES,
    touchpoints: Object.keys(TOUCHPOINTS).map(function (k) { return TOUCHPOINTS[k]; }),
    methodMenu: METHOD_MENU,
    exemplarPairs: EXEMPLAR_PAIRS,
    crossCuttingExemplars: LOOP_REWARDING_EXEMPLARS,
    render: function (ctx) {
      return <LaneRoot ctx={ctx} />;
    },
    __tier: 2,
  });

  console.log('[CDN] ResearchLaneScientific registered (Tier 2)');
})();
