"""
fix_custom_mode.py — Fix custom mode to always require a codename (for matching)
plus an optional display name (for teacher reference).
"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    
    # 1. Fix handleAddStudent — always use codename as key, store displayName as metadata
    old_add = """const handleAddStudent = () => {
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
    
    new_add = """const handleAddStudent = () => {
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
  };"""
    
    if old_add in content:
        content = content.replace(old_add, new_add)
        print("✅ Fixed handleAddStudent: codename as key + displayName as metadata")
    else:
        print("❌ Could not find handleAddStudent anchor")
        return
    
    # 2. Fix the UI: custom mode shows codename dropdowns + display name field
    # Find the mode toggle and replace the conditional rendering
    old_custom_input = """{useCustomName ? (
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
                 )}"""
    
    new_custom_input = """<div className="flex-1 flex flex-col gap-1.5">
                     <div className="flex gap-1.5 items-center">
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
                     {useCustomName && (
                       <input type="text" value={newStudentName} onChange={e => setNewStudentName(e.target.value)}
                         placeholder={t('roster.display_name_placeholder') || 'Real name (for your reference only)...'}
                         onKeyDown={e => e.key === 'Enter' && handleAddStudent()}
                         className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" />
                     )}
                   </div>"""
    
    if old_custom_input in content:
        content = content.replace(old_custom_input, new_custom_input)
        print("✅ Fixed UI: codename dropdowns always shown, display name field in custom mode")
    else:
        print("❌ Could not find custom input UI anchor")
        return
    
    # 3. Fix the disabled state on Add button — always based on codename dropdowns
    old_disabled = "disabled={useCustomName ? !newStudentName.trim() : (!rosterAdj || !rosterAnimal)}"
    new_disabled = "disabled={!rosterAdj || !rosterAnimal}"
    
    if old_disabled in content:
        content = content.replace(old_disabled, new_disabled)
        print("✅ Fixed Add button disabled state: always based on codename")
    else:
        print("⚠️  Could not find disabled anchor (may already be correct)")
    
    # 4. Fix the preview to show both codename and display name
    old_preview = """{!useCustomName && rosterAdj && rosterAnimal && (
                 <div className="text-xs text-teal-600 font-medium pl-1">Preview: <strong>{rosterAdj} {rosterAnimal}</strong></div>
               )}"""
    
    new_preview = """{rosterAdj && rosterAnimal && (
                 <div className="text-xs text-teal-600 font-medium pl-1">
                   {useCustomName && newStudentName.trim()
                     ? <span>Codename: <strong>{rosterAdj} {rosterAnimal}</strong> · Display: <strong>{newStudentName.trim()}</strong></span>
                     : <span>Codename: <strong>{rosterAdj} {rosterAnimal}</strong></span>}
                 </div>
               )}"""
    
    if old_preview in content:
        content = content.replace(old_preview, new_preview)
        print("✅ Fixed preview to show both codename and display name")
    else:
        print("⚠️  Could not find preview anchor")
    
    # 5. Fix the mode toggle labels
    old_codename_label = "🎲 Codename"
    old_custom_label = "✏️ Custom"
    
    content = content.replace(old_codename_label, "🎲 Codename Only", 1)
    content = content.replace(old_custom_label, "✏️ Codename + Real Name", 1)
    print("✅ Updated mode toggle labels")
    
    # 6. Update student display in roster to show display name when available
    # Find where student names are shown in the roster list
    # "{name}" appears in student list items — we'll add displayName tooltip
    
    SRC.write_text(content, encoding='utf-8')
    print(f"\n✅ Saved {SRC.name}")

if __name__ == "__main__":
    main()
