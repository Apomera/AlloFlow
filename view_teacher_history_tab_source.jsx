/**
 * AlloFlow — Teacher History Tab Module
 *
 * Roster-groups strip in the teacher-mode sidebar's History tab. Shows
 * colored group pills, a "Differentiate by Group" CTA, and Manage Roster /
 * Bridge Mode quick-action buttons.
 *
 * Extracted from AlloFlowANTI.txt lines 21320-21367 (May 2026).
 *
 * Required props:
 *   handleApplyRosterGroup — fires when a group pill is clicked
 *   hasSourceOrAnalysis    — gate for the Differentiate CTA
 *   rosterKey              — { groups: {gid: {name, color, profile}} }
 *   setBridgeSendOpen      — opens Bridge Mode modal
 *   setIsRosterKeyOpen     — opens roster management modal
 *   t                      — translation function
 *
 * NOTE: setShowBatchConfig is referenced in the source but UNDEFINED in
 * AlloFlowANTI.txt (caught by the dep enumerator). Preserved as a noop
 * fallback to match existing broken-button behavior. TODO: wire up real
 * batch-config state setter.
 *
 * Icons (from window globals): ClipboardList, Settings, Layers
 */
function TeacherHistoryTab({
  handleApplyRosterGroup,
  hasSourceOrAnalysis,
  rosterKey,
  setBridgeSendOpen,
  setIsRosterKeyOpen,
  setShowBatchConfig,
  t,
}) {
  const noop = () => null;
  const ClipboardList = window.ClipboardList || noop;
  const Settings = window.Settings || noop;
  const Layers = window.Layers || noop;
  // setShowBatchConfig is a phantom in the source; fall back to noop to
  // avoid runtime TypeError if the rare-path button is clicked.
  const safeBatchConfig = setShowBatchConfig || (() => {});

  return (
    <div id="ui-roster-strip" className="bg-white rounded-3xl shadow-indigo-500/10 border border-slate-400 overflow-hidden shrink-0">
      <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
        <div className="text-sm font-bold text-indigo-800 flex items-center gap-2">
          <ClipboardList size={16} /> {t('roster.strip_title') || 'Class Groups'}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setBridgeSendOpen(true)} className="p-1.5 rounded-md hover:bg-teal-100 text-teal-600" title={t('roster.bridge_mode_btn') || '🌐 Bridge Mode'} aria-label={t('roster.bridge_mode_btn') || 'Bridge Mode'} data-help-key="bridge_mode_button">
            🌐
          </button>
          <button onClick={() => setIsRosterKeyOpen(true)} className="p-1.5 rounded-md hover:bg-indigo-100 text-indigo-600" title={t('roster.title') || 'Manage Roster'} aria-label={t('roster.title')} data-help-key="roster_manage_button">
            <Settings size={14} />
          </button>
        </div>
      </div>
      <div className="p-3">
        {rosterKey && Object.keys(rosterKey.groups || {}).length > 0 ? (
          <>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {Object.entries(rosterKey.groups).map(([gid, g]) => (
                <button key={gid} onClick={() => handleApplyRosterGroup(gid)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all hover:scale-105 border cursor-pointer"
                  style={{ backgroundColor: (g.color || '#6366f1') + '20', borderColor: (g.color || '#6366f1') + '60', color: (g.color === '#f5f5f5' || !g.color) ? '#334155' : g.color }}
                  title={`${g.name} · ${g.profile?.gradeLevel || 'No grade'} · ${g.profile?.leveledTextLanguage || 'English'}`}
                >
                  <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ backgroundColor: g.color || '#6366f1' }} />
                  {g.name}
                </button>
              ))}
            </div>
            <button onClick={() => { setIsRosterKeyOpen(true); setTimeout(() => safeBatchConfig(true), 300); }}
              disabled={!hasSourceOrAnalysis}
              className="w-full px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 border border-amber-600"
            >
              <Layers size={14} /> {t('roster.batch_generate') || 'Differentiate by Group'}
            </button>
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-slate-600 mb-1">{t('roster.strip_empty') || 'No class roster yet'}</p>
            <button onClick={() => setIsRosterKeyOpen(true)} className="text-xs text-indigo-600 font-bold hover:underline">
              {t('roster.strip_create') || 'Create one'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
