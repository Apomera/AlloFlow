// WCAG 2.4.3: Focus management — save/restore focus on modal open/close.
// Added in commit ba27e92 to module.js only; back-ported here to close source/module drift.
// Actually USED in teacher by the Escape-to-close handler (vs dead code in games/visual_panel/story_forge).
var _alloFocusTrigger = null;
function alloSaveFocus() { _alloFocusTrigger = document.activeElement; }
function alloRestoreFocus() { if (_alloFocusTrigger && typeof _alloFocusTrigger.focus === 'function') { try { _alloFocusTrigger.focus(); } catch(e) {} _alloFocusTrigger = null; } }

const RosterKeyPanel = React.memo(({ isOpen, onClose, rosterKey, setRosterKey, onApplyGroup, onSyncToSession, onBatchGenerate, activeSessionCode, t, isParentMode, isIndependentMode, onOpenSubmissionInbox }) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#4F46E5');
  const [newStudentName, setNewStudentName] = useState('');
  const [rosterAdj, setRosterAdj] = useState('');
  const [rosterAnimal, setRosterAnimal] = useState('');
  const [useCustomName, setUseCustomName] = useState(false);
  const rosterAdjectives = t('codenames.adjectives') || [];
  const rosterAnimals = t('codenames.animals') || [];
  const randomizeRosterName = () => {
    if (rosterAdjectives.length > 0 && rosterAnimals.length > 0) {
      setRosterAdj(rosterAdjectives[Math.floor(Math.random() * rosterAdjectives.length)]);
      setRosterAnimal(rosterAnimals[Math.floor(Math.random() * rosterAnimals.length)]);
    }
  };
  const [newStudentGroup, setNewStudentGroup] = useState('');
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [showBatchConfig, setShowBatchConfig] = useState(false);
  const [batchTypes, setBatchTypes] = useState({ simplified: true, glossary: false, quiz: false, 'sentence-frames': false, brainstorm: false, faq: false, outline: false, adventure: false, 'concept-sort': false, image: false, timeline: false });
  const fileInputRef = useRef(null);
  const panelRef = useRef(null);
  useFocusTrap(panelRef, isOpen);
  if (!isOpen) return null;
  const groups = rosterKey?.groups || {};
  const students = rosterKey?.students || {};
  const groupIds = Object.keys(groups);
  const getStudentsInGroup = (gId) => Object.entries(students).filter(([_, g]) => g === gId).map(([name]) => name);
  const getUnassigned = () => Object.entries(students).filter(([_, g]) => !g || !groups[g]).map(([name]) => name);
  const handleImport = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.groups || data.students) {
          setRosterKey({ className: data.className || '', groups: data.groups || {}, students: data.students || {} });
        }
      } catch(err) { console.error('Invalid roster JSON:', err); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  const handleExport = () => {
    const exportData = {
            ...(rosterKey || { groups: {}, students: {} }),
            exportVersion: 2,
            exportDate: new Date().toISOString()
        };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roster_key_' + (rosterKey?.className || 'roster').replace(/[^a-zA-Z0-9]/g, '_') + '_' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  // ── Offline submissions setup ──
  // Generates an RSA-OAEP class keypair, downloads the private key as
  // `class-key.alloflow` for the teacher's class Drive folder, and stores
  // the public JWK in rosterKey.submissionKey so HTML exports embed it.
  // Phase 1, May 11 2026. Teacher MUST keep the downloaded file safe;
  // without it, encrypted student submissions are unrecoverable.
  const handleSetupOfflineSubmissions = async () => {
    const SC = window.AlloModules && window.AlloModules.SubmissionCrypto;
    if (!SC || typeof SC.generateClassKeypair !== 'function') {
      alert('Submission crypto module not loaded yet. Please refresh and try again.');
      return;
    }
    if (rosterKey?.submissionKey?.publicJwk) {
      const confirmReplace = confirm(
        'This class already has offline submissions set up.\n\n' +
        'Generating a new key will INVALIDATE the old one — any student files saved with the old key will no longer be decryptable.\n\n' +
        'Continue anyway?'
      );
      if (!confirmReplace) return;
    }
    try {
      const { publicJwk, privateJwk } = await SC.generateClassKeypair();
      const classId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ('class-' + Date.now());
      const createdAt = new Date().toISOString();
      // Download the private key file
      const keyFile = {
        schemaVersion: 1,
        kind: 'alloflow-class-key',
        className: rosterKey?.className || '',
        classId: classId,
        createdAt: createdAt,
        privateJwk: privateJwk
      };
      const blob = new Blob([JSON.stringify(keyFile, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeClass = (rosterKey?.className || 'class').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
      a.href = url;
      a.download = 'class-key_' + safeClass + '_' + createdAt.slice(0, 10) + '.alloflow';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 200);
      // Store the public key in roster for future exports
      setRosterKey(prev => ({
        ...(prev || { groups: {}, students: {} }),
        className: prev?.className || '',
        groups: prev?.groups || {},
        students: prev?.students || {},
        submissionKey: { publicJwk: publicJwk, classId: classId, createdAt: createdAt }
      }));
      // First-time warning
      alert(
        '🔐 Offline submissions are set up for this class.\n\n' +
        'IMPORTANT: Save the downloaded "class-key" file in a safe place (your class Google Drive folder is recommended). Without it, you cannot open student submissions.\n\n' +
        'AlloFlow does not keep a copy of this file. If you lose it, the encrypted submissions cannot be recovered.'
      );
    } catch (err) {
      console.error('handleSetupOfflineSubmissions failed:', err);
      alert('Could not set up submissions: ' + (err && err.message ? err.message : 'unknown error'));
    }
  };
  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    const id = newGroupName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setRosterKey(prev => ({
      ...(prev || { students: {} }),
      className: prev?.className || '',
      groups: { ...(prev?.groups || {}), [id]: { name: newGroupName.trim(), color: newGroupColor, profile: { gradeLevel: '3rd Grade', leveledTextLanguage: 'English' } } },
      students: prev?.students || {}
    }));
    setNewGroupName('');
    setExpandedGroup(id);
  };
  const handleRemoveGroup = (gId) => {
    setRosterKey(prev => {
      const ng = { ...prev.groups }; delete ng[gId];
      const ns = { ...prev.students };
      Object.keys(ns).forEach(s => { if (ns[s] === gId) ns[s] = ''; });
      return { ...prev, groups: ng, students: ns };
    });
  };
  const handleUpdateGroupProfile = (gId, field, value) => {
    setRosterKey(prev => ({
      ...prev,
      groups: { ...prev.groups, [gId]: { ...prev.groups[gId], profile: { ...prev.groups[gId].profile, [field]: value } } }
    }));
  };
  const handleUpdateGroupMeta = (gId, field, value) => {
    setRosterKey(prev => ({
      ...prev,
      groups: { ...prev.groups, [gId]: { ...prev.groups[gId], [field]: value } }
    }));
  };
  const handleAddStudent = () => {
    const codename = rosterAdj && rosterAnimal ? `${rosterAdj} ${rosterAnimal}` : '';
    if (!codename) return;
    const displayName = useCustomName && newStudentName.trim() ? newStudentName.trim() : '';
    setRosterKey(prev => ({
      ...(prev || { groups: {} }),
      className: prev?.className || '',
      groups: prev?.groups || {},
      students: { ...(prev?.students || {}), [codename]: newStudentGroup || '' },
      displayNames: { ...(prev?.displayNames || {}), ...(displayName ? { [codename]: displayName } : {}) }
    }));
    setNewStudentName('');
    randomizeRosterName();
  };
  const handleRemoveStudent = (name) => {
    setRosterKey(prev => {
      const ns = { ...prev.students }; delete ns[name];
      return { ...prev, students: ns };
    });
  };
  const handleMoveStudent = (name, toGroup) => {
    setRosterKey(prev => ({ ...prev, students: { ...prev.students, [name]: toGroup } }));
  };
  const COLORS = ['#4F46E5', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#BE185D', '#65A30D'];
  const GRADE_OPTIONS = ['Pre-K', 'Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];
  const LANG_OPTIONS = ['English', 'Spanish', 'French', 'Arabic', 'Somali', 'Vietnamese', 'Portuguese', 'Mandarin', 'Korean', 'Tagalog', 'Russian', 'Japanese'];
  const ProfileField = ({ label, value, field, gId, type = 'text', options }) => (
    <div className="flex items-center gap-2 text-xs">
      <span className="font-bold text-slate-600 w-24 shrink-0">{label}:</span>
      {type === 'select' ? (
        <select value={value || ''} onChange={e => handleUpdateGroupProfile(gId, field, e.target.value)}
          aria-label={label}
          className="flex-1 px-2 py-1 rounded-lg border border-slate-400 text-slate-700 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none">
          <option value="">—</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'range' ? (
        <div className="flex-1 flex items-center gap-2">
          <input type="range" min="0.5" max="1.5" step="0.05" value={value || 1}
            onChange={e => handleUpdateGroupProfile(gId, field, parseFloat(e.target.value))}
            aria-label={label}
            className="flex-1 accent-indigo-500" />
          <span className="text-slate-600 font-mono w-10 text-right">{(value || 1).toFixed(2)}x</span>
        </div>
      ) : type === 'toggle' ? (
        <button onClick={() => handleUpdateGroupProfile(gId, field, !value)}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${value ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
          {value ? 'On' : 'Off'}
        </button>
      ) : (
        <input type="text" value={value || ''} onChange={e => handleUpdateGroupProfile(gId, field, e.target.value)}
          aria-label={label}
          placeholder="—" className="flex-1 px-2 py-1 rounded-lg border border-slate-400 text-slate-700 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
      )}
    </div>
  );
  return (
    <div ref={panelRef} role="dialog" aria-modal="true" className="fixed inset-0 z-[260] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border-2 border-indigo-100 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div data-help-key="roster_panel_header">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <ClipboardList size={20} className="text-indigo-500" /> {isParentMode ? 'Family Learning Profiles' : (isIndependentMode ? 'My Learning Profile' : (t('roster.title') || 'Class Roster & Progress Tracking'))}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">{isParentMode ? 'Manage family member profiles and track learning progress' : (isIndependentMode ? 'Manage your learning profile and track your progress' : (t('roster.subtitle') || 'Organize student groups with differentiated profiles for instruction'))}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors" aria-label={t('common.close')}>
            <X size={20} className="text-slate-600" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-slate-50 bg-slate-50/50">
          <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1.5">
            <Upload size={14} /> {t('roster.import') || 'Import JSON'}
          </button>
          <button onClick={handleExport} disabled={!rosterKey} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors flex items-center gap-1.5 disabled:opacity-40">
            <Download size={14} /> {t('roster.export') || 'Export JSON'}
          </button>
          <button
            onClick={handleSetupOfflineSubmissions}
            disabled={!rosterKey}
            title={rosterKey?.submissionKey?.publicJwk
              ? 'Offline submissions are active for this class. Click to regenerate (invalidates the existing key).'
              : 'Generate a class keypair so students can save HTML worksheets back to you.'}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-40 ${
              rosterKey?.submissionKey?.publicJwk
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <Lock size={14} />
            {rosterKey?.submissionKey?.publicJwk
              ? (t('roster.submissions_active') || 'Submissions On')
              : (t('roster.setup_submissions') || 'Set up offline submissions')}
          </button>
          {typeof onOpenSubmissionInbox === 'function' && (
            <button
              onClick={onOpenSubmissionInbox}
              disabled={!rosterKey?.submissionKey?.publicJwk}
              title={rosterKey?.submissionKey?.publicJwk
                ? 'Open the submission inbox to decrypt and review student-submitted HTML files.'
                : 'Set up offline submissions first to use the inbox.'}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1.5 disabled:opacity-40"
            >
              📥 {t('roster.import_submissions') || 'Import submissions'}
            </button>
          )}
          <button onClick={() => setShowBatchConfig(true)} disabled={!rosterKey || Object.keys(rosterKey?.groups || {}).length === 0} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5 disabled:opacity-40 border border-amber-200">
            <Layers size={14} /> {t('roster.batch_generate') || 'Differentiate by Group'}
          </button>
          {activeSessionCode && (
            <button onClick={onSyncToSession} disabled={!rosterKey || groupIds.length === 0} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors flex items-center gap-1.5 disabled:opacity-40 ml-auto">
              <RefreshCw size={14} /> {t('roster.sync_session') || 'Sync to Live Session'}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" aria-label={t('roster.import') || 'Import roster JSON'} />
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('roster.class_name') || 'Class Name'}:</label>
            <input type="text" value={rosterKey?.className || ''} onChange={e => setRosterKey(prev => ({ ...(prev || { groups: {}, students: {} }), className: e.target.value }))}
              placeholder={t('common.placeholder_ms_smith_period_3')}
              aria-label={t('roster.class_name') || 'Class name'}
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-400 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
          </div>
          {groupIds.map(gId => {
            const group = groups[gId];
            const gStudents = getStudentsInGroup(gId);
            const isExpanded = expandedGroup === gId;
            return (
              <div key={gId} className="border border-slate-400 rounded-xl overflow-hidden transition-all hover:border-indigo-200">
                <button onClick={() => setExpandedGroup(isExpanded ? null : gId)}
                  className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: group.color || '#4F46E5' }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-800 truncate">{group.name}</div>
                    <div className="text-[11px] text-slate-600">{gStudents.length} student{gStudents.length !== 1 ? 's' : ''} · {group.profile?.gradeLevel || '—'} · {group.profile?.leveledTextLanguage || '—'}</div>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                {isExpanded && (
                  <div className="p-4 space-y-3 border-t border-slate-100 bg-white">
                    <div className="flex gap-2 items-center mb-2">
                      <input type="text" value={group.name} onChange={e => handleUpdateGroupMeta(gId, 'name', e.target.value)}
                        aria-label={t('roster.group_name') || 'Group name'}
                        className="flex-1 px-2 py-1 rounded-lg border border-slate-400 text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
                      <div className="flex gap-1">
                        {COLORS.map(c => (
                          <button key={c} onClick={() => handleUpdateGroupMeta(gId, 'color', c)}
                            className={`w-5 h-5 rounded-full border-2 transition-all ${group.color === c ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 bg-slate-50 p-3 rounded-xl">
                      <ProfileField label={t('roster.grade') || 'Grade'} value={group.profile?.gradeLevel} field="gradeLevel" gId={gId} type="select" options={GRADE_OPTIONS} />
                      <ProfileField label={t('roster.language') || 'Language'} value={group.profile?.leveledTextLanguage} field="leveledTextLanguage" gId={gId} type="select" options={LANG_OPTIONS} />
                      <ProfileField label={t('roster.reading') || 'Reading Lvl'} value={group.profile?.readingLevel} field="readingLevel" gId={gId} />
                      <ProfileField label={t('roster.interests') || 'Interests'} value={group.profile?.studentInterests} field="studentInterests" gId={gId} />
                      <ProfileField label={t('roster.dok') || 'DOK Level'} value={group.profile?.dokLevel} field="dokLevel" gId={gId} type="select" options={['1', '2', '3', '4']} />
                      <ProfileField label={t('roster.tts_speed') || 'TTS Speed'} value={group.profile?.ttsSpeed} field="ttsSpeed" gId={gId} type="range" />
                      <ProfileField label={t('roster.karaoke') || 'Karaoke'} value={group.profile?.karaokeMode} field="karaokeMode" gId={gId} type="toggle" />
                      <ProfileField label={t('roster.simplify') || 'Simplify'} value={group.profile?.simplifyLevel} field="simplifyLevel" gId={gId} type="select" options={['basic', 'intermediate', 'advanced']} />
                      <ProfileField label={t('roster.custom') || 'Custom Instr.'} value={group.profile?.leveledTextCustomInstructions} field="leveledTextCustomInstructions" gId={gId} />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('roster.students_in_group') || 'Students'}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {gStudents.map(name => (
                          <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                            {name}
                            {rosterKey?.progressHistory?.[name]?.length > 0 && (
                              <span className="text-[11px] bg-indigo-100 text-indigo-500 px-1 py-0.5 rounded-full font-mono" title={`${rosterKey.progressHistory[name].length} sessions`}>
                                {rosterKey.progressHistory[name].length}s
                              </span>
                            )}
                            <button onClick={() => handleMoveStudent(name, '')} className="hover:text-red-500 transition-colors ml-0.5" aria-label={'Remove ' + name}>
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                        {gStudents.length === 0 && <span className="text-xs text-slate-600 italic">{t('roster.no_students') || 'No students assigned'}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button onClick={() => onApplyGroup(gId)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1.5">
                        <Sparkles size={12} /> {t('roster.apply_to_generator') || 'Apply to Generator'}
                      </button>
                      <button onClick={() => handleRemoveGroup(gId)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors ml-auto flex items-center gap-1.5">
                        <Trash2 size={12} /> {t('roster.delete_group') || 'Delete Group'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex gap-2 items-center p-3 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-300 transition-colors">
            <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
              placeholder={t('roster.new_group_placeholder') || 'New group name...'}
              aria-label={t('roster.new_group_placeholder') || 'New group name'}
              onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-400 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
            <div className="flex gap-1">
              {COLORS.slice(0, 4).map(c => (
                <button key={c} onClick={() => setNewGroupColor(c)}
                  className={`w-4 h-4 rounded-full border-2 ${newGroupColor === c ? 'border-slate-800' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <button onClick={handleAddGroup} disabled={!newGroupName.trim()}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-40 flex items-center gap-1">
              <Plus size={14} /> {t('roster.add_group') || 'Add'}
            </button>
          </div>
           <div className="mt-4 pt-4 border-t border-slate-100">
             <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
               <Users size={14} /> {t('roster.manage_students') || 'Manage Students'}
             </div>
             <div className="flex flex-col gap-2">
               <div className="flex items-center gap-2 text-[11px]">
                 <button onClick={() => { setUseCustomName(false); if (!rosterAdj || !rosterAnimal) randomizeRosterName(); }}
                   className={`px-2 py-1 rounded-full font-bold transition-all ${!useCustomName ? 'bg-teal-100 text-teal-800 border border-teal-600' : 'text-slate-400 hover:text-slate-600'}`}>
                   🎲 Codename Only
                 </button>
                 <button onClick={() => setUseCustomName(true)}
                   className={`px-2 py-1 rounded-full font-bold transition-all ${useCustomName ? 'bg-teal-100 text-teal-800 border border-teal-600' : 'text-slate-400 hover:text-slate-600'}`}>
                   ✏️ Codename + Real Name
                 </button>
               </div>
               <div className="flex gap-2 items-center">
                 <div className="flex-1 flex flex-col gap-1.5">
                     <div className="flex gap-1.5 items-center">
                       <select value={rosterAdj} onChange={e => setRosterAdj(e.target.value)}
                         aria-label={t('codenames.pick_adjective') || 'Pick adjective'}
                         className="flex-1 px-2 py-1.5 rounded-lg border border-slate-400 text-xs focus:ring-2 focus:ring-teal-400 focus:outline-none">
                         <option value="">{t('codenames.pick_adjective') || '— Adjective —'}</option>
                         {rosterAdjectives.map(a => <option key={a} value={a}>{a}</option>)}
                       </select>
                       <select value={rosterAnimal} onChange={e => setRosterAnimal(e.target.value)}
                         aria-label={t('codenames.pick_animal') || 'Pick animal'}
                         className="flex-1 px-2 py-1.5 rounded-lg border border-slate-400 text-xs focus:ring-2 focus:ring-teal-400 focus:outline-none">
                         <option value="">{t('codenames.pick_animal') || '— Animal —'}</option>
                         {rosterAnimals.map(a => <option key={a} value={a}>{a}</option>)}
                       </select>
                       <button onClick={randomizeRosterName} title={t('common.randomize') || 'Randomize'} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                         <RefreshCw size={12} />
                       </button>
                     </div>
                     {useCustomName && (
                       <input type="text" value={newStudentName} onChange={e => setNewStudentName(e.target.value)}
                         placeholder={t('roster.display_name_placeholder') || 'Real name (for your reference only)...'}
                         aria-label={t('roster.display_name_placeholder') || 'Student real name'}
                         onKeyDown={e => e.key === 'Enter' && handleAddStudent()}
                         className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
                     )}
                   </div>
                 <select value={newStudentGroup} onChange={e => setNewStudentGroup(e.target.value)}
                   aria-label={t('roster.assign_group') || 'Assign to group'}
                   className="px-2 py-1.5 rounded-lg border border-slate-400 text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none">
                   <option value="">{t('roster.unassigned') || 'Unassigned'}</option>
                   {groupIds.map(gId => <option key={gId} value={gId}>{groups[gId].name}</option>)}
                 </select>
                 <button onClick={handleAddStudent} disabled={!rosterAdj || !rosterAnimal}
                   className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors disabled:opacity-40 flex items-center gap-1">
                   <Plus size={14} /> {t('roster.add_student') || 'Add'}
                 </button>
               </div>
               {rosterAdj && rosterAnimal && (
                 <div className="text-xs text-teal-600 font-medium pl-1">
                   {useCustomName && newStudentName.trim()
                     ? <span>Codename: <strong>{rosterAdj} {rosterAnimal}</strong> · Display: <strong>{newStudentName.trim()}</strong></span>
                     : <span>Codename: <strong>{rosterAdj} {rosterAnimal}</strong></span>}
                 </div>
               )}
             </div>
           </div>
          {getUnassigned().length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mt-2">
              <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">{t('roster.unassigned_students') || 'Unassigned Students'}</div>
              <div className="flex flex-wrap gap-1.5">
                {getUnassigned().map(name => (
                  <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-amber-800 rounded-full text-xs font-medium border border-amber-200">
                    {name}
                    {rosterKey?.progressHistory?.[name]?.length > 0 && (
                      <span className="text-[11px] bg-amber-100 text-amber-600 px-1 py-0.5 rounded-full font-mono ml-0.5" title={`${rosterKey.progressHistory[name].length} sessions`}>
                        {rosterKey.progressHistory[name].length}s
                      </span>
                    )}
                    <select onChange={e => { if (e.target.value) handleMoveStudent(name, e.target.value); }} value=""
                      aria-label={'Move ' + name + ' to group'}
                      className="text-[11px] bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer text-amber-600 ml-1 w-4">
                      <option value="">→</option>
                      {groupIds.map(gId => <option key={gId} value={gId}>{groups[gId].name}</option>)}
                    </select>
                    <button onClick={() => handleRemoveStudent(name)} className="hover:text-red-500 transition-colors" aria-label={'Remove ' + name}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          {rosterKey && (
            <div className="flex gap-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 font-medium">
              <span>{groupIds.length} group{groupIds.length !== 1 ? 's' : ''}</span>
              <span>{Object.keys(students).length} student{Object.keys(students).length !== 1 ? 's' : ''}</span>
              <span>{getUnassigned().length} unassigned</span>
              <span className="ml-auto flex items-center gap-1"><ShieldCheck size={10} className="text-green-500" /> {t('teacher.local_only') || 'Local only'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
// @section CHARTS — Bar charts and longitudinal progress
const SimpleBarChart = React.memo(({ data, color = "indigo" }) => {
  const { t } = useContext(LanguageContext);
  const height = 150;
  const width = 300;
  const margin = 20;
  const chartHeight = height - margin * 2;
  const chartWidth = width - margin * 2;
  if (!data || data.length === 0) return <div className="text-xs text-slate-600 italic text-center py-8">{t('dashboard.empty.no_data')}</div>;
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.min(40, (chartWidth / data.length) * 0.6);
  const gap = (chartWidth - (barWidth * data.length)) / (data.length + 1);
  return (
    <div className="w-full h-full flex items-center justify-center select-none">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[160px]" preserveAspectRatio="xMidYMid meet">
        {data.map((d, i) => {
          const barHeight = (d.value / maxValue) * chartHeight;
          const x = gap + i * (barWidth + gap);
          const y = height - margin - barHeight;
          return (
            <g key={i} className="group">
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                className={`fill-${color}-500 group-hover:fill-${color}-600 transition-all duration-300`}
              />
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                className="fill-slate-500 text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {d.value}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - 5}
                textAnchor="middle"
                className="fill-slate-400 text-[11px] uppercase tracking-wider font-medium"
              >
                {d.label.length > 5 ? d.label.substring(0, 4) + '.' : d.label}
              </text>
            </g>
          );
        })}
        <line x1="0" y1={height - margin} x2={width} y2={height - margin} stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
});
const SimpleDonutChart = ({ percentage, label, color = "indigo" }) => {
  const size = 100;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePercent = Math.min(100, Math.max(0, percentage || 0));
  const offset = circumference - (safePercent / 100) * circumference;
  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div className="relative w-24 h-24">
        <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90 w-full h-full">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-slate-100 fill-none"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={`stroke-${color}-500 fill-none transition-all duration-1000 ease-out`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-xl font-black text-${color}-600`}>{Math.round(safePercent)}%</span>
        </div>
      </div>
      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-2 text-center leading-tight">{label}</span>
    </div>
  );
};
const ConfettiEffect = ({ isActive }) => {
  if (!isActive) return null;
  const colors = ['#f43f5e', '#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ec4899'];
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: Math.random() * 100,
    delay: Math.random() * 2,
    size: Math.random() * 8 + 4,
    duration: Math.random() * 2 + 2
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-[10001] overflow-hidden">
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .confetti-particle {
          position: absolute;
          top: -20px;
          animation: confetti-fall linear forwards;
        }
      `}</style>
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0%',
          }}
        />
      ))}
    </div>
  );
};
// @section ESCAPE_ROOM — Escape Room student overlay
const StudentEscapeRoomOverlay = React.memo(({ sessionData, user, activeSessionCode, targetAppId, t, playSound, setIsEscapeTimerRunning }) => {
  const escapeState = sessionData?.escapeRoomState;
  const [selectedPuzzle, setSelectedPuzzle] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [sequenceOrder, setSequenceOrder] = useState([]);
  const [matchingPairs, setMatchingPairs] = useState([]);
  const [matchingSelected, setMatchingSelected] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [teamEscapeToast, setTeamEscapeToast] = useState(null);
  const [lastEscapedTeams, setLastEscapedTeams] = useState([]);
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  if (!escapeState?.isActive || !escapeState?.room) return null;
  const isCoopMode = escapeState.isCoopMode || false;
  const isPaused = escapeState.isPaused || false;
  const userTeam = escapeState.teams?.[user?.uid];
  const teamProgress = escapeState.teamProgress?.[userTeam] || { solvedPuzzles: [] };
  const solvedPuzzlesSet = new Set(teamProgress.solvedPuzzles || []);
  const allTeams = Object.keys(escapeState.teamProgress || {});
  const puzzles = escapeState.puzzles || [];
  const objects = escapeState.objects || [];
  const timeRemaining = escapeState.timeRemaining || 0;
  const teamEscaped = teamProgress.isEscaped;
  const teamColors = {
    Red: { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500', light: 'bg-red-100' },
    Blue: { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500', light: 'bg-blue-100' },
    Green: { bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500', light: 'bg-green-100' },
    Yellow: { bg: 'bg-yellow-500', text: 'text-yellow-500', border: 'border-yellow-500', light: 'bg-yellow-100' },
    All: { bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500', light: 'bg-purple-100' }
  };
  const myTeamColors = teamColors[userTeam] || teamColors.Blue;
  useEffect(() => {
    const escapedTeams = allTeams.filter(team =>
      escapeState.teamProgress?.[team]?.isEscaped && team !== userTeam
    );
    const newEscapes = escapedTeams.filter(t => !lastEscapedTeams.includes(t));
    if (newEscapes.length > 0 && !teamEscaped) {
      playSound?.('notification');
      setTeamEscapeToast(newEscapes[0]);
      const _toastTimer = setTimeout(() => setTeamEscapeToast(null), 4000);
      return () => clearTimeout(_toastTimer);
    }
    setLastEscapedTeams(escapedTeams);
  }, [escapeState.teamProgress]);
  useEffect(() => {
    if (teamEscaped) {
      playSound?.('levelUp');
      setShowConfetti(true);
      const _confettiTimer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(_confettiTimer);
    }
  }, [teamEscaped]);
  useEffect(() => {
    if (escapeState?.isActive && user && activeSessionCode && !userTeam) {
      const teamOptions = isCoopMode ? ['All'] : ['Red', 'Blue', 'Green', 'Yellow'];
      const assignedColor = teamOptions[Math.floor(Math.random() * teamOptions.length)];
      const joinTeam = async () => {
        try {
          const effectiveAppId = targetAppId || appId;
          const sessionRef = doc(db, 'artifacts', effectiveAppId, 'public', 'data', 'sessions', activeSessionCode);
          await updateDoc(sessionRef, {
            [`escapeRoomState.teams.${user.uid}`]: assignedColor
          });
        } catch (e) {
          warnLog("Escape room team assignment failed:", e);
        }
      };
      joinTeam();
    }
  }, [escapeState?.isActive, user, activeSessionCode, userTeam, targetAppId, isCoopMode]);
  const handleSubmitAnswer = async (puzzleId, answer, answerType) => {
    if (!userTeam || !activeSessionCode) return;
    const puzzle = puzzles.find(p => p.id === puzzleId);
    if (!puzzle || solvedPuzzlesSet.has(puzzleId)) return;
    let isCorrect = false;
    if (answerType === 'mcq') {
      isCorrect = answer === puzzle.correctIndex;
    } else if (answerType === 'sequence') {
      isCorrect = JSON.stringify(answer) === JSON.stringify(puzzle.correctOrder);
    } else if (answerType === 'cipher' || answerType === 'scramble' || answerType === 'fillin') {
      const normalizedUser = answer.toLowerCase().trim();
      const normalizedAnswer = puzzle.answer.toLowerCase().trim();
      isCorrect = normalizedUser === normalizedAnswer;
    } else if (answerType === 'matching') {
      isCorrect = answer.length >= puzzle.pairs.length;
    }
    if (isCorrect) {
      playSound?.('correct');
      try {
        const effectiveAppId = targetAppId || appId;
        const sessionRef = doc(db, 'artifacts', effectiveAppId, 'public', 'data', 'sessions', activeSessionCode);
        const newSolvedPuzzles = [...(teamProgress.solvedPuzzles || []), puzzleId];
        const allSolved = newSolvedPuzzles.length >= puzzles.length;
        const newStreak = (escapeState.streak || 0) + 1;
        await updateDoc(sessionRef, {
          [`escapeRoomState.teamProgress.${userTeam}.solvedPuzzles`]: newSolvedPuzzles,
          [`escapeRoomState.teamProgress.${userTeam}.isEscaped`]: allSolved,
          [`escapeRoomState.streak`]: newStreak
        });
        if (allSolved) {
          setIsEscapeTimerRunning(false);
        }
        setSelectedPuzzle(null);
        setUserInput('');
        setSequenceOrder([]);
        setMatchingPairs([]);
      } catch (e) {
        warnLog("Failed to sync puzzle completion:", e);
      }
    } else {
      playSound?.('incorrect');
      try {
        const effectiveAppId = targetAppId || appId;
        const sessionRef = doc(db, 'artifacts', effectiveAppId, 'public', 'data', 'sessions', activeSessionCode);
        const currentLives = escapeState.lives || 0;
        const maxLives = escapeState.maxLives || 3;
        const newLives = maxLives < 99 ? Math.max(0, currentLives - 1) : currentLives;
        const isGameOver = newLives <= 0 && maxLives < 99;
        await updateDoc(sessionRef, {
          [`escapeRoomState.lives`]: newLives,
          [`escapeRoomState.streak`]: 0,
          [`escapeRoomState.wrongAttempts`]: (escapeState.wrongAttempts || 0) + 1,
          [`escapeRoomState.isGameOver`]: isGameOver
        });
      } catch (e) {
        warnLog("Failed to sync life loss:", e);
      }
    }
  };
  if (!userTeam) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-purple-900 via-slate-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-400" />
          <p className="text-xl font-bold">{t('escape_room.waiting_host')}</p>
        </div>
      </div>
    );
  }
  if (escapeState.isGameOver) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-red-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="text-center text-white animate-in zoom-in duration-500">
          <div className="text-9xl mb-6 animate-pulse">💀</div>
          <h2 className="text-5xl font-black mb-4 text-red-400">{t('escape_room.game_over')}</h2>
          <p className="text-2xl text-slate-600 mb-6">{t('escape_room.life_lost')}</p>
          <div className="flex gap-4 justify-center text-lg">
            <span className="px-4 py-2 bg-slate-800 rounded-lg">
              {t('escape_room.puzzles_remaining')}: {puzzles.length - solvedPuzzlesSet.size}
            </span>
            <span className="px-4 py-2 bg-slate-800 rounded-lg">
              {t('escape_room.wrong_attempts')}: {escapeState.wrongAttempts || 0}
            </span>
          </div>
        </div>
      </div>
    );
  }
  if (teamEscaped) {
    const isFirstToEscape = allTeams.filter(team =>
      escapeState.teamProgress?.[team]?.isEscaped
    ).length === 1;
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 flex items-center justify-center">
        <ConfettiEffect isActive={showConfetti} />
        <div className="text-center text-white animate-in zoom-in duration-500">
          <div className="text-9xl mb-6 animate-bounce">{isFirstToEscape ? '🏆' : '🎉'}</div>
          <h2 className="text-5xl font-black mb-4">
            {isCoopMode ? t('escape_room.class_escaped') : (isFirstToEscape ? t('escape_room.first_escape') : t('escape_room.escaped'))}
          </h2>
          <p className="text-2xl text-green-200">
            {isCoopMode ? t('escape_room.everyone_escaped') : t('escape_room.team_escaped', { team: userTeam })}
          </p>
          {!isCoopMode && (
            <div className={`mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full ${myTeamColors.bg} text-white font-bold text-xl`}>
              {t('escape_room.your_team')}: {userTeam}
            </div>
          )}
        </div>
      </div>
    );
  }
  const currentPuzzle = selectedPuzzle ? puzzles.find(p => p.linkedObjectId === selectedPuzzle || p.id === selectedPuzzle) : null;
  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 overflow-auto">
      <div className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-sm border-b border-purple-500/30 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <DoorOpen className="text-purple-400" size={24} />
            <span className="text-white font-bold text-lg">{escapeState.room?.theme || t('escape_room.title')}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${myTeamColors.bg} text-white font-bold text-sm`} data-help-key="escape_room_team">
              <Users size={14} />
              {t(`escape_room.team_${userTeam.toLowerCase()}`, { defaultValue: `${userTeam} Team` })}
            </div>
            <div className="text-white font-mono" data-help-key="escape_room_progress">
              <span className="text-purple-400">{solvedPuzzlesSet.size}</span>
              <span className="text-slate-400">/{puzzles.length}</span>
            </div>
            {escapeState.maxLives < 99 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-700/50" title={t('escape_room.lives')} data-help-key="escape_room_lives">
                {Array.from({ length: escapeState.maxLives }).map((_, i) => (
                  <span key={i} className={`text-sm ${i < (escapeState.lives || 0) ? 'text-red-500' : 'text-slate-600'}`}>
                    ❤️
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-700/50" title={t('escape_room.hints_used')}>
              <Lightbulb size={14} className="text-yellow-400" />
              <span className="text-white text-xs font-bold">{escapeState.hintsRemaining || 0}</span>
            </div>
            {(escapeState.streak || 0) >= 3 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 font-bold text-xs animate-pulse" data-help-key="escape_room_streak">
                🔥 x{escapeState.streak}
              </div>
            )}
            <div className={`px-3 py-1.5 rounded-full font-mono font-bold ${timeRemaining < 60 ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-white'}`} data-help-key="escape_room_timer">
              <Clock size={14} className="inline mr-1" />
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      </div>
      <div className="fixed right-4 top-24 bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30 z-40" data-help-key="escape_room_leaderboard">
        <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">{t('escape_room.live_progress')}</h4>
        {allTeams.map(team => {
          const progress = escapeState.teamProgress?.[team] || { solvedPuzzles: [] };
          const solved = (progress.solvedPuzzles || []).length;
          const percent = puzzles.length > 0 ? Math.round((solved / puzzles.length) * 100) : 0;
          const colors = teamColors[team] || teamColors.Blue;
          const escaped = progress.isEscaped;
          return (
            <div key={team} className={`mb-2 ${team === userTeam ? 'ring-2 ring-white/50 rounded-lg p-1' : ''}`}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={`font-bold ${colors.text}`}>{team}</span>
                <span className="text-slate-400">{solved}/{puzzles.length}</span>
              </div>
              <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full ${colors.bg} transition-all duration-300`} style={{ width: `${percent}%` }} />
              </div>
              {escaped && <span className="text-xs text-green-400">🏆 {t('escape_room.escaped')}</span>}
            </div>
          );
        })}
      </div>
      <div className="max-w-4xl mx-auto p-6 mt-4">
        <p className="text-center text-purple-300 mb-6 italic">{escapeState.room?.description}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {objects.map((obj, idx) => {
            const puzzle = puzzles.find(p => p.linkedObjectId === obj.id) || puzzles[idx];
            const isSolved = puzzle && solvedPuzzlesSet.has(puzzle.id);
            return (
              <button
                key={obj.id}
                onClick={() => !isSolved && puzzle && setSelectedPuzzle(obj.id)}
                disabled={isSolved}
                data-help-key="escape_room_object"
                className={`
                  aspect-square rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all
                  border-2 ${isSolved
                    ? 'bg-green-900/50 border-green-500/50 cursor-default'
                    : 'bg-slate-800 border-purple-500/30 hover:border-purple-400 hover:scale-105 cursor-pointer'
                  }
                `}
              >
                <span className="text-4xl">{obj.emoji}</span>
                <span className="text-white text-sm font-bold text-center">{obj.name}</span>
                {isSolved && <CheckCircle className="text-green-400" size={20} />}
              </button>
            );
          })}
        </div>
      </div>
      {currentPuzzle && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full border-2 border-purple-500 max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs px-2 py-0.5 bg-purple-600 text-white rounded-full uppercase font-bold">
                  {currentPuzzle.type || 'mcq'}
                </span>
              </div>
              <button onClick={() => setSelectedPuzzle(null)} data-help-key="escape_room_close_btn" className="text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white rounded-full p-1" aria-label={t('common.close')}>
                <X size={24} />
              </button>
            </div>
            <p className="text-xl text-white font-bold mb-4">{currentPuzzle.question}</p>
            {currentPuzzle.hint && (
              <div className="mb-4">
                {escapeState.revealedHints?.[currentPuzzle.id] ? (
                  <div className="p-3 bg-yellow-500/20 border border-yellow-500/40 rounded-lg text-yellow-200 text-sm animate-in fade-in">
                    <Lightbulb size={14} className="inline mr-2 text-yellow-400" />
                    {currentPuzzle.hint}
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      if ((escapeState.hintsRemaining || 0) <= 0) return;
                      try {
                        const effectiveAppId = targetAppId || appId;
                        const sessionRef = doc(db, 'artifacts', effectiveAppId, 'public', 'data', 'sessions', activeSessionCode);
                        await updateDoc(sessionRef, {
                          [`escapeRoomState.hintsRemaining`]: (escapeState.hintsRemaining || 0) - 1,
                          [`escapeRoomState.revealedHints.${currentPuzzle.id}`]: true,
                          [`escapeRoomState.streak`]: 0
                        });
                        playSound?.('notification');
                      } catch (e) {
                        warnLog("Failed to use hint:", e);
                      }
                    }}
                    disabled={(escapeState.hintsRemaining || 0) <= 0}
                    data-help-key="escape_room_hint_button"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
                      (escapeState.hintsRemaining || 0) > 0
                        ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/40'
                        : 'bg-slate-700 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-sm">💡</span>
                    {t('escape_room.hint_btn')} ({escapeState.hintsRemaining || 0} {t('escape_room.left')})
                  </button>
                )}
              </div>
            )}
            {(!currentPuzzle.type || currentPuzzle.type === 'mcq') && currentPuzzle.options && (
              <div className="space-y-3">
                {currentPuzzle.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSubmitAnswer(currentPuzzle.id, idx, 'mcq')}
                    data-help-key="escape_room_mcq_option"
                    className="w-full text-left p-4 bg-slate-700 hover:bg-purple-700 rounded-xl text-white font-medium transition-colors border-2 border-transparent hover:border-purple-400"
                  >
                    <span className="inline-block w-8 font-bold text-purple-400">{String.fromCharCode(65+idx)}.</span>
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {currentPuzzle.type === 'cipher' && (
              <div className="space-y-4">
                {currentPuzzle.encodedText && (
                  <div className="bg-slate-900 p-4 rounded-lg font-mono text-purple-300 text-center">
                    {currentPuzzle.encodedText}
                  </div>
                )}
                <input aria-label={t('common.escape_room_enter_answer')}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={t('escape_room.enter_answer')}
                  data-help-key="escape_room_cipher_input"
                  className="w-full p-4 bg-slate-700 text-white rounded-xl border-2 border-slate-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                <button
                  onClick={() => handleSubmitAnswer(currentPuzzle.id, userInput, 'cipher')}
                  data-help-key="escape_room_cipher_submit"
                  className="w-full p-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors"
                >
                  {t('escape_room.submit_answer')}
                </button>
              </div>
            )}
            {currentPuzzle.type === 'fillin' && (
              <div className="space-y-4">
                {currentPuzzle.sentence && (
                  <div className="bg-slate-900 p-4 rounded-lg text-white text-center text-lg">
                    {currentPuzzle.sentence.replace('___', userInput ? `[${userInput}]` : '______')}
                  </div>
                )}
                {currentPuzzle.wordbank && currentPuzzle.wordbank.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400 text-center uppercase font-bold">{t('escape_room.select_word') || 'Select the correct word:'}</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {currentPuzzle.wordbank.map((word, idx) => (
                        <button
                          key={idx}
                          onClick={() => setUserInput(word)}
                          className={`px-4 py-2 rounded-lg font-bold transition-all ${
                            userInput === word
                              ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                              : 'bg-slate-700 text-white hover:bg-slate-600'
                          }`}
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <input aria-label={t('common.escape_room_enter_answer')}
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder={t('escape_room.enter_answer')}
                    data-help-key="escape_room_fillin_input"
                    className="w-full p-4 bg-slate-700 text-white rounded-xl border-2 border-slate-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                )}
                <button
                  onClick={() => handleSubmitAnswer(currentPuzzle.id, userInput, 'fillin')}
                  disabled={!userInput}
                  data-help-key="escape_room_fillin_submit"
                  className="w-full p-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {t('escape_room.submit_answer')}
                </button>
              </div>
            )}
            {currentPuzzle.type === 'scramble' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 justify-center">
                  {(currentPuzzle.displayLetters || currentPuzzle.scrambledWord?.split('')).map((letter, idx) => (
                    <span key={idx} className="w-10 h-10 flex items-center justify-center bg-purple-700 text-white font-bold rounded-lg text-xl">
                      {letter}
                    </span>
                  ))}
                </div>
                <input aria-label={t('common.escape_room_unscramble_placeholder')}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value.toUpperCase())}
                  placeholder={t('escape_room.unscramble_placeholder')}
                  data-help-key="escape_room_scramble_input"
                  className="w-full p-4 bg-slate-700 text-white rounded-xl border-2 border-slate-600 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-300 text-center font-mono text-xl uppercase"
                />
                <button
                  onClick={() => handleSubmitAnswer(currentPuzzle.id, userInput, 'scramble')}
                  data-help-key="escape_room_scramble_submit"
                  className="w-full p-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors"
                >
                  {t('escape_room.check_word')}
                </button>
              </div>
            )}
            {currentPuzzle.type === 'sequence' && (
              <div className="space-y-4" data-help-key="escape_room_sequence_container">
                <p className="text-sm text-purple-300 italic mb-2">{t('escape_room.sequence_instructions')}</p>
                <div className="space-y-2" role="list" aria-label={t('escape_room.sequence_list') || 'Sequence items to order'}>
                  {sequenceOrder.length === 0
                    ? (currentPuzzle.shuffledItems || currentPuzzle.items || []).map((item, idx) => (
                        <div key={idx} role="listitem" className="flex items-center gap-2 p-3 bg-slate-700 rounded-lg text-white">
                          <span className="flex-1">{item}</span>
                        </div>
                      ))
                    : sequenceOrder.map((item, idx) => (
                        <div key={idx} role="listitem" aria-label={`${t('escape_room.position') || 'Position'} ${idx + 1}: ${item}`} className="flex items-center gap-2 p-3 bg-slate-700 rounded-lg text-white">
                          <span className="w-8 h-8 flex items-center justify-center bg-purple-600 rounded-full font-bold" aria-hidden="true">{idx + 1}</span>
                          <span className="flex-1">{item}</span>
                          <div className="flex gap-1" role="group" aria-label={t('escape_room.reorder_buttons') || 'Reorder buttons'}>
                            <button
                              onClick={() => {
                                if (idx > 0) {
                                  const newOrder = [...sequenceOrder];
                                  [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
                                  setSequenceOrder(newOrder);
                                }
                              }}
                              disabled={idx === 0}
                              aria-label={`${t('escape_room.move_up') || 'Move up'}: ${item}`}
                              title={t('escape_room.move_up') || 'Move up'}
                              className="w-8 h-8 bg-slate-600 hover:bg-slate-500 text-white rounded disabled:opacity-30 focus:ring-2 focus:ring-purple-400 focus:outline-none"
                            >↑</button>
                            <button
                              onClick={() => {
                                if (idx < sequenceOrder.length - 1) {
                                  const newOrder = [...sequenceOrder];
                                  [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
                                  setSequenceOrder(newOrder);
                                }
                              }}
                              disabled={idx === sequenceOrder.length - 1}
                              aria-label={`${t('escape_room.move_down') || 'Move down'}: ${item}`}
                              title={t('escape_room.move_down') || 'Move down'}
                              className="w-8 h-8 bg-slate-600 hover:bg-slate-500 text-white rounded disabled:opacity-30 focus:ring-2 focus:ring-purple-400 focus:outline-none"
                            >↓</button>
                          </div>
                        </div>
                      ))
                  }
                </div>
                {sequenceOrder.length === 0 && (
                  <button
                    onClick={() => setSequenceOrder(currentPuzzle.shuffledItems || currentPuzzle.items || [])}
                    className="w-full p-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors"
                  >
                    {t('escape_room.start_ordering') || 'Start Ordering'}
                  </button>
                )}
                {sequenceOrder.length > 0 && (
                  <button
                    onClick={() => {
                      const originalItems = currentPuzzle.items || [];
                      const orderIndices = sequenceOrder.map(item => originalItems.indexOf(item));
                      handleSubmitAnswer(currentPuzzle.id, orderIndices, 'sequence');
                    }}
                    className="w-full p-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors"
                  >
                    {t('escape_room.check_sequence')}
                  </button>
                )}
              </div>
            )}
            {currentPuzzle.type === 'matching' && (
              <div className="space-y-4" data-help-key="escape_room_matching_container">
                <p className="text-sm text-purple-300 italic mb-2">{t('escape_room.matching_instructions')}</p>
                <div className="grid grid-cols-2 gap-4" role="group" aria-label={t('escape_room.matching_columns') || 'Matching columns'}>
                  <div className="space-y-2" role="group" aria-label={t('escape_room.left_column') || 'Left column options'}>
                    {(currentPuzzle.leftColumn || currentPuzzle.pairs?.map(p => p.left) || []).map((item, idx) => {
                      const isMatched = matchingPairs.some(p => p.left === item);
                      const isSelected = matchingSelected?.side === 'left' && matchingSelected?.item === item;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (isMatched) return;
                            if (matchingSelected?.side === 'right') {
                              setMatchingPairs([...matchingPairs, { left: item, right: matchingSelected.item }]);
                              setMatchingSelected(null);
                            } else {
                              setMatchingSelected({ side: 'left', item });
                            }
                          }}
                          disabled={isMatched}
                          aria-label={isMatched ? `${item} - ${t('escape_room.matched') || 'matched'}` : isSelected ? `${item} - ${t('escape_room.selected') || 'selected'}` : item}
                          className={`w-full p-3 rounded-lg text-left font-medium transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                            isMatched ? 'bg-green-700 text-white opacity-60' :
                            isSelected ? 'bg-purple-500 text-white ring-2 ring-purple-300' :
                            'bg-slate-700 text-white hover:bg-slate-600'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                  <div className="space-y-2" role="group" aria-label={t('escape_room.right_column') || 'Right column options'}>
                    {(currentPuzzle.rightColumn || currentPuzzle.pairs?.map(p => p.right) || []).map((item, idx) => {
                      const isMatched = matchingPairs.some(p => p.right === item);
                      const isSelected = matchingSelected?.side === 'right' && matchingSelected?.item === item;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (isMatched) return;
                            if (matchingSelected?.side === 'left') {
                              setMatchingPairs([...matchingPairs, { left: matchingSelected.item, right: item }]);
                              setMatchingSelected(null);
                            } else {
                              setMatchingSelected({ side: 'right', item });
                            }
                          }}
                          disabled={isMatched}
                          aria-label={isMatched ? `${item} - ${t('escape_room.matched') || 'matched'}` : isSelected ? `${item} - ${t('escape_room.selected') || 'selected'}` : item}
                          className={`w-full p-3 rounded-lg text-left font-medium transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                            isMatched ? 'bg-green-700 text-white opacity-60' :
                            isSelected ? 'bg-purple-500 text-white ring-2 ring-purple-300' :
                            'bg-slate-700 text-white hover:bg-slate-600'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {matchingPairs.length > 0 && (
                  <div className="bg-slate-900 p-3 rounded-lg" role="list" aria-label={t('escape_room.matched_pairs') || 'Matched pairs'}>
                    <p className="text-xs text-slate-600 mb-2" aria-hidden="true">{t('escape_room.matched_pairs')}</p>
                    <div className="space-y-1">
                      {matchingPairs.map((pair, idx) => (
                        <div key={idx} role="listitem" className="text-sm text-green-400">✓ {pair.left} ↔ {pair.right}</div>
                      ))}
                    </div>
                  </div>
                )}
                {matchingPairs.length >= (currentPuzzle.pairs?.length || 4) && (
                  <button
                    onClick={() => handleSubmitAnswer(currentPuzzle.id, matchingPairs, 'matching')}
                    className="w-full p-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors"
                  >
                    {t('escape_room.submit_answer')}
                  </button>
                )}
              </div>
            )}
            {currentPuzzle.hint && (
              <p className="mt-4 text-purple-400 text-sm italic">💡 {currentPuzzle.hint}</p>
            )}
          </div>
        </div>
      )}
      {isPaused && (
        <div className="fixed inset-0 z-[10001] bg-black/80 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center text-white animate-pulse">
            <div className="text-8xl mb-6">⏸️</div>
            <h2 className="text-4xl font-black mb-3">{t('escape_room.game_paused')}</h2>
            <p className="text-xl text-slate-400">{t('escape_room.waiting_resume')}</p>
          </div>
        </div>
      )}
      {teamEscapeToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10002] animate-in slide-in-from-bottom duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border-2 ${teamColors[teamEscapeToast]?.border || 'border-purple-500'} bg-slate-900`}>
            <span className="text-3xl">🚪</span>
            <div>
              <p className="text-white font-bold">{t('escape_room.team_escaped', { team: teamEscapeToast })}</p>
              <p className="text-slate-600 text-sm">{t('escape_room.hurry_up')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
// @section ESCAPE_ROOM_TEACHER — Escape Room teacher controls
const EscapeRoomTeacherControls = React.memo(({ sessionData, activeSessionCode, appId, t, addToast }) => {
  const escapeState = sessionData?.escapeRoomState;
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  useEffect(() => {
    if (!escapeState?.isActive || !activeSessionCode || !appId) return;
    if (escapeState.isPaused) return;
    if (escapeState.timeRemaining <= 0) return;
    const timer = setInterval(async () => {
      const newTime = (escapeState.timeRemaining || 0) - 1;
      if (newTime === 60) {
        addToast?.(t('escape_room.one_minute_warning'), 'warning');
      } else if (newTime === 30) {
        addToast?.(t('escape_room.thirty_seconds_warning'), 'error');
      }
      try {
        const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
        if (newTime <= 0) {
          await updateDoc(sessionRef, {
            'escapeRoomState.timeRemaining': 0,
            'escapeRoomState.isActive': false,
            'escapeRoomState.isGameOver': true
          });
          addToast?.(t('escape_room.time_up'), 'error');
          clearInterval(timer);
        } else {
          await updateDoc(sessionRef, { 'escapeRoomState.timeRemaining': newTime });
        }
      } catch (e) {
        warnLog('Failed to sync timer:', e);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [escapeState?.isActive, escapeState?.isPaused, escapeState?.timeRemaining, activeSessionCode, appId]);
  if (!escapeState?.isActive) return null;
  const isCoopMode = escapeState.isCoopMode || false;
  const isPaused = escapeState.isPaused || false;
  const teamColors = {
    Red: { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-100' },
    Blue: { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-100' },
    Green: { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-100' },
    Yellow: { bg: 'bg-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-100' },
    All: { bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-100' }
  };
  const allTeams = Object.keys(escapeState.teamProgress || {});
  const puzzles = escapeState.puzzles || [];
  const totalPuzzles = puzzles.length;
  const escapedTeams = useMemo(() => allTeams.filter(t => escapeState.teamProgress?.[t]?.isEscaped), [allTeams, escapeState, isEscaped, teamProgress]);
  const studentsAssigned = Object.keys(escapeState.teams || {}).length;
  const handlePauseToggle = async () => {
    try {
        const sessionRef = doc(db, 'apps', appId, 'liveSessions', activeSessionCode);
        await updateDoc(sessionRef, { 'escapeRoomState.isPaused': !isPaused });
    } catch (e) { warnLog("Unhandled error in handlePauseToggle:", e); }
  };
  const handleEndGame = async () => {
    try {
        const sessionRef = doc(db, 'apps', appId, 'liveSessions', activeSessionCode);
        await updateDoc(sessionRef, { 'escapeRoomState.isActive': false });
        setShowEndConfirm(false);
    } catch (e) { warnLog("Unhandled error in handleEndGame:", e); }
  };
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-4 border-2 border-purple-200 shadow-lg mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DoorOpen className="text-purple-600" size={20} />
          <h3 className="font-bold text-purple-900">{escapeState.room?.theme || t('escape_room.title')}</h3>
          {isCoopMode && (
            <span className="text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full font-bold">
              {t('escape_room.coop_mode')}
            </span>
          )}
          {isPaused && (
            <span className="text-xs bg-yellow-200 text-yellow-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
              ⏸️ {t('escape_room.game_paused')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">
            {studentsAssigned} {t('escape_room.teams_competing', { count: allTeams.length })}
          </span>
          <span className={`px-3 py-1 rounded-full font-mono font-bold text-sm ${escapeState.timeRemaining < 60 ? 'bg-red-500 text-white' : 'bg-slate-700 text-white'}`}>
            <Clock size={12} className="inline mr-1" />
            {formatTime(escapeState.timeRemaining || 0)}
          </span>
          <button
            onClick={handlePauseToggle}
            className={`px-4 py-2 rounded-full font-bold text-sm transition-colors whitespace-nowrap ${isPaused ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'}`}
          >
            {isPaused ? '▶️ ' + t('escape_room.resume') : '⏸️ ' + t('escape_room.pause')}
          </button>
          <button
            onClick={() => setShowEndConfirm(true)}
            className="px-4 py-2 rounded-full font-bold text-sm bg-red-500 hover:bg-red-600 text-white transition-colors whitespace-nowrap"
          >
            {t('escape_room.end_game')}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {allTeams.map(team => {
          const progress = escapeState.teamProgress?.[team] || { solvedPuzzles: [] };
          const solved = (progress.solvedPuzzles || []).length;
          const percent = totalPuzzles > 0 ? Math.round((solved / totalPuzzles) * 100) : 0;
          const colors = teamColors[team] || teamColors.Blue;
          const escaped = progress.isEscaped;
          const memberCount = Object.values(escapeState.teams || {}).filter(t => t === team).length;
          return (
            <div key={team} className={`p-3 rounded-xl border-2 ${escaped ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`font-bold ${colors.text}`}>{team}</span>
                <span className="text-xs text-slate-600">{memberCount} 👤</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden mb-2">
                <div className={`h-full ${colors.bg} transition-all duration-500`} style={{ width: `${percent}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">{solved}/{totalPuzzles}</span>
                {escaped && <span className="text-green-600 font-bold">🏆 {t('escape_room.escaped')}</span>}
              </div>
            </div>
          );
        })}
      </div>
      {escapedTeams.length > 0 && (
        <div className="mt-4 p-3 bg-green-100 rounded-xl border border-green-300 text-center">
          <span className="text-green-800 font-bold">
            🎉 {escapedTeams.length === 1
              ? t('escape_room.first_escape') + ': ' + escapedTeams[0]
              : t('escape_room.all_teams_done')
            }
          </span>
        </div>
      )}
      {showEndConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-2 border-red-200">
            <h4 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
              <X className="text-red-500" size={20} />
              {t('escape_room.end_game')}
            </h4>
            <p className="text-slate-600 mb-4">{t('escape_room.end_game_confirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleEndGame}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
              >
                {t('escape_room.end_game')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
// @section LIVE_QUIZ — Teacher live quiz broadcast controls
const TeacherLiveQuizControls = React.memo(({ sessionData, generatedContent, activeSessionCode, appId, onGenerateImage, onRefineImage, onCreateGroup, onAssignStudent, onSetGroupResource, isPushingResource = {}, onSetGroupLanguage, onSetGroupProfile, onDeleteGroup }) => {
    const { t } = useContext(LanguageContext);
    const { quizState, roster } = sessionData;
    const { currentQuestionIndex, phase, responses, mode, bossStats, teamScores } = quizState;
    const question = generatedContent?.data.questions[currentQuestionIndex];
    const [showLocalStats, setShowLocalStats] = useState(false);
    const [bossDifficulty, setBossDifficulty] = useState('normal');
    // Phase-2 quiz auto-routing: per-question rules. Mirrored to window
    // so the App-level useEffect (AlloFlowANTI.txt, near rosterKey
    // auto-grouping) can read them. Rule schema reused from LivePolling:
    // { id, when: { predicate, value }, then: { groupId } }.
    const [quizRoutingRulesByQ, setQuizRoutingRulesByQ] = useState({});
    const [showQuizRoutingPanel, setShowQuizRoutingPanel] = useState(false);
    useEffect(() => {
      if (typeof window !== 'undefined') window.__alloQuizRoutingRules = quizRoutingRulesByQ;
    }, [quizRoutingRulesByQ]);
    const groupsForRouting = sessionData?.groups || {};
    const groupEntriesForRouting = Object.entries(groupsForRouting).filter(([_, g]) => g !== null);
    const currentRules = quizRoutingRulesByQ[currentQuestionIndex] || [];
    const addQuizRoutingRule = () => {
      setQuizRoutingRulesByQ(prev => {
        const next = { ...prev };
        const existing = Array.isArray(next[currentQuestionIndex]) ? next[currentQuestionIndex].slice() : [];
        const firstOption = (question?.options && question.options[0]) || '';
        const firstGroup = (groupEntriesForRouting[0] && groupEntriesForRouting[0][0]) || '';
        existing.push({
          id: 'qr-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5),
          when: { predicate: 'eq', value: firstOption },
          then: { groupId: firstGroup }
        });
        next[currentQuestionIndex] = existing;
        return next;
      });
    };
    const removeQuizRoutingRule = (rid) => {
      setQuizRoutingRulesByQ(prev => {
        const next = { ...prev };
        next[currentQuestionIndex] = (next[currentQuestionIndex] || []).filter(r => r.id !== rid);
        return next;
      });
    };
    const updateQuizRoutingRule = (rid, patch) => {
      setQuizRoutingRulesByQ(prev => {
        const next = { ...prev };
        next[currentQuestionIndex] = (next[currentQuestionIndex] || []).map(r => {
          if (r.id !== rid) return r;
          return {
            ...r,
            when: patch.when ? { ...r.when, ...patch.when } : r.when,
            then: patch.then ? { ...r.then, ...patch.then } : r.then,
          };
        });
        return next;
      });
    };
    const totalStudents = roster ? Object.keys(roster).length : 0;
    const answeredCount = responses ? Object.keys(responses).length : 0;
    const percentage = totalStudents > 0 ? Math.round((answeredCount / totalStudents) * 100) : 0;
    const detailedStats = question.options.map((opt, idx) => {
        const count = Object.values(responses || {}).filter(r => r === idx).length;
        const percent = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;
        return {
            label: String.fromCharCode(65 + idx),
            value: count,
            percent: percent,
            text: opt,
            isCorrect: opt === question.correctAnswer
        };
    });
    const renderAnalytics = () => (
        <div className="flex flex-col h-full w-full animate-in fade-in duration-300">
            <div className="w-full h-48 mb-6 shrink-0">
                <SimpleBarChart data={detailedStats} color="indigo" />
            </div>
            <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar space-y-2">
                {detailedStats.map((stat, i) => (
                    <div
                        key={i}
                        className={`flex items-center justify-between p-3 rounded-lg border text-xs transition-all ${
                            phase === 'revealed' && stat.isCorrect
                            ? 'bg-green-50 border-green-200 ring-1 ring-green-300'
                            : 'bg-white border-slate-100 hover:border-indigo-200'
                        }`}
                    >
                        <div className="flex items-center gap-3 overflow-hidden mr-4">
                            <span className={`font-black w-6 h-6 flex items-center justify-center rounded shrink-0 ${
                                phase === 'revealed' && stat.isCorrect ? 'bg-green-200 text-green-800' : 'bg-indigo-100 text-indigo-700'
                            }`}>
                                {stat.label}
                            </span>
                            <span className={`truncate font-medium ${phase === 'revealed' && stat.isCorrect ? 'text-green-900' : 'text-slate-600'}`} title={stat.text}>
                                {stat.text}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                <div
                                    className={`h-full ${phase === 'revealed' && stat.isCorrect ? 'bg-green-500' : 'bg-indigo-500'}`}
                                    style={{ width: `${stat.percent}%` }}
                                ></div>
                            </div>
                            <div className="text-right min-w-[50px]">
                                <div className="font-black text-slate-800 text-sm">{stat.value}</div>
                                <div className="text-[11px] text-slate-600 font-mono">{stat.percent}%</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600 uppercase tracking-wider">{t('quiz.total_responses')}</span>
                <span className="font-mono font-black text-lg text-indigo-600 bg-indigo-50 px-3 py-0.5 rounded-full border border-indigo-100">
                    {answeredCount}
                </span>
            </div>
        </div>
    );
    const generateBossAsset = async () => {
        if (bossStats?.image || bossStats?.isGenerating) return;
        try {
            const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
            await updateDoc(sessionRef, { "quizState.bossStats.isGenerating": true });
            const topic = generatedContent.meta || "General Knowledge";
            const prompt = `Pixel art boss monster representing '${topic}'. Retro 8-bit video game sprite. Threatening but cute. White background. Isolated character.`;
            let imageUrl = await onGenerateImage(prompt, 300, 0.8);
            if (onRefineImage && imageUrl) {
                 try {
                     const rawBase64 = imageUrl.split(',')[1];
                     const refined = await onRefineImage(
                         "Remove all text, letters, labels, damage numbers, and UI elements. Remove background to make it transparent. Ensure clean pixel art sprite borders.",
                         rawBase64
                     );
                     if (refined) imageUrl = refined;
                 } catch (e) {
                     warnLog("Boss refinement failed, using original", e);
                 }
            }
            await updateDoc(sessionRef, {
                "quizState.bossStats.image": imageUrl,
                "quizState.bossStats.isGenerating": false
            });
        } catch (e) {
            warnLog("Boss Gen Failed", e);
            const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
            try { await updateDoc(sessionRef, { "quizState.bossStats.isGenerating": false }); } catch(e) { warnLog('Firestore sync failed:', e); }
        }
    };
    const triggerBossVisualUpdate = async (currentImageUrl, status) => {
        if (!onRefineImage || !currentImageUrl) return;
        try {
            const rawBase64 = currentImageUrl.split(',')[1];
            let prompt = "";
            if (status === 'defeated') {
                prompt = "Edit this pixel art character to look defeated, collapsed, fainting, or turning into a ghost. Keep the style consistent.";
            } else {
                prompt = "Edit this pixel art character to look like it is taking damage, flinching, glowing red, or in pain. Keep the style consistent.";
            }
            const newImage = await onRefineImage(prompt, rawBase64);
            if (newImage) {
                const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
                await updateDoc(sessionRef, { "quizState.bossStats.image": newImage });
            }
        } catch (e) {
            warnLog("Boss visual update failed", e);
        }
    };
    const handleStartQuestion = async () => {
        const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
        try { await updateDoc(sessionRef, { "quizState.phase": "answering", "quizState.responses": {}, "quizState.currentQuestionIndex": currentQuestionIndex, "quizState.bossStats.lastDamage": 0 }); } catch(e) { warnLog('Firestore sync failed:', e); }
    };
    const handleRevealResults = async () => {
        try {
            const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
            let updatePayload = {
                "quizState.phase": "revealed",
            };
            const isCorrect = (responseIndex) => {
                if (responseIndex === undefined || responseIndex === null) return false;
                return question.options[responseIndex] === question.correctAnswer;
            };
            if (mode === 'boss-battle') {
                let correctCount = 0;
                Object.values(responses || {}).forEach(val => {
                    if (isCorrect(val)) correctCount++;
                });
                const totalResponses = Object.keys(responses || {}).length;
                const wrongCount = totalResponses - correctCount;
                const damage = correctCount * 10;
                const currentHP = bossStats?.currentHP || 1000;
                const newHP = Math.max(0, currentHP - damage);
                const difficultyMultiplier = bossStats?.difficulty === 'easy' ? 0.5 : bossStats?.difficulty === 'hard' ? 1.5 : 1.0;
                const baseClassDamage = totalResponses > 0
                    ? Math.ceil((wrongCount / totalResponses) * 25)
                    : 0;
                const classDamage = Math.round(baseClassDamage * difficultyMultiplier);
                const currentClassHP = bossStats?.classHP ?? 100;
                const newClassHP = Math.max(0, currentClassHP - classDamage);
                updatePayload["quizState.bossStats.currentHP"] = newHP;
                updatePayload["quizState.bossStats.lastDamage"] = damage;
                updatePayload["quizState.bossStats.classHP"] = newClassHP;
                updatePayload["quizState.bossStats.lastClassDamage"] = classDamage;
                const battleLogEntry = {
                    questionIndex: currentQuestionIndex,
                    damage,
                    classDamage,
                    correctCount,
                    totalResponses,
                    accuracy: totalResponses > 0 ? Math.round((correctCount / totalResponses) * 100) : 0
                };
                const existingLog = bossStats?.battleLog || [];
                updatePayload["quizState.bossStats.battleLog"] = [...existingLog, battleLogEntry];
                if (newHP <= 0 && newClassHP > 0) {
                    updatePayload["quizState.phase"] = "boss-defeated";
                } else if (newClassHP <= 0 && newHP > 0) {
                    updatePayload["quizState.phase"] = "class-defeated";
                }
                if (damage > 0 && bossStats?.image) {
                    triggerBossVisualUpdate(bossStats.image, newHP <= 0 ? 'defeated' : 'hurt');
                }
            }
            else if (mode === 'team-showdown') {
                const currentScores = sessionData.quizState.teamScores || {};
                const teamStats = {};
                Object.entries(responses || {}).forEach(([uid, ansIdx]) => {
                    const teamColor = sessionData.quizState.teams?.[uid];
                    if (teamColor) {
                        if (!teamStats[teamColor]) teamStats[teamColor] = { total: 0, correct: 0 };
                        teamStats[teamColor].total++;
                        if (isCorrect(ansIdx)) teamStats[teamColor].correct++;
                    }
                });
                Object.entries(teamStats).forEach(([team, stats]) => {
                    const percentage = stats.total > 0 ? (stats.correct / stats.total) : 0;
                    const pointsEarned = Math.round(percentage * 1000);
                    const oldScore = currentScores[team] || 0;
                    updatePayload[`quizState.teamScores.${team}`] = oldScore + pointsEarned;
                    updatePayload[`quizState.lastRoundStats.${team}`] = {
                        points: pointsEarned,
                        percent: Math.round(percentage * 100)
                    };
                });
            }
            try { await updateDoc(sessionRef, updatePayload); } catch(e) { warnLog('Firestore sync failed:', e); }
        } catch (e) { warnLog("Unhandled error in handleRevealResults:", e); }
    };
    const handleNextQuestion = async () => {
        try {
            const nextIdx = currentQuestionIndex + 1;
            if (nextIdx >= generatedContent?.data.questions.length) return;
            const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
            await updateDoc(sessionRef, {
                "quizState.currentQuestionIndex": nextIdx,
                "quizState.phase": "idle",
                "quizState.responses": {},
                "quizState.bossStats.lastDamage": 0
            });
        } catch (e) { warnLog("Unhandled error in handleNextQuestion:", e); }
    };
    const handlePrevQuestion = async () => {
        try {
            const prevIdx = currentQuestionIndex - 1;
            if (prevIdx < 0) return;
            const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
            await updateDoc(sessionRef, {
                "quizState.currentQuestionIndex": prevIdx,
                "quizState.phase": "idle",
                "quizState.responses": {},
                "quizState.bossStats.lastDamage": 0
            });
        } catch (e) { warnLog("Unhandled error in handlePrevQuestion:", e); }
    };
    const handleEndQuiz = async () => {
        addToast(t('quiz.session_ended_success') || "Session ended successfully.", "success");
        try {
            const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
            await updateDoc(sessionRef, {
                "quizState.isActive": false
            });
        } catch (err) {
            warnLog("Quiz end Firestore failed (Canvas sandbox):", err.message);
        }
    };
    const handleModeChange = async (e) => {
        const newMode = e.target.value;
        const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
        const updates = { "quizState.mode": newMode };
        if (newMode === 'boss-battle') {
            const qCount = generatedContent?.data.questions.length;
            const sCount = Math.max(1, totalStudents);
            const baseHP = (qCount * sCount * 10);
            const hpMultiplier = bossDifficulty === 'easy' ? 0.5 : bossDifficulty === 'hard' ? 1.5 : 1.0;
            const maxHP = Math.round(baseHP * hpMultiplier);
            const existingImage = bossStats?.image || null;
            updates["quizState.bossStats"] = {
                maxHP: maxHP,
                currentHP: maxHP,
                classHP: 100,
                classMaxHP: 100,
                name: t('quiz.boss.default_name'),
                lastDamage: 0,
                lastClassDamage: 0,
                image: existingImage,
                isGenerating: false,
                difficulty: bossDifficulty,
                battleLog: []
            };
            if (!existingImage) {
                setTimeout(generateBossAsset, 100);
            }
        }
        try { await updateDoc(sessionRef, updates); } catch(e) { warnLog('Firestore sync failed:', e); }
    };
    const [newGroupName, setNewGroupName] = useState("");
    const groups = sessionData.groups || {};
    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        await onCreateGroup(newGroupName.trim());
        setNewGroupName("");
    };
    const handleAssignStudent = onAssignStudent;
    const handleSetGroupResource = onSetGroupResource;
    const handleSetGroupLanguage = onSetGroupLanguage;
    const handleSetGroupProfile = onSetGroupProfile;
    const handleDeleteGroup = onDeleteGroup;
    const availableResources = generatedContent?.data.resources || [];
    const activeGroups = useMemo(() => Object.entries(groups).filter(([_, g]) => g !== null), [groups]);
    return (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-400 overflow-hidden mb-6 animate-in slide-in-from-top-4 duration-500">
            <div className="bg-indigo-900 text-white p-4 flex justify-between items-center flex-wrap gap-4">
                <h3 className="font-bold flex items-center gap-2"><MonitorPlay size={20} className="text-teal-400"/> {t('quiz.live_control_center')}</h3>
                <div className="flex items-center gap-4">
                     <select aria-label={t('common.selection')}
                        value={mode || 'live-pulse'} data-help-key="quiz_mode_select"
                        onChange={handleModeChange}
                        className="bg-indigo-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-600 focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer"
                     >
                         <option value="live-pulse">📊 {t('quiz.modes.live_pulse')}</option>
                         <option value="boss-battle">⚔️ {t('quiz.modes.boss_battle')}</option>
                         <option value="team-showdown">🏆 {t('quiz.modes.team_showdown')}</option>
                     </select>
                     {mode === 'boss-battle' && (
                         <select aria-label={t('common.selection')}
                             value={bossDifficulty}
                             onChange={(e) => setBossDifficulty(e.target.value)}
                             disabled={phase !== 'lobby'}
                             className={`text-xs font-bold px-3 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer ${
                                 bossDifficulty === 'easy' ? 'bg-emerald-600 border-emerald-500 text-white' :
                                 bossDifficulty === 'hard' ? 'bg-red-600 border-red-500 text-white' :
                                 'bg-amber-500 border-amber-400 text-white'
                             } ${phase !== 'lobby' ? 'opacity-60 cursor-not-allowed' : ''}`}
                             title={phase !== 'lobby' ? t('quiz.boss.difficulty_locked') : t('quiz.boss.select_difficulty')}
                         >
                             <option value="easy">🌱 {t('quiz.boss.difficulty_easy')}</option>
                             <option value="normal">⚔️ {t('quiz.boss.difficulty_normal')}</option>
                             <option value="hard">💀 {t('quiz.boss.difficulty_hard')}</option>
                         </select>
                     )}
                     {mode !== 'live-pulse' && (
                         <button
                             aria-label={t('common.start_game')}
                             onClick={() => setShowLocalStats(prev => !prev)} data-help-key="quiz_local_stats_btn"
                             className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 border ${showLocalStats ? 'bg-yellow-400 text-indigo-900 border-yellow-500' : 'bg-indigo-800 text-indigo-200 border-indigo-600 hover:bg-indigo-700'}`}
                             title={t('quiz.toggle_stats_tooltip')}
                         >
                             {showLocalStats ? <Gamepad2 size={14}/> : <Layout size={14}/>}
                             {showLocalStats ? t('quiz.show_game') : t('quiz.show_stats')}
                         </button>
                     )}
                     <div className="text-xs font-mono bg-indigo-800 px-3 py-1.5 rounded-full font-bold shadow-sm border border-indigo-700">
                        {t('quiz.answered_status', {
                            current: answeredCount,
                            total: totalStudents,
                            percent: percentage
                        })}
                     </div>
                     <button onClick={handleEndQuiz} className="text-xs bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-full font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-white">
                        {t('quiz.end_quiz')}
                     </button>
                </div>
            </div>
            <div className="w-full h-1.5 bg-slate-100 relative">
                <div className="bg-teal-500 h-full transition-all duration-500 ease-out" style={{ width: `${percentage}%` }}></div>
            </div>
            <div className="bg-slate-50 border-b border-slate-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">{t('groups.title')}</h4>
                        <div className="flex gap-2 mb-3">
                             <input aria-label={t('common.new_group_name')}
                                type="text"
                                value={newGroupName} data-help-key="quiz_new_group_input"
                                onChange={(e) => setNewGroupName(e.target.value)}
                                placeholder={t('groups.new_group_placeholder')}
                                className="text-sm p-1.5 rounded border border-slate-400 flex-1"
                             />
                             <button
                                onClick={handleCreateGroup} data-help-key="quiz_add_group_btn"
                                disabled={!newGroupName.trim()}
                                className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded hover:bg-indigo-700 disabled:opacity-50 font-bold"
                             >
                                 + {t('groups.add_button')}
                             </button>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                            {activeGroups.map(([gid, group]) => (
                                <div key={gid} className="bg-white p-2 rounded border border-indigo-100 shadow-sm flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-indigo-900">{group.name}</span>
                                            <button onClick={() => handleDeleteGroup(gid)} className="text-[11px] text-red-400 hover:text-red-600 font-bold focus:outline-none focus:ring-2 focus:ring-red-400 rounded">{t('groups.remove_button')}</button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] uppercase font-bold text-slate-600">{t('groups.resource_label')}</span>
                                        <select aria-label={t('common.selection')}
                                            value={group.resourceId || ""} data-help-key="quiz_group_resource_select"
                                            onChange={(e) => handleSetGroupResource(gid, e.target.value)}
                                            disabled={isPushingResource[gid] === 'pushing'}
                                            className="text-xs p-1 rounded border border-slate-400 w-full truncate bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <option value="">{t('groups.default_resource')}</option>
                                            {availableResources.map(r => (
                                                <option key={r.id} value={r.id}>{r.title || r.type}</option>
                                            ))}
                                        </select>
                                        {isPushingResource[gid] === 'pushing' && (
                                            <span className="flex items-center gap-1 text-[10px] text-purple-600 font-bold whitespace-nowrap">
                                                <RefreshCw size={11} className="animate-spin" /> {t('groups.pushing') || 'Pushing…'}
                                            </span>
                                        )}
                                        {isPushingResource[gid] === 'success' && (
                                            <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold whitespace-nowrap">
                                                <CheckCircle2 size={11} /> {t('groups.pushed') || 'Sent'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] uppercase font-bold text-slate-600">{t('groups.language_label') || 'Quiz Language'}</span>
                                        <select aria-label={t('common.selection')}
                                            value={group.language || ""} data-help-key="quiz_group_language_select"
                                            onChange={(e) => handleSetGroupLanguage(gid, e.target.value)}
                                            className="text-xs p-1 rounded border border-slate-400 w-full truncate bg-slate-50"
                                            title={t('groups.language_tooltip') || 'Students see quizzes in this language'}
                                        >
                                            <option value="">{t('groups.language_default') || 'English (Default)'}</option>
                                            <option value="Spanish">Spanish</option>
                                            <option value="Vietnamese">Vietnamese</option>
                                            <option value="Mandarin">Mandarin</option>
                                            <option value="Arabic">Arabic</option>
                                            <option value="French">French</option>
                                            <option value="Portuguese">Portuguese</option>
                                            <option value="Korean">Korean</option>
                                            <option value="Tagalog">Tagalog</option>
                                            <option value="Russian">Russian</option>
                                            <option value="Japanese">Japanese</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] uppercase font-bold text-slate-600">{t('groups.reading_level_label') || 'Reading Level'}</span>
                                        <select aria-label={t('common.reading_level')}
                                            value={group.readingLevel || ""} data-help-key="group_reading_level_select"
                                            onChange={(e) => handleSetGroupProfile(gid, 'readingLevel', e.target.value || null)}
                                            className="text-xs p-1 rounded border border-slate-400 w-full truncate bg-slate-50"
                                            title={t('groups.reading_level_tooltip') || 'Set reading level for content simplification'}
                                        >
                                            <option value="">{t('groups.class_default') || 'Class Default'}</option>
                                            <option value="K">K</option>
                                            <option value="1st">1st Grade</option>
                                            <option value="2nd">2nd Grade</option>
                                            <option value="3rd">3rd Grade</option>
                                            <option value="4th">4th Grade</option>
                                            <option value="5th">5th Grade</option>
                                            <option value="6th">6th Grade</option>
                                            <option value="7th">7th Grade</option>
                                            <option value="8th">8th Grade</option>
                                            <option value="9th-12th">9th-12th</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] uppercase font-bold text-slate-600">{t('groups.visual_density_label') || 'Visuals'}</span>
                                        <select aria-label={t('common.visual_density')}
                                            value={group.visualDensity || "normal"} data-help-key="group_visual_density_select"
                                            onChange={(e) => handleSetGroupProfile(gid, 'visualDensity', e.target.value)}
                                            className="text-xs p-1 rounded border border-slate-400 w-full truncate bg-slate-50"
                                            title={t('groups.visual_density_tooltip') || 'How much visual support this group receives'}
                                        >
                                            <option value="minimal">{t('groups.visuals_minimal') || 'Minimal'}</option>
                                            <option value="normal">{t('groups.visuals_normal') || 'Normal'}</option>
                                            <option value="high">{t('groups.visuals_high') || 'High (More images)'}</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] uppercase font-bold text-slate-600">{t('groups.tts_speed_label') || 'TTS Speed'}</span>
                                        <select aria-label={t('common.tts_speed')}
                                            value={group.ttsSpeed ?? 1.0} data-help-key="group_tts_speed_select"
                                            onChange={(e) => handleSetGroupProfile(gid, 'ttsSpeed', parseFloat(e.target.value))}
                                            className="text-xs p-1 rounded border border-slate-400 w-full truncate bg-slate-50"
                                            title={t('groups.tts_speed_tooltip') || 'Text-to-speech playback speed for this group'}
                                        >
                                            <option value="0.6">0.6x (Very Slow)</option>
                                            <option value="0.8">0.8x (Slow)</option>
                                            <option value="1.0">1.0x (Normal)</option>
                                            <option value="1.2">1.2x (Fast)</option>
                                            <option value="1.5">1.5x (Very Fast)</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer" title={t('groups.karaoke_tooltip') || 'Auto-enable word highlighting for this group'}>
                                            <input type="checkbox" checked={group.karaokeMode || false} onChange={(e) => handleSetGroupProfile(gid, 'karaokeMode', e.target.checked)} className="rounded border-slate-300 text-indigo-500 focus:ring-indigo-400" />
                                            {t('groups.karaoke_label') || 'Karaoke Mode'}
                                        </label>
                                    <div className="flex items-center gap-3 mt-1">
                                        <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer" title={t('common.toggle_emoji_usage_for_this_group')}>
                                            <input type="checkbox" checked={g.profile?.useEmojis || false} onChange={(e) => handleSetGroupProfile(gid, 'useEmojis', e.target.checked)} className="rounded border-slate-300 text-indigo-500 focus:ring-indigo-400" />
                                            {t('roster.emojis_label') || 'Use Emojis'}
                                        </label>
                                        <select aria-label={t('common.text_format')} value={g.profile?.textFormat || 'Standard Text'} onChange={(e) => handleSetGroupProfile(gid, 'textFormat', e.target.value)} className="text-[11px] p-1 rounded border border-slate-400 bg-slate-50">
                                            <option value="Standard Text">{t('roster.format_standard') || 'Standard'}</option>
                                            <option value="Bullet Points">{t('roster.format_bullets') || 'Bullets'}</option>
                                            <option value="Outline">{t('roster.format_outline') || 'Outline'}</option>
                                        </select>
                                    </div>
                                    </div>
                                </div>
                            ))}
                            {activeGroups.length === 0 && (
                                <div className="text-xs text-slate-600 italic text-center py-2">{t('groups.no_groups')}</div>
                            )}
                        </div>
                    </div>
                    <div className="flex-[2] border-l border-slate-200 pl-4">
                        <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">{t('groups.roster_title')}</h4>
                        <div className="bg-white rounded border border-slate-400 p-3 max-h-52 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                {Object.entries(roster || {}).map(([uid, student]) => {
                                    const groupId = student.groupId;
                                    const groupName = groupId && groups[groupId] ? groups[groupId].name : null;
                                    return (
                                        <div key={uid} className={`relative p-2 rounded border text-xs ${groupName ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                                            <div className="font-bold truncate" title={student.displayName}>{student.displayName || "Anonymous"}</div>
                                            <div className={`mt-1 text-[11px] font-mono truncat ${groupName ? 'text-indigo-600' : 'text-slate-600'}`}>
                                                {groupName || t('groups.main_class')}
                                            </div>
                                            <select aria-label={t('common.selection')}
                                                onChange={(e) => handleAssignStudent(uid, e.target.value || null)} data-help-key="quiz_assign_student_select"
                                                value={groupId || ""}
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                title={t('groups.move_to')}
                                            >
                                                <option value="">{t('groups.main_class')}</option>
                                                {activeGroups.map(([gid, grp]) => (
                                                    <option key={gid} value={gid}>{grp.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>
                             {(!roster || Object.keys(roster).length === 0) && (
                                <div className="text-center text-slate-600 italic py-4">{t('groups.waiting_students')}</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex flex-col justify-between h-full">
                     <div className="mb-6">
                         <span className="text-xs font-bold text-slate-600 uppercase tracking-widest block mb-2">
                             {t('quiz.question_progress', {
                                 current: currentQuestionIndex + 1,
                                 total: generatedContent?.data.questions.length
                             })}
                         </span>
                         <h2 className="text-2xl font-bold text-slate-800 leading-tight">{question.question}</h2>
                     </div>
                     <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-2">
                         <button
                             onClick={() => setShowQuizRoutingPanel(v => !v)}
                             className="flex items-center gap-2 text-xs font-bold text-amber-800 hover:text-amber-900"
                             aria-expanded={showQuizRoutingPanel}
                         >
                             <span>{showQuizRoutingPanel ? '▾' : '▸'}</span>
                             <span>📊 Auto-routing rules for this question</span>
                             <span className="font-normal text-amber-700">({currentRules.length} rule{currentRules.length === 1 ? '' : 's'})</span>
                         </button>
                         {showQuizRoutingPanel && (
                             <div className="mt-2 space-y-2">
                                 <p className="text-[11px] text-amber-700 leading-snug">
                                     When a student answers, auto-assign them to a group. Use this for <strong>choice</strong> (e.g., "Pirate Crew vs Space Crew") or <strong>formative-assessment</strong> routing. Group resources can then be staged per group via the Groups panel above.
                                 </p>
                                 {groupEntriesForRouting.length === 0 && (
                                     <p className="text-[11px] text-red-700 italic">{t('teacher.quiz_routing.no_groups_warning') || 'Create at least one group in the Groups panel above before adding routing rules.'}</p>
                                 )}
                                 {currentRules.map(rule => (
                                     <div key={rule.id} className="flex flex-wrap items-center gap-1 bg-white border border-amber-200 rounded p-1.5 text-xs">
                                         <span className="text-slate-600">{t('teacher.quiz_routing.when_answer_label') || 'When answer'}</span>
                                         <select
                                             aria-label="Predicate"
                                             value={rule.when.predicate}
                                             onChange={(e) => updateQuizRoutingRule(rule.id, { when: { predicate: e.target.value } })}
                                             className="px-1 py-0.5 border border-slate-300 rounded text-xs"
                                         >
                                             <option value="eq">is</option>
                                             <option value="in">is one of</option>
                                         </select>
                                         <select
                                             aria-label={t('teacher.quiz_routing.answer_option_aria') || 'Answer option'}
                                             value={rule.when.predicate === 'in' ? '' : rule.when.value}
                                             onChange={(e) => updateQuizRoutingRule(rule.id, { when: { value: e.target.value } })}
                                             className="px-1 py-0.5 border border-slate-300 rounded text-xs"
                                         >
                                             <option value="">— pick option —</option>
                                             {(question?.options || []).map((opt, oi) => (
                                                 <option key={oi} value={opt}>{String.fromCharCode(65 + oi)}: {opt}</option>
                                             ))}
                                         </select>
                                         <span className="text-slate-600">→ assign to</span>
                                         <select
                                             aria-label={t('teacher.quiz_routing.target_group_aria') || 'Target group'}
                                             value={rule.then.groupId}
                                             onChange={(e) => updateQuizRoutingRule(rule.id, { then: { groupId: e.target.value } })}
                                             className="px-1 py-0.5 border border-slate-300 rounded text-xs"
                                         >
                                             <option value="">— pick group —</option>
                                             {groupEntriesForRouting.map(([gid, g]) => (
                                                 <option key={gid} value={gid}>{g.name || gid}</option>
                                             ))}
                                         </select>
                                         <button
                                             onClick={() => removeQuizRoutingRule(rule.id)}
                                             aria-label={t('teacher.quiz_routing.remove_rule_aria') || 'Remove rule'}
                                             className="ml-auto px-1.5 py-0.5 text-red-700 hover:bg-red-50 rounded border border-red-200"
                                         >✕</button>
                                     </div>
                                 ))}
                                 <button
                                     onClick={addQuizRoutingRule}
                                     disabled={groupEntriesForRouting.length === 0}
                                     className={`text-xs font-bold px-2 py-1 rounded border border-dashed ${groupEntriesForRouting.length === 0 ? 'border-slate-300 text-slate-400 cursor-not-allowed' : 'border-amber-500 text-amber-800 hover:bg-amber-100'}`}
                                 >+ Add rule</button>
                             </div>
                         )}
                     </div>
                     <div className="space-y-3 mt-auto">
                         {phase === 'answering' ? (
                             <button aria-label={t('common.toggle_visibility')}
                                onClick={handleRevealResults} data-help-key="quiz_reveal_btn"
                                className="w-full py-4 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-indigo-900 font-black text-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                             >
                                 <Eye size={24}/> {t('quiz.reveal_results')}
                             </button>
                         ) : (
                             <button aria-label={t('common.play')}
                                onClick={handleStartQuestion} data-help-key="quiz_start_question_btn"
                                className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                             >
                                 <Play size={24} className="fill-current"/> {phase === 'revealed' ? t('quiz.restart_question') : t('quiz.start_question')}
                             </button>
                         )}
                         <div className="flex gap-3 pt-2">
                             <button
                                onClick={handlePrevQuestion} data-help-key="quiz_prev_question_btn"
                                disabled={currentQuestionIndex === 0}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <ArrowDown className="rotate-90" size={16}/> {t('common.prev')}
                             </button>
                             <button
                                onClick={handleNextQuestion} data-help-key="quiz_next_question_btn"
                                disabled={currentQuestionIndex >= generatedContent?.data.questions.length - 1}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {t('common.next')} <ArrowDown className="-rotate-90" size={16}/>
                             </button>
                         </div>
                     </div>
                </div>
                <div className="bg-slate-50 rounded-xl border border-slate-400 p-6 flex flex-col items-center justify-center min-h-[300px] relative">
                     {(showLocalStats || mode === 'live-pulse') ? (
                         answeredCount > 0 ? renderAnalytics() : (
                            <div className="text-slate-600 italic flex flex-col items-center gap-2 h-full justify-center">
                                <Layout size={48} className="opacity-20"/>
                                <span className="text-sm font-medium">{t('quiz.waiting_responses')}</span>
                            </div>
                         )
                     ) : (
                         <>
                            {mode === 'boss-battle' && bossStats ? (
                                <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 relative">
                                     {phase === 'boss-defeated' && (
                                         <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-green-900/95 to-emerald-800/95 backdrop-blur-lg rounded-xl animate-in zoom-in duration-500">
                                             <div className="text-center p-8">
                                                 <div className="text-7xl mb-4">🎉</div>
                                                 <h2 className="text-4xl font-black text-white mb-2 drop-shadow-lg">{t('quiz.boss.victory_msg')}</h2>
                                                 <p className="text-lg text-green-200">{bossStats?.name || "Boss"} has been defeated!</p>
                                             </div>
                                         </div>
                                     )}
                                     {phase === 'class-defeated' && (
                                         <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-red-900/95 to-rose-800/95 backdrop-blur-lg rounded-xl animate-in zoom-in duration-500">
                                             <div className="text-center p-8">
                                                 <div className="text-7xl mb-4">💀</div>
                                                 <h2 className="text-4xl font-black text-white mb-2 drop-shadow-lg">{t('quiz.boss.class_defeat_msg')}</h2>
                                                 <p className="text-lg text-red-200">{t('teacher.boss.class_fallen') || 'The class has fallen...'}</p>
                                             </div>
                                         </div>
                                     )}
                                     <div className={`relative mb-6 ${phase === 'revealed' && bossStats.lastDamage > 0 ? 'animate-shake' : ''}`}>
                                         {bossStats.image ? (
                                             <img loading="lazy"
                                                src={bossStats.image}
                                                alt="Boss"
                                                className="w-48 h-48 object-contain pixelated drop-shadow-xl"
                                                style={STYLE_IMAGE_PIXELATED}
                                             />
                                         ) : (
                                             <div className="w-32 h-32 bg-red-100 rounded-full border-4 border-red-500 flex items-center justify-center text-6xl shadow-xl relative z-10">
                                                 {bossStats.isGenerating ? <RefreshCw className="animate-spin text-red-500"/> : "👾"}
                                             </div>
                                         )}
                                         {phase === 'revealed' && bossStats.lastDamage > 0 && (
                                             <div className="absolute top-0 right-[-20px] text-red-600 font-black text-4xl animate-[bounce_0.5s_infinite] z-20 stroke-white drop-shadow-md">
                                                 -{bossStats.lastDamage}
                                             </div>
                                         )}
                                     </div>
                                     <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest mb-2">{bossStats.name || t('quiz.boss.default_name')}</h3>
                                     <div className="w-full max-w-sm bg-slate-300 h-8 rounded-full border-4 border-slate-400 relative overflow-hidden shadow-inner mb-2">
                                         <div
                                            className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-1000 ease-out"
                                            style={{ width: `${(bossStats.currentHP / bossStats.maxHP) * 100}%` }}
                                         ></div>
                                         <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-white drop-shadow-md">
                                             {Math.round(bossStats.currentHP)} / {bossStats.maxHP} {t('quiz.hp')}
                                         </div>
                                     </div>
                                     <div className="w-full max-w-sm bg-slate-300 h-6 rounded-full border-4 border-slate-400 relative overflow-hidden shadow-inner mb-2">
                                         <div
                                            className="h-full bg-gradient-to-r from-green-600 to-emerald-400 transition-all duration-1000 ease-out"
                                            style={{ width: `${((bossStats.classHP ?? 100) / (bossStats.classMaxHP || 100)) * 100}%` }}
                                         ></div>
                                         <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-white drop-shadow-md">
                                             {t('quiz.boss.class_hp')}: {Math.round(bossStats.classHP ?? 100)} / {bossStats.classMaxHP || 100}
                                         </div>
                                     </div>
                                     {phase === 'revealed' && bossStats.lastClassDamage > 0 && (
                                         <div className="text-orange-600 font-bold text-sm mb-2 animate-pulse">
                                             {t('quiz.boss.counter_attack_msg', { damage: bossStats.lastClassDamage })}
                                         </div>
                                     )}
                                     {phase === 'revealed' && (
                                         <div className="mt-2 text-center">
                                             {(bossStats.classHP ?? 100) <= 0 ? (
                                                 <div className="text-red-600 font-black text-2xl animate-bounce">{t('quiz.boss.class_defeat_msg')}</div>
                                             ) : bossStats.currentHP <= 0 ? (
                                                 <div className="text-green-600 font-black text-2xl animate-bounce">{t('quiz.boss.victory_msg')}</div>
                                             ) : bossStats.lastDamage > 0 ? (
                                                 <div className="text-red-500 font-bold">{t('quiz.boss.attack_msg', { damage: bossStats.lastDamage })}</div>
                                             ) : (
                                                 <div className="text-slate-600 font-bold">{t('quiz.boss.miss_msg')}</div>
                                             )}
                                         </div>
                                     )}
                                 </div>
                            ) : mode === 'team-showdown' ? (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-6">
                                     <div className="flex items-end justify-center gap-4 w-full h-48 pb-2 border-b-2 border-slate-200">
                                         {['Red', 'Blue', 'Green', 'Yellow'].map(team => {
                                             const score = teamScores?.[team] || 0;
                                             const maxScore = Math.max(2000, ...Object.values(teamScores || {}));
                                             const height = Math.max(5, (score / maxScore) * 100);
                                             const colors = {
                                                 Red: 'bg-red-500', Blue: 'bg-blue-500', Green: 'bg-green-500', Yellow: 'bg-yellow-400',
                                             };
                                             return (
                                                 <div key={team} className="flex flex-col items-center justify-end h-full w-16 group relative">
                                                     <span className="mb-1 font-black text-slate-700 text-sm">{score}</span>
                                                     <div
                                                        className={`w-full rounded-t-lg transition-all duration-700 ease-out ${colors[team]} shadow-lg`}
                                                        style={{ height: `${height}%` }}
                                                     ></div>
                                                     <span className="mt-2 text-xs font-bold uppercase text-slate-600">{t(`quiz.teams.${team.toLowerCase()}`)}</span>
                                                     {phase === 'revealed' && sessionData.quizState.lastRoundStats?.[team]?.points > 0 && (
                                                         <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-yellow-300 text-indigo-900 text-xs font-black px-2 py-1 rounded shadow-sm animate-bounce whitespace-nowrap z-10">
                                                             +{sessionData.quizState.lastRoundStats[team].points}
                                                         </div>
                                                     )}
                                                 </div>
                                             );
                                         })}
                                     </div>
                                     <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">{t('quiz.team_leaderboard')}</p>
                                 </div>
                            ) : null}
                         </>
                     )}
                     {phase === 'revealed' && (
                         <div className="mt-6 w-full bg-green-100 border border-green-200 text-green-800 p-4 rounded-xl text-center animate-in slide-in-from-bottom-2 shadow-sm z-10">
                             <span className="block text-[11px] font-black uppercase tracking-widest text-green-600 mb-1">{t('quiz.correct_answer_label')}</span>
                             <span className="text-lg font-bold">{question.correctAnswer}</span>
                         </div>
                     )}
                </div>
            </div>
        </div>
    );
});
const calculateAnalyticsMetrics = (dashboardData) => {
  if (!dashboardData || !Array.isArray(dashboardData) || dashboardData.length === 0) {
    return {
      averageScore: 0,
      quizCompletionRate: 0,
      avgAdventureLevel: 0,
      misconceptions: []
    };
  }
  let totalQuizPercentage = 0;
  let totalQuizzesCount = 0;
  let studentsWithAtLeastOneQuiz = 0;
  let totalAdventureLevels = 0;
  let studentsWithAdventureData = 0;
  const missedQuestionsFrequency = {};
  dashboardData.forEach(student => {
    const history = student.history || [];
    const responses = student.responses || {};
    let studentHasQuiz = false;
    const adventureItems = history.filter(h => h.type === 'adventure');
    if (adventureItems.length > 0) {
        const lastAdventure = adventureItems[adventureItems.length - 1];
        const level = lastAdventure.data?.level || 1;
        if (typeof level === 'number') {
            totalAdventureLevels += level;
            studentsWithAdventureData++;
        }
    }
    const quizItems = history.filter(h => h.type === 'quiz');
    if (quizItems.length > 0) {
        studentHasQuiz = true;
        quizItems.forEach(quiz => {
            const questions = quiz.data?.questions || [];
            if (questions.length === 0) return;
            let correctCount = 0;
            questions.forEach((q, qIdx) => {
                const studentResponse = responses[quiz.id]?.[qIdx];
                if (studentResponse !== undefined && studentResponse !== null) {
                    let selectedOptionText = studentResponse;
                    if (!isNaN(parseInt(studentResponse)) && q.options && q.options[studentResponse]) {
                         selectedOptionText = q.options[studentResponse];
                    }
                    const cleanSelected = String(selectedOptionText).trim().toLowerCase();
                    const cleanCorrect = String(q.correctAnswer).trim().toLowerCase();
                    if (cleanSelected === cleanCorrect) {
                        correctCount++;
                    } else {
                        const qText = q.question;
                        if (!missedQuestionsFrequency[qText]) {
                            missedQuestionsFrequency[qText] = 0;
                        }
                        missedQuestionsFrequency[qText]++;
                    }
                } else {
                    const qText = q.question;
                    if (!missedQuestionsFrequency[qText]) {
                        missedQuestionsFrequency[qText] = 0;
                    }
                    missedQuestionsFrequency[qText]++;
                }
            });
            const score = (correctCount / questions.length) * 100;
            totalQuizPercentage += score;
            totalQuizzesCount++;
        });
    }
    if (studentHasQuiz) {
        studentsWithAtLeastOneQuiz++;
    }
  });
  const averageScore = totalQuizzesCount > 0 ? (totalQuizPercentage / totalQuizzesCount) : 0;
  const quizCompletionRate = dashboardData.length > 0 ? (studentsWithAtLeastOneQuiz / dashboardData.length) * 100 : 0;
  const avgAdventureLevel = studentsWithAdventureData > 0 ? (totalAdventureLevels / studentsWithAdventureData) : 0;
  const misconceptions = Object.entries(missedQuestionsFrequency)
    .map(([question, count]) => ({ question, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return {
    averageScore: Number(averageScore.toFixed(1)),
    quizCompletionRate: Number(quizCompletionRate.toFixed(1)),
    avgAdventureLevel: Number(avgAdventureLevel.toFixed(1)),
    misconceptions
  };
};
const LongitudinalProgressChart = React.memo(({ logs }) => {
    const { t } = useContext(LanguageContext);
    if (!logs || logs.length < 2) return (
        <div className="w-full bg-white p-6 rounded-xl border border-slate-400 shadow-sm mt-4 flex flex-col items-center justify-center text-slate-600 italic gap-2">
            <History size={24} className="opacity-50"/>
            <span className="text-xs">{t('dashboard.progress_chart.empty_msg')}</span>
        </div>
    );
    const width = 600;
    const height = 200;
    const padding = 30;
    const maxXP = Math.max(...logs.map(l => l.xp), 100);
    const minTime = new Date(logs[0].timestamp).getTime();
    const maxTime = new Date(logs[logs.length - 1].timestamp).getTime();
    const timeSpan = maxTime - minTime || 1;
    const points = logs.map(l => {
        const x = padding + ((new Date(l.timestamp).getTime() - minTime) / timeSpan) * (width - (padding * 2));
        const y = height - padding - ((l.xp / maxXP) * (height - (padding * 2)));
        return `${x},${y}`;
    }).join(" ");
    return (
        <div className="w-full bg-white p-6 rounded-xl border border-slate-400 shadow-sm mt-6 animate-in slide-in-from-bottom-2">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Trophy size={14} className="text-yellow-500"/> {t('dashboard.progress_chart.title')}
            </h4>
            <div className="w-full overflow-x-auto">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px] overflow-visible">
                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" strokeWidth="2" />
                    <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e2e8f0" strokeWidth="2" />
                    <polyline
                        points={points}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="drop-shadow-sm"
                    />
                    {logs.map((l, i) => {
                         const x = padding + ((new Date(l.timestamp).getTime() - minTime) / timeSpan) * (width - (padding * 2));
                         const y = height - padding - ((l.xp / maxXP) * (height - (padding * 2)));
                         return (
                             <g key={i} className="group cursor-pointer">
                                 <circle cx={x} cy={y} r="5" className="fill-white stroke-indigo-600 stroke-2 transition-all duration-300 group-hover:r-7 group-hover:fill-indigo-50" />
                                 <foreignObject x={Math.min(width - 120, Math.max(0, x - 60))} y={y - 50} width="120" height="50" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                     <div className="bg-slate-800 text-white text-[11px] px-3 py-2 rounded-lg text-center shadow-xl">
                                         <div className="font-bold">{new Date(l.timestamp).toLocaleDateString()}</div>
                                         <div className="text-yellow-300 font-mono">{l.xp} XP</div>
                                     </div>
                                 </foreignObject>
                             </g>
                         )
                    })}
                </svg>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 font-medium mt-2 px-2">
                <span>{t('dashboard.progress_chart.label_start')}: {new Date(logs[0].timestamp).toLocaleDateString()}</span>
                <span>{t('dashboard.progress_chart.label_current')}: {new Date(logs[logs.length-1].timestamp).toLocaleDateString()}</span>
            </div>
        </div>
    );
});
// @section LEARNER_PROGRESS — Student learning journey view
const LearnerProgressView = React.memo(({
    globalPoints = 0, globalLevel = 1, globalProgress = 0, currentLevelXP = 0, globalXPNext = 100,
    history = [], wordSoundsHistory = [], phonemeMastery = {},
    studentProgressLog = [], pointHistory = [], wordSoundsBadges = {},
    gameCompletions = [], fluencyAssessments = [], labelChallengeResults = [],
    wordSoundsScore = { streak: 0 },
    isParentMode = false, isIndependentMode = false, isTeacherMode = false, t, onClose,
    rosterKey, setRosterKey, onShareWithTeacher
}) => {
    const [showDiagnostics, setShowDiagnostics] = useState(() => isIndependentMode);
    const [selectedChild, setSelectedChild] = useState(null);
    const childProfiles = useMemo(() => {
        if (!isParentMode || !rosterKey?.students) return [];
        return Object.entries(rosterKey.students).map(([name, groupId]) => ({
            name,
            groupId,
            lastSession: rosterKey?.progressHistory?.[name]?.slice(-1)?.[0]?.timestamp || null,
            sessionCount: rosterKey?.progressHistory?.[name]?.length || 0
        }));
    }, [isParentMode, rosterKey]);
    const stats = useMemo(() => {
        const quizzes = history.filter(h => h.type === 'quiz');
        const wsCorrect = wordSoundsHistory.filter(h => h.correct).length;
        const wsTotal = wordSoundsHistory.length;
        const wsAccuracy = wsTotal > 0 ? Math.round((wsCorrect / wsTotal) * 100) : 0;
        const masteredPhonemes = Object.entries(phonemeMastery).filter(([_, v]) => v.accuracy >= 80);
        const practicingPhonemes = Object.entries(phonemeMastery).filter(([_, v]) => v.accuracy > 0 && v.accuracy < 80);
        const totalActivities = history.length + (wsTotal > 0 ? 1 : 0) + (gameCompletions?.length || 0);
        const recentSessions = studentProgressLog.slice(-5);
        const trend = recentSessions.length >= 2
            ? recentSessions[recentSessions.length - 1].xp - recentSessions[0].xp
            : 0;
        return {
            quizCount: quizzes.length,
            wsAccuracy, wsCorrect, wsTotal,
            masteredPhonemes, practicingPhonemes,
            totalActivities,
            gamesPlayed: gameCompletions?.length || 0,
            fluencyTests: fluencyAssessments?.length || 0,
            labelChallenges: labelChallengeResults?.length || 0,
            sessionCount: studentProgressLog.length,
            trend
        };
    }, [history, wordSoundsHistory, phonemeMastery, gameCompletions, fluencyAssessments, labelChallengeResults, studentProgressLog]);
    const heading = isParentMode
        ? (selectedChild ? selectedChild + "'s Learning Journey" : "Your Child's Learning Journey")
        : "My Learning Progress";
    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500" data-help-key="learner_progress_panel">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <TrendingUp size={22} className="text-white" />
                        </div>
                        {heading}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1 font-medium">
                        {isParentMode ? "Track your family's learning growth" : "Track your learning growth over time"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowDiagnostics(prev => !prev)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                            showDiagnostics
                                ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title={showDiagnostics ? "Hide detailed metrics" : "Show detailed metrics"}
                        data-help-key="learner_progress_details_toggle"
                    >
                        <BarChart3 size={14} />
                        {showDiagnostics ? 'Details On' : 'Details'}
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>
            {isParentMode && childProfiles.length > 0 && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-100" data-help-key="learner_progress_family_filter">
                    <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Users size={14} /> Family Members
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedChild(null)}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                !selectedChild ? 'bg-white text-indigo-700 shadow-md ring-2 ring-indigo-300' : 'bg-white/60 text-slate-600 hover:bg-white'
                            }`}
                        >
                            Everyone
                        </button>
                        {childProfiles.map(child => (
                            <button
                                key={child.name}
                                onClick={() => setSelectedChild(child.name)}
                                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                                    selectedChild === child.name ? 'bg-white text-indigo-700 shadow-md ring-2 ring-indigo-300' : 'bg-white/60 text-slate-600 hover:bg-white'
                                }`}
                            >
                                {child.name}
                                {child.sessionCount > 0 && (
                                    <span className="text-[11px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-mono">
                                        {child.sessionCount} sessions
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-400 shadow-sm p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-indigo-900 shadow-lg relative">
                            <Trophy size={28} className="text-indigo-900 fill-current" />
                            <div className="absolute -bottom-2 bg-indigo-900 text-yellow-400 text-[11px] font-black px-2 py-0.5 rounded-full border border-white">
                                Lvl {globalLevel}
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('learner.total_xp')}</div>
                            <div className="text-2xl font-black text-indigo-900">{globalPoints.toLocaleString()}</div>
                        </div>
                        {stats.trend > 0 && (
                            <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                                <TrendingUp size={12} /> +{stats.trend} XP
                            </div>
                        )}
                    </div>
                    {!isTeacherMode && (wordSoundsScore?.streak > 0 || (() => {
                        const days = new Set();
                        pointHistory.forEach(e => { if (e.timestamp) days.add(new Date(e.timestamp).toDateString()); });
                        const dayList = Array.from(days).sort((a, b) => new Date(b) - new Date(a));
                        let dayStreak = 0;
                        const today = new Date();
                        for (let i = 0; i < dayList.length; i++) {
                            const expected = new Date(today);
                            expected.setDate(today.getDate() - i);
                            if (dayList[i] === expected.toDateString()) dayStreak++;
                            else break;
                        }
                        return dayStreak >= 2;
                    })()) && (
                        <div className="flex items-center gap-3 mb-2 px-3 py-2 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100">
                            {wordSoundsScore?.streak > 0 && (
                                <div className="flex items-center gap-1">
                                    <span className="text-lg">🔥</span>
                                    <div>
                                        <div className="text-sm font-black text-orange-600">{wordSoundsScore.streak} Streak</div>
                                        <div className="text-[11px] text-orange-400 font-bold uppercase">{t('learner.current_run')}</div>
                                    </div>
                                </div>
                            )}
                            {(() => {
                                const days = new Set();
                                pointHistory.forEach(e => { if (e.timestamp) days.add(new Date(e.timestamp).toDateString()); });
                                const dayList = Array.from(days).sort((a, b) => new Date(b) - new Date(a));
                                let dayStreak = 0;
                                const today = new Date();
                                for (let i = 0; i < dayList.length; i++) {
                                    const expected = new Date(today);
                                    expected.setDate(today.getDate() - i);
                                    if (dayList[i] === expected.toDateString()) dayStreak++;
                                    else break;
                                }
                                return dayStreak >= 2 ? (
                                    <div className="flex items-center gap-1 ml-auto">
                                        <span className="text-lg">📅</span>
                                        <div>
                                            <div className="text-sm font-black text-red-600">{dayStreak} Days</div>
                                            <div className="text-[11px] text-red-400 font-bold uppercase">{t('learner.daily_streak')}</div>
                                        </div>
                                    </div>
                                ) : null;
                            })()}
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-bold text-slate-600 uppercase">
                            <span>Level {globalLevel}</span>
                            <span>{Math.round(globalProgress)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-1000 rounded-full" style={{ width: `${Math.max(5, globalProgress)}%` }} />
                        </div>
                        <div className="flex justify-between text-[11px] font-mono text-slate-600">
                            <span>{currentLevelXP} XP</span>
                            <span>{globalXPNext} XP to next</span>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-400 shadow-sm p-5 hover:shadow-md transition-shadow" data-help-key="learner_progress_activities_card">
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <Activity size={14} /> Activities Completed
                    </h3>
                    <div className="text-3xl font-black text-slate-800 mb-4">{stats.totalActivities}</div>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: 'Quizzes', value: stats.quizCount, icon: '📝', color: 'bg-blue-50 text-blue-700' },
                            { label: 'Words Practiced', value: stats.wsTotal, icon: '🔤', color: 'bg-purple-50 text-purple-700' },
                            { label: 'Games', value: stats.gamesPlayed, icon: '🎮', color: 'bg-green-50 text-green-700' },
                            { label: 'Fluency Tests', value: stats.fluencyTests, icon: '⏱️', color: 'bg-orange-50 text-orange-700' },
                        ].map(item => (
                            <div key={item.label} className={`${item.color} rounded-lg px-3 py-2 text-center`}>
                                <div className="text-lg font-black">{item.icon} {item.value}</div>
                                <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-400 shadow-sm p-5 hover:shadow-md transition-shadow" data-help-key="learner_progress_skills_chart">
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Target size={14} /> Skills Progress
                    </h3>
                    {stats.wsTotal === 0 && Object.keys(phonemeMastery).length === 0 ? (
                        <div className="text-center py-6 text-slate-600 italic text-sm">
                            <BookOpen size={32} className="mx-auto mb-2 opacity-40" />
                            Start practicing to see your skills grow!
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {stats.wsTotal > 0 && (
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-bold text-slate-600">{t('learner.ws_accuracy')}</span>
                                        <span className={`text-sm font-black ${stats.wsAccuracy >= 80 ? 'text-green-600' : stats.wsAccuracy >= 60 ? 'text-yellow-600' : 'text-orange-500'}`}>
                                            {stats.wsAccuracy}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${stats.wsAccuracy >= 80 ? 'bg-green-500' : stats.wsAccuracy >= 60 ? 'bg-yellow-500' : 'bg-orange-400'}`}
                                            style={{ width: `${stats.wsAccuracy}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                            {stats.masteredPhonemes.length > 0 && (
                                <div>
                                    <div className="text-[11px] font-bold text-green-600 uppercase tracking-wider mb-1.5">
                                        ✨ {stats.masteredPhonemes.length} Sounds Mastered
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {stats.masteredPhonemes.slice(0, 12).map(([phoneme]) => (
                                            <span key={phoneme} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200">
                                                /{phoneme}/
                                            </span>
                                        ))}
                                        {stats.masteredPhonemes.length > 12 && (
                                            <span className="px-2 py-0.5 bg-green-50 text-green-600 text-xs font-bold rounded-full">
                                                +{stats.masteredPhonemes.length - 12} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                            {showDiagnostics && stats.practicingPhonemes.length > 0 && (
                                <div>
                                    <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">
                                        🔄 {stats.practicingPhonemes.length} Sounds In Progress
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {stats.practicingPhonemes.slice(0, 8).map(([phoneme, data]) => (
                                            <span key={phoneme} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200" title={`${Math.round(data.accuracy)}% accuracy`}>
                                                /{phoneme}/ <span className="opacity-60">{Math.round(data.accuracy)}%</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="bg-white rounded-2xl border border-slate-400 shadow-sm p-5 hover:shadow-md transition-shadow">
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Award size={14} /> Achievements
                    </h3>
                    {(() => {
                        const milestones = [
                            { name: 'First Steps', earned: globalPoints >= 10, icon: '👣', desc: 'Earned your first XP' },
                            { name: 'Quiz Whiz', earned: stats.quizCount >= 3, icon: '🧠', desc: 'Completed 3 quizzes' },
                            { name: 'Word Explorer', earned: stats.wsTotal >= 20, icon: '🔍', desc: 'Practiced 20 words' },
                            { name: 'Game Champion', earned: stats.gamesPlayed >= 5, icon: '🏆', desc: 'Played 5 games' },
                            { name: 'Level Up!', earned: globalLevel >= 2, icon: '⭐', desc: 'Reached Level 2' },
                            { name: 'Super Scholar', earned: globalLevel >= 5, icon: '🌟', desc: 'Reached Level 5' },
                            { name: 'Sound Master', earned: stats.masteredPhonemes.length >= 5, icon: '🎵', desc: 'Mastered 5 phonemes' },
                            { name: 'Consistent', earned: stats.sessionCount >= 3, icon: '📅', desc: '3 learning sessions' },
                        ];
                        const earned = milestones.filter(m => m.earned);
                        const locked = milestones.filter(m => !m.earned);
                        return (
                            <div className="space-y-3">
                                {earned.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {earned.map(m => (
                                            <div key={m.name} className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-center min-w-[80px] hover:shadow-sm transition-shadow" title={m.desc}>
                                                <div className="text-xl">{m.icon}</div>
                                                <div className="text-[11px] font-bold text-yellow-800 mt-0.5">{m.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {earned.length === 0 && (
                                    <div className="text-center py-4 text-slate-600 italic text-sm">
                                        Complete activities to earn achievements! 🌟
                                    </div>
                                )}
                                {showDiagnostics && locked.length > 0 && (
                                    <div>
                                        <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('learner.coming_up')}</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {locked.slice(0, 4).map(m => (
                                                <div key={m.name} className="bg-slate-50 border border-slate-400 rounded-lg px-2 py-1.5 text-center opacity-50" title={m.desc}>
                                                    <div className="text-sm grayscale">{m.icon}</div>
                                                    <div className="text-[11px] font-bold text-slate-600">{m.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>
            {(() => {
                const today = new Date().toDateString();
                const todayXP = pointHistory.filter(e => e.timestamp && new Date(e.timestamp).toDateString() === today);
                const todayWords = wordSoundsHistory.filter(h => h.timestamp && new Date(h.timestamp).toDateString() === today);
                if (todayXP.length === 0 && todayWords.length === 0) return null;
                return (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5">
                        <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Clock size={14} /> Today's Activity
                        </h3>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="bg-white rounded-xl p-3 text-center border border-blue-100">
                                <div className="text-lg font-black text-blue-700">{todayXP.reduce((s,e) => s + (e.points || 0), 0)}</div>
                                <div className="text-[11px] font-bold text-blue-400 uppercase">{t('learner.xp_earned')}</div>
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center border border-blue-100">
                                <div className="text-lg font-black text-blue-700">{todayXP.length}</div>
                                <div className="text-[11px] font-bold text-blue-400 uppercase">Activities</div>
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center border border-blue-100">
                                <div className="text-lg font-black text-blue-700">{todayWords.filter(w => w.correct).length}/{todayWords.length}</div>
                                <div className="text-[11px] font-bold text-blue-400 uppercase">{t('learner.words_today')}</div>
                            </div>
                        </div>
                        {todayXP.length > 0 && (
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                                {todayXP.slice(0, 8).map((entry, i) => (
                                    <div key={entry.id || i} className="flex justify-between items-center text-xs px-2 py-1 rounded bg-white/60">
                                        <span className="text-slate-600 font-medium truncate max-w-[220px]">{entry.activity}</span>
                                        <span className="font-bold text-green-600 whitespace-nowrap">+{entry.points} XP</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })()}
            {(() => {
                const now = new Date();
                const weekAgo = new Date(now);
                weekAgo.setDate(now.getDate() - 7);
                const weekXP = pointHistory.filter(e => e.timestamp && new Date(e.timestamp) >= weekAgo);
                const weekWords = wordSoundsHistory.filter(h => h.timestamp && new Date(h.timestamp) >= weekAgo);
                const weekGames = gameCompletions?.filter(g => g.timestamp && new Date(g.timestamp) >= weekAgo) || [];
                const prevWeekStart = new Date(weekAgo);
                prevWeekStart.setDate(prevWeekStart.getDate() - 7);
                const prevWeekXP = pointHistory.filter(e => e.timestamp && new Date(e.timestamp) >= prevWeekStart && new Date(e.timestamp) < weekAgo);
                const weekTotalXP = weekXP.reduce((s, e) => s + (e.points || 0), 0);
                const prevTotalXP = prevWeekXP.reduce((s, e) => s + (e.points || 0), 0);
                const xpDelta = weekTotalXP - prevTotalXP;
                const weekAccuracy = weekWords.length > 0 ? Math.round(weekWords.filter(w => w.correct).length / weekWords.length * 100) : null;
                if (weekXP.length === 0 && weekWords.length === 0) return null;
                return (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-5">
                        <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Calendar size={14} /> This Week's Progress
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            <div className="bg-white rounded-xl p-3 text-center border border-emerald-100">
                                <div className="text-lg font-black text-emerald-700">{weekTotalXP}</div>
                                <div className="text-[11px] font-bold text-emerald-400 uppercase">{t('learner.xp_this_week')}</div>
                                {xpDelta !== 0 && (
                                    <div className={`text-[11px] font-bold mt-0.5 ${xpDelta > 0 ? 'text-green-500' : 'text-red-400'}`}>
                                        {xpDelta > 0 ? '↑' : '↓'} {Math.abs(xpDelta)} vs last week
                                    </div>
                                )}
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center border border-emerald-100">
                                <div className="text-lg font-black text-emerald-700">{weekXP.length}</div>
                                <div className="text-[11px] font-bold text-emerald-400 uppercase">Activities</div>
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center border border-emerald-100">
                                <div className="text-lg font-black text-emerald-700">{weekWords.filter(w => w.correct).length}/{weekWords.length}</div>
                                <div className="text-[11px] font-bold text-emerald-400 uppercase">{t('learner.words_this_week')}</div>
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center border border-emerald-100">
                                <div className="text-lg font-black text-emerald-700">{weekAccuracy !== null ? weekAccuracy + '%' : '—'}</div>
                                <div className="text-[11px] font-bold text-emerald-400 uppercase">Accuracy</div>
                            </div>
                        </div>
                        {weekGames.length > 0 && (
                            <div className="text-xs text-emerald-600 font-medium bg-white/60 rounded-lg px-3 py-2">
                                🎮 {weekGames.length} game{weekGames.length !== 1 ? 's' : ''} played this week
                            </div>
                        )}
                    </div>
                );
            })()}
            {studentProgressLog.length >= 2 && (
                <div className="bg-white rounded-2xl border border-slate-400 shadow-sm p-5 hover:shadow-md transition-shadow" data-help-key="learner_progress_growth_chart">
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <TrendingUp size={14} /> Growth Over Time
                    </h3>
                    <LongitudinalProgressChart logs={studentProgressLog} />
                </div>
            )}
            {showDiagnostics && (
                <div className="bg-slate-50 rounded-2xl border border-slate-400 p-5 space-y-4 animate-in slide-in-from-top-2 duration-300" data-help-key="learner_progress_diagnostics_panel">
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <BarChart3 size={14} /> Detailed Metrics
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white rounded-xl p-3 border border-slate-400 text-center">
                            <div className="text-lg font-black text-slate-700">{stats.wsCorrect}/{stats.wsTotal}</div>
                            <div className="text-[11px] font-bold text-slate-600 uppercase">{t('learner.words_correct')}</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-slate-400 text-center">
                            <div className="text-lg font-black text-slate-700">{Object.keys(phonemeMastery).length}</div>
                            <div className="text-[11px] font-bold text-slate-600 uppercase">{t('learner.phonemes_touched')}</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-slate-400 text-center">
                            <div className="text-lg font-black text-slate-700">{stats.sessionCount}</div>
                            <div className="text-[11px] font-bold text-slate-600 uppercase">Sessions</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-slate-400 text-center">
                            <div className="text-lg font-black text-slate-700">{stats.labelChallenges}</div>
                            <div className="text-[11px] font-bold text-slate-600 uppercase">{t('learner.label_challenges')}</div>
                        </div>
                    </div>
                    {pointHistory.length > 0 && (
                        <div>
                            <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">{t('learner.recent_activity')}</h4>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {pointHistory.slice(0, 10).map((entry, i) => (
                                    <div key={entry.id || i} className="flex justify-between items-center text-xs px-2 py-1 rounded hover:bg-white">
                                        <span className="text-slate-600 font-medium truncate max-w-[200px]">{entry.activity}</span>
                                        <span className="font-bold text-green-600">+{entry.points} XP</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                    onClick={() => {
                        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                        const metricBar = (label, value, max, unit, icon) => {
                            const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
                            const barColor = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#e11d48';
                            return `<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px"><span style="font-size:13px;font-weight:600;color:#334155">${icon} ${label}</span><span style="font-size:14px;font-weight:800;color:${barColor}">${value}${unit}</span></div><div style="background:#f1f5f9;border-radius:6px;height:10px;overflow:hidden"><div style="background:${barColor};height:100%;border-radius:6px;width:${pct}%"></div></div></div>`;
                        };
                        const masteredCount = Object.entries(phonemeMastery).filter(([_,v]) => v.accuracy >= 80).length;
                        const masteredList = Object.entries(phonemeMastery).filter(([_,v]) => v.accuracy >= 80).map(([p]) => '/' + p + '/').join(', ');
                        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">` +
                          `<title>${t('learner.progress_report')}</title>` +
                          `<style>` +
                          `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');` +
                          `*{box-sizing:border-box;margin:0;padding:0}` +
                          `body{font-family:'Inter',-apple-system,sans-serif;color:#1e293b;background:#f8fafc;padding:32px;line-height:1.5}` +
                          `.report{max-width:700px;margin:0 auto;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);overflow:hidden}` +
                          `.header{padding:28px 32px;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);color:white}` +
                          `.header h1{font-size:22px;font-weight:800;margin-bottom:4px}` +
                          `.header p{font-size:13px;opacity:.85}` +
                          `.content{padding:28px 32px}` +
                          `.section-title{font-size:15px;font-weight:800;color:#334155;margin:20px 0 12px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}` +
                          `.badge-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}` +
                          `.badge{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#fef9c3;border:1px solid #fcd34d;border-radius:10px;font-size:12px;font-weight:700;color:#92400e}` +
                          `.footer{padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8}` +
                          `.print-btn{display:block;margin:16px auto;padding:10px 28px;background:#4f46e5;color:white;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}` +
                          `.print-btn:hover{background:#4338ca}` +
                          `@media print{body{padding:0;background:white}.report{box-shadow:none;border-radius:0}.print-btn{display:none!important}.header{-webkit-print-color-adjust:exact;print-color-adjust:exact}}` +
                          `</style></head>` +
                          `<body><div class="report">` +
                          `<div class="header">` +
                          `<h1>🌟 ${isParentMode ? "Your Child's" : 'My'} Learning Progress Report</h1>` +
                          `<p>${isParentMode ? 'Family Progress Overview' : 'Personal Progress Overview'} &bull; ${date}</p>` +
                          `</div>` +
                          `<div class="content">` +
                          `<div style="display:flex;align-items:center;gap:16px;padding:16px;background:linear-gradient(135deg,#fef3c7,#fef9c3);border:2px solid #fcd34d;border-radius:12px;margin-bottom:20px">` +
                          `<div style="width:56px;height:56px;background:#eab308;border-radius:50%;display:flex;align-items:center;justify-content:center;border:4px solid #1e1b4b;font-size:24px;font-weight:900;color:#1e1b4b">Lv${globalLevel}</div>` +
                          `<div>` +
                          `<div style="font-size:20px;font-weight:800;color:#1e1b4b">${globalPoints.toLocaleString()} Total XP</div>` +
                          `<div style="font-size:12px;color:#92400e;font-weight:600">Level ${globalLevel} Learner &bull; ${Math.round(globalProgress)}% to next level</div>` +
                          `</div></div>` +
                          `<div class="section-title">📊 Performance Summary</div>` +
                          `${metricBar('Word Sounds Accuracy', stats.wsAccuracy, 100, '%', '🔊')}` +
                          `${metricBar('Quizzes Completed', stats.quizCount, 10, '', '📝')}` +
                          `${metricBar('Words Practiced', stats.wsTotal, 50, '', '🔤')}` +
                          `${metricBar('Games Played', stats.gamesPlayed, 10, '', '🎮')}` +
                          `${metricBar('Fluency Tests', stats.fluencyTests, 5, '', '⏱️')}` +
                          `${metricBar('Total Activities', stats.totalActivities, 20, '', '📊')}` +
                          `<div class="section-title">🎯 Skills Mastered</div>` +
                          `<div style="font-size:13px;color:#475569;margin-bottom:8px"><strong>${masteredCount}</strong> phoneme sounds mastered${masteredCount > 0 ? ':' : ''}</div>` +
                          `${masteredCount > 0 ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">' + Object.entries(phonemeMastery).filter(([_,v]) => v.accuracy >= 80).map(([p]) => '<span style="padding:4px 12px;background:#dcfce7;color:#16a34a;border:1px solid #86efac;border-radius:20px;font-size:12px;font-weight:700">/' + p + '/</span>').join('') + '</div>' : '<p style="font-size:13px;color:#94a3b8;font-style:italic">Keep practicing to master sounds!</p>'}` +
                          `<div class="section-title">🏅 Achievements Earned</div>` +
                          `<div class="badge-row">` +
                          `${globalPoints >= 10 ? '<div class="badge">👣 First Steps</div>' : ''}` +
                          `${stats.quizCount >= 3 ? '<div class="badge">🧠 Quiz Whiz</div>' : ''}` +
                          `${stats.wsTotal >= 20 ? '<div class="badge">🔍 Word Explorer</div>' : ''}` +
                          `${stats.gamesPlayed >= 5 ? '<div class="badge">🏆 Game Champion</div>' : ''}` +
                          `${globalLevel >= 2 ? '<div class="badge">⭐ Level Up!</div>' : ''}` +
                          `${globalLevel >= 5 ? '<div class="badge">🌟 Super Scholar</div>' : ''}` +
                          `${stats.masteredPhonemes.length >= 5 ? '<div class="badge">🎵 Sound Master</div>' : ''}` +
                          `${stats.sessionCount >= 3 ? '<div class="badge">📅 Consistent</div>' : ''}` +
                          `</div></div>` +
                          `<div class="footer">Generated ${date} &bull; Created with AlloFlow &bull; Learning Progress Report</div>` +
                          `</div>` +
                          `<button class="print-btn" onclick="window.print()">🖨️ Print This Report</button>` +
                          `</body></html>`;
                        const w = window.open('', '_blank');
                        if (w) { w.document.write(html); w.document.close(); }
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] flex items-center gap-2 text-sm"
                    data-help-key="learner_progress_print_report_btn"
                >
                    <Printer size={16} /> Print Progress Report
                </button>
                {isParentMode && onShareWithTeacher && (
                    <button
                        onClick={onShareWithTeacher}
                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] flex items-center gap-2 text-sm"
                        data-help-key="learner_progress_share_teacher_btn"
                    >
                        <Share2 size={16} /> Share Progress with Teacher
                    </button>
                )}
            </div>
        </div>
    );
});
// @section TEACHER_DASHBOARD — Main teacher dashboard
const TeacherDashboard = React.memo(({ onClose, dashboardData = [], setDashboardData, addToast, setSelectedStudentId, setDashboardView, dashboardView, selectedStudentId, generateResourceHTML, onOpenBehaviorLens }) => {
  const { t } = useContext(LanguageContext);
  const modalRef = useRef(null);
  useFocusTrap(modalRef, true);
  const [gradedIds, setGradedIds] = useState(new Set());
  const [studentFilter, setStudentFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('students');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  // WCAG 2.1.2 + 2.4.3: Escape closes the Clear Confirm modal + restores focus.
  // Proper top-of-component useEffect — previously in module.js only, wedged inside
  // an st.tools.map() callback (React Hook Rules violation). Fixed April 2026.
  useEffect(function() {
    function _alloEscHandler(e) {
      if (e.key === 'Escape' && showClearConfirm) {
        setShowClearConfirm(false);
        if (typeof alloRestoreFocus === 'function') alloRestoreFocus();
      }
    }
    document.addEventListener('keydown', _alloEscHandler);
    return function() { document.removeEventListener('keydown', _alloEscHandler); };
  }, [showClearConfirm]);
  const toggleGraded = (id) => {
      setGradedIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) {
              next.delete(id);
          } else {
              next.add(id);
              if (addToast) addToast(t('dashboard.toasts.marked_graded'), "success");
          }
          return next;
      });
  };
  const calculateScore = (history) => {
      if (!history || !Array.isArray(history)) return t('dashboard.status.zero_activities');
      let quizCount = 0;
      history.forEach(item => {
          if (item.type === 'quiz') {
              quizCount++;
          }
      });
      if (quizCount === 0) return t('dashboard.status.no_quizzes');
      return quizCount === 1
        ? t('dashboard.status.quizzes_completed', { count: quizCount })
        : t('dashboard.status.quizzes_completed_plural', { count: quizCount });
  };
  const getStudentLevel = (history) => {
      if (!history || !Array.isArray(history)) return "N/A";
      const adventureItem = history.slice().reverse().find(item => item.type === 'adventure');
      if (adventureItem && adventureItem.data && adventureItem.data.level) {
          return adventureItem.data.level;
      }
      return "N/A";
  };
  const getClassMetrics = () => {
      const count = dashboardData.length;
      let totalLevels = 0;
      let studentsWithLevel = 0;
      dashboardData.forEach(s => {
          const lvl = getStudentLevel(s.history);
          if (lvl !== "N/A") {
              totalLevels += Number(lvl);
              studentsWithLevel++;
          }
      });
      const avgLevel = studentsWithLevel > 0 ? (totalLevels / studentsWithLevel).toFixed(1) : "-";
      return { count, avgLevel };
  };
  const { count: studentCount, avgLevel: classAvgLevel } = getClassMetrics();
  const analytics = useMemo(() => calculateAnalyticsMetrics(dashboardData), [dashboardData]);
  const misconceptionChartData = useMemo(() => analytics.misconceptions.map((m, idx) => ({
      label: `Q${idx + 1}`,
      value: m.count
  })), [analytics.misconceptions]);
  const selectedStudent = useMemo(() => dashboardData.find(s => s.id === selectedStudentId), [dashboardData, selectedStudentId]);
  const getStudentAvgScore = (student) => {
      if (!student) return 0;
      const history = student.history || [];
      const responses = student.responses || {};
      const quizzes = history.filter(h => h.type === 'quiz');
      if (quizzes.length === 0) return 0;
      let totalPct = 0;
      quizzes.forEach(quiz => {
          const questions = quiz.data?.questions || [];
          if (!questions.length) return;
          let correct = 0;
          questions.forEach((q, i) => {
              const resp = responses[quiz.id]?.[i];
              if (resp !== undefined) {
                   let val = resp;
                   if (!isNaN(parseInt(resp)) && q.options && q.options[resp]) val = q.options[resp];
                   if (String(val).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) correct++;
              }
          });
          totalPct += (correct / questions.length) * 100;
      });
      return Math.round(totalPct / quizzes.length);
  };
  const studentAvg = selectedStudent ? getStudentAvgScore(selectedStudent) : 0;
  const handleClearAll = () => {
      setShowClearConfirm(true);
  };
  const confirmClearAll = () => {
      setDashboardData([]);
      setGradedIds(new Set());
      setShowClearConfirm(false);
      if (addToast) addToast(t('dashboard.toasts.dashboard_cleared'), "info");
  };
  const handleExportResearchPDF = async () => {
    addToast('Generating research report...', 'info');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    // Compute TAM data
    const allSurveys = dashboardData.flatMap(s => s.surveyResponses || []);
    const tamConstructs = { usefulness: [], ease: [], intention: [] };
    allSurveys.forEach(r => {
        if (r.construct === 'usefulness' && r.score !== undefined) tamConstructs.usefulness.push(r.score);
        if (r.construct === 'ease' && r.score !== undefined) tamConstructs.ease.push(r.score);
        if (r.construct === 'intention' && r.score !== undefined) tamConstructs.intention.push(r.score);
    });
    const calcStats = arr => {
        if (!arr.length) return { n: 0, mean: 'N/A', sd: 'N/A' };
        const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
        const sd = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, arr.length - 1));
        return { n: arr.length, mean: mean.toFixed(2), sd: sd.toFixed(2) };
    };
    const useStats = calcStats(tamConstructs.usefulness);
    const easeStats = calcStats(tamConstructs.ease);
    const intStats = calcStats(tamConstructs.intention);
    // Compute probe data
    const allProbes = dashboardData.flatMap(s => s.probeHistory ? Object.values(s.probeHistory).flat() : []);
    const wcpmProbes = allProbes.filter(p => p.wcpm !== undefined);
    const dcpmProbes = allProbes.filter(p => p.dcpm !== undefined);
    const accProbes = allProbes.filter(p => p.accuracy !== undefined);
    const wcpmStats = calcStats(wcpmProbes.map(p => p.wcpm));
    const dcpmStats = calcStats(dcpmProbes.map(p => p.dcpm));
    const accStats = calcStats(accProbes.map(p => p.accuracy));
    // Session data
    const totalSessions = dashboardData.reduce((s, st) => s + (st.sessionCounter || 0), 0);
    const totalFidelity = dashboardData.reduce((s, st) => s + (st.fidelityLog ? st.fidelityLog.length : 0), 0);
    const reportHtml = `
        <div style="font-family: 'Times New Roman', serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto;">
            <h1 style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 5px;">${t('teacher.research.report_title') || 'AlloFlow UDL Platform — Research Data Report'}</h1>
            <p style="text-align: center; font-size: 12px; color: #666; margin-bottom: 30px;">Generated: ${date} | N = ${dashboardData.length} students</p>
            <hr style="border: 1px solid #333; margin-bottom: 25px;">
            <h2 style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">${t('teacher.research.table1_heading') || 'Table 1. TAM Survey Construct Descriptives'}</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 25px;">
                <thead>
                    <tr style="border-bottom: 2px solid #333; border-top: 2px solid #333;">
                        <th style="text-align: left; padding: 6px 8px;">${t('research.construct')}</th>
                        <th style="text-align: center; padding: 6px 8px;">n</th>
                        <th style="text-align: center; padding: 6px 8px;">M</th>
                        <th style="text-align: center; padding: 6px 8px;">SD</th>
                        <th style="text-align: center; padding: 6px 8px;">${t('research.scale')}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 6px 8px;">${t('research.perceived_usefulness')}</td>
                        <td style="text-align: center; padding: 6px 8px;">${useStats.n}</td>
                        <td style="text-align: center; padding: 6px 8px;">${useStats.mean}</td>
                        <td style="text-align: center; padding: 6px 8px;">${useStats.sd}</td>
                        <td style="text-align: center; padding: 6px 8px;">1–5</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 6px 8px;">${t('research.perceived_ease')}</td>
                        <td style="text-align: center; padding: 6px 8px;">${easeStats.n}</td>
                        <td style="text-align: center; padding: 6px 8px;">${easeStats.mean}</td>
                        <td style="text-align: center; padding: 6px 8px;">${easeStats.sd}</td>
                        <td style="text-align: center; padding: 6px 8px;">1–5</td>
                    </tr>
                    <tr style="border-bottom: 2px solid #333;">
                        <td style="padding: 6px 8px;">${t('research.behavioral_intention')}</td>
                        <td style="text-align: center; padding: 6px 8px;">${intStats.n}</td>
                        <td style="text-align: center; padding: 6px 8px;">${intStats.mean}</td>
                        <td style="text-align: center; padding: 6px 8px;">${intStats.sd}</td>
                        <td style="text-align: center; padding: 6px 8px;">1–5</td>
                    </tr>
                </tbody>
            </table>
            <h2 style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">${t('teacher.research.table2_heading') || 'Table 2. Oral Reading Fluency Probe Descriptives'}</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 25px;">
                <thead>
                    <tr style="border-bottom: 2px solid #333; border-top: 2px solid #333;">
                        <th style="text-align: left; padding: 6px 8px;">${t('research.measure')}</th>
                        <th style="text-align: center; padding: 6px 8px;">n</th>
                        <th style="text-align: center; padding: 6px 8px;">M</th>
                        <th style="text-align: center; padding: 6px 8px;">SD</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 6px 8px;">${t('teacher.research.measure_wcpm') || 'Words Correct Per Minute (WCPM)'}</td>
                        <td style="text-align: center; padding: 6px 8px;">${wcpmStats.n}</td>
                        <td style="text-align: center; padding: 6px 8px;">${wcpmStats.mean}</td>
                        <td style="text-align: center; padding: 6px 8px;">${wcpmStats.sd}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 6px 8px;">${t('teacher.research.measure_dcpm') || 'Digits Correct Per Minute (DCPM)'}</td>
                        <td style="text-align: center; padding: 6px 8px;">${dcpmStats.n}</td>
                        <td style="text-align: center; padding: 6px 8px;">${dcpmStats.mean}</td>
                        <td style="text-align: center; padding: 6px 8px;">${dcpmStats.sd}</td>
                    </tr>
                    <tr style="border-bottom: 2px solid #333;">
                        <td style="padding: 6px 8px;">${t('teacher.research.measure_accuracy_pct') || 'Accuracy (%)'}</td>
                        <td style="text-align: center; padding: 6px 8px;">${accStats.n}</td>
                        <td style="text-align: center; padding: 6px 8px;">${accStats.mean}</td>
                        <td style="text-align: center; padding: 6px 8px;">${accStats.sd}</td>
                    </tr>
                </tbody>
            </table>
            <h2 style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">${t('teacher.research.table3_heading') || 'Table 3. Implementation Fidelity Summary'}</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 25px;">
                <thead>
                    <tr style="border-bottom: 2px solid #333; border-top: 2px solid #333;">
                        <th style="text-align: left; padding: 6px 8px;">${t('research.metric')}</th>
                        <th style="text-align: center; padding: 6px 8px;">${t('research.value')}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 6px 8px;">${t('class_analytics.total_students')}</td><td style="text-align: center; padding: 6px 8px;">${dashboardData.length}</td></tr>
                    <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 6px 8px;">${t('class_analytics.total_sessions')}</td><td style="text-align: center; padding: 6px 8px;">${totalSessions}</td></tr>
                    <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 6px 8px;">${t('research.avg_sessions')}</td><td style="text-align: center; padding: 6px 8px;">${dashboardData.length > 0 ? (totalSessions / dashboardData.length).toFixed(1) : 0}</td></tr>
                    <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 6px 8px;">${t('research.fidelity_records')}</td><td style="text-align: center; padding: 6px 8px;">${totalFidelity}</td></tr>
                    <tr style="border-bottom: 2px solid #333;"><td style="padding: 6px 8px;">${t('research.total_probes')}</td><td style="text-align: center; padding: 6px 8px;">${allProbes.length}</td></tr>
                </tbody>
            </table>
            <div style="page-break-before: always;"></div>
            <h2 style="font-size: 16px; font-weight: bold; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 5px;">${t('teacher.research.appendix_a_heading') || 'Appendix A: Individual Student Data'}</h2>
            ${dashboardData.filter(s => {
                                          if (studentFilter === 'probes') return s.probeHistory && Object.keys(s.probeHistory).length > 0;
                                          if (studentFilter === 'surveys') return s.surveyResponses && s.surveyResponses.length > 0;
                                          if (studentFilter === 'graded') return gradedIds.has(s.id);
                                          if (studentFilter === 'ungraded') return !gradedIds.has(s.id);
                                          return true;
                                      }).map((student, idx) => {
                const sProbes = student.probeHistory ? Object.values(student.probeHistory).flat() : [];
                const sSurveys = student.surveyResponses || [];
                const sQuizzes = (student.history || []).filter(h => h.type === "quiz");
                const sExplore = (student.history || []).filter(h => h.type === "explore-challenge");
                const sSessions = student.sessionCounter || 0;
                const sProbeWcpm = sProbes.filter(p => p.wcpm !== undefined);
                const avgWcpm = sProbeWcpm.length > 0 ? (sProbeWcpm.reduce((s,p) => s + p.wcpm, 0) / sProbeWcpm.length).toFixed(1) : "N/A";
                return `
                <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 4px; ${idx > 0 ? "page-break-before: auto;" : ""}">
                    <h3 style="font-size: 13px; font-weight: bold; margin-bottom: 8px; color: #333;">Student ${idx + 1}: ${student.studentNickname}</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 10px;">
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 4px 6px; color: #666; width: 40%;">${t('research.sessions_completed')}</td>
                            <td style="padding: 4px 6px; font-weight: bold;">${sSessions}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 4px 6px; color: #666;">${t('research.quiz_responses')}</td>
                            <td style="padding: 4px 6px; font-weight: bold;">${sQuizzes.length}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 4px 6px; color: #666;">${t('research.probes_administered')}</td>
                            <td style="padding: 4px 6px; font-weight: bold;">${sProbes.length} (Avg WCPM: ${avgWcpm})</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 4px 6px; color: #666;">${t('research.survey_responses')}</td>
                            <td style="padding: 4px 6px; font-weight: bold;">${sSurveys.length}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 4px 6px; color: #666;">${t('research.explore_challenges')}</td>
                            <td style="padding: 4px 6px; font-weight: bold;">${sExplore.length}</td>
                        </tr>
                    </table>
                    ${sProbeWcpm.length > 0 ? `
                    <p style="font-size: 10px; font-weight: bold; color: #555; margin-bottom: 4px;">${t('teacher.research.probe_history_wcpm_label') || 'Probe History (WCPM):'}</p>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">
                        ${sProbeWcpm.map(p => `<span style="font-size: 9px; padding: 2px 6px; border-radius: 3px; background: ${p.wcpm >= 100 ? "#d1fae5" : p.wcpm >= 60 ? "#fef3c7" : "#fee2e2"}; color: ${p.wcpm >= 100 ? "#065f46" : p.wcpm >= 60 ? "#92400e" : "#991b1b"}; font-weight: bold;">${p.wcpm}${p.date ? " (" + new Date(p.date).toLocaleDateString("en", {month: "short", day: "numeric"}) + ")" : ""}</span>`).join("")}
                    </div>
                    ` : ""}
                    ${sQuizzes.length > 0 ? `
                    <p style="font-size: 10px; font-weight: bold; color: #555; margin-bottom: 4px;">${t('teacher.research.quiz_scores_label') || 'Quiz Scores:'}</p>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">
                        ${sQuizzes.map(q => `<span style="font-size: 9px; padding: 2px 6px; border-radius: 3px; background: #ede9fe; color: #5b21b6; font-weight: bold;">${q.score !== undefined ? q.score : "—"}${q.label ? " " + q.label : ""}</span>`).join("")}
                    </div>
                    ` : ""}
                    ${sSurveys.length > 0 ? `
                    <p style="font-size: 10px; font-weight: bold; color: #555; margin-bottom: 4px;">${t('teacher.research.survey_responses_label') || 'Survey Responses:'}</p>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        ${sSurveys.map(s => `<span style="font-size: 9px; padding: 2px 6px; border-radius: 3px; background: #fce7f3; color: #9d174d; font-weight: bold;">${s.construct || "—"}: ${s.score !== undefined ? s.score + "/5" : "—"}</span>`).join("")}
                    </div>
                    ` : ""}
                </div>
                `;
            }).join("")}
                        <div style="margin-top: 40px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
                <p><em>Note.</em> TAM = Technology Acceptance Model (Davis, 1989). WCPM = Words Correct Per Minute. DCPM = Digits Correct Per Minute.</p>
                <p>${t('teacher.research.export_footer') || 'Generated by AlloFlow UDL Platform — Research Export Module'}</p>
            </div>
        </div>
    `;
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.innerHTML = reportHtml;
    document.body.appendChild(container);
    try {
        await doc.html(container, {
            callback: (doc) => {
                doc.save('alloflow_research_report_' + new Date().toISOString().split('T')[0] + '.pdf');
                addToast('Research report saved!', 'success');
            },
            x: 10, y: 10, width: 190,
            windowWidth: 800,
        });
    } catch (err) { addToast('PDF error: ' + err.message, 'error'); }
    document.body.removeChild(container);
  };
  const handleExportAnalyticsPDF = async () => {
      addToast(t('dashboard.toasts.generating_report'), "info");
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const date = new Date().toLocaleDateString();
      const reportHtml = `
        <div style="font-family: Helvetica, sans-serif; padding: 40px; color: #333;">
            <h1 style="color: #4f46e5; border-bottom: 2px solid #ddd; padding-bottom: 10px;">${t('dashboard.report.title')}</h1>
            <p style="color: #666; margin-bottom: 30px;">${t('dashboard.insights.generated_date')} ${date}</p>
            <div style="display: flex; gap: 20px; margin-bottom: 40px;">
                <div style="flex: 1; padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
                    <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #64748b;">${t('dashboard.report.avg_score')}</div>
                    <div style="font-size: 32px; font-weight: bold; color: #4f46e5;">${analytics.averageScore}%</div>
                </div>
                <div style="flex: 1; padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
                    <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #64748b;">${t('dashboard.report.participation')}</div>
                    <div style="font-size: 32px; font-weight: bold; color: #0ea5e9;">${Math.round(analytics.quizCompletionRate)}%</div>
                </div>
                <div style="flex: 1; padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
                    <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #64748b;">${t('dashboard.report.avg_level')}</div>
                    <div style="font-size: 32px; font-weight: bold; color: #9333ea;">${analytics.avgAdventureLevel.toFixed(1)}</div>
                </div>
            </div>
            <h2 style="color: #1e293b; margin-bottom: 20px;">${t('dashboard.report.misconceptions')}</h2>
            ${analytics.misconceptions.length > 0 ? `
                <ul style="list-style: none; padding: 0;">
                    ${analytics.misconceptions.map((m, i) => `
                        <li style="margin-bottom: 15px; padding: 15px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
                            <div style="font-weight: bold; color: #991b1b; margin-bottom: 5px;">${t('dashboard.report.question_focus')}:</div>
                            <div style="font-style: italic; color: #333; margin-bottom: 10px;">"${m.question}"</div>
                            <div style="font-size: 12px; font-weight: bold; color: #ef4444;">${t('dashboard.report.students_missed', { count: m.count })}</div>
                        </li>
                    `).join('')}
                </ul>
            ` : `<p style="font-style: italic; color: #666;">${t('dashboard.insights.no_misconceptions')}</p>`}
            <h2 style="color: #1e293b; margin-top: 40px; margin-bottom: 20px;">📊 Research & Assessment Data</h2>
            <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                <div style="flex: 1; padding: 20px; background: #fffbeb; border: 1px solid #fed7aa; border-radius: 8px; text-align: center;">
                    <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #92400e;">${t('class_analytics.total_probes')}</div>
                    <div style="font-size: 32px; font-weight: bold; color: #d97706;">${dashboardData.reduce((sum, s) => sum + (s.probeHistory ? Object.values(s.probeHistory).flat().length : 0), 0)}</div>
                </div>
                <div style="flex: 1; padding: 20px; background: #f5f3ff; border: 1px solid #e9d5ff; border-radius: 8px; text-align: center;">
                    <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #6b21a8;">${t('research.survey_responses')}</div>
                    <div style="font-size: 32px; font-weight: bold; color: #9333ea;">${dashboardData.reduce((sum, s) => sum + (s.surveyResponses ? s.surveyResponses.length : 0), 0)}</div>
                </div>
                <div style="flex: 1; padding: 20px; background: #ecfdf5; border: 1px solid #bbf7d0; border-radius: 8px; text-align: center;">
                    <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #065f46;">${t('class_analytics.total_sessions')}</div>
                    <div style="font-size: 32px; font-weight: bold; color: #059669;">${dashboardData.reduce((sum, s) => sum + (s.sessionCounter || 0), 0)}</div>
                </div>
            </div>
            <div style="margin-top: 50px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                ${t('dashboard.report.footer')}
            </div>
        </div>
      `;
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '595px';
      container.innerHTML = reportHtml;
      document.body.appendChild(container);
      try {
          await doc.html(container, {
              callback: function(pdf) {
                  pdf.save('Class_Analytics_Report.pdf');
                  document.body.removeChild(container);
                  addToast(t('dashboard.toasts.report_downloaded'), "success");
              },
              x: 10,
              y: 10,
              width: 190,
              windowWidth: 650
          });
      } catch (e) {
          warnLog("PDF Export Error", e);
          addToast(t('toasts.export_failed'), "error");
          if (document.body.contains(container)) document.body.removeChild(container);
      }
  };
  const handleBatchUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const promises = files.map(file => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                if (parsed && parsed.mode === 'student' && Array.isArray(parsed.history)) {
                    const validSubmission = {
                        id: generateUUID(),
                        ...parsed,
                        studentNickname: parsed.studentNickname || parsed.settings?.nickname || "Anonymous",
                        timestamp: parsed.timestamp || new Date().toISOString(),
                        sourceFilename: file.name
                    };
                    resolve(validSubmission);
                } else {
                    warnLog("Skipping invalid file (not a student save):", file.name);
                    resolve(null);
                }
            } catch (err) {
                warnLog("Failed to parse file:", file.name);
                resolve(null);
            }
        };
        reader.onerror = () => {
            warnLog("Error reading file:", file.name);
            resolve(null);
        };
        reader.readAsText(file);
    }));
    const results = await Promise.all(promises);
    const validSubmissions = results.filter(item => item !== null);
    if (validSubmissions.length > 0 && setDashboardData) {
        setDashboardData(prev => [...prev, ...validSubmissions]);
        if (addToast) addToast(t('dashboard.toasts.submissions_loaded', { count: validSubmissions.length }), "success");
    } else if (files.length > 0) {
        if (addToast) addToast(t('dashboard.toasts.no_files'), "error");
    }
    e.target.value = "";
  };
  const handleExportCSV = () => {
    if (!dashboardData || dashboardData.length === 0) return;
    const headers = [
        t('dashboard.csv.header_name'),
        t('dashboard.csv.header_date'),
        t('dashboard.csv.header_level'),
        t('dashboard.csv.header_quiz_avg'),
        t('dashboard.csv.header_total_xp')
    , 'Probes', 'Avg WCPM', 'Surveys', 'Sessions'];
    const rows = dashboardData.map(student => {
        const name = (student.studentNickname || "Anonymous").replace(/"/g, '""');
        const date = new Date(student.timestamp).toLocaleDateString();
        const adventureItem = student.history.slice().reverse().find(item => item.type === 'adventure');
        const level = (adventureItem && adventureItem.data && adventureItem.data.level) ? adventureItem.data.level : "N/A";
        let totalQuizScore = 0;
        let quizCount = 0;
        const quizzes = student.history.filter(h => h.type === 'quiz');
        quizzes.forEach(quiz => {
            const questions = quiz.data?.questions || [];
            if (questions.length === 0) return;
            let correct = 0;
            const studentResps = student.responses && student.responses[quiz.id] ? student.responses[quiz.id] : {};
            questions.forEach((q, i) => {
                const resp = studentResps[i];
                if (resp !== undefined && resp !== null) {
                    let val = resp;
                    if (!isNaN(parseInt(resp)) && q.options && q.options[resp]) val = q.options[resp];
                    if (String(val).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) correct++;
                }
            });
            const score = (correct / questions.length) * 100;
            totalQuizScore += score;
            quizCount++;
        });
        const quizAvg = quizCount > 0 ? Math.round(totalQuizScore / quizCount) + "%" : "N/A";
        const xp = student.stats?.totalXP || "N/A";
        const probeCount = s.probeHistory ? Object.values(s.probeHistory).flat().length : 0;
        const wcpmProbes = s.probeHistory ? Object.values(s.probeHistory).flat().filter(x => x.wcpm !== undefined) : [];
        const avgWcpm = wcpmProbes.length > 0 ? (wcpmProbes.reduce((sum,x) => sum + x.wcpm, 0) / wcpmProbes.length).toFixed(0) : 'N/A';
        const surveyCount = s.surveyResponses ? s.surveyResponses.length : 0;
        const sessionCount = s.sessionCounter || 0;
        return `"${name}","${date}","${level}","${quizAvg}","${xp}","${probeCount}","${avgWcpm}","${surveyCount}","${sessionCount}"`;
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${t('dashboard.csv.filename_prefix')}${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const quizHistory = useMemo(() => selectedStudent?.history?.filter(h => h.type === 'quiz') || [], [selectedStudent?.history]);
  return (
    <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[200] bg-slate-100 flex flex-col animate-in fade-in duration-300"
    >
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm shrink-0 z-10 flex flex-col">
          <div className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                    <Layout size={24} />
                </div>
                <h2 className="text-xl font-black text-slate-800">{t('dashboard.grading_dashboard')}</h2>
            </div>
            <div className="flex items-center gap-2">
                {dashboardData.length > 0 && (<>
                    <button
                        onClick={handleExportCSV} data-help-key="dashboard_export_csv_btn"
                        className="text-xs font-bold text-green-600 hover:text-green-800 hover:bg-green-50 px-3 py-1.5 rounded-full transition-colors mr-2 border border-green-200 shadow-sm flex items-center gap-1"
                        title={t('dashboard.export_csv_tooltip')}
                        aria-label={t('dashboard.export_csv_tooltip')}
                    >
                        <FileDown size={14} /> {t('dashboard.export_csv')}
                    
                    </button>
                    <button
                        onClick={handleExportResearchPDF} data-help-key="dashboard_export_research_btn"
                        className="text-xs font-bold text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-3 py-1.5 rounded-full transition-colors mr-2 border border-purple-200 shadow-sm flex items-center gap-1"
                        title={t('research.export_apa_title')}
                        aria-label={t('teacher.research.export_btn_aria') || 'Export Research Report'}
                    >
                        <FileDown size={14} /> 📊 Research PDF
                    </button>
                </>)}
                {dashboardData.length > 0 && (
                    <button
                        onClick={handleClearAll} data-help-key="dashboard_clear_all_btn"
                        className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-full transition-colors mr-2 border border-transparent hover:border-red-100"
                        title={t('dashboard.reset_tooltip')}
                        aria-label={t('dashboard.reset_tooltip')}
                    >
                        {t('dashboard.clear_all')}
                    </button>
                )}
                <button
                onClick={onClose}
                className="p-2 rounded-full text-slate-600 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                autoFocus
                aria-label={t('common.close_dashboard')}
                >
                <X size={24} />
                </button>
            </div>
          </div>
          {dashboardData.length > 0 && dashboardView === 'list' && (
              <div className="flex px-6 gap-6">
                  <button
                      onClick={() => setActiveTab('students')}
                      className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'students' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-600 hover:text-slate-700'}`}
                  >
                      {t('dashboard.tab_students')} ({dashboardData.length})
                  </button>
                  <button
                      onClick={() => setActiveTab('insights')}
                      className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'insights' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-600 hover:text-slate-700'}`}
                  >
                      {t('dashboard.tab_insights')}
                  </button>
                  <button
                      onClick={() => setActiveTab('behavior')}
                      className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'behavior' ? 'border-orange-600 text-orange-700' : 'border-transparent text-slate-600 hover:text-slate-700'}`}
                  >
                      🔍 {t('behavior_lens.hub.title') || 'Behavior'}
                  </button>
                  <button
                      onClick={() => setActiveTab('stems')}
                      className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'stems' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-600 hover:text-slate-700'}`}
                  >
                      🔬 STEM Stations
                  </button>
              </div>
          )}
      </div>
      <div className="flex-grow p-6 overflow-y-auto bg-slate-100">
         {dashboardView === 'detail' && selectedStudent ? (
             <div className="max-w-5xl mx-auto h-full flex flex-col animate-in slide-in-from-right-8 duration-300">
                 <div className="flex items-center justify-between gap-6 mb-6 border-b border-slate-200 pb-6 sticky top-0 bg-slate-50 z-10 pt-2">
                     <div className="flex items-center gap-6">
                         <button
                             aria-label={t('common.check')}
                            onClick={() => setDashboardView('list')}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 font-bold rounded-full shadow-sm border border-slate-400 hover:bg-slate-50 transition-colors shrink-0"
                         >
                             <ArrowDown className="rotate-90" size={16}/> {t('dashboard.back_button')}
                         </button>
                         <div>
                             <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl shadow-md border-4 border-indigo-100">
                                        {selectedStudent.studentNickname.charAt(0).toUpperCase()}
                                    </div>
                                    {gradedIds.has(selectedStudent.id) && (
                                        <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5 border-2 border-white shadow-sm">
                                            <CheckCircle2 size={14} />
                                        </div>
                                    )}
                                </div>
                                {selectedStudent.studentNickname}
                             </h2>
                             <div className="flex items-center gap-3 mt-2 flex-wrap">
                                 <p className="text-xs text-slate-600 font-mono bg-slate-100 px-2 py-1 rounded border border-slate-400">
                                    {new Date(selectedStudent.timestamp).toLocaleString()}
                                 </p>
                                 <div className="h-4 w-px bg-slate-300 hidden sm:block"></div>
                                 <span className="text-xs font-bold bg-purple-100 text-purple-700 px-3 py-1 rounded-full border border-purple-200 flex items-center gap-1">
                                    <MapIcon size={12} /> {t('dashboard.detail.adventure_badge', { level: getStudentLevel(selectedStudent.history) })}
                                 </span>
                                 <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200 flex items-center gap-1">
                                    <CheckSquare size={12} /> {t('dashboard.detail.quiz_badge', { count: quizHistory.length })}
                                 </span>
                                 {selectedStudent.probeHistory && Object.keys(selectedStudent.probeHistory).length > 0 && (
                                     <span className="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                                         📊 {Object.values(selectedStudent.probeHistory).flat().length} Probes
                                     </span>
                                 )}
                                 {selectedStudent.surveyResponses && selectedStudent.surveyResponses.length > 0 && (
                                     <span className="text-xs font-bold bg-purple-100 text-purple-700 px-3 py-1 rounded-full border border-purple-200 flex items-center gap-1">
                                         📝 {selectedStudent.surveyResponses.length} Surveys
                                     </span>
                                 )}
                             </div>
                         </div>
                     </div>
                     <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-full border-2 transition-all select-none shadow-sm ${gradedIds.has(selectedStudent.id) ? 'bg-green-50 border-green-500 text-green-800' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                        <input aria-label={t('common.text_field')}
                            type="checkbox"
                            className="hidden"
                            checked={gradedIds.has(selectedStudent.id)}
                            onChange={() => toggleGraded(selectedStudent.id)}
                        />
                        {gradedIds.has(selectedStudent.id) ? <CheckCircle2 size={18} className="fill-green-500 text-white"/> : <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>}
                        <span className="font-bold text-sm">{gradedIds.has(selectedStudent.id) ? t('dashboard.table.graded') : t('dashboard.table.mark_graded')}</span>
                     </label>
                 </div>
                 {selectedStudent.progressLog && (
                     <LongitudinalProgressChart logs={selectedStudent.progressLog} />
                 )}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 mt-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-400 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">{t('dashboard.charts.student_vs_class')}</h4>
                        <div className="flex items-center gap-6">
                            <div className="w-1/2">
                                <SimpleBarChart
                                    data={[
                                        { label: t('dashboard.charts.student_avg'), value: studentAvg },
                                        { label: t('dashboard.charts.class_avg'), value: analytics.averageScore }
                                    ]}
                                    color={studentAvg >= analytics.averageScore ? "green" : "orange"}
                                />
                            </div>
                            <div className="w-1/2 flex flex-col justify-center gap-2">
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                                    <div className="text-2xl font-black text-indigo-900">{studentAvg}%</div>
                                    <div className="text-[11px] font-bold text-slate-600 uppercase">{t('dashboard.charts.student_avg')}</div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                                    <div className="text-xl font-bold text-slate-600">{analytics.averageScore}%</div>
                                    <div className="text-[11px] font-bold text-slate-600 uppercase">{t('dashboard.charts.class_avg')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-400 shadow-sm flex flex-col justify-center">
                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{t('dashboard.charts.quiz_participation')}</h4>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-black text-slate-800">{quizHistory.length}</span>
                            <span className="text-sm font-medium text-slate-600 mb-1">{t('dashboard.charts.quizzes_taken')}</span>
                        </div>
                    </div>
                 </div>
                 {(selectedStudent.probeHistory || selectedStudent.interventionLogs || selectedStudent.surveyResponses || selectedStudent.fluencyAssessments) && (
                     <div className="bg-white p-6 rounded-xl border border-slate-400 shadow-sm mb-6 mt-6">
                         <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                             📊 Assessment & Research Data
                         </h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                             {selectedStudent.probeHistory && Object.keys(selectedStudent.probeHistory).length > 0 && (
                                 <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                                     <div className="text-2xl font-black text-amber-700">{Object.values(selectedStudent.probeHistory).flat().length}</div>
                                     <div className="text-[11px] font-bold text-amber-600 uppercase mt-1">{t('probes.probe_results')}</div>
                                     <div className="text-[11px] text-slate-600 mt-2">
                                         {Object.keys(selectedStudent.probeHistory).map(name => (
                                             <div key={name} className="flex justify-between">
                                                 <span>{name}</span>
                                                 <span className="font-bold">{selectedStudent.probeHistory[name].length} probes</span>
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                             )}
                             {selectedStudent.interventionLogs && selectedStudent.interventionLogs.length > 0 && (
                                 <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                     <div className="text-2xl font-black text-blue-700">{selectedStudent.interventionLogs.length}</div>
                                     <div className="text-[11px] font-bold text-blue-600 uppercase mt-1">{t('research.intervention_logs')}</div>
                                 </div>
                             )}
                             {selectedStudent.surveyResponses && selectedStudent.surveyResponses.length > 0 && (
                                 <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                                     <div className="text-2xl font-black text-purple-700">{selectedStudent.surveyResponses.length}</div>
                                     <div className="text-[11px] font-bold text-purple-600 uppercase mt-1">{t('research.survey_responses')}</div>
                                     <div className="text-[11px] text-slate-600 mt-2">
                                         {selectedStudent.surveyResponses.slice(-1).map((r, i) => (
                                             <div key={i}>Latest: {r.type || 'survey'} ({new Date(r.timestamp || Date.now()).toLocaleDateString()})</div>
                                         ))}
                                     </div>
                                 </div>
                             )}
                             {selectedStudent.sessionCounter !== undefined && (
                                 <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                                     <div className="text-2xl font-black text-emerald-700">{selectedStudent.sessionCounter}</div>
                                     <div className="text-[11px] font-bold text-emerald-600 uppercase mt-1">{t('research.sessions_completed')}</div>
                                     {selectedStudent.fidelityLog && selectedStudent.fidelityLog.length > 0 && (
                                         <div className="text-[11px] text-slate-600 mt-2">{selectedStudent.fidelityLog.length} fidelity records</div>
                                     )}
                                 </div>
                             )}
                         </div>
                         {selectedStudent.probeHistory && Object.keys(selectedStudent.probeHistory).length > 0 && (
                             <div className="mt-4 space-y-2">
                                 <h5 className="text-[11px] font-bold text-slate-600 uppercase">{t('research.recent_probe_results')}</h5>
                                 <div className="space-y-1.5">
                                     {Object.entries(selectedStudent.probeHistory).flatMap(([name, probes]) =>
                                         probes.slice(-3).map((p, i) => (
                                             <div key={name + '-' + i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 text-xs">
                                                 <span className="font-bold text-slate-700">{name}</span>
                                                 <div className="flex items-center gap-3">
                                                     <span className="text-slate-600">{p.probeType || p.type || 'Probe'}</span>
                                                     {p.wcpm !== undefined && <span className="font-mono font-bold text-amber-700">{p.wcpm} WCPM</span>}
                                                     {p.dcpm !== undefined && <span className="font-mono font-bold text-amber-700">{p.dcpm} DCPM</span>}
                                                     {p.accuracy !== undefined && <span className="font-mono font-bold text-emerald-700">{Math.round(p.accuracy * 100)}%</span>}
                                                     {p.score !== undefined && <span className="font-mono font-bold text-indigo-700">{p.score}</span>}
                                                     <span className="text-slate-600">{new Date(p.timestamp || p.date || Date.now()).toLocaleDateString()}</span>
                                                 </div>
                                             </div>
                                         ))
                                     )}
                                 </div>
                             </div>
                         )}
                         {selectedStudent.externalCBMScores && Object.keys(selectedStudent.externalCBMScores).length > 0 && (
                             <div className="mt-4">
                                 <h5 className="text-[11px] font-bold text-slate-600 uppercase mb-2">{t('research.external_cbm_scores')}</h5>
                                 <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                     {Object.entries(selectedStudent.externalCBMScores).map(([source, scores]) => (
                                         <div key={source} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                             <div className="text-[11px] font-bold text-slate-600 uppercase">{source}</div>
                                             {Array.isArray(scores) ? scores.slice(-1).map((s, i) => (
                                                 <div key={i} className="text-sm font-bold text-slate-800">{s.score || s.value || JSON.stringify(s)}</div>
                                             )) : <div className="text-sm font-bold text-slate-800">{JSON.stringify(scores)}</div>}
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         )}
                     </div>
                 )}
                 <div className="flex-grow overflow-y-auto custom-scrollbar space-y-6 pb-10">
                     {(selectedStudent.history || []).map((item, idx) => (
                        <div key={item.id || idx} className="bg-white p-6 rounded-xl border border-slate-400 shadow-sm hover:border-indigo-300 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{item.title || "Untitled Resource"}</h3>
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{item.type}</span>
                                </div>
                                <span className="text-xs text-slate-600 font-mono">
                                    {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                            {item.meta && (
                                <p className="text-sm text-slate-600 italic border-l-2 border-slate-200 pl-3 mb-4">
                                    {item.meta}
                                </p>
                            )}
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 overflow-x-auto">
                                <div
                                    className="prose prose-sm max-w-none text-slate-700 leading-relaxed"
                                    dangerouslySetInnerHTML={{
                                        __html: generateResourceHTML
                                            ? generateResourceHTML(item, true, selectedStudent.responses || {})
                                    : '<p>Error: Renderer not available.</p>',
                            }}
                        />
                    </div>
                </div>
                ))}
                {selectedStudent.history.length === 0 && (
                    <div className="text-center py-12 text-slate-600 italic">
                        {t('dashboard.empty.no_history')}
                    </div>
                )}
            </div>
        </div>
    ) : (
             <>
                 {dashboardData.length === 0 ? (
                     <div className="relative flex flex-col items-center justify-center h-full text-slate-600 gap-4 border-4 border-dashed border-slate-300 rounded-3xl hover:bg-slate-100 hover:border-indigo-300 hover:text-indigo-500 transition-all cursor-pointer group min-h-[400px] bg-white">
                         <div className="bg-slate-50 p-6 rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                              <Upload size={48} className="text-slate-600 group-hover:text-indigo-500" />
                         </div>
                         <h3 className="text-2xl font-black text-slate-600 group-hover:text-indigo-700">{t('dashboard.drop_files')}</h3>
                         <p className="text-sm font-bold opacity-70 bg-slate-200 px-3 py-1 rounded-full group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">{t('dashboard.batch_supported')}</p>
                         <input aria-label={t('common.upload_json_file')}
                            type="file"
                            multiple
                            accept=".json"
                            onChange={handleBatchUpload} data-help-key="dashboard_drop_zone_input"
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                         />
                     </div>
                 ) : (
                    <>
                     {activeTab === 'students' && (
                     <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-left-4">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-400 flex items-center gap-4">
                                 <div className="bg-blue-100 p-3 rounded-full text-blue-600"><Users size={24}/></div>
                                 <div>
                                     <div className="text-2xl font-black text-slate-800">{dashboardData.length}</div>
                                     <div className="text-xs font-bold text-slate-600 uppercase">{t('dashboard.stats.students_loaded')}</div>
                                 </div>
                             </div>
                             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-400 flex items-center gap-4 relative group cursor-pointer hover:border-indigo-300 transition-colors">
                                 <div className="bg-green-100 p-3 rounded-full text-green-600"><Upload size={24}/></div>
                                 <div>
                                     <div className="text-sm font-bold text-green-700">{t('dashboard.stats.add_files')}</div>
                                     <div className="text-xs text-slate-600">{t('dashboard.stats.click_upload')}</div>
                                 </div>
                                 <input aria-label={t('common.upload_json_file')}
                                    type="file"
                                    multiple
                                    accept=".json"
                                    onChange={handleBatchUpload} data-help-key="dashboard_add_file_btn_input" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                 />
                             </div>
                             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-400 flex items-center gap-4 cursor-pointer hover:bg-red-50 transition-colors" onClick={handleClearAll} role="button" tabIndex="0" aria-label={t('dashboard.stats.clear_dashboard')} onKeyDown={(e) => e.key === 'Enter' && handleClearAll()}>
                                 <div className="bg-red-100 p-3 rounded-full text-red-600"><Trash2 size={24}/></div>
                                 <div>
                                     <div className="text-sm font-bold text-red-700">{t('dashboard.stats.clear_dashboard')}</div>
                                     <div className="text-xs text-slate-600">{t('dashboard.stats.clear_desc')}</div>
                                 </div>
                             </div>
                         </div>
                         <div className="flex items-center gap-2 flex-wrap">
                             {[
                                 ["all", "👥 All", dashboardData.length],
                                 ["probes", "📊 Has Probes", dashboardData.filter(s => s.probeHistory && Object.keys(s.probeHistory).length > 0).length],
                                 ["surveys", "📝 Has Surveys", dashboardData.filter(s => s.surveyResponses && s.surveyResponses.length > 0).length],
                                 ["graded", "✅ Graded", dashboardData.filter(s => gradedIds.has(s.id)).length],
                                 ["ungraded", "⬜ Ungraded", dashboardData.filter(s => !gradedIds.has(s.id)).length],
                             ].map(([key, label, count]) => (
                                 <button key={key} onClick={() => setStudentFilter(key)}
                                     className={"text-xs font-bold px-3 py-1.5 rounded-full transition-all border " + (studentFilter === key ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50")}
                                 >{label} ({count})</button>
                             ))}
                         </div>
                         <div className="bg-white rounded-2xl shadow-sm border border-slate-400 overflow-x-auto">
                             <table className="w-full text-left text-sm text-slate-600 min-w-[600px]">
                                 <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-600">
                                     <tr>
                                         <th className="p-4">{t('dashboard.header_nickname')}</th>
                                         <th className="p-4">{t('dashboard.header_date')}</th>
                                         <th className="p-4">{t('dashboard.header_progress')}</th>
                                         <th className="p-4">{t('dashboard.header_level')}</th>
                                         <th className="p-4 text-right">{t('dashboard.header_actions')}</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                     {dashboardData.map((student, idx) => {
                                         const level = getStudentLevel(student.history);
                                         const isGraded = gradedIds.has(student.id);
                                         return (
                                             <tr key={idx} className={`hover:bg-slate-50 transition-colors ${isGraded ? 'bg-green-50/30' : ''}`}>
                                                 <td className="p-4 font-bold text-indigo-900 flex items-center gap-2">
                                                     <div className="relative">
                                                         <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">
                                                             {student.studentNickname.charAt(0).toUpperCase()}
                                                         </div>
                                                         {isGraded && (
                                                             <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5 border border-white shadow-sm">
                                                                 <CheckCircle2 size={8} />
                                                             </div>
                                                         )}
                                                     </div>
                                                     {student.studentNickname}
                                                     {isGraded && <span className="text-[11px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded ml-2 uppercase tracking-wider">{t('dashboard.table.graded')}</span>}
                                                 
                                                      {student.probeHistory && Object.keys(student.probeHistory).length > 0 && <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded ml-1 border border-amber-200" title={Object.values(student.probeHistory).flat().length + ' probes'}>📊</span>}
                                                      {student.surveyResponses && student.surveyResponses.length > 0 && <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded ml-1 border border-purple-200" title={student.surveyResponses.length + ' surveys'}>📝</span>}
                                                      {student.sessionCounter > 0 && <span className="text-[11px] font-bold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded ml-1 border border-cyan-200" title={student.sessionCounter + ' sessions'}>🔄</span>}
                                                  </td>
                                                 <td className="p-4 text-slate-600 font-mono text-xs">
                                                     {new Date(student.timestamp).toLocaleDateString()} <span className="hidden sm:inline">{new Date(student.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                 </td>
                                                 <td className="p-4">
                                                     <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold border border-green-200">
                                                         {calculateScore(student.history)}
                                                     </span>
                                                 </td>
                                                 <td className="p-4">
                                                     {level !== "N/A" ? (
                                                         <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-bold border border-purple-200 flex items-center gap-1 w-fit">
                                                             <MapIcon size={10} /> Lvl {level}
                                                         </span>
                                                     ) : (
                                                         <span className="text-slate-600 text-xs">-</span>
                                                     )}
                                                 </td>
                                                 <td className="p-4 text-right">
                                                     <button
                                                        onClick={() => {
                                                            setSelectedStudentId(student.id);
                                                            setDashboardView('detail');
                                                        }} data-help-key="dashboard_review_btn"
                                                        className="text-indigo-600 hover:text-indigo-800 font-bold text-xs px-3 py-1 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all"
                                                     >
                                                         {t('dashboard.table.review_work')}
                                                     </button>
                                                 </td>
                                             </tr>
                                         );
                                     })}
                                 </tbody>
                             </table>
                         </div>
                     </div>
                     )}
                     {activeTab === 'insights' && (
                         <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-400">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{t('dashboard.insights.class_performance')}</h3>
                                    <p className="text-xs text-slate-600">{t('dashboard.insights.generated_date')} {new Date().toLocaleDateString()}</p>
                                </div>
                                <button
                                    aria-label={t('common.export_file')}
                                    onClick={handleExportAnalyticsPDF} data-help-key="dashboard_export_pdf_btn"
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                >
                                    <FileDown size={14} /> {t('dashboard.insights.export_report')}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-400 flex flex-col items-center">
                                    <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">{t('dashboard.insights.avg_score')}</h3>
                                    <SimpleDonutChart
                                        percentage={analytics.averageScore}
                                        label={`${analytics.averageScore}%`}
                                        color={analytics.averageScore >= 80 ? "green" : analytics.averageScore >= 60 ? "yellow" : "red"}
                                    />
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-400 flex flex-col items-center">
                                    <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">{t('dashboard.insights.quiz_completion')}</h3>
                                    <SimpleDonutChart
                                        percentage={analytics.quizCompletionRate}
                                        label={`${Math.round(analytics.quizCompletionRate)}%`}
                                        color="blue"
                                    />
                                    <p className="text-xs text-slate-600 mt-2 text-center">{t('dashboard.insights.students_participating')}</p>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-400 flex flex-col justify-center">
                                    <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">{t('dashboard.insights.avg_adv_level')}</h3>
                                    <div className="text-5xl font-black text-purple-600 text-center mb-2">{analytics.avgAdventureLevel.toFixed(1)}</div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div className="bg-purple-500 h-full" style={{ width: `${Math.min(100, (analytics.avgAdventureLevel / 10) * 100)}%` }}></div>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-2 text-center">{t('dashboard.insights.adv_level_desc')}</p>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-400">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <AlertCircle size={20} className="text-red-500"/> {t('dashboard.insights.misconceptions_title')}
                                </h3>
                                {misconceptionChartData.length > 0 ? (
                                    <div className="flex flex-col md:flex-row gap-8 items-center">
                                        <div className="flex-1 w-full">
                                            <SimpleBarChart data={misconceptionChartData} color="red" />
                                        </div>
                                        <div className="flex-1 w-full">
                                            <ul className="space-y-3">
                                                {analytics.misconceptions.map((m, i) => (
                                                    <li key={i} className="text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                                                        <div className="font-bold text-red-800 mb-1 flex justify-between">
                                                            <span>Question {i+1}</span>
                                                            <span className="bg-white px-2 rounded text-red-600 border border-red-200">{m.count} {t('dashboard.insights.misses')}</span>
                                                        </div>
                                                        <p className="text-slate-600 italic line-clamp-2">"{m.question}"</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-slate-600 italic">
                                        {t('dashboard.insights.no_misconceptions')}
                                    </div>
                                )}
                            </div>
                            {/* Research & Assessment Analytics */}
                            {(() => {
                                const allProbes = dashboardData.flatMap(s => 
                                    s.probeHistory ? Object.values(s.probeHistory).flat() : []
                                );
                                const allSurveys = dashboardData.flatMap(s => s.surveyResponses || []);
                                const totalSessions = dashboardData.reduce((sum, s) => sum + (s.sessionCounter || 0), 0);
                                const studentsWithProbes = dashboardData.filter(s => s.probeHistory && Object.keys(s.probeHistory).length > 0).length;
                                const studentsWithSurveys = dashboardData.filter(s => s.surveyResponses && s.surveyResponses.length > 0).length;
                                
                                if (allProbes.length === 0 && allSurveys.length === 0 && totalSessions === 0) return null;
                                
                                return React.createElement('div', { className: 'space-y-6' },
                                    React.createElement('h3', { className: 'text-lg font-bold text-slate-800 flex items-center gap-2 mt-4' },
                                        t('dashboard.insights.research_analytics')),
                                    
                                    allProbes.length > 0 && React.createElement('div', { className: 'bg-white p-6 rounded-2xl shadow-sm border border-slate-400' },
                                        React.createElement('h4', { className: 'text-sm font-bold text-amber-700 uppercase tracking-wider mb-4 flex items-center gap-2' },
                                            t('dashboard.insights.probe_summary')),
                                        React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4' },
                                            React.createElement('div', { className: 'bg-amber-50 rounded-xl p-4 text-center border border-amber-100' },
                                                React.createElement('div', { className: 'text-3xl font-black text-amber-700' }, allProbes.length),
                                                React.createElement('div', { className: 'text-[11px] font-bold text-amber-500 uppercase mt-1' }, t('dashboard.insights.total_probes'))),
                                            React.createElement('div', { className: 'bg-amber-50 rounded-xl p-4 text-center border border-amber-100' },
                                                React.createElement('div', { className: 'text-3xl font-black text-amber-700' }, studentsWithProbes),
                                                React.createElement('div', { className: 'text-[11px] font-bold text-amber-500 uppercase mt-1' }, t('dashboard.insights.students_assessed'))),
                                            (() => {
                                                const wcpmProbes = allProbes.filter(p => p.wcpm !== undefined);
                                                if (wcpmProbes.length === 0) return null;
                                                const avgWcpm = Math.round(wcpmProbes.reduce((s,p) => s + p.wcpm, 0) / wcpmProbes.length);
                                                return React.createElement('div', { className: 'bg-amber-50 rounded-xl p-4 text-center border border-amber-100' },
                                                    React.createElement('div', { className: 'text-3xl font-black text-amber-700' }, avgWcpm),
                                                    React.createElement('div', { className: 'text-[11px] font-bold text-amber-500 uppercase mt-1' }, t('dashboard.insights.avg_wcpm')));
                                            })(),
                                            (() => {
                                                const dcpmProbes = allProbes.filter(p => p.dcpm !== undefined);
                                                if (dcpmProbes.length === 0) return null;
                                                const avgDcpm = Math.round(dcpmProbes.reduce((s,p) => s + p.dcpm, 0) / dcpmProbes.length);
                                                return React.createElement('div', { className: 'bg-amber-50 rounded-xl p-4 text-center border border-amber-100' },
                                                    React.createElement('div', { className: 'text-3xl font-black text-amber-700' }, avgDcpm),
                                                    React.createElement('div', { className: 'text-[11px] font-bold text-amber-500 uppercase mt-1' }, t('dashboard.insights.avg_dcpm')));
                                            })(),
                                            (() => {
                                                const accProbes = allProbes.filter(p => p.accuracy !== undefined);
                                                if (accProbes.length === 0) return null;
                                                const avgAcc = Math.round(accProbes.reduce((s,p) => s + p.accuracy, 0) / accProbes.length * 100);
                                                return React.createElement('div', { className: 'bg-amber-50 rounded-xl p-4 text-center border border-amber-100' },
                                                    React.createElement('div', { className: 'text-3xl font-black text-amber-700' }, avgAcc + '%'),
                                                    React.createElement('div', { className: 'text-[11px] font-bold text-amber-500 uppercase mt-1' }, t('dashboard.insights.avg_accuracy')));
                                            })()
                                        )
                                    ),
                                    
                                    allSurveys.length > 0 && React.createElement('div', { className: 'bg-white p-6 rounded-2xl shadow-sm border border-slate-400' },
                                        React.createElement('h4', { className: 'text-sm font-bold text-purple-700 uppercase tracking-wider mb-4 flex items-center gap-2' },
                                            t('dashboard.insights.tam_survey_analysis')),
                                        React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-4' },
                                            React.createElement('div', { className: 'bg-purple-50 rounded-xl p-4 text-center border border-purple-100' },
                                                React.createElement('div', { className: 'text-3xl font-black text-purple-700' }, allSurveys.length),
                                                React.createElement('div', { className: 'text-[11px] font-bold text-purple-500 uppercase mt-1' }, t('dashboard.insights.total_responses'))),
                                            React.createElement('div', { className: 'bg-purple-50 rounded-xl p-4 text-center border border-purple-100' },
                                                React.createElement('div', { className: 'text-3xl font-black text-purple-700' }, studentsWithSurveys),
                                                React.createElement('div', { className: 'text-[11px] font-bold text-purple-500 uppercase mt-1' }, t('dashboard.insights.respondents')))
                                        ),
                                        (() => {
                                            const tamIds = ['perceived_usefulness', 'ease_of_use', 'intention'];
                                            const tamLabels = { perceived_usefulness: t('dashboard.insights.perceived_usefulness'), ease_of_use: t('dashboard.insights.ease_of_use'), intention: t('dashboard.insights.behavioral_intention') };
                                            const tamColors = { perceived_usefulness: 'text-blue-700', ease_of_use: 'text-green-700', intention: 'text-indigo-700' };
                                            const tamBgs = { perceived_usefulness: 'bg-blue-50 border-blue-100', ease_of_use: 'bg-green-50 border-green-100', intention: 'bg-indigo-50 border-indigo-100' };
                                            const constructs = tamIds.map(id => {
                                                const scores = allSurveys.filter(s => s.answers && s.answers[id] !== undefined).map(s => s.answers[id]);
                                                if (scores.length === 0) return null;
                                                const avg = (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(1);
                                                return { id, label: tamLabels[id], avg, n: scores.length, color: tamColors[id], bg: tamBgs[id] };
                                            }).filter(Boolean);
                                            if (constructs.length === 0) return null;
                                            return React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
                                                ...constructs.map(c => 
                                                    React.createElement('div', { key: c.id, className: 'rounded-xl p-4 border ' + c.bg },
                                                        React.createElement('div', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wider mb-2' }, c.label),
                                                        React.createElement('div', { className: 'flex items-end gap-2' },
                                                            React.createElement('span', { className: 'text-3xl font-black ' + c.color }, c.avg),
                                                            React.createElement('span', { className: 'text-xs text-slate-600 mb-1' }, '/ 5.0')),
                                                        React.createElement('div', { className: 'w-full bg-slate-200 rounded-full h-2 mt-2 overflow-hidden' },
                                                            React.createElement('div', { className: 'h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all', style: { width: (parseFloat(c.avg) / 5 * 100) + '%' } })),
                                                        React.createElement('div', { className: 'text-[11px] text-slate-600 mt-1' }, 'n = ' + c.n + ' responses')
                                                    )
                                                )
                                            );
                                        })()
                                    ),
                                    
                                    totalSessions > 0 && React.createElement('div', { className: 'bg-white p-6 rounded-2xl shadow-sm border border-slate-400' },
                                        React.createElement('h4', { className: 'text-sm font-bold text-emerald-700 uppercase tracking-wider mb-4 flex items-center gap-2' },
                                            t('dashboard.insights.session_fidelity')),
                                        React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-3 gap-4' },
                                            React.createElement('div', { className: 'bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100' },
                                                React.createElement('div', { className: 'text-3xl font-black text-emerald-700' }, totalSessions),
                                                React.createElement('div', { className: 'text-[11px] font-bold text-emerald-500 uppercase mt-1' }, t('dashboard.insights.total_sessions'))),
                                            React.createElement('div', { className: 'bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100' },
                                                React.createElement('div', { className: 'text-3xl font-black text-emerald-700' }, 
                                                    dashboardData.length > 0 ? (totalSessions / dashboardData.length).toFixed(1) : '0'),
                                                React.createElement('div', { className: 'text-[11px] font-bold text-emerald-500 uppercase mt-1' }, t('dashboard.insights.avg_per_student'))),
                                            (() => {
                                                const totalFidelity = dashboardData.reduce((sum, s) => sum + (s.fidelityLog ? s.fidelityLog.length : 0), 0);
                                                if (totalFidelity === 0) return null;
                                                return React.createElement('div', { className: 'bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100' },
                                                    React.createElement('div', { className: 'text-3xl font-black text-emerald-700' }, totalFidelity),
                                                    React.createElement('div', { className: 'text-[11px] font-bold text-emerald-500 uppercase mt-1' }, t('dashboard.insights.fidelity_records')));
                                            })()
                                        )
                                    ),
                                    
                                    allProbes.length > 2 && React.createElement('div', { className: 'bg-white p-6 rounded-2xl shadow-sm border border-slate-400' },
                                        React.createElement('h4', { className: 'text-sm font-bold text-cyan-700 uppercase tracking-wider mb-4 flex items-center gap-2' },
                                            '📈 Probe Trends Over Time'),
                                        (() => {
                                            const sorted = allProbes.filter(p => p.date && p.wcpm !== undefined).sort((a,b) => new Date(a.date) - new Date(b.date));
                                            if (sorted.length < 2) return React.createElement('p', { className: 'text-sm text-slate-600 italic' }, 'Need at least 2 probes with dates to show trends.');
                                            const maxWcpm = Math.max(...sorted.map(p => p.wcpm), 10);
                                            const chartH = 160;
                                            const barW = Math.max(20, Math.min(50, 600 / sorted.length));
                                            return React.createElement('div', { className: 'space-y-3' },
                                                React.createElement('div', { className: 'flex items-end gap-1 overflow-x-auto pb-2', style: { height: (chartH + 40) + 'px' } },
                                                    ...sorted.map((p, i) => {
                                                        const h = Math.max(4, (p.wcpm / maxWcpm) * chartH);
                                                        const color = p.wcpm >= 100 ? '#059669' : p.wcpm >= 60 ? '#d97706' : '#dc2626';
                                                        return React.createElement('div', { key: i, className: 'flex flex-col items-center', style: { width: barW + 'px' } },
                                                            React.createElement('div', { className: 'text-[11px] font-bold mb-1', style: { color } }, p.wcpm),
                                                            React.createElement('div', { style: { width: (barW - 4) + 'px', height: h + 'px', background: color, borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease' } }),
                                                            React.createElement('div', { className: 'text-[11px] text-slate-600 mt-1 text-center', style: { width: barW + 'px' } }, 
                                                                p.date ? new Date(p.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '')
                                                        );
                                                    })
                                                ),
                                                React.createElement('div', { className: 'flex items-center gap-4 text-[11px] text-slate-600' },
                                                    React.createElement('span', null, '🟢 ≥100 WCPM'),
                                                    React.createElement('span', null, '🟡 60-99 WCPM'),
                                                    React.createElement('span', null, '🔴 <60 WCPM'),
                                                    React.createElement('span', { className: 'ml-auto font-bold' }, sorted.length + ' probes plotted')
                                                )
                                            );
                                        })()
                                    )
                                );
                            })()}
                        </div>
                     )}
                     {activeTab === 'behavior' && (
                         <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4">
                             <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-400 text-center">
                                 <div className="text-5xl mb-4">🔍</div>
                                 <h3 className="text-2xl font-black text-slate-800 mb-2">{t('behavior_lens.hub.title') || 'BehaviorLens'}</h3>
                                 <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">{t('behavior_lens.hub.subtitle') || 'Functional Behavior Assessment, ABC data collection, and Behavior Intervention Plan tools.'}</p>
                                 <button
                                     onClick={() => { if (onOpenBehaviorLens) onOpenBehaviorLens(); }}
                                     className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm flex items-center gap-2 mx-auto"
                                 >
                                     🔍 {t('behavior_lens.hub.open_btn') || 'Open BehaviorLens'}
                                 </button>
                             </div>
                         </div>
                     )}
                     {activeTab === 'stems' && (
                         <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4">
                             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-400">
                                 <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
                                     {t('teacher.stem_stations.section_title') || '🔬 STEM Station Activity'}
                                 </h3>
                                 {(() => {
                                     const stations = JSON.parse(localStorage.getItem('alloflow_stem_stations') || '[]');
                                     const xpLog = JSON.parse(localStorage.getItem('alloflow_stem_xp_log') || '[]');
                                     if (stations.length === 0) {
                                         return (
                                             <div className="text-center py-8">
                                                 <div className="text-4xl mb-3">📌</div>
                                                 <p className="text-sm text-slate-600">{t('teacher.stem_stations.empty_title') || 'No STEM Stations created yet.'}</p>
                                                 <p className="text-xs text-slate-600 mt-1">{t('teacher.stem_stations.empty_hint') || 'Generate a lesson plan to get AI-recommended STEM tools.'}</p>
                                             </div>
                                         );
                                     }
                                     return (
                                         <div className="space-y-4">
                                             <div className="grid grid-cols-3 gap-4 mb-4">
                                                 <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                                                     <div className="text-2xl font-black text-emerald-700">{stations.length}</div>
                                                     <div className="text-xs text-emerald-600 font-bold mt-1">{t('teacher.stem_stations.stations_created') || 'Stations Created'}</div>
                                                 </div>
                                                 <div className="bg-teal-50 rounded-xl p-4 text-center border border-teal-100">
                                                     <div className="text-2xl font-black text-teal-700">
                                                         {new Set(stations.flatMap(s => s.tools)).size}
                                                     </div>
                                                     <div className="text-xs text-teal-600 font-bold mt-1">{t('teacher.stem_stations.unique_tools_used') || 'Unique Tools Used'}</div>
                                                 </div>
                                                 <div className="bg-indigo-50 rounded-xl p-4 text-center border border-indigo-100">
                                                     <div className="text-2xl font-black text-indigo-700">
                                                         {xpLog.filter(e => e.stationId).length}
                                                     </div>
                                                     <div className="text-xs text-indigo-600 font-bold mt-1">{t('teacher.stem_stations.station_xp_events') || 'Station XP Events'}</div>
                                                 </div>
                                             </div>
                                             {stations.map((st) => {
                                                 const stationXP = xpLog.filter(e => e.stationId === st.id);
                                                 const totalXP = stationXP.reduce((s, e) => s + (e.xp || 0), 0);
                                                 return (
                                                     <div key={st.id} className="bg-slate-50 rounded-xl p-4 border border-slate-400 hover:border-emerald-300 transition-all">
                                                         <div className="flex items-center justify-between mb-2">
                                                             <div className="flex items-center gap-2">
                                                                 <span className="text-lg">📌</span>
                                                                 <h4 className="font-bold text-sm text-slate-800">{st.name}</h4>
                                                                 <span className="bg-emerald-100 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                                                                     {st.tools.length} tool{st.tools.length !== 1 ? 's' : ''}
                                                                 </span>
                                                             </div>
                                                             <div className="flex items-center gap-3">
                                                                 <span className="text-xs text-slate-600">
                                                                     {new Date(st.createdAt).toLocaleDateString()}
                                                                 </span>
                                                                 <span className="bg-indigo-100 text-indigo-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                                                                     {totalXP} XP
                                                                 </span>
                                                             </div>
                                                         </div>
                                                         <div className="flex flex-wrap gap-1.5 mt-2">
                                                             {st.tools.map((toolId) => {
                                                                 const registry = window.STEM_TOOL_REGISTRY || [];
                                                                 const meta = registry.find(r => r.id === toolId);
                                                                 return (
                                                                     <span key={toolId} className="bg-white text-slate-600 text-[11px] font-medium px-2 py-1 rounded-lg border border-slate-400">
                                                                         🧪 {meta ? meta.name : toolId}
                                                                     </span>
                                                                 );
                                                             })}
                                                         </div>
                                                         {st.teacherNote && (
                                                             <p className="text-xs text-slate-600 italic mt-2">"{st.teacherNote}"</p>
                                                         )}
                                                     </div>
                                                 );
                                             })}
                                         </div>
                                     );
                                 })()}
                             </div>
                         </div>
                     )}
                    </>
                 )}
             </>
         )}
      </div>
      {showClearConfirm && (
          <div role="button" tabIndex={0} className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center animate-in fade-in duration-200" onClick={() => setShowClearConfirm(false)}>
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4 animate-in zoom-in-95 duration-200" role="dialog" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-3 mb-4">
                      <div className="bg-red-100 p-3 rounded-full"><Trash2 size={24} className="text-red-600"/></div>
                      <h3 className="text-lg font-bold text-slate-800">{t('dashboard.clear_all')}</h3>
                  </div>
                  <p className="text-slate-600 mb-6">{t('dashboard.clear_confirm')}</p>
                  <div className="flex gap-3">
                      <button
                          onClick={() => setShowClearConfirm(false)}
                          className="flex-1 py-2.5 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                          {t('common.cancel')}
                      </button>
                      <button
                          onClick={confirmClearAll}
                          className="flex-1 py-2.5 px-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
                          autoFocus
                      >
                          {t('common.confirm')}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CDN module registrations — wire each component on window.AlloModules so the
// shims in AlloFlowANTI.txt can find them. Without these the shims fall back
// to a "Loading…" placeholder forever.
// ─────────────────────────────────────────────────────────────────────────────
window.AlloModules = window.AlloModules || {};
window.AlloModules.RosterKeyPanel             = RosterKeyPanel;
window.AlloModules.SimpleBarChart             = SimpleBarChart;
window.AlloModules.SimpleDonutChart           = SimpleDonutChart;
window.AlloModules.ConfettiEffect             = ConfettiEffect;
window.AlloModules.StudentEscapeRoomOverlay   = StudentEscapeRoomOverlay;
window.AlloModules.EscapeRoomTeacherControls  = EscapeRoomTeacherControls;
window.AlloModules.TeacherLiveQuizControls    = TeacherLiveQuizControls;
window.AlloModules.LongitudinalProgressChart  = LongitudinalProgressChart;
window.AlloModules.LearnerProgressView        = LearnerProgressView;
window.AlloModules.TeacherDashboard           = TeacherDashboard;
