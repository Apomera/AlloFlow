/* AlloFlow - AGPL-3.0-only. Generated from view_persona_workspace_source.jsx. */
(function() {
"use strict";
if (window.AlloModules && window.AlloModules.PersonaWorkspace) return;
var React = window.React;
function PersonaWorkspaceView({
  ErrorBoundary,
  t,
  isProcessing,
  isGeneratingPersona,
  History,
  personaState,
  setPersonaState,
  isTeacherMode,
  normalizePersonaResumeDays,
  clearPersonaResumeSnapshots,
  addToast,
  generatedContent,
  extractPersonaGroundingDisclosure,
  Sparkles,
  handleTogglePanelSelection,
  openPersonaTeacherEditor,
  handleSelectPersona,
  MessageCircleQuestion,
  CheckCircle2,
  Plus,
  handleStartPanelChat,
  RefreshCw,
  Users,
  personaTeacherEditor,
  setPersonaTeacherEditor,
  personaTeacherEditorRef,
  updatePersonaTeacherEditor,
  getPersonaVoiceOptions,
  savePersonaTeacherEditor
}) {
  return /* @__PURE__ */ React.createElement(ErrorBoundary, { fallbackMessage: t("persona.error_boundary_fallback") }, /* @__PURE__ */ React.createElement("div", { className: "h-full flex flex-col relative", "data-help-key": "persona_panel", "aria-busy": isProcessing || isGeneratingPersona }, /* @__PURE__ */ React.createElement("div", { className: "bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-2 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 w-full sm:w-auto" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center border-2 border-yellow-200 text-yellow-700 shrink-0" }, /* @__PURE__ */ React.createElement(History, { size: 20 })), /* @__PURE__ */ React.createElement("div", { className: "text-start flex-grow" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-black text-slate-800 leading-tight" }, t("persona.setup_title")), /* @__PURE__ */ React.createElement("p", { className: "text-slate-600 text-xs truncate max-w-[300px] hidden sm:block" }, personaState.mode === "single" ? t("persona.instruction_single") : t("persona.instruction_panel", { current: personaState.selectedCharacters.length })))), /* @__PURE__ */ React.createElement("div", { className: "flex bg-white/60 p-1 rounded-lg border border-yellow-200 shrink-0" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "aria-pressed": personaState.mode === "single",
      "aria-label": t("persona.mode_single") || "Single interview",
      disabled: isProcessing || isGeneratingPersona,
      onClick: () => {
        if (isProcessing || isGeneratingPersona) return;
        setPersonaState((prev) => ({ ...prev, mode: "single", selectedCharacters: [] }));
      },
      className: `px-3 py-1.5 rounded-md text-xs font-bold transition-all ${personaState.mode === "single" ? "bg-white text-yellow-900 shadow-sm ring-1 ring-yellow-200" : "text-yellow-700 hover:bg-yellow-100"}`
    },
    t("persona.mode_single")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "aria-pressed": personaState.mode === "panel",
      "aria-label": t("persona.mode_panel") || "Panel interview",
      disabled: isProcessing || isGeneratingPersona,
      onClick: () => {
        if (isProcessing || isGeneratingPersona) return;
        setPersonaState((prev) => ({ ...prev, mode: "panel" }));
      },
      className: `px-3 py-1.5 rounded-md text-xs font-bold transition-all ${personaState.mode === "panel" ? "bg-white text-yellow-900 shadow-sm ring-1 ring-yellow-200" : "text-yellow-700 hover:bg-yellow-100"}`
    },
    t("persona.mode_panel")
  )), isTeacherMode && /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-2 py-1 text-[11px] font-bold text-slate-700" }, /* @__PURE__ */ React.createElement("span", null, t("persona.resume_retention")), /* @__PURE__ */ React.createElement("select", { "aria-label": t("persona.resume_retention"), disabled: isProcessing || isGeneratingPersona, defaultValue: (() => {
    try {
      return String(normalizePersonaResumeDays(localStorage.getItem("allo_persona_resume_days")));
    } catch (_) {
      return "14";
    }
  })(), onChange: async (e) => {
    try {
      const retentionDays = normalizePersonaResumeDays(e.target.value);
      localStorage.setItem("allo_persona_resume_days", String(retentionDays));
      if (retentionDays === 0 && !await clearPersonaResumeSnapshots()) throw new Error("clear failed");
      addToast(t("persona.retention_updated"), "success");
    } catch (_) {
      addToast(t("persona.retention_update_failed"), "error");
    }
  }, className: "rounded border border-slate-300 bg-white px-1.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60" }, /* @__PURE__ */ React.createElement("option", { value: "0" }, t("persona.retention_off")), /* @__PURE__ */ React.createElement("option", { value: "7" }, "7 ", t("persona.days")), /* @__PURE__ */ React.createElement("option", { value: "14" }, "14 ", t("persona.days")), /* @__PURE__ */ React.createElement("option", { value: "30" }, "30 ", t("persona.days"))))), (() => {
    const sourceBinding = generatedContent?.config?.personaSource;
    const groundingMetadata = sourceBinding?.groundingMetadata ?? generatedContent?.config?.groundingMetadata;
    const grounding = extractPersonaGroundingDisclosure(groundingMetadata);
    const sourceTopic = String(sourceBinding?.topic || "").trim().slice(0, 300);
    const sourceFingerprint = String(sourceBinding?.fingerprint || "").trim().slice(0, 160);
    const sourceExcerpt = String(sourceBinding?.excerpt || "").trim().slice(0, 800);
    if (!sourceBinding && grounding.links.length === 0 && grounding.queries.length === 0) return null;
    const disclosureCount = grounding.links.length + grounding.queries.length + (sourceBinding ? 1 : 0);
    return /* @__PURE__ */ React.createElement("details", { className: "mx-3 mb-2 max-h-40 shrink-0 overflow-auto rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-slate-700" }, /* @__PURE__ */ React.createElement("summary", { className: "cursor-pointer font-bold text-sky-900" }, t("persona.verified_sources") || "Sources and search context", " (", disclosureCount, ")"), sourceBinding && /* @__PURE__ */ React.createElement("div", { className: "mt-2 rounded-md border border-sky-100 bg-white/70 p-2" }, sourceTopic && /* @__PURE__ */ React.createElement("p", { className: "font-bold text-slate-800" }, sourceTopic), sourceFingerprint && /* @__PURE__ */ React.createElement("p", { className: "mt-1 break-all font-mono text-[10px] text-slate-500", "aria-label": t("persona.source_fingerprint") || "Source fingerprint" }, sourceFingerprint), sourceExcerpt && /* @__PURE__ */ React.createElement("blockquote", { className: "mt-2 border-s-2 border-sky-200 ps-2 text-slate-600", "aria-label": t("persona.bound_source_excerpt") || "Bound lesson source excerpt" }, sourceExcerpt, String(sourceBinding?.excerpt || "").trim().length > sourceExcerpt.length ? "\u2026" : "")), grounding.links.length > 0 && /* @__PURE__ */ React.createElement("ul", { className: "mt-2 list-disc space-y-1 ps-5" }, grounding.links.map((source, sourceIndex) => /* @__PURE__ */ React.createElement("li", { key: source.url }, /* @__PURE__ */ React.createElement("a", { href: source.url, target: "_blank", rel: "noopener noreferrer", className: "font-semibold text-sky-800 underline decoration-sky-300 hover:text-sky-950" }, source.title || "Source " + (sourceIndex + 1))))), grounding.queries.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-2" }, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-slate-700" }, t("persona.source_queries") || "Search queries used"), /* @__PURE__ */ React.createElement("ul", { className: "mt-1 list-disc space-y-1 ps-5" }, grounding.queries.map((query) => /* @__PURE__ */ React.createElement("li", { key: query }, query)))));
  })(), /* @__PURE__ */ React.createElement("div", { className: "flex flex-nowrap gap-6 overflow-auto p-6 custom-scrollbar flex-grow items-center snap-x snap-mandatory z-10 w-full bg-slate-50/50 relative" }, isGeneratingPersona && /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite", className: "absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("div", { className: "w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin motion-reduce:animate-none" }), /* @__PURE__ */ React.createElement(Sparkles, { size: 28, className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-600 animate-pulse motion-reduce:animate-none" })), /* @__PURE__ */ React.createElement("p", { className: "mt-6 text-lg font-bold text-slate-700" }, t("persona.identifying")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-600 mt-1" }, t("persona.analyzing_historical_figures") || "Analyzing content for historical figures...")), (Array.isArray(generatedContent?.data) ? generatedContent?.data : []).map((persona, idx) => {
    const isSelectedInPanel = personaState.mode === "panel" && personaState.selectedCharacters.some((c) => c.name === persona.name);
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: idx,
        className: `
                                        min-w-[300px] w-[320px] h-[500px] max-h-[75vh] snap-center shrink-0
                                        bg-white rounded-2xl border-2 transition-all p-6 flex flex-col relative group overflow-hidden cursor-pointer shadow-md hover:shadow-xl hover:-translate-y-2 duration-300
                                        ${isSelectedInPanel ? "border-purple-500 ring-4 ring-purple-100" : "border-slate-100 hover:border-yellow-300"}
                                    `,
        "data-help-key": "persona_card",
        "aria-disabled": isProcessing || isGeneratingPersona,
        onClick: () => {
          if (isProcessing || isGeneratingPersona) return;
          if (personaState.mode === "panel") handleTogglePanelSelection(persona);
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "absolute -bottom-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500" }, /* @__PURE__ */ React.createElement(History, { size: 120, className: "text-indigo-900" })),
      /* @__PURE__ */ React.createElement("div", { className: "mb-4 relative z-10" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "inline-block bg-yellow-100 text-yellow-800 text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-yellow-200" }, persona.year), isTeacherMode && /* @__PURE__ */ React.createElement("button", { type: "button", disabled: isProcessing || isGeneratingPersona, className: "rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50", onClick: (e) => {
        e.stopPropagation();
        if (isProcessing || isGeneratingPersona) return;
        openPersonaTeacherEditor(persona, idx);
      } }, t("common.edit"))), /* @__PURE__ */ React.createElement("h3", { className: "font-black text-2xl text-slate-800 leading-tight mb-1 group-hover:text-indigo-900 transition-colors line-clamp-2" }, persona.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold text-slate-600 uppercase tracking-wider line-clamp-1" }, persona.role)),
      /* @__PURE__ */ React.createElement("div", { className: "text-sm text-slate-600 leading-relaxed mb-6 flex-grow relative z-10 border-t border-slate-100 pt-3 overflow-y-auto custom-scrollbar" }, persona.context),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "aria-label": (personaState.mode === "single" ? t("common.ask_question") || "Ask a question" : isSelectedInPanel ? t("persona.selected") || "Selected" : t("persona.add_to_panel") || "Add to panel") + ": " + String(persona.name || ""),
          "aria-pressed": personaState.mode === "panel" ? isSelectedInPanel : void 0,
          disabled: isProcessing || isGeneratingPersona,
          "data-help-key": "persona_select_button",
          onClick: (e) => {
            e.stopPropagation();
            if (isProcessing || isGeneratingPersona) return;
            if (personaState.mode === "single") {
              handleSelectPersona(persona);
            } else {
              handleTogglePanelSelection(persona);
            }
          },
          className: `w-full py-3 border-2 rounded-xl font-bold text-sm transition-all shadow-sm relative z-10 flex items-center justify-center gap-2 group/btn
                                        ${personaState.mode === "single" ? "bg-white border-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600" : isSelectedInPanel ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-purple-100 text-purple-700 hover:bg-purple-50"}
                                        `
        },
        personaState.mode === "single" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(MessageCircleQuestion, { size: 18, className: "group-hover/btn:animate-bounce" }), " ", t("persona.select")) : /* @__PURE__ */ React.createElement(React.Fragment, null, isSelectedInPanel ? /* @__PURE__ */ React.createElement(CheckCircle2, { size: 18 }) : /* @__PURE__ */ React.createElement(Plus, { size: 18 }), " ", isSelectedInPanel ? t("persona.selected") : t("persona.add_to_panel"))
      )
    );
  }), (!generatedContent?.data || Array.isArray(generatedContent?.data) && generatedContent?.data.length === 0) && /* @__PURE__ */ React.createElement("div", { className: "w-full text-center text-slate-600 py-12 italic" }, t("persona.no_candidates"))), personaState.mode === "panel" && /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-6 left-1/2 -translate-x-1/2 z-30" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.start_panel_chat"),
      onClick: handleStartPanelChat,
      disabled: personaState.selectedCharacters.length !== 2 || isProcessing || isGeneratingPersona,
      "aria-busy": isProcessing || isGeneratingPersona,
      className: "bg-purple-600 text-white px-8 py-4 rounded-full font-black text-lg shadow-xl hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 active:scale-95"
    },
    isProcessing || isGeneratingPersona ? /* @__PURE__ */ React.createElement(RefreshCw, { className: "animate-spin motion-reduce:animate-none" }) : /* @__PURE__ */ React.createElement(Users, { size: 24 }),
    t("persona.start_panel")
  )), isTeacherMode && personaTeacherEditor && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm",
      onMouseDown: (event) => {
        if (event.target === event.currentTarget) setPersonaTeacherEditor(null);
      }
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: personaTeacherEditorRef,
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "persona-teacher-editor-title",
        tabIndex: -1,
        onKeyDown: (event) => {
          if (event.key === "Escape") setPersonaTeacherEditor(null);
        },
        className: "max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-indigo-200 bg-white shadow-2xl"
      },
      /* @__PURE__ */ React.createElement("div", { className: "sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { id: "persona-teacher-editor-title", className: "text-lg font-black text-slate-900" }, t("persona.edit_title") || "Edit interview character"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-600" }, personaTeacherEditor.candidateName)), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          autoFocus: true,
          "aria-label": t("common.close"),
          onClick: () => setPersonaTeacherEditor(null),
          className: "rounded-lg border border-slate-200 px-3 py-1.5 text-lg font-bold text-slate-600 hover:bg-slate-100"
        },
        "\xD7"
      )),
      /* @__PURE__ */ React.createElement("div", { className: "space-y-5 p-5" }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 md:grid-cols-2" }, /* @__PURE__ */ React.createElement("label", { className: "space-y-1 text-sm font-bold text-slate-700" }, /* @__PURE__ */ React.createElement("span", null, t("persona.edit_role") || "Role"), /* @__PURE__ */ React.createElement(
        "input",
        {
          value: personaTeacherEditor.role,
          maxLength: 200,
          onChange: (event) => updatePersonaTeacherEditor({ role: event.target.value }),
          className: "w-full rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900"
        }
      )), /* @__PURE__ */ React.createElement("label", { className: "space-y-1 text-sm font-bold text-slate-700" }, /* @__PURE__ */ React.createElement("span", null, t("persona.edit_voice") || "TTS voice"), /* @__PURE__ */ React.createElement(
        "select",
        {
          value: personaTeacherEditor.voice,
          onChange: (event) => updatePersonaTeacherEditor({ voice: event.target.value }),
          disabled: getPersonaVoiceOptions().length === 0,
          className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900 disabled:bg-slate-100"
        },
        getPersonaVoiceOptions().length === 0 ? /* @__PURE__ */ React.createElement("option", { value: personaTeacherEditor.voice }, personaTeacherEditor.voice || t("persona.no_voice_available") || "Use the default voice") : getPersonaVoiceOptions().map((voice) => /* @__PURE__ */ React.createElement("option", { key: voice, value: voice }, voice))
      ))), /* @__PURE__ */ React.createElement("label", { className: "block space-y-1 text-sm font-bold text-slate-700" }, /* @__PURE__ */ React.createElement("span", null, t("persona.edit_context") || "Character context"), /* @__PURE__ */ React.createElement(
        "textarea",
        {
          value: personaTeacherEditor.context,
          maxLength: 2e3,
          rows: 4,
          onChange: (event) => updatePersonaTeacherEditor({ context: event.target.value }),
          className: "w-full resize-y rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900"
        }
      )), /* @__PURE__ */ React.createElement("label", { className: "block space-y-1 text-sm font-bold text-slate-700" }, /* @__PURE__ */ React.createElement("span", null, t("persona.edit_guardrails") || "Interview guardrails"), /* @__PURE__ */ React.createElement(
        "textarea",
        {
          value: personaTeacherEditor.guardrails,
          maxLength: 1500,
          rows: 3,
          onChange: (event) => updatePersonaTeacherEditor({ guardrails: event.target.value }),
          className: "w-full resize-y rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900"
        }
      )), /* @__PURE__ */ React.createElement("fieldset", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("legend", { className: "text-sm font-black text-slate-800" }, t("persona.edit_quests") || "Quest objectives"), (personaTeacherEditor.quests || []).map((quest, questIndex) => /* @__PURE__ */ React.createElement("div", { key: quest.id || questIndex, className: "grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_150px_auto] md:items-end" }, /* @__PURE__ */ React.createElement("label", { className: "space-y-1 text-xs font-bold text-slate-700" }, /* @__PURE__ */ React.createElement("span", null, (t("persona.quest") || "Quest") + " " + (questIndex + 1)), /* @__PURE__ */ React.createElement(
        "input",
        {
          value: quest.text,
          maxLength: 500,
          onChange: (event) => updatePersonaTeacherEditor({
            quests: personaTeacherEditor.quests.map((item, index) => index === questIndex ? { ...item, text: event.target.value } : item)
          }),
          className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900"
        }
      )), /* @__PURE__ */ React.createElement("label", { className: "space-y-1 text-xs font-bold text-slate-700" }, /* @__PURE__ */ React.createElement("span", null, t("persona.quest_difficulty") || "Required rapport (0\u2013100)"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          min: 0,
          max: 100,
          step: 1,
          value: quest.difficulty,
          onChange: (event) => updatePersonaTeacherEditor({
            quests: personaTeacherEditor.quests.map((item, index) => index === questIndex ? { ...item, difficulty: event.target.value } : item)
          }),
          className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900"
        }
      )), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          disabled: quest.isCompleted,
          title: quest.isCompleted ? t("persona.completed") || "Completed quests are preserved" : void 0,
          onClick: () => updatePersonaTeacherEditor({
            quests: personaTeacherEditor.quests.filter((_, index) => index !== questIndex)
          }),
          className: "rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        },
        quest.isCompleted ? t("persona.completed") || "Completed" : t("persona.remove_quest") || "Remove"
      ))), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          disabled: (personaTeacherEditor.quests || []).length >= 6,
          onClick: () => {
            const quests = personaTeacherEditor.quests || [];
            updatePersonaTeacherEditor({
              quests: [...quests, {
                id: "teacher-q-" + Date.now() + "-" + (quests.length + 1),
                text: "",
                difficulty: 20,
                isCompleted: false
              }]
            });
          },
          className: "rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
        },
        "+ ",
        t("persona.add_quest") || "Add quest"
      ))),
      /* @__PURE__ */ React.createElement("div", { className: "sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setPersonaTeacherEditor(null), className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100" }, t("common.cancel")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: savePersonaTeacherEditor, className: "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700" }, t("persona.save_changes") || t("common.save")))
    )
  )));
}

window.AlloModules = window.AlloModules || {};
window.AlloModules.PersonaWorkspace = { PersonaWorkspaceView };
})();
