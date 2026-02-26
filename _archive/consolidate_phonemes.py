"""
Phoneme Pipeline Consolidation Script
1. Upgrade initial Gemini prompt at L1452 with IPA/r-controlled vowels
2. Add phonemeCount to processed.push() at L1497
3. Eliminate 4 redundant fetchWordData calls (L7016, L7081, L7886, L7908)
"""

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
content = f.read()
f.close()

changes = []

# ═══════════════════════════════════════════════════════════════
# FIX 1: Upgrade the initial Gemini prompt (L1452-1476)
# ═══════════════════════════════════════════════════════════════

OLD_PROMPT = '''const prompt = `
                         Analyze the word "${rawWord}" for phonemic awareness activities. Target Audience: ${gradeLevel || 'Early Readers (K-2)'}.
                         
                         PHONEME NOTATION:
                         • LONG VOWELS: ā (long a), ē (long e), ī (long i), ō (long o), ū (long u)
                         • SHORT VOWELS: a, e, i, o, u
                         • DIGRAPHS: sh, ch, th, wh, ng, ck (count as ONE sound)
                         
                         Return ONLY JSON:
                         {
                             "word": "${rawWord}",
                             "phonemes": ["c", "a", "t"],
                             "syllables": ["cat"],
                             "rhymeWord": "bat",
                             "rhymeDistractors": ["dog", "sun", "bed", "leg", "cup"],
                             "blendingDistractors": ["cot", "cut", "cap", "can", "cab"],
                             "wordFamily": "-at",
                             "familyEnding": "-at",
                             "familyMembers": ["bat", "hat", "mat", "sat", "rat"],
                             "firstSound": "c",
                             "lastSound": "t",
                             "definition": "Simple definition matching grade level",
                             "imagePrompt": "Icon of ${rawWord}, white background"
                         }
                      `;'''

NEW_PROMPT = '''const prompt = `
                         Analyze the word "${rawWord}" for phonemic awareness activities. Target Audience: ${gradeLevel || 'Early Readers (K-2)'}.
                         
                         PHONEME NOTATION (use EXACTLY these symbols):
                         • LONG VOWELS: Use macron symbols: ā (long a), ē (long e), ī (long i), ō (long o), ū (long u)
                         • SHORT VOWELS: Use plain letters: a, e, i, o, u
                         • DIGRAPHS: sh, ch, th, wh, ng, ck (count as ONE sound)
                         • R-CONTROLLED VOWELS: ar, er, ir, or, ur (count as ONE sound — do NOT split into separate phonemes)
                         
                         CRITICAL RULES:
                         • R-CONTROLLED vowels are ALWAYS one sound: "or" in "corn" = 1 phoneme, NOT "o"+"r"
                         • Silent letters are skipped: "knight" → ["n", "ī", "t"]
                         • Vowel teams are one sound: "rain" → ["r", "ā", "n"]
                         
                         EXAMPLES:
                         • "cat" → ["k", "a", "t"] (3 phonemes, short a)
                         • "cake" → ["k", "ā", "k"] (3 phonemes, long a)
                         • "ship" → ["sh", "i", "p"] (3 phonemes, sh is ONE sound)
                         • "corn" → ["k", "or", "n"] (3 phonemes, or is ONE sound)
                         • "orbit" → ["or", "b", "i", "t"] (4 phonemes, or is ONE sound)
                         • "bird" → ["b", "ir", "d"] (3 phonemes, ir is ONE sound)
                         • "star" → ["s", "t", "ar"] (3 phonemes — do NOT add extra r)
                         • "turn" → ["t", "ur", "n"] (3 phonemes, ur is ONE sound)
                         • "fern" → ["f", "er", "n"] (3 phonemes, er is ONE sound)
                         • "rain" → ["r", "ā", "n"] (3 phonemes, ai = long a)
                         • "green" → ["g", "r", "ē", "n"] (4 phonemes, ee = long e)
                         
                         Return ONLY JSON:
                         {
                             "word": "${rawWord}",
                             "phonemes": ["k", "or", "n"],
                             "phonemeCount": 3,
                             "syllables": ["corn"],
                             "rhymeWord": "horn",
                             "rhymeDistractors": ["dog", "sun", "bed", "leg", "cup"],
                             "blendingDistractors": ["cord", "core", "born", "worn", "torn"],
                             "wordFamily": "-orn",
                             "familyEnding": "-orn",
                             "familyMembers": ["horn", "born", "worn", "torn", "morn"],
                             "firstSound": "k",
                             "lastSound": "n",
                             "definition": "Simple definition matching grade level",
                             "imagePrompt": "Icon of ${rawWord}, white background"
                         }
                      `;'''

