(function() {
'use strict';
if (window.AlloModules && window.AlloModules.ViewGeminiBridgeModule) { console.log('[CDN] ViewGeminiBridgeModule already loaded, skipping'); return; }
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
// Bridge UI uses inline styles + Unicode glyphs (no Lucide icon components).
var BRIDGE_PHRASES = [
  { id: "welcome", icon: "\u{1F44B}", label: "Welcome", phrases: ["Hello, thank you for coming.", "It is good to meet you.", "Please have a seat.", "I am glad we can talk today."] },
  { id: "reassure", icon: "\u{1F49A}", label: "Reassure", phrases: ["Your child is doing well.", "There is nothing to worry about.", "We are a team, and we are here to help.", "Your child is safe and cared for here."] },
  { id: "update", icon: "\u{1F4C8}", label: "Share an update", phrases: ["I would like to share an update.", "Your child is making good progress.", "Here is something your child did well today.", "Let us work on this together."] },
  { id: "ask", icon: "\u2753", label: "Ask", phrases: ["Do you have any questions?", "Is there anything you would like to share?", "What works best for your family?", "How can we support you?"] },
  { id: "plan", icon: "\u{1F5D3}\uFE0F", label: "Plan together", phrases: ["Can we set up a time to meet?", "What time works for you?", "Please bring this form back when you can.", "I will send this home with your child."] },
  { id: "close", icon: "\u{1F64F}", label: "Close", phrases: ["Thank you for your time.", "Please reach out anytime.", "We appreciate you.", "Goodbye, and take care."] }
];
var _bridgeActiveRec = null;
function _bridgeStopListening() {
  if (_bridgeActiveRec) {
    try {
      _bridgeActiveRec.onresult = null;
      _bridgeActiveRec.onend = null;
      _bridgeActiveRec.onerror = null;
      _bridgeActiveRec.abort();
    } catch (e) {
    }
    _bridgeActiveRec = null;
  }
}
function _useBridgeReducedMotion() {
  const [reducedMotion, setReducedMotion] = React.useState(
    () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return void 0;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(media.matches);
    updatePreference();
    if (media.addEventListener) media.addEventListener("change", updatePreference);
    else if (media.addListener) media.addListener(updatePreference);
    return () => {
      if (media.removeEventListener) media.removeEventListener("change", updatePreference);
      else if (media.removeListener) media.removeListener(updatePreference);
    };
  }, []);
  return reducedMotion;
}
function _useBridgeDialogFocus(open) {
  const dialogRef = React.useRef(null);
  const returnFocusRef = React.useRef(null);
  React.useEffect(() => {
    if (!open || typeof document === "undefined") return void 0;
    const dialog = dialogRef.current;
    if (!dialog) return void 0;
    returnFocusRef.current = document.activeElement;
    const getFocusable = () => Array.from(dialog.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((node) => !node.hasAttribute("hidden") && node.getAttribute("aria-hidden") !== "true" && node.style.display !== "none" && node.style.visibility !== "hidden");
    const focusTarget = getFocusable()[0] || dialog;
    const focusFrame = typeof window !== "undefined" && window.requestAnimationFrame ? window.requestAnimationFrame(() => focusTarget.focus()) : null;
    if (focusFrame === null) focusTarget.focus();
    const trapTab = (event) => {
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", trapTab);
    return () => {
      dialog.removeEventListener("keydown", trapTab);
      if (focusFrame !== null && typeof window !== "undefined" && window.cancelAnimationFrame) window.cancelAnimationFrame(focusFrame);
      const returnTarget = returnFocusRef.current;
      if (returnTarget && returnTarget.isConnected && typeof returnTarget.focus === "function") returnTarget.focus();
    };
  }, [open]);
  return dialogRef;
}
function _bridgePhrasesPanel(onPick, translating, t, _bt, gen) {
  _bt = _bt || {};
  gen = gen || {};
  var cAccent = _bt.textAccent || "#5eead4", cMuted = _bt.textMuted || "#64748b", cText = _bt.inputText || "#e2e8f0";
  var genList = Array.isArray(gen.phrases) ? gen.phrases : [];
  var activeCat = gen.activeCat || null, onCat = gen.onCat || function() {
  };
  var editHint = t && t("roster.bridge_phrase_edit_hint") || "Tap to edit, then press Enter to send";
  function _chip(ph, key, bg, border) {
    return React.createElement("button", { type: "button", key, disabled: translating, onClick: function() {
      onPick(ph);
    }, title: editHint, style: { background: bg, border, color: cAccent, padding: "6px 10px", borderRadius: "10px", fontSize: "12px", cursor: translating ? "default" : "pointer", opacity: translating ? 0.5 : 1, textAlign: "left" } }, ph);
  }
  function _genSubmit() {
    var el = document.getElementById("bridge-gen-instruction");
    if (el && el.value.trim() && gen.onGenerate && !gen.loading) gen.onGenerate(el.value.trim());
  }
  return React.createElement(
    "details",
    { open: false, style: { marginBottom: "12px" } },
    React.createElement(
      "summary",
      { style: { cursor: "pointer", fontSize: "12px", fontWeight: 700, color: cAccent, padding: "6px 0" } },
      "\u{1F4AC} " + (t && t("roster.bridge_phrases_title") || "Quick phrases"),
      React.createElement("span", { style: { color: cMuted, fontWeight: 500 } }, " " + (t && t("roster.bridge_phrases_hint") || "(tap to edit, then Enter to send)"))
    ),
    React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" } },
      // Topic chips — tap one to reveal just its phrases (category-first, keeps the panel compact).
      React.createElement(
        "div",
        { role: "tablist", "aria-label": t && t("roster.bridge_phrases_title") || "Quick phrases", style: { display: "flex", flexWrap: "wrap", gap: "6px" } },
        BRIDGE_PHRASES.map(function(cat) {
          var on = activeCat === cat.id;
          return React.createElement("button", { type: "button", key: cat.id, role: "tab", "aria-selected": on ? "true" : "false", onClick: function() {
            onCat(on ? null : cat.id);
          }, style: { background: on ? "rgba(20,184,166,0.22)" : "rgba(20,184,166,0.06)", border: "1px solid " + (on ? "rgba(20,184,166,0.5)" : "rgba(20,184,166,0.18)"), color: cAccent, padding: "6px 11px", borderRadius: "999px", fontSize: "12px", fontWeight: on ? 700 : 600, cursor: "pointer", whiteSpace: "nowrap" } }, cat.icon + " " + cat.label);
        })
      ),
      // Only the active topic's phrases render.
      (function() {
        var cat = activeCat ? BRIDGE_PHRASES.filter(function(c) {
          return c.id === activeCat;
        })[0] : null;
        if (!cat) return null;
        return React.createElement(
          "div",
          { role: "group", "aria-label": cat.label, style: { display: "flex", flexWrap: "wrap", gap: "6px" } },
          cat.phrases.map(function(ph, pi) {
            return _chip(ph, pi, "rgba(20,184,166,0.08)", "1px solid rgba(20,184,166,0.2)");
          })
        );
      })(),
      React.createElement(
        "div",
        { style: { marginTop: "4px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.08)" } },
        React.createElement("div", { style: { fontSize: "10px", fontWeight: 700, color: cMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" } }, "\u2728 " + (t && t("roster.bridge_gen_label") || "Generate custom phrases")),
        React.createElement(
          "div",
          { style: { display: "flex", gap: "6px", flexWrap: "wrap" } },
          React.createElement("input", { id: "bridge-gen-instruction", type: "text", disabled: translating || gen.loading, "aria-label": t && t("roster.bridge_gen_placeholder") || "Describe the phrases to generate", placeholder: t && t("roster.bridge_gen_placeholder") || "e.g. reassure a parent their child had a hard morning", onKeyDown: function(e) {
            if (e.key === "Enter") {
              e.preventDefault();
              _genSubmit();
            }
          }, style: { flex: 1, minWidth: "180px", background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: "10px", padding: "8px 10px", color: cText, fontSize: "12px", fontFamily: "inherit", opacity: translating || gen.loading ? 0.5 : 1 } }),
          React.createElement("button", { type: "button", disabled: translating || gen.loading, onClick: _genSubmit, style: { background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.35)", color: _bt.aiAccent || "#d8b4fe", padding: "8px 14px", borderRadius: "10px", fontSize: "12px", fontWeight: 700, cursor: translating || gen.loading ? "default" : "pointer", whiteSpace: "nowrap" } }, gen.loading ? "\u23F3 " + (t && t("roster.bridge_gen_loading") || "Generating\u2026") : "\u2728 " + (t && t("roster.bridge_gen_btn") || "Generate"))
        ),
        genList.length ? React.createElement(
          "div",
          { style: { marginTop: "8px" } },
          React.createElement("div", { style: { fontSize: "10px", fontWeight: 700, color: cMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" } }, "\u2728 " + (t && t("roster.bridge_gen_results") || "Generated \u2014 tap to edit and send")),
          React.createElement(
            "div",
            { style: { display: "flex", flexWrap: "wrap", gap: "6px" } },
            genList.map(function(ph, pi) {
              return _chip(ph, "gen" + pi, "rgba(168,85,247,0.10)", "1px solid rgba(168,85,247,0.3)");
            })
          )
        ) : null
      )
    )
  );
}
function _bridgeTranscript(messages, aLang, bLang) {
  return (messages || []).map(function(m) {
    if (m.ai) return "[AI helper] asked: " + m.text + "\n   " + aLang + ": " + (m.answer || "") + (m.translated ? "\n   " + bLang + ": " + m.translated : "");
    var who = m.sender === "personA" ? aLang : bLang, other = m.sender === "personA" ? bLang : aLang;
    return who + ": " + m.text + (m.translated ? "\n   " + other + ": " + m.translated : "");
  }).join("\n\n");
}
function _bridgeAiBar(onAsk, onExport, translating, t, _bt) {
  _bt = _bt || {};
  var aiAccent = _bt.aiAccent || "#fcd34d", cText = _bt.inputText || "#e2e8f0", cBg = _bt.cardBg || "rgba(255,255,255,0.06)", cBorder = _bt.cardBorder || "1px solid rgba(255,255,255,0.1)", cSecondary = _bt.textSecondary || "#94a3b8";
  function ask() {
    var el = document.getElementById("bridge-f2f-ai-input");
    if (el && el.value.trim()) {
      onAsk(el.value.trim());
      el.value = "";
    }
  }
  return React.createElement(
    "div",
    { style: { display: "flex", gap: "6px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" } },
    React.createElement("span", { "aria-hidden": "true", style: { fontSize: "16px" } }, "\u{1F916}"),
    React.createElement("input", { id: "bridge-f2f-ai-input", type: "text", disabled: translating, "aria-label": t && t("roster.bridge_ai_placeholder") || "Ask the AI for help", placeholder: t && t("roster.bridge_ai_placeholder") || "Ask the AI: how do I say\u2026, words for\u2026, explain simply\u2026", onKeyDown: function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        ask();
      }
    }, style: { flex: 1, minWidth: "170px", background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: "12px", padding: "10px 12px", color: cText, fontSize: "13px", fontFamily: "inherit", opacity: translating ? 0.5 : 1 } }),
    React.createElement("button", { type: "button", disabled: translating, onClick: ask, style: { background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.35)", color: aiAccent, padding: "10px 14px", borderRadius: "12px", fontSize: "13px", fontWeight: 700, cursor: translating ? "default" : "pointer", whiteSpace: "nowrap" } }, t && t("roster.bridge_ai_btn") || "Ask AI"),
    React.createElement("button", { type: "button", onClick: onExport, title: t && t("roster.bridge_export") || "Export the conversation", "aria-label": t && t("roster.bridge_export") || "Export the conversation", style: { background: cBg, border: cBorder, color: cSecondary, padding: "10px 12px", borderRadius: "12px", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap" } }, "\u2B07 " + (t && t("roster.bridge_export_short") || "Export"))
  );
}
function _bridgeAiBubble(msg, aLang, bLang, handleAudio, t, _bt) {
  _bt = _bt || {};
  var aiAccent = _bt.aiAccent || "#fcd34d", aiBubbleBg = _bt.aiBubbleBg || "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.08))", aiBorder = _bt.aiBorder || "1px solid rgba(251,191,36,0.3)", cPrimary = _bt.textPrimary || "#fde68a", cSecondary = _bt.textSecondary || "#94a3b8", cMuted = _bt.textMuted || "#64748b", cBg = _bt.cardBg || "rgba(255,255,255,0.06)", cBorder = _bt.cardBorder || "1px solid rgba(255,255,255,0.1)";
  return React.createElement(
    "div",
    { key: msg.id, style: { display: "flex", justifyContent: "center" } },
    React.createElement(
      "div",
      { style: { maxWidth: "92%", width: "100%", background: aiBubbleBg, border: aiBorder, borderRadius: "14px", padding: "12px 16px" } },
      React.createElement("div", { style: { fontSize: "10px", fontWeight: 700, color: aiAccent, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" } }, "\u{1F916} " + (t && t("roster.bridge_ai_helper") || "AI helper")),
      React.createElement("div", { style: { fontSize: "12px", color: cSecondary, marginBottom: "6px", fontStyle: "italic" } }, "\u201C" + msg.text + "\u201D"),
      msg.translating ? React.createElement("div", { style: { fontSize: "12px", color: cMuted, fontStyle: "italic" } }, "\u23F3 " + (t && t("roster.bridge_ai_thinking") || "Thinking\u2026")) : React.createElement(
        "div",
        null,
        React.createElement("div", { dir: "auto", style: { fontSize: "14px", color: cPrimary, lineHeight: 1.6, fontWeight: 500 } }, msg.answer || ""),
        msg.translated ? React.createElement("div", { dir: "auto", style: { marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "14px", color: cPrimary, lineHeight: 1.6 } }, "\u{1F30D} " + msg.translated) : null,
        React.createElement(
          "div",
          { style: { marginTop: "8px", display: "flex", gap: "6px" } },
          React.createElement("button", { type: "button", onClick: function() {
            handleAudio(msg.answer, aLang);
          }, style: { background: cBg, border: cBorder, color: cSecondary, padding: "4px 10px", borderRadius: "8px", fontSize: "11px", cursor: "pointer" } }, "\u{1F50A} " + (aLang || "").slice(0, 3)),
          msg.translated ? React.createElement("button", { type: "button", onClick: function() {
            handleAudio(msg.translated, bLang);
          }, style: { background: cBg, border: cBorder, color: cSecondary, padding: "4px 10px", borderRadius: "8px", fontSize: "11px", cursor: "pointer" } }, "\u{1F50A} " + (bLang || "").slice(0, 3)) : null
        )
      )
    )
  );
}
try {
  window.__alloBridgePure = { BRIDGE_PHRASES, _bridgeTranscript };
} catch (e) {
}
function BridgeSendModal(props) {
  const {
    activeSessionCode,
    addToast,
    appId,
    bridgeChatMessages,
    bridgeChatOpen,
    bridgeF2FCustomLangA,
    bridgeF2FCustomLangB,
    bridgeF2FLang,
    bridgeF2FListening,
    bridgeF2FTeacherLang,
    bridgeF2FTranslating,
    bridgeHistory,
    bridgeHistoryOpen,
    bridgeOverrideGroups,
    bridgeSendOpen,
    bridgeSending,
    callGemini,
    callGeminiImageEdit,
    db,
    deleteField,
    doc,
    generatedContent,
    gradeLevel,
    handleAudio,
    isTeacherMode,
    leveledTextLanguage,
    rosterKey,
    setBridgeChatMessages,
    setBridgeChatOpen,
    setBridgeF2FCustomLangA,
    setBridgeF2FCustomLangB,
    setBridgeF2FLang,
    setBridgeF2FListening,
    setBridgeF2FTeacherLang,
    setBridgeF2FTranslating,
    setBridgeHistory,
    setBridgeHistoryOpen,
    setBridgeMessage,
    setBridgeOverrideGroups,
    setBridgeSendOpen,
    setBridgeSending,
    setBridgeTermsSaved,
    t,
    theme,
    updateDoc,
    user,
    warnLog
  } = props;
  const [bridgeFullscreen, setBridgeFullscreen] = React.useState(false);
  const [bridgeGenPhrases, setBridgeGenPhrases] = React.useState([]);
  const [bridgeGenLoading, setBridgeGenLoading] = React.useState(false);
  const [bridgePhraseCat, setBridgePhraseCat] = React.useState(null);
  const bridgeReducedMotion = _useBridgeReducedMotion();
  const bridgeSendDialogRef = _useBridgeDialogFocus(bridgeSendOpen && isTeacherMode);
  React.useEffect(() => {
    if (bridgeSendOpen) {
      window.__bridgeMode = void 0;
      window.__bridgeLang = void 0;
      window.__bridgeTarget = void 0;
      window.__bridgeGrade = void 0;
    }
  }, [bridgeSendOpen]);
  if (!(bridgeSendOpen && isTeacherMode)) return null;
  const _isDark = theme === "dark";
  const _isContrast = theme === "contrast";
  const _bt = {
    overlay: _isContrast ? "rgba(0,0,0,0.9)" : _isDark ? "rgba(2,6,23,0.75)" : "rgba(0,0,0,0.4)",
    panelBg: _isContrast ? "#000000" : _isDark ? "linear-gradient(145deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.95) 50%, rgba(15,23,42,0.97) 100%)" : "linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.97) 100%)",
    panelBorder: _isContrast ? "3px solid #FFFF00" : _isDark ? "1px solid rgba(20,184,166,0.2)" : "1px solid rgba(0,0,0,0.1)",
    panelShadow: _isContrast ? "none" : _isDark ? "0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(20,184,166,0.08)" : "0 25px 60px rgba(0,0,0,0.15), 0 0 40px rgba(20,184,166,0.05)",
    textPrimary: _isContrast ? "#FFFF00" : _isDark ? "#e2e8f0" : "#1e293b",
    textSecondary: _isContrast ? "#FFFFFF" : _isDark ? "#94a3b8" : "#64748b",
    textMuted: _isContrast ? "#FFFF00" : _isDark ? "#94a3b8" : "#64748b",
    textAccent: _isContrast ? "#FFFF00" : _isDark ? "#5eead4" : "#0d9488",
    inputBg: _isContrast ? "#000000" : _isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    inputBorder: _isContrast ? "2px solid #FFFF00" : _isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.12)",
    inputText: _isContrast ? "#FFFFFF" : _isDark ? "#e2e8f0" : "#1e293b",
    cardBg: _isContrast ? "#000000" : _isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
    cardBorder: _isContrast ? "2px solid #FFFF00" : _isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
    cardActiveBg: _isContrast ? "#1a1a00" : _isDark ? "rgba(20,184,166,0.12)" : "rgba(20,184,166,0.08)",
    cardActiveBorder: _isContrast ? "2px solid #FFFF00" : _isDark ? "1px solid rgba(20,184,166,0.35)" : "1px solid rgba(20,184,166,0.3)",
    headerBorder: _isContrast ? "3px solid #FFFF00" : _isDark ? "1px solid rgba(20,184,166,0.15)" : "1px solid rgba(20,184,166,0.2)",
    btnCloseBg: _isContrast ? "#000000" : _isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
    btnCloseBorder: _isContrast ? "2px solid #FFFF00" : _isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
    btnCloseColor: _isContrast ? "#FFFF00" : _isDark ? "#94a3b8" : "#64748b",
    selectBg: _isContrast ? "#000000" : _isDark ? "#1e293b" : "#ffffff",
    selectText: _isContrast ? "#FFFF00" : _isDark ? "#e2e8f0" : "#1e293b",
    dotActive: _isContrast ? "#FFFF00" : "#14b8a6",
    dotInactive: _isContrast ? "#666600" : _isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    // AI-assist amber identity, made theme-aware so the helper UI stays legible in
    // light/high-contrast (it previously hardcoded light-on-light dark-mode colors).
    aiAccent: _isContrast ? "#FFFF00" : _isDark ? "#fcd34d" : "#b45309",
    aiBubbleBg: _isContrast ? "#1a1a00" : _isDark ? "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.08))" : "linear-gradient(135deg, rgba(251,191,36,0.10), rgba(245,158,11,0.06))",
    aiBorder: _isContrast ? "2px solid #FFFF00" : _isDark ? "1px solid rgba(251,191,36,0.3)" : "1px solid rgba(217,119,6,0.35)"
  };
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: bridgeSendDialogRef,
      tabIndex: -1,
      role: "dialog",
      "aria-modal": "true",
      "aria-label": t("common.bridge_mode_send_panel"),
      style: { position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", background: _bt.overlay, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" },
      onClick: (e) => {
        if (e.target === e.currentTarget) {
          setBridgeSendOpen(false);
          if (activeSessionCode && isTeacherMode) {
            try {
              const sRef = doc(db, "artifacts", appId, "public", "data", "sessions", activeSessionCode);
              updateDoc(sRef, { bridgePayload: deleteField(), bridgeChat: deleteField() }).catch((e2) => warnLog("Bridge cleanup error:", e2));
            } catch (e2) {
              warnLog("Bridge cleanup error:", e2);
            }
          }
        }
      },
      onKeyDown: (e) => {
        if (e.key === "Escape") setBridgeSendOpen(false);
      }
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        "data-help-key": "bridge_send_modal_panel",
        onClick: (e) => e.stopPropagation(),
        style: {
          background: _bt.panelBg,
          borderRadius: bridgeFullscreen ? "0" : "24px",
          padding: "0",
          maxWidth: bridgeFullscreen ? "100vw" : "720px",
          width: bridgeFullscreen ? "100vw" : "94vw",
          maxHeight: bridgeFullscreen ? "100vh" : "90vh",
          height: bridgeFullscreen ? "100vh" : "auto",
          overflowY: "auto",
          color: _bt.textPrimary,
          boxShadow: _bt.panelShadow,
          border: _bt.panelBorder,
          pointerEvents: "all",
          position: "relative",
          zIndex: 1e5
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 28px 20px", borderBottom: _bt.headerBorder } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "20px", fontWeight: 800, margin: 0, color: _bt.textAccent, display: "flex", alignItems: "center", gap: "10px", letterSpacing: "-0.02em" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "24px" } }, "\u{1F310}"), " Bridge Mode"), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 0", fontSize: "13px", color: _bt.textMuted, fontWeight: 400 } }, "Send bilingual content to student devices")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "center" } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setBridgeFullscreen((f) => !f),
          "aria-label": bridgeFullscreen ? t("roster.bridge_exit_fullscreen") || "Exit full screen" : t("roster.bridge_fullscreen") || "Full screen",
          title: bridgeFullscreen ? t("roster.bridge_exit_fullscreen") || "Exit full screen" : t("roster.bridge_fullscreen") || "Full screen",
          style: { background: _bt.btnCloseBg, border: _bt.btnCloseBorder, color: _bt.btnCloseColor, width: "36px", height: "36px", borderRadius: "12px", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }
        },
        bridgeFullscreen ? "\u{1F5D7}" : "\u26F6"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setBridgeSendOpen(false),
          "aria-label": t("common.close") || "Close",
          style: { background: _bt.btnCloseBg, border: _bt.btnCloseBorder, color: _bt.btnCloseColor, width: "36px", height: "36px", borderRadius: "12px", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }
        },
        "\u2715"
      ))),
      /* @__PURE__ */ React.createElement("div", { style: { padding: "24px 28px" } }, /* @__PURE__ */ React.createElement("div", { "data-help-key": "bridge_send_quick_templates", style: { marginBottom: "14px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", fontWeight: 700, color: _bt.textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" } }, t("resource_builder.quick_templates")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } }, [
        { icon: "\u{1F4D6}", label: "Vocabulary", prompt: "Introduce and explain the following vocabulary word to students: " },
        { icon: "\u{1F3AF}", label: "Objective", prompt: "Today's learning objective is: " },
        { icon: "\u{1F4CB}", label: "Instructions", prompt: "Instructions for this activity: " },
        { icon: "\u{1F4AC}", label: "Discussion", prompt: "Think about and discuss with a partner: " },
        { icon: "\u{1F50D}", label: "Review", prompt: "Let's review what we learned about: " },
        { icon: "\u2757", label: "Reminder", prompt: "Important reminder for class: " }
      ].map((tmpl, ti) => /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          key: ti,
          onClick: () => {
            const ta = document.getElementById("bridge-send-textarea");
            if (ta) {
              ta.value = tmpl.prompt;
              ta.focus();
              ta.setSelectionRange(tmpl.prompt.length, tmpl.prompt.length);
            }
            const counter = document.getElementById("bridge-char-count");
            if (counter) counter.textContent = tmpl.prompt.length + " chars";
          },
          style: { background: _bt.cardBg, border: _bt.cardBorder, borderRadius: "10px", padding: "6px 12px", color: _bt.textSecondary, fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", transition: "all 0.2s", whiteSpace: "nowrap" },
          "aria-label": tmpl.label + " template",
          onMouseEnter: (e) => {
            e.currentTarget.style.background = _bt.cardActiveBg;
            e.currentTarget.style.borderColor = _bt.cardActiveBorder;
            e.currentTarget.style.color = _bt.textAccent;
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.background = _bt.cardBg;
            e.currentTarget.style.borderColor = _bt.cardBorder;
            e.currentTarget.style.color = _bt.textSecondary;
          }
        },
        /* @__PURE__ */ React.createElement("span", null, tmpl.icon),
        " ",
        tmpl.label
      )))), !activeSessionCode && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", marginBottom: "14px", background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "12px", fontSize: "13px", color: "#ca8a04" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "18px" } }, "\u{1F4E1}"), /* @__PURE__ */ React.createElement("span", null, t("roster.bridge_offline_info") || "No live session \u2014 content will preview on this device only")), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", marginBottom: "12px" } }, /* @__PURE__ */ React.createElement(
        "textarea",
        {
          "data-help-key": "bridge_send_compose_area",
          id: "bridge-send-textarea",
          "aria-label": t("roster.bridge_send_placeholder") || "Type content to send to students",
          defaultValue: "",
          placeholder: t("roster.bridge_send_placeholder") || "Type a concept, sentence, or instructions to send to students...",
          rows: 6,
          onInput: (e) => {
            const counter = document.getElementById("bridge-char-count");
            if (counter) counter.textContent = e.target.value.length + " chars";
          },
          style: {
            width: "100%",
            boxSizing: "border-box",
            background: _bt.inputBg,
            border: _bt.inputBorder,
            borderRadius: "16px",
            padding: "16px 18px",
            paddingBottom: "32px",
            color: _bt.inputText,
            fontSize: "15px",
            lineHeight: 1.7,
            resize: "vertical",
            minHeight: "160px",
            fontFamily: "inherit",
            transition: "border-color 0.2s, box-shadow 0.2s"
          },
          onFocus: (e) => {
            e.target.style.borderColor = "rgba(20,184,166,0.4)";
            e.target.style.boxShadow = "0 0 0 3px rgba(20,184,166,0.1)";
          },
          onBlur: (e) => {
            e.target.style.borderColor = "";
            e.target.style.boxShadow = "none";
          }
        }
      ), /* @__PURE__ */ React.createElement("span", { id: "bridge-char-count", style: { position: "absolute", bottom: "10px", right: "16px", fontSize: "11px", color: _bt.textMuted, pointerEvents: "none" } }, "0 chars")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            const ta = document.getElementById("bridge-send-textarea");
            if (!ta) return;
            const src = generatedContent?.data;
            if (!src) {
              addToast("No generated content available. Create content first in Text Adaptation.", "warning");
              return;
            }
            let text = "";
            if (typeof src === "string") text = src;
            else if (Array.isArray(src)) text = src.map((item) => item.term ? `${item.term}: ${item.definition || ""}` : JSON.stringify(item)).join("\n");
            else if (src.main) text = src.main;
            else if (src.text) text = src.text;
            else text = JSON.stringify(src).substring(0, 500);
            if (text) {
              ta.value = text;
              const counter = document.getElementById("bridge-char-count");
              if (counter) counter.textContent = text.length + " chars";
              addToast("Loaded current generated content", "info");
            }
          },
          "aria-label": t("common.use_current_generated_text"),
          style: { background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "10px", padding: "8px 14px", color: "#a5b4fc", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }
        },
        /* @__PURE__ */ React.createElement("span", null, "\u{1F4CE}"),
        " ",
        t("resource_builder.use_current_text")
      ), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "file",
          accept: "image/*",
          id: "bridge-image-file-input",
          style: { display: "none" },
          onChange: (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!file.type.startsWith("image/")) {
              addToast("Please select an image file.", "warning");
              return;
            }
            if (file.size > 10 * 1024 * 1024) {
              addToast("Image too large (max 10MB).", "warning");
              return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
              window.__bridgeAttachedImage = ev.target.result;
              const btn = document.getElementById("bridge-attach-image-btn");
              if (btn) btn.innerHTML = "<span>\u2705</span> " + file.name.substring(0, 20) + (file.name.length > 20 ? "\u2026" : "");
              const removeBtn = document.getElementById("bridge-remove-image-btn");
              if (removeBtn) removeBtn.style.display = "flex";
              addToast("Image attached: " + file.name, "success");
            };
            reader.readAsDataURL(file);
            e.target.value = "";
          }
        }
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "data-help-key": "bridge_send_attach_image_btn",
          id: "bridge-attach-image-btn",
          onClick: () => document.getElementById("bridge-image-file-input")?.click(),
          "aria-label": t("common.upload_and_attach_an_image"),
          style: { background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: "10px", padding: "8px 14px", color: "#c084fc", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }
        },
        /* @__PURE__ */ React.createElement("span", null, "\u{1F5BC}\uFE0F"),
        " ",
        t("resource_builder.attach_image")
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          id: "bridge-remove-image-btn",
          onClick: () => {
            window.__bridgeAttachedImage = null;
            const btn = document.getElementById("bridge-attach-image-btn");
            if (btn) btn.innerHTML = "<span>\u{1F5BC}\uFE0F</span> Attach Image";
            document.getElementById("bridge-remove-image-btn").style.display = "none";
            addToast("Image removed", "info");
          },
          "aria-label": t("common.remove_attached_image"),
          style: { display: "none", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "10px", padding: "8px 10px", color: "#f87171", fontSize: "12px", fontWeight: 700, cursor: "pointer", alignItems: "center", gap: "4px", transition: "all 0.2s" }
        },
        /* @__PURE__ */ React.createElement("span", null, "\u2715")
      ), generatedContent?.data?.imageUrl && /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            window.__bridgeAttachedImage = generatedContent.data.imageUrl;
            const btn = document.getElementById("bridge-attach-image-btn");
            if (btn) btn.innerHTML = "<span>\u2705</span> AI Image Attached";
            const removeBtn = document.getElementById("bridge-remove-image-btn");
            if (removeBtn) removeBtn.style.display = "flex";
            addToast("Generated image attached", "success");
          },
          "aria-label": t("common.use_current_generated_image"),
          style: { background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.25)", borderRadius: "10px", padding: "8px 14px", color: "#5eead4", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }
        },
        /* @__PURE__ */ React.createElement("span", null, "\u{1F3A8}"),
        " ",
        t("bridge.use_generated_button") || "Use Generated"
      )), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", fontWeight: 700, color: _bt.textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" } }, t("resource_builder.generation_mode")), /* @__PURE__ */ React.createElement("div", { "data-help-key": "bridge_send_mode_selector", id: "bridge-mode-selector", "data-card-bg": _bt.cardBg, "data-card-border": _bt.cardBorder, "data-card-active-bg": _bt.cardActiveBg, "data-card-active-border": _bt.cardActiveBorder, "data-text-secondary": _bt.textSecondary, "data-text-accent": _bt.textAccent, "data-dot-active": _bt.dotActive, "data-dot-inactive": _bt.dotInactive, style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px" } }, [
        { id: "explain", icon: "\u{1F4DD}", title: "Explain", desc: "AI explains the concept bilingually" },
        { id: "translate", icon: "\u{1F310}", title: "Translate", desc: "Direct translation to target language" },
        { id: "visual", icon: "\u{1F5BC}\uFE0F", title: "Visual + Explain", desc: "Explanation with AI-generated visual" },
        { id: "simplify", icon: "\u2728", title: "Simplify", desc: "Rewrite at selected grade reading level" },
        { id: "livechat", icon: "\u{1F4AC}", title: "Live Chat", desc: "Face-to-face translation with TTS" }
      ].map((m, mi) => /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          key: m.id,
          "aria-label": m.title + ": " + m.desc,
          "data-bridge-mode": m.id,
          onClick: (e) => {
            const _mC = document.getElementById("bridge-mode-selector");
            const _cBg = _mC?.dataset.cardBg || "rgba(255,255,255,0.04)";
            const _cBr = _mC?.dataset.cardBorder || "rgba(255,255,255,0.08)";
            const _cTs = _mC?.dataset.textSecondary || "#94a3b8";
            const _cDi = _mC?.dataset.dotInactive || "rgba(255,255,255,0.1)";
            document.querySelectorAll("[data-bridge-mode]").forEach((b) => {
              b.style.background = _cBg;
              b.style.borderColor = _cBr;
              b.style.color = _cTs;
              b.querySelector("[data-mode-dot]").style.background = _cDi;
            });
            e.currentTarget.style.background = _mC?.dataset.cardActiveBg || "rgba(20,184,166,0.12)";
            e.currentTarget.style.borderColor = _mC?.dataset.cardActiveBorder || "rgba(20,184,166,0.35)";
            e.currentTarget.style.color = _mC?.dataset.textAccent || "#5eead4";
            e.currentTarget.querySelector("[data-mode-dot]").style.background = _mC?.dataset.dotActive || "#14b8a6";
            window.__bridgeMode = m.id;
            if (m.id === "livechat") {
              setBridgeChatOpen(true);
              setBridgeChatMessages([]);
            } else {
              setBridgeChatOpen(false);
            }
          },
          style: {
            background: mi === 0 ? _bt.cardActiveBg : _bt.cardBg,
            border: mi === 0 ? _bt.cardActiveBorder : _bt.cardBorder,
            borderRadius: "14px",
            padding: "14px 12px",
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.2s",
            color: mi === 0 ? _bt.textAccent : _bt.textSecondary,
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            position: "relative"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } }, /* @__PURE__ */ React.createElement("span", { "data-mode-dot": "", style: { width: "8px", height: "8px", borderRadius: "50%", background: mi === 0 ? _bt.dotActive : _bt.dotInactive, transition: "background 0.2s", flexShrink: 0 } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "16px" } }, m.icon), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "13px", fontWeight: 700 } }, m.title)),
        /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: _bt.textMuted, lineHeight: 1.4 } }, m.desc)
      )))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", background: bridgeOverrideGroups ? "rgba(245,158,11,0.08)" : _bt.cardBg, border: bridgeOverrideGroups ? "1px solid rgba(245,158,11,0.25)" : _bt.cardBorder, borderRadius: "12px", padding: "10px 16px", transition: "all 0.3s" } }, /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", flex: 1 } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: bridgeOverrideGroups,
          onChange: (e) => setBridgeOverrideGroups(e.target.checked),
          style: { width: "16px", height: "16px", accentColor: "#f59e0b", cursor: "pointer" }
        }
      ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "13px", fontWeight: 700, color: bridgeOverrideGroups ? "#fbbf24" : _bt.textSecondary } }, bridgeOverrideGroups ? "\u{1F512} Override group settings" : "\u{1F513} Use group settings (default)")), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: _bt.textMuted, maxWidth: "280px" } }, bridgeOverrideGroups ? "All students will receive this exact language & reading level" : "Each group auto-translates to its own language & level")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", fontWeight: 700, color: _bt.textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" } }, t("resource_builder.target_group")), /* @__PURE__ */ React.createElement(
        "select",
        {
          "data-help-key": "bridge_send_target_select",
          id: "bridge-target-selector",
          "aria-label": t("common.target_group_selector"),
          defaultValue: "all",
          onChange: (e) => {
            window.__bridgeTarget = e.target.value;
          },
          style: { width: "100%", background: _bt.inputBg, border: _bt.inputBorder, borderRadius: "12px", padding: "12px 14px", color: _bt.inputText, fontSize: "13px", fontWeight: 600, cursor: "pointer", appearance: "auto" }
        },
        /* @__PURE__ */ React.createElement("option", { value: "all", style: { background: _bt.selectBg, color: _bt.selectText } }, "\u{1F3AF} All Groups"),
        rosterKey?.groups && Object.entries(rosterKey.groups).map(([gId, g]) => /* @__PURE__ */ React.createElement("option", { key: gId, value: gId, style: { background: _bt.selectBg, color: _bt.selectText } }, g.name))
      )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", fontWeight: 700, color: _bt.textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" } }, t("bridge.target_language_label") || "Target Language", " ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: "9px", fontWeight: 400, color: bridgeOverrideGroups ? "#f59e0b" : "#64748b", textTransform: "none" } }, bridgeOverrideGroups ? "(all students)" : "(your preview)")), /* @__PURE__ */ React.createElement(
        "select",
        {
          "data-help-key": "bridge_send_language_select",
          id: "bridge-language-selector",
          "aria-label": t("common.target_language_selector"),
          defaultValue: leveledTextLanguage || "English",
          onChange: (e) => {
            const customInput = document.getElementById("bridge-custom-lang-input");
            const prev = document.getElementById("bridge-settings-preview-lang");
            if (e.target.value === "__custom__") {
              if (customInput) {
                customInput.style.display = "block";
                customInput.focus();
              }
              window.__bridgeLang = customInput?.value || "English";
            } else {
              if (customInput) customInput.style.display = "none";
              window.__bridgeLang = e.target.value;
              if (prev) prev.textContent = e.target.value;
            }
          },
          style: { width: "100%", background: _bt.inputBg, border: _bt.inputBorder, borderRadius: "12px", padding: "12px 14px", color: _bt.inputText, fontSize: "13px", fontWeight: 600, cursor: "pointer", appearance: "auto" }
        },
        [
          { v: "English", f: "\u{1F1FA}\u{1F1F8}" },
          { v: "Spanish", f: "\u{1F1EA}\u{1F1F8}" },
          { v: "French", f: "\u{1F1EB}\u{1F1F7}" },
          { v: "Arabic", f: "\u{1F1F8}\u{1F1E6}" },
          { v: "Somali", f: "\u{1F1F8}\u{1F1F4}" },
          { v: "Vietnamese", f: "\u{1F1FB}\u{1F1F3}" },
          { v: "Portuguese", f: "\u{1F1E7}\u{1F1F7}" },
          { v: "Mandarin", f: "\u{1F1E8}\u{1F1F3}" },
          { v: "Korean", f: "\u{1F1F0}\u{1F1F7}" },
          { v: "Tagalog", f: "\u{1F1F5}\u{1F1ED}" },
          { v: "Russian", f: "\u{1F1F7}\u{1F1FA}" },
          { v: "Japanese", f: "\u{1F1EF}\u{1F1F5}" }
        ].map((l) => /* @__PURE__ */ React.createElement("option", { key: l.v, value: l.v, style: { background: _bt.selectBg, color: _bt.selectText } }, l.f, " ", l.v)),
        /* @__PURE__ */ React.createElement("option", { value: "__custom__", style: { background: _bt.selectBg, color: _bt.selectText } }, "\u270F\uFE0F Custom language...")
      ), /* @__PURE__ */ React.createElement(
        "input",
        {
          id: "bridge-custom-lang-input",
          type: "text",
          "aria-label": t("common.custom_language_input") || "Custom language name",
          placeholder: t("common.placeholder_type_a_language_name_e_g_hindi_swahili_haitian_cre"),
          onInput: (e) => {
            window.__bridgeLang = e.target.value || "English";
            const prev = document.getElementById("bridge-settings-preview-lang");
            if (prev) prev.textContent = e.target.value || "Custom";
          },
          style: { display: "none", width: "100%", boxSizing: "border-box", marginTop: "8px", background: _bt.inputBg, border: _bt.inputBorder, borderRadius: "10px", padding: "10px 14px", color: _bt.inputText, fontSize: "13px", fontWeight: 600 }
        }
      )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", fontWeight: 700, color: _bt.textSecondary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" } }, t("bridge.reading_level_label") || "Reading Level", " ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: "9px", fontWeight: 400, color: bridgeOverrideGroups ? "#f59e0b" : "#64748b", textTransform: "none" } }, bridgeOverrideGroups ? "(all students)" : "(your preview)")), /* @__PURE__ */ React.createElement(
        "select",
        {
          "data-help-key": "bridge_send_grade_select",
          id: "bridge-grade-selector",
          "aria-label": t("common.grade_level_selector"),
          defaultValue: gradeLevel || "5th Grade",
          onChange: (e) => {
            window.__bridgeGrade = e.target.value;
            const prev = document.getElementById("bridge-settings-preview-grade");
            if (prev) prev.textContent = e.target.value;
          },
          style: { width: "100%", background: _bt.inputBg, border: _bt.inputBorder, borderRadius: "12px", padding: "12px 14px", color: _bt.inputText, fontSize: "13px", fontWeight: 600, cursor: "pointer", appearance: "auto" }
        },
        ["PreK", "Kindergarten", "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade", "6th Grade", "7th Grade", "8th Grade", "9th Grade", "10th Grade", "11th Grade", "12th Grade"].map((g) => /* @__PURE__ */ React.createElement("option", { key: g, value: g, style: { background: _bt.selectBg, color: _bt.selectText } }, g))
      ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "16px", marginBottom: "20px", background: _bt.cardBg, border: _bt.cardBorder, borderRadius: "14px", padding: "14px 18px" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "16px" } }, "\u{1F5E3}\uFE0F"), /* @__PURE__ */ React.createElement("span", { style: { color: _bt.textMuted } }, "Language:"), /* @__PURE__ */ React.createElement("span", { id: "bridge-settings-preview-lang", style: { color: _bt.textAccent, fontWeight: 700 } }, leveledTextLanguage || "English")), /* @__PURE__ */ React.createElement("div", { style: { width: "1px", background: _bt.dotInactive } }), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "16px" } }, "\u{1F4DA}"), /* @__PURE__ */ React.createElement("span", { style: { color: _bt.textMuted } }, "Grade:"), /* @__PURE__ */ React.createElement("span", { id: "bridge-settings-preview-grade", style: { color: _bt.textAccent, fontWeight: 700 } }, gradeLevel || "5th Grade")), /* @__PURE__ */ React.createElement("div", { style: { width: "1px", background: _bt.dotInactive } }), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "16px" } }, "\u{1F4E1}"), /* @__PURE__ */ React.createElement("span", { style: { color: _bt.textMuted } }, "Session:"), /* @__PURE__ */ React.createElement("span", { style: { color: activeSessionCode ? "#34d399" : "#f59e0b", fontWeight: 700 } }, activeSessionCode ? "Live" : "Preview only"))), rosterKey?.groups && Object.keys(rosterKey.groups).length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "20px", background: _bt.cardBg, border: _bt.cardBorder, borderRadius: "14px", padding: "14px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", fontWeight: 700, color: _bt.textAccent, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement("span", null, "\u{1F310}"), " Language Blast Preview"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: _bt.textMuted } }, t("bridge.autotranslate_hint") || "Each student device auto-translates to its group's language & reading level"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#5eead4", background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.15)", borderRadius: "8px", padding: "6px 10px", marginTop: "8px", lineHeight: 1.5 } }, "\u{1F4A1} ", /* @__PURE__ */ React.createElement("strong", null, t("bridge.how_it_works_label") || "How it works:"), " ", t("bridge.how_it_works_desc") || "In a live session, each student device automatically generates the translation using its group's configured language and reading level. The language/grade selectors above only affect your teacher preview unless you enable 'Override group settings'.")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } }, Object.entries(rosterKey.groups).map(([gId, g]) => {
        const langMap = {
          "English": "\u{1F1FA}\u{1F1F8}",
          "Spanish": "\u{1F1EA}\u{1F1F8}",
          "French": "\u{1F1EB}\u{1F1F7}",
          "Arabic": "\u{1F1F8}\u{1F1E6}",
          "Somali": "\u{1F1F8}\u{1F1F4}",
          "Vietnamese": "\u{1F1FB}\u{1F1F3}",
          "Portuguese": "\u{1F1E7}\u{1F1F7}",
          "Mandarin": "\u{1F1E8}\u{1F1F3}",
          "Korean": "\u{1F1F0}\u{1F1F7}",
          "Tagalog": "\u{1F1F5}\u{1F1ED}",
          "Russian": "\u{1F1F7}\u{1F1FA}",
          "Japanese": "\u{1F1EF}\u{1F1F5}"
        };
        const lang = g.profile?.leveledTextLanguage || "English";
        const flag = langMap[lang] || "\u{1F310}";
        const targetSel = document.getElementById("bridge-target-selector");
        const currentTarget = targetSel?.value || "all";
        const isActive = currentTarget === "all" || currentTarget === gId;
        return /* @__PURE__ */ React.createElement("div", { key: gId, style: {
          background: isActive ? "rgba(20,184,166,0.08)" : "rgba(255,255,255,0.02)",
          border: "1px solid " + (isActive ? "rgba(20,184,166,0.2)" : "rgba(255,255,255,0.04)"),
          borderRadius: "10px",
          padding: "8px 12px",
          minWidth: "110px",
          opacity: isActive ? 1 : 0.4,
          transition: "all 0.2s"
        } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", fontWeight: 700, color: isActive ? "#e2e8f0" : "#64748b", marginBottom: "2px" } }, g.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: isActive ? "#5eead4" : "#475569" } }, flag, " ", lang), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#475569", marginTop: "2px" } }, g.profile?.gradeLevel || "\u2014"));
      }))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: "8px", background: _bt.cardBg, border: _bt.cardBorder, borderRadius: "10px", padding: "10px 14px", cursor: "pointer", flex: 1, minWidth: "200px" } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          "data-help-key": "bridge_send_autoplay_toggle",
          type: "checkbox",
          id: "bridge-autoplay-toggle",
          "aria-label": t("bridge.autoplay_toggle_aria") || "Auto-play bridge narration",
          onChange: (e) => {
            window.__bridgeAutoplay = e.target.checked;
          },
          style: { accentColor: "#14b8a6", width: "16px", height: "16px", cursor: "pointer" }
        }
      ), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "13px", fontWeight: 700, color: _bt.textPrimary } }, "\u{1F50A} Audio-First Delivery"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: _bt.textMuted } }, t("bridge.autoplay_toggle_desc") || "Auto-play TTS when students receive")))), bridgeHistory.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "20px" } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "data-help-key": "bridge_send_history_toggle",
          onClick: () => setBridgeHistoryOpen((h) => !h),
          style: {
            width: "100%",
            background: _bt.cardBg,
            border: _bt.cardBorder,
            borderRadius: "12px",
            padding: "12px 16px",
            color: _bt.textSecondary,
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "all 0.2s"
          }
        },
        /* @__PURE__ */ React.createElement("span", { style: { display: "flex", alignItems: "center", gap: "8px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "16px" } }, "\u{1F4CB}"), " Message History (", bridgeHistory.length, ")"),
        /* @__PURE__ */ React.createElement("span", { style: { transform: bridgeHistoryOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", fontSize: "12px" } }, "\u25BC")
      ), bridgeHistoryOpen && /* @__PURE__ */ React.createElement("div", { style: {
        marginTop: "8px",
        maxHeight: "280px",
        overflowY: "auto",
        border: _bt.cardBorder,
        borderRadius: "14px",
        background: _bt.cardBg
      } }, bridgeHistory.map((msg, hi) => /* @__PURE__ */ React.createElement(
        "div",
        {
          key: hi,
          style: {
            padding: "14px 16px",
            borderBottom: hi < bridgeHistory.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            transition: "background 0.15s",
            cursor: "pointer"
          },
          onMouseEnter: (e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)",
          onMouseLeave: (e) => e.currentTarget.style.background = "transparent"
        },
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "13px", fontWeight: 600, color: _bt.textPrimary, marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, msg.originalPrompt || msg.english?.substring(0, 60) || "Message"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: "#64748b" } }, new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: "rgba(20,184,166,0.12)", color: "#5eead4", fontWeight: 600 } }, msg.languageName || msg.language), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: "rgba(99,102,241,0.12)", color: "#a5b4fc", fontWeight: 600 } }, msg.mode === "explain" ? "\u{1F4A1} Explain" : msg.mode === "translate" ? "\u{1F310} Translate" : "\u{1F3A8} Visual"), msg.terms && msg.terms.length > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: "#64748b" } }, msg.terms.length, " terms"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "6px", flexShrink: 0 } }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: (e) => {
              e.stopPropagation();
              setBridgeMessage({
                english: typeof msg.english === "string" ? msg.english : String(msg.english ?? ""),
                translated: typeof msg.translated === "string" ? msg.translated : String(msg.translated ?? ""),
                language: msg.language,
                languageName: msg.languageName,
                imageUrl: msg.imageUrl,
                terms: msg.terms || [],
                timestamp: msg.timestamp
              });
              setBridgeSendOpen(false);
              setBridgeTermsSaved([]);
            },
            title: t("common.view_this_message"),
            style: { background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc", padding: "6px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }
          },
          "\u{1F441}\uFE0F View"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: (e) => {
              e.stopPropagation();
              const ta = document.getElementById("bridge-send-textarea");
              if (ta) ta.value = msg.originalPrompt || msg.english || "";
              setBridgeHistoryOpen(false);
              addToast("Loaded prompt from history", "info");
            },
            title: t("common.re_use_this_prompt"),
            style: { background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.25)", color: "#5eead4", padding: "6px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }
          },
          "\u267B\uFE0F Reuse"
        )))
      )), bridgeHistory.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.04)", textAlign: "center" } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            setBridgeHistory([]);
            setBridgeHistoryOpen(false);
            addToast("History cleared", "info");
          },
          style: { background: "none", border: "none", color: "#475569", fontSize: "11px", cursor: "pointer", padding: "4px 8px", transition: "color 0.2s" },
          onMouseEnter: (e) => e.target.style.color = "#ef4444",
          onMouseLeave: (e) => e.target.style.color = "#475569"
        },
        "\u{1F5D1}\uFE0F Clear History"
      )))), bridgeSending && /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite", "aria-atomic": "true", style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "16px 20px",
        marginBottom: "16px",
        background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08))",
        border: "1px solid rgba(99,102,241,0.2)",
        borderRadius: "14px",
        animation: bridgeReducedMotion ? "none" : "pulse 2s infinite"
      } }, /* @__PURE__ */ React.createElement("div", { "aria-hidden": "true", style: {
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        border: "3px solid rgba(99,102,241,0.2)",
        borderTopColor: "#6366f1",
        animation: bridgeReducedMotion ? "none" : "bridgeSpinnerSpin 1s linear infinite"
      } }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "14px", fontWeight: 700, color: "#a5b4fc" } }, "\u2728 Generating your Bridge message..."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#64748b", marginTop: "2px" } }, t("bridge.generating_progress_desc") || "Creating explanation, translation, and visual content"))), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "data-help-key": "bridge_send_button",
          id: "bridge-send-button",
          "aria-label": bridgeSending ? "Generating content..." : "Generate and send bridge message",
          disabled: bridgeSending,
          onClick: async () => {
            const bridgeSendText = (document.getElementById("bridge-send-textarea") || {}).value || "";
            if (!bridgeSendText.trim()) {
              addToast("Please enter some text to send", "warning");
              return;
            }
            const selectedMode = window.__bridgeMode || "explain";
            const selectedTarget = window.__bridgeTarget || (document.getElementById("bridge-target-selector") || {}).value || "all";
            setBridgeSending(true);
            try {
              const targetGroups = selectedTarget === "all" ? Object.keys(rosterKey?.groups || {}) : [selectedTarget];
              const firstGroup = rosterKey?.groups?.[targetGroups[0]];
              const targetLang = window.__bridgeLang || (document.getElementById("bridge-language-selector") || {}).value || firstGroup?.profile?.leveledTextLanguage || "English";
              const gradeLevel2 = window.__bridgeGrade || (document.getElementById("bridge-grade-selector") || {}).value || firstGroup?.profile?.gradeLevel || "5th Grade";
              let prompt;
              if (selectedMode === "translate") {
                prompt = `Translate the following text to ${targetLang}. Keep it at ${gradeLevel2} reading level. Return ONLY the translation, nothing else:

${bridgeSendText}`;
              } else if (selectedMode === "simplify") {
                prompt = `Rewrite the following text at a ${gradeLevel2} reading level. Simplify vocabulary and sentence structure while preserving the key meaning. Also provide a translation in ${targetLang}. Format your response as JSON: {"english": "simplified version in English", "translated": "simplified version in ${targetLang}", "terms": ["simplified", "key", "terms"]}

Original text: ${bridgeSendText}`;
              } else if (selectedMode === "visual") {
                prompt = `Explain the following concept at ${gradeLevel2} reading level with visual vocabulary support. Also provide a translation in ${targetLang}. For each key term, include a simple child-friendly definition AND a short image description prompt. Format your response as JSON: {"english": "explanation in English", "translated": "explanation in ${targetLang}", "terms": [{"word": "term1", "definition": "simple definition", "imagePrompt": "short visual description for child-friendly illustration"}, {"word": "term2", "definition": "simple definition", "imagePrompt": "short visual description"}]}

Concept: ${bridgeSendText}`;
              } else {
                prompt = `Explain the following concept at ${gradeLevel2} reading level. Also provide a translation in ${targetLang}. For up to 3 key vocabulary terms, provide a simple child-friendly definition AND a short image description prompt. Format your response as JSON: {"english": "explanation in English", "translated": "explanation in ${targetLang}", "terms": [{"word": "term1", "definition": "simple definition", "imagePrompt": "short visual description for child-friendly illustration"}]}

Concept: ${bridgeSendText}`;
              }
              const response = await callGemini(prompt, false, false, 0.3);
              let parsed;
              try {
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
              } catch (e) {
                parsed = null;
              }
              if (selectedMode === "translate" && !parsed) {
                parsed = { english: bridgeSendText, translated: response.trim(), terms: [] };
              }
              if (!parsed) {
                parsed = { english: response.trim(), translated: "", terms: [] };
              }
              let imageUrl = null;
              if (selectedMode === "visual") {
                try {
                  imageUrl = await callGeminiImageEdit(`Educational illustration: ${bridgeSendText}. Clear, simple, child-friendly diagram suitable for ${gradeLevel2} students.`);
                } catch (e) {
                  warnLog("Bridge visual generation failed", e);
                }
              }
              if (parsed.terms && Array.isArray(parsed.terms)) {
                const termObjs = parsed.terms.filter((t2) => t2 && typeof t2 === "object" && t2.imagePrompt);
                const toGenerate = termObjs.slice(0, 3);
                for (const termObj of toGenerate) {
                  try {
                    termObj.imageUrl = await callGeminiImageEdit(`Simple child-friendly illustration of: ${termObj.imagePrompt}. Clean, colorful, educational design on white background. NO TEXT.`);
                  } catch (e) {
                    warnLog("Bridge term image failed:", termObj.word, e);
                  }
                }
              }
              const langNames = { "English": "\u{1F1FA}\u{1F1F8} English", "Spanish": "\u{1F1EA}\u{1F1F8} Espa\xF1ol", "French": "\u{1F1EB}\u{1F1F7} Fran\xE7ais", "Arabic": "\u{1F1F8}\u{1F1E6} \u0627\u0644\u0639\u0631\u0628\u064A\u0629", "Somali": "\u{1F1F8}\u{1F1F4} Soomaali", "Vietnamese": "\u{1F1FB}\u{1F1F3} Ti\u1EBFng Vi\u1EC7t", "Portuguese": "\u{1F1E7}\u{1F1F7} Portugu\xEAs", "Mandarin": "\u{1F1E8}\u{1F1F3} \u4E2D\u6587", "Korean": "\u{1F1F0}\u{1F1F7} \uD55C\uAD6D\uC5B4", "Tagalog": "\u{1F1F5}\u{1F1ED} Tagalog", "Russian": "\u{1F1F7}\u{1F1FA} \u0420\u0443\u0441\u0441\u043A\u0438\u0439", "Japanese": "\u{1F1EF}\u{1F1F5} \u65E5\u672C\u8A9E" };
              setBridgeMessage({
                // Coerce to string at the boundary: a model can occasionally return a
                // non-string (object/array) for these fields, which would crash the
                // receive modal's .split() word-rendering.
                english: (typeof parsed.english === "string" ? parsed.english : "") || bridgeSendText,
                translated: typeof parsed.translated === "string" ? parsed.translated : "",
                language: targetLang,
                languageName: langNames[targetLang] || "\u{1F310} " + targetLang,
                imageUrl: imageUrl || window.__bridgeAttachedImage || null,
                terms: parsed.terms || [],
                timestamp: Date.now(),
                autoplay: !!window.__bridgeAutoplay,
                mode: selectedMode
              });
              window.__bridgeAttachedImage = null;
              const attachBtn = document.getElementById("bridge-attach-image-btn");
              if (attachBtn) attachBtn.textContent = "\u{1F5BC}\uFE0F Attach Image";
              setBridgeHistory((prev) => [{
                english: parsed.english || bridgeSendText,
                translated: parsed.translated || "",
                language: targetLang,
                languageName: langNames[targetLang] || "\u{1F310} " + targetLang,
                imageUrl: imageUrl || window.__bridgeAttachedImage || null,
                terms: parsed.terms || [],
                mode: selectedMode,
                originalPrompt: bridgeSendText,
                timestamp: Date.now()
              }, ...prev].slice(0, 20));
              setBridgeSendOpen(false);
              const _ta = document.getElementById("bridge-send-textarea");
              if (_ta) _ta.value = "";
              addToast(t("roster.bridge_send_success") || "\u2705 Bridge message generated!", "success");
              if (window.__bridgeAutoplay) {
                setTimeout(async () => {
                  try {
                    await handleAudio(parsed.english || bridgeSendText);
                    if (parsed.translated) {
                      await new Promise((r) => setTimeout(r, 500));
                      await handleAudio(parsed.translated, targetLang);
                    }
                  } catch (e) {
                    warnLog("Bridge autoplay TTS error", e);
                  }
                }, 800);
              }
              if (activeSessionCode) {
                try {
                  const sessionRef = doc(db, "artifacts", appId, "public", "data", "sessions", activeSessionCode);
                  const _gate = typeof window !== "undefined" && window.__alloWriteToSession;
                  const _bridgeBroadcast = {
                    bridgePayload: {
                      text: bridgeSendText,
                      mode: selectedMode,
                      targetGroup: selectedTarget,
                      timestamp: Date.now(),
                      senderName: "Teacher",
                      isBlast: selectedTarget === "all",
                      // When the teacher enables "Override group settings", the UI promises
                      // every student gets THIS exact language & reading level. Carry it so
                      // the consumer can honor that instead of each student's group profile.
                      overrideLang: bridgeOverrideGroups ? targetLang : null,
                      overrideGrade: bridgeOverrideGroups ? gradeLevel2 : null,
                      languageMap: selectedTarget === "all" && rosterKey?.groups ? Object.fromEntries(Object.entries(rosterKey.groups).map(([gId, g]) => [gId, g.profile?.leveledTextLanguage || "English"])) : null
                    },
                    bridgeReactions: deleteField()
                  };
                  if (typeof _gate === "function") {
                    await _gate(sessionRef, _bridgeBroadcast);
                  } else {
                    warnLog("Bridge: privacy gate unavailable; class broadcast skipped (not bypassing)");
                  }
                } catch (fbErr) {
                  warnLog("Bridge Firebase write failed:", fbErr);
                }
              }
            } catch (err) {
              console.error("[BRIDGE] Send failed with error:", err?.message, err);
              warnLog("Bridge send failed", err);
              addToast("Bridge send failed: " + err.message, "error");
            } finally {
              setBridgeSending(false);
            }
          },
          style: {
            width: "100%",
            background: bridgeSending ? "rgba(20,184,166,0.3)" : "linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf)",
            border: "none",
            color: "white",
            padding: "16px 24px",
            borderRadius: "16px",
            fontSize: "16px",
            fontWeight: 800,
            cursor: bridgeSending ? "not-allowed" : "pointer",
            transition: "all 0.3s",
            boxShadow: bridgeSending ? "none" : "0 4px 20px rgba(20,184,166,0.3), 0 0 40px rgba(20,184,166,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            letterSpacing: "0.01em",
            opacity: bridgeSending ? 0.7 : 1,
            transform: bridgeSending ? "none" : "translateY(0)"
          }
        },
        bridgeSending ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-block", animation: bridgeReducedMotion ? "none" : "pulse 1.5s ease-in-out infinite", fontSize: "18px" } }, "\u23F3"), " ", t("bridge.generating_bilingual_status") || "Generating bilingual content...") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "18px" } }, "\u{1F4E1}"), " ", t("bridge.generate_and_send_button") || "Generate & Send to Class")
      ), bridgeChatOpen && (() => {
        const _langCodes = {
          "English": "en-US",
          "Spanish": "es-ES",
          "French": "fr-FR",
          "Arabic": "ar-SA",
          "Somali": "so-SO",
          "Vietnamese": "vi-VN",
          "Portuguese": "pt-BR",
          "Mandarin": "zh-CN",
          "Korean": "ko-KR",
          "Tagalog": "tl-PH",
          "Russian": "ru-RU",
          "Japanese": "ja-JP",
          "Haitian Creole": "ht-HT",
          "Swahili": "sw-KE",
          "Hmong": "hmn",
          "Burmese": "my-MM",
          "Nepali": "ne-NP",
          "German": "de-DE",
          "Italian": "it-IT",
          "Polish": "pl-PL",
          "Ukrainian": "uk-UA",
          "Hindi": "hi-IN",
          "Urdu": "ur-PK",
          "Bengali": "bn-BD",
          "Thai": "th-TH",
          "Indonesian": "id-ID",
          "Malay": "ms-MY",
          "Turkish": "tr-TR",
          "Dutch": "nl-NL",
          "Greek": "el-GR",
          "Czech": "cs-CZ",
          "Romanian": "ro-RO",
          "Hungarian": "hu-HU",
          "Swedish": "sv-SE",
          "Norwegian": "nb-NO",
          "Danish": "da-DK",
          "Finnish": "fi-FI",
          "Hebrew": "he-IL",
          "Persian": "fa-IR",
          "Pashto": "ps-AF",
          "Amharic": "am-ET",
          "Tigrinya": "ti-ET",
          "Yoruba": "yo-NG",
          "Igbo": "ig-NG",
          "Hausa": "ha-NG",
          "Zulu": "zu-ZA",
          "Xhosa": "xh-ZA",
          "Afrikaans": "af-ZA",
          "Maori": "mi-NZ",
          "Samoan": "sm-WS",
          "Tongan": "to-TO",
          "Hawaiian": "haw-US",
          "Cherokee": "chr-US",
          "Navajo": "nv-US",
          "Marshallese": "mh-MH",
          "Chuukese": "chk-FM",
          "Gujarati": "gu-IN",
          "Punjabi": "pa-IN",
          "Tamil": "ta-IN",
          "Telugu": "te-IN",
          "Kannada": "kn-IN",
          "Malayalam": "ml-IN",
          "Sinhala": "si-LK",
          "Khmer": "km-KH",
          "Lao": "lo-LA",
          "Dari": "fa-AF",
          "Kurdish": "ku-IQ",
          "Azerbaijani": "az-AZ",
          "Georgian": "ka-GE",
          "Armenian": "hy-AM",
          "Mongolian": "mn-MN",
          "Kazakh": "kk-KZ",
          "Uzbek": "uz-UZ"
        };
        const _resolveBridgeLang = (sel, custom) => {
          const c = (custom || "").trim();
          return c || (sel === "custom" ? "" : sel);
        };
        const _personALang = _resolveBridgeLang(bridgeF2FTeacherLang, bridgeF2FCustomLangA);
        const _personBLang = _resolveBridgeLang(bridgeF2FLang, bridgeF2FCustomLangB);
        const _getLangCode = (lang) => _langCodes[lang] || lang.toLowerCase().slice(0, 2);
        const _sendMessage = async (sender, text, fromLang, toLang) => {
          if (!fromLang || !toLang) {
            addToast(t("roster.bridge_f2f_pick_lang") || "Type the custom language name first", "warning");
            return;
          }
          const msgId = Date.now();
          setBridgeChatMessages((prev) => [...prev, { id: msgId, sender, text, translating: true, timestamp: Date.now() }]);
          setBridgeF2FTranslating(true);
          setTimeout(() => {
            const c = document.getElementById("bridge-f2f-messages");
            if (c) c.scrollTop = c.scrollHeight;
          }, 50);
          try {
            let translated = null;
            if (window.AlloTranslate && typeof window.AlloTranslate.supports === "function" && window.AlloTranslate.supports(fromLang, toLang)) {
              try {
                translated = await window.AlloTranslate.translate(text, fromLang, toLang);
              } catch (_odErr) {
              }
            }
            if (translated == null) {
              translated = await callGemini("Translate the following " + fromLang + " text to " + toLang + ". Return ONLY the translation, no explanations or notes:\n\n" + text, false, false, 0.3);
            }
            setBridgeChatMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, translated, translating: false } : m));
            setTimeout(() => {
              const c = document.getElementById("bridge-f2f-messages");
              if (c) c.scrollTop = c.scrollHeight;
            }, 50);
            try {
              await handleAudio(translated, toLang);
            } catch (e2) {
              warnLog("F2F TTS error", e2);
            }
          } catch (err) {
            setBridgeChatMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, translated: "[" + (t("roster.bridge_f2f_translate_failed") || "Translation failed") + "]", translating: false } : m));
            addToast((t("roster.bridge_f2f_translate_failed") || "Translation failed") + ": " + err.message, "error");
          }
          setBridgeF2FTranslating(false);
        };
        const _startListening = (side, langCode, inputId) => {
          if (!langCode) {
            addToast(t("roster.bridge_f2f_pick_lang") || "Type the custom language name first", "warning");
            return;
          }
          const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (!SR) {
            addToast(t("roster.bridge_f2f_no_speech") || "Speech recognition not supported", "error");
            return;
          }
          if (bridgeF2FListening === side) {
            _bridgeStopListening();
            setBridgeF2FListening(null);
            return;
          }
          _bridgeStopListening();
          const rec = new SR();
          _bridgeActiveRec = rec;
          rec.lang = langCode;
          rec.interimResults = false;
          rec.maxAlternatives = 1;
          setBridgeF2FListening(side);
          rec.onresult = (event) => {
            const text = event.results[0][0].transcript;
            const input = document.getElementById(inputId);
            if (input) {
              input.value = text;
              input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
            }
          };
          rec.onerror = () => {
            _bridgeActiveRec = null;
            setBridgeF2FListening(null);
          };
          rec.onend = () => {
            _bridgeActiveRec = null;
            setBridgeF2FListening(null);
          };
          rec.start();
        };
        const _askAI = async (question) => {
          if (!_personALang || !_personBLang) {
            addToast(t("roster.bridge_f2f_pick_lang") || "Type the custom language name first", "warning");
            return;
          }
          const msgId = Date.now();
          setBridgeChatMessages((prev) => [...prev, { id: msgId, sender: "ai", ai: true, text: question, translating: true, timestamp: Date.now() }]);
          setBridgeF2FTranslating(true);
          setTimeout(() => {
            const c = document.getElementById("bridge-f2f-messages");
            if (c) c.scrollTop = c.scrollHeight;
          }, 50);
          try {
            const answer = await callGemini("You are a warm, concise interpreter-helper for a live conversation between an educator (speaking " + _personALang + ") and a family member (speaking " + _personBLang + '). The educator asks for help: "' + question + '". Reply in ' + _personALang + " in 1 to 3 short sentences, or a short list of words if they asked for vocabulary. Be practical, friendly, and plain. If they asked how to say something, give the exact phrasing. Do not use em dashes.", false, false, 0.4);
            let answerTranslated = "";
            try {
              answerTranslated = await callGemini("Translate the following " + _personALang + " text to " + _personBLang + ". Return ONLY the translation, no notes:\n\n" + answer, false, false, 0.3);
            } catch (e2) {
            }
            setBridgeChatMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, answer, translated: answerTranslated, translating: false } : m));
            setTimeout(() => {
              const c = document.getElementById("bridge-f2f-messages");
              if (c) c.scrollTop = c.scrollHeight;
            }, 50);
            try {
              await handleAudio(answer, _personALang);
            } catch (e3) {
              warnLog("AI assist TTS error", e3);
            }
          } catch (err) {
            setBridgeChatMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, answer: "[" + (t("roster.bridge_ai_unavailable") || "AI unavailable right now") + "]", translating: false } : m));
            addToast((t("roster.bridge_ai_unavailable") || "AI unavailable right now") + ": " + err.message, "error");
          }
          setBridgeF2FTranslating(false);
        };
        const _exportTranscript = async () => {
          if (!bridgeChatMessages.length) {
            addToast(t("roster.bridge_no_convo") || "Nothing to export yet", "info");
            return;
          }
          const text = "Bridge conversation (" + _personALang + " / " + _personBLang + ")\n\n" + _bridgeTranscript(bridgeChatMessages, _personALang, _personBLang);
          let copied = false;
          try {
            copied = window.alloCopyText ? await window.alloCopyText(text) : (await navigator.clipboard.writeText(text), true);
          } catch (e) {
            copied = false;
          }
          try {
            const blob = new Blob([text], { type: "text/plain" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "bridge-conversation.txt";
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 2e3);
          } catch (e) {
          }
          addToast(copied ? t("roster.bridge_exported") || "Conversation copied to clipboard" : t("roster.bridge_downloaded") || "Conversation downloaded", "success");
        };
        const _stagePhrase = (ph) => {
          const el = document.getElementById("bridge-f2f-a-input");
          if (el) {
            el.value = ph;
            el.focus();
            try {
              el.setSelectionRange(ph.length, ph.length);
            } catch (e) {
            }
          } else {
            _sendMessage("personA", ph, _personALang, _personBLang);
          }
        };
        const _generatePhrases = async (instruction) => {
          if (!_personALang) {
            addToast(t("roster.bridge_f2f_pick_lang") || "Type the custom language name first", "warning");
            return;
          }
          setBridgeGenLoading(true);
          try {
            const raw = await callGemini('You are helping an educator speak warmly with a family. Generate 6 short, friendly, FERPA-safe phrases (NO student names or identifying details) an educator could say about: "' + instruction + '". Write each phrase in ' + _personALang + ", one short sentence each, plain and kind. Do not use em dashes. Return ONLY a JSON array of strings.", true, false, 0.7);
            let arr = raw;
            if (typeof raw === "string") {
              try {
                arr = JSON.parse(raw);
              } catch (e) {
                arr = raw.split("\n").map((s) => s.replace(/^[\s\-*\d.\)\]"']+/, "").replace(/["'\],]+\s*$/, "").trim()).filter(Boolean);
              }
            }
            if (!Array.isArray(arr)) arr = [];
            arr = arr.map((s) => String(s).trim()).filter(Boolean).slice(0, 8);
            setBridgeGenPhrases(arr);
            if (!arr.length) addToast(t("roster.bridge_gen_none") || "No phrases generated. Try rephrasing.", "info");
          } catch (err) {
            addToast((t("roster.bridge_gen_failed") || "Could not generate phrases") + ": " + err.message, "error");
          }
          setBridgeGenLoading(false);
        };
        return /* @__PURE__ */ React.createElement("div", { style: { marginTop: "20px", borderTop: "1px solid rgba(20,184,166,0.15)", paddingTop: "20px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: "16px", fontWeight: 800, color: typeof _bt !== "undefined" ? _bt.textAccent : "#5eead4", display: "flex", alignItems: "center", gap: "8px" } }, /* @__PURE__ */ React.createElement("span", null, "\u{1F310}"), " ", t("roster.bridge_f2f_title") || "Face-to-Face Translation"), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: () => {
              _bridgeStopListening();
              setBridgeChatOpen(false);
              setBridgeChatMessages([]);
              setBridgeF2FListening(null);
              setBridgeGenPhrases([]);
              setBridgeGenLoading(false);
              setBridgePhraseCat(null);
            },
            style: { background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", padding: "6px 14px", borderRadius: "10px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }
          },
          t("roster.bridge_f2f_end") || "End"
        )), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", fontWeight: 700, color: "#5eead4", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" } }, t("roster.bridge_f2f_person_a") || "Person A"), /* @__PURE__ */ React.createElement(
          "select",
          {
            "aria-label": t("roster.bridge_f2f_person_a_language") || "Person A language",
            value: bridgeF2FTeacherLang,
            onChange: (e) => {
              setBridgeF2FTeacherLang(e.target.value);
              setBridgeF2FCustomLangA("");
            },
            style: { width: "100%", background: typeof _bt !== "undefined" ? _bt.inputBg : "rgba(255,255,255,0.04)", border: typeof _bt !== "undefined" ? _bt.inputBorder : "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "8px 10px", color: typeof _bt !== "undefined" ? _bt.inputText : "#e2e8f0", fontSize: "12px", fontWeight: 600, cursor: "pointer" }
          },
          /* @__PURE__ */ React.createElement("option", { value: "custom", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "\u270F\uFE0F ", t("roster.bridge_f2f_custom_lang") || "Custom..."),
          /* @__PURE__ */ React.createElement("option", { key: "English", value: "English", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "English"),
          /* @__PURE__ */ React.createElement("option", { key: "Spanish", value: "Spanish", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Spanish"),
          /* @__PURE__ */ React.createElement("option", { key: "French", value: "French", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "French"),
          /* @__PURE__ */ React.createElement("option", { key: "Arabic", value: "Arabic", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Arabic"),
          /* @__PURE__ */ React.createElement("option", { key: "Somali", value: "Somali", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Somali"),
          /* @__PURE__ */ React.createElement("option", { key: "Vietnamese", value: "Vietnamese", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Vietnamese"),
          /* @__PURE__ */ React.createElement("option", { key: "Portuguese", value: "Portuguese", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Portuguese"),
          /* @__PURE__ */ React.createElement("option", { key: "Mandarin", value: "Mandarin", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Mandarin"),
          /* @__PURE__ */ React.createElement("option", { key: "Korean", value: "Korean", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Korean"),
          /* @__PURE__ */ React.createElement("option", { key: "Tagalog", value: "Tagalog", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Tagalog"),
          /* @__PURE__ */ React.createElement("option", { key: "Russian", value: "Russian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Russian"),
          /* @__PURE__ */ React.createElement("option", { key: "Japanese", value: "Japanese", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Japanese"),
          /* @__PURE__ */ React.createElement("option", { key: "Haitian Creole", value: "Haitian Creole", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, t("common.haitian_creole")),
          /* @__PURE__ */ React.createElement("option", { key: "Swahili", value: "Swahili", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Swahili"),
          /* @__PURE__ */ React.createElement("option", { key: "Hmong", value: "Hmong", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Hmong"),
          /* @__PURE__ */ React.createElement("option", { key: "Burmese", value: "Burmese", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Burmese"),
          /* @__PURE__ */ React.createElement("option", { key: "Nepali", value: "Nepali", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Nepali"),
          /* @__PURE__ */ React.createElement("option", { key: "German", value: "German", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "German"),
          /* @__PURE__ */ React.createElement("option", { key: "Italian", value: "Italian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Italian"),
          /* @__PURE__ */ React.createElement("option", { key: "Polish", value: "Polish", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Polish"),
          /* @__PURE__ */ React.createElement("option", { key: "Ukrainian", value: "Ukrainian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Ukrainian"),
          /* @__PURE__ */ React.createElement("option", { key: "Hindi", value: "Hindi", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Hindi"),
          /* @__PURE__ */ React.createElement("option", { key: "Urdu", value: "Urdu", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Urdu"),
          /* @__PURE__ */ React.createElement("option", { key: "Bengali", value: "Bengali", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Bengali"),
          /* @__PURE__ */ React.createElement("option", { key: "Thai", value: "Thai", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Thai"),
          /* @__PURE__ */ React.createElement("option", { key: "Indonesian", value: "Indonesian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Indonesian"),
          /* @__PURE__ */ React.createElement("option", { key: "Malay", value: "Malay", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Malay"),
          /* @__PURE__ */ React.createElement("option", { key: "Turkish", value: "Turkish", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Turkish"),
          /* @__PURE__ */ React.createElement("option", { key: "Dutch", value: "Dutch", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Dutch"),
          /* @__PURE__ */ React.createElement("option", { key: "Greek", value: "Greek", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Greek"),
          /* @__PURE__ */ React.createElement("option", { key: "Czech", value: "Czech", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Czech"),
          /* @__PURE__ */ React.createElement("option", { key: "Romanian", value: "Romanian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Romanian"),
          /* @__PURE__ */ React.createElement("option", { key: "Hungarian", value: "Hungarian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Hungarian"),
          /* @__PURE__ */ React.createElement("option", { key: "Swedish", value: "Swedish", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Swedish"),
          /* @__PURE__ */ React.createElement("option", { key: "Norwegian", value: "Norwegian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Norwegian"),
          /* @__PURE__ */ React.createElement("option", { key: "Danish", value: "Danish", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Danish"),
          /* @__PURE__ */ React.createElement("option", { key: "Finnish", value: "Finnish", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Finnish"),
          /* @__PURE__ */ React.createElement("option", { key: "Hebrew", value: "Hebrew", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Hebrew"),
          /* @__PURE__ */ React.createElement("option", { key: "Persian", value: "Persian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Persian"),
          /* @__PURE__ */ React.createElement("option", { key: "Pashto", value: "Pashto", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Pashto"),
          /* @__PURE__ */ React.createElement("option", { key: "Amharic", value: "Amharic", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Amharic"),
          /* @__PURE__ */ React.createElement("option", { key: "Tigrinya", value: "Tigrinya", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Tigrinya"),
          /* @__PURE__ */ React.createElement("option", { key: "Yoruba", value: "Yoruba", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Yoruba"),
          /* @__PURE__ */ React.createElement("option", { key: "Igbo", value: "Igbo", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Igbo"),
          /* @__PURE__ */ React.createElement("option", { key: "Hausa", value: "Hausa", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Hausa"),
          /* @__PURE__ */ React.createElement("option", { key: "Zulu", value: "Zulu", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Zulu"),
          /* @__PURE__ */ React.createElement("option", { key: "Xhosa", value: "Xhosa", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Xhosa"),
          /* @__PURE__ */ React.createElement("option", { key: "Afrikaans", value: "Afrikaans", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Afrikaans"),
          /* @__PURE__ */ React.createElement("option", { key: "Maori", value: "Maori", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Maori"),
          /* @__PURE__ */ React.createElement("option", { key: "Samoan", value: "Samoan", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Samoan"),
          /* @__PURE__ */ React.createElement("option", { key: "Tongan", value: "Tongan", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Tongan"),
          /* @__PURE__ */ React.createElement("option", { key: "Hawaiian", value: "Hawaiian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Hawaiian"),
          /* @__PURE__ */ React.createElement("option", { key: "Cherokee", value: "Cherokee", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Cherokee"),
          /* @__PURE__ */ React.createElement("option", { key: "Navajo", value: "Navajo", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Navajo"),
          /* @__PURE__ */ React.createElement("option", { key: "Marshallese", value: "Marshallese", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Marshallese"),
          /* @__PURE__ */ React.createElement("option", { key: "Chuukese", value: "Chuukese", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Chuukese"),
          /* @__PURE__ */ React.createElement("option", { key: "Gujarati", value: "Gujarati", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Gujarati"),
          /* @__PURE__ */ React.createElement("option", { key: "Punjabi", value: "Punjabi", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Punjabi"),
          /* @__PURE__ */ React.createElement("option", { key: "Tamil", value: "Tamil", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Tamil"),
          /* @__PURE__ */ React.createElement("option", { key: "Telugu", value: "Telugu", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Telugu"),
          /* @__PURE__ */ React.createElement("option", { key: "Kannada", value: "Kannada", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Kannada"),
          /* @__PURE__ */ React.createElement("option", { key: "Malayalam", value: "Malayalam", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Malayalam"),
          /* @__PURE__ */ React.createElement("option", { key: "Sinhala", value: "Sinhala", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Sinhala"),
          /* @__PURE__ */ React.createElement("option", { key: "Khmer", value: "Khmer", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Khmer"),
          /* @__PURE__ */ React.createElement("option", { key: "Lao", value: "Lao", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Lao"),
          /* @__PURE__ */ React.createElement("option", { key: "Dari", value: "Dari", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Dari"),
          /* @__PURE__ */ React.createElement("option", { key: "Kurdish", value: "Kurdish", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Kurdish"),
          /* @__PURE__ */ React.createElement("option", { key: "Azerbaijani", value: "Azerbaijani", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Azerbaijani"),
          /* @__PURE__ */ React.createElement("option", { key: "Georgian", value: "Georgian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Georgian"),
          /* @__PURE__ */ React.createElement("option", { key: "Armenian", value: "Armenian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Armenian"),
          /* @__PURE__ */ React.createElement("option", { key: "Mongolian", value: "Mongolian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Mongolian"),
          /* @__PURE__ */ React.createElement("option", { key: "Kazakh", value: "Kazakh", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Kazakh"),
          /* @__PURE__ */ React.createElement("option", { key: "Uzbek", value: "Uzbek", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Uzbek")
        ), bridgeF2FTeacherLang === "custom" && /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "text",
            "aria-label": t("roster.bridge_f2f_custom_lang_a") || "Person A custom language",
            value: bridgeF2FCustomLangA,
            onChange: (e) => setBridgeF2FCustomLangA(e.target.value),
            placeholder: t("roster.bridge_f2f_custom_placeholder") || "e.g. Yoruba, Tigrinya...",
            style: { width: "100%", boxSizing: "border-box", marginTop: "6px", background: typeof _bt !== "undefined" ? _bt.inputBg : "rgba(255,255,255,0.04)", border: typeof _bt !== "undefined" ? _bt.inputBorder : "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "8px 10px", color: typeof _bt !== "undefined" ? _bt.inputText : "#e2e8f0", fontSize: "12px" }
          }
        )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" } }, t("roster.bridge_f2f_person_b") || "Person B"), /* @__PURE__ */ React.createElement(
          "select",
          {
            "aria-label": t("roster.bridge_f2f_person_b_language") || "Person B language",
            value: bridgeF2FLang,
            onChange: (e) => {
              setBridgeF2FLang(e.target.value);
              setBridgeF2FCustomLangB("");
            },
            style: { width: "100%", background: typeof _bt !== "undefined" ? _bt.inputBg : "rgba(255,255,255,0.04)", border: typeof _bt !== "undefined" ? _bt.inputBorder : "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "8px 10px", color: typeof _bt !== "undefined" ? _bt.inputText : "#e2e8f0", fontSize: "12px", fontWeight: 600, cursor: "pointer" }
          },
          /* @__PURE__ */ React.createElement("option", { value: "custom", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "\u270F\uFE0F ", t("roster.bridge_f2f_custom_lang") || "Custom..."),
          /* @__PURE__ */ React.createElement("option", { key: "English", value: "English", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "English"),
          /* @__PURE__ */ React.createElement("option", { key: "Spanish", value: "Spanish", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Spanish"),
          /* @__PURE__ */ React.createElement("option", { key: "French", value: "French", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "French"),
          /* @__PURE__ */ React.createElement("option", { key: "Arabic", value: "Arabic", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Arabic"),
          /* @__PURE__ */ React.createElement("option", { key: "Somali", value: "Somali", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Somali"),
          /* @__PURE__ */ React.createElement("option", { key: "Vietnamese", value: "Vietnamese", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Vietnamese"),
          /* @__PURE__ */ React.createElement("option", { key: "Portuguese", value: "Portuguese", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Portuguese"),
          /* @__PURE__ */ React.createElement("option", { key: "Mandarin", value: "Mandarin", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Mandarin"),
          /* @__PURE__ */ React.createElement("option", { key: "Korean", value: "Korean", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Korean"),
          /* @__PURE__ */ React.createElement("option", { key: "Tagalog", value: "Tagalog", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Tagalog"),
          /* @__PURE__ */ React.createElement("option", { key: "Russian", value: "Russian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Russian"),
          /* @__PURE__ */ React.createElement("option", { key: "Japanese", value: "Japanese", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Japanese"),
          /* @__PURE__ */ React.createElement("option", { key: "Haitian Creole", value: "Haitian Creole", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, t("common.haitian_creole")),
          /* @__PURE__ */ React.createElement("option", { key: "Swahili", value: "Swahili", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Swahili"),
          /* @__PURE__ */ React.createElement("option", { key: "Hmong", value: "Hmong", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Hmong"),
          /* @__PURE__ */ React.createElement("option", { key: "Burmese", value: "Burmese", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Burmese"),
          /* @__PURE__ */ React.createElement("option", { key: "Nepali", value: "Nepali", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Nepali"),
          /* @__PURE__ */ React.createElement("option", { key: "German", value: "German", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "German"),
          /* @__PURE__ */ React.createElement("option", { key: "Italian", value: "Italian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Italian"),
          /* @__PURE__ */ React.createElement("option", { key: "Polish", value: "Polish", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Polish"),
          /* @__PURE__ */ React.createElement("option", { key: "Ukrainian", value: "Ukrainian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Ukrainian"),
          /* @__PURE__ */ React.createElement("option", { key: "Hindi", value: "Hindi", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Hindi"),
          /* @__PURE__ */ React.createElement("option", { key: "Urdu", value: "Urdu", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Urdu"),
          /* @__PURE__ */ React.createElement("option", { key: "Bengali", value: "Bengali", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Bengali"),
          /* @__PURE__ */ React.createElement("option", { key: "Thai", value: "Thai", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Thai"),
          /* @__PURE__ */ React.createElement("option", { key: "Indonesian", value: "Indonesian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Indonesian"),
          /* @__PURE__ */ React.createElement("option", { key: "Malay", value: "Malay", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Malay"),
          /* @__PURE__ */ React.createElement("option", { key: "Turkish", value: "Turkish", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Turkish"),
          /* @__PURE__ */ React.createElement("option", { key: "Dutch", value: "Dutch", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Dutch"),
          /* @__PURE__ */ React.createElement("option", { key: "Greek", value: "Greek", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Greek"),
          /* @__PURE__ */ React.createElement("option", { key: "Czech", value: "Czech", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Czech"),
          /* @__PURE__ */ React.createElement("option", { key: "Romanian", value: "Romanian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Romanian"),
          /* @__PURE__ */ React.createElement("option", { key: "Hungarian", value: "Hungarian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Hungarian"),
          /* @__PURE__ */ React.createElement("option", { key: "Swedish", value: "Swedish", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Swedish"),
          /* @__PURE__ */ React.createElement("option", { key: "Norwegian", value: "Norwegian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Norwegian"),
          /* @__PURE__ */ React.createElement("option", { key: "Danish", value: "Danish", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Danish"),
          /* @__PURE__ */ React.createElement("option", { key: "Finnish", value: "Finnish", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Finnish"),
          /* @__PURE__ */ React.createElement("option", { key: "Hebrew", value: "Hebrew", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Hebrew"),
          /* @__PURE__ */ React.createElement("option", { key: "Persian", value: "Persian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Persian"),
          /* @__PURE__ */ React.createElement("option", { key: "Pashto", value: "Pashto", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Pashto"),
          /* @__PURE__ */ React.createElement("option", { key: "Amharic", value: "Amharic", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Amharic"),
          /* @__PURE__ */ React.createElement("option", { key: "Tigrinya", value: "Tigrinya", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Tigrinya"),
          /* @__PURE__ */ React.createElement("option", { key: "Yoruba", value: "Yoruba", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Yoruba"),
          /* @__PURE__ */ React.createElement("option", { key: "Igbo", value: "Igbo", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Igbo"),
          /* @__PURE__ */ React.createElement("option", { key: "Hausa", value: "Hausa", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Hausa"),
          /* @__PURE__ */ React.createElement("option", { key: "Zulu", value: "Zulu", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Zulu"),
          /* @__PURE__ */ React.createElement("option", { key: "Xhosa", value: "Xhosa", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Xhosa"),
          /* @__PURE__ */ React.createElement("option", { key: "Afrikaans", value: "Afrikaans", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Afrikaans"),
          /* @__PURE__ */ React.createElement("option", { key: "Maori", value: "Maori", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Maori"),
          /* @__PURE__ */ React.createElement("option", { key: "Samoan", value: "Samoan", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Samoan"),
          /* @__PURE__ */ React.createElement("option", { key: "Tongan", value: "Tongan", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Tongan"),
          /* @__PURE__ */ React.createElement("option", { key: "Hawaiian", value: "Hawaiian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Hawaiian"),
          /* @__PURE__ */ React.createElement("option", { key: "Cherokee", value: "Cherokee", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Cherokee"),
          /* @__PURE__ */ React.createElement("option", { key: "Navajo", value: "Navajo", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Navajo"),
          /* @__PURE__ */ React.createElement("option", { key: "Marshallese", value: "Marshallese", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Marshallese"),
          /* @__PURE__ */ React.createElement("option", { key: "Chuukese", value: "Chuukese", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Chuukese"),
          /* @__PURE__ */ React.createElement("option", { key: "Gujarati", value: "Gujarati", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Gujarati"),
          /* @__PURE__ */ React.createElement("option", { key: "Punjabi", value: "Punjabi", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Punjabi"),
          /* @__PURE__ */ React.createElement("option", { key: "Tamil", value: "Tamil", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Tamil"),
          /* @__PURE__ */ React.createElement("option", { key: "Telugu", value: "Telugu", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Telugu"),
          /* @__PURE__ */ React.createElement("option", { key: "Kannada", value: "Kannada", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Kannada"),
          /* @__PURE__ */ React.createElement("option", { key: "Malayalam", value: "Malayalam", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Malayalam"),
          /* @__PURE__ */ React.createElement("option", { key: "Sinhala", value: "Sinhala", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Sinhala"),
          /* @__PURE__ */ React.createElement("option", { key: "Khmer", value: "Khmer", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Khmer"),
          /* @__PURE__ */ React.createElement("option", { key: "Lao", value: "Lao", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Lao"),
          /* @__PURE__ */ React.createElement("option", { key: "Dari", value: "Dari", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Dari"),
          /* @__PURE__ */ React.createElement("option", { key: "Kurdish", value: "Kurdish", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Kurdish"),
          /* @__PURE__ */ React.createElement("option", { key: "Azerbaijani", value: "Azerbaijani", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Azerbaijani"),
          /* @__PURE__ */ React.createElement("option", { key: "Georgian", value: "Georgian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Georgian"),
          /* @__PURE__ */ React.createElement("option", { key: "Armenian", value: "Armenian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Armenian"),
          /* @__PURE__ */ React.createElement("option", { key: "Mongolian", value: "Mongolian", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Mongolian"),
          /* @__PURE__ */ React.createElement("option", { key: "Kazakh", value: "Kazakh", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Kazakh"),
          /* @__PURE__ */ React.createElement("option", { key: "Uzbek", value: "Uzbek", style: { background: typeof _bt !== "undefined" ? _bt.selectBg : "#1e293b", color: typeof _bt !== "undefined" ? _bt.selectText : "#e2e8f0" } }, "Uzbek")
        ), bridgeF2FLang === "custom" && /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "text",
            "aria-label": t("roster.bridge_f2f_custom_lang_b") || "Person B custom language",
            value: bridgeF2FCustomLangB,
            onChange: (e) => setBridgeF2FCustomLangB(e.target.value),
            placeholder: t("roster.bridge_f2f_custom_placeholder") || "e.g. Yoruba, Tigrinya...",
            style: { width: "100%", boxSizing: "border-box", marginTop: "6px", background: typeof _bt !== "undefined" ? _bt.inputBg : "rgba(255,255,255,0.04)", border: typeof _bt !== "undefined" ? _bt.inputBorder : "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "8px 10px", color: typeof _bt !== "undefined" ? _bt.inputText : "#e2e8f0", fontSize: "12px" }
          }
        ))), (() => {
          const _odActive = !!(window.AlloTranslate && typeof window.AlloTranslate.supports === "function" && window.AlloTranslate.supports(_personALang, _personBLang));
          const _odPossible = !!(_personALang && _personBLang);
          return React.createElement(
            "div",
            { style: { marginBottom: "12px", textAlign: "center" } },
            React.createElement(
              "div",
              { style: { fontSize: "11px", color: typeof _bt !== "undefined" ? _bt.textMuted : "#64748b", fontStyle: "italic", marginBottom: _odActive ? "0" : "6px" } },
              _odActive ? "\u{1F512} " + (t("roster.bridge_f2f_ferpa_ondevice") || "Private: translated on this device \u2014 nothing is sent out.") + " \u2022 " + (t("roster.bridge_f2f_both_speak") || "Both sides speak or type in their own language") : "\u{1F512} " + (t("roster.bridge_f2f_ferpa") || "Private: never saved or synced. Translation is processed by a secure AI service.") + " \u2022 " + (t("roster.bridge_f2f_both_speak") || "Both sides speak or type in their own language")
            ),
            !_odActive && _odPossible ? React.createElement("button", {
              type: "button",
              onClick: async () => {
                addToast(t("roster.bridge_ondevice_loading") || "Loading on-device translation\u2026", "info");
                try {
                  if (!window.AlloTranslate && window.__alloLoadPlugin) {
                    await window.__alloLoadPlugin("translate_loader.js");
                  }
                  if (window.AlloTranslate && window.AlloTranslate.supports(_personALang, _personBLang)) {
                    const ok = await window.AlloTranslate.preload(_personALang, _personBLang);
                    addToast(ok ? t("roster.bridge_ondevice_ready") || "On-device translation on \u2014 this language pair now stays on your device." : t("roster.bridge_ondevice_pair_na") || "No on-device model for this pair yet; using the secure service.", ok ? "success" : "info");
                  } else {
                    addToast(t("roster.bridge_ondevice_pair_na") || "On-device translation isn't available for this language pair yet; using the secure service.", "info");
                  }
                } catch (_e) {
                  addToast(t("roster.bridge_ondevice_failed") || "Could not load on-device translation; using the secure service.", "info");
                }
              },
              title: t("roster.bridge_ondevice_hint") || "Download a small model so this language pair translates on your device, with nothing sent out",
              style: { fontSize: "11px", fontWeight: 600, color: "#0e7490", background: "rgba(14,116,144,0.08)", border: "1px solid rgba(14,116,144,0.3)", borderRadius: "999px", padding: "3px 12px", cursor: "pointer" }
            }, "\u{1F512} " + (t("roster.bridge_ondevice_enable") || "Translate on this device (private)")) : null
          );
        })(), _bridgePhrasesPanel(_stagePhrase, bridgeF2FTranslating, t, _bt, { phrases: bridgeGenPhrases, onGenerate: _generatePhrases, loading: bridgeGenLoading, activeCat: bridgePhraseCat, onCat: setBridgePhraseCat }), _bridgeAiBar((q) => _askAI(q), _exportTranscript, bridgeF2FTranslating, t, _bt), /* @__PURE__ */ React.createElement("div", { id: "bridge-f2f-messages", role: "log", "aria-live": "polite", "aria-relevant": "additions text", "aria-atomic": "false", "aria-label": t("roster.bridge_f2f_thread_label") || "Conversation", style: {
          background: "rgba(0,0,0,0.15)",
          border: "1px solid rgba(255,255,255,0.04)",
          borderRadius: "16px",
          padding: "16px",
          maxHeight: bridgeFullscreen ? "60vh" : "300px",
          overflowY: "auto",
          marginBottom: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        } }, bridgeChatMessages.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "40px 20px", color: typeof _bt !== "undefined" ? _bt.textSecondary : "#94a3b8" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "40px", marginBottom: "8px" } }, "\u{1F91D}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "14px", fontWeight: 700 } }, t("roster.bridge_f2f_ready") || "Ready for conversation"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", marginTop: "6px", lineHeight: 1.5 } }, _personALang, " \u2194 ", _personBLang, /* @__PURE__ */ React.createElement("br", null), t("roster.bridge_f2f_ready_desc") || "Press the microphone or type to begin")) : bridgeChatMessages.map((msg, ci) => msg.ai ? _bridgeAiBubble(msg, _personALang, _personBLang, handleAudio, t, _bt) : /* @__PURE__ */ React.createElement("div", { key: ci, style: {
          display: "flex",
          flexDirection: "column",
          alignItems: msg.sender === "personA" ? "flex-end" : "flex-start",
          gap: "4px"
        } }, /* @__PURE__ */ React.createElement("div", { style: {
          maxWidth: "85%",
          background: msg.sender === "personA" ? "linear-gradient(135deg, rgba(20,184,166,0.15), rgba(13,148,136,0.1))" : "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.1))",
          border: "1px solid " + (msg.sender === "personA" ? "rgba(20,184,166,0.2)" : "rgba(99,102,241,0.2)"),
          borderRadius: msg.sender === "personA" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          padding: "14px 18px"
        } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", fontWeight: 700, color: msg.sender === "personA" ? "#5eead4" : "#a5b4fc", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" } }, msg.sender === "personA" ? (t("roster.bridge_f2f_person_a") || "Person A") + " (" + _personALang + ")" : (t("roster.bridge_f2f_person_b") || "Person B") + " (" + _personBLang + ")"), /* @__PURE__ */ React.createElement("div", { dir: "auto", style: { fontSize: "16px", color: "#e2e8f0", lineHeight: 1.6, fontWeight: 500 } }, msg.text), msg.translated && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.06)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", fontWeight: 700, color: msg.sender === "personA" ? "#a5b4fc" : "#5eead4", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.08em" } }, "\u{1F30D} ", msg.sender === "personA" ? _personBLang : _personALang), /* @__PURE__ */ React.createElement("div", { dir: "auto", style: { fontSize: "16px", color: msg.sender === "personA" ? "#c7d2fe" : "#99f6e4", lineHeight: 1.6, fontWeight: 500 } }, msg.translated)), msg.translating && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px", fontSize: "12px", color: typeof _bt !== "undefined" ? _bt.textMuted : "#94a3b8", fontStyle: "italic" } }, "\u23F3 ", t("roster.bridge_f2f_translating") || "Translating..."), msg.translated && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px", display: "flex", gap: "6px" } }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: () => handleAudio(msg.text, msg.sender === "personA" ? _personALang : _personBLang),
            style: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }
          },
          "\u{1F50A} ",
          msg.sender === "personA" ? _personALang.slice(0, 3) : _personBLang.slice(0, 3)
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: () => handleAudio(msg.translated, msg.sender === "personA" ? _personBLang : _personALang),
            style: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }
          },
          "\u{1F50A} ",
          msg.sender === "personA" ? _personBLang.slice(0, 3) : _personALang.slice(0, 3)
        )))))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "6px" } }, /* @__PURE__ */ React.createElement(
          "input",
          {
            id: "bridge-f2f-a-input",
            type: "text",
            "aria-label": t("roster.bridge_f2f_person_a_input") || "Person A message input",
            placeholder: t("roster.bridge_f2f_type_or_speak") || "Type or speak...",
            disabled: bridgeF2FTranslating,
            onKeyDown: (e) => {
              if (e.key !== "Enter" || !e.target.value.trim() || bridgeF2FTranslating) return;
              const text = e.target.value.trim();
              e.target.value = "";
              _sendMessage("personA", text, _personALang, _personBLang);
            },
            style: { flex: 1, background: "rgba(20,184,166,0.06)", border: "1px solid rgba(20,184,166,0.15)", borderRadius: "12px", padding: "12px 14px", color: "#e2e8f0", fontSize: "14px", fontFamily: "inherit", opacity: bridgeF2FTranslating ? 0.5 : 1 },
            onFocus: (e) => e.target.style.borderColor = "rgba(20,184,166,0.4)",
            onBlur: (e) => e.target.style.borderColor = "rgba(20,184,166,0.15)"
          }
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            disabled: bridgeF2FTranslating,
            "aria-pressed": bridgeF2FListening === "personA",
            "aria-label": bridgeF2FListening === "personA" ? "Stop listening for Person A" : "Start listening for Person A",
            onClick: () => _startListening("personA", _getLangCode(_personALang), "bridge-f2f-a-input"),
            style: { background: bridgeF2FListening === "personA" ? "rgba(239,68,68,0.3)" : "rgba(20,184,166,0.15)", border: "1px solid " + (bridgeF2FListening === "personA" ? "rgba(239,68,68,0.4)" : "rgba(20,184,166,0.25)"), borderRadius: "12px", padding: "12px 14px", cursor: "pointer", fontSize: "18px", animation: !bridgeReducedMotion && bridgeF2FListening === "personA" ? "pulse 1.5s infinite" : "none" }
          },
          bridgeF2FListening === "personA" ? "\u{1F534}" : "\u{1F3A4}"
        ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "6px" } }, /* @__PURE__ */ React.createElement(
          "input",
          {
            id: "bridge-f2f-b-input",
            type: "text",
            "aria-label": t("roster.bridge_f2f_person_b_input") || "Person B message input",
            placeholder: (t("roster.bridge_f2f_type_in") || "Type in {lang}...").replace("{lang}", _personBLang),
            disabled: bridgeF2FTranslating,
            onKeyDown: (e) => {
              if (e.key !== "Enter" || !e.target.value.trim() || bridgeF2FTranslating) return;
              const text = e.target.value.trim();
              e.target.value = "";
              _sendMessage("personB", text, _personBLang, _personALang);
            },
            style: { flex: 1, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "12px", padding: "12px 14px", color: "#e2e8f0", fontSize: "14px", fontFamily: "inherit", opacity: bridgeF2FTranslating ? 0.5 : 1 },
            onFocus: (e) => e.target.style.borderColor = "rgba(99,102,241,0.4)",
            onBlur: (e) => e.target.style.borderColor = "rgba(99,102,241,0.15)"
          }
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            disabled: bridgeF2FTranslating,
            "aria-pressed": bridgeF2FListening === "personB",
            "aria-label": bridgeF2FListening === "personB" ? "Stop listening for Person B" : "Start listening for Person B",
            onClick: () => _startListening("personB", _getLangCode(_personBLang), "bridge-f2f-b-input"),
            style: { background: bridgeF2FListening === "personB" ? "rgba(239,68,68,0.3)" : "rgba(99,102,241,0.15)", border: "1px solid " + (bridgeF2FListening === "personB" ? "rgba(239,68,68,0.4)" : "rgba(99,102,241,0.25)"), borderRadius: "12px", padding: "12px 14px", cursor: "pointer", fontSize: "18px", animation: !bridgeReducedMotion && bridgeF2FListening === "personB" ? "pulse 1.5s infinite" : "none" }
          },
          bridgeF2FListening === "personB" ? "\u{1F534}" : "\u{1F3A4}"
        )))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", padding: "0 4px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: typeof _bt !== "undefined" ? _bt.textMuted : "#94a3b8" } }, "\u{1F512} ", t("roster.bridge_f2f_local_only") || "Not saved", " \u2022 ", bridgeChatMessages.length, " ", t("roster.bridge_f2f_messages") || "messages", " \u2022 ", bridgeF2FTranslating ? "\u23F3 " + (t("roster.bridge_f2f_translating") || "Translating...") : "\u2705 Ready"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: typeof _bt !== "undefined" ? _bt.textMuted : "#94a3b8" } }, "\u{1F50A} ", t("roster.bridge_f2f_tts_auto") || "TTS auto-plays", " \u2022 \u{1F3A4} ", t("roster.bridge_f2f_mic_speak") || "Hold mic to speak", " \u2022 ", t("roster.bridge_f2f_enter_send") || "Enter to send")));
      })())
    )
  );
}
function BridgeMessageModal(props) {
  const {
    activeSessionAppId,
    activeSessionCode,
    addToast,
    bridgeActiveLanguage,
    bridgeKaraokeIndex,
    bridgeMessage,
    bridgeProjectionMode,
    bridgeTermsSaved,
    bridgeTtsPlaying,
    callTTS,
    db,
    doc,
    handleAudio,
    handleQuickAddGlossary,
    isTeacherMode,
    selectedVoice,
    sessionData,
    setBridgeActiveLanguage,
    setBridgeKaraokeIndex,
    setBridgeMessage,
    setBridgeProjectionMode,
    setBridgeTermsSaved,
    setBridgeTtsPlaying,
    t,
    theme,
    ttsSpeed,
    updateDoc,
    user,
    warnLog
  } = props;
  const bridgeMessageDialogRef = _useBridgeDialogFocus(!!bridgeMessage);
  if (!bridgeMessage) return null;
  const _dDark = theme === "dark";
  const _dContrast = theme === "contrast";
  const _dt = {
    overlay: _dContrast ? "rgba(0,0,0,0.95)" : _dDark ? "rgba(2,6,23,0.75)" : "rgba(0,0,0,0.4)",
    panelBg: _dContrast ? "#000000" : _dDark ? "linear-gradient(145deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.95) 50%, rgba(15,23,42,0.97) 100%)" : "linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.97) 100%)",
    panelBorder: _dContrast ? "3px solid #FFFF00" : _dDark ? "1px solid rgba(99,102,241,0.2)" : "1px solid rgba(0,0,0,0.1)",
    panelShadow: _dContrast ? "none" : _dDark ? "0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(99,102,241,0.08)" : "0 25px 60px rgba(0,0,0,0.15)",
    textPrimary: _dContrast ? "#FFFF00" : _dDark ? "#e2e8f0" : "#1e293b",
    textSecondary: _dContrast ? "#FFFFFF" : _dDark ? "#94a3b8" : "#64748b",
    textMuted: _dContrast ? "#FFFF00" : _dDark ? "#64748b" : "#94a3b8",
    textAccent: _dContrast ? "#FFFF00" : _dDark ? "#a5b4fc" : "#4f46e5",
    textEnglish: _dContrast ? "#FFFF00" : _dDark ? "#e2e8f0" : "#1e293b",
    textTranslated: _dContrast ? "#FFFF00" : _dDark ? "#f8fafc" : "#0f172a",
    headerBg: _dContrast ? "#000000" : _dDark ? "rgba(99,102,241,0.05)" : "rgba(99,102,241,0.04)",
    headerBorder: _dContrast ? "3px solid #FFFF00" : _dDark ? "1px solid rgba(99,102,241,0.15)" : "1px solid rgba(99,102,241,0.15)",
    sectionBg: _dContrast ? "#000000" : _dDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
    sectionBorder: _dContrast ? "2px solid #FFFF00" : _dDark ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(0,0,0,0.06)",
    btnBg: _dContrast ? "#000000" : _dDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
    btnBorder: _dContrast ? "2px solid #FFFF00" : _dDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
    btnColor: _dContrast ? "#FFFF00" : _dDark ? "#94a3b8" : "#64748b",
    progressBg: _dContrast ? "#333300" : _dDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    termBg: _dContrast ? "#000000" : _dDark ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.1)",
    termBorder: _dContrast ? "2px solid #FFFF00" : _dDark ? "1px solid rgba(16,185,129,0.15)" : "1px solid rgba(16,185,129,0.2)",
    termColor: _dContrast ? "#FFFF00" : _dDark ? "#6ee7b7" : "#047857"
  };
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: bridgeMessageDialogRef,
      tabIndex: -1,
      role: "dialog",
      "aria-modal": "true",
      "aria-label": t("common.bridge_message_display"),
      style: { position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", background: bridgeProjectionMode ? "rgba(0,0,0,0.95)" : _dt.overlay, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", transition: "background 0.3s" },
      onClick: (e) => {
        if (e.target === e.currentTarget) setBridgeMessage(null);
      },
      onKeyDown: (e) => {
        if (e.key === "Escape") setBridgeMessage(null);
      }
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        "data-help-key": "bridge_message_modal_panel",
        onClick: (e) => e.stopPropagation(),
        style: {
          background: _dt.panelBg,
          borderRadius: bridgeProjectionMode ? "0" : "24px",
          padding: "0",
          maxWidth: bridgeProjectionMode ? "100vw" : "720px",
          width: bridgeProjectionMode ? "100vw" : "94vw",
          maxHeight: bridgeProjectionMode ? "100vh" : "90vh",
          overflowY: "auto",
          color: _dt.textPrimary,
          boxShadow: bridgeProjectionMode ? "none" : _dt.panelShadow,
          border: bridgeProjectionMode ? "none" : _dt.panelBorder,
          pointerEvents: "all",
          position: "relative",
          zIndex: 1e5
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 28px 20px", borderBottom: "1px solid rgba(99,102,241,0.15)" } }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: bridgeProjectionMode ? "28px" : "20px", fontWeight: 800, margin: 0, color: "#a5b4fc", display: "flex", alignItems: "center", gap: "10px", letterSpacing: "-0.02em" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: bridgeProjectionMode ? "32px" : "24px" } }, "\u{1F4E9}"), " ", t("roster.bridge_title") || "Message from your teacher"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px" } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "data-help-key": "bridge_message_projection_toggle",
          onClick: () => setBridgeProjectionMode((p) => !p),
          "aria-label": bridgeProjectionMode ? "Exit projection mode" : "Enter projection mode",
          title: bridgeProjectionMode ? "Exit Projection" : "Projection Mode",
          style: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", width: "36px", height: "36px", borderRadius: "12px", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }
        },
        bridgeProjectionMode ? "\u{1F5A5}\uFE0F" : "\u{1F4FD}\uFE0F"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            setBridgeMessage(null);
            setBridgeKaraokeIndex(-1);
            setBridgeTtsPlaying(false);
            setBridgeTermsSaved([]);
          },
          "aria-label": t("common.close_bridge_message"),
          style: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", width: "36px", height: "36px", borderRadius: "12px", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }
        },
        "\u2715"
      ))),
      /* @__PURE__ */ React.createElement("div", { style: { padding: "24px 28px" } }, bridgeMessage.imageUrl && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "20px", borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" } }, /* @__PURE__ */ React.createElement("img", { src: bridgeMessage.imageUrl, alt: t("bridge.visual_aid_alt") || "Visual aid", style: { width: "100%", display: "block", maxHeight: "300px", objectFit: "contain", background: "rgba(0,0,0,0.3)" } })), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" } }, "\u{1F1FA}\u{1F1F8} ", t("roster.bridge_english") || "English"), /* @__PURE__ */ React.createElement("div", { dir: "auto", style: { fontSize: bridgeProjectionMode ? "24px" : "16px", lineHeight: 1.8, letterSpacing: "0.01em" } }, bridgeMessage.english.split(/\s+/).map((word, idx) => {
        const isBold = /^\*\*(.*?)\*\*$/.test(word.trim());
        const cleanWord = word.replace(/\*\*/g, "");
        return /* @__PURE__ */ React.createElement("span", { key: idx, style: {
          padding: "2px 4px",
          borderRadius: "4px",
          transition: "all 0.15s",
          fontWeight: isBold ? "900" : "normal",
          letterSpacing: isBold ? "0.03em" : "normal",
          background: bridgeActiveLanguage === "en" && idx === bridgeKaraokeIndex ? "rgba(99,102,241,0.3)" : "transparent",
          color: bridgeActiveLanguage === "en" && idx === bridgeKaraokeIndex ? "#e0e7ff" : _dt.textEnglish
        } }, cleanWord, " ");
      })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "data-help-key": "bridge_message_play_english_btn",
          disabled: bridgeTtsPlaying,
          onClick: async () => {
            const text = bridgeMessage.english;
            const words = text.split(/\s+/);
            setBridgeTtsPlaying(true);
            setBridgeActiveLanguage("en");
            const msPerWord = Math.max(200, 350 / (typeof ttsSpeed !== "undefined" ? ttsSpeed : 1));
            let cancelled = false;
            const karaokeLoop = (async () => {
              for (let wi = 0; wi < words.length && !cancelled; wi++) {
                setBridgeKaraokeIndex(wi);
                await new Promise((r) => setTimeout(r, msPerWord));
              }
              setBridgeKaraokeIndex(-1);
            })();
            try {
              const cleanText = text.replace(/\*\*/g, "");
              const ttsUrl = await callTTS(cleanText, selectedVoice);
              if (ttsUrl) {
                const audio = new Audio(ttsUrl);
                audio.playbackRate = typeof ttsSpeed !== "undefined" ? ttsSpeed : 1;
                await new Promise((resolve) => {
                  audio.onended = resolve;
                  audio.onerror = () => {
                    warnLog("Bridge audio playback error");
                    resolve();
                  };
                  setTimeout(resolve, 15e3);
                  audio.play().catch((e) => {
                    warnLog("Bridge audio play() failed", e);
                    resolve();
                  });
                });
              } else {
                warnLog("Bridge EN: Gemini TTS returned null \u2014 skipping audio (no browser TTS)");
              }
            } catch (e) {
              warnLog("Bridge EN TTS error \u2014 skipping audio (no browser TTS):", e?.message);
            }
            cancelled = true;
            setBridgeKaraokeIndex(-1);
            setBridgeTtsPlaying(false);
          },
          style: { background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", padding: "8px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s", opacity: bridgeTtsPlaying ? 0.5 : 1 }
        },
        "\u{1F50A} ",
        t("roster.bridge_play_en") || "Play English"
      ), bridgeTtsPlaying && bridgeActiveLanguage === "en" && /* @__PURE__ */ React.createElement("div", { style: { flex: 1, height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", background: "linear-gradient(90deg,#6366f1,#818cf8)", borderRadius: "2px", transition: "width 0.15s", width: bridgeKaraokeIndex >= 0 ? `${bridgeKaraokeIndex / Math.max(1, bridgeMessage.english.split(/\s+/).length) * 100}%` : "0%" } })))), bridgeMessage.translated && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "20px", background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.18)", borderRadius: "16px", padding: "20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", fontWeight: 700, color: "#5eead4", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" } }, "\u{1F310} ", bridgeMessage.languageName || bridgeMessage.language), /* @__PURE__ */ React.createElement("div", { dir: "auto", style: { fontSize: bridgeProjectionMode ? "24px" : "16px", lineHeight: 1.8, letterSpacing: "0.01em" } }, bridgeMessage.translated.split(/\s+/).map((word, idx) => {
        const isBold = /^\*\*(.*?)\*\*$/.test(word.trim());
        const cleanWord = word.replace(/\*\*/g, "");
        return /* @__PURE__ */ React.createElement("span", { key: idx, style: {
          padding: "2px 4px",
          borderRadius: "4px",
          transition: "all 0.15s",
          fontWeight: isBold ? "900" : "normal",
          letterSpacing: isBold ? "0.03em" : "normal",
          background: bridgeActiveLanguage === "translated" && idx === bridgeKaraokeIndex ? "rgba(20,184,166,0.3)" : "transparent",
          color: bridgeActiveLanguage === "translated" && idx === bridgeKaraokeIndex ? "#f0fdfa" : _dt.textTranslated
        } }, cleanWord, " ");
      })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          disabled: bridgeTtsPlaying,
          onClick: async () => {
            const text = bridgeMessage.translated;
            const words = text.split(/\s+/);
            setBridgeTtsPlaying(true);
            setBridgeActiveLanguage("translated");
            const msPerWord = Math.max(200, 350 / (typeof ttsSpeed !== "undefined" ? ttsSpeed : 1));
            let cancelled = false;
            const karaokeLoop = (async () => {
              for (let wi = 0; wi < words.length && !cancelled; wi++) {
                setBridgeKaraokeIndex(wi);
                await new Promise((r) => setTimeout(r, msPerWord));
              }
              setBridgeKaraokeIndex(-1);
            })();
            try {
              const cleanText = text.replace(/\*\*/g, "");
              const ttsUrl = await callTTS(cleanText, selectedVoice);
              if (ttsUrl) {
                const audio = new Audio(ttsUrl);
                audio.playbackRate = typeof ttsSpeed !== "undefined" ? ttsSpeed : 1;
                await new Promise((resolve) => {
                  audio.onended = resolve;
                  audio.onerror = () => {
                    warnLog("Bridge audio playback error");
                    resolve();
                  };
                  setTimeout(resolve, 15e3);
                  audio.play().catch((e) => {
                    warnLog("Bridge audio play() failed", e);
                    resolve();
                  });
                });
              } else {
                warnLog("Bridge Translated: Gemini TTS returned null \u2014 skipping audio (no browser TTS)");
              }
            } catch (e) {
              warnLog("Bridge Translated TTS error \u2014 skipping audio (no browser TTS):", e?.message);
            }
            cancelled = true;
            setBridgeKaraokeIndex(-1);
            setBridgeTtsPlaying(false);
          },
          style: { background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.3)", color: "#5eead4", padding: "8px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s", opacity: bridgeTtsPlaying ? 0.5 : 1 }
        },
        "\u{1F50A} ",
        t("roster.bridge_play_translated") || "Play Translation"
      ), bridgeTtsPlaying && bridgeActiveLanguage === "translated" && /* @__PURE__ */ React.createElement("div", { style: { flex: 1, height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", background: "linear-gradient(90deg,#0d9488,#14b8a6)", borderRadius: "2px", transition: "width 0.15s", width: bridgeKaraokeIndex >= 0 ? `${bridgeKaraokeIndex / Math.max(1, bridgeMessage.translated.split(/\s+/).length) * 100}%` : "0%" } })))), bridgeMessage.terms && bridgeMessage.terms.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" } }, "\u{1F4D6} Key Vocabulary"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: bridgeMessage.terms.some((t2) => t2 && typeof t2 === "object" && t2.definition) ? "repeat(auto-fill, minmax(200px, 1fr))" : "none", gap: bridgeMessage.terms.some((t2) => t2 && typeof t2 === "object" && t2.definition) ? "12px" : "8px", flexWrap: "wrap", flexDirection: "row" } }, bridgeMessage.terms.map((termRaw, ti) => {
        const isObj = termRaw && typeof termRaw === "object";
        const word = isObj ? termRaw.word : termRaw;
        const def = isObj ? termRaw.definition : null;
        const termImg = isObj ? termRaw.imageUrl : null;
        const isSaved = bridgeTermsSaved.includes(word);
        if (def || termImg) {
          return /* @__PURE__ */ React.createElement("div", { key: ti, style: {
            background: isSaved ? "rgba(34,197,94,0.08)" : "rgba(99,102,241,0.06)",
            border: "1px solid " + (isSaved ? "rgba(34,197,94,0.2)" : "rgba(99,102,241,0.15)"),
            borderRadius: "14px",
            padding: "14px",
            transition: "all 0.2s"
          } }, termImg && /* @__PURE__ */ React.createElement("img", { src: termImg, alt: word, style: { width: "100%", height: "100px", objectFit: "contain", borderRadius: "10px", marginBottom: "10px", background: "rgba(0,0,0,0.15)" } }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "14px", fontWeight: 700, color: isSaved ? "#86efac" : "#a5b4fc", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" } }, word, isSaved && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px" } }, "\u2713")), def && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", color: _dt.textSecondary, lineHeight: 1.5, marginBottom: "8px" } }, def), !isSaved && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: async (e) => {
            e.stopPropagation();
            try {
              await handleQuickAddGlossary(word, true);
              setBridgeTermsSaved((prev) => [...prev, word]);
              addToast(`Saved "${word}" to glossary`, "success");
            } catch (err) {
              warnLog("Bridge term save failed:", err);
            }
          }, style: { background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", color: "#a5b4fc", padding: "4px 12px", borderRadius: "8px", fontSize: "11px", cursor: "pointer", fontWeight: 700, width: "100%", transition: "all 0.2s" } }, "+ Save to Glossary"));
        }
        return /* @__PURE__ */ React.createElement("span", { key: ti, style: {
          background: isSaved ? "rgba(34,197,94,0.15)" : "rgba(99,102,241,0.12)",
          color: isSaved ? "#86efac" : "#a5b4fc",
          border: "1px solid " + (isSaved ? "rgba(34,197,94,0.25)" : "rgba(99,102,241,0.2)"),
          padding: "6px 12px",
          borderRadius: "10px",
          fontSize: "13px",
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          transition: "all 0.2s"
        } }, word, !isSaved ? /* @__PURE__ */ React.createElement("button", { type: "button", onClick: async (e) => {
          e.stopPropagation();
          try {
            await handleQuickAddGlossary(word, true);
            setBridgeTermsSaved((prev) => [...prev, word]);
            addToast(`Saved "${word}" to glossary`, "success");
          } catch (err) {
            warnLog("Bridge term save failed:", err);
          }
        }, style: { background: "none", border: "1px solid rgba(165,180,252,0.3)", color: "#a5b4fc", padding: "2px 8px", borderRadius: "8px", fontSize: "11px", cursor: "pointer", fontWeight: 700 } }, "+ Save") : /* @__PURE__ */ React.createElement("span", { style: { fontSize: "12px", opacity: 0.8 } }, "\u2713"));
      }))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "10px", flexWrap: "wrap" } }, bridgeMessage.terms && bridgeMessage.terms.length > 0 && /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "data-help-key": "bridge_message_save_terms_btn",
          disabled: !bridgeMessage.terms || bridgeMessage.terms.every((t2) => bridgeTermsSaved.includes(typeof t2 === "object" ? t2.word : t2)),
          onClick: async () => {
            const unsaved = bridgeMessage.terms.filter((t2) => !bridgeTermsSaved.includes(typeof t2 === "object" ? t2.word : t2));
            if (unsaved.length === 0) return;
            addToast(`Saving ${unsaved.length} terms...`, "info");
            for (const term of unsaved) {
              const word = typeof term === "object" ? term.word : term;
              try {
                await handleQuickAddGlossary(word, true);
                setBridgeTermsSaved((prev) => [...prev, word]);
              } catch (err) {
                warnLog("Bridge term save failed:", word, err);
              }
            }
            addToast("All terms saved to glossary!", "success");
          },
          style: { background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc", padding: "10px 18px", borderRadius: "12px", fontSize: "13px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s", flex: 1 }
        },
        bridgeMessage.terms.every((t2) => bridgeTermsSaved.includes(t2)) ? "\u2705 All Saved" : "\u{1F4D6} Save All Terms"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "data-help-key": "bridge_message_read_again_btn",
          onClick: async () => {
            setBridgeTtsPlaying(true);
            setBridgeActiveLanguage("en");
            const words = bridgeMessage.english.split(/\s+/);
            const msPerWord = Math.max(200, 350 / (typeof ttsSpeed !== "undefined" ? ttsSpeed : 1));
            for (let wi = 0; wi < words.length; wi++) {
              setBridgeKaraokeIndex(wi);
              await new Promise((r) => setTimeout(r, msPerWord));
            }
            setBridgeKaraokeIndex(-1);
            try {
              await handleAudio(bridgeMessage.english);
            } catch (e) {
            }
            if (bridgeMessage.translated) {
              setBridgeActiveLanguage("translated");
              const tWords = bridgeMessage.translated.split(/\s+/);
              for (let wi = 0; wi < tWords.length; wi++) {
                setBridgeKaraokeIndex(wi);
                await new Promise((r) => setTimeout(r, msPerWord));
              }
              setBridgeKaraokeIndex(-1);
              try {
                await handleAudio(bridgeMessage.translated);
              } catch (e) {
              }
            }
            setBridgeTtsPlaying(false);
          },
          style: { background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.25)", color: "#5eead4", padding: "10px 18px", borderRadius: "12px", fontSize: "13px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s", flex: 1 }
        },
        "\u{1F504} Read Again"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "data-help-key": "bridge_message_copy_btn",
          onClick: () => {
            const text = [
              "\u{1F1FA}\u{1F1F8} English:",
              bridgeMessage.english,
              "",
              "\u{1F310} " + (bridgeMessage.languageName || bridgeMessage.language) + ":",
              bridgeMessage.translated,
              "",
              bridgeMessage.terms?.length ? "\u{1F4D6} Key Terms: " + bridgeMessage.terms.map((t2) => typeof t2 === "object" ? t2.word + (t2.definition ? " - " + t2.definition : "") : t2).join(", ") : ""
            ].filter(Boolean).join("\n");
            (window.alloCopyText ? window.alloCopyText(text) : navigator.clipboard.writeText(text).then(() => true)).then((ok) => addToast(ok !== false ? "Copied to clipboard!" : "Copy failed \u2014 select the text manually", ok !== false ? "success" : "error")).catch(() => addToast("Copy failed \u2014 select the text manually", "error"));
          },
          style: { background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc", padding: "10px 18px", borderRadius: "12px", fontSize: "13px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s", flex: 1 }
        },
        "\u{1F4CB} Copy"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "data-help-key": "bridge_message_print_btn",
          onClick: () => {
            const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
            const safeImg = (u) => typeof u === "string" && /^(data:image\/|blob:|https:)/i.test(u) ? u : "";
            const _img = safeImg(bridgeMessage.imageUrl);
            const printContent = `
                      <html><head><title>${esc(t("bridge.bridge_message") || "Bridge Message")}</title>
                      <style>
                        body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; }
                        .lang-label { font-size: 14px; font-weight: bold; color: #666; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; }
                        .text-block { font-size: 18px; line-height: 1.8; margin-bottom: 24px; padding: 16px; border-left: 4px solid #14b8a6; background: #f8fffe; border-radius: 0 8px 8px 0; }
                        .terms { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
                        .term { background: #e8f5e9; padding: 4px 12px; border-radius: 16px; font-size: 14px; font-weight: 600; }
                        .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #14b8a6; padding-bottom: 16px; }
                        .header h1 { color: #14b8a6; font-size: 24px; margin: 0; }
                        .header p { color: #999; font-size: 12px; margin: 4px 0 0; }
                        ${_img ? "img { max-width: 100%; border-radius: 8px; margin-bottom: 24px; }" : ""}
                      </style></head><body>
                      <div class="header"><h1>\u{1F310} Bridge Message</h1><p>${esc(new Date(bridgeMessage.timestamp).toLocaleString())}</p></div>
                      ${_img ? '<img alt="" src="' + esc(_img) + '" />' : ""}
                      <div class="lang-label">\u{1F1FA}\u{1F1F8} English</div>
                      <div class="text-block">${esc(bridgeMessage.english)}</div>
                      ${bridgeMessage.translated ? '<div class="lang-label">' + esc(bridgeMessage.languageName || bridgeMessage.language) + '</div><div class="text-block">' + esc(bridgeMessage.translated) + "</div>" : ""}
                      ${bridgeMessage.terms?.length ? '<div class="lang-label">\u{1F4D6} Key Terms</div><div class="terms">' + bridgeMessage.terms.map((t2) => {
              const w = typeof t2 === "object" ? t2.word : t2;
              const d = typeof t2 === "object" && t2.definition ? t2.definition : "";
              return '<span class="term">' + esc(w) + (d ? '<br/><small style="font-weight:400;color:#555">' + esc(d) + "</small>" : "") + "</span>";
            }).join("") + "</div>" : ""}
                      </body></html>`;
            const printWin = window.open("", "_blank", "width=800,height=600");
            if (printWin) {
              printWin.document.write(printContent);
              printWin.document.close();
              printWin.print();
            }
          },
          style: { background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.25)", color: "#c084fc", padding: "10px 18px", borderRadius: "12px", fontSize: "13px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s", flex: 1 }
        },
        "\u{1F5A8}\uFE0F Print"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            setBridgeMessage(null);
            setBridgeKaraokeIndex(-1);
            setBridgeTtsPlaying(false);
          },
          style: { background: _dt.btnBg, border: _dt.btnBorder, color: _dt.btnColor, padding: "10px 18px", borderRadius: "12px", fontSize: "13px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s", flex: 1 }
        },
        t("roster.bridge_close") || "Close"
      )), activeSessionCode && isTeacherMode && (() => {
        const _brx = sessionData?.bridgeReactions || {};
        const _brCounts = { "\u{1F44D}": 0, "\u{1F914}": 0, "\u2753": 0 };
        Object.values(_brx).forEach((r) => {
          if (_brCounts[r.emoji] !== void 0) _brCounts[r.emoji]++;
        });
        const _brTotal = Object.keys(_brx).length;
        const _rosterSize = Object.keys(sessionData?.roster || {}).length;
        return /* @__PURE__ */ React.createElement("div", { style: { marginTop: "20px", padding: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "14px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" } }, "\u{1F4CA} Student Reactions"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "10px", justifyContent: "center" } }, [{ emoji: "\u{1F44D}", label: "Got it!", text: "#86efac" }, { emoji: "\u{1F914}", label: "Confused", text: "#fcd34d" }, { emoji: "\u2753", label: "Question", text: "#a5b4fc" }].map((r, ri) => /* @__PURE__ */ React.createElement("div", { key: ri, style: { textAlign: "center", flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "32px", marginBottom: "4px" } }, r.emoji), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: r.text, fontWeight: 600 } }, r.label), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "28px", fontWeight: 900, color: r.text, marginTop: "4px" } }, _brCounts[r.emoji])))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#475569", textAlign: "center", marginTop: "8px" } }, _brTotal, " ", _rosterSize > 0 ? `of ${_rosterSize}` : "", " student", _brTotal !== 1 ? "s" : "", " responded"));
      })(), activeSessionCode && !isTeacherMode && (() => {
        const _myRxn = sessionData?.bridgeReactions?.[user?.uid]?.emoji;
        return /* @__PURE__ */ React.createElement("div", { style: { marginTop: "20px", padding: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "14px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" } }, t("bridge.reaction_prompt") || "How do you feel about this?"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "10px", justifyContent: "center" } }, [
          { emoji: "\u{1F44D}", label: "Got it!", color: "rgba(34,197,94,0.2)", border: "rgba(34,197,94,0.4)", text: "#86efac" },
          { emoji: "\u{1F914}", label: "Confused", color: "rgba(251,191,36,0.2)", border: "rgba(251,191,36,0.4)", text: "#fcd34d" },
          { emoji: "\u2753", label: "Question", color: "rgba(99,102,241,0.2)", border: "rgba(99,102,241,0.4)", text: "#a5b4fc" }
        ].map((r, ri) => {
          const _sel = _myRxn === r.emoji;
          return /* @__PURE__ */ React.createElement("button", { type: "button", key: ri, onClick: () => {
            if (user?.uid && activeSessionCode && activeSessionAppId) {
              updateDoc(
                doc(db, "artifacts", activeSessionAppId, "public", "data", "sessions", activeSessionCode),
                { [`bridgeReactions.${user.uid}`]: { emoji: r.emoji, timestamp: Date.now() } }
              ).catch(() => {
              });
            }
          }, style: {
            flex: 1,
            textAlign: "center",
            cursor: "pointer",
            padding: "10px 4px",
            borderRadius: "12px",
            background: _sel ? r.color : "transparent",
            border: `1px solid ${_sel ? r.border : "transparent"}`,
            transition: "all 0.2s"
          } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "32px", marginBottom: "4px", transform: _sel ? "scale(1.2)" : "scale(1)", transition: "transform 0.2s" }, "aria-hidden": "true" }, r.emoji), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: r.text, fontWeight: 600 } }, r.label));
        })), _myRxn && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#475569", textAlign: "center", marginTop: "8px" } }, t("bridge.response_sent_confirmation") || "Response sent \u2713"));
      })())
    )
  );
}
window.AlloModules = window.AlloModules || {};
window.AlloModules.BridgeSendModal = (typeof BridgeSendModal !== 'undefined') ? BridgeSendModal : null;
window.AlloModules.BridgeMessageModal = (typeof BridgeMessageModal !== 'undefined') ? BridgeMessageModal : null;
window.AlloModules.ViewGeminiBridgeModule = true;
window.AlloModules.GeminiBridge = true;  // satisfies loadModule('GeminiBridge', ...) registration check
console.log('[CDN] ViewGeminiBridgeModule loaded — 2 modals registered');
})();
