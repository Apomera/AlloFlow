/**
 * AlloFlow StudyTimerModal Module
 * Auto-generated. Source: view_study_timer_modal_source.jsx
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.StudyTimerModal) {
    console.log('[CDN] StudyTimerModal already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[StudyTimerModal] React not found on window'); return; }

function StudyTimerModal(props) {
  const noop = () => null;
  const Clock = window.Clock || noop;
  const Pause = window.Pause || noop;
  const Play = window.Play || noop;
  const RefreshCw = window.RefreshCw || noop;
  const X = window.X || noop;
  const {
    ConfettiExplosion,
    customTimerMinutes,
    formatTime,
    handleSetShowStudyTimerModalToFalse,
    isStudyTimerRunning,
    setCustomTimerMinutes,
    setIsStudyTimerRunning,
    setStudyDuration,
    setStudyTaskLabel,
    setStudyTimeLeft,
    showTimerConfetti,
    studyDuration,
    studyTaskLabel,
    studyTimeLeft,
    studyTimerRef,
    t
  } = props;
  const dialogRef = React.useRef(null);
  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return void 0;
    const previousFocus = document.activeElement;
    const backgroundState = [];
    const seenNodes = /* @__PURE__ */ new Set();
    for (let branch = dialog; branch && branch !== document.body && branch.parentElement; branch = branch.parentElement) {
      Array.from(branch.parentElement.children).forEach((sibling) => {
        if (sibling === branch || seenNodes.has(sibling) || /^(?:SCRIPT|STYLE|LINK|TEMPLATE)$/i.test(sibling.tagName)) return;
        seenNodes.add(sibling);
        backgroundState.push({
          node: sibling,
          hadInert: sibling.hasAttribute("inert"),
          ariaHidden: sibling.getAttribute("aria-hidden")
        });
        sibling.setAttribute("inert", "");
        sibling.setAttribute("aria-hidden", "true");
      });
    }
    const prevBodyOverflow = document.body ? document.body.style.overflow : "";
    if (document.body) document.body.style.overflow = "hidden";
    const trap = { root: dialog };
    const trapStack = typeof window !== "undefined" ? window.__alloFocusTrapStack = window.__alloFocusTrapStack || [] : null;
    if (trapStack) trapStack.push(trap);
    const isTopTrap = () => !trapStack || trapStack[trapStack.length - 1] === trap;
    const getFocusable = () => Array.from(dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], summary, [tabindex]:not([tabindex="-1"])')).filter((el) => {
      if (!el || el.hidden || el.getAttribute("aria-hidden") === "true" || el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      const closedDetails = el.closest("details:not([open])");
      if (closedDetails && !(el.tagName === "SUMMARY" && el.parentElement === closedDetails)) return false;
      const style = typeof window.getComputedStyle === "function" ? window.getComputedStyle(el) : null;
      return !style || style.display !== "none" && style.visibility !== "hidden";
    });
    (getFocusable()[0] || dialog).focus();
    const onKeyDown = (event) => {
      if (!dialog.isConnected || event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
      const topTrap = trapStack && trapStack[trapStack.length - 1];
      if (topTrap && topTrap !== trap && !(topTrap.root && typeof topTrap.root.contains === "function" && topTrap.root.contains(dialog))) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        handleSetShowStudyTimerModalToFalse();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement) || document.activeElement === dialog) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (document.body) document.body.style.overflow = prevBodyOverflow;
      backgroundState.forEach(({ node, hadInert, ariaHidden }) => {
        if (!node || !node.isConnected) return;
        if (!hadInert) node.removeAttribute("inert");
        if (ariaHidden == null) node.removeAttribute("aria-hidden");
        else node.setAttribute("aria-hidden", ariaHidden);
      });
      const wasTop = isTopTrap();
      if (trapStack) {
        const idx = trapStack.lastIndexOf(trap);
        if (idx >= 0) trapStack.splice(idx, 1);
      }
      if (wasTop && previousFocus && previousFocus !== document.body && previousFocus.isConnected && typeof previousFocus.focus === "function") previousFocus.focus();
    };
  }, [handleSetShowStudyTimerModalToFalse]);
  const completionPercent = studyDuration > 0 ? Math.max(0, Math.min(100, Math.round((studyDuration - studyTimeLeft) / studyDuration * 100))) : 0;
  const clockLabel = `${t("timer.title")}: ${formatTime(studyTimeLeft)}`;
  const completionLabel = `${completionPercent}% \xB7 ${t("common.progress")}`;
  const [timerStatus, setTimerStatus] = React.useState("");
  const prevTimerRef = React.useRef({ running: !!isStudyTimerRunning, timeLeft: studyTimeLeft });
  React.useEffect(() => {
    const prev = prevTimerRef.current;
    const running = !!isStudyTimerRunning;
    if (!prev.running && running) {
      setTimerStatus(`${t("timer.title")}: ${t("timer.start")} \u2014 ${formatTime(studyTimeLeft)}`);
    } else if (prev.running && !running && studyTimeLeft > 0) {
      setTimerStatus(`${t("timer.title")}: ${t("timer.pause")} \u2014 ${formatTime(studyTimeLeft)}`);
    } else if (prev.timeLeft > 0 && studyTimeLeft === 0 && studyDuration > 0) {
      setTimerStatus(`${t("timer.title")}: ${formatTime(0)}`);
    } else if (running && prev.timeLeft !== studyTimeLeft && (studyTimeLeft === 300 || studyTimeLeft === 60)) {
      setTimerStatus(`${t("timer.title")}: ${formatTime(studyTimeLeft)}`);
    }
    prevTimerRef.current = { running, timeLeft: studyTimeLeft };
  }, [isStudyTimerRunning, studyTimeLeft, studyDuration, formatTime, t]);
  const applyCustomMinutes = () => {
    if (isStudyTimerRunning) return;
    const parsed = parseInt(customTimerMinutes, 10);
    if (!Number.isFinite(parsed)) return;
    const mins = Math.max(1, Math.min(180, parsed));
    setCustomTimerMinutes(String(mins));
    setStudyDuration(mins * 60);
    setStudyTimeLeft(mins * 60);
    setIsStudyTimerRunning(true);
    setTimerStatus(`${t("timer.title")}: ${t("timer.start")} \u2014 ${formatTime(mins * 60)}`);
  };
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: studyTimerRef,
      role: "presentation",
      className: "fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300 motion-reduce:animate-none",
      onClick: handleSetShowStudyTimerModalToFalse
    },
    showTimerConfetti && /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 pointer-events-none z-50 flex items-center justify-center motion-reduce:hidden", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(ConfettiExplosion, null)),
    /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: dialogRef,
        tabIndex: -1,
        className: "bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full relative border-4 border-indigo-100 transition-all animate-in zoom-in-95 duration-200 motion-reduce:animate-none motion-reduce:transition-none",
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "study-timer-title",
        onClick: (e) => e.stopPropagation()
      },
      /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "aria-label": t("common.close_study_timer"),
          "data-help-key": "timer_close_btn",
          onClick: handleSetShowStudyTimerModalToFalse,
          className: "absolute top-4 right-4 min-w-11 min-h-11 inline-flex items-center justify-center p-2 rounded-full text-slate-600 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        },
        /* @__PURE__ */ React.createElement(X, { size: 20 })
      ),
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-6 text-indigo-900" }, /* @__PURE__ */ React.createElement("div", { className: "bg-indigo-100 p-2 rounded-full" }, /* @__PURE__ */ React.createElement(Clock, { size: 20, className: "text-indigo-600" })), /* @__PURE__ */ React.createElement("h3", { id: "study-timer-title", className: "font-black text-lg" }, t("timer.title"))),
      /* @__PURE__ */ React.createElement("div", { className: "mb-6" }, /* @__PURE__ */ React.createElement("label", { htmlFor: "study-timer-task", className: "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2" }, t("timer.label_task")), /* @__PURE__ */ React.createElement(
        "input",
        {
          id: "study-timer-task",
          "data-help-key": "timer_task_input",
          type: "text",
          value: studyTaskLabel,
          onChange: (e) => setStudyTaskLabel(e.target.value),
          disabled: isStudyTimerRunning,
          placeholder: t("timer.placeholder"),
          className: "w-full text-sm p-3 border-2 border-indigo-600 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all font-medium text-slate-700 bg-slate-50 focus:bg-white"
        }
      )),
      /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mb-4 justify-center flex-wrap" }, [5, 15, 25, 45].map((min) => /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "data-help-key": "timer_duration_btn",
          key: min,
          "aria-pressed": studyDuration === min * 60 && !customTimerMinutes,
          onClick: () => {
            setStudyDuration(min * 60);
            setStudyTimeLeft(min * 60);
            setCustomTimerMinutes("");
            setIsStudyTimerRunning(false);
            setTimerStatus(`${t("timer.title")}: ${min}m`);
          },
          className: "min-h-11 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors border border-indigo-200"
        },
        min,
        "m"
      ))),
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-4 justify-center" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          "aria-label": t("common.enter_custom_timer_minutes"),
          type: "number",
          min: "1",
          max: "180",
          value: customTimerMinutes,
          onChange: (e) => setCustomTimerMinutes(e.target.value),
          onKeyDown: (e) => {
            if (e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229 || e.nativeEvent?.keyCode === 229) return;
            if (e.key !== "Enter" || isStudyTimerRunning || !customTimerMinutes) return;
            e.preventDefault();
            applyCustomMinutes();
          },
          placeholder: t("common.placeholder_custom_min"),
          disabled: isStudyTimerRunning,
          className: "w-24 min-h-11 p-2 text-xs border border-indigo-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold text-slate-700"
        }
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: applyCustomMinutes,
          disabled: !customTimerMinutes || isStudyTimerRunning,
          className: "min-h-11 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        },
        t("timer.set_btn") || "Set"
      )),
      /* @__PURE__ */ React.createElement("div", { className: "text-center mb-6 relative" }, /* @__PURE__ */ React.createElement("div", { className: "text-5xl font-black text-slate-700 font-mono tracking-wider", role: "timer", "aria-live": "off", "aria-label": clockLabel }, formatTime(studyTimeLeft)), studyDuration > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-3 mx-auto max-w-[200px]" }, /* @__PURE__ */ React.createElement("div", { className: "h-2 bg-slate-200 rounded-full overflow-hidden", role: "progressbar", "aria-label": t("common.progress"), "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": completionPercent, "aria-valuetext": completionLabel }, /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-linear motion-reduce:transition-none",
          style: { width: `${completionPercent}%` }
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600 mt-1 font-medium" }, completionLabel))),
      /* @__PURE__ */ React.createElement("div", { className: "flex gap-3" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "aria-label": isStudyTimerRunning ? t("timer.pause") : t("timer.start"),
          onClick: () => {
            if (isStudyTimerRunning) {
              setIsStudyTimerRunning(false);
            } else {
              if (studyTimeLeft === 0) {
                setStudyTimeLeft(25 * 60);
                setStudyDuration(25 * 60);
              }
              setIsStudyTimerRunning(true);
            }
          },
          className: `flex-1 py-3 rounded-xl font-black text-white shadow-lg transition-all transform active:scale-95 motion-reduce:transform-none flex items-center justify-center gap-2 ${isStudyTimerRunning ? "bg-amber-700 hover:bg-amber-800" : "bg-green-700 hover:bg-green-800"}`
        },
        isStudyTimerRunning ? /* @__PURE__ */ React.createElement(Pause, { size: 20, className: "fill-current" }) : /* @__PURE__ */ React.createElement(Play, { size: 20, className: "fill-current" }),
        isStudyTimerRunning ? t("timer.pause") : t("timer.start")
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "aria-label": t("common.refresh"),
          "data-help-key": "timer_reset_btn",
          onClick: () => {
            setIsStudyTimerRunning(false);
            setStudyTimeLeft(0);
            setStudyDuration(0);
            setTimerStatus(`${t("timer.title")}: ${t("timer.reset")}`);
          },
          className: "px-4 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-red-500 rounded-xl font-bold transition-colors",
          title: t("timer.reset")
        },
        /* @__PURE__ */ React.createElement(RefreshCw, { size: 20 })
      )),
      /* @__PURE__ */ React.createElement("div", { className: "sr-only", role: "status", "aria-live": "polite", "aria-atomic": "true" }, timerStatus)
    )
  );
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.StudyTimerModal = { StudyTimerModal: StudyTimerModal };
  console.log('[CDN] StudyTimerModal loaded');
})();
