(function initResearchLaneEngineering(retriesLeft) {
  "use strict";
  window.AlloModules = window.AlloModules || {};
  if (!window.AlloModules.ResearchLaneEngineering) window.AlloModules.ResearchLaneEngineering = { __pending: true };
  if (window.ResearchHub && window.ResearchHub._lanes && window.ResearchHub._lanes.engineering && window.ResearchHub._lanes.engineering.__tier >= 2) {
    console.log("[CDN] ResearchLaneEngineering already registered, skipping");
    return;
  }
  if (!window.ResearchHub || typeof window.ResearchHub.registerLane !== "function") {
    if (retriesLeft === void 0) retriesLeft = 50;
    if (retriesLeft <= 0) {
      console.error("[ResearchLaneEngineering] window.ResearchHub never became available \u2014 giving up");
      return;
    }
    console.warn("[ResearchLaneEngineering] window.ResearchHub not yet available \u2014 deferring");
    setTimeout(function() {
      initResearchLaneEngineering(retriesLeft - 1);
    }, 200);
    return;
  }
  var React = window.React;
  if (!React) {
    console.error("[ResearchLaneEngineering] React not found");
    return;
  }
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useMemo = React.useMemo;
  var useRef = React.useRef;
  var useCallback = React.useCallback;
  var useFocusTrap = window.__alloHooks && window.__alloHooks.useFocusTrap || function() {
  };
  function announce(msg, priority) {
    try {
      if (typeof window !== "undefined" && window.alloAnnounce) window.alloAnnounce(msg, priority || "polite");
    } catch (_) {
    }
  }
  var H = window.ResearchHub.helpers || {};
  var isPlausibleProse = H.isPlausibleProse || function() {
    return { ok: true };
  };
  var normalizeForCompare = H.normalizeForCompare || function(s) {
    return (s || "").toLowerCase();
  };
  var tokenJaccard = H.tokenJaccard || function() {
    return 0;
  };
  var SHARED_STOP_WORDS = H.SHARED_STOP_WORDS || /* @__PURE__ */ new Set();
  var STAGES = [
    {
      key: "define_problem",
      label: "Define the Problem",
      icon: "\u{1F3AF}",
      shortLabel: "Define",
      color: "#b45309",
      loopBackTargets: []
    },
    {
      key: "develop_candidates",
      label: "Develop Candidates",
      icon: "\u{1F4A1}",
      shortLabel: "Develop",
      color: "#c2410c",
      loopBackTargets: ["define_problem"]
    },
    {
      key: "plan_test",
      label: "Plan the Test",
      icon: "\u{1F5FA}\uFE0F",
      shortLabel: "Plan",
      color: "#92400e",
      loopBackTargets: ["define_problem", "develop_candidates"]
    },
    {
      key: "build_test",
      label: "Build & Test",
      icon: "\u{1F528}",
      shortLabel: "Build",
      color: "#7c2d12",
      loopBackTargets: ["define_problem", "develop_candidates", "plan_test"]
    },
    {
      key: "optimize",
      label: "Optimize (Iterate)",
      icon: "\u2699\uFE0F",
      shortLabel: "Optimize",
      color: "#a16207",
      loopBackTargets: ["define_problem", "develop_candidates", "plan_test", "build_test"]
    },
    {
      key: "communicate",
      label: "Communicate the Design",
      icon: "\u{1F4E3}",
      shortLabel: "Share",
      color: "#9a3412",
      loopBackTargets: ["define_problem", "develop_candidates", "plan_test", "build_test", "optimize"]
    }
  ];
  var STAGE_KEYS = STAGES.map(function(s) {
    return s.key;
  });
  var STAGE_BY_KEY = {};
  STAGES.forEach(function(s) {
    STAGE_BY_KEY[s.key] = s;
  });
  var LOOPBACK_CHIPS = [
    { id: "constraint_missed", label: "I missed a constraint", icon: "\u{1F4CF}" },
    { id: "stakeholder_voice_changed", label: "What I heard from my stakeholder changed", icon: "\u{1F4AC}" },
    { id: "failure_insight", label: "A failure taught me something", icon: "\u{1F4A1}" },
    { id: "criterion_shifted", label: "A criterion needs re-weighting", icon: "\u2696\uFE0F" },
    { id: "candidate_reconsidered", label: "I want to re-look at a candidate I killed", icon: "\u{1F501}" },
    { id: "stakeholder_reframe", label: "Take this back to my stakeholder", icon: "\u{1F465}" },
    { id: "constraint_relaxation_post_test", label: "Relax a hard constraint after a test (justified)", icon: "\u{1F513}" },
    { id: "other", label: "Other (I will explain)", icon: "\u{1F4AC}" }
  ];
  var STAKEHOLDER_DENYLIST = /* @__PURE__ */ new Set([
    "me",
    "us",
    "i",
    "myself",
    "students",
    "student",
    "my class",
    "our class",
    "the class",
    "the teacher",
    "teacher",
    "people",
    "kids",
    "everyone",
    "anyone",
    "someone",
    "others",
    "they",
    "them"
  ]);
  var WHITELIST_UNIT_LIST = ["g", "kg", "mg", "lb", "oz", "m", "cm", "mm", "km", "in", "ft", "yd", "$", "\xA2", "s", "sec", "min", "h", "hr", "N", "kN", "%", "\xB0", "\xB0C", "\xB0F", "J", "W", "Hz", "V", "A", "\u03A9", "L", "ml", "gal", "mph", "kph"];
  function isWhitelistedUnit(u) {
    if (!u || typeof u !== "string") return false;
    var raw = u.trim();
    if (raw.length === 0 || raw.length > 24) return false;
    if (WHITELIST_UNIT_LIST.indexOf(raw) !== -1) return true;
    if (/^[A-Za-z$%°Ωµ][A-Za-z0-9$%°Ωµ\^\.\-]{0,8}\s*\/\s*[A-Za-z][A-Za-z0-9\^\.\-]{0,8}$/.test(raw)) return true;
    if (/^[A-Za-z$%°Ωµ][A-Za-z0-9$%°Ωµ\^\.\-]{0,12}$/.test(raw) && raw.length <= 6) return true;
    return false;
  }
  var SANE_RANGE = {
    budget: { max: 1e3, note: "Household-scale budgets usually fit under $1000." },
    time: { max: 7200, note: "Most school-day tests fit under 7200 seconds (2 hours)." },
    safety: { max: null, note: "" },
    // no fixed bound — safety targets vary
    material: { max: 1e4, note: "Mass / length in this unit usually fits under 10000." },
    code: { max: null, note: "" },
    access: { max: null, note: "" },
    stakeholder: { max: null, note: "" },
    other: { max: null, note: "" }
  };
  var MATERIAL_TIERS = [
    { key: "low_fidelity", label: "Low-fidelity (cardboard / tape / household)", tagline: "Default \u2014 fast iteration, real measurement." },
    { key: "high_fidelity", label: "High-fidelity (kits / 3D print / lab tools)", tagline: "Opt-in \u2014 only when low-fi cannot test the criterion." }
  ];
  var EXEMPLAR_PAIRS = {
    define_problem: {
      criterion: 'A strong problem definition names a real person whose constraints matter, with measurable criteria that have units and thresholds \u2014 not "must be good".',
      strongExample: "Problem: Ms. Patel (school cafeteria manager, interviewed Wed) needs a way to keep 60 lunches warm from 11:00am pickup to 12:30pm classroom serve, using \u2264$5 of household materials, with no electrical heating allowed in the classroom. Criterion (maximize): final serve temperature \u226555\xB0C (Ms. Patel's food-safety floor). Criterion (minimize): cost \u2264$5. Hard constraint: total mass \u22642kg per cart (her arms).",
      weakExample: "Problem: people get cold lunches. Make a lunch warmer that is good and not too expensive."
    },
    develop_candidates: {
      criterion: "A strong candidate set has at least 3 genuinely different concepts, each declaring what it PUNTS \u2014 no candidate claims to satisfy every constraint, because that is engineering self-deception.",
      strongExample: "Candidate A 'foil-wrapped insulated tote' (satisfies: cost, mass; PUNTS: temp-hold beyond 60min). Candidate B 'preheated ceramic stone in cooler' (satisfies: temp-hold, cost; PUNTS: mass \u2014 stone is 1.5kg alone). Candidate C 'sodium-acetate hot pack pouch' (satisfies: temp-hold, mass; PUNTS: cost \u2014 hot packs are ~$2 each).",
      weakExample: "Candidate A 'really good lunch box'. Candidate B 'better lunch box'. Candidate C 'best lunch box'. All three satisfy every constraint perfectly."
    },
    plan_test: {
      criterion: "A strong test protocol names HOW to measure each criterion, with a numeric pass threshold, AND names what was sacrificed to gain something else \u2014 naming both the gained and sacrificed axis.",
      strongExample: "Trade-off: I picked Candidate B (ceramic stone) gaining longer temperature-hold but sacrificing mass \u2014 Ms. Patel said warm lunches outweigh arm strain because she has a cart. Whose interest this serves: the kids who eat at 12:30pm, not Ms. Patel's arms. Test protocol \u2014 Temp criterion: insert digital thermometer probe in center container; measure at t=0, 30, 60, 90 min; pass = \u226555\xB0C at 90min. Mass criterion: scale the loaded cart; pass = \u22642kg total.",
      weakExample: "Trade-off: B is better. Test: see if it works."
    },
    build_test: {
      criterion: "Strong build/test logging captures what you actually built, what you measured, and what failed \u2014 failure is the most important data here, not an embarrassment.",
      strongExample: "Build v1: ceramic dinner plate (preheated 220\xB0C oven 10min), wrapped foil, in soft-side cooler. Mass: 1.8kg loaded. Temp at t=0: 58\xB0C; t=30: 56\xB0C; t=60: 53\xB0C; t=90: 50\xB0C. FAILED temp criterion at t=90 (50 < 55). Stakeholder feedback (Ms. Patel via Wed text): 'cooler is too floppy \u2014 cart tips'.",
      weakExample: "Built it. It works fine. Temp was good. Stakeholder said it was nice."
    },
    optimize: {
      criterion: "A strong optimize loop changes ONE variable, predicts the effect, RE-TESTS with a measurement that actually moved, and honestly reconciles prediction with reality.",
      strongExample: "Failure mode: temp dropped 8\xB0C over 90min. Cause hypothesis: thermal bridge through ceramic plate base. Changed variable: added 4mm cork sheet between plate and cooler floor (fromValue=0mm, toValue=4mm; only this one change). Predicted effect: t=90 temp \u226554\xB0C. Re-test (build v2): t=90 = 53\xB0C. Prediction vs reality: PARTIALLY \u2014 moved 3\xB0C in the right direction but still failed by 2\xB0C; next loop should test thicker cork or seal the cooler lid better.",
      weakExample: "Made it better. Now it works."
    },
    communicate: {
      criterion: "A strong design rationale triple-anchors: it cites a specific criterion, a specific measured test result, AND what the stakeholder would still ask. It does not overclaim.",
      strongExample: "For Ms. Patel's cafeteria-to-classroom warming need: Final design (v3) holds 56\xB0C at 90min (above her 55\xB0C floor) using preheated ceramic + cork insulation + foil wrap, at $3.40 in household materials, 1.95kg loaded. Trade-off: gained temperature-hold by sacrificing mass \u2014 closer to her 2kg ceiling than the foil-tote candidate. What Ms. Patel would still ask: does this hold up to 5 days/week of preheating cycles? The prototype was tested 3 times \u2014 wear under daily use is untested.",
      weakExample: "Our design works really well and the stakeholder will love it. It meets all the criteria."
    }
  };
  var LOOP_REWARDING_EXEMPLARS = [
    {
      criterion: "A strong engineering session shows failure-and-retest loops with measured deltas \u2014 not a clean walk from Define to Communicate.",
      strongExample: "Session log: v1 (cooler + foil) \u2192 failed temp at t=90 \u2192 loop to Optimize \u2192 v2 (added cork) \u2192 failed by 2\xB0C \u2192 loop to Develop \u2192 swapped to ceramic-stone candidate \u2192 v3 passes. 3 failure-loops, 3 build versions, prediction-vs-reality reconciled each time, candidate revisited.",
      weakExample: "Session log: walked Define \u2192 Develop \u2192 Plan \u2192 Build \u2192 Optimize \u2192 Communicate in 25 minutes. v1 met all criteria first try. All claims = meets_criteria. Zero loop-backs."
    },
    {
      criterion: "A strong rationale names a trade-off the student would NOT have seen at Define \u2014 engineering surfaces what only iteration reveals.",
      strongExample: "Initial trade-off (at Define): cost vs durability. After-iteration trade-off (in rationale): cost vs RESET TIME \u2014 the ceramic stone needs 10min preheat each morning, which Ms. Patel's prep schedule can't always afford. We never would have surfaced this without v2 retest.",
      weakExample: "Trade-off: cost vs quality. We picked quality. The design is great."
    }
  ];
  function devFloors(devLevel) {
    switch (devLevel) {
      case "k2":
        return {
          problem: 30,
          rationale: 60,
          candidates: 2,
          stakeholderJust: 30,
          tradeOffDecl: 50,
          procedure: 20,
          mode: 18,
          cause: 22,
          predicted: 18,
          accountability: 80,
          designClaimText: 18
        };
      case "3_5":
        return {
          problem: 45,
          rationale: 100,
          candidates: 3,
          stakeholderJust: 35,
          tradeOffDecl: 65,
          procedure: 25,
          mode: 22,
          cause: 26,
          predicted: 22,
          accountability: 100,
          designClaimText: 20
        };
      case "ap":
        return {
          problem: 80,
          rationale: 200,
          candidates: 3,
          stakeholderJust: 50,
          tradeOffDecl: 100,
          procedure: 35,
          mode: 30,
          cause: 35,
          predicted: 30,
          accountability: 140,
          designClaimText: 28
        };
      default:
        return {
          problem: 60,
          rationale: 160,
          candidates: 3,
          stakeholderJust: 40,
          tradeOffDecl: 80,
          procedure: 30,
          mode: 25,
          cause: 30,
          predicted: 25,
          accountability: 120,
          designClaimText: 25
        };
    }
  }
  function normName(s) {
    return normalizeForCompare(s || "").replace(/\s+/g, " ").trim();
  }
  function exemplarOk(journal, stageKey) {
    var sn = (journal.stageNotes || {})[stageKey] || {};
    return !!(sn.exemplarViewed || sn.exemplarDismissed);
  }
  function hardConstraints(journal) {
    return (journal.constraintMatrix || []).filter(function(c) {
      return c && c.tier === "hard" && Number.isFinite(c.target) && isWhitelistedUnit(c.unit);
    });
  }
  function withinSaneRange(source, target) {
    var r = SANE_RANGE[source];
    if (!r || r.max == null) return true;
    return Math.abs(target) <= r.max;
  }
  function constraintExcavatorGate(journal) {
    var sp = journal.stakeholderProfile;
    var floors = devFloors(journal.devLevel || "6_8");
    if (!sp || !sp.name || !sp.name.trim()) {
      return {
        ok: false,
        reason: "Name your stakeholder first (the specific person whose constraints you are honoring).",
        bypass_signals: ["stakeholder_missing"]
      };
    }
    if (STAKEHOLDER_DENYLIST.has(normName(sp.name))) {
      return {
        ok: false,
        reason: 'Pick a more specific stakeholder than "' + sp.name + '". A real named person whose constraints you can actually find out.',
        bypass_signals: ["stakeholder_generic"]
      };
    }
    var justCheck = isPlausibleProse(sp.whyThisStakeholderJustification || "", floors.stakeholderJust, { minTokens: 6 });
    if (!justCheck.ok) {
      return {
        ok: false,
        reason: "Tell us why THIS stakeholder, why now (\u2265" + floors.stakeholderJust + " chars of real prose).",
        bypass_signals: ["stakeholder_just_" + justCheck.reason]
      };
    }
    if (!sp.epistemicStatus) {
      return {
        ok: false,
        reason: "Mark whether your stakeholder was invented, observed, interviewed, or set by a curriculum prompt.",
        bypass_signals: ["epistemic_unset"]
      };
    }
    var problemTextSrc = ((journal.stageNotes || {}).define_problem || {}).problemText || "";
    var problemCheck = isPlausibleProse(problemTextSrc, floors.problem, { minTokens: 8 });
    if (!problemCheck.ok) {
      return {
        ok: false,
        reason: "Write a problem statement with at least " + floors.problem + " chars of real prose.",
        bypass_signals: ["problem_" + problemCheck.reason]
      };
    }
    var crits = journal.criteria || [];
    if (crits.length < 2) {
      return {
        ok: false,
        reason: "Add at least 2 measurable criteria (each with a unit and a target direction).",
        bypass_signals: ["too_few_criteria"]
      };
    }
    var hard = hardConstraints(journal);
    if (hard.length < 2) {
      return {
        ok: false,
        reason: "Add at least 2 hard constraints with numeric targets AND valid units.",
        bypass_signals: ["too_few_hard_constraints"]
      };
    }
    var safetyCrits = crits.filter(function(c) {
      return c.kind === "physical-safety";
    });
    var safetyAck = (((journal.stageNotes || {}).define_problem || {}).safetyExemptionJustification || "").trim();
    if (safetyCrits.length === 0 && safetyAck.length < 60) {
      return {
        ok: false,
        reason: "Either add a physical-safety criterion OR justify why no safety constraints apply here (\u226560 chars).",
        bypass_signals: ["safety_unsurfaced"]
      };
    }
    if (!exemplarOk(journal, "define_problem")) {
      return {
        ok: false,
        reason: "Look at the example pair for this step first \u2014 AI is the last scaffold, not the first.",
        bypass_signals: ["exemplar_not_viewed"]
      };
    }
    return { ok: true };
  }
  function dominatedSolutionFinderGate(journal) {
    var floors = devFloors(journal.devLevel || "6_8");
    var concepts = journal.candidateConcepts || [];
    if (concepts.length < floors.candidates) {
      return {
        ok: false,
        reason: "You need at least " + floors.candidates + " candidate concepts before AI can help find dominated ones.",
        bypass_signals: ["too_few_candidates"]
      };
    }
    for (var i = 0; i < concepts.length; i++) {
      var c = concepts[i];
      if (!Array.isArray(c.constraintsPunted) || c.constraintsPunted.length < 1) {
        return {
          ok: false,
          reason: 'Candidate "' + (c.name || "#" + (i + 1)) + '" claims to satisfy every constraint. Pick at least one to PUNT \u2014 engineering means giving something up.',
          bypass_signals: ["candidate_no_punt"]
        };
      }
      var sketchCheck = isPlausibleProse(c.sketchText || c.name || "", 15, { minTokens: 3 });
      var hasSketchAsset = c.sketchDataUrl || c.audioBase64 && c.durationS >= 5;
      if (!sketchCheck.ok && !hasSketchAsset) {
        return {
          ok: false,
          reason: 'Candidate "' + (c.name || "#" + (i + 1)) + '" needs a real sketch (text, drawing, or 5s+ voice).',
          bypass_signals: ["candidate_sketch_thin"]
        };
      }
      if (!Array.isArray(c.materialsList) || c.materialsList.length === 0) {
        return {
          ok: false,
          reason: 'Candidate "' + (c.name || "#" + (i + 1)) + '" needs a materials list.',
          bypass_signals: ["candidate_no_materials"]
        };
      }
    }
    for (var a = 0; a < concepts.length; a++) {
      for (var b = a + 1; b < concepts.length; b++) {
        var sim = tokenJaccard(concepts[a].sketchText || concepts[a].name || "", concepts[b].sketchText || concepts[b].name || "");
        if (sim > 0.6) {
          return {
            ok: false,
            reason: 'Candidates "' + (concepts[a].name || a + 1) + '" and "' + (concepts[b].name || b + 1) + '" read like the same idea \u2014 make them more genuinely different.',
            bypass_signals: ["candidate_near_duplicate"]
          };
        }
        var satA = new Set([].concat(concepts[a].constraintsSatisfied || [], concepts[a].constraintsPunted || []));
        var satB = new Set([].concat(concepts[b].constraintsSatisfied || [], concepts[b].constraintsPunted || []));
        var union = new Set([].concat(Array.from(satA), Array.from(satB)));
        var inter = 0;
        satA.forEach(function(x) {
          if (satB.has(x)) inter++;
        });
        var distance = union.size - inter;
        if (distance < 1) {
          return {
            ok: false,
            reason: 'Candidates "' + (concepts[a].name || a + 1) + '" and "' + (concepts[b].name || b + 1) + '" make identical satisfy/punt choices \u2014 at least one constraint should differ.',
            bypass_signals: ["candidate_identical_punts"]
          };
        }
        var matsA = (concepts[a].materialsList || []).map(function(m) {
          return normName(m);
        }).sort();
        var matsB = (concepts[b].materialsList || []).map(function(m) {
          return normName(m);
        }).sort();
        if (matsA.join("|") === matsB.join("|")) {
          return {
            ok: false,
            reason: 'Candidates "' + (concepts[a].name || a + 1) + '" and "' + (concepts[b].name || b + 1) + '" use identical materials \u2014 at least one should differ.',
            bypass_signals: ["candidate_identical_materials"]
          };
        }
      }
    }
    var crits = journal.criteria || [];
    var matrix = journal.decisionMatrix || [];
    for (var ci = 0; ci < concepts.length; ci++) {
      for (var ki = 0; ki < crits.length; ki++) {
        var cell = matrix.filter(function(m) {
          return m.candidateId === concepts[ci].id && m.criterionId === crits[ki].id;
        })[0];
        if (!cell || typeof cell.score !== "number" || cell.score < 1 || cell.score > 5) {
          return {
            ok: false,
            reason: "Fill in the decision matrix \u2014 every candidate needs a score (1-5) for every criterion.",
            bypass_signals: ["matrix_incomplete"]
          };
        }
        var rt = isPlausibleProse(cell.reasonText || "", 12, { minTokens: 2 });
        if (!rt.ok) {
          return {
            ok: false,
            reason: "Every decision-matrix cell needs \u226512 chars of reasoning, not just a score.",
            bypass_signals: ["matrix_reasonText_" + rt.reason]
          };
        }
      }
    }
    for (var cii = 0; cii < concepts.length; cii++) {
      var cellsForCand = matrix.filter(function(m) {
        return m.candidateId === concepts[cii].id;
      });
      for (var p = 0; p < cellsForCand.length; p++) {
        for (var q = p + 1; q < cellsForCand.length; q++) {
          if (tokenJaccard(cellsForCand[p].reasonText, cellsForCand[q].reasonText) > 0.7) {
            return {
              ok: false,
              reason: "Your reasons for the same candidate across different criteria are too similar \u2014 each criterion needs its own reasoning.",
              bypass_signals: ["within_candidate_reason_repeat"]
            };
          }
        }
      }
    }
    if (((journal.stageNotes || {}).plan_test || {}).selectedCandidateId) {
      return {
        ok: false,
        reason: "You've already selected a candidate. The dominance-finder is for the divergence phase \u2014 loop back and de-select first.",
        bypass_signals: ["winner_already_picked"]
      };
    }
    if (!exemplarOk(journal, "develop_candidates")) {
      return {
        ok: false,
        reason: "Look at the example pair for this step first.",
        bypass_signals: ["exemplar_not_viewed"]
      };
    }
    return { ok: true };
  }
  function failureModeCriticGate(journal) {
    var floors = devFloors(journal.devLevel || "6_8");
    var fl = journal.failureLog || [];
    if (fl.length === 0) {
      return {
        ok: false,
        reason: "Author a failure-log entry first (mode + cause + changed variable + predicted effect) before AI can help.",
        bypass_signals: ["no_failure_log"]
      };
    }
    var latest = fl[fl.length - 1];
    if (!latest.fromTestRunId) {
      return {
        ok: false,
        reason: "Link this failure-log entry to a specific failed testRun first.",
        bypass_signals: ["no_failed_testrun_link"]
      };
    }
    var sourceTest = (journal.testRun || []).filter(function(tr) {
      return tr.id === latest.fromTestRunId;
    })[0];
    if (!sourceTest || sourceTest.passed !== false) {
      return {
        ok: false,
        reason: "The failure-log must link to a test that actually FAILED (passed=false).",
        bypass_signals: ["linked_testrun_passed"]
      };
    }
    var modeC = isPlausibleProse(latest.modeText || "", floors.mode, { minTokens: 4 });
    if (!modeC.ok) {
      return {
        ok: false,
        reason: "Name the failure mode in \u2265" + floors.mode + " chars of real prose.",
        bypass_signals: ["mode_" + modeC.reason]
      };
    }
    var causeC = isPlausibleProse(latest.causeHypothesisText || "", floors.cause, { minTokens: 5 });
    if (!causeC.ok) {
      return {
        ok: false,
        reason: "Write a cause hypothesis in \u2265" + floors.cause + " chars of real prose.",
        bypass_signals: ["cause_" + causeC.reason]
      };
    }
    var protoText = ((journal.testProtocol || []).filter(function(p) {
      return p.criterionId === sourceTest.criterionId;
    })[0] || {}).procedureText || "";
    if (protoText && tokenJaccard(latest.causeHypothesisText, protoText) > 0.5) {
      return {
        ok: false,
        reason: "Your cause hypothesis reads like a restatement of what the test measures. A cause names a MECHANISM \u2014 what physical thing went wrong, not what you measured.",
        bypass_signals: ["cause_restates_test"]
      };
    }
    var cv = latest.changedVariable || {};
    if (!cv.name || cv.fromValue === void 0 || cv.toValue === void 0 || cv.fromValue === cv.toValue) {
      return {
        ok: false,
        reason: "Name the changed variable and its from-value and to-value (they must differ).",
        bypass_signals: ["no_changed_variable"]
      };
    }
    var predC = isPlausibleProse(latest.predictedEffectText || "", floors.predicted, { minTokens: 4 });
    if (!predC.ok) {
      return {
        ok: false,
        reason: "Predict the effect of your change in \u2265" + floors.predicted + " chars.",
        bypass_signals: ["predicted_" + predC.reason]
      };
    }
    if (latest.retestRunId) {
      return {
        ok: false,
        reason: "You've already run the retest \u2014 AI critique on failure modes belongs BEFORE the retest, so it cannot anchor your interpretation.",
        bypass_signals: ["retest_already_run"]
      };
    }
    if (!exemplarOk(journal, "optimize")) {
      return {
        ok: false,
        reason: "Look at the example pair for this step first.",
        bypass_signals: ["exemplar_not_viewed"]
      };
    }
    return { ok: true };
  }
  function hasUnmetSafety(journal) {
    var cons = journal.constraintMatrix || [];
    var crits = journal.criteria || [];
    var runs = journal.testRun || [];
    return cons.some(function(c) {
      return c.source === "safety" && c.measured != null && c.passed === false;
    }) || crits.some(function(c) {
      if (c.kind !== "physical-safety") return false;
      var matched = runs.filter(function(r) {
        return r.criterionId === c.id;
      });
      return matched.length > 0 && matched.every(function(r) {
        return r.passed === false;
      });
    });
  }
  function stakeholderTranslatorGate(journal) {
    var floors = devFloors(journal.devLevel || "6_8");
    var rs = (journal.stageNotes || {}).communicate || {};
    var rationale = (rs.designRationale || "").trim();
    var accountability = (rs.stakeholderAccountabilityStatement || "").trim();
    var rationaleCheck = isPlausibleProse(rationale, floors.rationale, { minTokens: 12 });
    if (!rationaleCheck.ok) {
      return {
        ok: false,
        reason: "Author a design rationale of \u2265" + floors.rationale + " chars first.",
        bypass_signals: ["rationale_" + rationaleCheck.reason]
      };
    }
    var accCheck = isPlausibleProse(accountability, floors.accountability, { minTokens: 12 });
    if (!accCheck.ok) {
      return {
        ok: false,
        reason: "Author the stakeholder accountability statement (\u2265" + floors.accountability + " chars: what would they STILL ask, and what would you do next?).",
        bypass_signals: ["accountability_" + accCheck.reason]
      };
    }
    var claims = journal.designClaims || [];
    if (claims.length < 2) {
      return {
        ok: false,
        reason: "Author at least 2 design claims, each with a label.",
        bypass_signals: ["too_few_design_claims"]
      };
    }
    for (var i = 0; i < claims.length; i++) {
      var c = claims[i];
      var ct = isPlausibleProse(c.text || "", floors.designClaimText, { minTokens: 4 });
      if (!ct.ok) {
        return {
          ok: false,
          reason: "Design claim " + (i + 1) + " needs \u2265" + floors.designClaimText + " chars of real prose.",
          bypass_signals: ["designClaim_" + i + "_" + ct.reason]
        };
      }
      if (!c.label) {
        return {
          ok: false,
          reason: "Label every design claim (meets_criteria / partial / not_yet).",
          bypass_signals: ["designClaim_" + i + "_unlabeled"]
        };
      }
    }
    if (hasUnmetSafety(journal)) {
      for (var s = 0; s < claims.length; s++) {
        if (claims[s].label === "meets_criteria") {
          return {
            ok: false,
            reason: 'A physical-safety criterion is unmet, so no design claim can be labeled "meets criteria." Relabel claim ' + (s + 1) + ' as "partial" or "not yet."',
            bypass_signals: ["safety_override_meets_label"]
          };
        }
      }
    }
    var builds = journal.buildLog || [];
    if (builds.length < 2) {
      return {
        ok: false,
        reason: "You need at least 2 build versions (real iteration) before the stakeholder-translator helps.",
        bypass_signals: ["no_iteration"]
      };
    }
    if (!exemplarOk(journal, "communicate")) {
      return {
        ok: false,
        reason: "Look at the example pair for this step first.",
        bypass_signals: ["exemplar_not_viewed"]
      };
    }
    return { ok: true };
  }
  function constraintExcavatorPrompt(journal) {
    var devLevel = journal.devLevel || "6_8";
    var sp = journal.stakeholderProfile || {};
    var crits = (journal.criteria || []).map(function(c, i) {
      return i + 1 + '. "' + c.name + '" \u2014 ' + c.direction + " " + c.target + " " + c.unit + " (kind: " + c.kind + ", weight " + c.weight + ")";
    }).join("\n");
    var cons = hardConstraints(journal).map(function(c, i) {
      return i + 1 + '. "' + c.criterion + '" \u2014 ' + c.target + " " + c.unit + " (source: " + c.source + ", tier: " + c.tier + ")";
    }).join("\n");
    var problemText = ((journal.stageNotes || {}).define_problem || {}).problemText || "";
    return [
      "SYSTEM: You are an engineering-design coach helping a " + devLevel + " student SURFACE constraints they may have missed.",
      "You MUST NOT propose constraints. You MUST NOT rewrite the problem. You MUST NOT name the stakeholder. You MUST NOT propose numeric targets or units.",
      "You only ask QUESTIONS that probe missing dimensions, missing stakeholder voice, measurability of stated thresholds, and whether thresholds are actually binding.",
      'Every question ends with "?", is \u226425 words, and avoids causal markers (because/therefore/since/thus/hence).',
      "",
      "USER:",
      "devLevel: " + devLevel,
      "stakeholder: " + (sp.name || "") + " (accessNote: " + (sp.accessNote || "?") + ", epistemicStatus: " + (sp.epistemicStatus || "?") + ")",
      "problem statement: " + problemText,
      "criteria:\n" + crits,
      "hard constraints:\n" + cons,
      "",
      'Return ONLY JSON: { "missing_dimension_questions": string[], "stakeholder_voice_questions": string[], "measurability_probe_questions": string[], "binding_threshold_questions": string[] }'
    ].join("\n");
  }
  function dominatedSolutionFinderPrompt(journal) {
    var devLevel = journal.devLevel || "6_8";
    var concepts = (journal.candidateConcepts || []).map(function(c) {
      return "- id=" + c.id + ' name="' + (c.name || "") + '" sketch="' + (c.sketchText || "").slice(0, 120) + '" satisfies=' + JSON.stringify(c.constraintsSatisfied || []) + " punts=" + JSON.stringify(c.constraintsPunted || []) + " materials=" + JSON.stringify(c.materialsList || []) + ' riskiestAssumption="' + (c.riskiestAssumption || "").slice(0, 120) + '"';
    }).join("\n");
    var crits = (journal.criteria || []).map(function(c) {
      return "- id=" + c.id + ' name="' + c.name + '" unit=' + c.unit + " direction=" + c.direction + " weight=" + c.weight;
    }).join("\n");
    var matrix = (journal.decisionMatrix || []).map(function(m) {
      return "- candidate=" + m.candidateId + " criterion=" + m.criterionId + " score=" + m.score + ' reason="' + (m.reasonText || "").slice(0, 80) + '"';
    }).join("\n");
    return [
      "SYSTEM: You are an engineering-design coach helping a " + devLevel + " student examine their candidate set for Pareto dominance and theory-of-change distinctness.",
      'You MUST NOT pick a winner. You MUST NOT propose a new candidate. You MUST NOT rescore cells. You MUST NOT name "most promising" or "strongest" or "best fit".',
      "You may identify a dominated_candidate_id ONLY by verbatim-echoing an existing candidate id from the journal \u2014 never invent one.",
      'Every question ends with "?", \u226425 words, no causal markers.',
      "",
      "USER:",
      "devLevel: " + devLevel,
      "candidates:\n" + concepts,
      "criteria:\n" + crits,
      "decisionMatrix:\n" + matrix,
      "",
      'Return ONLY JSON: { "pareto_probe_questions": string[], "dominated_candidate_id": string, "why_might_be_dominated_questions": string[], "tradeoff_axis_questions": string[], "theory_of_change_questions": string[], "convergence_risk_questions": string[] }'
    ].join("\n");
  }
  function failureModeCriticPrompt(journal) {
    var devLevel = journal.devLevel || "6_8";
    var fl = journal.failureLog || [];
    var latest = fl[fl.length - 1] || {};
    var sourceTest = (journal.testRun || []).filter(function(tr) {
      return tr.id === latest.fromTestRunId;
    })[0] || {};
    var crit = (journal.criteria || []).filter(function(c) {
      return c.id === sourceTest.criterionId;
    })[0] || {};
    var sp = journal.stakeholderProfile || {};
    return [
      "SYSTEM: You are an engineering-design coach reviewing a student-authored failure analysis BEFORE the retest is run.",
      "You MUST NOT propose the fix. You MUST NOT tell the student which variable to change. You MUST NOT predict retest outcome. You MUST NOT use imperative verbs (try/use/add/change/replace).",
      "Quoted phrases must be verbatim substrings of the student modeText or causeHypothesisText.",
      'Every question ends with "?", \u226425 words, no causal markers.',
      "",
      "USER:",
      "devLevel: " + devLevel,
      'failure mode (verbatim): "' + (latest.modeText || "") + '"',
      'cause hypothesis (verbatim): "' + (latest.causeHypothesisText || "") + '"',
      "changed variable: " + (latest.changedVariable && latest.changedVariable.name) + " from=" + (latest.changedVariable && latest.changedVariable.fromValue) + " to=" + (latest.changedVariable && latest.changedVariable.toValue),
      'predicted effect (verbatim): "' + (latest.predictedEffectText || "") + '"',
      "criterion being tested: " + (crit.name || "?") + " (target " + crit.target + " " + crit.unit + ")",
      "failed test result: measured=" + sourceTest.measured + " " + sourceTest.unit + " (passed=" + sourceTest.passed + ")",
      "stakeholder name: " + (sp.name || ""),
      "",
      'Return ONLY JSON: { "adjacent_failure_mode_questions": string[], "confound_questions": string[], "retest_validity_questions": string[], "edge_case_questions": string[], "stakeholder_realism_questions": string[] }'
    ].join("\n");
  }
  function stakeholderTranslatorPrompt(journal) {
    var devLevel = journal.devLevel || "6_8";
    var sp = journal.stakeholderProfile || {};
    var rs = (journal.stageNotes || {}).communicate || {};
    var claims = (journal.designClaims || []).map(function(c, i) {
      return i + 1 + '. text="' + (c.text || "") + '" label=' + c.label + " kind=" + c.kind;
    }).join("\n");
    var builds = (journal.buildLog || []).map(function(b) {
      return "- v=" + b.v + ' build="' + (b.buildText || "").slice(0, 80) + '"';
    }).join("\n");
    var hardCons = hardConstraints(journal).map(function(c) {
      return "- id=" + c.id + ' name="' + c.criterion + '" target=' + c.target + " " + c.unit + " measured=" + (c.measured == null ? "untested" : c.measured);
    }).join("\n");
    return [
      "SYSTEM: You are an engineering-design coach helping a " + devLevel + " student stress-test their final rationale against the stakeholder they named.",
      "You MUST NOT rewrite the rationale. You MUST NOT issue approval verdicts (well-fitted / design-is-sound / ready-to-ship / meets-all-criteria \u2014 all forbidden).",
      "You MUST NOT change any claim label. The per-claim student_label MUST echo verbatim.",
      'Cite specific testRunIds. Every question ends with "?", \u226425 words, no causal markers.',
      'calibration_flag may be over-confident / under-confident / worth-reexamining. NEVER "well-calibrated" or any approval verdict.',
      "",
      "USER:",
      "devLevel: " + devLevel,
      'stakeholder: "' + (sp.name || "") + '" (accessNote: ' + (sp.accessNote || "?") + ", epistemicStatus: " + (sp.epistemicStatus || "?") + ")",
      'design rationale: "' + (rs.designRationale || "") + '"',
      'accountability statement: "' + (rs.stakeholderAccountabilityStatement || "") + '"',
      "design claims:\n" + claims,
      "build versions:\n" + builds,
      "hard constraints:\n" + hardCons,
      "",
      'Return ONLY JSON: { "per_claim": [{ "claim_index": number, "student_label": string, "label_probe_questions": string[], "calibration_flag": string }], "stakeholder_followup_questions": string[], "unaddressed_constraint_questions": string[], "equity_probe_questions": string[], "structural_residue_questions": string[] }'
    ].join("\n");
  }
  function constraintExcavatorValidate(out) {
    if (!out) return { __rejected: true, rejectReason: "no_output", attemptedShapeKeys: [] };
    var needed = ["missing_dimension_questions", "stakeholder_voice_questions", "measurability_probe_questions", "binding_threshold_questions"];
    for (var i = 0; i < needed.length; i++) {
      if (!Array.isArray(out[needed[i]])) {
        return { __rejected: true, rejectReason: "missing_" + needed[i], attemptedShapeKeys: Object.keys(out || {}) };
      }
    }
    return out;
  }
  function dominatedSolutionFinderValidate(out, journal) {
    if (!out) return { __rejected: true, rejectReason: "no_output", attemptedShapeKeys: [] };
    var needed = ["pareto_probe_questions", "why_might_be_dominated_questions", "tradeoff_axis_questions", "theory_of_change_questions"];
    for (var i = 0; i < needed.length; i++) {
      if (!Array.isArray(out[needed[i]])) {
        return { __rejected: true, rejectReason: "missing_" + needed[i], attemptedShapeKeys: Object.keys(out || {}) };
      }
    }
    if (out.dominated_candidate_id) {
      var match = (journal.candidateConcepts || []).filter(function(c) {
        return c.id === out.dominated_candidate_id;
      })[0];
      if (!match) {
        return { __rejected: true, rejectReason: "dominated_candidate_id_not_in_journal", attemptedShapeKeys: ["dominated_candidate_id"] };
      }
    }
    return out;
  }
  function failureModeCriticValidate(out, journal) {
    if (!out) return { __rejected: true, rejectReason: "no_output", attemptedShapeKeys: [] };
    var needed = ["adjacent_failure_mode_questions", "confound_questions", "retest_validity_questions", "edge_case_questions", "stakeholder_realism_questions"];
    for (var i = 0; i < needed.length; i++) {
      if (!Array.isArray(out[needed[i]])) {
        return { __rejected: true, rejectReason: "missing_" + needed[i], attemptedShapeKeys: Object.keys(out || {}) };
      }
    }
    var IMP = /\b(try|use|add|change|replace|swap|switch|increase|decrease|reduce|raise|lower|consider|make|do)\b/i;
    var all = [].concat(out.adjacent_failure_mode_questions, out.confound_questions, out.retest_validity_questions, out.edge_case_questions, out.stakeholder_realism_questions);
    for (var k = 0; k < all.length; k++) {
      if (typeof all[k] === "string" && IMP.test(all[k])) {
        return { __rejected: true, rejectReason: "imperative_verb_in_question", attemptedShapeKeys: ["questions"] };
      }
    }
    return out;
  }
  function stakeholderTranslatorValidate(out, journal) {
    if (!out) return { __rejected: true, rejectReason: "no_output", attemptedShapeKeys: [] };
    if (!Array.isArray(out.per_claim)) {
      return { __rejected: true, rejectReason: "missing_per_claim", attemptedShapeKeys: Object.keys(out || {}) };
    }
    var claims = journal.designClaims || [];
    if (out.per_claim.length !== claims.length) {
      return { __rejected: true, rejectReason: "per_claim_length_mismatch", attemptedShapeKeys: ["per_claim"] };
    }
    var validFlags = /* @__PURE__ */ new Set(["over-confident", "under-confident", "worth-reexamining"]);
    for (var i = 0; i < out.per_claim.length; i++) {
      var pc = out.per_claim[i];
      if (pc.student_label !== claims[i].label) {
        return { __rejected: true, rejectReason: "student_label_modified", attemptedShapeKeys: ["per_claim"] };
      }
      if (pc.calibration_flag && !validFlags.has(pc.calibration_flag)) {
        return { __rejected: true, rejectReason: "invalid_calibration_flag", attemptedShapeKeys: ["per_claim", "calibration_flag"] };
      }
    }
    return out;
  }
  function tradeoffInverterGate(journal) {
    var floors = devFloors(journal.devLevel || "6_8");
    var ledger = journal.tradeOffLedger || [];
    if (ledger.length < 1) {
      return {
        ok: false,
        reason: "Record at least one trade-off in the ledger first.",
        bypass_signals: ["no_tradeoff_ledger"]
      };
    }
    var planNote = (journal.stageNotes || {}).plan_test || {};
    var decl = (planNote.tradeOffDeclaration || "").trim();
    if (decl.length < floors.tradeOffDecl) {
      return {
        ok: false,
        reason: "Trade-off declaration needs \u2265" + floors.tradeOffDecl + " chars before AI can invert.",
        bypass_signals: ["decl_short"]
      };
    }
    var declNorm = normalizeForCompare(decl);
    var critHits = 0;
    var critsAndCons = [].concat(journal.criteria || [], (journal.constraintMatrix || []).map(function(c) {
      return { name: c.criterion };
    }));
    var seen = /* @__PURE__ */ new Set();
    critsAndCons.forEach(function(item) {
      var nm = normalizeForCompare(item.name || "");
      if (nm && declNorm.indexOf(nm) !== -1 && !seen.has(nm)) {
        critHits++;
        seen.add(nm);
      }
    });
    if (critHits < 2) {
      return {
        ok: false,
        reason: "Declaration must mention TWO distinct criterion or constraint names by their actual names.",
        bypass_signals: ["decl_one_criterion"]
      };
    }
    var hasWhose = ledger.some(function(r) {
      return (r.whoseInterestThisServes || "").trim().length >= 10;
    });
    if (!hasWhose) {
      return {
        ok: false,
        reason: "At least one trade-off must name whose interest it serves (\u226510 chars).",
        bypass_signals: ["no_whose_interest"]
      };
    }
    var priorCalls = (journal.aiHistory || []).filter(function(h) {
      return h.touchpoint === "tradeoff_inverter" && !h.blocked;
    });
    if (priorCalls.length > 0) {
      var syn = (planNote.tradeoffSynthesis || "").trim();
      if (syn.length < 80) {
        return {
          ok: false,
          reason: "After a prior trade-off inversion you must author a \u226580-char tradeoffSynthesis before AI can fire again.",
          bypass_signals: ["no_post_ai_synthesis"]
        };
      }
    }
    if (!exemplarOk(journal, "plan_test")) {
      return {
        ok: false,
        reason: "Look at the example pair for this step first.",
        bypass_signals: ["exemplar_not_viewed"]
      };
    }
    return { ok: true };
  }
  function tradeoffInverterPrompt(journal) {
    var devLevel = journal.devLevel || "6_8";
    var sp = journal.stakeholderProfile || {};
    var ledger = (journal.tradeOffLedger || []).map(function(r, i) {
      var gained = ((journal.constraintMatrix || []).filter(function(c) {
        return c.id === r.criterion;
      })[0] || {}).criterion || ((journal.criteria || []).filter(function(c) {
        return c.id === r.criterion;
      })[0] || {}).name || r.criterion;
      var sac = ((journal.constraintMatrix || []).filter(function(c) {
        return c.id === r.sacrificedCriterion;
      })[0] || {}).criterion || ((journal.criteria || []).filter(function(c) {
        return c.id === r.sacrificedCriterion;
      })[0] || {}).name || r.sacrificedCriterion;
      return i + 1 + '. gained "' + gained + '", sacrificed "' + sac + '", justification: "' + (r.justification || r.accepted || "").slice(0, 200) + '", whoseInterestThisServes: "' + (r.whoseInterestThisServes || "") + '"';
    }).join("\n");
    var decl = ((journal.stageNotes || {}).plan_test || {}).tradeOffDeclaration || "";
    return [
      "SYSTEM: You are an engineering-design coach voicing a stakeholder with INVERTED priorities \u2014 the stakeholder who would have rejected the student's trade-off.",
      'You MUST NOT tell the student their priorities are wrong. You MUST NOT suggest a different chosen candidate. You MUST NOT propose a "correct" trade-off.',
      "For each tradeOffLedger entry: mirror VERBATIM a \u22648-word substring from the student's justification text (quoted_phrase field), then voice a stakeholder who valued the SACRIFICED criterion above the GAINED criterion and ask what THAT stakeholder would ask of the design.",
      'Every question ends with "?", \u226425 words, avoids causal markers AND imperative verbs.',
      "You are an antagonist, not a coach. Be sharp.",
      "",
      "USER:",
      "devLevel: " + devLevel,
      "primary stakeholder (whose interests the student is serving): " + (sp.name || "?"),
      "student trade-off declaration (verbatim, do not edit): " + decl,
      "trade-off ledger:\n" + ledger,
      "",
      'Return ONLY JSON: { "per_tradeoff": [{ "tradeoff_v": number, "quoted_phrase": string (verbatim \u22648-word substring from student justification), "inversion_questions": string[], "stakeholder_voice_questions": string[] }], "what_did_you_not_consider_questions": string[] }'
    ].join("\n");
  }
  function tradeoffInverterValidate(out, journal) {
    if (!out) return { __rejected: true, rejectReason: "no_output", attemptedShapeKeys: [] };
    if (!Array.isArray(out.per_tradeoff)) {
      return { __rejected: true, rejectReason: "missing_per_tradeoff", attemptedShapeKeys: Object.keys(out || {}) };
    }
    var ledger = journal.tradeOffLedger || [];
    var declNorm = normalizeForCompare(((journal.stageNotes || {}).plan_test || {}).tradeOffDeclaration || "");
    var allJustText = ledger.map(function(r) {
      return normalizeForCompare(r.justification || r.accepted || "");
    }).join(" ");
    for (var i = 0; i < out.per_tradeoff.length; i++) {
      var pt = out.per_tradeoff[i];
      if (!pt || typeof pt.quoted_phrase !== "string") {
        return { __rejected: true, rejectReason: "missing_quoted_phrase_at_" + i, attemptedShapeKeys: ["per_tradeoff"] };
      }
      var qn = normalizeForCompare(pt.quoted_phrase);
      if (!qn) {
        return { __rejected: true, rejectReason: "empty_quoted_phrase_at_" + i, attemptedShapeKeys: ["per_tradeoff", "quoted_phrase"] };
      }
      if (allJustText.indexOf(qn) === -1) {
        return { __rejected: true, rejectReason: "quoted_phrase_not_in_student_justifications_at_" + i, attemptedShapeKeys: ["per_tradeoff", "quoted_phrase"] };
      }
      var wc = qn.split(/\s+/).filter(Boolean).length;
      if (wc > 8) {
        return { __rejected: true, rejectReason: "quoted_phrase_too_long_at_" + i, attemptedShapeKeys: ["per_tradeoff", "quoted_phrase"] };
      }
    }
    var allAiText = JSON.stringify(out);
    var aiNorm = normalizeForCompare(allAiText);
    if (declNorm.length > 24) {
      var declWords = declNorm.split(/\s+/);
      for (var w = 0; w + 6 <= declWords.length; w++) {
        var gram = declWords.slice(w, w + 6).join(" ");
        if (gram.length > 12 && aiNorm.indexOf(gram) !== -1) {
          return { __rejected: true, rejectReason: "ai_parrots_student_decl", attemptedShapeKeys: ["*"] };
        }
      }
    }
    return out;
  }
  var TOUCHPOINTS = {
    constraint_excavator: {
      id: "constraint_excavator",
      stage: "define_problem",
      label: "Surface constraints I may have missed",
      gateCheck: constraintExcavatorGate,
      buildPrompt: constraintExcavatorPrompt,
      validate: constraintExcavatorValidate
    },
    dominated_solution_finder: {
      id: "dominated_solution_finder",
      stage: "develop_candidates",
      label: "Which of my candidates is dominated?",
      gateCheck: dominatedSolutionFinderGate,
      buildPrompt: dominatedSolutionFinderPrompt,
      validate: dominatedSolutionFinderValidate
    },
    tradeoff_inverter: {
      id: "tradeoff_inverter",
      stage: "plan_test",
      label: "Voice the stakeholder with inverted priorities",
      gateCheck: tradeoffInverterGate,
      buildPrompt: tradeoffInverterPrompt,
      validate: tradeoffInverterValidate
    },
    failure_mode_critic: {
      id: "failure_mode_critic",
      stage: "optimize",
      label: "What failure modes am I missing?",
      gateCheck: failureModeCriticGate,
      buildPrompt: failureModeCriticPrompt,
      validate: failureModeCriticValidate
    },
    stakeholder_translator: {
      id: "stakeholder_translator",
      stage: "communicate",
      label: "Questions my stakeholder would ask",
      gateCheck: stakeholderTranslatorGate,
      buildPrompt: stakeholderTranslatorPrompt,
      validate: stakeholderTranslatorValidate
    }
  };
  function CycleWheel(props) {
    var t = props.t || function(k) {
      return k;
    };
    var activeStage = props.activeStage;
    var onJump = props.onJump;
    var journalStageNotes = props.journalStageNotes || {};
    var buildVersionCount = props.buildVersionCount || 0;
    var size = 188, radius = 72;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        role: "navigation",
        "aria-label": t("engineering.cycle_nav_aria") || "Design Studio cycle navigation",
        style: { position: "relative", width: size + "px", height: size + "px", flexShrink: 0 }
      },
      /* @__PURE__ */ React.createElement("div", { style: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontSize: "10px",
        color: "#475569",
        fontWeight: 700,
        padding: "24px"
      } }, t("engineering.cycle_center_label") || "Loops are first-class. Click any stage."),
      STAGES.map(function(s, idx) {
        var theta = idx / STAGES.length * 2 * Math.PI - Math.PI / 2;
        var x = size / 2 + radius * Math.cos(theta) - 22;
        var y = size / 2 + radius * Math.sin(theta) - 22;
        var isActive = activeStage === s.key;
        var sn = journalStageNotes[s.key] || {};
        var hasWork = !!(sn.problemText || sn.designRationale || sn.tradeOffDeclaration || sn.text || s.key === "build_test" && buildVersionCount > 0 || s.key === "optimize" && buildVersionCount > 1);
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: s.key,
            type: "button",
            "data-help-key": "engineering_cycle_" + s.key,
            onClick: function() {
              if (typeof onJump === "function") onJump(s.key);
            },
            "aria-label": s.label + (isActive ? " (current stage)" : "") + (hasWork ? " (has work)" : ""),
            "aria-current": isActive ? "step" : void 0,
            style: {
              position: "absolute",
              left: x + "px",
              top: y + "px",
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: isActive ? s.color : hasWork ? "#fff7ed" : "#ffffff",
              color: isActive ? "#ffffff" : s.color,
              border: "2px solid " + s.color,
              fontSize: "18px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: isActive ? "0 4px 12px " + s.color + "66" : "none",
              transition: "all 0.15s"
            },
            title: s.label
          },
          /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, s.icon)
        );
      })
    );
  }
  function StageChipStrip(props) {
    var activeStage = props.activeStage, onJump = props.onJump;
    var journalStageNotes = props.journalStageNotes || {};
    var buildVersionCount = props.buildVersionCount || 0;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        role: "tablist",
        "aria-label": "Stage navigation",
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          padding: "6px 0",
          borderTop: "1px solid #e2e8f0",
          borderBottom: "1px solid #e2e8f0"
        }
      },
      STAGES.map(function(s, idx) {
        var isActive = activeStage === s.key;
        var sn = journalStageNotes[s.key] || {};
        var hasWork = !!(sn.problemText || sn.designRationale || sn.tradeOffDeclaration || sn.text || s.key === "build_test" && buildVersionCount > 0);
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: s.key,
            type: "button",
            role: "tab",
            "aria-selected": isActive,
            onClick: function() {
              if (typeof onJump === "function") onJump(s.key);
            },
            style: {
              padding: "6px 12px",
              borderRadius: "999px",
              background: isActive ? s.color : "#ffffff",
              color: isActive ? "#ffffff" : "#475569",
              border: "1px solid " + (isActive ? s.color : "#cbd5e1"),
              fontWeight: 700,
              fontSize: "11px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }
          },
          /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, idx + 1 + ". "),
          /* @__PURE__ */ React.createElement("span", null, s.shortLabel),
          hasWork && /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2713")
        );
      })
    );
  }
  function LoopBackPicker(props) {
    var t = props.t || function(k) {
      return k;
    };
    var fromStage = props.fromStage, toStage = props.toStage;
    var preloadChipId = props.preloadChipId || null;
    var onCommit = props.onCommit, onCancel = props.onCancel;
    var _id = useState(preloadChipId);
    var chipId = _id[0];
    var setChipId = _id[1];
    var _other = useState("");
    var otherText = _other[0];
    var setOtherText = _other[1];
    var canCommit = !!chipId && (chipId !== "other" || otherText.trim().length >= 10);
    var modalRef = useRef(null);
    useFocusTrap(modalRef, true, onCancel);
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: modalRef,
        role: "dialog",
        "aria-modal": "true",
        "aria-label": t("engineering.loopback_modal_title") || "Why are you looping back?",
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 80,
          background: "rgba(15,23,42,0.7)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        },
        onClick: function(e) {
          if (e.target === e.currentTarget) onCancel();
        }
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          onClick: function(e) {
            e.stopPropagation();
          },
          style: {
            background: "#fff",
            borderRadius: "16px",
            maxWidth: "480px",
            width: "100%",
            padding: "20px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)"
          }
        },
        /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: "15px", fontWeight: 800, color: "#1e293b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F501} "), t("engineering.loopback_modal_title") || "Why are you looping back?"),
        /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 12px", fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, t("engineering.loopback_modal_help") || "In engineering, loops are how the design gets better. Your downstream work is preserved as a record; you can return."),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "8px", maxHeight: "50vh", overflowY: "auto" } }, LOOPBACK_CHIPS.map(function(c) {
          var selected = chipId === c.id;
          return /* @__PURE__ */ React.createElement(
            "button",
            {
              key: c.id,
              type: "button",
              onClick: function() {
                setChipId(c.id);
              },
              "aria-pressed": selected,
              style: {
                padding: "10px 12px",
                borderRadius: "10px",
                border: selected ? "2px solid #b45309" : "1px solid #cbd5e1",
                background: selected ? "#fef3c7" : "#ffffff",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "13px",
                color: "#1e293b"
              }
            },
            /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { fontSize: "18px" } }, c.icon),
            /* @__PURE__ */ React.createElement("span", null, c.label)
          );
        })),
        chipId === "other" && /* @__PURE__ */ React.createElement(
          "textarea",
          {
            value: otherText,
            onChange: function(e) {
              setOtherText(e.target.value);
            },
            rows: 2,
            maxLength: 240,
            placeholder: t("engineering.loopback_other_placeholder") || "Briefly: what made you loop back? (\u226510 chars)",
            style: {
              marginTop: "8px",
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontFamily: "inherit",
              fontSize: "12px"
            }
          }
        ),
        /* @__PURE__ */ React.createElement("div", { style: { marginTop: "14px", display: "flex", justifyContent: "flex-end", gap: "8px" } }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: onCancel,
            style: {
              padding: "8px 14px",
              borderRadius: "999px",
              background: "#f1f5f9",
              color: "#475569",
              border: "none",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer"
            }
          },
          t("common.cancel") || "Cancel"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            disabled: !canCommit,
            onClick: function() {
              onCommit({ whyChipId: chipId, why: chipId === "other" ? otherText.trim() : null });
            },
            style: {
              padding: "8px 14px",
              borderRadius: "999px",
              background: canCommit ? "#b45309" : "#cbd5e1",
              color: "#fff",
              border: "none",
              fontWeight: 800,
              fontSize: "12px",
              cursor: canCommit ? "pointer" : "not-allowed"
            }
          },
          t("engineering.loopback_commit") || "Loop back to ",
          STAGE_BY_KEY[toStage] ? STAGE_BY_KEY[toStage].label : toStage
        ))
      )
    );
  }
  function EducatorPanel(props) {
    var t = props.t || function(k) {
      return k;
    };
    return /* @__PURE__ */ React.createElement("details", { style: {
      padding: "10px 14px",
      borderRadius: "12px",
      background: "#fff7ed",
      border: "1px solid #fed7aa"
    } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", fontSize: "11px", fontWeight: 800, color: "#9a3412" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F393} "), t("engineering.educator_panel_summary") || "For teachers: how engineering grading should work in this lane"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px", fontSize: "11px", color: "#7c2d12", lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0" } }, t("engineering.educator_panel_p1") || "Engineering is not science. It does not converge on what is true; it optimizes a solution under constraints for a named human. There is no single correct answer \u2014 only non-dominated points on a trade-off surface."), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0" } }, t("engineering.educator_panel_p2") || "Grade the LOOPS, not the polish. A session with 3 failure-loops and a candidate swap is BETTER engineering than a clean 1\u21926 walk. AI here asks adversarial questions only \u2014 it never proposes a design, picks a winner, or rewrites rationale."), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0", fontStyle: "italic" } }, t("engineering.educator_panel_p3") || "Two cross-cutting rubric exemplars at lane exit reward iteration density + naming a trade-off the student would NOT have seen at Define. Grade with those.")));
  }
  function BlockedNote(props) {
    var t = props.t;
    var reason = props.reason || (t("engineering.blocked_generic") || "AI couldn't help with that \u2014 try again later.");
    return /* @__PURE__ */ React.createElement("div", { role: "alert", style: {
      padding: "10px 12px",
      borderRadius: "10px",
      background: "#fef3c7",
      border: "1px solid #fbbf24",
      fontSize: "11px",
      color: "#92400e",
      lineHeight: 1.5
    } }, /* @__PURE__ */ React.createElement("strong", { style: { marginRight: "4px" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F6E1}\uFE0F "), t("engineering.blocked_prefix") || "AI helper paused:"), reason);
  }
  function TextareaCard(props) {
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "12px", fontWeight: 700, color: "#1e293b", display: "block" } }, props.label), props.help && /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0", fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, props.help), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: props.value || "",
        onChange: function(e) {
          props.onChange(e.target.value);
        },
        rows: props.rows || 3,
        maxLength: props.max || 800,
        placeholder: props.placeholder || "",
        style: {
          marginTop: "4px",
          width: "100%",
          boxSizing: "border-box",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit",
          resize: "vertical",
          minHeight: "60px"
        }
      }
    ));
  }
  function ExemplarGate(props) {
    var t = props.t, stageKey = props.stageKey;
    var journal = props.journal, setJournal = props.setJournal;
    var primitives = props.primitives || {};
    var ExemplarPair = primitives.ExemplarPair;
    var stageNote = (journal.stageNotes || {})[stageKey] || {};
    var viewed = !!(stageNote.exemplarViewed || stageNote.exemplarDismissed);
    var pair = props.pair;
    var _open = useState(false);
    var open = _open[0];
    var setOpen = _open[1];
    if (!pair || !ExemplarPair) return null;
    if (viewed && !open) {
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            setOpen(true);
          },
          style: {
            padding: "6px 12px",
            borderRadius: "999px",
            background: "#f1f5f9",
            color: "#475569",
            border: "none",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer"
          }
        },
        /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4D6} "),
        t("engineering.review_exemplar_again") || "Review the example pair again"
      );
    }
    if (!viewed) {
      return /* @__PURE__ */ React.createElement("div", { style: {
        padding: "12px",
        borderRadius: "12px",
        background: "#fffbeb",
        border: "1px solid #fcd34d"
      } }, /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 8px", fontSize: "11px", fontWeight: 700, color: "#92400e" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4A1} "), t("engineering.exemplar_required_prefix") || "Before AI can help here:", " ", t("engineering.exemplar_required_suffix") || "check this example pair (1 min)."), /* @__PURE__ */ React.createElement(
        ExemplarPair,
        {
          t,
          criterion: pair.criterion,
          strongExample: pair.strongExample,
          weakExample: pair.weakExample,
          onJudgment: function(j) {
            setJournal(function(prev) {
              var next = Object.assign({}, prev);
              next.stageNotes = Object.assign({}, prev.stageNotes || {});
              var sn = Object.assign({}, next.stageNotes[stageKey] || {});
              sn.exemplarViewed = true;
              sn.exemplarJudgment = j;
              sn.exemplarJudgmentAt = Date.now();
              next.stageNotes[stageKey] = sn;
              return next;
            });
          }
        }
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            setJournal(function(prev) {
              var next = Object.assign({}, prev);
              next.stageNotes = Object.assign({}, prev.stageNotes || {});
              var sn = Object.assign({}, next.stageNotes[stageKey] || {});
              sn.exemplarDismissed = true;
              sn.exemplarDismissedAt = Date.now();
              next.stageNotes[stageKey] = sn;
              return next;
            });
          },
          style: {
            marginTop: "8px",
            padding: "4px 10px",
            borderRadius: "999px",
            background: "transparent",
            color: "#92400e",
            border: "1px solid #fcd34d",
            fontSize: "10px",
            fontWeight: 700,
            cursor: "pointer"
          }
        },
        t("engineering.exemplar_skip") || "I've got it \u2014 skip without judging"
      ));
    }
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
      ExemplarPair,
      {
        t,
        criterion: pair.criterion,
        strongExample: pair.strongExample,
        weakExample: pair.weakExample,
        initialChoice: stageNote.exemplarJudgment && stageNote.exemplarJudgment.choice || null,
        initialReasoning: stageNote.exemplarJudgment && stageNote.exemplarJudgment.reasoning || "",
        onJudgment: function(j) {
          setJournal(function(prev) {
            var next = Object.assign({}, prev);
            next.stageNotes = Object.assign({}, prev.stageNotes || {});
            var sn = Object.assign({}, next.stageNotes[stageKey] || {});
            sn.exemplarJudgment = j;
            next.stageNotes[stageKey] = sn;
            return next;
          });
          setOpen(false);
        }
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          setOpen(false);
        },
        style: {
          marginTop: "6px",
          background: "transparent",
          border: "none",
          color: "#475569",
          fontSize: "11px",
          cursor: "pointer",
          textDecoration: "underline"
        }
      },
      t("common.close") || "Close"
    ));
  }
  function AiResultPanel(props) {
    var t = props.t, data = props.data;
    var primitives = props.primitives || {};
    var SuggestionBadge = primitives.SuggestionBadge;
    if (!data) return null;
    function renderQuestions(arr, label) {
      if (!Array.isArray(arr) || !arr.length) return null;
      return /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#9a3412" } }, label), /* @__PURE__ */ React.createElement("ul", { style: { margin: "4px 0 0", paddingLeft: "20px", fontSize: "12px", color: "#1e293b", lineHeight: 1.6 } }, arr.map(function(q, i) {
        return /* @__PURE__ */ React.createElement("li", { key: i }, q);
      })));
    }
    return /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite", style: {
      marginTop: "10px",
      padding: "12px 14px",
      borderRadius: "12px",
      background: "#fff7ed",
      border: "1px solid #fdba74"
    } }, SuggestionBadge && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "6px" } }, /* @__PURE__ */ React.createElement(SuggestionBadge, { t })), renderQuestions(data.missing_dimension_questions, t("engineering.q_missing_dimension") || "Constraint dimensions you may have missed:"), renderQuestions(data.stakeholder_voice_questions, t("engineering.q_stakeholder_voice") || "Questions in your stakeholder voice:"), renderQuestions(data.measurability_probe_questions, t("engineering.q_measurability") || "Questions about measurability:"), renderQuestions(data.binding_threshold_questions, t("engineering.q_binding") || "Questions about whether thresholds are actually binding:"), renderQuestions(data.pareto_probe_questions, t("engineering.q_pareto") || "Pareto-dominance probes:"), data.dominated_candidate_id && /* @__PURE__ */ React.createElement("p", { style: { marginTop: "6px", fontSize: "12px", color: "#1e293b" } }, /* @__PURE__ */ React.createElement("strong", { style: { color: "#9a3412" } }, t("engineering.dominated_id") || "AI flags as possibly dominated:", " "), /* @__PURE__ */ React.createElement("code", null, data.dominated_candidate_id)), renderQuestions(data.why_might_be_dominated_questions, t("engineering.q_why_dominated") || "Why might it be dominated?"), renderQuestions(data.tradeoff_axis_questions, t("engineering.q_tradeoff_axis") || "Trade-off axis probes:"), renderQuestions(data.theory_of_change_questions, t("engineering.q_theory_of_change") || "Theory-of-change probes (what does each candidate ASSUME about the stakeholder?):"), renderQuestions(data.convergence_risk_questions, t("engineering.q_convergence") || "Convergence-risk questions (where are concepts secretly the same?):"), renderQuestions(data.adjacent_failure_mode_questions, t("engineering.q_adjacent_modes") || "Adjacent failure modes to consider:"), renderQuestions(data.confound_questions, t("engineering.q_confounds") || "Confound questions:"), renderQuestions(data.retest_validity_questions, t("engineering.q_retest_validity") || "Retest-validity questions:"), renderQuestions(data.edge_case_questions, t("engineering.q_edge_cases") || "Edge-case questions:"), renderQuestions(data.stakeholder_realism_questions, t("engineering.q_realism") || "Stakeholder-realism questions:"), Array.isArray(data.per_claim) && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#9a3412" } }, t("engineering.per_claim") || "Questions about your design claim labels"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "4px 0 0", paddingLeft: "18px", fontSize: "12px", lineHeight: 1.6 } }, data.per_claim.map(function(pc, i) {
      return /* @__PURE__ */ React.createElement("li", { key: i }, /* @__PURE__ */ React.createElement("strong", null, "Claim ", pc.claim_index || i + 1), " [", pc.student_label, ", AI flag: ", pc.calibration_flag || "\u2014", "]", renderQuestions(pc.label_probe_questions, ""));
    }))), renderQuestions(data.stakeholder_followup_questions, t("engineering.q_stake_followup") || "Stakeholder follow-up questions:"), renderQuestions(data.unaddressed_constraint_questions, t("engineering.q_unaddressed") || "Unaddressed-constraint questions:"), renderQuestions(data.equity_probe_questions, t("engineering.q_equity") || "Equity probes (who else has this problem; would the solution work for them?):"), renderQuestions(data.structural_residue_questions, t("engineering.q_residue") || "Structural-residue questions (what about the stakeholder's situation is NOT solvable by a design artifact?):"));
  }
  function StakeholderCard(props) {
    var t = props.t || function(k) {
      return k;
    };
    var journal = props.journal, setJournal = props.setJournal;
    var editable = !!props.editable;
    var sp = journal.stakeholderProfile;
    var _editing = useState(!sp || !sp.name && editable);
    var editing = _editing[0];
    var setEditing = _editing[1];
    var _draft = useState(sp || { name: "", group: "", accessNote: "", epistemicStatus: "", whyThisStakeholderJustification: "" });
    var draft = _draft[0];
    var setDraft = _draft[1];
    var floors = devFloors(journal.devLevel || "6_8");
    var nameNorm = normName(draft.name || "");
    var nameDenied = STAKEHOLDER_DENYLIST.has(nameNorm);
    var canSave = draft.name && draft.name.trim().length >= 2 && !nameDenied && (draft.whyThisStakeholderJustification || "").trim().length >= floors.stakeholderJust && !!draft.accessNote && !!draft.epistemicStatus;
    var save = function() {
      if (!canSave) return;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.stakeholderProfile = {
          name: draft.name.trim(),
          group: (draft.group || "").trim(),
          accessNote: draft.accessNote,
          epistemicStatus: draft.epistemicStatus,
          whyThisStakeholderJustification: draft.whyThisStakeholderJustification.trim(),
          voiceNote: draft.voiceNote || null,
          ts: Date.now(),
          staleLabel: false
        };
        return next;
      });
      setEditing(false);
    };
    if (!editable && (!sp || !sp.name)) {
      return /* @__PURE__ */ React.createElement("div", { style: {
        padding: "8px 12px",
        borderRadius: "10px",
        background: "#fff7ed",
        border: "1px dashed #fdba74",
        fontSize: "11px",
        color: "#9a3412"
      } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F465} "), t("engineering.stakeholder_missing_readonly") || "No stakeholder named yet \u2014 loop back to Define to name one.");
    }
    if (!editing && sp && sp.name) {
      return /* @__PURE__ */ React.createElement("div", { style: {
        padding: "8px 12px",
        borderRadius: "10px",
        background: "#fff7ed",
        border: "1px solid #fdba74",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap"
      } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { fontSize: "20px" } }, "\u{1F465}"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: "180px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", fontWeight: 800, color: "#7c2d12" } }, sp.name, sp.group ? " (" + sp.group + ")" : ""), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#9a3412", marginTop: "2px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 700 } }, t("engineering.access_label") || "access:", " "), sp.accessNote, " \xB7 ", /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 700 } }, t("engineering.epistemic_label") || "epistemic:", " "), sp.epistemicStatus, sp.staleLabel && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "6px", color: "#b45309", fontWeight: 800 } }, t("engineering.stakeholder_stale") || "(stale \u2014 review)"))), editable && /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            setEditing(true);
            setDraft(sp);
          },
          style: {
            padding: "4px 10px",
            borderRadius: "999px",
            background: "transparent",
            color: "#9a3412",
            border: "1px solid #fdba74",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer"
          }
        },
        t("engineering.edit_stakeholder") || "Edit"
      ), props.onReturnToStakeholder && /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: props.onReturnToStakeholder,
          "aria-label": t("engineering.return_to_stakeholder_aria") || "Take this back to my stakeholder",
          style: {
            padding: "4px 10px",
            borderRadius: "999px",
            background: "#b45309",
            color: "#fff",
            border: "none",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer"
          }
        },
        /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u21A9\uFE0F "),
        t("engineering.return_to_stakeholder") || "Take this back to ",
        sp.name.split(" ")[0]
      ));
    }
    if (!editable) return null;
    return /* @__PURE__ */ React.createElement("div", { style: {
      padding: "14px",
      borderRadius: "14px",
      background: "#fff7ed",
      border: "1px solid #fdba74",
      display: "flex",
      flexDirection: "column",
      gap: "10px"
    } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: 0, fontSize: "13px", fontWeight: 800, color: "#7c2d12" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F465} "), t("engineering.stakeholder_card_title") || "Name your stakeholder (specific real person)"), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "11px", color: "#9a3412", lineHeight: 1.5 } }, t("engineering.stakeholder_card_help") || "Engineering is for someone. Naming a generic group (students / people / kids) makes constraints unfindable. Name a real person you can actually consult \u2014 or honestly mark this as imagined."), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#7c2d12" } }, t("engineering.stakeholder_name") || "Name", " *", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: draft.name || "",
        maxLength: 80,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { name: e.target.value }));
        },
        placeholder: t("engineering.stakeholder_name_ph") || "e.g. Ms. Patel, my neighbor Marcus",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "6px 8px",
          borderRadius: "6px",
          border: "1px solid " + (nameDenied ? "#dc2626" : "#cbd5e1"),
          fontSize: "12px",
          fontFamily: "inherit"
        }
      }
    ), nameDenied && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "2px", fontSize: "10px", color: "#dc2626" } }, t("engineering.stakeholder_generic_warning") || "Too generic \u2014 pick a specific person, not a category.")), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#7c2d12" } }, t("engineering.stakeholder_group") || "Group / role (optional)", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: draft.group || "",
        maxLength: 80,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { group: e.target.value }));
        },
        placeholder: t("engineering.stakeholder_group_ph") || "e.g. cafeteria manager",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "6px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      }
    )), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#7c2d12" } }, t("engineering.stakeholder_access") || "How can you reach them?", " *", /* @__PURE__ */ React.createElement(
      "select",
      {
        value: draft.accessNote || "",
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { accessNote: e.target.value }));
        },
        style: {
          marginTop: "2px",
          width: "100%",
          padding: "6px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 pick \u2014"),
      /* @__PURE__ */ React.createElement("option", { value: "direct" }, "Direct (I can talk to them)"),
      /* @__PURE__ */ React.createElement("option", { value: "proxy" }, "Proxy (through someone else)"),
      /* @__PURE__ */ React.createElement("option", { value: "imagined_with_research" }, "Imagined, backed by research")
    )), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#7c2d12" } }, t("engineering.stakeholder_epistemic") || "How do you know what they need?", " *", /* @__PURE__ */ React.createElement(
      "select",
      {
        value: draft.epistemicStatus || "",
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { epistemicStatus: e.target.value }));
        },
        style: {
          marginTop: "2px",
          width: "100%",
          padding: "6px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 pick \u2014"),
      /* @__PURE__ */ React.createElement("option", { value: "invented" }, "Invented (I made them up)"),
      /* @__PURE__ */ React.createElement("option", { value: "observed" }, "Observed (I watched them, didn't talk)"),
      /* @__PURE__ */ React.createElement("option", { value: "interviewed" }, "Interviewed (I talked to them)"),
      /* @__PURE__ */ React.createElement("option", { value: "curriculum_prompt" }, "Curriculum prompt (assigned)")
    ))), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#7c2d12" } }, t("engineering.stakeholder_why") || "Why this stakeholder, why now?", " * (\u2265", floors.stakeholderJust, " chars)", /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: draft.whyThisStakeholderJustification || "",
        rows: 3,
        maxLength: 800,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { whyThisStakeholderJustification: e.target.value }));
        },
        placeholder: t("engineering.stakeholder_why_ph") || "What is at stake for them? Why is this design for THEM and not a generic user?",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit",
          resize: "vertical",
          minHeight: "50px"
        }
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "8px" } }, sp && sp.name && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          setEditing(false);
        },
        style: {
          padding: "8px 14px",
          borderRadius: "999px",
          background: "#f1f5f9",
          color: "#475569",
          border: "none",
          fontWeight: 700,
          fontSize: "12px",
          cursor: "pointer"
        }
      },
      t("common.cancel") || "Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: !canSave,
        onClick: save,
        style: {
          padding: "8px 14px",
          borderRadius: "999px",
          background: canSave ? "#b45309" : "#cbd5e1",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "12px",
          cursor: canSave ? "pointer" : "not-allowed"
        }
      },
      t("engineering.save_stakeholder") || "Save stakeholder"
    )));
  }
  function ConstraintRow(props) {
    var t = props.t || function(k) {
      return k;
    };
    var existing = props.constraint || null;
    var onSave = props.onSave, onCancel = props.onCancel;
    var lockedTierDown = !!props.lockedTierDown;
    var _draft = useState(existing || { criterion: "", target: "", unit: "", source: "", tier: "hard", weight: 3 });
    var draft = _draft[0];
    var setDraft = _draft[1];
    var _saneAck = useState(false);
    var saneAck = _saneAck[0];
    var setSaneAck = _saneAck[1];
    var targetNum = parseFloat(draft.target);
    var targetValid = Number.isFinite(targetNum);
    var unitValid = isWhitelistedUnit(draft.unit);
    var saneCheck = targetValid ? withinSaneRange(draft.source, targetNum) : true;
    var needsSaneAck = !saneCheck;
    var criterionValid = (draft.criterion || "").trim().length >= 8;
    var canSave = criterionValid && targetValid && unitValid && !!draft.source && !!draft.tier && (saneCheck || saneAck);
    var tierDowngradeAttempted = lockedTierDown && existing && existing.tier === "hard" && draft.tier !== "hard";
    return /* @__PURE__ */ React.createElement("div", { style: {
      padding: "10px",
      borderRadius: "10px",
      background: "#fff",
      border: "1px solid #cbd5e1",
      display: "flex",
      flexDirection: "column",
      gap: "6px"
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "6px" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569", gridColumn: "1 / -1" } }, t("engineering.constraint_criterion") || "Constraint description", " *", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: draft.criterion || "",
        maxLength: 120,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { criterion: e.target.value }));
        },
        placeholder: t("engineering.constraint_criterion_ph") || "e.g. total cost, total mass, max temperature, time to set up",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      }
    )), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569" } }, t("engineering.constraint_target") || "Numeric target", " *", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        inputMode: "decimal",
        value: draft.target || "",
        maxLength: 20,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { target: e.target.value }));
        },
        placeholder: "e.g. 5",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid " + (draft.target && !targetValid ? "#dc2626" : "#cbd5e1"),
          fontSize: "12px",
          fontFamily: "inherit"
        }
      }
    )), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569" } }, t("engineering.constraint_unit") || "Unit", " *", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: draft.unit || "",
        maxLength: 24,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { unit: e.target.value }));
        },
        placeholder: "$ / g / kg / s / m / \xB0C / %",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid " + (draft.unit && !unitValid ? "#dc2626" : "#cbd5e1"),
          fontSize: "12px",
          fontFamily: "inherit"
        }
      }
    ), draft.unit && !unitValid && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "2px", fontSize: "9px", color: "#dc2626" } }, t("engineering.unit_not_whitelisted") || "Unit not recognized \u2014 try $, g, kg, s, m, cm, \xB0C, %, etc. 'good' is not a unit.")), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569" } }, t("engineering.constraint_source") || "Source", " *", /* @__PURE__ */ React.createElement(
      "select",
      {
        value: draft.source || "",
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { source: e.target.value }));
          setSaneAck(false);
        },
        style: {
          marginTop: "2px",
          width: "100%",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"),
      /* @__PURE__ */ React.createElement("option", { value: "budget" }, "budget"),
      /* @__PURE__ */ React.createElement("option", { value: "safety" }, "safety"),
      /* @__PURE__ */ React.createElement("option", { value: "time" }, "time"),
      /* @__PURE__ */ React.createElement("option", { value: "material" }, "material"),
      /* @__PURE__ */ React.createElement("option", { value: "code" }, "code / regulation"),
      /* @__PURE__ */ React.createElement("option", { value: "access" }, "access"),
      /* @__PURE__ */ React.createElement("option", { value: "stakeholder" }, "stakeholder said so"),
      /* @__PURE__ */ React.createElement("option", { value: "other" }, "other")
    )), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569" } }, t("engineering.constraint_tier") || "Tier", " *", /* @__PURE__ */ React.createElement(
      "select",
      {
        value: draft.tier || "hard",
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { tier: e.target.value }));
        },
        disabled: tierDowngradeAttempted,
        style: {
          marginTop: "2px",
          width: "100%",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "hard" }, "hard (must hold)"),
      /* @__PURE__ */ React.createElement("option", { value: "soft" }, "soft (should hold)"),
      /* @__PURE__ */ React.createElement("option", { value: "preference" }, "preference (nice to have)")
    ), lockedTierDown && existing && existing.tier === "hard" && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "2px", fontSize: "9px", color: "#92400e" } }, t("engineering.tier_locked_post_test") || "Hard \u2192 softer is locked after Build \u2014 use a justified loop-back."))), needsSaneAck && /* @__PURE__ */ React.createElement("div", { style: {
      padding: "6px 10px",
      borderRadius: "8px",
      background: "#fef3c7",
      border: "1px solid #fbbf24",
      fontSize: "11px",
      color: "#92400e"
    } }, /* @__PURE__ */ React.createElement("strong", null, t("engineering.sane_warning_prefix") || "Is this threshold actually binding?"), " ", SANE_RANGE[draft.source].note, /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: "4px", marginTop: "4px", fontSize: "11px" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: saneAck, onChange: function(e) {
      setSaneAck(e.target.checked);
    } }), /* @__PURE__ */ React.createElement("span", null, t("engineering.sane_ack") || "Yes, this threshold is meaningful in my context \u2014 I acknowledge the warning."))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "6px" } }, onCancel && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: onCancel,
        style: {
          padding: "4px 10px",
          borderRadius: "999px",
          background: "transparent",
          color: "#475569",
          border: "1px solid #cbd5e1",
          fontSize: "11px",
          fontWeight: 700,
          cursor: "pointer"
        }
      },
      t("common.cancel") || "Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: !canSave,
        onClick: function() {
          if (canSave) onSave(Object.assign({}, draft, { target: targetNum, weight: parseInt(draft.weight, 10) || 3, ts: Date.now() }));
        },
        style: {
          padding: "5px 12px",
          borderRadius: "999px",
          background: canSave ? "#b45309" : "#cbd5e1",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "11px",
          cursor: canSave ? "pointer" : "not-allowed"
        }
      },
      existing ? t("common.save") || "Save" : t("engineering.add_constraint") || "Add constraint"
    )));
  }
  function CriterionRow(props) {
    var t = props.t || function(k) {
      return k;
    };
    var existing = props.criterion || null;
    var onSave = props.onSave, onCancel = props.onCancel;
    var _draft = useState(existing || { name: "", unit: "", target: "", direction: "maximize", weight: 3, kind: "measurable-other" });
    var draft = _draft[0];
    var setDraft = _draft[1];
    var unitValid = isWhitelistedUnit(draft.unit);
    var canSave = (draft.name || "").trim().length >= 4 && unitValid && (draft.target + "").length > 0;
    return /* @__PURE__ */ React.createElement("div", { style: {
      padding: "8px",
      borderRadius: "8px",
      background: "#fff",
      border: "1px solid #cbd5e1",
      display: "flex",
      flexWrap: "wrap",
      gap: "6px",
      alignItems: "flex-end"
    } }, /* @__PURE__ */ React.createElement("label", { style: { flex: "2 1 200px", fontSize: "10px", fontWeight: 700, color: "#475569" } }, t("engineering.criterion_name") || "Criterion", " *", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: draft.name,
        maxLength: 80,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { name: e.target.value }));
        },
        placeholder: t("engineering.criterion_name_ph") || "e.g. final serve temperature, total cost, set-up time",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      }
    )), /* @__PURE__ */ React.createElement("label", { style: { flex: "1 1 80px", fontSize: "10px", fontWeight: 700, color: "#475569" } }, t("engineering.criterion_unit") || "Unit", " *", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: draft.unit,
        maxLength: 24,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { unit: e.target.value }));
        },
        placeholder: "\xB0C / $ / s",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid " + (draft.unit && !unitValid ? "#dc2626" : "#cbd5e1"),
          fontSize: "12px",
          fontFamily: "inherit"
        }
      }
    )), /* @__PURE__ */ React.createElement("label", { style: { flex: "1 1 80px", fontSize: "10px", fontWeight: 700, color: "#475569" } }, t("engineering.criterion_target") || "Target", " *", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        inputMode: "decimal",
        value: draft.target,
        maxLength: 20,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { target: e.target.value }));
        },
        placeholder: "55",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      }
    )), /* @__PURE__ */ React.createElement("label", { style: { flex: "1 1 100px", fontSize: "10px", fontWeight: 700, color: "#475569" } }, t("engineering.criterion_direction") || "Direction", " *", /* @__PURE__ */ React.createElement(
      "select",
      {
        value: draft.direction,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { direction: e.target.value }));
        },
        style: {
          marginTop: "2px",
          width: "100%",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "maximize" }, "maximize"),
      /* @__PURE__ */ React.createElement("option", { value: "minimize" }, "minimize"),
      /* @__PURE__ */ React.createElement("option", { value: "meet" }, "hit target")
    )), /* @__PURE__ */ React.createElement("label", { style: { flex: "1 1 90px", fontSize: "10px", fontWeight: 700, color: "#475569" } }, t("engineering.criterion_weight") || "Weight 1-5", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        min: "1",
        max: "5",
        value: draft.weight,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { weight: e.target.value }));
        },
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      }
    )), /* @__PURE__ */ React.createElement("label", { style: { flex: "1 1 140px", fontSize: "10px", fontWeight: 700, color: "#475569" } }, t("engineering.criterion_kind") || "Kind", /* @__PURE__ */ React.createElement(
      "select",
      {
        value: draft.kind,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { kind: e.target.value }));
        },
        style: {
          marginTop: "2px",
          width: "100%",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "stakeholder-derived" }, "stakeholder-derived"),
      /* @__PURE__ */ React.createElement("option", { value: "physical-safety" }, "physical-safety"),
      /* @__PURE__ */ React.createElement("option", { value: "measurable-other" }, "measurable-other")
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "6px", marginLeft: "auto" } }, onCancel && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: onCancel,
        style: {
          padding: "4px 10px",
          borderRadius: "999px",
          background: "transparent",
          color: "#475569",
          border: "1px solid #cbd5e1",
          fontSize: "11px",
          fontWeight: 700,
          cursor: "pointer"
        }
      },
      t("common.cancel") || "Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: !canSave,
        onClick: function() {
          if (!canSave) return;
          onSave(Object.assign({}, draft, {
            target: parseFloat(draft.target),
            weight: parseInt(draft.weight, 10) || 3,
            ts: Date.now(),
            id: existing ? existing.id : "crit" + Date.now() + "_" + Math.floor(Math.random() * 1e3)
          }));
        },
        style: {
          padding: "5px 12px",
          borderRadius: "999px",
          background: canSave ? "#b45309" : "#cbd5e1",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "11px",
          cursor: canSave ? "pointer" : "not-allowed"
        }
      },
      existing ? t("common.save") || "Save" : t("engineering.add_criterion") || "Add criterion"
    )));
  }
  function ConstraintCoverageBar(props) {
    var t = props.t || function(k) {
      return k;
    };
    var cons = props.constraints || [];
    if (!cons.length) return null;
    function statusOf(c) {
      if (c.tier !== "hard") return c.tier === "soft" ? "soft" : "preference";
      if (c.measured == null) return "untested_hard";
      if (c.passed === false) return "measured_fail";
      if (typeof c.measured === "number" && Number.isFinite(c.measured)) return "measured_pass";
      return "untested_hard";
    }
    var counts = { measured_pass: 0, measured_fail: 0, untested_hard: 0, soft: 0, preference: 0 };
    cons.forEach(function(c) {
      counts[statusOf(c)] += 1;
    });
    var hardUntested = counts.untested_hard;
    return /* @__PURE__ */ React.createElement("div", { style: {
      padding: "8px 10px",
      borderRadius: "10px",
      background: "#fff",
      border: "1px solid #cbd5e1"
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#1e293b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4CA} "), t("engineering.coverage_title") || "Constraint coverage"), hardUntested > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#b91c1c", fontWeight: 800 } }, hardUntested, " ", t("engineering.untested_hard_count") || "untested hard constraint(s)")), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "4px" } }, cons.map(function(c) {
      var status = statusOf(c);
      var color = status === "measured_pass" ? "#16a34a" : status === "measured_fail" ? "#dc2626" : status === "untested_hard" ? "#b91c1c" : status === "soft" ? "#d97706" : "#94a3b8";
      return /* @__PURE__ */ React.createElement(
        "span",
        {
          key: c.id || c.criterion,
          title: c.criterion + " (" + status + ")",
          style: {
            padding: "2px 8px",
            borderRadius: "999px",
            background: color + "22",
            color,
            border: "1px solid " + color,
            fontSize: "10px",
            fontWeight: 700
          }
        },
        c.criterion,
        c.tier === "hard" ? " *" : ""
      );
    })));
  }
  function CandidateCard(props) {
    var t = props.t || function(k) {
      return k;
    };
    var existing = props.candidate || null;
    var constraints = props.constraints || [];
    var onSave = props.onSave, onCancel = props.onCancel;
    var primitives = props.primitives || {};
    var VoiceNoteBlock = primitives.VoiceNoteBlock;
    var _draft = useState(existing || { name: "", sketchText: "", materialsList: [], constraintsSatisfied: [], constraintsPunted: [], riskiestAssumption: "" });
    var draft = _draft[0];
    var setDraft = _draft[1];
    var _matInput = useState("");
    var matInput = _matInput[0];
    var setMatInput = _matInput[1];
    var puntsValid = Array.isArray(draft.constraintsPunted) && draft.constraintsPunted.length >= 1;
    var nameValid = (draft.name || "").trim().length >= 4;
    var sketchValid = (draft.sketchText || "").trim().length >= 15 || draft.sketchDataUrl || draft.audioBase64 && draft.durationS >= 5;
    var materialsValid = (draft.materialsList || []).length >= 1;
    var canSave = nameValid && sketchValid && materialsValid && puntsValid;
    var toggleConstraint = function(id, list, otherList) {
      var next = Object.assign({}, draft);
      var arr = (draft[list] || []).slice();
      var otherArr = (draft[otherList] || []).filter(function(x) {
        return x !== id;
      });
      var idx = arr.indexOf(id);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(id);
      next[list] = arr;
      next[otherList] = otherArr;
      setDraft(next);
    };
    var addMaterial = function() {
      var m = (matInput || "").trim();
      if (!m) return;
      if ((draft.materialsList || []).indexOf(m) !== -1) {
        setMatInput("");
        return;
      }
      setDraft(Object.assign({}, draft, { materialsList: (draft.materialsList || []).concat([m]) }));
      setMatInput("");
    };
    var removeMaterial = function(m) {
      setDraft(Object.assign({}, draft, { materialsList: (draft.materialsList || []).filter(function(x) {
        return x !== m;
      }) }));
    };
    return /* @__PURE__ */ React.createElement("div", { style: {
      padding: "12px",
      borderRadius: "12px",
      background: "#fff",
      border: "1px solid #cbd5e1",
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#7c2d12" } }, t("engineering.candidate_name") || "Concept name", " *", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: draft.name,
        maxLength: 80,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { name: e.target.value }));
        },
        placeholder: t("engineering.candidate_name_ph") || "e.g. foil-wrapped insulated tote",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "6px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      }
    )), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#7c2d12" } }, t("engineering.candidate_sketch") || "Sketch (text describing it; or a voice note; or paste a sketch URL)", " *", /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: draft.sketchText || "",
        rows: 3,
        maxLength: 800,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { sketchText: e.target.value }));
        },
        placeholder: t("engineering.candidate_sketch_ph") || "Describe the concept in enough detail that someone else could draw it.",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit",
          resize: "vertical",
          minHeight: "60px"
        }
      }
    )), VoiceNoteBlock && /* @__PURE__ */ React.createElement(
      VoiceNoteBlock,
      {
        t,
        initialBase64: draft.audioBase64,
        initialDuration: draft.durationS || 0,
        label: t("engineering.candidate_voice_label") || "Concept voice note (optional)",
        onChange: function(v) {
          setDraft(Object.assign({}, draft, { audioBase64: v.audioBase64, durationS: v.durationS }));
        }
      }
    ), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#7c2d12" } }, t("engineering.candidate_materials") || "Materials list", " *"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", display: "flex", gap: "4px", flexWrap: "wrap" } }, (draft.materialsList || []).map(function(m) {
      return /* @__PURE__ */ React.createElement("span", { key: m, style: {
        padding: "3px 8px",
        borderRadius: "999px",
        background: "#fef3c7",
        color: "#92400e",
        border: "1px solid #fcd34d",
        fontSize: "11px",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px"
      } }, m, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            removeMaterial(m);
          },
          "aria-label": "Remove material",
          style: {
            background: "transparent",
            border: "none",
            color: "#92400e",
            cursor: "pointer",
            fontSize: "12px",
            padding: 0
          }
        },
        "\u2715"
      ));
    })), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", display: "flex", gap: "4px" } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: matInput,
        maxLength: 40,
        onChange: function(e) {
          setMatInput(e.target.value);
        },
        onKeyDown: function(e) {
          if (e.key === "Enter") {
            e.preventDefault();
            addMaterial();
          }
        },
        placeholder: t("engineering.material_ph") || "cardboard, tape, foil\u2026",
        style: {
          flex: 1,
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px",
          fontFamily: "inherit"
        }
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: addMaterial,
        style: {
          padding: "4px 10px",
          borderRadius: "999px",
          background: "#b45309",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "11px",
          cursor: "pointer"
        }
      },
      "+"
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#7c2d12" } }, t("engineering.candidate_satisfies") || "Constraints this concept satisfies"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" } }, constraints.map(function(c) {
      var on = (draft.constraintsSatisfied || []).indexOf(c.id) !== -1;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: c.id,
          type: "button",
          onClick: function() {
            toggleConstraint(c.id, "constraintsSatisfied", "constraintsPunted");
          },
          "aria-pressed": on,
          style: {
            padding: "4px 8px",
            borderRadius: "999px",
            background: on ? "#16a34a" : "#fff",
            color: on ? "#fff" : "#16a34a",
            border: "1px solid #16a34a",
            fontSize: "10px",
            fontWeight: 700,
            cursor: "pointer"
          }
        },
        c.criterion
      );
    }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: puntsValid ? "#7c2d12" : "#dc2626" } }, t("engineering.candidate_punts") || "Constraints this concept PUNTS", " * (\u22651 \u2014 what does it give up?)"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" } }, constraints.map(function(c) {
      var on = (draft.constraintsPunted || []).indexOf(c.id) !== -1;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: c.id,
          type: "button",
          onClick: function() {
            toggleConstraint(c.id, "constraintsPunted", "constraintsSatisfied");
          },
          "aria-pressed": on,
          style: {
            padding: "4px 8px",
            borderRadius: "999px",
            background: on ? "#dc2626" : "#fff",
            color: on ? "#fff" : "#dc2626",
            border: "1px solid #dc2626",
            fontSize: "10px",
            fontWeight: 700,
            cursor: "pointer"
          }
        },
        c.criterion
      );
    })), !puntsValid && /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 0", fontSize: "10px", color: "#dc2626", fontStyle: "italic" } }, t("engineering.punt_required") || "Claims to satisfy every constraint \u2014 punt at least one. Engineering means giving something up.")), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#7c2d12" } }, t("engineering.candidate_assumption") || "Riskiest assumption", /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: draft.riskiestAssumption || "",
        rows: 2,
        maxLength: 400,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { riskiestAssumption: e.target.value }));
        },
        placeholder: t("engineering.candidate_assumption_ph") || "If this concept fails, the most likely reason is\u2026",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit",
          resize: "vertical",
          minHeight: "40px"
        }
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "6px" } }, onCancel && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: onCancel,
        style: {
          padding: "6px 12px",
          borderRadius: "999px",
          background: "#f1f5f9",
          color: "#475569",
          border: "none",
          fontWeight: 700,
          fontSize: "11px",
          cursor: "pointer"
        }
      },
      t("common.cancel") || "Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: !canSave,
        onClick: function() {
          if (!canSave) return;
          onSave(Object.assign({}, draft, {
            ts: Date.now(),
            id: existing ? existing.id : "cand" + Date.now() + "_" + Math.floor(Math.random() * 1e3)
          }));
        },
        style: {
          padding: "6px 14px",
          borderRadius: "999px",
          background: canSave ? "#b45309" : "#cbd5e1",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "11px",
          cursor: canSave ? "pointer" : "not-allowed"
        }
      },
      existing ? t("common.save") || "Save" : t("engineering.add_candidate") || "Add candidate"
    )));
  }
  function DecisionMatrixGrid(props) {
    var t = props.t || function(k) {
      return k;
    };
    var concepts = props.concepts || [];
    var crits = props.criteria || [];
    var matrix = props.matrix || [];
    var onCellChange = props.onCellChange;
    var paretoDominated = props.paretoDominated || [];
    function cell(candidateId, criterionId) {
      return matrix.filter(function(m) {
        return m.candidateId === candidateId && m.criterionId === criterionId;
      })[0] || { score: "", reasonText: "" };
    }
    function weightedSum(candidateId) {
      var total = 0, wsum = 0;
      crits.forEach(function(c) {
        var w = parseInt(c.weight, 10) || 1;
        var s = cell(candidateId, c.id).score;
        if (typeof s === "number") {
          total += s * w;
          wsum += w;
        }
      });
      return wsum > 0 ? (total / wsum).toFixed(2) : "\u2014";
    }
    if (concepts.length === 0 || crits.length === 0) {
      return /* @__PURE__ */ React.createElement("p", { style: { margin: "6px 0", fontSize: "11px", color: "#64748b", fontStyle: "italic" } }, t("engineering.matrix_need_both") || "Add at least one candidate AND one criterion to build the decision matrix.");
    }
    return /* @__PURE__ */ React.createElement("div", { style: { overflowX: "auto" } }, /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "11px" } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { style: { textAlign: "left", padding: "6px", borderBottom: "1px solid #cbd5e1" } }, t("engineering.matrix_candidate") || "Candidate"), crits.map(function(c) {
      return /* @__PURE__ */ React.createElement("th", { key: c.id, style: { textAlign: "left", padding: "6px", borderBottom: "1px solid #cbd5e1", minWidth: "160px" } }, c.name, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "9px", color: "#64748b", fontWeight: 400 } }, c.direction, " ", c.target, " ", c.unit, " \xB7 w", c.weight));
    }), /* @__PURE__ */ React.createElement("th", { style: { textAlign: "left", padding: "6px", borderBottom: "1px solid #cbd5e1" } }, t("engineering.matrix_score") || "\u03A3(score\xD7w)/\u03A3w"))), /* @__PURE__ */ React.createElement("tbody", null, concepts.map(function(cn) {
      var dominated = paretoDominated.indexOf(cn.id) !== -1;
      return /* @__PURE__ */ React.createElement("tr", { key: cn.id, style: { background: dominated ? "#f1f5f9" : "transparent" } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "6px", borderBottom: "1px solid #e2e8f0", verticalAlign: "top" } }, /* @__PURE__ */ React.createElement("strong", null, cn.name), dominated && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "9px", color: "#64748b", fontStyle: "italic" } }, t("engineering.matrix_dominated") || "(possibly dominated)")), crits.map(function(cr) {
        var ce = cell(cn.id, cr.id);
        return /* @__PURE__ */ React.createElement("td", { key: cr.id, style: { padding: "6px", borderBottom: "1px solid #e2e8f0", verticalAlign: "top" } }, /* @__PURE__ */ React.createElement(
          "select",
          {
            value: ce.score || "",
            onChange: function(e) {
              var v = e.target.value === "" ? "" : parseInt(e.target.value, 10);
              onCellChange(cn.id, cr.id, { score: v });
            },
            style: {
              width: "60px",
              padding: "3px 5px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "11px"
            }
          },
          /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"),
          /* @__PURE__ */ React.createElement("option", { value: "1" }, "1"),
          /* @__PURE__ */ React.createElement("option", { value: "2" }, "2"),
          /* @__PURE__ */ React.createElement("option", { value: "3" }, "3"),
          /* @__PURE__ */ React.createElement("option", { value: "4" }, "4"),
          /* @__PURE__ */ React.createElement("option", { value: "5" }, "5")
        ), /* @__PURE__ */ React.createElement(
          "textarea",
          {
            value: ce.reasonText || "",
            rows: 2,
            maxLength: 400,
            onChange: function(e) {
              onCellChange(cn.id, cr.id, { reasonText: e.target.value });
            },
            placeholder: t("engineering.matrix_reason_ph") || "Why this score?",
            style: {
              marginTop: "2px",
              width: "100%",
              boxSizing: "border-box",
              padding: "3px 5px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "10px",
              fontFamily: "inherit",
              resize: "vertical",
              minHeight: "28px"
            }
          }
        ));
      }), /* @__PURE__ */ React.createElement("td", { style: {
        padding: "6px",
        borderBottom: "1px solid #e2e8f0",
        verticalAlign: "top",
        fontWeight: 800,
        color: dominated ? "#94a3b8" : "#1e293b"
      } }, weightedSum(cn.id)));
    }))));
  }
  function computeParetoDominated(concepts, criteria, matrix) {
    var dominated = [];
    function score(candidateId, criterionId) {
      var c2 = matrix.filter(function(m) {
        return m.candidateId === candidateId && m.criterionId === criterionId;
      })[0];
      return c2 && typeof c2.score === "number" ? c2.score : null;
    }
    function dirCmp(direction, a, b) {
      if (a === b) return 0;
      if (direction === "minimize") return a < b ? 1 : -1;
      return a > b ? 1 : -1;
    }
    for (var i = 0; i < concepts.length; i++) {
      var ci = concepts[i];
      var dominatedBySomeone = false;
      for (var j = 0; j < concepts.length; j++) {
        if (i === j) continue;
        var cj = concepts[j];
        var allGEQ = true, anyStrict = false;
        for (var k = 0; k < criteria.length; k++) {
          var crit = criteria[k];
          var si = score(ci.id, crit.id), sj = score(cj.id, crit.id);
          if (si == null || sj == null) {
            allGEQ = false;
            break;
          }
          var c = dirCmp(crit.direction, sj, si);
          if (c < 0) {
            allGEQ = false;
            break;
          }
          if (c > 0) anyStrict = true;
        }
        if (allGEQ && anyStrict) {
          dominatedBySomeone = true;
          break;
        }
      }
      if (dominatedBySomeone) dominated.push(ci.id);
    }
    return dominated;
  }
  function BuildLogTimeline(props) {
    var t = props.t || function(k) {
      return k;
    };
    var builds = props.builds || [];
    var testRuns = props.testRuns || [];
    var failureLog = props.failureLog || [];
    if (!builds.length) {
      return /* @__PURE__ */ React.createElement("p", { style: { margin: "6px 0", fontSize: "11px", color: "#64748b", fontStyle: "italic" } }, t("engineering.no_builds_yet") || "No builds yet \u2014 your build versions and test results will appear here.");
    }
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { style: { margin: "4px 0", fontSize: "12px", fontWeight: 800, color: "#1e293b" } }, t("engineering.build_timeline_label") || "Build trajectory"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "6px" } }, builds.map(function(b) {
      var runs = testRuns.filter(function(r) {
        return r.buildLogV === b.v;
      });
      var passes = runs.filter(function(r) {
        return r.passed === true;
      }).length;
      var fails = runs.filter(function(r) {
        return r.passed === false;
      }).length;
      var hasLoopOrigin = !!(b.loopBackOrigin && b.loopBackOrigin.fromStage);
      var linkedFail = failureLog.filter(function(f) {
        return runs.some(function(r) {
          return r.id === f.fromTestRunId;
        });
      }).length;
      return /* @__PURE__ */ React.createElement("div", { key: b.v, style: {
        flexShrink: 0,
        padding: "8px 10px",
        borderRadius: "10px",
        background: "#fff",
        border: "1px solid " + (hasLoopOrigin ? "#b45309" : "#cbd5e1"),
        minWidth: "160px",
        maxWidth: "220px"
      } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#b45309", fontWeight: 800 } }, "v", b.v, hasLoopOrigin && /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { marginLeft: "4px" } }, "\u{1F501}")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#64748b", marginTop: "2px" } }, new Date(b.ts || 0).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })), /* @__PURE__ */ React.createElement("div", { style: {
        marginTop: "4px",
        fontSize: "11px",
        color: "#1e293b",
        lineHeight: 1.4,
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
        overflow: "hidden"
      } }, b.buildText || ""), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", display: "flex", gap: "6px", fontSize: "10px" } }, passes > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#16a34a", fontWeight: 700 } }, passes, " pass"), fails > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#dc2626", fontWeight: 700 } }, fails, " fail"), linkedFail > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#b45309", fontWeight: 700 } }, "\u{1F501} " + linkedFail)));
    })));
  }
  function TradeOffSliderBlock(props) {
    var t = props.t || function(k) {
      return k;
    };
    var constraints = props.constraints || [];
    var criteria = props.criteria || [];
    var stakeholderName = props.stakeholderName || "";
    var existing = props.existing || null;
    var onSave = props.onSave;
    var _gained = useState(existing ? existing.criterion : "");
    var gainedId = _gained[0];
    var setGainedId = _gained[1];
    var _sac = useState(existing ? existing.sacrificedCriterion : "");
    var sacId = _sac[0];
    var setSacId = _sac[1];
    var _rank = useState(existing ? existing.acceptedPriorityRank || 3 : 3);
    var rank = _rank[0];
    var setRank = _rank[1];
    var _whose = useState(existing ? existing.whoseInterestThisServes || "" : "");
    var whose = _whose[0];
    var setWhose = _whose[1];
    var pool = [].concat(
      constraints.map(function(c) {
        return { id: c.id, name: c.criterion, tier: c.tier };
      }),
      criteria.map(function(cr) {
        return { id: cr.id, name: cr.name, tier: "criterion" };
      })
    );
    var canSave = gainedId && sacId && gainedId !== sacId && whose.trim().length >= 10 && normName(whose) !== normName(stakeholderName);
    return /* @__PURE__ */ React.createElement("div", { style: {
      padding: "10px",
      borderRadius: "10px",
      background: "#fff",
      border: "1px solid #cbd5e1",
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#16a34a" } }, t("engineering.tradeoff_gained") || "Axis I gained on", " *", /* @__PURE__ */ React.createElement(
      "select",
      {
        value: gainedId,
        onChange: function(e) {
          setGainedId(e.target.value);
        },
        style: {
          marginTop: "2px",
          width: "100%",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 pick a criterion / constraint \u2014"),
      pool.map(function(p) {
        return /* @__PURE__ */ React.createElement("option", { key: p.id, value: p.id }, p.name, " (", p.tier, ")");
      })
    )), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#dc2626" } }, t("engineering.tradeoff_sacrificed") || "Axis I sacrificed", " *", /* @__PURE__ */ React.createElement(
      "select",
      {
        value: sacId,
        onChange: function(e) {
          setSacId(e.target.value);
        },
        style: {
          marginTop: "2px",
          width: "100%",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 pick a different axis \u2014"),
      pool.filter(function(p) {
        return p.id !== gainedId;
      }).map(function(p) {
        return /* @__PURE__ */ React.createElement("option", { key: p.id, value: p.id }, p.name, " (", p.tier, ")");
      })
    ))), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#475569" } }, t("engineering.tradeoff_rank") || "How strongly I chose this", " (1 = reluctantly accepted, 5 = strongly chose)", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        min: "1",
        max: "5",
        value: rank,
        onChange: function(e) {
          setRank(parseInt(e.target.value, 10));
        },
        style: { width: "100%", marginTop: "4px" }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#64748b", textAlign: "center" } }, rank)), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#7c2d12" } }, t("engineering.tradeoff_whose") || "Whose interest does this serve?", " * (\u226510 chars; not the same as the named stakeholder)", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: whose,
        maxLength: 120,
        onChange: function(e) {
          setWhose(e.target.value);
        },
        placeholder: t("engineering.tradeoff_whose_ph") || "e.g. the kids who eat at 12:30pm, not Ms. Patel",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "6px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: !canSave,
        onClick: function() {
          if (!canSave) return;
          onSave({
            criterion: gainedId,
            sacrificedCriterion: sacId,
            acceptedPriorityRank: rank,
            whoseInterestThisServes: whose.trim()
          });
        },
        style: {
          padding: "6px 14px",
          borderRadius: "999px",
          background: canSave ? "#b45309" : "#cbd5e1",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "11px",
          cursor: canSave ? "pointer" : "not-allowed"
        }
      },
      existing ? t("engineering.update_tradeoff") || "Update trade-off" : t("engineering.save_tradeoff") || "Record trade-off"
    )));
  }
  function FailureLoopCard(props) {
    var t = props.t || function(k) {
      return k;
    };
    var entry = props.entry;
    var sourceTest = props.sourceTest;
    var retest = props.retest;
    if (!entry) return null;
    var deltaText = "\u2014";
    var deltaPass = null;
    if (retest && sourceTest && Number.isFinite(retest.measured) && Number.isFinite(sourceTest.measured)) {
      if (sourceTest.measured === 0) {
        deltaPass = retest.measured !== 0 || retest.passed !== sourceTest.passed;
        deltaText = "0 \u2192 " + retest.measured;
      } else {
        var relChange = (retest.measured - sourceTest.measured) / Math.abs(sourceTest.measured);
        deltaPass = Math.abs(relChange) > 0.05 || retest.passed !== sourceTest.passed;
        deltaText = (relChange * 100).toFixed(1) + "% change";
      }
    }
    return /* @__PURE__ */ React.createElement("div", { style: {
      padding: "10px 12px",
      borderRadius: "10px",
      background: "#fff",
      border: "1px solid #cbd5e1",
      display: "flex",
      flexDirection: "column",
      gap: "6px"
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#7c2d12" } }, /* @__PURE__ */ React.createElement("strong", null, t("engineering.failure_mode") || "Failure mode:", " "), entry.modeText), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#475569" } }, /* @__PURE__ */ React.createElement("strong", null, t("engineering.cause_hypothesis") || "Cause hypothesis:", " "), entry.causeHypothesisText), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#475569" } }, /* @__PURE__ */ React.createElement("strong", null, t("engineering.changed_variable") || "Changed variable:", " "), entry.changedVariable && entry.changedVariable.name || "\u2014", entry.changedVariable && " (" + entry.changedVariable.fromValue + " \u2192 " + entry.changedVariable.toValue + ")"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#475569" } }, /* @__PURE__ */ React.createElement("strong", null, t("engineering.predicted_effect") || "Predicted effect:", " "), entry.predictedEffectText), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: deltaPass === false ? "#dc2626" : deltaPass === true ? "#16a34a" : "#64748b" } }, /* @__PURE__ */ React.createElement("strong", null, t("engineering.retest_delta") || "Retest delta:", " "), deltaText, deltaPass === false && " \u2014 " + (t("engineering.delta_too_small") || "too small; rerun with a real change")), entry.predictionVsRealityRadio && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#1e293b" } }, /* @__PURE__ */ React.createElement("strong", null, t("engineering.pred_vs_reality") || "Prediction vs reality:", " "), /* @__PURE__ */ React.createElement("span", { style: {
      color: entry.predictionVsRealityRadio === "confirmed" ? "#16a34a" : entry.predictionVsRealityRadio === "refuted" ? "#dc2626" : "#d97706",
      fontWeight: 700
    } }, entry.predictionVsRealityRadio)));
  }
  function DefineProblemStage(props) {
    var t = props.t, ctx = props.ctx;
    var journal = ctx.journal, setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var stageNote = (journal.stageNotes || {}).define_problem || {};
    var floors = devFloors(journal.devLevel || "6_8");
    var _problemText = useState(stageNote.problemText || "");
    var problemText = _problemText[0];
    var setProblemText = _problemText[1];
    var _safetyJust = useState(stageNote.safetyExemptionJustification || "");
    var safetyJust = _safetyJust[0];
    var setSafetyJust = _safetyJust[1];
    var _measurabilityAck = useState(stageNote.measurabilityAcknowledged || "");
    var measurabilityAck = _measurabilityAck[0];
    var setMeasurabilityAck = _measurabilityAck[1];
    var _addingC = useState(false);
    var addingC = _addingC[0];
    var setAddingC = _addingC[1];
    var _addingCr = useState(false);
    var addingCr = _addingCr[0];
    var setAddingCr = _addingCr[1];
    var _aiResult = useState(null);
    var aiResult = _aiResult[0];
    var setAiResult = _aiResult[1];
    var _busy = useState(false);
    var busy = _busy[0];
    var setBusy = _busy[1];
    useEffect(function() {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.stageNotes = Object.assign({}, prev.stageNotes || {});
        next.stageNotes.define_problem = Object.assign({}, next.stageNotes.define_problem || {}, {
          problemText,
          safetyExemptionJustification: safetyJust,
          measurabilityAcknowledged: measurabilityAck,
          ts: Date.now()
        });
        return next;
      });
    }, [problemText, safetyJust, measurabilityAck]);
    var crits = journal.criteria || [];
    var cons = journal.constraintMatrix || [];
    var hard = hardConstraints(journal);
    var hasSafety = crits.some(function(c) {
      return c.kind === "physical-safety";
    });
    var addCriterion = function(crit) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.criteria = (prev.criteria || []).concat([crit]);
        return next;
      });
      setAddingCr(false);
    };
    var removeCriterion = function(id) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.criteria = (prev.criteria || []).filter(function(c) {
          return c.id !== id;
        });
        return next;
      });
    };
    var addConstraint = function(c) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.constraintMatrix = (prev.constraintMatrix || []).concat([Object.assign({}, c, {
          id: c.id || "con" + Date.now() + "_" + Math.floor(Math.random() * 1e3)
        })]);
        return next;
      });
      setAddingC(false);
    };
    var removeConstraint = function(id) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.constraintMatrix = (prev.constraintMatrix || []).filter(function(c) {
          return c.id !== id;
        });
        return next;
      });
    };
    var askConstraintExcavator = async function() {
      setBusy(true);
      setAiResult(null);
      try {
        var res = await ctx.ask(TOUCHPOINTS.constraint_excavator, ctx);
        setAiResult(res);
      } finally {
        setBusy(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      ExemplarGate,
      {
        t,
        stageKey: "define_problem",
        journal,
        setJournal,
        primitives,
        pair: EXEMPLAR_PAIRS.define_problem
      }
    ), /* @__PURE__ */ React.createElement(StakeholderCard, { t, journal, setJournal, editable: true }), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("engineering.problem_text_label") || "Problem statement",
        help: t("engineering.problem_text_help") || "Name the problem AND name your stakeholder. \u2265" + floors.problem + " chars. Must mention the stakeholder by name.",
        value: problemText,
        onChange: setProblemText,
        rows: 4,
        max: 1500,
        placeholder: t("engineering.problem_text_ph") || "e.g. Ms. Patel needs a way to keep 60 lunches warm from 11:00am pickup to 12:30pm classroom serve, using \u2264$5 of household materials, no electrical heating allowed."
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("engineering.criteria_title") || "Measurable criteria", " (", crits.length, "/2+)"), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 8px", fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, t("engineering.criteria_help") || "What does 'good' mean \u2014 each with a unit and a direction? At least 2 (one should be physical-safety, or justify why no safety constraint applies)."), /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" } }, crits.map(function(c) {
      return /* @__PURE__ */ React.createElement("li", { key: c.id, style: {
        padding: "6px 10px",
        borderRadius: "8px",
        background: "#f8fafc",
        fontSize: "12px",
        color: "#1e293b",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, c.kind === "physical-safety" ? "\u{1F6E1}\uFE0F" : "\u2022"), /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("strong", null, c.name), " \u2014 ", c.direction, " ", c.target, " ", c.unit, " ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#64748b" } }, "(w", c.weight, ", ", c.kind, ")")), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            removeCriterion(c.id);
          },
          "aria-label": "Remove criterion",
          style: { background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }
        },
        "\u2715"
      ));
    })), addingCr ? /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement(CriterionRow, { t, onSave: addCriterion, onCancel: function() {
      setAddingCr(false);
    } })) : /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          setAddingCr(true);
        },
        style: {
          marginTop: "8px",
          padding: "5px 12px",
          borderRadius: "999px",
          background: "#b45309",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "11px",
          cursor: "pointer"
        }
      },
      "+ ",
      t("engineering.add_criterion") || "Add criterion"
    ), !hasSafety && crits.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("engineering.safety_exemption_label") || "If no physical-safety criterion applies, justify why (\u226560 chars)",
        value: safetyJust,
        onChange: setSafetyJust,
        rows: 2,
        max: 600,
        placeholder: t("engineering.safety_exemption_ph") || "e.g. This design has no moving parts, no heat above ambient, no sharp edges, no choking hazards."
      }
    ))), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("engineering.constraints_title") || "Hard constraints", " (", hard.length, "/2+)"), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 8px", fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, t("engineering.constraints_help") || "Hard limits the design must respect \u2014 each with a numeric target and a real unit. 'Must be sturdy' is not a constraint; '\u22652kg static load for 30s' is."), /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" } }, cons.map(function(c) {
      return /* @__PURE__ */ React.createElement("li", { key: c.id, style: {
        padding: "6px 10px",
        borderRadius: "8px",
        background: c.tier === "hard" ? "#fef3c7" : "#f8fafc",
        border: "1px solid " + (c.tier === "hard" ? "#fcd34d" : "#e2e8f0"),
        fontSize: "12px",
        color: "#1e293b",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, c.tier === "hard" ? "\u{1F4CF}" : c.tier === "soft" ? "\u{1F4D0}" : "\u2728"), /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("strong", null, c.criterion), " \u2014 ", c.target, " ", c.unit, " ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#64748b" } }, "(", c.source, ", ", c.tier, ")")), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            removeConstraint(c.id);
          },
          "aria-label": "Remove constraint",
          style: { background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }
        },
        "\u2715"
      ));
    })), addingC ? /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement(ConstraintRow, { t, onSave: addConstraint, onCancel: function() {
      setAddingC(false);
    } })) : /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          setAddingC(true);
        },
        style: {
          marginTop: "8px",
          padding: "5px 12px",
          borderRadius: "999px",
          background: "#b45309",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "11px",
          cursor: "pointer"
        }
      },
      "+ ",
      t("engineering.add_constraint") || "Add constraint"
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: busy,
        onClick: askConstraintExcavator,
        style: {
          alignSelf: "flex-start",
          padding: "10px 18px",
          borderRadius: "999px",
          background: busy ? "#cbd5e1" : "#0d9488",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "12px",
          cursor: busy ? "wait" : "pointer"
        }
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F916} "),
      busy ? t("engineering.surfacing") || "Surfacing\u2026" : t("engineering.constraint_excavator_button") || "Surface constraints I may have missed"
    ), aiResult && aiResult.blocked && /* @__PURE__ */ React.createElement(BlockedNote, { t, reason: aiResult.detail || aiResult.blockedReason }), aiResult && !aiResult.blocked && aiResult.data && /* @__PURE__ */ React.createElement(AiResultPanel, { t, data: aiResult.data, primitives }), aiResult && !aiResult.blocked && aiResult.data && Array.isArray(aiResult.data.measurability_probe_questions) && aiResult.data.measurability_probe_questions.length > 0 && /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("engineering.measurability_ack_label") || "Acknowledge AI measurability probes (\u226530 chars if you keep a constraint unchanged)",
        help: t("engineering.measurability_ack_help") || "If the AI flagged a measurability concern and you kept the constraint as is, explain why it is still binding.",
        value: measurabilityAck,
        onChange: setMeasurabilityAck,
        rows: 2,
        max: 600
      }
    ));
  }
  function DevelopCandidatesStage(props) {
    var t = props.t, ctx = props.ctx;
    var journal = ctx.journal, setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var floors = devFloors(journal.devLevel || "6_8");
    var concepts = journal.candidateConcepts || [];
    var crits = journal.criteria || [];
    var cons = journal.constraintMatrix || [];
    var matrix = journal.decisionMatrix || [];
    var _adding = useState(false);
    var adding = _adding[0];
    var setAdding = _adding[1];
    var _aiResult = useState(null);
    var aiResult = _aiResult[0];
    var setAiResult = _aiResult[1];
    var _busy = useState(false);
    var busy = _busy[0];
    var setBusy = _busy[1];
    var paretoDominated = useMemo(function() {
      return computeParetoDominated(concepts, crits, matrix);
    }, [concepts, crits, matrix]);
    var addCandidate = function(c) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.candidateConcepts = (prev.candidateConcepts || []).concat([c]);
        return next;
      });
      setAdding(false);
    };
    var removeCandidate = function(id) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.candidateConcepts = (prev.candidateConcepts || []).filter(function(c) {
          return c.id !== id;
        });
        next.decisionMatrix = (prev.decisionMatrix || []).filter(function(m) {
          return m.candidateId !== id;
        });
        return next;
      });
    };
    var onCellChange = function(candidateId, criterionId, patch) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        var existing = (prev.decisionMatrix || []).filter(function(m) {
          return m.candidateId === candidateId && m.criterionId === criterionId;
        })[0];
        if (existing) {
          next.decisionMatrix = (prev.decisionMatrix || []).map(function(m) {
            if (m.candidateId === candidateId && m.criterionId === criterionId) {
              return Object.assign({}, m, patch, { ts: Date.now() });
            }
            return m;
          });
        } else {
          next.decisionMatrix = (prev.decisionMatrix || []).concat([Object.assign({
            candidateId,
            criterionId,
            ts: Date.now(),
            score: "",
            reasonText: ""
          }, patch)]);
        }
        return next;
      });
    };
    var askDominanceFinder = async function() {
      setBusy(true);
      setAiResult(null);
      try {
        var res = await ctx.ask(TOUCHPOINTS.dominated_solution_finder, ctx);
        setAiResult(res);
      } finally {
        setBusy(false);
      }
    };
    var matrixComplete = concepts.length > 0 && crits.length > 0 && concepts.every(function(cn) {
      return crits.every(function(cr) {
        var cell = matrix.filter(function(m) {
          return m.candidateId === cn.id && m.criterionId === cr.id;
        })[0];
        return cell && typeof cell.score === "number" && cell.score >= 1 && cell.score <= 5;
      });
    });
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      ExemplarGate,
      {
        t,
        stageKey: "develop_candidates",
        journal,
        setJournal,
        primitives,
        pair: EXEMPLAR_PAIRS.develop_candidates
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("engineering.candidates_title") || "Candidate concepts", " (", concepts.length, "/", floors.candidates, "+)"), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 8px", fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, t("engineering.candidates_help") || "At least " + floors.candidates + " GENUINELY DIFFERENT concepts. Each must PUNT at least one constraint \u2014 no candidate satisfies them all."), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px" } }, concepts.map(function(cn) {
      var dominated = paretoDominated.indexOf(cn.id) !== -1;
      return /* @__PURE__ */ React.createElement("div", { key: cn.id, style: {
        padding: "10px",
        borderRadius: "10px",
        background: dominated ? "#f1f5f9" : "#fafafa",
        border: "1px solid " + (dominated ? "#cbd5e1" : "#e2e8f0")
      } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "12px", color: "#1e293b" } }, cn.name), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            removeCandidate(cn.id);
          },
          "aria-label": "Remove candidate",
          style: { background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }
        },
        "\u2715"
      )), dominated && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "2px", fontSize: "10px", color: "#94a3b8", fontStyle: "italic" } }, t("engineering.candidate_dominated") || "Possibly dominated on this matrix."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", fontSize: "11px", color: "#475569", lineHeight: 1.45 } }, cn.sketchText), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", fontSize: "10px", color: "#16a34a" } }, t("engineering.satisfies") || "Satisfies", ": ", (cn.constraintsSatisfied || []).length), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#dc2626" } }, t("engineering.punts") || "Punts", ": ", (cn.constraintsPunted || []).length), (cn.materialsList || []).length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", fontSize: "10px", color: "#475569" } }, (cn.materialsList || []).slice(0, 6).join(" \xB7 "), (cn.materialsList || []).length > 6 && "\u2026"));
    })), adding ? /* @__PURE__ */ React.createElement("div", { style: { marginTop: "10px" } }, /* @__PURE__ */ React.createElement(
      CandidateCard,
      {
        t,
        constraints: cons,
        onSave: addCandidate,
        onCancel: function() {
          setAdding(false);
        },
        primitives
      }
    )) : /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          setAdding(true);
        },
        style: {
          marginTop: "10px",
          padding: "6px 12px",
          borderRadius: "999px",
          background: "#b45309",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "11px",
          cursor: "pointer"
        }
      },
      "+ ",
      t("engineering.add_candidate") || "Add candidate"
    )), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("engineering.matrix_title") || "Decision matrix"), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 8px", fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, t("engineering.matrix_help") || "Score each candidate against each criterion (1\u20135) with a reason \u2014 small weight changes flip the winner; that's the lesson. Greyed rows are computed as Pareto-dominated."), /* @__PURE__ */ React.createElement(
      DecisionMatrixGrid,
      {
        t,
        concepts,
        criteria: crits,
        matrix,
        onCellChange,
        paretoDominated
      }
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: busy || !matrixComplete,
        onClick: askDominanceFinder,
        style: {
          alignSelf: "flex-start",
          padding: "10px 18px",
          borderRadius: "999px",
          background: busy || !matrixComplete ? "#cbd5e1" : "#0d9488",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "12px",
          cursor: busy || !matrixComplete ? "not-allowed" : "pointer"
        }
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F916} "),
      busy ? t("engineering.checking") || "Checking\u2026" : t("engineering.dominated_button") || "Which of my candidates is dominated?"
    ), aiResult && aiResult.blocked && /* @__PURE__ */ React.createElement(BlockedNote, { t, reason: aiResult.detail || aiResult.blockedReason }), aiResult && !aiResult.blocked && aiResult.data && /* @__PURE__ */ React.createElement(AiResultPanel, { t, data: aiResult.data, primitives }));
  }
  function PlanTestStage(props) {
    var t = props.t, ctx = props.ctx;
    var journal = ctx.journal, setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var floors = devFloors(journal.devLevel || "6_8");
    var stageNote = (journal.stageNotes || {}).plan_test || {};
    var concepts = journal.candidateConcepts || [];
    var crits = journal.criteria || [];
    var cons = journal.constraintMatrix || [];
    var ledger = journal.tradeOffLedger || [];
    var protocols = journal.testProtocol || [];
    var _sel = useState(stageNote.selectedCandidateId || "");
    var selected = _sel[0];
    var setSelected = _sel[1];
    var _decl = useState(stageNote.tradeOffDeclaration || "");
    var decl = _decl[0];
    var setDecl = _decl[1];
    var _dominatedJust = useState(stageNote.dominatedPickJustification || "");
    var domJust = _dominatedJust[0];
    var setDomJust = _dominatedJust[1];
    var _syn = useState(stageNote.tradeoffSynthesis || "");
    var tradeoffSyn = _syn[0];
    var setTradeoffSyn = _syn[1];
    var _invResult = useState(null);
    var invResult = _invResult[0];
    var setInvResult = _invResult[1];
    var _invBusy = useState(false);
    var invBusy = _invBusy[0];
    var setInvBusy = _invBusy[1];
    var paretoDominated = useMemo(function() {
      return computeParetoDominated(concepts, crits, journal.decisionMatrix || []);
    }, [concepts, crits, journal.decisionMatrix]);
    var pickedDominated = selected && paretoDominated.indexOf(selected) !== -1;
    useEffect(function() {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.stageNotes = Object.assign({}, prev.stageNotes || {});
        next.stageNotes.plan_test = Object.assign({}, next.stageNotes.plan_test || {}, {
          selectedCandidateId: selected,
          tradeOffDeclaration: decl,
          dominatedPickJustification: domJust,
          tradeoffSynthesis: tradeoffSyn,
          ts: Date.now()
        });
        return next;
      });
    }, [selected, decl, domJust, tradeoffSyn]);
    var addTradeoff = function(entry) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        var v = (prev.tradeOffLedger || []).map(function(r) {
          return r.v || 0;
        }).reduce(function(a, b) {
          return Math.max(a, b);
        }, 0) + 1;
        next.tradeOffLedger = (prev.tradeOffLedger || []).concat([Object.assign({}, entry, {
          v,
          ts: Date.now(),
          accepted: decl,
          justification: decl
        })]);
        return next;
      });
    };
    var removeTradeoff = function(v) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.tradeOffLedger = (prev.tradeOffLedger || []).filter(function(r) {
          return r.v !== v;
        });
        return next;
      });
    };
    var addProtocol = function(crit) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.testProtocol = (prev.testProtocol || []).concat([{
          id: "tp" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
          criterionId: crit.id,
          procedureText: "",
          instrument: "",
          unit: crit.unit,
          pass_threshold: crit.target,
          ts: Date.now()
        }]);
        return next;
      });
    };
    var updateProtocol = function(id, patch) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.testProtocol = (prev.testProtocol || []).map(function(p) {
          return p.id === id ? Object.assign({}, p, patch) : p;
        });
        return next;
      });
    };
    var criterionMissingProtocol = crits.filter(function(c) {
      return !protocols.some(function(p) {
        return p.criterionId === c.id;
      });
    });
    var sp = journal.stakeholderProfile || {};
    var declTokenCount = useMemo(function() {
      if (!decl) return 0;
      var norm = normalizeForCompare(decl);
      var count = 0;
      crits.forEach(function(c) {
        if (norm.indexOf(normalizeForCompare(c.name)) !== -1) count++;
      });
      cons.forEach(function(c) {
        if (norm.indexOf(normalizeForCompare(c.criterion)) !== -1) count++;
      });
      return count;
    }, [decl, crits, cons]);
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      ExemplarGate,
      {
        t,
        stageKey: "plan_test",
        journal,
        setJournal,
        primitives,
        pair: EXEMPLAR_PAIRS.plan_test
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("engineering.select_candidate_title") || "Pick the candidate you will test"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: selected,
        onChange: function(e) {
          setSelected(e.target.value);
        },
        style: {
          width: "100%",
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          fontSize: "13px",
          fontFamily: "inherit"
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 pick one \u2014"),
      concepts.map(function(c) {
        var dom = paretoDominated.indexOf(c.id) !== -1;
        return /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.id }, c.name, dom ? " (possibly dominated)" : "");
      })
    ), pickedDominated && /* @__PURE__ */ React.createElement("div", { style: {
      marginTop: "8px",
      padding: "8px 10px",
      borderRadius: "8px",
      background: "#fef3c7",
      border: "1px solid #fbbf24",
      fontSize: "11px",
      color: "#92400e"
    } }, /* @__PURE__ */ React.createElement("strong", null, t("engineering.dominated_warning") || "This candidate is Pareto-dominated on the current matrix."), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 0", fontSize: "11px" } }, t("engineering.dominated_just_help") || "You can still pick it, but justify why (\u226540 chars, reference a criterion by name)."), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: domJust,
        onChange: function(e) {
          setDomJust(e.target.value);
        },
        rows: 2,
        maxLength: 600,
        placeholder: t("engineering.dominated_just_ph") || "e.g. lower scores on temp-hold but Ms. Patel prioritizes set-up time which the matrix under-weighted\u2026",
        style: {
          marginTop: "6px",
          width: "100%",
          boxSizing: "border-box",
          padding: "6px 10px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      }
    ))), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("engineering.tradeoff_declaration_label") || "Trade-off declaration",
        help: t("engineering.tradeoff_declaration_help") || "Name BOTH axes you weighted (the gained AND the sacrificed) by their actual criterion or constraint names. \u2265" + floors.tradeOffDecl + " chars. We detect " + declTokenCount + " criterion/constraint name(s) in your declaration so far.",
        value: decl,
        onChange: setDecl,
        rows: 4,
        max: 1500,
        placeholder: t("engineering.tradeoff_declaration_ph") || "e.g. I picked the ceramic-stone candidate, gaining temperature-hold but sacrificing total mass \u2014 Ms. Patel said warm lunches outweigh arm strain because she has a cart."
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("engineering.tradeoff_ledger_title") || "Trade-off ledger (one row per sacrifice)"), ledger.length === 0 && /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 6px", fontSize: "11px", color: "#64748b", fontStyle: "italic" } }, t("engineering.no_tradeoffs_yet") || "No trade-offs recorded yet. Use the slider below to record one."), /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" } }, ledger.map(function(e) {
      var gainedName = (cons.filter(function(c) {
        return c.id === e.criterion;
      })[0] || {}).criterion || (crits.filter(function(c) {
        return c.id === e.criterion;
      })[0] || {}).name || e.criterion;
      var sacName = (cons.filter(function(c) {
        return c.id === e.sacrificedCriterion;
      })[0] || {}).criterion || (crits.filter(function(c) {
        return c.id === e.sacrificedCriterion;
      })[0] || {}).name || e.sacrificedCriterion;
      return /* @__PURE__ */ React.createElement("li", { key: e.v, style: {
        padding: "6px 10px",
        borderRadius: "8px",
        background: "#f8fafc",
        fontSize: "11px",
        color: "#1e293b",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      } }, /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("strong", { style: { color: "#16a34a" } }, "+ ", gainedName), " ", /* @__PURE__ */ React.createElement("span", { style: { color: "#64748b" } }, "vs"), " ", /* @__PURE__ */ React.createElement("strong", { style: { color: "#dc2626" } }, "\u2212 ", sacName), " ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#64748b" } }, "(rank ", e.acceptedPriorityRank, ", for ", e.whoseInterestThisServes, ")")), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            removeTradeoff(e.v);
          },
          "aria-label": "Remove trade-off",
          style: { background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }
        },
        "\u2715"
      ));
    })), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement(
      TradeOffSliderBlock,
      {
        t,
        constraints: cons,
        criteria: crits,
        stakeholderName: sp.name || "",
        onSave: addTradeoff
      }
    ))), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("engineering.test_protocol_title") || "Test protocol (one per criterion)"), criterionMissingProtocol.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "8px", display: "flex", gap: "6px", flexWrap: "wrap" } }, criterionMissingProtocol.map(function(c) {
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: c.id,
          type: "button",
          onClick: function() {
            addProtocol(c);
          },
          style: {
            padding: "4px 10px",
            borderRadius: "999px",
            background: "#fef3c7",
            color: "#92400e",
            border: "1px solid #fcd34d",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer"
          }
        },
        "+ ",
        t("engineering.protocol_for") || "Add test for",
        " ",
        c.name
      );
    })), /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" } }, protocols.map(function(p) {
      var crit = crits.filter(function(c) {
        return c.id === p.criterionId;
      })[0];
      return /* @__PURE__ */ React.createElement("li", { key: p.id, style: {
        padding: "8px 10px",
        borderRadius: "8px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        gap: "4px"
      } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#1e293b" } }, crit ? crit.name : "(criterion deleted)", " ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#64748b", fontWeight: 400 } }, "pass = ", p.pass_threshold, " ", p.unit)), /* @__PURE__ */ React.createElement(
        "textarea",
        {
          value: p.procedureText || "",
          rows: 2,
          maxLength: 1e3,
          onChange: function(e) {
            updateProtocol(p.id, { procedureText: e.target.value });
          },
          placeholder: t("engineering.protocol_text_ph") || "Procedure (\u2265" + floors.procedure + " chars): how exactly will you measure this?",
          style: {
            width: "100%",
            boxSizing: "border-box",
            padding: "6px 8px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            fontSize: "12px",
            fontFamily: "inherit"
          }
        }
      ), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          value: p.instrument || "",
          maxLength: 80,
          onChange: function(e) {
            updateProtocol(p.id, { instrument: e.target.value });
          },
          placeholder: t("engineering.protocol_instrument_ph") || "Instrument (e.g. digital thermometer)",
          style: {
            width: "100%",
            boxSizing: "border-box",
            padding: "5px 8px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            fontSize: "11px",
            fontFamily: "inherit"
          }
        }
      ));
    }))), /* @__PURE__ */ React.createElement("div", { style: {
      padding: "12px",
      borderRadius: "12px",
      background: "#fef2f2",
      border: "1px solid #fca5a5"
    } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#991b1b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F441}\uFE0F "), t("engineering.tradeoff_inverter_title") || "Inversion check (antagonist AI)"), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 8px", fontSize: "11px", color: "#7f1d1d", lineHeight: 1.5 } }, t("engineering.tradeoff_inverter_help") || "The single most under-defended move in engineering is conviction about a trade-off without ever voicing the inverse stakeholder. This AI is an antagonist \u2014 it voices a stakeholder who valued your sacrificed criterion above your gained one. It will NOT suggest a different design. After it fires, you must author a synthesis (\u226580c) reckoning with what you heard."), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: invBusy,
        onClick: async function() {
          setInvBusy(true);
          setInvResult(null);
          try {
            var res = await ctx.ask(TOUCHPOINTS.tradeoff_inverter, ctx);
            setInvResult(res);
          } finally {
            setInvBusy(false);
          }
        },
        style: {
          alignSelf: "flex-start",
          padding: "8px 16px",
          borderRadius: "999px",
          background: invBusy ? "#cbd5e1" : "#991b1b",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "12px",
          cursor: invBusy ? "wait" : "pointer"
        }
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F916} "),
      invBusy ? t("engineering.inverting") || "Voicing the antagonist\u2026" : t("engineering.tradeoff_inverter_button") || "Voice the stakeholder with inverted priorities"
    ), invResult && invResult.blocked && /* @__PURE__ */ React.createElement(BlockedNote, { t, reason: invResult.detail || invResult.blockedReason }), invResult && !invResult.blocked && invResult.data && /* @__PURE__ */ React.createElement("div", { style: {
      marginTop: "10px",
      padding: "12px",
      background: "#fff",
      border: "1px solid #fca5a5",
      borderRadius: "10px"
    } }, primitives.SuggestionBadge && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "6px" } }, /* @__PURE__ */ React.createElement(primitives.SuggestionBadge, { t })), Array.isArray(invResult.data.per_tradeoff) && invResult.data.per_tradeoff.map(function(pt, i) {
      return /* @__PURE__ */ React.createElement("div", { key: i, style: {
        marginBottom: "10px",
        paddingBottom: "8px",
        borderBottom: i < invResult.data.per_tradeoff.length - 1 ? "1px dashed #fca5a5" : "none"
      } }, /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 6px", fontSize: "11px", color: "#1e293b", fontStyle: "italic" } }, "You wrote: ", /* @__PURE__ */ React.createElement("strong", null, '"', pt.quoted_phrase, '"')), Array.isArray(pt.inversion_questions) && pt.inversion_questions.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#991b1b" } }, "An inverse stakeholder would ask:"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "4px 0 0", paddingLeft: "20px", fontSize: "12px", color: "#1e293b" } }, pt.inversion_questions.map(function(q, j) {
        return /* @__PURE__ */ React.createElement("li", { key: j }, q);
      }))), Array.isArray(pt.stakeholder_voice_questions) && pt.stakeholder_voice_questions.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#991b1b" } }, "In their voice:"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "4px 0 0", paddingLeft: "20px", fontSize: "12px", color: "#1e293b" } }, pt.stakeholder_voice_questions.map(function(q, j) {
        return /* @__PURE__ */ React.createElement("li", { key: j }, q);
      }))));
    }), Array.isArray(invResult.data.what_did_you_not_consider_questions) && invResult.data.what_did_you_not_consider_questions.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#991b1b" } }, "What did you not consider?"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "4px 0 0", paddingLeft: "20px", fontSize: "12px", color: "#1e293b" } }, invResult.data.what_did_you_not_consider_questions.map(function(q, j) {
      return /* @__PURE__ */ React.createElement("li", { key: j }, q);
    })))), (journal.aiHistory || []).some(function(h) {
      return h.touchpoint === "tradeoff_inverter" && !h.blocked;
    }) && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "10px" } }, /* @__PURE__ */ React.createElement("label", { style: { display: "block", fontSize: "11px", fontWeight: 700, color: "#991b1b" } }, t("engineering.tradeoff_synthesis_label") || "Trade-off synthesis (\u226580 chars; you author this, not AI)", /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: tradeoffSyn,
        rows: 3,
        maxLength: 1500,
        onChange: function(e) {
          setTradeoffSyn(e.target.value);
        },
        placeholder: t("engineering.tradeoff_synthesis_ph") || "What did you take from the antagonist's voice? Were they right? Did your trade-off hold? Your words only \u2014 do not echo the AI's phrasing back.",
        style: {
          marginTop: "4px",
          width: "100%",
          boxSizing: "border-box",
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid " + (tradeoffSyn && tradeoffSyn.length < 80 ? "#dc2626" : "#cbd5e1"),
          fontSize: "12px",
          fontFamily: "inherit"
        }
      }
    )), tradeoffSyn && tradeoffSyn.length < 80 && /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 0", fontSize: "10px", color: "#dc2626" } }, "\u226580 chars required (", tradeoffSyn.trim().length, " so far)."))), /* @__PURE__ */ React.createElement("p", { style: { margin: "6px 0 0", fontSize: "11px", color: "#64748b", fontStyle: "italic" } }, t("engineering.plan_one_ai_note") || "Only one AI helper on this stage by design \u2014 the antagonist inversion above. AI cannot design your test, pick your trade-off axes, or tell you whose interest matters. The discipline of named sacrifice IS engineering."));
  }
  function BuildTestStage(props) {
    var t = props.t, ctx = props.ctx;
    var journal = ctx.journal, setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var floors = devFloors(journal.devLevel || "6_8");
    var planNote = (journal.stageNotes || {}).plan_test || {};
    var selectedCandidateId = planNote.selectedCandidateId || "";
    var crits = journal.criteria || [];
    var cons = journal.constraintMatrix || [];
    var protocols = journal.testProtocol || [];
    var builds = journal.buildLog || [];
    var runs = journal.testRun || [];
    var feedback = journal.stakeholderFeedback || [];
    var sp = journal.stakeholderProfile || {};
    var _buildText = useState("");
    var buildText = _buildText[0];
    var setBuildText = _buildText[1];
    var _matsActual = useState("");
    var matsActual = _matsActual[0];
    var setMatsActual = _matsActual[1];
    var _photoDesc = useState("");
    var photoDesc = _photoDesc[0];
    var setPhotoDesc = _photoDesc[1];
    var _runDraft = useState({});
    var runDraft = _runDraft[0];
    var setRunDraft = _runDraft[1];
    var _fbText = useState("");
    var fbText = _fbText[0];
    var setFbText = _fbText[1];
    var _fbProxyJust = useState("");
    var fbProxy = _fbProxyJust[0];
    var setFbProxy = _fbProxyJust[1];
    var canAddBuild = (buildText || "").trim().length >= 20 && selectedCandidateId;
    var addBuild = function() {
      if (!canAddBuild) return;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        var v = (prev.buildLog || []).map(function(b) {
          return b.v || 0;
        }).reduce(function(a, b) {
          return Math.max(a, b);
        }, 0) + 1;
        var loopOrigin = prev.pendingLoopReturn ? { fromStage: prev.pendingLoopReturn.fromStage, ts: Date.now() } : null;
        next.buildLog = (prev.buildLog || []).concat([{
          v,
          ts: Date.now(),
          candidateId: selectedCandidateId,
          buildText: buildText.trim(),
          materialsActually: matsActual.trim(),
          photoDescription: photoDesc.trim(),
          loopBackOrigin: loopOrigin
        }]);
        return next;
      });
      setBuildText("");
      setMatsActual("");
      setPhotoDesc("");
    };
    var latestBuild = builds.length ? builds[builds.length - 1] : null;
    var canLogRun = function(crit) {
      var d = runDraft[crit.id] || {};
      return d.measured != null && d.measured !== "" && Number.isFinite(parseFloat(d.measured)) && latestBuild;
    };
    var logRun = function(crit) {
      var d = runDraft[crit.id] || {};
      if (!canLogRun(crit)) return;
      var measured = parseFloat(d.measured);
      var proto = protocols.filter(function(p) {
        return p.criterionId === crit.id;
      })[0] || {};
      var pass;
      if (crit.direction === "minimize") pass = measured <= crit.target;
      else if (crit.direction === "meet") pass = Math.abs(measured - crit.target) / Math.max(1, Math.abs(crit.target)) < 0.1;
      else pass = measured >= crit.target;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.testRun = (prev.testRun || []).concat([{
          id: "tr" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
          v: (prev.testRun || []).length + 1,
          ts: Date.now(),
          buildLogV: latestBuild ? latestBuild.v : null,
          criterionId: crit.id,
          measured,
          unit: proto.unit || crit.unit,
          passed: pass,
          observationText: (d.observationText || "").trim()
        }]);
        next.constraintMatrix = (prev.constraintMatrix || []).map(function(c) {
          if (normName(c.criterion) === normName(crit.name)) {
            return Object.assign({}, c, { measured, passed: pass });
          }
          return c;
        });
        return next;
      });
      var nd = Object.assign({}, runDraft);
      delete nd[crit.id];
      setRunDraft(nd);
    };
    var canAddFeedback = (fbText || "").trim().length >= 40 && (sp.accessNote !== "proxy" || (fbProxy || "").trim().length >= 20);
    var addFeedback = function() {
      if (!canAddFeedback) return;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.stakeholderFeedback = (prev.stakeholderFeedback || []).concat([{
          id: "sf" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
          ts: Date.now(),
          prototypeVersionRef: latestBuild ? latestBuild.v : null,
          verbatimResponse: sp.accessNote === "direct" ? fbText.trim() : null,
          proxyJustification: sp.accessNote === "proxy" ? fbProxy.trim() : null,
          observerNotes: sp.accessNote !== "direct" ? fbText.trim() : "",
          surprises: "",
          criteriaJudgments: []
        }]);
        return next;
      });
      setFbText("");
      setFbProxy("");
    };
    var directFeedbackRequired = sp.accessNote === "direct" && feedback.length === 0;
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      ExemplarGate,
      {
        t,
        stageKey: "build_test",
        journal,
        setJournal,
        primitives,
        pair: EXEMPLAR_PAIRS.build_test
      }
    ), /* @__PURE__ */ React.createElement(ConstraintCoverageBar, { t, constraints: cons }), /* @__PURE__ */ React.createElement(BuildLogTimeline, { t, builds, testRuns: runs, failureLog: journal.failureLog || [] }), !selectedCandidateId && /* @__PURE__ */ React.createElement("div", { style: {
      padding: "10px 12px",
      borderRadius: "10px",
      background: "#fef3c7",
      border: "1px solid #fbbf24",
      fontSize: "11px",
      color: "#92400e"
    } }, t("engineering.no_candidate_selected") || "Loop back to Plan and select a candidate before building."), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("engineering.log_build_title") || "Log a build version"), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("engineering.build_what_label") || "What did you actually build? (this version)",
        value: buildText,
        onChange: setBuildText,
        rows: 3,
        max: 1500
      }
    ), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("engineering.build_mats_label") || "Materials actually used (may differ from candidate list)",
        value: matsActual,
        onChange: setMatsActual,
        rows: 2,
        max: 600
      }
    ), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("engineering.build_photo_label") || "Photo description (optional \u2014 describe what would be in a photo)",
        value: photoDesc,
        onChange: setPhotoDesc,
        rows: 2,
        max: 500
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: !canAddBuild,
        onClick: addBuild,
        style: {
          marginTop: "6px",
          padding: "6px 12px",
          borderRadius: "999px",
          background: canAddBuild ? "#b45309" : "#cbd5e1",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "11px",
          cursor: canAddBuild ? "pointer" : "not-allowed"
        }
      },
      t("engineering.save_build") || "Save build v" + ((builds.length || 0) + 1)
    )), latestBuild && /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("engineering.test_runs_title") || "Log measured results (one per criterion)"), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 6px", fontSize: "11px", color: "#64748b" } }, t("engineering.test_runs_help") || "Numbers, not vibes. Failures are the most useful data \u2014 log them honestly."), /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" } }, crits.map(function(c) {
      var d = runDraft[c.id] || {};
      var existing = runs.filter(function(r) {
        return r.buildLogV === latestBuild.v && r.criterionId === c.id;
      });
      return /* @__PURE__ */ React.createElement("li", { key: c.id, style: {
        padding: "6px 10px",
        borderRadius: "8px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0"
      } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#1e293b" } }, c.name), " ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#64748b" } }, c.direction, " ", c.target, " ", c.unit), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          inputMode: "decimal",
          value: d.measured || "",
          onChange: function(e) {
            setRunDraft(Object.assign({}, runDraft, { [c.id]: Object.assign({}, d, { measured: e.target.value }) }));
          },
          placeholder: "measured",
          style: {
            width: "80px",
            padding: "4px 8px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            fontSize: "11px"
          }
        }
      ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#64748b" } }, c.unit), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          value: d.observationText || "",
          maxLength: 400,
          onChange: function(e) {
            setRunDraft(Object.assign({}, runDraft, { [c.id]: Object.assign({}, d, { observationText: e.target.value }) }));
          },
          placeholder: "observation (optional)",
          style: {
            flex: 1,
            minWidth: "120px",
            padding: "4px 8px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            fontSize: "11px"
          }
        }
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          disabled: !canLogRun(c),
          onClick: function() {
            logRun(c);
          },
          style: {
            padding: "4px 10px",
            borderRadius: "999px",
            background: canLogRun(c) ? "#b45309" : "#cbd5e1",
            color: "#fff",
            border: "none",
            fontWeight: 700,
            fontSize: "11px",
            cursor: canLogRun(c) ? "pointer" : "not-allowed"
          }
        },
        t("engineering.log_run") || "Log run"
      )), existing.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", fontSize: "10px", color: "#475569" } }, existing.map(function(r) {
        return /* @__PURE__ */ React.createElement("span", { key: r.id, style: {
          marginRight: "8px",
          color: r.passed ? "#16a34a" : "#dc2626",
          fontWeight: 700
        } }, r.measured, " ", r.unit, " ", r.passed ? "pass" : "fail");
      })));
    }))), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("engineering.stake_feedback_title") || "Stakeholder feedback", directFeedbackRequired && /* @__PURE__ */ React.createElement("span", { style: { color: "#dc2626", fontWeight: 800 } }, " *")), sp.accessNote === "direct" && /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 4px", fontSize: "11px", color: "#92400e" } }, t("engineering.direct_feedback_required") || "Direct-access stakeholder: log their verbatim response (\u226540 chars)."), sp.accessNote === "imagined_with_research" && /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 4px", fontSize: "11px", color: "#92400e" } }, t("engineering.imagined_research_required") || "Imagined stakeholder: back this with a research source in your sources list before claiming feedback."), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: sp.accessNote === "direct" ? t("engineering.fb_verbatim") || "Verbatim response" : t("engineering.fb_observer") || "Observer notes / proxy account",
        value: fbText,
        onChange: setFbText,
        rows: 3,
        max: 1200
      }
    ), sp.accessNote === "proxy" && /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("engineering.fb_proxy_just") || "Why the proxy is reliable (\u226520 chars)",
        value: fbProxy,
        onChange: setFbProxy,
        rows: 2,
        max: 400
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: !canAddFeedback,
        onClick: addFeedback,
        style: {
          marginTop: "4px",
          padding: "5px 12px",
          borderRadius: "999px",
          background: canAddFeedback ? "#b45309" : "#cbd5e1",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "11px",
          cursor: canAddFeedback ? "pointer" : "not-allowed"
        }
      },
      t("engineering.log_feedback") || "Log feedback"
    ), feedback.length > 0 && /* @__PURE__ */ React.createElement("ul", { style: { margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" } }, feedback.slice(-4).map(function(f) {
      return /* @__PURE__ */ React.createElement("li", { key: f.id, style: { fontSize: "11px", color: "#1e293b" } }, /* @__PURE__ */ React.createElement("strong", null, "v", f.prototypeVersionRef, ":"), " ", f.verbatimResponse || f.observerNotes);
    }))), /* @__PURE__ */ React.createElement("p", { style: { margin: "6px 0 0", fontSize: "11px", color: "#64748b", fontStyle: "italic" } }, t("engineering.build_no_ai_note") || "No AI on Build & Test by design. AI here would drift toward proposing materials or fixes. If a test fails, loop to Optimize \u2014 that is where structural failure analysis happens, with AI critique AFTER you author the hypothesis."));
  }
  function OptimizeStage(props) {
    var t = props.t, ctx = props.ctx;
    var journal = ctx.journal, setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var floors = devFloors(journal.devLevel || "6_8");
    var failureLog = journal.failureLog || [];
    var runs = journal.testRun || [];
    var failedRuns = runs.filter(function(r) {
      return r.passed === false;
    });
    var _draft = useState({
      fromTestRunId: "",
      modeText: "",
      causeHypothesisText: "",
      cvName: "",
      cvFrom: "",
      cvTo: "",
      predictedEffectText: ""
    });
    var draft = _draft[0];
    var setDraft = _draft[1];
    var _aiResult = useState(null);
    var aiResult = _aiResult[0];
    var setAiResult = _aiResult[1];
    var _busy = useState(false);
    var busy = _busy[0];
    var setBusy = _busy[1];
    var canAddFailure = draft.fromTestRunId && (draft.modeText || "").trim().length >= floors.mode && (draft.causeHypothesisText || "").trim().length >= floors.cause && draft.cvName && draft.cvFrom !== "" && draft.cvTo !== "" && draft.cvFrom !== draft.cvTo && (draft.predictedEffectText || "").trim().length >= floors.predicted;
    var addFailure = function() {
      if (!canAddFailure) return;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.failureLog = (prev.failureLog || []).concat([{
          id: "fl" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
          ts: Date.now(),
          fromTestRunId: draft.fromTestRunId,
          modeText: draft.modeText.trim(),
          causeHypothesisText: draft.causeHypothesisText.trim(),
          changedVariable: { name: draft.cvName.trim(), fromValue: draft.cvFrom, toValue: draft.cvTo },
          predictedEffectText: draft.predictedEffectText.trim(),
          retestRunId: null
        }]);
        return next;
      });
      setDraft({ fromTestRunId: "", modeText: "", causeHypothesisText: "", cvName: "", cvFrom: "", cvTo: "", predictedEffectText: "" });
    };
    var attachRetest = function(entry, retestId) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.failureLog = (prev.failureLog || []).map(function(f) {
          return f.id === entry.id ? Object.assign({}, f, { retestRunId: retestId }) : f;
        });
        return next;
      });
    };
    var setPredictionRadio = function(entry, radio) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.failureLog = (prev.failureLog || []).map(function(f) {
          return f.id === entry.id ? Object.assign({}, f, { predictionVsRealityRadio: radio }) : f;
        });
        return next;
      });
    };
    var askFailureCritic = async function() {
      setBusy(true);
      setAiResult(null);
      try {
        var res = await ctx.ask(TOUCHPOINTS.failure_mode_critic, ctx);
        setAiResult(res);
      } finally {
        setBusy(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      ExemplarGate,
      {
        t,
        stageKey: "optimize",
        journal,
        setJournal,
        primitives,
        pair: EXEMPLAR_PAIRS.optimize
      }
    ), /* @__PURE__ */ React.createElement(BuildLogTimeline, { t, builds: journal.buildLog || [], testRuns: runs, failureLog }), failedRuns.length === 0 && /* @__PURE__ */ React.createElement("div", { style: {
      padding: "10px 12px",
      borderRadius: "10px",
      background: "#ecfdf5",
      border: "1px solid #6ee7b7",
      fontSize: "11px",
      color: "#065f46"
    } }, t("engineering.no_failures_yet") || "No failed test runs to optimize against yet. Loop back to Build & Test to run more tests \u2014 failures unlock real iteration."), failureLog.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("engineering.failure_history") || "Failure loops"), /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" } }, failureLog.map(function(f) {
      var sourceTest = runs.filter(function(r) {
        return r.id === f.fromTestRunId;
      })[0];
      var retest = f.retestRunId ? runs.filter(function(r) {
        return r.id === f.retestRunId;
      })[0] : null;
      return /* @__PURE__ */ React.createElement("li", { key: f.id }, /* @__PURE__ */ React.createElement(FailureLoopCard, { t, entry: f, sourceTest, retest }), !f.retestRunId && /* @__PURE__ */ React.createElement("div", { style: {
        marginTop: "4px",
        padding: "6px 10px",
        borderRadius: "8px",
        background: "#fff7ed",
        border: "1px solid #fdba74",
        fontSize: "11px",
        color: "#9a3412"
      } }, /* @__PURE__ */ React.createElement("strong", null, t("engineering.attach_retest") || "Attach a retest:", " "), /* @__PURE__ */ React.createElement(
        "select",
        {
          value: "",
          onChange: function(e) {
            if (e.target.value) attachRetest(f, e.target.value);
          },
          style: {
            padding: "3px 6px",
            borderRadius: "6px",
            fontSize: "11px",
            border: "1px solid #cbd5e1",
            marginLeft: "4px"
          }
        },
        /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 pick a new testRun \u2014"),
        runs.filter(function(r) {
          return r.criterionId === (sourceTest && sourceTest.criterionId) && r.id !== f.fromTestRunId;
        }).map(function(r) {
          return /* @__PURE__ */ React.createElement("option", { key: r.id, value: r.id }, "v", r.v, " \u2014 ", r.measured, " ", r.unit, " (", r.passed ? "pass" : "fail", ")");
        })
      )), f.retestRunId && !f.predictionVsRealityRadio && /* @__PURE__ */ React.createElement("div", { style: {
        marginTop: "4px",
        padding: "6px 10px",
        borderRadius: "8px",
        background: "#fff7ed",
        border: "1px solid #fdba74",
        fontSize: "11px",
        color: "#9a3412"
      } }, /* @__PURE__ */ React.createElement("strong", null, t("engineering.reconcile") || "Reconcile prediction vs reality:", " "), ["confirmed", "partially", "refuted"].map(function(rad) {
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: rad,
            type: "button",
            onClick: function() {
              setPredictionRadio(f, rad);
            },
            style: {
              marginLeft: "6px",
              padding: "3px 10px",
              borderRadius: "999px",
              background: "transparent",
              color: "#9a3412",
              border: "1px solid #fdba74",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer"
            }
          },
          rad
        );
      })));
    }))), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("engineering.add_failure_title") || "Add a failure-loop entry"), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 6px", fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, t("engineering.add_failure_help") || "Pick the failed test run, name the failure mode, hypothesize a cause, change ONE variable, predict the effect. Then loop back to Build & Test to run the retest with this single change."), /* @__PURE__ */ React.createElement("label", { style: { display: "block", marginTop: "4px", fontSize: "11px", fontWeight: 700, color: "#1e293b" } }, t("engineering.from_test_run") || "Failed test run", /* @__PURE__ */ React.createElement(
      "select",
      {
        value: draft.fromTestRunId,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { fromTestRunId: e.target.value }));
        },
        style: {
          marginTop: "2px",
          width: "100%",
          padding: "6px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 pick a failed run \u2014"),
      failedRuns.map(function(r) {
        var crit = (journal.criteria || []).filter(function(c) {
          return c.id === r.criterionId;
        })[0];
        return /* @__PURE__ */ React.createElement("option", { key: r.id, value: r.id }, "v", r.v, " (", crit ? crit.name : "?", ") \u2014 ", r.measured, " ", r.unit, " (fail)");
      })
    )), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("engineering.failure_mode_label") || "Failure mode (what went wrong) \u2265" + floors.mode + " chars",
        value: draft.modeText,
        onChange: function(v) {
          setDraft(Object.assign({}, draft, { modeText: v }));
        },
        rows: 2,
        max: 600
      }
    ), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("engineering.cause_hypothesis_label") || "Cause hypothesis (mechanism \u2014 not a restatement of the test) \u2265" + floors.cause + " chars",
        value: draft.causeHypothesisText,
        onChange: function(v) {
          setDraft(Object.assign({}, draft, { causeHypothesisText: v }));
        },
        rows: 3,
        max: 800
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "6px", marginTop: "4px" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#1e293b" } }, t("engineering.cv_name") || "Changed variable", " *", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: draft.cvName,
        maxLength: 80,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { cvName: e.target.value }));
        },
        placeholder: "e.g. cork thickness",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px",
          fontFamily: "inherit"
        }
      }
    )), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#1e293b" } }, t("engineering.cv_from") || "From value", " *", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: draft.cvFrom,
        maxLength: 40,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { cvFrom: e.target.value }));
        },
        placeholder: "e.g. 0mm",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px",
          fontFamily: "inherit"
        }
      }
    )), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#1e293b" } }, t("engineering.cv_to") || "To value", " *", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: draft.cvTo,
        maxLength: 40,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { cvTo: e.target.value }));
        },
        placeholder: "e.g. 4mm",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px",
          fontFamily: "inherit"
        }
      }
    ))), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("engineering.predicted_effect_label") || "Predicted effect of this change \u2265" + floors.predicted + " chars",
        value: draft.predictedEffectText,
        onChange: function(v) {
          setDraft(Object.assign({}, draft, { predictedEffectText: v }));
        },
        rows: 2,
        max: 600
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: !canAddFailure,
        onClick: addFailure,
        style: {
          marginTop: "6px",
          padding: "6px 12px",
          borderRadius: "999px",
          background: canAddFailure ? "#b45309" : "#cbd5e1",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "11px",
          cursor: canAddFailure ? "pointer" : "not-allowed"
        }
      },
      t("engineering.save_failure_entry") || "Save failure-loop entry"
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: busy,
        onClick: askFailureCritic,
        style: {
          alignSelf: "flex-start",
          padding: "10px 18px",
          borderRadius: "999px",
          background: busy ? "#cbd5e1" : "#0d9488",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "12px",
          cursor: busy ? "wait" : "pointer"
        }
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F916} "),
      busy ? t("engineering.critiquing") || "Critiquing\u2026" : t("engineering.failure_critic_button") || "What failure modes am I missing?"
    ), aiResult && aiResult.blocked && /* @__PURE__ */ React.createElement(BlockedNote, { t, reason: aiResult.detail || aiResult.blockedReason }), aiResult && !aiResult.blocked && aiResult.data && /* @__PURE__ */ React.createElement(AiResultPanel, { t, data: aiResult.data, primitives }));
  }
  function CommunicateStage(props) {
    var t = props.t, ctx = props.ctx;
    var journal = ctx.journal, setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var floors = devFloors(journal.devLevel || "6_8");
    var stageNote = (journal.stageNotes || {}).communicate || {};
    var sp = journal.stakeholderProfile || {};
    var crits = journal.criteria || [];
    var cons = journal.constraintMatrix || [];
    var runs = journal.testRun || [];
    var claims = journal.designClaims || [];
    var builds = journal.buildLog || [];
    var _rationale = useState(stageNote.designRationale || "");
    var rationale = _rationale[0];
    var setRationale = _rationale[1];
    var _acc = useState(stageNote.stakeholderAccountabilityStatement || "");
    var acc = _acc[0];
    var setAcc = _acc[1];
    var _addingClaim = useState("");
    var addingClaim = _addingClaim[0];
    var setAddingClaim = _addingClaim[1];
    var _aiResult = useState(null);
    var aiResult = _aiResult[0];
    var setAiResult = _aiResult[1];
    var _busy = useState(false);
    var busy = _busy[0];
    var setBusy = _busy[1];
    useEffect(function() {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.stageNotes = Object.assign({}, prev.stageNotes || {});
        next.stageNotes.communicate = Object.assign({}, next.stageNotes.communicate || {}, {
          designRationale: rationale,
          stakeholderAccountabilityStatement: acc,
          ts: Date.now()
        });
        return next;
      });
    }, [rationale, acc]);
    var epistemicBlocked = sp && (sp.epistemicStatus === "invented" || sp.epistemicStatus === "curriculum_prompt");
    var unmetSafety = hasUnmetSafety(journal);
    var blockMeets = epistemicBlocked || unmetSafety;
    var availableLabels = blockMeets ? [{ k: "partial", lab: "Partial", color: "#d97706" }, { k: "not_yet", lab: "Not yet", color: "#dc2626" }] : [
      { k: "meets_criteria", lab: "Meets criteria", color: "#16a34a" },
      { k: "partial", lab: "Partial", color: "#d97706" },
      { k: "not_yet", lab: "Not yet", color: "#dc2626" }
    ];
    var addClaim = function() {
      if (!addingClaim.trim()) return;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.designClaims = (prev.designClaims || []).concat([{
          id: "dc" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
          ts: Date.now(),
          text: addingClaim.trim(),
          kind: "satisfies_criterion",
          label: "",
          staleLabel: false,
          claimEvidenceRunIds: [],
          constraintRefs: [],
          tradeoffRefs: []
        }]);
        return next;
      });
      setAddingClaim("");
    };
    var setClaimLabel = function(id, label) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.designClaims = (prev.designClaims || []).map(function(c) {
          if (c.id !== id) return c;
          return Object.assign({}, c, { label, staleLabel: false });
        });
        return next;
      });
    };
    var setClaimKind = function(id, kind) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.designClaims = (prev.designClaims || []).map(function(c) {
          if (c.id !== id) return c;
          return Object.assign({}, c, { kind });
        });
        return next;
      });
    };
    var removeClaim = function(id) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.designClaims = (prev.designClaims || []).filter(function(c) {
          return c.id !== id;
        });
        return next;
      });
    };
    var askStakeTranslate = async function() {
      setBusy(true);
      setAiResult(null);
      try {
        var res = await ctx.ask(TOUCHPOINTS.stakeholder_translator, ctx);
        setAiResult(res);
      } finally {
        setBusy(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      ExemplarGate,
      {
        t,
        stageKey: "communicate",
        journal,
        setJournal,
        primitives,
        pair: EXEMPLAR_PAIRS.communicate
      }
    ), /* @__PURE__ */ React.createElement(ConstraintCoverageBar, { t, constraints: cons }), unmetSafety && /* @__PURE__ */ React.createElement("div", { role: "alert", style: {
      padding: "10px 12px",
      borderRadius: "10px",
      background: "#fef2f2",
      border: "1px solid #fca5a5",
      fontSize: "11px",
      color: "#7f1d1d"
    } }, /* @__PURE__ */ React.createElement("strong", null, t("engineering.safety_override") || "Safety override active.", " "), t("engineering.safety_override_help") || 'A physical-safety constraint is unmet. Any design claim must be labeled "partial" or "not yet" \u2014 stakeholder approval cannot override physical-harm criteria.'), epistemicBlocked && /* @__PURE__ */ React.createElement("div", { style: {
      padding: "8px 10px",
      borderRadius: "8px",
      background: "#fff7ed",
      border: "1px solid #fdba74",
      fontSize: "11px",
      color: "#9a3412"
    } }, t("engineering.epistemic_block_msg") || 'Your stakeholder was marked invented or curriculum-prompt. "Meets criteria" labels are not selectable here \u2014 epistemic honesty over ergonomics.'), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("engineering.rationale_label") || "Design rationale",
        help: t("engineering.rationale_help") || "\u2265" + floors.rationale + " chars. Reference a criterion name, a constraint name AND target+unit, your trade-off declaration, AND a failure-log mode.",
        value: rationale,
        onChange: setRationale,
        rows: 6,
        max: 2400,
        placeholder: t("engineering.rationale_ph") || "Final design holds 56\xB0C at 90min (above the 55\xB0C floor) using preheated ceramic + cork + foil, at $3.40 in materials, 1.95kg loaded. Traded mass for temperature-hold per Ms. Patel's priority. Failure-log: thermal bridge through ceramic base, addressed via cork (partial confirmation)."
      }
    ), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("engineering.accountability_label") || "Stakeholder accountability statement",
        help: t("engineering.accountability_help") || "\u2265" + floors.accountability + " chars. What would " + (sp.name || "your stakeholder") + " STILL ask you, and what would you do next? Token-link to the stakeholder, a design claim, AND something your prototype did NOT test.",
        value: acc,
        onChange: setAcc,
        rows: 4,
        max: 1500,
        placeholder: t("engineering.accountability_ph") || "If Ms. Patel saw this, she would still ask: does it hold up to 5 days/week of preheating cycles? Our prototype was tested 3 times \u2014 wear under daily use is untested. Next step: 5-day endurance test with a daily reset schedule."
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("engineering.design_claims_title") || "Design claims (\u22652; each labeled and triple-anchored)"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "6px", marginBottom: "8px" } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: addingClaim,
        maxLength: 500,
        onChange: function(e) {
          setAddingClaim(e.target.value);
        },
        onKeyDown: function(e) {
          if (e.key === "Enter") addClaim();
        },
        placeholder: t("engineering.design_claim_ph") || "A specific claim about the final design and its fitness\u2026",
        style: {
          flex: 1,
          padding: "6px 10px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: addClaim,
        style: {
          padding: "6px 12px",
          borderRadius: "999px",
          background: "#b45309",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "12px",
          cursor: "pointer"
        }
      },
      "+"
    )), /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" } }, claims.map(function(c, idx) {
      return /* @__PURE__ */ React.createElement("li", { key: c.id, style: {
        padding: "8px 10px",
        borderRadius: "10px",
        background: c.staleLabel ? "#fef3c7" : "#f8fafc",
        border: "1px solid " + (c.staleLabel ? "#fbbf24" : "#e2e8f0")
      } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", color: "#1e293b", marginBottom: "6px" } }, /* @__PURE__ */ React.createElement("strong", null, idx + 1, "."), " ", c.text, c.staleLabel && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "6px", fontSize: "10px", color: "#92400e", fontWeight: 700 } }, t("engineering.claim_stale") || "label is stale \u2014 your design changed")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#64748b", fontWeight: 700 } }, t("engineering.kind") || "kind:"), ["serves_stakeholder", "satisfies_criterion", "acknowledges_limit"].map(function(k) {
        var on = c.kind === k;
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: k,
            type: "button",
            onClick: function() {
              setClaimKind(c.id, k);
            },
            style: {
              padding: "3px 8px",
              borderRadius: "999px",
              background: on ? "#475569" : "#fff",
              color: on ? "#fff" : "#475569",
              border: "1px solid #475569",
              fontSize: "10px",
              fontWeight: 700,
              cursor: "pointer"
            }
          },
          k.replace(/_/g, " ")
        );
      })), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#64748b", fontWeight: 700 } }, t("engineering.label") || "label:"), availableLabels.map(function(opt) {
        var on = c.label === opt.k;
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: opt.k,
            type: "button",
            onClick: function() {
              setClaimLabel(c.id, opt.k);
            },
            style: {
              padding: "3px 10px",
              borderRadius: "999px",
              background: on ? opt.color : "#fff",
              color: on ? "#fff" : opt.color,
              border: "1px solid " + opt.color,
              fontSize: "10px",
              fontWeight: 700,
              cursor: "pointer"
            }
          },
          opt.lab
        );
      }), unmetSafety && c.label === "meets_criteria" && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#b91c1c", fontWeight: 800 } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u26A0\uFE0F "), t("engineering.claim_safety_relabel") || "relabel required \u2014 physical-safety criterion unmet"), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            removeClaim(c.id);
          },
          "aria-label": "Remove claim",
          style: {
            marginLeft: "auto",
            background: "transparent",
            border: "none",
            color: "#64748b",
            cursor: "pointer",
            fontSize: "12px"
          }
        },
        "\u2715"
      )));
    }))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: busy,
        onClick: askStakeTranslate,
        style: {
          alignSelf: "flex-start",
          padding: "10px 18px",
          borderRadius: "999px",
          background: busy ? "#cbd5e1" : "#0d9488",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "12px",
          cursor: busy ? "wait" : "pointer"
        }
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F916} "),
      busy ? t("engineering.translating") || "Translating\u2026" : t("engineering.stake_translator_button") || "Questions my stakeholder would ask"
    ), aiResult && aiResult.blocked && /* @__PURE__ */ React.createElement(BlockedNote, { t, reason: aiResult.detail || aiResult.blockedReason }), aiResult && !aiResult.blocked && aiResult.data && /* @__PURE__ */ React.createElement(AiResultPanel, { t, data: aiResult.data, primitives }));
  }
  function LaneRoot(props) {
    var ctx = props.ctx;
    var t = ctx.t;
    var journal = ctx.journal, setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var activeStage = journal.activeStage || "define_problem";
    if (STAGE_KEYS.indexOf(activeStage) === -1) activeStage = "define_problem";
    var _loopback = useState(null);
    var loopback = _loopback[0];
    var setLoopback = _loopback[1];
    var jumpStage = useCallback(function(toStage, preloadChipId) {
      if (toStage === activeStage) return;
      var toIdx = STAGE_KEYS.indexOf(toStage);
      var fromIdx = STAGE_KEYS.indexOf(activeStage);
      if (toIdx === -1 || fromIdx === -1) return;
      if (toIdx < fromIdx) {
        setLoopback({ fromStage: activeStage, toStage, preloadChipId: preloadChipId || null });
        return;
      }
      setJournal(function(prev) {
        return Object.assign({}, prev, { activeStage: toStage });
      });
      announce((t("engineering.sr_now_on") || "Now on: ") + (STAGE_BY_KEY[toStage] && STAGE_BY_KEY[toStage].label || toStage), "polite");
    }, [activeStage]);
    var commitLoopBack = useCallback(function(payload) {
      var fromStage = loopback.fromStage, toStage = loopback.toStage;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.loopBacks = (prev.loopBacks || []).concat([{
          ts: Date.now(),
          fromStage,
          toStage,
          whyChipId: payload.whyChipId,
          why: payload.why || null
        }]);
        next.stageNotes = Object.assign({}, prev.stageNotes || {});
        var toIdx = STAGE_KEYS.indexOf(toStage);
        STAGE_KEYS.forEach(function(sk, idx) {
          if (idx > toIdx) {
            var sn = Object.assign({}, next.stageNotes[sk] || {});
            sn.supersededBy = { fromStage: toStage, ts: Date.now() };
            sn.acknowledgedSuperseded = false;
            next.stageNotes[sk] = sn;
          }
        });
        if (next.criteria && next.criteria.length) {
          next.criteria = next.criteria.map(function(c) {
            return Object.assign({}, c, { staleLabel: true });
          });
        }
        if (next.constraintMatrix && next.constraintMatrix.length) {
          next.constraintMatrix = next.constraintMatrix.map(function(c) {
            return Object.assign({}, c, { staleLabel: true });
          });
        }
        if (next.designClaims && next.designClaims.length) {
          next.designClaims = next.designClaims.map(function(c) {
            return Object.assign({}, c, { staleLabel: true });
          });
        }
        if (next.stakeholderProfile && payload.whyChipId === "stakeholder_voice_changed") {
          next.stakeholderProfile = Object.assign({}, next.stakeholderProfile, { staleLabel: true });
        }
        next.activeStage = toStage;
        next.pendingLoopReturn = { fromStage, ts: Date.now() };
        return next;
      });
      setLoopback(null);
      announce((t("engineering.sr_looped_back") || "Looped back to ") + (STAGE_BY_KEY[toStage] && STAGE_BY_KEY[toStage].label || toStage) + ". " + (t("engineering.sr_work_preserved") || "Your earlier work is preserved; you can return to where you were."), "polite");
    }, [loopback]);
    var returnToOrigin = useCallback(function() {
      if (!journal.pendingLoopReturn) return;
      var origin = journal.pendingLoopReturn.fromStage;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.activeStage = origin;
        next.pendingLoopReturn = null;
        if (prev.loopBacks && prev.loopBacks.length) {
          var idx = prev.loopBacks.length - 1;
          next.loopBacks = prev.loopBacks.slice();
          next.loopBacks[idx] = Object.assign({}, prev.loopBacks[idx], {
            returnedToOrigin: { stage: origin, ts: Date.now() }
          });
        }
        return next;
      });
    }, [journal.pendingLoopReturn]);
    var stageNote = (journal.stageNotes || {})[activeStage] || {};
    var superseded = stageNote.supersededBy && !stageNote.acknowledgedSuperseded;
    var acknowledgeSuperseded = function() {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.stageNotes = Object.assign({}, prev.stageNotes || {});
        var sn = Object.assign({}, next.stageNotes[activeStage] || {});
        sn.acknowledgedSuperseded = true;
        next.stageNotes[activeStage] = sn;
        return next;
      });
    };
    var laneCtx = Object.assign({}, ctx, { activeStage });
    var stakeholderReframe = function() {
      jumpStage("define_problem", "stakeholder_reframe");
    };
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "14px" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: ctx.onExitLane,
        style: {
          alignSelf: "flex-start",
          padding: "4px 10px",
          borderRadius: "999px",
          background: "#f1f5f9",
          color: "#475569",
          border: "none",
          fontSize: "11px",
          fontWeight: 700,
          cursor: "pointer"
        }
      },
      "\u2190 ",
      t("engineering.back_to_hub_lanes") || "Choose a different lane"
    ), /* @__PURE__ */ React.createElement(EducatorPanel, { t }), activeStage !== "define_problem" && /* @__PURE__ */ React.createElement(
      StakeholderCard,
      {
        t,
        journal,
        setJournal,
        editable: false,
        onReturnToStakeholder: stakeholderReframe
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(
      CycleWheel,
      {
        t,
        activeStage,
        onJump: jumpStage,
        journalStageNotes: journal.stageNotes || {},
        buildVersionCount: (journal.buildLog || []).length
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: "200px" } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: "17px", fontWeight: 800, color: "#1e293b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, STAGE_BY_KEY[activeStage].icon + " "), STAGE_BY_KEY[activeStage].label), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 0", fontSize: "12px", color: "#64748b", lineHeight: 1.5 } }, t("engineering.stage_intro_" + activeStage) || ""))), /* @__PURE__ */ React.createElement(
      StageChipStrip,
      {
        activeStage,
        onJump: jumpStage,
        journalStageNotes: journal.stageNotes || {},
        buildVersionCount: (journal.buildLog || []).length
      }
    ), superseded && /* @__PURE__ */ React.createElement("div", { role: "alert", style: {
      padding: "10px 14px",
      borderRadius: "10px",
      background: "#fef3c7",
      border: "1px solid #fbbf24",
      fontSize: "12px",
      color: "#92400e",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
      flexWrap: "wrap"
    } }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u26A0\uFE0F "), t("engineering.superseded_banner") || "Your work here was written against earlier upstream content. The upstream changed; this is preserved as a record of your earlier thinking."), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: acknowledgeSuperseded,
        style: {
          padding: "4px 10px",
          borderRadius: "999px",
          background: "#fff",
          border: "1px solid #fbbf24",
          color: "#92400e",
          fontWeight: 700,
          fontSize: "11px",
          cursor: "pointer"
        }
      },
      t("engineering.acknowledge_superseded") || "I understand \u2014 keep as a record"
    )), journal.pendingLoopReturn && journal.pendingLoopReturn.fromStage !== activeStage && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: returnToOrigin,
        style: {
          alignSelf: "flex-start",
          padding: "8px 14px",
          borderRadius: "999px",
          background: "#b45309",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "12px",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(180,83,9,0.35)"
        }
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u21AA\uFE0F "),
      (t("engineering.return_to_where_i_was") || "Return to where I was: ") + (STAGE_BY_KEY[journal.pendingLoopReturn.fromStage] ? STAGE_BY_KEY[journal.pendingLoopReturn.fromStage].label : "")
    ), activeStage === "define_problem" && /* @__PURE__ */ React.createElement(DefineProblemStage, { t, ctx: laneCtx }), activeStage === "develop_candidates" && /* @__PURE__ */ React.createElement(DevelopCandidatesStage, { t, ctx: laneCtx }), activeStage === "plan_test" && /* @__PURE__ */ React.createElement(PlanTestStage, { t, ctx: laneCtx }), activeStage === "build_test" && /* @__PURE__ */ React.createElement(BuildTestStage, { t, ctx: laneCtx }), activeStage === "optimize" && /* @__PURE__ */ React.createElement(OptimizeStage, { t, ctx: laneCtx }), activeStage === "communicate" && /* @__PURE__ */ React.createElement(CommunicateStage, { t, ctx: laneCtx }), /* @__PURE__ */ React.createElement("details", { style: {
      padding: "10px 14px",
      borderRadius: "12px",
      background: "#fff7ed",
      border: "1px solid #fdba74"
    } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", fontSize: "11px", fontWeight: 800, color: "#9a3412" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4DA} "), t("engineering.cross_cutting_exemplars_title") || "How is strong engineering recognized? (cross-cutting examples)"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" } }, LOOP_REWARDING_EXEMPLARS.map(function(pair, i) {
      return /* @__PURE__ */ React.createElement(
        primitives.ExemplarPair,
        {
          key: i,
          t,
          criterion: pair.criterion,
          strongExample: pair.strongExample,
          weakExample: pair.weakExample,
          onJudgment: function() {
          }
        }
      );
    }))), loopback && /* @__PURE__ */ React.createElement(
      LoopBackPicker,
      {
        t,
        fromStage: loopback.fromStage,
        toStage: loopback.toStage,
        preloadChipId: loopback.preloadChipId,
        onCommit: commitLoopBack,
        onCancel: function() {
          setLoopback(null);
        }
      }
    ));
  }
  window.ResearchHub.registerLane("engineering", {
    label: "Engineering Design",
    tagline: "Design Studio",
    icon: "\u{1F6E0}\uFE0F",
    gradFrom: "from-amber-50",
    gradTo: "to-orange-50",
    border: "border-amber-600",
    titleColor: "text-amber-800",
    descColor: "text-amber-700",
    blurb: "Author a problem for a named stakeholder with quantified constraints, develop \u22653 distinct candidates (each punting something), pick one and name the trade-off, build and test with real measurement, optimize through failure-and-retest loops, and communicate honestly. AI here surfaces missed constraints, dominated alternatives, adversarial failure modes, and stakeholder questions \u2014 it never proposes the design.",
    stages: STAGES,
    touchpoints: Object.keys(TOUCHPOINTS).map(function(k) {
      return TOUCHPOINTS[k];
    }),
    exemplarPairs: EXEMPLAR_PAIRS,
    crossCuttingExemplars: LOOP_REWARDING_EXEMPLARS,
    loopbackChips: LOOPBACK_CHIPS,
    render: function(ctx) {
      return /* @__PURE__ */ React.createElement(LaneRoot, { ctx });
    },
    __tier: 2
  });
  window.AlloModules.ResearchLaneEngineering = { __tier: 2, lane: "engineering" };
  console.log("[CDN] ResearchLaneEngineering registered (Tier 2)");
})();
