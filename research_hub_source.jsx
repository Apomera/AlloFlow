/**
 * AlloFlow — Investigation & Research Hub (Tier 1: Hub Shell + Substrate)
 *
 * Three-lane Hub for student inquiry across Scientific Inquiry, Engineering
 * Design, and Humanities & Social Research. Lanes are loaded as plugins via
 * window.ResearchHub.registerLane(); Tier 1 ships the shell, the shared
 * Inquiry Journal substrate, the backend-aware AI-call wrapper with a hard
 * 8/session cap, the developmental-level selector, the "AI suggestion not
 * verdict" badge primitive, the exemplar-pair rubric primitive, voice-note
 * recording, and localStorage persistence. Lane plugins (Phenomenon
 * Workbench / Design Studio / Inquiry Studio) follow in Tiers 2-4.
 *
 * Tier 1 deliberately avoids:
 *   - PHEOC linearity (loops are first-class; lanes will have explicit
 *     "loop back to stage N" affordances when they land)
 *   - Checklist rubrics (replaced by exemplar-pair judgments — the student
 *     picks which of two work samples is stronger and writes a sentence on
 *     why, then compares their own work to both)
 *   - SEL Hub 4-tier evidence convention applied to STUDENT-AUTHORED claims
 *     (those tiers calibrate evaluating EXISTING research traditions; for a
 *     student's own three-fishtank observations they collapse to "practice"
 *     and teach self-flagellation — kept for citing OTHER research)
 *   - AI touchpoints that ship "suggested_revision" / "one_revision_suggestion"
 *     JSON fields (every schema-required suggestion field is replaced with
 *     "questions_to_consider" arrays so the student authors their own work)
 *   - Counter-Evidence Hunters that name specific scholars or sources
 *     (Humanities lane will restrict to counter-FRAMINGS only — no scholar
 *     citation, no quoted text — to prevent hallucinated/false-balance scholars)
 *   - LaunchPad mode-card addition (LaunchPad is hard-capped at a 2x2 grid;
 *     Hub lives as the 7th tile inside Learning Hub Modal instead)
 *   - Cross-module handoffs to PersonaChat / Report Writer / StoryForge /
 *     PoetTree (target modules don't accept the required props yet; those
 *     enabling-PRs are tracked as Tier-4 follow-ups)
 *   - callGemini direct routing (the codebase has a backend-aware `ai`
 *     object at AlloFlowANTI:12680; this module routes through that and
 *     falls back to callGemini only when AIProvider is absent)
 *   - Per-profile localStorage namespacing claim (the host doesn't namespace
 *     any storage by codename today; we document the limitation honestly
 *     rather than implying multi-profile isolation)
 *
 * Wiring (host edits):
 *   1. loadModule('ResearchHub', '…/research_hub_module.js') near the other
 *      Learning-Hub-Modal child modules (post-SelHub/StoryForge load).
 *   2. const [showResearchHub, setShowResearchHub] = useState(false) plus
 *      the same lazy-loader wrapper SetShowStoryForge uses
 *      (window.__alloLazyResearchHub).
 *   3. <CDNModuleGate moduleKey='ResearchHub' …>{(RH) =>
 *      React.createElement(RH, {…props})}</CDNModuleGate> mounted alongside
 *      the StoryForge gate at AlloFlowANTI:27074.
 *   4. view_learning_hub_modal_source.jsx gains a 7th tile that flips
 *      setShowResearchHub(true).
 *   5. onboarding_coach_source.jsx mode descriptor for learning_tools needs
 *      "Research Hub" added (today it literally says "STEM Lab, StoryForge &
 *      SEL Hub").
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.ResearchHub && window.AlloModules.ResearchHub.__tier >= 4) {
    console.log('[CDN] ResearchHub already loaded, skipping');
    return;
  }

  var React = window.React;
  if (!React) { console.error('[ResearchHub] React not found on window'); return; }
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;
  var useCallback = React.useCallback;
  var useMemo = React.useMemo;

  // ───────────────────────────────────────────────────────────────────────
  // Constants
  // ───────────────────────────────────────────────────────────────────────
  var STORAGE_KEY = 'alloflow_research_hub_v1';
  var MAX_AI_CALLS_PER_SESSION = 8;
  var VOICE_NOTE_MAX_SECONDS = 60;
  var INPUT_HARD_CAP = 1500;     // Generous; lane prompts may quote evidence
  var ANSWER_HARD_CAP = 800;     // AI response truncation
  var COOLDOWN_MS = 1500;

  // Developmental level — the epistemic-integrity reviewer flagged that
  // K-2 students should not be asked to "name positionality" or "articulate
  // confidence and known unknowns." Each lane reads this value to calibrate
  // its prompts, rubric copy, and stage labels.
  var DEV_LEVELS = [
    { key: 'k2',  label: 'K–2',         long: 'Early elementary (K–2)' },
    { key: '3_5', label: '3–5',         long: 'Upper elementary (3–5)' },
    { key: '6_8', label: '6–8',         long: 'Middle school (6–8)' },
    { key: '9_12', label: '9–12',       long: 'High school (9–12)' },
    { key: 'ap',  label: 'AP / honors', long: 'AP / honors / dual-enrollment' },
  ];

  // ───────────────────────────────────────────────────────────────────────
  // safeLocal — Safari private + sandboxed iframe throw on storage access.
  // Mirrors the pattern from onboarding_helpers_module.js so a quota failure
  // never surfaces as an uncaught render-path error.
  // ───────────────────────────────────────────────────────────────────────
  function safeLocal(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      if (value === null) { window.localStorage.removeItem(key); return; }
      window.localStorage.setItem(key, value);
    } catch (_) { /* quota / private / sandboxed */ }
  }

  // ───────────────────────────────────────────────────────────────────────
  // Inquiry Journal substrate — the ONE shared object the three lanes write
  // into. The lanes differ in WHICH facets they emphasize (model snapshots
  // vs. constraint matrix vs. positionality vs. claim-evidence-warrant
  // chains) but the journal itself is shared. A student who starts in
  // Scientific Inquiry and finishes by writing a humanities op-ed should
  // not lose their evidence cards in the transition.
  //
  // Per the integration-realism review, persistence lives in localStorage
  // under one key (no per-profile namespacing — host doesn't namespace any
  // storage by codename today, and silently pretending otherwise would mis-
  // lead users on shared devices).
  // ───────────────────────────────────────────────────────────────────────
  function emptyJournal() {
    return {
      v: 4,                              // Tier 4 substrate revision; lanes migrate older shapes lazily
      createdAt: Date.now(),
      updatedAt: Date.now(),
      devLevel: '6_8',
      activeLane: null,                  // 'scientific' | 'engineering' | 'humanities' | null
      activeStage: null,                 // lane-specific stage key
      // Cross-lane substrate fields:
      questionTitle: '',                 // the inquiry framing in the student's words
      // Tier-2: dedicated wonderings substrate (Scientific lane Stage 1). Kept
      // separate from evidenceCards so the Wonder-sorter gate count is
      // structural, not parsed — per the gate-enforcement reviewer.
      wonderings: [],                    // [{ id, ts, text, durationS?, kindFromSorter? }]
      modelSnapshots: [],                // [{ v, ts, text, confidence, knownUnknowns, loopBackOrigin?, deltaFromPrior? }]
      sources: [],                       // [{ id, ts, kind, citation, notes, sift }]
      evidenceCards: [],                 // [{ id, ts, kind: 'text'|'voice', text, audioBase64, durationS, tag, surprise? }]
      // Tier-2: first-class claims substrate (Scientific lane Stage 6) — the
      // export artifact's headline data lives at the top level, not nested.
      claims: [],                        // [{ id, ts, text, label, staleLabel?, aiLabelQuestion?, warrantText?, calibrationResponse? }]
      claimEvidenceLinks: [],            // [{ id, claim, evidenceIds, warrant, qualifier, rebuttal }]
      positionality: { text: '', audioBase64: null, durationS: 0 },
      // Tier-3: tradeOffLedger and constraintMatrix slots reserved at Tier 1
      // are EXTENDED to carry units + sacrificed-criterion + whose-interest.
      // Shapes lazy-migrated by loadJournal so older sessions don't crash.
      tradeOffLedger: [],                // [{ v, ts, criterion: gainedConstraintId, sacrificedCriterion: sacrificedConstraintId, accepted: declarationText, justification, whoseInterestThisServes, acceptedPriorityRank, justificationAudioBase64?, loopBackOrigin? }]
      constraintMatrix: [],              // [{ id, ts, criterion, target, unit, measured, weight, source, tier, staleLabel? }]
      // Tier-3 Engineering Design lane top-level fields. Each is justified as
      // top-level because cross-stage rendering, structural distinctness
      // gates, AI validators, and export-time substring-link checks all need
      // direct access. Nesting any of these in stageNotes would break those
      // gates or render-paths. See docs/research_lane_engineering_design.md.
      stakeholderProfile: null,          // { name, group?, accessNote: 'direct'|'proxy'|'imagined_with_research', epistemicStatus: 'invented'|'observed'|'interviewed'|'curriculum_prompt', whyThisStakeholderJustification, voiceNote?, ts, staleLabel? }
      criteria: [],                      // [{ id, name, unit, target, direction: 'maximize'|'minimize'|'meet', weight: 1-5, kind: 'stakeholder-derived'|'physical-safety'|'measurable-other', ts, staleLabel? }]
      candidateConcepts: [],             // [{ id, ts, name, sketchText, sketchDataUrl?, audioBase64?, durationS?, materialsList, constraintsSatisfied, constraintsPunted, riskiestAssumption, killReason?, chosen?, supersededBy? }]
      decisionMatrix: [],                // [{ candidateId, criterionId, score: 1-5, reasonText, ts }]
      criteriaWeightLog: [],             // append-only: [{ ts, criterionId, fromWeight, toWeight, afterMatrixFilled }]
      testProtocol: [],                  // [{ id, criterionId, procedureText, instrument, unit, pass_threshold, conditions?, ts }]
      buildLog: [],                      // append-only: [{ v, ts, candidateId, buildText, materialsActually, photoDescription, durationS_voice?, audioBase64?, loopBackOrigin?, deltaFromPrior? }]
      testRun: [],                       // [{ id, v, ts, buildLogV, criterionId, measured, unit, passed, observationText, audioBase64?, durationS? }]
      stakeholderFeedback: [],           // [{ id, ts, prototypeVersionRef, verbatimResponse?, proxyJustification?, audioBase64?, durationS?, observerNotes, surprises, criteriaJudgments: [{ criterionId, stakeholderJudgment }] }]
      failureLog: [],                    // [{ id, ts, fromTestRunId, modeText, causeHypothesisText, changedVariable: { name, fromValue, toValue }, predictedEffectText, retestRunId, predictionVsRealityRadio? }]
      designClaims: [],                  // [{ id, ts, text, kind: 'serves_stakeholder'|'satisfies_criterion'|'acknowledges_limit', label, staleLabel?, claimEvidenceRunIds, constraintRefs, tradeoffRefs, aiLabelQuestion?, calibrationResponse? }]
      // Tier-4 Humanities & Social Research lane top-level fields. Each is
      // justified as top-level because cross-stage gates, AI validators, the
      // ForeclosureCoda substring-link composition, and the WarrantTrajectoryRibbon
      // assessment artifact all need direct array access. See
      // docs/research_lane_humanities_design.md.
      framings: [],                      // [{ id, ts, label, framingPrompt, frameKindChip, whatItForegrounds, whatItOccludes, whichVettedSourcesFitIt, domain, staleLabel?, supersededBy? }]
      humanitiesPosition: null,          // { text, ts, staleLabel, label, whatThisClaimDoesNotSpeakTo, positionalityLinkText } — SINGLETON (Humanities artifacts organize around one defensible stance)
      framingProbes: [],                 // append-only: [{ id, ts, framingId, linkId, verdict: 'warrant_survives'|'warrant_contracts'|'warrant_fails', studentRationale, quotedSnippetRef, loopBackOrigin?, allSurvivesJustification? }]
      positionalitySnapshots: [],        // append-only versioned: [{ v, ts, materialRelationshipText, visibilityField, obscuringField, whoseStandpointIsStructurallyAbsentText, partialIncorporationCommitmentsText, epistemicStatus, audioBase64?, durationS?, deltaFromPriorText?, loopBackOrigin?, devLevelMode }]
      absentVoices: [],                  // [{ id, ts, whoseVoiceText, whyAbsentChip, whatTheyMightSeeText, partialIncorporationAttemptText?, sourceIdContext?, staleLabel? }]
      questionStakeholders: [],          // [{ id, ts, whoseQuestionIsThis, whyTheyCareText, whatThisFramingForegrounds, whatThisFramingObscures, staleLabel? }] — distinct from singleton Engineering stakeholderProfile (humanities needs plural)
      humanitiesPlausibleAnswers: [],    // [{ id, ts, text, isWorkingPosition, staleLabel? }]
      stakesAudience: null,              // { chip: 'school_community'|'city'|'named_public'|'historical_record'|'policymakers', label, ts, staleLabel? } — closed enum (no free-text escape)
      genreChoice: null,                 // { genre: 'op_ed'|'policy_memo'|'civic_action_statement'|'exhibit_text', ts, lockUntilSubstrateLinkPass, staleLabel? }
      compositions: [],                  // append-only versioned: [{ id, v, ts, genreChoice, bodyText, bodyClaimTags, loadBearingClaimId, publicAccountabilityTarget, publicAccountabilityNote, foreclosureCodaText, foreclosureCodaHash, audioBase64?, durationS?, loopBackOrigin?, deltaFromPriorText?, no_ai_notes }]
      authorshipLog: [],                 // [{ ts, field, eventKind: 'paste'|'large_insert', acknowledged, whereFromNote? }] — anti-laundering structural friction
      stageNotes: {},                    // { stageKey: { text, audioBase64, durationS, ts, exemplarViewed?, exemplarDismissed?, supersededBy?, acknowledgedSuperseded?, ...stageSpecific } }
      // Tier-2: loopBacks now carry a whyChipId (1-tap canned reason) so
      // the field is reliably populated — per the loop-back-architecture
      // reviewer who flagged the empty-why failure mode.
      loopBacks: [],                     // [{ ts, fromStage, toStage, whyChipId, why?, returnedToOrigin? }]
      // Tier-2: aiHistory records BOTH successful calls AND blocked/rejected
      // ones with bypass_signals + rejectReason for teacher dashboards.
      aiHistory: [],                     // [{ ts, touchpoint, in?, summary?, blocked, gate_reason?, bypass_signals?, rejectReason?, attemptedShapeKeys?, traceId? }]
      aiCallCount: 0,                    // resets on session reload only
      // Tier-2: pendingLoopReturn lets the lane offer "return to where I was"
      // after the student edits an upstream stage during a loop-back.
      pendingLoopReturn: null,           // null | { fromStage, ts }
      sessionStartedAt: Date.now(),
    };
  }

  function loadJournal() {
    var raw = safeLocal(STORAGE_KEY);
    if (!raw) return emptyJournal();
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return emptyJournal();
      // Tier-3 migration ladder. Pre-Tier-3 the check was strict-equal to 1,
      // which silently dropped any v:2 save (the actual shape emptyJournal()
      // returned at Tier 2). Accept v in {1, 2, 3} and migrate forward so
      // mid-pilot sessions don't lose their inquiry on a deploy.
      var v = parsed.v;
      if (v !== 1 && v !== 2 && v !== 3 && v !== 4) return emptyJournal();
      // Merge defaults so an older shape doesn't crash readers.
      var fresh = emptyJournal();
      Object.keys(fresh).forEach(function (k) {
        if (parsed[k] === undefined) parsed[k] = fresh[k];
      });
      // v:1/v:2 → v:3 — constraintMatrix rows gained a required `unit` field;
      // tradeOffLedger rows gained sacrificedCriterion + whoseInterestThisServes
      // + acceptedPriorityRank. Migrate lazily so existing rows render.
      if (v === 1 || v === 2) {
        if (Array.isArray(parsed.constraintMatrix)) {
          parsed.constraintMatrix = parsed.constraintMatrix.map(function (row) {
            if (!row || typeof row !== 'object') return row;
            if (row.unit === undefined) row.unit = '';
            return row;
          });
        }
        if (Array.isArray(parsed.tradeOffLedger)) {
          parsed.tradeOffLedger = parsed.tradeOffLedger.map(function (row) {
            if (!row || typeof row !== 'object') return row;
            if (row.sacrificedCriterion === undefined) row.sacrificedCriterion = null;
            if (row.whoseInterestThisServes === undefined) row.whoseInterestThisServes = '';
            if (row.acceptedPriorityRank === undefined) row.acceptedPriorityRank = null;
            return row;
          });
        }
      }
      // v:1/v:2/v:3 → v:4 — Humanities lane adds 11 new top-level fields
      // (defaulted above via fresh-merge) and may benefit from seeding
      // positionalitySnapshots from singleton positionality if it has content.
      if (v === 1 || v === 2 || v === 3) {
        if (parsed.positionality && parsed.positionality.text &&
            Array.isArray(parsed.positionalitySnapshots) && parsed.positionalitySnapshots.length === 0) {
          parsed.positionalitySnapshots = [{
            v: 1, ts: parsed.positionality.ts || Date.now(),
            materialRelationshipText: parsed.positionality.text || '',
            visibilityField: '', obscuringField: '',
            whoseStandpointIsStructurallyAbsentText: '',
            partialIncorporationCommitmentsText: '',
            epistemicStatus: '', audioBase64: parsed.positionality.audioBase64 || null,
            durationS: parsed.positionality.durationS || 0,
            devLevelMode: 'structured',
          }];
        }
      }
      parsed.v = 4;
      // aiCallCount resets per page-load — quota is a per-session anti-spam
      // gate, not anti-cost; documented explicitly so this isn't surprising.
      parsed.aiCallCount = 0;
      parsed.sessionStartedAt = Date.now();
      return parsed;
    } catch (_) { return emptyJournal(); }
  }

  function saveJournal(journal) {
    if (!journal) return;
    try {
      var snapshot = Object.assign({}, journal);
      snapshot.updatedAt = Date.now();
      safeLocal(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (_) { /* quota — silently drop, in-memory still works */ }
  }

  // ───────────────────────────────────────────────────────────────────────
  // Shared helpers exposed for lane plugins — drop-in code from the gate-
  // enforcement reviewer. Lane gateChecks compose these instead of
  // re-implementing length/distinctness/keyboard-mash checks (which would
  // drift across lanes and create inconsistent UX).
  // ───────────────────────────────────────────────────────────────────────
  var SHARED_STOP_WORDS = new Set(['the','a','an','is','of','to','in','it','that','this','and',
    'or','but','i','my','we','our','because','so','for','on','with','at','as','then','than','my','your','its']);
  var PLACEHOLDER_BLACKLIST = ['test','asdf','idk','untitled','lorem ipsum','placeholder','science thing','dunno','whatever','idc'];
  var KEYBOARD_ROWS = ['qwertyuiop','asdfghjkl','zxcvbnm','1234567890'];

  function isPlausibleProse(text, minChars, opts) {
    opts = opts || {};
    var t = (text || '').trim();
    if (t.length < minChars) return { ok: false, reason: 'too_short' };
    var distinctLetters = new Set((t.toLowerCase().match(/[a-z]/g) || [])).size;
    if (distinctLetters < 4) return { ok: false, reason: 'low_letter_diversity' };
    if (/(.)\1{5,}/.test(t)) return { ok: false, reason: 'char_run_repeat' };
    var tokens = t.split(/\s+/).filter(function (w) { return /[a-z]/i.test(w); });
    if (tokens.length < (opts.minTokens || 2)) return { ok: false, reason: 'too_few_words' };
    for (var r = 0; r < KEYBOARD_ROWS.length; r++) {
      var row = KEYBOARD_ROWS[r];
      for (var i = 0; i < row.length - 4; i++) {
        if (t.toLowerCase().indexOf(row.slice(i, i + 5)) !== -1) return { ok: false, reason: 'keyboard_mash' };
      }
    }
    var lower = t.toLowerCase();
    for (var b = 0; b < PLACEHOLDER_BLACKLIST.length; b++) {
      var bl = PLACEHOLDER_BLACKLIST[b];
      if (lower === bl || lower.indexOf(bl + ' ') === 0) return { ok: false, reason: 'placeholder_phrase' };
    }
    return { ok: true };
  }

  function normalizeForCompare(s) {
    if (!s || typeof s !== 'string') return '';
    var out = s;
    try { out = out.normalize('NFKC'); } catch (_) {}
    out = out.toLowerCase();
    out = out.replace(/[‘’]/g, "'");
    out = out.replace(/[“”]/g, '"');
    out = out.replace(/[–—]/g, '-');
    out = out.replace(/\s+/g, ' ');
    return out.trim();
  }

  function tokenJaccard(a, b) {
    function toks(s) {
      var set = new Set();
      normalizeForCompare(s).split(/\W+/).forEach(function (w) {
        if (w.length > 2 && !SHARED_STOP_WORDS.has(w)) set.add(w);
      });
      return set;
    }
    var A = toks(a), B = toks(b);
    if (A.size === 0 || B.size === 0) return 0;
    var inter = 0;
    A.forEach(function (x) { if (B.has(x)) inter++; });
    return inter / (A.size + B.size - inter);
  }

  // Mechanism verbs the Model-It gate looks for so a student model contains
  // at least one "does what to what" verb. Per reviewer 1's drop-in code.
  var MECHANISM_VERBS = ['cause','causes','make','makes','carry','carries','transfer','transfers',
    'block','blocks','depend','depends','vary','varies','increase','increases','decrease','decreases',
    'conduct','conducts','radiate','radiates','absorb','absorbs','reflect','reflects','affect','affects',
    'influence','influences','trigger','triggers','prevent','prevents','enable','enables','flow','flows',
    'move','moves','push','pushes','pull','pulls','heat','heats','cool','cools','grow','grows',
    'shrink','shrinks','stop','stops','slow','slows','speed','speeds'];

  // Perspective-taking markers the Steelman gate checks for — signals that
  // the student is genuinely arguing from another side rather than restating.
  var PERSPECTIVE_MARKERS_RE = /\b(could|might|someone|alternatively|on the other hand|instead|rather|another way|disagree|opposing|critic|maybe|perhaps|some would say)\b/i;

  // ───────────────────────────────────────────────────────────────────────
  // Plugin registry — mirrors window.SelHub.registerTool. Lane plugins
  // (Tiers 2-4) self-register via window.ResearchHub.registerLane(id, cfg)
  // on script load. Tier 1 ships placeholder cards for lanes that haven't
  // registered yet so the user sees what's coming.
  // ───────────────────────────────────────────────────────────────────────
  if (!window.ResearchHub) {
    window.ResearchHub = {
      _lanes: {},
      _order: [],
      registerLane: function (id, config) {
        if (!id || !config) return;
        config.id = id;
        if (!config.label) config.label = id;
        if (!config.stages) config.stages = [];
        if (!config.touchpoints) config.touchpoints = [];
        this._lanes[id] = config;
        if (this._order.indexOf(id) === -1) this._order.push(id);
        console.log('[ResearchHub] Registered lane: ' + id);
      },
      getLane: function (id) { return this._lanes[id] || null; },
      getLanes: function () {
        var self = this;
        return this._order.map(function (id) { return self._lanes[id]; }).filter(Boolean);
      },
      __tier: 1,
    };
  }

  // Tier-1 placeholder lane descriptors. These render in the lane selector
  // even before the lane plugin script loads, so the user sees the road-
  // map. When a plugin registers later, it overwrites the placeholder.
  var PLACEHOLDER_LANES = [
    {
      id: 'scientific',
      label: 'Scientific Inquiry',
      tagline: 'Phenomenon Workbench',
      icon: '\u{1F52C}',
      gradFrom: 'from-cyan-50',
      gradTo: 'to-blue-50',
      border: 'border-cyan-600',
      titleColor: 'text-cyan-800',
      descColor: 'text-cyan-700',
      blurb: 'Notice a phenomenon, draft a model, pick from observational, experimental, modeling, or comparative methods, then loop back as evidence accumulates.',
      stages: [], touchpoints: [],
      _placeholder: true,
    },
    {
      id: 'engineering',
      label: 'Engineering Design',
      tagline: 'Design Studio',
      icon: '\u{1F6E0}\u{FE0F}',
      gradFrom: 'from-amber-50',
      gradTo: 'to-orange-50',
      border: 'border-amber-600',
      titleColor: 'text-amber-800',
      descColor: 'text-amber-700',
      blurb: 'Define a problem with criteria and constraints, model and prototype, log trade-offs in a designer’s notebook, and communicate to real stakeholders.',
      stages: [], touchpoints: [],
      _placeholder: true,
    },
    {
      id: 'humanities',
      label: 'Humanities & Social Research',
      tagline: 'Inquiry Studio',
      icon: '\u{1F4DA}',
      gradFrom: 'from-rose-50',
      gradTo: 'to-pink-50',
      border: 'border-rose-600',
      titleColor: 'text-rose-800',
      descColor: 'text-rose-700',
      blurb: 'Author a contestable question, name your standpoint, evaluate sources laterally (SIFT), and build a claim-evidence-warrant chain ending in a public argument or informed action.',
      stages: [], touchpoints: [],
      _placeholder: true,
    },
  ];

  function resolveLanes() {
    // Merge: registered lanes (from plugins) take precedence over placeholders.
    var registered = (window.ResearchHub && window.ResearchHub.getLanes) ? window.ResearchHub.getLanes() : [];
    var byId = {};
    registered.forEach(function (L) { byId[L.id] = L; });
    return PLACEHOLDER_LANES.map(function (P) { return byId[P.id] || P; })
      // Tack on any registered lanes that aren't in the placeholder set.
      .concat(registered.filter(function (L) {
        return PLACEHOLDER_LANES.every(function (P) { return P.id !== L.id; });
      }));
  }

  // ───────────────────────────────────────────────────────────────────────
  // Backend-aware AI call wrapper. The integration-realism review found that
  // every other CDN module routes through callGemini, which is a Gemini-only
  // legacy shim — users on OpenAI / Claude / Ollama / LocalAI backends get
  // silently shoved to Gemini. Research Hub MUST respect backend selection.
  //
  // Routing order:
  //   1. props.ai.generateText (backend-aware AIProvider — preferred)
  //   2. props.onCallGemini (the legacy shim — passed by host as fallback)
  //   3. blocked: 'no_compatible_backend' if neither is available
  //
  // Every call is gated by:
  //   - MAX_AI_CALLS_PER_SESSION (hard 8 cap; visible counter; graceful
  //     degrade with a "use the static help pane" affordance)
  //   - Student-first gate (each touchpoint may declare gateRequires:
  //     'student_authored_X'; the wrapper checks the journal field is
  //     non-empty before forwarding to the model)
  //   - Cooldown 1500ms between calls
  //   - 12s AbortController timeout
  //   - Input length cap (1500 chars per prompt)
  //
  // Output validation:
  //   - JSON parse with markdown-fence stripping (mirrors onboarding_helpers)
  //   - Strip any field matching /^suggested_/ — schema-level pedagogical
  //     guardrail per the pedagogical-integrity review
  //   - Truncate answer-like fields at 800 chars
  //   - Watermark every response with { __aiSuggestion: true, traceId } so
  //     the UI badges it as "AI suggestion — not a verdict"
  // ───────────────────────────────────────────────────────────────────────
  function safeJsonParse(s) {
    if (!s || typeof s !== 'string') return null;
    var trimmed = s.trim();
    var fenced = /^```(?:json)?\s*([\s\S]*?)\s*```\s*$/.exec(trimmed);
    if (fenced) trimmed = fenced[1].trim();
    try { return JSON.parse(trimmed); } catch (_) {}
    var braceStart = trimmed.indexOf('{');
    var braceEnd = trimmed.lastIndexOf('}');
    if (braceStart >= 0 && braceEnd > braceStart) {
      try { return JSON.parse(trimmed.slice(braceStart, braceEnd + 1)); } catch (_) {}
    }
    return null;
  }

  // Tier-2 strip list: per the schema-autocomplete-leak reviewer, the LLM
  // must not be allowed to emit fields that are noun-phrase completions of
  // the student's cognitive work. The wrapper strips these recursively
  // BEFORE handing to the lane's optional validator. Lane prompts SHOULD
  // also not request them, but the wrapper is the last line of defense.
  var FOOTGUN_KEY_PATTERNS = [
    /^suggested[_-]/i,
    /^one[_-]revision/i,
    /^rewrite(_|$)/i,
    /^improved[_-]/i,
    /^better[_-]/i,
    /^proposed[_-]/i,
    /^corrected[_-]/i,
    /^relabel/i,
    /^the[_-]alternative$/i,
    /^the[_-]correct/i,
    /^should[_-](be|instead|use)/i,
    /^revised[_-]claim/i,
    /^assumption$/i,                      // free-text completion smell — use *_questions
    /^warrant$/i,
    /^calibration$/i,
    /^observation$/i,
    /^rationale$/i,
    /^summary$/i,                         // completion-shaped (replaced by quoted_snippet + questions)
    /^interpretation$/i,
    /^reading$/i,
    /^why[_-]relevant$/i,
    /^what[_-]changed[_-]well$/i,
    /^confidence[_-]calibration[_-]note$/i,
    /^coverage[_-]note$/i,
    /^label[_-]question$/i,               // singular variant — must be plural questions[]
    // Tier-3 Engineering Design lane FOOTGUN extensions — at SUBSTRATE level
    // so future lanes (Humanities, Math) inherit. These are noun-phrase
    // completions specific to engineering output (the AI proposing or
    // approving a design / candidate / fix) that the lane prompts explicitly
    // forbid; the substrate strip is the last line of defense if a model
    // ignores the prompt.
    /^proposed[_-]/i,                     // proposed_design / proposed_fix
    /^recommended[_-]/i,                  // recommended_constraint / recommended_candidate
    /^try[_-]this/i,                      // imperative-verb output
    /^better[_-]candidate/i,
    /^optimal[_-]/i,
    /^pick[_-]/i,                         // pick_winner / pick_a_candidate
    /^well[_-]fitted/i,                   // approval verdict
    /^design[_-]is[_-]sound/i,            // approval verdict
    /^ready[_-]to[_-]ship/i,              // approval verdict
    /^meets[_-]all[_-]criteria[_-]judgment$/i,  // approval verdict
    /^correct[_-]priority/i,              // tradeoff_inverter (V2) guard
    /^better[_-]tradeoff/i,
    /^should[_-]sacrifice/i,
    /^suggested[_-]fix/i,
    /^corrected[_-]cause/i,
    /^improvement$/i,                     // completion noun
    /^dominated[_-]judgment$/i,
    // Tier-4 Humanities & Social Research lane FOOTGUN extensions at SUBSTRATE
    // level so this is the LAST line of defense against AI outputs that would
    // name scholars, summarize sources, judge tiers, polish prose, or assert
    // false balance. Honor the Tier-1 prohibition: "Counter-Evidence Hunters
    // that name specific scholars or sources" must never be permitted.
    /^suggested[_-]framing/i,
    /^better[_-]framing/i,
    /^scholar[_-]/i,                      // any scholar-shaped key
    /^according[_-]to/i,                  // attribution-shaped key
    /^as[_-](argued|noted|claimed)[_-]by/i,
    /^school[_-]of[_-]thought/i,
    /^theorist/i,
    /^attributed[_-]to/i,
    /^source[_-]summary$/i,               // refusing source-summary keeps SIFT load-bearing
    /^source[_-]credibility[_-]judgment/i,
    /^suggested[_-]warrant/i,
    /^proposed[_-]warrant/i,
    /^better[_-]thesis/i,
    /^suggested[_-]thesis/i,
    /^thesis$/i,                          // completion noun
    /^suggested[_-]positionality/i,
    /^inferred[_-]identity/i,
    /^balanced[_-]view$/i,                // false-balance verdict
    /^both[_-]sides/i,                    // false-balance verdict
    /^the[_-]other[_-]side$/i,
    /^accurate[_-]reading$/i,             // approval verdict
    /^correct[_-]interpretation/i,
    /^correct[_-]positionality/i,
    /^suggested[_-]tier/i,                // refuse AI assigning SIFT tiers
    /^source[_-]should[_-]be[_-]tier/i,
    /^drafted[_-]/i,                      // composition drafting
    /^polished[_-]/i,
    /^the[_-]stronger[_-]reading/i,
    /^objective[_-]view/i,
    /^balanced[_-]take/i,
    /^well[_-]warranted/i,                // approval verdict
    /^standing[_-]earned[_-]judgment$/i,
    /^expert[_-]opinion/i,
    /^quote$/i,                           // completion noun (AI quoting from invented scholars)
    /^citation[_-]suggestion/i,
    /^proposed[_-]qualifier/i,
    /^proposed[_-]rebuttal/i,
  ];
  function stripPedagogicalFootguns(obj, depth) {
    if (depth === undefined) depth = 0;
    if (depth > 6 || obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(function (x) { return stripPedagogicalFootguns(x, depth + 1); });
    var out = {};
    Object.keys(obj).forEach(function (k) {
      for (var i = 0; i < FOOTGUN_KEY_PATTERNS.length; i++) {
        if (FOOTGUN_KEY_PATTERNS[i].test(k)) return;
      }
      out[k] = stripPedagogicalFootguns(obj[k], depth + 1);
    });
    return out;
  }

  // Tier-2: global question-format validator. Per reviewer 2's GLOBAL rule:
  // every string[] field whose key contains "question" must satisfy
  // (a) each item ends with '?', (b) ≤25 words, (c) no causal-conclusion
  // markers (because/therefore/since/thus/hence/so). Recurses into nested
  // structures; rejects entries that fail. Returns the cleaned object plus
  // a count of rejected entries for telemetry.
  var CAUSAL_CONCLUSION_RE = /\b(because|therefore|since|thus|hence)\b/i;
  function wordCount(s) {
    if (!s || typeof s !== 'string') return 0;
    return s.trim().split(/\s+/).filter(Boolean).length;
  }
  function enforceQuestionFormat(obj, depth, telemetry) {
    if (!telemetry) telemetry = { rejected: 0, fixedKeys: [] };
    if (depth === undefined) depth = 0;
    if (depth > 6 || obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map(function (x) { return enforceQuestionFormat(x, depth + 1, telemetry); });
    }
    var out = {};
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (/question/i.test(k) && Array.isArray(v)) {
        var cleaned = v.filter(function (item) {
          if (typeof item !== 'string') return true;        // nested objects pass through
          var trimmed = item.trim();
          if (!trimmed.endsWith('?')) { telemetry.rejected += 1; telemetry.fixedKeys.push(k); return false; }
          if (wordCount(trimmed) > 25) { telemetry.rejected += 1; telemetry.fixedKeys.push(k); return false; }
          if (CAUSAL_CONCLUSION_RE.test(trimmed)) { telemetry.rejected += 1; telemetry.fixedKeys.push(k); return false; }
          return true;
        });
        out[k] = cleaned;
      } else {
        out[k] = enforceQuestionFormat(v, depth + 1, telemetry);
      }
    });
    return out;
  }

  function newTraceId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    } catch (_) {}
    return 'rh-' + Math.floor((window.performance && performance.now ? performance.now() : Date.now()) * 1000).toString(36);
  }

  // ───────────────────────────────────────────────────────────────────────
  // SuggestionBadge — every AI-rendered surface MUST be wrapped with this
  // primitive so students consistently read AI output as a suggestion to
  // weigh, not a verdict to accept. Mirrors the SEL-Hub evidence-tier badge
  // pattern Aaron softened polyvagal with.
  // ───────────────────────────────────────────────────────────────────────
  function SuggestionBadge(props) {
    var label = props.label || 'AI suggestion — not a verdict';
    return (
      <div
        role="note"
        aria-label={label}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '4px 10px', borderRadius: '999px',
          fontSize: '10px', fontWeight: 800,
          background: '#fef3c7', color: '#92400e',
          border: '1px solid #fbbf24',
          textTransform: 'uppercase', letterSpacing: '0.4px',
        }}
      >
        <span aria-hidden="true">{'\u{1F4A1}'}</span>
        <span>{label}</span>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // ExemplarPair — replaces checklist rubrics. The pedagogical-integrity
  // reviewer flagged that visible checklists teach checklist-satisfaction
  // (exactly the worksheet failure mode the project memo warns against).
  // This primitive instead shows two exemplars side by side, asks the
  // student to identify which is stronger and write 1-2 sentences on why,
  // then prompts them to compare their own work to both. Used in every lane
  // wherever a rubric criterion needs to be taught rather than checked.
  // ───────────────────────────────────────────────────────────────────────
  function ExemplarPair(props) {
    var t = props.t || function (k) { return k; };
    var criterion = props.criterion || '';
    var strongExample = props.strongExample || '';
    var weakExample = props.weakExample || '';
    var onJudgment = props.onJudgment;          // ({choice, reasoning}) => void
    var initialChoice = props.initialChoice || null;
    var initialReasoning = props.initialReasoning || '';
    var _c = useState(initialChoice);
    var choice = _c[0]; var setChoice = _c[1];
    var _r = useState(initialReasoning);
    var reasoning = _r[0]; var setReasoning = _r[1];
    var canSubmit = !!choice && reasoning.trim().length >= 8;

    var pickStyle = function (which) {
      var selected = choice === which;
      return {
        flex: 1, padding: '12px 14px', borderRadius: '12px',
        border: selected ? '2px solid #7c3aed' : '1px solid #e2e8f0',
        background: selected ? '#f5f3ff' : '#ffffff',
        cursor: 'pointer', textAlign: 'left',
        fontFamily: 'inherit', fontSize: '12px', color: '#1e293b', lineHeight: 1.55,
      };
    };
    return (
      <div style={{
        padding: '14px', borderRadius: '14px',
        border: '1px solid #cbd5e1', background: '#f8fafc',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
            <span aria-hidden="true">{'\u{2696}\u{FE0F} '}</span>
            {t('research_hub.exemplar_pair_prompt') || 'Which of these is stronger work, and why?'}
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>{criterion}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" onClick={function () { setChoice('A'); }} aria-pressed={choice === 'A'} style={pickStyle('A')}>
            <strong style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#7c3aed' }}>Example A</strong>
            {strongExample}
          </button>
          <button type="button" onClick={function () { setChoice('B'); }} aria-pressed={choice === 'B'} style={pickStyle('B')}>
            <strong style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#7c3aed' }}>Example B</strong>
            {weakExample}
          </button>
        </div>
        <textarea
          value={reasoning}
          onChange={function (e) { setReasoning(e.target.value); }}
          rows={2}
          maxLength={400}
          placeholder={t('research_hub.exemplar_pair_reasoning_placeholder') || 'In 1–2 sentences: which is stronger, and what makes it stronger?'}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '8px 10px', borderRadius: '10px',
            border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: '12px',
            resize: 'vertical', minHeight: '50px',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={function () {
              if (!canSubmit) return;
              if (typeof onJudgment === 'function') {
                try { onJudgment({ choice: choice, reasoning: reasoning.trim() }); } catch (_) {}
              }
            }}
            style={{
              padding: '8px 14px', borderRadius: '999px',
              background: canSubmit ? '#7c3aed' : '#cbd5e1',
              color: '#fff', border: 'none',
              fontWeight: 800, fontSize: '12px',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {t('research_hub.exemplar_pair_record') || 'Record my judgment'}
          </button>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // VoiceNoteBlock — 60-second inline recording, base64 stored locally.
  // Mirrors annotation_suite VoiceNoteBubble approach without depending on
  // it directly (each lane needs a voice-note affordance at multiple stages
  // for UDL reasons, and a shared primitive avoids drift).
  // ───────────────────────────────────────────────────────────────────────
  function VoiceNoteBlock(props) {
    var t = props.t || function (k) { return k; };
    var initialBase64 = props.initialBase64 || null;
    var initialDuration = props.initialDuration || 0;
    var onChange = props.onChange;              // ({audioBase64, durationS}) => void
    var label = props.label || (t('research_hub.voice_note') || 'Voice note');

    var _rec = useState(false); var isRecording = _rec[0]; var setIsRecording = _rec[1];
    var _b64 = useState(initialBase64); var audioBase64 = _b64[0]; var setAudioBase64 = _b64[1];
    var _dur = useState(initialDuration); var durationS = _dur[0]; var setDurationS = _dur[1];
    var _elapsed = useState(0); var elapsed = _elapsed[0]; var setElapsed = _elapsed[1];
    var _err = useState(null); var err = _err[0]; var setErr = _err[1];

    var recorderRef = useRef(null);
    var chunksRef = useRef([]);
    var streamRef = useRef(null);
    var startRef = useRef(0);
    var tickRef = useRef(null);
    var stoppedRef = useRef(false);

    var hardStop = function () {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        try { recorderRef.current.stop(); } catch (_) {}
      }
      if (streamRef.current) {
        try { streamRef.current.getTracks().forEach(function (tr) { try { tr.stop(); } catch (_) {} }); } catch (_) {}
        streamRef.current = null;
      }
    };

    useEffect(function () { return function () { hardStop(); }; }, []);

    var startRec = async function () {
      setErr(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
          setErr(t('research_hub.voice_note_unsupported') || 'Voice notes are not supported in this browser.');
          return;
        }
        var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        var mr = new MediaRecorder(stream);
        recorderRef.current = mr;
        chunksRef.current = [];
        stoppedRef.current = false;
        mr.ondataavailable = function (e) { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
        mr.onstop = function () {
          if (stoppedRef.current) return;
          stoppedRef.current = true;
          try {
            var blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
            var reader = new FileReader();
            reader.onloadend = function () {
              var b64 = String(reader.result || '');
              setAudioBase64(b64);
              var finalDur = Math.min(VOICE_NOTE_MAX_SECONDS, Math.round((Date.now() - startRef.current) / 1000));
              setDurationS(finalDur);
              if (typeof onChange === 'function') {
                try { onChange({ audioBase64: b64, durationS: finalDur }); } catch (_) {}
              }
            };
            reader.readAsDataURL(blob);
          } catch (_) { /* base64 conversion failed; surface nothing destructive */ }
          if (streamRef.current) {
            try { streamRef.current.getTracks().forEach(function (tr) { try { tr.stop(); } catch (_) {} }); } catch (_) {}
            streamRef.current = null;
          }
          if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
        };
        startRef.current = Date.now();
        setElapsed(0);
        mr.start();
        setIsRecording(true);
        tickRef.current = setInterval(function () {
          var sec = Math.round((Date.now() - startRef.current) / 1000);
          setElapsed(sec);
          if (sec >= VOICE_NOTE_MAX_SECONDS) {
            if (mr.state === 'recording') { try { mr.stop(); } catch (_) {} }
            setIsRecording(false);
          }
        }, 250);
      } catch (e) {
        setErr(t('research_hub.voice_note_mic_denied') || 'Microphone permission was denied.');
        setIsRecording(false);
      }
    };

    var stopRec = function () {
      setIsRecording(false);
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        try { recorderRef.current.stop(); } catch (_) {}
      }
    };

    var clearRec = function () {
      setAudioBase64(null);
      setDurationS(0);
      setElapsed(0);
      if (typeof onChange === 'function') {
        try { onChange({ audioBase64: null, durationS: 0 }); } catch (_) {}
      }
    };

    return (
      <div
        role="group"
        aria-label={label}
        style={{
          padding: '10px 12px', borderRadius: '12px',
          border: '1px solid #e2e8f0', background: '#fafafa',
          display: 'flex', flexDirection: 'column', gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
            <span aria-hidden="true">{'\u{1F3A4} '}</span>{label}
          </span>
          <span style={{ fontSize: '10px', color: '#64748b' }}>
            {isRecording
              ? ((t('research_hub.voice_note_recording') || 'Recording') + ' ' + elapsed + 's / ' + VOICE_NOTE_MAX_SECONDS + 's')
              : (durationS > 0 ? (durationS + 's saved') : (t('research_hub.voice_note_idle') || 'Up to 60s — local only'))}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {!isRecording && (
            <button
              type="button"
              onClick={startRec}
              aria-label={t('research_hub.voice_note_start_aria') || 'Start recording a voice note'}
              style={{
                padding: '6px 12px', borderRadius: '999px',
                background: '#dc2626', color: '#fff', border: 'none',
                fontWeight: 800, fontSize: '11px', cursor: 'pointer',
              }}
            >
              {audioBase64 ? (t('research_hub.voice_note_rerecord') || 'Re-record') : (t('research_hub.voice_note_start') || 'Record')}
            </button>
          )}
          {isRecording && (
            <button
              type="button"
              onClick={stopRec}
              aria-label={t('research_hub.voice_note_stop_aria') || 'Stop recording'}
              style={{
                padding: '6px 12px', borderRadius: '999px',
                background: '#1f2937', color: '#fff', border: 'none',
                fontWeight: 800, fontSize: '11px', cursor: 'pointer',
              }}
            >
              {t('research_hub.voice_note_stop') || 'Stop'}
            </button>
          )}
          {audioBase64 && !isRecording && (
            <React.Fragment>
              <audio controls src={audioBase64} style={{ height: '32px' }} />
              <button
                type="button"
                onClick={clearRec}
                style={{
                  padding: '6px 12px', borderRadius: '999px',
                  background: '#fff', color: '#64748b',
                  border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                {t('research_hub.voice_note_clear') || 'Clear'}
              </button>
            </React.Fragment>
          )}
        </div>
        {err && (
          <p style={{ margin: 0, fontSize: '11px', color: '#b91c1c' }}>{err}</p>
        )}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // CostMeter — visible 8/session counter. Appears once usage is non-zero so
  // it doesn't loom on first entry. At 0 remaining, lanes are expected to
  // route AI buttons to a "use the static help pane" affordance.
  // ───────────────────────────────────────────────────────────────────────
  function CostMeter(props) {
    var t = props.t || function (k) { return k; };
    var used = props.used || 0;
    var cap = props.cap || MAX_AI_CALLS_PER_SESSION;
    if (used === 0) return null;
    var remaining = Math.max(0, cap - used);
    var color = remaining === 0 ? '#b91c1c' : (remaining <= 2 ? '#d97706' : '#475569');
    return (
      <span
        role="status"
        aria-live="polite"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '4px 10px', borderRadius: '999px',
          fontSize: '11px', fontWeight: 700,
          background: '#f8fafc', color: color,
          border: '1px solid #e2e8f0',
        }}
      >
        <span aria-hidden="true">{'\u{1F4DD}'}</span>
        {remaining > 0
          ? ((t('research_hub.ai_calls_remaining_prefix') || '') + remaining + ' / ' + cap + ' ' + (t('research_hub.ai_calls_remaining_suffix') || 'AI questions left this session'))
          : (t('research_hub.ai_calls_exhausted') || 'AI question quota used. Static help still available.')}
      </span>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // DevLevelSelector — early-elementary through AP. Lane plugins read the
  // active value to tier prompt complexity and rubric copy. Defaults to 6-8
  // because most existing AlloFlow language sits at that band.
  // ───────────────────────────────────────────────────────────────────────
  function DevLevelSelector(props) {
    var t = props.t || function (k) { return k; };
    var value = props.value || '6_8';
    var onChange = props.onChange;
    return (
      <label
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 12px', borderRadius: '999px',
          background: '#f8fafc', border: '1px solid #cbd5e1',
          fontSize: '11px', fontWeight: 700, color: '#1e293b',
          cursor: 'pointer',
        }}
      >
        <span aria-hidden="true">{'\u{1F393}'}</span>
        <span>{t('research_hub.dev_level_label') || 'Reading level'}</span>
        <select
          value={value}
          onChange={function (e) { if (typeof onChange === 'function') onChange(e.target.value); }}
          aria-label={t('research_hub.dev_level_aria') || 'Select developmental level for prompts and rubrics'}
          style={{
            background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px',
            padding: '3px 6px', fontSize: '11px', fontFamily: 'inherit',
            color: '#1e293b', cursor: 'pointer',
          }}
        >
          {DEV_LEVELS.map(function (lvl) {
            return (
              <option key={lvl.key} value={lvl.key}>{lvl.label}</option>
            );
          })}
        </select>
      </label>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // askResearchCoach — the central AI wrapper used by every lane touchpoint.
  // Lanes pass a `touchpoint` config that names the gateRequires check, the
  // prompt builder, and (optionally) the post-validate hook. The wrapper
  // owns the cap counter, backend routing, abort timeout, schema scrub, and
  // suggestion-watermark. Returns a Promise resolving to:
  //   { ok, blocked, blockedReason, data, raw, meta }
  // ───────────────────────────────────────────────────────────────────────
  function makeAskResearchCoach(deps, journal, setJournal) {
    var ai = deps.ai;
    var onCallGemini = deps.onCallGemini;
    var addToast = deps.addToast;
    var nowMs = function () { return Date.now(); };

    // Tier-2: per-touchpoint sub-budgets cap each individual touchpoint so a
    // single touchpoint can't burn the whole 8/session budget on retries.
    // Reviewer 1 recommended this exact split.
    var PER_TOUCHPOINT_CAP = {
      wonder_sorter: 2,
      model_surfacer: 3,
      steelman_second_pass: 2,
      honest_uncertainty: 2,
      // Tier-3 Engineering Design lane (Constraint Forge). Sum = 8 hits the
      // global session cap exactly, forcing students to choose where to spend
      // AI critique. tradeoff_inverter is held for V2 — observe baseline.
      constraint_excavator: 2,
      dominated_solution_finder: 2,
      failure_mode_critic: 2,
      stakeholder_translator: 2,
      // Tier-4 Humanities & Social Research lane (Inquiry Studio). Sum = 8
      // (1+2+1+3+0+1). Flat-map design honors the lane-rotation intent under
      // the global 8/session cap: each lane only renders its own touchpoint
      // buttons, and the global cap binds across lanes naturally. The
      // no_ai_stage_sentinel is the structural Stage-5 NO-AI guard — cap 0
      // means any call attempt blocks as rate_limit_touchpoint, logged in
      // aiHistory for educator-dashboard transparency.
      contestability_probe: 1,
      source_lateral_probe: 2,
      counter_framing_voicer: 1,
      warrant_questioner: 3,           // folds 3 former touchpoints via sub-trigger branching
      no_ai_stage_sentinel: 0,         // intentional zero — Stage 5 NO-AI structural guard
      standpoint_mirror: 1,
    };
    // Tier-2: cooldown burst lock. 6+ gate failures in 5 minutes blocks the
    // AI button for 2 minutes — kills brute-force fuzzing.
    var BURST_WINDOW_MS = 5 * 60 * 1000;
    var BURST_THRESHOLD = 6;
    var BURST_LOCKOUT_MS = 2 * 60 * 1000;

    function appendAiHistory(prevJournal, entry) {
      var capped = (prevJournal.aiHistory || []).concat([entry]);
      if (capped.length > 60) capped = capped.slice(-60);
      return capped;
    }

    return async function askResearchCoach(touchpoint, ctx, signal) {
      var traceId = newTraceId();
      var t0 = nowMs();

      // Backend gate
      var aiText = (ai && typeof ai.generateText === 'function') ? ai.generateText.bind(ai) : null;
      if (!aiText && typeof onCallGemini !== 'function') {
        return { ok: false, blocked: true, blockedReason: 'no_compatible_backend', traceId: traceId, latencyMs: 0 };
      }

      // Total cost cap
      if ((journal.aiCallCount || 0) >= MAX_AI_CALLS_PER_SESSION) {
        return { ok: false, blocked: true, blockedReason: 'rate_limit_session', detail: "You've used all your AI questions for this session. Reload to reset, or keep working on your own.", traceId: traceId, latencyMs: 0 };
      }

      // Per-touchpoint sub-budget — prevents one touchpoint from being abused
      var tpId = touchpoint && touchpoint.id;
      if (tpId && PER_TOUCHPOINT_CAP[tpId]) {
        var usedForTp = (journal.aiHistory || []).filter(function (h) {
          return h.touchpoint === tpId && !h.blocked;
        }).length;
        if (usedForTp >= PER_TOUCHPOINT_CAP[tpId]) {
          return { ok: false, blocked: true, blockedReason: 'rate_limit_touchpoint',
                   detail: "You've used your AI helps for this step. Loop back to gather more, or move forward on your own.",
                   traceId: traceId, latencyMs: 0 };
        }
      }

      // Burst lock — 6+ gate failures in last 5 minutes inside lockout window
      var recentBlocks = (journal.aiHistory || []).filter(function (h) {
        return h.blocked && (nowMs() - (h.ts || 0)) < BURST_WINDOW_MS;
      });
      if (recentBlocks.length >= BURST_THRESHOLD) {
        var newestBlockTs = recentBlocks[recentBlocks.length - 1].ts || 0;
        if ((nowMs() - newestBlockTs) < BURST_LOCKOUT_MS) {
          return { ok: false, blocked: true, blockedReason: 'rate_limit_burst',
                   detail: "Take a breath. The AI isn't going anywhere. Try looping back to an earlier stage.",
                   traceId: traceId, latencyMs: 0 };
        }
      }

      // Student-first gate — runs against the journal we're ACTUALLY about to
      // send. UI button-disabled is a hint; this is the source of truth.
      // Records bypass_signals + gate_reason to aiHistory so teachers can see
      // patterns without it being punitive.
      if (touchpoint && typeof touchpoint.gateCheck === 'function') {
        var gate = { ok: true };
        try { gate = touchpoint.gateCheck(journal, ctx) || { ok: true }; } catch (_) { gate = { ok: true }; }
        if (gate && gate.ok === false) {
          setJournal(function (prev) {
            return Object.assign({}, prev, {
              aiHistory: appendAiHistory(prev, {
                ts: Date.now(), touchpoint: tpId, blocked: true,
                gate_reason: gate.reason || 'student_authored_required',
                bypass_signals: gate.bypass_signals || [],
                traceId: traceId,
              }),
            });
          });
          return { ok: false, blocked: true, blockedReason: 'student_authored_required',
                   detail: gate.reason || 'Write your own attempt first before asking AI.',
                   bypass_signals: gate.bypass_signals || [],
                   retryAfterMs: gate.retryAfterMs || 0,
                   traceId: traceId, latencyMs: 0 };
        }
      }

      // Build prompt
      var prompt = null;
      try { prompt = (touchpoint && typeof touchpoint.buildPrompt === 'function') ? touchpoint.buildPrompt(journal, ctx) : null; } catch (_) {}
      if (!prompt || typeof prompt !== 'string') {
        return { ok: false, blocked: true, blockedReason: 'no_prompt', traceId: traceId, latencyMs: 0 };
      }
      if (prompt.length > INPUT_HARD_CAP * 6) prompt = prompt.slice(0, INPUT_HARD_CAP * 6);

      // Network gate
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return { ok: false, blocked: true, blockedReason: 'network', traceId: traceId, latencyMs: 0 };
      }

      // Abort timeout
      var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timeoutId = controller ? setTimeout(function () { try { controller.abort(); } catch (_) {} }, 12000) : null;
      var combined = controller ? controller.signal : signal;
      if (signal && controller && typeof signal.addEventListener === 'function') {
        try { signal.addEventListener('abort', function () { try { controller.abort(); } catch (_) {} }); } catch (_) {}
      }

      // Increment BEFORE the call so a double-Send race can't double-spend.
      setJournal(function (prev) {
        var next = Object.assign({}, prev);
        next.aiCallCount = (prev.aiCallCount || 0) + 1;
        return next;
      });

      var rawText = '';
      var errorKind = null;
      try {
        if (aiText) {
          var res = await aiText(prompt, { json: true, temperature: 0.7, signal: combined });
          rawText = (typeof res === 'string') ? res : (res && (res.text || res.output_text)) || '';
        } else {
          var legacy = await onCallGemini(prompt, true, false, null, null, combined, false);
          rawText = (typeof legacy === 'string') ? legacy : (legacy && legacy.text) || '';
        }
      } catch (err) {
        var msg = (err && err.message) || String(err || '');
        if (/abort/i.test(msg) || (signal && signal.aborted)) errorKind = 'aborted';
        else if (/quota|RESOURCE_EXHAUSTED|429/i.test(msg)) errorKind = 'rate_limit_upstream';
        else if (/safety|SAFETY|blockReason/i.test(msg)) errorKind = 'safety_blocked';
        else if (/Failed to fetch|NetworkError|ECONN/i.test(msg)) errorKind = 'network';
        else errorKind = 'network';
        // Refund the counter on errors that don't burn tokens.
        if (errorKind === 'network' || errorKind === 'aborted' || errorKind === 'rate_limit_upstream') {
          setJournal(function (prev) {
            var next = Object.assign({}, prev);
            next.aiCallCount = Math.max(0, (prev.aiCallCount || 1) - 1);
            return next;
          });
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

      var latencyMs = nowMs() - t0;
      if (errorKind) {
        var copy = errorKind === 'aborted' ? '' :
                   errorKind === 'rate_limit_upstream' ? "AlloBot is taking a quick breather. Try again in a minute." :
                   errorKind === 'safety_blocked' ? "I can't respond to that. Want to try rephrasing?" :
                   "Couldn't reach the AI service. Check your connection and try again.";
        return { ok: false, blocked: true, blockedReason: errorKind, detail: copy, traceId: traceId, latencyMs: latencyMs };
      }

      // Parse + strip pedagogical footguns + optional touchpoint validator.
      var parsed = safeJsonParse(rawText);
      if (!parsed) {
        return {
          ok: true, blocked: false,
          data: { __aiSuggestion: true, traceId: traceId, parseFailed: true, answer: String(rawText || '').slice(0, ANSWER_HARD_CAP) },
          raw: rawText, latencyMs: latencyMs, traceId: traceId,
        };
      }
      var stripped = stripPedagogicalFootguns(parsed);
      // Tier-2: enforce question-format across all string[] fields whose key
      // contains "question". Counts rejected entries for telemetry.
      var qTelemetry = { rejected: 0, fixedKeys: [] };
      stripped = enforceQuestionFormat(stripped, 0, qTelemetry);
      // Truncate any string field deeper than ANSWER_HARD_CAP.
      function truncStrings(o, depth) {
        if (o === null || typeof o !== 'object' || depth > 6) return o;
        if (Array.isArray(o)) return o.map(function (x) { return truncStrings(x, depth + 1); });
        var out = {};
        Object.keys(o).forEach(function (k) {
          var v = o[k];
          if (typeof v === 'string' && v.length > ANSWER_HARD_CAP) v = v.slice(0, ANSWER_HARD_CAP) + '…';
          else if (typeof v === 'object') v = truncStrings(v, depth + 1);
          out[k] = v;
        });
        return out;
      }
      stripped = truncStrings(stripped, 0);

      // Touchpoint-specific validator (optional) — last guard for chip key
      // allowlists, etc. May return { __rejected: true, rejectReason, attemptedShapeKeys }
      // to signal a validator failure that refunds the call.
      var validatorReject = null;
      if (touchpoint && typeof touchpoint.validate === 'function') {
        try {
          var validated = touchpoint.validate(stripped, journal, ctx);
          if (validated && validated.__rejected) {
            validatorReject = validated;
          } else if (validated) {
            stripped = validated;
          }
        } catch (_) {}
      }
      if (validatorReject) {
        // Refund the counter — the call burned tokens, but pedagogically we
        // refund so the student isn't penalized for an AI output that broke
        // our schema rules. Telemetry persists for tuning.
        setJournal(function (prev) {
          var next = Object.assign({}, prev);
          next.aiCallCount = Math.max(0, (prev.aiCallCount || 1) - 1);
          next.aiHistory = appendAiHistory(prev, {
            ts: Date.now(), touchpoint: tpId, blocked: true,
            rejectReason: validatorReject.rejectReason || 'validator_rejected',
            attemptedShapeKeys: validatorReject.attemptedShapeKeys || [],
            traceId: traceId,
          });
          return next;
        });
        return { ok: false, blocked: true, blockedReason: 'validator_rejected',
                 detail: validatorReject.rejectReason || 'AI response did not meet the lane rules. Try again.',
                 traceId: traceId, latencyMs: latencyMs };
      }

      // Watermark + persist to journal aiHistory
      stripped.__aiSuggestion = true;
      stripped.__traceId = traceId;

      setJournal(function (prev) {
        return Object.assign({}, prev, {
          aiHistory: appendAiHistory(prev, {
            ts: Date.now(), touchpoint: tpId,
            in: prompt.slice(0, 400),
            summary: typeof stripped.answer === 'string' ? stripped.answer.slice(0, 200) : '',
            qFormatRejected: qTelemetry.rejected,
            blocked: false, traceId: traceId,
          }),
        });
      });

      return { ok: true, blocked: false, data: stripped, raw: rawText, latencyMs: latencyMs, traceId: traceId, qFormatRejected: qTelemetry.rejected };
    };
  }

  // ───────────────────────────────────────────────────────────────────────
  // Tier-1 placeholder lane workspace. Renders when the user clicks a lane
  // tile whose plugin hasn't loaded yet (i.e., all three lanes in Tier 1).
  // Communicates what's coming + offers a "back to lane selector" exit.
  // ───────────────────────────────────────────────────────────────────────
  function PlaceholderLaneView(props) {
    var t = props.t || function (k) { return k; };
    var lane = props.lane;
    var onBack = props.onBack;
    return (
      <div style={{
        padding: '20px', borderRadius: '16px',
        background: '#ffffff', border: '1px dashed #cbd5e1',
        display: 'flex', flexDirection: 'column', gap: '14px',
      }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            alignSelf: 'flex-start',
            padding: '6px 12px', borderRadius: '999px',
            background: '#f1f5f9', color: '#475569', border: 'none',
            fontSize: '11px', fontWeight: 700, cursor: 'pointer',
          }}
        >
          {'\u{2190} '}{t('research_hub.back_to_lanes') || 'Choose a different lane'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span aria-hidden="true" style={{ fontSize: '40px' }}>{lane.icon}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#1e293b' }}>
              {lane.label}
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>{lane.tagline}</p>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.55 }}>
          {lane.blurb}
        </p>
        <div style={{
          padding: '12px 14px', borderRadius: '12px',
          background: '#fef3c7', border: '1px solid #fbbf24',
          fontSize: '12px', color: '#92400e', lineHeight: 1.5,
        }}>
          <strong>
            <span aria-hidden="true">{'\u{1F527} '}</span>
            {t('research_hub.lane_under_construction_title') || 'This lane is shipping next.'}
          </strong>
          <p style={{ margin: '4px 0 0' }}>
            {t('research_hub.lane_under_construction_body') ||
              'The Hub shell, AI guardrails, voice notes, and inquiry journal are live now. The lane workspace lands in the next update.'}
          </p>
        </div>
        <details style={{ fontSize: '11px', color: '#475569' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
            {t('research_hub.lane_preview_summary') || 'Preview the loop'}
          </summary>
          <p style={{ marginTop: '6px', lineHeight: 1.55 }}>
            {t('research_hub.lane_preview_body_' + lane.id) ||
              'When this lane lands you will move through its stages in any order, with explicit "loop back" affordances so revising is the point — not a setback.'}
          </p>
        </details>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Main hub component
  // ───────────────────────────────────────────────────────────────────────
  function ResearchHub(props) {
    var t = (typeof props.t === 'function') ? props.t : function (k) { return k; };
    var isOpen = props.isOpen !== false;
    var onClose = props.onClose;
    var studentCodename = props.studentCodename || '';
    var addToast = props.addToast || function () {};

    var _journal = useState(loadJournal);
    var journal = _journal[0]; var setJournal = _journal[1];

    // Persist on every change (debounced via a microtask so rapid setState
    // batches collapse to one write).
    var saveScheduledRef = useRef(false);
    useEffect(function () {
      if (saveScheduledRef.current) return;
      saveScheduledRef.current = true;
      var id = setTimeout(function () {
        saveScheduledRef.current = false;
        saveJournal(journal);
      }, 60);
      return function () { clearTimeout(id); };
    }, [journal]);

    var ask = useMemo(function () {
      return makeAskResearchCoach({
        ai: props.ai,
        onCallGemini: props.onCallGemini,
        addToast: addToast,
      }, journal, setJournal);
      // We intentionally rebuild whenever journal changes so the gate check
      // sees fresh state; deps capture the in-flight closure.
    }, [journal, props.ai, props.onCallGemini]);

    var lanes = resolveLanes();
    var activeLane = journal.activeLane ? lanes.filter(function (L) { return L.id === journal.activeLane; })[0] : null;

    var setActiveLane = useCallback(function (laneId) {
      setJournal(function (prev) {
        var next = Object.assign({}, prev);
        next.activeLane = laneId;
        next.activeStage = null;
        return next;
      });
    }, []);

    var setDevLevel = useCallback(function (lvl) {
      setJournal(function (prev) {
        var next = Object.assign({}, prev);
        next.devLevel = lvl;
        return next;
      });
    }, []);

    var setQuestionTitle = useCallback(function (txt) {
      setJournal(function (prev) {
        var next = Object.assign({}, prev);
        next.questionTitle = String(txt || '').slice(0, 240);
        return next;
      });
    }, []);

    var clearJournal = useCallback(function () {
      var ok = window.confirm(t('research_hub.confirm_reset') || 'Reset this inquiry? Voice notes, model snapshots, and AI history will be cleared. This cannot be undone.');
      if (!ok) return;
      var fresh = emptyJournal();
      // Preserve dev level — most likely the same student.
      fresh.devLevel = journal.devLevel;
      setJournal(fresh);
    }, [journal]);

    if (!isOpen) return null;

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('research_hub.modal_aria') || 'Investigation and Research Hub'}
        data-help-key="research_hub"
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'stretch', justifyContent: 'center',
          padding: '4vh 16px',
          overflowY: 'auto',
        }}
        onClick={function (e) { if (e.target === e.currentTarget && typeof onClose === 'function') onClose(); }}
      >
        <div
          onClick={function (e) { e.stopPropagation(); }}
          style={{
            background: '#ffffff', borderRadius: '20px',
            width: '100%', maxWidth: '900px',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            maxHeight: '92vh',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px 22px',
            background: 'linear-gradient(135deg, #4338ca 0%, #7c3aed 100%)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '12px', flexWrap: 'wrap',
            borderRadius: '20px 20px 0 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span aria-hidden="true" style={{ fontSize: '28px' }}>{'\u{1F50D}'}</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                  {t('research_hub.modal_title') || 'Investigation & Research Hub'}
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '11px', opacity: 0.85 }}>
                  {studentCodename
                    ? (t('research_hub.modal_subtitle_with_codename') || 'Inquiry journal for ') + studentCodename
                    : (t('research_hub.modal_subtitle') || 'Loop, model, source, and argue your way through a question worth asking.')}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <CostMeter t={t} used={journal.aiCallCount || 0} cap={MAX_AI_CALLS_PER_SESSION} />
              <DevLevelSelector t={t} value={journal.devLevel} onChange={setDevLevel} />
              <button
                type="button"
                onClick={function () { if (typeof onClose === 'function') onClose(); }}
                aria-label={t('common.close') || 'Close'}
                style={{
                  background: 'rgba(255,255,255,0.18)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px', padding: '6px 12px',
                  cursor: 'pointer', fontSize: '14px', fontWeight: 700,
                }}
              >{'✕'}</button>
            </div>
          </div>

          {/* Body */}
          <div style={{
            padding: '20px 22px',
            display: 'flex', flexDirection: 'column', gap: '14px',
            overflowY: 'auto', flex: 1,
          }}>
            {/* Inquiry-framing input — shared across all three lanes */}
            <div style={{
              padding: '12px 14px', borderRadius: '12px',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <label
                htmlFor="research-hub-question-title"
                style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b' }}
              >
                <span aria-hidden="true">{'\u{2728} '}</span>
                {t('research_hub.question_label') || 'What are you investigating?'}
              </label>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
                {t('research_hub.question_help') ||
                  'A few words in your own voice. You can change this any time as your question evolves — loops are first-class here.'}
              </p>
              <textarea
                id="research-hub-question-title"
                data-help-key="research_hub_question"
                value={journal.questionTitle}
                onChange={function (e) { setQuestionTitle(e.target.value); }}
                placeholder={t('research_hub.question_placeholder') ||
                  'e.g., "Why do the fish in fisherlab cluster at dawn?" or "How should our town respond to noise complaints?"'}
                rows={2}
                maxLength={240}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '8px 10px', borderRadius: '10px',
                  border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: '13px',
                  resize: 'vertical', minHeight: '50px',
                }}
              />
            </div>

            {/* Suggestion-badge primitive demo banner — shows the convention
                students will see throughout every lane. */}
            <div style={{
              padding: '10px 12px', borderRadius: '12px',
              background: '#fffbeb', border: '1px solid #fcd34d',
              display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
            }}>
              <SuggestionBadge t={t} />
              <p style={{ margin: 0, fontSize: '11px', color: '#78350f', lineHeight: 1.5, flex: 1, minWidth: '200px' }}>
                {t('research_hub.ai_convention_banner') ||
                  'AlloBot helps by asking questions and surfacing alternatives. It will not write your model, your hypothesis, your argument, or your trade-off decisions for you. You author your work; AlloBot critiques.'}
              </p>
            </div>

            {/* Lane selector OR active-lane workspace */}
            {!activeLane ? (
              <React.Fragment>
                <h3 style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>
                  {t('research_hub.lane_selector_title') || 'Pick a lane to start (or switch any time)'}
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.55 }}>
                  {t('research_hub.lane_selector_help') ||
                    'These three lanes share one inquiry journal. Evidence cards, voice notes, and your model history carry across — so a question that starts as scientific inquiry can finish as a humanities op-ed without losing the work.'}
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '12px',
                }}>
                  {lanes.map(function (L) {
                    return (
                      <button
                        key={L.id}
                        type="button"
                        data-help-key={'research_hub_lane_' + L.id}
                        onClick={function () { setActiveLane(L.id); }}
                        style={{
                          padding: '16px', borderRadius: '14px',
                          border: '1px solid #cbd5e1', background: '#ffffff',
                          textAlign: 'left', cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', gap: '8px',
                          transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={function (e) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                        onMouseLeave={function (e) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span aria-hidden="true" style={{ fontSize: '32px' }}>{L.icon}</span>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>{L.label}</h4>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>{L.tagline}</p>
                          </div>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>{L.blurb}</p>
                        {L._placeholder && (
                          <span style={{
                            alignSelf: 'flex-start',
                            padding: '3px 8px', borderRadius: '999px',
                            fontSize: '10px', fontWeight: 800,
                            background: '#fef3c7', color: '#92400e',
                            border: '1px solid #fbbf24',
                            textTransform: 'uppercase', letterSpacing: '0.4px',
                          }}>
                            {t('research_hub.lane_coming_soon') || 'Lane shipping soon'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </React.Fragment>
            ) : activeLane._placeholder ? (
              <PlaceholderLaneView t={t} lane={activeLane} onBack={function () { setActiveLane(null); }} />
            ) : (
              <ActiveLaneView
                t={t}
                lane={activeLane}
                journal={journal}
                setJournal={setJournal}
                ask={ask}
                onBack={function () { setActiveLane(null); }}
                deps={props}
              />
            )}

            {/* Tier-1 shared substrate teasers: voice-note primitive demo and
                inquiry journal stats so students can SEE the substrate is
                tracking their thinking even before the lanes ship. */}
            <details style={{
              padding: '12px 14px', borderRadius: '12px',
              border: '1px solid #e2e8f0', background: '#f8fafc',
            }}>
              <summary style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 800, color: '#1e293b' }}>
                <span aria-hidden="true">{'\u{1F3A4} '}</span>
                {t('research_hub.scratch_voice_summary') || 'Open a voice scratchpad'}
              </summary>
              <p style={{ margin: '8px 0', fontSize: '11px', color: '#64748b', lineHeight: 1.55 }}>
                {t('research_hub.scratch_voice_help') ||
                  'Talk through your thinking. Voice notes live in your inquiry journal and survive across stages and lanes.'}
              </p>
              <VoiceNoteBlock
                t={t}
                initialBase64={journal.stageNotes && journal.stageNotes.scratch && journal.stageNotes.scratch.audioBase64}
                initialDuration={journal.stageNotes && journal.stageNotes.scratch && journal.stageNotes.scratch.durationS || 0}
                onChange={function (v) {
                  setJournal(function (prev) {
                    var next = Object.assign({}, prev);
                    next.stageNotes = Object.assign({}, prev.stageNotes || {});
                    next.stageNotes.scratch = { text: '', audioBase64: v.audioBase64, durationS: v.durationS, ts: Date.now() };
                    return next;
                  });
                }}
                label={t('research_hub.scratch_voice_label') || 'Scratchpad voice note'}
              />
            </details>

            <details style={{
              padding: '12px 14px', borderRadius: '12px',
              border: '1px solid #e2e8f0', background: '#f8fafc',
            }}>
              <summary style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 800, color: '#1e293b' }}>
                <span aria-hidden="true">{'\u{1F4D3} '}</span>
                {t('research_hub.journal_state_summary') || 'Inquiry journal state'}
              </summary>
              <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '11px', color: '#475569', lineHeight: 1.7 }}>
                <li>{(t('research_hub.journal_dev_level') || 'Reading level') + ': ' + (DEV_LEVELS.filter(function (l) { return l.key === journal.devLevel; })[0] || { long: journal.devLevel }).long}</li>
                <li>{(t('research_hub.journal_active_lane') || 'Active lane') + ': ' + (activeLane ? activeLane.label : (t('research_hub.journal_no_lane') || 'none yet'))}</li>
                <li>{(t('research_hub.journal_evidence_count') || 'Evidence cards') + ': ' + (journal.evidenceCards || []).length}</li>
                <li>{(t('research_hub.journal_model_versions') || 'Model snapshots') + ': ' + (journal.modelSnapshots || []).length}</li>
                <li>{(t('research_hub.journal_sources') || 'Sources logged') + ': ' + (journal.sources || []).length}</li>
                <li>{(t('research_hub.journal_ai_calls') || 'AI questions this session') + ': ' + (journal.aiCallCount || 0) + ' / ' + MAX_AI_CALLS_PER_SESSION}</li>
              </ul>
              <button
                type="button"
                onClick={clearJournal}
                style={{
                  marginTop: '10px',
                  padding: '4px 10px', borderRadius: '999px',
                  background: '#fff', border: '1px solid #fca5a5',
                  color: '#b91c1c', fontWeight: 700, fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                {t('research_hub.journal_reset') || 'Reset this inquiry'}
              </button>
            </details>
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 22px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '8px', flexWrap: 'wrap',
            fontSize: '11px', color: '#64748b',
          }}>
            <span>
              {t('research_hub.footer_persistence_note') ||
                'Your inquiry journal is saved on this device. Switching codenames mid-investigation will show prior work — clear the inquiry above to start fresh.'}
            </span>
            <span style={{ fontStyle: 'italic' }}>
              {t('research_hub.footer_tier_note') || 'Hub shell v1 — lane workspaces shipping next.'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // ActiveLaneView — thin shim that delegates to the lane plugin's
  // renderStage. Tier 2+ lane plugins implement renderStage(ctx).
  // ───────────────────────────────────────────────────────────────────────
  function ActiveLaneView(props) {
    var t = props.t;
    var lane = props.lane;
    var journal = props.journal;
    var setJournal = props.setJournal;
    var ask = props.ask;
    var onBack = props.onBack;
    var deps = props.deps || {};

    var ctx = {
      t: t,
      lane: lane,
      journal: journal,
      setJournal: setJournal,
      ask: ask,
      addToast: deps.addToast,
      primitives: {
        SuggestionBadge: SuggestionBadge,
        ExemplarPair: ExemplarPair,
        VoiceNoteBlock: VoiceNoteBlock,
        CostMeter: CostMeter,
      },
      constants: {
        MAX_AI_CALLS_PER_SESSION: MAX_AI_CALLS_PER_SESSION,
        ANSWER_HARD_CAP: ANSWER_HARD_CAP,
        VOICE_NOTE_MAX_SECONDS: VOICE_NOTE_MAX_SECONDS,
      },
      onExitLane: onBack,
    };

    if (lane && typeof lane.render === 'function') {
      try { return lane.render(ctx); }
      catch (e) {
        console.error('[ResearchHub] Lane render error in', lane.id, e);
        return (
          <div style={{
            padding: '14px', borderRadius: '12px',
            background: '#fef2f2', border: '1px solid #fca5a5',
            color: '#7f1d1d', fontSize: '12px',
          }}>
            {(t('research_hub.lane_render_error') || 'The selected lane failed to render. Going back to the lane selector.')}
            <button type="button" onClick={onBack} style={{ marginLeft: '8px', textDecoration: 'underline', background: 'transparent', border: 'none', color: '#7f1d1d', cursor: 'pointer' }}>
              {t('research_hub.back_to_lanes') || 'Choose a different lane'}
            </button>
          </div>
        );
      }
    }
    return <PlaceholderLaneView t={t} lane={lane} onBack={onBack} />;
  }

  // ───────────────────────────────────────────────────────────────────────
  // Register and expose
  // ───────────────────────────────────────────────────────────────────────
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ResearchHub = ResearchHub;
  window.AlloModules.ResearchHub.__tier = 4;
  // Stash primitives on the registry so lane plugins (Tiers 2-4) can import
  // them without re-implementing.
  if (window.ResearchHub) {
    window.ResearchHub.primitives = {
      SuggestionBadge: SuggestionBadge,
      ExemplarPair: ExemplarPair,
      VoiceNoteBlock: VoiceNoteBlock,
      CostMeter: CostMeter,
      DevLevelSelector: DevLevelSelector,
    };
    window.ResearchHub.constants = {
      STORAGE_KEY: STORAGE_KEY,
      MAX_AI_CALLS_PER_SESSION: MAX_AI_CALLS_PER_SESSION,
      VOICE_NOTE_MAX_SECONDS: VOICE_NOTE_MAX_SECONDS,
      DEV_LEVELS: DEV_LEVELS,
    };
    // Tier-2: shared gate helpers + token-similarity utility for lane plugins.
    window.ResearchHub.helpers = {
      isPlausibleProse: isPlausibleProse,
      normalizeForCompare: normalizeForCompare,
      tokenJaccard: tokenJaccard,
      MECHANISM_VERBS: MECHANISM_VERBS,
      PERSPECTIVE_MARKERS_RE: PERSPECTIVE_MARKERS_RE,
      SHARED_STOP_WORDS: SHARED_STOP_WORDS,
    };
  }

  console.log('[CDN] ResearchHub loaded (Tier 4)');
})();
