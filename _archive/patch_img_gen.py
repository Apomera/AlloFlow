import re

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update handleRefineCharacter to save the modificationPrompt
pattern_refine = r"(newChars\[charIdx\]\.referenceImageBase64 = `data:image/jpeg;base64,\$\{newB64\}`;)"
replacement_refine = r"\1\n                  newChars[charIdx].role = newChars[charIdx].role + ', ' + modificationPrompt;"
content, c1 = re.subn(pattern_refine, replacement_refine, content)

# 2. Update generateAdventureImage to use the explicit character templates
pattern_gen = r"(const storedAppearance = adventureState\.characterAppearance;\s*if\s*\(storedAppearance\)\s*\{\s*characterContext = `Main character: \$\{storedAppearance\}\. `;\s*\})"
replacement_gen = r"""if (adventureState.characters && adventureState.characters.length > 0) {
                 const descriptors = adventureState.characters.map(c => `${c.name}: ${c.role}`).join(' | ');
                 characterContext = `Characters in scene: ${descriptors}. `;
             } else \1"""
content, c2 = re.subn(pattern_gen, replacement_gen, content)

print(f"Replacements: RefineTextAppend({c1}), GeneratorPrompt({c2})")

if c1 > 0 and c2 > 0:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ Successfully wired Character profiles to the Scene Generator.")
else:
    print("❌ Failed to wire profiles to the generator.")
