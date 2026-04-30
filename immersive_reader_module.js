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
const safeT = (t, key, fb) => {
  const r = t(key);
  return r && r !== key ? r : fb;
};
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
const FocusReaderOverlay = React.memo(({ text, onClose, isOpen }) => {
  const { t } = useContext(LanguageContext);
  const [words, setWords] = useState([]);
  const [chunkIdx, setChunkIdx] = useState(0);
  const [chunkSize, setChunkSize] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(300);
  const [theme, setTheme] = useState("warm");
  const [focusColor, setFocusColor] = useState("#dc2626");
  const [punctPauses, setPunctPauses] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const themes = {
    warm: { bg: "#fdfbf7", strong: "#111827", light: "#6b7280", accent: "#4f46e5", panel: "rgba(255,255,255,0.85)" },
    dark: { bg: "#0f172a", strong: "#f1f5f9", light: "#94a3b8", accent: "#818cf8", panel: "rgba(15,23,42,0.85)" },
    sepia: { bg: "#f4ecd8", strong: "#3b2a1a", light: "#8b6f4e", accent: "#b45309", panel: "rgba(244,236,216,0.85)" }
  };
  const c = themes[theme] || themes.warm;
  const colorOptions = [
    { name: "Red", value: "#dc2626" },
    { name: "Blue", value: "#2563eb" },
    { name: "Green", value: "#16a34a" },
    { name: "Purple", value: "#9333ea" },
    { name: "Orange", value: "#ea580c" },
    { name: "Pink", value: "#db2777" },
    { name: "Teal", value: "#0d9488" }
  ];
  useEffect(() => {
    if (text) {
      const cleaned = String(text || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      setWords(cleaned.split(" ").filter((w) => w.length > 0));
      setChunkIdx(0);
    }
  }, [text]);
  const chunks = useMemo(() => {
    const out = [];
    const size = Math.max(1, chunkSize);
    for (let i = 0; i < words.length; i += size) out.push(words.slice(i, i + size));
    return out;
  }, [words, chunkSize]);
  const prevChunkSizeRef = useRef(chunkSize);
  useEffect(() => {
    const prev = prevChunkSizeRef.current;
    if (prev !== chunkSize && words.length > 0) {
      const wordCursor = chunkIdx * prev;
      setChunkIdx(Math.min(Math.floor(wordCursor / chunkSize), Math.max(0, Math.ceil(words.length / chunkSize) - 1)));
    }
    prevChunkSizeRef.current = chunkSize;
  }, [chunkSize, words.length]);
  const chunkDelayFor = useCallback((idx) => {
    const base = 6e4 / Math.max(50, wpm) * Math.max(1, chunkSize);
    if (!punctPauses) return Math.max(60, base);
    const chunk = chunks[idx] || [];
    const last = chunk[chunk.length - 1] || "";
    const trailing = last.replace(/["'\u201D\u2019\)\]]*$/, "");
    const tail = trailing.slice(-1);
    let mult = 1;
    if (/[.!?]/.test(tail)) mult = 2;
    else if (/[,;:]/.test(tail)) mult = 1.4;
    else if (/[—–]/.test(tail)) mult = 1.3;
    return Math.max(60, base * mult);
  }, [wpm, chunkSize, punctPauses, chunks]);
  useEffect(() => {
    if (!isPlaying || countdown > 0) return;
    let timeoutId = null;
    const advance = () => {
      setChunkIdx((prev) => {
        if (prev >= chunks.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        const next = prev + 1;
        timeoutId = setTimeout(advance, chunkDelayFor(next));
        return next;
      });
    };
    timeoutId = setTimeout(advance, chunkDelayFor(chunkIdx));
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isPlaying, countdown, wpm, chunkSize, punctPauses, chunks, chunkDelayFor]);
  useEffect(() => {
    if (!isPlaying || countdown === 0) return;
    if (countdown === 1) {
      const t2 = setTimeout(() => setCountdown(0), 650);
      return () => clearTimeout(t2);
    }
    const t1 = setTimeout(() => setCountdown((n) => n - 1), 650);
    return () => clearTimeout(t1);
  }, [countdown, isPlaying]);
  const handlePlayToggle = useCallback(() => {
    setIsPlaying((p) => {
      const next = !p;
      if (next && chunkIdx === 0) setCountdown(3);
      return next;
    });
  }, [chunkIdx]);
  useEffect(() => {
    const handler = (e) => {
      if (!isOpen) return;
      if (e.code === "Space") {
        e.preventDefault();
        handlePlayToggle();
      } else if (e.code === "ArrowLeft") setChunkIdx((p) => Math.max(0, p - 1));
      else if (e.code === "ArrowRight") setChunkIdx((p) => Math.min(chunks.length - 1, p + 1));
      else if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") setWpm((w) => Math.min(900, w + 25));
      else if (e.key === "-" || e.key === "_") setWpm((w) => Math.max(100, w - 25));
      else if (e.key === "[") setChunkSize((s) => Math.max(1, s - 1));
      else if (e.key === "]") setChunkSize((s) => Math.min(6, s + 1));
      else if (e.key === "p" || e.key === "P") setPunctPauses((v) => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, chunks.length, handlePlayToggle]);
  if (!isOpen) return null;
  const currentChunk = chunks[chunkIdx] || [];
  const progressPct = chunks.length > 0 ? (chunkIdx + 1) / chunks.length * 100 : 0;
  const rsvp = chunkSize === 1;
  const rsvpWord = rsvp ? currentChunk[0] || "" : "";
  const centerIdx = Math.floor(rsvpWord.length / 2);
  const renderBionicWord = (w, i) => {
    const boldLen = Math.max(1, Math.ceil(w.length * 0.4));
    return /* @__PURE__ */ React.createElement("span", { key: i }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 900, color: c.strong } }, w.slice(0, boldLen)), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 400, color: c.light } }, w.slice(boldLen)), i < currentChunk.length - 1 ? " " : "");
  };
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[300] flex flex-col animate-in fade-in duration-200", style: { backgroundColor: c.bg } }, /* @__PURE__ */ React.createElement("div", { className: "p-4 flex justify-between items-center gap-3 flex-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: onClose, "aria-label": safeT(t, "common.close", "Close"), className: "p-2 rounded-full hover:bg-black/5", style: { color: c.strong } }, /* @__PURE__ */ React.createElement(ArrowLeft, { size: 22 })), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-base", style: { color: c.strong } }, safeT(t, "immersive.focus_mode", "Focus Mode")), /* @__PURE__ */ React.createElement("span", { className: "text-xs", style: { color: c.light } }, chunkIdx + 1, " / ", chunks.length, " \xB7 ", rsvp ? "single-word RSVP" : `${chunkSize}-word chunks \xB7 bold-assist`))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 flex-wrap text-xs font-bold", style: { color: c.strong } }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { style: { color: c.light } }, "WORDS"), /* @__PURE__ */ React.createElement("input", { "aria-label": "Words per chunk", type: "range", min: "1", max: "6", value: chunkSize, onChange: (e) => setChunkSize(parseInt(e.target.value)), className: "w-16 accent-indigo-600" }), /* @__PURE__ */ React.createElement("span", { className: "font-mono w-4 text-right" }, chunkSize)), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { style: { color: c.light } }, "SPEED"), /* @__PURE__ */ React.createElement("input", { "aria-label": safeT(t, "common.speed", "Words per minute"), type: "range", min: "100", max: "900", step: "25", value: wpm, onChange: (e) => setWpm(parseInt(e.target.value)), className: "w-28 accent-indigo-600" }), /* @__PURE__ */ React.createElement("span", { className: "font-mono w-16 text-right" }, wpm, " wpm")), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { style: { color: c.light } }, "THEME"), /* @__PURE__ */ React.createElement("select", { "aria-label": "Theme", value: theme, onChange: (e) => setTheme(e.target.value), className: "text-xs rounded px-2 py-1 border", style: { borderColor: c.light, background: c.bg, color: c.strong } }, /* @__PURE__ */ React.createElement("option", { value: "warm" }, "\u2600 Warm"), /* @__PURE__ */ React.createElement("option", { value: "dark" }, "\u{1F319} Dark"), /* @__PURE__ */ React.createElement("option", { value: "sepia" }, "\u{1F4DC} Sepia"))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setPunctPauses((v) => !v),
      "aria-pressed": punctPauses,
      title: punctPauses ? "Punctuation-aware pauses on (P to toggle) \u2014 commas slow slightly, sentence ends longer" : "Punctuation pauses off \u2014 constant cadence (P to toggle)",
      className: "px-3 py-1 rounded-full text-xs transition-all",
      style: { background: punctPauses ? c.accent + "22" : "transparent", border: `1px solid ${c.light}55`, color: c.strong, opacity: punctPauses ? 1 : 0.7 }
    },
    "\u2025 Pause at punctuation"
  ), rsvp && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { style: { color: c.light } }, "FOCUS"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1" }, colorOptions.map((opt) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: opt.value,
      onClick: () => setFocusColor(opt.value),
      "aria-label": `Focus color ${opt.name}`,
      className: `w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${focusColor === opt.value ? "scale-110" : "border-transparent"}`,
      style: { backgroundColor: opt.value, borderColor: focusColor === opt.value ? c.strong : "transparent" },
      title: opt.name
    }
  )))))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex flex-col items-center justify-center cursor-pointer select-none px-8 relative", onClick: handlePlayToggle }, countdown > 0 && /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 flex items-center justify-center pointer-events-none", "aria-live": "polite", "aria-atomic": "true" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      key: countdown,
      className: "animate-in fade-in zoom-in duration-300",
      style: { fontSize: "clamp(8rem, 20vw, 16rem)", fontWeight: 900, color: c.accent, textShadow: `0 0 40px ${c.accent}44`, fontFamily: 'Georgia, "Iowan Old Style", serif' }
    },
    countdown
  )), rsvp ? /* @__PURE__ */ React.createElement("div", { className: "relative text-7xl md:text-9xl font-mono font-bold tracking-wide", style: { color: c.strong } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-baseline" }, /* @__PURE__ */ React.createElement("span", null, rsvpWord.slice(0, centerIdx)), /* @__PURE__ */ React.createElement("span", { style: { color: focusColor } }, rsvpWord.charAt(centerIdx)), /* @__PURE__ */ React.createElement("span", null, rsvpWord.slice(centerIdx + 1))), /* @__PURE__ */ React.createElement("div", { className: "absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 -z-10 h-full", style: { backgroundColor: c.light + "33" } }), /* @__PURE__ */ React.createElement("div", { className: "absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 -z-10 w-full", style: { backgroundColor: c.light + "33" } })) : /* @__PURE__ */ React.createElement("div", { className: "max-w-5xl text-center", style: { fontSize: "clamp(2.5rem, 8vw, 6rem)", lineHeight: 1.15, fontFamily: 'Georgia, "Iowan Old Style", "Times New Roman", serif' } }, currentChunk.map((w, i) => renderBionicWord(w, i))), /* @__PURE__ */ React.createElement("div", { className: "mt-10 text-sm flex items-center gap-2 flex-wrap justify-center max-w-3xl", style: { color: c.light } }, isPlaying ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Pause, { size: 16 }), " Tap to pause \xB7 \u2190 \u2192 navigate \xB7 +/\u2212 speed \xB7 [ ] chunk size \xB7 P pause-style") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Play, { size: 16 }), " Tap or Space to play \xB7 \u2190 \u2192 navigate \xB7 +/\u2212 speed \xB7 [ ] chunk size \xB7 P pause-style \xB7 Esc closes"))), /* @__PURE__ */ React.createElement("div", { className: "h-2 w-full", style: { background: c.light + "33" } }, /* @__PURE__ */ React.createElement("div", { className: "h-full transition-all duration-200", style: { width: `${progressPct}%`, backgroundColor: c.accent } })));
});
const ImmersiveToolbar = React.memo(({ settings, setSettings, onClose, playbackRate, setPlaybackRate, lineHeight, setLineHeight, letterSpacing, setLetterSpacing, isSpeedReaderActive, onToggleSpeedReader, isChunkReaderActive, onToggleChunkReader, chunkReaderIdx, setChunkReaderIdx, chunkReaderAutoPlay, setChunkReaderAutoPlay, chunkReaderSpeed, setChunkReaderSpeed, totalSentences, interactionMode, setInteractionMode, isBionicReaderActive, onToggleBionicReader, isCrawlReaderActive, onToggleCrawlReader, isKaraokeOverlayActive, onToggleKaraokeOverlay, chunkReaderReadAlong, onToggleChunkReaderReadAlong, chunkReaderMood, setChunkReaderMood, onGeneratePOS, isGeneratingPOS, posReady, onGenerateSyllables, isGeneratingSyllables, syllablesReady, isFocusReaderActive, onToggleFocusReader }) => {
  const focusReaderActive = typeof isFocusReaderActive === "boolean" ? isFocusReaderActive : !!isSpeedReaderActive || !!isBionicReaderActive;
  const toggleFocusReader = onToggleFocusReader || onToggleSpeedReader || onToggleBionicReader;
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
  ), toggleFocusReader && /* @__PURE__ */ React.createElement(
    ToggleButton,
    {
      active: !!focusReaderActive,
      onClick: toggleFocusReader,
      title: safeT(t, "immersive.focus_mode_title", "Focus Mode \u2014 single-word RSVP or multi-word chunks with bold-assist (drag the WORDS slider once open)"),
      activeColor: "bg-sky-500 text-white",
      "data-help-key": "immersive_focus_mode"
    },
    /* @__PURE__ */ React.createElement(Zap, { size: 14, className: "mr-1 inline" }),
    " ",
    safeT(t, "immersive.focus_mode", "Focus Mode")
  ), /* @__PURE__ */ React.createElement(
    ToggleButton,
    {
      active: isChunkReaderActive,
      onClick: onToggleChunkReader,
      title: safeT(t, "immersive.chunk_read", "Chunk Read"),
      activeColor: "bg-emerald-700 text-white",
      "data-help-key": "immersive_chunk_reader"
    },
    /* @__PURE__ */ React.createElement(List, { size: 14, className: "mr-1 inline" }),
    " ",
    safeT(t, "immersive.chunk_read", "Chunk Read")
  ), onToggleCrawlReader && /* @__PURE__ */ React.createElement(
    ToggleButton,
    {
      active: !!isCrawlReaderActive,
      onClick: onToggleCrawlReader,
      title: safeT(t, "immersive.cinematic_crawl", "Cinematic Crawl \u2014 receding-perspective scroll"),
      activeColor: "bg-amber-500 text-slate-900",
      "data-help-key": "immersive_perspective_crawl"
    },
    /* @__PURE__ */ React.createElement(Zap, { size: 14, className: "mr-1 inline" }),
    " ",
    safeT(t, "immersive.cinematic_crawl", "Crawl")
  ), onToggleKaraokeOverlay && /* @__PURE__ */ React.createElement(
    ToggleButton,
    {
      active: !!isKaraokeOverlayActive,
      onClick: onToggleKaraokeOverlay,
      title: safeT(t, "immersive.focus_reader_title", "Focus Reader \u2014 full-screen read-along with sentence-sweep visuals"),
      activeColor: "bg-fuchsia-600 text-white",
      "data-help-key": "immersive_karaoke_overlay",
      "aria-pressed": !!isKaraokeOverlayActive
    },
    /* @__PURE__ */ React.createElement(Volume2, { size: 14, className: "mr-1 inline" }),
    " ",
    safeT(t, "immersive.focus_reader", "Focus Reader")
  )), setInteractionMode && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "h-4 w-px bg-slate-300 shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 shrink-0 bg-slate-100 rounded-full p-0.5", role: "group", "aria-label": safeT(t, "immersive.tap_mode", "Tap action") }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider px-2" }, safeT(t, "immersive.tap_mode", "Tap")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setInteractionMode("read"),
      "aria-pressed": interactionMode !== "define" && interactionMode !== "phonics",
      title: safeT(t, "immersive.tap_speak", "Tap a word to hear it"),
      className: `inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full transition-colors ${interactionMode !== "define" && interactionMode !== "phonics" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-800"}`
    },
    /* @__PURE__ */ React.createElement(Volume2, { size: 12 }),
    " ",
    safeT(t, "immersive.speak", "Speak")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setInteractionMode("define"),
      "aria-pressed": interactionMode === "define",
      title: safeT(t, "immersive.tap_define", "Tap a word to see its definition and picture"),
      className: `inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full transition-colors ${interactionMode === "define" ? "bg-yellow-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-800"}`
    },
    /* @__PURE__ */ React.createElement(BookOpen, { size: 12 }),
    " ",
    safeT(t, "immersive.define", "Define")
  ))), isChunkReaderActive && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "h-4 w-px bg-slate-300 shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 shrink-0" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setChunkReaderIdx(Math.max(0, chunkReaderIdx - 1)), disabled: chunkReaderIdx <= 0, className: "p-1 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-all", title: t("common.previous") }, /* @__PURE__ */ React.createElement(ChevronLeft, { size: 14 })), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-slate-600 tabular-nums min-w-[3rem] text-center" }, chunkReaderIdx + 1, " / ", totalSentences), /* @__PURE__ */ React.createElement("button", { onClick: () => setChunkReaderIdx(Math.min(totalSentences - 1, chunkReaderIdx + 1)), disabled: chunkReaderIdx >= totalSentences - 1, className: "p-1 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-all", title: t("common.next") }, /* @__PURE__ */ React.createElement(ChevronRight, { size: 14 })), /* @__PURE__ */ React.createElement("div", { className: "h-4 w-px bg-slate-200" }), /* @__PURE__ */ React.createElement("button", { onClick: () => setChunkReaderAutoPlay(!chunkReaderAutoPlay), className: `px-2 py-1 text-xs font-bold rounded-full transition-all ${chunkReaderAutoPlay ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`, title: chunkReaderAutoPlay ? safeT(t, "common.pause", "Pause") : safeT(t, "common.auto_play", "Auto") }, chunkReaderAutoPlay ? /* @__PURE__ */ React.createElement(Pause, { size: 12, className: "inline" }) : /* @__PURE__ */ React.createElement(Play, { size: 12, className: "inline" })), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600" }, "1s"), /* @__PURE__ */ React.createElement("input", { type: "range", min: "1000", max: "8000", step: "500", value: chunkReaderSpeed, onChange: (e) => setChunkReaderSpeed(parseInt(e.target.value)), disabled: !!chunkReaderReadAlong, className: `w-14 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 ${chunkReaderReadAlong ? "opacity-30" : ""}`, title: chunkReaderReadAlong ? "Disabled while Read Along is on \u2014 audio length drives the pace" : `${(chunkReaderSpeed / 1e3).toFixed(1)}s`, "aria-label": t("immersive.speed") }), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600 tabular-nums" }, (chunkReaderSpeed / 1e3).toFixed(1), "s")), onToggleChunkReaderReadAlong && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "h-4 w-px bg-slate-200" }), /* @__PURE__ */ React.createElement(
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
    safeT(t, "immersive.read_along", "Read Along")
  )), setChunkReaderMood && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "h-4 w-px bg-slate-200" }), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": safeT(t, "immersive.chunk_mood", "Chunk Read animation mood"),
      value: chunkReaderMood || "highlight",
      onChange: (e) => setChunkReaderMood(e.target.value),
      title: "Animation mood for active chunk",
      className: "text-[11px] font-bold rounded-full px-2 py-1 border border-slate-300 bg-slate-100 text-slate-700 cursor-pointer hover:bg-slate-200",
      "data-help-key": "immersive_chunk_mood"
    },
    /* @__PURE__ */ React.createElement("option", { value: "highlight" }, "\u2728 Sweep"),
    /* @__PURE__ */ React.createElement("option", { value: "typewriter" }, "\u2328\uFE0F Typewriter"),
    /* @__PURE__ */ React.createElement("option", { value: "popin" }, "\u{1F388} Pop-In"),
    /* @__PURE__ */ React.createElement("option", { value: "pulse" }, "\u{1F497} Pulse")
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
  )), /* @__PURE__ */ React.createElement("div", { className: "h-4 w-px bg-slate-300 shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 shrink-0" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-slate-600" }, safeT(t, "immersive.font", "Font")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": safeT(t, "immersive.font_family", "Font family"),
      value: settings.fontFamily || "",
      onChange: (e) => setSettings((prev) => ({ ...prev, fontFamily: e.target.value })),
      className: "text-xs bg-slate-100 border border-slate-400 rounded-full px-2 py-1 cursor-pointer hover:bg-slate-200 transition-all font-medium text-slate-700",
      "data-help-key": "immersive_font_family"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "Default"),
    /* @__PURE__ */ React.createElement("option", { value: "'Lexend', system-ui, sans-serif" }, "Lexend (readable)"),
    /* @__PURE__ */ React.createElement("option", { value: "'OpenDyslexic', 'Atkinson Hyperlegible', sans-serif" }, "OpenDyslexic"),
    /* @__PURE__ */ React.createElement("option", { value: "'Atkinson Hyperlegible', system-ui, sans-serif" }, "Atkinson Hyperlegible"),
    /* @__PURE__ */ React.createElement("option", { value: "Georgia, 'Iowan Old Style', serif" }, "Serif (Georgia)"),
    /* @__PURE__ */ React.createElement("option", { value: "'Inter', system-ui, sans-serif" }, "Sans (Inter)"),
    /* @__PURE__ */ React.createElement("option", { value: "'Comic Sans MS', 'Comic Neue', cursive" }, "Comic Sans"),
    /* @__PURE__ */ React.createElement("option", { value: "ui-monospace, 'SF Mono', Consolas, monospace" }, "Monospace")
  )), /* @__PURE__ */ React.createElement("div", { className: "h-4 w-px bg-slate-300 shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 shrink-0 relative" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-slate-600" }, safeT(t, "immersive.colors", "Colors")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": safeT(t, "immersive.color_preset", "Color preset"),
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
      className: "text-xs bg-slate-100 border border-slate-400 rounded-full px-2 py-1 cursor-pointer hover:bg-slate-200 transition-all font-medium text-slate-600"
    },
    /* @__PURE__ */ React.createElement("option", { value: "", disabled: true }, safeT(t, "immersive.presets", "Presets")),
    /* @__PURE__ */ React.createElement("option", { value: "warm" }, "\u2600\uFE0F Warm"),
    /* @__PURE__ */ React.createElement("option", { value: "dark" }, "\u{1F319} Dark"),
    /* @__PURE__ */ React.createElement("option", { value: "high-contrast" }, "\u25FC\uFE0F High Contrast"),
    /* @__PURE__ */ React.createElement("option", { value: "sepia" }, "\u{1F4DC} Sepia"),
    /* @__PURE__ */ React.createElement("option", { value: "blue-wash" }, "\u{1F4A7} Blue Wash"),
    /* @__PURE__ */ React.createElement("option", { value: "green-tint" }, "\u{1F33F} Green Tint"),
    /* @__PURE__ */ React.createElement("option", { value: "rose" }, "\u{1F338} Rose")
  ), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("label", { className: "text-[11px] text-slate-600" }, safeT(t, "immersive.bg", "Bg")), /* @__PURE__ */ React.createElement("input", { type: "color", value: settings.bgColor || "#fdfbf7", onChange: (e) => setSettings((prev) => ({ ...prev, bgColor: e.target.value })), className: "w-5 h-5 rounded-full border border-slate-400 cursor-pointer p-0 appearance-none", style: { backgroundColor: settings.bgColor }, "aria-label": safeT(t, "immersive.bg_color", "Background color") }), /* @__PURE__ */ React.createElement("label", { className: "text-[11px] text-slate-600" }, safeT(t, "immersive.text", "Text")), /* @__PURE__ */ React.createElement("input", { type: "color", value: settings.fontColor || "#1e293b", onChange: (e) => setSettings((prev) => ({ ...prev, fontColor: e.target.value })), className: "w-5 h-5 rounded-full border border-slate-400 cursor-pointer p-0 appearance-none", style: { backgroundColor: settings.fontColor }, "aria-label": safeT(t, "immersive.text_color", "Text color") })))), /* @__PURE__ */ React.createElement(
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
const PerspectiveCrawlOverlay = React.memo(({ text, onClose, isOpen }) => {
  const { t } = useContext(LanguageContext);
  const [speedPxPerSec, setSpeedPxPerSec] = useState(70);
  const [isPlaying, setIsPlaying] = useState(true);
  const [translateY, setTranslateY] = useState(0);
  const [palette, setPalette] = useState("gold");
  const [finished, setFinished] = useState(false);
  const [ambientOn, setAmbientOn] = useState(true);
  const [progressPct, setProgressPct] = useState(0);
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
  const audioCtxRef = useRef(null);
  const audioNodesRef = useRef(null);
  const resetCrawl = useCallback(() => {
    translateYRef.current = 0;
    setTranslateY(0);
    setFinished(false);
    setProgressPct(0);
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
      if (th > 0) {
        const total = th + vh * 0.5;
        setProgressPct(Math.min(100, -nextY / total * 100));
        if (nextY < -total) {
          setIsPlaying(false);
          setFinished(true);
          setProgressPct(100);
          return;
        }
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
    if (!isOpen || !ambientOn || !isPlaying) {
      if (audioNodesRef.current) {
        try {
          const { gain, ctx } = audioNodesRef.current;
          gain.gain.cancelScheduledValues(ctx.currentTime);
          gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
        } catch (e) {
        }
      }
      return;
    }
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        try {
          ctx.resume();
        } catch (e) {
        }
      }
      if (!audioNodesRef.current) {
        const gain2 = ctx.createGain();
        gain2.gain.value = 0;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 600;
        lp.Q.value = 0.5;
        const freqs = [110, 164.81, 220];
        const oscs = freqs.map((f, i) => {
          const o = ctx.createOscillator();
          o.type = i === 1 ? "triangle" : "sine";
          o.frequency.value = f;
          o.detune.value = (i - 1) * 6;
          o.connect(gain2);
          o.start();
          return o;
        });
        gain2.connect(lp);
        lp.connect(ctx.destination);
        audioNodesRef.current = { ctx, gain: gain2, lp, oscs };
      }
      const { gain, ctx: c2 } = audioNodesRef.current;
      gain.gain.cancelScheduledValues(c2.currentTime);
      gain.gain.setTargetAtTime(0.06, c2.currentTime, 0.8);
    } catch (e) {
    }
  }, [isOpen, isPlaying, ambientOn]);
  useEffect(() => {
    return () => {
      try {
        if (audioNodesRef.current) {
          const { oscs } = audioNodesRef.current;
          oscs.forEach((o) => {
            try {
              o.stop();
            } catch (e) {
            }
          });
          audioNodesRef.current = null;
        }
        if (audioCtxRef.current) {
          try {
            audioCtxRef.current.close();
          } catch (e) {
          }
          audioCtxRef.current = null;
        }
      } catch (e) {
      }
    };
  }, []);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((pl) => !pl);
      } else if (e.key === "Escape") onClose();
      else if (e.key === "r" || e.key === "R") {
        resetCrawl();
        setIsPlaying(true);
      } else if (e.key === "m" || e.key === "M") setAmbientOn((a) => !a);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, resetCrawl]);
  if (!isOpen) return null;
  const cleaned = String(text || "").replace(/<[^>]*>/g, "").replace(/\n{3,}/g, "\n\n").trim();
  const paragraphs = cleaned.split(/\n{2,}/).filter(Boolean);
  const togglePlay = () => {
    if (finished) {
      resetCrawl();
      setIsPlaying(true);
    } else setIsPlaying((pl) => !pl);
  };
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[300] flex flex-col", style: { backgroundColor: p.bg, color: p.text } }, /* @__PURE__ */ React.createElement("div", { className: "p-4 flex justify-between items-center gap-3 flex-wrap backdrop-blur-sm", style: { background: "rgba(0,0,0,0.55)" } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: onClose, "aria-label": safeT(t, "common.close", "Close"), className: "p-2 rounded-full", style: { color: p.text } }, /* @__PURE__ */ React.createElement(ArrowLeft, { size: 22 })), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-base" }, safeT(t, "immersive.cinematic_crawl", "Cinematic Crawl"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 text-xs font-bold flex-wrap" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { style: { opacity: 0.7 } }, "SPEED"), /* @__PURE__ */ React.createElement("input", { "aria-label": "Crawl speed", type: "range", min: "10", max: "140", value: speedPxPerSec, onChange: (e) => setSpeedPxPerSec(parseInt(e.target.value)), className: "w-24 accent-yellow-400" }), /* @__PURE__ */ React.createElement("span", { className: "font-mono w-14 text-right" }, speedPxPerSec, "px/s")), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { style: { opacity: 0.7 } }, "PALETTE"), /* @__PURE__ */ React.createElement("select", { "aria-label": "Palette", value: palette, onChange: (e) => setPalette(e.target.value), className: "text-xs rounded px-2 py-1 border", style: { borderColor: p.text, background: p.bg, color: p.text } }, /* @__PURE__ */ React.createElement("option", { value: "gold" }, "Golden"), /* @__PURE__ */ React.createElement("option", { value: "teal" }, "Aqua"), /* @__PURE__ */ React.createElement("option", { value: "paper" }, "Paper"))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setAmbientOn((a) => !a),
      "aria-pressed": ambientOn,
      "aria-label": ambientOn ? "Mute ambient pad" : "Unmute ambient pad",
      title: ambientOn ? "Ambient pad on (M to toggle)" : "Ambient pad muted (M to toggle)",
      className: "px-3 py-1 rounded text-xs",
      style: { background: p.text + "22", color: p.text, opacity: ambientOn ? 1 : 0.55 }
    },
    ambientOn ? "\u266A" : "\u266A\u0338"
  ), /* @__PURE__ */ React.createElement("button", { onClick: togglePlay, "aria-label": isPlaying ? "Pause" : "Play", className: "px-3 py-1 rounded", style: { background: p.text + "22", color: p.text } }, isPlaying ? /* @__PURE__ */ React.createElement(Pause, { size: 14 }) : /* @__PURE__ */ React.createElement(Play, { size: 14 })), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    resetCrawl();
    setIsPlaying(true);
  }, "aria-label": "Restart crawl from top", className: "px-3 py-1 rounded text-xs", style: { background: p.text + "22", color: p.text } }, "\u21BA Restart"))), /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: viewportRef,
      onClick: togglePlay,
      className: "flex-1 relative overflow-hidden cursor-pointer select-none",
      style: { perspective: "900px", perspectiveOrigin: "50% 100%" },
      role: "button",
      "aria-label": isPlaying ? "Pause crawl" : "Play crawl"
    },
    /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 pointer-events-none", style: {
      backgroundImage: `radial-gradient(circle at 20% 30%, ${p.accent}22 0 1px, transparent 2px), radial-gradient(circle at 70% 20%, ${p.accent}1a 0 1px, transparent 2px), radial-gradient(circle at 85% 80%, ${p.accent}33 0 1px, transparent 2.5px), radial-gradient(circle at 15% 75%, ${p.accent}22 0 1px, transparent 2px), radial-gradient(circle at 40% 60%, ${p.accent}1a 0 1px, transparent 2px)`,
      backgroundSize: "3px 3px, 5px 5px, 7px 7px, 4px 4px, 6px 6px",
      backgroundPosition: `0 ${translateY * 0.08}px, 0 ${translateY * 0.12}px, 0 ${translateY * 0.18}px, 0 ${translateY * 0.05}px, 0 ${translateY * 0.1}px`,
      opacity: 0.6,
      willChange: "background-position"
    } }),
    /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 pointer-events-none", style: {
      background: `radial-gradient(ellipse at 50% 100%, ${p.accent}14 0%, transparent 60%)`
    } }),
    /* @__PURE__ */ React.createElement(
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
          fontSize: "clamp(2rem, 3.6vw, 3.4rem)",
          lineHeight: 1.5,
          textAlign: "justify",
          transform: `translateY(${translateY}px) rotateX(15deg)`,
          transformOrigin: "50% 100%",
          willChange: "transform",
          textShadow: "0 0 12px " + p.accent + "44"
        }
      },
      paragraphs.map((para, i) => /* @__PURE__ */ React.createElement("p", { key: i, style: { marginBottom: "1.5em" } }, para))
    ),
    /* @__PURE__ */ React.createElement("div", { className: "absolute inset-x-0 top-0 pointer-events-none", style: { height: "40%", background: `linear-gradient(to bottom, ${p.bg} 0%, ${p.bg}cc 40%, transparent 100%)` } }),
    /* @__PURE__ */ React.createElement("div", { className: "absolute inset-x-0 bottom-0 pointer-events-none", style: { height: "8%", background: `linear-gradient(to top, ${p.bg} 0%, transparent 100%)` } }),
    /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 pointer-events-none", style: { boxShadow: "inset 0 0 180px rgba(0,0,0,0.6)" } }),
    finished && /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 flex items-center justify-center pointer-events-none" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "text-center px-10 py-6 rounded-lg backdrop-blur-sm",
        style: { background: `${p.bg}cc`, border: `1px solid ${p.accent}55`, color: p.text, boxShadow: `0 0 40px ${p.accent}33` }
      },
      /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, letterSpacing: "0.15em" } }, "THE END"),
      /* @__PURE__ */ React.createElement("div", { className: "text-xs mt-2", style: { opacity: 0.7 } }, "Click anywhere \xB7 press R to replay \xB7 Esc closes")
    )),
    !isPlaying && !finished && translateYRef.current < -4 && /* @__PURE__ */ React.createElement("div", { className: "absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs pointer-events-none", style: { background: `${p.bg}99`, border: `1px solid ${p.accent}33`, color: p.text } }, "\u23F8 Paused \u2014 click to resume")
  ), /* @__PURE__ */ React.createElement("div", { className: "h-1 w-full", style: { background: p.text + "22" } }, /* @__PURE__ */ React.createElement("div", { className: "h-full transition-all duration-200 ease-linear", style: { width: `${progressPct}%`, backgroundColor: p.accent } })), /* @__PURE__ */ React.createElement("div", { className: "py-2 text-center text-xs", style: { color: p.text, opacity: 0.6 } }, "Click or Space pauses \xB7 R restarts \xB7 M mutes pad \xB7 Esc closes"));
});
const KaraokeReaderOverlay = React.memo(({ text, onClose, isOpen, getAudioUrl }) => {
  const { t } = useContext(LanguageContext);
  const [sentences, setSentences] = useState([]);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [sweepPct, setSweepPct] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [theme, setTheme] = useState("warm");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackSpeedRef = useRef(1);
  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
    try {
      if (audioRef.current) audioRef.current.playbackRate = playbackSpeed;
    } catch (e) {
    }
  }, [playbackSpeed]);
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
      audio.playbackRate = playbackSpeedRef.current || 1;
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
        u.rate = 0.95 * (playbackSpeedRef.current || 1);
        u.pitch = 1;
        u.volume = 0.95;
        const estMs = Math.max(1500, sentenceText.length * 60) / (playbackSpeedRef.current || 1);
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
  }, "aria-label": safeT(t, "common.close", "Close"), className: "p-2 rounded-full hover:bg-black/5", style: { color: c.ink } }, /* @__PURE__ */ React.createElement(ArrowLeft, { size: 22 })), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-base" }, safeT(t, "immersive.focus_reader", "Focus Reader")), /* @__PURE__ */ React.createElement("span", { className: "text-xs", style: { color: c.dim } }, "Sentence ", sentenceIdx + 1, " / ", sentences.length, " \xB7 read-along sweep"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 flex-wrap text-xs font-bold" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 cursor-pointer" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: autoAdvance, onChange: (e) => setAutoAdvance(e.target.checked), "aria-label": "Auto-advance to next sentence" }), /* @__PURE__ */ React.createElement("span", { style: { color: c.ink } }, "Auto-advance")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1", role: "group", "aria-label": "Playback speed" }, /* @__PURE__ */ React.createElement("span", { style: { color: c.dim } }, "SPEED"), [0.75, 1, 1.25, 1.5].map((rate) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: rate,
      onClick: () => setPlaybackSpeed(rate),
      "aria-pressed": playbackSpeed === rate,
      title: `Playback speed ${rate}x`,
      className: "px-2 py-1 text-[11px] rounded-full transition-all tabular-nums",
      style: {
        background: playbackSpeed === rate ? c.accent : "transparent",
        color: playbackSpeed === rate ? c.ink : c.dim,
        border: `1px solid ${playbackSpeed === rate ? c.accent : c.dim + "55"}`,
        fontWeight: playbackSpeed === rate ? 800 : 600
      }
    },
    rate,
    "\xD7"
  ))), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { style: { color: c.dim } }, "THEME"), /* @__PURE__ */ React.createElement("select", { "aria-label": "Theme", value: theme, onChange: (e) => setTheme(e.target.value), className: "text-xs rounded px-2 py-1 border", style: { borderColor: c.ink, background: c.bg, color: c.ink } }, /* @__PURE__ */ React.createElement("option", { value: "warm" }, "\u2600\uFE0F Warm"), /* @__PURE__ */ React.createElement("option", { value: "dark" }, "\u{1F319} Dark"), /* @__PURE__ */ React.createElement("option", { value: "sepia" }, "\u{1F4DC} Sepia"))), /* @__PURE__ */ React.createElement(
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
window.AlloModules.FocusReaderOverlay = FocusReaderOverlay;
window.AlloModules.SpeedReaderOverlay = FocusReaderOverlay;
window.AlloModules.BionicChunkReader = FocusReaderOverlay;
window.AlloModules.PerspectiveCrawlOverlay = PerspectiveCrawlOverlay;
window.AlloModules.KaraokeReaderOverlay = KaraokeReaderOverlay;
window.AlloModules.ImmersiveToolbar = ImmersiveToolbar;
window.AlloModules.ImmersiveReaderModule = true;
console.log("[ImmersiveReaderModule] Focus + Crawl + Karaoke + Toolbar registered");
const ImmersiveWord = React.memo(({ wordData, settings, onClick, isActive }) => {
  const { t } = useContext(LanguageContext);
  const isSyllableMode = settings.showSyllables && wordData.pos !== "markdown" && wordData.pos !== "newline";
  const isPosHighlighted = wordData.pos === "noun" && settings.showNouns || wordData.pos === "verb" && settings.showVerbs || wordData.pos === "adj" && settings.showAdjectives || wordData.pos === "adv" && settings.showAdverbs;
  const getPosLabel = (posCode) => {
    return t(`immersive.pos.${posCode}`) || posCode;
  };
  let content = wordData.text;
  if (isSyllableMode) {
    const syllables = wordData.syllables || [wordData.text];
    if (syllables.length > 1) {
      content = syllables.map((syl, idx) => /* @__PURE__ */ React.createElement("span", { key: idx }, /* @__PURE__ */ React.createElement("span", { className: !isPosHighlighted && idx % 2 !== 0 ? "text-rose-600" : "" }, syl), idx < syllables.length - 1 && /* @__PURE__ */ React.createElement("span", { className: `font-black mx-[2px] ${isPosHighlighted ? "opacity-60" : "text-slate-600"}` }, "\xB7")));
    }
  }
  let className = "inline-block transition-all duration-200 cursor-pointer ";
  if (isActive) {
    className += "font-semibold ";
  } else {
    if (wordData.pos === "noun" && settings.showNouns) {
      className += "bg-blue-100 text-blue-900 rounded px-1 mx-0.5 border-b-2 border-blue-400 font-bold ";
    } else if (wordData.pos === "verb" && settings.showVerbs) {
      className += "bg-red-100 text-red-900 rounded px-1 mx-0.5 border-b-2 border-red-400 font-bold ";
    } else if (wordData.pos === "adj" && settings.showAdjectives) {
      className += "bg-green-100 text-green-900 rounded px-1 mx-0.5 border-b-2 border-green-400 font-bold ";
    } else if (wordData.pos === "adv" && settings.showAdverbs) {
      className += "bg-purple-100 text-purple-900 rounded px-1 mx-0.5 border-b-2 border-purple-400 font-bold ";
    }
  }
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(e);
    }
  };
  if (wordData.pos === "markdown") {
    return null;
  }
  const headerMatch = wordData.pos?.match?.(/^header(\d)$/);
  const isHeader = !!headerMatch;
  if (headerMatch) {
    const level = parseInt(headerMatch[1]);
    const headerSizes = {
      1: "text-3xl font-bold",
      2: "text-2xl font-bold",
      3: "text-xl font-bold",
      4: "text-lg font-semibold",
      5: "text-base font-semibold",
      6: "text-base font-semibold italic"
    };
    const sizeClass = headerSizes[level] || "font-bold";
    className += ` ${sizeClass} text-slate-800 block mt-4 mb-2 `;
  }
  if (wordData.pos === "bold") {
    className += " font-bold ";
  }
  if (wordData.pos === "italic") {
    className += " italic ";
  }
  return /* @__PURE__ */ React.createElement(
    "span",
    {
      onClick,
      title: isPosHighlighted ? getPosLabel(wordData.pos) : null,
      className,
      style: {
        fontSize: isHeader ? `${settings.textSize * 1.15}px` : `${settings.textSize}px`,
        lineHeight: settings.lineHeight,
        whiteSpace: "pre-wrap"
      }
    },
    content
  );
});
window.AlloModules = window.AlloModules || {};
window.AlloModules.SpeedReaderOverlay = (typeof SpeedReaderOverlay !== 'undefined') ? SpeedReaderOverlay : null;
window.AlloModules.BionicChunkReader = (typeof BionicChunkReader !== 'undefined') ? BionicChunkReader : null;
window.AlloModules.PerspectiveCrawlOverlay = (typeof PerspectiveCrawlOverlay !== 'undefined') ? PerspectiveCrawlOverlay : null;
window.AlloModules.KaraokeReaderOverlay = (typeof KaraokeReaderOverlay !== 'undefined') ? KaraokeReaderOverlay : null;
window.AlloModules.ImmersiveToolbar = (typeof ImmersiveToolbar !== 'undefined') ? ImmersiveToolbar : null;
window.AlloModules.ImmersiveWord = (typeof ImmersiveWord !== 'undefined') ? ImmersiveWord : null;
window.AlloModules.ImmersiveReaderModule = true;
console.log('[ImmersiveReaderModule] 6 components registered');
})();
