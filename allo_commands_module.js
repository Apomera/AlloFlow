/**
 * AlloFlow AlloCommands Module (Agentic AlloBot S0)
 * Auto-generated. Source: allo_commands_source.jsx
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.AlloCommands) {
    console.log('[CDN] AlloCommands already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[AlloCommands] React not found on window'); return; }

const { useState, useEffect, useRef, useMemo, useCallback } = React;
const _mkT = (rawT) => (k, f) => {
  let r = null;
  try {
    r = rawT ? rawT(k) : null;
  } catch (_) {
  }
  return r && r !== k ? r : f || k;
};
function buildAlloCommands(ctx) {
  const t = _mkT(ctx && ctx.t);
  const cmds = [
    // ── Navigate ──
    { id: "open_educator_hub", icon: "\u{1F3EB}", roles: "teacher", label: t("cmd.open_educator_hub", "Open the Educator Hub"), aliases: ["educator hub", "teacher hub", "hub", "document pipeline", "remediation pipeline", "make a document accessible", "fix a pdf"], hint: t("cmd.open_educator_hub_hint", "Lesson tools + the Document Pipeline card"), run: (c) => {
      c.setShowEducatorHub(true);
      return t("cmd.open_educator_hub_done", "Educator Hub opened \u2014 the Document Pipeline card is near the top.");
    } },
    { id: "open_learning_hub", icon: "\u{1F393}", roles: "all", label: t("cmd.open_learning_hub", "Open the Learning Hub"), aliases: ["learning hub", "student hub", "games"], hint: t("cmd.open_learning_hub_hint", "Games, practice, and study tools"), run: (c) => {
      c.setShowLearningHub(true);
      return t("cmd.open_learning_hub_done", "Learning Hub opened.");
    } },
    { id: "open_document_builder", icon: "\u{1F4DD}", roles: "teacher", label: t("cmd.open_document_builder", "Open the Document Builder"), aliases: ["document builder", "builder", "export preview", "differentiate"], hint: t("cmd.open_document_builder_hint", "Build and export differentiated documents"), run: (c) => {
      c.openExportPreview();
      return t("cmd.open_document_builder_done", "Document Builder opened.");
    } },
    { id: "open_wizard", icon: "\u{1FA84}", roles: "teacher", label: t("cmd.open_wizard", "Start the lesson wizard"), aliases: ["wizard", "new lesson", "create lesson", "guided setup"], hint: t("cmd.open_wizard_hint", "Step-by-step lesson creation"), run: (c) => {
      c.setShowWizard(true);
      return t("cmd.open_wizard_done", "Lesson wizard started.");
    } },
    { id: "open_notebook", icon: "\u{1F4D3}", roles: "all", label: t("cmd.open_notebook", "Open my notebook"), aliases: ["notebook", "notes"], hint: t("cmd.open_notebook_hint", "Saved notes and entries"), run: (c) => {
      c.setShowNotebook(true);
      return t("cmd.open_notebook_done", "Notebook opened.");
    } },
    { id: "open_translate", icon: "\u{1F310}", roles: "teacher", label: t("cmd.open_translate", "Open translation"), aliases: ["translate", "translation", "language"], hint: t("cmd.open_translate_hint", "Translate the current content"), run: (c) => {
      c.openTranslateModal();
      return t("cmd.open_translate_done", "Translation dialog opened.");
    } },
    { id: "open_class_session", icon: "\u{1F465}", roles: "teacher", label: t("cmd.open_class_session", "Open class session"), aliases: ["class session", "session", "live class", "class code"], hint: t("cmd.open_class_session_hint", "Start or join a live class session"), run: (c) => {
      c.setShowSessionModal(true);
      return t("cmd.open_class_session_done", "Class session dialog opened.");
    } },
    { id: "open_class_analytics", icon: "\u{1F4C8}", roles: "teacher", label: t("cmd.open_class_analytics", "Open class analytics"), aliases: ["analytics", "class data", "progress data"], hint: t("cmd.open_class_analytics_hint", "Whole-class progress"), run: (c) => {
      c.setShowClassAnalytics(true);
      return t("cmd.open_class_analytics_done", "Class analytics opened.");
    } },
    { id: "open_export_menu", icon: "\u{1F4E4}", roles: "teacher", label: t("cmd.open_export_menu", "Open the export menu"), aliases: ["export", "download menu", "share"], hint: t("cmd.open_export_menu_hint", "Export the current content"), run: (c) => {
      c.setShowExportMenu(true);
      return t("cmd.open_export_menu_done", "Export menu opened.");
    } },
    { id: "open_ai_settings", icon: "\u{1F916}", roles: "teacher", label: t("cmd.open_ai_settings", "Open AI settings"), aliases: ["ai settings", "ai backend", "api key", "model settings"], hint: t("cmd.open_ai_settings_hint", "Configure the AI backend"), run: (c) => {
      c.setShowAIBackendModal(true);
      return t("cmd.open_ai_settings_done", "AI settings opened.");
    } },
    // ── Accessibility self-service (available in every mode) ──
    { id: "font_bigger", icon: "\u{1F50D}", roles: "all", label: t("cmd.font_bigger", "Make the text bigger"), aliases: ["bigger text", "larger text", "increase font", "zoom in text"], hint: t("cmd.font_bigger_hint", "+2 to the reading font size"), run: (c) => {
      const v = c.fontBigger();
      return t("cmd.font_bigger_done", "Text size increased to ") + v + ".";
    } },
    { id: "font_smaller", icon: "\u{1F50E}", roles: "all", label: t("cmd.font_smaller", "Make the text smaller"), aliases: ["smaller text", "decrease font", "reduce text"], hint: t("cmd.font_smaller_hint", "\u22122 to the reading font size"), run: (c) => {
      const v = c.fontSmaller();
      return t("cmd.font_smaller_done", "Text size decreased to ") + v + ".";
    } },
    { id: "font_reset", icon: "\u21A9\uFE0F", roles: "all", label: t("cmd.font_reset", "Reset the text size"), aliases: ["reset font", "normal text size", "default font"], hint: t("cmd.font_reset_hint", "Back to the default size"), run: (c) => {
      c.resetFontSize();
      return t("cmd.font_reset_done", "Text size reset to default.");
    } },
    { id: "open_text_settings", icon: "\u{1F524}", roles: "all", label: t("cmd.open_text_settings", "Open text settings"), aliases: ["text settings", "font settings", "dyslexia font", "spacing"], hint: t("cmd.open_text_settings_hint", "Font, spacing, and color options"), run: (c) => {
      c.setShowTextSettings(true);
      return t("cmd.open_text_settings_done", "Text settings opened.");
    } },
    { id: "open_voice_settings", icon: "\u{1F5E3}\uFE0F", roles: "all", label: t("cmd.open_voice_settings", "Open voice settings"), aliases: ["voice settings", "speech settings", "tts settings", "speaking voice"], hint: t("cmd.open_voice_settings_hint", "Voice, speed, and volume"), run: (c) => {
      c.setShowVoiceSettings(true);
      return t("cmd.open_voice_settings_done", "Voice settings opened.");
    } },
    { id: "read_this_page", icon: "\u{1F4D6}", roles: "all", label: t("cmd.read_this_page", "Read this page to me"), aliases: ["read aloud", "read page", "read it", "listen"], hint: t("cmd.read_this_page_hint", "Opens the page reader"), run: (c) => {
      c.setShowReadThisPage(true);
      return t("cmd.read_this_page_done", "Page reader opened \u2014 choose where to start.");
    } },
    { id: "toggle_focus_mode", icon: "\u{1F3AF}", roles: "all", label: t("cmd.toggle_focus_mode", "Toggle focus mode"), aliases: ["focus mode", "concentrate", "distraction free"], hint: t("cmd.toggle_focus_mode_hint", "Dim everything but the content"), run: (c) => {
      c.handleToggleFocusMode();
      return t("cmd.toggle_focus_mode_done", "Focus mode toggled.");
    } },
    { id: "toggle_reading_ruler", icon: "\u{1F4CF}", roles: "all", label: t("cmd.toggle_reading_ruler", "Toggle the reading ruler"), aliases: ["reading ruler", "line guide", "ruler"], hint: t("cmd.toggle_reading_ruler_hint", "A movable line guide for tracking"), run: (c) => {
      c.handleToggleReadingRuler();
      return t("cmd.toggle_reading_ruler_done", "Reading ruler toggled.");
    } },
    { id: "toggle_help_mode", icon: "\u2753", roles: "all", label: t("cmd.toggle_help_mode", "Toggle help mode"), aliases: ["help mode", "what does this do", "explain buttons"], hint: t("cmd.toggle_help_mode_hint", "Click anything to learn what it does"), run: (c) => {
      c.handleToggleIsHelpMode();
      return t("cmd.toggle_help_mode_done", "Help mode toggled \u2014 click any control to learn about it.");
    } },
    { id: "toggle_bot", icon: "\u{1F916}", roles: "all", label: t("cmd.toggle_bot", "Show or hide AlloBot"), aliases: ["allobot", "bot", "assistant", "hide bot", "show bot"], hint: t("cmd.toggle_bot_hint", "The assistant character"), run: (c) => {
      c.handleToggleIsBotVisible();
      return t("cmd.toggle_bot_done", "AlloBot visibility toggled.");
    } }
  ];
  const isStudentish = !!(ctx.isStudentLinkMode || ctx.isIndependentMode);
  return cmds.filter((c) => c.roles === "all" || !isStudentish);
}
function scoreCommand(cmd, q) {
  if (!q) return 1;
  const needle = q.toLowerCase().trim();
  let best = 0;
  const texts = [cmd.label].concat(cmd.aliases || []);
  for (const raw of texts) {
    const s = String(raw || "").toLowerCase();
    if (s === needle) best = Math.max(best, 100);
    else if (s.startsWith(needle)) best = Math.max(best, 80);
    else if (s.split(/\s+/).some((w) => w.startsWith(needle))) best = Math.max(best, 60);
    else if (s.includes(needle)) best = Math.max(best, 40);
  }
  return best;
}
const AlloCommandPalette = ({ ctx }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const [confirming, setConfirming] = useState(null);
  const inputRef = useRef(null);
  const prevFocusRef = useRef(null);
  const t = _mkT(ctx && ctx.t);
  const commands = useMemo(() => ctx ? buildAlloCommands(ctx) : [], [ctx]);
  const matches = useMemo(() => {
    const scored = commands.map((c) => ({ c, s: scoreCommand(c, query) })).filter((x) => x.s > 0);
    scored.sort((a, b) => b.s - a.s);
    return scored.map((x) => x.c).slice(0, 9);
  }, [commands, query]);
  useEffect(() => {
    const onKey = (e) => {
      const k = (e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && k === "k" || (e.ctrlKey || e.metaKey) && e.shiftKey && k === "p") {
        e.preventDefault();
        setOpen((v) => {
          if (!v) {
            try {
              prevFocusRef.current = document.activeElement;
            } catch (_) {
            }
          }
          return !v;
        });
        setQuery("");
        setSel(0);
        setConfirming(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
    if (!open && prevFocusRef.current) {
      try {
        prevFocusRef.current.focus();
      } catch (_) {
      }
      prevFocusRef.current = null;
    }
  }, [open]);
  useEffect(() => {
    setSel(0);
  }, [query]);
  const announce = useCallback((msg) => {
    try {
      if (window.alloAnnounce) window.alloAnnounce(msg);
    } catch (_) {
    }
    try {
      if (ctx && ctx.addToast) ctx.addToast(msg, "success");
    } catch (_) {
    }
  }, [ctx]);
  const runCmd = useCallback((cmd) => {
    if (!cmd) return;
    if (cmd.destructive && (!confirming || confirming !== cmd.id)) {
      setConfirming(cmd.id);
      return;
    }
    setConfirming(null);
    let msg = null;
    try {
      msg = cmd.run(ctx);
    } catch (e) {
      try {
        ctx.addToast(t("cmd.failed", "That didn\u2019t work: ") + (e && e.message || "unknown"), "error");
      } catch (_) {
      }
      setOpen(false);
      return;
    }
    setOpen(false);
    if (msg) announce(msg);
  }, [ctx, confirming, announce, t]);
  if (!open) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[12000] flex items-start justify-center pt-[14vh] px-4", role: "presentation", onClick: () => setOpen(false) }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-slate-900/50", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": t("palette.aria", "AlloFlow command palette"),
      "data-help-ignore": "true",
      className: "relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-indigo-200 overflow-hidden",
      onClick: (e) => e.stopPropagation()
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 px-4 py-3 border-b border-slate-200" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u26A1"), /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: inputRef,
        value: query,
        onChange: (e) => setQuery(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSel((s) => Math.min(s + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSel((s) => Math.max(s - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            runCmd(matches[sel]);
          } else if (e.key === "Escape") {
            e.preventDefault();
            if (confirming) setConfirming(null);
            else setOpen(false);
          }
        },
        placeholder: t("palette.placeholder", "Type a command \u2014 \u201Cbigger text\u201D, \u201Ceducator hub\u201D, \u201Cread this page\u201D\u2026"),
        "aria-label": t("palette.input_aria", "Search commands"),
        role: "combobox",
        "aria-expanded": "true",
        "aria-controls": "allo-palette-list",
        "aria-activedescendant": matches[sel] ? "allo-cmd-" + matches[sel].id : void 0,
        className: "flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder:text-slate-500"
      }
    ), /* @__PURE__ */ React.createElement("kbd", { className: "text-[10px] text-slate-500 border border-slate-300 rounded px-1.5 py-0.5" }, "Esc")),
    /* @__PURE__ */ React.createElement("ul", { id: "allo-palette-list", role: "listbox", "aria-label": t("palette.list_aria", "Matching commands"), className: "max-h-[46vh] overflow-y-auto py-1" }, matches.length === 0 && /* @__PURE__ */ React.createElement("li", { className: "px-4 py-6 text-center text-xs text-slate-600" }, t("palette.no_match", "No matching command. The bot chat (and soon voice) understands free-form requests.")), matches.map((cmd, i) => /* @__PURE__ */ React.createElement("li", { key: cmd.id, id: "allo-cmd-" + cmd.id, role: "option", "aria-selected": i === sel }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => runCmd(cmd),
        onMouseEnter: () => setSel(i),
        className: `w-full text-left px-4 py-2.5 flex items-center gap-3 ${i === sel ? "bg-indigo-50" : ""}`
      },
      /* @__PURE__ */ React.createElement("span", { className: "text-lg shrink-0", "aria-hidden": "true" }, cmd.icon),
      /* @__PURE__ */ React.createElement("span", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("span", { className: `block text-sm font-bold ${i === sel ? "text-indigo-900" : "text-slate-800"}` }, cmd.label), /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] text-slate-600 truncate" }, confirming === cmd.id ? t("palette.confirm", "\u26A0 Press Enter again to confirm") : cmd.hint)),
      i === sel && /* @__PURE__ */ React.createElement("kbd", { className: "text-[10px] text-indigo-600 border border-indigo-300 rounded px-1.5 py-0.5 shrink-0" }, "\u21B5")
    )))),
    /* @__PURE__ */ React.createElement("div", { className: "px-4 py-2 border-t border-slate-200 text-[10px] text-slate-600 flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("kbd", { className: "border border-slate-300 rounded px-1" }, "\u2191\u2193"), " ", t("palette.nav", "navigate")), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("kbd", { className: "border border-slate-300 rounded px-1" }, "\u21B5"), " ", t("palette.run", "run")), /* @__PURE__ */ React.createElement("span", { className: "ml-auto" }, t("palette.footer", "Every action is announced. Ctrl+K toggles.")))
  ));
};

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AlloCommands = { AlloCommandPalette: AlloCommandPalette, buildAlloCommands: buildAlloCommands, scoreCommand: scoreCommand };
  console.log('[CDN] AlloCommands loaded');
})();
