"""
Fix 4 outstanding UI bugs in AlloFlowANTI.txt:
1. Sound Sort z-index: overlay behind grid
2. Sound Sort duplicate speaker: remove renderPrompt() from sound_sort case
3. Word Families/Sound Sort not in PHONO_ORDER progression
4. Rhyme Time: add renderPrompt() before RhymeView
(Bug 5 - localization keys - already fixed in previous session)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')
changes = 0

# ================================================================
# FIX 1: Sound Sort z-index — overlay behind found-words grid
# The found-words grid has z-10, overlay needs z-20
# ================================================================
old_overlay = '<div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm animate-in fade-in">'
new_overlay = '<div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm animate-in fade-in z-20">'
if old_overlay in content:
    content = content.replace(old_overlay, new_overlay)
    changes += 1
    print("1. ✅ Added z-20 to Sound Sort completion overlay")
else:
    print("1. ❌ Overlay pattern not found")

# ================================================================
# FIX 2: Sound Sort duplicate speaker — remove renderPrompt()
# In the sound_sort case, renderPrompt() is called before WordFamiliesView
# But WordFamiliesView already has its own speaker
# ================================================================
old_sound_sort_prompt = """                    <div className="space-y-4">
                    {renderPrompt()}
                    <WordFamiliesView """
new_sound_sort_prompt = """                    <div className="space-y-4">
                    <WordFamiliesView """
if old_sound_sort_prompt in content:
    content = content.replace(old_sound_sort_prompt, new_sound_sort_prompt)
    changes += 1
    print("2. ✅ Removed duplicate renderPrompt() from sound_sort case")
else:
    print("2. ❌ Sound sort renderPrompt pattern not found")

# ================================================================
# FIX 3: PHONO_ORDER missing word_families and sound_sort
# They're not in the adaptive director progression chain
# ================================================================
old_phono_order = "const PHONO_ORDER = ['counting', 'isolation', 'blending', 'segmentation', 'rhyming'];"
new_phono_order = "const PHONO_ORDER = ['counting', 'isolation', 'blending', 'segmentation', 'rhyming', 'word_families', 'sound_sort'];"
if old_phono_order in content:
    content = content.replace(old_phono_order, new_phono_order)
    changes += 1
    print("3. ✅ Added word_families and sound_sort to PHONO_ORDER")
else:
    print("3. ❌ PHONO_ORDER pattern not found")

# ================================================================
# FIX 4: Rhyme Time — add renderPrompt() before RhymeView
# The rhyming case doesn't call renderPrompt() so no image shows
# ================================================================
old_rhyme_return = """                  return (
                      <div className="flex flex-col gap-4">
                        <RhymeView"""
new_rhyme_return = """                  return (
                      <div className="flex flex-col gap-4">
                        {renderPrompt()}
                        <RhymeView"""
if old_rhyme_return in content:
    content = content.replace(old_rhyme_return, new_rhyme_return)
    changes += 1
    print("4. ✅ Added renderPrompt() before RhymeView in rhyming case")
else:
    print("4. ❌ Rhyme return pattern not found")

# Save
content = content.replace('\n', '\r\n')
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"\nTotal changes: {changes}/4")
