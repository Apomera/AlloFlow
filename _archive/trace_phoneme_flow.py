"""Deep trace: When do processWordsInBatches vs fetchWordData fire?
What data does each produce? Where does the UI read from?"""

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_phoneme_flow_analysis.txt', 'w', encoding='utf-8')

# 1. Find all callers of fetchWordData
out.write("=== CALLERS of fetchWordData ===\n")
for i, line in enumerate(lines):
    if 'fetchWordData(' in line and 'const fetchWordData' not in line and '//' not in line.strip()[:2]:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# 2. Find all callers of processWordsInBatches  
out.write("\n=== CALLERS of processWordsInBatches ===\n")
for i, line in enumerate(lines):
    if 'processWordsInBatches(' in line and 'const processWordsInBatches' not in line and '//' not in line.strip()[:2]:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# 3. Find where wordPool / wordSoundsTerms are set (the generated word list)
out.write("\n=== setWordPool / wordPool assignments ===\n")
for i, line in enumerate(lines):
    if 'setWordPool(' in line or 'wordPool =' in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# 4. Where does currentWordSoundsWord get set? (what triggers per-word fetch)
out.write("\n=== setCurrentWordSoundsWord / currentWordSoundsWord assignments ===\n")
for i, line in enumerate(lines):
    if 'setCurrentWordSoundsWord(' in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# 5. Where does wordSoundsPhonemes get set? (what the UI reads)
out.write("\n=== setWordSoundsPhonemes / wordSoundsPhonemes state ===\n")
for i, line in enumerate(lines):
    if 'setWordSoundsPhonemes(' in line or 'wordSoundsPhonemes' in line:
        if 'console' not in line and 'SILENCED' not in line:
            out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# 6. Find the transition from pre-activity review to gameplay  
out.write("\n=== startActivity / handleStartActivity / Play button ===\n")
for i, line in enumerate(lines):
    lower = line.lower()
    if ('startactivity' in lower or 'start activity' in lower or 'handlestart' in lower) and 'console' not in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# 7. Find where phonemes are read in the review panel vs game UI
out.write("\n=== word.phonemes (review panel reads) ===\n")
for i, line in enumerate(lines):
    if 'word.phonemes' in line or '.phonemes' in line:
        if 'console' not in line and i > 2100 and i < 2800:  # Review panel area
            out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# 8. Find where phonemes are read in gameplay
out.write("\n=== wordSoundsPhonemes.phonemes (game reads) ===\n")
for i, line in enumerate(lines):
    if 'wordSoundsPhonemes' in line:
        if 'console' not in line and 'SILENCED' not in line and i > 8000 and i < 9500:
            out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# 9. Find applyWordDataToState - this is likely the bridge
out.write("\n=== applyWordDataToState ===\n")
for i, line in enumerate(lines):
    if 'applyWordDataToState' in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# 10. What happens when a word is selected during gameplay?
out.write("\n=== advanceToNextWord / nextWord logic ===\n")
for i, line in enumerate(lines):
    lower = line.lower()
    if ('advancetonext' in lower or 'nextword' in lower or 'next_word' in lower) and 'console' not in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

out.close()
print("Done -> _phoneme_flow_analysis.txt")
