/**
 * AlloFlow History Panel Module
 * Auto-generated. Source: view_history_panel_source.jsx
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.HistoryPanel) {
    console.log('[CDN] HistoryPanel already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[HistoryPanel] React not found on window'); return; }

function HistoryPanel(props) {
  const noop = () => null;
  const AlertCircle = window.AlertCircle || noop;
  const ChevronDown = window.ChevronDown || noop;
  const ChevronUp = window.ChevronUp || noop;
  const Cloud = window.Cloud || noop;
  const CloudOff = window.CloudOff || noop;
  const Download = window.Download || noop;
  const Folder = window.Folder || noop;
  const FolderInput = window.FolderInput || noop;
  const FolderOpen = window.FolderOpen || noop;
  const FolderPlus = window.FolderPlus || noop;
  const GripVertical = window.GripVertical || noop;
  const History = window.History || noop;
  const Lock = window.Lock || noop;
  const Maximize = window.Maximize || noop;
  const Minimize = window.Minimize || noop;
  const Pencil = window.Pencil || noop;
  const RefreshCw = window.RefreshCw || noop;
  const Save = window.Save || noop;
  const Settings = window.Settings || noop;
  const Share2 = window.Share2 || noop;
  const Trash2 = window.Trash2 || noop;
  const Upload = window.Upload || noop;
  const X = window.X || noop;
  const {
    activeSidebarTab,
    activeStation,
    activeUnitId,
    addToast,
    cloudSyncStatus,
    editTitle,
    editingId,
    generatedContent,
    getDefaultTitle,
    getFilteredHistory,
    getIconForType,
    handleCancelEdit,
    handleClearHistory,
    handleCreateUnit,
    handleDeleteHistoryItem,
    handleDeleteUnit,
    handleDragEnd,
    handleDragEnter,
    handleDragStart,
    handleLoadProject,
    handleMoveToUnit,
    handleRestoreView,
    handleSaveEdit,
    handleSetIsProjectSettingsOpenToTrue,
    handleSetIsUnitModalOpenToFalse,
    handleSetIsUnitModalOpenToTrue,
    handleSetMovingItemIdToNull,
    handleStartEdit,
    handleToggleIsHistoryMaximized,
    history,
    initiateSaveStudentProject,
    initiateSaveTeacherProject,
    isCloudSyncEnabled,
    isHistoryMaximized,
    isIndependentMode,
    isParentMode,
    isSaveActionPulsing,
    isStorageDisabled,
    isSyncMode,
    isTeacherMode,
    isUnitModalOpen,
    lastSaved,
    moveItem,
    movingItemId,
    newUnitName,
    pendingSync,
    projectFileInputRef,
    sanitizeString,
    setActiveStation,
    setActiveUnitId,
    setEditTitle,
    setIsCommunityCatalogOpen,
    setMovingItemId,
    setNewUnitName,
    setSelHubTab,
    setShowSelHub,
    setShowStemLab,
    setStemLabTab,
    t,
    units,
    activeSelStation = null,
    setActiveSelStation = (() => {
    })
  } = props;
  return /* @__PURE__ */ React.createElement("div", { id: "tour-history-panel", "data-help-key": "history_panel", className: `bg-indigo-900 text-indigo-100 rounded-3xl p-4 shadow-xl shadow-indigo-900/50 flex flex-col shrink-0 transition-all duration-300 ${isHistoryMaximized ? "fixed inset-4 z-[190] h-auto" : !isTeacherMode ? "h-full" : "flex-grow min-h-[500px]"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3 mb-3 shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-sm flex items-center gap-2" }, /* @__PURE__ */ React.createElement(History, { size: 16 }), " ", isTeacherMode ? t("sidebar.resource_pack_history") : t("sidebar.my_resources")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 mt-1 text-[11px] font-medium opacity-80" }, isStorageDisabled ? /* @__PURE__ */ React.createElement("span", { className: "text-red-400 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(AlertCircle, { size: 10 }), " ", t("status.storage_disabled")) : isCloudSyncEnabled ? /* @__PURE__ */ React.createElement(React.Fragment, null, cloudSyncStatus === "syncing" && /* @__PURE__ */ React.createElement("span", { className: "text-indigo-300 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 10, className: "animate-spin" }), " ", t("status.syncing")), cloudSyncStatus === "error" && /* @__PURE__ */ React.createElement("span", { className: "text-red-400 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(AlertCircle, { size: 10 }), " ", t("status.sync_error")), (cloudSyncStatus === "saved" || cloudSyncStatus === "idle") && /* @__PURE__ */ React.createElement("span", { className: "text-green-300 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Cloud, { size: 10 }), " ", t("status.cloud_saved"))) : pendingSync ? /* @__PURE__ */ React.createElement("span", { className: "text-orange-300 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(CloudOff, { size: 10 }), " ", t("status.unsaved")) : lastSaved ? /* @__PURE__ */ React.createElement("span", { className: "text-green-300 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Cloud, { size: 10 }), " ", t("status.autosaved", { time: lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })) : /* @__PURE__ */ React.createElement("span", { className: "text-indigo-300 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 10, className: "animate-spin" }), " ", t("status.syncing")))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.upload_file"),
      type: "file",
      ref: projectFileInputRef,
      onChange: handleLoadProject,
      className: "hidden",
      accept: ".json"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => projectFileInputRef.current.click(),
      className: "p-1.5 rounded hover:bg-indigo-700 text-indigo-200 transition-colors",
      title: t("history.load_project"),
      "aria-label": t("history.load_project"),
      "data-help-key": "history_load_project"
    },
    /* @__PURE__ */ React.createElement(Upload, { size: 14 })
  ), isTeacherMode && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: initiateSaveTeacherProject,
      disabled: history.length === 0,
      className: `p-1.5 rounded hover:bg-indigo-700 text-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isSaveActionPulsing ? "pulse-history shadow-indigo-500/50" : ""}`,
      title: t("history.save_teacher"),
      "aria-label": t("history.save_teacher"),
      "data-help-key": "history_save_teacher"
    },
    /* @__PURE__ */ React.createElement(Save, { size: 14 })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: initiateSaveStudentProject,
      disabled: history.length === 0,
      className: `p-1.5 rounded hover:bg-indigo-700 text-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isSaveActionPulsing ? "pulse-history shadow-indigo-500/50" : ""}`,
      title: isTeacherMode ? t("history.save_student") : t("history.save_work"),
      "aria-label": isTeacherMode ? t("history.save_student") : t("history.save_work"),
      "data-help-key": "history_save_student"
    },
    isTeacherMode ? /* @__PURE__ */ React.createElement(Lock, { size: 14 }) : /* @__PURE__ */ React.createElement(Save, { size: 14 })
  ), isTeacherMode && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSetIsProjectSettingsOpenToTrue,
      className: "p-1.5 rounded hover:bg-indigo-700 text-indigo-200 transition-colors",
      title: t("history.settings"),
      "aria-label": t("history.settings"),
      "data-help-key": "history_settings"
    },
    /* @__PURE__ */ React.createElement(Settings, { size: 14 })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleToggleIsHistoryMaximized,
      className: "p-1.5 rounded hover:bg-indigo-700 text-indigo-200 transition-colors",
      title: isHistoryMaximized ? t("history.minimize") : t("history.maximize"),
      "aria-label": isHistoryMaximized ? t("history.minimize") : t("history.maximize"),
      "data-help-key": "history_max_toggle"
    },
    isHistoryMaximized ? /* @__PURE__ */ React.createElement(Minimize, { size: 14 }) : /* @__PURE__ */ React.createElement(Maximize, { size: 14 })
  ), (isTeacherMode || history.length > 0) && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleClearHistory,
      "data-help-key": "history_clear_button",
      className: "p-1.5 rounded hover:bg-indigo-700 text-indigo-200 transition-colors",
      title: t("history.clear"),
      "aria-label": t("history.clear")
    },
    /* @__PURE__ */ React.createElement(Trash2, { size: 14 })
  ))), isTeacherMode && !isIndependentMode && /* @__PURE__ */ React.createElement("div", { className: "bg-indigo-950/50 p-2 rounded-lg border border-indigo-700/50 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(FolderOpen, { size: 14, className: "text-indigo-600 shrink-0" }), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: activeUnitId,
      "data-help-key": "history_filter_unit_select",
      onChange: (e) => setActiveUnitId(e.target.value),
      className: "flex-grow text-xs bg-indigo-900 border border-indigo-700 text-indigo-100 rounded focus:ring-1 focus:ring-indigo-500 outline-none py-1 px-2",
      "aria-label": t("common.filter_by_unit_aria")
    },
    /* @__PURE__ */ React.createElement("option", { value: "all" }, t("history.filter_all")),
    /* @__PURE__ */ React.createElement("option", { value: "uncategorized" }, t("history.uncategorized")),
    units.map((u) => /* @__PURE__ */ React.createElement("option", { key: u.id, value: u.id }, u.name))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "data-help-key": "history_create_unit_btn",
      onClick: handleSetIsUnitModalOpenToTrue,
      className: "p-1 rounded bg-indigo-700 hover:bg-indigo-600 text-white transition-colors",
      title: t("history.create_unit_tooltip"),
      "aria-label": t("history.create_unit_tooltip")
    },
    /* @__PURE__ */ React.createElement(FolderPlus, { size: 14 })
  ), activeUnitId !== "all" && activeUnitId !== "uncategorized" && /* @__PURE__ */ React.createElement(
    "button",
    {
      "data-help-key": "history_delete_unit_btn",
      onClick: handleDeleteUnit,
      className: "p-1 rounded hover:bg-red-900/50 text-red-400 hover:text-red-300 transition-colors",
      title: t("history.delete_unit_tooltip"),
      "aria-label": t("history.delete_unit_tooltip")
    },
    /* @__PURE__ */ React.createElement(Trash2, { size: 14 })
  )), isUnitModalOpen && /* @__PURE__ */ React.createElement("div", { className: "bg-indigo-800 p-2 rounded-lg border border-indigo-600 animate-in slide-in-from-top-2" }, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] font-bold text-indigo-200 mb-1" }, t("history.new_unit_label")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_new_unit_name"),
      type: "text",
      value: newUnitName,
      "data-help-key": "history_unit_name_input",
      onChange: (e) => setNewUnitName(e.target.value),
      placeholder: t("history.new_unit_placeholder"),
      className: "flex-grow text-xs border border-indigo-600 bg-indigo-900 text-white rounded p-1 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400",
      autoFocus: true,
      onKeyDown: (e) => e.key === "Enter" && handleCreateUnit()
    }
  ), /* @__PURE__ */ React.createElement("button", { "data-help-key": "history_save_unit_btn", onClick: handleCreateUnit, className: "text-xs bg-indigo-600 text-white px-2 rounded hover:bg-indigo-500 border border-indigo-500" }, t("common.save")), /* @__PURE__ */ React.createElement("button", { "data-help-key": "history_cancel_unit_btn", onClick: handleSetIsUnitModalOpenToFalse, className: "text-xs text-indigo-300 hover:text-white px-1" }, t("common.cancel"))))), (() => {
    const stations = JSON.parse(localStorage.getItem("alloflow_stem_stations") || "[]");
    if (stations.length === 0) return null;
    return /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("h4", { className: "text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5" }, "\u{1F4CC} STEM Stations", /* @__PURE__ */ React.createElement("span", { className: "bg-emerald-500/30 text-emerald-200 text-[11px] px-1.5 py-0.5 rounded-full" }, stations.length))), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, stations.map((st) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: st.id,
        onClick: () => {
          setActiveStation(st);
          setShowStemLab(true);
          setStemLabTab && setStemLabTab("explore");
        },
        className: "group flex items-center gap-2 p-2 rounded-lg bg-emerald-900/40 border border-emerald-700/50 hover:bg-emerald-800/60 cursor-pointer transition-all"
      },
      /* @__PURE__ */ React.createElement("div", { className: "p-1.5 rounded-md bg-emerald-800 text-emerald-300 shrink-0" }, "\u{1F52C}"),
      /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-grow" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-emerald-100 truncate" }, st.name), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-emerald-400" }, st.tools.length, " tool", st.tools.length !== 1 ? "s" : "")),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            const updated = stations.filter((s) => s.id !== st.id);
            localStorage.setItem("alloflow_stem_stations", JSON.stringify(updated));
            if (activeStation && activeStation.id === st.id) setActiveStation(null);
            addToast && addToast("Station removed");
          },
          className: "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-red-400 hover:text-red-300 p-1 transition-opacity",
          "aria-label": "Delete station"
        },
        /* @__PURE__ */ React.createElement(X, { size: 12 })
      )
    ))));
  })(), (() => {
    const stations = JSON.parse(localStorage.getItem("alloflow_sel_stations") || "[]");
    if (stations.length === 0) return null;
    return /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("h4", { className: "text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5" }, "\u{1F4CC} SEL Stations", /* @__PURE__ */ React.createElement("span", { className: "bg-pink-500/30 text-pink-200 text-[11px] px-1.5 py-0.5 rounded-full" }, stations.length))), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, stations.map((st) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: st.id,
        onClick: () => {
          setActiveSelStation(st);
          setShowSelHub(true);
          setSelHubTab && setSelHubTab("explore");
        },
        className: "group flex items-center gap-2 p-2 rounded-lg bg-pink-900/40 border border-pink-700/50 hover:bg-pink-800/60 cursor-pointer transition-all"
      },
      /* @__PURE__ */ React.createElement("div", { className: "p-1.5 rounded-md bg-pink-800 text-pink-300 shrink-0" }, "\u{1F496}"),
      /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-grow" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-pink-100 truncate" }, st.name), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-pink-400" }, (st.tools || []).length, " tool", (st.tools || []).length !== 1 ? "s" : "", (st.quests || []).length > 0 ? ` \xB7 ${st.quests.length} quest${st.quests.length !== 1 ? "s" : ""}` : "")),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            const updated = stations.filter((s) => s.id !== st.id);
            localStorage.setItem("alloflow_sel_stations", JSON.stringify(updated));
            if (activeSelStation && activeSelStation.id === st.id) setActiveSelStation(null);
            addToast && addToast("SEL Station removed");
          },
          className: "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-red-400 hover:text-red-300 p-1 transition-opacity",
          "aria-label": `Delete SEL Station ${st.name}`
        },
        /* @__PURE__ */ React.createElement(X, { size: 12 })
      )
    ))));
  })(), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 overflow-y-auto pr-1 custom-scrollbar flex-grow pb-10" }, getFilteredHistory().length === 0 && /* @__PURE__ */ React.createElement("div", { className: "text-center p-4 text-indigo-600 text-xs italic" }, history.length === 0 ? t("history.empty_general") : t("history.empty_unit")), getFilteredHistory().map((item, idx) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: item.id,
      draggable: editingId === null,
      onDragStart: (e) => handleDragStart(e, idx),
      onDragEnter: (e) => handleDragEnter(e, idx),
      onDragOver: (e) => e.preventDefault(),
      onDragEnd: handleDragEnd,
      onClick: () => {
        if (isSyncMode) {
          addToast(t("session.teacher_control_warning"), "info");
          return;
        }
        handleRestoreView(item);
      },
      className: `group flex flex-col p-2 rounded-lg transition-all border ${generatedContent && generatedContent.id === item.id ? "bg-white text-indigo-900 border-white" : "bg-indigo-800/50 border-indigo-700 hover:bg-indigo-800 text-indigo-100"} ${isSyncMode ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 w-full" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "cursor-grab active:cursor-grabbing text-indigo-600 opacity-40 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-white transition-all p-1",
        "data-help-key": "history_item_drag",
        title: t("common.drag_to_reorder")
      },
      /* @__PURE__ */ React.createElement(GripVertical, { size: 14 })
    ), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold opacity-50 w-3.5 text-center group-hover:hidden" }, idx + 1), /* @__PURE__ */ React.createElement("div", { className: `p-1.5 rounded-md shrink-0 ${generatedContent && generatedContent.id === item.id ? "bg-indigo-100 text-indigo-700" : "bg-indigo-900 text-indigo-300"}` }, getIconForType(item.type)), /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-grow" }, editingId === item.id ? /* @__PURE__ */ React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.currentTarget.click();
      }
    }, className: "flex items-center gap-1", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("common.enter_edit_title"),
        type: "text",
        value: editTitle,
        onChange: (e) => setEditTitle(e.target.value),
        className: "w-full text-xs text-indigo-900 p-1 rounded border border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none",
        autoFocus: true
      }
    ), /* @__PURE__ */ React.createElement("button", { onClick: (e) => handleSaveEdit(e), className: "p-1 text-green-600 hover:bg-green-100 rounded", "aria-label": t("common.save") }, /* @__PURE__ */ React.createElement(Save, { size: 12 })), /* @__PURE__ */ React.createElement("button", { onClick: (e) => handleCancelEdit(e), className: "p-1 text-red-500 hover:bg-red-100 rounded", "aria-label": t("common.cancel") }, /* @__PURE__ */ React.createElement(X, { size: 12 }))) : /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center w-full gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "truncate" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "text-xs font-bold truncate capitalize",
        title: isTeacherMode && !isIndependentMode ? String(item.title || getDefaultTitle(item.type)) : sanitizeString(item.title || getDefaultTitle(item.type))
      },
      isTeacherMode && !isIndependentMode ? String(item.title || getDefaultTitle(item.type)) : sanitizeString(item.title || getDefaultTitle(item.type))
    ), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] truncate opacity-70 flex items-center gap-1" }, item.unitId && units.find((u) => u.id === item.unitId) && /* @__PURE__ */ React.createElement("span", { className: "bg-indigo-900 px-1 rounded text-indigo-300 border border-indigo-700 flex items-center gap-0.5" }, /* @__PURE__ */ React.createElement(Folder, { size: 8 }), " ", units.find((u) => u.id === item.unitId).name), /* @__PURE__ */ React.createElement("span", null, isTeacherMode && !isIndependentMode ? String(item.meta || "") : sanitizeString(item.meta))), item.type === "word-sounds" && item.configSummary && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-indigo-400 mt-0.5 truncate flex items-center gap-1", title: item.configSummary }, /* @__PURE__ */ React.createElement("span", { className: "px-1 bg-violet-900/50 rounded border border-violet-700/50" }, "\u{1F4CB} ", item.configSummary))), isTeacherMode && /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": t("common.edit"),
        "data-help-key": "history_rename_btn",
        onClick: (e) => handleStartEdit(e, item),
        className: `p-1 rounded hover:bg-indigo-100 hover:text-indigo-700 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity ${generatedContent && generatedContent.id === item.id ? "text-indigo-600" : "text-indigo-600"}`,
        title: t("actions.rename")
      },
      /* @__PURE__ */ React.createElement(Pencil, { size: 10 })
    )))),
    isTeacherMode && /* @__PURE__ */ React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.currentTarget.click();
      }
    }, className: "flex items-center justify-between mt-2 pt-2 border-t border-indigo-800/30", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 relative" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": t("common.collapse"),
        "data-help-key": "history_move_up_btn",
        onClick: (e) => moveItem(e, idx, "up"),
        disabled: idx === 0,
        className: "p-1 rounded hover:bg-indigo-700 disabled:opacity-30 transition-colors text-indigo-300 focus:ring-2 focus:ring-indigo-400 outline-none",
        title: t("actions.move_up")
      },
      /* @__PURE__ */ React.createElement(ChevronUp, { size: 12 })
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": t("common.expand"),
        "data-help-key": "history_move_down_btn",
        onClick: (e) => moveItem(e, idx, "down"),
        disabled: idx === history.length - 1,
        className: "p-1 rounded hover:bg-indigo-700 disabled:opacity-30 transition-colors text-indigo-300 focus:ring-2 focus:ring-indigo-400 outline-none",
        title: t("actions.move_down")
      },
      /* @__PURE__ */ React.createElement(ChevronDown, { size: 12 })
    ), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        "data-help-key": "history_move_to_unit_btn",
        onClick: () => setMovingItemId(movingItemId === item.id ? null : item.id),
        className: `p-1 rounded hover:bg-indigo-700 text-indigo-300 transition-colors ${item.unitId ? "text-yellow-400" : ""}`,
        title: t("history.tooltips.move_to_unit")
      },
      /* @__PURE__ */ React.createElement(FolderInput, { size: 12 })
    ), movingItemId === item.id && /* @__PURE__ */ React.createElement("div", { className: "absolute left-0 top-6 z-[100] bg-white shadow-xl border border-indigo-200 rounded-lg p-1 w-40 animate-in fade-in zoom-in-95 origin-top-left" }, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider px-2 py-1" }, t("history.move_to_label")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-0.5 max-h-32 overflow-y-auto custom-scrollbar" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => handleMoveToUnit(item.id, "uncategorized"),
        className: `text-[11px] text-left px-2 py-1.5 rounded hover:bg-indigo-50 text-slate-700 w-full truncate ${!item.unitId ? "bg-indigo-50 font-bold text-indigo-700" : ""}`
      },
      t("history.uncategorized")
    ), units.map((u) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: u.id,
        onClick: () => handleMoveToUnit(item.id, u.id),
        className: `text-[11px] text-left px-2 py-1.5 rounded hover:bg-indigo-50 text-slate-700 w-full truncate ${item.unitId === u.id ? "bg-indigo-50 font-bold text-indigo-700" : ""}`
      },
      u.name
    )), units.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600 px-2 py-1 italic" }, t("history.no_units")))), movingItemId === item.id && /* @__PURE__ */ React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: (e) => {
      if (e.key === "Escape") e.currentTarget.click();
    }, className: "fixed inset-0 z-[90]", onClick: handleSetMovingItemIdToNull }))), item.type === "word-sounds" && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          const words = item.data || [];
          const config = item.lessonPlanConfig || {};
          const lines = [
            "Date,Resource,Word,Activity,TotalWords",
            ...words.map((w) => {
              const word = w.targetWord || w.word || w.displayWord || "";
              return `${new Date(item.timestamp).toLocaleDateString()},${item.title || "Word Sounds"},${word},,${words.length}`;
            })
          ];
          if (item.configSummary) {
            lines.unshift("# Config: " + item.configSummary);
          }
          const csv = lines.join("\n");
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `word-sounds-${new Date(item.timestamp).toISOString().split("T")[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          addToast && addToast("CSV downloaded for RTI progress monitoring", "success");
        },
        className: "p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30 rounded transition-colors flex items-center gap-1 text-[11px]",
        title: t("common.export_csv_for_rti")
      },
      /* @__PURE__ */ React.createElement(Download, { size: 12 }),
      " CSV"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": "Share to AlloFlow community catalog",
        onClick: (e) => {
          e.stopPropagation();
          try {
            localStorage.setItem("alloflow_pending_submission", JSON.stringify({
              title: item.title || "",
              source_type: item.type || "",
              payload: { id: item.id, type: item.type, title: item.title, timestamp: item.timestamp, data: item.data, meta: item.meta }
            }));
            setIsCommunityCatalogOpen(true);
          } catch (err) {
            addToast && addToast("Could not open submission form: " + (err && err.message), "error");
          }
        },
        className: "p-1 text-indigo-300 hover:text-emerald-300 hover:bg-indigo-900/50 rounded transition-colors flex items-center gap-1 text-[11px]",
        title: "Share this lesson to the AlloFlow community catalog (opens the in-canvas Submit form prefilled)"
      },
      /* @__PURE__ */ React.createElement(Share2, { size: 12 }),
      " Share"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": t("common.delete"),
        onClick: (e) => handleDeleteHistoryItem(e, item.id),
        className: "p-1 text-indigo-300 hover:text-red-300 hover:bg-indigo-900/50 rounded transition-colors flex items-center gap-1 text-[11px]",
        title: t("history.tooltips.remove_item"),
        "data-help-key": "resource_delete_button"
      },
      /* @__PURE__ */ React.createElement(Trash2, { size: 12 }),
      " ",
      t("actions.remove")
    )),
    (isParentMode || isIndependentMode) && !isTeacherMode && /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-end mt-2 pt-2 border-t border-indigo-800/30", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": "Share to AlloFlow community catalog",
        onClick: (e) => {
          e.stopPropagation();
          try {
            localStorage.setItem("alloflow_pending_submission", JSON.stringify({
              title: item.title || "",
              source_type: item.type || "",
              payload: { id: item.id, type: item.type, title: item.title, timestamp: item.timestamp, data: item.data, meta: item.meta }
            }));
            setIsCommunityCatalogOpen(true);
          } catch (err) {
            addToast && addToast("Could not open submission form: " + (err && err.message), "error");
          }
        },
        className: "p-1 text-indigo-300 hover:text-emerald-300 hover:bg-indigo-900/50 rounded transition-colors flex items-center gap-1 text-[11px]",
        title: "Share this lesson to the AlloFlow community catalog (opens the in-canvas Submit form prefilled)"
      },
      /* @__PURE__ */ React.createElement(Share2, { size: 12 }),
      " Share"
    ))
  ))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.HistoryPanel = { HistoryPanel: HistoryPanel };
  console.log('[CDN] HistoryPanel loaded');
})();