if OLD_PROMPT in content:
    content = content.replace(OLD_PROMPT, NEW_PROMPT)
    changes.append("FIX 1: Upgraded initial Gemini prompt with IPA notation, r-controlled vowels, and phonemeCount")
else:
    print("WARNING: Could not find old prompt. Trying line-by-line...")
    # Try matching just the key part
    key_old = '• DIGRAPHS: sh, ch, th, wh, ng, ck (count as ONE sound)\n                         \n                         Return ONLY JSON:'
    key_new = '• DIGRAPHS: sh, ch, th, wh, ng, ck (count as ONE sound)\n                         • R-CONTROLLED VOWELS: ar, er, ir, or, ur (count as ONE sound — do NOT split into separate phonemes)\n                         \n                         Return ONLY JSON:'
    if key_old in content:
        content = content.replace(key_old, key_new)
        changes.append("FIX 1 (partial): Added R-CONTROLLED line to prompt")
    else:
        print("ERROR: Cannot locate prompt to patch! Manual fix needed.")

# ═══════════════════════════════════════════════════════════════
# FIX 2: Add phonemeCount to processed.push() (L1497-1515)
# ═══════════════════════════════════════════════════════════════

OLD_PUSH = '''phonemes: validatedPhonemes,
                          syllables: data.syllables,'''
NEW_PUSH = '''phonemes: validatedPhonemes,
                          phonemeCount: validatedPhonemes.length,
                          syllables: data.syllables,'''

if OLD_PUSH in content:
    content = content.replace(OLD_PUSH, NEW_PUSH)
    changes.append("FIX 2: Added phonemeCount to processed.push()")
else:
    print("WARNING: Could not find processed.push() to add phonemeCount")

# ═══════════════════════════════════════════════════════════════
# FIX 3: Eliminate redundant fetchWordData calls
# ═══════════════════════════════════════════════════════════════

# 3a: L7081 - startActivity fallback
OLD_3A = '''} else {
                // Fallback: Fetch if not preloaded
                fetchWordData(targetWord);
            }'''
NEW_3A = '''} else {
                // CONSOLIDATED: Use lightweight local fallback instead of full fetchWordData pipeline
                console.log("📦 Using local fallback for:", targetWord, "(preloaded data unavailable)");
                const fallback = generateFallbackData(targetWord);
                if (fallback) {
                    applyWordDataToState(fallback);
                    wordDataCache.current.set(targetWord.toLowerCase(), fallback);
                }
                setIsLoadingPhonemes(false);
            }'''

if OLD_3A in content:
    content = content.replace(OLD_3A, NEW_3A)
    changes.append("FIX 3a: Replaced fetchWordData at L7081 (startActivity) with generateFallbackData")
else:
    print("WARNING: Could not find L7081 fetchWordData to replace")

# 3b: L7016 - queue retry after regeneration
OLD_3B = '''setCurrentWordSoundsWord(retryTargetWord);
                    setCurrentWordImage(retryWord.image);
                    setShowWordText(!retryWord.image);
                    fetchWordData(retryTargetWord);'''
NEW_3B = '''setCurrentWordSoundsWord(retryTargetWord);
                    setCurrentWordImage(retryWord.image);
                    setShowWordText(!retryWord.image);
                    // CONSOLIDATED: Use preloaded data or local fallback instead of fetchWordData
                    const retryPreloaded = preloadedWords.find(pw => 
                        (pw.word?.toLowerCase() === retryTargetWord.toLowerCase() || 
                         pw.targetWord?.toLowerCase() === retryTargetWord.toLowerCase()));
                    if (retryPreloaded && retryPreloaded.phonemes) {
                        setWordSoundsPhonemes(retryPreloaded);
                    } else {
                        const fallback = generateFallbackData(retryTargetWord);
                        if (fallback) applyWordDataToState(fallback);
                    }
                    setIsLoadingPhonemes(false);'''

if OLD_3B in content:
    content = content.replace(OLD_3B, NEW_3B)
    changes.append("FIX 3b: Replaced fetchWordData at L7016 (queue retry) with preloaded lookup + fallback")
else:
    print("WARNING: Could not find L7016 fetchWordData to replace")

# 3c: L7886 - checkAnswer next word advancement
OLD_3C = '''                    } else {
                        fetchWordData(targetWord);
                    }
                    setWordSoundsFeedback?.(null);
                    setUserAnswer('');
                    
                    // Start prefetching again
                    setTimeout(() => prefetchNextWords(), 500);'''
