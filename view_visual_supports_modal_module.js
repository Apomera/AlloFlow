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

function VisualSupportsModal(props) {
  const { setShowVisualSupports, setVsTab, showVisualSupports, vsTab } = props;
  const vsBoards = (() => {
    try {
      return JSON.parse(localStorage.getItem("alloSymbolBoards") || "[]");
    } catch (e) {
      return [];
    }
  })();
  const vsSchedules = (() => {
    try {
      return JSON.parse(localStorage.getItem("alloSchedules") || "[]");
    } catch (e) {
      return [];
    }
  })();
  const CAT_BG = { noun: "#fef9c3", verb: "#dcfce7", adjective: "#dbeafe", other: "#f3f4f6" };
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[9000] bg-black/70 backdrop-blur-sm flex items-stretch justify-center p-3", onClick: () => setShowVisualSupports(false) }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl w-full max-w-3xl flex flex-col overflow-hidden shadow-2xl", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { style: { background: "linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)" }, className: "p-4 flex items-center justify-between flex-shrink-0" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-white font-bold text-lg" }, "\u{1F5BC}\uFE0F Visual Supports"), /* @__PURE__ */ React.createElement("p", { className: "text-purple-200 text-xs mt-0.5" }, "Your saved boards & schedules")), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowVisualSupports(false), className: "text-white/70 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center" }, "\xD7")), /* @__PURE__ */ React.createElement("div", { className: "flex border-b border-slate-200 bg-slate-50 flex-shrink-0" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setVsTab("boards"), className: `flex-1 py-3 text-sm font-semibold transition-colors ${vsTab === "boards" ? "text-purple-700 border-b-2 border-purple-600 bg-white" : "text-slate-600 hover:text-slate-700"}` }, "\u{1F4CB} Boards (", vsBoards.length, ")"), /* @__PURE__ */ React.createElement("button", { onClick: () => setVsTab("schedules"), className: `flex-1 py-3 text-sm font-semibold transition-colors ${vsTab === "schedules" ? "text-purple-700 border-b-2 border-purple-600 bg-white" : "text-slate-600 hover:text-slate-700"}` }, "\u{1F4C5} Schedules (", vsSchedules.length, ")")), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto p-4 space-y-6" }, vsTab === "boards" && (vsBoards.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center py-16 text-slate-600" }, /* @__PURE__ */ React.createElement("div", { className: "text-5xl mb-3" }, "\u{1F4CB}"), /* @__PURE__ */ React.createElement("p", { className: "font-semibold" }, "No saved boards yet"), /* @__PURE__ */ React.createElement("p", { className: "text-sm mt-1" }, "Save boards in Symbol Studio to see them here")) : vsBoards.map((board) => /* @__PURE__ */ React.createElement("div", { key: board.id, className: "border border-slate-400 rounded-xl overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 px-4 py-2 font-semibold text-slate-700 text-sm border-b border-slate-200" }, board.title || "Untitled Board"), /* @__PURE__ */ React.createElement("div", { className: "p-3", style: { display: "grid", gridTemplateColumns: `repeat(${Math.min(board.cols || 4, 6)},1fr)`, gap: 6 } }, (board.words || []).map((word, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { background: CAT_BG[word.category] || "#f3f4f6", borderRadius: 8, padding: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 } }, word.image ? /* @__PURE__ */ React.createElement("img", { src: word.image, style: { width: 56, height: 56, objectFit: "contain" }, alt: word.label }) : /* @__PURE__ */ React.createElement("div", { style: { width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#d1d5db" } }, "?"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, fontWeight: 600, textAlign: "center", color: "#1f2937", lineHeight: 1.2 } }, word.label))))))), vsTab === "schedules" && (vsSchedules.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center py-16 text-slate-600" }, /* @__PURE__ */ React.createElement("div", { className: "text-5xl mb-3" }, "\u{1F4C5}"), /* @__PURE__ */ React.createElement("p", { className: "font-semibold" }, "No saved schedules yet"), /* @__PURE__ */ React.createElement("p", { className: "text-sm mt-1" }, "Save schedules in Symbol Studio to see them here")) : vsSchedules.map((sched) => /* @__PURE__ */ React.createElement("div", { key: sched.id, className: "border border-slate-400 rounded-xl overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 px-4 py-2 font-semibold text-slate-700 text-sm border-b border-slate-200" }, sched.title || "Untitled Schedule"), /* @__PURE__ */ React.createElement("div", { className: "p-3 overflow-x-auto" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, minWidth: "max-content" } }, (sched.items || []).map((item, i) => /* @__PURE__ */ React.createElement("div", { key: item.id || i, style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 72 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 72, height: 72, border: "2px solid #e5e7eb", borderRadius: 10, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "#fafafa" } }, item.image ? /* @__PURE__ */ React.createElement("img", { src: item.image, style: { width: "100%", height: "100%", objectFit: "contain" }, alt: item.label }) : /* @__PURE__ */ React.createElement("span", { style: { fontSize: 28, color: "#d1d5db" } }, "?")), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 600, textAlign: "center", color: "#374151", lineHeight: 1.2 } }, item.label)))))))))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.VisualSupportsModal = { VisualSupportsModal: VisualSupportsModal };
  console.log('[CDN] VisualSupportsModal loaded');
})();
