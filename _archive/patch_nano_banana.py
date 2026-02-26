"""
Nano Banana Character Consistency Feature - Phase A + D
Implements: State, prompt injection, cast lobby, save persistence.
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# ===== A1: Add state to ADV_INITIAL_STATE =====
old_adv_state = """  hintHistory: [],
};"""

new_adv_state = """  hintHistory: [],
  characters: [],
  isReviewingCharacters: false,
  adventureConsistentCharacters: false,
};"""

if old_adv_state in content:
    content = content.replace(old_adv_state, new_adv_state, 1)
    fixes += 1
    print("A1: Added characters, isReviewingCharacters, adventureConsistentCharacters to ADV_INITIAL_STATE")
else:
    print("A1: SKIP - ADV_INITIAL_STATE pattern not found")

# ===== A2: Add adventureConsistentCharacters to the advReducer destructure =====
# The advReducer is simple (SET/RESET/MULTI_SET), so characters auto-works via ADV_SET

# ===== D1: Inject character descriptors into generateAdventureImage =====
# After the main character context is built (~line 43994), inject NPC descriptors
old_char_context = """              characterContext = `Main character: ${generatedAppearance}. `;
              }
           }
           const isSocialMode"""

new_char_context = """              characterContext = `Main character: ${generatedAppearance}. `;
              }
           }
           if (adventureState.characters && adventureState.characters.length > 0) {
               const npcDescs = adventureState.characters.map(c => `${c.name}: ${c.appearance || c.role}`).join('. ');
               characterContext += `Other characters in scene: ${npcDescs}. `;
           }
           const isSocialMode"""

if old_char_context in content:
    content = content.replace(old_char_context, new_char_context, 1)
    fixes += 1
    print("D1: Injected character descriptors into generateAdventureImage")
else:
    print("D1: SKIP - characterContext pattern not found")

# ===== D2: Add characters to Gemini scene generation JSON schema =====
# Find the opening scene prompt and add characters to the JSON schema
# There are two prompts (debate mode and standard mode). Add to both.

# Standard mode prompt - add characters after "voices"
old_voices_schema = '''              "voices": { "Narrator": "Allo" },
              "soundParams": {
                  "atmosphere": "One of: Tense, Calm, Ethereal, Dark, Joyful",
                  "element": "One of: Fire, Water, Wind, Machinery, Nature, Silence"
              }
            }
          `;'''

new_voices_schema = '''              "voices": { "Narrator": "Allo" },
              "soundParams": {
                  "atmosphere": "One of: Tense, Calm, Ethereal, Dark, Joyful",
                  "element": "One of: Fire, Water, Wind, Machinery, Nature, Silence"
              }${adventureConsistentCharacters ? `,
              "characters": [{"name": "Character Name", "role": "Their role in the story", "appearance": "Brief visual description: hair color, clothing, distinguishing features"}]` : ''}
            }
          `;'''

if old_voices_schema in content:
    content = content.replace(old_voices_schema, new_voices_schema, 1)
    fixes += 1
    print("D2: Added characters to standard scene JSON schema")
else:
    print("D2: SKIP - standard voices schema not found")

# Debate mode prompt - similar
old_debate_schema = '''              "voices": { "Advisor/System Voice": "VoiceName" },
              "soundParams": {
                  "atmosphere": "One of: Tense, Calm, Ethereal, Dark, Joyful",
                  "element": "One of: Fire, Water, Wind, Machinery, Nature, Silence"
              }
            }
          `;'''

new_debate_schema = '''              "voices": { "Advisor/System Voice": "VoiceName" },
              "soundParams": {
                  "atmosphere": "One of: Tense, Calm, Ethereal, Dark, Joyful",
                  "element": "One of: Fire, Water, Wind, Machinery, Nature, Silence"
              }${adventureConsistentCharacters ? `,
              "characters": [{"name": "Character Name", "role": "Their role", "appearance": "Brief visual description"}]` : ''}
            }
          `;'''

if old_debate_schema in content:
    content = content.replace(old_debate_schema, new_debate_schema, 1)
    fixes += 1
    print("D2b: Added characters to debate scene JSON schema")
else:
    print("D2b: SKIP - debate voices schema not found")

# ===== B1: Cast Lobby Interceptor - modify adventure start flow =====
# After sceneData is processed and state is set, if consistent characters is on, 
# store characters and gate into lobby instead of proceeding directly
old_start_flow = """      setAdventureState(prev => ({
        ...prev,
        history: [],
        currentScene: sceneData,
        isLoading: false,
        isGameOver: false,
        turnCount: 1,
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        sceneImage: null,
        isImageLoading: true,
        inventory: [...prev.inventory, ...initialInventory],
        systemResources: initialSystemResources,
        voiceMap: sceneData.voices || {},
      }));"""

new_start_flow = """      const sceneCharacters = (adventureConsistentCharacters && Array.isArray(sceneData.characters)) ? sceneData.characters.map(c => ({ ...c, portrait: null, isGenerating: false })) : [];
      setAdventureState(prev => ({
        ...prev,
        history: [],
        currentScene: sceneData,
        isLoading: false,
        isGameOver: false,
        turnCount: 1,
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        sceneImage: null,
        isImageLoading: adventureConsistentCharacters ? false : true,
        inventory: [...prev.inventory, ...initialInventory],
        systemResources: initialSystemResources,
        voiceMap: sceneData.voices || {},
        characters: sceneCharacters,
        isReviewingCharacters: sceneCharacters.length > 0,
      }));"""

if old_start_flow in content:
    content = content.replace(old_start_flow, new_start_flow, 1)
    fixes += 1
    print("B1: Added Cast Lobby interceptor to adventure start flow")
else:
    print("B1: SKIP - start flow pattern not found")

# Also modify the image generation call - only call if NOT reviewing characters
old_img_call = """      generateAdventureImage(sceneData.text, 1);
      flyToElement('tour-tool-adventure');"""

new_img_call = """      if (!adventureConsistentCharacters || sceneCharacters.length === 0) {
          generateAdventureImage(sceneData.text, 1);
      }
      flyToElement('tour-tool-adventure');"""

if old_img_call in content:
    content = content.replace(old_img_call, new_img_call, 1)
    fixes += 1
    print("B1b: Deferred image generation when Cast Lobby is active")
else:
    print("B1b: SKIP - img call pattern not found")

# ===== E1: Strip portraits from save =====
old_save = """              const sanitizedState = { ...adventureState };
               sanitizedState.sceneImage = null;"""

new_save = """              const sanitizedState = { ...adventureState };
               sanitizedState.sceneImage = null;
               if (Array.isArray(sanitizedState.characters)) {
                   sanitizedState.characters = sanitizedState.characters.map(c => {
                       const { portrait, ...rest } = c;
                       return rest;
                   });
               }"""

# Check with different whitespace
if old_save in content:
    content = content.replace(old_save, new_save, 1)
    fixes += 1
    print("E1: Added portrait stripping to adventure save")
else:
    # Try alternative whitespace
    alt_save1 = "const sanitizedState = { ...adventureState };\n              sanitizedState.sceneImage = null;"
    alt_save2 = "const sanitizedState = { ...adventureState };\r\n              sanitizedState.sceneImage = null;"
    if alt_save2 in content:
        content = content.replace(alt_save2, alt_save2 + """
              if (Array.isArray(sanitizedState.characters)) {
                  sanitizedState.characters = sanitizedState.characters.map(c => {
                      const { portrait, ...rest } = c;
                      return rest;
                  });
              }""", 1)
        fixes += 1
        print("E1: Added portrait stripping (alt whitespace)")
    else:
        print("E1: SKIP - save pattern not found, will try manually")

# ===== E2: Resume hydration - characters already in state, just need safe default =====
old_resume = "              climax: parsed.climax || { isActive: false, archetype: 'Auto', masteryScore: 0, attempts: 0 }"
new_resume = """              climax: parsed.climax || { isActive: false, archetype: 'Auto', masteryScore: 0, attempts: 0 },
              characters: parsed.characters || [],
              isReviewingCharacters: false"""

if old_resume in content:
    content = content.replace(old_resume, new_resume, 1)
    fixes += 1
    print("E2: Added characters to resume hydration")
else:
    print("E2: SKIP - resume pattern not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nApplied {fixes} changes")
