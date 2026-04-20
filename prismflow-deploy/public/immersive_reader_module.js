(function() {
'use strict';
  // WCAG 2.1 AA: Accessibility CSS
  if (!document.getElementById("immersive-reader-module-a11y")) { var _s = document.createElement("style"); _s.id = "immersive-reader-module-a11y"; _s.textContent = "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } } .text-slate-600 { color: #64748b !important; }"; document.head.appendChild(_s); }
if (window.AlloModules && window.AlloModules.ImmersiveReaderModule) { console.log('[CDN] ImmersiveReaderModule already loaded, skipping'); return; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// immersive_reader_source.jsx — SpeedReaderOverlay, ImmersiveToolbar
// Extracted from AlloFlowANTI.txt for CDN modularization

var LanguageContext = window.AlloLanguageContext;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useContext = React.useContext;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
var ArrowLeft = _lazyIcon('ArrowLeft');
var ArrowRight = _lazyIcon('ArrowRight');
var BookOpen = _lazyIcon('BookOpen');
var ChevronLeft = _lazyIcon('ChevronLeft');
var ChevronRight = _lazyIcon('ChevronRight');
var List = _lazyIcon('List');
var Pause = _lazyIcon('Pause');
var Play = _lazyIcon('Play');
var Settings2 = _lazyIcon('Settings2');
var Volume2 = _lazyIcon('Volume2');
var X = _lazyIcon('X');
var Zap = _lazyIcon('Zap');
var LanguageContext = window.AlloLanguageContext;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useContext = React.useContext;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var _lazyIcon = function(name) {
  return function(props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
var ArrowLeft = _lazyIcon("ArrowLeft");
var ArrowRight = _lazyIcon("ArrowRight");
var BookOpen = _lazyIcon("BookOpen");
var ChevronLeft = _lazyIcon("ChevronLeft");
var ChevronRight = _lazyIcon("ChevronRight");
var List = _lazyIcon("List");
var Pause = _lazyIcon("Pause");
var Play = _lazyIcon("Play");
var Settings2 = _lazyIcon("Settings2");
var Volume2 = _lazyIcon("Volume2");
var X = _lazyIcon("X");
var Zap = _lazyIcon("Zap");
const SpeedReaderOverlay = React.memo(({ text, onClose, isOpen }) => {
  const { t } = useContext(LanguageContext);
  const [words, setWords] = React.useState([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [wpm, setWpm] = React.useState(300);
  const [showControls, setShowControls] = React.useState(true);
  const [focusColor, setFocusColor] = React.useState("#dc2626");
  const colorOptions = [
    { name: "Red", value: "#dc2626" },
    { name: "Blue", value: "#2563eb" },
    { name: "Green", value: "#16a34a" },
    { name: "Purple", value: "#9333ea" },
    { name: "Orange", value: "#ea580c" },
    { name: "Pink", value: "#db2777" },
    { name: "Teal", value: "#0d9488" }
  ];
  React.useEffect(() => {
    if (text) {
      const cleaned = String(text || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      const w = cleaned.split(" ").filter((word) => word.length > 0);
      setWords(w);
      setCurrentIndex(0);
    }
  }, [text]);
  React.useEffect(() => {
    if (!isPlaying) return;
    const delay = 6e4 / wpm;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= words.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, delay);
    return () => clearInterval(interval);
  }, [isPlaying, wpm, words.length]);
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === "ArrowLeft") {
        setCurrentIndex((p) => Math.max(0, p - 1));
      } else if (e.code === "ArrowRight") {
        setCurrentIndex((p) => Math.min(words.length - 1, p + 1));
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, words.length]);
  if (!isOpen) return null;
  const currentWord = words[currentIndex] || "";
  const centerIdx = Math.floor(currentWord.length / 2);
  const pre = currentWord.slice(0, centerIdx);
  const mid = currentWord.charAt(centerIdx);
  const post = currentWord.slice(centerIdx + 1);
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[300] bg-white text-slate-900 flex flex-col animate-in fade-in duration-200" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `p-4 flex justify-between items-center transition-opacity duration-300 ${showControls || !isPlaying ? "opacity-100" : "opacity-0 hover:opacity-100 focus-within:opacity-100"}`
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "p-2 hover:bg-slate-100 rounded-full text-slate-600" }, /* @__PURE__ */ React.createElement(ArrowLeft, { size: 24 })), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-lg" }, t("adventure.focus_reader")), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-600" }, currentIndex + 1, " / ", words.length))),
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-slate-600" }, "COLOR"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1" }, colorOptions.map((c) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: c.value,
        onClick: () => setFocusColor(c.value),
        className: `w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${focusColor === c.value ? "border-slate-800 scale-110" : "border-transparent"}`,
        style: { backgroundColor: c.value },
        title: c.name
      }
    )))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-slate-600" }, "SPEED"), /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("common.speed"),
        type: "range",
        min: "100",
        max: "800",
        step: "50",
        value: wpm,
        onChange: (e) => setWpm(Number(e.target.value)),
        className: "w-32 accent-indigo-600"
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "font-mono font-bold w-12 text-right" }, wpm)))
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "flex-1 flex flex-col items-center justify-center cursor-pointer",
      onClick: () => setIsPlaying((p) => !p)
    },
    /* @__PURE__ */ React.createElement("div", { className: "relative text-7xl md:text-9xl font-mono font-bold tracking-wide select-none" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-baseline" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-800" }, pre), /* @__PURE__ */ React.createElement("span", { style: { color: focusColor } }, mid), /* @__PURE__ */ React.createElement("span", { className: "text-slate-800" }, post)), /* @__PURE__ */ React.createElement("div", { className: "absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-100 -translate-x-1/2 -z-10 h-full" }), /* @__PURE__ */ React.createElement("div", { className: "absolute left-0 right-0 top-1/2 h-0.5 bg-slate-100 -translate-y-1/2 -z-10 w-full" })),
    /* @__PURE__ */ React.createElement("div", { className: "mt-12 text-slate-600 animate-pulse text-sm" }, isPlaying ? /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Pause, { size: 16 }), " Tap to Pause") : /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Play, { size: 16 }), " Tap or Space to Play"))
  ), /* @__PURE__ */ React.createElement("div", { className: "h-2 bg-slate-100 w-full" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "h-full bg-indigo-600 transition-all duration-100 ease-linear",
      style: { width: `${(currentIndex + 1) / words.length * 100}%` }
    }
  )));
});
const ImmersiveToolbar = React.memo(({ settings, setSettings, onClose, playbackRate, setPlaybackRate, lineHeight, setLineHeight, letterSpacing, setLetterSpacing, isSpeedReaderActive, onToggleSpeedReader, isChunkReaderActive, onToggleChunkReader, chunkReaderIdx, setChunkReaderIdx, chunkReaderAutoPlay, setChunkReaderAutoPlay, chunkReaderSpeed, setChunkReaderSpeed, totalSentences, interactionMode, setInteractionMode, isBionicReaderActive, onToggleBionicReader, isCrawlReaderActive, onToggleCrawlReader, isKaraokeOverlayActive, onToggleKaraokeOverlay, chunkReaderReadAlong, onToggleChunkReaderReadAlong, onGeneratePOS, isGeneratingPOS, posReady, onGenerateSyllables, isGeneratingSyllables, syllablesReady }) => {
  const { t } = useContext(LanguageContext);
  const toggleSetting = useCallback((key) => setSettings((prev) => ({ ...prev, [key]: !prev[key] })), [setSettings]);
  const handlePosToggle = useCallback((settingKey) => {
    if (!posReady && onGeneratePOS && !isGeneratingPOS) {
      try {
        onGeneratePOS();
      } catch (err) {
        console.warn("[Immersive] POS gen failed:", err);
      }
    }
    toggleSetting(settingKey);
  }, [posReady, onGeneratePOS, isGeneratingPOS, toggleSetting]);
  const handleSyllableToggle = useCallback(() => {
    const gen = onGenerateSyllables || onGeneratePOS;
    const ready = syllablesReady || posReady;
    const busy = isGeneratingSyllables || isGeneratingPOS;
    if (!ready && gen && !busy) {
      try {
        gen();
      } catch (err) {
        console.warn("[Immersive] Syllable gen failed:", err);
      }
    }
    toggleSetting("showSyllables");
  }, [onGenerateSyllables, onGeneratePOS, syllablesReady, posReady, isGeneratingSyllables, isGeneratingPOS, toggleSetting]);
  const ToggleButton = React.memo(({ active, onClick, settingKey, title, children, activeColor = "bg-indigo-600 text-white", ...props }) => /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: settingKey ? () => toggleSetting(settingKey) : onClick,
      title,
      className: `px-2.5 py-1 text-xs font-bold rounded-full transition-all disabled:opacity-60 disabled:cursor-wait ${active ? activeColor : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`,
      ...props
    },
    children
  ));
  return /* @__PURE__ */ React.createElement("div", { className: "sticky top-0 z-[60] p-4 bg-white/95 backdrop-blur-sm border-b border-slate-200 flex justify-between items-center shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 overflow-x-auto no-scrollbar" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2 shrink-0" }, /* @__PURE__ */ React.createElement(Settings2, { size: 14 }), " ", t("immersive.title")), /* @__PURE__ */ React.createElement("div", { className: "h-4 w-px bg-slate-300 shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 shrink-0" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-bold text-slate-700" }, t("immersive.text_size")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600" }, "A"), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.adjust_settings"),
      type: "range",
      min: "12",
      max: "48",
      value: settings.textSize,
      onChange: (e) => setSettings((prev) => ({ ...prev, textSize: parseInt(e.target.value) })),
      className: "w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600",
      title: t("immersive.text_size")
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold text-slate-700" }, "A"))), /* @__PURE__ */ React.createElement("div", { className: "h-4 w-px bg-slate-300 shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 shrink-0" }, /* @__PURE__ */ React.createElement(
    ToggleButton,
    {
      active: settings.wideText,
      settingKey: "wideText",
      title: t("immersive.toggle_spacing"),
      "data-help-key": "immersive_wide_text"
    },
    t("immersive.wide_text")
  ), /* @__PURE__ */ React.createElement(
    ToggleButton,
    {
      active: settings.showSyllables,
      onClick: handleSyllableToggle,
      title: isGeneratingSyllables || isGeneratingPOS && !syllablesReady ? "Generating syllable markers\u2026" : t("immersive.toggle_syllables"),
      "data-help-key": "immersive_syllables",
      disabled: (isGeneratingSyllables || isGeneratingPOS && !syllablesReady && !posReady) && !settings.showSyllables
    },
    t("immersive.syllables"),
    (isGeneratingSyllables || isGeneratingPOS && !syllablesReady && !posReady) && settings.showSyllables ? " \u2026" : ""
  ), /* @__PURE__ */ React.createElement(
    ToggleButton,
    {
      active: settings.lineFocus,
      settingKey: "lineFocus",
      title: t("immersive.toggle_line_focus"),
      "data-help-key": "immersive_line_focus"
    },
    t("immersive.line_focus")
  ), /* @__PURE__ */ React.createElement(
    ToggleButton,
    {
      active: isSpeedReaderActive,
      onClick: onToggleSpeedReader,
      title: t("common.lightning_speed_read_rsvp"),
      activeColor: "bg-sky-500 text-white"
    },
    /* @__PURE__ */ React.createElement(Zap, { size: 14, className: "mr-1 inline" }),
    " Speed Read"
  ), /* @__PURE__ */ React.createElement(
    ToggleButton,
    {
      active: isChunkReaderActive,
      onClick: onToggleChunkReader,
      title: t("immersive.chunk_read") || "Chunk Read",
      activeColor: "bg-emerald-700 text-white",
      "data-help-key": "immersive_chunk_reader"
    },
    /* @__PURE__ */ React.createElement(List, { size: 14, className: "mr-1 inline" }),
    " ",
    t("immersive.chunk_read") || "Chunk Read"
  ), onToggleBionicReader && /* @__PURE__ */ React.createElement(
    ToggleButton,
    {
      active: !!isBionicReaderActive,
      onClick: onToggleBionicReader,
      title: t("immersive.chunk_stream") || "Chunk Stream \u2014 bold-assist chunked reading",
      activeColor: "bg-indigo-600 text-white",
      "data-help-key": "immersive_bionic_reader"
    },
    /* @__PURE__ */ React.createElement(BookOpen, { size: 14, className: "mr-1 inline" }),
    " ",
    t("immersive.chunk_stream") || "Chunk Stream"
  ), onToggleCrawlReader && /* @__PURE__ */ React.createElement(
    ToggleButton,
    {
      active: !!isCrawlReaderActive,
      onClick: onToggleCrawlReader,
      title: t("immersive.cinematic_crawl") || "Cinematic Crawl \u2014 receding-perspective scroll",
      activeColor: "bg-amber-500 text-slate-900",
      "data-help-key": "immersive_perspective_crawl"
    },
    /* @__PURE__ */ React.createElement(Zap, { size: 14, className: "mr-1 inline" }),
    " ",
    t("immersive.cinematic_crawl") || "Crawl"
  ), onToggleKaraokeOverlay && /* @__PURE__ */ React.createElement(
    ToggleButton,
    {
      active: !!isKaraokeOverlayActive,
      onClick: onToggleKaraokeOverlay,
      title: t("immersive.focus_reader_title") || "Focus Reader \u2014 full-screen read-along with sentence-sweep visuals",
      activeColor: "bg-fuchsia-600 text-white",
      "data-help-key": "immersive_karaoke_overlay",
      "aria-pressed": !!isKaraokeOverlayActive
    },
    /* @__PURE__ */ React.createElement(Volume2, { size: 14, className: "mr-1 inline" }),
    " ",
    t("immersive.focus_reader") || "Focus Reader"
  )), setInteractionMode && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "h-4 w-px bg-slate-300 shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 shrink-0 bg-slate-100 rounded-full p-0.5", role: "group", "aria-label": t("immersive.tap_mode") || "Tap action" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider px-2" }, t("immersive.tap_mode") || "Tap"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setInteractionMode("read"),
      "aria-pressed": interactionMode !== "define" && interactionMode !== "phonics",
      title: t("immersive.tap_speak") || "Tap a word to hear it",
      className: `inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full transition-colors ${interactionMode !== "define" && interactionMode !== "phonics" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-800"}`
    },
    /* @__PURE__ */ React.createElement(Volume2, { size: 12 }),
    " ",
    t("immersive.speak") || "Speak"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setInteractionMode("define"),
      "aria-pressed": interactionMode === "define",
      title: t("immersive.tap_define") || "Tap a word to see its definition and picture",
      className: `inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full transition-colors ${interactionMode === "define" ? "bg-yellow-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-800"}`
    },
    /* @__PURE__ */ React.createElement(BookOpen, { size: 12 }),
    " ",
    t("immersive.define") || "Define"
  ))), isChunkReaderActive && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "h-4 w-px bg-slate-300 shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 shrink-0" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setChunkReaderIdx(Math.max(0, chunkReaderIdx - 1)), disabled: chunkReaderIdx <= 0, className: "p-1 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-all", title: t("common.previous") }, /* @__PURE__ */ React.createElement(ChevronLeft, { size: 14 })), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-slate-600 tabular-nums min-w-[3rem] text-center" }, chunkReaderIdx + 1, " / ", totalSentences), /* @__PURE__ */ React.createElement("button", { onClick: () => setChunkReaderIdx(Math.min(totalSentences - 1, chunkReaderIdx + 1)), disabled: chunkReaderIdx >= totalSentences - 1, className: "p-1 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-all", title: t("common.next") }, /* @__PURE__ */ React.createElement(ChevronRight, { size: 14 })), /* @__PURE__ */ React.createElement("div", { className: "h-4 w-px bg-slate-200" }), /* @__PURE__ */ React.createElement("button", { onClick: () => setChunkReaderAutoPlay(!chunkReaderAutoPlay), className: `px-2 py-1 text-xs font-bold rounded-full transition-all ${chunkReaderAutoPlay ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`, title: chunkReaderAutoPlay ? t("common.pause") : t("common.auto_play") || "Auto" }, chunkReaderAutoPlay ? /* @__PURE__ */ React.createElement(Pause, { size: 12, className: "inline" }) : /* @__PURE__ */ React.createElement(Play, { size: 12, className: "inline" })), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600" }, "1s"), /* @__PURE__ */ React.createElement("input", { type: "range", min: "1000", max: "8000", step: "500", value: chunkReaderSpeed, onChange: (e) => setChunkReaderSpeed(parseInt(e.target.value)), disabled: !!chunkReaderReadAlong, className: `w-14 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 ${chunkReaderReadAlong ? "opacity-30" : ""}`, title: chunkReaderReadAlong ? "Disabled while Read Along is on \u2014 audio length drives the pace" : `${(chunkReaderSpeed / 1e3).toFixed(1)}s`, "aria-label": t("immersive.speed") }), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600 tabular-nums" }, (chunkReaderSpeed / 1e3).toFixed(1), "s")), onToggleChunkReaderReadAlong && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "h-4 w-px bg-slate-200" }), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onToggleChunkReaderReadAlong,
      "aria-pressed": !!chunkReaderReadAlong,
      title: chunkReaderReadAlong ? "Read-along OFF: return to timer-based advance" : "Read-along ON: play each sentence with a colored gradient that sweeps across the text in sync with the audio",
      className: `inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full transition-all ${chunkReaderReadAlong ? "bg-fuchsia-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`,
      "data-help-key": "immersive_chunk_read_along"
    },
    /* @__PURE__ */ React.createElement(Volume2, { size: 12, className: "inline" }),
    " ",
    t("immersive.read_along") || "Read Along"
  )))), /* @__PURE__ */ React.createElement("div", { className: "h-4 w-px bg-slate-300 shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 shrink-0" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-slate-600" }, t("immersive.grammar_label")), /* @__PURE__ */ React.createElement(
    ToggleButton,
    {
      active: settings.showNouns,
      onClick: () => handlePosToggle("showNouns"),
      title: isGeneratingPOS ? "Classifying parts of speech\u2026" : t("immersive.highlight_nouns"),
      activeColor: "bg-blue-700 text-white",
      disabled: isGeneratingPOS && !posReady && !settings.showNouns
    },
    t("immersive.nouns"),
    isGeneratingPOS && settings.showNouns ? " \u2026" : ""
  ), /* @__PURE__ */ React.createElement(
    ToggleButton,
    {
      active: settings.showVerbs,
      onClick: () => handlePosToggle("showVerbs"),
      title: isGeneratingPOS ? "Classifying parts of speech\u2026" : t("immersive.highlight_verbs"),
      activeColor: "bg-red-500 text-white",
      disabled: isGeneratingPOS && !posReady && !settings.showVerbs
    },
    t("immersive.verbs"),
    isGeneratingPOS && settings.showVerbs ? " \u2026" : ""
  ), /* @__PURE__ */ React.createElement(
    ToggleButton,
    {
      active: settings.showAdjectives,
      onClick: () => handlePosToggle("showAdjectives"),
      title: isGeneratingPOS ? "Classifying parts of speech\u2026" : t("immersive.highlight_adjectives"),
      activeColor: "bg-green-700 text-white",
      disabled: isGeneratingPOS && !posReady && !settings.showAdjectives
    },
    t("immersive.adjectives"),
    isGeneratingPOS && settings.showAdjectives ? " \u2026" : ""
  ), /* @__PURE__ */ React.createElement(
    ToggleButton,
    {
      active: settings.showAdverbs,
      onClick: () => handlePosToggle("showAdverbs"),
      title: isGeneratingPOS ? "Classifying parts of speech\u2026" : t("immersive.highlight_adverbs"),
      activeColor: "bg-purple-500 text-white",
      disabled: isGeneratingPOS && !posReady && !settings.showAdverbs
    },
    t("immersive.adverbs"),
    isGeneratingPOS && settings.showAdverbs ? " \u2026" : ""
  )), /* @__PURE__ */ React.createElement("div", { className: "h-4 w-px bg-slate-300 shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 shrink-0 relative" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-slate-600" }, t("immersive.colors") || "Colors"), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("immersive.color_preset") || "Color preset",
      value: "",
      onChange: (e) => {
        const presets = {
          "warm": { bgColor: "#fdfbf7", fontColor: "#1e293b" },
          "dark": { bgColor: "#1a1a2e", fontColor: "#e2e8f0" },
          "high-contrast": { bgColor: "#000000", fontColor: "#ffff00" },
          "sepia": { bgColor: "#f4ecd8", fontColor: "#5c4033" },
          "blue-wash": { bgColor: "#d6eaf8", fontColor: "#1b2631" },
          "green-tint": { bgColor: "#e8f5e9", fontColor: "#1b5e20" },
          "rose": { bgColor: "#fce4ec", fontColor: "#880e4f" }
        };
        if (presets[e.target.value]) {
          setSettings((prev) => ({ ...prev, ...presets[e.target.value] }));
        }
      },
      className: "text-xs bg-slate-100 border border-slate-200 rounded-full px-2 py-1 cursor-pointer hover:bg-slate-200 transition-all font-medium text-slate-600"
    },
    /* @__PURE__ */ React.createElement("option", { value: "", disabled: true }, t("immersive.presets") || "Presets"),
    /* @__PURE__ */ React.createElement("option", { value: "warm" }, "\u2600\uFE0F Warm"),
    /* @__PURE__ */ React.createElement("option", { value: "dark" }, "\u{1F319} Dark"),
    /* @__PURE__ */ React.createElement("option", { value: "high-contrast" }, "\u25FC\uFE0F High Contrast"),
    /* @__PURE__ */ React.createElement("option", { value: "sepia" }, "\u{1F4DC} Sepia"),
    /* @__PURE__ */ React.createElement("option", { value: "blue-wash" }, "\u{1F4A7} Blue Wash"),
    /* @__PURE__ */ React.createElement("option", { value: "green-tint" }, "\u{1F33F} Green Tint"),
    /* @__PURE__ */ React.createElement("option", { value: "rose" }, "\u{1F338} Rose")
  ), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("label", { className: "text-[11px] text-slate-600" }, t("immersive.bg") || "Bg"), /* @__PURE__ */ React.createElement("input", { type: "color", value: settings.bgColor || "#fdfbf7", onChange: (e) => setSettings((prev) => ({ ...prev, bgColor: e.target.value })), className: "w-5 h-5 rounded-full border border-slate-200 cursor-pointer p-0 appearance-none", style: { backgroundColor: settings.bgColor }, "aria-label": t("immersive.bg_color") || "Background color" }), /* @__PURE__ */ React.createElement("label", { className: "text-[11px] text-slate-600" }, t("immersive.text") || "Text"), /* @__PURE__ */ React.createElement("input", { type: "color", value: settings.fontColor || "#1e293b", onChange: (e) => setSettings((prev) => ({ ...prev, fontColor: e.target.value })), className: "w-5 h-5 rounded-full border border-slate-200 cursor-pointer p-0 appearance-none", style: { backgroundColor: settings.fontColor }, "aria-label": t("immersive.text_color") || "Text color" })))), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.close_word_wall"),
      onClick: onClose,
      title: t("immersive.close"),
      className: "ml-4 shrink-0 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-colors"
    },
    /* @__PURE__ */ React.createElement(X, { size: 18 })
  ));
});
const BionicChunkReader = React.memo(({ text, onClose, isOpen }) => {
  const { t } = useContext(LanguageContext);
  const [words, setWords] = useState([]);
  const [chunkIdx, setChunkIdx] = useState(0);
  const [chunkSize, setChunkSize] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cpm, setCpm] = useState(120);
  const [theme, setTheme] = useState("warm");
  const themes = {
    warm: { bg: "#fdfbf7", strong: "#111827", light: "#6b7280", accent: "#4f46e5" },
    dark: { bg: "#0f172a", strong: "#f1f5f9", light: "#94a3b8", accent: "#818cf8" },
    sepia: { bg: "#f4ecd8", strong: "#3b2a1a", light: "#8b6f4e", accent: "#b45309" }
  };
  const c = themes[theme] || themes.warm;
  useEffect(() => {
    if (text) {
      const cleaned = String(text || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      setWords(cleaned.split(" ").filter((w) => w.length > 0));
      setChunkIdx(0);
    }
  }, [text]);
  const chunks = useMemo(() => {
    const out = [];
    for (let i = 0; i < words.length; i += chunkSize) out.push(words.slice(i, i + chunkSize));
    return out;
  }, [words, chunkSize]);
  useEffect(() => {
    if (!isPlaying) return;
    const delay = 6e4 / Math.max(10, cpm);
    const id = setInterval(() => {
      setChunkIdx((prev) => {
        if (prev >= chunks.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, delay);
    return () => clearInterval(id);
  }, [isPlaying, cpm, chunks.length]);
  useEffect(() => {
    const handler = (e) => {
      if (!isOpen) return;
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === "ArrowLeft") setChunkIdx((p) => Math.max(0, p - 1));
      else if (e.code === "ArrowRight") setChunkIdx((p) => Math.min(chunks.length - 1, p + 1));
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, chunks.length]);
  if (!isOpen) return null;
  const renderBionicWord = (w, i) => {
    const boldLen = Math.max(1, Math.ceil(w.length * 0.4));
    return /* @__PURE__ */ React.createElement("span", { key: i }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 900, color: c.strong } }, w.slice(0, boldLen)), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 400, color: c.light } }, w.slice(boldLen)), i < (chunks[chunkIdx] || []).length - 1 ? " " : "");
  };
  const currentChunk = chunks[chunkIdx] || [];
  const progressPct = chunks.length > 0 ? (chunkIdx + 1) / chunks.length * 100 : 0;
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[300] flex flex-col animate-in fade-in duration-200", style: { backgroundColor: c.bg } }, /* @__PURE__ */ React.createElement("div", { className: "p-4 flex justify-between items-center gap-3 flex-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: onClose, "aria-label": t("common.close") || "Close", className: "p-2 rounded-full hover:bg-black/5", style: { color: c.strong } }, /* @__PURE__ */ React.createElement(ArrowLeft, { size: 22 })), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-base", style: { color: c.strong } }, t("immersive.chunk_stream") || "Chunk Stream"), /* @__PURE__ */ React.createElement("span", { className: "text-xs", style: { color: c.light } }, chunkIdx + 1, " / ", chunks.length, " \xB7 bold-assist reading"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 flex-wrap text-xs font-bold", style: { color: c.strong } }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { style: { color: c.light } }, "WORDS"), /* @__PURE__ */ React.createElement("input", { "aria-label": "Words per chunk", type: "range", min: "1", max: "6", value: chunkSize, onChange: (e) => setChunkSize(parseInt(e.target.value)), className: "w-16" }), /* @__PURE__ */ React.createElement("span", { className: "font-mono w-4 text-right" }, chunkSize)), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { style: { color: c.light } }, "SPEED"), /* @__PURE__ */ React.createElement("input", { "aria-label": "Chunks per minute", type: "range", min: "40", max: "300", step: "10", value: cpm, onChange: (e) => setCpm(parseInt(e.target.value)), className: "w-24" }), /* @__PURE__ */ React.createElement("span", { className: "font-mono w-16 text-right" }, cpm, " cpm")), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { style: { color: c.light } }, "THEME"), /* @__PURE__ */ React.createElement("select", { "aria-label": "Theme", value: theme, onChange: (e) => setTheme(e.target.value), className: "text-xs rounded px-2 py-1 border", style: { borderColor: c.light + "55", background: "transparent", color: c.strong } }, /* @__PURE__ */ React.createElement("option", { value: "warm" }, "\u2600\uFE0F Warm"), /* @__PURE__ */ React.createElement("option", { value: "dark" }, "\u{1F319} Dark"), /* @__PURE__ */ React.createElement("option", { value: "sepia" }, "\u{1F4DC} Sepia"))))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex flex-col items-center justify-center cursor-pointer select-none px-8", onClick: () => setIsPlaying((p) => !p) }, /* @__PURE__ */ React.createElement("div", { className: "max-w-5xl text-center", style: { fontSize: "clamp(2.5rem, 8vw, 6rem)", lineHeight: 1.15, fontFamily: 'Georgia, "Iowan Old Style", "Times New Roman", serif' } }, currentChunk.map((w, i) => renderBionicWord(w, i))), /* @__PURE__ */ React.createElement("div", { className: "mt-10 text-sm flex items-center gap-2", style: { color: c.light } }, isPlaying ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Pause, { size: 16 }), " Tap to pause \xB7 \u2190 \u2192 navigate") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Play, { size: 16 }), " Tap or Space to play \xB7 \u2190 \u2192 navigate \xB7 Esc closes"))), /* @__PURE__ */ React.createElement("div", { className: "h-2 w-full", style: { background: c.light + "33" } }, /* @__PURE__ */ React.createElement("div", { className: "h-full transition-all duration-200", style: { width: `${progressPct}%`, backgroundColor: c.accent } })));
});
const PerspectiveCrawlOverlay = React.memo(({ text, onClose, isOpen }) => {
  const { t } = useContext(LanguageContext);
  const [speedPxPerSec, setSpeedPxPerSec] = useState(50);
  const [isPlaying, setIsPlaying] = useState(true);
  const [translateY, setTranslateY] = useState(0);
  const [palette, setPalette] = useState("gold");
  const palettes = {
    gold: { bg: "#000000", text: "#fde047", accent: "#facc15" },
    teal: { bg: "#061629", text: "#67e8f9", accent: "#22d3ee" },
    paper: { bg: "#111827", text: "#f9fafb", accent: "#e5e7eb" }
  };
  const p = palettes[palette] || palettes.gold;
  const viewportRef = useRef(null);
  const textRef = useRef(null);
  const rafRef = useRef(null);
  const lastTsRef = useRef(null);
  const translateYRef = useRef(0);
  const resetCrawl = useCallback(() => {
    translateYRef.current = 0;
    setTranslateY(0);
    lastTsRef.current = null;
  }, []);
  useEffect(() => {
    if (!isOpen) return;
    resetCrawl();
  }, [isOpen, text, resetCrawl]);
  useEffect(() => {
    if (!isOpen || !isPlaying) {
      lastTsRef.current = null;
      return;
    }
    const step = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1e3;
      lastTsRef.current = ts;
      const nextY = translateYRef.current - dt * speedPxPerSec;
      translateYRef.current = nextY;
      setTranslateY(nextY);
      const vh = viewportRef.current ? viewportRef.current.clientHeight : 600;
      const th = textRef.current ? textRef.current.clientHeight : 0;
      if (th > 0 && nextY < -(th + vh * 0.5)) {
        setIsPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [isOpen, isPlaying, speedPxPerSec]);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((pl) => !pl);
      } else if (e.key === "Escape") onClose();
      else if (e.key === "r" || e.key === "R") resetCrawl();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, resetCrawl]);
  if (!isOpen) return null;
  const cleaned = String(text || "").replace(/<[^>]*>/g, "").replace(/\n{3,}/g, "\n\n").trim();
  const paragraphs = cleaned.split(/\n{2,}/).filter(Boolean);
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[300] flex flex-col", style: { backgroundColor: p.bg, color: p.text } }, /* @__PURE__ */ React.createElement("div", { className: "p-4 flex justify-between items-center gap-3 flex-wrap backdrop-blur-sm", style: { background: "rgba(0,0,0,0.55)" } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: onClose, "aria-label": t("common.close") || "Close", className: "p-2 rounded-full", style: { color: p.text } }, /* @__PURE__ */ React.createElement(ArrowLeft, { size: 22 })), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-base" }, t("immersive.cinematic_crawl") || "Cinematic Crawl")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 text-xs font-bold flex-wrap" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { style: { opacity: 0.7 } }, "SPEED"), /* @__PURE__ */ React.createElement("input", { "aria-label": "Crawl speed", type: "range", min: "10", max: "140", value: speedPxPerSec, onChange: (e) => setSpeedPxPerSec(parseInt(e.target.value)), className: "w-24 accent-yellow-400" }), /* @__PURE__ */ React.createElement("span", { className: "font-mono w-14 text-right" }, speedPxPerSec, "px/s")), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { style: { opacity: 0.7 } }, "PALETTE"), /* @__PURE__ */ React.createElement("select", { "aria-label": "Palette", value: palette, onChange: (e) => setPalette(e.target.value), className: "text-xs rounded px-2 py-1 bg-transparent border", style: { borderColor: p.text + "55", color: p.text } }, /* @__PURE__ */ React.createElement("option", { value: "gold" }, "Golden"), /* @__PURE__ */ React.createElement("option", { value: "teal" }, "Aqua"), /* @__PURE__ */ React.createElement("option", { value: "paper" }, "Paper"))), /* @__PURE__ */ React.createElement("button", { onClick: () => setIsPlaying((pl) => !pl), "aria-label": isPlaying ? "Pause" : "Play", className: "px-3 py-1 rounded", style: { background: p.text + "22", color: p.text } }, isPlaying ? /* @__PURE__ */ React.createElement(Pause, { size: 14 }) : /* @__PURE__ */ React.createElement(Play, { size: 14 })), /* @__PURE__ */ React.createElement("button", { onClick: resetCrawl, "aria-label": "Restart crawl from top", className: "px-3 py-1 rounded text-xs", style: { background: p.text + "22", color: p.text } }, "\u21BA Restart"))), /* @__PURE__ */ React.createElement("div", { ref: viewportRef, className: "flex-1 relative overflow-hidden", style: { perspective: "500px", perspectiveOrigin: "50% 100%" } }, /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: textRef,
      style: {
        position: "absolute",
        left: 0,
        right: 0,
        top: "100%",
        padding: "0 10%",
        fontFamily: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
        fontWeight: 700,
        fontSize: "clamp(1.4rem, 2.6vw, 2.4rem)",
        lineHeight: 1.5,
        textAlign: "justify",
        transform: `translateY(${translateY}px) rotateX(22deg)`,
        transformOrigin: "50% 100%",
        willChange: "transform",
        textShadow: "0 0 12px " + p.accent + "44"
      }
    },
    paragraphs.map((para, i) => /* @__PURE__ */ React.createElement("p", { key: i, style: { marginBottom: "1.5em" } }, para))
  ), /* @__PURE__ */ React.createElement("div", { className: "absolute inset-x-0 top-0 pointer-events-none", style: { height: "40%", background: `linear-gradient(to bottom, ${p.bg} 0%, ${p.bg}cc 40%, transparent 100%)` } }), /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 pointer-events-none", style: { boxShadow: "inset 0 0 180px rgba(0,0,0,0.6)" } })), /* @__PURE__ */ React.createElement("div", { className: "py-2 text-center text-xs", style: { color: p.text, opacity: 0.6 } }, "Space pauses \xB7 R restarts \xB7 Esc closes"));
});
const KaraokeReaderOverlay = React.memo(({ text, onClose, isOpen, getAudioUrl }) => {
  const { t } = useContext(LanguageContext);
  const [sentences, setSentences] = useState([]);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [sweepPct, setSweepPct] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [theme, setTheme] = useState("warm");
  const themes = {
    warm: { bg: "#fdfbf7", ink: "#111827", dim: "#9ca3af", sweep: "#b45309", accent: "#fde68a" },
    dark: { bg: "#0f172a", ink: "#f1f5f9", dim: "#64748b", sweep: "#a5b4fc", accent: "#a855f7" },
    sepia: { bg: "#f4ecd8", ink: "#3b2a1a", dim: "#a08968", sweep: "#c2410c", accent: "#f97316" }
  };
  const c = themes[theme] || themes.warm;
  const audioRef = useRef(null);
  const rafRef = useRef(null);
  const activeSentenceRef = useRef(null);
  const playTokenRef = useRef(0);
  const reducedMotion = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
  useEffect(() => {
    if (!text) {
      setSentences([]);
      return;
    }
    const cleaned = String(text || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    const parts = cleaned.split(/([.!?]+["'\u201D\u2019]?)(\s+|$)/);
    const out = [];
    let buf = "";
    for (let i = 0; i < parts.length; i++) {
      buf += parts[i] || "";
      if (i % 3 === 2) {
        const s = buf.trim();
        if (s) out.push(s);
        buf = "";
      }
    }
    const tail = buf.trim();
    if (tail) out.push(tail);
    setSentences(out.length > 0 ? out : [cleaned]);
    setSentenceIdx(0);
    setSweepPct(0);
  }, [text]);
  useEffect(() => {
    if (!isOpen) {
      playTokenRef.current++;
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      } catch (e) {
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      try {
        if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
      } catch (e) {
      }
      setIsPlaying(false);
      setSweepPct(0);
    }
    return () => {
      playTokenRef.current++;
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      } catch (e) {
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
      } catch (e) {
      }
    };
  }, [isOpen]);
  useEffect(() => {
    const node = activeSentenceRef.current;
    if (node) {
      try {
        node.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
      } catch (e) {
      }
    }
  }, [sentenceIdx, reducedMotion]);
  const playSentence = useCallback(async (idx) => {
    if (idx < 0 || idx >= sentences.length) return;
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    } catch (e) {
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    } catch (e) {
    }
    setSweepPct(0);
    const sentenceText = sentences[idx];
    const token = ++playTokenRef.current;
    let url = null;
    if (typeof getAudioUrl === "function") {
      try {
        url = await getAudioUrl(sentenceText);
      } catch (e) {
        url = null;
      }
    }
    if (token !== playTokenRef.current) return;
    if (url) {
      const audio = new Audio(url);
      audioRef.current = audio;
      const updateSweep = () => {
        if (!audioRef.current || audioRef.current !== audio) return;
        const dur = audio.duration;
        let pct;
        if (isFinite(dur) && dur > 0) {
          pct = Math.min(100, audio.currentTime / dur * 100);
        } else {
          const estSec = Math.max(1.5, sentenceText.length / 15);
          pct = Math.min(100, audio.currentTime / estSec * 100);
        }
        setSweepPct(reducedMotion ? pct > 5 ? 100 : 0 : pct);
      };
      audio.addEventListener("timeupdate", updateSweep);
      audio.addEventListener("ended", () => {
        setSweepPct(100);
        if (autoAdvance && idx < sentences.length - 1) {
          setTimeout(() => {
            setSentenceIdx(idx + 1);
          }, 250);
        } else {
          setIsPlaying(false);
        }
      });
      audio.addEventListener("error", () => {
        setIsPlaying(false);
      });
      try {
        await audio.play();
      } catch (e) {
        setIsPlaying(false);
      }
      return;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined") {
      try {
        const u = new SpeechSynthesisUtterance(sentenceText);
        u.rate = 0.95;
        u.pitch = 1;
        u.volume = 0.95;
        const estMs = Math.max(1500, sentenceText.length * 60);
        const startTs = performance.now();
        const tick = () => {
          const elapsed = performance.now() - startTs;
          const pct = Math.min(100, elapsed / estMs * 100);
          setSweepPct(reducedMotion ? pct > 5 ? 100 : 0 : pct);
          if (pct < 100) rafRef.current = requestAnimationFrame(tick);
        };
        u.onend = () => {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          setSweepPct(100);
          if (autoAdvance && idx < sentences.length - 1) {
            setTimeout(() => {
              setSentenceIdx(idx + 1);
            }, 250);
          } else {
            setIsPlaying(false);
          }
        };
        u.onerror = () => {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          setIsPlaying(false);
        };
        window.speechSynthesis.speak(u);
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        setIsPlaying(false);
      }
      return;
    }
    setTimeout(() => {
      setSweepPct(100);
      if (autoAdvance && idx < sentences.length - 1) setSentenceIdx(idx + 1);
      else setIsPlaying(false);
    }, 1500);
  }, [sentences, getAudioUrl, autoAdvance, reducedMotion]);
  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    playSentence(sentenceIdx);
  }, [sentenceIdx, isOpen, isPlaying, playSentence]);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === "ArrowRight") {
        setSentenceIdx((i) => Math.min(sentences.length - 1, i + 1));
        setSweepPct(0);
      } else if (e.code === "ArrowLeft") {
        setSentenceIdx((i) => Math.max(0, i - 1));
        setSweepPct(0);
      } else if (e.code === "Home") {
        setSentenceIdx(0);
        setSweepPct(0);
      } else if (e.code === "End") {
        setSentenceIdx(Math.max(0, sentences.length - 1));
        setSweepPct(0);
      } else if (e.key === "Escape") {
        try {
          if (audioRef.current) audioRef.current.pause();
          window.speechSynthesis && window.speechSynthesis.cancel();
        } catch (ee) {
        }
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, sentences.length]);
  if (!isOpen) return null;
  const overallPct = sentences.length > 0 ? (sentenceIdx + sweepPct / 100) / sentences.length * 100 : 0;
  const renderSentence = (sText, idx) => {
    const isActive = idx === sentenceIdx;
    const isPast = idx < sentenceIdx;
    if (isActive) {
      const pct = sweepPct;
      const bgImage = "linear-gradient(to right, " + c.sweep + " 0%, " + c.sweep + " " + pct + "%, " + c.dim + " " + pct + "%, " + c.dim + " 100%)";
      return /* @__PURE__ */ React.createElement(
        "span",
        {
          key: idx,
          ref: (el) => {
            activeSentenceRef.current = el;
          },
          "aria-current": "true",
          onClick: () => {
            setSentenceIdx(idx);
            setSweepPct(0);
            if (!isPlaying) setIsPlaying(true);
          },
          style: {
            backgroundImage: bgImage,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
            fontWeight: 700,
            transition: reducedMotion ? "none" : "background-image 0.08s linear",
            cursor: "pointer",
            borderRadius: 2
          }
        },
        sText
      );
    }
    return /* @__PURE__ */ React.createElement(
      "span",
      {
        key: idx,
        onClick: () => {
          setSentenceIdx(idx);
          setSweepPct(0);
        },
        style: {
          color: c.dim,
          opacity: isPast ? 0.85 : 0.35,
          transition: reducedMotion ? "none" : "opacity 0.3s",
          cursor: "pointer"
        }
      },
      sText
    );
  };
  const hardStop = () => {
    try {
      if (audioRef.current) audioRef.current.pause();
    } catch (e) {
    }
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    } catch (e) {
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[300] flex flex-col animate-in fade-in duration-200", style: { backgroundColor: c.bg, color: c.ink } }, /* @__PURE__ */ React.createElement("div", { className: "p-4 flex justify-between items-center gap-3 flex-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
    hardStop();
    onClose();
  }, "aria-label": t("common.close") || "Close", className: "p-2 rounded-full hover:bg-black/5", style: { color: c.ink } }, /* @__PURE__ */ React.createElement(ArrowLeft, { size: 22 })), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-base" }, t("immersive.focus_reader") || "Focus Reader"), /* @__PURE__ */ React.createElement("span", { className: "text-xs", style: { color: c.dim } }, "Sentence ", sentenceIdx + 1, " / ", sentences.length, " \xB7 read-along sweep"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 flex-wrap text-xs font-bold" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 cursor-pointer" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: autoAdvance, onChange: (e) => setAutoAdvance(e.target.checked), "aria-label": "Auto-advance to next sentence" }), /* @__PURE__ */ React.createElement("span", { style: { color: c.ink } }, "Auto-advance")), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { style: { color: c.dim } }, "THEME"), /* @__PURE__ */ React.createElement("select", { "aria-label": "Theme", value: theme, onChange: (e) => setTheme(e.target.value), className: "text-xs rounded px-2 py-1 border", style: { borderColor: c.dim + "88", background: "transparent", color: c.ink } }, /* @__PURE__ */ React.createElement("option", { value: "warm" }, "\u2600\uFE0F Warm"), /* @__PURE__ */ React.createElement("option", { value: "dark" }, "\u{1F319} Dark"), /* @__PURE__ */ React.createElement("option", { value: "sepia" }, "\u{1F4DC} Sepia"))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        if (isPlaying) {
          hardStop();
          setIsPlaying(false);
        } else {
          setIsPlaying(true);
        }
      },
      "aria-label": isPlaying ? "Pause" : "Play",
      "aria-pressed": isPlaying,
      className: "px-3 py-1.5 rounded-full",
      style: { background: c.accent, color: c.ink }
    },
    isPlaying ? /* @__PURE__ */ React.createElement(Pause, { size: 14 }) : /* @__PURE__ */ React.createElement(Play, { size: 14 })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        hardStop();
        setSentenceIdx(0);
        setSweepPct(0);
        setIsPlaying(false);
      },
      className: "px-3 py-1 rounded text-xs",
      style: { background: c.dim + "33", color: c.ink },
      "aria-label": "Restart from first sentence"
    },
    "\u21BA Restart"
  ))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-auto px-6 md:px-16 py-10", style: { scrollBehavior: reducedMotion ? "auto" : "smooth" } }, /* @__PURE__ */ React.createElement("div", { className: "max-w-3xl mx-auto", style: { fontSize: "clamp(1.5rem, 2.4vw, 2.25rem)", lineHeight: 1.7, fontFamily: 'Georgia, "Iowan Old Style", "Times New Roman", serif' } }, sentences.map((s, i) => /* @__PURE__ */ React.createElement(React.Fragment, { key: i }, renderSentence(s, i), " ")))), /* @__PURE__ */ React.createElement("div", { className: "h-2 w-full", role: "progressbar", "aria-valuenow": Math.round(overallPct), "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": "Reading progress", style: { background: c.dim + "33" } }, /* @__PURE__ */ React.createElement("div", { className: "h-full", style: { width: overallPct + "%", backgroundColor: c.sweep, transition: reducedMotion ? "none" : "width 0.2s linear" } })), /* @__PURE__ */ React.createElement("div", { className: "px-4 py-2 text-center text-xs", style: { color: c.dim } }, "Space play/pause \xB7 \u2190 \u2192 sentences \xB7 Home/End jump \xB7 click any sentence to jump \xB7 Esc closes"));
});
window.AlloModules = window.AlloModules || {};
window.AlloModules.SpeedReaderOverlay = SpeedReaderOverlay;
window.AlloModules.BionicChunkReader = BionicChunkReader;
window.AlloModules.PerspectiveCrawlOverlay = PerspectiveCrawlOverlay;
window.AlloModules.KaraokeReaderOverlay = KaraokeReaderOverlay;
window.AlloModules.ImmersiveToolbar = ImmersiveToolbar;
window.AlloModules.ImmersiveReaderModule = true;
console.log("[ImmersiveReaderModule] 5 components registered");
window.AlloModules = window.AlloModules || {};
window.AlloModules.SpeedReaderOverlay = (typeof SpeedReaderOverlay !== 'undefined') ? SpeedReaderOverlay : null;
window.AlloModules.BionicChunkReader = (typeof BionicChunkReader !== 'undefined') ? BionicChunkReader : null;
window.AlloModules.PerspectiveCrawlOverlay = (typeof PerspectiveCrawlOverlay !== 'undefined') ? PerspectiveCrawlOverlay : null;
window.AlloModules.KaraokeReaderOverlay = (typeof KaraokeReaderOverlay !== 'undefined') ? KaraokeReaderOverlay : null;
window.AlloModules.ImmersiveToolbar = (typeof ImmersiveToolbar !== 'undefined') ? ImmersiveToolbar : null;
window.AlloModules.ImmersiveReaderModule = true;
console.log('[ImmersiveReaderModule] 5 components registered');
})();
