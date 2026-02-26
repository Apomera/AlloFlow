"""
Add "Add Character" form and "Remove Character" button to the CastLobby.
Also wire onAddCharacter and onRemoveCharacter props in the render call.
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# 1. Update CastLobby component signature and add state for the add-character form
old_sig = """const CastLobby = React.memo(({ characters, onUpdateCharacter, onConfirm, onGeneratePortrait, onRefinePortrait, t }) => {
    const [editIdx, setEditIdx] = useState(null);
    const [editPrompt, setEditPrompt] = useState('');"""

new_sig = """const CastLobby = React.memo(({ characters, onUpdateCharacter, onConfirm, onGeneratePortrait, onRefinePortrait, onAddCharacter, onRemoveCharacter, t }) => {
    const [editIdx, setEditIdx] = useState(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('');
    const [newAppearance, setNewAppearance] = useState('');"""

if old_sig in content:
    content = content.replace(old_sig, new_sig, 1)
    fixes += 1
    print("1: Updated CastLobby signature with add/remove props and form state")
else:
    print("1: SKIP")

# 2. Add "Add Character" card + "Remove" button on existing cards
# Insert the add card AFTER the characters.map closing and BEFORE the grid closing div
# Also add remove button to each character card
old_grid_close = """                    ))}
                </div>
                <div className="flex justify-center gap-3">"""

new_grid_close = """                    ))}
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
                <div className="flex justify-center gap-3">"""

if old_grid_close in content:
    content = content.replace(old_grid_close, new_grid_close, 1)
    fixes += 1
    print("2: Added 'Add Character' card to the grid")
else:
    print("2: SKIP")

# 3. Add a small remove button to each character card (top-right corner)
old_card_start = """                        <div key={i} className="bg-gradient-to-br from-slate-50 to-violet-50 rounded-2xl border border-violet-100 p-4 flex flex-col items-center text-center transition-all hover:shadow-lg hover:border-violet-300">
                            <div className="w-24 h-24 rounded-full"""

new_card_start = """                        <div key={i} className="bg-gradient-to-br from-slate-50 to-violet-50 rounded-2xl border border-violet-100 p-4 flex flex-col items-center text-center transition-all hover:shadow-lg hover:border-violet-300 relative group/card">
                            <button onClick={() => onRemoveCharacter(i)} className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-100 text-red-400 hover:bg-red-200 hover:text-red-600 text-xs font-bold opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center" title="Remove character">✕</button>
                            <div className="w-24 h-24 rounded-full"""

if old_card_start in content:
    content = content.replace(old_card_start, new_card_start, 1)
    fixes += 1
    print("3: Added remove button to character cards")
else:
    print("3: SKIP")

# 4. Wire onAddCharacter and onRemoveCharacter in the render call
old_render_props = """                    <CastLobby
                        characters={adventureState.characters}
                        t={t}
                        onUpdateCharacter={(idx, updates) => {"""

new_render_props = """                    <CastLobby
                        characters={adventureState.characters}
                        t={t}
                        onAddCharacter={(newChar) => {
                            setAdventureState(prev => ({
                                ...prev,
                                characters: [...prev.characters, newChar]
                            }));
                        }}
                        onRemoveCharacter={(idx) => {
                            setAdventureState(prev => ({
                                ...prev,
                                characters: prev.characters.filter((_, i) => i !== idx)
                            }));
                        }}
                        onUpdateCharacter={(idx, updates) => {"""

if old_render_props in content:
    content = content.replace(old_render_props, new_render_props, 1)
    fixes += 1
    print("4: Wired onAddCharacter and onRemoveCharacter in render")
else:
    print("4: SKIP - trying alternate whitespace")
    # Try with different indentation from the line-based insertion
    alt = "characters={adventureState.characters}\n                        t={t}\n                        onUpdateCharacter"
    if alt in content:
        content = content.replace(alt, """characters={adventureState.characters}
                        t={t}
                        onAddCharacter={(newChar) => {
                            setAdventureState(prev => ({
                                ...prev,
                                characters: [...prev.characters, newChar]
                            }));
                        }}
                        onRemoveCharacter={(idx) => {
                            setAdventureState(prev => ({
                                ...prev,
                                characters: prev.characters.filter((_, i) => i !== idx)
                            }));
                        }}
                        onUpdateCharacter""", 1)
        fixes += 1
        print("4b: Wired props (alt whitespace)")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal fixes: {fixes}")
