#!/usr/bin/env python3
"""Apply all four bot tip and debug log fixes to AlloFlowANTI.txt."""
import re
import shutil

FILE = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

# Read the file
with open(FILE, "r", encoding="utf-8", errors="replace") as f:
    lines = f.readlines()

print(f"Loaded {len(lines)} lines")

changes = []

# ===========================================================================
# FIX 1: Dynamic text_generated bot event (L17388, 0-indexed=17387)
# ===========================================================================
target1 = 'text_generated: "Your adapted text is ready! Try clicking a word to see its definition, or explore the tools on the left.",'
replace1 = 'text_generated: "Your adapted text on {topic} is ready! Try clicking a word to see its definition, or explore tools like Glossary or Quiz to deepen understanding.",'
for i, line in enumerate(lines):
    if target1 in line:
        lines[i] = line.replace(target1, replace1)
        changes.append(f"L{i+1}: Fix 1 - Updated text_generated to include {{topic}} template")
        break
else:
    print("WARNING: Fix 1 target not found!")

# ===========================================================================
# FIX 2a: Broaden glossary_bingo tip (L17362, tips.glossary_bingo)
# ===========================================================================
target2a = 'glossary_bingo: "You can turn these terms into a Bingo game for a class activity!",'
replace2a = 'glossary_bingo: "You can turn these terms into word games like Bingo, Memory Match, Crosswords, or Word Search!",'
for i, line in enumerate(lines):
    if target2a in line:
        lines[i] = line.replace(target2a, replace2a)
        changes.append(f"L{i+1}: Fix 2a - Broadened glossary_bingo tip to multiple games")
        break
else:
    print("WARNING: Fix 2a target not found!")

# ===========================================================================
# FIX 2b: Broaden glossary_generated bot event (L17391)
# ===========================================================================
target2b = 'glossary_generated: "Glossary complete! Turn these terms into a Bingo game or Memory match.",'
replace2b = 'glossary_generated: "Glossary complete! Try the word games \u2014 Bingo, Memory Match, Crosswords, Word Search, and more!",'
for i, line in enumerate(lines):
    if target2b in line:
        lines[i] = line.replace(target2b, replace2b)
        changes.append(f"L{i+1}: Fix 2b - Broadened glossary_generated to multiple games")
        break
else:
    print("WARNING: Fix 2b target not found!")

# ===========================================================================
# FIX 3: Double-grade bug in feedback_lesson_generic (L17402)
# ===========================================================================
target3 = 'feedback_lesson_generic: "Crafting a UDL-optimized lesson for {grade} grade.",'
replace3 = 'feedback_lesson_generic: "Crafting a UDL-optimized lesson for {grade}.",'
for i, line in enumerate(lines):
    if target3 in line:
        lines[i] = line.replace(target3, replace3)
        changes.append(f"L{i+1}: Fix 3 - Removed duplicate 'grade' from feedback_lesson_generic")
        break
else:
    print("WARNING: Fix 3 target not found!")

# ===========================================================================
# FIX 4: Comment out 10 resolved TTS/audio debug console.log lines
# ===========================================================================
debug_targets = [
    ('console.log("[TTS] \U0001f513 Queue acquired.', 'Fix 4a - Commented out TTS queue acquired log'),
    ('console.log("[TTS] Fetching:"', 'Fix 4b - Commented out TTS fetching log'),
    ('console.log("[TTS] API response:"', 'Fix 4c - Commented out TTS API response log'),
    ('console.log("[TTS] \u2705 Gemini TTS succeeded!', 'Fix 4d - Commented out TTS success log'),
    ('console.log("[callTTS] \u25b6 ENTRY.', 'Fix 4e - Commented out callTTS entry log'),
    ("console.log('[TTS] Skipped due to global mute')", 'Fix 4f - Commented out TTS skipped log'),
    ('console.log("[callTTS] \u2705 SUCCESS!', 'Fix 4g - Commented out callTTS success log'),
    ('console.log("[handleSpeak] \U0001f50a Using DIRECT callTTS()', 'Fix 4h - Commented out handleSpeak log'),
    ('console.log("[AlloBot] Cloud TTS result:', 'Fix 4i - Commented out AlloBot cloud TTS result log'),
    ('console.log("[AlloBot] \u26a0\ufe0f BROWSER TTS FALLBACK!', 'Fix 4j - Commented out AlloBot browser TTS fallback log'),
]

for target, desc in debug_targets:
    found = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if target in stripped and not stripped.startswith('//'):
            # Find the indentation
            indent = line[:len(line) - len(line.lstrip())]
            # Comment out the line
            lines[i] = indent + '// ' + line.lstrip()
            changes.append(f"L{i+1}: {desc}")
            found = True
            break
    if not found:
        print(f"WARNING: Debug target not found: {target[:60]}...")

# ===========================================================================
# Write the file
# ===========================================================================
# Backup first
shutil.copy2(FILE, FILE + ".bak2")
print("Backup created.")

with open(FILE, "w", encoding="utf-8") as f:
    f.writelines(lines)

print(f"\n=== Applied {len(changes)} changes ===")
for c in changes:
    print(f"  {c}")

print("\nDone!")
