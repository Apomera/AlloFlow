(function() {
'use strict';
if (window.AlloModules && window.AlloModules.ViewRenderersModule) { console.log('[CDN] ViewRenderersModule already loaded, skipping'); return; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var Fragment = React.Fragment;
// _lazyIcon: defers icon resolution to call-time so we don't depend on
// window.AlloIcons being populated at module load.
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
var AlertCircle = _lazyIcon('AlertCircle');
var ArrowDown = _lazyIcon('ArrowDown');
var ArrowRight = _lazyIcon('ArrowRight');
var CheckCircle2 = _lazyIcon('CheckCircle2');
var Gamepad2 = _lazyIcon('Gamepad2');
var Layout = _lazyIcon('Layout');
var List = _lazyIcon('List');
var ListOrdered = _lazyIcon('ListOrdered');
var Lock = _lazyIcon('Lock');
var Plus = _lazyIcon('Plus');
var RefreshCw = _lazyIcon('RefreshCw');
var Sparkles = _lazyIcon('Sparkles');
var Unlock = _lazyIcon('Unlock');
var Unplug = _lazyIcon('Unplug');
const renderFormattedText = (text, enableGlossary = true, isDarkBg = false, deps) => {
  const { sanitizeTruncatedCitations, warnLog, SimpleBarChart, SimpleDonutChart, formatInlineText, normalizeResourceLinks } = deps;
  try {
    if (window._DEBUG_VIEW_RENDERERS) console.log("[ViewRenderers] renderFormattedText fired");
  } catch (_) {
  }
  if (!text) return null;
  if (typeof text !== "string") {
    return /* @__PURE__ */ React.createElement("div", { className: "text-red-500 text-xs" }, "Error: Invalid text format");
  }
  text = sanitizeTruncatedCitations(text);
  const processedText = normalizeResourceLinks(text);
  const isSingleParagraph = !processedText.includes("\n\n") && processedText.length < 500 && !processedText.includes("|");
  let normalizedText = processedText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  normalizedText = normalizedText.replace(/([^\n])[^\S\n]*(#{2,6}\s)/g, "$1\n\n$2");
  normalizedText = normalizedText.replace(/\n(#{2,6}\s)/g, "\n\n$1");
  normalizedText = normalizedText.replace(/([^\n])\s+(#\s+[A-Z])/g, "$1\n\n$2");
  normalizedText = normalizedText.replace(/^(#{1,6}\s[^\n]+)\n(?!\n|#{1,6}\s|$)/gm, "$1\n\n");
  normalizedText = normalizedText.replace(/\n{3,}/g, "\n\n");
  normalizedText = normalizedText.replace(/^Title:\s*(.+)/m, "# $1");
  const lines = normalizedText.split("\n");
  const elements = [];
  let tableBuffer = [];
  let inTable = false;
  let minHeaderLevel = 6;
  let hasHeaders = false;
  lines.forEach((line) => {
    const match = line.match(/^(#+)\s/);
    if (match) {
      hasHeaders = true;
      minHeaderLevel = Math.min(minHeaderLevel, match[1].length);
    }
    const htmlMatch = line.match(/^<h([1-6])/i);
    if (htmlMatch) {
      hasHeaders = true;
      minHeaderLevel = Math.min(minHeaderLevel, parseInt(htmlMatch[1]));
    }
  });
  const headerOffset = hasHeaders ? 2 - minHeaderLevel : 0;
  const getHeaderClasses = (level) => {
    switch (level) {
      case 2:
        return "text-2xl font-black text-indigo-900 mt-6 mb-3 border-b border-indigo-100 pb-2";
      case 3:
        return "text-xl font-bold text-indigo-900 mt-5 mb-2";
      case 4:
        return "text-lg font-bold text-indigo-800 mt-4 mb-1";
      case 5:
        return "text-base font-bold text-indigo-800 mt-3 mb-1";
      default:
        return "text-sm font-bold text-indigo-800 mt-3 mb-1 uppercase tracking-wide";
    }
  };
  const flushTable = (keyPrefix) => {
    if (tableBuffer.length === 0) return null;
    const headers = [];
    const rows = [];
    tableBuffer.forEach((line) => {
      const content = line.trim();
      if (!content) return;
      const cells = content.split("|").map((c) => c.trim());
      if (cells.length > 0 && cells[0] === "") cells.shift();
      if (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
      if (cells.every((c) => c.match(/^[-:\s]+$/))) return;
      if (headers.length === 0) {
        headers.push(...cells);
      } else {
        rows.push(cells);
      }
    });
    return /* @__PURE__ */ React.createElement("div", { key: `${keyPrefix}-table`, className: "overflow-x-auto my-4 border rounded-lg border-slate-200 shadow-sm" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-sm text-left text-slate-600" }, /* @__PURE__ */ React.createElement("thead", { className: "text-xs text-slate-700 uppercase bg-slate-50" }, /* @__PURE__ */ React.createElement("tr", null, headers.map((h, i) => /* @__PURE__ */ React.createElement("th", { key: i, className: "px-6 py-3 border-b border-slate-200 font-bold" }, h)))), /* @__PURE__ */ React.createElement("tbody", null, rows.map((row, rI) => /* @__PURE__ */ React.createElement("tr", { key: rI, className: "bg-white border-b border-slate-100 hover:bg-slate-50 last:border-none" }, row.map((cell, cI) => /* @__PURE__ */ React.createElement("td", { key: cI, className: "px-6 py-4 align-top" }, formatInlineText(cell, enableGlossary, isDarkBg))))))));
  };
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const chartMatch = line.trim().match(/^\[\[CHART:\s*({.*})\]\]$/);
    if (chartMatch) {
      try {
        const chartData = JSON.parse(chartMatch[1]);
        if (chartData.type === "bar") {
          elements.push(
            /* @__PURE__ */ React.createElement("div", { key: `chart-${lineIdx}`, className: "my-6 p-4 border border-slate-400 rounded-xl bg-white shadow-sm max-w-md mx-auto" }, chartData.title && /* @__PURE__ */ React.createElement("h4", { className: "text-center font-bold text-slate-700 mb-4 text-sm uppercase tracking-wider" }, chartData.title), /* @__PURE__ */ React.createElement(SimpleBarChart, { data: chartData.data, color: "indigo" }))
          );
        } else if (chartData.type === "donut") {
          elements.push(
            /* @__PURE__ */ React.createElement("div", { key: `chart-${lineIdx}`, className: "my-6 p-4 border border-slate-400 rounded-xl bg-white shadow-sm max-w-xs mx-auto flex flex-col items-center" }, chartData.title && /* @__PURE__ */ React.createElement("h4", { className: "text-center font-bold text-slate-700 mb-4 text-sm uppercase tracking-wider" }, chartData.title), /* @__PURE__ */ React.createElement(SimpleDonutChart, { percentage: chartData.percentage, label: chartData.label, color: "indigo" }))
          );
        }
        continue;
      } catch (e) {
        warnLog("Chart parse error", e);
      }
    }
    if (line.trim().startsWith("|")) {
      inTable = true;
      tableBuffer.push(line);
      continue;
    } else if (inTable) {
      elements.push(flushTable(lineIdx));
      tableBuffer = [];
      inTable = false;
    }
    if (line.trim() === "") {
      elements.push(/* @__PURE__ */ React.createElement("div", { key: lineIdx, className: "h-2" }));
      continue;
    }
    const trimmedLine = line.trim();
    const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.*)/);
    if (headerMatch) {
      const originalLevel = headerMatch[1].length;
      const content = headerMatch[2];
      const newLevel = Math.min(6, Math.max(2, originalLevel + headerOffset));
      const Tag = `h${newLevel}`;
      elements.push(
        /* @__PURE__ */ React.createElement(Tag, { key: lineIdx, className: getHeaderClasses(newLevel) }, formatInlineText(content, enableGlossary, isDarkBg))
      );
      continue;
    }
    const htmlHeaderMatch = line.match(/^<h([1-6]).*?>(.*?)<\/h\1>/i);
    if (htmlHeaderMatch) {
      const originalLevel = parseInt(htmlHeaderMatch[1]);
      const content = htmlHeaderMatch[2];
      const newLevel = Math.min(6, Math.max(2, originalLevel + headerOffset));
      const Tag = `h${newLevel}`;
      elements.push(
        /* @__PURE__ */ React.createElement(Tag, { key: lineIdx, className: getHeaderClasses(newLevel) }, formatInlineText(content, enableGlossary, isDarkBg))
      );
      continue;
    }
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ") || line.trim().startsWith("\u2022 ")) {
      const content = line.trim().replace(/^[-*•]\s+/, "");
      elements.push(
        /* @__PURE__ */ React.createElement("div", { key: lineIdx, className: "flex items-start gap-2 mb-1 ml-2" }, /* @__PURE__ */ React.createElement("div", { className: "w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-2" }), /* @__PURE__ */ React.createElement("div", { className: "text-sm" }, formatInlineText(content, enableGlossary, isDarkBg)))
      );
      continue;
    }
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      const number = numMatch[1];
      const content = numMatch[2];
      elements.push(
        /* @__PURE__ */ React.createElement("div", { key: lineIdx, className: "flex items-start gap-2 mb-1 ml-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold text-indigo-500 min-w-[1.2em] text-right" }, number, "."), /* @__PURE__ */ React.createElement("div", { className: "text-sm" }, formatInlineText(content, enableGlossary, isDarkBg)))
      );
      continue;
    }
    elements.push(
      /* @__PURE__ */ React.createElement("div", { key: lineIdx, className: "mb-1 text-sm" }, formatInlineText(line, enableGlossary, isDarkBg))
    );
  }
  if (inTable) {
    elements.push(flushTable("end"));
  }
  return elements;
};
const renderOutlineContent = (deps) => {
  const { ErrorBoundary, KeyConceptMapView, VennGame, generatedContent, isInteractiveVenn, isProcessing, isTeacherMode, isVennPlaying, leveledTextLanguage, outlineTranslationMode, vennGameData, vennInputs, isEditingOutline, isMapLocked, setOutlineTranslationMode, setVennInputs, closeVenn, handleAddVennItem, handleGameCompletion, handleGameScoreUpdate, handleGenerateOutcome, handleInitializeVenn, handleOutlineChange, handleRemoveVennItem, handleSetIsVennPlayingToTrue, playSound, t, isCESortPlaying, ceGameData, closeCESort, setIsCESortPlaying, setCeGameData } = deps;
  const CauseEffectSortGame = window.AlloModules && window.AlloModules.CauseEffectSortGame ? (function() {
    const _C = window.AlloModules.CauseEffectSortGame;
    return React.memo((props) => React.createElement(_C, props));
  })() : (props) => React.createElement("div", { className: "p-8 text-center text-slate-600" }, "Loading game...");
  try {
    if (window._DEBUG_VIEW_RENDERERS) console.log("[ViewRenderers] renderOutlineContent fired");
  } catch (_) {
  }
  if (!generatedContent || generatedContent.type !== "outline" || !generatedContent?.data) return null;
  const { main, main_en, branches: rawBranches, structureType } = generatedContent?.data;
  const branches = Array.isArray(rawBranches) ? rawBranches : [];
  const type = structureType || "Structured Outline";
  const MainTitle = () => /* @__PURE__ */ React.createElement("div", { className: "text-center mb-8" }, isEditingOutline ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2 max-w-md mx-auto" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_main"),
      value: main,
      onChange: (e) => handleOutlineChange(null, "main", e.target.value),
      className: "text-2xl font-black text-center text-slate-800 bg-white border border-indigo-200 rounded p-1 focus:ring-2 focus:ring-indigo-400 outline-none w-full"
    }
  ), (main_en || leveledTextLanguage !== "English") && /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.common_placeholder_translation"),
      value: main_en || "",
      onChange: (e) => handleOutlineChange(null, "main", e.target.value, null, true),
      className: "text-sm text-center text-slate-600 bg-white border border-slate-400 rounded p-1 focus:ring-2 focus:ring-indigo-400 outline-none w-full",
      placeholder: t("common.placeholder_translation")
    }
  )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h3", { className: "text-2xl font-black text-slate-800" }, main), main_en && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-600 italic" }, "(", main_en, ")")));
  const BranchItem = React.memo(({ branch, bIdx, minimal = false, colorClass = "bg-white" }) => /* @__PURE__ */ React.createElement("div", { className: `${colorClass} p-5 rounded-2xl border-2 shadow-sm transition-all h-full ${bIdx % 2 === 0 ? "border-indigo-100" : "border-teal-100"} ${minimal ? "p-3" : ""} hover:shadow-md relative z-10` }, /* @__PURE__ */ React.createElement("div", { className: "mb-3 pb-2 border-b border-black/5" }, isEditingOutline ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_branch"),
      value: branch.title,
      onChange: (e) => handleOutlineChange(bIdx, "title", e.target.value),
      className: "font-bold text-lg text-indigo-900 w-full bg-transparent outline-none border-b border-dashed border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded px-1"
    }
  ), (branch.title_en || leveledTextLanguage !== "English") && /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.common_placeholder_title_trans"),
      value: branch.title_en || "",
      onChange: (e) => handleOutlineChange(bIdx, "title", e.target.value, null, true),
      className: "text-xs text-slate-600 w-full bg-transparent outline-none border-b border-dashed border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 rounded px-1",
      placeholder: t("common.placeholder_title_trans")
    }
  )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-lg text-indigo-900" }, branch.title), branch.title_en && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-600 italic" }, "(", branch.title_en, ")"))), /* @__PURE__ */ React.createElement("ul", { className: "space-y-2" }, branch.items && branch.items.map((item, iIdx) => /* @__PURE__ */ React.createElement("li", { key: iIdx, className: "flex items-start gap-2 text-sm text-slate-700" }, /* @__PURE__ */ React.createElement("div", { className: `w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${bIdx % 2 === 0 ? "bg-indigo-400" : "bg-teal-400"}` }), /* @__PURE__ */ React.createElement("div", { className: "w-full" }, isEditingOutline ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_item"),
      value: item,
      onChange: (e) => handleOutlineChange(bIdx, "item", e.target.value, iIdx),
      className: "w-full bg-white/50 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-300 border border-transparent focus:border-indigo-200"
    }
  ), (branch.items_en?.[iIdx] || leveledTextLanguage !== "English") && /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.common_placeholder_item_trans"),
      value: branch.items_en?.[iIdx] || "",
      onChange: (e) => handleOutlineChange(bIdx, "item", e.target.value, iIdx, true),
      className: "w-full bg-white/50 rounded px-2 py-0.5 text-xs text-slate-600 italic outline-none focus:ring-2 focus:ring-indigo-300",
      placeholder: t("common.placeholder_item_trans")
    }
  )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, item), branch.items_en?.[iIdx] && /* @__PURE__ */ React.createElement("div", { className: "text-xs text-slate-600 italic" }, "(", branch.items_en[iIdx], ")"))))))));
  if (type === "Flow Chart" || type === "Process Flow / Sequence") {
    return /* @__PURE__ */ React.createElement("div", { className: "max-w-3xl mx-auto" }, /* @__PURE__ */ React.createElement(MainTitle, null), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center relative space-y-12 px-4 py-8 bg-slate-50/50 rounded-3xl border border-slate-100" }, /* @__PURE__ */ React.createElement("div", { className: "absolute left-1/2 top-4 bottom-4 w-1 bg-gradient-to-b from-indigo-200 via-purple-200 to-teal-200 -translate-x-1/2 -z-10 rounded-full" }), branches.map((b, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "relative w-full flex flex-col items-center group" }, i > 0 && /* @__PURE__ */ React.createElement("div", { className: "absolute -top-9 z-10 text-indigo-300 bg-white rounded-full p-1 border border-indigo-100 shadow-sm" }, /* @__PURE__ */ React.createElement(ArrowDown, { size: 20, strokeWidth: 3 })), /* @__PURE__ */ React.createElement("div", { className: `w-full max-w-lg p-1 rounded-2xl bg-white shadow-lg transition-all duration-200 border-l-[6px] ${i % 2 === 0 ? "border-l-indigo-500" : "border-l-purple-500"} hover:shadow-xl hover:ring-2 hover:ring-indigo-100` }, /* @__PURE__ */ React.createElement("div", { className: `absolute -left-5 top-1/2 -translate-y-1/2 text-white text-sm font-black w-10 h-10 flex items-center justify-center rounded-full border-4 border-slate-50 shadow-md ${i % 2 === 0 ? "bg-indigo-500" : "bg-purple-500"}` }, i + 1), /* @__PURE__ */ React.createElement(BranchItem, { branch: b, bIdx: i, colorClass: "bg-white border-none shadow-none" })))), /* @__PURE__ */ React.createElement("div", { className: "px-8 py-3 bg-slate-800 text-white rounded-full font-black text-sm mt-4 z-10 shadow-lg border-4 border-white tracking-widest uppercase" }, t("outline.labels.end"))));
  }
  if (type === "Venn Diagram") {
    const setA = branches[0] || { title: "Set A", items: [] };
    const setB = branches[1] || { title: "Set B", items: [] };
    const shared = branches[2] || { title: "Shared / Overlap", items: [] };
    const isNonEnglish = leveledTextLanguage !== "English";
    const showEnglish = !isNonEnglish || outlineTranslationMode === "bilingual";
    const renderVennItems = (items, items_en, branchIndex) => {
      return items.slice(0, 5).map((it, i) => /* @__PURE__ */ React.createElement("li", { key: i }, isEditingOutline ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1 mb-2" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          "aria-label": t("common.enter_it"),
          value: it,
          onChange: (e) => handleOutlineChange(branchIndex, "item", e.target.value, i),
          role: "dialog",
          "aria-modal": "true",
          onClick: (e) => e.stopPropagation(),
          className: "w-full bg-white/50 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-300 border border-transparent focus:border-indigo-200 text-xs font-bold"
        }
      ), showEnglish && isNonEnglish && (items_en?.[i] || items_en?.[i] === "") && /* @__PURE__ */ React.createElement(
        "input",
        {
          "aria-label": t("common.enter_items_en"),
          value: items_en[i] || "",
          onChange: (e) => handleOutlineChange(branchIndex, "item", e.target.value, i, true),
          role: "dialog",
          "aria-modal": "true",
          onClick: (e) => e.stopPropagation(),
          className: "w-full bg-white/50 rounded px-2 py-0.5 text-[0.8em] opacity-80 font-normal outline-none focus:ring-2 focus:ring-indigo-300 border border-transparent focus:border-indigo-200",
          placeholder: t("common.placeholder_item_trans")
        }
      )) : /* @__PURE__ */ React.createElement(React.Fragment, null, "\u2022 ", it, showEnglish && isNonEnglish && items_en?.[i] && /* @__PURE__ */ React.createElement("div", { className: "text-[0.8em] opacity-80 font-normal mt-0.5" }, "(", items_en[i], ")"))));
    };
    const renderVennTitle = (title, title_en, branchIndex) => /* @__PURE__ */ React.createElement(React.Fragment, null, isEditingOutline ? /* @__PURE__ */ React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.currentTarget.click();
      }
    }, className: "flex flex-col gap-1 min-w-[120px]", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("common.enter_title"),
        value: title,
        onChange: (e) => handleOutlineChange(branchIndex, "title", e.target.value),
        className: "font-black text-center bg-transparent outline-none border-b border-dashed border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded px-1 w-full"
      }
    ), showEnglish && isNonEnglish && (title_en || title_en === "") && /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("common.common_placeholder_title_trans"),
        value: title_en || "",
        onChange: (e) => handleOutlineChange(branchIndex, "title", e.target.value, null, true),
        className: "text-[0.6em] text-center opacity-80 font-normal uppercase tracking-normal bg-transparent outline-none border-b border-dashed border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 rounded px-1 w-full",
        placeholder: t("common.placeholder_title_trans")
      }
    )) : /* @__PURE__ */ React.createElement(React.Fragment, null, title, showEnglish && isNonEnglish && title_en && /* @__PURE__ */ React.createElement("div", { className: "text-[0.6em] opacity-80 font-normal mt-1 uppercase tracking-normal" }, "(", title_en, ")")));
    if (isVennPlaying || isInteractiveVenn && !isTeacherMode) {
      const vennTitles = { setA: { text: setA.title, trans: setA.title_en }, setB: { text: setB.title, trans: setB.title_en } };
      return /* @__PURE__ */ React.createElement(ErrorBoundary, { fallbackMessage: "Venn Game encountered an error." }, /* @__PURE__ */ React.createElement(
        VennGame,
        {
          data: vennGameData,
          onClose: closeVenn,
          playSound,
          titles: vennTitles,
          primaryLanguage: leveledTextLanguage,
          onScoreUpdate: handleGameScoreUpdate,
          onGameComplete: handleGameCompletion
        }
      ));
    }
    if (isInteractiveVenn) {
      return /* @__PURE__ */ React.createElement("div", { className: "max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4" }, /* @__PURE__ */ React.createElement("div", { className: "text-center mb-8" }, /* @__PURE__ */ React.createElement("h3", { className: "text-2xl font-black text-indigo-900 flex items-center justify-center gap-2" }, /* @__PURE__ */ React.createElement(Layout, { size: 24, className: "text-purple-500" }), " ", t("concept_map.venn.setup_title")), /* @__PURE__ */ React.createElement("p", { className: "text-slate-600 text-sm" }, t("concept_map.venn.setup_desc"))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" }, /* @__PURE__ */ React.createElement("div", { className: "bg-rose-50 rounded-xl border-2 border-rose-200 p-4 flex flex-col" }, /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-rose-800 mb-3 text-center uppercase tracking-wider" }, setA.title), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mb-3" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          "aria-label": t("common.enter_venn_inputs"),
          type: "text",
          value: vennInputs.setA,
          onChange: (e) => setVennInputs({ ...vennInputs, setA: e.target.value }),
          onKeyDown: (e) => e.key === "Enter" && handleAddVennItem("setA"),
          placeholder: t("concept_map.venn.add_item_placeholder"),
          className: "flex-grow text-xs p-2 rounded border border-rose-200 outline-none focus:ring-2 focus:ring-rose-400"
        }
      ), /* @__PURE__ */ React.createElement("button", { onClick: () => handleAddVennItem("setA"), className: "bg-rose-200 hover:bg-rose-300 text-rose-800 p-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500", "aria-label": t("common.add") }, /* @__PURE__ */ React.createElement(Plus, { size: 14 }))), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 flex-grow overflow-y-auto max-h-60 custom-scrollbar pr-1" }, vennGameData.setA.map((item, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "bg-white p-2 rounded shadow-sm border border-rose-100 text-xs flex justify-between items-center group" }, /* @__PURE__ */ React.createElement("span", null, typeof item === "object" ? item.text : item), /* @__PURE__ */ React.createElement("button", { onClick: () => handleRemoveVennItem("setA", i), className: "text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity", "aria-label": t("common.remove") }, /* @__PURE__ */ React.createElement(X, { size: 12 })))), vennGameData.setA.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-rose-400 italic text-center" }, t("concept_sort.no_items")))), /* @__PURE__ */ React.createElement("div", { className: "bg-purple-50 rounded-xl border-2 border-purple-200 p-4 flex flex-col" }, /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-purple-800 mb-3 text-center uppercase tracking-wider" }, shared.title || "Shared"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mb-3" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          "aria-label": t("common.enter_venn_inputs"),
          type: "text",
          value: vennInputs.shared,
          onChange: (e) => setVennInputs({ ...vennInputs, shared: e.target.value }),
          onKeyDown: (e) => e.key === "Enter" && handleAddVennItem("shared"),
          placeholder: t("concept_map.venn.add_item_placeholder"),
          className: "flex-grow text-xs p-2 rounded border border-purple-200 outline-none focus:ring-2 focus:ring-purple-400"
        }
      ), /* @__PURE__ */ React.createElement("button", { onClick: () => handleAddVennItem("shared"), className: "bg-purple-200 hover:bg-purple-300 text-purple-800 p-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500", "aria-label": t("common.add") }, /* @__PURE__ */ React.createElement(Plus, { size: 14 }))), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 flex-grow overflow-y-auto max-h-60 custom-scrollbar pr-1" }, vennGameData.shared.map((item, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "bg-white p-2 rounded shadow-sm border border-purple-100 text-xs flex justify-between items-center group" }, /* @__PURE__ */ React.createElement("span", null, typeof item === "object" ? item.text : item), /* @__PURE__ */ React.createElement("button", { onClick: () => handleRemoveVennItem("shared", i), className: "text-purple-300 hover:text-purple-500 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity", "aria-label": t("common.remove") }, /* @__PURE__ */ React.createElement(X, { size: 12 })))), vennGameData.shared.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-purple-400 italic text-center" }, t("concept_sort.no_items")))), /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 rounded-xl border-2 border-blue-200 p-4 flex flex-col" }, /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-blue-800 mb-3 text-center uppercase tracking-wider" }, setB.title), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mb-3" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          "aria-label": t("common.enter_venn_inputs"),
          type: "text",
          value: vennInputs.setB,
          onChange: (e) => setVennInputs({ ...vennInputs, setB: e.target.value }),
          onKeyDown: (e) => e.key === "Enter" && handleAddVennItem("setB"),
          placeholder: t("concept_map.venn.add_item_placeholder"),
          className: "flex-grow text-xs p-2 rounded border border-blue-200 outline-none focus:ring-2 focus:ring-blue-400"
        }
      ), /* @__PURE__ */ React.createElement("button", { onClick: () => handleAddVennItem("setB"), className: "bg-blue-200 hover:bg-blue-300 text-blue-800 p-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500", "aria-label": t("common.add") }, /* @__PURE__ */ React.createElement(Plus, { size: 14 }))), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 flex-grow overflow-y-auto max-h-60 custom-scrollbar pr-1" }, vennGameData.setB.map((item, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "bg-white p-2 rounded shadow-sm border border-blue-100 text-xs flex justify-between items-center group" }, /* @__PURE__ */ React.createElement("span", null, typeof item === "object" ? item.text : item), /* @__PURE__ */ React.createElement("button", { onClick: () => handleRemoveVennItem("setB", i), className: "text-blue-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity", "aria-label": t("common.remove") }, /* @__PURE__ */ React.createElement(X, { size: 12 })))), vennGameData.setB.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-blue-400 italic text-center" }, t("concept_sort.no_items"))))), /* @__PURE__ */ React.createElement(
        "button",
        {
          "aria-label": t("common.start_game"),
          className: "w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xl shadow-lg hover:bg-indigo-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-2",
          onClick: handleSetIsVennPlayingToTrue
        },
        /* @__PURE__ */ React.createElement(Gamepad2, { size: 24, className: "fill-current text-yellow-400" }),
        " ",
        t("concept_map.venn.start_game")
      ));
    }
    return /* @__PURE__ */ React.createElement("div", { className: "max-w-3xl mx-auto py-8" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-center mb-8 gap-3" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": t("common.start_game"),
        onClick: handleInitializeVenn,
        className: "flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full font-bold text-sm transition-colors border border-indigo-200 shadow-sm"
      },
      /* @__PURE__ */ React.createElement(Gamepad2, { size: 16 }),
      " ",
      t("concept_map.venn.interactive_mode")
    ), isNonEnglish && /* @__PURE__ */ React.createElement(
      "select",
      {
        "aria-label": t("common.selection"),
        value: outlineTranslationMode,
        onChange: (e) => setOutlineTranslationMode(e.target.value),
        className: "text-xs border border-indigo-200 rounded-full px-3 py-2 bg-white text-indigo-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-200 shadow-sm cursor-pointer"
      },
      /* @__PURE__ */ React.createElement("option", { value: "bilingual" }, leveledTextLanguage, " + ", t("languages.english")),
      /* @__PURE__ */ React.createElement("option", { value: "target" }, leveledTextLanguage, " Only")
    )), /* @__PURE__ */ React.createElement(MainTitle, null), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center space-y-[-40px]" }, /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-lg z-10" }, /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 border-4 border-blue-200 rounded-[50px] p-10 pb-16 text-center shadow-sm relative" }, /* @__PURE__ */ React.createElement("h4", { className: "font-black text-blue-800 text-xl uppercase tracking-wider mb-3 bg-white/50 inline-block px-6 py-2 rounded-full" }, renderVennTitle(setB.title, setB.title_en, 1)), /* @__PURE__ */ React.createElement("ul", { className: "text-sm font-bold text-blue-900 space-y-2" }, renderVennItems(setB.items, setB.items_en, 1)))), /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-md z-20" }, /* @__PURE__ */ React.createElement("div", { className: "bg-purple-100/95 border-4 border-purple-300 rounded-[60px] p-12 text-center shadow-xl transform hover:scale-105 transition-transform" }, /* @__PURE__ */ React.createElement("h4", { className: "font-black text-purple-800 text-sm uppercase tracking-wider mb-3 border-b-2 border-purple-200 pb-1 inline-block" }, renderVennTitle(shared.title || "Shared", shared.title_en, 2)), /* @__PURE__ */ React.createElement("ul", { className: "text-xs font-black text-purple-900 space-y-2" }, renderVennItems(shared.items, shared.items_en, 2)))), /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-lg z-10" }, /* @__PURE__ */ React.createElement("div", { className: "bg-rose-50 border-4 border-rose-200 rounded-[50px] p-10 pt-16 text-center shadow-sm relative" }, /* @__PURE__ */ React.createElement("ul", { className: "text-sm font-bold text-rose-900 space-y-2 mb-3" }, renderVennItems(setA.items, setA.items_en, 0)), /* @__PURE__ */ React.createElement("h4", { className: "font-black text-rose-800 text-xl uppercase tracking-wider bg-white/50 inline-block px-6 py-2 rounded-full" }, renderVennTitle(setA.title, setA.title_en, 0))))));
  }
  if (type === "Cause and Effect") {
    const causes = branches.filter((b) => b.title.toLowerCase().includes("cause"));
    const effects = branches.filter((b) => b.title.toLowerCase().includes("effect") || b.title.toLowerCase().includes("consequence"));
    const chains = branches.filter((b) => b.title.toLowerCase().includes("chain") || b.title.toLowerCase().includes("sequence"));
    const isLegacy = causes.length === 0 && effects.length === 0 && chains.length === 0;
    if (isCESortPlaying) {
      const causeItems = [];
      const effectItems = [];
      if (isLegacy) {
        branches.forEach((b) => {
          causeItems.push(b.title);
          (b.items || []).forEach((it) => effectItems.push(it));
        });
      } else {
        causes.forEach((b) => {
          (b.items || []).forEach((it) => causeItems.push(it));
        });
        effects.forEach((b) => {
          (b.items || []).forEach((it) => effectItems.push(it));
        });
      }
      return /* @__PURE__ */ React.createElement(ErrorBoundary, { fallbackMessage: "Cause & Effect Sort encountered an error." }, /* @__PURE__ */ React.createElement(
        CauseEffectSortGame,
        {
          data: { causes: causeItems, effects: effectItems },
          onClose: closeCESort,
          playSound,
          topicTitle: main || "",
          onScoreUpdate: handleGameScoreUpdate,
          onGameComplete: handleGameCompletion
        }
      ));
    }
    if (isLegacy) {
      return /* @__PURE__ */ React.createElement("div", { className: "max-w-4xl mx-auto px-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-center mb-4" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setIsCESortPlaying(true),
          className: "flex items-center gap-2 bg-gradient-to-r from-orange-500 to-teal-500 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all animate-[pulse_3s_ease-in-out_infinite]",
          "aria-label": t("games.ce_sort.title") || "Cause & Effect Sort Game"
        },
        /* @__PURE__ */ React.createElement(Gamepad2, { size: 16 }),
        " ",
        t("games.ce_sort.play_btn") || "Sort Game"
      )), /* @__PURE__ */ React.createElement(MainTitle, null), /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, branches.map((b, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "relative pl-4 md:pl-0 group" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col md:flex-row items-stretch gap-0 bg-white rounded-2xl border border-slate-400 shadow-md overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 p-6 bg-orange-50 border-r border-orange-100 relative" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-0 left-0 bg-orange-200 text-orange-800 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-br-lg" }, t("outline.labels.cause")), /* @__PURE__ */ React.createElement("div", { className: "pt-2 h-full flex items-center" }, isEditingOutline ? /* @__PURE__ */ React.createElement(
        "textarea",
        {
          "aria-label": t("outline.edit_cause") || "Edit cause",
          value: b.title,
          onChange: (e) => handleOutlineChange(i, "title", e.target.value),
          className: "w-full bg-transparent outline-none focus:ring-2 focus:ring-orange-400 text-orange-900 font-bold resize-none h-full"
        }
      ) : /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-orange-900 text-lg" }, b.title))), /* @__PURE__ */ React.createElement("div", { className: "bg-white flex items-center justify-center w-full md:w-12 py-2 md:py-0 border-y md:border-y-0 md:border-r border-slate-100 relative overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-slate-50 opacity-50" }), /* @__PURE__ */ React.createElement(ArrowRight, { size: 24, className: "text-slate-600 rotate-90 md:rotate-0 relative z-10", strokeWidth: 3 })), /* @__PURE__ */ React.createElement("div", { className: "flex-1 p-6 bg-teal-50 relative" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-0 left-0 bg-teal-200 text-teal-800 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-br-lg" }, t("outline.labels.effect")), /* @__PURE__ */ React.createElement("div", { className: "pt-4 h-full" }, /* @__PURE__ */ React.createElement("ul", { className: "list-disc list-inside text-teal-900 space-y-2 marker:text-teal-400" }, b.items.map((item, k) => /* @__PURE__ */ React.createElement("li", { key: k, className: "text-sm font-medium leading-relaxed" }, item))))))))));
    }
    return /* @__PURE__ */ React.createElement("div", { className: "max-w-6xl mx-auto px-4 py-8" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-center mb-6" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setIsCESortPlaying(true),
        className: "flex items-center gap-2 bg-gradient-to-r from-orange-500 to-teal-500 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all animate-[pulse_3s_ease-in-out_infinite]",
        "aria-label": t("games.ce_sort.title") || "Cause & Effect Sort Game"
      },
      /* @__PURE__ */ React.createElement(Gamepad2, { size: 16 }),
      " ",
      t("games.ce_sort.play_btn") || "Sort Game"
    )), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 mb-16" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex flex-col gap-6 w-full lg:items-end" }, causes.map((branch, i) => /* @__PURE__ */ React.createElement("div", { key: `c-${i}`, className: "bg-orange-50 border-l-4 border-orange-400 p-5 rounded-r-xl shadow-sm w-full max-w-md relative group hover:shadow-md transition-shadow" }, /* @__PURE__ */ React.createElement("h4", { className: "font-black text-orange-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "w-2 h-2 rounded-full bg-orange-400" }), " ", t("outline.labels.causes")), /* @__PURE__ */ React.createElement("ul", { className: "space-y-2" }, branch.items.map((it, k) => /* @__PURE__ */ React.createElement("li", { key: k, className: "text-slate-700 font-medium text-sm flex items-start gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "w-1.5 h-1.5 rounded-full bg-orange-300 mt-1.5 shrink-0" }), it)))))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center justify-center gap-4 z-10" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white p-3 rounded-full border-2 border-slate-200 shadow-sm" }, /* @__PURE__ */ React.createElement(ArrowRight, { size: 32, className: "text-slate-600 rotate-90 lg:rotate-0", strokeWidth: 3 }))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex flex-col gap-6 w-full lg:items-start" }, effects.map((branch, i) => /* @__PURE__ */ React.createElement("div", { key: `e-${i}`, className: "bg-teal-50 border-r-4 border-teal-400 p-5 rounded-l-xl shadow-sm w-full max-w-md relative group hover:shadow-md transition-shadow text-right lg:text-left" }, /* @__PURE__ */ React.createElement("h4", { className: "font-black text-teal-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-2 justify-end lg:justify-start" }, t("outline.labels.effects"), " ", /* @__PURE__ */ React.createElement("div", { className: "w-2 h-2 rounded-full bg-teal-400" })), /* @__PURE__ */ React.createElement("ul", { className: "space-y-2" }, branch.items.map((it, k) => /* @__PURE__ */ React.createElement("li", { key: k, className: "text-slate-700 font-medium text-sm flex items-start gap-2 justify-end lg:justify-start" }, it, /* @__PURE__ */ React.createElement("div", { className: "w-1.5 h-1.5 rounded-full bg-teal-300 mt-1.5 shrink-0 order-first lg:order-last" })))))))));
  }
  if (type === "Problem Solution") {
    const outcomeIndex = branches.findIndex(
      (b) => b.title.toLowerCase().includes("outcome") || b.title.toLowerCase().includes("result") || b.title.toLowerCase().includes("evaluation")
    );
    const outcomeBranch = outcomeIndex !== -1 ? branches[outcomeIndex] : null;
    const solutionBranches = branches.filter((_, i) => i !== outcomeIndex);
    return /* @__PURE__ */ React.createElement("div", { className: "max-w-5xl mx-auto px-4 py-12" }, /* @__PURE__ */ React.createElement("div", { className: "relative z-10 mb-16" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white border-l-8 border-red-500 rounded-r-3xl shadow-xl p-8 relative transform transition-transform hover:scale-[1.01] max-w-3xl mx-auto" }, /* @__PURE__ */ React.createElement("div", { className: "absolute -left-6 top-6 bg-red-700 text-white p-3 rounded-full shadow-md border-4 border-white" }, /* @__PURE__ */ React.createElement(AlertCircle, { size: 32 })), /* @__PURE__ */ React.createElement("div", { className: "pl-8" }, /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-black text-red-500 uppercase tracking-widest mb-2 opacity-70 flex items-center gap-2" }, t("outline.labels.problem")), /* @__PURE__ */ React.createElement(MainTitle, null)), /* @__PURE__ */ React.createElement("div", { className: "absolute -bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center h-24 w-8 justify-end" }, /* @__PURE__ */ React.createElement("div", { className: "h-full w-1 bg-slate-200" }), /* @__PURE__ */ React.createElement("div", { className: "w-4 h-4 rounded-full bg-slate-300 border-4 border-white shadow-sm -mb-2" })))), /* @__PURE__ */ React.createElement("div", { className: "relative mb-16" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-[-2rem] left-[10%] right-[10%] h-1 bg-slate-200 rounded-full hidden md:block" }), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" }, solutionBranches.map((b, i) => {
      const originalIndex = branches.indexOf(b);
      return /* @__PURE__ */ React.createElement("div", { key: i, className: "flex flex-col relative group" }, /* @__PURE__ */ React.createElement("div", { className: "absolute -top-8 left-1/2 -translate-x-1/2 h-8 w-1 bg-slate-200 hidden md:block group-hover:bg-green-300 transition-colors" }), /* @__PURE__ */ React.createElement("div", { className: "relative bg-white rounded-2xl border-t-8 border-green-500 shadow-md hover:shadow-xl transition-all duration-300 flex-grow p-6 flex flex-col h-full" }, /* @__PURE__ */ React.createElement("div", { className: "absolute -top-5 left-1/2 -translate-x-1/2 bg-green-100 text-green-800 px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border border-green-200 whitespace-nowrap shadow-sm z-10" }, "Solution Path ", i + 1), /* @__PURE__ */ React.createElement("div", { className: "mt-4 flex-grow" }, /* @__PURE__ */ React.createElement(BranchItem, { branch: b, bIdx: originalIndex, colorClass: "bg-transparent border-none shadow-none p-0" }))), /* @__PURE__ */ React.createElement("div", { className: "absolute -bottom-8 left-1/2 -translate-x-1/2 h-8 w-1 bg-slate-200 hidden md:block group-hover:bg-blue-300 transition-colors" }));
    })), /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-[-2rem] left-[10%] right-[10%] h-1 bg-slate-200 rounded-full hidden md:block" })), /* @__PURE__ */ React.createElement("div", { className: "relative max-w-3xl mx-auto" }, /* @__PURE__ */ React.createElement("div", { className: "absolute -top-16 left-1/2 -translate-x-1/2 h-16 w-1 bg-slate-200 flex items-end justify-center pb-1" }, /* @__PURE__ */ React.createElement(ArrowDown, { size: 24, className: "text-slate-600" })), /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 border-2 border-blue-200 rounded-3xl p-8 text-center relative shadow-lg" }, /* @__PURE__ */ React.createElement("div", { className: "inline-flex items-center justify-center p-3 bg-blue-100 text-blue-600 rounded-full mb-4 shadow-sm border border-blue-200" }, /* @__PURE__ */ React.createElement(CheckCircle2, { size: 24 })), outcomeBranch ? /* @__PURE__ */ React.createElement("div", { className: "text-left" }, /* @__PURE__ */ React.createElement(BranchItem, { branch: outcomeBranch, bIdx: outcomeIndex, colorClass: "bg-transparent border-none shadow-none p-0" })) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-black text-blue-900 mb-2" }, t("outline.labels.outcome")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-blue-800/80 max-w-lg mx-auto leading-relaxed italic" }, "Analyze the results here. Did the proposed solutions effectively address the challenge? What were the trade-offs or final results?"), isTeacherMode && /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": t("common.generate_scenario_outcome"),
        onClick: handleGenerateOutcome,
        disabled: isProcessing,
        className: "mt-4 text-xs font-bold bg-blue-100 text-blue-700 px-4 py-2 rounded-full hover:bg-blue-200 transition-colors flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:cursor-wait"
      },
      isProcessing ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(Sparkles, { size: 14 }),
      t("outline.labels.generate_outcome") || "Generate Outcome"
    )))));
  }
  if (type === "Key Concept Map" || type === "Mind Map") {
    return /* @__PURE__ */ React.createElement(KeyConceptMapView, { branches, main, main_en, BranchItem });
  }
  if (type === "Structured Outline") {
    const toRoman = (num) => {
      const lookup = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
      return lookup[num] || num;
    };
    return /* @__PURE__ */ React.createElement("div", { className: "max-w-4xl mx-auto px-4 py-6" }, /* @__PURE__ */ React.createElement(MainTitle, null), /* @__PURE__ */ React.createElement("div", { className: "relative mt-8 space-y-8 ml-4 md:ml-12" }, /* @__PURE__ */ React.createElement("div", { className: "absolute left-[-24px] top-4 bottom-8 w-0.5 bg-indigo-200/50 rounded-full" }), branches.map((branch, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "relative group animate-in slide-in-from-left-4 duration-500", style: { animationDelay: `${i * 100}ms` } }, /* @__PURE__ */ React.createElement("div", { className: "absolute left-[-29px] top-6 w-3 h-3 rounded-full bg-white border-2 border-indigo-400 z-10 group-hover:scale-125 transition-transform shadow-sm" }), /* @__PURE__ */ React.createElement("div", { className: "absolute left-[-24px] top-[29px] w-6 h-px bg-indigo-300" }), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-r-xl rounded-bl-xl border-l-4 border-l-indigo-500 border-y border-r border-indigo-100 p-5 shadow-sm hover:shadow-md transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3 mb-3" }, /* @__PURE__ */ React.createElement("span", { className: "font-serif font-bold text-indigo-200 text-3xl leading-none select-none -mt-1" }, toRoman(i + 1)), /* @__PURE__ */ React.createElement("div", { className: "flex-grow" }, isEditingOutline ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("common.enter_branch"),
        value: branch.title,
        onChange: (e) => handleOutlineChange(i, "title", e.target.value),
        className: "font-bold text-lg text-indigo-900 w-full bg-transparent outline-none border-b border-dashed border-indigo-200 focus:border-indigo-500"
      }
    ), (branch.title_en || leveledTextLanguage !== "English") && /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("common.common_placeholder_translation"),
        value: branch.title_en || "",
        onChange: (e) => handleOutlineChange(i, "title", e.target.value, null, true),
        className: "text-xs text-slate-600 w-full bg-transparent outline-none focus:ring-2 focus:ring-indigo-400 border-b border-dashed border-slate-200",
        placeholder: t("common.placeholder_translation")
      }
    )) : /* @__PURE__ */ React.createElement("div", { className: "border-b border-slate-50 pb-2" }, /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-lg text-indigo-900" }, branch.title), branch.title_en && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-600 italic" }, "(", branch.title_en, ")")))), /* @__PURE__ */ React.createElement("ul", { className: "space-y-0 text-sm text-slate-700 bg-slate-50/50 rounded-lg overflow-hidden border border-slate-100" }, branch.items && branch.items.map((item, k) => /* @__PURE__ */ React.createElement("li", { key: k, className: "group/item relative flex items-start gap-3 p-3 border-b border-slate-100 last:border-0 hover:bg-indigo-50/30 transition-colors" }, /* @__PURE__ */ React.createElement("span", { className: "font-mono text-indigo-600 font-bold text-xs mt-0.5 select-none" }, String.fromCharCode(65 + k), "."), /* @__PURE__ */ React.createElement("div", { className: "w-full" }, isEditingOutline ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("common.enter_item"),
        value: item,
        onChange: (e) => handleOutlineChange(i, "item", e.target.value, k),
        className: "w-full bg-white rounded px-2 py-1 outline-none border border-slate-400 focus:border-indigo-600"
      }
    ), (branch.items_en?.[k] || leveledTextLanguage !== "English") && /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("common.common_placeholder_translation"),
        value: branch.items_en?.[k] || "",
        onChange: (e) => handleOutlineChange(i, "item", e.target.value, k, true),
        className: "w-full bg-white rounded px-2 py-0.5 text-xs text-slate-600 italic outline-none focus:ring-2 focus:ring-indigo-400 border border-slate-100",
        placeholder: t("common.placeholder_translation")
      }
    )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "leading-relaxed" }, item), branch.items_en?.[k] && /* @__PURE__ */ React.createElement("div", { className: "text-xs text-slate-600 italic mt-0.5" }, "(", branch.items_en[k], ")")))))))))));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "max-w-5xl mx-auto" }, /* @__PURE__ */ React.createElement(MainTitle, null), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6" }, branches.map((b, i) => /* @__PURE__ */ React.createElement(BranchItem, { key: i, branch: b, bIdx: i }))));
};
const renderInteractiveMap = (deps) => {
  const { ConfettiExplosion, STYLE_TEXT_SHADOW_WHITE, VENN_ZONES, activeChallengeMode, challengeFeedback, challengeModeType, generatedContent, isChallengeActive, isCheckingChallenge, isProcessing, isTeacherMode, letterSpacing, nodeInputText, isMapLocked, connectingSourceId, conceptMapNodes, conceptMapEdges, draggedNodeId, setChallengeModeType, setConnectingSourceId, setIsInteractiveMap, setIsInteractiveVenn, setNodeInputText, mapContainerRef, addToast, getElbowPath, handleAddManualNode, handleAutoLayout, handleCheckChallengeRouter, handleClearEdges, handleCreateChallenge, handleDeleteEdge, handleDeleteNode, handleExitChallenge, handleNodeClick, handleNodeMouseDown, handleResetLayout, handleRetryChallenge, handleSetIsConceptMapReadyToFalse, handleToggleIsMapLocked, renderFlowShape, setConceptMapNodes, t } = deps;
  try {
    if (window._DEBUG_VIEW_RENDERERS) console.log("[ViewRenderers] renderInteractiveMap fired");
  } catch (_) {
  }
  const isVenn = generatedContent?.data?.structureType === "Venn Diagram";
  const handleVennResetBoard = () => {
    setConceptMapNodes((prev) => prev.map((node) => ({
      ...node,
      x: 100 + Math.random() * 600,
      y: 530 + Math.random() * 50
    })));
    addToast(t("concept_map.venn.toast_reset"), "info");
  };
  const handleVennScrambleBank = () => {
    setConceptMapNodes((prev) => prev.map((node) => {
      if (node.y > 500) {
        return {
          ...node,
          x: 100 + Math.random() * 600,
          y: 530 + Math.random() * 50
        };
      }
      return node;
    }));
    addToast(t("concept_map.venn.toast_scramble"), "info");
  };
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-400 justify-between min-h-[50px]" }, isVenn ? /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center w-full gap-4" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.reset_venn_diagram"),
      onClick: handleVennResetBoard,
      disabled: isMapLocked,
      className: `flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-full text-xs font-bold hover:bg-indigo-50 transition-colors shadow-sm ${isMapLocked ? "opacity-50 cursor-not-allowed" : ""}`
    },
    /* @__PURE__ */ React.createElement(RefreshCw, { size: 14 }),
    " ",
    t("concept_map.venn.reset_board")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.reorder_list"),
      onClick: handleVennScrambleBank,
      disabled: isMapLocked,
      className: `flex items-center gap-2 bg-white text-slate-600 border border-slate-400 px-4 py-2 rounded-full text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm ${isMapLocked ? "opacity-50 cursor-not-allowed" : ""}`
    },
    /* @__PURE__ */ React.createElement(ListOrdered, { size: 14 }),
    " ",
    t("concept_map.venn.scramble_bank")
  ), /* @__PURE__ */ React.createElement("div", { className: "w-px h-6 bg-slate-300 mx-2" }), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setIsInteractiveMap(false);
        setIsInteractiveVenn(false);
      },
      className: "flex items-center gap-1 text-slate-600 hover:text-slate-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-slate-100 transition-colors"
    },
    /* @__PURE__ */ React.createElement(List, { size: 14 }),
    " ",
    t("concept_map.venn.return_list")
  ), /* @__PURE__ */ React.createElement("div", { className: "w-px h-6 bg-slate-300 mx-2" }), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.locked"),
      onClick: handleToggleIsMapLocked,
      className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isMapLocked ? "bg-green-700 text-white hover:bg-green-700 ring-2 ring-green-200" : "bg-white text-slate-600 border border-slate-400 hover:text-indigo-600 hover:bg-indigo-50"}`,
      title: isMapLocked ? t("concept_map.toolbar.unlock_tooltip") : t("concept_map.toolbar.lock_tooltip")
    },
    isMapLocked ? /* @__PURE__ */ React.createElement(Lock, { size: 14 }) : /* @__PURE__ */ React.createElement(Unlock, { size: 14 }),
    isMapLocked ? t("concept_map.toolbar.locked_label") : t("concept_map.toolbar.unlocked_label")
  )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, !isChallengeActive && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSetIsConceptMapReadyToFalse,
      disabled: isMapLocked,
      className: `flex items-center gap-1 text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-200 ${isMapLocked ? "opacity-50 cursor-not-allowed" : ""}`,
      title: t("concept_map.toolbar.return_setup_tooltip"),
      "aria-label": t("concept_map.toolbar.return_setup_tooltip")
    },
    /* @__PURE__ */ React.createElement(List, { size: 14 }),
    " ",
    /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, t("concept_map.toolbar.edit_list"))
  ), /* @__PURE__ */ React.createElement("div", { className: "w-px h-6 bg-slate-300 mx-1 hidden sm:block" })), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_node_input_text"),
      type: "text",
      value: nodeInputText,
      onChange: (e) => setNodeInputText(e.target.value),
      onKeyDown: (e) => e.key === "Enter" && !isChallengeActive && !isMapLocked && handleAddManualNode(),
      placeholder: t("concept_map.toolbar.add_placeholder"),
      className: `text-xs p-2 rounded border border-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none w-32 sm:w-48 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 ${isMapLocked ? "cursor-not-allowed" : ""}`,
      disabled: isChallengeActive || isMapLocked
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.add"),
      onClick: handleAddManualNode,
      disabled: !nodeInputText.trim() || isChallengeActive || isMapLocked,
      className: "bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
    },
    /* @__PURE__ */ React.createElement(Plus, { size: 14 }),
    " ",
    /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, t("concept_map.toolbar.add_concept"))
  ), /* @__PURE__ */ React.createElement("div", { className: "w-px h-6 bg-slate-300 mx-1 hidden sm:block" }), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleResetLayout,
      disabled: isMapLocked,
      className: `flex items-center gap-1 text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-50 transition-colors ${isMapLocked ? "opacity-50 cursor-not-allowed" : ""}`,
      title: t("concept_map.toolbar.scramble_tooltip"),
      "aria-label": t("concept_map.toolbar.scramble_tooltip")
    },
    /* @__PURE__ */ React.createElement(RefreshCw, { size: 14 }),
    " ",
    /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, t("concept_map.toolbar.scramble"))
  ), !isChallengeActive && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleAutoLayout(),
      disabled: isProcessing || isMapLocked,
      className: "flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-100",
      title: t("concept_map.toolbar.auto_layout_tooltip"),
      "aria-label": t("concept_map.toolbar.auto_layout_tooltip")
    },
    isProcessing ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(Sparkles, { size: 14 }),
    /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, t("concept_map.toolbar.auto_layout"))
  ), !isChallengeActive && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleClearEdges,
      disabled: isMapLocked,
      className: `flex items-center gap-1 text-slate-600 hover:text-red-500 px-3 py-1.5 rounded text-xs font-bold hover:bg-red-50 transition-colors ${isMapLocked ? "opacity-50 cursor-not-allowed" : ""}`,
      title: t("concept_map.toolbar.clear_links_tooltip"),
      "aria-label": t("concept_map.toolbar.clear_links_tooltip")
    },
    /* @__PURE__ */ React.createElement(Unplug, { size: 14 }),
    " ",
    /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, t("concept_map.toolbar.clear_links"))
  ), /* @__PURE__ */ React.createElement("div", { className: "w-px h-6 bg-slate-300 mx-2" }), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleToggleIsMapLocked,
      className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isMapLocked ? "bg-green-700 text-white hover:bg-green-700 ring-2 ring-green-200" : "bg-white text-slate-600 border border-slate-400 hover:text-indigo-600 hover:bg-indigo-50"}`,
      title: isMapLocked ? t("concept_map.toolbar.unlock_tooltip") : t("concept_map.toolbar.lock_tooltip"),
      "aria-label": isMapLocked ? t("concept_map.toolbar.unlock_tooltip") : t("concept_map.toolbar.lock_tooltip")
    },
    isMapLocked ? /* @__PURE__ */ React.createElement(Lock, { size: 14 }) : /* @__PURE__ */ React.createElement(Unlock, { size: 14 }),
    isMapLocked ? t("concept_map.toolbar.locked_label") : t("concept_map.toolbar.unlocked_label")
  )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 border-l border-slate-300 pl-2" }, !isChallengeActive && isTeacherMode ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      value: challengeModeType,
      onChange: (e) => setChallengeModeType(e.target.value),
      disabled: isMapLocked,
      className: `text-xs font-bold text-slate-600 bg-white border border-slate-400 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer shadow-sm ${isMapLocked ? "opacity-50 cursor-not-allowed" : ""}`,
      title: t("concept_map.tooltips.select_grading")
    },
    /* @__PURE__ */ React.createElement("option", { value: "strict" }, t("concept_map.challenge.strict_mode")),
    /* @__PURE__ */ React.createElement("option", { value: "ai" }, t("concept_map.challenge.ai_mode"))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleCreateChallenge,
      disabled: isMapLocked,
      className: `flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm ${isMapLocked ? "opacity-50 cursor-not-allowed" : ""}`,
      title: t("concept_map.tooltips.convert_challenge"),
      "aria-label": t("concept_map.tooltips.convert_challenge")
    },
    /* @__PURE__ */ React.createElement(Gamepad2, { size: 14 }),
    " ",
    t("concept_map.challenge.create")
  )) : isChallengeActive ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, challengeFeedback && (activeChallengeMode === "strict" ? /* @__PURE__ */ React.createElement("span", { className: `text-xs font-black px-2 py-1 rounded ${challengeFeedback.score >= 90 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}` }, "Score: ", challengeFeedback.score, "%") : /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-end gap-1 max-w-[250px]" }, /* @__PURE__ */ React.createElement("span", { className: `text-xs font-black px-2 py-1 rounded ${challengeFeedback.score >= 90 ? "bg-green-100 text-green-700" : challengeFeedback.score >= 70 ? "bg-yellow-100 text-yellow-800" : "bg-orange-100 text-orange-700"}` }, "AI Score: ", challengeFeedback.score, "%"), challengeFeedback.feedbackText && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600 italic text-right leading-tight bg-white/80 p-1.5 rounded border border-slate-400 shadow-sm animate-in slide-in-from-right-2" }, challengeFeedback.feedbackText))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleRetryChallenge,
      className: "flex items-center gap-1 bg-white text-slate-600 hover:text-indigo-600 border border-slate-400 hover:border-indigo-600 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm",
      title: t("concept_map.challenge.retry_tooltip"),
      "aria-label": t("concept_map.challenge.retry_tooltip")
    },
    /* @__PURE__ */ React.createElement(RefreshCw, { size: 14 }),
    /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, t("concept_map.challenge.retry"))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.check_challenge_answer"),
      onClick: handleCheckChallengeRouter,
      disabled: isCheckingChallenge,
      className: "flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    },
    isCheckingChallenge ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(CheckCircle2, { size: 14 }),
    isCheckingChallenge ? t("concept_map.challenge.checking") : t("concept_map.challenge.check")
  ), isTeacherMode && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleExitChallenge,
      className: "flex items-center justify-center bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-500 border border-slate-400 hover:border-red-200 w-8 h-8 rounded-full transition-colors",
      title: t("concept_map.challenge.exit"),
      "aria-label": t("concept_map.challenge.exit")
    },
    /* @__PURE__ */ React.createElement(X, { size: 16 })
  ))) : null))), /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: mapContainerRef,
      className: `relative w-full ${isVenn ? "h-[800px]" : "h-[75vh] min-h-[600px]"} bg-white border border-slate-400 rounded-xl overflow-hidden shadow-inner select-none mb-6 ${isMapLocked ? "cursor-default" : "cursor-crosshair"} ${isChallengeActive ? "ring-4 ring-yellow-100" : ""}`,
      onMouseDown: (e) => {
        if (e.target === e.currentTarget && !isMapLocked) setConnectingSourceId(null);
      }
    },
    !isMapLocked && /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-dot-pattern pointer-events-none z-0" }),
    generatedContent?.data?.structureType === "Cause and Effect" && /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 pointer-events-none z-0 flex" }, /* @__PURE__ */ React.createElement("div", { className: "w-1/2 h-full bg-gradient-to-br from-orange-50/80 to-orange-100/40 border-r-2 border-dashed border-orange-200" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-3 left-4 text-orange-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "w-2.5 h-2.5 rounded-full bg-orange-300" }), "CAUSES")), /* @__PURE__ */ React.createElement("div", { className: "w-1/2 h-full bg-gradient-to-bl from-teal-50/80 to-teal-100/40" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-3 right-4 text-teal-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5" }, "EFFECTS", /* @__PURE__ */ React.createElement("div", { className: "w-2.5 h-2.5 rounded-full bg-teal-300" }))), /* @__PURE__ */ React.createElement("div", { className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-300" }, /* @__PURE__ */ React.createElement("svg", { width: "48", height: "48", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "animate-pulse" }, /* @__PURE__ */ React.createElement("path", { d: "M5 12h14" }), /* @__PURE__ */ React.createElement("path", { d: "m12 5 7 7-7 7" })))),
    generatedContent?.data?.structureType === "Problem Solution" && /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 pointer-events-none z-0 flex flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "h-[20%] w-full bg-gradient-to-b from-red-50/70 to-transparent border-b-2 border-dashed border-red-200" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-3 left-4 text-red-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "8", x2: "12", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })), "PROBLEM")), /* @__PURE__ */ React.createElement("div", { className: "flex-grow w-full bg-gradient-to-b from-transparent via-green-50/30 to-transparent" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-[22%] left-4 text-green-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "w-2.5 h-2.5 rounded-sm bg-green-300 rotate-45" }), "SOLUTIONS")), /* @__PURE__ */ React.createElement("div", { className: "h-[25%] w-full bg-gradient-to-t from-blue-50/60 to-transparent border-t-2 border-dashed border-blue-200" }, /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-3 left-4 text-blue-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }), /* @__PURE__ */ React.createElement("polyline", { points: "22 4 12 14.01 9 11.01" })), "OUTCOME"))),
    /* @__PURE__ */ React.createElement("svg", { className: "absolute inset-0 w-full h-full pointer-events-none z-0", "aria-hidden": "true" }, isVenn ? /* @__PURE__ */ React.createElement("g", null, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: "vennGradientA", x1: "0%", y1: "0%", x2: "100%", y2: "100%" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "rgba(244, 63, 94, 0.15)" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "rgba(244, 63, 94, 0.05)" })), /* @__PURE__ */ React.createElement("linearGradient", { id: "vennGradientB", x1: "0%", y1: "0%", x2: "100%", y2: "100%" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "rgba(59, 130, 246, 0.15)" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "rgba(59, 130, 246, 0.05)" })), /* @__PURE__ */ React.createElement("radialGradient", { id: "vennGradientShared", cx: "50%", cy: "50%", r: "50%" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "rgba(168, 85, 247, 0.2)" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "rgba(168, 85, 247, 0)" })), /* @__PURE__ */ React.createElement("filter", { id: "vennShadow", x: "-20%", y: "-20%", width: "140%", height: "140%" }, /* @__PURE__ */ React.createElement("feDropShadow", { dx: "0", dy: "4", stdDeviation: "6", floodColor: "rgba(0,0,0,0.08)" }))), /* @__PURE__ */ React.createElement(
      "circle",
      {
        cx: VENN_ZONES.A.x,
        cy: VENN_ZONES.A.y,
        r: VENN_ZONES.A.r,
        fill: "url(#vennGradientA)",
        stroke: "#fda4af",
        strokeWidth: "3",
        filter: "url(#vennShadow)"
      }
    ), /* @__PURE__ */ React.createElement("text", { x: "170", y: "100", textAnchor: "middle", fill: "#be123c", fontSize: "18", fontWeight: "900", opacity: "0.9", style: STYLE_TEXT_SHADOW_WHITE }, generatedContent?.data.branches?.[0]?.title || "Set A"), /* @__PURE__ */ React.createElement(
      "circle",
      {
        cx: VENN_ZONES.B.x,
        cy: VENN_ZONES.B.y,
        r: VENN_ZONES.B.r,
        fill: "url(#vennGradientB)",
        stroke: "#93c5fd",
        strokeWidth: "3",
        filter: "url(#vennShadow)"
      }
    ), /* @__PURE__ */ React.createElement("text", { x: "630", y: "100", textAnchor: "middle", fill: "#1d4ed8", fontSize: "18", fontWeight: "900", opacity: "0.9", style: STYLE_TEXT_SHADOW_WHITE }, generatedContent?.data.branches?.[1]?.title || "Set B"), /* @__PURE__ */ React.createElement("circle", { cx: "400", cy: "250", r: "100", fill: "url(#vennGradientShared)" }), /* @__PURE__ */ React.createElement("text", { x: "400", y: "250", textAnchor: "middle", fill: "#6b21a8", fontSize: "14", fontWeight: "bold", opacity: "0.8", style: { textShadow: "0 1px 2px rgba(255,255,255,0.8)" } }, generatedContent?.data.branches?.[2]?.title || "Shared"), /* @__PURE__ */ React.createElement("line", { x1: "0", y1: "500", x2: "100%", y2: "500", stroke: "#cbd5e1", strokeWidth: "2", strokeDasharray: "6,6" }), /* @__PURE__ */ React.createElement("text", { x: "40", y: "525", fill: "#94a3b8", fontSize: "12", fontWeight: "bold", letterSpacing: "1" }, t("concept_map.venn.item_bank"))) : (challengeFeedback ? challengeFeedback.checkedEdges || [] : conceptMapEdges || []).map((edge) => {
      const fromNode = conceptMapNodes.find((n) => n.id === edge.fromId);
      const toNode = conceptMapNodes.find((n) => n.id === edge.toId);
      if (!fromNode || !toNode) return null;
      let strokeColor = "#94a3b8";
      let strokeWidth = "2";
      if (edge.status === "correct") {
        strokeColor = "#22c55e";
        strokeWidth = "4";
      } else if (edge.status === "incorrect") {
        strokeColor = "#ef4444";
        strokeWidth = "3";
      }
      const isFlowChart = fromNode.type && fromNode.type.startsWith("flow-");
      const pathD = isFlowChart ? getElbowPath(fromNode, toNode) : null;
      return /* @__PURE__ */ React.createElement(
        "g",
        {
          key: edge.id,
          className: !isMapLocked ? "pointer-events-auto cursor-pointer hover:opacity-70 group" : "",
          onClick: () => !isMapLocked && handleDeleteEdge(edge.id)
        },
        /* @__PURE__ */ React.createElement("title", null, t("concept_map.tooltips.delete_edge")),
        isFlowChart ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: pathD, stroke: "transparent", strokeWidth: "20", fill: "none" }), /* @__PURE__ */ React.createElement(
          "path",
          {
            d: pathD,
            stroke: strokeColor,
            strokeWidth,
            fill: "none",
            strokeOpacity: edge.status ? "1" : "0.6",
            strokeDasharray: edge.status === "incorrect" || edge.style === "dashed" ? "5,5" : "none",
            markerEnd: "url(#arrowhead)"
          }
        )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
          "line",
          {
            x1: fromNode.x,
            y1: fromNode.y,
            x2: toNode.x,
            y2: toNode.y,
            stroke: "transparent",
            strokeWidth: "20"
          }
        ), /* @__PURE__ */ React.createElement(
          "line",
          {
            x1: fromNode.x,
            y1: fromNode.y,
            x2: toNode.x,
            y2: toNode.y,
            stroke: edge.style === "dashed" ? "#94a3b8" : strokeColor,
            strokeWidth,
            strokeOpacity: edge.status ? "1" : "0.6",
            strokeDasharray: edge.status === "incorrect" || edge.style === "dashed" ? "5,5" : "none",
            markerEnd: fromNode.type?.startsWith("cause-") || fromNode.type?.startsWith("ce-") || fromNode.type?.startsWith("ps-") || fromNode.type?.startsWith("chain-") ? "url(#arrowhead)" : void 0
          }
        )),
        !isChallengeActive && !isMapLocked && /* @__PURE__ */ React.createElement("g", { className: "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" }, /* @__PURE__ */ React.createElement("circle", { cx: (fromNode.x + toNode.x) / 2, cy: (fromNode.y + toNode.y) / 2, r: "8", fill: "#ef4444" }), /* @__PURE__ */ React.createElement("text", { x: (fromNode.x + toNode.x) / 2, y: (fromNode.y + toNode.y) / 2, dy: "3", textAnchor: "middle", fill: "white", fontSize: "10", fontWeight: "bold" }, "\xD7"))
      );
    }), /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("marker", { id: "arrowhead", markerWidth: "10", markerHeight: "7", refX: "9", refY: "3.5", orient: "auto" }, /* @__PURE__ */ React.createElement("polygon", { points: "0 0, 10 3.5, 0 7", fill: "#94a3b8" }))), !isVenn && (conceptMapNodes || []).filter((node) => node.type && node.type.startsWith("flow-")).map((node) => /* @__PURE__ */ React.createElement(React.Fragment, { key: node.id }, renderFlowShape(node, connectingSourceId === node.id))), !isVenn && connectingSourceId && /* @__PURE__ */ React.createElement("rect", { x: "0", y: "0", width: "100%", height: "100%", fill: "rgba(99, 102, 241, 0.05)", className: "pointer-events-none animate-pulse" })),
    (conceptMapNodes || []).filter((node) => !node.type || !node.type.startsWith("flow-")).map((node) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: node.id,
        style: {
          left: node.x,
          top: node.y,
          transform: "translate(-50%, -50%)",
          transition: draggedNodeId === node.id ? "none" : "left 0.3s ease-out, top 0.3s ease-out, transform 0.2s ease-out"
        },
        className: `
                              absolute z-10 flex items-center justify-center text-center font-bold shadow-md group
                              ${!isMapLocked ? "cursor-grab active:cursor-grabbing" : "cursor-default"}
                              ${node.type === "main" ? "bg-indigo-600 text-white w-40 h-40 rounded-full border-4 border-indigo-200 text-sm shadow-indigo-200" : node.type === "branch" ? "bg-white text-indigo-900 w-32 h-32 rounded-full border-2 border-indigo-200 text-xs shadow-indigo-100" : node.type === "venn-token" ? `bg-${node.colorVariant || "slate"}-50 text-slate-800 px-4 py-2 rounded-xl border-b-4 border-${node.colorVariant || "slate"}-200 text-xs hover:border-${node.colorVariant || "slate"}-400 shadow-sm min-w-[80px] max-w-[150px] hover:scale-105 hover:shadow-lg hover:-translate-y-1 active:border-b-0 active:translate-y-0 transition-all` : node.type === "flow-start" || node.type === "flow-end" ? "bg-slate-800 text-white px-6 py-3 rounded-full border-2 border-slate-600 text-xs uppercase tracking-wider" : node.type === "flow-process" ? "bg-white text-indigo-900 w-48 h-20 rounded-lg border-2 border-indigo-200 text-xs shadow-sm flex items-center justify-center px-4" : node.type === "flow-decision" ? "bg-yellow-50 text-yellow-900 w-32 h-32 rotate-45 border-2 border-yellow-400 text-xs shadow-sm flex items-center justify-center" : node.type === "flow-note" ? "bg-yellow-100 text-yellow-800 px-3 py-2 text-[11px] border border-yellow-200 shadow-sm max-w-[150px] rounded-bl-none" : node.type === "outline-main" ? "bg-slate-900 text-white w-60 py-4 px-6 rounded-xl border-2 border-slate-700 shadow-xl text-sm z-20" : node.type === "outline-branch" ? "bg-white text-indigo-900 w-48 py-3 px-4 rounded-lg border-l-8 border-l-indigo-600 border-y border-r border-slate-200 text-xs shadow-md z-10" : node.type === "outline-item" ? "bg-slate-50 text-slate-700 w-40 py-2 px-3 rounded border border-slate-400 text-[11px] shadow-sm hover:bg-white z-0" : node.type === "ce-main" ? "bg-slate-800 text-white w-56 py-4 px-6 rounded-xl border-2 border-slate-600 shadow-xl text-sm z-20" : node.type === "cause-node" ? "bg-orange-50 text-orange-900 w-48 py-3 px-4 rounded-xl border-l-[6px] border-l-orange-400 border-y border-r border-orange-200 text-xs shadow-md hover:shadow-lg hover:border-orange-300 transition-all" : node.type === "effect-node" ? "bg-teal-50 text-teal-900 w-48 py-3 px-4 rounded-xl border-r-[6px] border-r-teal-400 border-y border-l border-teal-200 text-xs shadow-md hover:shadow-lg hover:border-teal-300 transition-all" : node.type === "chain-node" ? "bg-purple-50 text-purple-900 w-44 py-3 px-4 rounded-lg border-2 border-purple-300 text-xs shadow-md hover:shadow-lg transition-all" : node.type === "ps-problem" ? "bg-red-600 text-white w-64 py-5 px-6 rounded-2xl border-4 border-red-300 text-sm shadow-xl shadow-red-200 z-20" : node.type === "ps-solution" ? "bg-white text-green-900 w-48 py-3 px-4 rounded-xl border-t-[6px] border-t-green-500 border-x border-b border-green-200 text-xs shadow-lg hover:shadow-xl hover:scale-105 transition-all" : node.type === "ps-solution-item" ? "bg-green-50 text-green-800 w-40 py-2 px-3 rounded-lg border border-green-300 text-[11px] shadow-sm hover:bg-green-100 transition-colors" : node.type === "ps-outcome" ? "bg-blue-600 text-white w-56 py-4 px-5 rounded-2xl border-4 border-blue-300 text-sm shadow-xl shadow-blue-200 z-20" : node.type === "ps-outcome-item" ? "bg-blue-50 text-blue-800 w-40 py-2 px-3 rounded-lg border border-blue-300 text-[11px] shadow-sm hover:bg-blue-100 transition-colors" : "bg-slate-50 text-slate-700 w-28 h-28 rounded-full border border-slate-400 text-[11px] hover:bg-white"}
                              ${connectingSourceId === node.id ? "ring-4 ring-yellow-400 ring-offset-2 scale-105" : ""}
                          `,
        onMouseDown: (e) => !isMapLocked && handleNodeMouseDown(e, node.id),
        onClick: (e) => handleNodeClick(e, node.id)
      },
      /* @__PURE__ */ React.createElement("div", { className: `px-2 line-clamp-4 pointer-events-none select-none ${node.type === "flow-decision" ? "-rotate-45" : ""}` }, node.text),
      !isChallengeActive && !isMapLocked && /* @__PURE__ */ React.createElement(
        "button",
        {
          "aria-label": t("common.close_concept_map_challenge"),
          onClick: (e) => {
            e.stopPropagation();
            handleDeleteNode(node.id);
          },
          className: `absolute -top-1 -right-1 bg-red-700 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors z-20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 scale-75 hover:scale-100 ${node.type === "flow-decision" ? "-rotate-45 -translate-y-2 translate-x-2" : ""}`,
          title: t("concept_map.tooltips.delete_node")
        },
        /* @__PURE__ */ React.createElement(X, { size: 12 })
      )
    )),
    /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] text-slate-600 pointer-events-none border border-slate-400 shadow-sm" }, isVenn ? t("concept_map.overlay.venn_instructions") : isChallengeActive ? t("concept_map.overlay.challenge_instructions") : t("concept_map.overlay.standard_instructions")),
    isChallengeActive && challengeFeedback && challengeFeedback.score === 100 && /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 pointer-events-none flex items-center justify-center z-50" }, /* @__PURE__ */ React.createElement(ConfettiExplosion, null))
  ));
};
window.AlloModules = window.AlloModules || {};
window.AlloModules.ViewRenderers = {
  renderFormattedText,
  renderOutlineContent,
  renderInteractiveMap
};
window.AlloModules.ViewRenderersModule = true;
console.log('[ViewRenderers] 3 renderers registered (renderFormattedText, renderOutlineContent, renderInteractiveMap)');
})();
