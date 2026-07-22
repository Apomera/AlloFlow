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
  const Search = window.Search || noop;
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
    isCanvas = false,
    canvasRecoverySaveStatus = "inactive",
    canvasRecoverySnapshotCount = 0,
    onOpenDeviceRecovery = (() => {
    }),
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
    onVisualizeUnit,
    activeSelStation = null,
    setActiveSelStation = (() => {
    })
  } = props;
  const shareResourcePackToCommunity = () => {
    const visibleItems = (typeof getFilteredHistory === "function" ? getFilteredHistory() : history) || [];
    if (visibleItems.length === 0) {
      addToast && addToast(t("history.empty_general") || "No resources to share yet.", "info");
      return;
    }
    const activeUnit = Array.isArray(units) ? units.find((u) => u.id === activeUnitId) : null;
    const packTitle = activeUnit && activeUnitId !== "all" && activeUnitId !== "uncategorized" ? activeUnit.name : isTeacherMode ? "AlloFlow resource pack" : "My AlloFlow resources";
    const sanitizeForCloud = typeof window !== "undefined" && typeof window.sanitizeHistoryForCloud === "function" ? window.sanitizeHistoryForCloud : null;
    const stripU = typeof window !== "undefined" && typeof window.stripUndefined === "function" ? window.stripUndefined : ((x) => x);
    if (!sanitizeForCloud) {
      addToast && addToast(t("history.share_pack_not_ready") || "Sharing is still warming up \u2014 try again in a moment.", "info");
      return;
    }
    try {
      const cleanedItems = stripU(sanitizeForCloud(visibleItems.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        timestamp: item.timestamp,
        data: item.data,
        meta: item.meta
      }))));
      localStorage.setItem("alloflow_pending_submission", JSON.stringify({
        title: packTitle,
        source_type: "resource-pack",
        payload: {
          type: "resource-pack",
          title: packTitle,
          activeUnitId,
          unitName: activeUnit ? activeUnit.name : null,
          itemCount: visibleItems.length,
          // Media/audio were stripped by the sanitizer above; catalog UIs
          // should disclose this rather than implying full-fidelity resources.
          mediaStripped: true,
          items: cleanedItems
        }
      }));
      setIsCommunityCatalogOpen(true);
    } catch (err) {
      addToast && addToast("Could not open submission form: " + (err && err.message), "error");
    }
  };
  const [resourceSearch, setResourceSearch] = React.useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = React.useState("all");
  const [isMoreActionsOpen, setIsMoreActionsOpen] = React.useState(false);
  const unitFilteredHistory = (typeof getFilteredHistory === "function" ? getFilteredHistory() : history) || [];
  const getResourceTypeLabel = (type) => String(type || "resource").replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const resourceTypes = Array.from(new Set(unitFilteredHistory.map((item) => item && item.type).filter(Boolean))).sort((a, b) => getResourceTypeLabel(a).localeCompare(getResourceTypeLabel(b)));
  const displayedResourceTypes = resourceTypeFilter !== "all" && !resourceTypes.includes(resourceTypeFilter) ? [resourceTypeFilter, ...resourceTypes] : resourceTypes;
  const normalizedResourceSearch = resourceSearch.trim().toLocaleLowerCase();
  const isResourceFilterActive = normalizedResourceSearch.length > 0 || resourceTypeFilter !== "all";
  const filteredHistory = unitFilteredHistory.filter((item) => {
    if (!item) return false;
    if (resourceTypeFilter !== "all" && item.type !== resourceTypeFilter) return false;
    if (!normalizedResourceSearch) return true;
    const itemTitle = String(item.title || getDefaultTitle(item.type) || "");
    const itemMeta = typeof item.meta === "string" ? item.meta : "";
    return [itemTitle, itemMeta, item.type, getResourceTypeLabel(item.type)].join(" ").toLocaleLowerCase().includes(normalizedResourceSearch);
  });
  const canReorderResources = !isSyncMode && !isResourceFilterActive;
  const clearResourceFilters = () => {
    setResourceSearch("");
    setResourceTypeFilter("all");
  };
  return /* @__PURE__ */ React.createElement("div", { id: "tour-history-panel", "data-help-key": "history_panel", className: `bg-indigo-900 text-indigo-100 rounded-3xl p-4 shadow-xl shadow-indigo-900/50 flex flex-col shrink-0 transition-all duration-300 ${isHistoryMaximized ? "fixed inset-4 z-[190] h-auto" : !isTeacherMode ? "h-full" : "flex-grow min-h-[500px]"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3 mb-3 shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-sm flex items-center gap-2" }, /* @__PURE__ */ React.createElement(History, { size: 16 }), " ", isTeacherMode ? t("sidebar.resource_pack_history") : t("sidebar.my_resources"), /* @__PURE__ */ React.createElement(
    "span",
    {
      className: "rounded-full bg-indigo-700/80 px-2 py-0.5 text-[11px] font-bold text-indigo-100",
      "aria-live": "polite",
      "aria-label": isResourceFilterActive ? filteredHistory.length + " of " + unitFilteredHistory.length + " resources visible" : unitFilteredHistory.length + " resources"
    },
    isResourceFilterActive ? filteredHistory.length + " of " + unitFilteredHistory.length : unitFilteredHistory.length
  )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 mt-1 text-[11px] font-medium opacity-80" }, isCanvas && canvasRecoverySaveStatus === "inactive" ? /* @__PURE__ */ React.createElement("span", { className: "flex min-h-11 items-center gap-1 text-indigo-200" }, "Live-session device recovery is off") : isCanvas ? /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: onOpenDeviceRecovery,
      className: "flex min-h-11 items-center gap-1 rounded-lg px-2 text-left transition-colors hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white " + (canvasRecoverySaveStatus === "error" ? "text-red-200" : canvasRecoverySaveStatus === "saved" ? "text-green-300" : "text-indigo-200"),
      title: String(canvasRecoverySnapshotCount) + " saved " + (canvasRecoverySnapshotCount === 1 ? "workspace" : "workspaces") + " on this device. Open saved work manager.",
      "aria-label": (canvasRecoverySaveStatus === "error" ? "Device save needs attention" : canvasRecoverySaveStatus === "idle" ? "Current workspace is not saved yet" : lastSaved ? "Saved on this device at " + lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "On-device saved work") + ". Open saved work manager.",
      "data-help-key": "history_device_storage"
    },
    canvasRecoverySaveStatus === "checking" || canvasRecoverySaveStatus === "saving" || canvasRecoverySaveStatus === "restoring" ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 10, className: "animate-spin", "aria-hidden": "true" }) : canvasRecoverySaveStatus === "error" ? /* @__PURE__ */ React.createElement(AlertCircle, { size: 10, "aria-hidden": "true" }) : /* @__PURE__ */ React.createElement(Save, { size: 10, "aria-hidden": "true" }),
    /* @__PURE__ */ React.createElement("span", null, canvasRecoverySaveStatus === "checking" ? "Checking saved work\u2026" : canvasRecoverySaveStatus === "saving" ? "Saving on this device\u2026" : canvasRecoverySaveStatus === "restoring" ? "Restoring saved work\u2026" : canvasRecoverySaveStatus === "error" ? "Device save needs attention" : canvasRecoverySaveStatus === "idle" ? canvasRecoverySnapshotCount > 0 ? "Current workspace not saved yet" : "Not saved on this device yet" : lastSaved ? "Saved on this device \xB7 " + lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Saved on this device")
  ) : isStorageDisabled ? /* @__PURE__ */ React.createElement("span", { className: "text-red-200 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(AlertCircle, { size: 10 }), " ", t("status.storage_disabled")) : isCloudSyncEnabled ? /* @__PURE__ */ React.createElement(React.Fragment, null, cloudSyncStatus === "syncing" && /* @__PURE__ */ React.createElement("span", { className: "text-indigo-300 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 10, className: "animate-spin" }), " ", t("status.syncing")), cloudSyncStatus === "error" && /* @__PURE__ */ React.createElement("span", { className: "text-red-200 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(AlertCircle, { size: 10 }), " ", t("status.sync_error")), (cloudSyncStatus === "saved" || cloudSyncStatus === "idle") && /* @__PURE__ */ React.createElement("span", { className: "text-green-300 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Cloud, { size: 10 }), " ", t("status.cloud_saved"))) : pendingSync ? /* @__PURE__ */ React.createElement("span", { className: "text-orange-300 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(CloudOff, { size: 10 }), " ", t("status.unsaved")) : lastSaved ? /* @__PURE__ */ React.createElement("span", { className: "text-green-300 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Cloud, { size: 10 }), " ", t("status.autosaved", { time: lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })) : /* @__PURE__ */ React.createElement("span", { className: "text-indigo-300 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 10, className: "animate-spin" }), " ", t("status.syncing")))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("input", { "aria-label": t("common.upload_file"), type: "file", ref: projectFileInputRef, onChange: handleLoadProject, className: "hidden", accept: ".json" }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => projectFileInputRef.current.click(), className: "min-h-11 min-w-11 p-2 rounded-lg hover:bg-indigo-700 text-indigo-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300", title: t("history.load_project"), "aria-label": t("history.load_project"), "data-help-key": "history_load_project" }, /* @__PURE__ */ React.createElement(Upload, { size: 14, "aria-hidden": "true" })), isTeacherMode && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: initiateSaveTeacherProject, disabled: history.length === 0, className: "min-h-11 min-w-11 p-2 rounded-lg hover:bg-indigo-700 text-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 " + (isSaveActionPulsing ? "pulse-history shadow-indigo-500/50" : ""), title: t("history.save_teacher"), "aria-label": t("history.save_teacher"), "data-help-key": "history_save_teacher" }, /* @__PURE__ */ React.createElement(Save, { size: 14, "aria-hidden": "true" })), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: initiateSaveStudentProject, disabled: history.length === 0, className: "min-h-11 min-w-11 p-2 rounded-lg hover:bg-indigo-700 text-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 " + (isSaveActionPulsing ? "pulse-history shadow-indigo-500/50" : ""), title: isTeacherMode ? t("history.save_student") : t("history.save_work"), "aria-label": isTeacherMode ? t("history.save_student") : t("history.save_work"), "data-help-key": "history_save_student" }, isTeacherMode ? /* @__PURE__ */ React.createElement(Lock, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ React.createElement(Save, { size: 14, "aria-hidden": "true" })), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleToggleIsHistoryMaximized, className: "min-h-11 min-w-11 p-2 rounded-lg hover:bg-indigo-700 text-indigo-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300", title: isHistoryMaximized ? t("history.minimize") : t("history.maximize"), "aria-label": isHistoryMaximized ? t("history.minimize") : t("history.maximize"), "data-help-key": "history_max_toggle" }, isHistoryMaximized ? /* @__PURE__ */ React.createElement(Minimize, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ React.createElement(Maximize, { size: 14, "aria-hidden": "true" })), /* @__PURE__ */ React.createElement("div", { className: "relative", onKeyDown: (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      setIsMoreActionsOpen(false);
    }
  } }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setIsMoreActionsOpen((open) => !open), className: "min-h-11 rounded-lg px-2.5 text-[11px] font-bold text-indigo-100 hover:bg-indigo-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300", "aria-label": "More resource pack actions", "aria-expanded": isMoreActionsOpen, "aria-controls": "history-more-actions-menu" }, "More"), isMoreActionsOpen && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { type: "button", tabIndex: -1, "aria-label": "Close more resource pack actions", className: "fixed inset-0 z-[80] cursor-default bg-transparent", onClick: () => setIsMoreActionsOpen(false) }), /* @__PURE__ */ React.createElement("div", { id: "history-more-actions-menu", role: "menu", "aria-label": "More resource pack actions", className: "absolute right-0 top-full z-[90] mt-1 w-56 rounded-xl border border-indigo-600 bg-indigo-950 p-1.5 shadow-2xl" }, /* @__PURE__ */ React.createElement("button", { type: "button", role: "menuitem", onClick: () => {
    setIsMoreActionsOpen(false);
    shareResourcePackToCommunity();
  }, disabled: history.length === 0, className: "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-indigo-100 hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50", "data-help-key": "history_share_pack" }, /* @__PURE__ */ React.createElement(Share2, { size: 15, "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("span", null, "Share resource pack")), isTeacherMode && /* @__PURE__ */ React.createElement("button", { type: "button", role: "menuitem", onClick: () => {
    setIsMoreActionsOpen(false);
    handleSetIsProjectSettingsOpenToTrue();
  }, className: "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-indigo-100 hover:bg-indigo-800", "data-help-key": "history_settings" }, /* @__PURE__ */ React.createElement(Settings, { size: 15, "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("span", null, t("history.settings"))), (isTeacherMode || history.length > 0) && /* @__PURE__ */ React.createElement("button", { type: "button", role: "menuitem", onClick: () => {
    setIsMoreActionsOpen(false);
    handleClearHistory();
  }, className: "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-200 hover:bg-red-950/70", "data-help-key": "history_clear_button" }, /* @__PURE__ */ React.createElement(Trash2, { size: 15, "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("span", null, t("history.clear")))))))), isTeacherMode && !isIndependentMode && /* @__PURE__ */ React.createElement("div", { className: "bg-indigo-950/50 p-2 rounded-lg border border-indigo-700/50 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(FolderOpen, { size: 14, className: "text-indigo-300 shrink-0" }), /* @__PURE__ */ React.createElement(
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
  ), activeUnitId !== "all" && activeUnitId !== "uncategorized" && typeof onVisualizeUnit === "function" && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => onVisualizeUnit(activeUnitId),
      className: "p-1 rounded bg-amber-700/40 hover:bg-amber-600 text-amber-200 hover:text-white transition-colors",
      title: t("history.visualize_unit_tooltip") || "Visualize this unit in Throughline",
      "aria-label": t("history.visualize_unit_tooltip") || "Visualize this unit in Throughline"
    },
    /* @__PURE__ */ React.createElement("span", { style: { fontSize: "13px", lineHeight: 1 } }, "\u{1F9ED}")
  ), activeUnitId !== "all" && activeUnitId !== "uncategorized" && /* @__PURE__ */ React.createElement(
    "button",
    {
      "data-help-key": "history_delete_unit_btn",
      onClick: handleDeleteUnit,
      className: "p-1 rounded hover:bg-red-900/50 text-red-600 hover:text-red-300 transition-colors",
      title: t("history.delete_unit_tooltip"),
      "aria-label": t("history.delete_unit_tooltip")
    },
    /* @__PURE__ */ React.createElement(Trash2, { size: 14 })
  )), (unitFilteredHistory.length >= 6 || isResourceFilterActive) && /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 rounded-xl border border-indigo-700/70 bg-indigo-950/40 p-2", role: "search", "aria-label": "Find resources in this pack" }, /* @__PURE__ */ React.createElement("div", { className: "relative min-w-[150px] flex-1" }, /* @__PURE__ */ React.createElement(Search, { size: 14, "aria-hidden": "true", className: "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-300" }), /* @__PURE__ */ React.createElement("input", { type: "search", value: resourceSearch, onChange: (e) => setResourceSearch(e.target.value), placeholder: "Search resources", "aria-label": "Search resources by title or type", className: "min-h-11 w-full rounded-lg border border-indigo-700 bg-indigo-900 py-2 pl-8 pr-9 text-xs text-white placeholder:text-indigo-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400" }), resourceSearch && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setResourceSearch(""), "aria-label": "Clear resource search", className: "absolute right-0 top-0 min-h-11 min-w-11 rounded-lg text-indigo-300 hover:bg-indigo-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300" }, /* @__PURE__ */ React.createElement(X, { size: 14, className: "mx-auto", "aria-hidden": "true" }))), /* @__PURE__ */ React.createElement("select", { value: resourceTypeFilter, onChange: (e) => setResourceTypeFilter(e.target.value), "aria-label": "Filter resources by type", className: "min-h-11 min-w-[120px] flex-1 rounded-lg border border-indigo-700 bg-indigo-900 px-2 text-xs text-indigo-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus-visible:ring-indigo-400" }, /* @__PURE__ */ React.createElement("option", { value: "all" }, "All types"), displayedResourceTypes.map((type) => /* @__PURE__ */ React.createElement("option", { key: type, value: type }, getResourceTypeLabel(type)))), isResourceFilterActive && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: clearResourceFilters, className: "min-h-11 rounded-lg px-3 text-xs font-bold text-indigo-100 hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300" }, "Clear filters"), isResourceFilterActive && /* @__PURE__ */ React.createElement("p", { className: "w-full text-[11px] text-indigo-200", role: "status" }, "Showing ", filteredHistory.length, " of ", unitFilteredHistory.length, ". Clear filters to reorder resources.")), isUnitModalOpen && /* @__PURE__ */ React.createElement("div", { className: "bg-indigo-800 p-2 rounded-lg border border-indigo-600 animate-in slide-in-from-top-2" }, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] font-bold text-indigo-200 mb-1" }, t("history.new_unit_label")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
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
      /* @__PURE__ */ React.createElement("div", { className: "p-1.5 rounded-md bg-emerald-800 text-emerald-700 shrink-0" }, "\u{1F52C}"),
      /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-grow" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-emerald-100 truncate" }, st.name), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-emerald-300" }, st.tools.length, " tool", st.tools.length !== 1 ? "s" : "")),
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
          className: "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-red-600 hover:text-red-300 p-1 transition-opacity",
          "aria-label": t("history.delete_station_aria") || "Delete station"
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
      /* @__PURE__ */ React.createElement("div", { className: "p-1.5 rounded-md bg-pink-800 text-pink-700 shrink-0" }, "\u{1F496}"),
      /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-grow" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-pink-100 truncate" }, st.name), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-pink-300" }, (st.tools || []).length, " tool", (st.tools || []).length !== 1 ? "s" : "", (st.quests || []).length > 0 ? ` \xB7 ${st.quests.length} quest${st.quests.length !== 1 ? "s" : ""}` : "")),
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
          className: "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-red-600 hover:text-red-300 p-1 transition-opacity",
          "aria-label": `Delete SEL Station ${st.name}`
        },
        /* @__PURE__ */ React.createElement(X, { size: 12 })
      )
    ))));
  })(), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar flex-grow pb-10", role: "list", "aria-label": t("sidebar.resource_pack_history") || "Saved resources" }, filteredHistory.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "text-center p-4 text-indigo-200 text-xs italic" }, history.length === 0 ? t("history.empty_general") : unitFilteredHistory.length === 0 ? t("history.empty_unit") : "No resources match your search and type filters.", isResourceFilterActive && unitFilteredHistory.length > 0 && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: clearResourceFilters, className: "mx-auto mt-3 block min-h-11 rounded-lg px-3 font-bold text-indigo-100 hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300" }, "Clear filters")), filteredHistory.map((item, idx) => {
    const itemTitle = isTeacherMode && !isIndependentMode ? String(item.title || getDefaultTitle(item.type)) : sanitizeString(item.title || getDefaultTitle(item.type));
    const itemMeta = typeof item.meta === "string" ? item.meta.trim() : "";
    const itemUnit = item.unitId ? units.find((u) => u.id === item.unitId) : null;
    const isCurrent = !!(generatedContent && generatedContent.id === item.id);
    const openLabel = t("common.open") || "Open";
    const currentLabel = t("launch_pad.current_language") || "Current";
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: item.id,
        role: "listitem",
        onDragEnter: (e) => canReorderResources && handleDragEnter(e, idx),
        onDragOver: (e) => canReorderResources && e.preventDefault(),
        onDragEnd: handleDragEnd,
        className: `group flex flex-col p-2 rounded-lg transition-all border ${isCurrent ? "bg-white text-indigo-900 border-white" : "bg-indigo-800/50 border-indigo-700 hover:bg-indigo-800 text-indigo-100"} ${isSyncMode ? "cursor-not-allowed opacity-60" : "cursor-default"}`
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-stretch gap-2 w-full" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          draggable: editingId === null && canReorderResources,
          onDragStart: (e) => {
            if (!canReorderResources) {
              e.preventDefault();
              return;
            }
            handleDragStart(e, idx);
          },
          onKeyDown: (e) => {
            if (!e.altKey || !canReorderResources) return;
            if (e.key === "ArrowUp" && idx > 0) {
              e.preventDefault();
              moveItem(e, idx, "up");
            } else if (e.key === "ArrowDown" && idx < filteredHistory.length - 1) {
              e.preventDefault();
              moveItem(e, idx, "down");
            }
          },
          "aria-keyshortcuts": canReorderResources ? "Alt+ArrowUp Alt+ArrowDown" : void 0,
          "aria-disabled": !canReorderResources || editingId === item.id,
          "aria-label": canReorderResources ? (t("common.reorder_list") || "Reorder") + ": " + itemTitle + ". " + (t("history.position") || "Position") + " " + (idx + 1) + " " + (t("common.of") || "of") + " " + filteredHistory.length + ". " + (t("history.keyboard_reorder") || "Use Alt plus Up or Down Arrow to reorder.") : itemTitle + ". Clear search and type filters to reorder resources.",
          className: `min-h-11 min-w-11 rounded-lg flex items-center justify-center gap-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 ${isCurrent ? "text-indigo-500 hover:bg-indigo-100" : "text-indigo-400 hover:bg-indigo-700 hover:text-white"} ${editingId === item.id || !canReorderResources ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing"}`,
          "data-help-key": "history_item_drag",
          title: isResourceFilterActive ? "Clear filters to reorder resources" : t("common.drag_to_reorder")
        },
        /* @__PURE__ */ React.createElement(GripVertical, { size: 14, "aria-hidden": "true" }),
        /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold", "aria-hidden": "true" }, idx + 1)
      ), /* @__PURE__ */ React.createElement("div", { className: `self-center p-1.5 rounded-md shrink-0 ${isCurrent ? "bg-indigo-100 text-indigo-700" : "bg-indigo-900 text-indigo-300"}` }, getIconForType(item.type)), editingId === item.id ? /* @__PURE__ */ React.createElement("div", { className: "flex min-h-11 min-w-0 flex-grow items-center gap-1", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
        "input",
        {
          "aria-label": t("common.enter_edit_title"),
          type: "text",
          value: editTitle,
          onChange: (e) => setEditTitle(e.target.value),
          className: "w-full text-xs text-indigo-900 p-1 rounded border border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none",
          autoFocus: true
        }
      ), /* @__PURE__ */ React.createElement("button", { onClick: (e) => handleSaveEdit(e), className: "p-1 text-green-600 hover:bg-green-100 rounded", "aria-label": t("common.save") }, /* @__PURE__ */ React.createElement(Save, { size: 12 })), /* @__PURE__ */ React.createElement("button", { onClick: (e) => handleCancelEdit(e), className: "p-1 text-red-500 hover:bg-red-100 rounded", "aria-label": t("common.cancel") }, /* @__PURE__ */ React.createElement(X, { size: 12 }))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: (e) => {
            e.stopPropagation();
            if (isCurrent) return;
            if (isSyncMode) {
              addToast(t("session.teacher_control_warning"), "info");
              return;
            }
            handleRestoreView(item);
          },
          className: `min-h-11 min-w-0 flex-grow rounded-lg px-2 py-1.5 text-left flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 ${isCurrent ? "cursor-default bg-indigo-50 text-indigo-900" : "hover:bg-indigo-700 text-indigo-100"} aria-disabled:opacity-60`,
          "aria-label": isCurrent ? `${itemTitle}. ${currentLabel}` : `${openLabel}: ${itemTitle}`,
          "aria-current": isCurrent ? "page" : void 0,
          "aria-disabled": isSyncMode || isCurrent
        },
        /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-grow" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold line-clamp-2 capitalize", title: itemTitle }, itemTitle), (itemUnit || item.fromDA || itemMeta) && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] truncate opacity-70 flex items-center gap-1 mt-0.5" }, itemUnit && /* @__PURE__ */ React.createElement("span", { className: "bg-indigo-900 px-1 rounded text-indigo-300 border border-indigo-700 flex items-center gap-0.5" }, /* @__PURE__ */ React.createElement(Folder, { size: 8 }), " ", itemUnit.name), item.fromDA && /* @__PURE__ */ React.createElement(
          "span",
          {
            className: "bg-violet-100 text-violet-700 border border-violet-300 px-1 rounded font-bold",
            title: typeof item.daItemIndex === "number" ? `Auto-generated by Dynamic Assessment for item ${item.daItemIndex + 1}` : "Auto-generated by Dynamic Assessment"
          },
          "\u{1F52C} DA",
          typeof item.daItemIndex === "number" ? ` \xB7 #${item.daItemIndex + 1}` : ""
        ), itemMeta && /* @__PURE__ */ React.createElement("span", null, isTeacherMode && !isIndependentMode ? itemMeta : sanitizeString(itemMeta))), item.type === "word-sounds" && item.configSummary && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-indigo-400 mt-0.5 truncate flex items-center gap-1", title: item.configSummary }, /* @__PURE__ */ React.createElement("span", { className: "px-1 bg-violet-900/50 rounded border border-violet-700/50" }, "\u{1F4CB} ", item.configSummary))),
        /* @__PURE__ */ React.createElement(
          "span",
          {
            "aria-hidden": "true",
            className: `shrink-0 rounded-md px-2 py-1 text-[11px] font-bold ${isCurrent ? "bg-emerald-100 text-emerald-800" : "bg-indigo-700 text-indigo-100 group-hover:bg-indigo-600"}`
          },
          isCurrent ? currentLabel : openLabel
        )
      ), isTeacherMode && /* @__PURE__ */ React.createElement(
        "button",
        {
          "aria-label": t("common.edit"),
          "data-help-key": "history_rename_btn",
          onClick: (e) => handleStartEdit(e, item),
          className: "min-h-11 min-w-11 self-center p-2 rounded hover:bg-indigo-100 hover:text-indigo-700 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity text-indigo-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300",
          title: t("actions.rename")
        },
        /* @__PURE__ */ React.createElement(Pencil, { size: 10 })
      ))),
      isTeacherMode && /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mt-2 pt-2 border-t border-indigo-800/30", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 relative" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "aria-label": `${t("actions.move_up") || "Move up"}: ${isTeacherMode && !isIndependentMode ? String(item.title || getDefaultTitle(item.type)) : sanitizeString(item.title || getDefaultTitle(item.type))}`,
          "data-help-key": "history_move_up_btn",
          onClick: (e) => moveItem(e, idx, "up"),
          disabled: !canReorderResources || idx === 0,
          className: "min-h-11 min-w-11 p-2 rounded hover:bg-indigo-700 disabled:opacity-30 transition-colors text-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 outline-none",
          title: t("actions.move_up")
        },
        /* @__PURE__ */ React.createElement(ChevronUp, { size: 12 })
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "aria-label": `${t("actions.move_down") || "Move down"}: ${isTeacherMode && !isIndependentMode ? String(item.title || getDefaultTitle(item.type)) : sanitizeString(item.title || getDefaultTitle(item.type))}`,
          "data-help-key": "history_move_down_btn",
          onClick: (e) => moveItem(e, idx, "down"),
          disabled: !canReorderResources || idx === filteredHistory.length - 1,
          className: "min-h-11 min-w-11 p-2 rounded hover:bg-indigo-700 disabled:opacity-30 transition-colors text-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 outline-none",
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
      )), units.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600 px-2 py-1 italic" }, t("history.no_units")))), movingItemId === item.id && /* @__PURE__ */ React.createElement("div", { "aria-hidden": "true", className: "fixed inset-0 z-[90]", onClick: handleSetMovingItemIdToNull }))), item.type === "word-sounds" && /* @__PURE__ */ React.createElement(
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
          className: `p-1 ${generatedContent && generatedContent.id === item.id ? "text-emerald-700" : "text-emerald-300"} hover:text-emerald-300 hover:bg-emerald-900/30 rounded transition-colors flex items-center gap-1 text-[11px]`,
          title: t("common.export_csv_for_rti")
        },
        /* @__PURE__ */ React.createElement(Download, { size: 12 }),
        " CSV"
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
      ))
    );
  })));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.HistoryPanel = { HistoryPanel: HistoryPanel };
  console.log('[CDN] HistoryPanel loaded');
})();
