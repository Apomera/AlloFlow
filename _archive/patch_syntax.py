import re

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1 & 2: Cannot use a declaration in a single-statement context
# `} else const storedAppearance = adventureState.characterAppearance;`
# -> `} else { const storedAppearance = adventureState.characterAppearance;` + add closing brace
pattern_appearance = r"(\}\s*else\s*)(const\s*storedAppearance\s*=\s*adventureState\.characterAppearance;\s*if\s*\(storedAppearance\)\s*\{\s*characterContext\s*=\s*`Main character: \$\{storedAppearance\}\. `;\s*\}\s*else\s*\{)"
replacement_appearance = r"\1{\n                 \2"

# We must close the added brace. The `} else {` block ends with setting characterContext in both cases.
# Actually, a simpler regex just matching the specific lines:
content = content.replace(
    "} else const storedAppearance = adventureState.characterAppearance;",
    "} else {\n                 const storedAppearance = adventureState.characterAppearance;"
)
# We need to add the closing brace after the `else` blocks that follow. Let's look at the structure.
# ...
#                  setAdventureState(prev => ({ ...prev, characterAppearance: generatedAppearance }));
#                  characterContext = `Main character: ${generatedAppearance}. `;
#              }
# We need to add an extra `}` there.
content = content.replace(
    "                 characterContext = `Main character: ${generatedAppearance}. `;\n             }\n          } else {",
    "                 characterContext = `Main character: ${generatedAppearance}. `;\n             }\n             }\n          } else {"
)
# And the second one:
content = content.replace(
    "                 const generatedAppearance = `${randomColor} ${creatureType} with ${randomFeature}`;\n                 setAdventureState(prev => ({ ...prev, characterAppearance: generatedAppearance }));\n                 characterContext = `Main character: ${generatedAppearance}. `;\n             }\n          }\n",
    "                 const generatedAppearance = `${randomColor} ${creatureType} with ${randomFeature}`;\n                 setAdventureState(prev => ({ ...prev, characterAppearance: generatedAppearance }));\n                 characterContext = `Main character: ${generatedAppearance}. `;\n             }\n             }\n          }\n"
)

# Fix 3: Expected "}" but found "&&"
# `) : ({hasSavedAdventure && !showNewGameSetup ? (` -> `) : (hasSavedAdventure && !showNewGameSetup ? (`
content = content.replace(
    ") : ({hasSavedAdventure && !showNewGameSetup ? (",
    ") : (hasSavedAdventure && !showNewGameSetup ? ("
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Syntax errors patched.")
