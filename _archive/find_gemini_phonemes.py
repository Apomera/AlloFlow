"""Find where Gemini generates phoneme data for words (the Oracle/API prompt)"""

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_gemini_phoneme_search.txt', 'w', encoding='utf-8')

# Search for Gemini prompt-related phoneme generation
patterns = [
    'phonemes',  # too broad, limit context
    'phoneme_breakdown',
    'phonemeBreakdown',
    'sound_breakdown',
    'soundBreakdown',
    'generateWordData',
    'oraclePrompt',
    'oracle_prompt',
    'wordSoundsPrompt',
    'gemini.*phoneme',
    'prompt.*phoneme',
    'phoneme.*prompt',
    'phonemes.*array',
    'phonemes.*list',
    '"phonemes"',
    "'phonemes'",
    'phonemes:',
]

# First find Gemini prompt construction
out.write("=== Gemini prompt / Oracle references ===\n")
oracle_patterns = ['oracle', 'generateWord', 'wordGenerat', 'geminiPrompt', 'systemPrompt', 'buildPrompt']
for pat in oracle_patterns:
    matches = []
    for i, line in enumerate(lines):
        if pat.lower() in line.lower():
            matches.append((i+1, line.strip()[:180]))
    if matches:
        out.write(f"\n  Pattern: '{pat}' ({len(matches)} matches)\n")
        for ln, txt in matches[:8]:
            out.write(f"    L{ln}: {txt}\n")
        if len(matches) > 8:
            out.write(f"    ... and {len(matches)-8} more\n")

# Find where phonemes appear in JSON/prompt context
out.write("\n\n=== 'phonemes' in JSON/prompt context ===\n")
for i, line in enumerate(lines):
    lower = line.lower().strip()
    # Look for phonemes in JSON-like context (prompt construction)
    if '"phonemes"' in lower or "'phonemes'" in lower:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")
    elif 'phonemes:' in lower and ('prompt' in lower or 'json' in lower or 'format' in lower or 'schema' in lower or 'response' in lower):
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# Find the pre-activity review panel code
out.write("\n\n=== Pre-activity review / Review Panel ===\n")
review_patterns = ['reviewPanel', 'preActivity', 'pre-activity', 'showReview', 'autoReview', 'ReviewMode', 'review panel']
for pat in review_patterns:
    matches = []
    for i, line in enumerate(lines):
        if pat.lower() in line.lower():
            matches.append((i+1, line.strip()[:180]))
    if matches and len(matches) <= 15:
        out.write(f"\n  Pattern: '{pat}' ({len(matches)} matches)\n")
        for ln, txt in matches:
            out.write(f"    L{ln}: {txt}\n")

# Find where phonemes are displayed in UI
out.write("\n\n=== phoneme display in UI ===\n")
for i, line in enumerate(lines):
    if 'phoneme' in line.lower() and ('.map(' in line or '.forEach(' in line or 'render' in line.lower()):
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

out.close()
print("Done -> _gemini_phoneme_search.txt")
