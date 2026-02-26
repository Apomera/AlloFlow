#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Implement optimistic UI and performance optimizations"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

print("=" * 70)
print("IMPLEMENTING OPTIMISTIC UI & PERFORMANCE FIXES")
print("=" * 70)

changes = 0

# FIX 1: Make first word ready BEFORE audio loads (optimistic UI)
# Current: await fetchAudio(); setFirstWordReady(true);
# New: setFirstWordReady(true); fetchAudio(); // Audio loads in background

# For glossary path at ~L5268-5273
old_first_word_glossary = '''                     if (isFirstWord) {
                        await fetchAudio();
                        setFirstWordReady(true);
                     } else {
                        fetchAudio();
                     }'''

new_first_word_glossary = '''                     // OPTIMISTIC UI: Show word immediately while audio loads in background
                     if (isFirstWord) {
                        setFirstWordReady(true); // Immediate - user can see content
                        fetchAudio(); // Audio loads in background (no await)
                     } else {
                        fetchAudio(); // Background prefetch
                     }'''

if old_first_word_glossary in content:
    content = content.replace(old_first_word_glossary, new_first_word_glossary)
    changes += 1
    print("✅ 1. Glossary path: Optimistic UI for first word (L5268)")
else:
    print("⏭️ 1. Glossary first word pattern not found")

# FIX 2: Make API path first word optimistic too (~L5527)
old_first_word_api = '''                    if (isFirstWord) {
                        // First word: Wait for audio then show immediately
                        await fetchAudio();
                        console.log("🚀 Optimistic First Word Ready!");
                        setFirstWordReady(true);
                    } else {
                        // Background words: Don't await, just start prefetching
                        fetchAudio();
                    }'''

new_first_word_api = '''                    // OPTIMISTIC UI: Show word immediately while audio loads in background
                    if (isFirstWord) {
                        setFirstWordReady(true); // Immediate - user can see content
                        console.log("🚀 Optimistic First Word Ready!");
                        fetchAudio(); // Audio loads in background (no await)
                    } else {
                        // Background words: Prefetch audio
                        fetchAudio();
                    }'''

if old_first_word_api in content:
    content = content.replace(old_first_word_api, new_first_word_api)
    changes += 1
    print("✅ 2. API path: Optimistic UI for first word (L5527)")
else:
    print("⏭️ 2. API first word pattern not found")

# FIX 3: Parallelize rhyme options playback (L6948 sequential -> parallel)
# Current: for loop with await (plays one at a time)
# Keep sequential for user experience but add a performance note

# FIX 4: Add preload start indicator to let user know audio is loading
# This is more of a UX enhancement than pure performance

# Save
if changes > 0:
    with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"\n🎉 SUCCESS: Applied {changes} optimistic UI fixes!")
else:
    print("\n⚠️ Patterns not found - checking file state")

print("=" * 70)
