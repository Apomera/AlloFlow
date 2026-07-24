(function initResearchLaneScientific(retriesLeft) {
  "use strict";
  window.AlloModules = window.AlloModules || {};
  if (!window.AlloModules.ResearchLaneScientific) window.AlloModules.ResearchLaneScientific = { __pending: true };
  if (window.ResearchHub && window.ResearchHub._lanes && window.ResearchHub._lanes.scientific && window.ResearchHub._lanes.scientific.__tier >= 2) {
    console.log("[CDN] ResearchLaneScientific already registered, skipping");
    return;
  }
  if (!window.ResearchHub || typeof window.ResearchHub.registerLane !== "function") {
    if (retriesLeft === void 0) retriesLeft = 50;
    if (retriesLeft <= 0) {
      console.error("[ResearchLaneScientific] window.ResearchHub never became available \u2014 giving up");
      return;
    }
    console.warn("[ResearchLaneScientific] window.ResearchHub not yet available \u2014 deferring");
    setTimeout(function() {
      initResearchLaneScientific(retriesLeft - 1);
    }, 200);
    return;
  }
  var React = window.React;
  if (!React) {
    console.error("[ResearchLaneScientific] React not found");
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
  var MECHANISM_VERBS = H.MECHANISM_VERBS || [];
  var PERSPECTIVE_MARKERS_RE = H.PERSPECTIVE_MARKERS_RE || /\b(could|might|someone|alternatively)\b/i;
  var STAGES = [
    {
      key: "notice_wonder",
      label: "Notice & Wonder",
      icon: "\u{1F440}",
      shortLabel: "Notice",
      color: "#2563eb",
      loopBackTargets: []
    },
    {
      key: "model_it",
      label: "Model-It",
      icon: "\u{1F9E0}",
      shortLabel: "Model",
      color: "#7c3aed",
      loopBackTargets: ["notice_wonder"]
    },
    {
      key: "plan",
      label: "Plan an Approach",
      icon: "\u{1F5FA}\uFE0F",
      shortLabel: "Plan",
      color: "#0d9488",
      loopBackTargets: ["notice_wonder", "model_it"]
    },
    {
      key: "gather",
      label: "Gather Evidence",
      icon: "\u{1F50E}",
      shortLabel: "Gather",
      color: "#d97706",
      loopBackTargets: ["notice_wonder", "model_it", "plan"]
    },
    {
      key: "interpret_argue",
      label: "Interpret & Argue",
      icon: "\u2696\uFE0F",
      shortLabel: "Interpret",
      color: "#16a34a",
      loopBackTargets: ["notice_wonder", "model_it", "plan", "gather"]
    },
    {
      key: "revise_share",
      label: "Revise & Share",
      icon: "\u{1F501}",
      shortLabel: "Revise",
      color: "#4338ca",
      loopBackTargets: ["notice_wonder", "model_it", "plan", "gather", "interpret_argue"]
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
    { id: "new_evidence", label: "New evidence changed my mind", icon: "\u{1F4DD}" },
    { id: "assumption_surfaced", label: "I noticed my model assumed something", icon: "\u{1F50D}" },
    { id: "plan_mismatch", label: "My plan can't actually answer my Q", icon: "\u{1F914}" },
    { id: "evidence_anomaly", label: "Something surprised me in the data", icon: "\u{1F4A1}" },
    { id: "other", label: "Other (I will explain)", icon: "\u{1F4AC}" }
  ];
  var METHOD_MENU = [
    {
      key: "controlled",
      label: "Controlled experiment",
      fits: "You can isolate one variable, manipulate it, hold others constant, and measure an outcome.",
      doesntFit: "The thing you care about can't be ethically or practically manipulated."
    },
    {
      key: "observational",
      label: "Structured observation",
      fits: "The phenomenon happens on its own and you want to record what occurs, when, and with what.",
      doesntFit: "You need to know WHY with high confidence \u2014 observation shows patterns, not isolated causes."
    },
    {
      key: "simulation",
      label: "Simulation / model run",
      fits: "You can build or use a model (digital, physical, mathematical) to explore system behavior.",
      doesntFit: "The real system has dynamics your simulation doesn't represent \u2014 conclusions hold only if the model is faithful."
    },
    {
      key: "secondary_data",
      label: "Secondary-data analysis",
      fits: "Someone has already collected good data on this and your question is about patterns in it.",
      doesntFit: "The data wasn't collected for YOUR question \u2014 your variables may not be in there."
    },
    {
      key: "comparative",
      label: "Comparative case study",
      fits: "You want to compare 2-4 cases that differ on the thing you care about.",
      doesntFit: "You only have one case \u2014 comparison needs at least two and ideally varied."
    },
    {
      key: "replicate",
      label: "Replicate a published finding",
      fits: "Someone reported a result and you want to see if it holds when YOU run it. This is real science \u2014 not 'just copying'.",
      doesntFit: "You don't have access to the original method in enough detail to follow it faithfully."
    },
    {
      key: "measurement_design",
      label: "Measurement design",
      fits: "Before any of the above, you need to figure out HOW to measure the thing.",
      doesntFit: "You already have a trusted measurement \u2014 going meta would waste your time."
    },
    {
      key: "mixed",
      label: "Mixed approach",
      fits: "Your question genuinely needs two methods together. Name BOTH and why.",
      doesntFit: "You're picking 'mixed' because you can't decide \u2014 pick one as primary first."
    }
  ];
  var EXEMPLAR_PAIRS = {
    notice_wonder: {
      criterion: "A wondering names something you could actually investigate \u2014 not just a yes/no curiosity.",
      strongExample: "I wonder whether the lamp temperature drops MORE when the wire is thicker than when it is thinner.",
      weakExample: "I wonder if science is cool."
    },
    model_it: {
      criterion: "A first-draft model names entities, a proposed relationship, AND admits what you do not know.",
      strongExample: "The lamp gives off heat AND light. I think the wire carries some heat away from the bulb to the base. I don't know whether the wire's material matters or just its thickness.",
      weakExample: "It gets hot because electricity."
    },
    plan: {
      criterion: "A plan names the method, why it fits THIS question, and what the method CAN'T tell you.",
      strongExample: "Controlled experiment: I'll vary wire thickness (3 levels), keep material and length constant, and measure base temperature after 5 minutes. This won't tell me how thickness interacts with material \u2014 I'd need a second study.",
      weakExample: "I'll do an experiment with wires and see what happens."
    },
    gather: {
      criterion: "An evidence card flagged 'didn't expect this' names what surprised you AND why it is surprising given your model.",
      strongExample: "2:14pm \u2014 base temp DROPPED 0.3\xB0C when I switched to the thickest wire. Surprising because my model predicted thicker = more heat conducted = warmer base. Maybe the wire is also radiating heat away?",
      weakExample: "Weird result at 2:14."
    },
    interpret_argue: {
      criterion: "A strong steelman of an OPPOSING reading takes the other side seriously \u2014 it doesn't strawman.",
      strongExample: "Someone could reasonably read this as: the base temperature varies because of room air currents, not the wire at all. The 0.3\xB0C drop is within the noise we saw in trials 1-2 even without changing wires. My data don't separate these.",
      weakExample: "Someone might say I am wrong but they would just be missing the obvious pattern."
    },
    revise_share: {
      criterion: "Honest labeling distinguishes what the evidence actually supports from what you still want to be true.",
      strongExample: "Claim: thicker wires conduct more heat \u2192 OVERREACH (my n=3 trials don't separate this from air-current noise). Claim: temperature varied across trials \u2192 SUPPORTED. Claim: material doesn't matter \u2192 STILL-UNKNOWN (I only tested copper).",
      weakExample: "Claim: my hypothesis was right \u2192 SUPPORTED."
    }
  };
  var LOOP_REWARDING_EXEMPLARS = [
    {
      criterion: "A strong inquiry shows the student looped back when evidence demanded it.",
      strongExample: "Stage log: model v1 (electricity makes heat) \u2192 noticed temp DROP at 2:14 \u2192 looped back to model_it \u2192 model v2 (wire conducts heat AWAY from bulb) \u2192 re-ran plan with thicker wires \u2192 3 loop-backs total, claims labeled honestly.",
      weakExample: "Stage log: walked notice \u2192 model \u2192 plan \u2192 gather \u2192 interpret \u2192 revise in 18 minutes. Zero loop-backs. Model v1 = model v3 verbatim. All claims SUPPORTED."
    },
    {
      criterion: "A model trajectory shows real revision, not cosmetic edits.",
      strongExample: 'v1: "wire gets hot because electricity" \u2192 v2 (after loop-back from gather): "wire conducts heat away from filament; thickness matters because cross-section" \u2192 v3 (after steelman): "maybe also radiates; air currents may explain trial variation". Each version names what changed and why.',
      weakExample: 'v1: "wire gets hot" \u2192 v2: "wire gets hot." \u2192 v3: "wire gets hot!" Same content, three saves.'
    }
  ];
  function wonderSorterGate(journal) {
    var titleCheck = isPlausibleProse(journal.questionTitle, 10, { minTokens: 2 });
    if (!titleCheck.ok) {
      return {
        ok: false,
        reason: "Describe the phenomenon you noticed in a real sentence (\u226510 chars, more than one word).",
        bypass_signals: ["questionTitle_" + titleCheck.reason]
      };
    }
    var devLevel = journal.devLevel || "6_8";
    var minPerW = devLevel === "k2" ? 8 : 15;
    var floor = devLevel === "k2" ? 3 : devLevel === "3_5" ? 4 : 5;
    var wonderings = Array.isArray(journal.wonderings) ? journal.wonderings : [];
    var valid = [];
    var signals = [];
    for (var i = 0; i < wonderings.length; i++) {
      var w = wonderings[i];
      var text = w && w.text || "";
      if (w && w.durationS && (!text || text.length < 3)) {
        if (w.durationS < 5) {
          signals.push("voice_too_short");
          continue;
        }
        valid.push(w);
        continue;
      }
      var prose = isPlausibleProse(text, minPerW, { minTokens: devLevel === "k2" ? 2 : 3 });
      if (!prose.ok) {
        signals.push("w_" + prose.reason);
        continue;
      }
      var lower = text.toLowerCase();
      if (!/[?]/.test(text) && !/\b(wonder|why|how|what|whether|does|do|could|would|is|are|will|can)\b/.test(lower)) {
        signals.push("not_question_shaped");
        continue;
      }
      valid.push(w);
    }
    for (var a = 0; a < valid.length; a++) {
      for (var b = a + 1; b < valid.length; b++) {
        if (tokenJaccard(valid[a].text, valid[b].text) > 0.7) {
          return {
            ok: false,
            reason: "Two of your wonderings are very similar \u2014 combine them or wonder about something different.",
            bypass_signals: signals.concat(["duplicate_wonderings"])
          };
        }
      }
    }
    if (valid.length < floor) {
      return {
        ok: false,
        reason: "You have " + valid.length + " real wonderings (need " + floor + "). Write each one as its own question.",
        bypass_signals: signals
      };
    }
    var stageNotes = (journal.stageNotes || {}).notice_wonder || {};
    if (!stageNotes.exemplarViewed && !stageNotes.exemplarDismissed) {
      return {
        ok: false,
        reason: "Look at the example pair for this step first \u2014 AI is the last scaffold, not the first.",
        bypass_signals: ["exemplar_not_viewed"]
      };
    }
    return { ok: true };
  }
  function modelSurfacerGate(journal) {
    var snaps = Array.isArray(journal.modelSnapshots) ? journal.modelSnapshots : [];
    var latest = snaps.length ? snaps[snaps.length - 1] : null;
    if (!latest || typeof latest.text !== "string") {
      return {
        ok: false,
        reason: "Write a first-draft model before AI can help surface assumptions.",
        bypass_signals: ["no_snapshot"]
      };
    }
    var devLevel = journal.devLevel || "6_8";
    var minChars = devLevel === "k2" ? 30 : devLevel === "3_5" ? 50 : 80;
    var minTokens = devLevel === "k2" ? 4 : 8;
    var prose = isPlausibleProse(latest.text, minChars, { minTokens });
    if (!prose.ok) {
      return {
        ok: false,
        reason: "Your model needs at least " + minChars + " characters of real prose. Name what's connected to what.",
        bypass_signals: ["model_" + prose.reason]
      };
    }
    if (!["low", "medium", "high"].includes(latest.confidence)) {
      return { ok: false, reason: "Pick a confidence level for your model first.", bypass_signals: ["no_confidence"] };
    }
    var lower = normalizeForCompare(latest.text);
    if (devLevel !== "k2") {
      var hasMechVerb = MECHANISM_VERBS.some(function(v) {
        return new RegExp("\\b" + v + "\\b").test(lower);
      });
      if (!hasMechVerb) {
        return {
          ok: false,
          reason: "Your model should say WHAT does WHAT to WHAT. Try words like causes, makes, carries, increases, depends on.",
          bypass_signals: ["no_mechanism_verb"]
        };
      }
    }
    var stop = H.SHARED_STOP_WORDS || /* @__PURE__ */ new Set();
    var contentSet = /* @__PURE__ */ new Set();
    lower.split(/\W+/).forEach(function(w) {
      if (w.length > 3 && !stop.has(w)) contentSet.add(w);
    });
    if (contentSet.size < (devLevel === "k2" ? 3 : 5)) {
      return {
        ok: false,
        reason: 'Your model needs to name a few specific things (not just "it" and "thing").',
        bypass_signals: ["low_entity_count"]
      };
    }
    var stageNotes = (journal.stageNotes || {}).model_it || {};
    if (!stageNotes.exemplarViewed && !stageNotes.exemplarDismissed) {
      return {
        ok: false,
        reason: "Look at the example pair for this step first.",
        bypass_signals: ["exemplar_not_viewed"]
      };
    }
    return { ok: true };
  }
  function steelmanSecondPassGate(journal) {
    var note = (journal.stageNotes || {}).interpret_argue || {};
    var ownReading = (note.text || "").trim();
    var ownSteelman = (note.steelmanText || "").trim();
    var ownAssumps = Array.isArray(note.studentSideAssumptionsRequired) ? note.studentSideAssumptionsRequired : [];
    var ownDiscs = Array.isArray(note.studentSideDisconfirmers) ? note.studentSideDisconfirmers : [];
    var readingCheck = isPlausibleProse(ownReading, 40, { minTokens: 7 });
    if (!readingCheck.ok) {
      return {
        ok: false,
        reason: "Your own reading of the evidence needs at least 40 chars of real prose.",
        bypass_signals: ["reading_" + readingCheck.reason]
      };
    }
    var steelmanCheck = isPlausibleProse(ownSteelman, 50, { minTokens: 9 });
    if (!steelmanCheck.ok) {
      return {
        ok: false,
        reason: "Your steelman of the OPPOSING reading needs at least 50 chars of real prose.",
        bypass_signals: ["steelman_" + steelmanCheck.reason]
      };
    }
    var sim = tokenJaccard(ownReading, ownSteelman);
    if (sim > 0.5) {
      return {
        ok: false,
        reason: "Your steelman reads like a copy of your own interpretation. A steelman argues the OTHER side \u2014 what would someone who disagrees with you say?",
        bypass_signals: ["steelman_mirrors_reading"]
      };
    }
    if (!PERSPECTIVE_MARKERS_RE.test(ownSteelman)) {
      return {
        ok: false,
        reason: 'A steelman argues from the other side. Try starting with "Someone could reasonably read this as ___" or "On the other hand ___".',
        bypass_signals: ["no_perspective_marker"]
      };
    }
    if (ownAssumps.length < 2) {
      return {
        ok: false,
        reason: "List \u22652 assumptions YOUR OWN reading requires before AI offers another reading.",
        bypass_signals: ["too_few_own_assumptions"]
      };
    }
    if (ownDiscs.length < 2) {
      return {
        ok: false,
        reason: "List \u22652 things that would disconfirm YOUR OWN reading before AI offers another.",
        bypass_signals: ["too_few_own_disconfirmers"]
      };
    }
    var evidence = (journal.evidenceCards || []).filter(function(c) {
      return c.tag !== "wondering";
    });
    if (evidence.length < 2) {
      return { ok: false, reason: "Log at least 2 evidence cards before interpreting.", bypass_signals: ["too_few_evidence"] };
    }
    var stageNotes = (journal.stageNotes || {}).interpret_argue || {};
    if (!stageNotes.exemplarViewed && !stageNotes.exemplarDismissed) {
      return { ok: false, reason: "Look at the example pair for this step first.", bypass_signals: ["exemplar_not_viewed"] };
    }
    return { ok: true };
  }
  function honestUncertaintyGate(journal) {
    var claims = Array.isArray(journal.claims) ? journal.claims : [];
    if (claims.length < 2) {
      return { ok: false, reason: "Write at least 2 claims first.", bypass_signals: ["too_few_claims"] };
    }
    var validLabels = /* @__PURE__ */ new Set(["supported", "overreach", "still_unknown"]);
    var evidence = (journal.evidenceCards || []).filter(function(c2) {
      return c2.tag !== "wondering";
    });
    var evidenceCorpus = normalizeForCompare(evidence.map(function(c2) {
      return c2.text || "";
    }).join(" "));
    var snaps = journal.modelSnapshots || [];
    var latestSnap = snaps.length ? normalizeForCompare(snaps[snaps.length - 1].text || "") : "";
    var signals = [];
    var stop = H.SHARED_STOP_WORDS || /* @__PURE__ */ new Set();
    for (var i = 0; i < claims.length; i++) {
      var c = claims[i];
      if (!c || typeof c.text !== "string") {
        return { ok: false, reason: "Claim " + (i + 1) + " is missing.", bypass_signals: ["missing_claim_" + i] };
      }
      var claimCheck = isPlausibleProse(c.text, 25, { minTokens: 5 });
      if (!claimCheck.ok) {
        return {
          ok: false,
          reason: "Claim " + (i + 1) + " needs at least 25 chars of real prose.",
          bypass_signals: ["claim_" + i + "_" + claimCheck.reason]
        };
      }
      if (!validLabels.has(c.label)) {
        return {
          ok: false,
          reason: "Label every claim yourself (supported / overreach / still-unknown).",
          bypass_signals: ["claim_" + i + "_unlabeled"]
        };
      }
      var claimNorm = normalizeForCompare(c.text);
      var hits = 0;
      claimNorm.split(/\W+/).forEach(function(tok) {
        if (tok.length > 4 && !stop.has(tok)) {
          if (evidenceCorpus.indexOf(tok) !== -1 || latestSnap.indexOf(tok) !== -1) hits++;
        }
      });
      if (hits === 0) {
        signals.push("claim_" + i + "_disconnected");
        return {
          ok: false,
          reason: "Claim " + (i + 1) + " doesn't mention anything from your evidence or model. Claims should be ABOUT what you investigated.",
          bypass_signals: signals
        };
      }
    }
    if (snaps.length < 2) {
      return {
        ok: false,
        reason: "Save a revised model snapshot first so we can see what changed.",
        bypass_signals: ["no_revised_snapshot"]
      };
    }
    var prev = snaps[snaps.length - 2].text || "";
    var curr = snaps[snaps.length - 1].text || "";
    if (tokenJaccard(prev, curr) > 0.9) {
      return {
        ok: false,
        reason: "Your revised model is nearly identical to the previous one. What actually changed?",
        bypass_signals: ["snapshot_no_revision"]
      };
    }
    var rs = (journal.stageNotes || {}).revise_share || {};
    if (!rs.exemplarViewed && !rs.exemplarDismissed) {
      return { ok: false, reason: "Look at the example pair for this step first.", bypass_signals: ["exemplar_not_viewed"] };
    }
    return { ok: true };
  }
  function wonderSorterPrompt(journal) {
    var devLevel = journal.devLevel || "6_8";
    var taxonomy = devLevel === "k2" ? ["what", "why", "how", "what_if"] : devLevel === "3_5" || devLevel === "6_8" ? ["descriptive", "causal", "mechanistic", "comparative", "classificatory"] : ["descriptive", "causal", "mechanistic", "comparative", "classificatory", "historical", "normative"];
    var wonderings = (journal.wonderings || []).map(function(w, i) {
      return i + 1 + ". " + (w.text || "[voice note " + (w.durationS || "?") + "s]");
    }).join("\n");
    return [
      "SYSTEM: You are a science-inquiry coach helping a " + devLevel + " student SORT wonderings they already wrote.",
      'You MUST NOT invent new wonderings, rewrite the student wording, or suggest "better" versions.',
      "You only categorize the student exact text by question-kind from this taxonomy: " + JSON.stringify(taxonomy) + ".",
      "For each wondering: pick exactly ONE kind from the taxonomy. Add a 1-sentence why_this_kind_question that QUOTES a 3-word substring from the student wording verbatim and ends with a question mark.",
      'If a wondering is ambiguous, mark kind "unclear" and add a clarifying entry to questions_to_consider.',
      "",
      "USER:",
      "phenomenon: " + (journal.questionTitle || ""),
      "devLevel: " + devLevel,
      "wonderings (verbatim, do not edit):",
      wonderings,
      "",
      'Return ONLY JSON: { "sorted": [{ "index": number, "verbatim": string, "kind": string, "why_this_kind_question": string }], "taxonomy_used": string[], "questions_to_consider": string[], "coverage_questions": string[] }'
    ].join("\n");
  }
  function modelSurfacerPrompt(journal) {
    var devLevel = journal.devLevel || "6_8";
    var snaps = journal.modelSnapshots || [];
    var latest = snaps[snaps.length - 1] || {};
    var knownUnknowns = latest.knownUnknowns || ((journal.stageNotes || {}).model_it || {}).text || "none stated";
    return [
      "SYSTEM: You are an inquiry coach helping a " + devLevel + " student surface what their own causal model ASSUMES.",
      'You MUST NOT write a "better" model, suggest revisions, or fill in mechanisms the student did not mention.',
      "You only mirror back quoted phrases (\u22648 word substrings verbatim from the student) paired with probe questions that surface implicit assumptions.",
      "For " + devLevel + " use \u22648-word sentences and no jargon for k2; for ap you may name mechanism types but never propose one.",
      "",
      "USER:",
      "phenomenon: " + (journal.questionTitle || ""),
      "devLevel: " + devLevel,
      "student current model (verbatim): " + (latest.text || ""),
      "confidence: " + (latest.confidence || "unstated"),
      "known unknowns the student listed: " + knownUnknowns,
      "",
      'Return ONLY JSON: { "quoted_phrases_inventory": [{ "quoted_phrase": string, "assumption_probe_questions": string[] }], "entities_question": string, "relationships_question": string, "confidence_evidence_inventory": { "phrases_suggesting_certainty": string[], "phrases_suggesting_uncertainty": string[] }, "questions_to_consider": string[] }'
    ].join("\n");
  }
  function steelmanSecondPassPrompt(journal) {
    var devLevel = journal.devLevel || "6_8";
    var note = (journal.stageNotes || {}).interpret_argue || {};
    var evidence = (journal.evidenceCards || []).filter(function(c) {
      return c.tag !== "wondering";
    });
    var evidenceList = evidence.map(function(c) {
      return "- id=" + c.id + " tag=" + (c.tag || "evidence") + ' text="' + (c.text || "").slice(0, 200) + '"';
    }).join("\n");
    return [
      'SYSTEM: You are an inquiry coach offering ONE additional reading of evidence \u2014 explicitly framed as "another reading worth considering", NEVER as "the alternative" and NEVER as "better than" the student.',
      "You MUST NOT rewrite, polish, or critique the quality of the student own steelman.",
      "You produce a SEPARATE, independent reading that cites at least 2 specific evidenceCards by id with quoted_snippet (verbatim substring of that card text).",
      "The reading expresses required-assumptions and disconfirmers AS QUESTIONS the student answers \u2014 never as finished claims.",
      "Do not pick a winner. End with comparison_prompt_questions that help the student compare the readings on specific dimensions.",
      "",
      "USER:",
      "phenomenon: " + (journal.questionTitle || ""),
      "devLevel: " + devLevel,
      "student own reading (verbatim, do not edit): " + (note.text || ""),
      "student own steelman (verbatim, do not edit): " + (note.steelmanText || ""),
      "evidence cards:",
      evidenceList,
      "",
      'Return ONLY JSON: { "another_reading": { "cited_evidence": [{ "card_id": string, "quoted_snippet": string }], "assumptions_required_questions": string[], "disconfirmer_questions": string[] }, "framing_note": string, "comparison_prompt_questions": string[] }'
    ].join("\n");
  }
  function honestUncertaintyPrompt(journal) {
    var devLevel = journal.devLevel || "6_8";
    var claims = (journal.claims || []).map(function(c, i) {
      return i + 1 + '. "' + (c.text || "") + '" [student label: ' + (c.label || "unlabeled") + "]";
    }).join("\n");
    var evidence = (journal.evidenceCards || []).filter(function(c) {
      return c.tag !== "wondering";
    });
    var evidenceList = evidence.map(function(c) {
      return "- id=" + c.id + ' text="' + (c.text || "").slice(0, 200) + '"';
    }).join("\n");
    var snaps = journal.modelSnapshots || [];
    var prev = snaps.length >= 2 ? snaps[snaps.length - 2].text || "" : "";
    var curr = snaps.length >= 1 ? snaps[snaps.length - 1].text || "" : "";
    return [
      "SYSTEM: You are a co-reviewer in the spirit of qualitative coding: the student labeled their own claims; your job is to QUESTION the labels, not to relabel.",
      "For each claim, examine: does the evidence the student gathered actually support the label they chose?",
      'You may add calibration_flag from {over-confident, under-confident, worth-reexamining} (NO "well-calibrated" \u2014 no AI approval verdicts).',
      "You MUST NOT output a corrected label. The student label MUST be echoed verbatim.",
      "Cite specific evidenceCards by id.",
      "",
      "USER:",
      "devLevel: " + devLevel,
      "claims with student labels:",
      claims,
      "evidence cards:",
      evidenceList,
      'prior model snapshot: "' + prev + '"',
      'revised model snapshot: "' + curr + '"',
      "",
      'Return ONLY JSON: { "per_claim": [{ "claim_index": number, "student_label": string, "label_probe_questions": string[], "evidence_cited": [{ "card_id": string, "relevance_probe": string }], "calibration_flag": string }], "revision_observation_questions": string[], "questions_to_consider": string[] }'
    ].join("\n");
  }
  function wonderSorterValidate(out, journal) {
    var atts = [];
    if (!out || !Array.isArray(out.sorted)) return { __rejected: true, rejectReason: "missing_sorted", attemptedShapeKeys: Object.keys(out || {}) };
    var wonderings = journal.wonderings || [];
    if (out.sorted.length !== wonderings.length) return { __rejected: true, rejectReason: "sorted_length_mismatch", attemptedShapeKeys: ["sorted"] };
    for (var i = 0; i < out.sorted.length; i++) {
      var s = out.sorted[i];
      var w = wonderings[s.index - 1] || wonderings[i];
      if (!w) return { __rejected: true, rejectReason: "sorted_index_out_of_range", attemptedShapeKeys: ["sorted"] };
      if (normalizeForCompare(s.verbatim) !== normalizeForCompare(w.text || "")) {
        return { __rejected: true, rejectReason: "sorted_verbatim_paraphrased", attemptedShapeKeys: ["sorted"] };
      }
    }
    return out;
  }
  function modelSurfacerValidate(out, journal) {
    var snaps = journal.modelSnapshots || [];
    var latest = snaps[snaps.length - 1] || {};
    var latestNorm = normalizeForCompare(latest.text || "");
    if (!out || !Array.isArray(out.quoted_phrases_inventory)) {
      return { __rejected: true, rejectReason: "missing_quoted_phrases_inventory", attemptedShapeKeys: Object.keys(out || {}) };
    }
    for (var i = 0; i < out.quoted_phrases_inventory.length; i++) {
      var qp = out.quoted_phrases_inventory[i];
      var phraseNorm = normalizeForCompare(qp.quoted_phrase || "");
      if (!phraseNorm || latestNorm.indexOf(phraseNorm) === -1) {
        return { __rejected: true, rejectReason: "quoted_phrase_not_in_model", attemptedShapeKeys: ["quoted_phrases_inventory"] };
      }
    }
    return out;
  }
  function steelmanValidate(out, journal) {
    if (!out || !out.another_reading) return { __rejected: true, rejectReason: "missing_another_reading", attemptedShapeKeys: Object.keys(out || {}) };
    var ar = out.another_reading;
    if (!Array.isArray(ar.cited_evidence) || ar.cited_evidence.length < 2) {
      return { __rejected: true, rejectReason: "too_few_cited_evidence", attemptedShapeKeys: ["cited_evidence"] };
    }
    var byId = {};
    (journal.evidenceCards || []).forEach(function(c) {
      byId[c.id] = c;
    });
    for (var i = 0; i < ar.cited_evidence.length; i++) {
      var ce = ar.cited_evidence[i];
      var card = byId[ce.card_id];
      if (!card) return { __rejected: true, rejectReason: "cited_card_not_found", attemptedShapeKeys: ["cited_evidence"] };
      var snipNorm = normalizeForCompare(ce.quoted_snippet || "");
      var cardNorm = normalizeForCompare(card.text || "");
      if (!snipNorm || cardNorm.indexOf(snipNorm) === -1) {
        return { __rejected: true, rejectReason: "quoted_snippet_not_in_card", attemptedShapeKeys: ["cited_evidence"] };
      }
    }
    var fn = (out.framing_note || "").toLowerCase();
    if (!/another|additional/.test(fn) || /the alternative|the correct|should instead|better than|more likely/.test(fn)) {
      return { __rejected: true, rejectReason: "framing_note_directive", attemptedShapeKeys: ["framing_note"] };
    }
    return out;
  }
  function honestUncertaintyValidate(out, journal) {
    if (!out || !Array.isArray(out.per_claim)) return { __rejected: true, rejectReason: "missing_per_claim", attemptedShapeKeys: Object.keys(out || {}) };
    var claims = journal.claims || [];
    if (out.per_claim.length !== claims.length) return { __rejected: true, rejectReason: "per_claim_length_mismatch", attemptedShapeKeys: ["per_claim"] };
    var validFlags = /* @__PURE__ */ new Set(["over-confident", "under-confident", "worth-reexamining"]);
    var byId = {};
    (journal.evidenceCards || []).forEach(function(c) {
      byId[c.id] = c;
    });
    for (var i = 0; i < out.per_claim.length; i++) {
      var pc = out.per_claim[i];
      if (pc.student_label !== claims[i].label) return { __rejected: true, rejectReason: "student_label_modified", attemptedShapeKeys: ["per_claim"] };
      if (!validFlags.has(pc.calibration_flag)) return { __rejected: true, rejectReason: "invalid_calibration_flag", attemptedShapeKeys: ["per_claim"] };
      if (Array.isArray(pc.evidence_cited)) {
        for (var k = 0; k < pc.evidence_cited.length; k++) {
          if (!byId[pc.evidence_cited[k].card_id]) return { __rejected: true, rejectReason: "cited_card_not_found", attemptedShapeKeys: ["per_claim", "evidence_cited"] };
        }
      }
    }
    return out;
  }
  var TOUCHPOINTS = {
    wonder_sorter: {
      id: "wonder_sorter",
      stage: "notice_wonder",
      label: "Sort my wonderings",
      gateCheck: wonderSorterGate,
      buildPrompt: wonderSorterPrompt,
      validate: wonderSorterValidate
    },
    model_surfacer: {
      id: "model_surfacer",
      stage: "model_it",
      label: "Surface my model",
      gateCheck: modelSurfacerGate,
      buildPrompt: modelSurfacerPrompt,
      validate: modelSurfacerValidate
    },
    steelman_second_pass: {
      id: "steelman_second_pass",
      stage: "interpret_argue",
      label: "Show me another reading",
      gateCheck: steelmanSecondPassGate,
      buildPrompt: steelmanSecondPassPrompt,
      validate: steelmanValidate
    },
    honest_uncertainty: {
      id: "honest_uncertainty",
      stage: "revise_share",
      label: "Question my labels",
      gateCheck: honestUncertaintyGate,
      buildPrompt: honestUncertaintyPrompt,
      validate: honestUncertaintyValidate
    }
  };
  function CycleWheel(props) {
    var t = props.t || function(k) {
      return k;
    };
    var activeStage = props.activeStage;
    var onJump = props.onJump;
    var journalStageNotes = props.journalStageNotes || {};
    var modelSnapshotCount = props.modelSnapshotCount || 0;
    var size = 188;
    var radius = 72;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        role: "navigation",
        "aria-label": t("scientific.cycle_nav_aria") || "Phenomenon Workbench cycle navigation",
        style: {
          position: "relative",
          width: size + "px",
          height: size + "px",
          flexShrink: 0
        }
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
      } }, t("scientific.cycle_center_label") || "Loops are first-class. Click any stage."),
      STAGES.map(function(s, idx) {
        var theta = idx / STAGES.length * 2 * Math.PI - Math.PI / 2;
        var x = size / 2 + radius * Math.cos(theta) - 22;
        var y = size / 2 + radius * Math.sin(theta) - 22;
        var isActive = activeStage === s.key;
        var stageNote = journalStageNotes[s.key] || {};
        var hasWork = !!(stageNote.text || stageNote.audioBase64 || s.key === "model_it" && modelSnapshotCount > 0);
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: s.key,
            type: "button",
            "data-help-key": "workbench_cycle_" + s.key,
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
              background: isActive ? s.color : hasWork ? "#f8fafc" : "#ffffff",
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
    var activeStage = props.activeStage;
    var onJump = props.onJump;
    var journalStageNotes = props.journalStageNotes || {};
    var modelSnapshotCount = props.modelSnapshotCount || 0;
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
        var stageNote = journalStageNotes[s.key] || {};
        var hasWork = !!(stageNote.text || stageNote.audioBase64 || s.key === "model_it" && modelSnapshotCount > 0);
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
    var fromStage = props.fromStage;
    var toStage = props.toStage;
    var onCommit = props.onCommit;
    var onCancel = props.onCancel;
    var _id = useState(null);
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
        "aria-label": t("scientific.loopback_modal_title") || "Why are you looping back?",
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
            maxWidth: "460px",
            width: "100%",
            padding: "20px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)"
          }
        },
        /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: "15px", fontWeight: 800, color: "#1e293b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F501} "), t("scientific.loopback_modal_title") || "Why are you looping back?"),
        /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 12px", fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, t("scientific.loopback_modal_help") || "Loops are evidence of thinking change \u2014 not setbacks. Your downstream work stays; you can return to where you were."),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } }, LOOPBACK_CHIPS.map(function(c) {
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
                border: selected ? "2px solid #7c3aed" : "1px solid #cbd5e1",
                background: selected ? "#f5f3ff" : "#ffffff",
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
            placeholder: t("scientific.loopback_other_placeholder") || "Briefly: what made you loop back? (\u226510 chars)",
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
              background: canCommit ? "#7c3aed" : "#cbd5e1",
              color: "#fff",
              border: "none",
              fontWeight: 800,
              fontSize: "12px",
              cursor: canCommit ? "pointer" : "not-allowed"
            }
          },
          t("scientific.loopback_commit") || "Loop back to ",
          " ",
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
      background: "#f8fafc",
      border: "1px solid #cbd5e1"
    } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", fontSize: "11px", fontWeight: 800, color: "#475569" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F393} "), t("scientific.educator_panel_summary") || "For teachers: why this lane is intentionally non-linear"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px", fontSize: "11px", color: "#475569", lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0" } }, t("scientific.educator_panel_p1") || "This lane is intentionally NOT linear. The 6-stage cycle is a thinking loop, not a checklist. A student who loops back 3+ times \u2014 because new evidence surprised them, or a peer review changed their mind \u2014 is doing BETTER science than one who walks 1\u21926 once and never revises."), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0" } }, t("scientific.educator_panel_p2") || "When grading, weight the loop log + model-version trajectory + claim labeling honesty AS MUCH OR MORE than the final stage-6 artifact. PHEOC linearity is a textbook fiction; real inquiry is iterative and serendipitous. AI here asks questions and surfaces alternatives \u2014 it never proposes finished revisions, finished models, or finished interpretations."), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0", fontStyle: "italic" } }, t("scientific.educator_panel_p3") || "Two cross-cutting rubric exemplars at lane exit reward loop-back density and model-trajectory depth specifically. Grade with those.")));
  }
  function ModelTimeline(props) {
    var t = props.t || function(k) {
      return k;
    };
    var snaps = props.snaps || [];
    var _expanded = useState(null);
    var expandedIdx = _expanded[0];
    var setExpandedIdx = _expanded[1];
    if (!snaps.length) {
      return /* @__PURE__ */ React.createElement("p", { style: { margin: "8px 0", fontSize: "11px", color: "#64748b", fontStyle: "italic" } }, t("scientific.no_snapshots_yet") || "No model snapshots yet. Save one to start the trajectory.");
    }
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { style: { margin: "6px 0", fontSize: "12px", fontWeight: 800, color: "#1e293b" } }, t("scientific.timeline_label") || "Model trajectory"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "6px" } }, snaps.map(function(s, i) {
      var prev = i > 0 ? snaps[i - 1] : null;
      var hasLoopOrigin = !!(s.loopBackOrigin && s.loopBackOrigin.fromStage);
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: i,
          type: "button",
          onClick: function() {
            setExpandedIdx(expandedIdx === i ? null : i);
          },
          style: {
            flexShrink: 0,
            padding: "8px 10px",
            borderRadius: "10px",
            background: "#ffffff",
            border: "1px solid " + (hasLoopOrigin ? "#a855f7" : "#cbd5e1"),
            minWidth: "120px",
            maxWidth: "180px",
            cursor: "pointer",
            textAlign: "left"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#7c3aed", fontWeight: 800 } }, "v", s.v, hasLoopOrigin && /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { marginLeft: "4px" } }, "\u{1F501}")),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#64748b", marginTop: "2px" } }, new Date(s.ts || 0).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), " \xB7 ", s.confidence || "?", " conf."),
        /* @__PURE__ */ React.createElement("div", { style: {
          marginTop: "4px",
          fontSize: "11px",
          color: "#1e293b",
          lineHeight: 1.4,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden"
        } }, s.text || "")
      );
    })), expandedIdx !== null && snaps[expandedIdx] && /* @__PURE__ */ React.createElement("div", { style: {
      marginTop: "8px",
      padding: "10px 12px",
      borderRadius: "10px",
      background: "#f8fafc",
      border: "1px solid #cbd5e1",
      fontSize: "12px",
      color: "#1e293b"
    } }, /* @__PURE__ */ React.createElement("strong", null, "v", snaps[expandedIdx].v, " (", snaps[expandedIdx].confidence || "?", " confidence)"), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0", lineHeight: 1.6 } }, snaps[expandedIdx].text), snaps[expandedIdx].knownUnknowns && /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0", fontSize: "11px", color: "#475569" } }, /* @__PURE__ */ React.createElement("em", null, t("scientific.timeline_unknowns_at_v") || "Known unknowns at this version:", " "), snaps[expandedIdx].knownUnknowns), snaps[expandedIdx].loopBackOrigin && /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0", fontSize: "11px", color: "#7c3aed" } }, /* @__PURE__ */ React.createElement("em", null, t("scientific.timeline_revision_after_loop") || "Revision after looping back from: ", " "), STAGE_BY_KEY[snaps[expandedIdx].loopBackOrigin.fromStage] ? STAGE_BY_KEY[snaps[expandedIdx].loopBackOrigin.fromStage].label : snaps[expandedIdx].loopBackOrigin.fromStage)));
  }
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
        t("scientific.review_exemplar_again") || "Review the example pair again"
      );
    }
    if (!viewed) {
      return /* @__PURE__ */ React.createElement("div", { style: {
        padding: "12px",
        borderRadius: "12px",
        background: "#fffbeb",
        border: "1px solid #fcd34d"
      } }, /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 8px", fontSize: "11px", fontWeight: 700, color: "#92400e" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4A1} "), t("scientific.exemplar_required_prefix") || "Before AI can help here:", " ", t("scientific.exemplar_required_suffix") || "check this example pair (1 min)."), /* @__PURE__ */ React.createElement(
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
        t("scientific.exemplar_skip") || "I've got it \u2014 skip without judging"
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
    var t = props.t;
    var data = props.data;
    var primitives = props.primitives || {};
    var SuggestionBadge = primitives.SuggestionBadge;
    if (!data) return null;
    return /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite", style: {
      marginTop: "10px",
      padding: "12px 14px",
      borderRadius: "12px",
      background: "#f5f3ff",
      border: "1px solid #c4b5fd"
    } }, SuggestionBadge && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "6px" } }, /* @__PURE__ */ React.createElement(SuggestionBadge, { t })), /* @__PURE__ */ React.createElement(AiResultBody, { data, t }));
  }
  function AiResultBody(props) {
    var data = props.data || {};
    var t = props.t || function(k) {
      return k;
    };
    function renderQuestions(arr, label) {
      if (!Array.isArray(arr) || !arr.length) return null;
      return /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#5b21b6" } }, label), /* @__PURE__ */ React.createElement("ul", { style: { margin: "4px 0 0", paddingLeft: "20px", fontSize: "12px", color: "#1e293b", lineHeight: 1.6 } }, arr.map(function(q, i) {
        return /* @__PURE__ */ React.createElement("li", { key: i }, q);
      })));
    }
    var sorted = Array.isArray(data.sorted) ? data.sorted : null;
    var pairs = Array.isArray(data.quoted_phrases_inventory) ? data.quoted_phrases_inventory : null;
    var another = data.another_reading;
    var perClaim = Array.isArray(data.per_claim) ? data.per_claim : null;
    return /* @__PURE__ */ React.createElement("div", null, sorted && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#5b21b6" } }, t("scientific.sorted_label") || "Your wonderings sorted"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "4px 0 0", paddingLeft: "18px", fontSize: "12px", lineHeight: 1.6 } }, sorted.map(function(s, i) {
      return /* @__PURE__ */ React.createElement("li", { key: i }, /* @__PURE__ */ React.createElement("em", null, s.kind), ': "', s.verbatim, '"', s.why_this_kind_question && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#7c3aed" } }, s.why_this_kind_question));
    }))), pairs && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#5b21b6" } }, t("scientific.assumption_probes_label") || "Questions about phrases from your model"), pairs.map(function(p, i) {
      return /* @__PURE__ */ React.createElement("div", { key: i, style: { marginTop: "4px", fontSize: "12px" } }, /* @__PURE__ */ React.createElement("em", null, '"', p.quoted_phrase, '"'), renderQuestions(p.assumption_probe_questions, ""));
    }), data.entities_question && /* @__PURE__ */ React.createElement("p", { style: { marginTop: "6px", fontSize: "12px", color: "#1e293b" } }, data.entities_question), data.relationships_question && /* @__PURE__ */ React.createElement("p", { style: { marginTop: "4px", fontSize: "12px", color: "#1e293b" } }, data.relationships_question)), another && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#5b21b6" } }, t("scientific.another_reading_label") || "AI offers another reading (additional, not the alternative)"), another.cited_evidence && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#475569" } }, /* @__PURE__ */ React.createElement("strong", null, "Cites: "), another.cited_evidence.map(function(ce, i) {
      return /* @__PURE__ */ React.createElement("div", { key: i }, "\xB7 #", ce.card_id, ' \u2014 "', ce.quoted_snippet, '"');
    })), renderQuestions(another.assumptions_required_questions, t("scientific.assumptions_required_label") || "Questions about what would have to hold:"), renderQuestions(another.disconfirmer_questions, t("scientific.disconfirmer_label") || "Questions about what would disconfirm this:"), renderQuestions(data.comparison_prompt_questions, t("scientific.comparison_label") || "Compare the readings:"), data.framing_note && /* @__PURE__ */ React.createElement("p", { style: { marginTop: "6px", fontSize: "11px", color: "#7c3aed", fontStyle: "italic" } }, data.framing_note)), perClaim && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#5b21b6" } }, t("scientific.per_claim_label") || "Questions about your labels"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "4px 0 0", paddingLeft: "18px", fontSize: "12px", lineHeight: 1.6 } }, perClaim.map(function(pc, i) {
      return /* @__PURE__ */ React.createElement("li", { key: i }, /* @__PURE__ */ React.createElement("strong", null, "Claim ", pc.claim_index || i + 1), " [", pc.student_label, ", AI flag: ", pc.calibration_flag, "]", renderQuestions(pc.label_probe_questions, ""));
    })), renderQuestions(data.revision_observation_questions, t("scientific.revision_obs_label") || "Questions about what changed:")), renderQuestions(data.questions_to_consider, t("scientific.questions_to_consider_label") || "More questions to consider:"), renderQuestions(data.coverage_questions, t("scientific.coverage_questions_label") || "Questions about coverage:"));
  }
  function NoticeWonderStage(props) {
    var t = props.t;
    var ctx = props.ctx;
    var journal = ctx.journal;
    var setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var VoiceNoteBlock = primitives.VoiceNoteBlock;
    var _adding = useState("");
    var adding = _adding[0];
    var setAdding = _adding[1];
    var _aiResult = useState(null);
    var aiResult = _aiResult[0];
    var setAiResult = _aiResult[1];
    var _busy = useState(false);
    var busy = _busy[0];
    var setBusy = _busy[1];
    var wonderings = journal.wonderings || [];
    var devLevel = journal.devLevel || "6_8";
    var floor = devLevel === "k2" ? 3 : devLevel === "3_5" ? 4 : 5;
    var addWondering = function(text, opts) {
      if (!text || !text.trim()) return;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.wonderings = (prev.wonderings || []).concat([{
          id: "w" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
          ts: Date.now(),
          text: text.trim(),
          durationS: opts && opts.durationS || 0
        }]);
        return next;
      });
      setAdding("");
    };
    var removeWondering = function(id) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.wonderings = (prev.wonderings || []).filter(function(w) {
          return w.id !== id;
        });
        return next;
      });
    };
    var askSort = async function() {
      setBusy(true);
      setAiResult(null);
      try {
        var res = await ctx.ask(TOUCHPOINTS.wonder_sorter, ctx);
        setAiResult(res);
      } finally {
        setBusy(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      ExemplarGate,
      {
        t,
        stageKey: "notice_wonder",
        journal,
        setJournal,
        primitives,
        pair: EXEMPLAR_PAIRS.notice_wonder
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 8px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("scientific.wonderings_title") || "Your wonderings", /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "8px", fontSize: "11px", fontWeight: 700, color: floor > wonderings.length ? "#d97706" : "#16a34a" } }, "(", wonderings.length, "/", floor, ")")), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 8px", fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, t("scientific.wonderings_help") || "List at least " + floor + " wonderings of your own. Each one is its own line. AI will sort them by kind \u2014 never invent them for you."), /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" } }, wonderings.map(function(w) {
      return /* @__PURE__ */ React.createElement("li", { key: w.id, style: {
        display: "flex",
        gap: "8px",
        alignItems: "center",
        padding: "6px 8px",
        borderRadius: "8px",
        background: "#f8fafc",
        fontSize: "12px",
        color: "#1e293b"
      } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2022"), /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }, w.text || "[voice " + (w.durationS || "?") + "s]"), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            removeWondering(w.id);
          },
          "aria-label": "Remove this wondering",
          style: {
            background: "transparent",
            border: "none",
            color: "#64748b",
            cursor: "pointer",
            fontSize: "14px"
          }
        },
        "\u2715"
      ));
    })), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px", display: "flex", gap: "6px" } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: adding,
        onChange: function(e) {
          setAdding(e.target.value);
        },
        onKeyDown: function(e) {
          if (e.key === "Enter") addWondering(adding);
        },
        placeholder: t("scientific.wondering_placeholder") || "I wonder whether\u2026",
        maxLength: 240,
        style: {
          flex: 1,
          padding: "8px 10px",
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
        onClick: function() {
          addWondering(adding);
        },
        style: {
          padding: "6px 12px",
          borderRadius: "999px",
          background: "#7c3aed",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "12px",
          cursor: "pointer"
        }
      },
      "+"
    ))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: busy,
        onClick: askSort,
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
      busy ? t("scientific.sorting") || "Sorting\u2026" : t("scientific.sort_button") || "Sort my wonderings"
    ), aiResult && aiResult.blocked && /* @__PURE__ */ React.createElement(BlockedNote, { t, reason: aiResult.detail || aiResult.blockedReason }), aiResult && !aiResult.blocked && aiResult.data && /* @__PURE__ */ React.createElement(AiResultPanel, { t, data: aiResult.data, primitives }));
  }
  function ModelItStage(props) {
    var t = props.t;
    var ctx = props.ctx;
    var journal = ctx.journal;
    var setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var snaps = journal.modelSnapshots || [];
    var latest = snaps.length ? snaps[snaps.length - 1] : null;
    var _draft = useState(latest && latest.text || "");
    var draft = _draft[0];
    var setDraft = _draft[1];
    var _conf = useState(latest && latest.confidence || "");
    var conf = _conf[0];
    var setConf = _conf[1];
    var _unk = useState(latest && latest.knownUnknowns || "");
    var unk = _unk[0];
    var setUnk = _unk[1];
    var _aiResult = useState(null);
    var aiResult = _aiResult[0];
    var setAiResult = _aiResult[1];
    var _busy = useState(false);
    var busy = _busy[0];
    var setBusy = _busy[1];
    var canSave = draft.trim().length >= 30 && ["low", "medium", "high"].includes(conf);
    var saveSnapshot = function() {
      if (!canSave) return;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        var prior = prev.modelSnapshots || [];
        var loopOrigin = prev.pendingLoopReturn ? { fromStage: prev.pendingLoopReturn.fromStage, ts: Date.now() } : null;
        var snap = {
          v: prior.length + 1,
          ts: Date.now(),
          text: draft.trim(),
          confidence: conf,
          knownUnknowns: unk.trim()
        };
        if (loopOrigin) snap.loopBackOrigin = loopOrigin;
        next.modelSnapshots = prior.concat([snap]);
        return next;
      });
    };
    var askSurface = async function() {
      setBusy(true);
      setAiResult(null);
      try {
        var res = await ctx.ask(TOUCHPOINTS.model_surfacer, ctx);
        setAiResult(res);
      } finally {
        setBusy(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      ExemplarGate,
      {
        t,
        stageKey: "model_it",
        journal,
        setJournal,
        primitives,
        pair: EXEMPLAR_PAIRS.model_it
      }
    ), /* @__PURE__ */ React.createElement(ModelTimeline, { t, snaps }), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("scientific.draft_model_label") || "Draft your current model"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: draft,
        onChange: function(e) {
          setDraft(e.target.value);
        },
        rows: 4,
        maxLength: 1500,
        placeholder: t("scientific.model_placeholder") || "What do you think is happening, and WHY? Name the things involved and how you think they relate. It is fine \u2014 and useful \u2014 to be tentative.",
        style: {
          width: "100%",
          boxSizing: "border-box",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          fontSize: "13px",
          fontFamily: "inherit",
          resize: "vertical",
          minHeight: "80px"
        }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: "#475569", fontWeight: 700 } }, t("scientific.confidence_label") || "Confidence:"), ["low", "medium", "high"].map(function(c) {
      return /* @__PURE__ */ React.createElement("label", { key: c, style: {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "11px",
        color: "#475569",
        cursor: "pointer"
      } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "radio",
          name: "model-confidence",
          value: c,
          checked: conf === c,
          onChange: function() {
            setConf(c);
          }
        }
      ), c);
    })), /* @__PURE__ */ React.createElement("label", { style: { display: "block", marginTop: "10px", fontSize: "11px", color: "#475569", fontWeight: 700 } }, t("scientific.known_unknowns_label") || "What you do NOT know yet (be honest):"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: unk,
        onChange: function(e) {
          setUnk(e.target.value);
        },
        rows: 2,
        maxLength: 800,
        placeholder: t("scientific.known_unknowns_placeholder") || "e.g., I don't know whether the wire's material matters or just its thickness.",
        style: {
          marginTop: "4px",
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
    ), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: !canSave,
        onClick: saveSnapshot,
        style: {
          padding: "8px 14px",
          borderRadius: "999px",
          background: canSave ? "#7c3aed" : "#cbd5e1",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "12px",
          cursor: canSave ? "pointer" : "not-allowed"
        }
      },
      t("scientific.save_snapshot") || "Save model snapshot"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: busy,
        onClick: askSurface,
        style: {
          padding: "8px 14px",
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
      busy ? t("scientific.surfacing") || "Surfacing\u2026" : t("scientific.surface_button") || "Surface my model"
    ))), aiResult && aiResult.blocked && /* @__PURE__ */ React.createElement(BlockedNote, { t, reason: aiResult.detail || aiResult.blockedReason }), aiResult && !aiResult.blocked && aiResult.data && /* @__PURE__ */ React.createElement(AiResultPanel, { t, data: aiResult.data, primitives }));
  }
  function PlanStage(props) {
    var t = props.t;
    var ctx = props.ctx;
    var journal = ctx.journal;
    var setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var stageNote = (journal.stageNotes || {}).plan || {};
    var _method = useState(stageNote.method || "");
    var method = _method[0];
    var setMethod = _method[1];
    var _whyFits = useState(stageNote.text || "");
    var whyFits = _whyFits[0];
    var setWhyFits = _whyFits[1];
    var _cant = useState(stageNote.cantTell || "");
    var cantTell = _cant[0];
    var setCantTell = _cant[1];
    useEffect(function() {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.stageNotes = Object.assign({}, prev.stageNotes || {});
        next.stageNotes.plan = Object.assign({}, next.stageNotes.plan || {}, {
          method,
          text: whyFits,
          cantTell,
          ts: Date.now()
        });
        return next;
      });
    }, [method, whyFits, cantTell]);
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      ExemplarGate,
      {
        t,
        stageKey: "plan",
        journal,
        setJournal,
        primitives,
        pair: EXEMPLAR_PAIRS.plan
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 8px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("scientific.method_menu_title") || 'Pick a method (none is "best" \u2014 each has trade-offs)'), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" } }, METHOD_MENU.map(function(m) {
      var selected = method === m.key;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: m.key,
          type: "button",
          onClick: function() {
            setMethod(m.key);
          },
          "aria-pressed": selected,
          style: {
            padding: "10px 12px",
            borderRadius: "10px",
            background: selected ? "#f5f3ff" : "#ffffff",
            border: selected ? "2px solid #7c3aed" : "1px solid #cbd5e1",
            textAlign: "left",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            gap: "4px"
          }
        },
        /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "12px", color: "#1e293b" } }, m.label),
        /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#475569", lineHeight: 1.4 } }, /* @__PURE__ */ React.createElement("em", null, "Fits when:"), " ", m.fits),
        /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#b91c1c", lineHeight: 1.4 } }, /* @__PURE__ */ React.createElement("em", null, "Doesn't fit when:"), " ", m.doesntFit)
      );
    }))), method && /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "12px", fontWeight: 700, color: "#1e293b" } }, t("scientific.why_method_fits") || "Why does THIS method fit MY question?"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: whyFits,
        onChange: function(e) {
          setWhyFits(e.target.value);
        },
        rows: 3,
        maxLength: 800,
        placeholder: t("scientific.why_method_placeholder") || "Explain in your own words\u2026",
        style: {
          marginTop: "4px",
          width: "100%",
          boxSizing: "border-box",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit",
          resize: "vertical"
        }
      }
    ), /* @__PURE__ */ React.createElement("label", { style: { display: "block", marginTop: "10px", fontSize: "12px", fontWeight: 700, color: "#1e293b" } }, t("scientific.what_cant_tell") || "What this method CAN'T tell you:"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: cantTell,
        onChange: function(e) {
          setCantTell(e.target.value);
        },
        rows: 2,
        maxLength: 600,
        placeholder: t("scientific.what_cant_tell_placeholder") || "Be honest about the method's limits\u2026",
        style: {
          marginTop: "4px",
          width: "100%",
          boxSizing: "border-box",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit",
          resize: "vertical"
        }
      }
    )), /* @__PURE__ */ React.createElement("p", { style: { margin: "6px 0 0", fontSize: "11px", color: "#64748b", fontStyle: "italic" } }, t("scientific.plan_no_ai_note") || "There's no AI helper on this stage by design \u2014 picking a method is your call."));
  }
  function GatherStage(props) {
    var t = props.t;
    var ctx = props.ctx;
    var journal = ctx.journal;
    var setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var VoiceNoteBlock = primitives.VoiceNoteBlock;
    var evidence = (journal.evidenceCards || []).filter(function(c) {
      return c.tag !== "wondering";
    });
    var _adding = useState({ text: "", surprise: false });
    var addingDraft = _adding[0];
    var setAddingDraft = _adding[1];
    var addCard = function(kind, opts) {
      var text = (addingDraft.text || "").trim();
      if (kind === "text" && !text) return;
      var card = {
        id: "ev" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
        ts: Date.now(),
        kind,
        text,
        tag: addingDraft.surprise ? "surprise" : "expected",
        audioBase64: opts && opts.audioBase64 || null,
        durationS: opts && opts.durationS || 0
      };
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.evidenceCards = (prev.evidenceCards || []).concat([card]);
        return next;
      });
      setAddingDraft({ text: "", surprise: false });
    };
    var removeCard = function(id) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.evidenceCards = (prev.evidenceCards || []).filter(function(c) {
          return c.id !== id;
        });
        return next;
      });
    };
    var expected = evidence.filter(function(c) {
      return c.tag !== "surprise";
    });
    var surprise = evidence.filter(function(c) {
      return c.tag === "surprise";
    });
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      ExemplarGate,
      {
        t,
        stageKey: "gather",
        journal,
        setJournal,
        primitives,
        pair: EXEMPLAR_PAIRS.gather
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 8px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("scientific.add_evidence_label") || "Log an evidence card"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: addingDraft.text,
        onChange: function(e) {
          setAddingDraft(Object.assign({}, addingDraft, { text: e.target.value }));
        },
        rows: 2,
        maxLength: 400,
        placeholder: t("scientific.evidence_placeholder") || "What did you observe / measure / find? Be specific.",
        style: {
          width: "100%",
          boxSizing: "border-box",
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("label", { style: { display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#b45309", cursor: "pointer" } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: addingDraft.surprise,
        onChange: function(e) {
          setAddingDraft(Object.assign({}, addingDraft, { surprise: e.target.checked }));
        }
      }
    ), /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4A1} "), t("scientific.surprise_check") || "Didn't expect this"), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          addCard("text");
        },
        style: {
          padding: "6px 12px",
          borderRadius: "999px",
          background: "#7c3aed",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "11px",
          cursor: "pointer"
        }
      },
      t("scientific.add_card_button") || "+ Add card"
    ))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" } }, /* @__PURE__ */ React.createElement(EvidenceColumn, { t, title: t("scientific.expected_column") || "Expected", cards: expected, onRemove: removeCard, accent: "#16a34a" }), /* @__PURE__ */ React.createElement(EvidenceColumn, { t, title: t("scientific.surprise_column") || "Didn't expect this", cards: surprise, onRemove: removeCard, accent: "#d97706" })));
  }
  function EvidenceColumn(props) {
    var t = props.t;
    var cards = props.cards || [];
    var accent = props.accent || "#475569";
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "10px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h5", { style: { margin: "0 0 6px", fontSize: "11px", fontWeight: 800, color: accent, textTransform: "uppercase", letterSpacing: "0.4px" } }, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-block", width: "8px", height: "8px", background: accent, borderRadius: "50%", marginRight: "6px" }, "aria-hidden": "true" }), props.title, " ", /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 700, color: "#64748b", textTransform: "none" } }, "(", cards.length, ")")), cards.length === 0 ? /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "11px", color: "#94a3b8", fontStyle: "italic" } }, t("scientific.no_evidence_yet") || "Nothing yet.") : /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" } }, cards.map(function(c) {
      return /* @__PURE__ */ React.createElement("li", { key: c.id, style: {
        padding: "6px 8px",
        borderRadius: "8px",
        background: "#f8fafc",
        fontSize: "11px",
        color: "#1e293b",
        display: "flex",
        gap: "6px",
        alignItems: "flex-start"
      } }, /* @__PURE__ */ React.createElement("span", { style: { flex: 1, lineHeight: 1.5 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#64748b" } }, new Date(c.ts || 0).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })), " ", c.text), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            props.onRemove(c.id);
          },
          "aria-label": "Remove evidence card",
          style: { background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }
        },
        "\u2715"
      ));
    })));
  }
  function InterpretArgueStage(props) {
    var t = props.t;
    var ctx = props.ctx;
    var journal = ctx.journal;
    var setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var note = (journal.stageNotes || {}).interpret_argue || {};
    var _read = useState(note.text || "");
    var reading = _read[0];
    var setReading = _read[1];
    var _steel = useState(note.steelmanText || "");
    var steelman = _steel[0];
    var setSteelman = _steel[1];
    var _asA = useState(Array.isArray(note.studentSideAssumptionsRequired) ? note.studentSideAssumptionsRequired.join("\n") : "");
    var asA = _asA[0];
    var setAsA = _asA[1];
    var _disC = useState(Array.isArray(note.studentSideDisconfirmers) ? note.studentSideDisconfirmers.join("\n") : "");
    var disC = _disC[0];
    var setDisC = _disC[1];
    var _comp = useState(note.comparisonText || "");
    var comp = _comp[0];
    var setComp = _comp[1];
    var _busy = useState(false);
    var busy = _busy[0];
    var setBusy = _busy[1];
    var _aiResult = useState(null);
    var aiResult = _aiResult[0];
    var setAiResult = _aiResult[1];
    useEffect(function() {
      var assumpsArr = asA.split("\n").map(function(s) {
        return s.trim();
      }).filter(Boolean);
      var discsArr = disC.split("\n").map(function(s) {
        return s.trim();
      }).filter(Boolean);
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.stageNotes = Object.assign({}, prev.stageNotes || {});
        next.stageNotes.interpret_argue = Object.assign({}, next.stageNotes.interpret_argue || {}, {
          text: reading,
          steelmanText: steelman,
          studentSideAssumptionsRequired: assumpsArr,
          studentSideDisconfirmers: discsArr,
          comparisonText: comp,
          ts: Date.now()
        });
        return next;
      });
    }, [reading, steelman, asA, disC, comp]);
    var askAnother = async function() {
      setBusy(true);
      setAiResult(null);
      try {
        var res = await ctx.ask(TOUCHPOINTS.steelman_second_pass, ctx);
        setAiResult(res);
      } finally {
        setBusy(false);
      }
    };
    var canAsk = reading.trim().length >= 40 && steelman.trim().length >= 50 && asA.split("\n").filter(function(s) {
      return s.trim();
    }).length >= 2 && disC.split("\n").filter(function(s) {
      return s.trim();
    }).length >= 2;
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      ExemplarGate,
      {
        t,
        stageKey: "interpret_argue",
        journal,
        setJournal,
        primitives,
        pair: EXEMPLAR_PAIRS.interpret_argue
      }
    ), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("scientific.your_reading_label") || "Your reading of the evidence",
        help: t("scientific.your_reading_help") || "What do YOU think the data shows? Be specific. \u226540 chars.",
        value: reading,
        onChange: setReading,
        rows: 4,
        max: 1200
      }
    ), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("scientific.your_steelman_label") || "Your steelman of an OPPOSING reading",
        help: t("scientific.your_steelman_help") || 'Argue the other side as strongly as you can. Try "Someone could reasonably read this as \u2026". \u226550 chars.',
        value: steelman,
        onChange: setSteelman,
        rows: 4,
        max: 1200
      }
    ), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("scientific.your_assumptions_label") || "Assumptions YOUR OWN reading requires (one per line, \u22652)",
        help: t("scientific.your_assumptions_help") || "What would have to be true for your reading to hold?",
        value: asA,
        onChange: setAsA,
        rows: 3,
        max: 800
      }
    ), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("scientific.your_disconfirmers_label") || "What would disconfirm YOUR OWN reading (one per line, \u22652)",
        help: t("scientific.your_disconfirmers_help") || "What evidence would tell you your reading is wrong?",
        value: disC,
        onChange: setDisC,
        rows: 3,
        max: 800
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: busy || !canAsk,
        onClick: askAnother,
        style: {
          alignSelf: "flex-start",
          padding: "10px 18px",
          borderRadius: "999px",
          background: busy || !canAsk ? "#cbd5e1" : "#16a34a",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "12px",
          cursor: busy || !canAsk ? "not-allowed" : "pointer"
        }
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F916} "),
      busy ? t("scientific.asking") || "Asking\u2026" : t("scientific.ask_another_button") || "Show me another reading"
    ), aiResult && aiResult.blocked && /* @__PURE__ */ React.createElement(BlockedNote, { t, reason: aiResult.detail || aiResult.blockedReason }), aiResult && !aiResult.blocked && aiResult.data && /* @__PURE__ */ React.createElement(AiResultPanel, { t, data: aiResult.data, primitives }), aiResult && !aiResult.blocked && /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("scientific.comparison_label") || "Your comparison (gate to Revise & Share + export, \u226580 chars)",
        help: t("scientific.comparison_help") || "Given OUR evidence: which reading is stronger, and what additional evidence would distinguish them? You author this \u2014 AI does not.",
        value: comp,
        onChange: setComp,
        rows: 4,
        max: 1200
      }
    ));
  }
  function TextareaCard(props) {
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "12px", fontWeight: 700, color: "#1e293b", display: "block" } }, props.label), props.help && /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0", fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, props.help), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: props.value,
        onChange: function(e) {
          props.onChange(e.target.value);
        },
        rows: props.rows || 3,
        maxLength: props.max || 800,
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
  function ReviseShareStage(props) {
    var t = props.t;
    var ctx = props.ctx;
    var journal = ctx.journal;
    var setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var claims = journal.claims || [];
    var snaps = journal.modelSnapshots || [];
    var lastSnap = snaps.length ? snaps[snaps.length - 1] : null;
    var _revised = useState(lastSnap && lastSnap.text || "");
    var revised = _revised[0];
    var setRevised = _revised[1];
    var _revConf = useState(lastSnap && lastSnap.confidence || "");
    var revConf = _revConf[0];
    var setRevConf = _revConf[1];
    var _revUnk = useState(lastSnap && lastSnap.knownUnknowns || "");
    var revUnk = _revUnk[0];
    var setRevUnk = _revUnk[1];
    var _refl = useState(((journal.stageNotes || {}).revise_share || {}).revisionReflection || "");
    var refl = _refl[0];
    var setRefl = _refl[1];
    var _aiResult = useState(null);
    var aiResult = _aiResult[0];
    var setAiResult = _aiResult[1];
    var _busy = useState(false);
    var busy = _busy[0];
    var setBusy = _busy[1];
    var _adding = useState("");
    var adding = _adding[0];
    var setAdding = _adding[1];
    useEffect(function() {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.stageNotes = Object.assign({}, prev.stageNotes || {});
        next.stageNotes.revise_share = Object.assign({}, next.stageNotes.revise_share || {}, {
          revisionReflection: refl,
          ts: Date.now()
        });
        return next;
      });
    }, [refl]);
    var saveRevised = function() {
      if (revised.trim().length < 30 || !revConf) return;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        var prior = prev.modelSnapshots || [];
        next.modelSnapshots = prior.concat([{
          v: prior.length + 1,
          ts: Date.now(),
          text: revised.trim(),
          confidence: revConf,
          knownUnknowns: revUnk.trim(),
          loopBackOrigin: prev.pendingLoopReturn ? { fromStage: prev.pendingLoopReturn.fromStage, ts: Date.now() } : null
        }]);
        return next;
      });
    };
    var addClaim = function() {
      if (!adding.trim()) return;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.claims = (prev.claims || []).concat([{
          id: "cl" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
          ts: Date.now(),
          text: adding.trim(),
          label: "",
          staleLabel: false
        }]);
        return next;
      });
      setAdding("");
    };
    var setClaimLabel = function(id, label) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.claims = (prev.claims || []).map(function(c) {
          if (c.id !== id) return c;
          return Object.assign({}, c, { label, staleLabel: false });
        });
        return next;
      });
    };
    var removeClaim = function(id) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.claims = (prev.claims || []).filter(function(c) {
          return c.id !== id;
        });
        return next;
      });
    };
    var askQuestion = async function() {
      setBusy(true);
      setAiResult(null);
      try {
        var res = await ctx.ask(TOUCHPOINTS.honest_uncertainty, ctx);
        setAiResult(res);
      } finally {
        setBusy(false);
      }
    };
    var canAsk = claims.length >= 2 && claims.every(function(c) {
      return c.text && c.text.length >= 25 && ["supported", "overreach", "still_unknown"].includes(c.label);
    });
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      ExemplarGate,
      {
        t,
        stageKey: "revise_share",
        journal,
        setJournal,
        primitives,
        pair: EXEMPLAR_PAIRS.revise_share
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("scientific.revised_model_label") || "Revised model (becomes vN+1 snapshot)"), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 6px", fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, t("scientific.revised_model_help") || "What changed in your thinking, and why? Save a new snapshot."), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: revised,
        onChange: function(e) {
          setRevised(e.target.value);
        },
        rows: 4,
        maxLength: 1500,
        style: {
          width: "100%",
          boxSizing: "border-box",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          fontSize: "13px",
          fontFamily: "inherit",
          resize: "vertical"
        }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: "#475569", fontWeight: 700 } }, "Confidence:"), ["low", "medium", "high"].map(function(c) {
      return /* @__PURE__ */ React.createElement("label", { key: c, style: { display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "#475569", cursor: "pointer" } }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "rev-conf", value: c, checked: revConf === c, onChange: function() {
        setRevConf(c);
      } }), c);
    }), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: saveRevised,
        disabled: revised.trim().length < 30 || !revConf,
        style: {
          padding: "6px 12px",
          borderRadius: "999px",
          background: revised.trim().length < 30 || !revConf ? "#cbd5e1" : "#7c3aed",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "11px",
          cursor: "pointer"
        }
      },
      t("scientific.save_revised_snapshot") || "Save revised snapshot"
    )), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: revUnk,
        onChange: function(e) {
          setRevUnk(e.target.value);
        },
        rows: 2,
        maxLength: 600,
        placeholder: t("scientific.revised_unknowns_placeholder") || "What is still unknown at this version?",
        style: {
          marginTop: "8px",
          width: "100%",
          boxSizing: "border-box",
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      }
    )), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("scientific.revision_reflection_label") || "What changed in your thinking? (export gate, \u226540 chars)",
        help: t("scientific.revision_reflection_help") || "Articulate what shifted between your v1 model and now \u2014 in your own words.",
        value: refl,
        onChange: setRefl,
        rows: 3,
        max: 800
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("scientific.claims_label") || "Your claims (\u22652; label each honestly)"), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 8px", fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, t("scientific.claims_help") || "Claims should be ABOUT what you investigated. Label EACH yourself before AI questions your labels."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "6px", marginBottom: "8px" } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: adding,
        onChange: function(e) {
          setAdding(e.target.value);
        },
        onKeyDown: function(e) {
          if (e.key === "Enter") addClaim();
        },
        placeholder: t("scientific.claim_placeholder") || "A specific claim about your investigation\u2026",
        maxLength: 400,
        style: {
          flex: 1,
          padding: "8px 10px",
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
          background: "#7c3aed",
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
      } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", color: "#1e293b", marginBottom: "6px" } }, /* @__PURE__ */ React.createElement("strong", null, idx + 1, "."), " ", c.text, c.staleLabel && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "6px", fontSize: "10px", color: "#92400e", fontWeight: 700 } }, "label is stale \u2014 your model changed")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap" } }, [
        { k: "supported", label: "Supported", color: "#16a34a" },
        { k: "overreach", label: "Overreach", color: "#d97706" },
        { k: "still_unknown", label: "Still unknown", color: "#6366f1" }
      ].map(function(opt) {
        var selected = c.label === opt.k;
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: opt.k,
            type: "button",
            onClick: function() {
              setClaimLabel(c.id, opt.k);
            },
            style: {
              padding: "4px 10px",
              borderRadius: "999px",
              background: selected ? opt.color : "#ffffff",
              color: selected ? "#fff" : opt.color,
              border: "1px solid " + opt.color,
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer"
            }
          },
          opt.label
        );
      }), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            removeClaim(c.id);
          },
          "aria-label": "Remove claim",
          style: { marginLeft: "auto", background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "12px" }
        },
        "\u2715"
      )));
    }))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: busy || !canAsk,
        onClick: askQuestion,
        style: {
          alignSelf: "flex-start",
          padding: "10px 18px",
          borderRadius: "999px",
          background: busy || !canAsk ? "#cbd5e1" : "#4338ca",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "12px",
          cursor: busy || !canAsk ? "not-allowed" : "pointer"
        }
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F916} "),
      busy ? t("scientific.questioning") || "Questioning\u2026" : t("scientific.question_my_labels") || "Question my labels"
    ), aiResult && aiResult.blocked && /* @__PURE__ */ React.createElement(BlockedNote, { t, reason: aiResult.detail || aiResult.blockedReason }), aiResult && !aiResult.blocked && aiResult.data && /* @__PURE__ */ React.createElement(AiResultPanel, { t, data: aiResult.data, primitives }));
  }
  function BlockedNote(props) {
    var t = props.t;
    var reason = props.reason || (t("scientific.blocked_generic") || "AI couldn't help with that \u2014 try again later.");
    return /* @__PURE__ */ React.createElement("div", { role: "alert", style: {
      padding: "10px 12px",
      borderRadius: "10px",
      background: "#fef3c7",
      border: "1px solid #fbbf24",
      fontSize: "11px",
      color: "#92400e",
      lineHeight: 1.5
    } }, /* @__PURE__ */ React.createElement("strong", { style: { marginRight: "4px" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F6E1}\uFE0F "), t("scientific.blocked_prefix") || "AI helper paused:"), reason);
  }
  function LaneRoot(props) {
    var ctx = props.ctx;
    var t = ctx.t;
    var journal = ctx.journal;
    var setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var activeStage = journal.activeStage || "notice_wonder";
    if (STAGE_KEYS.indexOf(activeStage) === -1) activeStage = "notice_wonder";
    var _loopback = useState(null);
    var loopback = _loopback[0];
    var setLoopback = _loopback[1];
    var jumpStage = useCallback(function(toStage) {
      if (toStage === activeStage) return;
      var toIdx = STAGE_KEYS.indexOf(toStage);
      var fromIdx = STAGE_KEYS.indexOf(activeStage);
      if (toIdx === -1 || fromIdx === -1) return;
      if (toIdx < fromIdx) {
        setLoopback({ fromStage: activeStage, toStage });
        return;
      }
      setJournal(function(prev) {
        return Object.assign({}, prev, { activeStage: toStage });
      });
      announce((t("scientific.sr_now_on") || "Now on: ") + (STAGE_BY_KEY[toStage] && STAGE_BY_KEY[toStage].label || toStage), "polite");
    }, [activeStage]);
    var commitLoopBack = useCallback(function(payload) {
      var fromStage = loopback.fromStage;
      var toStage = loopback.toStage;
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
        if (next.claims && next.claims.length) {
          next.claims = next.claims.map(function(c) {
            return Object.assign({}, c, { staleLabel: true });
          });
        }
        next.activeStage = toStage;
        next.pendingLoopReturn = { fromStage, ts: Date.now() };
        return next;
      });
      setLoopback(null);
      announce((t("scientific.sr_looped_back") || "Looped back to ") + (STAGE_BY_KEY[toStage] && STAGE_BY_KEY[toStage].label || toStage) + ". " + (t("scientific.sr_work_preserved") || "Your earlier work is preserved; you can return to where you were."), "polite");
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
    var laneCtx = Object.assign({}, ctx, {
      activeStage
    });
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
      t("scientific.back_to_hub_lanes") || "Choose a different lane"
    ), /* @__PURE__ */ React.createElement(EducatorPanel, { t }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(
      CycleWheel,
      {
        t,
        activeStage,
        onJump: jumpStage,
        journalStageNotes: journal.stageNotes || {},
        modelSnapshotCount: (journal.modelSnapshots || []).length
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: "200px" } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: "17px", fontWeight: 800, color: "#1e293b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, STAGE_BY_KEY[activeStage].icon + " "), STAGE_BY_KEY[activeStage].label), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 0", fontSize: "12px", color: "#64748b", lineHeight: 1.5 } }, t("scientific.stage_intro_" + activeStage) || ""))), /* @__PURE__ */ React.createElement(
      StageChipStrip,
      {
        activeStage,
        onJump: jumpStage,
        journalStageNotes: journal.stageNotes || {},
        modelSnapshotCount: (journal.modelSnapshots || []).length
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
    } }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u26A0\uFE0F "), t("scientific.superseded_banner") || "Your work here was written against earlier upstream content. The upstream changed; this is preserved as a record of your earlier thinking."), /* @__PURE__ */ React.createElement(
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
      t("scientific.acknowledge_superseded") || "I understand \u2014 keep as a record"
    )), journal.pendingLoopReturn && journal.pendingLoopReturn.fromStage !== activeStage && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: returnToOrigin,
        style: {
          alignSelf: "flex-start",
          padding: "8px 14px",
          borderRadius: "999px",
          background: "#7c3aed",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "12px",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(124,58,237,0.35)"
        }
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u21AA\uFE0F "),
      (t("scientific.return_to_where_i_was") || "Return to where I was: ") + (STAGE_BY_KEY[journal.pendingLoopReturn.fromStage] ? STAGE_BY_KEY[journal.pendingLoopReturn.fromStage].label : "")
    ), activeStage === "notice_wonder" && /* @__PURE__ */ React.createElement(NoticeWonderStage, { t, ctx: laneCtx }), activeStage === "model_it" && /* @__PURE__ */ React.createElement(ModelItStage, { t, ctx: laneCtx }), activeStage === "plan" && /* @__PURE__ */ React.createElement(PlanStage, { t, ctx: laneCtx }), activeStage === "gather" && /* @__PURE__ */ React.createElement(GatherStage, { t, ctx: laneCtx }), activeStage === "interpret_argue" && /* @__PURE__ */ React.createElement(InterpretArgueStage, { t, ctx: laneCtx }), activeStage === "revise_share" && /* @__PURE__ */ React.createElement(ReviseShareStage, { t, ctx: laneCtx }), /* @__PURE__ */ React.createElement("details", { style: {
      padding: "10px 14px",
      borderRadius: "12px",
      background: "#f5f3ff",
      border: "1px solid #c4b5fd"
    } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", fontSize: "11px", fontWeight: 800, color: "#5b21b6" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4DA} "), t("scientific.cross_cutting_exemplars_title") || "How is strong inquiry recognized? (cross-cutting examples)"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" } }, LOOP_REWARDING_EXEMPLARS.map(function(pair, i) {
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
        onCommit: commitLoopBack,
        onCancel: function() {
          setLoopback(null);
        }
      }
    ));
  }
  window.ResearchHub.registerLane("scientific", {
    label: "Scientific Inquiry",
    tagline: "Phenomenon Workbench",
    icon: "\u{1F52C}",
    blurb: "Notice a phenomenon, draft a model, pick from observational, experimental, modeling, or comparative methods, then loop back as evidence accumulates. AI here surfaces assumptions and asks questions \u2014 it never writes your model.",
    stages: STAGES,
    touchpoints: Object.keys(TOUCHPOINTS).map(function(k) {
      return TOUCHPOINTS[k];
    }),
    methodMenu: METHOD_MENU,
    exemplarPairs: EXEMPLAR_PAIRS,
    crossCuttingExemplars: LOOP_REWARDING_EXEMPLARS,
    render: function(ctx) {
      return /* @__PURE__ */ React.createElement(LaneRoot, { ctx });
    },
    __tier: 2
  });
  window.AlloModules.ResearchLaneScientific = { __tier: 2, lane: "scientific" };
  console.log("[CDN] ResearchLaneScientific registered (Tier 2)");
})();
