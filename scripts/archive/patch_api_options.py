"""
API-Generated Options: Extend Gemini prompt + wire data
========================================================
1. Extend Gemini prompt to return soundSortMatches, rimeFamilyMembers, orthographyDistractors
2. Wire AI-generated data into Sound Sort render case (prefer AI over static pool)
3. Pass new fields through processPhonemeData
4. Wire rimeFamilyMembers into Word Families render case
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')
changes = 0

# ================================================================
# FIX 1: Extend Gemini Prompt — Add new fields to JSON schema
# Location: L5434-5447 in the prompt template
# ================================================================
old_json_schema = '''  "blendingDistractors": ["word1", "word2", "word3"]
}'''

new_json_schema = '''  "blendingDistractors": ["word1", "word2", "word3"],
  "soundSortMatches": {"phoneme": "first or last phoneme", "position": "first|last", "words": ["word1", "word2", "word3", "word4", "word5"]},
  "rimeFamilyMembers": {"rime": "-at", "words": ["cat", "bat", "hat", "mat", "sat"]},
  "orthographyDistractors": ["misspelling1", "misspelling2", "misspelling3"]
}'''

if old_json_schema in content:
    content = content.replace(old_json_schema, new_json_schema, 1)
    changes += 1
    print("1. Extended Gemini prompt JSON schema with soundSortMatches, rimeFamilyMembers, orthographyDistractors")
else:
    print("1. JSON schema pattern not found")

# Add field documentation after the PHONEME FORMAT examples (after IPA examples line)
old_phoneme_format_end = '- "grapheme": The actual letters from the word that represent this sound'
new_phoneme_format_end = '''- "grapheme": The actual letters from the word that represent this sound
ACTIVITY DATA FIELDS:
- "soundSortMatches": Pick ONE phoneme (first or last). Find 5 OTHER real words sharing that phoneme in the same position. Include the phoneme and position.
- "rimeFamilyMembers": Identify the rime (vowel+coda, e.g. "-at" from "cat"). List 5 real words sharing that rime. If no clear rime family, return {"rime": "", "words": []}.
- "orthographyDistractors": Create 3 plausible misspellings of the word (swap vowels, double letters, phonetic spellings). Must NOT be real words.'''

if old_phoneme_format_end in content:
    content = content.replace(old_phoneme_format_end, new_phoneme_format_end, 1)
    changes += 1
    print("2. Added activity data field documentation to Gemini prompt")
else:
    print("2. Phoneme format end pattern not found")

# ================================================================
# FIX 2: Wire AI data into Sound Sort render case
# Before the static pool lookup, try to use AI-generated soundSortMatches
# Location: L9339-9356 (the pool filtering section)
# ================================================================
old_pool = '''                // Find Matches from Pool (Orthographic Estimation)
                // Expanded Pool logic handled by adding words to SOUND_MATCH_POOL definition if needed, 
                // but here we ensure accurate filtering using new helpers.
                const pool = SOUND_MATCH_POOL || ['bat', 'cat', 'dog', 'sit']; 
                const matches = pool.filter(w => {
                     const wClean = w.toLowerCase();
                     if (wClean === targetWord) return false;
                     // Use estimator for pool comparison
                     const pPhoneme = mode === 'first' ? estimateFirstPhoneme(wClean) : estimateLastPhoneme(wClean);
                     return pPhoneme === targetPhoneme;
                });
                // Find Distractors
                const distractorsPool = pool.filter(w => {
                     const wClean = w.toLowerCase();
                     if (wClean === targetWord) return false;
                     const pPhoneme = mode === 'first' ? estimateFirstPhoneme(wClean) : estimateLastPhoneme(wClean);
                     return pPhoneme !== targetPhoneme;
                });'''

new_pool = '''                // AI-FIRST: Use Gemini-generated soundSortMatches if available
                const aiSortData = wordSoundsPhonemes?.soundSortMatches;
                let aiMatches = [];
                let aiMode = mode;
                if (aiSortData && aiSortData.words && aiSortData.words.length >= 2) {
                    aiMatches = aiSortData.words
                        .map(w => w.toLowerCase().trim())
                        .filter(w => w && w !== targetWord);
                    // Use AI's position if provided
                    if (aiSortData.position === 'first' || aiSortData.position === 'last') {
                        aiMode = aiSortData.position;
                    }
                    if (aiSortData.phoneme) {
                        targetPhoneme = aiSortData.phoneme;
                    }
                    debugLog("🤖 Using AI-generated Sound Sort matches:", aiMatches);
                }
                // FALLBACK: Static pool for matches and distractors
                const pool = SOUND_MATCH_POOL || ['bat', 'cat', 'dog', 'sit']; 
                const poolMatches = pool.filter(w => {
                     const wClean = w.toLowerCase();
                     if (wClean === targetWord) return false;
                     const pPhoneme = aiMode === 'first' ? estimateFirstPhoneme(wClean) : estimateLastPhoneme(wClean);
                     return pPhoneme === targetPhoneme;
                });
                // Merge AI + pool matches (AI first, deduped)
                const matches = [...new Set([...aiMatches, ...poolMatches])];
                // Find Distractors (always from pool — AI doesn't provide these)
                const distractorsPool = pool.filter(w => {
                     const wClean = w.toLowerCase();
                     if (wClean === targetWord) return false;
                     const pPhoneme = aiMode === 'first' ? estimateFirstPhoneme(wClean) : estimateLastPhoneme(wClean);
                     return pPhoneme !== targetPhoneme;
                });'''

if old_pool in content:
    content = content.replace(old_pool, new_pool)
    changes += 1
    print("3. Wired AI-generated data into Sound Sort (AI-first with pool fallback)")
else:
    print("3. Sound Sort pool pattern not found")

# ================================================================
# FIX 3: Wire rimeFamilyMembers into Word Families render case
# The word_families render case needs to use rimeFamilyMembers from phoneme data
# ================================================================
# First, let's find the word_families render case
wf_idx = content.find("case 'word_families':")
if wf_idx > 0:
    # Find the section that sets up the word families data
    wf_context = content[wf_idx:wf_idx+3000]
    print(f"4. Found word_families render case at char {wf_idx}")
    # Look for the rime data setup
    if 'RIME_FAMILIES' in wf_context:
        # Current code uses static RIME_FAMILIES — we need to prefer AI data
        # Find the rime selection logic
        old_rime_setup = "const availableRimes = Object.keys(RIME_FAMILIES)"
        if old_rime_setup in content:
            new_rime_setup = """// AI-FIRST: Use Gemini-generated rimeFamilyMembers if available
                const aiRimeData = wordSoundsPhonemes?.rimeFamilyMembers;
                let rimeFromAI = null;
                if (aiRimeData && aiRimeData.rime && aiRimeData.words && aiRimeData.words.length >= 3) {
                    rimeFromAI = {
                        rime: aiRimeData.rime,
                        members: aiRimeData.words.map(w => w.toLowerCase().trim()).filter(w => w)
                    };
                    debugLog("🏠 Using AI-generated rime family:", rimeFromAI);
                }
                const availableRimes = Object.keys(RIME_FAMILIES)"""
            content = content.replace(old_rime_setup, new_rime_setup, 1)
            changes += 1
            print("5. Added AI rime data injection into Word Families")
        else:
            print("5. availableRimes pattern not found")
    else:
        print("4b. RIME_FAMILIES not found in word_families case")
else:
    print("4. word_families render case not found")

# ================================================================
# FIX 4: Wire orthographyDistractors into Sight & Spell initialization
# Location: L6234-6235 — the orthography init effect uses
# generateOrthographyDistractors but should prefer AI data
# ================================================================
old_ortho_init = "const pool = phonemeData?.orthographyDistractors || generateOrthographyDistractors(targetWord);"
new_ortho_init = "const pool = wordSoundsPhonemes?.orthographyDistractors?.length > 0 ? wordSoundsPhonemes.orthographyDistractors : (phonemeData?.orthographyDistractors || generateOrthographyDistractors(targetWord));"
if old_ortho_init in content:
    content = content.replace(old_ortho_init, new_ortho_init)
    changes += 1
    print("6. Wired AI orthographyDistractors into Sight & Spell init")
else:
    print("6. Orthography init pattern not found")

# ================================================================
# FIX 5: Ensure new fields pass through processPhonemeData 
# The data flow at L5030 already preserves all response fields via spread operator
# Just need to ensure the pre-load buffer includes them
# ================================================================
old_preload_data = "blendingDistractors: phonemeData.blendingDistractors || [],"
new_preload_data = """blendingDistractors: phonemeData.blendingDistractors || [],
                    soundSortMatches: phonemeData.soundSortMatches || null,
                    rimeFamilyMembers: phonemeData.rimeFamilyMembers || null,
                    orthographyDistractors: phonemeData.orthographyDistractors || [],"""
if old_preload_data in content:
    content = content.replace(old_preload_data, new_preload_data, 1)
    changes += 1
    print("7. Added new fields to pre-load buffer data flow")
else:
    print("7. Pre-load data pattern not found")

# Save
content = content.replace('\n', '\r\n')
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"\nTotal fixes: {changes}")
print(f"Saved ({len(content)} chars)")
