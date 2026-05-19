(function() {
'use strict';
if (window.AlloModules && window.AlloModules.ViewMiscPanelsModule) { console.log('[CDN] ViewMiscPanelsModule already loaded, skipping'); return; }
var React = window.React || React;
var ReactDOM = window.ReactDOM;  // PdfDiffViewer uses ReactDOM.createPortal
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var useContext = React.useContext;
var Fragment = React.Fragment;
var warnLog = (typeof window !== 'undefined' && window.warnLog) || console.warn.bind(console);
var debugLog = (typeof window !== 'undefined' && (window.__alloDebugLog || window.debugLog)) || function(){};
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
// Icons across all 6 components (de-duplicated):
var ArrowRight = _lazyIcon('ArrowRight');
var Brain = _lazyIcon('Brain');
var Check = _lazyIcon('Check');
var CheckCircle = _lazyIcon('CheckCircle');
var CheckCircle2 = _lazyIcon('CheckCircle2');
var Clock = _lazyIcon('Clock');
var Download = _lazyIcon('Download');
var FileText = _lazyIcon('FileText');
var Globe = _lazyIcon('Globe');
var GripVertical = _lazyIcon('GripVertical');
var Layers = _lazyIcon('Layers');
var Layout = _lazyIcon('Layout');
var Lightbulb = _lazyIcon('Lightbulb');
var Mic = _lazyIcon('Mic');
var Pencil = _lazyIcon('Pencil');
var Plus = _lazyIcon('Plus');
var RefreshCw = _lazyIcon('RefreshCw');
var Search = _lazyIcon('Search');
var Settings = _lazyIcon('Settings');
var Sparkles = _lazyIcon('Sparkles');
var StopCircle = _lazyIcon('StopCircle');
var UserCheck = _lazyIcon('UserCheck');
var Users = _lazyIcon('Users');
var X = _lazyIcon('X');
function PdfDiffViewer(props) {
  const {
    _applyTextSurgery,
    _lastDiffFingerprintRef,
    addToast,
    applyingRemarkup,
    callGemini,
    diffChunks,
    diffGranularity,
    diffLibLoading,
    diffLibReady,
    diffSelection,
    diffViewOpen,
    pdfFixResult,
    setApplyingRemarkup,
    setDiffChunks,
    setDiffGranularity,
    setDiffSelection,
    setDiffViewOpen,
    setPdfFixResult,
    setRangeRejected,
    toggleDiffChunk,
    warnLog
  } = props;
  if (!(diffViewOpen && pdfFixResult)) return null;
  return ReactDOM.createPortal((() => {
    const _src = pdfFixResult.sourceText || "";
    const _fin = pdfFixResult.finalText || "";
    const _chunks = diffChunks;
    let _ins = 0, _del = 0, _same = 0;
    let _rejCount = 0, _effectiveText = "";
    const _countedPairs = /* @__PURE__ */ new Set();
    if (_chunks) {
      _chunks.forEach((c) => {
        if (c.type === "add") {
          _ins += c.count || 1;
          if (c.rejected) {
            if (c.pairId && _countedPairs.has(c.pairId)) {
            } else {
              _rejCount++;
              if (c.pairId) _countedPairs.add(c.pairId);
            }
          } else {
            _effectiveText += c.value;
          }
        } else if (c.type === "del") {
          _del += c.count || 1;
          if (c.rejected) {
            if (c.pairId && _countedPairs.has(c.pairId)) {
            } else {
              _rejCount++;
              if (c.pairId) _countedPairs.add(c.pairId);
            }
            _effectiveText += c.value;
          }
        } else {
          _same += c.count || 1;
          _effectiveText += c.value;
        }
      });
    }
    const _onTryGranularityChange = (g) => {
      if (g === "chars") {
        const combined = (_src.length || 0) + (_fin.length || 0);
        const CHARS_GUARD_THRESHOLD = 2e4;
        if (combined > CHARS_GUARD_THRESHOLD) {
          const approxSec = Math.round(combined * combined / 1e9);
          const warn = `Character-level diff on this document (${combined.toLocaleString()} chars total) is very slow and may freeze the browser for ~${Math.max(5, approxSec)}s or more.

Consider Words or Sentences granularity instead.

Continue with Chars anyway?`;
          if (!window.confirm(warn)) return;
        }
      }
      if (_chunks && _chunks.some((c) => c.rejected)) {
        if (!window.confirm("Changing granularity will reset your rejections. Continue?")) return;
      }
      setDiffGranularity(g);
      setDiffSelection(null);
    };
    const _undoAllRejections = () => {
      setDiffChunks((prev) => prev ? prev.map((c) => c.rejected ? { ...c, rejected: false } : c) : prev);
      setDiffSelection(null);
    };
    const _onDiffMouseUp = () => {
      try {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
          setDiffSelection(null);
          return;
        }
        const startEl = sel.anchorNode?.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
        const endEl = sel.focusNode?.nodeType === 3 ? sel.focusNode.parentElement : sel.focusNode;
        const startChunk = startEl?.closest?.("[data-chunk-id]");
        const endChunk = endEl?.closest?.("[data-chunk-id]");
        if (!startChunk || !endChunk) {
          setDiffSelection(null);
          return;
        }
        const firstId = parseInt(startChunk.getAttribute("data-chunk-id"), 10);
        const lastId = parseInt(endChunk.getAttribute("data-chunk-id"), 10);
        if (Number.isNaN(firstId) || Number.isNaN(lastId)) {
          setDiffSelection(null);
          return;
        }
        if (firstId === lastId) {
          setDiffSelection(null);
          return;
        }
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setDiffSelection({
          firstId: Math.min(firstId, lastId),
          lastId: Math.max(firstId, lastId),
          anchorX: rect.left + rect.width / 2,
          anchorY: rect.top
        });
      } catch (e) {
        setDiffSelection(null);
      }
    };
    const _applyAndExport = async () => {
      if (!_chunks || _rejCount === 0 || applyingRemarkup) return;
      setApplyingRemarkup(true);
      try {
        const _prevHtml = pdfFixResult?.accessibleHtml || "";
        const _prevFinal = pdfFixResult?.finalText || "";
        let newHtml = null;
        let surgeryCoverage = 0;
        let surgeryFailReason = "";
        try {
          const surg = _applyTextSurgery(_prevHtml, _effectiveText);
          if (surg && surg.html) {
            newHtml = surg.html;
            surgeryCoverage = surg.coverage;
            if (surg.reason) surgeryFailReason = surg.reason;
            if (surgeryCoverage < 0.95) {
              warnLog("[Diff] Surgery coverage below threshold:", Math.round(surgeryCoverage * 100) + "%", "\u2014 falling back to Gemini");
              newHtml = null;
              surgeryFailReason = "coverage-low-" + Math.round(surgeryCoverage * 100);
            }
          }
        } catch (surgErr) {
          warnLog("[Diff] Text surgery threw, falling back to Gemini:", surgErr?.message || surgErr);
          surgeryFailReason = "surgery-error-" + (surgErr?.message || "unknown");
        }
        let usedFallback = false;
        if (!newHtml) {
          usedFallback = true;
          const prompt = `You are a WCAG 2.1 AA accessibility remediator. Below is the CURRENT accessible HTML for a document. The teacher has reviewed the text and approved a revised version (APPROVED_TEXT). Your job: produce a new HTML that has the same structure as CURRENT_HTML (same <img>, <table>, <figure>, <figcaption>, landmark tags, ids, alt text, class attributes, and overall DOM layout) but whose TEXT content matches APPROVED_TEXT. MANDATORY RULES:
1. PRESERVE every <img> tag with its src, alt, and other attributes UNCHANGED.
2. PRESERVE every <table>, <thead>, <tbody>, <tr>, <th>, <td> with attributes.
3. PRESERVE <figure>/<figcaption>, landmarks, ids, roles.
4. Do NOT add, remove, paraphrase, or reorder any words in APPROVED_TEXT beyond what's already there.
5. Return ONLY the updated HTML \u2014 no commentary, no code fences.

CURRENT_HTML:
${_prevHtml}

APPROVED_TEXT:
${_effectiveText}`;
          let remarkedHtml = null;
          try {
            const raw = await callGemini(prompt);
            remarkedHtml = (raw || "").replace(/^```(?:html)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
          } catch (gErr) {
            warnLog("[Diff] Gemini fallback remarkup failed:", gErr?.message || gErr);
          }
          if (remarkedHtml) {
            const _stripTags = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
            const newText = _stripTags(remarkedHtml);
            const approvedTokens = _effectiveText.split(/\s+/).filter((t2) => t2.length > 2);
            const newLower = newText.toLowerCase();
            let found = 0;
            for (const tok of approvedTokens) {
              if (newLower.includes(tok.toLowerCase())) found++;
            }
            const cov = approvedTokens.length > 0 ? found / approvedTokens.length : 1;
            if (cov >= 0.9) {
              newHtml = remarkedHtml;
            } else {
              warnLog("[Diff] Gemini fallback coverage too low:", Math.round(cov * 100) + "%");
            }
          }
        }
        if (newHtml) {
          setPdfFixResult((prev) => prev ? {
            ...prev,
            accessibleHtml: newHtml,
            finalText: _effectiveText,
            _userEditedAt: (/* @__PURE__ */ new Date()).toISOString(),
            _rejectedHunkCount: _rejCount,
            _preApplyHtml: _prevHtml,
            _preApplyFinalText: _prevFinal,
            _lastApplyPath: usedFallback ? "gemini" : "surgery",
            _applyVerificationFailed: null
          } : prev);
          setDiffChunks(null);
          const pathLabel = usedFallback ? "via Gemini fallback" : "via text surgery";
          addToast("Edits applied " + pathLabel + ". Accessible HTML updated.", "success");
        } else {
          warnLog("[Diff] Apply failed \u2014 both surgery and Gemini paths could not produce acceptable output. surgeryReason:", surgeryFailReason);
          setPdfFixResult((prev) => prev ? {
            ...prev,
            finalText: _effectiveText,
            _userEditedAt: (/* @__PURE__ */ new Date()).toISOString(),
            _rejectedHunkCount: _rejCount,
            _applyVerificationFailed: surgeryFailReason || "gemini-failed"
          } : prev);
          addToast("\u26A0 Apply kept original HTML \u2014 edits could not be committed cleanly (" + (surgeryFailReason || "both paths failed") + "). Your text edits are recorded; structure was preserved.", "warning");
        }
      } finally {
        setApplyingRemarkup(false);
      }
    };
    const _revertLastApply = () => {
      const prev = pdfFixResult;
      if (!prev || !prev._preApplyHtml) return;
      setPdfFixResult((p) => p ? {
        ...p,
        accessibleHtml: p._preApplyHtml,
        finalText: p._preApplyFinalText || p.finalText,
        _preApplyHtml: null,
        _preApplyFinalText: null,
        _userEditedAt: null,
        _rejectedHunkCount: null,
        _lastApplyPath: null,
        _applyVerificationFailed: null
      } : p);
      setDiffChunks(null);
      addToast("Reverted to the state before your last Apply.", "info");
    };
    const _canRevert = !!(pdfFixResult && pdfFixResult._preApplyHtml);
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "allo-diff-title",
        className: "fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4",
        onClick: (e) => {
          if (e.target === e.currentTarget) setDiffViewOpen(false);
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50" }, /* @__PURE__ */ React.createElement("span", { className: "text-lg" }, "\u{1F4DD}"), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("h2", { id: "allo-diff-title", className: "text-sm font-black text-slate-800 truncate" }, t("diff_view.title") || "Source PDF \u2194 Remediated HTML \xB7 Diff"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600" }, t("diff_view.subtitle") || "Click any colored span to reject the change. Drag-select across spans to batch-reject. Del\u2192Add paraphrase pairs toggle together.")), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setDiffViewOpen(false),
          className: "shrink-0 w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-600 flex items-center justify-center",
          "aria-label": t("diff_view.close_aria") || "Close diff view"
        },
        "\u2715"
      )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-white flex-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "inline-flex rounded-lg border border-slate-400 overflow-hidden text-[11px]" }, ["words", "sentences", "chars"].map((g) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: g,
          onClick: () => _onTryGranularityChange(g),
          className: `px-3 py-1 font-bold transition-colors ${diffGranularity === g ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`,
          "aria-pressed": diffGranularity === g
        },
        g.charAt(0).toUpperCase() + g.slice(1)
      ))), _chunks && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 ml-2 text-[11px]" }, /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "w-3 h-3 rounded-sm bg-emerald-200 border border-emerald-400" }), " ", /* @__PURE__ */ React.createElement("span", { className: "font-bold text-emerald-700" }, _ins.toLocaleString()), " added"), /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "w-3 h-3 rounded-sm bg-rose-200 border border-rose-400" }), " ", /* @__PURE__ */ React.createElement("span", { className: "font-bold text-rose-700" }, _del.toLocaleString()), " removed"), /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1 text-slate-600" }, /* @__PURE__ */ React.createElement("span", { className: "w-3 h-3 rounded-sm bg-slate-100 border border-slate-400" }), " ", /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, _same.toLocaleString()), " unchanged"), _rejCount > 0 && /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1 ml-1 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded font-bold text-amber-800" }, _rejCount.toLocaleString(), " rejected", /* @__PURE__ */ React.createElement("button", { onClick: _undoAllRejections, className: "ml-1 underline hover:no-underline text-amber-900", title: t("diff_view.undo_all_tooltip") || "Undo every rejection in this view" }, t("diff_view.undo_all_button") || "undo all"))), /* @__PURE__ */ React.createElement("div", { className: "ml-auto text-[11px] text-slate-500" }, /* @__PURE__ */ React.createElement("span", { className: "font-mono" }, _src.length.toLocaleString()), " \u2192 ", /* @__PURE__ */ React.createElement("span", { className: "font-mono" }, _fin.length.toLocaleString()), " chars")), /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "flex-1 overflow-auto p-4 bg-slate-50 relative",
          onScroll: diffSelection ? () => setDiffSelection(null) : void 0
        },
        !diffLibReady && diffLibLoading && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 text-sm text-slate-600" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin" }), " Loading diff engine (jsdiff)\u2026"),
        !diffLibReady && !diffLibLoading && /* @__PURE__ */ React.createElement("div", { className: "text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3" }, "Couldn't load the diff engine (network blocked?). Try re-opening the diff view, or check your connection."),
        diffLibReady && !_chunks && !diffLibLoading && /* @__PURE__ */ React.createElement("div", { className: "text-sm text-amber-800 bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-center gap-3" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-bold mb-1" }, t("diff_view.computing") || "Computing diff\u2026"), /* @__PURE__ */ React.createElement("div", { className: "text-[12px] text-amber-700 leading-relaxed" }, t("diff_view.computing_stale_hint") || "If this persists, the source text and remediated HTML may have drifted out of sync (or the diff cache is stale).")), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => {
              try {
                _lastDiffFingerprintRef.current = null;
              } catch (_) {
              }
              setDiffChunks(null);
              setDiffGranularity((g) => g);
            },
            className: "shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold text-[12px]",
            title: t("diff_view.rebuild_tooltip") || "Clear the diff cache and recompute chunks against the current source \u2194 remediated pair."
          },
          t("diff_view.rebuild_button") || "Rebuild diff"
        )),
        diffLibReady && _chunks && /* @__PURE__ */ React.createElement(
          "pre",
          {
            className: "whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-slate-800 bg-white rounded-lg p-4 border border-slate-400",
            onMouseUp: _onDiffMouseUp
          },
          _chunks.map((c) => {
            const baseCls = c.rejected ? "opacity-40 line-through" : "";
            if (c.type === "add") {
              return /* @__PURE__ */ React.createElement(
                "ins",
                {
                  key: c.id,
                  "data-chunk-id": c.id,
                  "data-pair-id": c.pairId || "",
                  onClick: () => toggleDiffChunk(c.id),
                  className: `bg-emerald-100 text-emerald-900 no-underline rounded px-0.5 cursor-pointer hover:ring-2 hover:ring-emerald-400 ${baseCls}`,
                  title: c.rejected ? "Rejected \u2014 click to keep" : "Added during remediation \u2014 click to reject"
                },
                c.value
              );
            }
            if (c.type === "del") {
              return /* @__PURE__ */ React.createElement(
                "del",
                {
                  key: c.id,
                  "data-chunk-id": c.id,
                  "data-pair-id": c.pairId || "",
                  onClick: () => toggleDiffChunk(c.id),
                  className: `bg-rose-100 text-rose-900 rounded px-0.5 cursor-pointer hover:ring-2 hover:ring-rose-400 ${baseCls}`,
                  title: c.rejected ? "Restored \u2014 click to keep removed" : "Removed from source \u2014 click to restore"
                },
                c.value
              );
            }
            return /* @__PURE__ */ React.createElement("span", { key: c.id, "data-chunk-id": c.id }, c.value);
          })
        ),
        diffLibReady && !_chunks && /* @__PURE__ */ React.createElement("div", { className: "text-sm text-slate-600" }, t("diff_view.computing") || "Computing diff\u2026"),
        diffSelection && /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "fixed z-[110] bg-slate-900 text-white rounded-lg shadow-2xl px-1 py-1 flex items-center gap-1 text-[11px]",
            style: { left: `${diffSelection.anchorX}px`, top: `${Math.max(8, diffSelection.anchorY - 44)}px`, transform: "translateX(-50%)" },
            onMouseDown: (e) => e.preventDefault()
          },
          /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => setRangeRejected(diffSelection.firstId, diffSelection.lastId, true),
              className: "px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 font-bold"
            },
            t("diff_view.reject_selection") || "Reject selection"
          ),
          /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => setRangeRejected(diffSelection.firstId, diffSelection.lastId, false),
              className: "px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 font-bold"
            },
            t("diff_view.keep_selection") || "Keep selection"
          ),
          /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => setDiffSelection(null),
              className: "px-1.5 py-1 rounded hover:bg-slate-700",
              "aria-label": t("diff_view.dismiss_toolbar_aria") || "Dismiss toolbar"
            },
            "\u2715"
          )
        )
      ), /* @__PURE__ */ React.createElement("div", { className: "px-4 py-2 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-600 flex items-center gap-3 flex-wrap" }, /* @__PURE__ */ React.createElement("span", null, "\u{1F4DA} jsdiff@5.2.0"), /* @__PURE__ */ React.createElement("span", { className: "text-slate-600" }, "\xB7"), /* @__PURE__ */ React.createElement("span", null, t("diff_view.footer_help") || "Click spans or drag-select to edit. Pairs toggle together."), _canRevert && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: _revertLastApply,
          disabled: applyingRemarkup,
          className: "ml-auto px-3 py-1.5 bg-white border border-slate-400 hover:bg-slate-100 disabled:opacity-60 text-slate-700 rounded-md font-bold inline-flex items-center gap-1.5",
          title: t("diff_view.revert_tooltip") || "Restore the accessible HTML to the state before your last Apply & Export"
        },
        "\u21B6 Revert last Apply"
      ), _rejCount > 0 && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: _applyAndExport,
          disabled: applyingRemarkup,
          className: (_canRevert ? "" : "ml-auto ") + "px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-md font-bold inline-flex items-center gap-1.5 shadow",
          title: t("diff_view.apply_export_tooltip") || "Apply rejections via text surgery (preserves all markup, instant, no Gemini call). Falls back to Gemini round-trip only if surgery can't map some chunks."
        },
        applyingRemarkup ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 12, className: "animate-spin" }), " Applying\u2026") : /* @__PURE__ */ React.createElement(React.Fragment, null, "\u2713 Apply & Export (", _rejCount, ")")
      )))
    );
  })(), document.body);
}
function GroupSessionModal(props) {
  const {
    activeSessionCode,
    addToast,
    appId,
    db,
    doc,
    dragOverResourceId,
    draggedResourceId,
    handleAssignStudent,
    handleCreateGroup,
    handleDeleteGroup,
    handleSetGroupResource,
    handleSetShowGroupModalToFalse,
    isPushingResource,
    newGroupName,
    sessionData,
    setDragOverResourceId,
    setDraggedResourceId,
    setNewGroupName,
    showGroupModal,
    t: t2,
    updateDoc,
    warnLog
  } = props;
  if (!(showGroupModal && activeSessionCode && sessionData)) return null;
  const handleDragStart = (e, resId) => {
    setDraggedResourceId(resId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", resId);
  };
  const handleDragOver = (e, resId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (resId !== draggedResourceId) {
      setDragOverResourceId(resId);
    }
  };
  const handleDragLeave = () => {
    setDragOverResourceId(null);
  };
  const handleDrop = async (e, targetResId) => {
    e.preventDefault();
    if (!draggedResourceId || draggedResourceId === targetResId) {
      setDraggedResourceId(null);
      setDragOverResourceId(null);
      return;
    }
    const resources = [...sessionData.resources];
    const draggedIndex = resources.findIndex((r) => r.id === draggedResourceId);
    const targetIndex = resources.findIndex((r) => r.id === targetResId);
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [draggedItem] = resources.splice(draggedIndex, 1);
      resources.splice(targetIndex, 0, draggedItem);
      try {
        const sessionRef = doc(db, "artifacts", appId, "public", "data", "sessions", activeSessionCode);
        await updateDoc(sessionRef, { resources });
        addToast(t2("groups.resources_reordered") || "Resources reordered", "success");
      } catch (err) {
        warnLog("Failed to reorder resources:", err);
      }
    }
    setDraggedResourceId(null);
    setDragOverResourceId(null);
  };
  const handleDragEnd = () => {
    setDraggedResourceId(null);
    setDragOverResourceId(null);
  };
  const getResourceDescription = (r) => {
    if (r.meta) return r.meta;
    try {
      if (r.type === "glossary" && Array.isArray(r.data)) {
        return `${r.data.length} terms`;
      }
      if (r.type === "simplified" && typeof r.data === "string") return `~${r.data.split(" ").length} words`;
      if ((r.type === "quiz" || r.type === "check-for-understanding") && Array.isArray(r.data?.questions || r.data)) return `${(r.data?.questions || r.data).length} questions`;
      if (r.type === "faq" && Array.isArray(r.data)) return `${r.data.length} Q&A`;
      if (r.type === "outline" && Array.isArray(r.data)) return `${r.data.length} sections`;
      if (r.type === "timeline" && Array.isArray(r.data)) return `${r.data.length} events`;
      if (r.type === "persona" && Array.isArray(r.data)) return `${r.data.length} personas`;
      if (r.type === "mind-map" && r.data?.nodes) return `${r.data.nodes.length} nodes`;
      if (r.type === "brainstorm" && Array.isArray(r.data)) return `${r.data.length} ideas`;
      if (r.type === "adventure" && r.data?.scenes) return `${Object.keys(r.data.scenes).length} scenes`;
    } catch (e) {
      warnLog("Caught error:", e?.message || e);
    }
    return "";
  };
  const getResourceLanguage = (r) => {
    if (r.language) return r.language;
    if (r.lang) return r.lang;
    if (r.type === "glossary" && Array.isArray(r.data) && r.data[0]?.translations) {
      const langs = Object.keys(r.data[0].translations);
      return langs.length > 0 ? langs : null;
    }
    return null;
  };
  const formatResourceDate = (r) => {
    if (r.createdAt) {
      const d = new Date(r.createdAt);
      return d.toLocaleDateString(void 0, { month: "short", day: "numeric" });
    }
    if (r.timestamp) {
      const d = new Date(r.timestamp);
      return d.toLocaleDateString(void 0, { month: "short", day: "numeric" });
    }
    return null;
  };
  const typeIcons = {
    quiz: "\u{1F4DD}",
    "mind-map": "\u{1F9E0}",
    glossary: "\u{1F4D6}",
    image: "\u{1F5BC}\uFE0F",
    simplify: "\u2728",
    outline: "\u{1F4CB}",
    faq: "\u2753",
    "sentence-frames": "\u{1F4AC}",
    brainstorm: "\u{1F4A1}",
    persona: "\u{1F3AD}",
    timeline: "\u{1F4C5}",
    "concept-sort": "\u{1F5C2}\uFE0F",
    "lesson-plan": "\u{1F4DA}",
    adventure: "\u{1F3AE}",
    simplified: "\u2728",
    default: "\u{1F4C4}"
  };
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/90 z-[160] flex items-center justify-center p-4 animate-in fade-in duration-200", onClick: handleSetShowGroupModalToFalse, "data-help-key": "group_modal_container" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl shadow-2xl w-[95vw] h-[90vh] relative animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden", onClick: (e) => e.stopPropagation(), role: "dialog", "aria-modal": "true", "aria-label": t2("groups.modal_title") }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-indigo-50 flex-shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-purple-600 p-3 rounded-xl shadow-md" }, /* @__PURE__ */ React.createElement(Users, { size: 28, className: "text-white" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-black text-slate-800" }, t2("groups.modal_title")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-600" }, t2("groups.modal_subtitle")))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t2("common.groups_new_group_placeholder"),
      type: "text",
      value: newGroupName,
      onChange: (e) => setNewGroupName(e.target.value),
      placeholder: t2("groups.new_group_placeholder"),
      className: "text-sm p-3 rounded-lg border border-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none w-48",
      "data-help-key": "group_create_input"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t2("common.add"),
      onClick: () => handleCreateGroup(),
      disabled: !newGroupName.trim(),
      className: "bg-purple-600 text-white px-5 py-3 rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2",
      "data-help-key": "group_create_button"
    },
    /* @__PURE__ */ React.createElement(Plus, { size: 18 }),
    " ",
    t2("groups.add_button")
  )), /* @__PURE__ */ React.createElement("button", { onClick: handleSetShowGroupModalToFalse, className: "p-2 rounded-full text-slate-600 hover:text-slate-600 hover:bg-white/80 transition-colors", "aria-label": t2("common.close") }, /* @__PURE__ */ React.createElement(X, { size: 24 }))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 p-5 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "lg:col-span-2 flex flex-col min-h-0", "data-help-key": "group_resource_library" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-3" }, /* @__PURE__ */ React.createElement(FileText, { size: 16, className: "text-indigo-600" }), /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-bold text-indigo-600 uppercase tracking-wider" }, t2("groups.resource_library")), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-600 ml-2" }, "(", sessionData.resources?.length || 0, " items)"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-purple-700 ml-auto italic flex items-center gap-1" }, /* @__PURE__ */ React.createElement(GripVertical, { size: 12 }), " ", t2("groups.drag_to_reorder") || "Drag to reorder")), /* @__PURE__ */ React.createElement("div", { className: "flex-1 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 rounded-xl p-4 border border-indigo-100 overflow-y-auto custom-scrollbar" }, sessionData.resources && sessionData.resources.length > 0 ? /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3", style: { gridAutoRows: "min-content" } }, sessionData.resources.map((res, index) => {
    const assignedGroup = sessionData.groups && Object.entries(sessionData.groups).find(([_, g]) => g && g.resourceId === res.id);
    const icon = typeIcons[res.type] || typeIcons.default;
    const description = getResourceDescription(res);
    const isDragging = draggedResourceId === res.id;
    const isDragOver = dragOverResourceId === res.id;
    const language = getResourceLanguage(res);
    const dateStr = formatResourceDate(res);
    const activeSessionGroups2 = Object.entries(sessionData?.groups || {}).filter(([_, g]) => g !== null);
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: res.id,
        draggable: true,
        onDragStart: (e) => handleDragStart(e, res.id),
        onDragOver: (e) => handleDragOver(e, res.id),
        onDragLeave: handleDragLeave,
        onDrop: (e) => handleDrop(e, res.id),
        onDragEnd: handleDragEnd,
        className: `
                                                    relative bg-white rounded-xl p-3 border-2 shadow-sm transition-all duration-150 cursor-grab active:cursor-grabbing
                                                    ${assignedGroup ? "border-green-300 bg-green-50/50" : "border-slate-200 hover:border-purple-300"}
                                                    ${isDragging ? "opacity-40 scale-95 shadow-lg" : ""}
                                                    ${isDragOver ? "border-purple-500 bg-purple-50 scale-105 shadow-lg" : ""}
                                                `,
        title: res.title || "Untitled"
      },
      /* @__PURE__ */ React.createElement("div", { className: "absolute top-1 right-1 text-slate-600 hover:text-slate-600" }, /* @__PURE__ */ React.createElement(GripVertical, { size: 14 })),
      /* @__PURE__ */ React.createElement("div", { className: "absolute -top-2 -left-2 bg-slate-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow" }, index + 1),
      /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2 mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, icon), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm font-semibold text-slate-700 truncate" }, res.title || "Untitled"), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600 capitalize" }, res.type?.replace("-", " ")))),
      description && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-purple-500 bg-purple-50 px-2 py-1 rounded-md mb-1", style: { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } }, description),
      (language || dateStr) && /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1 mb-1" }, language && (Array.isArray(language) ? language.slice(0, 5).map((lang, li) => /* @__PURE__ */ React.createElement("span", { key: li, className: "inline-flex items-center gap-0.5 text-[11px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium" }, /* @__PURE__ */ React.createElement(Globe, { size: 8 }), " ", lang)) : /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-0.5 text-[11px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium" }, /* @__PURE__ */ React.createElement(Globe, { size: 8 }), " ", language)), dateStr && /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-0.5 text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded" }, /* @__PURE__ */ React.createElement(Clock, { size: 8 }), " ", dateStr)),
      assignedGroup && /* @__PURE__ */ React.createElement("div", { className: "mt-1 text-[11px] font-bold text-green-800 bg-green-100 px-2 py-1 rounded-md flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Users, { size: 10 }), " ", assignedGroup[1].name)
    );
  })) : /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center h-full text-slate-600 italic" }, t2("groups.no_resources") || "No resources in this session"))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-5 min-h-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex flex-col min-h-0" }, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Layers, { size: 14 }), " ", t2("groups.active_groups")), /* @__PURE__ */ React.createElement("div", { className: "flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-1", "data-help-key": "group_active_list" }, sessionData.groups && activeSessionGroups.map(([gid, group]) => /* @__PURE__ */ React.createElement("div", { key: gid, className: "bg-white p-4 rounded-xl border border-slate-400 shadow-sm hover:shadow-md transition-shadow" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-3" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-slate-700" }, group.name), /* @__PURE__ */ React.createElement("button", { onClick: () => handleDeleteGroup(gid), className: "text-red-600 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors", "aria-label": t2("common.delete") }, /* @__PURE__ */ React.createElement(X, { size: 16 }))), /* @__PURE__ */ React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1 block flex items-center gap-2" }, t2("groups.assign_resource_label"), isPushingResource[gid] === "pushing" && /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1 text-[10px] text-purple-600 font-bold normal-case" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 11, className: "animate-spin" }), " ", t2("groups.pushing") || "Pushing\u2026"), isPushingResource[gid] === "success" && /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1 text-[10px] text-emerald-600 font-bold normal-case" }, /* @__PURE__ */ React.createElement(CheckCircle2, { size: 11 }), " ", t2("groups.pushed") || "Sent")), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t2("common.selection"),
      value: group.resourceId || "",
      onChange: (e) => handleSetGroupResource(gid, e.target.value || null),
      disabled: isPushingResource[gid] === "pushing",
      className: "w-full text-sm p-2 rounded-lg border border-slate-400 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-purple-300 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, t2("groups.assign_resource_placeholder")),
    sessionData.resources && sessionData.resources.map((res) => {
      const icon = typeIcons[res.type] || typeIcons.default;
      const desc = getResourceDescription(res);
      return /* @__PURE__ */ React.createElement("option", { key: res.id, value: res.id }, icon, " ", res.title || "Untitled", desc ? ` (${desc})` : "");
    })
  ))), (!sessionData.groups || Object.values(sessionData.groups).filter((g) => g !== null).length === 0) && /* @__PURE__ */ React.createElement("div", { className: "text-sm text-slate-600 italic text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200" }, t2("groups.no_groups")))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex flex-col min-h-0" }, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(UserCheck, { size: 14 }), " ", t2("groups.roster_assignment")), /* @__PURE__ */ React.createElement("div", { className: "flex-1 bg-slate-50 rounded-xl p-3 overflow-y-auto custom-scrollbar", "data-help-key": "group_roster_list" }, sessionData.roster && Object.entries(sessionData.roster).length > 0 ? /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, Object.entries(sessionData.roster).map(([uid, student]) => /* @__PURE__ */ React.createElement("div", { key: uid, className: "flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-100" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: `w-2.5 h-2.5 rounded-full flex-shrink-0 ${student.connected ? "bg-green-500 animate-pulse" : "bg-slate-300"}` }), /* @__PURE__ */ React.createElement("span", { className: "truncate font-medium text-slate-700 text-sm", title: student.name }, student.name)), /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t2("common.selection"),
      value: student.groupId || "",
      onChange: (e) => handleAssignStudent(uid, e.target.value),
      className: "text-xs p-2 rounded-lg border border-slate-400 bg-white focus:ring-2 focus:ring-purple-300 outline-none min-w-[100px]"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, t2("groups.unassigned")),
    sessionData.groups && activeSessionGroups.map(([gid, group]) => /* @__PURE__ */ React.createElement("option", { key: gid, value: gid }, group.name))
  )))) : /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center h-full text-sm text-slate-600 italic" }, t2("session.waiting_for_students")))))), /* @__PURE__ */ React.createElement("div", { className: "p-4 border-t border-slate-200 bg-slate-50 flex justify-end flex-shrink-0" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t2("common.confirm"),
      onClick: handleSetShowGroupModalToFalse,
      className: "px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-full transition-colors shadow-md flex items-center gap-2"
    },
    /* @__PURE__ */ React.createElement(Check, { size: 18 }),
    " ",
    t2("groups.done_button")
  ))));
}
function FluencyModePanel(props) {
  const {
    ConfettiExplosion,
    FLUENCY_BENCHMARKS,
    calculateRunningRecordMetrics,
    exportFluencyCSV,
    fluencyBenchmarkGrade,
    fluencyBenchmarkSeason,
    fluencyCustomNorms,
    fluencyFeedback,
    fluencyModalRef,
    fluencyResult,
    fluencyStatus,
    fluencyTimeLimit,
    fluencyTimeRemaining,
    fluencyTimerVisibility,
    fluencyTranscript,
    generateFluencyScoreSheet,
    generatedContent,
    getBenchmarkComparison,
    isFluencyMode,
    setFluencyBenchmarkGrade,
    setFluencyBenchmarkSeason,
    setFluencyCustomNorms,
    setFluencyFeedback,
    setFluencyResult,
    setFluencyStatus,
    setFluencyTimeLimit,
    setFluencyTimeRemaining,
    setFluencyTimerVisibility,
    setFluencyTranscript,
    setIsFluencyMode,
    showFluencyConfetti,
    t: t2,
    toggleFluencyRecording
  } = props;
  if (!(isFluencyMode && generatedContent)) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300" }, showFluencyConfetti && /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 pointer-events-none z-[250] flex items-center justify-center" }, /* @__PURE__ */ React.createElement(ConfettiExplosion, null)), /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: fluencyModalRef,
      role: "dialog",
      "aria-modal": "true",
      "aria-label": t2("fluency.tool_label"),
      className: "bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative border-4 border-rose-200 overflow-hidden flex flex-col h-[80vh]",
      "data-help-key": "fluency_mode_panel"
    },
    /* @__PURE__ */ React.createElement("div", { className: "bg-rose-50 p-4 border-b border-rose-100 flex justify-between items-center shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center border border-rose-200 shadow-sm" }, /* @__PURE__ */ React.createElement(Mic, { size: 20, className: "text-rose-700" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-black text-lg text-slate-800 leading-tight" }, t2("fluency.title")), /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold text-slate-600 uppercase tracking-wider" }, t2("fluency.instruction")))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4" }, fluencyStatus === "idle" && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-bold text-slate-600" }, t2("fluency.time_limit")), /* @__PURE__ */ React.createElement(
      "select",
      {
        "aria-label": t2("common.selection"),
        value: fluencyTimeLimit,
        onChange: (e) => {
          setFluencyTimeLimit(parseInt(e.target.value));
          setFluencyTimeRemaining(parseInt(e.target.value));
        },
        className: "text-xs font-bold border border-slate-400 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-300",
        "data-help-key": "fluency_mode_time_limit"
      },
      /* @__PURE__ */ React.createElement("option", { value: 0 }, t2("fluency.time_limit_none")),
      /* @__PURE__ */ React.createElement("option", { value: 30 }, "30 sec"),
      /* @__PURE__ */ React.createElement("option", { value: 60 }, "60 sec"),
      /* @__PURE__ */ React.createElement("option", { value: 90 }, "90 sec"),
      /* @__PURE__ */ React.createElement("option", { value: 120 }, "120 sec")
    ), fluencyTimeLimit > 0 && /* @__PURE__ */ React.createElement(
      "select",
      {
        "aria-label": t2("common.timer_display"),
        value: fluencyTimerVisibility,
        onChange: (e) => setFluencyTimerVisibility(e.target.value),
        className: "text-xs font-bold border border-slate-400 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-300 ml-1"
      },
      /* @__PURE__ */ React.createElement("option", { value: "visible" }, t2("math.timer_visible")),
      /* @__PURE__ */ React.createElement("option", { value: "hidden" }, t2("math.timer_hidden"))
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setIsFluencyMode(false);
          setFluencyStatus("idle");
          setFluencyTimeRemaining(fluencyTimeLimit);
        },
        className: "p-1.5 rounded-full text-slate-600 hover:text-slate-600 hover:bg-slate-100 transition-colors",
        "aria-label": t2("fluency.close_label")
      },
      /* @__PURE__ */ React.createElement(X, { size: 24 })
    ))),
    /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar flex flex-col items-center" }, fluencyStatus === "complete" && fluencyResult ? /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-2xl animate-in zoom-in duration-300" }, (() => {
      const rrMetrics = calculateRunningRecordMetrics(fluencyResult.wordData, fluencyResult.insertions);
      const benchmarkResult = getBenchmarkComparison(fluencyResult.wcpm, fluencyBenchmarkGrade, fluencyBenchmarkSeason, fluencyCustomNorms);
      const levelColors = { above: "text-green-600 bg-green-50 border-green-200", at: "text-emerald-600 bg-emerald-50 border-emerald-200", approaching: "text-yellow-600 bg-yellow-50 border-yellow-200", well_below: "text-red-600 bg-red-50 border-red-200", unknown: "text-slate-600 bg-slate-50 border-slate-200" };
      const levelLabels = { above: t2("fluency.benchmark_above"), at: t2("fluency.benchmark_at"), approaching: t2("fluency.benchmark_approaching"), well_below: t2("fluency.benchmark_below"), unknown: "\u2014" };
      const readingLevelColors = { independent: "bg-green-100 text-green-700 border-green-300", instructional: "bg-yellow-100 text-yellow-700 border-yellow-300", frustrational: "bg-red-100 text-red-700 border-red-300" };
      const readingLevelLabels = { independent: t2("fluency.independent"), instructional: t2("fluency.instructional"), frustrational: t2("fluency.frustrational") };
      return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex justify-center mb-4 gap-4 flex-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white p-6 rounded-2xl shadow-lg border border-slate-400 text-center relative overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-slate-600 uppercase tracking-widest mb-2" }, t2("fluency.accuracy_score")), /* @__PURE__ */ React.createElement("div", { className: `text-6xl font-black ${fluencyResult.accuracy >= 90 ? "text-green-500" : fluencyResult.accuracy >= 70 ? "text-yellow-500" : "text-red-500"}` }, fluencyResult.accuracy, "%"), /* @__PURE__ */ React.createElement("div", { className: `mt-2 text-xs font-bold px-3 py-1 rounded-full border inline-block ${readingLevelColors[rrMetrics.readingLevel]}` }, readingLevelLabels[rrMetrics.readingLevel])), /* @__PURE__ */ React.createElement("div", { className: "bg-white p-6 rounded-2xl shadow-lg border border-slate-400 text-center relative overflow-hidden animate-in zoom-in duration-300 delay-100" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-slate-600 uppercase tracking-widest mb-2" }, t2("fluency.rate_label")), /* @__PURE__ */ React.createElement("div", { className: "text-6xl font-black text-indigo-600" }, fluencyResult.wcpm), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600 font-bold uppercase tracking-wider mt-1" }, t2("fluency.wcpm_label")), /* @__PURE__ */ React.createElement("div", { className: `mt-2 text-xs font-bold px-3 py-1 rounded-full border inline-block ${levelColors[benchmarkResult.level]}` }, levelLabels[benchmarkResult.level]))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-center gap-3 mb-4 items-center" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-bold text-slate-600 uppercase" }, t2("fluency.benchmark_title")), /* @__PURE__ */ React.createElement("select", { "aria-label": t2("common.grade"), value: fluencyBenchmarkGrade, onChange: (e) => setFluencyBenchmarkGrade(e.target.value), className: "text-xs font-bold border border-slate-400 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" }, Object.keys(FLUENCY_BENCHMARKS).map((g) => /* @__PURE__ */ React.createElement("option", { key: g, value: g }, t2("fluency.grade_select"), " ", g)), /* @__PURE__ */ React.createElement("option", { value: "custom" }, t2("fluency.custom_norms") || "Custom (Manual)")), /* @__PURE__ */ React.createElement("select", { "aria-label": t2("common.season"), value: fluencyBenchmarkSeason, onChange: (e) => setFluencyBenchmarkSeason(e.target.value), className: "text-xs font-bold border border-slate-400 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" }, /* @__PURE__ */ React.createElement("option", { value: "fall" }, t2("fluency.season_fall")), /* @__PURE__ */ React.createElement("option", { value: "winter" }, t2("fluency.season_winter")), /* @__PURE__ */ React.createElement("option", { value: "spring" }, t2("fluency.season_spring"))), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-600" }, t2("fluency.benchmark_target"), ": ", benchmarkResult.target, " WCPM")), fluencyBenchmarkGrade === "custom" && /* @__PURE__ */ React.createElement("div", { className: "flex justify-center gap-3 mb-4 items-center animate-in slide-in-from-top duration-200" }, /* @__PURE__ */ React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, t2("fluency.custom_wcpm") || "Target WCPM", ":"), ["fall", "winter", "spring"].map((s) => /* @__PURE__ */ React.createElement("div", { key: s, className: "flex flex-col items-center gap-0.5" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          min: "0",
          max: "300",
          value: fluencyCustomNorms[s] || "",
          onChange: (e) => setFluencyCustomNorms((prev) => ({ ...prev, [s]: parseInt(e.target.value) || 0 })),
          className: "w-16 text-center text-xs font-bold border border-slate-400 rounded-lg px-1 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300",
          placeholder: "0",
          "aria-label": `${s} target WCPM`
        }
      ), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600 font-bold uppercase" }, t2(`fluency.season_${s}`) || s)))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-red-50 border border-red-200 rounded-xl p-3 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-black text-red-600" }, rrMetrics.substitutions), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase" }, t2("fluency.substitutions"))), /* @__PURE__ */ React.createElement("div", { className: "bg-orange-50 border border-orange-200 rounded-xl p-3 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-black text-orange-600" }, rrMetrics.omissions), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase" }, t2("fluency.omissions"))), /* @__PURE__ */ React.createElement("div", { className: "bg-purple-50 border border-purple-200 rounded-xl p-3 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-black text-purple-600" }, rrMetrics.insertions), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase" }, t2("fluency.insertions_label"))), /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 border border-blue-200 rounded-xl p-3 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-black text-blue-600" }, rrMetrics.selfCorrections), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase" }, t2("fluency.self_corrections")))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-center gap-6 mb-6 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("span", { className: "block text-lg font-black text-slate-700" }, "1:", rrMetrics.errorRate), /* @__PURE__ */ React.createElement("span", { className: "text-slate-600 font-bold uppercase" }, t2("fluency.error_rate"))), /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("span", { className: "block text-lg font-black text-slate-700" }, rrMetrics.scRate, "%"), /* @__PURE__ */ React.createElement("span", { className: "text-slate-600 font-bold uppercase" }, t2("fluency.sc_rate"))), /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("span", { className: "block text-lg font-black text-slate-700" }, rrMetrics.totalErrors), /* @__PURE__ */ React.createElement("span", { className: "text-slate-600 font-bold uppercase" }, t2("fluency.errors_label")))), fluencyResult.prosody && /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-3 mb-4 animate-in fade-in duration-300" }, [
        { key: "pacing", label: t2("fluency.prosody_pacing") || "Pacing", color: "indigo" },
        { key: "expression", label: t2("fluency.prosody_expression") || "Expression", color: "violet" },
        { key: "phrasing", label: t2("fluency.prosody_phrasing") || "Phrasing", color: "fuchsia" }
      ].map(({ key, label, color }) => {
        const val = fluencyResult.prosody[key] || 0;
        const pct = val / 5 * 100;
        return /* @__PURE__ */ React.createElement("div", { key, className: `bg-${color}-50 border border-${color}-200 rounded-xl p-3 text-center` }, /* @__PURE__ */ React.createElement("div", { className: `text-2xl font-black text-${color}-600` }, val, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold text-slate-600" }, "/5")), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, label), /* @__PURE__ */ React.createElement("div", { className: "w-full bg-slate-200 rounded-full h-1.5 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: `h-full bg-${color}-500 rounded-full transition-all duration-500`, style: { width: `${pct}%` } })));
      }), Boolean(fluencyResult.prosody.note) && /* @__PURE__ */ React.createElement("div", { className: "col-span-3 text-xs text-slate-600 italic text-center mt-1" }, fluencyResult.prosody.note)), fluencyResult.confidence && /* @__PURE__ */ React.createElement("div", { className: `rounded-xl p-4 mb-4 border ${fluencyResult.confidence.overall >= 7 ? "bg-green-50 border-green-200" : fluencyResult.confidence.overall >= 4 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-2" }, /* @__PURE__ */ React.createElement("div", { className: `text-2xl font-black ${fluencyResult.confidence.overall >= 7 ? "text-green-600" : fluencyResult.confidence.overall >= 4 ? "text-amber-600" : "text-red-600"}` }, fluencyResult.confidence.overall, /* @__PURE__ */ React.createElement("span", { className: "text-sm opacity-60" }, "/10")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-slate-700" }, t2("fluency.ai_confidence_title") || "AI Confidence in This Analysis"), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600" }, fluencyResult.confidence.overall >= 7 ? "High confidence" : fluencyResult.confidence.overall >= 4 ? "Moderate confidence \u2014 some results may be inaccurate" : "Low confidence \u2014 human verification recommended"))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 text-[11px] mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-600" }, "\u{1F399}\uFE0F Audio: ", fluencyResult.confidence.audioQuality, "/10"), /* @__PURE__ */ React.createElement("span", { className: "text-slate-600" }, "\u{1F5E3}\uFE0F Clarity: ", fluencyResult.confidence.speakerClarity, "/10"), fluencyResult.confidence.accentDetected && /* @__PURE__ */ React.createElement("span", { className: "bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold" }, t2("fluency.accent_detected_badge") || "Accent detected \u2014 scored conservatively"), fluencyResult.confidence.youngVoiceDetected && /* @__PURE__ */ React.createElement("span", { className: "bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold" }, t2("fluency.young_voice_badge") || "Young voice detected"), fluencyResult.confidence.dialectalPatternsDetected && /* @__PURE__ */ React.createElement("span", { className: "bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold" }, t2("fluency.dialectal_patterns_badge") || "Dialectal patterns respected")), fluencyResult.confidence.lowConfidenceWordCount > 0 && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-amber-700 font-medium" }, "\u26A0 ", fluencyResult.confidence.lowConfidenceWordCount, " word(s) marked with low confidence \u2014 look for \u26A0 in the word display below"), fluencyResult.confidence.note && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600 mt-1 italic" }, fluencyResult.confidence.note), fluencyResult.confidence.limitationsApplied && fluencyResult.confidence.limitationsApplied !== "none" && fluencyResult.confidence.limitationsApplied !== "none detected" && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600 mt-1" }, "Research basis: ", fluencyResult.confidence.limitationsApplied)));
    })(), fluencyFeedback && /* @__PURE__ */ React.createElement("div", { className: "mb-6 animate-in slide-in-from-bottom-2 fade-in" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2 text-left bg-indigo-50 p-3 rounded-lg border border-indigo-100" }, /* @__PURE__ */ React.createElement("div", { className: "bg-indigo-100 p-1.5 rounded-full text-indigo-600 mt-0.5 shrink-0" }, /* @__PURE__ */ React.createElement(Sparkles, { size: 14 })), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-indigo-900 leading-relaxed font-medium" }, fluencyFeedback))), /* @__PURE__ */ React.createElement("div", { className: "text-xl md:text-2xl font-serif leading-loose text-center flex flex-wrap justify-center gap-1.5", "data-help-key": "fluency_mode_word_analysis" }, fluencyResult.wordData.map((w, i) => /* @__PURE__ */ React.createElement(
      "span",
      {
        key: i,
        title: w.said ? `${t2("fluency.said_label")}: "${w.said}"${w.lowConfidence ? " (\u26A0 low confidence)" : ""}` : w.lowConfidence ? "\u26A0 AI is uncertain about this word" : "",
        className: `px-1 rounded relative group cursor-default ${w.lowConfidence ? "ring-1 ring-amber-400 ring-offset-1 " : ""}${w.status === "correct" ? "text-green-600 font-medium" : w.status === "missed" ? "bg-red-700 text-white" : w.status === "stumbled" ? "bg-yellow-100 text-yellow-700" : w.status === "self_corrected" ? "bg-blue-100 text-blue-700 border-b-2 border-blue-400" : w.status === "mispronounced" ? "bg-red-100 text-red-700 border-b-2 border-red-400" : "text-slate-600"}`
      },
      w.word,
      w.said && /* @__PURE__ */ React.createElement("span", { className: "absolute -top-5 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[11px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none z-10" }, w.said)
    ))), /* @__PURE__ */ React.createElement("div", { className: "mt-8 pt-6 border-t border-slate-100 w-full" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 font-bold uppercase tracking-widest text-center mb-3" }, t2("fluency.analysis_key")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap justify-center gap-3 sm:gap-5 text-xs font-medium text-slate-600" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("span", { className: "px-2 py-0.5 rounded text-green-600 font-medium bg-green-50/50" }, t2("fluency.legend_word")), /* @__PURE__ */ React.createElement("span", null, t2("fluency.legend_correct"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("span", { className: "px-2 py-0.5 rounded bg-yellow-100 text-yellow-700" }, t2("fluency.legend_word")), /* @__PURE__ */ React.createElement("span", null, t2("fluency.legend_hesitation"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("span", { className: "px-2 py-0.5 rounded bg-blue-100 text-blue-700 border-b-2 border-blue-400" }, t2("fluency.legend_word")), /* @__PURE__ */ React.createElement("span", null, t2("fluency.legend_self_corrected"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("span", { className: "px-2 py-0.5 rounded bg-red-100 text-red-700 border-b-2 border-red-400" }, t2("fluency.legend_word")), /* @__PURE__ */ React.createElement("span", null, t2("fluency.legend_mispronounced"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("span", { className: "px-2 py-0.5 rounded bg-red-700 text-white" }, t2("fluency.legend_word")), /* @__PURE__ */ React.createElement("span", null, t2("fluency.legend_missed"))))), /* @__PURE__ */ React.createElement("div", { className: "mt-6 pt-4 border-t border-slate-100 flex justify-center gap-3 flex-wrap" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => generateFluencyScoreSheet(fluencyResult, typeof generatedContent?.data === "string" ? generatedContent.data : ""),
        className: "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors",
        "aria-label": t2("common.print_score_sheet"),
        "data-help-key": "fluency_mode_print_score_sheet_btn"
      },
      /* @__PURE__ */ React.createElement(FileText, { size: 15 }),
      " Print Score Sheet"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: exportFluencyCSV,
        className: "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors",
        "aria-label": t2("common.export_fluency_csv"),
        "data-help-key": "fluency_mode_export_csv_btn"
      },
      /* @__PURE__ */ React.createElement(Download, { size: 15 }),
      " Export Fluency CSV"
    ))) : /* @__PURE__ */ React.createElement("div", { className: "max-w-2xl" }, fluencyTranscript && /* @__PURE__ */ React.createElement("div", { className: "mb-8 p-4 bg-white rounded-xl border border-slate-400 shadow-sm text-sm text-slate-600 italic" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold uppercase text-xs text-rose-700 block mb-1" }, t2("fluency.hearing_label")), '"', fluencyTranscript, '"'), /* @__PURE__ */ React.createElement("div", { className: "text-xl md:text-3xl font-serif text-slate-800 leading-loose text-center", "data-help-key": "fluency_mode_passage_display" }, typeof generatedContent?.data === "string" ? generatedContent?.data.split("--- ENGLISH TRANSLATION ---")[0].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\[\d+\]/g, "").replace(/[⁽][⁰¹²³⁴⁵⁶⁷⁸⁹]+[⁾]/g, "").replace(/https?:\/\/[^\s]+/g, "").replace(/^#{1,6}\s/gm, "").replace(/\*{1,3}/g, "").trim() : /* @__PURE__ */ React.createElement("span", { className: "text-slate-600 italic text-base" }, t2("fluency.format_error"))))),
    /* @__PURE__ */ React.createElement("div", { className: "p-6 bg-white border-t border-slate-100 flex flex-col items-center justify-center shrink-0 gap-4" }, fluencyStatus === "listening" && fluencyTimeLimit > 0 && fluencyTimerVisibility === "visible" && /* @__PURE__ */ React.createElement("div", { className: `text-4xl font-black tabular-nums transition-colors ${fluencyTimeRemaining <= 10 ? "text-red-500 animate-pulse" : fluencyTimeRemaining <= 30 ? "text-yellow-500" : "text-indigo-600"}` }, Math.floor(fluencyTimeRemaining / 60), ":", (fluencyTimeRemaining % 60).toString().padStart(2, "0")), /* @__PURE__ */ React.createElement("div", { className: `text-sm font-bold uppercase tracking-widest transition-colors ${fluencyStatus === "listening" ? "text-red-500" : fluencyStatus === "processing" ? "text-indigo-500 animate-pulse" : "text-slate-600"}` }, fluencyStatus === "listening" ? t2("fluency.listening") : fluencyStatus === "processing" ? t2("fluency.processing") : fluencyStatus === "complete" ? t2("fluency.complete") : t2("fluency.prompt")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-4 items-center" }, fluencyStatus === "complete" && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setFluencyTranscript("");
          setFluencyResult(null);
          setFluencyFeedback("");
          setFluencyStatus("idle");
        },
        className: "flex items-center gap-2 px-6 py-3 rounded-full font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors animate-in slide-in-from-right-4",
        "aria-label": t2("fluency.reset_label")
      },
      /* @__PURE__ */ React.createElement(RefreshCw, { size: 18 }),
      " ",
      t2("fluency.try_again")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: toggleFluencyRecording,
        disabled: fluencyStatus === "processing",
        "data-help-key": "fluency_mode_record_btn",
        className: `w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all transform border-4 ${fluencyStatus === "listening" ? "bg-red-700 text-white animate-pulse border-red-200 shadow-red-500/30 hover:scale-105 active:scale-95" : fluencyStatus === "complete" ? "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:scale-105 active:scale-95" : fluencyStatus === "processing" ? "bg-slate-300 text-slate-600 border-slate-200 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-100 shadow-indigo-500/30 hover:scale-105 active:scale-95"}`,
        "aria-label": fluencyStatus === "listening" ? t2("fluency.stop_recording") : fluencyStatus === "processing" ? t2("fluency.processing") : t2("fluency.start_recording")
      },
      fluencyStatus === "listening" ? /* @__PURE__ */ React.createElement(StopCircle, { size: 32, className: "fill-current" }) : fluencyStatus === "processing" ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 32, className: "animate-spin" }) : fluencyStatus === "complete" ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 32 }) : /* @__PURE__ */ React.createElement(Mic, { size: 32, className: "fill-current" })
    )))
  ));
}
function SourceGenPanel(props) {
  const {
    addToast,
    aiStandardQuery,
    aiStandardRegion,
    gradeLevel,
    handleAddStandard,
    handleFindStandards,
    handleGenerateSource,
    handleRemoveStandard,
    handleSetStandardModeToAi,
    handleSetStandardModeToManual,
    includeSourceCitations,
    isFindingStandards,
    isGeneratingSource,
    isIndependentMode,
    setAiStandardQuery,
    setAiStandardRegion,
    setIncludeSourceCitations,
    setSourceCustomInstructions,
    setSourceLength,
    setSourceLevel,
    setSourceTone,
    setSourceTopic,
    setSourceVocabulary,
    setStandardInputValue,
    setTargetStandards,
    showSourceGen,
    sourceCustomInstructions,
    sourceLength,
    sourceLevel,
    sourceTone,
    sourceTopic,
    sourceVocabulary,
    standardInputValue,
    standardMode,
    suggestedStandards,
    t: t2,
    targetStandards
  } = props;
  if (!showSourceGen) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-indigo-50/50 border-b border-indigo-100 animate-in slide-in-from-top-2 space-y-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "allo-source-topic", className: "block text-xs font-medium text-indigo-900 mb-1" }, t2("input.topic")), /* @__PURE__ */ React.createElement(
    "input",
    {
      id: "allo-source-topic",
      type: "text",
      value: sourceTopic,
      onChange: (e) => setSourceTopic(e.target.value),
      placeholder: t2("wizard.topic_placeholder"),
      "aria-label": t2("common.topic_subject_aria"),
      className: "w-full text-sm p-2 border border-indigo-200 rounded-md focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300",
      onKeyDown: (e) => e.key === "Enter" && handleGenerateSource(),
      autoFocus: true
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-indigo-900 mb-1" }, t2("input.tone")), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: sourceTone,
      onChange: (e) => setSourceTone(e.target.value),
      className: "w-full text-sm p-2 border border-indigo-200 rounded-md focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300",
      "aria-label": t2("input.tone")
    },
    /* @__PURE__ */ React.createElement("option", { value: "Informative" }, t2("input.tone_options.informative")),
    /* @__PURE__ */ React.createElement("option", { value: "Narrative" }, t2("input.tone_options.narrative")),
    /* @__PURE__ */ React.createElement("option", { value: "Dialogue" }, t2("input.tone_options.dialogue")),
    /* @__PURE__ */ React.createElement("option", { value: "Persuasive" }, t2("input.tone_options.persuasive")),
    /* @__PURE__ */ React.createElement("option", { value: "Humorous" }, t2("input.tone_options.humorous")),
    /* @__PURE__ */ React.createElement("option", { value: "Step-by-Step" }, t2("input.tone_options.procedural"))
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-indigo-900 mb-1" }, t2("input.target_level")), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: sourceLevel,
      onChange: (e) => setSourceLevel(e.target.value),
      className: "w-full text-sm p-2 border border-indigo-200 rounded-md focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300",
      "aria-label": t2("common.target_level")
    },
    /* @__PURE__ */ React.createElement("option", { value: "Kindergarten" }, t2("input.level_options.k")),
    /* @__PURE__ */ React.createElement("option", { value: "1st Grade" }, t2("input.level_options.g1")),
    /* @__PURE__ */ React.createElement("option", { value: "2nd Grade" }, t2("input.level_options.g2")),
    /* @__PURE__ */ React.createElement("option", { value: "3rd Grade" }, t2("input.level_options.g3")),
    /* @__PURE__ */ React.createElement("option", { value: "4th Grade" }, t2("input.level_options.g4")),
    /* @__PURE__ */ React.createElement("option", { value: "5th Grade" }, t2("input.level_options.g5")),
    /* @__PURE__ */ React.createElement("option", { value: "6th Grade" }, t2("input.level_options.g6")),
    /* @__PURE__ */ React.createElement("option", { value: "7th Grade" }, t2("input.level_options.g7")),
    /* @__PURE__ */ React.createElement("option", { value: "8th Grade" }, t2("input.level_options.g8")),
    /* @__PURE__ */ React.createElement("option", { value: "9th Grade" }, t2("input.level_options.g9")),
    /* @__PURE__ */ React.createElement("option", { value: "10th Grade" }, t2("input.level_options.g10")),
    /* @__PURE__ */ React.createElement("option", { value: "11th Grade" }, t2("input.level_options.g11")),
    /* @__PURE__ */ React.createElement("option", { value: "12th Grade" }, t2("input.level_options.g12")),
    /* @__PURE__ */ React.createElement("option", { value: "College" }, t2("input.level_options.college")),
    /* @__PURE__ */ React.createElement("option", { value: "Graduate Level" }, t2("input.level_options.grad"))
  ))), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 p-2 rounded-lg border border-slate-400" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs text-slate-600 font-bold flex items-center gap-1" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 12, className: "text-green-600" }), " ", isIndependentMode ? t2("wizard.learning_goal_header") : t2("standards.target_standard")), !isIndependentMode && /* @__PURE__ */ React.createElement("div", { className: "flex bg-white rounded-md border border-slate-400 p-0.5 shadow-sm" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSetStandardModeToAi,
      className: `px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${standardMode === "ai" ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:text-slate-600"}`
    },
    t2("standards.ai_match")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSetStandardModeToManual,
      className: `px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${standardMode === "manual" ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:text-slate-600"}`
    },
    t2("standards.manual")
  ))), standardMode === "ai" ? /* @__PURE__ */ React.createElement("div", { className: "space-y-2 animate-in fade-in slide-in-from-top-1 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t2("common.standards_region_optional"),
      type: "text",
      value: aiStandardRegion,
      onChange: (e) => setAiStandardRegion(e.target.value),
      placeholder: t2("standards.region_optional"),
      className: "w-1/3 text-xs border border-slate-400 rounded p-1.5 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300"
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t2("common.enter_ai_standard_query"),
      type: "text",
      value: aiStandardQuery,
      onChange: (e) => setAiStandardQuery(e.target.value),
      onKeyDown: (e) => e.key === "Enter" && handleFindStandards(gradeLevel),
      placeholder: t2("standards.finder_placeholder"),
      className: "flex-grow text-xs border border-slate-400 rounded p-1.5 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t2("common.refresh"),
      onClick: () => handleFindStandards(gradeLevel),
      disabled: !aiStandardQuery.trim() || isFindingStandards,
      className: "bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
      title: t2("standards.search_button_title")
    },
    isFindingStandards ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(Search, { size: 14 })
  )), suggestedStandards.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "max-h-32 overflow-y-auto custom-scrollbar border border-slate-400 rounded bg-white divide-y divide-slate-100" }, suggestedStandards.map((std, idx) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: idx,
      onClick: () => {
        const val = `${std.code}: ${std.description}`;
        if (targetStandards.length < 3 && !targetStandards.includes(val)) {
          setTargetStandards((prev) => [...prev, val]);
          addToast(`Added ${std.code} to list`, "success");
        } else if (targetStandards.length >= 3) {
          addToast(t2("standards.toast_max_limit"), "error");
        }
      },
      className: "w-full text-left p-2 hover:bg-indigo-50 transition-colors group"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1 rounded border border-indigo-100" }, std.code), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600 uppercase" }, std.framework)),
    /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 leading-snug mt-1 line-clamp-2 group-hover:text-indigo-900" }, std.description)
  ))), suggestedStandards.length === 0 && !isFindingStandards && aiStandardQuery && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600 italic text-center p-1" }, t2("standards.press_search_hint"))) : /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t2("common.enter_standard_input_value"),
      type: "text",
      value: standardInputValue,
      onChange: (e) => setStandardInputValue(e.target.value),
      onKeyDown: (e) => e.key === "Enter" && handleAddStandard(),
      placeholder: t2("standards.manual_placeholder"),
      className: "flex-grow text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300 p-1.5"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t2("common.add"),
      onClick: handleAddStandard,
      disabled: !standardInputValue.trim() || targetStandards.length >= 3,
      className: "bg-indigo-100 text-indigo-700 p-1.5 rounded-md hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
      title: t2("standards.add_button")
    },
    /* @__PURE__ */ React.createElement(Plus, { size: 16 })
  ))), targetStandards.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mt-2 mb-2" }, targetStandards.map((std, idx) => /* @__PURE__ */ React.createElement("span", { key: idx, className: "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-700 border border-green-200 animate-in slide-in-from-left-1 max-w-full" }, /* @__PURE__ */ React.createElement("span", { className: "truncate", title: std }, std), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t2("common.close"),
      onClick: () => handleRemoveStandard(idx),
      className: "hover:text-green-900 ml-1 shrink-0",
      title: t2("standards.remove_button")
    },
    /* @__PURE__ */ React.createElement(X, { size: 10 })
  )))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-indigo-900 mb-1" }, t2("input.vocab"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-indigo-600 font-normal" }, t2("common.optional"))), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: sourceVocabulary,
      onChange: (e) => setSourceVocabulary(e.target.value),
      placeholder: t2("wizard.vocab_placeholder"),
      className: "w-full text-sm p-2 border border-indigo-200 rounded-md focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300",
      "aria-label": t2("input.vocab")
    }
  )), /* @__PURE__ */ React.createElement("div", { "data-help-key": "source_settings_length" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-indigo-900 mb-1" }, t2("input.length"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-indigo-600 font-normal" }, t2("input.approx_words"))), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      value: sourceLength,
      onChange: (e) => setSourceLength(e.target.value),
      placeholder: "250",
      step: "50",
      className: "w-full text-sm p-2 border border-indigo-200 rounded-md focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300",
      "aria-label": t2("wizard.aria_length_label")
    }
  )), /* @__PURE__ */ React.createElement("div", { "data-help-key": "source_settings_instructions" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-indigo-900 mb-1" }, t2("input.custom_instructions"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-indigo-600 font-normal" }, t2("common.optional"))), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: sourceCustomInstructions,
      onChange: (e) => setSourceCustomInstructions(e.target.value),
      placeholder: t2("wizard.instructions_placeholder"),
      className: "w-full text-sm p-2 border border-indigo-200 rounded-md focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none resize-none h-16 transition-shadow duration-300",
      "aria-label": t2("wizard.input_instructions_label")
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2 bg-purple-50 p-2.5 rounded-lg border-2 border-purple-200 shadow-sm", "data-help-key": "source_verify_checkbox" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t2("common.toggle_include_source_citations"),
      id: "includeCitations",
      type: "checkbox",
      checked: includeSourceCitations,
      onChange: (e) => setIncludeSourceCitations(e.target.checked),
      className: "w-4 h-4 text-purple-600 border-purple-300 rounded focus:ring-purple-500 cursor-pointer"
    }
  ), /* @__PURE__ */ React.createElement("label", { htmlFor: "includeCitations", className: "text-xs font-bold text-purple-900 cursor-pointer select-none flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(Search, { size: 12, className: "text-purple-600" }), " ", t2("input.verify_facts"))), includeSourceCitations && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-purple-700 ml-6 leading-relaxed" }, t2("input.verify_facts_desc"))), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t2("common.generate_source_text"),
      "data-help-key": "source_generate_button",
      onClick: handleGenerateSource,
      disabled: !sourceTopic.trim() && targetStandards.length === 0 || isGeneratingSource,
      "aria-busy": isGeneratingSource,
      className: "w-full bg-indigo-600 text-white text-sm font-medium py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    },
    isGeneratingSource ? /* @__PURE__ */ React.createElement(RefreshCw, { className: "animate-spin", size: 14 }) : /* @__PURE__ */ React.createElement(Pencil, { size: 14 }),
    isGeneratingSource ? t2("input.writing") : t2("input.generate")
  ));
}
function TourOverlay(props) {
  const {
    botSpotlightPos,
    handleNextTourStep,
    handlePrevTourStep,
    handleSetRunTourToFalse,
    isSpotlightMode,
    runTour,
    setIsSpotlightMode,
    setRunTour,
    setSpotlightMessage,
    spotlightMessage,
    t: t2,
    tourRect,
    tourStep,
    tourSteps
  } = props;
  if (!(runTour && tourRect)) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[9999] pointer-events-auto font-sans" }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 transition-all duration-500" }, /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: 0, left: 0, right: 0, height: tourRect.top, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" } }), /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: tourRect.top, left: 0, width: tourRect.left, height: tourRect.height, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" } }), /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: tourRect.top, right: 0, left: tourRect.right, height: tourRect.height, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" } }), /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: tourRect.bottom, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" } })), isSpotlightMode && botSpotlightPos && /* @__PURE__ */ React.createElement("svg", { className: "absolute inset-0 pointer-events-none z-[10000]", style: { overflow: "visible" }, "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement(
    "radialGradient",
    {
      id: "beamGradient",
      gradientUnits: "userSpaceOnUse",
      cx: botSpotlightPos.x - 53,
      cy: botSpotlightPos.y + 20,
      r: Math.hypot(
        tourRect.left + tourRect.width / 2 - (botSpotlightPos.x - 53),
        tourRect.top + tourRect.height / 2 - (botSpotlightPos.y + 10)
      ) * 1.1
    },
    /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "rgba(250, 204, 21, 0.7)" }),
    /* @__PURE__ */ React.createElement("stop", { offset: "60%", stopColor: "rgba(250, 204, 21, 0.1)" }),
    /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "rgba(250, 204, 21, 0)" })
  ), /* @__PURE__ */ React.createElement("filter", { id: "glow" }, /* @__PURE__ */ React.createElement("feGaussianBlur", { stdDeviation: "8", result: "coloredBlur" }), /* @__PURE__ */ React.createElement("feMerge", null, /* @__PURE__ */ React.createElement("feMergeNode", { in: "coloredBlur" }), /* @__PURE__ */ React.createElement("feMergeNode", { in: "SourceGraphic" })))), /* @__PURE__ */ React.createElement(
    "path",
    {
      d: `
                            M ${botSpotlightPos.x - 53} ${botSpotlightPos.y + 20}
                            L ${tourRect.left} ${tourRect.top}
                            L ${tourRect.left} ${tourRect.bottom}
                            Z
                        `,
      fill: "url(#beamGradient)",
      style: { mixBlendMode: "screen", filter: "url(#glow)" },
      className: "animate-in fade-in duration-500"
    }
  ), /* @__PURE__ */ React.createElement(
    "rect",
    {
      x: tourRect.left - 10,
      y: tourRect.top - 10,
      width: tourRect.width + 20,
      height: tourRect.height + 20,
      rx: "12",
      fill: "none",
      stroke: "rgba(250, 204, 21, 0.4)",
      strokeWidth: "3",
      className: "animate-pulse"
    }
  )), !isSpotlightMode && /* @__PURE__ */ React.createElement("div", { className: "animate-pulse", style: {
    position: "absolute",
    top: tourRect.top - 4,
    left: tourRect.left - 4,
    width: tourRect.width + 8,
    height: tourRect.height + 8,
    border: "4px solid #fbbf24",
    borderRadius: "12px",
    pointerEvents: "none",
    boxShadow: "0 0 20px rgba(251, 191, 36, 0.5)"
  } }), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `fixed top-4 bottom-4 bg-white p-8 pt-6 shadow-2xl w-[500px] max-h-[calc(100vh-2rem)] overflow-y-auto flex flex-col gap-6 animate-in duration-500 z-[11000] border-amber-300 ${tourRect && tourRect.left > window.innerWidth / 2 ? "left-0 border-r-4 rounded-r-3xl slide-in-from-left" : "right-0 border-l-4 rounded-l-3xl slide-in-from-right"}`
    },
    spotlightMessage ? /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-indigo-900 text-lg flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Sparkles, { size: 18, className: "text-yellow-500 fill-current" }), " ", spotlightMessage.title || t2("tour.spotlight_title")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2 mt-2" }, (spotlightMessage.text || spotlightMessage || "").split(/\r?\n/).map((line, i) => {
      const cleanLine = line.trim();
      if (!cleanLine) return /* @__PURE__ */ React.createElement("div", { key: i, className: "h-3" });
      const formatText = (text) => {
        if (!text) return null;
        return text.split("**").map((part, bIdx) => {
          if (bIdx % 2 === 1) {
            return /* @__PURE__ */ React.createElement("strong", { key: `b-${bIdx}`, className: "font-bold text-slate-900 bg-amber-100/50 px-1 rounded border border-amber-200/50 box-decoration-clone" }, part);
          }
          return part.split("*").map((sub, iIdx) => {
            if (iIdx % 2 === 1) {
              return /* @__PURE__ */ React.createElement("em", { key: `i-${bIdx}-${iIdx}`, className: "italic text-slate-600 font-serif" }, sub);
            }
            return sub;
          });
        });
      };
      if (cleanLine.startsWith("> ")) {
        return /* @__PURE__ */ React.createElement("div", { key: i, className: "border-l-4 border-slate-300 bg-slate-50 p-4 my-2 text-slate-600 italic rounded-r-lg" }, formatText(cleanLine.substring(1).trim()));
      }
      if (cleanLine.startsWith("###")) {
        const headerText = cleanLine.replace(/^###\s*/, "").trim();
        let HeaderIcon = Sparkles;
        if (headerText.includes("Options") || headerText.includes("Settings") || headerText.includes("Editor")) HeaderIcon = Settings;
        if (headerText.includes("Features") || headerText.includes("Components") || headerText.includes("Capabilities")) HeaderIcon = Layout;
        if (headerText.includes("Pro Tip") || headerText.includes("Benefit")) HeaderIcon = Lightbulb;
        if (headerText.includes("UDL")) HeaderIcon = Brain;
        if (headerText.includes("Input")) HeaderIcon = FileText;
        return /* @__PURE__ */ React.createElement("h5", { key: i, className: "text-indigo-600 font-bold uppercase text-sm mt-6 mb-3 tracking-wider border-b border-indigo-100 pb-1 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(HeaderIcon, { size: 16, className: "text-indigo-500" }), " ", formatText(headerText));
      }
      const isBullet = cleanLine.startsWith("\u2022") || cleanLine.startsWith("-") || cleanLine.startsWith("* ");
      if (isBullet) {
        const bulletMarker = cleanLine.startsWith("* ") ? "* " : cleanLine.charAt(0);
        const bulletText = cleanLine.substring(bulletMarker.length).trim();
        return /* @__PURE__ */ React.createElement("div", { key: i, className: "grid grid-cols-[24px_1fr] gap-1 mb-2 items-start group" }, /* @__PURE__ */ React.createElement("div", { className: "mt-2 h-2 w-2 rounded-full bg-amber-400 group-hover:bg-amber-500 transition-colors mx-auto shrink-0" }), /* @__PURE__ */ React.createElement("span", { className: "text-slate-700 text-lg font-medium leading-relaxed" }, formatText(bulletText)));
      }
      return /* @__PURE__ */ React.createElement("p", { key: i, className: "text-slate-800 text-xl font-medium leading-relaxed mb-4" }, formatText(cleanLine));
    }))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start" }, /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-indigo-900 text-lg" }, tourSteps[tourStep].title), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full" }, tourStep + 1, " / ", tourSteps.length)), /* @__PURE__ */ React.createElement("div", { className: "text-slate-600 text-sm leading-relaxed flex flex-col gap-2" }, (tourSteps[tourStep].text || "").split(/\r?\n/).map((line, i) => {
      const cleanLine = line.trim();
      if (!cleanLine) return /* @__PURE__ */ React.createElement("div", { key: i, className: "h-2" });
      const formatText = (text) => {
        if (!text) return null;
        return text.split("**").map((part, bIdx) => {
          if (bIdx % 2 === 1) {
            return /* @__PURE__ */ React.createElement("strong", { key: `b-${bIdx}`, className: "font-bold text-slate-900 bg-indigo-50 px-1 rounded border border-indigo-100 box-decoration-clone" }, part);
          }
          return part.split("*").map((sub, iIdx) => {
            if (iIdx % 2 === 1) {
              return /* @__PURE__ */ React.createElement("em", { key: `i-${bIdx}-${iIdx}`, className: "italic text-slate-600 font-serif" }, sub);
            }
            return sub;
          });
        });
      };
      if (cleanLine.startsWith("###")) {
        const headerText = cleanLine.replace(/^###\s*/, "").trim();
        return /* @__PURE__ */ React.createElement("h5", { key: i, className: "text-indigo-600 font-bold uppercase text-xs mt-2 mb-1 tracking-wider border-b border-indigo-100 pb-1 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Sparkles, { size: 12, className: "text-indigo-400" }), " ", formatText(headerText));
      }
      const isBullet = cleanLine.startsWith("\u2022") || cleanLine.startsWith("-") || cleanLine.startsWith("* ");
      if (isBullet) {
        const bulletMarker = cleanLine.startsWith("* ") ? "* " : cleanLine.charAt(0);
        const bulletText = cleanLine.substring(bulletMarker.length).trim();
        return /* @__PURE__ */ React.createElement("div", { key: i, className: "grid grid-cols-[16px_1fr] gap-1 mb-1 items-start group" }, /* @__PURE__ */ React.createElement("div", { className: "mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 group-hover:bg-indigo-500 transition-colors mx-auto shrink-0" }), /* @__PURE__ */ React.createElement("span", { className: "text-slate-700 text-sm font-medium leading-relaxed" }, formatText(bulletText)));
      }
      return /* @__PURE__ */ React.createElement("p", { key: i, className: "text-slate-600 text-sm leading-relaxed mb-2" }, formatText(cleanLine));
    }))),
    /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center pt-2 mt-2 border-t border-slate-100" }, spotlightMessage ? /* @__PURE__ */ React.createElement(
      "button",
      {
        "data-help-ignore": "true",
        style: { pointerEvents: "all", zIndex: 9999 },
        onClick: (e) => {
          e.stopPropagation();
          setRunTour(false);
          setIsSpotlightMode(false);
          setSpotlightMessage("");
        },
        className: "bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm w-full"
      },
      t2("common.close")
    ) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { onClick: handleSetRunTourToFalse, className: "text-xs font-bold text-slate-600 hover:text-slate-600" }, t2("common.skip")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": t2("common.continue"),
        onClick: handlePrevTourStep,
        disabled: tourStep === 0,
        className: "text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-30"
      },
      t2("common.back")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": t2("common.next"),
        onClick: handleNextTourStep,
        className: "bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-2"
      },
      tourStep === tourSteps.length - 1 ? t2("common.finish") : t2("common.next"),
      " ",
      /* @__PURE__ */ React.createElement(ArrowRight, { size: 14 })
    ))))
  ));
}
function VolumeBuilderView(props) {
  const {
    cubeAnswer,
    cubeChallenge,
    cubeDims,
    cubeDragRef,
    cubeFeedback,
    cubeNotch,
    cubeRotation,
    cubeScale,
    cubeShape,
    cubeShowLayers,
    exploreDifficulty,
    getAdaptiveDifficulty,
    mathMode,
    setCubeAnswer,
    setCubeChallenge,
    setCubeDims,
    setCubeFeedback,
    setCubeNotch,
    setCubeRotation,
    setCubeScale,
    setCubeShape,
    setCubeShowLayers,
    setExploreDifficulty,
    t: t2
  } = props;
  if (!(mathMode === "Volume Builder")) return null;
  const isLBlock = cubeShape === "lblock";
  const safeNotch = {
    l: Math.max(1, Math.min(cubeNotch.l, cubeDims.l - 1)),
    w: Math.max(1, Math.min(cubeNotch.w, cubeDims.w - 1)),
    h: Math.max(1, Math.min(cubeNotch.h, cubeDims.h - 1))
  };
  const rectVolume = cubeDims.l * cubeDims.w * cubeDims.h;
  const notchVolume = isLBlock ? safeNotch.l * safeNotch.w * safeNotch.h : 0;
  const volume = rectVolume - notchVolume;
  const surfaceArea = 2 * (cubeDims.l * cubeDims.w + cubeDims.l * cubeDims.h + cubeDims.w * cubeDims.h);
  const cubeUnit = Math.max(18, Math.min(36, 240 / Math.max(cubeDims.l, cubeDims.w, cubeDims.h)));
  const handleCubeDrag = (e) => {
    if (!cubeDragRef.current) return;
    const dx = e.clientX - cubeDragRef.current.x;
    const dy = e.clientY - cubeDragRef.current.y;
    setCubeRotation((prev) => ({
      x: Math.max(-80, Math.min(10, prev.x + dy * 0.5)),
      y: prev.y + dx * 0.5
    }));
    cubeDragRef.current = { x: e.clientX, y: e.clientY };
  };
  const handleCubeDragEnd = () => {
    cubeDragRef.current = null;
    window.removeEventListener("mousemove", handleCubeDrag);
    window.removeEventListener("mouseup", handleCubeDragEnd);
  };
  const maxLayer = cubeShowLayers !== null ? Math.min(cubeShowLayers, cubeDims.h) : cubeDims.h;
  const cubeGridElements = [];
  for (let z = 0; z < maxLayer; z++)
    for (let y = 0; y < cubeDims.w; y++)
      for (let x = 0; x < cubeDims.l; x++) {
        if (isLBlock && x < safeNotch.l && y < safeNotch.w && z < safeNotch.h) continue;
        const hue = 140 + z * 12;
        const lightness = 55 + z * 4;
        cubeGridElements.push(
          React.createElement(
            "div",
            {
              key: x + "-" + y + "-" + z,
              style: {
                position: "absolute",
                width: cubeUnit + "px",
                height: cubeUnit + "px",
                transform: "translate3d(" + x * cubeUnit + "px, " + -z * cubeUnit + "px, " + y * cubeUnit + "px)",
                transformStyle: "preserve-3d"
              }
            },
            React.createElement("div", { style: {
              position: "absolute",
              width: "100%",
              height: "100%",
              transform: "translateZ(" + cubeUnit / 2 + "px)",
              background: "hsla(" + hue + ",70%," + lightness + "%,0.85)",
              border: "1px solid hsla(" + hue + ",80%,30%,0.4)",
              boxSizing: "border-box"
            } }),
            React.createElement("div", { style: {
              position: "absolute",
              width: "100%",
              height: "100%",
              transform: "rotateY(180deg) translateZ(" + cubeUnit / 2 + "px)",
              background: "hsla(" + hue + ",65%," + (lightness + 5) + "%,0.7)",
              border: "1px solid hsla(" + hue + ",80%,30%,0.3)",
              boxSizing: "border-box"
            } }),
            React.createElement("div", { style: {
              position: "absolute",
              width: cubeUnit + "px",
              height: "100%",
              transform: "rotateY(-90deg) translateZ(" + cubeUnit / 2 + "px)",
              background: "hsla(" + (hue + 10) + ",60%," + (lightness - 5) + "%,0.8)",
              border: "1px solid hsla(" + hue + ",80%,30%,0.3)",
              boxSizing: "border-box"
            } }),
            React.createElement("div", { style: {
              position: "absolute",
              width: cubeUnit + "px",
              height: "100%",
              transform: "rotateY(90deg) translateZ(" + cubeUnit / 2 + "px)",
              background: "hsla(" + (hue + 10) + ",60%," + (lightness + 3) + "%,0.8)",
              border: "1px solid hsla(" + hue + ",80%,30%,0.3)",
              boxSizing: "border-box"
            } }),
            React.createElement("div", { style: {
              position: "absolute",
              width: "100%",
              height: cubeUnit + "px",
              transform: "rotateX(90deg) translateZ(" + cubeUnit / 2 + "px)",
              background: "hsla(" + (hue - 5) + ",75%," + (lightness + 8) + "%,0.9)",
              border: "1px solid hsla(" + hue + ",80%,30%,0.4)",
              boxSizing: "border-box"
            } }),
            React.createElement("div", { style: {
              position: "absolute",
              width: "100%",
              height: cubeUnit + "px",
              transform: "rotateX(-90deg) translateZ(" + cubeUnit / 2 + "px)",
              background: "hsla(" + (hue + 5) + ",55%," + (lightness - 8) + "%,0.6)",
              border: "1px solid hsla(" + hue + ",80%,30%,0.2)",
              boxSizing: "border-box"
            } })
          )
        );
      }
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 animate-in fade-in slide-in-from-top-1", "data-help-key": "volume_builder_panel" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 text-emerald-800 font-bold text-sm" }, "\u{1F4E6} 3D Volume Explorer"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setCubeScale((s) => Math.max(0.4, s - 0.15)), className: "w-7 h-7 rounded-full bg-white border border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-all flex items-center justify-center", "aria-label": t2("volume_builder.zoom_out_aria") || "Zoom out" }, "\u2212"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-emerald-600 font-mono w-10 text-center" }, Math.round(cubeScale * 100), "%"), /* @__PURE__ */ React.createElement("button", { onClick: () => setCubeScale((s) => Math.min(2.5, s + 0.15)), className: "w-7 h-7 rounded-full bg-white border border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-all flex items-center justify-center", "aria-label": t2("volume_builder.zoom_in_aria") || "Zoom in" }, "+"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setCubeRotation({ x: -25, y: -35 });
    setCubeScale(1);
  }, className: "ml-1 px-2 py-1 rounded-md bg-white border border-emerald-300 text-emerald-700 font-bold text-[11px] hover:bg-emerald-100 transition-all", "aria-label": t2("volume_builder.reset_view_aria") || "Reset view" }, "\u21BA"))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-emerald-700/70" }, t2("volume_builder.help_caption") || "Drag to rotate \u2022 Scroll to zoom \u2022 Build rectangular prisms or L-blocks with unit cubes (5.MD.3-5)"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 justify-center", role: "radiogroup", "aria-label": t2("volume_builder.shape_radiogroup_aria") || "Volume Builder shape", "data-help-key": "volume_builder_shape_selector" }, [
    { id: "rect", label: "\u{1F9CA} Rectangular" },
    { id: "lblock", label: "\u{1F4D0} L-Block" }
  ].map((s) => {
    const sel = cubeShape === s.id;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: s.id,
        role: "radio",
        "aria-checked": sel,
        onClick: () => {
          setCubeShape(s.id);
          setCubeChallenge(null);
          setCubeFeedback(null);
        },
        className: "px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2 " + (sel ? "bg-emerald-600 text-white border-emerald-700 shadow" : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50")
      },
      s.label
    );
  })), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-2", "data-help-key": "volume_builder_dimensions_input" }, ["l", "w", "h"].map((dim) => /* @__PURE__ */ React.createElement("div", { key: dim }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-slate-600 mb-1 font-bold uppercase" }, dim === "l" ? "Length" : dim === "w" ? "Width" : "Height"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: "1",
      max: "10",
      value: cubeDims[dim],
      onChange: (e) => {
        setCubeDims((prev) => ({ ...prev, [dim]: parseInt(e.target.value) }));
        setCubeChallenge(null);
        setCubeFeedback(null);
        setCubeShowLayers(null);
      },
      className: "w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600",
      "aria-label": dim === "l" ? "Length" : dim === "w" ? "Width" : "Height"
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "text-center text-sm font-bold text-emerald-700 mt-1" }, cubeDims[dim])))), isLBlock && /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-2 mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200" }, ["l", "w", "h"].map((dim) => /* @__PURE__ */ React.createElement("div", { key: "notch-" + dim }, /* @__PURE__ */ React.createElement("label", { className: "block text-[10px] text-amber-700 mb-1 font-bold uppercase" }, (dim === "l" ? "Length" : dim === "w" ? "Width" : "Height") + " Notch"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: "1",
      max: Math.max(1, cubeDims[dim] - 1),
      value: Math.min(cubeNotch[dim], Math.max(1, cubeDims[dim] - 1)),
      onChange: (e) => {
        setCubeNotch((prev) => ({ ...prev, [dim]: parseInt(e.target.value) }));
        setCubeChallenge(null);
        setCubeFeedback(null);
      },
      className: "w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600",
      "aria-label": "Notch " + (dim === "l" ? "length" : dim === "w" ? "width" : "height")
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "text-center text-xs font-bold text-amber-700 mt-1" }, Math.min(cubeNotch[dim], Math.max(1, cubeDims[dim] - 1)))))), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl border-2 border-emerald-300/30 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none",
      style: { minHeight: "400px", perspective: "900px" },
      onMouseDown: (e) => {
        cubeDragRef.current = { x: e.clientX, y: e.clientY };
        window.addEventListener("mousemove", handleCubeDrag);
        window.addEventListener("mouseup", handleCubeDragEnd);
      },
      onWheel: (e) => {
        e.preventDefault();
        setCubeScale((s) => Math.max(0.4, Math.min(2.5, s + (e.deltaY > 0 ? -0.08 : 0.08))));
      },
      onTouchStart: (e) => {
        if (e.touches.length === 1) cubeDragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      },
      onTouchMove: (e) => {
        if (cubeDragRef.current && e.touches.length === 1) {
          const dx = e.touches[0].clientX - cubeDragRef.current.x;
          const dy = e.touches[0].clientY - cubeDragRef.current.y;
          setCubeRotation((prev) => ({ x: Math.max(-80, Math.min(10, prev.x + dy * 0.5)), y: prev.y + dx * 0.5 }));
          cubeDragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
      },
      onTouchEnd: () => {
        cubeDragRef.current = null;
      }
    },
    /* @__PURE__ */ React.createElement("div", { style: {
      transformStyle: "preserve-3d",
      transform: "rotateX(" + cubeRotation.x + "deg) rotateY(" + cubeRotation.y + "deg) scale3d(" + cubeScale + "," + cubeScale + "," + cubeScale + ")",
      transition: cubeDragRef.current ? "none" : "transform 0.15s ease-out",
      position: "relative",
      width: cubeDims.l * cubeUnit + "px",
      height: cubeDims.h * cubeUnit + "px"
    } }, cubeGridElements)
  ), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 bg-white/80 rounded-lg p-2 border border-emerald-100" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-emerald-700 whitespace-nowrap" }, "Layers:"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: "1",
      max: cubeDims.h,
      value: cubeShowLayers !== null ? cubeShowLayers : cubeDims.h,
      "aria-label": t2("stem.layers_slider") || "Visible layers",
      onChange: (e) => setCubeShowLayers(parseInt(e.target.value)),
      className: "flex-1 h-1.5 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-mono text-emerald-600 w-12 text-center" }, cubeShowLayers !== null ? cubeShowLayers : cubeDims.h, " / ", cubeDims.h), cubeShowLayers !== null && cubeShowLayers < cubeDims.h && /* @__PURE__ */ React.createElement("button", { onClick: () => setCubeShowLayers(null), className: "text-xs text-emerald-500 hover:text-emerald-700 font-bold" }, "All")), /* @__PURE__ */ React.createElement("div", { className: "bg-white/80 rounded-lg p-3 border border-emerald-100", "data-help-key": "volume_builder_volume_readout" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1" }, t2("stem.volume")), /* @__PURE__ */ React.createElement("div", { className: "text-lg font-bold text-emerald-800" }, isLBlock ? /* @__PURE__ */ React.createElement(React.Fragment, null, "V = (", cubeDims.l, "\xD7", cubeDims.w, "\xD7", cubeDims.h, ") \u2212 (", safeNotch.l, "\xD7", safeNotch.w, "\xD7", safeNotch.h, ") = ", rectVolume, " \u2212 ", notchVolume, " = ", /* @__PURE__ */ React.createElement("span", { className: "text-2xl text-emerald-600" }, volume)) : /* @__PURE__ */ React.createElement(React.Fragment, null, "V = ", cubeDims.l, " \xD7 ", cubeDims.w, " \xD7 ", cubeDims.h, " = ", /* @__PURE__ */ React.createElement("span", { className: "text-2xl text-emerald-600" }, volume))), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-slate-600" }, volume, " unit cube", volume !== 1 ? "s" : "")), /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-teal-600 uppercase tracking-wider mb-1" }, t2("stem.surface_area"), isLBlock && /* @__PURE__ */ React.createElement("span", { className: "ml-1 text-[10px] font-normal text-teal-500/70" }, "(approx \u2014 full prism)")), /* @__PURE__ */ React.createElement("div", { className: "text-lg font-bold text-teal-800" }, "SA ", isLBlock ? "\u2248 " : "= ", /* @__PURE__ */ React.createElement("span", { className: "text-2xl text-teal-600" }, surfaceArea)), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-slate-600" }, "2(", cubeDims.l, "\xD7", cubeDims.w, " + ", cubeDims.l, "\xD7", cubeDims.h, " + ", cubeDims.w, "\xD7", cubeDims.h, ")")))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-emerald-700" }, "Difficulty:"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-0.5" }, ["easy", "medium", "hard"].map((d) => /* @__PURE__ */ React.createElement("button", { key: d, onClick: () => setExploreDifficulty(d), className: "text-[11px] font-bold px-1.5 py-0.5 rounded-full transition-all " + (exploreDifficulty === d ? d === "easy" ? "bg-green-700 text-white" : d === "hard" ? "bg-red-700 text-white" : "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200") }, d)))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
    const vdiff = getAdaptiveDifficulty();
    const vmax = vdiff === "easy" ? 4 : vdiff === "hard" ? 10 : 7;
    const l = Math.floor(Math.random() * (vmax - 1)) + 1;
    const w = Math.floor(Math.random() * (vmax - 1)) + 1;
    const h = Math.floor(Math.random() * (vmax - 1)) + 1;
    setCubeDims({ l, w, h });
    if (cubeShape === "lblock") {
      const nL = Math.max(1, Math.min(cubeNotch.l, l - 1));
      const nW = Math.max(1, Math.min(cubeNotch.w, w - 1));
      const nH = Math.max(1, Math.min(cubeNotch.h, h - 1));
      setCubeChallenge({ l, w, h, shape: "lblock", notch: { l: nL, w: nW, h: nH }, answer: l * w * h - nL * nW * nH });
    } else {
      setCubeChallenge({ l, w, h, shape: "rect", answer: l * w * h });
    }
    setCubeAnswer("");
    setCubeFeedback(null);
    setCubeShowLayers(null);
  }, className: "flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md", "data-help-key": "volume_builder_random_challenge_btn" }, "\u{1F3B2} Random Challenge"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setCubeDims({ l: 3, w: 2, h: 2 });
        setCubeChallenge(null);
        setCubeFeedback(null);
        setCubeShowLayers(null);
        setCubeRotation({ x: -25, y: -35 });
        setCubeScale(1);
      },
      className: "px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all",
      "data-help-key": "volume_builder_reset_btn"
    },
    "\u21BA Reset"
  )), cubeChallenge && /* @__PURE__ */ React.createElement("div", { className: "bg-amber-50 rounded-lg p-3 border border-amber-200" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-amber-800 mb-2" }, "\u{1F914} What is the volume of this ", cubeChallenge.shape === "lblock" ? "L-block" : "rectangular prism", "?"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 items-center" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      value: cubeAnswer,
      onChange: (e) => setCubeAnswer(e.target.value),
      onKeyDown: (e) => {
        if (e.key === "Enter" && cubeAnswer) {
          const ans = parseInt(cubeAnswer);
          const isLB = cubeChallenge.shape === "lblock";
          const correctMsg = isLB ? "\u2705 Correct! (" + cubeChallenge.l + "\xD7" + cubeChallenge.w + "\xD7" + cubeChallenge.h + ") \u2212 (" + cubeChallenge.notch.l + "\xD7" + cubeChallenge.notch.w + "\xD7" + cubeChallenge.notch.h + ") = " + cubeChallenge.answer + " cubic units" : "\u2705 Correct! " + cubeChallenge.l + " \xD7 " + cubeChallenge.w + " \xD7 " + cubeChallenge.h + " = " + cubeChallenge.answer + " cubic units";
          const wrongMsg = isLB ? "\u274C Not quite. Try V = (L \xD7 W \xD7 H) \u2212 notch" : "\u274C Not quite. Try V = L \xD7 W \xD7 H";
          setCubeFeedback(ans === cubeChallenge.answer ? { correct: true, msg: correctMsg } : { correct: false, msg: wrongMsg });
        }
      },
      placeholder: t2("volume_builder.answer_placeholder") || "Enter volume...",
      className: "flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-400 outline-none",
      "aria-label": t2("volume_builder.answer_aria") || "Volume answer",
      "data-help-key": "volume_builder_answer_field"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        const ans = parseInt(cubeAnswer);
        const isLB = cubeChallenge.shape === "lblock";
        const correctMsg = isLB ? "\u2705 Correct! (" + cubeChallenge.l + "\xD7" + cubeChallenge.w + "\xD7" + cubeChallenge.h + ") \u2212 (" + cubeChallenge.notch.l + "\xD7" + cubeChallenge.notch.w + "\xD7" + cubeChallenge.notch.h + ") = " + cubeChallenge.answer + " cubic units" : "\u2705 Correct! " + cubeChallenge.l + " \xD7 " + cubeChallenge.w + " \xD7 " + cubeChallenge.h + " = " + cubeChallenge.answer + " cubic units";
        const wrongMsg = isLB ? "\u274C Not quite. Try V = (L \xD7 W \xD7 H) \u2212 notch" : "\u274C Not quite. Try V = L \xD7 W \xD7 H";
        setCubeFeedback(ans === cubeChallenge.answer ? { correct: true, msg: correctMsg } : { correct: false, msg: wrongMsg });
      },
      disabled: !cubeAnswer,
      className: "px-4 py-2 bg-amber-700 text-white font-bold rounded-lg text-sm hover:bg-amber-600 disabled:opacity-40 transition-all",
      "data-help-key": "volume_builder_check_btn"
    },
    "Check"
  )), cubeFeedback && /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold mt-2 " + (cubeFeedback.correct ? "text-green-600" : "text-red-600") }, cubeFeedback.msg)));
}
window.AlloModules = window.AlloModules || {};
window.AlloModules.PdfDiffViewer = (typeof PdfDiffViewer !== 'undefined') ? PdfDiffViewer : null;
window.AlloModules.GroupSessionModal = (typeof GroupSessionModal !== 'undefined') ? GroupSessionModal : null;
window.AlloModules.FluencyModePanel = (typeof FluencyModePanel !== 'undefined') ? FluencyModePanel : null;
window.AlloModules.SourceGenPanel = (typeof SourceGenPanel !== 'undefined') ? SourceGenPanel : null;
window.AlloModules.TourOverlay = (typeof TourOverlay !== 'undefined') ? TourOverlay : null;
window.AlloModules.VolumeBuilderView = (typeof VolumeBuilderView !== 'undefined') ? VolumeBuilderView : null;
window.AlloModules.ViewMiscPanelsModule = true;
window.AlloModules.MiscPanels = true;  // satisfies loadModule('MiscPanels', ...) registration check
console.log('[CDN] ViewMiscPanelsModule loaded — 6 components registered');
})();
