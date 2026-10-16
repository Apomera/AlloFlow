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
  gradeOptions = [],
  languageOptions = [],
  t,
}) {
  const label = (key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };
  const gradeLabel = grade => {
    const number = /^(\d+)(?:st|nd|rd|th) Grade$/.exec(grade);
    const key = grade === 'Kindergarten' ? 'k' : grade === 'College' ? 'college' : grade === 'Graduate Level' ? 'grad' : number ? 'g' + number[1] : '';
    return key ? label('grades.' + key, grade) : grade;
  };
  const [quickOpen, setQuickOpen] = React.useState(false);
  const [quickName, setQuickName] = React.useState('');
  const [quickGrade, setQuickGrade] = React.useState('');
  const [quickLanguage, setQuickLanguage] = React.useState('');
  const [quickMessage, setQuickMessage] = React.useState(null);
  const [quickSaving, setQuickSaving] = React.useState(false);
  const quickSavingRef = React.useRef(false);
  const quickSaveEpochRef = React.useRef(0);
  const quickToggleRef = React.useRef(null);
  const quickNameRef = React.useRef(null);
  const hasGroups = Object.keys(rosterKey?.groups || {}).length > 0;
  const canQuickAdd = typeof onQuickAddGroup === 'function' && gradeOptions.length > 0 && languageOptions.length > 0;
  const classId = rosterKey?.classId || '';
  React.useEffect(() => {
    setQuickOpen(false);
    setQuickName('');
    setQuickMessage(null);
    setQuickSaving(false);
    quickSavingRef.current = false;
    return () => { quickSaveEpochRef.current++; };
  }, [classId]);
  React.useEffect(() => {
    if (quickOpen) quickNameRef.current?.focus();
  }, [quickOpen]);
  const toggleQuickGroup = () => {
    if (!quickOpen) {
      setQuickGrade(gradeOptions.includes(defaultGrade) ? defaultGrade : gradeOptions[0]);
      setQuickLanguage(languageOptions.includes(defaultLanguage) ? defaultLanguage : languageOptions[0]);
      setQuickMessage(null);
    }
    setQuickOpen(value => !value);
  };
  const submitQuickGroup = async event => {
    event.preventDefault();
    if (quickSavingRef.current) return;
    const epoch = quickSaveEpochRef.current;
    quickSavingRef.current = true;
    setQuickSaving(true);
    let result = 'unavailable';
    try {
      if (!quickName.trim()) result = 'empty';
      else if (canQuickAdd && gradeOptions.includes(quickGrade) && languageOptions.includes(quickLanguage)) {
        result = await onQuickAddGroup(quickName.trim(), quickGrade, quickLanguage);
      }
    } catch (_) { /* Keep the draft available after a refused save. */ }
    if (epoch !== quickSaveEpochRef.current) return;
    quickSavingRef.current = false;
    setQuickSaving(false);
    if (result === 'added') {
      setQuickName('');
      setQuickOpen(false);
      setQuickMessage({ error: false, text: label('roster.quick_added', 'Group added.') });
      quickToggleRef.current?.focus();
      return;
    }
    const errors = {
      empty: label('roster.quick_need_name', 'Enter a group name.'),
      duplicate: label('roster.quick_duplicate', 'A group with that name already exists.'),
      limit: label('roster.quick_limit', 'The group limit has been reached. Manage existing groups before adding another.'),
      unavailable: label('roster.quick_unavailable', 'The group could not be added. Your draft is unchanged.'),
    };
    setQuickMessage({ error: true, text: errors[result] || errors.unavailable });
  };
  const noop = () => null;
  const ClipboardList = window.ClipboardList || noop;
  const Settings = window.Settings || noop;
  const Layers = window.Layers || noop;
  const Plus = window.Plus || noop;

  return (
    <div id="ui-roster-strip" data-help-key="class_groups_strip" className="bg-white rounded-lg border border-slate-400 overflow-hidden shrink-0">
      <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
        <div className="text-sm font-bold text-indigo-800 flex items-center gap-2">
          <ClipboardList size={16} /> {t('roster.strip_title') || 'Class Groups'}
        </div>
        <div className="flex items-center gap-1">
          {/* Bridge moved to a header button (🌐 Bridge) for discoverability — removed here to avoid redundancy. */}
          <button type="button" onClick={() => setIsRosterKeyOpen(true)} className="min-h-11 min-w-11 p-1.5 rounded-md hover:bg-indigo-100 text-indigo-600" title={t('roster.title') || 'Manage Roster'} aria-label={label('roster.title', 'Manage Roster')} data-help-key="roster_manage_button">
            <Settings size={14} />
          </button>
        </div>
      </div>
      <div className="p-3">
        {hasGroups ? (
          <>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {Object.entries(rosterKey.groups).map(([gid, g]) => (
                <button type="button" key={gid} onClick={() => handleApplyRosterGroup(gid)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all hover:scale-105 border cursor-pointer"
                  style={{ backgroundColor: (g.color || '#6366f1') + '20', borderColor: (g.color || '#6366f1') + '60', color: (g.color === '#f5f5f5' || !g.color) ? '#334155' : g.color }}
                  title={`${g.name} · ${g.profile?.gradeLevel || 'No grade'} · ${g.profile?.leveledTextLanguage || 'English'}`}
                >
                  <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ backgroundColor: g.color || '#6366f1' }} />
                  {g.name}
                </button>
              ))}
            </div>
            <button type="button" onClick={onDifferentiateByGroup}
              disabled={!hasSourceOrAnalysis}
              className="w-full px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 border border-amber-600"
            >
              <Layers size={14} /> {t('roster.batch_generate') || 'Differentiate by Group'}
            </button>
          </>
        ) : (
          <p className="text-xs text-slate-600">{label('roster.strip_empty_groups', 'No groups yet.')}</p>
        )}
        {canQuickAdd && <button ref={quickToggleRef} type="button" onClick={toggleQuickGroup} disabled={quickSaving} aria-expanded={quickOpen} aria-controls="roster-quick-group-form" className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
          <Plus size={14} aria-hidden="true" /> {label('roster.quick_add', 'Add group')}
        </button>}
        {quickOpen && canQuickAdd && <form id="roster-quick-group-form" onSubmit={submitQuickGroup} className="mt-2 grid gap-2 border-t border-slate-200 pt-3" aria-busy={quickSaving} aria-label={label('roster.quick_add', 'Add group')}>
          <label className="grid gap-1 text-xs font-semibold text-slate-700">{label('roster.quick_name', 'Group name')}
            <input ref={quickNameRef} value={quickName} disabled={quickSaving} onChange={event => { setQuickName(event.target.value); setQuickMessage(null); }} maxLength={60} className="min-h-11 min-w-0 rounded-lg border border-slate-400 bg-white px-2 text-sm text-slate-900" />
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="grid min-w-0 gap-1 text-xs font-semibold text-slate-700">{label('roster.quick_grade', 'Grade')}
              <select value={quickGrade} disabled={quickSaving} onChange={event => setQuickGrade(event.target.value)} className="min-h-11 min-w-0 w-full rounded-lg border border-slate-400 bg-white px-2 text-sm text-slate-900">
                {gradeOptions.map(grade => <option key={grade} value={grade}>{gradeLabel(grade)}</option>)}
              </select>
            </label>
            <label className="grid min-w-0 gap-1 text-xs font-semibold text-slate-700">{label('roster.quick_language', 'Language')}
              <select value={quickLanguage} disabled={quickSaving} onChange={event => setQuickLanguage(event.target.value)} className="min-h-11 min-w-0 w-full rounded-lg border border-slate-400 bg-white px-2 text-sm text-slate-900">
                {languageOptions.map(language => <option key={language} value={language}>{language === 'English' ? label('languages.english', 'English') : language}</option>)}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={quickSaving} className="min-h-11 rounded-lg bg-indigo-700 px-3 text-xs font-bold text-white hover:bg-indigo-800 disabled:opacity-50">{quickSaving ? label('common.saving', 'Saving...') : label('roster.quick_add', 'Add group')}</button>
            <button type="button" disabled={quickSaving} onClick={() => { setQuickOpen(false); setQuickMessage(null); quickToggleRef.current?.focus(); }} className="min-h-11 rounded-lg border border-slate-400 px-3 text-xs font-bold text-slate-700 disabled:opacity-50">{label('common.cancel', 'Cancel')}</button>
          </div>
        </form>}
        {quickMessage && <p role={quickMessage.error ? 'alert' : 'status'} className={`mt-2 text-xs font-semibold ${quickMessage.error ? 'text-red-700' : 'text-emerald-800'}`}>{quickMessage.text}</p>}
      </div>
    </div>
  );
}
