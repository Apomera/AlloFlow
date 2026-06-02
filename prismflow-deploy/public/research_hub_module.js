(function() {
  "use strict";
  if (window.AlloModules && window.AlloModules.ResearchHub && window.AlloModules.ResearchHub.__tier >= 2) {
    console.log("[CDN] ResearchHub already loaded, skipping");
    return;
  }
  var React = window.React;
  if (!React) {
    console.error("[ResearchHub] React not found on window");
    return;
  }
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;
  var useCallback = React.useCallback;
  var useMemo = React.useMemo;
  var STORAGE_KEY = "alloflow_research_hub_v1";
  var MAX_AI_CALLS_PER_SESSION = 8;
  var VOICE_NOTE_MAX_SECONDS = 60;
  var INPUT_HARD_CAP = 1500;
  var ANSWER_HARD_CAP = 800;
  var COOLDOWN_MS = 1500;
  var DEV_LEVELS = [
    { key: "k2", label: "K\u20132", long: "Early elementary (K\u20132)" },
    { key: "3_5", label: "3\u20135", long: "Upper elementary (3\u20135)" },
    { key: "6_8", label: "6\u20138", long: "Middle school (6\u20138)" },
    { key: "9_12", label: "9\u201312", long: "High school (9\u201312)" },
    { key: "ap", label: "AP / honors", long: "AP / honors / dual-enrollment" }
  ];
  function safeLocal(key, value) {
    try {
      if (value === void 0) return window.localStorage.getItem(key);
      if (value === null) {
        window.localStorage.removeItem(key);
        return;
      }
      window.localStorage.setItem(key, value);
    } catch (_) {
    }
  }
  function emptyJournal() {
    return {
      v: 2,
      // Tier 2 substrate revision; lanes migrate older shapes lazily
      createdAt: Date.now(),
      updatedAt: Date.now(),
      devLevel: "6_8",
      activeLane: null,
      // 'scientific' | 'engineering' | 'humanities' | null
      activeStage: null,
      // lane-specific stage key
      // Cross-lane substrate fields:
      questionTitle: "",
      // the inquiry framing in the student's words
      // Tier-2: dedicated wonderings substrate (Scientific lane Stage 1). Kept
      // separate from evidenceCards so the Wonder-sorter gate count is
      // structural, not parsed — per the gate-enforcement reviewer.
      wonderings: [],
      // [{ id, ts, text, durationS?, kindFromSorter? }]
      modelSnapshots: [],
      // [{ v, ts, text, confidence, knownUnknowns, loopBackOrigin?, deltaFromPrior? }]
      sources: [],
      // [{ id, ts, kind, citation, notes, sift }]
      evidenceCards: [],
      // [{ id, ts, kind: 'text'|'voice', text, audioBase64, durationS, tag, surprise? }]
      // Tier-2: first-class claims substrate (Scientific lane Stage 6) — the
      // export artifact's headline data lives at the top level, not nested.
      claims: [],
      // [{ id, ts, text, label, staleLabel?, aiLabelQuestion?, warrantText?, calibrationResponse? }]
      claimEvidenceLinks: [],
      // [{ id, claim, evidenceIds, warrant, qualifier, rebuttal }]
      positionality: { text: "", audioBase64: null, durationS: 0 },
      tradeOffLedger: [],
      // [{ v, ts, criterion, accepted, justification }]
      constraintMatrix: [],
      // [{ id, criterion, target, measured, weight, source, tier }]
      stageNotes: {},
      // { stageKey: { text, audioBase64, durationS, ts, exemplarViewed?, exemplarDismissed?, supersededBy?, acknowledgedSuperseded?, ...stageSpecific } }
      // Tier-2: loopBacks now carry a whyChipId (1-tap canned reason) so
      // the field is reliably populated — per the loop-back-architecture
      // reviewer who flagged the empty-why failure mode.
      loopBacks: [],
      // [{ ts, fromStage, toStage, whyChipId, why?, returnedToOrigin? }]
      // Tier-2: aiHistory records BOTH successful calls AND blocked/rejected
      // ones with bypass_signals + rejectReason for teacher dashboards.
      aiHistory: [],
      // [{ ts, touchpoint, in?, summary?, blocked, gate_reason?, bypass_signals?, rejectReason?, attemptedShapeKeys?, traceId? }]
      aiCallCount: 0,
      // resets on session reload only
      // Tier-2: pendingLoopReturn lets the lane offer "return to where I was"
      // after the student edits an upstream stage during a loop-back.
      pendingLoopReturn: null,
      // null | { fromStage, ts }
      sessionStartedAt: Date.now()
    };
  }
  function loadJournal() {
    var raw = safeLocal(STORAGE_KEY);
    if (!raw) return emptyJournal();
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || parsed.v !== 1) return emptyJournal();
      var fresh = emptyJournal();
      Object.keys(fresh).forEach(function(k) {
        if (parsed[k] === void 0) parsed[k] = fresh[k];
      });
      parsed.aiCallCount = 0;
      parsed.sessionStartedAt = Date.now();
      return parsed;
    } catch (_) {
      return emptyJournal();
    }
  }
  function saveJournal(journal) {
    if (!journal) return;
    try {
      var snapshot = Object.assign({}, journal);
      snapshot.updatedAt = Date.now();
      safeLocal(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (_) {
    }
  }
  var SHARED_STOP_WORDS = /* @__PURE__ */ new Set([
    "the",
    "a",
    "an",
    "is",
    "of",
    "to",
    "in",
    "it",
    "that",
    "this",
    "and",
    "or",
    "but",
    "i",
    "my",
    "we",
    "our",
    "because",
    "so",
    "for",
    "on",
    "with",
    "at",
    "as",
    "then",
    "than",
    "my",
    "your",
    "its"
  ]);
  var PLACEHOLDER_BLACKLIST = ["test", "asdf", "idk", "untitled", "lorem ipsum", "placeholder", "science thing", "dunno", "whatever", "idc"];
  var KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890"];
  function isPlausibleProse(text, minChars, opts) {
    opts = opts || {};
    var t = (text || "").trim();
    if (t.length < minChars) return { ok: false, reason: "too_short" };
    var distinctLetters = new Set(t.toLowerCase().match(/[a-z]/g) || []).size;
    if (distinctLetters < 4) return { ok: false, reason: "low_letter_diversity" };
    if (/(.)\1{5,}/.test(t)) return { ok: false, reason: "char_run_repeat" };
    var tokens = t.split(/\s+/).filter(function(w) {
      return /[a-z]/i.test(w);
    });
    if (tokens.length < (opts.minTokens || 2)) return { ok: false, reason: "too_few_words" };
    for (var r = 0; r < KEYBOARD_ROWS.length; r++) {
      var row = KEYBOARD_ROWS[r];
      for (var i = 0; i < row.length - 4; i++) {
        if (t.toLowerCase().indexOf(row.slice(i, i + 5)) !== -1) return { ok: false, reason: "keyboard_mash" };
      }
    }
    var lower = t.toLowerCase();
    for (var b = 0; b < PLACEHOLDER_BLACKLIST.length; b++) {
      var bl = PLACEHOLDER_BLACKLIST[b];
      if (lower === bl || lower.indexOf(bl + " ") === 0) return { ok: false, reason: "placeholder_phrase" };
    }
    return { ok: true };
  }
  function normalizeForCompare(s) {
    if (!s || typeof s !== "string") return "";
    var out = s;
    try {
      out = out.normalize("NFKC");
    } catch (_) {
    }
    out = out.toLowerCase();
    out = out.replace(/[‘’]/g, "'");
    out = out.replace(/[“”]/g, '"');
    out = out.replace(/[–—]/g, "-");
    out = out.replace(/\s+/g, " ");
    return out.trim();
  }
  function tokenJaccard(a, b) {
    function toks(s) {
      var set = /* @__PURE__ */ new Set();
      normalizeForCompare(s).split(/\W+/).forEach(function(w) {
        if (w.length > 2 && !SHARED_STOP_WORDS.has(w)) set.add(w);
      });
      return set;
    }
    var A = toks(a), B = toks(b);
    if (A.size === 0 || B.size === 0) return 0;
    var inter = 0;
    A.forEach(function(x) {
      if (B.has(x)) inter++;
    });
    return inter / (A.size + B.size - inter);
  }
  var MECHANISM_VERBS = [
    "cause",
    "causes",
    "make",
    "makes",
    "carry",
    "carries",
    "transfer",
    "transfers",
    "block",
    "blocks",
    "depend",
    "depends",
    "vary",
    "varies",
    "increase",
    "increases",
    "decrease",
    "decreases",
    "conduct",
    "conducts",
    "radiate",
    "radiates",
    "absorb",
    "absorbs",
    "reflect",
    "reflects",
    "affect",
    "affects",
    "influence",
    "influences",
    "trigger",
    "triggers",
    "prevent",
    "prevents",
    "enable",
    "enables",
    "flow",
    "flows",
    "move",
    "moves",
    "push",
    "pushes",
    "pull",
    "pulls",
    "heat",
    "heats",
    "cool",
    "cools",
    "grow",
    "grows",
    "shrink",
    "shrinks",
    "stop",
    "stops",
    "slow",
    "slows",
    "speed",
    "speeds"
  ];
  var PERSPECTIVE_MARKERS_RE = /\b(could|might|someone|alternatively|on the other hand|instead|rather|another way|disagree|opposing|critic|maybe|perhaps|some would say)\b/i;
  if (!window.ResearchHub) {
    window.ResearchHub = {
      _lanes: {},
      _order: [],
      registerLane: function(id, config) {
        if (!id || !config) return;
        config.id = id;
        if (!config.label) config.label = id;
        if (!config.stages) config.stages = [];
        if (!config.touchpoints) config.touchpoints = [];
        this._lanes[id] = config;
        if (this._order.indexOf(id) === -1) this._order.push(id);
        console.log("[ResearchHub] Registered lane: " + id);
      },
      getLane: function(id) {
        return this._lanes[id] || null;
      },
      getLanes: function() {
        var self = this;
        return this._order.map(function(id) {
          return self._lanes[id];
        }).filter(Boolean);
      },
      __tier: 1
    };
  }
  var PLACEHOLDER_LANES = [
    {
      id: "scientific",
      label: "Scientific Inquiry",
      tagline: "Phenomenon Workbench",
      icon: "\u{1F52C}",
      gradFrom: "from-cyan-50",
      gradTo: "to-blue-50",
      border: "border-cyan-600",
      titleColor: "text-cyan-800",
      descColor: "text-cyan-700",
      blurb: "Notice a phenomenon, draft a model, pick from observational, experimental, modeling, or comparative methods, then loop back as evidence accumulates.",
      stages: [],
      touchpoints: [],
      _placeholder: true
    },
    {
      id: "engineering",
      label: "Engineering Design",
      tagline: "Design Studio",
      icon: "\u{1F6E0}\uFE0F",
      gradFrom: "from-amber-50",
      gradTo: "to-orange-50",
      border: "border-amber-600",
      titleColor: "text-amber-800",
      descColor: "text-amber-700",
      blurb: "Define a problem with criteria and constraints, model and prototype, log trade-offs in a designer\u2019s notebook, and communicate to real stakeholders.",
      stages: [],
      touchpoints: [],
      _placeholder: true
    },
    {
      id: "humanities",
      label: "Humanities & Social Research",
      tagline: "Inquiry Studio",
      icon: "\u{1F4DA}",
      gradFrom: "from-rose-50",
      gradTo: "to-pink-50",
      border: "border-rose-600",
      titleColor: "text-rose-800",
      descColor: "text-rose-700",
      blurb: "Author a contestable question, name your standpoint, evaluate sources laterally (SIFT), and build a claim-evidence-warrant chain ending in a public argument or informed action.",
      stages: [],
      touchpoints: [],
      _placeholder: true
    }
  ];
  function resolveLanes() {
    var registered = window.ResearchHub && window.ResearchHub.getLanes ? window.ResearchHub.getLanes() : [];
    var byId = {};
    registered.forEach(function(L) {
      byId[L.id] = L;
    });
    return PLACEHOLDER_LANES.map(function(P) {
      return byId[P.id] || P;
    }).concat(registered.filter(function(L) {
      return PLACEHOLDER_LANES.every(function(P) {
        return P.id !== L.id;
      });
    }));
  }
  function safeJsonParse(s) {
    if (!s || typeof s !== "string") return null;
    var trimmed = s.trim();
    var fenced = /^```(?:json)?\s*([\s\S]*?)\s*```\s*$/.exec(trimmed);
    if (fenced) trimmed = fenced[1].trim();
    try {
      return JSON.parse(trimmed);
    } catch (_) {
    }
    var braceStart = trimmed.indexOf("{");
    var braceEnd = trimmed.lastIndexOf("}");
    if (braceStart >= 0 && braceEnd > braceStart) {
      try {
        return JSON.parse(trimmed.slice(braceStart, braceEnd + 1));
      } catch (_) {
      }
    }
    return null;
  }
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
    /^assumption$/i,
    // free-text completion smell — use *_questions
    /^warrant$/i,
    /^calibration$/i,
    /^observation$/i,
    /^rationale$/i,
    /^summary$/i,
    // completion-shaped (replaced by quoted_snippet + questions)
    /^interpretation$/i,
    /^reading$/i,
    /^why[_-]relevant$/i,
    /^what[_-]changed[_-]well$/i,
    /^confidence[_-]calibration[_-]note$/i,
    /^coverage[_-]note$/i,
    /^label[_-]question$/i
    // singular variant — must be plural questions[]
  ];
  function stripPedagogicalFootguns(obj, depth) {
    if (depth === void 0) depth = 0;
    if (depth > 6 || obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(function(x) {
      return stripPedagogicalFootguns(x, depth + 1);
    });
    var out = {};
    Object.keys(obj).forEach(function(k) {
      for (var i = 0; i < FOOTGUN_KEY_PATTERNS.length; i++) {
        if (FOOTGUN_KEY_PATTERNS[i].test(k)) return;
      }
      out[k] = stripPedagogicalFootguns(obj[k], depth + 1);
    });
    return out;
  }
  var CAUSAL_CONCLUSION_RE = /\b(because|therefore|since|thus|hence)\b/i;
  function wordCount(s) {
    if (!s || typeof s !== "string") return 0;
    return s.trim().split(/\s+/).filter(Boolean).length;
  }
  function enforceQuestionFormat(obj, depth, telemetry) {
    if (!telemetry) telemetry = { rejected: 0, fixedKeys: [] };
    if (depth === void 0) depth = 0;
    if (depth > 6 || obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) {
      return obj.map(function(x) {
        return enforceQuestionFormat(x, depth + 1, telemetry);
      });
    }
    var out = {};
    Object.keys(obj).forEach(function(k) {
      var v = obj[k];
      if (/question/i.test(k) && Array.isArray(v)) {
        var cleaned = v.filter(function(item) {
          if (typeof item !== "string") return true;
          var trimmed = item.trim();
          if (!trimmed.endsWith("?")) {
            telemetry.rejected += 1;
            telemetry.fixedKeys.push(k);
            return false;
          }
          if (wordCount(trimmed) > 25) {
            telemetry.rejected += 1;
            telemetry.fixedKeys.push(k);
            return false;
          }
          if (CAUSAL_CONCLUSION_RE.test(trimmed)) {
            telemetry.rejected += 1;
            telemetry.fixedKeys.push(k);
            return false;
          }
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
      if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    } catch (_) {
    }
    return "rh-" + Math.floor((window.performance && performance.now ? performance.now() : Date.now()) * 1e3).toString(36);
  }
  function SuggestionBadge(props) {
    var label = props.label || "AI suggestion \u2014 not a verdict";
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        role: "note",
        "aria-label": label,
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          borderRadius: "999px",
          fontSize: "10px",
          fontWeight: 800,
          background: "#fef3c7",
          color: "#92400e",
          border: "1px solid #fbbf24",
          textTransform: "uppercase",
          letterSpacing: "0.4px"
        }
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4A1}"),
      /* @__PURE__ */ React.createElement("span", null, label)
    );
  }
  function ExemplarPair(props) {
    var t = props.t || function(k) {
      return k;
    };
    var criterion = props.criterion || "";
    var strongExample = props.strongExample || "";
    var weakExample = props.weakExample || "";
    var onJudgment = props.onJudgment;
    var initialChoice = props.initialChoice || null;
    var initialReasoning = props.initialReasoning || "";
    var _c = useState(initialChoice);
    var choice = _c[0];
    var setChoice = _c[1];
    var _r = useState(initialReasoning);
    var reasoning = _r[0];
    var setReasoning = _r[1];
    var canSubmit = !!choice && reasoning.trim().length >= 8;
    var pickStyle = function(which) {
      var selected = choice === which;
      return {
        flex: 1,
        padding: "12px 14px",
        borderRadius: "12px",
        border: selected ? "2px solid #7c3aed" : "1px solid #e2e8f0",
        background: selected ? "#f5f3ff" : "#ffffff",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        fontSize: "12px",
        color: "#1e293b",
        lineHeight: 1.55
      };
    };
    return /* @__PURE__ */ React.createElement("div", { style: {
      padding: "14px",
      borderRadius: "14px",
      border: "1px solid #cbd5e1",
      background: "#f8fafc",
      display: "flex",
      flexDirection: "column",
      gap: "10px"
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2696\uFE0F "), t("research_hub.exemplar_pair_prompt") || "Which of these is stronger work, and why?"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: "#64748b", fontStyle: "italic" } }, criterion)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "10px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: function() {
      setChoice("A");
    }, "aria-pressed": choice === "A", style: pickStyle("A") }, /* @__PURE__ */ React.createElement("strong", { style: { display: "block", marginBottom: "4px", fontSize: "11px", color: "#7c3aed" } }, "Example A"), strongExample), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: function() {
      setChoice("B");
    }, "aria-pressed": choice === "B", style: pickStyle("B") }, /* @__PURE__ */ React.createElement("strong", { style: { display: "block", marginBottom: "4px", fontSize: "11px", color: "#7c3aed" } }, "Example B"), weakExample)), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: reasoning,
        onChange: function(e) {
          setReasoning(e.target.value);
        },
        rows: 2,
        maxLength: 400,
        placeholder: t("research_hub.exemplar_pair_reasoning_placeholder") || "In 1\u20132 sentences: which is stronger, and what makes it stronger?",
        style: {
          width: "100%",
          boxSizing: "border-box",
          padding: "8px 10px",
          borderRadius: "10px",
          border: "1px solid #cbd5e1",
          fontFamily: "inherit",
          fontSize: "12px",
          resize: "vertical",
          minHeight: "50px"
        }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: !canSubmit,
        onClick: function() {
          if (!canSubmit) return;
          if (typeof onJudgment === "function") {
            try {
              onJudgment({ choice, reasoning: reasoning.trim() });
            } catch (_) {
            }
          }
        },
        style: {
          padding: "8px 14px",
          borderRadius: "999px",
          background: canSubmit ? "#7c3aed" : "#cbd5e1",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "12px",
          cursor: canSubmit ? "pointer" : "not-allowed"
        }
      },
      t("research_hub.exemplar_pair_record") || "Record my judgment"
    )));
  }
  function VoiceNoteBlock(props) {
    var t = props.t || function(k) {
      return k;
    };
    var initialBase64 = props.initialBase64 || null;
    var initialDuration = props.initialDuration || 0;
    var onChange = props.onChange;
    var label = props.label || (t("research_hub.voice_note") || "Voice note");
    var _rec = useState(false);
    var isRecording = _rec[0];
    var setIsRecording = _rec[1];
    var _b64 = useState(initialBase64);
    var audioBase64 = _b64[0];
    var setAudioBase64 = _b64[1];
    var _dur = useState(initialDuration);
    var durationS = _dur[0];
    var setDurationS = _dur[1];
    var _elapsed = useState(0);
    var elapsed = _elapsed[0];
    var setElapsed = _elapsed[1];
    var _err = useState(null);
    var err = _err[0];
    var setErr = _err[1];
    var recorderRef = useRef(null);
    var chunksRef = useRef([]);
    var streamRef = useRef(null);
    var startRef = useRef(0);
    var tickRef = useRef(null);
    var stoppedRef = useRef(false);
    var hardStop = function() {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      if (recorderRef.current && recorderRef.current.state === "recording") {
        try {
          recorderRef.current.stop();
        } catch (_) {
        }
      }
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach(function(tr) {
            try {
              tr.stop();
            } catch (_) {
            }
          });
        } catch (_) {
        }
        streamRef.current = null;
      }
    };
    useEffect(function() {
      return function() {
        hardStop();
      };
    }, []);
    var startRec = async function() {
      setErr(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
          setErr(t("research_hub.voice_note_unsupported") || "Voice notes are not supported in this browser.");
          return;
        }
        var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        var mr = new MediaRecorder(stream);
        recorderRef.current = mr;
        chunksRef.current = [];
        stoppedRef.current = false;
        mr.ondataavailable = function(e) {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        mr.onstop = function() {
          if (stoppedRef.current) return;
          stoppedRef.current = true;
          try {
            var blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
            var reader = new FileReader();
            reader.onloadend = function() {
              var b64 = String(reader.result || "");
              setAudioBase64(b64);
              var finalDur = Math.min(VOICE_NOTE_MAX_SECONDS, Math.round((Date.now() - startRef.current) / 1e3));
              setDurationS(finalDur);
              if (typeof onChange === "function") {
                try {
                  onChange({ audioBase64: b64, durationS: finalDur });
                } catch (_) {
                }
              }
            };
            reader.readAsDataURL(blob);
          } catch (_) {
          }
          if (streamRef.current) {
            try {
              streamRef.current.getTracks().forEach(function(tr) {
                try {
                  tr.stop();
                } catch (_) {
                }
              });
            } catch (_) {
            }
            streamRef.current = null;
          }
          if (tickRef.current) {
            clearInterval(tickRef.current);
            tickRef.current = null;
          }
        };
        startRef.current = Date.now();
        setElapsed(0);
        mr.start();
        setIsRecording(true);
        tickRef.current = setInterval(function() {
          var sec = Math.round((Date.now() - startRef.current) / 1e3);
          setElapsed(sec);
          if (sec >= VOICE_NOTE_MAX_SECONDS) {
            if (mr.state === "recording") {
              try {
                mr.stop();
              } catch (_) {
              }
            }
            setIsRecording(false);
          }
        }, 250);
      } catch (e) {
        setErr(t("research_hub.voice_note_mic_denied") || "Microphone permission was denied.");
        setIsRecording(false);
      }
    };
    var stopRec = function() {
      setIsRecording(false);
      if (recorderRef.current && recorderRef.current.state === "recording") {
        try {
          recorderRef.current.stop();
        } catch (_) {
        }
      }
    };
    var clearRec = function() {
      setAudioBase64(null);
      setDurationS(0);
      setElapsed(0);
      if (typeof onChange === "function") {
        try {
          onChange({ audioBase64: null, durationS: 0 });
        } catch (_) {
        }
      }
    };
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        role: "group",
        "aria-label": label,
        style: {
          padding: "10px 12px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          background: "#fafafa",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "12px", fontWeight: 700, color: "#1e293b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F3A4} "), label), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#64748b" } }, isRecording ? (t("research_hub.voice_note_recording") || "Recording") + " " + elapsed + "s / " + VOICE_NOTE_MAX_SECONDS + "s" : durationS > 0 ? durationS + "s saved" : t("research_hub.voice_note_idle") || "Up to 60s \u2014 local only")),
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } }, !isRecording && /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: startRec,
          "aria-label": t("research_hub.voice_note_start_aria") || "Start recording a voice note",
          style: {
            padding: "6px 12px",
            borderRadius: "999px",
            background: "#dc2626",
            color: "#fff",
            border: "none",
            fontWeight: 800,
            fontSize: "11px",
            cursor: "pointer"
          }
        },
        audioBase64 ? t("research_hub.voice_note_rerecord") || "Re-record" : t("research_hub.voice_note_start") || "Record"
      ), isRecording && /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: stopRec,
          "aria-label": t("research_hub.voice_note_stop_aria") || "Stop recording",
          style: {
            padding: "6px 12px",
            borderRadius: "999px",
            background: "#1f2937",
            color: "#fff",
            border: "none",
            fontWeight: 800,
            fontSize: "11px",
            cursor: "pointer"
          }
        },
        t("research_hub.voice_note_stop") || "Stop"
      ), audioBase64 && !isRecording && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("audio", { controls: true, src: audioBase64, style: { height: "32px" } }), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: clearRec,
          style: {
            padding: "6px 12px",
            borderRadius: "999px",
            background: "#fff",
            color: "#64748b",
            border: "1px solid #cbd5e1",
            fontWeight: 700,
            fontSize: "11px",
            cursor: "pointer"
          }
        },
        t("research_hub.voice_note_clear") || "Clear"
      ))),
      err && /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "11px", color: "#b91c1c" } }, err)
    );
  }
  function CostMeter(props) {
    var t = props.t || function(k) {
      return k;
    };
    var used = props.used || 0;
    var cap = props.cap || MAX_AI_CALLS_PER_SESSION;
    if (used === 0) return null;
    var remaining = Math.max(0, cap - used);
    var color = remaining === 0 ? "#b91c1c" : remaining <= 2 ? "#d97706" : "#475569";
    return /* @__PURE__ */ React.createElement(
      "span",
      {
        role: "status",
        "aria-live": "polite",
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          borderRadius: "999px",
          fontSize: "11px",
          fontWeight: 700,
          background: "#f8fafc",
          color,
          border: "1px solid #e2e8f0"
        }
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4DD}"),
      remaining > 0 ? (t("research_hub.ai_calls_remaining_prefix") || "") + remaining + " / " + cap + " " + (t("research_hub.ai_calls_remaining_suffix") || "AI questions left this session") : t("research_hub.ai_calls_exhausted") || "AI question quota used. Static help still available."
    );
  }
  function DevLevelSelector(props) {
    var t = props.t || function(k) {
      return k;
    };
    var value = props.value || "6_8";
    var onChange = props.onChange;
    return /* @__PURE__ */ React.createElement(
      "label",
      {
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          borderRadius: "999px",
          background: "#f8fafc",
          border: "1px solid #cbd5e1",
          fontSize: "11px",
          fontWeight: 700,
          color: "#1e293b",
          cursor: "pointer"
        }
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F393}"),
      /* @__PURE__ */ React.createElement("span", null, t("research_hub.dev_level_label") || "Reading level"),
      /* @__PURE__ */ React.createElement(
        "select",
        {
          value,
          onChange: function(e) {
            if (typeof onChange === "function") onChange(e.target.value);
          },
          "aria-label": t("research_hub.dev_level_aria") || "Select developmental level for prompts and rubrics",
          style: {
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            padding: "3px 6px",
            fontSize: "11px",
            fontFamily: "inherit",
            color: "#1e293b",
            cursor: "pointer"
          }
        },
        DEV_LEVELS.map(function(lvl) {
          return /* @__PURE__ */ React.createElement("option", { key: lvl.key, value: lvl.key }, lvl.label);
        })
      )
    );
  }
  function makeAskResearchCoach(deps, journal, setJournal) {
    var ai = deps.ai;
    var onCallGemini = deps.onCallGemini;
    var addToast = deps.addToast;
    var nowMs = function() {
      return Date.now();
    };
    var PER_TOUCHPOINT_CAP = {
      wonder_sorter: 2,
      model_surfacer: 3,
      steelman_second_pass: 2,
      honest_uncertainty: 2
    };
    var BURST_WINDOW_MS = 5 * 60 * 1e3;
    var BURST_THRESHOLD = 6;
    var BURST_LOCKOUT_MS = 2 * 60 * 1e3;
    function appendAiHistory(prevJournal, entry) {
      var capped = (prevJournal.aiHistory || []).concat([entry]);
      if (capped.length > 60) capped = capped.slice(-60);
      return capped;
    }
    return async function askResearchCoach(touchpoint, ctx, signal) {
      var traceId = newTraceId();
      var t0 = nowMs();
      var aiText = ai && typeof ai.generateText === "function" ? ai.generateText.bind(ai) : null;
      if (!aiText && typeof onCallGemini !== "function") {
        return { ok: false, blocked: true, blockedReason: "no_compatible_backend", traceId, latencyMs: 0 };
      }
      if ((journal.aiCallCount || 0) >= MAX_AI_CALLS_PER_SESSION) {
        return { ok: false, blocked: true, blockedReason: "rate_limit_session", detail: "You've used all your AI questions for this session. Reload to reset, or keep working on your own.", traceId, latencyMs: 0 };
      }
      var tpId = touchpoint && touchpoint.id;
      if (tpId && PER_TOUCHPOINT_CAP[tpId]) {
        var usedForTp = (journal.aiHistory || []).filter(function(h) {
          return h.touchpoint === tpId && !h.blocked;
        }).length;
        if (usedForTp >= PER_TOUCHPOINT_CAP[tpId]) {
          return {
            ok: false,
            blocked: true,
            blockedReason: "rate_limit_touchpoint",
            detail: "You've used your AI helps for this step. Loop back to gather more, or move forward on your own.",
            traceId,
            latencyMs: 0
          };
        }
      }
      var recentBlocks = (journal.aiHistory || []).filter(function(h) {
        return h.blocked && nowMs() - (h.ts || 0) < BURST_WINDOW_MS;
      });
      if (recentBlocks.length >= BURST_THRESHOLD) {
        var newestBlockTs = recentBlocks[recentBlocks.length - 1].ts || 0;
        if (nowMs() - newestBlockTs < BURST_LOCKOUT_MS) {
          return {
            ok: false,
            blocked: true,
            blockedReason: "rate_limit_burst",
            detail: "Take a breath. The AI isn't going anywhere. Try looping back to an earlier stage.",
            traceId,
            latencyMs: 0
          };
        }
      }
      if (touchpoint && typeof touchpoint.gateCheck === "function") {
        var gate = { ok: true };
        try {
          gate = touchpoint.gateCheck(journal, ctx) || { ok: true };
        } catch (_) {
          gate = { ok: true };
        }
        if (gate && gate.ok === false) {
          setJournal(function(prev) {
            return Object.assign({}, prev, {
              aiHistory: appendAiHistory(prev, {
                ts: Date.now(),
                touchpoint: tpId,
                blocked: true,
                gate_reason: gate.reason || "student_authored_required",
                bypass_signals: gate.bypass_signals || [],
                traceId
              })
            });
          });
          return {
            ok: false,
            blocked: true,
            blockedReason: "student_authored_required",
            detail: gate.reason || "Write your own attempt first before asking AI.",
            bypass_signals: gate.bypass_signals || [],
            retryAfterMs: gate.retryAfterMs || 0,
            traceId,
            latencyMs: 0
          };
        }
      }
      var prompt = null;
      try {
        prompt = touchpoint && typeof touchpoint.buildPrompt === "function" ? touchpoint.buildPrompt(journal, ctx) : null;
      } catch (_) {
      }
      if (!prompt || typeof prompt !== "string") {
        return { ok: false, blocked: true, blockedReason: "no_prompt", traceId, latencyMs: 0 };
      }
      if (prompt.length > INPUT_HARD_CAP * 6) prompt = prompt.slice(0, INPUT_HARD_CAP * 6);
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return { ok: false, blocked: true, blockedReason: "network", traceId, latencyMs: 0 };
      }
      var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timeoutId = controller ? setTimeout(function() {
        try {
          controller.abort();
        } catch (_) {
        }
      }, 12e3) : null;
      var combined = controller ? controller.signal : signal;
      if (signal && controller && typeof signal.addEventListener === "function") {
        try {
          signal.addEventListener("abort", function() {
            try {
              controller.abort();
            } catch (_) {
            }
          });
        } catch (_) {
        }
      }
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.aiCallCount = (prev.aiCallCount || 0) + 1;
        return next;
      });
      var rawText = "";
      var errorKind = null;
      try {
        if (aiText) {
          var res = await aiText(prompt, { json: true, temperature: 0.7, signal: combined });
          rawText = typeof res === "string" ? res : res && (res.text || res.output_text) || "";
        } else {
          var legacy = await onCallGemini(prompt, true, false, null, null, combined, false);
          rawText = typeof legacy === "string" ? legacy : legacy && legacy.text || "";
        }
      } catch (err) {
        var msg = err && err.message || String(err || "");
        if (/abort/i.test(msg) || signal && signal.aborted) errorKind = "aborted";
        else if (/quota|RESOURCE_EXHAUSTED|429/i.test(msg)) errorKind = "rate_limit_upstream";
        else if (/safety|SAFETY|blockReason/i.test(msg)) errorKind = "safety_blocked";
        else if (/Failed to fetch|NetworkError|ECONN/i.test(msg)) errorKind = "network";
        else errorKind = "network";
        if (errorKind === "network" || errorKind === "aborted" || errorKind === "rate_limit_upstream") {
          setJournal(function(prev) {
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
        var copy = errorKind === "aborted" ? "" : errorKind === "rate_limit_upstream" ? "AlloBot is taking a quick breather. Try again in a minute." : errorKind === "safety_blocked" ? "I can't respond to that. Want to try rephrasing?" : "Couldn't reach the AI service. Check your connection and try again.";
        return { ok: false, blocked: true, blockedReason: errorKind, detail: copy, traceId, latencyMs };
      }
      var parsed = safeJsonParse(rawText);
      if (!parsed) {
        return {
          ok: true,
          blocked: false,
          data: { __aiSuggestion: true, traceId, parseFailed: true, answer: String(rawText || "").slice(0, ANSWER_HARD_CAP) },
          raw: rawText,
          latencyMs,
          traceId
        };
      }
      var stripped = stripPedagogicalFootguns(parsed);
      var qTelemetry = { rejected: 0, fixedKeys: [] };
      stripped = enforceQuestionFormat(stripped, 0, qTelemetry);
      function truncStrings(o, depth) {
        if (o === null || typeof o !== "object" || depth > 6) return o;
        if (Array.isArray(o)) return o.map(function(x) {
          return truncStrings(x, depth + 1);
        });
        var out = {};
        Object.keys(o).forEach(function(k) {
          var v = o[k];
          if (typeof v === "string" && v.length > ANSWER_HARD_CAP) v = v.slice(0, ANSWER_HARD_CAP) + "\u2026";
          else if (typeof v === "object") v = truncStrings(v, depth + 1);
          out[k] = v;
        });
        return out;
      }
      stripped = truncStrings(stripped, 0);
      var validatorReject = null;
      if (touchpoint && typeof touchpoint.validate === "function") {
        try {
          var validated = touchpoint.validate(stripped, journal, ctx);
          if (validated && validated.__rejected) {
            validatorReject = validated;
          } else if (validated) {
            stripped = validated;
          }
        } catch (_) {
        }
      }
      if (validatorReject) {
        setJournal(function(prev) {
          var next = Object.assign({}, prev);
          next.aiCallCount = Math.max(0, (prev.aiCallCount || 1) - 1);
          next.aiHistory = appendAiHistory(prev, {
            ts: Date.now(),
            touchpoint: tpId,
            blocked: true,
            rejectReason: validatorReject.rejectReason || "validator_rejected",
            attemptedShapeKeys: validatorReject.attemptedShapeKeys || [],
            traceId
          });
          return next;
        });
        return {
          ok: false,
          blocked: true,
          blockedReason: "validator_rejected",
          detail: validatorReject.rejectReason || "AI response did not meet the lane rules. Try again.",
          traceId,
          latencyMs
        };
      }
      stripped.__aiSuggestion = true;
      stripped.__traceId = traceId;
      setJournal(function(prev) {
        return Object.assign({}, prev, {
          aiHistory: appendAiHistory(prev, {
            ts: Date.now(),
            touchpoint: tpId,
            in: prompt.slice(0, 400),
            summary: typeof stripped.answer === "string" ? stripped.answer.slice(0, 200) : "",
            qFormatRejected: qTelemetry.rejected,
            blocked: false,
            traceId
          })
        });
      });
      return { ok: true, blocked: false, data: stripped, raw: rawText, latencyMs, traceId, qFormatRejected: qTelemetry.rejected };
    };
  }
  function PlaceholderLaneView(props) {
    var t = props.t || function(k) {
      return k;
    };
    var lane = props.lane;
    var onBack = props.onBack;
    return /* @__PURE__ */ React.createElement("div", { style: {
      padding: "20px",
      borderRadius: "16px",
      background: "#ffffff",
      border: "1px dashed #cbd5e1",
      display: "flex",
      flexDirection: "column",
      gap: "14px"
    } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: onBack,
        style: {
          alignSelf: "flex-start",
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
      "\u2190 ",
      t("research_hub.back_to_lanes") || "Choose a different lane"
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "12px" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { fontSize: "40px" } }, lane.icon), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: "17px", fontWeight: 800, color: "#1e293b" } }, lane.label), /* @__PURE__ */ React.createElement("p", { style: { margin: "2px 0 0", fontSize: "12px", color: "#64748b" } }, lane.tagline))), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "13px", color: "#334155", lineHeight: 1.55 } }, lane.blurb), /* @__PURE__ */ React.createElement("div", { style: {
      padding: "12px 14px",
      borderRadius: "12px",
      background: "#fef3c7",
      border: "1px solid #fbbf24",
      fontSize: "12px",
      color: "#92400e",
      lineHeight: 1.5
    } }, /* @__PURE__ */ React.createElement("strong", null, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F527} "), t("research_hub.lane_under_construction_title") || "This lane is shipping next."), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 0" } }, t("research_hub.lane_under_construction_body") || "The Hub shell, AI guardrails, voice notes, and inquiry journal are live now. The lane workspace lands in the next update.")), /* @__PURE__ */ React.createElement("details", { style: { fontSize: "11px", color: "#475569" } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", fontWeight: 700 } }, t("research_hub.lane_preview_summary") || "Preview the loop"), /* @__PURE__ */ React.createElement("p", { style: { marginTop: "6px", lineHeight: 1.55 } }, t("research_hub.lane_preview_body_" + lane.id) || 'When this lane lands you will move through its stages in any order, with explicit "loop back" affordances so revising is the point \u2014 not a setback.')));
  }
  function ResearchHub(props) {
    var t = typeof props.t === "function" ? props.t : function(k) {
      return k;
    };
    var isOpen = props.isOpen !== false;
    var onClose = props.onClose;
    var studentCodename = props.studentCodename || "";
    var addToast = props.addToast || function() {
    };
    var _journal = useState(loadJournal);
    var journal = _journal[0];
    var setJournal = _journal[1];
    var saveScheduledRef = useRef(false);
    useEffect(function() {
      if (saveScheduledRef.current) return;
      saveScheduledRef.current = true;
      var id = setTimeout(function() {
        saveScheduledRef.current = false;
        saveJournal(journal);
      }, 60);
      return function() {
        clearTimeout(id);
      };
    }, [journal]);
    var ask = useMemo(function() {
      return makeAskResearchCoach({
        ai: props.ai,
        onCallGemini: props.onCallGemini,
        addToast
      }, journal, setJournal);
    }, [journal, props.ai, props.onCallGemini]);
    var lanes = resolveLanes();
    var activeLane = journal.activeLane ? lanes.filter(function(L) {
      return L.id === journal.activeLane;
    })[0] : null;
    var setActiveLane = useCallback(function(laneId) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.activeLane = laneId;
        next.activeStage = null;
        return next;
      });
    }, []);
    var setDevLevel = useCallback(function(lvl) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.devLevel = lvl;
        return next;
      });
    }, []);
    var setQuestionTitle = useCallback(function(txt) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.questionTitle = String(txt || "").slice(0, 240);
        return next;
      });
    }, []);
    var clearJournal = useCallback(function() {
      var ok = window.confirm(t("research_hub.confirm_reset") || "Reset this inquiry? Voice notes, model snapshots, and AI history will be cleared. This cannot be undone.");
      if (!ok) return;
      var fresh = emptyJournal();
      fresh.devLevel = journal.devLevel;
      setJournal(fresh);
    }, [journal]);
    if (!isOpen) return null;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": t("research_hub.modal_aria") || "Investigation and Research Hub",
        "data-help-key": "research_hub",
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 60,
          background: "rgba(15,23,42,0.55)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "stretch",
          justifyContent: "center",
          padding: "4vh 16px",
          overflowY: "auto"
        },
        onClick: function(e) {
          if (e.target === e.currentTarget && typeof onClose === "function") onClose();
        }
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          onClick: function(e) {
            e.stopPropagation();
          },
          style: {
            background: "#ffffff",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "900px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
            maxHeight: "92vh"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: {
          padding: "16px 22px",
          background: "linear-gradient(135deg, #4338ca 0%, #7c3aed 100%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          borderRadius: "20px 20px 0 0"
        } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "12px" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { fontSize: "28px" } }, "\u{1F50D}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { style: { margin: 0, fontSize: "18px", fontWeight: 800 } }, t("research_hub.modal_title") || "Investigation & Research Hub"), /* @__PURE__ */ React.createElement("p", { style: { margin: "2px 0 0", fontSize: "11px", opacity: 0.85 } }, studentCodename ? (t("research_hub.modal_subtitle_with_codename") || "Inquiry journal for ") + studentCodename : t("research_hub.modal_subtitle") || "Loop, model, source, and argue your way through a question worth asking."))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(CostMeter, { t, used: journal.aiCallCount || 0, cap: MAX_AI_CALLS_PER_SESSION }), /* @__PURE__ */ React.createElement(DevLevelSelector, { t, value: journal.devLevel, onChange: setDevLevel }), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: function() {
              if (typeof onClose === "function") onClose();
            },
            "aria-label": t("common.close") || "Close",
            style: {
              background: "rgba(255,255,255,0.18)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "8px",
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700
            }
          },
          "\u2715"
        ))),
        /* @__PURE__ */ React.createElement("div", { style: {
          padding: "20px 22px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          overflowY: "auto",
          flex: 1
        } }, /* @__PURE__ */ React.createElement("div", { style: {
          padding: "12px 14px",
          borderRadius: "12px",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        } }, /* @__PURE__ */ React.createElement(
          "label",
          {
            htmlFor: "research-hub-question-title",
            style: { fontSize: "12px", fontWeight: 800, color: "#1e293b" }
          },
          /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2728 "),
          t("research_hub.question_label") || "What are you investigating?"
        ), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, t("research_hub.question_help") || "A few words in your own voice. You can change this any time as your question evolves \u2014 loops are first-class here."), /* @__PURE__ */ React.createElement(
          "textarea",
          {
            id: "research-hub-question-title",
            "data-help-key": "research_hub_question",
            value: journal.questionTitle,
            onChange: function(e) {
              setQuestionTitle(e.target.value);
            },
            placeholder: t("research_hub.question_placeholder") || 'e.g., "Why do the fish in fisherlab cluster at dawn?" or "How should our town respond to noise complaints?"',
            rows: 2,
            maxLength: 240,
            style: {
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 10px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              fontFamily: "inherit",
              fontSize: "13px",
              resize: "vertical",
              minHeight: "50px"
            }
          }
        )), /* @__PURE__ */ React.createElement("div", { style: {
          padding: "10px 12px",
          borderRadius: "12px",
          background: "#fffbeb",
          border: "1px solid #fcd34d",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap"
        } }, /* @__PURE__ */ React.createElement(SuggestionBadge, { t }), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "11px", color: "#78350f", lineHeight: 1.5, flex: 1, minWidth: "200px" } }, t("research_hub.ai_convention_banner") || "AlloBot helps by asking questions and surfacing alternatives. It will not write your model, your hypothesis, your argument, or your trade-off decisions for you. You author your work; AlloBot critiques.")), !activeLane ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h3", { style: { margin: "4px 0 0", fontSize: "14px", fontWeight: 800, color: "#1e293b" } }, t("research_hub.lane_selector_title") || "Pick a lane to start (or switch any time)"), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "12px", color: "#475569", lineHeight: 1.55 } }, t("research_hub.lane_selector_help") || "These three lanes share one inquiry journal. Evidence cards, voice notes, and your model history carry across \u2014 so a question that starts as scientific inquiry can finish as a humanities op-ed without losing the work."), /* @__PURE__ */ React.createElement("div", { style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "12px"
        } }, lanes.map(function(L) {
          return /* @__PURE__ */ React.createElement(
            "button",
            {
              key: L.id,
              type: "button",
              "data-help-key": "research_hub_lane_" + L.id,
              onClick: function() {
                setActiveLane(L.id);
              },
              style: {
                padding: "16px",
                borderRadius: "14px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                transition: "transform 0.15s, box-shadow 0.15s"
              },
              onMouseEnter: function(e) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
              },
              onMouseLeave: function(e) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }
            },
            /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { fontSize: "32px" } }, L.icon), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { style: { margin: 0, fontSize: "14px", fontWeight: 800, color: "#1e293b" } }, L.label), /* @__PURE__ */ React.createElement("p", { style: { margin: "2px 0 0", fontSize: "11px", color: "#64748b" } }, L.tagline))),
            /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "12px", color: "#475569", lineHeight: 1.5 } }, L.blurb),
            L._placeholder && /* @__PURE__ */ React.createElement("span", { style: {
              alignSelf: "flex-start",
              padding: "3px 8px",
              borderRadius: "999px",
              fontSize: "10px",
              fontWeight: 800,
              background: "#fef3c7",
              color: "#92400e",
              border: "1px solid #fbbf24",
              textTransform: "uppercase",
              letterSpacing: "0.4px"
            } }, t("research_hub.lane_coming_soon") || "Lane shipping soon")
          );
        }))) : activeLane._placeholder ? /* @__PURE__ */ React.createElement(PlaceholderLaneView, { t, lane: activeLane, onBack: function() {
          setActiveLane(null);
        } }) : /* @__PURE__ */ React.createElement(
          ActiveLaneView,
          {
            t,
            lane: activeLane,
            journal,
            setJournal,
            ask,
            onBack: function() {
              setActiveLane(null);
            },
            deps: props
          }
        ), /* @__PURE__ */ React.createElement("details", { style: {
          padding: "12px 14px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          background: "#f8fafc"
        } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", fontSize: "12px", fontWeight: 800, color: "#1e293b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F3A4} "), t("research_hub.scratch_voice_summary") || "Open a voice scratchpad"), /* @__PURE__ */ React.createElement("p", { style: { margin: "8px 0", fontSize: "11px", color: "#64748b", lineHeight: 1.55 } }, t("research_hub.scratch_voice_help") || "Talk through your thinking. Voice notes live in your inquiry journal and survive across stages and lanes."), /* @__PURE__ */ React.createElement(
          VoiceNoteBlock,
          {
            t,
            initialBase64: journal.stageNotes && journal.stageNotes.scratch && journal.stageNotes.scratch.audioBase64,
            initialDuration: journal.stageNotes && journal.stageNotes.scratch && journal.stageNotes.scratch.durationS || 0,
            onChange: function(v) {
              setJournal(function(prev) {
                var next = Object.assign({}, prev);
                next.stageNotes = Object.assign({}, prev.stageNotes || {});
                next.stageNotes.scratch = { text: "", audioBase64: v.audioBase64, durationS: v.durationS, ts: Date.now() };
                return next;
              });
            },
            label: t("research_hub.scratch_voice_label") || "Scratchpad voice note"
          }
        )), /* @__PURE__ */ React.createElement("details", { style: {
          padding: "12px 14px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          background: "#f8fafc"
        } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", fontSize: "12px", fontWeight: 800, color: "#1e293b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4D3} "), t("research_hub.journal_state_summary") || "Inquiry journal state"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "8px 0 0", paddingLeft: "20px", fontSize: "11px", color: "#475569", lineHeight: 1.7 } }, /* @__PURE__ */ React.createElement("li", null, (t("research_hub.journal_dev_level") || "Reading level") + ": " + (DEV_LEVELS.filter(function(l) {
          return l.key === journal.devLevel;
        })[0] || { long: journal.devLevel }).long), /* @__PURE__ */ React.createElement("li", null, (t("research_hub.journal_active_lane") || "Active lane") + ": " + (activeLane ? activeLane.label : t("research_hub.journal_no_lane") || "none yet")), /* @__PURE__ */ React.createElement("li", null, (t("research_hub.journal_evidence_count") || "Evidence cards") + ": " + (journal.evidenceCards || []).length), /* @__PURE__ */ React.createElement("li", null, (t("research_hub.journal_model_versions") || "Model snapshots") + ": " + (journal.modelSnapshots || []).length), /* @__PURE__ */ React.createElement("li", null, (t("research_hub.journal_sources") || "Sources logged") + ": " + (journal.sources || []).length), /* @__PURE__ */ React.createElement("li", null, (t("research_hub.journal_ai_calls") || "AI questions this session") + ": " + (journal.aiCallCount || 0) + " / " + MAX_AI_CALLS_PER_SESSION)), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: clearJournal,
            style: {
              marginTop: "10px",
              padding: "4px 10px",
              borderRadius: "999px",
              background: "#fff",
              border: "1px solid #fca5a5",
              color: "#b91c1c",
              fontWeight: 700,
              fontSize: "11px",
              cursor: "pointer"
            }
          },
          t("research_hub.journal_reset") || "Reset this inquiry"
        ))),
        /* @__PURE__ */ React.createElement("div", { style: {
          padding: "12px 22px",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          flexWrap: "wrap",
          fontSize: "11px",
          color: "#64748b"
        } }, /* @__PURE__ */ React.createElement("span", null, t("research_hub.footer_persistence_note") || "Your inquiry journal is saved on this device. Switching codenames mid-investigation will show prior work \u2014 clear the inquiry above to start fresh."), /* @__PURE__ */ React.createElement("span", { style: { fontStyle: "italic" } }, t("research_hub.footer_tier_note") || "Hub shell v1 \u2014 lane workspaces shipping next."))
      )
    );
  }
  function ActiveLaneView(props) {
    var t = props.t;
    var lane = props.lane;
    var journal = props.journal;
    var setJournal = props.setJournal;
    var ask = props.ask;
    var onBack = props.onBack;
    var deps = props.deps || {};
    var ctx = {
      t,
      lane,
      journal,
      setJournal,
      ask,
      addToast: deps.addToast,
      primitives: {
        SuggestionBadge,
        ExemplarPair,
        VoiceNoteBlock,
        CostMeter
      },
      constants: {
        MAX_AI_CALLS_PER_SESSION,
        ANSWER_HARD_CAP,
        VOICE_NOTE_MAX_SECONDS
      },
      onExitLane: onBack
    };
    if (lane && typeof lane.render === "function") {
      try {
        return lane.render(ctx);
      } catch (e) {
        console.error("[ResearchHub] Lane render error in", lane.id, e);
        return /* @__PURE__ */ React.createElement("div", { style: {
          padding: "14px",
          borderRadius: "12px",
          background: "#fef2f2",
          border: "1px solid #fca5a5",
          color: "#7f1d1d",
          fontSize: "12px"
        } }, t("research_hub.lane_render_error") || "The selected lane failed to render. Going back to the lane selector.", /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onBack, style: { marginLeft: "8px", textDecoration: "underline", background: "transparent", border: "none", color: "#7f1d1d", cursor: "pointer" } }, t("research_hub.back_to_lanes") || "Choose a different lane"));
      }
    }
    return /* @__PURE__ */ React.createElement(PlaceholderLaneView, { t, lane, onBack });
  }
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ResearchHub = ResearchHub;
  window.AlloModules.ResearchHub.__tier = 2;
  if (window.ResearchHub) {
    window.ResearchHub.primitives = {
      SuggestionBadge,
      ExemplarPair,
      VoiceNoteBlock,
      CostMeter,
      DevLevelSelector
    };
    window.ResearchHub.constants = {
      STORAGE_KEY,
      MAX_AI_CALLS_PER_SESSION,
      VOICE_NOTE_MAX_SECONDS,
      DEV_LEVELS
    };
    window.ResearchHub.helpers = {
      isPlausibleProse,
      normalizeForCompare,
      tokenJaccard,
      MECHANISM_VERBS,
      PERSPECTIVE_MARKERS_RE,
      SHARED_STOP_WORDS
    };
  }
  console.log("[CDN] ResearchHub loaded (Tier 2)");
})();
