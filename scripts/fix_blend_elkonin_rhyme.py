#!/usr/bin/env python3
"""Fix 4 issues:
1. playBlending isPlayingAudio guard prevents phoneme sequence from playing
2. Per-option speaker buttons need isPlayingAudio guard (overlapping voices)
3. Elkonin box Pool->Box should replace existing chip (not only place in empty)
4. Rhyme Time pre-cache blocks reading options (long delay)
"""
import shutil

FILE = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, "r", encoding="utf-8", errors="replace") as f:
    content = f.read()

changes = []

# =====================================================================
# FIX 1: Remove isPlayingAudio guard from playBlending (L5179)
# Change: if (isPlayingAudio || !wordSoundsPhonemes?.phonemes) return;
# To:     if (!wordSoundsPhonemes?.phonemes) return;
# =====================================================================
old1 = "if (isPlayingAudio || !wordSoundsPhonemes?.phonemes) return;"
new1 = "if (!wordSoundsPhonemes?.phonemes) return; // FIX: Removed isPlayingAudio guard (blocks instruction chain calls)"
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes.append("FIX 1: Removed isPlayingAudio guard from playBlending")
else:
    print(f"WARNING: FIX 1 target not found")

# =====================================================================
# FIX 2: Add isPlayingAudio guard to per-option blending speaker buttons
# The onClick handler at L10535:
#   onClick={(e) => { e.stopPropagation(); handleAudio(word); }}
# Change to:
#   onClick={(e) => { e.stopPropagation(); if (isPlayingAudio) return; handleAudio(word); }}
# Be careful to only match the one inside the blending option div (near "Listen to this option")
# =====================================================================
old2 = '''onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAudio(word);
                                                            }}
                                                            className="absolute top-1 right-1 w-8 h-8 bg-pink-100'''
new2 = '''onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isPlayingAudio) return; // FIX: Prevent overlapping voices
                                                                handleAudio(word);
                                                            }}
                                                            className="absolute top-1 right-1 w-8 h-8 bg-pink-100'''
if old2 in content:
    content = content.replace(old2, new2, 1)
    changes.append("FIX 2: Added isPlayingAudio guard to per-option speaker buttons")
else:
    print(f"WARNING: FIX 2 target not found")

# =====================================================================
# FIX 3: Elkonin Pool->Box should replace existing chip, not just fill empty
# Current (L9448-9455):
#   if (source === 'pool' && targetSource === 'box') {
#       if (newBoxes[targetIndex] === null) {
#           newBoxes[targetIndex] = item;
#           newChips = newChips.map(c => c.id === item.id ? { ...c, used: true } : c);
#           playSound('pop');
#           handleAudio(item.phoneme);
#       }
# Change: When box is occupied, return old chip to pool and place new one
# =====================================================================
old3 = '''if (source === 'pool' && targetSource === 'box') {
            // Place from Pool to Box
            if (newBoxes[targetIndex] === null) {
                newBoxes[targetIndex] = item;
                newChips = newChips.map(c => c.id === item.id ? { ...c, used: true } : c);
                playSound('pop');
                handleAudio(item.phoneme);
            }'''
new3 = '''if (source === 'pool' && targetSource === 'box') {
            // Place from Pool to Box (FIX: Replace existing chip if occupied)
            const existingChip = newBoxes[targetIndex];
            if (existingChip) {
                // Return the displaced chip to the pool
                newChips = newChips.map(c => c.id === existingChip.id ? { ...c, used: false } : c);
            }
            newBoxes[targetIndex] = item;
            newChips = newChips.map(c => c.id === item.id ? { ...c, used: true } : c);
            playSound('pop');
            handleAudio(item.phoneme);'''
if old3 in content:
    content = content.replace(old3, new3, 1)
    changes.append("FIX 3: Elkonin Pool->Box now replaces existing chip (returns old to pool)")
else:
    print(f"WARNING: FIX 3 target not found")

# =====================================================================
# FIX 4a: Rhyme Time pre-cache (auto-play path, L8056-8058)
# Change: Don't AWAIT the pre-cache, fire-and-forget so first option plays immediately
# =====================================================================
old4a = '''// PRE-CACHE TTS: Generate audio for ALL rhyme options simultaneously
                        try {
                            await Promise.allSettled(rhymeOptionsRef.current.map(w => callTTS(w)));
                        } catch(e) { debugLog("Rhyme TTS pre-cache error:", e); }
                         for (let i = 0; i < rhymeOptionsRef.current.length; i++) {'''
new4a = '''// PRE-CACHE TTS: Fire-and-forget (FIX: don't block playback waiting for all TTS)
                        Promise.allSettled(rhymeOptionsRef.current.map(w => callTTS(w))).catch(e => debugLog("Rhyme TTS pre-cache error:", e));
                         for (let i = 0; i < rhymeOptionsRef.current.length; i++) {'''
if old4a in content:
    content = content.replace(old4a, new4a, 1)
    changes.append("FIX 4a: Rhyme pre-cache fire-and-forget (auto-play path)")
else:
    print(f"WARNING: FIX 4a target not found")

# =====================================================================
# FIX 4b: Rhyme Time pre-cache (instruction path, L8586-8589)
# =====================================================================
old4b = '''// PRE-CACHE TTS for all rhyme options simultaneously
                        try {
                            await Promise.allSettled(rhymeOptionsRef.current.map(w => callTTS(w)));
                        } catch(e) { debugLog('Rhyme TTS pre-cache error:', e); }'''
new4b = '''// PRE-CACHE TTS: Fire-and-forget (FIX: don't block playback waiting for all TTS)
                        Promise.allSettled(rhymeOptionsRef.current.map(w => callTTS(w))).catch(e => debugLog('Rhyme TTS pre-cache error:', e));'''
if old4b in content:
    content = content.replace(old4b, new4b, 1)
    changes.append("FIX 4b: Rhyme pre-cache fire-and-forget (instruction path)")
else:
    print(f"WARNING: FIX 4b target not found")

# =====================================================================
# FIX 4c: Blending pre-cache (instruction path, L8561-8563)
# Same issue exists for blending options
# =====================================================================
old4c = '''// PRE-CACHE TTS: Generate audio for ALL options simultaneously
                        // This prevents the correct answer from loading first (giving away the answer)
                        try {
                            await Promise.allSettled(effectiveBlendingOptions.map(w => callTTS(w)));
                        } catch(e) { debugLog('Blending TTS pre-cache error:', e); }'''
new4c = '''// PRE-CACHE TTS: Fire-and-forget (FIX: don't block playback waiting for all TTS)
                        Promise.allSettled(effectiveBlendingOptions.map(w => callTTS(w))).catch(e => debugLog('Blending TTS pre-cache error:', e));'''
if old4c in content:
    content = content.replace(old4c, new4c, 1)
    changes.append("FIX 4c: Blending pre-cache fire-and-forget (instruction path)")
else:
    print(f"WARNING: FIX 4c target not found")

# =====================================================================
# Write
# =====================================================================
shutil.copy2(FILE, FILE + ".bak7")
print("Backup created (.bak7)")

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

final_count = content.count('\n') + 1
print(f"Final file: {final_count} lines")
print(f"\n=== Applied {len(changes)} changes ===")
for c in changes:
    print(f"  ✓ {c}")

if len(changes) < 6:
    print(f"\n⚠️ WARNING: Expected 6 changes, got {len(changes)}")
else:
    print("\n✅ All changes applied!")
