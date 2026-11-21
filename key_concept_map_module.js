(function() {
'use strict';
  // WCAG 2.1 AA: respect prefers-reduced-motion + keep slate-600 AA contrast
  if (!document.getElementById("key-concept-map-module-a11y")) { var _s = document.createElement("style"); _s.id = "key-concept-map-module-a11y"; _s.textContent = "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }"; document.head.appendChild(_s); }
if (window.AlloModules && window.AlloModules.KeyConceptMapModule) { console.log('[CDN] KeyConceptMapModule already loaded, skipping'); return; }
var React = window.React || React;
var useRef = React.useRef;
var useState = React.useState;
const _CONCEPT_ACCENTS = [
  { badge: "#4f46e5", ring: "rgba(99,102,241,0.28)", border: "#6366f1" },
  // indigo
  { badge: "#0f766e", ring: "rgba(20,184,166,0.28)", border: "#14b8a6" },
  // teal
  { badge: "#e11d48", ring: "rgba(244,63,94,0.28)", border: "#f43f5e" },
  // rose
  { badge: "#b45309", ring: "rgba(245,158,11,0.28)", border: "#f59e0b" },
  // amber
  { badge: "#7c3aed", ring: "rgba(139,92,246,0.28)", border: "#8b5cf6" },
  // violet
  { badge: "#0369a1", ring: "rgba(14,165,233,0.28)", border: "#0ea5e9" }
  // sky
];
const _conceptAccentFor = (i) => _CONCEPT_ACCENTS[i % _CONCEPT_ACCENTS.length];
let _kcmInstanceSeq = 0;
const _kcmT = (t, key, fallback) => {
  try {
    const v = t && t(key);
    return v && v !== key ? v : fallback;
  } catch (_) {
    return fallback;
  }
};
const _deriveSpine = (main, branches) => {
  const list = Array.isArray(branches) ? branches : [];
  const countOf = (b) => b && Array.isArray(b.items) ? b.items.length : 0;
  const engine = typeof window !== "undefined" && window.AlloModules && window.AlloModules.ConceptGraphEngine;
  if (engine && typeof engine.adaptGenerated === "function" && typeof engine.deriveOutline === "function") {
    try {
      const graph = engine.adaptGenerated({ main, branches: list, structureType: "Key Concept Map" });
      const byId = {};
      graph.nodes.forEach((n) => {
        byId[n.id] = n;
      });
      const derived = engine.deriveOutline(graph);
      const order = derived && Array.isArray(derived.order) ? derived.order : [];
      const rows2 = [];
      order.forEach((id) => {
        const n = byId[id];
        if (!n || n.type === "item") return;
        const bi = n.type === "branch" && /^b(\d+)$/.test(n.id) ? Number(n.id.slice(1)) : -1;
        rows2.push({
          id: n.id,
          type: n.type,
          label: n.label || "",
          items: bi >= 0 ? countOf(list[bi]) : 0
        });
      });
      if (rows2.length) return rows2;
    } catch (_) {
    }
  }
  const rows = [{ id: "root", type: "main", label: main == null ? "" : String(main), items: 0 }];
  list.forEach((b, bi) => {
    rows.push({
      id: "b" + bi,
      type: "branch",
      label: b && b.title != null ? String(b.title) : "",
      items: countOf(b)
    });
  });
  return rows;
};
const KeyConceptMapView = React.memo(({ branches, main, main_en, BranchItem, t }) => {
  const containerRef = useRef(null);
  const centerRef = useRef(null);
  const leftRefs = useRef([]);
  const rightRefs = useRef([]);
  const [lines, setLines] = useState([]);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [focusedBranch, setFocusedBranch] = useState(null);
  const [studyMode, setStudyMode] = useState(false);
  const [revealedBranches, setRevealedBranches] = useState(() => /* @__PURE__ */ new Set());
  const uidRef = useRef(null);
  if (uidRef.current == null) uidRef.current = ++_kcmInstanceSeq;
  const uid = uidRef.current;
  const safeBranches = Array.isArray(branches) ? branches : [];
  const mid = Math.ceil(safeBranches.length / 2);
  const left = safeBranches.slice(0, mid);
  const right = safeBranches.slice(mid);
  React.useEffect(() => {
    setFocusedBranch(null);
    setStudyMode(false);
    setRevealedBranches(/* @__PURE__ */ new Set());
  }, [main, branches]);
  const toggleRevealBranch = (bi) => {
    setRevealedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(bi)) next.delete(bi);
      else next.add(bi);
      return next;
    });
  };
  const spine = React.useMemo(() => _deriveSpine(main, safeBranches), [main, safeBranches]);
  const branchWord = _kcmT(t, "a11y.branch", "Branch");
  React.useLayoutEffect(() => {
    const compute = () => {
      const c = containerRef.current;
      const center = centerRef.current;
      if (!c || !center) return;
      const cRect = c.getBoundingClientRect();
      const centerRect = center.getBoundingClientRect();
      const centerX = centerRect.left + centerRect.width / 2 - cRect.left;
      const centerY = centerRect.top + centerRect.height / 2 - cRect.top;
      const centerR = centerRect.width / 2;
      const newLines = [];
      const buildLine = (el, side, idx, branchIdx) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const cardY = r.top + r.height / 2 - cRect.top;
        const cardX = side === "left" ? r.right - cRect.left : r.left - cRect.left;
        const dx = cardX - centerX, dy = cardY - centerY;
        const dist = Math.hypot(dx, dy) || 1;
        const bubbleX = centerX + dx / dist * centerR;
        const bubbleY = centerY + dy / dist * centerR;
        const midX = (bubbleX + cardX) / 2;
        const cp1x = midX, cp1y = bubbleY;
        const cp2x = midX, cp2y = cardY;
        newLines.push({
          key: side + "-" + idx,
          branchIdx,
          d: `M ${bubbleX} ${bubbleY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${cardX} ${cardY}`,
          bubbleX,
          bubbleY,
          cardX,
          cardY,
          accent: _conceptAccentFor(branchIdx),
          // Stagger the draw animation so lines appear one after another left→right.
          delayMs: 120 + branchIdx * 110
        });
      };
      leftRefs.current.forEach((el, i) => buildLine(el, "left", i, i));
      rightRefs.current.forEach((el, i) => buildLine(el, "right", i, i + mid));
      setLines(newLines);
      setDims({ w: cRect.width, h: cRect.height });
    };
    compute();
    const rafId = requestAnimationFrame(compute);
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", compute);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [branches.length, main, main_en, mid, studyMode, revealedBranches.size]);
  const allRevealed = branches.length > 0 && revealedBranches.size >= branches.length;
  const renderBranchCardContent = (b, bi, accent) => {
    if (!studyMode || revealedBranches.has(bi)) {
      return /* @__PURE__ */ React.createElement(BranchItem, { branch: b, bIdx: bi });
    }
    const detailCount = Array.isArray(b && b.items) ? b.items.length : 0;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        "data-kcm-masked-branch": bi,
        className: "rounded-2xl border-2 bg-white p-4 shadow-sm text-left space-y-2.5",
        style: { borderColor: accent.border }
      },
      /* @__PURE__ */ React.createElement("div", { className: "font-bold text-sm text-slate-800 pr-6" }, b && b.title ? b.title : `${branchWord} ${bi + 1}`),
      detailCount > 0 && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-600" }, detailCount, " ", _kcmT(t, "a11y.details", "details")),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "data-kcm-reveal-branch": bi,
          onClick: () => toggleRevealBranch(bi),
          className: "min-h-11 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        },
        /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F441}"),
        /* @__PURE__ */ React.createElement("span", null, _kcmT(t, "concept_map.reveal_details", "Reveal details"))
      )
    );
  };
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      role: "group",
      "aria-label": `${_kcmT(t, "a11y.concept_map", "Concept map")}: ${main || ""}`,
      className: "max-w-7xl mx-auto my-8 px-4"
    },
    /* @__PURE__ */ React.createElement("div", { className: "sr-only" }, /* @__PURE__ */ React.createElement("p", null, `${_kcmT(t, "a11y.concept_map", "Concept map")}: ${main || ""}${main_en ? ` (${main_en})` : ""}. ${branches.length} ${_kcmT(t, "a11y.branches", "branches")}.`), /* @__PURE__ */ React.createElement("ol", null, spine.filter((r) => r.type === "branch").map((r, i) => /* @__PURE__ */ React.createElement("li", { key: r.id }, `${branchWord} ${i + 1}: ${r.label}${r.items ? ` (${r.items} ${_kcmT(t, "a11y.details", "details")})` : ""}`)))),
    /* @__PURE__ */ React.createElement("style", null, `
                @keyframes alloflow-concept-draw {
                    from { stroke-dashoffset: var(--allo-draw-len, 2000); }
                    to   { stroke-dashoffset: 0; }
                }
                @keyframes alloflow-concept-dot-in {
                    0%   { opacity: 0; transform: scale(0.2); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes alloflow-concept-breathe {
                    0%, 100% { box-shadow: 0 0 50px rgba(99,102,241,0.45), 0 10px 30px rgba(67,56,202,0.25), inset 0 -10px 30px rgba(30,27,75,0.25); }
                    50%      { box-shadow: 0 0 70px rgba(99,102,241,0.6),  0 12px 34px rgba(67,56,202,0.32), inset 0 -10px 30px rgba(30,27,75,0.25); }
                }
                /* With the animation removed, the inline start state (dash offset 2000,
                    opacity 0) would stick and hide every line and dot \u2014 show the end state. */
                @media (prefers-reduced-motion: reduce) {
                    .alloflow-concept-line-primary, .alloflow-concept-endpoint, .alloflow-concept-bubble {
                        animation: none !important;
                        transition: none !important;
                    }
                    .alloflow-concept-line-primary { stroke-dasharray: none !important; }
                    .alloflow-concept-endpoint { opacity: 1 !important; }
                }
                .reduce-motion .alloflow-concept-line-primary,
                .reduce-motion .alloflow-concept-endpoint,
                .reduce-motion .alloflow-concept-bubble {
                    animation: none !important;
                    transition: none !important;
                }
                .reduce-motion .alloflow-concept-line-primary { stroke-dasharray: none !important; }
                .reduce-motion .alloflow-concept-endpoint { opacity: 1 !important; }
                @media print {
                    .alloflow-concept-line-primary, .alloflow-concept-endpoint, .alloflow-concept-bubble {
                        animation: none !important;
                        stroke-dasharray: none !important;
                    }
                    .alloflow-concept-endpoint { opacity: 1 !important; }
                    .alloflow-concept-bubble {
                        box-shadow: none !important;
                    }
                }
            `),
    branches.length >= 2 && /* @__PURE__ */ React.createElement("div", { "data-kcm-toolbar": true, className: "no-print mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2" }, /* @__PURE__ */ React.createElement("div", { role: "group", "aria-label": _kcmT(t, "concept_map.focus_branch_aria", "Focus a branch"), className: "flex flex-wrap items-center gap-1.5" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-indigo-900 mr-1" }, _kcmT(t, "concept_map.focus_label", "Focus"), ":"), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "data-kcm-focus-all": true,
        "aria-pressed": focusedBranch === null,
        onClick: () => setFocusedBranch(null),
        className: `min-h-11 rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${focusedBranch === null ? "bg-indigo-700 text-white border-indigo-700" : "bg-white text-indigo-800 border-indigo-200 hover:bg-indigo-100"}`
      },
      _kcmT(t, "common.all", "All")
    ), safeBranches.map((b, bi) => {
      const accent = _conceptAccentFor(bi);
      const isActive = focusedBranch === bi;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: bi,
          type: "button",
          "data-kcm-focus-branch": bi,
          "aria-pressed": isActive,
          "aria-label": `${branchWord} ${bi + 1}: ${b && b.title || ""}`,
          title: b && b.title || `${branchWord} ${bi + 1}`,
          onClick: () => setFocusedBranch((prev) => prev === bi ? null : bi),
          className: "min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-black border-2 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 " + (isActive ? "text-white" : "bg-white text-slate-800 hover:bg-slate-50"),
          style: isActive ? { backgroundColor: accent.badge, borderColor: accent.badge } : { borderColor: accent.border }
        },
        bi + 1
      );
    })), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "data-kcm-study-toggle": true,
        "aria-pressed": studyMode,
        onClick: () => {
          setStudyMode((prev) => {
            if (!prev) setRevealedBranches(/* @__PURE__ */ new Set());
            return !prev;
          });
        },
        className: `min-h-11 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${studyMode ? "bg-indigo-700 text-white border-indigo-700" : "bg-white text-indigo-800 border-indigo-300 hover:bg-indigo-100"}`
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, studyMode ? "\u2713" : "\u{1F9E0}"),
      /* @__PURE__ */ React.createElement("span", null, studyMode ? _kcmT(t, "concept_map.exit_self_test", "Exit self-test") : _kcmT(t, "concept_map.self_test", "Self-test"))
    ), studyMode && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        "data-kcm-reveal-all": true,
        onClick: () => setRevealedBranches(allRevealed ? /* @__PURE__ */ new Set() : new Set(branches.map((_, bi) => bi))),
        className: "min-h-11 inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
      },
      allRevealed ? _kcmT(t, "concept_map.hide_all", "Hide all") : `${_kcmT(t, "concept_map.reveal_all", "Reveal all")} (${revealedBranches.size}/${branches.length})`
    ))),
    /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: containerRef,
        className: "relative my-4 flex flex-col md:flex-row items-stretch justify-center"
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "hidden md:block absolute inset-0 pointer-events-none",
          "aria-hidden": "true",
          style: {
            zIndex: 0,
            background: "radial-gradient(ellipse 55% 65% at 50% 50%, rgba(165,180,252,0.18) 0%, rgba(199,210,254,0.08) 35%, transparent 70%)"
          }
        }
      ),
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "md:hidden absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] rounded-full pointer-events-none",
          "aria-hidden": "true",
          style: {
            zIndex: 2,
            background: "linear-gradient(to bottom, transparent 0%, rgba(129,140,248,0.55) 10%, rgba(129,140,248,0.55) 90%, transparent 100%)"
          }
        }
      ),
      /* @__PURE__ */ React.createElement(
        "svg",
        {
          className: "hidden md:block absolute inset-0 pointer-events-none",
          style: { zIndex: 5, overflow: "visible" },
          width: dims.w || "100%",
          height: dims.h || "100%",
          viewBox: `0 0 ${dims.w || 1} ${dims.h || 1}`,
          "aria-hidden": "true"
        },
        /* @__PURE__ */ React.createElement("defs", null, lines.map((l) => /* @__PURE__ */ React.createElement(
          "linearGradient",
          {
            key: l.key,
            id: `alloflow-concept-line-${uid}-${l.key}`,
            gradientUnits: "userSpaceOnUse",
            x1: Math.min(l.bubbleX, l.cardX),
            y1: 0,
            x2: Math.max(l.bubbleX, l.cardX),
            y2: 0
          },
          /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#6366f1", stopOpacity: "0.9" }),
          /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#a5b4fc", stopOpacity: "0.55" })
        )), /* @__PURE__ */ React.createElement("filter", { id: `alloflow-concept-line-glow-${uid}`, filterUnits: "userSpaceOnUse", x: 0, y: 0, width: dims.w || 1, height: dims.h || 1 }, /* @__PURE__ */ React.createElement("feGaussianBlur", { stdDeviation: "1.5" }))),
        lines.map((l) => {
          const dimmed = focusedBranch !== null && focusedBranch !== l.branchIdx;
          const highlighted = focusedBranch !== null && focusedBranch === l.branchIdx;
          return /* @__PURE__ */ React.createElement("g", { key: l.key, style: { opacity: dimmed ? 0.16 : 1, transition: "opacity 180ms ease" } }, /* @__PURE__ */ React.createElement("path", { d: l.d, fill: "none", stroke: "#c7d2fe", strokeWidth: highlighted ? 8 : 6, strokeLinecap: "round", opacity: 0.35, filter: `url(#alloflow-concept-line-glow-${uid})` }), /* @__PURE__ */ React.createElement(
            "path",
            {
              d: l.d,
              fill: "none",
              stroke: `url(#alloflow-concept-line-${uid}-${l.key})`,
              strokeWidth: highlighted ? 3.5 : 2.5,
              strokeLinecap: "round",
              className: "alloflow-concept-line-primary",
              style: {
                strokeDasharray: "2000 2000",
                animation: `alloflow-concept-draw 0.9s ease-out ${l.delayMs}ms forwards`,
                strokeDashoffset: 2e3
              }
            }
          ), /* @__PURE__ */ React.createElement(
            "circle",
            {
              cx: l.cardX,
              cy: l.cardY,
              r: 5,
              fill: l.accent.border,
              stroke: "#ffffff",
              strokeWidth: 2,
              className: "alloflow-concept-endpoint",
              style: {
                transformOrigin: `${l.cardX}px ${l.cardY}px`,
                animation: `alloflow-concept-dot-in 0.35s ease-out ${l.delayMs + 800}ms both`,
                opacity: 0
              }
            }
          ), /* @__PURE__ */ React.createElement(
            "circle",
            {
              cx: l.bubbleX,
              cy: l.bubbleY,
              r: 3,
              fill: "#ffffff",
              opacity: 0.85,
              className: "alloflow-concept-endpoint",
              style: {
                transformOrigin: `${l.bubbleX}px ${l.bubbleY}px`,
                animation: `alloflow-concept-dot-in 0.3s ease-out ${l.delayMs}ms both`,
                opacity: 0
              }
            }
          ));
        })
      ),
      /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex flex-col justify-between gap-8 py-4 z-10" }, left.map((b, i) => {
        const a = _conceptAccentFor(i);
        const dimmed = focusedBranch !== null && focusedBranch !== i;
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: i,
            ref: (el) => {
              leftRefs.current[i] = el;
            },
            className: `flex items-center justify-end group w-full transition-opacity motion-reduce:transition-none ${dimmed ? "opacity-35" : "opacity-100"}`
          },
          /* @__PURE__ */ React.createElement(
            "div",
            {
              tabIndex: 0,
              role: "group",
              "aria-label": `${branchWord} ${i + 1}: ${b && b.title || ""}`,
              className: "w-full max-w-xs relative rounded-2xl transition-all motion-reduce:transition-none duration-200 hover:scale-[1.02] motion-reduce:hover:scale-100 focus-visible:outline-none focus-visible:ring-4",
              style: { boxShadow: `0 0 0 0 ${a.ring}`, "--tw-ring-color": a.border },
              onMouseEnter: (e) => {
                e.currentTarget.style.boxShadow = `0 0 0 4px ${a.ring}`;
              },
              onMouseLeave: (e) => {
                if (typeof document !== "undefined" && document.activeElement && (e.currentTarget === document.activeElement || e.currentTarget.contains(document.activeElement))) return;
                e.currentTarget.style.boxShadow = `0 0 0 0 ${a.ring}`;
              },
              onFocus: (e) => {
                e.currentTarget.style.boxShadow = `0 0 0 4px ${a.ring}`;
              },
              onBlur: (e) => {
                e.currentTarget.style.boxShadow = `0 0 0 0 ${a.ring}`;
              }
            },
            /* @__PURE__ */ React.createElement(
              "div",
              {
                className: "absolute -top-3 -right-3 w-9 h-9 rounded-full text-white text-sm font-black flex items-center justify-center shadow-lg border-[3px] border-white z-20",
                style: { backgroundColor: a.badge },
                "aria-hidden": "true"
              },
              i + 1
            ),
            renderBranchCardContent(b, i, a)
          )
        );
      })),
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center px-8 md:px-16 z-20 my-4 md:my-0 shrink-0" }, /* @__PURE__ */ React.createElement(
        "div",
        {
          ref: centerRef,
          "aria-hidden": "true",
          className: "alloflow-concept-bubble relative w-52 h-52 rounded-full flex flex-col items-center justify-center text-center border-[6px] border-white transition-transform motion-reduce:transition-none duration-500 hover:scale-105 motion-reduce:hover:scale-100",
          style: {
            background: "radial-gradient(circle at 30% 30%, #818cf8 0%, #6366f1 45%, #4338ca 100%)",
            boxShadow: "0 0 50px rgba(99,102,241,0.45), 0 10px 30px rgba(67,56,202,0.25), inset 0 -10px 30px rgba(30,27,75,0.25)",
            animation: "alloflow-concept-breathe 4.2s ease-in-out infinite"
          }
        },
        /* @__PURE__ */ React.createElement("h3", { className: "font-black text-white text-base leading-tight relative z-10 drop-shadow-lg line-clamp-4 px-3" }, main),
        main_en && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-indigo-100 mt-1.5 opacity-95 relative z-10 font-bold line-clamp-1 px-3" }, "(", main_en, ")")
      )),
      /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex flex-col justify-between gap-8 py-4 z-10" }, right.map((b, i) => {
        const idx = i + mid;
        const a = _conceptAccentFor(idx);
        const dimmed = focusedBranch !== null && focusedBranch !== idx;
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: idx,
            ref: (el) => {
              rightRefs.current[i] = el;
            },
            className: `flex items-center justify-start group w-full transition-opacity motion-reduce:transition-none ${dimmed ? "opacity-35" : "opacity-100"}`
          },
          /* @__PURE__ */ React.createElement(
            "div",
            {
              tabIndex: 0,
              role: "group",
              "aria-label": `${branchWord} ${idx + 1}: ${b && b.title || ""}`,
              className: "w-full max-w-xs relative rounded-2xl transition-all motion-reduce:transition-none duration-200 hover:scale-[1.02] motion-reduce:hover:scale-100 focus-visible:outline-none focus-visible:ring-4",
              style: { boxShadow: `0 0 0 0 ${a.ring}`, "--tw-ring-color": a.border },
              onMouseEnter: (e) => {
                e.currentTarget.style.boxShadow = `0 0 0 4px ${a.ring}`;
              },
              onMouseLeave: (e) => {
                if (typeof document !== "undefined" && document.activeElement && (e.currentTarget === document.activeElement || e.currentTarget.contains(document.activeElement))) return;
                e.currentTarget.style.boxShadow = `0 0 0 0 ${a.ring}`;
              },
              onFocus: (e) => {
                e.currentTarget.style.boxShadow = `0 0 0 4px ${a.ring}`;
              },
              onBlur: (e) => {
                e.currentTarget.style.boxShadow = `0 0 0 0 ${a.ring}`;
              }
            },
            /* @__PURE__ */ React.createElement(
              "div",
              {
                className: "absolute -top-3 -left-3 w-9 h-9 rounded-full text-white text-sm font-black flex items-center justify-center shadow-lg border-[3px] border-white z-20",
                style: { backgroundColor: a.badge },
                "aria-hidden": "true"
              },
              idx + 1
            ),
            renderBranchCardContent(b, idx, a)
          )
        );
      }))
    )
  );
});
window.AlloModules = window.AlloModules || {};
window.AlloModules.KeyConceptMapView = KeyConceptMapView;
console.log("[KeyConceptMapModule] KeyConceptMapView registered.");
window.AlloModules = window.AlloModules || {};
window.AlloModules.KeyConceptMapView = (typeof KeyConceptMapView !== 'undefined') ? KeyConceptMapView : null;
window.AlloModules.KeyConceptMapModule = true;
console.log('[KeyConceptMapModule] KeyConceptMapView registered');
})();
