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

const HistoryThemeFallbackContext = window.React && window.React.createContext ? window.React.createContext({ theme: "light" }) : null;
const HISTORY_PANEL_THEME_CSS = `
  #tour-history-panel.allo-premium-history {
    --rp-shell-start: #ffffff;
    --rp-shell-end: #f8fafc;
    --rp-surface: #ffffff;
    --rp-surface-translucent: rgba(255, 255, 255, 0.78);
    --rp-subtle: #f8fafc;
    --rp-hover: #f1f5f9;
    --rp-border: #e2e8f0;
    --rp-border-strong: #cbd5e1;
    --rp-text: #1e293b;
    --rp-text-strong: #020617;
    --rp-muted: #64748b;
    --rp-faint: #94a3b8;
    --rp-accent: #4338ca;
    --rp-accent-soft: #eef2ff;
    --rp-accent-hover: #e0e7ff;
    --rp-accent-border: #c7d2fe;
    --rp-primary: #4338ca;
    --rp-primary-hover: #3730a3;
    --rp-on-primary: #ffffff;
    --rp-success: #047857;
    --rp-success-soft: #ecfdf5;
    --rp-success-border: #a7f3d0;
    --rp-warning: #b45309;
    --rp-warning-soft: #fffbeb;
    --rp-danger: #b91c1c;
    --rp-danger-soft: #fef2f2;
    --rp-violet: #6d28d9;
    --rp-violet-soft: #f5f3ff;
    --rp-violet-border: #ddd6fe;
    --rp-sel: #be185d;
    --rp-sel-soft: #fdf2f8;
    --rp-focus: #4f46e5;
    --rp-focus-offset: #ffffff;
    --rp-shadow: rgba(15, 23, 42, 0.08);
    --rp-shadow-strong: rgba(15, 23, 42, 0.16);
    color-scheme: light;
  }

  #tour-history-panel[data-history-theme="dark"] {
    --rp-shell-start: #172033;
    --rp-shell-end: #0f172a;
    --rp-surface: #162032;
    --rp-surface-translucent: rgba(22, 32, 50, 0.90);
    --rp-subtle: #111827;
    --rp-hover: #263449;
    --rp-border: #334155;
    --rp-border-strong: #475569;
    --rp-text: #e2e8f0;
    --rp-text-strong: #f8fafc;
    --rp-muted: #cbd5e1;
    --rp-faint: #94a3b8;
    --rp-accent: #a5b4fc;
    --rp-accent-soft: rgba(49, 46, 129, 0.38);
    --rp-accent-hover: rgba(67, 56, 202, 0.48);
    --rp-accent-border: #6366f1;
    --rp-primary: #6366f1;
    --rp-primary-hover: #818cf8;
    --rp-success: #6ee7b7;
    --rp-success-soft: rgba(6, 78, 59, 0.42);
    --rp-success-border: #047857;
    --rp-warning: #fcd34d;
    --rp-warning-soft: rgba(120, 53, 15, 0.36);
    --rp-danger: #fca5a5;
    --rp-danger-soft: rgba(127, 29, 29, 0.38);
    --rp-violet: #ddd6fe;
    --rp-violet-soft: rgba(76, 29, 149, 0.34);
    --rp-violet-border: #7c3aed;
    --rp-sel: #f9a8d4;
    --rp-sel-soft: rgba(131, 24, 67, 0.32);
    --rp-focus: #a5b4fc;
    --rp-focus-offset: #0f172a;
    --rp-shadow: rgba(2, 6, 23, 0.44);
    --rp-shadow-strong: rgba(2, 6, 23, 0.62);
    color-scheme: dark;
  }

  #tour-history-panel[data-history-theme="contrast"] {
    --rp-shell-start: #000000;
    --rp-shell-end: #000000;
    --rp-surface: #000000;
    --rp-surface-translucent: #000000;
    --rp-subtle: #000000;
    --rp-hover: #1a1a00;
    --rp-border: #ffffff;
    --rp-border-strong: #ffff00;
    --rp-text: #ffffff;
    --rp-text-strong: #ffff00;
    --rp-muted: #ffffff;
    --rp-faint: #ffffff;
    --rp-accent: #00ffff;
    --rp-accent-soft: #001a1a;
    --rp-accent-hover: #003333;
    --rp-accent-border: #00ffff;
    --rp-primary: #ffff00;
    --rp-primary-hover: #ffffff;
    --rp-on-primary: #000000;
    --rp-success: #00ff00;
    --rp-success-soft: #001a00;
    --rp-success-border: #00ff00;
    --rp-warning: #ffff00;
    --rp-warning-soft: #1a1a00;
    --rp-danger: #ff6666;
    --rp-danger-soft: #260000;
    --rp-violet: #00ffff;
    --rp-violet-soft: #001a1a;
    --rp-violet-border: #00ffff;
    --rp-sel: #ff99ff;
    --rp-sel-soft: #260026;
    --rp-focus: #ffff00;
    --rp-focus-offset: #000000;
    --rp-shadow: transparent;
    --rp-shadow-strong: transparent;
    color-scheme: dark;
  }

  #tour-history-panel.allo-premium-history {
    background: linear-gradient(180deg, var(--rp-shell-start) 0%, var(--rp-shell-end) 100%) !important;
    border-color: var(--rp-border) !important;
    color: var(--rp-text) !important;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 18px 46px var(--rp-shadow) !important;
  }
  #tour-history-panel[data-history-theme="contrast"] {
    background: #000000 !important;
    border-color: var(--rp-border-strong) !important;
    border-width: 2px !important;
    box-shadow: none !important;
  }
  #tour-history-panel[data-history-theme="contrast"] :where(div, span, p, label, h3, h4, time) {
    color: inherit !important;
  }

  #tour-history-panel .bg-white { background-color: var(--rp-surface) !important; box-shadow: none !important; }
  #tour-history-panel [class~="bg-white/70"] { background-color: var(--rp-surface-translucent) !important; box-shadow: none !important; }
  #tour-history-panel [class~="bg-slate-50/90"] { background-color: var(--rp-subtle) !important; }
  #tour-history-panel .bg-slate-100 { background-color: var(--rp-hover) !important; }
  #tour-history-panel .bg-slate-200 { background-color: var(--rp-border) !important; }
  #tour-history-panel .bg-indigo-50,
  #tour-history-panel [class~="bg-indigo-50/70"],
  #tour-history-panel [class~="bg-indigo-50/80"] { background-color: var(--rp-accent-soft) !important; }
  #tour-history-panel .bg-indigo-100 { background-color: var(--rp-accent-hover) !important; }
  #tour-history-panel .bg-indigo-700 { background-color: var(--rp-primary) !important; }
  #tour-history-panel .bg-emerald-50,
  #tour-history-panel .bg-emerald-100 { background-color: var(--rp-success-soft) !important; }
  #tour-history-panel .bg-violet-50,
  #tour-history-panel .bg-violet-100 { background-color: var(--rp-violet-soft) !important; }
  #tour-history-panel .bg-pink-50 { background-color: var(--rp-sel-soft) !important; }

  #tour-history-panel .text-slate-950,
  #tour-history-panel .text-slate-900 { color: var(--rp-text-strong) !important; }
  #tour-history-panel .text-slate-800,
  #tour-history-panel .text-slate-700 { color: var(--rp-text) !important; }
  #tour-history-panel .text-slate-600,
  #tour-history-panel .text-slate-500 { color: var(--rp-muted) !important; }
  #tour-history-panel .text-slate-400 { color: var(--rp-faint) !important; }
  #tour-history-panel .text-indigo-600,
  #tour-history-panel .text-indigo-700 { color: var(--rp-accent) !important; }
  #tour-history-panel .text-emerald-700,
  #tour-history-panel .text-emerald-800 { color: var(--rp-success) !important; }
  #tour-history-panel .text-amber-700 { color: var(--rp-warning) !important; }
  #tour-history-panel .text-red-700 { color: var(--rp-danger) !important; }
  #tour-history-panel .text-violet-700 { color: var(--rp-violet) !important; }
  #tour-history-panel .text-pink-700 { color: var(--rp-sel) !important; }
  #tour-history-panel .text-white { color: var(--rp-on-primary) !important; }
  #tour-history-panel input::placeholder { color: var(--rp-faint) !important; opacity: 1; }

  #tour-history-panel .border-slate-200 { border-color: var(--rp-border) !important; }
  #tour-history-panel .border-slate-300 { border-color: var(--rp-border-strong) !important; }
  #tour-history-panel .border-indigo-200,
  #tour-history-panel .border-indigo-300 { border-color: var(--rp-accent-border) !important; }
  #tour-history-panel .border-indigo-700 { border-color: var(--rp-primary) !important; }
  #tour-history-panel .border-violet-200,
  #tour-history-panel .border-violet-300 { border-color: var(--rp-violet-border) !important; }
  #tour-history-panel .border-transparent,
  #tour-history-panel .border-l-transparent { border-color: transparent !important; }
  #tour-history-panel .border-l-indigo-600 { border-left-color: var(--rp-accent) !important; }

  #tour-history-panel [class~="hover:bg-slate-50"]:hover,
  #tour-history-panel [class~="hover:bg-slate-50/70"]:hover,
  #tour-history-panel [class~="hover:bg-slate-100"]:hover { background-color: var(--rp-hover) !important; }
  #tour-history-panel [class~="hover:bg-indigo-50"]:hover,
  #tour-history-panel [class~="hover:bg-indigo-100"]:hover { background-color: var(--rp-accent-hover) !important; }
  #tour-history-panel [class~="hover:bg-indigo-800"]:hover { background-color: var(--rp-primary-hover) !important; }
  #tour-history-panel [class~="hover:bg-emerald-50"]:hover,
  #tour-history-panel [class~="hover:bg-emerald-50/60"]:hover { background-color: var(--rp-success-soft) !important; }
  #tour-history-panel [class~="hover:bg-amber-50"]:hover { background-color: var(--rp-warning-soft) !important; }
  #tour-history-panel [class~="hover:bg-red-50"]:hover { background-color: var(--rp-danger-soft) !important; }
  #tour-history-panel [class~="hover:bg-pink-50/60"]:hover { background-color: var(--rp-sel-soft) !important; }
  #tour-history-panel [class~="hover:bg-white"]:hover { background-color: var(--rp-surface) !important; }
  #tour-history-panel [class~="hover:border-slate-300"]:hover,
  #tour-history-panel [class~="hover:border-slate-400"]:hover { border-color: var(--rp-border-strong) !important; }
  #tour-history-panel [class~="hover:border-indigo-200"]:hover { border-color: var(--rp-accent-border) !important; }
  #tour-history-panel [class~="hover:border-emerald-300"]:hover { border-color: var(--rp-success-border) !important; }
  #tour-history-panel [class~="hover:border-pink-300"]:hover { border-color: var(--rp-sel) !important; }
  #tour-history-panel [class~="hover:text-slate-700"]:hover,
  #tour-history-panel [class~="hover:text-slate-800"]:hover,
  #tour-history-panel [class~="hover:text-slate-900"]:hover { color: var(--rp-text-strong) !important; }

  #tour-history-panel button[aria-expanded="true"]:not(.rp-dismiss-layer) {
    background-color: var(--rp-accent-soft) !important;
    border-color: var(--rp-accent-border) !important;
  }
  #tour-history-panel button:disabled,
  #tour-history-panel [aria-disabled="true"] { opacity: 0.58 !important; filter: saturate(0.55); }
  #tour-history-panel .shadow-sm { box-shadow: 0 1px 3px var(--rp-shadow) !important; }
  #tour-history-panel .rp-menu-surface { box-shadow: 0 18px 42px var(--rp-shadow-strong) !important; }
  #tour-history-panel .rp-dismiss-layer {
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
    color: transparent !important;
    padding: 0 !important;
  }

  #tour-history-panel button:focus-visible,
  #tour-history-panel input:focus-visible,
  #tour-history-panel select:focus-visible {
    outline: 3px solid var(--rp-focus) !important;
    outline-offset: 2px !important;
    --tw-ring-color: var(--rp-focus) !important;
    --tw-ring-offset-color: var(--rp-focus-offset) !important;
  }
  #tour-history-panel[data-history-theme="contrast"] button:focus-visible,
  #tour-history-panel[data-history-theme="contrast"] input:focus-visible,
  #tour-history-panel[data-history-theme="contrast"] select:focus-visible {
    outline-width: 4px !important;
    box-shadow: 0 0 0 2px var(--rp-focus-offset) !important;
  }
  #tour-history-panel[data-history-theme="contrast"] .shadow-sm,
  #tour-history-panel[data-history-theme="contrast"] .shadow-xl,
  #tour-history-panel[data-history-theme="contrast"] .shadow-2xl,
  #tour-history-panel[data-history-theme="contrast"] .rp-menu-surface { box-shadow: none !important; }

  @media (forced-colors: active) {
    #tour-history-panel.allo-premium-history {
      --rp-shell-start: Canvas;
      --rp-shell-end: Canvas;
      --rp-surface: Canvas;
      --rp-surface-translucent: Canvas;
      --rp-subtle: Canvas;
      --rp-hover: Highlight;
      --rp-border: CanvasText;
      --rp-border-strong: CanvasText;
      --rp-text: CanvasText;
      --rp-text-strong: CanvasText;
      --rp-muted: CanvasText;
      --rp-faint: GrayText;
      --rp-accent: LinkText;
      --rp-accent-soft: Canvas;
      --rp-accent-hover: Highlight;
      --rp-accent-border: LinkText;
      --rp-primary: Highlight;
      --rp-primary-hover: Highlight;
      --rp-on-primary: HighlightText;
      --rp-success: LinkText;
      --rp-success-soft: Canvas;
      --rp-success-border: LinkText;
      --rp-warning: CanvasText;
      --rp-warning-soft: Canvas;
      --rp-danger: Mark;
      --rp-danger-soft: Canvas;
      --rp-violet: LinkText;
      --rp-violet-soft: Canvas;
      --rp-violet-border: LinkText;
      --rp-sel: LinkText;
      --rp-sel-soft: Canvas;
      --rp-focus: Highlight;
      --rp-focus-offset: Canvas;
      background: Canvas !important;
      border: 2px solid CanvasText !important;
      box-shadow: none !important;
      forced-color-adjust: auto;
    }
    #tour-history-panel [aria-current="page"] { border-left: 4px solid Highlight !important; }
    #tour-history-panel .rp-dismiss-layer { border: 0 !important; background: transparent !important; }
  }

  @media (prefers-reduced-motion: reduce) {
    #tour-history-panel,
    #tour-history-panel * { transition-duration: 0.01ms !important; }
  }
`;
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
  const historyThemeContext = React.useContext(window.AlloThemeContext || HistoryThemeFallbackContext);
  const historyTheme = historyThemeContext && (historyThemeContext.theme === "dark" || historyThemeContext.theme === "contrast") ? historyThemeContext.theme : "light";
  const getInstructionalTextProfile = (item) => {
    const safeField = (value2, field) => {
      try {
        return value2 && typeof value2 === "object" ? value2[field] : void 0;
      } catch (_) {
        return void 0;
      }
    };
    const safeText = (value2, fallback = "", max = 240) => {
      try {
        const candidate = typeof value2 === "string" || typeof value2 === "number" ? String(value2) : "";
        return (candidate || fallback).slice(0, max);
      } catch (_) {
        return fallback;
      }
    };
    const rawConfig = safeField(item, "config");
    const config = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
    const raw = safeField(item, "instructionalText") || safeField(config, "instructionalText") || safeField(item, "textProfile") || safeField(config, "textProfile") || null;
    const itemType = safeText(safeField(item, "type"), "", 100);
    const inferredForm = itemType === "simplified" ? "adapted" : "original";
    let value = raw;
    try {
      const api = window.AlloModules && window.AlloModules.InstructionalContext;
      if (raw && api && typeof api.normalizeInstructionalText === "function") {
        value = api.normalizeInstructionalText(raw, { defaultForm: inferredForm });
      }
    } catch (_) {
      value = raw;
    }
    value = value && typeof value === "object" ? value : {};
    const rawRole = safeField(value, "role");
    const rawForm = safeField(value, "form");
    const role = ["primary", "supplemental", "unspecified"].includes(rawRole) ? rawRole : "unspecified";
    const form = ["original", "same-text-supported", "adapted"].includes(rawForm) ? rawForm : inferredForm;
    const rawAuth = safeField(value, "replacementAuthorization");
    const auth = rawAuth && typeof rawAuth === "object" ? rawAuth : {};
    const authorized = safeField(auth, "authorized") === true && safeField(auth, "source") === "educator";
    const rawComplexity = safeField(value, "complexity");
    const complexity = rawComplexity && typeof rawComplexity === "object" ? rawComplexity : {};
    const rawLocalStats = safeField(item, "localStats");
    const localStats = rawLocalStats && typeof rawLocalStats === "object" ? rawLocalStats : {};
    const sourceArtifactId = safeText(safeField(value, "sourceArtifactId"), "", 240);
    const primaryArtifactId = safeText(safeField(value, "primaryArtifactId"), "", 240);
    const measuredGrade = safeField(complexity, "measuredGrade");
    const localMeasuredGrade = safeField(localStats, "gradeLevel");
    return {
      schemaVersion: 1,
      role,
      form,
      sourceArtifactId: sourceArtifactId || null,
      primaryArtifactId: primaryArtifactId || null,
      designationSource: ["educator", "workflow-default", "legacy-inferred"].includes(safeField(value, "designationSource")) ? safeField(value, "designationSource") : "legacy-inferred",
      replacementAuthorization: { authorized, source: authorized ? "educator" : "none" },
      complexity: {
        requestedGrade: safeText(safeField(complexity, "requestedGrade") || safeField(item, "targetGradeLevel") || safeField(config, "grade"), "", 120),
        calibrationTarget: safeText(safeField(complexity, "calibrationTarget"), "", 120),
        measuredGrade: measuredGrade != null ? typeof measuredGrade === "string" || typeof measuredGrade === "number" ? measuredGrade : null : localMeasuredGrade != null && (typeof localMeasuredGrade === "string" || typeof localMeasuredGrade === "number") ? localMeasuredGrade : null,
        method: safeText(safeField(complexity, "method") || (rawLocalStats ? "flesch-kincaid" : ""), "", 80),
        status: safeText(safeField(complexity, "status"), "", 80),
        contentFingerprint: safeText(safeField(complexity, "contentFingerprint"), "", 240),
        measuredAt: safeText(safeField(complexity, "measuredAt"), "", 120) || null,
        language: safeText(safeField(complexity, "language") || safeField(config, "language"), "", 80)
      },
      explicit: !!raw,
      authorized
    };
  };
  const getInstructionalTextRecord = (item) => {
    const profile = getInstructionalTextProfile(item);
    const itemType = (() => {
      try {
        return item && typeof item === "object" ? item.type : "";
      } catch (_) {
        return "";
      }
    })();
    const isTextArtifact = item && (itemType === "analysis" || itemType === "simplified" || profile.form === "same-text-supported");
    if (!profile.explicit && !isTextArtifact) return void 0;
    return {
      schemaVersion: profile.schemaVersion,
      role: profile.role,
      form: profile.form,
      sourceArtifactId: profile.sourceArtifactId,
      primaryArtifactId: profile.primaryArtifactId,
      designationSource: profile.designationSource,
      replacementAuthorization: profile.replacementAuthorization,
      complexity: profile.complexity
    };
  };
  const getInstructionalTextBadge = (item) => {
    const profile = getInstructionalTextProfile(item);
    const itemType = (() => {
      try {
        return item && typeof item === "object" ? item.type : "";
      } catch (_) {
        return "";
      }
    })();
    const isTextArtifact = item && (itemType === "analysis" || itemType === "simplified" || profile.form === "same-text-supported");
    if (!isTextArtifact && !profile.explicit) return null;
    if (profile.role === "primary") {
      if (profile.form === "adapted" && !profile.authorized) return { label: "Primary designation needs review", tone: "amber" };
      return { label: profile.form === "same-text-supported" ? "Supported primary text" : "Primary text", tone: "blue" };
    }
    if (profile.role === "supplemental") return { label: profile.form === "adapted" ? "Supplemental adapted text" : "Supplemental text", tone: "violet" };
    return { label: "Text role not set", tone: "slate" };
  };
  const shareResourcePackToCommunity = () => {
    let visibleItemsCandidate = history;
    try {
      if (typeof getFilteredHistory === "function") visibleItemsCandidate = getFilteredHistory();
    } catch (_) {
      visibleItemsCandidate = [];
    }
    const visibleItems = getSafeArraySnapshot(visibleItemsCandidate);
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
      const shareProfiles = visibleItems.map((item) => ({ item, profile: getInstructionalTextProfile(item) }));
      const validPrimaryCount = shareProfiles.filter(({ profile }) => profile.role === "primary" && (profile.form !== "adapted" || profile.authorized)).length;
      const supplementalCount = shareProfiles.filter(({ profile }) => profile.role === "supplemental").length;
      const unspecifiedAdaptedCount = shareProfiles.filter(({ profile }) => profile.role === "unspecified" && profile.form === "adapted").length;
      const unauthorizedPrimaryAdaptationCount = shareProfiles.filter(({ profile }) => profile.role === "primary" && profile.form === "adapted" && !profile.authorized).length;
      const textAccessPreflight = {
        schemaVersion: 1,
        primaryCount: validPrimaryCount,
        supplementalCount,
        unspecifiedAdaptedCount,
        supplementalWithoutPrimary: supplementalCount > 0 && validPrimaryCount === 0,
        unspecifiedAdaptedWithoutPrimary: unspecifiedAdaptedCount > 0 && validPrimaryCount === 0,
        unauthorizedPrimaryAdaptationCount,
        advisoryOnly: true
      };
      if (textAccessPreflight.supplementalWithoutPrimary) {
        addToast && addToast("This pack includes a supplemental adapted text but no designated primary text. Confirm that readers will receive the primary text separately.", "warning");
      } else if (textAccessPreflight.unspecifiedAdaptedWithoutPrimary) {
        addToast && addToast("This pack includes an adapted text whose instructional role is not set and no designated primary text. Review the relationship before publishing.", "warning");
      } else if (unauthorizedPrimaryAdaptationCount > 0) {
        addToast && addToast("An adapted text is marked primary without an explicit educator replacement decision. Review its role before publishing.", "warning");
      }
      const cleanedItems = stripU(sanitizeForCloud(visibleItems.map((item) => {
        const rawConfig = getSafeArtifactField(item, "config");
        const config = rawConfig && typeof rawConfig === "object" ? rawConfig : null;
        return {
          id: getSafeArtifactField(item, "id"),
          type: getSafeArtifactField(item, "type"),
          title: getSafeArtifactField(item, "title"),
          timestamp: getSafeArtifactField(item, "timestamp"),
          data: getSafeArtifactField(item, "data"),
          meta: getSafeArtifactField(item, "meta"),
          // Preserve instructional metadata without publishing free-form custom
          // instructions, roster labels, interests, or other potentially
          // identifying configuration fields to the community catalog.
          config: config ? {
            grade: getSafeArtifactField(config, "grade"),
            language: getSafeArtifactField(config, "language"),
            standards: getSafeArtifactField(config, "standards"),
            standardsContext: getSafeArtifactField(config, "standardsContext"),
            instructionalContext: getSafeArtifactField(config, "instructionalContext")
          } : void 0,
          instructionalContext: getSafeArtifactField(item, "instructionalContext") || getSafeArtifactField(config, "instructionalContext"),
          standardsContext: getSafeArtifactField(item, "standardsContext"),
          instructionalText: getInstructionalTextRecord(item),
          localStats: getSafeArtifactField(item, "localStats"),
          targetGradeLevel: getSafeArtifactField(item, "targetGradeLevel")
        };
      })));
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
          textAccessPreflight,
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
  const moreActionsButtonRef = React.useRef(null);
  const moreActionsMenuRef = React.useRef(null);
  const getSafeArtifactField = (item, field) => {
    try {
      return item && typeof item === "object" ? item[field] : void 0;
    } catch (_) {
      return void 0;
    }
  };
  const getSafeArraySnapshot = (value, max = 1e4) => {
    try {
      if (!Array.isArray(value)) return [];
    } catch (_) {
      return [];
    }
    let declaredLength;
    try {
      declaredLength = value.length;
    } catch (_) {
      return [];
    }
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) return [];
    const length = Math.min(declaredLength, max);
    const snapshot = new Array(length);
    for (let index = 0; index < length; index += 1) {
      try {
        snapshot[index] = value[index];
      } catch (_) {
        snapshot[index] = null;
      }
    }
    return snapshot;
  };
  let unitFilteredHistoryCandidate = history;
  try {
    if (typeof getFilteredHistory === "function") unitFilteredHistoryCandidate = getFilteredHistory();
  } catch (_) {
    unitFilteredHistoryCandidate = [];
  }
  const unitFilteredHistory = getSafeArraySnapshot(unitFilteredHistoryCandidate);
  const safeHistory = getSafeArraySnapshot(history);
  const getSafeRowText = (value, fallback = "", max = 240) => {
    const candidate = typeof value === "string" || typeof value === "number" ? String(value) : "";
    const fallbackText = typeof fallback === "string" || typeof fallback === "number" ? String(fallback) : "";
    return (candidate || fallbackText).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
  };
  const getSafeRowDate = (value) => {
    try {
      const candidate = value instanceof Date ? new Date(value.getTime()) : typeof value === "string" || typeof value === "number" ? new Date(value) : null;
      return candidate && Number.isFinite(candidate.getTime()) ? candidate : null;
    } catch (_) {
      return null;
    }
  };
  const getResourceTypeLabel = (type) => {
    let localizedTitle = "";
    try {
      localizedTitle = getDefaultTitle(type);
    } catch (_) {
    }
    const fallback = getSafeRowText(type, "resource", 100).replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    return getSafeRowText(localizedTitle, fallback, 160);
  };
  const resourceTypes = Array.from(new Set(unitFilteredHistory.map((item) => getSafeRowText(getSafeArtifactField(item, "type"), "", 100)).filter(Boolean))).sort((a, b) => getResourceTypeLabel(a).localeCompare(getResourceTypeLabel(b)));
  const displayedResourceTypes = resourceTypeFilter !== "all" && !resourceTypes.includes(resourceTypeFilter) ? [resourceTypeFilter, ...resourceTypes] : resourceTypes;
  const normalizedResourceSearch = resourceSearch.trim().toLocaleLowerCase();
  const isResourceFilterActive = normalizedResourceSearch.length > 0 || resourceTypeFilter !== "all";
  const filteredHistory = unitFilteredHistory.filter((item) => {
    if (!item) return false;
    const itemType = getSafeRowText(getSafeArtifactField(item, "type"), "", 100);
    if (resourceTypeFilter !== "all" && itemType !== resourceTypeFilter) return false;
    if (!normalizedResourceSearch) return true;
    const itemTitle = getSafeRowText(
      getSafeArtifactField(item, "title"),
      getSafeRowText(getDefaultTitle(itemType), "Resource", 240),
      240
    );
    const rawMeta = getSafeArtifactField(item, "meta");
    const itemMeta = typeof rawMeta === "string" ? rawMeta : "";
    return [itemTitle, itemMeta, itemType, getResourceTypeLabel(itemType)].join(" ").toLocaleLowerCase().includes(normalizedResourceSearch);
  });
  const legacyRowIdentityRef = React.useRef({ ids: /* @__PURE__ */ new WeakMap(), sequence: 0 });
  const getPersistedArtifactInstanceId = (item) => {
    try {
      const value = item && typeof item === "object" ? item._artifactInstanceId : "";
      return typeof value === "string" && /^artifact-[A-Za-z0-9_-]{8,128}$/.test(value) ? value : "";
    } catch (_) {
      return "";
    }
  };
  const getSafePublicArtifactId = (item) => {
    try {
      const value = getSafeArtifactField(item, "id");
      return typeof value === "string" || typeof value === "number" ? String(value).slice(0, 240) : "";
    } catch (_) {
      return "";
    }
  };
  const getHistoryRowInstanceId = (item) => {
    const persisted = getPersistedArtifactInstanceId(item);
    if (persisted) return persisted;
    if (!item || typeof item !== "object") return "legacy-row-empty";
    const registry = legacyRowIdentityRef.current;
    let fallback = registry.ids.get(item);
    if (!fallback) {
      registry.sequence += 1;
      fallback = "legacy-row-" + registry.sequence;
      registry.ids.set(item, fallback);
    }
    return fallback;
  };
  const generatedArtifactInstanceId = getPersistedArtifactInstanceId(generatedContent);
  const publicHistoryIdCounts = /* @__PURE__ */ new Map();
  safeHistory.forEach((item) => {
    const publicId = getSafePublicArtifactId(item);
    if (publicId) publicHistoryIdCounts.set(publicId, (publicHistoryIdCounts.get(publicId) || 0) + 1);
  });
  const canReorderResources = !isSyncMode && !isResourceFilterActive;
  const clearResourceFilters = () => {
    setResourceSearch("");
    setResourceTypeFilter("all");
  };
  const focusMoreAction = (edge = "first") => {
    window.requestAnimationFrame(() => {
      const menuItems = moreActionsMenuRef.current ? Array.from(moreActionsMenuRef.current.querySelectorAll('[role="menuitem"]:not(:disabled)')) : [];
      const target = edge === "last" ? menuItems[menuItems.length - 1] : menuItems[0];
      if (target) target.focus();
    });
  };
  const openMoreActions = (edge = "first") => {
    setIsMoreActionsOpen(true);
    focusMoreAction(edge);
  };
  const closeMoreActions = (restoreFocus = false) => {
    setIsMoreActionsOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => {
        if (moreActionsButtonRef.current) moreActionsButtonRef.current.focus();
      });
    }
  };
  const handleMoreActionsMenuKeyDown = (e) => {
    const menuItems = Array.from(e.currentTarget.querySelectorAll('[role="menuitem"]:not(:disabled)'));
    const currentIndex = menuItems.indexOf(document.activeElement);
    let nextIndex = currentIndex;
    if (e.key === "ArrowDown") nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % menuItems.length;
    else if (e.key === "ArrowUp") nextIndex = currentIndex < 0 ? menuItems.length - 1 : (currentIndex - 1 + menuItems.length) % menuItems.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = menuItems.length - 1;
    else if (e.key === "Escape") {
      e.preventDefault();
      closeMoreActions(true);
      return;
    } else if (e.key === "Tab") {
      closeMoreActions(false);
      return;
    } else return;
    e.preventDefault();
    if (menuItems[nextIndex]) menuItems[nextIndex].focus();
  };
  React.useEffect(() => {
    clearResourceFilters();
    setIsMoreActionsOpen(false);
  }, [activeUnitId]);
  return /* @__PURE__ */ React.createElement("div", { id: "tour-history-panel", "data-help-key": "history_panel", "data-history-theme": historyTheme, className: `allo-premium-history bg-white text-slate-900 rounded-2xl p-4 border border-slate-200 shadow-xl shadow-slate-900/5 flex flex-col shrink-0 transition-all duration-300 ${isHistoryMaximized ? "fixed inset-4 z-[190] h-auto" : !isTeacherMode ? "h-full" : "flex-grow min-h-[500px]"}` }, /* @__PURE__ */ React.createElement("style", null, HISTORY_PANEL_THEME_CSS), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3 mb-3 shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-start justify-between gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex min-w-0 flex-col" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-base text-slate-950 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700" }, /* @__PURE__ */ React.createElement(History, { size: 16 })), /* @__PURE__ */ React.createElement("span", { className: "min-w-0 truncate" }, isTeacherMode ? t("sidebar.resource_pack_history") : t("sidebar.my_resources")), /* @__PURE__ */ React.createElement(
    "span",
    {
      className: "rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600",
      "aria-live": "polite",
      "aria-label": isResourceFilterActive ? t("history.resource_count_filtered", { visible: filteredHistory.length, total: unitFilteredHistory.length }) : t("history.resource_count", { count: unitFilteredHistory.length })
    },
    isResourceFilterActive ? filteredHistory.length + " of " + unitFilteredHistory.length : unitFilteredHistory.length
  )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 mt-1 pl-10 text-xs font-medium text-slate-500" }, isCanvas && canvasRecoverySaveStatus === "inactive" ? /* @__PURE__ */ React.createElement("span", { className: "flex min-h-11 items-center gap-1 text-slate-500" }, "Live-session device recovery is off") : isCanvas ? /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: onOpenDeviceRecovery,
      className: "flex min-h-11 items-center gap-1 rounded-lg px-2 text-left transition-colors hover:bg-slate-100 " + (canvasRecoverySaveStatus === "error" ? "text-red-700" : canvasRecoverySaveStatus === "locked" ? "text-amber-700" : canvasRecoverySaveStatus === "saved" ? "text-emerald-700" : "text-slate-500"),
      title: canvasRecoverySaveStatus === "locked" ? "Protected recovery workspaces are locked in this tab. Open the manager to unlock." : String(canvasRecoverySnapshotCount) + " saved " + (canvasRecoverySnapshotCount === 1 ? "workspace" : "workspaces") + " on this device. Open saved work manager.",
      "aria-label": (canvasRecoverySaveStatus === "error" ? "Device save needs attention" : canvasRecoverySaveStatus === "locked" ? "Protected recovery workspaces locked, " + canvasRecoverySnapshotCount + " workspaces" : canvasRecoverySaveStatus === "idle" ? "Current workspace is not saved yet" : lastSaved ? "Saved on this device at " + lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "On-device saved work") + ". Open saved work manager.",
      "data-help-key": "history_device_storage"
    },
    canvasRecoverySaveStatus === "checking" || canvasRecoverySaveStatus === "saving" || canvasRecoverySaveStatus === "restoring" ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 10, className: "animate-spin", "aria-hidden": "true" }) : canvasRecoverySaveStatus === "error" ? /* @__PURE__ */ React.createElement(AlertCircle, { size: 10, "aria-hidden": "true" }) : canvasRecoverySaveStatus === "locked" ? /* @__PURE__ */ React.createElement(Lock, { size: 10, "aria-hidden": "true" }) : /* @__PURE__ */ React.createElement(Save, { size: 10, "aria-hidden": "true" }),
    /* @__PURE__ */ React.createElement("span", null, canvasRecoverySaveStatus === "checking" ? "Checking saved work\u2026" : canvasRecoverySaveStatus === "saving" ? "Saving on this device\u2026" : canvasRecoverySaveStatus === "restoring" ? "Restoring saved work\u2026" : canvasRecoverySaveStatus === "error" ? "Device save needs attention" : canvasRecoverySaveStatus === "locked" ? "Protected recovery workspaces locked \xB7 " + canvasRecoverySnapshotCount + (canvasRecoverySnapshotCount === 1 ? " workspace" : " workspaces") : canvasRecoverySaveStatus === "idle" ? canvasRecoverySnapshotCount > 0 ? "Current workspace not saved yet" : "Not saved on this device yet" : lastSaved ? "Saved on this device \xB7 " + lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Saved on this device")
  ) : isStorageDisabled ? /* @__PURE__ */ React.createElement("span", { className: "text-red-700 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(AlertCircle, { size: 10 }), " ", t("status.storage_disabled")) : isCloudSyncEnabled ? /* @__PURE__ */ React.createElement(React.Fragment, null, cloudSyncStatus === "syncing" && /* @__PURE__ */ React.createElement("span", { className: "text-slate-500 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 10, className: "animate-spin" }), " ", t("status.syncing")), cloudSyncStatus === "error" && /* @__PURE__ */ React.createElement("span", { className: "text-red-700 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(AlertCircle, { size: 10 }), " ", t("status.sync_error")), (cloudSyncStatus === "saved" || cloudSyncStatus === "idle") && /* @__PURE__ */ React.createElement("span", { className: "text-emerald-700 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Cloud, { size: 10 }), " ", t("status.cloud_saved"))) : pendingSync ? /* @__PURE__ */ React.createElement("span", { className: "text-amber-700 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(CloudOff, { size: 10 }), " ", t("status.unsaved")) : lastSaved ? /* @__PURE__ */ React.createElement("span", { className: "text-emerald-700 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Cloud, { size: 10 }), " ", t("status.autosaved", { time: lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })) : /* @__PURE__ */ React.createElement("span", { className: "text-slate-500 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 10, className: "animate-spin" }), " ", t("status.syncing")))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("input", { "aria-label": t("common.upload_file"), type: "file", ref: projectFileInputRef, onChange: handleLoadProject, className: "hidden", accept: ".json" }), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      ref: moreActionsButtonRef,
      type: "button",
      onClick: () => isMoreActionsOpen ? closeMoreActions(false) : openMoreActions("first"),
      onKeyDown: (e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          openMoreActions(e.key === "ArrowUp" ? "last" : "first");
        } else if (e.key === "Escape" && isMoreActionsOpen) {
          e.preventDefault();
          closeMoreActions(true);
        }
      },
      className: "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50",
      "aria-label": t("history.more_actions_aria"),
      "aria-haspopup": "menu",
      "aria-expanded": isMoreActionsOpen,
      "aria-controls": "history-more-actions-menu"
    },
    /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1.5" }, t("history.more_actions"), " ", /* @__PURE__ */ React.createElement(ChevronDown, { size: 14, "aria-hidden": "true" }))
  ), isMoreActionsOpen && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      tabIndex: -1,
      "aria-label": t("history.close_more_actions_aria"),
      className: "rp-dismiss-layer fixed inset-0 z-[80] cursor-default bg-transparent",
      onClick: () => closeMoreActions(true)
    }
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: moreActionsMenuRef,
      id: "history-more-actions-menu",
      role: "menu",
      "aria-label": t("history.more_actions_aria"),
      onKeyDown: handleMoreActionsMenuKeyDown,
      className: "rp-menu-surface absolute right-0 top-full z-[90] mt-1 w-64 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-2xl shadow-slate-900/15"
    },
    !isCanvas && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        role: "menuitem",
        onClick: () => {
          closeMoreActions(false);
          onOpenDeviceRecovery();
        },
        className: "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100",
        "data-help-key": "history_device_storage"
      },
      /* @__PURE__ */ React.createElement(Settings, { size: 15, "aria-hidden": "true" }),
      /* @__PURE__ */ React.createElement("span", null, "Manage local storage and recovery")
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        role: "menuitem",
        onClick: () => {
          closeMoreActions(false);
          projectFileInputRef.current.click();
        },
        className: "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100",
        "data-help-key": "history_load_project"
      },
      /* @__PURE__ */ React.createElement(Upload, { size: 15, "aria-hidden": "true" }),
      /* @__PURE__ */ React.createElement("span", null, t("history.load_project"))
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        role: "menuitem",
        onClick: () => {
          closeMoreActions(false);
          handleToggleIsHistoryMaximized();
        },
        className: "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100",
        "data-help-key": "history_max_toggle"
      },
      isHistoryMaximized ? /* @__PURE__ */ React.createElement(Minimize, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ React.createElement(Maximize, { size: 15, "aria-hidden": "true" }),
      /* @__PURE__ */ React.createElement("span", null, isHistoryMaximized ? t("history.minimize") : t("history.maximize"))
    ),
    isTeacherMode && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        role: "menuitem",
        onClick: () => {
          closeMoreActions(false);
          initiateSaveTeacherProject();
        },
        disabled: safeHistory.length === 0,
        className: `flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 ${isSaveActionPulsing ? "ring-2 ring-indigo-200" : ""}`,
        "data-help-key": "history_save_teacher"
      },
      /* @__PURE__ */ React.createElement(Save, { size: 15, "aria-hidden": "true" }),
      /* @__PURE__ */ React.createElement("span", null, t("history.save_teacher"))
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        role: "menuitem",
        onClick: () => {
          closeMoreActions(false);
          initiateSaveStudentProject();
        },
        disabled: safeHistory.length === 0,
        className: `flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 ${isSaveActionPulsing ? "ring-2 ring-indigo-200" : ""}`,
        "data-help-key": "history_save_student"
      },
      isTeacherMode ? /* @__PURE__ */ React.createElement(Lock, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ React.createElement(Save, { size: 15, "aria-hidden": "true" }),
      /* @__PURE__ */ React.createElement("span", null, isTeacherMode ? t("history.save_student") : t("history.save_work"))
    ),
    /* @__PURE__ */ React.createElement("div", { role: "separator", className: "my-1 h-px bg-slate-200" }),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        role: "menuitem",
        onClick: () => {
          closeMoreActions(false);
          shareResourcePackToCommunity();
        },
        disabled: safeHistory.length === 0,
        className: "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50",
        "data-help-key": "history_share_pack"
      },
      /* @__PURE__ */ React.createElement(Share2, { size: 15, "aria-hidden": "true" }),
      /* @__PURE__ */ React.createElement("span", null, t("history.share_resource_pack"))
    ),
    isTeacherMode && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        role: "menuitem",
        onClick: () => {
          closeMoreActions(false);
          handleSetIsProjectSettingsOpenToTrue();
        },
        className: "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100",
        "data-help-key": "history_settings"
      },
      /* @__PURE__ */ React.createElement(Settings, { size: 15, "aria-hidden": "true" }),
      /* @__PURE__ */ React.createElement("span", null, t("history.settings"))
    ),
    (isTeacherMode || safeHistory.length > 0) && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        role: "menuitem",
        onClick: () => {
          closeMoreActions(false);
          handleClearHistory();
        },
        className: "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50",
        "data-help-key": "history_clear_button"
      },
      /* @__PURE__ */ React.createElement(Trash2, { size: 15, "aria-hidden": "true" }),
      /* @__PURE__ */ React.createElement("span", null, t("history.clear"))
    )
  ))))), isTeacherMode && !isIndependentMode && /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border border-slate-200 bg-slate-50/90 p-2 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(FolderOpen, { size: 16, className: "text-slate-500 shrink-0" }), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: activeUnitId,
      "data-help-key": "history_filter_unit_select",
      onChange: (e) => setActiveUnitId(e.target.value),
      className: "min-h-11 min-w-0 flex-grow rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200",
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
      className: "min-h-11 min-w-11 grid place-items-center rounded-lg border border-slate-300 bg-white text-indigo-700 transition-colors hover:bg-indigo-50",
      title: t("history.create_unit_tooltip"),
      "aria-label": t("history.create_unit_tooltip")
    },
    /* @__PURE__ */ React.createElement(FolderPlus, { size: 14 })
  ), activeUnitId !== "all" && activeUnitId !== "uncategorized" && typeof onVisualizeUnit === "function" && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => onVisualizeUnit(activeUnitId),
      className: "min-h-11 min-w-11 grid place-items-center rounded-lg border border-slate-300 bg-white text-amber-700 transition-colors hover:bg-amber-50",
      title: t("history.visualize_unit_tooltip") || "Open this unit in Learning Web: Unit Path",
      "aria-label": t("history.visualize_unit_tooltip") || "Open this unit in Learning Web: Unit Path"
    },
    /* @__PURE__ */ React.createElement("span", { style: { fontSize: "13px", lineHeight: 1 } }, "\u{1F9ED}")
  ), activeUnitId !== "all" && activeUnitId !== "uncategorized" && /* @__PURE__ */ React.createElement(
    "button",
    {
      "data-help-key": "history_delete_unit_btn",
      onClick: handleDeleteUnit,
      className: "min-h-11 min-w-11 grid place-items-center rounded-lg border border-slate-300 bg-white text-red-700 transition-colors hover:bg-red-50",
      title: t("history.delete_unit_tooltip"),
      "aria-label": t("history.delete_unit_tooltip")
    },
    /* @__PURE__ */ React.createElement(Trash2, { size: 14 })
  )), (unitFilteredHistory.length > 0 || isResourceFilterActive) && /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm shadow-slate-900/5", role: "search", "aria-label": t("history.find_resources_aria") }, /* @__PURE__ */ React.createElement("div", { className: "relative min-w-[150px] flex-1" }, /* @__PURE__ */ React.createElement(Search, { size: 14, "aria-hidden": "true", className: "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" }), /* @__PURE__ */ React.createElement("input", { type: "search", value: resourceSearch, onChange: (e) => setResourceSearch(e.target.value), placeholder: t("history.search_resources_placeholder"), "aria-label": t("history.search_resources_aria"), className: "min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-9 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200" }), resourceSearch && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setResourceSearch(""), "aria-label": t("history.clear_resource_search_aria"), className: "absolute right-0 top-0 min-h-11 min-w-11 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" }, /* @__PURE__ */ React.createElement(X, { size: 14, className: "mx-auto", "aria-hidden": "true" }))), /* @__PURE__ */ React.createElement("select", { value: resourceTypeFilter, onChange: (e) => setResourceTypeFilter(e.target.value), "aria-label": t("history.filter_by_type_aria"), className: "min-h-11 min-w-[120px] flex-1 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200" }, /* @__PURE__ */ React.createElement("option", { value: "all" }, t("history.all_types")), displayedResourceTypes.map((type) => /* @__PURE__ */ React.createElement("option", { key: type, value: type }, getResourceTypeLabel(type)))), isResourceFilterActive && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: clearResourceFilters, className: "min-h-11 rounded-lg px-3 text-xs font-bold text-indigo-700 hover:bg-indigo-50" }, t("history.clear_filters")), isResourceFilterActive && /* @__PURE__ */ React.createElement("p", { className: "w-full text-xs text-slate-500", role: "status" }, t("history.filtered_status", { visible: filteredHistory.length, total: unitFilteredHistory.length }))), isUnitModalOpen && /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border border-indigo-200 bg-indigo-50 p-3 animate-in slide-in-from-top-2" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-bold text-slate-700 mb-1" }, t("history.new_unit_label")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_new_unit_name"),
      type: "text",
      value: newUnitName,
      "data-help-key": "history_unit_name_input",
      onChange: (e) => setNewUnitName(e.target.value),
      placeholder: t("history.new_unit_placeholder"),
      className: "min-h-11 flex-grow rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200",
      autoFocus: true,
      onKeyDown: (e) => e.key === "Enter" && handleCreateUnit()
    }
  ), /* @__PURE__ */ React.createElement("button", { "data-help-key": "history_save_unit_btn", onClick: handleCreateUnit, className: "min-h-11 rounded-lg border border-indigo-700 bg-indigo-700 px-3 text-xs font-bold text-white hover:bg-indigo-800" }, t("common.save")), /* @__PURE__ */ React.createElement("button", { "data-help-key": "history_cancel_unit_btn", onClick: handleSetIsUnitModalOpenToFalse, className: "min-h-11 rounded-lg px-3 text-xs font-bold text-slate-600 hover:bg-white" }, t("common.cancel"))))), (() => {
    const stations = JSON.parse(localStorage.getItem("alloflow_stem_stations") || "[]");
    if (stations.length === 0) return null;
    return /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5" }, "\u{1F4CC} STEM Stations", /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700" }, stations.length))), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, stations.map((st) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: st.id,
        onClick: () => {
          setActiveStation(st);
          setShowStemLab(true);
          setStemLabTab && setStemLabTab("explore");
        },
        className: "group flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 cursor-pointer transition-colors hover:border-emerald-300 hover:bg-emerald-50/60"
      },
      /* @__PURE__ */ React.createElement("div", { className: "p-1.5 rounded-md bg-emerald-50 text-emerald-700 shrink-0" }, "\u{1F52C}"),
      /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-grow" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm font-bold text-slate-800 truncate" }, st.name), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-slate-500" }, st.tools.length, " tool", st.tools.length !== 1 ? "s" : "")),
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
          className: "min-h-11 min-w-11 grid place-items-center rounded-lg text-red-700 transition-colors hover:bg-red-50",
          "aria-label": t("history.delete_station_aria") || "Delete station"
        },
        /* @__PURE__ */ React.createElement(X, { size: 12 })
      )
    ))));
  })(), (() => {
    const stations = JSON.parse(localStorage.getItem("alloflow_sel_stations") || "[]");
    if (stations.length === 0) return null;
    return /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5" }, "\u{1F4CC} SEL Stations", /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-pink-50 px-1.5 py-0.5 text-xs text-pink-700" }, stations.length))), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, stations.map((st) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: st.id,
        onClick: () => {
          setActiveSelStation(st);
          setShowSelHub(true);
          setSelHubTab && setSelHubTab("explore");
        },
        className: "group flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 cursor-pointer transition-colors hover:border-pink-300 hover:bg-pink-50/60"
      },
      /* @__PURE__ */ React.createElement("div", { className: "p-1.5 rounded-md bg-pink-50 text-pink-700 shrink-0" }, "\u{1F496}"),
      /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-grow" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm font-bold text-slate-800 truncate" }, st.name), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-slate-500" }, (st.tools || []).length, " tool", (st.tools || []).length !== 1 ? "s" : "", (st.quests || []).length > 0 ? ` \xB7 ${st.quests.length} quest${st.quests.length !== 1 ? "s" : ""}` : "")),
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
          className: "min-h-11 min-w-11 grid place-items-center rounded-lg text-red-700 transition-colors hover:bg-red-50",
          "aria-label": `Delete SEL Station ${st.name}`
        },
        /* @__PURE__ */ React.createElement(X, { size: 12 })
      )
    ))));
  })(), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "space-y-3 overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar flex-grow pb-10",
      role: filteredHistory.length > 0 ? "list" : void 0,
      "aria-label": filteredHistory.length > 0 ? t("sidebar.resource_pack_history") || "Saved resources" : void 0
    },
    filteredHistory.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-500" }, safeHistory.length === 0 ? t("history.empty_general") : unitFilteredHistory.length === 0 ? t("history.empty_unit") : t("history.no_filter_matches"), isResourceFilterActive && unitFilteredHistory.length > 0 && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: clearResourceFilters, className: "mx-auto mt-3 block min-h-11 rounded-lg px-3 font-bold text-indigo-700 hover:bg-indigo-50" }, t("history.clear_filters"))),
    filteredHistory.map((item, idx) => {
      const itemInstanceId = getHistoryRowInstanceId(item);
      const persistedItemInstanceId = getPersistedArtifactInstanceId(item);
      const itemPublicId = getSafePublicArtifactId(item);
      const itemType = getSafeRowText(getSafeArtifactField(item, "type"), "resource", 100);
      let rawDefaultItemTitle = "Resource";
      try {
        rawDefaultItemTitle = getDefaultTitle(itemType, item);
      } catch (_) {
      }
      const defaultItemTitle = getSafeRowText(rawDefaultItemTitle, "Resource", 240);
      const safeItemTitle = getSafeRowText(getSafeArtifactField(item, "title"), defaultItemTitle, 240);
      const itemTitle = isTeacherMode && !isIndependentMode ? safeItemTitle : sanitizeString(safeItemTitle);
      const rawItemMeta = getSafeArtifactField(item, "meta");
      const itemMeta = typeof rawItemMeta === "string" ? rawItemMeta.trim().slice(0, 500) : "";
      const itemTypeLabel = getResourceTypeLabel(itemType);
      const itemTextBadge = getInstructionalTextBadge(item);
      const itemTextBadgeClass = itemTextBadge && itemTextBadge.tone === "blue" ? "border-blue-200 bg-blue-50 text-blue-800" : itemTextBadge && itemTextBadge.tone === "violet" ? "border-violet-200 bg-violet-50 text-violet-800" : itemTextBadge && itemTextBadge.tone === "amber" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-slate-600";
      const itemDate = getSafeRowDate(getSafeArtifactField(item, "timestamp"));
      const itemDateLabel = itemDate ? itemDate.toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" }) : "";
      const itemDateTime = itemDateLabel ? itemDate.toISOString() : void 0;
      const itemUnitId = getSafeRowText(getSafeArtifactField(item, "unitId"), "", 160);
      const itemUnit = itemUnitId && Array.isArray(units) ? units.find((unit) => getSafeRowText(getSafeArtifactField(unit, "id"), "", 160) === itemUnitId) : null;
      const itemUnitName = getSafeRowText(getSafeArtifactField(itemUnit, "name"), "Unit", 160);
      const itemData = getSafeArtifactField(item, "data");
      const generatedArtifactData = getSafeArtifactField(generatedContent, "data");
      const itemFromDA = getSafeArtifactField(item, "fromDA") === true;
      const rawDaItemIndex = getSafeArtifactField(item, "daItemIndex");
      const itemDaItemIndex = Number.isSafeInteger(rawDaItemIndex) && rawDaItemIndex >= 0 ? rawDaItemIndex : null;
      const itemConfigSummary = getSafeRowText(
        getSafeArtifactField(item, "configSummary"),
        "",
        500
      );
      const isCurrent = !!generatedContent && (generatedContent === item || generatedArtifactInstanceId && persistedItemInstanceId && generatedArtifactInstanceId === persistedItemInstanceId || !generatedArtifactInstanceId && !persistedItemInstanceId && generatedArtifactData && generatedArtifactData === itemData || !generatedArtifactInstanceId && !persistedItemInstanceId && itemPublicId && publicHistoryIdCounts.get(itemPublicId) === 1 && getSafePublicArtifactId(generatedContent) === itemPublicId);
      const openLabel = t("common.open") || "Open";
      const currentLabel = t("launch_pad.current_language") || "Current";
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: itemInstanceId,
          role: "listitem",
          onDragEnter: (e) => canReorderResources && handleDragEnter(e, itemInstanceId),
          onDragOver: (e) => canReorderResources && e.preventDefault(),
          onDragEnd: handleDragEnd,
          className: `group flex flex-col rounded-xl border border-l-4 p-3 transition-[background-color,border-color,box-shadow] ${isCurrent ? "border-indigo-300 border-l-indigo-600 bg-indigo-50/70 text-slate-900 shadow-sm shadow-indigo-900/5" : "border-slate-200 border-l-transparent bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/70"} ${isSyncMode ? "cursor-not-allowed opacity-60" : "cursor-default"}`
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
              handleDragStart(e, itemInstanceId);
            },
            onKeyDown: (e) => {
              if (!e.altKey || !canReorderResources) return;
              if (e.key === "ArrowUp" && idx > 0) {
                e.preventDefault();
                moveItem(e, itemInstanceId, "up", getHistoryRowInstanceId(filteredHistory[idx - 1]));
              } else if (e.key === "ArrowDown" && idx < filteredHistory.length - 1) {
                e.preventDefault();
                moveItem(e, itemInstanceId, "down", getHistoryRowInstanceId(filteredHistory[idx + 1]));
              }
            },
            "aria-keyshortcuts": canReorderResources ? "Alt+ArrowUp Alt+ArrowDown" : void 0,
            "aria-disabled": !canReorderResources || editingId === itemInstanceId,
            "aria-label": canReorderResources ? (t("common.reorder_list") || "Reorder") + ": " + itemTitle + ". " + (t("history.position") || "Position") + " " + (idx + 1) + " " + (t("common.of") || "of") + " " + filteredHistory.length + ". " + (t("history.keyboard_reorder") || "Use Alt plus Up or Down Arrow to reorder.") : itemTitle + ". " + t("history.clear_filters_to_reorder"),
            className: `min-h-11 min-w-11 rounded-lg flex items-center justify-center gap-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${isCurrent ? "text-indigo-600 hover:bg-indigo-100" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"} ${editingId === itemInstanceId || !canReorderResources ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing"}`,
            "data-help-key": "history_item_drag",
            title: isResourceFilterActive ? t("history.clear_filters_to_reorder") : t("common.drag_to_reorder")
          },
          /* @__PURE__ */ React.createElement(GripVertical, { size: 14, "aria-hidden": "true" }),
          /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold", "aria-hidden": "true" }, idx + 1)
        ), /* @__PURE__ */ React.createElement("div", { className: `self-center p-2 rounded-lg shrink-0 ${isCurrent ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}` }, getIconForType(itemType)), editingId === itemInstanceId ? /* @__PURE__ */ React.createElement("div", { className: "flex min-h-11 min-w-0 flex-grow items-center gap-1", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
          "input",
          {
            "aria-label": t("common.enter_edit_title"),
            type: "text",
            value: editTitle,
            onChange: (e) => setEditTitle(e.target.value),
            className: "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200",
            autoFocus: true
          }
        ), /* @__PURE__ */ React.createElement("button", { onClick: (e) => handleSaveEdit(e), className: "min-h-11 min-w-11 grid place-items-center rounded-lg text-emerald-700 hover:bg-emerald-50", "aria-label": t("common.save") }, /* @__PURE__ */ React.createElement(Save, { size: 14 })), /* @__PURE__ */ React.createElement("button", { onClick: (e) => handleCancelEdit(e), className: "min-h-11 min-w-11 grid place-items-center rounded-lg text-red-700 hover:bg-red-50", "aria-label": t("common.cancel") }, /* @__PURE__ */ React.createElement(X, { size: 14 }))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
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
            className: `min-h-11 min-w-0 flex-grow rounded-lg px-2 py-1.5 text-left flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${isCurrent ? "cursor-default bg-indigo-50/80 text-slate-900" : "hover:bg-slate-100 text-slate-800"} aria-disabled:opacity-60`,
            "aria-label": isCurrent ? `${itemTitle}. ${currentLabel}` : `${openLabel}: ${itemTitle}`,
            "aria-current": isCurrent ? "page" : void 0,
            "aria-disabled": isSyncMode || isCurrent
          },
          /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-grow" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm font-bold leading-snug line-clamp-2", title: itemTitle }, itemTitle), /* @__PURE__ */ React.createElement("div", { className: "mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-slate-500" }, /* @__PURE__ */ React.createElement("span", { className: `rounded-full border px-2 py-0.5 font-semibold ${isCurrent ? "border-indigo-200 bg-white text-indigo-700" : "border-slate-200 bg-slate-100 text-slate-600"}` }, itemTypeLabel), itemTextBadge && /* @__PURE__ */ React.createElement("span", { className: `rounded-full border px-2 py-0.5 font-semibold ${itemTextBadgeClass}` }, itemTextBadge.label), itemDateLabel && /* @__PURE__ */ React.createElement("time", { dateTime: itemDateTime }, itemDateLabel)), (itemUnit || itemFromDA || itemMeta) && /* @__PURE__ */ React.createElement("div", { className: "mt-1 flex min-w-0 items-center gap-1 truncate text-xs text-slate-500" }, itemUnit && /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-slate-600" }, /* @__PURE__ */ React.createElement(Folder, { size: 8 }), " ", itemUnitName), itemFromDA && /* @__PURE__ */ React.createElement(
            "span",
            {
              className: "bg-violet-100 text-violet-700 border border-violet-300 px-1 rounded font-bold",
              title: itemDaItemIndex !== null ? `Auto-generated by Dynamic Assessment for item ${itemDaItemIndex + 1}` : "Auto-generated by Dynamic Assessment"
            },
            "\u{1F52C} DA",
            itemDaItemIndex !== null ? ` \xB7 #${itemDaItemIndex + 1}` : ""
          ), itemMeta && /* @__PURE__ */ React.createElement("span", null, isTeacherMode && !isIndependentMode ? itemMeta : sanitizeString(itemMeta))), itemType === "word-sounds" && itemConfigSummary && /* @__PURE__ */ React.createElement("div", { className: "mt-1 flex items-center gap-1 truncate text-xs text-slate-500", title: itemConfigSummary }, /* @__PURE__ */ React.createElement("span", { className: "rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-violet-700" }, "\u{1F4CB} ", itemConfigSummary))),
          /* @__PURE__ */ React.createElement(
            "span",
            {
              "aria-hidden": "true",
              className: `shrink-0 rounded-md px-2 py-1 text-xs font-bold ${isCurrent ? "bg-emerald-100 text-emerald-800" : "border border-slate-200 bg-white text-indigo-700"}`
            },
            isCurrent ? currentLabel : openLabel
          )
        ), isTeacherMode && /* @__PURE__ */ React.createElement(
          "button",
          {
            "aria-label": t("common.edit"),
            "data-help-key": "history_rename_btn",
            onClick: (e) => handleStartEdit(e, item),
            className: "min-h-11 min-w-11 self-center grid place-items-center rounded-lg border border-transparent text-indigo-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50",
            title: t("actions.rename")
          },
          /* @__PURE__ */ React.createElement(Pencil, { size: 10 })
        ))),
        isTeacherMode && /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex items-center justify-between border-t border-slate-200 pt-2", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 relative" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            "aria-label": `${t("actions.move_up") || "Move up"}: ${itemTitle}`,
            "data-help-key": "history_move_up_btn",
            onClick: (e) => moveItem(e, itemInstanceId, "up", getHistoryRowInstanceId(filteredHistory[idx - 1])),
            disabled: !canReorderResources || idx === 0,
            className: "min-h-11 min-w-11 grid place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30",
            title: t("actions.move_up")
          },
          /* @__PURE__ */ React.createElement(ChevronUp, { size: 12 })
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            "aria-label": `${t("actions.move_down") || "Move down"}: ${itemTitle}`,
            "data-help-key": "history_move_down_btn",
            onClick: (e) => moveItem(e, itemInstanceId, "down", getHistoryRowInstanceId(filteredHistory[idx + 1])),
            disabled: !canReorderResources || idx === filteredHistory.length - 1,
            className: "min-h-11 min-w-11 grid place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30",
            title: t("actions.move_down")
          },
          /* @__PURE__ */ React.createElement(ChevronDown, { size: 12 })
        ), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            "data-help-key": "history_move_to_unit_btn",
            "aria-label": `${t("history.tooltips.move_to_unit") || "Move to unit"}: ${itemTitle}`,
            "aria-expanded": movingItemId === itemInstanceId,
            "aria-haspopup": "menu",
            "aria-controls": `history-move-menu-${itemInstanceId}`,
            onClick: () => setMovingItemId(movingItemId === itemInstanceId ? null : itemInstanceId),
            className: `min-h-11 min-w-11 grid place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 ${itemUnitId ? "text-amber-700" : ""}`,
            title: t("history.tooltips.move_to_unit")
          },
          /* @__PURE__ */ React.createElement(FolderInput, { size: 12, "aria-hidden": "true" })
        ), movingItemId === itemInstanceId && /* @__PURE__ */ React.createElement("div", { id: `history-move-menu-${itemInstanceId}`, role: "menu", className: "rp-menu-surface absolute left-0 top-12 z-[100] w-48 origin-top-left rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/15 animate-in fade-in zoom-in-95" }, /* @__PURE__ */ React.createElement("div", { role: "presentation", className: "px-2 py-2 text-xs font-bold uppercase tracking-wider text-slate-500" }, t("history.move_to_label")), /* @__PURE__ */ React.createElement("div", { role: "presentation", className: "flex flex-col gap-0.5 max-h-32 overflow-y-auto custom-scrollbar" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            role: "menuitem",
            onClick: () => handleMoveToUnit(itemInstanceId, "uncategorized"),
            className: `min-h-11 w-full truncate rounded-lg px-2 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 ${!itemUnitId ? "bg-indigo-50 font-bold text-indigo-700" : ""}`
          },
          t("history.uncategorized")
        ), units.map((u) => /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            role: "menuitem",
            key: u.id,
            onClick: () => handleMoveToUnit(itemInstanceId, u.id),
            className: `min-h-11 w-full truncate rounded-lg px-2 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 ${itemUnitId === getSafeRowText(getSafeArtifactField(u, "id"), "", 160) ? "bg-indigo-50 font-bold text-indigo-700" : ""}`
          },
          u.name
        )), units.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "px-2 py-2 text-xs italic text-slate-500" }, t("history.no_units")))), movingItemId === itemInstanceId && /* @__PURE__ */ React.createElement("div", { "aria-hidden": "true", className: "fixed inset-0 z-[90]", onClick: handleSetMovingItemIdToNull }))), itemType === "word-sounds" && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: (e) => {
              e.stopPropagation();
              const words = getSafeArraySnapshot(itemData, 1e4);
              const lines = [
                "Date,Resource,Word,Activity,TotalWords",
                ...words.map((w) => {
                  const word = getSafeRowText(
                    getSafeArtifactField(w, "targetWord") || getSafeArtifactField(w, "word") || getSafeArtifactField(w, "displayWord"),
                    "",
                    240
                  );
                  return `${(itemDate || /* @__PURE__ */ new Date()).toLocaleDateString()},${itemTitle || "Word Sounds"},${word},,${words.length}`;
                })
              ];
              if (itemConfigSummary) {
                lines.unshift("# Config: " + itemConfigSummary);
              }
              const csv = lines.join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `word-sounds-${(itemDate || /* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
              addToast && addToast("CSV downloaded for RTI progress monitoring", "success");
            },
            className: `min-h-11 rounded-lg px-2 text-xs font-semibold transition-colors flex items-center gap-1 ${isCurrent ? "text-emerald-800" : "text-emerald-700"} hover:bg-emerald-50`,
            title: t("common.export_csv_for_rti")
          },
          /* @__PURE__ */ React.createElement(Download, { size: 12 }),
          " CSV"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            "aria-label": t("common.delete"),
            onClick: (e) => handleDeleteHistoryItem(e, itemPublicId, item),
            className: "min-h-11 rounded-lg px-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 flex items-center gap-1",
            title: t("history.tooltips.remove_item"),
            "data-help-key": "resource_delete_button"
          },
          /* @__PURE__ */ React.createElement(Trash2, { size: 12 }),
          " ",
          t("actions.remove")
        ))
      );
    })
  ));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.HistoryPanel = { HistoryPanel: HistoryPanel };
  console.log('[CDN] HistoryPanel loaded');
})();
