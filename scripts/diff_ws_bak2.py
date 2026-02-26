"""Show ONLY the critical backup useEffect with isWordSoundsMode + activeView"""
BAK = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.bak.txt"
CURRENT = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(BAK, 'r', encoding='utf-8') as f:
    bak_lines = f.readlines()

with open(CURRENT, 'r', encoding='utf-8') as f:
    cur_lines = f.readlines()

# Part 1: Show the backup useEffect with deps [activeView, isWordSoundsMode]
print("=== BACKUP: useEffect near L32590-32600 ===")
for i in range(32585, 32605):
    print("bL%d: %s" % (i+1, bak_lines[i].rstrip()[:200]))

# Part 2: Does the CURRENT file have ANY useEffect with both activeView and isWordSoundsMode?
print("\n=== CURRENT: lines with BOTH activeView and isWordSoundsMode ===")
for i, l in enumerate(cur_lines):
    if 'activeView' in l and 'isWordSoundsMode' in l:
        print("cL%d: %s" % (i+1, l.strip()[:200]))
