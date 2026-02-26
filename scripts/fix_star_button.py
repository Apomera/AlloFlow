"""Add 'mark as correct' star button to RhymeView edit mode options"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# Add star button to RhymeView edit mode
old_rhyme_edit = """                         isEditing ? (
                             <div key={i} className="p-4 rounded-2xl bg-white border-2 border-amber-200 shadow-md flex items-center gap-2 relative">
                                 <input aria-label="Enter Opt"
                                     type="text"
                                     value={opt}
                                     onChange={(e) => onUpdateOption && onUpdateOption(i, e.target.value)}
                                     className="w-full px-3 py-2 text-lg font-bold text-slate-700 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-amber-400"
                                     onKeyDown={(e) => e.stopPropagation()}
                                 />
                                 <button
                                     aria-label="Volume"
                                     onClick={(e) => {
                                         e.stopPropagation();
                                         onPlayAudio(opt, true);
                                     }}
                                     className="absolute right-2 top-2 p-2 text-slate-400 hover:text-indigo-600"
                                 >
                                    <Volume2 size={16} />
                                 </button>
                             </div>"""

new_rhyme_edit = """                         isEditing ? (
                             <div key={i} className={`p-4 rounded-2xl bg-white border-2 shadow-md flex items-center gap-2 relative ${opt?.toLowerCase() === data.rhymeWord?.toLowerCase() ? 'border-green-400 ring-2 ring-green-200' : 'border-amber-200'}`}>
                                 {/* Mark as Correct Star */}
                                 <button
                                     aria-label={opt?.toLowerCase() === data.rhymeWord?.toLowerCase() ? "Correct answer" : "Set as correct answer"}
                                     onClick={(e) => { e.stopPropagation(); onUpdateOption && onUpdateOption(i, opt, 'set_correct'); }}
                                     className={`p-1 rounded-full transition-colors flex-shrink-0 ${opt?.toLowerCase() === data.rhymeWord?.toLowerCase() ? 'text-green-500' : 'text-slate-300 hover:text-green-400'}`}
                                     title={opt?.toLowerCase() === data.rhymeWord?.toLowerCase() ? "✓ Correct answer" : "Set as correct answer"}
                                 >
                                     {opt?.toLowerCase() === data.rhymeWord?.toLowerCase() ? <Check size={20} /> : <Star size={18} />}
                                 </button>
                                 <input aria-label="Enter Opt"
                                     type="text"
                                     value={opt}
                                     onChange={(e) => onUpdateOption && onUpdateOption(i, e.target.value)}
                                     className="w-full px-3 py-2 text-lg font-bold text-slate-700 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-amber-400"
                                     onKeyDown={(e) => e.stopPropagation()}
                                 />
                                 <button
                                     aria-label="Volume"
                                     onClick={(e) => {
                                         e.stopPropagation();
                                         onPlayAudio(opt, true);
                                     }}
                                     className="absolute right-2 top-2 p-2 text-slate-400 hover:text-indigo-600"
                                 >
                                    <Volume2 size={16} />
                                 </button>
                             </div>"""

if old_rhyme_edit in content:
    content = content.replace(old_rhyme_edit, new_rhyme_edit, 1)
    changes += 1
    print("1. FIXED: Added 'mark as correct' star to RhymeView edit mode")
else:
    print("[WARN] RhymeView edit pattern not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print("\nApplied %d fixes" % changes)
