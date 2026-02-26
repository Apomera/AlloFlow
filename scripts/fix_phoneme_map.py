"""
Fix phoneme oi→oy mapping and edit-mode answer recognition.

1. Add 'oi':'oy' (and other common Gemini variants) to PHONEME_NORMALIZE
2. Add a PHONEME_EQUIVALENTS map for answer checking (so 'oi' === 'oy' when checking)
3. Make the normalizePhoneme function at L10125 also normalize oi↔oy for comparison
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# FIX 1: Add 'oi':'oy' and other common Gemini aliases to PHONEME_NORMALIZE
old_normalize = """    const PHONEME_NORMALIZE = {
        'igh': 'ie', 'tch': 'ch', 'dge': 'j',
        'kn': 'n', 'wr': 'r', 'gn': 'n', 'gh': 'g', 'mb': 'm', 'qu': 'k',
    };"""

new_normalize = """    const PHONEME_NORMALIZE = {
        'igh': 'ie', 'tch': 'ch', 'dge': 'j',
        'kn': 'n', 'wr': 'r', 'gn': 'n', 'gh': 'g', 'mb': 'm', 'qu': 'k',
        // FIX: Gemini variant phonemes that need normalization to bank keys
        'oi': 'oy', 'aw': 'au', 'ew': 'oo', 'oe': 'oa',
    };"""

if old_normalize in content:
    content = content.replace(old_normalize, new_normalize, 1)
    changes += 1
    print("1. FIXED: Added oi→oy and other Gemini aliases to PHONEME_NORMALIZE")
else:
    print("[WARN] PHONEME_NORMALIZE pattern not found")

# FIX 2: Update the normalizePhoneme function at L10125 (used in answer checking)
# to handle oi↔oy equivalence
old_norm_func = """        // Phoneme normalization for comparison (handles macron vs digraph variations)
        const normalizePhoneme = (p) => {"""

new_norm_func = """        // Phoneme normalization for comparison (handles macron vs digraph variations + Gemini aliases)
        const PHONEME_EQUIV = { 'oi': 'oy', 'oy': 'oy', 'aw': 'au', 'au': 'au', 'ew': 'oo', 'oe': 'oa' };
        const normalizePhoneme = (p) => {
            // FIX: Apply equivalence mapping so edited phonemes match correctly
            const equiv = PHONEME_EQUIV[p?.toLowerCase?.()] || p;
            if (equiv !== p) return equiv;"""

if old_norm_func in content:
    content = content.replace(old_norm_func, new_norm_func, 1)
    changes += 1
    print("2. FIXED: Added PHONEME_EQUIV to normalizePhoneme for answer checking")
else:
    print("[WARN] normalizePhoneme pattern not found")

# FIX 3: Add phoneme equivalence to checkAnswer comparison
# The main checkAnswer at L8515 compares answer vs expectedAnswer as strings.
# For isolation/find-sounds activities, the answer might be 'oy' but expected is 'oi'.
# We need to normalize both sides. Let's add it right after the safe comparison.
old_check = """        const safeAnswer = (answer ?? '').toString().toLowerCase().trim();
        const safeExpected = (expectedAnswer ?? '').toString().toLowerCase().trim();
        if (!safeExpected) {
            warnLog("⚠️ checkAnswer: expectedAnswer is empty/null, skipping check");
            return;
        }
        const isCorrect = safeAnswer === safeExpected;"""

new_check = """        const safeAnswer = (answer ?? '').toString().toLowerCase().trim();
        const safeExpected = (expectedAnswer ?? '').toString().toLowerCase().trim();
        if (!safeExpected) {
            warnLog("⚠️ checkAnswer: expectedAnswer is empty/null, skipping check");
            return;
        }
        // FIX: Phoneme equivalence — normalize both sides for matching (e.g., oi===oy)
        const ANSWER_EQUIV = { 'oi': 'oy', 'aw': 'au', 'ew': 'oo', 'oe': 'oa' };
        const normAnswer = ANSWER_EQUIV[safeAnswer] || safeAnswer;
        const normExpected = ANSWER_EQUIV[safeExpected] || safeExpected;
        const isCorrect = normAnswer === normExpected || safeAnswer === safeExpected;"""

if old_check in content:
    content = content.replace(old_check, new_check, 1)
    changes += 1
    print("3. FIXED: Added phoneme equivalence to checkAnswer comparison")
else:
    print("[WARN] checkAnswer comparison pattern not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print("\nApplied %d fixes" % changes)
