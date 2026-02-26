"""Write audit results to file to avoid truncation"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
OUT = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\audit_out.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

results = []

results.append("=== setCurrentWordSoundsWord calls ===")
for i, l in enumerate(lines):
    if 'setCurrentWordSoundsWord(' in l and 'useState' not in l:
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

results.append("\n=== currentWordIndex modulo wrapping ===")
for i, l in enumerate(lines):
    if 'currentWordIndex' in l and '%' in l:
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

results.append("\n=== setWsPreloadedWords ===")
for i, l in enumerate(lines):
    if 'setWsPreloadedWords' in l or 'wsPreloadedWords' in l:
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

results.append("\n=== preloadInitialBatch definition + completion ===")
for i, l in enumerate(lines):
    if 'preloadInitialBatch' in l:
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
print("Written %d lines to audit_out.txt" % len(results))
