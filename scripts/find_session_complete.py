"""
Find what triggers showSessionComplete in WordSoundsModal.
It only fires on the FIRST activity click, not subsequent ones.
This suggests a useEffect that checks some condition on mount.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("=== All setShowSessionComplete(true) calls ===")
for i, l in enumerate(lines):
    if 'setShowSessionComplete(true)' in l:
        # Show context (5 lines before)
        print("L%d: %s" % (i+1, l.strip()[:180]))
        for j in range(max(0, i-5), i):
            print("  ctx L%d: %s" % (j+1, lines[j].strip()[:180]))
        print()

print("\n=== showSessionComplete conditionals (rendering) ===")
for i, l in enumerate(lines):
    if 'showSessionComplete' in l and ('&&' in l or '?' in l or 'if' in l):
        print("L%d: %s" % (i+1, l.strip()[:180]))

print("\n=== wordSoundsSessionProgress or sessionGoal refs ===")
for i, l in enumerate(lines):
    if ('wordSoundsSessionProgress' in l or 'sessionGoal' in l or 'wordSoundsSessionGoal' in l) and ('setShow' in l or '>=' in l or 'complete' in l.lower()):
        print("L%d: %s" % (i+1, l.strip()[:180]))
