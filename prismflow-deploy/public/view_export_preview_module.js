(function() {
'use strict';
if (window.AlloModules && window.AlloModules.ExportPreviewView) { console.log('[CDN] ViewExportPreviewModule already loaded, skipping'); return; }
var React = window.React || React;
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
// Icons referenced inside the Export Preview modal:
var Download = _lazyIcon('Download');
var ImageIcon = _lazyIcon('ImageIcon');
var RefreshCw = _lazyIcon('RefreshCw');
var X = _lazyIcon('X');
function ExportPreviewView(props) {
  const {
    BUILT_IN_PRESETS,
    FONT_OPTIONS,
    STYLE_SEEDS,
    _ensureDiffLib,
    a11yInspectMode,
    addToast,
    agentActivityLog,
    agentLogFullView,
    applyExportPreset,
    auditOutputAccessibility,
    customExportCSS,
    deleteExportPreset,
    diffLibReady,
    executeExportFromPreview,
    expertCommandInput,
    exportAuditLoading,
    exportAuditResult,
    exportConfig,
    exportPresets,
    exportPreviewMode,
    exportPreviewRef,
    exportStylePrompt,
    exportTheme,
    generateCustomExportStyle,
    getExportPreviewHTML,
    getSkippedResources,
    history,
    isAgentRunning,
    isGeneratingStyle,
    pdfFixResult,
    pptxLoaded,
    processExpertCommand,
    runAxeAudit,
    saveExportPreset,
    selectedFont,
    setAgentActivityLog,
    setAgentLogFullView,
    setCustomExportCSS,
    setDiffViewOpen,
    setExpertCommandInput,
    setExportAuditLoading,
    setExportAuditResult,
    setExportConfigAndRefresh,
    setExportPreviewMode,
    setExportStylePrompt,
    setExportTheme,
    setIsAgentRunning,
    setShowExportPreview,
    showExportPreview,
    toggleA11yInspect,
    updateExportPreview
  } = props;
  if (!showExportPreview) return null;
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "fixed inset-0 z-[200] bg-black/60 flex items-stretch justify-center p-4",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Document Builder",
      onClick: (e) => {
        if (e.target === e.currentTarget) setShowExportPreview(false);
      },
      onKeyDown: (e) => {
        if (e.key === "Escape") setShowExportPreview(false);
      },
      ref: (el) => {
        if (!el) return;
        const focusables = el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusables.length > 0 && !el.contains(document.activeElement)) focusables[0].focus();
        el.__focusTrap = el.__focusTrap || ((ev) => {
          if (ev.key !== "Tab") return;
          const fl = el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          if (fl.length === 0) return;
          const first = fl[0], last = fl[fl.length - 1];
          if (ev.shiftKey) {
            if (document.activeElement === first) {
              ev.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              ev.preventDefault();
              first.focus();
            }
          }
        });
        el.removeEventListener("keydown", el.__focusTrap);
        el.addEventListener("keydown", el.__focusTrap);
      }
    },
    /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl shadow-2xl flex w-full max-w-[95vw] max-h-[95vh] overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "w-72 shrink-0 bg-gradient-to-b from-slate-50 to-white border-r border-slate-200 overflow-y-auto p-4 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ React.createElement("h2", { className: "text-sm font-black text-slate-800 flex items-center gap-2" }, "\u{1F6E0}\uFE0F Document Builder"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono" }, exportPreviewMode === "worksheet" ? "Worksheet" : exportPreviewMode === "html" ? "HTML" : exportPreviewMode === "slides" ? "Slides" : "PDF"), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowExportPreview(false), className: "p-1 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors", "aria-label": "Close document builder" }, /* @__PURE__ */ React.createElement(X, { size: 16 })))), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2 pt-1" }, /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" }), "Quick Start", /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "Presets"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1" }, Object.entries(BUILT_IN_PRESETS).map(([key, preset]) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key,
        onClick: () => applyExportPreset(preset),
        className: "px-2 py-1 bg-white border border-slate-400 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-600 hover:text-indigo-700 transition-all",
        title: `Apply "${preset.name}" preset`
      },
      preset.emoji,
      " ",
      preset.name
    )), Object.entries(exportPresets).map(([key, preset]) => /* @__PURE__ */ React.createElement("div", { key, className: "flex items-center gap-0.5" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => applyExportPreset(preset),
        className: "px-2 py-1 bg-white border border-violet-600 rounded-l-lg text-[11px] font-bold text-violet-600 hover:bg-violet-50 transition-all",
        title: `Apply "${preset.name}" preset`
      },
      preset.emoji,
      " ",
      preset.name
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => deleteExportPreset(key),
        className: "px-1 py-1 bg-white border border-violet-600 border-l-0 rounded-r-lg text-[11px] text-red-400 hover:text-red-600 hover:bg-red-50 transition-all",
        title: `Delete "${preset.name}" preset`
      },
      /* @__PURE__ */ React.createElement(X, { size: 10 })
    )))), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      const name = prompt("Preset name:");
      if (name && name.trim()) saveExportPreset(name.trim());
    }, className: "mt-1.5 w-full px-2 py-1.5 border border-dashed border-slate-300 rounded-lg text-[11px] font-bold text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all" }, "+ Save Current as Preset")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "Format"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1" }, [["print", "\u{1F4C4} PDF"], ["worksheet", "\u{1F4DD} Worksheet"], ["html", "\u{1F4BB} HTML"], ["slides", "\u{1F4CA} Slides"]].map(([m, label]) => /* @__PURE__ */ React.createElement("button", { key: m, onClick: () => setExportPreviewMode(m), className: `flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${exportPreviewMode === m ? "bg-indigo-600 text-white" : "bg-white border border-slate-400 text-slate-600 hover:bg-slate-100"}` }, label)))), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" }), "Appearance", /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "Style"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-1" }, Object.entries(STYLE_SEEDS).filter(([, s]) => s.cssVars).map(([key, s]) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key,
        onClick: () => {
          setExportTheme(key);
          setTimeout(updateExportPreview, 50);
        },
        className: `text-[11px] font-bold py-1.5 px-2 rounded-lg transition-all ${exportTheme === key ? "bg-indigo-600 text-white ring-2 ring-indigo-300" : "bg-white border border-slate-400 text-slate-600 hover:bg-slate-100"}`
      },
      s.emoji,
      " ",
      s.name
    )))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "Typography"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 mb-2 cursor-pointer" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: exportConfig.useAppFont, onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, useAppFont: e.target.checked })), className: "rounded" }), "Use app font (", FONT_OPTIONS.find((f) => f.id === selectedFont)?.label || "Default", ")"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600 shrink-0" }, "Size:"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        min: 12,
        max: 24,
        value: exportConfig.fontSize,
        onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, fontSize: parseInt(e.target.value) })),
        className: "flex-1 accent-indigo-600",
        "aria-label": "Font size"
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-mono text-slate-600 w-8" }, exportConfig.fontSize, "px")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mt-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600 shrink-0" }, "Margins:"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1 flex-1" }, [
      { label: "Narrow", val: "0.5in" },
      { label: "Normal", val: "1in" },
      { label: "Wide", val: "1.5in" }
    ].map((m) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: m.label,
        onClick: () => {
          const iframe = exportPreviewRef.current;
          const doc = iframe?.contentDocument;
          if (doc) {
            let ms = doc.getElementById("allo-margin-style");
            if (!ms) {
              ms = doc.createElement("style");
              ms.id = "allo-margin-style";
              doc.head.appendChild(ms);
            }
            ms.textContent = `@media print { @page { margin: ${m.val}; } } body { padding-left: ${m.val}; padding-right: ${m.val}; }`;
          }
        },
        className: "flex-1 text-[11px] font-bold text-slate-600 py-1 bg-white border border-slate-400 rounded hover:bg-indigo-50 hover:text-indigo-700 transition-colors",
        title: `${m.label} margins (${m.val})`,
        "aria-label": `Set ${m.label} page margins`
      },
      m.label
    ))))), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 rounded-lg border border-slate-400 p-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Word Count"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-mono text-slate-600", "aria-live": "polite" }, (() => {
      const iframe = exportPreviewRef.current;
      const text = iframe?.contentDocument?.body?.textContent || "";
      return text.split(/\s+/).filter((w) => w.length > 0).length.toLocaleString();
    })(), " words")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-[11px] text-slate-600 shrink-0", htmlFor: "word-goal-input" }, "Goal:"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        id: "word-goal-input",
        min: "0",
        step: "50",
        placeholder: "e.g. 500",
        defaultValue: "",
        className: "flex-1 text-[11px] border border-slate-400 rounded px-2 py-1 bg-white",
        "aria-label": "Target word count goal",
        onChange: (e) => {
          const goal = parseInt(e.target.value);
          const iframe = exportPreviewRef.current;
          const text = iframe?.contentDocument?.body?.textContent || "";
          const count = text.split(/\s+/).filter((w) => w.length > 0).length;
          const bar = document.getElementById("word-goal-bar");
          const lbl = document.getElementById("word-goal-label");
          if (bar && goal > 0) {
            const pct = Math.min(100, Math.round(count / goal * 100));
            bar.style.width = pct + "%";
            bar.style.background = pct >= 100 ? "#16a34a" : pct >= 75 ? "#2563eb" : "#d97706";
            if (lbl) lbl.textContent = count + " / " + goal + " (" + pct + "%)";
          }
        }
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden", role: "progressbar", "aria-label": "Word count progress" }, /* @__PURE__ */ React.createElement("div", { id: "word-goal-bar", className: "h-full rounded-full transition-all duration-300", style: { width: "0%", background: "#d97706" } })), /* @__PURE__ */ React.createElement("div", { id: "word-goal-label", className: "text-[11px] text-slate-600 mt-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600 mt-1" }, "\u2328 Ctrl+1/2/3 = headings \xB7 Ctrl+K = link \xB7 Ctrl+Shift+L = list")), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2 pt-1" }, /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" }), "Word Art", /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" })), /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-amber-50 to-rose-50 rounded-lg border border-amber-200 p-2 space-y-2" }, /* @__PURE__ */ React.createElement("input", { type: "text", id: "wordart-text-input", placeholder: "Your word art text...", defaultValue: "", className: "w-full text-xs border border-amber-300 rounded px-2 py-1.5 bg-white focus:border-amber-500 outline-none", "aria-label": "Word art text" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-bold text-slate-600 uppercase mb-1" }, "Style"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-1", role: "radiogroup", "aria-label": "Word art style" }, [["goldFoil", "\u2728", "Gold"], ["neonGlow", "\u{1F4A1}", "Neon"], ["retroArcade", "\u{1F579}\uFE0F", "Retro"], ["chalkboard", "\u{1F58D}\uFE0F", "Chalk"], ["embossed", "\u{1F3DB}\uFE0F", "3D"], ["rainbow", "\u{1F308}", "Rainbow"]].map(([key, emoji, label], i) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key,
        type: "button",
        role: "radio",
        "aria-checked": i === 0,
        "data-wa-preset": key,
        className: "wordart-preset-btn text-[10px] font-bold py-1.5 px-1 rounded-md border text-slate-700 transition-all",
        style: i === 0 ? { background: "#f59e0b", color: "white", borderColor: "#f59e0b" } : { background: "white", borderColor: "#fcd34d" },
        onClick: (e) => {
          const parent = e.currentTarget.parentElement;
          if (!parent) return;
          parent.querySelectorAll(".wordart-preset-btn").forEach((b) => {
            b.setAttribute("aria-checked", "false");
            b.style.background = "white";
            b.style.color = "";
            b.style.borderColor = "#fcd34d";
          });
          e.currentTarget.setAttribute("aria-checked", "true");
          e.currentTarget.style.background = "#f59e0b";
          e.currentTarget.style.color = "white";
          e.currentTarget.style.borderColor = "#f59e0b";
        }
      },
      emoji,
      " ",
      label
    )))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-bold text-slate-600 uppercase mb-1" }, "Size"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-0.5", role: "radiogroup", "aria-label": "Word art size" }, ["S", "M", "L", "XL"].map((s) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: s,
        type: "button",
        role: "radio",
        "aria-checked": s === "L",
        "data-wa-size": s,
        className: "wordart-size-btn flex-1 text-[10px] font-bold py-1 rounded border border-slate-400 transition-all",
        style: s === "L" ? { background: "#4f46e5", color: "white", borderColor: "#4f46e5" } : { background: "white", color: "#475569" },
        onClick: (e) => {
          const parent = e.currentTarget.parentElement;
          if (!parent) return;
          parent.querySelectorAll(".wordart-size-btn").forEach((b) => {
            b.setAttribute("aria-checked", "false");
            b.style.background = "white";
            b.style.color = "#475569";
            b.style.borderColor = "#e2e8f0";
          });
          e.currentTarget.setAttribute("aria-checked", "true");
          e.currentTarget.style.background = "#4f46e5";
          e.currentTarget.style.color = "white";
          e.currentTarget.style.borderColor = "#4f46e5";
        }
      },
      s
    )))), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-bold text-slate-600 uppercase mb-1" }, "Align"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-0.5", role: "radiogroup", "aria-label": "Word art alignment" }, [["left", "\u21E4"], ["center", "\u21D4"], ["right", "\u21E5"]].map(([a, icon]) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: a,
        type: "button",
        role: "radio",
        "aria-checked": a === "center",
        "data-wa-align": a,
        className: "wordart-align-btn flex-1 text-[10px] font-bold py-1 rounded border border-slate-400 transition-all",
        style: a === "center" ? { background: "#4f46e5", color: "white", borderColor: "#4f46e5" } : { background: "white", color: "#475569" },
        onClick: (e) => {
          const parent = e.currentTarget.parentElement;
          if (!parent) return;
          parent.querySelectorAll(".wordart-align-btn").forEach((b) => {
            b.setAttribute("aria-checked", "false");
            b.style.background = "white";
            b.style.color = "#475569";
            b.style.borderColor = "#e2e8f0";
          });
          e.currentTarget.setAttribute("aria-checked", "true");
          e.currentTarget.style.background = "#4f46e5";
          e.currentTarget.style.color = "white";
          e.currentTarget.style.borderColor = "#4f46e5";
        }
      },
      icon
    ))))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => {
          const textInput = document.getElementById("wordart-text-input");
          const text = textInput && textInput.value ? textInput.value.trim() : "";
          if (!text) {
            addToast("Please enter word art text first", "info");
            return;
          }
          const presetBtn = document.querySelector('.wordart-preset-btn[aria-checked="true"]');
          const sizeBtn = document.querySelector('.wordart-size-btn[aria-checked="true"]');
          const alignBtn = document.querySelector('.wordart-align-btn[aria-checked="true"]');
          const preset = presetBtn ? presetBtn.getAttribute("data-wa-preset") : "goldFoil";
          const size = sizeBtn ? sizeBtn.getAttribute("data-wa-size") : "L";
          const align = alignBtn ? alignBtn.getAttribute("data-wa-align") : "center";
          const iframe = exportPreviewRef.current;
          const doc = iframe && iframe.contentDocument;
          if (!doc || !doc.body) {
            addToast("Preview not ready yet", "error");
            return;
          }
          let html = "";
          if (window.AlloWordArt && typeof window.AlloWordArt.render === "function") {
            html = window.AlloWordArt.render(text, preset, size, align);
          } else {
            const P = { goldFoil: "background:linear-gradient(135deg,#b45309 0%,#f59e0b 30%,#fde68a 50%,#f59e0b 70%,#92400e 100%);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:900;", neonGlow: "color:#0891b2;text-shadow:0 0 4px #06b6d4,0 0 8px #06b6d4,0 0 15px #0e7490;font-weight:900;", retroArcade: "color:#fef2f2;text-shadow:3px 3px 0 #dc2626,6px 6px 0 #1e3a8a;font-weight:900;font-family:Impact,'Arial Black',sans-serif;letter-spacing:0.03em;", chalkboard: "color:#fef3c7;text-shadow:0 0 2px #fbbf24,2px 2px 0 rgba(0,0,0,0.2);font-family:'Caveat','Comic Sans MS',cursive;font-weight:700;letter-spacing:0.05em;", embossed: "color:#475569;text-shadow:-1px -1px 0 rgba(255,255,255,0.8),1px 1px 0 rgba(0,0,0,0.35),2px 2px 4px rgba(0,0,0,0.2);font-weight:900;", rainbow: "background:linear-gradient(90deg,#dc2626,#ea580c,#ca8a04,#16a34a,#0891b2,#4f46e5,#9333ea);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:900;" };
            const sz = { S: "1.5rem", M: "2.5rem", L: "4rem", XL: "6rem" };
            const safe = String(text).replace(/[<>&]/g, (c) => c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;");
            const inner = '<span style="display:inline-block;font-size:' + (sz[size] || sz.L) + ";line-height:1.1;" + (P[preset] || P.goldFoil) + '">' + safe + "</span>";
            const wrapped = preset === "chalkboard" ? '<span style="display:inline-block;background:#14532d;padding:1rem 1.5rem;border-radius:8px;border:3px solid #78350f;">' + inner + "</span>" : inner;
            html = '<div class="alloflow-wordart" data-wa-preset="' + preset + '" data-wa-size="' + size + '" data-wa-align="' + align + '" role="heading" aria-level="2" style="margin:1.5em 0;text-align:' + align + '">' + wrapped + "</div>";
          }
          if (!html) {
            addToast("Could not render word art", "error");
            return;
          }
          iframe.contentWindow.focus();
          try {
            doc.designMode = "on";
          } catch (e) {
          }
          const sel = doc.getSelection();
          const bodyEl = doc.body;
          const anchor = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).commonAncestorContainer : null;
          const cursorInsideBody = anchor && (anchor === bodyEl || bodyEl.contains && bodyEl.contains(anchor.nodeType === 1 ? anchor : anchor.parentNode));
          if (!cursorInsideBody) {
            const main = doc.querySelector("main") || bodyEl;
            const range = doc.createRange();
            range.selectNodeContents(main);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
          let inserted = false;
          try {
            inserted = doc.execCommand("insertHTML", false, html);
          } catch (e) {
          }
          if (!inserted) {
            const wrap = doc.createElement("div");
            wrap.innerHTML = html;
            const node = wrap.firstChild;
            if (node) doc.body.appendChild(node);
          }
          if (textInput) textInput.value = "";
          addToast("\u2728 Word art inserted", "success");
        },
        className: "w-full px-3 py-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm hover:shadow-md"
      },
      "\u2728 Insert Word Art"
    )), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" }), "Content", /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Include Resources"), (() => {
      const resourceKeys = ["includeAnalysis", "includeSimplified", "includeGlossary", "includeQuiz", "includeOutline", "includeFaq", "includeSentenceFrames", "includeImage", "includeMath", "includeDbq", "includeLessonPlan", "includeUdlAdvice", "includeBrainstorm"];
      const allOn = resourceKeys.every((k) => exportConfig[k]);
      return history.some((h) => h) && /* @__PURE__ */ React.createElement("button", { onClick: () => {
        const update = {};
        resourceKeys.forEach((k) => {
          update[k] = !allOn;
        });
        setExportConfigAndRefresh((p) => ({ ...p, ...update }));
      }, className: "text-[11px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors" }, allOn ? "Deselect All" : "Select All");
    })()), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, (() => {
      const teacherOnlyDefault = /* @__PURE__ */ new Set(["includeAnalysis", "includeUdlAdvice", "includeBrainstorm"]);
      const available = [
        ["includeAnalysis", "\u{1F4CA} Source Analysis", "analysis"],
        ["includeSimplified", "\u{1F4D6} Leveled Text", "simplified"],
        ["includeGlossary", "\u{1F4DA} Glossary", "glossary"],
        ["includeQuiz", "\u2753 Quiz", "quiz"],
        ["includeOutline", "\u{1F5C2}\uFE0F Graphic Organizer", "outline"],
        ["includeFaq", "\u{1F4AC} FAQ", "faq"],
        ["includeSentenceFrames", "\u270D\uFE0F Sentence Frames", "sentence-frames"],
        ["includeImage", "\u{1F3A8} Visual Support", "image"],
        ["includeMath", "\u{1F522} Math", "math"],
        ["includeDbq", "\u{1F4DC} DBQ", "dbq"],
        ["includeLessonPlan", "\u{1F4CB} Lesson Plan", "lesson-plan"],
        ["includeUdlAdvice", "\u{1F9E9} UDL Advice", "udl-advice"],
        ["includeBrainstorm", "\u{1F4A1} Brainstorm", "brainstorm"]
      ].filter(([, , type]) => history.some((h) => h && h.type === type));
      if (available.length === 0) return /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 italic px-1 py-2" }, "No resources generated yet. Generate resources first, then choose which to include in your document.");
      return available.map(([key, label]) => {
        const isTeacherOnly = teacherOnlyDefault.has(key);
        const tooltip = isTeacherOnly ? "Always included in teacher copy. Toggle to also include in student copy." : "";
        return /* @__PURE__ */ React.createElement("label", { key, className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5", title: tooltip }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: exportConfig[key], onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, [key]: e.target.checked })), className: "rounded" }), /* @__PURE__ */ React.createElement("span", null, label, isTeacherOnly && /* @__PURE__ */ React.createElement("span", { className: "ml-1 text-[11px] text-indigo-400 font-bold" }, "(also in student copy)")));
      });
    })())), (() => {
      const skipped = getSkippedResources();
      if (skipped.length === 0) return null;
      return /* @__PURE__ */ React.createElement("div", { className: "bg-amber-50 border border-amber-200 rounded-lg p-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-amber-700 mb-1" }, "Interactive resources not included:"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-amber-600" }, skipped.join(", ")), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-amber-500 mt-1 italic" }, "These are interactive tools that can't be rendered as static documents."));
    })(), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" }), "Export", /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "Options"), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: exportConfig.includeTeacherKey, onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, includeTeacherKey: e.target.checked })), className: "rounded" }), "\u{1F4CE} Teacher Answer Key"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: exportConfig.includeStudentResponses, onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, includeStudentResponses: e.target.checked })), className: "rounded" }), "\u{1F4DD} Student Responses"))), /* @__PURE__ */ React.createElement("div", { className: exportPreviewMode !== "html" ? "opacity-50" : "" }, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "\u{1F50A} Audio"), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement("label", { className: `flex items-center gap-2 text-xs text-slate-700 rounded px-1 py-0.5 ${exportPreviewMode === "html" ? "cursor-pointer hover:bg-white" : "cursor-not-allowed"}` }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: exportConfig.includeAudioSource, onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, includeAudioSource: e.target.checked })), className: "rounded", disabled: exportPreviewMode !== "html" }), "Read-aloud: Source text"), /* @__PURE__ */ React.createElement("label", { className: `flex items-center gap-2 text-xs text-slate-700 rounded px-1 py-0.5 ${exportPreviewMode === "html" ? "cursor-pointer hover:bg-white" : "cursor-not-allowed"}` }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: exportConfig.includeAudioLeveled, onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, includeAudioLeveled: e.target.checked })), className: "rounded", disabled: exportPreviewMode !== "html" }), "Read-aloud: Leveled text"), exportPreviewMode !== "html" ? /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-amber-500 font-medium px-1" }, "Switch to HTML format to enable audio embedding") : /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 italic px-1" }, "Audio embeds as inline players in HTML exports."))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "\u2728 AI Style Studio"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1 mb-1.5" }, [
      { label: "\u{1F3A8} Auto-Beautify", prompt: "Make this document visually stunning and professional with a modern color scheme, elegant typography, subtle gradients, well-spaced sections with rounded cards, and a cohesive design system. Use a sophisticated palette." },
      { label: "\u{1F3EB} Academic", prompt: "Professional academic style with serif headings (Georgia or similar), clean layout, navy/gold color scheme, formal table styling, proper margins, and a scholarly appearance suitable for university submissions." },
      { label: "\u{1F308} Elementary", prompt: "Bright, playful, and colorful style for elementary students. Use rounded corners, fun colors (teal, coral, purple), larger friendly fonts, emoji-friendly, card-based layout with soft shadows." },
      { label: "\u{1F319} Dark Mode", prompt: "Elegant dark mode with dark slate/charcoal background, soft white text, indigo/purple accents, subtle borders, and beautiful contrast. Easy on the eyes for screen reading." },
      { label: "\u{1F4F0} Magazine", prompt: "Clean editorial magazine layout with large hero headings, pull quotes with colored left borders, two-column text sections where appropriate, serif body text, and professional photo-story feel." },
      { label: "\u{1F9CA} Minimalist", prompt: "Ultra-minimal Scandinavian design. Lots of whitespace, thin sans-serif font, muted grays and one accent color, hairline borders, understated elegance." }
    ].map((preset) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: preset.label,
        onClick: () => {
          setExportStylePrompt(preset.prompt);
          setTimeout(() => generateCustomExportStyle(), 50);
        },
        disabled: isGeneratingStyle,
        className: "px-2 py-1 bg-slate-50 border border-slate-400 rounded-md text-[11px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-600 hover:text-indigo-700 disabled:opacity-40 transition-colors"
      },
      preset.label
    ))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: exportStylePrompt,
        onChange: (e) => setExportStylePrompt(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "Enter" && exportStylePrompt.trim()) generateCustomExportStyle();
        },
        placeholder: "Describe a style or click a preset above...",
        className: "flex-1 text-[11px] p-1.5 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300",
        "aria-label": "Custom export style description"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: generateCustomExportStyle,
        disabled: !exportStylePrompt.trim() || isGeneratingStyle,
        className: "px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold hover:bg-indigo-200 disabled:opacity-40"
      },
      isGeneratingStyle ? "..." : "\u2728"
    )), customExportCSS && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mt-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-green-600 font-medium" }, "\u2713 Custom style active"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      setCustomExportCSS("");
      setTimeout(() => {
        if (typeof updateExportPreview === "function") updateExportPreview();
      }, 50);
    }, className: "text-[11px] text-slate-600 hover:text-red-500 font-bold" }, "Reset"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "\u267F Accessibility Audit"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: async () => {
          setExportAuditLoading(true);
          setExportAuditResult(null);
          try {
            const iframe = exportPreviewRef.current;
            const doc = iframe?.contentDocument;
            const html = doc ? doc.documentElement.outerHTML : getExportPreviewHTML();
            const [aiResult, axeResult] = await Promise.all([
              auditOutputAccessibility(html),
              runAxeAudit(html).catch(() => null)
            ]);
            const combined = aiResult || { score: 0, summary: "", issues: [], passes: [] };
            if (axeResult) {
              combined.axeViolations = axeResult.totalViolations;
              combined.axePasses = axeResult.totalPasses;
              combined.axeDetails = axeResult.critical.concat(axeResult.serious).concat(axeResult.moderate);
              combined.summary = (combined.summary || "") + ` | axe-core: ${axeResult.totalViolations} violations, ${axeResult.totalPasses} passed`;
            }
            setExportAuditResult(combined);
          } catch (e) {
            setExportAuditResult({ score: -1, summary: "Audit failed", issues: [], passes: [] });
          }
          setExportAuditLoading(false);
        },
        disabled: exportAuditLoading,
        className: "w-full px-3 py-2 bg-violet-100 text-violet-700 rounded-lg text-xs font-bold hover:bg-violet-200 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
      },
      exportAuditLoading ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 12, className: "animate-spin" }), " Auditing...") : /* @__PURE__ */ React.createElement(React.Fragment, null, "\u267F Run WCAG Audit")
    ), exportAuditResult && exportAuditResult.score >= 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-2 space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: `text-center p-3 rounded-xl ${exportAuditResult.score >= 80 ? "bg-green-50 border border-green-200" : exportAuditResult.score >= 60 ? "bg-amber-50 border border-amber-200" : "bg-red-50 border border-red-200"}` }, /* @__PURE__ */ React.createElement("div", { className: `text-2xl font-black ${exportAuditResult.score >= 80 ? "text-green-700" : exportAuditResult.score >= 60 ? "text-amber-700" : "text-red-700"}` }, exportAuditResult.score, "/100"), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "WCAG 2.1 AA Score")), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600" }, exportAuditResult.summary), exportAuditResult.issues?.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-red-600 uppercase mb-1" }, "Issues (", exportAuditResult.issues.length, ")"), exportAuditResult.issues.slice(0, 5).map((issue, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "text-[11px] text-slate-600 mb-1 flex items-start gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-red-400 shrink-0" }, "\u25CF"), /* @__PURE__ */ React.createElement("span", null, typeof issue === "string" ? issue : issue.issue, issue.wcag ? ` (${issue.wcag})` : ""))), exportAuditResult.issues.length > 5 && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600 italic" }, "+", exportAuditResult.issues.length - 5, " more")), exportAuditResult.passes?.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-green-600 uppercase mb-1" }, "Passes (", exportAuditResult.passes.length, ")"), exportAuditResult.passes.slice(0, 3).map((pass, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "text-[11px] text-green-700 mb-0.5 flex items-start gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-green-500" }, "\u2713"), " ", pass))), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-indigo-500 italic" }, "Use the A11y Inspect toggle above to see and fix issues visually, then re-audit.")))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex flex-col min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-bold text-slate-700" }, "Live Preview"), /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono" }, exportPreviewMode === "worksheet" ? "Worksheet" : exportPreviewMode === "html" ? "HTML" : exportPreviewMode === "slides" ? "Slides" : "PDF"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-indigo-500 font-medium" }, "Click text to edit directly")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const iframe = exportPreviewRef.current;
          const doc = iframe?.contentDocument;
          if (!doc) return;
          const img = doc.createElement("img");
          img.src = ev.target.result;
          img.style.cssText = "max-width:100%;height:auto;border-radius:8px;margin:12px 0;cursor:move;";
          img.alt = "User-inserted image";
          const sel = doc.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.collapse(false);
            range.insertNode(img);
          } else {
            const main = doc.querySelector("main") || doc.body;
            main.appendChild(img);
          }
          addToast && addToast("Image inserted! Drag to reposition.");
        };
        reader.readAsDataURL(file);
      };
      input.click();
    }, className: "text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100", title: "Insert image into document" }, /* @__PURE__ */ React.createElement(ImageIcon, { size: 12 }), " Add Image"), /* @__PURE__ */ React.createElement("div", { className: "w-px h-5 bg-slate-200" }), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: toggleA11yInspect,
        className: `text-xs font-bold flex items-center gap-1 px-2 py-1 rounded transition-all ${a11yInspectMode ? "bg-violet-100 text-violet-700 ring-1 ring-violet-300" : "text-slate-600 hover:text-violet-600 hover:bg-slate-100"}`,
        title: "Toggle accessibility inspector \u2014 shows heading hierarchy, alt text, ARIA labels, table structure, and input labels. Click any badge to edit."
      },
      "\u267F A11y Inspect"
    ), pdfFixResult && pdfFixResult.sourceText && pdfFixResult.finalText && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: async () => {
          try {
            if (typeof window !== "undefined") {
              window._diffDiagnostic = window._diffDiagnostic || [];
              window._diffDiagnostic.push({ ts: (/* @__PURE__ */ new Date()).toISOString(), msg: "button clicked", source: "click", diffLibReady, hasWindowDiff: !!window.Diff, hasResult: !!pdfFixResult, srcLen: pdfFixResult && pdfFixResult.sourceText ? pdfFixResult.sourceText.length : null, finLen: pdfFixResult && pdfFixResult.finalText ? pdfFixResult.finalText.length : null });
              console.warn("[Diff] button clicked \u2014 diffLibReady=" + diffLibReady + ", window.Diff=" + !!window.Diff);
            }
          } catch (_) {
          }
          setDiffViewOpen(true);
          const ok = await _ensureDiffLib();
          if (!ok) {
            console.warn("[Diff] _ensureDiffLib returned false \u2014 script load failed");
            if (typeof addToast === "function") addToast("Diff engine failed to load (network blocked?). Check your connection and try again.", "error");
          }
        },
        className: "text-xs font-bold flex items-center gap-1 px-2 py-1 rounded text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-all",
        title: "Open the word-level diff view comparing the source PDF text to the remediated HTML \u2014 see every insertion, deletion, and paraphrase with click-to-reject.",
        "aria-label": "Open word-level diff view between source PDF and remediated HTML"
      },
      "\u{1F4DD} Diff"
    ), /* @__PURE__ */ React.createElement("div", { className: "w-px h-5 bg-slate-200" }), exportAuditResult && exportAuditResult.score >= 0 && /* @__PURE__ */ React.createElement("span", { className: `text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 ${exportAuditResult.score >= 90 ? "bg-green-100 text-green-700 ring-1 ring-green-300" : exportAuditResult.score >= 70 ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300" : "bg-red-100 text-red-700 ring-1 ring-red-300"}`, title: exportAuditResult.summary || "" }, "\u267F", " ", exportAuditResult.score, "/100"), /* @__PURE__ */ React.createElement("button", { onClick: updateExportPreview, className: "text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 12 }), " Regenerate"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: executeExportFromPreview,
        disabled: exportPreviewMode === "slides" && !pptxLoaded,
        className: "bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed",
        title: exportPreviewMode === "slides" && !pptxLoaded ? "Slides library still loading..." : ""
      },
      /* @__PURE__ */ React.createElement(Download, { size: 14 }),
      " ",
      exportPreviewMode === "worksheet" ? "Print Worksheet" : exportPreviewMode === "html" ? "Download HTML" : exportPreviewMode === "slides" ? pptxLoaded ? "Export Slides" : "Loading..." : "Download PDF"
    ), /* @__PURE__ */ React.createElement("details", { className: "relative" }, /* @__PURE__ */ React.createElement("summary", { className: "bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-2.5 py-2 rounded-lg cursor-pointer flex items-center gap-1 transition-colors list-none" }, "\u267F Alt Formats ", /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600" }, "\u25BE")), /* @__PURE__ */ React.createElement("div", { className: "absolute right-0 top-full mt-1 bg-white border border-slate-400 rounded-xl shadow-xl p-2 z-50 w-48 space-y-1" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
      const doc = exportPreviewRef.current?.contentDocument;
      if (!doc) return;
      const html = doc.documentElement.outerHTML;
      const text = html.replace(/<[^>]*>/g, "\n").replace(/&[^;]+;/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      const blob = new Blob([text], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "document.txt";
      a.click();
      URL.revokeObjectURL(a.href);
      addToast("Plain text downloaded", "success");
    }, className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 rounded-lg" }, "\u{1F4C4} Plain Text (.txt)"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      const doc = exportPreviewRef.current?.contentDocument;
      if (!doc) return;
      const html = doc.documentElement.outerHTML;
      let md = html.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n").replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n").replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n").replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n").replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n").replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**").replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*").replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\n{3,}/g, "\n\n").trim();
      const blob = new Blob([md], { type: "text/markdown" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "document.md";
      a.click();
      URL.revokeObjectURL(a.href);
      addToast("Markdown downloaded", "success");
    }, className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 rounded-lg" }, "\u{1F4DD} Markdown (.md)"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      const doc = exportPreviewRef.current?.contentDocument;
      if (!doc || !window.JSZip) {
        addToast("ePub library loading...", "info");
        return;
      }
      const html = doc.documentElement.outerHTML;
      const title = "AlloFlow Document";
      const xmlTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;");
      const zip = new window.JSZip();
      zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
      zip.file("META-INF/container.xml", '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
      zip.file("OEBPS/content.opf", `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">alloflow-${Date.now()}</dc:identifier><dc:title>${xmlTitle}</dc:title><dc:language>en</dc:language></metadata><manifest><item id="content" href="content.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="content"/></spine></package>`);
      let xhtml = html.replace(/<br>/g, "<br/>").replace(/<hr>/g, "<hr/>").replace(/<img([^>]*[^/])>/g, "<img$1/>").replace(/&nbsp;/g, "&#160;");
      if (!xhtml.includes("xmlns")) xhtml = xhtml.replace("<html", '<html xmlns="http://www.w3.org/1999/xhtml"');
      zip.file("OEBPS/content.xhtml", xhtml);
      zip.file("OEBPS/nav.xhtml", `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Navigation</title></head><body><nav epub:type="toc"><h1>Contents</h1><ol><li><a href="content.xhtml">Document</a></li></ol></nav></body></html>`);
      zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" }).then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = title + ".epub";
        a.click();
        URL.revokeObjectURL(a.href);
        addToast("ePub downloaded", "success");
      });
    }, className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 rounded-lg" }, "\u{1F4DA} ePub (e-readers)"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      const doc = exportPreviewRef.current?.contentDocument;
      if (!doc) return;
      const text = doc.body.innerText || doc.body.textContent || "";
      const brailleMap = { "a": "1", "b": "12", "c": "14", "d": "145", "e": "15", "f": "124", "g": "1245", "h": "125", "i": "24", "j": "245", "k": "13", "l": "123", "m": "134", "n": "1345", "o": "135", "p": "1234", "q": "12345", "r": "1235", "s": "234", "t": "2345", "u": "136", "v": "1236", "w": "2456", "x": "1346", "y": "13456", "z": "1356", " ": " ", "1": "1", "2": "12", "3": "14", "4": "145", "5": "15", "6": "124", "7": "1245", "8": "125", "9": "24", "0": "245", ".": "256", ",": "2", "?": "236", "!": "235", ":": "25", ";": "23", "-": "36", "'": "3" };
      const dotToAscii = (dots) => String.fromCharCode(10240 + dots.split("").reduce((s, d) => s + (1 << parseInt(d) - 1), 0));
      let brf = "";
      text.split("\n").forEach((line) => {
        let bl = "";
        const lower = line.toLowerCase();
        for (let i = 0; i < lower.length; i++) {
          if (line[i] !== lower[i]) bl += dotToAscii("6");
          if (/[0-9]/.test(lower[i]) && (i === 0 || !/[0-9]/.test(lower[i - 1]))) bl += dotToAscii("3456");
          bl += brailleMap[lower[i]] ? dotToAscii(brailleMap[lower[i]]) : lower[i];
        }
        brf += bl + "\n";
      });
      const blob = new Blob([brf], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "document.brf";
      a.click();
      URL.revokeObjectURL(a.href);
      addToast("Electronic Braille (BRF) downloaded", "success");
    }, className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 rounded-lg" }, "\u283F Electronic Braille (.brf)"))))), /* @__PURE__ */ React.createElement("div", { className: "px-2 py-1 bg-white border-b border-slate-200 flex items-center gap-0.5 flex-wrap shrink-0", role: "toolbar", "aria-label": "Text formatting" }, [
      { cmd: "bold", icon: "B", label: "Bold", style: "font-bold" },
      { cmd: "italic", icon: "I", label: "Italic", style: "italic" },
      { cmd: "underline", icon: "U", label: "Underline", style: "underline" }
    ].map((btn) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: btn.cmd,
        onClick: () => {
          const doc = exportPreviewRef.current?.contentDocument;
          if (doc) doc.execCommand(btn.cmd, false, null);
        },
        className: `w-7 h-7 rounded text-xs ${btn.style} text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 transition-colors border border-transparent hover:border-indigo-600`,
        "aria-label": btn.label,
        title: btn.label
      },
      btn.icon
    )), /* @__PURE__ */ React.createElement("span", { className: "w-px h-5 bg-slate-200 mx-0.5", "aria-hidden": "true" }), [
      { cmd: "formatBlock", val: "<h2>", icon: "H2", label: "Heading 2" },
      { cmd: "formatBlock", val: "<h3>", icon: "H3", label: "Heading 3" },
      { cmd: "formatBlock", val: "<p>", icon: "\xB6", label: "Paragraph" }
    ].map((btn) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: btn.icon,
        onClick: () => {
          const doc = exportPreviewRef.current?.contentDocument;
          if (doc) doc.execCommand(btn.cmd, false, btn.val);
        },
        className: "px-1.5 h-7 rounded text-[11px] font-bold text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors border border-transparent hover:border-indigo-600",
        "aria-label": btn.label,
        title: btn.label
      },
      btn.icon
    )), /* @__PURE__ */ React.createElement("span", { className: "w-px h-5 bg-slate-200 mx-0.5", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          const doc = exportPreviewRef.current?.contentDocument;
          if (doc) doc.execCommand("insertUnorderedList", false, null);
        },
        className: "w-7 h-7 rounded text-xs text-slate-600 hover:bg-indigo-100 transition-colors",
        "aria-label": "Bullet list",
        title: "Bullet list"
      },
      "\u2022"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          const doc = exportPreviewRef.current?.contentDocument;
          if (doc) doc.execCommand("insertOrderedList", false, null);
        },
        className: "w-7 h-7 rounded text-[11px] font-bold text-slate-600 hover:bg-indigo-100 transition-colors",
        "aria-label": "Numbered list",
        title: "Numbered list"
      },
      "1."
    ), /* @__PURE__ */ React.createElement("span", { className: "w-px h-5 bg-slate-200 mx-0.5", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          const doc = exportPreviewRef.current?.contentDocument;
          if (!doc) return;
          const url = prompt("Link URL:");
          if (url) doc.execCommand("createLink", false, url);
        },
        className: "w-7 h-7 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors",
        "aria-label": "Insert link",
        title: "Insert link"
      },
      "\u{1F517}"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          const doc = exportPreviewRef.current?.contentDocument;
          if (doc) doc.execCommand("removeFormat", false, null);
        },
        className: "w-7 h-7 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors",
        "aria-label": "Clear formatting",
        title: "Clear formatting"
      },
      "\u2715"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          const doc = exportPreviewRef.current?.contentDocument;
          if (doc) doc.execCommand("undo", false, null);
        },
        className: "w-7 h-7 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors",
        "aria-label": "Undo",
        title: "Undo"
      },
      "\u21A9"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          const doc = exportPreviewRef.current?.contentDocument;
          if (doc) doc.execCommand("redo", false, null);
        },
        className: "w-7 h-7 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors",
        "aria-label": "Redo",
        title: "Redo"
      },
      "\u21AA"
    ), /* @__PURE__ */ React.createElement(
      "select",
      {
        onChange: (e) => {
          const doc = exportPreviewRef.current?.contentDocument;
          if (doc && e.target.value) doc.execCommand("foreColor", false, e.target.value);
          e.target.value = "";
        },
        className: "h-7 text-[11px] border border-slate-400 rounded px-1 text-slate-600 ml-0.5",
        "aria-label": "Text color",
        defaultValue: ""
      },
      /* @__PURE__ */ React.createElement("option", { value: "", disabled: true }, "Color"),
      /* @__PURE__ */ React.createElement("option", { value: "#000000" }, "\u2B1B Black"),
      /* @__PURE__ */ React.createElement("option", { value: "#1e3a5f" }, "\u{1F7E6} Navy"),
      /* @__PURE__ */ React.createElement("option", { value: "#991b1b" }, "\u{1F7E5} Red"),
      /* @__PURE__ */ React.createElement("option", { value: "#166534" }, "\u{1F7E9} Green"),
      /* @__PURE__ */ React.createElement("option", { value: "#7c3aed" }, "\u{1F7EA} Purple")
    )), /* @__PURE__ */ React.createElement("details", { open: true, className: "bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-600 group" }, /* @__PURE__ */ React.createElement("summary", { className: "cursor-pointer px-2 py-1.5 flex items-center gap-2 list-none select-none hover:bg-slate-800/50" }, /* @__PURE__ */ React.createElement("span", { className: "inline-block transition-transform group-open:rotate-90 text-slate-400 text-[10px]" }, "\u25B8"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-purple-400 font-bold shrink-0" }, isAgentRunning ? "\u{1F916} Agent" : "\u2328\uFE0F Expert"), isAgentRunning && /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-amber-300 animate-pulse" }, "Running..."), /* @__PURE__ */ React.createElement("span", { className: "ml-auto text-[10px] text-slate-500" }, agentActivityLog.length > 0 ? `${agentActivityLog.length} event${agentActivityLog.length === 1 ? "" : "s"}` : "idle")), /* @__PURE__ */ React.createElement("div", { className: "px-2 pb-1.5" }, /* @__PURE__ */ React.createElement("form", { className: "flex-1 flex gap-1", onSubmit: async (e) => {
      e.preventDefault();
      if (!expertCommandInput.trim() || isAgentRunning) return;
      const cmd = expertCommandInput.trim();
      setExpertCommandInput("");
      setIsAgentRunning(true);
      console.info("[ExpertWorkbench] start command=" + JSON.stringify(cmd) + " context=export-preview");
      addToast(`\u{1F916} Workbench running: ${cmd}`, "info");
      setAgentActivityLog((prev) => [...prev, { text: "\u25B6 " + cmd, type: "command", time: (/* @__PURE__ */ new Date()).toLocaleTimeString() }]);
      try {
        const iframe = exportPreviewRef.current;
        const doc = iframe?.contentDocument;
        const currentHtml = doc ? "<!DOCTYPE html>\n" + doc.documentElement.outerHTML : getExportPreviewHTML();
        const result = await processExpertCommand(cmd, currentHtml, {
          onProgress: (msg) => {
          },
          onActivity: (entry) => {
            console.info("[ExpertWorkbench] activity type=" + entry.type + " text=" + entry.text);
            setAgentActivityLog((prev) => [...prev, entry]);
          }
        });
        if (result && result.html && result.html !== currentHtml && doc) {
          doc.open();
          doc.write(result.html);
          doc.close();
          doc.designMode = "on";
          if (result.score !== void 0) {
            setAgentActivityLog((prev) => [...prev, { text: "\u{1F4CA} Score: " + result.score + "/100", type: "score", time: (/* @__PURE__ */ new Date()).toLocaleTimeString() }]);
          }
          console.info("[ExpertWorkbench] complete command=" + JSON.stringify(cmd) + " score=" + (result.score !== void 0 ? result.score : "n/a"));
          addToast("\u2705 Command applied!", "success");
        } else {
          console.warn("[ExpertWorkbench] noop command=" + JSON.stringify(cmd) + " \u2014 no HTML changes");
          setAgentActivityLog((prev) => [...prev, { text: "\u2139 No changes applied", type: "info", time: (/* @__PURE__ */ new Date()).toLocaleTimeString() }]);
          addToast("\u2139\uFE0F No changes applied", "info");
        }
      } catch (err) {
        console.error("[ExpertWorkbench] error command=" + JSON.stringify(cmd), err);
        setAgentActivityLog((prev) => [...prev, { text: "\u274C " + (err && (err.message || err)), type: "error", time: (/* @__PURE__ */ new Date()).toLocaleTimeString() }]);
        addToast("\u274C Workbench failed: " + (err && (err.message || err) || "unknown error"), "error");
      }
      setIsAgentRunning(false);
    } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: expertCommandInput,
        onChange: (e) => setExpertCommandInput(e.target.value),
        placeholder: isAgentRunning ? "Agent working..." : "Type command: audit, auto, or natural language...",
        disabled: isAgentRunning,
        "aria-label": "Expert remediation command",
        className: "flex-1 px-2 py-1 bg-slate-700 text-white text-[11px] rounded border border-slate-600 placeholder-slate-500 focus:ring-1 focus:ring-purple-400 focus:outline-none disabled:opacity-50"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        disabled: isAgentRunning || !expertCommandInput.trim(),
        className: "px-2 py-1 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-30 transition-colors",
        "aria-label": "Execute command"
      },
      isAgentRunning ? "\u23F3" : "\u25B6"
    )))), agentActivityLog.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "bg-slate-900 border-b border-slate-700" }, /* @__PURE__ */ React.createElement("div", { className: (agentLogFullView ? "max-h-64" : "max-h-24") + " overflow-y-auto px-2 py-1 space-y-0.5 text-[11px] font-mono", "aria-live": "polite", "aria-label": "Agent activity log" }, (agentLogFullView ? agentActivityLog : agentActivityLog.slice(-8)).map((entry, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flex items-start gap-1 " + (entry.type === "error" ? "text-red-400" : entry.type === "score" ? "text-cyan-300" : entry.type === "success" || entry.type === "complete" ? "text-green-400" : entry.type === "tool" ? "text-amber-300" : entry.type === "command" ? "text-purple-300" : "text-slate-400") }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-600 shrink-0" }, entry.time), /* @__PURE__ */ React.createElement("span", null, entry.text))), isAgentRunning && /* @__PURE__ */ React.createElement("div", { className: "text-purple-400 animate-pulse" }, "\u23F3 Processing...")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 px-2 py-1 border-t border-slate-800" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setAgentLogFullView((v) => !v), className: "text-[10px] text-purple-300 hover:text-purple-200 underline" }, agentLogFullView ? "Show recent only" : `Show full log (${agentActivityLog.length})`), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
      setAgentActivityLog([]);
      console.info("[ExpertWorkbench] log cleared");
    }, className: "text-[10px] text-slate-500 hover:text-slate-300 underline ml-auto" }, "Clear"))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-hidden bg-slate-100 p-4" }, /* @__PURE__ */ React.createElement(
      "iframe",
      {
        ref: exportPreviewRef,
        title: "Export Preview \u2014 click any text to edit",
        className: "w-full h-full bg-white rounded-lg shadow-inner border border-slate-400",
        sandbox: "allow-same-origin allow-scripts allow-forms",
        onLoad: () => {
          setTimeout(() => {
            updateExportPreview();
            setTimeout(() => {
              const iframe = exportPreviewRef.current;
              const doc = iframe?.contentDocument;
              if (doc) {
                doc.designMode = "on";
                doc.body.spellcheck = true;
                const editStyle = doc.createElement("style");
                editStyle.textContent = `
                              [contenteditable]:focus, *:focus { outline: 2px solid #6366f1 !important; outline-offset: 2px; border-radius: 4px; }
                              img { cursor: move; transition: outline 0.2s; }
                              img:hover { outline: 2px dashed #6366f1; }
                              ::selection { background: #c7d2fe; }
                            `;
                doc.head.appendChild(editStyle);
                doc.addEventListener("keydown", function(e) {
                  if (e.ctrlKey || e.metaKey) {
                    if (e.key === "1") {
                      e.preventDefault();
                      doc.execCommand("formatBlock", false, "<h1>");
                    } else if (e.key === "2") {
                      e.preventDefault();
                      doc.execCommand("formatBlock", false, "<h2>");
                    } else if (e.key === "3") {
                      e.preventDefault();
                      doc.execCommand("formatBlock", false, "<h3>");
                    } else if (e.key === "0") {
                      e.preventDefault();
                      doc.execCommand("formatBlock", false, "<p>");
                    } else if (e.key === "k" || e.key === "K") {
                      e.preventDefault();
                      var url = prompt("Enter link URL:");
                      if (url) doc.execCommand("createLink", false, url);
                    } else if (e.shiftKey && (e.key === "l" || e.key === "L")) {
                      e.preventDefault();
                      doc.execCommand("insertUnorderedList", false, null);
                    } else if (e.shiftKey && (e.key === "o" || e.key === "O")) {
                      e.preventDefault();
                      doc.execCommand("insertOrderedList", false, null);
                    }
                  }
                });
              }
            }, 300);
          }, 100);
        }
      }
    ))))
  );
}
window.AlloModules = window.AlloModules || {};
window.AlloModules.ExportPreviewView = (typeof ExportPreviewView !== 'undefined') ? ExportPreviewView : null;
window.AlloModules.ViewExportPreviewModule = true;
console.log('[CDN] ViewExportPreviewModule loaded — ExportPreviewView registered');
})();
