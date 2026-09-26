/**
 * AlloFlow — Teacher History Tab Module
 *
 * Roster-groups strip in the teacher-mode sidebar's History tab. Shows
 * colored group pills, a "Differentiate by Group" CTA, and a Manage Roster
 * quick-action button. (Bridge moved to a header button for discoverability.)
 *
 * Extracted from AlloFlowANTI.txt lines 21320-21367 (May 2026).
 *
 * Required props:
 *   handleApplyRosterGroup — fires when a group pill is clicked
 *   hasSourceOrAnalysis    — gate for the Differentiate CTA
 *   rosterKey              — { groups: {gid: {name, color, profile}} }
 *   setIsRosterKeyOpen     — opens roster management modal
 *   t                      — translation function
 *
 *   onDifferentiateByGroup — opens the roster directly to batch configuration
 *
 * Icons (from window globals): ClipboardList, Settings, Layers
 */
function TeacherHistoryTab({
  handleApplyRosterGroup,
  hasSourceOrAnalysis,
  rosterKey,
  setIsRosterKeyOpen,
  onDifferentiateByGroup,
  t,
}) {
  const noop = () => null;
  const ClipboardList = window.ClipboardList || noop;
  const Settings = window.Settings || noop;
  const Layers = window.Layers || noop;

  return (
    <div id="ui-roster-strip" data-help-key="class_groups_strip" className="bg-white rounded-3xl shadow-indigo-500/10 border border-slate-400 overflow-hidden shrink-0">
      <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
        <div className="text-sm font-bold text-indigo-800 flex items-center gap-2">
          <ClipboardList size={16} /> {t('roster.strip_title') || 'Class Groups'}
        </div>
        <div className="flex items-center gap-1">
          {/* Bridge moved to a header button (🌐 Bridge) for discoverability — removed here to avoid redundancy. */}
          <button type="button" onClick={() => setIsRosterKeyOpen(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" data-help-key="roster_manage_btn">
            <Settings size={14} aria-hidden="true" /> {t('roster.edit_groups') || 'Edit groups'}
          </button>
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs leading-relaxed text-slate-600 mb-2">{t('roster.strip_intro') || 'Give each group its own grade and language. Tap a group to create for it, or make a version for every group.'}</p>
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
            <button onClick={onDifferentiateByGroup}
              disabled={!hasSourceOrAnalysis}
              className="w-full px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 border border-amber-600"
            >
              <Layers size={14} /> {t('roster.batch_generate') || 'Differentiate by Group'}
            </button>
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-slate-600 mb-1">{t('roster.strip_empty_groups') || 'No groups yet.'}</p>
            <button type="button" onClick={() => setIsRosterKeyOpen(true)} className="inline-flex min-h-11 items-center px-2 text-xs text-indigo-700 font-bold underline underline-offset-2 hover:text-indigo-900">
              {t('roster.strip_setup_groups') || 'Set up groups'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
