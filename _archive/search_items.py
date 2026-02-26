"""Search for critical items using Python since grep is failing"""
import os, re, glob

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_search_results.txt', 'w', encoding='utf-8')

# 1. Search for wordSoundsSessionGoal
out.write("=== wordSoundsSessionGoal ===\n")
count = 0
for i, line in enumerate(lines):
    if 'wordSoundsSessionGoal' in line:
        out.write(f"  L{i+1}: {line.strip()[:150]}\n")
        count += 1
out.write(f"  Total: {count} occurrences\n")

# 2. Search for estimatePhonemesBasic
out.write("\n=== estimatePhonemesBasic ===\n")
count2 = 0
for i, line in enumerate(lines):
    if 'estimatePhonemesBasic' in line:
        out.write(f"  L{i+1}: {line.strip()[:150]}\n")
        count2 += 1
out.write(f"  Total: {count2} occurrences\n")

# 3. Search for any phoneme estimation/decomposition functions
out.write("\n=== Other phoneme decomposition functions ===\n")
patterns = ['estimatePhoneme', 'decomposeWord', 'getPhonemes', 'splitPhoneme', 'wordToPhoneme', 'phonemeDecomp']
for pat in patterns:
    matches = []
    for i, line in enumerate(lines):
        if pat in line:
            matches.append((i+1, line.strip()[:150]))
    if matches:
        out.write(f"\n  Pattern: '{pat}' ({len(matches)} matches)\n")
        for ln, txt in matches[:10]:
            out.write(f"    L{ln}: {txt}\n")

# 4. Find audio_input4 files
out.write("\n=== audio_input4 files ===\n")
cwd = os.getcwd()
for root, dirs, files in os.walk(cwd):
    for f_name in files:
        if 'audio_input4' in f_name.lower():
            full = os.path.join(root, f_name)
            size = os.path.getsize(full)
            out.write(f"  {full} ({size} bytes)\n")

# Also check parent dir
parent = os.path.dirname(cwd)
for f_name in os.listdir(parent):
    if 'audio_input4' in f_name.lower():
        full = os.path.join(parent, f_name)
        out.write(f"  {full}\n")

# Check Desktop
desktop = os.path.expanduser("~/OneDrive/Desktop")
if os.path.exists(desktop):
    for f_name in os.listdir(desktop):
        if 'audio_input4' in f_name.lower():
            full = os.path.join(desktop, f_name)
            out.write(f"  {full}\n")

# Check Downloads
downloads = os.path.expanduser("~/Downloads")
if os.path.exists(downloads):
    for f_name in os.listdir(downloads):
        if 'audio_input4' in f_name.lower():
            full = os.path.join(downloads, f_name)
            out.write(f"  {full}\n")

out.close()
print("Done -> _search_results.txt")
