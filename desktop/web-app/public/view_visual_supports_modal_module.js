/**
 * AlloFlow VisualSupportsModal Module
 * Auto-generated. Source: view_visual_supports_modal_source.jsx
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.VisualSupportsModal) {
    console.log('[CDN] VisualSupportsModal already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[VisualSupportsModal] React not found on window'); return; }

function vsTr(t, key, fallback, params) {
  let text = "";
  try {
    text = typeof t === "function" ? t("visuals.supports_modal." + key) : "";
  } catch (e) {
  }
  if (typeof text !== "string" || !text || text === "visuals.supports_modal." + key) text = fallback;
  Object.keys(params || {}).forEach(function(name) {
    text = text.split("{" + name + "}").join(String(params[name]));
  });
  return text;
}
function PausableImage(props) {
  const { src, alt, style, globalPaused } = props;
  const tr = props.tr || function(key, fallback, params) {
    return vsTr(null, key, fallback, params);
  };
  const name = alt || tr("image", "image");
  const isAnimated = React.useMemo(function() {
    if (!src) return false;
    if (/^data:image\/gif/i.test(src)) return true;
    if (/\.gif(\?|#|$)/i.test(src)) return true;
    return false;
  }, [src]);
  const [localPaused, setLocalPaused] = React.useState(false);
  const [frozenFrame, setFrozenFrame] = React.useState(null);
  const imgRef = React.useRef(null);
  const captureRef = React.useRef(false);
  const paused = isAnimated && (globalPaused || localPaused);
  const hiddenWhilePaused = paused && !frozenFrame;
  React.useEffect(function() {
    setLocalPaused(false);
    setFrozenFrame(null);
    captureRef.current = false;
  }, [src]);
  const handleLoad = React.useCallback(function() {
    if (!isAnimated || captureRef.current || !imgRef.current) return;
    try {
      const img = imgRef.current;
      const w = img.naturalWidth || img.width || 100;
      const h = img.naturalHeight || img.height || 100;
      const canvas = document.createElement("canvas");
      canvas.setAttribute("aria-hidden", "true");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0);
      setFrozenFrame(canvas.toDataURL("image/png"));
      captureRef.current = true;
    } catch (e) {
    }
  }, [isAnimated]);
  const [crossOriginRetry, setCrossOriginRetry] = React.useState(false);
  React.useEffect(() => {
    setCrossOriginRetry(false);
  }, [src]);
  if (!isAnimated) {
    return /* @__PURE__ */ React.createElement("img", { src, alt, style, loading: "lazy", decoding: "async" });
  }
  const wrapperStyle = Object.assign(
    { position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
    style || {}
  );
  const imgInlineStyle = { width: "100%", height: "100%", objectFit: "contain", display: "block" };
  return /* @__PURE__ */ React.createElement("div", { style: wrapperStyle }, /* @__PURE__ */ React.createElement(
    "img",
    {
      ref: imgRef,
      src: paused && frozenFrame ? frozenFrame : src,
      alt,
      onLoad: handleLoad,
      onError: () => {
        if (!crossOriginRetry && src && !src.startsWith("data:")) setCrossOriginRetry(true);
      },
      crossOrigin: src && src.startsWith("data:") || crossOriginRetry ? void 0 : "anonymous",
      loading: "lazy",
      decoding: "async",
      style: Object.assign({}, imgInlineStyle, { visibility: hiddenWhilePaused ? "hidden" : "visible" })
    }
  ), hiddenWhilePaused && /* @__PURE__ */ React.createElement(
    "span",
    {
      role: "img",
      "aria-label": tr("paused_label", "Paused animation: {name}", { name }),
      className: "bg-slate-50 text-slate-600",
      style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }
    },
    "\u23F8"
  ), isAnimated && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: (e) => {
        e.stopPropagation();
        setLocalPaused((p) => !p);
      },
      disabled: !!globalPaused,
      "aria-pressed": paused,
      "aria-label": globalPaused ? tr("global_paused_label", "Animation paused by the global setting: {name}", { name }) : paused ? tr("play_label", "Play animation: {name}", { name }) : tr("pause_label", "Pause animation: {name}", { name }),
      title: globalPaused ? tr("global_paused_title", "Animation paused by the global setting") : paused ? tr("resume_title", "Resume animation") : tr("pause_title", "Pause animation"),
      className: "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-70",
      style: {
        position: "absolute",
        top: 2,
        right: 2,
        width: 24,
        height: 24,
        padding: 0,
        border: "none",
        borderRadius: "50%",
        background: "rgba(0,0,0,0.6)",
        color: "#fff",
        fontSize: 11,
        lineHeight: 1,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.4)"
      }
    },
    paused ? "\u25B6" : "\u23F8"
  ));
}
function visualSupportText(value, fallback) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}
function safeVisualSupportImageUrl(raw) {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/=\s]+$/i.test(trimmed)) return trimmed;
  if (/^data:image\/svg\+xml/i.test(trimmed)) {
    let decoded = "";
    try {
      const comma = trimmed.indexOf(",");
      if (comma < 0) return "";
      const meta = trimmed.slice(0, comma);
      const body = trimmed.slice(comma + 1);
      decoded = /;base64/i.test(meta) ? atob(body) : decodeURIComponent(body);
    } catch (_) {
      return "";
    }
    if (/<script\b|<foreignObject\b|<(?:iframe|object|embed|meta|base|link|animate|set)\b|<!ENTITY|&#|\bon[a-z]+\s*=|(?:xlink:)?href\s*=\s*["']?\s*(?:javascript:|data:)|javascript:|@import|expression\s*\(/i.test(decoded)) return "";
    return trimmed;
  }
  if (/^blob:/i.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" && !parsed.username && !parsed.password) return parsed.href;
  } catch (_) {
  }
  return "";
}
function readVisualSupportSnapshot() {
  try {
    const explicitProfileId = arguments.length > 0 && typeof arguments[0] === "string" && arguments[0].trim() ? arguments[0].trim() : null;
    let profiles = [];
    try {
      const parsedProfiles = JSON.parse(localStorage.getItem("alloStudentProfiles") || "[]");
      profiles = Array.isArray(parsedProfiles) ? parsedProfiles : [];
    } catch (e) {
    }
    let savedProfileId = null;
    try {
      savedProfileId = JSON.parse(localStorage.getItem("alloActiveProfileId") || "null");
    } catch (e) {
    }
    const profileId = explicitProfileId || (savedProfileId && profiles.some((profile) => profile && profile.id === savedProfileId) ? savedProfileId : profiles[0] && profiles[0].id ? profiles[0].id : "default");
    const readCollection = function(base) {
      try {
        const scoped = localStorage.getItem(base + "__" + profileId);
        const parsed = JSON.parse((scoped != null ? scoped : localStorage.getItem(base)) || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    };
    const boards = readCollection("alloSymbolBoards").map(function(board, boardIndex) {
      const safeBoard = board && typeof board === "object" ? board : {};
      const words = Array.isArray(safeBoard.words) ? safeBoard.words : [];
      const colsValue = Number.parseInt(safeBoard.cols, 10);
      return {
        id: visualSupportText(safeBoard.id, "board-" + boardIndex),
        title: visualSupportText(safeBoard.title, "Untitled Board"),
        cols: Number.isFinite(colsValue) ? Math.max(1, Math.min(colsValue, 6)) : 4,
        words: words.map(function(word, wordIndex) {
          const safeWord = word && typeof word === "object" ? word : {};
          return {
            id: visualSupportText(safeWord.id, "word-" + wordIndex),
            label: visualSupportText(safeWord.label, "Unlabeled symbol"),
            category: ["noun", "verb", "adjective", "other"].includes(safeWord.category) ? safeWord.category : "other",
            image: safeVisualSupportImageUrl(safeWord.image)
          };
        })
      };
    });
    const schedules = readCollection("alloSchedules").map(function(schedule, scheduleIndex) {
      const safeSchedule = schedule && typeof schedule === "object" ? schedule : {};
      const items = Array.isArray(safeSchedule.items) ? safeSchedule.items : [];
      return {
        id: visualSupportText(safeSchedule.id, "schedule-" + scheduleIndex),
        title: visualSupportText(safeSchedule.title, "Untitled Schedule"),
        nowId: typeof safeSchedule.nowId === "string" ? safeSchedule.nowId : "",
        items: items.map(function(item, itemIndex) {
          const safeItem = item && typeof item === "object" ? item : {};
          return {
            id: visualSupportText(safeItem.id, "step-" + itemIndex),
            label: visualSupportText(safeItem.label, "Unlabeled step"),
            image: safeVisualSupportImageUrl(safeItem.image),
            complete: !!safeItem.complete
          };
        })
      };
    });
    return { profileId, boards, schedules };
  } catch (e) {
    return { profileId: "default", boards: [], schedules: [] };
  }
}
function persistVisualScheduleProgress(profileId, scheduleId, nextNowId, nextCompletedMap) {
  try {
    const storage = typeof window !== "undefined" ? window.localStorage : null;
    if (!storage || !scheduleId) return false;
    const scopedKey = "alloSchedules__" + (profileId || "default");
    const scopedRaw = storage.getItem(scopedKey);
    const fallbackRaw = scopedRaw != null ? scopedRaw : storage.getItem("alloSchedules");
    const parsed = JSON.parse(fallbackRaw || "[]");
    if (!Array.isArray(parsed)) return false;
    let changed = false;
    const updated = parsed.map(function(sched) {
      if (!sched || typeof sched !== "object" || sched.id !== scheduleId) return sched;
      changed = true;
      const items = Array.isArray(sched.items) ? sched.items.map(function(it, idx) {
        if (!it || typeof it !== "object") return it;
        const hasIdFlag = nextCompletedMap && Object.prototype.hasOwnProperty.call(nextCompletedMap, it.id);
        const complete = hasIdFlag ? !!nextCompletedMap[it.id] : !!(nextCompletedMap && Object.prototype.hasOwnProperty.call(nextCompletedMap, idx) ? nextCompletedMap[idx] : it.complete);
        return Object.assign({}, it, { complete });
      }) : [];
      return Object.assign({}, sched, {
        nowId: typeof nextNowId === "string" ? nextNowId : sched.nowId || "",
        items
      });
    });
    if (!changed) return false;
    storage.setItem(scopedKey, JSON.stringify(updated));
    return true;
  } catch (e) {
    return false;
  }
}
function VisualSupportBoardCard(props) {
  const { board, cardIndex, categoryBackgrounds, pauseAnimations, onSpeak } = props;
  const tr = props.tr || function(key, fallback, params) {
    return vsTr(null, key, fallback, params);
  };
  const [activeCategory, setActiveCategory] = React.useState("all");
  const [phraseOpen, setPhraseOpen] = React.useState(false);
  const [phraseWords, setPhraseWords] = React.useState([]);
  const categoryOrder = ["noun", "verb", "adjective", "other"];
  const categoryLabels = {
    noun: tr("cat_noun", "Nouns"),
    verb: tr("cat_verb", "Verbs"),
    adjective: tr("cat_adjective", "Describing"),
    other: tr("cat_other", "Other")
  };
  const availableCategories = categoryOrder.filter((cat) => board.words.some((w) => w.category === cat));
  const effectiveCategory = activeCategory === "all" || availableCategories.includes(activeCategory) ? activeCategory : "all";
  const filteredWords = effectiveCategory === "all" ? board.words : board.words.filter((w) => w.category === effectiveCategory);
  const addPhraseWord = (word) => {
    setPhraseWords((prev) => prev.length >= 12 ? prev : prev.concat({ id: word.id + "-" + prev.length, label: word.label }));
  };
  const speakPhrase = () => {
    const joined = phraseWords.map((w) => w.label).join(" ").trim();
    if (!joined) return;
    onSpeak(joined, tr("phrase_description", "built phrase"));
  };
  return /* @__PURE__ */ React.createElement("section", { className: "border border-slate-400 rounded-xl overflow-hidden", "aria-labelledby": "visual-support-board-" + cardIndex }, /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h3", { id: "visual-support-board-" + cardIndex, className: "font-semibold text-slate-700 text-sm" }, board.title), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-medium text-slate-600" }, board.words.length === 1 ? tr("symbol_count_one", "{count} symbol", { count: 1 }) : tr("symbol_count", "{count} symbols", { count: board.words.length }))), board.words.length >= 2 && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-vs-phrase-strip-toggle": "true",
      "aria-pressed": phraseOpen,
      onClick: () => setPhraseOpen((open) => !open),
      className: "min-h-11 px-3 rounded-lg border text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-700 " + (phraseOpen ? "border-purple-700 bg-purple-700 text-white hover:bg-purple-800" : "border-purple-300 bg-white text-purple-800 hover:bg-purple-50")
    },
    phraseOpen ? tr("close_phrase_strip", "\u2713 Phrase strip") : tr("open_phrase_strip", "\u{1F4AC} Phrase strip")
  )), availableCategories.length >= 2 && /* @__PURE__ */ React.createElement("div", { "data-vs-board-cat-filter": "true", className: "px-3 pt-2.5 flex flex-wrap items-center gap-1.5", role: "group", "aria-label": tr("filter_categories", "Filter symbols by word type") }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-vs-cat-pill": "all",
      "aria-pressed": effectiveCategory === "all",
      onClick: () => setActiveCategory("all"),
      className: "min-h-11 px-3 rounded-lg border text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-700 " + (effectiveCategory === "all" ? "border-purple-700 bg-purple-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")
    },
    tr("cat_all", "All ({count})", { count: board.words.length })
  ), availableCategories.map((cat) => {
    const count = board.words.filter((w) => w.category === cat).length;
    const selected = effectiveCategory === cat;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: cat,
        type: "button",
        "data-vs-cat-pill": cat,
        "aria-pressed": selected,
        onClick: () => setActiveCategory(cat),
        className: "min-h-11 px-3 rounded-lg border text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-700 " + (selected ? "border-purple-700 bg-purple-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")
      },
      categoryLabels[cat],
      " (",
      count,
      ")"
    );
  })), phraseOpen && /* @__PURE__ */ React.createElement("div", { "data-vs-phrase-strip": "true", className: "mx-3 mt-2.5 rounded-xl border border-purple-200 bg-purple-50/70 p-3 space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1.5 min-h-[2.25rem]" }, phraseWords.length === 0 ? /* @__PURE__ */ React.createElement("span", { className: "text-xs text-purple-900" }, tr("phrase_empty_hint", 'Choose "+ Add" on symbols below to build a phrase to speak aloud.')) : phraseWords.map((entry, idx) => /* @__PURE__ */ React.createElement("span", { key: entry.id, "data-vs-phrase-chip": idx, className: "inline-flex items-center rounded-lg border border-purple-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800" }, entry.label))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-vs-phrase-speak": "true",
      disabled: phraseWords.length === 0,
      onClick: speakPhrase,
      className: "min-h-11 rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-800 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-700"
    },
    "\u{1F50A} ",
    tr("speak_phrase", "Speak phrase")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-vs-phrase-undo": "true",
      disabled: phraseWords.length === 0,
      onClick: () => setPhraseWords((prev) => prev.slice(0, -1)),
      className: "min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-700"
    },
    "\u232B ",
    tr("phrase_undo", "Undo")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-vs-phrase-clear": "true",
      disabled: phraseWords.length === 0,
      onClick: () => setPhraseWords([]),
      className: "min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-700"
    },
    tr("phrase_clear", "Clear")
  ))), board.words.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "p-4 text-sm text-slate-600", role: "status" }, tr("board_empty", "This board has no symbols yet.")) : /* @__PURE__ */ React.createElement("div", { className: "p-3", role: "list", "aria-label": tr("board_symbols", "{title} symbols", { title: board.title }), style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))", gap: 8 } }, filteredWords.map((word, wordIndex) => {
    const catClass = word.category === "noun" ? "bg-amber-50 border border-amber-200" : word.category === "verb" ? "bg-emerald-50 border border-emerald-200" : word.category === "adjective" ? "bg-sky-50 border border-sky-200" : "bg-slate-100 border border-slate-200";
    return /* @__PURE__ */ React.createElement("div", { key: word.id + "-" + wordIndex, role: "listitem", className: catClass + " rounded-lg p-2 min-w-0 flex flex-col items-center gap-1.5" }, word.image ? /* @__PURE__ */ React.createElement(PausableImage, { src: word.image, alt: word.label, globalPaused: pauseAnimations, tr, style: { width: 64, height: 64 } }) : /* @__PURE__ */ React.createElement("div", { "aria-hidden": "true", className: "w-16 h-16 flex items-center justify-center text-3xl text-slate-500" }, "?"), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-center text-slate-900 leading-snug", style: { overflowWrap: "anywhere" } }, word.label), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-center gap-1" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => onSpeak(word.label, word.label), "aria-label": tr("read_symbol", "Read symbol aloud: {label}", { label: word.label }), className: "min-h-11 min-w-11 px-2 rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-700", title: tr("read_symbol_title", "Read symbol aloud") }, tr("read", "Read")), phraseOpen && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "data-vs-phrase-add": word.id,
        onClick: () => addPhraseWord(word),
        "aria-label": tr("add_to_phrase", "Add {label} to phrase strip", { label: word.label }),
        className: "min-h-11 rounded-lg border border-purple-400 bg-white px-2 text-xs font-bold text-purple-900 hover:bg-purple-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-700"
      },
      "+ ",
      tr("add_word", "Add")
    )));
  })));
}
function getInitialScheduleProgress(schedule) {
  const items = schedule && Array.isArray(schedule.items) ? schedule.items : [];
  const completed = {};
  items.forEach(function(item, index) {
    if (item.complete) completed[index] = true;
  });
  let current = items.findIndex(function(item) {
    return item.id === schedule.nowId && !item.complete;
  });
  if (current < 0) current = items.findIndex(function(item) {
    return !item.complete;
  });
  if (current < 0) current = 0;
  return { current, completed };
}
function VisualSupportScheduleCard(props) {
  const { schedule, cardIndex, progress, pauseAnimations, onSpeak, onSetCurrent, onToggleComplete, onResetSchedule } = props;
  const tr = props.tr || function(key, fallback, params) {
    return vsTr(null, key, fallback, params);
  };
  const [focusNowNext, setFocusNowNext] = React.useState(false);
  const [armReset, setArmReset] = React.useState(false);
  React.useEffect(() => {
    if (!armReset) return void 0;
    const onKey = (e) => {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setArmReset(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [armReset]);
  const initialProgress = getInitialScheduleProgress(schedule);
  const safeProgress = progress || initialProgress;
  const currentStep = Math.max(0, Math.min(Number.isInteger(safeProgress.current) ? safeProgress.current : initialProgress.current, Math.max(0, schedule.items.length - 1)));
  const completed = safeProgress.completed || initialProgress.completed;
  const completedCount = schedule.items.reduce((acc, _, idx) => acc + (completed[idx] ? 1 : 0), 0);
  const allDone = schedule.items.length > 0 && completedCount === schedule.items.length;
  const progressPct = schedule.items.length > 0 ? Math.round(completedCount / schedule.items.length * 100) : 0;
  const nowItem = schedule.items[currentStep] || null;
  const nextStepIndex = schedule.items.findIndex((_, idx) => idx > currentStep && !completed[idx]);
  const fallbackNextIndex = nextStepIndex >= 0 ? nextStepIndex : schedule.items.findIndex((_, idx) => idx !== currentStep && !completed[idx]);
  const nextItem = fallbackNextIndex >= 0 ? schedule.items[fallbackNextIndex] : null;
  return /* @__PURE__ */ React.createElement("section", { className: "border border-slate-400 rounded-xl overflow-hidden", "aria-labelledby": "visual-support-schedule-" + cardIndex }, /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 px-4 py-2 border-b border-slate-200 space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { id: "visual-support-schedule-" + cardIndex, className: "font-semibold text-slate-700 text-sm" }, schedule.title), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-600 mt-0.5" }, schedule.items.length === 0 ? tr("no_steps", "No steps") : tr("now_step", "Now: step {n} of {total}", { n: currentStep + 1, total: schedule.items.length }) + " \xB7 " + tr("steps_done_count", "{done}/{total} done", { done: completedCount, total: schedule.items.length }))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1.5" }, schedule.items.length >= 2 && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-vs-first-then-toggle": "true",
      "aria-pressed": focusNowNext,
      onClick: () => setFocusNowNext((v) => !v),
      className: "min-h-11 px-3 rounded-lg border text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-700 " + (focusNowNext ? "border-purple-700 bg-purple-700 text-white hover:bg-purple-800" : "border-purple-300 bg-white text-purple-800 hover:bg-purple-50")
    },
    focusNowNext ? tr("show_all_steps", "Show all steps") : tr("first_then_mode", "First \u2192 Then")
  ), schedule.items.length > 0 && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => onSpeak(schedule.items.map((item, index) => tr("step_spoken", "Step {n}: {label}", { n: index + 1, label: item.label })).join(". "), schedule.title), className: "min-h-11 px-3 rounded-lg border border-purple-300 bg-white text-xs font-semibold text-purple-800 hover:bg-purple-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-700", "aria-label": tr("read_all_steps", "Read all steps in {title}", { title: schedule.title }) }, tr("read_all", "Read all")), completedCount > 0 && typeof onResetSchedule === "function" && (armReset ? /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-vs-schedule-reset-confirm": "true",
      onClick: () => {
        setArmReset(false);
        onResetSchedule(schedule);
      },
      className: "min-h-11 px-3 rounded-lg border border-rose-600 bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-700"
    },
    tr("confirm_reset_schedule", "Confirm reset?")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setArmReset(false),
      className: "min-h-11 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-700"
    },
    tr("cancel", "Cancel")
  )) : /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-vs-schedule-reset": "true",
      onClick: () => setArmReset(true),
      className: "min-h-11 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-700",
      "aria-label": tr("reset_schedule_aria", "Reset completed steps in {title}", { title: schedule.title })
    },
    "\u21BA ",
    tr("reset_schedule", "Reset")
  )))), schedule.items.length > 0 && /* @__PURE__ */ React.createElement(
    "div",
    {
      "data-vs-schedule-progress": "true",
      role: "progressbar",
      "aria-label": tr("schedule_progress_aria", "{title} progress", { title: schedule.title }),
      "aria-valuenow": completedCount,
      "aria-valuemin": 0,
      "aria-valuemax": schedule.items.length,
      className: "h-2 w-full overflow-hidden rounded-full bg-slate-200"
    },
    /* @__PURE__ */ React.createElement("div", { className: "h-full rounded-full transition-all motion-reduce:transition-none " + (allDone ? "bg-emerald-600" : "bg-purple-600"), style: { width: progressPct + "%" } })
  )), schedule.items.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "p-4 text-sm text-slate-600", role: "status" }, tr("schedule_empty", "This schedule has no steps yet.")) : focusNowNext && schedule.items.length >= 2 ? /* @__PURE__ */ React.createElement("div", { "data-vs-first-then-view": "true", className: "p-4 space-y-3 bg-purple-50/40" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border-2 border-purple-600 bg-white p-4 flex flex-col items-center gap-3 text-center" }, /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-purple-700 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white" }, allDone ? tr("all_done_badge", "ALL DONE") : tr("first_now_badge", "FIRST \xB7 NOW")), nowItem && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "w-full h-28 border border-slate-300 rounded-xl overflow-hidden flex items-center justify-center bg-slate-50" }, nowItem.image ? /* @__PURE__ */ React.createElement(PausableImage, { src: nowItem.image, alt: nowItem.label, globalPaused: pauseAnimations, tr, style: { width: "100%", height: "100%" } }) : /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", className: "text-3xl text-slate-500" }, allDone ? "\u2713" : "?")), /* @__PURE__ */ React.createElement("p", { className: "text-base font-bold text-slate-900" }, nowItem.label), !completed[currentStep] ? /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-vs-complete-current": "true",
      onClick: () => onToggleComplete(schedule, currentStep),
      className: "min-h-11 w-full rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
    },
    "\u2713 ",
    tr("done_next_step", "Done \u2014 Next step")
  ) : /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold text-emerald-800" }, tr("step_completed_msg", "\u2713 Step completed!")))), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border-2 border-slate-300 bg-white p-4 flex flex-col items-center gap-3 text-center" }, /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-slate-700 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white" }, tr("then_next_badge", "THEN \xB7 NEXT")), nextItem ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "w-full h-28 border border-slate-300 rounded-xl overflow-hidden flex items-center justify-center bg-slate-50" }, nextItem.image ? /* @__PURE__ */ React.createElement(PausableImage, { src: nextItem.image, alt: nextItem.label, globalPaused: pauseAnimations, tr, style: { width: "100%", height: "100%" } }) : /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", className: "text-3xl text-slate-500" }, "?")), /* @__PURE__ */ React.createElement("p", { className: "text-base font-bold text-slate-800" }, nextItem.label)) : /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex flex-col items-center justify-center py-6 text-emerald-800" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", className: "text-3xl mb-1" }, "\u{1F389}"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold" }, allDone ? tr("schedule_all_complete", "Every step is complete!") : tr("last_step_hint", "Final step \u2014 all done after this!"))))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-center gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-vs-read-now-next": "true",
      onClick: () => {
        const spoken = nextItem ? tr("read_first_then_both", "First: {now}. Then: {next}.", { now: nowItem ? nowItem.label : "", next: nextItem.label }) : tr("read_first_only", "Now: {now}.", { now: nowItem ? nowItem.label : "" });
        onSpeak(spoken, schedule.title);
      },
      className: "min-h-11 rounded-lg border border-purple-300 bg-white px-3 py-1.5 text-xs font-semibold text-purple-800 hover:bg-purple-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-700"
    },
    "\u{1F50A} ",
    tr("read_now_next", "Read First & Then")
  ))) : /* @__PURE__ */ React.createElement("ol", { role: "list", "aria-label": tr("schedule_steps", "{title} ordered steps", { title: schedule.title }), className: "p-3", style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(138px, 1fr))", gap: 10 } }, schedule.items.map((item, itemIndex) => {
    const isCurrent = itemIndex === currentStep;
    const isComplete = !!completed[itemIndex];
    return /* @__PURE__ */ React.createElement("li", { key: item.id + "-" + itemIndex, "aria-current": isCurrent ? "step" : void 0, className: (isCurrent ? "border-[3px] border-purple-600 " : "border-2 border-slate-300 ") + (isComplete ? "bg-emerald-50" : isCurrent ? "bg-purple-50" : "bg-white") + " rounded-xl p-2 min-w-0 flex flex-col items-stretch gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-extrabold " + (isCurrent ? "text-purple-800" : "text-slate-700") }, tr("step_badge", "STEP {n}", { n: itemIndex + 1 })), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-extrabold " + (isComplete ? "text-emerald-800" : isCurrent ? "text-purple-800" : "text-slate-600") }, isComplete ? tr("done", "DONE") : isCurrent ? tr("now", "NOW") : tr("next", "NEXT"))), /* @__PURE__ */ React.createElement("div", { className: "w-full h-24 border border-slate-300 rounded-lg overflow-hidden flex items-center justify-center bg-slate-50" }, item.image ? /* @__PURE__ */ React.createElement(PausableImage, { src: item.image, alt: item.label, globalPaused: pauseAnimations, tr, style: { width: "100%", height: "100%" } }) : /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", className: "text-3xl text-slate-500" }, "?")), /* @__PURE__ */ React.createElement("span", { className: "text-[13px] font-bold text-center text-slate-900 leading-snug", style: { overflowWrap: "anywhere" } }, item.label), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1 mt-auto" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => onSetCurrent(schedule, itemIndex), disabled: isCurrent, className: "min-h-11 rounded-lg border border-purple-300 bg-white px-2 text-xs font-semibold text-purple-800 disabled:bg-purple-100 disabled:text-purple-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-700", "aria-label": isCurrent ? tr("is_current", "{label} is the current step", { label: item.label }) : tr("make_current", "Make {label} the current step", { label: item.label }) }, isCurrent ? tr("current_step", "Current step") : tr("set_now", "Set as now")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => onToggleComplete(schedule, itemIndex), "aria-pressed": isComplete, className: "min-h-11 rounded-lg border border-emerald-300 bg-white px-2 text-xs font-semibold text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700" }, isComplete ? tr("mark_not_done", "Mark not done") : tr("mark_done", "Mark done"))));
  })));
}
function VisualSupportsModal(props) {
  const { setShowVisualSupports, setVsTab, showVisualSupports, vsTab } = props;
  const tRef = React.useRef(props.t);
  tRef.current = props.t;
  const tr = function(key, fallback, params) {
    return vsTr(tRef.current, key, fallback, params);
  };
  const tabFocusTimerRef = React.useRef(null);
  React.useEffect(function() {
    return function() {
      if (tabFocusTimerRef.current !== null) {
        clearTimeout(tabFocusTimerRef.current);
        tabFocusTimerRef.current = null;
      }
    };
  }, []);
  const handleTabKeyDown = function(event) {
    if (event.isComposing || event.nativeEvent && event.nativeEvent.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey) return;
    const tabs = ["boards", "schedules"];
    const current = tabs.indexOf(vsTab);
    let next = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (current + 1) % tabs.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    if (next === null) return;
    event.preventDefault();
    setVsTab(tabs[next]);
    if (tabFocusTimerRef.current !== null) clearTimeout(tabFocusTimerRef.current);
    tabFocusTimerRef.current = window.setTimeout(function() {
      tabFocusTimerRef.current = null;
      const tab = document.getElementById("visual-supports-tab-" + tabs[next]);
      if (tab && tab.isConnected) tab.focus();
    }, 0);
  };
  const dialogRef = React.useRef(null);
  React.useEffect(function() {
    const dialog = dialogRef.current;
    if (!dialog) return void 0;
    const previousFocus = document.activeElement;
    const backgroundState = [];
    const seenNodes = /* @__PURE__ */ new Set();
    for (let branch = dialog; branch && branch !== document.body && branch.parentElement; branch = branch.parentElement) {
      Array.from(branch.parentElement.children).forEach(function(sibling) {
        if (sibling === branch || seenNodes.has(sibling) || /^(?:SCRIPT|STYLE|LINK|TEMPLATE)$/i.test(sibling.tagName) || typeof sibling.matches === "function" && sibling.matches('[aria-live], [role="status"], [role="alert"], [data-toast-region]')) return;
        seenNodes.add(sibling);
        backgroundState.push({
          node: sibling,
          hadInert: sibling.hasAttribute("inert"),
          ariaHidden: sibling.getAttribute("aria-hidden")
        });
        sibling.setAttribute("inert", "");
        sibling.setAttribute("aria-hidden", "true");
      });
    }
    const alloScrollLock = window.__alloScrollLockState || (window.__alloScrollLockState = { count: 0, prev: "" });
    const alloScrollLocked = !!document.body;
    if (alloScrollLocked && ++alloScrollLock.count === 1) {
      alloScrollLock.prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    const trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    const trap = { root: dialog };
    trapStack.push(trap);
    const isTopTrap = function() {
      const top = trapStack[trapStack.length - 1];
      return top === trap || Boolean(top && top.root && top.root.contains(dialog));
    };
    const getFocusable = function() {
      return Array.from(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')).filter(function(element) {
        if (element.hidden || element.getAttribute("aria-hidden") === "true" || element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
        const closedDetails = element.closest("details:not([open])");
        if (closedDetails && !(element.tagName === "SUMMARY" && element.parentElement === closedDetails)) return false;
        if (typeof window.getComputedStyle === "function") {
          for (let cur = element; cur && cur !== dialog; cur = cur.parentElement) {
            const style = window.getComputedStyle(cur);
            if (style && (style.display === "none" || style.visibility === "hidden")) return false;
          }
        }
        return true;
      });
    };
    const first = getFocusable()[0];
    (first || dialog).focus();
    const onKeyDown = function(event) {
      if (!dialog.isConnected || event.isComposing || event.keyCode === 229 || !isTopTrap()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setShowVisualSupports(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const firstItem = focusable[0];
      const lastItem = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement) || document.activeElement === dialog) {
        event.preventDefault();
        (event.shiftKey ? lastItem : firstItem).focus();
      } else if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return function() {
      document.removeEventListener("keydown", onKeyDown);
      if (alloScrollLocked) {
        alloScrollLock.count = Math.max(0, alloScrollLock.count - 1);
        if (alloScrollLock.count === 0 && document.body) document.body.style.overflow = alloScrollLock.prev;
      }
      backgroundState.forEach(function({ node, hadInert, ariaHidden }) {
        if (!node || !node.isConnected) return;
        if (!hadInert) node.removeAttribute("inert");
        if (ariaHidden == null) node.removeAttribute("aria-hidden");
        else if (ariaHidden !== "true") node.setAttribute("aria-hidden", ariaHidden);
      });
      let wasTopTrap = true;
      for (let i = trapStack.length - 1; i >= 0 && trapStack[i] !== trap; i--) {
        const other = trapStack[i] && trapStack[i].root;
        if (!other || !(other === dialog || typeof other.contains === "function" && (other.contains(dialog) || dialog.contains(other)))) {
          wasTopTrap = false;
          break;
        }
      }
      const trapIndex = trapStack.indexOf(trap);
      if (trapIndex !== -1) trapStack.splice(trapIndex, 1);
      if (wasTopTrap && previousFocus && previousFocus !== document.body && previousFocus.isConnected) {
        if (typeof previousFocus.focus === "function") previousFocus.focus();
      }
    };
  }, [setShowVisualSupports]);
  const explicitProfileId = props.activeStudentProfileId || typeof window !== "undefined" && window.__alloActiveStudentProfileId || null;
  const [supportData, setSupportData] = React.useState(() => readVisualSupportSnapshot(explicitProfileId));
  const [searchQuery, setSearchQuery] = React.useState("");
  const [scheduleProgress, setScheduleProgress] = React.useState({});
  const scheduleProgressRef = React.useRef(scheduleProgress);
  scheduleProgressRef.current = scheduleProgress;
  const [statusMessage, setStatusMessage] = React.useState("");
  const activeProfileId = explicitProfileId || supportData.profileId || "default";
  const refreshSupports = React.useCallback(function() {
    setSupportData(readVisualSupportSnapshot(explicitProfileId));
    setScheduleProgress({});
  }, [explicitProfileId]);
  React.useEffect(function() {
    if (showVisualSupports !== false) refreshSupports();
    const handleStorage = function(event) {
      if (!event || !event.key || /^(alloSymbolBoards|alloSchedules|alloStudentProfiles|alloActiveProfileId)/.test(event.key)) {
        refreshSupports();
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("allo-visual-supports-updated", refreshSupports);
    return function() {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("allo-visual-supports-updated", refreshSupports);
    };
  }, [showVisualSupports, refreshSupports]);
  const vsBoards = supportData.boards;
  const vsSchedules = supportData.schedules;
  const CAT_BG = { noun: "#fef9c3", verb: "#dcfce7", adjective: "#dbeafe", other: "#f3f4f6" };
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const visibleBoards = React.useMemo(function() {
    if (!normalizedQuery) return vsBoards;
    return vsBoards.filter(function(board) {
      return board.title.toLocaleLowerCase().includes(normalizedQuery) || board.words.some((word) => word.label.toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [vsBoards, normalizedQuery]);
  const visibleSchedules = React.useMemo(function() {
    if (!normalizedQuery) return vsSchedules;
    return vsSchedules.filter(function(schedule) {
      return schedule.title.toLocaleLowerCase().includes(normalizedQuery) || schedule.items.some((item) => item.label.toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [vsSchedules, normalizedQuery]);
  const vsMountedRef = React.useRef(true);
  React.useEffect(function() {
    vsMountedRef.current = true;
    return function() {
      vsMountedRef.current = false;
      try {
        if (typeof window !== "undefined" && window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.stop === "function") window.AlloSpeechPlayer.stop();
      } catch (_) {
      }
      try {
        if (typeof window !== "undefined" && window.speechSynthesis && typeof window.speechSynthesis.cancel === "function") window.speechSynthesis.cancel();
      } catch (_) {
      }
    };
  }, []);
  const speakSupportText = React.useCallback(function(text, description) {
    const cleanText = visualSupportText(text, "");
    if (!cleanText) return;
    try {
      if ((typeof window.__alloIsGlobalMuted === "function" ? window.__alloIsGlobalMuted() : window._alloGlobalMute) || window.__alloMuted === true) {
        if (vsMountedRef.current) setStatusMessage("");
        return;
      }
    } catch (_) {
    }
    const say = function(key, fallback, params) {
      return vsTr(tRef.current, key, fallback, params);
    };
    if (vsMountedRef.current) setStatusMessage(say("reading", "Reading {name}", { name: description || cleanText }));
    const langHint = props.language || typeof window !== "undefined" && (window.__alloVoiceLang || window.__alloTextLanguage) || typeof document !== "undefined" && document.documentElement && document.documentElement.lang || "";
    try {
      const player = typeof window !== "undefined" ? window.AlloSpeechPlayer : null;
      if (player && typeof player.speak === "function") {
        Promise.resolve(player.speak(cleanText, {
          language: langHint || void 0,
          reason: "visual-supports"
        })).then(function(id) {
          if (!vsMountedRef.current) return;
          setStatusMessage(id != null ? say("finished_reading", "Finished reading {name}", { name: description || cleanText }) : say("read_failed", "Could not read that support aloud."));
        }).catch(function() {
          if (vsMountedRef.current) setStatusMessage(say("read_failed", "Could not read that support aloud."));
        });
        return;
      }
      if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== "function") {
        if (vsMountedRef.current) setStatusMessage(say("read_unavailable", "Read aloud is not available in this browser."));
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(cleanText);
      if (typeof langHint === "string" && langHint.trim()) utterance.lang = langHint.trim();
      const rate = Number(typeof window !== "undefined" ? window.__alloPlaybackRate : NaN);
      if (Number.isFinite(rate) && rate > 0) utterance.rate = Math.max(0.5, Math.min(2, rate));
      const volume = Number(typeof window !== "undefined" ? window.__alloVoiceVolume : NaN);
      if (Number.isFinite(volume)) utterance.volume = Math.max(0, Math.min(1, volume));
      utterance.onend = function() {
        if (vsMountedRef.current) setStatusMessage(say("finished_reading", "Finished reading {name}", { name: description || cleanText }));
      };
      utterance.onerror = function() {
        if (vsMountedRef.current) setStatusMessage(say("read_failed", "Could not read that support aloud."));
      };
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      if (vsMountedRef.current) setStatusMessage(say("read_failed", "Could not read that support aloud."));
    }
  }, [props.language]);
  const hasOwnProgress = function(map, key) {
    return !!(map && typeof map === "object" && Object.prototype.hasOwnProperty.call(map, key));
  };
  const setScheduleProgressEntry = function(previous, schedId, value) {
    const next = /* @__PURE__ */ Object.create(null);
    if (previous && typeof previous === "object") {
      Object.keys(previous).forEach(function(k) {
        next[k] = previous[k];
      });
    }
    next[schedId] = value;
    return next;
  };
  const setCurrentScheduleStep = function(schedule, stepIndex) {
    const currentProgress = hasOwnProgress(scheduleProgressRef.current, schedule.id) ? scheduleProgressRef.current[schedule.id] : getInitialScheduleProgress(schedule);
    const nextProgress = Object.assign({}, currentProgress, { current: stepIndex });
    const items = Array.isArray(schedule.items) ? schedule.items : [];
    const nextNowId = items[stepIndex] ? items[stepIndex].id : "";
    const completedById = /* @__PURE__ */ Object.create(null);
    items.forEach(function(it, idx) {
      if (it && it.id) completedById[it.id] = !!(nextProgress.completed && nextProgress.completed[idx]);
    });
    persistVisualScheduleProgress(activeProfileId, schedule.id, nextNowId, completedById);
    setScheduleProgress(function(previous) {
      const existing = hasOwnProgress(previous, schedule.id) ? previous[schedule.id] : getInitialScheduleProgress(schedule);
      return setScheduleProgressEntry(previous, schedule.id, Object.assign({}, existing, { current: stepIndex }));
    });
    setSupportData(function(previous) {
      if (!previous || !Array.isArray(previous.schedules)) return previous;
      return Object.assign({}, previous, {
        schedules: previous.schedules.map(function(sched) {
          return sched && sched.id === schedule.id ? Object.assign({}, sched, { nowId: nextNowId }) : sched;
        })
      });
    });
    setStatusMessage(tr("step_now", "{step} is now the current step.", { step: schedule.items[stepIndex] ? schedule.items[stepIndex].label : tr("step_n", "Step {n}", { n: stepIndex + 1 }) }));
  };
  const toggleScheduleStepComplete = function(schedule, stepIndex) {
    const currentProgress = hasOwnProgress(scheduleProgressRef.current, schedule.id) ? scheduleProgressRef.current[schedule.id] : getInitialScheduleProgress(schedule);
    const completed = Object.assign({}, currentProgress.completed || {});
    completed[stepIndex] = !completed[stepIndex];
    let current = Number.isInteger(currentProgress.current) ? currentProgress.current : 0;
    const items = Array.isArray(schedule.items) ? schedule.items : [];
    if (completed[stepIndex] && current === stepIndex) {
      const nextIncomplete = items.findIndex(function(_, index) {
        return index > stepIndex && !completed[index];
      });
      if (nextIncomplete >= 0) current = nextIncomplete;
    }
    const nextNowId = items[current] ? items[current].id : "";
    const completedById = /* @__PURE__ */ Object.create(null);
    items.forEach(function(it, idx) {
      if (it && it.id) completedById[it.id] = !!completed[idx];
    });
    persistVisualScheduleProgress(activeProfileId, schedule.id, nextNowId, completedById);
    setScheduleProgress(function(previous) {
      return setScheduleProgressEntry(previous, schedule.id, { current, completed });
    });
    setSupportData(function(previous) {
      if (!previous || !Array.isArray(previous.schedules)) return previous;
      return Object.assign({}, previous, {
        schedules: previous.schedules.map(function(sched) {
          if (!sched || sched.id !== schedule.id) return sched;
          return Object.assign({}, sched, {
            nowId: nextNowId,
            items: Array.isArray(sched.items) ? sched.items.map(function(it, idx) {
              return Object.assign({}, it, { complete: !!completed[idx] });
            }) : []
          });
        })
      });
    });
    setStatusMessage(tr("step_updated", "{step} completion updated.", { step: schedule.items[stepIndex] ? schedule.items[stepIndex].label : tr("step_n", "Step {n}", { n: stepIndex + 1 }) }));
  };
  const resetScheduleProgress = function(schedule) {
    const items = Array.isArray(schedule.items) ? schedule.items : [];
    const nextNowId = items[0] ? items[0].id : "";
    const completedById = /* @__PURE__ */ Object.create(null);
    items.forEach(function(it) {
      if (it && it.id) completedById[it.id] = false;
    });
    persistVisualScheduleProgress(activeProfileId, schedule.id, nextNowId, completedById);
    setScheduleProgress(function(previous) {
      return setScheduleProgressEntry(previous, schedule.id, { current: 0, completed: {} });
    });
    setSupportData(function(previous) {
      if (!previous || !Array.isArray(previous.schedules)) return previous;
      return Object.assign({}, previous, {
        schedules: previous.schedules.map(function(sched) {
          if (!sched || sched.id !== schedule.id) return sched;
          return Object.assign({}, sched, {
            nowId: nextNowId,
            items: Array.isArray(sched.items) ? sched.items.map(function(it) {
              return Object.assign({}, it, { complete: false });
            }) : []
          });
        })
      });
    });
    setStatusMessage(tr("schedule_reset_done", "{title} progress reset.", { title: schedule.title }));
  };
  const [pauseAnim, setPauseAnim] = React.useState(function() {
    try {
      const stored = localStorage.getItem("alloVsPauseAnim");
      if (stored === "1") return true;
      if (stored === "0") return false;
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) {
      return false;
    }
  });
  React.useEffect(function() {
    try {
      localStorage.setItem("alloVsPauseAnim", pauseAnim ? "1" : "0");
    } catch (e) {
    }
  }, [pauseAnim]);
  const backdropDownRef = React.useRef(false);
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "fixed inset-0 z-[9000] bg-black/70 backdrop-blur-sm flex items-stretch justify-center p-3",
      role: "presentation",
      onMouseDown: (e) => {
        backdropDownRef.current = e.target === e.currentTarget;
      },
      onClick: (e) => {
        const startedOnBackdrop = backdropDownRef.current;
        backdropDownRef.current = false;
        if (startedOnBackdrop && e.target === e.currentTarget) setShowVisualSupports(false);
      }
    },
    /* @__PURE__ */ React.createElement("div", { ref: dialogRef, role: "dialog", "aria-modal": "true", "aria-labelledby": "visual-supports-title", tabIndex: -1, className: "allo-docsuite bg-white rounded-2xl w-full max-w-3xl flex flex-col overflow-hidden shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600 focus-visible:outline-offset-2 focus:ring-2 focus:ring-purple-600 focus:ring-offset-2", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { style: { background: "linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)" }, className: "p-4 flex items-center justify-between flex-shrink-0" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { id: "visual-supports-title", className: "text-white font-bold text-lg" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F5BC}\uFE0F "), tr("title", "Visual Supports")), /* @__PURE__ */ React.createElement("p", { className: "text-purple-200 text-xs mt-0.5" }, tr("subtitle", "Your saved boards & schedules"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setPauseAnim((p) => !p),
        "aria-pressed": pauseAnim,
        title: pauseAnim ? tr("resume_all_title", "Resume all animated images") : tr("pause_all_title", "Pause all animated images"),
        className: "min-h-11 text-white/90 hover:text-white text-[11px] font-semibold px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, pauseAnim ? "\u25B6" : "\u23F8"),
      /* @__PURE__ */ React.createElement("span", null, pauseAnim ? tr("resume_animations", "Resume animations") : tr("pause_animations", "Pause animations"))
    ), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setShowVisualSupports(false), "aria-label": tr("close", "Close Visual Supports"), className: "min-h-11 min-w-11 text-white/80 hover:text-white text-2xl font-bold flex items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" }, "\xD7"))), /* @__PURE__ */ React.createElement("div", { className: "flex border-b border-slate-200 bg-slate-50 flex-shrink-0", role: "tablist", "aria-label": tr("type_label", "Visual support type") }, /* @__PURE__ */ React.createElement("button", { type: "button", id: "visual-supports-tab-boards", role: "tab", "aria-selected": vsTab === "boards", "aria-controls": "visual-supports-panel-boards", tabIndex: vsTab === "boards" ? 0 : -1, onKeyDown: handleTabKeyDown, onClick: () => setVsTab("boards"), className: `flex-1 py-3 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-purple-700 ${vsTab === "boards" ? "text-purple-700 border-b-2 border-purple-600 bg-white" : "text-slate-600 hover:text-slate-700"}` }, "\u{1F4CB} ", tr("boards_tab", "Boards ({count})", { count: vsBoards.length })), /* @__PURE__ */ React.createElement("button", { type: "button", id: "visual-supports-tab-schedules", role: "tab", "aria-selected": vsTab === "schedules", "aria-controls": "visual-supports-panel-schedules", tabIndex: vsTab === "schedules" ? 0 : -1, onKeyDown: handleTabKeyDown, onClick: () => setVsTab("schedules"), className: `flex-1 py-3 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-purple-700 ${vsTab === "schedules" ? "text-purple-700 border-b-2 border-purple-600 bg-white" : "text-slate-600 hover:text-slate-700"}` }, "\u{1F4C5} ", tr("schedules_tab", "Schedules ({count})", { count: vsSchedules.length }))), /* @__PURE__ */ React.createElement("div", { className: "p-3 border-b border-slate-200 bg-white flex-shrink-0" }, /* @__PURE__ */ React.createElement("label", { htmlFor: "visual-supports-search", className: "sr-only" }, tr("search_label", "Search saved visual supports")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("input", { id: "visual-supports-search", type: "search", value: searchQuery, onChange: (event) => setSearchQuery(event.target.value), placeholder: vsTab === "boards" ? tr("search_boards", "Search boards or symbols") : tr("search_schedules", "Search schedules or steps"), className: "w-full min-h-11 rounded-lg border border-slate-400 px-3 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700" }), searchQuery && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setSearchQuery(""), className: "min-h-11 px-3 rounded-lg border border-slate-400 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-700", "aria-label": tr("clear_search", "Clear visual supports search") }, tr("clear", "Clear"))), /* @__PURE__ */ React.createElement("p", { role: "status", className: "text-xs text-slate-600 mt-1" }, vsTab === "boards" ? tr("boards_shown", "{shown} of {total} boards shown", { shown: visibleBoards.length, total: vsBoards.length }) : tr("schedules_shown", "{shown} of {total} schedules shown", { shown: visibleSchedules.length, total: vsSchedules.length })), /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite", "aria-atomic": "true", className: "sr-only" }, statusMessage)), /* @__PURE__ */ React.createElement("div", { id: `visual-supports-panel-${vsTab}`, role: "tabpanel", "aria-labelledby": `visual-supports-tab-${vsTab}`, tabIndex: 0, className: "flex-1 overflow-y-auto p-4 space-y-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-purple-700" }, vsTab === "boards" && (visibleBoards.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center py-16 text-slate-600" }, /* @__PURE__ */ React.createElement("div", { className: "text-5xl mb-3", "aria-hidden": "true" }, "\u{1F4CB}"), /* @__PURE__ */ React.createElement("p", { className: "font-semibold" }, vsBoards.length === 0 ? tr("no_boards", "No saved boards yet") : tr("no_boards_match", "No boards match your search")), /* @__PURE__ */ React.createElement("p", { className: "text-sm mt-1" }, vsBoards.length === 0 ? tr("no_boards_hint", "Save boards in Symbol Studio to see them here") : tr("no_boards_match_hint", "Try a board title or symbol name"))) : visibleBoards.map((board, boardIndex) => /* @__PURE__ */ React.createElement(VisualSupportBoardCard, { key: board.id + "-" + boardIndex, board, cardIndex: boardIndex, categoryBackgrounds: CAT_BG, pauseAnimations: pauseAnim, onSpeak: speakSupportText, tr }))), vsTab === "schedules" && (visibleSchedules.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center py-16 text-slate-600" }, /* @__PURE__ */ React.createElement("div", { className: "text-5xl mb-3", "aria-hidden": "true" }, "\u{1F4C5}"), /* @__PURE__ */ React.createElement("p", { className: "font-semibold" }, vsSchedules.length === 0 ? tr("no_schedules", "No saved schedules yet") : tr("no_schedules_match", "No schedules match your search")), /* @__PURE__ */ React.createElement("p", { className: "text-sm mt-1" }, vsSchedules.length === 0 ? tr("no_schedules_hint", "Save schedules in Symbol Studio to see them here") : tr("no_schedules_match_hint", "Try a schedule title or step name"))) : visibleSchedules.map((schedule, scheduleIndex) => /* @__PURE__ */ React.createElement(VisualSupportScheduleCard, { key: schedule.id + "-" + scheduleIndex, schedule, cardIndex: scheduleIndex, progress: hasOwnProgress(scheduleProgress, schedule.id) ? scheduleProgress[schedule.id] : void 0, pauseAnimations: pauseAnim, onSpeak: speakSupportText, onSetCurrent: setCurrentScheduleStep, onToggleComplete: toggleScheduleStepComplete, onResetSchedule: resetScheduleProgress, tr })))))
  );
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.VisualSupportsModal = { VisualSupportsModal: VisualSupportsModal };
  console.log('[CDN] VisualSupportsModal loaded');
})();
