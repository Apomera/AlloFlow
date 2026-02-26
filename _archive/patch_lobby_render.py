filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line with {activeView === 'adventure' && (
target_line = None
for i, line in enumerate(lines):
    if "{activeView === 'adventure' && (" in line and i > 60000:
        target_line = i
        print(f"Found adventure render at line {i+1}: {line.rstrip()[:80]}")
        break

if target_line is None:
    print("Could not find adventure render line")
    exit()

# Get the indentation of the target line
indent = '                '  # 16 spaces, matching the pattern

# Build the CastLobby block
lobby_lines = [
    f'{indent}{{adventureState.isReviewingCharacters && adventureState.characters.length > 0 && (\n',
    f'{indent}    <CastLobby\n',
    f'{indent}        characters={{adventureState.characters}}\n',
    f'{indent}        t={{t}}\n',
    f'{indent}        onUpdateCharacter={{(idx, updates) => {{\n',
    f'{indent}            setAdventureState(prev => {{\n',
    f'{indent}                const chars = [...prev.characters];\n',
    f'{indent}                chars[idx] = {{ ...chars[idx], ...updates }};\n',
    f'{indent}                return {{ ...prev, characters: chars }};\n',
    f'{indent}            }});\n',
    f'{indent}        }}}}\n',
    f'{indent}        onGeneratePortrait={{async (idx) => {{\n',
    f'{indent}            const char = adventureState.characters[idx];\n',
    f'{indent}            setAdventureState(prev => {{ const chars = [...prev.characters]; chars[idx] = {{ ...chars[idx], isGenerating: true }}; return {{ ...prev, characters: chars }}; }});\n',
    f'{indent}            try {{\n',
    f'{indent}                const prompt = `Character portrait: ${{char.name}}, ${{char.role}}. ${{char.appearance || \'fantasy character\'}}. Bust portrait, centered face, soft lighting, detailed, no text, no labels. Digital painting style.`;\n',
    f'{indent}                const url = await callImagen(prompt, 400, 0.85);\n',
    f'{indent}                setAdventureState(prev => {{ const chars = [...prev.characters]; chars[idx] = {{ ...chars[idx], portrait: url, isGenerating: false }}; return {{ ...prev, characters: chars }}; }});\n',
    f'{indent}            }} catch (e) {{\n',
    f'{indent}                warnLog("Portrait gen failed:", e);\n',
    f'{indent}                setAdventureState(prev => {{ const chars = [...prev.characters]; chars[idx] = {{ ...chars[idx], isGenerating: false }}; return {{ ...prev, characters: chars }}; }});\n',
    f'{indent}            }}\n',
    f'{indent}        }}}}\n',
    f'{indent}        onRefinePortrait={{async (idx, editText) => {{\n',
    f'{indent}            const char = adventureState.characters[idx];\n',
    f'{indent}            setAdventureState(prev => {{ const chars = [...prev.characters]; chars[idx] = {{ ...chars[idx], isGenerating: true }}; return {{ ...prev, characters: chars }}; }});\n',
    f'{indent}            try {{\n',
    f'{indent}                if (char.portrait) {{\n',
    f'{indent}                    const rawBase64 = char.portrait.split(\',\')[1];\n',
    f'{indent}                    const refined = await callGeminiImageEdit(`Modify this character portrait: ${{editText}}. Keep the character recognizable. No text.`, rawBase64, 400, 0.85);\n',
    f'{indent}                    const newAppearance = (char.appearance || \'\') + \', \' + editText;\n',
    f'{indent}                    setAdventureState(prev => {{ const chars = [...prev.characters]; chars[idx] = {{ ...chars[idx], portrait: refined || char.portrait, appearance: newAppearance, isGenerating: false }}; return {{ ...prev, characters: chars }}; }});\n',
    f'{indent}                }}\n',
    f'{indent}            }} catch (e) {{\n',
    f'{indent}                warnLog("Portrait refine failed:", e);\n',
    f'{indent}                const newAppearance = (char.appearance || \'\') + \', \' + editText;\n',
    f'{indent}                setAdventureState(prev => {{ const chars = [...prev.characters]; chars[idx] = {{ ...chars[idx], appearance: newAppearance, isGenerating: false }}; return {{ ...prev, characters: chars }}; }});\n',
    f'{indent}            }}\n',
    f'{indent}        }}}}\n',
    f'{indent}        onConfirm={{() => {{\n',
    f'{indent}            setAdventureState(prev => ({{ ...prev, isReviewingCharacters: false, isImageLoading: true }}));\n',
    f'{indent}            generateAdventureImage(adventureState.currentScene.text, 1);\n',
    f'{indent}        }}}}\n',
    f'{indent}    />\n',
    f'{indent})}}\n',
]

# Insert before the target line
for j, lobby_line in enumerate(lobby_lines):
    lines.insert(target_line + j, lobby_line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"Inserted {len(lobby_lines)} lines of CastLobby rendering before line {target_line+1}")
