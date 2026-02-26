"""Trace: how does processWordsInBatches get called? Check handleStart and any wrapper"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_process_caller_trace.txt', 'w', encoding='utf-8')

# Find processWordsInBatches definition
out.write("=== processWordsInBatches definition ===\n")
for i, line in enumerate(lines):
    if 'processWordsInBatches' in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# Find handleStart definition and what it calls
out.write("\n=== handleStart function body (L1441 area) ===\n")
# Already know it's at L1441, let's see what it calls
for i in range(1440, min(1600, len(lines))):
    line = lines[i].strip()
    if line and ('await' in line or 'process' in line.lower() or 'batch' in line.lower() or 
                 'callGemini' in line or 'setPreloaded' in line or 'preloaded' in line.lower()):
        out.write(f"  L{i+1}: {line[:180]}\n")

# Find where preloadedWords gets populated
out.write("\n=== setPreloadedWords ===\n")
for i, line in enumerate(lines):
    if 'setPreloadedWords(' in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# Find 'handleWordSoundsStartGame' - this is the callback from generation
out.write("\n=== handleWordSoundsStartGame ===\n")
for i, line in enumerate(lines):
    if 'handleWordSoundsStartGame' in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# Find where wordSoundsTerms is set
out.write("\n=== wordSoundsTerms / setWordSoundsTerms ===\n")
for i, line in enumerate(lines):
    if 'setWordSoundsTerms(' in line or 'wordSoundsTerms' in line:
        if 'console' not in line:
            out.write(f"  L{i+1}: {line.strip()[:180]}\n")

out.close()
print("Done -> _process_caller_trace.txt")
