"""
Fix Cast Lobby: 
1. Add fallback character extraction when Gemini doesn't return characters array
2. Add save image button to CastLobby portraits
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# === Fix 1: Replace the sceneCharacters line with a robust fallback ===
# When Gemini doesn't return characters, extract character names from the scene text
old_scene_chars = """      const sceneCharacters = (adventureConsistentCharacters && Array.isArray(sceneData.characters)) ? sceneData.characters.map(c => ({ ...c, portrait: null, isGenerating: false })) : [];"""

new_scene_chars = """      let sceneCharacters = [];
      if (adventureConsistentCharacters) {
          if (Array.isArray(sceneData.characters) && sceneData.characters.length > 0) {
              sceneCharacters = sceneData.characters.map(c => ({ ...c, portrait: null, isGenerating: false }));
          } else {
              // Fallback: extract characters from scene text using name-like patterns
              const sceneText = sceneData.text || '';
              const nameMatches = sceneText.match(/(?:named?\s+|called\s+|meet\s+|,\s*)([A-Z][a-z]{2,}(?:\s[A-Z][a-z]+)?)/g) || [];
              const roleMatches = sceneText.match(/(?:the\s+)((?:wise|old|young|brave|mighty|clever|kind|ancient|mysterious)\s+[a-z]+)/gi) || [];
              const extracted = new Set();
              nameMatches.forEach(m => {
                  const name = m.replace(/^(?:named?\s+|called\s+|meet\s+|,\s*)/i, '').trim();
                  if (name.length > 2 && name.length < 30) extracted.add(name);
              });
              roleMatches.forEach(m => {
                  const role = m.replace(/^the\s+/i, '').trim();
                  if (role.length > 3) extracted.add(role);
              });
              // Also try to find "You are [X]" pattern common in adventure scenes
              const youAreMatch = sceneText.match(/You are (?:a |an |the )?([A-Za-z\s]+?)(?:\.|,|!|\band\b)/i);
              if (youAreMatch) {
                  const protagonist = youAreMatch[1].trim();
                  if (protagonist.length > 2 && protagonist.length < 40) {
                      sceneCharacters.push({ name: 'Protagonist', role: protagonist, appearance: protagonist, portrait: null, isGenerating: false });
                  }
              }
              extracted.forEach(name => {
                  sceneCharacters.push({ name, role: 'Character', appearance: name, portrait: null, isGenerating: false });
              });
              // If we still found nothing, create a generic protagonist
              if (sceneCharacters.length === 0) {
                  const gradeMap = {
                      'Kindergarten': '5 year old child', '1st Grade': '6 year old child', '2nd Grade': '7 year old child',
                      '3rd Grade': '8 year old child', '4th Grade': '9 year old child', '5th Grade': '10 year old child',
                      '6th Grade': '11 year old child', '7th Grade': '12 year old child', '8th Grade': '13 year old teen',
                  };
                  const ageDesc = gradeMap[gradeLevel] || 'young student';
                  sceneCharacters.push({ name: 'Your Character', role: 'Protagonist', appearance: `A friendly ${ageDesc}, the main character of this adventure`, portrait: null, isGenerating: false });
              }
          }
      }"""

if old_scene_chars in content:
    content = content.replace(old_scene_chars, new_scene_chars, 1)
    fixes += 1
    print("1: Added robust character extraction fallback")
else:
    print("1: SKIP - sceneCharacters pattern not found")

# === Fix 2: Add save image button to CastLobby portraits ===
# Replace the CastLobby component to include a save/download button on portraits
old_refine_button = """                            {editIdx === i ? (
                                <div className="mt-2 w-full flex gap-1">
                                    <input type="text" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder="e.g. Add green glasses" className="flex-1 text-xs px-2 py-1 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" onKeyDown={(e) => { if (e.key === 'Enter' && editPrompt.trim()) { onRefinePortrait(i, editPrompt.trim()); setEditIdx(null); setEditPrompt(''); }}}/>
                                    <button onClick={() => { if (editPrompt.trim()) { onRefinePortrait(i, editPrompt.trim()); setEditIdx(null); setEditPrompt(''); }}} className="text-xs px-2 py-1 bg-violet-500 text-white rounded-lg font-bold hover:bg-violet-600">✓</button>
                                    <button onClick={() => { setEditIdx(null); setEditPrompt(''); }} className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-300">✗</button>
                                </div>
                            ) : char.portrait && (
                                <button onClick={() => setEditIdx(i)} className="mt-2 text-xs px-3 py-1 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-all font-medium border border-slate-200">
                                    ✏️ Refine
                                </button>
                            )}"""

new_refine_button = """                            {editIdx === i ? (
                                <div className="mt-2 w-full flex gap-1">
                                    <input type="text" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder="e.g. Add green glasses" className="flex-1 text-xs px-2 py-1 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" onKeyDown={(e) => { if (e.key === 'Enter' && editPrompt.trim()) { onRefinePortrait(i, editPrompt.trim()); setEditIdx(null); setEditPrompt(''); }}}/>
                                    <button onClick={() => { if (editPrompt.trim()) { onRefinePortrait(i, editPrompt.trim()); setEditIdx(null); setEditPrompt(''); }}} className="text-xs px-2 py-1 bg-violet-500 text-white rounded-lg font-bold hover:bg-violet-600">✓</button>
                                    <button onClick={() => { setEditIdx(null); setEditPrompt(''); }} className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-300">✗</button>
                                </div>
                            ) : char.portrait && (
                                <div className="mt-2 flex gap-1.5">
                                    <button onClick={() => setEditIdx(i)} className="text-xs px-3 py-1 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-all font-medium border border-slate-200">
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
                                </div>
                            )}"""

if old_refine_button in content:
    content = content.replace(old_refine_button, new_refine_button, 1)
    fixes += 1
    print("2: Added save image button to CastLobby portraits")
else:
    print("2: SKIP - refine button pattern not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal fixes applied: {fixes}")
