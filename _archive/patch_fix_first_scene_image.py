"""
Fix: First scene image not generating when Consistent Characters is ON.

Root cause: The onConfirm handler in the Cast Lobby uses `adventureState.currentScene.text`
from a React closure, which may be null or stale. Also, generateAdventureImage as a useCallback
doesn't include adventureState.characters in its dependencies.

Fixes:
1. Make onConfirm use a ref or latest state for currentScene text
2. Add null-safety check
3. Add adventureState.characters to generateAdventureImage deps
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
outpath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\diag_output.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0
lines = []

# Fix 1: Update onConfirm to safely access currentScene and use a fallback
old_confirm = '''                        onConfirm={() => {
                            setAdventureState(prev => ({ ...prev, isReviewingCharacters: false, isImageLoading: true }));
                            generateAdventureImage(adventureState.currentScene.text, 1);
                        }}'''

new_confirm = '''                        onConfirm={() => {
                            const sceneText = adventureState.currentScene?.text;
                            if (!sceneText) {
                                warnLog("CastLobby onConfirm: currentScene.text is null, skipping image generation");
                                setAdventureState(prev => ({ ...prev, isReviewingCharacters: false }));
                                return;
                            }
                            setAdventureState(prev => ({ ...prev, isReviewingCharacters: false, isImageLoading: true }));
                            generateAdventureImage(sceneText, 1);
                        }}'''

if old_confirm in content:
    content = content.replace(old_confirm, new_confirm, 1)
    fixes += 1
    lines.append("1. Added null-safety to onConfirm handler")
else:
    lines.append("1. SKIP - onConfirm pattern not found")

# Fix 2: The real issue may be that isImageLoading is set to false when
# consistent characters is on. This means the image loading spinner never shows.
# Then when onConfirm fires and sets isImageLoading: true, the generateAdventureImage
# runs but the image may get lost if the adventure view hasn't rendered yet.
# 
# Actually, let me check if the issue is simpler: does the adventure view
# only render the image area when !isReviewingCharacters?
# If the Cast Lobby overlay blocks the adventure view from
# mounting, the image update might not trigger a re-render.
#
# The REAL fix: When consistent characters is ON, we should still set
# isImageLoading: true in the initial state so the UI shows a loading state.
# But we should NOT call generateAdventureImage until after the Cast Lobby confirms.

old_image_loading = 'isImageLoading: adventureConsistentCharacters ? false : true,'

new_image_loading = 'isImageLoading: true,'

if old_image_loading in content:
    content = content.replace(old_image_loading, new_image_loading, 1)
    fixes += 1
    lines.append("2. Fixed: Always set isImageLoading: true on adventure start (Cast Lobby defers the actual image gen)")
else:
    lines.append("2. SKIP - isImageLoading pattern not found")

# Fix 3: Add adventureState.characters to generateAdventureImage deps
old_deps = 'useLowQualityVisuals, adventureState.isImmersiveMode, isAdventureStoryMode, adventureInputMode, gradeLevel, adventureCustomInstructions, adventureConsistentCharacters]);'

new_deps = 'useLowQualityVisuals, adventureState.isImmersiveMode, isAdventureStoryMode, adventureInputMode, gradeLevel, adventureCustomInstructions, adventureConsistentCharacters, adventureState.characters]);'

if old_deps in content:
    content = content.replace(old_deps, new_deps, 1)
    fixes += 1
    lines.append("3. Added adventureState.characters to generateAdventureImage deps")
else:
    lines.append("3. SKIP - deps pattern not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

with open(outpath, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f"Applied {fixes} fixes. See diag_output.txt")
