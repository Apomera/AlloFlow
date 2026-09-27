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
  onQuickAddGroup,
  defaultGrade,
  defaultLanguage,
  t,
}) {
  const GRADE_OPTIONS = ['Pre-K', 'Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];
  const [quickName, setQuickName] = React.useState('');
  const [quickGrade, setQuickGrade] = React.useState(GRADE_OPTIONS.includes(defaultGrade) ? defaultGrade : '5th Grade');
  const [quickLanguage, setQuickLanguage] = React.useState(defaultLanguage || 'English');
  const [quickMessage, setQuickMessage] = React.useState('');
  const hasGroups = !!(rosterKey && Object.keys(rosterKey.groups || {}).length > 0);
  const submitQuickGroup = (event) => {
    event.preventDefault();
    const result = typeof onQuickAddGroup === 'function' ? onQuickAddGroup(quickName, quickGrade, quickLanguage) : 'unavailable';
    if (result === 'added') { setQuickName(''); setQuickMessage(''); }
    else if (result === 'duplicate') setQuickMessage(t('roster.quick_duplicate') || 'You already have a group with that name.');
    else if (result === 'empty') setQuickMessage(t('roster.quick_need_name') || 'Give the group a name first.');
  };
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
          {hasGroups && (
          <button type="button" onClick={() => setIsRosterKeyOpen(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" data-help-key="roster_manage_btn">
              <Settings size={14} aria-hidden="true" /> {t('roster.edit_groups') || 'Edit groups'}
            </button>
          )}
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
        ) : typeof onQuickAddGroup === 'function' ? (
          <form onSubmit={submitQuickGroup} data-help-key="roster_quick_add" className="grid gap-2" aria-labelledby="roster-quick-title">
            <p id="roster-quick-title" className="text-xs font-bold text-slate-800">{t('roster.quick_title') || 'Add your first group'}</p>
            <label className="grid gap-1 text-xs font-semibold text-slate-700">{t('roster.quick_name') || 'Group name'}
              <input value={quickName} onChange={(e) => setQuickName(e.target.value)} maxLength={60} placeholder={t('roster.quick_name_example') || 'For example: Reading support'} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-xs font-semibold text-slate-700">{t('roster.quick_grade') || 'Grade'}
                <select value={quickGrade} onChange={(e) => setQuickGrade(e.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900">
                  {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-700">{t('roster.quick_language') || 'Language'}
                <input value={quickLanguage} onChange={(e) => setQuickLanguage(e.target.value)} maxLength={40} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900" />
              </label>
            </div>
            {quickMessage && <p role="alert" className="text-xs font-semibold text-red-700">{quickMessage}</p>}
            <button type="submit" className="min-h-11 rounded-lg bg-indigo-600 px-3 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">{t('roster.quick_add') || 'Add group'}</button>
            <button type="button" onClick={() => setIsRosterKeyOpen(true)} className="min-h-11 justify-self-start px-1 text-xs font-bold text-indigo-700 underline underline-offset-2 hover:text-indigo-900">{t('roster.open_full') || 'Open the full class roster'}</button>
          </form>
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
