(function() {
'use strict';
  if (!document.getElementById("misc-components-module-a11y")) { var _s = document.createElement("style"); _s.id = "misc-components-module-a11y"; _s.textContent = "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } } .text-slate-600 { color: #64748b !important; }"; document.head.appendChild(_s); }
if (window.AlloModules && window.AlloModules.MiscComponentsModule) { console.log('[CDN] MiscComponentsModule already loaded, skipping'); return; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
var React = window.React || React;
var LanguageContext = window.AlloLanguageContext;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useContext = React.useContext;
var debugLog = (typeof window !== 'undefined' && (window.__alloDebugLog || window.debugLog)) || function(){};
var warnLog = (typeof window !== 'undefined' && window.warnLog) || console.warn.bind(console);
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
// Icons used by WordSoundsReviewPanel:
var Ban = _lazyIcon('Ban');
var ChevronDown = _lazyIcon('ChevronDown');
var ChevronLeft = _lazyIcon('ChevronLeft');
var ImageIcon = _lazyIcon('ImageIcon');
var Play = _lazyIcon('Play');
var RefreshCw = _lazyIcon('RefreshCw');
var Sparkles = _lazyIcon('Sparkles');
const AnimatedNumber = ({ value, duration = 1e3, disableAnimations = false }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const startTimeRef = useRef(null);
  const startValueRef = useRef(value);
  const animationFrameRef = useRef(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return void 0;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(media.matches);
    updatePreference();
    if (media.addEventListener) media.addEventListener("change", updatePreference);
    else if (media.addListener) media.addListener(updatePreference);
    return () => {
      if (media.removeEventListener) media.removeEventListener("change", updatePreference);
      else if (media.removeListener) media.removeListener(updatePreference);
    };
  }, []);
  useEffect(() => {
    if (disableAnimations || prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }
    if (value === displayValue) return;
    startValueRef.current = displayValue;
    startTimeRef.current = null;
    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = timestamp - startTimeRef.current;
      const percentage = Math.min(progress / duration, 1);
      const ease = (x) => x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
      const current = Math.round(startValueRef.current + (value - startValueRef.current) * ease(percentage));
      setDisplayValue(current);
      if (progress < duration) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration, disableAnimations, prefersReducedMotion]);
  return /* @__PURE__ */ React.createElement(React.Fragment, null, displayValue);
};
const wsHighlightTarget = (text, target) => {
  const tw = String(target || "").trim();
  const s = String(text || "");
  if (!tw) return s;
  const esc = tw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return s.split(new RegExp(`\\b(${esc})\\b`, "gi")).map(
    (p, i) => p.toLowerCase() === tw.toLowerCase() ? /* @__PURE__ */ React.createElement("strong", { key: i, className: "text-sky-800 font-black" }, p) : p
  );
};
const ClozeInput = React.memo(({ targetWord, onCorrect, isSolved, acceptedAnswers, displayWord, passageWord }) => {
  const { t } = useContext(LanguageContext);
  const _passage = passageWord || displayWord || targetWord;
  const [entered, setEntered] = useState("");
  const [val, setVal] = useState(isSolved ? _passage : "");
  const [status, setStatus] = useState(isSolved ? "success" : "neutral");
  useEffect(() => {
    if (isSolved) {
      setVal(entered || _passage);
      setStatus("success");
    } else {
      setVal("");
      setEntered("");
      setStatus("neutral");
    }
  }, [isSolved, _passage, entered]);
  const normalize = (str) => {
    if (!str) return "";
    let s = String(str).toLowerCase().trim();
    try {
      s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    } catch (_) {
    }
    try {
      s = s.replace(/[^\p{L}\p{N}]/gu, "");
    } catch (_) {
      s = s.replace(/[^a-z0-9]/g, "");
    }
    return s;
  };
  const answerMatches = (input, target) => {
    const a = normalize(input);
    const b = normalize(target);
    if (a && b) return a === b;
    const raw = (s) => String(s || "").toLowerCase().trim();
    return raw(target).length > 0 && raw(input) === raw(target);
  };
  const acceptedList = (Array.isArray(acceptedAnswers) ? acceptedAnswers : []).concat([targetWord, _passage]).filter(Boolean);
  const isAcceptedAnswer = (value) => acceptedList.some((ans) => answerMatches(value, ans));
  const handleDrop = (e) => {
    e.preventDefault();
    if (status === "success") return;
    const droppedText = String(e.dataTransfer.getData("text/plain") || "").trim();
    if (isAcceptedAnswer(droppedText)) {
      setVal(droppedText);
      setEntered(droppedText);
      setStatus("success");
      if (onCorrect) onCorrect(targetWord);
    } else {
      setStatus("error");
      setTimeout(() => setStatus("neutral"), 800);
    }
  };
  const handleDragOver = (e) => {
    if (status !== "success") {
      e.preventDefault();
      if (status !== "active") setStatus("active");
    }
  };
  const handleDragLeave = () => {
    if (status === "active") setStatus("neutral");
  };
  const handleChange = (e) => {
    if (status === "success") return;
    const newVal = e.target.value;
    setVal(newVal);
    if (isAcceptedAnswer(newVal)) {
      setEntered(newVal);
      setStatus("success");
      if (onCorrect) onCorrect(targetWord);
    }
  };
  const width = Math.max(80, Math.max(String(targetWord || "").length, String(_passage || "").length) * 12) + "px";
  const _passageForm = String(_passage || "").trim();
  const showPassageForm = status === "success" && !!_passageForm && !!val && !answerMatches(val, _passageForm);
  return /* @__PURE__ */ React.createElement(
    "span",
    {
      className: "inline-block mx-1 relative align-middle",
      onDrop: handleDrop,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave
    },
    /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: val,
        onChange: handleChange,
        readOnly: status === "success",
        className: `
                  text-center border-b-2 px-1 py-0.5 text-sm font-bold transition-all motion-reduce:transition-none outline-none focus:ring-2 focus:ring-indigo-400 rounded-t
                  ${status === "success" ? "border-green-500 bg-green-50 text-green-800" : status === "error" ? "border-red-500 bg-red-50 animate-pulse motion-reduce:animate-none" : status === "active" ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200" : "border-indigo-300 bg-white focus:border-indigo-500 focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-200"}
              `,
        style: { width },
        placeholder: "?",
        autoComplete: "off",
        "aria-label": t("games.fill_blank.input_label"),
        "aria-invalid": status === "error"
      }
    ),
    status === "success" && /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", className: "absolute -top-2 -right-2 text-green-500 bg-white rounded-full shadow-sm animate-in motion-reduce:animate-none zoom-in duration-300" }, /* @__PURE__ */ React.createElement(CheckCircle2, { size: 16, className: "fill-green-100" })),
    showPassageForm && /* @__PURE__ */ React.createElement(
      "span",
      {
        className: "ms-1 align-middle text-[11px] font-semibold text-green-700 whitespace-nowrap",
        title: t("games.fill_blank.passage_form", { word: _passageForm }) || `In the passage: ${_passageForm}`
      },
      "(",
      _passageForm,
      ")"
    ),
    /* @__PURE__ */ React.createElement("span", { role: "status", "aria-live": "polite", className: "sr-only" }, status === "error" ? t("games.fill_blank.incorrect") || "Incorrect answer. Try again." : status === "success" ? [
      t("games.fill_blank.correct") || "Correct answer.",
      showPassageForm ? t("games.fill_blank.passage_form", { word: _passageForm }) || `In the passage: ${_passageForm}` : ""
    ].filter(Boolean).join(" ") : "")
  );
});
const WordSoundsReviewPanel = ({
  preloadedWords,
  onUpdateWord,
  onReorderWords,
  onStartActivity,
  onClose,
  onBackToSetup,
  onPlayAudio,
  onRegenerateWord,
  // The focused phoneme checker (Gemini + eSpeak + dictionary in parallel,
  // with agreement metadata). The host has always passed it; this panel never
  // destructured it, so the "Check" button below ran a full word
  // regeneration instead — which is what the row's own regenerate control
  // already does, and which does not triangulate.
  onCheckPhonemes,
  onRegenerateOption,
  onRegenerateManipulationTask,
  onRegenerateAll,
  onRetryFailedTTS,
  regeneratingIndex,
  onGenerateImage,
  onRefineImage,
  generatingImageIndex,
  isLoading,
  onDeleteWord,
  t,
  activitySequence,
  setActivitySequence,
  isStudentLocked,
  setIsStudentLocked,
  imageVisibilityMode,
  setImageVisibilityMode,
  isProbeMode
}) => {
  React.useEffect(() => {
  }, []);
  const [expandedIndex, setExpandedIndex] = React.useState(null);
  const [showPhonemeBank, setShowPhonemeBank] = React.useState(null);
  const [bankLabelMode, setBankLabelMode] = React.useState(() => {
    try {
      return localStorage.getItem("alloWsBankLabelMode") || "ipa";
    } catch (_) {
      return "ipa";
    }
  });
  const [expandedBankKey, setExpandedBankKey] = React.useState(null);
  const setBankLabelModePersist = (m) => {
    setBankLabelMode(m);
    try {
      localStorage.setItem("alloWsBankLabelMode", m);
    } catch (_) {
    }
  };
  const [fixingGap, setFixingGap] = React.useState(null);
  const [gapFixResult, setGapFixResult] = React.useState(null);
  const unmountedRef = React.useRef(false);
  const latestWordsRef = React.useRef(preloadedWords);
  latestWordsRef.current = preloadedWords;
  const gapBusyRef = React.useRef(false);
  React.useEffect(() => () => {
    unmountedRef.current = true;
  }, []);
  const GAP_FIX_GIVE_UP_AFTER = 3;
  const runOneGapFix = React.useCallback(async (gap) => {
    let fixed = 0;
    let unchanged = 0;
    let requested = 0;
    let stalled = false;
    if (!gap) return { fixed, unchanged, requested, stalled };
    setFixingGap(gap.key);
    if (gap.batch) {
      try {
        await gap.batch();
        requested = gap.indices.length;
      } catch (e) {
        unchanged = gap.indices.length;
      }
    } else if (gap.each) {
      let inARow = 0;
      for (const idx of gap.indices) {
        if (unmountedRef.current) break;
        try {
          await gap.each(idx);
        } catch (e) {
        }
        await new Promise((r) => setTimeout(r, 0));
        const after = (latestWordsRef.current || [])[idx];
        if (after && !gap.test(after)) {
          fixed += 1;
          inARow = 0;
        } else {
          unchanged += 1;
          inARow += 1;
          if (inARow >= GAP_FIX_GIVE_UP_AFTER) {
            stalled = true;
            break;
          }
        }
      }
    }
    return { fixed, unchanged, requested, stalled };
  }, []);
  const describeGapFix = ({ fixed, unchanged, requested, stalled }) => {
    const parts = [];
    if (fixed) parts.push(`${fixed} fixed`);
    if (requested) parts.push(`audio requested for ${requested} (arrives in the background)`);
    if (unchanged) parts.push(`${unchanged} unchanged`);
    if (!parts.length) return "Nothing to do.";
    const summary = parts.join(", ") + ".";
    if (stalled) {
      return `${summary} Stopped early: the service is refusing requests, which usually means a rate-limit cooldown. Try again in a minute.`;
    }
    return unchanged ? `${summary} Try again, or edit those words by hand.` : summary;
  };
  const runGapFixes = React.useCallback(async (gaps) => {
    const list = (Array.isArray(gaps) ? gaps : [gaps]).filter(Boolean);
    if (!list.length || gapBusyRef.current) return;
    gapBusyRef.current = true;
    setGapFixResult(null);
    const total = { fixed: 0, unchanged: 0, requested: 0, stalled: false };
    try {
      for (const gap of list) {
        if (unmountedRef.current) return;
        const tally = await runOneGapFix(gap);
        total.fixed += tally.fixed;
        total.unchanged += tally.unchanged;
        total.requested += tally.requested;
        if (tally.stalled) {
          total.stalled = true;
          break;
        }
      }
    } finally {
      gapBusyRef.current = false;
      if (!unmountedRef.current) {
        setFixingGap(null);
        setGapFixResult(describeGapFix(total));
      }
    }
  }, [runOneGapFix]);
  const [imageRefinementInputs, setImageRefinementInputs] = React.useState({});
  const [draggedPhoneme, setDraggedPhoneme] = React.useState(null);
  const [dragOverIndex, setDragOverIndex] = React.useState(null);
  const [playingWordIndex, setPlayingWordIndex] = React.useState(null);
  const [regeneratingOptions, setRegeneratingOptions] = React.useState({});
  const [playingAudioKey, setPlayingAudioKey] = React.useState(null);
  const [audioProgress, setAudioProgress] = React.useState({ ready: 0, total: 0 });
  const [reviewError, setReviewError] = React.useState(null);
  const [isCountingGuideOpen, setIsCountingGuideOpen] = React.useState(false);
  const [deletedWordUndo, setDeletedWordUndo] = React.useState(null);
  const [showProbeEndConfirm, setShowProbeEndConfirm] = React.useState(false);
  const reviewDialogRef = React.useRef(null);
  const reviewBackRef = React.useRef(null);
  const probeConfirmRef = React.useRef(null);
  const probeCancelRef = React.useRef(null);
  const finishBackToSetup = () => (onBackToSetup || onClose)?.();
  const requestBackToSetup = () => {
    if (isProbeMode) setShowProbeEndConfirm(true);
    else finishBackToSetup();
  };
  const trapReviewFocus = (event, container, onEscape) => {
    if (!event || !container) return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (onEscape) onEscape();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(container.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')).filter((el) => !el.hidden && el.getAttribute("aria-hidden") !== "true");
    if (!focusable.length) {
      event.preventDefault();
      container.focus();
      return;
    }
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  React.useEffect(() => {
    const previouslyFocused = document.activeElement;
    const timer = setTimeout(() => reviewBackRef.current?.focus(), 0);
    return () => {
      clearTimeout(timer);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") previouslyFocused.focus();
    };
  }, []);
  React.useEffect(() => {
    if (!showProbeEndConfirm) return void 0;
    const previouslyFocused = document.activeElement;
    const timer = setTimeout(() => probeCancelRef.current?.focus(), 0);
    return () => {
      clearTimeout(timer);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") previouslyFocused.focus();
    };
  }, [showProbeEndConfirm]);
  React.useEffect(() => {
    if (!preloadedWords || preloadedWords.length === 0) return;
    const normalizeAudioKey = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
    const checkAudio = () => {
      const portableKeys = /* @__PURE__ */ new Set();
      preloadedWords.forEach((item) => {
        const assets = item && item._ttsAssets;
        if (assets && typeof assets === "object") {
          Object.keys(assets).forEach((key) => portableKeys.add(normalizeAudioKey(key)));
        }
      });
      setAudioProgress({
        ready: preloadedWords.filter((w) => w.ttsReady === true || portableKeys.has(normalizeAudioKey(w.targetWord || w.word || w.term))).length,
        total: preloadedWords.length
      });
    };
    let cancelled = false;
    let pollTimer = null;
    const pollAudioReadiness = () => {
      checkAudio();
      if (!cancelled) pollTimer = setTimeout(pollAudioReadiness, 1e3);
    };
    pollAudioReadiness();
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [preloadedWords]);
  const PHONEME_BANK = {
    "Consonants": ["b", "c", "d", "f", "g", "h", "j", "k", "l", "m", "n", "p", "r", "s", "t", "v", "w", "y", "z"],
    "Digraphs": ["sh", "zh", "ch", "th", "wh", "ph", "ck", "ng", "q"],
    // 'schwa' sits with the short vowels because that is where a teacher
    // looks for it, though pedagogically it is its own thing: the reduced
    // vowel of any unstressed syllable, spellable with any vowel letter.
    "Vowels (Short)": ["a", "e", "i", "o", "u", "oo_short", "schwa"],
    "Vowels (Long)": ["ee", "oo", "ue", "aw", "ai", "ea", "oa"],
    "Diphthongs": ["ay", "ie", "ow", "oy"],
    "R-Controlled": ["ar", "er", "ir", "or", "ur", "air", "ear"]
  };
  const estimateFirstPhoneme = (word) => {
    if (!word) return "";
    const w = word.toLowerCase();
    const EXCEPTIONS = {
      "city": "s",
      "cent": "s",
      "cell": "s",
      "circle": "s",
      "cycle": "s",
      "cedar": "s",
      "cereal": "s",
      "center": "s",
      "gym": "j",
      "gem": "j",
      "giant": "j",
      "giraffe": "j",
      "gentle": "j",
      "germ": "j",
      "gist": "j",
      "ginger": "j",
      "knight": "n",
      "knee": "n",
      "knob": "n",
      "knock": "n",
      "knot": "n",
      "know": "n",
      "knife": "n",
      "wrap": "r",
      "wren": "r",
      "write": "r",
      "wrong": "r",
      "wrist": "r",
      "gnaw": "n",
      "gnat": "n",
      "gnome": "n",
      "psalm": "s",
      "psychology": "s"
    };
    if (EXCEPTIONS[w]) return EXCEPTIONS[w];
    const digraphs = PHONEME_BANK && PHONEME_BANK["Digraphs"] || ["sh", "ch", "th", "wh", "ph", "ng", "ck"];
    for (const dg of digraphs) {
      if (w.startsWith(dg)) return dg;
    }
    if (w.startsWith("kn")) return "n";
    if (w.startsWith("wr")) return "r";
    if (w.startsWith("gn")) return "n";
    if (w.startsWith("c") && w.length > 1 && "eiy".includes(w[1])) return "s";
    if (w.startsWith("g") && w.length > 1 && "eiy".includes(w[1])) return "j";
    return w.charAt(0);
  };
  const estimateLastPhoneme = (word) => {
    if (!word) return "";
    const w = word.toLowerCase();
    const EXCEPTIONS = {
      "come": "m",
      "some": "m",
      "done": "n",
      "gone": "n",
      "give": "v",
      "live": "v",
      "have": "v",
      "nation": "n",
      "action": "n"
    };
    if (EXCEPTIONS[w]) return EXCEPTIONS[w];
    const rControlled = PHONEME_BANK && PHONEME_BANK["R-Controlled"] || ["ar", "er", "ir", "or", "ur"];
    for (const rc of rControlled) {
      if (w.endsWith(rc)) return rc;
    }
    const digraphs = PHONEME_BANK && PHONEME_BANK["Digraphs"] || ["sh", "ch", "th", "ng", "ck"];
    for (const dg of digraphs) {
      if (dg === "ck" && w.endsWith("ck")) return "k";
      if (w.endsWith(dg)) return dg;
    }
    return w.slice(-1);
  };
  const normalizePhoneme = (p, defaultGrapheme = null) => {
    if (!p) return { ipa: "", grapheme: "" };
    if (typeof p === "object" && p.ipa) {
      return { ipa: p.ipa, grapheme: p.grapheme || p.ipa };
    }
    const grapheme = String(p).toLowerCase().trim();
    const GRAPHEME_TO_IPA = {
      "ng": "\u014B",
      "sh": "\u0283",
      "ch": "t\u0283",
      "th": "\u03B8",
      "dh": "\xF0",
      "zh": "\u0292",
      "aw": "\u0254",
      "or": "\u0254r",
      "ee": "i",
      "oo": "u",
      "wh": "w",
      "\u0101": "e\u026A",
      "\u0113": "i",
      "\u012B": "a\u026A",
      "\u014D": "o\u028A",
      "\u016B": "u",
      "ar": "\u0251r",
      "er": "\u025Br",
      "ir": "\u025Br",
      "ur": "\u025Br"
    };
    const ipa = GRAPHEME_TO_IPA[grapheme] || grapheme;
    return { ipa, grapheme: defaultGrapheme || grapheme };
  };
  const phonemeLabel = (p) => typeof p === "string" ? p : p && (p.grapheme || p.ipa) || "";
  const _bankIpaFallback = {
    schwa: "\u0259",
    oo_short: "\u028A",
    zh: "\u0292",
    q: "kw",
    ie: "a\u026A",
    ea: "i",
    oy: "\u0254\u026A",
    air: "\u025Br",
    ear: "\u026Ar",
    ay: "e\u026A",
    ar: "\u0251r",
    aw: "\u0254",
    ow: "a\u028A",
    ue: "u"
  };
  const resolvePhonemeDisplay = (key) => {
    const anchors = typeof window !== "undefined" && window.__alloAnchor && window.__alloAnchor.GRAPHOPHONEME_ANCHORS || {};
    const a = anchors[key];
    if (a) return {
      ipa: a.ipa || normalizePhoneme(key).ipa || key,
      graphemes: Array.isArray(a.graphemes) && a.graphemes.length ? a.graphemes : [key],
      keyWord: a.keyWord || ""
    };
    return { ipa: _bankIpaFallback[key] || normalizePhoneme(key).ipa || key, graphemes: [key], keyWord: "" };
  };
  const _bankDisplayGrapheme = (key) => key === "oo_short" ? "\u014F\u014F" : key === "schwa" ? "\u0259" : key;
  const addPhoneme = (wordIdx, phoneme) => {
    const word = preloadedWords[wordIdx];
    const newPhonemes = [...word.phonemes || [], phoneme];
    onUpdateWord(wordIdx, { ...word, phonemes: newPhonemes });
  };
  const removePhoneme = (wordIdx, phonemeIdx) => {
    const word = preloadedWords[wordIdx];
    const newPhonemes = (word.phonemes || []).filter((_, i) => i !== phonemeIdx);
    onUpdateWord(wordIdx, { ...word, phonemes: newPhonemes });
  };
  const handlePhonemeReorder = (wordIdx, fromIndex, toIndex) => {
    const word = preloadedWords[wordIdx];
    const phonemes = [...word.phonemes || []];
    const [moved] = phonemes.splice(fromIndex, 1);
    phonemes.splice(toIndex, 0, moved);
    onUpdateWord(wordIdx, { ...word, phonemes });
  };
  const handleDragStart = (e, phoneme, sourceType, sourceWordIdx = null, sourcePhonemeIdx = null) => {
    e.dataTransfer.effectAllowed = "copyMove";
    setDraggedPhoneme({ phoneme, sourceType, sourceWordIdx, sourcePhonemeIdx });
  };
  const handleDragOver = (e, targetIdx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverIndex(targetIdx);
  };
  const handleDrop = (e, wordIdx, dropPosition = null) => {
    e.preventDefault();
    if (!draggedPhoneme) return;
    const { phoneme, sourceType, sourceWordIdx, sourcePhonemeIdx } = draggedPhoneme;
    if (sourceType === "bank") {
      if (dropPosition !== null) {
        const word = preloadedWords[wordIdx];
        const currentPhonemes = Array.isArray(word.phonemes) ? [...word.phonemes] : [];
        if (dropPosition >= 0 && dropPosition < currentPhonemes.length) {
          currentPhonemes[dropPosition] = phoneme;
          onUpdateWord(wordIdx, { ...word, phonemes: currentPhonemes });
        }
      } else {
        addPhoneme(wordIdx, phoneme);
      }
    } else if (sourceType === "word" && sourceWordIdx === wordIdx && dropPosition !== null) {
      handlePhonemeReorder(wordIdx, sourcePhonemeIdx, dropPosition);
    }
    setDraggedPhoneme(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    setDraggedPhoneme(null);
    setDragOverIndex(null);
  };
  const moveWord = (index, direction) => {
    if (!onReorderWords) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= preloadedWords.length) return;
    const newList = [...preloadedWords];
    const [removed] = newList.splice(index, 1);
    newList.splice(newIndex, 0, removed);
    onReorderWords(newList);
    setExpandedIndex(null);
  };
  const focusReviewDeleteControl = (preferredIndex) => {
    setTimeout(() => {
      if (unmountedRef.current) return;
      const buttons = reviewDialogRef.current?.querySelectorAll("[data-word-delete-button]");
      const targetIndex = buttons?.length ? Math.min(preferredIndex, buttons.length - 1) : -1;
      const target = targetIndex >= 0 ? buttons[targetIndex] : reviewBackRef.current;
      target?.focus?.();
    }, 0);
  };
  const deleteReviewWord = (event, word, index) => {
    event.stopPropagation();
    if (typeof onDeleteWord !== "function") {
      warnLog("onDeleteWord is not a function");
      return;
    }
    const label = word?.targetWord || word?.word || (t("common.word") || "Word") + " " + (index + 1);
    setDeletedWordUndo({ word, index, label });
    setExpandedIndex(null);
    onDeleteWord(index);
    focusReviewDeleteControl(index);
  };
  const undoReviewWordDelete = () => {
    if (!deletedWordUndo || typeof onReorderWords !== "function") return;
    const currentWords = Array.isArray(latestWordsRef.current) ? [...latestWordsRef.current] : [];
    const deletedId = deletedWordUndo.word?.id;
    const isAlreadyPresent = currentWords.some((item) => item === deletedWordUndo.word || deletedId != null && item?.id === deletedId);
    if (!isAlreadyPresent) {
      currentWords.splice(Math.min(deletedWordUndo.index, currentWords.length), 0, deletedWordUndo.word);
      onReorderWords(currentWords);
    }
    const restoredIndex = Math.min(deletedWordUndo.index, Math.max(currentWords.length - 1, 0));
    setDeletedWordUndo(null);
    focusReviewDeleteControl(restoredIndex);
  };
  return /* @__PURE__ */ React.createElement("div", { role: "presentation", className: "fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-2 sm:p-4 animate-in motion-reduce:animate-none fade-in duration-300" }, /* @__PURE__ */ React.createElement("div", { ref: reviewDialogRef, role: "dialog", "aria-modal": "true", "aria-labelledby": "word-sounds-review-title", "aria-describedby": "word-sounds-review-description", tabIndex: -1, onKeyDown: (event) => {
    const nested = event.target?.closest?.('[role="alertdialog"]');
    if (nested) return;
    trapReviewFocus(event, reviewDialogRef.current, requestBackToSetup);
  }, className: "bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] overflow-hidden flex flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "p-4 sm:p-6 border-b bg-gradient-to-r from-pink-500 to-violet-500 text-white flex-shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement("h2", { id: "word-sounds-review-title", className: "text-xl sm:text-2xl font-black" }, t("word_sounds.pre_activity_review") || "\u{1F4CB} Pre-Activity Review"), /* @__PURE__ */ React.createElement("div", { className: "relative ml-1 sm:ml-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "aria-label": t("word_sounds.phonics_counting_guide_title") || "Phonics Counting Guide",
      "aria-expanded": isCountingGuideOpen,
      "aria-controls": "word-sounds-counting-guide",
      onClick: () => setIsCountingGuideOpen((open) => !open),
      onKeyDown: (event) => {
        if (event.key === "Escape" && isCountingGuideOpen) {
          event.preventDefault();
          event.stopPropagation();
          setIsCountingGuideOpen(false);
        }
      },
      className: "min-w-11 min-h-11 inline-flex items-center justify-center rounded-full text-white/90 hover:text-white hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-violet-500 text-base"
    },
    /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2139\uFE0F")
  ), isCountingGuideOpen && /* @__PURE__ */ React.createElement("div", { id: "word-sounds-counting-guide", role: "note", className: "absolute right-0 sm:left-0 sm:right-auto top-full mt-2 w-[min(18rem,calc(100vw-2rem))] p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl z-50" }, /* @__PURE__ */ React.createElement("strong", { className: "block mb-1" }, t("word_sounds.phonics_counting_guide_title") || "\u{1F4D6} Phonics Counting Guide"), /* @__PURE__ */ React.createElement("p", { className: "mb-2" }, t("word_sounds.r_controlled_explanation_prefix") || "R-controlled vowels (ar, er, ir, or, ur) are counted as ", /* @__PURE__ */ React.createElement("strong", null, t("word_sounds.single_sounds") || "single sounds"), t("word_sounds.r_controlled_explanation_suffix") || " because the vowel and R blend together."), /* @__PURE__ */ React.createElement("p", { className: "text-slate-200" }, t("word_sounds.r_controlled_example") || 'Example: "star" = 3 sounds (s-t-ar), not 4. This aligns with Orton-Gillingham and Wilson Reading methods.')))), /* @__PURE__ */ React.createElement("p", { id: "word-sounds-review-description", className: "text-sm opacity-80 mt-1 flex items-center gap-2 flex-wrap" }, /* @__PURE__ */ React.createElement("span", null, t("word_sounds.review_and_edit_words") || "Review and edit words", " \u2022 ", preloadedWords.length, " ", t("word_sounds.words_ready") || "words ready"), isLoading && /* @__PURE__ */ React.createElement("span", { role: "status", "aria-live": "polite", className: "flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-xs animate-pulse motion-reduce:animate-none" }, /* @__PURE__ */ React.createElement("div", { className: "w-2 h-2 bg-white rounded-full animate-bounce motion-reduce:animate-none" }), " ", t("word_sounds.generating_more") || "Generating more..."), !isLoading && preloadedWords.some((w) => w && w._ttsFailed) && /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-2 bg-red-500/30 border border-red-200/60 px-3 py-1 rounded-full text-xs" }, /* @__PURE__ */ React.createElement("span", null, "\u{1F507} Audio missing for ", preloadedWords.filter((w) => w && w._ttsFailed).length, " word", preloadedWords.filter((w) => w && w._ttsFailed).length === 1 ? "" : "s"), typeof onRetryFailedTTS === "function" && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: (e) => {
        e.stopPropagation();
        onRetryFailedTTS();
      },
      className: "px-2 py-0.5 bg-white/90 hover:bg-white text-red-600 font-bold rounded-full text-xs",
      title: t("word_sounds.retry_audio_tooltip") || "Retry audio generation for words that failed"
    },
    t("word_sounds.retry_audio") || "Retry audio"
  ))), reviewError && /* @__PURE__ */ React.createElement("p", { id: "word-sounds-review-error", role: "alert", className: "mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-800" }, reviewError.message)), deletedWordUndo && /* @__PURE__ */ React.createElement("div", { className: "mx-3 mt-3 sm:mx-6 sm:mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950" }, /* @__PURE__ */ React.createElement("span", { role: "status", "aria-live": "polite", "aria-atomic": "true" }, "\u201C", deletedWordUndo.label, "\u201D ", t("word_sounds.word_removed") || "removed."), typeof onReorderWords === "function" && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: undoReviewWordDelete, className: "min-h-11 rounded-lg px-3 py-2 font-bold text-amber-900 underline decoration-2 underline-offset-2 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-700" }, t("common.undo") || "Undo")), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 custom-scrollbar" }, !isLoading && preloadedWords.length > 0 && (() => {
    const norm = (v) => String(v || "").trim().toLowerCase().replace(/\s+/g, " ");
    const portableKeys = /* @__PURE__ */ new Set();
    const imageKeys = /* @__PURE__ */ new Set();
    preloadedWords.forEach((item) => {
      if (item && item._ttsAssets && typeof item._ttsAssets === "object") Object.keys(item._ttsAssets).forEach((k) => portableKeys.add(norm(k)));
      if (item && item._decodingAssets && typeof item._decodingAssets === "object") Object.keys(item._decodingAssets).forEach((k) => imageKeys.add(norm(k)));
      if (item && item._aacAssets && typeof item._aacAssets === "object") Object.keys(item._aacAssets).forEach((k) => imageKeys.add(norm(k)));
      const w = norm(item && (item.targetWord || item.word || item.term));
      if (w && item.image) imageKeys.add(w);
    });
    const gaps = [];
    const addGap = (gap) => {
      const indices = preloadedWords.map((w, i) => gap.test(w) ? i : -1).filter((i) => i >= 0);
      if (!indices.length) return;
      gaps.push({ ...gap, indices, text: gap.text(indices.length) });
    };
    const ttsIsLocal = typeof window !== "undefined" && !!(window._kokoroTTS && window._kokoroTTS.ready);
    const coverage = (preloadedWords[0] || {})._ttsCoverage;
    const packNote = coverage && coverage.rateLimited ? coverage.gaveUp ? " The last packing run was cut short by a rate limit, so most of this audio was never generated. Re-prepare in setup, ideally on the Kokoro local voice." : " The last packing run hit a rate limit and recovered, so some audio may be missing." : " Student devices will be silent for these; re-prepare the pack in setup to fix this.";
    addGap({
      key: "audio",
      test: (w) => w && !w.ttsReady && !portableKeys.has(norm(w.targetWord || w.word || w.term)),
      text: (n) => `\u{1F507} ${n} word${n === 1 ? "" : "s"} without portable audio.${packNote}`,
      each: null
    });
    addGap({
      key: "audio_runtime",
      test: (w) => w && w._ttsFailed,
      text: (n) => `\u{1F501} ${n} word${n === 1 ? "" : "s"} whose audio failed to load in this session`,
      label: t("word_sounds.fix_audio") || "Retry audio",
      needsNetwork: !ttsIsLocal,
      // Batch by nature: it re-arms the prefetch for every
      // word at once rather than taking an index. The
      // clips then arrive in the background, so this one
      // is reported as requested, not as fixed.
      batch: onRetryFailedTTS
    });
    addGap({
      key: "rhyme",
      test: (w) => w && !(w.rhymeWord || (w.rhymes || [])[0]),
      text: (n) => `\u{1F3B5} ${n} without a rhyme answer (board is built on-device)`,
      // The player derives one at runtime, so this is a
      // completeness note, not a broken board. Fixing it
      // means regenerating the whole word.
      label: t("word_sounds.fix_regenerate") || "Regenerate",
      needsNetwork: true,
      each: onRegenerateWord
    });
    addGap({
      key: "task",
      test: (w) => w && !(w.manipulationTask && w.manipulationTask.answer),
      text: (n) => `\u{1F501} ${n} without a Sound Swap task (fallback task used)`,
      label: t("word_sounds.fix_tasks") || "Build tasks",
      needsNetwork: true,
      each: onRegenerateManipulationTask
    });
    const missingDecodingImgs = preloadedWords.reduce((sum, w) => {
      const choices = w && w.activityItems && w.activityItems.decoding && w.activityItems.decoding.choices;
      if (!Array.isArray(choices)) return sum;
      return sum + choices.filter((c) => !imageKeys.has(norm(c))).length;
    }, 0);
    addGap({
      key: "images",
      test: (w) => {
        const choices = w && w.activityItems && w.activityItems.decoding && w.activityItems.decoding.choices;
        return Array.isArray(choices) && choices.some((c) => !imageKeys.has(norm(c)));
      },
      text: () => `\u{1F5BC}\uFE0F ${missingDecodingImgs} Read & Match picture${missingDecodingImgs === 1 ? "" : "s"} missing`,
      label: t("word_sounds.fix_images") || "Generate pictures",
      needsNetwork: true,
      each: onGenerateImage ? ((i) => onGenerateImage(i, preloadedWords[i] && (preloadedWords[i].targetWord || preloadedWords[i].word))) : null
    });
    addGap({
      key: "sentence_audio",
      test: (w) => {
        const b = w && w.activityItems;
        if (!b) return false;
        const texts = [
          b.read_sentence && b.read_sentence.sentence,
          b.read_passage && b.read_passage.story,
          b.sentence_match && b.sentence_match.sentence
        ].filter(Boolean);
        return texts.some((s) => !portableKeys.has(norm(s)));
      },
      text: (n) => `\u{1F507} ${n} word${n === 1 ? "" : "s"} whose sentence or story read-back audio did not pack. On student devices the read-back will be missing or fall back to a lower-quality voice; re-prepare the pack in setup.`,
      each: null
    });
    const missingTileImgs = preloadedWords.reduce((sum, w) => {
      const sm = w && w.activityItems && w.activityItems.sentence_match;
      if (!sm) return sum;
      const tiles = [...sm.sequence || [], ...sm.extras || []];
      return sum + tiles.filter((c) => !imageKeys.has(norm(c))).length;
    }, 0);
    addGap({
      key: "tile_images",
      test: (w) => {
        const sm = w && w.activityItems && w.activityItems.sentence_match;
        if (!sm) return false;
        return [...sm.sequence || [], ...sm.extras || []].some((c) => !imageKeys.has(norm(c)));
      },
      text: () => `\u{1F5BC}\uFE0F ${missingTileImgs} Picture the Sentence tile${missingTileImgs === 1 ? "" : "s"} without a picture. The tray waits for every picture, so these items stall on student devices; re-prepare the pack in setup.`,
      each: null
    });
    addGap({
      key: "unverified",
      test: (w) => w && Array.isArray(w._unverifiedWords) && w._unverifiedWords.length > 0,
      text: (n) => {
        const sample = [...new Set(preloadedWords.flatMap((w) => w && w._unverifiedWords || []))].slice(0, 6);
        return `\u{1F4D6} ${n} word${n === 1 ? "" : "s"} generated rhymes or family members that are not in the K-2 word lists: ${sample.join(", ")}${sample.length < n ? "\u2026" : ""}. Worth a look before teaching them.`;
      },
      // A judgement call, not a repair: the teacher edits
      // or regenerates the word if they disagree.
      each: null
    });
    addGap({
      key: "edited",
      test: (w) => w && w._packEdited,
      text: (n) => `\u270F\uFE0F ${n} word${n === 1 ? "" : "s"} edited since preparation (boards rebuild from your edits)`,
      // Re-packing an edited word is not built yet, so
      // there is deliberately no button here rather than
      // one that quietly does something else.
      each: null
    });
    addGap({
      key: "phonemes",
      test: (w) => w && w._fallbackUsed,
      // Generation now tries eSpeak before the spelling
      // heuristic, so this means a real G2P engine could
      // not do the word either.
      text: (n) => `\u26A0\uFE0F ${n} with sounds estimated from spelling`,
      label: t("word_sounds.fix_phonemes") || "Re-check sounds",
      needsNetwork: true,
      each: onCheckPhonemes
    });
    if (!gaps.length) return null;
    const busy = fixingGap !== null;
    const fixable = gaps.filter((g) => g.each || g.batch);
    const fixableWords = new Set(fixable.flatMap((g) => g.indices)).size;
    return /* @__PURE__ */ React.createElement("div", { className: "bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-3 mb-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-bold" }, t("word_sounds.pack_gaps_title") || "Student-device readiness"), fixable.length > 1 && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => runGapFixes(fixable),
        disabled: busy,
        "aria-busy": busy,
        className: `shrink-0 px-2 py-0.5 rounded-full font-bold border transition-colors motion-reduce:transition-none ${busy ? "bg-white/60 text-amber-800 border-amber-200" : "bg-amber-600 text-white border-amber-600 hover:bg-amber-700"}`
      },
      busy ? t("word_sounds.fixing") || "Fixing\u2026" : `${t("word_sounds.fix_all") || "Fix all"} (${fixableWords})`
    )), /* @__PURE__ */ React.createElement("ul", { className: "space-y-1" }, gaps.map((g) => /* @__PURE__ */ React.createElement("li", { key: g.key, className: "flex items-center justify-between gap-3" }, /* @__PURE__ */ React.createElement("span", null, g.text), (g.each || g.batch) && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => runGapFixes(g),
        disabled: busy,
        "aria-busy": fixingGap === g.key,
        className: `shrink-0 px-2 py-0.5 rounded-full font-bold border transition-colors motion-reduce:transition-none ${busy ? "bg-white/60 text-amber-800 border-amber-200" : "bg-white text-amber-900 border-amber-400 hover:bg-amber-100"}`,
        title: g.needsNetwork ? t("word_sounds.fix_needs_connection") || "Needs an internet connection" : void 0
      },
      fixingGap === g.key ? t("word_sounds.fixing") || "Fixing\u2026" : `${g.needsNetwork ? "\u2601\uFE0F " : ""}${g.label} (${g.indices.length})`
    )))), gapFixResult && /* @__PURE__ */ React.createElement("p", { role: "status", "aria-live": "polite", className: "mt-2 font-semibold" }, gapFixResult));
  })(), preloadedWords.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center py-12 text-slate-600" }, /* @__PURE__ */ React.createElement("div", { className: "text-4xl mb-2" }, "\u23F3"), isLoading ? /* @__PURE__ */ React.createElement("p", { role: "status", "aria-live": "polite", className: "animate-pulse motion-reduce:animate-none" }, t("word_sounds.generating_new_words") || "Generating new words... this may take a moment") : /* @__PURE__ */ React.createElement("p", null, t("word_sounds.no_words_preloaded") || "No words preloaded yet. Start the activity to generate words.")) : (preloadedWords || []).map((word, idx) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: word.id || `word-${word.targetWord || word.word}-${idx}`,
      className: `border-2 rounded-2xl transition-all motion-reduce:transition-none ${expandedIndex === idx ? "border-pink-300 bg-pink-50/50" : "border-slate-100 hover:border-pink-200"}`
    },
    /* @__PURE__ */ React.createElement("div", { className: "p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "relative z-50" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (regeneratingIndex !== null) {
            debugLog("\u23F3 Already regenerating, ignoring click");
            return;
          }
          debugLog("\u{1F504} FORCE CLICK regen idx:", idx);
          if (typeof onRegenerateWord === "function") {
            debugLog("\u2705 Calling onRegenerateWord for idx:", idx);
            setReviewError(null);
            onRegenerateWord(idx);
          } else {
            warnLog("\u274C onRegenerateWord is not a function:", typeof onRegenerateWord);
            setReviewError({ index: idx, message: t("word_sounds.regenerate_unavailable") || "Regeneration is unavailable right now. Please close this review and try again." });
          }
        },
        disabled: regeneratingIndex === idx,
        "aria-busy": regeneratingIndex === idx,
        "aria-describedby": reviewError?.index === idx ? "word-sounds-review-error" : void 0,
        "aria-label": regeneratingIndex === idx ? t("common.regenerating_word_aria") || "Regenerating word" : t("common.regenerate_this_word"),
        className: `w-10 h-10 flex items-center justify-center rounded-full transition-colors motion-reduce:transition-none text-base font-bold border-2
                                                    ${regeneratingIndex === idx ? "bg-orange-200 border-orange-400 animate-spin motion-reduce:animate-none text-orange-700" : "bg-orange-50 border-orange-200 text-orange-500 hover:bg-orange-100 hover:border-orange-300 hover:scale-110 shadow-sm"}`,
        "data-help-key": "word_sounds_review_regen_word",
        title: t("common.regenerate_this_word"),
        style: { pointerEvents: "auto", cursor: "pointer" }
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, regeneratingIndex === idx ? "\u23F3" : "\u{1F504}")
    )), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-0.5" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "aria-label": t("common.move_up"),
        onClick: (e) => {
          e.stopPropagation();
          moveWord(idx, "up");
        },
        disabled: idx === 0,
        className: `w-6 h-6 flex items-center justify-center rounded text-xs ${idx === 0 ? "text-slate-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-600"}`,
        "data-help-key": "word_sounds_review_move_word",
        title: t("common.move_up")
      },
      "\u25B2"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "aria-label": t("common.move_down"),
        onClick: (e) => {
          e.stopPropagation();
          moveWord(idx, "down");
        },
        disabled: idx === preloadedWords.length - 1,
        className: `w-6 h-6 flex items-center justify-center rounded text-xs ${idx === preloadedWords.length - 1 ? "text-slate-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-600"}`,
        "data-help-key": "word_sounds_review_move_word",
        title: t("common.move_down")
      },
      "\u25BC"
    )), /* @__PURE__ */ React.createElement("div", { className: "relative z-50", style: { pointerEvents: "auto" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: (event) => deleteReviewWord(event, word, idx),
        "aria-label": (t("common.delete_word") || "Delete word") + ": " + (word.targetWord || word.word || (t("common.word") || "Word") + " " + (idx + 1)),
        className: "min-w-10 min-h-10 flex items-center justify-center rounded-full bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors motion-reduce:transition-none border-2 border-red-200 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
        style: { pointerEvents: "auto", cursor: "pointer", position: "relative", zIndex: 100 },
        "data-word-delete-button": "true",
        "data-help-key": "word_sounds_review_delete_word",
        title: t("common.delete_word")
      },
      "\u{1F5D1}\uFE0F"
    )), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-mono text-slate-600 w-6" }, idx + 1, "."), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "data-help-key": "word_sounds_review_play_word",
        onClick: async (e) => {
          e.stopPropagation();
          if (!onPlayAudio || playingWordIndex !== null) return;
          setPlayingWordIndex(idx);
          try {
            const timeoutPromise = new Promise(
              (_, reject) => setTimeout(() => reject(new Error("Audio timeout")), 5e3)
            );
            await Promise.race([
              onPlayAudio(word.targetWord || word.word),
              timeoutPromise
            ]);
          } catch (e2) {
            warnLog("Play audio error or timeout:", e2);
          } finally {
            setPlayingWordIndex(null);
          }
        },
        disabled: playingWordIndex !== null || !(word.ttsReady || word._runtimeAudioReady),
        className: `w-10 h-10 rounded-full flex items-center justify-center transition-colors motion-reduce:transition-none ${word._ttsFailed ? "bg-red-100 hover:bg-red-200 text-red-600 border-2 border-red-300" : playingWordIndex === idx ? "bg-pink-200 text-pink-700 animate-pulse motion-reduce:animate-none" : playingWordIndex !== null ? "bg-pink-50 text-pink-300 cursor-not-allowed" : "bg-pink-100 hover:bg-pink-200 text-pink-600"}`,
        title: playingWordIndex === idx ? t("word_sounds.playing") || "Playing..." : word._ttsFailed ? t("word_sounds.audio_failed_retry_hint") || "Audio failed to generate \u2014 click Retry audio in header" : !(word.ttsReady || word._runtimeAudioReady) ? t("word_sounds.loading_audio") || "Loading audio..." : t("word_sounds.play_word") || "Play word",
        "aria-busy": playingWordIndex === idx || !word._ttsFailed && !(word.ttsReady || word._runtimeAudioReady),
        "aria-label": playingWordIndex === idx ? t("word_sounds.playing") || "Playing" : word._ttsFailed ? t("word_sounds.audio_failed_aria") || "Audio failed" : !(word.ttsReady || word._runtimeAudioReady) ? t("word_sounds.loading_audio") || "Loading audio" : t("word_sounds.play_word") || "Play word"
      },
      word._ttsFailed ? /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F507}") : playingWordIndex === idx ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 18, className: "animate-spin motion-reduce:animate-none", "aria-hidden": "true" }) : /* @__PURE__ */ React.createElement(Volume2, { size: 18, "aria-hidden": "true" })
    ), word.phonemes && Array.isArray(word.phonemes) && word.phonemes.length > 0 && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "aria-label": t("common.play_phoneme_sequence"),
        onClick: async (e) => {
          e.stopPropagation();
          if (onPlayAudio) {
            const seqId = Date.now();
            window._currentPhonemeSeqId = seqId;
            for (const phoneme of word.phonemes) {
              if (window._currentPhonemeSeqId !== seqId) {
                debugLog("Phoneme sequence cancelled");
                break;
              }
              await onPlayAudio(phonemeLabel(phoneme));
              await new Promise((r) => setTimeout(r, 900));
            }
          }
        },
        className: "w-10 h-10 bg-violet-100 hover:bg-violet-200 text-violet-600 rounded-full flex items-center justify-center transition-colors motion-reduce:transition-none",
        "data-help-key": "word_sounds_review_play_phonemes",
        title: t("common.play_phoneme_sequence")
      },
      /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold" }, "\u{1F524}")
    ), /* @__PURE__ */ React.createElement("div", { className: "relative group/img" }, word.image && !word.imageFailed ? /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
      "img",
      {
        loading: "lazy",
        src: word.image,
        alt: word.targetWord || word.word,
        className: "w-12 h-12 rounded-lg object-cover border-2 border-indigo-200 shadow-sm",
        onError: (e) => {
          e.target.style.display = "none";
          e.target.parentElement.innerHTML = '<span class="text-red-400 text-xs">\u26A0\uFE0F Error</span>';
        }
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: (e) => {
          e.stopPropagation();
          onGenerateImage && onGenerateImage(idx, word.targetWord || word.word);
        },
        disabled: generatingImageIndex === idx,
        "aria-busy": generatingImageIndex === idx,
        "aria-label": generatingImageIndex === idx ? t("word_sounds.generating_image_aria") || "Generating image" : t("common.regenerate_image"),
        className: "absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover/img:opacity-100 group-focus-within/img:opacity-100 focus:opacity-100 transition-opacity motion-reduce:transition-none border border-indigo-200",
        "data-help-key": "word_sounds_review_image_gen",
        title: t("common.regenerate_image")
      },
      generatingImageIndex === idx ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 10, className: "animate-spin motion-reduce:animate-none text-indigo-500", "aria-hidden": "true" }) : /* @__PURE__ */ React.createElement(RefreshCw, { size: 10, className: "text-indigo-500", "aria-hidden": "true" })
    )) : /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "aria-label": t("common.generate_image_for_this_word"),
        onClick: (e) => {
          e.stopPropagation();
          onGenerateImage && onGenerateImage(idx, word.targetWord || word.word);
        },
        disabled: generatingImageIndex === idx,
        "aria-busy": generatingImageIndex === idx,
        className: `px-3 py-2 rounded-lg border-2 flex items-center gap-2 text-sm font-bold transition-all motion-reduce:transition-none ${generatingImageIndex === idx ? "border-indigo-400 bg-indigo-100 text-indigo-600 animate-pulse motion-reduce:animate-none" : "border-dashed border-indigo-300 text-indigo-500 hover:border-indigo-500 hover:bg-indigo-50 hover:scale-105"}`,
        "data-help-key": "word_sounds_review_image_gen",
        title: t("common.generate_image_for_this_word")
      },
      generatingImageIndex === idx ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 16, className: "animate-spin motion-reduce:animate-none", "aria-hidden": "true" }), " ", t("word_sounds.generating_image") || "Generating...") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(ImageIcon, { size: 16, "aria-hidden": "true" }), " ", t("word_sounds.add_image_button") || "+ Image")
    )), /* @__PURE__ */ React.createElement("span", { className: "min-w-0 break-words text-xl font-bold text-slate-800" }, word.targetWord || word.word), /* @__PURE__ */ React.createElement(
      "select",
      {
        "aria-label": (t("word_sounds.difficulty") || "Difficulty") + ": " + (word.targetWord || word.word || (t("common.word") || "Word") + " " + (idx + 1)),
        value: word.difficulty || "medium",
        onClick: (e) => e.stopPropagation(),
        onChange: (e) => onUpdateWord(idx, { ...word, difficulty: e.target.value }),
        className: `text-xs font-bold px-2 py-1 rounded-full border cursor-pointer appearance-none ${word.difficulty === "easy" ? "bg-green-100 text-green-700 border-green-300" : word.difficulty === "hard" ? "bg-red-100 text-red-700 border-red-300" : "bg-yellow-100 text-yellow-700 border-yellow-300"}`
      },
      /* @__PURE__ */ React.createElement("option", { value: "easy" }, "\u{1F7E2} Easy"),
      /* @__PURE__ */ React.createElement("option", { value: "medium" }, "\u{1F7E1} Medium"),
      /* @__PURE__ */ React.createElement("option", { value: "hard" }, "\u{1F534} Hard")
    ), /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full" }, word.phonemes?.length || 0, " sounds")), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setExpandedIndex(expandedIndex === idx ? null : idx),
        "aria-expanded": expandedIndex === idx,
        "aria-controls": `word-sounds-details-${idx}`,
        "aria-label": expandedIndex === idx ? t("common.collapse") || "Collapse word details" : t("common.expand") || "Expand word details",
        className: "min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
      },
      /* @__PURE__ */ React.createElement(ChevronDown, { size: 20, "aria-hidden": "true", className: `transition-transform motion-reduce:transition-none ${expandedIndex === idx ? "rotate-180" : ""}` })
    )),
    expandedIndex === idx && /* @__PURE__ */ React.createElement("div", { id: `word-sounds-details-${idx}`, className: "border-t border-slate-100 p-4 space-y-4 animate-in motion-reduce:animate-none slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-bold text-slate-600 uppercase tracking-wider" }, t("word_sounds.phonemes")), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => (onCheckPhonemes || onRegenerateWord) && (onCheckPhonemes || onRegenerateWord)(idx),
        disabled: regeneratingIndex === idx,
        "aria-busy": regeneratingIndex === idx,
        className: `text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 font-bold transition-colors motion-reduce:transition-none ${regeneratingIndex === idx ? "bg-slate-100 text-slate-600" : "bg-violet-100 text-violet-600 hover:bg-violet-200"}`,
        title: t("word_sounds.recheck_phonemes_tooltip") || "Re-check phonemes with Gemini"
      },
      regeneratingIndex === idx ? /* @__PURE__ */ React.createElement("div", { className: "animate-spin motion-reduce:animate-none h-3 w-3 border-2 border-current border-t-transparent rounded-full", "aria-hidden": "true" }) : /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2728"),
      t("word_sounds.recheck_phonemes_button") || "Check"
    ))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "data-help-key": "word_sounds_review_phoneme_bank",
        onClick: () => setShowPhonemeBank(showPhonemeBank === idx ? null : idx),
        className: `text-xs px-2 py-1 rounded-full transition-colors motion-reduce:transition-none ${showPhonemeBank === idx ? "bg-pink-700 text-white" : "bg-pink-100 text-pink-600 hover:bg-pink-200"}`
      },
      showPhonemeBank === idx ? t("word_sounds.close_bank") || "\u2715 Close Bank" : t("word_sounds.add_sound") || "+ Add Sound"
    )), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: `flex flex-wrap gap-2 mb-2 min-h-[40px] p-2 rounded-lg border-2 border-dashed transition-colors motion-reduce:transition-none ${draggedPhoneme ? "border-pink-300 bg-pink-50" : "border-transparent"}`,
        onDragOver: (e) => e.preventDefault(),
        onDrop: (e) => handleDrop(e, idx)
      },
      (Array.isArray(word.phonemes) ? word.phonemes : []).map((p, i) => /* @__PURE__ */ React.createElement(
        "div",
        {
          key: i,
          className: `group relative cursor-grab active:cursor-grabbing ${dragOverIndex === i ? "ring-2 ring-pink-400" : ""}`,
          role: "group",
          "aria-label": `${phonemeLabel(p) || "Phoneme"}, position ${i + 1} of ${(word.phonemes || []).length}`,
          draggable: true,
          onDragStart: (e) => handleDragStart(e, p, "word", idx, i),
          "data-keyboard-alternative": "Use the Move earlier and Move later buttons",
          onDragOver: (e) => handleDragOver(e, i),
          onDrop: (e) => {
            e.stopPropagation();
            handleDrop(e, idx, i);
          },
          onDragEnd: handleDragEnd
        },
        /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-pink-100 to-violet-100 text-violet-700 font-bold rounded-lg border-2 border-violet-200", title: typeof PHONEME_GUIDE !== "undefined" && PHONEME_GUIDE[phonemeLabel(p)] ? `${PHONEME_GUIDE[phonemeLabel(p)].label} (${PHONEME_GUIDE[phonemeLabel(p)].ipa}) \u2014 ${PHONEME_GUIDE[phonemeLabel(p)].examples}` : phonemeLabel(p) }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-600 text-xs mr-1" }, "\u283F"), phonemeLabel(p), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => handlePhonemeReorder(idx, i, i - 1), disabled: i === 0, "aria-label": `Move ${phonemeLabel(p) || "phoneme"} earlier`, className: "w-6 h-6 flex items-center justify-center rounded-full bg-violet-100 text-violet-700 hover:bg-violet-200 disabled:opacity-40", title: "Move earlier" }, "\u25C0"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => handlePhonemeReorder(idx, i, i + 1), disabled: i === (word.phonemes || []).length - 1, "aria-label": `Move ${phonemeLabel(p) || "phoneme"} later`, className: "w-6 h-6 flex items-center justify-center rounded-full bg-violet-100 text-violet-700 hover:bg-violet-200 disabled:opacity-40", title: "Move later" }, "\u25B6"), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            "aria-label": t("common.remove"),
            onClick: () => removePhoneme(idx, i),
            className: "w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-xs opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 transition-opacity motion-reduce:transition-none",
            title: t("common.remove")
          },
          "\xD7"
        ))
      )),
      (() => {
        const p = word.phonemes;
        const a = Array.isArray(p) ? p : p?.phonemes && Array.isArray(p.phonemes) ? p.phonemes : [];
        return a.length === 0;
      })() && /* @__PURE__ */ React.createElement("span", { className: "text-slate-600 text-sm italic" }, t("word_sounds.no_phonemes_hint") || 'No phonemes - click "Add Sound" to build')
    ), showPhonemeBank === idx && /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 border-2 border-slate-200 rounded-xl p-3 mt-2 animate-in motion-reduce:animate-none slide-in-from-top-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2 gap-2 flex-wrap" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-600 italic" }, t("word_sounds.phoneme_bank_hover_hint") || "\u{1F4A1} Hover any sound for teaching tips"), /* @__PURE__ */ React.createElement("div", { className: "inline-flex rounded-lg border border-slate-300 overflow-hidden text-[11px] font-bold shrink-0", role: "group", "aria-label": t("word_sounds.bank_label_mode") || "Sound label style" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setBankLabelModePersist("ipa"),
        "aria-pressed": bankLabelMode === "ipa",
        title: t("word_sounds.bank_show_ipa") || "Show the sound in IPA (international phonetic symbols) first",
        className: `px-2 py-1 transition-colors motion-reduce:transition-none ${bankLabelMode === "ipa" ? "bg-pink-600 text-white" : "bg-white text-slate-500 hover:bg-pink-50"}`
      },
      "/\u0283/ IPA"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setBankLabelModePersist("letters"),
        "aria-pressed": bankLabelMode === "letters",
        title: t("word_sounds.bank_show_letters") || "Show the letters (graphemes) first",
        className: `px-2 py-1 border-l border-slate-300 transition-colors motion-reduce:transition-none ${bankLabelMode === "letters" ? "bg-pink-600 text-white" : "bg-white text-slate-500 hover:bg-pink-50"}`
      },
      "Aa letters"
    ))), Object.entries(PHONEME_BANK).map(([category, phonemes]) => /* @__PURE__ */ React.createElement("div", { key: category, className: "mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-slate-600 uppercase mb-1", title: category === "Consonants" ? "Single consonant sounds \u2014 pair voiced (b,d,g) with unvoiced (p,t,k)" : category === "Vowels (Short)" ? "Quick vowel sounds \u2014 cat, pet, sit, hot, cup, book" : category === "Vowels (Long)" ? "Longer vowel sounds \u2014 see, moon, cue, saw + vowel teams ai, ea, oa" : category === "Digraphs" ? "Two letters that make ONE sound \u2014 sh, ch, th, wh, ng" : category === "R-Controlled" ? "Bossy R changes the vowel sound \u2014 ar, er, ir, or, ur, air, ear" : category === "Diphthongs" ? "Vowel sounds that glide \u2014 ay (day), ie (tie), ow (cow), oy (boy)" : category }, category), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1" }, (Array.isArray(phonemes) ? phonemes : []).map((p) => {
      const _disp = resolvePhonemeDisplay(p);
      const _graph = _bankDisplayGrapheme(p);
      const _ipaLabel = "/" + _disp.ipa + "/";
      const _lead = bankLabelMode === "ipa" ? _ipaLabel : _graph;
      const _caption = bankLabelMode === "ipa" ? _graph : _ipaLabel;
      const _bankKey = idx + ":" + p;
      const _isExp = expandedBankKey === _bankKey;
      const _hasSpellings = Array.isArray(_disp.graphemes) && _disp.graphemes.length > 1;
      const _addTitle = typeof PHONEME_GUIDE !== "undefined" && PHONEME_GUIDE[p] ? `${PHONEME_GUIDE[p].label}: ${PHONEME_GUIDE[p].tip}${PHONEME_GUIDE[p].confusesWith?.length ? "\n\u26A0\uFE0F Often confused with: " + PHONEME_GUIDE[p].confusesWith.join(", ") : ""}` : `Click or drag to add the ${_ipaLabel} sound (${_graph})`;
      return /* @__PURE__ */ React.createElement("div", { key: p, className: "inline-flex flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "inline-flex rounded overflow-hidden border border-slate-400 hover:border-pink-400 transition-colors motion-reduce:transition-none" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => onPlayAudio && onPlayAudio(p),
          className: "px-1.5 py-1 bg-slate-100 hover:bg-pink-200 text-slate-600 hover:text-pink-600 transition-colors motion-reduce:transition-none border-r border-slate-300",
          title: typeof PHONEME_GUIDE !== "undefined" && PHONEME_GUIDE[p] ? `\u{1F50A} ${PHONEME_GUIDE[p].label} (${PHONEME_GUIDE[p].ipa}) \u2014 ${PHONEME_GUIDE[p].examples}` : `Play the ${_ipaLabel} sound`
        },
        "\u{1F50A}"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => addPhoneme(idx, p),
          draggable: true,
          onDragStart: (e) => handleDragStart(e, p, "bank"),
          "data-keyboard-alternative": "Activate this button to add the sound",
          onDragEnd: handleDragEnd,
          className: "px-2 py-1 bg-white hover:bg-pink-100 transition-colors motion-reduce:transition-none cursor-grab active:cursor-grabbing flex flex-col items-center leading-none",
          title: _addTitle
        },
        /* @__PURE__ */ React.createElement("span", { className: bankLabelMode === "ipa" ? "text-sm font-bold text-slate-800" : "text-sm font-mono text-slate-800" }, _lead),
        /* @__PURE__ */ React.createElement("span", { className: bankLabelMode === "ipa" ? "text-[10px] font-mono text-slate-400 mt-0.5" : "text-[10px] text-slate-400 mt-0.5" }, _caption)
      ), _hasSpellings && /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setExpandedBankKey(_isExp ? null : _bankKey),
          "aria-expanded": _isExp,
          className: "px-1 py-1 bg-slate-50 hover:bg-pink-100 text-slate-400 hover:text-pink-600 transition-colors motion-reduce:transition-none border-l border-slate-300 text-[10px]",
          title: t("word_sounds.bank_show_spellings") || "Show the letters that spell this sound"
        },
        _isExp ? "\u25B4" : "\u22EF"
      )), _isExp && /* @__PURE__ */ React.createElement("div", { className: "mt-1 mb-1 px-2 py-1 bg-white border border-pink-200 rounded-lg text-[11px] text-slate-600 max-w-[220px]" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-pink-600" }, _ipaLabel), _disp.keyWord ? /* @__PURE__ */ React.createElement("span", { className: "text-slate-400" }, " \xB7 as in ", _disp.keyWord) : null, /* @__PURE__ */ React.createElement("div", { className: "mt-0.5 flex flex-wrap gap-1" }, _disp.graphemes.map((g, gi) => /* @__PURE__ */ React.createElement("span", { key: gi, className: "px-1.5 py-0.5 bg-slate-100 rounded font-mono text-slate-700" }, g)))));
    })))))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-bold text-orange-500 uppercase tracking-wider mb-2 block" }, t("word_sounds.rhyme_options")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("common.rhyme_time_options"),
        value: word.rhymeWord || "",
        onChange: (e) => onUpdateWord(idx, { ...word, rhymeWord: e.target.value }),
        className: "px-3 py-1.5 font-bold border-2 border-green-300 bg-green-50 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-400 focus:ring-offset-1 outline-none",
        "data-help-key": "word_sounds_review_distractor_input",
        placeholder: t("common.placeholder_correct_rhyme")
      }
    ), (word.rhymeDistractors || []).map((d, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("common.enter_d"),
        value: d,
        onChange: (e) => {
          const newDist = [...word.rhymeDistractors || []];
          newDist[i] = e.target.value;
          onUpdateWord(idx, { ...word, rhymeDistractors: newDist });
        },
        className: "flex-1 px-3 py-1.5 font-medium border-2 border-slate-200 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-300 focus:ring-offset-1 outline-none",
        "data-help-key": "word_sounds_review_distractor_input",
        placeholder: t("common.placeholder_distractor")
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "aria-label": (t("common.play_tts") || "Play") + ": " + d,
        onClick: async (e) => {
          e.stopPropagation();
          const key = `${idx}-rhyme-${i}`;
          if (playingAudioKey) return;
          setPlayingAudioKey(key);
          try {
            await onPlayAudio(d);
          } finally {
            setPlayingAudioKey(null);
          }
        },
        className: "p-2 rounded-lg bg-slate-100 hover:bg-orange-100 text-slate-600 hover:text-orange-600 transition-colors motion-reduce:transition-none min-w-[32px] flex justify-center",
        "data-help-key": "word_sounds_review_play_distractor",
        title: t("common.play_tts")
      },
      playingAudioKey === `${idx}-rhyme-${i}` ? /* @__PURE__ */ React.createElement("div", { className: "animate-spin motion-reduce:animate-none h-4 w-4 border-2 border-current border-t-transparent rounded-full" }) : "\u{1F50A}"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "aria-label": t("word_sounds.refresh_audio") || "Refresh audio",
        onClick: async () => {
          if (!onRegenerateOption) return;
          const key = `${idx}-rhyme-${i}`;
          setRegeneratingOptions((prev) => ({ ...prev, [key]: true }));
          try {
            await onRegenerateOption(idx, "rhymeDistractors", i, d);
          } finally {
            setRegeneratingOptions((prev) => {
              const n = { ...prev };
              delete n[key];
              return n;
            });
          }
        },
        disabled: !!regeneratingOptions[`${idx}-rhyme-${i}`],
        className: `${regeneratingOptions[`${idx}-rhyme-${i}`] ? "w-auto px-2 gap-1 bg-orange-200 text-orange-800" : "w-8 bg-orange-50 hover:bg-orange-100 text-orange-400 hover:text-orange-600"} h-8 rounded-lg transition-colors motion-reduce:transition-none flex items-center justify-center text-xs font-bold`,
        title: t("word_sounds.refresh_audio_tooltip") || "Refresh audio (re-synthesize TTS for this word)"
      },
      regeneratingOptions[`${idx}-rhyme-${i}`] ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin motion-reduce:animate-none" }), /* @__PURE__ */ React.createElement("span", null, t("word_sounds.refreshing") || "Refreshing\u2026")) : "\u{1F504}"
    ))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => {
          const newDist = [...word.rhymeDistractors || [], ""];
          onUpdateWord(idx, { ...word, rhymeDistractors: newDist });
        },
        className: "px-3 py-1.5 bg-orange-100 text-orange-600 rounded-lg border-2 border-dashed border-orange-300 hover:bg-orange-200 text-sm font-bold"
      },
      t("word_sounds.add_distractor") || "+ Add"
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-bold text-violet-500 uppercase tracking-wider mb-2 block" }, t("word_sounds.blend_options")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "px-3 py-1.5 font-bold bg-green-100 text-green-700 rounded-lg border-2 border-green-300" }, word.targetWord || word.word, " \u2713"), (word.blendingDistractors || []).map((d, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("common.enter_d"),
        value: d,
        onChange: (e) => {
          const newDist = [...word.blendingDistractors];
          newDist[i] = e.target.value;
          onUpdateWord(idx, { ...word, blendingDistractors: newDist });
        },
        className: "flex-1 px-3 py-1.5 font-medium border-2 border-slate-200 rounded-lg focus:border-violet-400 focus:ring-2 focus:ring-violet-300 focus:ring-offset-1 outline-none"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "aria-label": (t("common.play_tts") || "Play") + ": " + d,
        onClick: async (e) => {
          e.stopPropagation();
          const key = `${idx}-blend-${i}`;
          if (playingAudioKey) return;
          setPlayingAudioKey(key);
          try {
            await onPlayAudio(d);
          } finally {
            setPlayingAudioKey(null);
          }
        },
        className: "p-2 rounded-lg bg-slate-100 hover:bg-violet-100 text-slate-600 hover:text-violet-600 transition-colors motion-reduce:transition-none min-w-[32px] flex justify-center",
        "data-help-key": "word_sounds_review_play_distractor",
        title: t("common.play_tts")
      },
      playingAudioKey === `${idx}-blend-${i}` ? /* @__PURE__ */ React.createElement("div", { className: "animate-spin motion-reduce:animate-none h-4 w-4 border-2 border-current border-t-transparent rounded-full" }) : "\u{1F50A}"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "aria-label": t("word_sounds.refresh_audio") || "Refresh audio",
        onClick: async () => {
          if (!onRegenerateOption) return;
          const key = `${idx}-blend-${i}`;
          setRegeneratingOptions((prev) => ({ ...prev, [key]: true }));
          try {
            await onRegenerateOption(idx, "blendingDistractors", i, d);
          } finally {
            setRegeneratingOptions((prev) => {
              const n = { ...prev };
              delete n[key];
              return n;
            });
          }
        },
        disabled: !!regeneratingOptions[`${idx}-blend-${i}`],
        className: `${regeneratingOptions[`${idx}-blend-${i}`] ? "w-auto px-2 gap-1 bg-violet-200 text-violet-800" : "w-8 bg-violet-50 hover:bg-violet-100 text-violet-400 hover:text-violet-600"} h-8 rounded-lg transition-colors motion-reduce:transition-none flex items-center justify-center text-xs font-bold`,
        title: t("word_sounds.refresh_audio_tooltip") || "Refresh audio (re-synthesize TTS for this word)"
      },
      regeneratingOptions[`${idx}-blend-${i}`] ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin motion-reduce:animate-none" }), /* @__PURE__ */ React.createElement("span", null, t("word_sounds.refreshing") || "Refreshing\u2026")) : "\u{1F504}"
    ))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => {
          const newDist = [...word.blendingDistractors || [], ""];
          onUpdateWord(idx, { ...word, blendingDistractors: newDist });
        },
        className: "px-3 py-1.5 bg-violet-100 text-violet-600 rounded-lg border-2 border-dashed border-violet-300 hover:bg-violet-200 text-sm font-bold"
      },
      t("word_sounds.add_distractor") || "+ Add"
    ))), (() => {
      {
      }
      const _ct = word.activityItems || {};
      const _ctWord = word.targetWord || word.word || word.term;
      const _ctLines = [
        _ct.read_sentence && _ct.read_sentence.sentence && { key: "sent", icon: "\u{1F4AC}", label: t("word_sounds.activity_read_sentence") || "Finish the Sentence", text: _ct.read_sentence.sentence },
        _ct.read_passage && _ct.read_passage.story && { key: "story", icon: "\u{1F4DA}", label: t("word_sounds.activity_read_passage") || "Read the Story", text: _ct.read_passage.story },
        _ct.sentence_match && _ct.sentence_match.sentence && { key: "pair", icon: "\u{1F5BC}\uFE0F", label: t("word_sounds.activity_sentence_match") || "Picture the Sentence", text: _ct.sentence_match.sentence }
      ].filter(Boolean);
      if (!_ctLines.length) return null;
      return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-bold text-sky-600 uppercase tracking-wider mb-2 block" }, t("word_sounds.connected_text_label") || "Connected Text (sentence activities)"), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5 p-3 bg-sky-50 border-2 border-sky-200 rounded-lg" }, _ctLines.map((line) => /* @__PURE__ */ React.createElement("div", { key: line.key, className: "flex items-center gap-2 text-sm text-slate-700" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, line.icon), /* @__PURE__ */ React.createElement("span", { className: "sr-only" }, line.label, ":"), /* @__PURE__ */ React.createElement("span", { className: "flex-1" }, wsHighlightTarget(line.text, _ctWord)), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "aria-label": (t("common.play_tts") || "Play") + " \u2014 " + line.label,
          onClick: async (e) => {
            e.stopPropagation();
            const key = `${idx}-ct-${line.key}`;
            if (playingAudioKey) return;
            setPlayingAudioKey(key);
            try {
              await onPlayAudio(line.text);
            } finally {
              setPlayingAudioKey(null);
            }
          },
          className: "p-2 rounded-lg bg-white hover:bg-sky-100 text-slate-600 hover:text-sky-700 transition-colors motion-reduce:transition-none min-w-[32px] flex justify-center",
          title: t("common.play_tts") || "Play"
        },
        playingAudioKey === `${idx}-ct-${line.key}` ? /* @__PURE__ */ React.createElement("div", { className: "animate-spin motion-reduce:animate-none h-4 w-4 border-2 border-current border-t-transparent rounded-full" }) : "\u{1F50A}"
      )))));
    })(), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-bold text-amber-600 uppercase tracking-wider block" }, t("word_sounds.sound_swap_label") || "Sound Swap (Manipulation Activity)"), word.manipulationTask?.type && /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300" }, word.manipulationTask.type)), word.manipulationTask ? /* @__PURE__ */ React.createElement("div", { className: "space-y-2 p-3 bg-amber-50 border-2 border-amber-200 rounded-lg" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1" }, t("word_sounds.instruction_label") || "Instruction (spoken to student)"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("word_sounds.sound_swap_instruction_aria") || "Sound Swap instruction",
        value: word.manipulationTask.instruction || "",
        onChange: (e) => onUpdateWord(idx, { ...word, manipulationTask: { ...word.manipulationTask, instruction: e.target.value } }),
        className: "flex-1 px-3 py-1.5 text-sm font-medium border-2 border-amber-200 rounded-lg focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white",
        placeholder: t("word_sounds.sound_swap_instruction_placeholder") || "Say 'word'. Now say it again, but leave out the /x/ sound."
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "aria-label": t("word_sounds.preview_instruction_tts_aria") || "Preview instruction TTS",
        onClick: async (e) => {
          e.stopPropagation();
          const key = `${idx}-manip-instruction`;
          if (playingAudioKey) return;
          setPlayingAudioKey(key);
          try {
            await onPlayAudio(word.manipulationTask.instruction);
          } finally {
            setPlayingAudioKey(null);
          }
        },
        className: "p-2 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-600 transition-colors motion-reduce:transition-none min-w-[32px] flex justify-center",
        title: t("word_sounds.preview_instruction_tooltip") || "Preview instruction"
      },
      playingAudioKey === `${idx}-manip-instruction` ? /* @__PURE__ */ React.createElement("div", { className: "animate-spin motion-reduce:animate-none h-4 w-4 border-2 border-current border-t-transparent rounded-full" }) : "\u{1F50A}"
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1" }, t("word_sounds.answer_distractors_label") || "Answer (correct) + Distractors"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("word_sounds.correct_answer_aria") || "Correct answer",
        value: word.manipulationTask.answer || "",
        onChange: (e) => onUpdateWord(idx, { ...word, manipulationTask: { ...word.manipulationTask, answer: e.target.value } }),
        className: "px-3 py-1.5 font-bold border-2 border-green-300 bg-green-50 rounded-lg focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-300",
        placeholder: t("word_sounds.answer_placeholder") || "answer"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "aria-label": t("word_sounds.preview_answer_aria") || "Preview answer",
        onClick: async (e) => {
          e.stopPropagation();
          const key = `${idx}-manip-answer`;
          if (playingAudioKey) return;
          setPlayingAudioKey(key);
          try {
            await onPlayAudio(word.manipulationTask.answer);
          } finally {
            setPlayingAudioKey(null);
          }
        },
        className: "p-2 rounded-lg bg-slate-100 hover:bg-green-100 text-slate-600 hover:text-green-600 transition-colors motion-reduce:transition-none min-w-[32px] flex justify-center",
        title: t("word_sounds.preview_answer_tooltip") || "Preview answer"
      },
      playingAudioKey === `${idx}-manip-answer` ? /* @__PURE__ */ React.createElement("div", { className: "animate-spin motion-reduce:animate-none h-4 w-4 border-2 border-current border-t-transparent rounded-full" }) : "\u{1F50A}"
    )), (word.manipulationTask.distractors || []).map((d, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": `Distractor ${i + 1}`,
        value: d,
        onChange: (e) => {
          const newDist = [...word.manipulationTask.distractors || []];
          newDist[i] = e.target.value;
          onUpdateWord(idx, { ...word, manipulationTask: { ...word.manipulationTask, distractors: newDist } });
        },
        className: "flex-1 px-3 py-1.5 font-medium border-2 border-slate-200 rounded-lg focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white",
        placeholder: t("word_sounds.distractor_placeholder") || "distractor"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "aria-label": t("word_sounds.preview_distractor_aria") || "Preview distractor",
        onClick: async (e) => {
          e.stopPropagation();
          const key = `${idx}-manip-d-${i}`;
          if (playingAudioKey) return;
          setPlayingAudioKey(key);
          try {
            await onPlayAudio(d);
          } finally {
            setPlayingAudioKey(null);
          }
        },
        className: "p-2 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-600 transition-colors motion-reduce:transition-none min-w-[32px] flex justify-center",
        title: t("word_sounds.preview_distractor_tooltip") || "Preview distractor"
      },
      playingAudioKey === `${idx}-manip-d-${i}` ? /* @__PURE__ */ React.createElement("div", { className: "animate-spin motion-reduce:animate-none h-4 w-4 border-2 border-current border-t-transparent rounded-full" }) : "\u{1F50A}"
    ))))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: async () => {
          if (onRegenerateManipulationTask) {
            const key = `${idx}-manip-regen`;
            setRegeneratingOptions((prev) => ({ ...prev, [key]: true }));
            try {
              await onRegenerateManipulationTask(idx);
            } finally {
              setRegeneratingOptions((prev) => {
                const n = { ...prev };
                delete n[key];
                return n;
              });
            }
          }
        },
        className: "w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 border-2 border-amber-300 rounded-lg text-sm font-bold transition-all motion-reduce:transition-none",
        title: t("word_sounds.regenerate_sound_swap_tooltip") || "Generate a fresh Sound Swap task for this word"
      },
      regeneratingOptions[`${idx}-manip-regen`] ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin motion-reduce:animate-none" }), " ", t("word_sounds.regenerating") || "Regenerating\u2026") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14 }), " ", t("word_sounds.regenerate_task") || "Regenerate Task")
    )) : /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-between gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-600 italic" }, t("word_sounds.no_sound_swap_yet") || "No Sound Swap task generated for this word yet."), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: async () => {
          if (onRegenerateManipulationTask) {
            const key = `${idx}-manip-regen`;
            setRegeneratingOptions((prev) => ({ ...prev, [key]: true }));
            try {
              await onRegenerateManipulationTask(idx);
            } finally {
              setRegeneratingOptions((prev) => {
                const n = { ...prev };
                delete n[key];
                return n;
              });
            }
          }
        },
        className: "flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold shadow"
      },
      regeneratingOptions[`${idx}-manip-regen`] ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin motion-reduce:animate-none" }), " ", t("word_sounds.generating") || "Generating\u2026") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Sparkles, { size: 14 }), " ", t("word_sounds.generate") || "Generate")
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block" }, t("word_sounds.sound_positions_label") || "Sound Positions (Find Sounds Activity)"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, (() => {
      const phonemesRaw = word.phonemes;
      const phonemeArray = Array.isArray(phonemesRaw) ? phonemesRaw : phonemesRaw?.phonemes && Array.isArray(phonemesRaw.phonemes) ? phonemesRaw.phonemes : [];
      return phonemeArray;
    })().map((phoneme, soundIdx) => {
      const ordinals = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];
      const ordinalLabel = ordinals[soundIdx] || `${soundIdx + 1}th`;
      return /* @__PURE__ */ React.createElement("div", { key: soundIdx, className: "flex items-center gap-1 bg-gradient-to-r from-violet-50 to-pink-50 border-2 border-violet-200 rounded-lg px-2 py-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-slate-600" }, ordinalLabel, ":"), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-violet-700 text-lg" }, phonemeLabel(phoneme)));
    }), (!word.phonemes || word.phonemes.length === 0) && /* @__PURE__ */ React.createElement("span", { className: "text-slate-600 text-sm italic" }, t("word_sounds.no_phonemes")))), /* @__PURE__ */ React.createElement("div", { className: "mt-4 pt-4 border-t border-slate-200" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2 block flex items-center gap-2" }, /* @__PURE__ */ React.createElement(ImageIcon, { size: 12 }), " ", t("word_sounds.word_image_label") || "Word Image"), /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex-shrink-0" }, word.image ? /* @__PURE__ */ React.createElement(
      "img",
      {
        loading: "lazy",
        src: word.image,
        alt: word.targetWord || word.word,
        className: "w-24 h-24 rounded-xl object-cover border-2 border-indigo-200 shadow-md"
      }
    ) : /* @__PURE__ */ React.createElement("div", { className: "w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-600 bg-slate-50" }, /* @__PURE__ */ React.createElement(ImageIcon, { size: 32 }))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 space-y-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "aria-label": t("common.refresh"),
        onClick: () => onGenerateImage && onGenerateImage(idx, word.targetWord || word.word),
        disabled: generatingImageIndex === idx,
        className: `w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-sm transition-all motion-reduce:transition-none ${word.image ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200 border border-indigo-200" : "bg-indigo-500 text-white hover:bg-indigo-600 shadow-md"}`
      },
      generatingImageIndex === idx ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin motion-reduce:animate-none" }), " ", t("word_sounds.generating_image") || "Generating...") : word.image ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14 }), " ", t("word_sounds.regenerate_image_button") || "Regenerate Image") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Sparkles, { size: 14 }), " ", t("word_sounds.generate_image_button") || "Generate Image")
    ), word.image && /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => onRefineImage && onRefineImage(idx, "Remove all text, labels, letters, and words from the image. Keep the illustration clean."),
        disabled: generatingImageIndex === idx,
        className: "w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition-all motion-reduce:transition-none"
      },
      /* @__PURE__ */ React.createElement(Ban, { size: 12 }),
      " ",
      t("word_sounds.remove_text_from_image") || "Remove Text from Image"
    ), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("common.e_g_make_it_cuter_add_a_banana"),
        type: "text",
        value: imageRefinementInputs[idx] || "",
        onChange: (e) => setImageRefinementInputs((prev) => ({ ...prev, [idx]: e.target.value })),
        placeholder: t("word_sounds.image_refine_placeholder") || "e.g., make it cuter, add a banana",
        className: "flex-1 text-xs border border-yellow-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-400",
        onKeyDown: (e) => e.key === "Enter" && onRefineImage && imageRefinementInputs[idx] && onRefineImage(idx, imageRefinementInputs[idx])
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "aria-label": t("common.refresh"),
        onClick: () => {
          if (onRefineImage && imageRefinementInputs[idx]) {
            onRefineImage(idx, imageRefinementInputs[idx]);
            setImageRefinementInputs((prev) => ({ ...prev, [idx]: "" }));
          }
        },
        disabled: !imageRefinementInputs[idx] || generatingImageIndex === idx,
        className: "px-3 py-1.5 bg-yellow-400 text-yellow-900 rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs transition-colors motion-reduce:transition-none"
      },
      generatingImageIndex === idx ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 12, className: "animate-spin motion-reduce:animate-none" }) : /* @__PURE__ */ React.createElement(Send, { size: 12 })
    )), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600 italic" }, t("word_sounds.nano_mode_hint") || '\u2728 Nano Mode: Type custom edits like "make it blue" or "add a hat"'))))))
  ))), /* @__PURE__ */ React.createElement("div", { className: "p-3 sm:p-4 border-t bg-slate-50 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 flex-shrink-0" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      ref: reviewBackRef,
      type: "button",
      "aria-label": t("word_sounds.back_to_setup") || "Back to Setup",
      onClick: requestBackToSetup,
      "data-help-key": "word_sounds_review_back",
      className: "w-full sm:w-auto min-h-11 px-4 py-2 text-slate-600 hover:text-slate-800 font-medium flex items-center justify-center gap-2 hover:bg-slate-100 rounded-lg transition-colors motion-reduce:transition-none"
    },
    /* @__PURE__ */ React.createElement(ChevronLeft, { size: 18, "aria-hidden": "true" }),
    t("word_sounds.back_to_setup") || "Back to Setup"
  ), /* @__PURE__ */ React.createElement("div", { className: "w-full sm:w-auto flex gap-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "aria-label": t("word_sounds.start_activity") || "Start Activity",
      onClick: onStartActivity,
      "data-help-key": "word_sounds_review_start",
      className: "w-full sm:w-auto min-h-11 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all motion-reduce:transition-none flex items-center justify-center gap-2"
    },
    /* @__PURE__ */ React.createElement(Play, { size: 18, "aria-hidden": "true" }),
    " ",
    t("word_sounds.start_activity") || "Start Activity"
  )))), showProbeEndConfirm && /* @__PURE__ */ React.createElement("div", { role: "presentation", className: "fixed inset-0 z-[220] bg-black/70 flex items-center justify-center p-4" }, /* @__PURE__ */ React.createElement("div", { ref: probeConfirmRef, role: "alertdialog", "aria-modal": "true", "aria-labelledby": "probe-end-title", "aria-describedby": "probe-end-message", tabIndex: -1, onKeyDown: (event) => {
    event.stopPropagation();
    trapReviewFocus(event, probeConfirmRef.current, () => setShowProbeEndConfirm(false));
  }, className: "w-full max-w-sm rounded-2xl border-2 border-amber-300 bg-white p-6 shadow-2xl" }, /* @__PURE__ */ React.createElement("h3", { id: "probe-end-title", className: "text-lg font-black text-slate-900" }, "End probe early?"), /* @__PURE__ */ React.createElement("p", { id: "probe-end-message", className: "mt-2 text-sm text-slate-700" }, "Current probe progress will be lost."), /* @__PURE__ */ React.createElement("div", { className: "mt-5 flex justify-end gap-2" }, /* @__PURE__ */ React.createElement("button", { ref: probeCancelRef, type: "button", onClick: () => setShowProbeEndConfirm(false), className: "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" }, "Continue probe"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
    setShowProbeEndConfirm(false);
    finishBackToSetup();
  }, className: "rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700" }, "End probe")))));
};
window.AlloModules = window.AlloModules || {};
window.AlloModules.AnimatedNumber = AnimatedNumber;
window.AlloModules.ClozeInput = ClozeInput;
window.AlloModules.WordSoundsReviewPanel = WordSoundsReviewPanel;
window.WordSoundsReviewPanel = WordSoundsReviewPanel;
console.log("[MiscComponentsModule] 3 components registered.");
window.AlloModules = window.AlloModules || {};
window.AlloModules.AnimatedNumber = (typeof AnimatedNumber !== 'undefined') ? AnimatedNumber : null;
window.AlloModules.ClozeInput = (typeof ClozeInput !== 'undefined') ? ClozeInput : null;
window.AlloModules.WordSoundsReviewPanel = (typeof WordSoundsReviewPanel !== 'undefined') ? WordSoundsReviewPanel : null;
window.WordSoundsReviewPanel = (typeof WordSoundsReviewPanel !== 'undefined') ? WordSoundsReviewPanel : null;
window.AlloModules.MiscComponents = true;  // satisfies loadModule('MiscComponents', ...) registration check
window.AlloModules.MiscComponentsModule = true;
console.log('[MiscComponentsModule] 3 components registered (incl. WordSoundsReviewPanel with Sound Swap)');
})();
