"""
Deep verification:
1. Show handleRestoreView word-sounds branch in full
2. Show ALL activeView gates above L65778
3. Check for useEffects that modify activeView
4. Check if the backup handleRestoreView is structurally different
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
BAK = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.bak.txt"

def read(f):
    with open(f, 'r', encoding='utf-8') as fh:
        return fh.readlines()

cur = read(FILE)
bak = read(BAK)

# 1. Show FULL handleRestoreView word-sounds branch
print("=== CURRENT handleRestoreView (full word-sounds branch) ===")
for i, l in enumerate(cur):
    if 'const handleRestoreView' in l:
        for j in range(i, min(len(cur), i+40)):
            print("  L%d: %s" % (j+1, cur[j].rstrip()[:170]))
        break

print("\n=== BACKUP handleRestoreView (full word-sounds branch) ===")
for i, l in enumerate(bak):
    if 'const handleRestoreView' in l:
        for j in range(i, min(len(bak), i+40)):
            print("  bL%d: %s" % (j+1, bak[j].rstrip()[:170]))
        break
