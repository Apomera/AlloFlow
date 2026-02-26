"""
Step 1: Fix bloated line endings (strip duplicate \r)
Step 2: Apply all 3 bug fixes in one clean pass
Uses binary mode to handle line endings safely.
"""
import re

FILE = 'AlloFlowANTI.txt'

# Read raw bytes
with open(FILE, 'rb') as f:
    raw = f.read()

print(f"Raw file size: {len(raw)} bytes")

# Fix bloat: replace \r\r\n with \r\n, and any remaining \r\r with \r
while b'\r\r' in raw:
    raw = raw.replace(b'\r\r', b'\r')
    
print(f"After dedup CR: {len(raw)} bytes")

# Decode to string
content = raw.decode('utf-8')

# Work with normalized \n
content = content.replace('\r\n', '\n')
print(f"Normalized: {len(content)} chars")
changes = 0

# ============================================================
# FIX 1: Verify duplicate tracing reset is gone
# ============================================================
dup_pattern = """        if (wordSoundsActivity === 'letter_tracing') {
            setTracingPhase('upper');
        }
        
        // Reset tracing phase when word changes
        if (wordSoundsActivity === 'letter_tracing') {
            setTracingPhase('upper');
        }"""

if dup_pattern in content:
    content = content.replace(dup_pattern, """        if (wordSoundsActivity === 'letter_tracing') {
            setTracingPhase('upper');
        }""")
    changes += 1
    print("FIX 1: Removed duplicate tracing reset")
else:
    print("FIX 1: Already clean (no duplicate)")

# ============================================================
# FIX 2: Word Scramble depletion
# ============================================================

# 2a: Add state if not present
if 'usedScrambleIndices' not in content:
    old_memo = """    const scrambledLetters = React.useMemo(() => 
        scrambleWord(currentWordSoundsWord?.toLowerCase()), 
        [currentWordSoundsWord]
    );"""
    new_memo = old_memo + "\n    const [usedScrambleIndices, setUsedScrambleIndices] = React.useState([]);"
    content = content.replace(old_memo, new_memo)
    changes += 1
    print("FIX 2a: Added usedScrambleIndices state")
else:
    print("FIX 2a: usedScrambleIndices already exists")

# 2b: Update tiles - use regex for flexibility
tile_old = re.compile(
    r'\{scrambledLetters\.map\(\(letter, idx\) => \(\s*'
    r'<div\s*\n\s*key=\{idx\}\s*\n'
    r'\s*className="w-12 h-14 border-2 border-violet-300 bg-violet-50 rounded-lg flex items-center justify-center text-2xl font-bold uppercase text-violet-700 shadow-md hover:scale-105 transition-transform cursor-pointer"\s*\n'
    r'\s*onClick=\{\(\) => setUserAnswer\(\(prev\) => \(prev \|\| \'\'\) \+ letter\)\}\s*\n'
    r'\s*>\s*\n'
    r'\s*\{letter\.toUpperCase\(\)\}\s*\n'
    r'\s*</div>\s*\n'
    r'\s*\)\)\}'
)

tile_new = """{scrambledLetters.map((letter, idx) => {
                                const isUsed = usedScrambleIndices.includes(idx);
                                return (
                                <div 
                                    key={idx}
                                    className={`w-12 h-14 border-2 rounded-lg flex items-center justify-center text-2xl font-bold uppercase shadow-md transition-all ${
                                        isUsed 
                                            ? 'border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed opacity-50' 
                                            : 'border-violet-300 bg-violet-50 text-violet-700 hover:scale-105 cursor-pointer'
                                    }`}
                                    onClick={() => {
                                        if (isUsed) return;
                                        setUserAnswer((prev) => (prev || '') + letter);
                                        setUsedScrambleIndices((prev) => [...prev, idx]);
                                    }}
                                >
                                    {letter.toUpperCase()}
                                </div>
                                );
                            })}"""

if tile_old.search(content):
    content = tile_old.sub(tile_new, content)
    changes += 1
    print("FIX 2b: Updated tile rendering with depletion")
else:
    # Check if already fixed
    if 'usedScrambleIndices.includes(idx)' in content:
        print("FIX 2b: Tile already has depletion tracking")
    else:
        print("FIX 2b WARNING: Could not find tile pattern")

# 2c: Clear button
old_clear = "onClick={() => setUserAnswer('')}"
new_clear = "onClick={() => { setUserAnswer(''); setUsedScrambleIndices([]); }}"

# Only in word_scramble context - find the specific one near word_scramble_clear
scramble_clear_area = content.find("word_scramble_clear")
if scramble_clear_area > 0:
    # Find the closest onClick before word_scramble_clear
    search_start = max(0, scramble_clear_area - 300)
    search_area = content[search_start:scramble_clear_area]
    if old_clear in search_area:
        # Replace only this specific instance
        pos = search_start + search_area.rfind(old_clear)
        content = content[:pos] + new_clear + content[pos + len(old_clear):]
        changes += 1
        print("FIX 2c: Updated Clear button")
    elif new_clear.replace("onClick=", "") in search_area:
        print("FIX 2c: Clear button already fixed")
    else:
        print("FIX 2c WARNING: Clear button onClick not found near word_scramble_clear")
