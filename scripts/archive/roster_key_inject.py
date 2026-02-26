"""
PHASE B: Roster Key System
============================
Injects the complete Roster Key system:
1. RosterKeyPanel component (after StudentWelcomeModal)
2. rosterKey state + localStorage persistence
3. CRUD handlers + Apply to Generator
4. Auto-assign students from roster key on join
5. Render RosterKeyPanel in modal area
6. Toolbar button to open Roster Key panel
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
lines = content.split('\n')
changes = 0

# ============================================================================
# INSERTION 1: RosterKeyPanel component
# Insert after StudentWelcomeModal ends (});) before SimpleBarChart
# ============================================================================

ROSTER_PANEL = r'''
const RosterKeyPanel = React.memo(({ isOpen, onClose, rosterKey, setRosterKey, onApplyGroup, onSyncToSession, activeSessionCode, t }) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#4F46E5');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGroup, setNewStudentGroup] = useState('');
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [editingField, setEditingField] = useState(null);
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
    const blob = new Blob([JSON.stringify(rosterKey || { groups: {}, students: {} }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roster_key_' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    if (!newStudentName.trim()) return;
    setRosterKey(prev => ({
      ...(prev || { groups: {} }),
      className: prev?.className || '',
      groups: prev?.groups || {},
      students: { ...(prev?.students || {}), [newStudentName.trim()]: newStudentGroup || '' }
    }));
    setNewStudentName('');
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
      <span className="font-bold text-slate-500 w-24 shrink-0">{label}:</span>
      {type === 'select' ? (
        <select value={value || ''} onChange={e => handleUpdateGroupProfile(gId, field, e.target.value)}
          className="flex-1 px-2 py-1 rounded-lg border border-slate-200 text-slate-700 text-xs focus:ring-2 focus:ring-indigo-400 outline-none">
          <option value="">—</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'range' ? (
        <div className="flex-1 flex items-center gap-2">
          <input type="range" min="0.5" max="1.5" step="0.05" value={value || 1}
            onChange={e => handleUpdateGroupProfile(gId, field, parseFloat(e.target.value))}
            className="flex-1 accent-indigo-500" />
          <span className="text-slate-600 font-mono w-10 text-right">{(value || 1).toFixed(2)}x</span>
        </div>
      ) : type === 'toggle' ? (
        <button onClick={() => handleUpdateGroupProfile(gId, field, !value)}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${value ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
          {value ? 'On' : 'Off'}
        </button>
      ) : (
        <input type="text" value={value || ''} onChange={e => handleUpdateGroupProfile(gId, field, e.target.value)}
          placeholder="—" className="flex-1 px-2 py-1 rounded-lg border border-slate-200 text-slate-700 text-xs focus:ring-2 focus:ring-indigo-400 outline-none" />
      )}
    </div>
  );
  return (
    <div ref={panelRef} role="dialog" aria-modal="true" className="fixed inset-0 z-[260] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border-2 border-indigo-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <ClipboardList size={20} className="text-indigo-500" /> {t('roster.title') || 'Class Roster Key'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('roster.subtitle') || 'FERPA-safe · Stored locally only · Never uploaded'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors" aria-label={t('common.close')}>
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-slate-50 bg-slate-50/50">
          <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1.5">
            <Upload size={14} /> {t('roster.import') || 'Import JSON'}
          </button>
          <button onClick={handleExport} disabled={!rosterKey} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors flex items-center gap-1.5 disabled:opacity-40">
            <Download size={14} /> {t('roster.export') || 'Export JSON'}
          </button>
          {activeSessionCode && (
            <button onClick={onSyncToSession} disabled={!rosterKey || groupIds.length === 0} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors flex items-center gap-1.5 disabled:opacity-40 ml-auto">
              <RefreshCw size={14} /> {t('roster.sync_session') || 'Sync to Live Session'}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
          {/* Class Name */}
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('roster.class_name') || 'Class Name'}:</label>
            <input type="text" value={rosterKey?.className || ''} onChange={e => setRosterKey(prev => ({ ...(prev || { groups: {}, students: {} }), className: e.target.value }))}
              placeholder="Ms. Smith - Period 3"
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" />
          </div>
          {/* Groups */}
          {groupIds.map(gId => {
            const group = groups[gId];
            const gStudents = getStudentsInGroup(gId);
            const isExpanded = expandedGroup === gId;
            return (
              <div key={gId} className="border border-slate-200 rounded-xl overflow-hidden transition-all hover:border-indigo-200">
                {/* Group Header */}
                <button onClick={() => setExpandedGroup(isExpanded ? null : gId)}
                  className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: group.color || '#4F46E5' }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-800 truncate">{group.name}</div>
                    <div className="text-[10px] text-slate-500">{gStudents.length} student{gStudents.length !== 1 ? 's' : ''} · {group.profile?.gradeLevel || '—'} · {group.profile?.leveledTextLanguage || '—'}</div>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-4 space-y-3 border-t border-slate-100 bg-white">
                    {/* Group Meta */}
                    <div className="flex gap-2 items-center mb-2">
                      <input type="text" value={group.name} onChange={e => handleUpdateGroupMeta(gId, 'name', e.target.value)}
                        className="flex-1 px-2 py-1 rounded-lg border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none" />
                      <div className="flex gap-1">
                        {COLORS.map(c => (
                          <button key={c} onClick={() => handleUpdateGroupMeta(gId, 'color', c)}
                            className={`w-5 h-5 rounded-full border-2 transition-all ${group.color === c ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                    {/* Profile Fields */}
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
                    {/* Students in this group */}
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('roster.students_in_group') || 'Students'}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {gStudents.map(name => (
                          <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                            {name}
                            <button onClick={() => handleMoveStudent(name, '')} className="hover:text-red-500 transition-colors ml-0.5" aria-label={'Remove ' + name}>
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                        {gStudents.length === 0 && <span className="text-xs text-slate-400 italic">{t('roster.no_students') || 'No students assigned'}</span>}
                      </div>
                    </div>
                    {/* Actions */}
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
          {/* Add Group Form */}
          <div className="flex gap-2 items-center p-3 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-300 transition-colors">
            <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
              placeholder={t('roster.new_group_placeholder') || 'New group name...'}
              onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" />
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
          {/* Add Student Form */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users size={14} /> {t('roster.manage_students') || 'Manage Students'}
            </div>
            <div className="flex gap-2 items-center">
              <input type="text" value={newStudentName} onChange={e => setNewStudentName(e.target.value)}
                placeholder={t('roster.student_codename') || 'Student codename...'}
                onKeyDown={e => e.key === 'Enter' && handleAddStudent()}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" />
              <select value={newStudentGroup} onChange={e => setNewStudentGroup(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-400 outline-none">
                <option value="">{t('roster.unassigned') || 'Unassigned'}</option>
                {groupIds.map(gId => <option key={gId} value={gId}>{groups[gId].name}</option>)}
              </select>
              <button onClick={handleAddStudent} disabled={!newStudentName.trim()}
                className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors disabled:opacity-40 flex items-center gap-1">
                <Plus size={14} /> {t('roster.add_student') || 'Add'}
              </button>
            </div>
          </div>
          {/* Unassigned Students */}
          {getUnassigned().length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mt-2">
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">{t('roster.unassigned_students') || 'Unassigned Students'}</div>
              <div className="flex flex-wrap gap-1.5">
                {getUnassigned().map(name => (
                  <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-amber-800 rounded-full text-xs font-medium border border-amber-200">
                    {name}
                    <select onChange={e => { if (e.target.value) handleMoveStudent(name, e.target.value); }} value=""
                      className="text-[10px] bg-transparent border-none outline-none cursor-pointer text-amber-600 ml-1 w-4">
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
          {/* Stats */}
          {rosterKey && (
            <div className="flex gap-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
              <span>{groupIds.length} group{groupIds.length !== 1 ? 's' : ''}</span>
              <span>{Object.keys(students).length} student{Object.keys(students).length !== 1 ? 's' : ''}</span>
              <span>{getUnassigned().length} unassigned</span>
              <span className="ml-auto flex items-center gap-1"><ShieldCheck size={10} className="text-green-500" /> Local only</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
'''

# Find insertion point: after StudentWelcomeModal ends
anchor1 = None
for i, l in enumerate(lines):
    if 'SimpleBarChart' in l and 'React.memo' in l and i > 25380:
        anchor1 = i
        break

if anchor1:
    lines.insert(anchor1, ROSTER_PANEL.rstrip())
    changes += 1
    print(f"[OK] L{anchor1+1}: Inserted RosterKeyPanel component ({ROSTER_PANEL.count(chr(10))} lines)")

# ============================================================================
# INSERTION 2: State declarations
# Insert near profiles state (find "const [profiles, setProfiles] = useState")
# ============================================================================
STATE_CODE = r'''  const [rosterKey, setRosterKey] = useState(null);
  const [isRosterKeyOpen, setIsRosterKeyOpen] = useState(false);
  // localStorage persistence for roster key (deployed version)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('alloflow_roster_key');
      if (saved) { const parsed = JSON.parse(saved); if (parsed?.groups) setRosterKey(parsed); }
    } catch(e) { /* Canvas sandbox - localStorage unavailable */ }
  }, []);
  useEffect(() => {
    if (!rosterKey) return;
    try { localStorage.setItem('alloflow_roster_key', JSON.stringify(rosterKey)); } catch(e) { /* Canvas */ }
  }, [rosterKey]);'''

for i, l in enumerate(lines):
    if 'const [profiles, setProfiles] = useState' in l:
        lines.insert(i, STATE_CODE)
        changes += 1
        print(f"[OK] L{i+1}: Inserted rosterKey state + localStorage persistence")
        break

# ============================================================================
# INSERTION 3: Handlers
# Insert near handleExportProfiles (find it)
# ============================================================================
HANDLERS_CODE = r'''  // ---- ROSTER KEY HANDLERS ----
  const handleApplyRosterGroup = (groupId) => {
      const group = rosterKey?.groups?.[groupId];
      if (!group?.profile) return;
      const p = group.profile;
      if (p.gradeLevel) setGradeLevel(p.gradeLevel);
      if (p.leveledTextLanguage) setLeveledTextLanguage(p.leveledTextLanguage);
      if (p.studentInterests) {
          const interests = Array.isArray(p.studentInterests) ? p.studentInterests : p.studentInterests.split(',').map(s => s.trim()).filter(Boolean);
          setStudentInterests(interests);
      }
      if (p.dokLevel) setDokLevel(p.dokLevel);
      if (p.leveledTextCustomInstructions) setLeveledTextCustomInstructions(p.leveledTextCustomInstructions);
      if (p.adventureCustomInstructions) setAdventureCustomInstructions(p.adventureCustomInstructions);
      addToast(t('roster.applied', { name: group.name }) || `Applied "${group.name}" settings to generator`, "info");
  };
  const handleSyncRosterToSession = async () => {
      if (!activeSessionCode || !rosterKey?.groups) return;
      try {
          const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
          const updates = {};
          Object.entries(rosterKey.groups).forEach(([gId, group]) => {
              updates[`groups.${gId}`] = {
                  name: group.name,
                  color: group.color || '#4F46E5',
                  readingLevel: group.profile?.readingLevel || '',
                  simplifyLevel: group.profile?.simplifyLevel || '',
                  dokLevel: group.profile?.dokLevel || '',
                  complexityLevel: group.profile?.complexityLevel || '',
                  ttsSpeed: group.profile?.ttsSpeed || null,
                  karaokeMode: group.profile?.karaokeMode || false,
                  language: group.profile?.leveledTextLanguage || '',
                  visualDensity: group.profile?.visualDensity || ''
              };
          });
          await updateDoc(sessionRef, updates);
          addToast(t('roster.synced') || `Synced ${Object.keys(rosterKey.groups).length} groups to live session`, "success");
      } catch(e) {
          warnLog("Roster sync error:", e);
          addToast(t('roster.sync_error') || "Could not sync roster to session", "error");
      }
  };
  // Auto-assign students from roster key when they join a live session
  useEffect(() => {
      if (!isTeacherMode || !rosterKey?.students || !activeSessionCode || !sessionData?.roster) return;
      const unassigned = Object.entries(sessionData.roster).filter(([_, s]) => !s.groupId && s.name);
      if (unassigned.length === 0) return;
      const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
      const updates = {};
      let count = 0;
      unassigned.forEach(([uid, student]) => {
          const groupId = rosterKey.students[student.name];
          if (groupId && rosterKey.groups?.[groupId]) {
              updates[`roster.${uid}.groupId`] = groupId;
              count++;
          }
      });
      if (count > 0) {
          updateDoc(sessionRef, updates).then(() => {
              addToast(t('roster.auto_assigned', { count }) || `Auto-assigned ${count} student(s) to groups`, "info");
          }).catch(e => warnLog("Auto-assign error:", e));
      }
  }, [isTeacherMode, rosterKey, activeSessionCode, sessionData?.roster]);'''

for i, l in enumerate(lines):
    if 'handleExportProfiles' in l and 'const' in l:
        lines.insert(i, HANDLERS_CODE)
        changes += 1
        print(f"[OK] L{i+1}: Inserted roster key handlers + auto-assign effect")
        break

# ============================================================================
# INSERTION 4: Render RosterKeyPanel
# Insert after StudentEntryModal render closing />
# ============================================================================
RENDER_CODE = r'''      <RosterKeyPanel
        isOpen={isRosterKeyOpen}
        onClose={() => setIsRosterKeyOpen(false)}
        rosterKey={rosterKey}
        setRosterKey={setRosterKey}
        onApplyGroup={handleApplyRosterGroup}
        onSyncToSession={handleSyncRosterToSession}
        activeSessionCode={activeSessionCode}
        t={t}
      />'''

for i, l in enumerate(lines):
    if '<StudentEntryModal' in l and i > 60000:
        # Find its closing />
        for j in range(i, min(i + 10, len(lines))):
            if '/>' in lines[j]:
                lines.insert(j + 1, RENDER_CODE)
                changes += 1
                print(f"[OK] L{j+2}: Inserted RosterKeyPanel render")
                break
        break

# ============================================================================
# INSERTION 5: Toolbar button to open Roster Key
# Find the "Start Session" or session management button area for teachers
# Add a "Class Roster" button near it
# ============================================================================
# Find a good spot: near where Start Session button is rendered
for i, l in enumerate(lines):
    if 'startClassSession' in l and 'onClick' in l and i > 50000:
        # Insert a Roster Key button right before the Start Session button's container
        # Find the <button that contains this onClick
        for j in range(i, max(i - 5, 0), -1):
            if '<button' in lines[j]:
                ROSTER_BTN = r'''                    <button 
                        onClick={() => setIsRosterKeyOpen(true)}
                        className="px-3 py-2 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-100 transition-all flex items-center gap-1.5 border border-purple-100 hover:border-purple-200"
                        title={t('roster.title') || 'Class Roster Key'}
                    >
                        <ClipboardList size={14} /> {t('roster.title') || 'Class Roster'}
                    </button>'''
                lines.insert(j, ROSTER_BTN)
                changes += 1
                print(f"[OK] L{j+1}: Inserted Roster Key toolbar button")
                break
        break

if changes > 0:
    open(filepath, 'w', encoding='utf-8').write('\n'.join(lines))
    print(f"\nTotal {changes} insertions applied.")
else:
    print("No changes made.")
