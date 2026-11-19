/* AlloFlow - AGPL-3.0-only. Generated from view_directions_composer_source.jsx. */
(function() {
var React = window.React;
if (window.AlloModules && window.AlloModules.DirectionsComposer) return;
function DirectionsComposerView({
  ArrowRight,
  ClipboardList,
  Sparkles,
  X,
  _alloDirectionsGoalResources,
  _alloGoalOptionsForResource,
  _alloStationStyle,
  _mbDirectionsChoiceDraftChoices,
  _mbDirectionsChoicePreviewItems,
  _mbDirectionsChoiceReady,
  _mbDirectionsChoiceStaleCount,
  addDirectionsToPack,
  deriveDirectionsDraft,
  directionsDeriving,
  generateUUID,
  mbDirectionsDraft,
  directionsPreviewHtml = "",
  directionsGoalEditorState,
  mbDirectionsGoalRes: legacyGoalRes,
  mbDirectionsGoalText: legacyGoalText,
  setMbDirectionsDraft,
  setMbDirectionsGoalRes: legacySetGoalRes,
  setMbDirectionsGoalText: legacySetGoalText,
  setShowDirectionsChoicePreview,
  setShowDirectionsComposer,
  showDirectionsChoicePreview,
  t
}) {
  const fallbackGoalState = React.useRef({ resource: legacyGoalRes || "", text: legacyGoalText || "" });
  const goalState = directionsGoalEditorState || fallbackGoalState;
  const previewLabel = t("common.preview");
  const tr = (key, fallback, vars) => {
    const value = typeof t === "function" ? t(key) : "";
    let text = typeof value === "string" && value.trim() && value !== key ? value : fallback;
    Object.keys(vars || {}).forEach((name) => {
      text = text.split("{" + name + "}").join(String(vars[name]));
    });
    return text;
  };
  let draftAiDoor = null;
  try {
    if (typeof window !== "undefined" && typeof window.__alloAiSetupDoorway === "function") {
      draftAiDoor = window.__alloAiSetupDoorway("text", t);
    } else if (typeof window !== "undefined" && typeof window.__alloAiUsable === "function" && !window.__alloAiUsable("text")) {
      draftAiDoor = { disabled: true, title: tr("directions.ai_unavailable", "AI setup required") };
    }
  } catch (_) {
  }
  const boardTitleDefault = tr("directions.choice_board_title", "Choose an activity");
  const boardPromptDefault = tr("directions.choice_board_prompt", "Pick one activity to work on first. You can return here and choose another later.");
  const composerDialogRef = React.useRef(null);
  const previewDialogRef = React.useRef(null);
  const previewOpenRef = React.useRef(!!showDirectionsChoicePreview);
  previewOpenRef.current = !!showDirectionsChoicePreview;
  const getFocusableIn = (container) => {
    if (!container || typeof container.querySelectorAll !== "function") return [];
    return Array.from(container.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')).filter((el) => {
      if (el.hidden || el.getAttribute("aria-hidden") === "true" || typeof el.closest === "function" && el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
        for (let cur = el; cur && cur !== container; cur = cur.parentElement) {
          const st = window.getComputedStyle(cur);
          if (st && (st.display === "none" || st.visibility === "hidden")) return false;
        }
      }
      return true;
    });
  };
  React.useEffect(() => {
    const doc = typeof window !== "undefined" ? window.document : null;
    const prevFocus = doc && doc.activeElement;
    const dialog = composerDialogRef.current;
    if (!dialog) return () => {
      if (prevFocus && prevFocus.isConnected && typeof prevFocus.focus === "function") prevFocus.focus();
    };
    const stack = typeof window !== "undefined" ? window.__alloFocusTrapStack = window.__alloFocusTrapStack || [] : [];
    const trap = { root: dialog };
    stack.push(trap);
    const onKeyDown = (e) => {
      if (e.defaultPrevented || e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229) return;
      if (stack.length > 0 && stack[stack.length - 1] !== trap) return;
      if (previewOpenRef.current) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setShowDirectionsComposer(false);
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = getFocusableIn(dialog);
      if (!focusable.length) {
        e.preventDefault();
        if (typeof dialog.focus === "function") dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = doc && doc.activeElement;
      if (e.shiftKey && (!doc || active === dialog || active === first || typeof dialog.contains === "function" && !dialog.contains(active))) {
        e.preventDefault();
        if (typeof last.focus === "function") last.focus();
      } else if (!e.shiftKey && (!doc || active === dialog || active === last || typeof dialog.contains === "function" && !dialog.contains(active))) {
        e.preventDefault();
        if (typeof first.focus === "function") first.focus();
      }
    };
    if (doc && typeof doc.addEventListener === "function") doc.addEventListener("keydown", onKeyDown);
    if (typeof dialog.addEventListener === "function") dialog.addEventListener("keydown", onKeyDown);
    return () => {
      const idx = stack.lastIndexOf(trap);
      if (idx !== -1) stack.splice(idx, 1);
      if (doc && typeof doc.removeEventListener === "function") doc.removeEventListener("keydown", onKeyDown);
      if (typeof dialog.removeEventListener === "function") dialog.removeEventListener("keydown", onKeyDown);
      if (prevFocus && prevFocus.isConnected && typeof prevFocus.focus === "function") prevFocus.focus();
    };
  }, [setShowDirectionsComposer]);
  React.useEffect(() => {
    if (!showDirectionsChoicePreview) return void 0;
    const doc = typeof window !== "undefined" ? window.document : null;
    const openerFocus = doc && doc.activeElement;
    const dialog = previewDialogRef.current;
    if (!dialog) return void 0;
    const stack = typeof window !== "undefined" ? window.__alloFocusTrapStack = window.__alloFocusTrapStack || [] : [];
    const trap = { root: dialog };
    stack.push(trap);
    const focusable = getFocusableIn(dialog);
    const initial = focusable[0] || dialog;
    if (initial && typeof initial.focus === "function") initial.focus();
    const onKeyDown = (e) => {
      if (e.defaultPrevented || e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229) return;
      if (stack.length > 0 && stack[stack.length - 1] !== trap) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setShowDirectionsChoicePreview(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = getFocusableIn(dialog);
      if (!items.length) {
        e.preventDefault();
        if (typeof dialog.focus === "function") dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = doc && doc.activeElement;
      if (e.shiftKey && (!doc || active === dialog || active === first || typeof dialog.contains === "function" && !dialog.contains(active))) {
        e.preventDefault();
        if (typeof last.focus === "function") last.focus();
      } else if (!e.shiftKey && (!doc || active === dialog || active === last || typeof dialog.contains === "function" && !dialog.contains(active))) {
        e.preventDefault();
        if (typeof first.focus === "function") first.focus();
      }
    };
    if (doc && typeof doc.addEventListener === "function") doc.addEventListener("keydown", onKeyDown);
    if (typeof dialog.addEventListener === "function") dialog.addEventListener("keydown", onKeyDown);
    return () => {
      const idx = stack.lastIndexOf(trap);
      if (idx !== -1) stack.splice(idx, 1);
      if (doc && typeof doc.removeEventListener === "function") doc.removeEventListener("keydown", onKeyDown);
      if (typeof dialog.removeEventListener === "function") dialog.removeEventListener("keydown", onKeyDown);
      if (openerFocus && openerFocus.isConnected && typeof openerFocus.focus === "function") openerFocus.focus();
    };
  }, [showDirectionsChoicePreview, setShowDirectionsChoicePreview]);
  const [numDrafts, setNumDrafts] = React.useState({});
  const [mbDirectionsGoalRes, updateGoalRes] = React.useState(() => goalState.current.resource);
  const [mbDirectionsGoalText, updateGoalText] = React.useState(() => goalState.current.text);
  const setMbDirectionsGoalRes = (value) => {
    goalState.current.resource = value;
    updateGoalRes(value);
    if (legacySetGoalRes) legacySetGoalRes(value);
  };
  const setMbDirectionsGoalText = (value) => {
    goalState.current.text = value;
    updateGoalText(value);
    if (legacySetGoalText) legacySetGoalText(value);
  };
  return /* @__PURE__ */ React.createElement("div", { role: "presentation", className: "fixed inset-0 z-[395] bg-black/40 flex items-center justify-center p-4", onKeyDown: (e) => {
    if (e.defaultPrevented || e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229) return;
    const stack = typeof window !== "undefined" ? window.__alloFocusTrapStack : null;
    const expectedRoot = showDirectionsChoicePreview ? previewDialogRef.current : composerDialogRef.current;
    if (Array.isArray(stack) && stack.length > 0 && expectedRoot && stack[stack.length - 1]?.root !== expectedRoot) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (showDirectionsChoicePreview) {
        setShowDirectionsChoicePreview(false);
      } else {
        setShowDirectionsComposer(false);
      }
    }
  } }, /* @__PURE__ */ React.createElement("div", { ref: composerDialogRef, tabIndex: -1, "data-help-key": "directions_composer", role: "dialog", "aria-modal": "true", "aria-label": t("directions.title") || "Lesson Directions", className: "allo-docsuite bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-4 flex flex-col overflow-hidden", style: { maxHeight: "calc(100dvh - 2rem)" } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1" }, /* @__PURE__ */ React.createElement(ClipboardList, { size: 18, className: "text-amber-600", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("h2", { className: "text-sm font-bold text-slate-800 flex-1" }, t("directions.title") || "Lesson Directions"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setShowDirectionsComposer(false), "aria-label": t("common.close") || "Close", className: "min-h-11 min-w-11 inline-flex items-center justify-center text-slate-600 hover:text-slate-900 p-1 rounded-lg transition-all motion-reduce:transition-none" }, /* @__PURE__ */ React.createElement(X, { size: 16, "aria-hidden": "true" }))), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 mb-2" }, t("directions.subtitle") || "Student-facing. Students see this first \u2014 in class, on homework QRs, and on the take-home shelf."), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 min-h-0 flex-1 overflow-y-auto pr-1", "data-directions-scroll": true }, /* @__PURE__ */ React.createElement("input", { "data-help-key": "directions_title", autoFocus: true, value: mbDirectionsDraft?.title || "", onChange: (e) => setMbDirectionsDraft((p) => ({ ...p || {}, title: e.target.value })), placeholder: t("directions.title_placeholder") || "Title (e.g. Tonight's homework)", "aria-label": t("directions.title_aria") || "Directions title", className: "w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800" }), /* @__PURE__ */ React.createElement("textarea", { "data-help-key": "directions_body", value: mbDirectionsDraft?.body || "", onChange: (e) => setMbDirectionsDraft((p) => ({ ...p || {}, body: e.target.value })), placeholder: t("directions.body_placeholder") || "Directions for students: the steps, and what finished work looks like.", "aria-label": t("directions.body_aria") || "Directions for students", rows: 6, className: "w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800" }), /* @__PURE__ */ React.createElement("input", { "data-help-key": "directions_due", value: mbDirectionsDraft?.due || "", onChange: (e) => setMbDirectionsDraft((p) => ({ ...p || {}, due: e.target.value })), placeholder: t("directions.due_placeholder") || "Due (optional, e.g. Friday)", "aria-label": t("directions.due_aria") || "Due date", className: "w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800" }), /* @__PURE__ */ React.createElement("details", { className: "rounded-lg border border-slate-200 bg-slate-50 p-2", "data-directions-preview": true }, /* @__PURE__ */ React.createElement("summary", { className: "cursor-pointer text-xs font-bold text-indigo-800" }, previewLabel && previewLabel !== "common.preview" ? previewLabel : "Preview"), directionsPreviewHtml ? /* @__PURE__ */ React.createElement("div", { className: "mt-3 text-sm text-slate-800 break-words", dangerouslySetInnerHTML: { __html: typeof window.sanitizeHtml === "function" ? window.sanitizeHtml(directionsPreviewHtml) : "" } }) : /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-xs text-slate-600" }, t("directions.body_placeholder") || "Write directions to preview them here.")), /* @__PURE__ */ React.createElement("div", { className: "border-t border-indigo-100 pt-2" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-start gap-2 cursor-pointer select-none" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: mbDirectionsDraft?.choiceBoard?.enabled === true,
      onChange: (e) => setMbDirectionsDraft((p) => {
        const next = { ...p || {} };
        if (!e.target.checked) {
          delete next.choiceBoard;
          return next;
        }
        next.choiceBoard = {
          enabled: true,
          title: next.choiceBoard?.title || boardTitleDefault,
          prompt: next.choiceBoard?.prompt || boardPromptDefault,
          choices: Array.isArray(next.choiceBoard?.choices) ? next.choiceBoard.choices : []
        };
        return next;
      }),
      "aria-label": tr("directions.choice_board_enable", "Offer an activity choice board"),
      className: "mt-0.5 w-4 h-4 accent-indigo-600 flex-shrink-0"
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold text-indigo-900" }, tr("directions.choice_board_enable", "Offer an activity choice board"))), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-600 mt-1 ml-6" }, tr("directions.choice_board_hint", "Students will see these pack activities as large, selectable cards on the directions page.")), mbDirectionsDraft?.choiceBoard?.enabled === true && /* @__PURE__ */ React.createElement("div", { className: "mt-2 ml-6 space-y-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      value: mbDirectionsDraft.choiceBoard.title || "",
      onChange: (e) => setMbDirectionsDraft((p) => ({ ...p || {}, choiceBoard: { ...p?.choiceBoard || {}, enabled: true, title: e.target.value } })),
      "aria-label": tr("directions.choice_board_title_aria", "Activity choice board title"),
      placeholder: boardTitleDefault,
      className: "w-full text-[11px] border border-indigo-200 rounded p-1.5 bg-white text-slate-800"
    }
  ), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: mbDirectionsDraft.choiceBoard.prompt || "",
      onChange: (e) => setMbDirectionsDraft((p) => ({ ...p || {}, choiceBoard: { ...p?.choiceBoard || {}, enabled: true, prompt: e.target.value } })),
      "aria-label": tr("directions.choice_board_prompt_aria", "Activity choice board instructions"),
      placeholder: boardPromptDefault,
      rows: 2,
      className: "w-full text-[11px] border border-indigo-200 rounded p-1.5 bg-white text-slate-800"
    }
  ), /* @__PURE__ */ React.createElement("div", { role: "group", "aria-label": tr("directions.choice_board_activities_group", "Activities to include in the choice board"), className: "grid grid-cols-1 sm:grid-cols-2 gap-1.5" }, _alloDirectionsGoalResources.map((it) => {
    const choices = Array.isArray(mbDirectionsDraft.choiceBoard.choices) ? mbDirectionsDraft.choiceBoard.choices : [];
    const included = choices.some((choice) => choice.resourceRef === it.id);
    const full = choices.length >= 6 && !included;
    const station = _alloStationStyle(it.type);
    return /* @__PURE__ */ React.createElement("label", { key: it.id, className: "flex items-start gap-2 rounded-lg border p-2 cursor-pointer transition-colors " + (included ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-indigo-300") }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: included,
        disabled: full,
        onChange: () => setMbDirectionsDraft((p) => {
          const next = { ...p || {} };
          const board = { ...next.choiceBoard || {}, enabled: true };
          const current = Array.isArray(board.choices) ? board.choices : [];
          board.choices = current.some((choice) => choice.resourceRef === it.id) ? current.filter((choice) => choice.resourceRef !== it.id) : current.length >= 6 ? current : [...current, { resourceRef: it.id, label: it.title || station.label, icon: station.icon || "", description: "" }];
          next.choiceBoard = board;
          return next;
        }),
        "aria-label": tr("directions.choice_board_include_aria", "Include {title} in activity choice board", { title: it.title || station.label }),
        className: "mt-0.5 w-4 h-4 accent-indigo-600 flex-shrink-0"
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] font-bold text-slate-800 truncate" }, station.icon || "\u2022", " ", it.title || station.label), /* @__PURE__ */ React.createElement("span", { className: "block text-[9px] text-slate-600" }, station.label)));
  })), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2 pt-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-600" }, tr("directions.choice_board_range_hint", "Choose 2\u20136 activities. Students can return to the directions page and choose another card later.")), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setShowDirectionsChoicePreview(true),
      disabled: !_mbDirectionsChoiceReady,
      "aria-label": tr("directions.choice_board_preview_aria", "Preview student choice board"),
      className: "min-h-11 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-colors motion-reduce:transition-none " + (_mbDirectionsChoiceReady ? "border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100" : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500")
    },
    tr("directions.choice_board_preview_btn", "Preview student board")
  )), _mbDirectionsChoiceStaleCount > 0 && /* @__PURE__ */ React.createElement("p", { role: "alert", className: "text-[10px] font-bold text-rose-700" }, _mbDirectionsChoiceStaleCount === 1 ? tr("directions.choice_board_stale_one", "1 selected activity is no longer available in this pack. Remove it before saving.") : tr("directions.choice_board_stale_many", "{n} selected activities are no longer available in this pack. Remove them before saving.", { n: _mbDirectionsChoiceStaleCount })), _mbDirectionsChoiceDraftChoices.length === 1 && _mbDirectionsChoiceStaleCount === 0 && /* @__PURE__ */ React.createElement("p", { role: "alert", className: "text-[10px] font-bold text-amber-700" }, tr("directions.choice_board_need_one_more", "Select one more activity to enable the choice board.")), _mbDirectionsChoiceDraftChoices.length === 0 && _alloDirectionsGoalResources.length > 0 && /* @__PURE__ */ React.createElement("p", { role: "status", className: "text-[10px] text-slate-600" }, tr("directions.choice_board_need_two", "Select at least two activities to preview or save this board.")), _mbDirectionsChoiceDraftChoices.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-slate-700" }, tr("directions.choice_board_descriptions", "Optional card descriptions")), _mbDirectionsChoiceDraftChoices.map((choice) => /* @__PURE__ */ React.createElement(
    "input",
    {
      key: "description-" + choice.resourceRef,
      value: choice.description || "",
      onChange: (e) => setMbDirectionsDraft((p) => ({
        ...p || {},
        choiceBoard: {
          ...p?.choiceBoard || {},
          enabled: true,
          choices: (Array.isArray(p?.choiceBoard?.choices) ? p.choiceBoard.choices : []).map((item) => item.resourceRef === choice.resourceRef ? { ...item, description: e.target.value } : item)
        }
      })),
      "aria-label": tr("directions.choice_board_desc_aria", "Description for {label}", { label: choice.label }),
      placeholder: tr("directions.choice_board_desc_placeholder", "Optional: what students will do here"),
      className: "w-full rounded border border-slate-300 bg-white p-1.5 text-[10px] text-slate-800"
    }
  ))), showDirectionsChoicePreview && /* @__PURE__ */ React.createElement("div", { role: "presentation", className: "fixed inset-0 z-[410] flex items-center justify-center bg-black/50 p-4", onClick: () => setShowDirectionsChoicePreview(false), onKeyDown: (e) => {
    if (e.defaultPrevented || e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229) return;
    const stack = typeof window !== "undefined" ? window.__alloFocusTrapStack : null;
    if (Array.isArray(stack) && stack.length > 0 && previewDialogRef.current && stack[stack.length - 1]?.root !== previewDialogRef.current) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setShowDirectionsChoicePreview(false);
    }
  } }, /* @__PURE__ */ React.createElement("div", { ref: previewDialogRef, tabIndex: -1, role: "dialog", "aria-modal": "true", "aria-labelledby": "directions-choice-preview-title", className: "allo-docsuite max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-slate-50 p-4 shadow-2xl", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "mb-3 flex items-start gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold uppercase tracking-wide text-indigo-700" }, tr("directions.student_preview_badge", "Student preview")), /* @__PURE__ */ React.createElement("h3", { id: "directions-choice-preview-title", className: "text-base font-black text-slate-900" }, mbDirectionsDraft.choiceBoard.title || boardTitleDefault), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-slate-600" }, mbDirectionsDraft.choiceBoard.prompt || boardPromptDefault)), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setShowDirectionsChoicePreview(false), "aria-label": tr("directions.close_preview_aria", "Close student choice board preview"), className: "min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-100" }, /* @__PURE__ */ React.createElement(X, { size: 16, "aria-hidden": "true" }))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2" }, _mbDirectionsChoicePreviewItems.map(({ choice, resource }) => {
    const station = _alloStationStyle(resource.type);
    return /* @__PURE__ */ React.createElement("article", { key: "preview-" + choice.resourceRef, className: "flex min-h-24 items-start gap-3 rounded-xl border-2 border-indigo-100 bg-white p-3 shadow-sm" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", className: "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xl text-white shadow-sm" }, choice.icon || station.icon || "\u2022"), /* @__PURE__ */ React.createElement("span", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("span", { className: "block text-sm font-black text-slate-800" }, choice.label), /* @__PURE__ */ React.createElement("span", { className: "mt-1 block text-[10px] font-bold uppercase tracking-wide text-indigo-700" }, station.label), choice.description && /* @__PURE__ */ React.createElement("span", { className: "mt-1 block text-xs leading-5 text-slate-600" }, choice.description), /* @__PURE__ */ React.createElement("span", { className: "mt-2 block text-[11px] font-bold text-indigo-700" }, tr("directions.open_activity", "Open activity"), " ", /* @__PURE__ */ React.createElement(ArrowRight, { size: 12, className: "inline", "aria-hidden": "true" }))));
  })), /* @__PURE__ */ React.createElement("p", { className: "mt-3 text-[10px] text-slate-600" }, tr("directions.preview_footer_note", "This preview shows the cards students will see on the directions page.")))))), /* @__PURE__ */ React.createElement("div", { className: "border-t border-slate-100 pt-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-slate-600 mb-1" }, t("directions.objectives") || "Goals (auto-check where possible)"), (mbDirectionsDraft?.objectives || []).map((o, oi) => {
    const xpRaw = Object.prototype.hasOwnProperty.call(numDrafts, o.id + ":xp") ? numDrafts[o.id + ":xp"] : null;
    const xpNum = xpRaw === null ? null : Number(xpRaw);
    const xpInvalid = o.kind === "xp" && xpRaw !== null && xpRaw !== "" && (!Number.isFinite(xpNum) || xpNum < 1 || xpNum > 1e3);
    const timeRaw = Object.prototype.hasOwnProperty.call(numDrafts, o.id + ":time") ? numDrafts[o.id + ":time"] : null;
    const timeNum = timeRaw === null ? null : Number(timeRaw);
    const timeInvalid = o.kind === "time" && timeRaw !== null && timeRaw !== "" && (!Number.isFinite(timeNum) || timeNum < 1 || timeNum > 240);
    return /* @__PURE__ */ React.createElement("div", { key: o.id, className: "mb-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-bold uppercase rounded px-1 py-0.5 flex-shrink-0 " + (o.kind === "xp" ? "bg-indigo-50 text-indigo-700" : o.kind === "game" ? "bg-emerald-50 text-emerald-700" : o.kind === "manual" ? "bg-slate-100 text-slate-600" : "bg-sky-50 text-sky-700") }, o.kind === "manual" ? t("directions.kind_manual") || "self-check" : o.kind === "visited" ? t("directions.kind_visited") || "opened" : o.kind === "responded" ? t("directions.kind_responded") || "answered" : o.kind === "completed" ? t("directions.kind_completed") || "finished" : o.kind === "time" ? t("directions.kind_time") || "time" : o.kind), /* @__PURE__ */ React.createElement("input", { value: o.label, onChange: (e) => setMbDirectionsDraft((p) => {
      const list = [...p && p.objectives || []];
      list[oi] = { ...list[oi], label: e.target.value };
      return { ...p || {}, objectives: list };
    }), "aria-label": t("directions.objective_label") || "Goal label", className: "flex-1 min-w-0 min-h-6 text-[11px] border border-slate-300 rounded p-1 bg-white text-slate-800" }), o.kind === "xp" && /* @__PURE__ */ React.createElement("input", { type: "number", min: "1", max: "1000", "aria-invalid": xpInvalid ? "true" : void 0, "aria-describedby": xpInvalid ? `dir-xp-err-${o.id}` : void 0, value: xpRaw !== null ? xpRaw : o.amount ?? 25, onChange: (e) => {
      const raw = e.target.value;
      const key = o.id + ":xp";
      setNumDrafts((prev) => ({ ...prev, [key]: raw }));
      const parsed = Number(raw);
      if (raw !== "" && Number.isFinite(parsed) && parsed >= 1 && parsed <= 1e3) {
        setMbDirectionsDraft((p) => {
          const list = [...p && p.objectives || []];
          if (list[oi]) list[oi] = { ...list[oi], amount: Math.round(parsed) };
          return { ...p || {}, objectives: list };
        });
      }
    }, onBlur: (e) => {
      const raw = e.target.value;
      const key = o.id + ":xp";
      const parsed = Number(raw);
      const amt = raw === "" ? o.amount || 25 : Math.max(1, Math.min(1e3, Number.isFinite(parsed) ? Math.round(parsed) : 1));
      setNumDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setMbDirectionsDraft((p) => {
        const list = [...p && p.objectives || []];
        if (list[oi]) list[oi] = { ...list[oi], amount: amt };
        return { ...p || {}, objectives: list };
      });
    }, "aria-label": t("directions.xp_amount") || "XP amount", className: "w-16 min-h-6 text-[11px] border rounded p-1 bg-white text-slate-800 flex-shrink-0 " + (xpInvalid ? "border-rose-600" : "border-slate-300") }), o.kind === "time" && /* @__PURE__ */ React.createElement("input", { type: "number", min: "1", max: "240", "aria-invalid": timeInvalid ? "true" : void 0, "aria-describedby": timeInvalid ? `dir-time-err-${o.id}` : void 0, value: timeRaw !== null ? timeRaw : o.minutes ?? 10, onChange: (e) => {
      const raw = e.target.value;
      const key = o.id + ":time";
      setNumDrafts((prev) => ({ ...prev, [key]: raw }));
      const parsed = Number(raw);
      if (raw !== "" && Number.isFinite(parsed) && parsed >= 1 && parsed <= 240) {
        setMbDirectionsDraft((p) => {
          const list = [...p && p.objectives || []];
          if (list[oi]) list[oi] = { ...list[oi], minutes: Math.round(parsed) };
          return { ...p || {}, objectives: list };
        });
      }
    }, onBlur: (e) => {
      const raw = e.target.value;
      const key = o.id + ":time";
      const parsed = Number(raw);
      const mins = raw === "" ? o.minutes || 10 : Math.max(1, Math.min(240, Number.isFinite(parsed) ? Math.round(parsed) : 1));
      setNumDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setMbDirectionsDraft((p) => {
        const list = [...p && p.objectives || []];
        if (list[oi]) list[oi] = { ...list[oi], minutes: mins };
        return { ...p || {}, objectives: list };
      });
    }, "aria-label": t("directions.time_minutes") || "Minutes", className: "w-16 min-h-6 text-[11px] border rounded p-1 bg-white text-slate-800 flex-shrink-0 " + (timeInvalid ? "border-rose-600" : "border-slate-300") }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setMbDirectionsDraft((p) => ({ ...p || {}, objectives: (p && p.objectives || []).filter((x) => x.id !== o.id) })), "aria-label": t("directions.remove_objective") || "Remove goal", className: "min-h-11 min-w-11 inline-flex items-center justify-center text-slate-600 hover:text-rose-600 p-0.5 flex-shrink-0" }, /* @__PURE__ */ React.createElement(X, { size: 12, "aria-hidden": "true" }))), xpInvalid && /* @__PURE__ */ React.createElement("p", { id: `dir-xp-err-${o.id}`, role: "alert", className: "mt-0.5 text-[11px] font-bold text-rose-700" }, t("directions.xp_range_error") || "Enter XP between 1 and 1000."), timeInvalid && /* @__PURE__ */ React.createElement("p", { id: `dir-time-err-${o.id}`, role: "alert", className: "mt-0.5 text-[11px] font-bold text-rose-700" }, t("directions.time_range_error") || "Enter minutes between 1 and 240."));
  }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 mt-1" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      value: mbDirectionsGoalText,
      onChange: (e) => setMbDirectionsGoalText(e.target.value),
      onKeyDown: (e) => {
        if (e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229) return;
        if (e.key !== "Enter" || !mbDirectionsGoalText.trim()) return;
        e.preventDefault();
        setMbDirectionsDraft((p) => ({ ...p || {}, objectives: [...p && p.objectives || [], { id: generateUUID(), kind: "manual", label: mbDirectionsGoalText.trim() }] }));
        setMbDirectionsGoalText("");
      },
      placeholder: t("directions.goal_write_placeholder") || "Write a goal in your own words\u2026",
      "aria-label": t("directions.goal_write_label") || "Write a goal",
      className: "flex-1 min-w-0 text-[11px] border border-slate-300 rounded p-1.5 bg-white text-slate-800"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => {
        if (!mbDirectionsGoalText.trim()) return;
        setMbDirectionsDraft((p) => ({ ...p || {}, objectives: [...p && p.objectives || [], { id: generateUUID(), kind: "manual", label: mbDirectionsGoalText.trim() }] }));
        setMbDirectionsGoalText("");
      },
      disabled: !mbDirectionsGoalText.trim(),
      className: "min-h-11 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 hover:border-slate-400 rounded px-2 py-1 transition-all motion-reduce:transition-none disabled:opacity-40 flex-shrink-0"
    },
    "+ ",
    t("directions.goal_add") || "Add"
  )), /* @__PURE__ */ React.createElement("div", { className: "mt-2" }, /* @__PURE__ */ React.createElement("label", { className: "block text-[10px] font-bold text-slate-600 mb-1", htmlFor: "dir-goal-res" }, t("directions.goal_attach") || "Auto-check against a resource"), /* @__PURE__ */ React.createElement(
    "select",
    {
      id: "dir-goal-res",
      value: mbDirectionsGoalRes,
      onChange: (e) => setMbDirectionsGoalRes(e.target.value),
      className: "w-full text-[11px] border border-slate-300 rounded p-1.5 bg-white text-slate-800"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, _alloDirectionsGoalResources.length ? t("directions.goal_pick_resource") || "Pick something in this pack\u2026" : t("directions.goal_no_resources") || "No pack resources yet"),
    _alloDirectionsGoalResources.map((it) => /* @__PURE__ */ React.createElement("option", { key: it.id, value: it.id }, (_alloStationStyle(it.type).icon || "") + " " + (it.title || it.type)))
  ), mbDirectionsGoalRes && (() => {
    const _res = _alloDirectionsGoalResources.find((it) => it.id === mbDirectionsGoalRes);
    const _opts = _alloGoalOptionsForResource(_res);
    if (!_opts.length) return null;
    return /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1 mt-1.5" }, _opts.map((opt) => /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        key: opt.kind + ":" + (opt.gameType || ""),
        onClick: () => setMbDirectionsDraft((p) => ({ ...p || {}, objectives: [...p && p.objectives || [], {
          id: generateUUID(),
          kind: opt.kind,
          label: t(opt.labelKey, { title: _res && _res.title || "" }) || opt.label,
          ...opt.gameType ? { gameType: opt.gameType } : {},
          ...opt.minutes ? { minutes: opt.minutes } : {},
          ...opt.kind === "manual" ? {} : { resourceRef: mbDirectionsGoalRes }
        }] })),
        className: "min-h-11 inline-flex items-center text-[10px] font-bold rounded-full px-2 py-0.5 border transition-all motion-reduce:transition-none " + (opt.kind === "game" ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:border-emerald-400" : opt.kind === "manual" ? "text-slate-600 bg-slate-50 border-slate-200 hover:border-slate-400" : "text-sky-700 bg-sky-50 border-sky-200 hover:border-sky-400")
      },
      "+ ",
      opt.label
    )));
  })()), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1 mt-2" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setMbDirectionsDraft((p) => ({ ...p || {}, objectives: [...p && p.objectives || [], { id: generateUUID(), kind: "xp", amount: 25, label: tr("directions.earn_xp_default", "Earn {n} XP", { n: 25 }) }] })), className: "min-h-11 inline-flex items-center text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:border-indigo-400 rounded-full px-2 py-0.5 transition-all motion-reduce:transition-none" }, tr("directions.add_xp_btn", "+ XP"))), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-600 mt-1" }, t("directions.objectives_note") || "Goals check off on the student's device \u2014 a formative guide, not a grade, and nothing is ever locked."), (mbDirectionsDraft?.objectives || []).length > 0 && /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1.5 mt-1 cursor-pointer select-none" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: mbDirectionsDraft?.softGate === true, onChange: (e) => setMbDirectionsDraft((p) => ({ ...p || {}, softGate: e.target.checked })), className: "w-3.5 h-3.5 accent-amber-600" }), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-slate-600" }, t("directions.soft_gate_label") || "Gently suggest finishing goals before the rest of the pack (a friendly tip \u2014 never a lock)"))), /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-key": "directions_draft", onClick: deriveDirectionsDraft, disabled: directionsDeriving || !!draftAiDoor?.disabled, title: draftAiDoor?.title || void 0, className: "min-h-11 w-full flex items-center justify-center gap-2 text-xs font-bold text-indigo-800 hover:text-indigo-900 bg-indigo-50 border border-indigo-300 hover:border-indigo-400 rounded-lg p-2 transition-all motion-reduce:transition-none disabled:opacity-60" }, /* @__PURE__ */ React.createElement(Sparkles, { size: 13 }), " ", directionsDeriving ? t("directions.drafting") || "Drafting\u2026" : t("directions.draft_for_me") || "Draft for me (from lesson plan + pack)")), /* @__PURE__ */ React.createElement("div", { className: "pt-3 shrink-0 bg-white" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-key": "directions_add_pack", onClick: addDirectionsToPack, className: "min-h-11 flex-1 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 border border-emerald-300 hover:border-emerald-400 rounded-lg p-2 transition-all motion-reduce:transition-none" }, t("directions.add") || "Add to pack"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setShowDirectionsComposer(false), className: "min-h-11 text-xs text-slate-600 hover:text-slate-700 border border-slate-200 rounded-lg px-3 transition-all motion-reduce:transition-none" }, t("common.cancel") || "Cancel")), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-600 text-center" }, t("directions.review_note") || "AI drafts are a starting point \u2014 review before adding. You know your students; the AI does not."))));
}

window.AlloModules = window.AlloModules || {};
window.AlloModules.DirectionsComposer = { DirectionsComposerView: DirectionsComposerView };
})();
