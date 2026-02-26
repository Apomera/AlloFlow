"""Show the useEffect at BAK L32593 in full, and search for equivalent in current file"""
CURRENT = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
BAK = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.bak.txt"

def read(f):
    with open(f, 'r', encoding='utf-8') as fh:
        return fh.readlines()

bak_lines = read(BAK)
cur_lines = read(CURRENT)

# Show backup L32585-32610
print("=== BACKUP L32585-32610 (useEffect with isWordSoundsMode + activeView) ===")
for i in range(32584, min(len(bak_lines), 32610)):
    print("L%d: %s" % (i+1, bak_lines[i].rstrip()[:170]))

# Now search for the same pattern in current
print("\n=== CURRENT: Search for activeView !== 'word-sounds' near isWordSoundsMode ===")
for i, l in enumerate(cur_lines):
    if "activeView !== 'word-sounds'" in l or "activeView !=='word-sounds'" in l:
        print("L%d: %s" % (i+1, l.strip()[:170]))

# Also check if there's a useEffect with activeView + isWordSoundsMode deps
print("\n=== CURRENT: useEffect close to isWordSoundsMode refs ===")
for i, l in enumerate(cur_lines):
    if 'isWordSoundsMode' in l and 'activeView' in l:
        print("L%d: %s" % (i+1, l.strip()[:170]))

# Show handleRestoreView in backup (first 30 lines)
print("\n=== BACKUP: handleRestoreView ===")
for i, l in enumerate(bak_lines):
    if 'const handleRestoreView' in l:
        for j in range(i, min(len(bak_lines), i+35)):
            print("L%d: %s" % (j+1, bak_lines[j].rstrip()[:170]))
        break

# Show handleRestoreView in current  
print("\n=== CURRENT: handleRestoreView ===")
for i, l in enumerate(cur_lines):
    if 'const handleRestoreView' in l:
        for j in range(i, min(len(cur_lines), i+35)):
            print("L%d: %s" % (j+1, cur_lines[j].rstrip()[:170]))
        break
