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
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[395] bg-black/40 flex items-center justify-center p-4", onKeyDown: (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      setShowDirectionsComposer(false);
    }
  } }, /* @__PURE__ */ React.createElement("div", { "data-help-key": "directions_composer", role: "dialog", "aria-modal": "true", "aria-label": t("directions.title") || "Assignment Directions", className: "bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1" }, /* @__PURE__ */ React.createElement(ClipboardList, { size: 18, className: "text-amber-600", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("h2", { className: "text-sm font-bold text-slate-800 flex-1" }, t("directions.title") || "Assignment Directions"), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowDirectionsComposer(false), "aria-label": t("common.close") || "Close", className: "text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-all" }, /* @__PURE__ */ React.createElement(X, { size: 16 }))), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-500 mb-2" }, t("directions.subtitle") || "Student-facing. Students see this first \u2014 in class, on homework QRs, and on the take-home shelf."), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("input", { "data-help-key": "directions_title", autoFocus: true, value: mbDirectionsDraft?.title || "", onChange: (e) => setMbDirectionsDraft((p) => ({ ...p || {}, title: e.target.value })), placeholder: t("directions.title_placeholder") || "Title (e.g. Tonight's homework)", "aria-label": t("directions.title_aria") || "Directions title", className: "w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800" }), /* @__PURE__ */ React.createElement("textarea", { "data-help-key": "directions_body", value: mbDirectionsDraft?.body || "", onChange: (e) => setMbDirectionsDraft((p) => ({ ...p || {}, body: e.target.value })), placeholder: t("directions.body_placeholder") || "Directions for students: the steps, and what finished work looks like.", "aria-label": t("directions.body_aria") || "Directions for students", rows: 6, className: "w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800" }), /* @__PURE__ */ React.createElement("input", { "data-help-key": "directions_due", value: mbDirectionsDraft?.due || "", onChange: (e) => setMbDirectionsDraft((p) => ({ ...p || {}, due: e.target.value })), placeholder: t("directions.due_placeholder") || "Due (optional, e.g. Friday)", "aria-label": t("directions.due_aria") || "Due date", className: "w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800" }), /* @__PURE__ */ React.createElement("div", { className: "border-t border-indigo-100 pt-2" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-start gap-2 cursor-pointer select-none" }, /* @__PURE__ */ React.createElement(
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
          title: next.choiceBoard?.title || "Choose an activity",
          prompt: next.choiceBoard?.prompt || "Pick one activity to work on first. You can return here and choose another later.",
          choices: Array.isArray(next.choiceBoard?.choices) ? next.choiceBoard.choices : []
        };
        return next;
      }),
      "aria-label": "Offer an activity choice board",
      className: "mt-0.5 w-4 h-4 accent-indigo-600 flex-shrink-0"
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold text-indigo-900" }, "Offer an activity choice board")), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-500 mt-1 ml-6" }, "Students will see these pack activities as large, selectable cards on the directions page."), mbDirectionsDraft?.choiceBoard?.enabled === true && /* @__PURE__ */ React.createElement("div", { className: "mt-2 ml-6 space-y-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      value: mbDirectionsDraft.choiceBoard.title || "",
      onChange: (e) => setMbDirectionsDraft((p) => ({ ...p || {}, choiceBoard: { ...p?.choiceBoard || {}, enabled: true, title: e.target.value } })),
      "aria-label": "Activity choice board title",
      placeholder: "Choose an activity",
      className: "w-full text-[11px] border border-indigo-200 rounded p-1.5 bg-white text-slate-800"
    }
  ), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: mbDirectionsDraft.choiceBoard.prompt || "",
      onChange: (e) => setMbDirectionsDraft((p) => ({ ...p || {}, choiceBoard: { ...p?.choiceBoard || {}, enabled: true, prompt: e.target.value } })),
      "aria-label": "Activity choice board instructions",
      placeholder: "Pick one activity to work on first.",
      rows: 2,
      className: "w-full text-[11px] border border-indigo-200 rounded p-1.5 bg-white text-slate-800"
    }
  ), /* @__PURE__ */ React.createElement("div", { role: "group", "aria-label": "Activities to include in the choice board", className: "grid grid-cols-1 sm:grid-cols-2 gap-1.5" }, _alloDirectionsGoalResources.map((it) => {
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
        "aria-label": "Include " + (it.title || station.label) + " in activity choice board",
        className: "mt-0.5 w-4 h-4 accent-indigo-600 flex-shrink-0"
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] font-bold text-slate-800 truncate" }, station.icon || "\u2022", " ", it.title || station.label), /* @__PURE__ */ React.createElement("span", { className: "block text-[9px] text-slate-500" }, station.label)));
  })), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2 pt-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-500" }, "Choose 2\u20136 activities. Students can return to the directions page and choose another card later."), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setShowDirectionsChoicePreview(true),
      disabled: !_mbDirectionsChoiceReady,
      "aria-label": "Preview student choice board",
      className: "min-h-9 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-colors " + (_mbDirectionsChoiceReady ? "border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100" : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400")
    },
    "Preview student board"
  )), _mbDirectionsChoiceStaleCount > 0 && /* @__PURE__ */ React.createElement("p", { role: "alert", className: "text-[10px] font-bold text-rose-700" }, _mbDirectionsChoiceStaleCount, " selected activit", _mbDirectionsChoiceStaleCount === 1 ? "y is" : "ies are", " no longer available in this pack. Remove ", _mbDirectionsChoiceStaleCount === 1 ? "it" : "them", " before saving."), _mbDirectionsChoiceDraftChoices.length === 1 && _mbDirectionsChoiceStaleCount === 0 && /* @__PURE__ */ React.createElement("p", { role: "alert", className: "text-[10px] font-bold text-amber-700" }, "Select one more activity to enable the choice board."), _mbDirectionsChoiceDraftChoices.length === 0 && _alloDirectionsGoalResources.length > 0 && /* @__PURE__ */ React.createElement("p", { role: "status", className: "text-[10px] text-slate-500" }, "Select at least two activities to preview or save this board."), _mbDirectionsChoiceDraftChoices.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-slate-700" }, "Optional card descriptions"), _mbDirectionsChoiceDraftChoices.map((choice) => /* @__PURE__ */ React.createElement(
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
      "aria-label": "Description for " + choice.label,
      placeholder: "Optional: what students will do here",
      className: "w-full rounded border border-slate-300 bg-white p-1.5 text-[10px] text-slate-800"
    }
  ))), showDirectionsChoicePreview && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[410] flex items-center justify-center bg-black/50 p-4", onClick: () => setShowDirectionsChoicePreview(false) }, /* @__PURE__ */ React.createElement("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "directions-choice-preview-title", className: "max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-slate-50 p-4 shadow-2xl", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "mb-3 flex items-start gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold uppercase tracking-wide text-indigo-600" }, "Student preview"), /* @__PURE__ */ React.createElement("h3", { id: "directions-choice-preview-title", className: "text-base font-black text-slate-900" }, mbDirectionsDraft.choiceBoard.title || "Choose an activity"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-slate-600" }, mbDirectionsDraft.choiceBoard.prompt || "Pick one activity to work on first.")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setShowDirectionsChoicePreview(false), "aria-label": "Close student choice board preview", className: "min-h-10 min-w-10 rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-100" }, /* @__PURE__ */ React.createElement(X, { size: 16, "aria-hidden": "true" }))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2" }, _mbDirectionsChoicePreviewItems.map(({ choice, resource }) => {
    const station = _alloStationStyle(resource.type);
    return /* @__PURE__ */ React.createElement("article", { key: "preview-" + choice.resourceRef, className: "flex min-h-24 items-start gap-3 rounded-xl border-2 border-indigo-100 bg-white p-3 shadow-sm" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", className: "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xl text-white shadow-sm" }, choice.icon || station.icon || "\u2022"), /* @__PURE__ */ React.createElement("span", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("span", { className: "block text-sm font-black text-slate-800" }, choice.label), /* @__PURE__ */ React.createElement("span", { className: "mt-1 block text-[10px] font-bold uppercase tracking-wide text-indigo-700" }, station.label), choice.description && /* @__PURE__ */ React.createElement("span", { className: "mt-1 block text-xs leading-5 text-slate-600" }, choice.description), /* @__PURE__ */ React.createElement("span", { className: "mt-2 block text-[11px] font-bold text-indigo-700" }, "Open activity ", /* @__PURE__ */ React.createElement(ArrowRight, { size: 12, className: "inline", "aria-hidden": "true" }))));
  })), /* @__PURE__ */ React.createElement("p", { className: "mt-3 text-[10px] text-slate-500" }, "This preview shows the cards students will see on the directions page."))))), /* @__PURE__ */ React.createElement("div", { className: "border-t border-slate-100 pt-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-slate-600 mb-1" }, t("directions.objectives") || "Goals (auto-check where possible)"), (mbDirectionsDraft?.objectives || []).map((o, oi) => /* @__PURE__ */ React.createElement("div", { key: o.id, className: "flex items-center gap-1.5 mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-bold uppercase rounded px-1 py-0.5 flex-shrink-0 " + (o.kind === "xp" ? "bg-indigo-50 text-indigo-700" : o.kind === "game" ? "bg-emerald-50 text-emerald-700" : o.kind === "manual" ? "bg-slate-100 text-slate-600" : "bg-sky-50 text-sky-700") }, o.kind === "manual" ? t("directions.kind_manual") || "self-check" : o.kind === "visited" ? t("directions.kind_visited") || "opened" : o.kind === "responded" ? t("directions.kind_responded") || "answered" : o.kind === "completed" ? t("directions.kind_completed") || "finished" : o.kind === "time" ? t("directions.kind_time") || "time" : o.kind), /* @__PURE__ */ React.createElement("input", { value: o.label, onChange: (e) => setMbDirectionsDraft((p) => {
    const list = [...p && p.objectives || []];
    list[oi] = { ...list[oi], label: e.target.value };
    return { ...p || {}, objectives: list };
  }), "aria-label": t("directions.objective_label") || "Goal label", className: "flex-1 min-w-0 text-[11px] border border-slate-200 rounded p-1 bg-white text-slate-800" }), o.kind === "xp" && /* @__PURE__ */ React.createElement("input", { type: "number", min: "1", max: "1000", value: o.amount || 25, onChange: (e) => setMbDirectionsDraft((p) => {
    const list = [...p && p.objectives || []];
    const amt = Math.max(1, Math.min(1e3, Number(e.target.value) || 1));
    list[oi] = { ...list[oi], amount: amt };
    return { ...p || {}, objectives: list };
  }), "aria-label": t("directions.xp_amount") || "XP amount", className: "w-14 text-[11px] border border-slate-200 rounded p-1 bg-white text-slate-800 flex-shrink-0" }), o.kind === "time" && /* @__PURE__ */ React.createElement("input", { type: "number", min: "1", max: "240", value: o.minutes || 10, onChange: (e) => setMbDirectionsDraft((p) => {
    const list = [...p && p.objectives || []];
    const mins = Math.max(1, Math.min(240, Number(e.target.value) || 1));
    list[oi] = { ...list[oi], minutes: mins };
    return { ...p || {}, objectives: list };
  }), "aria-label": t("directions.time_minutes") || "Minutes", className: "w-14 text-[11px] border border-slate-200 rounded p-1 bg-white text-slate-800 flex-shrink-0" }), /* @__PURE__ */ React.createElement("button", { onClick: () => setMbDirectionsDraft((p) => ({ ...p || {}, objectives: (p && p.objectives || []).filter((x) => x.id !== o.id) })), "aria-label": t("directions.remove_objective") || "Remove goal", className: "text-slate-400 hover:text-rose-600 p-0.5 flex-shrink-0" }, /* @__PURE__ */ React.createElement(X, { size: 12 })))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 mt-1" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      value: mbDirectionsGoalText,
      onChange: (e) => setMbDirectionsGoalText(e.target.value),
      onKeyDown: (e) => {
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
      onClick: () => {
        if (!mbDirectionsGoalText.trim()) return;
        setMbDirectionsDraft((p) => ({ ...p || {}, objectives: [...p && p.objectives || [], { id: generateUUID(), kind: "manual", label: mbDirectionsGoalText.trim() }] }));
        setMbDirectionsGoalText("");
      },
      disabled: !mbDirectionsGoalText.trim(),
      className: "text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 hover:border-slate-400 rounded px-2 py-1 transition-all disabled:opacity-40 flex-shrink-0"
    },
    "+ ",
    t("directions.goal_add") || "Add"
  )), /* @__PURE__ */ React.createElement("div", { className: "mt-2" }, /* @__PURE__ */ React.createElement("label", { className: "block text-[10px] font-bold text-slate-500 mb-1", htmlFor: "dir-goal-res" }, t("directions.goal_attach") || "Auto-check against a resource"), /* @__PURE__ */ React.createElement(
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
        key: opt.kind + ":" + (opt.gameType || ""),
        onClick: () => setMbDirectionsDraft((p) => ({ ...p || {}, objectives: [...p && p.objectives || [], {
          id: generateUUID(),
          kind: opt.kind,
          label: t(opt.labelKey, { title: _res && _res.title || "" }) || opt.label,
          ...opt.gameType ? { gameType: opt.gameType } : {},
          ...opt.minutes ? { minutes: opt.minutes } : {},
          ...opt.kind === "manual" ? {} : { resourceRef: mbDirectionsGoalRes }
        }] })),
        className: "text-[10px] font-bold rounded-full px-2 py-0.5 border transition-all " + (opt.kind === "game" ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:border-emerald-400" : opt.kind === "manual" ? "text-slate-600 bg-slate-50 border-slate-200 hover:border-slate-400" : "text-sky-700 bg-sky-50 border-sky-200 hover:border-sky-400")
      },
      "+ ",
      opt.label
    )));
  })()), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1 mt-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setMbDirectionsDraft((p) => ({ ...p || {}, objectives: [...p && p.objectives || [], { id: generateUUID(), kind: "xp", amount: 25, label: "Earn 25 XP" }] })), className: "text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:border-indigo-400 rounded-full px-2 py-0.5 transition-all" }, "+ XP")), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400 mt-1" }, t("directions.objectives_note") || "Goals check off on the student's device \u2014 a formative guide, not a grade, and nothing is ever locked."), (mbDirectionsDraft?.objectives || []).length > 0 && /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1.5 mt-1 cursor-pointer select-none" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: mbDirectionsDraft?.softGate === true, onChange: (e) => setMbDirectionsDraft((p) => ({ ...p || {}, softGate: e.target.checked })), className: "w-3.5 h-3.5 accent-amber-600" }), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-slate-600" }, t("directions.soft_gate_label") || "Gently suggest finishing goals before the rest of the pack (a friendly tip \u2014 never a lock)"))), /* @__PURE__ */ React.createElement("button", { "data-help-key": "directions_draft", onClick: deriveDirectionsDraft, disabled: directionsDeriving, className: "w-full flex items-center justify-center gap-2 text-xs font-bold text-indigo-800 hover:text-indigo-900 bg-indigo-50 border border-indigo-300 hover:border-indigo-400 rounded-lg p-2 transition-all disabled:opacity-60" }, /* @__PURE__ */ React.createElement(Sparkles, { size: 13 }), " ", directionsDeriving ? t("directions.drafting") || "Drafting\u2026" : t("directions.draft_for_me") || "Draft for me (from lesson plan + pack)"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement("button", { "data-help-key": "directions_add_pack", onClick: addDirectionsToPack, className: "flex-1 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 border border-emerald-300 hover:border-emerald-400 rounded-lg p-2 transition-all" }, t("directions.add") || "Add to pack"), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowDirectionsComposer(false), className: "text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 transition-all" }, t("common.cancel") || "Cancel")), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400 text-center" }, t("directions.review_note") || "AI drafts are a starting point \u2014 review before adding. You know your students; the AI does not."))));
}

window.AlloModules = window.AlloModules || {};
window.AlloModules.DirectionsComposer = { DirectionsComposerView: DirectionsComposerView };
})();
