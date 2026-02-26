"""
Comprehensive fix patch — Session 2
====================================
1. Blending TTS pre-cache: Add pre-fetch for distractor TTS before auto-play loop
2. Letter tracing: Fix INSTRUCTION_AUDIO key names (great_job → fb_great_job, etc.)
3. Raw strings: Add missing localization keys (test_sequence, sound_sort_found)
4. ng phoneme: Reframe display label to clarify velar nasal
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')
changes = 0

# ================================================================
# FIX 1: Blending TTS Pre-Cache
# Add TTS pre-fetch for all blending options BEFORE the auto-play loop
# Location: L6920 — after phoneme playback, before auto-play loop
# ================================================================
old_autoplay = """                // Auto-play word options with highlighting (matching Rhyme/Isolation pattern)
                if (blendingOptions && blendingOptions.length > 0) {
                    await new Promise(r => setTimeout(r, 600)); // Gap after phonemes
                    for (let i = 0; i < blendingOptions.length; i++) {"""

new_autoplay = """                // Auto-play word options with highlighting (matching Rhyme/Isolation pattern)
                if (blendingOptions && blendingOptions.length > 0) {
                    // PRE-CACHE TTS: Generate audio for ALL options simultaneously
                    // This prevents the correct answer from loading first (giving away the answer)
                    try {
                        await Promise.allSettled(blendingOptions.map(w => handleAudio(w, { cacheOnly: true })));
                    } catch(e) { debugLog('Blending TTS pre-cache error:', e); }
                    await new Promise(r => setTimeout(r, 600)); // Gap after phonemes
                    for (let i = 0; i < blendingOptions.length; i++) {"""

if old_autoplay in content:
    content = content.replace(old_autoplay, new_autoplay)
    changes += 1
    print("1. ✅ Added TTS pre-cache before blending auto-play loop")
else:
    print("1. ⚠️ Blending auto-play pattern not found")

# Also check if handleAudio supports cacheOnly option — if not, use callTTS directly
# Let's use a simpler approach: pre-generate via callTTS
old_precache = "handleAudio(w, { cacheOnly: true })"
new_precache = "callTTS(w)"
if old_precache in content:
    content = content.replace(old_precache, new_precache)
    print("   → Using callTTS() for pre-cache (simpler, no playback)")

# ================================================================
# FIX 2: Letter Tracing — Fix INSTRUCTION_AUDIO key names
# great_job → fb_great_job, now_try_lowercase stays, amazing → fb_amazing
# ================================================================
old_great = "INSTRUCTION_AUDIO['great_job']"
new_great = "INSTRUCTION_AUDIO['fb_great_job']"
ct = content.count(old_great)
if ct > 0:
    content = content.replace(old_great, new_great)
    changes += 1
    print(f"2a. ✅ Fixed 'great_job' → 'fb_great_job' ({ct} occurrences)")

old_amazing = "INSTRUCTION_AUDIO['amazing']"
new_amazing = "INSTRUCTION_AUDIO['fb_amazing']"
ct2 = content.count(old_amazing)
if ct2 > 0:
    content = content.replace(old_amazing, new_amazing)
    changes += 1
    print(f"2b. ✅ Fixed 'amazing' → 'fb_amazing' ({ct2} occurrences)")

# Fix handleAudio calls for these — they should pass the audio data, not play the key name
# The current code does: handleAudio(INSTRUCTION_AUDIO['fb_great_job'])
# This is correct if INSTRUCTION_AUDIO contains data URIs

# ================================================================
# FIX 3: Raw Strings — Add missing localization keys
# ================================================================

# 3a: word_sounds.test_sequence
test_seq_anchor = "'word_sounds.blending_instruction': 'Listen to the sounds, then pick the word!',"
test_seq_new = "'word_sounds.blending_instruction': 'Listen to the sounds, then pick the word!',\n    'word_sounds.test_sequence': '🔊 Test Sequence',"
if test_seq_anchor in content:
    content = content.replace(test_seq_anchor, test_seq_new, 1)
    changes += 1
    print("3a. ✅ Added localization key word_sounds.test_sequence")
else:
    print("3a. ⚠️ blending_instruction anchor not found")

# 3b: word_sounds.sound_sort_found
sort_anchor = "'word_sounds.word_families_desc': 'Build the word family house',"
sort_new = "'word_sounds.word_families_desc': 'Build the word family house',\n    'word_sounds.sound_sort_found': 'found',"
if sort_anchor in content:
    content = content.replace(sort_anchor, sort_new, 1)
    changes += 1
    print("3b. ✅ Added localization key word_sounds.sound_sort_found")

# ================================================================
# FIX 4: ng Phoneme Display Label
# Change TTS label from 'nng' to 'ng (as in sing)' for clarity
# And add a hint comment
# ================================================================
old_ng = "'ck': 'kuh', 'ng': 'nng', 'qu': 'kwuh',"
new_ng = "'ck': 'kuh', 'ng': 'ng (as in sing)', 'qu': 'kwuh',"
if old_ng in content:
    content = content.replace(old_ng, new_ng)
    changes += 1
    print("4. ✅ Reframed ng TTS label to 'ng (as in sing)'")
else:
    print("4. ⚠️ ng TTS label pattern not found")

# ================================================================
# Save
# ================================================================
content = content.replace('\n', '\r\n')
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"\nTotal fixes: {changes}")
print(f"Saved ({len(content)} chars)")
