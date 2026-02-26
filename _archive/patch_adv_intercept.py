import re

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject generateCharacterPortraits right before handleStartAdventure
pattern_func = r"(const handleStartAdventure = \(\) => \{)"
func_injection = """  const generateCharacterPortraits = async (characters) => {
      for (let i = 0; i < characters.length; i++) {
          const char = characters[i];
          try {
              const imagePrompt = `A high quality, consistent character portrait of ${char.name}. ${char.role}. Centered, detailed face, neutral background.`;
              const b64 = await callImagen(imagePrompt, '1:1');
              setAdventureState(prev => {
                  const newChars = [...(prev.characters || [])];
                  if (newChars[i]) {
                      newChars[i].referenceImageBase64 = b64 ? `data:image/jpeg;base64,${b64}` : null;
                      newChars[i].isGenerating = false;
                  }
                  return { ...prev, characters: newChars };
              });
          } catch (e) {
              console.error("Failed to generate portrait for", char.name, e);
              setAdventureState(prev => {
                  const newChars = [...(prev.characters || [])];
                  if (newChars[i]) {
                      newChars[i].isGenerating = false;
                  }
                  return { ...prev, characters: newChars };
              });
          }
      }
  };
  
  """
content, c1 = re.subn(pattern_func, func_injection + r"\1", content)

# 2. Intercept executeStartAdventure
pattern_intercept = r"(setGeneratedContent\(newAdventureItem\);\s*)(setGenerationStep\('Rendering scene visual\.\.\.'\);\s*generateAdventureImage\(sceneData\.text, 1\);)"
intercept_injection = r"""\1if (adventureConsistentCharacters && sceneData.characters && sceneData.characters.length > 0) {
          setGenerationStep('Casting characters...');
          setAdventureState(prev => ({
              ...prev,
              characters: sceneData.characters.map((c, idx) => ({
                  id: 'char_' + Date.now() + '_' + idx,
                  name: c.name,
                  role: c.role,
                  referenceImageBase64: null,
                  isGenerating: true
              }))
          }));
          setIsReviewingCharacters(true);
          generateCharacterPortraits(sceneData.characters);
      } else {
          \2
      }"""
content, c2 = re.subn(pattern_intercept, intercept_injection, content)

# 3. Add `characters: []` to ADV_INITIAL_STATE just to be safe so it's cleared on reset
pattern_state = r"(isReviewingCharacters: false,)"
content, c3 = re.subn(pattern_state, r"\1\n  characters: [],", content)

print(f"Replacements: generateCharacterPortraits({c1}), Intercept({c2}), StateInit({c3})")

if c1 > 0 and c2 > 0:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ Adventure flow successfully intercepted for Nano Banana Cast Lobby!")
else:
    print("❌ Failed to patch Adventure flow.")