NEW_3C = '''                    } else {
                        // CONSOLIDATED: Use local fallback instead of fetchWordData
                        console.log("📦 Using local fallback for:", targetWord, "(no preloaded match)");
                        const fallback = generateFallbackData(targetWord);
                        if (fallback) {
                            applyWordDataToState(fallback);
                            wordDataCache.current.set(targetWord.toLowerCase(), fallback);
                        }
                        setIsLoadingPhonemes(false);
                    }
                    setWordSoundsFeedback?.(null);
                    setUserAnswer('');'''

if OLD_3C in content:
    content = content.replace(OLD_3C, NEW_3C)
    changes.append("FIX 3c: Replaced fetchWordData at L7886 (checkAnswer) with generateFallbackData")
else:
    print("WARNING: Could not find L7886 fetchWordData to replace")

# 3d: L7908 - queue refill desperate mode
OLD_3D = '''                            setCurrentWordSoundsWord(target);
                            fetchWordData(target);
                            setTimeout(() => prefetchNextWords(), 500);'''
NEW_3D = '''                            setCurrentWordSoundsWord(target);
                            // CONSOLIDATED: Use preloaded data or local fallback
                            const refillPreloaded = preloadedWords.find(pw => 
                                (pw.word?.toLowerCase() === target.toLowerCase() || 
                                 pw.targetWord?.toLowerCase() === target.toLowerCase()));
                            if (refillPreloaded && refillPreloaded.phonemes) {
                                setWordSoundsPhonemes(refillPreloaded);
                            } else {
                                const fallback = generateFallbackData(target);
                                if (fallback) applyWordDataToState(fallback);
                            }
                            setIsLoadingPhonemes(false);'''

if OLD_3D in content:
    content = content.replace(OLD_3D, NEW_3D)
    changes.append("FIX 3d: Replaced fetchWordData at L7908 (queue refill) with preloaded lookup + fallback")
else:
    print("WARNING: Could not find L7908 fetchWordData to replace")


# ═══════════════════════════════════════════════════════════════
# WRITE
# ═══════════════════════════════════════════════════════════════
f = open(FILE, 'w', encoding='utf-8')
f.write(content)
f.close()

# ═══════════════════════════════════════════════════════════════
# REPORT
# ═══════════════════════════════════════════════════════════════
out = open('_consolidation_results.txt', 'w', encoding='utf-8')
out.write("=== PHONEME PIPELINE CONSOLIDATION RESULTS ===\n\n")

for c in changes:
    out.write(f"  ✅ {c}\n")

if len(changes) < 6:
    out.write(f"\n  ⚠️ {6 - len(changes)} fixes could not be applied (see warnings above)\n")

# Verify
f = open(FILE, 'r', encoding='utf-8-sig')
verify = f.read()
f.close()

out.write("\n\n=== VERIFICATION ===\n")

# Check 1: R-CONTROLLED in prompt
if 'R-CONTROLLED VOWELS: ar, er, ir, or, ur' in verify:
    out.write("  ✅ R-CONTROLLED vowels guidance present in prompt\n")
else:
    out.write("  ❌ R-CONTROLLED vowels NOT found in prompt\n")

# Check 2: phonemeCount in processed.push
if 'phonemeCount: validatedPhonemes.length,' in verify:
    out.write("  ✅ phonemeCount added to processed.push()\n")
else:
    out.write("  ❌ phonemeCount NOT found in processed.push()\n")

# Check 3: fetchWordData eliminated from gameplay paths
lines = verify.split('\n')
remaining_fetch = []
for i, line in enumerate(lines):
    stripped = line.strip()
    if 'fetchWordData(' in stripped and '//' not in stripped[:2]:
        # Skip known legitimate uses
        if any(x in stripped for x in ['const fetchWordData', 'handleRegenerateWord', 'handleRegenerateAll', 'onClick']):
            continue
        remaining_fetch.append(f"L{i+1}: {stripped[:120]}")

out.write(f"\n  Remaining fetchWordData calls (non-comment, non-definition): {len(remaining_fetch)}\n")
for r in remaining_fetch:
    out.write(f"    {r}\n")

# Check legitimate calls remain
if 'fetchWordData(targetWord, 0, false, true)' in verify:  # handleRegenerateWord
    out.write("  ✅ handleRegenerateWord still uses fetchWordData (correct)\n")
if 'fetchWordData(targetWord, 0, true)' in verify:  # handleRegenerateAll
    out.write("  ✅ handleRegenerateAll still uses fetchWordData (correct)\n")

out.close()
print("Done -> _consolidation_results.txt")
