(function() {
'use strict';
if (window.AlloModules && window.AlloModules.AnnotationSuiteModule) { console.log('[CDN] AnnotationSuiteModule already loaded, skipping'); return; }
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var require_tmp_annotation_suite_entry = __commonJS({
  "_tmp_annotation_suite_entry.jsx"(exports, module) {
    (function(root, factory) {
      var api = factory();
      if (typeof module === "object" && module.exports) module.exports = api;
      if (root) root.AlloFlowAnnotationInquiryBridge = api;
    })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
      "use strict";
      var VERSION = "1.0.0";
      var STANCES = ["supports", "complicates", "context", "language", "question"];
      var COLORS = { supports: "green", complicates: "pink", context: "blue", language: "yellow", question: "blue" };
      function clip(value, limit) {
        return String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, limit || 500);
      }
      function redact(value) {
        return clip(value, 1800).replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email omitted]").replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[identifier omitted]").replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g, "[phone omitted]").replace(/\b[ACGTUN]{40,}\b/gi, "[nucleic-acid sequence omitted]").replace(/\b[ACDEFGHIKLMNPQRSTVWY]{40,}\b/gi, "[protein sequence omitted]");
      }
      function stableId(value) {
        var input = clip(value, 500).toLowerCase();
        var hash = 2166136261;
        for (var i = 0; i < input.length; i++) {
          hash ^= input.charCodeAt(i);
          hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16).padStart(8, "0");
      }
      function createHandoff(input) {
        input = input || {};
        var source = input.source || {};
        var excerpts = (Array.isArray(input.excerpts) ? input.excerpts : []).slice(0, 10).map(function(row, index) {
          return { excerptId: "excerpt-" + (index + 1), sentenceIndex: Math.max(1, Number(row && row.sentenceIndex) || index + 1), excerpt: redact(row && row.excerpt).slice(0, 360) };
        }).filter(function(row) {
          return !!row.excerpt;
        });
        if (!excerpts.length) return { ok: false, reason: "At least one bounded concordance excerpt is required." };
        var sourceRecordId = clip(input.sourceRecordId, 180) || "text-" + stableId([source.title, source.creator, source.edition, source.stableUrl].join("|"));
        return { ok: true, handoff: {
          schemaVersion: 1,
          bridgeVersion: VERSION,
          handoffId: "annotation-handoff-" + stableId(sourceRecordId + "|" + input.queryTerm + "|" + excerpts.map(function(row) {
            return row.excerpt;
          }).join("|")),
          sourceRecordId,
          queryTerm: clip(input.queryTerm, 80),
          source: { title: redact(source.title).slice(0, 180), creator: redact(source.creator).slice(0, 180), edition: redact(source.edition).slice(0, 220), stableUrl: clip(source.stableUrl, 500), context: redact(source.context).slice(0, 1200) },
          excerpts,
          createdAt: clip(input.createdAt, 80) || (/* @__PURE__ */ new Date()).toISOString()
        } };
      }
      function createAnnotation(handoff, input) {
        input = input || {};
        if (!handoff || !Array.isArray(handoff.excerpts)) return { ok: false, reason: "A valid inquiry handoff is required." };
        var excerptId = clip(input.excerptId, 80);
        var target = handoff.excerpts.find(function(row) {
          return row.excerptId === excerptId;
        });
        if (!target) return { ok: false, reason: "Choose a current excerpt." };
        var stance = STANCES.indexOf(input.stance) === -1 ? "language" : input.stance;
        var note = redact(input.note).slice(0, 900);
        if (note.length < 12) return { ok: false, reason: "Write an annotation of at least 12 characters." };
        var createdAt = clip(input.createdAt, 80) || (/* @__PURE__ */ new Date()).toISOString();
        return { ok: true, annotation: {
          id: clip(input.id, 120) || "inquiry-note-" + stableId(handoff.handoffId + "|" + excerptId + "|" + stance + "|" + note + "|" + createdAt),
          kind: "note",
          type: "inquiry",
          x: 32,
          y: 64 + handoff.excerpts.indexOf(target) * 76,
          content: note,
          color: COLORS[stance],
          author: "student",
          authorName: redact(input.authorName).slice(0, 80),
          createdAt,
          inquiryStance: stance,
          inquiryTarget: { handoffId: handoff.handoffId, sourceRecordId: handoff.sourceRecordId, queryTerm: handoff.queryTerm, excerptId: target.excerptId, sentenceIndex: target.sentenceIndex, excerpt: target.excerpt }
        } };
      }
      function validateAnnotation(handoff, annotation) {
        if (!annotation || annotation.kind !== "note" || !annotation.inquiryTarget) return false;
        if (STANCES.indexOf(annotation.inquiryStance) === -1 || clip(annotation.content, 900).length < 12) return false;
        return !!(handoff && annotation.inquiryTarget.handoffId === handoff.handoffId && handoff.excerpts.some(function(row) {
          return row.excerptId === annotation.inquiryTarget.excerptId;
        }));
      }
      function summarizeForCapture(handoff, annotations) {
        var valid = (Array.isArray(annotations) ? annotations : []).filter(function(annotation) {
          return validateAnnotation(handoff, annotation);
        }).slice(0, 20);
        var counts = {};
        STANCES.forEach(function(stance) {
          counts[stance] = valid.filter(function(annotation) {
            return annotation.inquiryStance === stance;
          }).length;
        });
        return {
          schemaVersion: 1,
          bridgeVersion: VERSION,
          handoffId: handoff && handoff.handoffId,
          sourceRecordId: handoff && handoff.sourceRecordId,
          queryTerm: handoff && handoff.queryTerm,
          annotationCounts: counts,
          annotations: valid.map(function(annotation) {
            return { id: annotation.id, stance: annotation.inquiryStance, note: redact(annotation.content).slice(0, 900), target: annotation.inquiryTarget };
          })
        };
      }
      function toAnnotationSuitePayload(handoff, annotations) {
        return { docTitle: (handoff && handoff.source && handoff.source.title || "Text Inquiry excerpts") + " \u2014 close reading", annotations: (Array.isArray(annotations) ? annotations : []).filter(function(annotation) {
          return validateAnnotation(handoff, annotation);
        }) };
      }
      return { version: VERSION, stances: STANCES.slice(), createHandoff, createAnnotation, validateAnnotation, summarizeForCapture, toAnnotationSuitePayload };
    });
    const STICKER_ICONS = {
      star: "\u2B50",
      check: "\u2705",
      idea: "\u{1F4A1}",
      love: "\u2764\uFE0F",
      question: "\u2753",
      important: "\u2757",
      fire: "\u{1F525}",
      target: "\u{1F3AF}",
      thumbsup: "\u{1F44D}",
      party: "\u{1F389}",
      rocket: "\u{1F680}",
      flag: "\u{1F6A9}"
    };
    const STICKER_TYPES = [
      "star",
      "check",
      "idea",
      "love",
      "question",
      "important",
      "fire",
      "target",
      "thumbsup",
      "party",
      "rocket",
      "flag"
    ];
    const ANNOTATION_KINDS = ["sticker", "note", "highlight", "voice", "draw"];
    let _hostT = null;
    const _captureHostT = (props) => {
      if (props && typeof props.t === "function") _hostT = props.t;
    };
    function t(key, vars) {
      return _hostT ? _hostT(key, vars) : key;
    }
    const DRAW_COLORS = {
      red: "#dc2626",
      blue: "#2563eb",
      green: "#16a34a",
      yellow: "#ca8a04",
      black: "#111827"
    };
    const DRAW_COLOR_KEYS = ["red", "blue", "green", "yellow", "black"];
    const DRAW_WIDTHS = [2, 4, 6, 10];
    const DRAW_SHAPES = ["free", "line", "arrow", "rect", "circle", "erase"];
    const DRAW_SHAPE_LABELS = {
      free: "Freehand",
      line: "Line",
      arrow: "Arrow",
      rect: "Rectangle",
      circle: "Circle",
      erase: "Eraser"
    };
    const DRAW_SHAPE_ICONS = {
      free: "\u270F\uFE0F",
      line: "\u2571",
      arrow: "\u279C",
      rect: "\u25AD",
      circle: "\u25CB",
      erase: "\u{1F9FD}"
    };
    const VOICE_MAX_SECONDS = 60;
    const VOICE_MAX_BYTES = 500 * 1024;
    (function injectAnnotationSuiteStyles() {
      if (typeof document === "undefined") return;
      if (document.getElementById("alloflow-anno-suite-styles")) return;
      const s = document.createElement("style");
      s.id = "alloflow-anno-suite-styles";
      s.textContent = "@keyframes alloflow-anno-pulse { 0% { transform: scale(0.6); opacity: 1; } 100% { transform: scale(1.8); opacity: 0; } }\n@keyframes alloflow-undo-flash { 0% { background-color: rgba(99,102,241,0.55); transform: scale(0.94); } 60% { background-color: rgba(99,102,241,0.25); } 100% { background-color: transparent; transform: scale(1); } }\n.alloflow-undo-flash { animation: alloflow-undo-flash 0.45s ease-out; }";
      document.head.appendChild(s);
    })();
    const NOTE_COLORS = {
      yellow: { fill: "#fef9c3", border: "#facc15", text: "#713f12" },
      green: { fill: "#dcfce7", border: "#4ade80", text: "#14532d" },
      blue: { fill: "#dbeafe", border: "#60a5fa", text: "#1e3a8a" },
      pink: { fill: "#fce7f3", border: "#f472b6", text: "#831843" }
    };
    const NOTE_COLOR_KEYS = ["yellow", "green", "blue", "pink"];
    const TEACHER_NOTE_TEMPLATES = [
      { label: "Great work!", content: "\u2B50 Great work!" },
      { label: "Strong evidence", content: "\u2705 Strong use of evidence here." },
      { label: "Clear writing", content: "\u2705 Clear, well-organized writing." },
      { label: "Add detail", content: "\u270F\uFE0F Can you add more specific detail or an example?" },
      { label: "Cite your source", content: "\u{1F4DA} Where did this come from? Add a citation." },
      { label: "Try again", content: "\u{1F501} Take another look at this \u2014 something is off." },
      { label: "Show your work", content: "\u{1F9EE} Show the steps that got you to this answer." },
      { label: "Reflect", content: "\u{1F914} How would you explain this in your own words?" },
      { label: "Talk to me", content: "\u{1F4AC} Let\u2019s discuss this together at our next check-in." }
    ];
    const STUDENT_NOTE_TEMPLATES = [
      { label: "Question", content: "\u2753 I have a question about this." },
      { label: "Important", content: "\u2B50 This part feels important." },
      { label: "Unclear", content: "\u{1F914} I\u2019m not sure I understand this." },
      { label: "Surprised", content: "\u{1F62F} This surprised me \u2014 I didn\u2019t expect this." },
      { label: "Reminds me of", content: "\u{1F4A1} This reminds me of\u2026" },
      { label: "Need help", content: "\u{1F64B} Can you help me with this part?" }
    ];
    const HIGHLIGHT_COLORS = {
      yellow: { fill: "rgba(250, 204, 21, 0.40)", border: "rgba(202, 138, 4, 0.55)" },
      green: { fill: "rgba(74, 222, 128, 0.38)", border: "rgba(22, 163, 74, 0.55)" },
      blue: { fill: "rgba(96, 165, 250, 0.36)", border: "rgba(37, 99, 235, 0.55)" },
      pink: { fill: "rgba(244, 114, 182, 0.36)", border: "rgba(219, 39, 119, 0.55)" }
    };
    const HIGHLIGHT_COLOR_KEYS = ["yellow", "green", "blue", "pink"];
    function migrateLegacyShape(annotations) {
      if (!Array.isArray(annotations)) return [];
      return annotations.map(function(a) {
        if (!a) return a;
        if (a.kind) return a;
        if (STICKER_TYPES.indexOf(a.type) !== -1) {
          return Object.assign({}, a, { kind: "sticker" });
        }
        return a;
      });
    }
    function buildStickerTitle(s) {
      const parts = [];
      if (s && s.author === "teacher") parts.push("Teacher feedback");
      else if (s && s.author === "student") parts.push(s.authorName || "Student");
      if (s && s.createdAt) {
        try {
          const d = new Date(s.createdAt);
          if (!isNaN(d.getTime())) parts.push(d.toLocaleDateString(void 0, { month: "short", day: "numeric" }));
        } catch (_) {
        }
      }
      return parts.join(" \u2022 ");
    }
    function makeDragHandler(s, hostFinder, onMove, wasDraggedRef) {
      return function(e) {
        if (!onMove) return;
        if (e.button !== void 0 && e.button !== 0) return;
        const host = hostFinder ? hostFinder(e.currentTarget) : null;
        if (!host) return;
        e.preventDefault();
        e.stopPropagation();
        const el = e.currentTarget;
        const startTop = parseFloat(el.style.top) || s.y;
        const startLeft = parseFloat(el.style.left) || s.x;
        const offsetTop = startTop - s.y;
        const offsetLeft = startLeft - s.x;
        const startCX = e.clientX;
        const startCY = e.clientY;
        if (wasDraggedRef) wasDraggedRef.current = false;
        let didMove = false;
        const moveHandler = function(mv) {
          const dx = mv.clientX - startCX;
          const dy = mv.clientY - startCY;
          if (!didMove && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
            didMove = true;
            if (wasDraggedRef) wasDraggedRef.current = true;
          }
          el.style.left = s.x + dx + offsetLeft + "px";
          el.style.top = s.y + dy + offsetTop + "px";
        };
        const upHandler = function(mv) {
          window.removeEventListener("pointermove", moveHandler);
          window.removeEventListener("pointerup", upHandler);
          if (!didMove) {
            el.style.left = startLeft + "px";
            el.style.top = startTop + "px";
            return;
          }
          const dx = mv.clientX - startCX;
          const dy = mv.clientY - startCY;
          const sw = host.scrollWidth || host.clientWidth || 999999;
          const sh = host.scrollHeight || host.clientHeight || 999999;
          const finalX = Math.max(0, Math.min(sw - 14, s.x + dx));
          const finalY = Math.max(0, Math.min(sh - 14, s.y + dy));
          onMove(s.id, finalX, finalY, true);
        };
        window.addEventListener("pointermove", moveHandler);
        window.addEventListener("pointerup", upHandler);
      };
    }
    function announceAnnotationMove(message) {
      let live = document.getElementById("allo-annotation-move-status");
      if (!live) {
        live = document.createElement("div");
        live.id = "allo-annotation-move-status";
        live.className = "sr-only";
        live.setAttribute("role", "status");
        live.setAttribute("aria-live", "polite");
        live.setAttribute("aria-atomic", "true");
        document.body.appendChild(live);
      }
      live.textContent = "";
      window.setTimeout(function() {
        live.textContent = message;
      }, 0);
    }
    function makeKeyboardMoveHandler(annotation, hostFinder, onMove, onActivate) {
      return function(e) {
        if ((e.key === "Enter" || e.key === " ") && onActivate) {
          e.preventDefault();
          onActivate();
          return;
        }
        const movement = {
          ArrowLeft: { x: -1, y: 0, label: "left" },
          ArrowRight: { x: 1, y: 0, label: "right" },
          ArrowUp: { x: 0, y: -1, label: "up" },
          ArrowDown: { x: 0, y: 1, label: "down" }
        }[e.key];
        if (!movement || !onMove) return;
        const host = hostFinder ? hostFinder(e.currentTarget) : null;
        if (!host) return;
        e.preventDefault();
        e.stopPropagation();
        const step = e.shiftKey ? 40 : 10;
        const nextX = Math.max(0, Math.min(host.clientWidth - 14, annotation.x + movement.x * step));
        const nextY = Math.max(0, Math.min(host.clientHeight - 14, annotation.y + movement.y * step));
        onMove(annotation.id, nextX, nextY, true);
        announceAnnotationMove(`Annotation moved ${movement.label}${e.shiftKey ? " by a larger step" : ""}.`);
      };
    }
    function findAnnoHost(el) {
      let cur = el;
      while (cur && cur !== document.body) {
        if (cur.getAttribute && cur.getAttribute("data-allo-anno-host") === "true") return cur;
        cur = cur.parentNode;
      }
      return null;
    }
    function StickerNode({ s, draggable, onMove }) {
      if (!s) return null;
      const title = buildStickerTitle(s);
      const icon = STICKER_ICONS[s.type] || "";
      const ringClass = s.author === "teacher" ? " ring-2 ring-indigo-400/70 rounded-full bg-white/80 p-0.5" : "";
      const isDraggable = !!(draggable && onMove);
      const pointerClass = isDraggable ? "" : " pointer-events-none";
      const dragClass = isDraggable ? " cursor-grab active:cursor-grabbing" : "";
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "absolute text-3xl drop-shadow-md animate-[ping_0.4s_ease-out_reverse_forwards] motion-reduce:animate-none select-none z-50 hover:scale-110 transition-transform motion-reduce:transition-none motion-reduce:transform-none" + pointerClass + dragClass + ringClass,
          style: { top: s.y - 15, left: s.x - 15, touchAction: isDraggable ? "none" : void 0 },
          title: title || icon,
          "aria-label": (title ? icon + " \u2014 " + title : icon) + (isDraggable ? ". Use arrow keys to move; hold Shift for a larger step." : ""),
          onPointerDown: isDraggable ? makeDragHandler(s, findAnnoHost, onMove) : void 0,
          onKeyDown: isDraggable ? makeKeyboardMoveHandler(s, findAnnoHost, onMove) : void 0,
          tabIndex: isDraggable ? 0 : void 0,
          role: isDraggable ? "button" : void 0
        },
        icon
      );
    }
    function NoteBubble({ a, onChange, onDelete, draggable, onMove }) {
      if (!a) return null;
      const palette = NOTE_COLORS[a.color] || NOTE_COLORS.yellow;
      const [expanded, setExpanded] = React.useState(!a.content);
      const [draft, setDraft] = React.useState(a.content || "");
      const taRef = React.useRef(null);
      const wasDraggedRef = React.useRef(false);
      React.useEffect(function() {
        if (expanded && taRef.current) {
          try {
            taRef.current.focus();
          } catch (_) {
          }
        }
      }, [expanded]);
      const title = buildStickerTitle(a) || "Note";
      const commit = function() {
        setExpanded(false);
        if (draft !== a.content && typeof onChange === "function") {
          onChange(a.id, { content: draft });
        }
      };
      if (!expanded) {
        const isDraggable = !!(draggable && onMove);
        const handleDown = isDraggable ? makeDragHandler(a, findAnnoHost, onMove, wasDraggedRef) : void 0;
        const handleClick = function() {
          if (wasDraggedRef.current) {
            wasDraggedRef.current = false;
            return;
          }
          setExpanded(true);
        };
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "absolute z-50 select-none transition-transform motion-reduce:transition-none motion-reduce:transform-none " + (isDraggable ? "cursor-grab active:cursor-grabbing hover:scale-110" : "cursor-pointer hover:scale-110"),
            style: { top: a.y - 14, left: a.x - 14, width: 28, height: 28, touchAction: isDraggable ? "none" : void 0 },
            title: (a.content ? a.content + " \u2014 " : "") + title,
            "aria-label": "Sticky note from " + title + (a.content ? ": " + a.content : "") + (isDraggable ? ". Use arrow keys to move; hold Shift for a larger step." : ""),
            onPointerDown: handleDown,
            onClick: handleClick,
            onKeyDown: makeKeyboardMoveHandler(a, findAnnoHost, isDraggable ? onMove : null, function() {
              setExpanded(true);
            }),
            tabIndex: 0,
            role: "button"
          },
          /* @__PURE__ */ React.createElement(
            "div",
            {
              className: "w-full h-full rounded-md flex items-center justify-center text-sm shadow-md",
              style: { background: palette.fill, border: "2px solid " + palette.border, color: palette.text }
            },
            "\u{1F4DD}"
          )
        );
      }
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "absolute z-50 select-text shadow-lg rounded-lg",
          style: {
            top: a.y - 14,
            left: a.x - 14,
            minWidth: 180,
            maxWidth: 260,
            background: palette.fill,
            border: "2px solid " + palette.border,
            color: palette.text
          },
          onClick: function(e) {
            e.stopPropagation();
          }
        },
        /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "flex items-center justify-between gap-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded-t-lg",
            style: { background: palette.border, color: palette.text }
          },
          /* @__PURE__ */ React.createElement("span", null, "\u{1F4DD} ", a.author === "teacher" ? "Teacher note" : a.authorName || "Student note"),
          /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(
            "button",
            {
              type: "button",
              onClick: commit,
              className: "inline-flex min-h-6 min-w-6 items-center justify-center px-1.5 py-0.5 rounded bg-white/70 hover:bg-white text-[10px] font-bold",
              "aria-label": t("a11y.save_note"),
              title: "Save & close"
            },
            "\u2713"
          ), typeof onDelete === "function" && /* @__PURE__ */ React.createElement(
            "button",
            {
              type: "button",
              onMouseDown: function(e) {
                e.preventDefault();
              },
              onClick: function() {
                onDelete(a.id);
              },
              className: "inline-flex min-h-6 min-w-6 items-center justify-center px-1.5 py-0.5 rounded bg-white/70 hover:bg-red-100 text-[10px] font-bold",
              "aria-label": t("a11y.delete_note"),
              title: "Delete"
            },
            "\u2715"
          ))
        ),
        /* @__PURE__ */ React.createElement(
          "textarea",
          {
            ref: taRef,
            value: draft,
            onChange: function(e) {
              setDraft(e.target.value);
            },
            onBlur: commit,
            placeholder: t("placeholders.type_note"),
            rows: 3,
            className: "w-full p-2 text-xs resize-y bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-600",
            style: { color: palette.text, minHeight: 60 },
            "aria-label": t("a11y.note_content")
          }
        )
      );
    }
    function VoiceNoteBubble({ a, onDelete, draggable, onMove }) {
      if (!a) return null;
      const [expanded, setExpanded] = React.useState(false);
      const wasDraggedRef = React.useRef(false);
      const title = buildStickerTitle(a) || "Voice note";
      const dur = typeof a.durationSec === "number" ? Math.round(a.durationSec) : null;
      const hasAudio = !!a.audioBase64;
      const isT = a.author === "teacher";
      const accent = isT ? "#6366f1" : "#f59e0b";
      if (!expanded) {
        const isDraggable = !!(draggable && onMove);
        const handleDown = isDraggable ? makeDragHandler(a, findAnnoHost, onMove, wasDraggedRef) : void 0;
        const handleClick = function() {
          if (wasDraggedRef.current) {
            wasDraggedRef.current = false;
            return;
          }
          setExpanded(true);
        };
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "absolute z-50 select-none transition-transform motion-reduce:transition-none motion-reduce:transform-none " + (isDraggable ? "cursor-grab active:cursor-grabbing hover:scale-110" : "cursor-pointer hover:scale-110"),
            style: { top: a.y - 14, left: a.x - 14, width: 28, height: 28, touchAction: isDraggable ? "none" : void 0 },
            title: title + (dur != null ? " \u2022 " + dur + "s" : ""),
            "aria-label": "Voice note from " + title + (dur != null ? ", " + dur + " seconds" : "") + (isDraggable ? ". Use arrow keys to move; hold Shift for a larger step." : ""),
            onPointerDown: handleDown,
            onClick: handleClick,
            onKeyDown: makeKeyboardMoveHandler(a, findAnnoHost, isDraggable ? onMove : null, function() {
              setExpanded(true);
            }),
            tabIndex: 0,
            role: "button"
          },
          /* @__PURE__ */ React.createElement(
            "div",
            {
              className: "w-full h-full rounded-md flex items-center justify-center text-sm shadow-md",
              style: { background: "white", border: "2px solid " + accent, color: accent }
            },
            "\u{1F3A4}"
          )
        );
      }
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "absolute z-50 select-text shadow-lg rounded-lg",
          style: {
            top: a.y - 14,
            left: a.x - 14,
            minWidth: 240,
            maxWidth: 320,
            background: "white",
            border: "2px solid " + accent,
            color: "#1e293b"
          },
          onClick: function(e) {
            e.stopPropagation();
          }
        },
        /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "flex items-center justify-between gap-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded-t-lg",
            style: { background: accent, color: "white" }
          },
          /* @__PURE__ */ React.createElement("span", null, "\u{1F3A4} ", isT ? "Teacher voice note" : a.authorName || "Voice note", dur != null ? " \u2022 " + dur + "s" : ""),
          /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(
            "button",
            {
              type: "button",
              onClick: function() {
                setExpanded(false);
              },
              className: "inline-flex min-h-6 min-w-6 items-center justify-center px-1.5 py-0.5 rounded bg-white/70 hover:bg-white text-[10px] font-bold",
              style: { color: accent },
              "aria-label": t("a11y.close_voice_note"),
              title: "Close"
            },
            "\u2713"
          ), typeof onDelete === "function" && /* @__PURE__ */ React.createElement(
            "button",
            {
              type: "button",
              onClick: function() {
                onDelete(a.id);
              },
              className: "inline-flex min-h-6 min-w-6 items-center justify-center px-1.5 py-0.5 rounded bg-white/70 hover:bg-red-100 text-[10px] font-bold",
              style: { color: accent },
              "aria-label": t("a11y.delete_voice_note"),
              title: "Delete"
            },
            "\u2715"
          ))
        ),
        /* @__PURE__ */ React.createElement("div", { className: "p-2" }, hasAudio ? /* @__PURE__ */ React.createElement(
          "audio",
          {
            controls: true,
            preload: "metadata",
            src: "data:" + (a.mimeType || "audio/webm") + ";base64," + a.audioBase64,
            className: "w-full",
            style: { height: 32 }
          }
        ) : /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-500 italic px-1 py-2" }, "No audio attached (recording may have failed)."))
      );
    }
    function RecordingOverlay({ x, y, elapsedSec, onStop, onCancel }) {
      const pct = Math.min(100, (elapsedSec || 0) / VOICE_MAX_SECONDS * 100);
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "absolute z-[55] shadow-xl rounded-lg",
          role: "region",
          "aria-label": "Voice note recording in progress",
          style: {
            top: (y || 0) - 14,
            left: (x || 0) - 14,
            minWidth: 220,
            maxWidth: 280,
            background: "white",
            border: "2px solid #dc2626"
          },
          onClick: function(e) {
            e.stopPropagation();
          }
        },
        /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-t-lg", style: { background: "#dc2626", color: "white" } }, /* @__PURE__ */ React.createElement("span", { className: "inline-block w-2 h-2 rounded-full bg-white animate-pulse motion-reduce:animate-none", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("span", null, "RECORDING"), /* @__PURE__ */ React.createElement("span", { className: "ms-auto font-mono" }, Math.floor(elapsedSec || 0), "s / ", VOICE_MAX_SECONDS, "s")),
        /* @__PURE__ */ React.createElement("div", { className: "px-3 py-2" }, /* @__PURE__ */ React.createElement("div", { className: "w-full h-1.5 rounded-full bg-slate-200 overflow-hidden", role: "progressbar", "aria-label": "Voice note recording time", "aria-valuemin": 0, "aria-valuemax": VOICE_MAX_SECONDS, "aria-valuenow": Math.min(VOICE_MAX_SECONDS, Math.floor(elapsedSec || 0)) }, /* @__PURE__ */ React.createElement("div", { className: "h-full bg-red-500 transition-all motion-reduce:transition-none", style: { width: pct + "%" } })), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-end gap-2 mt-2" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: onCancel,
            className: "min-h-6 px-2 py-1 rounded text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200",
            "aria-label": t("a11y.cancel_recording")
          },
          "Cancel"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: onStop,
            className: "min-h-6 px-3 py-1 rounded text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 flex items-center gap-1",
            "aria-label": t("a11y.stop_save_recording")
          },
          /* @__PURE__ */ React.createElement("span", { className: "inline-block w-2 h-2 bg-white" }),
          " Stop"
        )))
      );
    }
    function HighlightOverlay({ a, onDelete }) {
      if (!a || !Array.isArray(a.rects) || a.rects.length === 0) return null;
      const palette = HIGHLIGHT_COLORS[a.color] || HIGHLIGHT_COLORS.yellow;
      const title = buildStickerTitle(a) || "Highlight";
      const titleText = (a.text ? '"' + a.text.slice(0, 80) + (a.text.length > 80 ? "\u2026" : "") + '"  ' : "") + title;
      return /* @__PURE__ */ React.createElement(React.Fragment, null, a.rects.map(function(r, idx) {
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: a.id + ":" + idx,
            className: "absolute pointer-events-none z-40",
            style: {
              top: r.y,
              left: r.x,
              width: r.w,
              height: r.h,
              background: palette.fill,
              borderRadius: 2,
              boxShadow: "inset 0 -1px 0 " + palette.border
            },
            title: titleText,
            "aria-label": "Highlight: " + titleText
          }
        );
      }), /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "absolute pointer-events-auto z-30",
          style: {
            top: a.rects[0].y,
            left: a.rects[0].x,
            width: a.rects[0].w,
            height: a.rects[0].h,
            background: "transparent"
          },
          onMouseEnter: function(e) {
            const btn = e.currentTarget.querySelector("button");
            if (btn) btn.style.opacity = "1";
          },
          onMouseLeave: function(e) {
            const btn = e.currentTarget.querySelector("button");
            if (btn) btn.style.opacity = "0";
          }
        },
        typeof onDelete === "function" && /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: function(e) {
              e.stopPropagation();
              onDelete(a.id);
            },
            className: "absolute pointer-events-auto opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity motion-reduce:transition-none",
            style: {
              top: -12,
              right: -12,
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "white",
              border: "1px solid " + palette.border,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#475569",
              lineHeight: 1,
              zIndex: 50
            },
            "aria-label": t("a11y.delete_highlight"),
            title: "Delete highlight"
          },
          "\u2715"
        )
      ));
    }
    function DrawingOverlay({ a, onDelete }) {
      if (!a) return null;
      const shape = a.shape || "free";
      const stroke = DRAW_COLORS[a.color] || a.color || "#dc2626";
      const w = typeof a.width === "number" ? a.width : 4;
      let bbx = a.x, bby = a.y, bbw = a.w, bbh = a.h;
      if (bbx == null || bby == null || bbw == null || bbh == null) {
        if (Array.isArray(a.points) && a.points.length > 0) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (let i = 0; i < a.points.length; i++) {
            const p = a.points[i];
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
          }
          bbx = minX - w;
          bby = minY - w;
          bbw = maxX - minX + w * 2;
          bbh = maxY - minY + w * 2;
        } else {
          return null;
        }
      }
      const pad = w + 6;
      const svgX = bbx - pad, svgY = bby - pad;
      const svgW = bbw + pad * 2, svgH = bbh + pad * 2;
      const localX = (worldX) => (worldX - svgX).toFixed(1);
      const localY = (worldY) => (worldY - svgY).toFixed(1);
      let shapeNode = null;
      if (shape === "free") {
        if (!Array.isArray(a.points) || a.points.length < 2) return null;
        let d = "";
        for (let i = 0; i < a.points.length; i++) {
          d += (i === 0 ? "M" : " L") + localX(a.points[i].x) + " " + localY(a.points[i].y);
        }
        shapeNode = /* @__PURE__ */ React.createElement("path", { d, fill: "none", stroke, strokeWidth: w, strokeLinecap: "round", strokeLinejoin: "round" });
      } else if (shape === "line" || shape === "arrow") {
        const sx = a.start && a.start.x != null ? a.start.x : bbx;
        const sy = a.start && a.start.y != null ? a.start.y : bby;
        const ex = a.end && a.end.x != null ? a.end.x : bbx + bbw;
        const ey = a.end && a.end.y != null ? a.end.y : bby + bbh;
        const lineEl = /* @__PURE__ */ React.createElement("line", { x1: localX(sx), y1: localY(sy), x2: localX(ex), y2: localY(ey), stroke, strokeWidth: w, strokeLinecap: "round" });
        if (shape === "arrow") {
          const dx = ex - sx, dy = ey - sy;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const ux = dx / len, uy = dy / len;
          const px = -uy, py = ux;
          const ah = Math.max(8, Math.min(24, w * 3));
          const tipX = ex, tipY = ey;
          const baseX = ex - ux * ah, baseY = ey - uy * ah;
          const v1x = baseX + px * (ah * 0.5), v1y = baseY + py * (ah * 0.5);
          const v2x = baseX - px * (ah * 0.5), v2y = baseY - py * (ah * 0.5);
          shapeNode = /* @__PURE__ */ React.createElement(React.Fragment, null, lineEl, /* @__PURE__ */ React.createElement(
            "polygon",
            {
              points: [
                localX(tipX) + "," + localY(tipY),
                localX(v1x) + "," + localY(v1y),
                localX(v2x) + "," + localY(v2y)
              ].join(" "),
              fill: stroke,
              stroke,
              strokeWidth: 1,
              strokeLinejoin: "round"
            }
          ));
        } else {
          shapeNode = lineEl;
        }
      } else if (shape === "rect") {
        shapeNode = /* @__PURE__ */ React.createElement("rect", { x: localX(bbx + w), y: localY(bby + w), width: Math.max(1, bbw - w * 2), height: Math.max(1, bbh - w * 2), fill: "none", stroke, strokeWidth: w, strokeLinejoin: "round" });
      } else if (shape === "circle") {
        const cx = bbx + bbw / 2, cy = bby + bbh / 2;
        const rx = Math.max(1, (bbw - w * 2) / 2);
        const ry = Math.max(1, (bbh - w * 2) / 2);
        shapeNode = /* @__PURE__ */ React.createElement("ellipse", { cx: localX(cx), cy: localY(cy), rx, ry, fill: "none", stroke, strokeWidth: w });
      }
      const title = buildStickerTitle(a) || (DRAW_SHAPE_LABELS[shape] || "Drawing");
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "absolute pointer-events-none z-40",
          style: { top: svgY, left: svgX, width: svgW, height: svgH },
          "aria-label": (DRAW_SHAPE_LABELS[shape] || "Drawing") + ": " + title,
          title
        },
        /* @__PURE__ */ React.createElement("svg", { width: svgW, height: svgH, style: { display: "block", overflow: "visible" }, "aria-hidden": "true" }, shapeNode),
        typeof onDelete === "function" && /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: function(e) {
              e.stopPropagation();
              onDelete(a.id);
            },
            className: "absolute pointer-events-auto opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity motion-reduce:transition-none",
            style: {
              top: 0,
              right: 0,
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "white",
              border: "1px solid " + stroke,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#475569",
              lineHeight: 1
            },
            onMouseEnter: function(e) {
              e.currentTarget.style.opacity = "1";
            },
            onMouseLeave: function(e) {
              e.currentTarget.style.opacity = "0";
            },
            "aria-label": t("a11y.delete_drawing"),
            title: "Delete drawing"
          },
          "\u2715"
        )
      );
    }
    const ERASER_RADIUS = 18;
    function _annotationHit(a, px, py, radius) {
      if (!a) return false;
      const r = radius || ERASER_RADIUS;
      if (a.kind === "draw") {
        const shape = a.shape || "free";
        if (shape === "free" && Array.isArray(a.points)) {
          for (let i = 0; i < a.points.length; i++) {
            const p = a.points[i];
            const dx = px - p.x, dy = py - p.y;
            if (dx * dx + dy * dy <= r * r) return true;
          }
          return false;
        }
      }
      if (a.kind === "highlight" && Array.isArray(a.rects)) {
        for (let i = 0; i < a.rects.length; i++) {
          const rect = a.rects[i];
          if (px >= rect.x - r && px <= rect.x + rect.w + r && py >= rect.y - r && py <= rect.y + rect.h + r) return true;
        }
        return false;
      }
      if (a.kind === "sticker" || a.kind === "note" || a.kind === "voice") {
        const cx = a.x || 0, cy = a.y || 0;
        const dx = px - cx, dy = py - cy;
        return Math.sqrt(dx * dx + dy * dy) <= 18 + r;
      }
      if (a.kind === "draw" && a.x != null && a.y != null && a.w != null && a.h != null) {
        return px >= a.x - r && px <= a.x + a.w + r && py >= a.y - r && py <= a.y + a.h + r;
      }
      return false;
    }
    function DrawingCapture({ active, color, width, shape, onCommit, onErase, annotations }) {
      const [stroke, setStroke] = React.useState(null);
      const [eraseCursor, setEraseCursor] = React.useState(null);
      const hostRef = React.useRef(null);
      const drawingRef = React.useRef(false);
      const sh = shape || "free";
      const isErase = sh === "erase";
      if (!active) return null;
      const c = DRAW_COLORS[color] || color || "#dc2626";
      function getXY(e, host) {
        const rect = host.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }
      function performErase(x, y) {
        if (!Array.isArray(annotations) || typeof onErase !== "function") return;
        for (let i = 0; i < annotations.length; i++) {
          const a = annotations[i];
          if (_annotationHit(a, x, y, ERASER_RADIUS)) {
            onErase(a.id);
          }
        }
      }
      function pointerDown(e) {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        e.preventDefault();
        e.stopPropagation();
        drawingRef.current = true;
        const host = e.currentTarget;
        const { x, y } = getXY(e, host);
        try {
          host.setPointerCapture(e.pointerId);
        } catch (_) {
        }
        if (isErase) {
          setEraseCursor({ x, y });
          performErase(x, y);
          return;
        }
        if (sh === "free") {
          setStroke({ shape: "free", points: [{ x, y }], color, width });
        } else {
          setStroke({ shape: sh, start: { x, y }, end: { x, y }, color, width });
        }
      }
      function pointerMove(e) {
        if (drawingRef.current) {
          e.preventDefault();
          e.stopPropagation();
        }
        const host = e.currentTarget;
        const { x, y } = getXY(e, host);
        if (isErase) {
          setEraseCursor({ x, y });
          if (drawingRef.current) {
            e.preventDefault();
            e.stopPropagation();
            performErase(x, y);
          }
          return;
        }
        if (!drawingRef.current) return;
        setStroke(function(prev) {
          if (!prev) return prev;
          if (prev.shape === "free") {
            const last = prev.points[prev.points.length - 1];
            if (last && Math.abs(last.x - x) < 1.2 && Math.abs(last.y - y) < 1.2) return prev;
            return Object.assign({}, prev, { points: prev.points.concat([{ x, y }]) });
          }
          return Object.assign({}, prev, { end: { x, y } });
        });
      }
      function pointerUp(e) {
        if (!drawingRef.current) {
          if (isErase) setEraseCursor(null);
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        drawingRef.current = false;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch (_) {
        }
        if (isErase) {
          return;
        }
        const prev = stroke;
        setStroke(null);
        if (!prev || typeof onCommit !== "function") return;
        if (prev.shape === "free") {
          if (prev.points.length < 2) return;
          onCommit(prev);
        } else {
          const dx = prev.end.x - prev.start.x, dy = prev.end.y - prev.start.y;
          if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
          onCommit(prev);
        }
      }
      function pointerLeave() {
        if (isErase) setEraseCursor(null);
      }
      const renderPreview = () => {
        if (!stroke) return null;
        if (stroke.shape === "free") {
          let d = "";
          for (let i = 0; i < stroke.points.length; i++) {
            const p = stroke.points[i];
            d += (i === 0 ? "M" : " L") + p.x.toFixed(1) + " " + p.y.toFixed(1);
          }
          return /* @__PURE__ */ React.createElement("path", { d, fill: "none", stroke: c, strokeWidth: width, strokeLinecap: "round", strokeLinejoin: "round" });
        }
        const sx = stroke.start.x, sy = stroke.start.y, ex = stroke.end.x, ey = stroke.end.y;
        if (stroke.shape === "line") {
          return /* @__PURE__ */ React.createElement("line", { x1: sx, y1: sy, x2: ex, y2: ey, stroke: c, strokeWidth: width, strokeLinecap: "round" });
        }
        if (stroke.shape === "arrow") {
          const dx = ex - sx, dy = ey - sy;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const ux = dx / len, uy = dy / len, qx = -uy, qy = ux;
          const ah = Math.max(8, Math.min(24, width * 3));
          const baseX = ex - ux * ah, baseY = ey - uy * ah;
          const v1x = baseX + qx * (ah * 0.5), v1y = baseY + qy * (ah * 0.5);
          const v2x = baseX - qx * (ah * 0.5), v2y = baseY - qy * (ah * 0.5);
          return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("line", { x1: sx, y1: sy, x2: ex, y2: ey, stroke: c, strokeWidth: width, strokeLinecap: "round" }), /* @__PURE__ */ React.createElement("polygon", { points: ex + "," + ey + " " + v1x + "," + v1y + " " + v2x + "," + v2y, fill: c, stroke: c, strokeWidth: 1 }));
        }
        if (stroke.shape === "rect") {
          const rx = Math.min(sx, ex), ry = Math.min(sy, ey);
          const rw = Math.abs(ex - sx), rh = Math.abs(ey - sy);
          return /* @__PURE__ */ React.createElement("rect", { x: rx, y: ry, width: rw, height: rh, fill: "none", stroke: c, strokeWidth: width });
        }
        if (stroke.shape === "circle") {
          const cx = (sx + ex) / 2, cy = (sy + ey) / 2;
          const rx = Math.abs(ex - sx) / 2, ry = Math.abs(ey - sy) / 2;
          return /* @__PURE__ */ React.createElement("ellipse", { cx, cy, rx, ry, fill: "none", stroke: c, strokeWidth: width });
        }
        return null;
      };
      const cursorStyle = isErase ? "cell" : "crosshair";
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          ref: hostRef,
          className: "absolute inset-0 z-[60]",
          style: { cursor: cursorStyle, touchAction: "none" },
          onPointerDown: pointerDown,
          onPointerMove: pointerMove,
          onPointerUp: pointerUp,
          onPointerCancel: pointerUp,
          onPointerLeave: pointerLeave,
          "aria-label": isErase ? "Eraser surface" : "Drawing surface"
        },
        stroke && /* @__PURE__ */ React.createElement("svg", { width: "100%", height: "100%", style: { display: "block", position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }, "aria-hidden": "true" }, renderPreview()),
        isErase && eraseCursor ? /* @__PURE__ */ React.createElement(
          "div",
          {
            "aria-hidden": "true",
            style: {
              position: "absolute",
              top: eraseCursor.y - ERASER_RADIUS,
              left: eraseCursor.x - ERASER_RADIUS,
              width: ERASER_RADIUS * 2,
              height: ERASER_RADIUS * 2,
              border: "2px dashed #ef4444",
              borderRadius: "50%",
              background: "rgba(239,68,68,0.08)",
              pointerEvents: "none"
            }
          }
        ) : null
      );
    }
    function Overlay({ annotations, mode, isTeacher, onNoteChange, onNoteDelete, onHighlightDelete, onVoiceDelete, onDrawDelete, onMove }) {
      if (!Array.isArray(annotations) || annotations.length === 0) return null;
      const migrated = migrateLegacyShape(annotations);
      const dragMode = !mode || mode === "off";
      function canDrag(a) {
        if (!dragMode || !onMove) return false;
        if (isTeacher) return true;
        return a && a.author === "student";
      }
      return /* @__PURE__ */ React.createElement(React.Fragment, null, migrated.map(function(a) {
        if (!a) return null;
        if (a.kind === "note") {
          return /* @__PURE__ */ React.createElement(NoteBubble, { key: a.id, a, onChange: onNoteChange, onDelete: onNoteDelete, draggable: canDrag(a), onMove });
        }
        if (a.kind === "highlight") {
          return /* @__PURE__ */ React.createElement(HighlightOverlay, { key: a.id, a, onDelete: onHighlightDelete });
        }
        if (a.kind === "voice") {
          if (a.pending) return null;
          return /* @__PURE__ */ React.createElement(VoiceNoteBubble, { key: a.id, a, onDelete: onVoiceDelete, draggable: canDrag(a), onMove });
        }
        if (a.kind === "draw") {
          return /* @__PURE__ */ React.createElement(DrawingOverlay, { key: a.id, a, onDelete: onDrawDelete });
        }
        return /* @__PURE__ */ React.createElement(StickerNode, { key: a.id, s: a, draggable: canDrag(a), onMove });
      }));
    }
    function Toolbar(props) {
      const Smile = window.AlloIcons && window.AlloIcons.Smile || null;
      const StickyNote = window.AlloIcons && window.AlloIcons.StickyNote || null;
      const Highlighter = window.AlloIcons && window.AlloIcons.Highlighter || null;
      const Mic = window.AlloIcons && window.AlloIcons.Mic || null;
      const Trash2 = window.AlloIcons && window.AlloIcons.Trash2 || null;
      const tt = typeof props.t === "function" ? props.t : (k) => k;
      _captureHostT(props);
      let mode = props.mode;
      if (mode == null) mode = props.isStickerMode ? "sticker" : "";
      const stickerType = props.stickerType || "star";
      const noteColor = props.noteColor || "yellow";
      const highlightColor = props.highlightColor || "yellow";
      const onSetMode = props.onSetMode || function() {
      };
      const onPickType = props.onPickType || function() {
      };
      const onPickNoteColor = props.onPickNoteColor || function() {
      };
      const onPickHighlightColor = props.onPickHighlightColor || function() {
      };
      const onClear = props.onClear || function() {
      };
      const onPickTemplate = props.onPickTemplate || function() {
      };
      const noteTemplate = props.noteTemplate || "";
      const isTeacher = !!props.isTeacher;
      const drawColor = props.drawColor || "red";
      const drawWidth = typeof props.drawWidth === "number" ? props.drawWidth : 4;
      const drawShape = props.drawShape || "free";
      const onPickDrawColor = props.onPickDrawColor || function() {
      };
      const onPickDrawWidth = props.onPickDrawWidth || function() {
      };
      const onPickDrawShape = props.onPickDrawShape || function() {
      };
      const templateSet = isTeacher ? TEACHER_NOTE_TEMPLATES : STUDENT_NOTE_TEMPLATES;
      const onToggleMode = props.onToggleMode;
      const toggleStickerMode = function() {
        if (onToggleMode) {
          onToggleMode();
          return;
        }
        onSetMode(mode === "sticker" ? "" : "sticker");
      };
      const toggleNoteMode = function() {
        onSetMode(mode === "note" ? "" : "note");
      };
      const toggleHighlightMode = function() {
        onSetMode(mode === "highlight" ? "" : "highlight");
      };
      const toggleVoiceMode = function() {
        onSetMode(mode === "voice" ? "" : "voice");
      };
      const toggleDrawMode = function() {
        onSetMode(mode === "draw" ? "" : "draw");
      };
      return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: toggleStickerMode,
          className: "p-1.5 rounded-full transition-all motion-reduce:transition-none flex items-center gap-1 text-xs font-bold px-2 me-1 " + (mode === "sticker" ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-200" : "text-slate-600 hover:bg-slate-100"),
          title: tt("toolbar.stickers_tooltip"),
          "aria-pressed": mode === "sticker"
        },
        Smile ? /* @__PURE__ */ React.createElement(Smile, { size: 14 }) : /* @__PURE__ */ React.createElement("span", null, "\u{1F642}"),
        " ",
        tt("toolbar.stickers_label")
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: toggleNoteMode,
          className: "p-1.5 rounded-full transition-all motion-reduce:transition-none flex items-center gap-1 text-xs font-bold px-2 me-1 " + (mode === "note" ? "bg-amber-100 text-amber-700 ring-2 ring-amber-200" : "text-slate-600 hover:bg-slate-100"),
          title: "Sticky note: click anywhere to leave a note",
          "aria-pressed": mode === "note"
        },
        StickyNote ? /* @__PURE__ */ React.createElement(StickyNote, { size: 14 }) : /* @__PURE__ */ React.createElement("span", null, "\u{1F4DD}"),
        " ",
        "Note"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: toggleHighlightMode,
          className: "p-1.5 rounded-full transition-all motion-reduce:transition-none flex items-center gap-1 text-xs font-bold px-2 me-1 " + (mode === "highlight" ? "bg-yellow-100 text-yellow-800 ring-2 ring-yellow-300" : "text-slate-600 hover:bg-slate-100"),
          title: "Highlighter: select text to highlight",
          "aria-pressed": mode === "highlight"
        },
        Highlighter ? /* @__PURE__ */ React.createElement(Highlighter, { size: 14 }) : /* @__PURE__ */ React.createElement("span", null, "\u{1F58D}"),
        " ",
        "Highlight"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: toggleVoiceMode,
          className: "p-1.5 rounded-full transition-all motion-reduce:transition-none flex items-center gap-1 text-xs font-bold px-2 me-1 " + (mode === "voice" ? "bg-red-100 text-red-700 ring-2 ring-red-200" : "text-slate-600 hover:bg-slate-100"),
          title: "Voice note: click to start recording (max 60s, stays local)",
          "aria-pressed": mode === "voice"
        },
        Mic ? /* @__PURE__ */ React.createElement(Mic, { size: 14 }) : /* @__PURE__ */ React.createElement("span", null, "\u{1F3A4}"),
        " ",
        "Voice"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: toggleDrawMode,
          className: "p-1.5 rounded-full transition-all motion-reduce:transition-none flex items-center gap-1 text-xs font-bold px-2 me-1 " + (mode === "draw" ? "bg-fuchsia-100 text-fuchsia-700 ring-2 ring-fuchsia-200" : "text-slate-600 hover:bg-slate-100"),
          title: "Drawing: freehand pen overlay",
          "aria-pressed": mode === "draw"
        },
        /* @__PURE__ */ React.createElement("span", null, "\u270F\uFE0F"),
        " ",
        "Draw"
      ), mode === "sticker" && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 animate-in motion-reduce:animate-none slide-in-from-left-2 duration-200 border-s border-slate-200 ps-1" }, STICKER_TYPES.map(function(type) {
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            "aria-label": type,
            key: type,
            onClick: function() {
              onPickType(type);
            },
            className: "w-6 h-6 flex items-center justify-center rounded-full text-sm hover:scale-125 transition-transform motion-reduce:transition-none motion-reduce:transform-none " + (stickerType === type ? "bg-indigo-50 shadow-sm scale-110 ring-1 ring-indigo-200" : "opacity-60 hover:opacity-100")
          },
          STICKER_ICONS[type]
        );
      }), /* @__PURE__ */ React.createElement("div", { className: "w-px h-4 bg-slate-200 mx-1" }), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: onClear,
          className: "w-6 h-6 inline-flex items-center justify-center text-slate-600 hover:text-red-500 rounded-full",
          title: tt("toolbar.clear_stickers"),
          "aria-label": tt("toolbar.clear_stickers")
        },
        Trash2 ? /* @__PURE__ */ React.createElement(Trash2, { size: 12 }) : /* @__PURE__ */ React.createElement("span", null, "\u{1F5D1}")
      )), mode === "note" && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 animate-in motion-reduce:animate-none slide-in-from-left-2 duration-200 border-s border-slate-200 ps-1" }, NOTE_COLOR_KEYS.map(function(key) {
        const palette = NOTE_COLORS[key];
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            key,
            "aria-label": "Note color " + key,
            onClick: function() {
              onPickNoteColor(key);
            },
            className: "w-6 h-6 rounded transition-transform motion-reduce:transition-none motion-reduce:transform-none hover:scale-125 " + (noteColor === key ? "ring-2 ring-amber-500 scale-110" : "opacity-70 hover:opacity-100"),
            style: { background: palette.fill, border: "2px solid " + palette.border },
            title: key
          }
        );
      }), /* @__PURE__ */ React.createElement("div", { className: "w-px h-4 bg-slate-200 mx-1" }), /* @__PURE__ */ React.createElement(
        "select",
        {
          value: noteTemplate,
          onChange: function(e) {
            onPickTemplate(e.target.value);
          },
          className: "text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 rounded px-1.5 py-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 max-w-[150px]",
          "aria-label": t("a11y.note_template"),
          title: noteTemplate ? "Template active: next note auto-fills" : "Pick a template to auto-fill the next note",
          style: { minHeight: 24 }
        },
        /* @__PURE__ */ React.createElement("option", { value: "" }, "Custom (type)"),
        templateSet.map(function(tmpl) {
          return /* @__PURE__ */ React.createElement("option", { key: tmpl.label, value: tmpl.content }, tmpl.label);
        })
      ), /* @__PURE__ */ React.createElement("div", { className: "w-px h-4 bg-slate-200 mx-1" }), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: onClear,
          className: "w-6 h-6 inline-flex items-center justify-center text-slate-600 hover:text-red-500 rounded-full",
          title: "Clear all annotations",
          "aria-label": t("a11y.clear_all_annotations")
        },
        Trash2 ? /* @__PURE__ */ React.createElement(Trash2, { size: 12 }) : /* @__PURE__ */ React.createElement("span", null, "\u{1F5D1}")
      )), mode === "highlight" && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 animate-in motion-reduce:animate-none slide-in-from-left-2 duration-200 border-s border-slate-200 ps-1" }, HIGHLIGHT_COLOR_KEYS.map(function(key) {
        const palette = HIGHLIGHT_COLORS[key];
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            key,
            "aria-label": "Highlight color " + key,
            onClick: function() {
              onPickHighlightColor(key);
            },
            className: "w-6 h-6 rounded transition-transform motion-reduce:transition-none motion-reduce:transform-none hover:scale-125 " + (highlightColor === key ? "ring-2 ring-yellow-500 scale-110" : "opacity-70 hover:opacity-100"),
            style: { background: palette.fill, border: "2px solid " + palette.border },
            title: key
          }
        );
      }), /* @__PURE__ */ React.createElement("div", { className: "w-px h-4 bg-slate-200 mx-1" }), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: onClear,
          className: "w-6 h-6 inline-flex items-center justify-center text-slate-600 hover:text-red-500 rounded-full",
          title: "Clear all annotations",
          "aria-label": t("a11y.clear_all_annotations")
        },
        Trash2 ? /* @__PURE__ */ React.createElement(Trash2, { size: 12 }) : /* @__PURE__ */ React.createElement("span", null, "\u{1F5D1}")
      )), mode === "draw" && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 animate-in motion-reduce:animate-none slide-in-from-left-2 duration-200 border-s border-slate-200 ps-1" }, DRAW_SHAPES.map(function(sh) {
        const isErase = sh === "erase";
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            key: sh,
            "aria-label": DRAW_SHAPE_LABELS[sh] || sh,
            onClick: function() {
              onPickDrawShape(sh);
            },
            className: "flex items-center justify-center rounded transition-transform motion-reduce:transition-none motion-reduce:transform-none hover:scale-125 " + (drawShape === sh ? isErase ? "ring-2 ring-red-500 scale-110 bg-red-50" : "ring-2 ring-fuchsia-500 scale-110 bg-fuchsia-50" : "opacity-70 hover:opacity-100"),
            style: { width: 24, height: 24, fontSize: 14 },
            title: DRAW_SHAPE_LABELS[sh]
          },
          /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, DRAW_SHAPE_ICONS[sh])
        );
      }), drawShape !== "erase" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "w-px h-4 bg-slate-200 mx-1" }), DRAW_COLOR_KEYS.map(function(key) {
        const c = DRAW_COLORS[key];
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            key,
            "aria-label": "Draw color " + key,
            onClick: function() {
              onPickDrawColor(key);
            },
            className: "w-6 h-6 rounded-full transition-transform motion-reduce:transition-none motion-reduce:transform-none hover:scale-125 " + (drawColor === key ? "ring-2 ring-fuchsia-500 scale-110" : "opacity-70 hover:opacity-100"),
            style: { background: c, border: "2px solid " + c },
            title: key
          }
        );
      }), (function() {
        const isCustom = DRAW_COLOR_KEYS.indexOf(drawColor) === -1;
        const currentHex = DRAW_COLORS[drawColor] || drawColor || "#dc2626";
        return /* @__PURE__ */ React.createElement(
          "label",
          {
            className: "relative w-6 h-6 rounded-full overflow-hidden transition-transform motion-reduce:transition-none motion-reduce:transform-none hover:scale-125 cursor-pointer " + (isCustom ? "ring-2 ring-fuchsia-500 scale-110" : "opacity-70 hover:opacity-100"),
            style: {
              // Rainbow gradient hint that this swatch picks any color
              background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
              border: "2px solid " + (isCustom ? currentHex : "#94a3b8")
            },
            title: "Pick any color",
            "aria-label": "Pick a custom draw color"
          },
          isCustom ? /* @__PURE__ */ React.createElement(
            "span",
            {
              "aria-hidden": "true",
              style: {
                position: "absolute",
                inset: 0,
                background: currentHex,
                borderRadius: "50%"
              }
            }
          ) : null,
          /* @__PURE__ */ React.createElement(
            "input",
            {
              type: "color",
              value: currentHex,
              onChange: function(e) {
                onPickDrawColor(e.target.value);
              },
              className: "absolute inset-0 opacity-0 cursor-pointer",
              style: { width: "100%", height: "100%" },
              "aria-label": "Pick any color"
            }
          )
        );
      })(), /* @__PURE__ */ React.createElement("div", { className: "w-px h-4 bg-slate-200 mx-1" }), DRAW_WIDTHS.map(function(w) {
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            key: "w" + w,
            "aria-label": "Line width " + w + "px",
            onClick: function() {
              onPickDrawWidth(w);
            },
            className: "flex items-center justify-center rounded transition-transform motion-reduce:transition-none motion-reduce:transform-none hover:scale-125 " + (drawWidth === w ? "ring-2 ring-fuchsia-500 scale-110 bg-fuchsia-50" : "opacity-70 hover:opacity-100"),
            style: { width: 24, height: 24 },
            title: w + "px"
          },
          /* @__PURE__ */ React.createElement("span", { style: { display: "inline-block", width: 12, height: w, borderRadius: w / 2, background: "#374151" } })
        );
      })) : null, /* @__PURE__ */ React.createElement("div", { className: "w-px h-4 bg-slate-200 mx-1" }), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: onClear,
          className: "w-6 h-6 inline-flex items-center justify-center text-slate-600 hover:text-red-500 rounded-full",
          title: "Clear all annotations",
          "aria-label": t("a11y.clear_all_annotations")
        },
        Trash2 ? /* @__PURE__ */ React.createElement(Trash2, { size: 12 }) : /* @__PURE__ */ React.createElement("span", null, "\u{1F5D1}")
      )));
    }
    function createStickerFromClick(hostEl, evt, opts) {
      if (!hostEl || !evt) return null;
      const target = evt.target;
      if (!target) return null;
      if (target.tagName === "BUTTON" || target.tagName === "INPUT" || target.tagName === "TEXTAREA") return null;
      if (target.closest && target.closest("button")) return null;
      const rect = hostEl.getBoundingClientRect();
      const x = evt.clientX - rect.left + (hostEl.scrollLeft || 0);
      const y = evt.clientY - rect.top + (hostEl.scrollTop || 0);
      const o = opts || {};
      return {
        id: Date.now(),
        kind: "sticker",
        type: o.stickerType || "star",
        x,
        y,
        author: o.isTeacher ? "teacher" : "student",
        authorName: !o.isTeacher ? o.authorName || "" : "",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    function createNoteFromClick(hostEl, evt, opts) {
      if (!hostEl || !evt) return null;
      const target = evt.target;
      if (!target) return null;
      if (target.tagName === "BUTTON" || target.tagName === "INPUT" || target.tagName === "TEXTAREA") return null;
      if (target.closest && target.closest("button")) return null;
      if (target.closest && target.closest("[data-allo-note-expanded]")) return null;
      const rect = hostEl.getBoundingClientRect();
      const x = evt.clientX - rect.left + (hostEl.scrollLeft || 0);
      const y = evt.clientY - rect.top + (hostEl.scrollTop || 0);
      const o = opts || {};
      const color = NOTE_COLORS[o.color] ? o.color : "yellow";
      return {
        id: Date.now(),
        kind: "note",
        x,
        y,
        // Template support: if caller passes a pre-filled content string
        // (from the Templates picker), use it. Otherwise start empty and let
        // the inline editor open for typing.
        content: typeof o.templateContent === "string" ? o.templateContent : "",
        color,
        author: o.isTeacher ? "teacher" : "student",
        authorName: !o.isTeacher ? o.authorName || "" : "",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    function createDrawingFromStroke(stroke, opts) {
      if (!stroke) return null;
      const o = opts || {};
      const shape = stroke.shape || "free";
      const w = typeof stroke.width === "number" ? stroke.width : 4;
      const color = stroke.color || "red";
      const base = {
        id: Date.now(),
        kind: "draw",
        shape,
        color,
        width: w,
        author: o.isTeacher ? "teacher" : "student",
        authorName: !o.isTeacher ? o.authorName || "" : "",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (shape === "free") {
        if (!Array.isArray(stroke.points) || stroke.points.length < 2) return null;
        let minX2 = Infinity, minY2 = Infinity, maxX2 = -Infinity, maxY2 = -Infinity;
        for (let i = 0; i < stroke.points.length; i++) {
          const p = stroke.points[i];
          if (p.x < minX2) minX2 = p.x;
          if (p.y < minY2) minY2 = p.y;
          if (p.x > maxX2) maxX2 = p.x;
          if (p.y > maxY2) maxY2 = p.y;
        }
        return Object.assign(base, {
          points: stroke.points.slice(),
          x: minX2 - w,
          y: minY2 - w,
          w: maxX2 - minX2 + w * 2,
          h: maxY2 - minY2 + w * 2
        });
      }
      if (!stroke.start || !stroke.end) return null;
      const sx = stroke.start.x, sy = stroke.start.y;
      const ex = stroke.end.x, ey = stroke.end.y;
      if (Math.abs(ex - sx) < 2 && Math.abs(ey - sy) < 2) return null;
      const minX = Math.min(sx, ex), minY = Math.min(sy, ey);
      const maxX = Math.max(sx, ex), maxY = Math.max(sy, ey);
      return Object.assign(base, {
        start: { x: sx, y: sy },
        end: { x: ex, y: ey },
        x: minX - w,
        y: minY - w,
        w: maxX - minX + w * 2,
        h: maxY - minY + w * 2
      });
    }
    function createVoicePlaceholder(hostEl, evt, opts) {
      if (!hostEl || !evt) return null;
      const target = evt.target;
      if (!target) return null;
      if (target.tagName === "BUTTON" || target.tagName === "INPUT" || target.tagName === "TEXTAREA") return null;
      if (target.closest && target.closest("button")) return null;
      if (target.closest && target.closest("[data-allo-anno]")) return null;
      const rect = hostEl.getBoundingClientRect();
      const x = evt.clientX - rect.left + (hostEl.scrollLeft || 0);
      const y = evt.clientY - rect.top + (hostEl.scrollTop || 0);
      const o = opts || {};
      return {
        id: Date.now(),
        kind: "voice",
        x,
        y,
        audioBase64: null,
        // filled by attachAudioToVoiceNote on stop
        mimeType: null,
        durationSec: null,
        pending: true,
        // flag: don't render the bubble until audio attached
        author: o.isTeacher ? "teacher" : "student",
        authorName: !o.isTeacher ? o.authorName || "" : "",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    function attachAudioToVoiceNote(annotations, id, payload) {
      if (!Array.isArray(annotations)) return annotations;
      const ab = payload && payload.audioBase64 || "";
      if (!ab) {
        return annotations.filter(function(a) {
          return a && a.id !== id;
        });
      }
      if (ab.length > VOICE_MAX_BYTES) {
        return { error: "too-large", size: ab.length, list: annotations.filter(function(a) {
          return a && a.id !== id;
        }) };
      }
      return annotations.map(function(a) {
        if (!a || a.id !== id) return a;
        return Object.assign({}, a, {
          audioBase64: ab,
          mimeType: payload.mimeType || "audio/webm",
          durationSec: typeof payload.durationSec === "number" ? payload.durationSec : null,
          pending: false
        });
      });
    }
    function createHighlightFromSelection(hostEl, selection, opts) {
      if (!hostEl || !selection) return null;
      if (selection.isCollapsed) return null;
      if (selection.rangeCount === 0) return null;
      const text = (selection.toString() || "").trim();
      if (!text) return null;
      const range = selection.getRangeAt(0);
      if (!range) return null;
      const anchor = range.commonAncestorContainer;
      if (!anchor) return null;
      const anchorEl = anchor.nodeType === 1 ? anchor : anchor.parentNode;
      if (!anchorEl || !hostEl.contains(anchorEl)) return null;
      const clientRects = range.getClientRects();
      if (!clientRects || clientRects.length === 0) return null;
      const hostRect = hostEl.getBoundingClientRect();
      const scrollLeft = hostEl.scrollLeft || 0;
      const scrollTop = hostEl.scrollTop || 0;
      const rects = [];
      for (let i = 0; i < clientRects.length; i++) {
        const cr = clientRects[i];
        if (cr.width <= 1 || cr.height <= 1) continue;
        rects.push({
          x: Math.round(cr.left - hostRect.left + scrollLeft),
          y: Math.round(cr.top - hostRect.top + scrollTop),
          w: Math.round(cr.width),
          h: Math.round(cr.height)
        });
      }
      if (rects.length === 0) return null;
      const o = opts || {};
      const color = HIGHLIGHT_COLORS[o.color] ? o.color : "yellow";
      return {
        id: Date.now(),
        kind: "highlight",
        rects,
        text: text.slice(0, 500),
        // cap to keep saved JSON manageable
        color,
        author: o.isTeacher ? "teacher" : "student",
        authorName: !o.isTeacher ? o.authorName || "" : "",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    function importAnnotations(existing, payload, opts) {
      const o = opts || {};
      const out = { list: Array.isArray(existing) ? existing.slice() : [], added: 0, skipped: 0, error: null };
      if (!payload) {
        out.error = "no-payload";
        return out;
      }
      let incoming = null;
      if (Array.isArray(payload)) incoming = payload;
      else if (payload && Array.isArray(payload.annotations)) incoming = payload.annotations;
      if (!incoming) {
        out.error = "bad-shape";
        return out;
      }
      const existingIds = {};
      out.list.forEach(function(a) {
        if (a && a.id != null) existingIds[String(a.id)] = true;
      });
      incoming.forEach(function(raw) {
        if (!raw || typeof raw !== "object") {
          out.skipped++;
          return;
        }
        if (!raw.kind && !STICKER_TYPES.includes(raw.type)) {
          out.skipped++;
          return;
        }
        let id = raw.id;
        if (id == null || existingIds[String(id)]) {
          id = Date.now() + Math.floor(Math.random() * 1e3);
        }
        existingIds[String(id)] = true;
        let author = raw.author || "student";
        let authorName = raw.authorName || "";
        if (o.forceAuthor) {
          author = o.forceAuthor;
          if (o.forceAuthorName != null) authorName = o.forceAuthorName;
        }
        const merged = Object.assign({}, raw, {
          id,
          author,
          authorName,
          // Mark as imported so future diff tools can tell where it came from.
          importedFrom: payload && payload.docTitle || raw.importedFrom || "unknown",
          importedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        out.list.push(merged);
        out.added++;
      });
      return out;
    }
    function focusAnnotation(hostEl, a) {
      if (!hostEl || !a) return;
      let fx = a.x, fy = a.y;
      if (a.kind === "highlight" && Array.isArray(a.rects) && a.rects.length > 0) {
        fx = a.rects[0].x + (a.rects[0].w || 0) / 2;
        fy = a.rects[0].y + (a.rects[0].h || 0) / 2;
      }
      if (typeof fy === "number" && typeof hostEl.scrollTo === "function") {
        const targetTop = Math.max(0, fy - (hostEl.clientHeight || 0) * 0.3);
        try {
          hostEl.scrollTo({ top: targetTop, behavior: "smooth" });
        } catch (_) {
          hostEl.scrollTop = targetTop;
        }
      }
      try {
        const pulse = document.createElement("div");
        pulse.style.cssText = "position:absolute;top:" + (fy - 24) + "px;left:" + (fx - 24) + "px;width:48px;height:48px;border-radius:50%;border:3px solid #6366f1;pointer-events:none;z-index:60;animation:alloflow-anno-pulse 1.2s ease-out forwards;";
        hostEl.appendChild(pulse);
        setTimeout(function() {
          try {
            pulse.remove();
          } catch (_) {
          }
        }, 1300);
      } catch (_) {
      }
    }
    function countByAuthor(annotations) {
      const out = { teacher: 0, student: 0, total: 0 };
      if (!Array.isArray(annotations)) return out;
      const migrated = migrateLegacyShape(annotations);
      migrated.forEach(function(a) {
        if (!a) return;
        out.total++;
        if (a.author === "teacher") out.teacher++;
        else out.student++;
      });
      return out;
    }
    function annotationPreview(a) {
      if (!a) return "";
      const kind = a.kind || "sticker";
      if (kind === "sticker") return (STICKER_ICONS[a.type] || "") + " " + (a.type || "sticker");
      if (kind === "note") {
        const c = (a.content || "").trim();
        return "\u{1F4DD} " + (c ? c.length > 60 ? c.slice(0, 60) + "\u2026" : c : "(empty note)");
      }
      if (kind === "highlight") {
        const c = (a.text || "").trim();
        return "\u{1F58D} " + (c ? '"' + (c.length > 60 ? c.slice(0, 60) + "\u2026" : c) + '"' : "(highlight)");
      }
      if (kind === "voice") {
        const d = typeof a.durationSec === "number" ? Math.round(a.durationSec) + "s" : "";
        return "\u{1F3A4} Voice note" + (d ? " (" + d + ")" : "");
      }
      return "";
    }
    function Sidebar(props) {
      const ChevronRight = window.AlloIcons && window.AlloIcons.ChevronRight || null;
      const X = window.AlloIcons && window.AlloIcons.X || null;
      const annotations = Array.isArray(props.annotations) ? migrateLegacyShape(props.annotations) : [];
      const isTeacher = !!props.isTeacher;
      const onFocus = props.onFocus || function() {
      };
      const onDelete = props.onDelete || function() {
      };
      const onClose = props.onClose || function() {
      };
      const onImport = typeof props.onImport === "function" ? props.onImport : null;
      const [filter, setFilter] = React.useState("all");
      const counts = countByAuthor(annotations);
      const visible = annotations.filter(function(a) {
        if (!a) return false;
        if (filter === "teacher") return a.author === "teacher";
        if (filter === "mine") {
          return isTeacher ? a.author === "teacher" : a.author === "student";
        }
        return true;
      });
      visible.sort(function(a, b) {
        if (a.author === "teacher" !== (b.author === "teacher")) {
          return a.author === "teacher" ? -1 : 1;
        }
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });
      const Pill = function(key, label, count) {
        const active = filter === key;
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key,
            type: "button",
            onClick: function() {
              setFilter(key);
            },
            className: "min-h-6 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors motion-reduce:transition-none " + (active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"),
            "aria-pressed": active
          },
          label,
          " ",
          count > 0 ? "(" + count + ")" : ""
        );
      };
      const mineCount = isTeacher ? counts.teacher : counts.student;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "fixed top-16 right-3 z-[60] bg-white border border-slate-300 rounded-xl shadow-2xl flex flex-col",
          style: { width: 300, maxHeight: "calc(100vh - 120px)" },
          role: "region",
          "aria-labelledby": "annotation-list-title"
        },
        /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 bg-slate-50 rounded-t-xl" }, /* @__PURE__ */ React.createElement("h2", { id: "annotation-list-title", className: "text-xs font-bold text-slate-700" }, "\u{1F4CB} Annotations ", /* @__PURE__ */ React.createElement("span", { className: "text-slate-600 font-normal" }, "(", counts.total, ")")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, onImport && /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: onImport,
            className: "min-h-6 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:text-indigo-700 rounded hover:bg-white border border-slate-300",
            "aria-label": "Import annotations from a saved file",
            title: "Import annotations from a file (e.g., a student's downloaded annotations)"
          },
          "\u{1F4C2} Import"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: onClose,
            className: "inline-flex min-h-6 min-w-6 items-center justify-center p-1 text-slate-500 hover:text-red-500 rounded-full hover:bg-white",
            "aria-label": "Close annotation list",
            title: "Close"
          },
          X ? /* @__PURE__ */ React.createElement(X, { size: 14 }) : /* @__PURE__ */ React.createElement("span", null, "\u2715")
        ))),
        /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 px-3 py-2 border-b border-slate-200", role: "group", "aria-label": "Filter annotations" }, Pill("all", "All", counts.total), Pill("teacher", "Teacher", counts.teacher), Pill("mine", isTeacher ? "Teacher" : "Mine", mineCount)),
        /* @__PURE__ */ React.createElement("div", { className: "overflow-y-auto flex-1 px-1 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-600", style: { minHeight: 100 }, role: "list", "aria-label": "Annotations", tabIndex: 0 }, visible.length === 0 && /* @__PURE__ */ React.createElement("div", { role: "listitem", className: "px-3 py-6 text-center text-[11px] text-slate-600 italic" }, "No annotations match this filter."), visible.map(function(a) {
          const isTeacherAnno = a.author === "teacher";
          const canDelete = isTeacher || a.author === "student";
          const title = buildStickerTitle(a);
          return /* @__PURE__ */ React.createElement(
            "div",
            {
              key: a.id,
              role: "listitem",
              className: "group px-2 py-1.5 mb-0.5 rounded-md text-xs transition-colors motion-reduce:transition-none " + (isTeacherAnno ? "bg-indigo-50/60 hover:bg-indigo-100 border-s-2 border-indigo-400" : "bg-amber-50/40 hover:bg-amber-100 border-s-2 border-amber-300")
            },
            /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-2" }, /* @__PURE__ */ React.createElement(
              "button",
              {
                type: "button",
                onClick: function() {
                  onFocus(a.id);
                },
                className: "min-h-6 flex-1 min-w-0 rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
                "aria-label": "Jump to " + annotationPreview(a) + " from " + title
              },
              /* @__PURE__ */ React.createElement("div", { className: "font-medium text-slate-800 truncate" }, annotationPreview(a)),
              /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-slate-500 mt-0.5 truncate" }, title || (isTeacherAnno ? "Teacher" : "Student"))
            ), canDelete && /* @__PURE__ */ React.createElement(
              "button",
              {
                type: "button",
                onClick: function(e) {
                  e.stopPropagation();
                  onDelete(a.id);
                },
                className: "inline-flex min-h-6 min-w-6 items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity motion-reduce:transition-none p-0.5 text-slate-600 hover:text-red-500 rounded",
                "aria-label": "Delete " + annotationPreview(a),
                title: "Delete"
              },
              X ? /* @__PURE__ */ React.createElement(X, { size: 12 }) : /* @__PURE__ */ React.createElement("span", null, "\u2715")
            ))
          );
        }))
      );
    }
    function updateAnnotation(annotations, id, patch) {
      if (!Array.isArray(annotations)) return annotations;
      return annotations.map(function(a) {
        if (!a || a.id !== id) return a;
        return Object.assign({}, a, patch || {});
      });
    }
    function removeAnnotation(annotations, id) {
      if (!Array.isArray(annotations)) return annotations;
      return annotations.filter(function(a) {
        return a && a.id !== id;
      });
    }
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AnnotationSuite = {
      InquiryBridge: window.AlloFlowAnnotationInquiryBridge || null,
      STICKER_ICONS,
      STICKER_TYPES,
      ANNOTATION_KINDS,
      NOTE_COLORS,
      NOTE_COLOR_KEYS,
      HIGHLIGHT_COLORS,
      HIGHLIGHT_COLOR_KEYS,
      DRAW_COLORS,
      DRAW_COLOR_KEYS,
      DRAW_WIDTHS,
      DRAW_SHAPES,
      DRAW_SHAPE_LABELS,
      DRAW_SHAPE_ICONS,
      ERASER_RADIUS,
      TEACHER_NOTE_TEMPLATES,
      STUDENT_NOTE_TEMPLATES,
      VOICE_MAX_SECONDS,
      VOICE_MAX_BYTES,
      StickerNode,
      NoteBubble,
      HighlightOverlay,
      VoiceNoteBubble,
      RecordingOverlay,
      DrawingOverlay,
      DrawingCapture,
      Overlay,
      Toolbar,
      Sidebar,
      createStickerFromClick,
      createNoteFromClick,
      createHighlightFromSelection,
      createVoicePlaceholder,
      createDrawingFromStroke,
      attachAudioToVoiceNote,
      importAnnotations,
      updateAnnotation,
      removeAnnotation,
      buildStickerTitle,
      migrateLegacyShape,
      focusAnnotation,
      countByAuthor,
      annotationPreview
    };
  }
});
require_tmp_annotation_suite_entry();
window.AlloModules = window.AlloModules || {};
window.AlloModules.AnnotationSuiteModule = true;
console.log('[AnnotationSuite] Toolbar + Overlay + helpers registered');
})();
