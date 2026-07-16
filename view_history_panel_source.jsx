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

  return (
            <div id="tour-history-panel" data-help-key="history_panel" className={`bg-indigo-900 text-indigo-100 rounded-3xl p-4 shadow-xl shadow-indigo-900/50 flex flex-col shrink-0 transition-all duration-300 ${isHistoryMaximized ? 'fixed inset-4 z-[190] h-auto' : (!isTeacherMode ? 'h-full' : 'flex-grow min-h-[500px]')}`}>
                <div className="flex flex-col gap-3 mb-3 shrink-0">
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                            <h3 className="font-bold text-sm flex items-center gap-2">
                                <History size={16}/> {isTeacherMode ? t('sidebar.resource_pack_history') : t('sidebar.my_resources')}
                            </h3>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium opacity-80">
                            {isStorageDisabled ? (
                                <span className="text-red-200 flex items-center gap-1">
                                    <AlertCircle size={10} /> {t('status.storage_disabled')}
                                </span>
                            ) : isCloudSyncEnabled ? (
                                <>
                                        {cloudSyncStatus === 'syncing' && (
                                            <span className="text-indigo-300 flex items-center gap-1">
                                                <RefreshCw size={10} className="animate-spin" /> {t('status.syncing')}
                                            </span>
                                        )}
                                        {cloudSyncStatus === 'error' && (
                                            <span className="text-red-200 flex items-center gap-1">
                                                <AlertCircle size={10} /> {t('status.sync_error')}
                                            </span>
                                        )}
                                        {(cloudSyncStatus === 'saved' || cloudSyncStatus === 'idle') && (
                                            <span className="text-green-300 flex items-center gap-1">
                                                <Cloud size={10} /> {t('status.cloud_saved')}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    pendingSync ? (
                                        <span className="text-orange-300 flex items-center gap-1">
                                            <CloudOff size={10} /> {t('status.unsaved')}
                                        </span>
                                    ) : lastSaved ? (
                                        <span className="text-green-300 flex items-center gap-1">
                                            <Cloud size={10} /> {t('status.autosaved', { time: lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) })}
                                        </span>
                                    ) : (
                                        <span className="text-indigo-300 flex items-center gap-1">
                                            <RefreshCw size={10} className="animate-spin" /> {t('status.syncing')}
                                        </span>
                                    )
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <input aria-label={t('common.upload_file')}
                                type="file"
                                ref={projectFileInputRef}
                                onChange={handleLoadProject}
                                className="hidden"
                                accept=".json"
                            />
                            <button
                                onClick={() => projectFileInputRef.current.click()}
                                className="p-1.5 rounded hover:bg-indigo-700 text-indigo-200 transition-colors"
                                title={t('history.load_project')}
                                aria-label={t('history.load_project')}
                                data-help-key="history_load_project"
                            >
                                <Upload size={14} />
                            </button>
                            {isTeacherMode && (
                                <button
                                    onClick={initiateSaveTeacherProject}
                                    disabled={history.length === 0}
                                    className={`p-1.5 rounded hover:bg-indigo-700 text-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isSaveActionPulsing ? 'pulse-history shadow-indigo-500/50' : ''}`}
                                    title={t('history.save_teacher')}
                                    aria-label={t('history.save_teacher')}
                                    data-help-key="history_save_teacher"
                                >
                                    <Save size={14} />
                                </button>
                            )}
                            <button
                                onClick={initiateSaveStudentProject}
                                disabled={history.length === 0}
                                className={`p-1.5 rounded hover:bg-indigo-700 text-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isSaveActionPulsing ? 'pulse-history shadow-indigo-500/50' : ''}`}
                                title={isTeacherMode ? t('history.save_student') : t('history.save_work')}
                                aria-label={isTeacherMode ? t('history.save_student') : t('history.save_work')}
                                data-help-key="history_save_student"
                            >
                                {isTeacherMode ? <Lock size={14} /> : <Save size={14} />}
                            </button>
                            <button
                                onClick={shareResourcePackToCommunity}
                                disabled={history.length === 0}
                                className="p-1.5 rounded hover:bg-indigo-700 text-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={t('history.share_pack_tooltip') || 'Share this resource pack to the AlloFlow community catalog'}
                                aria-label={t('history.share_pack_aria') || 'Share resource pack to AlloFlow community catalog'}
                                data-help-key="history_share_pack"
                            >
                                <Share2 size={14} />
                            </button>
                            {isTeacherMode && (
                                <button
                                    onClick={handleSetIsProjectSettingsOpenToTrue}
                                    className="p-1.5 rounded hover:bg-indigo-700 text-indigo-200 transition-colors"
                                    title={t('history.settings')}
                                    aria-label={t('history.settings')}
                                    data-help-key="history_settings"
                                >
                                    <Settings size={14} />
                                </button>
                            )}
                            <button
                                onClick={handleToggleIsHistoryMaximized}
                                className="p-1.5 rounded hover:bg-indigo-700 text-indigo-200 transition-colors"
                                title={isHistoryMaximized ? t('history.minimize') : t('history.maximize')}
                                aria-label={isHistoryMaximized ? t('history.minimize') : t('history.maximize')}
                                data-help-key="history_max_toggle"
                            >
                                {isHistoryMaximized ? <Minimize size={14} /> : <Maximize size={14} />}
                            </button>
                            {(isTeacherMode || history.length > 0) && (
                                <button
                                    onClick={handleClearHistory}
                                    data-help-key="history_clear_button"
                                    className="p-1.5 rounded hover:bg-indigo-700 text-indigo-200 transition-colors"
                                    title={t('history.clear')}
                                    aria-label={t('history.clear')}
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    {isTeacherMode && !isIndependentMode && (
                        <div className="bg-indigo-950/50 p-2 rounded-lg border border-indigo-700/50 flex items-center gap-2">
                            <FolderOpen size={14} className="text-indigo-300 shrink-0" />
                            <select
                                value={activeUnitId}
                                data-help-key="history_filter_unit_select"
                                onChange={(e) => setActiveUnitId(e.target.value)}
                                className="flex-grow text-xs bg-indigo-900 border border-indigo-700 text-indigo-100 rounded focus:ring-1 focus:ring-indigo-500 outline-none py-1 px-2"
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
                                className="p-1 rounded bg-indigo-700 hover:bg-indigo-600 text-white transition-colors"
                                title={t('history.create_unit_tooltip')}
                                aria-label={t('history.create_unit_tooltip')}
                            >
                                <FolderPlus size={14}/>
                            </button>
                            {activeUnitId !== 'all' && activeUnitId !== 'uncategorized' && typeof onVisualizeUnit === 'function' && (
                                <button
                                    onClick={() => onVisualizeUnit(activeUnitId)}
                                    className="p-1 rounded bg-amber-700/40 hover:bg-amber-600 text-amber-200 hover:text-white transition-colors"
                                    title={t('history.visualize_unit_tooltip') || 'Visualize this unit in Throughline'}
                                    aria-label={t('history.visualize_unit_tooltip') || 'Visualize this unit in Throughline'}
                                >
                                    <span style={{fontSize:'13px',lineHeight:1}}>🧭</span>
                                </button>
                            )}
                            {activeUnitId !== 'all' && activeUnitId !== 'uncategorized' && (
                                <button
                                    data-help-key="history_delete_unit_btn"
                                    onClick={handleDeleteUnit}
                                    className="p-1 rounded hover:bg-red-900/50 text-red-600 hover:text-red-300 transition-colors"
                                    title={t('history.delete_unit_tooltip')}
                                    aria-label={t('history.delete_unit_tooltip')}
                                >
                                    <Trash2 size={14}/>
                                </button>
                            )}
                        </div>
                    )}
                    {isUnitModalOpen && (
                        <div className="bg-indigo-800 p-2 rounded-lg border border-indigo-600 animate-in slide-in-from-top-2">
                            <label className="block text-[11px] font-bold text-indigo-200 mb-1">{t('history.new_unit_label')}</label>
                            <div className="flex gap-2">
                                <input aria-label={t('common.enter_new_unit_name')}
                                    type="text"
                                    value={newUnitName}
                                    data-help-key="history_unit_name_input"
                                    onChange={(e) => setNewUnitName(e.target.value)}
                                    placeholder={t('history.new_unit_placeholder')}
                                    className="flex-grow text-xs border border-indigo-600 bg-indigo-900 text-white rounded p-1 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateUnit()}
                                />
                                <button data-help-key="history_save_unit_btn" onClick={handleCreateUnit} className="text-xs bg-indigo-600 text-white px-2 rounded hover:bg-indigo-500 border border-indigo-500">{t('common.save')}</button>
                                <button data-help-key="history_cancel_unit_btn" onClick={handleSetIsUnitModalOpenToFalse} className="text-xs text-indigo-300 hover:text-white px-1">{t('common.cancel')}</button>
                            </div>
                        </div>
                    )}
                </div>
                {/* ── Saved STEM Stations ── */}
                {(() => {
                    const stations = JSON.parse(localStorage.getItem('alloflow_stem_stations') || '[]');
                    if (stations.length === 0) return null;
                    return (
                        <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                                    📌 STEM Stations
                                    <span className="bg-emerald-500/30 text-emerald-200 text-[11px] px-1.5 py-0.5 rounded-full">{stations.length}</span>
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
                                        className="group flex items-center gap-2 p-2 rounded-lg bg-emerald-900/40 border border-emerald-700/50 hover:bg-emerald-800/60 cursor-pointer transition-all"
                                    >
                                        <div className="p-1.5 rounded-md bg-emerald-800 text-emerald-700 shrink-0">
                                            🔬
                                        </div>
                                        <div className="min-w-0 flex-grow">
                                            <div className="text-xs font-bold text-emerald-100 truncate">{st.name}</div>
                                            <div className="text-[11px] text-emerald-300">{st.tools.length} tool{st.tools.length !== 1 ? 's' : ''}</div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const updated = stations.filter(s => s.id !== st.id);
                                                localStorage.setItem('alloflow_stem_stations', JSON.stringify(updated));
                                                if (activeStation && activeStation.id === st.id) setActiveStation(null);
                                                addToast && addToast('Station removed');
                                            }}
                                            className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-red-600 hover:text-red-300 p-1 transition-opacity"
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
                    return (
                        <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                                    📌 SEL Stations
                                    <span className="bg-pink-500/30 text-pink-200 text-[11px] px-1.5 py-0.5 rounded-full">{stations.length}</span>
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
                                        className="group flex items-center gap-2 p-2 rounded-lg bg-pink-900/40 border border-pink-700/50 hover:bg-pink-800/60 cursor-pointer transition-all"
                                    >
                                        <div className="p-1.5 rounded-md bg-pink-800 text-pink-700 shrink-0">
                                            💖
                                        </div>
                                        <div className="min-w-0 flex-grow">
                                            <div className="text-xs font-bold text-pink-100 truncate">{st.name}</div>
                                            <div className="text-[11px] text-pink-300">{(st.tools || []).length} tool{(st.tools || []).length !== 1 ? 's' : ''}{(st.quests || []).length > 0 ? ` · ${st.quests.length} quest${st.quests.length !== 1 ? 's' : ''}` : ''}</div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const updated = stations.filter(s => s.id !== st.id);
                                                localStorage.setItem('alloflow_sel_stations', JSON.stringify(updated));
                                                if (activeSelStation && activeSelStation.id === st.id) setActiveSelStation(null);
                                                addToast && addToast('SEL Station removed');
                                            }}
                                            className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-red-600 hover:text-red-300 p-1 transition-opacity"
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

                <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar flex-grow pb-10" role="list" aria-label={t('sidebar.resource_pack_history') || 'Saved resources'}>
                    {getFilteredHistory().length === 0 && (
                        <div className="text-center p-4 text-indigo-200 text-xs italic">
                            {history.length === 0 ? t('history.empty_general') : t('history.empty_unit')}
                        </div>
                    )}
                    {getFilteredHistory().map((item, idx) => (
                        <div
                            key={item.id}
                            role="listitem"
                            tabIndex={editingId === null ? 0 : -1}
                            aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                            aria-label={`${(isTeacherMode && !isIndependentMode) ? String(item.title || getDefaultTitle(item.type)) : sanitizeString(item.title || getDefaultTitle(item.type))}. ${(t('history.position') || 'Position')} ${idx + 1} ${(t('common.of') || 'of')} ${getFilteredHistory().length}. ${(t('history.keyboard_reorder') || 'Use Alt plus Up or Down Arrow to reorder.')}`}
                            draggable={editingId === null && !isSyncMode}
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragEnter={(e) => handleDragEnter(e, idx)}
                            onDragOver={(e) => e.preventDefault()}
                            onDragEnd={handleDragEnd}
                            onKeyDown={(e) => {
                                if (e.target !== e.currentTarget || !e.altKey || isSyncMode) return;
                                if (e.key === 'ArrowUp' && idx > 0) {
                                    e.preventDefault();
                                    moveItem(e, idx, 'up');
                                } else if (e.key === 'ArrowDown' && idx < getFilteredHistory().length - 1) {
                                    e.preventDefault();
                                    moveItem(e, idx, 'down');
                                }
                            }}
                            className={`group flex flex-col p-2 rounded-lg transition-all border ${generatedContent && generatedContent.id === item.id ? 'bg-white text-indigo-900 border-white' : 'bg-indigo-800/50 border-indigo-700 hover:bg-indigo-800 text-indigo-100'} ${isSyncMode ? 'cursor-not-allowed opacity-60' : 'cursor-default'}`}
                        >
                            <div className="flex items-center gap-2 w-full">
                                <div
                                    className="cursor-grab active:cursor-grabbing text-indigo-600 opacity-40 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-white transition-all p-1"
                                    data-help-key="history_item_drag"
                                    title={t('common.drag_to_reorder')}
                                >
                                    <GripVertical size={14} aria-hidden="true" />
                                </div>
                                <div className="text-[11px] font-bold opacity-50 w-3.5 text-center group-hover:hidden">
                                    {idx + 1}
                                </div>
                                <div className={`p-1.5 rounded-md shrink-0 ${generatedContent && generatedContent.id === item.id ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-900 text-indigo-300'}`}>
                                    {getIconForType(item.type)}
                                </div>
                                <div className="min-w-0 flex-grow">
                                    {editingId === item.id ? (
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <input aria-label={t('common.enter_edit_title')}
                                                type="text"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                className="w-full text-xs text-indigo-900 p-1 rounded border border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                autoFocus
                                            />
                                            <button onClick={(e) => handleSaveEdit(e)} className="p-1 text-green-600 hover:bg-green-100 rounded" aria-label={t('common.save')}><Save size={12}/></button>
                                            <button onClick={(e) => handleCancelEdit(e)} className="p-1 text-red-500 hover:bg-red-100 rounded" aria-label={t('common.cancel')}><X size={12}/></button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center w-full gap-2">
                                            <div className="truncate">
                                                <div
                                                    className="text-xs font-bold truncate capitalize"
                                                    title={(isTeacherMode && !isIndependentMode) ? String(item.title || getDefaultTitle(item.type)) : sanitizeString(item.title || getDefaultTitle(item.type))}
                                                >
                                                    {(isTeacherMode && !isIndependentMode)
                                                        ? String(item.title || getDefaultTitle(item.type))
                                                        : sanitizeString(item.title || getDefaultTitle(item.type))
                                                    }
                                                </div>
                                                <div className="text-[11px] truncate opacity-70 flex items-center gap-1">
                                                    {item.unitId && units.find(u => u.id === item.unitId) && (
                                                        <span className="bg-indigo-900 px-1 rounded text-indigo-300 border border-indigo-700 flex items-center gap-0.5">
                                                            <Folder size={8}/> {units.find(u => u.id === item.unitId).name}
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
                                                    <span>{(isTeacherMode && !isIndependentMode) ? String(item.meta || "") : sanitizeString(item.meta)}</span>
                                                </div>
                                                {item.type === 'word-sounds' && item.configSummary && (
                                                    <div className="text-[11px] text-indigo-400 mt-0.5 truncate flex items-center gap-1" title={item.configSummary}>
                                                        <span className="px-1 bg-violet-900/50 rounded border border-violet-700/50">📋 {item.configSummary}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {isTeacherMode && (
                                            <button
                                                aria-label={t('common.edit')}
                                                data-help-key="history_rename_btn"
                                                onClick={(e) => handleStartEdit(e, item)}
                                                className={`p-1 rounded hover:bg-indigo-100 hover:text-indigo-700 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity ${generatedContent && generatedContent.id === item.id ? 'text-indigo-600' : 'text-indigo-600'}`}
                                                title={t('actions.rename')}
                                            >
                                                <Pencil size={10} />
                                            </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {editingId !== item.id && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isSyncMode) {
                                            addToast(t('session.teacher_control_warning'), "info");
                                            return;
                                        }
                                        handleRestoreView(item);
                                    }}
                                    className="mt-2 min-h-11 w-full rounded-lg border border-indigo-600 bg-indigo-800/70 px-3 py-2 text-left text-xs font-bold text-indigo-100 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 aria-disabled:opacity-60"
                                    aria-disabled={isSyncMode}
                                >
                                    {(t('common.open') || 'Open')}: {(isTeacherMode && !isIndependentMode) ? String(item.title || getDefaultTitle(item.type)) : sanitizeString(item.title || getDefaultTitle(item.type))}
                                </button>
                            )}
                            {isTeacherMode && (
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-indigo-800/30" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center gap-1 relative">
                                    <button
                                        type="button"
                                        aria-label={`${t('actions.move_up') || 'Move up'}: ${(isTeacherMode && !isIndependentMode) ? String(item.title || getDefaultTitle(item.type)) : sanitizeString(item.title || getDefaultTitle(item.type))}`}
                                        data-help-key="history_move_up_btn"
                                        onClick={(e) => moveItem(e, idx, 'up')}
                                        disabled={idx === 0}
                                        className="min-h-11 min-w-11 p-2 rounded hover:bg-indigo-700 disabled:opacity-30 transition-colors text-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 outline-none"
                                        title={t('actions.move_up')}
                                    >
                                        <ChevronUp size={12} />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={`${t('actions.move_down') || 'Move down'}: ${(isTeacherMode && !isIndependentMode) ? String(item.title || getDefaultTitle(item.type)) : sanitizeString(item.title || getDefaultTitle(item.type))}`}
                                        data-help-key="history_move_down_btn"
                                        onClick={(e) => moveItem(e, idx, 'down')}
                                        disabled={idx === getFilteredHistory().length - 1}
                                        className="min-h-11 min-w-11 p-2 rounded hover:bg-indigo-700 disabled:opacity-30 transition-colors text-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 outline-none"
                                        title={t('actions.move_down')}
                                    >
                                        <ChevronDown size={12} />
                                    </button>
                                    <div className="relative">
                                        <button
                                            data-help-key="history_move_to_unit_btn"
                                            onClick={() => setMovingItemId(movingItemId === item.id ? null : item.id)}
                                            className={`p-1 rounded hover:bg-indigo-700 text-indigo-300 transition-colors ${item.unitId ? 'text-yellow-400' : ''}`}
                                            title={t('history.tooltips.move_to_unit')}
                                        >
                                            <FolderInput size={12} />
                                        </button>
                                        {movingItemId === item.id && (
                                            <div className="absolute left-0 top-6 z-[100] bg-white shadow-xl border border-indigo-200 rounded-lg p-1 w-40 animate-in fade-in zoom-in-95 origin-top-left">
                                                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider px-2 py-1">{t('history.move_to_label')}</div>
                                                <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto custom-scrollbar">
                                                    <button
                                                        onClick={() => handleMoveToUnit(item.id, 'uncategorized')}
                                                        className={`text-[11px] text-left px-2 py-1.5 rounded hover:bg-indigo-50 text-slate-700 w-full truncate ${!item.unitId ? 'bg-indigo-50 font-bold text-indigo-700' : ''}`}
                                                    >
                                                        {t('history.uncategorized')}
                                                    </button>
                                                    {units.map(u => (
                                                        <button
                                                            key={u.id}
                                                            onClick={() => handleMoveToUnit(item.id, u.id)}
                                                            className={`text-[11px] text-left px-2 py-1.5 rounded hover:bg-indigo-50 text-slate-700 w-full truncate ${item.unitId === u.id ? 'bg-indigo-50 font-bold text-indigo-700' : ''}`}
                                                        >
                                                            {u.name}
                                                        </button>
                                                    ))}
                                                    {units.length === 0 && (
                                                        <div className="text-[11px] text-slate-600 px-2 py-1 italic">{t('history.no_units')}</div>
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
                                        className={`p-1 ${generatedContent && generatedContent.id === item.id ? 'text-emerald-700' : 'text-emerald-300'} hover:text-emerald-300 hover:bg-emerald-900/30 rounded transition-colors flex items-center gap-1 text-[11px]`}
                                        title={t('common.export_csv_for_rti')}
                                    >
                                        <Download size={12} /> CSV
                                    </button>
                                )}
                                <button
                                    aria-label={t('common.delete')}
                                    onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                                    className="p-1 text-indigo-300 hover:text-red-300 hover:bg-indigo-900/50 rounded transition-colors flex items-center gap-1 text-[11px]"
                                    title={t('history.tooltips.remove_item')}
                                    data-help-key="resource_delete_button"
                                >
                                    <Trash2 size={12} /> {t('actions.remove')}
                                </button>
                            </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
  );
}
