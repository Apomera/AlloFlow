"""
Comprehensive fix patch for all reported bugs:
1. Missing ]; at end of SOUND_MATCH_POOL (build error)
2. checkAnswer crash in word_families render case (1 arg instead of 2)
3. Raw localization strings (blending_replay_sounds, blending_instruction)
4. Dual speaker icons — remove smaller purple one, replace 'Listen' text with ear emoji
5. Add missing localization key declarations for blending strings
"""

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')
changes = 0

# ================================================================
# FIX 1: Missing ]; at end of SOUND_MATCH_POOL
# ================================================================
old_pool_end = "'spin', 'spot', 'step', 'stop', 'stub', 'stun', 'swim', 'trap', 'trim', 'trip', 'trot'\n\n// ================================================================"
new_pool_end = "'spin', 'spot', 'step', 'stop', 'stub', 'stun', 'swim', 'trap', 'trim', 'trip', 'trot'\n];\n\n// ================================================================"
if old_pool_end in content:
    content = content.replace(old_pool_end, new_pool_end)
    changes += 1
    print("1. Fixed missing ]; at end of SOUND_MATCH_POOL")
else:
    print("1. WARNING: SOUND_MATCH_POOL end pattern not found")

# ================================================================
# FIX 2: checkAnswer in word_families render — needs 2 args
# The current code has:
#   onCheckAnswer={(result) => checkAnswer(result === 'correct' ? currentWordSoundsWord : null)}
# This calls checkAnswer with 1 arg. It should be:
#   onCheckAnswer={(result) => checkAnswer(result === 'correct' ? currentWordSoundsWord : null, currentWordSoundsWord)}
# ================================================================
old_check = "onCheckAnswer={(result) => checkAnswer(result === 'correct' ? currentWordSoundsWord : null)}"
new_check = "onCheckAnswer={(result) => checkAnswer(result === 'correct' ? currentWordSoundsWord : null, currentWordSoundsWord)}"
count = content.count(old_check)
if count > 0:
    content = content.replace(old_check, new_check)
    changes += 1
    print(f"2. Fixed checkAnswer to pass 2 args (found {count} occurrences)")
else:
    print("2. WARNING: checkAnswer pattern not found")

# ================================================================
# FIX 3: Replace 'Listen' text with ear emoji for pre-readers
# Change: '🔊 Listen' -> just ear icon
# And remove the duplicate small Volume2 icon next to it
# ================================================================
old_listen = "{(getEffectiveTextMode() === 'alwaysOn' || showWordText) ? currentWordSoundsWord : '\U0001f50a Listen'}\n                    {isPlayingAudio ? (\n                        <div className=\"animate-spin h-6 w-6 border-2 border-current border-t-transparent rounded-full\" />\n                    ) : (\n                        <Volume2 size={24} className=\"text-violet-400\" />\n                    )}"
new_listen = "{(getEffectiveTextMode() === 'alwaysOn' || showWordText) ? currentWordSoundsWord : ''}\n                    {isPlayingAudio ? (\n                        <div className=\"animate-spin h-6 w-6 border-2 border-current border-t-transparent rounded-full\" />\n                    ) : (\n                        <Ear size={28} className=\"text-violet-400\" />\n                    )}"
if old_listen in content:
    content = content.replace(old_listen, new_listen)
    changes += 1
    print("3. Replaced 'Listen' text with Ear icon, removed duplicate Volume2")
else:
    print("3. WARNING: Listen pattern not found")

# ================================================================
# FIX 4: Add missing localization keys for blending strings
# ================================================================
# Add after the existing blending_desc key
anchor_key = "'word_sounds.blending_desc': 'Listen to sounds and blend them into a word',"
new_keys = "'word_sounds.blending_desc': 'Listen to sounds and blend them into a word',\n    'word_sounds.blending_replay_sounds': '\U0001f50a Replay Sounds',\n    'word_sounds.blending_instruction': 'Listen to the sounds, then pick the word!',"
if anchor_key in content:
    content = content.replace(anchor_key, new_keys, 1)
    changes += 1
    print("4. Added missing localization keys for blending strings")
else:
    print("4. WARNING: blending_desc anchor not found")

# ================================================================
# FIX 5: Fix the 🔊 Listen overlay on image too
# Line 3840: "🔊 Listen" on the image overlay
# ================================================================
old_img_listen = "🔊 Listen</div>"
new_img_listen = "👂</div>"
if old_img_listen in content:
    content = content.replace(old_img_listen, new_img_listen, 1)
    changes += 1
    print("5. Replaced image overlay '🔊 Listen' with ear emoji")

# ================================================================
# Save
# ================================================================
content = content.replace('\n', '\r\n')
print(f"\nTotal fixes: {changes}")
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"Saved ({len(content)} chars)")
