"""
Enhance Cast Lobby with:
1. Editable character descriptions (name, role, appearance) — click-to-edit
2. Auto-generate portraits on mount (useEffect trigger)
3. Regenerate button (when portrait exists, alongside Refine/Save)
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
outpath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\diag_output.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0
lines = []

# ============================================================
# Replace the entire CastLobby component with the enhanced version
# ============================================================

old_cast_lobby_start = 'const CastLobby = React.memo(({ characters, onUpdateCharacter, onConfirm, onGeneratePortrait, onRefinePortrait, onAddCharacter, onRemoveCharacter, t }) => {'
old_cast_lobby_end = '});\nconst ImmersiveToolbar'

idx_start = content.find(old_cast_lobby_start)
idx_end = content.find(old_cast_lobby_end, idx_start)

if idx_start >= 0 and idx_end >= 0:
    # Include the closing `});` but not the `const ImmersiveToolbar`
    end_of_component = idx_end + len('});')
    
    new_cast_lobby = '''const CastLobby = React.memo(({ characters, onUpdateCharacter, onConfirm, onGeneratePortrait, onRefinePortrait, onAddCharacter, onRemoveCharacter, t }) => {
    const [editIdx, setEditIdx] = useState(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('');
    const [newAppearance, setNewAppearance] = useState('');
    const [editingField, setEditingField] = useState(null); // { idx, field }
    const [editFieldValue, setEditFieldValue] = useState('');
    const hasTriggeredAutoGen = useRef(false);
    // Auto-generate portraits for all characters on mount
    useEffect(() => {
        if (!hasTriggeredAutoGen.current && characters?.length > 0) {
            hasTriggeredAutoGen.current = true;
            characters.forEach((char, i) => {
                if (!char.portrait && !char.isGenerating) {
                    setTimeout(() => onGeneratePortrait(i), i * 600);
                }
            });
        }
    }, [characters?.length]);
    const startFieldEdit = (idx, field) => {
        setEditingField({ idx, field });
        setEditFieldValue(characters[idx]?.[field] || '');
    };
    const saveFieldEdit = () => {
        if (editingField && editFieldValue.trim()) {
            onUpdateCharacter(editingField.idx, { [editingField.field]: editFieldValue.trim() });
        }
        setEditingField(null);
        setEditFieldValue('');
    };
    return (
        <div className="fixed inset-0 z-[250] bg-gradient-to-br from-violet-950/95 to-indigo-950/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-500">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
                <div className="text-center mb-6">
                    <span className="text-4xl mb-2 block">🎭</span>
                    <h2 className="text-2xl font-bold text-slate-800">{t('adventure.cast_lobby') || 'Meet Your Cast'}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t('adventure.cast_lobby_desc') || 'Click any name, role, or description to edit. Portraits generate automatically.'}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {characters.map((char, i) => (
                        <div key={i} className="bg-gradient-to-br from-slate-50 to-violet-50 rounded-2xl border border-violet-100 p-4 flex flex-col items-center text-center transition-all hover:shadow-lg hover:border-violet-300 relative group/card">
                            <button onClick={() => onRemoveCharacter(i)} className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-100 text-red-400 hover:bg-red-200 hover:text-red-600 text-xs font-bold opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center" title="Remove character">✕</button>
                            <div className="w-24 h-24 rounded-full bg-violet-100 border-2 border-violet-200 flex items-center justify-center overflow-hidden mb-3 shadow-inner">
                                {char.isGenerating ? (
                                    <div className="animate-spin w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full"></div>
                                ) : char.portrait ? (
                                    <img src={char.portrait} alt={char.name} className="w-full h-full object-cover rounded-full"/>
                                ) : (
                                    <span className="text-3xl">🎭</span>
                                )}
                            </div>
                            {/* Editable Name */}
                            {editingField?.idx === i && editingField?.field === 'name' ? (
                                <input type="text" value={editFieldValue} onChange={(e) => setEditFieldValue(e.target.value)} onBlur={saveFieldEdit} onKeyDown={(e) => { if (e.key === 'Enter') saveFieldEdit(); if (e.key === 'Escape') { setEditingField(null); setEditFieldValue(''); }}} autoFocus className="font-bold text-slate-800 text-sm text-center w-full px-2 py-0.5 border border-violet-300 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none bg-white"/>
                            ) : (
                                <h3 onClick={() => startFieldEdit(i, 'name')} className="font-bold text-slate-800 text-sm cursor-pointer hover:text-violet-600 hover:underline decoration-dashed underline-offset-2 transition-colors" title="Click to edit name">{char.name}</h3>
                            )}
                            {/* Editable Role */}
                            {editingField?.idx === i && editingField?.field === 'role' ? (
                                <input type="text" value={editFieldValue} onChange={(e) => setEditFieldValue(e.target.value)} onBlur={saveFieldEdit} onKeyDown={(e) => { if (e.key === 'Enter') saveFieldEdit(); if (e.key === 'Escape') { setEditingField(null); setEditFieldValue(''); }}} autoFocus className="text-xs text-violet-600 font-medium text-center w-full px-2 py-0.5 border border-violet-300 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none bg-white mt-0.5"/>
                            ) : (
                                <p onClick={() => startFieldEdit(i, 'role')} className="text-xs text-violet-600 font-medium cursor-pointer hover:text-violet-800 hover:underline decoration-dashed underline-offset-2 transition-colors" title="Click to edit role">{char.role}</p>
                            )}
                            {/* Editable Appearance */}
                            {editingField?.idx === i && editingField?.field === 'appearance' ? (
                                <textarea value={editFieldValue} onChange={(e) => setEditFieldValue(e.target.value)} onBlur={saveFieldEdit} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveFieldEdit(); } if (e.key === 'Escape') { setEditingField(null); setEditFieldValue(''); }}} autoFocus rows={3} className="text-[11px] text-slate-600 mt-1 leading-relaxed w-full px-2 py-1 border border-violet-300 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none bg-white resize-none"/>
                            ) : (
                                <p onClick={() => startFieldEdit(i, 'appearance')} className="text-[11px] text-slate-500 mt-1 leading-relaxed cursor-pointer hover:text-slate-700 hover:underline decoration-dashed underline-offset-2 transition-colors" title="Click to edit appearance">{char.appearance}</p>
                            )}
                            {/* Portrait action buttons */}
                            {char.portrait && !char.isGenerating && (
                                <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                                    <button onClick={() => onGeneratePortrait(i)} className="text-xs px-3 py-1 bg-violet-600 text-white rounded-full hover:bg-violet-700 transition-all font-bold" title="Regenerate using current description">
                                        🔄 Regenerate
                                    </button>
                                    {editIdx === i ? (
                                        <div className="w-full flex gap-1 mt-1">
                                            <input type="text" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder="e.g. Add green glasses" className="flex-1 text-xs px-2 py-1 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" onKeyDown={(e) => { if (e.key === 'Enter' && editPrompt.trim()) { onRefinePortrait(i, editPrompt.trim()); setEditIdx(null); setEditPrompt(''); }}}/>
                                            <button onClick={() => { if (editPrompt.trim()) { onRefinePortrait(i, editPrompt.trim()); setEditIdx(null); setEditPrompt(''); }}} className="text-xs px-2 py-1 bg-violet-500 text-white rounded-lg font-bold hover:bg-violet-600">✓</button>
                                            <button onClick={() => { setEditIdx(null); setEditPrompt(''); }} className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-300">✗</button>
                                        </div>
                                    ) : (
                                        <>
                                            <button onClick={() => setEditIdx(i)} className="text-xs px-3 py-1 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-all font-medium border border-slate-200" title="Edit portrait with NanoBanana">
                                                ✏️ Refine
                                            </button>
                                            <button onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = char.portrait;
                                                link.download = `${(char.name || 'character').replace(/\\s+/g, '_')}_portrait.png`;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                            }} className="text-xs px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 transition-all font-medium border border-emerald-200">
                                                💾 Save
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                            {/* Generate button only if no portrait and not currently generating */}
                            {!char.portrait && !char.isGenerating && (
                                <button onClick={() => onGeneratePortrait(i)} className="mt-2 text-xs px-3 py-1 bg-violet-600 text-white rounded-full hover:bg-violet-700 transition-all font-bold">
                                    🎨 Generate Portrait
                                </button>
                            )}
                            {/* Generating indicator */}
                            {char.isGenerating && (
                                <p className="mt-2 text-[10px] text-violet-400 animate-pulse font-medium">Generating...</p>
                            )}
                        </div>
                    ))}
                    {/* Add Character Card */}
                    {isAdding ? (
                        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border-2 border-dashed border-violet-300 p-4 flex flex-col items-center text-center">
                            <span className="text-2xl mb-2">✨</span>
                            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Character name" className="w-full text-sm px-3 py-1.5 mb-2 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none text-center font-bold"/>
                            <input type="text" value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="Role (e.g. Wise Mentor)" className="w-full text-xs px-3 py-1.5 mb-2 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none text-center"/>
                            <input type="text" value={newAppearance} onChange={(e) => setNewAppearance(e.target.value)} placeholder="Appearance (e.g. tall, silver hair, blue robe)" className="w-full text-xs px-3 py-1.5 mb-2 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none text-center" onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) { onAddCharacter({ name: newName.trim(), role: newRole.trim() || 'Character', appearance: newAppearance.trim() || newName.trim(), portrait: null, isGenerating: false }); setNewName(''); setNewRole(''); setNewAppearance(''); setIsAdding(false); }}}/>
                            <div className="flex gap-1.5 mt-1">
                                <button onClick={() => { if (newName.trim()) { onAddCharacter({ name: newName.trim(), role: newRole.trim() || 'Character', appearance: newAppearance.trim() || newName.trim(), portrait: null, isGenerating: false }); setNewName(''); setNewRole(''); setNewAppearance(''); setIsAdding(false); }}} className="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg font-bold hover:bg-violet-700">Add</button>
                                <button onClick={() => { setIsAdding(false); setNewName(''); setNewRole(''); setNewAppearance(''); }} className="text-xs px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-300">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setIsAdding(true)} className="bg-gradient-to-br from-slate-50 to-violet-50 rounded-2xl border-2 border-dashed border-violet-200 p-4 flex flex-col items-center justify-center text-center transition-all hover:shadow-lg hover:border-violet-400 hover:from-violet-50 hover:to-indigo-50 min-h-[180px] cursor-pointer group">
                            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">➕</span>
                            <span className="font-bold text-sm text-violet-600">Add Character</span>
                            <span className="text-[11px] text-slate-400 mt-0.5">Create a new cast member</span>
                        </button>
                    )}
                </div>
                <div className="flex justify-center gap-3">
                    <button onClick={() => { characters.forEach((_, i) => { if (!characters[i].portrait && !characters[i].isGenerating) { onGeneratePortrait(i); }}); }} className="px-5 py-2.5 bg-violet-100 text-violet-700 font-bold rounded-xl hover:bg-violet-200 transition-all text-sm border border-violet-200">
                        🎨 {t('adventure.generate_all') || 'Generate All Portraits'}
                    </button>
                    <button onClick={onConfirm} className="px-6 py-2.5 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 shadow-lg hover:shadow-xl transition-all text-sm hover:scale-105">
                        ⚔️ {t('adventure.begin_adventure') || 'Begin Adventure'}
                    </button>
                </div>
            </div>
        </div>
    );
});'''
    
    content = content[:idx_start] + new_cast_lobby + '\n' + content[idx_end + len('});\n'):]
    fixes += 1
    lines.append("1. Replaced CastLobby component with enhanced version")
    lines.append("   - Editable name, role, and appearance (click-to-edit)")
    lines.append("   - Auto-generate portraits on mount (staggered 600ms)")
    lines.append("   - Regenerate button alongside Refine and Save")
    lines.append("   - Generating indicator text")
else:
    lines.append(f"1. SKIP - CastLobby not found (start={idx_start}, end={idx_end})")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

with open(outpath, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f"Applied {fixes} fix(es). See diag_output.txt")
