"""
Phase 2: Wire adventureConsistentCharacters into the advState destructure,
add setter, add checkbox to setup UI, and build the Cast Lobby component.
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# 1. Add adventureConsistentCharacters to advState destructure
old_destructure = "hintHistory } = advState;"
new_destructure = "hintHistory, adventureConsistentCharacters } = advState;"

if old_destructure in content:
    content = content.replace(old_destructure, new_destructure, 1)
    fixes += 1
    print("1. Added adventureConsistentCharacters to advState destructure")
else:
    print("1. SKIP - destructure pattern not found")

# 2. Add setter for adventureConsistentCharacters after setAdventureChanceMode
old_setter = "  const setAdventureChanceMode = (v) => advDispatch({ type: 'ADV_SET', field: 'adventureChanceMode', value: v });"
new_setter = """  const setAdventureChanceMode = (v) => advDispatch({ type: 'ADV_SET', field: 'adventureChanceMode', value: v });
  const setAdventureConsistentCharacters = (v) => advDispatch({ type: 'ADV_SET', field: 'adventureConsistentCharacters', value: v });"""

if old_setter in content:
    content = content.replace(old_setter, new_setter, 1)
    fixes += 1
    print("2. Added setAdventureConsistentCharacters setter")
else:
    print("2. SKIP - setter pattern not found")

# 3. Add checkbox to Adventure Setup UI near the Chance Mode checkbox
# Find the adventureChanceMode checkbox and add character consistency after it
old_chance_checkbox = """data-help-key="adventure_setup_chk_chance" checked={adventureChanceMode}"""

# First occurrence is in the main setup
idx = content.find(old_chance_checkbox)
if idx > 0:
    # Find the end of the label block (closing </label>) after the checkbox
    # We need to insert AFTER the full chance mode label block
    # Find the closing </label> after this checkbox
    end_label = content.find('</label>', idx)
    if end_label > 0:
        end_label += len('</label>')
        # Insert the character consistency checkbox after the chance mode label
        insert_text = """
                                    <label className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${adventureConsistentCharacters ? 'bg-violet-50 border-violet-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'} ${(!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings) ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <input type="checkbox" className="accent-violet-500 w-4 h-4" data-help-key="adventure_setup_chk_consistent_characters" checked={adventureConsistentCharacters} onChange={(e) => setAdventureConsistentCharacters(e.target.checked)} disabled={!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings}/>
                                        <div><span className="font-bold text-sm">🎭 Consistent Characters</span><p className="text-xs text-slate-500 mt-0.5">Generate visual cast with persistent descriptions across scenes</p></div>
                                    </label>"""
        content = content[:end_label] + insert_text + content[end_label:]
        fixes += 1
        print("3. Added character consistency checkbox to first setup UI")
    else:
        print("3. SKIP - could not find closing label")
else:
    print("3. SKIP - chance checkbox not found")

# 4. Also add to the second setup UI (full setup modal at line ~66138)
idx2 = content.find(old_chance_checkbox, idx + 100 if idx > 0 else 0)
if idx2 > 0:
    end_label2 = content.find('</label>', idx2)
    if end_label2 > 0:
        end_label2 += len('</label>')
        insert_text2 = """
                                                            <label className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${adventureConsistentCharacters ? 'bg-violet-50 border-violet-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'} ${(!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings) ? 'opacity-50 pointer-events-none' : ''}`}>
                                                                <input type="checkbox" className="accent-violet-500 w-4 h-4" data-help-key="adventure_setup_chk_consistent_characters" checked={adventureConsistentCharacters} onChange={(e) => setAdventureConsistentCharacters(e.target.checked)} disabled={!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings}/>
                                                                <div><span className="font-bold text-sm">🎭 Consistent Characters</span><p className="text-xs text-slate-500 mt-0.5">Generate visual cast with persistent descriptions</p></div>
                                                            </label>"""
        content = content[:end_label2] + insert_text2 + content[end_label2:]
        fixes += 1
        print("4. Added character consistency checkbox to second setup UI")
    else:
        print("4. SKIP - second closing label not found")
else:
    print("4. SKIP - second chance checkbox not found")

# 5. Build Cast Lobby UI component
# Insert it as an inline component before the adventure game rendering
# Find where the adventure scene renders (after setup, when game is active)
# The lobby should show when adventureState.isReviewingCharacters is true

# Find the adventure rendering area - look for the adventure active scene
# The adventure view content is inside activeView === 'adventure'
# We need to add the lobby BEFORE the normal scene rendering
cast_lobby = """
const CastLobby = React.memo(({ characters, onUpdateCharacter, onConfirm, onGeneratePortrait, onRefinePortrait, t }) => {
    const [editIdx, setEditIdx] = useState(null);
    const [editPrompt, setEditPrompt] = useState('');
    return (
        <div className="fixed inset-0 z-[250] bg-gradient-to-br from-violet-950/95 to-indigo-950/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-500">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
                <div className="text-center mb-6">
                    <span className="text-4xl mb-2 block">🎭</span>
                    <h2 className="text-2xl font-bold text-slate-800">{t('adventure.cast_lobby') || 'Meet Your Cast'}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t('adventure.cast_lobby_desc') || 'Review your characters. Click to refine their appearance.'}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {characters.map((char, i) => (
                        <div key={i} className="bg-gradient-to-br from-slate-50 to-violet-50 rounded-2xl border border-violet-100 p-4 flex flex-col items-center text-center transition-all hover:shadow-lg hover:border-violet-300">
                            <div className="w-24 h-24 rounded-full bg-violet-100 border-2 border-violet-200 flex items-center justify-center overflow-hidden mb-3 shadow-inner">
                                {char.isGenerating ? (
                                    <div className="animate-spin w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full"></div>
                                ) : char.portrait ? (
                                    <img src={char.portrait} alt={char.name} className="w-full h-full object-cover rounded-full"/>
                                ) : (
                                    <span className="text-3xl">🎭</span>
                                )}
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm">{char.name}</h3>
                            <p className="text-xs text-violet-600 font-medium">{char.role}</p>
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{char.appearance}</p>
                            {!char.portrait && !char.isGenerating && (
                                <button onClick={() => onGeneratePortrait(i)} className="mt-2 text-xs px-3 py-1 bg-violet-600 text-white rounded-full hover:bg-violet-700 transition-all font-bold">
                                    Generate Portrait
                                </button>
                            )}
                            {editIdx === i ? (
                                <div className="mt-2 w-full flex gap-1">
                                    <input type="text" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder="e.g. Add green glasses" className="flex-1 text-xs px-2 py-1 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" onKeyDown={(e) => { if (e.key === 'Enter' && editPrompt.trim()) { onRefinePortrait(i, editPrompt.trim()); setEditIdx(null); setEditPrompt(''); }}}/>
                                    <button onClick={() => { if (editPrompt.trim()) { onRefinePortrait(i, editPrompt.trim()); setEditIdx(null); setEditPrompt(''); }}} className="text-xs px-2 py-1 bg-violet-500 text-white rounded-lg font-bold hover:bg-violet-600">✓</button>
                                    <button onClick={() => { setEditIdx(null); setEditPrompt(''); }} className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-300">✗</button>
                                </div>
                            ) : char.portrait && (
                                <button onClick={() => setEditIdx(i)} className="mt-2 text-xs px-3 py-1 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-all font-medium border border-slate-200">
                                    ✏️ Refine
                                </button>
                            )}
                        </div>
                    ))}
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
});
"""

# Insert CastLobby component before the ImmersiveToolbar component definition
old_immersive_toolbar = "const ImmersiveToolbar = React.memo(({ settings, setSettings, onClose"
idx_toolbar = content.find(old_immersive_toolbar)
if idx_toolbar > 0:
    content = content[:idx_toolbar] + cast_lobby + content[idx_toolbar:]
    fixes += 1
    print("5. Added CastLobby component definition")
else:
    print("5. SKIP - ImmersiveToolbar not found for insertion point")

# 6. Render CastLobby in the adventure view
# Find where the adventure active state renders and add CastLobby
# Look for isReviewingCharacters usage or add rendering near the adventure scene
old_adventure_render = "                {activeView === 'adventure' && adventureState.currentScene && !showNewGameSetup && ("

# If not found, try alternative
if old_adventure_render not in content:
    # Search more broadly
    import re
    match = re.search(r"activeView === 'adventure' && adventureState\.currentScene && !showNewGameSetup", content)
    if match:
        old_adventure_render = content[match.start():match.end()]
        print(f"  Found adventure render at: {old_adventure_render[:80]}...")

if old_adventure_render in content:
    new_adventure_render = """                {adventureState.isReviewingCharacters && adventureState.characters.length > 0 && (
                    <CastLobby
                        characters={adventureState.characters}
                        t={t}
                        onUpdateCharacter={(idx, updates) => {
                            setAdventureState(prev => {
                                const chars = [...prev.characters];
                                chars[idx] = { ...chars[idx], ...updates };
                                return { ...prev, characters: chars };
                            });
                        }}
                        onGeneratePortrait={async (idx) => {
                            const char = adventureState.characters[idx];
                            setAdventureState(prev => {
                                const chars = [...prev.characters];
                                chars[idx] = { ...chars[idx], isGenerating: true };
                                return { ...prev, characters: chars };
                            });
                            try {
                                const prompt = `Character portrait: ${char.name}, ${char.role}. ${char.appearance || 'fantasy character'}. Bust portrait, centered face, soft lighting, detailed, no text, no labels. Digital painting style.`;
                                const url = await callImagen(prompt, 400, 0.85);
                                setAdventureState(prev => {
                                    const chars = [...prev.characters];
                                    chars[idx] = { ...chars[idx], portrait: url, isGenerating: false };
                                    return { ...prev, characters: chars };
                                });
                            } catch (e) {
                                warnLog("Portrait gen failed:", e);
                                setAdventureState(prev => {
                                    const chars = [...prev.characters];
                                    chars[idx] = { ...chars[idx], isGenerating: false };
                                    return { ...prev, characters: chars };
                                });
                            }
                        }}
                        onRefinePortrait={async (idx, editText) => {
                            const char = adventureState.characters[idx];
                            setAdventureState(prev => {
                                const chars = [...prev.characters];
                                chars[idx] = { ...chars[idx], isGenerating: true };
                                return { ...prev, characters: chars };
                            });
                            try {
                                if (char.portrait) {
                                    const rawBase64 = char.portrait.split(',')[1];
                                    const refined = await callGeminiImageEdit(`Modify this character portrait: ${editText}. Keep the character recognizable. No text.`, rawBase64, 400, 0.85);
                                    const newAppearance = (char.appearance || '') + ', ' + editText;
                                    setAdventureState(prev => {
                                        const chars = [...prev.characters];
                                        chars[idx] = { ...chars[idx], portrait: refined || char.portrait, appearance: newAppearance, isGenerating: false };
                                        return { ...prev, characters: chars };
                                    });
                                }
                            } catch (e) {
                                warnLog("Portrait refine failed:", e);
                                const newAppearance = (char.appearance || '') + ', ' + editText;
                                setAdventureState(prev => {
                                    const chars = [...prev.characters];
                                    chars[idx] = { ...chars[idx], appearance: newAppearance, isGenerating: false };
                                    return { ...prev, characters: chars };
                                });
                            }
                        }}
                        onConfirm={() => {
                            setAdventureState(prev => ({ ...prev, isReviewingCharacters: false, isImageLoading: true }));
                            generateAdventureImage(adventureState.currentScene.text, 1);
                        }}
                    />
                )}
                """ + old_adventure_render
    content = content.replace(old_adventure_render, new_adventure_render, 1)
    fixes += 1
    print("6. Added CastLobby rendering in adventure view")
else:
    print("6. SKIP - adventure render pattern not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nApplied {fixes} changes")
