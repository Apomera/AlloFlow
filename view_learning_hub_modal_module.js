/**
 * AlloFlow LearningHubModal Module
 * Auto-generated. Source: view_learning_hub_modal_source.jsx
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.LearningHubModal) {
    console.log('[CDN] LearningHubModal already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[LearningHubModal] React not found on window'); return; }

function LearningHubModal(props) {
  const {
    setIsAlloHavenOpen,
    setSelHubTab,
    setShowLearningHub,
    setShowLitLab,
    setShowPoetTree,
    setShowSelHub,
    setShowStemLab,
    setShowStoryForge,
    setStemLabTab,
    showLearningHub,
    t
  } = props;
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4", onClick: () => setShowLearningHub(false), role: "button", tabIndex: 0, onKeyDown: (e) => {
    if (e.key === "Escape") setShowLearningHub(false);
  } }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8", role: "dialog", "aria-modal": "true", "aria-label": t("learning_hub.title") || "Learning Tools", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-slate-800 flex items-center gap-2" }, "\u{1F9E9}", " ", t("learning_hub.title") || "Learning Tools"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-600 mt-1" }, t("learning_hub.subtitle") || "Choose a tool to explore")), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowLearningHub(false), className: "text-slate-600 hover:text-slate-600 text-xl", "aria-label": t("learning_hub.close_aria") || "Close learning hub" }, "\u2715")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setShowLearningHub(false);
    setShowStemLab(true);
    setStemLabTab("explore");
  }, className: "flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-indigo-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-4xl" }, "\u{1F52C}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-indigo-800" }, t("learning_hub.stem_title") || "STEM Lab"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-indigo-600 mt-1" }, t("learning_hub.stem_desc") || "40+ interactive math & science explorations"))), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setShowLearningHub(false);
    setShowStoryForge(true);
  }, className: "flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-4xl" }, "\u{1F4D6}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-rose-800" }, t("learning_hub.storyforge_title") || "StoryForge"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-rose-600 mt-1" }, t("learning_hub.storyforge_desc") || "Create illustrated stories with AI writing tools"))), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setShowLearningHub(false);
    setShowLitLab(true);
  }, className: "flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-4xl" }, "\u{1F3AD}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-violet-800" }, t("learning_hub.litlab_title") || "LitLab"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-violet-600 mt-1" }, t("learning_hub.litlab_desc") || "Bring stories to life with character voices & literary analysis"))), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setShowLearningHub(false);
    setShowPoetTree(true);
  }, className: "flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-4xl" }, "\u{1F333}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-teal-800" }, t("learning_hub.poettree_title") || "PoetTree"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-teal-600 mt-1" }, t("learning_hub.poettree_desc") || "Write poems with form scaffolds, rhyme & meter analysis, AI feedback"))), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setShowLearningHub(false);
    setShowSelHub(true);
    setSelHubTab("explore");
  }, className: "flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-4xl" }, "\u{1F496}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-emerald-800" }, t("learning_hub.sel_title") || "SEL Hub"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-emerald-600 mt-1" }, t("learning_hub.sel_desc") || "Social-emotional learning for self-awareness & growth"))), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setShowLearningHub(false);
    setIsAlloHavenOpen(true);
  }, className: "flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-green-50 to-lime-50 border border-green-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-4xl", role: "img", "aria-label": "herb" }, "\u{1F33F}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-green-800" }, "AlloHaven"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-green-700 mt-1" }, "A cozy room you build by focusing and reflecting. Pomodoro + journal + AI decorations. No leaderboards, no streak guilt."))))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.LearningHubModal = { LearningHubModal: LearningHubModal };
  console.log('[CDN] LearningHubModal loaded');
})();
