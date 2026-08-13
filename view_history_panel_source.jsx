/**
 * AlloFlow — Teacher/Student History Panel Module
 *
 * The big history sidebar panel (when teacher mode is on activeSidebarTab==="history",
 * or always for students). Shows resource history with units, cloud-sync status,
 * STEM/SEL station bookmarks, drag-to-reorder, inline edit, batch save/load.
 *
 * Extracted from AlloFlowANTI.txt lines 21275-21796 (May 2026).
 * 522 lines, ~85 deps. Single biggest remaining clean extraction.
 *
 * Phase A.3 polish (May 12 2026): activeSelStation + setActiveSelStation
 * are now defined in AlloFlowANTI.txt as a real useState(null) and
 * threaded through as props from the HistoryPanel invocation. The
 * destructure defaults below stay as safety nets but are no longer the
 * real source of these values.
 */
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
    activeSidebarTab, activeStation, activeUnitId, addToast, cloudSyncStatus, editTitle,
    editingId, generatedContent, getDefaultTitle, getFilteredHistory, getIconForType,
    handleCancelEdit, handleClearHistory, handleCreateUnit, handleDeleteHistoryItem,
    handleDeleteUnit, handleDragEnd, handleDragEnter, handleDragStart, handleLoadProject,
    handleMoveToUnit, handleRestoreView, handleSaveEdit,
    handleSetIsProjectSettingsOpenToTrue, handleSetIsUnitModalOpenToFalse,
    handleSetIsUnitModalOpenToTrue, handleSetMovingItemIdToNull, handleStartEdit,
    handleToggleIsHistoryMaximized, history, initiateSaveStudentProject,
    initiateSaveTeacherProject, isCloudSyncEnabled, isHistoryMaximized,
    isIndependentMode, isParentMode, isSaveActionPulsing, isStorageDisabled, isSyncMode,
    isTeacherMode, isUnitModalOpen, lastSaved, moveItem, movingItemId, newUnitName,
    pendingSync, projectFileInputRef, sanitizeString, setActiveStation, setActiveUnitId,
    isCanvas = false, canvasRecoverySaveStatus = 'inactive', canvasRecoverySnapshotCount = 0,
    onOpenDeviceRecovery = (() => {}),
    setEditTitle, setIsCommunityCatalogOpen, setMovingItemId, setNewUnitName,
    setSelHubTab, setShowSelHub, setShowStemLab, setStemLabTab, t, units,
    onVisualizeUnit,
    activeSelStation = null,
    setActiveSelStation = (() => {}),
  } = props;
  const shareResourcePackToCommunity = () => {
    const visibleItems = (typeof getFilteredHistory === 'function' ? getFilteredHistory() : history) || [];
    if (visibleItems.length === 0) {
      addToast && addToast(t('history.empty_general') || 'No resources to share yet.', 'info');
      return;
    }
    const activeUnit = Array.isArray(units) ? units.find(u => u.id === activeUnitId) : null;
    const packTitle = activeUnit && activeUnitId !== 'all' && activeUnitId !== 'uncategorized'
      ? activeUnit.name
      : (isTeacherMode ? 'AlloFlow resource pack' : 'My AlloFlow resources');
    // Privacy + size gate: run the pack through the same sanitizer the cloud
    // sync uses (strips child voice audioRecording, base64 images/avatars,
    // adventure scene blobs) before it leaves the device as a community
    // submission. Fail CLOSED if the sanitizer module hasn't loaded — raw
    // history items can carry biometric-class student audio.
    const sanitizeForCloud = (typeof window !== 'undefined' && typeof window.sanitizeHistoryForCloud === 'function') ? window.sanitizeHistoryForCloud : null;
    const stripU = (typeof window !== 'undefined' && typeof window.stripUndefined === 'function') ? window.stripUndefined : (x => x);
    if (!sanitizeForCloud) {
      addToast && addToast(t('history.share_pack_not_ready') || 'Sharing is still warming up — try again in a moment.', 'info');
      return;
    }
    try {
      const cleanedItems = stripU(sanitizeForCloud(visibleItems.map(item => ({
        id: item.id,
        type: item.type,
        title: item.title,
        timestamp: item.timestamp,
        data: item.data,
        meta: item.meta
      }))));
      localStorage.setItem('alloflow_pending_submission', JSON.stringify({
        title: packTitle,
        source_type: 'resource-pack',
        payload: {
          type: 'resource-pack',
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
      addToast && addToast('Could not open submission form: ' + (err && err.message), 'error');
    }
  };

  const [resourceSearch, setResourceSearch] = React.useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = React.useState('all');
  const [isMoreActionsOpen, setIsMoreActionsOpen] = React.useState(false);
  const moreActionsButtonRef = React.useRef(null);
  const moreActionsMenuRef = React.useRef(null);
  const unitFilteredHistory = (typeof getFilteredHistory === 'function' ? getFilteredHistory() : history) || [];
  const getResourceTypeLabel = (type) => {
    const localizedTitle = getDefaultTitle(type);
    return localizedTitle
      ? String(localizedTitle)
      : String(type || 'resource').replace(/[-_]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  };
  const resourceTypes = Array.from(new Set(unitFilteredHistory.map(item => item && item.type).filter(Boolean)))
    .sort((a, b) => getResourceTypeLabel(a).localeCompare(getResourceTypeLabel(b)));
  const displayedResourceTypes = resourceTypeFilter !== 'all' && !resourceTypes.includes(resourceTypeFilter)
    ? [resourceTypeFilter, ...resourceTypes]
    : resourceTypes;
  const normalizedResourceSearch = resourceSearch.trim().toLocaleLowerCase();
  const isResourceFilterActive = normalizedResourceSearch.length > 0 || resourceTypeFilter !== 'all';
  const filteredHistory = unitFilteredHistory.filter(item => {
    if (!item) return false;
    if (resourceTypeFilter !== 'all' && item.type !== resourceTypeFilter) return false;
    if (!normalizedResourceSearch) return true;
    const itemTitle = String(item.title || getDefaultTitle(item.type) || '');
    const itemMeta = typeof item.meta === 'string' ? item.meta : '';
    return [itemTitle, itemMeta, item.type, getResourceTypeLabel(item.type)]
      .join(' ').toLocaleLowerCase().includes(normalizedResourceSearch);
  });
  const canReorderResources = !isSyncMode && !isResourceFilterActive;
  const clearResourceFilters = () => {
    setResourceSearch('');
    setResourceTypeFilter('all');
  };
  const focusMoreAction = (edge = 'first') => {
    window.requestAnimationFrame(() => {
      const menuItems = moreActionsMenuRef.current
        ? Array.from(moreActionsMenuRef.current.querySelectorAll('[role="menuitem"]:not(:disabled)'))
        : [];
      const target = edge === 'last' ? menuItems[menuItems.length - 1] : menuItems[0];
      if (target) target.focus();
    });
  };
  const openMoreActions = (edge = 'first') => {
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
    if (e.key === 'ArrowDown') nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % menuItems.length;
    else if (e.key === 'ArrowUp') nextIndex = currentIndex < 0 ? menuItems.length - 1 : (currentIndex - 1 + menuItems.length) % menuItems.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = menuItems.length - 1;
    else if (e.key === 'Escape') {
      e.preventDefault();
      closeMoreActions(true);
      return;
    } else if (e.key === 'Tab') {
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

  return (
            <div id="tour-history-panel" data-help-key="history_panel" className={`allo-premium-history bg-white text-slate-900 rounded-2xl p-4 border border-slate-200 shadow-xl shadow-slate-900/5 flex flex-col shrink-0 transition-all duration-300 ${isHistoryMaximized ? 'fixed inset-4 z-[190] h-auto' : (!isTeacherMode ? 'h-full' : 'flex-grow min-h-[500px]')}`}>
                <style>{`
                  .allo-premium-history { background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 18px 46px rgba(15,23,42,.08); }
                  .allo-premium-history button:focus-visible, .allo-premium-history input:focus-visible, .allo-premium-history select:focus-visible { outline: 3px solid #4f46e5; outline-offset: 2px; }
                  @media (prefers-reduced-motion: reduce) { .allo-premium-history, .allo-premium-history * { transition-duration: .01ms !important; } }
                `}</style>
                <div className="flex flex-col gap-3 mb-3 shrink-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-col">
                            <h3 className="font-bold text-base text-slate-950 flex items-center gap-2">
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700"><History size={16}/></span>
                                <span className="min-w-0 truncate">{isTeacherMode ? t('sidebar.resource_pack_history') : t('sidebar.my_resources')}</span>
                                <span
                                    className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600"
                                    aria-live="polite"
                                    aria-label={isResourceFilterActive
                                        ? t('history.resource_count_filtered', { visible: filteredHistory.length, total: unitFilteredHistory.length })
                                        : t('history.resource_count', { count: unitFilteredHistory.length })}
                                >
                                    {isResourceFilterActive ? filteredHistory.length + ' of ' + unitFilteredHistory.length : unitFilteredHistory.length}
                                </span>
                            </h3>
                        <div className="flex items-center gap-1.5 mt-1 pl-10 text-xs font-medium text-slate-500">
                            {isCanvas && canvasRecoverySaveStatus === 'inactive' ? (
                                <span className="flex min-h-11 items-center gap-1 text-slate-500">Live-session device recovery is off</span>
                            ) : isCanvas ? (
                                <button type="button"
                                    onClick={onOpenDeviceRecovery}
                                    className={'flex min-h-11 items-center gap-1 rounded-lg px-2 text-left transition-colors hover:bg-slate-100 ' + (canvasRecoverySaveStatus === 'error' ? 'text-red-700' : canvasRecoverySaveStatus === 'locked' ? 'text-amber-700' : (canvasRecoverySaveStatus === 'saved' ? 'text-emerald-700' : 'text-slate-500'))}
                                    title={canvasRecoverySaveStatus === 'locked' ? 'Protected recovery workspaces are locked in this tab. Open the manager to unlock.' : String(canvasRecoverySnapshotCount) + ' saved ' + (canvasRecoverySnapshotCount === 1 ? 'workspace' : 'workspaces') + ' on this device. Open saved work manager.'}
                                    aria-label={(canvasRecoverySaveStatus === 'error' ? 'Device save needs attention' : canvasRecoverySaveStatus === 'locked' ? 'Protected recovery workspaces locked, ' + canvasRecoverySnapshotCount + ' workspaces' : canvasRecoverySaveStatus === 'idle' ? 'Current workspace is not saved yet' : (lastSaved ? 'Saved on this device at ' + lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'On-device saved work')) + '. Open saved work manager.'}
                                    data-help-key="history_device_storage">
                                    {(canvasRecoverySaveStatus === 'checking' || canvasRecoverySaveStatus === 'saving' || canvasRecoverySaveStatus === 'restoring') ? (
                                        <RefreshCw size={10} className="animate-spin" aria-hidden="true" />
                                    ) : canvasRecoverySaveStatus === 'error' ? (
                                        <AlertCircle size={10} aria-hidden="true" />
                                    ) : canvasRecoverySaveStatus === 'locked' ? (
                                        <Lock size={10} aria-hidden="true" />
                                    ) : (
                                        <Save size={10} aria-hidden="true" />
                                    )}
                                    <span>
                                        {canvasRecoverySaveStatus === 'checking'
                                            ? 'Checking saved work…'
                                            : canvasRecoverySaveStatus === 'saving'
                                                ? 'Saving on this device…'
                                                : canvasRecoverySaveStatus === 'restoring'
                                                    ? 'Restoring saved work…'
                                                    : canvasRecoverySaveStatus === 'error'
                                                        ? 'Device save needs attention'
                                                        : canvasRecoverySaveStatus === 'locked'
                                                            ? 'Protected recovery workspaces locked · ' + canvasRecoverySnapshotCount + (canvasRecoverySnapshotCount === 1 ? ' workspace' : ' workspaces')
                                                        : canvasRecoverySaveStatus === 'idle'
                                                            ? (canvasRecoverySnapshotCount > 0 ? 'Current workspace not saved yet' : 'Not saved on this device yet')
                                                            : lastSaved
                                                            ? 'Saved on this device · ' + lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                                                            : 'Saved on this device'}
                                    </span>
                                </button>
                            ) : isStorageDisabled ? (
                                <span className="text-red-700 flex items-center gap-1">
                                    <AlertCircle size={10} /> {t('status.storage_disabled')}
                                </span>
                            ) : isCloudSyncEnabled ? (
                                <>
                                        {cloudSyncStatus === 'syncing' && (
                                            <span className="text-slate-500 flex items-center gap-1">
                                                <RefreshCw size={10} className="animate-spin" /> {t('status.syncing')}
                                            </span>
                                        )}
                                        {cloudSyncStatus === 'error' && (
                                            <span className="text-red-700 flex items-center gap-1">
                                                <AlertCircle size={10} /> {t('status.sync_error')}
                                            </span>
                                        )}
                                        {(cloudSyncStatus === 'saved' || cloudSyncStatus === 'idle') && (
                                            <span className="text-emerald-700 flex items-center gap-1">
                                                <Cloud size={10} /> {t('status.cloud_saved')}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    pendingSync ? (
                                        <span className="text-amber-700 flex items-center gap-1">
                                            <CloudOff size={10} /> {t('status.unsaved')}
                                        </span>
                                    ) : lastSaved ? (
                                        <span className="text-emerald-700 flex items-center gap-1">
                                            <Cloud size={10} /> {t('status.autosaved', { time: lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) })}
                                        </span>
                                    ) : (
                                        <span className="text-slate-500 flex items-center gap-1">
                                            <RefreshCw size={10} className="animate-spin" /> {t('status.syncing')}
                                        </span>
                                    )
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <input aria-label={t('common.upload_file')} type="file" ref={projectFileInputRef} onChange={handleLoadProject} className="hidden" accept=".json" />
                            <div className="relative">
                                <button
                                    ref={moreActionsButtonRef}
                                    type="button"
                                    onClick={() => isMoreActionsOpen ? closeMoreActions(false) : openMoreActions('first')}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            openMoreActions(e.key === 'ArrowUp' ? 'last' : 'first');
                                        } else if (e.key === 'Escape' && isMoreActionsOpen) {
                                            e.preventDefault();
                                            closeMoreActions(true);
                                        }
                                    }}
                                    className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50"
                                    aria-label={t('history.more_actions_aria')}
                                    aria-haspopup="menu"
                                    aria-expanded={isMoreActionsOpen}
                                    aria-controls="history-more-actions-menu"
                                >
                                    <span className="flex items-center gap-1.5">{t('history.more_actions')} <ChevronDown size={14} aria-hidden="true" /></span>
                                </button>
                                {isMoreActionsOpen && (
                                    <>
                                        <button
                                            type="button"
                                            tabIndex={-1}
                                            aria-label={t('history.close_more_actions_aria')}
                                            className="fixed inset-0 z-[80] cursor-default bg-transparent"
                                            onClick={() => closeMoreActions(true)}
                                        />
                                        <div
                                            ref={moreActionsMenuRef}
                                            id="history-more-actions-menu"
                                            role="menu"
                                            aria-label={t('history.more_actions_aria')}
                                            onKeyDown={handleMoreActionsMenuKeyDown}
                                            className="absolute right-0 top-full z-[90] mt-1 w-64 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-2xl shadow-slate-900/15"
                                        >
                                            {!isCanvas && (
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    onClick={() => {
                                                        closeMoreActions(false);
                                                        onOpenDeviceRecovery();
                                                    }}
                                                    className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                                    data-help-key="history_device_storage"
                                                >
                                                    <Settings size={15} aria-hidden="true" />
                                                    <span>Manage local storage and recovery</span>
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={() => {
                                                    closeMoreActions(false);
                                                    projectFileInputRef.current.click();
                                                }}
                                                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                                data-help-key="history_load_project"
                                            >
                                                <Upload size={15} aria-hidden="true" />
                                                <span>{t('history.load_project')}</span>
                                            </button>
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={() => {
                                                    closeMoreActions(false);
                                                    handleToggleIsHistoryMaximized();
                                                }}
                                                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                                data-help-key="history_max_toggle"
                                            >
                                                {isHistoryMaximized ? <Minimize size={15} aria-hidden="true" /> : <Maximize size={15} aria-hidden="true" />}
                                                <span>{isHistoryMaximized ? t('history.minimize') : t('history.maximize')}</span>
                                            </button>
                                            {isTeacherMode && (
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    onClick={() => {
                                                        closeMoreActions(false);
                                                        initiateSaveTeacherProject();
                                                    }}
                                                    disabled={history.length === 0}
                                                    className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 ${isSaveActionPulsing ? 'ring-2 ring-indigo-200' : ''}`}
                                                    data-help-key="history_save_teacher"
                                                >
                                                    <Save size={15} aria-hidden="true" />
                                                    <span>{t('history.save_teacher')}</span>
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={() => {
                                                    closeMoreActions(false);
                                                    initiateSaveStudentProject();
                                                }}
                                                disabled={history.length === 0}
                                                className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 ${isSaveActionPulsing ? 'ring-2 ring-indigo-200' : ''}`}
                                                data-help-key="history_save_student"
                                            >
                                                {isTeacherMode ? <Lock size={15} aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
                                                <span>{isTeacherMode ? t('history.save_student') : t('history.save_work')}</span>
                                            </button>
                                            <div role="separator" className="my-1 h-px bg-slate-200" />
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={() => {
                                                    closeMoreActions(false);
                                                    shareResourcePackToCommunity();
                                                }}
                                                disabled={history.length === 0}
                                                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                data-help-key="history_share_pack"
                                            >
                                                <Share2 size={15} aria-hidden="true" />
                                                <span>{t('history.share_resource_pack')}</span>
                                            </button>
                                            {isTeacherMode && (
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    onClick={() => {
                                                        closeMoreActions(false);
                                                        handleSetIsProjectSettingsOpenToTrue();
                                                    }}
                                                    className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                                    data-help-key="history_settings"
                                                >
                                                    <Settings size={15} aria-hidden="true" />
                                                    <span>{t('history.settings')}</span>
                                                </button>
                                            )}
                                            {(isTeacherMode || history.length > 0) && (
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    onClick={() => {
                                                        closeMoreActions(false);
                                                        handleClearHistory();
                                                    }}
                                                    className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50"
                                                    data-help-key="history_clear_button"
                                                >
                                                    <Trash2 size={15} aria-hidden="true" />
                                                    <span>{t('history.clear')}</span>
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    {isTeacherMode && !isIndependentMode && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-2 flex items-center gap-2">
                            <FolderOpen size={16} className="text-slate-500 shrink-0" />
                            <select
                                value={activeUnitId}
                                data-help-key="history_filter_unit_select"
                                onChange={(e) => setActiveUnitId(e.target.value)}
                                className="min-h-11 min-w-0 flex-grow rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                aria-label={t('common.filter_by_unit_aria')}
                            >
                                <option value="all">{t('history.filter_all')}</option>
                                <option value="uncategorized">{t('history.uncategorized')}</option>
                                {units.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                            <button
                                data-help-key="history_create_unit_btn"
                                onClick={handleSetIsUnitModalOpenToTrue}
                                className="min-h-11 min-w-11 grid place-items-center rounded-lg border border-slate-300 bg-white text-indigo-700 transition-colors hover:bg-indigo-50"
                                title={t('history.create_unit_tooltip')}
                                aria-label={t('history.create_unit_tooltip')}
                            >
                                <FolderPlus size={14}/>
                            </button>
                            {activeUnitId !== 'all' && activeUnitId !== 'uncategorized' && typeof onVisualizeUnit === 'function' && (
                                <button
                                    onClick={() => onVisualizeUnit(activeUnitId)}
                                    className="min-h-11 min-w-11 grid place-items-center rounded-lg border border-slate-300 bg-white text-amber-700 transition-colors hover:bg-amber-50"
                                    title={t('history.visualize_unit_tooltip') || 'Open this unit in Learning Web: Unit Path'}
                                    aria-label={t('history.visualize_unit_tooltip') || 'Open this unit in Learning Web: Unit Path'}
                                >
                                    <span style={{fontSize:'13px',lineHeight:1}}>🧭</span>
                                </button>
                            )}
                            {activeUnitId !== 'all' && activeUnitId !== 'uncategorized' && (
                                <button
                                    data-help-key="history_delete_unit_btn"
                                    onClick={handleDeleteUnit}
                                    className="min-h-11 min-w-11 grid place-items-center rounded-lg border border-slate-300 bg-white text-red-700 transition-colors hover:bg-red-50"
                                    title={t('history.delete_unit_tooltip')}
                                    aria-label={t('history.delete_unit_tooltip')}
                                >
                                    <Trash2 size={14}/>
                                </button>
                            )}
                        </div>
                    )}
                    {(unitFilteredHistory.length > 0 || isResourceFilterActive) && (
                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm shadow-slate-900/5" role="search" aria-label={t('history.find_resources_aria')}>
                            <div className="relative min-w-[150px] flex-1">
                                <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="search" value={resourceSearch} onChange={(e) => setResourceSearch(e.target.value)} placeholder={t('history.search_resources_placeholder')} aria-label={t('history.search_resources_aria')} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-9 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                                {resourceSearch && (
                                    <button type="button" onClick={() => setResourceSearch('')} aria-label={t('history.clear_resource_search_aria')} className="absolute right-0 top-0 min-h-11 min-w-11 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                                        <X size={14} className="mx-auto" aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                            <select value={resourceTypeFilter} onChange={(e) => setResourceTypeFilter(e.target.value)} aria-label={t('history.filter_by_type_aria')} className="min-h-11 min-w-[120px] flex-1 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200">
                                <option value="all">{t('history.all_types')}</option>
                                {displayedResourceTypes.map(type => (
                                    <option key={type} value={type}>{getResourceTypeLabel(type)}</option>
                                ))}
                            </select>
                            {isResourceFilterActive && (
                                <button type="button" onClick={clearResourceFilters} className="min-h-11 rounded-lg px-3 text-xs font-bold text-indigo-700 hover:bg-indigo-50">{t('history.clear_filters')}</button>
                            )}
                            {isResourceFilterActive && (
                                <p className="w-full text-xs text-slate-500" role="status">
                                    {t('history.filtered_status', { visible: filteredHistory.length, total: unitFilteredHistory.length })}
                                </p>
                            )}
                        </div>
                    )}
                    {isUnitModalOpen && (
                        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 animate-in slide-in-from-top-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">{t('history.new_unit_label')}</label>
                            <div className="flex gap-2">
                                <input aria-label={t('common.enter_new_unit_name')}
                                    type="text"
                                    value={newUnitName}
                                    data-help-key="history_unit_name_input"
                                    onChange={(e) => setNewUnitName(e.target.value)}
                                    placeholder={t('history.new_unit_placeholder')}
                                    className="min-h-11 flex-grow rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateUnit()}
                                />
                                <button data-help-key="history_save_unit_btn" onClick={handleCreateUnit} className="min-h-11 rounded-lg border border-indigo-700 bg-indigo-700 px-3 text-xs font-bold text-white hover:bg-indigo-800">{t('common.save')}</button>
                                <button data-help-key="history_cancel_unit_btn" onClick={handleSetIsUnitModalOpenToFalse} className="min-h-11 rounded-lg px-3 text-xs font-bold text-slate-600 hover:bg-white">{t('common.cancel')}</button>
                            </div>
                        </div>
                    )}
                </div>
                {/* ── Saved STEM Stations ── */}
                {(() => {
                    const stations = JSON.parse(localStorage.getItem('alloflow_stem_stations') || '[]');
                    if (stations.length === 0) return null;
                    /* Reuse component's filteredHistory snapshot; keep nested callbacks consistent throughout this render. */

  return (
                        <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                    📌 STEM Stations
                                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">{stations.length}</span>
                                </h4>
                            </div>
                            <div className="space-y-1.5">
                                {stations.map((st) => (
                                    <div
                                        key={st.id}
                                        onClick={() => {
                                            setActiveStation(st);
                                            setShowStemLab(true);
                                            setStemLabTab && setStemLabTab('explore');
                                        }}
                                        className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 cursor-pointer transition-colors hover:border-emerald-300 hover:bg-emerald-50/60"
                                    >
                                        <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-700 shrink-0">
                                            🔬
                                        </div>
                                        <div className="min-w-0 flex-grow">
                                            <div className="text-sm font-bold text-slate-800 truncate">{st.name}</div>
                                            <div className="text-xs text-slate-500">{st.tools.length} tool{st.tools.length !== 1 ? 's' : ''}</div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const updated = stations.filter(s => s.id !== st.id);
                                                localStorage.setItem('alloflow_stem_stations', JSON.stringify(updated));
                                                if (activeStation && activeStation.id === st.id) setActiveStation(null);
                                                addToast && addToast('Station removed');
                                            }}
                                            className="min-h-11 min-w-11 grid place-items-center rounded-lg text-red-700 transition-colors hover:bg-red-50"
                                            aria-label={t('history.delete_station_aria') || 'Delete station'}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}
                {/* ── Saved SEL Stations ── */}
                {(() => {
                    const stations = JSON.parse(localStorage.getItem('alloflow_sel_stations') || '[]');
                    if (stations.length === 0) return null;
                    /* Reuse component's filteredHistory snapshot; keep nested callbacks consistent throughout this render. */

  return (
                        <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                    📌 SEL Stations
                                    <span className="rounded-full bg-pink-50 px-1.5 py-0.5 text-xs text-pink-700">{stations.length}</span>
                                </h4>
                            </div>
                            <div className="space-y-1.5">
                                {stations.map((st) => (
                                    <div
                                        key={st.id}
                                        onClick={() => {
                                            setActiveSelStation(st);
                                            setShowSelHub(true);
                                            setSelHubTab && setSelHubTab('explore');
                                        }}
                                        className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 cursor-pointer transition-colors hover:border-pink-300 hover:bg-pink-50/60"
                                    >
                                        <div className="p-1.5 rounded-md bg-pink-50 text-pink-700 shrink-0">
                                            💖
                                        </div>
                                        <div className="min-w-0 flex-grow">
                                            <div className="text-sm font-bold text-slate-800 truncate">{st.name}</div>
                                            <div className="text-xs text-slate-500">{(st.tools || []).length} tool{(st.tools || []).length !== 1 ? 's' : ''}{(st.quests || []).length > 0 ? ` · ${st.quests.length} quest${st.quests.length !== 1 ? 's' : ''}` : ''}</div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const updated = stations.filter(s => s.id !== st.id);
                                                localStorage.setItem('alloflow_sel_stations', JSON.stringify(updated));
                                                if (activeSelStation && activeSelStation.id === st.id) setActiveSelStation(null);
                                                addToast && addToast('SEL Station removed');
                                            }}
                                            className="min-h-11 min-w-11 grid place-items-center rounded-lg text-red-700 transition-colors hover:bg-red-50"
                                            aria-label={`Delete SEL Station ${st.name}`}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                <div className="space-y-3 overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar flex-grow pb-10" role="list" aria-label={t('sidebar.resource_pack_history') || 'Saved resources'}>
                    {filteredHistory.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-500">
                            {history.length === 0
                                ? t('history.empty_general')
                                : unitFilteredHistory.length === 0
                                    ? t('history.empty_unit')
                                    : t('history.no_filter_matches')}
                            {isResourceFilterActive && unitFilteredHistory.length > 0 && (
                                <button type="button" onClick={clearResourceFilters} className="mx-auto mt-3 block min-h-11 rounded-lg px-3 font-bold text-indigo-700 hover:bg-indigo-50">{t('history.clear_filters')}</button>
                            )}
                        </div>
                    )}
                    {filteredHistory.map((item, idx) => {
                        const itemTitle = (isTeacherMode && !isIndependentMode)
                            ? String(item.title || getDefaultTitle(item.type))
                            : sanitizeString(item.title || getDefaultTitle(item.type));
                        const itemMeta = typeof item.meta === 'string' ? item.meta.trim() : '';
                        const itemTypeLabel = getResourceTypeLabel(item.type);
                        const itemDate = item.timestamp ? new Date(item.timestamp) : null;
                        const itemDateLabel = itemDate && Number.isFinite(itemDate.getTime())
                            ? itemDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                            : '';
                        const itemDateTime = itemDateLabel ? itemDate.toISOString() : undefined;
                        const itemUnit = item.unitId ? units.find(u => u.id === item.unitId) : null;
                        const isCurrent = !!(generatedContent && generatedContent.id === item.id);
                        const openLabel = t('common.open') || 'Open';
                        const currentLabel = t('launch_pad.current_language') || 'Current';
                        /* Reuse component's filteredHistory snapshot; keep nested callbacks consistent throughout this render. */

  return (
                        <div
                            key={item.id}
                            role="listitem"
                            onDragEnter={(e) => canReorderResources && handleDragEnter(e, idx)}
                            onDragOver={(e) => canReorderResources && e.preventDefault()}
                            onDragEnd={handleDragEnd}
                            className={`group flex flex-col rounded-xl border border-l-4 p-3 transition-[background-color,border-color,box-shadow] ${isCurrent ? 'border-indigo-300 border-l-indigo-600 bg-indigo-50/70 text-slate-900 shadow-sm shadow-indigo-900/5' : 'border-slate-200 border-l-transparent bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/70'} ${isSyncMode ? 'cursor-not-allowed opacity-60' : 'cursor-default'}`}
                        >
                            <div className="flex items-stretch gap-2 w-full">
                                <button
                                    type="button"
                                    draggable={editingId === null && canReorderResources}
                                    onDragStart={(e) => {
                                        if (!canReorderResources) {
                                            e.preventDefault();
                                            return;
                                        }
                                        handleDragStart(e, idx);
                                    }}
                                    onKeyDown={(e) => {
                                        if (!e.altKey || !canReorderResources) return;
                                        if (e.key === 'ArrowUp' && idx > 0) {
                                            e.preventDefault();
                                            moveItem(e, idx, 'up');
                                        } else if (e.key === 'ArrowDown' && idx < filteredHistory.length - 1) {
                                            e.preventDefault();
                                            moveItem(e, idx, 'down');
                                        }
                                    }}
                                    aria-keyshortcuts={canReorderResources ? "Alt+ArrowUp Alt+ArrowDown" : undefined}
                                    aria-disabled={!canReorderResources || editingId === item.id}
                                    aria-label={canReorderResources
                                        ? (t('common.reorder_list') || 'Reorder') + ': ' + itemTitle + '. ' + (t('history.position') || 'Position') + ' ' + (idx + 1) + ' ' + (t('common.of') || 'of') + ' ' + filteredHistory.length + '. ' + (t('history.keyboard_reorder') || 'Use Alt plus Up or Down Arrow to reorder.')
                                        : itemTitle + '. ' + t('history.clear_filters_to_reorder')}
                                    className={`min-h-11 min-w-11 rounded-lg flex items-center justify-center gap-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${isCurrent ? 'text-indigo-600 hover:bg-indigo-100' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'} ${editingId === item.id || !canReorderResources ? 'cursor-not-allowed opacity-40' : 'cursor-grab active:cursor-grabbing'}`}
                                    data-help-key="history_item_drag"
                                    title={isResourceFilterActive ? t('history.clear_filters_to_reorder') : t('common.drag_to_reorder')}
                                >
                                    <GripVertical size={14} aria-hidden="true" />
                                    <span className="text-[11px] font-bold" aria-hidden="true">{idx + 1}</span>
                                </button>
                                <div className={`self-center p-2 rounded-lg shrink-0 ${isCurrent ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {getIconForType(item.type)}
                                </div>
                                {editingId === item.id ? (
                                    <div className="flex min-h-11 min-w-0 flex-grow items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <input aria-label={t('common.enter_edit_title')}
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                            autoFocus
                                        />
                                        <button onClick={(e) => handleSaveEdit(e)} className="min-h-11 min-w-11 grid place-items-center rounded-lg text-emerald-700 hover:bg-emerald-50" aria-label={t('common.save')}><Save size={14}/></button>
                                        <button onClick={(e) => handleCancelEdit(e)} className="min-h-11 min-w-11 grid place-items-center rounded-lg text-red-700 hover:bg-red-50" aria-label={t('common.cancel')}><X size={14}/></button>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isCurrent) return;
                                                if (isSyncMode) {
                                                    addToast(t('session.teacher_control_warning'), "info");
                                                    return;
                                                }
                                                handleRestoreView(item);
                                            }}
                                            className={`min-h-11 min-w-0 flex-grow rounded-lg px-2 py-1.5 text-left flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${isCurrent ? 'cursor-default bg-indigo-50/80 text-slate-900' : 'hover:bg-slate-100 text-slate-800'} aria-disabled:opacity-60`}
                                            aria-label={isCurrent ? `${itemTitle}. ${currentLabel}` : `${openLabel}: ${itemTitle}`}
                                            aria-current={isCurrent ? 'page' : undefined}
                                            aria-disabled={isSyncMode || isCurrent}
                                        >
                                            <div className="min-w-0 flex-grow">
                                                <div className="text-sm font-bold leading-snug line-clamp-2" title={itemTitle}>
                                                    {itemTitle}
                                                </div>
                                                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                                    <span className={`rounded-full border px-2 py-0.5 font-semibold ${isCurrent ? 'border-indigo-200 bg-white text-indigo-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                                                        {itemTypeLabel}
                                                    </span>
                                                    {itemDateLabel && <time dateTime={itemDateTime}>{itemDateLabel}</time>}
                                                </div>
                                                {(itemUnit || item.fromDA || itemMeta) && (
                                                    <div className="mt-1 flex min-w-0 items-center gap-1 truncate text-xs text-slate-500">
                                                        {itemUnit && (
                                                            <span className="flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-slate-600">
                                                                <Folder size={8}/> {itemUnit.name}
                                                            </span>
                                                        )}
                                                        {item.fromDA && (
                                                            <span
                                                                className="bg-violet-100 text-violet-700 border border-violet-300 px-1 rounded font-bold"
                                                                title={typeof item.daItemIndex === 'number'
                                                                    ? `Auto-generated by Dynamic Assessment for item ${item.daItemIndex + 1}`
                                                                    : 'Auto-generated by Dynamic Assessment'}
                                                            >
                                                                🔬 DA{typeof item.daItemIndex === 'number' ? ` · #${item.daItemIndex + 1}` : ''}
                                                            </span>
                                                        )}
                                                        {itemMeta && <span>{(isTeacherMode && !isIndependentMode) ? itemMeta : sanitizeString(itemMeta)}</span>}
                                                    </div>
                                                )}
                                                {item.type === 'word-sounds' && item.configSummary && (
                                                    <div className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500" title={item.configSummary}>
                                                        <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-violet-700">📋 {item.configSummary}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <span
                                                aria-hidden="true"
                                                className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${isCurrent ? 'bg-emerald-100 text-emerald-800' : 'border border-slate-200 bg-white text-indigo-700'}`}
                                            >
                                                {isCurrent ? currentLabel : openLabel}
                                            </span>
                                        </button>
                                        {isTeacherMode && (
                                            <button
                                                aria-label={t('common.edit')}
                                                data-help-key="history_rename_btn"
                                                onClick={(e) => handleStartEdit(e, item)}
                                                className="min-h-11 min-w-11 self-center grid place-items-center rounded-lg border border-transparent text-indigo-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50"
                                                title={t('actions.rename')}
                                            >
                                                <Pencil size={10} />
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                            {isTeacherMode && (
                            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center gap-1 relative">
                                    <button
                                        type="button"
                                        aria-label={`${t('actions.move_up') || 'Move up'}: ${(isTeacherMode && !isIndependentMode) ? String(item.title || getDefaultTitle(item.type)) : sanitizeString(item.title || getDefaultTitle(item.type))}`}
                                        data-help-key="history_move_up_btn"
                                        onClick={(e) => moveItem(e, idx, 'up')}
                                        disabled={!canReorderResources || idx === 0}
                                        className="min-h-11 min-w-11 grid place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30"
                                        title={t('actions.move_up')}
                                    >
                                        <ChevronUp size={12} />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={`${t('actions.move_down') || 'Move down'}: ${(isTeacherMode && !isIndependentMode) ? String(item.title || getDefaultTitle(item.type)) : sanitizeString(item.title || getDefaultTitle(item.type))}`}
                                        data-help-key="history_move_down_btn"
                                        onClick={(e) => moveItem(e, idx, 'down')}
                                        disabled={!canReorderResources || idx === filteredHistory.length - 1}
                                        className="min-h-11 min-w-11 grid place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30"
                                        title={t('actions.move_down')}
                                    >
                                        <ChevronDown size={12} />
                                    </button>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            data-help-key="history_move_to_unit_btn"
                                            aria-label={`${t('history.tooltips.move_to_unit') || 'Move to unit'}: ${itemTitle}`}
                                            aria-expanded={movingItemId === item.id}
                                            aria-haspopup="menu"
                                            aria-controls={`history-move-menu-${item.id}`}
                                            onClick={() => setMovingItemId(movingItemId === item.id ? null : item.id)}
                                            className={`min-h-11 min-w-11 grid place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 ${item.unitId ? 'text-amber-700' : ''}`}
                                            title={t('history.tooltips.move_to_unit')}
                                        >
                                            <FolderInput size={12} aria-hidden="true" />
                                        </button>
                                        {movingItemId === item.id && (
                                            <div id={`history-move-menu-${item.id}`} role="menu" className="absolute left-0 top-12 z-[100] w-48 origin-top-left rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/15 animate-in fade-in zoom-in-95">
                                                <div role="presentation" className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">{t('history.move_to_label')}</div>
                                                <div role="presentation" className="flex flex-col gap-0.5 max-h-32 overflow-y-auto custom-scrollbar">
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={() => handleMoveToUnit(item.id, 'uncategorized')}
                                                        className={`min-h-11 w-full truncate rounded-lg px-2 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 ${!item.unitId ? 'bg-indigo-50 font-bold text-indigo-700' : ''}`}
                                                    >
                                                        {t('history.uncategorized')}
                                                    </button>
                                                    {units.map(u => (
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            key={u.id}
                                                            onClick={() => handleMoveToUnit(item.id, u.id)}
                                                            className={`min-h-11 w-full truncate rounded-lg px-2 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 ${item.unitId === u.id ? 'bg-indigo-50 font-bold text-indigo-700' : ''}`}
                                                        >
                                                            {u.name}
                                                        </button>
                                                    ))}
                                                    {units.length === 0 && (
                                                        <div className="px-2 py-2 text-xs italic text-slate-500">{t('history.no_units')}</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {movingItemId === item.id && (
                                            <div aria-hidden="true" className="fixed inset-0 z-[90]" onClick={handleSetMovingItemIdToNull}></div>
                                        )}
                                    </div>
                                </div>
                                {item.type === 'word-sounds' && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const words = item.data || [];
                                            const config = item.lessonPlanConfig || {};
                                            const lines = [
                                                'Date,Resource,Word,Activity,TotalWords',
                                                ...words.map(w => {
                                                    const word = w.targetWord || w.word || w.displayWord || '';
                                                    return `${new Date(item.timestamp).toLocaleDateString()},${item.title || 'Word Sounds'},${word},,${words.length}`;
                                                })
                                            ];
                                            if (item.configSummary) {
                                                lines.unshift('# Config: ' + item.configSummary);
                                            }
                                            const csv = lines.join('\n');
                                            const blob = new Blob([csv], { type: 'text/csv' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `word-sounds-${new Date(item.timestamp).toISOString().split('T')[0]}.csv`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                            addToast && addToast('CSV downloaded for RTI progress monitoring', 'success');
                                        }}
                                        className={`min-h-11 rounded-lg px-2 text-xs font-semibold transition-colors flex items-center gap-1 ${generatedContent && generatedContent.id === item.id ? 'text-emerald-800' : 'text-emerald-700'} hover:bg-emerald-50`}
                                        title={t('common.export_csv_for_rti')}
                                    >
                                        <Download size={12} /> CSV
                                    </button>
                                )}
                                <button
                                    aria-label={t('common.delete')}
                                    onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                                    className="min-h-11 rounded-lg px-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 flex items-center gap-1"
                                    title={t('history.tooltips.remove_item')}
                                    data-help-key="resource_delete_button"
                                >
                                    <Trash2 size={12} /> {t('actions.remove')}
                                </button>
                            </div>
                            )}
                        </div>
                        );
                    })}
                </div>
            </div>
  );
}
