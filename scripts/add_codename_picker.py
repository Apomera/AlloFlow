"""
add_codename_picker.py — Replace the plain text input in the Roster's Add Student form
with a hybrid codename picker: dual dropdowns (same adjective+animal system as student-facing)
plus a "type custom name" toggle for IEP/real-name use cases.
"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    
    # 1. Add state variables for the codename picker inside RosterKeyPanel
    # Add after: const [newStudentName, setNewStudentName] = useState('');
    state_anchor = "const [newStudentName, setNewStudentName] = useState('');"
    new_states = """const [newStudentName, setNewStudentName] = useState('');
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
  };"""

    if state_anchor in content:
        content = content.replace(state_anchor, new_states)
        print("✅ Added codename picker state variables")
    else:
        print("❌ Could not find state anchor")
        return

    # 2. Update handleAddStudent to use the codename from dropdowns when not in custom mode
    old_add = """const handleAddStudent = () => {
    if (!newStudentName.trim()) return;
    setRosterKey(prev => ({
      ...(prev || { groups: {} }),
      className: prev?.className || '',
      groups: prev?.groups || {},
      students: { ...(prev?.students || {}), [newStudentName.trim()]: newStudentGroup || '' }
    }));
    setNewStudentName('');
  };"""
    
    new_add = """const handleAddStudent = () => {
    const name = useCustomName ? newStudentName.trim() : (rosterAdj && rosterAnimal ? `${rosterAdj} ${rosterAnimal}` : '');
    if (!name) return;
    setRosterKey(prev => ({
      ...(prev || { groups: {} }),
      className: prev?.className || '',
      groups: prev?.groups || {},
      students: { ...(prev?.students || {}), [name]: newStudentGroup || '' }
    }));
    setNewStudentName('');
    if (!useCustomName) randomizeRosterName();
  };"""

    if old_add in content:
        content = content.replace(old_add, new_add)
        print("✅ Updated handleAddStudent to support codename picker")
    else:
        print("❌ Could not find handleAddStudent anchor")
        return

    # 3. Replace the input UI with the hybrid codename picker
    old_ui = """          {/* Add Student Form */}
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
           </div>"""

    new_ui = """          {/* Add Student Form */}
           <div className="mt-4 pt-4 border-t border-slate-100">
             <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
               <Users size={14} /> {t('roster.manage_students') || 'Manage Students'}
             </div>
             <div className="flex flex-col gap-2">
               <div className="flex items-center gap-2 text-[10px]">
                 <button onClick={() => { setUseCustomName(false); if (!rosterAdj || !rosterAnimal) randomizeRosterName(); }}
                   className={`px-2 py-1 rounded-full font-bold transition-all ${!useCustomName ? 'bg-teal-100 text-teal-800 border border-teal-300' : 'text-slate-400 hover:text-slate-600'}`}>
                   🎲 Codename
                 </button>
                 <button onClick={() => setUseCustomName(true)}
                   className={`px-2 py-1 rounded-full font-bold transition-all ${useCustomName ? 'bg-teal-100 text-teal-800 border border-teal-300' : 'text-slate-400 hover:text-slate-600'}`}>
                   ✏️ Custom
                 </button>
               </div>
               <div className="flex gap-2 items-center">
                 {useCustomName ? (
                   <input type="text" value={newStudentName} onChange={e => setNewStudentName(e.target.value)}
                     placeholder={t('roster.custom_name_placeholder') || 'Type student name...'}
                     onKeyDown={e => e.key === 'Enter' && handleAddStudent()}
                     className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" />
                 ) : (
                   <div className="flex-1 flex gap-1.5 items-center">
                     <select value={rosterAdj} onChange={e => setRosterAdj(e.target.value)}
                       className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-teal-400 outline-none">
                       <option value="">{t('codenames.pick_adjective') || '— Adjective —'}</option>
                       {rosterAdjectives.map(a => <option key={a} value={a}>{a}</option>)}
                     </select>
                     <select value={rosterAnimal} onChange={e => setRosterAnimal(e.target.value)}
                       className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-teal-400 outline-none">
                       <option value="">{t('codenames.pick_animal') || '— Animal —'}</option>
                       {rosterAnimals.map(a => <option key={a} value={a}>{a}</option>)}
                     </select>
                     <button onClick={randomizeRosterName} title="Randomize" className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
                       <RefreshCw size={12} />
                     </button>
                   </div>
                 )}
                 <select value={newStudentGroup} onChange={e => setNewStudentGroup(e.target.value)}
                   className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-400 outline-none">
                   <option value="">{t('roster.unassigned') || 'Unassigned'}</option>
                   {groupIds.map(gId => <option key={gId} value={gId}>{groups[gId].name}</option>)}
                 </select>
                 <button onClick={handleAddStudent} disabled={useCustomName ? !newStudentName.trim() : (!rosterAdj || !rosterAnimal)}
                   className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors disabled:opacity-40 flex items-center gap-1">
                   <Plus size={14} /> {t('roster.add_student') || 'Add'}
                 </button>
               </div>
               {!useCustomName && rosterAdj && rosterAnimal && (
                 <div className="text-xs text-teal-600 font-medium pl-1">Preview: <strong>{rosterAdj} {rosterAnimal}</strong></div>
               )}
             </div>
           </div>"""

    if old_ui in content:
        content = content.replace(old_ui, new_ui)
        print("✅ Replaced input UI with hybrid codename picker")
    else:
        print("⚠️  Could not find exact UI anchor - trying line-based approach...")
        # Try to find by key markers
        lines = content.split('\n')
        start_idx = None
        end_idx = None
        for i, line in enumerate(lines):
            if '{/* Add Student Form */}' in line:
                start_idx = i
            if start_idx and '{/* Unassigned Students */}' in line:
                end_idx = i
                break
        
        if start_idx and end_idx:
            # Replace lines between the markers
            new_ui_clean = new_ui.lstrip()
            lines[start_idx:end_idx] = [new_ui_clean]
            content = '\n'.join(lines)
            print(f"✅ Replaced UI via line-based approach (L{start_idx+1} to L{end_idx+1})")
        else:
            print(f"❌ Could not find UI markers (start={start_idx}, end={end_idx})")
            return

    SRC.write_text(content, encoding='utf-8')
    print(f"\n✅ Saved {SRC.name}")

if __name__ == "__main__":
    main()
