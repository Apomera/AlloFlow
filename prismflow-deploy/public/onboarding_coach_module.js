/**
 * AlloFlow OnboardingCoach Module (Tier 1)
 * Auto-generated. Source: onboarding_coach_source.jsx
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.OnboardingCoach) {
    console.log('[CDN] OnboardingCoach already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[OnboardingCoach] React not found on window'); return; }

function useCoachDialogFocus(isOpen, dialogRef, onClose, initialFocusRef, fallbackReturnRef) {
  var closeRef = React.useRef(onClose);
  closeRef.current = onClose;
  React.useEffect(function() {
    if (!isOpen) return void 0;
    var dialog = dialogRef.current;
    if (!dialog) return void 0;
    var previousFocus = document.activeElement;
    var getFocusable = function() {
      return Array.from(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    };
    var initial = initialFocusRef && initialFocusRef.current;
    (initial || getFocusable()[0] || dialog).focus();
    var onKeyDown = function(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      var focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", onKeyDown);
    return function() {
      dialog.removeEventListener("keydown", onKeyDown);
      var target = previousFocus && document.contains(previousFocus) ? previousFocus : fallbackReturnRef && fallbackReturnRef.current;
      if (target && typeof target.focus === "function") target.focus();
    };
  }, [isOpen, dialogRef, initialFocusRef, fallbackReturnRef]);
}
function OnboardingCoach(props) {
  var t = typeof props.t === "function" ? props.t : function(k) {
    return k;
  };
  var setRunTour = props.setRunTour;
  var pickMode = typeof props.pickMode === "function" ? props.pickMode : null;
  var _open = React.useState(false);
  var isOpen = _open[0];
  var setIsOpen = _open[1];
  var _tts = React.useState(false);
  var ttsEnabled = _tts[0];
  var setTtsEnabled = _tts[1];
  var _mute = React.useState(false);
  var globalMuted = _mute[0];
  var setGlobalMuted = _mute[1];
  React.useEffect(function() {
    if (!isOpen) return;
    var ao = window.AlloOnboarding;
    if (ao && typeof ao.isOnboardingTTSEnabled === "function") {
      try {
        setTtsEnabled(!!ao.isOnboardingTTSEnabled());
      } catch (_) {
      }
    }
    try {
      var muted = typeof window.__alloIsGlobalMuted === "function" ? !!window.__alloIsGlobalMuted() : window.localStorage && window.localStorage.getItem("alloflow-global-muted") === "true";
      setGlobalMuted(muted);
    } catch (_) {
    }
    if (ao && typeof ao.announce === "function") {
      var msg = t("onboarding.panel_open_announcement") || "AlloBot onboarding open. Four mode options are listed: Full AlloFlow, Guided Mode, Learning Tools, and Educator Tools. A Start the Tour button is at the bottom.";
      try {
        ao.announce(msg, { politeness: "polite" });
      } catch (_) {
      }
    }
  }, [isOpen]);
  var _isMobile = typeof window !== "undefined" && window.innerWidth < 600;
  var _chatExp = React.useState(!_isMobile);
  var chatExpanded = _chatExp[0];
  var setChatExpanded = _chatExp[1];
  var _inp = React.useState("");
  var inputText = _inp[0];
  var setInputText = _inp[1];
  var _inflight = React.useState(false);
  var inFlight = _inflight[0];
  var setInFlight = _inflight[1];
  var _phase = React.useState(0);
  var thinkingPhase = _phase[0];
  var setThinkingPhase = _phase[1];
  var _err = React.useState(null);
  var coachError = _err[0];
  var setCoachError = _err[1];
  var _convo = React.useState([]);
  var conversation = _convo[0];
  var setConversation = _convo[1];
  var _usage = React.useState({ remaining: 20, cap: 20, used: 0, isOnline: true });
  var usage = _usage[0];
  var setUsage = _usage[1];
  var _scrub = React.useState({ flags: [], riskLevel: "none", scrubbed: "" });
  var scrubPreview = _scrub[0];
  var setScrubPreview = _scrub[1];
  var _consent = React.useState(false);
  var showConsent = _consent[0];
  var setShowConsent = _consent[1];
  var _pending = React.useState(null);
  var pendingSend = _pending[0];
  var setPendingSend = _pending[1];
  var _chips = React.useState([]);
  var lastChips = _chips[0];
  var setLastChips = _chips[1];
  var abortRef = React.useRef(null);
  var thinkTimer1Ref = React.useRef(null);
  var thinkTimer2Ref = React.useRef(null);
  var scrubTimerRef = React.useRef(null);
  var chatPaneRef = React.useRef(null);
  var inputRef = React.useRef(null);
  var launcherRef = React.useRef(null);
  var panelRef = React.useRef(null);
  var consentRef = React.useRef(null);
  var consentDeclineRef = React.useRef(null);
  var refreshCoachState = function() {
    var ao = window.AlloOnboarding;
    if (!ao) return;
    try {
      if (typeof ao.getCoachBuffer === "function") setConversation(ao.getCoachBuffer());
      if (typeof ao.getCoachUsage === "function") setUsage(ao.getCoachUsage());
    } catch (_) {
    }
  };
  React.useEffect(function() {
    if (isOpen) refreshCoachState();
  }, [isOpen]);
  React.useEffect(function() {
    if (scrubTimerRef.current) clearTimeout(scrubTimerRef.current);
    if (!inputText) {
      setScrubPreview({ flags: [], riskLevel: "none", scrubbed: "" });
      return;
    }
    scrubTimerRef.current = setTimeout(function() {
      var ao = window.AlloOnboarding;
      if (!ao || typeof ao.previewScrub !== "function") return;
      try {
        setScrubPreview(ao.previewScrub(inputText));
      } catch (_) {
      }
    }, 300);
    return function() {
      if (scrubTimerRef.current) clearTimeout(scrubTimerRef.current);
    };
  }, [inputText]);
  React.useEffect(function() {
    if (!inFlight) {
      setThinkingPhase(0);
      if (thinkTimer1Ref.current) clearTimeout(thinkTimer1Ref.current);
      if (thinkTimer2Ref.current) clearTimeout(thinkTimer2Ref.current);
      return;
    }
    setThinkingPhase(0);
    thinkTimer1Ref.current = setTimeout(function() {
      setThinkingPhase(1);
    }, 2500);
    thinkTimer2Ref.current = setTimeout(function() {
      setThinkingPhase(2);
    }, 8e3);
    return function() {
      if (thinkTimer1Ref.current) clearTimeout(thinkTimer1Ref.current);
      if (thinkTimer2Ref.current) clearTimeout(thinkTimer2Ref.current);
    };
  }, [inFlight]);
  React.useEffect(function() {
    var el = chatPaneRef.current;
    if (!el) return;
    var nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [conversation.length, inFlight]);
  var coachAvailable = (function() {
    var ao = window.AlloOnboarding;
    return !!(ao && typeof ao.isCoachAvailable === "function" && ao.isCoachAvailable());
  })();
  var canSend = (function() {
    if (inFlight) return false;
    if (!inputText.trim()) return false;
    if (inputText.length > 500) return false;
    if (usage.remaining <= 0) return false;
    if (usage.cooldownMsRemaining && usage.cooldownMsRemaining > 0) return false;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
    return true;
  })();
  var doSend = function(questionText) {
    var ao = window.AlloOnboarding;
    if (!ao || typeof ao.askCoach !== "function") return;
    setCoachError(null);
    setInFlight(true);
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    abortRef.current = controller;
    var screenCtx = null;
    try {
      if (typeof ao.readVisibleScreen === "function") screenCtx = ao.readVisibleScreen();
    } catch (_) {
    }
    Promise.resolve(ao.askCoach({
      question: questionText,
      screen: screenCtx,
      signal: controller ? controller.signal : null
    })).then(function(res) {
      setInFlight(false);
      abortRef.current = null;
      refreshCoachState();
      if (res && res.blocked) {
        setCoachError({ reason: res.blockedReason, answer: res.answer, meta: res.meta });
        if (ao.announce && res.answer) {
          try {
            ao.announce(res.answer, { politeness: "polite" });
          } catch (_) {
          }
        }
        return;
      }
      setInputText("");
      setScrubPreview({ flags: [], riskLevel: "none", scrubbed: "" });
      setLastChips(Array.isArray(res && res.actions) ? res.actions : []);
      refreshCoachState();
      if (ao.announce && res && res.answer) {
        try {
          ao.announce(
            (t("onboarding.coach_reply_announce_prefix") || "AlloBot replied: ") + res.answer.slice(0, 160) + (res.actions && res.actions.length ? ". " + res.actions.length + " suggested action" + (res.actions.length === 1 ? "" : "s") + "." : ""),
            { politeness: "polite" }
          );
        } catch (_) {
        }
      }
    }).catch(function(e) {
      setInFlight(false);
      abortRef.current = null;
      setCoachError({ reason: "network", answer: "Something went wrong. Try again." });
    });
  };
  var handleSendClick = function() {
    if (!canSend) return;
    var q = inputText.trim();
    var ao = window.AlloOnboarding;
    if (ao && typeof ao.hasCoachConsent === "function" && !ao.hasCoachConsent()) {
      setPendingSend(q);
      setShowConsent(true);
      return;
    }
    doSend(q);
  };
  var handleConsentAccept = function() {
    var ao = window.AlloOnboarding;
    if (ao && typeof ao.recordCoachConsent === "function") {
      try {
        ao.recordCoachConsent();
      } catch (_) {
      }
    }
    setShowConsent(false);
    var q = pendingSend;
    setPendingSend(null);
    if (q) doSend(q);
  };
  var handleConsentDecline = function() {
    setShowConsent(false);
    setPendingSend(null);
  };
  useCoachDialogFocus(isOpen, panelRef, function() {
    setIsOpen(false);
  }, null, launcherRef);
  useCoachDialogFocus(showConsent, consentRef, handleConsentDecline, consentDeclineRef, panelRef);
  var handleCancel = function() {
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch (_) {
      }
    }
    setInFlight(false);
  };
  var handleResetConversation = function() {
    var ao = window.AlloOnboarding;
    if (ao && typeof ao.resetCoachConversation === "function") {
      try {
        ao.resetCoachConversation({ resetCounter: false });
      } catch (_) {
      }
    }
    setConversation([]);
    setCoachError(null);
    setLastChips([]);
    refreshCoachState();
  };
  var handleChipClick = function(chip) {
    if (!chip || !chip.kind) return;
    if (chip.kind === "pick_mode") {
      var k = chip.key;
      if (!k) return;
      setIsOpen(false);
      if (pickMode) {
        try {
          pickMode(k);
        } catch (_) {
        }
      }
      return;
    }
    if (chip.kind === "start_tour") {
      setIsOpen(false);
      if (typeof setRunTour === "function") setRunTour(true);
      return;
    }
    if (chip.kind === "open_help") {
      setChatExpanded(false);
      setCoachError(null);
      return;
    }
    if (chip.kind === "open_link") {
      setIsOpen(false);
      return;
    }
  };
  var chipLabel = function(chip) {
    if (chip.kind === "pick_mode") {
      var titleKey = "launch_pad." + chip.key + "_title";
      var label = t(titleKey);
      if (!label || label === titleKey) {
        var fallback = {
          full: "Full AlloFlow",
          guided: "Guided Mode",
          learning_tools: "Learning Tools",
          educator: "Educator Tools"
        };
        label = fallback[chip.key] || chip.key;
      }
      return label;
    }
    if (chip.kind === "start_tour")
      return t("onboarding.start_tour_cta") || "Start the tour";
    if (chip.kind === "open_help")
      return t("onboarding.show_offline_help") || "Show offline help";
    if (chip.kind === "open_link")
      return t("onboarding.open_settings") || "Open settings";
    return "";
  };
  var modes = [
    {
      key: "full",
      icon: "\u{1F680}",
      title: t("launch_pad.full_title") || "Full AlloFlow",
      desc: t("launch_pad.full_desc") || "All AlloFlow features unlocked. Full power-user surface.",
      bestIf: t("onboarding.full_best_if") || "Best if you want full control and you\u2019re comfortable exploring on your own."
    },
    {
      key: "guided",
      icon: "\u{1F9ED}",
      title: t("launch_pad.guided_title") || "Guided Mode",
      desc: t("launch_pad.guided_desc") || "A simpler, step-by-step interface that walks you through each task.",
      bestIf: t("onboarding.guided_best_if") || "Best if you\u2019re brand new and want a calmer interface that holds your hand at each step."
    },
    {
      key: "learning_tools",
      icon: "\u{1F9E0}",
      title: t("launch_pad.learning_tools_title") || "Learning Tools",
      desc: t("launch_pad.learning_tools_desc") || "STEM Lab, StoryForge, SEL Hub, Research Hub & more \u2014 explore, create, investigate, and grow.",
      bestIf: t("onboarding.learning_tools_best_if") || "Best if you\u2019re a student or independent learner who wants to jump into activities right away."
    },
    {
      key: "educator",
      icon: "\u{1F6E0}\uFE0F",
      title: t("launch_pad.educator_tools_title") || "Educator Tools",
      desc: t("launch_pad.educator_tools_desc") || "BehaviorLens, Report Writer, and professional clinical tools \u2014 password protected.",
      bestIf: t("onboarding.educator_best_if") || "Best if you\u2019re a teacher, clinician, or school psychologist on a password-protected workstation."
    }
  ];
  var toggleTTS = function() {
    var next = !ttsEnabled;
    var ao = window.AlloOnboarding;
    if (ao && typeof ao.setOnboardingTTSEnabled === "function") {
      try {
        ao.setOnboardingTTSEnabled(next);
      } catch (_) {
      }
    }
    setTtsEnabled(next);
    if (next && !globalMuted && ao && typeof ao.speak === "function") {
      try {
        ao.speak(t("onboarding.tts_test_cue") || "Voice on. I will read help out loud.");
      } catch (_) {
      }
    } else if (!next && ao && typeof ao.cancel === "function") {
      try {
        ao.cancel();
      } catch (_) {
      }
    }
  };
  var openTour = function() {
    setIsOpen(false);
    var ao = window.AlloOnboarding;
    if (ao && typeof ao.isOnboardingTTSEnabled === "function" && ao.isOnboardingTTSEnabled()) {
      try {
        ao.speak(t("onboarding.tour_starting_speech") || "Starting the tour.");
      } catch (_) {
      }
    }
    if (typeof setRunTour === "function") setRunTour(true);
  };
  return /* @__PURE__ */ React.createElement(React.Fragment, null, !isOpen && /* @__PURE__ */ React.createElement(
    "button",
    {
      ref: launcherRef,
      type: "button",
      onClick: function() {
        setIsOpen(true);
      },
      "aria-label": t("onboarding.ask_allobot_aria") || "Open AlloBot onboarding help",
      "data-help-key": "onboarding_ask_allobot_button",
      style: {
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9e3,
        padding: "12px 20px",
        borderRadius: "999px",
        background: "linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)",
        color: "#fff",
        border: "none",
        fontWeight: 700,
        fontSize: "14px",
        cursor: "pointer",
        boxShadow: "0 6px 16px rgba(124,58,237,0.45)",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "transform 0.15s, box-shadow 0.15s"
      },
      onMouseDown: function(e) {
        e.currentTarget.style.transform = "scale(0.97)";
      },
      onMouseUp: function(e) {
        e.currentTarget.style.transform = "scale(1)";
      },
      onMouseLeave: function(e) {
        e.currentTarget.style.transform = "scale(1)";
      }
    },
    /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F916}"),
    /* @__PURE__ */ React.createElement("span", null, t("onboarding.ask_allobot_label") || "Not sure? Ask AlloBot")
  ), isOpen && /* @__PURE__ */ React.createElement(
    "div",
    {
      role: "presentation",
      "aria-hidden": showConsent ? "true" : void 0,
      inert: showConsent ? "" : void 0,
      "data-help-key": "onboarding_panel",
      style: {
        position: "fixed",
        inset: 0,
        zIndex: 9100,
        background: "rgba(15,23,42,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      },
      onClick: function(e) {
        if (e.target === e.currentTarget) setIsOpen(false);
      }
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: panelRef,
        tabIndex: -1,
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "onboarding-panel-title",
        "aria-describedby": "onboarding-panel-description",
        onClick: function(e) {
          e.stopPropagation();
        },
        style: {
          background: "#fff",
          borderRadius: "20px",
          maxWidth: "720px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 60px rgba(0,0,0,0.35)"
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: {
        padding: "18px 22px",
        background: "linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: "20px 20px 0 0"
      } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "12px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "32px" }, "aria-hidden": "true" }, "\u{1F916}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { id: "onboarding-panel-title", style: { margin: 0, fontSize: "18px", fontWeight: 800 } }, t("onboarding.panel_title") || "Hi! I\u2019m AlloBot."), /* @__PURE__ */ React.createElement("p", { id: "onboarding-panel-description", style: { margin: "2px 0 0", fontSize: "12px", opacity: 0.9 } }, t("onboarding.panel_subtitle") || "Pick the option that best fits how you\u2019ll use AlloFlow today."))), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            setIsOpen(false);
          },
          "aria-label": t("common.close") || "Close",
          style: {
            background: "rgba(255,255,255,0.18)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "8px",
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 700
          }
        },
        "\u2715"
      )),
      /* @__PURE__ */ React.createElement("div", { style: { padding: "18px 22px", display: "flex", flexDirection: "column", gap: "12px" } }, /* @__PURE__ */ React.createElement(
        "div",
        {
          "data-help-key": "onboarding_tts_row",
          style: {
            padding: "12px 14px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("label", { htmlFor: "allobot-tts-toggle", style: {
          margin: 0,
          fontSize: "13px",
          fontWeight: 700,
          color: "#1e293b",
          display: "block",
          cursor: "pointer"
        } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F50A} "), t("onboarding.tts_toggle_label") || "Read help aloud"), /* @__PURE__ */ React.createElement("p", { style: { margin: "2px 0 0", fontSize: "11px", color: "#64748b", lineHeight: 1.4 } }, globalMuted ? t("onboarding.tts_unavailable_globally_muted") || "Sound is muted globally. Un-mute in the main toolbar to hear AlloBot." : t("onboarding.tts_toggle_sublabel") || "Off by default. If you use a screen reader, leave this off \u2014 your reader already reads this panel.")),
        /* @__PURE__ */ React.createElement(
          "button",
          {
            id: "allobot-tts-toggle",
            type: "button",
            role: "switch",
            "aria-checked": ttsEnabled,
            "aria-label": t("onboarding.tts_toggle_label") || "Read help aloud",
            onClick: toggleTTS,
            style: {
              flexShrink: 0,
              width: "48px",
              height: "26px",
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
              padding: 0,
              background: ttsEnabled ? "#22c55e" : "#cbd5e1",
              position: "relative",
              transition: "background 0.15s"
            }
          },
          /* @__PURE__ */ React.createElement(
            "span",
            {
              "aria-hidden": "true",
              style: {
                position: "absolute",
                top: "3px",
                left: ttsEnabled ? "25px" : "3px",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.15s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.25)"
              }
            }
          )
        )
      ), modes.map(function(m) {
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: m.key,
            "data-help-key": "onboarding_mode_" + m.key,
            style: {
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "14px",
              background: "#fafafa",
              display: "flex",
              alignItems: "flex-start",
              gap: "14px"
            }
          },
          /* @__PURE__ */ React.createElement("span", { style: { fontSize: "34px", flexShrink: 0, lineHeight: 1 }, "aria-hidden": "true" }, m.icon),
          /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: "15px", fontWeight: 800, color: "#1e293b" } }, m.title), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 6px", fontSize: "12px", color: "#475569", lineHeight: 1.5 } }, m.desc), /* @__PURE__ */ React.createElement("p", { style: {
            margin: 0,
            fontSize: "11px",
            color: "#7c3aed",
            fontWeight: 700,
            lineHeight: 1.4
          } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4A1} "), m.bestIf))
        );
      }), typeof setRunTour === "function" && /* @__PURE__ */ React.createElement(
        "div",
        {
          "data-help-key": "onboarding_tour_cta",
          style: {
            marginTop: "6px",
            padding: "14px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)",
            border: "1px solid #fbbf24",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: "200px" } }, /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "13px", fontWeight: 700, color: "#78350f" } }, t("onboarding.tour_offer_title") || "Want me to show you around first?"), /* @__PURE__ */ React.createElement("p", { style: { margin: "3px 0 0", fontSize: "11px", color: "#92400e" } }, t("onboarding.tour_offer_desc") || "I\u2019ll walk you through the workspace before you pick a mode.")),
        /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: openTour,
            style: {
              padding: "10px 18px",
              borderRadius: "999px",
              background: "#d97706",
              color: "#fff",
              border: "none",
              fontWeight: 800,
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(217,119,6,0.45)",
              whiteSpace: "nowrap"
            }
          },
          /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F3AF} "),
          t("onboarding.start_tour_cta") || "Start the tour"
        )
      ), /* @__PURE__ */ React.createElement(
        "div",
        {
          "data-help-key": "onboarding_coach_chat",
          style: {
            marginTop: "4px",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            background: "#fff",
            overflow: "hidden"
          }
        },
        /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: function() {
              setChatExpanded(!chatExpanded);
            },
            "aria-expanded": chatExpanded,
            "aria-controls": "onboarding-coach-qa-body",
            style: {
              width: "100%",
              padding: "12px 14px",
              textAlign: "left",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px"
            }
          },
          /* @__PURE__ */ React.createElement("span", { style: { display: "flex", alignItems: "center", gap: "10px" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { fontSize: "20px" } }, "\u{1F4AC}"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("onboarding.coach_ask_disclosure") || "Have a question? Ask AlloBot")),
          /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: {
            fontSize: "12px",
            color: "#7c3aed",
            fontWeight: 700,
            transform: chatExpanded ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.15s"
          } }, "\u25BE")
        ),
        chatExpanded && /* @__PURE__ */ React.createElement("div", { id: "onboarding-coach-qa-body", style: { padding: "0 14px 14px" } }, !coachAvailable && /* @__PURE__ */ React.createElement("div", { style: {
          marginBottom: "10px",
          padding: "10px 12px",
          borderRadius: "10px",
          background: "#fff7ed",
          border: "1px solid #fb923c",
          fontSize: "11px",
          color: "#9a3412",
          lineHeight: 1.5
        } }, /* @__PURE__ */ React.createElement("strong", null, t("onboarding.coach_no_backend_title") || "AlloBot Coach needs Google Gemini."), /* @__PURE__ */ React.createElement("br", null), t("onboarding.coach_no_backend_body") || "Switch your AI backend to Google Gemini in Settings, or use the static help cards above."), coachAvailable && conversation.length > 0 && /* @__PURE__ */ React.createElement(
          "div",
          {
            ref: chatPaneRef,
            "aria-live": "polite",
            "aria-label": t("onboarding.coach_conversation_aria") || "AlloBot conversation",
            style: {
              marginBottom: "10px",
              maxHeight: "260px",
              overflowY: "auto",
              padding: "4px 2px",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }
          },
          conversation.map(function(m, idx) {
            var isUser = m.role === "user";
            return /* @__PURE__ */ React.createElement("div", { key: idx, style: {
              display: "flex",
              justifyContent: isUser ? "flex-end" : "flex-start"
            } }, /* @__PURE__ */ React.createElement("div", { style: {
              maxWidth: "85%",
              padding: "8px 12px",
              borderRadius: "14px",
              fontSize: "12px",
              lineHeight: 1.5,
              background: isUser ? "#f1f5f9" : "#f5f3ff",
              color: isUser ? "#0f172a" : "#3b0764",
              border: isUser ? "1px solid #e2e8f0" : "1px solid #ddd6fe",
              borderTopRightRadius: isUser ? "4px" : "14px",
              borderTopLeftRadius: isUser ? "14px" : "4px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word"
            } }, m.text));
          })
        ), coachAvailable && inFlight && /* @__PURE__ */ React.createElement(
          "div",
          {
            "aria-live": "polite",
            "aria-busy": "true",
            "aria-atomic": "true",
            style: {
              marginBottom: "10px",
              display: "flex",
              justifyContent: "flex-start"
            }
          },
          /* @__PURE__ */ React.createElement("div", { style: {
            maxWidth: "85%",
            padding: "10px 14px",
            borderRadius: "14px",
            background: "#f5f3ff",
            border: "1px solid #ddd6fe",
            fontSize: "12px",
            color: "#3b0764",
            lineHeight: 1.5,
            borderTopLeftRadius: "4px"
          } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { display: "inline-block", marginRight: "6px" } }, "\u{1F916}"), /* @__PURE__ */ React.createElement("span", { style: { opacity: 0.85, fontWeight: 700 } }, t("onboarding.coach_thinking") || "AlloBot is thinking\u2026"), thinkingPhase >= 1 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", fontSize: "11px", color: "#7c3aed" } }, t("onboarding.coach_thinking_long") || "Still working \u2014 Gemini is taking a moment."), thinkingPhase >= 2 && /* @__PURE__ */ React.createElement(
            "button",
            {
              type: "button",
              onClick: handleCancel,
              style: {
                marginTop: "6px",
                padding: "4px 10px",
                borderRadius: "999px",
                background: "#fff",
                border: "1px solid #d4d4d8",
                color: "#3f3f46",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer"
              }
            },
            t("onboarding.coach_cancel") || "Cancel"
          ))
        ), coachAvailable && !inFlight && coachError && /* @__PURE__ */ React.createElement("div", { style: {
          marginBottom: "10px",
          padding: "10px 12px",
          borderRadius: "10px",
          background: "#fef2f2",
          border: "1px solid #fca5a5",
          fontSize: "11px",
          color: "#7f1d1d",
          lineHeight: 1.5
        } }, /* @__PURE__ */ React.createElement("strong", null, (function() {
          var r = coachError.reason;
          if (r === "consent_required") return t("onboarding.coach_consent_required") || "Consent required.";
          if (r === "no_compatible_backend") return t("onboarding.coach_no_backend") || "AlloBot Coach needs Google Gemini.";
          if (r === "network") return t("onboarding.coach_network_error") || "Network problem.";
          if (r === "rate_limit_session") return t("onboarding.coach_rate_limit") || "You've used today's coach quota.";
          if (r === "rate_limit_cooldown") return t("onboarding.coach_cooldown") || "One moment\u2026";
          if (r === "rate_limit_upstream") return t("onboarding.coach_upstream") || "AlloBot is taking a quick breather.";
          if (r === "pii_detected" || r === "pii_high_risk") return t("onboarding.coach_pii") || "Looks like student data.";
          if (r === "safety_blocked") return t("onboarding.coach_safety") || "Cannot answer that.";
          if (r === "injection") return t("onboarding.coach_injection") || "Can only help with onboarding.";
          if (r === "input_too_long") return t("onboarding.coach_too_long") || "Question too long.";
          if (r === "off_topic") return t("onboarding.coach_off_topic") || "Off topic.";
          return t("onboarding.coach_error") || "Something went wrong.";
        })()), coachError.answer ? /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px" } }, coachError.answer) : null, coachError.reason === "network" && /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: function() {
              if (inputText.trim()) doSend(inputText.trim());
            },
            style: {
              marginTop: "6px",
              padding: "4px 10px",
              borderRadius: "999px",
              background: "#fff",
              border: "1px solid #fca5a5",
              color: "#7f1d1d",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer"
            }
          },
          t("onboarding.coach_retry") || "Try again"
        )), coachAvailable && !inFlight && lastChips.length > 0 && /* @__PURE__ */ React.createElement("div", { style: {
          marginBottom: "10px",
          display: "flex",
          flexWrap: "wrap",
          gap: "8px"
        } }, lastChips.map(function(chip, ci) {
          var label = chipLabel(chip);
          if (!label) return null;
          var isEducator = chip.kind === "pick_mode" && chip.key === "educator";
          return /* @__PURE__ */ React.createElement(
            "button",
            {
              key: ci,
              type: "button",
              onClick: function() {
                handleChipClick(chip);
              },
              "aria-label": label + (isEducator ? " (password-protected)" : ""),
              style: {
                padding: "8px 14px",
                borderRadius: "999px",
                background: "#fff",
                border: "1px solid #c4b5fd",
                color: "#5b21b6",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                minHeight: "40px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }
            },
            /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, chip.kind === "pick_mode" ? "\u{1F9ED}" : chip.kind === "start_tour" ? "\u{1F3AF}" : chip.kind === "open_help" ? "\u{1F4DA}" : "\u{1F517}"),
            /* @__PURE__ */ React.createElement("span", null, label),
            isEducator && /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { fontSize: "10px", opacity: 0.7 } }, "\u{1F510}")
          );
        })), coachAvailable && scrubPreview.flags.length > 0 && /* @__PURE__ */ React.createElement(
          "div",
          {
            role: "alert",
            style: {
              marginBottom: "10px",
              padding: "10px 12px",
              borderRadius: "10px",
              background: scrubPreview.riskLevel === "high" ? "#fef2f2" : "#fefce8",
              border: "1px solid " + (scrubPreview.riskLevel === "high" ? "#fca5a5" : "#fde047"),
              fontSize: "11px",
              color: scrubPreview.riskLevel === "high" ? "#7f1d1d" : "#713f12",
              lineHeight: 1.5
            }
          },
          /* @__PURE__ */ React.createElement("strong", null, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u26A0\uFE0F "), scrubPreview.riskLevel === "high" ? t("onboarding.coach_pii_high_warn") || "Looks like student data." : t("onboarding.coach_pii_low_warn") || "Looks like a real name."),
          /* @__PURE__ */ React.createElement("div", { style: { marginTop: "3px" } }, scrubPreview.riskLevel === "high" ? t("onboarding.coach_pii_high_advice") || "AlloBot will scrub this before sending. To send anyway, rephrase without identifiers." : t("onboarding.coach_pii_low_advice") || "AlloBot can scrub the name before sending, or you can send as typed.")
        ), coachAvailable && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "flex-end" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement(
          "textarea",
          {
            ref: inputRef,
            "data-help-key": "onboarding_coach_input",
            value: inputText,
            onChange: function(e) {
              setInputText(e.target.value);
            },
            onKeyDown: function(e) {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendClick();
              }
            },
            maxLength: 500,
            rows: 2,
            disabled: inFlight,
            placeholder: t("onboarding.coach_input_placeholder") || "Ask AlloBot anything about getting started\u2026",
            "aria-label": t("onboarding.coach_input_aria") || "Ask AlloBot a question",
            style: {
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 10px",
              borderRadius: "10px",
              border: "1px solid " + (inputText.length > 480 ? "#f59e0b" : "#cbd5e1"),
              fontSize: "13px",
              fontFamily: "inherit",
              resize: "vertical",
              minHeight: "40px",
              maxHeight: "120px",
              background: inFlight ? "#f8fafc" : "#fff",
              color: "#0f172a"
            }
          }
        ), (inputText.length > 450 || usage.remaining <= 5) && /* @__PURE__ */ React.createElement("div", { style: {
          marginTop: "3px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "10px",
          color: "#94a3b8"
        } }, /* @__PURE__ */ React.createElement("span", null, usage.remaining <= 5 ? usage.remaining === 0 ? t("onboarding.coach_limit_reached") || "You've used today's coach quota. Reload to reset." : usage.remaining + " " + (t("onboarding.coach_questions_remaining") || "questions left this session") : ""), /* @__PURE__ */ React.createElement("span", { style: {
          color: inputText.length > 480 ? "#d97706" : "#94a3b8"
        } }, inputText.length, "/500"))), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: handleSendClick,
            disabled: !canSend,
            "aria-label": t("onboarding.coach_send") || "Send question to AlloBot",
            style: {
              padding: "10px 16px",
              borderRadius: "999px",
              background: canSend ? "#7c3aed" : "#cbd5e1",
              color: "#fff",
              border: "none",
              fontWeight: 800,
              fontSize: "13px",
              cursor: canSend ? "pointer" : "not-allowed",
              whiteSpace: "nowrap",
              flexShrink: 0,
              boxShadow: canSend ? "0 2px 6px rgba(124,58,237,0.4)" : "none"
            }
          },
          inFlight ? t("onboarding.coach_sending") || "\u2026" : t("onboarding.coach_send") || "Send"
        )), coachAvailable && conversation.length > 0 && /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: handleResetConversation,
            style: {
              marginTop: "8px",
              background: "transparent",
              border: "none",
              padding: "2px 0",
              minHeight: "24px",
              display: "inline-flex",
              alignItems: "center",
              color: "#94a3b8",
              fontSize: "11px",
              cursor: "pointer",
              textDecoration: "underline"
            }
          },
          t("onboarding.coach_reset_conversation") || "Start over"
        ))
      ), /* @__PURE__ */ React.createElement("p", { style: {
        margin: "10px 0 0",
        fontSize: "10px",
        color: "#94a3b8",
        textAlign: "center",
        fontStyle: "italic"
      } }, t("onboarding.panel_footer") || "You can change modes any time. Just close this and click whichever card looks right."))
    )
  ), showConsent && /* @__PURE__ */ React.createElement(
    "div",
    {
      role: "presentation",
      style: {
        position: "fixed",
        inset: 0,
        zIndex: 9200,
        background: "rgba(15,23,42,0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: consentRef,
        tabIndex: -1,
        role: "alertdialog",
        "aria-modal": "true",
        "aria-labelledby": "onboarding-consent-title",
        "aria-describedby": "onboarding-consent-description",
        style: {
          background: "#fff",
          borderRadius: "20px",
          maxWidth: "520px",
          width: "100%",
          padding: "24px",
          boxShadow: "0 30px 70px rgba(0,0,0,0.4)"
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { fontSize: "36px" } }, "\u{1F6E1}\uFE0F"), /* @__PURE__ */ React.createElement("h2", { id: "onboarding-consent-title", style: { margin: 0, fontSize: "17px", fontWeight: 800, color: "#0f172a" } }, t("onboarding.coach_consent_title") || "A heads-up about AlloBot")),
      /* @__PURE__ */ React.createElement("p", { id: "onboarding-consent-description", style: { margin: "0 0 14px", fontSize: "13px", color: "#334155", lineHeight: 1.55 } }, t("onboarding.coach_consent_body") || "AlloBot is powered by Google Gemini. When you ask a question, the text you type is sent over the internet to Google's servers and may be logged there. AlloFlow blocks student data from your screen automatically, but it cannot read your mind \u2014 please do not type student names, ID numbers, test scores, addresses, or birthdays into the chat. Ask about strategies and tools in general terms."),
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          ref: consentDeclineRef,
          type: "button",
          onClick: handleConsentDecline,
          style: {
            padding: "10px 16px",
            borderRadius: "999px",
            background: "#f1f5f9",
            color: "#475569",
            border: "none",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer"
          }
        },
        t("onboarding.coach_consent_decline") || "Not now"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: handleConsentAccept,
          style: {
            padding: "10px 18px",
            borderRadius: "999px",
            background: "#7c3aed",
            color: "#fff",
            border: "none",
            fontWeight: 800,
            fontSize: "13px",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(124,58,237,0.45)"
          }
        },
        t("onboarding.coach_consent_accept") || "I understand \u2014 start using AlloBot"
      ))
    )
  ));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.OnboardingCoach = { OnboardingCoach: OnboardingCoach };
  console.log('[CDN] OnboardingCoach loaded');
})();