else:
    print("FIX 2c WARNING: word_scramble_clear not found")

# 2d: Reset on correct (Unscrambled)
old_unscrambled = "setUserAnswer('');\n                            checkAnswer('correct', 'correct');\n                        }, 1500);"
# Find specifically in the word_scramble section (near 'Unscrambled')
unscramble_area = content.find("Unscrambled")
if unscramble_area > 0:
    search_end = unscramble_area + 500
    area = content[unscramble_area:search_end]
    if old_unscrambled in area and "setUsedScrambleIndices" not in area.split("checkAnswer('correct', 'correct')")[0]:
        new_unscrambled = "setUserAnswer('');\n                            setUsedScrambleIndices([]);\n                            checkAnswer('correct', 'correct');\n                        }, 1500);"
        pos = unscramble_area + area.find(old_unscrambled)
        content = content[:pos] + new_unscrambled + content[pos + len(old_unscrambled):]
        changes += 1
        print("FIX 2d: Reset indices on correct unscramble")
    elif "setUsedScrambleIndices" in area:
        print("FIX 2d: Already resets on correct")
    else:
        print("FIX 2d WARNING: correct handler pattern not found near Unscrambled")
else:
    print("FIX 2d WARNING: 'Unscrambled' text not found")

# 2e: Reset on wrong scramble
wrong_scramble = "Not quite! Try again"
wrong_area_start = content.find(wrong_scramble)
if wrong_area_start > 0:
    wrong_area = content[wrong_area_start:wrong_area_start + 300]
    target = "// Engage retry mechanic (Second Chance + progressive image reveal)\n                        checkAnswer('incorrect', 'correct');"
    if target in wrong_area and "setUsedScrambleIndices" not in wrong_area.split(target)[0]:
        replacement = "setUserAnswer('');\n                        setUsedScrambleIndices([]);\n                        // Engage retry mechanic (Second Chance + progressive image reveal)\n                        checkAnswer('incorrect', 'correct');"
        pos = wrong_area_start + wrong_area.find(target)
        content = content[:pos] + replacement + content[pos + len(target):]
        changes += 1
        print("FIX 2e: Reset indices on wrong scramble")
    elif "setUsedScrambleIndices" in wrong_area:
        print("FIX 2e: Already resets on wrong")
    else:
        print("FIX 2e WARNING: wrong handler not found near 'Not quite'")
else:
    print("FIX 2e WARNING: 'Not quite! Try again' not found")

# ============================================================
# FIX 3: Word Families scoring
# ============================================================

# 3a: Add onCheckAnswer('incorrect') in WordFamiliesView distractor handler
old_shake = """                // Wrong!
                setShakenWord(item.text);
                setTimeout(() => { if (isMountedRef.current) setShakenWord(null); }, 500);
            }"""

new_shake = """                // Wrong! Shake animation + record incorrect for scoring
                setShakenWord(item.text);
                setTimeout(() => { if (isMountedRef.current) setShakenWord(null); }, 500);
                onCheckAnswer('incorrect');
            }"""

# Make sure we're in the WordFamiliesView context
wfv_start = content.find("const WordFamiliesView = React.useMemo")
if wfv_start > 0:
    wfv_end = wfv_start + 5000  # The component is ~300 lines
    wfv_area = content[wfv_start:wfv_end]
    if old_shake in wfv_area:
        pos = wfv_start + wfv_area.find(old_shake)
        content = content[:pos] + new_shake + content[pos + len(old_shake):]
        changes += 1
        print("FIX 3a: WordFamiliesView now reports distractor clicks")
    elif "onCheckAnswer('incorrect')" in wfv_area:
        print("FIX 3a: Already reports distractor clicks")
    else:
        print("FIX 3a WARNING: shake handler not found in WordFamiliesView")
else:
    print("FIX 3a WARNING: WordFamiliesView not found")

# 3b: Fix parent callback
old_cb = """onCheckAnswer={(word) => {
                            checkAnswer('correct', 'correct'); 
                        }}"""

new_cb = """onCheckAnswer={(result) => {
                            checkAnswer(result, 'correct'); 
                        }}"""

if old_cb in content:
    content = content.replace(old_cb, new_cb)
    changes += 1
    print("FIX 3b: Parent callback passes result through")
elif "checkAnswer(result, 'correct')" in content:
    print("FIX 3b: Parent callback already fixed")
else:
    print("FIX 3b WARNING: Parent callback not found")

# ============================================================
# Restore line endings and save
# ============================================================
# Convert back to \r\n
content = content.replace('\n', '\r\n')

print(f"\nTotal changes: {changes}")
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"Saved {FILE} ({len(content)} chars)")
