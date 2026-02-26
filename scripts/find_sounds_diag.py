"""Diagnose Find Sounds 'loading sounds' stuck state.
Trace: isLoadingPhonemes set/clear, queue exhaustion, and isolation activity advancement."""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
OUT = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\find_sounds_diag.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

results = []

# 1. Find 'loading sounds' or 'Loading' in isolation/find-sounds rendering
results.append("=== 'loading' text in isolation/find_sounds rendering ===")
for i, l in enumerate(lines):
    lower = l.lower()
    if ('loading' in lower and ('sound' in lower or 'phoneme' in lower)):
        if i > 5000 and i < 12000:
            results.append("L%d: %s" % (i+1, l.strip()[:180]))

# 2. isLoadingPhonemes set to TRUE
results.append("\n=== isLoadingPhonemes set to TRUE ===")
for i, l in enumerate(lines):
    if 'setIsLoadingPhonemes(true)' in l or 'isLoadingPhonemes(true)' in l:
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

# 3. isLoadingPhonemes set to FALSE
results.append("\n=== isLoadingPhonemes set to FALSE ===")
for i, l in enumerate(lines):
    if 'setIsLoadingPhonemes(false)' in l or 'isLoadingPhonemes(false)' in l:
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

# 4. isLoadingPhonemes gate (where rendering is blocked by loading)
results.append("\n=== isLoadingPhonemes gate/check ===")
for i, l in enumerate(lines):
    if 'isLoadingPhonemes' in l and ('?' in l or 'if' in l or '&&' in l or 'return' in l):
        if i > 7000:
            results.append("L%d: %s" % (i+1, l.strip()[:180]))

# 5. Find sounds / isolation word advancement (after correct answer)
results.append("\n=== isolation/find_sounds advancement ===")
for i, l in enumerate(lines):
    if 'find_sounds' in l or 'find-sounds' in l:
        if i > 7000 and i < 12000:
            results.append("L%d: %s" % (i+1, l.strip()[:180]))

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
print("Written %d lines" % len(results))
