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
  useEffect(() => {
    if (disableAnimations) {
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
  }, [value, duration, disableAnimations]);
  return /* @__PURE__ */ React.createElement(React.Fragment, null, displayValue);
};
const ClozeInput = React.memo(({ targetWord, onCorrect, isSolved }) => {
  const { t } = useContext(LanguageContext);
  const [val, setVal] = useState(isSolved ? targetWord : "");
  const [status, setStatus] = useState(isSolved ? "success" : "neutral");
  useEffect(() => {
    if (isSolved) {
      setVal(targetWord);
      setStatus("success");
    } else {
      setVal("");
      setStatus("neutral");
    }
  }, [isSolved, targetWord]);
  const normalize = (str) => str ? str.toLowerCase().trim().replace(/[^a-z0-9]/g, "") : "";
  const handleDrop = (e) => {
    e.preventDefault();
    if (status === "success") return;
    const droppedText = e.dataTransfer.getData("text/plain");
    if (normalize(droppedText) === normalize(targetWord)) {
      setVal(targetWord);
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
    if (normalize(newVal) === normalize(targetWord)) {
      setStatus("success");
      if (onCorrect) onCorrect(targetWord);
    }
  };
  const width = Math.max(80, targetWord.length * 12) + "px";
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
                  text-center border-b-2 px-1 py-0.5 text-sm font-bold transition-all outline-none focus:ring-2 focus:ring-indigo-400 rounded-t
                  ${status === "success" ? "border-green-500 bg-green-50 text-green-800" : status === "error" ? "border-red-500 bg-red-50 animate-pulse" : status === "active" ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200" : "border-indigo-300 bg-white focus:border-indigo-500 focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-200"}
              `,
        style: { width },
        placeholder: "?",
        autoComplete: "off",
        "aria-label": t("games.fill_blank.input_label")
      }
    ),
    status === "success" && /* @__PURE__ */ React.createElement("span", { className: "absolute -top-2 -right-2 text-green-500 bg-white rounded-full shadow-sm animate-in zoom-in duration-300" }, /* @__PURE__ */ React.createElement(CheckCircle2, { size: 16, className: "fill-green-100" }))
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
  const [imageRefinementInputs, setImageRefinementInputs] = React.useState({});
  const [draggedPhoneme, setDraggedPhoneme] = React.useState(null);
  const [dragOverIndex, setDragOverIndex] = React.useState(null);
  const [playingWordIndex, setPlayingWordIndex] = React.useState(null);
  const [regeneratingOptions, setRegeneratingOptions] = React.useState({});
  const [playingAudioKey, setPlayingAudioKey] = React.useState(null);
  const [audioProgress, setAudioProgress] = React.useState({ ready: 0, total: 0 });
  React.useEffect(() => {
    if (!preloadedWords || preloadedWords.length === 0) return;
    const checkAudio = () => {
      setAudioProgress({
        ready: preloadedWords.filter((w) => w.ttsReady || w.phonemes).length,
        total: preloadedWords.length
      });
    };
    const interval = setInterval(checkAudio, 1e3);
    checkAudio();
    return () => clearInterval(interval);
  }, [preloadedWords]);
  const PHONEME_BANK = {
    "Consonants": ["b", "c", "d", "f", "g", "h", "j", "k", "l", "m", "n", "p", "r", "s", "t", "v", "w", "y", "z"],
    "Digraphs": ["sh", "zh", "ch", "th", "wh", "ph", "ck", "ng", "q"],
    "Vowels (Short)": ["a", "e", "i", "o", "u", "oo_short"],
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
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "p-6 border-b bg-gradient-to-r from-pink-500 to-violet-500 text-white flex-shrink-0" }, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-black flex items-center gap-2" }, "\u{1F4CB} Pre-Activity Review", /* @__PURE__ */ React.createElement("span", { className: "relative group ml-2" }, /* @__PURE__ */ React.createElement("span", { className: "cursor-help text-white/70 hover:text-white text-base" }, "\u2139\uFE0F"), /* @__PURE__ */ React.createElement("div", { className: "absolute left-0 top-8 w-72 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50 pointer-events-none" }, /* @__PURE__ */ React.createElement("strong", { className: "block mb-1" }, "\u{1F4D6} Phonics Counting Guide"), /* @__PURE__ */ React.createElement("p", { className: "mb-2" }, "R-controlled vowels (ar, er, ir, or, ur) are counted as ", /* @__PURE__ */ React.createElement("strong", null, "single sounds"), " because the vowel and R blend together."), /* @__PURE__ */ React.createElement("p", { className: "text-slate-600" }, 'Example: "star" = 3 sounds (s-t-ar), not 4. This aligns with Orton-Gillingham and Wilson Reading methods.')))), /* @__PURE__ */ React.createElement("p", { className: "text-sm opacity-80 mt-1 flex items-center gap-2 flex-wrap" }, /* @__PURE__ */ React.createElement("span", null, "Review and edit words \u2022 ", preloadedWords.length, " words ready"), isLoading && /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-xs animate-pulse" }, /* @__PURE__ */ React.createElement("div", { className: "w-2 h-2 bg-white rounded-full animate-bounce" }), " Generating more..."), !isLoading && preloadedWords.some((w) => w && w._ttsFailed) && /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-2 bg-red-500/30 border border-red-200/60 px-3 py-1 rounded-full text-xs" }, /* @__PURE__ */ React.createElement("span", null, "\u{1F507} Audio missing for ", preloadedWords.filter((w) => w && w._ttsFailed).length, " word", preloadedWords.filter((w) => w && w._ttsFailed).length === 1 ? "" : "s"), typeof onRetryFailedTTS === "function" && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: (e) => {
        e.stopPropagation();
        onRetryFailedTTS();
      },
      className: "px-2 py-0.5 bg-white/90 hover:bg-white text-red-600 font-bold rounded-full text-xs",
      title: "Retry audio generation for words that failed"
    },
    "Retry audio"
  )))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar" }, preloadedWords.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center py-12 text-slate-600" }, /* @__PURE__ */ React.createElement("div", { className: "text-4xl mb-2" }, "\u23F3"), isLoading ? /* @__PURE__ */ React.createElement("p", { className: "animate-pulse" }, "Generating new words... this may take a moment") : /* @__PURE__ */ React.createElement("p", null, "No words preloaded yet. Start the activity to generate words.")) : (preloadedWords || []).map((word, idx) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: word.id || `word-${word.targetWord || word.word}-${idx}`,
      className: `border-2 rounded-2xl transition-all ${expandedIndex === idx ? "border-pink-300 bg-pink-50/50" : "border-slate-100 hover:border-pink-200"}`
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "p-4 flex items-center justify-between cursor-pointer",
        onClick: () => setExpandedIndex(expandedIndex === idx ? null : idx)
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "relative z-50" }, /* @__PURE__ */ React.createElement(
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
              onRegenerateWord(idx);
            } else {
              warnLog("\u274C onRegenerateWord is not a function:", typeof onRegenerateWord);
              alert("Error: Regenerate function missing or invalid");
            }
          },
          disabled: regeneratingIndex === idx,
          className: `w-10 h-10 flex items-center justify-center rounded-full transition-colors text-base font-bold border-2
                                                    ${regeneratingIndex === idx ? "bg-orange-200 border-orange-400 animate-spin text-orange-700" : "bg-orange-50 border-orange-200 text-orange-500 hover:bg-orange-100 hover:border-orange-300 hover:scale-110 shadow-sm"}`,
          "data-help-key": "word_sounds_review_regen_word",
          title: t("common.regenerate_this_word"),
          style: { pointerEvents: "auto", cursor: "pointer" }
        },
        regeneratingIndex === idx ? "\u23F3" : "\u{1F504}"
      )), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-0.5" }, /* @__PURE__ */ React.createElement(
        "button",
        {
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
          onMouseDown: (e) => {
            e.stopPropagation();
            e.preventDefault();
            e.nativeEvent.stopImmediatePropagation();
            debugLog("\u{1F5D1}\uFE0F DELETE pressed for idx:", idx);
            if (typeof onDeleteWord === "function") {
              onDeleteWord(idx);
              debugLog("\u2705 Called onDeleteWord for idx:", idx);
            } else {
              warnLog("\u274C onDeleteWord is not a function");
            }
            return false;
          },
          onClick: (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
          },
          className: "w-8 h-8 flex items-center justify-center rounded-full bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors border-2 border-red-200 hover:border-red-400",
          style: { pointerEvents: "auto", cursor: "pointer", position: "relative", zIndex: 100 },
          "data-help-key": "word_sounds_review_delete_word",
          title: t("common.delete_word")
        },
        "\u{1F5D1}\uFE0F"
      )), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-mono text-slate-600 w-6" }, idx + 1, "."), /* @__PURE__ */ React.createElement(
        "button",
        {
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
          disabled: playingWordIndex !== null || !word.ttsReady,
          className: `w-10 h-10 rounded-full flex items-center justify-center transition-colors ${word._ttsFailed ? "bg-red-100 hover:bg-red-200 text-red-600 border-2 border-red-300" : playingWordIndex === idx ? "bg-pink-200 text-pink-700 animate-pulse" : playingWordIndex !== null ? "bg-pink-50 text-pink-300 cursor-not-allowed" : "bg-pink-100 hover:bg-pink-200 text-pink-600"}`,
          title: playingWordIndex === idx ? "Playing..." : word._ttsFailed ? "Audio failed to generate \u2014 click Retry audio in header" : !word.ttsReady ? "Loading audio..." : "Play word"
        },
        word._ttsFailed ? "\u{1F507}" : playingWordIndex === idx ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 18, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(Volume2, { size: 18 })
      ), word.phonemes && Array.isArray(word.phonemes) && word.phonemes.length > 0 && /* @__PURE__ */ React.createElement(
        "button",
        {
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
                await onPlayAudio(phoneme);
                await new Promise((r) => setTimeout(r, 900));
              }
            }
          },
          className: "w-10 h-10 bg-violet-100 hover:bg-violet-200 text-violet-600 rounded-full flex items-center justify-center transition-colors",
          "data-help-key": "word_sounds_review_play_phonemes",
          title: t("common.play_phoneme_sequence")
        },
        /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold" }, "\u{1F524}")
      ), /* @__PURE__ */ React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.currentTarget.click();
        }
      }, className: "relative group/img", onClick: (e) => e.stopPropagation() }, word.image && !word.imageFailed ? /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
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
          "aria-label": t("common.regenerate_image"),
          onClick: (e) => {
            e.stopPropagation();
            onGenerateImage && onGenerateImage(idx, word.targetWord || word.word);
          },
          disabled: generatingImageIndex === idx,
          className: "absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity border border-indigo-200",
          "data-help-key": "word_sounds_review_image_gen",
          title: t("common.regenerate_image")
        },
        generatingImageIndex === idx ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 10, className: "animate-spin text-indigo-500" }) : /* @__PURE__ */ React.createElement(RefreshCw, { size: 10, className: "text-indigo-500" })
      )) : /* @__PURE__ */ React.createElement(
        "button",
        {
          "aria-label": t("common.generate_image_for_this_word"),
          onClick: (e) => {
            e.stopPropagation();
            onGenerateImage && onGenerateImage(idx, word.targetWord || word.word);
          },
          disabled: generatingImageIndex === idx,
          className: `px-3 py-2 rounded-lg border-2 flex items-center gap-2 text-sm font-bold transition-all ${generatingImageIndex === idx ? "border-indigo-400 bg-indigo-100 text-indigo-600 animate-pulse" : "border-dashed border-indigo-300 text-indigo-500 hover:border-indigo-500 hover:bg-indigo-50 hover:scale-105"}`,
          "data-help-key": "word_sounds_review_image_gen",
          title: t("common.generate_image_for_this_word")
        },
        generatingImageIndex === idx ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 16, className: "animate-spin" }), " Generating...") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(ImageIcon, { size: 16 }), " + Image")
      )), /* @__PURE__ */ React.createElement("span", { className: "text-xl font-bold text-slate-800" }, word.targetWord || word.word), /* @__PURE__ */ React.createElement(
        "select",
        {
          "aria-label": t("common.selection"),
          value: word.difficulty || "medium",
          role: "dialog",
          "aria-modal": "true",
          onClick: (e) => e.stopPropagation(),
          onChange: (e) => onUpdateWord(idx, { ...word, difficulty: e.target.value }),
          className: `text-xs font-bold px-2 py-1 rounded-full border cursor-pointer appearance-none ${word.difficulty === "easy" ? "bg-green-100 text-green-700 border-green-300" : word.difficulty === "hard" ? "bg-red-100 text-red-700 border-red-300" : "bg-yellow-100 text-yellow-700 border-yellow-300"}`
        },
        /* @__PURE__ */ React.createElement("option", { value: "easy" }, "\u{1F7E2} Easy"),
        /* @__PURE__ */ React.createElement("option", { value: "medium" }, "\u{1F7E1} Medium"),
        /* @__PURE__ */ React.createElement("option", { value: "hard" }, "\u{1F534} Hard")
      ), /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full" }, word.phonemes?.length || 0, " sounds")),
      /* @__PURE__ */ React.createElement(ChevronDown, { size: 20, className: `text-slate-600 transition-transform ${expandedIndex === idx ? "rotate-180" : ""}` })
    ),
    expandedIndex === idx && /* @__PURE__ */ React.createElement("div", { className: "border-t border-slate-100 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-bold text-slate-600 uppercase tracking-wider" }, t("word_sounds.phonemes")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => onRegenerateWord && onRegenerateWord(idx),
        disabled: regeneratingIndex === idx,
        className: `text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 font-bold transition-colors ${regeneratingIndex === idx ? "bg-slate-100 text-slate-600" : "bg-violet-100 text-violet-600 hover:bg-violet-200"}`,
        title: "Re-check phonemes with Gemini"
      },
      regeneratingIndex === idx ? /* @__PURE__ */ React.createElement("div", { className: "animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" }) : "\u2728",
      "Check"
    ))), /* @__PURE__ */ React.createElement(
      "button",
      {
        "data-help-key": "word_sounds_review_phoneme_bank",
        onClick: () => setShowPhonemeBank(showPhonemeBank === idx ? null : idx),
        className: `text-xs px-2 py-1 rounded-full transition-colors ${showPhonemeBank === idx ? "bg-pink-700 text-white" : "bg-pink-100 text-pink-600 hover:bg-pink-200"}`
      },
      showPhonemeBank === idx ? "\u2715 Close Bank" : "+ Add Sound"
    )), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: `flex flex-wrap gap-2 mb-2 min-h-[40px] p-2 rounded-lg border-2 border-dashed transition-colors ${draggedPhoneme ? "border-pink-300 bg-pink-50" : "border-transparent"}`,
        onDragOver: (e) => e.preventDefault(),
        onDrop: (e) => handleDrop(e, idx)
      },
      (Array.isArray(word.phonemes) ? word.phonemes : []).map((p, i) => /* @__PURE__ */ React.createElement(
        "div",
        {
          key: i,
          className: `group relative cursor-grab active:cursor-grabbing ${dragOverIndex === i ? "ring-2 ring-pink-400" : ""}`,
          draggable: true,
          onDragStart: (e) => handleDragStart(e, p, "word", idx, i),
          onDragOver: (e) => handleDragOver(e, i),
          onDrop: (e) => {
            e.stopPropagation();
            handleDrop(e, idx, i);
          },
          onDragEnd: handleDragEnd
        },
        /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-pink-100 to-violet-100 text-violet-700 font-bold rounded-lg border-2 border-violet-200", title: typeof p === "string" && typeof PHONEME_GUIDE !== "undefined" && PHONEME_GUIDE[p] ? `${PHONEME_GUIDE[p].label} (${PHONEME_GUIDE[p].ipa}) \u2014 ${PHONEME_GUIDE[p].examples}` : typeof p === "string" ? p : "" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-600 text-xs mr-1" }, "\u283F"), p, /* @__PURE__ */ React.createElement(
          "button",
          {
            "aria-label": t("common.remove"),
            onClick: () => removePhoneme(idx, i),
            className: "w-4 h-4 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-xs opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity",
            title: t("common.remove")
          },
          "\xD7"
        ))
      )),
      (() => {
        const p = word.phonemes;
        const a = Array.isArray(p) ? p : p?.phonemes && Array.isArray(p.phonemes) ? p.phonemes : [];
        return a.length === 0;
      })() && /* @__PURE__ */ React.createElement("span", { className: "text-slate-600 text-sm italic" }, 'No phonemes - click "Add Sound" to build')
    ), showPhonemeBank === idx && /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 border-2 border-slate-200 rounded-xl p-3 mt-2 animate-in slide-in-from-top-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-600 italic" }, "\u{1F4A1} Hover any sound for teaching tips")), Object.entries(PHONEME_BANK).map(([category, phonemes]) => /* @__PURE__ */ React.createElement("div", { key: category, className: "mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-slate-600 uppercase mb-1", title: category === "Consonants" ? "Single consonant sounds \u2014 pair voiced (b,d,g) with unvoiced (p,t,k)" : category === "Vowels (Short)" ? "Quick vowel sounds \u2014 cat, pet, sit, hot, cup, book" : category === "Vowels (Long)" ? "Longer vowel sounds \u2014 see, moon, cue, saw + vowel teams ai, ea, oa" : category === "Digraphs" ? "Two letters that make ONE sound \u2014 sh, ch, th, wh, ng" : category === "R-Controlled" ? "Bossy R changes the vowel sound \u2014 ar, er, ir, or, ur, air, ear" : category === "Diphthongs" ? "Vowel sounds that glide \u2014 ay (day), ie (tie), ow (cow), oy (boy)" : category }, category), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1" }, (Array.isArray(phonemes) ? phonemes : []).map((p) => /* @__PURE__ */ React.createElement("div", { key: p, className: "inline-flex rounded overflow-hidden border border-slate-400 hover:border-pink-400 transition-colors" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => onPlayAudio && onPlayAudio(p),
        className: "px-1.5 py-1 bg-slate-100 hover:bg-pink-200 text-slate-600 hover:text-pink-600 transition-colors border-r border-slate-300",
        title: typeof PHONEME_GUIDE !== "undefined" && PHONEME_GUIDE[p] ? `\u{1F50A} ${PHONEME_GUIDE[p].label} (${PHONEME_GUIDE[p].ipa}) \u2014 ${PHONEME_GUIDE[p].examples}` : `Play sound: ${p}`
      },
      "\u{1F50A}"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => addPhoneme(idx, p),
        draggable: true,
        onDragStart: (e) => handleDragStart(e, p, "bank"),
        onDragEnd: handleDragEnd,
        className: "px-2 py-1 bg-white hover:bg-pink-100 text-sm font-mono transition-colors cursor-grab active:cursor-grabbing",
        title: typeof PHONEME_GUIDE !== "undefined" && PHONEME_GUIDE[p] ? `${PHONEME_GUIDE[p].label}: ${PHONEME_GUIDE[p].tip}${PHONEME_GUIDE[p].confusesWith?.length ? "\n\u26A0\uFE0F Often confused with: " + PHONEME_GUIDE[p].confusesWith.join(", ") : ""}` : `Click or drag to add "${p}"`
      },
      p === "oo_short" ? "\u014F\u014F" : p
    )))))))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-bold text-orange-500 uppercase tracking-wider mb-2 block" }, t("word_sounds.rhyme_options")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, /* @__PURE__ */ React.createElement(
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
        "aria-label": t("common.play_tts"),
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
        className: "p-2 rounded-lg bg-slate-100 hover:bg-orange-100 text-slate-600 hover:text-orange-600 transition-colors min-w-[32px] flex justify-center",
        "data-help-key": "word_sounds_review_play_distractor",
        title: t("common.play_tts")
      },
      playingAudioKey === `${idx}-rhyme-${i}` ? /* @__PURE__ */ React.createElement("div", { className: "animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" }) : "\u{1F50A}"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": "Refresh audio",
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
        className: `${regeneratingOptions[`${idx}-rhyme-${i}`] ? "w-auto px-2 gap-1 bg-orange-200 text-orange-800" : "w-8 bg-orange-50 hover:bg-orange-100 text-orange-400 hover:text-orange-600"} h-8 rounded-lg transition-colors flex items-center justify-center text-xs font-bold`,
        title: "Refresh audio (re-synthesize TTS for this word)"
      },
      regeneratingOptions[`${idx}-rhyme-${i}`] ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin" }), /* @__PURE__ */ React.createElement("span", null, "Refreshing\u2026")) : "\u{1F504}"
    ))), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          const newDist = [...word.rhymeDistractors || [], ""];
          onUpdateWord(idx, { ...word, rhymeDistractors: newDist });
        },
        className: "px-3 py-1.5 bg-orange-100 text-orange-600 rounded-lg border-2 border-dashed border-orange-300 hover:bg-orange-200 text-sm font-bold"
      },
      "+ Add"
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
        "aria-label": t("common.play_tts"),
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
        className: "p-2 rounded-lg bg-slate-100 hover:bg-violet-100 text-slate-600 hover:text-violet-600 transition-colors min-w-[32px] flex justify-center",
        "data-help-key": "word_sounds_review_play_distractor",
        title: t("common.play_tts")
      },
      playingAudioKey === `${idx}-blend-${i}` ? /* @__PURE__ */ React.createElement("div", { className: "animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" }) : "\u{1F50A}"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": "Refresh audio",
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
        className: `${regeneratingOptions[`${idx}-blend-${i}`] ? "w-auto px-2 gap-1 bg-violet-200 text-violet-800" : "w-8 bg-violet-50 hover:bg-violet-100 text-violet-400 hover:text-violet-600"} h-8 rounded-lg transition-colors flex items-center justify-center text-xs font-bold`,
        title: "Refresh audio (re-synthesize TTS for this word)"
      },
      regeneratingOptions[`${idx}-blend-${i}`] ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin" }), /* @__PURE__ */ React.createElement("span", null, "Refreshing\u2026")) : "\u{1F504}"
    ))), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          const newDist = [...word.blendingDistractors || [], ""];
          onUpdateWord(idx, { ...word, blendingDistractors: newDist });
        },
        className: "px-3 py-1.5 bg-violet-100 text-violet-600 rounded-lg border-2 border-dashed border-violet-300 hover:bg-violet-200 text-sm font-bold"
      },
      "+ Add"
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-bold text-amber-600 uppercase tracking-wider block" }, "Sound Swap (Manipulation Activity)"), word.manipulationTask?.type && /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300" }, word.manipulationTask.type)), word.manipulationTask ? /* @__PURE__ */ React.createElement("div", { className: "space-y-2 p-3 bg-amber-50 border-2 border-amber-200 rounded-lg" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1" }, "Instruction (spoken to student)"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": "Sound Swap instruction",
        value: word.manipulationTask.instruction || "",
        onChange: (e) => onUpdateWord(idx, { ...word, manipulationTask: { ...word.manipulationTask, instruction: e.target.value } }),
        className: "flex-1 px-3 py-1.5 text-sm font-medium border-2 border-amber-200 rounded-lg focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white",
        placeholder: "Say 'word'. Now say it again, but leave out the /x/ sound."
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": "Preview instruction TTS",
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
        className: "p-2 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-600 transition-colors min-w-[32px] flex justify-center",
        title: "Preview instruction"
      },
      playingAudioKey === `${idx}-manip-instruction` ? /* @__PURE__ */ React.createElement("div", { className: "animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" }) : "\u{1F50A}"
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1" }, "Answer (correct) + Distractors"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": "Correct answer",
        value: word.manipulationTask.answer || "",
        onChange: (e) => onUpdateWord(idx, { ...word, manipulationTask: { ...word.manipulationTask, answer: e.target.value } }),
        className: "px-3 py-1.5 font-bold border-2 border-green-300 bg-green-50 rounded-lg focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-300",
        placeholder: "answer"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": "Preview answer",
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
        className: "p-2 rounded-lg bg-slate-100 hover:bg-green-100 text-slate-600 hover:text-green-600 transition-colors min-w-[32px] flex justify-center",
        title: "Preview answer"
      },
      playingAudioKey === `${idx}-manip-answer` ? /* @__PURE__ */ React.createElement("div", { className: "animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" }) : "\u{1F50A}"
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
        placeholder: "distractor"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": "Preview distractor",
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
        className: "p-2 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-600 transition-colors min-w-[32px] flex justify-center",
        title: "Preview distractor"
      },
      playingAudioKey === `${idx}-manip-d-${i}` ? /* @__PURE__ */ React.createElement("div", { className: "animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" }) : "\u{1F50A}"
    ))))), /* @__PURE__ */ React.createElement(
      "button",
      {
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
        className: "w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 border-2 border-amber-300 rounded-lg text-sm font-bold transition-all",
        title: "Generate a fresh Sound Swap task for this word"
      },
      regeneratingOptions[`${idx}-manip-regen`] ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin" }), " Regenerating\u2026") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14 }), " Regenerate Task")
    )) : /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-between gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm text-slate-600 italic" }, "No Sound Swap task generated for this word yet."), /* @__PURE__ */ React.createElement(
      "button",
      {
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
      regeneratingOptions[`${idx}-manip-regen`] ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin" }), " Generating\u2026") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Sparkles, { size: 14 }), " Generate")
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block" }, "Sound Positions (Find Sounds Activity)"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, (() => {
      const phonemesRaw = word.phonemes;
      const phonemeArray = Array.isArray(phonemesRaw) ? phonemesRaw : phonemesRaw?.phonemes && Array.isArray(phonemesRaw.phonemes) ? phonemesRaw.phonemes : [];
      return phonemeArray;
    })().map((phoneme, soundIdx) => {
      const ordinals = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];
      const ordinalLabel = ordinals[soundIdx] || `${soundIdx + 1}th`;
      return /* @__PURE__ */ React.createElement("div", { key: soundIdx, className: "flex items-center gap-1 bg-gradient-to-r from-violet-50 to-pink-50 border-2 border-violet-200 rounded-lg px-2 py-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-slate-600" }, ordinalLabel, ":"), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-violet-700 text-lg" }, phoneme));
    }), (!word.phonemes || word.phonemes.length === 0) && /* @__PURE__ */ React.createElement("span", { className: "text-slate-600 text-sm italic" }, t("word_sounds.no_phonemes")))), /* @__PURE__ */ React.createElement("div", { className: "mt-4 pt-4 border-t border-slate-200" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2 block flex items-center gap-2" }, /* @__PURE__ */ React.createElement(ImageIcon, { size: 12 }), " Word Image"), /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex-shrink-0" }, word.image ? /* @__PURE__ */ React.createElement(
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
        "aria-label": t("common.refresh"),
        onClick: () => onGenerateImage && onGenerateImage(idx, word.targetWord || word.word),
        disabled: generatingImageIndex === idx,
        className: `w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-sm transition-all ${word.image ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200 border border-indigo-200" : "bg-indigo-500 text-white hover:bg-indigo-600 shadow-md"}`
      },
      generatingImageIndex === idx ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin" }), " Generating...") : word.image ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14 }), " Regenerate Image") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Sparkles, { size: 14 }), " Generate Image")
    ), word.image && /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => onRefineImage && onRefineImage(idx, "Remove all text, labels, letters, and words from the image. Keep the illustration clean."),
        disabled: generatingImageIndex === idx,
        className: "w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition-all"
      },
      /* @__PURE__ */ React.createElement(Ban, { size: 12 }),
      " Remove Text from Image"
    ), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("common.e_g_make_it_cuter_add_a_banana"),
        type: "text",
        value: imageRefinementInputs[idx] || "",
        onChange: (e) => setImageRefinementInputs((prev) => ({ ...prev, [idx]: e.target.value })),
        placeholder: "e.g., make it cuter, add a banana",
        className: "flex-1 text-xs border border-yellow-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-400",
        onKeyDown: (e) => e.key === "Enter" && onRefineImage && imageRefinementInputs[idx] && onRefineImage(idx, imageRefinementInputs[idx])
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": t("common.refresh"),
        onClick: () => {
          if (onRefineImage && imageRefinementInputs[idx]) {
            onRefineImage(idx, imageRefinementInputs[idx]);
            setImageRefinementInputs((prev) => ({ ...prev, [idx]: "" }));
          }
        },
        disabled: !imageRefinementInputs[idx] || generatingImageIndex === idx,
        className: "px-3 py-1.5 bg-yellow-400 text-yellow-900 rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs transition-colors"
      },
      generatingImageIndex === idx ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 12, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(Send, { size: 12 })
    )), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600 italic" }, '\u2728 Nano Mode: Type custom edits like "make it blue" or "add a hat"'))))))
  ))), /* @__PURE__ */ React.createElement("div", { className: "p-4 border-t bg-slate-50 flex justify-between items-center flex-shrink-0" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.previous"),
      onClick: () => {
        if (isProbeMode && !window.confirm("End probe early? Progress will be lost.")) return;
        (onBackToSetup || onClose)?.();
      },
      "data-help-key": "word_sounds_review_back",
      className: "px-4 py-2 text-slate-600 hover:text-slate-800 font-medium flex items-center gap-2 hover:bg-slate-100 rounded-lg transition-colors"
    },
    /* @__PURE__ */ React.createElement(ChevronLeft, { size: 18 }),
    "Back to Setup"
  ), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.play"),
      onClick: onStartActivity,
      "data-help-key": "word_sounds_review_start",
      className: "px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
    },
    /* @__PURE__ */ React.createElement(Play, { size: 18 }),
    " Start Activity"
  )))));
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
