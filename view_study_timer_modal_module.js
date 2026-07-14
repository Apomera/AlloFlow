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
    const getFocusable = () => Array.from(dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
    (getFocusable()[0] || dialog).focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
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
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", onKeyDown);
    return () => {
      dialog.removeEventListener("keydown", onKeyDown);
      if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
    };
  }, [handleSetShowStudyTimerModalToFalse]);
  const completionPercent = studyDuration > 0 ? Math.max(0, Math.min(100, Math.round((studyDuration - studyTimeLeft) / studyDuration * 100))) : 0;
  const timerStatus = studyDuration > 0 && studyTimeLeft === 0 ? `${t("timer.title")}: complete` : `${t("timer.title")}: ${isStudyTimerRunning ? "running" : studyDuration > 0 ? "paused" : "ready"}`;
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
          "aria-label": t("common.close_study_timer"),
          "data-help-key": "timer_close_btn",
          onClick: handleSetShowStudyTimerModalToFalse,
          className: "absolute top-4 right-4 p-2 rounded-full text-slate-600 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
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
          "data-help-key": "timer_duration_btn",
          key: min,
          "aria-pressed": studyDuration === min * 60 && !customTimerMinutes,
          onClick: () => {
            setStudyDuration(min * 60);
            setStudyTimeLeft(min * 60);
            setCustomTimerMinutes("");
            setIsStudyTimerRunning(false);
          },
          className: "px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors border border-indigo-200"
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
          placeholder: t("common.placeholder_custom_min"),
          disabled: isStudyTimerRunning,
          className: "w-24 p-2 text-xs border border-indigo-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold text-slate-700"
        }
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            const mins = parseInt(customTimerMinutes);
            if (mins > 0) {
              setStudyDuration(mins * 60);
              setStudyTimeLeft(mins * 60);
              setIsStudyTimerRunning(true);
            }
          },
          disabled: !customTimerMinutes || isStudyTimerRunning,
          className: "px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        },
        t("timer.set_btn") || "Set"
      )),
      /* @__PURE__ */ React.createElement("div", { className: "text-center mb-6 relative" }, /* @__PURE__ */ React.createElement("div", { className: "text-5xl font-black text-slate-700 font-mono tracking-wider", role: "timer", "aria-live": "off", "aria-label": `${t("timer.title")}: ${formatTime(studyTimeLeft)} remaining` }, formatTime(studyTimeLeft)), studyDuration > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-3 mx-auto max-w-[200px]" }, /* @__PURE__ */ React.createElement("div", { className: "h-2 bg-slate-200 rounded-full overflow-hidden", role: "progressbar", "aria-label": t("common.progress"), "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": completionPercent, "aria-valuetext": `${completionPercent}% complete` }, /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-linear motion-reduce:transition-none",
          style: { width: `${completionPercent}%` }
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600 mt-1 font-medium" }, completionPercent, "% complete"))),
      /* @__PURE__ */ React.createElement("div", { className: "flex gap-3" }, /* @__PURE__ */ React.createElement(
        "button",
        {
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
          className: `flex-1 py-3 rounded-xl font-black text-white shadow-lg transition-all transform active:scale-95 motion-reduce:transform-none flex items-center justify-center gap-2 ${isStudyTimerRunning ? "bg-yellow-500 hover:bg-yellow-600" : "bg-green-700 hover:bg-green-800"}`
        },
        isStudyTimerRunning ? /* @__PURE__ */ React.createElement(Pause, { size: 20, className: "fill-current" }) : /* @__PURE__ */ React.createElement(Play, { size: 20, className: "fill-current" }),
        isStudyTimerRunning ? t("timer.pause") : t("timer.start")
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          "aria-label": t("common.refresh"),
          "data-help-key": "timer_reset_btn",
          onClick: () => {
            setIsStudyTimerRunning(false);
            setStudyTimeLeft(0);
            setStudyDuration(0);
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
